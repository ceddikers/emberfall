// The Founding: the secret chain, headless test. A scripted party of four wakes the Ram with the bell, kills it, and walks the chain
// link by link; the test checks waking, the 2-3 minute gaps, the far-sound hint, the leash, the optional acts, payouts, drops, that
// every boss strike is telegraphed before it lands, determinism, the set pieces of links 5-10, the item effects, that every place is
// reachable and clear of the wild camps, and that the chain stops at the siege.
// Also: the Ultimates-for-damage rules ((a) no Meteor/Starfall + shop gear is overwhelmed by the fury, (b) a party at the link's level with R on cooldown clears in about two minutes (four for the tenth),
// (c) two Mythics make up for no R on links 1-3) and the full ten-link run of a quick party, which must end before the siege.
// Usage: node tools/founding-chain-test.js [--verbose] [--tune]      Ends with "Chain OK".
//   --fit [t=116] [only=5,10]   re-fit each link's health so a party at its suited level, with R, shop gear and the chain drops so far, takes t seconds (twice for the tenth); prints the numbers to put in sim-chain.js
//   --probe <link> <level> <gear> [noult] [seeds=n] [dm2=1.2] [hp3=9000] [rageAt=100]   one scenario, several seeds (gear: r2l1m1 c3 = Rares, Legendaries, Mythics, the first three chain drops)
//   --rules   only the (a)/(b)/(c) checks

const path = require('path');
const R = path.join(__dirname, '../client/js/founding/');
const { FoundingMap: M } = require(R + 'map-data.js');
const { FOUNDING_DATA: D } = require(R + 'data.js');
const { FoundingSim } = require(R + 'sim.js');
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain']) require(R + m + '.js');
const { FoundingArt } = require(R + 'map-art.js');
FoundingArt.layoutOnly();

const VERBOSE = process.argv.includes('--verbose'), TUNE = process.argv.includes('--tune');
const hyp = Math.hypot, DT = 0.05, CH = FoundingSim.CHAIN;
let failures = 0, passed = 0, SEEDTAG = '';
function check(cond, msg) { if (cond) passed++; else { failures++; console.log("  FAIL: " + msg + SEEDTAG); } if (VERBOSE && cond) console.log("  ok: " + msg); return !!cond; }

// ---------------------------------------------------------------- a sim with the events kept
function makeSim(N, seed, heroes) {
  const players = []; for (let i = 0; i < N; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const log = { ev: [], fds: null, end: null };
  const emit = m => { if (m.t === 'fdx') for (const e of m.ev) log.ev.push([sim.time, e]); else if (m.t === 'fds') log.fds = m; else if (m.t === 'fdend') log.end = m; };
  const sim = new FoundingSim({ players, emit, emitTo() {}, seed });
  sim.log = log;
  const hs = heroes || ['bastion', 'cleric', 'pyromancer', 'ranger'];
  for (let i = 0; i < N; i++) sim.intent('p' + i, { k: 'pick', hero: hs[i] });
  sim.intent('p0', { k: 'ready' });
  sim.nextWaveAt = 1e9;   // an arena: the waves do not come, only the chain
  return sim;
}
const evs = (sim, tag) => sim.log.ev.filter(e => e[1][0] === tag);
const settle = sim => { for (const h of sim.heroes) { h.hp = h.max; h.dead = false; } };
function levelUp(sim, lv) { for (const h of sim.heroes) { h.level = lv; sim.recalc(h); h.hp = h.max; } }
function place(sim, x, y) { sim.heroes.forEach((h, i) => { const p = sim.nearestWalkable(x + (i - 1.5) * 34, y + 40, 14); h.x = p[0]; h.y = p[1]; h.path = null; h.target = null; }); }

// ---------------------------------------------------------------- the scripted party: spends points, dodges red, stacks on blue, fights the boss
// is (x, y) inside something red right now? (telegraphs of every shape that are live, and thorn patches that are armed)
function redAt(sim, x, y, pad) {
  const C = sim.chain;
  for (const t of C.live) {
    if (t.col === 1) continue;
    if (t.shape === 0) { if (hyp(x - t.x, y - t.y) < t.a + pad) return true; }
    else if (t.shape === 2) { const d = hyp(x - t.x, y - t.y), rel = Math.atan2(y - t.y, x - t.x) - t.a, nrm = Math.atan2(Math.sin(rel), Math.cos(rel)); if (d < t.b + pad && (d < 20 || Math.abs(nrm) < t.w + pad / Math.max(40, d))) return true; }
    else if (t.shape === 1) {
      const x1 = t.x + Math.cos(t.a) * t.b, y1 = t.y + Math.sin(t.a) * t.b, dx = x1 - t.x, dy = y1 - t.y, l = dx * dx + dy * dy;
      let u = ((x - t.x) * dx + (y - t.y) * dy) / l; u = Math.max(0, Math.min(1, u)); if (hyp(x - (t.x + dx * u), y - (t.y + dy * u)) < t.w + pad) return true;
    }
  }
  return false;
}
function dodgeSpot(sim, h) {
  const C = sim.chain;
  // blue: go to the middle of the nearest blue circle if outside it
  for (const t of C.live) if (t.col === 1 && hyp(h.x - t.x, h.y - t.y) > t.a * 0.55) return [t.x, t.y];
  if (!redAt(sim, h.x, h.y, 26)) return null;
  let best = null, bd = 1e9;
  for (let r = 50; r <= 420; r += 40) for (let k = 0; k < 20; k++) {
    const a = k * Math.PI / 10, x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r;
    if (!M.walkable(x, y, 12) || redAt(sim, x, y, 34)) continue;
    if (r < bd) { bd = r; best = [x, y]; } if (best && r > bd + 40) break;
  }
  return best;
}
function botStep(sim, h, B, boss) {
  if (h.dead) return;
  const S = m => sim.intent(h.id, m), now = sim.time, ready = i => h.ranks[i] > 0 && h.ch[i] > 0 && !(i === 3 && h.level < 6) && !(i === 3 && B.noUlt && (h.hero === 'pyromancer' || h.hero === 'ranger'));
  if (h.level - sim.spent(h) > 0) { const o = ['r', 'p', ...['q', 'w', 'e'].sort((a, b) => h.ranks['qwer'.indexOf(a)] - h.ranks['qwer'.indexOf(b)])].filter(s => sim.canLearn(h, s)); if (o.length) S({ k: 'learn', s: o[0] }); }
  if (h.offers) S({ k: 'boon', id: h.offers[0] });
  const dz = B.noDodge ? null : dodgeSpot(sim, h);
  if (dz && now - B.lastMove > 0.12) { S({ k: 'move', x: dz[0], y: dz[1] }); B.lastMove = now; return; }
  if (!boss || boss.dead) return;
  const d = hyp(boss.x - h.x, boss.y - h.y), want = { bastion: boss.r + 36, cleric: 135, pyromancer: 150, ranger: 190 }[h.hero] + (h.hero === 'bastion' ? 0 : boss.r * 0.4);
  const mid = boss.link && boss.link.pond;
  if (now - B.lastMove > 0.7 && !dz) {
    if (d > want + 40) { const a = Math.atan2(h.y - boss.y, h.x - boss.x), tx = boss.x + Math.cos(a) * want, ty = boss.y + Math.sin(a) * want; S({ k: 'move', x: tx, y: ty }); B.lastMove = now; }
  }
  const tx = boss.x, ty = boss.y;
  if (h.hero === 'bastion') {
    if (ready(2) && boss.ai.mv && d < 160) S({ k: 'cast', s: 'e' });
    else if (ready(3) && d < 260) S({ k: 'cast', s: 'r', x: tx, y: ty });
    else if (ready(1) && d < 200) S({ k: 'cast', s: 'w', x: tx, y: ty });
    else if (ready(0) && d < 150) S({ k: 'cast', s: 'q', id: boss.id });
  } else if (h.hero === 'cleric') {
    const hurt = sim.heroes.filter(o => !o.dead && o.hp < o.max * 0.7).sort((a, b) => a.hp / a.max - b.hp / b.max)[0], dead = sim.heroes.find(o => o.dead);
    if (ready(3) && dead && hyp(dead.x - h.x, dead.y - h.y) < 230) S({ k: 'cast', s: 'r', x: dead.x, y: dead.y });
    else if (ready(3) && d < 400) S({ k: 'cast', s: 'r', x: h.x, y: h.y });
    else if (ready(0) && hurt && h.st.petals > 0) S({ k: 'cast', s: 'q', id: hurt.id });
    else if (ready(2) && d < 220) S({ k: 'cast', s: 'e', x: tx, y: ty });
    else if (ready(1) && d < 240) S({ k: 'cast', s: 'w', id: boss.id });
  } else if (h.hero === 'pyromancer') {
    if (ready(3) && d < 240) S({ k: 'cast', s: 'r', x: tx, y: ty });
    else if (ready(1) && d < 240) S({ k: 'cast', s: 'w', x: tx, y: ty });
    else if (ready(2) && d < 90) { const aw = Math.atan2(h.y - ty, h.x - tx); S({ k: 'cast', s: 'e', x: h.x + Math.cos(aw) * 150, y: h.y + Math.sin(aw) * 150 }); }
    else if (ready(0) && d < 260) S({ k: 'cast', s: 'q', x: tx, y: ty });
  } else {
    if (ready(3) && d < 300) S({ k: 'cast', s: 'r', x: tx, y: ty });
    else if (ready(2) && !boss.mark && d < 320) S({ k: 'cast', s: 'e', id: boss.id });
    else if (ready(0) && d < 320) S({ k: 'cast', s: 'q', x: tx, y: ty });
    else if (ready(1) && d < 260) S({ k: 'cast', s: 'w', x: tx, y: ty });
  }
  if (!h.target || h.target.dead || h.target.id !== boss.id) S({ k: 'attack', id: boss.id });
}
// run until the boss dies, the party dies, or the time is up. Returns { win, secs, minHp }
function fight(sim, opts) {
  opts = opts || {}; const bots = sim.heroes.map(() => ({ lastMove: -9, noDodge: !!opts.noDodge, noUlt: !!opts.noUlt })), t0 = sim.time, limit = opts.limit || 400;
  let n = 0, deaths = 0;
  while (sim.time - t0 < limit) {
    if (n % 4 === 0) { sim.heroes.forEach((h, i) => botStep(sim, h, bots[i], sim.chain.focus(h))); }
    // a fallen hero is lifted at once (the Cleric's R is not scripted well): the test measures the fight, not the revive
    for (const h of sim.heroes) if (h.dead) { deaths++; if (!opts.noLift) sim.respawn(h, h.x, h.y, 0.5, 0); }
    sim.tick(DT); n++; if (sim.st !== 'live') break; if (opts.onTick) opts.onTick();
    if (opts.until ? opts.until() : (sim.chain.st.every(s => s !== 'fight') && !sim.chain.boss)) break;
  }
  return { secs: sim.time - t0, deaths };
}

// ---------------------------------------------------------------- the checks
function sectionData() {
  console.log('Data:');
  check(CH.BUILT === 10, 'all ten links are built');
  check(CH.LINKS.length === 10, 'ten links');
  check(CH.LINKS[9].name.includes('Hunger'), 'the tenth is the First Hunger\'s Shadow');
  for (let i = 0; i < 10; i++) check(CH.LINKS[i].pay === 15 + 5 * i, `link ${i + 1} pays ${15 + 5 * i}`);
  for (const L of CH.ITEMS) { const it = D.ITEM[L[0]]; check(it && it.sec && it.shop === 0 && it.rar >= 2, `${L[0]} is a found-only Rare or better`); }
  const rars = CH.ITEMS.map(x => x[1]); check(rars.every((r, i) => i === 0 || r >= rars[i - 1]), 'the rarity climbs along the chain');
  check(CH.ITEMS[9][0] === 'choath' && CH.ITEMS[9][1] === 4, 'the tenth drops Founder\'s Oath (Mythic)');
  check(!D.ITEMS.filter(i => !i.sec).some(i => CH.ITEMS.some(x => x[0] === i.id)), 'chain items are never in the drop or forge pools');
  check(!D.ITEMS.some(i => i.shop && CH.ITEMS.some(x => x[0] === i.id)), 'chain items are never in the shop');
  for (const L of CH.LINKS.slice(0, CH.BUILT)) check(D.ENEMIES[L.kind] && D.ENEMIES[L.kind].boss, `${L.kind} is a boss kind`);
  // places: walkable, reachable from the junction on the 40 px grid, and the new ones clear of every wild camp
  const G = 40, cols = Math.ceil(M.W / G), rows = Math.ceil(M.H / G), seen = new Uint8Array(cols * rows), q = [[80, 80]]; seen[80 * cols + 80] = 1;   // (3200, 3200) is open ground by the junction
  while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx] || !M.walkable(nx * G, ny * G, 12)) continue; seen[ny * cols + nx] = 1; q.push([nx, ny]); } }
  const camps = FoundingSim.WILD.CAMPS;
  CH.LINKS.forEach((L, i) => {
    const sp = L.fx === 'twins' ? L.ends[0] : L.spawn, gx = Math.round(sp[0] / G), gy = Math.round(sp[1] / G);
    check(L.pond || M.walkable(sp[0], sp[1], 12), `link ${i + 1} stands on walkable ground`);
    if (!L.pond) check(seen[gy * cols + gx] === 1, `link ${i + 1} (${L.id}) is reachable on foot`);
    if (i >= 4) { const dc = Math.min(...camps.map(c => hyp(c.x - L.place[0], c.y - L.place[1]))); check(dc >= 450, `link ${i + 1} is ${Math.round(dc)} px from the nearest wild camp (450 wanted)`); }
  });
  const sep = []; for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) sep.push(hyp(CH.LINKS[i].place[0] - CH.LINKS[j].place[0], CH.LINKS[i].place[1] - CH.LINKS[j].place[1]));
  check(Math.min(...sep) >= 250, 'no two links share ground: nearest pair ' + Math.round(Math.min(...sep)) + ' px (the Ash Mother cave and the crater rim above it are the closest)');
}

