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

  bossLore: {
    grubnak: 'The first hall on the King\'s Road was the court\'s kitchen, where its funeral feasts were cooked. Grubnak found it empty, the ovens still warm and the knives still sharp, and decided it was his. He has fed on the road\'s travellers ever since. The gate opens on his Scullery first, because it always did.',
    skitterra: 'Below the kitchens lie the caves where the court dug moon-silver for its crowns. The Broodmother came for the silver and stayed for the dark. They say she stole one thread of it from the moon itself and spun her web around it. Tobble lived down there once. He moved out.',
    volkar: 'On the peak above the caves the court kept a beacon, lit every night so the road could find its way. When it went cold the storm came, and in the storm something sat down. Volkar has not left the summit since, and Emberfall has not had a clear sky in thirty years.',
    hollowking: 'Past the beacon the road comes to the Barrow, where the kings of the valley are laid to rest. One of them refused. His guard still stand watch, his bells toll for the living, and the moon over his tomb is going down. What lies on the road beyond him, nobody in Emberfall has lived to say.',
    titan: 'North of the peaks the land turns white. A plateau of glacier lies there under the aurora, a mosaic of ice that the thaw never quite breaks, and a giant keeps it. Hrimgar was the Warden of the White Reach before the kings had a name for the cold. He does not hate the valley. He simply walks, and the ice remembers where.',
    wyrm: 'Past the Barrow the King\'s Road gives out, and the court\'s land with it. The old things the kings pushed back from the valley are still out there, and the first of them holds the highest crater of the Cinder Peaks. Vhalgrath was already old when the first king was born. He did not mind the kings. He minds anything that flies over his crater.',
    archmage: 'On a spit of rock at the edge of the wild land stood the tower of the court\'s archmage, who drew a circle on every floor of it, one for fire and one for frost, one for lightning and one for the dark, to hold back the sea. The sea came anyway, a floor at a time. Azerath did not leave. The water stands in his halls and the circles still burn under it, and he is still at his work.',
    hydra: 'Where the wild land meets the old coast there was a temple, and the sea took it. The priests had left a pool in the middle of it, and something has grown in the pool ever since. The people of the coast call her the Mother of Nine Heads. They do not mean she has had nine children. They mean each head is a child, and each of them thinks it is the one who should speak.',
  },
};

if (typeof module !== 'undefined') module.exports = { STORY };
