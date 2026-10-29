// The Founding: the tuning runner. A human-like pilot (late reactions, heroes standing in red shapes, slack rotations, imperfect
// focus, decent-but-not-optimal quests, a little shopping, a brand that sometimes burns out) plays whole thirty-wave runs against
// the real FoundingSim in Node, many seeds, in child processes, with every feature loaded (towers and soldiers, wild camps, items, the
// hidden chain). Not part of check.js.
// Usage: node tools/founding-tune.js [--sizes 1,2,3,4] [--seeds 40] [--seed0 1] [--jobs 12] [--skill 1] [--out file.json] [--v]
//   --skill  scales the pilot's sloppiness (1 = the standard human, 0.5 = a sharper one, 1.5 = a looser one)
//   --perfect  the pilot with no lapses at all (reaction 0.2 s, never forgets): an upper bound
//   --heroes a,b,c  force one line-up (e.g. bastion,cleric) for the given size
//   --report  also print every run, and the per-wave table
// Prints the clear rate, the wave reached, deaths, camp HP over time, quests done, boss times and where runs end.

const path = require('path');
const cp = require('child_process');
const { FoundingMap: M } = require(path.join(__dirname, '../client/js/founding/map-data.js'));
const { FOUNDING_DATA: D } = require(path.join(__dirname, '../client/js/founding/data.js'));
const { FoundingSim } = require(path.join(__dirname, '../client/js/founding/sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain', 'sim-quests', 'sim-trials']) require(path.join(__dirname, '../client/js/founding/' + m + '.js'));   // feature modules register on FoundingSim.mods
const { FoundingArt } = require(path.join(__dirname, '../client/js/founding/map-art.js'));
FoundingArt.layoutOnly();

const hyp = Math.hypot, PI = Math.PI, TAU = PI * 2, DT = 0.05;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : process.argv[i + 1]); };
const EVAL = arg('eval', null), CFG = arg('cfg', null);
// --cfg file.json: patch the data for a trial (the same numbers that end up in data.js): camp (by party size 1-4), boss and log (base health multipliers), xp (by party size 1-4), hpScale a (per wave), dmgScale a (per wave), wave {mul, mulEl, crowd, bossLane, bossOther} (rebuilds the waves), set {"ENEMIES.brute.hp": 300, "WAVES.4.groups.0.n": 3}
function applyCfg(c) {
  const clampN = n => Math.max(1, Math.min(4, n));
  if (c.wave) { Object.assign(D.WAVE_TUNE, c.wave); D.rebuildWaves(); }
  if (c.camp) D.campHp = n => c.camp[clampN(n) - 1];
  if (c.boss) D.bossHpMul = n => c.boss * D.BOSS_SIZE[clampN(n) - 1];   // base health multiplier (times the party step 1, 1.25, 1.5, 1.75)
  if (c.log) D.logHpMul = n => c.log * D.BOSS_SIZE[clampN(n) - 1];
  if (c.xp) D.xpMul = n => c.xp[clampN(n) - 1];
  if (c.hpScale !== undefined) D.hpScale = w => 1 + c.hpScale * Math.max(0, w - 1);
  if (c.dmg) for (const k in D.ENEMIES) { const e = D.ENEMIES[k]; if (!e.boss && !e.inert) e.atk.dmg = Math.round(e.atk.dmg * c.dmg * 10) / 10; }
  for (const [a, b, m] of (c.waveMul || [])) for (const w of D.WAVES) if (w.n >= a && w.n <= b) for (const g of w.groups) g.n = Math.max(1, Math.round(g.n * m));
  if (c.dmgScale !== undefined) D.dmgScale = w => 1 + c.dmgScale * Math.max(0, w - 1);
  if (c.campTake !== undefined) D.CAMP_TAKE = c.campTake;
  for (const k in (c.set || {})) { const parts = k.split('.'); let o = D; for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]]; o[parts[parts.length - 1]] = c.set[k]; }
}
if (CFG && CFG !== true) applyCfg(JSON.parse(require('fs').readFileSync(CFG, 'utf8')));
if (EVAL && EVAL !== true) { try { new Function('D', 'M', 'FoundingSim', EVAL)(D, M, FoundingSim); } catch (e) { console.error('--eval failed: ' + e.message); process.exit(1); } }
const JG = { mode: String(arg('jg', 'lull')), lead: parseFloat(arg('jglead', 40)), maxTrip: parseFloat(arg('jgtrip', 110)), maxDist: parseFloat(arg('jgdist', 1500)), hp: parseFloat(arg('jghp', 0.7)), cd: parseFloat(arg('jgcd', 6)) };   // --jg lull|greedy|off: how the party jungles
const SKILL = parseFloat(arg('skill', 1)), PERFECT = !!arg('perfect', false);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
function segDist(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return hyp(px - (x1 + dx * t), py - (y1 + dy * t)); }

const HOLD = [1615, 1700], HOLD_SIEGE = [1400, 1010], MIRE_HOLD = [2390, 1190];
const HAUL = ['beacon', 'graves', 'stonegate', 'roof'];

// which skill a person levels next (the sim's own rules decide what is allowed): the ultimate whenever a rank opens, the passive three times in four, then the thinnest of Q W E
function learnPick(sim, h, rnd) {
  if (sim.canLearn(h, 'r')) return 'r';
  if (sim.canLearn(h, 'p') && rnd() < 0.75) return 'p';
  const order = ['q', 'w', 'e'].filter(s => sim.canLearn(h, s)).sort((a, b) => h.ranks['qwer'.indexOf(a)] - h.ranks['qwer'.indexOf(b)] + (rnd() - 0.5));
  if (order.length) return order[0];
  return sim.canLearn(h, 'p') ? 'p' : null;
}

// ---------------------------------------------------------------- the human
// All the sloppiness lives here. Times are seconds, chances 0..1; SKILL scales the lapses (not the reaction floor).
const H = {
  reactMin: 0.30, reactMax: 0.80,     // seeing a red shape / an event, to moving
  failRanged: 0.12, failMelee: 0.28,  // chance to ignore a heavy red shape altogether (stand in it)
  slack: { q: 0.5, w: 1.0, e: 1.1, r: 2.2 },   // mean extra seconds before a ready skill is used (exponential)
  forget: 0.06,                       // chance per decision to skip a cast
  aimErr: 38,                         // px of error on ground targets
  badAim: 0.12,                       // chance a ground skill goes at the nearest enemy instead of the crowd
  braceSigma: 0.15,                   // the tank's timing error on Brace
  questDelay: [4, 16],                // seconds after an offer before the party starts a quest
  questLate: 0.20,                    // chance the party leaves a quest until late in its window
  questForget: 0.07,                  // chance the party forgets a quest at first (40% remember it late)
  helper: 0.35,                       // chance a second hero goes along (parties of 3+)
  retreatAt: 0.33,                    // hp fraction to run for the fountain
  shopEvery: 14,                      // a shop trip about this often when there is gold
  drift: 0.5,                         // chance per few seconds to chase the nearest enemy off the hold point
  brandLag: [1.5, 6],                 // seconds before the carrier relights a burnt-out brand
};
if (PERFECT) Object.assign(H, { reactMin: 0.2, reactMax: 0.25, failRanged: 0, failMelee: 0, slack: { q: 0.05, w: 0.1, e: 0.1, r: 0.1 }, forget: 0, aimErr: 5, badAim: 0, braceSigma: 0.04, questDelay: [0.5, 1], questLate: 0, questForget: 0, helper: 1, shopEvery: 6, drift: 0, brandLag: [0.2, 0.3] });
else if (SKILL !== 1) { for (const k of ['failRanged', 'failMelee', 'forget', 'badAim', 'questLate', 'questForget', 'drift']) H[k] = Math.min(0.95, H[k] * SKILL); for (const k in H.slack) H.slack[k] *= SKILL; H.aimErr *= SKILL; H.braceSigma *= SKILL; H.reactMax = H.reactMin + (H.reactMax - H.reactMin) * SKILL; }

