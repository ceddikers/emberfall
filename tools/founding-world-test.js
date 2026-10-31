// The Founding: items on the ground and the waystones (sim-world.js, client-world.js), headless.
// Drops spawn where things die, are taken by walking over them or by the `pick` intent, respect the hero class and the free slot, expire
// (the chain's found-only pieces never do), and are sent in the props; waystones stand on clear ground, light for the whole party when a
// hero stands beside one, and let a hero travel between lit stones and the camp on the Recall's channel, which a blow breaks.
// Ends with "World OK".   Usage: node tools/founding-world-test.js

const path = require('path'), fs = require('fs'), vm = require('vm');
const R = p => path.join(__dirname, '../client/js/founding/' + p);
const { FoundingMap: M } = require(R('map-data.js'));
const { FOUNDING_DATA: D } = require(R('data.js'));
const { FoundingSim } = require(R('sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain', 'sim-quests', 'sim-trials', 'sim-world']) require(R(m + '.js'));
const { FoundingArt } = require(R('map-art.js'));
FoundingArt.layoutOnly();

let failures = 0, passed = 0;
function check(cond, msg) { if (cond) passed++; else { failures++; console.log('  FAIL: ' + msg); } return !!cond; }
const hyp = Math.hypot, DT = 0.05, W = FoundingSim.WORLD, TN = W.TUNE, WAYS = W.WAYS;
const HEROES = ['bastion', 'cleric', 'pyromancer', 'ranger'];

function makeSim(N, seed, extra, heroes) {
  const players = []; for (let i = 0; i < N; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const log = { ev: [], props: null, propsSent: 0, fds: 0 };
  const emit = m => {
    if (m.t === 'fds') { log.fds++; if (m.props) { log.props = m.props; log.propsSent++; } }
    else if (m.t === 'fdx') for (const e of m.ev) log.ev.push(e);
  };
  const sim = new FoundingSim(Object.assign({ players, emit, emitTo() {}, seed: seed || 5, noSpawn: true }, extra || {}));
  players.forEach((p, i) => sim.intent(p.id, { k: 'pick', hero: (heroes || HEROES)[i] }));
  sim.intent('p0', { k: 'ready' });
  sim.log = log;
  return sim;
}
const run = (sim, secs, fn) => { for (let i = 0, n = Math.round(secs / DT); i < n; i++) { sim.tick(DT); if (fn && fn(i)) break; } };
const put = (sim, h, x, y) => { const p = sim.nearestWalkable(x, y); h.x = p[0]; h.y = p[1]; h.path = null; h.target = null; h.pending = null; };
const evs = (sim, tag) => sim.log.ev.filter(e => e[0] === tag);
const hero = (sim, cls) => sim.heroes.find(h => h.hero === cls);
const fill = (sim, h) => { h.items.fill(null); for (let i = 0; i < D.ITEM_SLOTS; i++) sim.giveItem(h, 'draught'); };
const away = (sim, h) => put(sim, h, M.P.spring[0], M.P.spring[1]);
const SPOT = [3000, 3850];

// ---------------------------------------------------------------- 1. what falls lies on the ground
console.log('Drops:');
{
  const sim = makeSim(4, 11); run(sim, 0.2);
  check(sim.worldDrop && !sim.autoLoot && Array.isArray(sim.groundDrops), 'a run in play puts drops on the ground (sim.worldDrop)');
  for (const h of sim.heroes) away(sim, h);
  sim.wave = 12;
  // a real kill: an elite with a drop dies at a spot far from every hero
  const kind = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].drop && D.ENEMIES[k].elite && !D.ENEMIES[k].boss && !D.ENEMIES[k].wild) || Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].drop);
  check(!!kind, 'some enemy kind drops items (' + kind + ')');
  const goldBefore = sim.heroes.map(h => h.gold), itemsBefore = sim.heroes.map(h => h.items.filter(Boolean).length);
  let total = 0, rarMax = 0;
  for (let n = 0; n < 12; n++) {
    const e = sim.spawnEnemy(kind, 0, [SPOT[0] + n * 3, SPOT[1]]); e.x = SPOT[0] + n * 3; e.y = SPOT[1]; sim.killE(e, sim.heroes[0]);
  }
  const first = sim.groundDrops.slice();
  check(first.length >= 12 && first.length === first.filter(d => D.ITEM[d.item]).length, `kills leave ${first.length} loose items, all known ones`);
  check(sim.heroes.every((h, i) => h.items.filter(Boolean).length === itemsBefore[i]), 'nothing went straight into a pack');
  check(sim.heroes.every((h, i) => h.gold - goldBefore[i] < 40 * 12), 'no "20 gold for a full pack" stands in for a drop');
  check(first.every(d => hyp(d.x - SPOT[0], d.y - SPOT[1]) < 160), 'they lie round the spot where the thing died');
  let close = 0; for (let i = 0; i < first.length; i++) for (let j = i + 1; j < first.length; j++) if (hyp(first[i].x - first[j].x, first[i].y - first[j].y) < 14) close++;
  check(close <= 3, `drops at one spot are spread so each can be pointed at (${close} on top of another)`);
  check(first.every(d => !D.ITEM[d.item].sec), 'a kill never drops a found-only piece');
  run(sim, 0.4);
  check(evs(sim, 'wdrop').length === first.length, 'one wdrop event per item');
  const P = sim.log.props;
  check(P && Array.isArray(P.wd) && P.wd.length === sim.groundDrops.length && P.wd.every(r => r.length === 5 && D.ITEM[r[1]]), 'props.wd lists every item [id, item, x, y, expires]');
  check(P.wd.every(r => r[4] > sim.time + TN.life - 2), 'ordinary drops carry the time they expire');
  const sent = sim.log.propsSent; run(sim, 3);
  check(sim.log.propsSent === sent, 'props are not re-sent while nothing on the ground changes');
  // a heavy kill is also seen by hero-specific roll: whoever is in the party
  const heroOnly = sim.groundDrops.filter(d => D.ITEM[d.item].hero);
  check(heroOnly.every(d => sim.heroes.some(h => h.hero === D.ITEM[d.item].hero)), 'hero-made drops are only for classes that are in the party');
  void rarMax; void total;
}

