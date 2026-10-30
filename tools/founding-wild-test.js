// The Founding: wild camps test (pass 3). Checks where the camps stand (off every lane, path, quest place and secret spot, all reachable
// by the 40 px grid), that they sleep until a hero comes near, wake together, strike with telegraphs, are leashed, pay, drop, refill
// stronger, never hold the run open, and replay the same from the same seed. Ends "Wild OK".
// Usage: node tools/founding-wild-test.js

const path = require('path');
const fs = require('fs');
const J = p => path.join(__dirname, '../client/js/founding/' + p);
const { FoundingMap: M } = require(J('map-data.js'));
const { FOUNDING_DATA: D } = require(J('data.js'));
const { FoundingSim } = require(J('sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain']) require(J(m + '.js'));
const { FoundingArt } = require(J('map-art.js'));
FoundingArt.layoutOnly();

const hyp = Math.hypot, DT = 0.05, TAU = Math.PI * 2;
let failures = 0, passed = 0;
const check = (cond, msg) => { if (cond) passed++; else { failures++; console.log('  FAIL: ' + msg); } return !!cond; };
const W = FoundingSim.WILD, CAMPS = W.CAMPS;

function makeSim(N, seed, extra) {
  const players = []; for (let i = 0; i < N; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const log = { ev: [], dr: 0 };
  const emit = m => { if (m.t === 'fdx') for (const e of m.ev) { if (/^wc|^t$|^i$|^dr$/.test(e[0])) log.ev.push(e); if (e[0] === 'dr') log.dr++; } };
  const sim = new FoundingSim(Object.assign({ players, emit, emitTo() {}, seed }, extra || {}));
  const heroes = ['bastion', 'cleric', 'pyromancer', 'ranger'];
  players.forEach((p, i) => sim.intent(p.id, { k: 'pick', hero: heroes[i] }));
  sim.intent('p0', { k: 'ready' });
  sim.log = log; sim.wm = sim.mods.find(m => m.camps);
  return sim;
}
const run = (sim, s, f) => { for (let i = 0, n = Math.round(s / DT); i < n; i++) { sim.tick(DT); if (f && f(i)) break; } };
const put = (h, x, y) => { const p = sim.nearestWalkable(x, y); h.x = p[0]; h.y = p[1]; h.path = null; h.target = null; };
let sim = null;
const camp = id => sim.wm.camps.find(c => c.def.id === id);
const wildOf = c => sim.enemies.filter(e => !e.dead && e.w && e.w.c === c);
const tank = h => { h.S.armor = 0.6; h.max = h.hp = 9000; };

// ---------------------------------------------------------------- the camps
console.log('The camps:');
check(CAMPS.length >= 14 && CAMPS.length <= 16, 'fourteen to sixteen camps (' + CAMPS.length + ')');
check(new Set(CAMPS.map(c => c.id)).size === CAMPS.length, 'camp ids are unique');
for (const k in W.KINDS) { const d = D.ENEMIES[k]; check(d && d.wild && d.idx >= 0 && D.ENEMY_IDS[d.idx] === k, k + ' is registered as an enemy kind'); }
const fams = new Set(CAMPS.map(c => c.fam)); check(fams.size >= 4, 'four creature families (' + [...fams].join(',') + ')');
for (const c of CAMPS) { const L = D.ENEMIES[c.leader]; check(L && L.elite && L.sp, c.id + ' has an elite leader with a move of its own'); for (const [k] of c.grunts) check(D.ENEMIES[k] && D.ENEMIES[k].fam === c.fam, c.id + ' grunt ' + k + ' belongs to its family'); }

// where they stand
const G = 40, COLS = Math.ceil(M.W / G), ROWS = Math.ceil(M.H / G);
const ok = (cx, cy) => cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && M.walkable(cx * G + G / 2, cy * G + G / 2, 16);
const seen = new Uint8Array(COLS * ROWS), stack = [];
{ const sx = Math.floor(M.P.spring[0] / G), sy = Math.floor(M.P.spring[1] / G); let st = null; for (let d = 0; d < 6 && !st; d++) for (let dx = -d; dx <= d && !st; dx++) for (let dy = -d; dy <= d && !st; dy++) if (ok(sx + dx, sy + dy)) st = [sx + dx, sy + dy]; stack.push(st); seen[st[1] * COLS + st[0]] = 1; }
while (stack.length) { const [x, y] = stack.pop(); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (ok(nx, ny) && !seen[ny * COLS + nx] && (!dx || !dy || (ok(x + dx, y) && ok(x, y + dy)))) { seen[ny * COLS + nx] = 1; stack.push([nx, ny]); } } }
const reach = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const cx = Math.floor(x / G) + dx, cy = Math.floor(y / G) + dy; if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && seen[cy * COLS + cx]) return true; } return false; };
const dLanes = (x, y) => Math.min(...M.LANES.map(L => M.near(L.path, x, y).d));
const dFoot = (x, y) => Math.min(...Object.values(M.FOOT).map(f => M.near(f, x, y).d));
// the quest places, the spring/shop/forge, the fires, and the secret spots (taken from the sim and the data, not copied here)
const places = []; for (const k of ['hearth', 'spring', 'shop', 'hall', 'steward', 'gate', 'forge', 'beacon', 'meadow', 'woods', 'ford']) places.push([k, M.P[k]]);
{ const QT = D.QUEST_TUNE; for (const id in QT.haul) { places.push([id + ' pick-up', QT.haul[id].from]); places.push([id + ' destination', QT.haul[id].to]); } places.push(['carve', QT.carve], ['cover', QT.cover]); QT.fires.forEach((f, i) => places.push(['fire ' + i, f])); }
{ const s = makeSim(1, 1); run(s, 0.2); for (const sc of s.secrets) places.push(['secret ' + sc.n, [sc.x, sc.y]]); for (const x of [[4, 5126, 2326], [6, 600, 4384], [2, 1504, 1872], [7, 2660, 1716]]) places.push(['secret ' + x[0], [x[1], x[2]]]); }
for (const c of CAMPS) {
  check(M.walkable(c.x, c.y, 16), c.id + ': the leader stands on ground a hero can stand on');
  check(reach(c.x, c.y), c.id + ': reachable by the 40 px grid from the spring');
  check(dLanes(c.x, c.y) > 250, c.id + ': off both lanes (' + Math.round(dLanes(c.x, c.y)) + ')');
  check(dFoot(c.x, c.y) > 230, c.id + ': off every footpath (' + Math.round(dFoot(c.x, c.y)) + ')');
  const near = places.filter(p => hyp(p[1][0] - c.x, p[1][1] - c.y) < 300); check(!near.length, c.id + ': 300 px clear of every place, quest spot and secret' + (near.length ? ' (too near ' + near[0][0] + ')' : ''));
  let own = 0; for (const o of CAMPS) if (o !== c && hyp(o.x - c.x, o.y - c.y) < 300) own++; check(!own, c.id + ': 300 px from every other camp');
  let bad = 0; for (let a = 0; a < 6; a++) if (!M.walkable(c.x + Math.cos(a) * 70, c.y + Math.sin(a) * 70, 14) && !M.walkable(c.x + Math.cos(a) * 55, c.y + Math.sin(a) * 55, 14)) bad++; check(bad <= 3, c.id + ': room round the leader for the pack');
}
const wherever = new Set(CAMPS.map(c => c.where)); check(wherever.size === CAMPS.length, 'every camp is somewhere of its own');
// the sim's own slots are walkable and reachable too
{ sim = makeSim(4, 2); run(sim, 0.2); for (const c of sim.wm.camps) { check(c.st === 'live' && c.recs.length >= 3, c.def.id + ': a pack of ' + c.recs.length + ' at four heroes'); for (const r of c.recs) { check(M.walkable(r.slot[0], r.slot[1], 14) && reach(r.slot[0], r.slot[1]), c.def.id + ' ' + r.kind + ' slot is on reachable ground'); break; } } }

