// Comp sweep: how often does a boss fall across many different parties, instead of one default line-up (tools/bot-raid.js)?
//   node tools/comp-sweep.js <normal|hard> <boss> [comps=20] [runs=10] [seed=1000] [gear=<level>] [mix=<spec>] [only=<class[:spec],...>] [jobs=2]
//   e.g. node tools/comp-sweep.js hard skitterra gear=mid comps=6 runs=5
//        node tools/comp-sweep.js hard skitterra only=pyromancer:sigilmancer,driftblade:orbit mix=dps1:post1,dps2:fresh comps=8 runs=5
// Arguments (any order):
//   normal|hard, boss id  (grubnak skitterra volkar hollowking wyrm titan hydra archmage corvane brannoc morrowoak caelum)
//   comps=N   parties to draw (default 20); runs=N  pulls per party (default 10); seed=N  base seed (default 1000)
//   gear=L    gear level for every member: fresh|mid|full|post1|post2|post3|post4 (same as bot-raid.js; default mid, 'base' = no gear)
//   mix=SPEC  members with different gear. Either explicit, "slot:level" pairs, slots tank healer dps1 dps2 (others keep gear=):
//               mix=dps1:post1,dps2:fresh
//             or random, each member's level drawn per comp between two levels (inclusive, in the order
//             fresh mid post1 post2 post3 post4 full): mix=random:fresh-mid
//   only=...  force members by class (or class:spec; a bare class gets a random spec). Roles come from the class; forced DPS fill
//             the DPS slots, the rest of the party is drawn as usual. e.g. only=pyromancer:sigilmancer,driftblade:orbit
//   jobs=N    worker processes (default 2)         SUMMARY=1  print one JSON line only      FEAST=pie|stew|broth|tarts  as bot-raid.js
//   human=W   which roles play like a decent human instead of a perfect bot: dps|tank|healer|all|none, or a comma list (default none;
//             bots.js BotHuman / HUMAN_DEFAULTS, HUMANP='{"react":[0.4,0.7]}' overrides single parameters). Off, output is unchanged.
//             Measures how much of a fight's damage human play loses: compare a sweep with and without it. e.g. human=dps
//   breakdown=1  each pull also carries, per player, where DPS is lost (seconds dead, out of reach, moving, GCD-idle in reach, casts
//             cancelled, avoidable hits, damage); printed per comp as a mean per pull (with SUMMARY=1 it goes into the JSON as `breakdown`)
// How comps are drawn (deterministic from seed): line-up order is tank, healer, dps1, dps2. Each role draws from a shuffled "bag" of
// every class:spec of that role, refilled when empty, so a 20-comp sweep reaches every tank/healer/DPS class and spec as evenly as the
// counts allow. DPS pairs are stratified by comp number: 2 melee, 2 ranged, then melee + ranged, repeating (melee = shadowblade,
// driftblade, thresher, houndmaster by the kit's first ability range, as bots.js isMelee; ranged = ranger, pyromancer, thermist,
// marionettist). No class appears twice in a party. Pull r of comp c uses seed + c*10007 + r*77 (bot-raid.js uses seed + r*77).
// Output: one line per comp (comp, gear, clears/runs, mean clear time, mean boss HP% left on wipes), then median/mean/p10/p90 clear
// rate, mean clear time, the 5 worst and 5 best comps and a per-class table (mean clear rate of the comps containing that class).
// Gear code is shared with bot-raid.js through tools/lib/bot-gear.js.
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const load = (p) => require(path.join(__dirname, '../client/js', p));
const LEVELS = ['fresh', 'mid', 'post1', 'post2', 'post3', 'post4', 'full'];
const SLOTS = ['tank', 'healer', 'dps1', 'dps2'];

function loadGame() {
  Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'));
}

