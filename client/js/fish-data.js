// What bites in the pond south-west of the plaza. Sell your catch to Bram (the angler's 'fish-shop').
// rarity: 0 common, 1 uncommon, 2 rare, 3 legendary. `when` gates a fish behind a boss's first defeat.
// Overview: docs/plans/story.md.

const FISH = [
  { id: 'mudminnow', name: 'Mudminnow', rarity: 0, desc: 'Small, brown and everywhere. Bram calls them "the pond clearing its throat".', sell: 2, when: null },
  { id: 'reed-perch', name: 'Reed Perch', rarity: 0, desc: 'Striped like the reeds it hides in, and about as clever.', sell: 3, when: null },
  { id: 'tankard-bream', name: 'Tankard Bream', rarity: 0, desc: 'Fat on crusts thrown from the tavern deck. Tastes faintly of ale.', sell: 4, when: null },
  { id: 'lantern-dace', name: 'Lantern Dace', rarity: 1, desc: 'Its belly glows when the plaza lamps are lit. Nobody knows which started it.', sell: 8, when: null },
  { id: 'copper-carp', name: 'Copper Carp', rarity: 1, desc: 'Scales the colour of wishing coins. It has swallowed a few.', sell: 10, when: null },
  { id: 'greasefin', name: 'Greasefin', rarity: 1, desc: 'Came down the stream when the Scullery drains ran clear. Fries itself, nearly.', sell: 9, when: { beaten: ['grubnak'] } },
  { id: 'silk-loach', name: 'Silk Loach', rarity: 1, desc: 'Trails pale threads from its fins. Hilde will not let it near the forge.', sell: 11, when: { beaten: ['skitterra'] } },
  { id: 'storm-eel', name: 'Storm Eel', rarity: 2, desc: 'Still carries a little of the titan\'s weather. Hold it by the tail, and not for long.', sell: 18, when: { beaten: ['volkar'] } },
  { id: 'bell-carp', name: 'Bellmouth Carp', rarity: 2, desc: 'When it gulps at the surface, it makes a sound like a very small bell.', sell: 20, when: { beaten: ['hollowking'] } },
  { id: 'ghost-pike', name: 'Grey Pike', rarity: 2, desc: 'You can see the reeds through it if you hold it to the light. It does not like that.', sell: 22, when: { beaten: ['hollowking'] } },
  { id: 'old-whiskers', name: 'Old Whiskers', rarity: 3, desc: 'The catfish Bram has been after for twenty years. He will want to hear all about it.', sell: 40, when: null },
  { id: 'moon-koi', name: 'Moon Koi', rarity: 3, desc: 'Silver as the thread at the heart of a web. It only rises once the moon over the Barrow stops sinking.', sell: 45, when: { beaten: ['hollowking'] } },
];

if (typeof module !== 'undefined') module.exports = { FISH };