function sectionWake() {
  console.log('Waking:');
  const sim = makeSim(4, 11), C = sim.chain;
  place(sim, 3470, 524);
  sim.intent('p0', { k: 'carry' });
  check(!C.rung, 'the bell does nothing before wave 3');
  { const h = sim.heroes[1], k0 = [h.x, h.y]; h.x = C.bell[0] + 20; h.y = C.bell[1]; check(!sim.useSpot(h), 'no G over the bell before it answers'); h.x = k0[0]; h.y = k0[1]; }
  sim.wave = 3;
  const far = sim.heroes[0]; const keep = [far.x, far.y]; far.x = 1200; far.y = 1900; sim.intent('p0', { k: 'carry' });
  check(!C.rung, 'the bell is only rung up close'); check(!sim.useSpot(far), 'and no G shows from afar'); far.x = keep[0]; far.y = keep[1];
  sim.heroes[1].x = C.bell[0] + 20; sim.heroes[1].y = C.bell[1];
  { const u = sim.useSpot(sim.heroes[1]); check(u && u[0] === C.bell[0] && u[1] === C.bell[1], 'a hero beside the bell sees a G over it (useSpot)'); }
  sim.heroes[1].dirty = true; for (let i = 0; i < 8; i++) sim.tick(DT); check(Array.isArray(sim.heroes[1].useAt) && sim.heroes[1].useAt[0] === C.bell[0], 'and the sheet carries it (ua)');
  sim.intent('p1', { k: 'carry' }); sim.tick(DT);
  check(!sim.useSpot(sim.heroes[1]) || sim.useSpot(sim.heroes[1])[0] !== C.bell[0], 'once rung, the G over the bell goes');
  check(C.rung && evs(sim, 'chbell').length === 1, 'the bell rings from wave 3 (chbell)');
  for (let i = 0; i < 40; i++) sim.tick(DT);
  check(!C.boss, 'the Ram does not come at once');
  for (let i = 0; i < 40; i++) sim.tick(DT);
  const ram = C.boss;
  check(ram && ram.kind === 'ram' && !ram.dead, 'the Ram arrives about three seconds after the bell');
  check(evs(sim, 'boss').length === 1 && evs(sim, 'chfound').length === 1, 'boss + chfound events');
  check(ram && ram.max === CH.LINKS[0].hp, 'the Ram has its one fixed health: ' + (ram && ram.max));
  sim.intent('p0', { k: 'carry' }); check(evs(sim, 'chbell').length === 1, 'the bell rings only once');
  const row = sim.snapshot(true).e.find(r => r[0] === ram.id); check(row && (row[6] & FoundingSim.FLAG.BOSS), 'the Ram is flagged as a boss in the snapshot');
  const props = sim.snapshot(true).props; check(Array.isArray(props.chb) && props.chb[2] === 1 && Array.isArray(props.chn), 'props chb/chn are sent');
  // party-size scaling
  // no party-size scaling: one fixed health and one fixed hit for 1-4 heroes
  for (const N of [1, 2, 3]) { const s = makeSim(N, 5); s.wave = 3; place(s, 3470, 524); s.heroes[0].x = s.chain.bell[0]; s.heroes[0].y = s.chain.bell[1]; s.intent('p0', { k: 'carry' }); for (let i = 0; i < 90; i++) s.tick(DT); check(s.chain.boss && s.chain.boss.max === CH.LINKS[0].hp, `${N}p: the Ram has the same health (${s.chain.boss && s.chain.boss.max})`); }
  for (let i = 0; i < 10; i++) {
    const hp = [1, 2, 3, 4].map(N => { const q = startLink(i, 70 + i, N); return q.e && q.e.max; });
    check(hp.every(x => x === CH.LINKS[i].hp), `link ${i + 1} has one fixed health for 1-4 heroes: ${hp.join(' / ')}`);
  }
  {   // one fixed hit: the same strike on one hero does the same damage with 1, 2, 3 or 4 heroes in the party
    const dmg = [1, 2, 3, 4].map(N => {
      const { sim, e } = startLink(4, 77, N), seen = []; const orig = sim.hurtHero.bind(sim); sim.hurtHero = (h, amt, src, o) => { if (src && src.chain !== undefined && !src.chainMinion) seen.push(amt); return orig(h, amt, src, o); };
      for (const h of sim.heroes) h.invul = 0; e.ai.tgt = sim.heroes[0]; for (let k = 0; k < 2; k++) { begin(sim, e, 'fist', sim.heroes[0]); hold(sim, e, 50); }
      return seen[0];
    });
    check(dmg.every(x => x !== undefined && x === dmg[0]), 'a Stone fist does the same damage with 1-4 heroes: ' + dmg.join(' / '));
  }
}

