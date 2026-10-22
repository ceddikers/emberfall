// Items, gear stats and loot. Pure data + math (no DOM), so the host and every client agree.
//
// Slots: weapon, armor, two accessories. Stats:
//   hp     flat max HP (host applies it)              phys / mag  main stat; each class reads one (1 pt = +0.1% damage and healing)
//   def    1 pt = 0.1% less damage taken (host)       haste / crit  percent
// Gear is deliberately modest (best-in-slot is roughly +15-25% output) so fights stay about mechanics.
//
// Rarity is a property of the item: each rarity is its own set of items. Power comes from rarity, not from which
// boss dropped it, so a Grubnak Legendary is as strong as a Hollow King Legendary.
//   Common     starter (Recruit) gear only          Uncommon   a clean stat line
//   Rare       stats + a small effect               Legendary  a strong effect (class enhancements live here)
//   Mythic     a build-defining effect (two per boss)

const GEAR_CAPS = { hp: 150, phys: 150, mag: 150, def: 100, haste: 10, crit: 10 };
const CLASS_MAIN = {
  bastion: 'phys', bloodreaver: 'phys', ranger: 'phys', shadowblade: 'phys',
  runeguard: 'mag', pyromancer: 'mag', cleric: 'mag', grovekeeper: 'mag', chronomancer: 'mag',
};
// power: the stat budget; ilvl: shown in tooltips; sell: gold in the inventory; salvage: gold each human gets when
// everyone passes on a chest item
const RARITY = [
  { name: 'Common', color: '#b3aea3', power: 0.4, ilvl: 1, sell: 2, salvage: 1 },
  { name: 'Uncommon', color: '#4f9cff', power: 1.0, ilvl: 30, sell: 8, salvage: 2 },
  { name: 'Rare', color: '#b06cff', power: 1.15, ilvl: 33, sell: 15, salvage: 4 },
  { name: 'Legendary', color: '#ff9a3a', power: 1.3, ilvl: 36, sell: 30, salvage: 8 },
  { name: 'Mythic', color: '#ff4f4a', power: 1.45, ilvl: 40, sell: 60, salvage: 15 },
];
const R_COMMON = 0, R_UNCOMMON = 1, R_RARE = 2, R_LEGENDARY = 3, R_MYTHIC = 4;
const STAT_INFO = {
  hp: { name: 'HP', fmt: v => `+${v}` },
  phys: { name: 'Physical', fmt: v => `+${v}` },
  mag: { name: 'Magical', fmt: v => `+${v}` },
  def: { name: 'Defense', fmt: v => `+${v}` },
  haste: { name: 'Haste', fmt: v => `+${v}%` },
  crit: { name: 'Critical', fmt: v => `+${v}%` },
};

// Where an item comes from (an item's `tier`). Every boss drops gear of the same strength: there is no ladder where one
// fight's loot replaces the last. Bosses differ in themes, effects and party bonuses, not in how good their gear is.
const TIERS = { 0: { name: 'Recruit' }, 1: { name: 'Grubnak' }, 2: { name: 'Skitterra' }, 3: { name: 'Volkar' }, 4: { name: 'Hollow King' },
  5: { name: 'Vhalgrath' }, 6: { name: 'Hrimgar' }, 7: { name: 'Azerath' }, 8: { name: 'The Hydra' } };

const CLASS_GEAR = {
  bastion: { wtype: 'sword', w: ["Recruit's Arming Sword", 'Cleaverguard Sword', 'Silkrend Oathblade', 'Stormward Oathblade', 'Barrowking Oathblade'], a: ['Iron Skillet Plate', 'Broodwarden Plate', 'Thunderforged Plate', 'Gravewarden Plate'] },
  bloodreaver: { wtype: 'axe', w: ["Recruit's Hatchet", "Butcher's Greataxe", 'Fangreaver Axe', 'Skysplitter Axe', 'Kingslayer Greataxe'], a: ['Bloodstained Apron Mail', 'Chitin Ravager Harness', 'Stormrent Harness', 'Barrow Reaver Mail'] },
  runeguard: { wtype: 'focus', w: ["Recruit's Rune Focus", 'Spiced Rune Focus', 'Eight-Eyed Ward Focus', 'Lodestone Rune Focus', 'Crown-Rune Focus'], a: ['Simmerweave Robes', 'Silkward Robes', 'Galeweave Robes', 'Tombward Robes'] },
  ranger: { wtype: 'bow', w: ["Recruit's Shortbow", 'Hickory Kitchen Bow', 'Silkstring Longbow', 'Thunderhead Longbow', 'Moonset Longbow'], a: ['Smoked Leather Jerkin', 'Webstalker Cloak', 'Windrunner Cloak', 'Nightwatch Cloak'] },
  shadowblade: { wtype: 'daggers', w: ["Recruit's Knives", 'Paring Knives', 'Twin Fangs', 'Stormcut Knives', 'Lantern-Thief Knives'], a: ['Pantry Shadow Garb', "Widow's Wrap", 'Galeshroud Garb', 'Shroud of the Long Night'] },
  pyromancer: { wtype: 'tome', w: ["Recruit's Primer", 'Grease Fire Grimoire', 'Venomflame Tome', 'Tome of the Burning Sky', 'Tome of the Last Lantern'], a: ['Charred Chef Robes', 'Broodfire Vestments', 'Stormfire Vestments', 'Candlewax Vestments'] },
  cleric: { wtype: 'sunstaff', w: ["Recruit's Sunstaff", 'Dawnladle Staff', 'Sunweb Staff', 'Skylight Staff', 'Staff of the Dawn After'], a: ['Linen of the Hearth', 'Silken Vestments of Dawn', 'Vestments of the Clear Sky', 'Vestments of the Unsetting Sun'] },
  grovekeeper: { wtype: 'branch', w: ["Recruit's Branch", 'Herb Garden Staff', 'Mossweb Staff', 'Stormstruck Oak', 'Barrow Yew'], a: ['Rootcellar Robes', "Spinner's Bark Mantle", 'Rainwood Mantle', 'Gravemoss Mantle'] },
  chronomancer: { wtype: 'hourglass', w: ["Recruit's Chronoglass", 'Kitchen Timer Chronoglass', 'Eightfold Hourglass', 'Storm-Eye Hourglass', 'Moonset Hourglass'], a: ['Simmering Moment Robes', 'Silken Second Robes', 'Robes of the Still Moment', 'Robes of the Final Hour'] },
};

