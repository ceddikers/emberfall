// The Founding: towers, soldiers and the Builder's board (sim-defence.js), headless test. Pokes the placement rules, the four tower kinds at
// every rank, enemies and bosses hurting towers, rubble, repair and selling, the squads that march with each wave, their upgrades and their cap,
// the messages (snapshot keys, props, events), determinism and the tick cost. Ends with "Defence OK".
// Usage: node tools/founding-defence-test.js

const path = require('path');
const R = p => path.join(__dirname, '../client/js/founding/' + p);
const { FoundingMap: M } = require(R('map-data.js'));
const { FOUNDING_DATA: D } = require(R('data.js'));
const { FoundingSim } = require(R('sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain']) require(R(m + '.js'));
const { FoundingArt } = require(R('map-art.js'));
FoundingArt.layoutOnly();

const hyp = Math.hypot, DT = 0.05, DEF = D.DEFENCE, TW = DEF.TOWER;
let failures = 0, passed = 0;
function check(cond, msg) { if (cond) passed++; else { failures++; console.log('  FAIL: ' + msg); } return !!cond; }

function makeSim(N, seed, extra) {
  const players = []; for (let i = 0; i < N; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const log = { fds: [], ev: [] };
  const emit = m => { if (m.t === 'fds') log.fds.push(m); else if (m.t === 'fdx') for (const e of m.ev) log.ev.push(e); };
  const sim = new FoundingSim(Object.assign({ players, emit, emitTo() {}, seed }, extra || {}));
  sim.log = log;
  for (let i = 0; i < N; i++) sim.intent('p' + i, { k: 'pick', hero: ['bastion', 'cleric', 'pyromancer', 'ranger'][i] });
  sim.intent('p0', { k: 'ready' });
  return sim;
}
const evs = (sim, tag) => sim.log.ev.filter(e => e[0] === tag);
const clearEv = sim => { sim.log.ev.length = 0; sim.log.fds.length = 0; };
function run(sim, secs, fn) { for (let i = 0; i < secs / DT; i++) { if (fn) fn(i); sim.tick(DT); } }
// an open spot near a point where a tower fits
function spot(sim, x, y, avoid) {
  for (let d = 0; d < 400; d += 15) for (let a = 0; a < 16; a++) {
    const px = Math.round(x + Math.cos(a / 16 * Math.PI * 2) * d), py = Math.round(y + Math.sin(a / 16 * Math.PI * 2) * d);
    if (DEF.fits(px, py, sim.defence.towers.concat(avoid || []), sim.buildProps()) === 0) return [px, py];
  }
  return null;
}
function build(sim, pid, kind, x, y) { const n = sim.defence.towers.length; sim.intent(pid, { k: 'build', kind, x, y }); return sim.defence.towers.length > n ? sim.defence.towers[sim.defence.towers.length - 1] : null; }
function rich(sim) { for (const h of sim.heroes) { h.gold = 5000; h.dirty = true; } }
// a tower with the given rank, finished building, on open ground by the junction
function tower(sim, kind, rank, at) {
  const p = spot(sim, at ? at[0] : 1500, at ? at[1] : 1520); const t = build(sim, 'p0', kind, p[0], p[1]);
  for (let r = 1; r < rank; r++) sim.intent('p0', { k: 'upTower', id: t.id });
  run(sim, 3.5); return t;
}
function foe(sim, kind, x, y, hp) { const e = sim.spawnEnemy(kind, 0, [x, y]); e.hp = e.max = hp || e.max; e.speed = 0; e.tgtT = 99; return e; }   // a standing enemy
const hold = (sim) => { for (const h of sim.heroes) { h.x = 1600; h.y = 1900; } };

// ------------------------------------------------------------------ placement
function sectionPlacement() {
  const sim = makeSim(1, 11); run(sim, 1); rich(sim);
  const T = sim.defence.towers, h = sim.heroes[0];
  check(DEF.KINDS.length === 4 && DEF.KINDS.every(k => TW[k] && TW[k].cost.length === 3 && TW[k].hp.length === 3 && TW[k].text.length === 3), 'four kinds, three ranks each, each rank has its own text');
  const legend = 220;
  for (const k of DEF.KINDS) { const tot = DEF.invested(k, 3); check(tot >= legend * 0.8 && tot <= legend * 1.3, `${k} maxed costs about a Legendary item (${tot} vs ${legend})`); check(TW[k].cost[0] <= 60, `${k} first rank costs about one shop item (${TW[k].cost[0]})`); }
  const tIdx = D.ITEMS.find(i => i.rar === 3).price; check(tIdx === legend, 'a Legendary item costs ' + legend + ' (the numbers above assume it)');
  const free = spot(sim, 1500, 1520);
  check(free && DEF.fits(free[0], free[1], [], sim.buildProps()) === 0, 'open ground fits');
  check(DEF.fits(M.P.spring[0], M.P.spring[1], [], null) === 3, 'not on the spring');
  check(DEF.fits(M.P.shop[0], M.P.shop[1], [], null) === 3, 'not on the shop');
  check(DEF.fits(M.P.gate[0], M.P.gate[1], [], null) === 3, 'not on the gate site');
  check(DEF.fits(M.P.hearth[0], M.P.hearth[1], [], null) === 3, 'not on the Hearth');
  check(DEF.fits(100, 100, [], null) === 3, 'not off the map or in the mountains');
  check(DEF.fits(free[0] + 10, free[1], [{ x: free[0], y: free[1] }], null) === 3, 'not on top of another tower (or its rubble)');
  check(DEF.fits(1400, 1500, [], { qo: [[2, 1400, 1500, 3]], qd: [], sec: [] }) === 3, 'not on a quest pick-up point');
  check(DEF.fits(1400, 1500, [], { qo: [], qd: [[6, 1400, 1500, 80]], sec: [] }) === 3, 'not on a quest destination');
  check(DEF.fits(1400, 1500, [], { qo: [], qd: [], sec: [[1, 1410, 1500, 0]] }) === 3, 'not on a secret');
  check(DEF.fits(DEF.POSTS[0][0], DEF.POSTS[0][1], [], null) === 3, 'not on a lantern post slot');
  // deep water: find a river cell
  let deep = null; for (let x = 2000; x < 3100 && !deep; x += 20) for (let y = 900; y < 1400 && !deep; y += 20) if (M.waterAt && M.waterAt(x, y) === 2) deep = [x, y];
  check(!deep || DEF.fits(deep[0], deep[1], [], null) === 3, 'not in deep water');
  // building
  const g0 = h.gold, t = build(sim, 'p0', 'post', free[0], free[1]);
  check(t && h.gold === g0 - TW.post.cost[0], 'a build costs the first rank and gives a tower'); sim.tick(DT);
  check(sim.allies.includes(t) && t.tk === 'ally' && typeof t.hurt === 'function', 'a tower is in sim.allies with a hurt()');
  check(evs(sim, 'twb').length === 1, 'a twb event');
  const before = T.length; sim.intent('p0', { k: 'build', kind: 'post', x: free[0] + 5, y: free[1] }); check(T.length === before, 'a second tower on the same ground is refused');
  const sp2 = spot(sim, 1700, 1520, T); const poor = makeSim(1, 12); run(poor, 1); poor.heroes[0].gold = 10; poor.intent('p0', { k: 'build', kind: 'post', x: sp2[0], y: sp2[1] }); check(poor.defence.towers.length === 0, 'no gold, no tower'); poor.tick(DT); check(evs(poor, 'twno').some(e => e[2] === 1), 'a refusal says why (gold)');
  sim.intent('p0', { k: 'build', kind: 'post', x: 400, y: 2000 }); check(!T.some(q => q.x === 400), 'out of the party reach is refused');
  const dead = makeSim(1, 13); run(dead, 1); rich(dead); dead.heroes[0].dead = true; dead.intent('p0', { k: 'build', kind: 'post', x: sp2[0], y: sp2[1] }); check(dead.defence.towers.length === 0, 'a fallen hero cannot build');
  sim.intent('p0', { k: 'build', kind: 'nope', x: sp2[0], y: sp2[1] }); sim.intent('p0', { k: 'build', kind: 'post', x: 'a', y: NaN }); check(T.length === 1, 'bad intents are ignored');
  // the cap: 4 + 2 per hero
  const cap1 = makeSim(1, 14); run(cap1, 1); rich(cap1); let n = 0; for (let i = 0; i < 12; i++) { const p = spot(cap1, 1300 + i * 110, 1500 + (i % 3) * 70); if (p && build(cap1, 'p0', 'bell', p[0], p[1])) n++; }
  check(n === 6, 'a lone hero may stand six towers (got ' + n + ')'); cap1.tick(DT); check(evs(cap1, 'twno').some(e => e[2] === 2), 'the cap says so');
  check(cap1.buildProps().tcap[1] === 6, 'props.tcap carries the cap');
  const cap4 = makeSim(4, 15); run(cap4, 1); rich(cap4); check(cap4.buildProps().tcap[1] === 12, 'four heroes: twelve');
  // anyone pays from their own gold and may upgrade
  const two = makeSim(2, 16); run(two, 1); rich(two); const pp = spot(two, 1500, 1520); const tt = build(two, 'p0', 'post', pp[0], pp[1]); run(two, 3);
  const g1 = two.hmap.p1.gold; two.intent('p1', { k: 'upTower', id: tt.id }); check(tt.rank === 2 && two.hmap.p1.gold === g1 - TW.post.cost[1], 'anyone may upgrade any tower, paying from their own gold');
  // upgrade to max and the max refusal
  const g2 = h.gold; sim.intent('p0', { k: 'upTower', id: t.id }); sim.intent('p0', { k: 'upTower', id: t.id }); check(t.rank === 3 && h.gold === g2 - TW.post.cost[1] - TW.post.cost[2], 'two upgrades reach rank 3 for their prices');
  sim.intent('p0', { k: 'upTower', id: t.id }); check(t.rank === 3 && h.gold === g2 - TW.post.cost[1] - TW.post.cost[2], 'rank 3 is the top');
  check(t.max === TW.post.hp[2], 'each rank has its own health');
  // sell: half back to whoever paid
  two.intent('p1', { k: 'sellTower', id: tt.id }); const refund0 = Math.floor(TW.post.cost[0] / 2), refund1 = Math.floor(TW.post.cost[1] / 2);
  check(two.defence.towers.length === 0 && two.hmap.p0.gold === 5000 - TW.post.cost[0] + refund0 && two.hmap.p1.gold === g1 - TW.post.cost[1] + refund1, 'selling pays each payer half of what they paid');
  check(!two.allies.includes(tt), 'a sold tower leaves sim.allies');
}

// ------------------------------------------------------------------ the four kinds
function sectionKinds() {
  // Watch-post
  { const sim = makeSim(1, 21); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'post', 1, [1500, 1500]); const e = foe(sim, 'ashling', t.x + 120, t.y, 400); clearEv(sim); const hp0 = e.hp;
    run(sim, 2.5); check(e.hp < hp0, 'a Watch-post hurts what comes near'); const shots = evs(sim, 'twf').length; check(shots >= 1 && shots <= 3, 'rank 1 looses one arrow at a time (' + shots + ' in 2.5 s)');
    const far = foe(sim, 'ashling', t.x + 900, t.y, 100); run(sim, 1); check(far.hp === 100, 'it does not shoot beyond its range');
    const a = foe(sim, 'slagback', t.x - 150, t.y, 4000), b = foe(sim, 'slagback', t.x + 200, t.y + 40, 4000); a.mark = { m: 1.25, t: 20, src: null }; const ha = a.hp, hb = b.hp; run(sim, 3); check(a.hp < ha && b.hp === hb, 'it prefers what a hero marked'); }
  { const sim = makeSim(1, 22); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'post', 2, [1500, 1500]); foe(sim, 'slagback', t.x + 120, t.y, 4000); foe(sim, 'slagback', t.x + 150, t.y + 40, 4000); clearEv(sim); run(sim, 1.2);
    const per = evs(sim, 'twf').length; check(per >= 2, 'rank 2 looses two arrows at once (' + per + ')'); }
  { const sim = makeSim(1, 23); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'post', 3, [1500, 1500]); const line = [0, 1, 2, 3].map(i => foe(sim, 'slagback', t.x + 150 + i * 30, t.y, 4000)); const h0 = line.map(e => e.hp); run(sim, 1.3);
    const hurt = line.filter((e, i) => e.hp < h0[i]).length; check(hurt >= 3, 'rank 3 arrows pierce in a line (' + hurt + ' of 4 hurt)'); check(evs(sim, 'twf').some(e => e[4] === 1), 'a piercing shot is marked in its event'); }
  // Brazier
  { const sim = makeSim(1, 24); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'brazier', 1, [1500, 1500]); const L0 = sim.lights().length;
    check(sim.lights().some(l => l[0] === t.x && l[1] === t.y), 'a brazier lights the ground around it'); const es = [0, 1, 2].map(i => foe(sim, 'ashling', t.x + 120 + i * 12, t.y + i * 8, 600)); const h0 = es.map(e => e.hp); run(sim, 2.6);
    check(es.filter((e, i) => e.hp < h0[i]).length >= 2, 'a brazier burns a small crowd'); check(!sim.zones.some(z => z.kind === FoundingSim.ZONE.BURN), 'rank 1 leaves no burning ground'); }
  { const sim = makeSim(1, 25); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'brazier', 2, [1500, 1500]); foe(sim, 'slagback', t.x + 130, t.y, 5000); run(sim, 3); check(sim.zones.some(z => z.kind === FoundingSim.ZONE.BURN), 'rank 2 leaves burning ground'); }
  { const sim = makeSim(1, 26); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'brazier', 3, [1500, 1500]); const lr = sim.lights().find(l => l[0] === t.x && l[1] === t.y);
    check(lr && lr[2] === TW.brazier.light[2] && TW.brazier.light[2] > TW.brazier.light[0], 'rank 3 has the widest light');
    sim.night = 0.9; sim.peak = 1; const st = foe(sim, 'stalker', t.x + 100, t.y, 400); sim._lt = -1; run(sim, 0.2); const row = sim.snapshot(true).e.find(r => r[0] === st.id); check(row && !(row[6] & FoundingSim.FLAG.HIDDEN), 'a stalker in its light stays shown'); }
  // Bell
  { const sim = makeSim(1, 27); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'bell', 1, [1500, 1500]); const e = foe(sim, 'ashling', t.x + 120, t.y, 4000); clearEv(sim); run(sim, 0.3);
    check(e.slowM < 1 && e.hp === 4000, 'a bell slows and does no harm'); check(evs(sim, 'twr').length >= 1, 'the bell rings (twr)');
    clearEv(sim); run(sim, 8); const rings = evs(sim, 'twr').length; check(rings >= 2 && rings <= 5, 'it rings on a beat (' + rings + ' in 8 s)'); }
  { const sim = makeSim(1, 28); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'bell', 2, [1500, 1500]); sim.night = 0.9; sim.peak = 1; const st = foe(sim, 'stalker', t.x + 150, t.y + 60, 400); let seen = false; run(sim, 3, () => { if (st.reveal > sim.time) seen = true; });
    check(seen, 'rank 2 shows hidden enemies in its ring'); }
  { const sim = makeSim(1, 29); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'bell', 3, [1500, 1500]); const o = tower(sim, 'post', 1, [t.x + 130, t.y]); foe(sim, 'ashling', t.x - 100, t.y, 4000); run(sim, 0.3); check(o.shield > 0 || o.shieldT > 0, 'rank 3 shields the nearest tower'); }
  // Ballista
  { const sim = makeSim(1, 30); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'ballista', 1, [1500, 1500]); const a = foe(sim, 'ashling', t.x + 200, t.y, 4000), b = foe(sim, 'brute', t.x + 300, t.y + 50, 4000); run(sim, 1);
    check(b.hp < 4000 && a.hp === 4000, 'a Ballista goes for the elite, not the nearest'); const pos = b.x; }
  { const sim = makeSim(1, 31); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'ballista', 2, [1500, 1500]); const b = foe(sim, 'slagback', t.x + 250, t.y, 4000); b.kbRes = 0; const x0 = b.x; run(sim, 1.0);
    check(b.kvx > 20 || b.x > x0 + 4, 'rank 2 knocks the target back'); }
  { const sim = makeSim(1, 32); run(sim, 1); rich(sim); hold(sim); const t = tower(sim, 'ballista', 3, [1500, 1500]); const b = foe(sim, 'slagback', t.x + 250, t.y, 4000); run(sim, 1.0); check(b.rootT > 0, 'rank 3 pins the target'); }
  // soldiers and towers pay half when they kill
  { const sim = makeSim(1, 33); run(sim, 1); rich(sim); hold(sim); const h = sim.heroes[0]; const t = tower(sim, 'post', 1, [1500, 1500]); const e = foe(sim, 'slagback', t.x + 100, t.y, 5); h.gold = 100; const xp0 = h.xp; run(sim, 2); check(e.dead, 'a tower finishes a weak enemy'); const dg = h.gold - 100;
    check(dg >= 0 && dg <= Math.round(D.ENEMIES.slagback.gold * 0.4 * 0.5 * 1.01) + 1, 'a tower kill pays a hero half the usual gold (' + dg + ')'); }
}

