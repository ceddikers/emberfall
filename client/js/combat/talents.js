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
      { id: 'bastion_rhythm', name: 'Shield Rhythm', ab: 'blade', text: 'A Blade Chain hit that carries a Perfect Block counter now skips the chain ahead: your next press is Judgment.' },
      { id: 'bastion_returning', name: 'Returning Edge', ab: 'edge', text: 'Holy Edge now comes back to your hand: a moment later it cuts the boss again on the way home, for a tenth of the damage.',
        spec: { sentinel: 'Shield Bash now sends a shockwave rolling on: a moment later it strikes the boss again, for a tenth of the damage.' } },
      { id: 'bastion_read', name: 'Read the Swing', ab: 'blade', text: 'Whenever the boss begins a cast, your next Blade Chain hit counters it (+{d:150}), as after a Perfect Block.' },
    ],
    [
      { id: 'bastion_holdfast', name: 'Hold Fast', ab: 'brace', text: 'A Brace raised while the boss is casting now holds until the cast lands (up to 6s) instead of 3s.' },
      { id: 'bastion_mercy', name: 'Shared Mercy', ab: 'edge', text: 'While you are above 70% HP, Holy Edge\'s heal goes to the most hurt ally instead of you, twice as strong ({h:240}).',
        spec: { sentinel: 'While you are above 70% HP, Shield Bash\'s heal goes to the most hurt ally instead of you, twice as strong ({h:240}).' } },
      { id: 'bastion_laststand', name: 'Last Stand', ab: 'bulwark', text: 'Bulwark now raises itself the moment you drop below 30% HP, if it is ready.',
        spec: { crusader: 'Zealous Guard now raises itself the moment you drop below 30% HP, if it is ready.' } },
    ],
    [
      { id: 'bastion_hallowed', name: 'Hallowed Ground', ab: 'banner', grants: true,
        text: 'Rally Banner becomes Hallowed Ground (30s): pour out all your Resolve (at least 30) to consecrate the ground under you for 10s. The boss burns every 2s, for {d:36} at 30 Resolve up to {d:120} at 100, and a Perfect Block inside gives 10 more Resolve.' },
      { id: 'bastion_steady', name: 'Steady Hands', ab: 'edge', text: 'For 6s after a Perfect Block, Holy Edge costs 35 Resolve instead of 50.',
        spec: { sentinel: 'For 6s after a Perfect Block, Shield Bash costs 35 Resolve instead of 50.' } },
      { id: 'bastion_overflow', name: 'Overflowing Faith', ab: 'brace', text: 'Resolve that would spill past 100 now hardens into a shield on you for 8s: {s:12} for each point spilled.' },
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
        text: 'Oath of Valor becomes Avatar of Dawn (60s): wings of light for 15s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss for {d:120}.',
        spec: { crusader: 'Oath of Valor becomes Avatar of Dawn (60s): wings of light for 20s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss for {d:120}.' } },
      { id: 'bastion_sunlit', name: 'Sunlit Shield', ab: 'brace', text: 'A Perfect Block now also throws a flash of light into the boss for {d:40}.' },
      { id: 'bastion_echo', name: 'Edge of Judgment', ab: 'blade', text: 'Judgment now also hurls a shard of Holy Edge at the boss for {d:75}, and it heals you for {h:60}.' },
    ],
  ],

  bloodreaver: [
    [
      { id: 'bloodreaver_gore', name: 'Gore', ab: 'hack', text: 'Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow for {d:320} that gives 15 Blood.',
        spec: { berserker: 'Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow for {d:320} that gives 15 Rage.' } },
      { id: 'bloodreaver_rend', name: 'Rend', ab: 'hack', text: 'Maul now carves a Wound in the boss (up to 3). Crimson Drain tears every Wound open for {d:65} extra each.',
        spec: { berserker: 'Maul now carves a Wound in the boss (up to 3). Rampage tears every Wound open for {d:65} extra each.' } },
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
        text: 'Undying becomes Blood Moon (120s): for 10s you cannot drop below 1 HP and your heals on yourself are doubled. When it sets you burst in a tide of blood: the boss takes damage for every hit you took under it (up to {d:1500}), and you heal for a quarter of that.' },
      { id: 'bloodreaver_hemorrhage', name: 'Hemorrhage', ab: 'drain', text: 'Crimson Drain now opens a Hemorrhage on the boss, {d:30} every 3s for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP.',
        spec: { berserker: 'Rampage now opens a Hemorrhage on the boss, {d:30} every 3s for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP.' } },
      { id: 'bloodreaver_bloodlust', name: 'Bloodlust', ab: 'frenzy', text: 'When Frenzy ends you finish with a free Crimson Drain that remembers every hit you took while it lasted.',
        spec: { berserker: 'When Frenzy ends you finish with a free Rampage that remembers every hit you took while it lasted.' } },
    ],
  ],

  runeguard: [
    [
      { id: 'runeguard_overflow', name: 'Overflow', ab: 'strike', text: 'A Rune that would overcap bursts into the boss instead, for {d:110}.' },
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
        text: 'Sanctum becomes Whirling Runes (30s): every Rune you hold tears loose and spins around you as a blade for 12s, striking the boss every 2s for {d:35} per Rune.' },
      { id: 'runeguard_reclaim', name: 'Reclaim', ab: 'ward', text: 'A Ward that absorbed at least half gives its Rune back.', spec: { spellwarden: 'A Ward gives its Rune back once it has absorbed a third.' } },
      { id: 'runeguard_glyphguard', name: 'Glyphguard', ab: 'glyph', text: 'Glyph Burst now also raises a small Ward ({s:325}) on you if you have none (once every 15s). It explodes like a Ward, for {d:60} up to {d:240}.',
        spec: { runeblade: 'Rune Cleave now also raises a small Ward ({s:325}) on you if you have none (once every 15s). It explodes like a Ward, for {d:60} up to {d:240}.' } },
    ],
    [
      { id: 'runeguard_shards', name: 'Mirror Shards', ab: 'mirror', text: 'A reflected hit now shatters the mirror into shards that strike the boss three more times for {d:150} each.' },
      { id: 'runeguard_shatter', name: 'Shatter', ab: 'ward', text: 'Raising a Runic Ward while yours is still up now shatters the old one: it blasts as if it had been broken all the way (but gives no Rune back).' },
      { id: 'runeguard_polished', name: 'Polished Mirror', ab: 'mirror', cd: { mirror: -30 }, text: 'Mirror Aegis recharges 30s faster.' },
    ],
    [
      { id: 'runeguard_living', name: 'Living Rune', ab: 'overload', grants: true,
        text: 'Runic Overload becomes Living Rune (60s): a great rune rises behind you for 15s. Everything Runic Overload does, and every Rune you spend makes it fire a bolt at the boss for {d:90}.' },
      { id: 'runeguard_nova', name: 'Ward Nova', ab: 'ward', text: 'A Runic Ward broken all the way now erupts in a nova: it strikes the boss for {d:120} and heals the whole party for a fifth of the Ward.',
        spec: { spellwarden: 'A Runic Ward that absorbed at least half now erupts in a nova when it ends: it strikes the boss for {d:120} and heals the whole party for a fifth of the Ward.' } },
      { id: 'runeguard_binding', name: 'Sigil of Binding', ab: 'glyph', text: 'Glyph Burst now carves a binding sigil under the boss for 8s (once every 15s): your next Rune Strike while it burns gives an extra Rune.',
        spec: { runeblade: 'Rune Cleave now carves a binding sigil under the boss for 8s (once every 15s): your next Rune Blade hit while it burns gives an extra Rune.' } },
    ],
  ],

  // ======================================================================= DPS
  ranger: [
    [
      { id: 'ranger_rhythm', name: 'Fletcher\'s Rhythm', ab: 'quick', text: 'Every fourth Quick Shot looses a second arrow for half damage.' },
      { id: 'ranger_ricochet', name: 'Ricochet', ab: 'pierce', text: 'A Piercing Arrow that crits ricochets back into your quiver: it gives its charge back.',
        spec: { sharpshooter: 'An Aimed Shot that crits ricochets back into your quiver: it gives its charge back.', venomstrike: 'A Caustic Arrow that crits ricochets back into your quiver: it gives its charge back.' } },
      { id: 'ranger_steady', name: 'Steady Breath', ab: 'quick', text: 'A Quick Shot loosed after standing still for 2s lights Keen Eye far more often (55%).' },
    ],
    [
      { id: 'ranger_disengage', name: 'Disengage', ab: 'cloak', text: 'Hunter\'s Cloak now also leaps you backwards, clear of whatever is at your feet.' },
      { id: 'ranger_secondwind', name: 'Second Wind', ab: 'quick', text: 'When you drop below 40% HP, your next Quick Shot also heals you for 15% of your HP (once every 45s).' },
      { id: 'ranger_lightfoot', name: 'Light Feet', ab: 'pierce', text: 'Each Piercing Arrow takes 3s off Hunter\'s Cloak\'s cooldown.',
        spec: { sharpshooter: 'Each Aimed Shot takes 3s off Hunter\'s Cloak\'s cooldown.', venomstrike: 'Each Caustic Arrow takes 3s off Hunter\'s Cloak\'s cooldown.' } },
    ],
    [
      { id: 'ranger_explosive', name: 'Explosive Shot', ab: 'rapid', grants: true,
        text: 'Rapid Fire becomes Explosive Shot: spend 50 Focus to plant a charge in the boss that blows 2.5s later for {d:300} ({d:640} if planted in your Hunter\'s Mark). Every Quick Shot or Piercing Arrow that lands before then makes the blast 30% bigger.' },
      { id: 'ranger_focusfire', name: 'Focus Fire', ab: 'quick', text: 'At full Focus, Quick Shot no longer wastes it: instead of giving Focus it hits twice as hard.' },
      { id: 'ranger_tracking', name: 'Tracking', ab: 'quick', text: 'Each Quick Shot that doesn\'t light Keen Eye gives 2 more Focus than the one before (up to 10 more). Keen Eye starts the count over.' },
    ],
    [
      { id: 'ranger_longhunt', name: 'Long Hunt', ab: 'mark', text: 'Hunter\'s Mark lasts 3s longer.' },
      { id: 'ranger_pin', name: 'Pinning Shot', ab: 'pierce', text: 'A Keen Eye Piercing Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s).',
        spec: { sharpshooter: 'A Keen Eye Aimed Shot now pins the boss: your next Quick Shot is a critical hit (once every 12s).', venomstrike: 'A Keen Eye Caustic Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s).' } },
      { id: 'ranger_deathmark', name: 'Marked for Death', ab: 'mark', text: 'When Hunter\'s Mark ends, the mark bursts on the boss for {d:120}, plus {d:90} for every Keen Eye you lit while it lasted.' },
    ],
    [
      { id: 'ranger_falcon', name: 'Falcon', ab: 'barrage', grants: true,
        text: 'Barrage becomes Falcon (30s): your falcon dives onto the boss and harries it for 10s, striking every 2s for {d:90}. Every Keen Eye you light while it hunts sends it into a diving strike for {d:200} at once.' },
      { id: 'ranger_storm', name: 'Storm Arrow', ab: 'pierce', text: 'A Keen Eye Piercing Arrow now calls down lightning: it arcs into the boss twice more, each strike 6% as strong.',
        spec: { sharpshooter: 'A Keen Eye Aimed Shot now calls down lightning: it arcs into the boss twice more, each strike 6% as strong.', venomstrike: 'A Keen Eye Caustic Arrow now calls down lightning: it arcs into the boss twice more, each strike 6% as strong.' } },
      { id: 'ranger_volley', name: 'Wild Volley', ab: 'quick', text: 'Every Quick Shot crit now calls a volley of arrows down on the boss for {d:90}.' },
    ],
  ],

  shadowblade: [
    [
      { id: 'shadowblade_feint', name: 'Feint', ab: 'strike', text: 'A Strike from the front is no longer wasted: it sets up a feint, and your next Eviscerate lands as a hit from the side wherever you stand.',
        spec: { nightstalker: 'A Strike from the front is no longer wasted: it sets up a feint, and your next Backstab lands as a hit from behind wherever you stand.',
          bladedancer: 'A Strike never spills a combo point: at 4 points it gives only the 1 that fits, and your Tempo is safe.' } },
      { id: 'shadowblade_opportunist', name: 'Opportunist', ab: 'evis', text: 'An Eviscerate while the boss is casting is always a critical hit.',
        spec: { nightstalker: 'A Backstab while the boss is casting is always a critical hit.' } },
      { id: 'shadowblade_ambush', name: 'Ambush', ab: 'step', text: 'Shadowstep now strikes as you arrive: a stab from behind for {d:20} and a combo point.',
        spec: { bladedancer: 'Blade Fury\'s spin now gives a second combo point, but never one past 5 (your Tempo is safe).' } },
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
        text: 'Venom Blade becomes Rupture: a finisher that spends all your combo points to open the boss up ({d:100}, then {d:120} every 2s) for 4s per point. While it bleeds, Eviscerate hits 15% harder, as with your poison.',
        spec: { nightstalker: 'Venom Blade becomes Rupture: a finisher that spends all your combo points to open the boss up ({d:100}, then {d:120} every 2s) for 4s per point. While it bleeds, Backstab hits 15% harder, as with your poison.' } },
      { id: 'shadowblade_relentless', name: 'Relentless', ab: 'evis', text: 'A 5-point Eviscerate has an even chance to give back 1 combo point.', spec: { nightstalker: 'A 5-point Backstab has an even chance to give back 1 combo point.' } },
      { id: 'shadowblade_sharpen', name: 'Sharpened Shadows', ab: 'strike', text: 'A combo point that would spill past 5 now sharpens your next Eviscerate instead: 12% harder for each (up to 3).',
        spec: { nightstalker: 'A combo point that would spill past 5 now sharpens your next Backstab instead: 12% harder for each (up to 3).' } },
    ],
    [
      { id: 'shadowblade_clone', name: 'Shadow Clone', ab: 'dance', text: 'Shadow Dance now calls a shadow that repeats your Eviscerates at 20%.', spec: { nightstalker: 'Shadow Dance now calls a shadow that repeats your Backstabs at 20%.' } },
      { id: 'shadowblade_sprint', name: 'Shadow Sprint', ab: 'step', cd: { step: -3 }, specMods: { bladedancer: { cd: { step: -1 } } }, text: 'Shadowstep recharges 3s faster.', spec: { bladedancer: 'Blade Fury recharges 1s faster.' } },
      { id: 'shadowblade_endless', name: 'Endless Dance', ab: 'dance', text: 'Each 5-point finisher during Shadow Dance makes it last 1s longer (up to 4s).' },
    ],
    [
      { id: 'shadowblade_blossom', name: 'Death Blossom', ab: 'smoke', grants: true,
        text: 'Smoke Bomb becomes Death Blossom (120s): you vanish into a storm of knives around the boss, six cuts of {d:30} over 1.5s that each give a combo point. The last is a free Eviscerate with everything you hold.',
        spec: { nightstalker: 'Smoke Bomb becomes Death Blossom (120s): you vanish into a storm of knives around the boss, six cuts of {d:30} over 1.5s that each give a combo point. The last is a free Backstab with everything you hold.' } },
      { id: 'shadowblade_toxic', name: 'Toxic Burst', ab: 'evis', text: 'Eviscerate now bursts your poison or Rupture: 15% of what it has left lands at once, and it keeps going.',
        spec: { nightstalker: 'Backstab now bursts your poison or Rupture: 15% of what it has left lands at once, and it keeps going.' } },
      { id: 'shadowblade_garrote', name: 'Garrote', ab: 'step', text: 'Shadowstep now garrotes: a wire bites into the boss and it bleeds for {d:50} every 3s for 9s.', spec: { bladedancer: 'Blade Fury now leaves the boss bleeding for {d:50} every 3s for 9s.' } },
    ],
  ],

  pyromancer: [
    [
      { id: 'pyromancer_firestarter', name: 'Firestarter', ab: 'fireball', text: 'A Fireball crit sets the target burning for {d:40} every 3s for 6s.' },
      { id: 'pyromancer_chain', name: 'Chain Reaction', ab: 'pyro', text: 'A Hot Streak Pyroblast now leaves you Heating Up (once every 15s).', spec: { cataclysm: 'A Hot Streak Meteor now leaves you Heating Up when it lands (once every 15s).' } },
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
      { id: 'pyromancer_flashpoint', name: 'Flashpoint', ab: 'fireblast', text: 'A Fire Blast at 85 Heat or more now vents 30 Heat into the boss as a second blast for {d:120}, instead of adding more.' },
    ],
    [
      { id: 'pyromancer_afterburn', name: 'Afterburn', ab: 'combust', text: 'When Combustion ends, you get Hot Streak.', spec: { sigilmancer: 'When Ember Circle fades, you get Hot Streak.' } },
      { id: 'pyromancer_wildfire', name: 'Wildfire', ab: 'combust', text: 'Every crit during Combustion now leaves a flame on the boss that burns for {d:25} every 2s for 6s (up to 3 at once).',
        spec: { sigilmancer: 'Every crit while you stand in Ember Circle now leaves a flame on the boss that burns for {d:25} every 2s for 6s (up to 3 at once).' } },
      { id: 'pyromancer_longburn', name: 'Long Burn', ab: 'combust', text: 'Combustion lasts 2.5s longer.', spec: { sigilmancer: 'Ember Circle lasts 5s longer.' } },
    ],
    [
      { id: 'pyromancer_phoenix', name: 'Phoenix Flight', ab: 'vent', grants: true,
        text: 'Vent becomes Phoenix Flight (12s): release all your Heat as a phoenix that sweeps through the boss and wheels back for a second pass, each pass {d:70} plus {d:26} for every 10 Heat. At 60 Heat or more it leaves you Hot Streak.' },
      { id: 'pyromancer_twin', name: 'Twin Flame', ab: 'pyro', text: 'A Hot Streak Pyroblast now splits: a second, smaller Pyroblast hits for 5%.', spec: { cataclysm: 'A Hot Streak Meteor now brings a second, smaller meteor down a moment later, for 5%.' } },
      { id: 'pyromancer_bomb', name: 'Living Bomb', ab: 'fireball', text: 'Every fourth Fireball now plants an ember in the boss that bursts 3s later for {d:90}.' },
    ],
  ],

  // ======================================================================= HEALERS
  cleric: [
    [
      { id: 'cleric_atonement', name: 'Atonement', ab: 'smite', text: 'Smite now also heals the most hurt ally for 15% of the damage it deals (Dawnstar too).' },
      { id: 'cleric_held', name: 'Held Dawn', ab: 'smite', text: 'Dawnstar no longer wants spending at once: it grows 2% stronger for every second you hold it, up to 30%.' },
      { id: 'cleric_petalfall', name: 'Petalfall', ab: 'petal', text: 'Dawn Petal also sends a spark of light into the boss for {d:40}.' },
    ],
    [
      { id: 'cleric_quickmend', name: 'Quick Mend', ab: 'mend', text: 'After you spend a Petal, your next Mend is instant.', spec: { aegis: 'After you spend a Petal, your next Divine Barrier is instant.' } },
      { id: 'cleric_purify', name: 'Purify', ab: 'petal', text: 'Dawn Petal now washes Vulnerability and Damage Down off its target (once every 15s).' },
      { id: 'cleric_wings', name: 'Wings of Dawn', ab: 'petal', text: 'Dawn Petal cast on an ally now carries you toward them on wings of light (up to 160).' },
    ],
    [
      { id: 'cleric_bloom', name: 'Bloom of Dawn', ab: 'intervene', grants: true,
        text: 'Intervention becomes Bloom of Dawn (30s, instant): spend all your Petals on one ally. A fallen ally rises at once; a living one is healed for {h:500} per Petal. Every Petal counts toward Dawnstar.' },
      { id: 'cleric_favour', name: 'Sun\'s Favour', ab: 'smite', text: 'Dawnstar gives back a Petal.' },
      { id: 'cleric_firstlight', name: 'First Light', ab: 'mend', text: 'While Dawnstar is ready, Mend now casts instantly.', spec: { aegis: 'While Dawnstar is ready, Divine Barrier now casts instantly.' } },
    ],
    [
      { id: 'cleric_twinbless', name: 'Twin Blessing', ab: 'bene', text: 'Benediction can now be pressed again within 5s: the same blessing, at half strength, on the most hurt other ally.',
        spec: { aegis: 'A second Benediction within 5s now also lands on the most hurt other ally at half strength, and costs no charge.', inquisitor: 'Condemn can now be fired again within 5s, for a third of the damage.' } },
      { id: 'cleric_sunfall', name: 'Sunfall', ab: 'smite', text: 'Dawnstar now leaves a small sun on the boss that burns it for {d:35} every 3s for 12s.' },
      { id: 'cleric_benevolence', name: 'Benevolence', ab: 'bene', cd: { bene: -8 }, text: 'Benediction recharges 8s faster.', spec: { inquisitor: 'Condemn recharges 8s faster.' } },
    ],
    [
      { id: 'cleric_sanctum', name: 'Dawn Sanctum', ab: 'prayer', grants: true,
        text: 'Prayer Circle becomes Dawn Sanctum (90s): a great circle of dawn at your feet for 12s. Allies standing in it take 15% less damage and heal {h:70} every 1.5s, and your Smites cast from inside it are instant.' },
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
      { id: 'grovekeeper_roots', name: 'Shared Roots', ab: 'bloom', text: 'Bloom with nobody under your Rejuvenate now heals the most hurt ally instead of you, and grows a short regen on them ({h:60} every 3s for 9s).',
        spec: { lifebinder: 'Bloom now also grows a short regen on the most hurt ally ({h:60} every 3s for 9s).' } },
    ],
    [
      { id: 'grovekeeper_seed', name: 'Seed of Renewal', ab: 'rebirth', grants: true,
        text: 'Rebirth becomes Seed of Renewal (30s, instant): spend 40 Bloom to plant a seed on an ally for 20s. If they fall while it grows, they spring back up at once; if not, it blooms into a {h:900} heal when it ends. On a fallen ally, it raises them at once.' },
      { id: 'grovekeeper_spill', name: 'Spillover', ab: 'bloom', text: 'Bloom that would spill past 100 now seeps into a healing patch under the most hurt ally ({h:60} every 1.5s for 6s).' },
      { id: 'grovekeeper_cycle', name: 'Cycle of Life', ab: 'wrath', text: 'An Awakened Wrath gives back 20 Bloom.' },
    ],
    [
      { id: 'grovekeeper_seedburst', name: 'Seedburst', ab: 'growth', text: 'Wild Growth also Awakens your next Wrath.', spec: { moonwell: 'Moonwell also Awakens your next Wrath.' } },
      { id: 'grovekeeper_oldgrowth', name: 'Old Growth', ab: 'growth', cd: { growth: -8 }, text: 'Wild Growth recharges 8s faster.', spec: { moonwell: 'Moonwell recharges 8s faster.' } },
      { id: 'grovekeeper_blossom', name: 'Last Blossom', ab: 'rejuv', text: 'Rejuvenate now blooms when it ends: one last {h:300} heal on the ally.', spec: { lifebinder: 'Lifebind now blooms when it ends: one last {h:300} heal on your chosen ally.' } },
    ],
    [
      { id: 'grovekeeper_treant', name: 'Treant', ab: 'thorn', grants: true,
        text: 'Thornlash becomes Treant (45s): call up a treant beside the boss for 15s. It slams the boss for {d:170} every 3s, and every slam heals your most hurt ally for {h:150}.' },
      { id: 'grovekeeper_naturewrath', name: 'Nature\'s Wrath', ab: 'bloom', text: 'Bloom now also tears roots up under the boss that lash it for {d:90}.' },
      { id: 'grovekeeper_pulse', name: 'Verdant Pulse', ab: 'growth', text: 'Wild Growth now pulses every 3s while it lasts, and each pulse grows 8 Bloom.',
        spec: { moonwell: 'Moonwell now pulses every 3s while it lasts, and each pulse grows 8 Bloom.' } },
    ],
  ],

  chronomancer: [
    [
      { id: 'chronomancer_phase', name: 'Phase Strike', ab: 'shift', text: 'Shifting into Haste now leaves an afterimage that fires a free Temporal Bolt at 75% strength (once every 10s). It heals like any Bolt.' },
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
      { id: 'chronomancer_overwound', name: 'Overwound', ab: 'shift', text: 'Flux that would spill past 100 in Slow now flows to your linked ally as healing: {h:160} for every 6 Flux.' },
    ],
    [
      { id: 'chronomancer_hourglass', name: 'Hourglass Ward', ab: 'rewind', text: 'Rewind now also slows time around its target: they take 15% less damage for 6s.' },
      { id: 'chronomancer_stopwatch', name: 'Stopwatch', ab: 'shift', text: 'Shifting into Haste now also stops your Flux for 4s: your first 4s of Haste cost nothing.' },
      { id: 'chronomancer_second', name: 'Second Hand', ab: 'bolt', text: 'In Haste, Temporal Bolt now strikes again 2s later at 8% strength, healing as a Bolt does.',
        spec: { echoist: 'Your echoes are 60% strength instead of half.', accelerant: 'In Haste, Temporal Bolt now strikes again 2s later at 6% strength, healing as a Bolt does.' } },
    ],
    [
      { id: 'chronomancer_warp', name: 'Time Warp', ab: 'accel', grants: true,
        text: 'Accelerando becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster, and every 3s its hands strike the boss for {d:70} and heal the whole party for {h:40}. You gain 40 Flux.',
        spec: { echoist: 'Echo Chamber becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster and your echoes are full strength, and every 3s its hands strike the boss for {d:70} and heal the whole party for {h:40}. You gain 40 Flux.',
          accelerant: 'Accelerando becomes Time Warp (60s): a great clock hangs over the party for 20s. Everyone acts 15% faster, and every 3s its hands strike the boss for {d:70} and heal the whole party for {h:40}. You gain 40 Flux.' } },
      { id: 'chronomancer_future', name: 'Future Sight', ab: 'bolt', text: 'Your Bolts now mark the boss with a rune of the future. 6s after the first, it bursts for a tenth of every Bolt that fed it, and a new rune can form 6s later.' },
      { id: 'chronomancer_secondchance', name: 'Second Chance', ab: 'recall', text: 'An ally Recall raises is healed for {h:1400} a moment later, and the whole party for {h:150}.' },
    ],
  ],
};

