// Player gear for bots: what a party that cleared everything before a fight would wear, built from real items (items.js).
// Fill-in bots in a live raid wear the level that fight is tuned for (BotGear.levelFor), and the tools put any level on
// their bots (tools/bot-raid.js gear=..., tools/comp-sweep.js, through tools/lib/bot-gear.js).
// A player's gear reaches a fight three ways; build() reproduces all three:
//  1. host: sanitizeGear(totals) -> p.gear per player (fight.js: hp, and def as a damage cut)
//  2. mods: gearMods(cls, totals, loadout) -> the kit's env.gearMods (engine.js gear(): power, crit, haste, item fx and perks)
//  3. src: the bosses each piece came from -> partyBonus(counts) for the party bonus (RaidHost opts.bond)
// The feast is added to the totals after gearTotals' caps (inventory.js totals), as a player's would be.
// Levels (line-up slots 0-3 are tank, healer, dps, dps; every item is in a real loot table, nothing exceeds a cap):
//   fresh: Uncommon weapon + armour and one Rare ring, one boss's gear per player, a different boss each: no bonus. SET 1 NORMAL
//   mid:   four pieces each (Uncommon weapon and armour, two Rare/Legendary accessories); slots 0 and 1 wear Grubnak gear. SET 1 HARD
//   full:  best set-1 Hard drops: Legendary class weapon, Mythic armour and accessories, 4-piece bonuses for every tier, a feast
//   post1: the party that has cleared all four set-1 bosses on Normal AND Hard, the median loot worn: every player has one piece
//          from each set-1 boss (4-piece bonus for every tier), 2 Mythic, 6 Legendary, 6 Rare, 2 Uncommon, plus a feast. SET 2 NORMAL
//   post2: post1 + a set-2 Normal clear: eight pieces swapped for set-2 pieces of the same rarity (items.js SET2_STEP). SET 2 HARD
//   post3: post2 + a set-2 Hard clear: two set-2 Mythics and more Legendaries. SET 3 NORMAL
//   post4: post3 + a set-3 Normal clear: one set-3 Rare and two set-3 Legendaries swapped in (items.js SET3_STEP). SET 3 HARD
const BotGear = (() => {
  const I = typeof module !== 'undefined' ? require('./items.js') : null;   // (Node: the tools; the browser has items.js's globals)
  const items = () => (I ? I : { ITEMS, CLASS_MAIN, gearTotals, gearMods, sanitizeGear, gearSources, partyBonus });
  const classes = () => (typeof CLASSES !== 'undefined' ? CLASSES : []);
  const FEASTS = { stew: { stat: 'hp', pct: 3 }, pie: { stat: 'power', pct: 3 }, broth: { stat: 'heal', pct: 3 }, tarts: { stat: 'speed', pct: 2 } };   // town-npcs.js FEASTS
  const GEN = {   // [phys weapon, mag weapon, armour, Rare ring, second accessory]
    1: ['g_cleaver', 'g_ladle', 'g_apron', 'g_pepper', 'g_timer'], 2: ['g_fang', 'g_wand', 'g_hauberk', 'g_band', 'g_silk'],
    3: ['g_maul', 'g_rod', 'g_slate', 'g_polar', 'g_iron'], 4: ['g_crown', 'g_sceptre', 'g_shroud', 'g_signet', 'g_lantern'],
  };
  // post1 per slot: [weapon, armour, accessory, accessory], {c} = class id. Every row has one piece of each set-1 tier (1-4).
  const POST1 = [
    ['{c}_w1', '{c}_a2', 'g_polar', 'g_lantern'],        // L(t1) L(t2) R(t3) R(t4)
    ['{c}_w3', '{c}_a4', 'g_pepper', 'g_venom'],         // L(t3) L(t4) R(t1) L(t2)
    ['{c}_w2', 'g_slate', 'm_crown', 'g_pepper'],        // L(t2) U(t3) M(t4) R(t1)
    ['{c}_w4', 'g_apron', 'm_broodeye', 'g_iron'],       // R(t4) U(t1) M(t2) R(t3)
  ];
  // post2 swaps on top of post1 (old key -> set-2 key), each the same rarity, never a class piece or a Mythic
  const POST2 = [
    { g_polar: 'g_brand', g_lantern: 'g_gillcharm' },                // R5 R8
    { g_pepper: 'g_sigil', g_venom: 'g_kindle' },                    // R7 L5
    { g_slate: 'g_glacial', g_pepper: 'g_tidering' },                // U6 R8
    { g_apron: 'g_circlerobe', g_iron: 'g_coldiron' },               // U7 R6
  ];
  const POST3 = [
    { g_brand: 'g_ninthhead' },                                      // L8 (the tank keeps its Gillcharm)
    { g_sigil: 'g_arcanum' },                                        // L7
    { g_glacial: 'm_titanfur', g_tidering: 'g_ninthhead' },          // M6 L8
    { g_circlerobe: 'm_archrobe', g_coldiron: 'g_glaciereye' },      // M7 L6
  ];
  const POST4 = [
    { g_gillcharm: 'g_passlantern' },                                // R9 (the tank keeps its health and defence)
    { g_kindle: 'g_lastleaf' },                                      // L11
    {},
    { g_glaciereye: 'g_champlaurel' },                               // L10
  ];
  const LEVELS = ['fresh', 'mid', 'full', 'post1', 'post2', 'post3', 'post4'];
  // the gear a fight is tuned for (CLAUDE.md "Tuning gear"): each set's Normal and Hard
  const TUNED = { 1: { normal: 'fresh', hard: 'mid' }, 2: { normal: 'post1', hard: 'post2' }, 3: { normal: 'post3', hard: 'post4' } };
  function levelFor(bossId, mode) {
    const b = typeof BOSSES !== 'undefined' ? BOSSES.find(x => x.id === bossId) : null;
    const t = b && TUNED[b.set];
    return t ? t[mode === 'hard' ? 'hard' : 'normal'] : null;
  }
  // one hero's pieces at a level; slot: 0 tank, 1 healer, 2 and 3 dps (the rows differ so a party has every tier)
  function keysFor(level, cls, slot) {
    const X = items(), main = X.CLASS_MAIN[cls] || 'phys', i = slot % 4;
    const w = t => GEN[t][main === 'mag' ? 1 : 0];
    if (level === 'fresh') { const t = i + 1; return [w(t), GEN[t][2], GEN[t][3]]; }
    if (level === 'mid') { const tiers = [[1, 1, 1, 1], [1, 1, 1, 1], [2, 2, 3, 3], [4, 4, 4, 4]][i]; return [w(tiers[0]), GEN[tiers[1]][2], GEN[tiers[2]][3], GEN[tiers[3]][4]]; }
    if (level === 'full') return [`${cls}_w1`, 'm_deadcourt', 'm_broodeye', 'm_torc'];
    if (!/^post[1-4]$/.test(level)) return null;
    let keys = POST1[i].map(k => k.replace('{c}', cls));
    if (level !== 'post1') keys = keys.map((k, j) => POST2[i][POST1[i][j]] || k);
    if (level === 'post3' || level === 'post4') keys = keys.map(k => POST3[i][k] || k);
    if (level === 'post4') keys = keys.map(k => POST4[i][k] || k);
    return keys;
  }
  // a hero's gear at a level: { cls, insts, totals, mods, host, src }, or null for no gear ('base' or an unknown level)
  function forHero(level, cls, slot, feast = 'pie') {
    const keys = keysFor(level, cls, slot);
    if (!keys) return null;
    const X = items();
    const insts = keys.map(key => { if (!X.ITEMS[key]) throw new Error('no item ' + key); return { key }; });
    const t = X.gearTotals(cls, insts);
    if (level === 'full' || /^post/.test(level)) {   // the feast (town-life.js feastTotals), added after the caps
      const f = FEASTS[feast] || FEASTS.pie, main = X.CLASS_MAIN[cls] || 'phys';
      const role = (classes().find(c => c.id === cls) || {}).role;
      const x = f.stat === 'hp' ? { hp: Math.round(1100 * f.pct / 100) } : f.stat === 'speed' ? { haste: f.pct }
        : f.stat === 'heal' ? (role === 'healer' ? { main: f.pct * 10 } : { hp: Math.round(1100 * f.pct / 200) }) : { main: f.pct * 10 };
      for (const [k, v] of Object.entries(x)) { const kk = k === 'main' ? main : k; t[kk] = (t[kk] || 0) + v; }
    }
    return { cls, insts, totals: t, mods: X.gearMods(cls, t, insts), host: X.sanitizeGear(t), src: X.gearSources(insts) };
  }
  // the tools' whole line-up: entries 'class' or 'class:spec' in line-up order, level one for all or one per entry
  function build(levelIn, entries, feast) {
    if (!levelIn || levelIn === 'base') return null;
    const sets = entries.map((e, i) => {
      const level = Array.isArray(levelIn) ? levelIn[i] : levelIn;
      if (!LEVELS.includes(level)) throw new Error('gear levels: base, ' + LEVELS.join(', '));
      return forHero(level, e.split(':')[0], i, feast);
    });
    const counts = {};
    for (const g of sets) for (const t of g.src) counts[t] = (counts[t] || 0) + 1;
    return { sets, bond: items().partyBonus(counts) };
  }
  // a role's line-up slot for the gear rows: tank 0, healer 1, then the dps rows (taken ones skipped)
  function slotFor(role, taken) {
    const want = role === 'tank' ? [0, 2, 3, 1] : role === 'healer' ? [1, 2, 3, 0] : [2, 3, 0, 1];
    return want.find(s => !taken.has(s)) ?? 0;
  }
  return { LEVELS, TUNED, GEN, POST1, POST2, POST3, POST4, FEASTS, levelFor, keysFor, forHero, build, slotFor };
})();

if (typeof module !== 'undefined') module.exports = { BotGear };
