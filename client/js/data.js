// Game data: roles, classes and bosses (names, flavor, colors). The class kits themselves live in
// combat/kits.js and the boss fights in arena/bosses/*.js.

const ROLES = {
  tank:   { name: 'Tank',   color: '#4a9cff' },
  dps:    { name: 'DPS',    color: '#ff5a4f' },
  healer: { name: 'Healer', color: '#4fd27a' },
};

const KEYS = ['Q', 'W', 'E', 'R', 'D', 'F', 'Space', 'T'];   // T: the Ultimate

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
    gameplan: 'Every hit you take goes into the bank, and Crimson Drain cashes it: it heals you for the damage you took since your last Drain and hits harder the more it was. Fire it right after a big hit and you heal through anything; fire it on cooldown and it does little. Frenzy gives free, stronger Drains: spread them, and save one for the tankbuster.',
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
    art: { portraits: true },
    tagline: 'Frost in one hand, fire in the other. The trick is the swing.',
    gameplan: 'A dial runs from frost to fire, and your spells push it. Each step from the middle makes that side\'s spells hit harder, but past the edge you overload. Swing the dial all the way across the middle and the change of temperature detonates on the boss as a Thermal Shock: the bigger the swing, the bigger the blast.',
  },
  {
    id: 'driftblade', name: 'Driftblade', title: 'Wind Duellist', role: 'dps', difficulty: 2, complexity: 2, accent: '#4fd0b0',
    art: { portraits: true },
    tagline: 'Never stand still.',
    gameplan: 'Moving fills your Drift and standing still drains it, and nearly every cut is stronger with Drift behind it. Run straight through an enemy and you cut it as you pass. Dodging mechanics is how you deal damage: every step you take out of a telegraph can carry you through the boss.',
  },
);

// ---------------------------------------------------------------- Alembist (healer, added with classes-b)
CLASSES.push({
  id: 'alembist', name: 'Alembist', title: 'Alchemist', role: 'healer', difficulty: 3, accent: '#d08a3a',
  art: { portraits: true },
  tagline: 'Brewed before it\'s needed.',
  gameplan: 'Three reagents, two presses each: Dew and Dew brews a healing Draught, Ember and Ember a Fire Bomb, Salt a ward. Vials wait in your bandolier and grow stronger, so you brew in the quiet for what\'s coming. Throw at an ally below 70% health and your strongest heal goes; at anyone else, your oldest bomb flies at the enemy. Three vials that are not bombs light the Kiln, and your next throw also sends a free Kiln Bomb. A splash catches everyone near where it lands.',
});

// ---------------------------------------------------------------- advanced tanks (tanks-2)
CLASSES.push(
  {
    id: 'gorgemaw', name: 'Gorgemaw', title: 'The Maw That Walks', role: 'tank', difficulty: 2, complexity: 3, accent: '#d0743a',
    art: { portraits: true },
    tagline: 'Boss attacks are food.',
    gameplan: 'Open your jaw just before an attack lands on you and you eat it: a quarter of the damage, and a Morsel shaped like what you swallowed. Spit Morsels back at the boss for your biggest hits, or digest them to heal and harden. Step into a friend\'s circle to eat it for them.',
  },
  {
    id: 'oathbroker', name: 'Oathbroker', title: 'Contract-Knight', role: 'tank', difficulty: 3, complexity: 4, accent: '#a8a0c0',
    art: { portraits: true },
    tagline: 'Damage isn\'t taken. It\'s borrowed.',
    gameplan: 'Most of every blow is written into your Ledger instead of landing, and each entry comes due eight seconds later. Push bills back past the next big hit, settle the book at half when your healer is ready, and make the boss pay its share. Default tears the Ledger up when it\'s about to bury you.',
  },
);

