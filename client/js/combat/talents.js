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
// differently. A single talent stays under +7% pro DPS and a full build under +18% (tools/talents.js, tools/check.js).
//
// A talent: { id, name, ab (the base ability it changes: its tooltip shows the talent), text, spec?: { specId: text },
//   cd?: { baseAbilityId: seconds } (cooldown change), cast?: { baseAbilityId: seconds } (cast time change),
//   specMods?: { specId: { cd?, cast? } } (a spec's own numbers for those), grants?: true (the kit's
//   talentAbilities[id] takes the slot of `ab`, engine.js) }.
// The kits check k.talent(id) (engine.js); cd / cast changes are applied by the engine from this data.
// Client-side only: nothing here touches HP or Defense, so the host never needs to know.
// Saves keep the id of each pick (save.js): a pick whose id leaves its row is cleared, the row stays bought.

const TALENT_COSTS = [60, 120, 200, 300, 400];

const TALENTS = {
  // ======================================================================= TANKS
  bastion: [
    [
      { id: 'bastion_rhythm', name: 'Shield Rhythm', ab: 'blade', text: 'A Blade Chain hit that carries a Perfect Block counter now skips the chain ahead: your next press is Judgment.' },
      { id: 'bastion_returning', name: 'Returning Edge', ab: 'edge', text: 'Holy Edge now comes back to your hand: a moment later it cuts the boss again on the way home, for a tenth of the damage.',
        spec: { sentinel: 'Shield Bash now sends a shockwave rolling on: a moment later it strikes the boss again, for a tenth of the damage.' } },
      { id: 'bastion_read', name: 'Read the Swing', ab: 'blade', text: 'Whenever the boss begins a cast, your next Blade Chain hit counters it (+150), as after a Perfect Block.' },
    ],
    [
      { id: 'bastion_holdfast', name: 'Hold Fast', ab: 'brace', text: 'A Brace raised while the boss is casting now holds until the cast lands (up to 6s) instead of 3s.' },
      { id: 'bastion_mercy', name: 'Shared Mercy', ab: 'edge', text: 'While you are above 70% HP, Holy Edge\'s heal goes to the most hurt ally instead of you, twice as strong.',
        spec: { sentinel: 'While you are above 70% HP, Shield Bash\'s heal goes to the most hurt ally instead of you, twice as strong.' } },
      { id: 'bastion_laststand', name: 'Last Stand', ab: 'bulwark', text: 'Bulwark now raises itself the moment you drop below 30% HP, if it is ready.',
        spec: { crusader: 'Zealous Guard now raises itself the moment you drop below 30% HP, if it is ready.' } },
    ],
    [
      { id: 'bastion_hallowed', name: 'Hallowed Ground', ab: 'banner', grants: true,
        text: 'Rally Banner becomes Hallowed Ground (30s): pour out all your Resolve (at least 30) to consecrate the ground under you for 10s. The boss burns every 2s, harder the more you poured, and a Perfect Block inside gives 10 more Resolve.' },
      { id: 'bastion_steady', name: 'Steady Hands', ab: 'edge', text: 'For 6s after a Perfect Block, Holy Edge costs 35 Resolve instead of 50.',
        spec: { sentinel: 'For 6s after a Perfect Block, Shield Bash costs 35 Resolve instead of 50.' } },
      { id: 'bastion_overflow', name: 'Overflowing Faith', ab: 'brace', text: 'Resolve that would spill past 100 now hardens into a shield on you for 8s.' },
    ],
    [
      { id: 'bastion_unbreakable', name: 'Unbreakable', ab: 'bulwark', text: 'While Bulwark lasts, every Perfect Block gives its Brace charge straight back.',
        spec: { crusader: 'While Zealous Guard lasts, every Perfect Block gives its Brace charge straight back.' } },
      { id: 'bastion_shelter', name: 'Shelter', ab: 'bulwark', text: 'Bulwark now covers the party too: for its first 4s everyone takes 10% less damage.',
        spec: { crusader: 'Zealous Guard now covers the party too: for its first 4s everyone takes 10% less damage.' } },
      { id: 'bastion_ironwill', name: 'Iron Will', ab: 'brace', cd: { brace: -1.5 }, text: 'Brace recharges 1.5s faster.' },
    ],
    [
      { id: 'bastion_avatar', name: 'Avatar of Dawn', ab: 'oath', grants: true,
        text: 'Oath of Valor becomes Avatar of Dawn (60s): wings of light for 15s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss.',
        spec: { crusader: 'Oath of Valor becomes Avatar of Dawn (60s): wings of light for 20s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss.' } },
      { id: 'bastion_sunlit', name: 'Sunlit Shield', ab: 'brace', text: 'A Perfect Block now also throws a flash of light into the boss.' },
      { id: 'bastion_echo', name: 'Edge of Judgment', ab: 'blade', text: 'Judgment now also hurls a shard of Holy Edge at the boss, and it heals you a little.' },
    ],
  ],

  bloodreaver: [
    [
      { id: 'bloodreaver_gore', name: 'Gore', ab: 'hack', text: 'Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow that gives 15 Blood.',
        spec: { berserker: 'Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow that gives 15 Rage.' } },
      { id: 'bloodreaver_rend', name: 'Rend', ab: 'hack', text: 'Maul now carves a Wound in the boss (up to 3). Crimson Drain tears every Wound open for extra damage.',
        spec: { berserker: 'Maul now carves a Wound in the boss (up to 3). Rampage tears every Wound open for extra damage.' } },
      { id: 'bloodreaver_retaliate', name: 'Retaliation', ab: 'letting', text: 'Bloodletting within 2s of a heavy hit on you (a tenth of your HP or more) cuts twice as deep.',
        spec: { hemomancer: 'Blood Lance within 2s of a heavy hit on you (a tenth of your HP or more) strikes twice as hard.' } },
    ],
    [
      { id: 'bloodreaver_sanguine', name: 'Sanguine Shield', ab: 'drain', text: 'Crimson Drain\'s healing past your full HP now hardens into a shield (up to 15% of your HP).',
        spec: { berserker: 'Rampage\'s healing past your full HP now hardens into a shield (up to 15% of your HP).' } },
      { id: 'bloodreaver_desperate', name: 'Desperate Hunger', ab: 'hack', text: 'While you are below 35% HP, each hit of Hack & Maul heals you for 4% of your HP.' },
      { id: 'bloodreaver_cauterize', name: 'Cauterize', ab: 'letting', text: 'Bloodletting now sears away Vulnerability: if you carry it, the cut washes it off you (once every 30s).',
        spec: { hemomancer: 'Blood Lance now sears away Vulnerability: if you carry it, the throw washes it off you (once every 30s).' } },
    ],
    [
      { id: 'bloodreaver_scab', name: 'Scab', ab: 'warcry', grants: true,
        text: 'War Cry becomes Scab (20s): spend 30 Blood to grow a scab over your wounds, a shield worth the damage you took in the last 6s (at least a tenth of your HP) for 8s. Whatever is left of it when it falls off comes back as Blood.',
        spec: { berserker: 'War Cry becomes Scab (20s): spend 30 Rage to grow a scab over your wounds, a shield worth the damage you took in the last 6s (at least a tenth of your HP) for 8s. Whatever is left of it when it falls off comes back as Rage.' } },
      { id: 'bloodreaver_second', name: 'Second Helping', ab: 'drain', text: 'A Crimson Drain that heals you for more than 15% of your HP gives back 20 Blood.',
        spec: { berserker: 'A Rampage that heals you for more than 10% of your HP gives back 20 Rage.' } },
      { id: 'bloodreaver_boil', name: 'Boiling Blood', ab: 'frenzy', text: 'Blood that would spill past 100 is no longer lost: every 10 of it takes 1s off Frenzy\'s cooldown, or adds 1s to Frenzy while it lasts.',
        spec: { berserker: 'Rage that would spill past 100 is no longer lost: every 10 of it takes 1s off Frenzy\'s cooldown, or adds 1s to Frenzy while it lasts.' } },
    ],
    [
      { id: 'bloodreaver_frenzied', name: 'Frenzied Letting', ab: 'frenzy', text: 'Frenzy now also opens your veins: it refills Bloodletting\'s charges.',
        spec: { hemomancer: 'Frenzy now also opens your veins: it refills Blood Lance\'s charges.' } },
      { id: 'bloodreaver_quickvein', name: 'Quickened Vein', ab: 'letting', cd: { letting: -3 }, text: 'Bloodletting recharges 3s faster.', spec: { hemomancer: 'Blood Lance recharges 3s faster.' } },
      { id: 'bloodreaver_tide', name: 'Crimson Tide', ab: 'drain', text: 'Crimson Drain\'s healing now also flows to the whole party, at a fifth of the strength.',
        spec: { berserker: 'Rampage\'s healing now also flows to the whole party, at a fifth of the strength.', hemomancer: 'Shared Vein now flows to the party at 40% of the strength instead of 25%.' } },
    ],
    [
      { id: 'bloodreaver_moon', name: 'Blood Moon', ab: 'undying', grants: true,
        text: 'Undying becomes Blood Moon (120s): for 10s you cannot drop below 1 HP and your heals on yourself are doubled. When it sets you burst in a tide of blood: the boss takes damage for every hit you took under it, and you heal for a quarter of that.' },
      { id: 'bloodreaver_hemorrhage', name: 'Hemorrhage', ab: 'drain', text: 'Crimson Drain now opens a Hemorrhage on the boss for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP.',
        spec: { berserker: 'Rampage now opens a Hemorrhage on the boss for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP.' } },
      { id: 'bloodreaver_bloodlust', name: 'Bloodlust', ab: 'frenzy', text: 'When Frenzy ends you finish with a free Crimson Drain that remembers every hit you took while it lasted.',
        spec: { berserker: 'When Frenzy ends you finish with a free Rampage that remembers every hit you took while it lasted.' } },
    ],
  ],

  runeguard: [
    [
      { id: 'runeguard_overflow', name: 'Overflow', ab: 'strike', text: 'A Rune that would overcap bursts into the boss instead.' },
      { id: 'runeguard_echo', name: 'Glyph Echo', ab: 'glyph', text: 'Glyph Burst now leaves its glyph hanging on the boss: the next time you raise a Runic Ward, it goes off again for a quarter.',
        spec: { runeblade: 'Rune Cleave now leaves its rune hanging on the boss: the next time you raise a Runic Ward, it goes off again for a quarter.' } },
      { id: 'runeguard_answer', name: 'Answering Rune', ab: 'strike', text: 'After a Ward of yours breaks or Mirror Aegis reflects, your next Rune Strike gives an extra Rune.',
        spec: { runeblade: 'After a Ward of yours breaks or Mirror Aegis reflects, your next Rune Blade hit gives an extra Rune.' } },
    ],
    [
      { id: 'runeguard_leap', name: 'Leaping Ward', ab: 'ward', text: 'A Runic Ward that ends with strength left now leaps: what is left of it jumps to the most hurt ally for 6s.' },
      { id: 'runeguard_patient', name: 'Patient Mirror', ab: 'mirror', text: 'Mirror Aegis raised while the boss is casting now waits for that cast to land (up to 8s) instead of 3s.' },
      { id: 'runeguard_emergency', name: 'Emergency Ward', ab: 'ward', text: 'Below 35% HP, Runic Ward costs no Rune (once every 30s).' },
    ],
    [
      { id: 'runeguard_whirl', name: 'Whirling Runes', ab: 'sanctum', grants: true,
        text: 'Sanctum becomes Whirling Runes (30s): every Rune you hold tears loose and spins around you as a blade for 12s, striking the boss every 2s.' },
      { id: 'runeguard_reclaim', name: 'Reclaim', ab: 'ward', text: 'A Ward that absorbed at least half gives its Rune back.', spec: { spellwarden: 'A Ward gives its Rune back once it has absorbed a third.' } },
      { id: 'runeguard_glyphguard', name: 'Glyphguard', ab: 'glyph', text: 'Glyph Burst now also raises a small Ward on you if you have none (once every 20s). It explodes like a Ward, a little smaller.',
        spec: { runeblade: 'Rune Cleave now also raises a small Ward on you if you have none (once every 20s). It explodes like a Ward, a little smaller.' } },
    ],
    [
      { id: 'runeguard_shards', name: 'Mirror Shards', ab: 'mirror', text: 'A reflected hit now shatters the mirror into shards that strike the boss three more times.' },
      { id: 'runeguard_shatter', name: 'Shatter', ab: 'ward', text: 'Raising a Runic Ward while yours is still up now shatters the old one: it blasts as if it had been broken all the way (but gives no Rune back).' },
      { id: 'runeguard_polished', name: 'Polished Mirror', ab: 'mirror', cd: { mirror: -30 }, text: 'Mirror Aegis recharges 30s faster.' },
    ],
    [
      { id: 'runeguard_living', name: 'Living Rune', ab: 'overload', grants: true,
        text: 'Runic Overload becomes Living Rune (60s): a great rune rises behind you for 15s. Everything Runic Overload does, and every Rune you spend makes it fire a bolt at the boss.' },
      { id: 'runeguard_nova', name: 'Ward Nova', ab: 'ward', text: 'A Runic Ward broken all the way now erupts in a nova: it strikes the boss and heals the whole party for a fifth of the Ward.',
        spec: { spellwarden: 'A Runic Ward that absorbed at least half now erupts in a nova when it ends: it strikes the boss and heals the whole party for a fifth of the Ward.' } },
      { id: 'runeguard_binding', name: 'Sigil of Binding', ab: 'glyph', text: 'Glyph Burst now carves a binding sigil under the boss for 8s (once every 20s): your next Rune Strike while it burns gives an extra Rune.',
        spec: { runeblade: 'Rune Cleave now carves a binding sigil under the boss for 8s (once every 20s): your next Rune Blade hit while it burns gives an extra Rune.' } },
    ],
  ],

  // ======================================================================= DPS
  ranger: [
    [
      { id: 'ranger_rhythm', name: 'Fletcher\'s Rhythm', ab: 'quick', text: 'Every fourth Quick Shot looses a second arrow for half damage.' },
      { id: 'ranger_ricochet', name: 'Ricochet', ab: 'pierce', text: 'A Piercing Arrow that crits ricochets back into your quiver: it gives its charge back.',
        spec: { sharpshooter: 'An Aimed Shot that crits ricochets back into your quiver: it gives its charge back.', venomstrike: 'A Caustic Arrow that crits ricochets back into your quiver: it gives its charge back.' } },
      { id: 'ranger_steady', name: 'Steady Breath', ab: 'quick', text: 'A Quick Shot loosed after standing still for 2s lights Keen Eye far more often (60%).' },
    ],
    [
      { id: 'ranger_disengage', name: 'Disengage', ab: 'cloak', text: 'Hunter\'s Cloak now also leaps you backwards, clear of whatever is at your feet.' },
      { id: 'ranger_secondwind', name: 'Second Wind', ab: 'quick', text: 'When you drop below 40% HP, your next Quick Shot also heals you for 15% of your HP (once every 45s).' },
      { id: 'ranger_lightfoot', name: 'Light Feet', ab: 'pierce', text: 'Each Piercing Arrow takes 3s off Hunter\'s Cloak\'s cooldown.',
        spec: { sharpshooter: 'Each Aimed Shot takes 3s off Hunter\'s Cloak\'s cooldown.', venomstrike: 'Each Caustic Arrow takes 3s off Hunter\'s Cloak\'s cooldown.' } },
    ],
    [
      { id: 'ranger_explosive', name: 'Explosive Shot', ab: 'rapid', grants: true,
        text: 'Rapid Fire becomes Explosive Shot: spend 50 Focus to plant a charge in the boss that blows 2.5s later. Every Quick Shot or Piercing Arrow that lands before then makes the blast 30% bigger.' },
      { id: 'ranger_focusfire', name: 'Focus Fire', ab: 'quick', text: 'At full Focus, Quick Shot no longer wastes it: instead of giving Focus it hits twice as hard.' },
      { id: 'ranger_tracking', name: 'Tracking', ab: 'quick', text: 'Each Quick Shot that doesn\'t light Keen Eye gives 2 more Focus than the one before (up to 10 more). Keen Eye starts the count over.' },
    ],
    [
      { id: 'ranger_longhunt', name: 'Long Hunt', ab: 'mark', text: 'Hunter\'s Mark lasts 3s longer.' },
      { id: 'ranger_pin', name: 'Pinning Shot', ab: 'pierce', text: 'A Keen Eye Piercing Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s).',
        spec: { sharpshooter: 'A Keen Eye Aimed Shot now pins the boss: your next Quick Shot is a critical hit (once every 12s).', venomstrike: 'A Keen Eye Caustic Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s).' } },
      { id: 'ranger_deathmark', name: 'Marked for Death', ab: 'mark', text: 'When Hunter\'s Mark ends, the mark bursts on the boss, harder for every Keen Eye you lit while it lasted.' },
    ],
    [
      { id: 'ranger_falcon', name: 'Falcon', ab: 'barrage', grants: true,
        text: 'Barrage becomes Falcon (30s): your falcon dives onto the boss and harries it for 10s, striking every 2s. Every Keen Eye you light while it hunts sends it into a diving strike at once.' },
      { id: 'ranger_storm', name: 'Storm Arrow', ab: 'pierce', text: 'A Keen Eye Piercing Arrow now calls down lightning: it arcs into the boss twice more, each strike a tenth as strong.',
        spec: { sharpshooter: 'A Keen Eye Aimed Shot now calls down lightning: it arcs into the boss twice more, each strike a tenth as strong.', venomstrike: 'A Keen Eye Caustic Arrow now calls down lightning: it arcs into the boss twice more, each strike a tenth as strong.' } },
      { id: 'ranger_volley', name: 'Wild Volley', ab: 'quick', text: 'Every Quick Shot crit now calls a volley of arrows down on the boss.' },
    ],
  ],

  shadowblade: [
    [
      { id: 'shadowblade_feint', name: 'Feint', ab: 'strike', text: 'A Strike from the front is no longer wasted: it sets up a feint, and your next Eviscerate lands as a hit from the side wherever you stand.',
        spec: { nightstalker: 'A Strike from the front is no longer wasted: it sets up a feint, and your next Backstab lands as a hit from behind wherever you stand.' } },
      { id: 'shadowblade_opportunist', name: 'Opportunist', ab: 'evis', text: 'An Eviscerate while the boss is casting is always a critical hit.',
        spec: { nightstalker: 'A Backstab while the boss is casting is always a critical hit.' } },
      { id: 'shadowblade_ambush', name: 'Ambush', ab: 'step', text: 'Shadowstep now strikes as you arrive: a stab from behind for a combo point.',
        spec: { bladedancer: 'Blade Fury\'s spin now gives 2 combo points instead of 1.' } },
    ],
    [
      { id: 'shadowblade_dodge', name: 'Shadow Dodge', ab: 'step', text: 'A Shadowstep while the boss is casting also slips the blow: you take 50% less damage for 2s.',
        spec: { bladedancer: 'A Blade Fury while the boss is casting also slips the blow: you take 50% less damage for 2s.' } },
      { id: 'shadowblade_recuperate', name: 'Recuperate', ab: 'evis', text: 'While you are below 60% HP, Eviscerate heals you for 3% of your HP per combo point.',
        spec: { nightstalker: 'While you are below 60% HP, Backstab heals you for 3% of your HP per combo point.' } },
      { id: 'shadowblade_trail', name: 'Smoke Trail', ab: 'step', text: 'Shadowstep leaves a cloud of smoke where you vanished: allies inside take 10% less damage for 6s.',
        spec: { bladedancer: 'Blade Fury kicks up a cloud of smoke around you: allies inside take 10% less damage for 6s.' } },
    ],
    [
      { id: 'shadowblade_rupture', name: 'Rupture', ab: 'venom', grants: true,
        text: 'Venom Blade becomes Rupture: a finisher that spends all your combo points to open the boss up for 4s per point. While it bleeds, Eviscerate hits 15% harder, as with your poison.',
        spec: { nightstalker: 'Venom Blade becomes Rupture: a finisher that spends all your combo points to open the boss up for 4s per point. While it bleeds, Backstab hits 15% harder, as with your poison.' } },
      { id: 'shadowblade_relentless', name: 'Relentless', ab: 'evis', text: 'A 5-point Eviscerate has an even chance to give back 1 combo point.', spec: { nightstalker: 'A 5-point Backstab has an even chance to give back 1 combo point.' } },
      { id: 'shadowblade_sharpen', name: 'Sharpened Shadows', ab: 'strike', text: 'A combo point that would spill past 5 now sharpens your next Eviscerate instead: 12% harder for each (up to 3).',
        spec: { nightstalker: 'A combo point that would spill past 5 now sharpens your next Backstab instead: 12% harder for each (up to 3).' } },
    ],
    [
      { id: 'shadowblade_clone', name: 'Shadow Clone', ab: 'dance', text: 'Shadow Dance now calls a shadow that repeats your Eviscerates at 30%.', spec: { nightstalker: 'Shadow Dance now calls a shadow that repeats your Backstabs at 30%.' } },
      { id: 'shadowblade_sprint', name: 'Shadow Sprint', ab: 'step', cd: { step: -3 }, specMods: { bladedancer: { cd: { step: -1 } } }, text: 'Shadowstep recharges 3s faster.', spec: { bladedancer: 'Blade Fury recharges 1s faster.' } },
      { id: 'shadowblade_endless', name: 'Endless Dance', ab: 'dance', text: 'Each 5-point finisher during Shadow Dance makes it last 1s longer (up to 4s).' },
    ],
    [
      { id: 'shadowblade_blossom', name: 'Death Blossom', ab: 'smoke', grants: true,
        text: 'Smoke Bomb becomes Death Blossom (120s): you vanish into a storm of knives around the boss, six cuts over 1.5s that each give a combo point. The last is a free Eviscerate with everything you hold.',
        spec: { nightstalker: 'Smoke Bomb becomes Death Blossom (120s): you vanish into a storm of knives around the boss, six cuts over 1.5s that each give a combo point. The last is a free Backstab with everything you hold.' } },
      { id: 'shadowblade_toxic', name: 'Toxic Burst', ab: 'evis', text: 'Eviscerate now bursts your poison or Rupture: 15% of what it has left lands at once, and it keeps going.',
        spec: { nightstalker: 'Backstab now bursts your poison or Rupture: 15% of what it has left lands at once, and it keeps going.' } },
      { id: 'shadowblade_garrote', name: 'Garrote', ab: 'step', text: 'Shadowstep now garrotes: a wire bites into the boss and it bleeds for 9s.', spec: { bladedancer: 'Blade Fury now leaves the boss bleeding for 9s.' } },
    ],
  ],

  pyromancer: [
    [
      { id: 'pyromancer_firestarter', name: 'Firestarter', ab: 'fireball', text: 'A Fireball crit sets the target burning for 6s.' },
      { id: 'pyromancer_chain', name: 'Chain Reaction', ab: 'pyro', text: 'A Hot Streak Pyroblast now leaves you Heating Up (once every 10s).', spec: { cataclysm: 'A Hot Streak Meteor now leaves you Heating Up when it lands (once every 10s).' } },
      { id: 'pyromancer_hurry', name: 'Overcharged Blast', ab: 'fireblast', text: 'A Fire Blast fired mid-cast now hurries that cast along: it finishes half a second sooner.' },
    ],
    [
      { id: 'pyromancer_molten', name: 'Molten Armour', ab: 'fireball', text: 'While your Heat is above 70, you take 10% less damage.' },
      { id: 'pyromancer_cauterize', name: 'Cauterize', ab: 'fireblast', text: 'A Fire Blast that turns Heating Up into Hot Streak also heals you for 5% of your HP.' },
      { id: 'pyromancer_haze', name: 'Heat Haze', ab: 'fireball', text: 'Whenever the boss begins a cast, your next Fireball is instant.' },
    ],
    [
      { id: 'pyromancer_firestep', name: 'Firestep', ab: 'smolder', grants: true,
        text: 'Smolder becomes Firestep (20s): blink forward through a burst of flame. It gives 15 Heat and makes your next Fireball instant.' },
      { id: 'pyromancer_banked', name: 'Banked Embers', ab: 'fireball', text: 'Your Heat no longer cools off on its own.' },
      { id: 'pyromancer_flashpoint', name: 'Flashpoint', ab: 'fireblast', text: 'A Fire Blast at 85 Heat or more now vents 30 Heat into the boss as a second blast, instead of adding more.' },
    ],
    [
      { id: 'pyromancer_afterburn', name: 'Afterburn', ab: 'combust', text: 'When Combustion ends, you get Hot Streak.', spec: { sigilmancer: 'When Ember Circle fades, you get Hot Streak.' } },
      { id: 'pyromancer_wildfire', name: 'Wildfire', ab: 'combust', text: 'Every crit during Combustion now leaves a flame on the boss that burns for 6s (up to 5 at once).',
        spec: { sigilmancer: 'Every crit while you stand in Ember Circle now leaves a flame on the boss that burns for 6s (up to 5 at once).' } },
      { id: 'pyromancer_longburn', name: 'Long Burn', ab: 'combust', text: 'Combustion lasts 3s longer.', spec: { sigilmancer: 'Ember Circle lasts 5s longer.' } },
    ],
    [
      { id: 'pyromancer_phoenix', name: 'Phoenix Flight', ab: 'vent', grants: true,
        text: 'Vent becomes Phoenix Flight (12s): release all your Heat as a phoenix that sweeps through the boss and wheels back for a second pass, harder the more Heat. At 60 Heat or more it leaves you Hot Streak.' },
      { id: 'pyromancer_twin', name: 'Twin Flame', ab: 'pyro', text: 'A Hot Streak Pyroblast now splits: a second, smaller Pyroblast hits for 10%.', spec: { cataclysm: 'A Hot Streak Meteor now brings a second, smaller meteor down a moment later, for 10%.' } },
      { id: 'pyromancer_bomb', name: 'Living Bomb', ab: 'fireball', text: 'Every fourth Fireball now plants an ember in the boss that bursts 3s later.' },
    ],
  ],

  // ======================================================================= HEALERS
  cleric: [
    [
      { id: 'cleric_atonement', name: 'Atonement', ab: 'smite', text: 'Smite now also heals the most hurt ally for 15% of the damage it deals (Dawnstar too).' },
      { id: 'cleric_held', name: 'Held Dawn', ab: 'smite', text: 'Dawnstar no longer wants spending at once: it grows 2% stronger for every second you hold it, up to 30%.' },
      { id: 'cleric_petalfall', name: 'Petalfall', ab: 'petal', text: 'Dawn Petal also sends a spark of light into the boss.' },
    ],
    [
      { id: 'cleric_quickmend', name: 'Quick Mend', ab: 'mend', text: 'After you spend a Petal, your next Mend is instant.', spec: { aegis: 'After you spend a Petal, your next Divine Barrier is instant.' } },
      { id: 'cleric_purify', name: 'Purify', ab: 'petal', text: 'Dawn Petal now washes Vulnerability and Damage Down off its target (once every 20s).' },
      { id: 'cleric_wings', name: 'Wings of Dawn', ab: 'petal', text: 'Dawn Petal cast on an ally now carries you toward them on wings of light (up to 160).' },
    ],
    [
      { id: 'cleric_bloom', name: 'Bloom of Dawn', ab: 'intervene', grants: true,
        text: 'Intervention becomes Bloom of Dawn (30s, instant): spend all your Petals on one ally. A fallen ally rises at once; a living one is healed for 500 per Petal. Every Petal counts toward Dawnstar.' },
      { id: 'cleric_favour', name: 'Sun\'s Favour', ab: 'smite', text: 'Dawnstar gives back a Petal.' },
      { id: 'cleric_overgrowth', name: 'Overflowing Petals', ab: 'petal', text: 'A Petal that would grow past 3 now blooms by itself onto the most hurt ally, and counts toward Dawnstar.' },
    ],
    [
      { id: 'cleric_twinbless', name: 'Twin Blessing', ab: 'bene', text: 'Benediction can now be pressed again within 5s: the same blessing, at half strength, on the most hurt other ally.',
        spec: { aegis: 'A second Benediction within 5s now also lands on the most hurt other ally at half strength, and costs no charge.', inquisitor: 'Condemn can now be fired again within 5s, for a third of the damage.' } },
      { id: 'cleric_sunfall', name: 'Sunfall', ab: 'smite', text: 'Dawnstar now leaves a small sun on the boss that burns it for 12s.' },
      { id: 'cleric_benevolence', name: 'Benevolence', ab: 'bene', cd: { bene: -8 }, text: 'Benediction recharges 8s faster.', spec: { inquisitor: 'Condemn recharges 8s faster.' } },
    ],
    [
      { id: 'cleric_sanctum', name: 'Dawn Sanctum', ab: 'prayer', grants: true,
        text: 'Prayer Circle becomes Dawn Sanctum (90s): a great circle of dawn at your feet for 12s. Allies standing in it take 15% less damage and heal every 1.5s, and your Smites cast from inside it are instant.' },
      { id: 'cleric_twin', name: 'Twin Petals', ab: 'petal', text: 'Dawn Petal now also lands on the most hurt other ally, at half strength.' },
      { id: 'cleric_chorus', name: 'Dawn Chorus', ab: 'petal', text: 'Every third Petal you spend now sings out: the whole party heals for half of it.' },
    ],
  ],

  grovekeeper: [
    [
      { id: 'grovekeeper_balance', name: 'Nature\'s Balance', ab: 'wrath', text: 'Wrath now also heals everyone under your Rejuvenate for a fifth of its damage.',
        spec: { lifebinder: 'Wrath now also heals everyone under your Lifebind for a fifth of its damage.' } },
      { id: 'grovekeeper_moonfire', name: 'Moonfire', ab: 'wrath', text: 'Every third Wrath is instant.' },
      { id: 'grovekeeper_sprout', name: 'Quick Sprout', ab: 'rejuv', text: 'Once every 30s, Rejuvenate takes only a moment: its global cooldown is 1.2s.', spec: { lifebinder: 'Once every 30s, Lifebind takes only a moment: its global cooldown is 1.2s.' } },
    ],
    [
      { id: 'grovekeeper_ironbark', name: 'Ironbark', ab: 'rejuv', text: 'A Rejuvenate cast while the boss is casting also wraps the ally in bark: 15% less damage for 5s.',
        spec: { lifebinder: 'A Lifebind cast while the boss is casting also wraps the ally in bark: 15% less damage for 5s.' } },
      { id: 'grovekeeper_thickbark', name: 'Thick Bark', ab: 'bloom', text: 'When you drop below 40% HP, bark closes over you: 30% less damage for 6s (once every 60s).' },
      { id: 'grovekeeper_roots', name: 'Shared Roots', ab: 'bloom', text: 'Bloom with nobody under your Rejuvenate now heals the most hurt ally instead of you, and grows a short regen on them.',
        spec: { lifebinder: 'Bloom now also grows a short regen on the most hurt ally.' } },
    ],
    [
      { id: 'grovekeeper_seed', name: 'Seed of Renewal', ab: 'rebirth', grants: true,
        text: 'Rebirth becomes Seed of Renewal (30s, instant): spend 40 Bloom to plant a seed on an ally for 20s. If they fall while it grows, they spring back up at once; if not, it blooms into a big heal when it ends. On a fallen ally, it raises them at once.' },
      { id: 'grovekeeper_spill', name: 'Spillover', ab: 'bloom', text: 'Bloom that would spill past 100 now seeps into a healing patch under the most hurt ally.' },
      { id: 'grovekeeper_cycle', name: 'Cycle of Life', ab: 'wrath', text: 'An Awakened Wrath gives back 20 Bloom.' },
    ],
    [
      { id: 'grovekeeper_seedburst', name: 'Seedburst', ab: 'growth', text: 'Wild Growth also Awakens your next Wrath.', spec: { moonwell: 'Moonwell also Awakens your next Wrath.' } },
      { id: 'grovekeeper_oldgrowth', name: 'Old Growth', ab: 'growth', cd: { growth: -8 }, text: 'Wild Growth recharges 8s faster.', spec: { moonwell: 'Moonwell recharges 8s faster.' } },
      { id: 'grovekeeper_blossom', name: 'Last Blossom', ab: 'rejuv', text: 'Rejuvenate now blooms when it ends: one last burst of healing on the ally.', spec: { lifebinder: 'Lifebind now blooms when it ends: one last burst of healing on your chosen ally.' } },
    ],
    [
      { id: 'grovekeeper_treant', name: 'Treant', ab: 'thorn', grants: true,
        text: 'Thornlash becomes Treant (45s): call up a treant beside the boss for 15s. It slams the boss every 3s, and every slam heals your most hurt ally.' },
      { id: 'grovekeeper_naturewrath', name: 'Nature\'s Wrath', ab: 'bloom', text: 'Bloom now also tears roots up under the boss that lash it.' },
      { id: 'grovekeeper_pulse', name: 'Verdant Pulse', ab: 'growth', text: 'Wild Growth now pulses every 3s while it lasts, and each pulse grows 8 Bloom.',
        spec: { moonwell: 'Moonwell now pulses every 3s while it lasts, and each pulse grows 8 Bloom.' } },
    ],
  ],

  chronomancer: [
    [
      { id: 'chronomancer_phase', name: 'Phase Strike', ab: 'shift', text: 'Shift now leaves an afterimage that fires a free Temporal Bolt (once every 10s). It heals like any Bolt.' },
      { id: 'chronomancer_double', name: 'Double Time', ab: 'shift', text: 'Shifting into Haste now makes your next two Bolts instant instead of one.' },
      { id: 'chronomancer_skip', name: 'Skipped Beat', ab: 'bolt', text: 'Every fifth Temporal Bolt is instant.' },
    ],
    [
      { id: 'chronomancer_practiced', name: 'Practiced Rewind', ab: 'rewind', cd: { rewind: -6 }, text: 'Rewind recharges 6s faster.' },
      { id: 'chronomancer_dejavu', name: 'Deja Vu', ab: 'rewind', text: 'Rewind now also snaps you back to where you stood when you last pressed Shift (if that was in the last 10s).' },
      { id: 'chronomancer_lastmoment', name: 'Last Moment', ab: 'recall', text: 'While the boss\'s cast is about to land (1.5s or less left), Recall casts instantly.' },
    ],
    [
      { id: 'chronomancer_bubble', name: 'Time Bubble', ab: 'stasis', grants: true,
        text: 'Stasis becomes Time Bubble (40s): spend 30 Flux to wrap an ally in a bubble of slowed time for 6s. It follows them, and everyone inside takes 25% less damage.' },
      { id: 'chronomancer_borrowed', name: 'Borrowed Time', ab: 'bolt', text: 'In Haste, a Bolt that crits gives back 6 Flux.' },
      { id: 'chronomancer_overwound', name: 'Overwound', ab: 'shift', text: 'Flux that would spill past 100 in Slow now flows to your linked ally as healing.' },
    ],
    [
      { id: 'chronomancer_hourglass', name: 'Hourglass Ward', ab: 'rewind', text: 'Rewind now also slows time around its target: they take 15% less damage for 6s.' },
      { id: 'chronomancer_stopwatch', name: 'Stopwatch', ab: 'shift', text: 'Shift now also stops your Flux for 4s: it neither drains nor fills.' },
      { id: 'chronomancer_second', name: 'Second Hand', ab: 'bolt', text: 'In Haste, Temporal Bolt now strikes again 2s later at 8% strength, healing as a Bolt does.',
        spec: { echoist: 'Your echoes are 60% strength instead of half.', accelerant: 'In Haste, Temporal Bolt now strikes again 2s later at 6% strength, healing as a Bolt does.' } },
    ],
    [
      { id: 'chronomancer_warp', name: 'Time Warp', ab: 'accel', grants: true,
        text: 'Accelerando becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster, and every 3s its hands strike the boss and heal the whole party. You gain 40 Flux.',
        spec: { echoist: 'Echo Chamber becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster and your echoes are full strength, and every 3s its hands strike the boss and heal the whole party. You gain 40 Flux.',
          accelerant: 'Accelerando becomes Time Warp (60s): a great clock hangs over the party for 20s. Everyone acts 15% faster, and every 3s its hands strike the boss and heal the whole party. You gain 40 Flux.' } },
      { id: 'chronomancer_future', name: 'Future Sight', ab: 'bolt', text: 'Your Bolts now mark the boss with a rune of the future. 6s after the first, it bursts for a tenth of every Bolt that fed it, and a new rune can form 6s later.' },
      { id: 'chronomancer_secondchance', name: 'Second Chance', ab: 'recall', text: 'An ally Recall raises is healed to full a moment later, and the rest of the party heals a little.' },
    ],
  ],
};

