// Talents: every hero (class) has 5 rows of 3. You hold one pick per row; rows unlock in order with gold
// (TALENT_COSTS, the account-wide wallet) and picks are free to change in town. Talents belong to the hero, not the
// spec: a talent on a move a spec replaces works on the replacement (the kits check the base ability's id, and a
// replacement names the move it took over with `replaces`). Where a spec's version plays very differently the talent
// says so in `spec` (its text for that spec), and the kit code gives it a fitting variant.
//
// Rows, roughly: 1 rotation, 2 survival or utility, 3 the class gauge, 4 big cooldowns, 5 a capstone.
// The rule (2026-10): talents change how a hero plays, not how big the numbers are. Per class at most one plain number
// (a flat cooldown or cast change); rows III and V each hold a talent that grants a whole new move in place of one of
// the six (`grants`); everything else is a new trigger, a follow-up press, a move that now moves you or leaves a zone,
// an interaction with the gauge, or a reaction to the boss (its casts, Vulnerability). The three in a row should play
// differently. No power cap (2026-10-27): weak talents are lifted to at least mid-B on the talent power scale, strong
// ones are left alone; tools/talents.js measures them.
//
// A talent: { id, name, ab (the base ability it changes: its tooltip shows the talent), text, spec?: { specId: text },
//   cd?: { baseAbilityId: seconds } (cooldown change), cast?: { baseAbilityId: seconds } (cast time change),
//   specMods?: { specId: { cd?, cast? } } (a spec's own numbers for those), grants?: true (the move
//   TALENT_ABILITIES[id] in kits.js takes the slot of `ab`, specs.js kitFor) }.
// The kits check k.talent(id) (engine.js); cd / cast changes are applied by the engine from this data.
// Client-side only: nothing here touches HP or Defense, so the host never needs to know.
// Saves keep the id of each pick (save.js): a pick whose id leaves its row is cleared, the row stays bought.
// Rows VI and VII are the spec rows (SPEC_TALENTS, after TALENTS): bought once per hero with gold, after row V, and
// shown only once the hero has a spec. Each spec keeps its own picks in them; only the active spec's picks are held.

// rows I-V, then the spec rows VI and VII (SPEC_TALENTS below). The first row is free: every hero has it open from the start.
const TALENT_COSTS = [0, 100, 180, 280, 400, 540, 700];
const BASE_ROWS = 5;   // rows I-V: TALENTS. Rows VI-VII (indexes 5, 6): SPEC_TALENTS, for the hero's active spec