// ------------------------------------------------------------------------------------------------------------ worker
if (process.argv[2] === '--worker') {
  loadGame();
  // bots hold talents, the strongest build for the boss's set (combat/bot-builds.js); BOT_TALENTS=off plays base kits, BOT_TALENTS=<file> sets them
  Object.assign(global, load('combat/talents.js'), ...(process.env.BOT_TALENTS ? [] : [load('combat/bot-builds.js')]));
  Object.assign(global, load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'), load('arena/scoring.js'), load('arena/raid-host.js'));
  const { buildGear } = require('./lib/bot-gear.js');
  const DEFS = {};
  const dir = path.join(__dirname, '../client/js/arena/bosses');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) for (const v of Object.values(load('arena/bosses/' + f))) if (v && v.id && v.name) DEFS[v.id] = v;
  let GEARSET = null;
  const BOT_TALENTS = process.env.BOT_TALENTS && process.env.BOT_TALENTS !== 'off' ? JSON.parse(fs.readFileSync(process.env.BOT_TALENTS, 'utf8')) : null;   // (BOT_TALENTS=<file.json>: { "class" or "class:spec": [talent ids] } gives the bots those talents; off, they play the base kit)
  if (BOT_TALENTS) {
    const ow = RaidHost.prototype.botWorld;
    RaidHost.prototype.botWorld = function (bot) { const w = ow.call(this, bot), t = new Set(BOT_TALENTS[bot.spec ? `${bot.cls.id}:${bot.spec}` : bot.cls.id] || []); w.talents = () => t; return w; };
  }
  const orig = RaidHost.prototype.allPlayers;
  RaidHost.prototype.allPlayers = function () { return orig.call(this).map(p => (p.bot && GEARSET ? Object.assign(p, { gear: GEARSET.sets[p.id - 1000].host }) : p)); };
  process.on('message', (job) => {
    const hpMult = Number(process.env.BOSS_HP) || 1;   // (BOSS_HP=1.2: the boss has 20% more health on both difficulties, for finding a retune; off, unchanged)
    let def = hpMult === 1 ? DEFS[job.boss] : Object.assign({}, DEFS[job.boss], { hp: typeof DEFS[job.boss].hp === 'object' ? Object.fromEntries(Object.entries(DEFS[job.boss].hp).map(([k, v]) => [k, Math.round(v * hpMult)])) : Math.round(DEFS[job.boss].hp * hpMult) });
    const tune = process.env.TUNE && JSON.parse(fs.readFileSync(process.env.TUNE, 'utf8'))[job.boss + ':' + job.mode];   // (TUNE=<file.json>: { "boss:mode": { hp, dmg } } multiplies that difficulty's health and damage multiplier, for finding a retune)
    if (tune) {
      const hp = typeof def.hp === 'object' ? Object.assign({}, def.hp, { [job.mode]: Math.round(def.hp[job.mode] * (tune.hp || 1)) }) : Math.round(def.hp * (tune.hp || 1));
      const k = job.mode === 'hard' ? 'hardDmg' : 'normalDmg';
      def = Object.assign({}, def, { hp, [k]: (def[k] ?? (job.mode === 'hard' ? 1.25 : 1)) * (tune.dmg || 1) });
    }
    GEARSET = buildGear(job.levels, job.comp);
    const pulls = [];
    for (let r = 0; r < job.runs; r++) {
      try {
        const host = new RaidHost({ def, mode: job.mode, humans: () => [], bots: job.comp, seed: job.seed + r * 77, bond: GEARSET ? GEARSET.bond : undefined, emit: () => {} });
        if (GEARSET) host.bots.forEach((b, i) => { b.actor.kit.env.gearMods = () => GEARSET.sets[i].mods; });        BotHuman.attach(host, job.human);
        const bd = job.breakdown ? BotBreakdown.make(host) : null;
        let hp480 = null;   // (breakdown=1: the boss's health 8 minutes in, the point the calibration against a real pull reads)
        while (host.sim.state === 'countdown' || host.sim.state === 'live') { host.tick(0.05); if (bd) { bd.sample(0.05); if (hp480 == null && host.sim.t >= 480) hp480 = host.sim.boss.hp / host.sim.boss.maxHp * 100; } if (host.sim.t > 900) break; }
        const pull = { clear: host.sim.state === 'clear', t: host.sim.t, hp: host.sim.boss.hp / host.sim.boss.maxHp * 100 };
        if (bd) pull.hp480 = hp480 == null ? pull.hp : hp480;
        if (bd) pull.breakdown = Object.values(bd.result()).map(r => ({ name: r.name, cls: r.cls, role: r.role, human: r.human, dps: r.damage / host.sim.t, dead: r.dead, out: r.out, moving: r.moving, idle: r.idle, interrupts: r.interrupts, avoidable: r.avoidable, damage: r.damage }));
        pulls.push(pull);
      } catch (e) { pulls.push({ error: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }); }
    }
    process.send({ idx: job.idx, pulls });
  });
  process.send({ ready: true });
  return;   // (a module-level return: the parent code below only runs without --worker)
}