// Alembist (classes-b): a retort for a weapon, work coats for armour
CLASS_MAIN.alembist = 'mag';
CLASS_GEAR.alembist = { wtype: 'retort', w: ["Recruit's Retort", 'Stockpot Retort', 'Venomglass Retort', 'Stormcatcher Retort', 'Barrow-Lamp Retort'], a: ['Grease-Spattered Apron', 'Silk-Lined Lab Coat', 'Oilskin Coat of the Summit', 'Gravedust Smock'] };

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
  // Volkar (tier 3): the storm in the weapon, on a big cooldown
  bastion_w3: { ab: 'bulwark', text: 'Bulwark also shields the whole party.' },
  bloodreaver_w3: { ab: 'frenzy', text: 'Frenzy gives 30 Blood.' },
  runeguard_w3: { ab: 'overload', text: 'Runic Overload gives 2 Runes.' },
  ranger_w3: { ab: 'barrage', text: 'Barrage also lights up Keen Eye.' },
  shadowblade_w3: { ab: 'dance', text: 'Shadow Dance gives 2 combo points.' },
  pyromancer_w3: { ab: 'combust', text: "Combustion refills Fire Blast's charges." },
  cleric_w3: { ab: 'prayer', text: 'Prayer Circle cuts damage by 15% instead of 10%.' },
  grovekeeper_w3: { ab: 'growth', text: 'Wild Growth gives 25 Bloom.' },
  chronomancer_w3: { ab: 'accel', text: 'Accelerando also heals the whole party.' },
  // the Hollow King (tier 4): the barrow's armour, each with something of the old court in it
  bastion_a4: { ab: 'bulwark', text: 'Bulwark cuts damage by 50% instead of 40%.' },
  bloodreaver_a4: { ab: 'letting', text: 'Bloodletting also heals you for 5% of your HP.' },
  runeguard_a4: { ab: 'ward', text: 'Runic Ward lasts 12s instead of 8s.' },
  ranger_a4: { ab: 'rapid', text: 'Rapid Fire hits 15% harder.' },
  shadowblade_a4: { ab: 'step', text: 'Shadowstep\'s True North lasts 8s instead of 5s.' },
  pyromancer_a4: { ab: 'combust', text: 'Combustion lasts 13s instead of 10s.' },
  cleric_a4: { ab: 'prayer', text: 'Prayer Circle\'s regen is 50% stronger.' },
  grovekeeper_a4: { ab: 'thorn', text: 'Thornlash also grows 5 Bloom.' },
  chronomancer_a4: { ab: 'rewind', text: 'Rewind reaches back 6 seconds instead of 4.' },
};
// Alembist (classes-b): one per drop, like every class (Grubnak w1, Skitterra a2 + w2, Volkar w3, the Hollow King a4)
Object.assign(ITEM_PERKS, {
  alembist_w1: { ab: 'dew', text: 'A Mending Draught splashes 20% wider.' },
  alembist_a2: { ab: 'salt', text: 'A Salt Ward lasts 2s longer.' },
  alembist_w2: { ab: 'ember', text: 'A Fire Bomb also leaves the enemy burning for 6s.' },
  alembist_w3: { ab: 'batch', text: 'Grand Batch also brings Distill back.' },
  alembist_a4: { ab: 'distill', text: 'Distill also makes the next vial you brew start fully ripe.' },
});

// ---------------------------------------------------------------- advanced classes: Thermist and Driftblade
// Their class gear follows the same pattern as everyone's: a Common Recruit weapon, Legendary enhanced pieces and Rare
// pieces with their boss's effect. Weapon shapes: 'crux' (two orbs, fire and frost, on one haft) and 'sabre'.
Object.assign(CLASS_MAIN, { thermist: 'mag', driftblade: 'phys' });
Object.assign(CLASS_GEAR, {
  thermist: { wtype: 'crux', w: ["Recruit's Thermocrux", 'Simmer-and-Chill Crux', 'Frostweb Crux', 'Thunderthaw Crux', 'Crux of the Cold Hearth'], a: ['Hearthfrost Robes', 'Silkfrost Robes', 'Stormthaw Robes', 'Robes of the Banked Ember'] },
  driftblade: { wtype: 'sabre', w: ["Recruit's Sabre", 'Filleting Sabre', 'Silkwind Sabre', 'Galecutter Sabre', 'Sabre of the Last Wind'], a: ['Kitchen-Runner Leathers', 'Webdancer Leathers', 'Squall-Rider Leathers', 'Barrowwind Leathers'] },
});
Object.assign(ITEM_PERKS, {
  thermist_w1: { ab: 'cinder', text: 'Cinder Bolt hits 20% harder at +3 or hotter.' },
  thermist_a2: { ab: 'equil', text: 'Equilibrium\'s shield is 50% stronger.' },
  thermist_w2: { ab: 'invert', text: 'Inversion\'s Thermal Shock is 30% stronger.' },
  thermist_w3: { ab: 'lance', text: 'Glacier Lance hits 15% harder at -3 or colder.' },
  thermist_a4: { ab: 'invert', text: 'Inversion\'s Attunement lasts 14s instead of 10s.' },
  driftblade_w1: { ab: 'carve', text: 'Carve\'s follow-through cut hits for 50% instead of 30%.' },
  driftblade_a2: { ab: 'still', text: 'Stillpoint also gives 20 Drift.' },
  driftblade_w2: { ab: 'cross', text: 'A Crosswind at 90 Drift or more strikes a second time for 30%.' },
  driftblade_w3: { ab: 'gale', text: 'Gale Run lasts 15s instead of 12s.' },
  driftblade_a4: { ab: 'slip', text: 'Slipstream gives 25 Drift instead of 15.' },
});