const TALENTS = {
  // ======================================================================= TANKS
  bastion: [
    [
      { id: 'bastion_rhythm', name: 'Shield Rhythm', ab: 'blade', text: 'A Blade Chain hit that carries a Perfect Block counter now skips the chain ahead: your next press is Judgment, countered too (+{d:150}) and it gives 20 more Resolve.' },
      { id: 'bastion_returning', name: 'Returning Edge', ab: 'edge', text: 'Holy Edge now comes back to your hand: a moment later it cuts the boss again on the way home, for a quarter of the damage, and catching it gives 5 Resolve.',
        spec: { sentinel: 'Shield Bash now sends a shockwave rolling on: a moment later it strikes the boss again, for a quarter of the damage, and the rebound gives 5 Resolve.' } },
      { id: 'bastion_read', name: 'Read the Swing', ab: 'blade', text: 'Whenever the boss begins a cast, your next Blade Chain hit counters it (+{d:150}), as after a Perfect Block, and a countered hit gives 10 Resolve.' },
    ],
    [
      { id: 'bastion_holdfast', name: 'Hold Fast', ab: 'brace', text: 'A Brace raised while the boss is casting now holds until the cast lands (up to 6s) instead of 3s. A guard raised early takes the blow like half a Perfect Block: 25% less on top, then 15 Resolve and a countering Blade Chain as it lands.' },
      { id: 'bastion_mercy', name: 'Shared Mercy', ab: 'edge', text: 'While you are above 70% HP, Holy Edge\'s heal goes to the most hurt ally instead of you, twice as strong ({h:240}).',
        spec: { sentinel: 'While you are above 70% HP, Shield Bash\'s heal goes to the most hurt ally instead of you, twice as strong ({h:240}).' } },
      { id: 'bastion_laststand', name: 'Last Stand', ab: 'bulwark', text: 'Raise Bulwark while the boss is casting at you and it waits for the landing (up to 6s), then holds its full 10s. Still above a third of your health 3s after the hit, it comes back 60s sooner and Brace\'s charges refill.',
        spec: { crusader: 'Raise Zealous Guard while the boss is casting at you and it waits for the landing (up to 6s), then holds its full 10s. Still above a third of your health 3s after the hit, it comes back 60s sooner, Brace\'s charges refill, and your next Holy Edge is Radiant.' } },
    ],
    [
      { id: 'bastion_hallowed', name: 'Hallowed Ground', ab: 'banner', grants: true,
        text: 'Rally Banner becomes Hallowed Ground (30s): pour out all your Resolve (at least 30) to consecrate the ground under you for 10s. The party takes 15% less damage, 1% more for every 5 Resolve (25% at 50 or more), and the boss burns every 2s, for {d:72} at 30 Resolve up to {d:240} at 100. A Perfect Block inside gives 10 more Resolve.' },
      { id: 'bastion_steady', name: 'Steady Hands', ab: 'edge', text: 'After a Perfect Block, your next Holy Edge costs 20 Resolve instead of 50 and hits a quarter harder.',
        spec: { sentinel: 'After a Perfect Block, your next Shield Bash costs 20 Resolve instead of 50 and hits a quarter harder.' } },
      { id: 'bastion_overflow', name: 'Overflowing Faith', ab: 'brace', text: 'Resolve that would spill past 100 now hardens into a shield on you for 10s, {s:30} for each point spilled, and flares at the boss for {d:20} for each.' },
    ],
    [
      { id: 'bastion_unbreakable', name: 'Unbreakable', ab: 'bulwark', text: 'While Bulwark lasts, every Perfect Block gives its Brace charge straight back, 15 Resolve, and takes 4s off Bulwark\'s recharge (up to 12s in all).',
        spec: { crusader: 'While Zealous Guard lasts, every Perfect Block gives its Brace charge straight back, 15 Resolve, and takes 4s off its recharge (up to 12s in all).' } },
      { id: 'bastion_shelter', name: 'Shelter', ab: 'bulwark', text: 'Bulwark now covers the party too: for 8s everyone takes 25% less damage.',
        spec: { crusader: 'Zealous Guard now covers the party too: for 8s everyone takes 25% less damage.' } },
      { id: 'bastion_ironwill', name: 'Iron Will', ab: 'brace', cd: { brace: -1.5 }, text: 'Brace recharges 1.5s faster, and each Perfect Block takes another 1s off the next charge.' },
    ],
    [
      { id: 'bastion_avatar', name: 'Avatar of Dawn', ab: 'oath', grants: true,
        text: 'Oath of Valor becomes Avatar of Dawn (60s): wings of light for 15s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss for {d:200}.',
        spec: { crusader: 'Oath of Valor becomes Avatar of Dawn (60s): wings of light for 20s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss for {d:200}.' } },
      { id: 'bastion_sunlit', name: 'Sunlit Shield', ab: 'brace', text: 'A Perfect Block now also throws a flash of light into the boss for {d:160}.' },
      { id: 'bastion_echo', name: 'Edge of Judgment', ab: 'blade', text: 'Judgment now also hurls a shard of Holy Edge at the boss for {d:75}, and it heals you for {h:60}.',
        spec: { sentinel: 'Judgment now also splinters a shard off your shield and hurls it at the boss for {d:75}, and it heals you for {h:60}.' } },
    ],
  ],

  bloodreaver: [
    [
      { id: 'bloodreaver_gore', name: 'Gore', ab: 'hack', text: 'Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow for {d:560} that gives 20 Blood.',
        spec: { berserker: 'Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow for {d:560} that gives 20 Rage.' } },
      { id: 'bloodreaver_rend', name: 'Rend', ab: 'hack', text: 'Maul now carves a Wound in the boss (up to 3). Crimson Drain tears every Wound open for {d:130} extra each.',
        spec: { berserker: 'Maul now carves a Wound in the boss (up to 3). Rampage tears every Wound open for {d:130} extra each.' } },
      { id: 'bloodreaver_retaliate', name: 'Retaliation', ab: 'letting', text: 'Taking a tenth of your HP or more within 4s wets the blade: for as long as that holds your Bloodletting cuts twice as deep and gives twice the Blood.',
        spec: { hemomancer: 'Taking a tenth of your HP or more within 4s wets the blade: for as long as that holds your Blood Lance strikes twice as hard and gives twice the Blood.' } },
    ],
    [
      { id: 'bloodreaver_sanguine', name: 'Sanguine Shield', ab: 'drain', text: 'Crimson Drain hardens a quarter of the damage it cashes into a shield on you, up to 8% of your HP, for 8s.',
        spec: { berserker: 'Rampage hardens a quarter of the damage it cashes into a shield on you, up to 8% of your HP, for 8s.' } },
      { id: 'bloodreaver_desperate', name: 'Blood Scent', ab: 'hack', text: 'While your blood is up (the bank holds a tenth of your HP or more) you hit 10% harder, and each hit of Hack & Maul heals you for 2% of your HP.' },
      { id: 'bloodreaver_cauterize', name: 'Cauterize', ab: 'letting', text: 'Bloodletting now cauterizes: you mend 4% of your HP and take 8% less damage for 4s. If you carry Vulnerability the cut also washes it off (once every 15s), strikes twice as hard, and the charge comes straight back.',
        spec: { hemomancer: 'Blood Lance now cauterizes: you mend 4% of your HP and take 8% less damage for 4s. If you carry Vulnerability the throw also washes it off (once every 15s), strikes twice as hard, and the charge comes straight back.' } },
    ],
    [
      { id: 'bloodreaver_scab', name: 'Scab', ab: 'warcry', grants: true,
        text: 'War Cry becomes Scab (20s): spend 20 Blood to grow a scab over your wounds, a shield worth the damage you took in the last 6s (at least a tenth of your HP, at most four tenths) for 8s. Whatever is left of it when it falls off comes back as Blood. Your next Crimson Drain in 10s costs no Blood, runs warm and hits for {d:320} more, and the party heals for half of what it heals you.',
        spec: { berserker: 'War Cry becomes Scab (20s): spend 20 Rage to grow a scab over your wounds, a shield worth the damage you took in the last 6s (at least a tenth of your HP, at most four tenths) for 8s. Whatever is left of it when it falls off comes back as Rage. Your next Rampage in 10s costs no Rage, runs warm and hits for {d:320} more, and the party heals for half of what it heals you.' } },
      { id: 'bloodreaver_second', name: 'Second Helping', ab: 'drain', text: 'A Crimson Drain that heals you for more than 9% of your HP gives back 20 Blood and bites the boss again for a third of its damage.',
        spec: { berserker: 'A Rampage that heals you for more than 6% of your HP gives back 20 Rage and bites the boss again for a third of its damage.' } },
      { id: 'bloodreaver_boil', name: 'Boiling Blood', ab: 'frenzy', text: 'Every Crimson Drain you spend Blood on takes 8s off Frenzy\'s cooldown, or adds 4s to Frenzy while it lasts. Blood that would spill past 100 is not lost either: every 10 of it counts for 1s.',
        spec: { berserker: 'Every Rampage you spend Rage on takes 8s off Frenzy\'s cooldown, or adds 4s to Frenzy while it lasts. Rage that would spill past 100 is not lost either: every 10 of it counts for 1s.' } },
    ],
    [
      { id: 'bloodreaver_frenzied', name: 'Frenzied Letting', ab: 'frenzy', text: 'Frenzy now also opens your veins: it refills Bloodletting\'s charges.',
        spec: { hemomancer: 'Frenzy now also opens your veins: it refills Blood Lance\'s charges.' } },
      { id: 'bloodreaver_quickvein', name: 'Quickened Vein', ab: 'letting', cd: { letting: -6 }, text: 'Bloodletting recharges 6s faster.', spec: { berserker: 'Bloodletting recharges 6s faster (Bloodbath, if you take it, recharges in 11s instead of 15s).', hemomancer: 'Blood Lance recharges in 11s instead of 15s.' } },
      { id: 'bloodreaver_tide', name: 'Crimson Tide', ab: 'drain', text: 'Crimson Drain\'s healing now also flows to the most hurt ally, at a third of the strength.',
        spec: { berserker: 'Rampage\'s healing now also flows to the most hurt ally, at a third of the strength.', hemomancer: 'Shared Vein now flows to the party at 35% of the strength instead of 25%.' } },
    ],
    [
      { id: 'bloodreaver_moon', name: 'Blood Moon', ab: 'undying', grants: true,
        text: 'Undying becomes Blood Moon (120s): for 10s you cannot drop below 1 HP and your heals are doubled. When it sets you burst in a tide of blood: the boss takes damage for every hit you took under it (up to {d:1500}), and you heal for a quarter of that.' },
      { id: 'bloodreaver_hemorrhage', name: 'Hemorrhage', ab: 'drain', text: 'Crimson Drain now opens a Hemorrhage on the boss, {d:55} every 3s for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP.',
        spec: { berserker: 'Rampage now opens a Hemorrhage on the boss, {d:55} every 3s for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP.' } },
      { id: 'bloodreaver_bloodlust', name: 'Bloodlust', ab: 'frenzy', text: 'When Frenzy ends you finish with a free Crimson Drain that remembers every hit you took while it lasted. Its blood is warm, and every Drain talent you hold rides on it.',
        spec: { berserker: 'When Frenzy ends you finish with a free Rampage that remembers every hit you took while it lasted. Its blood is warm, and every Rampage talent you hold rides on it.' } },
    ],
  ],

  runeguard: [
    [
      { id: 'runeguard_overflow', name: 'Overflow', ab: 'strike', text: 'Every fifth Rune Strike overflows: a Rune spills out and bursts into the boss for {d:200}.',
        spec: { runeblade: 'Every fifth Rune Blade hit overflows: a Rune spills out and bursts into the boss for {d:200}.' } },
      { id: 'runeguard_echo', name: 'Glyph Echo', ab: 'glyph', text: 'Glyph Burst now leaves its glyph hanging on the boss: the next time you raise a Runic Ward, it goes off again for a quarter.',
        spec: { runeblade: 'Rune Cleave now leaves its rune hanging on the boss: the next time you raise a Runic Ward, it goes off again for a quarter.' } },
      { id: 'runeguard_answer', name: 'Answering Rune', ab: 'strike', text: 'After a Ward of yours breaks or Mirror Aegis reflects, your next three Rune Strikes within 15s each give an extra Rune.',
        spec: { runeblade: 'After a Ward of yours breaks or Mirror Aegis reflects, your next three Rune Blade hits within 15s each give an extra Rune.' } },
    ],
    [
      { id: 'runeguard_leap', name: 'Leaping Ward', ab: 'ward', text: 'A Runic Ward that ends with strength left now leaps: what is left of it, topped up by half of what the Ward soaked, jumps to the most hurt ally (never back onto you) for 10s.' },
      { id: 'runeguard_patient', name: 'Patient Mirror', ab: 'mirror', text: 'Mirror Aegis raised while the boss is casting now waits for that cast to land (up to 8s) instead of 3s. A tankbuster it reflects also shields the whole party (you too) for {s:350} for 6s.' },
      { id: 'runeguard_emergency', name: 'Emergency Ward', ab: 'ward', text: 'With no Rune in hand, Runic Ward still goes up, at 80% strength (once every 20s). The next Rune you gain pays for it. If it breaks all the way, the debt is forgiven and the Rune comes back.' },
    ],
    [
      { id: 'runeguard_whirl', name: 'Whirling Runes', ab: 'sanctum', grants: true,
        text: 'Sanctum becomes Whirling Runes (30s): every Rune you hold tears loose and spins around you as a blade for 12s, striking the boss every 2s for {d:55} per Rune. While they spin you take 15% less damage. When they fall away, each one comes back to your hand as a Rune.' },
      { id: 'runeguard_reclaim', name: 'Reclaim', ab: 'ward', text: 'A Ward that absorbed at least a quarter gives its Rune back.', spec: { spellwarden: 'A Ward you raise on an ally below 80% health gives its Rune back at once (once every 6s).' } },
      { id: 'runeguard_glyphguard', name: 'Glyphguard', ab: 'glyph', text: 'Glyph Burst now also raises a small Ward ({s:150}) on you if you have none (once every 30s). It explodes like a Ward, for {d:60} up to {d:240}.',
        spec: { runeblade: 'Rune Cleave now also raises a small Ward ({s:150}) on you if you have none (once every 30s). It explodes like a Ward, for {d:60} up to {d:240}.' } },
    ],
    [
      { id: 'runeguard_shards', name: 'Mirror Shards', ab: 'mirror', text: 'A reflected hit now shatters the mirror into shards that strike the boss four more times for {d:220} each.' },
      { id: 'runeguard_shatter', name: 'Shatter', ab: 'ward', text: 'Raising a Runic Ward while yours is still up now shatters the old one: it blasts as if it had been broken all the way, half again as hard (once every 10s). It gives no Rune back, and no talent counts it as a break, but what was left of the old Ward shields the most hurt ally for 6s.' },
      { id: 'runeguard_polished', name: 'Polished Mirror', ab: 'mirror', cd: { mirror: -30 }, text: 'Mirror Aegis recharges 30s faster, and its reflect hits 80% harder ({d:2700}).' },
    ],
    [
      { id: 'runeguard_living', name: 'Living Rune', ab: 'overload', grants: true,
        text: 'Runic Overload becomes Living Rune (60s): a great rune rises behind you for 15s. Everything Runic Overload does, and every Rune you spend makes it fire a bolt at the boss for {d:200}.' },
      { id: 'runeguard_nova', name: 'Ward Nova', ab: 'ward', text: 'A Runic Ward broken all the way now erupts in a nova: it strikes the boss for {d:120} and heals the whole party for a fifth of the Ward.',
        spec: { spellwarden: 'A Runic Ward that absorbed at least half now erupts in a nova when it ends: it strikes the boss for {d:120} and heals the whole party for a fifth of the Ward.' } },
      { id: 'runeguard_binding', name: 'Sigil of Binding', ab: 'glyph', text: 'Glyph Burst now carves a binding sigil under the boss for 10s (once every 12s): your next three Rune Strikes while it burns each give an extra Rune.',
        spec: { runeblade: 'Rune Cleave now carves a binding sigil under the boss for 10s (once every 12s): your next three Rune Blade hits while it burns each give an extra Rune.' } },
    ],
  ],

  // ======================================================================= DPS
  ranger: [
    [
      { id: 'ranger_rhythm', name: 'Fletcher\'s Rhythm', ab: 'quick', text: 'Every third Quick Shot looses a second arrow for 70% damage, and that arrow can light Keen Eye too.' },
      { id: 'ranger_ricochet', name: 'Ricochet', ab: 'pierce', text: 'A Piercing Arrow glances off the boss and strikes again for a quarter as much (up to {d:100}). If it crits, it also gives its charge back and lights Keen Eye.',
        spec: { sharpshooter: 'An Aimed Shot glances off the boss and strikes again for a quarter as much (up to {d:100}). If it crits, it also gives its charge back and lights Keen Eye.', venomstrike: 'A Caustic Arrow glances off the boss and strikes again for a quarter as much (up to {d:100}). If it crits, it also gives its charge back and lights Keen Eye.' } },
      { id: 'ranger_steady', name: 'Steady Breath', ab: 'quick', text: 'A Quick Shot loosed after standing still for 2s lights Keen Eye far more often (65%).' },
    ],
    [
      { id: 'ranger_disengage', name: 'Disengage', ab: 'cloak', text: 'Hunter\'s Cloak now also leaps you backwards, clear of whatever is at your feet, loosing a snap shot of {d:500} that always crits as you go. You cannot be touched for 1s, and the Cloak comes back 10s sooner.' },
      { id: 'ranger_secondwind', name: 'Second Wind', ab: 'quick', text: 'When you drop below 50% HP, your next Quick Shot also heals you for 20% of your HP and you take 20% less damage for 4s (once every 40s).' },
      { id: 'ranger_lightfoot', name: 'Light Feet', ab: 'pierce', text: 'Each Piercing Arrow takes 4s off Hunter\'s Cloak\'s cooldown and gives 4 Focus. While Cloaked, your crit chance is 20% higher.',
        spec: { sharpshooter: 'Each Aimed Shot takes 4s off Hunter\'s Cloak\'s cooldown and gives 4 Focus. While Cloaked, your crit chance is 20% higher.', venomstrike: 'Each Caustic Arrow takes 4s off Hunter\'s Cloak\'s cooldown and gives 4 Focus. While Cloaked, your crit chance is 20% higher.' } },
    ],
    [
      { id: 'ranger_explosive', name: 'Explosive Shot', ab: 'rapid', grants: true,
        text: 'Rapid Fire becomes Explosive Shot: spend 50 Focus (25 in your Mark) to plant a charge that blows 2.5s later for {d:400} ({d:860} in your Mark). Every Quick Shot or Piercing Arrow that lands before then makes the blast 35% bigger.',
        spec: { sharpshooter: 'Rapid Fire becomes Explosive Shot: spend 50 Focus (20 in your Mark) to plant a charge that blows 2.5s later for {d:400} ({d:860} in your Mark). Every Quick Shot or Aimed Shot that lands before then makes the blast 35% bigger.', venomstrike: 'Rapid Fire becomes Explosive Shot: spend 50 Focus (25 in your Mark) to plant a charge that blows 2.5s later for {d:400} ({d:860} in your Mark). Every Quick Shot that lands before then makes the blast 35% bigger; a Caustic Arrow does not.' } },
      { id: 'ranger_focusfire', name: 'Focus Fire', ab: 'quick', text: 'At full Focus, Quick Shot no longer wastes it: instead of giving Focus it hits twice as hard (a Barrage keeps its three arrows).' },
      { id: 'ranger_tracking', name: 'Tracking', ab: 'quick', text: 'Each Quick Shot that doesn\'t light Keen Eye gives 2 more Focus than the one before (up to 14 more). Keen Eye only halves the count.' },
    ],
    [
      { id: 'ranger_longhunt', name: 'Long Hunt', ab: 'mark', text: 'Hunter\'s Mark lasts 5s longer.', spec: { venomstrike: 'Hunter\'s Mark lasts 4s longer.' } },
      { id: 'ranger_pin', name: 'Pinning Shot', ab: 'pierce', text: 'Lighting Keen Eye pins the boss: your next two Quick Shots are critical hits (once every 6s).' },
      { id: 'ranger_deathmark', name: 'Marked for Death', ab: 'mark', text: 'When Hunter\'s Mark ends, it bursts on the boss for {d:300}, a sure critical hit, plus {d:400} for every Keen Eye you lit while it lasted (up to 6).' },
    ],
    [
      { id: 'ranger_falcon', name: 'Falcon', ab: 'barrage', grants: true,
        text: 'Barrage becomes Falcon (30s): your falcon dives onto the boss and harries it for 10s, striking every 2s for {d:130}. It dives at once, lighting Keen Eye, and every Keen Eye you light while it hunts sends it into a diving strike for {d:300}.' },
      { id: 'ranger_storm', name: 'Storm Arrow', ab: 'pierce', text: 'A Keen Eye Piercing Arrow now calls down lightning: it arcs into the boss three times more, each strike 15% as strong.',
        spec: { sharpshooter: 'A Keen Eye Aimed Shot now calls down lightning: it arcs into the boss three times more, each strike 15% as strong.', venomstrike: 'A Keen Eye Caustic Arrow now calls down lightning: it arcs into the boss three times more, each strike 15% as strong.' } },
      { id: 'ranger_volley', name: 'Wild Volley', ab: 'quick', text: 'Every Quick Shot or Piercing Arrow crit now calls a volley of arrows down on the boss for {d:150}.',
        spec: { sharpshooter: 'Every Quick Shot or Aimed Shot crit now calls a volley of arrows down on the boss for {d:150}.', venomstrike: 'Every Quick Shot or Caustic Arrow crit now calls a volley of arrows down on the boss for {d:150}.' } },
    ],
  ],

  shadowblade: [
    [
      { id: 'shadowblade_feint', name: 'Feint', ab: 'strike', text: 'Every Strike sets up a feint: your next Eviscerate hits 12% harder. A Strike from the front is no longer wasted: it gives 2 combo points as from behind and your next Eviscerate lands as a hit from the side wherever you stand.',
        spec: { nightstalker: 'Every Strike sets up a feint: your next Backstab hits 12% harder. A Strike from the front is no longer wasted: it gives 2 combo points as from behind and your next Backstab lands as a hit from behind wherever you stand.',
          bladedancer: 'Every Strike sets up a feint: your next Eviscerate hits 12% harder.' } },
      { id: 'shadowblade_opportunist', name: 'Opportunist', ab: 'evis', text: 'An Eviscerate while the boss is casting is always a critical hit.',
        spec: { nightstalker: 'A Backstab while the boss is casting is always a critical hit.' } },
      { id: 'shadowblade_ambush', name: 'Ambush', ab: 'step', text: 'Shadowstep now strikes as you arrive: a stab from behind for {d:20} and a combo point.',
        spec: { bladedancer: 'Blade Fury\'s spin now gives a second combo point, but never one past 5 (your Tempo is safe), and hits {d:300} harder.' } },
    ],
    [
      { id: 'shadowblade_dodge', name: 'Shadow Dodge', ab: 'step', text: 'A Shadowstep while the boss is casting also slips the blow: you take 50% less damage for 2s.',
        spec: { bladedancer: 'A Blade Fury while the boss is casting also slips the blow: you take 50% less damage for 2s.' } },
      { id: 'shadowblade_recuperate', name: 'Recuperate', ab: 'evis', text: 'While you are below 70% HP, Eviscerate heals you for 5% of your HP per combo point.',
        spec: { nightstalker: 'While you are below 70% HP, Backstab heals you for 5% of your HP per combo point.' } },
      { id: 'shadowblade_trail', name: 'Smoke Trail', ab: 'step', text: 'Shadowstep leaves a cloud of smoke at both ends, where you vanished and where you land: allies inside take 10% less damage for 8s.',
        spec: { bladedancer: 'Blade Fury kicks up a cloud of smoke around you: allies inside take 14% less damage for 8s.' } },
    ],
    [
      { id: 'shadowblade_rupture', name: 'Rupture', ab: 'venom', grants: true,
        text: 'Venom Blade becomes Rupture: it cuts the boss open for {d:100} and gives a combo point, then it bleeds {d:110} every 2s for 16s. While it bleeds, Eviscerate hits 20% harder (your poison gives 15%).',
        spec: { nightstalker: 'Venom Blade becomes Rupture: it cuts the boss open for {d:100} and gives a combo point, then it bleeds {d:130} every 2s for 16s. While it bleeds, Backstab hits 20% harder (your poison gives 15%).' } },
      { id: 'shadowblade_relentless', name: 'Relentless', ab: 'evis', text: 'A 5-point Eviscerate gives back 2 combo points.', spec: { nightstalker: 'A 5-point Backstab has an even chance to give back 1 combo point.' } },
      { id: 'shadowblade_sharpen', name: 'Sharpened Shadows', ab: 'strike', text: 'Every combo point you gain sharpens your next Eviscerate by 2.5% (up to 12.5%). A point that would spill past 5 sharpens it 12% instead.',
        spec: { nightstalker: 'Every combo point you gain sharpens your next Backstab by 2.5% (up to 12.5%). A point that would spill past 5 sharpens it 12% instead.' } },
    ],
    [
      { id: 'shadowblade_clone', name: 'Shadow Clone', ab: 'dance', text: 'Shadow Dance now calls a shadow that repeats your Eviscerates at 30%.', spec: { nightstalker: 'Shadow Dance now calls a shadow that repeats your Backstabs at 30%.' } },
      { id: 'shadowblade_sprint', name: 'Shadow Sprint', ab: 'step', cd: { step: -4 }, specMods: { bladedancer: { cd: { step: -2 } } }, text: 'Shadowstep recharges 4s faster, and the Strike you land right after one hits 80% harder.', spec: { bladedancer: 'Blade Fury recharges 2s faster, and the Strike you land right after one hits 80% harder.' } },
      { id: 'shadowblade_endless', name: 'Endless Dance', ab: 'dance', text: 'Each finisher of 4 or more points during Shadow Dance makes it last 2s longer (up to 8s), and a 5-point one gives back 1 combo point.' },
    ],
    [
      { id: 'shadowblade_blossom', name: 'Death Blossom', ab: 'smoke', grants: true,
        text: 'Smoke Bomb becomes Death Blossom (90s): you vanish into a storm of knives around the boss, six cuts of {d:30} over 1.5s that each give a combo point, and the smoke shields the party (10% less damage for 10s). The last is a free Eviscerate with everything you hold, and it always lands as a hit from the side.',
        spec: { nightstalker: 'Smoke Bomb becomes Death Blossom (90s): you vanish into a storm of knives around the boss, six cuts of {d:30} over 1.5s that each give a combo point, and the smoke shields the party (10% less damage for 10s). The last is a free Backstab with everything you hold, and it always lands as a hit from behind.' } },
      { id: 'shadowblade_toxic', name: 'Toxic Burst', ab: 'evis', text: 'Eviscerate now bursts your poison or Rupture: 30% of what it has left lands at once, and it keeps going.',
        spec: { nightstalker: 'Backstab now bursts your poison or Rupture: 30% of what it has left lands at once, and it keeps going.' } },
      { id: 'shadowblade_garrote', name: 'Garrote', ab: 'step', text: 'Shadowstep now garrotes: a wire bites into the boss and it bleeds for {d:120} every 3s for 9s.', spec: { bladedancer: 'Blade Fury now leaves the boss bleeding for {d:120} every 3s for 9s.' } },
    ],
  ],

  pyromancer: [
    [
      { id: 'pyromancer_firestarter', name: 'Firestarter', ab: 'fireball', text: 'A Fireball crit sets the target burning for {d:70} every 3s for 9s.' },
      { id: 'pyromancer_chain', name: 'Chain Reaction', ab: 'pyro', text: 'A Hot Streak Pyroblast now leaves you Heating Up (once every 8s), and the first Fireball that fails to crit does not put it out.', spec: { cataclysm: 'A Hot Streak Meteor now leaves you Heating Up the moment you cast it (once every 8s).' } },
      { id: 'pyromancer_hurry', name: 'Overcharged Blast', ab: 'fireblast', text: 'A Fire Blast fired mid-cast finishes that cast at once, 40% harder, and your global cooldown ends 0.8s sooner.' },
    ],
    [
      { id: 'pyromancer_molten', name: 'Molten Armour', ab: 'fireball', text: 'While your Heat is above 50, you take 24% less damage.' },
      { id: 'pyromancer_cauterize', name: 'Cauterize', ab: 'fireblast', text: 'A Fire Blast that turns Heating Up into Hot Streak also heals you for 10% of your HP.' },
      { id: 'pyromancer_haze', name: 'Heat Haze', ab: 'fireball', text: 'Whenever the boss begins a cast, your next Fireball is instant and 35% harder.' },
    ],
    [
      { id: 'pyromancer_firestep', name: 'Firestep', ab: 'smolder', grants: true,
        text: 'Smolder becomes Firestep (15s): blink forward through a burst of flame that scorches the boss for {d:300} and gives 8 Heat. Nothing can touch you as you go, the party takes 8% less damage for 4s, and your next Fireball is instant and 30% harder.' },
      { id: 'pyromancer_banked', name: 'Banked Embers', ab: 'fireball', text: 'Your Heat no longer cools off on its own, and Vent leaves 25 Heat behind.' },
      { id: 'pyromancer_flashpoint', name: 'Flashpoint', ab: 'fireblast', text: 'A Fire Blast at 85 Heat or more now vents 30 Heat into the boss as a second blast for {d:650}, a sure critical hit, instead of adding more.' },
    ],
    [
      { id: 'pyromancer_afterburn', name: 'Afterburn', ab: 'combust', text: 'When Combustion ends, it goes out in a blast of {d:700}, and you get Hot Streak and both Fire Blast charges back.', spec: { sigilmancer: 'When Ember Circle fades, you get Hot Streak and both Fire Blast charges back.' } },
      { id: 'pyromancer_wildfire', name: 'Wildfire', ab: 'combust', text: 'Every crit during Combustion now leaves a flame on the boss that burns for {d:60} every 2s for 6s (up to 3 at once).',
        spec: { sigilmancer: 'Every crit while you stand in Ember Circle now leaves a flame on the boss that burns for {d:120} every 2s for 6s (up to 3 at once).' } },
      { id: 'pyromancer_longburn', name: 'Long Burn', ab: 'combust', text: 'Combustion lasts 4s longer.', spec: { sigilmancer: 'Ember Circle lasts 7s longer and is 25% wider.' } },
    ],
    [
      { id: 'pyromancer_phoenix', name: 'Phoenix Flight', ab: 'vent', grants: true,
        text: 'Vent becomes Phoenix Flight (12s): release all your Heat as a phoenix that sweeps through the boss and wheels back twice more, each pass {d:80} plus {d:24} for every 10 Heat. At 60 Heat or more it leaves you Hot Streak, and a Meteor still falling comes down at once.' },
      { id: 'pyromancer_twin', name: 'Twin Flame', ab: 'pyro', text: 'A Hot Streak Pyroblast now splits: a second, smaller Pyroblast hits for 25%.', spec: { cataclysm: 'A Hot Streak Meteor now brings a second, smaller meteor down a moment later, for 25%.' } },
      { id: 'pyromancer_bomb', name: 'Living Bomb', ab: 'fireball', text: 'Every third Fireball now plants an ember in the boss that bursts 3s later for {d:220}.' },
    ],
  ],

  // ======================================================================= HEALERS
  cleric: [
    [
      { id: 'cleric_atonement', name: 'Atonement', ab: 'smite', text: 'Smite now also heals the most hurt ally for 25% of the damage it deals (Dawnstar too).' },
      { id: 'cleric_held', name: 'Held Dawn', ab: 'smite', text: 'Dawnstar no longer wants spending at once: it grows 3% stronger for every second you hold it, up to 36%, and a sunray gathers every 3s you hold it (up to 4). The throw heals the whole party for {h:200}, and {h:350} more per ray.' },
      { id: 'cleric_petalfall', name: 'Petalfall', ab: 'petal', text: 'Dawn Petal also sends a spark of light into the boss for {d:40} and heals the whole party for {h:60}, and counts as two Petals toward Dawnstar.', spec: { aegis: 'Dawn Petal also sends a spark of light into the boss for {d:40} and heals the whole party for {h:60}.' } },
    ],
    [
      { id: 'cleric_quickmend', name: 'Quick Mend', ab: 'mend', text: 'After you spend a Petal, your next Mend is instant, heals half again as much, and counts as a whole Petal toward Dawnstar.', spec: { aegis: 'After you spend a Petal, your next Divine Barrier is instant, and its dome also catches the most hurt other ally at half strength.' } },
      { id: 'cleric_purify', name: 'Purify', ab: 'petal', text: 'Dawn Petal now washes Vulnerability and Damage Down off its target and whoever stands close, and leaves each a ward of {s:275} for 8s (once every 10s).', spec: { aegis: 'Dawn Petal now washes Vulnerability and Damage Down off its target and whoever stands close, and leaves each a ward of {s:275} for 8s (once every 10s). The ward never replaces your own Petal shield or Barrier, so the Petal\'s target keeps that shield and its refund.' } },
      { id: 'cleric_wings', name: 'Wings of Dawn', ab: 'petal', text: 'Dawn Petal cast on an ally now carries you toward them on wings of light (up to 200, and never onto a marked floor), and you and that ally take 25% less damage for 4s.' },
    ],
    [
      { id: 'cleric_bloom', name: 'Bloom of Dawn', ab: 'intervene', grants: true,
        text: 'Intervention becomes Bloom of Dawn (24s, instant): spend all your Petals on one ally. A fallen ally rises at once, with heavy Raise Sickness; a living one is healed for {h:900} per Petal and left a regen of {h:90} per Petal every 3s for 9s. Every Petal counts toward Dawnstar.' },
      { id: 'cleric_favour', name: 'Sun\'s Favour', ab: 'smite', text: 'Dawnstar gives back two Petals and heals the most hurt ally for {h:600}.' },
      { id: 'cleric_firstlight', name: 'First Light', ab: 'mend', text: 'While Dawnstar is ready, Mend now casts instantly and heals half again as much (with Quick Mend too, twice as much).', spec: { aegis: 'While Dawnstar is ready, Divine Barrier now casts instantly and its dome is 30% larger.' } },
    ],
    [
      { id: 'cleric_twinbless', name: 'Twin Blessing', ab: 'bene', text: 'Benediction also lands at once on the most hurt other ally: three-quarters of the heal and four-fifths of the shield, and they are Blessed too.',
        spec: { inquisitor: 'Condemn is followed 1.5s later by a second lance for three-quarters of the damage, with the same brand.' } },
      { id: 'cleric_sunfall', name: 'Sunfall', ab: 'smite', text: 'Dawnstar now leaves a small sun on the boss that burns it for {d:60} every 2s for 12s; each burn warms the most hurt ally for {h:80}.' },
      { id: 'cleric_benevolence', name: 'Benevolence', ab: 'bene', cd: { bene: -18 }, specMods: { inquisitor: { cd: { bene: -15 } } }, text: 'Benediction recharges 18s faster.', spec: { inquisitor: 'Condemn recharges 15s faster and brands 3 more hits.' } },
    ],
    [
      { id: 'cleric_sanctum', name: 'Dawn Sanctum', ab: 'prayer', grants: true,
        text: 'Prayer Circle becomes Dawn Sanctum (60s): a halo of dawn around you for 15s. Allies within it take 15% less damage and heal {h:100} every 1.5s, and your Smites are instant while it lasts.' },
      { id: 'cleric_twin', name: 'Twin Petals', ab: 'petal', text: 'Dawn Petal now also heals the most hurt other ally, at half strength.' },
      { id: 'cleric_chorus', name: 'Dawn Chorus', ab: 'petal', text: 'Every third Petal you spend now sings out: the whole party heals for half of it.' },
    ],
  ],

  grovekeeper: [
    [
      { id: 'grovekeeper_balance', name: 'Nature\'s Balance', ab: 'wrath', text: 'Wrath now also heals everyone under your Rejuvenate for half of its damage, and a Rejuvenate cast while Thornlash (or your Treant) is on the boss heals 5% more.',
        spec: { lifebinder: 'Wrath now also heals everyone under your Lifebind, both roots, for half of its damage, and a Lifebind cast while Thornlash (or your Treant) is on the boss heals 5% more.' } },
      { id: 'grovekeeper_moonfire', name: 'Moonfire', ab: 'wrath', text: 'Every second Wrath is instant and hits for {d:480}; the most hurt ally is healed for a quarter of it.' },
      { id: 'grovekeeper_sprout', name: 'Quick Sprout', ab: 'rejuv', text: 'Once every 30s, Rejuvenate takes only a moment: its global cooldown is 1.2s.', spec: { lifebinder: 'Once every 30s, Lifebind takes only a moment: its global cooldown is 1.2s, and it grows 15 Bloom.' } },
    ],
    [
      { id: 'grovekeeper_ironbark', name: 'Ironbark', ab: 'rejuv', text: 'A Rejuvenate cast while the boss is casting also wraps the ally in bark, and the bark spreads to the most hurt other ally: 20% less damage for 6s.',
        spec: { lifebinder: 'A Lifebind cast while the boss is casting also wraps the ally in bark, and the bark spreads to the most hurt other ally: 20% less damage for 6s.' } },
      { id: 'grovekeeper_thickbark', name: 'Thick Bark', ab: 'bloom', text: 'When you, or anyone under your Rejuvenate, drops below 35% health, bark closes over them: 35% less damage for 5s (once every 40s for each).',
        spec: { lifebinder: 'When you, or anyone under your Lifebind (either root of it), drops below 35% health, bark closes over them: 35% less damage for 5s (once every 40s for each).' } },
      { id: 'grovekeeper_roots', name: 'Shared Roots', ab: 'bloom', text: 'Bloom now also heals the most hurt ally for {h:350} and grows a regen on them ({h:100} every 3s for 9s). With nobody under your Rejuvenate, the Bloom itself goes to them instead of you.',
        spec: { lifebinder: 'Bloom now also heals the most hurt ally for {h:800} and grows a regen on them ({h:200} every 3s for 12s).' } },
    ],
    [
      { id: 'grovekeeper_seed', name: 'Seed of Renewal', ab: 'rebirth', grants: true,
        text: 'Rebirth becomes Seed of Renewal (30s, instant): spend 25 Bloom to plant a seed on an ally for 20s: it heals them {h:200} at once and fills them with Wildheart (10% more damage dealt for 12s). If they fall while it grows, they spring back up at once; if not, it blooms into a {h:900} heal when it ends. On a fallen ally, it raises them at once. Either raise is instant, so it leaves heavy Raise Sickness: 30% less damage and healing for 30s, more for every fall this pull.' },
      { id: 'grovekeeper_spill', name: 'Spillover', ab: 'bloom', text: 'Every Bloom you spend seeps into a healing patch under the most hurt ally ({h:75} every 1.5s for 9s).' },
      { id: 'grovekeeper_cycle', name: 'Cycle of Life', ab: 'wrath', text: 'An Awakened Wrath gives back 30 Bloom and takes 8s off Bloom\'s recharge, and a Bloom gives back 5 Bloom for every ally it heals (up to 15).' },
    ],
    [
      { id: 'grovekeeper_seedburst', name: 'Seedburst', ab: 'growth', text: 'Wild Growth also Awakens your next three Wraths, and a Bloom can stack up to three. Awakened Wraths hit for {d:500}.', spec: { moonwell: 'Moonwell also Awakens your next three Wraths, and a Bloom can stack up to three. Awakened Wraths hit for {d:500}.' } },
      { id: 'grovekeeper_oldgrowth', name: 'Old Growth', ab: 'growth', cd: { growth: -15 }, text: 'Wild Growth recharges 15s faster.', specMods: { moonwell: { cd: { growth: -12 } } }, spec: { moonwell: 'Moonwell recharges 12s faster.' } },
      { id: 'grovekeeper_blossom', name: 'Last Blossom', ab: 'rejuv', text: 'Rejuvenate now blooms when it ends: one last {h:300} heal on the ally. If the ally drops below 40% health while it holds, it opens early for {h:500} instead.', spec: { lifebinder: 'Lifebind blooms three times while it holds, at 5s, 10s and at its end: {h:300} on both roots. If a root drops below 40% health, it opens early for {h:500} instead (once).' } },
    ],
    [
      { id: 'grovekeeper_treant', name: 'Treant', ab: 'thorn', grants: true,
        text: 'Thornlash becomes Treant (45s): call up a treant beside the boss for 15s. It slams the boss for {d:170} every 3s, and every slam heals your most hurt ally for {h:150}.' },
      { id: 'grovekeeper_naturewrath', name: 'Nature\'s Wrath', ab: 'bloom', text: 'Bloom now also tears roots up under the boss: a strike for {d:90}, then lashes of {d:60} every 3s for 12s, and each lash heals your most hurt ally for {h:50}.' },
      { id: 'grovekeeper_pulse', name: 'Verdant Pulse', ab: 'growth', text: 'Wild Growth now pulses every 3s while it lasts, and each pulse grows 8 Bloom.',
        spec: { moonwell: 'Moonwell now pulses every 3s while it lasts, and each pulse grows 10 Bloom.' } },
    ],
  ],

  chronomancer: [
    [
      { id: 'chronomancer_phase', name: 'Phase Strike', ab: 'shift', text: 'Shifting into Haste now leaves an afterimage that fires a free Temporal Bolt at full strength (once every 10s). It heals like any Bolt.' },
      { id: 'chronomancer_double', name: 'Double Time', ab: 'shift', text: 'Shifting into Haste now makes your next three Bolts instant instead of one.' },
      { id: 'chronomancer_skip', name: 'Skipped Beat', ab: 'bolt', text: 'Every fifth Temporal Bolt is instant.' },
    ],
    [
      { id: 'chronomancer_practiced', name: 'Practiced Rewind', ab: 'rewind', cd: { rewind: -10 }, text: 'Rewind recharges 10s faster, and your next Bolt after a Rewind is instant.' },
      { id: 'chronomancer_dejavu', name: 'Deja Vu', ab: 'rewind', text: 'Rewind now also snaps you back to where you stood 4s ago, unless a telegraph is about to land there.' },
      { id: 'chronomancer_lastmoment', name: 'Last Moment', ab: 'recall', text: 'While the boss\'s cast is about to land (1.5s or less left), Recall casts instantly. A raise cast that way is instant, so it leaves heavy Raise Sickness. Whoever it lands on is wrapped in slowed time: 30% less damage for 3s.' },
    ],
    [
      { id: 'chronomancer_bubble', name: 'Time Bubble', ab: 'stasis', grants: true,
        text: 'Stasis becomes Time Bubble (40s): wrap an ally in a bubble of slowed time for 8s. It follows them, and everyone inside takes 30% less damage.' },
      { id: 'chronomancer_borrowed', name: 'Borrowed Time', ab: 'bolt', text: 'In Haste, a Bolt that crits gives back 12 Flux.' },
      { id: 'chronomancer_overwound', name: 'Overwound', ab: 'shift', text: 'Flux that would spill past 100 in Slow now flows out as healing for every 3 Flux: {h:160} on your linked ally and {h:60} on the whole party.' },
    ],
    [
      { id: 'chronomancer_hourglass', name: 'Hourglass Ward', ab: 'rewind', text: 'Rewind now also slows time around its target: they and everyone beside them take 30% less damage for 8s.' },
      { id: 'chronomancer_stopwatch', name: 'Stopwatch', ab: 'shift', text: 'Shifting into Haste now also stops your Flux for 6s: your first 6s of Haste cost nothing, and count toward Paradox as one and a half times what you would have spent.' },
      { id: 'chronomancer_second', name: 'Second Hand', ab: 'bolt', text: 'In Haste, Temporal Bolt now strikes again 2s later at 15% strength, healing as a Bolt does.',
        spec: { echoist: 'Your echoes are 60% strength instead of half.', accelerant: 'In Haste, Temporal Bolt now strikes again 2s later at 11% strength, healing as a Bolt does.' } },
    ],
    [
      { id: 'chronomancer_warp', name: 'Time Warp', ab: 'accel', grants: true,
        text: 'Accelerando becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster, and the ally you aim it at is Quickened: 12% faster still for 15s. Every 3s its hands strike the boss for {d:70} and heal the whole party for {h:55}. You gain 40 Flux.',
        spec: { echoist: 'Echo Chamber becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster and your echoes are full strength, and the ally you aim it at is Quickened: 12% faster still for 15s. Every 3s its hands strike the boss for {d:70} and heal the whole party for {h:55}. You gain 40 Flux.',
          accelerant: 'Accelerando becomes Time Warp (60s): a great clock hangs over the party for 20s. Everyone acts 15% faster, and the ally you aim it at is Quickened: 12% faster still for 15s. Every 3s its hands strike the boss for {d:70} and heal the whole party for {h:55}. You gain 40 Flux.' } },
      { id: 'chronomancer_future', name: 'Future Sight', ab: 'bolt', text: 'Your Bolts now mark the boss with a rune of the future. 6s after the first, it bursts for half of every Bolt that fed it and heals the whole party for a third of that, and a new rune can form 6s later.' },
      { id: 'chronomancer_secondchance', name: 'Second Chance', ab: 'recall', text: 'A Recall now leaves its target in a ward of {s:400} for 8s and heals the whole party for {h:150}; an ally it raises is also healed for {h:1400} a moment later.' },
    ],
  ],
};

