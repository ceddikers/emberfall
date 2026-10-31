// The buffs on the raid party frames (client/js/party-buffs.js, hud.js buffIconHtml/buffBody/kitBuffName, raid-host.js botBuffs, net.js 'pbf'), headless:
//   a fight of bots plays for two minutes while a stand-in hero's own client (a separate Net tab) sends its buffs; a second tab, a teammate's, reads
//     the frames: the ids, order, stacks and tooltips on a hero's frame are the ones on that hero's own buff row (hud.js Hud.buffs) within a moment of every change
//     (humans through the real net.js on an in-memory Peer, bots straight from the host), the same for the item buffs, and no status appears twice
//   hostRow(): the host-fed statuses (HoTs, debuffs, mitigation...) in the row's order, with the icon art and text the own row uses
//   messages: how many a hero sends a minute (kept modest), a rejoiner's 'pbq'/snapshot restores the tooltips, hostile messages are cleaned, a player with no hero is ignored
//   node tools/party-buffs-test.js        (exit code 0 and a final "Party buffs OK" when everything holds)
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = p => path.join(__dirname, '../client/js', p);
const load = p => require(J(p));

// ------------------------------------------------------------------------------------------------ the client's scripts, in a context of their own (hud.js is a browser script)
const ctx = vm.createContext({ console, Math, Object, Map, Set, JSON, Number, String, Array, Date, Infinity, NaN, Tip: { set() {}, hide() {} } });
ctx.globalThis = ctx;
for (const f of ['arena/shapes.js', 'data.js', 'status-icons.js', 'combat/engine.js', 'combat/kits.js', 'combat/specs.js', 'combat/hud.js', 'party-buffs.js'])
  vm.runInContext(fs.readFileSync(J(f), 'utf8'), ctx, { filename: f });
const C = vm.runInContext('({ PartyBuffs, Hud, BUFF_NAMES, BUFF_TIPS, BUFF_ICON, buffOwn, buffIconHtml, buffBody, buffTipHtml, kitBuffName, STATUS_INFO, HOT_ICON, ALLY_BUFFS })', ctx);
const { PartyBuffs, Hud } = C;

