// Items, gear stats and loot. Pure data + math (no DOM), so the host and every client agree.
//
// Slots: weapon, armor, two accessories. Stats:
//   hp     flat max HP (host applies it)              phys / mag  main stat; each class reads one (1 pt = +0.1% damage and healing)
//   def    1 pt = 0.1% less damage taken (host)       haste / crit  percent
// Gear is deliberately modest (best-in-slot is roughly +15-20% output) so fights stay about mechanics.

const GEAR_CAPS = { hp: 150, phys: 150, mag: 150, def: 100, haste: 10, crit: 10 };
const CLASS_MAIN = {
  bastion: 'phys', bloodreaver: 'phys', ranger: 'phys', shadowblade: 'phys',
  runeguard: 'mag', pyromancer: 'mag', cleric: 'mag', grovekeeper: 'mag', chronomancer: 'mag',
};
const RARITY = [
  { name: 'Common', color: '#c8c2b4' }, { name: 'Uncommon', color: '#6fd06a' }, { name: 'Rare', color: '#5aa8ff' },
  { name: 'Epic', color: '#c27aff' }, { name: 'Legendary', color: '#ff9a3a' },
];
const STAT_INFO = {
  hp: { name: 'HP', fmt: v => `+${v}` },
  phys: { name: 'Physical', fmt: v => `+${v}` },
  mag: { name: 'Magical', fmt: v => `+${v}` },
  def: { name: 'Defense', fmt: v => `+${v}` },
  haste: { name: 'Haste', fmt: v => `+${v}%` },
  crit: { name: 'Critical', fmt: v => `+${v}%` },
};

// where an item comes from: tier power scales its stats; Hard drops (q = 1) are one rarity up and 25% stronger
const TIERS = {
  0: { name: 'Recruit', power: 0.3, rarity: 0, ilvl: 1 },
  1: { name: 'Grubnak', power: 0.55, rarity: 1, ilvl: 10 },
  2: { name: 'Skitterra', power: 0.8, rarity: 2, ilvl: 20 },
};
const HARD_MULT = 1.25;

const CLASS_GEAR = {
  bastion: { wtype: 'sword', w: ["Recruit's Arming Sword", 'Cleaverguard Sword', 'Silkrend Oathblade'], a: ['Iron Skillet Plate', 'Broodwarden Plate'] },
  bloodreaver: { wtype: 'axe', w: ["Recruit's Hatchet", "Butcher's Greataxe", 'Fangreaver Axe'], a: ['Bloodstained Apron Mail', 'Chitin Ravager Harness'] },
  runeguard: { wtype: 'focus', w: ["Recruit's Rune Focus", 'Spiced Rune Focus', 'Eight-Eyed Ward Focus'], a: ['Simmerweave Robes', 'Silkward Robes'] },
  ranger: { wtype: 'bow', w: ["Recruit's Shortbow", 'Hickory Kitchen Bow', 'Silkstring Longbow'], a: ['Smoked Leather Jerkin', 'Webstalker Cloak'] },
  shadowblade: { wtype: 'daggers', w: ["Recruit's Knives", 'Paring Knives', 'Twin Fangs'], a: ['Pantry Shadow Garb', "Widow's Wrap"] },
  pyromancer: { wtype: 'tome', w: ["Recruit's Primer", 'Grease Fire Grimoire', 'Venomflame Tome'], a: ['Charred Chef Robes', 'Broodfire Vestments'] },
  cleric: { wtype: 'sunstaff', w: ["Recruit's Sunstaff", 'Dawnladle Staff', 'Sunweb Staff'], a: ['Linen of the Hearth', 'Silken Vestments of Dawn'] },
  grovekeeper: { wtype: 'branch', w: ["Recruit's Branch", 'Herb Garden Staff', 'Mossweb Staff'], a: ['Rootcellar Robes', "Spinner's Bark Mantle"] },
  chronomancer: { wtype: 'hourglass', w: ["Recruit's Chronoglass", 'Kitchen Timer Chronoglass', 'Eightfold Hourglass'], a: ['Simmering Moment Robes', 'Silken Second Robes'] },
};