// ---------------------------------------------------------------- Ironpalm (tank; the combo-paced class)
// No global cooldown: Light, Heavy and Kick spell named moves in short strings (kits.js IRONPALM, engine.js pacing).
CLASSES.push({
  id: 'ironpalm', name: 'Ironpalm', title: 'Monk Brawler', role: 'tank', difficulty: 3, complexity: 3, accent: '#f0a73a',
  art: { portraits: true },
  tagline: 'Every blow is a word. Learn to speak in sentences.',
  gameplan: 'There is no global cooldown. Light, Heavy and Kick are your keys, and short strings of them pressed in rhythm become named moves: a launching uppercut, a blocking stance, a storm of palms. Breath is the only limit: every press costs some, and it floods back the moment you stop. Read the boss\'s blow in its last instant to take half of it and answer with a free finisher.',
});

// ---------------------------------------------------------------- Threadweaver and Marionettist (classes-c)
CLASSES.push(
  {
    id: 'threadweaver', name: 'Threadweaver', title: 'Seamstress Witch', role: 'healer', difficulty: 3, complexity: 4, accent: '#b89cff',
    art: { portraits: true },
    tagline: 'What hurts one, hurts two a little less.',
    gameplan: 'You tie glowing threads between allies. A hit on one end is shared evenly along the thread, and a heal on one end runs part of the way down it. Pull two allies too far apart and the thread snaps with a small heal. The damage your threads carry fills your Spool, and your biggest heals spend it.',
  },
  {
    id: 'marionettist', name: 'Marionettist', title: 'Puppeteer', role: 'dps', difficulty: 3, complexity: 4, accent: '#c84a8c',
    art: { portraits: true },
    tagline: 'Stand well back. Let the Doll take the bows.',
    gameplan: 'A life-sized Doll fights for you, tied to your hands by three strings. You stay back and steer it. The strings tear if the Doll strays too far or a blow lands on it, and with none left it falls limp. The big cut runs along the strings themselves, so stand where the line between you and your Doll crosses the boss.',
  },
);

// ---------------------------------------------------------------- Gloomsworn (tank, class 18; docs/plans/2026-10-new-classes-2.md)
// No painted icons or portraits yet: the game draws its own icons until they are in.
CLASSES.push({
  id: 'gloomsworn', name: 'Gloomsworn', title: 'Undying Vigil', role: 'tank', difficulty: 3, complexity: 3, accent: '#7a5aa8',
  tagline: 'The dark keeps the watch. It does not let go.',
  gameplan: 'Strikes and wounds fill your Gloom, and heavy blows, a pall over the whole party and your last rite spend it. Keep it full when the killing blow comes and you do not fall: you go Hollow, held at one health, hitting harder, every wound written down as a debt. Your healer must pay the debt back before the grace runs out, or the dark takes it from you. Once a minute, at most.',
});

// ---------------------------------------------------------------- Reaper (id thresher; damage, class 19; docs/plans/2026-10-new-classes-2.md)
// No painted icons or portraits yet: the game draws its own icons until they are in.
CLASSES.push({
  id: 'thresher', name: 'Reaper', title: 'Mark, Wither, Reap', role: 'dps', difficulty: 3, complexity: 4, accent: '#8fd8e8',
  tagline: 'Every soul keeps its appointment. You only have to be there.',
  gameplan: 'Swing your scythe in a string, then end it with a finisher that leaves a mark: a Drain, a Bind, a Death Mark or a Thread, by how many swings came before. Snap pops every mark on every enemy at once, and all four on one is a Full Harvest. Void Star opens a pit of smoke that hits harder for every mark. And once a minute, Insane Reaper hurries the whole party along.',
});

// ---------------------------------------------------------------- Tidecaller (healer, class 20; docs/plans/2026-10-new-classes-3.md)
// No painted icons or portraits yet: the game draws its own icons until they are in.
CLASSES.push({
  id: 'tidecaller', name: 'Tidecaller', title: 'The Voice of the Undertow', role: 'healer', difficulty: 2, complexity: 3, accent: '#3fb8a8',
  tagline: 'The sea doesn\'t hurry. Neither do I.',
  gameplan: 'Your healing rises and falls like the sea. The tide climbs on its own; spend it as small sips while it\'s low, or wait for high water and let a surge wash over everyone. The skill is choosing when.',
});