// every strike of a chain boss lands only after its telegraph ran its full warning (thorn patches only once armed)
function guardTelegraphs(sim) {
  const stat = { hits: 0, bad: 0, zone: 0 };
  const orig = sim.hurtHero.bind(sim);
  sim.hurtHero = function (h, amt, src, o) {
    if (src && (src.chain !== undefined || src.chainX) && !src.chainMinion) {
      stat.hits++;
      const ok = o && o.zone ? sim.chain.zones.some(z => z.armed) : sim.chain.live.some(t => sim.time - t.t0 >= t.warn - 0.07);
      if (o && o.zone) stat.zone++;
      if (!ok) stat.bad++;
    }
    return orig(h, amt, src, o);
  };
  return stat;
}

// the full chain, a scripted party that goes at once. Returns the numbers.
function runChain(seed, opts) {
  opts = opts || {}; const nLinks = opts.until || 10;
  const sim = makeSim(4, seed), C = sim.chain, G = guardTelegraphs(sim);
  sim.wave = FAST_WAVE; sim.time = D.waveStartAt(FAST_WAVE); levelTo(sim, FAST[0]); topUp(sim, SHOP[0]); place(sim, 3470, 524);   // the quick party: level 6 by wave 3, well ahead of the human pace; then the suited levels
  const t0 = sim.time, kills = [], wakes = [], sizes = [], deaths = [], stoneSeen = { max: 0 };
  sim.heroes[0].x = C.bell[0]; sim.heroes[0].y = C.bell[1]; sim.intent('p0', { k: 'carry' });
  let prev = CH.LINKS[0].place;
  for (let link = 0; link < nLinks; link++) {
    const L = CH.LINKS[link];
    if (link > 0) {
      const tDown = kills[link - 1];
      let guard = 0; while (C.st[link] === 'gap' && guard++ < 20000) sim.tick(DT);
      const w = evs(sim, 'chwake').filter(e => e[1][1] === link); check(w.length === 1, `link ${link + 1} announced once`);
      const gapSecs = w[0][0] - tDown; wakes.push(gapSecs);
      check(gapSecs >= CH.TUNE.gapMin - 1 && gapSecs <= CH.TUNE.gapMax + 1, `link ${link + 1} wakes ${gapSecs.toFixed(0)} s after the last kill (${CH.TUNE.gapMin}-${CH.TUNE.gapMax})`);
      check(hyp(w[0][1][2] - L.place[0], w[0][1][3] - L.place[1]) <= CH.TUNE.hintJitter * 1.5, `link ${link + 1}'s hint points roughly at it`);
      check(!C.boss, `link ${link + 1} is not on the field until someone comes`);
      levelTo(sim, FAST[link]); topUp(sim, SHOP[link]);   // the levels a quick party has when it gets there, and the shop gear a party reasonably holds (the chain's own drops it keeps)
      // a quick party walks at once: straight line over 150 px/s, a third again for the road
      const walkSecs = 1.35 * hyp(L.place[0] - prev[0], L.place[1] - prev[1]) / 150; for (let i = 0; i < walkSecs / DT; i++) sim.tick(DT);
      for (let i = 0; i < 20; i++) sim.tick(DT); check(!C.boss, `link ${link + 1} stays asleep while the party is away`);
      const sp = sim.nearestWalkable(L.place[0] - 20, L.place[1] + 160, 14);
      place(sim, sp[0], sp[1] - 60);
      for (let i = 0; i < 6; i++) sim.tick(DT);
    }
    for (let i = 0; i < 100 && !C.boss; i++) sim.tick(DT);
    check(C.boss && C.boss.chain === link, `link ${link + 1} (${L.id}) is on the field`);
    check(C.boss && C.boss.def.name === L.name, 'boss bar name: ' + (C.boss && C.boss.def.name));
    place(sim, C.boss.x - (L.pond ? 120 : 0), C.boss.y + 90);
    const moves = new Set(); const evN = sim.log.ev.length;
    const res = fight(sim, { limit: link === 9 ? 900 : 420, onTick: () => { if (C.stones.length > stoneSeen.max) stoneSeen.max = C.stones.length; } });
    for (const e of sim.log.ev.slice(evN)) if (e[1][0] === 'chm') moves.add(e[1][2]);
    if (process.env.DBG && C.st[link] !== 'done') console.log('   STUCK', link, C.pack && JSON.stringify(C.pack.hs.map(b => [b.dead, Math.round(b.hp), Math.round(b.x), Math.round(b.y), !!b.ai.mv, b.ai.tgt && b.ai.tgt.dead])), C.boss && [Math.round(C.boss.hp), C.boss.invuln, Math.round(C.boss.x), Math.round(C.boss.y)], JSON.stringify(sim.heroes.map(h => [Math.round(h.x), Math.round(h.y), h.dead, Math.round(h.hp)])), C.rage, C.fightT);
    sizes.push(res.secs); deaths.push(res.deaths);
    check(C.st[link] === 'done', `link ${link + 1} falls (${res.secs.toFixed(0)} s, ${res.deaths} falls, moves: ${[...moves].join(' ')})`);
    kills.push(sim.time);
    if (link >= 4) check(moves.size >= 3, `link ${link + 1} is a set piece: ${moves.size} different moves`);
    if (link <= 8) check(res.secs >= 70 && res.secs <= CH.TUNE.rageAt + 48, `link ${link + 1} takes about two minutes for a quick party (level ${FAST[link]}): ${res.secs.toFixed(0)} s`);
    else check(res.secs >= 150 && res.secs <= CH.TUNE.rageAtLast + 36, `the tenth takes about four minutes (level ${FAST[link]}): ${res.secs.toFixed(0)} s`);
    const held = sim.heroes.filter(h => h.items.some(x => x && x.id === L.item)); check(held.length === 1, `link ${link + 1} drops ${L.item} to one hero`);
    check(evs(sim, 'chdown').some(e => e[1][1] === link), 'chdown event');
    check(C.live.length === 0 && C.zones.length === 0 && !sim.enemies.some(e => !e.dead && (e.chainMinion || e.chainX)), `link ${link + 1} leaves nothing behind`);
    settle(sim); place(sim, M.P.spring[0] + 50, M.P.spring[1] - 60); prev = [M.P.spring[0], M.P.spring[1]];   // the party waits at the spring
  }
  const total = sim.time - t0;
  return { sim, C, G, kills, wakes, sizes, deaths, total, tEnd: sim.time, stoneSeen };
}

