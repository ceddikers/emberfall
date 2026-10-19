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
        k.gain('resolve', k.talent('bastion_unshaken') ? 25 : 20);
        k.g.counter = 1;
        if (k.perk('bastion_a2')) k.shield('self', 260, 6);
        if (k.talent('bastion_sunlit')) k.damage(40, { ab: k.abById('brace') });
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
          let pot = [220, 300, 400][step] * (step === 2 && k.talent('bastion_judgment') ? 1.15 : 1);
          if (k.g.counter) { pot += k.talent('bastion_counter') ? 195 : 150; k.g.counter = 0; }
          k.damage(pot, { ab: this });
          if (step === 2) { k.gain('resolve', k.has('oath') ? 50 : 25); if (k.perk('bastion_w1')) k.heal('self', 120, { ab: this }); }
          bastionChain(k, this, step);
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
          const pot = (k.has('oath') ? 720 : 560) * (k.talent('bastion_lightforged') ? 1.08 : 1);
          k.damage(pot, { ab: this });
          if (k.perk('bastion_w2')) { k.damage(pot * 0.4, { ab: this }); k.fx('empower'); }
          bastionEdge(k, this);
        },
        fx: { type: 'projectile', color: '#ffe9a0', range: 260, speed: 900 },
      },
      {
        id: 'brace', name: 'Brace', type: 'ogcd', target: 'self', charges: 2, cd: 7, lock: 0.5, anim: 'brace',
        desc: 'Raise your shield: 25% less damage for 3s. Brace just before a hit lands for a Perfect Block.',
        effect(k) { k.mitigate('self', k.talent('bastion_steadfast') ? 0.35 : 0.25, 3, { kind: 'brace', ab: this }); },
        fx: { type: 'shield', color: '#7fb2ff', dur: 1.2 },
      },
      {
        id: 'oath', name: 'Oath of Valor', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 15s of +10% damage. Judgment grants double Resolve and Holy Edge hits harder.',
        glow: k => k.g.resolve >= 50,
        effect(k) { k.buff('oath', 15 + (k.talent('bastion_vigil') ? 4 : 0)); },
        fx: { type: 'aura', color: '#ffd65a', r: 38, dur: 2 },
      },
      {
        id: 'banner', name: 'Rally Banner', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Plant a banner: the whole party takes 15% less damage for 12s.',
        effect(k) {
          k.mitigate('party', 0.15, 12, { ab: this });
          if (k.talent('bastion_sanctuary')) k.hot('party', 80, 4, 3, { ab: this, id: 'sanctuary' });
          if (k.talent('bastion_standard')) k.partyBuff('dmg', 0.03, 12, { ab: this });
          if (k.talent('bastion_hallowed')) k.dot('hallowed', 100, 12, 2, { ab: this });
        },
        fx: { type: 'zone', style: 'banner', color: '#f2c84b', r: 150, range: 0, dur: 3 },
      },
      {
        id: 'bulwark', name: 'Bulwark', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
        desc: 'Big cooldown: 40% less damage for 10s, and Brace\'s charges refill.',
        effect(k) { k.mitigate('self', k.perk('bastion_a4') ? 0.5 : 0.4, 10, { ab: this }); k.refill('brace'); if (k.perk('bastion_w3')) k.shield('party', 160, 8, { ab: this }); if (k.talent('bastion_wall')) k.gain('resolve', 40); },
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
            k.damage(340 * (k.talent('bloodreaver_maul') ? 1.12 : 1), { ab: this }); k.gain('blood', k.talent('bloodreaver_hunger') ? 20 : 15); k.g.step = 0;
            if (k.talent('bloodreaver_rend')) k.g.wounds = Math.min(3, (k.g.wounds || 0) + 1);
          } else {
            k.damage(240, { ab: this }); k.gain('blood', k.talent('bloodreaver_hunger') ? 15 : 10); k.g.step = 1; k.g.comboUntil = k.now + 15;
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
          pot = reaverDrainPot(k, pot);
          k.damage(pot, { ab: this });
          if (k.perk('bloodreaver_w2')) { k.damage(pot * 0.3, { ab: this }); k.fx('empower'); }
          const heal = k.healRaw('self', Math.max(k.env.maxHp() * 0.08, taken * (k.talent('bloodreaver_thirst') ? 0.45 : 0.35)), { ab: this });
          if (k.talent('bloodreaver_tide')) k.healRaw('party', heal * 0.2, { ab: this });
        },
        fx: { type: 'slash', color: '#ff2d4b', r: 56, span: 1.4 },
      },
      {
        id: 'letting', name: 'Bloodletting', type: 'ogcd', target: 'enemy', range: MELEE, charges: 2, cd: 15, anim: 'attack',
        desc: 'Quick slash between attacks: damage and +20 Blood. Two charges.',
        glow: k => k.charges(k.abById('letting')) === 2,
        effect(k) { k.damage(220, { ab: this }); k.gain('blood', k.perk('bloodreaver_w1') ? 30 : 20); if (k.perk('bloodreaver_a4')) k.healRaw('self', k.env.maxHp() * 0.05, { ab: this }); reaverLetting(k, this); },
        fx: { type: 'slash', color: '#ff7a7a', r: 46, span: 1.2 },
      },
      {
        id: 'frenzy', name: 'Frenzy', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 12s of +15% damage, and your next three Crimson Drains are free and stronger.',
        effect(k) {
          const dur = 12 + (k.talent('bloodreaver_carnage') ? 4 : 0), free = k.talent('bloodreaver_feast') ? 4 : 3;
          k.buff('frenzy', dur); k.buff('gorge', dur, {}, free, free); if (k.perk('bloodreaver_w3')) k.gain('blood', 30);
          if (k.talent('bloodreaver_frenzied')) { const l = k.abilities.find(a => k.baseId(a) === 'letting'); if (l) k.refill(l.id); }
        },
        fx: { type: 'aura', color: '#ff2020', r: 40, dur: 2.5 },
      },
      {
        id: 'warcry', name: 'War Cry', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
        desc: 'Roar: shields the whole party for about 14% of their HP for 15s.',
        effect(k) {
          k.shield('party', k.talent('bloodreaver_iron') ? 375 : 300, 15, { ab: this }); if (k.perk('bloodreaver_a2')) k.healRaw('self', k.env.maxHp() * 0.1, { ab: this });
          if (k.talent('bloodreaver_roar')) k.gain('blood', 40);
        },
        fx: { type: 'ring', color: '#ff9a7a', r: 160 },
      },
      {
        id: 'undying', name: 'Undying', type: 'ogcd', target: 'self', cd: 150, anim: 'big',
        desc: 'For 8s you cannot drop below 1 HP, and your heals on yourself are doubled.',
        effect(k) { k.mitigate('self', 0, 8, { kind: 'living', ab: this }); k.buff('undying', 8); if (k.talent('bloodreaver_scar')) k.mitigate('self', 0.15, 8, { ab: this }); },
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
        k.g.selfWard = false;
        k.damage((150 + 450 * frac) * (k.has('overload') ? 1.5 : 1) * (k.talent('runeguard_volatile') ? 1.2 : 1), { ab: k.abById('ward') });
        if (frac >= (k.talent('runeguard_reclaim') ? 0.5 : 0.999)) { k.gain('runes', 1, 3); k.stats.wardBreaks = (k.stats.wardBreaks || 0) + 1; k.fx('rune-echo'); }
      }
      if (type === 'shieldEnd' && d.tag === 'gward') runeGlyphguardEnd(k, d);
      if (type === 'reflect') {
        k.damage(1500 * (k.talent('runeguard_mirrorsedge') ? 1.25 : 1), { ab: k.abById('mirror') }); k.fx('reflect');
        if (k.talent('runeguard_shards')) for (let i = 0; i < 3; i++) k.damage(150, { ab: k.abById('mirror') });
      }
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
          k.damage(270 * (k.talent('runeguard_etched') ? 1.1 : 1), { ab: this });
          const extra = k.perk('runeguard_w1') && k.rng() < 0.25 ? 1 : 0;
          runeGain(k, this, (k.has('overload') ? 2 : 1) + extra);
          if (extra) k.fx('empower');
        },
        fx: { type: 'projectile', color: '#b18cff', range: 200, speed: 1200 },
      },
      {
        id: 'ward', name: 'Runic Ward', type: 'gcd', target: 'self', anim: 'cast',
        desc: 'Spend 1 Rune: shield yourself (about 20% of your HP) for 8s. It explodes when it ends, harder the more it absorbed.',
        usable: k => k.g.runes >= 1,
        effect(k) { k.spend('runes', 1); k.shield('self', (k.perk('runeguard_a2') ? 812 : 650) * (k.talent('runeguard_thick') ? 1.15 : 1), k.perk('runeguard_a4') ? 12 : 8, { ab: this, tag: 'ward' }); k.g.selfWard = true; },
        fx: { type: 'aura', style: 'hex', color: '#9fd8ff', r: 32, dur: 2 },
      },
      {
        id: 'glyph', name: 'Glyph Burst', type: 'gcd', target: 'enemy', range: 260, anim: 'cast',
        desc: 'Spend 3 Runes: detonate a glyph on the target for heavy damage.',
        usable: k => k.g.runes >= 3,
        glow: k => k.g.runes >= 3,
        effect(k) {
          k.spend('runes', 3); k.damage(k.has('overload') ? 1080 : 830, { ab: this }); if (k.perk('runeguard_w2')) k.gain('runes', 1, 3);
          if (k.talent('runeguard_afterglyph')) k.dot('afterglyph', 35, 9, 3, { ab: this });
          runeGlyphguard(k, this);
        },
        fx: { type: 'zone', style: 'vortex', color: '#7a55e8', r: 70, range: 260, dur: 0.8 },
      },
      {
        id: 'overload', name: 'Runic Overload', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 15s of +10% damage. Rune Strike gives 2 Runes, Glyph Burst and Ward blasts hit harder.',
        effect(k) {
          const dur = 15 + (k.talent('runeguard_long') ? 4 : 0);
          k.buff('overload', dur); if (k.perk('runeguard_w3')) k.gain('runes', 2, 3);
          if (k.talent('runeguard_storm')) k.after(dur, () => { for (let i = 0; i < k.g.runes; i++) k.damage(200, { ab: this }); });
        },
        fx: { type: 'aura', color: '#b18cff', r: 40, dur: 2 },
      },
      {
        id: 'sanctum', name: 'Sanctum', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Draw a sanctum: the whole party takes 15% less damage for 10s.',
        effect(k) { k.mitigate('party', 0.15, k.talent('runeguard_sanctum') ? 14 : 10, { ab: this }); if (k.talent('runeguard_well')) k.gain('runes', 2, 3); },
        fx: { type: 'zone', style: 'clock', color: '#9f7aff', r: 150, range: 0, dur: 3 },
      },
      {
        id: 'mirror', name: 'Mirror Aegis', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
        desc: 'For 3s, the next hit you take is reduced by 80% and reflected back for huge damage.',
        effect(k) { k.mitigate('self', 0.8, k.talent('runeguard_mirror') ? 5 : 3, { kind: 'reflect', ab: this }); },
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
          k.damage(barr ? 690 : 230, rangerShot(k, this));
          k.gain('focus', rangerFocus(k, barr));
          if (k.rng() < (k.has('markself') ? 0.55 : 0.35) + (k.perk('ranger_w1') ? 0.1 : 0)) rangerKeen(k);
          rangerRhythm(k, this, barr, 230);
        },
        fx: { type: 'line', color: '#fff2b0', range: 380 },
      },
      {
        id: 'pierce', name: 'Piercing Arrow', type: 'gcd', target: 'enemy', range: RANGED, charges: 2, cd: 12, anim: 'attack',
        desc: 'Heavy piercing shot, two charges. With Keen Eye it hits harder and gives the charge back.',
        glow: k => k.has('keen') || k.charges(k.abById('pierce')) === 2,
        effect(k) {
          const keen = k.consume('keen');
          if (keen) {
            k.damage(500 * (k.talent('ranger_keen') ? 1.15 : 1), { ab: this }); k.refundCharge('pierce');
            if (k.perk('ranger_w2')) { k.damage(250, { ab: this }); k.fx('empower'); }
          }
          else k.damage(340, { ab: this });
          rangerPierce(k, keen);
        },
        fx: { type: 'line', color: '#ffd27a', range: 440 },
      },
      {
        id: 'rapid', name: 'Rapid Fire', type: 'ogcd', target: 'enemy', range: RANGED, cd: 2, anim: 'attack',
        desc: 'Spend 50 Focus: a volley between your other shots.',
        usable: k => k.g.focus >= 50,
        glow: k => k.g.focus >= 90 || (k.has('markself') && k.g.focus >= 50),
        effect(k) {
          k.spend('focus', 50);
          k.damage((k.perk('ranger_a4') ? 483 : 420) * (k.talent('ranger_markedvolley') && k.has('markself') ? 1.3 : 1), { ab: this }); if (k.perk('ranger_a2')) k.gain('focus', 10);
          if (k.talent('ranger_arrowstorm')) k.dot('arrowstorm', 50, 6, 3, { ab: this });
        },
        fx: { type: 'zone', style: 'arrows', color: '#e8d9a0', r: 60, range: RANGED, dur: 0.9 },
      },
      {
        id: 'mark', name: "Hunter's Mark", type: 'ogcd', target: 'enemy', range: RANGED, cd: 60, anim: 'cast',
        desc: 'Party burst: the boss takes 8% more damage from everyone for 15s, and Keen Eye triggers more often.',
        effect(k) {
          const dur = 15 + (k.talent('ranger_longhunt') ? 3 : 0);
          k.debuffTarget('vuln', 0.08, dur, { ab: this }); k.buff('markself', dur);
        },
        fx: { type: 'ring', style: 'mark', color: '#ff9d3d', r: 46, range: RANGED },
      },
      {
        id: 'cloak', name: "Hunter's Cloak", type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'The whole party takes 10% less damage for 10s.',
        effect(k) { k.mitigate('party', k.talent('ranger_shelter') ? 0.15 : 0.1, 10, { ab: this }); },
        fx: { type: 'ring', color: '#9fdc8a', r: 150 },
      },
      {
        id: 'barrage', name: 'Barrage', type: 'ogcd', target: 'self', cd: 30, anim: 'big',
        desc: 'Your next Quick Shot fires three times and gives triple Focus.',
        glow: k => k.has('markself'),
        effect(k) {
          k.buff('barrage', 15); if (k.perk('ranger_w3')) k.proc('keen', 15);
          if (k.talent('ranger_dressing')) k.healRaw('self', k.env.maxHp() * 0.08, { ab: this });
          if (k.talent('ranger_rush')) k.gain('focus', 20);
          if (k.talent('ranger_falcon')) { k.dot('falcon', 40, 6, 1.5, { ab: this }); k.fx('empower'); }
        },
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
    onDamage(k, amt, crit, opts) {   // your poison ticking (Leeching Poison, Envenom)
      if (!opts.dot || !opts.ab || opts.ab.id !== 'venom') return;
      if (k.talent('shadowblade_leech')) k.healRaw('self', k.env.maxHp() * 0.01, { ab: opts.ab });
      if (k.talent('shadowblade_envenom') && k.rng() < 0.08) k.gain('combo', 1, 5);
    },
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
          const r = k.damage(220 * (k.talent('shadowblade_serrated') ? 1.12 : 1), { ab: this, positional: 'rear', posBonus: 60 });
          k.gain('combo', (r.posHit ? 2 : 1) + (k.talent('shadowblade_quicken') && k.has('dance') && k.consume('quicken') ? 2 : 0), 5);
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
          const mult = (k.dotRemaining('poison') > 0 ? 1.15 : 1) * (k.has('dance') ? 1.25 : 1) * (cp >= 4 && k.talent('shadowblade_cruel') ? 1.06 : 1);
          const r = k.damage(120 + 115 * cp + (cp >= 5 ? 160 : 0), { ab: this, positional: 'flank', posBonus: 80, mult });
          if (cp >= 5 && k.perk('shadowblade_w2')) { k.damage((120 + 115 * cp + 160 + (r.posHit ? 80 : 0)) * 0.3, { ab: this, mult }); k.fx('empower'); }
          bladeFinisher(k, this, cp, (120 + 115 * cp + (cp >= 5 ? 160 : 0) + (r.posHit ? 80 : 0)) * mult);
        },
        fx: { type: 'slash', color: '#ff4d8a', r: 50, span: 1.7 },
      },
      {
        id: 'step', name: 'Shadowstep', type: 'ogcd', target: 'enemy', range: 380, charges: 2, cd: 15, anim: 'cast',
        desc: 'Teleport behind the target. For 5s every hit counts as a positional.',
        effect(k) { k.teleport('behind', { ab: this }); k.buff('truenorth', k.perk('shadowblade_a4') ? 8 : 5); if (k.perk('shadowblade_a2')) k.gain('combo', 1, 5); bladeStep(k, this); },
        fx: { type: 'blink', color: '#9b5fd0' },
      },
      {
        id: 'dance', name: 'Shadow Dance', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 10s of faster attacks, every positional lands, and Eviscerate hits 25% harder.',
        effect(k) { k.buff('dance', 10 + (k.talent('shadowblade_longdance') ? 3 : 0)); if (k.talent('shadowblade_quicken')) k.buff('quicken', 13); if (k.perk('shadowblade_w3')) k.gain('combo', 2, 5); },
        fx: { type: 'aura', color: '#b04dff', r: 36, dur: 2 },
      },
      {
        id: 'venom', name: 'Venom Blade', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Poison the target (damage over 24s). While poisoned, Eviscerate hits 15% harder.',
        glow: k => k.dotRemaining('poison') < (k.talent('shadowblade_lasting') ? 9 : 7.2),
        effect(k) { k.damage(140, { ab: this }); k.dot('poison', (k.perk('shadowblade_w1') ? 88 : 70) * (k.talent('shadowblade_lasting') ? 1.15 : 1), k.talent('shadowblade_lasting') ? 30 : 24, 3, { ab: this }); },
        fx: { type: 'slash', color: '#8aff6a', r: 42, span: 1.0 },
      },
      {
        id: 'smoke', name: 'Smoke Bomb', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'The whole party takes 10% less damage for 10s.',
        effect(k) {
          k.mitigate('party', 0.1, k.talent('shadowblade_smoke') ? 14 : 10, { ab: this });
          if (k.talent('shadowblade_vanish')) { const st = k.abilities.find(a => k.baseId(a) === 'step'); if (st) k.refill(st.id); }
        },
        fx: { type: 'zone', color: '#8a7a9a', r: 140, range: 0, dur: 2 },
      },
    ],
  },

  pyromancer: {
    potMult: 1, // balance knob (tools/simulate.js)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'crucible', key: 'heat', max: 100, label: 'Heat' },
    init: () => ({ heat: 0 }),
    dmgMod: k => k.g.heat * (k.talent('pyromancer_heatsink') ? 0.004 : 0.003) - (k.has('burnt') ? 0.2 : 0),
    critMod: (k, opts) => (opts && opts.ab && ['fireball', 'pyro'].includes(opts.ab.id) ? 0.15 : 0) + (k.has('combust') ? 1 : 0) +
      (opts && opts.ab && opts.ab.id === 'fireball' && !opts.dot && k.perk('pyromancer_w1') ? 0.1 : 0),
    tick(k) {
      if (k.g.heat >= 100) {
        k.g.heat = 0;
        k.selfDamage(k.perk('pyromancer_a2') ? 0.075 : 0.15);
        k.buff('burnt', k.talent('pyromancer_tempered') ? 2 : 5);
        k.stats.overheats = (k.stats.overheats || 0) + 1;
        k.fx('overheat');
      }
      const dt = k.now - (k.g.lastTick ?? k.now);
      k.g.lastTick = k.now;
      if (dt > 0 && dt < 1 && !k.cast) k.g.heat = Math.max(0, k.g.heat - 2 * dt);
    },
    onDamage(k, amt, crit, opts) {
      if (opts.extra || !opts.ab || !['fireball', 'pyro', 'fireblast'].includes(opts.ab.id)) return;   // (a talent's extra hit doesn't feed Hot Streak)
      if (crit && !opts.dot && opts.ab.id === 'fireball' && k.talent('pyromancer_firestarter')) k.dot('firestarter', 40, 6, 3, { ab: opts.ab, extra: true });
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
        effect(k) {
          k.damage(300, { ab: this }); k.gain('heat', 12, 100);
          if (k.talent('pyromancer_bomb') && (k.g.fireballs = (k.g.fireballs || 0) + 1) % 4 === 0) k.after(3, () => { k.damage(90, { ab: this, extra: true }); k.fx('empower'); });
        },
        fx: { type: 'projectile', style: 'fire', color: '#ff8c2a', range: RANGED, speed: 650 },
      },
      {
        id: 'pyro', name: 'Pyroblast', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('hotstreak') ? 0 : 3.0),
        desc: '3s cast for big damage. With Hot Streak it\'s instant and stronger.',
        glow: k => k.has('hotstreak'),
        effect(k) {
          const hs = k.consume('hotstreak');
          const pot = hs ? 620 * (k.talent('pyromancer_pyroclasm') ? 1.1 : 1) : 540;
          k.damage(pot, { ab: this });
          if (hs && k.perk('pyromancer_w2')) { k.dot('pyroburn', 70, 9, 3, { ab: this }); k.fx('empower'); }
          if (hs && k.talent('pyromancer_twin')) k.damage(pot * 0.1, { ab: this, extra: true });
          k.gain('heat', hs ? 10 : 20, 100);
        },
        fx: { type: 'projectile', style: 'fire', color: '#ff5a1a', range: RANGED, speed: 520 },
      },
      {
        id: 'fireblast', name: 'Fire Blast', type: 'ogcd', target: 'enemy', range: RANGED, charges: 2, cd: 10, duringCast: true, lock: 0.4, anim: 'cast',
        desc: 'Instant blast that always crits, usable even while casting. Two charges.',
        glow: k => k.has('heating'),
        effect(k) { k.damage(160 * (k.talent('pyromancer_flashfire') ? 1.3 : 1), { ab: this, autoCrit: true }); k.gain('heat', k.talent('pyromancer_kindling') ? 12 : 6, 100); },
        fx: { type: 'ring', color: '#ffb03a', r: 40, range: RANGED },
      },
      {
        id: 'combust', name: 'Combustion', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: for 10s every Fireball, Pyroblast and Fire Blast crits.',
        effect(k) {
          const dur = (k.perk('pyromancer_a4') ? 13 : 10) + (k.talent('pyromancer_longburn') ? 3 : 0);
          k.buff('combust', dur); if (k.perk('pyromancer_w3')) k.refill('fireblast');
          pyroBurst(k, dur);
        },
        fx: { type: 'aura', color: '#ff7a1a', r: 40, dur: 2 },
      },
      {
        id: 'vent', name: 'Vent', type: 'gcd', target: 'enemy', range: RANGED, cd: 12, anim: 'big',
        desc: 'Instant: release all your Heat as an explosion. More Heat, more damage.',
        usable: k => k.g.heat >= 10,
        glow: k => k.g.heat >= 85,
        effect(k) {
          const h = k.g.heat; k.g.heat = 0; k.damage(150 + (k.talent('pyromancer_pressure') ? 8 : 6) * h, { ab: this });
          if (k.talent('pyromancer_heatshield')) k.shield('self', 300, 8, { ab: this });
          if (k.talent('pyromancer_phoenix')) { k.dot('phoenix', h * 0.4, 9, 3, { ab: this }); k.fx('empower'); }
        },
        fx: { type: 'zone', style: 'meteor', color: '#ff3a1a', r: 80, range: RANGED, dur: 1.1 },
      },
      {
        id: 'smolder', name: 'Smolder', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Sap the boss\'s strength: the whole party takes 10% less damage for 10s.',
        effect(k) { k.mitigate('party', 0.1, k.talent('pyromancer_smolder') ? 14 : 10, { ab: this }); },
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
      const every = 15 - (k.talent('cleric_fresh') ? 2 : 0);
      if (k.g.petalAt === null) k.g.petalAt = k.now + every;
      if (k.now >= k.g.petalAt) { k.gain('petals', 1, 3); k.g.petalAt += every; }
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
          if (k.g.bloom >= 3) { k.g.bloom = 0; k.damage(950 * (k.talent('cleric_radiant') ? 1.15 : 1), { ab: this }); k.fx('dawnstar'); if (k.perk('cleric_w2')) k.heal('party', 180, { ab: this }); clericDawnstar(k, this); }
          else k.damage(280 * (k.talent('cleric_burning') ? 1.05 : 1), { ab: this });
        },
        fx: { type: 'projectile', color: '#fff0a8', range: RANGED, speed: 800 },
      },
      {
        id: 'mend', name: 'Mend', type: 'gcd', target: 'ally', cast: 1.8, anim: 'cast',
        desc: '1.8s cast: a big heal on one ally.',
        effect(k, t) { k.heal(t, 700 * (k.talent('cleric_mending') ? 1.2 : 1), { ab: this }); },
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
          k.hot(t, k.perk('cleric_w1') ? 90 : 60, k.talent('cleric_dew') ? 10 : 5, 3, { ab: this, id: 'petal' });
          k.gain('bloom', 1, 3);
          clericPetal(k, this, t, 450);
        },
        fx: { type: 'ring', color: '#ffe680', r: 44, onTarget: true },
      },
      {
        id: 'prayer', name: 'Prayer Circle', type: 'ogcd', target: 'self', cd: 60, anim: 'cast',
        desc: 'The party takes 10% less damage for 10s and regenerates for 15s.',
        effect(k) {
          k.mitigate('party', k.perk('cleric_w3') ? 0.15 : 0.1, 10, { ab: this }); k.hot('party', k.perk('cleric_a4') ? 150 : 100, k.talent('cleric_widecircle') ? 7 : 5, 3, { ab: this, id: 'prayer' });
          if (k.talent('cleric_devotion')) k.gain('petals', 1, 3);
          if (k.talent('cleric_judgment')) k.dot('judgment', 90, 10, 3, { ab: this });
        },
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
        effect(k, t) { k.heal(t, 800, { ab: this }); k.shield(t, k.perk('cleric_a2') ? 480 : 300, 10, { ab: this }); if (k.talent('cleric_grace')) k.heal('party', 260, { ab: this }); },
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
        while (r.ticks > 0 && k.now >= r.next) { r.ticks--; r.next += 3; k.gain('bloom', (k.perk('grovekeeper_a2') ? 7 : 5) + (k.talent('grovekeeper_fertile') ? 1 : 0)); }
        if (r.ticks <= 0 && k.talent('grovekeeper_blossom')) { k.heal(r.t, 300, { ab: k.abilities.find(a => k.baseId(a) === 'rejuv') }); k.fx('empower'); }
      }
      k.g.rejuvs = k.g.rejuvs.filter(r => r.ticks > 0);
    },
    onDamage(k, amt, crit, opts) { if (opts.dot && opts.ab && opts.ab.id === 'thorn' && k.talent('grovekeeper_harvest')) k.gain('bloom', 2); },
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
          k.damage((a ? 390 * (k.talent('grovekeeper_awakened') ? 1.35 : 1) : 260) * (k.talent('grovekeeper_sunwrath') ? 1.05 : 1), { ab: this });
          if (a && k.perk('grovekeeper_w2')) { for (const r of k.g.rejuvs) k.heal(r.t, 160, { ab: this }); k.fx('empower'); }
          if (k.talent('grovekeeper_vines') && k.dots.has('thorn')) { k.g.vines = Math.min(5, (k.g.vines || 0) + 1); k.dots.get('thorn').potency = groveThornTick(k); }
        },
        fx: { type: 'projectile', style: 'leaf', color: '#8fff7a', range: RANGED, speed: 600 },
      },
      {
        id: 'rejuv', name: 'Rejuvenate', type: 'gcd', target: 'ally', anim: 'cast',
        desc: 'Instant: a small heal, then healing every 3s for 15s. Its ticks grow Bloom.',
        effect(k, t) {
          k.heal(t, k.talent('grovekeeper_verdant') ? 300 : 200, { ab: this });
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
        effect(k) { k.damage(120, { ab: this }); k.g.vines = 0; k.dot('thorn', groveThornTick(k), 30, 3, { ab: this }); if (k.perk('grovekeeper_a4')) k.gain('bloom', 5); },
        fx: { type: 'zone', style: 'roots', color: '#4f9f3f', r: 50, range: RANGED, dur: 1.2 },
      },
      {
        id: 'growth', name: 'Wild Growth', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'The whole party regenerates for 15s, and your heals are 25% stronger for 15s.',
        effect(k) { k.buff('growth', 15 + (k.talent('grovekeeper_lush') ? 5 : 0)); k.hot('party', 90, 5, 3, { ab: this, id: 'growth' }); if (k.perk('grovekeeper_w3')) k.gain('bloom', 25); groveGrowth(k, this); },
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
          if (k.talent('grovekeeper_naturewrath')) k.damage(120, { ab: this });
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
      if (k.g.stance === 'slow') k.gain('flux', (k.talent('chronomancer_well') ? 3.5 : 3) * dt);
      else {
        k.g.flux = Math.max(0, k.g.flux - (k.perk('chronomancer_a2') ? 3 : 4) * (k.talent('chronomancer_paradox') ? 0.85 : 1) * dt);
        if (k.g.flux <= 0) { k.g.stance = 'slow'; k.buff('lag', 3); k.fx('lag'); k.stats.lags = (k.stats.lags || 0) + 1; }
      }
    },
    signature: 'Haste / Slow stance',
    floor: 'Press Q: your attacks heal the tank. E switches to Haste when Flux is full. W on anyone who just took a big hit.',
    ceiling: [
      'Slow stance: Temporal Bolt heals your linked ally (the tank) for 120% of its damage, and Flux fills. Haste stance: 20% faster casts, +10% damage, and every Bolt heals the WHOLE party a little, but Flux drains.',
      'Run out of Flux in Haste and you stumble (3s of slow casts). Switch back before that, and plan Haste for raidwides and burst windows.',
      'Rewind sets an ally\'s HP back to what it was 4s ago, and even revives someone who died in the last 4s. Fire it right after a tankbuster for a massive heal.',
      'Stasis makes the whole party immune for 2s. One perfectly timed press can erase the boss\'s biggest attack.',
    ],
    abilities: [
      {
        id: 'bolt', name: 'Temporal Bolt', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('surge') || k.has('beat') ? 0 : 1.5),   // (only looks: asking for the cast time must not spend the free Bolt)
        desc: '1.5s cast attack. Slow: heals your linked ally for 120% of its damage. Haste: heals everyone for 50%.',
        effect(k) {
          chronoBolt(k, this, chronoInstant(k), 0.5, 1.2);
          chronoBoltAfter(k, this, 0.5, 1.2);
        },
        fx: { type: 'projectile', color: '#5ff0ff', range: RANGED, speed: 800 },
      },
      {
        id: 'rewind', name: 'Rewind', type: 'ogcd', target: 'ally', charges: 2, cd: 30, anim: 'cast', allowDead: true,
        desc: 'Set an ally\'s HP back to its highest point in the last 4s (revives them if they died in that time). They become your link.',
        effect(k, t) { k.rewind(t, k.perk('chronomancer_a4') ? 6 : 4, { ab: this }); k.g.link = t; if (k.perk('chronomancer_w2')) k.shield(t, 250, 8, { ab: this }); if (k.talent('chronomancer_hourglass')) k.mitigate(t, 0.15, 6, { ab: this }); },
        fx: { type: 'ring', style: 'rewind', color: '#c8fbff', r: 44, onTarget: true },
      },
      {
        id: 'shift', name: 'Shift', type: 'ogcd', target: 'self', cd: 2.5, anim: 'cast',
        label: k => (k.g.stance === 'haste' ? 'Shift: Slow' : 'Shift: Haste'),
        desc: 'Switch between Slow (Flux fills, strong single-target healing) and Haste (fast, party healing, Flux drains). Your first Bolt in Haste is instant.',
        usable: k => k.g.stance === 'haste' || k.g.flux >= 20,
        glow: k => k.g.stance === 'slow' && k.g.flux >= 95,
        effect(k) {
          if (k.g.stance === 'slow') { k.g.stance = 'haste'; const n = k.talent('chronomancer_double') ? 2 : 1; k.buff('surge', 10, {}, n, n); if (k.perk('chronomancer_w1')) k.gain('flux', 10); }
          else k.g.stance = 'slow';
          if (k.talent('chronomancer_phase') && k.now >= (k.g.phaseAt || 0)) {   // the afterimage's free Bolt
            k.g.phaseAt = k.now + 10;
            const acc = k.def.spec === 'accelerant';
            chronoBolt(k, k.abById('bolt'), 1, acc ? 0.62 : 0.5, acc ? 1 : 1.2); k.fx('echo');
          }
        },
        fx: { type: 'aura', style: 'stasis', color: '#3fd0d0', r: 30, dur: 0.8 },
      },
      {
        id: 'accel', name: 'Accelerando', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Party burst: everyone attacks 10% faster for 15s. You gain 40 Flux.',
        effect(k) { k.partyBuff('haste', 0.1, chronoAccel(k, 15), { ab: this }); k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab: this }); },
        fx: { type: 'zone', style: 'clock', color: '#3fd0d0', r: 160, range: 0, dur: 2 },
      },
      {
        id: 'stasis', name: 'Stasis', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
        desc: 'The whole party is immune to damage for 2 seconds.',
        effect(k) { k.mitigate('party', 1, k.talent('chronomancer_stasis') ? 3 : 2, { kind: 'invuln', ab: this }); },
        fx: { type: 'aura', style: 'stasis', color: '#9ff4ff', r: 110, dur: 2 },
      },
      {
        id: 'recall', name: 'Recall', type: 'gcd', target: 'ally', cast: 2.5, cd: 30, anim: 'big', allowDead: true,
        desc: '2.5s cast: bring a fallen ally back, or heal a living one heavily.',
        effect(k, t) { if (k.env.isDead(t)) k.raise(t, { ab: this }); else k.heal(t, 1400, { ab: this }); },
        fx: { type: 'ring', style: 'rewind', color: '#9ff4ff', r: 50, onTarget: true },
      },
    ],
  },
};