// ======================================================================= ADVANCED CLASSES (Thermist, Driftblade)
// These trees are mostly new behaviour, not bigger numbers: new triggers, moves that now move you, and two talents
// per class (rows III and V) that put a whole new move on a key (grants: true; the move is in TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  thermist: [
    [
      { id: 'thermist_embers', name: 'Banked Embers', ab: 'cinder', text: 'A fire spell cast at +3 or hotter now leaves an ember in the target (up to 4). Your next Thermal Shock sets every ember off, {d:200} each.' },
      { id: 'thermist_flicker', name: 'Flicker', ab: 'rime', text: 'A Cinder Bolt or Rime Shard (Absolute Zero counts as one) now makes your next Flare or Glacier Lance instant and 50% harder (within 6s).' },
      { id: 'thermist_afterglow', name: 'Afterglow', ab: 'flare', text: 'A Flare or Glacier Lance cast at its own edge now leaves the target burning or freezing for {d:120} every 3s for 9s.' },
    ],
    [
      { id: 'thermist_front', name: 'Cold Front', ab: 'equil', text: 'An Equilibrium that drops the dial 3 or more steps now also gives the whole party 20% less damage for 8s.', spec: { zenith: 'A Sunset that drops a star or 3 or more steps now also gives the whole party 20% less damage for 8s.' } },
      { id: 'thermist_phase', name: 'Phase Step', ab: 'equil', text: 'Equilibrium now also blinks you 150 px the way you\'re heading: you cannot be hurt for that second, and you take 40% less damage for 3s after.', spec: { zenith: 'Sunset now also blinks you 150 px the way you\'re heading: you cannot be hurt for that second, and you take 40% less damage for 3s after.' } },
      { id: 'thermist_skin', name: 'Thermal Skin', ab: 'invert', text: 'Every Thermal Shock now also wraps you in a shield worth 30% of its strength.' },
    ],
    [
      { id: 'thermist_thermocline', name: 'Thermocline', ab: 'cinder', grants: true, text: 'New move on Q, in place of Cinder Bolt. Thermocline: an instant {d:250} bolt that swings the dial 2 steps toward the other side and counts as that element. It hits 8% harder for every step from 0 you started, and a Thermal Shock it sets off hits 60% harder.', spec: { zenith: 'New move on Q, in place of Cinder Bolt. Thermocline: an instant {d:250} bolt of the element you hold. At the edge it lights a Corona like an edge cast would, without the Brink (once every 4s).' } },
      { id: 'thermist_latent', name: 'Latent Heat', ab: 'flare', text: 'Pushing past the edge opens 5s of Latent Heat instead of overloading you (once every 30s): cast on past the edge freely. Swing back inside it in time and the heat is banked, so your next Thermal Shock is twice as strong. Still past the edge when it closes, you overload as normal and nothing is banked.' },
      { id: 'thermist_rebound', name: 'Rebound', ab: 'lance', text: 'After a Thermal Shock, your next spell is now instant and 70% harder (within 10s).' },
    ],
    [
      { id: 'thermist_vortex', name: 'Polar Vortex', ab: 'invert', text: 'Inversion now leaves a vortex on the target that strikes for {d:220} every 1.5s for 12s.', spec: { zenith: 'Inversion, or Red Giant in its place, now leaves a vortex on the target that strikes for {d:220} every 1.5s for 12s.' } },
      { id: 'thermist_pulse', name: 'Equilibrium Pulse', ab: 'equil', text: 'Equilibrium now sets off the heat it snaps away: from 3 or more steps out, a Thermal Shock as if you had swung that far.', spec: { zenith: 'Sunset now sets off the heat it snaps away: from 3 or more steps out, a Thermal Shock as if you had swung that far. With Solar Wind it sets it off without moving the dial.' } },
      { id: 'thermist_solstice', name: 'Solstice', ab: 'invert', text: 'Inversion now flips the dial back 5s later: a Shock at 85% strength if it\'s still far enough from 0.', spec: { zenith: 'Inversion now flips the dial back 5s later: a Shock at 85% strength if it\'s still far enough from 0. That Shock leaves your Corona for the next one. With Red Giant in its place, the dial flips once, when Red Giant ends.' } },
    ],
    [
      { id: 'thermist_zero', name: 'Absolute Zero', ab: 'rime', grants: true, text: 'New move on W, in place of Rime Shard. Absolute Zero: instant on a 30s cooldown, it plunges the dial straight to -5, wherever it was. It hits for {d:200}, plus {d:30} for every step it fell, and from 3 or more on the hot side that crossing is a Thermal Shock 30% harder.' },
      { id: 'thermist_conduct', name: 'Conduction', ab: 'invert', text: 'Thermal Shock now arcs: a second Shock, 35% as strong, strikes the target 1s later.' },
      { id: 'thermist_twin', name: 'Twin Stars', ab: 'flare', text: 'A Flare or Glacier Lance cast at its own edge now fires a second bolt after it, at 50% strength.', spec: { zenith: 'A Flare or Glacier Lance that fills your Corona now fires a second bolt after it, at 60% strength.' } },
    ],
  ],

  driftblade: [
    [
      { id: 'driftblade_crescent', name: 'Crescent', ab: 'carve', text: 'Every second Carve you make while moving now also throws a crescent of wind at the target for {d:260}.' },
      { id: 'driftblade_eddies', name: 'Eddies', ab: 'slip', text: 'A Slipstream lane laid through an enemy now cuts it for {d:190} when you lay it, and again when the lane fades.' },
      { id: 'driftblade_tailwind', name: 'Tailwind', ab: 'hook', text: 'Hook Turn now also gives 25 Drift, and your next three Carves are critical hits, follow-through and all.' },
    ],
    [
      { id: 'driftblade_calm', name: 'Eye of the Storm', ab: 'still', text: 'Stillpoint now also gives the whole party 15% less damage for 4s, a beat longer than the parry.' },
      { id: 'driftblade_gust', name: 'Gust Guard', ab: 'slip', text: 'Slipstream now wraps you in a {s:200} shield of wind for 6s. Running through the boss while it holds tops it back up, once.' },
      { id: 'driftblade_sidestep', name: 'Sidestep', ab: 'hook', text: 'Hook Turn now also makes you untouchable for the first moment of the swing, and you take 30% less damage for 2s.' },
    ],
    [
      { id: 'driftblade_gyre', name: 'Gyre', ab: 'hook', grants: true, text: 'New move on E, in place of Hook Turn. Gyre: loop once round your target, one {d:150} cut for every 25 Drift you have (up to 4), and from 75 Drift the last always crits. It spends nothing, gives back a dash charge and adds 15 Drift. Two charges.',
        spec: { orbit: 'New move on E, in place of Hook Turn. Gyre: loop once round your target, one {d:150} cut for every 25 Drift you have (up to 4). From 75 Drift the last always crits. It spends nothing, gives back a dash charge, adds 15 Drift, and a full loop is a full Orbit (all five stacks) and a whole loop toward Full Circle. Two charges.' } },
      { id: 'driftblade_second', name: 'Second Wind', ab: 'cross', text: 'A Crosswind that spends 80 Drift or more now gives 14 back.', spec: { comet: 'An Impact that spends 160 Drift or more now gives 40 back.' } },
      { id: 'driftblade_hover', name: 'Hover', ab: 'carve', text: 'A Carve you make while standing still now gives 25 Drift and holds your Drift for 4s.' },
    ],
    [
      { id: 'driftblade_galeforce', name: 'Galeforce', ab: 'gale', text: 'Gale Run now looses a free blade of wind at the target when it begins, {d:100} plus {d:60} for every 10 Drift you hold, and another when it ends: {d:100} plus {d:80} for every 10 Drift. Both always crit and spend nothing. Roost loosed them the same way over its 10s; Starfall leaves a wind behind for 5s and looses the second when it dies.' },
      { id: 'driftblade_jet', name: 'Jetstream', ab: 'slip', text: 'A Slipstream through an enemy now gives its charge back (once every 6s), the Passing Strike hits twice as hard, and you take 20% less damage for 2s.' },
      { id: 'driftblade_hurricane', name: 'Hurricane', ab: 'gale', text: 'During Gale Run, each Passing Strike now makes it last 2s longer (up to 10s) and gives 10 more Drift. Roost lasts longer the same way, and Starfall leaves a 5s wind that Passing Strikes stretch and feed too (Drift cannot drain while it blows).' },
    ],
    [
      { id: 'driftblade_tailspin', name: 'Tailspin', ab: 'still', grants: true, text: 'New move on D, in place of Stillpoint. Tailspin: whirl in place, parrying like Stillpoint and cutting the nearest enemy three times for {d:115} each, then spring 150 px the way you\'re heading.' },
      { id: 'driftblade_razor', name: 'Razor Wind', ab: 'carve', text: 'Passing Strikes now leave a cut that bleeds for 6s, {d:22} every 2s for each pass (up to 3).' },
      { id: 'driftblade_after', name: 'Afterimage', ab: 'hook', text: 'Hook Turn now leaves an afterimage that cuts the target again for {d:320} a second later, and the cut gives 20 Drift.' },
    ],
  ],
});

// ======================================================================= ALEMBIST (classes-b)
// Mostly new behaviour, not bigger numbers. Two talents grant a whole new move (`grants`; the move is in TALENT_ABILITIES in
// kits.js and takes the slot named in its `replaces`): Grand Blend (row III) and Quicksilver (row V).
TALENTS.alembist = [
  [
    { id: 'alembist_ricochet', name: 'Ricochet', ab: 'throw', text: 'Once every 8s, a bomb you throw (any bomb, the Kiln Bomb too) now bounces off its target and bursts again a second later, a quarter as strong, and the bounce heals your most hurt ally for {h:120}.' },
    { id: 'alembist_scorch', name: 'Scorch', ab: 'throw', text: 'A bomb now leaves its target scorched for 10s: every heal vial you land in that time (a healing cloud too) also flicks a spark into it for {d:90}.' },
    { id: 'alembist_kindle', name: 'Kindling', ab: 'ember', text: 'Starting a brew with Ember now flicks an ember at your target for {d:100} and leaves it burning for {d:60} every 3s for 12s.' },
  ],
  [
    { id: 'alembist_flask', name: 'Flask Armour', ab: 'batch', text: 'While your bandolier is full, you take 18% less damage, and the ally you last threw a cure at takes 8% less for 4s.' },
    { id: 'alembist_cling', name: 'Clinging Steam', ab: 'throw', text: 'Steam clouds now follow the ally they landed on and heal {h:160} every 1.5s (was {h:80}).' },
    { id: 'alembist_spill', name: 'Spill', ab: 'throw', text: 'Vials ripen 60% sooner, and a vial that spoils now spills at your feet at full strength instead of going to waste.',
      spec: { volatile: 'Vials heat up 40% sooner, and a vial whose fuse runs out now goes off at full strength where it helps: a cure on the most hurt ally, a bomb at the enemy. It no longer burns you.' } },
  ],
  [
    { id: 'alembist_blend', name: 'Grand Blend', ab: 'batch', grants: true,
      text: 'Grand Batch becomes Grand Blend (40s): pour every vial in your bandolier into one. Thrown, it does all of their effects at once, each at one and a half times full strength, and it lights the Kiln fully. It adds two ripe copies of the last vial you brewed.' },
    { id: 'alembist_cask', name: 'Oak Cask', ab: 'throw', text: 'Ripe vials now keep ripening, up to 80% stronger at 20s, but spoil at 30s. A vial thrown ripe splashes a second time at 65%.',
      spec: { volatile: 'Your fuses burn 2s longer, and a vial keeps heating until it goes off, up to 60% stronger. A vial thrown fully heated splashes a second time at 40%.' } },
    { id: 'alembist_echo', name: 'Mother Liquor', ab: 'dew', text: 'Brewing the same recipe twice in a row makes the second vial ripe at once (and under Oak Cask it keeps ripening half again as fast).',
      spec: { volatile: 'Brewing the same recipe twice in a row makes the second vial heat up fully at once, and it lights the Kiln twice.' } },
  ],
  [
    { id: 'alembist_flash', name: 'Flash Distill', ab: 'distill', text: 'Distill now also drops a copy of your last vial into the bandolier.',
      spec: { volatile: 'Catalyst now also drops a copy of your last vial into the bandolier (once every 20s).' } },
    { id: 'alembist_reserve', name: 'Grand Reserve', ab: 'batch', cd: { batch: -40 }, text: 'Grand Batch\'s copies start fully ripe and never spoil, and Grand Batch itself recharges 40s faster. A Grand Blend hits 10% harder.',
      spec: { volatile: 'Grand Batch\'s copies start fully heated with 10s fuses, and Grand Batch itself recharges 40s faster. A Grand Blend hits 10% harder.' } },
    { id: 'alembist_fume', name: 'Fume Hood', ab: 'distill', text: 'Distill now also clears the air: the whole party takes 10% less damage for 8s.',
      spec: { volatile: 'Catalyst now also clears the air: the whole party takes 10% less damage for 8s (once every 30s).' } },
  ],
  [
    { id: 'alembist_quicksilver', name: 'Quicksilver', ab: 'salt', grants: true,
      text: 'Salt becomes Quicksilver, with recipes of its own: Quicksilver twice is a Silver Mirror (a pool that keeps everyone in it shielded), with Dew a Silver Tonic (a heal that is stronger the more hurt they are), with Ember a Fulminate (a bomb that goes off twice). The Mirror also takes 12% off the damage, the second blast of a Fulminate hastes the party 10% for 6s, and a Silver Tonic washes off Vulnerability and Damage Down.',
      spec: { volatile: 'Salt becomes Quicksilver, with recipes of its own: Quicksilver twice is a Silver Mirror (a pool that keeps everyone in it shielded), with Dew a Silver Tonic (a heal that is stronger the more hurt they are), with Ember a Fulminate (a bomb that goes off twice). The Mirror also takes 12% off the damage, the second blast of a Fulminate hastes the party 10% for 6s, and a Silver Tonic washes off Vulnerability and Damage Down. It counts as Salt in Reactions.' } },
    { id: 'alembist_chain', name: 'Chain Splash', ab: 'throw', text: 'Every splash heal now leaps on to the most hurt ally and splashes there too, at half strength.' },
    { id: 'alembist_residue', name: 'Residue', ab: 'throw', text: 'Every vial that breaks on an ally now leaves a puddle that heals whoever stands in it for {h:28} every 1.5s for 6s.' },
  ],
];