// ---------------------------------------------------------------- one run
function makeRun(N, seed, heroes) {
  const players = []; for (let i = 0; i < N; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const rec = { waves: {}, deathsBy: {}, campBy: {}, heroBy: {}, boss: {}, q: {}, hz: {}, pb: 0, perfect: 0, dead: [], partT: {}, events: [] };
  const hazards = [];   // live telegraphs: {id, shape, x, y, a, b, w, warn, col, born, end}
  let sim = null;
  const emit = m => {
    if (m.t !== 'fdx') return;
    for (const e of m.ev) {
      switch (e[0]) {
        case 't': hazards.push({ id: e[1], shape: e[2], x: e[3], y: e[4], a: e[5], b: e[6], w: e[7], warn: e[8], col: e[9], born: sim.time, end: sim.time + e[8] }); break;
        case 'i': { const i = hazards.findIndex(z => z.id === e[1]); if (i >= 0) hazards.splice(i, 1); break; }
        case 'w': { rec.waves[e[1]] = { t: Math.round(sim.time), camp: Math.round(sim.camp.hp / sim.camp.max * 100), alive: sim.heroes.filter(h => !h.dead).length, enemies: sim.enemies.filter(x => !x.dead).length }; break; }
        case 'boss': rec.boss[D.ENEMY_IDS[e[2]]] = { spawn: sim.time, engage: null, down: null }; break;
        case 'bossdown': { const b = rec.boss[D.ENEMY_IDS[e[2]]]; if (b) b.down = sim.time; break; }
        case 'gp': rec.partT[e[2]] = sim.time; break;
        case 'q': rec.q[e[1]] = rec.q[e[1]] || {}; rec.q[e[1]][e[2]] = Math.round(sim.time); break;
        case 'hd': { const h = sim.hmap[e[1]]; rec.dead.push([Math.round(sim.time), sim.wave, h ? h.hero : '?']); break; }
        case 'pb': rec.perfect++; break;
      }
    }
  };
  sim = new FoundingSim({ players, emit, emitTo() {}, seed });
  players.forEach((p, i) => sim.intent(p.id, { k: 'pick', hero: heroes[i] }));
  sim.intent('p0', { k: 'ready' });
  // account who hurts whom, and what the camp loses, by wave and by kind
  const oH = sim.hurtHero.bind(sim), oO = sim.hurtObj.bind(sim);
  sim.hurtHero = (h, amt, src, o) => { const a = oH(h, amt, src, o); if (a > 0) { const k = src ? (src.kind || src.tk) : '?'; rec.heroBy[k] = (rec.heroBy[k] || 0) + a; if (h.hp <= 0) rec.deathsBy[k] = (rec.deathsBy[k] || 0) + 1; } return a; };
  sim.hurtObj = (t, dmg, e, a) => { const before = t.tk === 'camp' ? sim.camp.hp : 0; oO(t, dmg, e, a); if (t.tk === 'camp') { const d = before - sim.camp.hp; if (d > 0) { const k = e ? e.kind : '?'; rec.campBy[k] = (rec.campBy[k] || 0) + d; } } };
  return { sim, rec, hazards };
}

class Team {
  constructor(sim, rnd, N) { this.sim = sim; this.rnd = rnd; this.N = N; this.plan = {}; this.pilots = []; }
  between(a, b) { return a + this.rnd() * (b - a); }
  // each active quest: when the party notices it, who goes
  update() {
    const sim = this.sim, now = sim.time;
    for (const id of D.QUEST_ORDER) {
      const st = sim.q[id].st, Q = D.QUESTS[id];
      if (st !== 1) { if (this.plan[id]) this.plan[id].done = true; continue; }
      let p = this.plan[id];
      if (!p) {
        const win = Math.max(D.WAVE_GAP, (Q.deadlineWave - Q.offerWave) * D.WAVE_GAP), roll = this.rnd();
        p = this.plan[id] = { t0: now, mode: 'go', at: now + this.between(H.questDelay[0], H.questDelay[1]), crew: null, recheck: now + win * 0.65 };
        if (roll < H.questForget) p.mode = 'forget';
        else if (roll < H.questForget + H.questLate) { p.mode = 'late'; p.at = now + win * this.between(0.35, 0.6); }
        if (id === 'cover' && p.mode === 'forget') p.mode = 'late';   // the Covering is announced loudly; at worst it is late
      }
      if (p.mode === 'forget' && now >= p.recheck) { if (this.rnd() < 0.4) { p.mode = 'go'; p.at = now + this.between(2, 6); } else p.recheck = 1e9; }
      if (p.crew || p.mode === 'forget' || now < p.at) continue;
      // pick the crew: damage dealers first (a lone support hero is the quest hero only if nobody else is there)
      const live = this.pilots.filter(q => !q.h.dead);
      const rank = q => (q.h.hero === 'ranger' ? 0 : q.h.hero === 'pyromancer' ? 1 : q.h.hero === 'bastion' ? 2 : 3) + (q.questLoad || 0) * 1.5 + this.rnd() * 0.8;
      live.sort((a, b) => rank(a) - rank(b));
      if (!live.length) continue;
      const crew = [live[0]]; if (this.N >= 3 && live.length > 1 && this.rnd() < H.helper) crew.push(live[1]);
      if (id === 'cover' && this.N >= 2 && live.length > 1 && !crew.includes(live[1])) crew.push(live[1]);
      p.crew = crew.map(q => q.i); for (const q of crew) q.questLoad = (q.questLoad || 0) + 1;
    }
  }
}

const task0 = p => { const plan = p.team.myQuest(p.i); return !!(plan && !p.team.noQuests && plan.some(id => p.sim.q[id].st === 1) && p.questTask(plan)); };
class Pilot {
  constructor(sim, h, i, team, rnd, run) {
    this.sim = sim; this.h = h; this.i = i; this.team = team; this.rnd = rnd; this.run = run; this.N = team.N;
    this.avail = [0, 0, 0, 0]; this.wasZero = [false, false, false, false]; this.seen = new Map(); this.pressAt = new Map();
    this.nextCast = 0; this.dodgeUntil = 0; this.lastMove = -9; this.lastAct = -9; this.shopAt = 30 + rnd() * 20; this.driftAt = 0; this.driftTo = null;
    this.learnAt = 0; this.boonAt = 0; this.retreat = false; this.brandAt = 0; this.stackSeen = new Set(); this.questLoad = 0; this.mireAt = 0; this.wantShop = false; this.useAt = 0;
    this.jgOK = false; this.jgNext = 0; this.forgeAt = 60 + rnd() * 60; this.leadAt = 0; this.idleT = 0; this.holdOff = [ (rnd() - 0.5) * 60, (rnd() - 0.5) * 40 ];
  }
  gauss() { return (this.rnd() + this.rnd() + this.rnd() - 1.5) * 1.6; }
  react() { return H.reactMin + this.rnd() * (H.reactMax - H.reactMin); }
  S(m) { this.sim.intent(this.h.id, m); }
  ready(i) { const h = this.h; return h.ranks[i] > 0 && h.ch[i] > 0 && !(i === 3 && h.level < 6) && this.sim.time >= this.avail[i]; }
  // note when a skill comes off cooldown, and add the human slack before it is used
  watch() {
    const h = this.h, now = this.sim.time, key = ['q', 'w', 'e', 'r'];
    for (let i = 0; i < 4; i++) {
      if (h.ch[i] === 0) { this.wasZero[i] = true; this.avail[i] = 1e9; }
      else if (this.wasZero[i] || this.avail[i] >= 1e9) { this.wasZero[i] = false; this.avail[i] = now - Math.log(1 - this.rnd()) * H.slack[key[i]]; if (this.avail[i] > now + 4) this.avail[i] = now + 4; }
    }
  }
  cast(i, m, force) {
    const now = this.sim.time, h = this.h;
    if (!force) { if (now < this.nextCast || h.cast || h.stun > 0) return false; if (this.rnd() < H.forget) return false; }
    if (h.cast && !h.cast.mobile) return false;
    this.S(Object.assign({ k: 'cast', s: 'qwer'[i] }, m)); this.avail[i] = 1e9; this.wasZero[i] = true; this.nextCast = now + 0.25 + this.rnd() * 0.3; return true;
  }
  move(x, y, gap) { const now = this.sim.time; if (now - this.lastMove > (gap === undefined ? 0.5 : gap)) { this.S({ k: 'move', x, y }); this.lastMove = now; return true; } return false; }
  // an error on a ground target
  aim(x, y) { return { x: x + this.gauss() * H.aimErr, y: y + this.gauss() * H.aimErr }; }
  hazardHit(z, x, y, pad) {
    if (z.shape === 0) return hyp(x - z.x, y - z.y) < z.a + pad;
    if (z.shape === 2) { const d = hyp(x - z.x, y - z.y); return d < z.b + pad && (d < 24 || Math.abs(angDiff(z.a, Math.atan2(y - z.y, x - z.x))) < z.w + pad / Math.max(40, d)); }
    return segDist(x, y, z.x, z.y, z.x + Math.cos(z.a) * z.b, z.y + Math.sin(z.a) * z.b) < z.w + pad;
  }
  holdPoint() {
    const sim = this.sim, h = this.h;
    const m = sim.enemies.find(e => !e.dead && e.kind === 'mirebull' && e.ai && e.ai.ph !== 'walk');
    const rangedDps = this.team.pilots.some(q => q.h.hero === 'pyromancer' || q.h.hero === 'ranger');
    if (m && (h.hero === 'pyromancer' || h.hero === 'ranger' || !rangedDps)) {
      if (!this.mireAt) this.mireAt = sim.time + 2 + this.rnd() * 5;
      if (sim.time >= this.mireAt && (this.N > 1 || !sim.enemies.some(e => !e.dead && e !== m && e.kind !== 'damlog' && hyp(e.x - M.P.hearth[0], e.y - M.P.hearth[1]) < 700))) return MIRE_HOLD;
    } else this.mireAt = 0;
    if (sim.wave >= D.LAST_WAVE) {   // the siege: the tank walks the beast up the road; the rest clear what has leaked into the camp first
      const g = sim.enemies.find(e => !e.dead && e.kind === 'oldgnaw');
      if (g && hyp(g.x - M.P.hearth[0], g.y - M.P.hearth[1]) < 900) return HOLD;
      if (this.team.carrier() !== this.i) { let n = 0; for (const e of sim.enemies) if (!e.dead && !e.def.boss && hyp(e.x - M.P.hearth[0], e.y - M.P.hearth[1]) < 450) n++; if (n >= 3) return HOLD; }
      return HOLD_SIEGE;
    }
    return HOLD;
  }

  step() {
    const sim = this.sim, h = this.h, now = sim.time;
    if (sim.st !== 'live' || sim.ending) return;
    if (h.dead) { this.retreat = false; this.seen.clear(); return; }
    this.watch();
    // ---- level up, boons (a few seconds late)
    // a person spends a point a few seconds after the level: the ultimate when it opens, the passive sometimes, otherwise the thinnest of Q W E
    if (h.level - sim.spent(h) > 0) { if (!this.learnAt) this.learnAt = now + 2 + this.rnd() * 6; if (now >= this.learnAt) { this.learnAt = 0; const s = learnPick(sim, h, this.rnd); if (s) this.S({ k: 'learn', s }); } }
    if (h.offers) { if (!this.boonAt) this.boonAt = now + 3 + this.rnd() * 8; if (now >= this.boonAt) { this.boonAt = 0; this.S({ k: 'boon', id: h.offers[Math.floor(this.rnd() * h.offers.length)] }); } }
    // ---- drink a draught when low
    if (h.hp < h.max * 0.3 && now >= this.useAt) { this.useAt = now + 4; const si = h.items.findIndex(x => x && D.ITEM[x.id].use); if (si >= 0 && this.rnd() < 0.8) this.S({ k: 'use', slot: si }); else if (h.flask) this.S({ k: 'use', slot: 'f' }); }
    const foes = sim.enemies.filter(e => !e.dead && !e.under && (!e.w || this.jg));   // (wild camps are not the lanes' business unless we are hunting)
    const near = foes.filter(e => hyp(e.x - h.x, e.y - h.y) < 420 && e.kind !== 'damlog');
    // ---- red shapes: see them late, sometimes not leave
    const hz = this.sim.hazardsRef;
    const live = hz.filter(z => z.end > now - 0.1);
    let dodging = false;
    const melee = h.hero === 'bastion', failP = Math.min(0.9, (melee ? H.failMelee : H.failRanged));
    for (const z of live) {
      let s = this.seen.get(z.id);
      if (!s) { s = { at: z.born + this.react(), fail: this.rnd() < failP, did: false, stack: false }; this.seen.set(z.id, s); }
      if (z.col === 1) {   // blue: the Tunnelmaw's stack (95 wide): join it
        if (z.a === 95 && !s.did && now >= s.at && this.rnd() < 0.85 && s.fail === false) { s.did = true; this.move(z.x + this.gauss() * 20, z.y + this.gauss() * 20, 0); this.dodgeUntil = z.end + 0.1; dodging = true; }
        continue;
      }
      if (now < s.at || s.did || s.fail) continue;
      if (!this.hazardHit(z, h.x, h.y, 16)) continue;
      if (z.warn < 1.0) continue;   // an ordinary strike: nobody dodges these
      // the tank would rather Brace the blow than step out of it
      if (melee && h.ranks[2] > 0 && h.ch[2] > 0 && this.rnd() < 0.55) { s.did = true; this.pressAt.set(z.id, z.end - 0.22 + this.gauss() * H.braceSigma); continue; }
      s.did = true; const hzs = live.filter(q => q.col !== 1);
      const hold = this.holdPoint(); let best = null;
      for (const d of [50, 85, 125, 170, 230]) {
        let bs = 1e9;
        for (let k = 0; k < 16; k++) { const a = k * TAU / 16, px = h.x + Math.cos(a) * d, py = h.y + Math.sin(a) * d; if (!M.walkable(px, py, 14) || hzs.some(q => this.hazardHit(q, px, py, 22))) continue; const sc = d + 0.15 * hyp(px - hold[0], py - hold[1]); if (sc < bs) { bs = sc; best = [px, py]; } }
        if (best) break;
      }
      if (best) { this.S({ k: 'move', x: best[0], y: best[1] }); this.lastMove = now; this.dodgeUntil = z.end + 0.25; dodging = true; }
    }
    for (const [id, t] of this.pressAt) { if (now >= t) { if (now < t + 0.4 && h.ch[2] > 0 && !h.cast) this.cast(2, {}, true); this.pressAt.delete(id); } }
    if (this.seen.size > 60) for (const k of this.seen.keys()) if (!live.some(z => z.id === k)) this.seen.delete(k);
    if (now < this.dodgeUntil) { /* keep moving where we were sent */ }

    // ---- low health: run for the fountain
    const hpf = h.hp / h.max;
    if (!this.retreat && hpf < H.retreatAt && h.hero !== 'bastion' && near.length && now > this.dodgeUntil && this.rnd() < 0.5) { this.retreat = true; this.retreatT = now + this.react(); }
    if (!this.retreat && hpf < H.retreatAt * 0.7 && h.hero === 'bastion' && now > this.dodgeUntil && near.length && this.rnd() < 0.3) { this.retreat = true; this.retreatT = now + this.react(); }
    if (this.retreat) {
      if (hpf > 0.8 || (near.length === 0 && hpf > 0.6)) this.retreat = false;
      else if (now >= this.retreatT) { const sp = M.P.spring; if (hyp(h.x - sp[0], h.y - sp[1]) > 90) this.move(sp[0] + 20, sp[1] - 30, 1.2); if (h.hero !== 'cleric' || near.length === 0) return; }
    }
    if (now < this.dodgeUntil) return;

    // ---- the brand (Old Gnaw's siege): the tank, or whoever is alone, carries it
    const gnaw = sim.enemies.find(e => !e.dead && e.kind === 'oldgnaw');
    const carrier = this.team.carrier();
    if (carrier === this.i && !this.team.noQuests && sim.wave >= D.LAST_WAVE && h.brand < 6) {
      if (!this.brandAt) this.brandAt = now + H.brandLag[0] + this.rnd() * (H.brandLag[1] - H.brandLag[0]);
      if (now >= this.brandAt) {
        const fp = D.QUEST_TUNE.fires[0];
        if (hyp(h.x - fp[0], h.y - fp[1]) > 90) { this.move(fp[0] - 70, fp[1] - 30, 1); return; }
        this.S({ k: 'carry' }); this.brandAt = 0; return;
      }
    }
    // the beast follows the warmest thing it can smell: until the brand out-pulls the lit posts and the Hearth, walk it out to the brand
    if (carrier === this.i && gnaw && h.brand > 0 && !(gnaw.ai.tgt && gnaw.ai.tgt.k === 2)) {
      const d = hyp(gnaw.x - h.x, gnaw.y - h.y);
      if (d > 520 && now > this.leadAt) { const k = 470 / d, px = gnaw.x + (h.x - gnaw.x) * k, py = gnaw.y + (h.y - gnaw.y) * k; this.move(px, py, 1.2); return; }
    }
    // the last wave, the boss down and a straggler still about (a spitter on the far bank, a shade in the dark): after a while the party goes and finds it
    { const left = sim.wave >= D.LAST_WAVE && !sim.spawnQ.length ? sim.enemies.filter(e => !e.dead && !e.def.boss && !e.under) : [];
      if (left.length && left.length <= 6 && !sim.enemies.some(e => !e.dead && e.def.boss)) { if (!this.mopAt) this.mopAt = now + 20 + this.rnd() * 10; } else this.mopAt = 0;
      if (this.mopAt && now >= this.mopAt && !h.carry && !h.chan) { let t = left[0]; for (const e of left) if (hyp(e.x - h.x, e.y - h.y) < hyp(t.x - h.x, t.y - h.y)) t = e; if (hyp(t.x - h.x, t.y - h.y) > h.K.range + 30) this.move(t.x, t.y, 1); else if (now - this.lastAct > 1) { this.S({ k: 'attack', id: t.id }); this.lastAct = now; } return; } }
    // idle hands: hunt what is left (a spitter on the far bank, the Mirebull's logs, a boss in its pocket)
    if (near.length === 0 && foes.length) { this.idleT = (this.idleT || 0) + DT; if (this.idleT > 10 && now - this.lastMove > 1.5 && !h.carry && !h.chan) { let t0 = foes[0]; for (const e of foes) if (hyp(e.x - h.x, e.y - h.y) < hyp(t0.x - h.x, t0.y - h.y)) t0 = e; if (!(gnaw && carrier === this.i)) { this.S({ k: 'attack', id: t0.id }); this.lastMove = now; } } } else this.idleT = 0;
    // ---- the long walk home: after an errand far from the hold point a person presses B
    if (!this.recallAt) this.recallAt = 0;
    if (!h.carry && !h.chan && !task0(this) && near.length === 0 && h.rcCd <= 0 && now >= this.recallAt && hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) > 900) { this.recallAt = now + 3 + this.rnd() * 5; if (this.rnd() < 0.6) { this.S({ k: 'recall' }); this.recalled = (this.recalled || 0) + 1; } }
    if (h.rcOn) return;
    // ---- a quest task
    let task = null;
    const plan = this.team.myQuest(this.i);
    if (plan && !this.team.noQuests && !gnaw && (this.N > 1 || !foes.some(e => hyp(e.x - M.P.hearth[0], e.y - M.P.hearth[1]) < 600))) task = this.questTask(plan);
    // the camp bar is on screen: a person drops a quest to defend it
    if (task && sim.camp.hp < sim.camp.max * 0.5 && foes.some(e => hyp(e.x - M.P.hearth[0], e.y - M.P.hearth[1]) < 420)) task = null;
    if (task && plan && plan[0] === 'cover' && !h.chan && foes.filter(e => hyp(e.x - M.P.hearth[0], e.y - M.P.hearth[1]) < 900).length >= 4) task = null;   // the Covering waits for a lull: every enemy turns on the camp while it goes down
    if (task && plan && plan[0] === 'cover' && !h.chan) { const hands = Math.max(1, this.team.pilots.filter(q => !q.h.dead && q.team.plan.cover && q.team.plan.cover.crew && q.team.plan.cover.crew.includes(q.i)).length), need = D.QUEST_TUNE.coverSecs / (1 + D.QUEST_TUNE.coverHelp * (hands - 1)); if (sim.spawnQ.length || foes.filter(e => !e.def.boss).length > 3 || sim.nextWaveAt - now + 20 < need) task = null; }   // ... and the whole map quiet, the wave fully spent, with time to finish before the next one reaches the camp (about 20 s after it spawns)
    if (task && task.chan && !(plan && plan[0] === 'cover') && near.some(e => hyp(e.x - task.x, e.y - task.y) < 230 && e.kind !== 'damlog')) task = null;   // clear the road first, then plant or carve
    if (h.chan) {   // carving and planting are broken by a blow: a person stops to deal with what is coming (the Covering is held through it)
      if (h.chan.kind !== 'cover' && near.some(e => hyp(e.x - h.x, e.y - h.y) < 200 && e.kind !== 'damlog')) { this.S({ k: 'stop' }); this.lastAct = now + 1.5; return; }
      return;
    }
    // ---- the wild camps: in a lull, one hero goes hunting
    if (JG.mode !== 'off') { if (this.jg && task) this.endJungle('quest'); if (!task && !gnaw && this.jungleStep(near, foes)) return; }
    // ---- the shop: in a lull, with gold
    if (!task && near.length === 0 && now >= this.shopAt && h.gold >= 40 && !h.carry) {
      const sh = M.P.shop;
      if (!sim.atShop(h)) { this.move(sh[0] - 40, sh[1] - 60, 1.5); return; }
      this.shopAt = now + H.shopEvery * (0.6 + this.rnd() * 0.9); this.buy(); return;
    }
    if (!task && near.length === 0 && now >= this.forgeAt && sim.forge === 2 && this.forgePair()) {
      const f = M.P.forge;
      if (hyp(h.x - f[0], h.y - (f[1] - 60)) > 150) { this.move(f[0], f[1] - 60, 1.5); return; }
      const pr = this.forgePair(); if (pr) this.S({ k: 'forge', a: pr[0], b: pr[1] }); this.forgeAt = now + 25 + this.rnd() * 30; return;
    }
    if (task) {
      const d = hyp(h.x - task.x, h.y - task.y);
      if (d > (task.r || 55)) { this.move(task.x, task.y, 0.5); }
      else if (d <= (task.r || 55) + 25 && task.act && now - this.lastAct > 0.7) { this.S({ k: 'carry' }); this.lastAct = now; }
      if (h.carry || task.chan) return;
    } else this.position(near);
    if (near.length) this.fight(near, foes);
  }

  position(near) {
    const sim = this.sim, h = this.h, now = sim.time, hold = this.holdPoint();
    const off = { bastion: [0, 0], cleric: [-45, 70], pyromancer: [45, 60], ranger: [0, 95] }[h.hero];
    const px = hold[0] + off[0] + this.holdOff[0], py = hold[1] + off[1] + this.holdOff[1];
    const dHold = hyp(h.x - px, h.y - py);
    if (near.length === 0) { if (dHold > 90) this.move(px, py, 1); this.driftTo = null; return; }
    // enemies about: now and then chase the nearest one off the hold point (spitters shoot from far away)
    if (now >= this.driftAt) {
      this.driftAt = now + 2 + this.rnd() * 3;
      let n0 = near[0]; for (const e of near) if (hyp(e.x - h.x, e.y - h.y) < hyp(n0.x - h.x, n0.y - h.y)) n0 = e;
      const range = h.K.range + 25;
      if (dHold < 330 && hyp(n0.x - h.x, n0.y - h.y) > range && this.rnd() < H.drift) this.S({ k: 'attack', id: n0.id });
      else if (dHold > 330) this.move(px, py, 0);
    }
  }

  campsOf() { const m = this.sim.mods.find(x => x.camps); return m ? m.camps : []; }
  endJungle(why) { if (!this.jg) return; this.run.jgTime = (this.run.jgTime || 0) + this.sim.time - this.jg.t0; this.run.jgTrips = (this.run.jgTrips || 0) + 1; this.jg = null; this.jgNext = this.sim.time + JG.cd + this.rnd() * 6; }
  jungleStep(near, foes) {
    const sim = this.sim, h = this.h, now = sim.time, hearth = M.P.hearth;
    if (!this.jgOK) return false;
    const lanes = sim.enemies.filter(e => !e.dead && !e.under && !e.w && e.kind !== 'damlog');
    const threat = lanes.filter(e => hyp(e.x - hearth[0], e.y - hearth[1]) < 950).length;
    const anyBoss = sim.enemies.some(e => !e.dead && !e.w && e.def.boss);
    if (!this.jg) {
      if (now < (this.jgNext || 0) || sim.wave < 1 || h.hp < h.max * JG.hp || h.carry || h.chan || h.rcOn || threat > 0 || anyBoss || sim.nextWaveAt - now < JG.lead || sim.wave >= D.LAST_WAVE) return false;
      if (JG.mode === 'lull' && sim.camp.hp < sim.camp.max * 0.6) return false;
      let best = null, bd = JG.maxDist; for (const c of this.campsOf()) { if (c.st !== 'live') continue; const d = hyp(c.x - h.x, c.y - h.y); if (d < bd) { bd = d; best = c; } }
      if (!best) return false;
      this.jg = { c: best, t0: now, hit: false };
    }
    const j = this.jg, c = j.c;
    // when to come home
    const wavesIn = sim.nextWaveAt - now;
    if (c.st !== 'live' || now - j.t0 > JG.maxTrip || (JG.mode === 'lull' && (threat >= 3 || h.hp < h.max * 0.4 || sim.camp.hp < sim.camp.max * 0.5)) || (JG.mode === 'greedy' && h.hp < h.max * 0.25) || anyBoss) { this.endJungle('done'); return false; }
    if (near.length) { this.fight(near, foes); return true; }
    const d = hyp(c.x - h.x, c.y - h.y);
    if (d > 260) { this.move(c.x, c.y, 0.6); return true; }
    const w = sim.enemies.find(e => !e.dead && e.w && e.w.c === c); if (w && now - this.lastAct > 0.8) { this.S({ k: 'attack', id: w.id }); this.lastAct = now; }
    return true;
  }
  position(near) {
    const sim = this.sim, h = this.h, now = sim.time, hold = this.holdPoint();
    const off = { bastion: [0, 0], cleric: [-45, 70], pyromancer: [45, 60], ranger: [0, 95] }[h.hero];
    const px = hold[0] + off[0] + this.holdOff[0], py = hold[1] + off[1] + this.holdOff[1];
    const dHold = hyp(h.x - px, h.y - py);
    if (near.length === 0) { if (dHold > 90) this.move(px, py, 1); this.driftTo = null; return; }
    // enemies about: now and then chase the nearest one off the hold point (spitters shoot from far away)
    if (now >= this.driftAt) {
      this.driftAt = now + 2 + this.rnd() * 3;
      let n0 = near[0]; for (const e of near) if (hyp(e.x - h.x, e.y - h.y) < hyp(n0.x - h.x, n0.y - h.y)) n0 = e;
      const range = h.K.range + 25;
      if (dHold < 330 && hyp(n0.x - h.x, n0.y - h.y) > range && this.rnd() < H.drift) this.S({ k: 'attack', id: n0.id });
      else if (dHold > 330) this.move(px, py, 0);
    }
  }

  buy() {
    const sim = this.sim, h = this.h;
    const WISH = {
      bastion: [['i', 'ironvest'], ['u', 'ricochet'], ['u', 'secondwind'], ['i', 'jerkin'], ['u', 'longwatch'], ['i', 'keenedge'], ['u', 'spikedwall'], ['u', 'rally'], ['u', 'concussive'], ['i', 'wardenplate'], ['i', 'ramhorn'], ['i', 'wardensigil'], ['i', 'aegis']],
      cleric: [['u', 'swiftmend'], ['i', 'lampcharm'], ['u', 'hallowed'], ['u', 'chainmend'], ['i', 'ironvest'], ['u', 'searing'], ['u', 'twinsanctum'], ['i', 'petalpouch'], ['u', 'morningglory'], ['i', 'censer'], ['i', 'watchlamp']],
      pyromancer: [['u', 'split'], ['i', 'keenedge'], ['u', 'wildfire'], ['i', 'whetstone'], ['u', 'doublestep'], ['u', 'scorchedpath'], ['i', 'hawkfeather'], ['u', 'aftershock'], ['i', 'emberblade'], ['i', 'coalpouch'], ['u', 'shower'], ['i', 'cindermitt'], ['i', 'hourglass']],
      ranger: [['u', 'twinarrow'], ['i', 'hawkfeather'], ['u', 'tripwire'], ['i', 'keenedge'], ['u', 'exposed'], ['u', 'longshot'], ['i', 'cord'], ['i', 'houndcollar'], ['u', 'cluster'], ['i', 'thirdarrow'], ['u', 'pinningstars'], ['i', 'hourglass']],
    }[h.hero];
    const have = new Set(WISH.map(w => w[1])); for (const sl of 'qwer') for (const u of D.KITS[h.hero].skills[sl].ups) if (!have.has(u.id)) WISH.push(['u', u.id]);
    for (const id of ['aegis', 'hourglass', 'wardenplate', 'emberblade', 'anklet', 'longlens', 'watchlamp', 'owlcharm', 'flintring', 'wardthread']) WISH.push(['i', id]);
    // a full bag: sell the worst Common or Uncommon to make room once the forged stock is open
    if (!h.items.includes(null) && h.gold >= 90 && sim.forge === 2) { let wi = -1; h.items.forEach((x, k) => { if (x && D.canSell(D.ITEM[x.id].rar) && !D.ITEM[x.id].use && (wi < 0 || D.ITEM[x.id].rar < D.ITEM[h.items[wi].id].rar)) wi = k; }); if (wi >= 0) this.S({ k: 'sell', slot: wi }); }
    for (let guard = 0; guard < 8; guard++) {
      let bought = false;
      for (const [kind, id] of WISH) {
        if (kind === 'u') { if (h.ups[id] || h.ranks['qwer'.indexOf(D.UPGRADES[id].slot)] < 1) continue; const g = h.gold; this.S({ k: 'buy', up: id }); if (h.gold < g) { bought = true; break; } else break; }
        else { if (!D.ITEM[id]) continue; if (!h.items.includes(null) || h.items.some(x => x && x.id === id) && D.ITEM[id].rar < 2) continue; if (D.ITEM[id].shop === 'forged' && sim.forge !== 2) continue; const g = h.gold; this.S({ k: 'buy', item: id }); if (h.gold < g) { bought = true; break; } else break; }
      }
      if (!bought) break;
    }
    // a healing draught to carry, if there is spare gold
    if (h.gold >= 60 && h.items.includes(null) && !h.items.some(x => x && D.ITEM[x.id].use)) if (D.ITEM.thickdraught) this.S({ k: 'buy', item: 'thickdraught' });
  }
  forgePair() {
    const h = this.h, by = {};
    for (const x of h.items) if (x) { const r = D.ITEM[x.id].rar; (by[r] = by[r] || []).push(x); }
    for (const r of [2, 3]) if (by[r] && by[r].length >= 2 && !D.ITEM[by[r][0].id].use && !D.ITEM[by[r][1].id].use) return [by[r][0].uid, by[r][1].uid];
    return null;
  }

  // ---- quests
  haulTask(id) {
    const sim = this.sim, h = this.h, Hl = sim.haul[id]; if (!Hl) return null;
    if (h.carry === Hl.kind) return { x: Hl.tx, y: Hl.ty, r: 40 };
    const d = sim.drops.find(x => x.q === id && !x.gone); if (d) return { x: d.x, y: d.y, act: 1, r: 40 };
    if (Hl.left > 0 && !(id === 'stonegate' && sim.sg)) return { x: Hl.fx, y: Hl.fy, act: 1, r: 45 };
    return null;
  }
  questTask(ids) {
    const sim = this.sim, h = this.h;
    const id = ids.find(q => sim.q[q].st === 1); if (!id) return null;
    switch (id) {
      case 'spring': return sim.dig ? { x: sim.dig.x, y: sim.dig.y - 30 } : null;
      case 'gate': { const cs = sim.carts.filter(c => !c.gone && !c.arrived); if (!cs.length) return null; const c = cs[(cs.length - 1) >> 1], p = M.along('north', Math.max(c.s - 20, c.sGate)); return { x: p[0], y: p[1] }; }
      case 'fire': return sim.smith ? { x: sim.smith.x + 30, y: sim.smith.y - 40 } : null;
      case 'road': { const free = sim.postSlots.map((s, k) => k).filter(k => !sim.posts.some(p => p.slot === k)); if (!free.length) return null; const k = this.i % 2 ? free[free.length - 1] : free[0]; return { x: sim.postSlots[k][0], y: sim.postSlots[k][1], act: 1, r: 50, chan: 1 }; }
      case 'stonegate': if (sim.sg) return { x: sim.carvePt[0], y: sim.carvePt[1], act: 1, r: 35, chan: 1 }; return this.haulTask(id);
      case 'cover': return { x: sim.coverPt[0], y: sim.coverPt[1], act: 1, r: 50, chan: 1 };
      default: return this.haulTask(id);
    }
  }

  // ---- fighting (the same kits as the scripted test pilot, with the human's lapses)
  cluster(R, minN) {
    const sim = this.sim, h = this.h; let best = null;
    for (const e of sim.enemies) {
      if (e.dead || e.under || e.kind === 'damlog' || (e.w && !this.jg) || hyp(e.x - h.x, e.y - h.y) > R) continue;
      let n = 0, sx = 0, sy = 0; for (const o of sim.enemies) if (!o.dead && !o.under && o.kind !== 'damlog' && (!o.w || this.jg) && hyp(o.x - e.x, o.y - e.y) < 90) { n++; sx += o.x; sy += o.y; }
      if (!best || n > best.n) best = { x: sx / n, y: sy / n, n, e };
    }
    return best && best.n >= (minN || 1) ? best : null;
  }
  fight(near, foes) {
    const sim = this.sim, h = this.h, now = sim.time, hero = h.hero;
    let nearest = near[0]; for (const e of near) if (hyp(e.x - h.x, e.y - h.y) < hyp(nearest.x - h.x, nearest.y - h.y)) nearest = e;
    let big = near.filter(e => e.def.elite && e.kind !== 'damlog').sort((a, b) => b.hp - a.hp)[0];
    const cl = this.cluster(330, 3);
    // the Mirebull: break the dam logs (most of the time)
    const bull = sim.enemies.find(e => !e.dead && e.kind === 'mirebull' && e.ai && e.ai.logs);
    let logT = null;
    if (bull) { const logs = sim.enemies.filter(e => !e.dead && e.kind === 'damlog' && !e.invuln && hyp(e.x - h.x, e.y - h.y) < 600); if (logs.length) logT = logs.sort((a, b) => hyp(a.x - h.x, a.y - h.y) - hyp(b.x - h.x, b.y - h.y))[0]; }
    if (logT && hero !== 'bastion' && hero !== 'cleric' && now > (this.logAt || 0) && h.target !== logT && this.rnd() < 0.7) { this.S({ k: 'attack', id: logT.id }); this.logAt = now + 2.5 + this.rnd() * 2; }
    // a focus on the elite or the boss, sometimes
    if (big && !logT && hero !== 'cleric' && now > (this.focusAt || 0)) { this.focusAt = now + 3 + this.rnd() * 4; if ((!h.target || h.target.dead || (h.target !== big && this.rnd() < 0.5)) && this.rnd() < 0.55) this.S({ k: 'attack', id: big.id }); }
    const tg = logT || big || nearest;
    const ground = (c) => { const bad = this.rnd() < H.badAim; const p = this.aim(bad || !c ? nearest.x : c.x, bad || !c ? nearest.y : c.y); return p; };
    if (hero === 'bastion') {
      if (this.ready(3) && cl && cl.n >= 7) { this.cast(3, ground(cl)); }
      else if (this.ready(1) && cl && cl.n >= 3) { this.cast(1, ground(cl)); }
      else if (this.ready(0) && hyp(nearest.x - h.x, nearest.y - h.y) < 120) { this.cast(0, { id: (big && hyp(big.x - h.x, big.y - h.y) < 130 ? big : nearest).id }); }
      else if (this.ready(2) && this.pressAt.size === 0) {
        // brace against a strike aimed at us: press a little before it lands
        for (const e of near) if (e.atk && e.atk.tgt === h && !this.pressAt.has('a' + e.atk.id) && this.rnd() < 0.7) { this.pressAt.set('a' + e.atk.id, now + (e.atk.dur - e.atk.t) - 0.22 + this.gauss() * H.braceSigma); break; }
      }
    } else if (hero === 'cleric') {
      let hurt = null, hf = 0.72; for (const o of sim.heroes) if (!o.dead && o.hp / o.max < hf) { hf = o.hp / o.max; hurt = o; }
      const dead = sim.heroes.find(o => o.dead);
      if (this.ready(3) && dead && hyp(dead.x - h.x, dead.y - h.y) < 260) this.cast(3, { x: dead.x, y: dead.y });
      else if (this.ready(0) && hurt && h.st.petals > 0) this.cast(0, { id: hurt.id });
      else if (this.ready(2) && cl && cl.n >= 3) this.cast(2, ground(cl));
      else if (this.ready(1)) this.cast(1, { id: tg.id });
    } else if (hero === 'pyromancer') {
      if (this.ready(3) && cl && cl.n >= 6) this.cast(3, ground(cl));
      else if (this.ready(2) && near.some(e => hyp(e.x - h.x, e.y - h.y) < 70) && this.rnd() < 0.7) { const aw = Math.atan2(h.y - nearest.y, h.x - nearest.x); this.cast(2, { x: h.x + Math.cos(aw) * 150, y: h.y + Math.sin(aw) * 150 }); }
      else if (this.ready(1) && cl && cl.n >= 2) this.cast(1, ground(cl));
      else if (this.ready(0)) { const p = this.aim((cl || tg).x, (cl || tg).y); this.cast(0, p); }
    } else {
      if (this.ready(3) && cl && cl.n >= 6) this.cast(3, ground(cl));
      else if (this.ready(2) && big && !big.mark) this.cast(2, { id: big.id });
      else if (this.ready(0)) { const p = this.aim(tg.x, tg.y); this.cast(0, p); }
      else if (this.ready(1) && cl && cl.n >= 2 && hyp(cl.x - h.x, cl.y - h.y) < 190) this.cast(1, ground(cl));
    }
  }
}
Team.prototype.myQuest = function (i) {
  const out = []; for (const id of D.QUEST_ORDER) { const p = this.plan[id]; if (p && p.crew && p.crew.includes(i) && this.sim.q[id].st === 1) out.push(id); }
  return out.length ? out : null;
};
Team.prototype.carrier = function () {   // the tank carries the brand; failing that the last hero standing
  const bi = this.pilots.findIndex(q => q.h.hero === 'bastion'); if (bi >= 0 && !this.pilots[bi].h.dead) return bi;
  const alive = this.pilots.filter(q => !q.h.dead); return alive.length ? alive[alive.length - 1].i : -1;
};