// ---------------------------------------------------------------- advanced tanks: Gorgemaw and Oathbroker (tanks-2)
// Weapon shapes: 'gauntlet' (a great bronze fist) and 'stampmace' (a mace with a square seal for a head).
Object.assign(CLASS_MAIN, { gorgemaw: 'phys', oathbroker: 'phys' });
Object.assign(CLASS_GEAR, {
  gorgemaw: { wtype: 'gauntlet', w: ["Recruit's Gauntlets", 'Larder-Door Gauntlets', 'Silkgut Gauntlets', 'Thunderbelly Gauntlets', 'Gauntlets of the Last Feast'], a: ["Butcher's Belly-Plate", 'Chitin Paunch', 'Stormhide Gut-Guard', 'Barrow-Bronze Girth'] },
  oathbroker: { wtype: 'stampmace', w: ["Recruit's Seal", "Quartermaster's Seal", 'Webbed Writ-Seal', 'Stormsworn Seal', 'Seal of the Last Account'], a: ['Pantry-Ledger Surcoat', 'Silk-Bound Surcoat', 'Thunder-Notary Surcoat', 'Surcoat of the Unpaid Court'] },
});
Object.assign(ITEM_PERKS, {
  gorgemaw_w1: { ab: 'gnash', text: 'Gulp heals 3.5% of your HP instead of 2%.' },
  gorgemaw_a2: { ab: 'wide', text: 'Open Wide stays open 0.4s longer.' },
  gorgemaw_w2: { ab: 'spit', text: 'A critical Spit hits again for about 60.' },
  gorgemaw_w3: { ab: 'bottomless', text: 'Bottomless also shields the party.' },
  gorgemaw_a4: { ab: 'iron', text: 'Iron Gut takes 50% off instead of 40%.' },
  oathbroker_w1: { ab: 'collect', text: 'Your combo pays down 50% more of the Ledger.' },
  oathbroker_a2: { ab: 'reneg', text: 'Renegotiate also shields you.' },
  oathbroker_w2: { ab: 'settle', text: 'Settle also heals you for 5% of your HP.' },
  oathbroker_w3: { ab: 'lien', text: 'Lien lasts 13s instead of 10s (a Guarantor\'s bond 13s instead of 10s).' },
  oathbroker_a4: { ab: 'default', text: 'After Default the Ledger is closed for 7s instead of 10s.' },
});
// ---------------------------------------------------------------- Ironpalm (tank): iron knuckle wraps for a weapon, gis for armour
CLASS_MAIN.ironpalm = 'phys';
CLASS_GEAR.ironpalm = { wtype: 'wraps', w: ["Recruit's Knuckle Wraps", 'Butcher-Twine Wraps', 'Silk-Bound Iron Wraps', 'Thunder-Iron Wraps', 'Wraps of the Barrow Monk'], a: ['Scullery Gi', 'Webweave Gi', 'Stormcloud Gi', 'Gravestill Gi'] };
Object.assign(ITEM_PERKS, {
  ironpalm_w1: { ab: 'palm', text: 'Crane Step gives 30 Breath instead of 22.' },
  ironpalm_a2: { ab: 'read', text: 'A perfect Read also shields you for about 8% of your HP.' },
  ironpalm_w2: { ab: 'fist', text: 'Thousand Palms strikes a sixth time, for 30% of a strike.' },
  ironpalm_w3: { ab: 'bell', text: 'Temple Bell\'s Second Wind lasts 20s instead of 15s.' },
  ironpalm_a4: { ab: 'skin', text: 'Iron Skin cuts damage by 50% instead of 40%.' },
});

// ---------------------------------------------------------------- Threadweaver and Marionettist (classes-c)
// Weapon shapes: 'needle' (a rapier-long sewing needle trailing thread) and 'controlbar' (a puppeteer's wooden cross).
Object.assign(CLASS_MAIN, { threadweaver: 'mag', marionettist: 'phys' });
Object.assign(CLASS_GEAR, {
  threadweaver: { wtype: 'needle', w: ["Recruit's Needle", 'Trussing Needle', 'Silkspinner Needle', 'Stormstitch Needle', 'Shroudmaker\'s Needle'], a: ['Patchwork Shawl', 'Cobweb-Lace Shawl', 'Windwoven Shawl', 'Shawl of the Last Stitch'] },
  marionettist: { wtype: 'controlbar', w: ["Recruit's Control Bar", 'Butcher-Twine Control Bar', 'Silk-Strung Control Bar', 'Lightning-Wire Control Bar', 'Control Bar of the Dead Court'], a: ['Stagehand Blacks', 'Gossamer Blacks', 'Stormproof Blacks', 'Blacks of the Final Act'] },
});
Object.assign(ITEM_PERKS, {
  threadweaver_w1: { ab: 'needle', text: 'Needle\'s tug heals 30% more.' },
  threadweaver_a2: { ab: 'tie', text: 'Tie also shields the ally you tie.' },
  threadweaver_w2: { ab: 'mend', text: 'A Mend Seam that spends Spool heals 20% more.' },
  threadweaver_w3: { ab: 'snip', text: 'Snap releases 25% more of what each thread carried.' },
  threadweaver_a4: { ab: 'tapestry', text: 'Tapestry lasts 10s instead of 8s.' },
  marionettist_w1: { ab: 'jab', text: 'Jab hits 15% harder.' },
  marionettist_a2: { ab: 'swap', text: 'Swap also mends a torn String.' },
  marionettist_w2: { ab: 'cross', text: 'A Cross-Cut that crosses the enemy builds 3 Encore instead of 2.' },
  marionettist_w3: { ab: 'finale', text: 'Grand Finale\'s routine has six hits instead of five.' },
  marionettist_a4: { ab: 'pirouette', text: 'Nothing can touch the Doll for 3s after Pirouette instead of 1.5s.' },
});

// ---------------------------------------------------------------- Gloomsworn (tank, class 18)
// Weapon shape: 'duskblade' (a black greatsword with a violet edge). Placeholder item art until the painted set is in.
CLASS_MAIN.gloomsworn = 'phys';
CLASS_GEAR.gloomsworn = { wtype: 'duskblade', w: ["Recruit's Greatsword", 'Carving-Hall Greatsword', 'Silkcleaver Greatsword', 'Stormbled Greatsword', 'Greatsword of the Unsetting Vigil'], a: ['Scullery-Night Plate', 'Webwatch Plate', 'Stormvigil Plate', 'Plate of the Hollow Watch'] };
Object.assign(ITEM_PERKS, {
  gloomsworn_w1: { ab: 'rend', text: 'Every hit you land fills 10 Gloom instead of 8.' },
  gloomsworn_a2: { ab: 'strike', text: 'The barrier of Gloom Strike is 50% stronger.' },
  gloomsworn_w2: { ab: 'shade', text: 'Shade Step gives three echoes instead of two.' },
  gloomsworn_w3: { ab: 'pall', text: 'Black Pall lasts 8s instead of 6s.' },
  gloomsworn_a4: { ab: 'mantle', text: 'Black Mantle takes 50% off instead of 40%.' },
});

// ---------------------------------------------------------------- Thresher (damage, class 19)
// Weapon shape: 'scythe' (a long snath, a green-black blade). Placeholder item art until the painted set is in.
CLASS_MAIN.thresher = 'phys';
CLASS_GEAR.thresher = { wtype: 'scythe', w: ["Recruit's Sickle", 'Carving-Hall Scythe', 'Silkcleaver Scythe', 'Stormbled Scythe', 'Scythe of the Last Harvest'], a: ['Scullery-Night Leathers', 'Webwatch Leathers', 'Stormvigil Leathers', 'Leathers of the Hollow Harvest'] };
Object.assign(ITEM_PERKS, {
  thresher_w1: { ab: 'slash', text: 'A Backswing cuts for 50% more.' },
  thresher_a2: { ab: 'reap', text: 'A rotten affliction pays 80% instead of 65%.' },
  thresher_w2: { ab: 'hook', text: 'Hook ages the afflictions by 2.5s instead of 1.5s.' },
  thresher_w3: { ab: 'wisp', text: 'Spirit Wisp lasts 20s instead of 15s.' },
  thresher_a4: { ab: 'blink', text: 'Gloam Blink takes 70% off for 1s instead of 50%.' },
});