// the full ten-link run is played on a few seeds (CHSEED=n plays one), so a result that only one seed gives cannot hide a fault. 31, 35 and 39 are the
// slow and quick tails of a 40-seed sweep (a fight a few seconds past the fury's first step, a tenth a little under four minutes): the bands below cover them
const CHAIN_SEEDS = process.env.CHSEED ? [+process.env.CHSEED] : [36, 5, 31, 39];
function sectionChain() {
  console.log(`The chain (four heroes, scripted, all ten links; seeds ${CHAIN_SEEDS.join(', ')}):`);
  for (const seed of CHAIN_SEEDS) sectionChainSeed(seed);
}
function sectionChainSeed(seed) {
  SEEDTAG = ' [seed ' + seed + ']';
  const R = runChain(seed), { sim, C, G } = R;
  console.log(`  seed ${seed}: fight seconds ${R.sizes.map(s => s.toFixed(0)).join(' / ')}  falls ${R.deaths.join('/')}  gaps ${R.wakes.map(s => s.toFixed(0)).join(' / ')}`);
  console.log(`  telegraphed hits ${G.hits} (thorn ticks ${G.zone}), untelegraphed ${G.bad}; the whole chain: ${(R.total / 60).toFixed(1)} min, ending ${R.tEnd.toFixed(0)} s into the run (the siege comes at ${D.waveStartAt(30)} s)`);
  check(G.hits > 150, 'bosses struck many times: ' + G.hits);
  check(G.zone > 5, 'thorn patches burned: ' + G.zone);
  check(G.bad === 0, 'every boss strike came after its telegraph: ' + G.bad + ' did not');
  check(R.stoneSeen.max >= 4, 'the Lantern Warden raised its stones (' + R.stoneSeen.max + ')');
  check(C.over, 'the chain ends after the tenth link');
  check(R.tEnd < D.waveStartAt(30), 'the whole chain fits before the siege for a quick party that starts at wave ' + FAST_WAVE + ': ' + R.tEnd.toFixed(0) + ' < ' + D.waveStartAt(30));
  const before = evs(sim, 'chwake').length; for (let i = 0; i < 20 * 400; i++) sim.tick(DT); check(evs(sim, 'chwake').length === before, 'nothing wakes after the last link');
  const paid = 15 + 20 + 25 + 30 + 35 + 40 + 45 + 50 + 55 + 60; check(C.paid === paid, 'chain gold is 15..60 = ' + C.paid);
  sim.finish(false);
  const gb = sim.log.end.goldBy.p0; check(gb && gb.chain === paid, 'fdend goldBy.chain = ' + (gb && gb.chain));
  check(sim.log.end.gold.p0 === gb.waves + gb.quests + gb.hold + gb.chain, 'the gold total includes the chain');
  check(sim.heroes.every(h => h.items.filter(x => x && CH.ITEMS.some(c => c[0] === x.id)).length >= 1), 'the drops spread over the party (each hero holds at least one)');
  SEEDTAG = '';
}

function sectionAfterThree() {
  console.log('Optional acts, leash, siege:');
  const arm = (seed, wave) => { const sim = makeSim(4, seed), C = sim.chain; sim.wave = wave || 3; return { sim, C }; };
  // the Pike: a lit brand held at the pool before it arrives
  {
    const sim = makeSim(4, 31), C = sim.chain; sim.wave = 3; place(sim, 3470, 524); sim.heroes[0].x = C.bell[0]; sim.heroes[0].y = C.bell[1]; sim.intent('p0', { k: 'carry' });
    for (let i = 0; i < 80; i++) sim.tick(DT);
    const ram = C.boss; ram.hp = 1; sim.dmgE(ram, 5, sim.heroes[0]);
    check(C.st[0] === 'done' && C.st[1] === 'gap', 'killing the Ram starts the next gap');
    const h = sim.heroes[1]; h.x = 4165; h.y = 3255; h.brand = 60; for (let i = 0; i < 20 * 12; i++) { h.brand = 60; sim.tick(DT); }
    check(C.bonus[1] && evs(sim, 'chbonus').length === 1, 'a lit brand held at the pool weakens the Pike (chbonus)');
    while (C.st[1] === 'gap') sim.tick(DT);
    place(sim, 4210, 3400); for (let i = 0; i < 40; i++) sim.tick(DT);
    check(C.boss && C.boss.kind === 'pike' && C.boss.max === Math.round(CH.LINKS[1].hp * CH.TUNE.weaken), 'the weakened Pike has 80% health: ' + (C.boss && C.boss.max));
    settle(sim); place(sim, 800, 3800); sim.heroes.forEach((hh, i) => { hh.x = 698 + i * 20; hh.y = 3880; hh.invul = 1e6; });   // (all four far away and standing: a hero who fell in the fight would respawn at the spring, which is near the Pike)
    const bossE = C.boss; for (let i = 0; i < 20 * 18; i++) { sim.tick(DT); }
    check(bossE.dead && C.st[1] === 'placed' && !C.boss && evs(sim, 'chlose').length === 1, 'the Pike slips back when the party leaves (chlose)');
    place(sim, 4210, 3400); for (let i = 0; i < 40; i++) sim.tick(DT);
    check(C.boss && C.boss.kind === 'pike' && C.boss.hp > C.boss.max * 0.99, 'it comes back whole when found again');
  }
  // the oak: six cuts before the Stumpwarden arrives
  {
    const sim = makeSim(2, 41), C = sim.chain; sim.wave = 3; C.st[2] = 'dormant';
    sim.heroes[0].x = C.oak[0]; sim.heroes[0].y = C.oak[1] + 40;
    for (let k = 0; k < 8; k++) { sim.intent('p0', { k: 'carry' }); for (let i = 0; i < 18; i++) sim.tick(DT); }
    check(C.bonus[2] && C.cuts === 6 && evs(sim, 'chcut').length === 6, 'six cuts at the carved oak weaken the Stumpwarden');
  }
  // the nest: a brand at the cave
  { const { sim, C } = arm(42); const h = sim.heroes[0]; h.x = CH.LINKS[3].place[0]; h.y = CH.LINKS[3].place[1] + 40; h.brand = 40; sim.intent('p0', { k: 'carry' }); check(C.bonus[3], 'a brand at the Ash Mother\'s cave weakens her'); }
  // the dark lantern, the stag's clearing, the fence line, the rockfall, the kennel posts
  {
    const { sim, C } = arm(43); const h = sim.heroes[0];
    const g0 = sim.heroes[3]; g0.x = C.acts.lantern[0]; g0.y = C.acts.lantern[1] + 30; sim.intent('p3', { k: 'carry' }); check(!C.bonus[4], 'the dark lantern needs a lit brand');
    h.x = C.acts.lantern[0]; h.y = C.acts.lantern[1] + 30; h.brand = 40; sim.intent('p0', { k: 'carry' }); sim.tick(DT); check(C.bonus[4] && evs(sim, 'chbonus').some(e => e[1][1] === 4), 'a lit brand at the dark lantern weakens the Warden');
    const g = sim.heroes[1]; g.x = C.acts.stagFire[0]; g.y = C.acts.stagFire[1] + 40; for (let i = 0; i < 20 * 8; i++) { g.brand = 60; sim.tick(DT); }
    check(C.bonus[5], 'a brand held in the Stag\'s clearing weakens it');
    for (const p of C.acts.posts) { sim.heroes[2].x = p.x + 10; sim.heroes[2].y = p.y; sim.tick(DT); }
    check(C.bonus[6] && evs(sim, 'chpost').filter(e => e[1][1] === 6).length === 3, 'three fence posts touched weaken the Drover');
    const p = sim.heroes[3]; p.x = C.acts.pile[0]; p.y = C.acts.pile[1] + 30; for (let k = 0; k < 3; k++) { sim.intent('p3', { k: 'carry' }); for (let i = 0; i < 20; i++) sim.tick(DT); }
    check(C.bonus[7], 'the rockfall toppled twice weakens the Twins');
    for (const q of C.acts.kennel) { sim.heroes[0].x = q.x; sim.heroes[0].y = q.y; sim.tick(DT); }
    check(C.bonus[8], 'three kennel posts touched weaken the pack');
    const pr = sim.snapshot(true).props; check(Array.isArray(pr.chl), 'props chl (landmarks) are sent');
  }
  // the siege ends the chain
  {
    const sim = makeSim(4, 51), C = sim.chain; sim.wave = 3; place(sim, 3470, 524); sim.heroes[0].x = C.bell[0]; sim.heroes[0].y = C.bell[1]; sim.intent('p0', { k: 'carry' });
    for (let i = 0; i < 80; i++) sim.tick(DT); const ram = C.boss;
    sim.wave = D.LAST_WAVE - 1; sim.hook('wave', D.LAST_WAVE);
    sim.tick(DT); check(C.over && ram.dead && evs(sim, 'chend').length === 1, 'the siege begins: the chain stops and the Ram is gone');
    const chn = sim.snapshot(true).props.chn; check(Array.isArray(chn) && chn[5] === 1, 'props.chn says the chain is over');
    const s2 = makeSim(2, 52); s2.wave = D.LAST_WAVE; s2.chain.over = true; s2.heroes[0].x = s2.chain.bell[0]; s2.heroes[0].y = s2.chain.bell[1]; s2.intent('p0', { k: 'carry' }); check(!s2.chain.rung, 'no bell at the siege');
  }
  // a siege in the middle of the pack fight clears every body and patch
  {
    const { sim, C } = startLink(8, 53); check(C.pack && C.bodies.length === 3, 'the pack is three hounds and a leader'); sim.hook('wave', D.LAST_WAVE); sim.tick(DT);
    check(C.over && !sim.enemies.some(e => !e.dead && e.chainX), 'the siege clears the pack');
  }
  // a run without the bell has no chain gold and no change to the payout
  { const sim = makeSim(2, 61); sim.wave = 5; sim.time = 600; sim.finish(false); const gb = sim.log.end.goldBy.p0; check(gb.chain === 0, 'no chain gold without the chain'); }
}

