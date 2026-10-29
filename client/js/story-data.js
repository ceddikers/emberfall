// The light story of Emberfall: why a sleepy town sits under a portal with four bosses in a row.
// prologue: shown once, the first time a player enters town. bossLore: one paragraph under each boss's blurb on the
// Raid Board. The tale is open-ended: the Hollow King is the threat of the moment, not the end of the road.
// Overview: docs/plans/story.md.

const STORY = {
  prologue: [
    { h: 'The King\'s Road',
      body: ['Long ago the kings of this valley built a gate above the town of Emberfall.',
        'A road runs through it past the places the court kept: its kitchens, its silver caves, the beacon on the storm peak, the Barrow where its kings were laid to rest, and on, further than anyone in town has followed it.'] },
    { h: 'The king who stayed',
      body: ['A hundred years ago a king was carried down that road and would not lie down.',
        'He kept his crown, his guard and his bells. Since then hungry things have found their way along the road and settled in the halls his court left empty.'] },
    { h: 'What moved in',
      body: ['An ogre took the kitchens and kept the knives sharp. A spider queen took the silver caves. Something sat down on the cold beacon, and the sky has not cleared since.',
        'The gate opens on them one at a time, and never past one that still stands.'] },
    { h: 'Emberfall',
      body: ['The town stayed, the way towns do. Its graves face the Barrow, a sergeant counts who comes back through the gate, and the regulars at the Tankard have heard every plan before.',
        'This autumn the Barrow bells began to toll loud enough to hear in the square. Four of you came up the south road.',
        'Everyone starts in the Scullery.'] },
  ],

  // shown once, the first time the account has cleared the Ultimate (pastimes.js storyCheck)
  epilogue: [
    { h: 'The night after',
      body: ['By nightfall every window in Emberfall was lit, some that had been dark for years. The Barrow bells did not toll. The stones of the square, which had been warm for as long as anyone could say, were only stone.',
        'Hask stood at the portal and counted, the way he has for seventeen years. Four had gone in. He counted four coming back out and, being Hask, counted again.',
        'In the morning the road still ran away from the town, the way the kings meant it to. For once nobody was watching it.'] },
  ],

  bossLore: {
    grubnak: 'The first hall on the King\'s Road was the court\'s kitchen, where its funeral feasts were cooked. Grubnak found it empty, the ovens still warm and the knives still sharp, and decided it was his. He has fed on the road\'s travellers ever since. The gate opens on his Scullery first, because it always did.',
    skitterra: 'Below the kitchens lie the caves where the court dug moon-silver for its crowns. The Broodmother came for the silver and stayed for the dark. They say she stole one thread of it from the moon itself and spun her web around it. Tobble lived down there once. He moved out.',
    volkar: 'On the peak above the caves the court kept a beacon, lit every night so the road could find its way. When it went cold the storm came, and in the storm something sat down. Volkar has not left the summit since, and Emberfall has not had a clear sky in thirty years.',
    hollowking: 'Past the beacon the road comes to the Barrow, where the kings of the valley are laid to rest. One of them refused. His guard still stand watch, his bells toll for the living, and the moon over his tomb is going down. What lies on the road beyond him, nobody in Emberfall has lived to say.',
    titan: 'North of the peaks the land turns white. A plateau of glacier lies there under the aurora, a mosaic of ice that the thaw never quite breaks, and a giant keeps it. Hrimgar was the Warden of the White Reach before the kings had a name for the cold. He does not hate the valley. He simply walks, and the ice remembers where.',
    wyrm: 'Past the Barrow the King\'s Road gives out, and the court\'s land with it. The old things the kings pushed back from the valley are still out there, and the first of them holds the highest crater of the Cinder Peaks. Vhalgrath was already old when the first king was born. He did not mind the kings. He minds anything that flies over his crater.',
    archmage: 'On a spit of rock at the edge of the wild land stood the tower of the court\'s archmage, who drew a circle on every floor of it, one for fire and one for frost, one for lightning and one for the dark, to hold back the sea. The sea came anyway, a floor at a time. Azerath did not leave. The water stands in his halls and the circles still burn under it, and he is still at his work.',
    hydra: 'Where the wild land meets the old coast there was a temple, and the sea took it. The priests had left a pool in the middle of it, and something has grown in the pool ever since. The people of the coast call her the Mother of Nine Heads. They do not mean she has had nine children. They mean each head is a child, and each of them thinks it is the one who should speak.',
    corvane: 'Beyond the wild land the road climbs into a snowed-in pass that the court\'s builders cut and then tried to forget. The words chipped off the back of the portal ring were never a place name. They were a warning: a star fell beyond this pass before there were kings, and the gate was built so the road would lead away from it. Corvane was set to guard the way. Nobody ever came to relieve him, so he keeps the post still, and he answers everyone who climbs to it the only way a guard can.',
    brannoc: 'Down the far side of the pass the old coast gives way to a bowl of sand and sea, where the court once held its games. The arena drowned a long age ago, and the crowd never left. They are still in the stands, pale and loud, and the champion they cheer is still in the ring. Brannoc was never beaten, and he is the kind of man who would rather be loved than be right. When the star reached down into the water it did not have to ask him twice. He has taken a bigger body, because a bigger body is a bigger show.',
    morrowoak: 'At the end of the road the land climbs to the rim of the crater, where the oldest tree in the realm still stands in a grove of his own planting. He drank from the star before there were kings, and learned that living is only another kind of hunger. So he fed the Hunger his grove, a tree at a time, to be allowed to go on. A hunger that is fed does not learn to stop. Morrow-Oak is the last thing standing in his own wood, and he has been mending himself out of whatever the dark gave back.',
    caelum: 'At the bottom of the crater lies the star itself, half sunk in the rock where it fell before there were kings, and beside it stands the one it chose. Caelum Vey does not run and does not speak, and he is always already where you were about to be. For an age he has been calling the rest of it down, and the burning stone that has hung over every room of this road is his work. The gate was built so the road would lead away from him. The road, being a road, came here anyway. Whether it ends in fire or in light is the only question it has left.',
    sovereign: 'The fourth portal in the square has never opened. Every road the kings cut through the gate leads away from it, which is the only reason anyone thought to ask what it was for. The stone round its ring is never cold, and the snow does not settle there. The other three portals go out. This one, the old people say, goes down.',
  },
};

if (typeof module !== 'undefined') module.exports = { STORY };