// ---------------------------------------------------------------- item effects
// Effects are data. The combat engine runs them in your own kit (Kit.itemHook / Kit.fxMod in engine.js), like the
// enhancements; the host only ever sees the ordinary combat events they cause. An effect is either
//   a trigger:   { on: <FX_TRIGGERS>, chance?, icd? (seconds between procs), ...actions }
//   a condition: { while: <FX_CONDITIONS>, frac?, ...mods }   (always on while it holds)
// Actions: strike (extra hit, potency), mend (heal yourself, share of max HP), ward (shield yourself, potency, `dur`),
//          cdr (seconds off your other oGCD cooldowns), buff ({ mods } for `dur` s, up to `stacks`, shown as `name`).
// Mods (conditions and buffs): dmg, heal (healing and shields), crit, haste (fractions), recast (oGCD cooldowns shorter).
const FX_TRIGGERS = {
  crit: 'a critical hit or heal', gcd: 'a GCD', ogcd: 'an oGCD', heal: 'a heal or shield you cast',
  dash: 'a dash', gain: 'building your gauge (every 10 points of a gauge that fills on its own)',
};
const FX_CONDITIONS = { always: 'always', hpAbove: 'your HP above frac', hpBelow: 'your HP below frac' };
const FX_ACTIONS = ['strike', 'mend', 'ward', 'cdr', 'buff'];
const FX_MODS = ['dmg', 'heal', 'crit', 'haste', 'recast'];
const FX_KEYS = new Set(['on', 'while', 'frac', 'chance', 'icd', 'dur', 'stacks', 'name', 'id', ...FX_ACTIONS, ...FX_MODS]);

// the small effect every Rare class item of a boss shares (only bosses whose class drops include a non-enhanced piece)
const CLASS_FX = {
  1: { fx: [{ on: 'dash', icd: 10, mend: 0.03 }], fxText: 'Second Helping: after you dash, recover 3% of your HP (once every 10 s).' },
  3: { fx: [{ on: 'ogcd', icd: 2, strike: 60 }], fxText: 'Static: each oGCD you use crackles for about 30 extra damage.' },
  4: { fx: [{ on: 'ogcd', buff: { dmg: 0.03 }, dur: 6, name: "Court's Favour" }], fxText: "Court's Favour: each oGCD you use gives +3% damage for 6 s." },
};

// Base stat lines at power 1.0 (an Uncommon). Rarity scales the whole line (RARITY[r].power), so the budget grows
// 1.0 / 1.15 / 1.3 / 1.45. General drops are as strong as class drops overall: each spends the same budget, just on a
// different mix. A class drop's edge is 5% on its stats. Budgets: weapon 80 main + 3 points of crit/haste; armour
// 125 HP + defence; accessory 12 main + 3 crit/haste, or a defensive charm of 75 HP + defence.
const BASE = {
  weapon: { main: 80, crit: 2, haste: 1 },
  armor: { hp: 75, def: 50 },
};
const CLASS_EDGE = 1.05;

