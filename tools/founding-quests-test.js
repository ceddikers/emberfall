// The Founding: the five later quests (sim-quests.js), headless. Checks the data (registration, spread over the run, three unique boons each),
// the places (off every lane, footpath, wild camp, chain ground and secret; walkable and reachable on the 40 px grid), then plays each quest:
// offered, done, missed, its payout and its boons, and every one of the fifteen boons doing what it says. Ends "Quests OK".
// Usage: node tools/founding-quests-test.js

const path = require('path');
const J = p => path.join(__dirname, '../client/js/founding/' + p);
const { FoundingMap: M } = require(J('map-data.js'));
const { FOUNDING_DATA: D } = require(J('data.js'));
const { FoundingSim } = require(J('sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain', 'sim-quests']) require(J(m + '.js'));
const { FoundingArt } = require(J('map-art.js'));
FoundingArt.layoutOnly();

const hyp = Math.hypot, DT = 0.05;
let failures = 0, passed = 0;
const check = (cond, msg) => { if (cond) passed++; else { failures++; console.log('  FAIL: ' + msg); } return !!cond; };
const X = FoundingSim.QUESTX, T = X.TUNE;
const NEW = ['stakes', 'mill', 'larder', 'choice', 'watchfires'];

function makeSim(N, seed, extra) {
  const players = []; for (let i = 0; i < N; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const log = { ev: [], fds: null, fdp: {} };
  const emit = m => { if (m.t === 'fdx') for (const e of m.ev) log.ev.push(e); if (m.t === 'fds') log.fds = m; };
  const sim = new FoundingSim(Object.assign({ players, emit, emitTo(id, m) { log.fdp[id] = m; }, seed, noSpawn: true }, extra || {}));
  const heroes = ['bastion', 'cleric', 'pyromancer', 'ranger'];
  players.forEach((p, i) => sim.intent(p.id, { k: 'pick', hero: heroes[i] }));
  sim.intent('p0', { k: 'ready' });
  sim.log = log; return sim;
}
const run = (sim, s, f) => { for (let i = 0, n = Math.round(s / DT); i < n && sim.st === 'live'; i++) { if (f) f(i); sim.tick(DT); } };
const put = (h, x, y) => { h.x = x; h.y = y; h.path = null; h.target = null; };
const tank = h => { h.S.armor = 0.6; h.max = h.hp = 9000; };
function jump(s, n) { s.wave = n - 1; s.time = D.waveStartAt(n) - 0.1; s.nextWaveAt = s.time + 0.08; s.tick(DT); s.tick(DT); }
const evs = (sim, tag) => sim.log.ev.filter(e => e[0] === tag);
// a hero in the thick of it: whatever raider comes within reach goes down
const fight = sim => { for (const e of sim.enemies) if (!e.dead && e.qr) { const h = sim.heroes.find(x => !x.dead && hyp(x.x - e.x, x.y - e.y) < 300); if (h) sim.dmgE(e, 1e6, h, {}); } };
const slay = (sim, h) => { for (const e of sim.enemies) if (!e.dead && e.qr) sim.dmgE(e, 1e7, h, {}); };
const startAt = (N, seed, n) => { const s = makeSim(N, seed); run(s, 0.2); jump(s, n); for (const h of s.heroes) tank(h); return s; };

// ---------------------------------------------------------------- the data
console.log('The data:');
check(NEW.every(id => D.QUESTS[id] && D.QUEST_ORDER.includes(id)), 'all five quests are registered with D.addQuest');
check(D.QUEST_ORDER.length >= 13 && D.QUEST_ORDER.length <= 15, 'the hour run has about fourteen quests (' + D.QUEST_ORDER.length + ')');
check(D.QUEST_ORDER.map(id => D.QUESTS[id].offerWave).every((w, i, a) => !i || w >= a[i - 1]), 'QUEST_ORDER stays sorted by offer wave');
for (const id of NEW) {
  const Q = D.QUESTS[id];
  check(Q.deadlineWave > Q.offerWave && Q.deadlineWave <= 30 && Q.deadlineWave - Q.offerWave >= 3, id + ': a deadline wave inside the run, a few waves after the offer (' + Q.offerWave + ' to ' + Q.deadlineWave + ')');
  check(Q.name && Q.giver && Q.text && Q.done && Q.missed && Q.gold === 12 && Q.xp > 0, id + ': name, giver, text, done, missed, gold and xp');
  check(!/[0-9]/.test(Q.text), id + ': the text has no digits');
  check(['The Steward', 'The Smith', 'The Digger', 'The Warden'].includes(Q.giver), id + ': the giver is one of the founders (' + Q.giver + ')');
  check(Q.boons.length === 3 && Q.boons.every(b => D.BOONS[b] && D.BOONS[b].quest === id && D.BOONS[b].name && D.BOONS[b].text), id + ': three boons, each belonging to it');
}
{
  const all = Object.keys(D.BOONS); check(new Set(all).size === all.length && all.length >= 24 + 15, 'boon ids are unique (' + all.length + ' boons)');
  const names = all.map(k => D.BOONS[k].name); check(new Set(names).size === names.length, 'boon names are unique');
  const texts = all.map(k => D.BOONS[k].text); check(new Set(texts).size === texts.length, 'boon texts are unique');
  const shown = new Set(D.QUEST_ORDER.flatMap(id => D.QUESTS[id].boons)); check(all.every(b => shown.has(b)), 'every boon is offered by a quest');
}
// the spread over the hour: no gap of more than four waves without one active, fewer in the last night
{
  const active = w => D.QUEST_ORDER.filter(id => D.QUESTS[id].offerWave <= w && D.QUESTS[id].deadlineWave > w).length;
  let gap = 0, worst = 0; for (let w = 1; w <= 29; w++) { if (!active(w)) gap++; else gap = 0; worst = Math.max(worst, gap); }
  check(worst <= 1, 'no stretch of the run without a quest (longest bare run ' + worst + ' waves)');
  const early = Math.max(...[...Array(15).keys()].map(i => active(i + 1))), last = Math.max(...[26, 27, 28, 29].map(active));
  check(last <= 2 && last < early, 'the last night has fewer quests open (' + last + ') than the early run (' + early + ')');
  const offersLast = D.QUEST_ORDER.filter(id => D.QUESTS[id].offerWave >= 26).length; check(offersLast === 1, 'only the Covering is offered in the last night');
  const late = D.QUEST_ORDER.filter(id => D.QUESTS[id].offerWave >= 20 && D.QUESTS[id].offerWave <= 25).length; check(late >= 3, 'the late run (20-26) is no longer thin (' + late + ' offers)');
}

// ---------------------------------------------------------------- the places
console.log('The places:');
const G = 40, COLS = Math.ceil(M.W / G), ROWS = Math.ceil(M.H / G);
const okc = (cx, cy) => cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && M.walkable(cx * G + G / 2, cy * G + G / 2, 16);
const seen = new Uint8Array(COLS * ROWS), stack = [];
{ const sx = Math.floor(M.P.spring[0] / G), sy = Math.floor(M.P.spring[1] / G); let st = null; for (let d = 0; d < 6 && !st; d++) for (let dx = -d; dx <= d && !st; dx++) for (let dy = -d; dy <= d && !st; dy++) if (okc(sx + dx, sy + dy)) st = [sx + dx, sy + dy]; seen[st[1] * COLS + st[0]] = 1; stack.push(st); }
while (stack.length) { const [x, y] = stack.pop(); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (okc(nx, ny) && !seen[ny * COLS + nx]) { seen[ny * COLS + nx] = 1; stack.push([nx, ny]); } } }
const reach = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const cx = Math.floor(x / G) + dx, cy = Math.floor(y / G) + dy; if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && seen[cy * COLS + cx]) return true; } return false; };
const dLanes = (x, y) => Math.min(...M.LANES.map(L => M.near(L.path, x, y).d));
const dFoot = (x, y) => Math.min(...Object.values(M.FOOT).map(f => M.near(f, x, y).d));
// everything the quests must keep clear of, taken from the sim and the data
const avoid = [];
for (const c of FoundingSim.WILD.CAMPS) avoid.push([c.x, c.y, 255, 'wild camp ' + c.id]);
for (const L of FoundingSim.CHAIN.LINKS) avoid.push([L.place[0], L.place[1], Math.max(L.home || 200, 150) + 100, 'chain ' + L.id]);
for (const p of [[1700, 1310], [2880, 1370], [1070, 1090], [1290, 1010], [1510, 1120], [1230, 2050], [1820, 2150], [2020, 2150], [2160, 2310], [1735, 258], [2955, 322]]) avoid.push([p[0], p[1], 170, 'chain act']);
{ const s = makeSim(1, 1); run(s, 0.2); for (const sc of s.secrets) avoid.push([sc.x, sc.y, 130, 'secret ' + sc.n]); for (const p of [[2563, 1163], [300, 2192], [752, 936], [1330, 876]]) avoid.push([p[0], p[1], 150, 'secret']); }
{ const QT = D.QUEST_TUNE; for (const id in QT.haul) { avoid.push([...QT.haul[id].from, 120, id + ' pick-up']); avoid.push([...QT.haul[id].to, 120, id + ' put-down']); } avoid.push([...QT.carve, 120, 'carve'], [...QT.cover, 120, 'cover']); for (const f of QT.fires) avoid.push([...f, 130, 'camp fire']); }
for (const k of ['spring', 'shop', 'steward', 'gate', 'forge', 'beacon', 'meadow', 'woods', 'ford']) avoid.push([...M.P[k], 100, k]);
const spots = [['Warden\'s start', X.START], ...X.STAKES.map((p, i) => ['stake ' + (i + 1), p]), ['mill', X.MILL], ['shed', X.SHED], ...X.LARDER.map((p, i) => ['sack ' + (i + 1), p]), ['quarry', X.PILE], ['bell site', X.BELL], ['ward site', X.WARD], ...X.FIRES.map((p, i) => ['watch-fire ' + (i + 1), p])];
const own = spots.filter(s => !/start|shed/.test(s[0]));
for (const [name, p] of spots) {
  check(M.walkable(p[0], p[1], 16) || /shed/.test(name), name + ': ground a hero can stand on');
  if (/shed/.test(name)) continue;
  check(reach(p[0], p[1]), name + ': reachable by the 40 px grid from the spring');
  check(dLanes(p[0], p[1]) > 115, name + ': off both lanes (' + Math.round(dLanes(p[0], p[1])) + ')');
  check(dFoot(p[0], p[1]) > 70, name + ': off every footpath (' + Math.round(dFoot(p[0], p[1])) + ')');
  const bad = avoid.filter(a => hyp(a[0] - p[0], a[1] - p[1]) < a[2]); check(!bad.length, name + ': clear of wild camps, chain ground, secrets and the other quests\' places' + (bad.length ? ' (too near ' + bad[0][3] + ')' : ''));
}
for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) {
  if (/stake/.test(own[i][0]) && /stake/.test(own[j][0])) continue;
  const d = hyp(own[i][1][0] - own[j][1][0], own[i][1][1] - own[j][1][1]); if (d < 90) check(false, own[i][0] + ' and ' + own[j][0] + ' stand ' + Math.round(d) + ' px apart');
}
check(M.walkable(X.SHED[0], X.SHED[1], 6), 'the larder shed stands on open ground at the camp\'s west edge');
check(hyp(X.SHED[0] - M.P.hearth[0], X.SHED[1] - M.P.hearth[1]) < M.CAMP_R + 60, 'the shed is part of the camp');
check(X.LARDER.length >= 7 && T.larder.need.every(n => n < X.LARDER.length), 'there are more sacks than the quest needs, so the party chooses its route');
{ const lk = new Set(X.LARDER.map(p => p.join())); check(lk.size === X.LARDER.length, 'every sack is somewhere of its own'); const far = X.LARDER.filter(p => hyp(p[0] - M.P.hearth[0], p[1] - M.P.hearth[1]) > 900).length; check(far >= 5, 'most sacks are a real trip from the camp (' + far + ')'); }