// ======================================================================= ADVANCED CLASSES (Thermist, Driftblade)
// These trees are mostly new behaviour, not bigger numbers: new triggers, moves that now move you, and two talents
// per class (rows III and V) that put a whole new move on a key (grants: true; the move is in TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  thermist: [
    [
      { id: 'thermist_embers', name: 'Banked Embers', ab: 'cinder', text: 'A Cinder Bolt cast at +3 or hotter now leaves an ember in the target (up to 3). Your next Thermal Shock sets every ember off, {d:95} each.' },
      { id: 'thermist_flicker', name: 'Flicker', ab: 'rime', text: 'A Cinder Bolt or Rime Shard now makes your next Flare or Glacier Lance instant (within 6s).' },
      { id: 'thermist_afterglow', name: 'Afterglow', ab: 'flare', text: 'A Flare or Glacier Lance cast at its own edge now leaves the target burning or freezing for {d:42} every 3s for 9s.', spec: { zenith: 'A Flare or Glacier Lance cast at its own edge now leaves the target burning or freezing for {d:30} every 3s for 9s.' } },
    ],
    [
      { id: 'thermist_front', name: 'Cold Front', ab: 'equil', text: 'An Equilibrium that drops the dial 4 or more steps now also gives the whole party 10% less damage for 6s.', spec: { zenith: 'A Bleed Off that vents 40 or more Strain now also gives the whole party 10% less damage for 6s.' } },
      { id: 'thermist_phase', name: 'Phase Step', ab: 'equil', text: 'Equilibrium now also blinks you 150 px the way you\'re heading.', spec: { zenith: 'Bleed Off now also blinks you 150 px the way you\'re heading.' } },
      { id: 'thermist_skin', name: 'Thermal Skin', ab: 'invert', text: 'Every Thermal Shock now also wraps you in a shield worth 30% of its strength.' },
    ],
    [
      { id: 'thermist_thermocline', name: 'Thermocline', ab: 'cinder', grants: true, text: 'New move on Q, in place of Cinder Bolt. Thermocline: an instant {d:170} bolt that swings the dial 2 steps toward the other side and counts as that element. It hits 8% harder for every step from 0 you started.', spec: { pendulum: 'New move on Q, in place of Cinder Bolt. Thermocline: an instant {d:170} bolt that swings the dial 3 steps toward the other side and counts as that element. It hits 8% harder for every step from 0 you started.' } },
      { id: 'thermist_latent', name: 'Latent Heat', ab: 'flare', text: 'Overloading no longer locks or burns you: the extra heat is banked instead, and your next Thermal Shock releases it half again as strong.', spec: { zenith: 'A meltdown no longer burns you or locks an element: the dial still snaps to 0, and your next Thermal Shock is half again as strong.' } },
      { id: 'thermist_rebound', name: 'Rebound', ab: 'lance', text: 'After a Thermal Shock, your next spell is now instant (within 10s).' },
    ],
    [
      { id: 'thermist_vortex', name: 'Polar Vortex', ab: 'invert', text: 'Inversion now leaves a vortex on the target that strikes for {d:55} every 1.5s for 6s.' },
      { id: 'thermist_pulse', name: 'Equilibrium Pulse', ab: 'equil', text: 'Equilibrium now sets off the heat it snaps away: from 3 or more steps out, a Thermal Shock as if you had swung that far.', spec: { zenith: 'Bleed Off in Redline now also sets off a Thermal Shock as if you had swung 3.' } },
      { id: 'thermist_solstice', name: 'Solstice', ab: 'invert', text: 'Inversion now flips the dial back 5s later: a Shock at 60% strength if it\'s still far enough from 0.' },
    ],
    [
      { id: 'thermist_zero', name: 'Absolute Zero', ab: 'rime', grants: true, text: 'New move on W, in place of Rime Shard. Absolute Zero: a 2s cast on a 45s cooldown that plunges the dial straight to -5, wherever it was. It hits for {d:100}, plus {d:15} for every step it fell.' },
      { id: 'thermist_conduct', name: 'Conduction', ab: 'invert', text: 'Thermal Shock now arcs: a second Shock, 15% as strong, strikes the target 1s later.' },
      { id: 'thermist_twin', name: 'Twin Stars', ab: 'flare', text: 'A Flare or Glacier Lance cast at its own edge now fires a second bolt after it, at 30% strength.', spec: { zenith: 'A Flare or Glacier Lance cast in Redline now fires a second bolt after it, at 9% strength.' } },
    ],
  ],

  driftblade: [
    [
      { id: 'driftblade_crescent', name: 'Crescent', ab: 'carve', text: 'Every third Carve you make while moving now also throws a crescent of wind at the target for {d:210}.' },
      { id: 'driftblade_eddies', name: 'Eddies', ab: 'slip', text: 'A Slipstream lane laid through an enemy now cuts it for {d:150} when you lay it, and again when the lane fades.' },
      { id: 'driftblade_tailwind', name: 'Tailwind', ab: 'hook', text: 'Hook Turn now also gives 20 Drift, and your next Carve is a critical hit.' },
    ],
    [
      { id: 'driftblade_calm', name: 'Eye of the Storm', ab: 'still', text: 'While you hold Stillpoint, the whole party now takes 10% less damage too.' },
      { id: 'driftblade_gust', name: 'Gust Guard', ab: 'slip', text: 'Slipstream now wraps you in a {s:130} shield of wind for 6s.' },
      { id: 'driftblade_sidestep', name: 'Sidestep', ab: 'hook', text: 'Hook Turn now also makes you take 30% less damage for 2s.' },
    ],
    [
      { id: 'driftblade_gyre', name: 'Gyre', ab: 'hook', grants: true, text: 'New move on E, in place of Hook Turn. Gyre: loop once round your target, one {d:105} cut for every 25 Drift you have (up to 4). It spends nothing and adds 10 Drift. Two charges.',
        spec: { orbit: 'New move on E, in place of Hook Turn. Gyre: loop once round your target, one {d:105} cut for every 25 Drift you have (up to 4). It spends nothing, adds 10 Drift, and a full loop is a full Orbit: all five stacks. Two charges.' } },
      { id: 'driftblade_second', name: 'Second Wind', ab: 'cross', text: 'A Crosswind that spends 80 Drift or more now gives 10 back.', spec: { comet: 'An Impact that spends 160 Drift or more now gives 20 back.' } },
      { id: 'driftblade_hover', name: 'Hover', ab: 'carve', text: 'A Carve you make while standing still now gives 10 Drift.' },
    ],
    [
      { id: 'driftblade_galeforce', name: 'Galeforce', ab: 'gale', text: 'When Gale Run ends, it now looses a free blade of wind at the target: {d:100}, plus {d:50} for every 10 Drift you hold (it spends nothing).' },
      { id: 'driftblade_jet', name: 'Jetstream', ab: 'slip', text: 'A Slipstream through an enemy now gives its charge back (once every 8s).' },
      { id: 'driftblade_hurricane', name: 'Hurricane', ab: 'gale', text: 'During Gale Run, each Passing Strike now makes it last 1s longer (up to 6s).' },
    ],
    [
      { id: 'driftblade_tailspin', name: 'Tailspin', ab: 'still', grants: true, text: 'New move on D, in place of Stillpoint. Tailspin: whirl in place, parrying like Stillpoint and cutting the nearest enemy three times for {d:115} each, then spring 150 px the way you\'re heading.' },
      { id: 'driftblade_razor', name: 'Razor Wind', ab: 'carve', text: 'Passing Strikes now leave a cut that bleeds for 6s, {d:16} every 2s for each pass (up to 3).' },
      { id: 'driftblade_after', name: 'Afterimage', ab: 'hook', text: 'Hook Turn now leaves an afterimage that cuts the target again for {d:170} a second later.' },
    ],
  ],
});

