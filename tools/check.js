// One command that says whether the game is still healthy: `npm run check` (or `node tools/check.js`).
// It parses every script, checks the data and the shared math, compares class balance with the recorded baseline,
// has a bot party clear every built boss on Normal, and runs each boss once on Hard. Exit code 0 means everything passed.
//   node tools/check.js --update-baseline   (after an intended balance change: record the new numbers)
//   node tools/check.js --full              (always run everything; without it, a tree that changed nothing the game or the tools
//                                            load since the last full pass only gets the cheap checks: the docs-only lane, section 6)
// All the work runs as child processes in one pool (section 3 + 4), the slowest first, and the end of the run shows where the time went.
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(__dirname, 'check-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');
const FULL = UPDATE || process.argv.includes('--full');
const STAGE = (process.argv.find(a => a.startsWith('--stage=')) || '').slice(8);   // (internal: this process is a child that runs one in-process stage)
const DPS_TOLERANCE = 0.08;   // a class's pro DPS may drift this far from the baseline before it counts as a change
const SPEC_TOLERANCE = 0.05;  // a specialization's pro DPS may differ this much from its own base class
// Normal is meant to take a real group several wipes, so a bot party only has to clear one run in RAID_RUNS
const RAID_RUNS = 3;
// bot raids: every boss, and every spec somewhere, with a fixed line-up so the result doesn't depend on a random spec
const RAIDS = [   // [boss name, boss id, tank, healer, two DPS, optional 'gear=...' (bot-raid.js buildGear levels; set 2 Normal runs as a party with all of set 1 cleared: gear=post1), optional 'runs=N' (more tries than RAID_RUNS)]
  ['Grubnak', 'grubnak', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm'],
  ['Skitterra', 'skitterra', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer'],
  ['Volkar', 'volkar', 'bloodreaver:berserker', 'chronomancer:accelerant', 'ranger:venomstrike', 'pyromancer:base'],
  ['Volkar', 'volkar', 'bloodreaver:hemomancer', 'cleric:inquisitor', 'shadowblade:nightstalker', 'pyromancer:sigilmancer'],
  ['the Hollow King', 'hollowking', 'bastion:sentinel', 'grovekeeper:lifebinder', 'ranger:base', 'pyromancer:cataclysm'],
  ['the Hollow King', 'hollowking', 'bastion:crusader', 'chronomancer:echoist', 'shadowblade:base', 'ranger:sharpshooter'],
  ['the Hollow King', 'hollowking', 'runeguard:spellwarden', 'cleric:base', 'ranger:venomstrike', 'shadowblade:nightstalker'],
  // the advanced classes (classes-a): each spec somewhere
  ['Grubnak', 'grubnak', 'bastion:sentinel', 'cleric:base', 'thermist:base', 'driftblade:base'],   // (the base Bastion cleared only 2 of 8 here, before and after the class rework: a marginal party, not a fault)
  ['Skitterra', 'skitterra', 'runeguard:base', 'grovekeeper:base', 'thermist:pendulum', 'driftblade:orbit', 'runs=6'],   // (both advanced DPS together again since the Driftblade bot keeps moving; it clears about half the time, 7 of 12 before the 2026-10-26 pass and 6 of 12 after: six tries)
  ['Volkar', 'volkar', 'bastion:base', 'cleric:base', 'thermist:zenith', 'driftblade:comet'],   // (with the reworked Volkar, an Accelerant plus two advanced DPS was too tight)
  ['the Hollow King', 'hollowking', 'runeguard:base', 'cleric:aegis', 'thermist:base', 'driftblade:base'],
  // Alembist (classes-b): the base kit and each spec healing a boss
  ['Grubnak', 'grubnak', 'bastion:base', 'alembist:base', 'ranger:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'bastion:sentinel', 'alembist:volatile', 'ranger:base', 'shadowblade:base'],
  ['Volkar', 'volkar', 'bastion:base', 'alembist:apothecary', 'ranger:base', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'bloodreaver:base', 'alembist:base', 'shadowblade:bladedancer', 'pyromancer:base'],
  // Gorgemaw and Oathbroker (tanks-2): the base kit and each spec tanking a boss
  ['Grubnak', 'grubnak', 'gorgemaw:base', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'gorgemaw:glutton', 'grovekeeper:base', 'ranger:base', 'shadowblade:base'],
  ['Volkar', 'volkar', 'gorgemaw:gizzard', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['Grubnak', 'grubnak', 'oathbroker:guarantor', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['Volkar', 'volkar', 'oathbroker:base', 'grovekeeper:base', 'ranger:base', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'oathbroker:collector', 'cleric:base', 'shadowblade:base', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'gorgemaw:base', 'grovekeeper:base', 'ranger:base', 'pyromancer:base'],

  // Ironpalm (the combo-paced tank): the base kit and each spec tanking a boss
  ['Grubnak', 'grubnak', 'ironpalm:base', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'ironpalm:stillwater', 'grovekeeper:base', 'ranger:base', 'shadowblade:base'],
  ['Volkar', 'volkar', 'ironpalm:avalanche', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'ironpalm:base', 'cleric:aegis', 'ranger:base', 'pyromancer:base'],
  // Threadweaver and Marionettist (classes-c): the base kit and each spec, and the two together
  ['Grubnak', 'grubnak', 'bastion:base', 'threadweaver:base', 'ranger:base', 'pyromancer:base'],
  ['Volkar', 'volkar', 'bastion:base', 'threadweaver:loomwright', 'ranger:base', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'bloodreaver:base', 'threadweaver:shears', 'shadowblade:base', 'pyromancer:base'],
  ['Grubnak', 'grubnak', 'bastion:base', 'cleric:base', 'marionettist:base', 'ranger:base'],
  ['Skitterra', 'skitterra', 'runeguard:base', 'grovekeeper:base', 'marionettist:cuttingline', 'shadowblade:base'],
  ['the Hollow King', 'hollowking', 'bastion:base', 'cleric:aegis', 'marionettist:understudy', 'ranger:base'],
  // set 2: Vhalgrath, the Ember Wyrm
  ['Vhalgrath', 'wyrm', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post1'],
  ['Vhalgrath', 'wyrm', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post1'],
  // set 2: Hrimgar, the Frost Titan
  ['Hrimgar', 'titan', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post1'],
  ['Hrimgar', 'titan', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post1', 'runs=8'],   // (this line-up clears Hrimgar about a third of the time, 10 of 30 after the 2026-10-26 pass: eight tries keep a chance miss rare)
  ['Volkar', 'volkar', 'bastion:base', 'threadweaver:base', 'marionettist:base', 'pyromancer:base'],
  // Gloomsworn (class 18): the base kit and each spec tanking a boss (a Hollow's saves: tools/hollow-test.js)
  ['Grubnak', 'grubnak', 'gloomsworn:base', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'gloomsworn:duskward', 'grovekeeper:base', 'ranger:base', 'shadowblade:base'],
  ['Volkar', 'volkar', 'gloomsworn:duskreaver', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'gloomsworn:base', 'alembist:base', 'ranger:base', 'pyromancer:base'],
  // Thresher (class 19): the base kit and each spec as the damage dealer
  ['Grubnak', 'grubnak', 'bastion:base', 'cleric:base', 'thresher:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'bastion:base', 'grovekeeper:base', 'thresher:dancer', 'ranger:base'],
  ['Volkar', 'volkar', 'bastion:base', 'cleric:base', 'thresher:phantom', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'bastion:base', 'cleric:base', 'thresher:base', 'ranger:base'],
  // Tidecaller (class 20): the base kit and each spec healing a boss
  ['Grubnak', 'grubnak', 'bastion:base', 'tidecaller:base', 'ranger:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'bastion:base', 'tidecaller:springtide', 'ranger:base', 'shadowblade:base', 'runs=12'],   // (this line-up clears Skitterra about a quarter of the time at base gear: twelve tries)
  ['Volkar', 'volkar', 'bastion:base', 'tidecaller:undertow', 'ranger:base', 'pyromancer:base'],
  // Lanternkeeper (class 21): the base kit and each spec healing a boss
  ['Grubnak', 'grubnak', 'bastion:base', 'lanternkeeper:base', 'ranger:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'bastion:base', 'lanternkeeper:beacon', 'ranger:base', 'shadowblade:base', 'runs=20'],   // (this line-up clears Skitterra about 15% at base gear: twenty tries, so a dry run is rare)
  ['Volkar', 'volkar', 'bastion:base', 'lanternkeeper:wayfarer', 'ranger:base', 'pyromancer:base'],
  // Kenseier (class 22): the base kit and each spec tanking a boss
  ['Grubnak', 'grubnak', 'kenseier:base', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['Skitterra', 'skitterra', 'kenseier:deathblade', 'grovekeeper:base', 'ranger:base', 'shadowblade:base'],
  ['Volkar', 'volkar', 'kenseier:warden', 'cleric:base', 'ranger:base', 'pyromancer:base'],
  ['the Hollow King', 'hollowking', 'kenseier:base', 'alembist:base', 'ranger:base', 'pyromancer:base'],
];
// set 2: Azerath, the Sunken Archmage (Boss VII)
RAIDS.push(
  ['Azerath', 'archmage', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post1'],
  ['Azerath', 'archmage', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post1', 'runs=8'],   // (a knife-edge line-up: it clears Azerath about half the time)
);
// set 2: the Hydra of the Drowned Temple (Boss VIII)
RAIDS.push(
  ['the Hydra', 'hydra', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post1'],
  ['the Hydra', 'hydra', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post1', 'runs=10'],   // (this line-up clears the Hydra about 20%, 8 of 40 before and after the 2026-10-26 pass: ten tries keep a chance miss rare)
);
// set 3: Corvane, the Unburied Blade (Boss IX). Set 3 Normal is for a party that has cleared set 2 on Normal and Hard (post3)
RAIDS.push(
  ['Corvane', 'corvane', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post3'],
  ['Corvane', 'corvane', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post3', 'runs=8'],   // (this line-up clears Corvane about 40%, 7 of 15 before and 5 of 15 after the 2026-10-26 pass: eight tries)
);
// set 3: Brannoc the Undefeated (Boss X)
RAIDS.push(
  ['Brannoc', 'brannoc', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post3'],
  ['Brannoc', 'brannoc', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post3', 'runs=6'],   // (this line-up clears Brannoc about 40-50% after the 2026-10-26 pass: six tries)
  ['Morrow-Oak', 'morrowoak', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post3'],
  ['Morrow-Oak', 'morrowoak', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post3'],
  ['Caelum Vey', 'caelum', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post3'],
  ['Caelum Vey', 'caelum', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer', 'gear=post3', 'runs=6'],   // (this line-up clears Caelum about 45% after the 2026-10-26 pass, which made his Normal busier: six tries)
  // the Ultimate, one act at a time (bot-raid.js phase=N until=N: the run starts at act N and counts as a clear when the fight passes its gate, so the suite never plays the 15 minute fight; Act IV plays to the kill).
  // Perfect-bot clear rates per run at gear=post5, 24 runs each 2026-10-29: Act I 100%, II 83%, III 88%, IV 67%: the tries below make a chance miss rare.
  ['Sovereign, Act I', 'sovereign', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post5', 'phase=1', 'until=1'],
  ['Sovereign, Act II', 'sovereign', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post5', 'phase=2', 'until=2', 'runs=4'],
  ['Sovereign, Act III', 'sovereign', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post5', 'phase=3', 'until=3'],
  ['Sovereign, Act IV', 'sovereign', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm', 'gear=post5', 'phase=4', 'runs=8'],
);
// Hard smoke runs: one per boss, with the plain line-up. Bots aren't expected to clear Hard; the script just has to run
// clean and the longest of 3 fights has to last a while (HARD_MIN seconds) before they wipe
const HARD_COMP = 'bastion:base,cleric:base,ranger:base,pyromancer:base';
const HARD_MIN = 90;
const HARD_BOSSES = [['Grubnak', 'grubnak'], ['Skitterra', 'skitterra'], ['Volkar', 'volkar'], ['the Hollow King', 'hollowking'], ['Vhalgrath', 'wyrm', 'gear=post2'], ['Hrimgar', 'titan', 'gear=post2']];   // [name, id, optional gear: set 2 Hard is for a party that has also cleared set 2 on Normal]

HARD_BOSSES.push(['the Hydra', 'hydra', 'gear=post2']);
HARD_BOSSES.push(['Azerath', 'archmage', 'gear=post2']);
HARD_BOSSES.push(['Corvane', 'corvane', 'gear=post3']);
HARD_BOSSES.push(['Brannoc', 'brannoc', 'gear=post3']);
HARD_BOSSES.push(['Morrow-Oak', 'morrowoak', 'gear=post3']);
HARD_BOSSES.push(['Caelum Vey', 'caelum', 'gear=post3']);
const results = [];
let into = results;   // where pass() and fail() write: the stage being read (see stage)
const pass = (name, detail = '') => into.push({ ok: true, name, detail });
const fail = (name, detail = '') => into.push({ ok: false, name, detail });
// each stage's results go in a bucket of their own, and the buckets print in this order (children finish in any order)
const BUCKETS = ['syntax', 'core', 'hollow', 'kenseier', 'houndmaster', 'rejoin', 'stamps', 'journal', 'reaper', 'feats', 'practice', 'founding', 'pvp', 'heavy'];
const buckets = {};
const stage = (name, fn) => { const prev = into; into = buckets[name] || (buckets[name] = []); try { return fn(); } finally { into = prev; } };

// ---------------------------------------------------------------- 1. every script parses
function syntax(files, rs) {   // (each file went through `node --check` in the pool, see main)
  const bad = [];
  files.forEach((f, i) => { if (rs[i].code !== 0) bad.push(`${path.relative(ROOT, f)}: ${rs[i].out.split('\n').find(l => /Error/.test(l)) || 'parse error'}`); });
  if (bad.length) fail('Scripts parse', bad.join('\n'));
  else pass('Scripts parse', `${files.length} files`);
}

// ---------------------------------------------------------------- 1b. contribution points (arena/scoring.js)
function scoring() {
  const { Scoring: S } = require(path.join(ROOT, 'client/js', 'arena/scoring.js'));
  const base = { damage: 0, healing: 0, taken: 0, overheal: 0, mitigated: 0, deaths: 0, avoidable: 0, aggro: 0, up: 0, soaked: 0, raises: 0, saves: 0, perfects: 0, busters: 0, ults: 0, burst: 0, wards: 0, closer: 0 };
  const mk = (role, o) => Object.assign({ name: role, cls: 'x', role }, base, o);
  const stats = {
    1: mk('tank', { damage: 3000, taken: 4000, mitigated: 3000, aggro: 280, up: 250, soaked: 3, perfects: 6, busters: 3, ults: 1, burst: 1 }),
    2: mk('healer', { damage: 2500, healing: 6000, overheal: 1500, taken: 1500, saves: 3, wards: 8, soaked: 3, raises: 1 }),
    3: mk('dps', { damage: 6000, taken: 1500, up: 280, soaked: 3, ults: 1, burst: 8, closer: 900 }),
    4: mk('dps', { damage: 4500, taken: 1500, up: 200, soaked: 2, ults: 1, burst: 1, avoidable: 3, deaths: 1 }),
  };
  const probs = [];
  const a = S.score(stats, { time: 300 }), b = S.score(JSON.parse(JSON.stringify(stats)), { time: 300 });
  if (JSON.stringify(a) !== JSON.stringify(b)) probs.push('not deterministic');
  for (const [id, s] of Object.entries(a)) if (!(s.total >= 0 && s.total <= 100)) probs.push(`player ${id} scored ${s.total}`);
  for (const [role, w] of Object.entries(S.WEIGHTS)) if (Object.values(w).reduce((n, v) => n + v, 0) !== 100) probs.push(`${role} weights don't add to 100`);
  const top = Object.keys(a).sort((x, y) => a[y].total - a[x].total)[0];
  if (S.mvp(stats, a) !== Number(top)) probs.push(`MVP was ${S.mvp(stats, a)}, wanted the top score (${top})`);
  if (a[3].total <= a[4].total) probs.push('the clean DPS did not beat the one who died');
  if (a[4].total >= a[3].total) probs.push('avoidable hits and a death did not lower a score');
  // a tie goes to fewer deaths, then more raises
  const tie = { 1: mk('dps', { damage: 100, deaths: 1 }), 2: mk('dps', { damage: 100, deaths: 0 }) }, ts = { 1: { total: 50 }, 2: { total: 50 } };
  if (S.mvp(tie, ts) !== 2) probs.push('tie did not go to the fewer deaths');
  const aw = S.awards(stats, a, { clear: true, time: 300 }), names = aw.map(x => x.k);
  if (!names.includes('ironwall') || aw.find(x => x.k === 'ironwall').who !== 1) probs.push('Iron Wall missing');
  if (!names.includes('lifeline') || !names.includes('secondwind')) probs.push('Lifeline / Second Wind missing');
  if (S.awards(stats, a, { clear: false, time: 300 }).some(x => x.k === 'closer' || x.k === 'spotless')) probs.push('a wipe showed Closer or Spotless');
  const row = S.pack(3, stats[3]), back = S.unpack(row, { role: 'dps' });
  if (back.damage !== 6000 || back.burst !== 8 || back.closer !== 900) probs.push('pack/unpack does not round-trip');
  const rec = S.record(stats, a, { boss: 'grubnak', mode: 'normal', clear: true, time: 300, at: 1, awards: aw });
  if (JSON.stringify(rec).length > 1500) probs.push(`Logbook record is ${JSON.stringify(rec).length} bytes`);
  if (probs.length) fail('Contribution points score sensibly', probs.join('\n')); else pass('Contribution points score sensibly', `MVP, ${aw.length} awards, record ${JSON.stringify(rec).length} bytes`);
}

// ---------------------------------------------------------------- 2. data and shared math
function data() {
  const load = p => require(path.join(ROOT, 'client/js', p));
  Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'), load('combat/talents.js'), load('items.js'), load('interp.js'));
  global.TAU = Math.PI * 2;

  // every class has a kit, gear for each tier and enhancements that point at real abilities
  const probs = [];
  for (const c of CLASSES) {
    const kit = KITS[c.id];
    if (!kit) { probs.push(`${c.id}: no kit`); continue; }
    if (kit.abilities.length !== 6) probs.push(`${c.id}: ${kit.abilities.length} abilities (want 6)`);
    for (const key of [`${c.id}_w0`, `${c.id}_w1`, `${c.id}_w2`, `${c.id}_w3`, `${c.id}_a1`, `${c.id}_a2`, `${c.id}_a3`]) if (!ITEMS[key]) probs.push(`missing item ${key}`);
  }
  for (const [key, p] of Object.entries(ITEM_PERKS)) {
    const it = ITEMS[key];
    if (!it) { probs.push(`enhancement on unknown item ${key}`); continue; }
    if (!KITS[it.cls].abilities.some(a => a.id === p.ab)) probs.push(`${key} enhances unknown ability ${p.ab}`);
  }
  if (probs.length) fail('Classes, items and enhancements line up', probs.join('\n')); else pass('Classes, items and enhancements line up', `${CLASSES.length} classes, ${Object.keys(ITEMS).length} items, ${Object.keys(ITEM_PERKS).length} enhancements`);

  items();
  saveUpgrade();
  talents();

  // party bonuses: nothing for one person, the right totals for groups, junk from clients cleaned out
  const b1 = partyBonus({ 1: 1 }), b4 = partyBonus({ 1: 4, 2: 2 });
  const bondOk = !b1.active.length && b4.hp === 0.05 && b4.dmg === 0.03 && b4.crit === 0.02 && b4.active.length === 2 &&
    JSON.stringify(sanitizeSources([1, '2', 2, 99, 'x'])) === '[1,2]' && sanitizeSources('junk').length === 0;
  if (bondOk) pass('Party bonuses add up'); else fail('Party bonuses add up', JSON.stringify({ b1, b4 }));

  // arena shapes: clamping always lands inside, and the wall distance matches the shape
  const shapeProbs = [];
  for (const id of [...Object.keys(ARENA_DEFS), 'any-round-boss']) {
    ARENA.use(id);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let i = 0; i < 3000; i++) { const p = ARENA.clamp({ x: rnd() * 1200, y: rnd() * 1200 }, 12); if (ARENA.sd(p.x, p.y) > -11.5) { shapeProbs.push(`${id}: clamp left (${p.x | 0}, ${p.y | 0}) outside`); break; } }
    for (let a = 0; a < TAU; a += 0.37) { const e = ARENA.edge(a); if (Math.abs(ARENA.sd(Math.cos(a) * e, Math.sin(a) * e)) > 1) { shapeProbs.push(`${id}: edge() off at angle ${a.toFixed(2)}`); break; } }
  }
  if (shapeProbs.length) fail('Arena shapes hold players in', shapeProbs.join('\n')); else pass('Arena shapes hold players in', Object.keys(ARENA_DEFS).join(', ') + ', circle');
  props();

  // smoothing: a unit moving at a steady speed is drawn at a steady speed, never past where it really is
  // updates arrive 10 times a second as time passes (like the host's boss updates); frames run at 60 fps
  const tr = new Track(0, 0, 0);
  let sent = 0;
  const feed = t => { while (sent <= 20 && sent * 0.1 <= t) { tr.push(sent * 0.1, sent * 20, 0, 0); sent++; } };
  feed(0.3);
  const steps = []; let last = tr.at(0.3).x, overshoot = false;
  for (let t = 0.3 + 1 / 60; t < 2.0; t += 1 / 60) { feed(t); const x = tr.at(t).x; steps.push(x - last); last = x; if (x > 400.01) overshoot = true; }
  const spread = Math.max(...steps) - Math.min(...steps);
  if (!overshoot && spread < 0.05) pass('Network smoothing is even', `step ${steps[0].toFixed(2)} ± ${(spread / 2).toFixed(3)}`);
  else fail('Network smoothing is even', `spread ${spread.toFixed(3)}, overshoot ${overshoot}`);

  // ... and stays even over a wobbly connection: 40-75 ms delivery, noticed only on the receiver's next frame,
  // timed by the sender's clock (SendClock). Speed should hold within 10% once the first second has passed.
  // With `stall`, the sender's tab freezes for 0.6 s at the 3 s mark (its clock stops, then carries on from there):
  // it should be smooth again 2.5 s later.
  const wob = (stamp, stall) => {
    const tw = new Track(0, 0, 0), clk = new SendClock();
    let js = 3, k = 0; const jit = () => ((js = (js * 16807) % 2147483647) / 2147483647) * 0.035;
    const msgs = [];
    for (let i = 0; i <= 90; i++) {
      const real = i * 0.1;
      if (stall && real > 3 && real < 3.6) continue;
      msgs.push({ sent: 50 + real - (stall && real >= 3.6 ? 0.6 : 0), x: i * 20, arrive: Math.ceil((real + 0.04 + jit()) * 60) / 60 });
    }
    const speeds = []; let lx = null;
    const from = stall ? 6.1 : 1.5;
    for (let t = 0; t < 8.5; t += 1 / 60) {
      while (k < msgs.length && msgs[k].arrive <= t + 1e-9) { const m = msgs[k++]; tw.push(stamp ? clk.map(m.sent, t) : t, m.x, 0, 0); }
      const x = tw.at(t).x;
      if (lx != null && t > from && t < 8.5) speeds.push((x - lx) * 60);
      lx = x;
    }
    return { lo: Math.min(...speeds), hi: Math.max(...speeds) };
  };
  const ws = wob(true), wa = wob(false), wst = wob(true, true);
  const okRange = w => w.lo > 180 && w.hi < 220;
  if (okRange(ws) && okRange(wst)) pass('Smoothing holds over a wobbly connection', `speed ${ws.lo.toFixed(0)}-${ws.hi.toFixed(0)}, ${wst.lo.toFixed(0)}-${wst.hi.toFixed(0)} after a stall; by arrival time alone ${wa.lo.toFixed(0)}-${wa.hi.toFixed(0)}`);
  else fail('Smoothing holds over a wobbly connection', `speed ${ws.lo.toFixed(0)}-${ws.hi.toFixed(0)}, after a stall ${wst.lo.toFixed(0)}-${wst.hi.toFixed(0)}; want 180-220`);
}

// ---------------------------------------------------------------- 2a. arena props: solid, cover, throws, chipping
function props() {
  const probs = [];
  const { FightSim } = require(path.join(ROOT, 'client/js', 'arena/fight.js'));
  global.FIGHT = global.FIGHT || require(path.join(ROOT, 'client/js', 'arena/fight.js')).FIGHT;
  const ps = [{ id: 1, name: 'behind', role: 'dps', x: 0, y: 220 }, { id: 2, name: 'open', role: 'dps', x: 220, y: 0 }, { id: 3, name: 'beside', role: 'dps', x: 70, y: 200 }];
  const sent = [];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e6 }, autoDmg: { normal: 0 }, script() {} };
  const sim = new FightSim(def, 'normal', () => ps, m => sent.push(m), 1);
  sim.state = 'live'; sim.boss.x = 0; sim.boss.y = 0;
  const cask = sim.addProp({ kind: 'cask', x: 0, y: 110, r: 30, hp: 2, solid: true, cover: true });
  // a blast from the boss: the hero straight behind the cask is spared, the one in the open and the one just beside its shadow are hit
  sim.mech({ type: 'aoe', shape: { kind: 'circle', x: 0, y: 0, r: 2000 }, delay: 0, dmg: 10000, cover: true, chip: 'all' });
  sim.updateMechs();
  const hp = id => sim.ps.get(id).hp, full = id => sim.ps.get(id).hp === sim.ps.get(id).maxHp;
  if (!full(1)) probs.push('cover: the hero behind the cask was hit');
  if (full(2)) probs.push('cover: the hero in the open was spared');
  if (full(3)) probs.push('cover: the hero beside the shadow was spared');
  if (cask.hp !== 1) probs.push(`cover: the cask has ${cask.hp} hits left after one blast (want 1)`);
  // ... a cap of one: only the nearer of two behind it is spared
  ps[2].x = 0; ps[2].y = 300;
  const before = [hp(1), hp(3)];
  sim.mech({ type: 'aoe', shape: { kind: 'circle', x: 0, y: 0, r: 2000 }, delay: 0, dmg: 4000, cover: true, coverCap: 1 });
  sim.updateMechs();
  if (hp(1) !== before[0] || hp(3) === before[1]) probs.push('cover cap: want the nearer hero spared and the farther one hit');
  // the shadow drawn for a prop is the same area the host spares
  const sh = PROPS.shadowPoly(0, 0, cask), inPoly = (x, y) => { let c = false; for (let i = 0, j = sh.length - 1; i < sh.length; j = i++) { const [xi, yi] = sh[i], [xj, yj] = sh[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  for (const [x, y] of [[0, 220], [15, 300], [60, 260], [-40, 200], [0, 500]]) if (inPoly(x, y) !== !!PROPS.shadowing(0, 0, x, y, [cask])) probs.push(`shadow drawn and shadow judged disagree at (${x}, ${y})`);
  // solid: walking into it pushes you out; a throw stops at it (and a throw into it is a wall slam)
  const e = { x: 4, y: 104 }; PROPS.collide(e, sim.props, 14);
  if (PROPS.sd(cask, e.x, e.y) < 13.5) probs.push('collide left a hero inside the cask');
  const thrown = sim.players().find(p => p.id === 1);
  thrown.y = 220; ps[0].y = 220;
  const res = sim.knock(thrown, 0, 400, 250, { slam: 1000 });
  if (!res.slam || res.dest.y < 110 + 30 - 1) probs.push(`a throw through the cask ended at (${res.dest.x | 0}, ${res.dest.y | 0}) without a slam`);
  sim.hitProp(cask, 1);
  if (sim.props.length || !sim.floor.some(f => f.kind === 'rubble') || !sent.some(m => m.t === 'propfx' && m.k === 'break')) probs.push('a cask on its last hit should break and leave rubble');
  sim.broadcastProps();
  const msg = sent.filter(m => m.t === 'props').pop();
  if (!msg || msg.p.length !== 0 || !msg.f.length) probs.push('the props message should carry the (empty) props and the rubble');
  // a round room with a wedge broken off (Volkar, Hard): the wall follows the break, and a throw stops at the new lip
  const saved = Object.assign({}, ARENA);
  ARENA.use('volkar'); ARENA.cuts.push({ a0: -0.6, a1: 0.6, r: 300 });
  if (Math.abs(ARENA.sd(300, 0)) > 1 || Math.abs(ARENA.sd(0, 540)) > 1) probs.push('broken edge: the wall should be 300 out inside the wedge and 540 elsewhere');
  const lip = ARENA.clamp({ x: 500, y: 0 }, 10);
  if (Math.hypot(lip.x, lip.y) > 291) probs.push('broken edge: clamp left a hero out over the break');
  thrown.x = 100; thrown.y = 0;
  const off = sim.knock(thrown, 0, 0, 300);
  if (!off.slam || off.dest.x > 300 - 11) probs.push('broken edge: a throw off the lip should stop at it');
  Object.assign(ARENA, saved);
  if (probs.length) fail('Arena props: solid, cover, throws', probs.join('\n'));
  else pass('Arena props: solid, cover, throws', 'cover spares the hero behind a cask and hits the open; caps, shadows, collisions, slams, breaking and broken edges hold');
}

// ---------------------------------------------------------------- 2b. items: rarities, effects, loot tables, chests
function items() {
  const probs = [];
  const RARITY_N = RARITY.length;
  // every item: a known rarity, Common only for Recruit gear, effects only from known hooks, text for every effect
  for (const it of Object.values(ITEMS)) {
    if (!Number.isInteger(it.rarity) || it.rarity < 0 || it.rarity >= RARITY_N) probs.push(`${it.key}: bad rarity ${it.rarity}`);
    if ((it.rarity === 0) !== (it.tier === 0)) probs.push(`${it.key}: Common is for Recruit gear only (tier ${it.tier}, rarity ${it.rarity})`);
    if (ITEM_PERKS[it.key] && it.rarity !== 3) probs.push(`${it.key}: an enhancement should be Legendary`);
    if (it.rarity === 1 && it.fx) probs.push(`${it.key}: Uncommon items are a clean stat line (no effect)`);
    if (it.rarity >= 2 && !it.fx && !ITEM_PERKS[it.key]) probs.push(`${it.key}: a ${RARITY[it.rarity].name} item needs an effect or an enhancement`);
    if (it.fx && !it.fxText) probs.push(`${it.key}: has effects but no fxText for its tooltip`);
    for (const e of it.fx || []) {
      const where = `${it.key} effect ${e.id}`;
      for (const k of Object.keys(e)) if (!FX_KEYS.has(k)) probs.push(`${where}: unknown field "${k}"`);
      if (!!e.on === !!e.while) { probs.push(`${where}: needs exactly one of on / while`); continue; }
      if (e.on) {
        if (!FX_TRIGGERS[e.on]) probs.push(`${where}: unknown trigger "${e.on}"`);
        if (!FX_ACTIONS.some(a => e[a])) probs.push(`${where}: a trigger needs an action (${FX_ACTIONS.join(', ')})`);
        if (FX_MODS.some(m => e[m])) probs.push(`${where}: mods belong in a condition or a buff`);
        if (e.buff) {
          if (!(e.dur > 0) || !e.name) probs.push(`${where}: a buff needs dur and name`);
          for (const m of Object.keys(e.buff)) if (!FX_MODS.includes(m)) probs.push(`${where}: unknown buff mod "${m}"`);
        }
        if (e.chance != null && !(e.chance > 0 && e.chance <= 1)) probs.push(`${where}: chance must be in (0, 1]`);
      } else {
        if (!FX_CONDITIONS[e.while]) probs.push(`${where}: unknown condition "${e.while}"`);
        if (!FX_MODS.some(m => e[m])) probs.push(`${where}: a condition needs a mod (${FX_MODS.join(', ')})`);
        if (FX_ACTIONS.some(a => e[a])) probs.push(`${where}: actions need a trigger`);
        if (e.while !== 'always' && !(e.frac > 0 && e.frac < 1)) probs.push(`${where}: ${e.while} needs a frac between 0 and 1`);
      }
      // modest numbers: effects stay small next to the stat line
      for (const m of FX_MODS) { const v = (e[m] || 0) + ((e.buff && e.buff[m]) || 0) * (e.stacks || 1); if (v > 0.15) probs.push(`${where}: ${m} ${v} is more than +15%`); }
    }
  }
  // loot tables: every entry exists and belongs there; every rarity has something anyone can get; two Mythics a boss
  for (const [boss, table] of Object.entries(LOOT_TABLES)) {
    for (const r of [1, 2, 3, 4]) {
      const keys = table[r] || [];
      for (const k of keys) {
        if (!ITEMS[k]) probs.push(`${boss}: loot table has unknown item ${k}`);
        else if (ITEMS[k].rarity !== r || ITEMS[k].tier !== BOSS_TIER[boss]) probs.push(`${boss}: ${k} is in the wrong table`);
      }
      if (!keys.length) probs.push(`${boss}: no ${RARITY[r].name} items`);
      else if (!keys.some(k => ITEMS[k] && !ITEMS[k].cls)) probs.push(`${boss}: every ${RARITY[r].name} item is class-locked (a party could roll an empty pool)`);
    }
    if ((table[4] || []).length !== 2) probs.push(`${boss}: ${(table[4] || []).length} Mythics (want 2)`);
  }
  for (const it of Object.values(ITEMS)) if (it.tier > 0 && !Object.values(LOOT_TABLES).some(t => (t[it.rarity] || []).includes(it.key))) probs.push(`${it.key} never drops`);
  // chests: the right size, real items, class items only for the classes in the run, rarities about as advertised
  let seed = 11; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const boss of Object.keys(LOOT_TABLES)) for (const mode of ['normal', 'hard']) {
    const counts = [0, 0, 0, 0, 0]; let n = 0;
    for (let i = 0; i < 1500; i++) {
      const classes = i % 3 ? ['bastion'] : ['cleric', 'ranger', 'pyromancer'];
      const chest = rollChest(boss, mode, classes, rng);
      if (chest.length !== CHEST_SIZE[mode]) { probs.push(`${boss} ${mode}: chest of ${chest.length}`); break; }
      for (const k of chest) {
        if (!ITEMS[k]) { probs.push(`${boss} ${mode}: chest rolled ${k}`); continue; }
        if (ITEMS[k].cls && !classes.includes(ITEMS[k].cls)) probs.push(`${boss} ${mode}: ${k} rolled for ${classes.join('/')}`);
        counts[ITEMS[k].rarity]++; n++;
      }
    }
    CHEST_ODDS[mode].forEach((pct, i) => { const got = counts[i + 1] / n * 100; if (Math.abs(got - pct) > 4) probs.push(`${boss} ${mode}: ${RARITY[i + 1].name} ${got.toFixed(1)}% (want about ${pct}%)`); });
  }
  // who can use what (the chest marks the items your hero can use)
  const needs = [['bastion_w1', 'bastion', true], ['bastion_w1', 'cleric', false], ['g_cleaver', 'ranger', true], ['g_cleaver', 'cleric', false],
    ['g_apron', 'cleric', true], ['m_crown', 'bastion', true], ['cleric_a2', 'grovekeeper', false]];
  for (const [k, c, want] of needs) if (canUse(k, c) !== want) probs.push(`canUse(${k}, ${c}) should be ${want}`);
  // gold: per boss, doubled on Hard; selling follows rarity
  if (clearGold('grubnak', 'normal') !== 40 || clearGold('hollowking', 'hard') !== 120 || clearGold('nobody', 'normal') !== 0) probs.push('clear gold is off');
  if (RARITY.map(r => r.sell).join() !== '2,8,15,30,60') probs.push('sell prices are off');

  // the engine runs effects: a Mythic's shorter oGCD cooldowns, its buff on an oGCD, and a crit's strike
  const fakeEnv = (keys, hp = 1) => {
    let t = 0; const events = [];
    const mods = gearMods('bastion', gearTotals('bastion', keys.map(key => ({ key }))), keys.map(key => ({ key })));
    return { events, tick: d => { t += d; }, env: { now: () => t, emit: e => events.push(e), rng: () => 0.05, moving: () => false, target: () => ({ id: 'boss', x: 0, y: 0 }),
      positional: () => 'rear', partyMods: () => ({}), targetMods: () => ({}), selfMods: () => ({}), recentDamage: () => 0, maxHp: () => 1000, hpFrac: () => hp,
      gearMods: () => mods, isDead: () => false, defaultLink: () => 1, pos: () => ({ x: 0, y: 0 }) } };
  };
  const og = KITS.bastion.abilities.find(a => a.type === 'ogcd' && typeof a.cd === 'number' && !a.charges);
  const plain = new Kit(KITS.bastion, fakeEnv([]).env), court = new Kit(KITS.bastion, fakeEnv(['m_deadcourt']).env);
  if (Math.abs(court.recast(og) - plain.recast(og) * 0.9) > 1e-9) probs.push(`Dead Court: ${og.id} recast ${court.recast(og)} vs ${plain.recast(og)}`);
  court.itemHook('ogcd', og); court.itemHook('ogcd', og); court.itemHook('ogcd', og); court.itemHook('ogcd', og);
  if (Math.abs(court.fxMod('dmg') - 0.06) > 1e-9) probs.push(`Dead Court: 4 oGCDs give +${court.fxMod('dmg')} damage (want 0.06, 3 stacks)`);
  const fv = fakeEnv(['g_venom']), venom = new Kit(KITS.bastion, fv.env);
  venom.damage(100); const hits = fv.events.filter(e => e.type === 'damage').length;
  venom.damage(100); const hits2 = fv.events.filter(e => e.type === 'damage').length;
  if (hits !== 2 || hits2 !== 3) probs.push(`Venom Pendant: crit strikes ${hits}, then ${hits2} (want 2 then 3: once every 3 s)`);
  const low = new Kit(KITS.bastion, fakeEnv(['m_crown'], 0.3).env), high = new Kit(KITS.bastion, fakeEnv(['m_crown'], 0.9).env);
  if (low.fxMod('dmg') !== 0.12 || high.fxMod('dmg') !== 0) probs.push('Crown of the Barrow: hpBelow is off');

  if (probs.length) fail('Items, loot tables and effects', probs.join('\n'));
  else {
    const per = Object.entries(LOOT_TABLES).map(([b, t]) => `${b} ${[1, 2, 3, 4].map(r => t[r].length).join('/')}`).join(', ');
    pass('Items, loot tables and effects', `U/R/L/M per boss: ${per}`);
  }
}

// the save upgrade keeps every item, drops the Heroic flag and pays for it
function saveUpgrade() {
  const store = {
    'emberfall-save': JSON.stringify({ v: 1, name: 'Ava', inv: { next: 4, items: [{ uid: 1, key: 'bastion_w1', q: 1 }, { uid: 2, key: 'g_coat', q: 0 }, { uid: 3, key: 'gone_item' }],
      equip: { bastion: { weapon: 1, armor: 2 } } }, heroes: {}, settings: {} }),
  };
  global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const p = path.join(ROOT, 'client/js/save.js');
  delete require.cache[require.resolve(p)];
  const { Save: S } = require(p);
  delete global.localStorage;
  const inv = S.get('inv'), saved = JSON.parse(store['emberfall-save']);
  const ok = S.VERSION === 4 && saved.v === 4 && S.gold() === 10 && inv.items.length === 3 && inv.items.every(i => !('q' in i)) &&
    inv.equip.bastion.weapon === 1 && !!store['emberfall-save-backup-v1'] && Array.isArray(inv.lost);
  if (ok) pass('Save upgrade keeps items', 'v1 -> v4: Heroic flag dropped, 10 gold per Heroic item, gear still equipped');
  else fail('Save upgrade keeps items', JSON.stringify({ v: saved.v, gold: S.gold(), inv }));

  // v2 -> v3: every hero gets an empty talent tree; row I is free, the rest cost gold in order, picks only in open rows, reset is free
  const store2 = { 'emberfall-save': JSON.stringify({ v: 2, name: 'Bo', gold: 130, inv: { next: 1, items: [], equip: {}, lost: [] },
    heroes: { ranger: { clears: { grubnak: { normal: 1, hard: 0 } }, spec: null } }, settings: {} }) };
  global.localStorage = { getItem: k => (k in store2 ? store2[k] : null), setItem: (k, v) => { store2[k] = String(v); } };
  delete require.cache[require.resolve(p)];
  const { Save: S2 } = require(p);
  const probs = [], up = JSON.parse(store2['emberfall-save']);
  if (up.v !== 4 || !up.heroes.ranger.talents || up.heroes.ranger.talents.rows !== 0 || up.heroes.ranger.clears.grubnak.normal !== 1) probs.push(`upgrade: ${JSON.stringify(up.heroes)}`);
  if (S2.pickTalent('ranger', 1, 1)) probs.push('picked in a locked row');
  if (!S2.pickTalent('ranger', 0, 1)) probs.push('row I should be free to pick in');
  if (!S2.unlockTalentRow('ranger', TALENT_COSTS[1]) || S2.unlockTalentRow('ranger', TALENT_COSTS[2]) || S2.gold() !== 30) probs.push(`unlocking: gold ${S2.gold()}, rows ${S2.talents('ranger').rows}`);
  if (!S2.pickTalent('ranger', 1, 2) || S2.pickTalent('ranger', 2, 0) || S2.pickTalent('ranger', 0, 3)) probs.push('picks: wrong rows or columns allowed');
  const held = talentSet('ranger', S2.talents('ranger'));
  if (held.size !== 2 || !held.has(TALENTS.ranger[1][2].id) || !held.has(TALENTS.ranger[0][1].id)) probs.push(`talentSet: ${[...held]}`);
  S2.resetTalents('ranger');
  if (S2.talents('ranger').picks.some(x => x != null) || S2.talents('ranger').rows !== 2) probs.push('reset should clear picks and keep rows');
  if (S2.talents('cleric').rows !== 1 || talentSet('cleric', S2.talents('cleric')).size) probs.push('a fresh hero should have row I open and hold no talents');
  // the spec rows VI-VII (SPEC_TALENTS.bastion): bought once per hero after row V and only with a spec; each spec keeps
  // its own picks there, and only the active spec's are held; reset clears only the active spec's
  {
    const B = SPEC_TALENTS.bastion;
    S2.heroTalents('bastion').rows = 5; S2.addGold(2000 - S2.gold());
    if (S2.unlockTalentRow('bastion', TALENT_COSTS[5])) probs.push('spec row VI bought without a spec');
    S2.recordTrial('bastion', 'sentinel'); S2.recordTrial('bastion', 'crusader'); S2.setSpec('bastion', 'sentinel');
    if (S2.pickTalent('bastion', 5, 0)) probs.push('picked in spec row VI before buying it');
    if (!S2.unlockTalentRow('bastion', TALENT_COSTS[5]) || !S2.unlockTalentRow('bastion', TALENT_COSTS[6]) || S2.unlockTalentRow('bastion', 0) || S2.gold() !== 2000 - 540 - 700) probs.push(`spec rows: rows ${S2.talents('bastion').rows}, gold ${S2.gold()}`);
    if (!S2.pickTalent('bastion', 5, 1) || !S2.pickTalent('bastion', 6, 0) || S2.pickTalent('bastion', 5, 2)) probs.push('spec row picks: wrong columns allowed');
    S2.setSpec('bastion', 'crusader');
    if (S2.talents('bastion').specPicks.some(x => x != null)) probs.push('crusader should start with no spec-row picks');
    S2.pickTalent('bastion', 6, 1);
    const cr = talentSet('bastion', S2.talents('bastion'));
    if (!cr.has(B.crusader[1][1].id) || [...B.sentinel.flat()].some(t => cr.has(t.id))) probs.push(`crusader holds ${[...cr]}`);
    S2.setSpec('bastion', 'sentinel');
    const se = talentSet('bastion', S2.talents('bastion'));
    if (!se.has(B.sentinel[0][1].id) || !se.has(B.sentinel[1][0].id) || se.has(B.crusader[1][1].id)) probs.push(`sentinel holds ${[...se]}`);
    S2.resetTalents('bastion');
    S2.setSpec('bastion', 'crusader');
    if (S2.talents('bastion').specPicks[1] !== 1 || S2.talents('bastion').rows !== 7) probs.push('reset should clear only the active spec\'s spec-row picks');
  }
  delete global.localStorage;

  // v3 -> v4: picks made in the first talent tree follow their talent by id; one that left its row clears, rows stay bought
  const store3 = { 'emberfall-save': JSON.stringify({ v: 3, name: 'Cy', gold: 0, inv: { next: 1, items: [], equip: {}, lost: [] }, settings: {}, heroes: {
    ranger: { clears: {}, spec: null, talents: { rows: 5, picks: [0, 0, 2, 1, 2] } },     // rhythm (kept), shelter, trail, barrage (gone), falcon (kept in row V)
    bastion: { clears: {}, spec: null, talents: { rows: 3, picks: [1, null, 0, null, null] } },   // counter, unshaken (gone)
    alembist: { clears: {}, spec: null, found: ['EES'], talents: { rows: 2, picks: [2, 1] } },   // an unchanged tree keeps everything
    thermist: { clears: {}, spec: 'zenith', talents: { rows: 5, picks: [1, 2, 0, 1, 0] } },
    driftblade: { clears: {}, spec: null, talents: { rows: 4, picks: [0, 0, 0, 2, null] } } } }) };
  global.localStorage = { getItem: k => (k in store3 ? store3[k] : null), setItem: (k, v) => { store3[k] = String(v); } };
  delete require.cache[require.resolve(p)];
  const { Save: S3 } = require(p);
  const rg = S3.talents('ranger'), ba = S3.talents('bastion'), al = S3.talents('alembist');
  const col = (cls, r, id) => TALENTS[cls][r].findIndex(t => t.id === id);
  if (rg.rows !== 5 || JSON.stringify(rg.picks) !== JSON.stringify([col('ranger', 0, 'ranger_rhythm'), null, null, null, col('ranger', 4, 'ranger_falcon')])) probs.push(`v3 ranger picks: ${JSON.stringify(rg)}`);
  if (ba.rows !== 3 || ba.picks.some(x => x != null)) probs.push(`v3 bastion picks should all clear: ${JSON.stringify(ba)}`);
  if (al.rows !== 2 || al.picks[0] !== 2 || al.picks[1] !== 1) probs.push(`v3 alembist picks should stay: ${JSON.stringify(al)}`);
  if (JSON.stringify(S3.found('alembist')) !== '["EES"]') probs.push(`v3 alembist should keep its found Reactions: ${JSON.stringify(S3.found('alembist'))}`);
  for (const [cls, rows, picks] of [['thermist', 5, [1, 2, 0, 1, 0]], ['driftblade', 4, [0, 0, 0, 2, null]]]) {
    const t = S3.talents(cls);
    if (t.rows !== rows || JSON.stringify(t.picks) !== JSON.stringify(picks)) probs.push(`v3 ${cls} picks should stay: ${JSON.stringify(t)}`);
  }  if (talentSet('ranger', rg).size !== 2) probs.push(`v3 ranger should hold 2 talents, holds ${[...talentSet('ranger', rg)]}`);
  // a pick whose talent later leaves its row clears on reading, without touching the rows bought
  S3.pickTalent('ranger', 1, 0);
  S3.heroTalents('ranger').ids[1] = 'ranger_gone_talent';
  if (S3.talents('ranger').picks[1] !== null || S3.talents('ranger').rows !== 5) probs.push('a pick of a removed talent should read as none');
  delete global.localStorage;
  if (probs.length) fail('Save keeps talents', probs.join('\n')); else pass('Save keeps talents', 'v2 adds talents; v3 picks follow their talent ids, removed ones clear and rows stay bought; picks free; spec rows VI-VII per spec');
}

// ---------------------------------------------------------------- 2c. talents: shape, links to the kits, code and data agree
function talents() {
  const probs = [], ids = new Set(), src = ['combat/kits.js', 'combat/specs.js', 'combat/engine.js'].map(f => fs.readFileSync(path.join(ROOT, 'client/js', f), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/talent\('(\w+)'\)/g)].map(m => m[1]));
  if (JSON.stringify(TALENT_COSTS) !== '[0,100,180,280,400,540,700]') probs.push(`row costs ${TALENT_COSTS}`);
  for (const c of CLASSES) {
    const rows = TALENTS[c.id];
    if (!rows || rows.length !== 5) { probs.push(`${c.id}: ${rows ? rows.length : 0} rows (want 5)`); continue; }
    const specIds = (SPECS[c.id] || []).map(s => s.id);
    rows.forEach((row, r) => {
      if (row.length !== 3) probs.push(`${c.id} row ${r + 1}: ${row.length} talents (want 3)`);
      for (const t of row) {
        const where = `${c.id} ${t.id}`;
        if (ids.has(t.id)) probs.push(`${where}: duplicate id`); ids.add(t.id);
        if (!t.id.startsWith(c.id + '_')) probs.push(`${where}: id should start with ${c.id}_`);
        if (!t.name || !t.text) probs.push(`${where}: needs a name and text`);
        if (!KITS[c.id].abilities.some(a => a.id === t.ab)) probs.push(`${where}: unknown ability ${t.ab}`);
        for (const k of Object.keys(t)) if (!['id', 'name', 'ab', 'text', 'spec', 'cd', 'cast', 'specMods', 'grants'].includes(k)) probs.push(`${where}: unknown field "${k}"`);
        // a talent that grants a new move (grants: true): specs.js talentMoveFor finds it (TALENT_ABILITIES in kits.js, or a
        // kit's own talentAbilities) for the base kit and every spec. The move is whole on its own (id, name, desc, type,
        // effect, an icon to borrow), takes the slot of the talent's own ability (exactly one in every spec's kit), lands
        // there when the talent is held, and other clients can find it by id (abilityById: casts carry the move id)
        const moves = [null, ...specIds].map(s => ({ s, mv: talentMoveFor(c.id, s, t.id) }));
        const grant = moves.some(m => m.mv);
        if (t.grants && !grant) probs.push(`${where}: says grants but no move is registered for it`);
        if (!t.grants && grant) probs.push(`${where}: has a new move but no grants: true`);
        for (const { s, mv } of moves) {
          if (!t.grants) break;
          const w = where + (s ? ' (' + s + ')' : '');
          if (!mv) { if (!(s && TALENT_ABILITIES[t.id] && TALENT_ABILITIES[t.id].spec && TALENT_ABILITIES[t.id].spec[s] === null)) probs.push(w + ': no move'); continue; }   // (a spec entry of null: the talent works another way in that spec)
          if (mv.replaces !== t.ab) probs.push(w + ': its move replaces ' + mv.replaces + ', not ' + t.ab);
          for (const fl of ['id', 'name', 'desc', 'type', 'icon']) if (!mv[fl]) probs.push(w + ': its move has no ' + fl);
          if (typeof mv.effect !== 'function') probs.push(w + ': its move has no effect');
          if (KITS[c.id].abilities.some(x => x.id === mv.id)) probs.push(w + ': its move reuses the id ' + mv.id);
          const slots = kitFor(c.id, s).abilities.filter(x => (x.replaces || x.id) === t.ab);
          if (slots.length !== 1) probs.push(w + ': the kit has ' + slots.length + ' slots for ' + t.ab);
          const held = kitFor(c.id, s, new Set([t.id])).abilities.filter(x => x.id === mv.id);
          if (held.length !== 1 || held[0].fromTalent !== t.id) probs.push(w + ': holding it should put ' + mv.id + ' on exactly one button');
          const found = abilityById(c.id, s, mv.id);
          if (!found || found.name !== mv.name) probs.push(w + ': other players can\'t find ' + mv.id + ' by its id');
        }
        if (grant) used.add(t.id);
        for (const s of Object.keys(t.spec || {})) if (!specIds.includes(s)) probs.push(`${where}: text for unknown spec ${s}`);
        for (const [s, m] of Object.entries(t.specMods || {})) {
          if (!specIds.includes(s)) probs.push(`${where}: specMods for unknown spec ${s}`);
          for (const k of Object.keys(m)) if (!['cd', 'cast'].includes(k)) probs.push(`${where}: specMods field "${k}"`);
        }
        if (!used.has(t.id) && t.cd == null && t.cast == null) probs.push(`${where}: does nothing (no k.talent('${t.id}') in the kits, no cd/cast, no new move)`);

      }
    });
    // the spec rows VI-VII (SPEC_TALENTS): per spec, two rows of two; same fields, ids and links as rows I-V; a grant's
    // move is checked in its own spec (the only one that can hold it)
    const specRows = SPEC_TALENTS[c.id] || {};
    for (const [s, srows] of Object.entries(specRows)) {
      if (!specIds.includes(s)) { probs.push(`${c.id}: spec rows for unknown spec ${s}`); continue; }
      if (!Array.isArray(srows) || srows.length !== 2) { probs.push(`${c.id}:${s}: ${srows ? srows.length : 0} spec rows (want 2)`); continue; }
      srows.forEach((row, r) => {
        if (row.length !== 2) probs.push(`${c.id}:${s} row ${r + 6}: ${row.length} talents (want 2)`);
        for (const t of row) {
          const where = `${c.id}:${s} ${t.id}`;
          if (ids.has(t.id)) probs.push(`${where}: duplicate id`); ids.add(t.id);
          if (!t.id.startsWith(c.id + '_')) probs.push(`${where}: id should start with ${c.id}_`);
          if (!t.name || !t.text) probs.push(`${where}: needs a name and text`);
          if (!KITS[c.id].abilities.some(a => a.id === t.ab)) probs.push(`${where}: unknown ability ${t.ab}`);
          for (const k of Object.keys(t)) if (!['id', 'name', 'ab', 'text', 'cd', 'cast', 'grants'].includes(k)) probs.push(`${where}: unknown field "${k}"`);
          const mv = talentMoveFor(c.id, s, t.id);
          if (t.grants && !mv) probs.push(`${where}: says grants but no move is registered for it`);
          if (!t.grants && mv) probs.push(`${where}: has a new move but no grants: true`);
          if (t.grants && mv) {
            if (mv.replaces !== t.ab) probs.push(`${where}: its move replaces ${mv.replaces}, not ${t.ab}`);
            for (const fl of ['id', 'name', 'desc', 'type', 'icon']) if (!mv[fl]) probs.push(`${where}: its move has no ${fl}`);
            if (typeof mv.effect !== 'function') probs.push(`${where}: its move has no effect`);
            const held = kitFor(c.id, s, new Set([t.id])).abilities.filter(x => x.id === mv.id);
            if (held.length !== 1 || held[0].fromTalent !== t.id) probs.push(`${where}: holding it should put ${mv.id} on exactly one button`);
            const found = abilityById(c.id, s, mv.id);
            if (!found || found.name !== mv.name) probs.push(`${where}: other players cannot find ${mv.id} by its id`);
            for (const r2 of [2, 4]) for (const o of rows[r2]) { const om = o.grants && talentMoveFor(c.id, s, o.id); if (om && om.replaces === mv.replaces) probs.push(`${where}: grants into the same slot as ${o.id}`); }
            used.add(t.id);
          }
          if (!used.has(t.id) && t.cd == null && t.cast == null) probs.push(`${where}: does nothing (no k.talent('${t.id}') in the kits, no cd/cast, no new move)`);
          if (!TALENT_BY_ID[t.id] || TALENT_BY_ID[t.id].spec !== s) probs.push(`${where}: TALENT_BY_ID does not know its spec`);
        }
      });
    }
    // the talent rule (2026-10, talents.js): at most one plain number, and a new move in row III and in row V
    {
      const plain = rows.flat().filter(t => t.cd || t.cast).length;
      if (plain > 1) probs.push(`${c.id}: ${plain} plain-number talents (at most 1)`);
      for (const [s, srows] of Object.entries(specRows)) { const n = plain + (srows || []).flat().filter(t => t.cd || t.cast).length; if (n > 1) probs.push(`${c.id}:${s}: ${n} plain-number talents with the spec rows (at most 1)`); }
      for (const r of [2, 4]) if (!rows[r].some(t => t.grants)) probs.push(`${c.id} row ${r + 1}: no talent grants a new move`);
    }
  }
  for (const id of used) if (!TALENT_BY_ID[id]) probs.push(`k.talent('${id}') in the kits has no talent in talents.js`);
  // without talents a kit plays exactly as before: the class balance check below compares base kits with the baseline
  if (probs.length) fail('Talents line up with the kits', probs.join('\n'));
  else pass('Talents line up with the kits', `${ids.size} talents (${Object.values(SPEC_TALENTS).reduce((a, x) => a + Object.values(x).flat(2).length, 0)} in spec rows), ${used.size} read by the kits`);
}

// ---------------------------------------------------------------- 3 + 4. the pool every child process goes through
const POOL = Math.max(2, +process.env.CHECK_JOBS || os.cpus().length - 1);   // children at a time (this process only waits on them); CHECK_JOBS=n overrides
const START = Date.now(), JOBS = [], waiting = [], live = new Set();
process.on('exit', () => { for (const c of live) c.kill(); });   // (a check that is stopped doesn't leave its children running)
let active = 0, pumping = false;
// run(args, { group, weight }): `node <args>` in a child; resolves { code, out } (stdout, then stderr) when it closes. Waiting jobs
// start longest first (weight is a rough number of seconds), so the last ones to run are the short ones
function run(args, opts = {}) {
  return new Promise(resolve => {
    waiting.push(Object.assign({ args, resolve }, opts));
    if (!pumping) { pumping = true; setImmediate(pump); }   // (lets the caller queue its whole batch first, so the order holds)
  });
}
function pump() {
  pumping = false;
  waiting.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  while (active < POOL && waiting.length) {
    const j = waiting.shift(), start = Date.now();
    let so = '', se = '', done = false;
    active++;
    const p = spawn(process.execPath, j.args, { cwd: ROOT });
    live.add(p);
    const finish = (code, extra = '') => { if (done) return; done = true; active--; live.delete(p); JOBS.push({ group: j.group, start, end: Date.now() }); j.resolve({ code, out: so + se + extra }); pump(); };
    p.stdout.on('data', d => { so += d; }); p.stderr.on('data', d => { se += d; });
    p.on('error', e => finish(-1, String(e)));
    p.on('close', code => finish(code));
  }
}

// ---------------------------------------------------------------- 3. choreographed timelines
// Bosses rebuilt as one authored, non-looping fight (f.course in fight.js). The script is played with a party that
// can't die and doesn't fight; whenever a course's sets run out the boss drops to that course's gate, so the run shows
// the whole script at the pace a good party sees it. Checked on Normal and Hard:
//   no f.loop and no hidden telegraph in the source; every step that does something has a name; nothing avoidable
//   shows for less than WARN_MIN s; the gap between named steps stays under GAP_MAX s; a raidwide at least every
//   RAID_MAX s and a tankbuster every BUSTER_MAX s; the upcoming-moves feed always shows three steps; and the script
//   from the pull to the end of its last set lasts LEN_MIN..LEN_MAX s.
const CHOREO = [['Grubnak', 'grubnak', 'GRUBNAK'], ['Skitterra', 'skitterra', 'SKITTERRA'], ['Volkar', 'volkar', 'VOLKAR'], ['The Hollow King', 'hollowking', 'HOLLOWKING'], ['Vhalgrath', 'wyrm', 'WYRM'], ['Hrimgar', 'titan', 'TITAN']];
CHOREO.push(['The Hydra', 'hydra', 'HYDRA']);
CHOREO.push(['Azerath', 'archmage', 'AZERATH']);
CHOREO.push(['Corvane', 'corvane', 'CORVANE']);
CHOREO.push(['Brannoc', 'brannoc', 'BRANNOC']);
CHOREO.push(['Morrow-Oak', 'morrowoak', 'MORROWOAK']);
CHOREO.push(['Caelum Vey', 'caelum', 'CAELUM']);
const TL = { WARN_MIN: 1.2, GAP_MAX: 16, RAID_MAX: 150, BUSTER_MAX: 180, LEN_MIN: 480, LEN_MAX: 600 };
function timelines() {
  const load = p => require(path.join(ROOT, 'client/js', p));
  Object.assign(global, load('combat/actor.js'), load('arena/fight.js'));
  for (const [boss, id, sym] of CHOREO) {
    const file = path.join(ROOT, 'client/js/arena/bosses', id + '.js'), src = fs.readFileSync(file, 'utf8'), probs = [], notes = [];
    const code = src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    if (/f\.loop\(/.test(code)) probs.push('still uses f.loop');
    for (const l of code.split('\n')) if (/hidden:/.test(l) && !/raidwide/.test(l)) probs.push(`hidden telegraph: ${l.trim().slice(0, 90)}`);
    const def = load(`arena/bosses/${id}.js`)[sym];
    for (const mode of ['normal', 'hard']) {
      const players = [['tank', 0, 120], ['healer', -200, 200], ['dps', 200, 200], ['dps', 0, 260]].map(([role, x, y], i) => ({ id: i + 1, name: role + i, role, cls: 'x', x, y, a: 0 }));
      const sim = new FightSim(def, mode, () => players, () => {}, 4242);
      for (const s of sim.ps.values()) { s.hp = s.maxHp = 1e12; }
      sim.cleanRun = true;   // (the dummies stand still and take every hit: a script that answers mistakes, like Corvane's Whetstone, plays as for a clean party)
      const named = [], raid = [], buster = [];
      let short = 0, lastCourse = null;
      // every course: its steps must all have names
      const course = sim.course.bind(sim);
      sim.course = (o, from) => {
        for (const st of [...o.sets.flat(), ...(o.closing || [])]) if (st && st[1] && !st[2]) probs.push(`${mode}: an unnamed step`);
        const cur = course(o, from); lastCourse = cur; return cur;
      };
      sim.emit = msg => {
        if (msg.t === 'tg') {
          if (msg.hidden && msg.type !== 'raidwide') probs.push(`${mode}: hidden ${msg.tag} at ${sim.t.toFixed(0)}s`);
          if (msg.type !== 'raidwide' && msg.dur < TL.WARN_MIN - 1e-6 && msg.tag !== 'cleaverback') probs.push(`${mode}: ${msg.tag} shows for only ${msg.dur.toFixed(2)} s at ${sim.t.toFixed(0)}s`);
          if (msg.type === 'raidwide') raid.push(sim.t + msg.dur);
          if (msg.type === 'buster') buster.push(sim.t + msg.dur);
        }
      };
      const fire = [];   // named steps as they happen
      const step = sim.at.bind(sim);
      sim.at = (t, fn, name) => step(t, name ? () => { fire.push([sim.t, name]); fn(); } : fn, name);
      const keep = sim.atKeep.bind(sim);   // (named steps laid with afterKeep, like a wall's mechanic, count too)
      sim.atKeep = (t, fn, name) => keep(t, name ? () => { fire.push([sim.t, name]); fn(); } : fn, name);
      let end = null;
      for (let i = 0; i < 20 * 1200 && sim.state !== 'clear'; i++) {
        sim.tick(0.05);
        if (sim.state !== 'live') { if (sim.state !== 'countdown') break; continue; }
        if (sim.upcoming(3).length < 3) short++;
        const c = sim.curCourse;
        // the course's sets are done: a good party is at its gate now
        if (c && c.o.until != null && !c.done && sim.t >= c.end) sim.boss.hp = Math.min(sim.boss.hp, sim.boss.maxHp * c.o.until - 1);
        if (c && c.o.until == null && !c.o.next && sim.t >= c.end && end == null) end = sim.t;
        if (end != null && sim.t > end + 1) break;
      }
      for (let i = 1; i < fire.length; i++) if (fire[i][0] - fire[i - 1][0] > TL.GAP_MAX && (end == null || fire[i][0] < end)) probs.push(`${mode}: ${(fire[i][0] - fire[i - 1][0]).toFixed(0)} s with nothing named before ${fire[i][1]} at ${fire[i][0].toFixed(0)}s`);
      const gaps = (list, max, what) => { for (let i = 1; i < list.length; i++) if (list[i] - list[i - 1] > max) probs.push(`${mode}: ${(list[i] - list[i - 1]).toFixed(0)} s between ${what}s (${list[i - 1].toFixed(0)}s to ${list[i].toFixed(0)}s)`); };
      gaps(raid.filter(t => end == null || t <= end + 10), TL.RAID_MAX, 'raidwide');
      gaps(buster.filter(t => end == null || t <= end), TL.BUSTER_MAX, 'tankbuster');
      if (short) probs.push(`${mode}: the upcoming-moves feed showed fewer than three steps for ${(short * 0.05).toFixed(1)} s`);
      if (end == null) probs.push(`${mode}: the script never reached the end of its last set`);
      else if (end < TL.LEN_MIN || end > TL.LEN_MAX) probs.push(`${mode}: the script lasts ${end.toFixed(0)} s (want ${TL.LEN_MIN}-${TL.LEN_MAX})`);
      else notes.push(`${mode} ${Math.floor(end / 60)}:${String(Math.round(end % 60)).padStart(2, '0')}`);
      void lastCourse;
    }
    if (probs.length) fail(`${boss}'s timeline`, [...new Set(probs)].slice(0, 14).join('\n'));
    else pass(`${boss}'s timeline`, `no loops, nothing hidden, all named, cadence and feed OK; scripted ${notes.join(', ')}`);
  }
}

// ---------------------------------------------------------------- 3b. the Gloomsworn's Hollow (tools/hollow-test.js)
// A killing blow at full Gloom starts it, damage becomes debt, healing pays it (shields at half), an unpaid debt kills when the
// grace ends, doom / the enrage / a fall bypass it, a revive clears it; then healer bots have to save a Hollow tank.
function hollowCheck(r) {
  const out = r.out;
  if (r.code === 0 && /Hollow OK/.test(out)) pass('Hollow: debt, healing, death, bypasses', out.trim().split('\n').pop());
  else fail('Hollow: debt, healing, death, bypasses', out.slice(-900));
}

// ---------------------------------------------------------------- 3c. the Reaper's string, marks, Snap and Gate (tools/reaper-test.js)
function reaperCheck(r) {
  const out = r.out;
  if (r.code === 0 && /Reaper OK/.test(out)) pass('Reaper: string, finishers, marks, Snap, Void Star, Gate', out.trim().split(/\r?\n/).pop());
  else fail('Reaper: string, finishers, marks, Snap, Void Star, Gate', out.slice(-900));
}

// ---------------------------------------------------------------- 3f. the Kenseier's deflect and the boss's Posture (tools/kenseier-test.js)
// A press either side of a blow is judged Perfect or Good (and a late one gives the blow back), Mikiri Step, reach, Off-balance,
// Posture to a Break (stagger, damage window, the script slid, held through a cast), Ember Duel, shields; then the kit and host together.
function kenseierCheck(r) {
  const out = r.out;
  if (r.code === 0 && /Kenseier OK/.test(out)) pass('Kenseier: deflect timing, Posture, Break, bypasses', out.trim().split(/\r?\n/).pop());
  else fail('Kenseier: deflect timing, Posture, Break, bypasses', out.slice(-900));
}

// ---------------------------------------------------------------- 3g. the Houndmaster's hounds (tools/houndmaster-test.js)
// The pair the hounds hold decides the finisher, free hounds drift and held ones do not, Hold and pounce, Call Off, Wild Hunt, a telegraph
// downing a hound (host and kit), the 'hounds' message, and a Houndmaster bot in a headless raid.
function houndmasterCheck(r) {
  const out = r.out;
  if (r.code === 0 && /Houndmaster OK/.test(out)) pass('Houndmaster: pairs, drift and hold, pounce, Call Off, Wild Hunt, the hounds on the host', out.trim().split(/\r?\n/).pop());
  else fail('Houndmaster: pairs, drift and hold, pounce, Call Off, Wild Hunt, the hounds on the host', out.slice(-900));
}

// ---------------------------------------------------------------- 3i. a dropped link: hold, rejoin, snapshot (tools/rejoin-test.js)
// net.js holds a dropped joiner's slot and takes the same player back; the host's stand-in bot and its snapshot of the fight hold for every boss.
function rejoinCheck(r) {
  const out = r.out;
  if (r.code === 0 && /Rejoin OK/.test(out)) pass('Rejoin: held slot, stand-in, snapshot', out.trim().split(/\r?\n/).pop());
  else fail('Rejoin: held slot, stand-in, snapshot', out.slice(-900));
}

// ---------------------------------------------------------------- 3j. the Practice Hall's aids (tools/practice-test.js)
// Enrage off, can't-die (falls counted), the loop's phase test, slow time's client clock, the request checks and the Logbook's Bests.
function practiceCheck(r) {
  const out = r.out;
  const name = "Practice Hall: enrage off, can't-die, loop, slow time, requests, Bests";
  if (r.code === 0 && /Practice OK/.test(out)) pass(name, out.trim().split(/\r?\n/).pop());
  else fail(name, out.slice(-900));
}

// ---------------------------------------------------------------- 3j2. the buffs on the party frames (tools/party-buffs-test.js)
// A hero's frame shows what that hero's own buff row shows (ids, order, stacks, timers, tooltips): people over the net, bots from the host; a rejoiner is restored; the message rate stays modest.
function partyBuffsCheck(r) {
  const out = r.out;
  const name = 'Party frame buffs: match the own buff row, people and bots, rejoin, message rate';
  if (r.code === 0 && /Party buffs OK/.test(out)) pass(name, out.trim().split(/\r?\n/).pop());
  else fail(name, out.slice(-900));
}

// ---------------------------------------------------------------- 3h. cache-busting stamps (tools/stamp.js)
// Every local script and stylesheet in client/index.html carries ?v=<hash of the file>, so a deploy never mixes fresh files
// with cached ones. The check brings the stamps up to date itself (index.html then goes in with the commit) and fails only
// when index.html names a file that does not exist.
function stampCheck() {
  const { stamp } = require('./stamp.js');
  const { n, stale, missing } = stamp(true);
  if (missing.length) fail('index.html stamps: every script and stylesheet exists', missing.join(', '));
  else pass('index.html stamps: every script and stylesheet exists', `${n} files` + (stale.length ? `, restamped ${stale.length}: ${stale.slice(0, 6).join(', ')}${stale.length > 6 ? ' ...' : ''}` : ', all current'));
}

// ---------------------------------------------------------------- 3e. the PvP Arena (tools/pvp-sim.js)
// A few bot duels, a 2v2 and a capture the flag: every match ends (a knockout, captures or the clock) without errors, never
// in a blink, never past the clock.
function pvpCheck(rs) {   // (one child per entry of PVP_RUNS)
  const bad = [], lens = [];
  for (const [i, a] of PVP_RUNS.entries()) {
    const r = rs[i];
    const out = r.out, ms = [...out.matchAll(/^run \d+: (\w+) .*? at ([\d.]+)s/gm)];
    if (r.code !== 0 || ms.length !== +a[1]) { bad.push(`${a.join(' ')}:\n${out.slice(-600)}`); continue; }
    const ctf = a[0] === 'ctf';
    for (const m of ms) { lens.push(+m[2]); if (!(ctf ? /^(caps|time)$/ : /^(ko|time)$/).test(m[1]) || +m[2] < 10 || +m[2] > (ctf ? 370 : 200)) bad.push(`${a.join(' ')}: ${m[0]}`); }
  }
  if (bad.length) fail('PvP Arena: matches finish cleanly', bad.join('\n'));
  else pass('PvP Arena: matches finish cleanly', `${lens.length} matches, ${Math.min(...lens)}-${Math.max(...lens)}s`);
}

// ---------------------------------------------------------------- 3d. the boss journals (tools/journal-lint.js)
function journalCheck(r) {
  const out = r.out;
  if (r.code === 0 && /journal-lint: clean/.test(out)) pass('Journals: no digits, within the word cap, every move is a real cast', out.trim().split(/\r?\n/).pop());
  else fail('Journals: no digits, within the word cap, every move is a real cast', out.slice(-900));
}

function foundingWildCheck(r) {
  const name = 'The Founding: wild camps wake, leash, respawn and pay';
  if (r.code === 0 && /Wild OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

function foundingItemsCheck(r) {
  const name = 'The Founding: items and their passives';
  if (r.code === 0 && /Items OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

function foundingChainCheck(r) {
  const name = 'The Founding: the hidden chain wakes, pays and ends';
  if (r.code === 0 && /Chain OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

function foundingDefenceCheck(r) {
  const name = 'The Founding: towers and soldiers';
  if (r.code === 0 && /Defence OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

function foundingTrialsCheck(r) {
  const name = 'The Founding: the Trials, the book and the feats';
  if (r.code === 0 && /Trials OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

function foundingWorldCheck(r) {
  const name = 'The Founding: items on the ground and the waystones';
  if (r.code === 0 && /World OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

function foundingIntroCheck(r) {
  const name = 'The Founding: the opening scene and its skip vote';
  if (r.code === 0 && /Intro OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

function foundingQuestsCheck(r) {
  const name = 'The Founding: the later quests and their boons';
  if (r.code === 0 && /Quests OK/.test(r.out)) pass(name, ''); else fail(name, r.out.slice(-900));
}

// ---------------------------------------------------------------- 3j. The Founding: Day one played headless (tools/founding-test.js)
function foundingCheck(r) {
  const out = r.out;
  const name = 'The Founding: Day one plays through, quests done and missed, forge, boons and payout';
  if (r.code === 0 && /Founding OK/.test(out)) pass(name, out.trim().split(/\r?\n/).filter(l => /wins:/.test(l)).pop() || '');
  else fail(name, out.slice(-900));
}

// ---------------------------------------------------------------- 3e. feats and titles (tools/feats-test.js)
function featsCheck(r) {
  const out = r.out;
  if (r.code === 0 && /Feats OK/.test(out)) pass('Feats: data sound, party and result rules, earning and titles', out.trim().split(/\r?\n/).pop());
  else fail('Feats: data sound, party and result rules, earning and titles', out.slice(-900));
}

function hardPlusCheck(r) {
  const out = r.out;
  if (r.code === 0 && /Hard\+ OK/.test(out)) pass('Hard+: each modifier does what it says', out.trim().split(/\r?\n/).pop());
  else fail('Hard+: each modifier does what it says', out.slice(-900));
}

// ---------------------------------------------------------------- 5. the runs: everything goes into one pool
// Every heavy piece of work (bot raids, the balance sim, talents, the test scripts) is a child process in one pool of POOL at a time, the
// longest first, so the machine stays full from the first second to the last. A long job is cut into pieces that play exactly what
// the whole job would (same seeds, same runs per item) and their output is joined, so the verdicts below read the same lines.
const SIM_PARTS = 4;    // tools/simulate.js --part=i/n
const RAID_CHUNK = 5;   // a bot raid of more runs than this goes out in pieces of this many (bot-raid.js first=K)
const joinOut = rs => ({ code: rs.find(r => r.code !== 0) ? rs.find(r => r.code !== 0).code : 0, out: rs.map(r => r.out).join('') });
// the pieces of one raid: their "cleared a of b" lines add up to one
function joinRaid(rs) {
  if (rs.length === 1) return rs[0];
  const sum = [0, 0];
  const out = rs.map(r => r.out.replace(/^cleared (\d+) of (\d+)\r?\n?/m, (m, a, b) => { sum[0] += +a; sum[1] += +b; return ''; })).join('');
  return { code: joinOut(rs).code, out: out + `cleared ${sum[0]} of ${sum[1]}\n` };
}
// early = a line-up that only needs one clear (the "Bots clear" lines): its pieces go out one after another, each with bot-raid.js
// stop=clear, and the rest are never started once one has cleared. Different line-ups still run side by side in the pool. Only this final
// check does that; bot-raid.js on its own plays every run.
const raidJob = (mode, runs, boss, comp, extra, group, early) => {
  const bot = path.join(__dirname, 'bot-raid.js'), pieces = [];
  const job = first => { const n = Math.min(RAID_CHUNK, runs - first); return run([bot, mode, String(n), boss, ...(comp ? [comp] : []), ...extra, ...(early ? ['stop=clear'] : []), ...(first ? ['first=' + first] : [])], { group, weight: n * 3 }); };
  if (early) return (async () => {
    const rs = [];
    for (let first = 0; first < runs; first += RAID_CHUNK) {
      const r = await job(first);
      rs.push(r);
      if (r.code === 0 && /^run \d+: clear /m.test(r.out)) break;
    }
    return joinRaid(rs);
  })();
  for (let first = 0; first < runs; first += RAID_CHUNK) pieces.push(job(first));
  return Promise.all(pieces).then(joinRaid);
};

// the test scripts that print a marker line when they are happy: [bucket, script, how the verdict reads it, name if it crashes, weight]
const TESTS = [
  ['hollow', 'hollow-test.js', hollowCheck, 'Hollow checked', 2],
  ['kenseier', 'kenseier-test.js', kenseierCheck, 'Kenseier checked', 2],
  ['houndmaster', 'houndmaster-test.js', houndmasterCheck, 'Houndmaster checked', 4],
  ['rejoin', 'rejoin-test.js', rejoinCheck, 'Rejoin checked', 14],
  ['journal', 'journal-lint.js', journalCheck, 'Journals checked', 1],
  ['reaper', 'reaper-test.js', reaperCheck, 'Reaper checked', 2],
  ['feats', 'feats-test.js', featsCheck, 'Feats checked', 1],
  ['feats', 'hardplus-test.js', hardPlusCheck, 'Hard+ checked', 2],
  ['practice', 'practice-test.js', practiceCheck, 'Practice checked', 6],
  ['practice', 'party-buffs-test.js', partyBuffsCheck, 'Party frame buffs checked', 3],
  ['founding', 'founding-test.js', foundingCheck, 'Founding checked', 4],
  ['founding', 'founding-quests-test.js', foundingQuestsCheck, 'Quests checked', 1],
  ['founding', 'founding-trials-test.js', foundingTrialsCheck, 'Trials checked', 1],
  ['founding', 'founding-defence-test.js', foundingDefenceCheck, 'Defence checked', 1],
  ['founding', 'founding-wild-test.js', foundingWildCheck, 'Wild checked', 1],
  ['founding', 'founding-items-test.js', foundingItemsCheck, 'Items checked', 1],
  ['founding', 'founding-chain-test.js', foundingChainCheck, 'Chain checked', 1],
  ['founding', 'founding-world-test.js', foundingWorldCheck, 'World checked', 1],
  ['founding', 'founding-intro-test.js', foundingIntroCheck, 'Intro checked', 1],
];
const PVP_RUNS = [['duel', '3', 'ranger', 'bastion'], ['duel', '2', 'cleric', 'shadowblade'], ['team', '2', 'bastion', 'pyromancer', 'gorgemaw', 'cleric'], ['ctf', '2', 'bastion', 'ranger', 'gorgemaw', 'cleric']];

// hands a finished child's verdict to the right bucket; a verdict that throws is a failure, as it always was
const settle = (bucket, crashed, rs, verdict) => stage(bucket, () => { try { verdict(rs); } catch (e) { fail(crashed, e.stack); } });

async function heavy() {
  const { SPECS, specOf } = require(path.join(ROOT, 'client/js', 'combat/specs.js'));
  const { TALENTS } = require(path.join(ROOT, 'client/js', 'combat/talents.js'));
  const trialIds = Object.values(SPECS).flat().map(s => s.id);
  const [sim, tal, ...raids] = await Promise.all([
    Promise.all(Array.from({ length: SIM_PARTS }, (_, i) => run([path.join(__dirname, 'simulate.js'), `--part=${i}/${SIM_PARTS}`], { group: 'balance sim', weight: 4 }))).then(joinOut),
    Promise.all(Object.keys(TALENTS).map(cls => run([path.join(__dirname, 'talents.js'), cls], { group: 'talents', weight: 6 }))).then(joinOut),
    ...RAIDS.map(([, boss, ...rest]) => raidJob('normal', +((rest.find(a => /^runs=/.test(a)) || '').slice(5) || RAID_RUNS), boss, rest.filter(a => !/^(gear|runs|phase|until)=/.test(a)).join(','), rest.filter(a => /^(gear|phase|until)=/.test(a)), 'bot raids', true)),
    ...trialIds.map(id => raidJob('normal', 2, 'trial:' + id, '', [], 'spec trials')),
    ...HARD_BOSSES.map(([, boss, gear]) => raidJob('hard', 3, boss, HARD_COMP, gear ? [gear] : [], 'hard smoke')),
    raidJob('hard', 1, 'grubnak', HARD_COMP, ['mods=all'], 'hard smoke'),   // (Hard+: every modifier on, one run; client/js/hardplus.js)
  ]);
  const hards = raids.splice(RAIDS.length + trialIds.length);
  const trials = raids.splice(RAIDS.length);
  stage('heavy', () => verdicts(sim, tal, raids, trials, hards, trialIds, specOf));
}

function verdicts(sim, tal, raids, trials, hards, trialIds, specOf) {
  // balance: each class's pro DPS against the baseline
  const now = {};
  for (const line of sim.out.split('\n')) { const m = line.match(/^(\w+)\s+(\d+)\s+(\d+)\s+(\d+)%/); if (m) now[m[1]] = { newbie: +m[2], pro: +m[3] }; }
  if (sim.code !== 0 || !Object.keys(now).length) fail('Class balance', 'the simulator failed:\n' + sim.out.slice(-800));
  else if (UPDATE || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify(now, null, 2) + '\n');
    pass('Class balance', `baseline recorded for ${Object.keys(now).length} classes`);
  } else {
    const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), drift = [];
    for (const [c, b] of Object.entries(base)) {
      const n = now[c];
      if (!n) { drift.push(`${c}: missing from the simulator`); continue; }
      const d = (n.pro - b.pro) / b.pro;
      if (Math.abs(d) > DPS_TOLERANCE) drift.push(`${c}: pro DPS ${b.pro} -> ${n.pro} (${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}%)`);
      if (n.newbie > n.pro) drift.push(`${c}: a newbie out-damages a pro (${n.newbie} vs ${n.pro})`);
    }
    if (drift.length) fail('Class balance', drift.join('\n') + '\n(if that change was intended: node tools/check.js --update-baseline)');
    else pass('Class balance', `all ${Object.keys(base).length} classes within ${DPS_TOLERANCE * 100}% of the baseline`);
  }

  // specializations: each spec's pro DPS stays close to its own base class (same simulator run)
  const specRows = [];
  for (const line of sim.out.split('\n')) { const m = line.match(/^(\w+):(\w+)\s+(\d+)\s+(\d+)/); if (m) specRows.push({ c: m[1], s: m[2], pro: +m[4] }); }
  if (specRows.length) {
    // a spec can aim off its class on purpose (a damage-leaning healer): spec.balance is the share it aims for
    const want = r => now[r.c].pro * ((specOf(r.c, r.s) || {}).balance || 1);
    const off = specRows.filter(r => now[r.c] && Math.abs(r.pro - want(r)) / want(r) > SPEC_TOLERANCE)
      .map(r => `${r.c}:${r.s}: pro DPS ${r.pro} vs ${Math.round(want(r))} aimed for`);
    if (off.length) fail('Specializations balanced', off.join('\n'));
    else pass('Specializations balanced', `${specRows.length} specs within ${SPEC_TOLERANCE * 100}% of their class`);
  }

  // talents: every talent and full build plays through the sim (tools/talents.js). No power cap: the designer lifts weak
  // talents and leaves strong ones alone (2026-10-27), so this only reports the strongest
  const talRows = tal.out.split('\n').map(l => l.match(/^TALENT (\S+) (\w+) (-?[\d.]+)/)).filter(Boolean);
  const buildRows = tal.out.split('\n').map(l => l.match(/^BUILD (\S+) (\d+) (\d+) (-?[\d.]+)/)).filter(Boolean);
  const allRows = tal.out.split('\n').map(l => l.match(/^BUILDALL (\S+) (\d+) (\d+) (-?[\d.]+)/)).filter(Boolean);   // (with the spec rows VI-VII)
  if (tal.code !== 0 || !talRows.length || !buildRows.length) fail('Talents play', 'tools/talents.js failed:\n' + tal.out.slice(-800));
  else {
    const top = Math.max(...buildRows.map(m => +m[4])), one = Math.max(...talRows.map(m => +m[3]));
    // a loose tripwire, not a cap: about twice the dummy's highest readings so far (+39% single, +115% build with spec rows,
    // 2026-10-28; a healer's damage is a small base, so its percentages run high), past which it is almost surely a bug (a
    // missed cooldown, a doubled hit), not a strong pick
    const wild = [...talRows.filter(m => +m[3] > 80).map(m => `${m[1]} ${m[2]} +${(+m[3]).toFixed(1)}%`), ...buildRows.filter(m => +m[4] > 160).map(m => `build ${m[1]} ${m[2]}/${m[3]} +${(+m[4]).toFixed(1)}%`)];
    if (wild.length) fail('Talents play', 'runaway talents (single over +80%, build over +160%: look for a bug first):\n' + wild.join('\n'));
    else pass('Talents play', `${talRows.length} talent runs, strongest single +${one.toFixed(1)}%; best full build +${top.toFixed(1)}%${allRows.length ? `, with spec rows +${Math.max(...allRows.map(m => +m[4])).toFixed(1)}%` : ''}`);
  }

  // bot raids: a bot party clears each boss on Normal at least once in RAID_RUNS (it stops at the first clear; a fail has played them all)
  RAIDS.forEach(([boss, , ...rest], i) => {
    const comp = rest.filter(a => !/^(gear|runs|phase|until)=/.test(a)), gear = rest.find(a => /^gear=/.test(a));
    const r = raids[i], m = r.out.match(/cleared (\d+) of (\d+)/), name = `Bots clear ${boss} (Normal, ${comp.join(' ')}${gear ? ', ' + gear : ''})`;
    const won = r.out.match(/^run (\d+): clear /m);   // (the pool stops a line-up at its first clear: raidJob early)
    if (r.code === 0 && m && +m[1] >= 1) pass(name, won ? `cleared on run ${won[1]}` : `${m[1]} of ${m[2]}`);
    else fail(name, m ? `${m[1]} of ${m[2]}\n` + r.out.split('\n').filter(l => /^run /.test(l)).join('\n') : r.out.slice(-800));
  });

  // Hard smoke: each boss's Hard script runs without errors and the bots last at least HARD_MIN seconds
  HARD_BOSSES.forEach(([boss], i) => {
    // the longest of the runs (a bot party wipes early now and then; one early wipe isn't a broken script)
    const r = hards[i], name = `${boss} Hard runs clean${HARD_BOSSES[i][2] ? ' (' + HARD_BOSSES[i][2] + ')' : ''}`;
    const m = [...r.out.matchAll(/^run \d+: (\w+) at (\d+)s/gm)].sort((a, b) => b[2] - a[2])[0];
    if (r.code === 0 && m && +m[2] >= HARD_MIN) pass(name, `${m[1]} at ${m[2]}s`);
    else fail(name, m ? `${m[1]} at ${m[2]}s (want ${HARD_MIN}s or more)` : r.out.slice(-800));
  });

  // Hard+ smoke: one Hard pull with all seven modifiers on runs to its end without a crash (bots are not expected to win it)
  {
    const r = hards[HARD_BOSSES.length], name = 'Hard+ (all modifiers) runs clean';
    const m = r.out.match(/^run \d+: (\w+) at (\d+)s/m);
    if (r.code === 0 && m && /Hard\+ heat 15/.test(r.out)) pass(name, `${m[1]} at ${m[2]}s`);
    else fail(name, r.out.slice(-800));
  }

  // spec trials: a bot playing the spec can pass each one (a bot isn't a careful player, so one clear of two is enough)
  const stuck = trialIds.filter((id, i) => { const m = trials[i].out.match(/cleared (\d+) of/); return trials[i].code !== 0 || !m || +m[1] < 1; });
  if (stuck.length) fail('Spec trials can be passed', stuck.map(id => `${id}: ${(trials[trialIds.indexOf(id)].out.split('\n').filter(l => /^run /.test(l)).join(' | ') || trials[trialIds.indexOf(id)].out.slice(-300))}`).join('\n'));
  else pass('Spec trials can be passed', `all ${trialIds.length}, by a bot playing the spec`);
}


// ---------------------------------------------------------------- 6. the docs-only lane
// The game and the tools never load anything under docs/, any *.md, or .claude/. After every full pass the check records a
// fingerprint of everything else (the name and content of each file in the working tree, tracked or not, committed or not) in the
// repository's shared git dir, so every worktree and every chat sees it. A run whose fingerprint was already passed has changed nothing
// the game or the tools can see, so it only runs the cheap checks (every script parses, the index.html stamps, the journals) and says
// so. Any other change, committed or not, makes a different fingerprint and gets the full run. `--full` always runs everything.
const git = (args, input) => { const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', input, maxBuffer: 1 << 28 }); return r.status === 0 ? r.stdout : null; };
const docsOnly = p => /^(docs|\.claude)\//.test(p) || /\.md$/i.test(p);
function snapshot() {   // Map: path -> content hash, for every file the game or the tools could load; null if git can't say
  const list = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.', ':(exclude)docs', ':(exclude).claude', ':(exclude)*.md']);
  if (list == null) return null;
  const files = [...new Set(list.split('\0').filter(Boolean))].filter(p => !docsOnly(p) && fs.existsSync(path.join(ROOT, p))).sort();
  const hashes = git(['hash-object', '--stdin-paths'], files.join('\n') + '\n');
  if (hashes == null) return null;
  const hs = hashes.split('\n');
  return new Map(files.map((p, i) => [p, hs[i]]));
}
const fingerprint = snap => crypto.createHash('sha1').update([...snap].map(([p, h]) => p + ' ' + h).join('\n')).digest('hex');
function markerFile() { const d = git(['rev-parse', '--git-common-dir']); return d ? path.join(path.resolve(ROOT, d.trim()), 'emberfall-check-passed') : null; }
function passedBefore(fp) {
  try { return fs.readFileSync(markerFile(), 'utf8').split('\n').some(l => l.split(' ')[0] === fp); } catch (e) { return false; }
}
function recordPass(fp) {
  const file = markerFile(); if (!file) return;
  let lines = []; try { lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l && l.split(' ')[0] !== fp); } catch (e) { /* first pass */ }
  const head = (git(['rev-parse', '--short', 'HEAD']) || '').trim();
  lines.push(`${fp} ${new Date().toISOString()} ${head}`);
  fs.writeFileSync(file, lines.slice(-20).join('\n') + '\n');
}
// the same files with the same content (--update-baseline rewrites the baseline file itself during the run: that one may differ)
function sameTree(a, b) {
  const skip = path.relative(ROOT, BASELINE).replace(/\\/g, '/');
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) if (a.get(k) !== b.get(k) && !(UPDATE && k === skip)) return false;
  return true;
}

// ---------------------------------------------------------------- 7. the timing summary
function timing(wall) {
  const groups = new Map();
  for (const j of JOBS) {
    const g = groups.get(j.group) || { n: 0, work: 0, longest: 0, end: 0 };
    const s = (j.end - j.start) / 1000;
    g.n++; g.work += s; g.longest = Math.max(g.longest, s); g.end = Math.max(g.end, (j.end - START) / 1000);
    groups.set(j.group, g);
  }
  console.log(`\nTiming: ${wall.toFixed(0)}s in all, up to ${POOL} children at a time (jobs / seconds of work / longest job / done at)`);
  for (const [name, g] of [...groups].sort((x, y) => y[1].work - x[1].work)) console.log(`  ${name.padEnd(14)} ${String(g.n).padStart(3)} jobs ${g.work.toFixed(0).padStart(5)}s work ${g.longest.toFixed(1).padStart(6)}s longest ${g.end.toFixed(0).padStart(5)}s`);
}

// ---------------------------------------------------------------- 8. go
async function main() {
  stage('stamps', () => { try { stampCheck(); } catch (e) { fail('Stamps checked', e.stack); } });   // (first: it may rewrite index.html, which the fingerprint then includes)
  const before = snapshot(), fp = before && fingerprint(before);
  const lane = !FULL && before && passedBefore(fp) ? 'docs' : 'full';
  if (lane === 'docs') console.log('Docs-only lane: nothing the game or the tools load has changed since the last full pass (node tools/check.js --full runs everything).');
  else if (!FULL && before) console.log('Full run: something the game or the tools load has changed since the last full pass.');
  const todo = [];
  // every script parses
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.js')) files.push(p); } };
  walk(path.join(ROOT, 'client', 'js')); walk(path.join(ROOT, 'tools')); walk(path.join(ROOT, 'server'));
  todo.push(Promise.all(files.map(f => run(['--check', f], { group: 'parse', weight: 0 }))).then(rs => stage('syntax', () => syntax(files, rs))));
  for (const [bucket, file, verdict, crashed, weight] of TESTS) {
    if (lane === 'docs' && bucket !== 'journal') continue;
    todo.push(run([path.join(__dirname, file)], { group: bucket, weight }).then(r => settle(bucket, crashed, r, verdict)));
  }
  if (lane === 'full') {
    todo.push(run([__filename, '--stage=core'], { group: 'core', weight: 8 }).then(r => stage('core', () => adopt(r))));
    todo.push(Promise.all(PVP_RUNS.map(a => run([path.join(__dirname, 'pvp-sim.js'), ...a], { group: 'pvp', weight: 2 }))).then(rs => settle('pvp', 'PvP checked', rs, pvpCheck)));
    todo.push(heavy());
  }
  await Promise.all(todo);

  console.log('');
  const all = BUCKETS.flatMap(b => buckets[b] || []);
  for (const r of all) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && r.ok ? `  (${r.detail})` : ''}`);
    if (!r.ok && r.detail) console.log(r.detail.split('\n').map(l => '      ' + l).join('\n'));
  }
  const bad = all.filter(r => !r.ok).length;
  const wall = (Date.now() - START) / 1000;
  timing(wall);
  if (!bad && lane === 'full' && before) {   // record the pass, unless a file changed while it ran
    const after = snapshot();
    if (after && sameTree(before, after)) recordPass(fingerprint(after));
    else console.log('\n(files changed while the check ran, so this pass is not recorded for the docs-only lane)');
  }
  console.log(`\n${bad ? `${bad} check${bad > 1 ? 's' : ''} failed` : `All checks passed${lane === 'docs' ? ' (docs-only)' : ''}`} in ${wall.toFixed(0)}s`);
  process.exit(bad ? 1 : 0);
}

// `--stage=core`: the checks that run in this process and share its globals (scoring, data, timelines), in a child of their own so
// the pool stays full while they run; the results go back as one line
function core() {
  try { scoring(); } catch (e) { fail('Contribution points score sensibly', e.stack); }
  try { data(); } catch (e) { fail('Data checks ran', e.stack); }
  try { timelines(); } catch (e) { fail('Timelines checked', e.stack); }
  console.log('@@RESULTS ' + JSON.stringify(results));
}
function adopt(r) {
  const line = r.out.split(/\r?\n/).filter(l => l.startsWith('@@RESULTS ')).pop();
  if (!line) fail('Data, scoring and timeline checks ran', r.out.slice(-900));
  else for (const x of JSON.parse(line.slice(10))) into.push(x);
}

if (STAGE === 'core') core();
else main().catch(e => { console.error(e); process.exit(2); });
