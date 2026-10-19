// The nine class kits. Design rules (see docs/DESIGN.md for the reasoning):
//  - Easy to learn: the main combo/filler is ONE button, and buttons glow when they're a good press.
//    Mashing the glowing buttons is a complete, working rotation.
//  - Hard to master: every class has a resource that can overcap and is worth pooling, a 60s burst to line up
//    with the party's burst, oGCDs to weave, and one signature skill check unique to that class.
// Slots: Q W E R D F (indices 0-5). Space is the shared dash and lives outside the kit.
// Each ability: { id, name, type: 'gcd'|'ogcd', target: 'enemy'|'ally'|'self'|'none', range, cast, cd, charges,
//   usable(k), glow(k), label(k), effect(k, target), desc, anim, fx }. fx/anim are the visuals in the game.

const MELEE = 'melee', RANGED = 420;

const KITS = {
  // ======================================================================= TANKS
  bastion: {
    potMult: 0.716, // balance knob (tools/simulate.js)
    auto: { kind: 'slash', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'shield', key: 'resolve', max: 100, label: 'Resolve' },
    init: () => ({ resolve: 0, step: 0, comboUntil: 0, counter: 0 }),
    dmgMod: k => (k.has('oath') ? 0.1 : 0),
    onNotify(k, type) {
      if (type === 'perfect') {
        k.gain('resolve', 20);
        k.g.counter = 1;
        if (k.perk('bastion_a2')) k.shield('self', 260, 6);
        k.stats.perfects = (k.stats.perfects || 0) + 1;
        k.fx('perfect');
      }
    },
    signature: 'Perfect Block',
    floor: 'Press Q for the combo, W when it glows. Press E right before the boss hits you, and F in an emergency.',
    ceiling: [
      'Perfect Blocks: Brace just before a hit lands (watch the boss wind up its swing) for +20 Resolve and a counterattack. Two charges, and the boss swings every 2.8s, so pick your moments.',
      'Pool Resolve near 100 before Oath of Valor: Judgment gives double Resolve during it, so Holy Edges chain.',
      'Never overcap Resolve. Spend it when it reaches 90 outside burst.',
      'Plan Bulwark and Rally Banner on the fight\'s tankbusters and raidwides instead of reacting.',
    ],
    abilities: [
      {
        id: 'blade', name: 'Blade Chain', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Three-hit combo on one button: Strike > Riposte > Judgment. Judgment fills 25 Resolve.',
        label: k => ['Strike', 'Riposte', 'Judgment'][k.now < k.g.comboUntil ? k.g.step : 0],
        glow: k => !!k.g.counter,
        effect(k) {
          const step = k.now < k.g.comboUntil ? k.g.step : 0;
          let pot = [220, 300, 400][step];
          if (k.g.counter) { pot += 150; k.g.counter = 0; }
          k.damage(pot, { ab: this });
          if (step === 2) { k.gain('resolve', k.has('oath') ? 50 : 25); if (k.perk('bastion_w1')) k.heal('self', 120, { ab: this }); }
          k.g.step = (step + 1) % 3; k.g.comboUntil = k.now + 15;
        },
        fx: { type: 'slash', color: '#bcd4ff', r: 52, span: 1.5 },
      },
      {
        id: 'edge', name: 'Holy Edge', type: 'gcd', target: 'enemy', range: 260, anim: 'bash',
        desc: 'Spend 50 Resolve: a radiant blade you can throw from range. Heals you a little.',
        usable: k => k.g.resolve >= 50,
        glow: k => k.g.resolve >= 90 || (k.has('oath') && k.g.resolve >= 50),
        effect(k) {
          k.spend('resolve', 50);
          const pot = k.has('oath') ? 720 : 560;
          k.damage(pot, { ab: this });
          if (k.perk('bastion_w2')) { k.damage(pot * 0.4, { ab: this }); k.fx('empower'); }
          k.heal('self', 120, { ab: this });
        },
        fx: { type: 'projectile', color: '#ffe9a0', range: 260, speed: 900 },
      },
      {
        id: 'brace', name: 'Brace', type: 'ogcd', target: 'self', charges: 2, cd: 7, lock: 0.5, anim: 'brace',
        desc: 'Raise your shield: 25% less damage for 3s. Brace just before a hit lands for a Perfect Block.',
        effect(k) { k.mitigate('self', 0.25, 3, { kind: 'brace', ab: this }); },
        fx: { type: 'shield', color: '#7fb2ff', dur: 1.2 },
      },
      {
        id: 'oath', name: 'Oath of Valor', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 15s of +10% damage. Judgment grants double Resolve and Holy Edge hits harder.',
        glow: k => k.g.resolve >= 50,
        effect(k) { k.buff('oath', 15); },
        fx: { type: 'aura', color: '#ffd65a', r: 38, dur: 2 },
      },
      {
        id: 'banner', name: 'Rally Banner', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Plant a banner: the whole party takes 15% less damage for 12s.',
        effect(k) { k.mitigate('party', 0.15, 12, { ab: this }); },
        fx: { type: 'zone', style: 'banner', color: '#f2c84b', r: 150, range: 0, dur: 3 },
      },
      {
        id: 'bulwark', name: 'Bulwark', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
        desc: 'Big cooldown: 40% less damage for 10s, and Brace\'s charges refill.',
        effect(k) { k.mitigate('self', k.perk('bastion_a4') ? 0.5 : 0.4, 10, { ab: this }); k.refill('brace'); if (k.perk('bastion_w3')) k.shield('party', 160, 8, { ab: this }); },
        fx: { type: 'aura', style: 'hex', color: '#9fc4ff', r: 34, dur: 2.5 },
      },
    ],
  },

  bloodreaver: {
    potMult: 0.708, // balance knob (tools/simulate.js)
    auto: { kind: 'chop', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'heart', key: 'blood', max: 100, label: 'Blood' },
    init: () => ({ blood: 0, step: 0, comboUntil: 0 }),
    dmgMod: k => (k.has('frenzy') ? 0.15 : 0),
    healMod: k => (k.has('undying') ? 1 : 0),
    signature: 'Crimson Drain timing',
    floor: 'Press Q for the combo, W when Blood is high or you\'re hurt. R every minute, D before big party hits, F if you\'re about to die.',
    ceiling: [
      'Blood for blood: Crimson Drain heals for 35% of the damage you took in the last 6 seconds AND hits harder the more you took. Fire it right after a tankbuster or a burst of autos.',
      'Pool Blood near 100 before Frenzy, then spend the three free Drains inside it. Even better if a tankbuster lands during Frenzy.',
      'Don\'t overcap Blood, but don\'t dump it on a quiet moment either. A Drain with no recent damage behind it is your weakest spend.',
      'Undying lets you survive a tankbuster with no other cooldown, if Drains heal you back up while it lasts.',
    ],
    abilities: [
      {
        id: 'hack', name: 'Hack & Maul', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Two-hit combo on one button. Both hits build Blood.',
        label: k => (k.now < k.g.comboUntil && k.g.step === 1 ? 'Maul' : 'Hack'),
        effect(k) {
          if (k.now < k.g.comboUntil && k.g.step === 1) {
            k.damage(340, { ab: this }); k.gain('blood', 15); k.g.step = 0;
          } else {
            k.damage(240, { ab: this }); k.gain('blood', 10); k.g.step = 1; k.g.comboUntil = k.now + 15;
          }
        },
        fx: { type: 'slash', color: '#ff5a5a', r: 62, span: 2.0 },
      },
      {
        id: 'drain', name: 'Crimson Drain', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Spend 40 Blood: a heavy hit that heals you for 35% of the damage you took in the last 6s and hits harder the more you took.',
        usable: k => k.g.blood >= 40 || k.stacks('gorge') > 0,
        glow: k => k.stacks('gorge') > 0 || k.g.blood >= 90 || k.env.recentDamage(6) > 9000 * ENGINE.NUM_SCALE,
        effect(k) {
          let pot = 330;
          if (k.stacks('gorge') > 0) { k.consume('gorge'); pot += 120; } else k.spend('blood', 40);
          const taken = k.env.recentDamage(6);
          pot += Math.min(450, taken / (35 * ENGINE.NUM_SCALE));
          k.damage(pot, { ab: this });
          if (k.perk('bloodreaver_w2')) { k.damage(pot * 0.3, { ab: this }); k.fx('empower'); }
          k.healRaw('self', Math.max(k.env.maxHp() * 0.08, taken * 0.35), { ab: this });
        },
        fx: { type: 'slash', color: '#ff2d4b', r: 56, span: 1.4 },
      },
      {
        id: 'letting', name: 'Bloodletting', type: 'ogcd', target: 'enemy', range: MELEE, charges: 2, cd: 15, anim: 'attack',
        desc: 'Quick slash between attacks: damage and +20 Blood. Two charges.',
        glow: k => k.charges(k.abById('letting')) === 2,
        effect(k) { k.damage(220, { ab: this }); k.gain('blood', k.perk('bloodreaver_w1') ? 30 : 20); if (k.perk('bloodreaver_a4')) k.healRaw('self', k.env.maxHp() * 0.05, { ab: this }); },
        fx: { type: 'slash', color: '#ff7a7a', r: 46, span: 1.2 },
      },
      {
        id: 'frenzy', name: 'Frenzy', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 12s of +15% damage, and your next three Crimson Drains are free and stronger.',
        effect(k) { k.buff('frenzy', 12); k.buff('gorge', 12, {}, 3, 3); if (k.perk('bloodreaver_w3')) k.gain('blood', 30); },
        fx: { type: 'aura', color: '#ff2020', r: 40, dur: 2.5 },
      },
      {
        id: 'warcry', name: 'War Cry', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
        desc: 'Roar: shields the whole party for about 14% of their HP for 15s.',
        effect(k) { k.shield('party', 300, 15, { ab: this }); if (k.perk('bloodreaver_a2')) k.healRaw('self', k.env.maxHp() * 0.1, { ab: this }); },
        fx: { type: 'ring', color: '#ff9a7a', r: 160 },
      },
      {
        id: 'undying', name: 'Undying', type: 'ogcd', target: 'self', cd: 150, anim: 'big',
        desc: 'For 8s you cannot drop below 1 HP, and your heals on yourself are doubled.',
        effect(k) { k.mitigate('self', 0, 8, { kind: 'living', ab: this }); k.buff('undying', 8); },
        fx: { type: 'aura', color: '#8a0010', r: 36, dur: 3 },
      },
    ],
  },

  runeguard: {
    potMult: 0.65, // balance knob (tools/simulate.js)
    auto: { kind: 'rune', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'runes', key: 'runes', max: 3, label: 'Runes' },
    init: () => ({ runes: 0 }),
    dmgMod: k => (k.has('overload') ? 0.1 : 0),
    onNotify(k, type, d) {
      if (type === 'shieldEnd' && d.tag === 'ward') {
        const frac = Math.max(0, Math.min(1, d.frac || 0));
        k.damage((150 + 450 * frac) * (k.has('overload') ? 1.5 : 1), { ab: k.abById('ward') });
        if (frac >= 0.999) { k.gain('runes', 1, 3); k.stats.wardBreaks = (k.stats.wardBreaks || 0) + 1; k.fx('rune-echo'); }
      }
      if (type === 'reflect') { k.damage(1500, { ab: k.abById('mirror') }); k.fx('reflect'); }
    },
    signature: 'Ward breaks',
    floor: 'Press Q to build Runes, W to shield yourself, E when you have 3 Runes. R for burst, D and F for big hits.',
    ceiling: [
      'A Ward explodes when it ends. The more damage it absorbed, the bigger the blast, and a fully broken Ward refunds its Rune. Put Wards up right before tankbusters and raidwides.',
      'Ward or Glyph Burst? Every Rune is a choice between defence-that-becomes-damage and raw damage now.',
      'Mirror Aegis reflects the next hit for a huge counter. Save it for the boss\'s biggest swing.',
      'Pool 3 Runes before Runic Overload; Wards also explode 50% harder during it.',
    ],
    abilities: [
      {
        id: 'strike', name: 'Rune Strike', type: 'gcd', target: 'enemy', range: MELEE, anim: 'cast',
        desc: 'Strike with a rune-etched gauntlet: damage and +1 Rune (+2 during Runic Overload).',
        effect(k) {
          k.damage(270, { ab: this });
          const extra = k.perk('runeguard_w1') && k.rng() < 0.25 ? 1 : 0;
          k.gain('runes', (k.has('overload') ? 2 : 1) + extra, 3);
          if (extra) k.fx('empower');
        },
        fx: { type: 'projectile', color: '#b18cff', range: 200, speed: 1200 },
      },
      {
        id: 'ward', name: 'Runic Ward', type: 'gcd', target: 'self', anim: 'cast',
        desc: 'Spend 1 Rune: shield yourself (about 20% of your HP) for 8s. It explodes when it ends, harder the more it absorbed.',
        usable: k => k.g.runes >= 1,
        effect(k) { k.spend('runes', 1); k.shield('self', k.perk('runeguard_a2') ? 812 : 650, k.perk('runeguard_a4') ? 12 : 8, { ab: this, tag: 'ward' }); },
        fx: { type: 'aura', style: 'hex', color: '#9fd8ff', r: 32, dur: 2 },
      },
      {
        id: 'glyph', name: 'Glyph Burst', type: 'gcd', target: 'enemy', range: 260, anim: 'cast',
        desc: 'Spend 3 Runes: detonate a glyph on the target for heavy damage.',
        usable: k => k.g.runes >= 3,
        glow: k => k.g.runes >= 3,
        effect(k) { k.spend('runes', 3); k.damage(k.has('overload') ? 1080 : 830, { ab: this }); if (k.perk('runeguard_w2')) k.gain('runes', 1, 3); },
        fx: { type: 'zone', style: 'vortex', color: '#7a55e8', r: 70, range: 260, dur: 0.8 },
      },
      {
        id: 'overload', name: 'Runic Overload', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 15s of +10% damage. Rune Strike gives 2 Runes, Glyph Burst and Ward blasts hit harder.',
        effect(k) { k.buff('overload', 15); if (k.perk('runeguard_w3')) k.gain('runes', 2, 3); },
        fx: { type: 'aura', color: '#b18cff', r: 40, dur: 2 },
      },
      {
        id: 'sanctum', name: 'Sanctum', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Draw a sanctum: the whole party takes 15% less damage for 10s.',
        effect(k) { k.mitigate('party', 0.15, 10, { ab: this }); },
        fx: { type: 'zone', style: 'clock', color: '#9f7aff', r: 150, range: 0, dur: 3 },
      },
      {
        id: 'mirror', name: 'Mirror Aegis', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
        desc: 'For 3s, the next hit you take is reduced by 80% and reflected back for huge damage.',
        effect(k) { k.mitigate('self', 0.8, 3, { kind: 'reflect', ab: this }); },
        fx: { type: 'shield', color: '#e0d4ff', dur: 2 },
      },
    ],
  },

  // ======================================================================= DPS
  ranger: {
    potMult: 1.106, // balance knob (tools/simulate.js)
    auto: { kind: 'shot', potency: 40, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'quiver', key: 'focus', max: 100, label: 'Focus' },
    init: () => ({ focus: 0 }),
    critMod: k => (k.has('markself') ? 0.1 : 0),
    signature: 'Keen Eye procs',
    floor: 'Press Q, press W when it glows, E when Focus is full. R and F together every minute.',
    ceiling: [
      'Quick Shot can light up Keen Eye: your next Piercing Arrow hits harder and doesn\'t use a charge. A new proc while one is waiting is wasted, so cash procs in fast.',
      'Never sit on 2 Piercing Arrow charges: a full charge bar is lost damage.',
      'Pool Focus (but don\'t overcap it) and drop Hunter\'s Mark, Barrage and Rapid Fire into the same window, ideally with the party\'s other bursts.',
      'Everything is instant, so you never have to stop attacking to dodge. Perfect uptime is your edge.',
    ],
    abilities: [
      {
        id: 'quick', name: 'Quick Shot', type: 'gcd', target: 'enemy', range: RANGED, anim: 'attack',
        desc: 'Fast shot: damage and +10 Focus. Sometimes lights up Keen Eye.',
        effect(k) {
          const barr = k.consume('barrage');
          k.damage(barr ? 690 : 230, { ab: this });
          k.gain('focus', barr ? 30 : 10);
          if (k.rng() < (k.has('markself') ? 0.55 : 0.35) + (k.perk('ranger_w1') ? 0.1 : 0)) k.proc('keen', 15);
        },
        fx: { type: 'line', color: '#fff2b0', range: 380 },
      },
      {
        id: 'pierce', name: 'Piercing Arrow', type: 'gcd', target: 'enemy', range: RANGED, charges: 2, cd: 12, anim: 'attack',
        desc: 'Heavy piercing shot, two charges. With Keen Eye it hits harder and gives the charge back.',
        glow: k => k.has('keen') || k.charges(k.abById('pierce')) === 2,
        effect(k) {
          if (k.consume('keen')) {
            k.damage(500, { ab: this }); k.refundCharge('pierce');
            if (k.perk('ranger_w2')) { k.damage(250, { ab: this }); k.fx('empower'); }
          }
          else k.damage(340, { ab: this });
        },
        fx: { type: 'line', color: '#ffd27a', range: 440 },
      },
      {
        id: 'rapid', name: 'Rapid Fire', type: 'ogcd', target: 'enemy', range: RANGED, cd: 2, anim: 'attack',
        desc: 'Spend 50 Focus: a volley between your other shots.',
        usable: k => k.g.focus >= 50,
        glow: k => k.g.focus >= 90 || (k.has('markself') && k.g.focus >= 50),
        effect(k) { k.spend('focus', 50); k.damage(k.perk('ranger_a4') ? 483 : 420, { ab: this }); if (k.perk('ranger_a2')) k.gain('focus', 10); },
        fx: { type: 'zone', style: 'arrows', color: '#e8d9a0', r: 60, range: RANGED, dur: 0.9 },
      },
      {
        id: 'mark', name: "Hunter's Mark", type: 'ogcd', target: 'enemy', range: RANGED, cd: 60, anim: 'cast',
        desc: 'Party burst: the boss takes 8% more damage from everyone for 15s, and Keen Eye triggers more often.',
        effect(k) { k.debuffTarget('vuln', 0.08, 15, { ab: this }); k.buff('markself', 15); },
        fx: { type: 'ring', style: 'mark', color: '#ff9d3d', r: 46, range: RANGED },
      },
      {
        id: 'cloak', name: "Hunter's Cloak", type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'The whole party takes 10% less damage for 10s.',
        effect(k) { k.mitigate('party', 0.1, 10, { ab: this }); },
        fx: { type: 'ring', color: '#9fdc8a', r: 150 },
      },
      {
        id: 'barrage', name: 'Barrage', type: 'ogcd', target: 'self', cd: 30, anim: 'big',
        desc: 'Your next Quick Shot fires three times and gives triple Focus.',
        glow: k => k.has('markself'),
        effect(k) { k.buff('barrage', 15); if (k.perk('ranger_w3')) k.proc('keen', 15); },
        fx: { type: 'aura', color: '#ffe27a', r: 30, dur: 1 },
      },
    ],
  },

  shadowblade: {
    potMult: 1.05, // balance knob (tools/simulate.js)
    auto: { kind: 'stab', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'moon', key: 'combo', max: 5, label: 'Combo' },
    init: () => ({ combo: 0 }),
    haste: k => (k.has('dance') ? 0.8 : 1),
    positionalAlways: k => k.has('dance'),
    signature: 'Positionals',
    floor: 'Press Q to build combo points, W to spend them. Stand behind the boss. D when its button glows.',
    ceiling: [
      'Strike from behind gives 2 combo points instead of 1. Eviscerate from the side hits harder. The boss turns to face the tank, so plan where you\'ll stand through each mechanic.',
      'Eviscerate at 5 points gets a big bonus, but a sixth point is wasted. Spend at 4 when you\'re behind (Strike would give 2).',
      'Shadowstep teleports you behind the boss and makes your next hits count as positionals. Use it when a mechanic pushes you to the wrong side.',
      'Refresh Venom Blade in its last third. Shadow Dance speeds up your attacks and makes every positional land; enter it with points ready.',
    ],
    abilities: [
      {
        id: 'strike', name: 'Strike', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Stab: damage and +1 combo point. From behind: +2 points and extra damage.',
        effect(k) {
          const r = k.damage(220, { ab: this, positional: 'rear', posBonus: 60 });
          k.gain('combo', r.posHit ? 2 : 1, 5);
        },
        fx: { type: 'slash', color: '#d6b3ff', r: 40, span: 1.1 },
      },
      {
        id: 'evis', name: 'Eviscerate', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Spend all combo points for a big hit. Stronger at 5 points and from the side.',
        usable: k => k.g.combo >= 1,
        glow: k => k.g.combo >= 5 || (k.g.combo >= 4 && k.env.positional() === 'rear'),
        effect(k) {
          const cp = k.g.combo; k.g.combo = 0;
          const mult = (k.dotRemaining('poison') > 0 ? 1.15 : 1) * (k.has('dance') ? 1.25 : 1);
          const r = k.damage(120 + 115 * cp + (cp >= 5 ? 160 : 0), { ab: this, positional: 'flank', posBonus: 80, mult });
          if (cp >= 5 && k.perk('shadowblade_w2')) { k.damage((120 + 115 * cp + 160 + (r.posHit ? 80 : 0)) * 0.3, { ab: this, mult }); k.fx('empower'); }
        },
        fx: { type: 'slash', color: '#ff4d8a', r: 50, span: 1.7 },
      },
      {
        id: 'step', name: 'Shadowstep', type: 'ogcd', target: 'enemy', range: 380, charges: 2, cd: 15, anim: 'cast',
        desc: 'Teleport behind the target. For 5s every hit counts as a positional.',
        effect(k) { k.teleport('behind', { ab: this }); k.buff('truenorth', k.perk('shadowblade_a4') ? 8 : 5); if (k.perk('shadowblade_a2')) k.gain('combo', 1, 5); },
        fx: { type: 'blink', color: '#9b5fd0' },
      },
      {
        id: 'dance', name: 'Shadow Dance', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 10s of faster attacks, every positional lands, and Eviscerate hits 25% harder.',
        effect(k) { k.buff('dance', 10); if (k.perk('shadowblade_w3')) k.gain('combo', 2, 5); },
        fx: { type: 'aura', color: '#b04dff', r: 36, dur: 2 },
      },
      {
        id: 'venom', name: 'Venom Blade', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Poison the target (damage over 24s). While poisoned, Eviscerate hits 15% harder.',
        glow: k => k.dotRemaining('poison') < 7.2,
        effect(k) { k.damage(140, { ab: this }); k.dot('poison', k.perk('shadowblade_w1') ? 88 : 70, 24, 3, { ab: this }); },
        fx: { type: 'slash', color: '#8aff6a', r: 42, span: 1.0 },
      },
      {
        id: 'smoke', name: 'Smoke Bomb', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'The whole party takes 10% less damage for 10s.',
        effect(k) { k.mitigate('party', 0.1, 10, { ab: this }); },
        fx: { type: 'zone', color: '#8a7a9a', r: 140, range: 0, dur: 2 },
      },
    ],
  },

  pyromancer: {
    potMult: 1, // balance knob (tools/simulate.js)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'crucible', key: 'heat', max: 100, label: 'Heat' },
    init: () => ({ heat: 0 }),
    dmgMod: k => k.g.heat * 0.003 - (k.has('burnt') ? 0.2 : 0),
    critMod: (k, opts) => (opts && opts.ab && ['fireball', 'pyro'].includes(opts.ab.id) ? 0.15 : 0) + (k.has('combust') ? 1 : 0) +
      (opts && opts.ab && opts.ab.id === 'fireball' && !opts.dot && k.perk('pyromancer_w1') ? 0.1 : 0),
    tick(k) {
      if (k.g.heat >= 100) {
        k.g.heat = 0;
        k.selfDamage(k.perk('pyromancer_a2') ? 0.075 : 0.15);
        k.buff('burnt', 5);
        k.stats.overheats = (k.stats.overheats || 0) + 1;
        k.fx('overheat');
      }
      const dt = k.now - (k.g.lastTick ?? k.now);
      k.g.lastTick = k.now;
      if (dt > 0 && dt < 1 && !k.cast) k.g.heat = Math.max(0, k.g.heat - 2 * dt);
    },
    onDamage(k, amt, crit, opts) {
      if (!opts.ab || !['fireball', 'pyro', 'fireblast'].includes(opts.ab.id)) return;
      if (crit) {
        if (k.has('heating')) { k.clear('heating'); k.proc('hotstreak', 15); }
        else if (!k.has('hotstreak')) k.buff('heating', 15);
      } else if (opts.ab.id !== 'fireblast') k.clear('heating');
    },
    signature: 'Heat and Hot Streak',
    floor: 'Press Q to cast, W when it glows (instant). D when Heat is high. R every minute. Don\'t move while casting.',
    ceiling: [
      'Two crits in a row light up Hot Streak: an instant, empowered Pyroblast. Fire Blast always crits and works mid-cast, so use it to turn one crit into Hot Streak on demand.',
      'Heat raises all your damage (+30% at full), but hitting 100 burns you and resets it. Ride high Heat and Vent at 85-95, ideally just before you have to move.',
      'Your instants (Hot Streak Pyroblast, Vent, Fire Blast) are your movement budget. Save one for each mechanic that makes you move, and slidecast: you can start moving in the last half-second of a cast.',
      'Combustion makes every cast crit for 10s, so procs chain. Enter it with Fire Blast charges ready and high Heat.',
    ],
    abilities: [
      {
        id: 'fireball', name: 'Fireball', type: 'gcd', target: 'enemy', range: RANGED, cast: 1.8, anim: 'cast',
        desc: '1.8s cast: damage and +12 Heat. Crits warm you up toward Hot Streak.',
        effect(k) { k.damage(300, { ab: this }); k.gain('heat', 12, 100); },
        fx: { type: 'projectile', style: 'fire', color: '#ff8c2a', range: RANGED, speed: 650 },
      },
      {
        id: 'pyro', name: 'Pyroblast', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('hotstreak') ? 0 : 3.0),
        desc: '3s cast for big damage. With Hot Streak it\'s instant and stronger.',
        glow: k => k.has('hotstreak'),
        effect(k) {
          const hs = k.consume('hotstreak');
          k.damage(hs ? 620 : 540, { ab: this });
          if (hs && k.perk('pyromancer_w2')) { k.dot('pyroburn', 70, 9, 3, { ab: this }); k.fx('empower'); }
          k.gain('heat', hs ? 10 : 20, 100);
        },
        fx: { type: 'projectile', style: 'fire', color: '#ff5a1a', range: RANGED, speed: 520 },
      },
      {
        id: 'fireblast', name: 'Fire Blast', type: 'ogcd', target: 'enemy', range: RANGED, charges: 2, cd: 10, duringCast: true, lock: 0.4, anim: 'cast',
        desc: 'Instant blast that always crits, usable even while casting. Two charges.',
        glow: k => k.has('heating'),
        effect(k) { k.damage(160, { ab: this, autoCrit: true }); k.gain('heat', 6, 100); },
        fx: { type: 'ring', color: '#ffb03a', r: 40, range: RANGED },
      },
      {
        id: 'combust', name: 'Combustion', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: for 10s every Fireball, Pyroblast and Fire Blast crits.',
        effect(k) { k.buff('combust', k.perk('pyromancer_a4') ? 13 : 10); if (k.perk('pyromancer_w3')) k.refill('fireblast'); },
        fx: { type: 'aura', color: '#ff7a1a', r: 40, dur: 2 },
      },
      {
        id: 'vent', name: 'Vent', type: 'gcd', target: 'enemy', range: RANGED, cd: 12, anim: 'big',
        desc: 'Instant: release all your Heat as an explosion. More Heat, more damage.',
        usable: k => k.g.heat >= 10,
        glow: k => k.g.heat >= 85,
        effect(k) { const h = k.g.heat; k.g.heat = 0; k.damage(150 + 6 * h, { ab: this }); },
        fx: { type: 'zone', style: 'meteor', color: '#ff3a1a', r: 80, range: RANGED, dur: 1.1 },
      },
      {
        id: 'smolder', name: 'Smolder', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Sap the boss\'s strength: the whole party takes 10% less damage for 10s.',
        effect(k) { k.mitigate('party', 0.1, 10, { ab: this }); },
        fx: { type: 'zone', style: 'fire', color: '#ff7a1a', r: 120, range: 0, dur: 1.5 },
      },
    ],
  },

  // ======================================================================= HEALERS
  cleric: {
    potMult: 0.9, // balance knob (tools/simulate.js)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'sundial', key: 'petals', max: 3, label: 'Petals' },
    init: () => ({ petals: 2, bloom: 0, petalAt: null }),
    tick(k) {
      if (k.g.petalAt === null) k.g.petalAt = k.now + 15;
      if (k.now >= k.g.petalAt) { k.gain('petals', 1, 3); k.g.petalAt += 15; }
    },
    signature: 'Petal economy',
    floor: 'Press Q to attack. Heal with E (instant) or W. D brings dead allies back. R before big party hits.',
    ceiling: [
      'Dawn Petals are free, instant heals that regrow every 15s. Every third Petal blooms into Dawnstar, a huge instant attack. Healing with Petals literally turns into damage.',
      'Petals overcap at 3, so spend one before the next grows. Save Dawnstar for the party\'s burst window.',
      'Every GCD you spend on Mend is an attack you didn\'t cast. Heal with Petals, Benediction and Prayer Circle first; Mend is the last resort.',
      'Prayer Circle before a raidwide (not after) gives both the mitigation and the regen.',
    ],
    abilities: [
      {
        id: 'smite', name: 'Smite', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.g.bloom >= 3 ? 0 : 1.5),
        label: k => (k.g.bloom >= 3 ? 'Dawnstar' : 'Smite'),
        desc: '1.5s cast attack. After three Dawn Petals it becomes Dawnstar: instant and huge.',
        glow: k => k.g.bloom >= 3,
        effect(k) {
          if (k.g.bloom >= 3) { k.g.bloom = 0; k.damage(950, { ab: this }); k.fx('dawnstar'); if (k.perk('cleric_w2')) k.heal('party', 180, { ab: this }); }
          else k.damage(280, { ab: this });
        },
        fx: { type: 'projectile', color: '#fff0a8', range: RANGED, speed: 800 },
      },
      {
        id: 'mend', name: 'Mend', type: 'gcd', target: 'ally', cast: 1.8, anim: 'cast',
        desc: '1.8s cast: a big heal on one ally.',
        effect(k, t) { k.heal(t, 700, { ab: this }); },
        fx: { type: 'ring', color: '#fff0a8', r: 40, onTarget: true },
      },
      {
        id: 'petal', name: 'Dawn Petal', type: 'gcd', target: 'ally', anim: 'cast',
        desc: 'Spend a Petal: instant heal plus a small regen. Petals regrow every 15s. Three Petals make Dawnstar.',
        usable: k => k.g.petals >= 1,
        glow: k => k.g.petals >= 3 || (k.g.petals >= 2 && k.g.petalAt - k.now < 4),
        effect(k, t) {
          k.spend('petals', 1);
          k.heal(t, 450, { ab: this });
          k.hot(t, k.perk('cleric_w1') ? 90 : 60, 5, 3, { ab: this, id: 'petal' });
          k.gain('bloom', 1, 3);
        },
        fx: { type: 'ring', color: '#ffe680', r: 44, onTarget: true },
      },
      {
        id: 'prayer', name: 'Prayer Circle', type: 'ogcd', target: 'self', cd: 60, anim: 'cast',
        desc: 'The party takes 10% less damage for 10s and regenerates for 15s.',
        effect(k) { k.mitigate('party', k.perk('cleric_w3') ? 0.15 : 0.1, 10, { ab: this }); k.hot('party', k.perk('cleric_a4') ? 150 : 100, 5, 3, { ab: this, id: 'prayer' }); },
        fx: { type: 'zone', style: 'holy', color: '#ffe680', r: 160, range: 0, dur: 3 },
      },
      {
        id: 'intervene', name: 'Intervention', type: 'gcd', target: 'ally', cast: 2.5, cd: 30, anim: 'big', allowDead: true,
        desc: '2.5s cast: bring a fallen ally back to life, or fully heal a living one.',
        effect(k, t) { if (k.env.isDead(t)) k.raise(t, { ab: this }); else k.heal(t, 1200, { ab: this }); },
        fx: { type: 'zone', style: 'pillar', color: '#fff6c8', r: 50, range: 0, dur: 1.6, onTarget: true },
      },
      {
        id: 'bene', name: 'Benediction', type: 'ogcd', target: 'ally', cd: 40, anim: 'big',
        desc: 'Instant: a strong heal and a shield on one ally.',
        effect(k, t) { k.heal(t, 800, { ab: this }); k.shield(t, k.perk('cleric_a2') ? 480 : 300, 10, { ab: this }); },
        fx: { type: 'ring', color: '#fffbe0', r: 52, onTarget: true },
      },
    ],
  },

  grovekeeper: {
    potMult: 0.92, // balance knob (tools/simulate.js)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'sprout', key: 'bloom', max: 100, label: 'Bloom' },
    init: () => ({ bloom: 0, rejuvs: [] }),
    healMod: k => (k.has('growth') ? 0.25 : 0),
    tick(k) {
      // HoT ticks grow Bloom (tracked locally from our own Rejuvenates)
      for (const r of k.g.rejuvs) {
        while (r.ticks > 0 && k.now >= r.next) { r.ticks--; r.next += 3; k.gain('bloom', k.perk('grovekeeper_a2') ? 7 : 5); }
      }
      k.g.rejuvs = k.g.rejuvs.filter(r => r.ticks > 0);
    },
    signature: 'Planting heals early',
    floor: 'Press Q to attack and E to keep thorns on the boss. W on hurt allies; R and D when the whole party is hurt.',
    ceiling: [
      'Rejuvenate heals over 15 seconds. Put it on BEFORE damage lands so nothing is wasted, then attack while it works.',
      'Every Rejuvenate tick grows Bloom. Spend it on Bloom for a big instant burst of healing that also makes your next Wrath instant and stronger.',
      'Keep Thornlash up on the boss: refresh it when it glows, in its last third. It\'s also your instant attack while moving.',
      'Wild Growth makes all your heals 25% stronger for 15s; open raidwide-heavy stretches with it.',
    ],
    abilities: [
      {
        id: 'wrath', name: 'Wrath', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('awaken') ? 0 : 1.5),
        desc: '1.5s cast attack. After Bloom it\'s instant and 50% stronger.',
        glow: k => k.has('awaken'),
        effect(k) {
          const a = k.consume('awaken');
          k.damage(a ? 390 : 260, { ab: this });
          if (a && k.perk('grovekeeper_w2')) { for (const r of k.g.rejuvs) k.heal(r.t, 160, { ab: this }); k.fx('empower'); }
        },
        fx: { type: 'projectile', style: 'leaf', color: '#8fff7a', range: RANGED, speed: 600 },
      },
      {
        id: 'rejuv', name: 'Rejuvenate', type: 'gcd', target: 'ally', anim: 'cast',
        desc: 'Instant: a small heal, then healing every 3s for 15s. Its ticks grow Bloom.',
        effect(k, t) {
          k.heal(t, 200, { ab: this });
          k.hot(t, 140, 5, 3, { ab: this, id: 'rejuv' });
          k.g.rejuvs = k.g.rejuvs.filter(r => r.t !== t);
          k.g.rejuvs.push({ t, ticks: 5, next: k.now + 3 });
        },
        fx: { type: 'ring', color: '#8fff7a', r: 40, onTarget: true },
      },
      {
        id: 'thorn', name: 'Thornlash', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        desc: 'Instant: thorns that damage the target over 30s.',
        glow: k => k.dotRemaining('thorn') < 9,
        effect(k) { k.damage(120, { ab: this }); k.dot('thorn', k.perk('grovekeeper_w1') ? 75 : 60, 30, 3, { ab: this }); if (k.perk('grovekeeper_a4')) k.gain('bloom', 5); },
        fx: { type: 'zone', style: 'roots', color: '#4f9f3f', r: 50, range: RANGED, dur: 1.2 },
      },
      {
        id: 'growth', name: 'Wild Growth', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'The whole party regenerates for 15s, and your heals are 25% stronger for 15s.',
        effect(k) { k.buff('growth', 15); k.hot('party', 90, 5, 3, { ab: this, id: 'growth' }); if (k.perk('grovekeeper_w3')) k.gain('bloom', 25); },
        fx: { type: 'cone', color: '#7ee06a', r: 170, span: 6.28 },
      },
      {
        id: 'bloom', name: 'Bloom', type: 'ogcd', target: 'self', cd: 15, anim: 'big',
        desc: 'Spend 50 Bloom: instantly heal everyone with your Rejuvenate (and the whole party during Wild Growth). Your next Wrath is instant.',
        usable: k => k.g.bloom >= 50,
        glow: k => k.g.bloom >= 90,
        effect(k) {
          k.spend('bloom', 50);
          if (k.has('growth')) k.heal('party', 350, { ab: this });
          for (const r of k.g.rejuvs) k.heal(r.t, 400, { ab: this });
          if (!k.g.rejuvs.length && !k.has('growth')) k.heal('self', 400, { ab: this });
          k.buff('awaken', 15);
        },
        fx: { type: 'ring', color: '#a8ff9a', r: 150 },
      },
      {
        id: 'rebirth', name: 'Rebirth', type: 'gcd', target: 'ally', cast: 2.5, cd: 30, anim: 'big', allowDead: true,
        desc: '2.5s cast: bring a fallen ally back, or heal and cleanse a living one.',
        effect(k, t) { if (k.env.isDead(t)) k.raise(t, { ab: this }); else k.heal(t, 1100, { ab: this }); },
        fx: { type: 'zone', style: 'roots', color: '#a8ff9a', r: 50, range: 0, dur: 1.6, onTarget: true },
      },
    ],
  },

  chronomancer: {
    potMult: 0.84, // balance knob (tools/simulate.js)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'hourglass', key: 'flux', max: 100, label: 'Flux' },
    init: () => ({ flux: 50, stance: 'slow', link: null }),
    haste: k => (k.g.stance === 'haste' ? 0.8 : k.has('lag') ? 1.2 : 1),
    dmgMod: k => (k.g.stance === 'haste' ? 0.1 : 0),
    tick(k) {
      const dt = k.now - (k.g.lastTick ?? k.now);
      k.g.lastTick = k.now;
      if (dt <= 0 || dt > 1) return;
      if (k.g.stance === 'slow') k.gain('flux', 3 * dt);
      else {
        k.g.flux = Math.max(0, k.g.flux - (k.perk('chronomancer_a2') ? 3.75 : 5) * dt);
        if (k.g.flux <= 0) { k.g.stance = 'slow'; k.buff('lag', 3); k.fx('lag'); k.stats.lags = (k.stats.lags || 0) + 1; }
      }
    },
    signature: 'Haste / Slow stance',
    floor: 'Press Q: your attacks heal the tank. E switches to Haste when Flux is full. W on anyone who just took a big hit.',
    ceiling: [
      'Slow stance: Temporal Bolt heals your linked ally (the tank) for 85% of its damage, and Flux fills. Haste stance: 20% faster casts, +10% damage, and every Bolt heals the WHOLE party a little, but Flux drains.',
      'Run out of Flux in Haste and you stumble (3s of slow casts). Switch back before that, and plan Haste for raidwides and burst windows.',
      'Rewind sets an ally\'s HP back to what it was 4s ago, and even revives someone who died in the last 4s. Fire it right after a tankbuster for a massive heal.',
      'Stasis makes the whole party immune for 2s. One perfectly timed press can erase the boss\'s biggest attack.',
    ],
    abilities: [
      {
        id: 'bolt', name: 'Temporal Bolt', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.consume('surge') ? 0 : 1.5),
        desc: '1.5s cast attack. Slow: heals your linked ally for 85% of its damage. Haste: heals everyone for 30%.',
        effect(k) {
          const r = k.damage(280, { ab: this });
          if (k.g.stance === 'haste') k.healRaw('party', r.amount * 0.3, { ab: this });
          else k.healRaw(k.g.link ?? k.env.defaultLink(), r.amount * 0.85, { ab: this });
        },
        fx: { type: 'projectile', color: '#5ff0ff', range: RANGED, speed: 800 },
      },
      {
        id: 'rewind', name: 'Rewind', type: 'ogcd', target: 'ally', charges: 2, cd: 30, anim: 'cast', allowDead: true,
        desc: 'Set an ally\'s HP back to its highest point in the last 4s (revives them if they died in that time). They become your link.',
        effect(k, t) { k.rewind(t, k.perk('chronomancer_a4') ? 6 : 4, { ab: this }); k.g.link = t; if (k.perk('chronomancer_w2')) k.shield(t, 250, 8, { ab: this }); },
        fx: { type: 'ring', style: 'rewind', color: '#c8fbff', r: 44, onTarget: true },
      },
      {
        id: 'shift', name: 'Shift', type: 'ogcd', target: 'self', cd: 2.5, anim: 'cast',
        label: k => (k.g.stance === 'haste' ? 'Shift: Slow' : 'Shift: Haste'),
        desc: 'Switch between Slow (Flux fills, strong single-target healing) and Haste (fast, party healing, Flux drains). Your first Bolt in Haste is instant.',
        usable: k => k.g.stance === 'haste' || k.g.flux >= 20,
        glow: k => k.g.stance === 'slow' && k.g.flux >= 95,
        effect(k) {
          if (k.g.stance === 'slow') { k.g.stance = 'haste'; k.buff('surge', 10); if (k.perk('chronomancer_w1')) k.gain('flux', 10); }
          else k.g.stance = 'slow';
        },
        fx: { type: 'aura', style: 'stasis', color: '#3fd0d0', r: 30, dur: 0.8 },
      },
      {
        id: 'accel', name: 'Accelerando', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Party burst: everyone attacks 10% faster for 15s. You gain 40 Flux.',
        effect(k) { k.partyBuff('haste', 0.1, 15, { ab: this }); k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab: this }); },
        fx: { type: 'zone', style: 'clock', color: '#3fd0d0', r: 160, range: 0, dur: 2 },
      },
      {
        id: 'stasis', name: 'Stasis', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
        desc: 'The whole party is immune to damage for 2 seconds.',
        effect(k) { k.mitigate('party', 1, 2, { kind: 'invuln', ab: this }); },
        fx: { type: 'aura', style: 'stasis', color: '#9ff4ff', r: 110, dur: 2 },
      },
      {
        id: 'recall', name: 'Recall', type: 'gcd', target: 'ally', cast: 2.5, cd: 30, anim: 'big', allowDead: true,
        desc: '2.5s cast: bring a fallen ally back, or heal a living one heavily.',
        effect(k, t) { if (k.env.isDead(t)) k.raise(t, { ab: this }); else k.heal(t, 1200, { ab: this }); },
        fx: { type: 'ring', style: 'rewind', color: '#9ff4ff', r: 50, onTarget: true },
      },
    ],
  },
};

// The shared dash on Space: two charges, no GCD.
const DASH = { charges: 2, cd: 12 };

if (typeof module !== 'undefined') module.exports = { KITS, DASH, MELEE, RANGED };