// ======================================================================= ALEMBIST (classes-b)
// Mostly new behaviour, not bigger numbers. Two talents grant a whole new move (`grants`; the move is in TALENT_ABILITIES in
// kits.js and takes the slot named in its `replaces`): Grand Blend (row III) and Quicksilver (row V).
TALENTS.alembist = [
  [
    { id: 'alembist_ricochet', name: 'Ricochet', ab: 'throw', text: 'Once every 15s, a Fire Bomb now bounces off its target and bursts again a second later, a quarter as strong.' },
    { id: 'alembist_scorch', name: 'Scorch', ab: 'throw', text: 'A Fire Bomb now leaves its target scorched for 10s: every heal vial you land in that time also flicks a spark into it for {d:40}.' },
    { id: 'alembist_kindle', name: 'Kindling', ab: 'ember', text: 'Starting a brew with Ember now flicks an ember at your target for {d:20}.' },
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
      spec: { volatile: 'Catalyst now also drops a copy of your last vial into the bandolier (once every 15s).' } },
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
      { id: 'gorgemaw_aftertaste', name: 'Aftertaste', ab: 'spit', text: 'A Spit now leaves the taste behind: the boss burns for {d:35} every 3s for 9s ({d:65} after a Spike).' },
      { id: 'gorgemaw_crunch', name: 'Crunch', ab: 'gnash', text: 'Gulp, the third bite of Gnash, now bites twice: the second bite hits for {d:70}.' },
    ],
    [
      { id: 'gorgemaw_cud', name: 'Chew the Cud', ab: 'wide', text: 'Every Morsel you eat now heals you for 3% of your HP.' },
      { id: 'gorgemaw_widejaw', name: 'Wide Jaw', ab: 'wide', text: 'Open Wide stays open 2.2s instead of 1.5s.' },
      { id: 'gorgemaw_scraps', name: 'Table Scraps', ab: 'wide', text: 'Eating an attack meant for a teammate now also shields them for {s:200} for 6s.' },
    ],
    [
      { id: 'gorgemaw_regurgitate', name: 'Regurgitate', ab: 'spit', grants: true, text: 'New move on E, in place of Spit. Regurgitate: bring the whole Belly up at once, every Morsel spat in its own shape at 75% strength.', spec: { glutton: 'New move on E, in place of Spit. Regurgitate: bring the whole Belly up at once, every Morsel spat in its own shape at 75% strength. Pairs of a shape still fuse.' } },
      { id: 'gorgemaw_lining', name: 'Iron Lining', ab: 'digest', text: 'Every Morsel in your Belly now makes you take 3% less damage.' },
      { id: 'gorgemaw_sour', name: 'Sour Stomach', ab: 'spit', text: 'A Morsel you have kept for 15s or more turns sour: spat, it hits 40% harder.' },
    ],
    [
      { id: 'gorgemaw_feast', name: 'Feast', ab: 'bottomless', text: 'Bottomless now also refills Open Wide\'s charges.' },
      { id: 'gorgemaw_ironjaw', name: 'Iron Jaw', ab: 'iron', text: 'Iron Gut now also opens your jaw for its first 2s.' },
      { id: 'gorgemaw_overflow', name: 'Overflow', ab: 'spit', text: 'A Morsel eaten into a full Belly is now spat straight back out instead of lost.' },
    ],
    [
      { id: 'gorgemaw_stonebelly', name: 'Stone Belly', ab: 'iron', grants: true, text: 'New move on D, in place of Iron Gut. Stone Belly: 30% less damage for 8s, and every Morsel you eat in that time is a Spike.' },
      { id: 'gorgemaw_bile', name: 'Bile', ab: 'digest', text: 'Digest now also scalds the boss: one hit of {d:110} for every Morsel it digests.' },
      { id: 'gorgemaw_rumination', name: 'Rumination', ab: 'digest', text: 'Digest now leaves your oldest Morsel in the Belly, to spit later.' },
    ],
  ],

  oathbroker: [
    [
      { id: 'oathbroker_interest', name: 'Interest', ab: 'collect', text: 'Collect, the third strike, now hits for {d:16} more for every entry in your Ledger (up to 5).' },
      { id: 'oathbroker_garnish', name: 'Garnish', ab: 'collect', text: '40% of whatever your strikes pay down is now also struck from the boss.' },
      { id: 'oathbroker_stamp', name: 'Rubber Stamp', ab: 'settle', text: 'Settle now also stamps the boss: a blow worth half of what you settled (up to {d:700}).' },
    ],
    [
      { id: 'oathbroker_grace', name: 'Grace Period', ab: 'reneg', text: 'Entries now come due after 10s instead of 8s.' },
      { id: 'oathbroker_amnesty', name: 'Amnesty', ab: 'reneg', text: 'Renegotiate now also erases your smallest entry.' },
      { id: 'oathbroker_escrow', name: 'Escrow', ab: 'settle', text: 'While your Ledger holds 3 entries or more, you take 10% less damage.' },
    ],
    [
      { id: 'oathbroker_audit', name: 'Audit', ab: 'settle', grants: true, text: 'New move on E, in place of Settle. Audit (15s): every entry at least 4s old is paid now at 30% of its size; newer ones stay.' },
      { id: 'oathbroker_consolidate', name: 'Consolidate', ab: 'reneg', text: 'Renegotiate now also folds the whole Ledger into one entry, due when the last one would have been.' },
      { id: 'oathbroker_fineprint', name: 'Fine Print', ab: 'lien', text: 'Entries smaller than 2% of your HP are now struck off when they come due instead of billed.' },
    ],
    [
      { id: 'oathbroker_receivership', name: 'Receivership', ab: 'default', text: 'Default now also gives the whole party 10% less damage for 8s.', spec: { collector: 'Foreclose now also gives the whole party 10% less damage for 8s.' } },
      { id: 'oathbroker_garnishwrit', name: 'Writ of Execution', ab: 'writ', text: 'Entries written during Writ of Protection are now a third paid by the boss when they come due.' },
      { id: 'oathbroker_slate', name: 'Clean Slate', ab: 'default', text: 'Default now also brings Renegotiate and Settle straight back.', spec: { collector: 'Foreclose now also brings Renegotiate and Settle straight back.' } },
    ],
    [
      { id: 'oathbroker_moratorium', name: 'Moratorium', ab: 'reneg', grants: true, text: 'New move on W, in place of Renegotiate. Moratorium (45s): for 5s nothing comes due; every timer in the Ledger stops.' },
      { id: 'oathbroker_tithe', name: 'Tithe', ab: 'lien', text: 'Every bill you pay now heals your most hurt ally for a quarter of it.' },
      { id: 'oathbroker_notary', name: 'Notary', ab: 'collect', text: 'Collect, the third strike, now stamps your newest entry: it comes due 3s later.' },
    ],
  ],
});

