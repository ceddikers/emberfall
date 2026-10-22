// Specializations: two per class. A spec reshapes the base kit (KITS in kits.js); it doesn't replace it.
// It swaps one or two abilities, gives the signature mechanic a new purpose, and keeps the role and the seven keys.
// Free to swap in town, saved per hero, and both specs of a class are balanced against each other (tools/simulate.js).
//
// Each spec: { id, name, title, accent, blurb, focus (what it specializes in), passive: { name, desc }, build(base) -> partial kit }.
// build() returns only what changes: abilities by id (a replacement says which slot it takes with `replaces`),
// and any hooks (onNotify, dmgMod, haste...). kitFor(classId, specId) merges it over the base kit (cached).
// A replacement ability keeps the slot, and honours the enhancements of the ability it replaced where it makes sense.

const SPEC_MELEE = 'melee', SPEC_RANGED = 420;   // the same reach as MELEE / RANGED in kits.js

const SPECS = {
  // ======================================================================= TANKS
  bastion: [
    {
      id: 'sentinel', name: 'Sentinel', title: 'The Wall', accent: '#bcd8ff',
      gaugeTip: 'Judgment (the third Blade Chain hit) gives 25, or 50 during Oath of Valor. A Perfect Block gives 20 (30 under Rally Banner). Shield Bash spends 50, or nothing after a Perfect Block on a tankbuster. Rally Banner takes up to 50.',
      blurb: 'A shield for the whole line. Perfect Blocks steady everyone behind you.',
      focus: 'Protecting the party. Your Perfect Blocks and Shield Bash cut the damage everyone takes.',
      passive: { name: 'Hold the Line', desc: 'A Perfect Block also steadies the party: everyone takes 10% less damage for 4s. Brace has a third charge.' },
      build: base => ({
        potMult: 0.73,   // balance knob (tools/simulate.js)
        abilities: {
          brace: { charges: 3, desc: 'Raise your shield: 25% less damage for 3s. Brace just before a hit lands for a Perfect Block, which also steadies the party. A Perfect Block on a tankbuster gives the charge straight back and makes your next Shield Bash free. Three charges.' },
          oath: { desc: 'Burst: 15s of +10% damage. Judgment grants double Resolve and Shield Bash hits for {d:680} instead of {d:530}.' },
          edge: {
            id: 'bash', replaces: 'edge', name: 'Shield Bash', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'bash',
            desc: 'Spend 50 Resolve: slam your shield into the boss for {d:530}. For 4s you take 30% less damage, and it heals you for {h:120}. Free after a Perfect Block on a tankbuster.',
            usable: k => bastionCanEdge(k),
            glow: k => k.g.resolve >= 90 || (k.has('oath') && k.g.resolve >= 50) || k.has('turned'),
            effect(k) {
              bastionSpend(k);
              const pot = k.has('oath') ? 680 : 530;
              k.damage(pot, { ab: this });
              if (k.perk('bastion_w2')) { k.damage(pot * 0.4, { ab: this }); k.fx('empower'); }
              k.mitigate('self', 0.3, 4, { ab: this });
              bastionEdge(k, this, pot);
            },
            fx: { type: 'slash', color: '#dfe9ff', r: 46, span: 1.0 },
          },
        },
        onNotify(k, type, d) {
          base.onNotify(k, type, d);
          if (type === 'perfect') k.mitigate('party', 0.1, 4, { ab: k.abById('brace') });
        },
      }),
    },
    {
      id: 'crusader', name: 'Crusader', title: 'The Dawn Blade', accent: '#ffd65a',
      gaugeTip: 'Judgment (the third Blade Chain hit) gives 35, or 70 during Oath of Valor. A Perfect Block gives 20 (30 under Rally Banner). Holy Edge spends 50, or nothing after a Perfect Block on a tankbuster. Rally Banner takes up to 50.',
      blurb: 'Holy fire behind every block. Less armour, more light.',
      focus: 'Damage through blocking. Every Perfect Block charges a stronger Holy Edge; your big cooldown protects you less.',
      passive: { name: 'Radiance', desc: 'A Perfect Block makes your next Holy Edge Radiant: 50% stronger, a beam of light. Oath of Valor lasts 20s and Judgment gives 35 Resolve.' },
      build: base => ({
        potMult: 0.59,
        abilities: {
          blade: {
            desc: 'Three-hit combo on one button: Strike ({d:220}) > Riposte ({d:300}) > Judgment ({d:400}). Judgment fills 35 Resolve.',
            effect(k) { bastionBlade(k, this, 35); },
          },
          edge: {
            desc: 'Spend 50 Resolve: a radiant blade you can throw from range for {d:560}. Heals you for {h:120}. After a Perfect Block it becomes a beam, 50% stronger, and after one on a tankbuster it is free.',
            glow: k => k.g.resolve >= 90 || (k.g.resolve >= 50 && (k.has('oath') || k.has('radiant'))) || k.has('turned'),
            effect(k) {
              bastionSpend(k);
              let pot = k.has('oath') ? 720 : 560;
              if (k.consume('radiant')) { pot *= 1.5; k.fx('radiant'); }
              k.damage(pot, { ab: this });
              if (k.perk('bastion_w2')) { k.damage(pot * 0.4, { ab: this }); k.fx('empower'); }
              bastionEdge(k, this, pot);
            },
          },
          oath: { desc: 'Burst: 20s of +10% damage. Judgment grants double Resolve and Holy Edge hits for {d:720} instead of {d:560}.', effect(k) { k.buff('oath', 20); } },
          bulwark: {
            id: 'zeal', replaces: 'bulwark', name: 'Zealous Guard', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
            desc: 'Big cooldown: 30% less damage for 10s, Brace\'s charges refill, and your next Holy Edge is Radiant.',
            effect(k) {
              k.mitigate('self', k.perk('bastion_a4') ? 0.4 : 0.3, 10, { ab: this });
              k.refill('brace'); k.buff('radiant', 15);
              if (k.perk('bastion_w3')) k.shield('party', 160, 8, { ab: this });
              bastionGuard(k, this);
            },
            fx: { type: 'aura', style: 'hex', color: '#ffd65a', r: 34, dur: 2.5 },
          },
        },
        onNotify(k, type, d) {
          base.onNotify(k, type, d);
          if (type === 'perfect') k.buff('radiant', 10);
        },
      }),
    },
  ],

  bloodreaver: [
    {
      id: 'berserker', name: 'Berserker', title: 'The Red Storm', accent: '#ff6a2a',
      gaugeTip: 'Hack gives 10, Maul 15 and Bloodletting 20; under Undying every hit you take gives 1 for each 1% of your HP. Rampage spends 40, or nothing with Frenzy\'s, War Cry\'s or Undying\'s free ones. The number under the heart is the bank: the damage you took since your last Rampage (6s at most).',
      blurb: 'The closer to death, the harder you hit. Blood turns to Rage.',
      focus: 'Risky damage. You hit hardest when your HP is low, so you live closer to the edge.',
      passive: { name: 'Rage', desc: 'Your gauge is Rage. Rampage hits harder the lower your HP, but heals less. Frenzy also makes you 10% faster.' },
      gauge: { label: 'Rage', color: '#ff7a2a' },
      build: () => ({
        potMult: 0.655,
        haste: k => (k.has('frenzy') ? 0.9 : 1),
        abilities: {
          drain: {
            id: 'rampage', replaces: 'drain', name: 'Rampage', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'attack',
            desc: 'Spend 40 Rage: a wild blow for {d:320}, up to {d:250} more the more the bank holds (the damage you took since your last Rampage, 6s at most). Within 1.2s of a hit that took a tenth of your HP your blood is warm: {d:340} more; after that the bank has gone cold and counts for 30%. It hits harder the lower your HP (up to 70% harder near death) and heals you for 20% of the bank.',
            usable: k => reaverDrainOk(k),
            glow: k => reaverDrainGlow(k) || (k.g.blood >= 40 && k.env.hpFrac() < 0.5),
            effect(k) {
              let pot = 320 + reaverDrainCost(k, 120);
              const taken = reaverCash(k);
              pot += Math.min(250, taken / (60 * ENGINE.NUM_SCALE)) * reaverWarm(k);
              pot *= 1 + 0.7 * Math.max(0, 1 - k.env.hpFrac());
              pot = reaverDrainPot(k, pot);
              k.damage(pot, { ab: this });
              if (k.perk('bloodreaver_w2')) { k.damage(pot * 0.3, { ab: this }); k.fx('empower'); }
              const heal = k.healRaw('self', Math.max(k.env.maxHp() * 0.05, taken * 0.2), { ab: this });
              reaverAfterDrain(k, this, heal, 0.2);
            },
            fx: { type: 'slash', color: '#ff7a2a', r: 60, span: 1.8 },
          },
          frenzy: { desc: 'Burst: 12s of +15% damage and 10% faster attacks, and your next three Rampages are free and hit for {d:120} more.' },
        },
      }),
    },
    {
      id: 'hemomancer', name: 'Hemomancer', title: 'The Blood Mage', accent: '#c0204a',
      gaugeTip: 'Hack gives 10, Maul 15 and Blood Lance 20; under Undying every hit you take gives 1 for each 1% of your HP. Crimson Drain spends 40, or nothing with Frenzy\'s, War Cry\'s or Undying\'s free ones. The number under the heart is the bank: the damage you took since your last Drain (6s at most).',
      blurb: 'Blood magic. What you drain from the boss flows to your allies.',
      focus: 'Helping the healer. Your self-healing also heals the whole party, and you can fight from range.',
      passive: { name: 'Shared Vein', desc: 'Crimson Drain\'s healing also flows to the whole party, at a quarter of the strength. Bloodletting becomes a blood lance you throw from range.' },
      build: () => ({
        potMult: 0.77,
        abilities: {
          drain: {
            desc: 'Spend 40 Blood: hits for {d:260}, up to {d:520} more the more the bank holds (the damage you took since your last Drain, 6s at most). Within 1.2s of a hit that took a tenth of your HP your blood is warm: {d:340} more; after that the bank has gone cold and counts for 30%. It heals you for 35% of the bank, and the whole party for 25% of that.',
            effect(k) {
              let pot = 260 + reaverDrainCost(k, 110);
              const taken = reaverCash(k);
              pot += Math.min(520, taken / (30 * ENGINE.NUM_SCALE)) * reaverWarm(k);
              pot = reaverDrainPot(k, pot);
              k.damage(pot, { ab: this });
              if (k.perk('bloodreaver_w2')) { k.damage(pot * 0.3, { ab: this }); k.fx('empower'); }
              const heal = Math.max(k.env.maxHp() * 0.08, taken * 0.35);
              const healed = k.healRaw('self', heal, { ab: this });
              k.healRaw('party', heal * (k.talent('bloodreaver_tide') ? 0.4 : 0.25), { ab: this });
              reaverAfterDrain(k, this, healed, 0);
            },
          },
          frenzy: { desc: 'Burst: 12s of +15% damage, and your next three Crimson Drains are free and hit for {d:110} more.' },
          letting: {
            id: 'lance', replaces: 'letting', name: 'Blood Lance', type: 'ogcd', target: 'enemy', range: 300, charges: 2, cd: 15, anim: 'cast',
            desc: 'Throw a lance of blood between attacks: {d:210} and +20 Blood, from range. Two charges.',
            glow: k => k.charges(k.abById('lance')) === 2,
            effect(k) { k.damage(210 * reaverRetaliate(k), { ab: this }); reaverGain(k, k.perk('bloodreaver_w1') ? 30 : 20); if (k.perk('bloodreaver_a4')) k.healRaw('self', k.env.maxHp() * 0.05, { ab: this }); reaverLetting(k, this); },
            fx: { type: 'projectile', color: '#ff2d4b', range: 300, speed: 1000 },
          },
        },
      }),
    },
  ],

  runeguard: [
    {
      id: 'spellwarden', name: 'Spellwarden', title: 'The Warding Circle', accent: '#9fd8ff',
      gaugeTip: 'Rune Strike gives 1 (2 during Runic Overload), a Ward that absorbed at least half refunds its Rune (a sanctified one always does), and Mirror Aegis reflecting a tankbuster gives 1. Runic Ward spends 1, Glyph Burst spends all 3.',
      blurb: 'Your Wards go where they\'re needed. When they break, they break for you.',
      focus: 'Shielding allies. Your Ward goes on whoever needs it, and pays its Rune back more easily.',
      passive: { name: 'Shared Ward', desc: 'Runic Ward goes on an ally (yourself if none is picked). It explodes from them when it ends, and refunds its Rune once it has absorbed half. A Ward broken all the way shatters outward for {d:250} more.' },
      classPassive: 'Runic Wards explode when they end. The more they absorbed, the bigger the blast ({d:150} up to {d:600}), and one that absorbed at least half refunds its Rune.',
      build: base => ({
        potMult: 0.645,
        abilities: {
          ward: {
            target: 'ally',
            desc: 'Spend 1 Rune: shield an ally for {s:650} for 8s. It explodes when it ends, for {d:150} up to {d:600} the more it absorbed, and gives the Rune back once it has taken half. One broken all the way shatters outward for {d:250} more: raise it just before the hit it is for.',
            effect(k, t) { runeWardCost(k); runeWardUp(k, this, t); k.g.wardAmt = k.shield(t, k.perk('runeguard_a2') ? 812 : 650, k.perk('runeguard_a4') ? 12 : 8, { ab: this, tag: 'ward' }); },
          },
        },
        onNotify(k, type, d) {
          if (type === 'shieldEnd' && d.tag === 'ward') {
            runeWardEnd(k, d, k.talent('runeguard_reclaim') ? 0.33 : 0.5, 0.5);
            // Shared Ward: one that broke all the way shatters outward as well
            if ((d.frac || 0) >= 0.999) { k.damage(250 * (k.has('overload') ? 1.5 : 1), { ab: k.abById('ward') }); k.fx('shatter'); }
            return;
          }
          base.onNotify(k, type, d);
        },
      }),
    },
    {
      id: 'runeblade', name: 'Runeblade', title: 'The Carved Edge', accent: '#c58cff',
      gaugeTip: 'Each Rune Blade hit gives 1 (2 during Runic Overload), a Ward broken all the way refunds its Rune (a sanctified one always does), and Mirror Aegis reflecting a tankbuster gives 1. Runic Ward spends 1, Rune Cleave spends all 3.',
      blurb: 'Runes cut into steel. Lighter Wards, a sharper blade.',
      focus: 'Melee damage. A sword combo, a cleave that leaves a burning rune, and two reflects; smaller Wards.',
      passive: { name: 'Rune-Carved', desc: 'Rune Strike becomes a two-hit combo, Glyph Burst a cleave that leaves a burning rune, and Mirror Aegis has two charges. Wards are a little smaller ({s:600} instead of {s:650}).' },
      build: () => ({
        potMult: 0.575,
        init: () => ({ runes: 0, step: 0, comboUntil: 0 }),
        abilities: {
          strike: {
            id: 'cut', replaces: 'strike', name: 'Rune Blade', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'attack',
            desc: 'Two-hit combo on one button: Cut ({d:240}) > Carve ({d:315}). Each hit gives 1 Rune (2 during Runic Overload).',
            label: k => (k.now < k.g.comboUntil && k.g.step === 1 ? 'Carve' : 'Cut'),
            effect(k) {
              const second = k.now < k.g.comboUntil && k.g.step === 1;
              k.damage(second ? 315 : 240, { ab: this });
              const extra = k.perk('runeguard_w1') && k.rng() < 0.25 ? 1 : 0;
              runeGain(k, this, (k.has('overload') ? 2 : 1) + extra);
              if (extra) k.fx('empower');
              k.g.step = second ? 0 : 1; k.g.comboUntil = k.now + 15;
            },
            fx: { type: 'slash', color: '#c58cff', r: 54, span: 1.6 },
          },
          ward: {
            desc: 'Spend 1 Rune: shield yourself for {s:600} for 8s. It explodes when it ends, for {d:150} up to {d:600} the more it absorbed.',
            effect(k) { runeWardCost(k); runeWardUp(k, this, 'self'); k.g.wardAmt = k.shield('self', k.perk('runeguard_a2') ? 750 : 600, k.perk('runeguard_a4') ? 12 : 8, { ab: this, tag: 'ward' }); k.g.selfWard = true; },
          },
          glyph: {
            id: 'cleave', replaces: 'glyph', name: 'Rune Cleave', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'attack',
            desc: 'Spend 3 Runes: a cleaving cut for {d:660} that leaves a burning rune on the target, {d:85} every 3s for 12s.',
            usable: k => k.g.runes >= 3,
            glow: k => k.g.runes >= 3,
            effect(k) {
              k.spend('runes', 3);
              const pot = k.has('overload') ? 860 : 660;
              k.damage(pot, { ab: this });
              k.dot('brand', k.has('overload') ? 110 : 85, 12, 3, { ab: this });
              if (k.perk('runeguard_w2')) k.gain('runes', 1, 3);
              runeGlyph(k, this, pot);
            },
            fx: { type: 'slash', color: '#e0b8ff', r: 64, span: 2.2 },
          },
          mirror: { charges: 2, desc: 'For 3s, the next hit you take is reduced by 80% and reflected back for {d:1500}. A reflected tankbuster also carves a Rune. Two charges.' },
          overload: { desc: 'Burst: 15s of +10% damage. Rune Blade hits give 2 Runes, Rune Cleave hits for {d:860} and burns for {d:110}, Ward blasts hit 50% harder, and a Ward broken all the way gives 1 more Rune.' },
        },
      }),
    },
  ],

  // ======================================================================= HEALERS
  cleric: [
    {
      id: 'aegis', name: 'Aegis', title: 'The Golden Wall', accent: '#ffe9a8',
      gaugeTip: 'A Petal regrows every 15s (up to 3; past that it blooms by itself onto the most hurt ally). A Petal shield that soaks most of its strength gives its Petal back (once every 10s). Three Petals spent make Dawnstar.',
      blurb: 'Stop the damage before it lands. Light that hardens into armour.',
      focus: 'Shields. Your Petals and Divine Barrier stop damage before it lands, so you plan ahead instead of healing after.',
      passive: { name: 'Hardened Light', desc: 'Dawn Petal leaves a shield instead of a regen, and a Petal shield that soaks most of its strength gives the Petal back. Benediction has two charges. Mend becomes Divine Barrier.' },
      build: base => ({
        potMult: 0.9,
        init: () => Object.assign(base.init(), { refundAt: 0 }),
        abilities: {
          mend: {
            id: 'barrier', replaces: 'mend', name: 'Divine Barrier', type: 'gcd', target: 'ally', anim: 'cast',
            cast: k => (k.has('quickmend') || clericFirstLight(k) ? 0 : 1.5),   // (Quick Mend and First Light, talents)
            desc: '1.5s cast: a golden dome on one ally that absorbs {s:650} for 12s, and heals them for {h:250}.',
            effect(k, t) { k.consume('quickmend'); k.heal(t, 250, { ab: this }); k.shield(t, 650, 12, { ab: this, tag: 'barrier' }); },
            fx: { type: 'ring', color: '#ffe9a8', r: 46, onTarget: true },
          },
          petal: {
            desc: 'Spend a Petal: an instant {h:330} heal and a shield of {s:260} for 10s. If the shield soaks most of its strength, the Petal comes back (once every 10s). Three Petals make Dawnstar.',
            effect(k, t) {
              k.spend('petals', 1);
              k.heal(t, 330, { ab: this });
              k.shield(t, k.perk('cleric_w1') ? 330 : 260, 10, { ab: this, tag: 'petal' });
              clericBloom(k, 1);
              clericPetal(k, this, t, 330);
            },
          },
          bene: { charges: 2, desc: 'Instant: heals one ally for {h:800} and gives them a shield of {s:300}. They are Blessed: 10% more damage dealt for 10s. Two charges.' },
        },
        onNotify(k, type, d) {
          if (type === 'shieldEnd' && d.tag === 'petal' && d.frac >= 0.75 && k.now >= k.g.refundAt) {
            k.g.refundAt = k.now + 10;
            k.gain('petals', 1, 3); k.fx('petal-back');
          }
        },
      }),
    },
    {
      id: 'inquisitor', name: 'Inquisitor', title: 'The Burning Verdict', accent: '#ff9a3c',
      gaugeTip: 'A Petal regrows every 20s (up to 3; past that it blooms by itself onto the most hurt ally). Three Petals spent make Dawnstar; a Mend counts as half.',
      blurb: 'Judgment first, mercy after. Every blow your allies strike carries your verdict.',
      focus: 'Damage. Smite brands the boss so your allies\' hits burst for extra damage. Less healing: Petals regrow slower and Benediction becomes an attack.',
      balance: 1.12,   // a damage spec: aims for this share of the base Cleric's damage (tools/check.js)
      passive: { name: 'Judgment', desc: 'Smite brands the boss: your allies\' next 2 hits on it burst with holy fire ({d:70} each), counted as your damage. Dawn Petals regrow every 20s. Benediction becomes Condemn.' },
      build: base => ({
        potMult: 0.69,
        tick(k) {
          const every = 20;
          if (k.g.petalAt === null) k.g.petalAt = k.now + every;
          if (k.now >= k.g.petalAt) { clericGrow(k); k.g.petalAt += every; }
          clericTick(k);
        },
        abilities: {
          smite: {
            cast: k => (k.g.bloom >= 3 || k.has('verdict') || clericInSanctum(k) ? 0 : 1.5),
            desc: '1.5s cast attack for {d:280} that brands the boss: your allies\' next 2 hits burst for {d:70} each. After three Dawn Petals it becomes Dawnstar: instant, {d:950}, and a brand of 4.',
            effect(k) {
              k.consume('verdict');
              let r;
              if (k.g.bloom >= 3) { k.g.bloom = 0; r = k.damage(950 * clericHeld(k), { ab: this }); k.fx('dawnstar'); specBrand(k, 4, this); if (k.perk('cleric_w2')) k.heal('party', 180, { ab: this }); clericDawnstar(k, this); }
              else { r = k.damage(280, { ab: this }); specBrand(k, 2, this); }
              clericSmite(k, this, r);
            },
          },
          bene: {
            id: 'condemn', replaces: 'bene', name: 'Condemn', type: 'ogcd', target: 'enemy', range: SPEC_RANGED, cd: 30, anim: 'big',
            desc: 'Instant: a lance of holy fire for {d:420} that brands the boss for 4 hits, and your next Smite is instant.',
            effect(k) {
              if (clericBless(k, this, null)) { k.damage(140, { ab: this }); k.fx('twinBless'); return; }
              k.damage(420, { ab: this }); specBrand(k, k.perk('cleric_a2') ? 6 : 4, this); k.buff('verdict', 15);
            },
            fx: { type: 'projectile', color: '#ffb04a', range: SPEC_RANGED, speed: 1100 },
          },
        },
      }),
    },
  ],

  grovekeeper: [
    {
      id: 'lifebinder', name: 'Lifebinder', title: 'The Deep Roots', accent: '#6fffb0',
      gaugeTip: 'Each Lifebind tick on your chosen ally grows 5 Bloom. Bloom spends 50.',
      blurb: 'Roots under the whole party. Heal before the hit, not after.',
      focus: 'Healing over time. Lifebind covers two allies at once and Bloom bursts harder, so planning ahead keeps everyone topped up.',
      passive: { name: 'Deep Roots', desc: 'Rejuvenate becomes Lifebind: it also takes root on the most hurt other ally. Bloom heals 30% more.' },
      build: () => ({
        potMult: 0.87,
        abilities: {
          rejuv: {
            id: 'lifebind', replaces: 'rejuv', name: 'Lifebind', type: 'gcd', target: 'ally', anim: 'cast',
            desc: 'Instant: heals for {h:200}, then {h:120} every 3s for 15s, on this ally, and {h:110} every 3s on the most hurt other ally. Its ticks grow Bloom.',
            recastGcd: k => groveSproutGcd(k),
            effect(k, t) {
              groveRejuv(k, this, t);
              k.heal(t, 200, { ab: this });
              k.hot(t, 120, 5, 3, { ab: this, id: 'rejuv' });
              const { amount } = k.healAmount(110, { ab: this });
              k.env.emit({ type: 'hot', target: 'lowest', not: t, amount, ticks: 5, interval: 3, ab: this, id: 'rejuv2' });
              k.g.rejuvs = k.g.rejuvs.filter(r => r.t !== t);
              k.g.rejuvs.push({ t, ticks: 5, next: k.now + 3 });
            },
            fx: { type: 'ring', color: '#6fffb0', r: 40, onTarget: true },
          },
          bloom: {
            desc: 'Spend 50 Bloom: instantly heal everyone with your Lifebind and the most hurt ally for {h:520} (the whole party for {h:450} during Wild Growth). Your next Wrath is instant.',
            effect(k) {
              k.spend('bloom', 50);
              if (k.has('growth')) k.heal('party', 450, { ab: this });
              for (const r of k.g.rejuvs) k.heal(r.t, 520, { ab: this });
              k.heal(k.g.rejuvs.length ? 'lowest' : 'self', 520, { ab: this });
              k.buff('awaken', 15);
              groveBloom(k, this);
            },
          },
        },
      }),
    },
    {
      id: 'moonwell', name: 'Moonwell', title: 'The Silver Pool', accent: '#a9c4ff',
      blurb: 'Call the moon down into a pool. Everyone who stands in it is mended.',
      focus: 'Placed healing. Moonwell heals everyone standing in it, so it is strongest when the party stacks together and weakest when it spreads.',
      passive: { name: 'Moonlit Ground', desc: 'Wild Growth becomes Moonwell: a pool of moonlight at an ally\'s feet that heals everyone inside, on a shorter cooldown. Your heals are still 25% stronger while it lasts.' },
      build: () => ({
        potMult: 0.92,
        healMod: k => (k.has('moonlit') ? 0.25 : 0),
        abilities: {
          bloom: {
            desc: 'Spend 50 Bloom: instantly heal everyone with your Rejuvenate for {h:400} (and the whole party for {h:350} while Moonwell lasts). Your next Wrath is instant.',
            effect(k) {
              k.spend('bloom', 50);
              if (k.has('moonlit')) k.heal('party', 350, { ab: this });
              for (const r of k.g.rejuvs) k.heal(r.t, 400, { ab: this });
              if (!k.g.rejuvs.length && !k.has('moonlit')) k.heal(k.talent('grovekeeper_roots') ? 'lowest' : 'self', 400, { ab: this });
              k.buff('awaken', 15);
              groveBloom(k, this);
            },
          },
          growth: {
            id: 'moonwell', replaces: 'growth', name: 'Moonwell', type: 'ogcd', target: 'ally', cd: 45, anim: 'big',
            desc: 'A pool of moonlight at an ally\'s feet for 12s: everyone standing in it heals {h:80} every 1.5s, and your heals are 25% stronger while it lasts.',
            effect(k, t) {
              k.buff('moonlit', 12);
              const { amount } = k.healAmount(80, { ab: this });
              k.env.emit({ type: 'pool', target: t, r: 150, amount, ticks: 8, interval: 1.5, ab: this });
              if (k.perk('grovekeeper_w3')) k.gain('bloom', 25);
              groveGrowth(k, this);
            },
            fx: { type: 'ring', color: '#a9c4ff', r: 150, onTarget: true },
          },
        },
      }),
    },
  ],

  chronomancer: [
    {
      id: 'echoist', name: 'Echoist', title: 'The Second Voice', accent: '#c4a8ff',
      blurb: 'Everything you do happens twice. The second time, a little softer.',
      focus: 'Delayed healing. Your Bolts and Recalls repeat 3s later at half strength, so you heal for damage you can see coming.',
      passive: { name: 'Echo', desc: 'Temporal Bolt and Recall repeat 3s later at half strength (full strength during Echo Chamber). Accelerando becomes Echo Chamber.' },
      build: base => {
        // one Bolt hit, at a share of its strength: damage, then the stance's heal
        const bolt = (k, ab, share) => chronoBolt(k, ab, share, 0.56, 1.35);
        const echo = (k, fn) => k.g.echoes.push({ at: k.now + 3, fn });
        const share = k => (k.has('chamber') ? 1 : k.talent('chronomancer_second') ? 0.6 : 0.5);   // Second Hand: stronger echoes
        return {
          potMult: 0.47,
          init: () => Object.assign(base.init(), { echoes: [] }),
          tick(k) {
            base.tick(k);
            while (k.g.echoes.length && k.now >= k.g.echoes[0].at) { const e = k.g.echoes.shift(); e.fn(); }
          },
          abilities: {
            bolt: {
              desc: '1.5s cast attack for {d:280} that repeats 3s later at half strength. Slow: heals your linked ally for 135% of its damage. Haste: heals everyone for 56%.',
              effect(k) { bolt(k, this, chronoInstant(k)); echo(k, () => { bolt(k, this, share(k)); k.fx('echo'); }); chronoBoltAfter(k, this, 0.56, 1.35, true); },
            },
            recall: {
              desc: '2.5s cast: bring a fallen ally back, or heal a living one for {h:1400}. A heal repeats 3s later at half strength.',
              effect(k, t) {
                if (k.env.isDead(t)) { k.raise(t, { ab: this }); chronoSecondChance(k, this, t); return; }
                k.heal(t, 1400, { ab: this });
                echo(k, () => { if (!k.env.isDead(t)) { k.heal(t, 1400 * share(k), { ab: this }); k.fx('echo'); } });
              },
            },
            accel: {
              id: 'chamber', replaces: 'accel', name: 'Echo Chamber', type: 'ogcd', target: 'ally', cd: 60, anim: 'big', allyBuff: 'quickened',
              desc: 'Burst: everyone attacks 10% faster for 15s, and your echoes are full strength while it lasts. The ally you aim it at is Quickened: 12% faster still for 15s. You gain 40 Flux.',
              effect(k, t) { const dur = chronoAccel(k, 15); k.partyBuff('haste', 0.1, dur, { ab: this }); chronoQuicken(k, this, t); k.buff('chamber', dur); k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab: this }); },
              fx: { type: 'zone', style: 'clock', color: '#c4a8ff', r: 160, range: 0, dur: 2 },
            },
          },
        };
      },
    },
    {
      id: 'accelerant', name: 'Accelerant', title: 'The Quickened Hour', accent: '#ffd36a',
      gaugeTip: 'Slow fills Flux; Haste drains it 40% slower than usual. Accelerando gives 40.',
      blurb: 'Live in fast time. The whole party moves to your beat.',
      focus: 'Party support. Haste lasts longer and heals the party more, and Accelerando is stronger, but Slow heals your link less.',
      passive: { name: 'Overclock', desc: 'Haste drains Flux 40% slower and its Bolts heal the party for 71% (not 60%). Accelerando gives 15% for 20s. In Slow, Bolt heals your link for 114%.' },
      build: () => ({
        potMult: 0.70,
        tick(k) { chronoFlux(k, k.perk('chronomancer_a2') ? 1.8 : 2.4); },
        abilities: {
          bolt: {
            desc: '1.5s cast attack for {d:280}. Slow: heals your linked ally for 114% of its damage. Haste: heals everyone for 71%.',
            effect(k) {
              chronoBolt(k, this, chronoInstant(k), 0.71, 1.14);
              chronoBoltAfter(k, this, 0.71, 1.14);
            },
          },
          accel: {
            desc: 'Party burst: everyone attacks 15% faster for 20s, and the ally you aim it at is Quickened: 12% faster still for 15s. You gain 40 Flux.',
            effect(k, t) { k.partyBuff('haste', 0.15, chronoAccel(k, 20), { ab: this }); chronoQuicken(k, this, t); k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab: this }); },
          },
        },
      }),
    },
  ],

  // ======================================================================= DPS
  ranger: [
    {
      id: 'sharpshooter', name: 'Sharpshooter', title: 'The Still Eye', accent: '#f2d27a',
      blurb: 'Breathe out, then let fly. Every second you stand still sharpens the next shot.',
      focus: 'Precision. Standing still builds Steady Aim for more damage, and Piercing Arrow becomes Aimed Shot, a slow, huge hit. Weaker while moving.',
      passive: { name: 'Steady Aim', desc: 'Every second you stand still adds a stack of Steady Aim (up to 5): 4% more damage each. Moving loses them all. Piercing Arrow becomes Aimed Shot. Inside your Hunter\'s Mark, Rapid Fire costs only 20 Focus.' },
      build: () => ({
        potMult: 0.609, markRapid: 20,
        tick(k) {
          rangerTrack(k);
          const dt = k.now - (k.g.aimT ?? k.now);
          k.g.aimT = k.now;
          if (k.env.moving()) { if (k.has('aim')) k.clear('aim'); k.g.still = 0; return; }
          if (dt <= 0 || dt > 1) return;
          k.g.still = (k.g.still || 0) + dt;
          if (k.g.still >= 1) { k.g.still -= 1; k.buff('aim', 30, {}, 5, 1); }
        },
        dmgMod: k => k.stacks('aim') * 0.04,
        abilities: {
          pierce: {
            id: 'aimed', replaces: 'pierce', name: 'Aimed Shot', type: 'gcd', target: 'enemy', range: SPEC_RANGED, charges: 2, cd: 12, anim: 'attack',
            cast: k => (k.has('keen') ? 0 : 2),
            desc: '2s cast: a carefully aimed shot for {d:620}, two charges; cast at 5 Steady Aim it hits for {d:850}, and your Steady Aim stays. With Keen Eye it\'s instant, hits for {d:760} and gives the charge back.',
            glow: k => k.has('keen') || k.charges(k.abById('aimed')) === 2,
            effect(k) {
              const keen = k.consume('keen');
              let r, pot = 760;
              if (keen) {
                r = k.damage(760, { ab: this }); k.refundCharge('aimed');
                if (k.perk('ranger_w2')) { k.damage(250, { ab: this }); k.fx('empower'); }
              } else { pot = k.stacks('aim') >= 5 ? 850 : 620; r = k.damage(pot, { ab: this }); if (pot === 850) k.fx('empower'); }   // (a full breath: the still shot)
              rangerPierce(k, keen, r, pot);
            },
            fx: { type: 'line', color: '#ffe9a0', range: 440 },
          },
        },
      }),
    },
    {
      id: 'venomstrike', name: 'Venomstrike', title: 'The Green Death', accent: '#9aff4a',
      blurb: 'Every arrow leaves a little acid behind. Then one arrow lets it all out.',
      focus: 'Damage that ramps. Quick Shot stacks an acid burn on the boss and Caustic Arrow bursts every stack at once.',
      passive: { name: 'Acid', desc: 'Quick Shot adds a stack of Acid to the target (up to 8): a burn that grows with each stack, {d:14} per stack every 3s. Piercing Arrow becomes Caustic Arrow, which bursts every stack.' },
      build: base => {
        // one or more stacks of Acid: the burn keeps its rhythm and grows (no pandemic waste from re-applying)
        function addAcid(k, n, ab) {
          k.g.acid = Math.min(8, k.g.acid + n);
          const d = k.dots.get('acid');
          if (d && d.end > k.now) { d.potency = 14 * k.g.acid; d.end = k.now + 15; }
          else k.dot('acid', 14 * k.g.acid, 15, 3, { ab });
        }
        return {
          potMult: 0.849,
          init: () => Object.assign(base.init(), { acid: 0 }),
          tick(k) { rangerTrack(k); if (k.g.acid && !k.dots.has('acid')) k.g.acid = 0; },
          abilities: {
            quick: {
              desc: 'Fast shot: {d:200}, +10 Focus and a stack of Acid on the target. Sometimes lights up Keen Eye.',
              effect(k) {
                const barr = k.consume('barrage'), ff = !barr && rangerFocusFire(k);
                const r = k.damage((barr ? 720 : 200) * (ff ? 2 : 1), rangerShot(k, this));
                if (!ff) k.gain('focus', rangerFocus(k, barr));
                addAcid(k, barr ? 3 : 1, this);
                if (k.rng() < rangerKeenChance(k)) rangerKeen(k); else rangerNoKeen(k);
                rangerRhythm(k, this, barr, 200);
                rangerQuickAfter(k, this, r);
              },
            },
            pierce: {
              id: 'caustic', replaces: 'pierce', name: 'Caustic Arrow', type: 'gcd', target: 'enemy', range: SPEC_RANGED, charges: 2, cd: 12, anim: 'attack',
              desc: 'Burst every stack of Acid at once: {d:200} plus {d:60} per stack, and {d:100} more for each stack past 5 (at 8: {d:980}). Two charges. Keen Eye adds {d:160} and gives the charge back.',
              glow: k => k.g.acid >= 8 || (k.g.acid >= 3 && k.charges(k.abById('caustic')) === 2),   // burst a full jar (or before a charge is lost)
              effect(k) {
                const n = k.g.acid; k.g.acid = 0; k.dots.delete('acid');
                const keen = k.consume('keen');
                const pot = 200 + 60 * n + 100 * Math.max(0, n - 5) + (keen ? 160 : 0), r = k.damage(pot, { ab: this });
                if (keen) { k.refundCharge('caustic'); if (k.perk('ranger_w2')) { k.damage(250, { ab: this }); k.fx('empower'); } }
                rangerPierce(k, keen, r, pot);
              },
              fx: { type: 'line', color: '#9aff4a', range: 440 },
            },
            barrage: { desc: 'Your next Quick Shot fires three times ({d:720}), gives triple Focus and three stacks of Acid.' },
          },
        };
      },
    },
  ],

  shadowblade: [
    {
      id: 'bladedancer', name: 'Bladedancer', title: 'The Whirling Edge', accent: '#e0c8ff',
      blurb: 'Steel in every direction. It doesn\'t matter where the boss is looking.',
      focus: 'Steady damage from anywhere. No positionals to chase, and Blade Fury spins through everything around you, but a lower peak.',
      passive: { name: 'Whirling Edge', desc: 'Your positionals always land, wherever you stand. Shadowstep becomes Blade Fury, a spinning flurry. Tempo: an Eviscerate at exactly 5 points, with no point spilled since your last one, adds a Tempo (up to 3); at 3 your next Blade Fury is a Flourish. A spilled point loses them all.' },
      gaugeTip: 'Strike gives 2 points (your positionals always land), Blade Fury 1. Eviscerate spends every point and hits for {d:115} more for each, with a {d:160} bonus at 5. A sixth point is lost, and so is your Tempo. The pips under the moons are Tempo.',
      build: () => ({
        potMult: 0.836,
        positionalAlways: () => true,
        abilities: {
          step: {
            id: 'fury', replaces: 'step', name: 'Blade Fury', type: 'ogcd', target: 'enemy', range: SPEC_MELEE, charges: 2, cd: 15, anim: 'attack',
            desc: 'Spin through everything around you: {d:260} and +1 combo point. Two charges. At 3 Tempo it is a Flourish instead: {d:650}, spending the Tempo.',
            glow: k => k.stacks('tempo') >= 3 || (k.g.combo === 4 && !k.g.spilled),
            effect(k) {
              const fl = k.stacks('tempo') >= 3;
              if (fl) { k.clear('tempo'); k.fx('empower'); }
              k.damage(fl ? 650 : 260, { ab: this }); bladeCombo(k, k.perk('shadowblade_a2') ? 2 : 1); bladeStep(k, this);
            },
            fx: { type: 'slash', color: '#e0c8ff', r: 60, span: 6.28 },
          },
        },
      }),
    },
    {
      id: 'nightstalker', name: 'Nightstalker', title: 'The Knife Behind', accent: '#d0304a',
      blurb: 'Wait in the dark behind them. Then end it.',
      focus: 'Burst from behind. Backstab hits very hard from the rear and Shadow Dance lasts longer, but standing anywhere else costs you more.',
      passive: { name: 'From the Shadows', desc: 'Eviscerate becomes Backstab: much stronger from behind, weaker from the front. Shadow Dance lasts 14s.' },
      build: () => ({
        potMult: 0.896,
        abilities: {
          evis: {
            id: 'backstab', replaces: 'evis', name: 'Backstab', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'attack',
            desc: 'Spend all combo points: {d:110} plus {d:115} per point, and {d:160} more at 5 points. From behind it hits {d:60} plus {d:30} per point harder; from the front, 25% weaker.',
            usable: k => k.g.combo >= 1,
            glow: k => k.g.combo >= 5 || (k.g.combo >= 4 && k.env.positional() === 'rear'),
            effect(k) {
              const cp = k.g.combo; k.g.combo = 0;
              const feint = k.talent('shadowblade_feint') && k.has('feint');
              const front = k.env.positional() === 'front' && !k.has('truenorth') && !k.has('dance') && !feint;
              const mult = bladeMult(k) * (k.has('dance') ? 1.25 : 1) * (front ? 0.75 : 1);
              const pot = 110 + 115 * cp + (cp >= 5 ? 160 : 0), bonus = 60 + 30 * cp;
              const o = bladeOpts(k, this, 'rear', bonus, mult);
              const r = k.damage(pot + (o.feint ? bonus : 0), o), hit = o.feint || r.posHit;
              if (cp >= 5 && k.perk('shadowblade_w2')) { k.damage((pot + (hit ? bonus : 0)) * 0.3, { ab: this, mult }); k.fx('empower'); }
              bladeFinisher(k, this, cp, (pot + (hit ? bonus : 0)) * mult);
            },
            fx: { type: 'slash', color: '#ff3a5a', r: 52, span: 1.4 },
          },
          dance: { desc: 'Burst: 14s of faster attacks, every positional lands, and Backstab hits 25% harder. Enter it at 5 combo points and the first Backstab in it keeps them.', effect(k) { bladePoise(k); k.buff('dance', 14); k.g.endless = 0; if (k.perk('shadowblade_w3')) k.gain('combo', 2, 5); } },
        },
      }),
    },
  ],

  pyromancer: [
    {
      id: 'cataclysm', name: 'Cataclysm', title: 'The Falling Star', accent: '#ff4a2a',
      blurb: 'Call the sky down. Big, slow, and worth the wait.',
      focus: 'Huge single hits. Pyroblast becomes Meteor: a rune circle on the boss, then a meteor smashes it 1.5s later and leaves a burning crater.',
      passive: { name: 'Meteor', desc: 'Pyroblast becomes Meteor: it lands 1.5s after you cast it, hits for {d:700}, and leaves a burning crater. Hot Streak still makes it instant.' },
      build: base => {
        // Meteor counts as Pyroblast for crits and Hot Streak (its crater burn doesn't)
        const asPyro = o => (o && o.ab && o.ab.id === 'meteor' && !o.dot ? Object.assign({}, o, { ab: { id: 'pyro' } }) : o);
        return {
          potMult: 0.758,
          init: () => Object.assign(base.init(), { meteors: [] }),
          critMod: (k, o) => base.critMod(k, asPyro(o)),
          onDamage: (k, amt, crit, o) => base.onDamage(k, amt, crit, asPyro(o)),
          tick(k) {
            base.tick(k);
            while (k.g.meteors.length && k.now >= k.g.meteors[0].at) k.g.meteors.shift().fn();
          },
          abilities: {
            pyro: {
              id: 'meteor', replaces: 'pyro', name: 'Meteor', type: 'gcd', target: 'enemy', range: SPEC_RANGED, anim: 'cast',
              cast: k => (k.has('hotstreak') ? 0 : 3.0),
              desc: '3s cast: a rune circle on the target, and 1.5s later a meteor smashes it for {d:700} and leaves a burning crater ({d:50} every 3s for 9s). With Hot Streak it\'s instant and hits for {d:800}. Vent while it falls and it comes down at once, the Heat you vented burning in its crater ({d:10} more a tick for every 10 Heat).',
              glow: k => k.has('hotstreak'),
              effect(k) {
                const hs = k.consume('hotstreak'), ab = this;
                k.gain('heat', hs ? 10 : 20, 100);
                const pot = hs ? 800 : 700;
                if (hs && k.talent('pyromancer_twin')) k.after(2.1, () => { k.damage(pot * 0.1, { ab, extra: true }); k.fx('twinFlame'); });   // a second, smaller meteor
                if (hs) pyroStoke(k);
                const m = { at: k.now + 1.5, heat: 0 };   // (a Vent while it falls: pyroVent brings it down now, its Heat in the crater)
                k.g.meteors.push(m);
                m.fn = () => {
                  k.damage(pot, { ab });
                  if (hs && k.talent('pyromancer_chain') && !k.has('hotstreak') && k.now >= (k.g.chainAt || 0)) { k.g.chainAt = k.now + 10; k.buff('heating', 15); k.fx('chainReact'); }
                  k.dot('crater', 50 + m.heat, 9, 3, { ab });
                  if (hs && k.perk('pyromancer_w2')) { k.dot('pyroburn', 70, 9, 3, { ab }); k.fx('empower'); }
                };
              },
              fx: { type: 'zone', style: 'meteor', color: '#ff4a2a', r: 90, range: SPEC_RANGED, dur: 1.6 },
            },
          },
        };
      },
    },
    {
      id: 'sigilmancer', name: 'Sigilmancer', title: 'The Burning Circle', accent: '#ffb347',
      blurb: 'Draw the circle, stand inside, and burn brighter than anyone. Step out and the fire fades.',
      focus: 'Positioning. Ember Circle makes you much stronger, but only while you stand in it, so where you plant it is the skill.',
      passive: { name: 'Ember Circle', desc: 'Combustion becomes Ember Circle: a circle of fire at your feet for 20s. Inside it you cast 20% faster and deal 15% more damage. Outside, nothing.' },
      build: base => {
        const inCircle = k => { const c = k.g.circle; if (!c || k.now > c.end || !k.env.pos) return false; const p = k.env.pos(); return Math.hypot(p.x - c.x, p.y - c.y) <= c.r; };
        return {
          potMult: 0.952,
          init: () => Object.assign(base.init(), { circle: null }),
          dmgMod: (k, o) => base.dmgMod(k, o) + (inCircle(k) ? 0.15 : 0),
          haste: k => (inCircle(k) ? 0.8 : 1),
          // a short buff that stays lit while you stand inside, so the HUD shows it
          tick(k) { base.tick(k); if (inCircle(k)) k.buff('incircle', 0.3); },
          abilities: {
            combust: {
              id: 'circle', replaces: 'combust', name: 'Ember Circle', type: 'ogcd', target: 'self', cd: 45, anim: 'big',
              desc: 'Plant a circle of fire at your feet for 20s. While you stand in it, you cast 20% faster and deal 15% more damage.',
              effect(k) {
                const p = k.env.pos ? k.env.pos() : { x: 0, y: 0 };
                const dur = (k.perk('pyromancer_a4') ? 26 : 20) + (k.talent('pyromancer_longburn') ? 5 : 0);
                k.g.circle = { x: p.x, y: p.y, r: 95, end: k.now + dur };
                if (k.perk('pyromancer_w3')) k.refill('fireblast');
                pyroBurst(k, dur);
              },
              fx: { type: 'zone', style: 'fire', color: '#ffb347', r: 95, range: 0, dur: 20 },
            },
          },
        };
      },
    },
  ],
};

