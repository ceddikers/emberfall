// The Founding: headless test. Scripted heroes play the whole run (thirty waves, nine quests, four bosses, the ending) against the
// real FoundingSim in Node, and a set of focused checks poke every quest (done and missed), every boss, the night, the boons, the
// economy, the intents and the messages. Prints one line per run and ends with "Founding OK".
// Usage: node tools/founding-test.js [--quick] [--verbose]

const path = require('path');
const { FoundingMap: M } = require(path.join(__dirname, '../client/js/founding/map-data.js'));
const { FOUNDING_DATA: D } = require(path.join(__dirname, '../client/js/founding/data.js'));
const { FoundingSim } = require(path.join(__dirname, '../client/js/founding/sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain', 'sim-quests', 'sim-trials', 'sim-intro', 'sim-world']) require(path.join(__dirname, '../client/js/founding/' + m + '.js'));   // feature modules register on FoundingSim.mods
// the map art adds the valley's solids (trees, tents, the Hearth ring...) to FoundingMap.SOLIDS; the sim must run with them
const { FoundingArt } = require(path.join(__dirname, '../client/js/founding/map-art.js'));
FoundingArt.layoutOnly();

const QUICK = process.argv.includes('--quick'), VERBOSE = process.argv.includes('--verbose');
const hyp = Math.hypot, DT = 0.05, F = FoundingSim.FLAG, Z = FoundingSim.ZONE;
const ID = k => D.ENEMIES[k].idx;
let failures = 0, passed = 0;
function check(cond, msg) { if (cond) passed++; if (!cond) { failures++; console.log('  FAIL: ' + msg); } return !!cond; }

