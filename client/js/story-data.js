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
  },
};

if (typeof module !== 'undefined') module.exports = { STORY };
