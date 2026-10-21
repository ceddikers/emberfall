// Character-select copy: each hero's passive (their signature mechanic, always on) and a few
// combos to try. Combo steps are slot keys (q w e r d f space, and t for the Ultimate); `+` in a step means "weave".

const HERO_GUIDE = {
  bastion: {
    passive: { name: 'Perfect Block', icon: 'brace', desc: 'Brace in the instant before a hit lands to block it perfectly: +20 Resolve, and your next Blade Chain hit becomes a counterattack (+{d:150}).' },
    combos: [
      { keys: ['q', 'q', 'q', 'w'], text: 'Blade Chain to Judgment, then throw Holy Edge once Resolve passes 50.' },
      { keys: ['e', 'q'], text: 'Brace on the boss\'s swing, then cash the counter with Blade Chain.' },
      { keys: ['e', 'w'], text: 'Brace a tankbuster perfectly: the charge comes back and the next Holy Edge is free.' },
      { keys: ['d', 'e'], text: 'Rally Banner with spare Resolve before a raidwide, then Perfect Blocks under it earn 10 more each.' },
      { keys: ['r', 'q', 'w', 'w'], text: 'Oath of Valor at ~100 Resolve: Judgment refills double, so Holy Edges chain.' },
      { keys: ['t', 'e'], text: 'Last Bastion just before a raidwide or a tankbuster, then Brace into the hit: the dome and the block stack.' },
    ],
  },
  bloodreaver: {
    passive: { name: 'Blood for Blood', icon: 'drain', desc: 'Every hit you take goes into the bank. Crimson Drain cashes it (the damage since your last Drain, 6s at most): it heals you for 35% of it and hits up to {d:700} more the more it holds. Cash it while the blood is warm, within 1.2s of a big hit, or the bank goes cold. Getting hit is fuel.' },
    combos: [
      { keys: ['q', 'q', 'e'], text: 'Hack, Maul, Bloodletting between hits: the fastest way to fill Blood.' },
      { keys: ['w'], text: 'Hold your GCD as a tankbuster comes in, then Drain the instant it lands, while the blood is warm.' },
      { keys: ['r', 'w', 'q', 'w', 'q', 'w'], text: 'Frenzy, then three free Drains spread out, so each one has a bank to cash.' },
      { keys: ['d', 'w'], text: 'War Cry before a tankbuster, then the free Drain after it: the party heals with you.' },
      { keys: ['w', 'f', 'w', 'w'], text: 'Empty your Blood, then Undying into a tankbuster: the hit refills it, and doubled, free Drains pull you back up.' },
      { keys: ['t', 'w', 'w', 'w'], text: 'Crimson Eclipse before a tankbuster: three free Drains while the hits bank, then the eclipse erupts. Under Undying its heals double.' },
    ],
  },
  runeguard: {
    passive: { name: 'Ward Break', icon: 'ward', desc: 'Runic Wards explode when they end. The more they absorbed, the bigger the blast ({d:150} up to {d:600}), and a fully broken Ward refunds its Rune.' },
    combos: [
      { keys: ['q', 'q', 'q', 'e'], text: 'Three Rune Strikes into Glyph Burst: steady damage.' },
      { keys: ['q', 'w'], text: 'Ward right before a tankbuster: it breaks, refunds, and explodes.' },
      { keys: ['r', 'q', 'q', 'e'], text: 'Overload: Strikes give 2 Runes, so Glyph Bursts come twice as fast, and a Ward broken all the way gives one more.' },
      { keys: ['f'], text: 'Mirror Aegis on a tankbuster reflects it back and carves a Rune.' },
      { keys: ['d', 'w'], text: 'Sanctum, then a Ward before a raidwide: the Ward keeps its Rune and its blast heals the party.' },
      { keys: ['q', 'w', 'q', 'q', 't'], text: 'Ward up and three Runes in hand, then Runic Cataclysm: every Rune and the Ward come down on the boss, and the party gets Wards of its own.' },
    ],
  },
  ranger: {
    passive: { name: 'Keen Eye', icon: 'pierce', desc: 'Quick Shot can light up Keen Eye: your next Piercing Arrow hits for {d:500} instead of {d:340} and gives its charge back. You can bank two; a third is wasted.' },
    combos: [
      { keys: ['q', 'w'], text: 'Cash Keen Eye procs before a third one is lost.' },
      { keys: ['f', 'q', 'e'], text: 'Barrage, Quick Shot (fires three times, triple Focus), then Rapid Fire.' },
      { keys: ['r', 'f', 'q', 'e', 'e', 'e'], text: 'Pool 100 Focus, then Hunter\'s Mark and Barrage: Rapid Fire costs 25 in the Mark and hits twice as hard, so it all goes out in volleys there.' },
      { keys: ['r', 'w', 'f', 'q'], text: 'In the Mark, cash a Keen Eye while a second is banked: it readies Barrage again.' },
      { keys: ['d', 't', 'q', 'w'], text: 'Pool Focus, Hunter\'s Cloak, then Starfall Volley: every volley also mends the party, and each Quick Shot under the stars lights Keen Eye.' },
    ],
  },
  shadowblade: {
    passive: { name: 'Positionals', icon: 'step', desc: 'Strike from behind for 2 combo points; Eviscerate from the side for {d:80} more. The boss faces the tank, so pick your side.' },
    combos: [
      { keys: ['q', 'q', 'w'], text: 'From behind: two Strikes give 4 points, then Eviscerate.' },
      { keys: ['d', 'q', 'q', 'q', 'w'], text: 'Venom Blade first: poisoned targets take 15% more from Eviscerate.' },
      { keys: ['e', 'q', 'w'], text: 'Pushed to the wrong side? Shadowstep: every hit counts as a positional for 5s.' },
      { keys: ['q', 'q', 'q', 'r', 'w', 'w'], text: 'Hold 5 points, then Shadow Dance: the first Eviscerate in it keeps them, so the next one is ready at once.' },
      { keys: ['r', 'f', 'q', 'w'], text: 'Smoke Bomb inside Shadow Dance: the party is covered and the Dance runs 3s longer.' },
      { keys: ['q', 'q', 'e', 'w'], text: 'Bladedancer: Strike, Strike, Blade Fury lands Eviscerate on exactly 5 for a Tempo; three make the next Blade Fury a Flourish.' },
      { keys: ['r', 't', 'q', 'w', 'w', 'w'], text: 'Thousand Cuts inside Shadow Dance: Shadow Cut to 5 points, then Eviscerate every global without spending them, and it all comes due at the end.' },
    ],
  },
  pyromancer: {
    passive: { name: 'Heat & Hot Streak', icon: 'pyro', desc: 'Heat raises all your damage (+30% at full) but burns you at 100. Two crits in a row light up Hot Streak: an instant, empowered Pyroblast ({d:620}).' },
    combos: [
      { keys: ['q', 'e', 'w'], text: 'Fireball crits, Fire Blast mid-cast (always crits), then instant Hot Streak Pyroblast.' },
      { keys: ['e', 'd', 'w'], text: 'White-Hot: a Fire Blast lifts high Heat past 90, then Vent: it lights Hot Streak too.' },
      { keys: ['r', 'q', 'w', 'q', 'w'], text: 'Combustion: every cast crits, so Hot Streaks chain, and each Hot Streak Pyroblast keeps it burning 1s longer.' },
      { keys: ['w', 'd'], text: 'Cataclysm: Vent while the Meteor falls. It lands at once and your Heat burns in its crater.' },
      { keys: ['r', 't', 'q', 'w', 'q'], text: 'Phoenix Dive inside Combustion: it burns longer, and the instant Phoenix moves crit on a short global cooldown.' },
    ],
  },
  cleric: {
    passive: { name: 'Dawnstar', icon: 'petal', desc: 'Dawn Petals regrow every 15s. Every third Petal you spend turns your next Smite into Dawnstar, an instant attack for {d:950}; a Mend counts as half a Petal, and a Petal that grows past 3 blooms by itself onto the most hurt ally. Healing becomes damage.' },
    combos: [
      { keys: ['e', 'e', 'e', 'q'], text: 'Three Petals on hurt allies, then fire Dawnstar.' },
      { keys: ['r'], text: 'Prayer Circle before a raidwide (not after) for mitigation plus regen.' },
      { keys: ['f', 'e'], text: 'Tankbuster incoming: Benediction\'s shield, then a Petal after.' },
      { keys: ['t', 'e', 'e', 'e'], text: 'Dawn Breaks after a raidwide with three Petals held and Dawnstar ready: the biggest heal and the biggest smite, then three fresh Petals to spend.' },
    ],
  },
  grovekeeper: {
    passive: { name: 'Bloom', icon: 'bloom', desc: 'Every Rejuvenate tick grows Bloom. Spend it on Bloom for a burst of healing ({h:400} on each ally under Rejuvenate) that also makes your next Wrath instant and 50% stronger.' },
    combos: [
      { keys: ['w', 'q', 'q'], text: 'Rejuvenate before damage lands, then attack while it works.' },
      { keys: ['d', 'q'], text: 'Bloom at 50+, then the free instant Wrath.' },
      { keys: ['r', 'd'], text: 'Wild Growth, then Bloom: it heals the whole party.' },
      { keys: ['e'], text: 'Thornlash is your instant attack while moving.' },
      { keys: ['e', 'w', 't', 'd'], text: 'Thornlash and Rejuvenates out, then World Tree: every Rejuvenate blooms, the Thornlash starts over, and the 50 Bloom it gives you is a Bloom right away.' },
    ],
  },
  // the advanced classes
  thermist: {
    passive: { name: 'Thermal Shock', icon: 'invert', desc: 'Each step from 0 makes that side\'s spells 8% stronger. Carry the dial across 0 after reaching 3 or more and the swing detonates on the target: the bigger the swing, the bigger the Shock (a swing of 3 is {d:195}, 6 is {d:510}, 10 is {d:930}). Past ±5 you overload.' },
    combos: [
      { keys: ['e', 'e', 'q', 'e'], text: 'Climb to +5 with Flare and a Cinder Bolt, then the instant, sure-crit Flare at the edge.' },
      { keys: ['r', 'r', 'r'], text: 'On the Brink: go frost. Three Glacier Lances carry you from +5 across 0: a swing of 6.' },
      { keys: ['f'], text: 'Inversion at ±5: a swing of 10, half again as strong.' },
      { keys: ['d'], text: 'Equilibrium before a big hit: a shield sized by how far the dial falls back to 0. The swing is kept, so your next spell across 0 still sets off the Shock.' },
      { keys: ['q', 'w'], text: 'Cinder Bolt and Rime Shard are instant: cast them while you move.' },
      { keys: ['e', 'd', 't'], text: 'Reach +5, Equilibrium before the big hit, then Supernova: the swing you stored sizes the blast, and it stays armed for your next Shock.' },
    ],
  },
  driftblade: {
    passive: { name: 'Drift', icon: 'cross', desc: 'Drift comes from moving: Hook Turn and Slipstream give 15, walking 15 a second, and it holds for 1.5s after you stop, then drains 15 a second. Nearly every cut hits harder with Drift behind it. Run clean through an enemy and you cut it as you pass: a Passing Strike, {d:90} (up to twice that with full Drift) and 10 Drift.' },
    combos: [
      { keys: ['q', 'q', 'r'], text: 'Keep moving while you Carve, then spend a full gauge on Crosswind.' },
      { keys: ['w', 'e', 'space'], text: 'Slipstream through the boss, Hook Turn round it (it gives the dash back), then dash again.' },
      { keys: ['f', 'w', 'w'], text: 'Gale Run when the fight makes you move: every pass through the boss hits three times as hard.' },
      { keys: ['d'], text: 'Stillpoint just before a hit lands: a parry and a riposte, and your Drift holds.' },
      { keys: ['f', 't', 'd', 'r', 'd'], text: 'Eye of the Gale inside Gale Run: keep running, Eye Step through the boss, Gale Line, and never stop: the tempest at the end is sized by your Drift.' },
    ],
  },
  chronomancer: {
    passive: { name: 'Haste / Slow', icon: 'shift', desc: 'Slow: Bolts heal your linked ally and Flux fills. Haste: faster casts, +10% damage, Bolts heal everyone, but Flux drains. Empty Flux makes you stumble.' },
    combos: [
      { keys: ['q', 'q', 'q'], text: 'Slow stance: every Bolt heals the tank.' },
      { keys: ['e', 'q', 'q', 'e'], text: 'Shift to Haste for raidwides (first Bolt is instant), then back before Flux runs out: Paradox cashes in the Flux you spent, a hit that heals the party.' },
      { keys: ['w'], text: 'Rewind right after a tankbuster: their HP snaps back. In Haste it costs Flux instead of a charge.' },
      { keys: ['d', 'q', 'q', 'd'], text: 'Stasis as a raidwide comes in, Bolt through it, then release: every held heal lands on the party at once.' },
      { keys: ['r'], text: 'Accelerando on the damage dealer with the most to cast: they are Quickened on top of the party haste.' },
      { keys: ['t', 'q', 'q'], text: 'Time Reversal right after a raidwide: everyone\'s health snaps back, then two instant Haste Bolts on full Flux heal the rest.' },
    ],
  },
};

