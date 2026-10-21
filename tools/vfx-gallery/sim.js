// Headless fights (the same RaidHost the host tab runs, as tools/bot-raid.js uses it) for the VFX gallery:
//   captureBoss(id)        every distinct visual moment a boss fight broadcasts (telegraphs, casts, adds, room events...),
//                          each with what followed it (its impact, its hit) and a snapshot of where everyone stood;
//   captureClassFx(id)     the class moments (kfx) a class's kit really sends, with their real data, from short fights
//                          with the class's talents taken a row-option at a time (bots normally hold none).
// Results only depend on the game files and the seeds, so they are deterministic.
'use strict';
const path = require('path');

let G = null;
function loadGame(root) {
  if (G) return G;
  const load = p => require(path.join(root, 'client/js', p));
  Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
    load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
  try { Object.assign(global, load('combat/talents.js')); } catch (e) { /* talents are optional for the sim */ }
  Object.assign(global, load('arena/raid-host.js'));
  const defs = {};
  const fs = require('fs');
  for (const f of fs.readdirSync(path.join(root, 'client/js/arena/bosses'))) {
    const m = load('arena/bosses/' + f);
    for (const v of Object.values(m)) if (v && v.id && v.script) defs[v.id] = v;
  }
  G = { defs };
  return G;
}

// what kind of visual moment a message is ('' = nothing to draw on its own)
function keyOf(m) {
  switch (m.t) {
    case 'tg': return 'tg:' + (m.tag ? m.tag + '/' + m.type : m.type);
    case 'bcast': return 'cast:' + (m.anim || m.name);
    case 'banim': return 'banim:' + m.name;
    case 'addev': return m.k === 'bite' || m.k === 'gone' ? '' : 'add:' + m.k + (m.kind ? '/' + m.kind : '');
    case 'fev': return m.k === 'death' || m.k === 'raised' || m.k === 'pause' ? 'fev:' + m.k : '';
    case 'propfx': return 'propfx:' + m.k + (m.kind ? '/' + m.kind : '');
    case 'roomev': return 'roomev:' + m.k;
    case 'roll': return m.clear ? '' : 'roll:' + (m.tag || 'meatball');
    case 'pol': return m.flip ? 'pol:flip' : '';
    case 'zone': return m.clear ? '' : 'zone:' + (m.tag || (m.shape && m.shape.kind));
    case 'pud': return m.clear ? '' : 'pud:' + (m.tag || 'puddle');
    case 'teth': return 'teth:' + (m.tag || m.kind);
    case 'post': case 'sweep': return m.clear ? '' : m.t;
    case 'husk': case 'eggs': case 'chain': case 'reel': case 'edgewarn': case 'edge': case 'pulse': case 'bcastend':
    case 'doomed': case 'cure': case 'gazed': case 'knights': case 'kmem': case 'kswing': case 'night': case 'lunge':
      return m.t;
    default: return '';
  }
}
// rollers get a row per difficulty (Hard sends more of them, faster); everything else is kept once, from the first fight
const modeKey = (m, mode) => { const k = keyOf(m); return k && k.startsWith('roll:') && mode === 'hard' ? k + ' (hard)' : k; };
// a later message that belongs to an earlier moment (its impact, its hit): the id it answers
function answers(m) {
  if (m.t === 'tgx') return 'tg#' + m.id;
  if (m.t === 'rollhit') return 'roll#' + m.id;
  if (m.t === 'reelx') return 'reel#' + m.id;
  if (m.t === 'tethx' && !m.clear) return 'teth#' + m.id;
  if ((m.t === 'kmem' || m.t === 'kswing') && m.id != null) return null;
  return null;
}
const idKey = m => (m.t === 'tg' ? 'tg#' + m.id : m.t === 'roll' ? 'roll#' + m.id : m.t === 'reel' ? 'reel#' + m.id : m.t === 'teth' ? 'teth#' + m.id : null);