// ======================================================================= ALEMBIST (healer, added with classes-b)
SPECS.alembist = [
  {
    id: 'apothecary', name: 'Apothecary', title: 'The Prepared Hand', accent: '#d8b070',
    gaugeTip: 'Five slots. Vials ripen to full strength in 5s and spoil after 40s. Smart Throw picks for you (a hurt ally gets your strongest heal, anyone else your oldest bomb) until Shift+R moves the gold mark: then Throw takes the vial you marked. The three coals under the still are the Kiln: every vial you throw that is not a bomb lights one, and with all three lit your next Throw also launches a free Kiln Bomb for {d:900}.',
    blurb: 'Every shelf labelled, every cure ready before the wound. The planner\'s healer.',
    focus: 'Planning. A deep bandolier that ripens fast, and Throw takes whichever vial you pick, so the right cure is always at hand.',
    passive: { name: 'Well-Stocked', desc: 'Your bandolier holds 5 vials, and they ripen in 5s instead of 10s. Throw can take any vial: Shift+R moves the pick along the bandolier, and the pick holds until you throw.' },
    build: base => ({
      potMult: base.potMult * 0.9,
      alem: { slots: 5, ripe: 5, spoil: 40, pick: true },
      gauge: Object.assign({}, base.gauge, { max: 5 }),
      abilities: {
        throw: { desc: 'Throw a vial at your heal target (1.25s): it shatters and splashes everyone close by; a bomb flies at the enemy instead. Shift+R picks the vial (it moves the gold mark along the bandolier, and the pick holds until you throw). Without a pick, Smart Throw chooses: an ally below 70% health gets your strongest heal, anyone else your oldest bomb (a Salt Ward or Salve first while a raidwide is on its way). Every vial that is not a bomb heats the Kiln by 1: at 3, your next Throw also launches a free Kiln Bomb for {d:900}. Vials ripen 30% stronger over 5s, and spoil after 40s.' },
      },
    }),
  },
  {
    id: 'volatile', name: 'Volatile', title: 'The Unstable Mix', accent: '#ff8a3a',
    gaugeTip: 'Every vial heats up to full strength in 4s, and its fuse burns out at 6s: still in the bandolier, it goes off on you at 60%. Catalyst makes the next brew take three reagents; three that make no Reaction brew the pair you put in twice, fully heated. Smart Throw: an ally below 70% health gets your strongest heal, anyone else your oldest bomb. The three coals under the still are the Kiln: every vial you throw that is not a bomb lights one, and with all three lit your next Throw also launches a free Kiln Bomb for {d:900}.',
    blurb: 'Nothing in the bandolier stays quiet for long. Some mixtures do things no book admits to.',
    focus: 'Reactions. Three-reagent brews make stronger, stranger vials you find by experimenting, but every vial is on a short fuse.',
    passive: { name: 'Short Fuse', desc: 'Every vial heats up to full strength in 4s and has a 6s fuse: if it\'s still in your bandolier when the fuse runs out, it goes off on you, weaker, and a bomb burns you. Distill becomes Catalyst.' },
    build: base => ({
      potMult: base.potMult * 0.86,
      alem: { slots: 3, fuse: 6, heat: 4 },
      abilities: {
        throw: { desc: 'Throw a vial at your heal target (1.25s): it shatters and splashes everyone close by. Smart Throw: an ally below 70% health gets your strongest heal, anyone else your Quickpowder (Galvanized: 10% more damage for 10s), else your oldest bomb, which flies at the enemy (while a raidwide is on its way, a Salt Ward or Salve goes first). Every vial that is not a bomb heats the Kiln by 1: at 3, your next Throw also launches a free Kiln Bomb for {d:900}. Vials heat up 30% stronger over 4s, and go off on you when their 6s fuse runs out.' },
        distill: {
          id: 'catalyst', replaces: 'distill', name: 'Catalyst', type: 'ogcd', target: 'self', cd: 14, charges: 2, anim: 'cast', lock: 0.3,
          get desc() { return `Your next brew takes three reagents. Three that make a Reaction brew it; three that don't brew the pair you put in twice, fully heated. It glows while the still is empty.<div class="alem-book">${alemBook(alemSavedKnown(), true)}</div>`; },
          usable: k => !k.has('catalyst'),
          glow: k => !k.g.half.length && alemRoom(k),
          effect(k) {
            k.buff('catalyst', 20);
            if (k.perk('alembist_a4')) k.g.ripeNext = true;
            if (k.talent('alembist_flash') && k.g.last && k.now >= (k.g.flashAt || 0)) { k.g.flashAt = k.now + 20; alemAdd(k, k.g.last, { copy: true }); }
            if (k.talent('alembist_fume') && k.now >= (k.g.fumeAt || 0)) { k.g.fumeAt = k.now + 30; k.mitigate('party', 0.1, 8, { ab: this }); }
          },
          fx: { color: '#ff8a3a' },
        },
      },
    }),
  },
];