// ======================================================================= talents
// The parts of talents (talents.js) that a base move and its spec versions share. Each one does nothing unless the
// hero holds the talent (k.talent), so bots and the balance check see the kits exactly as above.

// Bastion: Blade Chain's Riposte and Judgment; Holy Edge / Shield Bash's heal and refund
function bastionChain(k, ab, step) {
  if (step === 1 && k.talent('bastion_riposte')) k.gain('resolve', 10);
  if (step === 2 && k.talent('bastion_echo')) { k.damage(75, { ab }); k.heal('self', 60, { ab }); k.fx('empower'); }
}
function bastionEdge(k, ab) {
  k.heal('self', k.talent('bastion_mercy') ? 240 : 120, { ab });
  if (k.talent('bastion_tithe')) k.gain('resolve', 5);
}
// Bloodreaver: Crimson Drain / Rampage potency (Rend, Gluttony); Bloodletting / Blood Lance (Open Vein)
function reaverDrainPot(k, pot) {
  if (k.talent('bloodreaver_rend') && k.g.wounds) { pot += 65 * k.g.wounds; k.g.wounds = 0; }
  return pot * (k.talent('bloodreaver_glutton') ? 1.07 : 1);
}
function reaverLetting(k, ab) {
  if (k.talent('bloodreaver_vein')) k.dot('vein', 30, 9, 3, { ab });
}
// Runeguard: Runes from a strike (Third Mark, Overflow); Glyphguard's little Ward
function runeGain(k, ab, n) {
  k.g.strikes = (k.g.strikes || 0) + 1;
  if (k.talent('runeguard_thirdmark') && k.g.strikes % 3 === 0) n += 1;
  const over = Math.max(0, (k.g.runes || 0) + n - 3);
  if (over && k.talent('runeguard_overflow')) k.damage(110 * over, { ab });
  k.gain('runes', n, 3);
}
function runeGlyphguard(k, ab) {
  if (!k.talent('runeguard_glyphguard') || k.g.selfWard || k.g.gward || k.now < (k.g.gwardAt || 0)) return;
  k.g.gward = true; k.g.gwardAt = k.now + 20;
  k.shield('self', 325, 8, { ab: k.abById('ward') || ab, tag: 'gward' });
}
function runeGlyphguardEnd(k, d) {
  k.g.gward = false;
  const frac = Math.max(0, Math.min(1, d.frac || 0));
  k.damage((60 + 180 * frac) * (k.has('overload') ? 1.5 : 1) * (k.talent('runeguard_volatile') ? 1.2 : 1), { ab: k.abById('ward') });
}
// Ranger: Quick Shot (Pinning Shot's crit, Focus, Keen Focus, Fletcher's Rhythm); Piercing Arrow and its spec versions
function rangerShot(k, ab) { const o = { ab }; if (k.talent('ranger_pin') && k.consume('pinned')) o.autoCrit = true; return o; }
const rangerFocus = (k, barr) => (k.talent('ranger_quiver') ? 12 : 10) * (barr ? 3 : 1);
function rangerKeen(k) { k.proc('keen', 15); if (k.talent('ranger_keenfocus')) k.gain('focus', 8); }
function rangerRhythm(k, ab, barr, pot) {
  if (barr) return;
  k.g.quicks = (k.g.quicks || 0) + 1;
  if (k.talent('ranger_rhythm') && k.g.quicks % 4 === 0) k.damage(pot * 0.5, { ab });
}
function rangerPierce(k, keen) {
  if (k.talent('ranger_lightfoot')) k.reduceCooldown('cloak', 3);
  if (k.talent('ranger_trail')) k.gain('focus', 5);
  if (keen && k.talent('ranger_pin') && k.now >= (k.g.pinAt || 0)) { k.g.pinAt = k.now + 12; k.buff('pinned', 15); }
}
// Shadowblade: after a finisher (Eviscerate / Backstab); after Shadowstep / Blade Fury
function bladeFinisher(k, ab, cp, full) {
  if (cp >= 5 && k.talent('shadowblade_relentless') && k.rng() < 0.5) k.gain('combo', 1, 5);
  const d = k.dots.get('poison');
  if (k.talent('shadowblade_toxic') && d && d.end > k.now) {
    const left = Math.max(0, Math.floor((d.end - d.next) / d.interval) + 1);
    if (left) k.damage(d.potency * left * 0.15, { ab });
  }
  if (k.talent('shadowblade_clone') && k.has('dance')) k.after(0.35, () => { k.damage(full * 0.3, { ab }); k.fx('empower'); });
}
function bladeStep(k, ab) {
  if (k.talent('shadowblade_evasion')) k.mitigate('self', 0.2, 3, { ab });
  if (k.talent('shadowblade_garrote')) k.dot('garrote', 50, 9, 3, { ab });
}
// Pyromancer: Combustion / Ember Circle (Fuel the Fire, Afterburn)
function pyroBurst(k, dur) {
  if (k.talent('pyromancer_fuel')) k.gain('heat', Math.max(0, Math.min(30, 95 - k.g.heat)), 100);   // never into an Overheat
  if (k.talent('pyromancer_afterburn')) k.after(dur, () => k.proc('hotstreak', 15));
}
// Cleric: Dawnstar; Dawn Petal (Petalfall, Twin Petals) for both Petal versions
function clericDawnstar(k, ab) {
  if (k.talent('cleric_favour')) k.gain('petals', 1, 3);
  if (k.talent('cleric_sunfall')) k.dot('sunfall', 35, 12, 3, { ab });
}
function clericPetal(k, ab, t, healPot) {
  if (k.talent('cleric_petalfall')) k.damage(40, { ab });
  if (k.talent('cleric_twin')) { const { amount, crit } = k.healAmount(healPot * 0.5, { ab }); k.env.emit({ type: 'heal', target: 'lowest', not: t, amount, crit, ab }); }
}
// Grovekeeper: a Thornlash tick (Deep Thorns, and Strangling Vines' growth); Wild Growth / Moonwell extras
const groveThornTick = k => (k.perk('grovekeeper_w1') ? 75 : 60) * (k.talent('grovekeeper_deepthorn') ? 1.18 : 1) * (1 + 0.05 * (k.talent('grovekeeper_vines') ? k.g.vines || 0 : 0));
function groveGrowth(k, ab) {
  if (k.talent('grovekeeper_bark')) k.mitigate('self', 0.15, 10, { ab });
  if (k.talent('grovekeeper_seed')) k.buff('awaken', 15);
}
// Chronomancer: one Temporal Bolt hit (share of its strength; the party / link heal shares), and what follows a Bolt
function chronoBolt(k, ab, share, party, link) {
  const mult = (k.talent('chronomancer_honed') && k.g.stance === 'slow' ? 1.07 : 1) * (k.has('crescendo') ? 1.1 : 1);
  const r = k.damage(280 * share, mult !== 1 ? { ab, mult } : { ab });
  if (k.g.stance === 'haste') k.healRaw('party', r.amount * party, { ab });
  else k.healRaw(k.g.link ?? k.env.defaultLink(), r.amount * link, { ab });
}
function chronoBoltAfter(k, ab, party, link, echoes) {
  k.g.bolts = (k.g.bolts || 0) + 1;
  if (k.talent('chronomancer_skip') && k.g.bolts % 5 === 4) k.buff('beat', 15);
  if (k.talent('chronomancer_borrowed') && k.g.stance === 'haste') k.gain('flux', 2);
  if (k.talent('chronomancer_second') && !echoes && k.g.stance === 'haste') k.after(2, () => chronoBolt(k, ab, k.def.spec === 'accelerant' ? 0.06 : 0.08, party, link));
}
// an instant Bolt (Skipped Beat's, or the one after shifting into Haste): spends it, and its strength (1, or 1.2 with those talents)
function chronoInstant(k) {
  if (k.consume('beat')) return 1.2;
  return k.consume('surge') && k.talent('chronomancer_double') ? 1.2 : 1;
}
// Accelerando / Echo Chamber: its length with Allegro, and Crescendo's buff for that long
function chronoAccel(k, dur) {
  dur += k.talent('chronomancer_allegro') ? 3 : 0;
  if (k.talent('chronomancer_crescendo')) k.buff('crescendo', dur);
  return dur;
}

