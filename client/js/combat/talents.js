// Talents: every hero (class) has 5 rows of 3. You hold one pick per row; rows unlock in order with gold
// (TALENT_COSTS, the account-wide wallet) and picks are free to change in town. Talents belong to the hero, not the
// spec: a talent on a move a spec replaces works on the replacement (the kits check the base ability's id, and a
// replacement names the move it took over with `replaces`). Where a spec's version plays very differently the talent
// says so in `spec` (its text for that spec), and the kit code gives it a fitting variant.
//
// Rows, roughly: 1 rotation, 2 survival or utility, 3 the class gauge, 4 big cooldowns, 5 a new part of a move.
// Each talent is about +2-4% output or a comparable utility gain; a full set stays under about +15%
// (tools/talents.js measures them, tools/check.js holds the line).
//
// A talent: { id, name, ab (the base ability it changes: its tooltip shows the talent), text, spec?: { specId: text },
//   cd?: { baseAbilityId: seconds } (cooldown change), cast?: { baseAbilityId: seconds } (cast time change),
//   specMods?: { specId: { cd?, cast? } } (a spec's own numbers for those) }.
// The kits check k.talent(id) (engine.js); cd / cast changes are applied by the engine from this data.
// Client-side only: nothing here touches HP or Defense, so the host never needs to know.

const TALENT_COSTS = [60, 120, 200, 300, 400];