// Judgment (Inquisitor): the boss carries n charges; each ally hit bursts one for this much damage (the host
// credits it to the Inquisitor). The burst's strength is worked out here so gear and the balance knob count.
function specBrand(k, n, ab) {
  const amount = Math.round(70 * ENGINE.POT_SCALE * (k.def.potMult || 1) * (1 + (k.gear().power || 0)));
  k.env.emit({ type: 'brand', ticks: n, amount, ab });
}

// the kit a hero plays with this spec (or the base kit for none / an unknown spec)
const SPEC_CACHE = {};
function specOf(classId, specId) { return (SPECS[classId] || []).find(s => s.id === specId) || null; }
// talents (the third argument: a Set of held talent ids) can grant whole new moves: TALENT_ABILITIES in kits.js maps a
// talent to the move it puts in a slot (`replaces` names the base ability it takes over, as a spec's replacement does),
// with an optional per-spec version. The kit then plays that move in that slot, over the spec's own version.
// The one place a talent's new move is looked up. Two ways to declare one, read the same:
//   TALENT_ABILITIES[talentId] = { cls, ab, spec?: { specId: ab } }   (kits.js; the main registry)
//   KITS[classId].talentAbilities[talentId] = ab                       (on the kit itself; a spec's build may override it)
// Either way the move names the slot it takes (`replaces`), and the talent in talents.js says `grants: true`.
function talentMoveFor(classId, specId, talentId) {
  const g = typeof TALENT_ABILITIES !== 'undefined' && TALENT_ABILITIES[talentId];
  if (g && g.cls === classId) return (g.spec && specId && g.spec[specId]) || g.ab;
  const k = specKit(classId, specId), ta = k && k.talentAbilities;
  return (ta && ta[talentId]) || null;
}
function kitFor(classId, specId, talents) {
  const kit = specKit(classId, specId);
  if (!kit || !talents || !talents.size || typeof TALENT_ABILITIES === 'undefined') return kit;
  const granted = [...talents].filter(id => talentMoveFor(classId, kit.spec || null, id)).sort();
  if (!granted.length) return kit;
  const key = `${classId}:${kit.spec || ''}:${granted.join(',')}`;
  if (SPEC_CACHE[key]) return SPEC_CACHE[key];
  const moves = granted.map(id => ({ id, ab: talentMoveFor(classId, kit.spec || null, id) }));
  const abilities = kit.abilities.map(ab => {
    const m = moves.find(x => x.ab.replaces === (ab.replaces || ab.id));
    return m ? Object.assign({}, m.ab, { fromTalent: m.id }) : ab;
  });
  return (SPEC_CACHE[key] = Object.assign({}, kit, { abilities }));
}
// a move by its id, wherever it comes from (the kit, its spec, or a talent): how other clients find what you cast
function abilityById(classId, specId, id) {
  const k = specKit(classId, specId);
  // (the Ultimate on T, and the empowered moves of its window: engine.js ultAbilityById)
  const u = k && typeof ultAbilityById === 'function' ? ultAbilityById(k, id) : null;
  if (u) return u;
  // (a paced kit's named moves, the strings an Ironpalm's presses spell, live in its `moves`)
  const own = k && (k.abilities.find(a => a.id === id) || (k.moves && k.moves.find(m => m.id === id)));
  if (own || typeof TALENT_ABILITIES === 'undefined') return own || null;
  const k2 = specKit(classId, specId), tids = [...Object.keys(TALENT_ABILITIES), ...Object.keys((k2 && k2.talentAbilities) || {})];
  for (const tid of tids) { const m = talentMoveFor(classId, specId, tid); if (m && m.id === id) return m; }
  return null;
}
function specKit(classId, specId) {
  const base = KITS[classId], spec = specOf(classId, specId);
  if (!spec) return base;
  const key = classId + ':' + spec.id;
  if (SPEC_CACHE[key]) return SPEC_CACHE[key];
  const ch = spec.build(base);
  const abilities = base.abilities.map(ab => {
    const o = ch.abilities && ch.abilities[ab.id];
    if (!o) return ab;
    // a full replacement names the ability it replaces; otherwise it's a change to the base ability
    // (copied with their getters intact: a description can be live, like the Volatile's sealed Reactions)
    const copy = (...src) => src.reduce((to, s) => Object.defineProperties(to, Object.getOwnPropertyDescriptors(s)), {});
    return o.replaces ? copy(o) : copy(ab, o);
  });
  const kit = Object.assign({}, base, ch, { abilities, spec: spec.id });
  if (spec.gauge) kit.gauge = Object.assign({}, base.gauge, spec.gauge);
  SPEC_CACHE[key] = kit;
  return kit;
}
// the icon an ability wears (icons/<class>/<icon or id>.png; every spec ability has its own painting). A move a talent grants wears its
// own icon (icons/<class>/<id>.png) once icons/talent-icons.json lists its id, the one it borrows until then.
const PAINTED_TALENT_ICONS = new Set();
if (typeof fetch !== 'undefined' && typeof document !== 'undefined') fetch('icons/talent-icons.json').then(r => (r.ok ? r.json() : [])).then(l => { for (const id of l) PAINTED_TALENT_ICONS.add(id); }).catch(() => {});
const abilityIconId = ab => ((ab.talent || ab.fromTalent) && PAINTED_TALENT_ICONS.has(ab.id) ? ab.id : ab.icon || ab.id);