// each set piece's own rules
function startLink(i, seed, N) {
  const sim = makeSim(N || 4, seed || 70 + i), C = sim.chain; sim.wave = 3; levelUp(sim, 8); C.cur = i; C.st[i] = 'placed'; C.over = false;
  const L = CH.LINKS[i]; place(sim, L.place[0], L.place[1] + 120);
  for (let k = 0; k < 120 && !C.boss; k++) sim.tick(DT);
  for (const h of sim.heroes) h.invul = 0;
  return { sim, C, L, e: C.boss };
}
function hold(sim, e, n) { for (let i = 0; i < n; i++) { e.ai.rest = 99; sim.tick(DT); } }
function begin(sim, e, name, tg) { e.ai.mv = null; e.ai.tgt = tg; e.ai.tgtT = 99; e.ai.intro = 0; e.ai.rest = 99; e.ai.force = null; e.ai.wind = false; return sim.chain._begin(e, name); }
function sectionPieces() {
  console.log('The set pieces:');
  // 5. the Lantern Warden: a gaze is stopped by a stone, and the stone cracks away on the second
  {
    const { sim, C, e } = startLink(4); for (const h of sim.heroes) h.invul = 1e6;
    check(e && e.kind === 'lanternwarden' && C.stones.length === 4, 'the Warden stands among four stones');
    const s = C.stones[0], h = sim.heroes[0], a = Math.atan2(s.y - e.y, s.x - e.x);
    for (const o of C.stones) if (o !== s) o.x += 7000;   // (the others out of the way for the line test)
    for (const o of sim.heroes) if (o !== h) { o.dead = true; o.respT = 1e9; }   // (and they stay down for the test)
    h.x = s.x + Math.cos(a) * 90; h.y = s.y + Math.sin(a) * 90;   // a hero right behind that stone
    const guard = { hurt: 0 }; const orig = sim.hurtHero.bind(sim); sim.hurtHero = (hh, amt, src, o) => { guard.hurt++; return orig(hh, amt, src, o); };
    for (let k = 0; k < 2; k++) { begin(sim, e, 'gaze', h); hold(sim, e, 40); }
   
    check(guard.hurt === 0, 'two gazes at a hero behind a stone burn nobody');
    check(!C.stones.includes(s), 'the stone cracks away after the second gaze'); check(evs(sim, 'chbreak').length >= 1, 'chbreak event');
  }
  {
    const { sim, C, e } = startLink(4, 91); const h = sim.heroes[1]; C.stones.length = 0;
    h.hp = h.max; h.x = e.x + 200; h.y = e.y; const hp0 = h.hp;
    for (const o of sim.heroes) if (o !== h) { o.dead = true; o.respT = 1e9; }   // (and they stay down for the test) begin(sim, e, 'gaze', h); hold(sim, e, 40); check(h.hp < hp0, 'with no stone between, the gaze burns');
    const stones = C.stones.length; e.hp = e.max * 0.65; e.ai.gate = 0; e.ai.intro = 5; sim.tick(DT); check(C.stones.length > stones, 'the Warden relights its dais as it weakens');
  }
  // 6. the Hollow Stag: thorns stay for 8 s and burn
  {
    const { sim, C, e } = startLink(5); const h = sim.heroes[0]; h.x = e.x + 200; h.y = e.y;
    for (const o of sim.heroes) o.invul = 1e6;
    begin(sim, e, 'bellow', h); hold(sim, e, 40);
    const z = C.zones.length; check(z === 8, 'the bellow plants a ring of eight thorn patches: ' + z);
    hold(sim, e, 20 * 5); check(C.zones.length === z, 'thorns stay five seconds later');
    hold(sim, e, 20 * 6); check(C.zones.length === 0, 'thorns are gone after eight');
    const hh = sim.heroes[1]; begin(sim, e, 'bellow', h); hold(sim, e, 40); const p = C.zones[0]; hh.invul = 0; hh.x = p.x; hh.y = p.y; hh.hp = hh.max; hold(sim, e, 40); check(hh.hp < hh.max, 'standing in thorns burns');
  }
  // 7. the Drover: a stampede leaves one gap, and a cairn gives a second
  {
    const { sim, C, e } = startLink(6); const h = sim.heroes[0];
    begin(sim, e, 'stampede', h); const lanes = C.live.filter(t => t.shape === 1);
    check(lanes.length === 4, 'a stampede paints four lanes of five slots, one gap: ' + lanes.length);
    const ang = lanes[0].a, px = -Math.sin(ang), py = Math.cos(ang), offs = lanes.map(t => t.x * px + t.y * py).sort((a, b) => a - b), gaps = []; for (let i = 1; i < offs.length; i++) gaps.push(offs[i] - offs[i - 1]);
    if (process.env.DBG) console.log('   gaps', gaps.map(Math.round), lanes.length, lanes.map(t => [Math.round(t.x), Math.round(t.y), t.a.toFixed(2)]));
    check(gaps.some(g => g > 200) && gaps.every(g => g > 100), 'the lanes sit in slots, with a gap wider than a lane between two');
    check(lanes.every(t => t.col === 0), 'the lanes are red');
    for (let i = 0; i < 50; i++) sim.tick(DT);
    begin(sim, e, 'cairn', h); const blue = C.live.find(t => t.col === 1); check(!!blue, 'the cairn call is a blue circle');
    for (const o of sim.heroes) { o.x = blue.x; o.y = blue.y; o.invul = 1e6; } for (let i = 0; i < 50; i++) sim.tick(DT);
    check(C.stones.some(s => s.cairn) && evs(sim, 'chcairn').length === 1, 'a cairn rises where the party stood');
    begin(sim, e, 'stampede', h); if (process.env.DBG) console.log('   cairn lanes', C.live.filter(t => t.shape === 1).length, C.stones.length, C.live.length);
    check(C.live.filter(t => t.shape === 1).length === 3, 'with the cairn the herd has two gaps (three lanes)');
    for (let i = 0; i < 50; i++) sim.tick(DT); check(!C.stones.some(s => s.cairn), 'the herd tramples the cairn');
    begin(sim, e, 'calf', h); for (let i = 0; i < 30; i++) sim.tick(DT); check(sim.enemies.some(x => !x.dead && x.kind === 'stonecalf'), 'the lost calf runs out');
  }
  // 8. the Gorge-Twins: one health pool, a tether between them, and the gap closes at the end
  {
    const { sim, C, e } = startLink(7); const B = C.tw && C.tw.B; check(B && !B.dead && e.kind === 'gorgetwin', 'two twins stand at the road\'s two ends');
    check(hyp(B.x - e.x, B.y - e.y) > 250, 'the ends are ' + Math.round(hyp(B.x - e.x, B.y - e.y)) + ' px apart');
    for (const h of sim.heroes) h.invul = 1e6;
    sim.dmgE(B, 1000, sim.heroes[0]); sim.tick(DT); check(Math.abs(e.hp - B.hp) < 1 && e.hp < e.max - 500, 'damage to one twin is damage to both: ' + Math.round(e.hp) + ' / ' + Math.round(B.hp));
    sim.dmgE(e, 500, sim.heroes[0]); sim.tick(DT); check(Math.abs(e.hp - B.hp) < 1 && e.hp < e.max - 850, 'and the other way too');
    begin(sim, e, 'tether', sim.heroes[0]); const ln = C.live.find(t => t.shape === 1);
    check(ln && Math.abs(ln.b - hyp(B.x - e.x, B.y - e.y)) < 2, 'the tether is a red lane from twin to twin');
    for (let i = 0; i < 40; i++) sim.tick(DT);
    e.hp = B.hp = e.max * 0.24; C.tw.pool = e.hp; sim.tick(DT); check(B.dead && evs(sim, 'chfell').length === 1 && e.ai.dmgMul > 1.2, 'at a quarter one twin shatters and the other burns hotter');
    sim.dmgE(e, 1e9, sim.heroes[0]); check(e.dead, 'the pool empties and the last twin falls');
  }
  // 9. the pack: the leader cannot be hurt while a hound lives, and takes a move from each that falls
  {
    const { sim, C, e } = startLink(8); const P = C.pack; check(P && P.hs.length === 3 && e.invuln, 'three hounds and an untouchable leader');
    const h0 = e.hp; sim.dmgE(e, 5000, sim.heroes[0]); check(e.hp === h0, 'the leader takes no damage while a hound lives');
    const names0 = Object.keys(e.ai.moves).length; sim.dmgE(P.hs[0], 1e6, sim.heroes[0]); sim.tick(DT);
    check(Object.keys(e.ai.moves).length === names0 + 1 && evs(sim, 'chhound').length === 1, 'a fallen hound gives the leader its move');
    sim.dmgE(P.hs[1], 1e6, sim.heroes[0]); sim.dmgE(P.hs[2], 1e6, sim.heroes[0]); sim.tick(DT);
    check(!e.invuln && Object.keys(e.ai.moves).length === names0 + 3, 'with all three down the leader can be hurt and has all their moves');
  }
  // 10. the Shadow: it wears a shape for each ninth of its first three quarters, an Ash-fall between, and a colossus at the end
  {
    const { sim, C, e } = startLink(9); for (const h of sim.heroes) h.invul = 1e6; e.ai.intro = 99;
    check(C.shape === 0 && evs(sim, 'chshape').length === 1, 'it begins in the first shape');
    const worn = [0]; for (let k = 1; k <= 8; k++) { e.hp = e.max * (1 - 0.75 / 9 * k - 0.002); sim.tick(DT); worn.push(C.shape); }
    check(worn.join('') === '012345678', 'nine shapes over the first three quarters of its health: ' + worn.join(','));
    check(e.ai.force === 'ashfall', 'an Ash-fall comes between shapes');
    e.hp = e.max * 0.2; sim.tick(DT); check(C.shape === 9 && e.r > 55, 'in the last quarter it is the colossus');
    check(Object.keys(e.ai.moves).includes('quake') && Object.keys(e.ai.moves).includes('stackfall'), 'the colossus has its own, slow, moves');
    check(evs(sim, 'chdim').length >= 1, 'the light starts to dim (chdim)');
    e.hp = e.max * 0.03; sim.tick(DT); check(C.dim >= 0.9, 'and dims on to ' + C.dim);
  }
}