const TALENTS = {
  // ======================================================================= TANKS
  bastion: [
    [
      { id: 'bastion_judgment', name: 'Heavy Judgment', ab: 'blade', text: 'Judgment, the third Blade Chain hit, strikes 15% harder.' },
      { id: 'bastion_counter', name: 'Counterstrike', ab: 'brace', text: 'The counter after a Perfect Block hits 30% harder.' },
      { id: 'bastion_lightforged', name: 'Lightforged', ab: 'edge', text: 'Holy Edge hits 8% harder.', spec: { sentinel: 'Shield Bash hits 8% harder.' } },
    ],
    [
      { id: 'bastion_steadfast', name: 'Steadfast', ab: 'brace', text: 'Brace cuts damage by 35% instead of 25%.' },
      { id: 'bastion_mercy', name: 'Mercy of the Edge', ab: 'edge', text: 'Holy Edge heals you twice as much.', spec: { sentinel: 'Shield Bash heals you twice as much.' } },
      { id: 'bastion_sanctuary', name: 'Sanctuary', ab: 'banner', text: 'Rally Banner also heals the whole party every 3s while it stands.' },
    ],
    [
      { id: 'bastion_unshaken', name: 'Unshaken', ab: 'brace', text: 'A Perfect Block gives 25 Resolve instead of 20.' },
      { id: 'bastion_riposte', name: 'Riposte\'s Due', ab: 'blade', text: 'Riposte, the second Blade Chain hit, gives 10 Resolve.' },
      { id: 'bastion_tithe', name: 'Tithe of Light', ab: 'edge', text: 'Holy Edge gives back 5 Resolve.', spec: { sentinel: 'Shield Bash gives back 5 Resolve.' } },
    ],
    [
      { id: 'bastion_vigil', name: 'Long Vigil', ab: 'oath', text: 'Oath of Valor lasts 4s longer.' },
      { id: 'bastion_wall', name: 'Wall of Faith', ab: 'bulwark', text: 'Bulwark also fills 40 Resolve.', spec: { crusader: 'Zealous Guard also fills 40 Resolve.' } },
      { id: 'bastion_standard', name: 'Standard of Valor', ab: 'banner', text: 'While Rally Banner stands, the whole party also deals 3% more damage.' },
    ],
    [
      { id: 'bastion_sunlit', name: 'Sunlit Shield', ab: 'brace', text: 'A Perfect Block now also throws a flash of light into the boss.' },
      { id: 'bastion_echo', name: 'Edge of Judgment', ab: 'blade', text: 'Judgment now also hurls a shard of Holy Edge at the boss, and it heals you a little.' },
      { id: 'bastion_hallowed', name: 'Hallowed Ground', ab: 'banner', text: 'Rally Banner now consecrates the ground: the boss burns with holy light every 2s while it stands.' },
    ],
  ],

  bloodreaver: [
    [
      { id: 'bloodreaver_maul', name: 'Rending Maul', ab: 'hack', text: 'Maul, the second hit, strikes 12% harder.' },
      { id: 'bloodreaver_vein', name: 'Open Vein', ab: 'letting', text: 'Bloodletting leaves the boss bleeding for 9s.', spec: { hemomancer: 'Blood Lance leaves the boss bleeding for 9s.' } },
      { id: 'bloodreaver_glutton', name: 'Gluttony', ab: 'drain', text: 'Crimson Drain hits 7% harder.', spec: { berserker: 'Rampage hits 7% harder.' } },
    ],
    [
      { id: 'bloodreaver_thirst', name: 'Thirst', ab: 'drain', text: 'Crimson Drain heals you for 45% of the damage you took instead of 35%.', spec: { berserker: 'Rampage heals you for 26% of the damage you took instead of 20%.' } },
      { id: 'bloodreaver_iron', name: 'Iron Roar', ab: 'warcry', text: 'War Cry\'s shield is 25% stronger.' },
      { id: 'bloodreaver_scar', name: 'Scar Tissue', ab: 'undying', text: 'While Undying lasts you also take 15% less damage.' },
    ],
    [
      { id: 'bloodreaver_hunger', name: 'Hunger', ab: 'hack', text: 'Hack and Maul each give 5 more Blood.', spec: { berserker: 'Hack and Maul each give 5 more Rage.' } },
      { id: 'bloodreaver_quickvein', name: 'Quickened Vein', ab: 'letting', cd: { letting: -3 }, text: 'Bloodletting recharges 3s faster.', spec: { hemomancer: 'Blood Lance recharges 3s faster.' } },
      { id: 'bloodreaver_feast', name: 'Feast', ab: 'frenzy', text: 'Frenzy makes four Crimson Drains free instead of three.', spec: { berserker: 'Frenzy makes four Rampages free instead of three.' } },
    ],
    [
      { id: 'bloodreaver_carnage', name: 'Carnage', ab: 'frenzy', text: 'Frenzy lasts 4s longer.' },
      { id: 'bloodreaver_roar', name: 'Battle Roar', ab: 'warcry', text: 'War Cry also gives you 40 Blood.', spec: { berserker: 'War Cry also gives you 40 Rage.' } },
      { id: 'bloodreaver_deathless', name: 'Deathless', ab: 'undying', cd: { undying: -30 }, text: 'Undying recharges 30s faster.' },
    ],
    [
      { id: 'bloodreaver_rend', name: 'Rend', ab: 'hack', text: 'Maul now carves a Wound in the boss (up to 3). Crimson Drain tears every Wound open for extra damage.', spec: { berserker: 'Maul now carves a Wound in the boss (up to 3). Rampage tears every Wound open for extra damage.' } },
      { id: 'bloodreaver_tide', name: 'Crimson Tide', ab: 'drain', text: 'Crimson Drain\'s healing now also flows to the whole party, at a fifth of the strength.', spec: { berserker: 'Rampage\'s healing now also flows to the whole party, at a fifth of the strength.', hemomancer: 'Shared Vein now flows to the party at 40% of the strength instead of 25%.' } },
      { id: 'bloodreaver_frenzied', name: 'Frenzied Letting', ab: 'letting', text: 'Frenzy now also opens your veins: it refills Bloodletting\'s charges.', spec: { hemomancer: 'Frenzy now also opens your veins: it refills Blood Lance\'s charges.' } },
    ],
  ],

  runeguard: [
    [
      { id: 'runeguard_etched', name: 'Etched Gauntlet', ab: 'strike', text: 'Rune Strike hits 10% harder.', spec: { runeblade: 'Rune Blade hits 10% harder.' } },
      { id: 'runeguard_afterglyph', name: 'Afterglyph', ab: 'glyph', text: 'Glyph Burst leaves its glyph burning on the boss for 9s.', spec: { runeblade: 'Rune Cleave\'s burning rune hits 25% harder.' } },
      { id: 'runeguard_volatile', name: 'Volatile Wards', ab: 'ward', text: 'Ward blasts hit 20% harder.' },
    ],
    [
      { id: 'runeguard_thick', name: 'Deep Etching', ab: 'ward', text: 'Runic Ward is 15% stronger.' },
      { id: 'runeguard_sanctum', name: 'Wide Sanctum', ab: 'sanctum', text: 'Sanctum lasts 14s instead of 10s.' },
      { id: 'runeguard_mirror', name: 'Polished Mirror', ab: 'mirror', text: 'Mirror Aegis waits 5s for a hit instead of 3s.' },
    ],
    [
      { id: 'runeguard_overflow', name: 'Overflow', ab: 'strike', text: 'A Rune that would overcap bursts into the boss instead.' },
      { id: 'runeguard_reclaim', name: 'Reclaim', ab: 'ward', text: 'A Ward that absorbed at least half gives its Rune back.', spec: { spellwarden: 'A Ward gives its Rune back once it has absorbed a third.' } },
      { id: 'runeguard_thirdmark', name: 'Third Mark', ab: 'strike', text: 'Every third Rune Strike gives an extra Rune.', spec: { runeblade: 'Every third Rune Blade hit gives an extra Rune.' } },
    ],
    [
      { id: 'runeguard_long', name: 'Long Overload', ab: 'overload', text: 'Runic Overload lasts 4s longer.' },
      { id: 'runeguard_mirrorsedge', name: 'Mirror\'s Edge', ab: 'mirror', text: 'Mirror Aegis reflects 25% harder.' },
      { id: 'runeguard_well', name: 'Rune Well', ab: 'sanctum', text: 'Sanctum also gives 2 Runes.' },
    ],
    [
      { id: 'runeguard_glyphguard', name: 'Glyphguard', ab: 'glyph', text: 'Glyph Burst now also raises a small Ward on you if you have none (once every 20s). It explodes like a Ward, a little smaller.', spec: { runeblade: 'Rune Cleave now also raises a small Ward on you if you have none (once every 20s). It explodes like a Ward, a little smaller.' } },
      { id: 'runeguard_shards', name: 'Mirror Shards', ab: 'mirror', text: 'A reflected hit now shatters the mirror into shards that strike the boss three more times.' },
      { id: 'runeguard_storm', name: 'Rune Storm', ab: 'overload', text: 'When Runic Overload ends, every Rune you hold now bursts against the boss (you keep them).' },
    ],
  ],

  // ======================================================================= DPS
  ranger: [
    [
      { id: 'ranger_rhythm', name: 'Fletcher\'s Rhythm', ab: 'quick', text: 'Every fourth Quick Shot looses a second arrow for half damage.' },
      { id: 'ranger_keen', name: 'Keen Edge', ab: 'pierce', text: 'A Keen Eye Piercing Arrow hits 15% harder.', spec: { sharpshooter: 'A Keen Eye Aimed Shot hits 15% harder.', venomstrike: 'A Keen Eye Caustic Arrow hits 15% harder.' } },
      { id: 'ranger_markedvolley', name: 'Marked Volley', ab: 'rapid', text: 'During Hunter\'s Mark, Rapid Fire hits 30% harder.' },
    ],
    [
      { id: 'ranger_shelter', name: 'Hunter\'s Shelter', ab: 'cloak', text: 'Hunter\'s Cloak cuts damage by 15% instead of 10%.' },
      { id: 'ranger_dressing', name: 'Field Dressing', ab: 'barrage', text: 'Barrage also heals you for 8% of your HP.' },
      { id: 'ranger_lightfoot', name: 'Light Feet', ab: 'pierce', text: 'Each Piercing Arrow takes 3s off Hunter\'s Cloak\'s cooldown.', spec: { sharpshooter: 'Each Aimed Shot takes 3s off Hunter\'s Cloak\'s cooldown.', venomstrike: 'Each Caustic Arrow takes 3s off Hunter\'s Cloak\'s cooldown.' } },
    ],
    [
      { id: 'ranger_quiver', name: 'Deep Quiver', ab: 'quick', text: 'Quick Shot gives 12 Focus instead of 10 (36 with Barrage).' },
      { id: 'ranger_keenfocus', name: 'Keen Focus', ab: 'quick', text: 'Lighting up Keen Eye also gives 8 Focus.' },
      { id: 'ranger_trail', name: 'Blood Trail', ab: 'pierce', text: 'Piercing Arrow gives 5 Focus.', spec: { sharpshooter: 'Aimed Shot gives 5 Focus.', venomstrike: 'Caustic Arrow gives 5 Focus.' } },
    ],
    [
      { id: 'ranger_longhunt', name: 'Long Hunt', ab: 'mark', text: 'Hunter\'s Mark lasts 3s longer.' },
      { id: 'ranger_barrage', name: 'Quick Barrage', ab: 'barrage', cd: { barrage: -5 }, text: 'Barrage recharges 5s faster.' },
      { id: 'ranger_rush', name: 'Quiver Rush', ab: 'barrage', text: 'Barrage also gives 20 Focus.' },
    ],
    [
      { id: 'ranger_pin', name: 'Pinning Shot', ab: 'pierce', text: 'A Keen Eye Piercing Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s).', spec: { sharpshooter: 'A Keen Eye Aimed Shot now pins the boss: your next Quick Shot is a critical hit (once every 12s).', venomstrike: 'A Keen Eye Caustic Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s).' } },
      { id: 'ranger_arrowstorm', name: 'Arrowstorm', ab: 'rapid', text: 'Rapid Fire now leaves its arrows in the wound: the boss bleeds for 6s.' },
      { id: 'ranger_falcon', name: 'Falcon', ab: 'barrage', text: 'Barrage now also sends your falcon: it strikes the boss four times over 6s.' },
    ],
  ],

  shadowblade: [
    [
      { id: 'shadowblade_serrated', name: 'Serrated Edge', ab: 'strike', text: 'Strike hits 12% harder.' },
      { id: 'shadowblade_cruel', name: 'Cruel Finish', ab: 'evis', text: 'An Eviscerate at 4 or more points hits 6% harder.', spec: { nightstalker: 'A Backstab at 4 or more points hits 6% harder.' } },
      { id: 'shadowblade_lasting', name: 'Lasting Venom', ab: 'venom', text: 'Venom Blade\'s poison lasts 30s instead of 24s and hits 15% harder.' },
    ],
    [
      { id: 'shadowblade_smoke', name: 'Thick Smoke', ab: 'smoke', text: 'Smoke Bomb lasts 14s instead of 10s.' },
      { id: 'shadowblade_evasion', name: 'Evasion', ab: 'step', text: 'Shadowstep also makes you take 20% less damage for 3s.', spec: { bladedancer: 'Blade Fury also makes you take 20% less damage for 3s.' } },
      { id: 'shadowblade_leech', name: 'Leeching Poison', ab: 'venom', text: 'Your poison heals you a little each time it ticks.' },
    ],
    [
      { id: 'shadowblade_relentless', name: 'Relentless', ab: 'evis', text: 'A 5-point Eviscerate has an even chance to give back 1 combo point.', spec: { nightstalker: 'A 5-point Backstab has an even chance to give back 1 combo point.' } },
      { id: 'shadowblade_envenom', name: 'Envenom', ab: 'venom', text: 'Each tick of your poison has a small chance to give a combo point.' },
      { id: 'shadowblade_quicken', name: 'Quickening', ab: 'dance', text: 'Your first Strike in Shadow Dance gives 2 extra combo points.' },
    ],
    [
      { id: 'shadowblade_longdance', name: 'Long Dance', ab: 'dance', text: 'Shadow Dance lasts 3s longer.' },
      { id: 'shadowblade_sprint', name: 'Shadow Sprint', ab: 'step', cd: { step: -3 }, specMods: { bladedancer: { cd: { step: -1 } } }, text: 'Shadowstep recharges 3s faster.', spec: { bladedancer: 'Blade Fury recharges 1s faster.' } },
      { id: 'shadowblade_vanish', name: 'Vanish', ab: 'smoke', text: 'Smoke Bomb also refills Shadowstep\'s charges.', spec: { bladedancer: 'Smoke Bomb also refills Blade Fury\'s charges.' } },
    ],
    [
      { id: 'shadowblade_toxic', name: 'Toxic Burst', ab: 'evis', text: 'Eviscerate now bursts your poison: 15% of what it has left lands at once, and the poison keeps going.', spec: { nightstalker: 'Backstab now bursts your poison: 15% of what it has left lands at once, and the poison keeps going.' } },
      { id: 'shadowblade_clone', name: 'Shadow Clone', ab: 'dance', text: 'Shadow Dance now calls a shadow that repeats your Eviscerates at 30%.', spec: { nightstalker: 'Shadow Dance now calls a shadow that repeats your Backstabs at 30%.' } },
      { id: 'shadowblade_garrote', name: 'Garrote', ab: 'step', text: 'Shadowstep now garrotes: the boss bleeds for 9s.', spec: { bladedancer: 'Blade Fury now leaves the boss bleeding for 9s.' } },
    ],
  ],

  pyromancer: [
    [
      { id: 'pyromancer_firestarter', name: 'Firestarter', ab: 'fireball', text: 'A Fireball crit sets the target burning for 6s.' },
      { id: 'pyromancer_pyroclasm', name: 'Pyroclasm', ab: 'pyro', text: 'A Hot Streak Pyroblast hits 10% harder.', spec: { cataclysm: 'A Hot Streak Meteor hits 10% harder.' } },
      { id: 'pyromancer_flashfire', name: 'Flashfire', ab: 'fireblast', text: 'Fire Blast hits 30% harder.' },
    ],
    [
      { id: 'pyromancer_heatshield', name: 'Heat Shield', ab: 'vent', text: 'Vent also wraps you in a small shield of heat for 8s.' },
      { id: 'pyromancer_tempered', name: 'Tempered', ab: 'vent', text: 'An Overheat leaves you burnt for 2s instead of 5s.' },
      { id: 'pyromancer_smolder', name: 'Lingering Smolder', ab: 'smolder', text: 'Smolder lasts 14s instead of 10s.' },
    ],
    [
      { id: 'pyromancer_heatsink', name: 'Heat Sink', ab: 'vent', text: 'Heat raises your damage by 0.4% a point instead of 0.3% (40% at full).' },
      { id: 'pyromancer_pressure', name: 'Pressure', ab: 'vent', text: 'Vent gets a third more from every point of Heat.' },
      { id: 'pyromancer_kindling', name: 'Kindling', ab: 'fireblast', text: 'Fire Blast gives 12 Heat instead of 6.' },
    ],
    [
      { id: 'pyromancer_longburn', name: 'Long Burn', ab: 'combust', text: 'Combustion lasts 3s longer.', spec: { sigilmancer: 'Ember Circle lasts 5s longer.' } },
      { id: 'pyromancer_fuel', name: 'Fuel the Fire', ab: 'combust', text: 'Combustion also gives up to 30 Heat (never past 95).', spec: { sigilmancer: 'Ember Circle also gives up to 30 Heat (never past 95).' } },
      { id: 'pyromancer_afterburn', name: 'Afterburn', ab: 'combust', text: 'When Combustion ends, you get Hot Streak.', spec: { sigilmancer: 'When Ember Circle fades, you get Hot Streak.' } },
    ],
    [
      { id: 'pyromancer_phoenix', name: 'Phoenix Ash', ab: 'vent', text: 'Vent now scorches the ground: the boss burns for 9s, hotter the more Heat you vented.' },
      { id: 'pyromancer_twin', name: 'Twin Flame', ab: 'pyro', text: 'A Hot Streak Pyroblast now splits: a second, smaller Pyroblast hits for 10%.', spec: { cataclysm: 'A Hot Streak Meteor now brings a second, smaller meteor down a moment later, for 10%.' } },
      { id: 'pyromancer_bomb', name: 'Living Bomb', ab: 'fireball', text: 'Every fourth Fireball now plants an ember in the boss that bursts 3s later.' },
    ],
  ],

  // ======================================================================= HEALERS
  cleric: [
    [
      { id: 'cleric_burning', name: 'Burning Light', ab: 'smite', text: 'Smite hits 5% harder (not Dawnstar).' },
      { id: 'cleric_radiant', name: 'Radiant Dawn', ab: 'smite', text: 'Dawnstar hits 15% harder.' },
      { id: 'cleric_petalfall', name: 'Petalfall', ab: 'petal', text: 'Dawn Petal also sends a spark of light into the boss.' },
    ],
    [
      { id: 'cleric_mending', name: 'Mending Words', ab: 'mend', text: 'Mend heals 20% more.', spec: { aegis: 'Divine Barrier\'s dome is 20% stronger.' } },
      { id: 'cleric_benevolence', name: 'Benevolence', ab: 'bene', cd: { bene: -8 }, text: 'Benediction recharges 8s faster.', spec: { inquisitor: 'Condemn recharges 8s faster.' } },
      { id: 'cleric_swift', name: 'Swift Intervention', ab: 'intervene', cast: { intervene: -1 }, text: 'Intervention casts in 1.5s instead of 2.5s.' },
    ],
    [
      { id: 'cleric_fresh', name: 'Fresh Petals', ab: 'petal', text: 'Petals regrow 2s sooner.' },
      { id: 'cleric_dew', name: 'Morning Dew', ab: 'petal', text: 'Dawn Petal\'s regen lasts twice as long.', spec: { aegis: 'Dawn Petal\'s shield is 25% stronger.' } },
      { id: 'cleric_favour', name: 'Sun\'s Favour', ab: 'smite', text: 'Dawnstar gives back a Petal.' },
    ],
    [
      { id: 'cleric_widecircle', name: 'Wide Circle', ab: 'prayer', text: 'Prayer Circle\'s regen lasts 6s longer.' },
      { id: 'cleric_devotion', name: 'Devotion', ab: 'prayer', text: 'Prayer Circle also gives you a Petal.' },
      { id: 'cleric_grace', name: 'Grace', ab: 'bene', text: 'Benediction also heals the whole party for a third as much.', spec: { inquisitor: 'Condemn also heals the whole party a little.' } },
    ],
    [
      { id: 'cleric_sunfall', name: 'Sunfall', ab: 'smite', text: 'Dawnstar now leaves a small sun on the boss that burns it for 12s.' },
      { id: 'cleric_twin', name: 'Twin Petals', ab: 'petal', text: 'Dawn Petal now also lands on the most hurt other ally, at half strength.' },
      { id: 'cleric_judgment', name: 'Circle of Judgment', ab: 'prayer', text: 'While Prayer Circle lasts, the boss now takes holy damage every 3s.' },
    ],
  ],

  grovekeeper: [
    [
      { id: 'grovekeeper_sunwrath', name: 'Sun-Warmed Wrath', ab: 'wrath', text: 'Wrath hits 5% harder.' },
      { id: 'grovekeeper_awakened', name: 'Awakened Fury', ab: 'wrath', text: 'An Awakened Wrath hits 35% harder.' },
      { id: 'grovekeeper_deepthorn', name: 'Deep Thorns', ab: 'thorn', text: 'Thornlash\'s thorns hit 18% harder.' },
    ],
    [
      { id: 'grovekeeper_verdant', name: 'Verdant Touch', ab: 'rejuv', text: 'Rejuvenate\'s first heal is 50% stronger.', spec: { lifebinder: 'Lifebind\'s first heal is 50% stronger.' } },
      { id: 'grovekeeper_bark', name: 'Barkskin', ab: 'growth', text: 'Wild Growth also makes you take 15% less damage for 10s.', spec: { moonwell: 'Moonwell also makes you take 15% less damage for 10s.' } },
      { id: 'grovekeeper_rebirth', name: 'Quick Rebirth', ab: 'rebirth', cast: { rebirth: -1 }, text: 'Rebirth casts in 1.5s instead of 2.5s.' },
    ],
    [
      { id: 'grovekeeper_fertile', name: 'Fertile Soil', ab: 'rejuv', text: 'Rejuvenate\'s ticks grow 1 more Bloom.', spec: { lifebinder: 'Lifebind\'s ticks grow 1 more Bloom.' } },
      { id: 'grovekeeper_harvest', name: 'Thorn Harvest', ab: 'thorn', text: 'Thornlash\'s ticks grow 2 Bloom.' },
      { id: 'grovekeeper_sap', name: 'Sap Surge', ab: 'bloom', cd: { bloom: -4 }, text: 'Bloom recharges 4s faster.' },
    ],
    [
      { id: 'grovekeeper_lush', name: 'Lush Growth', ab: 'growth', text: 'Wild Growth\'s stronger heals last 5s longer.', spec: { moonwell: 'Moonwell\'s stronger heals last 4s longer (the pool doesn\'t).' } },
      { id: 'grovekeeper_seed', name: 'Seedburst', ab: 'growth', text: 'Wild Growth also Awakens your next Wrath.', spec: { moonwell: 'Moonwell also Awakens your next Wrath.' } },
      { id: 'grovekeeper_oldgrowth', name: 'Old Growth', ab: 'growth', cd: { growth: -8 }, text: 'Wild Growth recharges 8s faster.', spec: { moonwell: 'Moonwell recharges 8s faster.' } },
    ],
    [
      { id: 'grovekeeper_vines', name: 'Strangling Vines', ab: 'thorn', text: 'Wrath now feeds your thorns: each one makes Thornlash hit 5% harder until you plant it again (up to 25%).' },
      { id: 'grovekeeper_blossom', name: 'Last Blossom', ab: 'rejuv', text: 'Rejuvenate now blooms when it ends: one last burst of healing on the ally.', spec: { lifebinder: 'Lifebind now blooms when it ends: one last burst of healing on your chosen ally.' } },
      { id: 'grovekeeper_naturewrath', name: 'Nature\'s Wrath', ab: 'bloom', text: 'Bloom now also lashes the boss with roots.' },
    ],
  ],

  chronomancer: [
    [
      { id: 'chronomancer_honed', name: 'Honed Bolt', ab: 'bolt', text: 'In Slow, Temporal Bolt hits 7% harder.' },
      { id: 'chronomancer_double', name: 'Double Time', ab: 'shift', text: 'Shifting into Haste makes your next two Bolts instant instead of one, and an instant Bolt hits 20% harder.' },
      { id: 'chronomancer_skip', name: 'Skipped Beat', ab: 'bolt', text: 'Every fifth Temporal Bolt is instant and hits 20% harder.' },
    ],
    [
      { id: 'chronomancer_practiced', name: 'Practiced Rewind', ab: 'rewind', cd: { rewind: -6 }, text: 'Rewind recharges 6s faster.' },
      { id: 'chronomancer_stasis', name: 'Long Stasis', ab: 'stasis', text: 'Stasis lasts 3s instead of 2s.' },
      { id: 'chronomancer_recall', name: 'Swift Recall', ab: 'recall', cast: { recall: -0.7 }, text: 'Recall casts in 1.8s instead of 2.5s.' },
    ],
    [
      { id: 'chronomancer_well', name: 'Flux Well', ab: 'shift', text: 'Slow fills Flux a sixth faster.' },
      { id: 'chronomancer_borrowed', name: 'Borrowed Time', ab: 'bolt', text: 'In Haste, every Temporal Bolt gives back 2 Flux.' },
      { id: 'chronomancer_paradox', name: 'Paradox', ab: 'shift', text: 'Haste drains Flux 15% slower.' },
    ],
    [
      { id: 'chronomancer_allegro', name: 'Allegro', ab: 'accel', text: 'Accelerando lasts 3s longer.', spec: { echoist: 'Echo Chamber lasts 3s longer.' } },
      { id: 'chronomancer_fermata', name: 'Fermata', ab: 'stasis', cd: { stasis: -30 }, text: 'Stasis recharges 30s faster.' },
      { id: 'chronomancer_crescendo', name: 'Crescendo', ab: 'accel', text: 'While Accelerando lasts, your Bolts hit 10% harder.', spec: { echoist: 'While Echo Chamber lasts, your Bolts hit 10% harder.' } },
    ],
    [
      { id: 'chronomancer_phase', name: 'Phase Strike', ab: 'shift', text: 'Shift now leaves an afterimage that fires a free Temporal Bolt (once every 10s). It heals like any Bolt.' },
      { id: 'chronomancer_hourglass', name: 'Hourglass Ward', ab: 'rewind', text: 'Rewind now also slows time around its target: they take 15% less damage for 6s.' },
      { id: 'chronomancer_second', name: 'Second Hand', ab: 'bolt', text: 'In Haste, Temporal Bolt now strikes again 2s later at 8% strength, healing as a Bolt does.', spec: { echoist: 'Your echoes are 60% strength instead of half.', accelerant: 'In Haste, Temporal Bolt now strikes again 2s later at 6% strength, healing as a Bolt does.' } },
    ],
  ],
};