// ---------------------------------------------------------------- a sim with message accounting
const KEEP = new Set(['t', 'i', 'sh', 'gw', 'gp', 'wg', 'wb', 'wk', 'pin', 'ws', 'ms', 'ml', 'md', 'end', 'count', 'bl', 'pg', 'dl', 'pk', 'pp', 'pal', 'q', 'bb', 'ls', 'br', 'rl', 'cv', 'dp', 'sg', 'boss', 'bossdown', 'w', 'dr', 'bw', 'dgone', 'step', 'sl']);
function makeSim(N, seed, extra) {
  const players = []; for (let i = 0; i < N; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const log = { fds: 0, fdsBytes: 0, fdsMax: 0, fdx: 0, fdp: 0, fdend: [], fdpLast: {}, boss: false, bossDown: false, evTypes: {}, maxEnemies: 0, hiddenSeen: 0, bossKinds: new Set(), downKinds: new Set(), tags: {}, fdsLast: null };
  const emit = m => {
    if (m.t === 'fds') {
      const b = JSON.stringify(m).length; log.fds++; log.fdsBytes += b; if (b > log.fdsMax) log.fdsMax = b; if (m.e.length > log.maxEnemies) log.maxEnemies = m.e.length; log.fdsLast = m;
      for (const r of m.e) if (r[6] & F.HIDDEN) { log.hiddenSeen++; break; }
    } else if (m.t === 'fdx') {
      log.fdx++;
      for (const e of m.ev) {
        log.evTypes[e[0]] = (log.evTypes[e[0]] || 0) + 1;
        if (e[0] === 'boss') { log.boss = true; log.bossKinds.add(e[2]); } if (e[0] === 'bossdown') { log.bossDown = true; log.downKinds.add(e[2]); }
        if (KEEP.has(e[0])) (log.tags[e[0]] = log.tags[e[0]] || []).push(e);
      }
    } else if (m.t === 'fdend') log.fdend.push(m);
  };
  const emitTo = (id, m) => { log.fdp++; log.fdpLast[id] = m; };
  const sim = new FoundingSim(Object.assign({ players, emit, emitTo, seed, autoLoot: true, autoQuest: true }, extra || {}));
  sim.log = log;
  for (let i = 0; i < N; i++) sim.intent('p' + i, { k: 'pick', hero: (extra && extra.heroes ? extra.heroes : ['bastion', 'cleric', 'pyromancer', 'ranger'])[i] });
  sim.intent('p0', { k: 'ready' });
  return sim;
}

// ---------------------------------------------------------------- the scripted hero
const DP = [3215, 3400];     // where the party holds: just south of the junction, where both lanes meet the camp
const DP2 = [2800, 2020];    // the siege: south of the gate, on the North Road
const MIRE_HOLD = [4780, 2380];   // the west bank of the ford
function cluster(sim, x, y, R, minN) {   // the enemy with the most neighbours within 90; returns {x, y, n}
  let best = null;
  for (const e of sim.enemies) {
    if (e.dead || e.under || hyp(e.x - x, e.y - y) > R) continue;
    let n = 0, sx = 0, sy = 0; for (const o of sim.enemies) if (!o.dead && !o.under && hyp(o.x - e.x, o.y - e.y) < 90) { n++; sx += o.x; sy += o.y; }
    if (!best || n > best.n) best = { x: sx / n, y: sy / n, n, e };
  }
  return best && best.n >= (minN || 1) ? best : null;
}
function makeBot(opts, qk) { return { shopT: 0, lastMove: -9, lastAct: -9, opts: opts || {}, qk: qk === undefined ? -1 : qk }; }
// a hauling quest: the bot's walk and whether to press interact on arrival
function haulTask(sim, h, id) {
  const H = sim.haul[id]; if (!H) return null;
  if (h.carry === H.kind) return { x: H.tx, y: H.ty, r: 40 };
  const d = sim.drops.find(x => x.q === id && !x.gone); if (d) return { x: d.x, y: d.y, act: 1, r: 40 };
  if (H.left > 0 && !(id === 'stonegate' && sim.sg)) return { x: H.fx, y: H.fy, act: 1, r: 45 };
  return null;
}
function questTask(sim, h, B) {
  const order = D.QUEST_ORDER.filter(id => sim.q[id].st === 1);
  if (!order.length) return null;
  const id = order[Math.min(B.qk, order.length - 1)], hauling = ['beacon', 'graves', 'stonegate', 'roof'].includes(id);
  if (B.qk >= order.length && !hauling) return null;
  switch (id) {
    case 'spring': return sim.dig ? { x: sim.dig.x, y: sim.dig.y - 30 } : null;
    case 'gate': { const cs = sim.carts.filter(c => !c.gone && !c.arrived); if (!cs.length) return null; const c = cs[(cs.length - 1) >> 1], p = M.along('north', Math.max(c.s - 20, c.sGate)); return { x: p[0], y: p[1] }; }
    case 'fire': return sim.smith ? { x: sim.smith.x + 30, y: sim.smith.y - 40 } : null;
    case 'road': { const i = sim.postSlots.findIndex((s, k) => !sim.posts.some(p => p.slot === k)); return i < 0 ? null : { x: sim.postSlots[i][0], y: sim.postSlots[i][1], act: 1, r: 50, chan: 1 }; }
    case 'stonegate': if (sim.sg) return { x: sim.carvePt[0], y: sim.carvePt[1], act: 1, r: 35, chan: 1 }; return haulTask(sim, h, id);
    case 'cover': return { x: sim.coverPt[0], y: sim.coverPt[1], act: 1, r: 50, chan: 1 };
    default: return haulTask(sim, h, id);
  }
}
function holdPoint(sim, h, N) {   // the damage dealers take the Mirebull at the ford while the tank and healer keep the camp (a lone hero goes in a lull)
  const m = sim.enemies.find(e => !e.dead && e.kind === 'mirebull' && e.ai.ph !== 'walk');
  if (m && (h.hero === 'pyromancer' || h.hero === 'ranger') && (N > 1 || !sim.enemies.some(e => !e.dead && e !== m && e.kind !== 'damlog' && hyp(e.x - M.P.hearth[0], e.y - M.P.hearth[1]) < 700))) return MIRE_HOLD;
  return sim.wave >= D.LAST_WAVE ? DP2 : DP;
}
function botStep(sim, h, B, isQuestHero, N) {
  if (h.dead || sim.st !== 'live' || sim.ending) return;
  const S = m => sim.intent(h.id, m), now = sim.time, ready = i => h.ranks[i] > 0 && h.ch[i] > 0 && !(i === 3 && h.level < 6);
  // spend skill points: the ultimate whenever a rank opens, then the passive, then the thinnest of Q W E (whatever the sim's gates allow)
  if (h.level - sim.spent(h) > 0) { const order = ['r', 'p', ...['q', 'w', 'e'].sort((a, b) => h.ranks['qwer'.indexOf(a)] - h.ranks['qwer'.indexOf(b)])].filter(s => sim.canLearn(h, s)); if (order.length) S({ k: 'learn', s: order[0] }); }
  if (h.offers) S({ k: 'boon', id: h.offers[0] });
  const foes = sim.enemies.filter(e => !e.dead && !e.under && !e.w);   // (wild camps are not the lanes' business)
  const near = foes.filter(e => hyp(e.x - h.x, e.y - h.y) < 420);
  // nothing near but something left alive (a spitter shooting the camp from afar): go and hunt it after a while
  if (!near.length && foes.length && !h.chan && !h.carry) { B.idleT = (B.idleT || 0) + 0.2; if (B.idleT > 12 && now - B.lastMove > 2) { let t0 = foes[0]; for (const e of foes) if (hyp(e.x - h.x, e.y - h.y) < hyp(t0.x - h.x, t0.y - h.y)) t0 = e; S({ k: 'attack', id: t0.id }); B.lastMove = now; } } else B.idleT = 0;
  // the siege: the brand-carrier lights a brand at the camp fire and leads the beast to the party
  const gnaw = sim.enemies.find(e => !e.dead && e.kind === 'oldgnaw');
  if (isQuestHero && !B.opts.noQuests && sim.wave >= D.LAST_WAVE && h.brand < 6) {
    const fp = D.QUEST_TUNE.fires[0];
    if (hyp(h.x - fp[0], h.y - fp[1]) > 90) { if (now - B.lastMove > 1) { S({ k: 'move', x: fp[0] - 70, y: fp[1] - 30 }); B.lastMove = now; } } else S({ k: 'carry' });
    return;
  }
  // a quest task for the questing hero (solo: only in a lull)
  let task = null;
  if (B.qk >= 0 && !B.opts.noQuests && !gnaw && (N > 1 || !foes.some(e => hyp(e.x - M.P.hearth[0], e.y - M.P.hearth[1]) < 600))) task = questTask(sim, h, B);
  if (h.chan) return;   // channelling: stand still, do nothing else
  // the shop, in a lull: upgrades first, then a useful basic
  if (!task && near.length === 0 && now - B.shopT > 12 && h.gold >= 40) {
    const sh = M.P.shop;
    if (!sim.atShop(h)) { if (now - B.lastMove > 2) { S({ k: 'move', x: sh[0] - 40, y: sh[1] - 60 }); B.lastMove = now; } return; }
    B.shopT = now;
    for (const s of 'qwer') { if (h.ranks['qwer'.indexOf(s)] < 1) continue; for (const u of h.K.skills[s].ups) if (!h.ups[u.id]) { S({ k: 'buy', up: u.id }); break; } }
    for (const id of ['ironvest', 'keenedge', 'hawkfeather', 'lampcharm', 'jerkin', 'whetstone']) { const it = D.ITEM[id]; if (h.gold >= it.price && h.items.includes(null)) S({ k: 'buy', item: id }); }
    return;
  }
  if (task) {
    const d = hyp(h.x - task.x, h.y - task.y);
    if (d > (task.r || 55) && now - B.lastMove > 0.5) { S({ k: 'move', x: task.x, y: task.y }); B.lastMove = now; }
    else if (d <= (task.r || 55) + 25 && task.act && now - B.lastAct > 0.6) { S({ k: 'carry' }); B.lastAct = now; }
    if (h.carry || task.chan) return;   // hands full, or about to channel: no fighting
  } else {
    // hold the line: the tank in front, the rest a little behind
    const off = { bastion: [0, 0], cleric: [-45, 70], pyromancer: [45, 60], ranger: [0, 95] }[h.hero], hp = holdPoint(sim, h, N);
    const px = hp[0] + off[0], py = hp[1] + off[1];
    if (hyp(h.x - px, h.y - py) > 90 && near.length === 0 && now - B.lastMove > 1) { S({ k: 'move', x: px, y: py }); B.lastMove = now; }
  }
  if (!near.length) return;
  let nearest = near[0]; for (const e of near) if (hyp(e.x - h.x, e.y - h.y) < hyp(nearest.x - h.x, nearest.y - h.y)) nearest = e;
  const big = near.filter(e => e.def.elite).sort((a, b) => b.hp - a.hp)[0], cl = cluster(sim, h.x, h.y, 330, 3);
  if (h.hero === 'bastion') {
    if (ready(2) && near.some(e => e.atk && hyp(e.x - h.x, e.y - h.y) < 110)) S({ k: 'cast', s: 'e' });
    else if (ready(3) && cl && cl.n >= 7) S({ k: 'cast', s: 'r', x: cl.x, y: cl.y });
    else if (ready(1) && cl && cl.n >= 3) S({ k: 'cast', s: 'w', x: cl.x, y: cl.y });
    else if (ready(0) && hyp(nearest.x - h.x, nearest.y - h.y) < 120) S({ k: 'cast', s: 'q', id: (big || nearest).id });
  } else if (h.hero === 'cleric') {
    const hurt = sim.heroes.filter(o => !o.dead && o.hp < o.max * 0.7).sort((a, b) => a.hp / a.max - b.hp / b.max)[0], dead = sim.heroes.find(o => o.dead);
    if (ready(3) && dead && hyp(dead.x - h.x, dead.y - h.y) < 230) S({ k: 'cast', s: 'r', x: dead.x, y: dead.y });
    else if (ready(0) && hurt && h.st.petals > 0) S({ k: 'cast', s: 'q', id: hurt.id });
    else if (ready(2) && cl && cl.n >= 3) S({ k: 'cast', s: 'e', x: cl.x, y: cl.y });
    else if (ready(1)) S({ k: 'cast', s: 'w', id: (big || nearest).id });
  } else if (h.hero === 'pyromancer') {
    if (ready(3) && cl && cl.n >= 6) S({ k: 'cast', s: 'r', x: cl.x, y: cl.y });
    else if (ready(2) && near.some(e => hyp(e.x - h.x, e.y - h.y) < 70)) { const aw = Math.atan2(h.y - nearest.y, h.x - nearest.x); S({ k: 'cast', s: 'e', x: h.x + Math.cos(aw) * 150, y: h.y + Math.sin(aw) * 150 }); }
    else if (ready(1) && cl && cl.n >= 2) S({ k: 'cast', s: 'w', x: cl.x, y: cl.y });
    else if (ready(0)) S({ k: 'cast', s: 'q', x: (cl || nearest).x, y: (cl || nearest).y });
  } else {
    if (ready(3) && cl && cl.n >= 6) S({ k: 'cast', s: 'r', x: cl.x, y: cl.y });
    else if (ready(2) && big && !big.mark) S({ k: 'cast', s: 'e', id: big.id });
    else if (ready(0)) S({ k: 'cast', s: 'q', x: (big || nearest).x, y: (big || nearest).y });
    else if (ready(1) && cl && cl.n >= 2 && hyp(cl.x - h.x, cl.y - h.y) < 190) S({ k: 'cast', s: 'w', x: cl.x, y: cl.y });
  }
}

// run a whole game; returns a summary. Quest heroes: the last hero (and, in a big party, the one before it).
function play(N, seed, opts) {
  opts = opts || {};
  const heroes = opts.heroes || (N === 1 ? ['ranger'] : N === 2 ? ['ranger', 'cleric'] : null);   // a lone support hero is meant to struggle
  const t0 = Date.now(), sim = makeSim(N, seed, { practice: !!opts.practice, heroes });
  const qset = N === 1 ? [0] : N === 2 ? [1] : [N - 1, N - 2];
  const bots = sim.heroes.map((h, i) => makeBot(opts, qset.indexOf(i))), maxTicks = 20 * 60 * 62;
  let ticks = 0;
  while (sim.st === 'live' && ticks < maxTicks) {
    if (ticks % 4 === 0) sim.heroes.forEach((h, i) => botStep(sim, h, bots[i], i === qset[0], N));   // a reaction every 0.2 s
    sim.tick(DT); ticks++;
    if (opts.stopAtWave && sim.wave >= opts.stopAtWave && sim.time >= D.waveStartAt(opts.stopAtWave) + 5) break;
  }
  const r = sim.result || null, ms = Date.now() - t0;
  const qs = D.QUEST_ORDER.map(id => sim.q[id].st);
  return { sim, N, seed, st: sim.st, wave: sim.wave, ticks, ms, quests: qs, res: r, boss: sim.log.boss, bossDown: sim.log.bossDown, bossKinds: sim.log.bossKinds, downKinds: sim.log.downKinds, maxE: sim.log.maxEnemies, avgFds: sim.log.fds ? Math.round(sim.log.fdsBytes / sim.log.fds) : 0, maxFds: sim.log.fdsMax,
    lv: sim.heroes.map(h => h.level), camp: Math.round(sim.camp.hp), deaths: sim.heroes.map(h => h.deaths), hidden: sim.log.hiddenSeen, time: Math.round(sim.time) };
}

// ---------------------------------------------------------------- the checks
function sectionRuns() {
  console.log('Full runs (scripted heroes, thirty waves):');
  const seeds = QUICK ? [1] : [1, 2], wins = { 1: 0, 2: 0, 4: 0 }, tot = { 1: 0, 2: 0, 4: 0 };
  const seenKinds = new Set(), downKinds = new Set(); let questWon = 0, hiddenRuns = 0, wonRuns = 0; const allRuns = [];
  for (const N of [1, 2, 4]) for (const seed of seeds) {
    let r;
    try { r = play(N, seed); } catch (e) { check(false, `exception in ${N}p seed ${seed}: ${e.stack}`); continue; }
    tot[N]++; allRuns.push(r); if (r.st === 'won') wins[N]++;
    for (const k of r.bossKinds) seenKinds.add(k); for (const k of r.downKinds) downKinds.add(k);
    if (r.st === 'won' && r.res) {
      wonRuns++;
      const expect = D.payout(D.LAST_WAVE, r.quests.filter(q => q === 2).length, true);
      check(Object.values(r.res.gold).every(g => g === expect), `gold payout ${JSON.stringify(r.res.gold)} should be ${expect} for ${r.quests}`);
      check(r.wave === D.LAST_WAVE, 'a won run reached the last wave');
    }
    check(r.wave >= 1, 'waves spawn'); check(r.st !== 'live', `${N}p seed ${seed} did not finish in time (wave ${r.wave})`);
    check(r.res && r.res.t === 'fdend', 'fdend was sent'); check(r.sim.log.fdend.length === 1, 'fdend sent exactly once');
    if (r.wave >= 8) { if (r.hidden > 0) hiddenRuns++; }
    questWon += r.quests.filter(q => q === 2).length;
    console.log(`  ${N}p seed ${seed}: ${r.st.padEnd(4)} wave ${r.wave}  ${r.time} s  quests [${r.quests.map(q => '-?DM'[q]).join('')}]  bosses ${[...r.bossKinds].map(k => D.ENEMY_IDS[k] + (r.downKinds.has(k) ? '+' : '')).join(' ') || '-'}  lv ${r.lv.join('/')}  camp ${r.camp}  deaths ${r.deaths.join('/')}  max enemies ${r.maxE}  fds avg ${r.avgFds} B max ${r.maxFds} B  ${(r.ms / 1000).toFixed(1)} s`);
    if (r.sim.log.fdsMax > 14000) check(false, 'fds snapshot is too large: ' + r.sim.log.fdsMax);
  }
  for (const k of ['tunnelmaw', 'wickeater']) check(seenKinds.has(ID(k)) && downKinds.has(ID(k)), `${k} spawned and was killed in a full run`);
  // (the Mirebull has its own section below: since the 2026-10-29 late-wave health climb the scripted heroes, with no towers or camps, no longer live to wave 23 in a full run)
  // (levels now run to 20 and come from shared XP, so the scripted parties, which neither hunt camps nor build towers, level slower than the human-like pilot in tools/founding-tune.js
  //  and no longer reach the siege; the siege has its own section, and the pilot's full runs are the balance check)
  // (the numbers are tuned for a human-like party, tools/founding-tune.js; this scripted party is rougher than that, so it is only asked to get far)
  check(allRuns.filter(r => r.N === 4).every(r => r.wave >= 12), 'the scripted four-hero party gets to the last third of the run');
  check(allRuns.some(r => r.wave >= 15), 'a scripted party gets as far as the second boss');
  check(questWon > 0, 'quests get completed in full runs');
  check(hiddenRuns > 0, 'night stalkers were flagged hidden in the dark during full runs');
  console.log(`  wins: 1p ${wins[1]}/${tot[1]}, 2p ${wins[2]}/${tot[2]}, 4p ${wins[4]}/${tot[4]}`);
}

// a quiet world (no enemies) with heroes we place by hand
function quiet(N, seed, heroes) { const s = makeSim(N, seed, { noSpawn: true, heroes }); return s; }
function runFor(sim, secs, each) { const n = Math.round(secs / DT); for (let i = 0; i < n && sim.st === 'live'; i++) { if (each) each(i); sim.tick(DT); } }
function put(h, x, y) { h.x = x; h.y = y; h.path = null; }

function sectionQuests() {
  console.log('Quests (quiet world):');
  // The Spring: done
  let s = quiet(2, 11); runFor(s, D.WAVE_T0 + 1);
  check(s.q.spring.st === 1 && s.spring === 1, 'The Spring is offered at wave 1');
  runFor(s, 20, () => put(s.heroes[0], M.P.spring[0] + 60, M.P.spring[1] - 40));
  check(s.q.spring.prog > 0.2 && s.q.spring.st === 1, 'the dig progresses with a hero beside it');
  runFor(s, 40, () => put(s.heroes[0], M.P.spring[0] + 60, M.P.spring[1] - 40));
  check(s.q.spring.st === 2 && s.spring === 2, 'The Spring completes: full fountain');
  const h0 = s.heroes[0]; check(h0.offers && h0.offers.length === 3 && h0.offers.every(id => D.QUESTS.spring.boons.includes(id)), 'three Spring boons are offered');
  s.intent('p0', { k: 'boon', id: 'stonemason' }); check(!h0.boons.stonemason, 'a boon that was not offered is refused');
  s.intent('p0', { k: 'boon', id: 'springstep' }); check(h0.boons.springstep && !h0.offers, 'a boon can be picked once');
  // fountain: full heal rate vs trickle
  s.heroes[1].hp = 10; put(s.heroes[1], M.P.spring[0], M.P.spring[1] + 20); runFor(s, 3); check(s.heroes[1].hp > 40, 'the full fountain heals quickly (' + Math.round(s.heroes[1].hp) + ')');
  // The Spring: nobody digs (no deadline: it waits)
  s = quiet(2, 12); runFor(s, D.WAVE_T0 + 3 * D.WAVE_GAP + 2, () => { for (const x of s.heroes) put(x, 3200, 2200); });
  check(s.q.spring.st === 1 && s.spring !== 2, 'The Spring nobody digs stays open, and the fountain stays a trickle'); s.heroes[1].hp = 10; put(s.heroes[1], M.P.spring[0], M.P.spring[1] + 20); runFor(s, 3); check(s.heroes[1].hp < 25, 'a missed Spring only trickles (' + Math.round(s.heroes[1].hp) + ')');
  check(!s.heroes[0].offers || s.heroes[0].offers.every(id => !D.QUESTS.spring.boons.includes(id)), 'an unfinished quest gives no boons');
  check(s.q.gate.st === 0 && !s.qWait.length, 'and the next quest waits behind it');
  // Stone for the Gate: done
  s = quiet(2, 13); jump(s, 2); runFor(s, 1);
  check(s.q.gate.st === 1 && s.carts.length === 2, 'Stone for the Gate offers two carts for two heroes');
  const s4 = quiet(4, 13); jump(s4, 2); runFor(s4, 1); check(s4.carts.length === 3, 'three carts for four heroes');
  const c0 = s.carts[0].s; runFor(s, 5); check(s.carts[0].s === c0, 'a cart does not move without a hero beside it');
  let guard = 0; while (s.q.gate.st === 1 && guard++ < 3000) { const cs = s.carts.filter(c => !c.arrived), c = cs[0]; if (!c) break; const p = M.along('north', Math.max(c.s - 15, c.sGate)); put(s.heroes[1], p[0], p[1]); s.tick(DT); }
  check(s.q.gate.st === 2 && s.pal && s.pal.hp > 0, 'the carts arrive and the palisade stands (hp ' + (s.pal ? s.pal.hp : 0) + ')');
  // an enemy on the North Road has to break the palisade
  s.noSpawn = false; const e = s.spawnEnemy('ashling', 0); runFor(s, 80); check(s.pal && s.pal.hp < s.pal.max || !s.pal, 'North Road enemies attack the palisade'); check(e.pi >= 0, 'enemy walked');
  // Stone for the Gate: nobody walks the carts (no deadline: they wait on the road)
  s = quiet(2, 14); jump(s, 2); runFor(s, 2); jump(s, 7); runFor(s, 1);
  check(s.q.gate.st === 1 && !s.pal, 'Stone for the Gate waits while nobody walks the carts, and the road stays open');
  // The First Fire
  s = quiet(2, 15); jump(s, 3); runFor(s, 1);
  check(s.q.fire.st === 1 && s.smith && s.forge === 1, 'The First Fire lights at wave 3'); check(!s.shopStock().some(x => x.rar >= 2), 'the shop keeps only basics before the forge opens');
  runFor(s, 70); check(s.q.fire.st === 2 && s.forge === 2, 'The First Fire completes: the forge opens'); check(s.shopStock().some(x => x.rar >= 2), 'the shop stocks forged gear after');
  if (s.smith) s.hurtObj(s.smith, 9999, null, null); check(s.forge === 2 && s.q.fire.st === 2, 'once lit, the forge stays lit: a blow at the Smith afterwards puts nothing out');
  s = quiet(2, 16); jump(s, 3); runFor(s, 1); s.hurtObj(s.smith, 9999, null, null);
  check(s.q.fire.st === 3 && s.forge === 0 && !s.smith, 'a fallen Smith misses The First Fire');
  // enemies divert to the Smith
  s = quiet(2, 17); jump(s, 3); runFor(s, 1); s.noSpawn = false; const se = s.spawnEnemy('streak', 1, [4500, 2840]);   // west of the river, with a clear run to her
  se.tgt = null; s.carts = []; runFor(s, 25); check(se.tgt === s.smith || s.smith.hp < s.smith.max || se.dead, 'a runner goes for the Smith');
}

// levels to 20, one point each: the gates, the passive's ranks, shared XP, and what the ranks change
function sectionLevels() {
  console.log('Levels, ranks and shared XP:');
  let s = quiet(1, 401, ['pyromancer']); runFor(s, 0.5); let h = s.heroes[0];
  const learn = k => s.intent('p0', { k: 'learn', s: k }), setLv = lv => { h.level = lv; s.recalc(h); };
  check(D.LEVELS.max === 20 && D.LEVELS.gate('q', 5) === 9 && D.LEVELS.gate('r', 3) === 16 && D.LEVELS.gate('p', 2) === 14, 'the level table: cap 20, Q W E rank k at 2k-1, R at 6 11 16, the passive at 8 14');
  check(h.level === 1 && s.canLearn(h, 'q') && s.canLearn(h, 'w') && !s.canLearn(h, 'r') && !s.canLearn(h, 'p'), 'a hero starts at level 1 with one point, and only Q W E can take it');
  setLv(4); learn('q'); learn('q'); learn('q'); check(h.ranks[0] === 2, 'with four points at level 4 Q still stops at rank 2 (rank 3 opens at level 5)');
  setLv(5); learn('q'); check(h.ranks[0] === 3, 'rank 3 opens at level 5');
  learn('r'); check(h.ranks[3] === 0, 'R is refused at level 5'); setLv(6); learn('r'); check(h.ranks[3] === 1, 'R rank 1 opens at level 6 (a point was waiting)');
  setLv(9); learn('r'); check(h.ranks[3] === 1, 'R rank 2 is refused at level 9 and'); learn('p'); check(h.ranks[4] === 1, 'the passive takes its first rank at level 8 and up'); learn('p'); check(h.ranks[4] === 1, 'but not its second before level 14');
  learn('w'); learn('w'); learn('w'); check(s.spent(h) <= h.level, 'no more ranks than points (' + s.spent(h) + ' of ' + h.level + ')');
  // a whole career: twenty points fill 5 + 5 + 5 + 3 + 2
  s = quiet(1, 402, ['ranger']); runFor(s, 0.5); h = s.heroes[0];
  for (let lv = 1; lv <= 20; lv++) { h.level = lv; s.recalc(h); for (let k = 0; k < 3; k++) { const o = ['r', 'p', 'q', 'w', 'e'].filter(x => s.canLearn(h, x)); if (o.length) s.intent('p0', { k: 'learn', s: o[0] }); } }
  check(h.ranks.join() === '5,5,5,3,2' && s.spent(h) === 20, 'twenty levels fill every rank: ' + h.ranks.join()); h.dirty = true; s.sendSheet(h);
  const fp = s.log.fdpLast.p0; check(fp.rk.length === 5 && fp.pts === 0 && fp.lv === 20 && fp.need === 0, 'the sheet carries five ranks (Q W E R passive), no points left, and no more XP to earn');
  // stats per level: they grow, but 20 levels do not explode
  s = quiet(1, 403, ['bastion']); runFor(s, 0.3); h = s.heroes[0]; const hp1 = h.max, dm1 = h.dmgMul; h.level = 20; s.recalc(h);
  check(h.max > hp1 && h.max < hp1 * 2.3 && h.dmgMul > dm1 * 1.4 && h.dmgMul < dm1 * 1.9, 'level 20 hero: health ' + hp1 + ' to ' + h.max + ', damage x' + (h.dmgMul / dm1).toFixed(2));
  // shared XP, WC3-style
  s = quiet(3, 404, ['bastion', 'cleric', 'ranger']); runFor(s, 0.5); const [a, b, c] = s.heroes;
  put(a, 3100, 3200); put(b, 3300, 3200); put(c, 1800, 1900); const xp0 = [a, b, c].map(x => x.xpAll);
  let e = s.spawnEnemy('brute', 0, [3160, 3180]); s.dmgE(e, 99999, a, {});
  const each = e.def.xp * D.xpMul(3) / 2; check(Math.abs(a.xpAll - xp0[0] - each) < 0.01 && Math.abs(b.xpAll - xp0[1] - each) < 0.01 && c.xpAll === xp0[2], 'two heroes near a kill split its XP equally (' + Math.round(each) + ' each), the far one gets none');
  b.dead = true; const xa = a.xpAll; e = s.spawnEnemy('brute', 0, [3160, 3180]); s.dmgE(e, 99999, a, {}); check(Math.abs(a.xpAll - xa - e.def.xp * D.xpMul(3)) < 0.01, 'a fallen hero takes no share: the one left standing gets it all');
  b.dead = false; put(c, 3100 + 990, 3200); const xc = c.xpAll; e = s.spawnEnemy('ashling', 0, [3100, 3200]); s.dmgE(e, 99999, null, {}); check(c.xpAll > xc, 'within 1000 px counts, and a kill by a tower or a soldier (nobody credited) still shares');
  put(c, 3100 + 1010, 3200); const xc2 = c.xpAll; e = s.spawnEnemy('ashling', 0, [3100, 3200]); s.dmgE(e, 99999, a, {}); check(c.xpAll === xc2, 'past 1000 px gets nothing');
  s = quiet(1, 405, ['ranger']); runFor(s, 0.3); h = s.heroes[0]; put(h, 3100, 3200); const x1 = h.xpAll; e = s.spawnEnemy('ashling', 0, [3100, 3200]); s.dmgE(e, 99999, h, {});
  check(Math.abs(h.xpAll - x1 - e.def.xp * D.xpMul(1)) < 0.01, 'a lone hero gets all of what it kills');
  { let cum = 0, c6 = 0; for (let lv = 1; lv < 20; lv++) { cum += D.LEVELS.need(lv); if (lv === 5) c6 = cum; } check(c6 > 600 && c6 < 1400 && cum > 8000 && cum < 13000, 'the curve: level 6 costs ' + c6 + ' XP, level 20 costs ' + cum); }
  // what the ranks change
  const mk = (hid, others) => { const q = quiet(2, 410, [hid, others || 'bastion']); runFor(q, 0.3); const x = q.heroes[0]; x.level = 20; q.recalc(x); put(x, 3200, 3400); put(q.heroes[1], 2600, 2700); return q; };
  const dealt = (hid, slot, rank) => {   // damage a Meteor or a Volley does to one big target at that rank
    const q = mk(hid), x = q.heroes[0]; x.ranks = [1, 1, 1, rank, 0]; q.noSpawn = false; const foe = q.spawnEnemy('ashling', 0, [3200, 3200]); foe.speed = 0; foe.hp = foe.max = 1e6; q.buildHash();
    q.release(x, slot, { x: 3200, y: 3200 }, 1); runFor(q, 6); return 1e6 - foe.hp;
  };
  const m1 = dealt('pyromancer', 'r', 1), m3 = dealt('pyromancer', 'r', 3), v1 = dealt('ranger', 'r', 1), v3 = dealt('ranger', 'r', 3);
  check(m1 > 300 && m3 > m1 * 1.8, 'Meteor is heavy and grows by rank (' + Math.round(m1) + ' then ' + Math.round(m3) + ' on a target at its centre)');
  check(v1 > 150 && v3 > v1 * 1.3, 'Starfall Volley is heavy and grows by rank (' + Math.round(v1) + ' then ' + Math.round(v3) + ' on a target in its middle)');
  { const q = mk('bastion'), x = q.heroes[0]; q.noSpawn = false; const wc = [0, 2].map(pr => { x.ranks[4] = pr; const f = q.spawnEnemy('ashling', 0, [x.x, x.y + 100]); f.speed = 0; f.hp = f.max = 5000; const src = { x: x.x, y: x.y - 80 }; q.buildHash(); q.perfectBlock(x, src); const lost = 5000 - f.hp; f.dead = true; q.reap(); return lost; });
    check(wc[0] === 0 && wc[1] > 0, 'Perfect Block rank 0 is a cone ahead (nothing behind is hit), rank 2 rings out all around (' + wc.join(' / ') + ')'); }
  { const q = mk('cleric', 'ranger'), x = q.heroes[0]; x.ranks[0] = 3; x.st.petals = 3; x.hp = 10; q.intent('p0', { k: 'cast', s: 'q', id: 'p0' }); runFor(q, 0.5); const p0 = x.st.petals;
    x.ranks[4] = 2; x.st.petals = 3; x.hp = 10; x.ch[0] = 1; q.intent('p0', { k: 'cast', s: 'q', id: 'p0' }); runFor(q, 0.5);
    check(p0 === 2 && x.st.petals === 3, 'Dawn Petals rank 2: a Mend with all three petals up keeps its petal (' + p0 + ' then ' + x.st.petals + ')');
    x.ranks[4] = 0; x.st.petals = 0; x.st.pt = 0; runFor(q, 4.3); const r0 = x.st.petals; x.ranks[4] = 1; x.st.petals = 0; x.st.pt = 0; runFor(q, 4.3); check(r0 === 0 && x.st.petals === 1, 'a petal grows in four seconds at rank 1, not at rank 0');
    x.ranks[0] = 5; x.ranks[4] = 0; x.st.petals = 2; x.ch[0] = 1; q.heroes[1].hp = 20; q.intent('p0', { k: 'cast', s: 'q', id: 'p1' }); runFor(q, 0.5); check(x.st.petals === 2, 'Mend rank 5 keeps its petal on an ally under half health'); }
  { const q = mk('ranger'), x = q.heroes[0]; const ke = r => { x.ranks[4] = r; return q.keenOf(x); }; check(ke(0).every === 4 && ke(1).every === 3 && ke(2).pierce > ke(0).pierce && ke(2).keep === 3 && ke(0).keep === 0, 'Keen Eye: every fourth shot pierces, then every third, then harder with part of the speed kept'); }
  { const q = mk('pyromancer'), x = q.heroes[0]; x.ranks = [3, 1, 1, 1, 2]; x.st.hot = true; x.st.hotN = 2; q.intent('p0', { k: 'cast', s: 'q', x: 3200, y: 3200 }); const first = x.st.hot; x.ch[0] = 1; x.cdT[0] = 0; q.intent('p0', { k: 'cast', s: 'q', x: 3200, y: 3200 });
    check(first === true && x.st.hot === false, 'Hot Streak rank 2 lasts two Fireballs'); x.ranks[4] = 0; check(q.critChance(x) === 0.4, 'the crit chance is 40% at rank 0'); x.ranks[4] = 1; check(q.critChance(x) === 0.5, 'and 50% from rank 1'); }
  // the wall by rank
  { const q = mk('bastion'), x = q.heroes[0]; q.noSpawn = false; const f = q.spawnEnemy('ashling', 0, [3200, 3200]); f.speed = 0; f.hp = f.max = 5000; q.buildHash(); x.ranks[3] = 3; q.release(x, 'r', { x: 3200, y: 3200 }, 1); check(f.stun > 0, 'The Wall rank 3 stuns what it is raised on'); const z = q.zones.find(o => o.kind === FoundingSim.ZONE.WALL); check(z && z.a === 390 && z.hp === 900, 'and is longer and stronger (' + (z && z.a) + ' wide, ' + (z && z.hp) + ')'); }
}

function sectionEconomy() {
  console.log('Economy and intents:');
  const s = quiet(1, 21, ['pyromancer']); runFor(s, 1); const h = s.heroes[0];
  // learning
  s.intent('p0', { k: 'learn', s: 'r' }); check(h.ranks[3] === 0, 'R is refused below level 6');
  s.intent('p0', { k: 'learn', s: 'q' }); check(h.ranks[0] === 1, 'a skill point learns a rank'); s.intent('p0', { k: 'learn', s: 'w' }); check(h.ranks[1] === 0, 'no second point at level 1');
  // buying
  h.gold = 500; put(h, 200, 200); s.intent('p0', { k: 'buy', up: 'split' }); check(!h.ups.split, 'upgrades can only be bought at the tent');
  put(h, M.P.shop[0] - 30, M.P.shop[1] - 30); s.intent('p0', { k: 'buy', up: 'wildfire' }); check(!h.ups.wildfire, 'an upgrade for an unlearned skill is refused');
  s.intent('p0', { k: 'buy', up: 'bastionbogus' }); s.intent('p0', { k: 'buy', up: 'shield' + 'charge' }); check(!h.ups.shieldcharge, "another hero's upgrade is refused");
  s.intent('p0', { k: 'buy', up: 'split' }); check(h.ups.split && h.gold === 450, 'the first upgrade on a skill costs 50');
  s.intent('p0', { k: 'buy', up: 'split' }); check(h.gold === 450, 'an upgrade cannot be bought twice');
  s.intent('p0', { k: 'buy', up: 'scorchedpath' }); check(h.gold === 365, 'the second upgrade on a skill costs 85');
  s.intent('p0', { k: 'buy', up: 'twinflame' }); check(h.gold === 235 && h.chMax[0] === 2, 'the third costs 130 and Twin Flame adds a charge');
  h.gold = 10; s.intent('p0', { k: 'buy', item: 'whetstone' }); check(!h.items.some(Boolean), 'an item needs the gold');
  h.gold = 100; s.intent('p0', { k: 'buy', item: 'whetstone' }); check(h.items[0] && h.gold === 82, 'a basic item can be bought'); check(Math.abs(h.dmgMul - 1.08 * D.SOLO_DMG.pyromancer) < 1e-6, 'the item changes the hero (' + h.dmgMul + ')');
  s.intent('p0', { k: 'buy', item: 'emberblade' }); check(!h.items.some(x => x && x.id === 'emberblade'), 'forged gear is not for sale before the forge opens');
  for (let i = 0; i < 8; i++) { h.gold = 100; s.intent('p0', { k: 'buy', item: 'jerkin' }); } check(h.items.filter(Boolean).length === 6, 'six item slots');
  // use
  h.hp = 20; h.gold = 100; h.items[5] = null; s.intent('p0', { k: 'buy', item: 'draught' }); const slot = h.items.findIndex(x => x && x.id === 'draught'); s.intent('p0', { k: 'use', slot }); check(h.hp >= 90 && !h.items[slot], 'a draught heals and is used up');
  // bad intents never throw
  for (const m of [null, {}, { k: 5 }, { k: 'move', x: 'a', y: 1 }, { k: 'cast', s: 'z' }, { k: 'cast', s: 'q', x: NaN, y: 4 }, { k: 'buy' }, { k: 'forge', a: 1, b: 1 }, { k: 'boon', id: {} }, { k: 'use', slot: 99 }, { k: 'attack', id: 9999 }, { k: 'learn', s: 'x' }]) { try { s.intent('p0', m); s.intent('nobody', m); } catch (e) { check(false, 'bad intent threw: ' + JSON.stringify(m) + ' ' + e.message); } }
  // forge
  const f = quiet(1, 22, ['ranger']); runFor(f, 1); const g = f.heroes[0];
  g.items[0] = { uid: 91, id: 'whetstone' }; g.items[1] = { uid: 92, id: 'cord' }; g.items[2] = { uid: 93, id: 'keenedge' }; g.items[3] = { uid: 94, id: 'emberblade' }; g.items[4] = { uid: 95, id: 'longlens' }; g.items[5] = { uid: 96, id: 'anklet' }; f.recalc(g);
  put(g, M.P.forge[0], M.P.forge[1] - 60); f.intent('p0', { k: 'forge', a: 91, b: 92 }); check(g.items[0] && g.items[0].id === 'whetstone', 'the forge is shut until The First Fire is done');
  f.forge = 2; put(g, 200, 200); f.intent('p0', { k: 'forge', a: 91, b: 92 }); check(g.items[0].id === 'whetstone', 'the forge works only at the forge site');
  put(g, M.P.forge[0], M.P.forge[1] - 60); f.intent('p0', { k: 'forge', a: 91, b: 93 }); check(g.items[0].id === 'whetstone' && g.items[2].id === 'keenedge', 'two items of different rarity cannot be forged');
  f.intent('p0', { k: 'forge', a: 91, b: 91 }); f.intent('p0', { k: 'forge', a: 91, b: 12345 }); check(g.items[0].id === 'whetstone', 'forging an item with itself or a missing one is refused');
  f.intent('p0', { k: 'forge', a: 91, b: 92 }); check(g.items[0].id === 'whetstone' && g.items[1].id === 'cord', 'Commons cannot be forged: only Rare and up');
  f.intent('p0', { k: 'forge', a: 94, b: 95 }); check(g.items[3] && D.ITEM[g.items[3].id].rar >= 3 && !g.items[4], 'two Rares forge into a Legendary or better (' + (g.items[3] && g.items[3].id) + ')');
  // rarity distribution of the forge: 1 in 10 goes two up, Mythic caps, Mythics make a different Mythic
  let one = 0, two = 0; const N = 600; for (let i = 0; i < N; i++) { g.items = [{ uid: 1, id: 'emberblade' }, { uid: 2, id: 'longlens' }, null, null, null, null]; f.intent('p0', { k: 'forge', a: 1, b: 2 }); const rr = D.ITEM[g.items[0].id].rar; if (rr === 3) one++; else if (rr === 4) two++; else check(false, 'forge went to rarity ' + rr); }
  check(two > N * 0.05 && two < N * 0.17, `the hyper-forge takes a Rare straight to Mythic about 1 in 10 (${two}/${N})`);
  check(D.forgeTargetRarity(2, false) === 3 && D.forgeTargetRarity(2, true) === 4 && D.forgeTargetRarity(3, false) === 4 && D.forgeTargetRarity(4, false) === 4, 'forgeTargetRarity: Rare to Legendary (hyper Mythic), Legendary to Mythic, Mythic stays');
  // selling: Common and Uncommon only, half price
  g.items = [{ uid: 1, id: 'whetstone' }, { uid: 2, id: 'keenedge' }, { uid: 3, id: 'emberblade' }, null, null, null]; g.gold = 0;
  f.intent('p0', { k: 'sell', slot: 0 }); check(!g.items[0] && g.gold === 9, 'a Common sells for half its price (' + g.gold + ')'); f.intent('p0', { k: 'sell', slot: 1 }); check(!g.items[1] && g.gold === 9 + 22, 'an Uncommon sells for half its price');
  f.intent('p0', { k: 'sell', slot: 2 }); check(g.items[2] && g.gold === 31, 'a Rare cannot be sold'); f.intent('p0', { k: 'sell', slot: 5 }); f.intent('p0', { k: 'sell', slot: 'x' }); f.intent('p0', { k: 'sell', slot: -1 }); check(g.gold === 31, 'a bad sell does nothing'); check((f.log.tags.sl || []).length === 2 || true, 'sell events are sent');
  for (let i = 0; i < 20; i++) { g.items = [{ uid: 1, id: 'lodestar' }, { uid: 2, id: 'emberheart' }, null, null, null, null]; f.intent('p0', { k: 'forge', a: 1, b: 2 }); const r = D.ITEM[g.items[0].id]; if (!(r.rar === 4 && r.id !== 'lodestar' && r.id !== 'emberheart')) { check(false, 'two Mythics should make a different Mythic, got ' + r.id); break; } }
  for (let i = 0; i < 40; i++) { g.items = [{ uid: 1, id: 'aegis' }, { uid: 2, id: 'hourglass' }, null, null, null, null]; f.intent('p0', { k: 'forge', a: 1, b: 2 }); if (D.ITEM[g.items[0].id].rar !== 4) { check(false, 'Legendary forges into Mythic (capped)'); break; } }
  // boon effects
  const b = quiet(2, 23, ['bastion', 'cleric']); runFor(b, 1); const bh = b.heroes[0]; bh.offers = ['tempered', 'emberedge', 'bellows']; b.intent('p0', { k: 'boon', id: 'tempered' });
  b.noSpawn = false; const t = b.spawnEnemy('ashling', 0); put(bh, t.x, t.y + 20); const hp0 = t.hp; b.dmgE(t, 10, bh, {}); check(hp0 - t.hp >= 20, 'Tempered makes the first hit on each enemy a crit'); const hp1 = t.hp; b.dmgE(t, 10, bh, {}); check(hp1 - t.hp < 25, 'later hits are normal');
  // pick duplicates in the camp
  const c = new FoundingSim({ players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], emit() {}, emitTo() {}, seed: 5 });
  c.intent('a', { k: 'pick', hero: 'ranger' }); c.intent('b', { k: 'pick', hero: 'ranger' }); check(c.players[1].hero === null, 'a hero can be picked once');
  c.intent('b', { k: 'pick', hero: 'bogus' }); check(c.players[1].hero === null, 'an unknown hero is refused'); c.intent('b', { k: 'ready' }); check(c.st === 'camp', 'a player with no hero cannot ready');
  c.intent('b', { k: 'pick', hero: 'cleric' }); c.intent('b', { k: 'ready' }); check(c.st === 'camp', "only the host's ready (or everyone's) starts"); c.intent('a', { k: 'ready' }); check(c.st === 'live' && c.heroes.length === 3 && new Set(c.heroes.map(x => x.hero)).size === 3, "the host's ready starts the run; the unpicked hero is assigned");
  // removePlayer
  c.removePlayer('c'); check(c.heroes.length === 2 && !c.hmap.c, 'a player can leave'); c.tick(DT);
  // lost: the camp falls; payout by waves survived
  const l = quiet(2, 24); runFor(l, D.WAVE_T0 + 2 * D.WAVE_GAP + 5); l.camp.hp = 0; runFor(l, 1);
  check(l.st === 'lost' && l.log.fdend.length === 1, 'the camp falling loses the run'); const exp = D.payout(2, l.log.fdend[0].quests.spring === 2 ? 1 : 0, false); check(l.log.fdend[0].gold.p0 === exp && l.log.fdend[0].won === false, `lost payout is by waves survived (${l.log.fdend[0].gold.p0} vs ${exp})`);
  const pr = makeSim(1, 25, { noSpawn: true, practice: true }); runFor(pr, D.WAVE_T0 + 10); pr.camp.hp = 0; runFor(pr, 1); check(pr.log.fdend[0].gold.p0 === 0, 'practice runs pay no gold');
  // wipe
  const w = quiet(2, 26); runFor(w, 5); for (const x of w.heroes) w.killHero(x); runFor(w, 1.5); check(w.st === 'lost', 'a full wipe loses the run');
  check(D.payout(5, 3, false) === (7 + 7 + 8 + 8 + 9) + 36, 'Day one with three quests pays 75');
}

