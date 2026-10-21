#!/usr/bin/env node
// Renders every synthesized sound (client/js/sfx-synth.js) in headless Chrome with an OfflineAudioContext, measures
// it and writes .wav files to audition. No npm packages: Node 22+ and a local Chrome / Edge.
//
//   node tools/audio/render.js [--only text[,text]] [--variants 3] [--no-wav] [--all-wavs] [--write-trim] [--out dir]
//   --only        recipes whose name contains one of these
//   --variants    renders per one-shot (p.variant spread over 0-1, different seeds); default 3
//   --no-wav      measure only; --all-wavs writes every variant (name-1.wav ...), default writes the first
//   --write-trim  rewrite the TRIM table in sfx-synth.js so each recipe lands on its category's loudness target
//   --chrome      path to Chrome / Edge (or CHROME_PATH)
// Output: <out>/<name>.wav, <out>/report.json, and a table on stdout. Exit 1 if anything errors, clips, is silent or NaN.
// See README.md in this folder.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SYNTH = path.join(ROOT, 'client', 'js', 'sfx-synth.js');

// loudness targets (LUFS: momentary max for one-shots, integrated for loops) and peak ceilings (dBFS) per category
const TARGET = { ui: -22, town: -22, step: -28, hud: -20, ab: -18, ult: -16, imp: -14, tg: -14, bm: -15, sting: -16, amb: -34, loop: -30, alert: -20 };
const CEIL = { imp: -3, tg: -3, bm: -3, sting: -3, ult: -4, alert: -4 };   // others -6
const ceilOf = c => (CEIL[c] != null ? CEIL[c] : -6);

function parseArgs(argv) {
  const o = { only: null, variants: 3, wav: true, allWavs: false, writeTrim: false, out: path.join(__dirname, 'out'), chrome: process.env.CHROME_PATH || null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--only') o.only = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--variants') o.variants = Math.max(1, +next() | 0);
    else if (a === '--no-wav') o.wav = false;
    else if (a === '--all-wavs') o.allWavs = true;
    else if (a === '--write-trim') o.writeTrim = true;
    else if (a === '--out') o.out = path.resolve(next());
    else if (a === '--chrome') o.chrome = next();
    else if (a === '--help' || a === '-h') { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 13).join('\n')); process.exit(0); }
    else { console.error('unknown argument: ' + a); process.exit(2); }
  }
  return o;
}

function findChrome(given) {
  const c = [];
  if (given) c.push(given);
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean))
      c.push(path.join(base, 'Google/Chrome/Application/chrome.exe'), path.join(base, 'Chromium/Application/chrome.exe'), path.join(base, 'Microsoft/Edge/Application/msedge.exe'));
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    for (const d of (process.env.PATH || '').split(':')) for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) c.push(path.join(d, n));
  }
  return c.find(p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }) || null;
}
function launchChrome(exe) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-render-'));
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + prof, 'about:blank'];
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  return new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome did not start: ' + buf.slice(-400))), 20000);
    proc.stderr.on('data', d => { buf += d; const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buf); if (m) { clearTimeout(t); resolve({ proc, ws: m[1], prof }); } });
    proc.on('exit', code => { clearTimeout(t); reject(new Error('Chrome exited (' + code + '): ' + buf.slice(-400))); });
  });
}
async function cdpConnect(url) {
  if (typeof WebSocket === 'undefined') throw new Error('needs Node 22+ (built-in WebSocket)');
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = e => rej(new Error('WebSocket: ' + (e.message || 'error'))); });
  let id = 0; const pend = new Map();
  ws.onmessage = ev => { const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString()); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  return {
    send: (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify(Object.assign({ id: i, method, params }, sessionId ? { sessionId } : {}))); }),
    close: () => ws.close(),
  };
}