// ======================================================================= ADVANCED TANKS (tanks-2: Gorgemaw, Oathbroker)
// The same rule: new triggers and changed behaviour, one plain number at most (Wide Jaw, Grace Period), and two talents
// per class that put a new move on a key (grants: true; the moves are in TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  gorgemaw: [
    [
      { id: 'gorgemaw_marinade', name: 'Marinade', ab: 'gnash', text: 'Gulp, the third bite of Gnash, now marinates the boss: your next Spit within 10s hits 25% harder.' },
      { id: 'gorgemaw_aftertaste', name: 'Aftertaste', ab: 'spit', text: 'A Spit now leaves the taste behind: the boss burns for {d:55} every 3s for 9s ({d:100} after a Spike).' },
      { id: 'gorgemaw_crunch', name: 'Crunch', ab: 'gnash', text: 'Gulp, the third bite of Gnash, now bites twice: the second bite hits for {d:150}.' },
    ],
    [
      { id: 'gorgemaw_cud', name: 'Chew the Cud', ab: 'wide', text: 'Every Morsel you eat now heals you for 9% of your HP.' },
      { id: 'gorgemaw_widejaw', name: 'Wide Jaw', ab: 'wide', cd: { wide: -3 }, text: 'Open Wide stays open 2.2s instead of 1.5s, and each charge recharges 3s faster.' },
      { id: 'gorgemaw_scraps', name: 'Table Scraps', ab: 'wide', text: 'Eating an attack meant for a teammate now also shields them for {s:350} for 8s, and shields you for the same.' },
    ],
    [
      { id: 'gorgemaw_regurgitate', name: 'Regurgitate', ab: 'spit', grants: true, text: 'New move on E, in place of Spit. Regurgitate: bring the whole Belly up at once, every Morsel spat in its own shape at full strength, and the acid from a Digest rides on every Morsel in the volley.', spec: { glutton: 'New move on E, in place of Spit. Regurgitate: bring the whole Belly up at once, every Morsel spat in its own shape at 115% strength. Pairs of a shape still fuse, and the acid from a Digest rides on every Morsel in the volley.' } },
      { id: 'gorgemaw_lining', name: 'Iron Lining', ab: 'digest', text: 'Every Morsel in your Belly now makes you take 10% less damage (up to 35%).' },
      { id: 'gorgemaw_sour', name: 'Sour Stomach', ab: 'spit', text: 'A Morsel you have kept for 15s or more turns sour: spat, it hits 40% harder.' },
    ],
    [
      { id: 'gorgemaw_feast', name: 'Feast', ab: 'bottomless', text: 'Bottomless now also refills Open Wide\'s charges, and as the jaw closes the boss is bitten back for {d:300} for every Morsel it ate.' },
      { id: 'gorgemaw_ironjaw', name: 'Iron Jaw', ab: 'iron', text: 'Iron Gut now also opens your jaw for its first 2s, every Morsel eaten in it comes as two, and a Spike eaten in it takes 30s off Iron Gut\'s recharge.' },
      { id: 'gorgemaw_overflow', name: 'Second Stomach', ab: 'spit', text: 'Your Belly holds one Morsel more (a Glutton\'s, six), and a Morsel eaten into a full Belly is spat straight back out, half again as hard, and warms you for 3% of your HP.' },
    ],
    [
      { id: 'gorgemaw_stonebelly', name: 'Stone Belly', ab: 'iron', grants: true, text: 'New move on D, in place of Iron Gut. Stone Belly (60s): 35% less damage for 8s, your gut grinds as Iron Gut\'s does (Digest works in any moment, each Morsel it digests counts twice), and every Morsel you eat in that time is a Spike. When the stone ends it comes back up: the boss takes {d:300} for every Morsel eaten in it.' },
      { id: 'gorgemaw_bile', name: 'Bile', ab: 'digest', text: 'Digest now also scalds the boss: one hit of {d:220} for every Morsel it digests, and the acid it leaves is thicker: 60% a Morsel, up to +120%.' },
      { id: 'gorgemaw_rumination', name: 'Rumination', ab: 'digest', text: 'Digest now keeps your oldest Morsel back and spits it at once, acid and all, half again as hard, without using a GCD.' },
    ],
  ],

  oathbroker: [
    [
      { id: 'oathbroker_interest', name: 'Interest', ab: 'collect', text: 'Collect, the third strike, now hits for 30 more for every entry in your Ledger (up to 5), and Levy, the second, for 12 more.' },
      { id: 'oathbroker_garnish', name: 'Garnish', ab: 'collect', text: '65% of whatever your strikes pay down is now also struck from the boss.' },
      { id: 'oathbroker_stamp', name: 'Rubber Stamp', ab: 'settle', text: 'Settle now also stamps the boss: a blow worth three-quarters of the Ledger you settled (up to {d:900}, or {d:650} from an Audit).', spec: { collector: 'Settle now also stamps the boss: a blow worth the whole Ledger you settled (up to {d:1200}, or {d:900} from an Audit), and the settled lines strike the boss for half their size, as if they had come due.' } },
    ],
    [
      { id: 'oathbroker_grace', name: 'Grace Period', ab: 'reneg', text: 'Entries written while you are below half health come due after 14s instead of 8s.' },
      { id: 'oathbroker_amnesty', name: 'Amnesty', ab: 'reneg', text: 'Renegotiate, or Moratorium in its place, now also erases your two smallest entries and strikes the boss for 60% of what they held.' },
      { id: 'oathbroker_escrow', name: 'Escrow', ab: 'settle', text: 'While your Ledger holds 3 entries or more, you take 12% less damage.' },
    ],
    [
      { id: 'oathbroker_audit', name: 'Audit', ab: 'settle', grants: true, text: 'New move on E, in place of Settle. Audit (12s): every entry at least 3s old is paid now at 20% of its size; newer ones stay.' },
      { id: 'oathbroker_consolidate', name: 'Consolidate', ab: 'reneg', text: 'Renegotiate, or Moratorium in its place, now also folds the whole Ledger into one entry, due when the last one would have been. Haggled down: the folded entry is 20% smaller than the bills it swallowed, and the boss pays the difference.' },
      { id: 'oathbroker_fineprint', name: 'Fine Print', ab: 'lien', text: 'Entries smaller than 3% of your HP are now struck off when they come due instead of billed.' },
    ],
    [
      { id: 'oathbroker_receivership', name: 'Receivership', ab: 'default', text: 'Default now also shields the whole party for half of what it tore up (at most 20% of your HP) and gives them 25% less damage for 8s.', spec: { collector: 'Foreclose now also shields the whole party for half of what it tore up (at most 20% of your HP) and gives them 25% less damage for 8s.' } },
      { id: 'oathbroker_garnishwrit', name: 'Writ of Execution', ab: 'writ', text: 'Entries written during Writ of Protection are now half paid by the boss when they come due, and Writ of Protection is back in 40s instead of 90s. Blanket Surety and Warrant, in its place, get the same: entries written in them are half paid by the boss, and they are back in 40s instead of 60s.' },
      { id: 'oathbroker_slate', name: 'Clean Slate', ab: 'default', text: 'Default now also brings Renegotiate, Settle, Lien and Writ of Protection straight back, and your credit freezes for 6s instead of 10s.', spec: { guarantor: 'Default now also brings Renegotiate, Settle, Co-Sign and Writ of Protection straight back, and your credit freezes for 6s instead of 10s.', collector: 'Foreclose now also brings Renegotiate, Settle, Lien and your Writ of Protection (or Warrant) straight back, and your credit freezes for 6s instead of 10s.' } },
    ],
    [
      { id: 'oathbroker_moratorium', name: 'Moratorium', ab: 'reneg', grants: true, text: 'New move on W, in place of Renegotiate. Moratorium (35s): for 5s nothing comes due and every timer in the Ledger stops; you take 30% less damage, and every entry is marked renegotiated, as Renegotiate does.' },
      { id: 'oathbroker_tithe', name: 'Tithe', ab: 'lien', text: 'Every bill you pay now heals the most hurt member of the party (you too, if it is you) for three-quarters of it.' },
      { id: 'oathbroker_notary', name: 'Notary', ab: 'collect', text: 'Collect, the third strike, now also settles your oldest entry on the spot at a third of its size; the boss takes half of what that spares you.' },
    ],
  ],
});

// ======================================================================= THREADWEAVER and MARIONETTIST (classes-c)
// New behaviour, one plain number each (Long Thread, Quick Change). Rows III and V grant a move (TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  threadweaver: [
    [
      { id: 'threadweaver_backstitch', name: 'Backstitch', ab: 'needle', text: 'Needle now also adds 8 Spool, and while you hold 20 Spool or more its tug heals 40% more.' },
      { id: 'threadweaver_crossstitch', name: 'Cross Stitch', ab: 'tie', text: 'Tying a thread now also heals both its ends for {h:110} and wraps them in a {s:120} shield for 5s.' },
      { id: 'threadweaver_taut', name: 'Taut', ab: 'needle', text: 'While you hold 2 threads or more, Needle is instant, strikes 12% harder and its tugs heal 40% more.' },
    ],
    [
      { id: 'threadweaver_thimble', name: 'Thimble', ab: 'snip', text: 'Every thread Snap cuts now also shields both its ends for {s:150} for 6s, and an end under half health gets {s:300} instead. Thrum, if you took it, shields the ends of every thread it rings the same way.' },
      { id: 'threadweaver_reelin', name: 'Reel In', ab: 'tie', text: 'A Tie that pulls an ally along a thread now pulls both ends together to meet in the middle, and gives the Tie back. The one pulled heals {h:160} (the thread carries part of it to the other end), and both take 20% less damage for 4s.' },
      { id: 'threadweaver_knotwork', name: 'Knotwork', ab: 'tie', text: 'A thread that snaps on its own, or that you Snap, now gives back a charge of Tie (one for every thread a Snap cuts) and wraps both its ends in a {s:200} shield for 5s. Thrum, if you took it, does the same for every thread it rings.' },
    ],
    [
      { id: 'threadweaver_embroider', name: 'Embroider', ab: 'mend', grants: true, text: 'New move on E, in place of Mend Seam. Embroider: instant. A {h:300} heal that runs down every thread on your target at full strength, and on through their threads at 60%. With 20 Spool it spends them and heals {h:480} instead.' },
      { id: 'threadweaver_bobbin', name: 'Full Bobbin', ab: 'mend', text: 'A Mend Seam that spends Spool now heals 20% more and winds 10 of that Spool back.' },
      { id: 'threadweaver_tension', name: 'Tension', ab: 'snip', text: 'Snap now gives back 15 Spool for every thread you hold, and your next Mend Seam within 8s heals 20% more. Thrum, if you took it, pays the same for every thread it rings.' },
    ],
    [
      { id: 'threadweaver_grand', name: 'Grand Tapestry', ab: 'tapestry', text: 'When Tapestry ends, the web now lets go in a {h:300} heal on the whole party, plus three quarters of what it split, up to {h:900} more. With Severance, it lets go when the cover ends instead.' },
      { id: 'threadweaver_selvedge', name: 'Selvedge', ab: 'tapestry', text: 'While Tapestry holds, none of your threads can snap, however far apart their ends are pulled, Tapestry lasts 4s longer and the party takes 10% less damage. With Severance, its cover lasts 4s longer and the threads it ties again cannot snap for 6s.' },
      { id: 'threadweaver_longthread', name: 'Long Thread', ab: 'tapestry', text: 'Tapestry holds two charges and lasts 3s longer. If you took Severance, it recharges 10s faster instead.' },
    ],
    [
      { id: 'threadweaver_cradle', name: 'Cat\'s Cradle', ab: 'shuttle', grants: true, text: 'New move on D, in place of Shuttle. Cat\'s Cradle (20s): a cradle of threads at your feet for 9s. Allies inside take 20% less damage and heal {h:90} every 1.5s, and its shuttle strikes the boss for {d:240} per thread you hold.', specMods: { shears: { cd: { shuttle: -3 } } }, spec: { shears: 'New move on D, in place of Shuttle. Cat\'s Cradle (17s): a cradle of threads at your feet for 9s. Allies inside take 20% less damage and heal {h:90} every 1.5s, and its shuttle strikes the boss for {d:240} per thread you hold or Snap cut in the last 8s (up to 5).' } },
      { id: 'threadweaver_heartstring', name: 'Heartstring', ab: 'snip', text: 'Every Snap that cuts a thread now also whips the boss for {d:150} and leaves it Frayed: the whole party deals 8% more to it for 10s. Thrum, if you took it, whips the boss the same way.' },
      { id: 'threadweaver_skein', name: 'Double Knot', ab: 'tie', text: 'A thread you tie can\'t snap for its first 6s, however far apart its ends are pulled, and the ally you tie takes 8% less damage while it holds.' },
    ],
  ],

  marionettist: [
    [
      { id: 'marionettist_flourish', name: 'Flourish', ab: 'cue', text: 'The last of the quick Jabs a Cue gives now flourishes into a second, lighter stab for {d:135}. Let all three land before you Cue again. Strum sends no quick Jabs, so its pluck rings a second stab of {d:110} instead.', spec: { understudy: 'The last of the quick Jabs a Cue gives now flourishes into a second, lighter stab: {d:145} from each Doll. Let all six land before you Cue again.' } },
      { id: 'marionettist_riposte', name: 'Riposte', ab: 'cue', text: 'Every second Jab the Doll makes is a Riposte, a heavier stab for {d:120} that builds 1 Encore. Its own Jabs now feed the Finale: keep it in reach.', spec: { understudy: 'Every third Jab the Dolls make is a Riposte, a heavier stab for {d:87} that builds 1 Encore. Their own Jabs now feed the Finale: keep them in reach.' } },
      { id: 'marionettist_longarms', name: 'Long Arms', ab: 'pull', text: 'Out of reach, the Doll no longer stops: it jabs down the strings from wherever it stands, for {d:28}. Park it clear of a telegraph and it keeps working.', spec: { understudy: 'Out of reach, the Dolls no longer stop: each jabs down the strings from wherever it stands for {d:23.2} on its own beat, and Cue, Pirouette, Tangle and Cut the Cord strike from where the Dolls stand. Park them clear of a telegraph and they keep working.' } },
    ],
    [
      { id: 'marionettist_slack', name: 'Slack Line', ab: 'pull', text: 'The Doll straying past the strings\' reach no longer tears a String: it is only yanked back, and the strings reach 40 px further. Only a blow tears one now, so you can run and keep your Strung, and each String you keep is worth 8% (not 5%).' },
      { id: 'marionettist_mended', name: 'Safe Landing', ab: 'pull', text: 'Pull Strings now also leaves the Doll untouchable for 3s where it lands, with a {d:120} cut as it touches down, and a blow it shrugs off in that time builds 1 Encore, as under Pirouette.', spec: { understudy: 'Pull Strings now also leaves both Dolls untouchable for 3s where they stand, with a {d:69.6} cut from each as the pulled one touches down, and a blow either shrugs off in that time builds 1 Encore, as under Pirouette.' } },
      { id: 'marionettist_standin', name: 'Stand-In', ab: 'swap', text: 'For 3s after a Swap, a blow that lands on the Doll no longer tears a String, you take 15% less damage, and a parting flourish as the Doll takes your place cuts the enemy for {d:250}. Red Curtain gives the same: the Dolls\' bow holds the Strings 3s and cuts the enemy for {d:250}.' },
    ],
    [
      { id: 'marionettist_tangle', name: 'Tangle', ab: 'pirouette', grants: true, text: 'New move on R, in place of Pirouette. Tangle: the Doll winds its strings round the enemy, a {d:160} cut now and a bleed of {d:46} every 2s for 10s, and it builds 2 Encore.', spec: { understudy: 'New move on R, in place of Pirouette. Tangle: each Doll winds its strings round the enemy, a {d:110} cut now and a bleed of {d:43} every 2s for 10s, and it builds 2 Encore.' } },
      { id: 'marionettist_cutcord', name: 'Cut the Cord', ab: 'pirouette', grants: true, text: 'New move on R, in place of Pirouette. Cut the Cord: snip one of your own Strings for a {d:680} strike and 2 Encore, and the Doll dances free of any blow for 1.5s. You lose that String\'s Strung until it grows back (6s), or until a Pull Strings ties it back for another Encore.', spec: { understudy: 'New move on R, in place of Pirouette. Cut the Cord: snip one of your own Strings, and each Doll strikes for {d:500}, with 2 Encore, and the Dolls dance free of any blow for 1.5s. You lose that String\'s Strung until it grows back (4s), or until a Pull Strings ties it back for another Encore.' } },
      { id: 'marionettist_secondact', name: 'Second Act', ab: 'pirouette', text: 'Pirouette (or Tangle, or Cut the Cord) now also gives back a charge of Pull Strings, and that free pull cuts four times as hard and builds 2 Encore.' },
    ],
    [
      { id: 'marionettist_curtain', name: 'Standing Ovation', ab: 'finale', text: 'The last hit of Grand Finale now sends the Doll out quick: its next three Jabs come twice as fast, as after a Cue.', spec: { understudy: 'The last hit of Grand Finale now sends the Dolls out quick: their next six Jabs (three each) come twice as fast, as after a Cue.' } },
      { id: 'marionettist_intermission', name: 'Intermission', ab: 'finale', text: 'Grand Finale can start from 3 Encore: the routine has one hit for each Encore you spend, and a show shorter than five hits lands each hit 50% harder and recharges Grand Finale 2s faster for each hit it lacks.' },
      { id: 'marionettist_fullhouse', name: 'Full House', ab: 'finale', text: 'A Grand Finale started with all three Strings tied ends with a sixth hit, a bow three quarters as hard as the others. Keep your Strings whole for the show.' },
    ],
    [
      { id: 'marionettist_curtainrise', name: 'Red Curtain', ab: 'swap', grants: true, text: 'New move on D, in place of Swap. Red Curtain: a red curtain round you for 8s; allies inside take 15% less damage, the Dolls bow where they stand, and your next Cross-Cut within 6s cuts twice as hard and gives 1 more Encore, as after a Swap (30s).' },
      { id: 'marionettist_twin', name: 'Twin Strings', ab: 'cross', text: 'Cross-Cut\'s line now lingers for 3s and cuts whatever still crosses it for {d:45} every second.', spec: { understudy: 'Cross-Cut\'s lines now linger for 3s and cut whatever still crosses them for {d:32} every second. Crossfire\'s line between the Dolls lingers too, for {d:56}.' } },
      { id: 'marionettist_bow', name: 'Final Bow', ab: 'finale', text: 'Nothing can touch the Doll while Grand Finale plays, and a blow it dances through during the show builds 1 Encore, as under Pirouette. The last beat of the show hits twice as hard.' },
    ],
  ],
});

// ======================================================================= IRONPALM (tank)
// Its own block. Built to the newer rule: new behaviour, not bigger numbers, and two
// talents put a new move on a key (`grants`; the moves are in TALENT_ABILITIES at the end of kits.js): Bellows Stance
// (row III, on D) and Dragon Ascends (row V, on F). Named strings belong to the key their last input is on.
TALENTS.ironpalm = [
  [
    { id: 'ironpalm_swallow', name: 'Swallow\'s Return', ab: 'kick', text: 'Crane Step now flows on: Crane Step then Heavy (K L H) is a Rising Gate too, so it can carry on into Heaven\'s Drop.' },
    { id: 'ironpalm_echo', name: 'Echoing Palm', ab: 'fist', text: 'Every named move you finish echoes a moment later: a strike for an eighth of its blows.' },
    { id: 'ironpalm_perfect', name: 'Perfect Form', ab: 'palm', text: 'A named move with every one of its presses Crisp now strikes again a moment later: an echo of its finishing blow at full strength. Once every 6s at most.' },
  ],
  [
    { id: 'ironpalm_shirt', name: 'Iron Shirt', ab: 'kick', text: 'Tiger Wall now also wraps you in a {s:320} shield for 6s and gives back 10 Breath.' },
    { id: 'ironpalm_deflect', name: 'Deflect', ab: 'read', text: 'Reading anything but a tankbuster now takes the blow at a quarter strength instead of half.' },
    { id: 'ironpalm_bellecho', name: 'Bell\'s Echo', ab: 'bell', text: 'Temple Bell (or Dragon Ascends in its place) now also heals the whole party for {h:190}, then again 4s and 8s later.', spec: { avalanche: 'Landslide (or Dragon Ascends in its place) now also heals the whole party for {h:190}, then again 4s and 8s later.' } },
  ],
  [
    { id: 'ironpalm_bellows', name: 'Bellows Stance', ab: 'skin', grants: true, text: 'New move on D, in place of Iron Skin. Bellows Stance (60s): for 10s you take 30% less damage, your Breath refills half again as fast, and every named move you finish breathes out a shockwave ({d:80}) and gives back 6 Breath.',
      spec: { stillwater: 'New move on D, in place of Still Pond. Bellows Stance (60s): for 10s you take 30% less damage, your Breath refills half again as fast, every named move you finish breathes out a shockwave ({d:80}) and gives back 6 Breath, and a blow you read under it gives the Read back and breathes out the shockwave too.' } },
    { id: 'ironpalm_lungs', name: 'Deep Lungs', ab: 'palm', text: 'While your Breath is above half, your Heavy and Kick presses hit 12% harder. Your Breath also refills a fifth faster, always.' },
    { id: 'ironpalm_quiet', name: 'Quiet Mind', ab: 'read', text: 'Finishing a named move leaves your next press Crisp, and it hits 20% harder.' },
  ],
  [
    { id: 'ironpalm_gong', name: 'Gong of Ages', ab: 'bell', text: 'Temple Bell (or Dragon Ascends in its place) now tolls 8s later: the whole party takes 25% less damage for 6s, and you draw 20 Breath.', spec: { avalanche: 'Landslide (or Dragon Ascends in its place) now tolls 8s later: the whole party takes 25% less damage for 6s, and you draw 20 Breath.' } },
    { id: 'ironpalm_unbroken', name: 'Unbroken', ab: 'skin', text: 'While Iron Skin lasts, your strings never drop or break, and every named move gives 4 Breath. Iron Skin lasts 4s longer and comes back 30s sooner (Bellows Stance: 4s longer, 30s sooner).', spec: { stillwater: 'While Still Pond lasts, your strings never drop or break, and every named move gives 4 Breath. Still Pond lasts 4s longer and comes back 30s sooner (Bellows Stance: 4s longer, 30s sooner).' } },
    { id: 'ironpalm_answer', name: 'Answering Fist', ab: 'read', text: 'Reading a tankbuster now takes 30s off Iron Skin and Temple Bell, and every other Read takes 3s off Temple Bell.', spec: { stillwater: 'Reading a tankbuster now takes 30s off Still Pond and Temple Bell, and every other Read takes 2s off Temple Bell.', avalanche: 'Reading a tankbuster now takes 30s off Iron Skin and Landslide, and every other Read takes 2s off Landslide.' } },
  ],
  [
    { id: 'ironpalm_dragon', name: 'Dragon Ascends', ab: 'bell', grants: true, text: 'New move on F, in place of Temple Bell. Dragon Ascends (60s): leap down on your target with a {d:250} blow; the whole party deals 6% more damage for 15s and takes 5% less for 8s, and you get Second Wind.',
      spec: { avalanche: 'New move on F, in place of Landslide. Dragon Ascends (60s): leap down on your target with a {d:250} blow; the whole party deals 6% more damage for 15s, you get Second Wind, and your Momentum fills for 15s, with your strings unable to drop or stagger you for as long. The party takes 5% less damage for 8s.' } },
    { id: 'ironpalm_mountain', name: 'Falling Mountain', ab: 'kick', text: 'Heaven\'s Drop now shakes the ground: an aftershock strikes the boss for {d:70} a second later.' },
    { id: 'ironpalm_hundred', name: 'Hundred Hands', ab: 'fist', text: 'Thousand Palms now leaves the boss\'s guard open for 10s: your presses hit 35% harder.' },
  ],
];