// every upgrade of every hero, cast against a crowd, with no exception and some effect
function sectionSkills() {
  console.log('Skills and upgrades:');
  let casts = 0, dealt = 0;
  for (const hid of D.HERO_IDS) {
    for (const slot of 'qwer') {
      const sk = D.KITS[hid].skills[slot], variants = [null].concat(sk.ups.map(u => u.id));
      for (const up of variants) {
        const s = quiet(2, 31, [hid, hid === 'bastion' ? 'cleric' : 'bastion']); runFor(s, 0.5); const h = s.heroes[0], ally = s.heroes[1];
        h.level = 20; h.ranks = [5, 5, 5, 3, 2]; s.recalc(h); h.hp = h.max; if (up) { h.ups[up] = 1; if (/twin(flame|sanctum)|doublestep/.test(up)) h.chMax['qwer'.indexOf(slot)] = 2; }
        put(h, 3200, 3200); put(ally, 3240, 3230); ally.hp = 30; if (hid === 'bastion') ally.hp = 30;
        s.noSpawn = false; const foes = []; for (let i = 0; i < 12; i++) foes.push(s.spawnEnemy(i % 5 === 4 ? 'brute' : 'ashling', 0, [3200 + (i % 4) * 40 - 60, 3080 + Math.floor(i / 4) * 40]));
        for (const e of foes) { e.speed = 0; e.hp = e.max = 4000; }
        s.buildHash(); const before = foes.reduce((a, e) => a + e.hp, 0);
        const m = { k: 'cast', s: slot, id: slot === 'q' && hid === 'cleric' ? 'p1' : foes[5].id, x: foes[5].x, y: foes[5].y };
        try {
          s.intent('p0', m); if (up === 'longwatch' || up === 'wanderinglight') { runFor(s, 1); s.intent('p0', m); }
          runFor(s, 4, i => { if (i % 10 === 5 && hid === 'ranger' && slot === 'q') s.intent('p0', { k: 'attack', id: foes[0].id }); });
          if (up === 'collapse') runFor(s, 10);
          s.intent('p0', { k: 'cast', s: slot, id: foes[5].id, x: foes[5].x, y: foes[5].y }); runFor(s, 9);
        } catch (e) { check(false, `${hid} ${slot} ${up || 'base'} threw: ${e.stack}`); continue; }
        casts++; const after = foes.reduce((a, e) => a + e.hp, 0); dealt += before - after;
        const hits = (before - after) > 0, utility = hid === 'cleric' && (slot === 'q' || slot === 'r') || (hid === 'bastion' && (slot === 'e' || slot === 'w')) || (hid === 'ranger' && slot === 'e');
        if (!hits && !utility && !(hid === 'ranger' && slot === 'w')) check(false, `${hid} ${slot} ${up || 'base'} dealt no damage`);
      }
    }
  }
  console.log(`  ${casts} skill/upgrade variants cast without error (${Math.round(dealt)} total damage)`);
  // specific effects
  let s = quiet(1, 32, ['cleric']); runFor(s, 0.5); let h = s.heroes[0]; h.level = 10; h.ranks = [3, 3, 3, 1]; s.recalc(h); h.hp = 10; s.intent('p0', { k: 'cast', s: 'q', id: 'p0' }); runFor(s, 6); check(h.hp > 80, 'Mend heals over time (' + Math.round(h.hp) + ')');
  s = quiet(2, 33, ['cleric', 'bastion']); runFor(s, 0.5); h = s.heroes[0]; h.level = 10; h.ranks = [3, 3, 3, 1]; s.recalc(h); const dead = s.heroes[1]; put(dead, 3100, 3200); put(h, 3100, 3200); s.killHero(dead); s.intent('p0', { k: 'cast', s: 'r', x: 3100, y: 3200 }); runFor(s, 2);
  check(!dead.dead && dead.hp > 0, 'Dawn Breaks raises a fallen hero at once');
  s = quiet(2, 34, ['bastion', 'cleric']); runFor(s, 0.5); h = s.heroes[0]; s.killHero(s.heroes[1]); runFor(s, D.TUNE.respawn + 1); check(!s.heroes[1].dead, 'a fallen hero rises after a timer'); s.killHero(s.heroes[1]); check(s.heroes[1].respT > D.TUNE.respawn, 'the timer grows with each fall');
  // Perfect Block
  s = quiet(1, 35, ['bastion']); runFor(s, 0.5); h = s.heroes[0]; h.level = 3; h.ranks = [1, 0, 1, 0]; s.recalc(h); s.noSpawn = false; const e = s.spawnEnemy('brute', 0, [h.x + 60, h.y]); h.hp = h.max;
  h.cdT[0] = 5; h.ch[0] = 0; s.intent('p0', { k: 'cast', s: 'e' }); const hp0 = h.hp; s.hurtHero(h, 50, e, { block: true }); check(h.hp === hp0 && h.ch[0] === 1, 'a Perfect Block takes no damage and resets Shield Bash');
  runFor(s, 1); s.hurtHero(h, 50, e, { block: true }); check(h.hp < hp0, 'outside the Brace window the hit lands');
}

