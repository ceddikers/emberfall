#!/usr/bin/env node
// VFX gallery: contact sheets of every visual effect in the game, rendered by the real game scripts in headless Chrome.
//
//   node tools/vfx-gallery/render.js <what> [--zoom 0.63|1.0|0.63,1.0] [--out dir] [--check] [--only text] [--rows n]
//     <what>: a class id (pyromancer), all-classes, a boss id (grubnak, skitterra, volkar, hollowking), all-bosses,
//             shared (the moments every class shares), or all
//   --check   exit 1 if any effect throws, draws with a NaN, or leaves particles/effects alive > 3 s past its
//             declared duration (no PNGs unless --png is also given)
//   --only    only effects whose name contains this text (comma-separated list allowed)
//   --rows    rows per PNG page (default 12 for classes, 6 for bosses)
//   --frame   world size of a class frame, WxH (default 640x440)
//   --floor   the room a class is drawn in (a boss id; default grubnak)
//   --chrome  path to Chrome / Edge (or set CHROME_PATH)
// Output: <out>/<what>[-z063]-p1.png ... and <out>/<what>[-z063].json; a summary line per sheet on stdout.
// See README.md in this folder.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { discover } = require('./discover');

const ROOT = path.join(__dirname, '..', '..');
const CLIENT = path.join(ROOT, 'client');
const PAGE = path.join(__dirname, 'page');

// ------------------------------------------------------------------ arguments
function parseArgs(argv) {
  const o = { what: null, zooms: [0.63], out: path.join(__dirname, 'out'), check: false, png: null, only: null, rows: null, frame: [640, 440], floor: 'grubnak', chrome: process.env.CHROME_PATH || null, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--zoom') o.zooms = next().split(',').map(Number).filter(z => z > 0);
    else if (a === '--out') o.out = path.resolve(next());
    else if (a === '--check') o.check = true;
    else if (a === '--png') o.png = true;
    else if (a === '--only') o.only = next().split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    else if (a === '--rows') o.rows = Math.max(1, +next() | 0);
    else if (a === '--frame') { const [w, h] = next().split(/[x,]/).map(Number); o.frame = [w || 640, h || 440]; }
    else if (a === '--floor') o.floor = next();
    else if (a === '--chrome') o.chrome = next();
    else if (a === '--verbose' || a === '-v') o.verbose = true;
    else if (a === '--help' || a === '-h') { o.help = true; }
    else if (!a.startsWith('--') && !o.what) o.what = a;
    else { console.error('unknown argument: ' + a); process.exit(2); }
  }
  if (o.png == null) o.png = !o.check;
  return o;
}

// ------------------------------------------------------------------ Chrome
function findChrome(given) {
  const c = [];
  if (given) c.push(given);
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
      c.push(path.join(base, 'Google/Chrome/Application/chrome.exe'), path.join(base, 'Chromium/Application/chrome.exe'), path.join(base, 'Microsoft/Edge/Application/msedge.exe'));
    }
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    for (const d of (process.env.PATH || '').split(':')) for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) c.push(path.join(d, n));
  }
  return c.find(p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }) || null;
}

function launchChrome(exe) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vfx-gallery-'));
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-extensions',
    '--remote-debugging-port=0', '--user-data-dir=' + prof, 'about:blank'];
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  return new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome did not start (no DevTools line in 20s): ' + buf.slice(-400))), 20000);
    proc.stderr.on('data', d => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buf);
      if (m) { clearTimeout(t); resolve({ proc, ws: m[1], prof }); }
    });
    proc.on('exit', code => { clearTimeout(t); reject(new Error('Chrome exited (' + code + '): ' + buf.slice(-400))); });
  });
}

// a minimal DevTools Protocol client over Node's built-in WebSocket (Node 22+)
async function cdpConnect(url) {
  if (typeof WebSocket === 'undefined') throw new Error('needs Node 22+ (built-in WebSocket)');
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = e => rej(new Error('WebSocket: ' + (e.message || 'error'))); });
  let id = 0; const pend = new Map(), listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message + (m.error.data ? ': ' + m.error.data : ''))) : p.res(m.result); }
    else for (const l of listeners) l(m);
  };
  return {
    send: (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify(Object.assign({ id: i, method, params }, sessionId ? { sessionId } : {}))); }),
    on: fn => listeners.push(fn),
    close: () => ws.close(),
  };
}