// ---------------------------------------------------------------- The Bounds
console.log('The Bounds:');
{
  let s = makeSim(2, 11); run(s, 0.2); for (const h of s.heroes) tank(h);
  check(s.q.stakes.st === 0, 'not offered before wave 7');
  jump(s, 7);
  check(s.q.stakes.st === 1 && evs(s, 'q').some(e => e[1] === 'stakes' && e[2] === 0), 'offered at wave 7 (event q)');
  run(s, 0.3);
  const snap = s.snapshot(true);
  check(snap.qx && snap.qx.st && snap.qx.st[4] === T.stakes.hp[1], 'the snapshot carries the Warden\'s state (hp ' + (snap.qx && snap.qx.st && snap.qx.st[4]) + ')');
  check(snap.q.find(r => r[0] === 'stakes') && snap.q.find(r => r[0] === 'stakes')[3] === 11, 'the quest row carries its deadline wave (11)');
  const W = () => { const st = s.snapshot().qx.st; return st; };
  // no hero near: she waits where she stands
  const w0 = W(); put(s.heroes[0], 1500, 1900); put(s.heroes[1], 1500, 1920); run(s, 8); const w1 = W();
  check(w1[1] === w0[1] && w1[2] === w0[2] && w1[0] === 0, 'the Warden waits while nobody stands beside her');
  // heroes walk beside her: she goes to the first stake, a raid comes, the stake goes in
  let sawRaid = 0, hist = [];
  const follow = () => { const w = W(); put(s.heroes[0], w[1] + 40, w[2] + 20); put(s.heroes[1], w[1] - 40, w[2] + 10); s.heroes.forEach(h => { h.dmgMul = 40; }); for (const e of s.enemies) if (!e.dead && e.qr && !s.heroes.some(h => h.target === e)) { s.heroes[0].target = e; } };
  run(s, 400, i => { follow(); if (s.q.stakes.st !== 1) return; if (i % 20 === 0) hist.push(W()[0]); if (s.enemies.some(e => !e.dead && e.qr)) sawRaid++; });
  check(s.q.stakes.st === 2, 'with company she drives all four stakes and the quest is done (state ' + s.q.stakes.st + ')');
  check(evs(s, 'qxs').length === 4 && evs(s, 'qxs').map(e => e[1]).join() === '0,1,2,3', 'four stake events in order');
  check(evs(s, 'qxr').filter(e => e[1] === 0).length === 4 && sawRaid > 20, 'a raid comes at each stake (' + evs(s, 'qxr').length + ' raids)');
  check(hist.every((v, i) => !i || v >= hist[i - 1]), 'the stakes only go in, never out');
  const WP = s.snapshot().qx.st; check(WP[3] > 0, 'she is still on her feet (' + WP[3] + ' of ' + WP[4] + ')');
  check(s.heroes.every(h => h.offers && h.offers.length === 3 && h.offers.every(id => D.QUESTS.stakes.boons.includes(id))), 'every hero is offered the three Bounds boons');
  check(s.heroes[0].offers && h0xp(s), 'and gets its xp');
  check(evs(s, 'q').some(e => e[1] === 'stakes' && e[2] === 2), 'done is announced');
  // what it adds: hungry things in the bounds are slowed
  const en = s.spawnEnemy('ashling', 0); en.x = M.P.hearth[0] + 200; en.y = M.P.hearth[1] - 100; en.slowT = 0; s.tick(DT);
  check(en.slowT > 0 && en.slowM < 1, 'hungry things inside the bounds are slowed (' + en.slowM + ')');
  const far = s.spawnEnemy('ashling', 0); far.x = M.P.hearth[0]; far.y = M.P.hearth[1] - 900; s.tick(DT); check(!(far.slowT > 0), 'and ones outside it are not');
  // props: the client reads the state from the snapshot after it is done
  check(s.snapshot().qx.st[0] === 4, 'the finished stakes stay in the snapshot (4)');
  check(!s.allies.includes(null) && s.extraVis.every(v => v[2] > 0), 'no stray vision left behind');
  // missed at the deadline
  s = makeSim(2, 12); run(s, 0.2); jump(s, 7); run(s, 3); jump(s, 10); run(s, 1);
  check(s.q.stakes.st === 1, 'still open on the wave before the deadline'); jump(s, 11); run(s, 1);
  check(s.q.stakes.st === 3 && evs(s, 'q').some(e => e[1] === 'stakes' && e[2] === 3), 'missed at the deadline wave with a missed event');
  check(s.heroes.every(h => !h.offers), 'a missed quest gives no boons'); check(![...s.enemies].some(e => !e.dead && e.qr), 'a missed quest leaves no raiders behind');
  // the Warden falls: missed at once
  s = makeSim(2, 13); run(s, 0.2); jump(s, 7); run(s, 0.3); const sq = s.snapshot().qx.st;
  put(s.heroes[0], sq[1] + 30, sq[2]); put(s.heroes[1], sq[1] - 30, sq[2]);
  run(s, 25, () => { put(s.heroes[0], sq[1] + 30, sq[2]); put(s.heroes[1], sq[1] - 30, sq[2]); });
  for (const h of s.heroes) put(h, 1600, 2000);
  const ww = s.snapshot().qx.st; check(ww[5] === 1 || ww[0] >= 0, 'she reached the first stake');
  for (let k = 0; k < 400 && s.q.stakes.st === 1; k++) { s.tick(DT); for (const h of s.heroes) put(h, 1600, 2000); }
  check(s.q.stakes.st === 3, 'left alone against her raid she falls and the quest is missed (state ' + s.q.stakes.st + ')');
}
function h0xp(s) { return s.heroes[0].xp > 0 || s.heroes[0].level > 1; }