// The shared dash on Space: two charges, no GCD.
const DASH = { charges: 2, cd: 12 };

// Every tank's taunt, on T: an oGCD outside the six kit slots, like the dash (every spec keeps it). The host applies
// the shared part (FightSim.taunt in fight.js): threat to the top + 10%, the boss fixed on you for 3s, an add for 6s.
// Each class's own version also feeds its gauge (use(k), run by CombatActor.useTaunt), and has its own look
// (KIT_VFX.taunt in ability-vfx.js). cd matches FIGHT.TAUNT_CD. icon: the ability icon it borrows until its own
// (icons/<class>/taunt.png) is painted.
const TAUNT = {
  cd: 20, range: 500, lock: 0.6,
  hold: 'your threat jumps to 10% above the highest, and the boss stays on you for 3s whatever anyone else does (an add, for 6s)',
  bastion: {
    name: 'Challenge', icon: 'banner',
    desc: 'Bang your blade on your shield and call your target out: {hold}. The challenge steadies you like a Perfect Block: +10 Resolve, and your next Blade Chain counters for +150.',
    use(k) { k.gain('resolve', 10); k.g.counter = 1; },
  },
  bloodreaver: {
    name: 'Reaver\'s Hook', icon: 'letting',
    desc: 'Hurl a hooked chain into your target and rip its attention to you: {hold}. The hook draws blood: +20 Blood.',
    use(k) { k.gain('blood', 20); },
  },
  runeguard: {
    name: 'Binding Rune', icon: 'glyph',
    desc: 'Stamp a rune of challenge on your target: {hold}. The rune is carved from your own stones and answers you: +1 Rune.',
    use(k) { k.gain('runes', 1, 3); },
  },
};
// the taunt as an ability-like object for the bar, tooltips and the hero page (null for anyone but a tank)
const tauntAbility = classId => {
  const t = TAUNT[classId];
  return t && t.name ? { id: 'taunt', icon: t.icon, name: t.name, type: 'ogcd', target: 'enemy', range: TAUNT.range, cd: TAUNT.cd, anim: 'big', taunt: true,
    desc: t.desc.replace('{hold}', TAUNT.hold) } : null;
};
// CSS background for the taunt's icon: its own painting once it exists, the borrowed icon underneath until then
const tauntIconBg = classId => `url(icons/${classId}/taunt.png), url(icons/${classId}/${(TAUNT[classId] || {}).icon}.png)`;