// ======================================================================= GLOOMSWORN (tank, class 18)
// New behaviour, no plain numbers. Rows III and V grant a move (TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  gloomsworn: [
    [
      { id: 'gloomsworn_bleed', name: 'Black Blood', ab: 'rend', text: 'Gloaming, the third strike, now leaves the boss bleeding black: {d:60} every 3s for 9s.' },
      { id: 'gloomsworn_interest', name: 'Dread Interest', ab: 'strike', text: 'Gloom Strike, when you still hold 40 Gloom or more after it, now cuts a second time for 40%.' },
      { id: 'gloomsworn_omen', name: 'Ill Omen', ab: 'rend', text: 'Whenever the boss begins a cast, your next Rend strike builds 20 extra Gloom.' },
    ],
    [
      { id: 'gloomsworn_wakened', name: 'Waking Dead', ab: 'mantle', text: 'Whenever your vessel reaches 80 Gloom (once every 20s), Black Mantle and Last Rite recharge 30s sooner. A Hollow you stand up from makes them ready again at once.' },
      { id: 'gloomsworn_veil', name: 'Veiled Step', ab: 'shade', text: 'Shade Step now also veils you: 20% less damage taken for 5s.' },
      { id: 'gloomsworn_bearer', name: 'Pallbearers', ab: 'pall', text: 'Black Pall (or Vigil Ward in its place) now also lays a barrier of {s:150} on every ally for 8s, and lays it afresh 4s later for anyone who has worn it down.', spec: { duskreaver: 'Dusk Reave (or Vigil Ward in its place) now also lays a barrier of {s:170} on every ally for 8s, and lays it afresh 4s later for anyone who has worn it down.' } },
    ],
    [
      { id: 'gloomsworn_vigil', name: 'Vigil Ward', ab: 'pall', grants: true, text: 'New move on R, in place of Black Pall. Vigil Ward (45s, 20 Gloom): stand watch over whoever is hurt most. They take 50% less damage for 5s and are wrapped in a barrier of {s:200}; you take 15% less damage for 5s, and the whole party takes 20% less damage for 6s, as under the Pall (the one you ward too: the two cuts stack).', spec: { duskreaver: 'New move on R, in place of Dusk Reave. Vigil Ward (30s, 30 Gloom): a reaping cut for {d:600}, then stand watch over whoever is hurt most. They take 50% less damage for 5s and are wrapped in a barrier of {s:200}; you take 15% less damage for 5s.' } },
      { id: 'gloomsworn_spill', name: 'Spill', ab: 'strike', text: 'Gloom that would run past 100 now hardens into a barrier on you for 8s: {s:35} for every point that spilled.' },
      { id: 'gloomsworn_feast', name: 'Feast on the Hollow', ab: 'rend', text: 'Gloaming drinks: it heals you for 4% of your HP for every 20 Gloom you hold above 40 (up to three drinks). While you are Hollow, every strike you land heals you for 4% too, and that counts against your debt.' },
    ],
    [
      { id: 'gloomsworn_thorns', name: 'Thorned Mantle', ab: 'mantle', text: 'While Black Mantle lasts and for 4s after, every hit that gets through it strikes the boss back for one and a half times the damage (up to {d:500}). Dark Pact wraps you in the same thorns for its 8s.' },
      { id: 'gloomsworn_requiem', name: 'Requiem', ab: 'rite', text: 'Last Rite (or Black Pyre in its place) now shares its whole barrier with every ally.' },
      { id: 'gloomsworn_quick', name: 'Quick Rites', ab: 'rite', text: 'Every Gloom Strike takes 8s off the recharge of Last Rite (or of Black Pyre, in its place), and 6s off Black Mantle. Spending Gloom on Strikes brings the big buttons back.' },
    ],
    [
      { id: 'gloomsworn_pyre', name: 'Black Pyre', ab: 'rite', grants: true, text: 'New move on F, in place of Last Rite. Black Pyre (60s): spend all your Gloom (at least 30), and the vessel breaks over your target in black fire for {d:600} plus {d:15} for every point, and a barrier of {s:150} plus {s:5} for every point wraps you for 8s. The fire warms you too: you heal 6% of your HP. The blow itself fills 8 Gloom again.' },
      { id: 'gloomsworn_weeping', name: 'Weeping Wake', ab: 'strike', text: 'Every 20 Gloom you spend, on any move, wells up as a barrier of {s:100} on the most hurt ally for 8s. A Hollow you stand up from also shields the whole party for half your debt (at most a quarter of your HP).' },
      { id: 'gloomsworn_dusk', name: 'Last Light', ab: 'rite', text: 'Eclipse of the Vigil now keeps all your Gloom, and adds 40 more (up to full), instead of emptying the vessel.' },
    ],
  ],
});

// ======================================================================= REAPER (id thresher; damage, class 19)
// Rebuilt after Scythe Evie (docs/plans/2026-10-reaper-rework.md). New behaviour, one plain number (Quick Harvest's cooldown). Rows III
// and V grant a move (TALENT_ABILITIES in kits.js). The picks of the old Weight tree are cleared on reading (Save.talents matches a
// pick by id): the rows stay bought.
Object.assign(TALENTS, {
  thresher: [
    [
      { id: 'thresher_linger', name: 'Lingering Star', ab: 'star', text: 'Void Star\'s collapse comes again 2s later, much harder, and each one seeds a mark that is missing on what it hits (two on an enemy that already holds one).' },
      { id: 'thresher_hungry', name: 'Hungry Scythe', ab: 'string', text: 'A finisher fills the crescent by 6, and by 14 when it catches two or more enemies.' },
      { id: 'thresher_tide', name: 'Black Tide', ab: 'snap', text: 'A Drain that pops also mends the most hurt ally, four times as much as it mends you.' },
    ],
    [
      { id: 'thresher_step', name: 'Step Through', ab: 'string', text: 'Blinking through a telegraph makes your next string start at swing 3, its finisher hit twice as hard, and you take 15% less damage for 3s.' },
      { id: 'thresher_reach', name: 'Long Reach', ab: 'string', text: 'The scythe reaches 35% further.' },
      { id: 'thresher_debt', name: 'Debt Collector', ab: 'snap', text: 'A Bind that pops makes the whole party take 8% less damage for 6s; popped in a Harvest Moon, 12% for 9s.' },
    ],
    [
      { id: 'thresher_twin', name: 'Twin Stars', ab: 'star', grants: true, text: 'New move on R, in place of Void Star. Twin Stars: two charges (14s to recharge), each as strong as Void Star.' },
      { id: 'thresher_gather', name: 'Gathering Threads', ab: 'snap', text: 'A Thread that pops draws the adds near it together, toward where it sat, and holds them there for 2s.' },
      { id: 'thresher_vein', name: 'Open Vein', ab: 'snap', text: 'A Drain or Thread that pops opens a wound that bleeds the enemy for {d:30} every 2s for 8s, and spreads to every enemy near it.' },
    ],
    [
      { id: 'thresher_patient', name: 'Patient Death', ab: 'finish', text: 'Marks last 34s instead of 20s: time to build all four before a Snap. A Full Harvest pops its marks, and bursts, for three quarters more.' },
      { id: 'thresher_quick', name: 'Quick Harvest', ab: 'snap', cd: { snap: -4 }, text: 'Snap comes back in 4s instead of 8s, but pops only the oldest mark on each enemy, four times as hard, and fills the crescent by 20. An enemy holding all four marks still takes the Full Harvest.' },
      { id: 'thresher_toll', name: 'Last Toll', ab: 'snap', text: 'A Thread that pops gives a Blink charge back, and your next string starts at swing 3 and its finisher hits 30% harder.' },
    ],
    [
      { id: 'thresher_gravewalk', name: 'Gravewalk', ab: 'veil', grants: true, text: 'New move on D, in place of Dusk Veil. Gravewalk (30s): step out of the world for 1.5s, where nothing can touch you, and get a Blink charge back.' },
      { id: 'thresher_moonrise', name: 'Moonrise', ab: 'snap', text: 'Your Blink is a slash through its whole path: every enemy it crosses takes {d:100} and fills the crescent by 8. With a full crescent it takes {d:200}, and the crescent is not spent.' },
      { id: 'thresher_grave', name: 'Grave Ward', ab: 'veil', text: 'Dusk Veil (or Gravewalk) mends you, and the most hurt ally besides you, for 2% of your health for every mark you have snapped in the last 10s (up to 8).' },
    ],
  ],
});

// ----------------------------------------------------------------------- TIDECALLER (healer, class 20)
TALENTS.tidecaller = [
  [
    { id: 'tidecaller_spindrift', name: 'Spindrift', ab: 'spray', text: 'Salt Spray breaks twice: a moment later the spray strikes again for {d:100}, and with the tide above half the second break also heals the most hurt ally for {h:100}.' },
    { id: 'tidecaller_foam', name: 'Foam', ab: 'sip', text: 'A Sip on the ally who wears your Riptide Mark, or on any ally under half health, foams over: the most hurt other ally heals {h:180}, and the foam keeps healing them {h:50} every 2s for 8s. With Maelstrom, any Sip while the whirlpool is open foams over.', spec: { springtide: 'A Swell on the ally who wears your Riptide Mark, or on any ally under half health, foams over: the most hurt other ally heals {h:180}, and the foam keeps healing them {h:50} every 2s for 8s. With Maelstrom, any Swell while the whirlpool is open foams over.' } },
    { id: 'tidecaller_lowwater', name: 'Low Water', ab: 'sip', text: 'When the water touches the floor (the ebb, or a Surge or Sip that drains it), your next Sip costs no tide and heals half again as much.', spec: { undertow: 'When the water touches the floor (the ebb, or an Undertow or Sip that drains it), your next Sip costs no tide and heals half again as much.', springtide: 'When the water touches the floor (the ebb, or a Surge that drains it), your next Swell heals half again as much and runs on to the most hurt other ally at half.' } },
  ],
  [
    { id: 'tidecaller_kelp', name: 'Kelp Bind', ab: 'riptide', text: 'Riptide Mark also binds its ally in kelp: they take 15% less damage until the mark pops (or runs out). With Maelstrom, the whirlpool covers 30% instead of 20%.' },
    { id: 'tidecaller_tidewalk', name: 'Tidewalk', ab: 'current', text: 'Current also carries you: you ride the water a short way in the direction you are heading, and nothing can touch you while you ride.' },
    { id: 'tidecaller_seawall', name: 'Seawall', ab: 'breakwater', cd: { breakwater: -15 }, text: 'Breakwater recharges 15s faster. While it stands, every Sip also raises a wall of {s:100} around its ally and costs no tide.', spec: { springtide: 'Breakwater recharges 15s faster. While it stands, every Swell also raises a wall of {s:120} around its ally and lifts the tide twice as far.' } },
  ],
  [
    { id: 'tidecaller_deep', name: 'Deep Water', ab: 'surge', text: 'The crest holds 2.5s longer.' },
    { id: 'tidecaller_moon', name: 'Moon Pull', ab: 'current', text: 'Whenever the boss begins a cast, the moon pulls the tide 10 higher.' },
    { id: 'tidecaller_maelstrom', name: 'Maelstrom', ab: 'riptide', grants: true, text: 'New move on E, in place of Riptide Mark. Maelstrom (12s): a whirlpool opens where you stand for 9s. Allies in it take 20% less damage and heal every 1.5s by the height of the tide when you cast it, from {h:50} up to {h:130}.' },
  ],
  [
    { id: 'tidecaller_sealegs', name: 'Sea Legs', ab: 'breakwater', text: 'While Breakwater stands, Surge is instant, and the first one costs no tide: cast it on the move.', spec: { undertow: 'While Breakwater stands, Undertow is instant, and the first one costs no tide: cast it on the move.' } },
    { id: 'tidecaller_ebbshield', name: 'Ebb Shield', ab: 'breakwater', text: 'When Breakwater falls, the water it held rises into a shield on the whole party, from {s:60} up to {s:240} by its height. The tide stays where it was.' },
    { id: 'tidecaller_twin', name: 'Twin Currents', ab: 'current', text: 'Current can be pressed twice in a row: after the first press a second waits, and the cooldown counts from the second.' },
  ],
  [
    { id: 'tidecaller_leviathan', name: 'Leviathan', ab: 'surge', text: 'Spring Flood lasts 3s longer, and when it ends after a Surge, the flood rises out of the deep and strikes the boss for {d:600}, then pulls back and leaves a tenth of a new Spring Flood.', spec: { undertow: 'Spring Flood lasts 3s longer, and when it ends after an Undertow, the flood rises out of the deep and strikes the boss for {d:600}, then pulls back and leaves a tenth of a new Spring Flood.' } },
    { id: 'tidecaller_bore', name: 'Tidal Bore', ab: 'surge', grants: true, text: 'New move on R, in place of Surge. Tidal Bore: instant, spend all the tide in a wave rolled out ahead of you. It heals the party from {h:190} up to {h:480} by the tide, leaves a {s:80} shield and breaks on the boss for {d:30} up to {d:100}.', spec: { undertow: 'New move on R, in place of Undertow. Tidal Bore: instant, spend all the tide in a wave rolled out ahead of you. It heals the party from {h:190} up to {h:480} by the tide, leaves a {s:80} shield, breaks on the boss for {d:30} up to {d:100} and wraps you in a Deep Shield of {s:100} up to {s:250} for 8s.' } },
    { id: 'tidecaller_neap', name: 'Neap and Spring', ab: 'surge', text: 'Every second crest is a long one: it holds 1.5s more, and a Surge at a long crest (or in a Spring Flood) heals 20% more.', spec: { undertow: 'Every second crest is a long one: it holds 1.5s more, and an Undertow at a long crest (or in a Spring Flood) heals 20% more.' } },
  ],
];

// ----------------------------------------------------------------------- LANTERNKEEPER (healer, class 21)
TALENTS.lanternkeeper = [
  [
    { id: 'lanternkeeper_spark', name: 'Spark Chain', ab: 'trim', text: 'Trim the Wick leaps on from the lantern it tops up to every other lantern you have lit: each is topped up too, and pulses {h:25} for everyone in its glow.' },
    { id: 'lanternkeeper_moth', name: 'Moth Light', ab: 'trim', text: 'Each Trim the Wick sends a moth to the lantern it tops up: everyone in that glow heals {h:70}.' },
    { id: 'lanternkeeper_emberward', name: 'Ember Ward', ab: 'set', text: 'A lantern set down while the boss is casting pulses as the cast lands: a shield of {s:60} on everyone in its glow. Lantern Festival\'s floating lanterns each do the same.', spec: { beacon: 'A Great Beacon raised while the boss is casting pulses as the cast lands: a shield of {s:170} on everyone in its glow, and your other Great Beacon pulses a heal and the same shield too.', wayfarer: 'Every light of a Lamplighter\'s Stride dropped while the boss is casting pulses as the cast lands: a shield of {s:60} on everyone in its glow.' } },
  ],
  [
    { id: 'lanternkeeper_ward', name: 'Lantern Ward', ab: 'hand', text: 'Whoever carries your Hand Lantern takes 15% less damage for as long as it hangs on them, and at least 12s.' },
    { id: 'lanternkeeper_longtoss', name: 'Long Toss', ab: 'carry', text: 'Carry the Flame reaches twice as far, and the lantern lands with a pulse: everyone in its new glow heals {h:250}.', spec: { beacon: 'Call the Beacon reaches twice as far, tops its wick up to full, lights it for 6s longer and pulses {h:250} as it lands.', wayfarer: 'Trailblaze dashes twice as far and drops a small light where it ends, which pulses {h:150} as it lands.' } },
    { id: 'lanternkeeper_nightwalk', name: 'Night Walk', ab: 'carry', text: 'Carrying a lantern carries you too: you dash a short way on in the direction you are heading, and nothing can touch you while you slide.', spec: { beacon: 'Calling a Beacon carries you too: you dash a short way on in the direction you are heading, and nothing can touch you while you slide.', wayfarer: 'Trailblaze also tops every light it drags up to full and lets each burn 3s longer.' } },
  ],
  [
    { id: 'lanternkeeper_hoard', name: 'Hoarded Embers', ab: 'set', text: 'You can hold 5 Embers instead of 4, and your lanterns heal 12% more for every Ember you hold above 3, and an Ember that comes while you are full tops up every lantern\'s wick by a third.' },
    { id: 'lanternkeeper_emberfall', name: 'Ember Fall', ab: 'set', text: 'A lantern that goes out with its wick burned to a stub gives you an Ember back and pulses a last {h:80} for everyone in it. Lantern Festival\'s floating lanterns each pulse a last {h:60} when they go out, and the set gives one Ember back.', spec: { beacon: 'A Great Beacon that burns out gives you an Ember back and pulses a last {h:80} for everyone in its glow.', wayfarer: 'Every third small light that goes out gives you an Ember back, and each one pulses a last {h:60} for everyone in it.' } },
    { id: 'lanternkeeper_wisp', name: 'Will-o\'-Wisp', ab: 'relight', grants: true, text: 'New move on F, in place of Relight. Will-o\'-Wisp (10s), 1 Ember: a wandering wisp floats to the most hurt ally and heals them {h:60} every second for 6s, tops every lantern\'s wick up by a third and lets it burn 3s longer.' },
  ],
  [
    { id: 'lanternkeeper_twin', name: 'Twin Flare', ab: 'flare', text: 'Flare bursts twice: the second a beat after the first, at half strength.' },
    { id: 'lanternkeeper_flareshield', name: 'Flare Shield', ab: 'flare', text: 'The shield a Flare gives grows to {s:240}, and for 6s the whole party acts 10% faster and heals {h:30} every 2s.' },
    { id: 'lanternkeeper_shadow', name: 'Shadow Catch', ab: 'flare', text: 'Flare first draws every lantern left more than 100 paces from you in to 80 paces, and each one it draws bursts a second time for {h:240}.' },
  ],
  [
    { id: 'lanternkeeper_eternal', name: 'Eternal Lamp', ab: 'set', text: 'Lighthouse leaves a lantern that never burns down, hung over you so it drifts with you, healing {h:45} every second in a wide glow for the rest of the pull.' },
    { id: 'lanternkeeper_festival', name: 'Lantern Festival', ab: 'set', grants: true, text: 'New move on W, in place of Set Lantern. Lantern Festival (12s), 1 Ember: release five floating lanterns that follow your allies for 15s, one over each and the fifth over the most hurt, each healing everyone near it {h:40} every second. They never dim.',
      spec: { beacon: 'The first Great Beacon you raise in any 12s also lets loose three floating lanterns that follow your allies for 12s, each healing everyone near it {h:25} every second. Great Beacon stays where it is.', wayfarer: 'The first Lamplighter\'s Stride you begin in any 12s also lets loose three floating lanterns that circle you for 12s, each healing everyone under it {h:25} every second. Stride keeps its place.' } },
    { id: 'lanternkeeper_lastlight', name: 'Last Light', ab: 'relight', text: 'If Relight\'s heal, the Will-o\'-Wisp that takes its place, or a Hand Lantern hung on them reaches an ally under 20% health, they can\'t fall for 4s (once every 40s).' },
  ],
];

