// Game data: roles, classes and bosses (names, flavor, colors). The class kits themselves live in
// combat/kits.js and the boss fights in arena/bosses/*.js.

const ROLES = {
  tank:   { name: 'Tank',   color: '#4a9cff' },
  dps:    { name: 'DPS',    color: '#ff5a4f' },
  healer: { name: 'Healer', color: '#4fd27a' },
};

const KEYS = ['Q', 'W', 'E', 'R', 'D', 'F', 'Space', 'T'];   // T: a tank's taunt

const CLASSES = [
  // ---------------------------------------------------------------- Tanks
  {
    id: 'bastion', name: 'Bastion', title: 'Shield Knight', role: 'tank', difficulty: 1, accent: '#5b8fd8',
    tagline: 'An immovable wall of steel.',
    gameplan: 'A one-button sword combo builds Resolve, and Holy Edge spends it. The skill is Brace: raise your shield in the instant before the boss\'s swing lands for a Perfect Block, which refunds Resolve and arms a counterattack. Easy to play safely, and very rewarding to play sharp.',
  },
  {
    id: 'bloodreaver', name: 'Bloodreaver', title: 'Berserker', role: 'tank', difficulty: 2, accent: '#c0353d',
    tagline: 'Every wound is fuel.',
    gameplan: 'Crimson Drain heals you for the damage you took in the last few seconds and hits harder the more it was. Fire it right after a big hit and you heal through anything; fire it on cooldown and it does little. Frenzy gives free, stronger Drains: save them for the tankbuster.',
  },
  {
    id: 'runeguard', name: 'Runeguard', title: 'Warder', role: 'tank', difficulty: 3, accent: '#8a5cf6',
    tagline: 'Sees the blow before it lands.',
    gameplan: 'Runic Ward is a shield that explodes when it ends, harder the more it soaked. A Ward fully broken by a big hit refunds its Rune. Learn the boss\'s timeline, put Wards up right before heavy hits, and line Mirror Aegis up with the boss\'s strongest attack to send it back.',
  },
  // ---------------------------------------------------------------- DPS
  {
    id: 'ranger', name: 'Ranger', title: 'Marksman', role: 'dps', difficulty: 1, accent: '#4f9a4a',
    tagline: 'Never misses, never stops moving.',
    gameplan: 'Every shot is instant, so you can always move. Quick Shot sometimes lights up Keen Eye: spend it on Piercing Arrow before the next Quick Shot overwrites it. Hunter\'s Mark is a party-wide damage boost, so fire it with everyone\'s burst.',
  },
  {
    id: 'shadowblade', name: 'Shadowblade', title: 'Assassin', role: 'dps', difficulty: 3, accent: '#7b3fa0',
    tagline: 'The last thing you see is nothing at all.',
    gameplan: 'Strike from behind for double combo points, Eviscerate from the side for extra damage, and keep your poison up. The highest damage in the game when your positionals land, and the lowest when they don\'t. Shadowstep and Shadow Dance cover you when the boss turns.',
  },
  {
    id: 'pyromancer', name: 'Pyromancer', title: 'Fire Mage', role: 'dps', difficulty: 2, accent: '#ff7a1a',
    tagline: 'Burns bright. Sometimes too bright.',
    gameplan: 'Casting builds Heat, and Heat raises your damage. Crits chain into Hot Streak for an instant Pyroblast. Vent before 100 Heat or you overheat and burn yourself. Strongest standing still; plan your casts around the boss\'s mechanics.',
  },
  // ---------------------------------------------------------------- Healers
  {
    id: 'cleric', name: 'Cleric', title: 'Priest of Dawn', role: 'healer', difficulty: 1, accent: '#e8c15a',
    tagline: 'The light answers when called.',
    gameplan: 'Strong, simple healing: a cast heal, instant Dawn Petals, a big instant oGCD and a revive. Every third Petal turns your attack into Dawnstar, a huge instant hit, so a good Cleric spends Petals where they heal AND keep Dawnstar coming.',
  },
  {
    id: 'grovekeeper', name: 'Grovekeeper', title: 'Druid', role: 'healer', difficulty: 2, accent: '#5fbf4a',
    tagline: 'Plants the cure before the wound.',
    gameplan: 'Rejuvenate heals over 15 seconds and its ticks grow Bloom. Plant it before damage lands, then attack while it works. Bloom spends that growth for an instant burst of healing on everyone you planted. Very efficient if you know the fight, weak if you only react.',
  },
  {
    id: 'chronomancer', name: 'Chronomancer', title: 'Time Mage', role: 'healer', difficulty: 3, accent: '#3fd0d0',
    tagline: 'It already happened. Let\'s undo that.',
    gameplan: 'Your attacks are your heals: in Slow stance each Bolt heals the tank, in Haste it heals the whole party but drains Flux. Rewind sets an ally\'s HP back to where it was 4 seconds ago, even if they just died. The clutch healer, and the hardest one to play well.',
  },
];