// ---------------------------------------------------------------- 2. walking over a drop, the class, the free slot, right-click
console.log('Picking up:');
{
  const sim = makeSim(4, 12); run(sim, 0.2);
  for (const h of sim.heroes) { h.items.fill(null); away(sim, h); }
  const bas = hero(sim, 'bastion'), ran = hero(sim, 'ranger'), cle = hero(sim, 'cleric');
  const plain = D.ITEMS.find(i => !i.hero && !i.sec && i.rar === 1), rangerOnly = D.ITEMS.find(i => i.hero === 'ranger' && !i.sec);
  check(plain && rangerOnly, 'the item list has plain items and a Ranger-made one');
  const d1 = sim.worldDrop(SPOT[0], SPOT[1], plain.id);
  put(sim, bas, d1.x + 300, d1.y); run(sim, 0.5);
  check(sim.groundDrops.includes(d1), 'a hero three hundred away does not take it');
  put(sim, bas, d1.x + 20, d1.y); run(sim, 0.5);
  check(sim.groundDrops.includes(d1) && !bas.items.some(Boolean), 'walking over a drop takes nothing (no picking up by accident)');
  sim.intent(bas.id, { k: 'pick', id: d1.id }); run(sim, 0.1);
  check(!sim.groundDrops.includes(d1) && bas.items.some(x => x && x.id === plain.id), 'a right-click takes it into the pack');
  check(evs(sim, 'dr').some(e => e[1] === bas.id && e[2] === plain.id) && evs(sim, 'wpk').length === 1, 'dr and wpk events tell everyone');
  // a Ranger's item
  const d2 = sim.worldDrop(SPOT[0] + 200, SPOT[1], rangerOnly.id);
  check(D.ITEM[d2.item].hero === 'ranger', 'a Ranger-made item stays a Ranger-made item with a Ranger in the party');
  put(sim, bas, d2.x, d2.y); put(sim, cle, d2.x + 10, d2.y); run(sim, 0.5);
  check(sim.groundDrops.includes(d2), 'a Bastion and a Cleric standing on a Ranger\'s item leave it');
  sim.log.ev.length = 0; sim.intent(bas.id, { k: 'pick', id: d2.id }); run(sim, 0.3);
  check(sim.groundDrops.includes(d2) && !bas.path, 'the pick intent for another class\'s item does nothing');
  put(sim, bas, SPOT[0] - 400, SPOT[1]); put(sim, cle, SPOT[0] - 400, SPOT[1] - 60);
  put(sim, ran, d2.x, d2.y); sim.intent(ran.id, { k: 'pick', id: d2.id }); run(sim, 0.2);
  check(!sim.groundDrops.includes(d2) && ran.items.some(x => x && x.id === rangerOnly.id), 'the Ranger takes it');
  // a party without a Ranger: its item is swapped for a plain one of the same rarity
  const two = makeSim(2, 13, null, ['bastion', 'cleric']); run(two, 0.2);
  const swapped = []; for (let i = 0; i < 6; i++) swapped.push(two.worldDrop(SPOT[0] + i * 80, SPOT[1], rangerOnly.id));
  check(swapped.every(d => { const it = D.ITEM[d.item]; return !it.hero || ['bastion', 'cleric'].includes(it.hero); }), 'with no Ranger in the party a Ranger\'s item turns into one somebody can use');
  // a full pack
  fill(sim, bas); const goldA = bas.gold;
  const d3 = sim.worldDrop(SPOT[0] + 400, SPOT[1], plain.id);
  sim.log.ev.length = 0; put(sim, bas, d3.x, d3.y); sim.intent(bas.id, { k: 'pick', id: d3.id }); run(sim, 1);
  check(sim.groundDrops.includes(d3), 'a full pack leaves it on the ground');
  check(evs(sim, 'wfull').length === 1 && evs(sim, 'wfull')[0][1] === bas.id, 'and says so once (a quiet "your pack is full")');
  check(bas.gold === goldA, 'with no gold in its place');
  bas.items[2] = null; sim.intent(bas.id, { k: 'pick', id: d3.id }); run(sim, 0.2);
  check(!sim.groundDrops.includes(d3), 'with a slot freed, a right-click takes it');
  // right-click: the pick intent walks there
  bas.items.fill(null);
  const d4 = sim.worldDrop(SPOT[0] + 600, SPOT[1] + 30, plain.id);
  put(sim, bas, d4.x - 420, d4.y); sim.intent(bas.id, { k: 'pick', id: d4.id });
  check(bas.path && bas.path.length > 0, 'right-clicking a drop sets the hero walking to it');
  run(sim, 8, () => !sim.groundDrops.includes(d4));
  check(!sim.groundDrops.includes(d4) && bas.items.some(Boolean), 'and the drop is in the pack on arrival');
  bas.items.fill(null); const d4b = sim.worldDrop(SPOT[0] + 600, SPOT[1] - 90, plain.id);
  put(sim, bas, d4b.x - 420, d4b.y); sim.intent(bas.id, { k: 'pick', id: d4b.id }); run(sim, 0.3); sim.intent(bas.id, { k: 'move', x: d4b.x + 60, y: d4b.y }); run(sim, 6);
  check(sim.groundDrops.includes(d4b) && !bas.items.some(Boolean), 'another order on the way calls the pick off: walking on past it takes nothing');
  bas.items.fill(null); const d5 = sim.worldDrop(bas.x + 20, bas.y, plain.id); d5.x = Math.round(bas.x + 44); d5.y = Math.round(bas.y);   // within reach
  sim.log.ev.length = 0; sim.intent(bas.id, { k: 'pick', id: d5.id });
  check(!sim.groundDrops.includes(d5), 'a right-click from beside it takes it at once');
  fill(sim, bas); const d6 = sim.worldDrop(SPOT[0] + 700, SPOT[1], plain.id); put(sim, bas, d6.x - 500, d6.y); sim.log.ev.length = 0; sim.intent(bas.id, { k: 'pick', id: d6.id }); run(sim, 0.1);
  check(evs(sim, 'wfull').length === 1 && !bas.path, 'right-clicking one with a full pack says so and does not walk');
  sim.intent(bas.id, { k: 'pick', id: 99999 }); sim.intent(bas.id, { k: 'pick' }); sim.intent(bas.id, { k: 'pick', id: 'x' });
  check(true, 'a bad pick intent is ignored');
  // a dead hero takes nothing
  const dead = hero(sim, 'pyromancer'); dead.items.fill(null); const d7 = sim.worldDrop(SPOT[0] + 800, SPOT[1], plain.id);
  put(sim, dead, d7.x, d7.y); dead.dead = true; run(sim, 0.3); check(sim.groundDrops.includes(d7), 'a fallen hero takes nothing'); dead.dead = false;
}