// ======================================================================= SPEC ROWS (VI and VII)
// SPEC_TALENTS[classId][specId] = [rowVI, rowVII], each row two talents. The rows are bought once per hero (after row V,
// TALENT_COSTS[5] and [6]) and open for both specs; each spec keeps its own pick in each (save.js specIds), and only the
// active spec's picks are held (talentSet). Swapping spec is free and swaps which picks count.
//
// AUTHORING GUIDE (how to add a class's spec rows; Bastion below is the worked example)
//  1. Data: add SPEC_TALENTS.<class> = { <specA>: [[a, b], [c, d]], <specB>: [[e, f], [g, h]] }. A talent is the same
//     shape as rows I-V ({ id, name, ab, text, cd?, cast?, grants? }); no `spec:` text is needed (it only ever shows in
//     its own spec), so write the text with that spec's move names (Shield Bash, not Holy Edge). Ids start with
//     <class>_ and are unique across the whole tree. `ab` is the BASE ability id the talent hangs on (its tooltip shows
//     there), even when the spec replaces that move.
//  2. Philosophy (same as rows I-V): new moves or changed behaviour, never % bumps. Each talent leans into what that
//     spec is about (its passive / focus line in specs.js); the two in a row play differently. Row VI is the spec's
//     rhythm or guard, row VII its capstone. A grant (grants: true) is welcome in either row; the class's one plain
//     number talent (rows I-VII together) stays at most one.
//  3. Code: the kits read k.talent('<id>') like any talent (kits.js helpers or the spec's build in specs.js). It only
//     answers true in its own spec, so no spec checks are needed. A grant registers its move in kits.js
//     (talentMoves('<class>', { <id>: { id, replaces: '<ab>', icon, name, type, desc, effect, fx } })); kitFor puts it
//     in the slot. Don't grant into a slot a row III/V grant of the same class already takes.
//  4. Sims: if a talent adds a move or a press the pro policy must make, teach tools/simulate.js (the class policy).
//  5. Test: node tools/talents.js <class> (each talent's pro DPS/HPS change, and the full builds), then node tools/check.js ("Talents line up with the kits" checks shape, ids, grants, text).
const SPEC_TALENTS = {
  bloodreaver: {
    // Berserker, The Red Storm: risky damage, the closer to death the harder you hit
    berserker: [
      [
        { id: 'bloodreaver_painfuel', name: 'Pain Is Fuel', ab: 'hack', text: 'A heavy hit on you (a tenth of your HP or more) pours 35 Rage into you and keeps your blood warm for 4s: a Rampage thrown in that time cashes its bank in full.' },
        { id: 'bloodreaver_scar', name: 'Scar Tissue', ab: 'drain', text: 'A Rampage throws its guard over the whole party too: 10% less damage for 3s (15% when thrown below 60% HP), and mends the most hurt ally for half of what it healed you.' },
      ],
      [
        { id: 'bloodreaver_bloodbath', name: 'Bloodbath', ab: 'letting', grants: true,
          text: 'Bloodletting becomes Bloodbath (15s, two charges): open a vein and fling the blood, {d:260} and 35 Rage, for 3% of your HP. The cut counts in your bank, and your next Rampage heals it back. Not below 30% HP.' },
        { id: 'bloodreaver_throes', name: 'Death Throes', ab: 'drain', text: 'Dropping below half HP makes your next two Rampages cost nothing, and your blood runs warm for each, and a red wall cuts 20% of what you take for 4s (once every 25s).' },
      ],
    ],
    // Hemomancer, The Blood Mage: what you drain flows to your allies
    hemomancer: [
      [
        { id: 'bloodreaver_spill', name: 'Spill Over', ab: 'drain', text: 'Crimson Drain also heals the most hurt ally for a fifth of what it healed you, or a third when you are above 80% HP.' },
        { id: 'bloodreaver_bleedcast', name: 'Bleed the Cast', ab: 'letting', text: 'A Blood Lance thrown while the boss is casting wards the whole party for {s:220} for 6s and gives 10 more Blood.' },
      ],
      [
        { id: 'bloodreaver_pact', name: 'Crimson Pact', ab: 'frenzy', grants: true,
          text: 'Frenzy becomes Crimson Pact (60s): for 12s the healing Crimson Drain gives you flows to the whole party at three quarters of its strength, you hit 8% harder, and your next three Drains are free and hit for {d:110} more.' },
        { id: 'bloodreaver_font', name: 'Blood Font', ab: 'drain', text: 'Crimson Drain opens a font of blood at your feet for 9s: allies who stand in it mend {h:60} every 1.5s (once every 20s).' },
      ],
    ],
  },
  runeguard: {
    // Spellwarden, The Warding Circle: Wards for the party
    spellwarden: [
      [
        { id: 'runeguard_foreseen', name: 'Foreseen Ward', ab: 'ward', text: 'Whenever the boss begins a cast, your next Runic Ward within 8s costs no Rune.' },
        { id: 'runeguard_chain', name: 'Chain Ward', ab: 'ward', text: 'A Ward that absorbed at least three quarters raises a new one on the most hurt ally, at 60% strength for 8s.' },
      ],
      [
        { id: 'runeguard_wardglyph', name: 'Glyph of Warding', ab: 'glyph', grants: true,
          text: 'Glyph Burst becomes Glyph of Warding: spend 3 Runes to ward every ally for {s:120} for 8s and cut the target for {d:780} ({d:1020} in Runic Overload).' },
        { id: 'runeguard_surge', name: 'Warding Surge', ab: 'overload', text: 'Runic Overload also wards every ally for {s:250} for 8s, and again for {s:150} for 8s as the first fades.' },
      ],
    ],
    // Runeblade, The Carved Edge: melee damage with a sword combo
    runeblade: [
      [
        { id: 'runeguard_fan', name: 'Fanned Brand', ab: 'strike', text: 'Carve, the second hit, fans the burning rune on the boss: it burns once at once.' },
        { id: 'runeguard_smith', name: 'Wardsmith', ab: 'ward', text: 'Raising a Ward readies the blade: your next Rune Blade hit is a Carve that hits {d:150} harder and gives an extra Rune.' },
      ],
      [
        { id: 'runeguard_counter', name: 'Counterstroke', ab: 'mirror', text: 'A reflect from Mirror Aegis, or a Ward that soaked at least half, readies a Counterstroke: your next Rune Cleave within 15s costs two Runes instead of 3, and hits a quarter harder.' },
        { id: 'runeguard_storm', name: 'Rune Storm', ab: 'overload', text: 'During Runic Overload, Rune Blade is a three-hit combo: Cut > Carve > Burst, a burst of runes for {d:1200}.' },
      ],
    ],
  },
  gorgemaw: {
    // Glutton, The Endless Appetite: eating the same thing twice
    glutton: [
      [
        { id: 'gorgemaw_matching', name: 'Matching Bite', ab: 'gnash', text: 'Gulp, the third bite of Gnash, now swallows a copy of your newest Morsel if the Belly has room (once every 15s, not 20s), so a pair is always at hand.' },
        { id: 'gorgemaw_chain', name: 'Chain Eater', ab: 'spit', text: 'A Fusion goes round again: a moment later the pair\'s blow strikes once more at half strength.' },
      ],
      [
        { id: 'gorgemaw_frenzy', name: 'Feeding Frenzy', ab: 'bottomless', grants: true,
          text: 'Bottomless becomes Feeding Frenzy (120s): for 4s you eat everything, raidwides too, and every Morsel you eat is twice over: a copy of it joins the Belly. When the jaw closes the Belly is spat back at half strength.' },
        { id: 'gorgemaw_triple', name: 'Triple Course', ab: 'spit', text: 'Three Morsels of one shape in a row fuse into a Feast, 5.5 times as strong as one.' },
      ],
    ],
    // Gizzard, The Iron Stomach: what it swallows comes out as armour
    gizzard: [
      [
        { id: 'gorgemaw_reflex', name: 'Gastric Reflex', ab: 'digest', text: 'Whenever the boss begins a cast, Digest is ready at once, and that Digest counts its Morsels twice, as Iron Gut does. Once every 20s.' },
        { id: 'gorgemaw_grinder', name: 'Grinder', ab: 'digest', text: 'For 4s after a Digest, every Morsel you eat is digested at once, its protection counts twice, the grind bites the boss for most of a Spit of its shape (four fifths), and the acid it leaves thickens the next Spit.' },
      ],
      [
        { id: 'gorgemaw_banquet', name: 'Banquet', ab: 'bottomless', grants: true,
          text: 'Bottomless becomes Banquet (120s): for 4s you eat everything, raidwides too. When the jaw closes the whole Belly is digested at once, three times over, and the acid it leaves thickens the next Spit.' },
        { id: 'gorgemaw_spitshield', name: 'Warm Spit', ab: 'spit', text: 'A Spit carries its shape\'s protection at full strength and heals you for 3% of your HP: a Ring shields everyone, a Lance the most hurt ally, a Fang trims the party\'s damage, a Spike shields the most hurt ally from all harm for 2s.' },
      ],
    ],
  },
  bastion: {
    // Sentinel, The Wall: the party behind the shield
    sentinel: [
      [
        { id: 'bastion_phalanx', name: 'Phalanx', ab: 'brace', text: 'Each Perfect Block locks one more shield into the line (up to 3, for 12s). Shield Bash sends them all out: every ally gets a {s:60} shield for each, for 6s.' },
        { id: 'bastion_interpose', name: 'Interpose', ab: 'edge', text: 'While you are above 60% HP, Shield Bash guards the line instead of you: for 4s the whole party takes 15% less damage, and you still take 20% less (not 30%).' },
      ],
      [
        { id: 'bastion_aegis', name: 'Aegis', ab: 'bulwark', grants: true,
          text: 'Bulwark becomes Aegis (120s): plant your shield as a dome for 10s. You take 25% less damage and the party 15% less, Brace\'s charges refill, and every Perfect Block under it heals the party for {h:100}.' },
        { id: 'bastion_rebuke', name: 'Rebuke', ab: 'edge', text: 'Bulwark now readies a Rebuke: your next Shield Bash within 10s costs no Resolve and strikes half again as hard.' },
      ],
    ],
    // Crusader, The Dawn Blade: Radiance and holy fire
    crusader: [
      [
        { id: 'bastion_dawnburn', name: 'Dawnburn', ab: 'edge', text: 'A Radiant Holy Edge leaves the light burning in the boss: {d:50} every 2s for 8s.' },
        { id: 'bastion_kindling', name: 'Kindling', ab: 'brace', text: 'Radiance now banks: Perfect Blocks stack it (up to 3, for 15s). Each Radiant Holy Edge spends one stack and costs 30 Resolve.' },
      ],
      [
        { id: 'bastion_verdict', name: 'Final Verdict', ab: 'blade', text: 'Judgment during Oath of Valor now kindles Radiance itself: your next Holy Edge is Radiant. And every Radiant Holy Edge thrown during Oath is followed by an echo blade for a fifth of its damage.' },
        { id: 'bastion_pyre', name: 'Pyre', ab: 'bulwark', text: 'Zealous Guard now ends in a blast of light: the boss takes {d:90} for every Perfect Block you made while it stood.' },
      ],
    ],
  },
};

// ---- RANGER: Sharpshooter (the still eye: Steady Aim, Aimed Shot) and Venomstrike (the jar of Acid on the boss)
SPEC_TALENTS.ranger = {
  sharpshooter: [
    [
      { id: 'ranger_parting', name: 'Parting Shot', ab: 'pierce', text: 'Move with 3 or more Steady Aim and the stacks are loosed as a parting shot, {d:70} for each stack, before they are gone as usual.' },
      { id: 'ranger_wind', name: 'Read the Wind', ab: 'pierce', text: 'Whenever the boss begins a cast, you draw a steadying breath: full Steady Aim and a lit Keen Eye at once, moving or not, and for 4s moving does not break your aim.' },
    ],
    [
      { id: 'ranger_deadeye', name: 'Dead Eye', ab: 'pierce', text: 'An Aimed Shot cast at 5 Steady Aim also lights Keen Eye, so the shot after it is instant.' },
      { id: 'ranger_overwatch', name: 'Overwatch', ab: 'quick', text: 'At 5 Steady Aim your bow looses a shot by itself every 3s, {d:80} each, for as long as you hold 5.' },
    ],
  ],
  venomstrike: [
    [
      { id: 'ranger_seep', name: 'Seep', ab: 'pierce', text: 'Caustic Arrow no longer empties the jar: two stacks of Acid are left burning in the boss.' },
      { id: 'ranger_boil', name: 'Boiling Over', ab: 'quick', text: 'Whenever the boss begins a cast, the Acid on it boils: it ticks twice at once and gains 2 stacks.' },
    ],
    [
      { id: 'ranger_poisonmark', name: 'Poisoned Mark', ab: 'mark', text: 'While Hunter\'s Mark is up, every Quick Shot adds one more stack of Acid, and a Caustic Arrow gives its charge back (once every 5s).' },
      { id: 'ranger_virulence', name: 'Virulence', ab: 'pierce', text: 'A Caustic Arrow that bursts 6 or more stacks leaves the boss sickened: it takes 10% more damage from everyone for 8s, on top of your Mark.' },
    ],
  ],
};

// ---- CHRONOMANCER: Echoist (everything happens twice) and Accelerant (the party moves to your beat)
SPEC_TALENTS.chronomancer = {
  echoist: [
    [
      { id: 'chronomancer_resonance', name: 'Resonance', ab: 'bolt', text: 'An echo of a Temporal Bolt that crits echoes once more, 3s later at the same strength. In Haste your Bolts crit 5% more often.' },
      { id: 'chronomancer_reprise', name: 'Reprise', ab: 'rewind', text: 'Rewind echoes twice, 3s and 6s later, setting the same ally back again (the most hurt ally instead, if they are above 90%) and healing at least {h:400} each time.' },
    ],
    [
      { id: 'chronomancer_held', name: 'Held Echo', ab: 'bolt', text: 'Echoes wait out a boss\'s cast (3s at most) and land the moment it does, at full strength, and each one that waited heals the whole party for {h:50}.' },
      { id: 'chronomancer_ringing', name: 'Ringing', ab: 'bolt', text: 'In Haste, every echo that lands heals the whole party for {h:80} and gives back 3 Flux.' },
    ],
  ],
  accelerant: [
    [
      { id: 'chronomancer_pace', name: 'Pace Setter', ab: 'shift', text: 'Shifting into Haste also Quickens your linked ally and you: 12% faster for 15s (once every 20s).' },
      { id: 'chronomancer_credit', name: 'On Credit', ab: 'shift', text: 'Running out of Flux no longer ends Haste at once: it runs on for 4s on credit. Shift back in time and Paradox still goes off, and the credit\'s seconds count as Flux spent; stay, and you stumble when the credit is called in.' },
    ],
    [
      { id: 'chronomancer_forward', name: 'Fast Forward', ab: 'rewind', text: 'A Rewind cast in Haste also Quickens its target: 12% faster for 15s.' },
      { id: 'chronomancer_clock', name: 'Beat the Clock', ab: 'bolt', text: 'Whenever the boss begins a cast, your next Bolt is instant, and in Haste your Flux stops draining until the cast lands.' },
    ],
  ],
};

// ---- ALEMBIST: Apothecary (the planner: five vials, number marks) and Volatile (short fuses, Reactions)
SPEC_TALENTS.alembist = {
  apothecary: [
    [
      { id: 'alembist_label', name: 'Labelled Shelf', ab: 'throw', text: 'A vial thrown from a number-key mark goes out fully ripe, however young it is.' },
      { id: 'alembist_warn', name: 'Forewarned', ab: 'distill', text: 'Whenever the boss begins a cast, every vial in your bandolier ripens at once and its spoil clock starts over, and the next cure you throw within 6s also shields its splash for {s:150}.' },
    ],
    [
      { id: 'alembist_cold', name: 'Cold Storage', ab: 'throw', text: 'A vial you have marked with its number key never spoils while the mark holds, and a cure thrown from the mark onto an ally under half health heals half again as much.' },
      { id: 'alembist_quench', name: 'Quench', ab: 'throw', text: 'A Kiln Bomb now also bursts in cure: it heals the whole party for {h:150}.' },
    ],
  ],
  volatile: [
    [
      { id: 'alembist_flashpoint', name: 'Flashpoint', ab: 'distill', text: 'A Reaction comes out of the still fully heated, ready to throw at once.' },
      { id: 'alembist_damp', name: 'Damp Cloth', ab: 'distill', text: 'Catalyst also dampens every fuse in your bandolier: each burns 6s longer, and the damp vials heat up 30% stronger.' },
    ],
    [
      { id: 'alembist_whitehot', name: 'White-Hot', ab: 'throw', text: 'A vial thrown in the 2s after it reaches full heat is white-hot: 30% stronger still.' },
      { id: 'alembist_slag', name: 'Slag', ab: 'throw', text: 'A Reaction you throw lights the Kiln fully, and a vial whose fuse runs out in the bandolier heats it by 2.' },
    ],
  ],
};

// ---- SHADOWBLADE: Bladedancer (the whirling edge: Blade Fury, Tempo and the Flourish) and Nightstalker (the knife behind: Backstab, Stalking)
SPEC_TALENTS.shadowblade = {
  bladedancer: [
    [
      { id: 'shadowblade_encore', name: 'Encore', ab: 'step', text: 'A Flourish leaves one Tempo behind: the next one needs only two more perfect finishers. The Flourish itself hits for {d:1250} (was {d:650}).' },
      { id: 'shadowblade_pirouette', name: 'Pirouette', ab: 'step', text: 'Blade Fury now whirls you round the boss to its far side, and for 2s you take 30% less damage.' },
    ],
    [
      { id: 'shadowblade_curtain', name: 'Curtain Call', ab: 'dance', text: 'When Shadow Dance ends you close it with one last spin: {d:1400} on the boss, a sure critical hit.' },
      { id: 'shadowblade_eye', name: 'Eye of the Storm', ab: 'step', text: 'The blades turn blows aside: you take 8% less damage for each Tempo you hold (up to 24%), until the Flourish is spent.' },
    ],
  ],
  nightstalker: [
    [
      { id: 'shadowblade_deaddrop', name: 'Dead Drop', ab: 'step', text: 'The Backstab you land while Stalking, after a Shadowstep, is always a critical hit.' },
      { id: 'shadowblade_cloak', name: 'Cloak of Night', ab: 'evis', text: 'A Backstab that lands from behind hides you in the dark: you take 30% less damage for 4s.' },
    ],
    [
      { id: 'shadowblade_shade', name: 'Shade', ab: 'step', text: 'Shadowstep leaves your shade where you stood: 2s later it stabs the boss from the front for {d:100} and gives you a combo point, while you work behind.' },
      { id: 'shadowblade_veil', name: 'Veil of Night', ab: 'dance', text: 'Shadow Dance now draws the dark over the whole party: for its whole 14s everyone takes 15% less damage.' },
    ],
  ],
};

// ---- PYROMANCER: Cataclysm (the falling star: Meteor, craters) and Sigilmancer (the burning circle: Ember Circle)
SPEC_TALENTS.pyromancer = {
  cataclysm: [
    [
      { id: 'pyromancer_stoke', name: 'Stoke the Crater', ab: 'fireball', text: 'A Fireball cast while a Meteor\'s crater burns stokes it: the flames flare for {d:90} at once.' },
      { id: 'pyromancer_ash', name: 'Smothering Ash', ab: 'pyro', text: 'A Meteor that lands while the boss is casting smothers the blow: everyone takes 12% less damage for 6s.' },
    ],
    [
      { id: 'pyromancer_fault', name: 'Fault Line', ab: 'pyro', text: 'A Meteor that lands on a crater that still burns sets the ground off: everything the old crater had left lands at once, plus {d:250}.' },
      { id: 'pyromancer_boil', name: 'Boil Over', ab: 'fireball', text: 'Heat that reaches 100 no longer burns or weakens you: it boils over into the boss as a blast for {d:450}, and Heat starts again from 50.' },
    ],
  ],
  sigilmancer: [
    [
      { id: 'pyromancer_hearth', name: 'Hearth', ab: 'combust', text: 'While you stand in your Ember Circle the whole party takes 13% less damage: plant it where the fight will be.' },
      { id: 'pyromancer_rekindle', name: 'Rekindle', ab: 'combust', text: 'Stepping back into your Ember Circle after leaving it flares it: {d:350} on the boss, a Fire Blast charge back, and your next Fireball is instant and 35% harder (within 8s, once every 6s).' },
    ],
    [
      { id: 'pyromancer_beacon', name: 'Beacon', ab: 'combust', text: 'Whenever the boss begins a cast while you stand in your Ember Circle, the circle flares: {d:160} on the boss, and everyone takes 12% less damage for 8s.' },
      { id: 'pyromancer_recall', name: 'Hearthfire', ab: 'fireblast', text: 'A Fire Blast fired while you stand in your Ember Circle gives its charge back (once every 12s).' },
    ],
  ],
};