// ------------------------------------------------------------------ enemies hurt towers; rubble, repair, rebuild
function sectionHurt() {
  const sim = makeSim(1, 41); run(sim, 1); rich(sim); hold(sim); const h = sim.heroes[0];
  const t = tower(sim, 'bell', 1, [1500, 1500]); const hp0 = t.hp; const e = foe(sim, 'ashling', t.x + 40, t.y, 100000); e.speed = 52; e.tgtT = 0; clearEv(sim);
  run(sim, 6); check(t.hp < hp0, 'enemies hit a tower they stand next to'); check(!e.dead, '(the biter lives)');
  // fall and rubble
  run(sim, 120, () => { if (t.hp > 0) e.acd = 0; }); check(t.rubble && t.dead, 'a tower falls into rubble'); check(!sim.allies.includes(t), 'rubble is not in sim.allies'); check(evs(sim, 'twd').length === 1, 'a twd event');
  sim.enemies.length = 0; sim.emap.clear();
  check(sim.buildProps().tcap[0] === 0, 'rubble does not count against the cap');
  const p = [t.x, t.y]; const n0 = sim.defence.towers.length; sim.intent('p0', { k: 'build', kind: 'post', x: p[0], y: p[1] }); check(sim.defence.towers.length === n0, 'nothing may be built on rubble');
  // rebuild for half; needs a hero close by
  h.x = t.x + 400; h.y = t.y; const g0 = h.gold; sim.intent('p0', { k: 'repair', id: t.id }); check(t.rubble && h.gold === g0, 'rebuilding needs a hero standing at it');
  h.x = t.x + 60; h.y = t.y; sim.intent('p0', { k: 'repair', id: t.id }); check(!t.rubble && h.gold === g0 - Math.ceil(TW.bell.cost[0] / 2), 'a hero at the rubble rebuilds it for half the price'); sim.tick(DT); check(sim.allies.includes(t), 'a rebuilt tower is an ally again'); check(evs(sim, 'twre').length === 1, 'a twre event');
  run(sim, 3);
  // repair by standing near, out of combat, for a little gold
  t.hp = t.max * 0.4; t.hurtT = sim.time - 10; h.lastHit = -99; const hpR = t.hp, gR = h.gold; sim.intent('p0', { k: 'repair', id: t.id }); run(sim, 4);
  check(t.hp > hpR + 20, 'standing by it mends a tower'); check(h.gold < gR && gR - h.gold < 40, 'repair costs a little gold (' + (gR - h.gold) + ')');
  // not in combat
  t.hp = t.max * 0.4; t.hurtT = sim.time; const hpC = t.hp; sim.intent('p0', { k: 'repair', id: t.id }); run(sim, 1); check(t.hp <= hpC + 1, 'it does not mend while it is being hit');
  // rubble clears
  const t2 = tower(sim, 'post', 1, [1700, 1500]); t2.hp = 1; t2.hurt(10, null); check(t2.rubble, 'a tower at zero falls'); sim.intent('p0', { k: 'sellTower', id: t2.id }); sim.tick(DT); check(!sim.defence.towers.includes(t2) && evs(sim, 'twx').length >= 1, 'rubble can be cleared');
  const t3 = tower(sim, 'post', 1, [1300, 1500]); t3.hurt(9999, null); run(sim, TUNE().rubbleSecs + 5); check(!sim.defence.towers.includes(t3), 'rubble does not stay forever');
  // towers are solid
  { const s2 = makeSim(1, 42); run(s2, 1); rich(s2); hold(s2); const tt = tower(s2, 'bell', 1, [1500, 1500]); const en = foe(s2, 'ashling', tt.x + 5, tt.y + 3, 1000); en.speed = 0; run(s2, 0.2); check(hyp(en.x - tt.x, en.y - tt.y) >= tt.r, 'enemies are pushed out of a tower'); }
  // a boss's red strike hurts towers
  { const s2 = makeSim(1, 43); run(s2, 1); rich(s2); hold(s2); const tt = tower(s2, 'post', 3, [1500, 1500]); const hpb = tt.hp; const boss = s2.spawnEnemy('tunnelmaw', 0, [tt.x + 300, tt.y]); boss.speed = 0; boss.ai = { ph: 'walk', t: 0, step: 0, gate: 0, next: 99, age: 0 };
    s2.tele(0, tt.x, tt.y, 100, 0, 0, 0.6, 0); run(s2, 1); check(tt.hp < hpb, 'a boss strike (a red telegraph) hurts a tower in it'); const hp2 = tt.hp; s2.tele(0, tt.x, tt.y, 100, 0, 0, 0.6, 1); run(s2, 1); check(tt.hp >= hp2, 'a blue telegraph does not'); }
}
const TUNE = () => DEF.TUNE;

