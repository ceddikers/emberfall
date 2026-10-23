// Headless raid with a full bot party: checks the boss script, the kits and the bot AI together,
// and gives a rough idea of clear times and death counts.
//   node tools/bot-raid.js [normal|hard] [runs] [classes comma-separated] [boss id]
//   e.g. node tools/bot-raid.js normal 5 skitterra   (arguments can come in any order; the boss defaults to grubnak)
//   seed=N uses another set of seeds; WHY=1 prints the last hits before each death, NEXT=1 the upcoming-moves feed
//   gear=fresh|mid|full|post1|post2 (or GEAR=...) gives every bot representative player gear (see buildGear below); FEAST=pie|stew|broth|tarts
//   picks the meal for 'full', 'post1' and 'post2' (default pie, none at the other levels). SUMMARY=1 prints one machine-readable line only.
const path = require('path');
const load = (p) => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'));
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
const { TRIALS, trialDef } = load('arena/trials.js');

const ITEMSMOD = load('items.js');
const FEASTS_ = { stew: { stat: 'hp', pct: 3 }, pie: { stat: 'power', pct: 3 }, broth: { stat: 'heal', pct: 3 }, tarts: { stat: 'speed', pct: 2 } };   // town-npcs.js FEASTS
let gearLevel = process.env.GEAR || '';
let mode = 'normal', runs = 3, comp = 'bastion,cleric,ranger,pyromancer'.split(','), def = GRUBNAK, seed0 = 1000;
for (const a of process.argv.slice(2)) {
  if (a === 'normal' || a === 'hard') mode = a;
  else if (/^seed=\d+$/.test(a)) seed0 = Number(a.slice(5));   // a different set of seeds (default 1000)
  else if (/^gear=\w+$/.test(a)) gearLevel = a.slice(5);
  else if (/^\d+$/.test(a)) runs = Number(a);
  else if (DEFS[a]) def = DEFS[a];
  // trial:<spec> runs that spec's trial, with a bot taking it (or 'trial:<spec>:base' to try it with the base kit)
  else if (/^trial:\w+/.test(a) && TRIALS[a.split(':')[1]]) { const T = TRIALS[a.split(':')[1]]; def = trialDef(T.spec); comp = [`${T.cls}:${a.split(':')[2] || T.spec}`, ...T.allies]; }
  else if (a.includes(',')) comp = a.split(',');
  else { console.error(`unknown argument: ${a} (bosses: ${Object.keys(DEFS).join(', ')})`); process.exit(1); }
}
// ---------------------------------------------------------------- gear for the bots
// A player's gear reaches a fight three ways; this reproduces all three from real items (items.js):
//  1. hostGear (main.js sendGear -> sanitizeGear caps) -> p.gear per player: fight.js:112-115 uses hp (flat, max 150) and def/1000 (max 0.1)
//  2. gearMods(cls, totals, loadout) -> the kit's env.gearMods (engine.js gear(): power = main stat/1000, crit, haste, item fx and perks)
//  3. partyBonus(counts of players wearing each boss's tier) -> RaidHost opts.bond (hp% in fight.js hpPct; dmg/crit/haste in raid-host.js partyMods)
// The feast is added to the totals AFTER gearTotals' caps (inventory.js totals), as here; the host's sanitizeGear caps HP again.
// Levels (bots are slots 0-3; every item is in a real loot table, nothing exceeds a cap):
//   fresh: Uncommon weapon + armour and one Rare ring, one boss's gear per player, a different boss each: no bond
//   mid:   four pieces each (Uncommon weapon and armour, two Rare/Legendary accessories); slots 0 and 1 wear Grubnak gear: one 2-piece bond
//   full:  best Hard drops: Legendary class weapon (Grubnak), Mythic armour (Hollow King), Mythic accessories (Skitterra, Volkar):
//          every player wears all four bosses = 4-piece bonuses for every tier, plus a feast
//   post1: the party that has cleared all four set-1 bosses on Normal AND Hard (eight chests: 16 + 20 items, shared by four, rolled at
//          loot.js/items.js CHEST_ODDS normal 55/30/12/3 and hard 30/40/22/8 for Uncommon/Rare/Legendary/Mythic: about 15 Uncommon,
//          13 Rare, 6 Legendary and 2 Mythic in the party's hands). The MEDIAN outcome, worn: every player has one piece from each of
//          the four set-1 bosses (so the 4-piece bonus for every tier), 16 worn pieces = 2 Mythic, 6 Legendary, 6 Rare, 2 Uncommon,
//          plus the Pepper Pie. This is the target for SET 2 NORMAL. (Weaker than 'full', which is every piece Legendary/Mythic.)
//   post2: post1 + a set-2 Normal clear on all four set-2 bosses (4 x 4 = 16 chest items at Normal odds, no Mythic drops in set 2 at
//          Normal worth wearing: Uncommon/Rare/Legendary only, general items only). The party swaps eight of its post1 pieces
//          for set-2 pieces (1 Legendary, 4 Rare, 3 Uncommon): 2-piece set-2 bonuses for all four set-2 tiers (5-8); the set-1 bonuses
//          fall to Brood Bond x3, Stormbound x2, Court of the Barrow x2 and no Kitchen Crew (every swap costs a set-1 piece). Same feast.
//          This is the target for SET 2 HARD.
const GEN = {   // [phys weapon, mag weapon, armour, Rare ring, second accessory]
  1: ['g_cleaver', 'g_ladle', 'g_apron', 'g_pepper', 'g_timer'], 2: ['g_fang', 'g_wand', 'g_hauberk', 'g_band', 'g_silk'],
  3: ['g_maul', 'g_rod', 'g_slate', 'g_polar', 'g_iron'], 4: ['g_crown', 'g_sceptre', 'g_shroud', 'g_signet', 'g_lantern'],
};
// post1 / post2 per bot slot (index = line-up position, so tank/healer/dps/dps): [weapon, armour, accessory, accessory] with {c} = class id.
// Every row has one piece of each set-1 tier (1-4). Rarity: w1/w2/w3 and a2/a4 class pieces Legendary, w4 Rare (Court's Favour), g_* as listed.
const POST1 = [
  ['{c}_w1', '{c}_a2', 'g_polar', 'g_lantern'],        // L(t1) L(t2) R(t3) R(t4)
  ['{c}_w3', '{c}_a4', 'g_pepper', 'g_venom'],         // L(t3) L(t4) R(t1) L(t2)
  ['{c}_w2', 'g_slate', 'm_crown', 'g_pepper'],        // L(t2) U(t3) M(t4) R(t1)
  ['{c}_w4', 'g_apron', 'm_broodeye', 'g_iron'],       // R(t4) U(t1) M(t2) R(t3)
];
// post2 swaps on top of POST1 (old key -> set-2 key; WEAPON6 = the Rimeforged Maul / Icicle Wand by main stat). Eight swaps, always the
// weakest Rare/Uncommon (or an equal Legendary) piece, never a class Legendary or a Mythic: set-2 bonuses 2/2/2/2 pieces (tiers 5-8),
// set-1 bonuses left at tier 2 x3, tier 3 x2, tier 4 x2 (tier 1 loses all but one wearer).
const POST2 = [
  { g_polar: 'g_brand', g_lantern: 'g_gillcharm' },                // R5 R8
  { g_pepper: 'g_sigil', g_venom: 'g_kindle' },                    // R7 L5
  { g_slate: 'g_glacial', g_pepper: 'g_tidering' },                // U6 R8
  { g_apron: 'g_circlerobe', '{c}_w4': 'WEAPON6' },                // U7 U6
];
function buildGear(level, entries) {
  if (!level || level === 'base') return null;
  const sets = entries.map((e, i) => {
    const cls = e.split(':')[0], main = ITEMSMOD.CLASS_MAIN[cls] || 'phys';
    const w = t => GEN[t][main === 'mag' ? 1 : 0];
    let keys;
    if (level === 'fresh') { const t = (i % 4) + 1; keys = [w(t), GEN[t][2], GEN[t][3]]; }
    else if (level === 'mid') {
      const tiers = [[1, 1, 1, 1], [1, 1, 1, 1], [2, 2, 3, 3], [4, 4, 4, 4]][i % 4];
      keys = [w(tiers[0]), GEN[tiers[1]][2], GEN[tiers[2]][3], GEN[tiers[3]][4]];
    } else if (level === 'full') keys = [`${cls}_w1`, 'm_deadcourt', 'm_broodeye', 'm_torc'];
    else if (level === 'post1' || level === 'post2') {
      keys = POST1[i % 4].map(k => k.replace('{c}', cls));
      if (level === 'post2') keys = keys.map((k, j) => { const sw = POST2[i % 4][POST1[i % 4][j]]; return sw === 'WEAPON6' ? (main === 'mag' ? 'g_frostwand' : 'g_frostmaul') : sw || k; });
    } else { console.error('gear levels: base, fresh, mid, full, post1, post2'); process.exit(1); }
    const insts = keys.map(key => { if (!ITEMSMOD.ITEMS[key]) throw new Error('no item ' + key); return { key }; });
    const t = ITEMSMOD.gearTotals(cls, insts);
    if (level === 'full' || level === 'post1' || level === 'post2') {   // the feast (town-life.js feastTotals), added after the caps
      const { stat, pct } = FEASTS_[process.env.FEAST || 'pie'];
      const role = CLASSES.find(c => c.id === cls).role;
      const x = stat === 'hp' ? { hp: Math.round(1100 * pct / 100) } : stat === 'speed' ? { haste: pct }
        : stat === 'heal' ? (role === 'healer' ? { main: pct * 10 } : { hp: Math.round(1100 * pct / 200) }) : { main: pct * 10 };
      for (const [k, v] of Object.entries(x)) { const kk = k === 'main' ? main : k; t[kk] = (t[kk] || 0) + v; }
    }
    return { cls, insts, totals: t, mods: ITEMSMOD.gearMods(cls, t, insts), host: ITEMSMOD.sanitizeGear(t), src: ITEMSMOD.gearSources(insts) };
  });
  const counts = {};
  for (const g of sets) for (const t of g.src) counts[t] = (counts[t] || 0) + 1;
  return { sets, bond: ITEMSMOD.partyBonus(counts) };
}
const GEARSET = buildGear(gearLevel, comp);
const SUMMARY = !!process.env.SUMMARY;
const log = (...a) => { if (!SUMMARY) console.log(...a); };
if (GEARSET) {
  const orig = RaidHost.prototype.allPlayers;
  RaidHost.prototype.allPlayers = function () { return orig.call(this).map(p => (p.bot ? Object.assign(p, { gear: GEARSET.sets[p.id - 1000].host }) : p)); };
  log(`gear ${gearLevel}: bond ${JSON.stringify(GEARSET.bond.active.map(a => a.name + ' x' + a.n))}; ` + GEARSET.sets.map(g => `${g.cls} hp${g.host.hp} def${g.host.def} main+${(g.mods.power * 1000).toFixed(0)} crit${g.mods.crit} haste${g.mods.haste}`).join(' | '));
}
log(`${def.name}, ${mode}, ${comp.join('/')}`);

