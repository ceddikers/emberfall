// Headless raid with a full bot party: checks the boss script, the kits and the bot AI together,
// and gives a rough idea of clear times and death counts.
// Human-like play (a measurement tool; off by default, so every other output is unchanged): HUMAN=dps|tank|healer|all|none (or a comma
//   list, e.g. dps,healer; default none) makes those roles play like a decent human instead of a perfect bot: reaction delay on new
//   telegraphs, the odd late or short dodge, no slidecasting, a staying put after a dodge, a little late on each GCD, the odd filler press
//   (bots.js BotHuman and HUMAN_DEFAULTS; HUMANP='{"react":[0.4,0.7]}' overrides single parameters). Also human=dps as an argument.
//   BREAKDOWN=1 prints, per player and run, where DPS is lost: seconds dead, alive but out of reach, moving, GCD-idle while in reach,
//   casts cancelled, avoidable hits, dps (a * marks a human-like bot), and at the end the mean over the runs.
//   node tools/bot-raid.js [normal|hard] [runs] [classes comma-separated] [boss id]
//   e.g. node tools/bot-raid.js normal 5 skitterra   (arguments can come in any order; the boss defaults to grubnak)
//   seed=N uses another set of seeds; first=K starts at run K (0-based) of the set, so first=5 with 5 runs plays what runs 6-10 of a
//   10-run job play (tools/check.js cuts long jobs into pieces that way); WHY=1 prints the last hits before each death, NEXT=1 the upcoming-moves feed,
//   TRACE=1 the boss's casts, walls, adds and props as they happen
//   gear=fresh|mid|full|post1|post2|post3|post4 (or GEAR=...) gives every bot representative player gear (see buildGear below); FEAST=pie|stew|broth|tarts
//   picks the meal for 'full', 'post1' and 'post2' (default pie, none at the other levels). SUMMARY=1 prints one machine-readable line only.
//   until=N (with phase=N) ends the run as a clear once the fight passes act N's gate, so check.js can play one act of the Sovereign.
//   phase=N starts at course (phase) N like a Practice Hall run (the boss starts at that act's health); the Sovereign has one per act.
//   stop=clear stops after the first clear (only tools/check.js passes it, for its final yes-or-no; for data, play every run): the runs
//   before it play exactly as without it, and the closing lines count the runs played.
const path = require('path');
const load = (p) => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
// bots hold talents, the strongest build for the rows a party has by the boss's set (combat/bot-builds.js); BOT_TALENTS=off plays base kits
Object.assign(global, load('combat/talents.js'), ...(process.env.BOT_TALENTS === 'off' ? [] : [load('combat/bot-builds.js')]));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'), load('hardplus.js'));   // (hardplus.js: the Hard+ modifiers, played with mods=all or MODS=shortfuse,heavyhands,... on a Hard run)
const { GRUBNAK } = load('arena/bosses/grubnak.js');
const { SKITTERRA } = load('arena/bosses/skitterra.js');
const { VOLKAR } = load('arena/bosses/volkar.js');
const { HOLLOWKING } = load('arena/bosses/hollowking.js');
const { WYRM } = load('arena/bosses/wyrm.js');
const { TITAN } = load('arena/bosses/titan.js');
const DEFS = { grubnak: GRUBNAK, skitterra: SKITTERRA, volkar: VOLKAR, hollowking: HOLLOWKING, wyrm: WYRM, titan: TITAN };
const { HYDRA } = load('arena/bosses/hydra.js');
DEFS.hydra = HYDRA;
const { AZERATH } = load('arena/bosses/archmage.js');
DEFS.archmage = AZERATH;
const { CORVANE } = load('arena/bosses/corvane.js');
DEFS.corvane = CORVANE;   // (set 3, Boss IX)
const { BRANNOC } = load('arena/bosses/brannoc.js');
DEFS.brannoc = BRANNOC;   // (set 3, Boss X)
const { MORROWOAK } = load('arena/bosses/morrowoak.js');
DEFS.morrowoak = MORROWOAK;   // (set 3, Boss XI)
const { CAELUM } = load('arena/bosses/caelum.js');
DEFS.caelum = CAELUM;   // (set 3, Boss XII, the finale)
const { SOVEREIGN } = load('arena/bosses/sovereign.js');
DEFS.sovereign = SOVEREIGN;   // (the Ultimate: not on the Raid Board; one difficulty, play it as normal)
const { TRIALS, trialDef } = load('arena/trials.js');