const ITEMS = {};
(function buildItems() {
  const edge = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v * CLASS_EDGE]));
  // class items: Recruit weapons are Common; an enhanced piece is Legendary; the other piece is Rare with its boss's effect
  const classRarity = (key, tier) => (tier === 0 ? R_COMMON : ITEM_PERKS[key] ? R_LEGENDARY : R_RARE);
  const classFx = (key, tier) => (tier && !ITEM_PERKS[key] && CLASS_FX[tier] ? { fx: CLASS_FX[tier].fx.map(e => Object.assign({}, e)), fxText: CLASS_FX[tier].fxText } : {});
  for (const [cls, g] of Object.entries(CLASS_GEAR)) {
    g.w.forEach((name, tier) => { const key = `${cls}_w${tier}`; ITEMS[key] = Object.assign({ key, name, slot: 'weapon', cls, main: CLASS_MAIN[cls], wtype: g.wtype, tier, rarity: classRarity(key, tier), base: edge(BASE.weapon) }, classFx(key, tier)); });
    g.a.forEach((name, i) => { const tier = i + 1, key = `${cls}_a${tier}`; ITEMS[key] = Object.assign({ key, name, slot: 'armor', cls, tier, atype: 'class', rarity: classRarity(key, tier), base: edge(BASE.armor) }, classFx(key, tier)); });
  }
  const U = R_UNCOMMON, R = R_RARE, L = R_LEGENDARY, M = R_MYTHIC;
  const gen = [
    // Recruit
    { key: 'g_coat', name: "Traveler's Coat", slot: 'armor', tier: 0, rarity: R_COMMON, atype: 'coat', base: { hp: 75, def: 50 } },

    // Grubnak: the ogre's kitchen. Hearty: healing yourself, staying well fed.
    { key: 'g_cleaver', name: "Butcher's Cleaver", slot: 'weapon', main: 'phys', wtype: 'cleaver', tier: 1, rarity: U, base: { main: 84, crit: 3 } },
    { key: 'g_ladle', name: 'Simmering Ladle', slot: 'weapon', main: 'mag', wtype: 'ladle', tier: 1, rarity: U, base: { main: 84, crit: 3 } },
    { key: 'g_apron', name: 'Apron of the Kitchen Guard', slot: 'armor', tier: 1, rarity: U, atype: 'apron', base: { hp: 95, def: 35 } },
    { key: 'g_pepper', name: 'Peppercorn Ring', slot: 'accessory', atype: 'ring', tier: 1, rarity: R, base: { crit: 3, main: 12 },
      fx: [{ on: 'crit', icd: 4, strike: 40 }], fxText: 'Your critical hits add a peppery sting: about 20 extra damage, once every 4 s.' },
    { key: 'g_timer', name: 'Egg Timer Pendant', slot: 'accessory', atype: 'amulet', tier: 1, rarity: L, base: { haste: 3, main: 12 },
      fx: [{ on: 'ogcd', cdr: 2 }], fxText: 'Every oGCD you use takes 2 s off your other oGCD cooldowns.' },
    { key: 'm_stockpot', name: "The Ogre's Stockpot", slot: 'accessory', atype: 'pot', tier: 1, rarity: M, base: { main: 12, crit: 3 },
      fx: [{ on: 'gcd', icd: 12, strike: 120, mend: 0.03 }], fxText: 'Seconds: every 12 s, your next GCD deals about 60 extra damage and you recover 3% of your HP.' },
    { key: 'm_whites', name: "Head Chef's Whites", slot: 'armor', atype: 'whites', tier: 1, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ while: 'hpAbove', frac: 0.7, dmg: 0.06, heal: 0.06 }], fxText: 'Well Fed: while above 70% HP, +6% damage and healing.' },

    // Skitterra: the brood. Critical hits, venom, quickness.
    { key: 'g_fang', name: 'Fang Shortblade', slot: 'weapon', main: 'phys', wtype: 'fang', tier: 2, rarity: U, base: { main: 80, haste: 4 } },
    { key: 'g_wand', name: 'Silkspun Wand', slot: 'weapon', main: 'mag', wtype: 'wand', tier: 2, rarity: U, base: { main: 80, haste: 4 } },
    { key: 'g_hauberk', name: 'Chitin Hauberk', slot: 'armor', tier: 2, rarity: U, atype: 'chitin', base: { hp: 60, def: 65 } },
    { key: 'g_band', name: 'Eightfold Band', slot: 'accessory', atype: 'ring', tier: 2, rarity: R, base: { haste: 3, main: 12 },
      fx: [{ on: 'gcd', chance: 0.15, buff: { crit: 0.06 }, dur: 8, name: 'Eightfold Eye' }], fxText: 'Your GCDs have a 15% chance to give +6% critical chance for 8 s.' },
    { key: 'g_silk', name: 'Silkguard Charm', slot: 'accessory', atype: 'charm', tier: 2, rarity: R, base: { hp: 45, def: 30 },
      fx: [{ on: 'heal', icd: 12, ward: 120, dur: 8 }], fxText: 'Healing or shielding anyone spins you a silk ward of about 60 for 8 s (once every 12 s).' },
    { key: 'g_venom', name: 'Venom Pendant', slot: 'accessory', atype: 'amulet', tier: 2, rarity: L, base: { crit: 3, main: 12 },
      fx: [{ on: 'crit', icd: 3, strike: 60 }], fxText: 'Your critical hits inject venom: about 30 extra damage, once every 3 s.' },
    { key: 'm_broodeye', name: 'Eye of the Broodmother', slot: 'accessory', atype: 'broodeye', tier: 2, rarity: M, base: { main: 12, haste: 3 },
      fx: [{ on: 'crit', buff: { haste: 0.015 }, dur: 10, stacks: 6, name: 'Brood Frenzy' }], fxText: 'Each critical hit gives Brood Frenzy: +1.5% haste for 10 s, stacking up to 6 times.' },
    { key: 'm_venomweave', name: 'Venomweave Shroud', slot: 'armor', atype: 'venomweave', tier: 2, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ on: 'gcd', chance: 0.3, strike: 70 }], fxText: 'Each GCD has a 30% chance to bite for about 35 extra damage.' },

    // Volkar: the storm. Dashing, cooldowns, lightning.
    { key: 'g_maul', name: 'Thunderstone Maul', slot: 'weapon', main: 'phys', wtype: 'maul', tier: 3, rarity: U, base: { main: 76, crit: 2, haste: 3 } },
    { key: 'g_rod', name: 'Lightning Rod Scepter', slot: 'weapon', main: 'mag', wtype: 'scepter', tier: 3, rarity: U, base: { main: 76, crit: 2, haste: 3 } },
    { key: 'g_slate', name: 'Slatescale Mail', slot: 'armor', tier: 3, rarity: U, atype: 'scale', base: { hp: 70, def: 45, haste: 1 } },
    { key: 'g_polar', name: 'Polarity Ring', slot: 'accessory', atype: 'ring', tier: 3, rarity: R, base: { crit: 2, haste: 2, main: 8 },
      fx: [{ on: 'gain', icd: 6, buff: { haste: 0.03 }, dur: 6, name: 'Charged' }], fxText: 'Building your gauge charges you: +3% haste for 6 s (at most once every 6 s).' },
    { key: 'g_iron', name: 'Grounding Charm', slot: 'accessory', atype: 'charm', tier: 3, rarity: R, base: { hp: 35, def: 40 },
      fx: [{ on: 'dash', icd: 8, ward: 100, dur: 5 }], fxText: 'After you dash, a grounding ward absorbs about 50 damage for 5 s (once every 8 s).' },
    { key: 'g_eye', name: 'Eye of the Storm', slot: 'accessory', atype: 'amulet', tier: 3, rarity: L, base: { haste: 4, main: 6 },
      fx: [{ while: 'always', recast: 0.08 }], fxText: 'Your oGCD cooldowns are 8% shorter.' },
    { key: 'm_torc', name: "Stormcaller's Torc", slot: 'accessory', atype: 'torc', tier: 3, rarity: M, base: { main: 12, haste: 3 },
      fx: [{ on: 'dash', buff: { haste: 0.08, dmg: 0.04 }, dur: 5, name: 'Tailwind' }], fxText: 'Tailwind: each dash gives +8% haste and +4% damage for 5 s.' },
    { key: 'm_thunderhead', name: 'Thunderhead Mantle', slot: 'armor', atype: 'thunderhead', tier: 3, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ on: 'crit', icd: 5, strike: 80, cdr: 1 }], fxText: 'Lightning answers your critical hits: about 40 extra damage and 1 s off your oGCD cooldowns (once every 5 s).' },

    // the Hollow King: the dead court. Risk, crowns, oGCDs.
    { key: 'g_crown', name: 'Hollow Crown Greatsword', slot: 'weapon', main: 'phys', wtype: 'greatsword', tier: 4, rarity: U, base: { main: 92, crit: 1 } },
    { key: 'g_sceptre', name: 'Sceptre of the Barrow', slot: 'weapon', main: 'mag', wtype: 'royal', tier: 4, rarity: U, base: { main: 92, haste: 1 } },
    { key: 'g_shroud', name: 'Royal Burial Shroud', slot: 'armor', tier: 4, rarity: U, atype: 'shroud', base: { hp: 70, def: 45, crit: 1 } },
    { key: 'g_signet', name: 'Signet of the Hollow King', slot: 'accessory', atype: 'ring', tier: 4, rarity: R, base: { crit: 4, main: 6 },
      fx: [{ while: 'hpAbove', frac: 0.8, crit: 0.03 }], fxText: 'While above 80% HP: +3% critical chance.' },
    { key: 'g_lantern', name: 'Last Lantern Charm', slot: 'accessory', atype: 'lantern', tier: 4, rarity: R, base: { hp: 55, def: 20 },
      fx: [{ while: 'hpBelow', frac: 0.5, heal: 0.1 }], fxText: 'While below 50% HP, your healing and shields are 10% stronger.' },
    { key: 'g_bell', name: 'Barrow Bell Pendant', slot: 'accessory', atype: 'amulet', tier: 4, rarity: L, base: { main: 20, crit: 1 },
      fx: [{ on: 'ogcd', icd: 15, buff: { crit: 0.1 }, dur: 6, name: 'Barrow Toll' }], fxText: 'The bell tolls: an oGCD gives +10% critical chance for 6 s (once every 15 s).' },
    { key: 'm_crown', name: 'Crown of the Barrow', slot: 'accessory', atype: 'crown', tier: 4, rarity: M, base: { main: 12, crit: 3 },
      fx: [{ while: 'hpBelow', frac: 0.5, dmg: 0.12, heal: 0.12 }], fxText: 'Kneel to No One: while below 50% HP, +12% damage and healing.' },
    { key: 'm_deadcourt', name: 'Mantle of the Dead Court', slot: 'armor', atype: 'deadcourt', tier: 4, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ while: 'always', recast: 0.1 }, { on: 'ogcd', buff: { dmg: 0.02 }, dur: 10, stacks: 3, name: 'Dead Court' }],
      fxText: 'Your oGCD cooldowns are 10% shorter, and each oGCD you use gives +2% damage for 10 s, stacking 3 times.' },

    // ---- set 2. Every set-2 boss drops general gear only (class pieces come with the painted sets), same budgets as set 1.
    // Vhalgrath, the cinder wyrm: burning, brands and big openers. Icons reuse the closest drawn shapes until the painted set is in.
    { key: 'g_cinderaxe', name: 'Cinderforged Waraxe', slot: 'weapon', main: 'phys', wtype: 'axe', tier: 5, rarity: U, base: { main: 88, crit: 1 } },
    { key: 'g_cinderrod', name: 'Cindersmoke Scepter', slot: 'weapon', main: 'mag', wtype: 'scepter', tier: 5, rarity: U, base: { main: 88, haste: 1 } },
    { key: 'g_ashscale', name: 'Ashscale Hauberk', slot: 'armor', tier: 5, rarity: U, atype: 'scale', base: { hp: 70, def: 45, crit: 1 } },
    { key: 'g_brand', name: 'Wyrmbrand Ring', slot: 'accessory', atype: 'ring', tier: 5, rarity: R, base: { crit: 3, main: 12 },
      fx: [{ on: 'crit', icd: 6, strike: 60 }], fxText: 'Your critical hits brand the target: about 30 extra damage, once every 6 s.' },
    { key: 'g_emberscale', name: 'Emberscale Charm', slot: 'accessory', atype: 'charm', tier: 5, rarity: R, base: { hp: 45, def: 30 },
      fx: [{ on: 'ogcd', icd: 15, ward: 120, dur: 6 }], fxText: 'An oGCD hardens a scale ward of about 60 over you for 6 s (once every 15 s).' },
    { key: 'g_kindle', name: 'Kindling Pendant', slot: 'accessory', atype: 'amulet', tier: 5, rarity: L, base: { crit: 3, main: 12 },
      fx: [{ on: 'gcd', chance: 0.12, buff: { dmg: 0.05 }, dur: 8, name: 'Kindled' }], fxText: 'Your GCDs have a 12% chance to kindle +5% damage for 8 s.' },
    { key: 'm_wyrmheart', name: 'Heart of the Cinder Tyrant', slot: 'accessory', atype: 'torc', tier: 5, rarity: M, base: { main: 12, crit: 3 },
      fx: [{ on: 'crit', buff: { dmg: 0.02 }, dur: 8, stacks: 5, name: 'Wyrmfire' }], fxText: 'Wyrmfire: each critical hit gives +2% damage for 8 s, stacking up to 5 times.' },
    { key: 'm_wyrmhide', name: 'Mantle of Cinder Hide', slot: 'armor', atype: 'thunderhead', tier: 5, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ while: 'hpAbove', frac: 0.6, dmg: 0.05 }, { on: 'dash', icd: 10, ward: 140, dur: 6 }], fxText: 'While above 60% HP, +5% damage. After you dash, a cinder ward of about 70 holds for 6 s (once every 10 s).' },

    // Hrimgar, the frost titan: slows, cold iron and standing your ground.
    { key: 'g_frostmaul', name: 'Rimeforged Maul', slot: 'weapon', main: 'phys', wtype: 'maul', tier: 6, rarity: U, base: { main: 86, haste: 2 } },
    { key: 'g_frostwand', name: 'Icicle Wand', slot: 'weapon', main: 'mag', wtype: 'wand', tier: 6, rarity: U, base: { main: 86, haste: 2 } },
    { key: 'g_glacial', name: 'Glacial Plate', slot: 'armor', tier: 6, rarity: U, atype: 'chitin', base: { hp: 100, def: 40 } },
    { key: 'g_rimering', name: 'Rimefrost Ring', slot: 'accessory', atype: 'ring', tier: 6, rarity: R, base: { haste: 3, main: 12 },
      fx: [{ on: 'gcd', chance: 0.15, buff: { haste: 0.05 }, dur: 6, name: 'Rimed' }], fxText: 'Your GCDs have a 15% chance to give +5% haste for 6 s.' },
    { key: 'g_coldiron', name: 'Cold Iron Charm', slot: 'accessory', atype: 'charm', tier: 6, rarity: R, base: { hp: 50, def: 30 },
      fx: [{ while: 'hpBelow', frac: 0.6, heal: 0.08 }], fxText: 'While below 60% HP, your healing and shields are 8% stronger.' },
    { key: 'g_glaciereye', name: 'Eye of the Glacier', slot: 'accessory', atype: 'amulet', tier: 6, rarity: L, base: { haste: 3, main: 12 },
      fx: [{ on: 'heal', icd: 10, ward: 140, dur: 8 }], fxText: 'Healing or shielding anyone freezes a ward of about 70 over you for 8 s (once every 10 s).' },
    { key: 'm_titanheart', name: 'Heart of the White Reach', slot: 'accessory', atype: 'pot', tier: 6, rarity: M, base: { main: 12, haste: 3 },
      fx: [{ on: 'ogcd', icd: 20, buff: { haste: 0.1, dmg: 0.04 }, dur: 8, name: 'Frostbound' }], fxText: 'Frostbound: an oGCD gives +10% haste and +4% damage for 8 s (once every 20 s).' },
    { key: 'm_titanfur', name: 'Pelt of the Warden', slot: 'armor', atype: 'whites', tier: 6, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ while: 'always', recast: 0.06 }, { while: 'hpAbove', frac: 0.7, heal: 0.06 }], fxText: 'Your oGCD cooldowns are 6% shorter, and above 70% HP your healing and shields are 6% stronger.' },

    // Azerath, the archmage: the seven circles. Cooldowns, wards and arcane bursts.
    { key: 'g_circleblade', name: 'Circlet Blade', slot: 'weapon', main: 'phys', wtype: 'sword', tier: 7, rarity: U, base: { main: 82, crit: 2, haste: 2 } },
    { key: 'g_circlefocus', name: 'Sevenfold Focus', slot: 'weapon', main: 'mag', wtype: 'focus', tier: 7, rarity: U, base: { main: 82, crit: 2, haste: 2 } },
    { key: 'g_circlerobe', name: 'Robes of the Circles', slot: 'armor', tier: 7, rarity: U, atype: 'venomweave', base: { hp: 65, def: 50, haste: 1 } },
    { key: 'g_sigil', name: 'Sigil Ring', slot: 'accessory', atype: 'ring', tier: 7, rarity: R, base: { crit: 2, haste: 2, main: 8 },
      fx: [{ on: 'ogcd', icd: 5, strike: 50 }], fxText: 'Each oGCD you use (at most once every 5 s) flings a sigil for about 25 extra damage.' },
    { key: 'g_wardstone', name: 'Wardstone Charm', slot: 'accessory', atype: 'charm', tier: 7, rarity: R, base: { hp: 40, def: 35 },
      fx: [{ on: 'heal', icd: 12, ward: 110, dur: 8 }], fxText: 'Healing or shielding anyone raises a ward of about 55 over you for 8 s (once every 12 s).' },
    { key: 'g_arcanum', name: 'Arcanum Pendant', slot: 'accessory', atype: 'amulet', tier: 7, rarity: L, base: { haste: 3, main: 12 },
      fx: [{ while: 'always', recast: 0.07 }], fxText: 'Your oGCD cooldowns are 7% shorter.' },
    { key: 'm_seventh', name: 'The Seventh Circle', slot: 'accessory', atype: 'broodeye', tier: 7, rarity: M, base: { main: 12, haste: 3 },
      fx: [{ on: 'ogcd', buff: { crit: 0.02 }, dur: 10, stacks: 6, name: 'Circle' }], fxText: 'Each oGCD you use opens a Circle: +2% critical chance for 10 s, stacking up to 6 times.' },
    { key: 'm_archrobe', name: "Archmage's Vestment", slot: 'armor', atype: 'deadcourt', tier: 7, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ on: 'ogcd', icd: 3, strike: 70, cdr: 0.5 }], fxText: 'Each oGCD you use (at most once every 3 s) bursts for about 35 extra damage and takes 0.5 s off your other oGCD cooldowns.' },

    // The Hydra: nine heads, the drowned deep. Regrowth, venom and sustain.
    { key: 'g_hydrafang', name: 'Hydrafang Glaive', slot: 'weapon', main: 'phys', wtype: 'fang', tier: 8, rarity: U, base: { main: 84, crit: 2, haste: 1 } },
    { key: 'g_hydrastaff', name: 'Mirewood Staff', slot: 'weapon', main: 'mag', wtype: 'branch', tier: 8, rarity: U, base: { main: 84, crit: 2, haste: 1 } },
    { key: 'g_hydrahide', name: 'Drowned Scale Hauberk', slot: 'armor', tier: 8, rarity: U, atype: 'scale', base: { hp: 85, def: 45 } },
    { key: 'g_tidering', name: 'Tidewrack Ring', slot: 'accessory', atype: 'ring', tier: 8, rarity: R, base: { crit: 3, main: 12 },
      fx: [{ on: 'crit', icd: 8, mend: 0.03 }], fxText: 'Your critical hits wash 3% of your HP back to you (once every 8 s).' },
    { key: 'g_gillcharm', name: 'Gillcharm', slot: 'accessory', atype: 'charm', tier: 8, rarity: R, base: { hp: 55, def: 25 },
      fx: [{ on: 'dash', icd: 10, mend: 0.04 }], fxText: 'After you dash, recover 4% of your HP (once every 10 s).' },
    { key: 'g_ninthhead', name: 'Ninth Head Pendant', slot: 'accessory', atype: 'amulet', tier: 8, rarity: L, base: { crit: 3, main: 12 },
      fx: [{ on: 'crit', icd: 3, strike: 70 }], fxText: 'Your critical hits spit venom: about 35 extra damage, once every 3 s.' },
    { key: 'm_hydraeye', name: 'Eye of the Drowned Mother', slot: 'accessory', atype: 'broodeye', tier: 8, rarity: M, base: { main: 12, crit: 3 },
      fx: [{ on: 'crit', buff: { dmg: 0.015 }, dur: 10, stacks: 6, name: 'Many Heads' }], fxText: 'Each critical hit grows another head: +1.5% damage for 10 s, stacking up to 6 times.' },
    { key: 'm_hydramantle', name: 'Mantle of Nine Heads', slot: 'armor', atype: 'chitin', tier: 8, rarity: M, base: { hp: 75, def: 50 },
      fx: [{ on: 'gcd', chance: 0.25, strike: 70 }, { on: 'heal', icd: 10, mend: 0.03 }], fxText: 'Each GCD has a 25% chance to bite for about 35 extra damage, and healing or shielding anyone mends 3% of your HP (once every 10 s).' },
  ];
  for (const it of gen) ITEMS[it.key] = it;
  // every effect gets an id (its proc cooldowns and buffs are tracked by it)
  for (const it of Object.values(ITEMS)) (it.fx || []).forEach((e, i) => { e.id = `${it.key}:${i}`; });
})();