if (typeof module !== 'undefined') {
  module.exports = { KITS, DASH, TAUNT, tauntAbility, tauntIconBg, MELEE, RANGED, bastionChain, bastionEdge, reaverDrainPot, reaverLetting, runeGain, runeGlyphguard, runeGlyphguardEnd,
    rangerShot, rangerFocus, rangerKeen, rangerRhythm, rangerPierce, bladeFinisher, bladeStep, pyroBurst, clericDawnstar, clericPetal, groveThornTick,
    groveGrowth, chronoBolt, chronoBoltAfter, chronoInstant, chronoAccel };
}

// ===================================================================================================================
// ADVANCED CLASSES: Thermist and Driftblade (docs/plans/2026-10-new-classes.md). Each is built around one puzzle.
// Kept in their own block, after the nine above, so later classes slot in beside them.
// ===================================================================================================================

// Where a kit move lands (Kit.teleport): me / tgt / aim are { x, y } (aim: where you're heading: the cursor or your move
// target), d its reach. 'around' mirrors you through the target, 'through' charges past it, 'dash' goes toward aim.
// The world clamps the spot to the arena and moves you (main.js for you, raid-host.js for bots).
function kitMoveDest(where, me, tgt, aim, d = 170) {
  if (where === 'around' && tgt) return { x: 2 * tgt.x - me.x, y: 2 * tgt.y - me.y };
  if (where === 'through' && tgt) {
    const dx = tgt.x - me.x, dy = tgt.y - me.y, L = Math.hypot(dx, dy) || 1;
    return { x: tgt.x + dx / L * d, y: tgt.y + dy / L * d };
  }
  const to = aim && Math.hypot(aim.x - me.x, aim.y - me.y) > 4 ? aim : tgt;
  const a = to && Math.hypot(to.x - me.x, to.y - me.y) > 4 ? Math.atan2(to.y - me.y, to.x - me.x) : (me.angle || 0);
  return { x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d };
}
// how close point p comes to the segment a-b
function kitSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const q = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
  return Math.hypot(px - ax - dx * q, py - ay - dy * q);
}

