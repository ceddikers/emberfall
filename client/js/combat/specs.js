// Specializations: two per class. A spec reshapes the base kit (KITS in kits.js); it doesn't replace it.
// It swaps one or two abilities, gives the signature mechanic a new purpose, and keeps the role and the seven keys.
// Free to swap in town, saved per hero, and both specs of a class are balanced against each other (tools/simulate.js).
//
// Each spec: { id, name, title, accent, blurb, focus (what it specializes in), passive: { name, desc }, build(base) -> partial kit }.
// build() returns only what changes: abilities by id (a replacement says which slot it takes with `replaces`),
// and any hooks (onNotify, dmgMod, haste...). kitFor(classId, specId) merges it over the base kit (cached).
// A replacement ability keeps the slot, and honours the enhancements of the ability it replaced where it makes sense.

const SPEC_MELEE = 'melee';

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
};

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