function writeTrim(trims) {
  const src = fs.readFileSync(SYNTH, 'utf8');
  const keys = Object.keys(trims).filter(k => Math.abs(trims[k]) >= 0.25).sort();
  const lines = [];
  for (let i = 0; i < keys.length; i += 4) lines.push('    ' + keys.slice(i, i + 4).map(k => `'${k}': ${trims[k]}`).join(', ') + ',');
  const block = `// @@TRIM-BEGIN\n  const TRIM = {\n${lines.join('\n')}\n  };\n  // @@TRIM-END`;
  const out = src.replace(/\/\/ @@TRIM-BEGIN[\s\S]*?\/\/ @@TRIM-END/, block);
  if (out === src && !src.includes('@@TRIM-BEGIN')) throw new Error('TRIM markers not found in sfx-synth.js');
  fs.writeFileSync(SYNTH, out);
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  const exe = findChrome(o.chrome);
  if (!exe) { console.error('Chrome / Edge not found; pass --chrome <path>'); process.exit(2); }
  const started = Date.now();
  const chrome = await launchChrome(exe);
  let browser;
  const fail = [];
  try {
    browser = await cdpConnect(chrome.ws);
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
    const ev = async (expression) => {
      const r = await browser.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 600000 }, sessionId);
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
      return r.result.value;
    };
    await ev(`globalThis.Sound = { recipes: {}, loops: {}, define(n, f) { this.recipes[n] = f; }, defineLoop(n, f) { this.loops[n] = f; } }; true`);
    await ev(fs.readFileSync(SYNTH, 'utf8') + '\n;true');
    await ev('SfxSynth.strict = true; true');
    await ev(fs.readFileSync(path.join(__dirname, 'harness.js'), 'utf8') + '\n;true');
    const info = await ev('__audio.list()');
    let names = [...info.shots, ...info.loops];
    if (o.only) names = names.filter(n => o.only.some(s => n.includes(s)));
    if (o.wav) fs.mkdirSync(o.out, { recursive: true });

    const rows = [], trims = Object.assign({}, info.trim);
    for (const name of names) {
      const r = await ev(`__audio.run(${JSON.stringify(name)}, ${o.variants}, ${o.wav ? (o.allWavs ? '"all"' : 'true') : 'false'})`);
      const cat = info.cat[name] || 'ab', ok = r.res.filter(x => !x.error), errs = r.res.filter(x => x.error);
      for (const e of errs) fail.push(`${name} (variant ${e.variant}): ${e.error.split('\n')[0]}`);
      if (o.wav) ok.forEach((x, i) => { if (x.wav) fs.writeFileSync(path.join(o.out, name + (o.allWavs && ok.length > 1 ? '-' + (i + 1) : '') + '.wav'), Buffer.from(x.wav, 'base64')); delete x.wav; });
      if (!ok.length) { rows.push({ name, cat, error: true }); continue; }
      const avg = k => ok.reduce((a, x) => a + x[k], 0) / ok.length, max = k => Math.max(...ok.map(x => x[k]));
      // momentary loudness integrates over 400 ms, so it under-reads a sound shorter than that; correct by the energy
      // it would have over its own length (a 100 ms click reads 6 LU low otherwise)
      const shortFix = x => { const d = Math.max(0.05, (x.lastSound || 0) - (x.lead || 0)); return d < 0.4 ? 10 * Math.log10(0.4 / d) : 0; };
      const loud = r.isLoop ? avg('lufsI') : ok.reduce((a, x) => a + x.lufsM + shortFix(x), 0) / ok.length, peak = max('peak'), target = TARGET[cat] != null ? TARGET[cat] : -18;
      const row = {
        name, cat, loop: r.isLoop, dur: max('declared'), peak: +peak.toFixed(1), rms: +avg('rms').toFixed(1), lufs: +loud.toFixed(1), lufsI: +avg('lufsI').toFixed(1), target,
        clip: peak > -0.5, nan: ok.reduce((a, x) => a + x.nan, 0), dc: +Math.max(...ok.map(x => Math.abs(x.dc))).toFixed(4), silence: +avg('silence').toFixed(2),
        lead: max('lead'), overrun: ok.some(x => x.overrun), centroid: Math.round(avg('centroid')), low: +avg('low').toFixed(2), mid: +avg('mid').toFixed(2), high: +avg('high').toFixed(2),
        stopsClean: r.isLoop ? ok.every(x => x.stopsClean) : undefined, ms: Math.round(avg('ms')), trim: info.trim[name] || 0,
      };
      // what trim would land it on target without crossing its peak ceiling
      const want = target - loud, room = ceilOf(cat) - peak, adj = Math.min(want, room);
      row.peakLimited = room < want - 0.5;
      row.suggest = Math.round(Math.max(-30, Math.min(24, row.trim + adj)) * 2) / 2;
      const flags = [];
      if (row.clip) flags.push('CLIP'); if (row.nan) flags.push('NAN'); if (peak < -50) flags.push('SILENT');
      if (row.dc > 0.01) flags.push('DC'); if (row.overrun) flags.push('OVERRUN'); if (r.isLoop && !row.stopsClean) flags.push('NOSTOP');
      if (Math.abs(loud - target) > 3) flags.push(row.peakLimited && loud < target ? 'quiet(peak-limited)' : loud < target ? 'QUIET' : 'LOUD');
      row.flags = flags;
      if (flags.some(f => /^[A-Z]+$/.test(f))) fail.push(`${name}: ${flags.join(' ')}`);
      trims[name] = row.suggest;
      rows.push(row);
      process.stdout.write('.');
    }
    process.stdout.write('\n');

    // the table
    const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
    console.log(pad('recipe', 32) + pad('cat', 6) + lpad('dur', 6) + lpad('peak', 7) + lpad('LUFS', 7) + lpad('tgt', 5) + lpad('cent', 6) + '  lo/mid/hi       trim  flags');
    for (const r of rows) {
      if (r.error) { console.log(pad(r.name, 32) + 'ERROR'); continue; }
      console.log(pad(r.name, 32) + pad(r.cat, 6) + lpad(r.dur.toFixed(2), 6) + lpad(r.peak, 7) + lpad(r.lufs, 7) + lpad(r.target, 5) + lpad(r.centroid, 6) + '  ' + pad(`${r.low}/${r.mid}/${r.high}`, 15) + lpad(r.trim, 5) + '  ' + r.flags.join(' '));
    }
    const byCat = {};
    for (const r of rows.filter(r => !r.error)) (byCat[r.cat] = byCat[r.cat] || []).push(r.lufs);
    console.log('\nloudness by category (mean LUFS / target):');
    for (const [c, v] of Object.entries(byCat)) console.log(`  ${pad(c, 6)} ${lpad((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1), 6)} / ${TARGET[c]}   n=${v.length}  range ${Math.min(...v).toFixed(1)}..${Math.max(...v).toFixed(1)}`);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\n${rows.length} recipes, ${o.variants} variants each (loops once, 5.6 s), rendered in ${secs} s`);
    fs.mkdirSync(o.out, { recursive: true });
    fs.writeFileSync(path.join(o.out, 'report.json'), JSON.stringify({ when: new Date().toISOString(), seconds: +secs, targets: TARGET, rows }, null, 1));
    if (o.writeTrim) { if (o.only) console.log('(--write-trim with --only: only those recipes change)'); writeTrim(trims); console.log('TRIM table rewritten in client/js/sfx-synth.js'); }
  } finally {
    try { browser && browser.close(); } catch (e) { /* closing */ }
    chrome.proc.kill();
    setTimeout(() => { try { fs.rmSync(chrome.prof, { recursive: true, force: true }); } catch (e) { /* locked */ } }, 500);
  }
  if (fail.length) { console.log('\nPROBLEMS:'); for (const f of fail) console.log('  ' + f); process.exitCode = 1; }
  else console.log('clean: nothing clips, nothing silent, no NaN, levels within 3 LU of target (or peak-limited)');
})().catch(e => { console.error(e.stack || e); process.exit(1); });