if (typeof module !== 'undefined') module.exports = { SPECS, specOf, kitFor, abilityById, abilityIconId, talentMoveFor };

// ===================================================================================================================
// ADVANCED CLASSES: the Thermist's and the Driftblade's specs (their kits are at the end of kits.js)
// ===================================================================================================================
Object.assign(SPECS, {
  thermist: [
    {
      id: 'pendulum', name: 'Pendulum', title: 'The Swinging Weight', accent: '#ffb08a',
      gaugeTip: 'Fire spells turn the dial toward Blaze and frost toward Rime, one step further than usual. Each step from 0 is +8% damage for that side\'s spells. A crossing of 0 after reaching 3 or more sets off a Thermal Shock, and every crossing adds Momentum (+4% damage each, up to 5), lost after 6s without one. Past ±5 you overload.',
      blurb: 'Back and forth, faster each time. Never let it settle.',
      focus: 'Fast swings. Every spell moves the dial a step further and every crossing of 0 builds Momentum, so you play back and forth like a metronome.',
      passive: { name: 'Momentum', desc: 'Your spells move the dial one step further. Every crossing of 0 adds a stack of Momentum (up to 5, +4% damage each); 6s without a crossing and they\'re gone.' },
      build: () => ({
        potMult: 0.8,   // balance knob (tools/simulate.js)
        stepBonus: 1, momentum: true,
        dmgMod: k => 0.04 * k.stacks('momentum'),
        abilities: {
          cinder: { desc: 'Instant, 1.5s recast: a quick fire bolt for {d:210}. Turns the dial 2 toward Blaze. Your spell on the move.' },
          rime: { desc: 'Instant, 1.5s recast: a quick shard of ice for {d:210}. Turns the dial 2 toward Rime. Your spell on the move.' },
          flare: { desc: '2s cast: a burst of fire for {d:400}. Turns the dial 3 toward Blaze. At +5 it\'s instant and always crits, but holds you On the Brink for 6s: if your next spell is fire too, you overheat.' },
          lance: { desc: '2s cast: a lance of ice for {d:400}. Turns the dial 3 toward Rime. At -5 it\'s instant and always crits, but holds you On the Brink for 6s: if your next spell is frost too, you get frostbite.' },
        },
      }),
    },
    {
      id: 'zenith', name: 'Zenith', title: 'The Burning Edge', accent: '#ff5a6a',
      gaugeTip: 'Fire spells turn the dial toward Blaze and frost toward Rime; each step from 0 is +8% damage for that side. At ±5 you stay in Redline: +20% damage, your edge spell is instant, and pushing further doesn\'t overload you. Strain builds 11 a second in Redline and fades outside it; at 100 you melt down. A crossing of 0 after reaching 3 or more sets off a Thermal Shock.',
      blurb: 'Hold the edge. Feel it burn. Let go a moment before it takes you.',
      focus: 'Holding the edge. At ±5 you stay in Redline, where every spell is stronger, but Strain builds until you vent it or melt down.',
      passive: { name: 'Redline', desc: 'At +5 or -5 you stay in Redline instead of overloading: every spell hits 20% harder and your edge spell is instant. Each second there builds Strain; full Strain melts you down (the dial snaps to 0, you burn, and that element seizes up for 4s: Overheat or Frostbite). Equilibrium becomes Bleed Off.' },
      build: () => ({
        potMult: 0.84,
        redline: true,
        abilities: {
          flare: { desc: '2s cast: a burst of fire for {d:400}. Turns the dial 2 toward Blaze. In Redline at +5 it\'s instant and keeps you there.' },
          lance: { desc: '2s cast: a lance of ice for {d:400}. Turns the dial 2 toward Rime. In Redline at -5 it\'s instant and keeps you there.' },
          equil: {
            id: 'bleed', replaces: 'equil', name: 'Bleed Off', type: 'ogcd', target: 'self', cd: 15, anim: 'cast',
            desc: 'Vent 60 Strain without leaving the edge. The heat you let go wraps you in a shield of {s:160}.',
            glow: k => (k.g.strain || 0) >= 55,
            effect(k) {
              const vented = Math.min(60, k.g.strain || 0);
              k.g.strain = Math.max(0, (k.g.strain || 0) - 60);
              k.shield('self', 160 * (k.perk('thermist_a2') ? 1.5 : 1), 6, { ab: this });
              thermUtility(k, this, vented >= 40);
              if (k.talent('thermist_pulse') && thermAt(k, THERMIST.EDGE)) thermShock(k, 3, 1, Math.sign(k.g.temp));
            },
            fx: { type: 'aura', color: '#ff8a6a', r: 34, dur: 1.2 },
          },
        },
      }),
    },
  ],

  driftblade: [
    {
      id: 'orbit', name: 'Orbit', title: 'The Circling Hawk', accent: '#a8f0c8',
      gaugeTip: 'A Passing Strike gives 10, Hook Turn 15, Slipstream 15. Walking fills 15 a second; after 1.5s standing still it drains 15 a second. Circling close round your target builds Orbit (up to 5, gone 5s after you stop): at 5, Carve cuts on its own every 1.4s while you keep moving.',
      blurb: 'Round and round, a little closer every time. The hawk never lands.',
      focus: 'Smooth circles. Circling your target builds Orbit, and at full Orbit your sabre cuts on its own while you keep moving.',
      passive: { name: 'Circling Hawk', desc: 'Every radian you circle round your target at close range adds a stack of Orbit (up to 5; they fade 5s after you stop circling). At 5, Carve strikes on its own every 1.4s while you move.' },
      build: () => ({ potMult: 0.598, orbit: true }),
    },
    {
      id: 'comet', name: 'Comet', title: 'The Long Charge', accent: '#ffd08a',
      gauge: { max: 200 },
      gaugeTip: 'A Passing Strike gives 10, Hook Turn 15, Slipstream 15, every Carve 6. Walking fills 15 a second, 22 once you hold a straight line; after 3s standing still it drains 15 a second. Holds up to 200. Impact needs 100 and spends it all.',
      blurb: 'Build speed across the whole hall. Then hit like something falling from the sky.',
      focus: 'Big, readable burst. Drift holds twice as much and fills faster in straight lines, and Crosswind becomes Impact, a charge clean through the boss.',
      passive: { name: 'Long Charge', desc: 'Drift holds up to 200, fills faster while you run in a straight line, every Carve winds it 6, and it holds 3s when you stop. Crosswind becomes Impact: a charge clean through your target that releases everything at once.' },
      build: () => ({
        potMult: 0.533,
        driftMax: 200, straight: true, driftHold: 3, carveDrift: 6,   // (a Comet holds its charge 3s standing still before it drains)
        abilities: {
          cross: {
            id: 'impact', replaces: 'cross', name: 'Impact', type: 'gcd', target: 'enemy', range: SPEC_RANGED, anim: 'big',
            desc: 'Needs 100 Drift. Spend it all: charge clean through your target and out the far side, releasing it all at once: {d:120}, plus {d:40} for every 10 Drift you spend. The charge through its body is a Passing Strike too. From 160 it always crits (it glows then).',
            usable: k => k.g.drift >= 100,   // (the Drift floor: a charge needs a real run-up behind it)
            glow: k => k.g.drift >= 160,
            effect(k) {
              // (the charge runs clean through the body: a Passing Strike with the whole run-up behind it)
              const tg = k.env.target({ target: 'enemy', range: 300 });
              if (tg) { k.g.passAt = k.now + DRIFT.ICD; driftPass(k, tg); }
              const d = k.g.drift; k.g.drift = 0;
              k.teleport('through', { ab: this, d: 120 });
              k.damage(120 + 4 * d, { ab: this, autoCrit: d >= 160 });
              if (d >= 180 && k.perk('driftblade_w2')) { k.damage((120 + 4 * d) * 0.3, { ab: this }); k.fx('empower'); }
              driftSpend(k, d, 200);
            },
            fx: { type: 'line', color: '#ffe0a8', range: 440 },
          },
        },
      }),
    },
  ],
});