// ======================================================================= THREADWEAVER and MARIONETTIST (classes-c)
// New behaviour, one plain number each (Long Thread, Quick Change). Rows III and V grant a move (TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  threadweaver: [
    [
      { id: 'threadweaver_backstitch', name: 'Backstitch', ab: 'needle', text: 'Needle now also adds 5 Spool.' },
      { id: 'threadweaver_crossstitch', name: 'Cross Stitch', ab: 'tie', text: 'Tying a thread now also heals both its ends for {h:110}.' },
      { id: 'threadweaver_taut', name: 'Taut', ab: 'needle', text: 'Needle now casts in 1s instead of 1.5s while you hold 3 threads or more.' },
    ],
    [
      { id: 'threadweaver_thimble', name: 'Thimble', ab: 'snip', text: 'Every thread Snap cuts now also shields both its ends for {s:150} for 6s.' },
      { id: 'threadweaver_reelin', name: 'Reel In', ab: 'tie', text: 'A Tie that pulls an ally along a thread now pulls both ends together to meet in the middle, and both take 10% less damage for 4s.' },
      { id: 'threadweaver_knotwork', name: 'Knotwork', ab: 'tie', text: 'A thread that snaps on its own now gives back a charge of Tie.' },
    ],
    [
      { id: 'threadweaver_embroider', name: 'Embroider', ab: 'mend', grants: true, text: 'New move on E, in place of Mend Seam. Embroider: instant, 20 Spool. A {h:400} heal that runs down every thread on your target at full strength, and on through their threads at 60%.' },
      { id: 'threadweaver_bobbin', name: 'Full Bobbin', ab: 'mend', text: 'While you hold 50 Spool or more, Mend Seam now heals 20% more.' },
      { id: 'threadweaver_tension', name: 'Tension', ab: 'snip', text: 'Every thread Snap cuts now gives back 8 Spool.' },
    ],
    [
      { id: 'threadweaver_grand', name: 'Grand Tapestry', ab: 'tapestry', text: 'When Tapestry ends, the web now lets go in a {h:220} heal on the whole party.' },
      { id: 'threadweaver_selvedge', name: 'Selvedge', ab: 'tapestry', text: 'While Tapestry holds, none of your threads can snap, however far apart their ends are pulled.' },
      { id: 'threadweaver_longthread', name: 'Long Thread', ab: 'tapestry', cd: { tapestry: -30 }, text: 'Tapestry recharges 30s faster.' },
    ],
    [
      { id: 'threadweaver_cradle', name: 'Cat\'s Cradle', ab: 'shuttle', grants: true, text: 'New move on D, in place of Shuttle. Cat\'s Cradle (30s): a cradle of threads at your feet for 9s. Allies inside take 15% less damage and heal {h:70} every 1.5s, and its shuttle strikes the boss for {d:240} per thread you hold.', spec: { shears: 'New move on D, in place of Shuttle. Cat\'s Cradle (30s): a cradle of threads at your feet for 9s. Allies inside take 15% less damage and heal {h:70} every 1.5s, and its shuttle strikes the boss for {d:240} per thread you hold or Snap cut in the last 8s (up to 5).' } },
      { id: 'threadweaver_heartstring', name: 'Heartstring', ab: 'snip', text: 'Every thread Snap cuts now also whips the boss for {d:50}.' },
      { id: 'threadweaver_skein', name: 'Double Knot', ab: 'tie', text: 'A thread you tie can\'t snap for its first 6s, however far apart its ends are pulled.' },
    ],
  ],

  marionettist: [
    [
      { id: 'marionettist_flourish', name: 'Flourish', ab: 'cue', text: 'The last of the quick Jabs a Cue gives now flourishes into a second, lighter stab for {d:100}. Let all three land before you Cue again.', spec: { understudy: 'The last of the quick Jabs a Cue gives now flourishes into a second, lighter stab: {d:58} from each Doll. Let all three land before you Cue again.' } },
      { id: 'marionettist_lunge', name: 'Lunge', ab: 'pull', text: 'Pull Strings now cuts 40% harder when the Doll passes through an enemy.' },
      { id: 'marionettist_counterweight', name: 'Counterweight', ab: 'cross', text: 'A Cross-Cut that cuts nothing now gives back half its cooldown.' },
    ],
    [
      { id: 'marionettist_bodydouble', name: 'Body Double', ab: 'swap', text: 'Swap now also wraps you in a {s:150} shield for 5s.' },
      { id: 'marionettist_mended', name: 'Safe Landing', ab: 'pull', text: 'Pull Strings now also leaves the Doll untouchable for 1.5s where it lands.' },
      { id: 'marionettist_standin', name: 'Stand-In', ab: 'swap', text: 'For 3s after a Swap, a blow that lands on the Doll no longer tears a String.' },
    ],
    [
      { id: 'marionettist_tangle', name: 'Tangle', ab: 'pirouette', grants: true, text: 'New move on R, in place of Pirouette. Tangle: the Doll winds its strings round the enemy, a {d:160} cut now and a bleed of {d:38} every 2s for 10s.', spec: { understudy: 'New move on R, in place of Pirouette. Tangle: each Doll winds its strings round the enemy, a {d:92.8} cut now and a bleed of {d:22} every 2s for 10s.' } },
      { id: 'marionettist_encore', name: 'Encore! Encore!', ab: 'finale', text: 'Grand Finale now leaves you 2 Encore when it ends.' },
      { id: 'marionettist_secondact', name: 'Second Act', ab: 'pirouette', text: 'Pirouette now also gives back a charge of Pull Strings.' },
    ],
    [
      { id: 'marionettist_curtain', name: 'Standing Ovation', ab: 'finale', text: 'The last hit of Grand Finale now sends the Doll out quick: its next three Jabs come twice as fast, as after a Cue.' },
      { id: 'marionettist_cue', name: 'On Cue', ab: 'swap', text: 'Swap now also takes 3s off Cross-Cut\'s cooldown.' },
      { id: 'marionettist_quickchange', name: 'Quick Change', ab: 'swap', cd: { swap: -4 }, text: 'Swap recharges 4s faster.' },
    ],
    [
      { id: 'marionettist_curtainrise', name: 'Red Curtain', ab: 'swap', grants: true, text: 'New move on D, in place of Swap. Red Curtain: a red curtain round you for 8s; allies inside take 15% less damage, and the Dolls bow and come back to you.' },
      { id: 'marionettist_twin', name: 'Twin Strings', ab: 'cross', text: 'Cross-Cut\'s line now lingers for 2s and cuts whatever still crosses it for {d:45} every second.', spec: { understudy: 'Cross-Cut\'s lines now linger for 2s and cut whatever still crosses them for {d:26.1} every second.' } },
      { id: 'marionettist_bow', name: 'Final Bow', ab: 'finale', text: 'Nothing can touch the Doll while Grand Finale plays, and a blow it dances through during the show builds 1 Encore, as under Pirouette.' },
    ],
  ],
});

// ======================================================================= IRONPALM (tank)
// Its own block. Built to the newer rule: new behaviour, not bigger numbers (Deep Lungs is the one plain number), and two
// talents put a new move on a key (`grants`; the moves are in TALENT_ABILITIES at the end of kits.js): Bellows Stance
// (row III, on D) and Dragon Ascends (row V, on F). Named strings belong to the key their last input is on.
TALENTS.ironpalm = [
  [
    { id: 'ironpalm_swallow', name: 'Swallow\'s Return', ab: 'kick', text: 'Crane Step now flows on: Crane Step then Heavy (K L H) is a Rising Gate too, so it can carry on into Heaven\'s Drop.' },
    { id: 'ironpalm_echo', name: 'Echoing Palm', ab: 'fist', text: 'Thousand Palms now echoes: three more strikes of {d:13.2} land a moment after the flurry.' },
    { id: 'ironpalm_perfect', name: 'Perfect Form', ab: 'palm', text: 'A named move with every one of its presses Crisp now strikes again a moment later: an echo of its finishing blow at half strength. Once every 8s at most.' },
  ],
  [
    { id: 'ironpalm_shirt', name: 'Iron Shirt', ab: 'kick', text: 'Tiger Wall now also wraps you in a {s:130} shield for 5s.' },
    { id: 'ironpalm_deflect', name: 'Deflect', ab: 'read', text: 'Reading anything but a tankbuster now also throws the blow back into the boss: your counter hits for {d:123} instead of {d:63}.' },
    { id: 'ironpalm_bellecho', name: 'Bell\'s Echo', ab: 'bell', text: 'Temple Bell now also heals the whole party for {h:130}.', spec: { avalanche: 'Landslide now also heals the whole party for {h:130}.' } },
  ],
  [
    { id: 'ironpalm_bellows', name: 'Bellows Stance', ab: 'skin', grants: true, text: 'New move on D, in place of Iron Skin. Bellows Stance (90s): for 10s you take 30% less damage, your Breath refills half again as fast, and every named move you finish breathes out a shockwave ({d:54}) and gives back 6 Breath.',
      spec: { stillwater: 'New move on D, in place of Still Pond. Bellows Stance (90s): for 10s you take 30% less damage, your Breath refills half again as fast, and every named move you finish breathes out a shockwave ({d:54}) and gives back 6 Breath.' } },
    { id: 'ironpalm_lungs', name: 'Deep Lungs', ab: 'palm', text: 'Your Breath refills 20% faster.' },
    { id: 'ironpalm_quiet', name: 'Quiet Mind', ab: 'read', text: 'Finishing a named move now lets your Breath catch at once: it refills at its resting pace right away, until your next press.' },
  ],
  [
    { id: 'ironpalm_gong', name: 'Gong of Ages', ab: 'bell', text: 'Temple Bell now tolls again 8s later: the whole party takes 10% less damage for another 4s.', spec: { avalanche: 'Landslide now tolls again 8s later: the whole party takes 10% less damage for another 4s.' } },
    { id: 'ironpalm_unbroken', name: 'Unbroken', ab: 'skin', text: 'While Iron Skin lasts, your strings never drop or break, and every named move gives 4 Breath.', spec: { stillwater: 'While Still Pond lasts, your strings never drop or break, and every named move gives 4 Breath.' } },
    { id: 'ironpalm_answer', name: 'Answering Fist', ab: 'read', text: 'Reading a tankbuster now takes 20s off Iron Skin and Temple Bell.', spec: { stillwater: 'Reading a tankbuster now takes 20s off Still Pond and Temple Bell.', avalanche: 'Reading a tankbuster now takes 20s off Iron Skin and Landslide.' } },
  ],
  [
    { id: 'ironpalm_dragon', name: 'Dragon Ascends', ab: 'bell', grants: true, text: 'New move on F, in place of Temple Bell. Dragon Ascends (60s): leap down on your target with a {d:170} blow; the whole party deals 5% more damage for 12s, and you get Second Wind.',
      spec: { avalanche: 'New move on F, in place of Landslide. Dragon Ascends (60s): leap down on your target with a {d:170} blow; the whole party deals 5% more damage for 12s, you get Second Wind, and your Momentum fills for 15s.' } },
    { id: 'ironpalm_mountain', name: 'Falling Mountain', ab: 'kick', text: 'Heaven\'s Drop now shakes the ground: an aftershock strikes the boss for {d:40} a second later.' },
    { id: 'ironpalm_hundred', name: 'Hundred Hands', ab: 'fist', text: 'Thousand Palms now leaves the boss\'s guard open for 6s: your Light presses hit 30% harder.' },
  ],
];

// ======================================================================= GLOOMSWORN (tank, class 18)
// New behaviour, one plain number (Quick Rites). Rows III and V grant a move (TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  gloomsworn: [
    [
      { id: 'gloomsworn_bleed', name: 'Black Blood', ab: 'rend', text: 'Gloaming, the third strike, now leaves the boss bleeding black: {d:35} every 3s for 9s.' },
      { id: 'gloomsworn_interest', name: 'Dread Interest', ab: 'strike', text: 'Gloom Strike, when you still hold 40 Gloom or more after it, now cuts a second time for 40%.' },
      { id: 'gloomsworn_omen', name: 'Ill Omen', ab: 'rend', text: 'Whenever the boss begins a cast, your next Rend strike builds 12 extra Gloom.' },
    ],
    [
      { id: 'gloomsworn_wakened', name: 'Waking Dead', ab: 'mantle', text: 'When a Hollow ends with you standing, Black Mantle and Last Rite are ready again at once.' },
      { id: 'gloomsworn_veil', name: 'Veiled Step', ab: 'shade', text: 'Shade Step now also veils you: 15% less damage taken for 4s.' },
      { id: 'gloomsworn_bearer', name: 'Pallbearers', ab: 'pall', text: 'Black Pall now also lays a barrier of {s:100} on every ally for 8s.', spec: { duskreaver: 'Dusk Reave now also lays a barrier of {s:100} on every ally for 8s.' } },
    ],
    [
      { id: 'gloomsworn_vigil', name: 'Vigil Ward', ab: 'pall', grants: true, text: 'New move on R, in place of Black Pall. Vigil Ward (45s, 30 Gloom): stand watch over whoever is hurt most. They take 50% less damage for 5s and are wrapped in a barrier of {s:200}; you take 15% less damage for 5s.', spec: { duskreaver: 'New move on R, in place of Dusk Reave. Vigil Ward (45s, 30 Gloom): stand watch over whoever is hurt most. They take 50% less damage for 5s and are wrapped in a barrier of {s:200}; you take 15% less damage for 5s.' } },
      { id: 'gloomsworn_spill', name: 'Spill', ab: 'strike', text: 'Gloom that would run past 100 now hardens into a barrier on you for 8s: {s:10} for every point that spilled.' },
      { id: 'gloomsworn_feast', name: 'Feast on the Hollow', ab: 'rend', text: 'While you are Hollow, every strike you land heals you for 3% of your HP. The healing counts against your debt.' },
    ],
    [
      { id: 'gloomsworn_thorns', name: 'Thorned Mantle', ab: 'mantle', text: 'While Black Mantle lasts, every hit that gets through it strikes the boss back for a quarter of the damage (up to {d:500}).' },
      { id: 'gloomsworn_requiem', name: 'Requiem', ab: 'rite', text: 'Last Rite now shares half its barrier with every ally.' },
      { id: 'gloomsworn_quick', name: 'Quick Rites', ab: 'strike', cd: { strike: -2 }, text: 'Gloom Strike recharges 2s faster.' },
    ],
    [
      { id: 'gloomsworn_pyre', name: 'Black Pyre', ab: 'rite', grants: true, text: 'New move on F, in place of Last Rite. Black Pyre (90s): spend all your Gloom (at least 30), and the vessel breaks over your target in black fire for {d:600} plus {d:10} for every point, and a barrier of {s:150} plus {s:2} for every point wraps you for 8s.' },
      { id: 'gloomsworn_weeping', name: 'Weeping Wake', ab: 'strike', text: 'When a Hollow ends with you standing, the whole party is shielded for half your debt (at most a quarter of your HP).' },
      { id: 'gloomsworn_dusk', name: 'Last Light', ab: 'rite', text: 'Eclipse of the Vigil now keeps half your Gloom instead of emptying the vessel.' },
    ],
  ],
});

// ======================================================================= THRESHER (damage, class 19)
// New behaviour, one plain number (Ferryman's Haste). Rows III and V grant a move (TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  thresher: [
    [
      { id: 'thresher_drag', name: 'Dragging Edge', ab: 'slash', text: 'A Backswing now drags the toll along: it ages every affliction on the boss by 1s.' },
      { id: 'thresher_weight', name: 'Dread Weight', ab: 'hook', text: 'Hook now lays a Bind as well as its Thread.', spec: { sower: 'Hook now lays a Mark as well as its Thread and Bind.', grim: 'Hook now lays a Mark as well as its Thread.' } },
      { id: 'thresher_gleaning', name: 'Phantom Cut', ab: 'reap', text: 'A Reap that cashes in two or more gold afflictions makes your next Slash or Cleave cut again for 35% a moment later.' },
    ],
    [
      { id: 'thresher_vanish', name: 'Vanishing Cut', ab: 'blink', text: 'Gloam Blink now takes you out of the world for 1.5s: nothing can touch you.' },
      { id: 'thresher_tithe', name: 'Tithe', ab: 'reap', text: 'Drain, its ticks and its payout in a Reap, now mend the most hurt ally instead of you.' },
      { id: 'thresher_hush', name: 'Hush', ab: 'gather', text: 'Beckon also wraps you in a barrier of {s:100} for 6s.' },
    ],
    [
      { id: 'thresher_sowing', name: 'Shroud', ab: 'gather', grants: true, text: 'New move on R, in place of Beckon. Shroud (25s): all four afflictions land on the boss at once, faint (any that is already darkening is left to darken), and a cut for {d:100}.' },
      { id: 'thresher_compost', name: 'Grave Interest', ab: 'reap', text: 'A lapse you reap is not wasted: every lapsed affliction a Reap cashes in leaves the boss bleeding for {d:30} every 2s for 8s.' },
      { id: 'thresher_second', name: 'Unpaid Debt', ab: 'reap', text: 'A gold affliction a Reap cashes in is not spent: it stays on the boss, a moment from due again.' },
    ],
    [
      { id: 'thresher_sacrifice', name: 'Sacrifice', ab: 'wisp', text: 'Press F again while the Wisp is out to burst it: a blow for {d:320}, every faint affliction comes due at once, and you deal 10% more damage for 8s. Its cooldown counts from the moment it was summoned.' },
      { id: 'thresher_joined', name: 'Joined Swing', ab: 'reap', text: 'With the Wisp out, Reap makes it strike too: a second cut for {d:140}.' },
      { id: 'thresher_quick', name: 'Ferryman\'s Haste', ab: 'gather', cd: { gather: -4 }, text: 'Beckon recharges 4s faster.' },
    ],
    [
      { id: 'thresher_cull', name: 'Cull', ab: 'wisp', grants: true, text: 'New move on F, in place of Spirit Wisp. Cull (40s): take what is owed now. Every affliction on the boss pays out as if it were gold, whatever its age, and none is spent.' },
      { id: 'thresher_opengate', name: 'Open Gate', ab: 'reap', text: 'The fifth strike of Reaper\'s Gate no longer spends the afflictions: they stay on the boss, all four fully due.' },
      { id: 'thresher_omen', name: 'Omen of the Toll', ab: 'gather', text: 'Whenever the boss begins a cast, every affliction that is still faint comes due at once.' },
    ],
  ],
});