// Ironpalm: the combos are its named strings (Light Q, Heavy W, Kick E)
HERO_GUIDE.ironpalm = {
  passive: { name: 'Strings', icon: 'fist', desc: 'No global cooldown. Every press of Light, Heavy or Kick is a quick hit that costs Breath, and strings of them pressed in rhythm become named moves. A press made just as the last one recovers is Crisp: 10% harder, and 40% cheaper in Breath. The glowing key lights on that beat.' },
  combos: [
    { keys: ['q', 'q', 'w'], text: 'Rising Gate: a launcher that draws the boss to you.' },
    { keys: ['q', 'q', 'w', 'e', 'e'], text: 'Rising Gate, then two Kicks: Heaven\'s Drop on the airborne boss. While it is in the air any key carries on.' },
    { keys: ['q', 'e', 'w', 'w'], text: 'Thousand Palms, the finisher.' },
    { keys: ['w', 'e', 'e'], text: 'Tiger Wall, a blocking stance, before a heavy blow. W W E is Stone Breaker, W W W Iron Ox.' },
    { keys: ['e', 'q'], text: 'Crane Step gives Breath back without stopping.' },
    { keys: ['q', 'q', 'q'], text: 'Flowing Palms in perfect rhythm when you run low: all three Crisp, and it breathes Breath back into you.' },
    { keys: ['r', 'w'], text: 'Read a tankbuster as it lands, and the next Heavy is a free, Crisp Thousand Palms.' },
    { keys: ['w', 'w', 'w', 'r', 'w'], text: 'Iron Ox throws the boss off balance and brings Read back: Read its next swing, and the Heavy after is a free Thousand Palms.' },
    { keys: ['t', 'q', 'q', 'w'], text: 'Hundred Palms, the grand string, just before a raidwide: the bell covers the party, and your Breath is full for the next string.' },
  ],
};