// ===================================================================================================================
// ADVANCED TANKS (tanks-2): the Gorgemaw's and the Oathbroker's specs (their kits are at the end of kits.js)
// ===================================================================================================================
Object.assign(SPECS, {
  gorgemaw: [
    {
      id: 'glutton', name: 'Glutton', title: 'The Endless Appetite', accent: '#ff9a4a',
      gauge: { max: 5 },
      gaugeTip: 'Holds up to 5 Morsels: Ring (circles), Lance (lines), Fang (cones), Spike (tankbusters). Spit fires the oldest; two of the same shape in a row go together as a Fusion. Digest eats them all, and its acid makes the next Spit 50% harder for each (up to twice as hard).',
      blurb: 'There is always room for more. And more of the same is better.',
      focus: 'Eating the same thing twice. A deeper Belly, and two Morsels of one shape spat together fuse into something far worse for the boss.',
      passive: { name: 'Endless Appetite', desc: 'Your Belly holds 5 Morsels. When the next Morsel after the one you spit is the same shape, both go at once as a Fusion: two Rings a Quake, two Lances a Skewer, two Fangs a Maul, two Spikes an Impale.' },
      build: () => ({
        potMult: 0.82,   // balance knob (tools/simulate.js)
        bellyMax: 5, fuse: true,
        abilities: {
          spit: { desc: 'Spit your oldest Morsel back at the boss in the shape you ate it. If the next one is the same shape, both go together as a Fusion, 2.4 times as strong as one: Ring {d:420}, Lance {d:460}, Fang {d:490}, Spike {d:800} alone. After a Digest it carries the acid: 50% harder for each Morsel digested, up to twice as hard.' },
        },
      }),
    },
    {
      id: 'gizzard', name: 'Gizzard', title: 'The Iron Stomach', accent: '#c8b070',
      gaugeTip: 'Holds up to 3 Morsels: Ring (circles), Lance (lines), Fang (cones), Spike (tankbusters). Digest turns each into protection for the party, by its shape, and its acid makes the next Spit 50% harder for each (up to twice as hard).',
      blurb: 'Whatever it swallows comes back out as armour for everyone else.',
      focus: 'Protecting the party. Digest turns every Morsel into a shield or a ward for your allies, each shape its own kind.',
      passive: { name: 'Iron Stomach', desc: 'Digest feeds the party instead of you: a Ring shields everyone for {s:150}, a Lance puts a {s:360} shield on whoever is hurt most, a Fang cuts the party\'s damage taken, a Spike makes the most hurt ally immune for 2s. You still heal 3% of your HP for each.' },
      build: () => ({
        potMult: 0.88,
        abilities: {
          digest: {
            desc: 'Digest every Morsel at once into protection for the party. Ring: a {s:150} shield on everyone. Lance: a {s:360} shield on whoever is hurt most. Fang: the party takes 15% less damage for 6s. Spike: the most hurt ally is immune for 2s. You heal 3% of your HP for each, and the acid makes your next Spit within 15s hit 50% harder for each (up to 100%).',
            effect(k) {
              const eaten = mawDigestTake(k, this);
              if (!eaten.length) return;
              k.healRaw('self', k.env.maxHp() * 0.03 * eaten.length * mawGut(k), { ab: this });
              const n = m => eaten.filter(e => e.m === m).length * mawGut(k);   // (Iron Gut: each counts twice)
              if (n('ring')) k.shield('party', 150 * n('ring'), 10, { ab: this });
              if (n('lance')) k.shield('lowest', 360 * n('lance'), 10, { ab: this });
              if (n('fang')) k.mitigate('party', Math.min(0.3, 0.15 * n('fang')), 6, { ab: this });
              if (n('spike')) k.mitigate('lowest', 1, 2, { kind: 'invuln', ab: this });
            },
          },
        },
      }),
    },
  ],

  oathbroker: [
    {
      id: 'guarantor', name: 'Guarantor', title: 'The Co-Signer', accent: '#c8d8f0',
      gaugeTip: '60% of the damage you take is written into the Ledger, due 8s later. A co-signed ally\'s Ledger share (30% of what they take) is written into yours, marked with a seal.',
      blurb: 'Your word is good for two. Their wounds go on your account.',
      focus: 'Protecting one ally. Co-sign a friend and part of everything that hits them goes onto your Ledger instead.',
      passive: { name: 'Co-Signer', desc: 'Lien becomes Co-Sign: for 10s, 30% of the damage an ally takes is written into your Ledger instead, and Settle pays it with the rest. Paying a co-signed line down with Collect heals the ally it was written for.' },
      build: () => ({
        potMult: 0.9,
        abilities: {
          lien: {
            id: 'cosign', replaces: 'lien', name: 'Co-Sign', type: 'ogcd', target: 'ally', cd: 20, anim: 'cast', lock: 0.4,
            desc: 'Co-sign an ally (the one you\'ve picked, or whoever is hurt most): for 10s, 30% of the damage they take is written into your Ledger instead, due 8s later. Every Collect strike that pays a co-signed line down heals that ally for what it paid. Half the time covered: sign before the blow you want to share.',
            glow: k => bossCasting(k) && !(k.g.cosign != null && k.g.cosignUntil > k.now + 2),
            effect(k, t) { const dur = k.perk('oathbroker_w3') ? 13 : 10; oathSend(k, { op: 'cosign', target: t, dur }); k.g.cosignUntil = k.now + dur; },
            fx: { color: '#c8d8f0' },
          },
        },
      }),
    },
    {
      id: 'collector', name: 'Collector', title: 'The Debt Comes Due', accent: '#d8b05a',
      gaugeTip: '60% of the damage you take is written into the Ledger, due 8s later. Every bill that comes due also strikes the boss for half its size.',
      blurb: 'Every debt is owed twice: once by you, and once by whoever made you take it.',
      focus: 'A big Ledger. Every bill that comes due strikes the boss for half its size, so the more you owe, the harder you hit.',
      passive: { name: 'Due With Interest', desc: 'Every entry that comes due also strikes the boss for half its size. Default becomes Foreclose: the whole Ledger turned into one blow on the boss.' },
      build: () => ({
        potMult: 0.79,
        collector: OATH.COL,
        abilities: {
          default: {
            id: 'foreclose', replaces: 'default', name: 'Foreclose', type: 'ogcd', target: 'enemy', range: 300, cd: 120, anim: 'big',
            desc: 'Call in every debt at once: the whole Ledger is erased and strikes the boss in one blow. A Ledger holding 30% of your HP or more strikes for a quarter more than everything that was written (a renegotiated entry at one and a half times that); a smaller one for only 30% of it. Your credit freezes for 10s after.',
            usable: k => k.g.ledger.length > 0,
            glow: k => oathTotal(k) >= oathHp(k) * 0.3,
            effect(k) {
              oathSend(k, { op: 'foreclose', mult: 1, freeze: k.perk('oathbroker_a4') ? 7 : OATH.FREEZE });
              k.g.ledger = []; k.g.total = 0;
              oathDefaultAfter(k, this);
            },
            fx: { color: '#ffd27a' },
          },
        },
      }),
    },
  ],
});