// ----------------------------------------------------------------------- TIDECALLER (healer, class 20)
TALENTS.tidecaller = [
  [
    { id: 'tidecaller_spindrift', name: 'Spindrift', ab: 'spray', text: 'Salt Spray thrown at high water breaks twice: a moment later the spray strikes again for {d:60}.' },
    { id: 'tidecaller_foam', name: 'Foam', ab: 'sip', text: 'A Sip on the ally who wears your Riptide Mark foams over: the most hurt other ally heals {h:60}.', spec: { springtide: 'A Swell on the ally who wears your Riptide Mark foams over: the most hurt other ally heals {h:60}.' } },
    { id: 'tidecaller_lowwater', name: 'Low Water', ab: 'sip', text: 'When the ebb touches the floor, your next Sip costs no tide and heals half again as much.', spec: { springtide: 'When the ebb touches the floor, your next Swell heals half again as much.' } },
  ],
  [
    { id: 'tidecaller_kelp', name: 'Kelp Bind', ab: 'riptide', text: 'Riptide Mark also binds its ally in kelp: they take 5% less damage while it lasts.' },
    { id: 'tidecaller_tidewalk', name: 'Tidewalk', ab: 'current', text: 'Current also carries you: you ride the water a short way in the direction you are heading.' },
    { id: 'tidecaller_seawall', name: 'Seawall', ab: 'breakwater', text: 'While Breakwater stands, every Sip also raises a wall of {s:80} around its ally.', spec: { springtide: 'While Breakwater stands, every Swell also raises a wall of {s:80} around its ally.' } },
  ],
  [
    { id: 'tidecaller_deep', name: 'Deep Water', ab: 'surge', text: 'The crest holds 1s longer.' },
    { id: 'tidecaller_moon', name: 'Moon Pull', ab: 'current', text: 'Whenever the boss begins a cast, the moon pulls the tide 10 higher.' },
    { id: 'tidecaller_maelstrom', name: 'Maelstrom', ab: 'riptide', grants: true, text: 'New move on E, in place of Riptide Mark. Maelstrom (15s): a whirlpool opens where you stand for 9s, and allies in it heal every 1.5s by the height of the tide when you cast it, from {h:40} up to {h:110}.' },
  ],
  [
    { id: 'tidecaller_sealegs', name: 'Sea Legs', ab: 'breakwater', text: 'While Breakwater stands, Surge is instant: cast it on the move.', spec: { undertow: 'While Breakwater stands, Undertow is instant: cast it on the move.' } },
    { id: 'tidecaller_ebbshield', name: 'Ebb Shield', ab: 'breakwater', text: 'When Breakwater falls, the water it held drains into a shield on the whole party, from {s:30} up to {s:120} by its height. The tide goes to the floor.' },
    { id: 'tidecaller_twin', name: 'Twin Currents', ab: 'current', text: 'Current can be pressed twice in a row: after the first press a second waits, and the cooldown counts from the second.' },
  ],
  [
    { id: 'tidecaller_leviathan', name: 'Leviathan', ab: 'surge', text: 'When Spring Flood ends after a Surge, the flood rises out of the deep and strikes the boss for {d:600}.', spec: { undertow: 'When Spring Flood ends after an Undertow, the flood rises out of the deep and strikes the boss for {d:600}.' } },
    { id: 'tidecaller_bore', name: 'Tidal Bore', ab: 'surge', grants: true, text: 'New move on R, in place of Surge. Tidal Bore: instant, spend all the tide in a wave rolled out ahead of you. It heals the party from {h:90} up to {h:360} by the tide and breaks on the boss for {d:30} up to {d:100}.' },
    { id: 'tidecaller_neap', name: 'Neap and Spring', ab: 'surge', text: 'The crests alternate short and long: a neap crest holds 0.75s less, a spring crest 1.5s more, and a Surge at a spring crest heals 20% more.', spec: { undertow: 'The crests alternate short and long: a neap crest holds 0.75s less, a spring crest 1.5s more, and an Undertow at a spring crest heals 20% more.' } },
  ],
];