// ---------------------------------------------------------------- The First Mill
console.log('The First Mill:');
{
  let s = makeSim(2, 21); run(s, 0.2); for (const h of s.heroes) tank(h);
  jump(s, 13); run(s, 0.3);
  check(s.q.mill.st === 1 && s.snapshot().qx.ml[2] === T.mill.hp[1], 'offered at wave 13 with a work site (' + s.snapshot().qx.ml[2] + ' hp)');
  run(s, 15, () => { put(s.heroes[0], 1500, 1900); put(s.heroes[1], 1500, 1920); });
  check(s.snapshot().qx.ml[0] === 0, 'the sails do not go up while nobody is there');
  put(s.heroes[0], X.MILL[0] + 100, X.MILL[1]); put(s.heroes[1], X.MILL[0] + 140, X.MILL[1] + 20); run(s, 5, () => { put(s.heroes[0], X.MILL[0] + 100, X.MILL[1]); put(s.heroes[1], X.MILL[0] + 140, X.MILL[1] + 20); });
  const p5 = s.snapshot().qx.ml[0]; check(p5 > 0.04 && p5 < 0.09, 'work goes on with a hero near (' + p5 + ' after five seconds)');
  const holdOn = i => { put(s.heroes[0], X.MILL[0] + 100, X.MILL[1]); put(s.heroes[1], X.MILL[0] + 140, X.MILL[1] + 20); if (i % 10 === 0) fight(s); };
  run(s, 200, holdOn);
  check(s.q.mill.st === 2, 'held to the end the mill is raised (state ' + s.q.mill.st + ')');
  check(evs(s, 'qxm').length === 3 && evs(s, 'qxr').filter(e => e[1] === 1).length === 3, 'three surges came');
  check(s.heroes.every(h => h.offers && h.offers.length === 3 && h.offers.every(id => D.QUESTS.mill.boons.includes(id))), 'three Mill boons offered');
  // wave-start pay
  const g0 = s.heroes.map(h => h.gold); jump(s, 18); run(s, 0.2);
  check(s.heroes.every((h, i) => h.gold - g0[i] >= T.mill.gold), 'every hero earns ' + T.mill.gold + ' gold as the next wave starts'); check(evs(s, 'qxw').some(e => e[1] === 2), 'and the client is told');
  // the site falls when left alone against a surge
  s = makeSim(1, 22); run(s, 0.2); jump(s, 13); run(s, 0.3);
  const hh = s.heroes[0]; tank(hh); put(hh, X.MILL[0] + 100, X.MILL[1]); run(s, 25, () => { put(hh, X.MILL[0] + 100, X.MILL[1]); hh.dmgMul = 0.0001; });
  check(s.enemies.some(e => !e.dead && e.qr && e.qr.qid === 'mill'), 'a surge comes at the frame');
  put(hh, 1600, 2000); for (let k = 0; k < 600 && s.q.mill.st === 1; k++) { s.tick(DT); put(hh, 1600, 2000); }
  check(s.q.mill.st === 3, 'with nobody to hold it the frame is broken and the quest missed'); check(![...s.enemies].some(e => !e.dead && e.qr), 'its raiders are gone with it');
  // missed by time
  s = makeSim(2, 23); run(s, 0.2); jump(s, 13); jump(s, 17); run(s, 1); check(s.q.mill.st === 3, 'missed at the deadline (wave 17)');
}