// Enhancements: class drops that change how an ability works (the kits check k.perk(itemKey)).
// ab: the ability it changes (its tooltip shows the enhancement while the item is equipped).
const ITEM_PERKS = {
  bastion_w1: { ab: 'blade', text: 'Judgment also heals you.' },
  bastion_a2: { ab: 'brace', text: 'A Perfect Block also shields you for about 8% of your HP.' },
  bastion_w2: { ab: 'edge', text: 'Holy Edge strikes a second time for 40% damage.' },
  bloodreaver_w1: { ab: 'letting', text: 'Bloodletting gives 30 Blood instead of 20.' },
  bloodreaver_a2: { ab: 'warcry', text: 'War Cry also heals you for 10% of your HP.' },
  bloodreaver_w2: { ab: 'drain', text: 'Crimson Drain cleaves again for 30% damage.' },
  runeguard_w1: { ab: 'strike', text: 'Rune Strike has a 25% chance to give an extra Rune.' },
  runeguard_a2: { ab: 'ward', text: 'Runic Ward is 25% stronger (and so is its blast).' },
  runeguard_w2: { ab: 'glyph', text: 'Glyph Burst refunds 1 Rune.' },
  ranger_w1: { ab: 'quick', text: 'Quick Shot lights up Keen Eye 10% more often.' },
  ranger_a2: { ab: 'rapid', text: 'Rapid Fire refunds 10 Focus.' },
  ranger_w2: { ab: 'pierce', text: 'A Keen Eye Piercing Arrow fires a second arrow for 50% damage.' },
  shadowblade_w1: { ab: 'venom', text: 'Venom Blade\'s poison hits 25% harder.' },
  shadowblade_a2: { ab: 'step', text: 'Shadowstep gives 1 combo point.' },
  shadowblade_w2: { ab: 'evis', text: 'A 5-point Eviscerate strikes a second time for 30% damage.' },
  pyromancer_w1: { ab: 'fireball', text: 'Fireball has +10% critical chance.' },
  pyromancer_a2: { ab: 'vent', text: 'Overheating only burns you for half as much.' },
  pyromancer_w2: { ab: 'pyro', text: 'A Hot Streak Pyroblast sets the target burning for 9s.' },
  cleric_w1: { ab: 'petal', text: 'Dawn Petal\'s regen is 50% stronger.' },
  cleric_a2: { ab: 'bene', text: 'Benediction\'s shield is 60% stronger.' },
  cleric_w2: { ab: 'smite', text: 'Dawnstar also heals the whole party.' },
  grovekeeper_w1: { ab: 'thorn', text: 'Thornlash hits 25% harder.' },
  grovekeeper_a2: { ab: 'rejuv', text: 'Rejuvenate ticks grow 7 Bloom instead of 5.' },
  grovekeeper_w2: { ab: 'wrath', text: 'An Awakened Wrath also heals everyone with your Rejuvenate.' },
  chronomancer_w1: { ab: 'shift', text: 'Shifting into Haste gives 10 Flux.' },
  chronomancer_a2: { ab: 'shift', text: 'Flux drains 25% slower in Haste.' },
  chronomancer_w2: { ab: 'rewind', text: 'Rewind also shields its target.' },
};

// base stat lines at power 1.0 (class items get a little more than general ones)
const BASE = {
  weapon: { main: 80, crit: 2 },
  armor: { hp: 75, def: 50 },
};