function sectionItems() {
  console.log('Items:');
  const sim = makeSim(4, 81), [bas, cle, pyr, ran] = sim.heroes; sim.wave = 5; levelUp(sim, 8);
  const dummy = sim.spawnAt('chainwhelp', bas.x + 60, bas.y, { update() { } }, { hp: 1e7 });
  sim.giveItem(bas, 'chain5'); const base = sim.hookVal('hit', 100, dummy, ran, {}); sim.dmgE(dummy, 10, bas); const lit = sim.hookVal('hit', 100, dummy, ran, {});
  check(Math.abs(lit / base - 1.1) < 0.02, 'the Eye lights what the wearer strikes: allies hit it 10% harder (' + base + ' -> ' + lit + ')');
  sim.giveItem(cle, 'chain6'); cle.hp = cle.max - 5; cle.invul = 0; sim.hurtHero(cle, 100, dummy, {}); const hp1 = cle.hp; for (let i = 0; i < 90; i++) sim.tick(DT);
  check(cle.hp > hp1 + 10, 'the Hollow Heart returns a quarter of a blow four seconds later (' + hp1 + ' -> ' + Math.round(cle.hp) + ')');
  sim.giveItem(ran, 'chain7'); ran.ranks = [1, 1, 1, 1]; pyr.rootT = 3; pyr.slowT = 3; pyr.x = ran.x + 100; pyr.y = ran.y; ran.ch[3] = 1; ran.cdT[3] = 0;
  sim.release(ran, 'r', { x: dummy.x, y: dummy.y }, 1); check(pyr.rootT === 0 && pyr.hasteT >= 5, 'the Drover\'s Horn frees and hastens the allies near the ultimate');
  sim.giveItem(pyr, 'chain8'); bas.hp = bas.max * 0.4; const b0 = bas.hp; sim.dmgE(dummy, 2000, pyr); check(bas.hp > b0, 'the Gorge-Glass mends the most hurt ally (' + Math.round(b0) + ' -> ' + Math.round(bas.hp) + ')');
  sim.giveItem(bas, 'chain9'); bas.shield = 0; bas.stillT = 2; sim.tick(DT); check(bas.shield > 0, 'the Cairn-Crown shields a still wearer: ' + bas.shield);
  // Founder's Oath: one changed skill per hero
  for (const h of sim.heroes) { h.items.fill(null); h.dead = false; h.hp = h.max; sim.giveItem(h, 'choath'); h.ranks = [1, 1, 1, 1]; }
  const oath = D.ITEM.choath; check(/Brace/.test(oath.text) && /Mend/.test(oath.text) && /Meteor/.test(oath.text) && /Arrow/.test(oath.text), 'the Oath\'s text names a changed skill for each hero');
  for (const h of sim.heroes) { h.shield = 0; h.dirty = true; }
  sim.perfectBlock(bas, dummy); check(cle.shield >= 60 && ran.shield >= 60, 'Oath, Bastion: a Perfect Block shields the party');
  cle.ch[0] = 1; cle.cdT[0] = 0; cle.st.petals = 3; bas.hp = bas.max * 0.3; ran.hp = ran.max * 0.3; pyr.hp = pyr.max * 0.3; pyr.x = bas.x + 60; ran.x = bas.x - 60;
  const hp = [pyr.hp, ran.hp]; sim.release(cle, 'q', { u: bas }, 1); check(pyr.hp > hp[0] && ran.hp > hp[1], 'Oath, Cleric: Mend also mends everyone near its target');
  const c0 = sim.casts; pyr.ch[3] = 1; pyr.cdT[3] = 0; sim.release(pyr, 'r', { x: dummy.x, y: dummy.y }, 1); for (let i = 0; i < 30; i++) sim.tick(DT); check(sim.casts - c0 >= 2, 'Oath, Pyromancer: the Meteor falls twice (' + (sim.casts - c0) + ' casts)');
  const r0 = sim.casts; sim.release(ran, 'q', { x: dummy.x, y: dummy.y }, 1); for (let i = 0; i < 12; i++) sim.tick(DT); check(sim.casts - r0 >= 2, 'Oath, Ranger: a second arrow follows (' + (sim.casts - r0) + ' casts)');
}