// ---------------------------------------------------------------- Thermist: the dial
// k.g.temp runs from -5 (Rime) to +5 (Blaze). k.g.side is the side of 0 it last stood on, and k.g.peak the furthest it
// got on that side since it last crossed. A spell that carries the dial across 0 after a peak of 3 or more detonates
// a Thermal Shock sized by the whole swing (the peak plus how far past 0 it landed): +5 down to -1 is a swing of 6.
// Pushing past Â±5 overloads you: Overheat (fire locked for 3s, and you burn) or Frostbite (casts 30% slower for 3s).
// Zenith (k.def.redline) holds the edge instead, building Strain. Pendulum (k.def.stepBonus) moves it a step further.
const THERMIST = { STEP: 0.08, EDGE: 5, SHOCK_MIN: 3, SHOCK_BASE: -120, SHOCK_PER: 105, REDLINE: 0.2, STRAIN: 11 };
const THERM_SHOCK = { id: 'shock', name: 'Thermal Shock' };
const thermAt = (k, n) => Math.abs(k.g.temp) >= n;
const thermRedline = k => !!k.def.redline && thermAt(k, THERMIST.EDGE);
// a spell's bonus from where the dial stands: +8% per step on its own side (both sides count while Attuned)
function thermMult(k, el) {
  const t = k.g.temp, side = k.has('attuned') ? Math.abs(t) : Math.max(0, el * t);
  return (1 + THERMIST.STEP * side) * (thermRedline(k) ? 1 + THERMIST.REDLINE : 1);
}
// is this element's big spell being cast at its own edge (Flare at +5, Glacier Lance at -5)?
const thermEdgeCast = (k, el) => k.g.temp === el * THERMIST.EDGE;
// a Thermist spell's cast time: instant after a Shock with Rebound, at its own edge (big spells), or on its own side with
// Flicker (quick spells). Only looks: asking must never spend Rebound (thermSpell does).
function thermCast(k, el, base, edge) {
  if (k.has('rebound') || (edge && thermEdgeCast(k, el))) return 0;
  if (!edge && k.talent('thermist_flicker') && Math.sign(k.g.temp) === el) return 0;
  return base;
}