// ======================================================================= ALEMBIST (classes-b)
// Mostly new behaviour, not bigger numbers. Two talents grant a whole new move (`grants`: the kit's
// talentAbilities[id] takes the slot of the move named in its `replaces`): Grand Blend (row III) and Quicksilver (row V).
TALENTS.alembist = [
  [
    { id: 'alembist_ricochet', name: 'Ricochet', ab: 'throw', text: 'Once every 15s, a Fire Bomb now bounces off its target and bursts again a second later, a quarter as strong.' },
    { id: 'alembist_scorch', name: 'Scorch', ab: 'throw', text: 'A Fire Bomb now leaves its target scorched for 10s: every heal vial you land in that time also flicks a spark into it.' },
    { id: 'alembist_kindle', name: 'Kindling', ab: 'ember', text: 'Starting a brew with Ember now flicks an ember at your target.' },
  ],
  [
    { id: 'alembist_flask', name: 'Flask Armour', ab: 'batch', text: 'While your bandolier is full, you take 10% less damage.' },
    { id: 'alembist_cling', name: 'Clinging Steam', ab: 'throw', text: 'Steam clouds now follow the ally they landed on.' },
    { id: 'alembist_spill', name: 'Spill', ab: 'throw', text: 'A vial that spoils now spills at your feet at half strength instead of going to waste.',
      spec: { volatile: 'A vial whose fuse runs out now goes off at full strength, and a bomb no longer burns you.' } },
  ],
  [
    { id: 'alembist_blend', name: 'Grand Blend', ab: 'batch', grants: true,
      text: 'Grand Batch becomes Grand Blend (90s): pour every vial in your bandolier into one. Thrown, it does all of their effects at once, each at 80%.' },
    { id: 'alembist_cask', name: 'Oak Cask', ab: 'throw', text: 'Ripe vials now keep ripening, up to 50% stronger at 25s, but spoil at 30s.',
      spec: { volatile: 'Your fuses burn 2s longer, and a vial keeps heating until it goes off, up to 45% stronger.' } },
    { id: 'alembist_echo', name: 'Mother Liquor', ab: 'dew', text: 'Brewing the same recipe twice in a row makes the second vial ripen half again as fast.',
      spec: { volatile: 'Brewing the same recipe twice in a row makes the second vial heat up half again as fast.' } },
  ],
  [
    { id: 'alembist_flash', name: 'Flash Distill', ab: 'distill', text: 'Distill now also drops a copy of your last vial into the bandolier.',
      spec: { volatile: 'Catalyst now also drops a copy of your last vial into the bandolier (once every 20s).' } },
    { id: 'alembist_reserve', name: 'Grand Reserve', ab: 'batch', text: 'Grand Batch\'s copies start fully ripe and never spoil. A Grand Blend keeps every effect at full strength.',
      spec: { volatile: 'Grand Batch\'s copies start fully heated with 10s fuses. A Grand Blend keeps every effect at full strength.' } },
    { id: 'alembist_fume', name: 'Fume Hood', ab: 'distill', text: 'Distill now also clears the air: the whole party takes 10% less damage for 8s.',
      spec: { volatile: 'Catalyst now also clears the air: the whole party takes 10% less damage for 8s (once every 30s).' } },
  ],
  [
    { id: 'alembist_quicksilver', name: 'Quicksilver', ab: 'salt', grants: true,
      text: 'Salt becomes Quicksilver, with recipes of its own: Quicksilver twice is a Silver Mirror (a pool that keeps everyone in it shielded), with Dew a Silver Tonic (a heal that is stronger the more hurt they are), with Ember a Fulminate (a bomb that goes off twice).',
      spec: { volatile: 'Salt becomes Quicksilver, with recipes of its own: Quicksilver twice is a Silver Mirror (a pool that keeps everyone in it shielded), with Dew a Silver Tonic (a heal that is stronger the more hurt they are), with Ember a Fulminate (a bomb that goes off twice). It counts as Salt in Reactions.' } },
    { id: 'alembist_chain', name: 'Chain Splash', ab: 'throw', text: 'Every splash heal now leaps on to the most hurt ally and splashes there too, at half strength.' },
    { id: 'alembist_residue', name: 'Residue', ab: 'throw', text: 'Every vial that breaks on an ally now leaves a puddle that heals whoever stands in it for 6s.' },
  ],
];

// id -> { cls, row, col, t }
const TALENT_BY_ID = {};
for (const [cls, rows] of Object.entries(TALENTS)) rows.forEach((row, r) => row.forEach((t, c) => { TALENT_BY_ID[t.id] = { cls, row: r, col: c, t }; }));

// the talent ids a hero holds, from its saved state { rows, picks } (picks beyond the unlocked rows don't count)
function talentSet(cls, state) {
  const out = new Set(), rows = TALENTS[cls];
  if (!rows || !state) return out;
  for (let r = 0; r < Math.min(rows.length, state.rows | 0); r++) {
    const c = state.picks && state.picks[r];
    if (c != null && rows[r][c]) out.add(rows[r][c].id);
  }
  return out;
}
// a talent's text for a spec (or the hero's own text)
const talentText = (t, specId) => (specId && t.spec && t.spec[specId]) || t.text;

if (typeof module !== 'undefined') module.exports = { TALENTS, TALENT_COSTS, TALENT_BY_ID, talentSet, talentText };