let clears = 0, totDeaths = 0, totClearT = 0;
const hollowTot = { started: 0, saved: 0, failed: 0 };   // a Gloomsworn's Hollow (fight.js HOLLOW_HOST), over every run
for (let r = 0; r < runs; r++) {
  const casts = [];
  const host = new RaidHost({ def, mode, humans: () => [], bots: comp, seed: seed0 + r * 77, bond: GEARSET ? GEARSET.bond : undefined, emit: msg => {
    if (msg.t === 'bcast') casts.push(msg.name);
    // NEXT=1: print the upcoming-moves feed whenever it changes
    if (msg.t === 'bnext' && process.env.NEXT) console.log(`   ${host.sim.t.toFixed(1)} next: ${msg.l.map(([n, s]) => `${n} ${s}s`).join(', ')}`);
  } });
  if (GEARSET) host.bots.forEach((b, i) => { b.actor.kit.env.gearMods = () => GEARSET.sets[i].mods; });
  let deaths = [];
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
    if (msg.t === 'fev' && msg.k === 'death') {
      const last = (recent[msg.id] || []).slice(-3).join(' ');
      deaths.push(`${host.sim.t.toFixed(0)}s ${host.bots.find(b => b.id === msg.id)?.name}` + (process.env.WHY ? ` [${last}]` : ''));
    }
    origEmit(msg);
  };
  while (host.sim.state === 'countdown' || host.sim.state === 'live') {
    host.tick(0.05);
    if (host.sim.t > 900) break;
  }
  if (host.sim.state === 'clear') clears++;
  const st = host.sim.stats;
  const dur = host.sim.t;
  totDeaths += deaths.length; if (host.sim.state === 'clear') totClearT += dur;
  log(`run ${r + 1}: ${host.sim.state} at ${dur.toFixed(0)}s, boss ${(host.sim.boss.hp / host.sim.boss.maxHp * 100).toFixed(1)}%, phase ${host.sim.phase}, deaths: ${deaths.join(', ') || 'none'}`);
  log('   ' + Object.values(st).map(s => `${s.name}/${s.cls}: ${(s.damage / dur).toFixed(0)} dps, ${(s.healing / dur).toFixed(0)} hps, avoidable ${s.avoidable}, deaths ${s.deaths}${s.ults ? `, ults ${s.ults}` : ""}`).join('\n   '));
  // contribution points (scoring.js): the MVP on a clear, and with SCORE=1 each player's points, raw tracking and the awards
  const sc = Scoring.score(st, { time: dur }), mv = host.sim.state === 'clear' ? Scoring.mvp(st, sc) : null;
  if (process.env.SCORE) log('   ' + Object.entries(st).map(([id, s]) => `${s.name}/${s.role} ${sc[id].total} pts ${JSON.stringify(Object.fromEntries(Object.entries(sc[id].pts).map(([k, v]) => [k, Math.round(v)])))} pen ${sc[id].pen.avoid}/${sc[id].pen.deaths} | ` +
    Scoring.KEYS.filter(k => !['avoidable', 'deaths'].includes(k)).map(k => `${k} ${s[k]}`).join(' ')).join('\n   '));
  if (mv != null) log(`   MVP: ${st[mv].name} (${st[mv].cls}) ${sc[mv].total} pts` + (process.env.SCORE ? '; awards ' + Scoring.awards(st, sc, { clear: true, time: dur }).map(a => `${a.name}: ${st[a.who].name}`).join(', ') : ''));
  if (hollow.started) log(`   Hollow: ${hollow.started} started, ${hollow.saved} saved, ${hollow.failed} fell`);
  for (const k of Object.keys(hollow)) hollowTot[k] += hollow[k];
  if (Object.keys(kinds).length) log('   failed: ' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '));
}
log(`cleared ${clears} of ${runs}`);
if (hollowTot.started) log(`Hollow over ${runs} runs: ${hollowTot.started} started, ${hollowTot.saved} saved, ${hollowTot.failed} fell`);
if (SUMMARY) console.log(JSON.stringify({ boss: def.id, mode, gear: gearLevel || 'base', runs, clears, deathsPerRun: +(totDeaths / runs).toFixed(2), meanClearT: clears ? Math.round(totClearT / clears) : null, hollow: hollowTot.started ? hollowTot : undefined }));