// ----------------------------------------------------------------------- LANTERNKEEPER (healer, class 21)
TALENTS.lanternkeeper = [
  [
    { id: 'lanternkeeper_spark', name: 'Spark Chain', ab: 'trim', text: 'Trim the Wick leaps on to your second nearest lantern and tops up its wick too.' },
    { id: 'lanternkeeper_moth', name: 'Moth Light', ab: 'trim', text: 'Each Trim the Wick sends a moth to the lantern it tops up: everyone in that glow heals {h:30}.' },
    { id: 'lanternkeeper_emberward', name: 'Ember Ward', ab: 'set', text: 'A lantern set down while the boss is casting pulses as the cast lands: a shield of {s:60} on everyone in its glow.', spec: { beacon: 'A Great Beacon raised while the boss is casting pulses as the cast lands: a shield of {s:60} on everyone in its glow.', wayfarer: 'The first light of a Lamplighter\'s Stride begun while the boss is casting pulses as the cast lands: a shield of {s:60} on everyone in its glow.' } },
  ],
  [
    { id: 'lanternkeeper_ward', name: 'Lantern Ward', ab: 'hand', text: 'Whoever carries your Hand Lantern takes 10% less damage while it hangs on them.' },
    { id: 'lanternkeeper_longtoss', name: 'Long Toss', ab: 'carry', text: 'Carry the Flame reaches twice as far.', spec: { wayfarer: 'Trailblaze dashes twice as far.' } },
    { id: 'lanternkeeper_nightwalk', name: 'Night Walk', ab: 'carry', text: 'Carrying a lantern carries you too: you dash a short way on in the direction you are heading.', spec: { wayfarer: 'Trailblaze also tops up the wick of every light it drags.' } },
  ],
  [
    { id: 'lanternkeeper_hoard', name: 'Hoarded Embers', ab: 'set', text: 'You can hold 5 Embers instead of 4.' },
    { id: 'lanternkeeper_emberfall', name: 'Ember Fall', ab: 'set', text: 'A lantern that goes out with its wick burned to a stub gives you an Ember back.', spec: { wayfarer: 'Every fourth small light that goes out gives you an Ember back.' } },
    { id: 'lanternkeeper_wisp', name: 'Will-o\'-Wisp', ab: 'relight', grants: true, text: 'New move on F, in place of Relight. Will-o\'-Wisp (10s), 1 Ember: a wandering wisp floats to the most hurt ally and heals them {h:50} every second for 6s.' },
  ],
  [
    { id: 'lanternkeeper_twin', name: 'Twin Flare', ab: 'flare', text: 'Flare bursts twice: the second a beat after the first, at half strength.' },
    { id: 'lanternkeeper_flareshield', name: 'Flare Shield', ab: 'flare', text: 'Anyone a Flare reaches at full health takes a shield of {s:120} instead.' },
    { id: 'lanternkeeper_shadow', name: 'Shadow Catch', ab: 'flare', text: 'Flare first pulls every lantern on the floor up to 40 paces toward you.' },
  ],
  [
    { id: 'lanternkeeper_eternal', name: 'Eternal Lamp', ab: 'set', text: 'Lighthouse leaves a lantern at your feet that never burns down, healing {h:10} every second for the rest of the pull.' },
    { id: 'lanternkeeper_festival', name: 'Lantern Festival', ab: 'set', grants: true, text: 'New move on W, in place of Set Lantern. Lantern Festival (12s), 1 Ember: release five floating lanterns that drift over the party for 12s, each healing everyone under it {h:11} every second.' },
    { id: 'lanternkeeper_lastlight', name: 'Last Light', ab: 'relight', text: 'If Relight\'s heal lands on an ally under 20% health, they can\'t fall for 3s (once every 90s).' },
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
//  5. Test: node tools/talents.js <class> (each talent <= +7% pro DPS; BUILD <= +18% for rows I-V, BUILDALL <= +24%
//     for I-VII), then node tools/check.js ("Talents line up with the kits" checks shape, ids, grants, text).
const SPEC_TALENTS = {
  bloodreaver: {
    // Berserker, The Red Storm: risky damage, the closer to death the harder you hit
    berserker: [
      [
        { id: 'bloodreaver_painfuel', name: 'Pain Is Fuel', ab: 'hack', text: 'A heavy hit on you (a tenth of your HP or more) pours 15 Rage into you.' },
        { id: 'bloodreaver_scar', name: 'Scar Tissue', ab: 'drain', text: 'A Rampage thrown below 50% HP scars over the wound: you take 15% less damage for 5s.' },
      ],
      [
        { id: 'bloodreaver_bloodbath', name: 'Bloodbath', ab: 'letting', grants: true,
          text: 'Bloodletting becomes Bloodbath (15s, two charges): open a vein and fling the blood, {d:260} and 35 Rage, for 5% of your HP. The cut counts in your bank. Not below 30% HP.' },
        { id: 'bloodreaver_throes', name: 'Death Throes', ab: 'drain', text: 'Dropping below 30% HP makes your next two Rampages cost nothing, and your blood runs warm for each (once every 40s).' },
      ],
    ],
    // Hemomancer, The Blood Mage: what you drain flows to your allies
    hemomancer: [
      [
        { id: 'bloodreaver_spill', name: 'Spill Over', ab: 'drain', text: 'Crimson Drain\'s healing past your full HP spills over to the most hurt ally.' },
        { id: 'bloodreaver_bleedcast', name: 'Bleed the Cast', ab: 'letting', text: 'A Blood Lance thrown while the boss is casting mends the whole party for {h:70}.' },
      ],
      [
        { id: 'bloodreaver_pact', name: 'Crimson Pact', ab: 'frenzy', grants: true,
          text: 'Frenzy becomes Crimson Pact (60s): for 12s the healing Crimson Drain gives you flows to the whole party at three quarters of its strength, and your next three Drains are free and hit for {d:110} more. It gives no damage bonus.' },
        { id: 'bloodreaver_font', name: 'Blood Font', ab: 'drain', text: 'Crimson Drain opens a font of blood at your feet for 9s: allies who stand in it mend {h:60} every 1.5s (once every 20s).' },
      ],
    ],
  },
  runeguard: {
    // Spellwarden, The Warding Circle: Wards for the party
    spellwarden: [
      [
        { id: 'runeguard_foreseen', name: 'Foreseen Ward', ab: 'ward', text: 'Whenever the boss begins a cast, your next Runic Ward within 8s costs no Rune.' },
        { id: 'runeguard_chain', name: 'Chain Ward', ab: 'ward', text: 'A Ward that breaks all the way raises a new one on the most hurt ally, at half strength for 6s.' },
      ],
      [
        { id: 'runeguard_wardglyph', name: 'Glyph of Warding', ab: 'glyph', grants: true,
          text: 'Glyph Burst becomes Glyph of Warding: spend 3 Runes to ward every ally for {s:300} for 8s and cut the target for {d:560} ({d:730} in Runic Overload).' },
        { id: 'runeguard_surge', name: 'Warding Surge', ab: 'overload', text: 'Runic Overload also wards every ally for {s:250} for 8s.' },
      ],
    ],
    // Runeblade, The Carved Edge: melee damage with a sword combo
    runeblade: [
      [
        { id: 'runeguard_fan', name: 'Fanned Brand', ab: 'strike', text: 'Carve, the second hit, fans the burning rune on the boss: it burns once at once.' },
        { id: 'runeguard_smith', name: 'Wardsmith', ab: 'ward', text: 'Raising a Ward readies the blade: your next Rune Blade hit is a Carve.' },
      ],
      [
        { id: 'runeguard_counter', name: 'Counterstroke', ab: 'mirror', text: 'A reflect from Mirror Aegis readies a Counterstroke: your next Rune Cleave within 10s costs a single Rune instead of 3.' },
        { id: 'runeguard_storm', name: 'Rune Storm', ab: 'overload', text: 'During Runic Overload, Rune Blade is a three-hit combo: Cut > Carve > Burst, a burst of runes for {d:420}.' },
      ],
    ],
  },
  gorgemaw: {
    // Glutton, The Endless Appetite: eating the same thing twice
    glutton: [
      [
        { id: 'gorgemaw_matching', name: 'Matching Bite', ab: 'gnash', text: 'Gulp, the third bite of Gnash, now swallows a copy of your newest Morsel if the Belly has room (still once every 20s), so a pair is always at hand.' },
        { id: 'gorgemaw_chain', name: 'Chain Eater', ab: 'wide', text: 'Every Morsel you eat keeps your jaw open 0.6s longer (up to 3s in all), for the next.' },
      ],
      [
        { id: 'gorgemaw_frenzy', name: 'Feeding Frenzy', ab: 'bottomless', grants: true,
          text: 'Bottomless becomes Feeding Frenzy (120s): for 4s you eat everything, raidwides too, and every Morsel you eat is twice over: a copy of it joins the Belly.' },
        { id: 'gorgemaw_triple', name: 'Triple Course', ab: 'spit', text: 'Three Morsels of one shape in a row fuse into a Feast, 3.6 times as strong as one.' },
      ],
    ],
    // Gizzard, The Iron Stomach: what it swallows comes out as armour
    gizzard: [
      [
        { id: 'gorgemaw_reflex', name: 'Gastric Reflex', ab: 'digest', text: 'Whenever the boss begins a cast, a Digest that is still recharging comes back 5s sooner.' },
        { id: 'gorgemaw_grinder', name: 'Grinder', ab: 'digest', text: 'For 4s after a Digest, every Morsel you eat is digested at once.' },
      ],
      [
        { id: 'gorgemaw_banquet', name: 'Banquet', ab: 'bottomless', grants: true,
          text: 'Bottomless becomes Banquet (120s): for 4s you eat everything, raidwides too. When the jaw closes the whole Belly is digested at once, twice over.' },
        { id: 'gorgemaw_spitshield', name: 'Warm Spit', ab: 'spit', text: 'A Spit carries its shape\'s protection at half strength: a Ring shields everyone, a Lance the most hurt ally, a Fang trims the party\'s damage, a Spike shields the most hurt ally from all harm for 1s.' },
      ],
    ],
  },
  bastion: {
    // Sentinel, The Wall: the party behind the shield
    sentinel: [
      [
        { id: 'bastion_phalanx', name: 'Phalanx', ab: 'brace', text: 'Each Perfect Block locks one more shield into the line (up to 3, for 12s). Shield Bash sends them all out: every ally gets a {s:60} shield for each, for 6s.' },
        { id: 'bastion_interpose', name: 'Interpose', ab: 'edge', text: 'While you are above 60% HP, Shield Bash no longer guards you: for 4s the whole party takes 15% less damage instead.' },
      ],
      [
        { id: 'bastion_aegis', name: 'Aegis', ab: 'bulwark', grants: true,
          text: 'Bulwark becomes Aegis (120s): plant your shield as a dome for 8s. You take 25% less damage and the party 15% less, Brace\'s charges refill, and every Perfect Block under it heals the party for {h:60}.' },
        { id: 'bastion_rebuke', name: 'Rebuke', ab: 'edge', text: 'Bulwark now readies a Rebuke: your next Shield Bash within 10s costs no Resolve and strikes half again as hard.' },
      ],
    ],
    // Crusader, The Dawn Blade: Radiance and holy fire
    crusader: [
      [
        { id: 'bastion_dawnburn', name: 'Dawnburn', ab: 'edge', text: 'A Radiant Holy Edge leaves the light burning in the boss: {d:40} every 2s for 8s.' },
        { id: 'bastion_kindling', name: 'Kindling', ab: 'brace', text: 'Radiance now banks: Perfect Blocks stack it (up to 3). A Radiant Holy Edge spends every stack, 30% stronger for each, instead of 50% for one.' },
      ],
      [
        { id: 'bastion_verdict', name: 'Final Verdict', ab: 'blade', text: 'Judgment during Oath of Valor now kindles Radiance itself: your next Holy Edge is Radiant.' },
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
      { id: 'ranger_wind', name: 'Read the Wind', ab: 'pierce', text: 'Whenever the boss begins a cast, you draw a steadying breath: 2 Steady Aim at once, if you are standing still.' },
    ],
    [
      { id: 'ranger_deadeye', name: 'Dead Eye', ab: 'pierce', text: 'An Aimed Shot cast at 5 Steady Aim also lights Keen Eye, so the shot after it is instant.' },
      { id: 'ranger_overwatch', name: 'Overwatch', ab: 'quick', text: 'At 5 Steady Aim your bow looses a shot by itself every 4s, {d:60} each, for as long as you hold 5.' },
    ],
  ],
  venomstrike: [
    [
      { id: 'ranger_seep', name: 'Seep', ab: 'pierce', text: 'Caustic Arrow no longer empties the jar: a stack of Acid is left burning in the boss.' },
      { id: 'ranger_boil', name: 'Boiling Over', ab: 'quick', text: 'Whenever the boss begins a cast, the Acid on it boils: it ticks twice at once and gains 2 stacks.' },
    ],
    [
      { id: 'ranger_poisonmark', name: 'Poisoned Mark', ab: 'mark', text: 'While Hunter\'s Mark is up, every Quick Shot adds one more stack of Acid.' },
      { id: 'ranger_virulence', name: 'Virulence', ab: 'pierce', text: 'A Caustic Arrow that bursts 6 or more stacks leaves the boss sickened: it takes 6% more damage from everyone for 5s.' },
    ],
  ],
};

// ---- CHRONOMANCER: Echoist (everything happens twice) and Accelerant (the party moves to your beat)
SPEC_TALENTS.chronomancer = {
  echoist: [
    [
      { id: 'chronomancer_resonance', name: 'Resonance', ab: 'bolt', text: 'An echo of a Temporal Bolt that crits echoes once more, 3s later at the same strength.' },
      { id: 'chronomancer_reprise', name: 'Reprise', ab: 'rewind', text: 'Rewind echoes: 3s later it sets the same ally back again, catching whatever they lost since.' },
    ],
    [
      { id: 'chronomancer_held', name: 'Held Echo', ab: 'bolt', text: 'Echoes wait out a boss\'s cast (3s at most) and land the moment it does.' },
      { id: 'chronomancer_ringing', name: 'Ringing', ab: 'bolt', text: 'In Haste, every echo that lands gives back 3 Flux.' },
    ],
  ],
  accelerant: [
    [
      { id: 'chronomancer_pace', name: 'Pace Setter', ab: 'shift', text: 'Shifting into Haste also Quickens your linked ally: 12% faster for 15s (once every 20s).' },
      { id: 'chronomancer_credit', name: 'On Credit', ab: 'shift', text: 'Running out of Flux no longer ends Haste at once: it runs on for 4s on credit. Shift back in time and Paradox still goes off; stay, and you stumble when the credit is called in.' },
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
      { id: 'alembist_warn', name: 'Forewarned', ab: 'distill', text: 'Whenever the boss begins a cast, every vial in your bandolier ripens at once and its spoil clock starts over.' },
    ],
    [
      { id: 'alembist_cold', name: 'Cold Storage', ab: 'throw', text: 'A vial you have marked with its number key never spoils while the mark holds: save the right cure for the right moment.' },
      { id: 'alembist_quench', name: 'Quench', ab: 'throw', text: 'A Kiln Bomb now also bursts in cure: it heals the whole party for {h:150}.' },
    ],
  ],
  volatile: [
    [
      { id: 'alembist_flashpoint', name: 'Flashpoint', ab: 'distill', text: 'A Reaction comes out of the still fully heated, ready to throw at once.' },
      { id: 'alembist_damp', name: 'Damp Cloth', ab: 'distill', text: 'Catalyst also dampens every fuse in your bandolier: each burns 4s longer.' },
    ],
    [
      { id: 'alembist_whitehot', name: 'White-Hot', ab: 'throw', text: 'In the last 2s of its fuse a vial glows white-hot: thrown then, it is 12% stronger still.' },
      { id: 'alembist_slag', name: 'Slag', ab: 'throw', text: 'A Reaction you throw heats the Kiln by 2, and a vial whose fuse runs out in the bandolier heats it by 1.' },
    ],
  ],
};

// ---- SHADOWBLADE: Bladedancer (the whirling edge: Blade Fury, Tempo and the Flourish) and Nightstalker (the knife behind: Backstab, Stalking)
SPEC_TALENTS.shadowblade = {
  bladedancer: [
    [
      { id: 'shadowblade_encore', name: 'Encore', ab: 'step', text: 'A Flourish leaves one Tempo behind: the next one needs only two more perfect finishers.' },
      { id: 'shadowblade_pirouette', name: 'Pirouette', ab: 'step', text: 'Blade Fury now whirls you round the boss to its far side, and for 1.5s you take 25% less damage.' },
    ],
    [
      { id: 'shadowblade_curtain', name: 'Curtain Call', ab: 'dance', text: 'When Shadow Dance ends you close it with one last spin: {d:500} on the boss.' },
      { id: 'shadowblade_eye', name: 'Eye of the Storm', ab: 'step', text: 'While you hold 3 Tempo, the blades turn blows aside: you take 20% less damage until the Flourish is spent.' },
    ],
  ],
  nightstalker: [
    [
      { id: 'shadowblade_deaddrop', name: 'Dead Drop', ab: 'step', text: 'The Backstab you land while Stalking, after a Shadowstep, has a 30% better chance to crit.' },
      { id: 'shadowblade_cloak', name: 'Cloak of Night', ab: 'evis', text: 'A Backstab that lands from behind hides you in the dark: you take 25% less damage for 3s.' },
    ],
    [
      { id: 'shadowblade_shade', name: 'Shade', ab: 'step', text: 'Shadowstep leaves your shade where you stood: 2s later it stabs the boss from the front for {d:80}, while you work behind.' },
      { id: 'shadowblade_veil', name: 'Veil of Night', ab: 'dance', text: 'Shadow Dance now draws the dark over the whole party: for its first 4s everyone takes 10% less damage.' },
    ],
  ],
};

// ---- PYROMANCER: Cataclysm (the falling star: Meteor, craters) and Sigilmancer (the burning circle: Ember Circle)
SPEC_TALENTS.pyromancer = {
  cataclysm: [
    [
      { id: 'pyromancer_stoke', name: 'Stoke the Crater', ab: 'fireball', text: 'A Fireball cast while a Meteor\'s crater burns stokes it: the flames flare for {d:20} at once.' },
      { id: 'pyromancer_ash', name: 'Smothering Ash', ab: 'pyro', text: 'A Meteor that lands while the boss is casting smothers the blow: everyone takes 10% less damage for 4s.' },
    ],
    [
      { id: 'pyromancer_fault', name: 'Fault Line', ab: 'pyro', text: 'A Meteor that lands on a crater that still burns sets the ground off: a third of what the old crater had left to burn lands at once.' },
      { id: 'pyromancer_boil', name: 'Boil Over', ab: 'fireball', text: 'Heat that reaches 100 no longer burns or weakens you: it boils over into the boss as a blast for {d:220}, and Heat starts again from 0.' },
    ],
  ],
  sigilmancer: [
    [
      { id: 'pyromancer_hearth', name: 'Hearth', ab: 'combust', text: 'While you stand in your Ember Circle the whole party takes 8% less damage: plant it where the fight will be.' },
      { id: 'pyromancer_rekindle', name: 'Rekindle', ab: 'combust', text: 'Stepping back into your Ember Circle after leaving it flares it: {d:140} on the boss, and your next Fireball is instant (within 8s, once every 6s).' },
    ],
    [
      { id: 'pyromancer_beacon', name: 'Beacon', ab: 'combust', text: 'Whenever the boss begins a cast while you stand in your Ember Circle, the circle flares: {d:110} on the boss, and everyone takes 10% less damage for 4s.' },
      { id: 'pyromancer_recall', name: 'Cinder Recall', ab: 'fireblast', text: 'A Fire Blast fired while you stand outside your Ember Circle blinks you back to its heart.' },
    ],
  ],
};

// ---- THERMIST: Pendulum (the swinging weight: Momentum) and Zenith (the burning edge: Redline, Strain)
SPEC_TALENTS.thermist = {
  pendulum: [
    [
      { id: 'thermist_crescendo', name: 'Crescendo', ab: 'invert', text: 'A Thermal Shock set off at full Momentum (5) is always a critical hit.' },
      { id: 'thermist_counterweight', name: 'Counterweight', ab: 'equil', text: 'Every crossing of 0 wraps you in a shield of {s:30} for each Momentum you hold, for 6s.' },
    ],
    [
      { id: 'thermist_bell', name: 'Tolling Bell', ab: 'invert', text: 'Whenever the boss begins a cast, the dial swings a step toward the other side by itself.' },
      { id: 'thermist_deadcentre', name: 'Dead Centre', ab: 'equil', text: 'Equilibrium now counts as a crossing of 0: it adds a stack of Momentum and keeps them from fading.' },
    ],
  ],
  zenith: [
    [
      { id: 'thermist_pressure', name: 'Pressure Release', ab: 'equil', text: 'Bleed Off no longer lets the heat go to waste: it scalds the boss for {d:25} for every 10 Strain it vents.' },
      { id: 'thermist_slag', name: 'Slag Plate', ab: 'flare', text: 'Each time you reach the edge, slag cools over you in a shield of {s:100} for 8s (once every 10s).' },
    ],
    [
      { id: 'thermist_meltdown', name: 'Controlled Meltdown', ab: 'invert', grants: true,
        text: 'Inversion becomes Controlled Meltdown (60s): let go on purpose, from 3 or more steps out. All your Strain goes out in one blast, {d:200} plus {d:5} for every point, and the dial snaps to 0 with a Thermal Shock half again as strong as the swing. Nothing burns, nothing seizes up, and for 6s your spells still hit as hard as in Redline.' },
      { id: 'thermist_alert', name: 'Red Alert', ab: 'equil', text: 'Whenever the boss begins a cast while you hold the edge, Bleed Off comes off cooldown at once.' },
    ],
  ],
};

// ----------------------------------------------------------------------- DRIFTBLADE
Object.assign(SPEC_TALENTS, {
  driftblade: {
    // Orbit, The Circling Hawk: round and round, a full Orbit cuts on its own
    orbit: [
      [
        { id: 'driftblade_slingshot', name: 'Slingshot', ab: 'cross', text: 'Crosswind with 3 Orbit or more takes the Orbit with it: the stacks are spent and the blade curves back round the boss, cutting again for {d:40} for each.' },
        { id: 'driftblade_spiral', name: 'Spiral In', ab: 'carve', text: 'While you hold a full Orbit, each automatic cut hits 5% harder than the last (up to 25%). It starts over when the Orbit falls.' },
      ],
      [
        { id: 'driftblade_eye', name: 'Eye of the Hawk', ab: 'carve', text: 'Whenever the boss begins a cast, your Orbit fills at once and the hawk stoops on it for {d:60} for every stack it gained.' },
        { id: 'driftblade_roost', name: 'Roost', ab: 'gale', grants: true,
          text: 'Gale Run becomes Roost (60s): settle on the wind for 8s. Your Orbit stays full whether you circle or not, Carve cuts on its own every second, your Drift holds, and you take 20% less damage.' },
      ],
    ],
    // Comet, The Long Charge: build the run, then let it fall
    comet: [
      [
        { id: 'driftblade_ricochet', name: 'Ricochet', ab: 'cross', text: 'Impact lights the way back: for 4s a Hook Turn also flings you back through the boss, a Passing Strike, and gives 20 more Drift.' },
        { id: 'driftblade_afterburn', name: 'Afterburn', ab: 'cross', text: 'Impact no longer spends everything: a little of the Drift it released stays lit: 6% of it, up to 12.' },
      ],
      [
        { id: 'driftblade_starfall', name: 'Starfall', ab: 'gale', grants: true,
          text: 'Gale Run becomes Starfall (45s): needs 120 Drift. Spend it all and call the star down on the boss for {d:300}, plus {d:80} for every 10 Drift. It always crits, and the fall throws you 150 px the way you\'re heading.' },
        { id: 'driftblade_zenith', name: 'Zenith', ab: 'carve', text: 'Whenever the boss begins a cast, your charge hangs at its peak for 5s: Drift cannot drain, and Impact needs only 60.' },
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
        { id: 'gloomsworn_cover', name: 'Cover', ab: 'strike', text: 'Whenever the boss begins a cast that is not on you, your next Gloom Strike within 8s spends no Gloom (it needs none), and the barrier it lays on the most hurt ally is doubled ({s:220}).' },
        { id: 'gloomsworn_brim', name: 'Brimming Vessel', ab: 'strike', text: 'The moment your vessel fills to the brim, a pall falls over the whole party: 10% less damage taken for 8s (once every 20s).' },
      ],
      [
        { id: 'gloomsworn_wardmantle', name: 'Warden\'s Mantle', ab: 'mantle', grants: true,
          text: 'Black Mantle becomes Warden\'s Mantle (60s): the same dark, 40% less damage taken for 8s and 15 Gloom. For those 8s every hit that gets through lays a barrier of {s:45} on the most hurt ally (one a second).' },
        { id: 'gloomsworn_hollowwall', name: 'Wall Within', ab: 'pall', text: 'While you are Hollow, Black Pall costs no Gloom.', },
      ],
    ],
    // Reaver of Dusk, The Hollow Blade: the dark as a weapon
    duskreaver: [
      [
        { id: 'gloomsworn_hunger', name: 'Hollow Hunger', ab: 'strike', text: 'While you are Hollow, Gloom Strike costs 20 Gloom instead of 40.' },
        { id: 'gloomsworn_gravecut', name: 'Gravecut', ab: 'shade', text: 'Shade Step lands straight in the third strike: your next Rend is Gloaming.' },
      ],
      [
        { id: 'gloomsworn_pact', name: 'Dark Pact', ab: 'mantle', grants: true,
          text: 'Black Mantle becomes Dark Pact (75s): the vessel fills to the brim at once and your next two Gloom Strikes echo, but the dark takes a tenth of your health for it.' },
        { id: 'gloomsworn_debt', name: 'Debt Collected', ab: 'strike', text: 'When a Hollow ends with you standing, the debt you ran up breaks over the boss in black fire: half of it, up to {d:900}.' },
      ],
    ],
  },
  cleric: {
    // Aegis, The Golden Wall: stop the damage before it lands
    aegis: [
      [
        { id: 'cleric_gilded', name: 'Gilded Dawn', ab: 'smite', text: 'Dawnstar\'s light hardens into armour: every ally is wrapped in a shield of {s:120} for 8s.' },
        { id: 'cleric_foresight', name: 'Foresight', ab: 'mend', text: 'A Divine Barrier or Dawn Petal cast while the boss is casting has its shield half again as strong.' },
      ],
      [
        { id: 'cleric_overflow', name: 'Golden Overflow', ab: 'petal', text: 'A Petal that would grow past 3 no longer blooms onto the most hurt ally: it hardens into a shield of {s:70} on the whole party for 8s. It still counts toward Dawnstar.' },
        { id: 'cleric_reflected', name: 'Reflected Gold', ab: 'petal', text: 'When a Petal shield soaks enough to give its Petal back, the light it caught is thrown at the boss for {d:70}.' },
      ],
    ],
    // Inquisitor, The Burning Verdict: judgment first, mercy after
    inquisitor: [
      [
        { id: 'cleric_openverdict', name: 'Open Verdict', ab: 'smite', text: 'Whenever the boss begins a cast, your next Smite within 8s is instant and brands 4 hits instead of 2.' },
        { id: 'cleric_penance', name: 'Penance', ab: 'petal', text: 'Every Dawn Petal you spend also brands the boss for 2 hits: mercy first, then the verdict.' },
      ],
      [
        { id: 'cleric_absolve', name: 'Absolution', ab: 'mend', text: 'Mend also brands the boss for 2 hits and washes Vulnerability and Damage Down off its target (once every 15s): judgment first, mercy after.' },
        { id: 'cleric_judgehour', name: 'Judge\'s Hour', ab: 'smite', text: 'A Dawnstar thrown while the party\'s damage is boosted brands 8 hits instead of 4.' },
      ],
    ],
  },
  grovekeeper: {
    // Lifebinder, The Deep Roots: heal before the hit
    lifebinder: [
      [
        { id: 'grovekeeper_drinking', name: 'Deep Drinking', ab: 'rejuv', text: 'Both Lifebind roots feed the grove: the second root\'s ticks grow Bloom too (3 each), and Bloom reaches its ally.' },
        { id: 'grovekeeper_brimming', name: 'Overflowing Bloom', ab: 'bloom', text: 'A Bloom spent with 90 or more in the vessel overflows: the whole party is healed for {h:220} as well.' },
      ],
      [
        { id: 'grovekeeper_canopy', name: 'Canopy', ab: 'growth', grants: true,
          text: 'Wild Growth becomes Canopy (60s): everyone under your Lifebind takes 25% less damage for 8s and is healed for {h:150}. The whole party heals {h:90} every 3s for 15s, and your heals are 25% stronger for 15s, as before.' },
        { id: 'grovekeeper_evergreen', name: 'Evergreen', ab: 'rejuv', text: 'When Lifebind runs out on your chosen ally, it takes root again at once if you spend 40 Bloom.' },
      ],
    ],
    // Moonwell, The Silver Pool: placed healing
    moonwell: [
      [
        { id: 'grovekeeper_tide', name: 'Tidal Shift', ab: 'growth', text: 'Moonwell can be cast again within 8s at no cooldown: the pool lifts and settles at another ally\'s feet, with what is left of its time.' },
        { id: 'grovekeeper_veil', name: 'Argent Veil', ab: 'growth', text: 'A Moonwell set down while the boss is casting also wraps everyone standing in it in a barrier of {s:200} for 8s.' },
      ],
      [
        { id: 'grovekeeper_afterglow', name: 'Afterglow', ab: 'growth', text: 'When Moonwell ends, it rises again at your own feet for 6s, healing {h:60} every 1.5s to all inside.' },
        { id: 'grovekeeper_moonwrath', name: 'Moonlit Wrath', ab: 'wrath', text: 'While Moonwell lasts every Wrath is instant, and each calls a moonbeam: the most hurt ally is healed for a fifth of its damage.' },
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
        { id: 'threadweaver_hub', name: 'Hub and Spoke', ab: 'tie', text: 'A Tie that pulls an ally along a thread now makes them the hub: a pulse of {h:100} runs down every thread you hold on them, to its far end.' },
        { id: 'threadweaver_drawn', name: 'Drawn Taut', ab: 'tie', text: 'Whenever the boss begins a cast, your web draws taut: the whole party takes 2% less damage for each thread you hold (up to 5, so 10%) for 5s.' },
      ],
      [
        { id: 'threadweaver_thrum', name: 'Thrum', ab: 'snip', grants: true,
          text: 'New move on R, in place of Snap. Thrum (20s): pluck every thread you hold and leave it whole. Each rings with a {h:90} heal to both its ends, and the party takes 3% less damage for 4s for each thread (up to 5, so 15%).' },
        { id: 'threadweaver_ahead', name: 'Stitched Ahead', ab: 'tie', text: 'Tying an ally while you already hold 3 threads or more readies the next heal: your next Mend Seam (or Embroider) within 6s is instant, even with no Spool.' },
      ],
    ],
    // Shears, The Cut Thread: tie it, let it take the strain, then cut it loose
    shears: [
      [
        { id: 'threadweaver_spare', name: 'Spare Thread', ab: 'snip', text: 'A Snap that cuts a thread leaves you a Spare Thread for 6s: your next Tie costs no charge.' },
        { id: 'threadweaver_judgment', name: 'Snap Judgment', ab: 'snip', text: 'Whenever the boss begins a cast, Snap is ready again at once.' },
      ],
      [
        { id: 'threadweaver_severance', name: 'Severance', ab: 'tapestry', grants: true,
          text: 'New move on F, in place of Tapestry. Severance (60s): cut every thread you hold at once. Each releases what it carried in the last 5s to both its ends (at least {h:170}), gives back 10 Spool each, and for 5s the party takes 15% less damage.' },
        { id: 'threadweaver_looseends', name: 'Loose Ends', ab: 'snip', text: 'The ends of every thread Snap cuts stay bound for 6s: each of them heals {h:50} every 1.5s.' },
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
          text: 'New move on Q, in place of Cue. Strum: pluck the strings for a {d:230} cut along the line when it is across the enemy ({d:90} when not), add 24 to Taut String and build 1 Encore. It sends no quick Jabs.' },
        { id: 'marionettist_garrote', name: 'Garrote', ab: 'finale', text: 'With every beat of Grand Finale the strings pull tight round the enemy and cut as well, for 40% of what the line cuts each second.' },
      ],
    ],
    // Understudy, Two Dolls on One Bar: the Stage is the whole party's
    understudy: [
      [
        { id: 'marionettist_house', name: 'Packed House', ab: 'cross', text: 'A Cross-Cut that cuts while the enemy stands in the Stage gives the whole party 4% more damage for 8s.' },
        { id: 'marionettist_presence', name: 'Stage Presence', ab: 'cue', text: 'While the enemy stands in the Stage, Cue and Pull Strings each build 1 more Encore.' },
      ],
      [
        { id: 'marionettist_crossfire', name: 'Crossfire', ab: 'cross', grants: true,
          text: 'New move on E, in place of Cross-Cut. Crossfire: the Dolls haul their strings taut between them, wherever you stand. With the enemy on that line it is a {d:500} cut and 2 Encore. A Swap just before doubles it, as for Cross-Cut.' },
        { id: 'marionettist_together', name: 'Stand Together', ab: 'swap', text: 'A Swap (or a Red Curtain) made while the enemy stands in the Stage rallies the party: everyone takes 8% less damage for 5s.' },
      ],
    ],
  },
  thresher: {
    // Wraith, The Swift Shadow: pace, and an hour that never waits
    sower: [
      [
        { id: 'thresher_anchor', name: 'Anchored Thread', ab: 'hook', text: 'The Thread does not darken: after its first faint moment it stays gold on the boss until a Reap spends it.' },
        { id: 'thresher_fleet', name: 'Fleet Hour', ab: 'reap', text: 'Every Reap quickens you: you act 12% faster for 5s.' },
      ],
      [
        { id: 'thresher_hourglass', name: 'Hourglass', ab: 'blink', grants: true,
          text: 'New move on D, in place of Gloam Blink. Hourglass (28s): cut through the dark to the boss for {d:140} and turn the glass: for 5s no affliction on the boss darkens or lapses, and you take 50% less damage for 1s.' },
        { id: 'thresher_lasthour', name: 'Last Hour', ab: 'reap', text: 'A Reap that cashes in four gold afflictions tolls the hour for everyone: the whole party deals 4% more damage for 6s.' },
      ],
    ],
    // Grim, The Patient Reaper: let it darken, then one great reckoning
    grim: [
      [
        { id: 'thresher_deepening', name: 'Deepening Toll', ab: 'reap', text: 'A due affliction pays more the longer it waits: 8% more for every second past due, up to 40% more.' },
        { id: 'thresher_darken', name: 'Let It Darken', ab: 'reap', text: 'Reap now leaves faint afflictions alone: they stay on the boss to darken, and pay nothing.' },
      ],
      [
        { id: 'thresher_nightfall', name: 'Nightfall', ab: 'blink', grants: true,
          text: 'New move on D, in place of Gloam Blink. Nightfall (25s): cut through the dark to the boss for {d:140}. For 5s every affliction on it darkens three times as fast, and you take 50% less damage for 1s.' },
        { id: 'thresher_wound', name: 'Open Wound', ab: 'reap', text: 'While the boss is Vulnerable, a Reap pays every affliction as if it were gold, whatever its age.' },
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
        { id: 'ironpalm_ripples', name: 'Ripples', ab: 'read', text: 'A perfect Read on a tankbuster ripples out to the party: everyone takes 15% less damage for 5s.' },
        { id: 'ironpalm_flood', name: 'Flood Tide', ab: 'palm', text: 'A perfect Read, on any blow, brings the tide in: your next two named moves each wash out a second blow for {d:25}.' },
      ],
      [
        { id: 'ironpalm_calm', name: 'Calm Before the Blow', ab: 'read', text: 'Whenever the boss begins a cast aimed at you, you draw a long breath: your Breath fills to the top.' },
        { id: 'ironpalm_heron', name: 'Heron\'s Stance', ab: 'kick', text: 'Crane Step ends in a reading stance: for 1.2s you take 20% less damage, and a hit that lands in its first 0.4s is read, as if you had pressed Read.' },
      ],
    ],
    // Avalanche Fist, The Falling Mountain: long strings and the Momentum they build
    avalanche: [
      [
        { id: 'ironpalm_cascade', name: 'Cascade', ab: 'fist', text: 'A named move of four inputs or more brings the rocks down behind it: a rockfall of {d:5} for every point of Momentum.' },
        { id: 'ironpalm_bedrock', name: 'Bedrock', ab: 'palm', text: 'While you hold 6 Momentum or more you take 10% less damage.' },
      ],
      [
        { id: 'ironpalm_wake', name: 'Mountain Wakes', ab: 'kick', text: 'Whenever the boss begins a cast aimed at you, your Momentum leaps to full and holds for 8s.' },
        { id: 'ironpalm_scree', name: 'Scree', ab: 'fist', text: 'A named move of four inputs or more throws up rubble for the party: the most hurt ally gets a {s:100} shield, and {s:25} more for every point of Momentum.' },
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
        { id: 'oathbroker_endorse', name: 'Endorsement', ab: 'collect', text: 'Every Collect strike that pays a co-signed line down also puts a {s:60} shield on that ally for 6s.' },
        { id: 'oathbroker_roving', name: 'Roving Surety', ab: 'lien', text: 'Co-Sign no longer stays where you put it: every 3s it moves on to whoever is hurt most.' },
      ],
      [
        { id: 'oathbroker_foresight', name: 'Foresight', ab: 'lien', text: 'Whenever the boss begins a cast, Co-Sign is ready again at once (at most once every 10s).' },
        { id: 'oathbroker_blanket', name: 'Blanket Surety', ab: 'writ', grants: true,
          text: 'Writ of Protection becomes Blanket Surety (90s): stand surety for the whole party. Everyone takes 20% less damage for 8s, and a fifth of your HP is written into your Ledger at once, due like any other entry.' },
      ],
    ],
    // Collector, The Debt Comes Due: the bigger the books, the harder the blow
    collector: [
      [
        { id: 'oathbroker_overdraft', name: 'Overdraft', ab: 'collect', text: 'Only the third strike pays your Ledger down: Dun and Levy leave it be. The Ledger is left to grow, and every bill that comes due strikes the boss all the same.' },
        { id: 'oathbroker_compound', name: 'Compound Interest', ab: 'lien', text: 'Every bill that comes due under Lien swells the entries still on the books by 15%.' },
      ],
      [
        { id: 'oathbroker_warrant', name: 'Warrant', ab: 'writ', grants: true,
          text: 'Writ of Protection becomes Warrant (60s): serve the boss with a warrant. A blow for {d:250}, and for 10s it takes 6% more damage from the whole party. You take 15% less damage while it stands.' },
        { id: 'oathbroker_rollover', name: 'Rollover', ab: 'default', text: 'Foreclose no longer tears the Ledger up: it strikes for 90% of the usual, and every entry stays on the books to come due as written.' },
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
      { id: 'tidecaller_brine', name: 'Brine Lash', ab: 'surge', text: 'Surge also breaks on the boss, from {d:15} at low water up to {d:55} at high water.' },
    ],
  ],
  // Undertow, The Deep Pull: pull the hurt down, give it back slowly
  undertow: [
    [
      { id: 'tidecaller_bell', name: 'Drowned Bell', ab: 'surge', text: 'When your Deep Shield runs its course, a drowned bell tolls: the party heals {h:60} up to {h:120} by the water Undertow spent.' },
      { id: 'tidecaller_grip', name: 'Grip of the Deep', ab: 'riptide', text: 'Riptide Mark pulls from two allies: the most hurt other ally is marked too, heals with it and pops with it.' },
    ],
    [
      { id: 'tidecaller_pressure', name: 'Pressure', ab: 'spray', text: 'While your Deep Shield stands, Salt Spray hits 7% harder.' },
      { id: 'tidecaller_slack', name: 'Slack Water', ab: 'current', text: 'Current pressed while your Deep Shield stands holds its drain: the shield stands 4s longer, topped up by {s:100}, and the party heals {h:40} twice.' },
    ],
  ],
};

// ----------------------------------------------------------------------- LANTERNKEEPER
SPEC_TALENTS.lanternkeeper = {
  // Beacon, The Fixed Star: a few bright fixed lights
  beacon: [
    [
      { id: 'lanternkeeper_keeper', name: 'Lighthouse Keeper', ab: 'set', text: 'A Great Beacon leans toward the most hurt ally in its glow: its pulse heals them 30% more.' },
      { id: 'lanternkeeper_signal', name: 'Signal Fire', ab: 'set', text: 'While two Great Beacons are lit, a line of light joins them: anyone standing on it, outside both glows, heals half a pulse every second.' },
    ],
    [
      { id: 'lanternkeeper_hearth', name: 'Hearth', ab: 'set', text: 'An ally who stays in a Great Beacon\'s glow for 6s heals {h:90}, and again for every 6s more they stay.' },
      { id: 'lanternkeeper_pillar', name: 'Pillar of Flame', ab: 'set', text: 'A Great Beacon with the boss in its glow scorches it for {d:15} every 3s.' },
    ],
  ],
  // Wayfarer, The Road Lamp: lights that follow you
  wayfarer: [
    [
      { id: 'lanternkeeper_pathfinder', name: 'Pathfinder', ab: 'carry', text: 'Trailblaze drops two small lights along its way, and they heal double.' },
      { id: 'lanternkeeper_breadcrumbs', name: 'Breadcrumbs', ab: 'set', text: 'Your three newest small lights glow 30% brighter and last 4s longer.' },
    ],
    [
      { id: 'lanternkeeper_pilgrim', name: 'Pilgrim\'s Pace', ab: 'flare', text: 'Keep moving for 5s without stopping and your next Flare heals 30% more.' },
      { id: 'lanternkeeper_sparks', name: 'Trailing Sparks', ab: 'set', text: 'Walk back through a small light of yours and it flares to full and stings the boss for {d:60} (once per light).' },
    ],
  ],
};

// ----------------------------------------------------------------------- KENSEIER (tank, class 22)
TALENTS.kenseier = [
  [
    { id: 'kenseier_riposte', name: 'Riposte', ab: 'deflect', text: 'A Perfect deflect makes your next Ember Cut skip to the third step (at most once every 10s).' },
    { id: 'kenseier_emberedge', name: 'Ember Edge', ab: 'cut', text: 'The third cut sets a burn on the boss that adds 1 Posture a second for 6s.' },
    { id: 'kenseier_feint', name: 'Feint', ab: 'deathblow', text: 'Right after a Good deflect, Pommel can be pressed at once, off the global cooldown, to turn that deflect into a Perfect: the Posture you missed comes with it, and everything a Perfect sets off. It needs the Pommel ready (8s cooldown).',
      spec: { warden: 'Right after a Good deflect, Redirect can be pressed at once, off the global cooldown, to turn that deflect into a Perfect: the Posture you missed comes with it, and everything a Perfect sets off. It needs Redirect ready (8s cooldown).' } },
  ],
  [
    { id: 'kenseier_ironbreath', name: 'Iron Breath', ab: 'deflect', text: 'Poise refills twice as fast while you are not being hit.' },
    { id: 'kenseier_longstep', name: 'Long Step', ab: 'mikiri', text: 'Mikiri Step carries you twice as far.' },
    { id: 'kenseier_secondwind', name: 'Second Wind', ab: 'mantle', cd: { mantle: -15 }, text: 'Ash Mantle has a 45s cooldown.' },
  ],
  [
    { id: 'kenseier_crack', name: 'Crack', ab: 'deathblow', text: 'A Break leaves the boss\'s Posture bar starting at 25 afterward, instead of empty.' },
    { id: 'kenseier_shatter', name: 'Shatter', ab: 'deflect', text: 'A Perfect deflect on a tankbuster Breaks the boss at once if its Posture is above half.' },
    { id: 'kenseier_whirlwind', name: 'Whirlwind Slash', ab: 'mikiri', grants: true, text: 'New move on E, in place of Mikiri Step. Whirlwind Slash (12s): a spin that cuts every enemy in reach for {d:50} and adds 4 Posture for each one it hits, so adds count. For fights with adds.' },
  ],
  [
    { id: 'kenseier_fireside', name: 'Fireside Guard', ab: 'guard', text: 'Guard Stance shields two allies instead of one.', spec: { deathblade: 'Iai Stance\'s counter-cut also shields the most hurt ally for {s:150}.' } },
    { id: 'kenseier_unbroken', name: 'Unbroken', ab: 'mantle', text: 'While Ash Mantle is up, a deflect that catches nothing costs no Poise.' },
    { id: 'kenseier_blazing', name: 'Blazing Mantle', ab: 'mantle', text: 'Ash Mantle ends in a burst of ember: {d:100} for every Perfect deflect you made inside it.' },
  ],
  [
    { id: 'kenseier_grand', name: 'Grand Deathblow', ab: 'deathblow', text: 'A Deathblow in the first second of a Break hits 20% harder.' },
    { id: 'kenseier_duel', name: 'Ember Duel', ab: 'guard', grants: true, text: 'New move on F, in place of Guard Stance. Ember Duel (90s): for 10s the boss\'s autos come at a steady beat, every 2s exactly, and every Perfect deflect adds double Posture.' },
    { id: 'kenseier_lastspark', name: 'Last Spark', ab: 'deathblow', text: 'When you Break the boss yourself, Thousand Cuts charges by a quarter (not on the Break Thousand Cuts makes).' },
  ],
];

// ----------------------------------------------------------------------- HOUNDMASTER (melee damage, class 23): rows I-V
// New behaviour, one plain number (Thick Coat). Rows III and V grant a move (Howl on W, The Long Chase on F: TALENT_ABILITIES in
// kits.js). The talents act on the hounds and the pair they hold (kits.js hd* helpers).
TALENTS.houndmaster = [
  [
    { id: 'houndmaster_heelnip', name: 'Heel Nip', ab: 'knife', text: 'The third knife hit also sends whichever hound is nearer to the place that would make a pair with the other one. Nothing happens if they already hold a pair, or are on guard.' },
    { id: 'houndmaster_scentline', name: 'Scent Line', ab: 'flank', text: 'Whistle: Flank sends the hound straight through the boss, and it bites on the way for {d:120} (at most once every 2.5s).' },
    { id: 'houndmaster_echobark', name: 'Echo Bark', ab: 'finisher', text: 'A finisher of the same pair twice in a row repeats a moment later at 20% of its strength.' },
  ],
  [
    { id: 'houndmaster_guarddog', name: 'Guard Dog', ab: 'calloff', text: 'Call Off also sets a hound between you and the next hit: a {s:200} shield on you for 8s (once per Call Off).' },
    { id: 'houndmaster_fetch', name: 'Fetch', ab: 'calloff', text: 'Call Off also drags you 150 toward the nearest hound as it sets off to you. It never takes you into the boss.' },
    { id: 'houndmaster_thickcoat', name: 'Thick Coat', ab: 'calloff', text: 'A downed hound is back on its feet after 6s instead of 10s.' },
  ],
  [
    { id: 'houndmaster_sharedkill', name: 'Shared Kill', ab: 'finisher', text: 'A finisher on a boss below 30% health gives back 20 Bond.' },
    { id: 'houndmaster_howl', name: 'Howl', ab: 'flank', grants: true, text: 'New move on W, in place of Whistle: Flank. Howl (25s): both hounds throw back their heads. The whole party deals 5% more damage for 8s, and both hounds hold where they stand (a second press of the Hold button pounces).' },
    { id: 'houndmaster_runningbond', name: 'Running Bond', ab: 'finisher', text: 'Bond fills while a hound runs to a new place: 5 a second for each one that is on the move.' },
  ],
  [
    { id: 'houndmaster_bloodscent', name: 'Blood Scent', ab: 'quarry', text: 'Mark the Quarry spreads to the nearest add: while it lasts, every bite also bites it.' },
    { id: 'houndmaster_drive', name: 'Drive', ab: 'quarry', text: 'Mark the Quarry also makes both hounds hold their places for as long as the Mark lasts.' },
    { id: 'houndmaster_cornered', name: 'Cornered', ab: 'quarry', text: 'When the Mark ends, both hounds pounce at once and land behind the boss.' },
  ],
  [
    { id: 'houndmaster_kingofpack', name: 'King of the Pack', ab: 'finisher', text: 'The spectral hounds of Wild Hunt stay for 4s after it ends.' },
    { id: 'houndmaster_longchase', name: 'The Long Chase', ab: 'quarry', grants: true, text: 'New move on F, in place of Mark the Quarry. The Long Chase (45s): the pack runs a lap round the boss. Each quarter it passes bites for {d:250} and gives 4 Bond, and the lap ends with both hounds behind the boss: a Bring Down.' },
    { id: 'houndmaster_alpha', name: 'Alpha', ab: 'finisher', text: 'A Bring Down is a sure critical hit when both hounds have their own Bond full.' },
  ],
];

// ----------------------------------------------------------------------- KENSEIER
SPEC_TALENTS.kenseier = {
  // Deathblade, The Kill Stroke: all in on the parry and the Deathblow
  deathblade: [
    [
      { id: 'kenseier_cleave', name: 'Cleaving Death', ab: 'deathblow', text: 'Deathblow also cuts every add near the boss, for 60% of its strength.' },
      { id: 'kenseier_patient', name: 'Patient Edge', ab: 'deathblow', text: 'A Break you did not spend a Deathblow on within 2s gives the party +5% damage for what is left of it, instead.' },
    ],
    [
      { id: 'kenseier_crane', name: 'Crane Form', ab: 'guard', text: 'Iai Stance\'s counter-cut adds 10 Posture.' },
      { id: 'kenseier_double', name: 'Double Stroke', ab: 'deathblow', text: 'Deathblow strikes twice: a second, smaller stroke ({d:110}) follows a moment later.' },
    ],
  ],
  // Warden of the Ash, The Turning Blade: turn the blow from your allies, or back on the boss
  warden: [
    [
      { id: 'kenseier_longguard', name: 'Long Guard', ab: 'deflect', text: 'Deflect reaches an ally within 180 of you instead of 120.' },
      { id: 'kenseier_emberreturn', name: 'Ember Return', ab: 'deathblow', text: 'Redirect also heals you for what it deals.' },
    ],
    [
      { id: 'kenseier_sharedpoise', name: 'Shared Poise', ab: 'deflect', text: 'A Perfect deflect for an ally gives them a {s:100} shield for 3s.' },
      { id: 'kenseier_turnedtide', name: 'Turned Tide', ab: 'deathblow', text: 'A blow you turn back with Redirect adds 10 Posture to the boss, or 20 for a tankbuster.' },
    ],
  ],
};

// ----------------------------------------------------------------------- HOUNDMASTER
SPEC_TALENTS.houndmaster = {
  // Pack Leader, The Two-Dog Hunt: both hounds, coordinated pounces
  packleader: [
    [
      { id: 'houndmaster_pincerdrill', name: 'Pincer Drill', ab: 'finisher', text: 'A Rend sets its bleed on the nearest add as well, if the fight has one. In Wild Hunt every finisher does.' },
      { id: 'houndmaster_tagteam', name: 'Tag Team', ab: 'calloff', text: 'After a Call Off, your next finisher (within 20s) counts every pair: its own blow, with Rend\'s bleed and Hamstring\'s weakness as well.' },
    ],
    [
      { id: 'houndmaster_huntinghorn', name: 'Hunting Horn', ab: 'pounce', text: 'A pounce that has landed sounds the horn: for a beat the boss turns its face toward you (it keeps its target), and the hounds keep their sides through the swing.' },
      { id: 'houndmaster_littermates', name: 'Littermates', ab: 'knife', text: 'When one hound bites, the other bites too one time in five.' },
    ],
  ],
  // Lone Wolf, The Rider: one great hound you ride in for big bursts
  lonewolf: [
    [
      { id: 'houndmaster_saddleborn', name: 'Saddle Born', ab: 'flank', text: 'Mount lasts 2s longer.' },
      { id: 'houndmaster_leapoff', name: 'Leap Off', ab: 'flank', text: 'Ride Down lands where you aim, up to 220 from where you were.' },
    ],
    [
      { id: 'houndmaster_oldscars', name: 'Old Scars', ab: 'calloff', text: 'Greyfang takes 30% less damage from raidwides.' },
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