// ------------------------------------------------------------------ the static server: the client folder + the gallery page
function gameScripts() {
  // the game's own script order (client/index.html), minus the UI / network layer the gallery replaces
  const html = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');
  const SKIP = /(^|\/)(main|net|title|tutorial|raid-ui|debug-overlay|journal|town-life|town-secrets|pastimes|keybinds|pings|inventory|talent-panel|loot|hero-guide|save)\.js$/;
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1].split('?')[0]).filter(s => !/^https?:/.test(s) && !SKIP.test(s));
}
function startServer() {
  const scripts = gameScripts();
  const page = `<!doctype html><html><head><meta charset="utf-8"><title>vfx gallery</title></head><body style="margin:0;background:#111">
<script src="/__gallery/instrument.js"></script>
${scripts.map(s => `<script src="/${s}"></script>`).join('\n')}
<script src="/__gallery/harness.js"></script>
</body></html>`;
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/' || u === '/__gallery/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page); return; }
    const file = u.startsWith('/__gallery/') ? path.join(PAGE, u.slice(11)) : path.join(CLIENT, u);
    if (!file.startsWith(PAGE) && !file.startsWith(CLIENT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      // VFX keeps its particle and effect lists private; one statement on an existing line hands the gallery a read-only
      // look at them (same line, so every file:line in a report still matches the real file)
      if (u === '/js/vfx.js') data = Buffer.from(String(data).replace(/^(\s*)function setScale\(s\)/m, '$1globalThis.__vfxInternals = { parts, effects }; function setScale(s)'));
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port, scripts })));
}

// ------------------------------------------------------------------ the work list
function targets(what, classIds, bossIds) {
  if (what === 'all-classes') return [...classIds.map(c => ({ kind: 'class', id: c })), { kind: 'shared', id: 'shared' }];
  if (what === 'all-bosses') return bossIds.map(b => ({ kind: 'boss', id: b }));
  if (what === 'all') return [...targets('all-classes', classIds, bossIds), ...targets('all-bosses', classIds, bossIds)];
  if (what === 'shared') return [{ kind: 'shared', id: 'shared' }];
  if (what === 'selftest') return [{ kind: 'shared', id: 'selftest' }];
  if (classIds.includes(what)) return [{ kind: 'class', id: what }];
  if (bossIds.includes(what)) return [{ kind: 'boss', id: what }];
  return null;
}