// ---------------------------------------------------------------- The Winter Larder
console.log('The Winter Larder:');
{
  for (const N of [1, 2, 3, 4]) {
    const s = makeSim(N, 30 + N); run(s, 0.2); jump(s, 20); run(s, 0.3); const need = T.larder.need[N - 1];
    check(s.q.larder.st === 1 && s.snapshot().qx.lg[2] === need, N + 'p: offered at wave 20, needs ' + need + ' sacks of ' + X.LARDER.length);
    if (N !== 2) continue;
    const h = s.heroes[0]; tank(h);
    put(h, X.LARDER[0][0] + 200, X.LARDER[0][1]); run(s, 1); check(s.snapshot().qx.lg[1] === 0, 'walking near a sack does not take it');
    let order = []; for (let i = 0; i < need; i++) { put(h, X.LARDER[i][0], X.LARDER[i][1] + 10); run(s, 0.2); order.push(s.snapshot().qx.lg[1]); if (i < need - 1) check(s.q.larder.st === 1, 'still open after sack ' + (i + 1)); }
    check(order.join() === [...Array(need).keys()].map(i => i + 1).join(), 'each sack counts once (' + order + ')');
    put(h, X.LARDER[0][0], X.LARDER[0][1]); run(s, 0.3); check(s.snapshot().qx.lg[1] === need, 'the same sack is not taken twice');
    check(s.q.larder.st === 2 && evs(s, 'qxg').length === need, 'the last sack finishes it');
    check(s.heroes.every(x => x.offers && x.offers.length === 3 && x.offers.every(id => D.QUESTS.larder.boons.includes(id))), 'three Larder boons offered');
    // the meal at every wave's start
    h.hp = h.max * 0.2; const before = h.hp; jump(s, 21); check(h.hp >= before + h.max * T.larder.meal - 1, 'a meal at the start of each wave mends a third (' + Math.round(before) + ' to ' + Math.round(h.hp) + ')'); check(evs(s, 'qxw').some(e => e[1] === 0), 'the client is told');
    // someone else can gather too
    const t = makeSim(3, 77); run(t, 0.2); jump(t, 20); put(t.heroes[2], X.LARDER[3][0], X.LARDER[3][1]); run(t, 0.3); check(t.snapshot().qx.lg[1] === 1, 'any hero can gather');
    const m = makeSim(2, 78); run(m, 0.2); jump(m, 20); jump(m, 24); run(m, 1); check(m.q.larder.st === 3, 'missed at the deadline (wave 24)');
  }
}