// ------------------------------------------------------------------------------------------------------------ parent
loadGame();
const bossIds = fs.readdirSync(path.join(__dirname, '../client/js/arena/bosses')).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
let mode = 'normal', boss = null, ncomps = 20, runs = 10, seed0 = 1000, gear = 'mid', mix = null, only = [], jobs = 2, human = process.env.HUMAN || 'none', breakdown = false;
const die = (m) => { console.error(m); process.exit(1); };
for (const a of process.argv.slice(2)) {
  let m;
  if (a === 'normal' || a === 'hard') mode = a;
  else if ((m = /^(comps|runs|seed|jobs)=(\d+)$/.exec(a))) { const v = Number(m[2]); if (m[1] === 'comps') ncomps = v; else if (m[1] === 'runs') runs = v; else if (m[1] === 'seed') seed0 = v; else jobs = v; }
  else if (/^gear=\w+$/.test(a)) gear = a.slice(5);
  else if (a.startsWith('mix=')) mix = a.slice(4);
  else if (/^human=[\w,]+$/.test(a)) human = a.slice(6);
  else if (a === 'breakdown=1') breakdown = true;
  else if (a.startsWith('only=')) only = a.slice(5).split(',').filter(Boolean);
  else if (bossIds.includes(a) || a === 'archmage') boss = a;
  else die(`unknown argument: ${a}\nusage: node tools/comp-sweep.js <normal|hard> <boss> [comps=20] [runs=10] [seed=1000] [gear=<level>] [mix=<spec>] [only=<class:spec,...>] [jobs=2]\nbosses: ${bossIds.join(', ')}`);
}
if (!boss) die('name a boss: ' + bossIds.join(', '));
if (!(ncomps > 0 && runs > 0 && jobs > 0)) die('comps, runs and jobs must be at least 1');
if (gear !== 'base' && !LEVELS.includes(gear)) die('gear levels: base, ' + LEVELS.join(', '));

