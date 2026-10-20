// Town secrets: small things hidden around Emberfall, drawn faintly and only noticed up close.
// Six are there from the start; two more appear after each boss's first defeat. Overview: docs/plans/story.md.
// `when` uses the same keys as NPC talk (beaten / notBeaten / flags). `set` is a flag some townsfolk react to.
// Every `at` is walkable: clear of houses, trees, pedestals, lamps, the fountain, the pond and the notice board.

const TOWN_SECRETS = [
  // ---------------------------------------------------------------- from the start
  { id: 'corwin-tin', name: 'A tin behind the Tankard', at: { x: 600, y: 436 }, r: 24,
    when: {}, look: 'loose-stone',
    lines: ['Behind the Tankard, one stone in the wall comes away in your hand.',
      'A tin of coins sits in the gap, with a note scratched on the lid: "For the next round. C."'],
    reward: { gold: 20 }, set: 'found-corwin-tin' },

  { id: 'kings-road', name: 'Words on the back of the gate', at: { x: 1200, y: 128 }, r: 24,
    when: {}, look: 'carving',
    lines: ['Letters are cut into the back of the portal ring, worn almost smooth: THE KING\'S ROAD.',
      'Below them, four words in a column: KITCHEN. SILVER. BEACON. BARROW.',
      'There were more words under those. The stone has been chipped away.'],
    reward: { lore: true }, set: 'read-kings-road' },

  { id: 'pip-stash', name: 'A hollow in the north-east trees', at: { x: 2285, y: 125 }, r: 24,
    when: {}, look: 'hollow',
    lines: ['A hollow under the roots, lined with a sock. Inside: three coppers, a snail shell and a pebble painted to look like a tooth.',
      'A note in big letters: "PIPS. KEEP OUT. THIS MEANS HASK."'],
    reward: { gold: 10 }, set: 'found-pip-stash' },

  { id: 'yard-tally', name: 'Notches on the corner post', at: { x: 2095, y: 1338 }, r: 24,
    when: {}, look: 'carving',
    lines: ['The corner post of the Training Yard is cut with notches, hundreds of them, in fives.',
      'The last group stops at three. A purse is wedged under the post, as if someone meant to come back for it.'],
    reward: { gold: 15 } },

  { id: 'bluebells', name: 'A ring of bluebells', at: { x: 110, y: 1560 }, r: 24,
    when: {}, look: 'flowers',
    lines: ['Deep in the south-west trees, bluebells grow in a careful ring around a flat stone.',
      'The stone says only: FOR THE ONES WHO WENT IN. Someone keeps the flowers watered.'],
    reward: { lore: true }, set: 'found-bluebells' },

  { id: 'moth-lure', name: 'Something in the far reeds', at: { x: 640, y: 1460 }, r: 24,
    when: {}, look: 'glint',
    lines: ['Something glints in the reeds on the far bank of the pond.',
      'A silver fishing lure shaped like a moth, still bright after who knows how long in the water.'],
    reward: { gift: 'moth-lure' }, set: 'found-lure' },

  // ---------------------------------------------------------------- after Grubnak
  { id: 'gaspard-recipe', name: 'A card in the west hedge', at: { x: 105, y: 890 }, r: 24,
    when: { beaten: ['grubnak'] }, look: 'note',
    lines: ['A recipe card is caught in the west trees, blown there from the cook\'s cart.',
      '"Gran\'s Honeyroot Broth. Do not let the ogre see this." The ink has run, but the honey stain is clear enough.'],
    reward: { lore: true }, set: 'found-recipe' },

  { id: 'cleaver-mark', name: 'Behind the Forge', at: { x: 2100, y: 665 }, r: 24,
    when: { beaten: ['grubnak'] }, look: 'glint',
    lines: ['In the slag heap behind the Forge lies a broken cleaver blank, never finished.',
      'It carries the same maker\'s mark as the ogre\'s cleavers: a small anvil under a crown. Someone pushed a few coins into the ash beside it.'],
    reward: { gold: 25 }, set: 'found-cleaver-mark' },

  // ---------------------------------------------------------------- after Skitterra
  { id: 'spiderling', name: 'A tiny web in the north trees', at: { x: 850, y: 115 }, r: 24,
    when: { beaten: ['skitterra'] }, look: 'glint',
    lines: ['One of her children got out. It has spun a web between two roots no wider than your hand.',
      'Caught in it: three coppers and a button. The spiderling watches you take them with all eight eyes, and does not forgive you.'],
    reward: { gold: 12 } },

  { id: 'hask-purse', name: 'Under the terrace stones', at: { x: 1500, y: 668 }, r: 24,
    when: { beaten: ['skitterra'] }, look: 'loose-stone',
    lines: ['Spiders fleeing the caves have nested under the terrace. Lift the loose stone and they scatter.',
      'Beneath it, a soldier\'s pay purse, seventeen years old, sealed with the portal watch\'s badge.'],
    reward: { gold: 25 }, set: 'found-hask-purse' },

  // ---------------------------------------------------------------- after Volkar
  { id: 'storm-glass', name: 'Glass on the hill', at: { x: 420, y: 120 }, r: 24,
    when: { beaten: ['volkar'] }, look: 'glint',
    lines: ['Up on the hill by the hut, the grass is burned in a star, and at its heart is a crust of green glass. It is still warm.',
      'The old song says the town took its name from a night like this: a coal fell from the beacon and landed here burning.'],
    reward: { gold: 30 }, set: 'found-storm-glass' },

  { id: 'kite-wishes', name: 'A kite in the gutter', at: { x: 1072, y: 1340 }, r: 24,
    when: { beaten: ['volkar'] }, look: 'note',
    lines: ['A child\'s kite has come down in the shadow of the house, its tail a string of folded wishes.',
      'Most are about ponies. One, in older ink: "I want to see the top of the mountain. C."'],
    reward: { lore: true } },

  // ---------------------------------------------------------------- after the Hollow King
  { id: 'aldric-stone', name: 'A stone by the south road', at: { x: 1265, y: 1560 }, r: 24,
    when: { beaten: ['hollowking'] }, look: 'carving',
    lines: ['A clean stone stands by the south road: SIR ALDRIC. HE STOOD.',
      'Under it, newly scratched in a terrible hand: HE CAME BACK. Coins have been left on top, the way you do for luck.'],
    reward: { gold: 30 } },

  { id: 'pale-prints', name: 'Footprints from the gate', at: { x: 1090, y: 150 }, r: 24,
    when: { beaten: ['hollowking'] }, look: 'footprints',
    lines: ['Pale footprints in the frost behind the gate, many kinds of boot, none of them warm. They come out of the portal in pairs.',
      'They walk a little way toward town, and stop exactly where you are standing.'],
    reward: { gold: 40 } },
];

if (typeof module !== 'undefined') module.exports = { TOWN_SECRETS };
