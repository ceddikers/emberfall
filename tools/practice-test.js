// The Practice Hall's aids (client/js/practice.js, main.js startRaid, fight.js noEnrage / cantDie), headless:
//   enrage off: the boss never enrages (and the control run does)         can't die: HP floors at 1, nobody dies, each fall is counted and reported
//   loop: RaidHost.passedPhase() fires once the run is past the phase it began in (never without the loop aid)
//   slow time: a slowed host clock stays one steady line on a client (SendClock scale), and a slowed sim covers half the fight per real second
//   requests: PracticeHall.sane() accepts only what the host could have started; clean() fixes a bad save
//   two peers: a guest's 'prreq' over net.js on an in-memory Peer reaches the host's game, which starts it after its notice, can Cancel it,
//     says busy, and refuses an Ultimate act beyond what the guest (their sent reach) or the host has reached ('prno' with the reason)
//   node tools/practice-test.js        (exit code 0 and a final "Practice OK" when everything holds)
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const load = p => require(path.join(__dirname, '../client/js', p));
const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };

Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'), load('arena/scoring.js'), load('arena/raid-host.js'));
const { GRUBNAK } = load('arena/bosses/grubnak.js');
const { SendClock } = load('interp.js');

const people = [
  { id: 1, name: 'Tank', cls: 'bastion', spec: null, role: 'tank', x: 0, y: 320, a: -1.57 },
  { id: 2, name: 'Heal', cls: 'cleric', spec: null, role: 'healer', x: -60, y: 350, a: -1.57 },
];
function host(px, from = 1, extra = {}) {
  const sent = [];
  const h = new RaidHost(Object.assign({ def: GRUBNAK, mode: 'normal', humans: () => people.map(p => Object.assign({}, p)), bots: ['ranger', 'pyromancer'], emit: m => sent.push(m), seed: 7, waitPull: true, practiceFrom: from, px }, extra));
  h.sim.pull();
  return { h, sent };
}

// ---------------------------------------------------------------- enrage off
{
  for (const off of [false, true]) {
    const { h, sent } = host({ noEnrage: off, cantDie: false, slow: 1, loop: false });
    const big = 1e12; h.sim.boss.hp = h.sim.boss.maxHp = big;   // (the boss outlives the clock, and the party outlives the closing passes' growing damage)
    for (const s of h.sim.ps.values()) s.hp = s.maxHp = 1e9;
    let enraged = false, wiped = false;
    for (let i = 0; i < 20 * 660; i++) {
      h.tick(0.05);
      for (const s of h.sim.ps.values()) { s.alive = true; s.hp = s.maxHp; }
      h.sim.boss.hp = big;
      if (h.sim.boss.cast && h.sim.boss.cast.anim === 'enrage') enraged = true;
      if (h.sim.state === 'wipe') { wiped = true; break; }
    }
    check(off ? !enraged : enraged, `enrage ${off ? 'off: the boss never casts it' : 'control: the boss does cast it'} (cast seen: ${enraged})`);
    check(!wiped, 'nobody is wiped by the enrage in the runs (HP is topped up each tick)');
    check(!sent.some(m => m.t === 'pdmg' && m.k === 'enrage') || !off, 'enrage off: no enrage damage lands');
  }
}

