// A joined player's dropped link (net.js hold / rejoin) and the host's snapshot of the fight (raid-host.js snapshot, standIn).
//   1. net.js on an in-memory Peer: a drop mid-raid holds the slot, a tab rejoins on its own and is the same player; the
//      hold runs out; a slot nobody holds says "gone" at once; a link the host never noticed dying is taken over.
//   3. the loot chest: sent again to a rejoiner who never confirmed it, never paid twice.
//   2. a headless raid: a stand-in bot plays a human's hero under their own id, the snapshot lists what stands (telegraphs
//      with how long ago they began, puddles, adds, party, room...) without disturbing what the sim sends everyone else,
//      for every boss, and the stand-in steps out where it left the hero.
//   node tools/rejoin-test.js            (exit code 0 and a final "Rejoin OK" when everything holds)
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// wait until cond() holds, up to ms (a busy machine can be slow to deliver the stub's ticks)
const until = async (cond, ms = 3000) => { const end = Date.now() + ms; while (!cond() && Date.now() < end) await sleep(10); };

// ------------------------------------------------------------------------------------------------ 1. the network layer
// A tiny stand-in for PeerJS: peers by id, data connections as linked pairs, messages JSON-copied and delivered a tick later.
const peers = new Map();
class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; }
  emit(e, ...a) { for (const f of this.h[e] || []) f(...a); }
}
class Conn extends Emitter {
  constructor(peer) { super(); this.peer = peer; this.open = false; this.other = null; }
  send(m) {
    if (!this.open) return;
    const copy = JSON.parse(JSON.stringify(m)), o = this.other;
    setTimeout(() => { if (o && o.open) o.emit('data', copy); }, 0);
  }
  close() { if (!this.open) return; this.open = false; this.emit('close'); const o = this.other; if (o && o.open) { o.open = false; setTimeout(() => o.emit('close'), 0); } }
  dropLocal() { this.open = false; this.emit('close'); }   // our end only: the other end never hears (a dead network)
}
class Peer extends Emitter {
  constructor(a, b) {
    super();
    this.id = typeof a === 'string' ? a : 'anon' + Math.random().toString(36).slice(2);
    this.destroyed = false; this.conns = [];
    if (peers.has(this.id)) { setTimeout(() => this.emit('error', { type: 'unavailable-id' }), 0); return; }
    peers.set(this.id, this);
    setTimeout(() => this.emit('open', this.id), 0);
  }
  connect(id) {
    const mine = new Conn(this), target = peers.get(id);
    this.conns.push(mine);
    setTimeout(() => {
      if (!target || target.destroyed) { this.emit('error', { type: 'peer-unavailable' }); return; }
      const theirs = new Conn(target);
      mine.other = theirs; theirs.other = mine; target.conns.push(theirs);
      mine.open = theirs.open = true;
      target.emit('connection', theirs);
      mine.emit('open');
    }, 0);
    return mine;
  }
  reconnect() {}
  destroy() { if (this.destroyed) return; this.destroyed = true; peers.delete(this.id); for (const c of this.conns) c.close(); }
}
const CLASSES_STUB = [{ id: 'bastion' }, { id: 'cleric' }];
// each "tab" gets its own copy of net.js (it is a script that defines a Net singleton)
function tab() {
  const win = { addEventListener() {} };
  const ctx = vm.createContext({ window: win, Peer, CLASSES: CLASSES_STUB, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, performance, crypto, Promise, URL, Blob: undefined, Worker: undefined });
  const src = fs.readFileSync(path.join(__dirname, '../client/js/net.js'), 'utf8');
  return vm.runInContext(src + '\n;Net', ctx);
}