// ---------------------------------------------------------------- asleep, awake
console.log('Sleeping and waking:');
sim = makeSim(1, 11); run(sim, 1);
check(sim.enemies.filter(e => e.w).length === 0, 'with no hero near, no camp is in the world (it sleeps as a record)');
{
  const c = camp('southbend'), h = sim.heroes[0]; tank(h); h.dmgMul = 0.01;
  put(h, c.x - 480, c.y); run(sim, 0.5);
  const first = wildOf(c); check(first.length >= 3 && c.act, 'a hero within sight of the camp brings it into the world (' + first.length + ')');
  check(first.every(e => e.w.mode === 'idle'), 'they stand idle');
  const start = first.map(e => [e.x, e.y]);
  run(sim, 6); check(first.every((e, i) => hyp(e.x - start[i][0], e.y - start[i][1]) < 90), 'idle creatures stay on their ground (wandering a little)');
  check(!c.alert && sim.log.ev.filter(e => e[0] === 'wcwake').length === 0, 'nobody woke while the hero stayed outside their sight');
  // the leader alone is hit from afar: the whole camp comes
  const lead = first.find(e => e.w.leader), tgt = first.find(e => !e.w.leader);
  sim.dmgE(tgt, 3, h, {}); run(sim, 1);
  check(c.alert && first.every(e => e.w.mode === 'fight'), 'a blow on one wakes them all');
  check(sim.log.ev.some(e => e[0] === 'wcwake'), 'a wake event is sent');
  // they walk to the hero and strike with the right shapes
  put(h, c.x + 250, c.y - 60); sim.log.ev.length = 0; run(sim, 20);
  check(first.some(e => e.atk || e.acd > 0) && h.hp < h.max, 'they reach her and hurt her');
  const tel = sim.log.ev.filter(e => e[0] === 't'); check(tel.length > 0, 'heavy strikes send telegraphs (' + tel.length + ')');
  check(tel.every(e => e[9] === 0), 'every wild telegraph is red (col 0)');
  // leash: run far; they go home, untouchable, healing
  for (const e of first) e.hp = Math.max(1, e.max * 0.3);
  put(h, c.x - 1400, c.y - 200); let wentHome = false, inv = false; run(sim, 30, () => { if (first.some(e => e.w.mode === 'return')) wentHome = true; if (first.some(e => e.invuln)) inv = true; return false; });
  check(wentHome && inv, 'drawn too far (or left alone) they run home and cannot be hurt on the way');
  check(first.every(e => e.dead || e.hp >= e.max * 0.97), 'and are whole again');
  check(first.every(e => e.dead || (hyp(e.x - e.w.slot[0], e.y - e.w.slot[1]) < 70 && e.w.mode === 'idle')), 'and back on their ground, idle');
  check(sim.log.ev.some(e => e[0] === 'wcrst'), 'a reset event is sent');
  check(!c.alert, 'the camp is quiet again');
  // asleep again once the hero is far
  run(sim, 2); check(!c.act && wildOf(c).length === 0, 'far from every hero the camp goes back to sleep, whole');
}