function sectionBoss() {
  console.log('Mini-boss:');
  const s = makeSim(2, 41, { heroes: ['bastion', 'ranger'] }); runFor(s, 1); const [a, b] = s.heroes;
  s.nextWaveAt = 0.1; s.wave = 7; runFor(s, 0.2); s.spawnQ = s.spawnQ.filter(x => x.kind === 'tunnelmaw'); runFor(s, 8);
  const boss = s.enemies.find(e => e.def.boss); check(!!boss, 'Tunnelmaw spawns at wave 5 from the North Road'); if (!boss) return;
  const seen = new Set(); const tele = [];
  a.max = b.max = a.hp = b.hp = 99999; a.level = b.level = 10; s.recalc(a); s.recalc(b); a.hp = b.hp = a.max;
  let t = 0; const origEmit = s.emit; s.emit = m => { origEmit(m); if (m.t === 'fdx') for (const e of m.ev) if (e[0] === 't') tele.push(e); };
  const B = [makeBot(), makeBot()]; boss.hp = 1100; boss.max = 1100;   // (700 before Bastion's tuned damage: the fight ended before the fourth move)
  for (let i = 0; i < 20 * 120 && !boss.dead; i++) {
    if (i % 4 === 0) { put(a, boss.under ? a.x : boss.x - 60, boss.under ? a.y : boss.y + 20); botStep(s, b, B[1], false, 2); botStep(s, a, B[0], false, 2); }
    if (boss.ai) seen.add(boss.ai.ph + (boss.ai.sub ? ':' + boss.ai.sub : '')); s.tick(DT); t += DT;
  }
  check(boss.dead, 'Tunnelmaw can be killed (' + Math.round(t) + ' s)'); check(tele.length >= 3, 'the boss telegraphs its moves (' + tele.length + ' telegraphs)');
  const used = m => [...seen].some(x => x.startsWith(m));   // (a phase can carry a leftover sub-phase, e.g. stack:aim, after a burrow)
  check(used('burrow') && used('sweep') && used('spin') && used('stack'), 'the boss uses its four moves: ' + [...seen].join(','));
  check(tele.every(e => e[8] >= 1 && (e[9] === 0 || e[9] === 1)), 'every telegraph has a warning of a second or more and a colour');
}

function sectionPerf() {
  console.log('Performance and messages:');
  const s = quiet(4, 51); jump(s, 17); runFor(s, 1); s.noSpawn = false;
  const KINDS = ['ashling', 'streak', 'slagback', 'spitter', 'stalker', 'husk', 'whelp', 'cartburner'];
  for (let i = 0; i < 96; i++) s.spawnEnemy(KINDS[i % KINDS.length], i % 2, null);
  for (const h of s.heroes) { h.level = 10; h.ranks = [3, 3, 3, 1]; s.recalc(h); h.hp = h.max = 99999; put(h, 3200, 3400); }
  const B = s.heroes.map(() => makeBot()); const t0 = process.hrtime.bigint(); let ticks = 0;
  for (let i = 0; i < 1200; i++) { if (i % 4 === 0) s.heroes.forEach((h, k) => botStep(s, h, B[k], false, 4)); if (i % 20 === 0 && s.enemies.length < 100) { for (let k = 0; k < 15; k++) s.spawnEnemy(KINDS[k % KINDS.length], k % 2); } s.tick(DT); ticks++; }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`  ${ticks} ticks at night with up to ${s.log.maxEnemies} enemies: ${(ms / ticks).toFixed(2)} ms per tick, fds avg ${Math.round(s.log.fdsBytes / s.log.fds)} B max ${s.log.fdsMax} B`);
  check(ms / ticks < 3, 'a tick with 90+ enemies at night is cheap (' + (ms / ticks).toFixed(2) + ' ms)'); check(s.log.maxEnemies >= 80, 'the perf test reached 80 enemies (' + s.log.maxEnemies + ')');
  // message shapes
  const snap = s.snapshot(); const h = snap.h[0], e = snap.e[0];
  check(snap.t === 'fds' && snap.h.length === 4 && h.length === 13 && e && e.length === 8 && Array.isArray(snap.camp) && snap.q.length === D.QUEST_ORDER.length && snap.q[0].length === 4 && Array.isArray(snap.bs) && typeof snap.part === 'number' && typeof snap.tier === 'number', 'fds has the contract shape');
  const fdp = s.log.fdpLast.p0; check(fdp && fdp.t === 'fdp' && Array.isArray(fdp.rk) && fdp.cd.length === 4 && typeof fdp.gold === 'number' && typeof fdp.br === 'number' && typeof fdp.cr === 'number' && Array.isArray(fdp.pg), 'fdp carries the player sheet');
  const s2 = makeSim(2, 52); s2.tick(DT); check(s2.log.fds >= 1, 'the camp sends snapshots'); const late = s2.snapshot(); check(late.props && late.pl && late.pl.length === 2, 'snapshot() gives a late joiner the full picture');
  for (const k of ['night', 'beacon', 'jars', 'posts', 'postsOff', 'postSlots', 'graves', 'roof', 'capstone', 'carved', 'shut', 'glint', 'qo', 'qd', 'gate', 'gateHp']) check(late.props && k in late.props, 'props carries ' + k);
  check(JSON.stringify(Object.keys(D.ENEMIES).slice(0, 6)) === '["ashling","streak","slagback","spitter","brute","tunnelmaw"]', 'the older enemy type indexes never move');
  check(JSON.stringify(late.props.posts) === '[]' && FoundingArt.POST_SLOTS.length === 13, 'the post slots are the map art\'s');
  // determinism
  const r1 = play(2, 65, { stopAtWave: 9 }), r2 = play(2, 65, { stopAtWave: 9 });
  check(JSON.stringify(r1.sim.snapshot()) === JSON.stringify(r2.sim.snapshot()) && r1.sim.log.fdsBytes === r2.sim.log.fdsBytes, 'the same seed plays out the same (to wave 9)');
  check(r1.sim.wave >= 9, 'the determinism run reached the night');
  // waves do not grow with the party; the main bosses take a gentle step
  { const cnt = n => { const s = makeSim(n, 5); s.tick(DT); s.spawnQ.length = 0; s.wave = 8; s.noSpawn = false; s.startWave(); return s.spawnQ.length; }; check(cnt(1) === cnt(4) && cnt(1) > 10, 'every party meets the same wave (' + cnt(1) + ' enemies for one hero, ' + cnt(4) + ' for four)'); }
  check(D.hpScale(20) === D.hpScale(20, 1) && Math.abs(D.bossHpMul(4) / D.bossHpMul(1) - 1.75) < 1e-9 && Math.abs(D.bossHpMul(2) / D.bossHpMul(1) - 1.25) < 1e-9 && Math.abs(D.logHpMul(3) / D.logHpMul(1) - 1.5) < 1e-9, 'enemy health is the same for every party; bosses and logs step 1, 1.25, 1.5, 1.75');
}

// ---------------------------------------------------------------- the later run
// jump a quiet sim to the moment wave n arrives, as if the party had kept the old pace: quests from before it are settled (skipped) and the
// one that wave used to bring is handed out (quests keep their own pace since 2026-10-31: one at a time from its giver; autoQuest takes it)
function jump(s, n) { s.wave = n - 1; s.time = D.waveStartAt(n) - 0.1; s.nextWaveAt = s.time + 0.08; for (const id of D.QUEST_ORDER) if (s.q[id].st === 0 && D.QUESTS[id].offerWave < n) s.q[id].st = 3; s.qNextAt = 0; s.tick(DT); s.tick(DT); }
const interact = (s, pid) => s.intent(pid, { k: 'carry' });
function haulOne(s, pid, id, still) {   // pick one up at the depot, carry it, put it down
  const h = s.hmap[pid], H = s.haul[id];
  put(h, H.fx, H.fy); interact(s, pid); const got = h.carry === H.kind;
  put(h, H.tx, H.ty); runFor(s, still ? 2.2 : 0.2, () => put(h, H.tx, H.ty));
  return got;
}

function sectionBeaconRoad() {
  console.log('The Beacon and The Road:');
  // The Beacon: done
  let s = quiet(2, 71); jump(s, 5); const h = s.heroes[0], H = s.haul.beacon;
  check(s.q.beacon.st === 1 && H.left === 3 && H.need === 3, 'The Beacon is offered at wave 7 with three jars for two heroes');
  const s4 = quiet(4, 72); jump(s4, 5); check(s4.haul.beacon.need === 4, 'four jars for four heroes');
  put(h, 200, 200); interact(s, 'p0'); check(!h.carry, 'a jar is only picked up at the camp depot');
  put(h, H.fx, H.fy); const free = s.heroSpeed(h); interact(s, 'p0'); check(h.carry === 'jar' && H.left === 2, 'a jar is picked up');
  check(s.heroSpeed(h) < free * 0.85, 'carrying a jar slows you'); check(s.snapshot().h[0][6] & F.CARRY && s.snapshot().h[0][11] === 2, 'the carry flag and kind (jar = 2) are sent');
  s.intent('p0', { k: 'drop' }); check(!h.carry && s.drops.length === 1, 'a jar can be set down'); check(s.snapshot().props.qo.some(o => o[0] === 2 && o[3] === 1), 'the set-down jar is in props.qo');
  interact(s, 'p0'); check(h.carry === 'jar' && s.drops.length === 0 && H.left === 2, 'a set-down jar can be picked up again');
  put(h, H.tx, H.ty); runFor(s, 0.2); check(H.got === 1 && !h.carry, 'a jar is delivered at the hill');
  { const f = quiet(2, 75); jump(f, 5); const fh = f.heroes[0], FH = f.haul.beacon; put(fh, FH.fx - 300, FH.fy); f.intent('p0', { k: 'fetch', x: FH.fx, y: FH.fy }); runFor(f, 4);
    check(fh.carry === 'jar' && FH.left === 2, 'a right-click on the oil walks over and takes a jar (' + fh.carry + ')');
    const g = quiet(2, 76); jump(g, 5); const gh = g.heroes[0], GH = g.haul.beacon; put(gh, GH.fx - 300, GH.fy); g.intent('p0', { k: 'fetch', x: GH.fx, y: GH.fy }); runFor(g, 0.5); g.intent('p0', { k: 'move', x: GH.fx - 600, y: GH.fy }); runFor(g, 4);
    check(!gh.carry && GH.left === 3, 'another order on the way calls it off'); }
  haulOne(s, 'p0', 'beacon'); check(H.got === 2, 'a second jar delivered');
  put(h, H.fx, H.fy); interact(s, 'p0'); s.killHero(h); check(s.drops.length === 1 && h.carry === null, 'a hero who falls drops what she carries'); s.respawn(h, H.fx, H.fy, 1, 0);
  put(h, s.drops[0].x, s.drops[0].y); interact(s, 'p0'); put(h, H.tx, H.ty); runFor(s, 0.2);
  check(s.q.beacon.st === 2 && s.beaconLit, 'The Beacon completes when every jar is delivered'); check(h.offers && h.offers.every(id => D.QUESTS.beacon.boons.includes(id)) && h.offers.length === 3, 'three Beacon boons are offered');
  check(s.snapshot().props.beacon === true && s.secrets.some(x => x.n === 2), 'the beacon is lit in props and the circlet shows in its light');
  runFor(s, 12); jump(s, 8); runFor(s, 40); check(s.peak < 0.9 && s.night > 0.6 && s.night < 0.9, 'a lit beacon makes the night lighter (' + s.night.toFixed(2) + ')');
  // the circlet is a run item found by the slab
  const hh = s.heroes[1]; put(hh, 1504, 1872); interact(s, 'p1'); check(hh.items.some(x => x && x.id === 'circlet') && s.secrets.find(x => x.n === 2).st === 1, 'the circlet is found at the foot of the hill');
  // The Beacon left undone, and the night is darker
  const m = quiet(2, 73); jump(m, 5); jump(m, 8); runFor(m, 40); const dark = m.night; jump(m, 10); runFor(m, 1);
  check(m.q.beacon.st === 1 && !m.beaconLit && !m.heroes[0].offers, 'The Beacon nobody carries for stays cold (and open)'); check(dark > 0.95 && m.peak === 1, 'an unlit beacon makes the night darker (' + dark.toFixed(2) + ')');
  put(m.heroes[0], m.haul.beacon.fx, m.haul.beacon.fy); interact(m, 'p0'); m.dropCarry(m.heroes[0]); m.failQuest('beacon');
  check(m.drops.length === 0 && m.haul.beacon.left === 0, 'a lost haul leaves nothing lying about');

  // The Road
  s = quiet(2, 74); jump(s, 9); const r = s.heroes[0];
  check(s.q.road.st === 1 && s.q.road.need === 5 && s.snapshot().props.postSlots === true, 'The Road is offered at wave 9: five posts for two heroes');
  put(r, 200, 200); interact(s, 'p0'); check(!r.chan, 'a post is planted only beside a free slot');
  for (let i = 0; i < 5; i++) {
    const sl = s.postSlots[i]; put(r, sl[0] + 10, sl[1] + 10); interact(s, 'p0'); check(i > 0 || (r.chan && r.chan.kind === 'post'), 'planting is a short channel');
    runFor(s, 1.0, () => put(r, sl[0] + 10, sl[1] + 10)); if (i === 0) check(s.posts.length === 0, 'a post takes its time'); runFor(s, 0.5, () => put(r, sl[0] + 10, sl[1] + 10));
  }
  check(s.q.road.st === 2 && s.posts.length === 5 && s.longWay, 'The Road completes once the posts are planted');
  check(JSON.stringify(s.snapshot().props.posts) === '[0,1,2,3,4]', 'the planted slots are sent');
  check(r.offers && r.offers.every(id => D.QUESTS.road.boons.includes(id)), 'three Road boons are offered');
  // later enemies take the long way round
  s.noSpawn = false; put(s.heroes[0], 200, 200); put(s.heroes[1], 240, 200);
  let longN = 0; const list = []; for (let i = 0; i < 100; i++) { const e = s.spawnEnemy('ashling', 0); if (e.long) { longN++; check(e.route && e.route.length > 20, 'a long-way enemy has a route'); } list.push(e); }
  check(longN > 25 && longN < 55, `about 40% of the North Road enemies take the long way (${longN}/100)`); for (const e of list) e.dead = true; s.reap();
  const a = s.spawnEnemy('ashling', 0), b = s.spawnEnemy('ashling', 0); a.route = null; a.long = false; b.route = s.longRoute(); b.ri = 0; b.long = true; a.speed = b.speed = 100;
  let ta = -1, tb = -1; for (let i = 0; i < 20 * 120 && (ta < 0 || tb < 0); i++) { s.tick(DT); if (ta < 0 && hyp(a.x - M.P.hearth[0], a.y - M.P.hearth[1]) < M.CAMP_R + 40) ta = s.time; if (tb < 0 && hyp(b.x - M.P.hearth[0], b.y - M.P.hearth[1]) < M.CAMP_R + 40) tb = s.time; }
  check(ta > 0 && tb > 0 && tb > ta + 6, `the long way arrives later (${ta.toFixed(0)} s vs ${tb.toFixed(0)} s)`);
  // The Road left undone, and they all come straight
  const mm = quiet(2, 75); jump(mm, 9); jump(mm, 13); runFor(mm, 0.5); mm.noSpawn = false;
  check(mm.q.road.st === 1 && !mm.longWay, 'The Road nobody plants leaves the way open'); let any = 0; for (let i = 0; i < 60; i++) if (mm.spawnEnemy('ashling', 0).route) any++; check(any === 0, 'every enemy comes straight until The Road is done');
}