// one Thermist spell: el +1 fire / -1 frost, moving the dial `steps` (plus Pendulum's extra step) after it hits.
// o.edge: a big spell with the edge rule (at its own edge: instant, a sure crit, and On the Brink instead of moving).
function thermSpell(k, ab, el, steps, pot, o = {}) {
  const edge = !!o.edge && thermEdgeCast(k, el);
  k.consume('rebound');
  thermBrink(k, el);
  const mult = thermMult(k, el) * (o.mult || 1) * thermPerk(k, ab, el);
  const r = k.damage(pot, { ab, mult, autoCrit: edge && !k.def.redline });
  if (edge && k.talent('thermist_twin')) k.after(0.3, () => { k.damage(pot * (k.def.redline ? 0.09 : 0.3), { ab, mult, extra: true }); k.fx('twin', { el }); });
  if (edge && k.talent('thermist_afterglow')) k.dot(el > 0 ? 'afterglow' : 'afterfrost', k.def.redline ? 30 : 42, 9, 3, { ab });
  if (el > 0 && k.talent('thermist_embers') && k.g.temp >= 3) k.g.embers = Math.min(3, (k.g.embers || 0) + 1);
  if (edge && !k.def.redline) k.buff('brink', 6, { el });   // held at the edge: the same element next overloads you
  else thermMove(k, el * (steps + (k.def.stepBonus || 0)));
  return r;
}
const thermPerk = (k, ab, el) => ((ab.id === 'cinder' && k.perk('thermist_w1') && k.g.temp >= 3) ? 1.2 : (ab.id === 'lance' && k.perk('thermist_w3') && k.g.temp <= -3) ? 1.15 : 1) * (el ? 1 : 1);
// On the Brink: the next spell decides. The same element overloads you; the other one is safe.
function thermBrink(k, el) {
  if (!k.has('brink')) return;
  const b = k.buffs.get('brink');
  k.clear('brink');
  if (b.data.el === el) thermOverload(k, el);
}
function thermMove(k, delta) {
  let t1 = k.g.temp + delta;
  if (Math.abs(t1) > THERMIST.EDGE) {
    t1 = Math.sign(t1) * THERMIST.EDGE;
    if (!k.def.redline) thermOverload(k, Math.sign(delta));   // Zenith stays in Redline instead
  }
  k.g.temp = t1;
  thermSettle(k, t1, 1);
}
// the dial has landed on t1: a crossing after a big enough peak is a Thermal Shock; then the side and peak update
function thermSettle(k, t1, shockMult) {
  const g = k.g;
  if (t1 !== 0 && g.side && Math.sign(t1) !== g.side) {
    const swing = g.peak + Math.abs(t1);
    if (g.peak >= THERMIST.SHOCK_MIN) {
      thermShock(k, swing, shockMult, Math.sign(t1));
    }
    if (k.def.momentum) k.buff('momentum', 6, {}, 5, 1);   // Pendulum: every crossing swings harder
    g.peak = Math.abs(t1);
  } else if (t1 !== 0) g.peak = Math.max(g.peak, Math.abs(t1));
  if (t1 !== 0) g.side = Math.sign(t1);
  // the way the swing is going (for the glowing button): turn back at the edge, or a step short of it for Pendulum
  const turn = THERMIST.EDGE - (k.def.stepBonus || 0);
  if (t1 >= turn) g.dir = -1; else if (t1 <= -turn) g.dir = 1;
}
function thermShock(k, swing, mult = 1, to = 1) {
  if (k.g.latent) { mult *= 1.5; k.g.latent = 0; }
  const pot = Math.max(0, THERMIST.SHOCK_BASE + THERMIST.SHOCK_PER * swing) * mult;
  const r = k.damage(pot, { ab: THERM_SHOCK });
  k.stats.shocks = (k.stats.shocks || 0) + 1;
  k.fx('shock', { s: swing, c: to });
  if (k.g.embers) { const n = k.g.embers; k.g.embers = 0; k.after(0.3, () => { for (let i = 0; i < n; i++) k.damage(95, { ab: THERM_SHOCK, extra: true }); k.fx('embers', { n }); }); }
  if (k.talent('thermist_skin')) k.shield('self', pot * 0.3, 6, { ab: THERM_SHOCK });
  if (k.talent('thermist_rebound')) k.buff('rebound', 10);
  if (k.talent('thermist_conduct')) k.after(1, () => { k.damage(pot * 0.15, { ab: THERM_SHOCK, extra: true }); k.fx('shock', { s: 3, c: to, echo: 1 }); });
  return r;
}
function thermOverload(k, el) {
  k.stats.overloads = (k.stats.overloads || 0) + 1;
  if (k.talent('thermist_latent')) { k.g.latent = 1; k.fx('latent'); return; }   // banked for the next Shock instead
  if (el > 0) { k.buff('overheat', 3); k.selfDamage(0.08); k.fx('overheat'); }
  else { k.buff('frostbite', 3); k.fx('frostbite'); }
}
// Zenith: Strain builds while you hold the edge; full Strain is a meltdown (the dial snaps to 0 and you pay for it)
function thermTick(k) {
  const g = k.g, dt = k.now - (g.lastT ?? k.now);
  g.lastT = k.now;
  if (!k.def.redline || !(dt > 0 && dt < 1)) return;
  if (thermAt(k, THERMIST.EDGE)) {
    g.strain = Math.min(100, (g.strain || 0) + THERMIST.STRAIN * dt);
    k.buff('redline', 0.3);
    if (g.strain >= 100) thermMeltdown(k);
  } else g.strain = Math.max(0, (g.strain || 0) - 20 * dt);
}
function thermMeltdown(k) {
  const el = Math.sign(k.g.temp) || 1;
  Object.assign(k.g, { strain: 0, temp: 0, side: 0, peak: 0 });
  k.clear('redline');
  k.stats.overloads = (k.stats.overloads || 0) + 1;
  if (k.talent('thermist_latent')) { k.g.latent = 1; k.fx('latent'); return; }
  k.selfDamage(0.12); k.buff(el > 0 ? 'overheat' : 'frostbite', 4); k.fx(el > 0 ? 'overheat' : 'frostbite');
}
// Equilibrium: the dial snaps to 0 behind a shield sized by how far it fell
function thermEquil(k, ab) {
  const fell = Math.abs(k.g.temp), from = Math.sign(k.g.temp);
  k.shield('self', 70 * Math.max(1, fell) * (k.perk('thermist_a2') ? 1.5 : 1), 8, { ab });
  k.clear('brink');
  Object.assign(k.g, { temp: 0, side: 0, peak: 0 });
  thermUtility(k, ab, fell >= 4);
  if (fell >= THERMIST.SHOCK_MIN && k.talent('thermist_pulse')) thermShock(k, fell, 1, -from);
}
// the Equilibrium / Bleed Off talents that don't depend on which one it is
function thermUtility(k, ab, big) {
  if (big && k.talent('thermist_front')) k.mitigate('party', 0.1, 6, { ab });
  if (k.talent('thermist_phase')) k.teleport('dash', { ab, d: 150 });
}
// Inversion: the dial flips (+5 to -5), a Shock half again as strong, and 10s of Attunement
function thermInvert(k, ab) {
  const t0 = k.g.temp;
  k.clear('brink');
  k.buff('attuned', k.perk('thermist_a4') ? 14 : 10);
  if (t0) { k.g.temp = -t0; thermSettle(k, -t0, k.perk('thermist_w2') ? 1.95 : 1.5); }
  if (k.talent('thermist_vortex')) k.dot('vortex', 55, 6, 1.5, { ab });
  if (k.talent('thermist_solstice')) k.after(5, () => { const t = k.g.temp; if (t) { k.g.temp = -t; thermSettle(k, -t, 0.6); k.fx('invert'); } });
}
// which spell keeps the swing going (the glowing button): the edge spell, the big step, or the small step
function thermPlan(k) {
  const t = k.g.temp, sb = k.def.stepBonus || 0, s = Math.sign(t);
  const brink = k.has('brink') ? k.buffs.get('brink').data.el : 0;
  if (Math.abs(t) === THERMIST.EDGE && !brink && !(s > 0 && k.has('overheat')) && (!k.def.redline || (k.g.strain || 0) < 60)) return s > 0 ? 'flare' : 'lance';
  let dir = brink ? -brink : Math.abs(t) === THERMIST.EDGE ? -s : (k.g.dir || 1);
  if (dir > 0 && k.has('overheat')) dir = -1;
  for (let pass = 0; pass < 2; pass++, dir = -dir) {
    if (Math.abs(t + dir * (2 + sb)) <= THERMIST.EDGE) return dir > 0 ? 'flare' : 'lance';
    if (Math.abs(t + dir * (1 + sb)) <= THERMIST.EDGE) return dir > 0 ? 'cinder' : 'rime';
  }
  return 'lance';
}

KITS.thermist = {
  potMult: 0.9, // balance knob (tools/simulate.js)
  auto: { kind: 'thermo', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'dial', key: 'temp', max: 5, label: 'Temperature' },
  init: () => ({ temp: 0, side: 0, peak: 0, dir: 1, strain: 0, embers: 0, latent: 0 }),
  haste: k => (k.has('frostbite') ? 1.3 : 1),
  tick: k => thermTick(k),
  onExpire(k, id, b) { if (id === 'brink') thermOverload(k, b.data.el); },   // held the edge too long
  signature: 'Thermal Shock',
  floor: 'Alternate Q and W, press E and R when they glow, and press F when the dial is far from 0. D if you\'re about to be hit hard.',
  ceiling: [
    'Swing the whole dial: build to +5 with fire, then carry it across 0 with frost. The swing that crosses 0 detonates a Thermal Shock, and the further you swung (from +5 down to -1 is 6), the bigger it is.',
    'Every step from 0 is +8% damage for that side\'s spells, so a spell at the far end of a swing hits hardest. Spells that move you toward 0 gain nothing.',
    'At +5 Flare is instant and always crits, but leaves you On the Brink: the next spell must be frost or you overheat. Glacier Lance is the same at -5. Use the edge spells as your movement.',
    'Inversion flips the dial: at Â±5 that is a swing of 10, half again as strong, and Attunement lets both elements count for 10s. Save it for burst windows. Equilibrium is your mitigation: it snaps the dial back to 0, so it costs you the swing.',
  ],
  abilities: [
    {
      id: 'cinder', name: 'Cinder Bolt', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: 1,
      cast: k => thermCast(k, 1, 1),
      desc: '1s cast: a quick fire bolt. Turns the dial 1 toward Blaze.',
      usable: k => !k.has('overheat'),
      glow: k => thermPlan(k) === 'cinder',
      effect(k) { thermSpell(k, this, 1, 1, 210); },
      fx: { type: 'projectile', style: 'fire', color: '#ff8a3a', range: RANGED, speed: 800 },
    },
    {
      id: 'rime', name: 'Rime Shard', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: -1,
      cast: k => thermCast(k, -1, 1),
      desc: '1s cast: a quick shard of ice. Turns the dial 1 toward Rime.',
      glow: k => thermPlan(k) === 'rime',
      effect(k) { thermSpell(k, this, -1, 1, 210); },
      fx: { type: 'projectile', color: '#8fd8ff', range: RANGED, speed: 900 },
    },
    {
      id: 'flare', name: 'Flare', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: 1,
      cast: k => thermCast(k, 1, 2, true),
      desc: '2s cast: a burst of fire. Turns the dial 2 toward Blaze. At +5 it\'s instant and always crits, but holds you On the Brink: if your next spell is fire too, you overheat.',
      usable: k => !k.has('overheat'),
      glow: k => thermPlan(k) === 'flare',
      effect(k) { thermSpell(k, this, 1, 2, 400, { edge: true }); },
      fx: { type: 'projectile', style: 'fire', color: '#ff5a1a', range: RANGED, speed: 700 },
    },
    {
      id: 'lance', name: 'Glacier Lance', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: -1,
      cast: k => thermCast(k, -1, 2, true),
      desc: '2s cast: a lance of ice. Turns the dial 2 toward Rime. At -5 it\'s instant and always crits, but holds you On the Brink: if your next spell is frost too, you get frostbite.',
      glow: k => thermPlan(k) === 'lance',
      effect(k) { thermSpell(k, this, -1, 2, 400, { edge: true }); },
      fx: { type: 'line', color: '#bfe8ff', range: 440 },
    },
    {
      id: 'equil', name: 'Equilibrium', type: 'ogcd', target: 'self', cd: 30, anim: 'cast',
      desc: 'Snap the dial back to 0 behind a shield: about 3% of your HP for every step it fell. It also clears On the Brink.',
      effect(k) { thermEquil(k, this); },
      fx: { type: 'shield', color: '#e8d8ff', dur: 1.2 },
    },
    {
      id: 'invert', name: 'Inversion', type: 'ogcd', target: 'enemy', range: RANGED, cd: 90, anim: 'big',
      desc: 'Flip the dial: +5 becomes -5. From 3 or more steps out that\'s a Thermal Shock half again as strong. For 10s after, both elements count as your side (Attuned).',
      glow: k => thermAt(k, 4),
      effect(k) { thermInvert(k, this); },
      fx: { type: 'ring', color: '#e4688a', r: 60, range: RANGED },
    },
  ],
};

