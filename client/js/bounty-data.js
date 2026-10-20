// The bounty board by the portal: notices pinned up by the townsfolk. The engine picks 3 a week from this pool,
// leaving out any that name a boss the player hasn't opened yet. Overview: docs/plans/story.md.

const BOUNTIES = [
  // ---------------------------------------------------------------- Grubnak
  { id: 'cold-kitchen', name: 'Keep the Kitchen Cold', desc: 'The Scullery smoke is back over the trees. Put the ovens out again, would you. (Marigold, who has washing out)',
    goal: { type: 'clear', boss: 'grubnak', n: 2 }, reward: { gold: 50 } },
  { id: 'no-seconds', name: 'No Second Helpings', desc: 'Into the kitchen and out again with everyone you took. I count who comes out. Make it all of you. (Hask)',
    goal: { type: 'clearNoDeaths', boss: 'grubnak', n: 1 }, reward: { gold: 60 } },
  { id: 'quick-service', name: 'Quick Service', desc: 'Wager on the board: nobody clears the Scullery before the bread\'s out. Eight minutes. Prove me wrong. (Corwin)',
    goal: { type: 'clearUnder', boss: 'grubnak', secs: 480 }, reward: { gold: 70 } },
  { id: 'ogre-hard', name: 'Sent Back to the Kitchen', desc: 'They say on a bad night he sets the brandy alight. Go on a bad night. (Fennick, who sells cleavers)',
    goal: { type: 'clear', boss: 'grubnak', mode: 'hard', n: 1 }, reward: { gold: 90 } },

  // ---------------------------------------------------------------- Skitterra
  { id: 'cellar-quiet', name: 'Quiet Cellars', desc: 'Scratching in the cellars again. Visit the Broodmother twice and remind her whose town this is. (Marigold)',
    goal: { type: 'clear', boss: 'skitterra', n: 2 }, reward: { gold: 60 } },
  { id: 'clean-web', name: 'Not a Thread Touched', desc: 'Go through her caves without a single one of you blundering into anything you could have stepped round. (Tobble)',
    goal: { type: 'noAvoidable', boss: 'skitterra' }, reward: { gold: 110 } },
  { id: 'queen-hard', name: 'The Queen at Her Worst', desc: 'Need fresh silk, the angry kind. Hard-won, as they say. (Hilde)',
    goal: { type: 'clear', boss: 'skitterra', mode: 'hard', n: 1 }, reward: { gold: 100 } },

  // ---------------------------------------------------------------- Volkar
  { id: 'kite-weather', name: 'Kite Weather', desc: 'The clouds are coming back over the mountain. The children want their kites. Please go up there. (Pip, aged nine and a half)',
    goal: { type: 'clear', boss: 'volkar', n: 1 }, reward: { gold: 60 } },
  { id: 'summit-whole', name: 'All the Way Down', desc: 'Climb the summit and walk back down, every one of you. I never managed the first part. (Corwin)',
    goal: { type: 'clearNoDeaths', boss: 'volkar', n: 1 }, reward: { gold: 90 } },
  { id: 'storm-swift', name: 'Before the Rain', desc: 'Bring the titan down before the storm can build. Nine minutes. The fountain told me. (Tobble)',
    goal: { type: 'clearUnder', boss: 'volkar', secs: 540 }, reward: { gold: 110 } },

  // ---------------------------------------------------------------- the Hollow King
  { id: 'bells-again', name: 'The Bells Again', desc: 'My gran wouldn\'t say its name after dark. The bells are saying it for her. Make them stop. (Marigold)',
    goal: { type: 'clear', boss: 'hollowking', n: 1 }, reward: { gold: 80 } },
  { id: 'oath-kept', name: 'As the Guard Stood', desc: 'Face the court and let none of you fall. I\'d like one quiet week with the shovel. (Osric)',
    goal: { type: 'clearNoDeaths', boss: 'hollowking', n: 1 }, reward: { gold: 130 } },
  { id: 'kings-eye', name: 'Mind the King\'s Eye', desc: 'Into the Barrow and out, and nobody hit by anything they could have dodged. Seventeen years I\'ve wanted to see that. (Hask)',
    goal: { type: 'noAvoidable', boss: 'hollowking' }, reward: { gold: 150 } },

  // ---------------------------------------------------------------- anywhere
  { id: 'busy-week', name: 'A Busy Week', desc: 'Through the portal and back, four times, whoever\'s behind it. I\'m counting. (Hask)',
    goal: { type: 'clear', n: 4 }, reward: { gold: 80 } },
  { id: 'no-avoidable', name: 'Light on Your Feet', desc: 'One clear, any hall, without a single careless knock. I bet you can\'t. I bet my best marble. (Pip)',
    goal: { type: 'noAvoidable' }, reward: { gold: 70 } },
  { id: 'fish-supper', name: 'Fish for the Pot', desc: 'Bring in a few fish this week. The Tankard\'s run out, and nobody will say who ate it all. (Bram, at the pond)',
    goal: { type: 'fish', n: 5 }, reward: { gold: 40 } },
  // (needs Gaspard, who arrives once Grubnak falls)
  { id: 'eat-together', name: 'Eat Together', desc: 'You lot are getting thin. Sit down at my table twice before the week is out. (Gaspard)',
    goal: { type: 'feast', n: 2 }, reward: { gold: 45 } },
  { id: 'straw-men', name: 'Straw Men', desc: 'The practice dummies are getting lazy. Give them three proper runs in the Hall. (Hilde, who stuffed them)',
    goal: { type: 'practice', n: 3 }, reward: { gold: 40 } },
  { id: 'look-around', name: 'Look Around You', desc: 'This town keeps more than it shows. Find something nobody\'s noticed. (Tobble)',
    goal: { type: 'secrets', n: 1 }, reward: { gold: 40 } },
];

if (typeof module !== 'undefined') module.exports = { BOUNTIES };