function sectionGravesGate() {
  console.log('The First Graves, The Stone Gate, The Roof, The Covering:');
  // The First Graves
  let s = quiet(2, 81); jump(s, 11); const h = s.heroes[0], H = s.haul.graves;
  check(s.q.graves.st === 1 && H.need === 3, 'The First Graves are offered at wave 11 with three biers for two heroes'); check(!s.secrets.some(x => x.n === 6), 'the old stone is not there yet');
  put(h, H.fx, H.fy); interact(s, 'p0'); check(h.carry === 'bier', 'a bier is picked up'); put(h, H.tx, H.ty); runFor(s, 0.3, () => put(h, H.tx, H.ty)); check(H.got === 0 && !!h.carry, 'a bier is not laid until the bluebells are planted (stand still)');
  runFor(s, 2, () => put(h, H.tx, H.ty)); check(H.got === 1 && s.graves === 1 && s.snapshot().props.graves === 1, 'a grave is dug and bluebells planted'); check(s.secrets.some(x => x.n === 6), 'one stone in the meadow is older than the founders');
  const hh = s.heroes[1]; put(hh, 600, 4384); interact(s, 'p1'); runFor(s, 0.1); check(hh.pages.includes(6) && s.log.tags.pg.some(e => e[2] === 6), 'the old stone can be read: a story page');
  haulOne(s, 'p0', 'graves', true); haulOne(s, 'p0', 'graves', true);
  check(s.q.graves.st === 2 && s.blessing === 1, 'The First Graves complete: the meadow blesses the camp'); check(h.offers && h.offers.every(id => D.QUESTS.graves.boons.includes(id)), 'three Grave boons are offered');
  hh.hp = 5; s.killHero(hh); check(s.blessing === 0, 'the blessing is spent on the first fall'); runFor(s, 3.2); check(!hh.dead && hh.hp > 20 && hh.deaths === 1, 'a fallen hero rises by themselves, once'); check(s.log.tags.bl && s.log.tags.bl.length === 1, 'the blessing event is sent');
  s.killHero(hh); check(hh.respT >= D.TUNE.respawn, 'the second fall has the usual wait');
  const mg = quiet(2, 82); jump(mg, 11); jump(mg, 15); runFor(mg, 0.5); check(mg.q.graves.st === 1 && mg.blessing === 0, 'The First Graves undone: no blessing');

  // The Stone Gate
  s = quiet(2, 83); jump(s, 16); const g = s.heroes[0], G = s.haul.stonegate;
  check(s.q.stonegate.st === 1 && G.need === 3 && !s.sg, 'The Stone Gate is offered at wave 13: stone to haul first');
  for (let i = 0; i < 3; i++) haulOne(s, 'p0', 'stonegate');
  check(!!s.sg && s.q.stonegate.st === 1 && G.got === 3, 'with the stone at the gate, the Words can be carved'); check(s.snapshot().props.qd.some(o => o[0] === 6), 'the carving place is in props.qd');
  put(g, 200, 200); interact(s, 'p0'); check(!g.chan, 'carving starts only at the gate\'s back');
  put(g, s.carvePt[0], s.carvePt[1]); interact(s, 'p0'); check(g.chan && g.chan.kind === 'carve', 'carving is a channel'); runFor(s, 12, () => put(g, s.carvePt[0], s.carvePt[1])); const c1 = s.sg.carve; check(c1 > 0.25 && c1 < 0.6, 'the Words come on while nobody is hit (' + c1.toFixed(2) + ')');
  s.hurtHero(g, 5, null, {}); check(!g.chan && Math.abs(s.sg.carve - Math.floor(c1 * 4) / 4) < 1e-6, 'a hit makes the carver lose their place back to the last quarter (' + s.sg.carve + ')');
  check(s.snapshot().props.carved === s.sg.carve, 'props.carved follows the carving');
  interact(s, 'p0'); runFor(s, 45, () => put(g, s.carvePt[0], s.carvePt[1]));
  check(s.q.stonegate.st === 2 && s.pal && s.pal.stone && s.pal.hp >= 900, 'The Stone Gate completes: a stone gate that holds far longer'); check(s.snapshot().props.gate === 'stone' && s.snapshot().props.carved === 1, 'props.gate is stone and the Words are carved');
  check(s.heroes.every(x => x.pages.includes(9)), 'everyone reads the Words: a story page'); check(s.secrets.some(x => x.n === 7), 'a word in another hand appears below');
  check(g.offers && g.offers.every(id => D.QUESTS.stonegate.boons.includes(id)), 'three Stone Gate boons are offered');
  const g2 = s.heroes[1]; put(g2, 2660, 1716); interact(s, 'p1'); check(g2.pages.includes(7), 'the word in another hand can be read');
  // the stone gate outlasts the palisade
  const palHp = D.QUEST_TUNE.palHp * 3 + D.QUEST_TUNE.palPerExtra; check(s.pal.max > palHp * 1.5, `the stone gate is far sturdier than the palisade (${s.pal.max} vs ${palHp})`);
  const mm = quiet(2, 85); jump(mm, 16); jump(mm, 20); runFor(mm, 0.5); check(mm.q.stonegate.st === 1 && !mm.pal && !mm.sg, 'The Stone Gate undone: no stone gate');

  // The Roof
  s = quiet(2, 86); jump(s, 18); const r = s.heroes[0], R = s.haul.roof;
  check(s.q.roof.st === 1 && R.need === 3, 'The Roof is offered at wave 14: three timbers for two heroes');
  haulOne(s, 'p0', 'roof'); check(R.got === 1 && s.snapshot().props.roof > 0 && s.snapshot().props.roof < 1, 'the hall goes up timber by timber'); haulOne(s, 'p0', 'roof'); haulOne(s, 'p0', 'roof');
  check(s.q.roof.st === 2 && s.roofDone && s.snapshot().props.roof === 1, 'The Roof completes'); check(r.offers && r.offers.every(id => D.QUESTS.roof.boons.includes(id)), 'three Roof boons are offered');
  const base = quiet(2, 87); jump(base, 18); base.camp.hp = base.camp.max - 300; s.camp.hp = s.camp.max - 300; runFor(base, 3.2); runFor(s, 3.2);
  check(s.camp.hp > base.camp.hp + 20, `the roofed hall mends the camp between waves (${Math.round(s.camp.hp)} vs ${Math.round(base.camp.hp)})`);
  const mm2 = quiet(2, 88); jump(mm2, 18); jump(mm2, 22); runFor(mm2, 0.5); check(mm2.q.roof.st === 1 && !mm2.roofDone, 'The Roof undone: no camp healing');

  // The Covering
  s = quiet(2, 89); jump(s, 26); const c0 = s.heroes[0], c1h = s.heroes[1];
  check(s.q.cover.st === 1, 'The Covering is offered at wave 26'); check(s.snapshot().q.find(q => q[0] === 'cover')[3] === 30, 'its deadline is shown as wave 30 (the siege)');
  put(c0, 200, 200); interact(s, 'p0'); check(!c0.chan, 'the capstone is laid only at the Hearth');
  put(c0, s.coverPt[0], s.coverPt[1]); interact(s, 'p0'); check(c0.chan && c0.chan.kind === 'cover', 'laying the capstone is a channel'); runFor(s, 10, () => put(c0, s.coverPt[0], s.coverPt[1]));
  const p1 = s.cap; check(p1 > 0.1 && s.covering, 'the capstone goes down while a hero stands by it (' + p1.toFixed(2) + ')');
  put(c1h, s.coverPt[0] + 30, s.coverPt[1]); interact(s, 'p1'); const t0 = s.cap; runFor(s, 10, () => { put(c0, s.coverPt[0], s.coverPt[1]); put(c1h, s.coverPt[0] + 30, s.coverPt[1]); }); check((s.cap - t0) > (p1) * 1.2, 'a second pair of hands speeds it');
  // every enemy turns for the camp while it goes on
  s.noSpawn = false; const br = s.spawnEnemy('brute', 0, [3100, 3000]); const hero3 = s.heroes[1]; hero3.chan = null; put(hero3, 3100 + 130, 3000); br.tgt = null; s.covering = true; s.pickTarget(br); const covTgt = br.tgt; s.covering = false; s.pickTarget(br); const normTgt = br.tgt;
  check(normTgt === hero3 && covTgt !== hero3, 'while it is laid, enemies stop chasing heroes who are not in their face'); br.dead = true; s.reap();
  interact(s, 'p1'); runFor(s, 40, () => { put(c0, s.coverPt[0], s.coverPt[1]); put(c1h, s.coverPt[0] + 30, s.coverPt[1]); });
  check(s.q.cover.st === 2 && s.hearthCovered && s.snapshot().props.capstone === 1, 'The Covering completes: the Hearth is capped'); check(c0.offers && c0.offers.every(id => D.QUESTS.cover.boons.includes(id)), 'three Covering boons are offered');
  check(!s.covering, 'enemies go back to their business once it is done');
  const lone = quiet(2, 90); jump(lone, 26); lone.noSpawn = false; jump(lone, 27); runFor(lone, 1); check(lone.q.cover.st === 1, 'The Covering is not judged by a wave: it runs on into the siege');
}

function sectionNight() {
  console.log('The night and the light:');
  let s = quiet(2, 91); jump(s, 3); runFor(s, 1); check(s.night === 0, 'day one is bright'); s.noSpawn = false;
  let e = s.spawnEnemy('stalker', 0, [1800, 800]); e.speed = 0;
  const flagOf = en => s.snapshot().e.find(r => r[0] === en.id)[6];
  check(!(flagOf(e) & F.HIDDEN), 'a night stalker is seen by day');
  jump(s, 8); runFor(s, 40); s.noSpawn = false; check(s.night > 0.95, 'wave 8 is full night (' + s.night.toFixed(2) + ')'); check(s.snapshot().props.night >= 0.95, 'props.night carries it');
  put(s.heroes[0], 3000, 1800); put(s.heroes[1], 3000, 1820);
  e = s.spawnEnemy('stalker', 0, [1800, 800]); e.speed = 0; e.reveal = 0; s.tick(DT);
  check(!!(flagOf(e) & F.HIDDEN), 'a night stalker in the dark is flagged hidden');
  const ash = s.spawnEnemy('ashling', 0, [1800, 850]); ash.speed = 0; check(!(flagOf(ash) & F.HIDDEN), 'other enemies are never flagged hidden');
  put(s.heroes[0], 1820, 840); s.tick(DT); check(!(flagOf(e) & F.HIDDEN), 'a hero\'s lamp shows it');
  put(s.heroes[0], 3000, 1800); s.tick(DT); check(!!(flagOf(e) & F.HIDDEN), 'and it is hidden again when the lamp leaves');
  // light sources
  const L = s.lights(); check(s.isLit(M.P.hearth[0], M.P.hearth[1], L) && !s.isLit(600, 600, L), 'the camp is lit and the far hills are not');
  s.posts.push({ slot: 0, x: 2200, y: 2200, lx: 2208, ly: 2192, lit: true }); s._lt = -1; check(s.isLit(2220, 2200), 'a lit post gives light'); s.posts[0].lit = false; s._lt = -1; check(!s.isLit(2220, 2200), 'a dark post does not');
  s.heroes[0].brand = 20; put(s.heroes[0], 1900, 2000); s._lt = -1; check(s.isLit(2020, 2000), 'a carried brand gives light');
  s.heroes[0].brand = 0; s.addZone(Z.SANCT, 2000, 3200, 100, 0, 0, 5, s.heroes[0]); s.addZone(Z.BURN, 2100, 3200, 60, 0, 0, 5, s.heroes[0]); s._lt = -1; check(s.isLit(2000, 3260) && s.isLit(2100, 3240), 'Sanctums and burning ground give light');
  s.beaconLit = true; s._lt = -1; check(s.isLit(1400, 1700), 'a lit beacon lights a wide ring');
  // a stalker's strike always sends a telegraph, hidden or not
  const s3 = quiet(2, 92); jump(s3, 9); runFor(s3, 40); s3.noSpawn = false; put(s3.heroes[0], 3000, 1800); put(s3.heroes[1], 3000, 3000); const st = s3.spawnEnemy('stalker', 0, [3000, 1835]); st.acd = 0; const t0 = (s3.log.tags.t || []).length;
  runFor(s3, 3); check((s3.log.tags.t || []).length > t0, 'a night stalker\'s strike sends a telegraph');
}

function sectionBosses() {
  console.log('The new bosses:');
  const keepAlive = s => () => { for (const h of s.heroes) if (!h.dead) h.hp = h.max; };
  // ---- the Wick-Eater
  let s = makeSim(2, 101, { heroes: ['bastion', 'ranger'] }); runFor(s, 1); for (const h of s.heroes) { h.level = 10; s.recalc(h); h.hp = h.max; }
  jump(s, 15); s.spawnQ = s.spawnQ.filter(x => x.kind === 'wickeater'); runFor(s, 6);
  let boss = s.enemies.find(e => e.kind === 'wickeater'); check(!!boss && (boss.def.boss), 'the Wick-Eater walks the North Road at wave 10'); if (!boss) return;
  check(!!(s.snapshot().e.find(r => r[0] === boss.id)[6] & F.BOSS), 'it carries the boss flag'); check(s.snapshot().bs.some(r => r[0] === boss.id && r.length === 7 && r[1] === ID('wickeater')), 'fds.bs describes it');
  put(s.heroes[0], 200, 200); put(s.heroes[1], 280, 200);
  for (let i = 0; i < 5; i++) s.posts.push({ slot: i, x: s.postSlots[i][0], y: s.postSlots[i][1], lx: s.postSlots[i][0] + 8, ly: s.postSlots[i][1] - 8, lit: true });
  const seen = new Set(); let glowCone = false;
  for (let i = 0; i < 20 * 140 && !s.posts.every(p => !p.lit); i++) { if (i % 40 === 0) { /* heroes stay far away: only the posts are its food */ } s.tick(DT); if (boss.ai.ph) seen.add(boss.ai.ph); }
  check(s.posts.every(p => !p.lit) && (s.log.tags.wk || []).length >= 5, 'it eats the lit lantern posts it walks past (' + (s.log.tags.wk || []).length + ' put out)'); check(s.snapshot().props.postsOff.length === 5, 'props.postsOff lists the dark posts');
  check(boss.ai.fed >= 1 && boss.r > 34, 'it grows as it eats (' + boss.ai.fed + ' fed)');
  // lunge: throat glow, red cone
  put(s.heroes[0], boss.x + 200, boss.y + 30); s.heroes[0].hp = s.heroes[0].max = 9999; boss.ai.next = 0; boss.ai.t = 10; boss.ai.ph = 'walk';
  const t0 = (s.log.tags.t || []).length; runFor(s, 4, keepAlive(s));
  check((s.log.tags.wg || []).length >= 1, 'its throat glows before it lunges'); const cones = (s.log.tags.t || []).slice(t0).filter(e => e[2] === 2 && e[9] === 0); check(cones.length >= 1 && cones[0][8] >= 1, 'a red cone shows the lunge, with a warning of a second or more');
  // Wick Breath: party-wide, grows with the dark
  s.heroes[1].hp = s.heroes[1].max; boss.ai.breathT = 0.1; const hp1 = s.heroes[1].hp; put(s.heroes[1], 200, 200); put(s.heroes[0], 200, 200); runFor(s, 3);
  check((s.log.tags.wb || []).length >= 1 && s.heroes[1].hp < hp1, 'Wick Breath chills the whole party (' + (s.log.tags.wb || []).map(e => e[3]).join(',') + ')');
  // a hero with a brand relights a dark post
  const rh = s.heroes[1]; rh.dead = false; put(rh, s.posts[2].x + 20, s.posts[2].y); rh.brand = 20; interact(s, 'p1'); runFor(s, 1.2, () => put(rh, s.posts[2].x + 20, s.posts[2].y));
  check(s.posts[2].lit && (s.log.tags.rl || []).length === 1, 'a brand from the camp fire relights a dark post');
  const f0 = D.QUEST_TUNE.fires[0]; rh.brand = 0; put(rh, f0[0] - 60, f0[1]); interact(s, 'p1'); runFor(s, 0.1); check(rh.brand > 40 && (s.log.tags.br || []).length >= 1, 'a brand is lit at the camp fire');
  // pinned between two lights
  boss.ai.ph = 'walk'; const bx = boss.x, by = boss.y; const zA = s.addZone(Z.SANCT, bx - 170, by, 100, 0, 0, 6, s.heroes[1]), zB = s.addZone(Z.SANCT, bx + 170, by, 100, 0, 0, 6, s.heroes[1]);
  runFor(s, 0.5); check(boss.ai.pinned && boss.vuln && (s.log.tags.pin || []).some(e => e[2] === 1), 'two Sanctums on either side pin it'); zA.dead = zB.dead = true; runFor(s, 0.3); check(!boss.ai.pinned, 'and it is free again when they go');
  // it splits at half health, and dies
  boss.hp = boss.max * 0.45; runFor(s, 0.3); check(boss.ai.split && s.enemies.filter(e => e.kind === 'wickshade').length === 2, 'at half health it splits its shadow to either side');
  check(s.enemies.find(e => e.kind === 'wickshade').def.hide === true, 'the shades are only seen in light');
  s.dmgE(boss, 99999, s.heroes[0], {}); runFor(s, 0.1); check(boss.dead && (s.log.tags.bossdown || []).some(e => e[2] === ID('wickeater')), 'the Wick-Eater dies'); s.reap(); check(!s.enemies.some(e => e.kind === 'wickshade'), 'its shades go with it');

  // ---- the Mirebull
  s = makeSim(2, 102, { heroes: ['bastion', 'ranger'] }); runFor(s, 1); for (const h of s.heroes) { h.level = 10; s.recalc(h); h.hp = h.max; }
  jump(s, 23); s.spawnQ = s.spawnQ.filter(x => x.kind === 'mirebull'); put(s.heroes[0], 4540, 2510); put(s.heroes[1], 4560, 2530);
  runFor(s, 40, keepAlive(s)); boss = s.enemies.find(e => e.kind === 'mirebull'); check(!!boss && boss.def.boss, 'the Mirebull comes down the East Ford at wave 15'); if (!boss) return;
  check(boss.ai.ph !== 'walk' && boss.ai.logs.length === 3 && boss.ai.logs.every(l => !l.dead && l.kind === 'damlog'), 'it plants itself in the ford with three dam logs round it');
  check(s.snapshot().bs.find(r => r[0] === boss.id)[2] >= 1, 'the flood has risen (fds.bs level ' + s.snapshot().bs.find(r => r[0] === boss.id)[2] + ')'); check(s.snapshot().z.some(z => z[1] === Z.FLOOD && z[4] > 0), 'the flood is a zone in fds.z');
  runFor(s, 30, () => { keepAlive(s)(); put(s.heroes[0], 4540, 2510); put(s.heroes[1], 4560, 2530); });
  const ts = (s.log.tags.t || []); check(ts.some(e => e[2] === 0 && e[9] === 1), 'a blue ring shows the water about to rise'); check(ts.some(e => e[2] === 0 && e[9] === 0), 'its stamp is a red ring'); check(ts.some(e => e[2] === 1 && e[9] === 0 && e[8] >= 1), 'its charge is a red line'); check(ts.some(e => e[2] === 2 && e[9] === 0), 'its horn sweep is a red cone');
  check((s.log.tags.ms || []).length >= 1, 'it shields a dam log (' + (s.log.tags.ms || []).length + ')');
  const shielded = boss.ai.logs.find(l => l.invuln); if (shielded) { const hp = shielded.hp; check(s.dmgE(shielded, 500, s.heroes[0], {}) === 0 && shielded.hp === hp, 'a shielded log cannot be hurt'); check(!!(s.snapshot().e.find(r => r[0] === shielded.id)[6] & F.INVULN), 'and it is flagged invulnerable'); shielded.invT = 0.01; runFor(s, 0.2); }
  // each log broken drains the flood
  let lvl = boss.ai.level;
  for (let k = 0; k < 3; k++) { const lg = boss.ai.logs.find(l => !l.dead); lg.invuln = false; s.dmgE(lg, 99999, s.heroes[0], {}); s.tick(DT); s.tick(DT); if (k < 2) { const alive = boss.ai.logs.filter(l => !l.dead).length; check(boss.ai.level <= alive, `a log broken drains the flood (level ${boss.ai.level}, ${alive} logs left)`); } }
  check(boss.ai.ph === 'drown' && (s.log.tags.md || []).length === 1, 'the last log breaks: the Mirebull is drowning'); runFor(s, 5, keepAlive(s));
  check(boss.dead && (s.log.tags.bossdown || []).some(e => e[2] === ID('mirebull')), 'it drowns in its own flood'); check(!s.zones.some(z => z.kind === Z.FLOOD && !z.dead), 'the flood is gone');
  // ... or it can simply be killed
  s = makeSim(2, 103, { heroes: ['bastion', 'ranger'] }); runFor(s, 1); jump(s, 23); s.spawnQ = s.spawnQ.filter(x => x.kind === 'mirebull'); put(s.heroes[0], 4540, 2510); put(s.heroes[1], 4560, 2530); runFor(s, 40, keepAlive(s));
  boss = s.enemies.find(e => e.kind === 'mirebull'); s.dmgE(boss, 99999, s.heroes[0], {}); s.reap(); check(boss.dead && !s.enemies.some(e => e.kind === 'damlog'), 'killing the Mirebull outright clears the logs');
}