async function netTests() {
  const host = tab(), a = tab(), b = tab();
  const log = [];
  host.hostHooks.shouldHold = () => true;
  host.hostHooks.onHold = p => log.push('hold ' + p.id);
  host.hostHooks.onBack = p => log.push('back ' + p.id);
  const hostSaw = [];
  for (const t of ['leave', 'join']) host.on(t, m => hostSaw.push(t + ' ' + (m.id || m.p.id)));
  const w = await host.host('Host');
  check(w.id === 1, 'the host is player 1');

  // --- 1a. a drop mid-raid: held, quietly rejoined, the same player
  const aSaw = [];
  a.canRejoin = () => true;
  for (const t of ['linklost', 'linkback', 'disconnect']) a.on(t, m => aSaw.push(t));
  const wa = await a.join(host.room, 'Ana');
  check(wa.id === 2 && a.id === 2, 'joiner is player 2');
  await sleep(20);
  peers.get([...peers.keys()].find(k => k.startsWith('anon'))).conns.forEach(c => c.close());   // the link dies
  await sleep(10);
  check(log.includes('hold 2'), `the host should hold the slot when the link drops (log: ${log})`);
  check(!hostSaw.some(s => s === 'leave 2'), 'a held player has not left');
  check(a.link === 'lost' || aSaw.includes('linkback'), 'the tab notices and starts to rejoin');
  await until(() => aSaw.includes('linkback') && log.includes('back 2'));
  await sleep(20);
  check(aSaw.join() === 'linklost,linkback', `the tab should lose the link then get it back, once (saw ${aSaw})`);
  check(log.includes('back 2'), 'the host should hear that player 2 is back');
  check(a.link === 'ok' && a.id === 2 && a.online, 'back online as the same player');
  check(!hostSaw.some(s => s === 'leave 2' || s === 'join 3'), `the rejoin must not look like a leave or a new join (host saw ${hostSaw})`);
  // and the link works both ways again
  let got = null; host.onHost('x', (pid, m) => { got = [pid, m.v]; }); a.send({ t: 'x', v: 7 });
  let back = null; a.on('y', m => { back = m.v; }); host.sendTo(2, { t: 'y', v: 9 });
  await sleep(20);
  check(got && got[0] === 2 && got[1] === 7, 'the host hears the rejoined player');
  check(back === 9, 'the rejoined player hears the host (sendTo)');

  // --- 1b. the hold runs out: an unreachable player is removed (the usual 'leave')
  const real = Date.now;
  // (the clock is moved on below, which would also trip the heartbeats of tabs still connected: this first tab is let go)
  a.canRejoin = () => false;
  peers.get([...peers.keys()].find(k => k.startsWith('anon'))).destroy();
  await sleep(10);
  b.canRejoin = () => false;   // (this tab gives up at once: nobody comes back)
  const bSaw = []; b.on('disconnect', () => bSaw.push('disconnect'));
  const wb = await b.join(host.room, 'Bo');
  await sleep(20);
  log.length = 0;
  peers.get([...peers.keys()].filter(k => k.startsWith('anon')).pop()).conns.forEach(c => c.close());
  await sleep(10);
  check(log.includes('hold ' + wb.id) && bSaw.length === 1, `a drop outside a raid-aware tab: held on the host, "disconnect" on the tab (log ${log}, ${bSaw})`);
  check(host.heldIds().includes(wb.id), 'heldIds lists them');
  Date.now = () => real() + 61000;   // the minute passes
  await sleep(3300);                 // (the host checks every 3 s)
  Date.now = real;
  check(hostSaw.includes('leave ' + wb.id), `after the hold the player leaves for good (host saw ${hostSaw})`);
  check(!host.heldIds().length, 'nothing held any more');

  // --- 1c. nothing to hold (no raid): removed at once, and a tab that tries to rejoin is told it is gone
  host.hostHooks.shouldHold = () => false;
  const c = tab(); c.canRejoin = () => true;
  const cSaw = []; for (const t of ['linklost', 'linkback', 'disconnect']) c.on(t, () => cSaw.push(t));
  const wc = await c.join(host.room, 'Cy');
  await sleep(20);
  peers.get([...peers.keys()].filter(k => k.startsWith('anon')).pop()).conns.forEach(x => x.close());
  await until(() => cSaw.includes('disconnect') && hostSaw.includes('leave ' + wc.id));
  await sleep(20);
  check(hostSaw.includes('leave ' + wc.id), 'no raid: a drop removes the player as before');
  check(cSaw.join() === 'linklost,disconnect', `a slot nobody holds: the tab learns it at once and gives up (saw ${cSaw})`);

  // --- 1d. the tab sees the link die but the host never did: it is taken over, not duplicated
  host.hostHooks.shouldHold = () => true;
  log.length = 0;
  const d = tab(); d.canRejoin = () => true;
  const dSaw = []; for (const t of ['linklost', 'linkback', 'disconnect']) d.on(t, () => dSaw.push(t));
  const wd = await d.join(host.room, 'Di');
  await sleep(20);
  const dc = peers.get([...peers.keys()].filter(k => k.startsWith('anon')).pop()).conns[0];
  dc.dropLocal();
  await until(() => dSaw.includes('linkback') || dSaw.includes('disconnect'));
  await sleep(20);
  check(dSaw.join() === 'linklost,linkback', `a link only the tab noticed: rejoined (saw ${dSaw})`);
  check(log.includes('back ' + wd.id) && !log.includes('hold ' + wd.id), `taken over without a hold (log ${log})`);
  check(!hostSaw.includes('leave ' + wd.id), 'and still not a leave');

  // --- 1e. a made-up token is refused
  const answers = [];
  const forger = new Peer();
  await new Promise(r => forger.on('open', r));
  const fc = forger.connect('emberfall-v1-' + host.room);
  fc.on('open', () => fc.send({ t: 'hello', name: 'Eve', rejoin: 1, tok: 'AAAAAAAAAAAAAAAAAAAAAAAA' }));
  fc.on('data', m => answers.push(m.t));
  await until(() => answers.length > 0);
  await sleep(20);
  check(answers.join() === 'norejoin', `a made-up token is refused (got ${answers})`);
  // and a real player's token cannot be taken by someone who never held it: it needs the exact token, which the host never shares
  check(!JSON.stringify(host.hostHandlers).includes('tok'), 'the token is not exposed');
}