// ------------------------------------------------------------------ vision and messages
function sectionMessages() {
  const sim = makeSim(2, 51); run(sim, 1); rich(sim); hold(sim);
  const t = tower(sim, 'post', 2, [1500, 1500]); sim.extraVis.push([1000, 1000, 200]);
  const snap = sim.snapshot(true); const P = snap.props;
  check(Array.isArray(snap.tw) && snap.tw.length === 1 && snap.tw[0][0] === t.id && snap.tw[0][1] === 0 && snap.tw[0][2] === 2, 'the snapshot carries `tw` rows [id, kind, rank, x, y, hp, max, flags, inv]');
  check(snap.tw[0].length === 9 && snap.tw[0][5] > 0 && snap.tw[0][6] === TW.post.hp[1], 'tw rows carry health and the maximum');
  check(P.vis && P.vis.some(v => v[0] === t.x && v[1] === t.y && v[2] === TW.post.sight[1]), 'props.vis holds the tower sight circle');
  check(P.vis.some(v => v[0] === 1000 && v[2] === 200), 'props.vis merges sim.extraVis');
  check(Array.isArray(P.sdu) && P.sdu.length === 3 && P.tcap[0] === 1, 'props carry sdu and tcap');
  check(Array.isArray(snap.sd), 'the snapshot carries `sd`');
  const sim2 = makeSim(1, 52); run(sim2, 1); check(JSON.stringify(sim2.snapshot(true).props.vis || []) === '[]', 'no towers, no vis');
  // props stay stable between towers changing (so they are not resent every snapshot)
  const j1 = JSON.stringify(sim.buildProps()); run(sim, 2); check(JSON.stringify(sim.buildProps()) === j1, 'props are stable while nothing is built');
  // events are tw* and so* only
  check(sim.log.ev.filter(e => /^(tw|so)/.test(e[0])).every(e => /^(twb|twu|twf|twr|twd|twx|twre|tws|twno|sob|sof|soh|sod|sou)$/.test(e[0])), 'only the documented event tags are used');
}