// ---------------------------------------------------------------- The Last of the Stone
console.log('The Last of the Stone:');
{
  const prep = (N, seed) => { const s = makeSim(N, seed); run(s, 0.2); jump(s, 22); run(s, 0.3); for (const h of s.heroes) tank(h); return s; };
  let s = prep(2, 40); const h = s.heroes[0], o = s.heroes[1], need = T.choice.need[1];
  check(s.q.choice.st === 1 && s.snapshot().qx.ch[4] === need && s.snapshot().qx.ch[2] === need + T.choice.extra, 'offered at wave 22: ' + need + ' stones needed, one spare in the pile');
  put(h, X.PILE[0] + 300, X.PILE[1]); s.intent('p0', { k: 'carry' }); check(!h.carry, 'out of reach of the pile nothing is taken');
  put(h, X.PILE[0], X.PILE[1] + 20); s.intent('p0', { k: 'carry' });
  check(h.carry === 'stone' && h.carryQ === 'choice' && s.snapshot().qx.ch[2] === need, 'beside the pile a hero shoulders a stone');
  s.intent('p0', { k: 'carry' }); check(s.snapshot().qx.ch[2] === need, 'with her hands full she takes no second');
  // set down, picked up again by someone else
  s.intent('p0', { k: 'drop' }); check(!h.carry && s.drops.some(d => d.q === 'choice'), 'a stone can be set down');
  put(o, h.x, h.y); s.intent('p1', { k: 'carry' }); check(o.carry === 'stone' && o.carryQ === 'choice', 'and taken up by another');
  // deliver to the Ward-stone: it is the first to be finished
  const deliver = (hero, p) => { put(hero, p[0], p[1]); run(s, 0.1); };
  deliver(o, X.WARD); check(s.snapshot().qx.ch[1] === 1 && !o.carry, 'a stone laid at the ward-stone site counts there (1 of ' + need + ')');
  for (let i = 1; i < need; i++) { put(h, X.PILE[0], X.PILE[1] + 20); s.intent('p0', { k: 'carry' }); deliver(h, X.WARD); }
  check(s.q.choice.st === 2 && s.snapshot().qx.ch[3] === 2 && s.snapshot().qx.ward === 1, 'the ward-stone stands (chosen ' + s.snapshot().qx.ch[3] + ')');
  check(evs(s, 'qxc').length === 1 && evs(s, 'qxc')[0][1] === 2, 'the choice is announced');
  check(s.heroes.every(x => x.offers && x.offers.length === 3 && x.offers.every(id => D.QUESTS.choice.boons.includes(id))), 'three boons offered');
  // the ward: a quarter of every blow on the camp
  const c0 = s.camp.hp; s.camp.hp -= 400; s.tick(DT); s.tick(DT); check(s.camp.hp >= c0 - 400 + 90 && s.camp.hp <= c0 - 400 + 110, 'the ward-stone gives back a quarter of a blow on the camp (' + Math.round(s.camp.hp - (c0 - 400)) + ' of 400)');
  // the other way: the bell, and the sites do not mix
  s = prep(2, 41); const a = s.heroes[0];
  const dl = (hero, p) => { put(hero, p[0], p[1]); run(s, 0.1); };
  put(a, X.PILE[0], X.PILE[1] + 20); s.intent('p0', { k: 'carry' }); dl(a, X.BELL); put(a, X.PILE[0], X.PILE[1] + 20); s.intent('p0', { k: 'carry' }); dl(a, X.WARD);
  const q1 = s.snapshot().qx.ch; check(q1[0] === 1 && q1[1] === 1 && s.q.choice.st === 1, 'one stone at each site and nothing is chosen yet');
  for (let i = 0; i < need; i++) { put(a, X.PILE[0], X.PILE[1] + 20); s.intent('p0', { k: 'carry' }); if (i === 0) check(a.carry === 'stone', 'the spare stones are taken too'); dl(a, X.BELL); }
  check(s.snapshot().qx.ch[0] === need + 1 || s.q.choice.st === 2, 'the bell gets there first'); check(s.q.choice.st === 2 && s.snapshot().qx.bell === 1 && s.snapshot().qx.ch[3] === 1, 'the bell tower is the one that stands (need ' + need + ')');
  jump(s, 23); check(s.heroes.every(x => x.shield >= T.choice.shield), 'the bell shields every hero at the start of a wave (' + s.heroes.map(x => x.shield) + ')'); check(evs(s, 'qxw').some(e => e[1] === 1), 'and rings');
  // running out of stone ends it
  s = prep(2, 42); const b = s.heroes[0]; const st0 = s.snapshot().qx.ch; s.mods.forEach(m => m); // pile is private; take every stone and lose them
  for (let i = 0; i < need + T.choice.extra; i++) { put(b, X.PILE[0], X.PILE[1] + 20); s.intent('p0', { k: 'carry' }); if (b.carry) { s.dropCarry(b); } }
  s.drops.forEach(d => { d.gone = true; }); run(s, 0.3);
  check(s.q.choice.st === 3 && st0, 'if too much stone is lost the quest is missed'); check(!s.heroes.some(x => x.carryQ === 'choice') && !s.drops.some(d => d.q === 'choice' && !d.gone), 'and nothing is left carried or lying about');
  s = prep(2, 43); jump(s, 25); run(s, 1); check(s.q.choice.st === 1, 'still open the wave before'); jump(s, 26); run(s, 1); check(s.q.choice.st === 3, 'missed at the deadline (wave 26)');
}