// the own row, without a page: the chips are stubs, the model is real
const stubEl = () => ({ classList: { toggle() {} }, querySelector: () => stubEl() });
Hud.buffRow = { children: [], set innerHTML(v) { this.children = Array.from({ length: (v.match(/<span class="buff/g) || []).length }, stubEl); } };
Hud.extra = () => [];
const ownRow = (kit, actor) => { Hud.actor = actor; Hud.buffs(kit, kit.now, actor); return Hud.rowModel().map(b => ({ id: b.id, name: b.name, stacks: b.stacks, left: b.left, tip: Hud._buffTip(b.id) })); };
const noHead = t => t.replace(/<em>[^<]*<\/em>/g, '');

// ------------------------------------------------------------------------------------------------ the network: net.js tabs on an in-memory Peer (as rejoin-test.js)
const peers = new Map();
// messages wait in one queue, drained in order: on its own a moment later, and by the fight loop each step, so how fast the machine runs never changes what arrives when
const inbox = [];
let draining = false;
const drain = () => { while (inbox.length) inbox.shift()(); draining = false; };
const deliver = fn => { inbox.push(fn); if (!draining) { draining = true; setImmediate(drain); } };
class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } emit(e, ...a) { for (const f of this.h[e] || []) f(...a); } }
class Conn extends Emitter {
  constructor(peer) { super(); this.peer = peer; this.open = false; this.other = null; }
  send(m) { if (!this.open) return; const copy = JSON.parse(JSON.stringify(m)), o = this.other; deliver(() => { if (o && o.open) o.emit('data', copy); }); }
  close() { if (!this.open) return; this.open = false; this.emit('close'); const o = this.other; if (o && o.open) { o.open = false; setTimeout(() => o.emit('close'), 0); } }
}
class Peer extends Emitter {
  constructor(a) { super(); this.id = typeof a === 'string' ? a : 'anon' + Math.random().toString(36).slice(2); this.destroyed = false; this.conns = []; peers.set(this.id, this); setTimeout(() => this.emit('open', this.id), 0); }
  connect(id) {
    const mine = new Conn(this), target = peers.get(id);
    this.conns.push(mine);
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
function tab() {
  const win = { addEventListener() {} };
  const c = vm.createContext({ window: win, Peer, CLASSES: load('data.js').CLASSES, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, performance, crypto, Promise, URL, Blob: undefined, Worker: undefined });
  return vm.runInContext(fs.readFileSync(J('net.js'), 'utf8') + '\n;Net', c);
}

async function main() {
  Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
    load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'), load('arena/scoring.js'));
  global.PartyBuffs = PartyBuffs;   // (the host sends the bots' rows through it)
  Object.assign(global, load('arena/raid-host.js'));
  const { GRUBNAK } = load('arena/bosses/grubnak.js');
  const ids = new Set(CLASSES.map(c => c.id));
  const botCls = ['bastion', 'bloodreaver', 'kenseier', 'cleric', 'grovekeeper', 'ranger', 'pyromancer', 'thresher', 'thermist', 'driftblade', 'marionettist', 'ironpalm'].filter(c => ids.has(c));

  const host = tab(), a = tab(), b = tab();
  await host.host('Host');
  await a.join(host.room, 'Ana'); await b.join(host.room, 'Bo');
  a.send({ t: 'cls', id: 'ranger' }); b.send({ t: 'cls', id: 'cleric' });
  await sleep(30);
  check(a.id === 2 && b.id === 3, 'the tabs are players 2 and 3');

  // B's frames: what B's client holds (main.js: raid.pbf)
  const store = new Map();
  let now = 0;
  const gotB = [];
  b.on('pbf', m => { gotB.push(m); PartyBuffs.recv(store, m, now); });
  host.on('pbf', m => PartyBuffs.recv(store, m, now));   // (the host's own client is a teammate too)
  const aGot = []; a.on('pbf', m => aGot.push(m));

  // the raid: a fight of bots, whose rows go out through the host's tab; Ana's hero is a stand-in in a second host nobody hears, standing for her own client's kit
  const sentBy = new Map();   // bot id -> pbf messages
  const mkHost = (emit, bots) => new RaidHost({ def: GRUBNAK, mode: 'normal', humans: () => [{ id: 1, name: 'Tank', cls: 'bastion', spec: null, role: 'tank', x: 0, y: 320, a: -1.57 }], bots, emit, seed: 5, waitPull: true });
  const raid = mkHost(m => {
    if (m.t === 'pbf') { (sentBy.get(m.id) || sentBy.set(m.id, []).get(m.id)).push(m); host.broadcastAll(m); }
  }, botCls);
  const lone = mkHost(() => {}, ['ranger']);
  const aBot = lone.bots[0], aKit = aBot.actor.kit;
  raid.sim.pull(); lone.sim.pull();
  check(raid.bots.length === botCls.length, `${raid.bots.length} bots in the raid`);

  // ------------------------------------------------------------ 1. the stream: every 0.05 s of the fight, the owners' clients scan and send
  const stA = {}, sent = { A: [] };
  const pending = [];   // [t, hero id, 'bot'|'A'] checks to run once the last change is a moment old
  const lastRow = new Map(), lastChange = new Map(), lastTimer = new Map();
  const sigOfRow = r => r.map(x => x.id + ':' + x.stacks).join('|');
  let samples = 0, tipChecks = 0, itemSeen = 0, dupSeen = 0, aBuffsSeen = 0;
  const heroes = () => [...raid.bots.map(x => ({ id: x.id, kit: x.actor.kit, actor: x.actor })), { id: 2, kit: aKit, actor: aBot.actor }];
  const T = 150;
  for (let i = 0; i < 20 * T; i++) {
    now = i * 0.05;
    raid.tick(0.05); lone.tick(0.05);
    for (const s of raid.sim.ps.values()) if (s.id < 1000) { s.alive = true; s.hp = s.maxHp; }
    for (const s of lone.sim.ps.values()) { s.alive = true; s.hp = s.maxHp; }   // (Ana's stand-in never falls: a dead kit's clock stops and her timers would drift from the frame's)
    // her hero's item effect, for the item path (an item buff the engine reports; name and flags ride along)
    if (i === 20 * 20) aKit.fxBuffs = new Map([['g_polar:0', { end: aKit.now + 40, stacks: 2, name: 'Test Charm', mods: {} }]]);
    const m = PartyBuffs.scan(aKit, 'ranger', stA, now);
    if (m) { m.t = 'pbf'; sent.A.push(m); a.send(m); }
    await new Promise(r => setImmediate(r)); drain();   // (the Peer stub delivers a tick later; whatever is still queued arrives before the next step)
    // watching every owner's row each tick: when did it last change (the set, a stack, or a timer refreshed or cut)?
    const rows = new Map();
    for (const h of heroes()) {
      const row = ownRow(h.kit, h.actor), sig = sigOfRow(row), prev = lastRow.get(h.id);
      if (!prev || prev.sig !== sig) lastChange.set(h.id, now);
      else for (let j = 0; j < row.length; j++) if (row[j].left != null && prev.row[j].left != null && Math.abs(row[j].left - (prev.row[j].left - 0.05)) > 0.3) lastTimer.set(h.id, now);   // (a timer refreshed: the frames may wait a moment longer for it)
      lastRow.set(h.id, { sig, row }); rows.set(h.id, row);
    }
    // sampling, twice a second: does each frame match its owner's row?
    if (i % 10 === 5) for (const h of heroes()) {
      const row = rows.get(h.id), sig = sigOfRow(row);
      if (now - (lastChange.get(h.id) || 0) < 1.0) continue;   // (a change is still on its way: it was in the last second)
      if (row.some(x => x.left != null && x.left >= 0 && x.left < 0.3)) continue;   // (a buff in its last moment: the frame may count it out a step before the row does)
      const v = PartyBuffs.view(store, h.id, h.actor.cls.id, now), frame = v.kit.concat(v.item);
      samples++;
      if (row.length) aBuffsSeen++;
      check(sigOfRow(frame) === sig, `t=${now.toFixed(1)} ${h.actor.cls.id}: the frame shows [${sigOfRow(frame)}], the own row [${sig}]`);
      const ids2 = frame.map(x => x.id);
      if (new Set(ids2).size !== ids2.length) dupSeen++;
      for (let j = 0; j < Math.min(row.length, frame.length); j++) {
        if (row[j].id !== frame[j].id) continue;
        check(row[j].name === frame[j].name, `${h.actor.cls.id}: name ${row[j].name} vs ${frame[j].name}`);
        if (frame[j].left != null && row[j].left != null && now - (lastTimer.get(h.id) || -9) > 2.2) check(Math.abs(frame[j].left - row[j].left) < 1.4, `${h.actor.cls.id} ${row[j].id}: ${frame[j].left.toFixed(1)}s on the frame vs ${row[j].left.toFixed(1)}s on the row`);
        const ft = PartyBuffs.tipHtml(frame[j]);
        tipChecks++;
        check(noHead(ft) === noHead(row[j].tip), `${h.actor.cls.id} ${row[j].id}: tooltip differs:\n    frame ${ft}\n    row   ${row[j].tip}`);
        if (frame[j].id.startsWith('fx-')) itemSeen++;
      }
    }
  }
  console.log(`  ${samples} frame samples compared, ${tipChecks} tooltips`);
  check(samples > 400, `enough samples (${samples})`);
  check(aBuffsSeen > 20, `the rows had buffs to compare often enough (${aBuffsSeen})`);
  check(tipChecks > 50, `enough tooltips compared (${tipChecks})`);
  check(itemSeen > 5, `an item buff reached the frame with its name and text (${itemSeen})`);
  check(dupSeen === 0, `no status shows twice on a frame (${dupSeen})`);
  check(gotB.some(m => m.id === 2) && gotB.some(m => m.id >= 1000), 'Bo heard both a person and bots');
  check(!aGot.some(m => m.id === 2), 'a hero does not hear their own row back');

  // ------------------------------------------------------------ 2. messages: how many, how big
  let worst = 0, total = 0, bytes = 0;
  const per = [];
  for (const [id, list] of [...sentBy, [2, sent.A]]) {
    const perMin = list.length / (T / 60), kb = JSON.stringify(list).length / (T / 60);
    per.push(`${id}:${perMin.toFixed(0)}`); worst = Math.max(worst, perMin); total += perMin; bytes += kb;
  }
  const n = sentBy.size + 1;
  console.log(`  messages per hero per minute (id:n): ${per.join(' ')}; mean ${(total / n).toFixed(1)}, worst ${worst.toFixed(0)}; ${(bytes / n / 1000).toFixed(1)} kB/min per hero`);
  check(worst <= 70, `no hero sends more than a message every ~0.9 s (${worst.toFixed(0)} a minute)`);
  check(total / n <= 40, `a hero sends 40 or fewer messages a minute on average (${(total / n).toFixed(1)})`);
  const within = sent.A.every((m, i, l) => !i || m.t === 'pbf');
  check(within && sent.A.length > 3, 'her client sent rows');
  check(sent.A.slice(1).filter(m => m.tp).length < sent.A.length * 0.6, 'tooltip text rides along only now and then');

  // ------------------------------------------------------------ 3. a rejoiner: the snapshot carries the bots' rows in full, 'pbq' makes a person's client send hers again
  const snap = raid.snapshot();
  const snapRows = snap.msgs.map(e => e.m).filter(m => m.t === 'pbf');
  check(snapRows.length >= 1 && snapRows.every(m => m.id >= 1000), `the snapshot carries the bots' rows (${snapRows.length})`);
  const fresh = new Map();
  for (const m of snapRows) PartyBuffs.recv(fresh, JSON.parse(JSON.stringify(m)), now);
  let tipsBack = 0, rowsBack = 0;
  for (const h of heroes().filter(x => x.id >= 1000)) {
    const row = ownRow(h.kit, h.actor), v = PartyBuffs.view(fresh, h.id, h.actor.cls.id, now), frame = v.kit.concat(v.item);
    if (row.length) rowsBack++;
    check(sigOfRow(frame) === sigOfRow(row), `the rejoiner sees the same row as the bot has now (${h.actor.cls.id}: [${sigOfRow(frame)}] vs [${sigOfRow(row)}])`);
    for (let j = 0; j < Math.min(row.length, frame.length); j++) { tipsBack++; check(noHead(PartyBuffs.tipHtml(frame[j])) === noHead(row[j].tip), `${h.actor.cls.id} ${row[j].id}: tooltip restored from the snapshot`); }
  }
  check(rowsBack >= 1 && tipsBack >= 1, `the snapshot restored rows (${rowsBack}) and tooltips (${tipsBack})`);
  // her client, told to send everything again
  aKit.buff('keen', 9, {}, 1); aKit.buff('aim', 9, {}, 4, 2);
  const stA2 = {}; PartyBuffs.scan(aKit, 'ranger', stA2, 1000);
  stA2.full = true;
  const again = PartyBuffs.scan(aKit, 'ranger', stA2, 1001);
  check(again && again.tp && again.tp.keen && again.tp.aim, 'after a pbq her next message carries all the tooltip text again');
  const quiet = PartyBuffs.scan(aKit, 'ranger', stA2, 1001.3);
  check(quiet === null, 'and nothing is sent when nothing changed');

  // ------------------------------------------------------------ 4. what the host lets through
  const bGotBefore = gotB.length;
  a.send({ t: 'pbf', b: [['keen', 5, 1, 0], ['x'.repeat(40), 1, 1, 0], ['a b', 1, 1, 0], ['ok', 'no', 1, 0], ['fx-t', 6, 500, 99, '<img src=x onerror=1>Charm']], tp: { keen: '<script>alert(1)</script>Hit harder', 'bad key!': 'x', long: 'y'.repeat(900) } });
  a.send({ t: 'pbf', b: 'nope' });
  a.send({ t: 'pbf', b: new Array(60).fill(['k', 1, 1, 0]).map((r, i) => ['k' + i, 1, 1, 0]) });
  await sleep(40);
  const evil = gotB.slice(bGotBefore);
  check(evil.length === 2, `two of the three odd messages were passed on, cleaned (${evil.length})`);
  const e0 = evil[0];
  check(e0 && e0.id === 2 && e0.b.length === 2 && e0.b[0][0] === 'keen' && e0.b[1][0] === 'fx-t', `bad rows dropped (${JSON.stringify(e0 && e0.b)})`);
  check(e0 && e0.b[1][2] === 99 && e0.b[1][3] === 7 && !/[<>]/.test(e0.b[1][4] || ''), `stacks and flags kept in range, the name safe (${JSON.stringify(e0 && e0.b[1])})`);
  check(e0 && e0.tp && !/[<>]/.test(JSON.stringify(e0.tp)) && Object.keys(e0.tp).join() === 'keen,long' && e0.tp.long.length <= 360, `tooltip text cleaned and capped (${JSON.stringify(e0 && e0.tp).slice(0, 120)})`);
  check(evil[1] && evil[1].b.length === 24, 'a long list is cut');
  const cold = tab(); await cold.join(host.room, 'Cold'); await sleep(20);
  let coldHeard = 0; b.on('pbf', () => { coldHeard++; });
  cold.send({ t: 'pbf', b: [['keen', 5, 1, 0]] });   // (no hero chosen yet)
  await sleep(40);
  check(coldHeard === 0, 'a player with no hero is not relayed');

  // ------------------------------------------------------------ 5. the host-fed statuses: the row's order, the icons and text the own row uses
  const party = { alive: true, dd: 7, vuln: 20, mit: 30, weak: [10, 8], debuffs: [['slowed', 4, 1], ['bleed', 6, 3]], hots: [['petal', 5, 2], ['rejuv', 9, 1]] };
  const hr = PartyBuffs.hostRow({ now: 10, id: 3, pbuffs: [{ kind: 'dmg', end: 20 }, { kind: 'dmg', end: 22 }, { kind: 'haste', end: 15 }], abuffs: [{ id: Object.keys(C.ALLY_BUFFS)[0], to: 3, end: 18, from: 1 }, { id: Object.keys(C.ALLY_BUFFS)[0], to: 4, end: 18, from: 1 }], s: party, bond: [] });
  const order = hr.map(x => x.id).join(' ');
  check(order === `p-dmg p-haste a-${Object.keys(C.ALLY_BUFFS)[0]} dd vuln mit weak d-slowed d-bleed h-petal h-rejuv`, `hostRow order and dedupe (${order})`);
  check(hr.find(x => x.id === 'h-petal').from === 2 && hr.find(x => x.id === 'd-bleed').stacks === 3, 'hostRow keeps who cast a heal over time and the stack count');
  check(!PartyBuffs.hostRow({ now: 10, id: 3, s: { alive: false, mit: 20 } }).some(x => x.id === 'mit'), 'a fallen hero shows no mitigation');
  const rd = { pbf: store, pbuffs: [], abuffs: [], bond: null };
  const comp = PartyBuffs.compose(rd, 2, 'ranger', 3, now, party), cids = comp.map(x => x.id);
  check(new Set(cids).size === cids.length, `a composed row has no id twice (${cids})`);
  const first = comp.find(x => x.id === 'dd');
  check(first && PartyBuffs.tipHtml(first) === '<b>Damage Down</b><em>7s</em>Dealing 10% less damage.', `a host status tip reads like the own row's (${first && PartyBuffs.tipHtml(first)})`);
  const icon = C.buffIconHtml('ranger', hr.find(x => x.id === 'h-petal'));
  check(/background-image:url\([^)]*cleric[^)]*petal/.test(icon), `a heal over time wears the healer's art (${icon})`);
  check(/bf-icon g/.test(C.buffIconHtml('ranger', hr.find(x => x.id === 'd-bleed'))) && /bf-icon g/.test(C.buffIconHtml('ranger', { id: 'fx-charm', name: 'Charm' })), 'statuses and item effects wear the status glyphs');

}

main().then(() => {
  if (probs.length) { console.log('Party buffs FAILED:\n  ' + [...new Set(probs)].slice(0, 30).join('\n  ')); process.exit(1); }
  console.log('Party buffs OK: a frame matches its hero\'s own buff row (ids, order, stacks, timers, tooltips) for people over the net and for bots; the item effects; the host-fed statuses once each; a rejoiner restored; hostile messages cleaned; the message rate modest');
  process.exit(0);
}).catch(e => { console.log('Party buffs FAILED: threw ' + (e && e.stack || e)); process.exit(1); });