// ---------------------------------------------------------------- Driftblade: movement is the resource
// Drift fills while you move (20/s) and drains while you stand still (30/s); most moves hit harder with it. Running
// through an enemy's body is a Passing Strike. Slipstream lays a wind lane (re-entering it gives Drift back; on every
// client it also speeds up whoever walks along it). Orbit (k.def.orbit) and Comet (k.def.driftMax, k.def.straight).
const DRIFT = { FILL: 20, STRAIGHT: 34, DRAIN: 30, ICD: 0.45, LANE_DRIFT: 15 };
const DRIFT_BODY = { target: 'enemy', range: 12, body: true };    // brushing or inside an enemy's body
const DRIFT_NEAR = { target: 'enemy', range: 120, near: true };   // close enough to circle (Orbit)
const DRIFT_REACH = { target: 'enemy', range: MELEE };
const DRIFT_PASS = { id: 'pass', name: 'Passing Strike' };
const driftMax = k => k.def.driftMax || 100;
const driftK = k => Math.min(1, (k.g.drift || 0) / 100);   // how much Drift backs a hit, 0..1 (Comet's second 100 is for Impact)
function driftAdd(k, n) {
  const before = k.g.drift || 0;
  k.g.drift = Math.min(driftMax(k), before + n);
  if (k.g.drift > before) k.fxGain(k.g.drift - before);
}
const driftAngDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function driftTick(k) {
  const g = k.g, now = k.now, dt = now - (g.lastT ?? now);
  g.lastT = now;
  if (!(dt > 0 && dt < 0.5)) return;
  const moving = k.env.moving(), pos = k.env.pos ? k.env.pos() : null;
  // heading: Comet fills faster in a straight line
  if (pos && g.px != null) {
    const dx = pos.x - g.px, dy = pos.y - g.py;
    if (Math.hypot(dx, dy) > 1.5) {
      const hd = Math.atan2(dy, dx);
      g.straightT = g.hd != null && Math.abs(driftAngDiff(hd, g.hd)) < 0.3 ? (g.straightT || 0) + dt : 0;
      g.hd = hd;
    }
  }
  if (pos) { g.px = pos.x; g.py = pos.y; }
  if (moving) {
    driftAdd(k, (k.def.straight && g.straightT > 0.4 ? DRIFT.STRAIGHT : DRIFT.FILL) * dt);
    g.stillT = 0;
  } else {
    g.stillT = (g.stillT || 0) + dt;
    const held = k.has('gale') || k.has('still') || (k.talent('driftblade_hover') && g.stillT < 1.5);
    if (!held) g.drift = Math.max(0, (g.drift || 0) - DRIFT.DRAIN * dt);
  }
  // your own Slipstream lanes: stepping back onto one gives Drift
  if (g.lanes.length) {
    g.lanes = g.lanes.filter(l => l.end > now);
    const on = pos && g.lanes.some(l => kitSegDist(pos.x, pos.y, l.ax, l.ay, l.bx, l.by) < 34);
    if (on && !g.onLane && now >= (g.laneAt || 0)) { driftAdd(k, DRIFT.LANE_DRIFT); g.laneAt = now + 0.8; k.fx('lane'); }
    g.onLane = on;
  }
  // Passing Strikes: running into an enemy's body
  const body = k.env.target(DRIFT_BODY), inside = !!body;
  if (inside && !g.inside && moving && now >= (g.passAt || 0)) { g.passAt = now + DRIFT.ICD; driftPass(k, body); }
  g.inside = inside;
  if (k.def.orbit) driftOrbit(k, pos, moving);
}
// (tg: the enemy you ran through; the hit lands on it, not on whatever you last aimed at)
function driftPass(k, tg) {
  const tgt = tg && tg.id !== 'dummy' ? tg.id : undefined;
  k.damage(90 * (1 + driftK(k)) * (k.has('gale') ? 3 : 1), { ab: DRIFT_PASS, tgt });
  k.stats.passes = (k.stats.passes || 0) + 1;
  k.fx('pass', { g: k.has('gale') ? 1 : 0 });
  if (k.talent('driftblade_razor')) { k.g.razor = Math.min(3, (k.dots.has('razor') ? k.g.razor || 0 : 0) + 1); k.dots.delete('razor'); k.dot('razor', 16 * k.g.razor, 6, 2, { ab: DRIFT_PASS, tgt }); }
  if (k.has('gale') && k.talent('driftblade_hurricane') && (k.g.galeAdd || 0) < 6) { k.g.galeAdd = (k.g.galeAdd || 0) + 1; k.buff('gale', 1); k.buffs.get('gale').end += 1; }
}
// Orbit: every radian you circle round your target close in is a stack (up to 5, gone 2.5s after you stop);
// at 5, Carve cuts on its own every 1.4s while you keep moving
function driftOrbit(k, pos, moving) {
  const g = k.g, t = moving && pos ? k.env.target(DRIFT_NEAR) : null;
  if (!t || t.x == null) { g.orbA = null; return; }
  const a = Math.atan2(pos.y - t.y, pos.x - t.x);
  if (g.orbA != null) g.orbAcc = (g.orbAcc || 0) + Math.abs(driftAngDiff(a, g.orbA));
  g.orbA = a;
  while (g.orbAcc >= 1) { g.orbAcc -= 1; k.buff('orbit', 2.5, {}, 5, 1); }
  if (k.stacks('orbit') >= 5 && k.now >= (g.orbCutAt || 0) && k.env.target(DRIFT_REACH)) {
    g.orbCutAt = k.now + 1.4;
    k.damage(80 * (1 + 0.3 * driftK(k)), { ab: k.abilities[0], extra: true });
    k.fx('orbitcut');
  }
}
function driftSpend(k, d, full) {
  if (k.talent('driftblade_second') && d >= full * 0.8) driftAdd(k, full * 0.1);
}
function driftHook(k, ab) {
  if (k.talent('driftblade_tailwind')) { driftAdd(k, 20); k.buff('tailwind', 8); }
  if (k.talent('driftblade_sidestep')) k.mitigate('self', 0.3, 2, { ab });
  if (k.talent('driftblade_after')) k.after(1, () => { if (k.env.target(DRIFT_NEAR)) { k.damage(170, { ab, extra: true }); k.fx('afterimage'); } });
}
// a riposte (Stillpoint / Tailspin catching a hit in its first moment)
function driftRiposte(k) {
  k.damage(320 * (1 + 0.5 * driftK(k)), { ab: k.abilities[4] });
  k.stats.parries = (k.stats.parries || 0) + 1;
  k.fx('riposte');
}