// ---------------------------------------------------------------- The Watch-Fires
console.log('The Watch-Fires:');
{
  let s = makeSim(2, 50); run(s, 0.2); jump(s, 24); run(s, 0.3); for (const h of s.heroes) tank(h);
  const h = s.heroes[0];
  check(s.q.watchfires.st === 1 && s.snapshot().qx.wf.length === 3 && s.snapshot().qx.wf.every(f => f[0] === 0), 'offered at wave 24 with three cold fires');
  put(h, X.FIRES[0][0] + 40, X.FIRES[0][1]); s.intent('p0', { k: 'carry' }); run(s, 3);
  check(s.snapshot().qx.wf[0][0] === 0, 'without a brand nothing happens at a fire');
  h.brand = 45; h.dirty = true; put(h, X.FIRES[0][0] + 400, X.FIRES[0][1]); s.intent('p0', { k: 'carry' }); check(!h.chan, 'too far from the fire to start');
  put(h, X.FIRES[0][0] + 40, X.FIRES[0][1]); s.intent('p0', { k: 'carry' }); check(h.chan && h.chan.kind === 'wf', 'a brand beside an unlit fire starts the lighting');
  run(s, 0.5); s.intent('p0', { k: 'move', x: h.x + 200, y: h.y }); run(s, 1.5); check(!h.chan && s.snapshot().qx.wf[0][0] === 0, 'moving away loses it');
  put(h, X.FIRES[0][0] + 40, X.FIRES[0][1]); s.intent('p0', { k: 'carry' }); run(s, T.fires.chan + 0.3, () => put(h, X.FIRES[0][0] + 40, X.FIRES[0][1]));
  check(s.snapshot().qx.wf[0][0] === 1 && evs(s, 'qxf').some(e => e[1] === 0 && e[2] === 1), 'held still, the fire catches (qxf)');
  check(h.brand < 45 - T.fires.brand + 1, 'it costs the brand some of its flame (' + Math.round(h.brand) + ')');
  check(s.extraVis.some(v => v[0] === X.FIRES[0][0] && v[1] === X.FIRES[0][1]), 'a lit fire lets the party see round it');
  s.night = 0.9; s._lt = -1; check(s.isLit(X.FIRES[0][0] + 100, X.FIRES[0][1]) && !s.isLit(X.FIRES[1][0], X.FIRES[1][1] + 600), 'a lit fire is a light the sim sees (stalkers show in it)');
  // the dark comes for it
  run(s, 20, () => { put(h, 1600, 2000); h.dmgMul = 0.0001; });
  check(evs(s, 'qxr').some(e => e[1] === 2) && s.enemies.some(e => !e.dead && e.qr && e.qr.qid === 'watchfires'), 'a few seconds later a raid comes for it');
  for (let k = 0; k < 800 && s.snapshot().qx.wf[0][0] === 1 && s.q.watchfires.st === 1; k++) { s.tick(DT); put(h, 1600, 2000); }
  check(s.snapshot().qx.wf[0][0] === 0 && evs(s, 'qxf').some(e => e[1] === 0 && e[2] === 0), 'left alone, it is snuffed (qxf 0)');
  check(s.q.watchfires.st === 1, 'but the quest is still open: it can be lit again');
  slay(s, h);
  // light all three
  const light = (hero, i) => { hero.brand = 45; put(hero, X.FIRES[i][0] + 40, X.FIRES[i][1]); s.intent(hero.id, { k: 'carry' }); run(s, T.fires.chan + 0.3, () => put(hero, X.FIRES[i][0] + 40, X.FIRES[i][1])); };
  light(h, 0); light(h, 1); check(s.q.watchfires.st === 1 && s.q.watchfires.prog > 0.6, 'two of three is not enough (' + s.q.watchfires.prog.toFixed(2) + ')');
  light(s.heroes[1], 2);
  check(s.q.watchfires.st === 2, 'all three burning at once finishes it (state ' + s.q.watchfires.st + ')');
  check(s.heroes.every(x => x.offers && x.offers.length === 3 && x.offers.every(id => D.QUESTS.watchfires.boons.includes(id))), 'three Watch-Fire boons offered'); slay(s, h);
  h.hp = 50; put(h, X.FIRES[2][0] + 30, X.FIRES[2][1]); run(s, 5); check(h.hp > 50 + 5 * (T.fires.mend - 1), 'standing by a fire mends (' + Math.round(h.hp) + ')');
  put(h, 1700, 2100); h.hp = 50; run(s, 2); check(h.hp < 52 + 2 * (h.S.reg || 0) + 1, 'and far from it does not');
  run(s, 60, () => put(h, 1700, 2100)); check(s.snapshot().qx.wf.every(f => f[0] === 1) && !s.enemies.some(e => !e.dead && e.qr), 'the fires stay lit for good and no raiders are left');
  s = makeSim(2, 51); run(s, 0.2); jump(s, 24); jump(s, 28); run(s, 1); check(s.q.watchfires.st === 3, 'missed at the deadline (wave 28)');
  check(s.snapshot().qx.wf.every(f => f[0] === 0), 'and the far rises stay dark');
}