// ------------------------------------------------------------------ soldiers
function sectionSoldiers() {
  const sim = makeSim(1, 61); sim.tick(DT); const dd = sim.defence;
  run(sim, 20 + 0.5);   // wave 1 arrives at 20 s
  check(sim.wave === 1 && dd.soldiers.length === 8, 'with wave 1 a squad of four marches to each lane (' + dd.soldiers.length + ')');
  const kinds = {}; for (const s of dd.soldiers) kinds[s.type] = (kinds[s.type] || 0) + 1; check(kinds.knight === 4 && kinds.archer === 2 && kinds.cleric === 2 && !kinds.cavalry, 'the first squad is two knights, an archer and a cleric');
  { const names = t => DEF.squadAt(t).join(','); check(DEF.squadAt(1).length === 5 && DEF.squadAt(1)[4] === 'archer' && DEF.squadAt(2)[5] === 'knight' && DEF.squadAt(3)[6] === 'cavalry' && DEF.squadAt(7).length === 10 && DEF.squadAt(9).length === 10, 'the squad gains an archer, a knight, a cavalry knight ... with each tier step, ten at the top (' + names(7) + ')'); }
  { const st = makeSim(4, 62); st.tick(DT); st.noSpawn = false; st.wave = 12; st.nextWaveAt = st.time + 0.1; run(st, 0.6); const k = {}; for (const s of st.defence.soldiers) if (s.lane === 0) k[s.type] = (k[s.type] || 0) + 1; check(st.wave === 13 && k.cavalry === 1 && k.knight === 3 && k.archer === 2 && k.cleric === 1, 'wave 13 (tier 3) sends a squad of seven with a cavalry knight to a lane (' + JSON.stringify(k) + ')'); const cv = st.defence.soldiers.find(s => s.type === 'cavalry'); check(cv && cv.ti === 3, 'a cavalry knight has type index 3'); }
  check(evs(sim, 'sob').length === 1, 'an sob event when they march');
  check(dd.soldiers.every(s => s.tk === 'ally' && sim.allies.includes(s)), 'soldiers are sim.allies');
  sim.spawnQ.length = 0; sim.enemies.length = 0;   // (wave 1's own crowd is not what this checks)
  const k0 = dd.soldiers.find(s => s.type === 'knight' && s.lane === 0), y0 = k0.y;
  run(sim, 10); check(hyp(k0.x - 1600, k0.y - 1940) > 150, 'soldiers march out of the camp'); const L0 = sim.paths[0], nearIdx = M.near(L0, k0.x, k0.y);
  check(nearIdx.d < M.LANE_HW * 2 && nearIdx.i < L0.length - 5, 'they march along their lane toward the spawn (index ' + nearIdx.i + ' of ' + L0.length + ')');
  run(sim, 25); const idx2 = M.near(L0, k0.x, k0.y).i; check(idx2 < nearIdx.i, 'and keep going');
  // they fight: an enemy at their feet loses health and the knight loses some too
  const en = foe(sim, 'ashling', k0.x + 18, k0.y, 300); en.speed = 52; en.tgtT = 0; const hk = k0.hp; run(sim, 12); check(en.hp < 300 || en.dead, 'soldiers fight what is in reach'); check(!k0.dead && k0.hp <= hk, '(and take some of it)');
  // the cleric heals
  const cl = dd.soldiers.find(s => s.type === 'cleric' && s.lane === 0), kn = dd.soldiers.find(s => s.type === 'knight' && s.lane === 0 && !s.dead); kn.hp = kn.max * 0.4; kn.hurtT = sim.time; const hh = kn.hp; sim.enemies.length = 0; for (const o of dd.soldiers) if (o !== kn) o.hp = o.max; cl.x = kn.x - 20; cl.y = kn.y; run(sim, 8); check(kn.hp > hh + 8, 'the cleric heals the hurt');
  // squads step up with the lane tiers
  const sA = makeSim(1, 62), sB = makeSim(1, 62); sA.tick(DT); sB.tick(DT); sA.noSpawn = false; sB.noSpawn = false; sA.wave = 0; sA.time = 0; run(sA, 20.5); sB.wave = 8; sB.time = D.WAVE_T0 + 8 * D.WAVE_GAP - 0.01; sB.nextWaveAt = sB.time + 0.01; run(sB, 0.2);
  const ka = sA.defence.soldiers.find(s => s.type === 'knight'), kb = sB.defence.soldiers.find(s => s.type === 'knight'); check(kb && ka && kb.max > ka.max && kb.dmg > ka.dmg, 'a later squad is stronger: tier steps (' + (ka && ka.max) + ' to ' + (kb && kb.max) + ' health)');
  // upgrades apply to new squads, cost gold, three ranks each
  const su = makeSim(1, 63); su.tick(DT); su.heroes[0].gold = 5000; const hp0 = su.defence.up; const g = su.heroes[0].gold;
  su.intent('p0', { k: 'soldier', up: 'arm' }); su.intent('p0', { k: 'soldier', up: 'wpn' }); su.intent('p0', { k: 'soldier', up: 'heal' });
  check(su.defence.up.arm === 1 && su.defence.up.wpn === 1 && su.defence.up.heal === 1 && su.heroes[0].gold === g - DEF.SOLDIER_UP.arm.cost[0] - DEF.SOLDIER_UP.wpn.cost[0] - DEF.SOLDIER_UP.heal.cost[0], 'squad upgrades cost gold');
  for (let i = 0; i < 5; i++) su.intent('p0', { k: 'soldier', up: 'arm' }); check(su.defence.up.arm === 3, 'three ranks and no more');
  run(su, 20.5); const ks = su.defence.soldiers.find(s => s.type === 'knight'); const base = makeSim(1, 63); base.tick(DT); run(base, 20.5); const kbse = base.defence.soldiers.find(s => s.type === 'knight');
  check(ks.max > kbse.max * 1.4, 'armour makes new knights sturdier (' + kbse.max + ' to ' + ks.max + ')');
  const s4 = makeSim(4, 67); s4.tick(DT); run(s4, 20.5); const k4 = s4.defence.soldiers.find(s => s.type === 'knight'); check(k4 && k4.max === kbse.max, 'a squad does not depend on the party size (' + kbse.max + ' alone, ' + (k4 && k4.max) + ' with four)');
  const poor = makeSim(1, 64); poor.tick(DT); poor.heroes[0].gold = 5; poor.intent('p0', { k: 'soldier', up: 'arm' }); check(poor.defence.up.arm === 0, 'no gold, no training');
  // the cap on soldiers alive
  const cap = makeSim(1, 65); cap.tick(DT); cap.noSpawn = false; for (let i = 0; i < 12; i++) { cap.wave++; cap.hook('wave', cap.wave); } { const lc = DEF.squadAt(D.tierOf(cap.wave)).length + DEF.TUNE.laneExtra; check(cap.defence.soldiers.length <= DEF.TUNE.soldierCap && cap.defence.soldiers.length === 2 * lc, 'soldiers alive are capped per lane at the squad plus ' + DEF.TUNE.laneExtra + ' (' + cap.defence.soldiers.length + ' of ' + 2 * lc + ')'); }
  // slow a lane, never hold it: a squad alone against a big wave
  const tough = makeSim(4, 66); tough.tick(DT); tough.wave = 11; tough.nextWaveAt = tough.time + 0.1; run(tough, 0.6); const kk = tough.defence.soldiers.length; run(tough, 150, () => { for (const h of tough.heroes) { h.x = 1600; h.y = 2000; h.hp = h.max; } }); const alive = tough.defence.soldiers.length;
  check(alive < kk, 'against a four-hero wave a lone squad is worn down (' + kk + ' to ' + alive + ')');
  check(tough.camp.hp < tough.camp.max || tough.enemies.length > 0, 'and does not hold the lane alone');
}