KITS.driftblade = {
  potMult: 0.66, // balance knob (tools/simulate.js)
  auto: { kind: 'sabre', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'drift', key: 'drift', max: 100, label: 'Drift' },
  init: () => ({ drift: 0, lanes: [], stillT: 0 }),
  tick: k => driftTick(k),
  onNotify(k, type) { if (type === 'perfect') driftRiposte(k); },
  signature: 'Drift and Passing Strikes',
  floor: 'Keep moving. Press Q to cut, and R when the gauge is full. Run through the boss when you can.',
  ceiling: [
    'Drift fills while you move and drains while you stand still, and nearly everything hits harder with it. A Driftblade who stands still is half a Driftblade.',
    'Running clean through an enemy\'s body is a Passing Strike, stronger with Drift. Every dodge can carry you through the boss instead of away from it.',
    'Hook Turn swings you to the far side of your target and gives back a dash charge: chain it with Slipstream and the shared dash for long runs. Above 70 Drift it always crits.',
    'Crosswind spends everything: fire it full. Save Gale Run for stretches where the fight makes you move: for 12s Drift can\'t drain and Passing Strikes hit three times as hard.',
  ],
  abilities: [
    {
      id: 'carve', name: 'Carve', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'A sabre cut, stronger with Drift. At 50 Drift or more a second cut follows through.',
      effect(k) {
        const m = 1 + 0.3 * driftK(k), crit = k.consume('tailwind');
        k.damage(240 * m, { ab: this, autoCrit: crit });
        if (k.g.drift >= 50) k.after(0.15, () => k.damage(240 * (k.perk('driftblade_w1') ? 0.5 : 0.3) * m, { ab: this, extra: true }));
        if (k.talent('driftblade_crescent') && k.env.moving() && (k.g.cres = (k.g.cres || 0) + 1) >= 3) {
          k.g.cres = 0; k.after(0.25, () => { k.damage(210 * m, { ab: this, extra: true }); k.fx('crescent'); });
        }
      },
      fx: { type: 'slash', color: '#bff8e8', r: 56, span: 1.8 },
    },
    {
      id: 'slip', name: 'Slipstream', type: 'ogcd', target: 'none', charges: 2, cd: 14, lock: 0.3, anim: 'dash',
      desc: 'Dash 180 px the way you\'re heading and leave a wind lane for 6s. Anyone moving along it goes faster, and stepping back onto it gives you Drift. Dashing through an enemy is a Passing Strike. Two charges.',
      effect(k) {
        const p = k.env.pos ? k.env.pos() : null, ab = this;
        k.teleport('dash', { ab, d: 180 });
        driftAdd(k, k.perk('driftblade_a4') ? 25 : 15);
        if (k.talent('driftblade_gust')) k.shield('self', 130, 6, { ab });
        if (!p) return;
        k.after(0.22, () => {
          const q = k.env.pos();
          k.g.lanes.push({ ax: p.x, ay: p.y, bx: q.x, by: q.y, end: k.now + 6 });
          const tg = k.env.target({ target: 'enemy', range: 300 });
          const crossed = tg && tg.x != null && kitSegDist(tg.x, tg.y, p.x, p.y, q.x, q.y) < 60;
          if (crossed && k.now >= (k.g.passAt || 0)) { k.g.passAt = k.now + DRIFT.ICD; driftPass(k, tg); }
          if (crossed && k.talent('driftblade_jet') && k.now >= (k.g.jetAt || 0)) { k.g.jetAt = k.now + 8; k.refundCharge(ab.id); }
          if (crossed && k.talent('driftblade_eddies')) { k.damage(150, { ab }); k.after(6, () => { if (k.env.target(DRIFT_NEAR)) k.damage(150, { ab, extra: true }); }); }
        });
      },
      fx: { type: 'blink', color: '#9ff0e0' },
    },
    {
      id: 'hook', name: 'Hook Turn', type: 'ogcd', target: 'enemy', range: 220, cd: 12, lock: 0.45, anim: 'attack',
      desc: 'Swing round your target to its far side with a cut, stronger with Drift. Above 70 Drift it always crits. Gives back a dash charge.',
      glow: k => k.g.drift >= 70,
      effect(k) {
        const crit = k.g.drift >= 70;
        k.teleport('around', { ab: this });
        k.damage(260 * (1 + 0.4 * driftK(k)), { ab: this, autoCrit: crit });
        if (k.env.refundDash) k.env.refundDash();
        driftHook(k, this);
      },
      fx: { type: 'slash', color: '#9ff0e0', r: 64, span: 3.2 },
    },
    {
      id: 'cross', name: 'Crosswind', type: 'gcd', target: 'enemy', range: 300, anim: 'big',
      desc: 'Spend all your Drift on a blade of wind: the more you spend, the harder it hits (about four times as hard at full).',
      usable: k => k.g.drift >= 20,
      glow: k => k.g.drift >= 80,
      effect(k) {
        const d = k.g.drift; k.g.drift = 0;
        const r = k.damage(120 + 7 * d, { ab: this });
        if (d >= 90 && k.perk('driftblade_w2')) { k.damage((120 + 7 * d) * 0.3, { ab: this }); k.fx('empower'); }
        driftSpend(k, d, 100);
        return r;
      },
      fx: { type: 'line', color: '#dffff6', range: 300 },
    },
    {
      id: 'still', name: 'Stillpoint', type: 'ogcd', target: 'self', cd: 25, lock: 0.5, anim: 'brace',
      desc: 'Stop and parry for 2s: 50% less damage, and your Drift holds instead of draining. Catch a hit in the first moment and you riposte.',
      effect(k) {
        k.mitigate('self', 0.5, 2, { kind: 'brace', ab: this }); k.buff('still', 2);
        if (k.perk('driftblade_a2')) driftAdd(k, 20);
        if (k.talent('driftblade_calm')) k.mitigate('party', 0.1, 2, { ab: this });
      },
      fx: { type: 'shield', color: '#dffff6', dur: 1.2 },
    },
    {
      id: 'gale', name: 'Gale Run', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
      desc: 'Burst: for 12s your Drift can\'t drain and Passing Strikes hit three times as hard.',
      effect(k) {
        const dur = k.perk('driftblade_w3') ? 15 : 12;
        k.buff('gale', dur); k.g.galeAdd = 0;
        if (k.talent('driftblade_galeforce')) k.after(dur, () => { const r = k.env.target({ target: 'enemy', range: 300 }); if (r) { k.damage(100 + 5 * k.g.drift, { ab: k.abilities[3], extra: true }); k.fx('galeforce'); } });
      },
      fx: { type: 'aura', color: '#9ff0e0', r: 36, dur: 2 },
    },
  ],
};

// ---------------------------------------------------------------- talents that grant a whole new move
// TALENT_ABILITIES[talentId] = { cls, ab, spec?: { specId: ab } }: holding the talent puts `ab` in the slot of the base
// ability it `replaces` (specs.js kitFor), over that slot's spec version. The icon falls back to the replaced move's.
const TALENT_ABILITIES = {};
(() => {
  const thermocline = {
    id: 'thermocline', replaces: 'cinder', icon: 'cinder', name: 'Thermocline', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
    desc: 'Instant: a bolt that swings the dial 2 steps toward the other side (toward Rime from 0). It counts as the element it swings toward, and hits harder the further from 0 you started.',
    glow: k => thermAt(k, 3) && !(k.has('brink') && k.buffs.get('brink').data.el === -Math.sign(k.g.temp)),
    effect(k) { const t = k.g.temp, el = t > 0 ? -1 : t < 0 ? 1 : -1; thermSpell(k, this, el, 2, 170, { mult: 1 + THERMIST.STEP * Math.abs(t) }); },
    fx: { type: 'projectile', color: '#e4a8ff', range: RANGED, speed: 1000 },
  };
  TALENT_ABILITIES.thermist_thermocline = { cls: 'thermist', ab: thermocline,
    spec: { pendulum: Object.assign({}, thermocline, { desc: 'Instant: a bolt that swings the dial 3 steps toward the other side (toward Rime from 0). It counts as the element it swings toward, and hits harder the further from 0 you started.' }) } };
  TALENT_ABILITIES.thermist_zero = { cls: 'thermist', ab: {
    id: 'zero', replaces: 'rime', icon: 'rime', name: 'Absolute Zero', type: 'gcd', target: 'enemy', range: RANGED, cast: 2, cd: 45, anim: 'big', el: -1,
    desc: '2s cast, 45s cooldown: the dial plunges straight to -5, wherever it was. It hits harder the further it fell, and from 3 or more on the hot side that crossing is a Thermal Shock of up to 10.',
    glow: k => k.g.temp >= 3,
    effect(k) {
      const fell = k.g.temp + THERMIST.EDGE;
      thermBrink(k, -1);
      k.damage(100 + 15 * fell, { ab: this, mult: thermMult(k, -1) });
      k.g.temp = -THERMIST.EDGE; thermSettle(k, -THERMIST.EDGE, 1);
    },
    fx: { type: 'zone', color: '#bfe8ff', r: 80, range: RANGED, dur: 1 },
  } };
  TALENT_ABILITIES.driftblade_gyre = { cls: 'driftblade', ab: {
    id: 'gyre', replaces: 'hook', icon: 'hook', name: 'Gyre', type: 'ogcd', target: 'enemy', range: MELEE, charges: 2, cd: 10, lock: 0.5, anim: 'attack',
    desc: 'Loop once round your target, cutting it once for every 25 Drift you have (up to 4 cuts). It spends nothing, and the loop adds 10 Drift. Two charges.',
    glow: k => k.g.drift >= 75,
    effect(k) {
      const n = Math.max(1, Math.min(4, Math.floor((k.g.drift || 0) / 25)));
      for (let i = 0; i < n; i++) k.after(0.12 * i, () => k.damage(105, { ab: this }));
      driftAdd(k, 10); driftHook(k, this);
      k.fx('gyre', { n });
    },
    fx: { type: 'slash', color: '#9ff0e0', r: 70, span: 6.28 },
  } };
  TALENT_ABILITIES.driftblade_tailspin = { cls: 'driftblade', ab: {
    id: 'tailspin', replaces: 'still', icon: 'still', name: 'Tailspin', type: 'ogcd', target: 'self', cd: 25, lock: 0.5, anim: 'big',
    desc: 'Whirl in place for a moment: you parry like Stillpoint, cut the nearest enemy three times (stronger with Drift), then spring 150 px the way you\'re heading. Your Drift holds while you spin.',
    effect(k) {
      const ab = this, m = 1 + 0.5 * driftK(k);
      k.mitigate('self', 0.5, 1, { kind: 'brace', ab }); k.buff('still', 1);
      if (k.perk('driftblade_a2')) driftAdd(k, 20);
      if (k.talent('driftblade_calm')) k.mitigate('party', 0.1, 1, { ab });
      for (let i = 0; i < 3; i++) k.after(0.12 + 0.22 * i, () => { if (k.env.target(DRIFT_REACH)) k.damage(115 * m, { ab }); });
      k.after(0.8, () => k.teleport('dash', { ab, d: 150 }));
    },
    fx: { type: 'slash', color: '#dffff6', r: 66, span: 6.28 },
  } };
})();

if (typeof module !== 'undefined') Object.assign(module.exports, { kitMoveDest, kitSegDist, THERMIST, thermSpell, thermMove, thermSettle, thermShock, thermBrink, thermMult, thermAt,
  thermEdgeCast, thermEquil, thermUtility, thermInvert, thermPlan, thermTick, thermOverload, DRIFT, DRIFT_BODY, DRIFT_NEAR, DRIFT_REACH, driftAdd, driftTick, driftPass, driftK, driftMax,
  driftSpend, driftHook, driftRiposte, TALENT_ABILITIES });