// the actual numbers on an item instance { key }, for a given class (class/general 'main' becomes phys or mag)
function itemStats(inst, clsId) {
  const it = ITEMS[inst.key]; if (!it) return {};
  const k = RARITY[it.rarity].power;
  const out = {};
  for (const [s, v] of Object.entries(it.base)) {
    const stat = s === 'main' ? (it.main || CLASS_MAIN[clsId] || 'phys') : s;
    const val = s === 'haste' || s === 'crit' ? Math.max(1, Math.round(v * k)) : Math.round(v * k);
    out[stat] = (out[stat] || 0) + val;
  }
  return out;
}
const itemRarity = inst => (ITEMS[inst.key] ? ITEMS[inst.key].rarity : 0);
const itemLevel = inst => RARITY[itemRarity(inst)].ilvl;
const sellPrice = inst => RARITY[itemRarity(inst)].sell;

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
  // item effects (run by the kit: Kit.itemHook / Kit.fxMod); the same ring in both slots only counts once
  const seen = new Set(), fx = [];
  for (const i of insts) if (i && ITEMS[i.key] && ITEMS[i.key].fx && !seen.has(i.key)) { seen.add(i.key); fx.push(...ITEMS[i.key].fx); }
  return { power: (t[main] || 0) / 1000, crit: (t.crit || 0) / 100, haste: (t.haste || 0) / 100, hp: t.hp || 0, def: (t.def || 0) / 1000, perks, fx };
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
  3: { name: 'Stormbound', boss: 'Volkar', flavor: 'Weather the storm together, and strike like lightning.',
    tiers: { 2: { haste: 0.02 }, 3: { hp: 0.03, haste: 0.02 }, 4: { hp: 0.04, haste: 0.03 } } },
  4: { name: 'Court of the Barrow', boss: 'The Hollow King', flavor: 'Kneel to no king. Stand together in the dark.',
    tiers: { 2: { dmg: 0.02 }, 3: { dmg: 0.02, crit: 0.02 }, 4: { dmg: 0.03, crit: 0.03 } } },
  5: { name: 'Cinder Pact', boss: 'Vhalgrath', flavor: 'Burn bright together, and nothing in the peaks stands before you.',
    tiers: { 2: { dmg: 0.02 }, 3: { dmg: 0.02, haste: 0.02 }, 4: { dmg: 0.04, haste: 0.03 } } },
  6: { name: 'Frostbound', boss: 'Hrimgar', flavor: 'The White Reach yields to those who hold the line.',
    tiers: { 2: { hp: 0.03 }, 3: { hp: 0.04, haste: 0.02 }, 4: { hp: 0.06, dmg: 0.02 } } },
  7: { name: 'Circle of Seven', boss: 'Azerath', flavor: 'Seven circles, drawn together, close around the foe.',
    tiers: { 2: { crit: 0.02 }, 3: { crit: 0.02, dmg: 0.02 }, 4: { crit: 0.03, haste: 0.02, dmg: 0.02 } } },
  8: { name: 'Nine Heads', boss: 'The Hydra', flavor: 'Cut one down and the rest grow wiser.',
    tiers: { 2: { hp: 0.03 }, 3: { hp: 0.03, crit: 0.02 }, 4: { hp: 0.04, crit: 0.03, haste: 0.02 } } },
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