const LINEUPS = {
  1: [['ranger'], ['pyromancer'], ['bastion'], ['cleric']],
  2: [['bastion', 'cleric'], ['ranger', 'cleric'], ['pyromancer', 'bastion'], ['ranger', 'pyromancer'], ['bastion', 'ranger'], ['pyromancer', 'cleric']],
  3: [['bastion', 'cleric', 'pyromancer'], ['bastion', 'cleric', 'ranger'], ['bastion', 'pyromancer', 'ranger'], ['cleric', 'pyromancer', 'ranger']],
  4: [['bastion', 'cleric', 'pyromancer', 'ranger']],
};

// ---------------------------------------------------------------- the defence pilot: a few towers, not optimal, upgrades now and then, soldier upgrades sometimes
const DP = { first: 60, gap: [25, 55], towersBase: 2, towersPerHero: 1, kinds: ['post', 'post', 'brazier', 'bell', 'ballista'], soldierP: 0.3, upP: 0.5, repairP: 0.6, off: !!process.env.NODEF, noSoldierUp: !!process.env.NOSUP };
function defendStep(sim, team, rnd, rec, N) {
  if (DP.off || !sim.defence) return;
  const dd = sim.defence, now = sim.time;
  rec.def = rec.def || { built: 0, ups: 0, sups: 0, lost: 0, spent: 0, maxTowers: 0, soldiersMax: 0 };
  if (dd.towers.filter(t => !t.rubble).length > rec.def.maxTowers) rec.def.maxTowers = dd.towers.filter(t => !t.rubble).length; if (dd.soldiers.length > rec.def.soldiersMax) rec.def.soldiersMax = dd.soldiers.length;
  for (const p of team.pilots) {
    if (p.h.dead) continue;
    if (p.defendAt === undefined) p.defendAt = DP.first + rnd() * 30;
    if (now < p.defendAt) continue;
    p.defendAt = now + DP.gap[0] + rnd() * (DP.gap[1] - DP.gap[0]);
    const h = p.h, live = dd.towers.filter(t => !t.rubble), want = DP.towersBase + DP.towersPerHero * N, T = D.DEFENCE.TOWER, g0 = h.gold;
    // repair what is hurt beside us
    if (rnd() < DP.repairP) for (const t of dd.towers) if (!t.rubble && t.hp < t.max * 0.8 && Math.hypot(t.x - h.x, t.y - h.y) < 120) { sim.intent(h.id, { k: 'repair', id: t.id }); break; }
    if (rnd() < DP.repairP) for (const t of dd.towers) if (t.rubble && Math.hypot(t.x - h.x, t.y - h.y) < 120 && h.gold >= Math.ceil(t.base / 2) + 30) { sim.intent(h.id, { k: 'repair', id: t.id }); break; }
    const roll = rnd();
    if (roll < DP.soldierP && !DP.noSoldierUp) {
      const ups = dd.up, order = ['arm', 'wpn', 'heal']; order.sort((a, b) => ups[a] - ups[b] + (rnd() - 0.5) * 0.8);
      for (const k of order) { const r = ups[k]; if (r < 3 && h.gold >= D.DEFENCE.SOLDIER_UP[k].cost[r]) { sim.intent(h.id, { k: 'soldier', up: k }); rec.def.sups++; break; } }
    } else if (live.length < want && roll < 0.85) {
      const kind = DP.kinds[Math.floor(rnd() * DP.kinds.length)];
      if (h.gold >= T[kind].cost[0]) {
        for (let tries = 0; tries < 10; tries++) {
          const lane = rnd() < 0.5 ? 0 : 1, path = sim.paths[lane], last = path.length - 1, i = Math.floor(last * (0.45 + rnd() * 0.45)), q = path[i], side = rnd() < 0.5 ? -1 : 1, off = (70 + rnd() * 70) * side;
          const x = q[0] - q[4] * off, y = q[1] + q[3] * off;
          if (Math.hypot(x - h.x, y - h.y) > 950) continue;
          if (D.DEFENCE.fits(x, y, dd.towers, sim.buildProps()) !== 0) continue;
          sim.intent(h.id, { k: 'build', kind, x: Math.round(x), y: Math.round(y) }); break;
        }
      }
    } else if (live.length) {
      const cand = live.filter(t => t.rank < 3 && h.gold >= T[t.kind].cost[t.rank]); if (cand.length && rnd() < DP.upP + 0.3) { const t = cand[Math.floor(rnd() * cand.length)]; sim.intent(h.id, { k: 'upTower', id: t.id }); rec.def.ups++; }
    }
    if (h.gold < g0) rec.def.spent += g0 - h.gold;
  }
  const lost = dd.towers.filter(t => t.rubble).length; if (lost > 0) rec.def.rubbleSeen = Math.max(rec.def.rubbleSeen || 0, lost);
}