// ---------------------------------------------------------------- advanced classes
// Each has one puzzle at its core (docs/plans/2026-10-new-classes.md). `complexity` (1-4) shows as small pips on the
// hero select; `art` says which painted art exists yet (until then the game draws its own icons and portraits, and
// never asks the server for the missing files).
CLASSES.push(
  {
    id: 'thermist', name: 'Thermist', title: 'Living Thermometer', role: 'dps', difficulty: 3, complexity: 3, accent: '#e0648c',
    art: { icons: false, portraits: false },
    tagline: 'Frost in one hand, fire in the other. The trick is the swing.',
    gameplan: 'A dial runs from frost to fire, and your spells push it. Each step from the middle makes that side\'s spells hit harder, but past the edge you overload. Swing the dial all the way across the middle and the change of temperature detonates on the boss as a Thermal Shock: the bigger the swing, the bigger the blast.',
  },
  {
    id: 'driftblade', name: 'Driftblade', title: 'Wind Duellist', role: 'dps', difficulty: 2, complexity: 2, accent: '#4fd0b0',
    art: { icons: false, portraits: false },
    tagline: 'Never stand still.',
    gameplan: 'Moving fills your Drift and standing still drains it, and nearly every cut is stronger with Drift behind it. Run straight through an enemy and you cut it as you pass. Dodging mechanics is how you deal damage: every step you take out of a telegraph can carry you through the boss.',
  },
);

// ---------------------------------------------------------------- Alembist (healer, added with classes-b)
CLASSES.push({
  id: 'alembist', name: 'Alembist', title: 'Alchemist', role: 'healer', difficulty: 3, accent: '#d08a3a',
  art: { portraits: false },   // (no painted portrait yet: the hero page shows the sprite and nothing asks for the file)
  tagline: 'Brewed before it\'s needed.',
  gameplan: 'Three reagents, two presses each: Dew and Dew brews a healing Draught, Ember and Ember a Fire Bomb, Salt a ward. Vials wait in your bandolier and grow stronger, so you brew in the quiet for what\'s coming, then throw the oldest at whoever needs it. A splash catches everyone near where it lands.',
});