// IRONPALM's specs (its kit is the last block of kits.js)
// ===================================================================================================================
SPECS.ironpalm = [
  {
    id: 'stillwater', name: 'Still Water', title: 'The Unmoving Pond', accent: '#8fc8e8',
    gaugeTip: 'Every press costs Breath: Light 12, Heavy 18, Kick 15 (40% less when Crisp). It refills 11 a second while you fight and 36 a second once you stop for half a moment; Crane Step gives 22. Below 18 you\'re winded until it\'s back to 45: every press is a weak tap, and it refills at the resting pace (75% of it while you keep tapping). Flowing Palms with all three palms Crisp gives 12 back when it leaves you under 40. A perfect Read fills it to the top.',
    blurb: 'Let the blow come. Be where it isn\'t, and answer it.',
    focus: 'Reading blows. Every perfect Read fills your Breath to the top, Read has two charges, and Still Pond lets you read every blow for a while.',
    passive: { name: 'Still Water', desc: 'A perfect Read fills your Breath to the top, on any hit. Read has two charges. Iron Skin becomes Still Pond.' },
    build: base => ({
      potMult: base.potMult * 1.01,   // balance knob (tools/simulate.js)
      stillWater: true,
      abilities: {
        read: { charges: 2, desc: 'Drop into a reading stance for 1.2s: 20% less damage. A hit that lands in its first 0.4s is read: it lands at half strength, you counter for {d:63}, and your Breath fills to the top. Read a tankbuster (or any blow after Iron Ox) and your next Heavy is a free, Crisp Thousand Palms, 30% stronger. Two charges.' },
        skin: {
          id: 'pond', replaces: 'skin', name: 'Still Pond', type: 'ogcd', target: 'self', cd: 90, lock: 0.5, anim: 'big',
          desc: 'Settle like still water for 8s: 25% less damage, and Read comes back 0.8s after you use it. Read every blow.',
          effect(k) { k.mitigate('self', k.perk('ironpalm_a4') ? 0.35 : 0.25, 8, { ab: this }); k.buff('pond', 8); k.refill(ipAbId(k, 'read')); },
        },
      },
    }),
  },
  {
    id: 'avalanche', name: 'Avalanche Fist', title: 'The Falling Mountain', accent: '#d08a5a',
    gaugeTip: 'Every press costs Breath: Light 12, Heavy 18, Kick 15 (40% less when Crisp). It refills 11 a second while you fight and 36 a second once you stop for half a moment; Crane Step gives 22. Below 18 you\'re winded until it\'s back to 45: every press is a weak tap, and it refills at the resting pace (75% of it while you keep tapping). Flowing Palms with all three palms Crisp gives 12 back when it leaves you under 40. Every named move adds Momentum (+2% damage, a move of four inputs or more 2 of it, up to 8), gone 4s after your last one. A broken string staggers you for 0.2s and costs 2 Momentum.',
    blurb: 'Start the slide and never let it stop.',
    focus: 'Long strings. Every named move builds Momentum, and moves of four inputs or more hit harder and build twice as much, but a string you break staggers you and knocks some of it away.',
    passive: { name: 'Avalanche', desc: 'Every named move adds Momentum: +2% damage, up to 8 (a move of four inputs or more adds 2), gone 4s after your last named move. Moves of four inputs or more hit 15% harder. A string you break staggers you for 0.2s and costs 2 Momentum. Temple Bell becomes Landslide.' },
    build: base => ({
      potMult: base.potMult * 0.89,
      avalanche: true,
      abilities: {
        bell: {
          id: 'slide', replaces: 'bell', name: 'Landslide', type: 'ogcd', target: 'self', cd: 60, lock: 0.5, anim: 'big',
          desc: 'Plant your feet like a mountain coming down: the whole party takes 10% less damage for 8s, and for 15s your strings can\'t drop, a broken one doesn\'t stagger you, and your Momentum fills and holds.',
          effect(k) {
            k.mitigate('party', 0.1, 8, { ab: this });
            const dur = k.perk('ironpalm_w3') ? 20 : 15;
            k.buff('slide', dur); k.buff('rush', dur, {}, IRONPALM.RUSH_MAX, IRONPALM.RUSH_MAX);
            if (k.talent('ironpalm_bellecho')) k.heal('party', 130, { ab: this });
            if (k.talent('ironpalm_gong')) k.after(8, () => { k.mitigate('party', 0.1, 4, { ab: this }); k.fx('gong'); });
          },
        },
      },
    }),
  },
];