// ======================================================================= ADVANCED CLASSES (Thermist, Driftblade)
// These trees are mostly new behaviour, not bigger numbers: new triggers, moves that now move you, and two talents
// per class (rows III and V) that put a whole new move on a key (grants: true; the move is in TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  thermist: [
    [
      { id: 'thermist_embers', name: 'Banked Embers', ab: 'cinder', text: 'A Cinder Bolt cast at +3 or hotter now leaves an ember in the target (up to 3). Your next Thermal Shock sets every ember off.' },
      { id: 'thermist_flicker', name: 'Flicker', ab: 'rime', text: 'Rime Shard is now instant while the dial is cold, and Cinder Bolt while it is hot.' },
      { id: 'thermist_afterglow', name: 'Afterglow', ab: 'flare', text: 'A Flare or Glacier Lance cast at its own edge now leaves the target burning or freezing for 9s.' },
    ],
    [
      { id: 'thermist_front', name: 'Cold Front', ab: 'equil', text: 'An Equilibrium that drops the dial 4 or more steps now also gives the whole party 10% less damage for 6s.', spec: { zenith: 'A Bleed Off that vents 40 or more Strain now also gives the whole party 10% less damage for 6s.' } },
      { id: 'thermist_phase', name: 'Phase Step', ab: 'equil', text: 'Equilibrium now also blinks you 150 px the way you\'re heading.', spec: { zenith: 'Bleed Off now also blinks you 150 px the way you\'re heading.' } },
      { id: 'thermist_skin', name: 'Thermal Skin', ab: 'invert', text: 'Every Thermal Shock now also wraps you in a shield worth part of its strength.' },
    ],
    [
      { id: 'thermist_thermocline', name: 'Thermocline', ab: 'cinder', grants: true, text: 'New move on Q, in place of Cinder Bolt. Thermocline: instant, swings the dial 2 steps toward the other side and counts as that element. It hits harder the further from 0 you started.', spec: { pendulum: 'New move on Q, in place of Cinder Bolt. Thermocline: instant, swings the dial 3 steps toward the other side and counts as that element. It hits harder the further from 0 you started.' } },
      { id: 'thermist_latent', name: 'Latent Heat', ab: 'flare', text: 'Overloading no longer locks or burns you: the extra heat is banked instead, and your next Thermal Shock releases it half again as strong.', spec: { zenith: 'A meltdown no longer burns you or locks an element: the dial still snaps to 0, and your next Thermal Shock is half again as strong.' } },
      { id: 'thermist_rebound', name: 'Rebound', ab: 'lance', text: 'After a Thermal Shock, your next spell is now instant (within 10s).' },
    ],
    [
      { id: 'thermist_vortex', name: 'Polar Vortex', ab: 'invert', text: 'Inversion now leaves a vortex on the target that strikes every 1.5s for 6s.' },
      { id: 'thermist_pulse', name: 'Equilibrium Pulse', ab: 'equil', text: 'Equilibrium now sets off the heat it snaps away: from 3 or more steps out, a Thermal Shock as if you had swung that far.', spec: { zenith: 'Bleed Off in Redline now also sets off a Thermal Shock as if you had swung 3.' } },
      { id: 'thermist_solstice', name: 'Solstice', ab: 'invert', text: 'Inversion now flips the dial back 5s later: a smaller Shock if it\'s still far enough from 0.' },
    ],
    [
      { id: 'thermist_zero', name: 'Absolute Zero', ab: 'rime', grants: true, text: 'New move on W, in place of Rime Shard. Absolute Zero: a 2s cast on a 45s cooldown that plunges the dial straight to -5, wherever it was. It hits harder the further it fell.' },
      { id: 'thermist_conduct', name: 'Conduction', ab: 'invert', text: 'Thermal Shock now arcs: a second, smaller Shock strikes the target 1s later.' },
      { id: 'thermist_twin', name: 'Twin Stars', ab: 'flare', text: 'A Flare or Glacier Lance cast at its own edge now fires a second, smaller bolt after it.', spec: { zenith: 'A Flare or Glacier Lance cast in Redline now fires a second, smaller bolt after it.' } },
    ],
  ],

  driftblade: [
    [
      { id: 'driftblade_crescent', name: 'Crescent', ab: 'carve', text: 'Every third Carve you make while moving now also throws a crescent of wind at the target.' },
      { id: 'driftblade_eddies', name: 'Eddies', ab: 'slip', text: 'A Slipstream lane laid through an enemy now cuts it when you lay it, and again when the lane fades.' },
      { id: 'driftblade_tailwind', name: 'Tailwind', ab: 'hook', text: 'Hook Turn now also gives 20 Drift, and your next Carve is a critical hit.' },
    ],
    [
      { id: 'driftblade_calm', name: 'Eye of the Storm', ab: 'still', text: 'While you hold Stillpoint, the whole party now takes 10% less damage too.' },
      { id: 'driftblade_gust', name: 'Gust Guard', ab: 'slip', text: 'Slipstream now wraps you in a shield of wind for 6s.' },
      { id: 'driftblade_sidestep', name: 'Sidestep', ab: 'hook', text: 'Hook Turn now also makes you take 30% less damage for 2s.' },
    ],
    [
      { id: 'driftblade_gyre', name: 'Gyre', ab: 'hook', grants: true, text: 'New move on E, in place of Hook Turn. Gyre: loop once round your target, one cut for every 25 Drift you have (up to 4). It spends nothing and adds 10 Drift. Two charges.' },
      { id: 'driftblade_second', name: 'Second Wind', ab: 'cross', text: 'A Crosswind that spends 80 Drift or more now gives 10 back.', spec: { comet: 'An Impact that spends 160 Drift or more now gives 20 back.' } },
      { id: 'driftblade_hover', name: 'Hover', ab: 'still', text: 'Your Drift no longer drains in the first 1.5s you stand still.' },
    ],
    [
      { id: 'driftblade_galeforce', name: 'Galeforce', ab: 'gale', text: 'When Gale Run ends, it now looses a free Crosswind at whatever Drift you hold (it spends nothing).' },
      { id: 'driftblade_jet', name: 'Jetstream', ab: 'slip', text: 'A Slipstream through an enemy now gives its charge back (once every 8s).' },
      { id: 'driftblade_hurricane', name: 'Hurricane', ab: 'gale', text: 'During Gale Run, each Passing Strike now makes it last 1s longer (up to 6s).' },
    ],
    [
      { id: 'driftblade_tailspin', name: 'Tailspin', ab: 'still', grants: true, text: 'New move on D, in place of Stillpoint. Tailspin: whirl in place, parrying like Stillpoint and cutting the nearest enemy three times, then spring 150 px the way you\'re heading.' },
      { id: 'driftblade_razor', name: 'Razor Wind', ab: 'carve', text: 'Passing Strikes now leave a cut that bleeds for 6s, deeper with each pass (up to 3).' },
      { id: 'driftblade_after', name: 'Afterimage', ab: 'hook', text: 'Hook Turn now leaves an afterimage that cuts the target again a second later.' },
    ],
  ],
});