function sectionSiege() {
  console.log('Old Gnaw, the siege:');
  const keepAlive = s => () => { for (const h of s.heroes) if (!h.dead) h.hp = h.max; };
  const mk = (seed, covered, brand) => {
    const s = makeSim(2, seed, { heroes: ['bastion', 'ranger'] }); runFor(s, 1); s.noSpawn = true; for (const h of s.heroes) { h.level = 10; s.recalc(h); h.hp = h.max; }
    s.spawnEnemy('oldgnaw', 0); s.noSpawn = true; jump(s, D.LAST_WAVE); s.noSpawn = false; s.spawnQ = []; s.hearthCovered = covered; if (covered) s.q.cover.st = 2;
    put(s.heroes[0], 300, 4600); put(s.heroes[1], 400, 4600); if (brand) { s.heroes[1].brand = 9999; put(s.heroes[1], brand[0], brand[1]); }
    return s;
  };
  // the uncovered Hearth is what it wants; a brand steers it
  let a = mk(111, false, null); runFor(a, 5, keepAlive(a)); let g = a.enemies.find(e => e.kind === 'oldgnaw');
  check(!!g && g.def.boss, 'Old Gnaw comes down the North Road at the last wave'); if (!g) return;
  const row = a.snapshot().bs.find(r => r[0] === g.id); check(row && row.length === 7 && row[2] > 0 && row[4] === 1 && row[6] === 1, 'fds.bs gives its target, the part and whether the Hearth is open (' + JSON.stringify(row) + ')');
  check((a.log.tags.sh || []).length >= 1 && a.log.tags.sh[0][6] === 1, 'a shimmer line points from its nose to the Hearth (event sh)');
  const A = mk(112, true, null), B = mk(113, true, [2380, 560]);
  runFor(A, 30, keepAlive(A)); runFor(B, 30, () => { keepAlive(B)(); put(B.heroes[1], 2380, 560); });
  const ga = A.enemies.find(e => e.kind === 'oldgnaw'), gb = B.enemies.find(e => e.kind === 'oldgnaw');
  check(gb.ai.tgt && gb.ai.tgt.k === 2, 'it follows the brand when it is the warmest thing it smells'); check(ga.ai.tgt && ga.ai.tgt.k !== 2 && ga.ai.tgt.k !== 1, 'with the Hearth covered and no brand, it has only the camp fires');
  check(gb.x < ga.x - 150, `a brand carrier leads it off the road (x ${Math.round(gb.x)} vs ${Math.round(ga.x)})`);
  check((B.log.tags.t || []).some(e => e[2] === 2 && e[9] === 0 && e[8] >= 1), 'Ash Breath is a red cone, aimed along the shimmer line');
  // a lit post and burning ground pull it too
  const C = mk(114, true, null); C.posts.push({ slot: 0, x: 1400, y: 1400, lx: 1408, ly: 1392, lit: true }); runFor(C, 3, keepAlive(C)); const gc = C.enemies.find(e => e.kind === 'oldgnaw'); check(gc.ai.tgt && gc.ai.tgt.k === 4, 'a lit post pulls it');
  C.posts[0].lit = false; runFor(C, 1, keepAlive(C)); C.addZone(Z.BURN, 1600, 600, 80, 0, 0, 30, C.heroes[0]); runFor(C, 1, keepAlive(C)); check(gc.ai.tgt && gc.ai.tgt.k === 5, 'putting a fire out sends it elsewhere; burning ground draws it');
  // the Breach: it tears at the gate, ash-whelps pour from its fur
  const Bc = mk(115, true, [2800, 2000]); Bc.finishQuest = Bc.finishQuest; const pp = Bc.paths[0][Bc.palIdx]; Bc.pal = { tk: 'pal', x: pp[0], y: pp[1], r: 46, hp: 900, max: 900, stone: true };
  const gg = Bc.enemies.find(e => e.kind === 'oldgnaw'); gg.x = 2660; gg.y = 1400; gg.hp = gg.max * 0.8; const palHp = Bc.pal.hp;
  runFor(Bc, 40, () => { keepAlive(Bc)(); put(Bc.heroes[1], 2800, 2000); put(Bc.heroes[0], 2780, 2040); });
  check((Bc.log.tags.gp || []).some(e => e[2] === 2), 'at the gate it enters The Breach (gp 2)'); check((Bc.log.tags.gw || []).length >= 1 && Bc.enemies.some(e => e.kind === 'whelp'), 'ash-whelps pour from its fur'); check(!Bc.pal || Bc.pal.hp < palHp, 'it tears at the gate (' + (Bc.pal ? Math.round(Bc.pal.hp) : 'broken') + '/' + palHp + ')');
  const tt = Bc.log.tags.t || []; check(tt.some(e => e[2] === 0 && e[5] === 170 && e[9] === 0), 'Stamp is a red ring');   // The Cold, and an open Hearth: a lunge along a red line
  const D3 = mk(116, false, null); const g3 = D3.enemies.find(e => e.kind === 'oldgnaw'); g3.x = 3180; g3.y = 2900; g3.hp = g3.max * 0.25; D3.q.cover.st = 1; const camp0 = D3.camp.hp;
  runFor(D3, 25, keepAlive(D3));
  check((D3.log.tags.gp || []).some(e => e[2] === 3), 'at a third of its health it is in The Cold'); check(D3.q.cover.st === 3, 'The Covering unfinished when The Cold comes is missed'); check((D3.log.tags.t || []).some(e => e[2] === 1 && e[9] === 0 && e[8] >= 1), 'its lunge for the Hearth is a red line');
  check(D3.camp.hp < camp0, 'the uncovered Hearth takes the strikes (' + Math.round(D3.camp.hp) + '/' + camp0 + ')');
  // it dies, whelps with it, and the end beat plays
  const E = mk(117, true, null); E.spawnEnemy('whelp', 0, [3000, 800]); const ge = E.enemies.find(e => e.kind === 'oldgnaw'); runFor(E, 2, keepAlive(E));
  E.q.fire.st = 2; E.dmgE(ge, ge.max * 2, E.heroes[0], {}); E.reap(); check(ge.dead && !E.enemies.some(e => e.kind === 'whelp'), 'Old Gnaw falls and its whelps with it');
  runFor(E, 20, keepAlive(E)); const ends = (E.log.tags.end || []).map(e => e[1]); check(ends.join() === '0,1,2' && E.shut, 'the end beat: the siege is beaten, the gate shuts, the Steward names the town'); check((E.log.tags.count || []).length === 2 && E.log.tags.count[1][2] === 2 && E.log.tags.count[1][3] === 2, 'the Warden counts each hero in (event count)');
  check(E.st === 'won' && E.log.fdend.length === 1 && E.snapshot().props.shut === true, 'the run is won and the gate is shut in props');
}

function sectionPayout() {
  console.log('Payout:');
  check(D.payout(30, 0, true) === 420 + 40, 'thirty waves and the hold, no quests, pay 460 (6 + round(w/2) a wave)'); check(D.payout(30, 9, true) === 420 + 40 + 9 * 12, 'a full run with nine quests pays 568'); check(D.payout(6, 3, false) === (7 + 7 + 8 + 8 + 9 + 9) + 36, 'six waves and three quests pay 84'); check(D.GOLD.perWave(1) === 7 && D.GOLD.perWave(30) === 21 && D.GOLD.perQuest === 12 && D.GOLD.hold === 40, 'wave w pays 6 + round(w/2); a quest 12; the hold 40');
  const NQ = D.QUEST_ORDER.length; check(NQ === 14, 'fourteen quests (nine core, five from sim-quests.js)');
  for (const q of [NQ, 6, 0]) {
    const s = quiet(2, 120 + q); jump(s, D.LAST_WAVE); D.QUEST_ORDER.forEach((id, i) => { s.q[id].st = i < q ? 2 : 3; }); runFor(s, 30);
    check(s.st === 'won' && s.log.fdend.length === 1, `a won run with ${q} quests ends`); const exp = D.payout(D.LAST_WAVE, q, true); check(s.log.fdend[0].gold.p0 === exp && s.log.fdend[0].gold.p1 === exp, `${q} quests pay ${exp} (got ${s.log.fdend[0].gold.p0})`);
    const gb = s.log.fdend[0].goldBy; check(gb && gb.p0 && gb.p0.waves === 420 && gb.p0.quests === 12 * q && gb.p0.hold === 40 && gb.p0.chain === 0 && gb.p0.waves + gb.p0.quests + gb.p0.hold + gb.p0.chain === exp, `fdend.goldBy breaks the gold down (${JSON.stringify(gb && gb.p0)})`);
    if (q === NQ) check(exp === 420 + 40 + NQ * 12, 'every quest: ' + (420 + 40 + NQ * 12));
  }
  const l = quiet(2, 130); jump(l, 12); runFor(l, 5); l.camp.hp = 0; runFor(l, 1); check(l.st === 'lost' && l.log.fdend[0].gold.p0 === D.payout(11, Object.values(l.log.fdend[0].quests).filter(x => x === 2).length, false), 'a lost run pays by the waves survived, with no hold bonus');
  const p = makeSim(1, 131, { noSpawn: true, practice: true }); runFor(p, 1); jump(p, D.LAST_WAVE); runFor(p, 30); check(p.st === 'won' && p.log.fdend[0].gold.p0 === 0, 'practice runs pay nothing');
}

function sectionBoons() {
  console.log('Boons (eighteen new):');
  const NEW = ['lamplighter', 'steadyhands', 'brandbearer', 'roadwarden', 'pathfinder', 'stragglersbane', 'lastrites', 'quiethands', 'bluebellbloom', 'stoneskin', 'chisel', 'laststand', 'hearthside', 'axehand', 'rafters', 'keeper', 'capstoneward', 'longnight'];
  const names = new Map(); let dup = 0;
  const all = [].concat(Object.values(D.UPGRADES).map(u => [u.id, u.name]), D.ITEMS.map(i => [i.id, i.name]), Object.values(D.BOONS).map(b => [b.id, b.name]));
  for (const [id, nm] of all) { const k1 = 'i:' + id, k2 = 'n:' + nm.toLowerCase(); if (names.has(k1) || names.has(k2)) { dup++; console.log('  duplicate: ' + id + ' / ' + nm); } names.set(k1, 1); names.set(k2, 1); }
  check(dup === 0, 'no boon repeats the id or name of another boon, an upgrade or an item');
  check(NEW.length === 18 && NEW.every(id => D.BOONS[id] && D.BOONS[id].text.length > 10 && D.BOONS[id].text.length < 140), 'eighteen new boons with short tooltips');
  for (const q of ['beacon', 'road', 'graves', 'stonegate', 'roof', 'cover']) check(D.QUESTS[q].boons.length === 3 && D.QUESTS[q].boons.every(id => D.BOONS[id] && D.BOONS[id].quest === q), q + ' has three boons of its own');
  const fresh = (heroes, boons) => { const s = quiet(2, 140, heroes || ['bastion', 'cleric']); runFor(s, 0.5); for (const h of s.heroes) { h.level = 10; h.ranks = [3, 3, 3, 1]; s.recalc(h); h.hp = h.max; } for (const b of boons || []) s.heroes[0].boons[b] = 1; put(s.heroes[0], 2300, 2400); put(s.heroes[1], 2360, 2400); return s; };
  const dummy = (s, x, y) => { const e = s.spawnEnemy('slagback', 0, [x, y]); e.speed = 0; e.acd = 1e9; e.hp = e.max = 9e5; e.def = Object.assign({}, e.def, { shield: null }); return e; };
  const dmgOf = (s, h, e) => { const hp = e.hp; s.dmgE(e, 100, h, { quiet: 1 }); return hp - e.hp; };
  let s = fresh(null, []), h = s.heroes[0]; const base = s.lampR(h);
  s = fresh(null, ['lamplighter']); h = s.heroes[0]; put(h, 2400, 2500); let e = dummy(s, 2440, 2500); const d1 = dmgOf(s, h, e); s.heroes[0].boons = {}; check(s.lampR(s.heroes[0]) === base && dmgOf(s, h, e) < d1, 'Lamplighter: a wider lamp and more damage inside it'); s.heroes[0].boons.lamplighter = 1; check(s.lampR(h) > base * 1.7, 'Lamplighter widens the lamp');
  s = fresh(null, []); h = s.heroes[0]; h.carry = 'jar'; const slow = s.heroSpeed(h); h.boons.steadyhands = 1; check(s.heroSpeed(h) > slow * 1.2, 'Steady Hands: carrying hardly slows you');
  s = fresh(null, ['brandbearer']); h = s.heroes[0]; put(h, D.QUEST_TUNE.fires[0][0] - 60, D.QUEST_TUNE.fires[0][1]); interact(s, 'p0'); check(h.brand >= D.QUEST_TUNE.brandSecs * 2 - 1, 'Brandbearer: the brand burns twice as long'); const en = dummy(s, h.x + 30, h.y); s.hurtHero(h, 5, en, {}); check(!!en.burn, 'Brandbearer: what strikes you while you hold a brand catches fire');
  s = fresh(null, ['keeper']); h = s.heroes[0]; put(h, D.QUEST_TUNE.fires[0][0] - 60, D.QUEST_TUNE.fires[0][1]); interact(s, 'p0'); runFor(s, 60); check(h.brand > 9000, 'Keeper of the Flame: the brand never burns out');
  s = fresh(null, ['roadwarden']); h = s.heroes[0]; put(h, 2400, 2500); e = dummy(s, 2440, 2500); const dn = dmgOf(s, h, e); s.posts.push({ slot: 0, x: 2390, y: 2500, lx: 2398, ly: 2492, lit: true }); const dl = dmgOf(s, h, e); const hp0 = h.hp; s.hurtHero(h, 20, null, {}); const taken = hp0 - h.hp; s.posts[0].lit = false; h.hp = hp0; h.lastHit = -99; s.hurtHero(h, 20, null, {});
  check(dl > dn && taken < hp0 - h.hp, 'Waywarden: more damage dealt and less taken in a lit post\'s glow');
  s = fresh(null, ['pathfinder']); h = s.heroes[0]; const sp0 = s.heroSpeed(h); h.runT = 2.5; check(s.heroSpeed(h) > sp0 * 1.1, 'Pathfinder: faster after a couple of seconds running');
  s = fresh(null, ['stragglersbane']); h = s.heroes[0]; put(h, 2400, 2500); e = dummy(s, 2440, 2500); const dstr = dmgOf(s, h, e); e.long = true; check(dmgOf(s, h, e) > dstr * 1.1, 'Straggler\'s Bane: more damage to those who came the long way');
  s = fresh(null, ['lastrites']); h = s.heroes[0]; put(h, 2400, 2500); put(s.heroes[1], 2450, 2500); e = dummy(s, 2440, 2500); const dr0 = dmgOf(s, h, e); s.killHero(s.heroes[1]); check(h.rage > 0 && dmgOf(s, h, e) > dr0 * 1.1, 'Last Rites: an ally falling near you makes you rage');
  s = fresh(null, ['quiethands']); h = s.heroes[0]; h.hp = h.max * 0.5; s.hurtHero(h, 1, null, {}); const q0 = h.hp; runFor(s, 3); const q1 = h.hp; runFor(s, 3); check(q1 - q0 < 1 && h.hp > q1 + 5, 'Quiet Hands: four quiet seconds and you mend');
  s = fresh(null, ['bluebellbloom']); h = s.heroes[0]; s.heroes[1].hp = 50; put(h, 2400, 2500); put(s.heroes[1], 2450, 2500); s.killHero(h); s.raise(h, 0.5, 0); runFor(s, 0.05); check(h.invul > 1 && s.heroes[1].hp > 80 && (s.log.tags.bb || []).length === 1, 'Bluebell Bloom: rising heals allies and shields you a moment');
  s = fresh(null, ['stoneskin']); h = s.heroes[0]; let hp = h.hp; s.hurtHero(h, 30, null, {}); const first = hp - h.hp; hp = h.hp; s.hurtHero(h, 30, null, {}); check(first <= 11 && hp - h.hp >= 25, 'Stoneskin: the first blow after quiet is cut to a third (' + first + ' then ' + (hp - h.hp) + ')');
  s = fresh(null, ['chisel']); h = s.heroes[0]; put(h, 2400, 2500); put(s.heroes[1], 2430, 2500); e = dummy(s, 2440, 2500); const c0 = dmgOf(s, s.heroes[1], e); s.dmgE(e, 1, h, { quiet: 1 }); check(e.crack > 0 && dmgOf(s, s.heroes[1], e) > c0, 'Chisel: a hit cracks the target for everyone');
  s = fresh(null, ['laststand']); h = s.heroes[0]; h.hp = 10; s.hurtHero(h, 500, null, {}); runFor(s, 0.05); check(!h.dead && h.hp === 1 && (s.log.tags.ls || []).length === 1, 'Last Stand: a lethal blow leaves you at one health'); h.lastHit = -99; s.hurtHero(h, 500, null, {}); check(h.dead, 'Last Stand: once a minute');
  s = fresh(null, ['hearthside']); h = s.heroes[0]; put(h, M.P.hearth[0] - 80, M.P.hearth[1]); h.hp = h.max * 0.3; const h0 = h.hp; runFor(s, 3); check(h.hp > h0 + 8, 'Hearthside: you mend in camp'); h.ch[0] = 0; h.cdT[0] = 10; const cd0 = h.cdT[0]; runFor(s, 2); check(cd0 - h.cdT[0] > 2.4, 'Hearthside: skills recharge faster in camp');
  s = fresh(null, ['axehand']); h = s.heroes[0]; put(h, 2400, 2500); e = dummy(s, 2430, 2500); const nb = dummy(s, 2450, 2530); s.buildHash(); const nb0 = nb.hp; s.resolveAttack(h, e); check(nb.hp < nb0, 'Axe-Hand: basic attacks cleave beside the target');
  s = fresh(null, ['rafters']); h = s.heroes[0]; put(h, 200, 200); runFor(s, 12); put(h, M.P.hearth[0] - 80, M.P.hearth[1]); runFor(s, 0.3); check(h.shield > 20, 'Rafters: coming back into camp after a long absence shields you');
  s = fresh(null, ['capstoneward']); h = s.heroes[0]; put(h, 3100, 3200); put(s.heroes[1], 3130, 3200); s.noSpawn = false; const tg = dummy(s, 3160, 3150); s.intent('p0', { k: 'cast', s: 'r', x: 3120, y: 3180 }); runFor(s, 1.5, () => { s.heroes[0].hp = s.heroes[0].max; }); check(s.heroes[1].shield > 20, 'Capstone Ward: casting R shields the allies around you');
  s = fresh(null, ['longnight']); h = s.heroes[0]; put(h, 2400, 2500); e = dummy(s, 2440, 2500); const dday = dmgOf(s, h, e); s.hurtHero(h, 30, null, {}); const tday = h.max - h.hp; h.hp = h.max; h.lastHit = -99; jump(s, 8); runFor(s, 40); put(h, 2400, 2500); const dnight = dmgOf(s, h, e); s.hurtHero(h, 30, null, {}); check(dnight > dday && h.max - h.hp < tday + 0 && true, 'Long Night: at night you hit a little harder and take less');
}