function captureBoss(root, bossId, o = {}) {
  const { defs } = loadGame(root);
  const def = defs[bossId];
  if (!def) throw new Error('unknown boss ' + bossId + ' (have: ' + Object.keys(defs).join(', ') + ')');
  const events = [], seen = new Map(), open = new Map();
  for (const mode of ['normal', 'hard']) {
    const comp = o.comp || ['bastion', 'cleric', 'ranger', 'pyromancer'];
    const host = new RaidHost({ def, mode, humans: () => [], bots: comp, seed: o.seed || 1000, emit: () => {} });
    let tickMsgs = [], props = null, floor = null, adds = null, pol = null, knights = null, lant = null;
    const snap = () => ({
      mode, t: +host.sim.t.toFixed(2),
      units: host.bots.map(b => [b.id, b.cls.id, b.spec || null, Math.round(b.x), Math.round(b.y), +(b.a || 0).toFixed(2)]),
      boss: { x: Math.round(host.sim.boss.x), y: Math.round(host.sim.boss.y), f: +host.sim.boss.facing.toFixed(2), tg: host.sim.boss.target },
      props: props ? Object.assign({}, props, floor ? { f: floor.f, fv: floor.fv } : {}) : null,
      adds, pol, knights, lant, arena: { r: ARENA.r },
    });
    const out = host.emitOut;
    host.emitOut = m => {
      out(m);
      const t = host.sim.t;
      if (m.t === 'props') { props = m; if (m.f) floor = m; }
      if (m.t === 'adds') adds = m;
      if (m.t === 'pol') pol = m;
      if (m.t === 'knights') knights = m;
      if (m.t === 'lant') lant = m;
      tickMsgs.push(m);
      const ans = answers(m);
      if (ans && open.has(ans)) { const ev = open.get(ans); ev.items.push([+(t - ev.t0).toFixed(3), m]); open.delete(ans); return; }
      // a cast's rollers come one after another (each with its lane preview sent at the cast start): they all go in the
      // first one's row, so the row shows the previews handing over to the real balls
      if (m.t === 'roll' && !m.clear) {
        const ev = events.find(e => e.mode === mode && e.key === modeKey(m, mode) && t - e.t0 < 8);
        if (ev && ev.items.length < 16) { ev.items.push([+(t - ev.t0).toFixed(3), m]); const id = idKey(m); if (id) open.set(id, ev); return; }
      }
      const k = modeKey(m, mode);
      if (!k || seen.has(k)) return;
      // a cast that comes with a telegraph is drawn with it (the tg row), not on its own
      const ev = { key: k, t0: t, mode, items: [[0, m]], ctx: snap() };
      if (m.t === 'tg') {
        const c = tickMsgs.find(x => x.t === 'bcast');
        if (c) { ev.items.unshift([0, c]); ev.cast = c.anim || c.name; const ce = events.find(e => e.key === keyOf(c)); if (ce) ce.folded = k; }
      }
      seen.set(k, ev); events.push(ev);
      const id = idKey(m); if (id) open.set(id, ev);
    };
    while (host.sim.state === 'countdown' || host.sim.state === 'live') {
      tickMsgs = [];
      host.tick(0.05);
      if (host.sim.t > (o.maxT || 900)) break;
    }
    open.clear();
  }
  // a cast row whose cast always came with a telegraph we already draw is dropped
  return events.filter(e => !(e.key.startsWith('cast:') && e.folded));
}

// the kfx moments a class's kit sends in a short fight, once per talent row-option (and spec), with their data
function captureClassFx(root, classId, o = {}) {
  loadGame(root);
  const rows = (typeof TALENTS !== 'undefined' && TALENTS[classId]) || [];
  const specs = [null, ...((typeof SPECS !== 'undefined' && SPECS[classId]) || []).map(s => s.id)];
  const found = new Map();   // name -> [data...]
  const bossId = o.boss || 'grubnak';
  const def = G.defs[bossId];
  const proto = RaidHost.prototype, orig = proto.botWorld;
  const runs = [];
  for (let j = 0; j < Math.max(1, ...rows.map(r => r.length)); j++) runs.push({ spec: specs[j % specs.length], talents: new Set(rows.map(r => r[j] && r[j].id).filter(Boolean)) });
  for (const run of runs) {
    proto.botWorld = function (bot) { const w = orig.call(this, bot); if (bot.cls.id === classId) w.talents = () => run.talents; return w; };
    try {
      const role = (CLASSES.find(c => c.id === classId) || {}).role;
      const comp = [classId + ':' + (run.spec || 'base'), role === 'tank' ? 'cleric' : 'bastion', role === 'healer' ? 'ranger' : 'cleric', 'pyromancer'];
      const host = new RaidHost({ def, mode: 'normal', humans: () => [], bots: comp, seed: 2000 + runs.indexOf(run), emit: () => {} });
      const me = host.bots[0].id;
      const out = host.emitOut;
      host.emitOut = m => {
        out(m);
        if (m.t !== 'kfx' || m.id !== me) return;
        const l = found.get(m.k) || [];
        const d = m.d === undefined ? null : m.d, key = JSON.stringify(d);
        if (l.length < 3 && !l.some(x => JSON.stringify(x) === key)) l.push(d);
        found.set(m.k, l);
      };
      while ((host.sim.state === 'countdown' || host.sim.state === 'live') && host.sim.t < (o.secs || 100)) host.tick(0.05);
    } catch (e) { /* a sim that throws only loses its samples */ } finally { proto.botWorld = orig; }
  }
  return found;
}

module.exports = { captureBoss, captureClassFx, loadGame };

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const what = process.argv[2] || 'grubnak';
  const t0 = Date.now();
  if (loadGame(root).defs[what]) {
    const ev = captureBoss(root, what);
    console.log(ev.length + ' moments in ' + (Date.now() - t0) + 'ms');
    for (const e of ev) console.log(e.mode.padEnd(7), String(e.t0.toFixed(1)).padStart(6), e.key.padEnd(28), e.items.map(([dt, m]) => m.t + '@' + dt).join(' '));
  } else {
    const f = captureClassFx(root, what);
    console.log((Date.now() - t0) + 'ms');
    for (const [k, v] of f) console.log(k.padEnd(18), JSON.stringify(v));
  }
}