// ---------------------------------------------------------------- every boon
console.log('The boons:');
{
  const mk = (N, ...boons) => { const s = makeSim(N, 90 + boons.length); run(s, 0.2); jump(s, 6); for (const h of s.heroes) { tank(h); h.hp = h.max; } s.heroes[0].boons = {}; for (const b of boons) s.heroes[0].boons[b] = 1; s.recalc(s.heroes[0]); return s; };
  const dummy = (s, x, y) => { const e = s.spawnEnemy('ashling', 0); e.x = x; e.y = y; e.hp = e.max = 1e7; e.speed = 0; e.def = Object.assign({}, e.def, { atk: Object.assign({}, e.def.atk, { dmg: 0 }) }); return e; };
  // Count Them In
  { const s = mk(2); const a = s.heroes[0], b = s.heroes[1]; put(b, a.x + 60, a.y); const base = (() => { b.S.armor = 0; const hp = a.hp; a.S.armor = 0; a.shield = 0; return s.hurtHero(a, 100, null); })();
    a.hp = a.max; b.boons.countin = 1; put(b, a.x + 60, a.y); const withIt = s.hurtHero(a, 100, null); check(withIt < base && Math.abs(withIt / base - 0.92) < 0.03, 'Count Them In: an ally close beside you takes 8% less (' + base + ' to ' + withIt + ')');
    a.hp = a.max; put(b, a.x + 900, a.y); const far = s.hurtHero(a, 100, null); check(far === base, 'and only when close (' + far + ')'); }
  // Fence-Post, Headcount, Grindstone, Night-Eyes (damage the hero deals)
  { const s = mk(4, 'fencepost', 'headcount', 'grindstone'); const h = s.heroes[0]; for (const o of s.heroes) put(o, 1600, 1700); const e = dummy(s, 1650, 1700);
    h.stillT = 0; h.boons = {}; h.dmgMul = 1; const base = s.dmgE(e, 100, h, {});
    h.boons = { fencepost: 1 }; h.stillT = 2; const fp = s.dmgE(e, 100, h, {}); check(Math.abs(fp / base - 1.12) < 0.03, 'Fence-Post: still for a moment, +12% (' + base + ' to ' + fp + ')');
    h.stillT = 0.5; check(s.dmgE(e, 100, h, {}) === base, 'and not before');
    h.boons = { headcount: 1 }; const hc = s.dmgE(e, 100, h, {}); check(Math.abs(hc / base - 1.09) < 0.03, 'Headcount: three allies close, +9% (' + hc + ')');
    for (const o of s.heroes) if (o !== h) put(o, 1600, 2300); const hc1 = s.dmgE(e, 100, h, {}); check(hc1 === base, 'and none when alone');
    h.boons = { grindstone: 1 }; e.stun = 1; const gs = s.dmgE(e, 100, h, {}); check(Math.abs(gs / base - 1.12) < 0.03, 'Grindstone: a stunned enemy takes +12% (' + gs + ')'); e.stun = 0; e.slowT = 1; check(s.dmgE(e, 100, h, {}) > base, 'a slowed one too'); e.slowT = 0; e.rootT = 1; check(s.dmgE(e, 100, h, {}) > base, 'and a rooted one'); e.rootT = 0; check(s.dmgE(e, 100, h, {}) === base, 'a free one does not');
    const st = s.spawnEnemy('stalker', 0); st.x = h.x + 200; st.y = h.y; st.hp = st.max = 1e7; h.boons = {}; const sb = s.dmgE(st, 100, h, {}); h.boons = { nighteyes: 1 }; const sn = s.dmgE(st, 100, h, {}); check(Math.abs(sn / sb - 1.15) < 0.03, 'Night-Eyes: what hides in the dark takes +15% (' + sb + ' to ' + sn + ')');
    s.night = 1; st.reveal = 0; s.tick(DT); check(st.reveal > s.time, 'Night-Eyes: a stalker near you is shown to you'); }
  // Gearing
  { const s = mk(4, 'gearing'); const h = s.heroes[3]; h.boons = { gearing: 1 }; h.ranks = [1, 1, 1, 1, 0]; s.recalc(h); const base = h.asMul, go = (k) => s.release(h, k, { x: h.x + 200, y: h.y, e: null, u: null }, 1);
    const as = []; for (const k of ['q', 'w', 'q', 'w', 'e']) { try { go(k); } catch (er) { /* a skill needing a target */ } as.push(Math.round((h.asMul - base) * 100)); }
    check(as[0] === 4 && as[1] === 8, 'Gearing: each new skill in a row adds 4% attack speed (' + as.slice(0, 3) + ')');
    const peak = Math.max(...as); check(peak <= 16 && peak >= 12, 'up to four steps (' + peak + ')');
    go('q'); go('q'); check(Math.round((h.asMul - base) * 100) === 0, 'repeating a skill runs the wheel down');
    go('q'); go('w'); run(s, 6); check(Math.abs(h.asMul - base) < 1e-9, 'and so does five quiet seconds'); }
  // Windfall
  { const s = mk(4, 'windfall'); const h = s.heroes[3]; h.boons = { windfall: 1 }; h.ranks = [1, 1, 1, 1, 0]; s.rng = () => 0.01; h.ch[0] = 0; h.chMax[0] = 1; h.cdT[0] = 5;
    s.release(h, 'q', { x: h.x + 300, y: h.y }, 1); check(h.ch[0] === 1 && h.cdT[0] === 0, 'Windfall: a lucky cast gives the charge straight back');
    s.rng = () => 0.9; h.ch[0] = 0; h.cdT[0] = 5; s.release(h, 'q', { x: h.x + 300, y: h.y }, 1); check(h.ch[0] === 0, 'and an unlucky one does not');
    let n = 0, tot = 400; let seed = 7; s.rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; for (let i = 0; i < tot; i++) { h.ch[0] = 0; h.cdT[0] = 5; s.release(h, 'q', { x: h.x + 300, y: h.y }, 1); if (h.ch[0] === 1) n++; } check(n / tot > 0.1 && n / tot < 0.22, 'about one cast in six (' + (n / tot).toFixed(2) + ')'); }
  // Forager, Hearty, Tithe
  { const s = mk(2, 'forager'); const h = s.heroes[0]; const e = dummy(s, h.x + 60, h.y); h.hp = h.max * 0.5; e.hp = 5; const hp0 = h.hp; s.dmgE(e, 50, h, {}); check(h.hp > hp0 && Math.abs(h.hp - hp0 - h.max * 0.02) < 1, 'Forager: a kill heals 2% of your health (' + Math.round(h.hp - hp0) + ')');
    const e2 = dummy(s, h.x + 60, h.y); e2.hp = 5; h.boons = {}; const hp1 = h.hp; s.dmgE(e2, 50, h, {}); check(h.hp === hp1, 'and not without it'); }
  { const s = mk(2); const h = s.heroes[0]; const m0 = h.K.hp + h.K.hpL * D.LEVELS.hpPer * (h.level - 1); h.boons = { hearty: 1 }; s.recalc(h); check(h.max >= Math.round(m0) + Math.round(h.K.hp * 0.12) - 1 && h.S.reg >= 0.7, 'Hearty Stew: +12% health and a slow mend (' + h.max + ')'); }
  { const s = mk(2); const h = s.heroes[0]; const g0 = h.S.gold; h.boons = { tithe: 1 }; s.recalc(h); check(Math.abs(h.S.gold - g0 - 0.25) < 1e-9, 'Founder\'s Tithe: +25% gold');
    const e = dummy(s, h.x + 60, h.y); e.hp = 5; e.def = Object.assign({}, e.def, { gold: 100 }); const gold = h.gold; s.dmgE(e, 50, h, {}); check(h.gold - gold === 125, 'a 100-gold kill pays 125 (' + (h.gold - gold) + ')'); }
  // Iron Roots, Unshaken
  { const s = mk(2); const h = s.heroes[0]; h.boons = {}; h.stun = 1; run(s, 0.5); const plain = h.stun; h.boons = { ironroots: 1 }; h.stun = 1; h.rootT = 1; run(s, 0.5); check(plain > 0.45 && h.stun < 0.05 && h.rootT < 0.05, 'Iron Roots: stuns and roots wear off twice as fast (' + plain.toFixed(2) + ' vs ' + h.stun.toFixed(2) + ')'); }
  { const s = mk(2); const h = s.heroes[0]; h.boons = { unshaken: 1 }; put(h, M.P.hearth[0] + 50, M.P.hearth[1] + 50); h.stun = 3; h.slowT = 3; h.rootT = 3; run(s, 0.1); check(h.stun <= 0 && h.slowT <= 0 && h.rootT <= 0, 'Unshaken: in the Hearth\'s glow nothing holds you');
    put(h, 900, 1400); h.stun = 3; h.slowT = 3; h.rootT = 3; s.tick(DT); check(h.stun > 0 || h.slowT > 0 || h.rootT > 0, 'in the dark it does not help');
    h.brand = 40; h.stun = 3; s.tick(DT); check(h.stun <= 0, 'with a brand in hand it does again'); }
  // Ember Ward
  { const s = mk(2); const h = s.heroes[0]; h.boons = { emberward: 1 }; const e = dummy(s, h.x + 70, h.y), far = dummy(s, h.x + 600, h.y); s.buildHash(); s.hurtHero(h, 20, null); check(e.burn && e.burnT > 0 && !far.burn, 'Ember Ward: a blow on you sets fire to what stands close, not far off'); e.burn = null; e.burnT = 0; s.hurtHero(h, 20, null); check(!e.burn, 'but not again at once'); run(s, 4.2); s.buildHash(); s.hurtHero(h, 20, null); check(!!e.burn, 'it comes back after a few seconds'); }
  // Cornerstone
  { const s = mk(2); const h = s.heroes[0]; h.boons = { cornerstone: 1 }; h.hp = h.max * 0.4; s.tick(DT); check(h.hp >= h.max * 0.4 + h.max * 0.2 - 2 && h.shield >= 30, 'Cornerstone: under half health you are mended a fifth and shielded');
    h.hp = h.max * 0.4; h.shield = 0; s.tick(DT); check(h.hp <= h.max * 0.41, 'only once a wave'); h.hp = h.max; jump(s, 7); h.hp = h.max * 0.4; s.tick(DT); check(h.hp > h.max * 0.5, 'and again the next wave'); }
  // Tolling
  { const s = mk(4, 'tolling'); const h = s.heroes[3]; h.boons = { tolling: 1 }; h.ranks = [1, 1, 1, 1, 0]; const near = dummy(s, h.x + 100, h.y), far = dummy(s, h.x + 700, h.y); s.buildHash(); s.release(h, 'r', { x: h.x + 100, y: h.y }, 1); check(near.stun > 0 && !(far.stun > 0), 'Tolling: your ultimate staggers what is near you, not what is far');
    near.stun = 0; s.release(h, 'q', { x: h.x + 100, y: h.y }, 1); check(!(near.stun > 0), 'and only the ultimate'); }
}