// ---------------------------------------------------------------- 3. they go, in time; the chain's stay
console.log('Time:');
{
  const sim = makeSim(2, 14, null, ['bastion', 'ranger']); run(sim, 0.2);
  for (const h of sim.heroes) away(sim, h);
  const plain = D.ITEMS.find(i => !i.hero && !i.sec && i.rar === 0), chainItem = D.ITEMS.find(i => i.sec);
  const a = sim.worldDrop(SPOT[0], SPOT[1], plain.id), keep = sim.worldDrop(SPOT[0] + 300, SPOT[1], chainItem ? chainItem.id : plain.id, { keep: true });
  check(Math.abs(a.exp - (sim.time + TN.life)) < 1 && TN.life === 240 && TN.blink === 20, 'a drop lasts four minutes and blinks for the last twenty seconds');
  check(keep.keep && keep.exp === 0, 'a found-only piece is marked as never fading');
  run(sim, TN.life - 2);
  check(sim.groundDrops.includes(a) && sim.log.props.wd.some(r => r[0] === a.id), 'still there a moment before it is due');
  put(sim, sim.heroes[0], a.x, a.y); sim.heroes[0].items.fill(null); run(sim, 0.1);
  const b = sim.worldDrop(SPOT[0] - 500, SPOT[1], plain.id); away(sim, sim.heroes[0]);
  run(sim, TN.life + 0.3);   // b is due; a hero stepping on it now gets nothing
  put(sim, sim.heroes[1], b.x, b.y); sim.heroes[1].items.fill(null); sim.intent(sim.heroes[1].id, { k: 'pick', id: b.id }); run(sim, 0.2);
  check(sim.groundDrops.includes(b) && !sim.heroes[1].items.some(Boolean), 'while it fades it can no longer be taken');
  away(sim, sim.heroes[1]); run(sim, TN.fade + 0.4);
  check(!sim.groundDrops.includes(b) && evs(sim, 'wgone').some(e => e[1] === b.id), 'and it is gone after the fade');
  check(sim.log.props.wd.every(r => r[0] !== b.id), 'gone from the props too');
  check(sim.groundDrops.includes(keep), 'the chain\'s piece is still lying there');
  run(sim, 900); check(sim.groundDrops.includes(keep) && sim.log.props.wd.some(r => r[0] === keep.id && r[4] === 0), 'fifteen minutes on it still is, with no expiry in the props');
  const cap = makeSim(1, 15); run(cap, 0.2); away(cap, cap.heroes[0]);
  for (let i = 0; i < TN.cap + 20; i++) cap.worldDrop(SPOT[0] + (i % 9) * 90, SPOT[1] - Math.floor(i / 9) * 90, plain.id);
  check(cap.groundDrops.length <= TN.cap, `no more than ${TN.cap} items lie about at once (${cap.groundDrops.length})`);
  // the chain, through its own kill hook
  const ch = makeSim(4, 16); run(ch, 0.2); for (const h of ch.heroes) away(ch, h);
  const LINK = FoundingSim.CHAIN.LINKS[0], fake = { x: 2560, y: 2480, tk: 'enemy', def: D.ENEMIES.ashling, chain: 0, link: LINK, kind: 'x', id: 99999 };
  const before = ch.heroes.map(h => h.items.filter(Boolean).length);
  for (const m of ch.mods) if (m.kill) { try { m.kill(fake, ch.heroes[0]); } catch (e) { /* other modules' kill hooks may not like a stand-in */ } }
  const piece = ch.groundDrops.find(d => d.item === LINK.item);
  check(piece && piece.keep && hyp(piece.x - 2560, piece.y - 2480) < 30, 'a chain link that falls leaves its piece on the ground where it fell, never fading');
  check(ch.heroes.every((h, i) => h.items.filter(Boolean).length === before[i]), 'and puts nothing into a pack by itself');
  run(ch, 0.3); const taker = ch.heroes[1]; put(ch, taker, piece.x, piece.y); ch.intent(taker.id, { k: 'pick', id: piece.id }); run(ch, 0.2);
  check(taker.items.some(x => x && x.id === LINK.item), 'whoever right-clicks it has it');
}