function playRun(N, seed, heroes, opts) {
  opts = opts || {};
  const t0 = Date.now(), { sim, rec, hazards } = makeRun(N, seed, heroes);
  sim.hazardsRef = hazards;
  const drnd = mulberry(seed * 101 + N * 13 + 5), rnd = mulberry(seed * 7919 + N * 104729 + 17), team = new Team(sim, rnd, N); team.noQuests = !!opts.noQuests;
  const skip = new Set(opts.skipQuests || []);
  if (skip.size) { const orig = team.update.bind(team); team.update = function () { orig(); for (const id of skip) if (this.plan[id]) { this.plan[id].crew = null; this.plan[id].mode = 'forget'; this.plan[id].recheck = 1e9; } }; }
  sim.heroes.forEach((h, i) => { const p = new Pilot(sim, h, i, team, mulberry(seed * 31 + i * 977 + N), rec); team.pilots.push(p); });
  { const order = { ranger: 0, pyromancer: 1, bastion: 2, cleric: 3 }, pick = team.pilots.slice().sort((a, b) => order[a.h.hero] - order[b.h.hero]).slice(0, N >= 4 ? 2 : 1); for (const p of pick) p.jgOK = true; }   // the damage dealers go hunting
  const maxTicks = 20 * 60 * 62; let ticks = 0, campMin = 1e9, maxE = 0;
  const bossSeen = {};
  while (sim.st === 'live' && ticks < maxTicks) {
    team.update(); if (ticks % 20 === 0) defendStep(sim, team, drnd, rec, N);
    for (const p of team.pilots) p.step();
    sim.tick(DT); ticks++; sim.buildHash(); if (ticks % 20 === 0 && sim.enemies.length > maxE) maxE = sim.enemies.length;   // intents land between ticks: keep the enemy hash fresh (sim.inCircle reads it after reap)
    for (const e of sim.enemies) if (e.def.boss && !e.dead) { const b = rec.boss[e.kind]; if (b && b.engage === null && e.ai && e.ai.ph !== 'walk') b.engage = sim.time; }
    if (opts.trace) opts.trace(sim, team);
    if (opts.stopAtWave && sim.wave >= opts.stopAtWave) break;
  }
  const r = sim.result;
  const quests = {}; for (const id of D.QUEST_ORDER) quests[id] = sim.q[id].st;
  const cause = sim.st === 'won' ? 'won' : sim.st === 'live' ? 'timeout' : (sim.camp.hp <= 0 ? 'camp' : 'wipe');
  const lastWave = D.WAVES[sim.wave - 1];
  const alive = sim.enemies.filter(e => !e.dead).map(e => e.kind);
  const boss = {}; for (const k in rec.boss) { const b = rec.boss[k]; boss[k] = { spawn: Math.round(b.spawn), engage: b.engage === null ? null : Math.round(b.engage), down: b.down === null ? null : Math.round(b.down), t: b.down === null ? null : Math.round(b.down - (b.engage === null ? b.spawn : b.engage)), tAll: b.down === null ? null : Math.round(b.down - b.spawn) }; }
  const plan = {}; for (const id in team.plan) plan[id] = { mode: team.plan[id].mode, at: Math.round(team.plan[id].at), crew: team.plan[id].crew }; rec.plan = plan;
  const wm = sim.mods.find(m => m.camps), wild = wm ? Object.assign({}, wm.stats, { jgTime: Math.round(rec.jgTime || 0), jgTrips: rec.jgTrips || 0 }) : {};
  return { def: rec.def || null, wild, plan, N, seed, heroes, st: sim.st, cause, wave: sim.wave, time: Math.round(sim.time), quests, camp: Math.round(sim.camp.hp / sim.camp.max * 100), waves: rec.waves, boss, partT: rec.partT, dead: rec.dead, deaths: sim.heroes.map(h => h.deaths), lv: sim.heroes.map(h => h.level),
    heroBy: rec.heroBy, campBy: rec.campBy, deathsBy: rec.deathsBy, perfect: rec.perfect, alive: alive.length > 12 ? alive.length + ' foes' : alive.join(','), gold: sim.heroes.map(h => Math.round(h.gold)), items: sim.heroes.map(h => h.items.filter(Boolean).length), ups: sim.heroes.map(h => Object.keys(h.ups).length), maxE, ms: Date.now() - t0 };
}