// ---------------------------------------------------------------- can't die
{
  for (const cant of [false, true]) {
    const { h, sent } = host({ noEnrage: false, cantDie: cant, slow: 1, loop: false });
    h.sim.boss.hp = h.sim.boss.maxHp = 1e12;
    for (let i = 0; i < 20 * 140 && h.sim.state === 'live'; i++) {
      h.tick(0.05);
      // the bots' health is theirs to keep: only the humans are left to the fight, with no healing
      for (const s of h.sim.ps.values()) if (s.id >= 1000) { s.alive = true; s.hp = s.maxHp; }
    }
    const humans = people.map(p => h.sim.ps.get(p.id)), deaths = people.reduce((n, p) => n + h.sim.stats[p.id].deaths, 0);
    if (cant) {
      check(humans.every(s => s.alive && s.hp >= 1), "can't die: nobody is dead and nobody is below 1 HP");
      check(deaths === 0, "can't die: no deaths on the tally");
      check(h.sim.falls > 0, `can't die: falls were counted (${h.sim.falls})`);
      check(people.reduce((n, p) => n + (h.sim.stats[p.id].falls || 0), 0) === h.sim.falls, "can't die: the per-hero falls add up to the total");
      check(!sent.some(m => m.t === 'fev' && m.k === 'death'), "can't die: no death event is sent");
      check(sent.filter(m => m.t === 'pdmg').every(m => m.hp >= 0), "can't die: hit messages stay sane");
      h.sim.boss.hp = 1; for (let i = 0; i < 40 && h.sim.state === 'live'; i++) { h.sim.onEvent(1, { type: 'damage', amount: 5 }); h.tick(0.05); }
      const end = sent.find(m => m.t === 'fight' && m.s === 'clear');
      check(end && end.falls === h.sim.falls, `can't die: the clear message carries the falls (${end && end.falls})`);
    } else {
      check(deaths > 0, `control: the unhealed humans do die in this window (${deaths})`);
      const wipe = sent.find(m => m.t === 'fight' && (m.s === 'wipe' || m.s === 'clear'));
      check(!wipe || wipe.falls === undefined, 'control: a normal run reports no falls');
    }
  }
  // a hit that is bigger than the whole bar, and a sentence
  const { h } = host({ cantDie: true });
  const s1 = h.sim.ps.get(1), p1 = h.allPlayers().find(p => p.id === 1);
  h.sim.damagePlayer(p1, 9e9, { raw: true, kind: 'hit' });
  check(s1.alive && s1.hp === 1, "can't die: a huge hit leaves 1 HP");
  h.sim.damagePlayer(p1, 9999999, { kind: 'doom' });
  check(s1.alive && s1.hp === 1, "can't die: a sentence (doom, fall, enrage) is counted and not carried out");
  const { h: h2 } = host({ cantDie: false });
  h2.sim.damagePlayer(h2.allPlayers().find(p => p.id === 1), 9e9, { raw: true, kind: 'hit' });
  check(!h2.sim.ps.get(1).alive, 'control: the same hit kills without the aid');
}

// ---------------------------------------------------------------- loop
{
  for (const [from, loop] of [[1, true], [1, false], [2, true]]) {
    const { h } = host({ noEnrage: false, cantDie: true, slow: 1, loop }, from);
    check(!h.passedPhase(), `loop from ${from}: not at the start`);
    let at = -1;
    for (let i = 0; i < 20 * 400 && h.sim.state === 'live'; i++) {
      h.tick(0.05);
      for (const s of h.sim.ps.values()) { s.alive = true; s.hp = s.maxHp; }
      // the party hits the boss steadily so the HP gates are met
      if (i % 20 === 0) h.sim.onEvent(1, { type: 'damage', amount: Math.max(1, Math.round(h.sim.boss.maxHp / 220)) });
      if (h.passedPhase() && at < 0) { at = h.sim.phase; break; }
    }
    if (loop) check(at === from + 1, `loop from ${from}: passedPhase turns true on reaching phase ${from + 1} (got ${at})`);
    else check(at < 0, `loop off from ${from}: passedPhase never turns true`);
  }
  const { h } = host(null, 1);
  check(h.px === null && !h.passedPhase(), 'a run without aids has no loop');
  const real = new RaidHost({ def: GRUBNAK, mode: 'normal', humans: () => people.map(p => Object.assign({}, p)), bots: [], emit() {}, seed: 1, waitPull: true, px: { loop: true } });
  check(real.px === null, 'a real pull ignores the aids (no practiceFrom)');
}