// seeded rng (the same mulberry32 the raid host uses)
function rngFrom(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = rngFrom(seed0 * 2654435761 + 12345);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// the roster: every class:spec by role (DPS split melee / ranged)
const isMelee = (cid) => { const r = KITS[cid].abilities[0].range; return r === 'melee' || (typeof r === 'number' && r <= 130); };
const entriesOf = (c) => (SPECS[c.id] || []).map(s => `${c.id}:${s.id}`);
const ROSTER = {
  tank: CLASSES.filter(c => c.role === 'tank').flatMap(entriesOf),
  healer: CLASSES.filter(c => c.role === 'healer').flatMap(entriesOf),
  melee: CLASSES.filter(c => c.role === 'dps' && isMelee(c.id)).flatMap(entriesOf),
  ranged: CLASSES.filter(c => c.role === 'dps' && !isMelee(c.id)).flatMap(entriesOf),
};
const clsOf = (e) => e.split(':')[0];
const bags = {};
function draw(kind, avoidCls) {   // next entry of a kind from its shuffled bag, skipping classes already in the party
  for (let tries = 0; tries < 200; tries++) {
    if (!bags[kind] || !bags[kind].length) bags[kind] = shuffle(ROSTER[kind]);
    const i = bags[kind].findIndex(e => !avoidCls.includes(clsOf(e)));
    if (i >= 0) return bags[kind].splice(i, 1)[0];
    bags[kind] = shuffle(ROSTER[kind]);   // every left-over entry clashes: start a fresh bag
  }
  return ROSTER[kind][0];
}

// forced members (only=)
const forced = { tank: [], healer: [], dps: [] };
for (const spec of only) {
  const [cid, sid] = spec.split(':');
  const c = CLASSES.find(x => x.id === cid);
  if (!c) die(`only=: no class '${cid}' (classes: ${CLASSES.map(x => x.id).join(', ')})`);
  const specs = SPECS[cid] || [];
  if (sid && !specs.some(s => s.id === sid)) die(`only=: ${cid} has no spec '${sid}' (${specs.map(s => s.id).join(', ')})`);
  forced[c.role].push(sid ? `${cid}:${sid}` : cid);
}
if (forced.tank.length > 1 || forced.healer.length > 1 || forced.dps.length > 2) die('only=: a party is one tank, one healer and two DPS');
const fillSpec = (e) => e.includes(':') ? e : `${e}:${SPECS[e][Math.floor(rng() * SPECS[e].length)].id}`;

const PATTERNS = [['melee', 'melee'], ['ranged', 'ranged'], ['melee', 'ranged']];
function drawComps() {
  const comps = [];
  for (let i = 0; i < ncomps; i++) {
    const used = [...forced.tank, ...forced.healer, ...forced.dps].map(clsOf);
    const tank = forced.tank.length ? fillSpec(forced.tank[0]) : draw('tank', used);
    const healer = forced.healer.length ? fillSpec(forced.healer[0]) : draw('healer', used);
    const dps = forced.dps.map(fillSpec);
    const pat = PATTERNS[i % 3].slice();
    // a forced DPS takes its own place in the pattern; the other slot is drawn so the pair still alternates melee / ranged
    while (dps.length < 2) {
      let kind = pat.shift();
      if (dps.length === 1) kind = isMelee(clsOf(dps[0])) ? (i % 2 ? 'ranged' : 'melee') : (i % 2 ? 'melee' : 'ranged');
      dps.push(draw(kind, [...used, ...dps.map(clsOf)]));
    }
    comps.push([tank, healer, ...dps]);
  }
  return comps;
}

// gear levels per member
function levelsFor(c) {
  const base = SLOTS.map(() => gear);
  if (!mix) return base;
  const r = /^random:(\w+)-(\w+)$/.exec(mix);
  if (r) {
    const a = LEVELS.indexOf(r[1]), b = LEVELS.indexOf(r[2]);
    if (a < 0 || b < 0) die('mix=random:<low>-<high> with levels ' + LEVELS.join(', '));
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return SLOTS.map(() => LEVELS[lo + Math.floor(rng() * (hi - lo + 1))]);
  }
  for (const part of mix.split(',')) {
    const [slot, lv] = part.split(':');
    if (!SLOTS.includes(slot) || !LEVELS.includes(lv)) die(`mix=: '${part}' is not slot:level (slots ${SLOTS.join(' ')}; levels ${LEVELS.join(' ')}) or random:<low>-<high>`);
    base[SLOTS.indexOf(slot)] = lv;
  }
  return base;
}
const comps = drawComps().map((comp, idx) => ({ idx, comp, levels: levelsFor(comp), seed: seed0 + idx * 10007 }));
const gearLabel = (levels) => levels.every(l => l === levels[0]) ? levels[0] : levels.map((l, i) => `${['T', 'H', 'D1', 'D2'][i]}:${l}`).join(' ');

// ------------------------------------------------------------------------------------------------------------ run
const SUMMARY = !!process.env.SUMMARY;
const started = Date.now();
const results = new Array(comps.length);
let next = 0, done = 0, failed = false;
const nworkers = Math.min(jobs, comps.length);
let alive = nworkers;
function finish() {
  if (--alive > 0) return;
  report();
}
for (let w = 0; w < nworkers; w++) {
  const child = fork(__filename, ['--worker'], { env: process.env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  const feed = () => {
    if (next < comps.length) { const c = comps[next++]; child.send({ idx: c.idx, comp: c.comp, levels: c.levels, boss, mode, seed: c.seed, runs, human, breakdown }); }
    else child.kill();
  };
  child.on('message', (m) => {
    if (m.ready) return feed();
    results[m.idx] = m.pulls; done++;
    if (!SUMMARY) process.stderr.write(`\r${done}/${comps.length} comps  ${((Date.now() - started) / 1000).toFixed(0)}s `);
    feed();
  });
  child.on('exit', () => { if (child.killed || next >= comps.length) finish(); else { failed = true; finish(); } });
}

// ------------------------------------------------------------------------------------------------------------ report
function pct(sorted, p) {   // linear interpolation
  if (!sorted.length) return null;
  const x = (sorted.length - 1) * p, lo = Math.floor(x), hi = Math.ceil(x);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (x - lo);
}
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
// breakdown=1: the mean per pull of each player's loss figures (seconds per pull; dps over the pull's length)
function breakdownOf(pulls) {
  const withBd = pulls.filter(p => p.breakdown);
  if (!withBd.length) return undefined;
  return withBd[0].breakdown.map((_, i) => {
    const f = (k) => mean(withBd.map(p => p.breakdown[i][k]));
    return { name: withBd[0].breakdown[i].name, cls: withBd[0].breakdown[i].cls, human: withBd[0].breakdown[i].human, dps: f('dps'), dead: f('dead'), out: f('out'), moving: f('moving'), idle: f('idle'), interrupts: f('interrupts'), avoidable: f('avoidable') };
  });
}
function report() {
  if (!SUMMARY) process.stderr.write('\n');
  const rows = comps.map(c => {
    const pulls = (results[c.idx] || []).filter(p => !p.error), errs = (results[c.idx] || []).filter(p => p.error);
    const clears = pulls.filter(p => p.clear), wipes = pulls.filter(p => !p.clear);
    return { idx: c.idx, comp: c.comp, gear: gearLabel(c.levels), levels: c.levels, played: pulls.length, clears: clears.length, errors: errs.length, errMsg: errs[0] && errs[0].error,
      rate: pulls.length ? clears.length / pulls.length : null, clearT: mean(clears.map(p => p.t)), wipeHp: mean(wipes.map(p => p.hp)),
      allHp: mean(pulls.map(p => p.hp)), allT: mean(pulls.map(p => p.t)), hp480: mean(pulls.filter(p => p.hp480 != null).map(p => p.hp480)), bd: breakdownOf(pulls) };
  });
  const ok = rows.filter(r => r.rate != null);
  const rates = ok.map(r => r.rate).sort((a, b) => a - b);
  const allClearT = rows.flatMap(r => (results[r.idx] || []).filter(p => p.clear).map(p => p.t));
  const byClass = {};
  for (const r of ok) for (const cid of new Set(r.comp.map(clsOf))) (byClass[cid] = byClass[cid] || []).push(r.rate);
  const classTable = Object.entries(byClass).map(([cid, rs]) => ({ cls: cid, role: CLASSES.find(c => c.id === cid).role, comps: rs.length, rate: mean(rs) })).sort((a, b) => a.rate - b.rate);
  const sorted = ok.slice().sort((a, b) => a.rate - b.rate || a.idx - b.idx);
  const sum = {
    boss, mode, gear: mix ? `${gear}+mix(${mix})` : gear, comps: comps.length, runs, seed: seed0, only: only.length ? only : undefined,
    pulls: ok.reduce((s, r) => s + r.played, 0), errors: rows.reduce((s, r) => s + r.errors, 0),
    median: pct(rates, 0.5), mean: mean(rates), p10: pct(rates, 0.1), p90: pct(rates, 0.9), meanClearT: allClearT.length ? mean(allClearT) : null,
    seconds: Math.round((Date.now() - started) / 1000),
    worst: sorted.slice(0, 5).map(r => ({ comp: r.comp.join(' / '), gear: r.gear, rate: r.rate })),
    best: sorted.slice(-5).reverse().map(r => ({ comp: r.comp.join(' / '), gear: r.gear, rate: r.rate })),
    classes: classTable,
  };
  if (human !== 'none') sum.human = human;
  if (breakdown) { sum.meanBossHpLeft = mean(ok.map(r => r.allHp).filter(x => x != null)); sum.breakdown = ok.map(r => ({ comp: r.comp.join(' / '), gear: r.gear, bossHpLeft: r.allHp, bossHpAt480s: r.hp480, meanPullLength: r.allT, players: r.bd })); }
  if (SUMMARY) { console.log(JSON.stringify(sum, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v)); return process.exit(failed ? 1 : 0); }
  const P = (x) => x == null ? '  -' : (x * 100).toFixed(0).padStart(3) + '%';
  console.log(`${boss}, ${mode}, gear ${sum.gear}, ${comps.length} comps x ${runs} runs, seed ${seed0}${only.length ? ', only ' + only.join(',') : ''}`);
  for (const r of rows) {
    console.log(`#${String(r.idx + 1).padStart(2)} ${r.comp.map(e => e.replace(':', ':')).join(' / ')} | ${r.gear} | ${r.clears}/${r.played}${r.errors ? ` (+${r.errors} errors)` : ''} ${P(r.rate)} | clear ${r.clearT == null ? '-' : r.clearT.toFixed(0) + 's'} | wipe boss ${r.wipeHp == null ? '-' : r.wipeHp.toFixed(0) + '% left'}`);
    if (r.errMsg) console.log('     error: ' + r.errMsg);
    if (r.bd) {
      console.log(`     boss HP left (mean over all pulls): ${r.allHp.toFixed(0)}%, mean pull length ${r.allT.toFixed(0)}s, mean boss HP left at 480s of the pull: ${r.hp480 == null ? '-' : r.hp480.toFixed(0) + '%'}`);
      for (const p of r.bd) console.log(`     ${p.name}/${p.cls}${p.human ? '*' : ''}: ${p.dps.toFixed(0)} dps | dead ${p.dead.toFixed(0)}s, out ${p.out.toFixed(0)}s, moving ${p.moving.toFixed(0)}s, gcd idle ${p.idle.toFixed(0)}s, cancelled ${p.interrupts.toFixed(1)}, avoidable ${p.avoidable.toFixed(1)}`);
    }
  }
  console.log(`\nclear rate over ${ok.length} comps (${sum.pulls} pulls): median ${P(sum.median)}, mean ${P(sum.mean)}, 10th pct ${P(sum.p10)}, 90th pct ${P(sum.p90)}; mean clear time ${sum.meanClearT == null ? '-' : sum.meanClearT.toFixed(0) + 's'}; ${sum.seconds}s`);
  const line = (r) => `  ${P(r.rate)}  ${r.comp} | ${r.gear}`;
  console.log('5 worst comps:\n' + sum.worst.map(line).join('\n'));
  console.log('5 best comps:\n' + sum.best.map(line).join('\n'));
  console.log('per class (mean clear rate of the comps with that class; lowest first):');
  for (const c of classTable) console.log(`  ${c.cls.padEnd(13)} ${c.role.padEnd(6)} ${P(c.rate)}  (${c.comps} comps)`);
  if (failed) { console.error('a worker exited early; some comps are missing'); process.exit(1); }
}