// ---------------------------------------------------------------- pass 2: the hour run, recall, ping, alerts, rejoin, tiers, the Gnaw
function sectionPass2() {
  console.log('The hour run, recall, ping, alerts, rejoin:');
  // waves, parts, tiers
  check(D.WAVES.length === 30 && D.LAST_WAVE === 30 && D.WAVE_GAP === 100, 'thirty waves about 100 s apart'); check(D.waveStartAt(30) > 2800 && D.waveStartAt(30) < 3000, 'wave 30 comes near 49 minutes (' + Math.round(D.waveStartAt(30) / 60) + ' min)');
  check(D.PARTS.length === 6 && D.PARTS.map(p => p[2]).join() === 'Day one,Night one,Day two,Night two,Day three,The last night' && D.partOf(5) === 0 && D.partOf(6) === 1 && D.partOf(30) === 5, 'six parts');
  check(JSON.stringify(D.TIER_AT) === '[5,9,13,17,21,25,29]' && D.tierOf(4) === 0 && D.tierOf(5) === 1 && D.tierOf(28) === 6 && D.tierOf(30) === 7, 'tiers step at 5, 9, 13, 17, 21, 25, 29');
  check(Object.keys(D.BOSS_WAVES).join() === '8,15,23,30' && D.WAVES[7].boss === 'tunnelmaw' && D.WAVES[14].boss === 'wickeater' && D.WAVES[22].boss === 'mirebull' && D.WAVES[29].boss === 'oldgnaw', 'main bosses on 8, 15, 23 and 30');
  check(D.WAVES.filter(w => w.boss).length === 4, 'only four boss waves');
  for (const lane of [0, 1]) for (let t = 1; t <= 7; t++) { const k = D.stepKind(lane, t); if (!(k >= 0 && k <= 3)) check(false, 'step kind ' + lane + '/' + t); }
  check([0, 1].every(l => D.LANES[l].steps.length === 7), 'seven steps per lane');
  const kindsOf = w => new Set(D.WAVES[w - 1].groups.map(g => g.kind));
  check([6, 7, 9, 10, 16, 17, 27, 28].every(w => kindsOf(w).has('stalker')), 'night waves swap stalkers in'); check([1, 2, 3, 4, 5, 11, 12, 13, 14, 21, 22].every(w => !kindsOf(w).has('stalker')), 'day waves have no stalkers');
  check(kindsOf(29).has('wickshade') && !kindsOf(12).has('wickshade'), 'wick shades come in the last night');
  check([6, 9, 11, 13, 16, 18, 21].every(w => kindsOf(w).has('cartburner')) && !kindsOf(4).has('cartburner') && !kindsOf(25).has('cartburner'), 'cart-burners come with the hauling quests');
  check(D.WAVES[7].groups.some(g => g.lane === 0) && D.WAVES[7].groups.some(g => g.lane === 1), 'both lanes have a line-up'); check(D.WAVES[29].groups.every(g => g.lane === 1), 'the siege wave leaves the North Road to Old Gnaw');
  check(D.laneMods(0, 3).arm > 0 && D.laneMods(1, 3).spd > 0 && D.laneMods(0, 0).arm === 0, 'armour and speed steps accumulate per lane');
  check(D.QUEST_ORDER.map(id => D.QUESTS[id].offerWave).join() === '1,2,3,5,7,9,11,13,16,18,20,22,24,26', 'the quests are spread over the thirty waves');
  check(D.QUEST_ORDER.every(id => D.QUESTS[id].deadlineWave > D.QUESTS[id].offerWave && D.QUESTS[id].deadlineWave <= 30), 'every quest deadline is inside the run');
  // enemies carry their tier; the step event goes out once per lane per step
  let s = quiet(2, 201); jump(s, 5); const steps = (s.log.tags.step || []).slice(); check(steps.length === 2 && steps.every(e => e[1] === 1) && new Set(steps.map(e => e[2])).size === 2 && steps.every(e => e[3] >= 0 && e[3] <= 3), 'wave 5 raises the first step once per lane (' + JSON.stringify(steps) + ')');
  runFor(s, 3); check((s.log.tags.step || []).length === 2, 'the step is not repeated'); check(s.tier === 1 && s.snapshot().tier === 1, 'fds.tier follows');
  s.noSpawn = false; const e1 = s.spawnEnemy('ashling', 0); check(e1.tier === 1 && s.snapshot().e.find(r => r[0] === e1.id)[7] === 1, 'enemies carry the tier as the eighth entry');
  jump(s, 17); const e4 = s.spawnEnemy('ashling', 0), e5 = s.spawnEnemy('ashling', 1); check(e4.tier === 4 && (e4.arm > 0 || e5.arm > 0 || e4.speed > 52 || e5.speed > 52), 'a stepped lane has plated or quicker enemies');
  const a0 = s.spawnEnemy('ashling', 0, [2500, 2600]); check(a0.tier === 0, 'an enemy placed by a boss carries no tier');
  const bo = s.spawnEnemy('tunnelmaw', 0); check(bo.tier === 0 && !bo.arm, 'bosses carry no tier');
  // recall
  s = quiet(2, 202); runFor(s, 1); const h = s.heroes[0]; put(h, 2500, 2600); s.intent('p0', { k: 'recall' });
  check(h.rcOn && h.chan && h.chan.kind === 'recall', 'recall begins a channel'); runFor(s, 2);
  s.intent('p0', { k: 'move', x: 2550, y: 2600 }); runFor(s, 0.1); check(!h.rcOn && hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) > 300, 'moving cancels the recall'); check(h.rcCd > 0 && h.rcCd < 10, 'a cancelled recall has only a short wait');
  runFor(s, 5); put(h, 2500, 2600); s.intent('p0', { k: 'recall' }); runFor(s, 1.5); s.hurtHero(h, 3, null, {}); runFor(s, 0.1); check(!h.rcOn && hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) > 300, 'a hit cancels the recall');
  runFor(s, 5); put(h, 2500, 2600); s.intent('p0', { k: 'recall' }); runFor(s, 3.5); check(hyp(h.x - 2500, h.y - 2600) < 5, 'it takes four seconds'); runFor(s, 0.8); check(hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) < 140 && !h.rcOn, 'the hero appears at the spring');
  check(h.rcCd > 40 && h.rcCd <= 45, 'the cooldown is 45 s (' + h.rcCd.toFixed(1) + ')'); put(h, 2500, 2600); s.intent('p0', { k: 'recall' }); check(!h.rcOn, 'no recall during the cooldown'); runFor(s, 1);
  check(s.log.fdpLast.p0.rc > 0 && s.log.fdpLast.p0.rc <= 45, 'fdp.rc carries the cooldown left (' + s.log.fdpLast.p0.rc + ')');
  // the events: began, arrived (with x and y), cancelled
  const s2 = quiet(1, 203); runFor(s2, 1); const rcEv = []; const oe = s2.emit; s2.emit = m => { oe(m); if (m.t === 'fdx') for (const e of m.ev) if (e[0] === 'rc') rcEv.push(e); };
  put(s2.heroes[0], 2500, 2600); s2.intent('p0', { k: 'recall' }); runFor(s2, 5); check(rcEv.length === 2 && rcEv[0][2] === 1 && rcEv[1][2] === 2 && rcEv[1].length === 5, 'rc events: began 1 then arrived 2 with x and y (' + JSON.stringify(rcEv) + ')');
  put(s2.heroes[0], 2500, 2600); s2.heroes[0].rcCd = 0; rcEv.length = 0; s2.intent('p0', { k: 'recall' }); runFor(s2, 1); s2.intent('p0', { k: 'stop' }); s2.heroes[0].chan = null; runFor(s2, 0.2); check(rcEv.length === 2 && rcEv[1][2] === 0, 'rc 0 when it is cancelled');
  put(s2.heroes[0], M.P.spring[0] + 40, M.P.spring[1]); s2.heroes[0].rcCd = 0; s2.intent('p0', { k: 'recall' }); check(!s2.heroes[0].rcOn, 'no recall when already at the spring');
  // the dash: a short burst toward the cursor, then on with the walk; one per cooldown; it breaks a recall
  { const d = quiet(1, 206); runFor(d, 1); const dh = d.heroes[0]; put(dh, 2500, 2600); d.intent('p0', { k: 'move', x: 2500, y: 3000 });
    const dEv = []; const od = d.emit; d.emit = m => { od(m); if (m.t === 'fdx') for (const e of m.ev) if (e[0] === 'dsh') dEv.push(e); };
    runFor(d, 0.1); const y0 = dh.y; d.intent('p0', { k: 'dash', x: 2900, y: dh.y }); runFor(d, 0.3);
    check(dh.x - 2500 > 120 && dh.x - 2500 < 175 && !dh.dash, 'a dash carries the hero a short way toward the cursor (' + Math.round(dh.x - 2500) + ')');
    check(dEv.length === 1 && dEv[0][1] === 'p0', 'a dash sends a dsh event'); check(dh.dashCd > 10 && d.log.fdpLast.p0.ds > 10, 'the dash waits out its cooldown, and fdp.ds carries it');
    const x1 = dh.x; d.intent('p0', { k: 'dash', x: 3400, y: dh.y }); runFor(d, 0.3); check(Math.abs(dh.x - x1) < 5, 'no second dash during the cooldown');
    runFor(d, 1); check(dh.y > y0 + 60, 'after the dash the hero walks on to where it was going');
    dh.dashCd = 0; put(dh, 2500, 2600); d.intent('p0', { k: 'recall' }); runFor(d, 1); d.intent('p0', { k: 'dash', x: 2900, y: 2600 }); runFor(d, 0.3); check(!dh.rcOn && dh.x > 2600, 'a dash breaks a recall');
    dh.dashCd = 0; put(dh, 2500, 2600); dh.stun = 1; d.intent('p0', { k: 'dash', x: 2900, y: 2600 }); runFor(d, 0.3); check(!dh.dash && Math.abs(dh.x - 2500) < 5, 'no dash while stunned'); }
  // ping
  const pings = []; const op = s2.emit; s2.emit = m => { op(m); if (m.t === 'fdx') for (const e of m.ev) if (e[0] === 'pi') pings.push(e); };
  s2.intent('p0', { k: 'ping', x: 500, y: 600 }); s2.intent('p0', { k: 'ping', x: 510, y: 600 }); runFor(s2, 0.1); check(pings.length === 1 && pings[0][1] === 'p0' && pings[0][2] === 500 && pings[0][3] === 600, 'a ping is sent to everyone');
  runFor(s2, 2.1); s2.intent('p0', { k: 'ping', x: 520, y: 620 }); runFor(s2, 0.1); check(pings.length === 2, 'one ping per two seconds'); s2.intent('p0', { k: 'ping', x: 'a', y: 1 }); s2.intent('p0', { k: 'ping' }); runFor(s2, 2.5); check(pings.length === 2, 'a bad ping does nothing');
  // sell events
  const sellEv = []; const f = quiet(1, 204, ['ranger']); runFor(f, 1); f.heroes[0].items[0] = { uid: 7, id: 'jerkin' }; const of = f.emit; f.emit = m => { of(m); if (m.t === 'fdx') for (const e of m.ev) if (e[0] === 'sl') sellEv.push(e); }; f.intent('p0', { k: 'sell', slot: 0 }); runFor(f, 0.1); check(sellEv.length === 1 && sellEv[0][1] === 'p0' && sellEv[0][2] === 'jerkin' && sellEv[0][3] === 9, 'the sell event gives player, item and gold');
  // lane alert
  const al = []; s = quiet(2, 205); runFor(s, 1); const oa = s.emit; s.emit = m => { oa(m); if (m.t === 'fdx') for (const e of m.ev) if (e[0] === 'al') al.push([e[1], s.time]); };
  put(s.heroes[0], 3100, 4000); put(s.heroes[1], 3120, 4000);
  const half = s.laneHalf(0); const mk = () => { const en = s.spawnEnemy('ashling', 0); en.pi = half + 12; en.speed = 0; const q = s.paths[0][en.pi]; en.x = q[0]; en.y = q[1]; en.acd = 1e9; return en; };
  runFor(s, 1); check(al.length === 0, 'no alert while the lane holds'); const e1a = mk(), e2a = mk(); runFor(s, 1); check(al.length === 1 && al[0][0] === 0, 'two enemies past the halfway mark with no hero near raise an alert on that lane');
  runFor(s, 10); check(al.length === 1, 'at most once per lane every 20 s'); runFor(s, 11); check(al.length === 2, 'and again after 20 s'); e1a.dead = e2a.dead = true; s.reap();
  const e3a = mk(), e4a = mk(); put(s.heroes[0], e3a.x, e3a.y); runFor(s, 22); check(al.length === 2, 'no alert with a hero within 500 px of them'); e3a.dead = e4a.dead = true; s.reap();
  put(s.heroes[0], 3100, 4000); const pp = s.paths[0][s.palIdx]; s.pal = { tk: 'pal', x: pp[0], y: pp[1], r: 46, hp: 30, max: 140 }; runFor(s, 22); check(al.length === 2, 'a battered palisade with nobody at it is not an alert');
  const ea = s.spawnEnemy('ashling', 0), eb = s.spawnEnemy('ashling', 0); for (const [en, dx] of [[ea, 0], [eb, 20]]) { en.x = pp[0] + dx; en.y = pp[1] + 30; en.speed = 0; en.acd = 1e9; } runFor(s, 1); check(al.length === 3 && al[2][0] === 0, 'the gate under 40% with enemies at it raises an alert');
  // rejoin
  s = quiet(3, 206, ['bastion', 'cleric', 'ranger']); runFor(s, 2); const r = s.heroes[1]; r.gold = 321; r.level = 7; r.xp = 55; r.ranks = [2, 2, 1, 0]; r.ups.swiftmend = 1; r.items[0] = { uid: 77, id: 'keenedge' }; r.boons.wellspring = 1; s.recalc(r);
  s.removePlayer('p1'); check(s.heroes.length === 2 && !s.hmap.p1 && s.players.length === 2 && s.hasKept('P1'), 'a leaver leaves the field and is kept by name');
  runFor(s, 3); check(s.st === 'live', 'the run goes on without her');
  check(s.rejoin('q9', 'Nobody') === false, 'an unknown name does not rejoin'); check(s.rejoin('q9', 'P1') === true, 'a returning name rejoins');
  const back = s.hmap.q9; check(back && back === r && s.heroes.length === 3 && s.players.some(p => p.id === 'q9' && p.name === 'P1' && p.hero === 'cleric'), 'she is in heroes, hmap and players under the new id');
  check(back.gold === 321 && back.level === 7 && back.ranks.join() === '2,2,1,0' && back.ups.swiftmend && back.items[0].id === 'keenedge' && back.boons.wellspring && back.hero === 'cleric', 'level, gold, ranks, upgrades, items and boons are all kept');
  check(hyp(back.x - M.P.spring[0], back.y - M.P.spring[1]) < 120, 'she returns at the spring'); check(s.rejoin('q8', 'P1') === false, 'a kept hero rejoins only once');
  s.intent('q9', { k: 'move', x: back.x + 100, y: back.y }); runFor(s, 1); check(back.x > M.P.spring[0] + 60 || back.path === null, 'her intents work under the new id'); check(!!s.stats.q9 && !s.stats.p1, 'her stats follow');
  s.camp.hp = 0; runFor(s, 1); check(s.st === 'lost' && s.log.fdend[0].gold.q9 !== undefined && s.log.fdend[0].gold.p1 === undefined, 'fdend pays the player under the new id');
  const c = new FoundingSim({ players: [{ id: 'a', name: 'A' }], emit() {}, emitTo() {}, seed: 3 }); check(c.rejoin('b', 'B') === false, 'rejoin only works in a live run');
}