const ITEMS = {};
(function buildItems() {
  for (const [cls, g] of Object.entries(CLASS_GEAR)) {
    g.w.forEach((name, tier) => { ITEMS[`${cls}_w${tier}`] = { key: `${cls}_w${tier}`, name, slot: 'weapon', cls, main: CLASS_MAIN[cls], wtype: g.wtype, tier, base: { main: BASE.weapon.main * 1.1, crit: BASE.weapon.crit } }; });
    g.a.forEach((name, i) => { const tier = i + 1; ITEMS[`${cls}_a${tier}`] = { key: `${cls}_a${tier}`, name, slot: 'armor', cls, tier, atype: 'class', base: { hp: BASE.armor.hp * 1.1, def: BASE.armor.def * 1.1 } }; });
  }
  const gen = [
    // general weapons: one main stat, any class that reads it
    { key: 'g_cleaver', name: "Butcher's Cleaver", slot: 'weapon', main: 'phys', wtype: 'cleaver', tier: 1, base: { main: 80, crit: 2 } },
    { key: 'g_ladle', name: 'Simmering Ladle', slot: 'weapon', main: 'mag', wtype: 'ladle', tier: 1, base: { main: 80, crit: 2 } },
    { key: 'g_fang', name: 'Fang Shortblade', slot: 'weapon', main: 'phys', wtype: 'fang', tier: 2, base: { main: 80, haste: 2 } },
    { key: 'g_wand', name: 'Silkspun Wand', slot: 'weapon', main: 'mag', wtype: 'wand', tier: 2, base: { main: 80, haste: 2 } },
    // general armor: anyone
    { key: 'g_coat', name: "Traveler's Coat", slot: 'armor', tier: 0, atype: 'coat', base: { hp: 75, def: 50 } },
    { key: 'g_apron', name: 'Apron of the Kitchen Guard', slot: 'armor', tier: 1, atype: 'apron', base: { hp: 85, def: 40 } },
    { key: 'g_hauberk', name: 'Chitin Hauberk', slot: 'armor', tier: 2, atype: 'chitin', base: { hp: 65, def: 60 } },
    // accessories: anyone, two at a time
    { key: 'g_pepper', name: 'Peppercorn Ring', slot: 'accessory', atype: 'ring', tier: 1, base: { crit: 3, main: 10 } },
    { key: 'g_timer', name: 'Egg Timer Pendant', slot: 'accessory', atype: 'amulet', tier: 1, base: { haste: 3, main: 10 } },
    { key: 'g_band', name: 'Eightfold Band', slot: 'accessory', atype: 'ring', tier: 2, base: { haste: 3, main: 15 } },
    { key: 'g_venom', name: 'Venom Pendant', slot: 'accessory', atype: 'amulet', tier: 2, base: { crit: 3, main: 15 } },
    { key: 'g_silk', name: 'Silkguard Charm', slot: 'accessory', atype: 'charm', tier: 2, base: { hp: 40, def: 25 } },
  ];
  for (const it of gen) ITEMS[it.key] = it;
})();

// the actual numbers on an item instance { key, q }, for a given class (class/general 'main' becomes phys or mag)
function itemStats(inst, clsId) {
  const it = ITEMS[inst.key]; if (!it) return {};
  const k = TIERS[it.tier].power * (inst.q ? HARD_MULT : 1);
  const out = {};
  for (const [s, v] of Object.entries(it.base)) {
    const stat = s === 'main' ? (it.main || CLASS_MAIN[clsId] || 'phys') : s;
    const val = s === 'haste' || s === 'crit' ? Math.max(1, Math.round(v * k)) : Math.round(v * k);
    out[stat] = (out[stat] || 0) + val;
  }
  return out;
}
// enhanced class items are one rarity higher (a Heroic Skitterra enhancement is Legendary)
const itemRarity = inst => { const it = ITEMS[inst.key]; return Math.min(4, TIERS[it.tier].rarity + (inst.q ? 1 : 0) + (ITEM_PERKS[inst.key] ? 1 : 0)); };
const itemLevel = inst => { const it = ITEMS[inst.key]; return TIERS[it.tier].ilvl + (inst.q ? 5 : 0); };

// can this class put this item in this slot?  slot: weapon | armor | acc1 | acc2
function canEquip(inst, clsId, slot) {
  const it = ITEMS[inst.key]; if (!it) return false;
  if (slot === 'weapon') return it.slot === 'weapon' && (it.cls ? it.cls === clsId : it.main === CLASS_MAIN[clsId]);
  if (slot === 'armor') return it.slot === 'armor' && (!it.cls || it.cls === clsId);
  if (slot === 'acc1' || slot === 'acc2') return it.slot === 'accessory';
  return false;
}
function slotsFor(inst) {
  const it = ITEMS[inst.key];
  return !it ? [] : it.slot === 'accessory' ? ['acc1', 'acc2'] : [it.slot];
}