// ======================================================================= ALEMBIST (classes-b)
// Mostly new behaviour, not bigger numbers. Two talents grant a whole new move (`grants`; the move is in TALENT_ABILITIES in
// kits.js and takes the slot named in its `replaces`): Grand Blend (row III) and Quicksilver (row V).
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

// ======================================================================= ADVANCED TANKS (tanks-2: Gorgemaw, Oathbroker)
// The same rule: new triggers and changed behaviour, one plain number at most (Wide Jaw, Grace Period), and two talents
// per class that put a new move on a key (grants: true; the moves are in TALENT_ABILITIES in kits.js).
Object.assign(TALENTS, {
  gorgemaw: [
    [
      { id: 'gorgemaw_marinade', name: 'Marinade', ab: 'gnash', text: 'Gulp, the third bite of Gnash, now marinates the boss: your next Spit within 10s hits 25% harder.' },
      { id: 'gorgemaw_aftertaste', name: 'Aftertaste', ab: 'spit', text: 'A Spit now leaves the taste behind: the boss burns for 9s, harder after a Spike.' },
      { id: 'gorgemaw_crunch', name: 'Crunch', ab: 'gnash', text: 'Gulp, the third bite of Gnash, now bites twice.' },
    ],
    [
      { id: 'gorgemaw_cud', name: 'Chew the Cud', ab: 'wide', text: 'Every Morsel you eat now heals you for 3% of your HP.' },
      { id: 'gorgemaw_widejaw', name: 'Wide Jaw', ab: 'wide', text: 'Open Wide stays open 2.2s instead of 1.5s.' },
      { id: 'gorgemaw_scraps', name: 'Table Scraps', ab: 'wide', text: 'Eating an attack meant for a teammate now also shields them for 6s.' },
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
      { id: 'gorgemaw_bile', name: 'Bile', ab: 'digest', text: 'Digest now also scalds the boss: one hit for every Morsel it digests.' },
      { id: 'gorgemaw_rumination', name: 'Rumination', ab: 'digest', text: 'Digest now leaves your oldest Morsel in the Belly, to spit later.' },
    ],
  ],

  oathbroker: [
    [
      { id: 'oathbroker_interest', name: 'Interest', ab: 'collect', text: 'Collect, the third strike, now hits harder for every entry in your Ledger (up to 5).' },
      { id: 'oathbroker_garnish', name: 'Garnish', ab: 'collect', text: 'Part of whatever your strikes pay down is now also struck from the boss.' },
      { id: 'oathbroker_stamp', name: 'Rubber Stamp', ab: 'settle', text: 'Settle now also stamps the boss: a blow sized by what you settled.' },
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