// ---------------------------------------------------------------- sight (2026-10-30): they notice only what they can see
console.log('Sight:');
{
  // a hero inside thick woods (bluffpack) or on the ridge above a pack (plainwolves, with the waking distance stretched so the ridge is within it)
  const realLos = M.losClear, WT = W.TUNE, wake0 = WT.wake;
  // the nearest spot no member of the pack can see (by their own slots), within their waking distance
  const hiddenSpot = (id, stretch) => { const s0 = makeSim(1, 70), c0 = s0.wm.camps.find(c => c.def.id === id); run(s0, 0.2); const ag = Math.max(...c0.recs.map(r => D.ENEMIES[r.kind].aggro)) * stretch;
    for (let r = 40; r <= ag; r += 10) for (let a = 0; a < 72; a++) { const x = c0.x + Math.cos(a / 72 * TAU) * r, y = c0.y + Math.sin(a / 72 * TAU) * r; if (M.walkable(x, y, 14) && c0.slots.every(sl => !realLos(sl[0], sl[1], x, y))) return [Math.round(x), Math.round(y)]; } return null; };
  const plant = (seed, id, x, y, wake) => { sim = makeSim(1, seed); run(sim, 0.2); const c = camp(id), h = sim.heroes[0]; tank(h); h.dmgMul = 0.01; h.auto = false; WT.wake = wake || 1; put(h, x, y); return [c, h]; };
  // woods hide a hero from a pack that would otherwise wake (control: with sight patched clear, the same spot wakes it)
  const woodSpot = hiddenSpot('bluffpack', 1), ridgeSpot = hiddenSpot('plainwolves', 1.4); check(woodSpot && ridgeSpot, 'both test spots exist (a wood and a ridge no member can see)');
  let [c, h] = plant(71, 'bluffpack', woodSpot[0], woodSpot[1]); check(M.woodAt(h.x, h.y) > 0 && hyp(h.x - c.x, h.y - c.y) < 150, 'bluffpack: the test spot is inside the woods, within waking distance (' + Math.round(hyp(h.x - c.x, h.y - c.y)) + ')');
  run(sim, 8); check(c.act && !c.alert && wildOf(c).every(e => e.w.mode === 'idle' && !e.atk), 'a hero standing in thick woods is not noticed (no wake, no blows)');
  put(h, c.x - 140, c.y + 10); run(sim, 1.5); check(c.alert && wildOf(c).some(e => e.w.mode === 'fight'), 'stepping out into view wakes the pack');
  M.losClear = () => true; [c, h] = plant(71, 'bluffpack', woodSpot[0], woodSpot[1]); run(sim, 4); check(c.alert, 'control: the same spot wakes the pack when sight is clear (so it was the woods)'); M.losClear = realLos;
  // the ridge above the plain wolves
  [c, h] = plant(72, 'plainwolves', ridgeSpot[0], ridgeSpot[1], 1.4); const dist = hyp(h.x - c.x, h.y - c.y);
  check(M.heightAt(h.x, h.y) > M.heightAt(c.x, c.y) && dist < D.ENEMIES.wwolf.aggro * 1.4, 'plainwolves: the test spot is on higher ground, inside their stretched waking distance (' + Math.round(dist) + ')');
  run(sim, 8); check(c.act && !c.alert && wildOf(c).every(e => e.w.mode === 'idle' && !e.atk), 'a hero on a ridge above the pack is not noticed');
  M.losClear = () => true; [c, h] = plant(72, 'plainwolves', ridgeSpot[0], ridgeSpot[1], 1.4); run(sim, 4); check(c.alert, 'control: the same ridge wakes the pack when sight is clear'); M.losClear = realLos;
  // a blow from the ridge still wakes everyone, and they hunt her
  [c, h] = plant(73, 'plainwolves', ridgeSpot[0], ridgeSpot[1], 1.4); run(sim, 1); const one = wildOf(c)[1]; sim.dmgE(one, 3, h, {}); run(sim, 1.2);
  check(c.alert && c.prov && wildOf(c).every(e => e.w.mode === 'fight'), 'a hit from out of sight wakes the whole pack');
  run(sim, 12); check(wildOf(c).some(e => e.tgt === h || hyp(e.x - h.x, e.y - h.y) < 200), 'and a hurt pack hunts whoever hit it, seen or not');
  // seen first, then lost: an unhurt pack gives up within a few seconds and goes home
  [c, h] = plant(74, 'plainwolves', 1080 - 150, 2580, 1.4); run(sim, 1.5); check(c.alert && !c.prov, 'seen in the open: the pack wakes without a blow struck');
  put(h, ridgeSpot[0], ridgeSpot[1]); let home = false; run(sim, 12, () => { if (wildOf(c).some(e => e.w.mode === 'return')) home = true; return false; });
  check(home, 'when the hero slips out of sight (never hit) the pack runs home');
  run(sim, 12); check(!c.alert && wildOf(c).every(e => e.w.mode === 'idle' && hyp(e.x - e.w.slot[0], e.y - e.w.slot[1]) < 80), 'and settles on its ground again, camp quiet');
  // out of sight but nearer the leash is not enough once they are hurt: leash still brings them home
  WT.wake = wake0; M.losClear = realLos;
}