// ---------------------------------------------------------------- slow time
{
  // a host fight at half speed stamps its messages with sim time; the client puts them back on real time, so the offset stays steady
  const real0 = 1000, k = 0.5;
  for (const scale of [1, 0.5]) {
    const clk = new SendClock(scale), offs = [];
    for (let i = 0; i < 100; i++) { const realT = real0 + i * 0.1, simT = i * 0.1 * k, mapped = clk.map(simT, realT + 0.02); offs.push(realT - mapped); }
    const lag = offs.slice(30).reduce((a, b) => a + b, 0) / 70;   // (how far behind real time the mapped host clock sits: the travel time, 20 ms, when it is right)
    if (scale === 0.5) check(lag < 0.05, `slow time: the client's mapped host clock sits right behind real time (lag ${lag.toFixed(3)})`);
    else check(lag > 0.5, `control: an unscaled client clock would sit well behind under slow time (${lag.toFixed(2)})`);
  }
  const a = host(null, 1).h, b = host(null, 1).h;
  for (let i = 0; i < 100; i++) { a.tick(0.05); b.tick(0.05 * 0.5); }
  check(Math.abs(b.sim.t - a.sim.t * 0.5) < 1e-6 || b.sim.state === 'prepull', `slow time: a half-speed host tick covers half the fight (${a.sim.t.toFixed(2)} vs ${b.sim.t.toFixed(2)})`);
}

// ---------------------------------------------------------------- the panel's checks (practice.js)
{
  const src = fs.readFileSync(path.join(__dirname, '../client/js/practice.js'), 'utf8');
  const store = {};
  const ctx = vm.createContext({ localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, document: {}, Sound: undefined, setInterval, clearInterval,
    SvPortal: { ACTS: ['A', 'B', 'C', 'D'], reach: () => 2 } });
  const P = vm.runInContext(src + '\n;PracticeHall', ctx);
  P.init({ bossOpen: id => id !== 'titan', hardOpen: () => true, name: id => id });
  check(P.sane({ boss: 'grubnak', mode: 'hard', from: 2, px: { slow: 0.5, cantDie: 1 } }).px.slow === 0.5, 'a request keeps a valid slow');
  check(P.sane({ boss: 'grubnak', mode: 'hard', from: 2, px: { slow: 0.1 } }).px.slow === 1, 'a made-up slow becomes full speed');
  check(P.sane({ boss: 'grubnak', mode: 'x', from: 2 }).mode === 'normal', 'a made-up mode becomes Normal');
  check(P.sane({ boss: 'grubnak', from: 9 }) === null && P.sane({ boss: 'grubnak', from: 0 }) === null && P.sane({ boss: 'nope', from: 1 }) === null, 'a bad phase or boss is refused');
  check(P.sane({ boss: 'titan', from: 1 }, true) === null && P.sane({ boss: 'titan', from: 1 }, false) !== null, "the host refuses a fight that is not open on its road");
  check(P.sane({ boss: 'sovereign', mode: 'hard', from: 2 }, true).mode === 'normal', 'the Ultimate has one difficulty');
  check(P.actWhy({ boss: 'sovereign', from: 3 }, 4) !== '' && P.actWhy({ boss: 'sovereign', from: 2 }, 4) === '' && P.actWhy({ boss: 'sovereign', from: 2 }, 1) !== '' && P.actWhy({ boss: 'grubnak', from: 2 }, 0) === '',
    "actWhy: an Ultimate act needs the host's reach (2 here) and the guest's; other fights are not gated");
  check(P.sane({ boss: 'sovereign', from: 5 }) === null, 'the Ultimate has four acts');
  check(P.clean(null).slow === 1 && P.clean({ slow: '0.75', loop: 1 }).slow === 0.75 && P.clean({ loop: 1 }).loop === true, 'a bad or old save is cleaned');
}