// ------------------------------------------------------------------ cost and determinism
function sectionRun() {
  // cost: a full 4 hero build with towers and soldiers ticks cheaply
  const sim = makeSim(4, 71); run(sim, 1); rich(sim); hold(sim); let n = 0; for (let i = 0; i < 12; i++) { const p = spot(sim, 1200 + i * 90, 1450 + (i % 4) * 60); if (p && build(sim, 'p' + (i % 4), DEF.KINDS[i % 4], p[0], p[1])) n++; }
  for (const t of sim.defence.towers) { sim.intent('p0', { k: 'upTower', id: t.id }); sim.intent('p1', { k: 'upTower', id: t.id }); }
  for (const h of sim.heroes) { h.gold = 99999; h.hp = h.max = 99999; }
  const t0 = process.hrtime.bigint(); let ticks = 0, maxE = 0, maxS = 0;
  for (let i = 0; i < 20 * 300; i++) { sim.tick(DT); ticks++; for (const h of sim.heroes) { h.x = 1600; h.y = 2000; } if (sim.enemies.length > maxE) maxE = sim.enemies.length; if (sim.defence.soldiers.length > maxS) maxS = sim.defence.soldiers.length; }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / ticks; check(n >= 10, 'built a dozen towers (' + n + ')'); check(maxS >= 10, 'soldiers in play (' + maxS + ')');
  check(ms < 3.5, `the host tick stays cheap with ${n} towers, ${maxS} soldiers and up to ${maxE} enemies (${ms.toFixed(2)} ms a tick)`);
  console.log(`  (tick ${ms.toFixed(2)} ms avg over 5 minutes, ${maxE} enemies and ${maxS} soldiers at most)`);
  // determinism: the same seed and the same intents replay to the same towers and soldiers
  const play = seed => { const s = makeSim(2, seed); run(s, 1); rich(s); hold(s); const out = []; const p1 = spot(s, 1500, 1500), p2 = spot(s, 1700, 1500, [{ x: p1[0], y: p1[1] }]); build(s, 'p0', 'post', p1[0], p1[1]); build(s, 'p1', 'ballista', p2[0], p2[1]); run(s, 90, () => { for (const h of s.heroes) { h.x = 1600; h.y = 2000; } }); return JSON.stringify([s.snapshot(true).tw, s.snapshot(true).sd, s.enemies.length]); };
  check(play(81) === play(81), 'a run replays the same (towers, soldiers and enemies)');
}

const T0 = Date.now();
try { for (const f of [sectionPlacement, sectionKinds, sectionHurt, sectionMessages, sectionSoldiers, sectionRun]) { f(); } } catch (e) { failures++; console.log('EXCEPTION: ' + e.stack); }
console.log(`(${passed} checks passed, ${((Date.now() - T0) / 1000).toFixed(1)} s)`);
if (failures) { console.log(`Defence FAILED (${failures} problem${failures > 1 ? 's' : ''})`); process.exit(1); }
console.log('Defence OK');
