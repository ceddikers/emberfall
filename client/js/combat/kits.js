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

// ======================================================================= ALEMBIST (healer, added with classes-b)
// Brewed before it's needed. Three reagents on Q W E: two quick presses brew a vial into the bandolier, and R throws
// one at your heal target (a bomb flies at the enemy instead). Vials ripen (+30% over 10s), then spoil at 40s.
// The bandolier's rules live in k.def.alem, which the specs change: Apothecary { slots 5, ripe 5, pick }, Volatile
// { fuse 6, heat 4 } (every vial heats up fast and goes off wherever it is) with Catalyst for three-reagent Reactions.
// A thrown vial is a `splash` event: the host finds who stands within r of the ally it lands on (fight.js), and a
// lingering cloud or ward is a floor pool there. The look of a throw rides on k.fx('vial', data) to every client.
const ALEMBIC = {
  FLIGHT: 0.4,      // seconds from the throw to the shatter
  GROW: 0.3,        // a fully ripe (or fully heated) vial is 30% stronger
  RAISE_CD: 30,     // a Mending Draught raises a fallen ally it lands on, once every 30s
  reagents: {
    E: { name: 'Ember', color: '#ff7a2a' }, D: { name: 'Dew', color: '#4fc8ff' },
    S: { name: 'Salt', color: '#efe6cf' }, Q: { name: 'Quicksilver', color: '#c9d4e6' },
  },
  // two-reagent recipes, keyed by their reagents in sorted order. kind: heal | bomb | ward | salve | quick
  recipes: {
    DD: { name: 'Mending Draught', color: '#4fe0c0', glyph: 'plus', kind: 'heal', text: 'a big splash heal. It raises a fallen ally it lands on (once every 30s).' },
    EE: { name: 'Fire Bomb', color: '#ff5a1a', glyph: 'flame', kind: 'bomb', text: 'flies at the enemy: a heavy hit and a short burn.' },
    SS: { name: 'Salt Ward', color: '#f4ecd2', glyph: 'ward', kind: 'ward', text: 'a circle of salt: allies inside take 20% less damage for 6s.' },
    DE: { name: 'Steam', color: '#bfe8ec', glyph: 'cloud', kind: 'heal', text: 'a healing cloud: everyone inside heals every 1.5s for 9s.' },
    DS: { name: 'Salve', color: '#7ff0a8', glyph: 'drop', kind: 'salve', text: 'shields everyone it splashes and washes off Vulnerability and Damage Down.' },
    ES: { name: 'Quickpowder', color: '#ffd23a', glyph: 'bolt', kind: 'quick', text: 'the whole party acts 10% faster for 10s; allies it splashes shake off slows and roots.' },
    // Quicksilver (a talent: it takes Salt's place)
    QQ: { name: 'Silver Mirror', color: '#dfe6f2', glyph: 'mirror', kind: 'ward', text: 'a pool of quicksilver: everyone inside keeps a small shield for 6s.' },
    DQ: { name: 'Silver Tonic', color: '#9fe8ff', glyph: 'plus', kind: 'heal', text: 'a splash heal that is up to twice as strong on the badly hurt.' },
    EQ: { name: 'Fulminate', color: '#ffe9a0', glyph: 'flame', kind: 'bomb', text: 'flies at the enemy and goes off twice.' },
  },
  // Volatile's Reactions: three reagents (Quicksilver counts as Salt). Sealed in the tooltips until you've brewed one.
  reactions: {
    EEE: { name: 'Dragon\'s Breath', color: '#ff3a10', glyph: 'flame', kind: 'bomb', text: 'a huge fire bomb that leaves the enemy burning hard.' },
    DDD: { name: 'Elixir of Life', color: '#6fffd0', glyph: 'plus', kind: 'heal', text: 'a great splash heal that lingers as a healing mist, and raises the fallen.' },
    SSS: { name: 'Bastion Salt', color: '#fff6dc', glyph: 'ward', kind: 'ward', text: 'a wide salt circle: allies inside take 25% less damage for 8s.' },
    DES: { name: 'Philosopher\'s Draught', color: '#e6c8ff', glyph: 'star', kind: 'heal', text: 'heals and shields the whole party, wherever they stand.' },
    DEE: { name: 'Brimstone', color: '#ff9a3a', glyph: 'cloud', kind: 'bomb', text: 'a bomb on the enemy, and a healing cloud at your heal target.' },
    DDS: { name: 'Living Salve', color: '#6ff0d0', glyph: 'drop', kind: 'salve', text: 'a strong shield, a cleanse of everything it can wash off, and a short regen.' },
    EES: { name: 'Thunderpowder', color: '#fff070', glyph: 'bolt', kind: 'bomb', text: 'the party acts 15% faster for 12s, and it bursts on the enemy.' },
  },
};
const alemKey = letters => [...letters].sort().join('');
const alemReactionKey = key => alemKey(key.replace(/Q/g, 'S'));
// a vial's recipe card (a two-reagent recipe, a Reaction, or a Grand Blend)
const alemInfo = r => ALEMBIC.recipes[r] || ALEMBIC.reactions[r] || (r === 'BL' ? { name: 'Grand Blend', color: '#ffe0a8', glyph: 'star', kind: 'blend' } : { name: 'Vial', color: '#ffffff', glyph: 'plus', kind: 'heal' });
const alemIsBomb = v => (v.parts ? v.parts.some(p => alemInfo(p.r).kind === 'bomb') : alemInfo(v.r).kind === 'bomb');
const alemIsHeal = v => (v.parts ? v.parts.some(p => alemInfo(p.r).kind === 'heal') : alemInfo(v.r).kind === 'heal');
// the Reactions this hero has found (env.known: null means all of them, for bots and the simulator)
function alemKnown(k) { const s = k && k.env.known ? k.env.known() : null; return s || null; }
// the recipe book as tooltip lines: Reactions not yet found are sealed
function alemBook(known, reactions) {
  const name = r => [...r].map(x => ALEMBIC.reagents[x].name).join(' + ');
  if (!reactions) return Object.entries(ALEMBIC.recipes).filter(([r]) => !r.includes('Q')).map(([r, v]) => `<div class="alem-rec"><b>${name(r)}</b>: ${v.name}, ${v.text}</div>`).join('');
  return Object.entries(ALEMBIC.reactions).map(([r, v]) => (!known || known.has(r)
    ? `<div class="alem-rec"><b>${name(r)}</b>: ${v.name}, ${v.text}</div>`
    : '<div class="alem-rec sealed"><b>Sealed</b>: a Reaction you have not found yet.</div>')).join('');
}
// the browser's found set for tooltips (the save), or null outside the browser
function alemSavedKnown() { try { return typeof Save !== 'undefined' && Save.found ? new Set(Save.found('alembist')) : null; } catch (e) { return null; } }