// ---------------------------------------------------------------- the Bests (pastimes.js)
{
  const src = fs.readFileSync(path.join(__dirname, '../client/js/pastimes.js'), 'utf8');
  const state = {};
  const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, addEventListener() {}, querySelector: () => el(), querySelectorAll: () => [], children: [], dataset: {} });
  const ctx = vm.createContext({ Save: { get: k => state[k], set: (k, v) => { state[k] = v; }, commit() {} }, document: { getElementById: () => null, createElement: el, body: el(), querySelectorAll: () => [] },
    console, setTimeout, localStorage: { getItem: () => null, setItem() {} }, BOSSES: [{ id: 'grubnak', name: 'Grubnak', set: 1 }], ULTIMATE_BOSS: { id: 'sovereign', name: 'Sovereign', set: 4 },
    CLASSES: [{ id: 'cleric', name: 'Cleric', role: 'healer' }, { id: 'ranger', name: 'Ranger', role: 'dps' }], ROLES: { healer: { color: '#0f0' }, dps: { color: '#f00' } }, Math, Date, JSON });
  const P = vm.runInContext(src + '\n;Pastimes', ctx);
  P.event('best', { boss: 'grubnak', mode: 'normal', cls: 'ranger', secs: 480, clear: true, damage: 480 * 3000, healing: 0 });
  P.event('best', { boss: 'grubnak', mode: 'normal', cls: 'ranger', secs: 500, clear: true, damage: 500 * 2500, healing: 0 });   // slower and weaker
  P.event('best', { boss: 'grubnak', mode: 'normal', cls: 'ranger', secs: 30, clear: false, damage: 30 * 9000, healing: 0 });       // too short to count
  P.event('best', { boss: 'grubnak', mode: 'normal', cls: 'cleric', secs: 450, clear: false, damage: 1, healing: 450 * 1800 });      // a wipe: no clear time
  P.event('best', { boss: 'grubnak', mode: 'normal', cls: 'ranger', secs: 300, clear: true, damage: 1, healing: 1, practice: true });  // practice: nothing
  const b = state.pastimes.bests['grubnak:normal'];
  check(b.ranger.t === 480 && b.ranger.d === 3000, `bests keep the fastest clear and best damage/s (${JSON.stringify(b.ranger)})`);
  check(b.cleric.h === 1800 && !b.cleric.t, 'a wipe sets healing/s but no clear time');
  check(Object.keys(state.pastimes.bests).length === 1, 'nothing recorded for a mode or boss never pulled');
}