// ---------------------------------------------------------------- worker / master
if (require.main !== module) { module.exports = { playRun, H, LINEUPS }; } else if (process.argv[2] === '--worker') {
  process.on('message', job => {
    if (job === 'bye') process.exit(0);
    let out; try { out = playRun(job.N, job.seed, job.heroes, job.opts); } catch (e) { out = { N: job.N, seed: job.seed, heroes: job.heroes, error: e.stack }; }
    process.send(out);
  });
  process.send('ready');
} else main();

function pct(n, d) { return d ? Math.round(100 * n / d) + '%' : '-'; }
function main() {
  const sizes = String(arg('sizes', '1,2,3,4')).split(',').map(Number), SEEDS = parseInt(arg('seeds', 40)), SEED0 = parseInt(arg('seed0', 1)), JOBS = parseInt(arg('jobs', Math.max(2, require('os').cpus().length - 2)));
  const forced = arg('heroes', null), REPORT = !!arg('report', false), OUT = arg('out', null);
  const opts = {}; if (arg('noquests', false)) opts.noQuests = true; if (arg('skip', false)) opts.skipQuests = String(arg('skip')).split(',');
  const jobs = [];
  for (const N of sizes) for (let s = 0; s < SEEDS; s++) { const seed = SEED0 + s, L = LINEUPS[N]; const heroes = forced && String(forced).split(',').length === N ? String(forced).split(',') : L[s % L.length]; jobs.push({ N, seed, heroes, opts }); }
  const results = []; let next = 0, running = 0; const t0 = Date.now();
  jobs.sort((a, b) => b.N - a.N);
  return new Promise(resolve => {
    const workers = [];
    const feed = w => { if (next < jobs.length) { w.send(jobs[next++]); } else { w.send('bye'); } };
    for (let i = 0; i < Math.min(JOBS, jobs.length); i++) {
      const w = cp.fork(__filename, ['--worker'].concat(process.argv.slice(2)), { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] }); running++;
      w.on('message', m => { if (m === 'ready') return feed(w); results.push(m); feed(w); });
      w.on('exit', () => { if (--running === 0) { summarize(results, { REPORT, OUT, t0 }); resolve(); } });
    }
  });
}

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function quant(a, q) { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }
function summarize(results, o) {
  const errs = results.filter(r => r.error); if (errs.length) { console.log(errs.length + ' runs threw; first:\n' + errs[0].error); }
  const ok = results.filter(r => !r.error);
  if (o.OUT) require('fs').writeFileSync(o.OUT, JSON.stringify(ok));
  const qn = D.QUEST_ORDER;
  for (const N of [1, 2, 3, 4]) {
    const rs = ok.filter(r => r.N === N); if (!rs.length) continue;
    const won = rs.filter(r => r.st === 'won'), lost = rs.filter(r => r.st !== 'won');
    console.log(`\n=== ${N} hero${N > 1 ? 'es' : ''}: ${rs.length} runs, cleared ${won.length} (${pct(won.length, rs.length)})  [avg time ${Math.round(avg(rs.map(r => r.time)))} s, avg ${(avg(rs.map(r => r.ms)) / 1000).toFixed(1)} s to simulate]`);
    // wave reached
    const hist = {}; for (const r of lost) hist[r.wave] = (hist[r.wave] || 0) + 1;
    console.log('  failed runs end at wave: ' + (Object.keys(hist).sort((a, b) => a - b).map(w => `${w}:${hist[w]}`).join('  ') || '-'));
    const cause = {}; for (const r of lost) cause[r.cause] = (cause[r.cause] || 0) + 1; console.log('  failure cause: ' + (Object.entries(cause).map(([k, v]) => `${k} ${v}`).join(', ') || '-'));
    const byPart = [0, 0, 0, 0, 0, 0]; for (const r of lost) byPart[D.partOf(r.wave)]++; console.log(`  failures by part: day1 ${byPart[0]}  night1 ${byPart[1]}  day2 ${byPart[2]}  night2 ${byPart[3]}  day3 ${byPart[4]}  last night ${byPart[5]}   (siege wave ${D.LAST_WAVE}: ${lost.filter(r => r.wave === D.LAST_WAVE).length})`);
    // day one held
    console.log(`  day one (waves 1-5) held: ${pct(rs.filter(r => r.wave >= 6 || r.st === 'won').length, rs.length)}`);
    // per-hero line-up
    const byLine = {}; for (const r of rs) { const k = r.heroes.join('+'); (byLine[k] = byLine[k] || []).push(r); }
    if (Object.keys(byLine).length > 1) console.log('  by line-up: ' + Object.entries(byLine).map(([k, v]) => `${k} ${pct(v.filter(r => r.st === 'won').length, v.length)} (${v.length})`).join('   '));
    // deaths
    console.log(`  hero falls per run: avg ${avg(rs.map(r => r.deaths.reduce((a, b) => a + b, 0))).toFixed(1)} (won ${avg(won.map(r => r.deaths.reduce((a, b) => a + b, 0))).toFixed(1)}, lost ${avg(lost.map(r => r.deaths.reduce((a, b) => a + b, 0))).toFixed(1)})  perfect blocks/run ${avg(rs.map(r => r.perfect)).toFixed(1)}`);
    // camp hp over time
    const campRow = []; for (const w of [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]) { const v = rs.filter(r => r.waves[w]).map(r => r.waves[w].camp); campRow.push(`w${w}:${v.length ? Math.round(avg(v)) : '-'}`); }
    console.log('  camp HP % at wave start (avg over runs that got there): ' + campRow.join(' '));
    // quests
    console.log('  quests done (of runs that reached the offer):');
    const QD = qn.map(id => { const offered = rs.filter(r => r.quests[id] !== 0 && !(r.quests[id] === 1)); const dn = offered.filter(r => r.quests[id] === 2).length; return `${id} ${pct(dn, offered.length)}`; });
    console.log('    ' + QD.join('  '));
    const qcount = rs.map(r => qn.filter(id => r.quests[id] === 2).length); console.log(`    quests done per run: avg ${avg(qcount).toFixed(1)}; clear rate with >=8 done ${pct(rs.filter(r => r.st === 'won' && qn.filter(id => r.quests[id] === 2).length >= 8).length, rs.filter(r => qn.filter(id => r.quests[id] === 2).length >= 8).length)} (${rs.filter(r => qn.filter(id => r.quests[id] === 2).length >= 8).length}), <=5 done ${pct(rs.filter(r => r.st === 'won' && qn.filter(id => r.quests[id] === 2).length <= 5).length, rs.filter(r => qn.filter(id => r.quests[id] === 2).length <= 5).length)} (${rs.filter(r => qn.filter(id => r.quests[id] === 2).length <= 5).length})`);
    // bosses
    const bl = []; for (const k of ['tunnelmaw', 'wickeater', 'mirebull', 'oldgnaw']) { const bs = rs.filter(r => r.boss[k]); const dn = bs.filter(r => r.boss[k].down !== null); const ts = dn.map(r => r.boss[k].t), tl = dn.map(r => r.boss[k].tAll); bl.push(`${k}: met ${bs.length}, killed ${dn.length}, fight ${ts.length ? Math.round(avg(ts)) : '-'} s (p10-p90 ${ts.length ? quant(ts, 0.1) + '-' + quant(ts, 0.9) : '-'}), from spawn ${tl.length ? Math.round(avg(tl)) : '-'} s`); }
    console.log('  bosses:\n    ' + bl.join('\n    '));
    // old gnaw parts
    const gp = rs.filter(r => r.boss.oldgnaw && r.boss.oldgnaw.down !== null && r.partT[2] && r.partT[3]); if (gp.length) console.log(`    Old Gnaw parts (won runs): part1 ${Math.round(avg(gp.map(r => r.partT[2] - r.boss.oldgnaw.spawn)))} s, part2 ${Math.round(avg(gp.map(r => r.partT[3] - r.partT[2])))} s, part3 ${Math.round(avg(gp.map(r => r.boss.oldgnaw.down - r.partT[3])))} s`);
    // where it ends: who hits the camp / the heroes in lost runs
    const sum = (rows, key) => { const t = {}; for (const r of rows) for (const k in r[key]) t[k] = (t[k] || 0) + r[key][k]; return t; };
    const top = (t, n) => Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
    if (lost.length) {
      console.log('  lost runs, camp damage by source: ' + top(sum(lost, 'campBy'), 6));
      console.log('  lost runs, hero damage taken by source: ' + top(sum(lost, 'heroBy'), 7));
      console.log('  lost runs, hero kills by source: ' + top(sum(lost, 'deathsBy'), 6));
      const lastW = {}; for (const r of lost) { const lw = D.WAVES[r.wave - 1], key = 'w' + r.wave + (lw && lw.boss ? '(' + lw.boss + ')' : ''); lastW[key] = (lastW[key] || 0) + 1; }
      console.log('  lost runs by wave: ' + Object.entries(lastW).sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1))).map(([k, v]) => `${k}:${v}`).join('  '));
    }
    console.log('  most enemies alive at once (avg of runs / peak): ' + Math.round(avg(rs.map(r => r.maxE))) + ' / ' + Math.max(...rs.map(r => r.maxE)));
    { const W = rs.map(r => r.wild || {}); const a = k => avg(W.map(w => w[k] || 0)).toFixed(1); console.log(`  wild camps per run: clears ${a('clears')}, kills ${a('kills')}, items ${a('items')}, jungle ${a('jgTime')} s over ${a('jgTrips')} trips, camp xp ${a('xp')} gold ${a('gold')}`); }
    console.log('  gear at the end (avg): level ' + avg(rs.flatMap(r => r.lv)).toFixed(1) + ', items ' + avg(rs.flatMap(r => r.items)).toFixed(1) + ', upgrades ' + avg(rs.flatMap(r => r.ups)).toFixed(1) + ', gold left ' + Math.round(avg(rs.flatMap(r => r.gold))));
    if (o.REPORT) {
      // per-wave: how many runs reached, died in it, the camp then, hero falls in it
      console.log('  wave table: reached / ended here / camp% at start / hero falls during');
      const rows = []; for (let w = 1; w <= D.LAST_WAVE; w++) { const reached = rs.filter(r => r.waves[w]).length, ended = lost.filter(r => r.wave === w).length; const falls = avg(rs.map(r => r.dead.filter(d => d[1] === w).length)); const camp = rs.filter(r => r.waves[w]).map(r => r.waves[w].camp); rows.push(`    w${String(w).padStart(2)}: ${String(reached).padStart(3)} / ${String(ended).padStart(3)} / camp ${String(Math.round(avg(camp))).padStart(3)}% / falls ${falls.toFixed(2)}`); }
      console.log(rows.join('\n'));
      for (const r of rs) console.log(`    ${N}p seed ${r.seed} ${r.heroes.join('+')}: ${r.st} wave ${r.wave} ${r.time}s camp ${r.camp}% quests [${qn.map(id => '-?DM'[r.quests[id]]).join('')}] falls ${r.deaths.join('/')} lv ${r.lv.join('/')} ${r.cause !== 'won' ? 'foes: ' + r.alive : ''}`);
    }
  }
  try { summarizeDef(results); } catch (e) { console.log('def summary failed', e.message); }
  console.log(`\n(${Math.round((Date.now() - o.t0) / 1000)} s wall, skill ${PERFECT ? 'PERFECT' : SKILL})`);
}

function summarizeDef(results) {
  for (const N of [1, 2, 3, 4]) {
    const rs = results.filter(r => !r.error && r.N === N && r.def); if (!rs.length) continue;
    const a = k => (avg(rs.map(r => r.def[k] || 0))).toFixed(1);
    console.log('DEF N=' + N + ': towers max ' + a('maxTowers') + ', built spent ' + a('spent') + ' gold, tower upgrades ' + a('ups') + ', squad upgrades ' + a('sups') + ', soldiers max ' + a('soldiersMax') + ', rubble seen ' + a('rubbleSeen'));
  }
}