// CLASSES-C: the Threadweaver's and the Marionettist's specs (their kits are at the end of kits.js)
// ===================================================================================================================
Object.assign(SPECS, {
  threadweaver: [
    {
      id: 'loomwright', name: 'Loomwright', title: 'The Living Web', accent: '#9ab8ff',
      gaugeTip: 'Fills as your threads carry damage. Up to 5 threads, and a heal runs two links deep: 60% to the far end, 30% on through its threads.',
      blurb: 'One web over the whole party, every strand known by touch.',
      focus: 'A network. Up to five threads, and heals travel two links deep, so a web built before the hit heals everyone it touches.',
      passive: { name: 'Living Web', desc: 'You can hold 5 threads instead of 3, and a heal runs two links deep: 60% to the far end of each thread, then 30% on through that ally\'s own threads.' },
      build: base => ({
        potMult: base.potMult * 0.93,
        maxThreads: 5, deep: true,
        abilities: {
          tie: { desc: 'Tie your target to yourself with a glowing thread. Press it on a second ally within 4s and those two are tied to each other instead. On an ally already on your threads, it pulls them up to 220 px along the thread toward its far end instead: yank someone out of a puddle. Up to 5 threads; tying another drops your oldest. Two charges.' },
          shuttle: { desc: 'Instant: throw the shuttle down every thread you hold. It strikes the boss for {d:120} per thread (five threads: {d:600}), and each Thread on you tugs a {h:100} heal to whoever is on its far end.' },
        },
      }),
    },
    {
      id: 'shears', name: 'Shears', title: 'The Cut Thread', accent: '#ff9ab8',
      gaugeTip: 'Fills as your threads carry damage. Your threads hold 60% more of what they carry, and every thread Snap cuts gives back 10 Spool.',
      blurb: 'Tie it, let it take the strain, then cut it loose with a flourish.',
      focus: 'Burst healing. Threads store more, and Snap is your main heal on a short cooldown that pays you back. A Tie that pulls an ally also shields them.',
      passive: { name: 'Sharp Shears', desc: 'Snap recharges in 8s, releases 60% more of what a thread carried, and every thread it cuts gives back 10 Spool. A Tie that pulls an ally along a thread also wraps them in a {s:260} shield for 2s.' },
      build: base => ({
        potMult: base.potMult * 1.06,
        store: 1.6, snipSpool: 10, snipPot: 170, lash: true, shuttleCut: 8,
        abilities: {
          snip: { cd: 8, desc: 'Cut the threads on your target (all of yours, if it has none). Each one releases 60% more than the damage it carried in the last 5s as a heal to both its ends (at least {h:170}), and gives back 10 Spool.' },
          shuttle: { desc: 'Instant: throw the shuttle down every thread you hold, and down the cut ends of every thread Snap cut in the last 8s. It strikes the boss for {d:120} per thread, up to 5 ({d:600}), and each Thread on you tugs a {h:100} heal to whoever is on its far end.' },
          tie: { desc: 'Tie your target to yourself with a glowing thread. Press it on a second ally within 4s and those two are tied to each other instead. On an ally already on your threads, it snaps them up to 220 px along the thread toward its far end instead, and wraps them in a {s:260} shield for 2s. Up to 3 threads; tying another drops your oldest. Two charges.' },
        },
      }),
    },
  ],

  marionettist: [
    {
      id: 'cuttingline', name: 'Cutting Line', title: 'The Bladed String', accent: '#ff6a8a',
      gaugeTip: 'Builds from the Doll\'s hits; Grand Finale spends it. The strings reach 400 px, and they cut whatever they cross once a second. Taut String: the longer the line stays across, the brighter the red edge and the harder the cut.',
      blurb: 'Every string a blade. Stand right, and the stage itself bleeds.',
      focus: 'Positioning. The strings always cut what they cross and reach 400 px, and Cross-Cut is off the global cooldown with two charges.',
      passive: { name: 'Bladed String', desc: 'The strings reach 400 px before they tear, and they cut whatever enemy they cross for {d:48}, once a second. Taut String: every second the line stays across, the cut grows by {d:12}, up to {d:120}; the line leaving the enemy or a String tearing slackens it. Cross-Cut is off the global cooldown, with two charges.' },
      build: base => ({
        potMult: base.potMult * 0.622,
        stretch: 400, bladed: true,
        abilities: {
          cross: { type: 'ogcd', charges: 2, cd: 9, lock: 0.4, desc: 'Off the global cooldown, two charges: your strings become blades and cut along the line between you and the Doll. With the enemy on that line it\'s a {d:560} cut and 2 Encore; otherwise it cuts nothing.' },
        },
      }),
    },
    {
      id: 'understudy', name: 'Understudy', title: 'Two Dolls on One Bar', accent: '#e8a0ff',
      gaugeTip: 'Builds from the Dolls\' hits; Grand Finale spends it. The triangle between you and both Dolls is the Stage: an enemy inside it takes 10% more damage from the whole party.',
      blurb: 'Two dolls, one bar, and a stage the whole party plays on.',
      focus: 'Teamwork. Two smaller Dolls, and the triangle between you and them is the Stage: an enemy standing in it takes more damage from everyone.',
      passive: { name: 'The Stage', desc: 'You work two Dolls, each hitting for a little over half. The triangle between you and both Dolls is the Stage: an enemy inside it takes 10% more damage from the whole party. W and Swap move the Doll nearest where you aim.' },
      // (its own damage is a little lower: the Stage pays the rest to the party)
      balance: 0.93,
      build: base => ({
        potMult: base.potMult * 0.9035,
        dolls: 2, dollMult: 0.58,
        // (each Doll hits at 58%: the numbers here are per Doll)
        abilities: {
          jab: { desc: 'Each Doll in reach stabs for {d:145}. Builds 1 Encore.' },
          pull: { desc: 'Fling the Doll nearest where you aim to that spot (within its strings\' reach). It cuts anything it passes through for {d:92.8}, and stays there until you pull it again or pick another target. Builds 1 Encore on a hit. Two charges.' },
          cross: { desc: 'Your strings become blades and cut along the lines between you and the Dolls. Each line with the enemy on it cuts for {d:324.8}, and a cut gives 2 Encore; otherwise it cuts nothing.' },
          pirouette: { desc: 'The Dolls spin, each cutting all around it for {d:174}, and nothing can touch them for 1.5s. Builds 1 Encore.' },
          finale: { desc: 'Spend 5 Encore: each Doll in reach performs a routine of five hits, each {d:92.8}. They can\'t move while it plays.' },
        },
      }),
    },
  ],
});