// ---------------------------------------------------------------- two peers: a guest's request to the host (net.js on an in-memory Peer, practice.js on each side)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (cond, ms = 2000) => { const end = Date.now() + ms; while (!cond() && Date.now() < end) await sleep(2); };
const peers = new Map();
class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } emit(e, ...a) { for (const f of this.h[e] || []) f(...a); } }
class Conn extends Emitter {
  constructor(peer) { super(); this.peer = peer; this.open = false; this.other = null; }
  send(m) { if (!this.open) return; const copy = JSON.parse(JSON.stringify(m)), o = this.other; setTimeout(() => { if (o && o.open) o.emit('data', copy); }, 0); }
  close() { if (!this.open) return; this.open = false; this.emit('close'); const o = this.other; if (o && o.open) { o.open = false; setTimeout(() => o.emit('close'), 0); } }
}
class Peer extends Emitter {
  constructor(a) {
    super(); this.id = typeof a === 'string' ? a : 'anon' + Math.random().toString(36).slice(2); this.destroyed = false; this.conns = [];
    if (peers.has(this.id)) { setTimeout(() => this.emit('error', { type: 'unavailable-id' }), 0); return; }
    peers.set(this.id, this); setTimeout(() => this.emit('open', this.id), 0);
  }
  connect(id) {
    const mine = new Conn(this), target = peers.get(id); this.conns.push(mine);
    setTimeout(() => {
      if (!target || target.destroyed) { this.emit('error', { type: 'peer-unavailable' }); return; }
      const theirs = new Conn(target); mine.other = theirs; theirs.other = mine; target.conns.push(theirs); mine.open = theirs.open = true;
      target.emit('connection', theirs); mine.emit('open');
    }, 0);
    return mine;
  }
  reconnect() {}
  destroy() { if (this.destroyed) return; this.destroyed = true; peers.delete(this.id); for (const c of this.conns) c.close(); }
}
function tab() {   // (each "tab" gets its own copy of net.js, as in rejoin-test.js)
  const ctx = vm.createContext({ window: { addEventListener() {} }, Peer, CLASSES: [{ id: 'bastion' }, { id: 'cleric' }], console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, performance,
    crypto, Promise, URL, Blob: undefined, Worker: undefined });
  return vm.runInContext(fs.readFileSync(path.join(__dirname, '../client/js/net.js'), 'utf8') + '\n;Net', ctx);
}
// a PracticeHall of its own (practice.js on a fake page), wired to a Net the way main.js wires it; the ask's countdown ticks run fast. o.reach: that tab's Ultimate reach
function hall(net, o) {
  const els = [], doc = { createElement: () => { const e = { id: '', className: '', innerHTML: '', handlers: {}, classList: { add() {}, remove() {}, contains: () => false },
    addEventListener(t, f) { this.handlers[t] = f; }, remove() { this.gone = true; } }; els.push(e); return e; }, body: { appendChild() {} } };
  const ctx = vm.createContext({ document: doc, localStorage: { getItem: () => null, setItem() {} }, Sound: undefined, clearInterval, setInterval: (f, ms) => setInterval(f, Math.max(1, ms / 100)),
    SvPortal: { ACTS: ['The Kindling', 'The Forge', 'The Fall', 'Every Name'], reach: () => o.reach } });
  const P = vm.runInContext(fs.readFileSync(path.join(__dirname, '../client/js/practice.js'), 'utf8') + '\n;PracticeHall', ctx);
  const st = { started: [], busy: false };
  P.init({ isHost: () => net.isHost, hasHero: () => true, toast() {}, bossOpen: () => true, hardOpen: () => true, name: id => id,
    start: x => st.started.push(x), request: x => net.send(Object.assign({ t: 'prreq' }, x)), busy: () => st.busy, reply: (pid, m) => net.sendTo(pid, m), nameOf: () => 'Ana' });
  const press = d => els[0].handlers.click({ target: { closest: () => ({ classList: { contains: () => false }, dataset: d, getAttribute: () => null }) } });
  return { P, st, els, o, asks: () => els.filter(e => e.id === 'px-ask'),
    // the player picks a fight in the panel and then a phase to start from
    pick(boss, from) { P.open(); press({ boss }); press({ ph: String(from) }); } };
}