function alemRipeTime(k) { return k.def.alem.fuse ? k.def.alem.heat : k.def.alem.ripe; }
function alemSpoilTime(k) { return k.talent('alembist_cask') ? 30 : k.def.alem.spoil; }
// how strong a vial is right now: 1, rising to 1.3 as it ripens (or heats up, for Volatile)
function alemStrength(k, v) {
  if (v.parts) return 1;
  const A = k.def.alem, age = (k.now - v.at) * (v.fast ? 1.5 : 1);
  if (A.fuse) return 1 + ALEMBIC.GROW * Math.min(k.talent('alembist_cask') ? 1.5 : 1, Math.max(0, age / A.heat));
  let s = 1 + ALEMBIC.GROW * Math.min(1, Math.max(0, age / A.ripe));
  if (k.talent('alembist_cask') && age > A.ripe) s += Math.min(0.2, (age - A.ripe) / (25 - A.ripe) * 0.2);
  return s;
}
// the throw slot (the heal events name it, so party frames and tooltips know where a heal came from)
const alemAb = k => k.abilities[3];
// which vial Throw takes: the oldest, or the Apothecary's pick
function alemPick(k) { const n = k.g.vials.length; return n ? Math.max(0, Math.min(n - 1, k.def.alem.pick ? k.g.sel | 0 : 0)) : -1; }
// a new vial into the bandolier (false if it's full). o: { copy, batch }
function alemAdd(k, key, o = {}) {
  const A = k.def.alem;
  if (k.g.vials.length >= A.slots) return false;
  const v = { r: key, at: k.now, born: k.now, id: ++k.g.n };
  if (A.fuse) v.fuse = k.now + A.fuse + (k.talent('alembist_cask') ? 2 : 0);
  // Mother Liquor: the same recipe twice in a row starts ripe; Grand Reserve: batch copies start ripe and keep
  if (k.talent('alembist_echo') && !o.copy && k.g.last === key) v.fast = 1;
  if (o.batch && k.talent('alembist_reserve')) v.at = k.now - alemRipeTime(k);
  if (o.batch && k.talent('alembist_reserve')) { if (A.fuse) v.fuse = k.now + 10; else v.keep = true; }
  k.g.vials.push(v);
  if (!o.copy) k.g.last = key;
  k.g.popAt = k.now; k.g.popR = key;
  k.fx('brew', { r: key });
  return v;
}
// one reagent press: into the still; the second (third with Catalyst) brews the vial
function alemReagent(k, ab, x) {
  const need = k.has('catalyst') ? 3 : 2;
  k.consume('distill');
  if (x === 'E' || x === 'Q') k.engagedAt = k.now;   // a bomb-maker is fighting: autos may swing
  if (!k.g.half.length && x === 'E' && k.talent('alembist_kindle') && k.env.target({ target: 'enemy', range: RANGED })) { k.damage(20, { ab }); k.fx('kindle'); }
  k.g.half.push(x);
  if (k.g.half.length < need) return;
  const raw = k.g.half; k.g.half = [];
  let key = alemKey(raw);
  if (raw.length === 3) {
    k.consume('catalyst');
    const rk = alemReactionKey(key);
    if (ALEMBIC.reactions[rk]) {
      key = rk;
      k.stats.reactions = (k.stats.reactions || 0) + 1;
      const known = alemKnown(k);
      if (known && !known.has(rk) && k.env.discover) { k.env.discover(rk); k.fx('discover', { r: rk }); }
    } else { key = alemKey(raw.slice(0, 2)); k.fx('fizzle'); k.wasted('dud reaction'); }
  }
  alemAdd(k, key);
}
// shield amount for a potency, the way Kit.shield works it out (splash shields go to several allies at once)
function alemShieldAmt(k, pot) {
  return Math.round(pot * ENGINE.POT_SCALE * (1 + (k.def.healMod ? k.def.healMod(k, {}) : 0)) * (1 + (k.gear().power || 0)) * (1 + k.fxMod('heal')));
}
// a splash where the vial lands. o: { r, heal, up, sh, cl, chain, pool: { r, ticks, interval, heal, sh, pct, fol } }
function alemSplash(k, t, o) {
  const ab = alemAb(k), ev = { type: 'splash', target: t, r: o.r || 0, ab };
  if (o.heal) {
    const h = k.healAmount(o.heal, { ab }); ev.amount = h.amount; ev.crit = h.crit;
    if (o.up) ev.up = 1;
    // Scorch: a heal vial landing while the enemy is scorched flicks a spark into it
    if (k.talent('alembist_scorch') && k.now < (k.g.scorchUntil || 0)) k.damage(40, { ab });
  }
  if (o.sh) { ev.sh = alemShieldAmt(k, o.sh); ev.dur = o.sdur || 10; }
  if (o.cl) ev.cl = o.cl;
  if (o.pool) {
    const p = o.pool;
    ev.id = 'v' + (++k.g.n); ev.pr = p.r; ev.ticks = p.ticks; ev.interval = p.interval;
    if (p.heal) ev.pa = k.healAmount(p.heal, { ab }).amount;
    if (p.sh) ev.ps = alemShieldAmt(k, p.sh);
    if (p.pct) ev.pct = p.pct;
    if (p.fol) ev.fol = 1;
  }
  k.env.emit(ev);
  k.itemHook('heal');
  // Chain Splash: a heal vial leaps on to the most hurt ally and splashes there at half strength
  if (o.heal && o.chain !== false && k.talent('alembist_chain') && t !== 'party') {
    const h = k.healAmount(o.heal * 0.5, { ab });
    k.env.emit({ type: 'splash', target: 'lowest', not: typeof t === 'number' ? t : undefined, r: 80, amount: h.amount, crit: h.crit, ab });
    k.fx('leap', { to: typeof t === 'number' ? t : null });
  }
}
// a bomb on the enemy (c.en), or on yourself if it went off in the bandolier (Volatile)
function alemBomb(k, c, pot, dot, dotDur = 9) {
  const ab = alemAb(k);
  if (c.self) { if (k.def.alem.fuse && !k.talent('alembist_spill')) k.selfDamage(0.04, { ab }); return; }
  if (!c.en) { k.wasted('bomb'); return; }   // nothing in reach: it shatters on the floor
  k.engagedAt = k.now;
  k.damage(pot, { ab });
  if (dot) k.dot('burn', dot, dotDur, 3, { ab });
  if (k.talent('alembist_ricochet') && k.now >= (k.g.ricoAt || 0)) { k.g.ricoAt = k.now + 15; k.after(1, () => { k.damage(pot * 0.25, { ab }); k.fx('ricochet'); }); }
  if (k.talent('alembist_scorch')) k.g.scorchUntil = k.now + 10;
}
function alemRaise(k, c) {
  if (typeof c.t !== 'number' || !k.env.isDead(c.t) || k.now < k.g.raiseAt) return;
  k.g.raiseAt = k.now + ALEMBIC.RAISE_CD;
  k.raise(c.t, { ab: alemAb(k) });
}
// one recipe going off. c: { t (ally it lands on, or 'self'), en (enemy, for bombs), self }, m: strength
function alemRecipe(k, key, c, m) {
  const t = c.t;
  switch (key) {
    case 'DD': alemSplash(k, t, { r: 110, heal: 480 * m }); alemRaise(k, c); break;
    case 'EE': alemBomb(k, c, 360 * m, 0); break;
    case 'SS': alemSplash(k, t, { pool: { r: 120, ticks: 12, interval: 6 * m / 12, pct: 0.2 } }); break;
    case 'DE': alemSplash(k, t, { pool: { r: 120, ticks: 6, interval: 1.5, heal: 80 * m, fol: k.talent('alembist_cling') } }); break;
    case 'DS': alemSplash(k, t, { r: 110, sh: 280 * m, cl: 1 }); break;
    case 'ES': k.partyBuff('haste', 0.1, Math.min(13, 10 * m), { ab: alemAb(k) }); alemSplash(k, t, { r: 110, heal: 100 * m, cl: 2, chain: false }); break;
    case 'QQ': alemSplash(k, t, { pool: { r: 120, ticks: 4, interval: 1.5, sh: 120 * m } }); break;
    case 'DQ': alemSplash(k, t, { r: 110, heal: 400 * m, up: 1 }); alemRaise(k, c); break;
    case 'EQ': alemBomb(k, c, 260 * m, 0); if (!c.self && c.en) k.after(1, () => { k.damage(260 * m, { ab: alemAb(k) }); k.fx('ricochet'); }); break;
    // Reactions
    case 'EEE': alemBomb(k, c, 560 * m, 70 * m, 12); break;
    case 'DDD': alemSplash(k, t, { r: 150, heal: 620 * m, pool: { r: 150, ticks: 4, interval: 1.5, heal: 60 * m } }); alemRaise(k, c); break;
    case 'SSS': alemSplash(k, t, { pool: { r: 160, ticks: 12, interval: 8 * m / 12, pct: 0.25 } }); break;
    case 'DES': alemSplash(k, 'party', { heal: 300 * m, sh: 180 * m, chain: false }); break;
    case 'DEE': alemBomb(k, c, 360 * m, 0); alemSplash(k, t, { pool: { r: 130, ticks: 6, interval: 1.5, heal: 70 * m, fol: k.talent('alembist_cling') } }); break;
    case 'DDS': alemSplash(k, t, { r: 130, sh: 400 * m, cl: 3, pool: { r: 130, ticks: 4, interval: 1.5, heal: 50 * m } }); break;
    case 'EES': k.partyBuff('haste', 0.15, Math.min(15, 12 * m), { ab: alemAb(k) }); alemBomb(k, c, 220 * m, 0); break;
  }
}
// a vial going off: each part of a Grand Blend in turn, then Residue's puddle where it broke on an ally
function alemGoOff(k, v, c, m) {
  if (v.parts) { const share = k.talent('alembist_reserve') ? 1 : 0.8; for (const p of v.parts) alemRecipe(k, p.r, c, p.m * share * m); }
  else alemRecipe(k, v.r, c, m);
  if (!c.self && k.talent('alembist_residue') && !(v.parts ? v.parts.every(p => alemInfo(p.r).kind === 'bomb') : alemIsBomb(v))) alemSplash(k, c.t, { pool: { r: 70, ticks: 4, interval: 1.5, heal: 28 } });
  k.stats.vials = (k.stats.vials || 0) + 1;
}
// throw a vial (or let it go off on you: self). The look goes to every client now; the effect lands after the flight.
function alemLaunch(k, v, t, en, m, self) {
  k.fx('vial', { r: v.r, p: v.parts ? v.parts.map(p => p.r) : undefined, to: self ? null : t, en: self || !en ? null : en.id, self: self ? 1 : 0, m: +m.toFixed(2), fol: k.talent('alembist_cling') ? 1 : 0 });
  const c = { t: self ? 'self' : t, en: self ? null : en, self: !!self };
  if (self) alemGoOff(k, v, c, m); else k.after(ALEMBIC.FLIGHT, () => alemGoOff(k, v, c, m));
}
// the reagent button (Q W E): usable while there's room in the bandolier
function alemReagentAb(id, x, name, glow, desc) {
  return {
    id, name, type: 'gcd', target: 'none', anim: 'cast', lock: 0.3, reagent: x,
    recastGcd: k => (k.has('distill') ? 0.2 : 0.75),
    usable: k => k.g.vials.length < k.def.alem.slots,
    glow, desc,
    effect(k) { alemReagent(k, this, x); },
    fx: { color: ALEMBIC.reagents[x].color },
  };
}
// the glows for a mashable floor: keep one heal vial stocked (Dew), otherwise brew bombs (Ember), throw what's ripe
const alemRoom = k => k.g.vials.length < k.def.alem.slots;
const alemHealStock = k => k.g.vials.filter(alemIsHeal).length;
const alemOldestReady = k => {
  const i = alemPick(k); if (i < 0) return false;
  const v = k.g.vials[i];
  return alemStrength(k, v) >= 1 + ALEMBIC.GROW - 0.001 || !alemRoom(k) || (v.fuse && v.fuse - k.now < 2) || (!v.fuse && !v.keep && alemSpoilTime(k) - (k.now - v.born) < 5);
};