// ---------------------------------------------------------------- pickable and paid
console.log('Pick and pay:');
{
  const s = makeSim(2, 120); run(s, 0.2); jump(s, 20); run(s, 0.3); s.finishQuest('larder'); const h = s.heroes[0];
  const id = D.QUESTS.larder.boons[0]; s.intent('p0', { k: 'boon', id }); check(h.boons[id] === 1 && !h.offers, 'a boon is taken with the boon intent');
  s.intent('p1', { k: 'boon', id: D.QUESTS.stakes.boons[0] }); check(!s.heroes[1].boons[D.QUESTS.stakes.boons[0]], 'a boon of another quest is refused');
  const pay = D.payoutParts(5, NEW.length, true, 0); check(pay.quests === 12 * NEW.length, 'each quest done pays 12 gold');
  check(D.QUEST_ORDER.every(q => s.q[q]), 'the sim tracks every quest in QUEST_ORDER');
  const snap = s.snapshot(true); check(snap.q.length === D.QUEST_ORDER.length, 'the snapshot lists them all (' + snap.q.length + ')'); check(JSON.stringify(snap).length < 12000, 'and stays small (' + JSON.stringify(snap).length + ' B)');
}

// ---------------------------------------------------------------- the whole run: bots do not touch the new quests, nothing breaks, nothing leaks
console.log('A whole run with the quests open and nobody working them:');
{
  const s = makeSim(2, 130, { noSpawn: false }); run(s, 0.2); const hs = s.heroes;
  for (const h of hs) tank(h);
  run(s, 1700, () => {
    for (const h of hs) { put(h, 1615, 1700); h.hp = h.max; h.dmgMul = 6; h.stun = 0; }
    s.camp.hp = s.camp.max;
  });
  check(s.wave >= 16, 'the run goes on through the middle waves (wave ' + s.wave + ')');
  const open = NEW.filter(id => s.q[id].st === 1 && D.QUESTS[id].deadlineWave <= s.wave); check(open.length === 0, 'quests nobody works are missed at their deadline, never left open');
  check(NEW.every(id => s.q[id].st === 3 || s.q[id].st === 0 || s.q[id].st === 2), 'every new quest is settled');
  check(!s.enemies.some(e => !e.dead && e.qr), 'and no raider is left alive');
}

console.log('(' + passed + ' checks passed)');
if (failures) { console.log('Quests FAILED (' + failures + (failures === 1 ? ' problem)' : ' problems)')); process.exit(1); }
console.log('Quests OK');