// Alembist (classes-b)
HERO_GUIDE.alembist = {
  passive: { name: 'Ripening', icon: 'throw', desc: 'Two reagents brew a vial into your bandolier. Vials grow 30% stronger over their first 10s and spoil after 40s. Smart Throw picks the vial by who you aim at: an ally below 70% health gets your strongest heal, anyone else your oldest bomb. Every vial you throw that is not a bomb lights a coal in the Kiln, and with three lit your next Throw also launches a free Kiln Bomb for {d:900}.' },
  combos: [
    { keys: ['w', 'w', 'r'], text: 'Dew and Dew: a Mending Draught. Throw it into the middle of the hurt.' },
    { keys: ['q', 'q', 'w', 'w', 'r'], text: 'A bomb and a Draught in the bandolier: R on a hurt ally throws the Draught, R on a healthy one the bomb.' },
    { keys: ['e', 'w', 'r'], text: 'Salt glows while a raidwide is on its way: Salt and Dew make a Salve, thrown on the party before it lands.' },
    { keys: ['d', 'w', 'w', 'r'], text: 'Distill makes the next brew instant: an emergency Draught.' },
    { keys: ['f'], text: 'Grand Batch fills the bandolier with copies of your last vial.' },
    { keys: ['f', 't', 'r'], text: 'A full bandolier, then Magnum Opus: every vial adds to the heal and the blast, then they are all ripe and the Kiln is lit for your next Throw.' },
  ],
};