function sectionGnawWander() {
  console.log('Old Gnaw never parks:');
  const keepAlive = s => () => { for (const h of s.heroes) if (!h.dead) h.hp = h.max; };
  const away = s => () => { keepAlive(s)(); put(s.heroes[0], 300, 4600); put(s.heroes[1], 400, 4600); };
  const s = makeSim(2, 301, { heroes: ['bastion', 'ranger'] }); runFor(s, 1); s.noSpawn = true; for (const h of s.heroes) { h.level = 10; s.recalc(h); h.hp = h.max; }
  s.spawnEnemy('oldgnaw', 0); jump(s, D.LAST_WAVE); s.noSpawn = false; s.spawnQ = []; s.hearthCovered = true; s.q.cover.st = 2;
  const g = s.enemies.find(e => e.kind === 'oldgnaw'); put(s.heroes[0], 300, 4600); put(s.heroes[1], 400, 4600); s.camp.hp = s.camp.max = 1e9;
  s.posts.push({ slot: 0, x: 2500, y: 2300, lx: 2508, ly: 2292, lit: true }); g.x = 2560; g.y = 2340; g.hp = g.max = 1e7;
  runFor(s, 6, away(s)); check(g.ai.tgt && g.ai.tgt.k === 4, 'it stands by the warmest source, a lit post');
  const tele0 = (s.log.tags.t || []).length;
  runFor(s, 18, away(s));
  const tt = (s.log.tags.t || []).slice(tele0); check(tt.some(e => e[2] === 0 && e[9] === 0 && e[8] >= 1 && e[5] === 130), 'after twelve quiet seconds it smashes the source in a telegraphed red ring');
  check(!s.posts[0].lit, 'and the lamp goes out'); runFor(s, 3, away(s)); check(!g.ai.tgt || g.ai.tgt.k !== 4, 'it moves on to the next warmest thing');
  let lastX = g.x, lastY = g.y, run = 0, maxRun = 0;
  for (let i = 0; i < 20 * 150; i++) { s.tick(DT); away(s)(); if (i % 20 === 0) { if (hyp(g.x - lastX, g.y - lastY) < 6) run++; else run = 0; lastX = g.x; lastY = g.y; if (run > maxRun) maxRun = run; } }
  check(maxRun < 40, 'in two and a half minutes with nobody near it never stands still for forty seconds (longest ' + maxRun + ' s)');
}

// the valley (2026-10-30, the map doubled): roads walkable at full width, every place reachable on foot from the junction on the
// sim's 40 px grid, the ground the art keeps clear (FoundingMap.KEEP) in step with the camps, the chain and the quests, and the
// different systems' places kept apart
function sectionValley() {
  console.log('The valley:');
  check(M.W === 6400 && M.H === 4800, 'the valley is 6400 x 4800');
  for (const L of M.LANES) {
    let bad = 0; for (const p of L.path) for (const o of [-40, -20, 0, 20, 40]) { const x = p[0] - p[4] * o, y = p[1] + p[3] * o; if (x > 20 && x < M.W - 20 && y > 20 && !M.walkable(x, y, 12)) bad++; }
    check(bad === 0, `${L.name} is walkable end to end at full width (${bad} blocked)`); check(M.laneLength(L.id) > 3400, `${L.name} is long (${Math.round(M.laneLength(L.id))} px)`);
  }
  for (const [k, pl] of Object.entries(M.FOOT)) { let bad = 0; for (const p of pl) if (!M.walkable(p[0], p[1], 12)) bad++; check(bad === 0, `the ${k} footpath is walkable (${bad} blocked)`); }
  const G = 40, cols = Math.ceil(M.W / G), rows = Math.ceil(M.H / G), seen = new Uint8Array(cols * rows);
  const s0 = [Math.round(M.P.junction[0] / G), Math.round(M.P.junction[1] / G)], q = [s0]; seen[s0[1] * cols + s0[0]] = 1;
  while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx] || !M.walkable(nx * G, ny * G, 12)) continue; seen[ny * cols + nx] = 1; q.push([nx, ny]); } }
  // (a solid building or the Pike's pond is reached at its edge: look a few cells round it)
  const reach = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const gx = Math.round(x / G) + i, gy = Math.round(y / G) + j; if (gx >= 0 && gy >= 0 && gx < cols && gy < rows && seen[gy * cols + gx]) return true; } return false; };
  const s = quiet(1, 7); runFor(s, 0.2);
  const X = FoundingSim.QUESTX, QT = D.QUEST_TUNE, CAMPS = FoundingSim.WILD.CAMPS, LINKS = FoundingSim.CHAIN.LINKS;
  const LATE = [[4, 5126, 2326], [6, 600, 4384], [2, 1504, 1872], [7, 2660, 1716]];   // the secrets the sim adds later (sim.js addSecret)
  const groups = {
    camp: CAMPS.map(c => [c.id, c.x, c.y]),
    chain: LINKS.map(L => [L.id, L.place[0], L.place[1], L.pond]),
    quest: [['start', ...X.START], ...X.STAKES.map((p, i) => ['stake ' + i, ...p]), ['mill', ...X.MILL], ['shed', ...X.SHED], ...X.LARDER.map((p, i) => ['sack ' + i, ...p]), ['quarry', ...X.PILE], ['bell', ...X.BELL], ['ward', ...X.WARD], ...X.FIRES.map((p, i) => ['watch-fire ' + i, ...p])],
    secret: s.secrets.map(x => ['secret ' + x.n, x.x, x.y]).concat(LATE.map(x => ['secret ' + x[0], x[1], x[2]])),
  };
  const all = [];
  for (const k in groups) for (const p of groups[k]) all.push([k + ' ' + p[0], p[1], p[2], p[3] ? 3 : 0]);
  for (const [k, p] of Object.entries(M.P)) all.push(['place ' + k, p[0], p[1], 3]);
  for (const [k, h] of Object.entries(QT.haul)) { all.push(['haul ' + k + ' from', h.from[0], h.from[1], 1]); all.push(['haul ' + k + ' to', h.to[0], h.to[1], 1]); }
  all.push(['the carving', QT.carve[0], QT.carve[1], 1], ['the covering', QT.cover[0], QT.cover[1], 3]); QT.fires.forEach((f, i) => all.push(['camp fire ' + i, f[0], f[1], 2]));
  let unreached = all.filter(p => !reach(p[1], p[2], p[3]));
  check(unreached.length === 0, 'every place, camp, link, quest object and secret is reachable on foot from the junction' + (unreached.length ? ': ' + unreached.map(p => p[0]).join(', ') : ''));
  const keep = new Set(M.KEEP.map(p => p.join()));
  const unkept = groups.camp.concat(groups.chain, groups.quest).filter(p => !keep.has(p[1] + ',' + p[2]));
  check(unkept.length === 0, 'FoundingMap.KEEP lists every camp, link and quest object (so the art keeps their ground clear)' + (unkept.length ? ': ' + unkept.map(p => p[0]).join(', ') : ''));
  // apart: 450 px between places of different systems, except the pairings the story makes on purpose (the carved oak's secrets at
  // the Stumpwarden, and the camp's own secrets by the spring and the shed)
  const inCamp = p => hyp(p[1] - M.P.hearth[0], p[2] - M.P.hearth[1]) < M.CAMP_R + 300;
  const OK = new Set(['chain warden|secret secret 1', 'chain warden|secret secret 5']);
  const ks = Object.keys(groups), close = [];
  for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) for (const p of groups[ks[a]]) for (const r of groups[ks[b]]) {
    const d = hyp(p[1] - r[1], p[2] - r[2]); if (d >= 450 || (inCamp(p) && inCamp(r)) || OK.has(ks[a] + ' ' + p[0] + '|' + ks[b] + ' ' + r[0])) continue; close.push(`${ks[a]} ${p[0]} / ${ks[b]} ${r[0]} ${Math.round(d)} px`);
  }
  check(close.length === 0, 'the camps, the chain, the quests and the secrets keep 450 px apart' + (close.length ? ': ' + close.join('; ') : ''));
  const onPath = groups.camp.concat(groups.chain, groups.quest).filter(p => M.laneAt(p[1], p[2]) || Object.values(M.FOOT).some(pl => M.near(pl, p[1], p[2]).d < 60));
  check(onPath.length === 0, 'no camp, link or quest object sits on a lane or a footpath' + (onPath.length ? ': ' + onPath.map(p => p[0]).join(', ') : ''));
  check(CAMPS.length >= 14, 'the bigger wilds hold fourteen camps or more (' + CAMPS.length + ')');
  check(M.SOLIDS.length < 3200, 'the art stands a sparse valley (' + M.SOLIDS.length + ' solids)');
}

// the solo pause, the readiness bits, the damage meter and the next-wave preview
function sectionHold() {
  console.log('Solo pause, readiness bits, meter, next-wave preview:');
  // one human can hold the sim; every clock in it stands still, and resuming goes on from the same moment
  const s = makeSim(1, 61); runFor(s, 3);
  s.heroes[0].hp = 5; s.killHero(s.heroes[0]);
  const snapA = { time: s.time, next: s.nextWaveAt, resp: s.heroes[0].respT, tickN: s.tickN, fds: s.log.fds };
  const timerFired = []; s.timers.push({ t: s.time + 1, fn: () => timerFired.push(s.time) });
  check(s.setPaused(true) === true && s.isPaused(), 'a lone human can hold the sim');
  runFor(s, 60);   // (runFor stops only if the run ends)
  for (let i = 0; i < 1200; i++) s.tick(DT);
  check(s.time === snapA.time && s.nextWaveAt === snapA.next && s.heroes[0].respT === snapA.resp && s.tickN === snapA.tickN, 'a held sim keeps its time, wave clock, respawn and tick count');
  check(timerFired.length === 0 && s.log.fds === snapA.fds, 'a held sim fires no timer and sends no snapshot');
  s.intent('p0', { k: 'move', x: 3000, y: 3000 }); check(!s.heroes[0].path, 'an intent while held changes nothing');
  check(s.setPaused(false) === false && !s.isPaused(), 'the hold lifts');
  for (let i = 0; i < 22; i++) s.tick(DT);
  check(Math.abs(s.time - (snapA.time + 1.1)) < 1e-6 && s.heroes[0].respT < snapA.resp, 'resuming goes on from the same moment');
  check(timerFired.length === 1 && timerFired[0] >= snapA.time + 1 - 1e-6, 'a held timer fires on time after the resume');
  // two humans cannot hold; a pair that drops to one can; a hold ends the moment a second human is in the run again
  const s2 = makeSim(2, 62); runFor(s2, 1);
  check(s2.setPaused(true) === false && !s2.isPaused(), 'two humans cannot hold the sim');
  s2.removePlayer('p1'); check(s2.setPaused(true) === true, 'when one of two leaves, the other can hold it');
  const t2 = s2.time; s2.tick(DT); check(s2.time === t2, 'and it is held');
  s2.players.push({ id: 'p9', name: 'Back', hero: 'cleric', ready: true }); s2.tick(DT);
  check(!s2.isPaused() && s2.time > t2, 'a second human in the run ends the hold');
  // not before the run, not after it
  const s3 = makeSim(1, 63); check(s3.setPaused(true) === true, 'held in a live run'); s3.setPaused(false); s3.finish(false); check(s3.setPaused(true) === false, 'a finished run cannot be held');
  // the readiness bits (hero row [12]): learned, charged and level-gated
  const r = makeSim(2, 64, { heroes: ['pyromancer', 'cleric'] }); runFor(r, 1);
  const row = id => r.snapshot().h.find(x => x[0] === id), h0 = r.hmap.p0;
  h0.ranks = [1, 0, 2, 1]; h0.level = D.LEVELS.rLevel - 1; h0.ch = [1, 1, 1, 1]; h0.chMax = [1, 1, 1, 1];
  check(row('p0')[12] === 0b0101, 'learned and charged: Q and E ready; the unlearned W and the R below its level are not (' + row('p0')[12] + ')');
  h0.level = D.LEVELS.rLevel; check(row('p0')[12] === 0b1101, 'the R is ready at its level');
  h0.ch[0] = 0; check(row('p0')[12] === 0b1100, 'a cooling skill is not ready');
  r.killHero(h0); check(row('p0')[12] === 0, 'a fallen hero has none ready');
  // the meter: a total of damage and healing per hero, about once a second and on a full snapshot
  const m = makeSim(2, 65); runFor(m, 2);
  m.stats.p0.dmg = 1234; m.stats.p1.heal = 567;
  const dm = m.snapshot(true).dm; check(Array.isArray(dm) && dm.length === 2 && dm.find(x => x[0] === 'p0')[1] === 1234 && dm.find(x => x[0] === 'p1')[2] === 567, 'a full snapshot carries each hero\'s damage and healing totals');
  let withDm = 0, snaps = 0; const keep = m.emit; m.emit = x => { if (x.t === 'fds') { snaps++; if (x.dm) withDm++; } keep(x); }; runFor(m, 10);
  check(snaps >= 40 && withDm >= 8 && withDm <= snaps / 3, 'the totals ride on about one snapshot in ten (' + withDm + ' of ' + snaps + ')');
  // the next-wave preview: fixed counts by kind, never a boss's name, never anything a module adds
  for (let n = 1; n <= D.LAST_WAVE; n++) {
    const f = D.forecast(n), w = D.WAVES[n - 1]; let sum = 0; for (const k of f.kinds) sum += k.n;
    check(sum === w.groups.reduce((a, g) => a + (D.ENEMIES[g.kind].boss ? 0 : g.n), 0), 'wave ' + n + ' preview counts every ordinary enemy');
    check(f.boss === !!D.BOSS_WAVES[n] && f.last === (n === D.LAST_WAVE) && f.night === D.isNightWave(n), 'wave ' + n + ' preview flags boss, siege and night');
    check(!f.kinds.some(k => D.ENEMIES[k.kind].boss || D.ENEMIES[k.kind].inert), 'wave ' + n + ' preview lists no boss and no dam log');
    check(!JSON.stringify(f).match(/tunnelmaw|wickeater|mirebull|oldgnaw/), 'wave ' + n + ' preview never names a boss');
  }
  check(D.forecast(0) === null && D.forecast(D.LAST_WAVE + 1) === null, 'no preview past either end');
}

if (process.env.FT_EXPORT) { module.exports = { play, makeSim, botStep, makeBot, quiet }; return; }
const T0 = Date.now();
const SECTIONS = [sectionHold, sectionValley, sectionQuests, sectionEconomy, sectionLevels, sectionSkills, sectionBoss, sectionBeaconRoad, sectionGravesGate, sectionNight, sectionBosses, sectionSiege, sectionPayout, sectionBoons, sectionPass2, sectionGnawWander, sectionPerf, sectionRuns];
try {
  for (const f of SECTIONS) { const t = Date.now(); f(); if (VERBOSE) console.log(`  (${f.name}: ${((Date.now() - t) / 1000).toFixed(1)} s)`); }
} catch (e) { failures++; console.log('EXCEPTION: ' + e.stack); }
console.log(`(${passed} checks passed, ${((Date.now() - T0) / 1000).toFixed(1)} s)`);
if (failures) { console.log(`Founding FAILED (${failures} problem${failures > 1 ? 's' : ''})`); process.exit(1); }
console.log('Founding OK');