// ------------------------------------------------------------------------------------------------ 2. the snapshot
function raidTests() {
  const load = p => require(path.join(__dirname, '../client/js', p));
  Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
    load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
  Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'));
  const DEFS = {
    grubnak: load('arena/bosses/grubnak.js').GRUBNAK, skitterra: load('arena/bosses/skitterra.js').SKITTERRA, volkar: load('arena/bosses/volkar.js').VOLKAR,
    hollowking: load('arena/bosses/hollowking.js').HOLLOWKING, wyrm: load('arena/bosses/wyrm.js').WYRM, titan: load('arena/bosses/titan.js').TITAN,
    hydra: load('arena/bosses/hydra.js').HYDRA, archmage: load('arena/bosses/archmage.js').AZERATH,
  };
  const people = [
    { id: 1, name: 'Tank', cls: 'bastion', spec: null, role: 'tank', x: 0, y: 320, a: -1.57 },
    { id: 2, name: 'Heal', cls: 'cleric', spec: null, role: 'healer', x: -60, y: 350, a: -1.57 },
  ];
  for (const [id, def] of Object.entries(DEFS)) for (const mode of ['normal', 'hard']) {
    const held = new Set(), sent = [];
    const host = new RaidHost({ def, mode, humans: () => people.filter(p => !held.has(p.id)).map(p => Object.assign({}, p)), bots: ['ranger', 'pyromancer'], emit: m => sent.push(m), seed: 11, waitPull: true });
    const tag = `${id} ${mode}`;
    host.sim.pull();
    let snaps = 0, tgSeen = 0, standSnap = null;
    for (let i = 0; i < 20 * 150 && host.sim.state === 'live'; i++) {   // up to two and a half minutes
      host.tick(0.05);
      // keep the humans on their feet so the fight runs on
      for (const p of people) { const s = host.sim.ps.get(p.id); if (s) { s.alive = true; s.hp = s.maxHp; } }
      if (i === 20 * 12) {   // the healer's link drops
        held.add(2);
        const bot = host.standIn(people[1]);
        check(bot && bot.id === 2 && bot.standIn, `${tag}: a stand-in takes the healer's place`);
        check(host.standIn(people[1]) === null, `${tag}: only one stand-in per player`);
        check(new Set(host.allPlayers().map(p => p.id)).size === host.allPlayers().length, `${tag}: no player twice`);
      }
      if (i % (20 * 8) === 0 && i > 0) {
        const before = sent.length;
        host.sim.propsDirty = true; const addsDirty = host.sim.addsDirty;
        const snap = host.snapshot();
        snaps++;
        check(sent.length === before, `${tag}: a snapshot must not send anything to everyone`);
        check(host.sim.propsDirty === true && host.sim.addsDirty === addsDirty, `${tag}: a snapshot must leave the sim's pending broadcasts alone`);
        const types = snap.msgs.map(e => e.m.t);
        for (const need of ['fb', 'fps', 'props', 'bnext', 'mtr']) check(types.includes(need), `${tag}: snapshot lacks ${need}`);
        const fb = snap.msgs.find(e => e.m.t === 'fb').m, fps = snap.msgs.find(e => e.m.t === 'fps').m;
        check(fb.hp === host.sim.boss.hp && fb.x === Math.round(host.sim.boss.x), `${tag}: the boss in the snapshot is the boss now`);
        check(Array.isArray(fb.g), `${tag}: the HP gates ride in a snapshot`);
        check(fps.ps.length === host.sim.ps.size, `${tag}: every party member listed`);
        // telegraphs: exactly those the sim still has, each with how long it has run
        const tgs = snap.msgs.filter(e => e.m.t === 'tg');
        const live = [...host.sim.mechs.keys()];
        check(tgs.length === live.length, `${tag}: ${tgs.length} telegraphs in the snapshot, ${live.length} in the sim`);
        for (const e of tgs) {
          const mech = host.sim.mechs.get(e.m.id);
          check(!!mech && (e.el || 0) >= -0.001 && (e.el || 0) <= e.m.dur + 0.5, `${tag}: telegraph ${e.m.id} el ${e.el} of ${e.m.dur}`);
          if (mech) check(JSON.stringify(e.m.shape) === JSON.stringify(mech.shape), `${tag}: a telegraph's shape is where it is now`);
        }
        tgSeen += tgs.length;
        const puds = snap.msgs.filter(e => e.m.t === 'pud');
        check(puds.length === host.sim.puddles.length, `${tag}: puddles ${puds.length} vs ${host.sim.puddles.length}`);
        check(snap.msgs.filter(e => e.m.t === 'teth').length === host.sim.tethers.size, `${tag}: tethers`);
        check(snap.msgs.filter(e => e.m.t === 'roll' && !e.m.pre).length === host.sim.rollers.size, `${tag}: rollers`);
        check(snap.msgs.filter(e => e.m.t === 'sweep').length === host.sim.sweeps.size, `${tag}: sweeps`);
        check(snap.msgs.filter(e => e.m.t === 'reel').length === host.sim.reels.size, `${tag}: reels`);
        const adds = snap.msgs.find(e => e.m.t === 'adds');
        check(adds && adds.m.l.length === host.sim.adds.size, `${tag}: adds`);
        const bots = snap.msgs.find(e => e.m.t === 'bots');
        if (i > 20 * 12) check(bots && bots.m.b.some(r => r[0] === 2), `${tag}: the stand-in is among the bots in the snapshot`);
        if (host.sim.boss.cast) {
          const bc = snap.msgs.find(e => e.m.t === 'bcast');
          check(!bc || bc.m.name === host.sim.boss.cast.name, `${tag}: the boss cast in the snapshot is the one running`);
        }
        const json = JSON.stringify(snap);
        check(json.length < 60000, `${tag}: snapshot is ${json.length} bytes`);
        check(JSON.stringify(JSON.parse(json)) === json, `${tag}: snapshot survives JSON`);
        if (held.has(2)) standSnap = snap;
      }
    }
    check(snaps >= 2, `${tag}: the fight ran long enough to snapshot (${snaps})`);
    // the stand-in played: casts under id 2, flagged as in the raid
    if (held.has(2)) {
      const mine = sent.filter(m => (m.t === 'cast' || m.t === 'auto') && m.id === 2);
      check(mine.length > 5, `${tag}: the stand-in should be using the healer's moves (${mine.length} casts)`);
      check(mine.every(m => m.t === 'auto' || m.s === 1), `${tag}: a stand-in's casts are marked as in the raid (s)`);
      check(sent.some(m => m.t === 'bots' && m.b.some(r => r[0] === 2)), `${tag}: the stand-in's moves go out in the bots messages`);
      const hp = host.sim.ps.get(2);
      check(hp && hp.maxHp > 1, `${tag}: their health stays in the sim`);
      const at = host.releaseStandIn(2);
      held.delete(2);
      check(at && Number.isFinite(at.x) && Number.isFinite(at.y), `${tag}: the stand-in steps out where it left the hero`);
      check(host.releaseStandIn(2) === null && !host.bots.some(b => b.id === 2), `${tag}: and is gone`);
      check(new Set(host.allPlayers().map(p => p.id)).size === host.allPlayers().length, `${tag}: no player twice after`);
      host.tick(0.05);   // the sim carries on with the human again
    }
    if (host.sim.state === 'wipe' || host.sim.state === 'clear') {
      const snap = host.snapshot();
      check(snap.result && snap.result.t === 'fight', `${tag}: a snapshot of a finished fight carries its result`);
    }
    check(host.seen.size < 200, `${tag}: the ledger stays small (${host.seen.size})`);
    void tgSeen; void standSnap;
  }
}