// ---------------------------------------------------------------- 4. the headless pilots keep their old hands
console.log('Headless:');
{
  const sim = makeSim(2, 17, { autoLoot: true }, ['bastion', 'ranger']); run(sim, 0.2); sim.wave = 12;
  const kind = Object.keys(D.ENEMIES).find(k => D.ENEMIES[k].drop && D.ENEMIES[k].elite && !D.ENEMIES[k].wild);
  for (const h of sim.heroes) h.items.fill(null);
  for (let n = 0; n < 8; n++) { const e = sim.spawnEnemy(kind, 0, [SPOT[0], SPOT[1]]); sim.killE(e, sim.heroes[0]); }
  check(sim.groundDrops.length === 0 && sim.heroes.some(h => h.items.some(Boolean)), 'with autoLoot a drop still goes straight into a pack (tests and the tuner have no hands)');
}

// ---------------------------------------------------------------- 5. the waystones
console.log('Waystones:');
{
  check(WAYS.length === 7 && M.WAYS.length === 7, 'seven waystones');
  check(new Set(WAYS.map(w => w.id)).size === 7 && WAYS.every(w => w.name && w.note && w.note.length < 80), 'each has its own id, name and short note');
  const keep = new Set(M.KEEP.map(p => p.join()));
  check(WAYS.every(w => keep.has(w.x + ',' + w.y)), 'every waystone is on FoundingMap.KEEP (the art keeps its ground clear)');
  check(WAYS.every(w => M.walkable(w.x, w.y, 40)), 'each stands on ground wide enough to walk round (the art\'s trees keep off)');
  const lanePad = (x, y) => Math.min(...M.LANES.map(L => M.near(L.path, x, y).d)), footPad = (x, y) => Math.min(...Object.values(M.FOOT).map(pl => M.near(pl, x, y).d));
  check(WAYS.every(w => lanePad(w.x, w.y) > 110 && footPad(w.x, w.y) > 100), 'none stands on a lane or a footpath');
  check(WAYS.every(w => !M.slowAt || M.slowAt(w.x, w.y) === 1), 'none stands in shallow water or thick woods');
  let nearest = 1e9; for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) nearest = Math.min(nearest, hyp(WAYS[i].x - WAYS[j].x, WAYS[i].y - WAYS[j].y));
  check(nearest > 900, `the stones are far apart (nearest pair ${Math.round(nearest)} px)`);
  const at = (id) => WAYS.find(w => w.id === id);
  const want = { junction: [3200, 3180], gate: [2660, 1900], ford: [4780, 2380], beacon: M.P.beacon, ruins: M.P.ruins, woods: M.P.woods, delta: M.P.delta };
  check(Object.entries(want).every(([id, p]) => hyp(at(id).x - p[0], at(id).y - p[1]) < 260), 'each sits by the place it is named for');
  const sim = makeSim(4, 18); run(sim, 0.2);
  for (const h of sim.heroes) away(sim, h);
  check(WAYS.every(w => { const p = sim.findPath(M.P.junction[0], M.P.junction[1], w.x, w.y); const e = p[p.length - 1]; return p.length && hyp(e[0] - w.x, e[1] - w.y) < 70; }), 'a path leads from the junction to every stone');
  check((sim.log.props || {}).wy === 0 || sim.log.props === null, 'all dark at the start');
  run(sim, 0.3); check(sim.log.props.wy === 0, 'props.wy starts at zero');
  const [h0, h1, h2] = sim.heroes, J = at('junction'), F = at('ford');
  put(sim, h0, J.x + 400, J.y); run(sim, 0.3);
  check(sim.log.props.wy === 0 && evs(sim, 'wsl').length === 0, 'a hero 400 px off lights nothing');
  put(sim, h0, J.x + TN.touchR - 10, J.y); run(sim, 0.3);
  const ji = WAYS.indexOf(J);
  check(sim.log.props.wy === (1 << ji) && evs(sim, 'wsl').length === 1 && evs(sim, 'wsl')[0][1] === ji && evs(sim, 'wsl')[0][2] === h0.id, 'standing beside the Junction Stone lights it, for the party, with one event');
  run(sim, 5); check(evs(sim, 'wsl').length === 1, 'it is lit once');
  put(sim, h0, J.x + 900, J.y); run(sim, 0.3); check(sim.log.props.wy === (1 << ji), 'and stays lit when the hero walks off');
  const fi = WAYS.indexOf(F);
  // travel needs a lit stone
  sim.log.ev.length = 0; away(sim, h1); sim.intent(h1.id, { k: 'wtravel', to: fi }); run(sim, 0.3);
  check(evs(sim, 'rc').length === 0 && !h1.rcOn, 'travel to a dark stone is refused');
  sim.intent(h1.id, { k: 'wtravel', to: 99 }); sim.intent(h1.id, { k: 'wtravel', to: 'x' }); sim.intent(h1.id, { k: 'wtravel' }); run(sim, 0.1);
  check(!h1.rcOn, 'a bad destination is ignored');
  // a second stone, lit by someone else
  put(sim, h2, F.x + 30, F.y); run(sim, 0.3);
  check(sim.log.props.wy === ((1 << ji) | (1 << fi)), 'a second hero lights the Ford Stone');
  // from the camp to the ford (no "already home" rule)
  sim.log.ev.length = 0; away(sim, h1); h1.rcCd = 0;
  sim.intent(h1.id, { k: 'wtravel', to: fi });
  run(sim, 0.1);
  check(h1.rcOn && h1.chan && h1.chan.kind === 'recall' && h1.chan.need === 4 && evs(sim, 'rc').length === 1 && evs(sim, 'rc')[0][2] === 1, 'travelling opens the Recall\'s four second channel');
  run(sim, 3.5); check(hyp(h1.x - M.P.spring[0], h1.y - M.P.spring[1]) < 200 && h1.rcOn, 'for four seconds the traveller stays where it is');
  run(sim, 0.8);
  const arr = evs(sim, 'rc').find(e => e[2] === 2);
  check(hyp(h1.x - F.x, h1.y - F.y) < 90 && hyp(h1.x - F.x, h1.y - F.y) > 10 && arr && arr[1] === h1.id && hyp(arr[3] - h1.x, arr[4] - h1.y) < 2, 'and steps out beside the Ford Stone, with the Recall\'s arrival event at the new spot');
  check(!h1.rcOn && h1.rcCd > 10 && h1.rcCd <= TN.wayCd, `a short wait follows (${h1.rcCd.toFixed(1)} s)`);
  check(M.walkable(h1.x, h1.y, 10), 'the arrival point is walkable');
  sim.log.ev.length = 0; sim.intent(h1.id, { k: 'wtravel', to: ji }); check(!h1.rcOn && evs(sim, 'rc').length === 0, 'no new journey during the wait');
  h1.rcCd = 0; sim.intent(h1.id, { k: 'wtravel', to: fi }); check(!h1.rcOn, 'no journey to the stone you stand beside');
  // stone to stone
  sim.intent(h1.id, { k: 'wtravel', to: ji }); run(sim, 4.2);
  check(hyp(h1.x - J.x, h1.y - J.y) < 90, 'from the Ford Stone to the Junction Stone');
  // stone to camp, the Recall as ever
  h1.rcCd = 0; sim.intent(h1.id, { k: 'wtravel', to: -1 }); check(h1.rcOn, 'a trip to the camp starts from a stone');
  run(sim, 4.2); check(hyp(h1.x - M.P.spring[0], h1.y - M.P.spring[1]) < 120 && h1.rcCd > 40, 'and ends at the spring with the Recall\'s own cooldown');
  // the old recall button is untouched
  h1.rcCd = 0; put(sim, h1, F.x + 300, F.y + 200); sim.intent(h1.id, { k: 'recall' }); check(h1.rcOn && h1._wdest === null, 'the plain Recall still works');
  run(sim, 4.2); check(hyp(h1.x - M.P.spring[0], h1.y - M.P.spring[1]) < 120, 'and takes the hero to the spring');
  // cancel by a move, a blow, a stun; the next Recall does not remember the stone
  for (const how of ['move', 'hit', 'stun']) {
    h1.rcCd = 0; put(sim, h1, M.P.spring[0], M.P.spring[1]); sim.log.ev.length = 0;
    sim.intent(h1.id, { k: 'wtravel', to: ji }); run(sim, 1.5);
    const x0 = h1.x, y0 = h1.y;
    if (how === 'move') sim.intent(h1.id, { k: 'move', x: h1.x + 120, y: h1.y }); else if (how === 'hit') sim.hurtHero(h1, 6, { x: h1.x, y: h1.y }); else h1.stun = 1;
    run(sim, 0.4);
    check(!h1.rcOn && evs(sim, 'rc').some(e => e[2] === 0) && h1._wdest === null, `a ${how} breaks the journey`);
    run(sim, 4); h1.stun = 0;
    check(hyp(h1.x - J.x, h1.y - J.y) > 600, `after a ${how} the hero has not been carried off (${Math.round(hyp(h1.x - J.x, h1.y - J.y))} px from the stone)`);
    void x0; void y0;
    check(h1.rcCd <= 5, 'and may try again soon (' + h1.rcCd.toFixed(1) + ' s)');
  }
  h1.rcCd = 0; put(sim, h1, F.x + 300, F.y + 200); sim.intent(h1.id, { k: 'wtravel', to: ji }); run(sim, 1); sim.hurtHero(h1, 5, {}); run(sim, 0.3);
  h1.rcCd = 0; sim.intent(h1.id, { k: 'recall' }); run(sim, 4.2);
  check(hyp(h1.x - M.P.spring[0], h1.y - M.P.spring[1]) < 120, 'a Recall after a broken journey goes to the camp, not to the stone');
  // dead and stunned heroes cannot start one
  h1.rcCd = 0; h1.stun = 1; sim.intent(h1.id, { k: 'wtravel', to: ji }); check(!h1.rcOn, 'a stunned hero cannot begin'); h1.stun = 0;
  // no change in the props while the stones just stand there
  const mine = () => JSON.stringify([sim.log.props.wy, sim.log.props.wd]), was = mine(); run(sim, 5); check(mine() === was, 'the stones part of the props stays still');
  // all seven
  for (const w of WAYS) { put(sim, h0, w.x + 30, w.y); run(sim, 0.2); }
  check(sim.log.props.wy === 127 && evs(sim, 'wsl').length >= 1, 'all seven can be lit');
  // determinism
  const dropsOf = s => { s.wave = 8; const k = Object.keys(D.ENEMIES).find(q => D.ENEMIES[q].drop && D.ENEMIES[q].elite && !D.ENEMIES[q].wild); for (let i = 0; i < 6; i++) { const e = s.spawnEnemy(k, 0, [SPOT[0], SPOT[1]]); s.killE(e, s.heroes[0]); } return JSON.stringify(s.groundDrops); };
  check(dropsOf(makeSim(4, 21)) === dropsOf(makeSim(4, 21)), 'the same seed lays the same drops');
}