// ===================================================================================================================
// GLOOMSWORN (tank, class 18): the Sentinel's and the Reaver of Dusk's specs (the kit is the last block of kits.js)
// ===================================================================================================================
SPECS.gloomsworn = [
  {
    id: 'duskward', name: 'Sentinel', title: 'The Long Vigil', accent: '#9ab8ff',
    gaugeTip: 'Every hit you land fills 8 Gloom and every hit you take 6. Gloom Strike spends 40, Black Pall 30, Last Rite all of it. Out of combat the vessel drains, but only 1 a second. Full Gloom when a blow would kill you makes you Hollow.',
    blurb: 'A wall that lasts. The dark keeps its watch over the others too.',
    focus: 'Protecting the party. Your barriers last longer and chain on to the ally who needs one, Black Pall holds longer, and the vessel drains slower.',
    passive: { name: 'Long Vigil', desc: 'Gloom Strike\'s barrier lasts 10s instead of 6s and a second barrier ({s:110}) falls on the most hurt ally. Black Pall lasts 8s. Gloom drains 1 a second out of combat instead of 2.5.' },
    build: base => ({
      potMult: base.potMult * 0.995,   // balance knob (tools/simulate.js)
      sentinel: true, slowDecay: true,
      abilities: {
        strike: { desc: 'Spend 40 Gloom: a heavy blow for {d:540} that wraps you in a barrier of {s:150} for 10s, and the ally who is hurt most in one of {s:110}. Two charges. Needs 40 Gloom.' },
        pall: { desc: 'Spend 30 Gloom: a pall falls over the whole party, 25% less damage taken for 8s.' },
      },
    }),
  },
  {
    id: 'duskreaver', name: 'Reaver of Dusk', title: 'The Hollow Blade', accent: '#c85a8a',
    gaugeTip: 'Every hit you land fills 8 Gloom and every hit you take 6. Gloom Strike spends 40, Black Pall 30, Last Rite all of it. Full Gloom when a blow would kill you makes you Hollow, for 10s instead of 8s, and Gloom Strike echoes while you are.',
    blurb: 'The dark is a weapon. Let it hollow you out, and cut.',
    focus: 'Damage. You hit harder, Hollow lasts 10s, and while Hollow every Gloom Strike hits twice.',
    passive: { name: 'Hollow Blade', desc: 'You deal 6% more damage. Hollow lasts 10s instead of 8s, and while you are Hollow Gloom Strike echoes, hitting again for 60%.' },
    build: base => ({
      potMult: base.potMult * 0.94,
      hollowLong: true, hollowEcho: true,
      dmgMod: k => base.dmgMod(k) + 0.06,
    }),
  },
];

// ===================================================================================================================
// THRESHER (damage, class 19): the Sower's and the Grim's specs (the kit is in kits.js, after the Gloomsworn)
// ===================================================================================================================
SPECS.thresher = [
  {
    id: 'sower', name: 'Sower', title: 'The Quick Hand', accent: '#9be06a',
    gaugeTip: 'Four afflictions on the boss, each a bar that ripens: green (young, 2s), gold (ripe, until 6.5s), then rotten. Slash and Cleave lay all four between them, and Hook and the Wisp too. Reap pays gold in full, young 40%, rotten 65%.',
    blurb: 'Plant everything, and quickly. The harvest never waits.',
    focus: 'Pace. You act 10% faster, the afflictions ripen sooner and lay themselves, and a Reap is rarely short of anything.',
    passive: { name: 'Quick Hands', desc: 'You act 10% faster. Slash lays a Drain as well as its Mark, Cleave lays a Bind, and Hook binds too. Afflictions are young for 2s and gold from then until 6.5s, then they rot: the window is shorter, and it comes sooner.' },
    build: base => ({
      potMult: base.potMult * 0.875,   // balance knob (tools/simulate.js)
      sower: true, young: 2, rot: 6.5,
      haste: () => 0.9,
      abilities: {
        slash: { desc: 'Two-hit combo on one button: Slash ({d:200}) > Cleave ({d:270}), a wide arc. Slash lays a Mark and a Drain on the boss and Cleave a Bind. Press the next hit within 1.2s of your recovery and a Backswing follows for {d:90}.' },
        hook: { desc: 'Throw the chain: if you are not at the boss, pull yourself in, and cut for {d:150}. It plants a Thread and a Bind on the boss and ages the others by 1.5s. Two charges.' },
      },
    }),
  },
  {
    id: 'grim', name: 'Grim', title: 'The Patient Reaper', accent: '#c8a84a',
    gaugeTip: 'Three afflictions on the boss (no Bind), each a bar that ripens slowly: green (young, 4s), gold (ripe, until 11s), then rotten. Reap pays gold in full, young 40%, and rotten 95%, and every payout is half again as big.',
    blurb: 'Fewer afflictions, ripened slowly, and one great harvest.',
    focus: 'Patience. A long gold window, a rotten payout that is hardly less, and a Reap 50% bigger on a longer cooldown.',
    passive: { name: 'Patient Reaper', desc: 'Afflictions are young for 4s and gold until 11s, and Bind is never laid. Reap pays half again as much, a rotten affliction pays 95% instead of 65%, and its cooldown is 9s instead of 6s.' },
    build: base => ({
      potMult: base.potMult * 0.985,
      young: 4, rot: 11, noAff: ['bind'], reapMult: 1.5, rotPay: 0.95, reapCd: 9,
      abilities: {
        reap: { desc: 'Spend every affliction on the boss. A cut for {d:180}, then each pays out: Mark {d:165}, Drain {d:150} (and mends you for 3% of your health) and Thread {d:255}. Gold pays in full, young 40%, rotten 95%. Glows when something is gold. Needs an affliction up.' },
        blink: { glow: () => false, desc: 'Cut through the dark to the boss for {d:140}. The cut keeps your Backswing going, and you take 50% less damage for 1s. Two charges.' },
        wisp: { desc: 'A wisp rises beside you for 15s and harries the boss, striking for {d:60} every 2.5s.' },
      },
    }),
  },
];