// totals from a loadout ({ weapon, armor, acc1, acc2 } -> instances), capped
function gearTotals(clsId, insts) {
  const t = { hp: 0, phys: 0, mag: 0, def: 0, haste: 0, crit: 0 };
  for (const inst of insts) if (inst) for (const [s, v] of Object.entries(itemStats(inst, clsId))) t[s] += v;
  for (const s in t) t[s] = Math.min(GEAR_CAPS[s], t[s]);
  return t;
}
// what the combat engine and the host use
function gearMods(clsId, t, insts = []) {
  const main = CLASS_MAIN[clsId] || 'phys';
  const perks = new Set(insts.filter(i => i && ITEM_PERKS[i.key] && ITEMS[i.key].cls === clsId).map(i => i.key));
  return { power: (t[main] || 0) / 1000, crit: (t.crit || 0) / 100, haste: (t.haste || 0) / 100, hp: t.hp || 0, def: (t.def || 0) / 1000, perks };
}
// host side: never trust a client's numbers beyond the caps
function sanitizeGear(s) {
  const out = {};
  for (const k of Object.keys(GEAR_CAPS)) { const v = s && Number(s[k]); out[k] = Number.isFinite(v) ? Math.max(0, Math.min(GEAR_CAPS[k], v)) : 0; }
  return out;
}

// Party bonuses: when 2, 3 or 4 people in the group each wear at least one item from the same boss, the whole party
// (bots too) gets that boss's bonus for the fight. Recruit gear has none, and someone wearing gear from two bosses
// counts toward both. Small on purpose, like the rest of gear. The host counts it when the raid starts.
//   hp: max HP (host)   dmg: damage dealt   crit / haste: added to everyone's own
const PARTY_BONUS = {
  1: { name: 'Kitchen Crew', boss: 'Grubnak', flavor: 'Nobody leaves the ogre\'s kitchen hungry.',
    tiers: { 2: { hp: 0.03 }, 3: { hp: 0.03, dmg: 0.02 }, 4: { hp: 0.05, dmg: 0.03 } } },
  2: { name: 'Brood Bond', boss: 'Skitterra', flavor: 'Hunt like a brood, strike like one.',
    tiers: { 2: { crit: 0.02 }, 3: { crit: 0.02, haste: 0.02 }, 4: { crit: 0.03, haste: 0.03 } } },
};
const BONUS_STAT = { hp: 'max HP', dmg: 'damage', crit: 'critical chance', haste: 'haste' };
const bonusText = m => Object.entries(m).map(([k, v]) => `+${Math.round(v * 100)}% ${BONUS_STAT[k]}`).join(', ');
// which bosses' party bonuses an equipped loadout counts toward
function gearSources(insts) {
  const out = new Set();
  for (const i of insts) { const it = i && ITEMS[i.key]; if (it && PARTY_BONUS[it.tier]) out.add(it.tier); }
  return [...out].sort();
}
// host side: a client's list of sources, cleaned
const sanitizeSources = s => (Array.isArray(s) ? [...new Set(s.map(Number).filter(t => PARTY_BONUS[t]))].sort() : []);
// counts: { tier: how many people wear it } -> the combined bonus and what's active
function partyBonus(counts) {
  const out = { hp: 0, dmg: 0, crit: 0, haste: 0, active: [] };
  for (const [tier, def] of Object.entries(PARTY_BONUS)) {
    const n = Math.min(4, (counts && counts[tier]) | 0), m = def.tiers[n];
    if (!m) continue;
    for (const k in m) out[k] += m[k];
    out.active.push({ tier: +tier, name: def.name, n, text: bonusText(m) });
  }
  return out;
}

// loot from a clear: more for your own class, Hard gives two drops of higher quality
const BOSS_TIER = { grubnak: 1, skitterra: 2 };
function rollLoot(bossId, mode, clsId, rng) {
  const tier = BOSS_TIER[bossId] || 1, q = mode === 'hard' ? 1 : 0, out = [];
  const general = Object.values(ITEMS).filter(it => !it.cls && it.tier === tier);
  for (let n = 0; n < (q ? 2 : 1); n++) {
    let key;
    if (rng() < 0.55) key = `${clsId}_${rng() < 0.5 ? 'w' : 'a'}${tier}`;
    else {
      const usable = general.filter(it => it.slot !== 'weapon' || it.main === CLASS_MAIN[clsId]);
      key = usable[Math.floor(rng() * usable.length)].key;
    }
    out.push({ key, q });
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { ITEMS, GEAR_CAPS, CLASS_MAIN, RARITY, itemStats, canEquip, gearTotals, gearMods, sanitizeGear, rollLoot,
  PARTY_BONUS, gearSources, sanitizeSources, partyBonus };