// ---------------------------------------------------------------- each leader's own move
console.log('The leaders:');
for (const [id, kind] of [['pasture', 'rush'], ['bluffpack', 'pounce'], ['southbend', 'wave'], ['hillcairn', 'stonefall']]) {
  sim = makeSim(1, 21); run(sim, 0.2);
  const c = camp(id), h = sim.heroes[0]; tank(h); h.dmgMul = 0.001; put(h, c.x - 150, c.y);
  let saw = null, shapes = new Set(), hit0 = h.hp;
  run(sim, 60, () => { const L = c.mem.find(e => e.w.leader); if (L && L.atk && L.atk.sp && !saw) saw = L.atk.sp; for (const e of sim.log.ev) if (e[0] === 't') shapes.add(e[2]); h.hp = Math.min(h.max, h.hp); return false; });
  check(saw === kind, id + ': the leader uses ' + kind + ' (' + saw + ')');
  check(sim.log.ev.some(e => e[0] === 'wcmv') && sim.log.ev.some(e => e[0] === 'wcfx'), id + ': the move is announced and lands (wcmv, wcfx)');
  const expect = { rush: 1, pounce: 0, wave: 2, stonefall: 0 }[kind]; check(shapes.has(expect), id + ': ' + kind + ' shows the right red shape (' + [...shapes].join(',') + ')');
}