// ---------------------------------------------------------------- Lanternkeeper (healer, class 21; docs/plans/2026-10-new-classes-3.md)
// No painted icons or portraits yet: the game draws its own icons until they are in.
CLASSES.push({
  id: 'lanternkeeper', name: 'Lanternkeeper', title: 'The Keeper of the Last Light', role: 'healer', difficulty: 2, complexity: 4, accent: '#ffc46b',
  tagline: 'Every dark corner gets a light. Every light gets a keeper.',
  gameplan: 'Set lanterns where the party will stand, hang one on whoever is taking the hits, and keep them lit. Lanterns heal everyone in their glow, so the skill is placement: be where the fight is going, not where it was.',
});

// ---------------------------------------------------------------- Kenseier (tank, class 22; docs/plans/2026-10-new-classes-3.md)
// Painted icons and portraits are in (client/icons, client/portraits).
CLASSES.push({
  id: 'kenseier', name: 'Kenseier', title: 'The Ashen Guard', role: 'tank', difficulty: 3, complexity: 3, accent: '#ff8a3d',
  tagline: 'Every blow has a beat. Catch it.',
  gameplan: 'Meet the boss\'s blows with your blade. A deflect pressed just as a blow lands turns it aside and wears down the boss\'s Posture; a clumsy one still blocks a little. Fill the bar and the boss Breaks: a short window where the whole party hits harder and your Deathblow lands. Only you can build it.',
});

// ---------------------------------------------------------------- Houndmaster (melee damage, class 23; docs/plans/2026-10-new-classes-3.md)
CLASSES.push({
  id: 'houndmaster', name: 'Houndmaster', title: 'The Huntsman of the Old Road', role: 'dps', difficulty: 3, complexity: 4, accent: '#c46a3a',
  art: { portraits: true },
  tagline: 'I whistle. They bite.',
  gameplan: 'Two hounds stand around the boss and bite on their own. Where they stand when you strike decides your finisher: one on each flank, one in front and one behind, or both at its back. Whistle to send them round, hold them through a turn, and call them off the red. Keep them in good places and your combo writes itself.',
});

