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
      gaugeTip: 'Judgment (the third Blade Chain hit) gives 25, or 50 during Oath of Valor. A Perfect Block gives 20. Shield Bash spends 50.',
      blurb: 'A shield for the whole line. Perfect Blocks steady everyone behind you.',
      focus: 'Protecting the party. Your Perfect Blocks and Shield Bash cut the damage everyone takes.',
      passive: { name: 'Hold the Line', desc: 'A Perfect Block also steadies the party: everyone takes 10% less damage for 4s. Brace has a third charge.' },
      build: base => ({
        potMult: 0.73,   // balance knob (tools/simulate.js)
        abilities: {
          brace: { charges: 3, desc: 'Raise your shield: 25% less damage for 3s. Brace just before a hit lands for a Perfect Block, which also steadies the party. Three charges.' },
          edge: {
            id: 'bash', replaces: 'edge', icon: 'edge', name: 'Shield Bash', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'bash',
            desc: 'Spend 50 Resolve: slam your shield into the boss. For 4s you take 30% less damage, and it heals you a little.',
            usable: k => k.g.resolve >= 50,
            glow: k => k.g.resolve >= 90 || (k.has('oath') && k.g.resolve >= 50),
            effect(k) {
              k.spend('resolve', 50);
              const pot = k.has('oath') ? 680 : 530;
              k.damage(pot, { ab: this });
              if (k.perk('bastion_w2')) { k.damage(pot * 0.4, { ab: this }); k.fx('empower'); }
              k.mitigate('self', 0.3, 4, { ab: this });
              k.heal('self', 120, { ab: this });
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
      gaugeTip: 'Judgment (the third Blade Chain hit) gives 35, or 70 during Oath of Valor. A Perfect Block gives 20. Holy Edge spends 50.',
      blurb: 'Holy fire behind every block. Less armour, more light.',
      focus: 'Damage through blocking. Every Perfect Block charges a stronger Holy Edge; your big cooldown protects you less.',
      passive: { name: 'Radiance', desc: 'A Perfect Block makes your next Holy Edge Radiant: 50% stronger, a beam of light. Oath of Valor lasts 20s and Judgment gives 35 Resolve.' },
      build: base => ({
        potMult: 0.6,
        abilities: {
          blade: {
            desc: 'Three-hit combo on one button: Strike > Riposte > Judgment. Judgment fills 35 Resolve.',
            effect(k) {
              const step = k.now < k.g.comboUntil ? k.g.step : 0;
              let pot = [220, 300, 400][step];
              if (k.g.counter) { pot += 150; k.g.counter = 0; }
              k.damage(pot, { ab: this });
              if (step === 2) { k.gain('resolve', k.has('oath') ? 70 : 35); if (k.perk('bastion_w1')) k.heal('self', 120, { ab: this }); }
              k.g.step = (step + 1) % 3; k.g.comboUntil = k.now + 15;
            },
          },
          edge: {
            desc: 'Spend 50 Resolve: a radiant blade you can throw from range. Heals you a little. After a Perfect Block it becomes a beam, 50% stronger.',
            glow: k => k.g.resolve >= 90 || (k.g.resolve >= 50 && (k.has('oath') || k.has('radiant'))),
            effect(k) {
              k.spend('resolve', 50);
              let pot = k.has('oath') ? 720 : 560;
              if (k.consume('radiant')) { pot *= 1.5; k.fx('radiant'); }
              k.damage(pot, { ab: this });
              if (k.perk('bastion_w2')) { k.damage(pot * 0.4, { ab: this }); k.fx('empower'); }
              k.heal('self', 120, { ab: this });
            },
          },
          oath: { desc: 'Burst: 20s of +10% damage. Judgment grants double Resolve and Holy Edge hits harder.', effect(k) { k.buff('oath', 20); } },
          bulwark: {
            id: 'zeal', replaces: 'bulwark', icon: 'bulwark', name: 'Zealous Guard', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
            desc: 'Big cooldown: 30% less damage for 10s, Brace\'s charges refill, and your next Holy Edge is Radiant.',
            effect(k) {
              k.mitigate('self', k.perk('bastion_a4') ? 0.4 : 0.3, 10, { ab: this });
              k.refill('brace'); k.buff('radiant', 15);
              if (k.perk('bastion_w3')) k.shield('party', 160, 8, { ab: this });
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
      gaugeTip: 'Hack gives 10, Maul 15 and Bloodletting 20. Rampage spends 40, or nothing while Frenzy lasts.',
      blurb: 'The closer to death, the harder you hit. Blood turns to Rage.',
      focus: 'Risky damage. You hit hardest when your HP is low, so you live closer to the edge.',
      passive: { name: 'Rage', desc: 'Your gauge is Rage. Rampage hits harder the lower your HP, but heals less. Frenzy also makes you 10% faster.' },
      gauge: { label: 'Rage', color: '#ff7a2a' },
      build: () => ({
        potMult: 0.63,
        haste: k => (k.has('frenzy') ? 0.9 : 1),
        abilities: {
          drain: {
            id: 'rampage', replaces: 'drain', icon: 'drain', name: 'Rampage', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'attack',
            desc: 'Spend 40 Rage: a wild blow that hits harder the lower your HP (up to 70% harder near death) and heals you for 20% of the damage you took in the last 6s.',
            usable: k => k.g.blood >= 40 || k.stacks('gorge') > 0,
            glow: k => k.stacks('gorge') > 0 || k.g.blood >= 90 || k.env.hpFrac() < 0.5,
            effect(k) {
              let pot = 350;
              if (k.stacks('gorge') > 0) { k.consume('gorge'); pot += 120; } else k.spend('blood', 40);
              const taken = k.env.recentDamage(6);
              pot += Math.min(250, taken / (60 * ENGINE.NUM_SCALE));
              pot *= 1 + 0.7 * Math.max(0, 1 - k.env.hpFrac());
              k.damage(pot, { ab: this });
              if (k.perk('bloodreaver_w2')) { k.damage(pot * 0.3, { ab: this }); k.fx('empower'); }
              k.healRaw('self', Math.max(k.env.maxHp() * 0.05, taken * 0.2), { ab: this });
            },
            fx: { type: 'slash', color: '#ff7a2a', r: 60, span: 1.8 },
          },
          frenzy: { desc: 'Burst: 12s of +15% damage and 10% faster attacks, and your next three Rampages are free and stronger.' },
        },
      }),
    },
    {
      id: 'hemomancer', name: 'Hemomancer', title: 'The Blood Mage', accent: '#c0204a',
      gaugeTip: 'Hack gives 10, Maul 15 and Blood Lance 20. Crimson Drain spends 40, or nothing while Frenzy lasts.',
      blurb: 'Blood magic. What you drain from the boss flows to your allies.',
      focus: 'Helping the healer. Your self-healing also heals the whole party, and you can fight from range.',
      passive: { name: 'Shared Vein', desc: 'Crimson Drain\'s healing also flows to the whole party, at a quarter of the strength. Bloodletting becomes a blood lance you throw from range.' },
      build: () => ({
        potMult: 0.74,
        abilities: {
          drain: {
            desc: 'Spend 40 Blood: a heavy hit that heals you for 35% of the damage you took in the last 6s, and the whole party for 25% of that.',
            effect(k) {
              let pot = 300;
              if (k.stacks('gorge') > 0) { k.consume('gorge'); pot += 110; } else k.spend('blood', 40);
              const taken = k.env.recentDamage(6);
              pot += Math.min(400, taken / (38 * ENGINE.NUM_SCALE));
              k.damage(pot, { ab: this });
              if (k.perk('bloodreaver_w2')) { k.damage(pot * 0.3, { ab: this }); k.fx('empower'); }
              const heal = Math.max(k.env.maxHp() * 0.08, taken * 0.35);
              k.healRaw('self', heal, { ab: this });
              k.healRaw('party', heal * 0.25, { ab: this });
            },
          },
          letting: {
            id: 'lance', replaces: 'letting', icon: 'letting', name: 'Blood Lance', type: 'ogcd', target: 'enemy', range: 300, charges: 2, cd: 15, anim: 'cast',
            desc: 'Throw a lance of blood between attacks: damage and +20 Blood, from range. Two charges.',
            glow: k => k.charges(k.abById('lance')) === 2,
            effect(k) { k.damage(210, { ab: this }); k.gain('blood', k.perk('bloodreaver_w1') ? 30 : 20); if (k.perk('bloodreaver_a4')) k.healRaw('self', k.env.maxHp() * 0.05, { ab: this }); },
            fx: { type: 'projectile', color: '#ff2d4b', range: 300, speed: 1000 },
          },
        },
      }),
    },
  ],

  runeguard: [
    {
      id: 'spellwarden', name: 'Spellwarden', title: 'The Warding Circle', accent: '#9fd8ff',
      gaugeTip: 'Rune Strike gives 1 (2 during Runic Overload), and a Ward that absorbed at least half refunds its Rune. Runic Ward spends 1, Glyph Burst spends all 3.',
      blurb: 'Your Wards go where they\'re needed. When they break, they break for you.',
      focus: 'Shielding allies. Your Ward goes on whoever needs it, and pays its Rune back more easily.',
      passive: { name: 'Shared Ward', desc: 'Runic Ward goes on an ally (yourself if none is picked). It explodes from them when it ends, and refunds its Rune once it has absorbed half.' },
      classPassive: 'Runic Wards explode when they end. The more they absorbed, the bigger the blast, and one that absorbed at least half refunds its Rune.',
      build: base => ({
        potMult: 0.70,
        abilities: {
          ward: {
            target: 'ally',
            desc: 'Spend 1 Rune: shield an ally (about 20% of your HP) for 8s. It explodes when it ends, harder the more it absorbed, and gives the Rune back once it has taken half.',
            effect(k, t) { k.spend('runes', 1); k.shield(t, k.perk('runeguard_a2') ? 812 : 650, k.perk('runeguard_a4') ? 12 : 8, { ab: this, tag: 'ward' }); },
          },
        },
        onNotify(k, type, d) {
          if (type === 'shieldEnd' && d.tag === 'ward') {
            const frac = Math.max(0, Math.min(1, d.frac || 0));
            k.damage((150 + 450 * frac) * (k.has('overload') ? 1.5 : 1), { ab: k.abById('ward') });
            if (frac >= 0.5) { k.gain('runes', 1, 3); k.stats.wardBreaks = (k.stats.wardBreaks || 0) + 1; k.fx('rune-echo'); }
            return;
          }
          base.onNotify(k, type, d);
        },
      }),
    },
    {
      id: 'runeblade', name: 'Runeblade', title: 'The Carved Edge', accent: '#c58cff',
      gaugeTip: 'Each Rune Blade hit gives 1 (2 during Runic Overload), and a Ward broken all the way refunds its Rune. Runic Ward spends 1, Rune Cleave spends all 3.',
      blurb: 'Runes cut into steel. Lighter Wards, a sharper blade.',
      focus: 'Melee damage. A sword combo, a cleave that leaves a burning rune, and two reflects; smaller Wards.',
      passive: { name: 'Rune-Carved', desc: 'Rune Strike becomes a two-hit combo, Glyph Burst a cleave that leaves a burning rune, and Mirror Aegis has two charges. Wards are a little smaller.' },
      build: () => ({
        potMult: 0.59,
        init: () => ({ runes: 0, step: 0, comboUntil: 0 }),
        abilities: {
          strike: {
            id: 'cut', replaces: 'strike', icon: 'strike', name: 'Rune Blade', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'attack',
            desc: 'Two-hit combo on one button: Cut > Carve. Each hit gives 1 Rune (2 during Runic Overload).',
            label: k => (k.now < k.g.comboUntil && k.g.step === 1 ? 'Carve' : 'Cut'),
            effect(k) {
              const second = k.now < k.g.comboUntil && k.g.step === 1;
              k.damage(second ? 315 : 240, { ab: this });
              const extra = k.perk('runeguard_w1') && k.rng() < 0.25 ? 1 : 0;
              k.gain('runes', (k.has('overload') ? 2 : 1) + extra, 3);
              if (extra) k.fx('empower');
              k.g.step = second ? 0 : 1; k.g.comboUntil = k.now + 15;
            },
            fx: { type: 'slash', color: '#c58cff', r: 54, span: 1.6 },
          },
          ward: {
            desc: 'Spend 1 Rune: shield yourself (about 18% of your HP) for 8s. It explodes when it ends, harder the more it absorbed.',
            effect(k) { k.spend('runes', 1); k.shield('self', k.perk('runeguard_a2') ? 750 : 600, k.perk('runeguard_a4') ? 12 : 8, { ab: this, tag: 'ward' }); },
          },
          glyph: {
            id: 'cleave', replaces: 'glyph', icon: 'glyph', name: 'Rune Cleave', type: 'gcd', target: 'enemy', range: SPEC_MELEE, anim: 'attack',
            desc: 'Spend 3 Runes: a cleaving cut that leaves a burning rune on the target for 12s.',
            usable: k => k.g.runes >= 3,
            glow: k => k.g.runes >= 3,
            effect(k) {
              k.spend('runes', 3);
              k.damage(k.has('overload') ? 860 : 660, { ab: this });
              k.dot('brand', k.has('overload') ? 110 : 85, 12, 3, { ab: this });
              if (k.perk('runeguard_w2')) k.gain('runes', 1, 3);
            },
            fx: { type: 'slash', color: '#e0b8ff', r: 64, span: 2.2 },
          },
          mirror: { charges: 2, desc: 'For 3s, the next hit you take is reduced by 80% and reflected back for huge damage. Two charges.' },
        },
      }),
    },
  ],

  // ======================================================================= HEALERS
  cleric: [
    {
      id: 'aegis', name: 'Aegis', title: 'The Golden Wall', accent: '#ffe9a8',
      gaugeTip: 'A Petal regrows every 15s (up to 3). A Petal shield that soaks most of its strength gives its Petal back (once every 10s). Three Petals spent make Dawnstar.',
      blurb: 'Stop the damage before it lands. Light that hardens into armour.',
      focus: 'Shields. Your Petals and Divine Barrier stop damage before it lands, so you plan ahead instead of healing after.',
      passive: { name: 'Hardened Light', desc: 'Dawn Petal leaves a shield instead of a regen, and a Petal shield that soaks most of its strength gives the Petal back. Benediction has two charges. Mend becomes Divine Barrier.' },
      build: base => ({
        potMult: 0.9,
        init: () => Object.assign(base.init(), { refundAt: 0 }),
        abilities: {
          mend: {
            id: 'barrier', replaces: 'mend', icon: 'mend', name: 'Divine Barrier', type: 'gcd', target: 'ally', cast: 1.5, anim: 'cast',
            desc: '1.5s cast: a golden dome on one ally that absorbs a big hit for 12s, and heals them a little.',
            effect(k, t) { k.heal(t, 250, { ab: this }); k.shield(t, 650, 12, { ab: this, tag: 'barrier' }); },
            fx: { type: 'ring', color: '#ffe9a8', r: 46, onTarget: true },
          },
          petal: {
            desc: 'Spend a Petal: an instant heal and a shield for 10s. If the shield soaks most of its strength, the Petal comes back (once every 10s). Three Petals make Dawnstar.',
            effect(k, t) {
              k.spend('petals', 1);
              k.heal(t, 330, { ab: this });
              k.shield(t, k.perk('cleric_w1') ? 330 : 260, 10, { ab: this, tag: 'petal' });
              k.gain('bloom', 1, 3);
            },
          },
          bene: { charges: 2, desc: 'Instant: a strong heal and a shield on one ally. Two charges.' },
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
      gaugeTip: 'A Petal regrows every 20s (up to 3). Three Petals spent make Dawnstar.',
      blurb: 'Judgment first, mercy after. Every blow your allies strike carries your verdict.',
      focus: 'Damage. Smite brands the boss so your allies\' hits burst for extra damage. Less healing: Petals regrow slower and Benediction becomes an attack.',
      balance: 1.12,   // a damage spec: aims for this share of the base Cleric's damage (tools/check.js)
      passive: { name: 'Judgment', desc: 'Smite brands the boss: your allies\' next 2 hits on it burst with holy fire, counted as your damage. Dawn Petals regrow every 20s. Benediction becomes Condemn.' },
      build: base => ({
        potMult: 0.71,
        tick(k) {
          if (k.g.petalAt === null) k.g.petalAt = k.now + 20;
          if (k.now >= k.g.petalAt) { k.gain('petals', 1, 3); k.g.petalAt += 20; }
        },
        abilities: {
          smite: {
            cast: k => (k.g.bloom >= 3 || k.has('verdict') ? 0 : 1.5),
            desc: '1.5s cast attack that brands the boss: your allies\' next 2 hits burst for extra damage. After three Dawn Petals it becomes Dawnstar: instant, huge, and a brand of 4.',
            effect(k) {
              k.consume('verdict');
              if (k.g.bloom >= 3) { k.g.bloom = 0; k.damage(950, { ab: this }); k.fx('dawnstar'); specBrand(k, 4, this); if (k.perk('cleric_w2')) k.heal('party', 180, { ab: this }); }
              else { k.damage(280, { ab: this }); specBrand(k, 2, this); }
            },
          },
          bene: {
            id: 'condemn', replaces: 'bene', icon: 'bene', name: 'Condemn', type: 'ogcd', target: 'enemy', range: SPEC_RANGED, cd: 30, anim: 'big',
            desc: 'Instant: a lance of holy fire that brands the boss for 4 hits, and your next Smite is instant.',
            effect(k) { k.damage(420, { ab: this }); specBrand(k, k.perk('cleric_a2') ? 6 : 4, this); k.buff('verdict', 15); },
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
            id: 'lifebind', replaces: 'rejuv', icon: 'rejuv', name: 'Lifebind', type: 'gcd', target: 'ally', anim: 'cast',
            desc: 'Instant: a small heal, then healing every 3s for 15s, on this ally and on the most hurt other ally. Its ticks grow Bloom.',
            effect(k, t) {
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
            desc: 'Spend 50 Bloom: instantly and strongly heal everyone with your Lifebind and the most hurt ally (the whole party during Wild Growth). Your next Wrath is instant.',
            effect(k) {
              k.spend('bloom', 50);
              if (k.has('growth')) k.heal('party', 450, { ab: this });
              for (const r of k.g.rejuvs) k.heal(r.t, 520, { ab: this });
              k.heal(k.g.rejuvs.length ? 'lowest' : 'self', 520, { ab: this });
              k.buff('awaken', 15);
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
            desc: 'Spend 50 Bloom: instantly heal everyone with your Rejuvenate (and the whole party while Moonwell lasts). Your next Wrath is instant.',
            effect(k) {
              k.spend('bloom', 50);
              if (k.has('moonlit')) k.heal('party', 350, { ab: this });
              for (const r of k.g.rejuvs) k.heal(r.t, 400, { ab: this });
              if (!k.g.rejuvs.length && !k.has('moonlit')) k.heal('self', 400, { ab: this });
              k.buff('awaken', 15);
            },
          },
          growth: {
            id: 'moonwell', replaces: 'growth', icon: 'growth', name: 'Moonwell', type: 'ogcd', target: 'ally', cd: 45, anim: 'big',
            desc: 'A pool of moonlight at an ally\'s feet for 12s: everyone standing in it heals every 1.5s, and your heals are 25% stronger while it lasts.',
            effect(k, t) {
              k.buff('moonlit', 12);
              const { amount } = k.healAmount(80, { ab: this });
              k.env.emit({ type: 'pool', target: t, r: 150, amount, ticks: 8, interval: 1.5, ab: this });
              if (k.perk('grovekeeper_w3')) k.gain('bloom', 25);
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
        function bolt(k, ab, share) {
          const r = k.damage(280 * share, { ab });
          if (k.g.stance === 'haste') k.healRaw('party', r.amount * 0.5, { ab });
          else k.healRaw(k.g.link ?? k.env.defaultLink(), r.amount * 1.2, { ab });
        }
        const echo = (k, fn) => k.g.echoes.push({ at: k.now + 3, fn });
        const share = k => (k.has('chamber') ? 1 : 0.5);
        return {
          potMult: 0.53,
          init: () => Object.assign(base.init(), { echoes: [] }),
          tick(k) {
            base.tick(k);
            while (k.g.echoes.length && k.now >= k.g.echoes[0].at) { const e = k.g.echoes.shift(); e.fn(); }
          },
          abilities: {
            bolt: {
              desc: '1.5s cast attack that repeats 3s later at half strength. Slow: heals your linked ally for 120% of its damage. Haste: heals everyone for 50%.',
              effect(k) { k.consume('surge'); bolt(k, this, 1); echo(k, () => { bolt(k, this, share(k)); k.fx('echo'); }); },
            },
            recall: {
              desc: '2.5s cast: bring a fallen ally back, or heal a living one heavily. A heal repeats 3s later at half strength.',
              effect(k, t) {
                if (k.env.isDead(t)) { k.raise(t, { ab: this }); return; }
                k.heal(t, 1400, { ab: this });
                echo(k, () => { if (!k.env.isDead(t)) { k.heal(t, 1400 * share(k), { ab: this }); k.fx('echo'); } });
              },
            },
            accel: {
              id: 'chamber', replaces: 'accel', icon: 'accel', name: 'Echo Chamber', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
              desc: 'Burst: everyone attacks 10% faster for 15s, and your echoes are full strength while it lasts. You gain 40 Flux.',
              effect(k) { k.partyBuff('haste', 0.1, 15, { ab: this }); k.buff('chamber', 15); k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab: this }); },
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
      passive: { name: 'Overclock', desc: 'Haste drains Flux 40% slower and its Bolts heal the party for 62% (not 50%). Accelerando gives 15% for 20s. In Slow, Bolt heals your link for 100%.' },
      build: () => ({
        potMult: 0.80,
        tick(k) {
          const dt = k.now - (k.g.lastTick ?? k.now);
          k.g.lastTick = k.now;
          if (dt <= 0 || dt > 1) return;
          if (k.g.stance === 'slow') k.gain('flux', 3 * dt);
          else {
            k.g.flux = Math.max(0, k.g.flux - (k.perk('chronomancer_a2') ? 1.8 : 2.4) * dt);
            if (k.g.flux <= 0) { k.g.stance = 'slow'; k.buff('lag', 3); k.fx('lag'); k.stats.lags = (k.stats.lags || 0) + 1; }
          }
        },
        abilities: {
          bolt: {
            desc: '1.5s cast attack. Slow: heals your linked ally for 100% of its damage. Haste: heals everyone for 62%.',
            effect(k) {
              k.consume('surge');
              const r = k.damage(280, { ab: this });
              if (k.g.stance === 'haste') k.healRaw('party', r.amount * 0.62, { ab: this });
              else k.healRaw(k.g.link ?? k.env.defaultLink(), r.amount * 1.0, { ab: this });
            },
          },
          accel: {
            desc: 'Party burst: everyone attacks 15% faster for 20s. You gain 40 Flux.',
            effect(k) { k.partyBuff('haste', 0.15, 20, { ab: this }); k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab: this }); },
          },
        },
      }),
    },
  ],
};

// Judgment (Inquisitor): the boss carries n charges; each ally hit bursts one for this much damage (the host
// credits it to the Inquisitor). The burst's strength is worked out here so gear and the balance knob count.
function specBrand(k, n, ab) {
  const amount = Math.round(70 * ENGINE.POT_SCALE * (k.def.potMult || 1) * (1 + (k.gear().power || 0)));
  k.env.emit({ type: 'brand', ticks: n, amount, ab });
}

// the kit a hero plays with this spec (or the base kit for none / an unknown spec)
const SPEC_CACHE = {};
function specOf(classId, specId) { return (SPECS[classId] || []).find(s => s.id === specId) || null; }
function kitFor(classId, specId) {
  const base = KITS[classId], spec = specOf(classId, specId);
  if (!spec) return base;
  const key = classId + ':' + spec.id;
  if (SPEC_CACHE[key]) return SPEC_CACHE[key];
  const ch = spec.build(base);
  const abilities = base.abilities.map(ab => {
    const o = ch.abilities && ch.abilities[ab.id];
    if (!o) return ab;
    // a full replacement names the ability it replaces; otherwise it's a change to the base ability
    return o.replaces ? Object.assign({}, o) : Object.assign({}, ab, o);
  });
  const kit = Object.assign({}, base, ch, { abilities, spec: spec.id });
  if (spec.gauge) kit.gauge = Object.assign({}, base.gauge, spec.gauge);
  SPEC_CACHE[key] = kit;
  return kit;
}
// the icon an ability wears (a new spec ability borrows one until its own is painted)
const abilityIconId = ab => ab.icon || ab.id;

if (typeof module !== 'undefined') module.exports = { SPECS, specOf, kitFor, abilityIconId };