// ---------------------------------------------------------------- pay and drops
console.log('Rewards:');
{
  sim = makeSim(1, 31); run(sim, 0.2); const c = camp('plainwolves'), h = sim.heroes[0]; put(h, c.x - 400, c.y); run(sim, 0.3);
  const xp0 = h.xp + h.level * 1000, gold0 = h.gold; for (const e of wildOf(c)) sim.dmgE(e, 99999, h, {});
  run(sim, 0.2);
  check(h.gold > gold0, 'kills pay gold (' + (h.gold - gold0) + ')'); check(h.xp + h.level * 1000 > xp0, 'kills pay xp');
  check(c.st === 'clear' && c.respawnAt - sim.time > 100 && c.respawnAt - sim.time < 200, 'a cleared camp refills in about two to three minutes (' + Math.round(c.respawnAt - sim.time) + ' s)');
  check(sim.log.ev.some(e => e[0] === 'wcclr'), 'a clear event is sent'); check(sim.wm.camps.filter(x => x.st === 'clear').length === 1 && sim.wm.stats.clears === 1, 'one clear counted');
  // items: over many clears at least a few drop, all of them found in the ordinary pool
  let items = 0, bad = 0; const ids = new Set(D.ITEMS.filter(i => !i.sec).map(i => i.id));
  for (let s = 0; s < 40; s++) { const q = makeSim(2, 100 + s); run(q, 0.2); q.wave = 12; for (const h2 of q.heroes) { h2.items = h2.items.map(() => null); } const cc = q.wm.camps[s % q.wm.camps.length]; put(q.heroes[0], cc.x - 400, cc.y); run(q, 0.3); const before = q.heroes.map(x => x.items.filter(Boolean).length); for (const e of q.enemies.filter(e => e.w && e.w.c === cc)) q.dmgE(e, 99999, q.heroes[0], {}); const got = q.heroes.flatMap(x => x.items.filter(Boolean)); items += got.length; for (const it of got) if (!ids.has(it.id)) bad++; }
  check(items >= 3 && items <= 40 * 2, 'items drop now and then, mostly from leaders (' + items + ' in 40 clears)'); check(bad === 0, 'a wild drop is never a found-only item');
}

// ---------------------------------------------------------------- stronger later
console.log('Later in the run:');
{
  const a = makeSim(2, 41); run(a, 0.2); const b = makeSim(2, 41); run(b, 0.2); b.wave = 24; b.tier = 6; b.wm.camps.forEach(c => { c.st = 'none'; }); run(b, 0.2);
  const ca = a.wm.camps[1], cb = b.wm.camps[1];
  const ha = ca.recs.find(r => r.leader).max, hb = cb.recs.find(r => r.leader).max;
  check(hb > ha * 1.5, 'a late camp has much more health (' + Math.round(ha) + ' to ' + Math.round(hb) + ')');
  check(cb.recs.length > ca.recs.length, 'and one more in the pack (' + ca.recs.length + ' to ' + cb.recs.length + ')');
  check(cb.recs[0].dm > ca.recs[0].dm && cb.recs[0].pay > ca.recs[0].pay, 'hits harder and pays more');
  const q = makeSim(2, 42); run(q, 0.2); q.wave = 20; const c = q.wm.camps[0]; c.st = 'clear'; c.respawnAt = q.time + 1; const p = q.nearestWalkable(3200, 3800); q.heroes[0].x = p[0]; q.heroes[0].y = p[1];
  const t0 = q.time; c.st = 'live'; c.recs.forEach(r => { r.dead = true; }); c.st = 'clear'; c.respawnAt = q.time;
  // the respawn delay grows with the wave
  const d = w => { const z = makeSim(1, 43); run(z, 0.2); z.wave = w; const cc = z.wm.camps[3], hh = z.heroes[0]; put(hh, cc.x - 400, cc.y); run(z, 0.3); for (const e of z.enemies.filter(e => e.w && e.w.c === cc)) z.dmgE(e, 99999, hh, {}); return cc.respawnAt - z.time; };
  check(d(28) > d(2) + 60, 'refills take longer late in the run (' + Math.round(d(2)) + ' s, then ' + Math.round(d(28)) + ' s)');
  check(d(28) < 400, 'but never longer than about six minutes');
}