// Boss panel text: flavor only. Nothing here tells you how to deal with an attack.
const BOSSES = [
  {
    id: 'grubnak', name: 'Grubnak', title: 'The Ogre Chef', color: '#7fa650', playable: true,
    blurb: 'Grubnak has been cooking adventurers for years and is not happy about the reviews. His scullery runs hot, his cleavers run sharp, and nobody has ever sent a dish back.',
    mechanics: [
      { name: 'Tenderize', desc: 'A heavy cleaver blow for whoever holds his attention.' },
      { name: 'Mince', desc: 'One of his cleavers catches the light before it falls.' },
      { name: 'Ladle Spin / Lid Slam', desc: 'Kitchenware, swung with feeling.' },
      { name: 'Meat Toss / Family Meal', desc: 'Portions for one, and portions for the table. The grease lingers.' },
      { name: 'Order Up!', desc: 'Plates on the counter. Every order must be collected.' },
      { name: 'Simmer', desc: 'Halfway through, the whole kitchen comes to a boil.' },
      { name: 'Hard: Belly Flop, Cleaver Toss, Flambé', desc: 'He stops holding back. He throws his weight around, throws his cleavers, and sets the brandy alight.' },
    ],
  },
  {
    id: 'skitterra', name: 'Queen Skitterra', title: 'Spider Broodmother', color: '#7b4a9a', playable: true,
    blurb: 'Deep in the webbed caves, the Broodmother never fights alone, and she never forgets who hurt her children.',
    mechanics: [
      { name: 'Silk Lines', desc: 'Threads strung between her chosen prey.' },
      { name: 'Brood', desc: 'Her children hatch in pairs and do not like dying alone.' },
      { name: 'Eightfold Lunge', desc: 'Eight legs, eight directions.' },
      { name: 'Venom Spit', desc: 'She spits at whoever keeps their distance. The venom stays.' },
      { name: 'Silk Wrap', desc: 'Her favourite holds very still afterwards.' },
      { name: 'Tightening Web', desc: 'Halfway through, the edges of her web grow sticky.' },
      { name: 'Hard: Egg Sacs, Fang Rush, Spinneret Volley', desc: 'Her clutch is laid in the open, she runs her prey down herself, and silk falls like rain.' },
    ],
  },
  {
    id: 'volkar', name: 'Volkar', title: 'The Storm Titan', color: '#5b8ab0', playable: true,
    blurb: 'A living mountain crackling with the fury of the sky. He never moves from the summit. He has never needed to.',
    mechanics: [
      { name: 'Polarity', desc: 'Positive and negative charges, and what happens when they meet. Opposites attract.' },
      { name: 'Lightning Rods', desc: 'Something has to catch the strike. Nothing catches two in a row and walks away.' },
      { name: 'Gale Slam', desc: 'The wind has to go somewhere. Iron doesn\'t move.' },
      { name: 'Storm Walls', desc: 'Walls of wind, turning slowly around the titan.' },
      { name: 'The Storm', desc: 'It never stops, and it only grows.' },
      { name: 'Eye of the Storm', desc: 'In the second half, the sky closes in.' },
      { name: 'Hard: Chain Lightning, Ball Lightning, Skyfall', desc: 'The storm leaps from hero to hero, wanders the summit on its own, and at last the sky itself comes down.' },
    ],
  },
  {
    id: 'hollowking', name: 'The Hollow King', title: 'Lord of the Barrow', color: '#4a9a6a', playable: true,
    blurb: 'A king who refused to stay dead, holding court in his own tomb. His guard still stands watch, his bells still toll, and the moon over the Barrow is sinking.',
    mechanics: [
      { name: 'Royal Gaze', desc: 'It is not wise to look a king in the eye.' },
      { name: 'Royal Doom', desc: 'A sentence passed. Light has always been the cure for it.' },
      { name: 'Grave Cleave', desc: 'His greatsword leaves wounds that stay open.' },
      { name: 'Echo Knights', desc: 'His old guard remember every swing they ever saw.' },
      { name: 'Barrow Bells', desc: 'Every bell must be rung. Unrung bells toll for everyone.' },
      { name: 'The Long Night', desc: 'At the end, the lanterns go out, and the moon is setting.' },
      { name: 'Hard: Royal Audience, Funeral March, Gravebind', desc: 'The king will be faced, his dead march from wall to wall, and the grave takes the living two at a time.' },
    ],
  },
];

// Lets Node tools reuse this file.
if (typeof module !== 'undefined') module.exports = { ROLES, KEYS, CLASSES, BOSSES };