// Boss panel text: flavor only. Nothing here tells you how to deal with an attack.
const BOSSES = [
  {
    id: 'grubnak', name: 'Grubnak', title: 'The Ogre Chef', color: '#7fa650', playable: true, set: 1,
    blurb: 'Grubnak has been cooking adventurers for years and is not happy about the reviews. His scullery runs hot, his cleavers run sharp, and nobody has ever sent a dish back.',
    mechanics: [
      { name: 'Tenderize', desc: 'A {b:29900/28350} cleaver blow for whoever holds his attention.' },
      { name: 'Mince', desc: 'One of his cleavers catches the light before it falls on half the room: {b:14950/14150}.' },
      { name: 'Ladle Spin / Lid Slam', desc: 'Kitchenware, swung with feeling: {b:14950/14150}.' },
      { name: 'Meat Toss / Family Meal', desc: 'Portions for one, {b:8650/7100}, and portions for the table, {b:25300/21800} shared. The grease lingers.' },
      { name: 'Order Up!', desc: 'Plates on the counter. Every order must be collected: an empty plate is {b:16100/15250} to everyone.' },
      { name: 'Simmer', desc: 'Halfway through, the whole kitchen comes to a boil, {b:14950/14150} a ring.' },
      { name: 'Hard: Belly Flop, Cleaver Toss, Flambé', desc: 'He stops holding back. He throws his weight around, throws his cleavers, and sets the brandy alight.' },
    ],
  },
  {
    id: 'skitterra', name: 'Queen Skitterra', title: 'Spider Broodmother', color: '#7b4a9a', playable: true, set: 1,
    blurb: 'Deep in the webbed caves, the Broodmother never fights alone, and she never forgets who hurt her children.',
    mechanics: [
      { name: 'Silk Lines', desc: 'Threads strung between her chosen prey: {b:20800/17300} each if they are wrong at the end.' },
      { name: 'Brood', desc: 'Her children hatch in pairs and do not like dying alone.' },
      { name: 'Eightfold Lunge', desc: 'Eight legs, eight directions, {b:16900/11900} a strike.' },
      { name: 'Venom Spit', desc: 'She spits {b:15600/11350} at whoever keeps their distance. The venom stays.' },
      { name: 'Silk Wrap', desc: 'A {b:33800/28100} blow. Her favourite holds very still afterwards.' },
      { name: 'Tightening Web', desc: 'Halfway through, the edges of her web grow sticky.' },
      { name: 'Hard: Egg Sacs, Fang Rush, Spinneret Volley', desc: 'Her clutch is laid in the open, she runs her prey down herself, and silk falls like rain.' },
    ],
  },
  {
    id: 'volkar', name: 'Volkar', title: 'The Storm Titan', color: '#5b8ab0', playable: true, set: 1,
    blurb: 'A living mountain crackling with the fury of the sky. He never moves from the summit. He has never needed to.',
    mechanics: [
      { name: 'Polarity', desc: 'Positive and negative charges, and what happens when they meet. Opposites attract.' },
      { name: 'Lightning Rods', desc: 'Something has to catch the strike: an empty rod is {b:13800/14400} to everyone. Nothing catches two in a row and walks away.' },
      { name: 'Gale Slam', desc: 'The wind has to go somewhere. Iron doesn\'t move.' },
      { name: 'Storm Walls', desc: 'Walls of wind, turning slowly around the titan: {b:12650/11400} each.' },
      { name: 'The Storm', desc: '{b:300/360} to everyone every 4 s. It never stops, and it only grows.' },
      { name: 'Eye of the Storm', desc: 'In the second half, the sky closes in.' },
      { name: 'Hard: Chain Lightning, Ball Lightning, Skyfall', desc: 'The storm leaps from hero to hero, wanders the summit on its own, and at last the sky itself comes down.' },
    ],
  },
  {
    id: 'hollowking', name: 'The Hollow King', title: 'Lord of the Barrow', color: '#4a9a6a', playable: true, set: 1,
    blurb: 'A king who refused to stay dead, holding court in his own tomb. His guard still stands watch, his bells still toll, and the moon over the Barrow is sinking.',
    mechanics: [
      { name: 'Royal Gaze', desc: 'It is not wise to look a king in the eye: {b:9000/11250}, and {b:16000/20000} the second time.' },
      { name: 'Royal Doom', desc: 'A sentence passed. Light has always been the cure for it.' },
      { name: 'Grave Cleave', desc: 'A {b:25000/35000} blow from his greatsword leaves wounds that stay open.' },
      { name: 'Echo Knights', desc: 'His old guard remember every swing they ever saw.' },
      { name: 'Barrow Bells', desc: 'Every bell must be rung. Unrung bells toll for everyone.' },
      { name: 'The Long Night', desc: 'At the end, the lanterns go out, and the moon is setting.' },
      { name: 'Hard: Royal Audience, Funeral March, Gravebind', desc: 'The king will be faced, his dead march from wall to wall, and the grave takes the living two at a time.' },
    ],
  },
  // ---- set 2: the wild realm beyond the road (docs/plans/2026-10-set-2-bosses.md). `set` groups the bosses whose Hard opens together (main.js hardUnlocked).
  {
    id: 'wyrm', name: 'Vhalgrath', title: 'Tyrant of the Cinder Peaks', color: '#e8662a', playable: true, set: 2,
    blurb: 'An old dragon holds the highest crater of the Cinder Peaks and has let nothing fly over it since. The rock there is warm. It is not from the sun.',
    mechanics: [
      { name: 'Breath', desc: 'A cone of fire that leaves the ground molten.' },
      { name: 'Flight', desc: 'It takes to the air, and it will come down somewhere.' },
      { name: 'The Roost', desc: 'It perches high above the crater and shakes its burning scales loose.' },
      { name: 'The Ember Heart', desc: 'At the end, the crater floor burns and shrinks.' },
      { name: 'Hard: Wingbeat, Cinder Rain, Heart Flare', desc: 'Its wings push the air along its flight, embers fall like rain, and the heart flares at the weakest.' },
    ],
  },
  {
    id: 'titan', name: 'Hrimgar', title: 'Warden of the White Reach', color: '#8ad0ee', playable: true, set: 2,
    blurb: 'A giant keeps the glacier plateau under the aurora, and the ice there is not as thick as it looks. Where he strikes, the floor does not hold.',
    mechanics: [
      { name: 'Ice Sheets', desc: 'The plateau is a mosaic of ice. Where he strikes, a sheet cracks and sinks.' },
      { name: 'Frost', desc: 'Frozen sheets hold, but they are slick, and a hero can be chilled to the bone.' },
      { name: 'The Long Night', desc: 'The aurora dims, and the giant swings in great slow arcs.' },
      { name: 'The Avalanche', desc: 'At the end, the plateau tips and the snow runs down in lanes.' },
      { name: "Hard: Glacial Stomp, Breath of Winter, Titan's Grip", desc: 'The ground rings with shards, his breath freezes the floor before it shatters, and his fist closes on a hero.' },
    ],
  },
  {
    id: 'archmage', name: 'Azerath', title: 'Master of the Seven Circles', color: '#3fb8b0', playable: true, set: 2,
    blurb: 'A mage\'s tower sank into the water with its master still at his work. Its floors are circles of spellwork, one for each of the elements, and they are all still lit.',
    mechanics: [
      { name: 'The Runes', desc: 'Two heroes carry runes of different elements, and the runes react when they stand close.' },
      { name: 'The Four Elements', desc: 'Fire, frost, lightning and the void, each in its turn, and each changes what the floor does.' },
      { name: 'The Binding', desc: 'He calls up elementals and the circles wake. Each belongs in the circle of its own element.' },
      { name: 'Convergence', desc: 'At the end, every circle is lit at once, and where two meet, they react.' },
      { name: 'Hard: Counterspell, Rune Swap, Arcane Mark', desc: 'His last spell comes again from the far side of the room, the runes change hands, and a hero\'s own elemental rises where they stood.' },
    ],
  },
  {
    id: 'hydra', name: 'The Hydra', title: 'Mother of Nine Heads', color: '#4f9a6a', playable: true, set: 2,
    blurb: 'A temple sank into its own pool long ago, and something grew in the water. It has a great many heads, and they do not agree with each other. Cut one, and you will have to choose how.',
    mechanics: [
      { name: 'The Heads', desc: 'Each head has its own element and aims at someone at random. Her heads take their turns round the pool.' },
      { name: 'Searing', desc: 'A head that falls leaves a bleeding stump. Left alone, it grows back as two.' },
      { name: 'The Submerge', desc: 'She dives and the temple floods. Heads rise at the columns, one by one.' },
      { name: "The Mother's Heart", desc: 'At the end, every head she has had strikes again, in the order you cut them.' },
      { name: "Hard: Regrowth, Tidal Dance, Hydra's Gaze", desc: 'A missed stump grows an extra head, two heads send their tides across each other, and the whole temple is watched.' },
    ],
  },
  // ---- set 3: the Fallen Star (docs/plans/2026-10-set-3-pitches.md)
  {
    id: 'corvane', name: 'Corvane', title: 'the Unburied Blade', color: '#9fc8ec', playable: true, set: 3,
    blurb: 'A guard stands in a snowed-in mountain pass on the crater road. Nobody ever came to relieve him, so he has kept the pass ever since, and he duels everyone who comes up it.',
    mechanics: [
      { name: 'The Whetstone', desc: 'Every blow he lands on the careless sharpens his blade. When the edge is full, he unleashes it.' },
      { name: 'Stances', desc: 'How he holds the blade tells you what is coming.' },
      { name: 'The Lanterns', desc: 'The old stone lanterns of the pass give shelter, once each.' },
      { name: 'The Vigil', desc: 'He kneels in the snow, and the cold of the pass comes to him.' },
      { name: 'Hard: Overwhet, False Stance, Returning Parting, Comet Volley', desc: 'His edge holds more than it should, his stance can lie, his dance comes back, and his dash comes three times.' },
    ],
  },
  {
    id: 'brannoc', name: 'Brannoc', title: 'the Undefeated', color: '#d8a24a', playable: true, set: 3,
    blurb: 'An arena sank into the sea long ago with its champion still in it. He still fights there, for a crowd of ghosts, and he has never once been beaten.',
    mechanics: [
      { name: 'The Sunwheel', desc: 'He throws his shield like a discus, and it comes off the walls. Somebody has to catch it.' },
      { name: 'Victory Leap', desc: 'He lands on someone, then stops to enjoy the crowd.' },
      { name: 'The Tide Rises', desc: 'Halfway through the bout, the sea comes for the arena.' },
      { name: 'The Tidewrought', desc: 'What rises from the water has his reach and his fists, grown huge.' },
      { name: 'Hard: Twin Wheels, Double Grip, Riposte, Riptide', desc: 'Two wheels cross, both hands close, a caught wheel is kicked back, and the waves come back twice.' },
    ],
  },
  {
    id: 'morrowoak', name: 'Morrow-Oak', title: 'the Starved Grove', color: '#8a9a6a', playable: true, set: 3,
    blurb: 'The oldest tree in the realm drank from the fallen star, and something in his heartwood has been hungry ever since. He feeds it his own grove.',
    mechanics: [
      { name: 'The Hunger', desc: 'What it eats stays gone. Choose where the floor goes.' },
      { name: 'Inhale', desc: 'It breathes in, and everything slides toward him.' },
      { name: 'Fourfold Bloom', desc: 'Four petals open around him, and they do not stay still.' },
      { name: 'The Swallowing', desc: 'Halfway through, the Hunger takes the whole grove.' },
      { name: 'Hard: Twin Seed, Hungering Dark, Deeper Roots, Last Gasp', desc: 'Seeds come in pairs, the holes pull, he grows older limbs, and a broken one strikes once more.' },
    ],
  },
  {
    id: 'caelum', name: 'Caelum Vey', title: 'the Starborn', color: '#e9dcae', playable: true, set: 3,
    blurb: 'The star chose him. He walks where others run, and the meteor that has hung over every road you took is coming down at his word.',
    mechanics: [
      { name: 'Afterimages', desc: 'He is always somewhere before he is there.' },
      { name: 'The Shadow', desc: "The meteor's shadow grows on the floor. It is the clock." },
      { name: 'Grace Withdrawn', desc: 'For a moment, nobody has anything left.' },
      { name: 'The Starwyrm', desc: 'The constellations come loose.' },
      { name: 'Hard: Mirrored Wake, Second Coil, Chorus of the Fallen, Dark Ember', desc: 'Every dance twice, the serpent returns, old foes dance with him, and the dark can be pushed back.' },
    ],
  },
];

// The Ultimate (set 4, docs/plans/2026-10-ultimate-raid.md). NOT in BOSSES on purpose: the Raid Board, the town statues and every per-boss list read that array, and the
// fight is sealed until its unlock is built (Wave 6). It starts through main.js RAID_DEFS (window.__game.startRaid('normal', true, 'sovereign')) and tools/bot-raid.js.
const ULTIMATE_BOSS = {
  id: 'sovereign', name: 'The Cinder Sovereign', title: 'the Ember', color: '#ff9a3c', playable: false, set: 4,
  blurb: 'The fire under every room you fought in. Everything you killed burned back into it.',
  mechanics: [],
};

// Lets Node tools reuse this file.
if (typeof module !== 'undefined') module.exports = { ROLES, KEYS, CLASSES, BOSSES, ULTIMATE_BOSS };