// ---------------------------------------------------------------- the rules of the chain: Ultimates for damage, the named enrage, the pace of a human party
// The links meet a party at a level its place in the run suggests (the human pace: level 6 around wave 7, 11 around 13, 16 around 20, 20 around 27; a party that starts the chain at wave 4
// and goes straight on reaches link k about wave 4 + 2.65 k). Gear is what a party reasonably holds there: Rares from the shop, Legendaries once the forge is open, and the chain's own
// drops of the links before (which take slots from the shop gear).
const SUIT = [7, 9, 11, 13, 15, 17, 18, 20, 20, 20];
// a quick, determined party (it farms the wild camps for levels, two or three waves ahead of the human pace) rings the bell at wave 3, the moment it answers, with level 6 and goes straight on
const FAST = [6, 9, 11, 13, 15, 17, 18, 20, 20, 20], FAST_WAVE = 3;
const SHOP = ['r2', 'r2', 'r3', 'r3l1', 'r2l2', 'r2l2', 'r1l3', 'r1l3', 'l4', 'l4m1'];
// gear by name: r<n> Rares, l<n> Legendaries, m<n> Mythics (all shop/forge items, never a chain drop), c<n> the chain drops of the first n links (given first, one hero after another)
function gear(sim, spec, link) {
  const num = k => { const m = new RegExp(k + '([0-9])').exec(spec); return m ? +m[1] : 0; };
  const pick = (h, rar, k) => { const l = D.ITEMS.filter(i => !i.sec && i.rar === rar && (!i.hero || i.hero === h.hero) && i.price > 0); return l[(k * 3 + h.hk) % l.length].id; };
  for (const h of sim.heroes) h.items.fill(null);
  const nc = num('c');
  if (spec === 'drops') for (let k = 0; k < link; k++) sim.giveItem(sim.heroes[k % sim.heroes.length], CH.ITEMS[k][0]);
  else for (let k = 0; k < nc; k++) sim.giveItem(sim.heroes[k % sim.heroes.length], CH.ITEMS[k][0]);
  for (const h of sim.heroes) {
    for (const [rar, k] of [[4, 'm'], [3, 'l'], [2, 'r']]) for (let n = 0; n < num(k); n++) sim.giveItem(h, pick(h, rar, n));
    sim.recalc(h); h.hp = h.max;
  }
}
// "shop gear for link i" with or without the chain's earlier drops
const shopSpec = (i, drops) => SHOP[i] + (drops ? 'c' + i : '');
function levelTo(sim, lv) {   // the level, with every point spent (Q W E first by rank, R and the passive when open)
  for (const h of sim.heroes) { h.level = lv; sim.recalc(h); }
  for (const h of sim.heroes) for (let g = 0; g < 40; g++) {
    if (h.level - sim.spent(h) <= 0) break;
    const o = ['r', 'p', ...['q', 'w', 'e'].sort((a, b) => h.ranks['qwer'.indexOf(a)] - h.ranks['qwer'.indexOf(b)])].filter(s => sim.canLearn(h, s)); if (!o.length) break;
    sim.learn(h, o[0]);
  }
  for (const h of sim.heroes) { sim.recalc(h); h.hp = h.max; }
}
function topUp(sim, spec) {   // bring every hero's shop gear up to the named counts, keeping what they hold (the chain's drops), while slots last
  const num = k => { const m = new RegExp(k + '([0-9])').exec(spec); return m ? +m[1] : 0; };
  for (const h of sim.heroes) {
    // (a full pack sells its cheapest shop piece to make room for the chain's next drop)
    while (!h.items.some(x => !x)) { let w = -1; h.items.forEach((x, k) => { if (x && !D.ITEM[x.id].sec && (w < 0 || D.ITEM[x.id].rar < D.ITEM[h.items[w].id].rar)) w = k; }); if (w < 0) break; h.items[w] = null; }
    for (const [rar, k] of [[4, 'm'], [3, 'l'], [2, 'r']]) {
      const have = h.items.filter(x => x && D.ITEM[x.id] && !D.ITEM[x.id].sec && D.ITEM[x.id].rar === rar).length;
      const l = D.ITEMS.filter(i => !i.sec && i.rar === rar && (!i.hero || i.hero === h.hero) && i.price > 0);
      for (let n = have; n < num(k) && h.items.filter(x => !x).length > 1; n++) sim.giveItem(h, l[(n * 3 + h.hk) % l.length].id);   // (one slot stays free for the link's own drop)
    }
    sim.recalc(h);
  }
}
// one fight of a link from the start: a party of level `lv` with the named gear; opts.noUlt: Pyromancer and Ranger never cast R. Returns { win, secs (to the kill, or to the end), ... }
function scenario(link, lv, spec, seed, opts) {
  opts = opts || {};
  const sim = makeSim(opts.N || 4, seed || 300 + link, opts.heroes), C = sim.chain, L = CH.LINKS[link];
  sim.wave = 3; C.cur = link; C.st[link] = 'placed'; C.over = false; levelTo(sim, lv); gear(sim, spec, link); place(sim, L.place[0], L.place[1] + 80);
  for (let i = 0; i < 120 && !C.boss; i++) sim.tick(DT);
  if (!C.boss) return { win: false, secs: 0, never: true };
  if (process.env.DBG) console.log('   gear', sim.heroes.map(h => h.hero + ' L' + h.level + ' ranks ' + h.ranks.join('') + ' dmg ' + h.dmgMul.toFixed(2) + ' ' + h.items.filter(Boolean).map(x => x.id).join(',')).join(' | '));
  place(sim, C.boss.x - (L.pond ? 120 : 0), C.boss.y + 90);
  const res = fight(sim, { limit: opts.limit || 500, noLift: true, noUlt: !!opts.noUlt });
  if (process.env.DBG) console.log('   scen', link, C.st[link], sim.st, !!C.boss, C.rage, C.fightT.toFixed(0), sim.heroes.map(h => h.dead + ':' + Math.round(h.hp)).join(' '));
  if (process.env.DPS) console.log('   dmg by hero', sim.heroes.map(h => h.hero + ' ' + Math.round(sim.stats[h.id].dmg)).join(' | '), 'secs', res.secs.toFixed(0));
  const done = C.st[link] === 'done';
  return { win: done, secs: res.secs, deaths: res.deaths, rage: C.rage, wiped: sim.st !== 'live', hpLeft: C.boss ? Math.round(C.boss.hp / C.boss.max * 100) : 0, rageAt: link === 9 ? CH.TUNE.rageAtLast : CH.TUNE.rageAt };
}
for (const k of ['rageAt', 'rageAtLast', 'rageStep', 'rageDmg', 'rageRest']) { const o = process.argv.find(x => x.startsWith(k + '=')); if (o) CH.TUNE[k] = +o.slice(k.length + 1); }   // (probe overrides)
for (const o of process.argv.filter(x => /^dm[0-9]+=/.test(x))) CH.LINKS[+o.slice(2, o.indexOf('=')) - 1].dm = +o.slice(o.indexOf('=') + 1);
for (const o of process.argv.filter(x => /^hp[0-9]+=/.test(x))) CH.LINKS[+o.slice(2, o.indexOf('=')) - 1].hp = +o.slice(o.indexOf('=') + 1);
const med = a => a.includes(Infinity) && a.filter(x => x === Infinity).length * 2 >= a.length ? Infinity : medF(a.filter(x => x !== Infinity));
const medF = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor((b.length - 1) / 2)] / 2 + b[Math.ceil((b.length - 1) / 2)] / 2; };
const fmt = r => r.never ? 'never' : (r.win ? '' : r.wiped ? 'W' : '!' + r.hpLeft + '%') + r.secs.toFixed(0);
if (process.argv.includes('--probe')) {   // --probe <link> <level> <gear> [noult] : six seeds
  const a = process.argv, k = a.indexOf('--probe'), i = +a[k + 1] - 1, lv = +a[k + 2] || SUIT[i], spec = a[k + 3] || shopSpec(i, true), noUlt = a.includes('noult');
  const seeds = +(a.find(x => /^seeds=/.test(x)) || 'seeds=4').slice(6); const rs = []; for (let sd = 0; sd < seeds; sd++) rs.push(scenario(i, lv, spec, 600 + sd, { noUlt }));
  console.log(`link ${i + 1} lv ${lv} gear ${spec}${noUlt ? ' noUlt' : ''}: ` + rs.map(fmt).join(' ') + '  avg ' + (rs.reduce((s, r) => s + r.secs, 0) / rs.length).toFixed(0)); process.exit(0);
}