let gearLevel = process.env.GEAR || '', modsArg = process.env.MODS || '';
let humanWho = process.env.HUMAN || 'none';
const BREAKDOWN = !!process.env.BREAKDOWN;
let untilAct = 0, mode = 'normal', runs = 3, comp = 'bastion,cleric,ranger,pyromancer'.split(','), def = GRUBNAK, seed0 = 1000, first = 0, stopOnClear = false, practiceFrom = 0;
for (const a of process.argv.slice(2)) {
  if (a === 'normal' || a === 'hard') mode = a;
  else if (/^seed=\d+$/.test(a)) seed0 = Number(a.slice(5));   // a different set of seeds (default 1000)
  else if (/^first=\d+$/.test(a)) first = Number(a.slice(6));
  else if (a === 'stop=clear') stopOnClear = true;
  else if (/^phase=\d+$/.test(a)) practiceFrom = Number(a.slice(6));   // start at this course (act) number, as a practice run does (FightSim practiceFrom; the Sovereign's acts)
  else if (/^until=\d+$/.test(a)) untilAct = Number(a.slice(6));   // an act-by-act run (the Sovereign, with phase=N): the run ends, counted as a clear, when the fight passes act N's gate
  else if (/^gear=\w+$/.test(a)) gearLevel = a.slice(5);
  else if (/^human=[\w,]+$/.test(a)) humanWho = a.slice(6);
  else if (/^mods=[\w,]+$/.test(a)) modsArg = a.slice(5);   // Hard+ modifiers (hardplus.js ids or aliases, or 'all'); only a Hard run takes them
  else if (/^\d+$/.test(a)) runs = Number(a);
  else if (DEFS[a]) def = DEFS[a];
  // trial:<spec> runs that spec's trial, with a bot taking it (or 'trial:<spec>:base' to try it with the base kit)
  else if (/^trial:\w+/.test(a) && TRIALS[a.split(':')[1]]) { const T = TRIALS[a.split(':')[1]]; def = trialDef(T.spec); comp = [`${T.cls}:${a.split(':')[2] || T.spec}`, ...T.allies]; }
  else if (a.includes(',')) comp = a.split(',');
  else { console.error(`unknown argument: ${a} (bosses: ${Object.keys(DEFS).join(', ')})`); process.exit(1); }
}
// Player gear for the bots (levels, items and the three ways gear reaches a fight) lives in tools/lib/bot-gear.js, shared with tools/comp-sweep.js.
const { buildGear } = require('./lib/bot-gear.js');
const GEARSET = buildGear(gearLevel, comp);
const SUMMARY = !!process.env.SUMMARY;
const log = (...a) => { if (!SUMMARY) console.log(...a); };
if (GEARSET) {
  const orig = RaidHost.prototype.allPlayers;
  RaidHost.prototype.allPlayers = function () { return orig.call(this).map(p => (p.bot ? Object.assign(p, { gear: GEARSET.sets[p.id - 1000].host }) : p)); };
  log(`gear ${gearLevel}: bond ${JSON.stringify(GEARSET.bond.active.map(a => a.name + ' x' + a.n))}; ` + GEARSET.sets.map(g => `${g.cls} hp${g.host.hp} def${g.host.def} main+${(g.mods.power * 1000).toFixed(0)} crit${g.mods.crit} haste${g.mods.haste}`).join(' | '));
}
const MODSET = mode === 'hard' ? HARDPLUS.clean(modsArg) : {};
log(`${def.name}, ${mode}, ${comp.join('/')}`);
if (HARDPLUS.heat(MODSET)) log(`Hard+ heat ${HARDPLUS.heat(MODSET)}: ${HARDPLUS.ids(MODSET).join(', ')}`);

