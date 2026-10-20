// Feats: achievements kept per account. Some grant a title shown under the player's name.
// Hidden feats show as ??? until earned. Only the check types the engine supports are used here.
// Overview: docs/plans/story.md.

const FEATS = [
  // ---------------------------------------------------------------- the road
  { id: 'first-course', name: 'First Course', desc: 'Defeat Grubnak.', title: 'Ogre\'s Last Customer', hidden: false,
    check: { type: 'clear', boss: 'grubnak', mode: 'normal' } },
  { id: 'cut-the-thread', name: 'Cut the Thread', desc: 'Defeat Queen Skitterra.', title: null, hidden: false,
    check: { type: 'clear', boss: 'skitterra', mode: 'normal' } },
  { id: 'clear-skies', name: 'Clear Skies', desc: 'Defeat Volkar.', title: null, hidden: false,
    check: { type: 'clear', boss: 'volkar', mode: 'normal' } },
  { id: 'the-bells-stop', name: 'The Bells Stop', desc: 'Defeat the Hollow King.', title: null, hidden: false,
    check: { type: 'clear', boss: 'hollowking', mode: 'normal' } },
  { id: 'kings-road', name: 'The King\'s Road', desc: 'Defeat all four bosses.', title: 'Walker of the Road', hidden: false,
    check: { type: 'clearAll', mode: 'normal' } },

  // ---------------------------------------------------------------- hard
  { id: 'sent-it-back', name: 'Sent It Back', desc: 'Defeat Grubnak on Hard.', title: 'Sent It Back', hidden: false,
    check: { type: 'clear', boss: 'grubnak', mode: 'hard' } },
  { id: 'eight-eyes', name: 'All Eight Eyes', desc: 'Defeat Queen Skitterra on Hard.', title: null, hidden: false,
    check: { type: 'clear', boss: 'skitterra', mode: 'hard' } },
  { id: 'lightning-rod', name: 'Lightning Rod', desc: 'Defeat Volkar on Hard.', title: 'Stormproof', hidden: false,
    check: { type: 'clear', boss: 'volkar', mode: 'hard' } },
  { id: 'kneel-to-no-one', name: 'Kneel to No One', desc: 'Defeat the Hollow King on Hard.', title: null, hidden: false,
    check: { type: 'clear', boss: 'hollowking', mode: 'hard' } },
  { id: 'hask-counted', name: 'Hask Counted Four', desc: 'Defeat all four bosses on Hard.', title: 'Counted Back In', hidden: false,
    check: { type: 'clearAll', mode: 'hard' } },

  // ---------------------------------------------------------------- clean and quick
  { id: 'nobody-carried', name: 'Nobody Carried Out', desc: 'Defeat any boss without anyone dying.', title: null, hidden: false,
    check: { type: 'clearNoDeaths' } },
  { id: 'clean-plates', name: 'Clean Plates', desc: 'Defeat Grubnak on Hard without anyone dying.', title: null, hidden: false,
    check: { type: 'clearNoDeaths', boss: 'grubnak', mode: 'hard' } },
  { id: 'osric-idle', name: 'A Quiet Shift', desc: 'Defeat the Hollow King without anyone dying.', title: 'The Digger\'s Day Off', hidden: true,
    check: { type: 'clearNoDeaths', boss: 'hollowking' } },
  { id: 'express-service', name: 'Express Service', desc: 'Defeat Grubnak in under 7 minutes.', title: null, hidden: false,
    check: { type: 'clearUnder', boss: 'grubnak', secs: 420 } },
  { id: 'brief-audience', name: 'A Brief Audience', desc: 'Defeat the Hollow King in under 8 minutes.', title: null, hidden: false,
    check: { type: 'clearUnder', boss: 'hollowking', secs: 480 } },

  // ---------------------------------------------------------------- persistence
  { id: 'back-again', name: 'Back Again', desc: 'Go through the portal 10 times.', title: null, hidden: false,
    check: { type: 'pulls', n: 10 } },
  { id: 'regular', name: 'A Regular', desc: 'Go through the portal 100 times.', title: 'The Usual', hidden: false,
    check: { type: 'pulls', n: 100 } },
  { id: 'practice-makes', name: 'Straw and Sawdust', desc: 'Finish 10 runs in the Practice Hall.', title: null, hidden: false,
    check: { type: 'practice', n: 10 } },
  { id: 'many-hands', name: 'Many Hands', desc: 'Defeat a boss with 4 different heroes.', title: null, hidden: false,
    check: { type: 'heroes', n: 4 } },
  { id: 'every-seat', name: 'Every Seat at the Table', desc: 'Defeat a boss with all 17 heroes.', title: 'Of Many Faces', hidden: false,
    check: { type: 'heroes', n: 17 } },
  { id: 'by-the-fire', name: 'By the Fire', desc: 'Learn 20 journal pages.', title: null, hidden: false,
    check: { type: 'journal', n: 20 } },

  // ---------------------------------------------------------------- town
  { id: 'nosy', name: 'Nosy', desc: 'Find a secret in town.', title: null, hidden: false,
    check: { type: 'secrets', n: 1 } },
  { id: 'every-stone', name: 'Every Stone Turned', desc: 'Find all 14 secrets in town.', title: 'Knows Every Stone', hidden: false,
    check: { type: 'secrets', n: 14 } },
  { id: 'well-liked', name: 'Well Liked', desc: 'Receive 3 gifts from the townsfolk.', title: null, hidden: false,
    check: { type: 'gifts', n: 3 } },
  { id: 'friend-of-emberfall', name: 'Friend of Emberfall', desc: 'Receive 7 gifts from the townsfolk.', title: 'Friend of Emberfall', hidden: false,
    check: { type: 'gifts', n: 7 } },
  { id: 'seconds', name: 'Seconds', desc: 'Share 10 feasts.', title: null, hidden: false,
    check: { type: 'feasts', n: 10 } },
  { id: 'notice-taken', name: 'Notice Taken', desc: 'Complete 10 bounties from the board.', title: null, hidden: false,
    check: { type: 'bounties', n: 10 } },
  { id: 'first-bite', name: 'First Bite', desc: 'Catch a fish.', title: null, hidden: false,
    check: { type: 'fish', n: 1 } },
  { id: 'patient', name: 'Patience', desc: 'Catch 50 fish.', title: null, hidden: false,
    check: { type: 'fish', n: 50 } },
  { id: 'old-whiskers', name: 'The One That Didn\'t Get Away', desc: 'Land Old Whiskers.', title: 'Teller of Fish Tales', hidden: true,
    check: { type: 'fish', fish: 'old-whiskers' } },
  { id: 'showing-off', name: 'Showing Off', desc: 'Use 25 emotes.', title: null, hidden: true,
    check: { type: 'emotes', n: 25 } },

  // ---------------------------------------------------------------- loot and the court
  { id: 'golden', name: 'Something Golden', desc: 'Own a legendary item.', title: null, hidden: false,
    check: { type: 'items', rarity: 3 } },
  { id: 'mythic', name: 'Stuff of Songs', desc: 'Own a mythic item.', title: 'Worth a Verse', hidden: true,
    check: { type: 'items', rarity: 4 } },
  { id: 'an-old-road', name: 'An Old Road', desc: 'Walk a road the court remembers.', title: null, hidden: true,
    check: { type: 'trial', n: 1 } },
];

if (typeof module !== 'undefined') module.exports = { FEATS };