// ---- THERMIST: Pendulum (the swinging weight: Momentum) and Zenith (the burning edge: Corona, Sunset)
SPEC_TALENTS.thermist = {
  pendulum: [
    [
      { id: 'thermist_crescendo', name: 'Crescendo', ab: 'invert', text: 'A Thermal Shock set off at 3 or more Momentum (counting its own crossing) is always a critical hit and 50% harder.' },
      { id: 'thermist_counterweight', name: 'Counterweight', ab: 'equil', text: 'Every crossing of 0 wraps you in a shield of {s:100} for each Momentum you hold, for 6s. It adds to what is left of the last one (up to {s:800}).' },
    ],
    [
      { id: 'thermist_bell', name: 'Tolling Bell', ab: 'invert', text: 'Whenever the boss begins a cast, the dial swings two steps toward the other side by itself.' },
      { id: 'thermist_deadcentre', name: 'Dead Centre', ab: 'equil', text: 'Equilibrium now counts as a crossing of 0: it fills Momentum to 5 and holds it 3s longer, and Counterweight wraps you in its shield as for any crossing, on top of the shield Equilibrium gives.' },
    ],
  ],
  zenith: [
    [
      { id: 'thermist_solarwind', name: 'Solar Wind', ab: 'equil', text: 'Sunset no longer moves the dial: the stars fall 70% harder and the shield comes up as if it had dropped to 0, but you stay at the edge, free to light a fresh Corona. Sunset comes back in 22s.' },
      { id: 'thermist_slag', name: 'Slag Plate', ab: 'flare', text: 'Each Corona you light cools over you as slag: a shield of {s:150} for 8s, adding to what is left.' },
    ],
    [
      { id: 'thermist_redgiant', name: 'Red Giant', ab: 'invert', grants: true,
        text: 'Inversion becomes Red Giant (60s): for 10s you can hold up to 5 Corona at the edge instead of 3, the 4th and 5th edge casts hit 125% harder, and a Thermal Shock set off while it lasts is half again as strong. Pressed On the Brink with a full three, it lets you hold on.' },
      { id: 'thermist_alert', name: 'Red Alert', ab: 'equil', text: 'Whenever the boss begins a cast while you hold 2 or more Corona, Sunset comes off cooldown at once.' },
    ],
  ],
};

// ----------------------------------------------------------------------- DRIFTBLADE
Object.assign(SPEC_TALENTS, {
  driftblade: {
    // Orbit, The Circling Hawk: round and round, a full Orbit cuts on its own
    orbit: [
      [
        { id: 'driftblade_slingshot', name: 'Slingshot', ab: 'cross', text: 'Crosswind with 3 Orbit or more takes the Orbit with it: the stacks are spent and the blade curves back round the boss, cutting again for {d:60} for each.' },
        { id: 'driftblade_spiral', name: 'Spiral In', ab: 'carve', text: 'While you hold a full Orbit, every Carve and every automatic cut hits 4% harder than the last (up to 20%). It starts over when the Orbit falls.' },
      ],
      [
        { id: 'driftblade_eye', name: 'Eye of the Hawk', ab: 'carve', text: 'Whenever the boss begins a cast, your Orbit fills at once and the hawk stoops on the boss for {d:260}.' },
        { id: 'driftblade_roost', name: 'Roost', ab: 'gale', grants: true,
          text: 'Gale Run becomes Roost (60s): settle on the wind for 10s. Your Orbit stays full whether you circle or not, Carve cuts on its own every second and hits 80% harder, Passing Strikes hit twice as hard, your Drift holds, and you take 20% less damage.' },
      ],
    ],
    // Comet, The Long Charge: build the run, then let it fall
    comet: [
      [
        { id: 'driftblade_ricochet', name: 'Ricochet', ab: 'cross', text: 'Impact lights the way back: Hook Turn comes off cooldown, and for 4s it also flings you back through the boss, a Passing Strike, and gives 20 more Drift.' },
        { id: 'driftblade_afterburn', name: 'Afterburn', ab: 'cross', text: 'Impact no longer spends everything: a little of the Drift it released stays lit: 12% of it, up to 24.' },
      ],
      [
        { id: 'driftblade_starfall', name: 'Starfall', ab: 'gale', grants: true,
          text: 'Gale Run becomes Starfall (30s): needs 100 Drift. Spend it and call the star down on the boss for {d:350}, plus {d:80} for every 10 Drift you hold. It always crits, whatever you hold above 100 stays lit for Impact, it gives back a dash charge, and nothing can touch you for 0.5s as it falls.' },
        { id: 'driftblade_zenith', name: 'Zenith', ab: 'carve', text: 'Whenever the boss begins a cast, you gain 60 Drift at once and your charge hangs at its peak for 5s: Drift cannot drain, and Impact needs only 60.' },
      ],
    ],
  },
});

// ----------------------------------------------------------------------- GLOOMSWORN, CLERIC, GROVEKEEPER
Object.assign(SPEC_TALENTS, {
  gloomsworn: {
    // Sentinel, The Long Vigil: the party behind the knight
    duskward: [
      [
        { id: 'gloomsworn_cover', name: 'Cover', ab: 'strike', text: 'Whenever the boss begins a cast that is not a tankbuster on you, your next Gloom Strike within 8s spends no Gloom (it needs none), and the barrier it lays on the most hurt ally is doubled ({s:220}).' },
        { id: 'gloomsworn_brim', name: 'Brimming Vessel', ab: 'strike', text: 'The moment your vessel reaches 80 Gloom, a pall falls over the whole party: 20% less damage taken for 10s (once every 20s).' },
      ],
      [
        { id: 'gloomsworn_wardmantle', name: 'Warden\'s Mantle', ab: 'mantle', grants: true,
          text: 'Black Mantle becomes Warden\'s Mantle (45s): the same dark, 40% less damage taken for 12s and 15 Gloom. For those 12s every hit that gets through lays a barrier of {s:150} on the most hurt ally (one a second).' },
        { id: 'gloomsworn_hollowwall', name: 'Wall Within', ab: 'pall', text: 'While your vessel holds 60 Gloom or more (or you are Hollow), Black Pall (or Vigil Ward) costs no Gloom and comes back in half the time.', },
      ],
    ],
    // Reaver of Dusk, The Hollow Blade: the dark as a weapon
    duskreaver: [
      [
        { id: 'gloomsworn_hunger', name: 'Hollow Hunger', ab: 'strike', text: 'While a Shade Step echo is armed, Gloom Strike costs 25 Gloom instead of 40; while you are Hollow, 20.' },
        { id: 'gloomsworn_gravecut', name: 'Gravecut', ab: 'shade', text: 'Shade Step lands straight in the third strike: your next four Rends are Gloaming, and each builds 6 extra Gloom.' },
      ],
      [
        { id: 'gloomsworn_pact', name: 'Dark Pact', ab: 'mantle', grants: true,
          text: 'Black Mantle becomes Dark Pact (60s): the vessel fills to the brim at once and your next two Gloom Strikes echo, and the dark still closes round you as Black Mantle did (40% less damage taken for 8s), but it takes a tenth of your health for it.' },
        { id: 'gloomsworn_debt', name: 'Debt Collected', ab: 'strike', text: 'Damage that gets through in the 8s after Black Mantle (or Dark Pact) is stored as ember, and your next Gloom Strike within 14s of the Mantle lets all of it break over the boss, up to {d:900}. A Hollow you stand up from does the same with its debt.' },
      ],
    ],
  },
  cleric: {
    // Aegis, The Golden Wall: stop the damage before it lands
    aegis: [
      [
        { id: 'cleric_gilded', name: 'Gilded Dawn', ab: 'smite', text: 'Dawnstar\'s light hardens into armour: every ally is wrapped in a shield of {s:220} for 10s (it never replaces a larger shield).' },
        { id: 'cleric_foresight', name: 'Foresight', ab: 'mend', text: 'A Divine Barrier or Dawn Petal cast while the boss is casting has its shield half again as strong.' },
      ],
      [
        { id: 'cleric_overflow', name: 'Golden Overflow', ab: 'petal', text: 'A Petal that would grow past 3, or one you spend from a full set, no longer blooms onto the most hurt ally: it hardens into a shield of {s:180} on the whole party for 10s. It still counts toward Dawnstar.' },
        { id: 'cleric_reflected', name: 'Reflected Gold', ab: 'petal', text: 'When a Petal shield soaks enough to give its Petal back, the light it caught is thrown at the boss for {d:170} and warms the most hurt ally for {h:170}.' },
      ],
    ],
    // Inquisitor, The Burning Verdict: judgment first, mercy after
    inquisitor: [
      [
        { id: 'cleric_openverdict', name: 'Open Verdict', ab: 'smite', text: 'Whenever the boss begins a cast, your next Smite within 8s is instant and brands 6 hits instead of 2 (a Dawnstar brands 8).' },
        { id: 'cleric_penance', name: 'Penance', ab: 'petal', text: 'Every Dawn Petal you spend also brands the boss for 4 hits and leaves a regen half again as strong: mercy first, then the verdict.' },
      ],
      [
        { id: 'cleric_absolve', name: 'Absolution', ab: 'mend', text: 'Mend also brands the boss for 3 hits and washes Vulnerability and Damage Down off its target and whoever stands close, leaving each a ward of {s:160} for 8s (once every 15s): judgment first, mercy after.' },
        { id: 'cleric_judgehour', name: 'Judge\'s Hour', ab: 'smite', text: 'A Dawnstar brands 6 hits instead of 4, or 8 while the party\'s damage is boosted, and the hits burst a quarter harder (half again as hard when boosted).' },
      ],
    ],
  },
  grovekeeper: {
    // Lifebinder, The Deep Roots: heal before the hit
    lifebinder: [
      [
        { id: 'grovekeeper_drinking', name: 'Deep Drinking', ab: 'rejuv', text: 'Both Lifebind roots feed the grove: the second root\'s ticks grow Bloom too (7 each), and Bloom reaches its ally.' },
        { id: 'grovekeeper_brimming', name: 'Overflowing Bloom', ab: 'bloom', text: 'A Bloom spent with 65 or more in the vessel overflows: the whole party is healed for {h:600} as well.' },
      ],
      [
        { id: 'grovekeeper_canopy', name: 'Canopy', ab: 'growth', grants: true,
          text: 'Wild Growth becomes Canopy (60s): the whole party takes 10% less damage for 10s, and everyone under your Lifebind 20% less besides and is healed for {h:300}. The whole party heals {h:90} every 3s for 15s, and your heals are 25% stronger for 15s, as before.' },
        { id: 'grovekeeper_evergreen', name: 'Evergreen', ab: 'rejuv', text: 'When Lifebind runs out on your chosen ally, it takes root again at once if you spend 20 Bloom, and the renewed roots heal 30% more.' },
      ],
    ],
    // Moonwell, The Silver Pool: placed healing
    moonwell: [
      [
        { id: 'grovekeeper_tide', name: 'Tidal Shift', ab: 'growth', text: 'Moonwell can be cast again within 8s at no cooldown: the pool lifts and settles at another ally\'s feet, with what is left of its time.' },
        { id: 'grovekeeper_veil', name: 'Argent Veil', ab: 'growth', text: 'A Moonwell set down while the boss is casting also wraps everyone standing in it in a barrier of {s:350} for 10s.' },
      ],
      [
        { id: 'grovekeeper_afterglow', name: 'Afterglow', ab: 'growth', text: 'When Moonwell ends, it rises again at your own feet for 10s, healing {h:120} every 1.5s to all inside, and they take 10% less damage.' },
        { id: 'grovekeeper_moonwrath', name: 'Moonlit Wrath', ab: 'wrath', text: 'While Moonwell lasts every Wrath is instant and hits for {d:560}, and each calls a moonbeam: the most hurt ally is healed for over half its damage.' },
      ],
    ],
  },
});

// ----------------------------------------------------------------------- THREADWEAVER, MARIONETTIST, REAPER (thresher)
Object.assign(SPEC_TALENTS, {
  threadweaver: {
    // Loomwright, The Living Web: a network of up to five threads, heals two links deep
    loomwright: [
      [
        { id: 'threadweaver_hub', name: 'Hub and Spoke', ab: 'tie', text: 'Any Tie on an ally now makes them the hub: a pulse of {h:150} runs down every thread you hold on them, to its far end, and they take 12% less damage for 5s.' },
        { id: 'threadweaver_drawn', name: 'Drawn Taut', ab: 'tie', text: 'Whenever the boss begins a cast, your web draws taut: the whole party takes 3% less damage for each thread you hold (up to 5, so 15%) for 6s.' },
      ],
      [
        { id: 'threadweaver_thrum', name: 'Thrum', ab: 'snip', grants: true,
          text: 'New move on R, in place of Snap. Thrum (20s): pluck every thread you hold and leave it whole. Each rings with a {h:90} heal to both its ends, and the party takes 3% less damage for 4s for each thread (up to 5, so 15%).' },
        { id: 'threadweaver_ahead', name: 'Stitched Ahead', ab: 'tie', text: 'Tying an ally while you already hold 2 threads or more readies the next heal: your next Mend Seam (or Embroider) within 8s is instant, costs no Spool and heals 50% more.' },
      ],
    ],
    // Shears, The Cut Thread: tie it, let it take the strain, then cut it loose
    shears: [
      [
        { id: 'threadweaver_spare', name: 'Spare Thread', ab: 'snip', text: 'A Snap that cuts a thread leaves you a Spare Thread for 6s: your next Tie costs no charge and wraps both its ends in a {s:100} shield for 4s.' },
        { id: 'threadweaver_judgment', name: 'Snap Judgment', ab: 'snip', text: 'Whenever the boss begins a cast, Snap is ready again at once, and the next Snap within 6s shields the ends it cuts for {s:150}.' },
      ],
      [
        { id: 'threadweaver_severance', name: 'Severance', ab: 'tapestry', grants: true,
          text: 'New move on F, in place of Tapestry. Severance (40s): cut every thread you hold at once. Each releases what it carried in the last 5s to both its ends (at least {h:170}), gives back 10 Spool each, and for 5s the party takes 15% less damage. 2s later each severed pair is tied again.' },
        { id: 'threadweaver_looseends', name: 'Loose Ends', ab: 'snip', text: 'The ends of every thread Snap cuts stay bound for 6s: each of them heals {h:80} every 1.5s and takes 10% less damage.' },
      ],
    ],
  },
  marionettist: {
    // Cutting Line, The Bladed String: stand right, and the stage itself bleeds
    cuttingline: [
      [
        { id: 'marionettist_saw', name: 'Saw', ab: 'cross', text: 'Every fifth cut of the line is a clean one: it takes 1.5s off Cross-Cut\'s cooldown.' },
        { id: 'marionettist_breath', name: 'Held Breath', ab: 'cross', text: 'Whenever the boss begins a cast, the strings draw tight at once: Taut String jumps to its full strength and your next Cross-Cut cuts half again as hard.' },
      ],
      [
        { id: 'marionettist_strum', name: 'Strum', ab: 'cue', grants: true,
          text: 'New move on Q, in place of Cue. Strum: pluck the strings for a {d:340} cut along the line when it is across the enemy ({d:170} when not), add 30 to Taut String and build 1 Encore, line or no line. It sends no quick Jabs.' },
        { id: 'marionettist_garrote', name: 'Garrote', ab: 'finale', text: 'With every beat of Grand Finale the strings pull tight round the enemy and cut as well, for 55% of what the line cuts each second.' },
      ],
    ],
    // Understudy, Two Dolls on One Bar: the Stage is the whole party's
    understudy: [
      [
        { id: 'marionettist_house', name: 'Packed House', ab: 'cross', text: 'A Cross-Cut that cuts while the enemy stands in the Stage gives the whole party 5% more damage for 10s.' },
        { id: 'marionettist_presence', name: 'Stage Presence', ab: 'cue', text: 'While the enemy stands in the Stage, Cue and Pull Strings each build 1 more Encore, and a Cue there hits 50% harder and shaves 2s off Cross-Cut\'s cooldown.' },
      ],
      [
        { id: 'marionettist_crossfire', name: 'Crossfire', ab: 'cross', grants: true,
          text: 'New move on E, in place of Cross-Cut. Crossfire: the Dolls haul their strings taut between them, wherever you stand. With the enemy on that line it is a {d:640} cut and 2 Encore. A Swap just before doubles it, as for Cross-Cut.' },
        { id: 'marionettist_together', name: 'Stand Together', ab: 'swap', text: 'A Swap (or a Red Curtain) made while the enemy stands in the Stage rallies the party: everyone takes 12% less damage and deals 3% more for 6s.' },
      ],
    ],
  },
  thresher: {
    // Dancer, The Long Waltz: long strings, the four-swing finisher
    dancer: [
      [
        { id: 'thresher_encore', name: 'Encore', ab: 'finish', text: 'After a four-swing finisher the next string starts at swing 2.' },
        { id: 'thresher_pirouette', name: 'Pirouette', ab: 'string', text: 'The third swing spins and hits everything all round you, and hits 55% harder.' },
      ],
      [
        { id: 'thresher_danse', name: 'Danse Macabre', ab: 'snap', text: 'A Full Harvest leaves a dancing scythe behind: it swings once more a moment later for {d:150}.' },
        { id: 'thresher_unbroken', name: 'Unbroken Step', ab: 'string', text: 'A Blink adds a swing to the string you hold, and that swing cuts at once for {d:84}.' },
      ],
    ],
    // Phantom, The Vanishing Edge: Blink chains
    phantom: [
      [
        { id: 'thresher_afterimage', name: 'Afterimage', ab: 'finish', text: 'A Blink leaves an afterimage that repeats your next finisher at 50% a moment later.' },
        { id: 'thresher_shade', name: 'Shade Step', ab: 'veil', text: 'A Blink leaves a dark field where you stood for 6s: what stands in it takes 5% more damage from you, and adds that cross it move at half pace.' },
      ],
      [
        { id: 'thresher_flicker', name: 'Flicker', ab: 'veil', text: 'Blinking through a telegraph gives the charge back.' },
        { id: 'thresher_vanishing', name: 'Vanishing Point', ab: 'star', text: 'Void Star opens where you last blinked from, and again at your target, and comes back 8s sooner.' },
      ],
    ],
  },
});

// ----------------------------------------------------------------------- IRONPALM
Object.assign(SPEC_TALENTS, {
  ironpalm: {
    // Still Water, The Unmoving Pond: let the blow come, be where it isn't, answer it
    stillwater: [
      [
        { id: 'ironpalm_ripples', name: 'Ripples', ab: 'read', text: 'A perfect Read on a tankbuster ripples out to the party: everyone takes 20% less damage for 8s. Any other perfect Read ripples out a lighter one: 15% for 4s (at most once every 8s).' },
        { id: 'ironpalm_flood', name: 'Flood Tide', ab: 'palm', text: 'A perfect Read, on any blow, brings the tide in: your next two named moves (within 6s) each wash out a second blow for {d:70}.' },
      ],
      [
        { id: 'ironpalm_calm', name: 'Calm Before the Blow', ab: 'read', text: 'Whenever the boss begins a cast aimed at you, you draw a long breath: your Breath fills to the top, and for 4s your presses cost no Breath.' },
        { id: 'ironpalm_heron', name: 'Heron\'s Stance', ab: 'kick', text: 'Crane Step ends in a reading stance: for 1.2s you take 20% less damage, and a hit that lands in its first 0.4s is read, as if you had pressed Read, and a blow caught that way opens the boss up as a tankbuster does (your next Heavy is a free Thousand Palms).' },
      ],
    ],
    // Avalanche Fist, The Falling Mountain: long strings and the Momentum they build
    avalanche: [
      [
        { id: 'ironpalm_cascade', name: 'Cascade', ab: 'fist', text: 'A named move of four inputs or more brings the rocks down behind it: a rockfall of {d:8} for every point of Momentum.' },
        { id: 'ironpalm_bedrock', name: 'Bedrock', ab: 'palm', text: 'While you hold 6 Momentum or more you take 12% less damage.' },
      ],
      [
        { id: 'ironpalm_wake', name: 'Mountain Wakes', ab: 'kick', text: 'Whenever the boss begins a cast aimed at you, your Momentum leaps to full and holds for 8s, and you take 20% less damage for 5s.' },
        { id: 'ironpalm_scree', name: 'Scree', ab: 'fist', text: 'A named move of four inputs or more throws up rubble for the party: the most hurt member of the party (you too) gets a {s:30} shield, and {s:8} more for every point of Momentum (once every 3s).' },
      ],
    ],
  },
});