// ---------------------------------------------------------------- loot chests
// A clear drops a chest: 4 items on Normal, 5 on Hard. Each item rolls its rarity first, then picks an item of that
// rarity from the boss's table. Class items only roll for classes a human in the run plays (bots don't count).
// Then everyone rolls Need / Greed / Pass on each (main.js + loot.js).
const BOSS_TIER = { grubnak: 1, skitterra: 2, volkar: 3, hollowking: 4, wyrm: 5, titan: 6, archmage: 7, hydra: 8 };
const CHEST_SIZE = { normal: 4, hard: 5 };
const CHEST_ODDS = {   // percent by rarity: [Uncommon, Rare, Legendary, Mythic]
  normal: [55, 30, 12, 3],
  hard: [30, 40, 22, 8],
};
// each boss's table: { rarity: [item keys] }, everything that boss drops (Recruit gear never drops)
const LOOT_TABLES = {};
for (const [boss, tier] of Object.entries(BOSS_TIER)) {
  const t = LOOT_TABLES[boss] = { [R_UNCOMMON]: [], [R_RARE]: [], [R_LEGENDARY]: [], [R_MYTHIC]: [] };
  for (const it of Object.values(ITEMS)) if (it.tier === tier && t[it.rarity]) t[it.rarity].push(it.key);
}
// gold for clearing a boss (Hard doubles it; wipes and trials give nothing)
const CLEAR_GOLD = { grubnak: 40, skitterra: 45, volkar: 50, hollowking: 60, wyrm: 65, titan: 70, archmage: 75, hydra: 85 };
const clearGold = (bossId, mode) => (CLEAR_GOLD[bossId] || 0) * (mode === 'hard' ? 2 : 1);