KITS.alembist = {
  potMult: 0.74, // balance knob (tools/simulate.js)
  auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'bandolier', key: 'count', max: 3, label: 'Bandolier', w: 200 },
  alem: { slots: 3, ripe: 10, spoil: 40 },
  init: () => ({ half: [], vials: [], count: 0, sel: 0, n: 0, last: null, raiseAt: 0, popAt: -9, popR: null }),
  tick(k) {
    const A = k.def.alem;
    for (const v of [...k.g.vials]) {
      if (v.fuse && k.now >= v.fuse) {
        // the fuse runs out in the bandolier: it goes off on you, weaker (Spill: at full strength)
        k.g.vials.splice(k.g.vials.indexOf(v), 1);
        k.stats.fused = (k.stats.fused || 0) + 1;
        alemLaunch(k, v, null, null, alemStrength(k, v) * (k.talent('alembist_spill') ? 1 : 0.6), true);
      } else if (!v.fuse && !v.keep && k.now - v.born >= alemSpoilTime(k)) {
        k.g.vials.splice(k.g.vials.indexOf(v), 1);
        k.wasted('spoiled');
        if (k.talent('alembist_spill')) alemLaunch(k, v, null, null, 0.5, true); else k.fx('spoil', { r: v.r });
      }
    }
    k.g.count = k.g.vials.length;
    // Flask Armour: a full bandolier is armour
    if (k.talent('alembist_flask') && k.g.vials.length >= A.slots && k.now >= (k.g.armorAt || 0)) { k.g.armorAt = k.now + 1; k.mitigate('self', 0.1, 1.2, { ab: alemAb(k) }); }
  },
  // Apothecary: Shift+R moves the pick along the bandolier instead of throwing (main.js asks before a press)
  shiftPress(k, i) {
    if (i !== 3 || !k.def.alem.pick) return false;
    if (k.g.vials.length > 1) k.g.sel = ((k.g.sel | 0) + 1) % k.g.vials.length;
    return true;
  },
  signature: 'Brewing ahead',
  floor: 'Press W twice to brew a Mending Draught, then R to throw it at whoever is hurt. Brew Fire Bombs with Q when everyone is healthy.',
  ceiling: [
    'Two reagents make a vial: Dew + Dew heals, Ember + Ember bombs, Salt + Salt wards, Ember + Dew steams, Dew + Salt shields and cleanses, Ember + Salt hastens the party.',
    'Vials grow 30% stronger over their first 10s and spoil at 40s. Brew in the quiet, throw ripe vials into the storm.',
    'Throw takes the oldest vial, so the order you brew in is the order you throw in. Plan two moves ahead.',
    'A splash catches everyone near the ally it lands on: aim at the middle of the group.',
  ],
  abilities: [
    alemReagentAb('ember', 'E', 'Ember', k => alemRoom(k) && (k.g.half[0] === 'E' || (!k.g.half.length && alemHealStock(k) >= 1)),
      'A quick reagent (0.75s). Two reagents brew a vial: Ember + Ember is a Fire Bomb, Ember + Dew is Steam, Ember + Salt is Quickpowder.'),
    alemReagentAb('dew', 'D', 'Dew', k => alemRoom(k) && (k.g.half[0] === 'D' || (!k.g.half.length && alemHealStock(k) < 1)),
      'A quick reagent (0.75s). Two reagents brew a vial: Dew + Dew is a Mending Draught, Dew + Ember is Steam, Dew + Salt is Salve.'),
    alemReagentAb('salt', 'S', 'Salt', null,
      'A quick reagent (0.75s). Two reagents brew a vial: Salt + Salt is a Salt Ward, Salt + Dew is Salve, Salt + Ember is Quickpowder.'),
    {
      id: 'throw', name: 'Throw', type: 'gcd', target: 'ally', allowDead: true, anim: 'cast', lock: 0.35, recastGcd: 1,
      label: k => { const i = alemPick(k); return i < 0 ? 'Throw' : alemInfo(k.g.vials[i].r).name; },
      usable: k => k.g.vials.length > 0,
      glow: k => alemOldestReady(k),
      desc: 'Throw your oldest vial at your heal target: it shatters and splashes everyone close by. A bomb flies at the enemy instead. Vials grow 30% stronger over 10s, and spoil after 40s.',
      effect(k, t) {
        const i = alemPick(k); if (i < 0) return;
        const v = k.g.vials.splice(i, 1)[0];
        k.g.sel = 0; k.g.count = k.g.vials.length;
        const en = alemIsBomb(v) ? k.env.target({ target: 'enemy', range: RANGED }) : null;
        alemLaunch(k, v, t, en, alemStrength(k, v), false);
      },
      fx: { color: '#ffd27a' },
    },
    {
      id: 'distill', name: 'Distill', type: 'ogcd', target: 'self', cd: 30, anim: 'cast', lock: 0.3,
      desc: 'Your next brew is instant: your next two reagents come off the global cooldown at once.',
      effect(k) {
        k.buff('distill', 15, {}, 2, 2);
        if (k.talent('alembist_flash') && k.g.last) alemAdd(k, k.g.last, { copy: true });
        if (k.talent('alembist_fume')) k.mitigate('party', 0.1, 8, { ab: this });
      },
      fx: { color: '#bfe8ec' },
    },
    {
      id: 'batch', name: 'Grand Batch', type: 'ogcd', target: 'self', cd: 120, anim: 'big', lock: 0.3,
      desc: 'Fill every empty slot in your bandolier with copies of the last vial you brewed.',
      usable: k => !!k.g.last && alemRoom(k),
      effect(k) { while (alemAdd(k, k.g.last, { copy: true, batch: true })); },
      fx: { color: '#ffb84a' },
    },
  ],
  // moves a talent puts in place of one of the six (talents.js `grants`; engine.js swaps them in)
  talentAbilities: {
    alembist_blend: {
      id: 'blend', replaces: 'batch', icon: 'batch', name: 'Grand Blend', type: 'ogcd', target: 'self', cd: 90, anim: 'big', lock: 0.3, talent: true,
      desc: 'Pour every vial in your bandolier into one Grand Blend. Thrown, it does all of their effects at once where it lands, each at 80% of the strength it had.',
      usable: k => k.g.vials.length >= 2,
      effect(k) {
        const parts = [];
        for (const v of k.g.vials) { if (v.parts) parts.push(...v.parts); else parts.push({ r: v.r, m: alemStrength(k, v) }); }
        const v = { r: 'BL', parts, at: k.now, born: k.now, id: ++k.g.n, keep: true };
        if (k.def.alem.fuse) v.fuse = k.now + k.def.alem.fuse + (k.talent('alembist_cask') ? 2 : 0);
        k.g.vials = [v]; k.g.sel = 0; k.g.count = 1;
        k.g.popAt = k.now; k.g.popR = 'BL';
        k.fx('brew', { r: 'BL' });
      },
      fx: { color: '#ffe0a8' },
    },
    alembist_quicksilver: Object.assign(alemReagentAb('quicksilver', 'Q', 'Quicksilver', null,
      'A quick reagent (0.75s) that takes Salt\'s place. Quicksilver + Quicksilver is a Silver Mirror, Quicksilver + Dew a Silver Tonic, Quicksilver + Ember a Fulminate.'),
    { replaces: 'salt', icon: 'salt', talent: true }),
  },
};

if (typeof module !== 'undefined') {
  module.exports = { KITS, DASH, TAUNT, tauntAbility, tauntIconBg, MELEE, RANGED, bastionChain, bastionEdge, reaverDrainPot, reaverLetting, runeGain, runeGlyphguard, runeGlyphguardEnd,
    rangerShot, rangerFocus, rangerKeen, rangerRhythm, rangerPierce, bladeFinisher, bladeStep, pyroBurst, clericDawnstar, clericPetal, groveThornTick,
    groveGrowth, chronoBolt, chronoBoltAfter, chronoInstant, chronoAccel };
  // Alembist (classes-b)
  Object.assign(module.exports, { ALEMBIC, alemKey, alemReactionKey, alemInfo, alemIsBomb, alemIsHeal, alemKnown, alemBook, alemSavedKnown, alemRipeTime,
    alemSpoilTime, alemStrength, alemAb, alemPick, alemAdd, alemReagent, alemShieldAmt, alemSplash, alemBomb, alemRaise, alemRecipe, alemGoOff, alemLaunch,
    alemReagentAb, alemRoom, alemHealStock, alemOldestReady });
}