let clears = 0, totDeaths = 0, totClearT = 0;
const bdTot = {};   // BREAKDOWN=1: the sums over the runs, per player
const hollowTot = { started: 0, saved: 0, failed: 0 };   // a Gloomsworn's Hollow (fight.js HOLLOW_HOST), over every run
for (let r = first; r < first + runs; r++) {
  const casts = [];
  const host = new RaidHost({ def, mode, humans: () => [], bots: comp, mods: MODSET, seed: seed0 + r * 77, bond: GEARSET ? GEARSET.bond : undefined, practiceFrom, emit: msg => {
    if (msg.t === 'bcast') casts.push(msg.name);
    // TRACE=1: print the boss's casts, the walls, adds and props as they happen
    if (process.env.TRACE && (msg.t === 'bcast' || (msg.t === 'fev' && msg.k === 'wall') || (msg.t === 'addev' && msg.k !== 'bite') || msg.t === 'propfx')) console.log(`   ${host.sim.t.toFixed(1)} ${msg.t} ${msg.name || msg.k || ''} ${msg.label || msg.kind || ''}`);
    // NEXT=1: print the upcoming-moves feed whenever it changes
    if (msg.t === 'bnext' && process.env.NEXT) console.log(`   ${host.sim.t.toFixed(1)} next: ${msg.l.map(([n, s]) => `${n} ${s}s`).join(', ')}`);
  } });
  if (GEARSET) host.bots.forEach((b, i) => { b.actor.kit.env.gearMods = () => GEARSET.sets[i].mods; });
  BotHuman.attach(host, humanWho);
  const bd = BREAKDOWN ? BotBreakdown.make(host) : null;
  let deaths = [];
  const raises = [];
  const origEmit = host.emitOut;
  const recent = {};
  const kinds = {};
  const hollow = { started: 0, saved: 0, failed: 0 };
  host.emitOut = msg => {
    if (msg.t === 'fev' && msg.k === 'hollow') {
      if (msg.on) hollow.started++; else if (msg.ok) hollow.saved++; else hollow.failed++;
      if (process.env.WHY) console.log(`   ${host.sim.t.toFixed(1)}s Hollow ${msg.on ? 'begins' : msg.ok ? `ends: SAVED (debt ${msg.debt}, healed ${msg.heal})` : `ends: FELL (debt ${msg.debt}, healed ${msg.heal})`}`);
    }
    if (msg.t === 'pdmg') {
      (recent[msg.id] = recent[msg.id] || []).push(`${msg.k}:${Math.round(msg.a)}@${host.sim.t.toFixed(1)}(${msg.hp})`);
      if (msg.dd) kinds[msg.k] = (kinds[msg.k] || 0) + 1;
    }
    if (msg.t === 'addev' && msg.k === 'enrage') kinds['add-enrage'] = (kinds['add-enrage'] || 0) + 1;
    if (msg.t === 'fev' && msg.k === 'raised') raises.push(`${host.sim.t.toFixed(0)}s ${host.bots.find(b => b.id === msg.id)?.name}`);
    if (msg.t === 'fev' && msg.k === 'death') {
      const last = (recent[msg.id] || []).slice(-3).join(' ');
      deaths.push(`${host.sim.t.toFixed(0)}s ${host.bots.find(b => b.id === msg.id)?.name}` + (process.env.WHY ? ` [${last}]` : ''));
    }
    origEmit(msg);
  };
  let gateHit = false;
  while (host.sim.state === 'countdown' || host.sim.state === 'live') {
    host.tick(0.05);
    if (untilAct && host.sim.phase > untilAct) { gateHit = true; break; }
    if (bd) bd.sample(0.05);
    if (host.sim.t > 900) break;
  }
  const won = host.sim.state === 'clear' || gateHit;   // (gateHit: until=N, the act's gate was passed)
  if (won) clears++;
  const st = host.sim.stats;
  const dur = host.sim.t;
  totDeaths += deaths.length; if (won) totClearT += dur;
  log(`run ${r + 1}: ${won ? 'clear' : host.sim.state} at ${dur.toFixed(0)}s, boss ${(host.sim.boss.hp / host.sim.boss.maxHp * 100).toFixed(1)}%, phase ${host.sim.phase}, deaths: ${deaths.join(', ') || 'none'}${raises.length ? `, raised: ${raises.join(', ')}` : ''}`);
  log('   ' + Object.values(st).map(s => `${s.name}/${s.cls}: ${(s.damage / dur).toFixed(0)} dps, ${(s.healing / dur).toFixed(0)} hps, avoidable ${s.avoidable}, deaths ${s.deaths}${s.ults ? `, ults ${s.ults}` : ""}`).join('\n   '));
  if (bd) {
    const res = bd.result();
    log('   breakdown:\n   ' + BotBreakdown.format(res, dur));
    for (const [id, r] of Object.entries(res)) { const a = (bdTot[id] = bdTot[id] || { name: r.name, cls: r.cls, human: r.human, n: 0 }); a.n++; for (const k of ['damage', 'dead', 'out', 'moving', 'idle', 'interrupts', 'avoidable']) a[k] = (a[k] || 0) + r[k]; a.dur = (a.dur || 0) + dur; }
  }
  // contribution points (scoring.js): the MVP on a clear, and with SCORE=1 each player's points, raw tracking and the awards
  const sc = Scoring.score(st, { time: dur }), mv = host.sim.state === 'clear' && !gateHit ? Scoring.mvp(st, sc) : null;
  if (process.env.SCORE) log('   ' + Object.entries(st).map(([id, s]) => `${s.name}/${s.role} ${sc[id].total} pts ${JSON.stringify(Object.fromEntries(Object.entries(sc[id].pts).map(([k, v]) => [k, Math.round(v)])))} pen ${sc[id].pen.avoid}/${sc[id].pen.deaths} | ` +
    Scoring.KEYS.filter(k => !['avoidable', 'deaths'].includes(k)).map(k => `${k} ${s[k]}`).join(' ')).join('\n   '));
  if (mv != null) log(`   MVP: ${st[mv].name} (${st[mv].cls}) ${sc[mv].total} pts` + (process.env.SCORE ? '; awards ' + Scoring.awards(st, sc, { clear: true, time: dur }).map(a => `${a.name}: ${st[a.who].name}`).join(', ') : ''));
  if (hollow.started) log(`   Hollow: ${hollow.started} started, ${hollow.saved} saved, ${hollow.failed} fell`);
  for (const k of Object.keys(hollow)) hollowTot[k] += hollow[k];
  if (Object.keys(kinds).length) log('   failed: ' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '));
  if (stopOnClear && won) { log(`stopped after the first clear (run ${r + 1})`); runs = r - first + 1; break; }
}
log(`cleared ${clears} of ${runs}`);
if (BREAKDOWN && !SUMMARY) {
  log(`mean per run over ${runs} runs (seconds per run; dps over the time played):`);
  for (const a of Object.values(bdTot)) log(`   ${a.name}/${a.cls}${a.human ? '*' : ''}: ${(a.damage / a.dur).toFixed(0)} dps | dead ${(a.dead / a.n).toFixed(0)}s, out of reach ${(a.out / a.n).toFixed(0)}s, moving ${(a.moving / a.n).toFixed(0)}s, gcd idle ${(a.idle / a.n).toFixed(0)}s, casts cancelled ${(a.interrupts / a.n).toFixed(1)}, avoidable hits ${(a.avoidable / a.n).toFixed(1)}`);
}
if (hollowTot.started) log(`Hollow over ${runs} runs: ${hollowTot.started} started, ${hollowTot.saved} saved, ${hollowTot.failed} fell`);
if (SUMMARY) console.log(JSON.stringify({ boss: def.id, mode, heat: HARDPLUS.heat(MODSET) || undefined, gear: gearLevel || 'base', runs, clears, deathsPerRun: +(totDeaths / runs).toFixed(2), meanClearT: clears ? Math.round(totClearT / clears) : null, hollow: hollowTot.started ? hollowTot : undefined }));