async function twoPeers() {
  const hostNet = tab(), guestNet = tab();
  const H = hall(hostNet, { reach: 3 }), G = hall(guestNet, { reach: 2 });
  hostNet.onHost('prreq', (pid, msg) => H.P.onRequest(pid, msg));
  const noes = []; guestNet.on('prno', m => noes.push(m.why));
  await hostNet.host('Host'); await guestNet.join(hostNet.room, 'Ana'); await sleep(20);
  const askUp = async n => { await until(() => H.asks().length >= n); return H.asks()[n - 1]; };   // (the host's notice number n is up)

  // a request: the host's game shows it with the guest's name, starts nothing at once, and starts it once the notice has run out
  G.pick('grubnak', 2);
  const a1 = await askUp(1);
  check(a1 && /Ana/.test(a1.innerHTML) && /grubnak/.test(a1.innerHTML), `the host's game shows the request with the guest's name (${a1 && a1.innerHTML})`);
  check(H.st.started.length === 0, 'the host starts nothing at the moment the request lands');
  await until(() => H.st.started.length > 0);
  check(H.st.started.length === 1 && H.st.started[0].boss === 'grubnak' && H.st.started[0].from === 2, `the host starts the asked run after its notice (${JSON.stringify(H.st.started)})`);
  check(a1.gone && noes.length === 0, 'the notice is cleared once started, and the guest was not refused');
  H.st.started.length = 0;

  // Cancel: the guest is told, and the run never starts
  G.pick('grubnak', 1);
  const a2 = await askUp(2);
  a2.handlers.click({ target: { closest: () => ({}) } });
  await until(() => noes.length > 0);
  check(a2.gone && H.st.started.length === 0, 'Cancel stops the request: nothing started, the notice is gone');
  check(noes.length === 1 && /called it off/.test(noes[0]), `the guest hears the host called it off (${noes})`);
  await sleep(150);
  check(H.st.started.length === 0, 'a cancelled request does not start later');
  noes.length = 0;

  // a second request while one waits is refused; the first still starts
  G.pick('grubnak', 1); await askUp(3);
  G.pick('grubnak', 3); await until(() => noes.length > 0);
  check(noes.length === 1 && /already has a request/.test(noes[0]), `a second request while one waits is refused (${noes})`);
  await until(() => H.st.started.length > 0);
  check(H.st.started.length === 1 && H.st.started[0].from === 1, 'the first request still starts');
  H.st.started.length = 0; noes.length = 0;

  // busy: the host is in a fight (at once; and when the fight begins while the notice is up)
  H.st.busy = true; G.pick('grubnak', 1); await until(() => noes.length > 0);
  check(/in a fight/.test(noes[0]) && H.asks().length === 3 && H.st.started.length === 0, `a busy host refuses at once, with no notice (${noes})`);
  H.st.busy = false; noes.length = 0;
  G.pick('grubnak', 1); await askUp(4); H.st.busy = true; await until(() => noes.length > 0);
  check(H.st.started.length === 0 && /in a fight/.test(noes[0]), `a host that is busy by the end of the notice does not start it (${noes})`);
  H.st.busy = false; noes.length = 0;

  // the Ultimate: an act the guest has not reached (the reach it sent), one the host has not reached, one within both, and a request with no reach
  G.pick('sovereign', 3); await until(() => noes.length > 0);
  check(/only reached act II\b/.test(noes[0]) && H.st.started.length === 0 && H.asks().length === 4, `an Ultimate act beyond the guest's reach is refused with the reason (${noes})`);
  noes.length = 0;
  G.o.reach = 4; G.pick('sovereign', 4); await until(() => noes.length > 0);
  check(/host has not reached/.test(noes[0]) && H.st.started.length === 0, `an act the host itself has not reached is refused too (${noes})`);
  noes.length = 0;
  guestNet.send({ t: 'prreq', boss: 'sovereign', mode: 'normal', from: 1 }); await until(() => noes.length > 0);
  check(/not reached any act/.test(noes[0]) && H.asks().length === 4, `an Ultimate request that sends no reach is refused (${noes})`);
  noes.length = 0;
  guestNet.send({ t: 'prreq', boss: 'sovereign', mode: 'normal', from: 5, reach: 99 }); await until(() => noes.length > 0);
  check(/not open/.test(noes[0]) && H.asks().length === 4, `a made-up act is refused whatever reach comes with it (${noes})`);
  noes.length = 0;
  G.pick('sovereign', 3); await askUp(5);
  await until(() => H.st.started.length > 0);
  check(noes.length === 0 && H.st.started.length === 1 && H.st.started[0].boss === 'sovereign' && H.st.started[0].from === 3, 'an act within what both have reached waits for the host like any request, then starts');
  // the guest's panel sends its reach with an Ultimate request (and only then)
  const sent = [], G2 = hall({ isHost: false, send: m => sent.push(m), sendTo() {} }, { reach: 2 });
  G2.pick('sovereign', 2); G2.pick('grubnak', 2);
  check(sent.length === 2 && sent[0].reach === 2 && sent[1].reach === undefined, `the guest's Ultimate request carries its reach, another fight's does not (${JSON.stringify(sent)})`);
  for (const p of peers.values()) p.destroy();
}

(async () => {
  try { await twoPeers(); } catch (e) { probs.push('two-peer tests threw: ' + (e && e.stack || e)); }
  if (probs.length) { console.log('PROBLEMS:\n- ' + probs.join('\n- ')); process.exit(1); }
  console.log('Practice OK');
  process.exit(0);
})();