// the class moments to draw: what the code says the kit emits (discover.js), with the data a real fight sent (sim.js)
// where one did, else data read from the call site
function classMoments(sim, classId, disc) {
  let real = new Map();
  try { real = sim.captureClassFx(ROOT, classId); } catch (e) { /* static data only */ }
  const out = [];
  const add = (name, data, src) => { if (!out.some(m => m.name === name && JSON.stringify(m.data) === JSON.stringify(data))) out.push({ name, data, src }); };
  for (const m of disc.perClass[classId] || []) {
    const r = real.get(m.name);
    if (r && r.length) for (const d of r) add(m.name, d, 'fight');
    else for (const d of m.data) add(m.name, d, 'code');
  }
  // moments a fight sent that the static scan didn't place on this class (and that aren't on the shared sheet)
  const shared = new Set(disc.shared.map(m => m.name));
  for (const [name, l] of real) if (!shared.has(name) && !out.some(m => m.name === name)) for (const d of l) add(name, d, 'fight-only');
  return out;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || !o.what) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 16).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(o.help ? 0 : 2); }
  const { CLASSES } = require(path.join(CLIENT, 'js/data.js'));
  const sim = require('./sim');
  const classIds = CLASSES.map(c => c.id);
  const bossIds = Object.keys(sim.loadGame(ROOT).defs);
  const list = targets(o.what, classIds, bossIds);
  if (!list) { console.error(`unknown target '${o.what}'. Classes: ${classIds.join(', ')}; bosses: ${bossIds.join(', ')}; or all-classes, all-bosses, shared, all`); process.exit(2); }
  const exe = findChrome(o.chrome);
  if (!exe) { console.error('No Chrome/Chromium/Edge found. Pass --chrome <path> or set CHROME_PATH.'); process.exit(2); }
  fs.mkdirSync(o.out, { recursive: true });

  const t0 = Date.now();
  const disc = discover(ROOT, classIds);
  const { srv, port } = await startServer();
  const chrome = await launchChrome(exe);
  // never leave a headless Chrome behind (Ctrl+C, a crash)
  const kill = () => { try { chrome.proc.kill(); } catch (e) { /* gone */ } };
  process.on('exit', kill);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { kill(); process.exit(130); });
  let cdp, failed = 0;
  const report = [];
  try {
    const browser = await cdpConnect(chrome.ws);
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
    cdp = { send: (m, p) => browser.send(m, p, sessionId) };
    if (o.verbose) browser.on(m => { if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'log') { const t = m.params.args.map(a => a.value).join(' '); if (t.startsWith('[gallery]')) console.log('  ' + t.slice(10)); } });
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/__gallery/` });
    const evalJs = async (expr) => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 600000 });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
      return r.result.value;
    };
    for (let i = 0; i < 200; i++) { if (await evalJs('!!(window.Gallery && window.Gallery.ready)').catch(() => false)) break; await new Promise(r => setTimeout(r, 100)); }
    const load = await evalJs('Gallery.loadReport()');
    if (load.errors.length && o.verbose) console.log('page load errors:', load.errors);

    for (const tg of list) {
      for (const zoom of o.zooms) {
        const ts = Date.now();
        const job = { kind: tg.kind, id: tg.id, zoom, only: o.only, rows: o.rows, frame: o.frame, floor: o.floor, png: o.png, check: o.check, verbose: o.verbose };
        if (tg.kind === 'class') job.moments = classMoments(sim, tg.id, disc);
        if (tg.id === 'selftest') { job.selftest = true; job.moments = ['__throws', '__nan', '__leak', '__dropped', '__missing'].map(name => ({ name, data: null, src: 'selftest' })); }
        else if (tg.kind === 'shared') job.moments = disc.shared.map(m => ({ name: m.name, data: m.data[0] || null, src: 'code', classes: m.classes }));
        if (tg.kind === 'boss') job.events = sim.captureBoss(ROOT, tg.id);
        // moments main.js itself reacts to by name (ult-ready...): not a missing KIT_VFX entry when KIT_VFX has none
        if (job.moments) { const mainSrc = fs.readFileSync(path.join(CLIENT, 'js/main.js'), 'utf8'); job.mainHandled = job.moments.map(m => m.name).filter(n => mainSrc.includes("'" + n + "'")); }
        const res = await evalJs(`Gallery.run(${JSON.stringify(job)})`);
        const tag = tg.id + (o.zooms.length > 1 || zoom !== 0.63 ? '-z' + String(zoom).replace('.', '') : '');
        const files = [];
        if (o.png) for (let i = 0; i < res.pages; i++) { const b64 = await evalJs('Gallery.page(' + i + ')'); const f = path.join(o.out, `${tag}-p${i + 1}.png`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(path.relative(ROOT, f)); }
        // drop stale pages from an earlier, longer run of the same sheet
        if (o.png) for (let i = res.pages + 1; fs.existsSync(path.join(o.out, `${tag}-p${i}.png`)); i++) fs.unlinkSync(path.join(o.out, `${tag}-p${i}.png`));
        const summary = Object.assign({ target: tg.id, kind: tg.kind, zoom, ms: Date.now() - ts, files, pageLoadErrors: load.errors }, res.summary);
        fs.writeFileSync(path.join(o.out, `${tag}.json`), JSON.stringify(summary, null, 1));
        const bad = summary.effects.filter(e => e.fail);
        failed += bad.length;
        report.push(summary);
        console.log(`${tag.padEnd(18)} ${String(summary.effects.length).padStart(3)} effects  ${String(bad.length).padStart(2)} failing  peak ${summary.maxParticles} particles  ${(summary.ms / 1000).toFixed(1)}s` + (files.length ? '  ' + files.join(' ') : ''));
        for (const e of bad) console.log(`   FAIL ${e.name}: ${e.fail}`);
        if (o.verbose) for (const e of summary.effects.filter(x => x.warn && !x.fail)) console.log(`   warn ${e.name}: ${e.warn}`);
      }
    }
  } finally {
    try { chrome.proc.kill(); } catch (e) { /* gone */ }
    srv.close();
    setTimeout(() => { try { fs.rmSync(chrome.prof, { recursive: true, force: true }); } catch (e) { /* in use */ } }, 500);
  }
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s` + (o.check ? (failed ? `: ${failed} failing effect(s)` : ': all effects pass') : ''));
  if (o.check && failed) process.exitCode = 1;
}

main().catch(e => { console.error(e.stack || e); process.exit(2); });