function sectionRules() {
  console.log('Ultimates for damage and the named enrage:');
  // the enrage itself: a step every 12 s after the first, named and shown, rising damage
  {
    const sim = makeSim(4, 330), C = sim.chain; sim.wave = 3; levelTo(sim, 8); C.cur = 0; C.st[0] = 'placed'; C.at = 0; place(sim, 3680, 660); for (let i = 0; i < 100 && !C.boss; i++) sim.tick(DT);
    for (const x of sim.heroes) x.invul = 1e6; C.boss.invuln = true;
    while (C.fightT < CH.TUNE.rageAt - 1) sim.tick(DT); check(C.rage === 0 && C.rageMul === 1, 'no fury before ' + CH.TUNE.rageAt + ' s');
    while (C.fightT < CH.TUNE.rageAt + 30) sim.tick(DT);
    const rg = evs(sim, 'chrage'); check(rg.length >= 2 && rg[0][1][3] === CH.RAGE_NAMES[0], 'the Ram\'s enrage is named and shown: ' + (rg[0] && rg[0][1][3]) + ' x' + rg.length);
    check(Math.abs(C.rageMul - (1 + CH.TUNE.rageDmg * C.rage)) < 1e-9 && C.rage >= 2, 'its damage rises by a fifth a step: x' + C.rageMul.toFixed(2));
    check(CH.RAGE_NAMES.length === 10 && new Set(CH.RAGE_NAMES).size === 10, 'every link has its own named fury');
    check(!evs(sim, 'chshell').length && CH.TUNE.shell === undefined, 'there is no ash shell any more');
  }
  const W = i => (i === 9 ? CH.TUNE.rageAtLast : CH.TUNE.rageAt) + 3 * CH.TUNE.rageStep;   // "overwhelmed": the fury has risen three steps (x1.6) and the fight is still on
  const seeds = [0, 1, 2, 3, 4], run = (i, lv, spec, o) => seeds.map(k => scenario(i, lv, spec, 600 + k, o));
  const secsOf = rs => med(rs.map(r => r.win && r.secs <= 1e9 ? r.secs : Infinity));
  const show = r => r.never ? 'never' : (r.win ? '' : r.wiped ? 'W' : '!') + r.secs.toFixed(0);
  const rowA = [], rowB = [], rowC = [];
  for (let i = 0; i < 10; i++) {
    const w = W(i), lv = SUIT[i];
    // (a) the party's damage Ultimates unused, ordinary shop gear (Rares, and Legendaries where the forge is open), no chain drops: overwhelmed
    const A = run(i, lv, shopSpec(i, false), { noUlt: true, limit: w + 80 }); rowA.push(A);
    const aClear = A.filter(r => r.win && r.secs <= w).length;
    check(aClear <= 1 && secsOf(A) > w, `(a) link ${i + 1}: level ${lv}, no Meteor or Starfall, shop gear ${SHOP[i]}: ${aClear} of ${seeds.length} clear before the fury's third step (${w} s); median ${isFinite(secsOf(A)) ? secsOf(A).toFixed(0) + ' s' : 'no clear'}  [${A.map(show).join(' ')}]`);
    // (b) the level the link meets, R on cooldown, the same gear plus the chain's drops so far: about two minutes (four for the tenth)
    const B = run(i, lv, shopSpec(i, true), { limit: w + 80 }); rowB.push(B);
    const med_b = secsOf(B), lo = i === 9 ? 170 : 85;
    check(B.filter(r => r.win && r.secs <= w).length >= 4 && med_b >= lo && med_b <= w, `(b) link ${i + 1}: level ${lv}, R on cooldown, ${shopSpec(i, true)}: ${B.filter(r => r.win && r.secs <= w).length} of ${seeds.length} clear, median ${med_b.toFixed(0)} s (window ${lo}-${w})  [${B.map(show).join(' ')}]`);
    // the Ultimate is what tips it: the same party with R is clearly quicker than without
    const sameNo = i < 9 ? run(i, lv, shopSpec(i, true), { noUlt: true, limit: w + 80 }) : null;
    if (sameNo) check(secsOf(sameNo) >= med_b * 1.08, `link ${i + 1}: with the same gear, leaving R unused costs time (${med_b.toFixed(0)} s -> ${isFinite(secsOf(sameNo)) ? secsOf(sameNo).toFixed(0) : 'no clear'} s)`);
  }
  // (c) early links, no R (before level 6 there is none), exceptional items: two Mythics still clear links 1-3 before the fury's third step
  for (let i = 0; i < 3; i++) {
    const C2 = run(i, SUIT[i], 'm2c' + i, { noUlt: true, limit: W(i) + 80 }); rowC.push(C2);
    const n = C2.filter(r => r.win && r.secs <= W(i)).length;
    check(n >= 3, `(c) link ${i + 1}: level ${SUIT[i]}, R unused, two Mythics and the chain drops so far: ${n} of ${seeds.length} clear (median ${isFinite(secsOf(C2)) ? secsOf(C2).toFixed(0) : 'no clear'} s)  [${C2.map(show).join(' ')}]`);
  }
  // smaller parties are not scaled for: how two heroes fare at the suited levels and gear (a report, not a pass or a fail)
  for (const link of [0, 4, 9]) for (const heroes of [['bastion', 'ranger'], ['cleric', 'pyromancer']]) {
    const rs = seeds.map(k => scenario(link, SUIT[link], shopSpec(link, true), 600 + k, { N: 2, heroes, limit: W(link) + 120, noLiftOff: 0 })), cl = rs.filter(r => r.win && r.secs <= W(link)).length;
    console.log(`  2 heroes (${heroes.join(' + ')}), link ${link + 1}, level ${SUIT[link]}, ${shopSpec(link, true)}: ${cl} of ${seeds.length} clear in time  [${rs.map(r => r.win ? r.secs.toFixed(0) + ' s' : (r.wiped ? 'wiped at ' + r.secs.toFixed(0) + ' s' : r.hpLeft + '% left at ' + r.secs.toFixed(0) + ' s')).join(', ')}]`);
  }
  console.log('  (a) no R, shop gear (median s): ' + rowA.map(r => { const m = secsOf(r); return isFinite(m) ? m.toFixed(0) : 'x'; }).join(' '));
  console.log('  (b) R on cooldown, gear + drops (median s): ' + rowB.map(r => secsOf(r).toFixed(0)).join(' '));
  console.log('  (c) no R, two Mythics, links 1-3 (median s): ' + rowC.map(r => { const m = secsOf(r); return isFinite(m) ? m.toFixed(0) : 'x'; }).join(' '));
}

function sectionDeterminism() {
  console.log('Determinism:');
  const run = () => { const R = runChain(77, { until: 5 }); return JSON.stringify([R.C.log, R.C.hint, R.sim.log.ev.filter(e => e[1][0].startsWith('ch')).map(e => e[1])]); };
  const a = run(), b = run(); check(a === b, 'two runs with one seed give the same chain');
}

function sectionTune() {
  console.log('Tune (seconds to kill, 4 heroes, scripted, with dodging; levels 4..12):');
  const only = process.argv.find(a => /^--link=/.test(a));
  for (let link = 0; link < CH.BUILT; link++) {
    if (only && +only.slice(7) !== link + 1) continue;
    const sim = makeSim(4, 90 + link); sim.wave = 3; sim.chain.cur = link; sim.chain.st[link] = 'placed'; sim.chain.over = false; levelUp(sim, Math.min(12, 4 + link));
    const L = CH.LINKS[link]; place(sim, L.place[0], L.place[1] + 80); sim.chain.at = 0;
    for (let i = 0; i < 120 && !sim.chain.boss; i++) sim.tick(DT);
    if (!sim.chain.boss) { console.log('  link ' + (link + 1) + ': never spawned'); continue; }
    place(sim, sim.chain.boss.x - (L.pond ? 120 : 0), sim.chain.boss.y + 90);
    const r = fight(sim, { limit: 900 }); console.log(`  link ${link + 1} ${L.id}: ${r.secs.toFixed(0)} s, falls ${r.deaths}, boss hp left ${sim.chain.boss ? Math.round(sim.chain.boss.hp) : 0}`);
  }
}

const FIT_X = [1, 1, 1, 1, 1.12, 1.1, 1, 1, 1, 1];   // (the Pike, the Ash Mother and the Stag lean less on the Ultimate: a little longer, so that without it they still run into the fury)
if (process.argv.includes('--fit')) {   // re-fit the health: scale each link until a party at the link's suited level, with R and its shop gear plus the chain drops so far, takes the target time (115 s; 235 s for the tenth)
  const only = (process.argv.find(x => /^only=/.test(x)) || '').slice(5).split(',').filter(Boolean).map(Number);
  const scale = (i, f) => { CH.LINKS[i].hp = Math.round(CH.LINKS[i].hp * f); if (i === 8) for (const H of CH.HOUNDS) H.hp = Math.round(H.hp * f); };
  const tg = +(process.argv.find(x => /^t=/.test(x)) || 't=115').slice(2);
  for (let round = 0; round < 3; round++) {
    const out = [];
    for (let i = 0; i < 10; i++) {
      if (only.length && !only.includes(i + 1)) continue;
      const tgt = (i === 9 ? 2 : 1) * tg * (FIT_X[i] || 1), rs = [0, 1, 2, 3, 4, 5].map(k => scenario(i, SUIT[i], shopSpec(i, true), 400 + i * 7 + k)), secs = med(rs.map(r => r.win ? r.secs : Infinity)); if (!isFinite(secs)) { scale(i, 0.8); out.push(-1); continue; }
      scale(i, Math.max(0.4, Math.min(3, 1 + (tgt / secs - 1) * 0.9))); out.push(Math.round(secs));
    }
    console.log('round ' + round + ' secs ' + out.join(' ') + '  hp ' + CH.LINKS.map(L => L.hp).join(' ') + '  hounds ' + CH.HOUNDS.map(H => H.hp).join(' '));
  }
  process.exit(0);
}
if (process.argv.includes('--rules')) { sectionRules(); console.log(passed + ' passed, ' + failures + ' failed'); process.exit(0); }
if (TUNE) { sectionTune(); process.exit(0); }
for (const f of [sectionData, sectionWake, sectionChain, sectionAfterThree, sectionPieces, sectionItems, sectionRules, sectionDeterminism]) { try { f(); } catch (e) { failures++; console.log('  EXCEPTION in ' + f.name + ': ' + e.stack); } }
console.log(`\n${passed} checks passed, ${failures} failed.`);
if (failures) { console.log('Chain FAILED'); process.exit(1); }
console.log('Chain OK');