// classes: the classes the humans in the run play. -> [item keys]
function rollChest(bossId, mode, classes, rng) {
  const table = LOOT_TABLES[bossId] || LOOT_TABLES.grubnak, odds = CHEST_ODDS[mode] || CHEST_ODDS.normal;
  const ok = key => !ITEMS[key].cls || classes.includes(ITEMS[key].cls);
  const out = [];
  for (let n = 0; n < (CHEST_SIZE[mode] || CHEST_SIZE.normal); n++) {
    let roll = rng() * 100, r = R_UNCOMMON;
    for (let i = 0; i < odds.length; i++) { if (roll < odds[i]) { r = R_UNCOMMON + i; break; } roll -= odds[i]; }
    let pool = [];
    for (let rr = r; rr >= R_UNCOMMON && !pool.length; rr--) pool = table[rr].filter(ok);   // (every table has general items in each rarity)
    const fresh = pool.filter(k => !out.includes(k));   // no doubles in one chest while there's a choice
    const from = fresh.length ? fresh : pool;
    out.push(from[Math.floor(rng() * from.length)]);
  }
  return out;
}
// Need / Greed / Pass: picks are [[playerId, choice]] with choice 0 pass, 1 greed, 2 need. Everyone who didn't pass
// rolls 1-100; the best Need wins, otherwise the best Greed (ties roll again). -> { w: id, c, r } or null (all passed)
const LOOT_PASS = 0, LOOT_GREED = 1, LOOT_NEED = 2;
function lootWinner(picks, rng) {
  for (const c of [LOOT_NEED, LOOT_GREED]) {
    const ids = picks.filter(p => p[1] === c).map(p => p[0]);
    if (!ids.length) continue;
    for (let tries = 0; tries < 20; tries++) {
      const rolls = ids.map(id => [id, 1 + Math.floor(rng() * 100)]);
      const best = Math.max(...rolls.map(x => x[1])), top = rolls.filter(x => x[1] === best);
      if (top.length === 1 || tries === 19) return { w: top[0][0], c, r: best };
    }
  }
  return null;
}
// can this hero Need it? class items: that class; weapons: the matching main stat; armour and accessories: anyone
const canNeed = (key, clsId) => !!ITEMS[key] && slotsFor({ key }).some(s => canEquip({ key }, clsId, s));

if (typeof module !== 'undefined') module.exports = { ITEMS, GEAR_CAPS, CLASS_MAIN, RARITY, itemStats, itemRarity, canEquip, gearTotals, gearMods, sanitizeGear,
  PARTY_BONUS, gearSources, sanitizeSources, partyBonus, ITEM_PERKS, TIERS, FX_TRIGGERS, FX_CONDITIONS, FX_ACTIONS, FX_MODS, FX_KEYS,
  BOSS_TIER, LOOT_TABLES, CHEST_ODDS, CHEST_SIZE, rollChest, lootWinner, canNeed, clearGold, sellPrice, LOOT_PASS, LOOT_GREED, LOOT_NEED };
