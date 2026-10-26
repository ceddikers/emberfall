// copied verbatim from tools/bot-raid.js lines 38-148 (gear levels), wrapped as a module
const path = require('path');
const load = (p) => require(path.join('C:/Users/Cedef/OneDrive/Documents/newgame/client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'), load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'));
const ITEMSMOD = load('items.js');
const FEASTS_ = { stew: { stat: 'hp', pct: 3 }, pie: { stat: 'power', pct: 3 }, broth: { stat: 'heal', pct: 3 }, tarts: { stat: 'speed', pct: 2 } };   // town-npcs.js FEASTS
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
// post2 swaps on top of POST1 (old key -> set-2 key; WEAPON6 = the Rimeforged Maul / Icicle Wand by main stat, unused while
// set 2 has no weapon that beats a class weapon). Eight swaps, each the same rarity as the piece it replaces, never a class piece
// or a Mythic: set-2 bonuses 2/2/2/2 pieces (tiers 5-8), set-1 bonuses left at tier 2 x3, tier 4 x3, tiers 1 and 3 one wearer each.
const POST2 = [
  { g_polar: 'g_brand', g_lantern: 'g_gillcharm' },                // R5 R8
  { g_pepper: 'g_sigil', g_venom: 'g_kindle' },                    // R7 L5
  { g_slate: 'g_glacial', g_pepper: 'g_tidering' },                // U6 R8
  { g_apron: 'g_circlerobe', g_iron: 'g_coldiron' },               // U7 R6
];
// post3 swaps on top of POST2: the party that has also cleared set 2 on Hard (four chests at Hard odds, about 18 items: the median
// party wears two set-2 Mythics and five more set-2 Legendaries in place of Uncommon and Rare pieces). This is the target for SET 3
// NORMAL. Bonuses: set-2 tiers 5-8 at 2-3 wearers each.
const POST3 = [
  { g_brand: 'g_ninthhead' },                                      // L8 (the tank keeps its Gillcharm)
  { g_sigil: 'g_arcanum' },                                         // L7
  { g_glacial: 'm_titanfur', g_tidering: 'g_ninthhead' },          // M6 L8
  { g_circlerobe: 'm_archrobe', g_coldiron: 'g_glaciereye' },      // M7 L6
];
// post4 swaps on top of POST3: the party that has also cleared set 3 on Normal (four chests at Normal odds: about 9 Uncommon, 5 Rare,
// 2 Legendary). Each swap is a real upgrade of the same rarity (items.js SET3_STEP), never a class piece or a Mythic; post3 leaves
// one Rare and the general Legendaries to swap, so the median party wears one set-3 Rare and two set-3 Legendaries. This is the
// target for SET 3 HARD; 'post3' on Hard is the party that skips the new loot (tuned to be harder than this).
const POST4 = [
  { g_gillcharm: 'g_passlantern' },                                // R9 (the tank keeps its health and defence)
  { g_kindle: 'g_lastleaf' },                                      // L11
  {},
  { g_glaciereye: 'g_champlaurel' },                               // L10
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
    else if (level === 'post1' || level === 'post2' || level === 'post3' || level === 'post4') {
      keys = POST1[i % 4].map(k => k.replace('{c}', cls));
      if (level !== 'post1') keys = keys.map((k, j) => { const sw = POST2[i % 4][POST1[i % 4][j]]; return sw === 'WEAPON6' ? (main === 'mag' ? 'g_frostwand' : 'g_frostmaul') : sw || k; });
      if (level === 'post3' || level === 'post4') keys = keys.map(k => POST3[i % 4][k] || k);
      if (level === 'post4') keys = keys.map(k => POST4[i % 4][k] || k);
    } else { console.error('gear levels: base, fresh, mid, full, post1, post2, post3, post4'); process.exit(1); }
    const insts = keys.map(key => { if (!ITEMSMOD.ITEMS[key]) throw new Error('no item ' + key); return { key }; });
    const t = ITEMSMOD.gearTotals(cls, insts);
    if (level === 'full' || level === 'post1' || level === 'post2' || level === 'post3' || level === 'post4') {   // the feast (town-life.js feastTotals), added after the caps
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
module.exports = { buildGear };