// ----------------------------------------------------------------------- OATHBROKER
Object.assign(SPEC_TALENTS, {
  oathbroker: {
    // Guarantor, The Co-Signer: your word is good for two
    guarantor: [
      [
        { id: 'oathbroker_endorse', name: 'Endorsement', ab: 'collect', text: 'While a Co-Sign stands, every Collect strike puts a {s:120} shield on the co-signed ally for 6s (at most once every 2s).' },
        { id: 'oathbroker_roving', name: 'Roving Surety', ab: 'lien', text: 'Co-Sign lasts 3s longer, and no longer stays where you put it: every 3s it moves on to whoever is hurt most. While it stands you take 12% less damage.' },
      ],
      [
        { id: 'oathbroker_foresight', name: 'Foresight', ab: 'lien', text: 'Whenever the boss begins a cast, Co-Sign is ready again at once, and you take 20% less damage for 5s (at most once every 10s).' },
        { id: 'oathbroker_blanket', name: 'Blanket Surety', ab: 'writ', grants: true,
          text: 'Writ of Protection becomes Blanket Surety (60s): stand surety for the whole party. Everyone takes 20% less damage for 8s, you take 30% less and every entry written in that time is halved, and 3% of your HP is written into your Ledger at once, due like any other entry.' },
      ],
    ],
    // Collector, The Debt Comes Due: the bigger the books, the harder the blow
    collector: [
      [
        { id: 'oathbroker_overdraft', name: 'Overdraft', ab: 'collect', text: 'Only the third strike pays your Ledger down, and it pays twice as much: Dun and Levy leave it be. The Ledger is left to grow, and the boss pays 40% of every bill that comes due.' },
        { id: 'oathbroker_compound', name: 'Compound Interest', ab: 'lien', text: 'Lien lasts 8s longer and comes back 15s sooner, and every bill that comes due under it swells the entries still on the books by 10%.' },
      ],
      [
        { id: 'oathbroker_warrant', name: 'Warrant', ab: 'writ', grants: true,
          text: 'Writ of Protection becomes Warrant (60s): serve the boss with a warrant. A blow for {d:250}, and for 10s it takes 8% more damage from the whole party. You take 30% less damage and every entry written in that time is halved.' },
        { id: 'oathbroker_rollover', name: 'Rollover', ab: 'default', text: 'Foreclose no longer tears the Ledger up: it strikes for the full usual, every entry stays on the books at a quarter of its size, your credit never freezes, and Foreclose is back in 60s.' },
      ],
    ],
  },
});

// ----------------------------------------------------------------------- TIDECALLER
SPEC_TALENTS.tidecaller = {
  // Spring Tide, The Flood: huge surges at the crest
  springtide: [
    [
      { id: 'tidecaller_roguewave', name: 'Rogue Wave', ab: 'surge', text: 'A Surge cast while the crest holds is instant.' },
      { id: 'tidecaller_overflow', name: 'Overflow', ab: 'surge', text: 'The water spills over: a Surge cast with the tide above half also leaves its shield, and the shield is {s:120}.' },
    ],
    [
      { id: 'tidecaller_table', name: 'Tide Table', ab: 'current', text: 'The gauge marks when the next crest arrives, and Current on a rising tide carries it straight to the crest.' },
      { id: 'tidecaller_brine', name: 'Brine Lash', ab: 'surge', text: 'Surge also breaks on the boss, from {d:15} at low water up to {d:55} at high water. A Surge at a full crest also leaves the boss Soaked: the party deals 5% more to it for 8s.' },
    ],
  ],
  // Undertow, The Deep Pull: pull the hurt down, give it back slowly
  undertow: [
    [
      { id: 'tidecaller_bell', name: 'Drowned Bell', ab: 'surge', text: 'When your Deep Shield runs its course, a drowned bell tolls: the party heals {h:60} up to {h:120} by the water Undertow spent.' },
      { id: 'tidecaller_grip', name: 'Grip of the Deep', ab: 'riptide', text: 'Riptide Mark pulls from two allies: the most hurt other ally is marked too, heals with it and pops with it. With Maelstrom, a second, smaller whirlpool opens on the most hurt other ally and follows them.' },
    ],
    [
      { id: 'tidecaller_pressure', name: 'Pressure', ab: 'spray', text: 'While your Deep Shield stands, Salt Spray hits 40% harder, seeps {h:60} to the most hurt ally and lifts the tide twice as far.' },
      { id: 'tidecaller_slack', name: 'Slack Water', ab: 'current', text: 'Current pressed while your Deep Shield stands holds its drain: the shield stands 5s longer, topped back up to its full size and {s:150} more, and the party heals {h:80} three times.' },
    ],
  ],
};

// ----------------------------------------------------------------------- LANTERNKEEPER
SPEC_TALENTS.lanternkeeper = {
  // Beacon, The Fixed Star: a few bright fixed lights
  beacon: [
    [
      { id: 'lanternkeeper_keeper', name: 'Lighthouse Keeper', ab: 'set', text: 'A Great Beacon leans toward the most hurt ally in its glow: its pulse heals them 60% more.' },
      { id: 'lanternkeeper_signal', name: 'Signal Fire', ab: 'set', text: 'While two Great Beacons are lit, a line of light joins them: anyone within 90 paces of it, outside both glows, heals a full pulse every second and takes 10% less damage.' },
    ],
    [
      { id: 'lanternkeeper_hearth', name: 'Hearth', ab: 'set', text: 'An ally who stays in a Great Beacon\'s glow for 6s heals {h:180}, and again for every 6s more they stay.' },
      { id: 'lanternkeeper_pillar', name: 'Pillar of Flame', ab: 'set', text: 'A Great Beacon, as you raise it, sends up a pillar of light: everyone in its glow heals {h:120} and is wrapped in a {s:120} shield.' },
    ],
  ],
  // Wayfarer, The Road Lamp: lights that follow you
  wayfarer: [
    [
      { id: 'lanternkeeper_pathfinder', name: 'Pathfinder', ab: 'carry', text: 'Trailblaze drops two small lights along its way, and they heal double.' },
      { id: 'lanternkeeper_breadcrumbs', name: 'Breadcrumbs', ab: 'set', text: 'Your newest small light is the lead light: Flare bursts it a second time, at full strength.' },
    ],
    [
      { id: 'lanternkeeper_pilgrim', name: 'Pilgrim\'s Pace', ab: 'flare', text: 'Keep moving for 3s without stopping and your next Flare heals 50% more.' },
      { id: 'lanternkeeper_sparks', name: 'Trailing Sparks', ab: 'set', text: 'Walk back through a small light of yours and it flares to full and stings the boss for {d:60} while everyone in it heals {h:80} (once per light).' },
    ],
  ],
};

// ----------------------------------------------------------------------- KENSEIER (tank, class 22)
TALENTS.kenseier = [
  [
    { id: 'kenseier_riposte', name: 'Riposte', ab: 'deflect', text: 'A Perfect deflect makes your next Ember Cut skip to the third step (at most once every 4s).' },
    { id: 'kenseier_emberedge', name: 'Ember Edge', ab: 'cut', text: 'The third cut sets a burn on the boss that adds 2 Posture a second for 6s, and burns it for {d:5} a second.' },
    { id: 'kenseier_feint', name: 'Feint', ab: 'deathblow', text: 'Right after a Good deflect, Pommel can be pressed at once, off the global cooldown, to turn that deflect into a Perfect: the Posture you missed comes with it, and everything a Perfect sets off. It needs the Pommel ready (8s cooldown).',
      spec: { warden: 'Right after a Good deflect, Redirect can be pressed at once, off the global cooldown, to turn that deflect into a Perfect: the Posture you missed comes with it, and everything a Perfect sets off. It needs Redirect ready (8s cooldown).' } },
  ],
  [
    { id: 'kenseier_ironbreath', name: 'Iron Breath', ab: 'deflect', text: 'Poise refills twice as fast while you are not being hit, and while your Poise is full your Ember Cut hits 15% harder.' },
    { id: 'kenseier_longstep', name: 'Long Step', ab: 'mikiri', text: 'Mikiri Step carries you twice as far, and a blow it lets through adds 15 more Posture (40 in all). Mikiri Step (or Whirlwind Slash, whose spin reaches twice as far) comes back in 8s.' },
    { id: 'kenseier_secondwind', name: 'Second Wind', ab: 'mantle', cd: { mantle: -20 }, text: 'Ash Mantle has a 40s cooldown, and each Perfect deflect made inside it takes 3s off.' },
  ],
  [
    { id: 'kenseier_crack', name: 'Crack', ab: 'deathblow', text: 'A Break leaves the boss\'s Posture bar starting at 60 afterward, instead of empty.' },
    { id: 'kenseier_shatter', name: 'Shatter', ab: 'deflect', text: 'A Perfect deflect on a tankbuster Breaks the boss at once if its Posture is over a third. A Perfect made with Feint counts.' },
    { id: 'kenseier_whirlwind', name: 'Whirlwind Slash', ab: 'mikiri', grants: true, text: 'New move on E, in place of Mikiri Step. Whirlwind Slash (12s): a spin that cuts every enemy in reach for {d:80} and adds 6 Posture for each one it hits, so adds count. For fights with adds.' },
  ],
  [
    { id: 'kenseier_fireside', name: 'Fireside Guard', ab: 'guard', text: 'Guard Stance lasts 10s (6s), comes back in 60s (90s), and shields two allies instead of one, for {s:220} each. Ember Duel in its place comes back in 60s too, and guards two allies the same way for its 10s.', spec: { deathblade: 'Iai Stance\'s counter-cut also shields every ally for {s:200}. Ember Duel in its place comes back in 60s, and the first Perfect deflect inside it does the same.' } },
    { id: 'kenseier_unbroken', name: 'Unbroken', ab: 'mantle', text: 'Ash Mantle lasts 14s (8s), and while it is up a deflect that catches nothing costs no Poise.' },
    { id: 'kenseier_blazing', name: 'Blazing Mantle', ab: 'mantle', text: 'Ash Mantle ends in a burst of ember: {d:250} for every Perfect deflect you made inside it.' },
  ],
  [
    { id: 'kenseier_grand', name: 'Grand Deathblow', ab: 'deathblow', text: 'A Deathblow in the last 2s of a Break hits 35% harder and heals you 20% more, and the party keeps the Break\'s 15% bonus for 2s after it ends.' },
    { id: 'kenseier_duel', name: 'Ember Duel', ab: 'guard', grants: true, text: 'New move on F, in place of Guard Stance. Ember Duel (90s): the clash that opens it adds 40 Posture to the boss. For 10s its autos then come at a steady beat, every 2s exactly, each a quarter lighter, and every Perfect deflect adds double Posture.',
        spec: { deathblade: 'New move on F, in place of Iai Stance. Ember Duel (90s): the clash that opens it adds 40 Posture to the boss. For 10s its autos then come at a steady beat, every 2s exactly, each a quarter lighter, and every Perfect deflect adds double Posture.' } },
    { id: 'kenseier_lastspark', name: 'Last Spark', ab: 'deathblow', text: 'When you Break the boss yourself, Flash of Ash charges by a quarter (not on the Break Flash of Ash makes).' },
  ],
];

// ----------------------------------------------------------------------- HOUNDMASTER (melee damage, class 23): rows I-V
// New behaviour, one plain number (Thick Coat). Rows III and V grant a move (Howl on W, The Long Chase on F: TALENT_ABILITIES in
// kits.js). The talents act on the hounds and the pair they hold (kits.js hd* helpers).
TALENTS.houndmaster = [
  [
    { id: 'houndmaster_heelnip', name: 'Heel Nip', ab: 'knife', text: 'The third knife hit also sends whichever hound is nearer to the place that would make a pair with the other one, and it bites at once for twice as much. If they already hold a pair, both hounds bite again instead. Nothing happens if they are on guard.',
      spec: { lonewolf: 'The third knife hit also calls Greyfang to the place that makes a pair with where you stand, and it bites at once for twice as much. If you already make a pair, Greyfang bites again instead. Nothing happens if Greyfang is on guard.' } },
    { id: 'houndmaster_scentline', name: 'Scent Line', ab: 'flank', text: 'Whistle: Flank sends the hound straight through the boss, and it bites on the way for {d:120} (at most once every 2.5s).',
      spec: { lonewolf: 'Ride Down sends Greyfang straight through the boss as you leap, and it bites on the way for {d:300} and gives 10 Bond.' } },
    { id: 'houndmaster_echobark', name: 'Echo Bark', ab: 'finisher', text: 'A finisher echoes a moment later at 25% of its strength, 50% when it is a different pair from the one before.' },
  ],
  [
    { id: 'houndmaster_guarddog', name: 'Guard Dog', ab: 'calloff', text: 'Call Off also sets a hound between you and the next hit: a {s:250} shield on you for 8s, and a {s:150} shield on every ally (once per Call Off), and the pack is back at work in 3s.' },
    { id: 'houndmaster_fetch', name: 'Fetch', ab: 'calloff', text: 'Call Off also drags you 150 toward the nearest hound as it sets off to you, and each hound bites once, hard, as it sets off. It never takes you into the boss.' },
    { id: 'houndmaster_thickcoat', name: 'Thick Coat', ab: 'calloff', text: 'Once every 20s a hit that would down a hound leaves it on one health. A hound that does go down is back on its feet after 4s instead of 10s, and its first bite on rising hits three times as hard.' },
  ],
  [
    { id: 'houndmaster_sharedkill', name: 'Shared Kill', ab: 'finisher', text: 'A finisher gives back 6 Bond, and 20 Bond when the boss is below 30% health.' },
    { id: 'houndmaster_howl', name: 'Howl', ab: 'flank', grants: true, text: 'New move on W, in place of Whistle: Flank. Howl (20s): both hounds throw back their heads. The whole party deals 8% more damage for 8s, and both hounds hold where they stand (a second press of the Hold button pounces).',
      spec: { lonewolf: 'Mount stays. When the ride ends, Greyfang throws back its head in a howl: the whole party deals 5% more damage for 8s.' } },
    { id: 'houndmaster_runningbond', name: 'Running Bond', ab: 'finisher', text: 'Bond fills while a hound runs to a new place: 5 a second for each one that is on the move.' },
  ],
  [
    { id: 'houndmaster_bloodscent', name: 'Blood Scent', ab: 'quarry', text: 'Mark the Quarry lasts 5s longer, and spreads to the nearest add: while it lasts, every bite also bites it.' },
    { id: 'houndmaster_drive', name: 'Drive', ab: 'quarry', text: 'Mark the Quarry also makes both hounds hold their places for as long as the Mark lasts when they stand in a pair, and held, their bites hit two and a half times as hard.' },
    { id: 'houndmaster_cornered', name: 'Cornered', ab: 'quarry', text: 'When the Mark ends, both hounds pounce at once and land behind the boss, three times as hard, and the pounce gives 50 Bond.' },
  ],
  [
    { id: 'houndmaster_kingofpack', name: 'King of the Pack', ab: 'finisher', text: 'The spectral hounds of Wild Hunt stay for 10s after it ends, and the free finisher stays with them.' },
    { id: 'houndmaster_longchase', name: 'The Long Chase', ab: 'quarry', grants: true, text: 'New move on F, in place of Mark the Quarry. The Long Chase (45s): the pack runs a lap round the boss. Each quarter it passes bites for {d:300} and gives 4 Bond, and the lap ends with the boss taking 5% more damage for 10s and both hounds behind it: a Bring Down.',
      spec: { lonewolf: 'New move on F, in place of Mark the Quarry. The Long Chase (45s): Greyfang runs a lap round the boss. Each quarter it passes bites for {d:450} and gives 6 Bond, and the lap ends with the boss taking 5% more damage for 10s and Greyfang behind it.' } },
    { id: 'houndmaster_alpha', name: 'Alpha', ab: 'finisher', text: 'A Bring Down is a sure critical hit that hits 25% harder, and gives 15 Bond, when it follows a pounce that formed the pair (within 10s), or when both hounds have their own Bond full.' },
  ],
];

// ----------------------------------------------------------------------- KENSEIER
SPEC_TALENTS.kenseier = {
  // Deathblade, The Kill Stroke: all in on the parry and the Deathblow
  deathblade: [
    [
      { id: 'kenseier_cleave', name: 'Cleaving Death', ab: 'deathblow', text: 'Deathblow, and the third Ember Cut, also cut every add near the boss for their full strength.' },
      { id: 'kenseier_patient', name: 'Patient Edge', ab: 'deathblow', text: 'A Break you did not spend a Deathblow on within 2s gives the party +10% damage for what is left of it, and the Deathblow you land at its end hits 30% harder.' },
    ],
    [
      { id: 'kenseier_crane', name: 'Crane Form', ab: 'guard', text: 'Iai Stance\'s counter-cut adds 70 Posture, and brings Iai Stance back 40s sooner. With Ember Duel in its place, the first Perfect deflect inside the Duel adds 35 Posture and brings the Duel back 40s sooner.' },
      { id: 'kenseier_double', name: 'Double Stroke', ab: 'deathblow', text: 'Deathblow strikes twice: a second, smaller stroke ({d:170}) follows a moment later.' },
    ],
  ],
  // Warden of the Ash, The Turning Blade: turn the blow from your allies, or back on the boss
  warden: [
    [
      { id: 'kenseier_longguard', name: 'Long Guard', ab: 'deflect', text: 'Deflect reaches an ally within 180 of you instead of 120, and stepping in front of an ally costs half the Poise.' },
      { id: 'kenseier_emberreturn', name: 'Ember Return', ab: 'deathblow', text: 'Redirect also heals you and your most hurt ally, each for one and a half times what it deals.' },
    ],
    [
      { id: 'kenseier_sharedpoise', name: 'Shared Poise', ab: 'deflect', text: 'A Perfect deflect for an ally gives them a {s:100} shield for 5s, and makes Redirect ready for the blow you turned.' },
      { id: 'kenseier_turnedtide', name: 'Turned Tide', ab: 'deathblow', text: 'A blow you turn back with Redirect adds 20 Posture to the boss, or 60 for a tankbuster.' },
    ],
  ],
};

// ----------------------------------------------------------------------- HOUNDMASTER
SPEC_TALENTS.houndmaster = {
  // Pack Leader, The Two-Dog Hunt: both hounds, coordinated pounces
  packleader: [
    [
      { id: 'houndmaster_pincerdrill', name: 'Pincer Drill', ab: 'finisher', text: 'A Rend sets its bleed on the nearest add as well, if the fight has one; with none near, the bleed digs in twice as deep and lasts 2s longer. In Wild Hunt every finisher does.' },
      { id: 'houndmaster_tagteam', name: 'Tag Team', ab: 'calloff', text: 'After a Call Off, your next finisher (within 20s) counts every pair: its own blow, with Rend\'s bleed and Hamstring\'s weakness as well, and it costs 15 less Bond.' },
    ],
    [
      { id: 'houndmaster_huntinghorn', name: 'Hunting Horn', ab: 'pounce', text: 'A pounce that has landed sounds the horn: for a beat the boss turns its face toward you (it keeps its target), the hounds keep their sides through the swing, and the boss takes 7% more damage for 10s.' },
      { id: 'houndmaster_littermates', name: 'Littermates', ab: 'knife', text: 'When one hound bites, the other bites too one time in four.' },
    ],
  ],
  // Lone Wolf, The Rider: one great hound you ride in for big bursts
  lonewolf: [
    [
      { id: 'houndmaster_saddleborn', name: 'Saddle Born', ab: 'flank', text: 'Mount lasts 2s longer, and the charges and Ride Down hit 25% harder.' },
      { id: 'houndmaster_leapoff', name: 'Leap Off', ab: 'flank', text: 'Ride Down lands where you aim, up to 220 from where you were, nothing can touch you for 0.8s as you leap, and it hits 75% harder.' },
    ],
    [
      { id: 'houndmaster_oldscars', name: 'Old Scars', ab: 'calloff', text: 'Greyfang takes 30% less damage from every telegraph. A hit it stands through gives 20 Bond, and its bites hit 50% harder for 6s.' },
      { id: 'houndmaster_fangknife', name: 'Fang and Knife', ab: 'knife', text: 'A knife hit makes the bite that follows it, if it comes within a moment, hit twice as hard. The third hit\'s bite always does.' },
    ],
  ],
};

// id -> { cls, row, col, t, spec? } (spec rows: row 5 or 6, and the spec they belong to)
const TALENT_BY_ID = {};
for (const [cls, rows] of Object.entries(TALENTS)) rows.forEach((row, r) => row.forEach((t, c) => { TALENT_BY_ID[t.id] = { cls, row: r, col: c, t }; }));
for (const [cls, specs] of Object.entries(SPEC_TALENTS)) for (const [spec, rows] of Object.entries(specs))
  rows.forEach((row, r) => row.forEach((t, c) => { TALENT_BY_ID[t.id] = { cls, row: BASE_ROWS + r, col: c, t, spec }; }));
// a spec's two rows (or null: no spec, or that class has none yet)
const specTalentRows = (cls, spec) => (spec && SPEC_TALENTS[cls] && SPEC_TALENTS[cls][spec]) || null;

// the talent ids a hero holds, from its saved state { rows, picks, spec?, specPicks? } (picks beyond the unlocked rows don't count)
function talentSet(cls, state) {
  const out = new Set(), rows = TALENTS[cls];
  if (!rows || !state) return out;
  for (let r = 0; r < Math.min(rows.length, state.rows | 0); r++) {
    const c = state.picks && state.picks[r];
    if (c != null && rows[r][c]) out.add(rows[r][c].id);
  }
  // the spec rows: state.spec (the active spec) and state.specPicks (its column in VI and VII), from Save.talents
  const sr = specTalentRows(cls, state.spec);
  if (sr) sr.forEach((row, i) => {
    const c = state.specPicks && state.specPicks[i];
    if ((state.rows | 0) > BASE_ROWS + i && c != null && row[c]) out.add(row[c].id);
  });
  return out;
}
// a talent's text for a spec (or the hero's own text)
const talentText = (t, specId) => (specId && t.spec && t.spec[specId]) || t.text;

if (typeof module !== 'undefined') module.exports = { TALENTS, TALENT_COSTS, TALENT_BY_ID, SPEC_TALENTS, BASE_ROWS, specTalentRows, talentSet, talentText };
