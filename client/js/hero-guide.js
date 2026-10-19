// Character-select copy: each hero's passive (their signature mechanic, always on) and a few
// combos to try. Combo steps are slot keys (q w e r d f space); `+` in a step means "weave".

const HERO_GUIDE = {
  bastion: {
    passive: { name: 'Perfect Block', icon: 'brace', desc: 'Brace in the instant before a hit lands to block it perfectly: +20 Resolve, and your next Blade Chain hit becomes a counterattack.' },
    combos: [
      { keys: ['q', 'q', 'q', 'w'], text: 'Blade Chain to Judgment, then throw Holy Edge once Resolve passes 50.' },
      { keys: ['e', 'q'], text: 'Brace on the boss\'s swing, then cash the counter with Blade Chain.' },
      { keys: ['r', 'q', 'w', 'w'], text: 'Oath of Valor at ~100 Resolve: Judgment refills double, so Holy Edges chain.' },
    ],
  },
  bloodreaver: {
    passive: { name: 'Blood for Blood', icon: 'drain', desc: 'Crimson Drain heals you for 35% of the damage you took in the last 6s and hits harder the more you took. Getting hit is fuel.' },
    combos: [
      { keys: ['q', 'q', 'e'], text: 'Hack, Maul, Bloodletting between hits: the fastest way to fill Blood.' },
      { keys: ['w'], text: 'Drain right after a tankbuster lands, not before.' },
      { keys: ['r', 'w', 'w', 'w'], text: 'Frenzy, then three free empowered Drains.' },
      { keys: ['f', 'w', 'w'], text: 'Undying keeps you at 1 HP; doubled Drains pull you back up.' },
    ],
  },
  runeguard: {
    passive: { name: 'Ward Break', icon: 'ward', desc: 'Runic Wards explode when they end. The more they absorbed, the bigger the blast, and a fully broken Ward refunds its Rune.' },
    combos: [
      { keys: ['q', 'q', 'q', 'e'], text: 'Three Rune Strikes into Glyph Burst: steady damage.' },
      { keys: ['q', 'w'], text: 'Ward right before a tankbuster: it breaks, refunds, and explodes.' },
      { keys: ['r', 'q', 'q', 'e'], text: 'Overload: Strikes give 2 Runes, so Glyph Bursts come twice as fast.' },
      { keys: ['f'], text: 'Mirror Aegis on the boss\'s biggest swing reflects it back.' },
    ],
  },
  ranger: {
    passive: { name: 'Keen Eye', icon: 'pierce', desc: 'Quick Shot can light up Keen Eye: your next Piercing Arrow hits harder and gives its charge back. A new proc while one waits is wasted.' },
    combos: [
      { keys: ['q', 'w'], text: 'Cash every Keen Eye proc straight away.' },
      { keys: ['f', 'q', 'e'], text: 'Barrage, Quick Shot (fires three times, triple Focus), then Rapid Fire.' },
      { keys: ['r', 'f', 'q', 'e', 'w'], text: 'Hunter\'s Mark and Barrage together every minute, with the party\'s burst.' },
    ],
  },
  shadowblade: {
    passive: { name: 'Positionals', icon: 'step', desc: 'Strike from behind for 2 combo points; Eviscerate from the side for bonus damage. The boss faces the tank, so pick your side.' },
    combos: [
      { keys: ['q', 'q', 'w'], text: 'From behind: two Strikes give 4 points, then Eviscerate.' },
      { keys: ['d', 'q', 'q', 'q', 'w'], text: 'Venom Blade first: poisoned targets take 15% more from Eviscerate.' },
      { keys: ['e', 'q', 'w'], text: 'Pushed to the wrong side? Shadowstep: every hit counts as a positional for 5s.' },
      { keys: ['r', 'q', 'q', 'w'], text: 'Shadow Dance: faster attacks, every positional lands, Eviscerate +25%.' },
    ],
  },
  pyromancer: {
    passive: { name: 'Heat & Hot Streak', icon: 'pyro', desc: 'Heat raises all your damage (+30% at full) but burns you at 100. Two crits in a row light up Hot Streak: an instant, empowered Pyroblast.' },
    combos: [
      { keys: ['q', 'e', 'w'], text: 'Fireball crits, Fire Blast mid-cast (always crits), then instant Hot Streak Pyroblast.' },
      { keys: ['d'], text: 'Vent at 85-95 Heat, ideally right before you have to move.' },
      { keys: ['r', 'q', 'w', 'q', 'w'], text: 'Combustion: every cast crits, so Hot Streaks chain.' },
    ],
  },
  cleric: {
    passive: { name: 'Dawnstar', icon: 'petal', desc: 'Dawn Petals regrow every 15s. Every third Petal you spend turns your next Smite into Dawnstar, a huge instant attack. Healing becomes damage.' },
    combos: [
      { keys: ['e', 'e', 'e', 'q'], text: 'Three Petals on hurt allies, then fire Dawnstar.' },
      { keys: ['r'], text: 'Prayer Circle before a raidwide (not after) for mitigation plus regen.' },
      { keys: ['f', 'e'], text: 'Tankbuster incoming: Benediction\'s shield, then a Petal after.' },
    ],
  },
  grovekeeper: {
    passive: { name: 'Bloom', icon: 'bloom', desc: 'Every Rejuvenate tick grows Bloom. Spend it on Bloom for a burst of healing that also makes your next Wrath instant and stronger.' },
    combos: [
      { keys: ['w', 'q', 'q'], text: 'Rejuvenate before damage lands, then attack while it works.' },
      { keys: ['d', 'q'], text: 'Bloom at 50+, then the free instant Wrath.' },
      { keys: ['r', 'd'], text: 'Wild Growth, then Bloom: it heals the whole party.' },
      { keys: ['e'], text: 'Thornlash is your instant attack while moving.' },
    ],
  },
  chronomancer: {
    passive: { name: 'Haste / Slow', icon: 'shift', desc: 'Slow: Bolts heal your linked ally and Flux fills. Haste: faster casts, +10% damage, Bolts heal everyone, but Flux drains. Empty Flux makes you stumble.' },
    combos: [
      { keys: ['q', 'q', 'q'], text: 'Slow stance: every Bolt heals the tank.' },
      { keys: ['e', 'q', 'q', 'e'], text: 'Shift to Haste for raidwides (first Bolt is instant), then back before Flux runs out.' },
      { keys: ['w'], text: 'Rewind right after a tankbuster: their HP snaps back.' },
      { keys: ['d'], text: 'Stasis on the boss\'s biggest hit: two seconds of immunity for everyone.' },
    ],
  },
};

// Alembist (classes-b)
HERO_GUIDE.alembist = {
  passive: { name: 'Ripening', icon: 'throw', desc: 'Two reagents brew a vial into your bandolier. Vials grow 30% stronger over their first 10s and spoil after 40s, and Throw always takes the oldest one, so you brew in the order you will need them.' },
  combos: [
    { keys: ['w', 'w', 'r'], text: 'Dew and Dew: a Mending Draught. Throw it into the middle of the hurt.' },
    { keys: ['q', 'q', 'w', 'w', 'r'], text: 'A bomb now, a Draught behind it: the oldest vial goes first.' },
    { keys: ['e', 'e', 'r'], text: 'A Salt Ward under the party just before a raidwide lands.' },
    { keys: ['d', 'w', 'w', 'r'], text: 'Distill makes the next brew instant: an emergency Draught.' },
    { keys: ['f'], text: 'Grand Batch fills the bandolier with copies of your last vial.' },
  ],
};