// ------------------------------------------------------------------------------------------------ 3. the loot chest and a rejoin
// A player who never confirmed the chest (they dropped as the boss fell) is sent it again on a rejoin, once; a chest a tab has
// already opened is ignored there, so the clear's gold is never paid twice.
function lootTests() {
  const items = require(path.join(__dirname, '../client/js/items.js'));
  const el = () => ({ classList: { add() {}, remove() {}, contains: () => true, toggle() {} }, addEventListener() {}, appendChild() {}, querySelectorAll: () => [], querySelector: () => null, style: {} });
  const src = fs.readFileSync(path.join(__dirname, '../client/js/loot.js'), 'utf8');
  const make = () => vm.runInContext(src + '\n;Loot', vm.createContext({ document: Object.assign({ createElement: el, getElementById: () => null, body: el() }), Tip: { hide() {}, set() {} }, console, setTimeout, performance,
    ITEMS: items.ITEMS, RARITY: items.RARITY, rollChest: items.rollChest, clearGold: items.clearGold }));
  const host = make(), tabs = { 1: make(), 2: make() }, gold = { 1: 0, 2: 0 }, out = [];
  host.init({ broadcast: m => out.push(m), send: () => {}, myId: () => 0 });
  for (const id of [1, 2]) tabs[id].init({ broadcast() {}, send: m => { if (m.t === 'cack') host.hostAck(id, m); }, myId: () => id, addGold: n => { gold[id] += n; }, addItem() {}, inRaid: () => true,
    nameOf: () => '?', iconURL: () => '', myItems: () => [], dropItem() {}, escrow() {}, settle() {}, unescrow() {}, unescrowAll() {}, itemTip: () => '' });
  const humans = [[1, 'bastion'], [2, 'cleric']];
  host.hostOpen('grubnak', 'normal', humans, { x: 0, y: 0 }, 777);
  const chest = out.pop();
  check(chest && chest.t === 'chest' && chest.run === 777 && chest.gold > 0, 'a chest names its run and carries the gold');
  tabs[1].onChest(JSON.parse(JSON.stringify(chest)));   // (player 2's link was down: they never got it)
  check(gold[1] === chest.gold, 'the player who got it was paid');
  check(host.hostChestFor(1) === null, 'a player who confirmed it is not sent it again');
  const again = host.hostChestFor(2);
  check(again && again.id === chest.id && again.run === 777 && again.items.length === chest.items.length, 'a player who never confirmed it is sent it on a rejoin');
  tabs[2].onChest(JSON.parse(JSON.stringify(again)));
  check(gold[2] === chest.gold, 'the rejoiner is paid once');
  check(host.hostChestFor(2) === null, 'and now it is confirmed: nothing more is sent');
  // the same chest again (a duplicate, however it came): nobody is paid twice
  tabs[1].onChest(JSON.parse(JSON.stringify(chest))); tabs[2].onChest(JSON.parse(JSON.stringify(again)));
  check(gold[1] === chest.gold && gold[2] === chest.gold, `a chest already opened is ignored (gold ${gold[1]}, ${gold[2]} of ${chest.gold})`);
  // a chest of another run is its own chest
  tabs[1].onChest(Object.assign(JSON.parse(JSON.stringify(chest)), { run: 778 }));
  check(gold[1] === chest.gold * 2, 'a chest of another run is paid');
  // someone who was never in the run gets nothing sent
  check(host.hostChestFor(9) === null, 'nobody outside the run is sent a chest');
}

(async () => {
  try { await netTests(); } catch (e) { probs.push('net tests threw: ' + (e && e.stack || e)); }
  try { lootTests(); } catch (e) { probs.push('loot tests threw: ' + (e && e.stack || e)); }
  try { raidTests(); } catch (e) { probs.push('raid tests threw: ' + (e && e.stack || e)); }
  if (probs.length) { console.log('Rejoin FAILED:\n  ' + [...new Set(probs)].slice(0, 30).join('\n  ')); process.exit(1); }
  console.log('Rejoin OK: hold, rejoin, expiry, a gone slot, a silent drop; the loot chest once only; stand-in and snapshots across all eight bosses on both modes');
  process.exit(0);
})();