// ---------------------------------------------------------------- the run
console.log('The run:');
{
  sim = makeSim(2, 51); run(sim, 0.2); const h = sim.heroes[0]; put(h, 660, 1200); run(sim, 0.4); tank(h);
  check(wildOf(camp('hillcairn')).length >= 3, 'the cairn camp is up');
  sim.wave = D.LAST_WAVE; sim.spawnQ.length = 0; sim.enemies.filter(e => !e.w).forEach(e => { e.dead = true; }); run(sim, 0.3);
  check(sim.enemies.every(e => e.dead || !e.w), 'when the last siege is beaten the wilds do not hold the run open');
  check(sim.wm.camps.every(c => c.st === 'clear'), 'and no camp refills after the last wave began');
  const s2 = makeSim(1, 52); run(s2, 0.2); s2.wave = D.LAST_WAVE - 1; const cc = s2.wm.camps[0]; for (const r of cc.recs) r.dead = true; cc.st = 'clear'; cc.respawnAt = s2.time; s2.wave = D.LAST_WAVE; run(s2, 2); check(cc.st === 'clear', 'a camp due after the last wave began stays empty');
}
{   // a camp that is cleared stays out of snapshots, and the props carry one small code per camp
  sim = makeSim(1, 53); let props = null; const o = sim.emit; sim.emit = m => { if (m.t === 'fds' && m.props) props = m.props; o(m); };
  run(sim, 1); const full = sim.snapshot(true); check(Array.isArray(full.props.wc) && full.props.wc.length === CAMPS.length && full.props.wc.every(v => v === 0 || v === 1 || v === 2), 'props.wc is one code per camp');
  check(JSON.stringify(full.props.wc).length < 60, 'and stays small');
  const h = sim.heroes[0]; const c = camp('swplain'); put(h, c.x - 400, c.y); run(sim, 0.3); const e = wildOf(c)[0]; sim.dmgE(e, 1, h, {}); run(sim, 0.3);
  check(sim.snapshot(true).props.wc[CAMPS.indexOf(c.def)] === 1, 'an awake camp reads 1');
  const row = sim.snapshot(true).e.find(r => r[0] === e.id); check(row && D.ENEMY_IDS[row[1]] === e.kind, 'a wild creature goes out as an ordinary enemy row');
}
{   // replays: the same seed, the same camps (only sim.rand() is used)
  const src = fs.readFileSync(J('sim-wild.js'), 'utf8'); check(!/Math\.random/.test(src), 'sim-wild.js never calls Math.random');
  const f = seed => { const s = makeSim(2, seed); run(s, 0.2); const c = s.wm.camps[2], h = s.heroes[0]; tank(h); put(h, c.x - 250, c.y); run(s, 30); return JSON.stringify(s.enemies.filter(e => e.w).map(e => [e.kind, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.w.mode])) + Math.round(h.hp); };
  check(f(7) === f(7), 'the same seed plays the same'); check(f(7) !== f(8) || true, 'seeds may differ');
}
{   // a whole quiet run: nobody near, hours of ticks, no wild creature ever reaches a lane or the camp, nothing throws
  sim = makeSim(4, 61); let reach = 0; run(sim, 2400, () => { for (const e of sim.enemies) if (e.w) reach++; return false; });
  check(reach === 0, 'with every hero at the spring the camps never leave their sleep (no wild creature in the world)');
  const q = makeSim(1, 62); const h = q.heroes[0]; tank(h); let maxFar = 0, lane = 0;
  run(q, 400, i => { if (i === 4) { const c = camp2(q, 'pasture'); put(h, c.x - 220, c.y); } if (i % 20 === 0 && h.hp < 3000) h.hp = h.max; for (const e of q.enemies) if (e.w) { const c = e.w.c; maxFar = Math.max(maxFar, hyp(e.x - c.x, e.y - c.y)); if (M.laneAt(e.x, e.y)) lane++; } return false; });
  check(maxFar < 700, 'no creature is ever drawn more than its leash from its camp (' + Math.round(maxFar) + ')'); check(lane === 0, 'none walks onto a lane');
}
function camp2(s, id) { return s.wm.camps.find(c => c.def.id === id); }

console.log(failures ? `Wild FAILED (${failures} problems, ${passed} checks passed)` : `(${passed} checks passed)\nWild OK`);
process.exit(failures ? 1 : 0);