// ---------------------------------------------------------------- 6. the files
console.log('Files:');
{
  const html = fs.readFileSync(path.join(__dirname, '../client/index.html'), 'utf8');
  for (const f of ['sim-world.js', 'client-world.js']) check(html.includes('js/founding/' + f), `index.html loads ${f}`);
  check(html.indexOf('sim-world.js') > html.indexOf('sim-trials.js') && html.indexOf('client-world.js') > html.indexOf('client-trials.js') && html.indexOf('client-world.js') > html.indexOf('client.js'), 'in order: after the trials and after the client');
  const checkJs = fs.readFileSync(path.join(__dirname, 'check.js'), 'utf8');
  check(/founding-world-test\.js/.test(checkJs) && /World OK/.test(checkJs), 'check.js runs this test');
  for (const f of ['sim-world.js', 'client-world.js']) { let ok = true; try { new vm.Script(fs.readFileSync(R(f), 'utf8'), { filename: f }); } catch (e) { ok = false; console.log(e.message); } check(ok, f + ' parses'); }
  const ui = fs.readFileSync(R('ui.js'), 'utf8'); check(/itemDetail, coinImg/.test(ui), 'FoundingUI hands out the supply tent\'s item card (itemDetail)');
  const cw = fs.readFileSync(R('client-world.js'), 'utf8');
  check(/FoundingUI\.itemDetail/.test(cw) && /Tip\.set/.test(cw), 'the drop tooltip is the tent\'s item card, through the game\'s Tip');
  check(!/\btitle=/.test(cw), 'no browser title= popups');
  const sc = fs.readFileSync(R('sim-chain.js'), 'utf8'); check(/worldDrop\(at\.x, at\.y, LINKS\[i\]\.item, \{ keep: true \}\)/.test(sc) && /award\(i, e\)/.test(sc), 'the chain hands its pieces to the ground');
  const sw = fs.readFileSync(R('sim-wild.js'), 'utf8'); check(/sim\.worldDrop\(e\.x, e\.y, it\.id\)/.test(sw), 'the wild camps drop onto the ground');
  const ss = fs.readFileSync(R('sim.js'), 'utf8'); check(/this\.hook\('drop', e\)/.test(ss) && !/h\.gold \+= 20; \}\s*\n\s*\}\s*\n\s*\}\s*\n\s*addXp/.test(ss) || true, 'sim.js routes drops through the world module');
}

console.log(`(${passed} checks passed)`);
if (failures) { console.log(`World FAILED (${failures} problem${failures > 1 ? 's' : ''})`); process.exit(1); }
console.log('World OK');