// Gorgemaw, Oathbroker (tanks-2)
Object.assign(HERO_GUIDE, {
  gorgemaw: {
    passive: { name: 'The Belly', icon: 'wide', desc: 'Open Wide just before an attack lands on you and you eat it: a quarter of the damage, and a Morsel in the shape of what you ate. Spit it back at the boss, or in a hard moment (below 60% HP, or a tankbuster on its way) Digest them all to heal.' },
    combos: [
      { keys: ['w', 'e'], text: 'Open Wide as the tankbuster lands, then Spit the Spike straight back.' },
      { keys: ['r', 'w', 'e'], text: 'Digest as a tankbuster comes, eat it, and spit the Spike back with the acid: up to twice as hard.' },
      { keys: ['d', 'r'], text: 'Iron Gut, then Digest in any moment: every Morsel counts twice, so one is enough for a doubled Spit.' },
      { keys: ['q', 'q', 'q', 'e'], text: 'An empty Belly? Gulp swallows a Ring for you to spit.' },
      { keys: ['w'], text: 'Stand in a teammate\'s spread circle and eat it for them.' },
      { keys: ['f'], text: 'Bottomless on the fight\'s worst raidwide: the party takes half.' },
      { keys: ['w', 'w', 't'], text: 'Fill the Belly, then Maw of Ruin: spat and digested at once, a party shield, and the jaw left open for the next bite.' },
    ],
  },
  oathbroker: {
    passive: { name: 'The Ledger', icon: 'settle', desc: '60% of every hit you take is written into the Ledger and billed to you 8s later. Pay it down with your combo, push it back, settle it cheap, or make the boss pay.' },
    combos: [
      { keys: ['q', 'q', 'q'], text: 'Dun, Levy, Collect: every hit pays the oldest lines down.' },
      { keys: ['r', 'q', 'q', 'q'], text: 'Lien on a long Ledger, then Collect: the boss pays half of each bill, and every payment strikes it too.' },
      { keys: ['w', 'r'], text: 'Renegotiate the lines about to fall due, then Lien: the boss pays every pushed line in full.' },
      { keys: ['e'], text: 'Settle a long Ledger for half while your healer has you topped.' },
      { keys: ['w', 'f'], text: 'Take a tankbuster without Writ, Renegotiate the Ledger past 30% of your HP, then Default: a debt that size strikes the boss for more than it held, but your credit closes for 10s.' },
      { keys: ['w', 't'], text: 'Renegotiate to keep a long Ledger open, then Final Reckoning: it all comes due on the boss, and the party is shielded from the proceeds.' },
    ],
  },
});
// Threadweaver and Marionettist (classes-c)
HERO_GUIDE.threadweaver = {
  passive: { name: 'Threads', icon: 'tie', desc: 'Allies you Tie share what lands on them: a hit on one end is split evenly along the thread, and a heal on one end runs 60% of the way down. A thread snaps past 260 px.' },
  combos: [
    { keys: ['w', 'e'], text: 'Tie the tank, then Mend Seam: the heal runs down the thread to you.' },
    { keys: ['w', 'w'], text: 'Tie twice on two allies to tie them to each other. Pair the one about to be hit with someone healthy.' },
    { keys: ['r', 'w'], text: 'Snap the web just before a spread mechanic tears it, then re-tie on the stack.' },
    { keys: ['w'], text: 'Tie an ally who is already on your threads to pull them out of the fire along it.' },
    { keys: ['w', 'w', 'd'], text: 'Fill the web, then Shuttle: {d:120} for every thread you hold.' },
    { keys: ['r', 'q'], text: 'Any snap makes your next Needle instant: Snap before you have to move, then Needle on the run.' },
    { keys: ['f'], text: 'Tapestry on the hit that would kill someone: for 8s it is split four ways.' },
    { keys: ['w', 'w', 't'], text: 'Fill the web, then Grand Loom: every thread heals the party and strikes the boss, and the web re-forms as a Tapestry.' },
  ],
};
HERO_GUIDE.marionettist = {
  passive: { name: 'Strings', icon: 'pull', desc: 'The Doll does the fighting. Three Strings hold it: one tears if it is pulled past 300 px from you or a blow lands on it, and with none left it goes limp for 4s.' },
  combos: [
    { keys: ['q', 'q', 'e'], text: 'Jab, then Cross-Cut with the boss between you and the Doll.' },
    { keys: ['w', 'e'], text: 'Pull the Doll to the far side of the boss to line up the cut.' },
    { keys: ['r'], text: 'Pirouette when a telegraph is about to land on the Doll (it glows): it spins through the blow and earns 1 more Encore.' },
    { keys: ['d', 'e'], text: 'Swap a few seconds before Cross-Cut comes up: once the Doll is back on its mark, the cut lands twice as hard.' },
    { keys: ['f'], text: 'Grand Finale every time Encore is full (it needs all 5), once you know nothing is coming for the next few seconds.' },
    { keys: ['t', 'd'], text: 'Curtain Call with all three Strings taut, then Swap within 10s for the bow.' },
  ],
};
