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
    onNotify(k, type, d) {
      if (type === 'perfect') {
        bastionGain(k, 20 + (bastionInHallow(k) ? 10 : 0) + (k.has('banner') ? BASTION.BANNER_PB : 0));
        k.g.counter = 1;
        bastionTurned(k, d);
        if (k.perk('bastion_a2')) k.shield('self', 260, 6);
        if (k.talent('bastion_sunlit')) { k.damage(40, { ab: k.abById('brace') }); k.fx('sunlit'); }
        bastionPerfect(k);
        k.ultGain(4.5);   // (Last Bastion: ULTIMATES below)
        k.stats.perfects = (k.stats.perfects || 0) + 1;
        k.fx('perfect');
      }
    },
    tick: k => { bastionTick(k); bastionUltHits(k); },
    signature: 'Perfect Block',
    floor: 'Press Q for the combo, W when it glows. Press E right before the boss hits you, and F in an emergency.',
    ceiling: [
      'Perfect Blocks: Brace just before a hit lands (watch the boss wind up its swing) for +20 Resolve and a counterattack. Two charges, and the boss swings every 2.8s, so pick your moments.',
      'Pool Resolve near 100 before Oath of Valor: Judgment gives double Resolve during it, so Holy Edges chain.',
      'Never overcap Resolve. Spend it when it reaches 90 outside burst.',
      'A Perfect Block on a tankbuster turns it aside: the Brace charge comes straight back and your next Holy Edge is free. Brace glows as one is about to land.',
      'Rally Banner takes up to 50 Resolve: the more you put in, the more the party is spared, and every Perfect Block under it pays 10 back. Plant it on the fight\'s raidwides with Resolve to spare, not on the eve of Oath of Valor.',
    ],
    abilities: [
      {
        id: 'blade', name: 'Blade Chain', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Three-hit combo on one button: Strike ({d:220}) > Riposte ({d:300}) > Judgment ({d:400}). Judgment fills 25 Resolve.',
        label: k => ['Strike', 'Riposte', 'Judgment'][k.now < k.g.comboUntil ? k.g.step : 0],
        fxStep: k => (k.now < k.g.comboUntil ? k.g.step : 0),   // (its look: engine.js resolve)
        glow: k => !!k.g.counter,
        effect(k) { bastionBlade(k, this, 25); },
        fx: { type: 'slash', color: '#bcd4ff', r: 52, span: 1.5 },
      },
      {
        id: 'edge', name: 'Holy Edge', type: 'gcd', target: 'enemy', range: 260, anim: 'bash',
        desc: 'Spend 50 Resolve: a radiant blade you can throw from range for {d:560}. Heals you for {h:120}. Free after a Perfect Block on a tankbuster.',
        usable: k => bastionCanEdge(k),
        glow: k => k.g.resolve >= 90 || (k.has('oath') && k.g.resolve >= 50) || k.has('turned'),
        effect(k) {
          bastionSpend(k);
          const pot = k.has('oath') ? 720 : 560;
          k.damage(pot, { ab: this });
          if (k.perk('bastion_w2')) { k.damage(pot * 0.4, { ab: this }); k.fx('empower'); }
          bastionEdge(k, this, pot);
        },
        fx: { type: 'projectile', color: '#ffe9a0', range: 260, speed: 900 },
      },
      {
        id: 'brace', name: 'Brace', type: 'ogcd', target: 'self', charges: 2, cd: 7, lock: 0.5, anim: 'brace',
        desc: 'Raise your shield: 25% less damage for 3s. Brace just before a hit lands for a Perfect Block. A Perfect Block on a tankbuster gives the charge straight back and makes your next Holy Edge free.',
        glow: k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft < 0.8); },   // (a tankbuster about to land: the block worth most)
        // (a guard Hold Fast stretched past 3s tells its look how long it really holds: KIT_VFX.braceHold)
        effect(k) { const d = bastionBraceDur(k); k.mitigate('self', 0.25, d, { kind: 'brace', ab: this }); if (d !== 3) k.fx('braceHold', { d: Math.round(d * 10) / 10 }); },
        fx: { type: 'shield', color: '#7fb2ff', dur: 1.2 },
      },
      {
        id: 'oath', name: 'Oath of Valor', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 15s of +10% damage. Judgment grants double Resolve and Holy Edge hits for {d:720} instead of {d:560}.',
        glow: k => k.g.resolve >= 50,
        effect(k) { k.buff('oath', 15); },
        fx: { type: 'aura', color: '#ffd65a', r: 38, dur: 2 },
      },
      {
        id: 'banner', name: 'Rally Banner', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Plant a banner with up to 50 of your Resolve: the whole party takes 15% less damage for 12s, 1% more for every 5 Resolve you put in (25% at 50). While it stands, every Perfect Block gives 10 more Resolve.',
        effect(k) { bastionBanner(k, this); },
        fx: { type: 'zone', style: 'banner', color: '#f2c84b', r: 150, range: 0, dur: 3 },
      },
      {
        id: 'bulwark', name: 'Bulwark', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
        desc: 'Big cooldown: 40% less damage for 10s, and Brace\'s charges refill.',
        effect(k) { k.mitigate('self', k.perk('bastion_a4') ? 0.5 : 0.4, 10, { ab: this }); k.refill('brace'); if (k.perk('bastion_w3')) k.shield('party', 160, 8, { ab: this }); bastionGuard(k, this); },
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
    tick: k => { tankUltHits(k, 6); reaverTick(k); },   // (Crimson Eclipse: ULTIMATES; the bank and Undying's Blood)
    signature: 'Crimson Drain timing',
    floor: 'Press Q for the combo, W when it glows. R every minute, D before big party hits, F when it glows as a tankbuster comes.',
    ceiling: [
      'Blood for blood: Crimson Drain cashes the bank, the damage you took since your last Drain (6s at most, the number under the heart). It heals for 35% of it and hits harder the more it holds. Fire it right after a tankbuster, never just before one.',
      'Strike while the blood is warm: for 1.2s after a tankbuster or raidwide lands your blood is warm (Drain glows), and a Drain then hits much harder and cashes the bank in full. Later the bank has gone cold. With a Drain in hand, hold your GCD for the hit so it is ready the instant it lands.',
      'Pool Blood near 100 before Frenzy, then spread the three free Drains through it so each has a bank behind it. Hold one for a tankbuster that lands inside Frenzy.',
      'Don\'t overcap Blood, but don\'t dump it on a quiet moment either. A Drain on an empty bank is your weakest spend.',
      'War Cry makes your next Drain free and spreads its heal to the party: roar before a tankbuster, Drain after it.',
      'Undying lets you survive a tankbuster with no other cooldown. While it lasts Drains cost nothing and every hit you take fills Blood: the worse the hit, the more you get back.',
    ],
    abilities: [
      {
        id: 'hack', name: 'Hack & Maul', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Two-hit combo on one button: Hack ({d:240}) > Maul ({d:340}). Both hits build Blood.',
        label: k => (k.now < k.g.comboUntil && k.g.step === 1 ? 'Maul' : k.now < k.g.comboUntil && k.g.step === 2 ? 'Gore' : 'Hack'),
        fxStep: k => (k.now < k.g.comboUntil ? k.g.step : 0),   // 0 Hack, 1 Maul, 2 Gore (its look: engine.js resolve)
        effect(k) {
          if (k.now < k.g.comboUntil && k.g.step === 2) {   // Gore (a talent's third hit)
            k.damage(320, { ab: this }); reaverGain(k, 15); k.g.step = 0;
          } else if (k.now < k.g.comboUntil && k.g.step === 1) {
            k.damage(340, { ab: this }); reaverGain(k, 15); k.g.step = 0;
            if (k.talent('bloodreaver_rend')) k.g.wounds = Math.min(3, (k.g.wounds || 0) + 1);
            if (k.talent('bloodreaver_gore')) { k.g.step = 2; k.g.comboUntil = k.now + 15; }
          } else {
            k.damage(240, { ab: this }); reaverGain(k, 10); k.g.step = 1; k.g.comboUntil = k.now + 15;
          }
          reaverHackHeal(k, this);
        },
        fx: { type: 'slash', color: '#ff5a5a', r: 62, span: 2.0 },
      },
      {
        id: 'drain', name: 'Crimson Drain', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Spend 40 Blood: hits for {d:270} and cashes the bank, the damage you took since your last Drain (6s at most): it heals you for 35% of it, and hits up to {d:700} more the more it holds. Within 1.2s of a hit that took a tenth of your HP your blood is warm: {d:340} more. After that the bank has gone cold and its bonus is cut to 30%.',
        usable: k => reaverDrainOk(k),
        glow: k => reaverDrainGlow(k),
        effect(k) {
          let pot = REAVER.POT + reaverDrainCost(k, 120);
          const taken = reaverCash(k);
          pot += Math.min(REAVER.CAP, taken / (REAVER.SLOPE * ENGINE.NUM_SCALE)) * reaverWarm(k);
          pot = reaverDrainPot(k, pot);
          k.damage(pot, { ab: this });
          if (k.perk('bloodreaver_w2')) { k.damage(pot * 0.3, { ab: this }); k.fx('empower'); }
          const heal = k.healRaw('self', Math.max(k.env.maxHp() * 0.08, taken * 0.35), { ab: this });
          reaverAfterDrain(k, this, heal, 0.2);
        },
        fx: { type: 'slash', color: '#ff2d4b', r: 56, span: 1.4 },
      },
      {
        id: 'letting', name: 'Bloodletting', type: 'ogcd', target: 'enemy', range: MELEE, charges: 2, cd: 15, anim: 'attack',
        desc: 'Quick slash between attacks: {d:220} and +20 Blood. Two charges.',
        glow: k => k.charges(k.abById('letting')) === 2,
        effect(k) { k.damage(220 * reaverRetaliate(k), { ab: this }); reaverGain(k, k.perk('bloodreaver_w1') ? 30 : 20); if (k.perk('bloodreaver_a4')) k.healRaw('self', k.env.maxHp() * 0.05, { ab: this }); reaverLetting(k, this); },
        fx: { type: 'slash', color: '#ff7a7a', r: 46, span: 1.2 },
      },
      {
        id: 'frenzy', name: 'Frenzy', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 12s of +15% damage, and your next three Crimson Drains are free and hit for {d:120} more.',
        effect(k) {
          k.buff('frenzy', 12); k.buff('gorge', 12, {}, 3, 3); if (k.perk('bloodreaver_w3')) k.gain('blood', 30);
          if (k.talent('bloodreaver_frenzied')) { const l = k.abilities.find(a => k.baseId(a) === 'letting'); if (l) k.refill(l.id); }
        },
        fx: { type: 'aura', color: '#ff2020', r: 40, dur: 2.5 },
      },
      {
        id: 'warcry', name: 'War Cry', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
        desc: 'Roar: shields the whole party for {s:300} for 15s. Your next Crimson Drain in that time costs no Blood, and the party heals for a quarter of what it heals you.',
        effect(k) {
          k.shield('party', 300, 15, { ab: this }); if (k.perk('bloodreaver_a2')) k.healRaw('self', k.env.maxHp() * 0.1, { ab: this });
          k.buff('roar', 15);
        },
        fx: { type: 'ring', color: '#ff9a7a', r: 160 },
      },
      {
        id: 'undying', name: 'Undying', type: 'ogcd', target: 'self', cd: 150, anim: 'big',
        desc: 'For 8s you cannot drop below 1 HP, and every heal and shield you give is doubled. While it lasts Crimson Drain costs no Blood, and every hit you take fills Blood: 10 for every 10% of your HP it takes.',
        glow: k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft < 1.5); },
        effect(k) { k.mitigate('self', 0, 8, { kind: 'living', ab: this }); k.buff('undying', 8); k.buff('deathless', 8); k.g.dlSeen = 0; },
        fx: { type: 'aura', color: '#8a0010', r: 36, dur: 3 },
      },
    ],
    // a scab coming off gives back what was left of it; Blood Moon setting and Bloodlust (talents)
    onNotify(k, type, d) {
      if (type === 'shieldEnd' && d.tag === 'scab') { const back = Math.round(30 * (1 - Math.max(0, Math.min(1, d.frac || 0)))); if (back > 0) reaverGain(k, back); }
      // Pain Is Fuel (Berserker, spec row VI): a heavy hit on you pours Rage into you
      if (type === 'taken' && k.talent('bloodreaver_painfuel') && d.a >= k.env.maxHp() * 0.1 && k.now >= (k.g.fuelAt || 0)) { k.g.fuelAt = k.now + 1.2; reaverGain(k, 15); k.fx('secondHelping'); }
    },
    onExpire(k, id, b) { reaverExpire(k, id, b); },
  },

  runeguard: {
    potMult: 0.65, // balance knob (tools/simulate.js)
    auto: { kind: 'runebash', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY); a rune-shield bash (AUTO_VFX.runebash)
    gauge: { kind: 'runes', key: 'runes', max: 3, label: 'Runes' },
    init: () => ({ runes: 0 }),
    dmgMod: k => (k.has('overload') ? 0.1 : 0),
    tick: k => runeTick(k),   // (Foreseen Ward: the spec row VI talent)
    onNotify(k, type, d) {
      if (type === 'shieldEnd' && d.tag === 'ward') {
        k.g.selfWard = false;
        runeWardEnd(k, d, k.talent('runeguard_reclaim') ? 0.5 : 0.999, 0.95);
      }
      if (type === 'shieldEnd' && d.tag === 'gward') runeGlyphguardEnd(k, d);
      if (type === 'reflect') {
        k.damage(1500, { ab: k.abById('mirror') }); k.fx('reflect'); k.ultGain(5);   // (Runic Cataclysm)
        if (k.talent('runeguard_shards')) { for (let i = 0; i < 3; i++) k.damage(150, { ab: k.abById('mirror') }); k.fx('mirrorShards'); }
        if (k.talent('runeguard_answer')) k.buff('answer', 15);
        if (k.talent('runeguard_counter')) { k.buff('counter', 10); k.fx('empower'); }   // (Counterstroke, Runeblade spec row VII)
        if (d.b) { runeGain(k, k.abById('mirror') || abBase(k, 'mirror'), 1); k.fx('mirrorRune'); }   // a reflected tankbuster carves a Rune
      }
    },
    signature: 'Ward breaks',
    floor: 'Press Q to build Runes, W to shield yourself, E when you have 3 Runes. R for burst, D and F for big hits.',
    ceiling: [
      'A Ward explodes when it ends. The more damage it absorbed, the bigger the blast, and a fully broken Ward refunds its Rune. Put Wards up right before tankbusters and raidwides.',
      'Ward or Glyph Burst? Every Rune is a choice between defence-that-becomes-damage and raw damage now.',
      'Mirror Aegis reflects the next hit for a {d:1500} counter, and a reflected tankbuster carves a Rune. A mirrored buster barely touches your Ward, so that Ward won\'t refund: the mirror pays its Rune instead.',
      'Sanctum sanctifies the next Ward you raise: it keeps its Rune however little it soaks, and its blast heals the party. Spend it on the Ward a raidwide won\'t break all the way.',
      'Pool 3 Runes before Runic Overload; Wards also explode 50% harder during it, and one broken all the way gives an extra Rune.',
    ],
    abilities: [
      {
        id: 'strike', name: 'Rune Strike', type: 'gcd', target: 'enemy', range: MELEE, anim: 'cast',
        desc: 'Strike with a rune-etched gauntlet: {d:270} and +1 Rune (+2 during Runic Overload).',
        effect(k) {
          k.damage(270, { ab: this });
          const extra = k.perk('runeguard_w1') && k.rng() < 0.25 ? 1 : 0;
          runeGain(k, this, (k.has('overload') ? 2 : 1) + extra);
          if (extra) k.fx('empower');
        },
        fx: { type: 'projectile', color: '#b18cff', range: 200, speed: 1200 },
      },
      {
        id: 'ward', name: 'Runic Ward', type: 'gcd', target: 'self', anim: 'cast',
        desc: 'Spend 1 Rune: shield yourself for {s:650} for 8s. It explodes when it ends, for {d:150} up to {d:600} the more it absorbed.',
        usable: k => k.g.runes >= 1 || runeEmergency(k) || k.has('foreseen'),
        glow: k => runeWardGlow(k),
        effect(k) { runeWardCost(k); runeWardUp(k, this, 'self'); k.g.wardAmt = k.shield('self', k.perk('runeguard_a2') ? 812 : 650, k.perk('runeguard_a4') ? 12 : 8, { ab: this, tag: 'ward' }); k.g.selfWard = true; },
        fx: { type: 'aura', style: 'hex', color: '#9fd8ff', r: 32, dur: 2 },
      },
      {
        id: 'glyph', name: 'Glyph Burst', type: 'gcd', target: 'enemy', range: 260, anim: 'cast',
        desc: 'Spend 3 Runes: detonate a glyph on the target for {d:830}.',
        usable: k => k.g.runes >= 3,
        glow: k => k.g.runes >= 3,
        effect(k) {
          k.spend('runes', 3); const pot = k.has('overload') ? 1080 : 830; k.damage(pot, { ab: this }); if (k.perk('runeguard_w2')) k.gain('runes', 1, 3);
          runeGlyph(k, this, pot);
        },
        fx: { type: 'zone', style: 'vortex', color: '#7a55e8', r: 70, range: 260, dur: 0.8 },
      },
      {
        id: 'overload', name: 'Runic Overload', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: 15s of +10% damage. Rune Strike gives 2 Runes, Glyph Burst hits for {d:1080} instead of {d:830}, Ward blasts hit 50% harder, and a Ward broken all the way gives 1 more Rune.',
        effect(k) {
          k.buff('overload', 15); if (k.perk('runeguard_w3')) k.gain('runes', 2, 3);
          runeSurge(k, this);
        },
        fx: { type: 'aura', color: '#b18cff', r: 40, dur: 2 },
      },
      {
        id: 'sanctum', name: 'Sanctum', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Draw a sanctum: the whole party takes 15% less damage for 10s. The next Runic Ward you raise inside it is sanctified: it gives its Rune back however much it absorbed, and when it ends its blast heals the whole party for a third of what it absorbed.',
        effect(k) { k.mitigate('party', 0.15, 10, { ab: this }); k.buff('sanctified', 10); },
        fx: { type: 'zone', style: 'clock', color: '#9f7aff', r: 150, range: 0, dur: 3 },
      },
      {
        id: 'mirror', name: 'Mirror Aegis', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
        desc: 'For 3s, the next hit you take is reduced by 80% and reflected back for {d:1500}. A reflected tankbuster also carves a Rune.',
        glow: k => runeMirrorGlow(k),
        effect(k) { k.mitigate('self', 0.8, castHold(k, k.talent('runeguard_patient'), 3, 8), { kind: 'reflect', ab: this }); },
        fx: { type: 'shield', color: '#e0d4ff', dur: 2 },
      },
    ],
  },

  // ======================================================================= DPS
  ranger: {
    potMult: 0.86, // balance knob (tools/simulate.js)
    auto: { kind: 'shot', potency: 40, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'quiver', key: 'focus', max: 100, label: 'Focus' },
    init: () => ({ focus: 0 }),
    critMod: k => (k.has('markself') ? 0.1 : 0),
    tick: k => rangerTrack(k),
    signature: 'Keen Eye procs',
    floor: 'Press Q, press W when it glows, E when Focus is full. R and F together every minute.',
    ceiling: [
      'Quick Shot can light up Keen Eye: your next Piercing Arrow hits harder and doesn\'t use a charge. You can bank two; a third is wasted. Inside Hunter\'s Mark, cash a Keen Eye only while a second is banked: each one readies Barrage again.',
      'Never sit on 2 Piercing Arrow charges: a full charge bar is lost damage.',
      'Rapid Fire costs half inside Hunter\'s Mark and hits more than twice as hard, so pool Focus to 100 before it (without overcapping) and spend it all in the Mark. Hunter\'s Cloak gives 40 Focus: a Cloak just before the Mark or Starfall Volley is never wasted.',
      'Everything is instant, so you never have to stop attacking to dodge. Perfect uptime is your edge.',
    ],
    abilities: [
      {
        id: 'quick', name: 'Quick Shot', type: 'gcd', target: 'enemy', range: RANGED, anim: 'attack',
        desc: 'Fast shot: {d:230} and +10 Focus. Sometimes lights up Keen Eye.',
        effect(k) {
          const barr = k.consume('barrage'), ff = !barr && rangerFocusFire(k);
          const r = k.damage((barr ? 840 : 230) * (ff ? 2 : 1), rangerShot(k, this));
          if (!ff) k.gain('focus', rangerFocus(k, barr));
          if (k.rng() < rangerKeenChance(k)) rangerKeen(k); else rangerNoKeen(k);
          rangerRhythm(k, this, barr, 230);
          rangerQuickAfter(k, this, r);
        },
        fx: { type: 'line', color: '#fff2b0', range: 380 },
      },
      {
        id: 'pierce', name: 'Piercing Arrow', type: 'gcd', target: 'enemy', range: RANGED, charges: 2, cd: 12, anim: 'attack',
        desc: 'Piercing shot for {d:340}, two charges. With Keen Eye it hits for {d:500} and gives the charge back. Keen Eye banks up to two procs.',
        glow: k => k.has('keen') || k.charges(k.abById('pierce')) === 2,
        effect(k) {
          const keen = k.consume('keen');
          let r;
          if (keen) {
            r = k.damage(500, { ab: this }); k.refundCharge('pierce');
            if (k.perk('ranger_w2')) { k.damage(250, { ab: this }); k.fx('empower'); }
          }
          else r = k.damage(340, { ab: this });
          rangerPierce(k, keen, r, keen ? 500 : 340);
        },
        fx: { type: 'line', color: '#ffd27a', range: 440 },
      },
      {
        id: 'rapid', name: 'Rapid Fire', type: 'ogcd', target: 'enemy', range: RANGED, cd: 2, anim: 'attack',
        desc: 'Spend 50 Focus: a volley for {d:360} between your other shots. While Hunter\'s Mark is up it costs only 25 Focus and hits for {d:760}: Focus pooled for the Mark is worth far more.',
        usable: k => k.g.focus >= rangerRapidCost(k),
        glow: k => k.g.focus >= 90 || (k.has('markself') && k.g.focus >= 25),
        effect(k) {
          k.spend('focus', rangerRapidCost(k));
          k.damage((k.has('markself') ? 760 : 360) * (k.perk('ranger_a4') ? 1.15 : 1), { ab: this }); if (k.perk('ranger_a2')) k.gain('focus', 10);
        },
        fx: { type: 'zone', style: 'arrows', color: '#e8d9a0', r: 60, range: RANGED, dur: 0.9 },
      },
      {
        id: 'mark', name: "Hunter's Mark", type: 'ogcd', target: 'enemy', range: RANGED, cd: 60, anim: 'cast',
        desc: 'Party burst: the boss takes 8% more damage from everyone for 15s. For you, Keen Eye triggers more often, your critical chance is 10% higher and Rapid Fire costs only 25 Focus and hits for {d:760}. A Keen Eye you cash in it while a second is still banked readies Barrage again.',
        effect(k) {
          const dur = 15 + (k.talent('ranger_longhunt') ? 3 : 0);
          k.debuffTarget('vuln', 0.08, dur, { ab: this }); k.buff('markself', dur);
          rangerMark(k, this, dur);
        },
        fx: { type: 'ring', style: 'mark', color: '#ff9d3d', r: 46, range: RANGED },
      },
      {
        id: 'cloak', name: "Hunter's Cloak", type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'The whole party takes 10% less damage for 10s, and you gain 40 Focus.',
        effect(k) { k.mitigate('party', 0.1, 10, { ab: this }); k.buff('cloaked', 10); k.gain('focus', 40); if (k.talent('ranger_disengage')) kitMove(k, 'back', { d: 150 }); },   // (cloaked: Starfall Volley's mending)
        fx: { type: 'ring', color: '#9fdc8a', r: 150 },
      },
      {
        id: 'barrage', name: 'Barrage', type: 'ogcd', target: 'self', cd: 30, anim: 'big',
        desc: 'Your next Quick Shot fires three times ({d:840}) and gives triple Focus.',
        glow: k => k.has('markself') || k.cdRemaining(k.abById('mark')) > 25,   // (in the Mark, or when the Mark is far enough off that it comes back in time)
        effect(k) {
          k.buff('barrage', 15); if (k.perk('ranger_w3')) k.proc('keen', 15);
        },
        fx: { type: 'aura', color: '#ffe27a', r: 30, dur: 1 },
      },
    ],
  },

  shadowblade: {
    potMult: 1.017, // balance knob (tools/simulate.js)
    auto: { kind: 'stab', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'moon', key: 'combo', max: 5, label: 'Combo' },
    init: () => ({ combo: 0 }),
    haste: k => (k.has('dance') ? 0.8 : 1),
    positionalAlways: k => k.has('dance'),
    tick: k => bladeTick(k),   // (spec rows VI-VII: Curtain Call, Eye of the Storm)
    signature: 'Positionals',
    floor: 'Press Q to build combo points, W to spend them. Stand behind the boss. D when its button glows.',
    ceiling: [
      'Strike from behind gives 2 combo points instead of 1. Eviscerate from the side hits harder. The boss turns to face the tank, so plan where you\'ll stand through each mechanic.',
      'Eviscerate at 5 points gets a big bonus, but a sixth point is wasted. Spend at 4 when you\'re behind (Strike would give 2).',
      'Shadowstep teleports you behind the boss and makes your next hits count as positionals. Use it when a mechanic pushes you to the wrong side.',
      'Refresh Venom Blade in its last 7s: that much carries over, anything more is lost. Shadow Dance speeds up your attacks and makes every positional land; enter it at 5 points and your first Eviscerate in it keeps them.',
      'Smoke Bomb covers the party and makes every hit a positional for 10s; thrown inside Shadow Dance it also stretches the Dance by 3s.',
    ],
    abilities: [
      {
        id: 'strike', name: 'Strike', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Stab: {d:220} and +1 combo point. From behind: {d:280} and +2 points.',
        effect(k) {
          const r = k.damage(220, { ab: this, positional: 'rear', posBonus: 60 });
          let n = r.posHit ? 2 : 1;
          if (k.def.spec === 'bladedancer' && k.talent('shadowblade_feint')) n = Math.min(n, Math.max(0, 5 - k.g.combo));   // (Feint, Bladedancer: a Strike never spills a point)
          bladeCombo(k, n);
          if (!r.posHit && k.talent('shadowblade_feint') && k.env.positional() === 'front') { k.buff('feint', 10); k.fx('feint'); }
        },
        fx: { type: 'slash', color: '#d6b3ff', r: 40, span: 1.1 },
      },
      {
        id: 'evis', name: 'Eviscerate', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Spend all combo points: {d:120} plus {d:115} per point, {d:160} more at 5 points, and {d:80} more from the side.',
        usable: k => k.g.combo >= 1,
        glow: k => k.g.combo >= 5 || (k.g.combo >= 4 && k.env.positional() === 'rear'),
        effect(k) {
          const cp = k.g.combo; k.g.combo = 0;
          const mult = bladeMult(k) * (k.has('dance') ? 1.25 : 1);
          const o = bladeOpts(k, this, 'flank', 80, mult), pot = 120 + 115 * cp + (cp >= 5 ? 160 : 0);
          const r = k.damage(pot + (o.feint ? 80 : 0), o), hit = o.feint || r.posHit;
          if (cp >= 5 && k.perk('shadowblade_w2')) { k.damage((120 + 115 * cp + 160 + (hit ? 80 : 0)) * 0.3, { ab: this, mult }); k.fx('empower'); }
          bladeFinisher(k, this, cp, (pot + (hit ? 80 : 0)) * mult);
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
        desc: 'Burst: 10s of faster attacks, every positional lands, and Eviscerate hits 25% harder. Enter it at 5 combo points and the first Eviscerate in it keeps them.',
        effect(k) { bladePoise(k); k.buff('dance', 10); k.g.endless = 0; if (k.perk('shadowblade_w3')) k.gain('combo', 2, 5); },
        fx: { type: 'aura', color: '#b04dff', r: 36, dur: 2 },
      },
      {
        id: 'venom', name: 'Venom Blade', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
        desc: 'Poison the target: {d:140}, then {d:70} every 3s for 24s. While poisoned, Eviscerate hits 15% harder. Refreshing it carries over up to 7s of what was left.',
        glow: k => k.dotRemaining('poison') < 7.2,
        effect(k) { k.damage(140, { ab: this }); k.dot('poison', k.perk('shadowblade_w1') ? 88 : 70, 24, 3, { ab: this }); },
        fx: { type: 'slash', color: '#8aff6a', r: 42, span: 1.0 },
      },
      {
        id: 'smoke', name: 'Smoke Bomb', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'The whole party takes 10% less damage for 10s. Hidden in the smoke, every hit you make counts as a positional for 10s, and a Shadow Dance already running lasts 3s longer.',
        effect(k) {
          k.mitigate('party', 0.1, 10, { ab: this });
          k.buff('truenorth', 10);
          const d = k.buffs.get('dance'); if (d && d.end > k.now) d.end += 3;
        },
        fx: { type: 'zone', color: '#8a7a9a', r: 140, range: 0, dur: 2 },
      },
    ],
  },

  pyromancer: {
    potMult: 0.918, // balance knob (tools/simulate.js)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'crucible', key: 'heat', max: 100, label: 'Heat' },
    init: () => ({ heat: 0 }),
    dmgMod: k => k.g.heat * 0.003 - (k.has('burnt') ? 0.2 : 0),
    critMod: (k, opts) => (opts && opts.ab && ['fireball', 'pyro'].includes(opts.ab.id) ? 0.15 : 0) + (k.has('combust') ? 1 : 0) +
      (opts && opts.ab && opts.ab.id === 'fireball' && !opts.dot && k.perk('pyromancer_w1') ? 0.1 : 0),
    tick(k) {
      if (k.g.heat >= 100 && k.has('smoulder')) k.g.heat = 99;   // (Smolder: it can't boil over)
      if (k.g.heat >= 100) {
        k.g.heat = 0;
        if (k.talent('pyromancer_boil')) { k.damage(220, { ab: abBase(k, 'fireball'), extra: true }); k.fx('flashpoint'); }   // (Boil Over, Cataclysm's spec row VII: it goes out as a blast, not a burn)
        else {
          k.selfDamage(k.perk('pyromancer_a2') ? 0.075 : 0.15);
          k.buff('burnt', 5);
          k.stats.overheats = (k.stats.overheats || 0) + 1;
          k.fx('overheat');
        }
      }
      const dt = k.now - (k.g.lastTick ?? k.now);
      k.g.lastTick = k.now;
      if (dt > 0 && dt < 1 && !k.cast && !k.talent('pyromancer_banked')) k.g.heat = Math.max(0, k.g.heat - 2 * dt);
      pyroTick(k);
    },
    onDamage(k, amt, crit, opts) {
      if (opts.extra || !opts.ab || !['fireball', 'pyro', 'fireblast'].includes(opts.ab.id)) return;   // (a talent's extra hit doesn't feed Hot Streak)
      if (crit && !opts.dot && opts.ab.id === 'fireball' && k.talent('pyromancer_firestarter')) k.dot('firestarter', 40, 6, 3, { ab: opts.ab, extra: true });
      if (crit && !opts.dot) pyroWildfire(k, opts.ab);
      if (crit) {
        if (k.has('heating')) { k.clear('heating'); k.proc('hotstreak', 15); k.ultGain(4); if (opts.ab.id === 'fireblast' && k.talent('pyromancer_cauterize')) k.healRaw('self', k.env.maxHp() * 0.05, { ab: opts.ab }); }
        else if (!k.has('hotstreak')) k.buff('heating', 15);
      } else if (opts.ab.id !== 'fireblast') k.clear('heating');
    },
    signature: 'Heat and Hot Streak',
    floor: 'Press Q to cast, W when it glows (instant). D when Heat is high. R every minute. Don\'t move while casting.',
    ceiling: [
      'Two crits in a row light up Hot Streak: an instant, empowered Pyroblast. Fire Blast always crits and works mid-cast, so use it to turn one crit into Hot Streak on demand.',
      'Heat raises all your damage (+30% at full), but hitting 100 burns you and resets it. Ride high Heat and Vent at 90 or more: White-Hot lights Hot Streak too. A Fire Blast (+6) tops 84 up past 90. While Smolder is up your Heat can\'t boil over, so ride it at 99 through Combustion.',
      'Your instants (Hot Streak Pyroblast, Vent, Fire Blast) are your movement budget. Save one for each mechanic that makes you move, and slidecast: you can start moving in the last half-second of a cast.',
      'Combustion makes every cast crit for 10s, so procs chain, and every Hot Streak Pyroblast in it adds 1s (up to 4s). Enter it with Fire Blast charges ready and high Heat.',
    ],
    abilities: [
      {
        id: 'fireball', name: 'Fireball', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('haze') || k.has('firestep') ? 0 : 1.8),   // (Heat Haze and Firestep, talents, make it instant)
        desc: '1.8s cast: {d:300} and +12 Heat. Crits warm you up toward Hot Streak.',
        effect(k) {
          if (!k.consume('firestep')) k.consume('haze');
          k.damage(300, { ab: this }); k.gain('heat', 12, 100);
          if (k.talent('pyromancer_stoke') && k.dotRemaining('crater') > 0) { k.damage(20, { ab: this, extra: true }); k.fx('twinFlame'); }   // (Stoke the Crater, Cataclysm's spec row VI)
          if (k.talent('pyromancer_bomb') && (k.g.fireballs = (k.g.fireballs || 0) + 1) % 4 === 0) { k.fx('bombPlant'); k.after(3, () => { k.damage(90, { ab: this, extra: true }); k.fx('bomb'); }); }
        },
        fx: { type: 'projectile', style: 'fire', color: '#ff8c2a', range: RANGED, speed: 650 },
      },
      {
        id: 'pyro', name: 'Pyroblast', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('hotstreak') ? 0 : 3.0),
        desc: '3s cast for {d:540}. With Hot Streak it\'s instant and hits for {d:620}.',
        glow: k => k.has('hotstreak'),
        effect(k) {
          const hs = k.consume('hotstreak');
          const pot = hs ? 620 : 540;
          k.damage(pot, { ab: this });
          if (hs && k.perk('pyromancer_w2')) { k.dot('pyroburn', 70, 9, 3, { ab: this }); k.fx('empower'); }
          if (hs) pyroStoke(k);
          if (hs && k.talent('pyromancer_twin')) { const ab = this; k.after(0.35, () => { k.damage(pot * 0.05, { ab, extra: true }); k.fx('twinFlame'); }); }
          if (hs && k.talent('pyromancer_chain') && !k.has('hotstreak') && k.now >= (k.g.chainAt || 0)) { k.g.chainAt = k.now + 15; k.buff('heating', 15); k.fx('chainReact'); }
          k.gain('heat', hs ? 10 : 20, 100);
        },
        fx: { type: 'projectile', style: 'fire', color: '#ff5a1a', range: RANGED, speed: 520 },
      },
      {
        id: 'fireblast', name: 'Fire Blast', type: 'ogcd', target: 'enemy', range: RANGED, charges: 2, cd: 10, duringCast: true, lock: 0.4, anim: 'cast',
        desc: 'Instant blast for {d:160} that always crits, usable even while casting. Two charges.',
        glow: k => k.has('heating'),
        effect(k) {
          if (k.talent('pyromancer_hurry') && k.cast) { k.cast.end = Math.max(k.now + 0.05, k.cast.end - 0.5); k.fx('hurry'); }
          k.damage(160, { ab: this, autoCrit: true });
          // (Cinder Recall, Sigilmancer's spec row VII: out of your Ember Circle, the blast blinks you back to its heart)
          const rc = k.g.circle;
          if (k.talent('pyromancer_recall') && rc && k.now < rc.end && k.env.pos) { const p = k.env.pos(); if (Math.hypot(p.x - rc.x, p.y - rc.y) > rc.r) { kitMove(k, 'point', { x: rc.x, y: rc.y }); k.fx('hurry'); } }
          if (k.talent('pyromancer_flashpoint') && k.g.heat >= 85) { k.g.heat -= 30; k.damage(120, { ab: this, extra: true }); k.fx('flashpoint'); }
          else k.gain('heat', 6, 100);
        },
        fx: { type: 'ring', color: '#ffb03a', r: 40, range: RANGED },
      },
      {
        id: 'combust', name: 'Combustion', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: for 10s everything you cast crits. Every Hot Streak Pyroblast in it makes it burn 1s longer (up to 4s).',
        effect(k) {
          const dur = (k.perk('pyromancer_a4') ? 13 : 10) + (k.talent('pyromancer_longburn') ? 2.5 : 0);
          k.buff('combust', dur); k.g.stoked = 0; if (k.perk('pyromancer_w3')) k.refill('fireblast');
          pyroBurst(k, dur);
        },
        fx: { type: 'aura', color: '#ff7a1a', r: 40, dur: 2 },
      },
      {
        id: 'vent', name: 'Vent', type: 'gcd', target: 'enemy', range: RANGED, cd: 12, anim: 'big',
        desc: 'Instant: release all your Heat as an explosion: {d:150}, plus {d:60} for every 10 Heat. White-Hot: vented at 90 Heat or more, it also lights Hot Streak.',
        usable: k => k.g.heat >= 10,
        glow: k => k.g.heat >= 85,
        effect(k) {
          const h = k.g.heat; k.g.heat = 0; k.damage(150 + 6 * h, { ab: this }); k.ultGain(h / 13);   // (Phoenix Dive)
          pyroVent(k, h);
        },
        fx: { type: 'zone', style: 'meteor', color: '#ff3a1a', r: 80, range: RANGED, dur: 1.1 },
      },
      {
        id: 'smolder', name: 'Smolder', type: 'ogcd', target: 'self', cd: 90, anim: 'cast',
        desc: 'Sap the boss\'s strength: the whole party takes 10% less damage for 10s. While it smoulders your Heat can\'t boil over: it stops at 99 instead of burning you.',
        effect(k) {
          k.mitigate('party', 0.1, 10, { ab: this });
          k.buff('smoulder', 10);   // (pyromancer tick: Heat holds at 99)
        },
        fx: { type: 'zone', style: 'fire', color: '#ff7a1a', r: 120, range: 0, dur: 1.5 },
      },
    ],
  },

  // ======================================================================= HEALERS
  cleric: {
    potMult: 0.87, // balance knob (tools/simulate.js)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'sundial', key: 'petals', max: 3, label: 'Petals' },
    init: () => ({ petals: 2, bloom: 0, petalAt: null }),
    tick(k) {
      const every = 15;
      if (k.g.petalAt === null) k.g.petalAt = k.now + every;
      if (k.now >= k.g.petalAt) { clericGrow(k); k.g.petalAt += every; }
      clericTick(k);
    },
    signature: 'Petal economy',
    floor: 'Press Q to attack. Heal with E (instant) or W. D brings dead allies back. R before big party hits.',
    ceiling: [
      'Dawn Petals are free, instant heals that regrow every 15s. Every third Petal blooms into Dawnstar, an instant attack for {d:950}. Healing with Petals literally turns into damage.',
      'A Petal that grows past 3 blooms by itself onto the most hurt ally: it still counts toward Dawnstar, but you lose the choice of target. Save Dawnstar for the party\'s burst window.',
      'A Mend counts as half a Petal toward Dawnstar, but a whole one when your Petals have run dry. Spend Petals first, then Mend through the gap until the next one grows: Dawnstar stays on time.',
      'Prayer Circle before a raidwide (not after) gives both the mitigation and the regen.',
      'Benediction also Blesses its target (10% more damage for 10s): when nobody needs saving, give it to a damage dealer in the burst.',
    ],
    abilities: [
      {
        id: 'smite', name: 'Smite', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.g.bloom >= 3 || clericInSanctum(k) ? 0 : 1.5),
        label: k => (k.g.bloom >= 3 ? 'Dawnstar' : 'Smite'),
        desc: '1.5s cast attack for {d:280}. After three Dawn Petals (a Mend counts as half) it becomes Dawnstar: instant, for {d:950}.',
        glow: k => k.g.bloom >= 3,
        effect(k) {
          let r;
          if (k.g.bloom >= 3) { k.g.bloom = 0; r = k.damage(950 * clericHeld(k), { ab: this }); k.fx('dawnstar'); if (k.perk('cleric_w2')) k.heal('party', 180, { ab: this }); clericDawnstar(k, this); }
          else r = k.damage(280, { ab: this });
          clericSmite(k, this, r);
        },
        fx: { type: 'projectile', color: '#fff0a8', range: RANGED, speed: 800 },
      },
      {
        id: 'mend', name: 'Mend', type: 'gcd', target: 'ally', anim: 'cast',
        cast: k => (k.has('quickmend') || clericFirstLight(k) ? 0 : 1.8),   // (Quick Mend and First Light, talents)
        desc: '1.8s cast: heals one ally for {h:700}. Counts as half a Petal toward Dawnstar, or a whole one when you have no Petals left.',
        effect(k, t) {
          k.consume('quickmend'); k.heal(t, 700, { ab: this });
          // (Petals run dry: a Mend cast with none in hand counts as a whole Petal toward Dawnstar)
          const dry = k.g.petals < 1; clericBloom(k, dry ? 1 : 0.5); if (dry) k.fx('empower'); clericUltGain(k, 'mend', t);
          if (k.talent('cleric_absolve')) clericAbsolve(k, this, t);   // (Absolution, the Inquisitor's spec row VII)
        },
        fx: { type: 'ring', color: '#fff0a8', r: 40, onTarget: true },
      },
      {
        id: 'petal', name: 'Dawn Petal', type: 'gcd', target: 'ally', anim: 'cast',
        desc: 'Spend a Petal: an instant {h:450} heal plus {h:60} every 3s for 15s. Petals regrow every 15s; one that grows past 3 blooms by itself onto the most hurt ally. Three Petals make Dawnstar.',
        usable: k => k.g.petals >= 1,
        glow: k => k.g.petals >= 3 || (k.g.petals >= 2 && k.g.petalAt - k.now < 4),
        effect(k, t) {
          k.spend('petals', 1);
          k.heal(t, 450, { ab: this });
          k.hot(t, k.perk('cleric_w1') ? 90 : 60, 5, 3, { ab: this, id: 'petal' });
          clericBloom(k, 1);
          clericPetal(k, this, t, 450);
        },
        fx: { type: 'ring', color: '#ffe680', r: 44, onTarget: true },
      },
      {
        id: 'prayer', name: 'Prayer Circle', type: 'ogcd', target: 'self', cd: 60, anim: 'cast',
        desc: 'The party takes 10% less damage for 10s and heals {h:100} every 3s for 15s.',
        effect(k) {
          k.mitigate('party', k.perk('cleric_w3') ? 0.15 : 0.1, 10, { ab: this }); k.hot('party', k.perk('cleric_a4') ? 150 : 100, 5, 3, { ab: this, id: 'prayer' });
        },
        fx: { type: 'zone', style: 'holy', color: '#ffe680', r: 160, range: 0, dur: 3 },
      },
      {
        id: 'intervene', name: 'Intervention', type: 'gcd', target: 'ally', cd: 30, anim: 'big', allowDead: true,
        cast: k => (targetDown(k, 'intervene') ? RAISE_CAST : 2.5),   // (every raise takes RAISE_CAST)
        desc: '5s cast: bring a fallen ally back to life. They rise with Raise Sickness: 15% less damage and healing for 20s, more for every fall this pull. On a living one it is a 2.5s cast that heals them for {h:1200}.',
        glow: k => targetDown(k, 'intervene'),
        effect(k, t) { if (k.env.isDead(t)) k.raise(t, { ab: this }); else k.heal(t, 1200, { ab: this }); },
        fx: { type: 'zone', style: 'pillar', color: '#fff6c8', r: 50, range: 0, dur: 1.6, onTarget: true },
      },
      {
        id: 'bene', name: 'Benediction', type: 'ogcd', target: 'ally', cd: 40, anim: 'big', allyBuff: 'blessed',
        desc: 'Instant: heals one ally for {h:800} and gives them a shield of {s:300}. They are Blessed: 10% more damage dealt for 10s. The tank in trouble, or a damage dealer in the burst?',
        effect(k, t) {
          if (clericBless(k, this, t)) { const { amount, crit } = k.healAmount(400, { ab: this }); k.env.emit({ type: 'heal', target: 'lowest', not: k.g.blessT, amount, crit, ab: this }); k.fx('twinBless', { to: t }); return; }
          k.heal(t, 800, { ab: this }); k.shield(t, k.perk('cleric_a2') ? 480 : 300, 10, { ab: this }); k.allyBuff(t, 'blessed', { ab: this });
        },
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
    // (World Tree: every Thornlash tick, and every Wrath that lands while the Thornlash is on)
    onDamage(k, amt, crit, opts) {
      const id = opts.ab && k.baseId(opts.ab);
      if (opts.dot && id === 'thorn') { k.ultGain(0.4); k.g.bloom = Math.min(100, (k.g.bloom || 0) + GROVE_THORN_BLOOM); } else if (!opts.dot && id === 'wrath' && k.dotRemaining('thorn') > 0) k.ultGain(0.8);
    },
    tick(k) {
      // HoT ticks grow Bloom (tracked locally from our own Rejuvenates)
      for (const r of k.g.rejuvs) {
        while (r.ticks > 0 && k.now >= r.next) { r.ticks--; r.next += 3; groveGain(k, r.bloom || (k.perk('grovekeeper_a2') ? 7 : 5)); }   // (r.bloom: Deep Drinking's second root, spec row VI)
        if (r.ticks <= 0 && k.talent('grovekeeper_blossom')) { k.heal(r.t, 300, { ab: k.abilities.find(a => k.baseId(a) === 'rejuv') }); k.fx('lastBlossom', { to: typeof r.t === 'number' ? r.t : null }); }
        if (r.ticks <= 0 && r.t !== 'lowest' && k.talent('grovekeeper_evergreen')) groveEvergreen(k, r);
      }
      k.g.rejuvs = k.g.rejuvs.filter(r => r.ticks > 0);
      groveTick(k);
    },
    signature: 'Planting heals early',
    floor: 'Press Q to attack and E to keep thorns on the boss. W on hurt allies; R and D when the whole party is hurt.',
    ceiling: [
      'Rejuvenate heals over 15 seconds. Put it on BEFORE damage lands so nothing is wasted, then attack while it works.',
      'Every Rejuvenate tick grows Bloom. Spend it on Bloom for a big instant burst of healing that also makes your next Wrath instant and stronger. Its burst on anyone already near full drifts to whoever is hurt most.',
      'Keep Thornlash up on the boss: every tick grows 2 Bloom, so the thorns feed your heals, and every Wrath feeds the thorns 1s, so a healer who keeps casting rarely needs to renew them. Refresh it when it glows, in its last third (up to 9s carries over). It\'s also your instant attack while moving.',
      'Wild Growth makes all your heals 25% stronger for 15s; open raidwide-heavy stretches with it.',
      'Rebirth is instant on the living: a big heal and Wildheart (10% more damage for 12s). Give it to a damage dealer in the burst, unless someone may need raising soon.',
    ],
    abilities: [
      {
        id: 'wrath', name: 'Wrath', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('awaken') || groveMoonfire(k) ? 0 : 1.5),
        desc: '1.5s cast attack for {d:260}. After Bloom it\'s instant and hits for {d:390}.',
        glow: k => k.has('awaken'),
        effect(k) {
          const a = k.consume('awaken');
          const r = k.damage(a ? 390 : 260, { ab: this });
          if (a && k.perk('grovekeeper_w2')) { for (const r of k.g.rejuvs) k.heal(r.t, 160, { ab: this }); k.fx('empower'); }
          groveWrath(k, this, a, r);
        },
        fx: { type: 'projectile', style: 'leaf', color: '#8fff7a', range: RANGED, speed: 600 },
      },
      {
        id: 'rejuv', name: 'Rejuvenate', type: 'gcd', target: 'ally', anim: 'cast',
        desc: 'Instant: heals for {h:200}, then {h:140} every 3s for 15s. Its ticks grow Bloom.',
        recastGcd: k => groveSproutGcd(k),
        effect(k, t) {
          k.heal(t, 200, { ab: this });
          k.hot(t, 140, 5, 3, { ab: this, id: 'rejuv' });
          k.g.rejuvs = k.g.rejuvs.filter(r => r.t !== t);
          k.g.rejuvs.push({ t, ticks: 5, next: k.now + 3 });
          groveRejuv(k, this, t);
        },
        fx: { type: 'ring', color: '#8fff7a', r: 40, onTarget: true },
      },
      {
        id: 'thorn', name: 'Thornlash', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        desc: 'Instant: thorns that hit the target for {d:120}, then {d:60} every 3s for 30s. Every tick grows 2 Bloom, and every Wrath that lands while it is on feeds it 1s. Refreshing it keeps up to 9s of what was left.',
        glow: k => k.dotRemaining('thorn') < 9,
        effect(k) { k.damage(120, { ab: this }); k.dot('thorn', k.perk('grovekeeper_w1') ? 75 : 60, 30, 3, { ab: this }); if (k.perk('grovekeeper_a4')) k.gain('bloom', 5); },
        fx: { type: 'zone', style: 'roots', color: '#4f9f3f', r: 50, range: RANGED, dur: 1.2 },
      },
      {
        id: 'growth', name: 'Wild Growth', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'The whole party heals {h:90} every 3s for 15s, and your heals are 25% stronger for 15s.',
        effect(k) { k.buff('growth', 15); k.hot('party', 90, 5, 3, { ab: this, id: 'growth' }); if (k.perk('grovekeeper_w3')) k.gain('bloom', 25); groveGrowth(k, this); },
        fx: { type: 'cone', color: '#7ee06a', r: 170, span: 6.28 },
      },
      {
        id: 'bloom', name: 'Bloom', type: 'ogcd', target: 'self', cd: 15, anim: 'big',
        desc: 'Spend 50 Bloom: instantly heal everyone with your Rejuvenate for {h:400} (and the whole party for {h:350} during Wild Growth). A bloom on someone already near full drifts to the most hurt ally instead. Your next Wrath is instant.',
        usable: k => k.g.bloom >= 50,
        glow: k => k.g.bloom >= 90,
        effect(k) {
          k.spend('bloom', 50);
          if (k.has('growth')) k.heal('party', 350, { ab: this });
          // a Bloom on someone already near full drifts to the most hurt ally instead, so the big burst lands where it saves
          let drift = 0;
          for (const r of k.g.rejuvs) { const f = typeof r.t === 'number' && k.env.allyHp ? k.env.allyHp(r.t) : null; if (f != null && f >= GROVE_DRIFT) { drift++; k.heal('lowest', 400, { ab: this }); } else k.heal(r.t, 400, { ab: this }); }
          if (drift) k.fx('lastBlossom', { to: null });
          if (!k.g.rejuvs.length && !k.has('growth')) k.heal(k.talent('grovekeeper_roots') ? 'lowest' : 'self', 400, { ab: this });
          k.buff('awaken', 15);
          groveBloom(k, this);
        },
        fx: { type: 'ring', color: '#a8ff9a', r: 150 },
      },
      {
        id: 'rebirth', name: 'Rebirth', type: 'gcd', target: 'ally', cd: 30, anim: 'big', allowDead: true, allyBuff: 'wildheart',
        cast: k => (groveRebirthDead(k) ? RAISE_CAST : 0),
        desc: '5s cast: bring a fallen ally back. They rise with Raise Sickness: 15% less damage and healing for 20s, more for every fall this pull. On a living ally it is instant: it heals them for {h:1100} and fills them with Wildheart, 10% more damage dealt for 12s. Spend it on a damage dealer in the burst, or keep it for the raise.',
        glow: k => groveRebirthDead(k),
        effect(k, t) { if (k.env.isDead(t)) k.raise(t, { ab: this }); else { k.heal(t, 1100, { ab: this }); k.allyBuff(t, 'wildheart', { ab: this }); } },
        fx: { type: 'zone', style: 'roots', color: '#a8ff9a', r: 50, range: 0, dur: 1.6, onTarget: true },
      },
    ],
  },

  chronomancer: {
    potMult: 0.67, // balance knob (tools/simulate.js; lowered when Paradox came in)
    auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
    gauge: { kind: 'hourglass', key: 'flux', max: 100, label: 'Flux' },
    init: () => ({ flux: 50, stance: 'slow', link: null }),
    haste: k => (k.g.stance === 'haste' ? 0.8 : k.has('lag') ? 1.2 : 1),
    dmgMod: k => (k.g.stance === 'haste' ? 0.1 : 0),
    tick(k) { chronoFlux(k, k.perk('chronomancer_a2') ? 3 : 4); },
    signature: 'Haste / Slow stance',
    floor: 'Press Q: your attacks heal the tank. E switches to Haste when Flux is full. W on anyone who just took a big hit.',
    ceiling: [
      'Slow stance: Temporal Bolt heals your linked ally (the tank) for 150% of its damage, and Flux fills. Haste stance: 20% faster casts, +10% damage, and every Bolt heals the WHOLE party a little, but Flux drains.',
      'Shift back to Slow before your Flux runs dry and Paradox goes off: a hit for {d:14} for every Flux that Haste spent, and half of it heals the whole party. Run out and you stumble (3s of slow casts) with no Paradox. Plan Haste for raidwides and burst windows.',
      'Rewind sets an ally\'s HP back to what it was 4s ago, and even revives someone who died in the last 4s. Fire it right after a tankbuster for a massive heal. In Haste it costs 25 Flux instead of a charge, and that Flux feeds Paradox.',
      'Stasis holds your Bolts\' heals for 8s (25% stronger) and lets them all go at once to the whole party. Start it before a raidwide and release it once the hit has landed.',
      'Accelerando hastens the party, and the ally you aim it at is Quickened on top: give it to the damage dealer with the most to cast.',
    ],
    abilities: [
      {
        id: 'bolt', name: 'Temporal Bolt', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
        cast: k => (k.has('surge') || k.has('beat') ? 0 : 1.5),   // (only looks: asking for the cast time must not spend the free Bolt)
        desc: '1.5s cast attack for {d:280}. Slow: heals your linked ally for 150% of its damage. Haste: heals everyone for 60%.',
        effect(k) {
          chronoBolt(k, this, chronoInstant(k), 0.6, 1.5);
          chronoBoltAfter(k, this, 0.6, 1.5);
        },
        fx: { type: 'projectile', color: '#5ff0ff', range: RANGED, speed: 800 },
      },
      {
        id: 'rewind', name: 'Rewind', type: 'ogcd', target: 'ally', charges: 2, cd: 30, anim: 'cast', allowDead: true,
        desc: 'Set an ally\'s HP back to its highest point in the last 4s (revives them if they died in that time; a revive is instant, so it leaves heavy Raise Sickness: 30% less damage and healing for 30s, more for every fall this pull). They become your link. In Haste it costs 25 Flux instead of a charge (while you have the Flux), and that Flux feeds Paradox.',
        effect(k, t) {
          chronoRewindCost(k, this);
          k.rewind(t, k.perk('chronomancer_a4') ? 6 : 4, { ab: this }); k.g.link = t; k.ultGain(2); /* (Time Reversal) */ if (k.perk('chronomancer_w2')) k.shield(t, 250, 8, { ab: this }); if (k.talent('chronomancer_hourglass')) k.mitigate(t, 0.15, 6, { ab: this });
          if (k.talent('chronomancer_reprise')) k.after(3, () => { k.rewind(t, 4, { ab: this }); k.fx('echo'); });   // (Reprise, Echoist spec row VI: the Rewind echoes)
          if (k.talent('chronomancer_forward') && k.g.stance === 'haste') chronoQuicken(k, this, t);   // (Fast Forward, Accelerant spec row VII)
          const an = k.g.anchor;
          if (k.talent('chronomancer_dejavu') && an && k.now - an.at <= 10) { k.g.anchor = null; kitMove(k, 'point', { x: an.x, y: an.y }); k.fx('dejavu'); }
        },
        fx: { type: 'ring', style: 'rewind', color: '#c8fbff', r: 44, onTarget: true },
      },
      {
        id: 'shift', name: 'Shift', type: 'ogcd', target: 'self', cd: 2.5, anim: 'cast',
        label: k => (k.g.stance === 'haste' ? 'Shift: Slow' : 'Shift: Haste'),
        desc: 'Switch between Slow (Flux fills, strong single-target healing) and Haste (fast, party healing, Flux drains). Shifting into Haste makes your next Bolt instant. ' +
          'Shifting back to Slow sets off Paradox: an instant hit for {d:14} for every Flux you spent in that Haste, and the party heals for half of it. Run dry and stumble instead, and there is no Paradox.',
        usable: k => k.g.stance === 'haste' || k.g.flux >= 20,
        glow: k => (k.g.stance === 'slow' ? k.g.flux >= 95 : k.g.flux < 15),
        effect(k) {
          if (k.g.stance === 'slow') { k.g.stance = 'haste'; k.g.paraFlux = 0; const n = k.talent('chronomancer_double') ? 2 : 1; k.buff('surge', 10, {}, n, n); if (k.perk('chronomancer_w1')) k.gain('flux', 10); }
          else { k.g.stance = 'slow'; chronoParadox(k, this); }
          if (k.talent('chronomancer_dejavu') && k.env.pos) { const p = k.env.pos(); k.g.anchor = { x: p.x, y: p.y, at: k.now }; }
          // (both talents act on the shift into Haste only: shifting back is Paradox's moment)
          if (k.talent('chronomancer_stopwatch') && k.g.stance === 'haste') k.g.stopUntil = k.now + 4;
          if (k.talent('chronomancer_phase') && k.g.stance === 'haste' && k.now >= (k.g.phaseAt || 0)) {   // the afterimage's free Bolt
            k.g.phaseAt = k.now + 10;
            const acc = k.def.spec === 'accelerant';
            chronoBolt(k, k.abById('bolt'), 0.75, acc ? 0.71 : k.def.spec === 'echoist' ? 0.56 : 0.6, acc ? 1.14 : k.def.spec === 'echoist' ? 1.35 : 1.5); k.fx('echo');
          }
        },
        fx: { type: 'aura', style: 'stasis', color: '#3fd0d0', r: 30, dur: 0.8 },
      },
      {
        id: 'accel', name: 'Accelerando', type: 'ogcd', target: 'ally', cd: 60, anim: 'big', allyBuff: 'quickened',
        desc: 'Party burst: everyone attacks 10% faster for 15s, and the ally you aim it at is Quickened: 12% faster still for 15s. Give it to whoever has the most to cast. You gain 40 Flux.',
        effect(k, t) { k.partyBuff('haste', 0.1, chronoAccel(k, 15), { ab: this }); chronoQuicken(k, this, t); k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab: this }); },
        fx: { type: 'zone', style: 'clock', color: '#3fd0d0', r: 160, range: 0, dur: 2 },
      },
      {
        id: 'stasis', name: 'Stasis', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        label: k => (k.g.stash ? 'Release' : 'Stasis'),
        desc: 'Hold time still around your Bolts for 8s: their heals are stored instead of landing, and grow 25%. Press again, or let it run out, to release everything at once, shared evenly by the whole party. ' +
          'Nothing is lost: line the release up with a raidwide that just landed. Its cooldown starts on the release.',
        glow: k => (k.g.stash ? chronoWideDone(k) : !!(bossNow(k) && bossNow(k).wide)),
        effect(k) { chronoStasis(k, this); },
        fx: { type: 'aura', style: 'stasis', color: '#9ff4ff', r: 110, dur: 2 },
      },
      {
        id: 'recall', name: 'Recall', type: 'gcd', target: 'ally', cd: 30, anim: 'big', allowDead: true,
        cast: k => (k.talent('chronomancer_lastmoment') && chronoLate(k) ? 0 : targetDown(k, 'recall') ? RAISE_CAST : 2.5),   // (Last Moment, a talent)
        desc: '5s cast: bring a fallen ally back. They rise with Raise Sickness: 15% less damage and healing for 20s, more for every fall this pull. On a living one it is a 2.5s cast that heals them for {h:1400}.',
        glow: k => targetDown(k, 'recall'),
        effect(k, t) { if (k.env.isDead(t)) { k.raise(t, { ab: this }); chronoSecondChance(k, this, t); } else k.heal(t, 1400, { ab: this }); },
        fx: { type: 'ring', style: 'rewind', color: '#9ff4ff', r: 50, onTarget: true },
      },
    ],
  },
};

// ======================================================================= talents
// The parts of talents (talents.js) that a base move and its spec versions share. Each one does nothing unless the
// hero holds the talent (k.talent), so bots and the balance check see the kits exactly as above. The moves a talent
// grants are in TALENT_ABILITIES (further down).

// what the boss is doing, for talents that react to it: env.boss() -> { casting, castLeft, next, onMe, vuln, selfVuln }
// (null in town and for bots; tools/simulate.js models its busters and raidwides as casts)
const bossNow = k => (k.env.boss && k.env.boss()) || null;
const bossCasting = k => { const b = bossNow(k); return !!(b && b.casting); };
// runs fn once each time the boss starts a cast
function onBossCast(k, fn) { const c = bossCasting(k); if (c && !k.g.castSeen) fn(); k.g.castSeen = c; }
// a defensive held until the boss's cast lands: dur normally, up to max while it casts (Hold Fast, Patient Mirror)
function castHold(k, on, dur, max) { const b = bossNow(k); return on && b && b.casting ? Math.max(dur, Math.min(max, b.castLeft + 0.4)) : dur; }
const hpOf = k => (k.env.hpFrac ? k.env.hpFrac() : 1);
const abBase = (k, id) => k.abilities.find(a => k.baseId(a) === id);
// is the ally this move would land on fallen? (a healer's raise glows then: Intervention, Recall, Rebirth)
// a raise's cast, for every class (a heal from the same button on a living ally keeps its own)
const RAISE_CAST = 5;
function targetDown(k, id) { const ab = abBase(k, id), t = ab && k.env.target(ab); return typeof t === 'number' && !!k.env.isDead(t); }
// a move that moves you (main.js kitMove): 'back' (away from the enemy), 'forward', 'ally' (toward ev.to), 'point' (x, y)
function kitMove(k, where, o = {}) { k.env.emit(Object.assign({ type: 'teleport', where }, o)); }

// ----------------------------------------------------------------- Bastion
function bastionGain(k, n) {
  const over = (k.g.resolve || 0) + n - 100;
  if (over > 0 && k.talent('bastion_overflow')) { k.shield('self', over * 12, 8, { ab: k.abById('brace'), tag: 'faith' }); k.fx('faith'); }
  k.gain('resolve', n);
}
const BASTION = { TURNED: 10, BANNER_PB: 10, BANNER_MAX: 50 };
const bastionCost = k => (k.talent('bastion_steady') && k.has('steady') ? 35 : 50);
// Holy Edge / Shield Bash: the Resolve, or free after a tankbuster turned aside (bastionTurned)
const bastionCanEdge = k => k.has('turned') || (k.talent('bastion_rebuke') && k.has('rebuke')) || k.g.resolve >= bastionCost(k);
// Radiance (the Crusader's): one, or a bank of up to 3 with Kindling (a spec-row talent)
const bastionRadiate = (k, dur) => k.buff('radiant', dur, {}, k.talent('bastion_kindling') ? 3 : 1);
function bastionSpend(k) { if (k.consume('turned')) { k.fx('turnedEdge'); return; } k.spend('resolve', bastionCost(k)); k.clear('steady'); }
// a Perfect Block on a tankbuster (d.b): the Brace charge straight back, and the next Holy Edge free
function bastionTurned(k, d) {
  if (!d || !d.b) return;
  k.refundCharge('brace'); k.buff('turned', BASTION.TURNED);
  k.stats.turned = (k.stats.turned || 0) + 1;
}
// Rally Banner: up to 50 Resolve in, 15% to 25% less damage for the party; Perfect Blocks under it give 10 more
function bastionBanner(k, ab) {
  const n = Math.min(BASTION.BANNER_MAX, Math.floor(k.g.resolve || 0));
  if (n > 0) k.spend('resolve', n);
  k.mitigate('party', 0.15 + n / 500, 12, { ab });
  k.buff('banner', 12);
}
const bastionBraceDur = k => castHold(k, k.talent('bastion_holdfast'), 3, 6);
function bastionInHallow(k) {
  const h = k.g.hallow; if (!h || k.now > h.end) return false;
  if (h.x == null || !k.env.pos) return true;
  const p = k.env.pos(); return Math.hypot(p.x - h.x, p.y - h.y) <= 150;
}
// Blade Chain, for the base kit and the Crusader (gain: Judgment's Resolve)
function bastionBlade(k, ab, gain) {
  const step = k.now < k.g.comboUntil ? k.g.step : 0;
  let pot = [220, 300, 400][step];
  const countered = !!k.g.counter;
  if (k.g.counter) { pot += 150; k.g.counter = 0; }
  k.damage(pot, { ab });
  if (step === 2) { bastionGain(k, k.has('oath') ? gain * 2 : gain); if (k.perk('bastion_w1')) k.heal('self', 120, { ab }); }
  if (step === 2 && k.talent('bastion_verdict') && k.has('oath')) { bastionRadiate(k, 15); k.fx('radiant'); }
  if (step === 2 && k.talent('bastion_echo')) { k.damage(75, { ab }); k.heal('self', 60, { ab }); k.fx('edgeShard'); }
  k.g.step = (step + 1) % 3; k.g.comboUntil = k.now + 15;
  if (countered && step < 2 && k.talent('bastion_rhythm')) k.g.step = 2;
}
// after Holy Edge / Shield Bash: its heal (Shared Mercy) and Returning Edge
function bastionEdge(k, ab, pot) {
  if (k.talent('bastion_mercy') && hpOf(k) > 0.7) k.heal('lowest', 240, { ab });
  else k.heal('self', 120, { ab });
  if (k.talent('bastion_returning')) k.after(0.8, () => { k.damage(pot * 0.1, { ab }); k.fx('edgeReturn'); });
  // Phalanx (Sentinel, spec row): the banked shields go out to the party
  const ph = k.stacks('phalanx');
  if (ph) { k.clear('phalanx'); k.shield('party', 60 * ph, 6, { ab }); k.fx('faith'); }
}
// Bulwark / Zealous Guard
function bastionGuard(k, ab) {
  if (k.talent('bastion_unbreakable')) k.buff('unbreak', 10);
  if (k.talent('bastion_shelter')) k.mitigate('party', 0.1, 4, { ab });
  if (k.talent('bastion_rebuke')) k.buff('rebuke', 10);   // (Sentinel, spec row: the next Shield Bash, free and harder)
  if (k.talent('bastion_pyre')) {   // (Crusader, spec row: the Perfect Blocks under Zealous Guard come back as light)
    k.buff('pyre', 10); k.g.pyre = 0;
    k.after(10, () => { const n = k.g.pyre || 0; k.g.pyre = 0; if (n) { k.damage(90 * n, { ab }); k.fx('dawnPillar'); } });
  }
}
// a Perfect Block's talent parts
function bastionPerfect(k) {
  if (k.talent('bastion_steady')) k.buff('steady', 6);
  if (k.talent('bastion_unbreakable') && k.has('unbreak')) k.refundCharge('brace');
  if (k.has('avatar')) { k.damage(120, { ab: abBase(k, 'oath') }); k.fx('dawnPillar'); }
  // the spec rows (VI, VII)
  if (k.talent('bastion_phalanx')) k.buff('phalanx', 12, {}, 3);
  if (k.has('aegis')) k.heal('party', 60, { ab: abBase(k, 'bulwark') });
  if (k.has('pyre')) k.g.pyre = (k.g.pyre || 0) + 1;
}
function bastionTick(k) {
  if (k.talent('bastion_read')) onBossCast(k, () => { k.g.counter = 1; k.fx('readSwing'); });
  if (k.talent('bastion_laststand') && hpOf(k) < 0.3) {
    const ab = abBase(k, 'bulwark');
    if (ab && k.cdRemaining(ab) <= 0) { k.startCooldown(ab); k.resolve(ab, null); k.fx('lastStand'); }
  }
}

// ----------------------------------------------------------------- Bloodreaver
function reaverGain(k, n) {
  const over = (k.g.blood || 0) + n - 100;
  if (over > 0 && k.talent('bloodreaver_boil')) {
    const b = k.buffs.get('frenzy') || k.buffs.get('pact'), fz = abBase(k, 'frenzy');   // (Crimson Pact stands in for Frenzy)
    if (b && b.end > k.now) b.end += over / 10; else k.reduceCooldown(fz ? fz.id : 'frenzy', over / 10);
  }
  k.gain('blood', n);
}
// The bank: the damage you took since your last Drain (6s at most). A Drain cashes it (reaverCash); the heart shows it.
const REAVER = { BANK: 6, GLOW: 0.2, DL_PER: 100, POT: 270, CAP: 700, SLOPE: 25, WOUND: 1.2, WOUND_HIT: 0.1, WOUND_POT: 340, COLD: 0.3 };   // (Crimson Drain: POT, and up to CAP more, 1 per SLOPE of the bank)   // (GLOW: a bank this share of your HP lights Drain; DL_PER: Undying's Blood per max HP taken)
const reaverBank = k => k.env.recentDamage(Math.max(0, Math.min(REAVER.BANK, k.now - (k.g.drainAt ?? -99))));
// The open wound: a hit of WOUND_HIT of your max HP or more in the last WOUND seconds, not yet cashed. A Drain into it
// hits for WOUND_POT more (reaverDrainPot), and Drain glows while it's open.
const reaverWound = k => k.env.recentDamage(Math.max(0, Math.min(REAVER.WOUND, k.now - (k.g.drainAt ?? -99)))) >= k.env.maxHp() * REAVER.WOUND_HIT;
// (a bank cashed after its wound has closed has gone cold: its bonus counts for COLD of its worth)
const reaverWarm = k => (k.g.wound ? 1 : REAVER.COLD);
function reaverCash(k) { const t = reaverBank(k); k.g.wound = reaverWound(k) || !!k.g.warmNext; k.g.warmNext = false; k.g.drainAt = k.now; k.g.cashed = t; k.g.bank = 0; return t; }
// a Drain's price: a free one (Frenzy's Gorged: +bonus), Undying's, War Cry's, or 40 Blood
const reaverDrainOk = k => k.g.blood >= 40 || k.stacks('gorge') > 0 || k.has('deathless') || k.has('throes') || k.has('roar');
const reaverDrainGlow = k => k.stacks('gorge') > 0 || k.has('deathless') || k.has('throes') || k.has('roar') || k.g.blood >= 90 || (k.g.blood >= 40 && (reaverBank(k) >= k.env.maxHp() * REAVER.GLOW || reaverWound(k)));
function reaverDrainCost(k, bonus) {
  if (k.stacks('gorge') > 0) { k.consume('gorge'); return bonus; }
  if (k.has('deathless')) return 0;
  if (k.consume('throes')) { k.g.warmNext = true; return 0; }   // (Death Throes, spec row VII: two free Rampages, the blood warm for each)
  if (k.consume('roar')) { k.g.roared = true; return 0; }
  k.spend('blood', 40); return 0;
}
// every frame: the bank for the heart, and Undying's hits turned to Blood
function reaverTick(k) {
  k.g.bank = reaverBank(k);
  // Death Throes (Berserker, spec row VII): dropping under 30% HP makes the next two Rampages free
  if (k.talent('bloodreaver_throes') && hpOf(k) < 0.3 && hpOf(k) > 0 && k.now >= (k.g.throesAt || 0)) { k.g.throesAt = k.now + 40; k.buff('throes', 12, {}, 2, 2); k.fx('secondHelping'); }
  if (k.has('deathless')) {
    const b = k.buffs.get('deathless'), took = k.env.recentDamage(k.now - b.start + 0.05), mx = k.env.maxHp() || 1;
    const n = Math.floor((took - (k.g.dlSeen || 0)) / mx * REAVER.DL_PER);
    if (n >= 1) { k.g.dlSeen = (k.g.dlSeen || 0) + n * mx / REAVER.DL_PER; reaverGain(k, n); }
  }
}
function reaverHackHeal(k, ab) {
  const mx = k.env.maxHp ? k.env.maxHp() : 0;
  if (k.talent('bloodreaver_desperate') && hpOf(k) < 0.35) k.healRaw('self', mx * 0.04, { ab });
  if (k.talent('bloodreaver_hemorrhage') && k.dots.has('hemorrhage')) k.healRaw('self', mx * 0.02, { ab });
}
// Crimson Drain / Rampage potency (Rend)
function reaverDrainPot(k, pot) {
  if (k.g.wound) { pot += REAVER.WOUND_POT; k.g.wound = false; }
  if (k.talent('bloodreaver_rend') && k.g.wounds) { pot += 65 * k.g.wounds; k.g.wounds = 0; }
  return pot;
}
// after a Drain healed you for `healed`: Crimson Tide (tide: its share), Sanguine Shield, Second Helping, Hemorrhage
function reaverAfterDrain(k, ab, healed, tide) {
  const mx = k.env.maxHp();
  if (tide && k.talent('bloodreaver_tide')) k.healRaw('party', healed * tide, { ab });
  if (k.talent('bloodreaver_sanguine')) {
    const over = Math.min(mx * 0.15, healed - (1 - hpOf(k)) * mx);
    if (over > 1) k.env.emit({ type: 'shield', target: 'self', amount: Math.round(over), dur: 8, ab, tag: 'sanguine' });
  }
  if (k.talent('bloodreaver_second') && healed > mx * (k.def.spec === 'berserker' ? 0.1 : 0.15)) { reaverGain(k, 20); k.fx('secondHelping'); }
  if (k.talent('bloodreaver_hemorrhage')) { k.dot('hemorrhage', 30, 9, 3, { ab }); k.fx('hemorrhage'); }
  // the spec rows VI-VII: Scar Tissue (Berserker), Spill Over and Blood Font (Hemomancer)
  if (k.talent('bloodreaver_scar') && hpOf(k) < 0.5) { k.mitigate('self', 0.15, 5, { ab }); k.fx('cauterize'); }
  if (k.talent('bloodreaver_spill')) { const over = healed - (1 - hpOf(k)) * mx; if (over > 1) { k.healRaw('lowest', over, { ab }); k.fx('secondHelping'); } }
  if (k.talent('bloodreaver_font') && k.now >= (k.g.fontAt || 0)) {
    k.g.fontAt = k.now + 20;
    k.env.emit({ type: 'pool', target: 'self', r: 130, amount: k.healAmount(60, { ab }).amount, ticks: 6, interval: 1.5, ab }); k.fx('hemorrhage');
  }
  if (k.g.roared) { k.g.roared = false; k.healRaw('party', healed * 0.25, { ab }); k.fx('warcryDrain'); }   // (War Cry's free Drain)
  k.ultGain(Math.min(6, 18 * (k.g.cashed ?? k.env.recentDamage(6)) / mx));   // (Crimson Eclipse: a Drain that cashes a big bank fills it most)
}
// Bloodletting / Blood Lance: Retaliation's strength, then Cauterize
const reaverRetaliate = k => (k.talent('bloodreaver_retaliate') && k.env.recentDamage(2) >= k.env.maxHp() * 0.1 ? 2 : 1);
function reaverLetting(k, ab) {
  const b = bossNow(k);
  if (k.talent('bloodreaver_bleedcast') && b && b.casting) { k.heal('party', 70, { ab }); k.fx('secondHelping'); }   // (Hemomancer, spec row VI)
  if (k.talent('bloodreaver_cauterize') && b && b.selfVuln && k.now >= (k.g.cautAt || 0)) {
    k.g.cautAt = k.now + 30;
    k.env.emit({ type: 'splash', target: 'self', r: 10, cl: 1, ab }); k.fx('cauterize');
  }
}
// a buff running out: Bloodlust's free Drain when Frenzy ends, Blood Moon setting
function reaverExpire(k, id, b) {
  if ((id === 'frenzy' || id === 'pact') && k.talent('bloodreaver_bloodlust')) {
    const taken = k.env.recentDamage(Math.max(1, k.now - b.start)), ab = abBase(k, 'drain');
    k.damage(330 + Math.min(450, taken / (35 * ENGINE.NUM_SCALE)), { ab });
    k.healRaw('self', taken * 0.2, { ab }); k.fx('bloodlust');
  }
  if (id === 'bloodmoon') {
    const taken = k.env.recentDamage(10.2), ab = abBase(k, 'undying');
    if (taken > 0) { k.damage(Math.min(1500, taken / (20 * ENGINE.NUM_SCALE)), { ab }); k.healRaw('self', taken * 0.25, { ab }); }
    k.fx('moonburst');
  }
}

// ----------------------------------------------------------------- Runeguard
// Runes from a strike (Overflow, Answering Rune, Sigil of Binding)
function runeGain(k, ab, n) {
  if (k.talent('runeguard_answer') && k.consume('answer')) n += 1;
  if (k.talent('runeguard_binding') && k.now < (k.g.bindEnd || 0) && k.g.bindLeft > 0) { k.g.bindLeft--; n += 1; }
  const over = Math.max(0, (k.g.runes || 0) + n - 3);
  if (over && k.talent('runeguard_overflow')) { k.damage(110 * over, { ab }); k.fx('runeOverflow'); }
  k.gain('runes', n, 3);
}
// every frame: Foreseen Ward (Spellwarden, spec row VI): a boss cast beginning opens 8s in which the next Ward costs no Rune
function runeTick(k) {
  if (k.talent('runeguard_foreseen')) onBossCast(k, () => { k.buff('foreseen', 8); k.fx('sanctWard'); });
}
// Runic Overload going up (the base move and Living Rune): Warding Surge (Spellwarden, spec row VII) wards every ally
function runeSurge(k, ab) {
  if (k.talent('runeguard_surge')) { k.shield('party', 250, 8, { ab }); k.fx('sanctWard'); }
}
// Runes spent: Living Rune fires a bolt for each
function runeSpent(k, n) {
  if (!k.has('living')) return;
  const ab = abBase(k, 'overload');
  for (let i = 0; i < n; i++) k.after(0.2 + 0.18 * i, () => { k.damage(90, { ab }); k.fx('runeBolt'); });
}
const runeEmergency = k => k.talent('runeguard_emergency') && hpOf(k) < 0.35 && k.now >= (k.g.emAt || 0);
// the glowing Ward: a Rune in hand, no Ward of yours up, and a tankbuster or raidwide less than 3s from landing
// (Spellwarden: its ally Ward counts as up until it ends)
const runeWardGlow = k => {
  const b = bossNow(k);
  if (!(b && b.casting && b.castLeft < 3) || !(k.g.runes >= 1)) return false;
  return !k.g.selfWard && !(k.g.allyWardT && k.now < (k.g.allyWardEnd || 0));
};
// the glowing Mirror Aegis: a cast aimed at you (a tankbuster) less than a second from landing
const runeMirrorGlow = k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft < 1); };
function runeWardCost(k) {
  if (k.consume('foreseen')) { k.fx('sanctWard'); return; }   // (Foreseen Ward, Spellwarden spec row VI: the cast was seen coming)
  if (k.g.runes >= 1) { k.spend('runes', 1); runeSpent(k, 1); }
  else { k.g.emAt = k.now + 30; k.fx('emergency'); }
}
// a Ward going up (on t: 'self' or an ally): Shatter marks the old one, Glyph Echo goes off
function runeWardUp(k, ab, t) {
  if (k.talent('runeguard_shatter') && (t === 'self' ? k.g.selfWard : k.g.allyWardT === t && k.now < (k.g.allyWardEnd || 0))) k.g.shatter = true;
  if (t !== 'self') { k.g.allyWardT = t; k.g.allyWardEnd = k.now + (k.perk('runeguard_a4') ? 12 : 8); }
  if (k.talent('runeguard_smith')) { k.g.step = 1; k.g.comboUntil = k.now + 15; k.fx('empower'); }   // (Wardsmith, Runeblade spec row VI: the next Rune Blade hit is a Carve)
  if (k.consume('sanctified')) { k.g.sanctWard = true; k.fx('sanctWard'); }   // (Sanctum: runeWardEnd)
  if (k.talent('runeguard_echo') && k.g.glyphEcho) { k.damage(k.g.glyphEcho / 4, { ab: abBase(k, 'glyph') }); k.g.glyphEcho = 0; k.fx('glyphEcho'); }
}
// a Ward ending: its blast, the Rune back once it soaked refundAt, and the talents (nova at novaAt)
function runeWardEnd(k, d, refundAt, novaAt) {
  let frac = Math.max(0, Math.min(1, d.frac || 0));
  const shattered = k.g.shatter; k.g.shatter = false;
  if (shattered) { frac = 1; k.fx('shatter'); }
  k.damage((150 + 450 * frac) * (k.has('overload') ? 1.5 : 1), { ab: k.abById('ward') });
  k.fx('wardBlast', { f: Math.round(frac * 100) / 100 });   // (the look only: ability-vfx.js KIT_VFX.wardBlast)
  if (!shattered && frac >= refundAt) { k.gain('runes', 1, 3); k.stats.wardBreaks = (k.stats.wardBreaks || 0) + 1; k.fx('rune-echo'); k.ultGain(3); }   // (Runic Cataclysm)
  // a Ward broken all the way during Runic Overload gives one more Rune
  if (!shattered && frac >= 0.999 && k.has('overload')) { k.gain('runes', 1, 3); k.stats.overBreaks = (k.stats.overBreaks || 0) + 1; }
  if (k.talent('runeguard_answer') && frac >= 0.95) k.buff('answer', 15);
  const amt = k.g.wardAmt || 0;
  // a sanctified Ward (Sanctum): its Rune back whatever it soaked, and its blast heals the party for a third of what it took
  if (k.g.sanctWard) {
    k.g.sanctWard = false;
    if (shattered || frac < refundAt) k.gain('runes', 1, 3);
    if (amt && frac > 0) k.healRaw('party', amt * frac / 3, { ab: abBase(k, 'sanctum') || k.abById('ward') });
    k.fx('sanctBlast');
  }
  // Chain Ward (Spellwarden, spec row VI): one broken all the way raises a new one on the most hurt ally, at half strength
  if (k.talent('runeguard_chain') && !shattered && frac >= 0.999 && amt) { k.env.emit({ type: 'shield', target: 'lowest', amount: Math.round(amt * 0.5), dur: 6, ab: k.abById('ward') }); k.fx('wardLeap'); }
  if (k.talent('runeguard_leap') && !shattered && frac < 0.97 && amt) { k.env.emit({ type: 'shield', target: 'lowest', amount: Math.round(amt * (1 - frac)), dur: 6, ab: k.abById('ward') }); k.fx('wardLeap'); }
  if (k.talent('runeguard_nova') && frac >= novaAt && amt) { k.damage(120, { ab: k.abById('ward') }); k.healRaw('party', amt * 0.2, { ab: k.abById('ward') }); k.fx('wardNova'); }
}
// after Glyph Burst / Rune Cleave (pot: its strength): Runes spent, Glyph Echo, Sigil of Binding, Glyphguard
function runeGlyph(k, ab, pot, spent = 3) {
  runeSpent(k, spent);
  if (k.talent('runeguard_echo')) k.g.glyphEcho = pot;
  if (k.talent('runeguard_binding') && k.now >= (k.g.bindAt || 0)) { k.g.bindAt = k.now + 20; k.g.bindEnd = k.now + 8; k.g.bindLeft = 1; k.fx('binding'); }
  runeGlyphguard(k, ab);
}
function runeGlyphguard(k, ab) {
  if (!k.talent('runeguard_glyphguard') || k.g.selfWard || k.g.gward || k.now < (k.g.gwardAt || 0)) return;
  k.g.gward = true; k.g.gwardAt = k.now + 20;
  k.shield('self', 325, 8, { ab: k.abById('ward') || ab, tag: 'gward' });
}
function runeGlyphguardEnd(k, d) {
  k.g.gward = false;
  const frac = Math.max(0, Math.min(1, d.frac || 0));
  k.damage((60 + 180 * frac) * (k.has('overload') ? 1.5 : 1), { ab: k.abById('ward') });
}

// ----------------------------------------------------------------- Ranger
// moving and standing still (Steady Breath), and Second Wind's trigger; every spec's tick runs it
function rangerTrack(k) {
  if (k.env.moving()) k.g.movedAt = k.now;
  if (k.talent('ranger_secondwind') && hpOf(k) < 0.4 && k.now >= (k.g.windAt || 0) && !k.has('secondwind')) k.buff('secondwind', 20);
}
function rangerKeenChance(k) {
  if (k.has('starfall')) return 1;   // (under Starfall Volley every Quick Shot lights it)
  const w1 = k.perk('ranger_w1') ? 0.1 : 0, c = (k.has('markself') ? 0.55 : 0.35) + w1;
  return k.talent('ranger_steady') && k.now - (k.g.movedAt ?? -99) >= 2 ? Math.max(c, 0.55 + w1) : c;   // (the enhancement adds to Steady Breathing's floor too)
}
const rangerFocusFire = k => k.talent('ranger_focusfire') && k.g.focus >= 100;
function rangerShot(k, ab) { const o = { ab }; if (k.talent('ranger_pin') && k.consume('pinned')) o.autoCrit = true; return o; }
const rangerFocus = (k, barr) => 10 * (barr ? 3 : 1) + (k.talent('ranger_tracking') ? 2 * Math.min(5, k.g.track || 0) : 0);
// Rapid Fire's (and Explosive Shot's) price: half inside Hunter's Mark, so Focus pooled for the Mark buys twice the volleys
const rangerRapidCost = k => (k.has('markself') ? k.def.markRapid || 25 : 50);   // (Sharpshooter: 20)
// Keen Eye banks up to 2 procs (a third is wasted)
function rangerKeen(k) {
  if (k.stacks('keen') >= 2) k.wasted('keen');
  k.buff('keen', 15, {}, 2, 1); k.g.track = 0;
  k.ultGain(RANGER_ULT.GAIN_KEEN);   // (Starfall Volley)
  if (k.has('markself')) k.g.markKeens = (k.g.markKeens || 0) + 1;
  if (k.has('falconHunt')) { k.damage(200, { ab: abBase(k, 'barrage') }); k.fx('falconDive'); }
}
function rangerNoKeen(k) { if (k.talent('ranger_tracking')) k.g.track = (k.g.track || 0) + 1; }
function rangerRhythm(k, ab, barr, pot) {
  if (barr) return;
  k.g.quicks = (k.g.quicks || 0) + 1;
  if (k.talent('ranger_rhythm') && k.g.quicks % 4 === 0) k.damage(pot * 0.5, { ab });
}
// a shot that lands feeds a waiting Explosive Shot
function rangerFeed(k) { if (k.g.charge) { k.g.charge.pot *= 1.3; k.g.charge.n++; } }
// after a Quick Shot (r: its hit): Explosive Shot, Second Wind, Wild Volley
function rangerQuickAfter(k, ab, r) {
  rangerFeed(k);
  if (k.consume('secondwind')) { k.g.windAt = k.now + 45; k.healRaw('self', k.env.maxHp() * 0.15, { ab }); k.fx('secondWind'); }
  if (r.crit && k.talent('ranger_volley')) { k.after(0.3, () => k.damage(90, { ab })); k.fx('volley'); }
}
// after Piercing Arrow and its spec versions (r: its hit, pot: its strength)
function rangerPierce(k, keen, r, pot) {
  const ab = abBase(k, 'pierce');
  rangerFeed(k);
  if (k.talent('ranger_lightfoot')) k.reduceCooldown('cloak', 3);
  // a banked Keen Eye (cashed with a second still waiting) inside Hunter's Mark readies Barrage again
  if (keen && k.has('keen') && k.has('markself')) { const bar = abBase(k, 'barrage'); if (bar) { if (k.cdRemaining(bar) <= 0) k.wasted('barrage'); k.resetCooldown(bar); k.fx('empower'); } }
  if (!keen && r && r.crit && k.talent('ranger_ricochet')) { k.refundCharge(ab.id); k.fx('ricochetArrow'); }
  if (keen && k.talent('ranger_pin') && k.now >= (k.g.pinAt || 0)) { k.g.pinAt = k.now + 12; k.buff('pinned', 15); }
  if (keen && k.talent('ranger_storm')) for (let i = 0; i < 2; i++) k.after(0.15 + 0.2 * i, () => { k.damage((pot || 500) * 0.06, { ab }); k.fx('stormArc'); });
}
// Hunter's Mark: Marked for Death's burst when it ends
function rangerMark(k, ab, dur) {
  k.g.markKeens = 0;
  if (k.talent('ranger_deathmark')) k.after(dur, () => { k.damage(120 + 90 * (k.g.markKeens || 0), { ab }); k.fx('deathmark'); });
}

// ----------------------------------------------------------------- Shadowblade
function bladeCombo(k, n) {
  const over = (k.g.combo || 0) + n - 5;
  if (over > 0 && k.talent('shadowblade_sharpen')) k.buff('sharpen', 20, {}, 3, over);
  if (over > 0 && !bladeThousand(k)) { k.g.spilled = true; k.clear('tempo'); }   // (Bladedancer's Tempo: a spilled point breaks it)
  k.gain('combo', n, 5);
}
// Shadow Dance entered at 5 combo points: the first finisher in it keeps them
function bladePoise(k) { k.g.poised = k.g.combo >= 5; if (k.g.poised) k.fx('empower'); }
// Bladedancer: a finisher at exactly 5 points with no point spilled since the last one adds a Tempo (up to 3)
function bladeTempo(k, cp) {
  if (k.def.spec !== 'bladedancer') return;
  if (cp >= 5 && !k.g.spilled) k.buff('tempo', 60, {}, 3, 1);
  k.g.spilled = false;
}
// the finisher's multiplier from your poison or Rupture, and Sharpened Shadows (spent)
function bladeMult(k) {
  let m = k.dotRemaining('poison') > 0 || k.dotRemaining('rupture') > 0 ? 1.15 : 1;
  const s = k.stacks('sharpen'); if (s) { m *= 1 + 0.12 * s; k.clear('sharpen'); }
  return m;
}
// the finisher's damage options: its positional, unless a Feint lands it anyway; Opportunist's crit
function bladeOpts(k, ab, positional, posBonus, mult) {
  const o = k.talent('shadowblade_feint') && k.consume('feint') ? { ab, mult, feint: true } : { ab, positional, posBonus, mult };
  if (k.talent('shadowblade_opportunist') && bossCasting(k)) o.autoCrit = true;
  return o;
}
// after a finisher (Eviscerate / Backstab)
function bladeFinisher(k, ab, cp, full) {
  k.ultGain(BLADE_ULT.GAIN_CP * cp);   // (Thousand Cuts: every combo point a finisher spends)
  bladeTempo(k, cp);
  if (k.g.poised) { k.g.poised = false; if (k.has('dance')) { k.g.combo = Math.max(k.g.combo || 0, cp); k.fx('empower'); } }
  if (cp >= 5 && k.talent('shadowblade_relentless') && k.rng() < 0.5) k.gain('combo', 1, 5);
  if (k.talent('shadowblade_toxic')) {
    let burst = 0;
    for (const id of ['poison', 'rupture']) {
      const d = k.dots.get(id);
      if (d && d.end > k.now) burst += d.potency * Math.max(0, Math.floor((d.end - d.next) / d.interval) + 1) * 0.15;
    }
    if (burst) { k.damage(burst, { ab }); k.fx('toxicBurst'); }
  }
  if (k.talent('shadowblade_clone') && k.has('dance')) k.after(0.35, () => { k.damage(full * 0.2, { ab }); k.fx('shadowClone'); });
  if (k.talent('shadowblade_recuperate') && hpOf(k) < 0.6) k.healRaw('self', k.env.maxHp() * 0.03 * cp, { ab });
  if (k.talent('shadowblade_endless') && cp >= 5 && k.has('dance') && (k.g.endless || 0) < 4) { k.g.endless = (k.g.endless || 0) + 1; k.buffs.get('dance').end += 1; }
}
// after Shadowstep / Blade Fury
function bladeStep(k, ab) {
  if (k.talent('shadowblade_ambush')) {
    if (k.def.spec === 'bladedancer') { if (k.g.combo < 5) bladeCombo(k, 1); }   // (never spills: Tempo stays safe)
    else { k.damage(20, { ab }); bladeCombo(k, 1); k.fx('ambush'); }
  }
  if (k.talent('shadowblade_dodge') && bossCasting(k)) { k.mitigate('self', 0.5, 2, { ab }); k.fx('dodge'); }
  if (k.talent('shadowblade_trail')) k.env.emit({ type: 'splash', target: 'self', r: 0, pr: 90, ticks: 4, interval: 1.5, pct: 0.1, ab });
  if (k.talent('shadowblade_garrote')) { k.dot('garrote', 50, 9, 3, { ab }); k.fx('garrote'); }
  // spec rows VI-VII: Pirouette (Bladedancer: whirl round the boss to its far side, a hit softer for a moment); Shade
  // (Nightstalker: your shade stabs from where you stood, and gives a combo point)
  if (k.talent('shadowblade_pirouette')) { k.teleport('around', { ab }); k.mitigate('self', 0.25, 1.5, { ab }); k.fx('dodge'); }
  if (k.talent('shadowblade_shade')) k.after(2, () => { k.damage(80, { ab }); k.fx('shadowClone'); });
}
// every frame: Curtain Call (Bladedancer: Shadow Dance ends in a final spin), Eye of the Storm (a Flourish held ready turns blows aside)
function bladeTick(k) {
  const dancing = k.has('dance');
  if (k.g.wasDance && !dancing && k.talent('shadowblade_curtain')) { k.damage(500, { ab: abBase(k, 'step') }); k.fx('empower'); }
  k.g.wasDance = dancing;
  if (k.talent('shadowblade_eye') && k.stacks('tempo') >= 3 && k.now >= (k.g.eyeAt || 0)) { k.g.eyeAt = k.now + 1; k.mitigate('self', 0.2, 1.1, { ab: abBase(k, 'step') }); }
}

// ----------------------------------------------------------------- Pyromancer
function pyroTick(k) {
  if (k.talent('pyromancer_molten') && k.g.heat > 70 && k.now >= (k.g.armorAt || 0)) { k.g.armorAt = k.now + 1; k.mitigate('self', 0.1, 1.2, { ab: k.abById('fireball') }); }
  if (k.talent('pyromancer_haze')) onBossCast(k, () => { k.buff('haze', 10); k.fx('haze'); });
  // Hearth (Sigilmancer's spec row VI): while you stand in your Ember Circle the whole party takes less damage
  if (k.talent('pyromancer_hearth') && k.has('incircle') && k.now >= (k.g.hearthAt || 0)) { k.g.hearthAt = k.now + 1; k.mitigate('party', 0.08, 1.1, { ab: k.abById('fireball') }); }
}
// Wildfire: a crit during Combustion (or in Ember Circle) leaves a flame on the boss
function pyroWildfire(k, ab) {
  if (!k.talent('pyromancer_wildfire') || !(k.has('combust') || k.has('incircle'))) return;
  k.g.wild = ((k.g.wild || 0) + 1) % 3;
  k.dot('wild' + k.g.wild, 25, 6, 2, { ab, extra: true });
}
// Hot Streak lit by something other than two crits (White-Hot, Afterburn, Phoenix Flight): it takes over from Heating Up,
// so the two are never lit together
function pyroLight(k) { k.clear('heating'); k.proc('hotstreak', 15); }
// Combustion / Ember Circle (Afterburn)
function pyroBurst(k, dur) {
  if (k.talent('pyromancer_afterburn')) k.after(dur, () => pyroLight(k));
}
// a Hot Streak Pyroblast (or Meteor) inside Combustion: it burns 1s longer, up to 4s a Combustion
function pyroStoke(k) {
  const b = k.buffs.get('combust');
  if (!b || b.end <= k.now || (k.g.stoked || 0) >= 4) return;
  k.g.stoked = (k.g.stoked || 0) + 1; b.end += 1;
}
// after a Vent of h Heat: White-Hot (90+ lights Hot Streak), and a Cataclysm's Meteor still falling comes down at
// once with the Heat burning in its crater
function pyroVent(k, h) {
  if (h >= 90) { pyroLight(k); k.ultGain(4); k.fx('empower'); }
  const m = k.g.meteors && k.g.meteors[0];
  if (m) { m.at = Math.min(m.at, k.now + 0.3); m.heat = (m.heat || 0) + h; }}

// ----------------------------------------------------------------- Cleric
// a Petal growing back (past 3 it blooms by itself onto the most hurt ally, and counts toward Dawnstar)
function clericGrow(k) {
  if (k.g.petals >= 3) {
    // Golden Overflow (the Aegis's spec row VII): the Petal that would spill hardens into a shield on the whole party
    if (k.talent('cleric_overflow')) { k.shield('party', 70, 8, { ab: abBase(k, 'petal') }); k.fx('chorus'); }
    else k.heal('lowest', 450, { ab: abBase(k, 'petal') });
    clericBloom(k, 1); k.fx('petalBloom');
  } else k.gain('petals', 1, 3);
}
// Judgment charges on the boss (specs.js specBrand; here for the moves a talent grants)
function clericBrand(k, n, ab) {
  k.env.emit({ type: 'brand', ticks: n, amount: Math.round(70 * ENGINE.POT_SCALE * (k.def.potMult || 1) * (1 + (k.gear().power || 0))), ab });
}
// Absolution (the Inquisitor's spec row VII): a Mend also brands the boss for 2 hits and washes Vulnerability and Damage Down off its target (once every 15s)
function clericAbsolve(k, ab, t) {
  clericBrand(k, 2, ab);
  if (k.now >= (k.g.absAt || 0)) { k.g.absAt = k.now + 15; k.env.emit({ type: 'splash', target: t, r: 10, cl: 1, ab }); k.fx('purify', { to: typeof t === 'number' ? t : null }); }
}
// Foresight (the Aegis's spec row VI): a barrier set down while the boss is casting is half again as strong
const clericForesight = k => (k.talent('cleric_foresight') && bossCasting(k) ? 1.5 : 1);
// Petals toward Dawnstar (Held Dawn counts from the moment it's ready)
function clericBloom(k, n) {
  const was = k.g.bloom || 0;
  k.gain('bloom', n, 3);
  if (was < 3 && k.g.bloom >= 3) k.g.dawnAt = k.now;
}
// First Light (a talent): while Dawnstar is ready, Mend (Divine Barrier) casts instantly
const clericFirstLight = k => k.talent('cleric_firstlight') && k.g.bloom >= 3;
const clericHeld = k => (k.talent('cleric_held') ? 1 + Math.min(0.3, 0.02 * Math.max(0, k.now - (k.g.dawnAt ?? k.now))) : 1);
function clericInSanctum(k) {
  const s = k.g.sanctum; if (!s || k.now > s.end) return false;
  if (s.x == null || !k.env.pos) return true;
  const p = k.env.pos(); return Math.hypot(p.x - s.x, p.y - s.y) <= 160;
}
// after a Smite or Dawnstar (r: its hit): Atonement
function clericSmite(k, ab, r) { if (k.talent('cleric_atonement') && r) k.healRaw('lowest', r.amount * 0.15, { ab }); clericUltGain(k, 'smite'); }
// Dawn Breaks' charge (ULTIMATES.cleric): a Petal on someone hurt (5.5; 2 on someone near full; an Aegis, whose
// Petals come back, 70% of that), a Mend (1), a Dawnstar (8, 16 inside the party's burst) and every Smite (0.5)
function clericUltGain(k, what, t) {
  if (!k.ult) return;
  if (what === 'petal' || what === 'mend') {
    const f = k.env.allyHp && t != null && t !== true ? k.env.allyHp(t) : null;
    k.ultGain(what === 'mend' ? 1 : (f != null && f >= 0.9 ? 2 : 5.5) * (k.def.spec === 'aegis' ? 0.4 : 1));
  } else if (what === 'dawnstar') { const pm = k.env.partyMods ? k.env.partyMods() : null; k.ultGain(pm && pm.dmg > 0 ? 16 : 8); }
  else k.ultGain(0.5);
}
function clericDawnstar(k, ab) {
  if (!ab.ult) clericUltGain(k, 'dawnstar');   // (Dawn Breaks)
  if (k.talent('cleric_favour')) k.gain('petals', 1, 3);
  if (k.talent('cleric_sunfall')) { k.dot('sunfall', 35, 12, 3, { ab }); k.fx('sunfall'); }
  if (k.talent('cleric_gilded')) { k.shield('party', 120, 8, { ab }); k.fx('chorus'); }   // (Gilded Dawn, the Aegis's spec row VI)
}
function clericPetal(k, ab, t, healPot) {
  clericUltGain(k, 'petal', t);
  if (k.talent('cleric_petalfall')) { k.damage(40, { ab }); k.fx('petalfall'); }
  if (k.talent('cleric_penance')) { clericBrand(k, 2, ab); k.fx('petalfall'); }   // (Penance, the Inquisitor's spec row VI)
  if (k.talent('cleric_twin')) { const { amount, crit } = k.healAmount(healPot * 0.5, { ab }); k.env.emit({ type: 'heal', target: 'lowest', not: t, amount, crit, ab }); }
  if (k.talent('cleric_quickmend')) k.buff('quickmend', 10);
  if (k.talent('cleric_purify') && k.now >= (k.g.purAt || 0)) { k.g.purAt = k.now + 20; k.env.emit({ type: 'splash', target: t, r: 10, cl: 1, ab }); k.fx('purify', { to: typeof t === 'number' ? t : null }); }
  if (k.talent('cleric_wings') && typeof t === 'number') kitMove(k, 'ally', { to: t, d: 160 });
  if (k.talent('cleric_chorus') && (k.g.spent = (k.g.spent || 0) + 1) % 3 === 0) { k.heal('party', healPot * 0.5, { ab }); k.fx('chorus'); }
}
// Twin Blessing: the first press leaves Benediction ready for 5s; true for the second (half-strength) press
function clericBless(k, ab, t) {
  if (!k.talent('cleric_twinbless')) return false;
  if (k.now < (k.g.blessUntil || 0)) {
    k.g.blessUntil = 0;
    if (ab.charges) k.refundCharge(ab.id); else k.cd[ab.id] = k.g.blessEnd;
    return true;
  }
  k.g.blessUntil = k.now + 5; k.g.blessT = t;
  if (!ab.charges) { k.g.blessEnd = k.cd[ab.id]; k.cd[ab.id] = k.now; }
  return false;
}
function clericTick(k) {
  if (k.g.blessUntil && k.now >= k.g.blessUntil) {
    k.g.blessUntil = 0;
    const ab = abBase(k, 'bene');
    if (ab && !ab.charges) k.cd[ab.id] = Math.max(k.cd[ab.id] || 0, k.g.blessEnd || 0);
  }
}

// ----------------------------------------------------------------- Grovekeeper
// Bloom from each Thornlash tick (grovekeeper onDamage): keeping the thorns up feeds the heal loop
const GROVE_THORN_BLOOM = 2, GROVE_THORN_FEED = 1, GROVE_DRIFT = 0.9;   // (a Wrath feeds the thorns 1s; Bloom on someone above 90% drifts to the most hurt)
// is Rebirth's target fallen? (then it's the 5s raise, and it glows; on the living it's instant)
const groveRebirthDead = k => targetDown(k, 'rebirth');
function groveGain(k, n) {
  const over = (k.g.bloom || 0) + n - 100;
  if (over > 0 && k.talent('grovekeeper_spill')) {
    k.g.spill = (k.g.spill || 0) + over;
    if (k.g.spill >= 10 && k.now >= (k.g.spillAt || 0)) {
      k.g.spill = 0; k.g.spillAt = k.now + 6;
      const ab = abBase(k, 'bloom');
      k.env.emit({ type: 'splash', target: 'lowest', r: 0, pr: 80, ticks: 4, interval: 1.5, pa: k.healAmount(60, { ab }).amount, ab }); k.fx('spill');
    }
  }
  k.gain('bloom', n);
}
const groveMoonfire = k => k.talent('grovekeeper_moonfire') && (k.g.wraths || 0) % 3 === 2;
// after a Wrath (a: it was Awakened, r: its hit): Moonfire's count, Nature's Balance, Cycle of Life
function groveWrath(k, ab, a, r) {
  k.g.wraths = (k.g.wraths || 0) + 1;
  // rooted thorns: a Wrath that lands while the Thornlash is on feeds it 1s (never past its full 30s)
  const th = k.dots.get('thorn'); if (th && th.end > k.now) th.end = Math.min(th.end + GROVE_THORN_FEED, k.now + 30);
  if (k.talent('grovekeeper_balance')) for (const x of k.g.rejuvs) k.healRaw(x.t, r.amount * 0.2, { ab });
  if (a && k.talent('grovekeeper_cycle')) groveGain(k, 20);
  if (k.talent('grovekeeper_moonwrath') && k.has('moonlit') && r) k.healRaw('lowest', r.amount * 0.2, { ab });   // (Moonlit Wrath, the Moonwell's spec row VII)
}
// Evergreen (the Lifebinder's spec row VII): a Lifebind that has run out on your chosen ally roots again for 40 Bloom
function groveEvergreen(k, r) {
  if ((k.g.bloom || 0) < 40) return;
  const ab = abBase(k, 'rejuv');
  k.spend('bloom', 40);
  k.hot(r.t, 120, 5, 3, { ab, id: 'rejuv' });
  const { amount } = k.healAmount(110, { ab });
  k.env.emit({ type: 'hot', target: 'lowest', not: r.t, amount, ticks: 5, interval: 3, ab, id: 'rejuv2' });
  r.ticks = 5; r.next = k.now + 3;
  k.fx('pulse');
}
const groveSproutGcd = k => (k.talent('grovekeeper_sprout') && k.now >= (k.g.sproutAt || 0) ? 1.2 : undefined);
// after Rejuvenate / Lifebind: Quick Sprout's timer, Ironbark
function groveRejuv(k, ab, t) {
  if (k.talent('grovekeeper_sprout') && k.now >= (k.g.sproutAt || 0)) k.g.sproutAt = k.now + 30;
  if (k.talent('grovekeeper_ironbark') && bossCasting(k)) { k.mitigate(t, 0.15, 5, { ab }); k.fx('ironbark', { to: typeof t === 'number' ? t : null }); }
}
// Wild Growth / Moonwell extras
function groveGrowth(k, ab) {
  if (k.talent('grovekeeper_seedburst')) k.buff('awaken', 15);
  if (k.talent('grovekeeper_pulse')) for (let i = 1; i <= 5; i++) k.after(3 * i, () => { groveGain(k, 8); k.fx('pulse'); });
}
// after Bloom: Shared Roots' regen, Nature's Wrath
function groveBloom(k, ab) {
  if (k.talent('grovekeeper_roots')) { const { amount } = k.healAmount(60, { ab }); k.env.emit({ type: 'hot', target: 'lowest', amount, ticks: 3, interval: 3, ab, id: 'roots' }); }
  if (k.talent('grovekeeper_naturewrath')) { k.damage(90, { ab }); k.fx('natureWrath'); }
}
function groveTick(k) {
  // Tidal Shift (the Moonwell's spec row VI): its second press is open for 8s, then the cooldown comes back
  if (k.g.tideUntil && k.now >= k.g.tideUntil) { k.g.tideUntil = 0; const mw = abBase(k, 'growth'); if (mw) k.cd[mw.id] = Math.max(k.cd[mw.id] || 0, k.g.tideEnd || 0); }
  if (k.talent('grovekeeper_thickbark') && hpOf(k) < 0.4 && k.now >= (k.g.barkAt || 0)) { k.g.barkAt = k.now + 60; k.mitigate('self', 0.3, 6, { ab: k.abById('bloom') }); k.fx('thickBark'); }
  const s = k.g.seed;
  if (s) {
    const ab = abBase(k, 'rebirth'), to = typeof s.t === 'number' ? s.t : null;
    if (k.env.isDead(s.t)) { k.g.seed = null; k.raise(s.t, { ab }); k.fx('seedBurst', { to }); }
    else if (k.now >= s.end) { k.g.seed = null; k.heal(s.t, 900, { ab }); k.fx('seedBurst', { to }); }
  }
}

// ----------------------------------------------------------------- Chronomancer
// Flux filling in Slow and draining in Haste (drain: per second); Stopwatch, Overwound
function chronoFlux(k, drain) {
  const dt = k.now - (k.g.lastTick ?? k.now);
  k.g.lastTick = k.now;
  if (k.g.stance !== 'haste') k.g.owed = 0;   // (On Credit, spec row VI: the credit only lives inside a Haste)
  // Beat the Clock (spec row VII): a boss cast makes your next Bolt instant and, in Haste, holds the Flux until it lands
  if (k.talent('chronomancer_clock')) onBossCast(k, () => {
    const b = bossNow(k);
    k.buff('beat', 15); k.fx('echo');
    if (k.g.stance === 'haste') k.g.stopUntil = Math.max(k.g.stopUntil || 0, k.now + (b ? b.castLeft : 2) + 0.3);
  });
  if (k.g.stash && k.now >= k.g.stash.end) chronoRelease(k);   // (Stasis runs out: what it held goes out anyway)
  if (dt <= 0 || dt > 1 || k.now < (k.g.stopUntil || 0)) return;
  if (k.g.stance === 'slow') {
    const add = 3 * dt, over = k.g.flux + add - 100;
    if (over > 0 && k.talent('chronomancer_overwound')) {
      k.g.wound = (k.g.wound || 0) + over;
      if (k.g.wound >= 6) { k.g.wound = 0; k.heal(k.g.link ?? k.env.defaultLink(), 160, { ab: k.abById('shift') }); }
    }
    k.gain('flux', add);
  } else {
    const was = k.g.flux;
    k.g.flux = Math.max(0, k.g.flux - drain * dt);
    k.ultGain((was - k.g.flux) / 7);   // (Time Reversal: the Flux Haste burns)
    k.g.paraFlux = (k.g.paraFlux || 0) + (was - k.g.flux);   // (Paradox: the Flux this Haste has spent)
    if (k.g.flux <= 0 && k.talent('chronomancer_credit')) {   // (On Credit, spec row VI: Haste runs on 4s past empty; shifting back in it still sets off Paradox)
      if (!k.g.owed) { k.g.owed = k.now + 4; k.fx('lag'); }
      if (k.now < k.g.owed) return;
    }
    if (k.g.flux <= 0) { k.g.owed = 0; k.g.stance = 'slow'; k.g.paraFlux = 0; k.buff('lag', 3); k.fx('lag'); k.stats.lags = (k.stats.lags || 0) + 1; }
  }
}
// Paradox: shifting from Haste back to Slow (not stumbling out of it) cashes in the Flux that Haste spent: an instant
// hit, and half of it heals the whole party
const CHRONO_PARADOX = 14;   // potency per Flux spent
function chronoParadox(k, ab) {
  const spent = k.g.paraFlux || 0;
  k.g.paraFlux = 0;
  if (spent < 1) return;
  const r = k.damage(CHRONO_PARADOX * spent, { ab });
  k.healRaw('party', r.amount * 0.5, { ab });
  k.stats.paradox = (k.stats.paradox || 0) + 1;
  k.fx('paradox', { n: Math.round(spent) });
}
// Rewind in Haste: 25 Flux instead of a charge, while you have it (the Flux counts toward Paradox)
function chronoRewindCost(k, ab) {
  if (k.g.stance !== 'haste' || k.g.flux < 25 || !ab.charges) return;
  k.g.flux -= 25; k.g.paraFlux = (k.g.paraFlux || 0) + 25;
  k.refundCharge(ab.id);
}
// Accelerando's (and Echo Chamber's, Time Warp's) chosen ally: Quickened (engine.js ALLY_BUFFS)
function chronoQuicken(k, ab, t) { if (t != null && t !== true) k.allyBuff(t, 'quickened', { ab }); }
// Stasis: the first press starts holding your Bolts' heals (chronoBolt adds to the stash), the second (or the end of its
// 8s) releases them to the party. The cooldown runs from the release.
const CHRONO_STASIS = { dur: 8, grow: 1.25 };
function chronoStasis(k, ab) {
  if (k.g.stash) { chronoRelease(k); return; }
  k.g.stash = { amt: 0, at: k.now, end: k.now + CHRONO_STASIS.dur, ab };
  k.cd[ab.id] = k.now + 0.8;   // (the press that releases it can follow straight away)
  k.buff('stasis', CHRONO_STASIS.dur);
  k.fx('stasis-hold');
}
function chronoRelease(k) {
  const s = k.g.stash; if (!s) return;
  k.g.stash = null; k.clear('stasis');
  k.cd[s.ab.id] = Math.max(k.cd[s.ab.id] || 0, k.now + k.recast(s.ab));
  if (s.amt > 0) k.healRaw('party', s.amt * CHRONO_STASIS.grow / 4, { ab: s.ab });
  k.fx('stasis-release', { n: Math.round(s.amt) });
}
// the release glows once there is something held and the raidwide it was waiting for has gone off
const chronoWideDone = k => { const s = k.g.stash, b = bossNow(k); return !!s && s.amt > 0 && k.now - s.at > 1.5 && !(b && b.wide); };
// is the boss's cast about to land? (Last Moment)
const chronoLate = k => { const b = bossNow(k); return !!(b && b.casting && b.castLeft <= 1.5); };
// one Temporal Bolt hit (share of its strength; the party / link heal shares)
function chronoBolt(k, ab, share, party, link) {
  const r = k.damage(280 * share, { ab });
  if (k.g.stash) k.g.stash.amt += r.amount * (k.g.stance === 'haste' ? party * 4 : link);   // (Stasis holds it: chronoRelease)
  else if (k.g.stance === 'haste') k.healRaw('party', r.amount * party, { ab });
  else k.healRaw(k.g.link ?? k.env.defaultLink(), r.amount * link, { ab });
  if (k.g.stance === 'haste' && r.crit && k.talent('chronomancer_borrowed')) k.gain('flux', 6);
  if (k.talent('chronomancer_future')) {
    if (!k.g.future && k.now >= (k.g.futureAt || 0)) { const f = k.g.future = { pot: 0 }; k.after(6, () => { k.g.future = null; k.g.futureAt = k.now + 6; k.damage(f.pot * 0.1, { ab }); k.fx('futureBurst'); }); k.fx('futureMark'); }
    if (k.g.future) k.g.future.pot += 280 * share;
  }
  return r;   // (Resonance, spec row VI: an echo that crits)
}
function chronoBoltAfter(k, ab, party, link, echoes) {
  k.g.bolts = (k.g.bolts || 0) + 1;
  if (k.g.stance === 'haste') k.ultGain(1.6);   // (Time Reversal: a Bolt that heals the whole party)
  if (k.talent('chronomancer_skip') && k.g.bolts % 5 === 4) k.buff('beat', 15);
  if (k.talent('chronomancer_second') && !echoes && k.g.stance === 'haste') k.after(2, () => chronoBolt(k, ab, k.def.spec === 'accelerant' ? 0.06 : 0.08, party, link));
}
// an instant Bolt (Skipped Beat's, or the one after shifting into Haste) spends it; its strength is 1
function chronoInstant(k) { if (!k.consume('beat')) k.consume('surge'); return 1; }
// Accelerando / Echo Chamber's length
const chronoAccel = (k, dur) => dur;
// Second Chance: an ally Recall raised is healed to full a moment later, and the party a little
function chronoSecondChance(k, ab, t) {
  if (!k.talent('chronomancer_secondchance')) return;
  k.after(0.6, () => { k.heal(t, 1400, { ab }); k.heal('party', 150, { ab }); k.fx('secondChance', { to: typeof t === 'number' ? t : null }); });
}

// The shared dash on Space: two charges, no GCD.
const DASH = { charges: 2, cd: 12 };

// Every tank's taunt rides on one of its own buttons (the carrier, TAUNT_CARRY below: a cheap, short-cooldown press the
// tank uses anyway), so T is free for the Ultimate. The taunt is smart: pressing the carrier taunts only when the taunt
// is ready and the enemy you face is on someone else (Kit.resolve calls env.taunt; CombatActor and the worlds in
// main.js / raid-host.js decide). The host applies the shared part (FightSim.taunt in fight.js): threat to the top +
// 10%, the boss fixed on you for 3s, an add for 6s. Each class's own part also feeds its gauge (use(k), run by
// CombatActor.useTaunt), and has its own look (KIT_VFX.taunt in ability-vfx.js). cd matches FIGHT.TAUNT_CD.
// name: the taunt's name (the fixation icon under the boss bar shows it); icon: the icon that fixation wears.
const TAUNT = {
  cd: 20, range: 500, lock: 0.6,
  hold: 'your threat jumps to 10% above the highest, and the boss stays on you for 3s whatever anyone else does (an add, for 6s). The boss never leaves a standing tank for anyone else, so on him it hands him between tanks',
  bastion: {
    name: 'Challenge', icon: 'banner',
    desc: 'The challenge steadies you like a Perfect Block: +10 Resolve, and your next Blade Chain counters for +150.',
    use(k) { bastionGain(k, 10); k.g.counter = 1; },
  },
  bloodreaver: {
    name: 'Reaver\'s Hook', icon: 'letting',
    desc: 'The hook draws blood: +20 Blood.',
    use(k) { reaverGain(k, 20); },
  },
  runeguard: {
    name: 'Binding Rune', icon: 'glyph',
    desc: 'The rune is carved from your own stones and answers you: +1 Rune.',
    use(k) { k.gain('runes', 1, 3); },
  },
};
// the button that carries each tank's taunt (a base ability id: a spec's or talent's replacement carries it too)
const TAUNT_CARRY = { bastion: 'brace', bloodreaver: 'letting', runeguard: 'strike', ironpalm: 'read', gorgemaw: 'wide', oathbroker: 'reneg' };
// the taunt's lines for a carrier's tooltip (hud.js, the hero page): '' for any other move
const tauntNote = (classId, ab) => {
  const t = TAUNT[classId];
  if (!t || !ab || TAUNT_CARRY[classId] !== (ab.replaces || ab.id)) return '';
  return `<div class="it-taunt"><span><u>Taunt · ${t.name}:</u> while the enemy you face is attacking someone else, this also taunts it (once every ${TAUNT.cd}s): ${TAUNT.hold}. ${t.desc}</span></div>`;
};
// CSS background for the taunt's icon (the fixation under the boss bar): its own painting, the borrowed icon underneath
// (a class with no painted icons yet, data.js art.icons === false, draws its own: hud.js abilityIcon)
const tauntIconBg = classId => {
  const cls = typeof CLASSES !== 'undefined' && CLASSES.find(c => c.id === classId);
  if (cls && cls.art && cls.art.icons === false && typeof abilityIcon !== 'undefined') return `url(${abilityIcon(classId, 'taunt')})`;
  // every tank's taunt is painted; the borrowed icon stays underneath in case a new tank's isn't yet
  const own = `icons/${classId}/taunt.png`, borrowed = `icons/${classId}/${(TAUNT[classId] || {}).icon}.png`;
  return `url(${own}), url(${borrowed})`;
};

// ======================================================================= ULTIMATES (T, slot 7)
// One per class, each charged by that class's own loop (engine.js: k.g.ult 0..100, ultGain, ultTick; the full shape is
// in docs/DESIGN.md "Ultimates"). DAMAGE classes open a short window of empowered moves; TANKS and HEALERS get one
// big, instant party moment. Pacing: a pro fills it in about 90s, a newcomer in about 120s; charge.rate (the trickle
// while fighting) is about 35% of that, the kit loop supplies the rest (the ultGain calls named in each comment).
// Every number in desc is a token (numbers.js), and every hit stays far under the host's 15000 clamp (fight.js).
// Looks: ABILITY_VFX[class][id] (and [fxId] for a window's moves), KIT_VFX for the moments that land later.
// Classes without an entry have nothing on T yet.
const ULTIMATES = {
  // Bastion: Perfect Blocks (4.5 each, bastion onNotify) and the hits you take (bastionUltHits) fill it
  bastion: {
    id: 'lastbastion', name: 'Last Bastion', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'bulwark',
    lock: 1.0, dr: 0.3,
    charge: { rate: 0.4, keep: 0.5 },
    desc: 'Drive your blade into the floor and raise a dome of dawn light over the whole party: for 8s everyone takes 25% less damage. ' +
      'When the dome falls it comes down on your target as a holy slam for {d:1600}, and its light heals the party for {h:200}. ' +
      'You take 30% less damage and can\'t be knocked back while you raise it.' +
      '<div class="it-ult"><span><u>Charge:</u> 4.5% for every Perfect Block, more for every hit you take, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
    effect(k) {
      k.mitigate('party', 0.25, 8, { ab: this });
      const ab = this;
      k.after(8, () => { k.damage(1600, { ab, threat: 2 }); k.heal('party', 200, { ab }); k.fx('bastion-slam'); });
    },
  },
  // Pyromancer: Hot Streaks (4 each, pyromancer onDamage) and the Heat a Vent releases (1 per 13) fill it
  pyromancer: {
    id: 'phoenixdive', name: 'Phoenix Dive', slot: 7, type: 'ogcd', ult: true, mode: 'window', target: 'enemy', range: RANGED, anim: 'big', icon: 'combust',
    lock: 0.8, dr: 0.3,
    burst: 'combust',   // (bots open it inside their own burst: bots.js BotAI.ult)
    charge: { rate: 0.4, keep: 0.5 },
    desc: 'Become the phoenix and dive through your target for {d:900}; a Combustion already burning burns 4s longer. ' +
      'For 8s your fire is reborn: Fireball becomes <b>Phoenix Flame</b> and Pyroblast <b>Phoenix Blast</b>, both instant, on a 1.8s global cooldown. ' +
      'When the 8s are up you burst from the ashes for {d:500}. You take 30% less damage and can\'t be knocked back while you dive.' +
      '<div class="it-ult"><span><u>Charge:</u> 4% for every Hot Streak, 1% for every 13 Heat you Vent, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
    effect(k) {
      k.damage(900, { ab: this });
      const cb = k.buffs.get('combust');
      if (cb && cb.end > k.now) cb.end += 4;
    },
    window: {
      dur: 8,
      over: {
        fireball: {
          fxId: 'phoenixflame', name: 'Phoenix Flame', cast: 0, recastGcd: 1.8, anim: 'cast',
          desc: 'Phoenix Dive: an instant lance of phoenix fire for {d:420} and +6 Heat. Its crits still warm you toward Hot Streak.',
          glow: () => true,
          effect(k) { k.damage(420, { ab: this }); k.gain('heat', 6, 100); },
        },
        pyro: {
          fxId: 'phoenixblast', name: 'Phoenix Blast', cast: 0, recastGcd: 1.8, anim: 'cast',
          desc: 'Phoenix Dive: an instant wing of flame for {d:640}, or {d:820} with Hot Streak. +8 Heat.',
          glow: k => k.has('hotstreak'),
          effect(k) { const hs = k.consume('hotstreak'); k.damage(hs ? 820 : 640, { ab: this }); k.gain('heat', 8, 100); },
        },
      },
      onEnd(k) { k.damage(500, { ab: k.ult }); k.fx('phoenix-rebirth'); },
    },
  },
};
// the Ultimate's icon (the T slot, the hero page): its own painting once it's in (icons/<class>/<ult id>.png, asked
// once: draw-util.js ArtProbe), the icon it borrows until then
const ultIconBg = classId => {
  const u = ULTIMATES[classId];
  if (!u) return '';
  const cls = typeof CLASSES !== 'undefined' && CLASSES.find(c => c.id === classId);
  if (cls && cls.art && cls.art.icons === false && typeof abilityIcon !== 'undefined') return `url(${abilityIcon(classId, u.icon || u.id)})`;
  const own = `icons/${classId}/${u.id}.png`;
  return typeof ArtProbe !== 'undefined' && ArtProbe.ok(own) === true ? `url(${own})` : `url(icons/${classId}/${u.icon || u.id}.png)`;
};
// the tooltip's meta line for an Ultimate
const ultMeta = u => `Ultimate · ${u.mode === 'window' ? `${u.window.dur}s window` : 'instant'}`;
// Bastion: the hits you take, sampled once a second (a tankbuster tops it up; plain autos trickle in)
function bastionUltHits(k) {
  if (!k.ult || k.now < (k.g.ultHitAt || 0)) return;
  k.g.ultHitAt = k.now + 1;
  const mx = k.env.maxHp ? k.env.maxHp() : 0, taken = k.env.recentDamage ? k.env.recentDamage(1) : 0;
  if (mx > 0 && taken > 0) k.ultGain(Math.min(3, taken / mx * 12));
}

// ----------------------------------------------------------------- TANK ULTIMATES: Bloodreaver and Runeguard
// (Ironpalm, Gorgemaw and Oathbroker add theirs next to their own kits, further down.) All instant. Each one cashes in
// the class's own loop: the effect never calls ultGain or a gauge's gain/spend map (the charge was just spent).
// Bloodreaver: the hits you take (reaverUltHits, once a second) and every Drain you land (3 each, reaverAfterDrain)
ULTIMATES.bloodreaver = {
  id: 'crimsoneclipse', name: 'Crimson Eclipse', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'undying',
  lock: 1.0, dr: 0.3,
  charge: { rate: 0.35, keep: 0.5 },
  desc: 'A red moon swallows the light. Your roar shields the whole party for {s:300} for 10s, and your next three Crimson Drains (Rampages) in that time cost no Blood and hit for {d:120} more, stacking with Frenzy\'s. ' +
    'For those 10s every hit you take is banked in the eclipse. When it ends the bank erupts on your target for {d:600}, up to {d:1200} more the more you took, heals you for 30% of what you took and the whole party for 10%. Undying doubles both heals. ' +
    'You take 30% less damage and can\'t be knocked back while you roar.' +
    '<div class="it-ult"><span><u>Charge:</u> up to 6% for every Drain you land (the bigger the bank it cashes, the more), more for every hit you take, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
  effect(k) {
    const ab = this;
    k.shield('party', 300, 10, { ab });
    k.buff('gorge', 10, {}, 6, 3);
    k.buff('eclipse', 10);
    k.after(10, () => {
      const taken = k.env.recentDamage(10.2);
      k.damage(600 + Math.min(1200, taken / (20 * ENGINE.NUM_SCALE)), { ab, threat: 2 });
      if (taken > 0) { k.healRaw('self', taken * 0.3, { ab }); k.healRaw('party', taken * 0.1, { ab }); }
      k.fx('reaver-eclipse');
    });
  },
};
// a tank's Ultimate fed by the hits it takes, sampled once a second (as Bastion's): per % for each 100% of max HP, at
// most 3 a second (Bloodreaver, Gorgemaw)
function tankUltHits(k, per) {
  if (!k.ult || k.now < (k.g.ultHitAt || 0)) return;
  k.g.ultHitAt = k.now + 1;
  const mx = k.env.maxHp ? k.env.maxHp() : 0, taken = k.env.recentDamage ? k.env.recentDamage(1) : 0;
  if (mx > 0 && taken > 0) k.ultGain(Math.min(3, taken / mx * per));
}
// Runeguard: every Rune spent (2 each: charge.spend), every Ward that soaks enough to refund its Rune (3, runeWardEnd)
// and every hit Mirror Aegis throws back (5, runeguard onNotify)
ULTIMATES.runeguard = {
  id: 'runecataclysm', name: 'Runic Cataclysm', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: 300, anim: 'big', icon: 'sanctum',
  lock: 1.0, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5, spend: { runes: 1.7 } },
  desc: 'Every Rune you hold tears free and comes down on your target: {d:900}, and {d:250} more for each Rune. A Runic Ward of yours still up lends its blast: {d:400} more (the Ward stays). ' +
    'The shattered runes settle round the party as a Sanctum: everyone gets a Ward of {s:350} for 8s and takes 10% less damage for 8s. ' +
    'You take 30% less damage and can\'t be knocked back while you call it down.' +
    '<div class="it-ult"><span><u>Charge:</u> 1.7% for every Rune you spend, 3% for every Ward that refunds its Rune, 5% for every hit Mirror Aegis throws back, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
  effect(k) {
    const ab = this, n = Math.max(0, Math.min(3, k.g.runes || 0)), ward = !!k.g.selfWard;
    k.g.runes = 0;   // (straight to 0: a spend here would feed the charge just spent)
    k.damage(900 + 250 * n + (ward ? 400 : 0), { ab, threat: 2 });
    runeSpent(k, n);
    k.shield('party', 350, 8, { ab });
    k.mitigate('party', 0.1, 8, { ab });
    k.fx('rune-cataclysm', { n, w: ward ? 1 : 0 });
  },
};

// ======================================================================= ALEMBIST (healer, added with classes-b)
// Brewed before it's needed. Three reagents on Q W E: two quick presses brew a vial into the bandolier, and R throws
// one at your heal target (a bomb flies at the enemy instead): the vial on the left, or the one marked with its number
// key (main.js; the mark holds until the throw). Vials ripen (+30% over 10s), then spoil at 40s.
// The bandolier's rules live in k.def.alem, which the specs change: Apothecary { slots 5, ripe 5 }, Volatile
// { fuse 6, heat 4 } (every vial heats up fast and goes off wherever it is) with Catalyst for three-reagent Reactions.
// A thrown vial is a `splash` event: the host finds who stands within r of the ally it lands on (fight.js), and a
// lingering cloud or ward is a floor pool there. The look of a throw rides on k.fx('vial', data) to every client.
const ALEMBIC = {
  FLIGHT: 0.4,      // seconds from the throw to the shatter
  GROW: 0.3,        // a fully ripe (or fully heated) vial is 30% stronger
  RAISE_CD: 30,     // a Mending Draught raises a fallen ally it lands on, once every 30s
  HURT: 0.7,        // an ally below this much health is hurt: Throw glows for a cure, and it charges Magnum Opus more
  KILN: 3,          // cure vials thrown before the Kiln is hot: the next Throw also launches a free Kiln Bomb
  KILN_POT: 900,    // that Kiln Bomb's potency (three heals pay back about two and a half Fire Bombs)
  reagents: {
    E: { name: 'Ember', color: '#ff7a2a' }, D: { name: 'Dew', color: '#4fc8ff' },
    S: { name: 'Salt', color: '#efe6cf' }, Q: { name: 'Quicksilver', color: '#c9d4e6' },
  },
  // two-reagent recipes, keyed by their reagents in sorted order. kind: heal | bomb | ward | salve | quick
  recipes: {
    DD: { name: 'Mending Draught', color: '#4fe0c0', glyph: 'plus', kind: 'heal', text: 'a {h:480} splash heal. It raises a fallen ally it lands on (once every 30s). A raise this way is instant, so it leaves heavy Raise Sickness: 30% less damage and healing for 30s, more for every fall this pull.' },
    EE: { name: 'Fire Bomb', color: '#ff5a1a', glyph: 'flame', kind: 'bomb', text: 'flies at the enemy and hits for {d:360}.' },
    SS: { name: 'Salt Ward', color: '#f4ecd2', glyph: 'ward', kind: 'ward', text: 'a circle of salt: allies inside take 20% less damage for 6s.' },
    DE: { name: 'Steam', color: '#bfe8ec', glyph: 'cloud', kind: 'heal', text: 'a healing cloud: everyone inside heals {h:80} every 1.5s for 9s.' },
    DS: { name: 'Salve', color: '#7ff0a8', glyph: 'drop', kind: 'salve', text: 'shields everyone it splashes for {s:280} and washes off Vulnerability and Damage Down.' },
    ES: { name: 'Quickpowder', color: '#ffd23a', glyph: 'bolt', kind: 'quick', text: 'the whole party acts 10% faster for 10s; allies it splashes heal {h:100} and shake off slows and roots, and the ally it lands on is Galvanized: 10% more damage dealt for 10s.' },
    // Quicksilver (a talent: it takes Salt's place)
    QQ: { name: 'Silver Mirror', color: '#dfe6f2', glyph: 'mirror', kind: 'ward', text: 'a pool of quicksilver: everyone inside keeps a {s:120} shield for 6s.' },
    DQ: { name: 'Silver Tonic', color: '#9fe8ff', glyph: 'plus', kind: 'heal', text: 'a {h:400} splash heal that is up to twice as strong on the badly hurt.' },
    EQ: { name: 'Fulminate', color: '#ffe9a0', glyph: 'flame', kind: 'bomb', text: 'flies at the enemy and goes off twice, {d:260} each.' },
  },
  // Volatile's Reactions: three reagents (Quicksilver counts as Salt). Sealed in the tooltips until you've brewed one.
  reactions: {
    EEE: { name: 'Dragon\'s Breath', color: '#ff3a10', glyph: 'flame', kind: 'bomb', text: 'a {d:560} fire bomb that leaves the enemy burning for {d:70} every 3s for 12s.' },
    DDD: { name: 'Elixir of Life', color: '#6fffd0', glyph: 'plus', kind: 'heal', text: 'a {h:620} splash heal that lingers as a healing mist ({h:60} every 1.5s), and raises the fallen. A raise this way is instant, so it leaves heavy Raise Sickness: 30% less damage and healing for 30s, more for every fall this pull.' },
    SSS: { name: 'Bastion Salt', color: '#fff6dc', glyph: 'ward', kind: 'ward', text: 'a wide salt circle: allies inside take 25% less damage for 8s.' },
    DES: { name: 'Philosopher\'s Draught', color: '#e6c8ff', glyph: 'star', kind: 'heal', text: 'heals the whole party for {h:300} and shields them for {s:180}, wherever they stand.' },
    DEE: { name: 'Brimstone', color: '#ff9a3a', glyph: 'cloud', kind: 'bomb', text: 'a {d:360} bomb on the enemy, and a healing cloud ({h:70} every 1.5s) at your heal target.' },
    DDS: { name: 'Living Salve', color: '#6ff0d0', glyph: 'drop', kind: 'salve', text: 'a {s:400} shield, a cleanse of everything it can wash off, and a short regen ({h:50} every 1.5s).' },
    EES: { name: 'Thunderpowder', color: '#fff070', glyph: 'bolt', kind: 'bomb', text: 'the party acts 15% faster for 12s, and it bursts on the enemy for {d:220}.' },
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
  if (A.fuse) return 1 + ALEMBIC.GROW * Math.min(k.talent('alembist_cask') ? 1.5 : 1, Math.max(0, age / A.heat)) + (k.talent('alembist_whitehot') && v.fuse && v.fuse - k.now <= 2 ? 0.12 : 0);   // (White-Hot, Volatile spec row VII)
  let s = 1 + ALEMBIC.GROW * Math.min(1, Math.max(0, age / A.ripe));
  if (k.talent('alembist_cask') && age > A.ripe) s += Math.min(0.2, (age - A.ripe) / (25 - A.ripe) * 0.2);
  return s;
}
// the throw slot (the heal events name it, so party frames and tooltips know where a heal came from)
const alemAb = k => k.abilities[3];
// a raidwide is on its way (the boss is casting one, or one is next in the feed): Salt and its shields glow
const alemWide = k => { const b = bossNow(k); return !!(b && b.wide); };
// the ally a Throw would land on right now (t), and whether they are hurt enough for a cure (null: can't tell)
function alemHurt(k, t) {
  if (t === undefined) t = k.env.target(alemAb(k) || { target: 'ally' });
  if (t == null || t === true) return null;
  if (typeof t === 'number' && k.env.isDead(t)) return true;
  const f = k.env.allyHp ? k.env.allyHp(t) : null;
  return f == null ? null : f < ALEMBIC.HURT;
}
// which vial Throw takes: the one you marked, or else the oldest (the leftmost). The mark is the vial's id, so it
// stays on that vial as older ones spoil; one that has gone (spoiled, fused, poured into a Blend) leaves the oldest.
function alemPick(k) {
  const vs = k.g.vials; if (!vs.length) return -1;
  const i = k.g.mark != null ? vs.findIndex(v => v.id === k.g.mark) : -1;
  return i >= 0 ? i : 0;
}
// mark the vial in place i (0 = leftmost) for the next Throw: the number keys (main.js), and the bots (bots.js).
// An empty place does nothing. The mark is local to the kit's owner: the throw's events name the vial it took.
function alemMark(k, i) {
  const v = Number.isInteger(i) ? k.g.vials[i] : null; if (!v) return false;
  k.g.mark = v.id;
  return true;
}
// a new vial into the bandolier (false if it's full). o: { copy, batch }
function alemAdd(k, key, o = {}) {
  const A = k.def.alem;
  if (k.g.vials.length >= A.slots) return false;
  const v = { r: key, at: k.now, born: k.now, id: ++k.g.n };
  if (A.fuse) v.fuse = k.now + A.fuse + (k.talent('alembist_cask') ? 2 : 0);
  // Mother Liquor: the same recipe twice in a row starts ripe; Grand Reserve: batch copies start ripe and keep
  if (k.talent('alembist_echo') && !o.copy && k.g.last === key) v.fast = 1;
  if (o.batch && k.talent('alembist_reserve')) v.at = k.now - alemRipeTime(k);
  if (k.g.ripeNext && !o.copy) { k.g.ripeNext = false; v.at = k.now - alemRipeTime(k); }   // (an enhancement on Distill)
  if (o.ripe) v.at = k.now - alemRipeTime(k);   // (a Volatile triple that made no Reaction: its pair, fully heated)
  if (o.batch && k.talent('alembist_reserve')) { if (A.fuse) v.fuse = k.now + 10; else v.keep = true; }
  k.g.vials.push(v);
  k.fxGain(1);   // (item effects: a vial brewed builds the gauge)
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
  let key = alemKey(raw), ripe = false;
  if (raw.length === 3) {
    k.consume('catalyst');
    const rk = alemReactionKey(key);
    if (ALEMBIC.reactions[rk]) {
      key = rk;
      if (k.talent('alembist_flashpoint')) ripe = true;   // (Flashpoint, Volatile spec row VI: a Reaction comes out fully heated)
      k.stats.reactions = (k.stats.reactions || 0) + 1;
      const known = alemKnown(k);
      if (known && !known.has(rk) && k.env.discover) { k.env.discover(rk); k.fx('discover', { r: rk }); }
    } else {
      // no Reaction: the reagent it has two of brews its pair, fully heated (every such triple has a pair)
      const two = raw.find((x, i) => raw.indexOf(x) !== i) || raw[0];
      key = alemKey(two + two); ripe = true;
    }
  }
  alemAdd(k, key, { ripe });
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
  if (k.talent('alembist_ricochet') && k.now >= (k.g.ricoAt || 0)) { k.g.ricoAt = k.now + 15; k.after(1, () => { k.damage(pot * 0.25, { ab }); k.fx('ricochet', { en: c.en.id }); }); }
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
    case 'DD': alemSplash(k, t, { r: k.perk('alembist_w1') ? 132 : 110, heal: 480 * m }); alemRaise(k, c); break;
    case 'EE': alemBomb(k, c, 360 * m, k.perk('alembist_w2') ? 45 * m : 0, 6); break;
    case 'SS': alemSplash(k, t, { pool: { r: 120, ticks: 12, interval: (k.perk('alembist_a2') ? 8 : 6) * m / 12, pct: 0.2 } }); break;
    case 'DE': alemSplash(k, t, { pool: { r: 120, ticks: 6, interval: 1.5, heal: 80 * m, fol: k.talent('alembist_cling') } }); break;
    case 'DS': alemSplash(k, t, { r: 110, sh: 280 * m, cl: 1 }); break;
    case 'ES': k.partyBuff('haste', 0.1, Math.min(13, 10 * m), { ab: alemAb(k) }); alemSplash(k, t, { r: 110, heal: 100 * m, cl: 2, chain: false }); if (!c.self) k.allyBuff(t, 'galvanized', { ab: alemAb(k) }); break;
    case 'QQ': alemSplash(k, t, { pool: { r: 120, ticks: k.perk('alembist_a2') ? 5 : 4, interval: 1.5, sh: 120 * m } }); break;   // (Quicksilver takes Salt's key: the Salt Ward enhancement holds its Mirror a tick longer)
    case 'DQ': alemSplash(k, t, { r: 110, heal: 400 * m, up: 1 }); alemRaise(k, c); break;
    case 'EQ': alemBomb(k, c, 260 * m, 0); if (!c.self && c.en) k.after(1, () => { k.damage(260 * m, { ab: alemAb(k) }); k.fx('ricochet', { en: c.en.id }); }); break;
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
// an enhancement on the 120s: Distill (or Catalyst) comes back
function alemRestock(k) { if (!k.perk('alembist_w3')) return; const d = k.abilities.find(a => k.baseId(a) === 'distill'); if (d) k.refill(d.id); }
// the reagent button (Q W E): usable while there's room in the bandolier
function alemReagentAb(id, x, name, glow, desc) {
  return {
    id, name, type: 'gcd', target: 'none', anim: 'cast', lock: 0.3, reagent: x,
    recastGcd: k => (k.has('distill') ? 0.2 : 1),
    usable: k => k.g.vials.length < k.def.alem.slots,
    glow, desc,
    effect(k) { alemReagent(k, this, x); },
    fx: { color: ALEMBIC.reagents[x].color },
  };
}
// the glows for a mashable floor: keep one heal vial stocked (Dew), otherwise brew bombs (Ember), throw what's ripe
const alemRoom = k => k.g.vials.length < k.def.alem.slots;
const alemHealStock = k => k.g.vials.filter(alemIsHeal).length;
// a raidwide is on its way and nothing in the bandolier shields against it: Salt glows (then Dew, for a Salve)
const alemShieldFor = k => alemWide(k) && !k.g.vials.some(v => !v.parts && ['ward', 'salve'].includes(alemInfo(v.r).kind));
const alemSaltGlow = k => alemRoom(k) && !k.g.half.length && alemShieldFor(k);
// Throw glows when the vial it would take at your target is worth throwing now: a cure for a hurt ally, a shield or
// ward while a raidwide is coming, anything ripe, or anything when the bandolier is full or a vial is about to go
const alemOldestReady = k => {
  const t = k.env.target(alemAb(k) || { target: 'ally' }), i = alemPick(k); if (i < 0) return false;
  const v = k.g.vials[i], kind = v.parts ? 'blend' : alemInfo(v.r).kind;
  if (kind !== 'bomb' && alemHurt(k, t)) return true;
  if ((kind === 'ward' || kind === 'salve') && alemWide(k)) return true;
  return alemStrength(k, v) >= 1 + ALEMBIC.GROW - 0.001 || !alemRoom(k) || (v.fuse && v.fuse - k.now < 2) || (!v.fuse && !v.keep && alemSpoilTime(k) - (k.now - v.born) < 5);
};
// the Kiln: every cure vial thrown adds 1 (up to 3); at 3, the next Throw also launches a free Kiln Bomb at the enemy
function alemKiln(k, v) {
  if (k.g.kiln >= ALEMBIC.KILN) {
    const en = k.env.target({ target: 'enemy', range: RANGED });
    if (en) {
      k.g.kiln = 0;
      k.fx('vial', { r: 'EE', to: null, en: en.id, self: 0, m: 1, kiln: 1 });
      k.after(ALEMBIC.FLIGHT, () => {
        alemBomb(k, { t: null, en, self: false }, ALEMBIC.KILN_POT);
        if (k.talent('alembist_quench')) { k.heal('party', 150, { ab: alemAb(k) }); k.fx('leap', { to: null }); }   // (Quench, Apothecary spec row VII)
      });
      k.stats.kiln = (k.stats.kiln || 0) + 1;
      k.ultGain(2.5);   // (Magnum Opus)
    }
  }
  if (!alemIsBomb(v)) k.g.kiln = Math.min(ALEMBIC.KILN, (k.g.kiln || 0) + (k.talent('alembist_slag') && v.r.length === 3 ? 2 : 1));   // (Slag, Volatile spec row VII: a Reaction heats it twice)
}

KITS.alembist = {
  potMult: 0.73, // balance knob (tools/simulate.js)
  auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'bandolier', key: 'count', max: 3, label: 'Bandolier', w: 200 },
  alem: { slots: 3, ripe: 10, spoil: 40 },
  init: () => ({ half: [], vials: [], count: 0, mark: null, kiln: 0, n: 0, last: null, raiseAt: 0, popAt: -9, popR: null }),
  tick(k) {
    const A = k.def.alem;
    // Forewarned (Apothecary spec row VI): a boss cast ripens every vial and starts its spoil clock over
    if (k.talent('alembist_warn')) onBossCast(k, () => { for (const v of k.g.vials) if (!v.parts) { v.at = Math.min(v.at, k.now - alemRipeTime(k)); v.born = k.now; } k.fx('empower'); });
    for (const v of [...k.g.vials]) {
      if (v.fuse && k.now >= v.fuse) {
        // the fuse runs out in the bandolier: it goes off on you, weaker (Spill: at full strength)
        k.g.vials.splice(k.g.vials.indexOf(v), 1);
        if (k.talent('alembist_slag') && !alemIsBomb(v)) k.g.kiln = Math.min(ALEMBIC.KILN, (k.g.kiln || 0) + 1);   // (Slag, Volatile spec row VII)
        k.stats.fused = (k.stats.fused || 0) + 1;
        alemLaunch(k, v, null, null, alemStrength(k, v) * (k.talent('alembist_spill') ? 1 : 0.6), true);
      } else if (!v.fuse && !v.keep && k.now - v.born >= alemSpoilTime(k) && !(k.g.mark === v.id && k.talent('alembist_cold'))) {   // (Cold Storage, Apothecary spec row VII: the marked vial keeps)
        k.g.vials.splice(k.g.vials.indexOf(v), 1);
        k.wasted('spoiled');
        if (k.talent('alembist_spill')) alemLaunch(k, v, null, null, 0.5, true); else k.fx('spoil', { r: v.r });
      }
    }
    k.g.count = k.g.vials.length;
    // Flask Armour: a full bandolier is armour
    if (k.talent('alembist_flask') && k.g.vials.length >= A.slots && k.now >= (k.g.armorAt || 0)) { k.g.armorAt = k.now + 1; k.mitigate('self', 0.1, 1.2, { ab: alemAb(k) }); }
  },
  // the number keys mark the vial the next Throw takes (main.js: vial1-vial5 in keybinds.js); false for an empty place
  markVial: (k, i) => alemMark(k, i),
  signature: 'Brewing ahead',
  floor: 'Press W twice to brew a Mending Draught, then R on whoever is hurt. Q twice brews a Fire Bomb, and R sends it at the enemy. R throws the vial on the left: press a vial\'s number first to throw that one instead.',
  ceiling: [
    'Two reagents make a vial: Dew + Dew heals, Ember + Ember bombs, Salt + Salt wards, Ember + Dew steams, Dew + Salt shields and cleanses, Ember + Salt hastens the party.',
    'Vials grow 30% stronger over their first 10s and spoil at 40s. Brew in the quiet, throw ripe vials into the storm.',
    'R throws the vial on the left. Press a vial\'s number to mark it for the next R instead; after the throw the mark goes back to the first. While you play an Alembist the number keys are your vials, and F1 to F4 select party members.',
    'Distill decides how you brew: on an empty still your next two reagents are instant; with one reagent already in, it doubles it into a fully ripe vial at once.',
    'Three cure vials heat the Kiln: your next Throw also launches a free Kiln Bomb for {d:900}.',
    'A splash catches everyone near the ally it lands on: aim at the middle of the group.',
  ],
  abilities: [
    alemReagentAb('ember', 'E', 'Ember', k => alemRoom(k) && (k.g.half[0] === 'E' || (!k.g.half.length && alemHealStock(k) >= 1 && !alemShieldFor(k))),
      'A reagent (1s). Two reagents brew a vial: Ember + Ember is a Fire Bomb, Ember + Dew is Steam, Ember + Salt is Quickpowder.'),
    alemReagentAb('dew', 'D', 'Dew', k => alemRoom(k) && (k.g.half[0] === 'D' || ((k.g.half[0] === 'S' || k.g.half[0] === 'Q') && alemWide(k)) || (!k.g.half.length && alemHealStock(k) < 1 && !alemShieldFor(k))),
      'A reagent (1s). Two reagents brew a vial: Dew + Dew is a Mending Draught, Dew + Ember is Steam, Dew + Salt is Salve.'),
    alemReagentAb('salt', 'S', 'Salt', alemSaltGlow,
      'A reagent (1s). Two reagents brew a vial: Salt + Salt is a Salt Ward, Salt + Dew is Salve, Salt + Ember is Quickpowder. It glows while a raidwide is on its way and you hold no Salt Ward or Salve.'),
    {
      id: 'throw', name: 'Throw', type: 'gcd', target: 'ally', allowDead: true, anim: 'cast', lock: 0.35, recastGcd: 1.25,
      label: k => { const i = alemPick(k); return i < 0 ? 'Throw' : (k.g.vials[i].parts ? 'Grand Blend' : alemInfo(k.g.vials[i].r).name); },
      usable: k => k.g.vials.length > 0,
      glow: k => alemOldestReady(k),
      desc: 'Throw a vial at your heal target (1.25s): it shatters and splashes everyone close by; a bomb flies at the enemy instead. Throw takes the vial on the left, or the one you marked with its number key (the mark holds until you throw, then goes back to the first). Every vial that is not a bomb heats the Kiln by 1: at 3, your next Throw also launches a free Kiln Bomb for {d:900}. Vials grow 30% stronger over 10s, and spoil after 40s.',
      effect(k, t) {
        const i = alemPick(k); if (i < 0) return;
        const v = k.g.vials.splice(i, 1)[0];
        const str = k.g.mark === v.id && k.talent('alembist_label') ? Math.max(alemStrength(k, v), 1 + ALEMBIC.GROW) : alemStrength(k, v);   // (Labelled Shelf, Apothecary spec row VI: a marked vial goes out ripe)
        k.g.mark = null; k.g.count = k.g.vials.length;
        const en = alemIsBomb(v) ? k.env.target({ target: 'enemy', range: RANGED }) : null;
        alemUltThrow(k, v, t, str);   // (Magnum Opus; before the Kiln, which can fill it too)
        alemLaunch(k, v, t, en, str, false);
        alemKiln(k, v);
      },
      fx: { color: '#ffd27a' },
    },
    {
      id: 'distill', name: 'Distill', type: 'ogcd', target: 'self', cd: 30, anim: 'cast', lock: 0.3,
      desc: 'On an empty still: your next brew is instant (your next two reagents come off the global cooldown at once). With one reagent already in the still: it doubles, and that pair\'s vial is brewed at once, fully ripe (Ember: a ripe Fire Bomb, Dew: a ripe Mending Draught).',
      label: k => (k.g.half.length === 1 && alemRoom(k) ? 'Double' : 'Distill'),
      effect(k) {
        if (k.g.half.length === 1 && alemRoom(k)) { const x = k.g.half[0]; k.g.half = []; alemAdd(k, alemKey(x + x), { ripe: true }); k.stats.doubled = (k.stats.doubled || 0) + 1; }
        else k.buff('distill', 15, {}, 2, 2);
        if (k.perk('alembist_a4')) k.g.ripeNext = true;
        if (k.talent('alembist_flash') && k.g.last) alemAdd(k, k.g.last, { copy: true });
        if (k.talent('alembist_fume')) k.mitigate('party', 0.1, 8, { ab: this });
      },
      fx: { color: '#bfe8ec' },
    },
    {
      id: 'batch', name: 'Grand Batch', type: 'ogcd', target: 'self', cd: 120, anim: 'big', lock: 0.3,
      desc: 'Fill every empty slot in your bandolier with copies of the last vial you brewed.',
      usable: k => !!k.g.last && alemRoom(k),
      effect(k) { while (alemAdd(k, k.g.last, { copy: true, batch: true })); alemRestock(k); },
      fx: { color: '#ffb84a' },
    },
  ],

};

if (typeof module !== 'undefined') {
  // the talent helpers the specs share (a browser has them as globals)
  module.exports = { KITS, DASH, TAUNT, TAUNT_CARRY, tauntNote, tauntIconBg, ULTIMATES, ultIconBg, ultMeta, bastionUltHits, MELEE, RANGED, bossNow, bossCasting, onBossCast, castHold, hpOf, abBase, targetDown, kitMove,
    BASTION, bastionCanEdge, bastionRadiate, bastionTurned, bastionBanner, bastionGain, bastionCost, bastionSpend, bastionBraceDur, bastionInHallow, bastionBlade, bastionEdge, bastionGuard, bastionPerfect, bastionTick,
    REAVER, reaverBank, reaverWound, reaverWarm, reaverCash, reaverDrainOk, reaverDrainGlow, reaverDrainCost, reaverTick, reaverGain, reaverHackHeal, reaverDrainPot, reaverAfterDrain, reaverRetaliate, reaverLetting, reaverExpire,
    runeGain, runeSpent, runeEmergency, runeWardCost, runeWardUp, runeWardEnd, runeGlyph, runeGlyphguard, runeGlyphguardEnd,
    rangerTrack, rangerKeenChance, rangerFocusFire, rangerShot, rangerFocus, rangerKeen, rangerNoKeen, rangerRhythm, rangerFeed, rangerQuickAfter, rangerPierce, rangerMark,
    bladeCombo, bladeMult, bladeOpts, bladeFinisher, bladeStep, bladePoise, rangerRapidCost, pyroStoke, pyroLight, pyroVent, pyroTick, pyroWildfire, pyroBurst,
    clericGrow, clericBloom, clericFirstLight, clericHeld, clericInSanctum, clericSmite, clericDawnstar, clericPetal, clericBless, clericTick,
    groveGain, groveMoonfire, groveWrath, groveSproutGcd, groveRejuv, groveGrowth, groveBloom, groveTick, GROVE_THORN_BLOOM, groveRebirthDead,
    chronoFlux, chronoLate, chronoBolt, chronoBoltAfter, chronoInstant, chronoAccel, chronoSecondChance,
    CHRONO_PARADOX, chronoParadox, chronoRewindCost, chronoQuicken, CHRONO_STASIS, chronoStasis, chronoRelease, chronoWideDone };
  // Alembist (classes-b)
  Object.assign(module.exports, { ALEMBIC, alemKey, alemReactionKey, alemInfo, alemIsBomb, alemIsHeal, alemKnown, alemBook, alemSavedKnown, alemRipeTime,
    alemSpoilTime, alemStrength, alemAb, alemPick, alemMark, alemAdd, alemReagent, alemShieldAmt, alemSplash, alemBomb, alemRaise, alemRecipe, alemGoOff, alemLaunch,
    alemReagentAb, alemRoom, alemHealStock, alemOldestReady, alemWide, alemHurt, alemKiln, alemShieldFor, alemSaltGlow });
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
// Pushing past ±5 overloads you: Overheat (fire locked for 3s, and you burn) or Frostbite (casts 30% slower for 3s).
// Zenith (k.def.corona) holds the edge for a run of crits, building Corona. Pendulum (k.def.stepBonus) moves it a step further.
const THERMIST = { STEP: 0.08, EDGE: 5, SHOCK_MIN: 3, SHOCK_BASE: -120, SHOCK_PER: 105 };
// Zenith: every edge cast adds a Corona and keeps you at the edge; the one that fills it (3, or 5 in Red Giant) leaves you
// On the Brink. The next Thermal Shock spends them all (+25% each); Sunset drops them as falling stars. They fade 12s after the last edge cast.
const CORONA = { MAX: 3, GIANT: 5, SHOCK: 0.25, FADE: 12, STAR: 170, SLAG: 40, GIANT_DUR: 8, GIANT_HIT: 1.5 };
const coronaCap = k => (k.has('redgiant') ? CORONA.GIANT : CORONA.MAX);
const THERM_SHOCK = { id: 'shock', name: 'Thermal Shock' };
const thermAt = (k, n) => Math.abs(k.g.temp) >= n;
// a spell's bonus from where the dial stands: +8% per step on its own side (both sides count while Attuned)
function thermMult(k, el) {
  const t = k.g.temp, side = k.has('attuned') ? Math.abs(t) : Math.max(0, el * t);
  return 1 + THERMIST.STEP * side;
}
// is this element's big spell being cast at its own edge (Flare at +5, Glacier Lance at -5)?
const thermEdgeCast = (k, el) => k.g.temp === el * THERMIST.EDGE;
// a big Thermist spell's cast time (Cinder Bolt and Rime Shard are always instant): instant after a Shock with Rebound,
// at its own edge, or after a quick spell with Flicker. Only looks: asking must never spend Rebound (thermSpell does).
function thermCast(k, el, base, edge) {
  if (k.has('rebound') || k.has('flicker') || (edge && thermEdgeCast(k, el))) return 0;
  return base;
}

// one Thermist spell: el +1 fire / -1 frost, moving the dial `steps` (plus Pendulum's extra step) after it hits.
// o.edge: a big spell with the edge rule (at its own edge: instant, a sure crit, and On the Brink instead of moving;
// for a Zenith a Corona instead, and On the Brink only once the Corona is full).
function thermSpell(k, ab, el, steps, pot, o = {}) {
  const edge = !!o.edge && thermEdgeCast(k, el);
  k.consume('rebound');
  if (o.edge) k.consume('flicker');
  else if (o.quick && k.talent('thermist_flicker')) k.buff('flicker', 6);   // Flicker: a quick spell readies an instant big one
  thermBrink(k, el);
  // (Red Giant: the edge casts past the usual three, the 4th and 5th, burn half again as hot)
  const giant = edge && k.def.corona && k.stacks('corona') >= CORONA.MAX;
  const mult = thermMult(k, el) * (o.mult || 1) * thermPerk(k, ab, el) * (giant ? CORONA.GIANT_HIT : 1);
  const r = k.damage(pot, { ab, mult, autoCrit: edge });
  // (Twin Stars: a Zenith's twin follows only the edge cast that fills the Corona, at 45%)
  if (edge && k.talent('thermist_twin') && (!k.def.corona || k.stacks('corona') + 1 >= coronaCap(k))) k.after(0.3, () => { k.damage(pot * (k.def.corona ? 0.45 : 0.3), { ab, mult, extra: true }); k.fx('twin', { el }); });
  if (edge && k.talent('thermist_afterglow')) k.dot(el > 0 ? 'afterglow' : 'afterfrost', 42, 9, 3, { ab });
  if (el > 0 && k.talent('thermist_embers') && k.g.temp >= 3) k.g.embers = Math.min(3, (k.g.embers || 0) + 1);
  if (edge) k.ultGain(THERM_ULT.GAIN_EDGE);   // (Supernova: an edge cast)
  if (edge && k.def.corona) thermCorona(k, el);
  else if (edge) k.buff('brink', 6, { el });   // held at the edge: the same element next overloads you
  else thermMove(k, el * (steps + (k.def.stepBonus || 0)));
  return r;
}
const thermPerk = (k, ab, el) => (((ab.replaces || ab.id) === 'cinder' && k.perk('thermist_w1') && k.g.temp >= 3) ? 1.2 : (ab.id === 'lance' && k.perk('thermist_w3') && k.g.temp <= -3) ? 1.15 : 1) * (el ? 1 : 1);
// Zenith: an edge cast adds a Corona and keeps you at the edge; the one that fills it leaves you On the Brink
function thermCorona(k, el) {
  const cap = coronaCap(k);
  k.buff('corona', CORONA.FADE, { el }, cap, 1);
  k.fx('corona', { n: k.stacks('corona'), el });
  if (k.talent('thermist_slag')) k.shield('self', CORONA.SLAG, 6, { ab: abBase(k, 'flare') });   // (Slag Plate, Zenith's spec row VI)
  if (k.stacks('corona') >= cap) k.buff('brink', 6, { el });
}
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
    thermOverload(k, Math.sign(delta));
  }
  if (t1 !== k.g.temp) k.fxGain(1);   // (item effects: the dial moving builds the gauge)
  k.g.temp = t1;
  thermSettle(k, t1, 1);
}
// the dial has landed on t1: a crossing after a big enough peak is a Thermal Shock; then the side and peak update
// (o.keep: a Shock that leaves a Zenith's Corona for the next one, Solstice's echo)
function thermSettle(k, t1, shockMult, o) {
  const g = k.g;
  if (t1 !== 0 && g.side && Math.sign(t1) !== g.side) {
    const swing = g.peak + Math.abs(t1);
    if (g.peak >= THERMIST.SHOCK_MIN) {
      thermShock(k, swing, shockMult, Math.sign(t1), o);
    }
    if (k.def.momentum) k.buff('momentum', 6, {}, 5, 1);   // Pendulum: every crossing swings harder
    if (k.talent('thermist_counterweight')) k.shield('self', 30 * k.stacks('momentum'), 6, { ab: THERM_SHOCK });   // (Counterweight, Pendulum's spec row VI)
    g.peak = Math.abs(t1);
  } else if (t1 !== 0) g.peak = Math.max(g.peak, Math.abs(t1));
  if (t1 !== 0) g.side = Math.sign(t1);
  // the way the swing is going (for the glowing button): turn back at the edge, or a step short of it for Pendulum
  const turn = THERMIST.EDGE - (k.def.stepBonus || 0);
  if (t1 >= turn) g.dir = -1; else if (t1 <= -turn) g.dir = 1;
}
function thermShock(k, swing, mult = 1, to = 1, o = {}) {
  if (k.g.latent) { mult *= 1.5; k.g.latent = 0; }
  const corona = o.keep ? 0 : k.stacks('corona');   // (Zenith: the Shock spends every Corona, +25% each)
  if (corona) { mult *= 1 + CORONA.SHOCK * corona; k.clear('corona'); }
  const pot = Math.max(0, THERMIST.SHOCK_BASE + THERMIST.SHOCK_PER * swing) * mult;
  const r = k.damage(pot, { ab: THERM_SHOCK, autoCrit: k.talent('thermist_crescendo') && k.stacks('momentum') >= 5 });   // (Crescendo, Pendulum's spec row VI)
  k.stats.shocks = (k.stats.shocks || 0) + 1;
  k.ultGain(THERM_ULT.GAIN_SWING * swing * (k.def.stepBonus ? THERM_ULT.PEND : 1));   // (Supernova; Pendulum shocks far more often)
  k.fx('shock', { s: swing, c: to, corona });
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
// the boss beginning a cast: Tolling Bell (Pendulum) swings the dial, Red Alert (Zenith) readies Sunset
function thermTick(k) {
  const g = k.g;
  // Tolling Bell (Pendulum's spec row VII): the boss begins a cast and the dial swings two steps toward the other side
  const cast = bossCasting(k);
  if (k.talent('thermist_bell') && cast && !g.bellSeen) { const s = Math.sign(g.temp) || (g.side || 1); thermMove(k, -s); k.fx('invert'); }
  // Red Alert (Zenith's spec row VII): the boss begins a cast while you hold 2 or more Corona, and Sunset is ready at once
  if (k.talent('thermist_alert') && cast && !g.bellSeen && k.stacks('corona') >= 2) { k.refill('sunset'); k.fx('empower'); }
  g.bellSeen = cast;
}
// Equilibrium: the dial snaps to 0 behind a shield sized by how far it fell
// (o.stay: Sunset with Solar Wind leaves the dial where it is, the shield still sized as if it fell; o.big: Cold Front's test)
function thermEquil(k, ab, o = {}) {
  const fell = Math.abs(k.g.temp), from = Math.sign(k.g.temp);
  k.shield('self', 70 * Math.max(1, fell) * (k.perk('thermist_a2') ? 1.5 : 1), 8, { ab });
  k.clear('brink');
  if (o.stay) { thermUtility(k, ab, o.big); return; }
  // the dial snaps to 0 but the swing is kept: side and peak stay, so the next spell across 0 still detonates a Shock
  // sized by the stored peak (unless Equilibrium Pulse sets that heat off right here)
  k.g.temp = 0;
  if (k.talent('thermist_deadcentre')) { k.buff('momentum', 6, {}, 5, 1); k.fx('empower'); }   // (Dead Centre, Pendulum's spec row VII: it counts as a crossing for Momentum)
  thermUtility(k, ab, o.big ?? fell >= 4);
  if (fell >= THERMIST.SHOCK_MIN && k.talent('thermist_pulse')) { Object.assign(k.g, { side: 0, peak: 0 }); thermShock(k, fell, 1, -from); }
}
// Sunset (Zenith, in Equilibrium's place): every Corona falls on the target as a star, then it is Equilibrium
function thermSunset(k, ab) {
  const n = k.stacks('corona');
  k.clear('corona');
  for (let i = 0; i < n; i++) k.after(0.2 + 0.12 * i, () => k.damage(CORONA.STAR, { ab, extra: true }));
  if (n) k.fx('sunset', { n });
  thermEquil(k, ab, { stay: k.talent('thermist_solarwind'), big: n >= 2 });   // (Solar Wind, Zenith's spec row VI)
}
// the Equilibrium / Sunset talents that don't depend on which one it is
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
  if (k.talent('thermist_solstice')) k.after(5, () => { const t = k.g.temp; if (t) { k.g.temp = -t; thermSettle(k, -t, 0.6, { keep: true }); k.fx('invert'); } });
}
// which spell keeps the swing going (the glowing button): the edge spell, the big step, or the small step
function thermPlan(k) {
  const t = k.g.temp, sb = k.def.stepBonus || 0, s = Math.sign(t);
  const brink = k.has('brink') ? k.buffs.get('brink').data.el : 0;
  if (Math.abs(t) === THERMIST.EDGE && !brink && !(s > 0 && k.has('overheat'))) return s > 0 ? 'flare' : 'lance';
  let dir = brink ? -brink : Math.abs(t) === THERMIST.EDGE ? -s : (k.g.dir || 1);
  if (dir > 0 && k.has('overheat')) dir = -1;
  for (let pass = 0; pass < 2; pass++, dir = -dir) {
    if (Math.abs(t + dir * (2 + sb)) <= THERMIST.EDGE) return dir > 0 ? 'flare' : 'lance';
    if (Math.abs(t + dir * (1 + sb)) <= THERMIST.EDGE) return dir > 0 ? 'cinder' : 'rime';
  }
  return 'lance';
}

KITS.thermist = {
  potMult: 0.88, // balance knob (tools/simulate.js)
  auto: { kind: 'thermo', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'dial', key: 'temp', max: 5, label: 'Temperature' },
  init: () => ({ temp: 0, side: 0, peak: 0, dir: 1, embers: 0, latent: 0 }),
  haste: k => (k.has('frostbite') ? 1.3 : 1),
  tick: k => thermTick(k),
  // (On the Brink simply runs out after 6s: only casting the same element again overloads you)
  signature: 'Thermal Shock',
  floor: 'Press the glowing spell. Q and W are instant, so they\'re your spells on the move. F when it glows, and D before a big hit.',
  ceiling: [
    'Swing the whole dial: build to +5 with fire, then carry it across 0 with frost. The swing that crosses 0 detonates a Thermal Shock, and the further you swung (from +5 down to -1 is 6), the bigger it is.',
    'Every step from 0 is +8% damage for that side\'s spells, so a spell at the far end of a swing hits hardest. Spells that move you toward 0 gain nothing.',
    'At +5 Flare is instant and always crits, but leaves you On the Brink for 6s: a fire spell next overheats you, frost (or nothing) is safe. Glacier Lance is the same at -5. Cinder Bolt and Rime Shard are always instant: weave them in when you have to move.',
    'Inversion flips the dial: at ±5 that is a swing of 10, half again as strong, and Attunement lets both elements count for 10s. Save it for burst windows. Equilibrium is your mitigation: it snaps the dial back to 0 but keeps the swing, so your next spell across 0 still detonates a Shock sized by how far you had swung.',
  ],
  abilities: [
    {
      id: 'cinder', name: 'Cinder Bolt', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: 1,
      recastGcd: 1.5,
      desc: 'Instant, 1.5s recast: a quick fire bolt for {d:210}. Turns the dial 1 toward Blaze. Your spell on the move.',
      usable: k => !k.has('overheat'),
      glow: k => thermPlan(k) === 'cinder',
      effect(k) { thermSpell(k, this, 1, 1, 210, { quick: true }); },
      fx: { type: 'projectile', style: 'fire', color: '#ff8a3a', range: RANGED, speed: 800 },
    },
    {
      id: 'rime', name: 'Rime Shard', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: -1,
      recastGcd: 1.5,
      desc: 'Instant, 1.5s recast: a quick shard of ice for {d:210}. Turns the dial 1 toward Rime. Your spell on the move.',
      glow: k => thermPlan(k) === 'rime',
      effect(k) { thermSpell(k, this, -1, 1, 210, { quick: true }); },
      fx: { type: 'projectile', color: '#8fd8ff', range: RANGED, speed: 900 },
    },
    {
      id: 'flare', name: 'Flare', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: 1,
      cast: k => thermCast(k, 1, 2, true),
      desc: '2s cast: a burst of fire for {d:400}. Turns the dial 2 toward Blaze. At +5 it\'s instant and always crits, but holds you On the Brink for 6s: if your next spell is fire too, you overheat.',
      usable: k => !k.has('overheat'),
      glow: k => thermPlan(k) === 'flare',
      effect(k) { thermSpell(k, this, 1, 2, 400, { edge: true }); },
      fx: { type: 'projectile', style: 'fire', color: '#ff5a1a', range: RANGED, speed: 700 },
    },
    {
      id: 'lance', name: 'Glacier Lance', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast', el: -1,
      cast: k => thermCast(k, -1, 2, true),
      desc: '2s cast: a lance of ice for {d:400}. Turns the dial 2 toward Rime. At -5 it\'s instant and always crits, but holds you On the Brink for 6s: if your next spell is frost too, you get frostbite.',
      glow: k => thermPlan(k) === 'lance',
      effect(k) { thermSpell(k, this, -1, 2, 400, { edge: true }); },
      fx: { type: 'line', color: '#bfe8ff', range: 440 },
    },
    {
      id: 'equil', name: 'Equilibrium', type: 'ogcd', target: 'self', cd: 30, anim: 'cast',
      desc: 'Snap the dial back to 0 behind a shield: {s:70} for every step it fell. The swing is kept: your next spell across 0 still sets off a Thermal Shock sized by how far you had swung. It also clears On the Brink. Glows while the boss is casting and the dial stands 3 or more out.',
      glow: k => bossCasting(k) && thermAt(k, 3),
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
// Drift comes mostly from movement moves (a Passing Strike gives 10, Hook Turn 15, Slipstream 15); walking fills 15/s,
// and standing still drains 15/s after a 1.5s hold. Most moves hit harder with it. Running through an enemy's body is a Passing Strike. Slipstream lays a wind lane (re-entering it gives Drift back; on every
// client it also speeds up whoever walks along it). Orbit (k.def.orbit) and Comet (k.def.driftMax, k.def.straight).
const DRIFT = { FILL: 15, STRAIGHT: 22, DRAIN: 15, HOLD: 1.5, ICD: 0.45, LANE_DRIFT: 15, PASS: 10, HOOK: 15 };
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
  // the spec rows' reactions to the boss's casts (Orbit: Eye of the Hawk; Comet: Zenith)
  if (k.talent('driftblade_eye')) onBossCast(k, () => { const gain = 5 - k.stacks('orbit'); k.buff('orbit', 5, {}, 5, 5); if (gain > 0) { k.damage(60 * gain, { ab: k.abilities[0], extra: true }); k.fx('orbitcut'); } });
  else if (k.talent('driftblade_zenith')) onBossCast(k, () => { k.buff('zenith', 5); k.fx('empower'); });
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
    // (Eye of the Gale, the Ultimate: no 1.5s hold, and standing still drains twice as fast)
    const eye = driftEye(k), held = k.has('gale') || k.has('still') || k.has('roost') || k.has('zenith') || (!eye && g.stillT < (k.def.driftHold || DRIFT.HOLD));
    if (!held) g.drift = Math.max(0, (g.drift || 0) - DRIFT.DRAIN * (eye ? 2 : 1) * dt);
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
  // (inside Eye of the Gale every pass is a long gale line: DRIFT_ULT)
  const eye = driftEye(k), gale = k.has('gale');
  k.damage(eye ? (DRIFT_ULT.LINE + DRIFT_ULT.LINE_D * driftK(k)) * (gale ? 2 : 1) : 90 * (1 + driftK(k)) * (gale ? 3 : 1), { ab: DRIFT_PASS, tgt });
  k.stats.passes = (k.stats.passes || 0) + 1;
  driftAdd(k, DRIFT.PASS);
  k.fx(eye ? 'drift-gale' : 'pass', { g: gale ? 1 : 0 });
  k.ultGain(DRIFT_ULT.GAIN_PASS);
  if (k.talent('driftblade_razor')) { k.g.razor = Math.min(3, (k.dots.has('razor') ? k.g.razor || 0 : 0) + 1); k.dots.delete('razor'); k.dot('razor', 16 * k.g.razor, 6, 2, { ab: DRIFT_PASS, tgt }); }
  if (k.has('gale') && k.talent('driftblade_hurricane') && (k.g.galeAdd || 0) < 6) { k.g.galeAdd = (k.g.galeAdd || 0) + 1; k.buff('gale', 1); k.buffs.get('gale').end += 1; }
}
// Orbit: every radian you circle round your target close in is a stack (up to 5, gone 5s after you stop);
// at 5, Carve cuts on its own every 1.4s while you keep moving
function driftOrbit(k, pos, moving) {
  const g = k.g;
  if (k.has('roost')) { k.buff('orbit', 5, {}, 5, 5); driftOrbitCut(k); }   // (Roost, spec row VII: a full Orbit that needs no circling)
  const t = moving && pos ? k.env.target(DRIFT_NEAR) : null;
  if (!t || t.x == null) { g.orbA = null; g.loop = 0; return; }   // (stop circling and the loop starts over)
  const a = Math.atan2(pos.y - t.y, pos.x - t.x), da = g.orbA != null ? Math.abs(driftAngDiff(a, g.orbA)) : 0;
  g.orbAcc = (g.orbAcc || 0) + da;
  g.orbA = a;
  while (g.orbAcc >= 1) { g.orbAcc -= 1; k.buff('orbit', 5, {}, 5, 1); }
  driftLoop(k, da);
  driftOrbitCut(k);
}
// Full Circle: every whole loop flown unbroken round the target close in (a Hook Turn is half of one) ends in a dive:
// the hawk stoops on it (DRIFT_STOOP_POT, up to 30% more with Drift) and the dive gives 10 Drift
const DRIFT_STOOP = { id: 'stoop', name: 'Full Circle' }, DRIFT_STOOP_POT = 70;
function driftLoop(k, da) {
  const g = k.g;
  g.loop = (g.loop || 0) + da;
  if (g.loop < Math.PI * 2) return;
  g.loop -= Math.PI * 2;
  if (!k.env.target(DRIFT_NEAR)) return;
  k.damage(DRIFT_STOOP_POT * (1 + 0.3 * driftK(k)), { ab: DRIFT_STOOP });
  driftAdd(k, 10);
  k.stats.stoops = (k.stats.stoops || 0) + 1;
  k.fx('stoop');
}
// the full-Orbit cut: Carve strikes on its own every 1.4s (1s in Roost); Spiral In (spec row VI) makes each one 5% harder than the last (up to 25%)
function driftOrbitCut(k) {
  const g = k.g;
  if (k.stacks('orbit') < 5) { g.spiral = 0; return; }
  if (k.now >= (g.orbCutAt || 0) && k.env.target(DRIFT_REACH)) {
    g.orbCutAt = k.now + (k.has('roost') ? 1 : 1.4);
    const m = k.talent('driftblade_spiral') ? 1 + 0.05 * (g.spiral || 0) : 1;
    g.spiral = Math.min(5, (g.spiral || 0) + 1);
    k.damage(80 * m * (1 + 0.3 * driftK(k)), { ab: k.abilities[0], extra: true });
    k.fx('orbitcut');
  }
}
function driftSpend(k, d, full) {
  k.ultGain(DRIFT_ULT.GAIN_CROSS * d / full * Math.sqrt(full / 100));   // (Eye of the Gale: a Crosswind, or Comet's rarer, bigger Impact)
  if (k.talent('driftblade_second') && d >= full * 0.8) driftAdd(k, full * 0.1);
}
function driftHook(k, ab) {
  // Ricochet (Comet, spec row VI): a Hook Turn soon after Impact flings you back through the boss
  if (k.talent('driftblade_ricochet') && k.consume('ricochet')) {
    const tg = k.env.target({ target: 'enemy', range: 300 });
    if (tg) { k.g.passAt = k.now + DRIFT.ICD; driftPass(k, tg); }
    driftAdd(k, 20);
  }
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
  potMult: 0.685, // balance knob (tools/simulate.js)
  auto: { kind: 'sabre', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'drift', key: 'drift', max: 100, label: 'Drift' },
  init: () => ({ drift: 0, lanes: [], stillT: 0 }),
  tick: k => driftTick(k),
  onNotify(k, type) { if (type === 'perfect') driftRiposte(k); },
  signature: 'Drift and Passing Strikes',
  floor: 'Press Q to cut, W and E whenever they\'re up (they give the most Drift), and R when the gauge is full. Run through the boss when you can.',
  ceiling: [
    'Drift comes mostly from your movement moves: a Passing Strike gives 10, Hook Turn 15, Slipstream 15. Walking fills 15 a second; stand still for more than 1.5s and it drains 15 a second. Nearly everything hits harder with it.',
    'Running clean through an enemy\'s body is a Passing Strike, stronger with Drift. Every dodge can carry you through the boss instead of away from it.',
    'Hook Turn swings you to the far side of your target and gives back a dash charge: chain it with Slipstream and the shared dash for long runs. Above 70 Drift it always crits.',
    'Crosswind spends everything: fire it full. Save Gale Run for stretches where the fight makes you move: for 12s Drift can\'t drain and Passing Strikes hit three times as hard.',
  ],
  abilities: [
    {
      id: 'carve', name: 'Carve', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'A sabre cut for {d:240}, up to 30% stronger with Drift. At 50 Drift or more a second cut, 30% as strong, follows through.',
      effect(k) {
        const m = 1 + 0.3 * driftK(k), crit = k.consume('tailwind');
        k.damage(240 * m, { ab: this, autoCrit: crit });
        if (k.g.drift >= 50) k.after(0.15, () => k.damage(240 * (k.perk('driftblade_w1') ? 0.5 : 0.3) * m, { ab: this, extra: true }));
        if (k.talent('driftblade_crescent') && k.env.moving() && (k.g.cres = (k.g.cres || 0) + 1) >= 3) {
          k.g.cres = 0; k.after(0.25, () => { k.damage(210 * m, { ab: this, extra: true }); k.fx('crescent'); });
        }
        if (k.talent('driftblade_hover') && !k.env.moving()) driftAdd(k, 10);   // Hover: cutting in place keeps the wind up
        if (k.def.carveDrift) driftAdd(k, k.def.carveDrift);   // (Comet: every cut winds the charge a little)
      },
      fx: { type: 'slash', color: '#bff8e8', r: 56, span: 1.8 },
    },
    {
      id: 'slip', name: 'Slipstream', type: 'ogcd', target: 'none', charges: 2, cd: 14, lock: 0.3, anim: 'dash',
      desc: 'Dash 180 px the way you\'re heading and leave a wind lane for 6s. Anyone moving along it goes faster, and stepping back onto it gives you 15 Drift. The dash itself gives 15 Drift. Dashing through an enemy is a Passing Strike. Two charges.',
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
      desc: 'Swing round your target to its far side with a cut for {d:260}, up to 40% stronger with Drift. Above 70 Drift it always crits. Gives 15 Drift and gives back a dash charge.',
      glow: k => k.g.drift >= 70,
      effect(k) {
        const crit = k.g.drift >= 70;
        k.teleport('around', { ab: this });
        k.damage(260 * (1 + 0.4 * driftK(k)), { ab: this, autoCrit: crit });
        if (k.env.refundDash) k.env.refundDash();
        driftAdd(k, DRIFT.HOOK);
        driftHook(k, this);
      },
      fx: { type: 'slash', color: '#9ff0e0', r: 64, span: 3.2 },
    },
    {
      id: 'cross', name: 'Crosswind', type: 'gcd', target: 'enemy', range: 300, anim: 'big',
      desc: 'Spend all your Drift on a blade of wind: {d:120}, plus {d:70} for every 10 Drift you spend.',
      usable: k => k.g.drift >= 20,
      glow: k => k.g.drift >= 80,
      effect(k) {
        const d = k.g.drift; k.g.drift = 0;
        const r = k.damage(120 + 7 * d, { ab: this });
        const orb = k.stacks('orbit');
        if (orb >= 3 && k.talent('driftblade_slingshot')) {   // Slingshot (Orbit, spec row VI): the Orbit goes with it
          k.clear('orbit'); k.g.orbAcc = 0;
          k.after(0.3, () => { k.damage(40 * orb, { ab: this, extra: true }); k.fx('crescent'); });
        }
        if (d >= 90 && k.perk('driftblade_w2')) { k.damage((120 + 7 * d) * 0.3, { ab: this }); k.fx('empower'); }
        driftSpend(k, d, 100);
        return r;
      },
      fx: { type: 'line', color: '#dffff6', range: 300 },
    },
    {
      id: 'still', name: 'Stillpoint', type: 'ogcd', target: 'self', cd: 25, lock: 0.5, anim: 'brace',
      desc: 'Stop and parry for 2s: 50% less damage, and your Drift holds instead of draining. Catch a hit in the first moment and you riposte for {d:320} (up to 50% more with Drift).',
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
    desc: 'Instant: a {d:170} bolt that swings the dial 2 steps toward the other side (toward Rime from 0). It counts as the element it swings toward, and hits 8% harder for every step from 0 you started.',
    glow: k => thermAt(k, 3) && !(k.has('brink') && k.buffs.get('brink').data.el === -Math.sign(k.g.temp)),
    effect(k) { const t = k.g.temp, el = t > 0 ? -1 : t < 0 ? 1 : -1; thermSpell(k, this, el, 2, 170, { mult: 1 + THERMIST.STEP * Math.abs(t) }); },
    fx: { type: 'projectile', color: '#e4a8ff', range: RANGED, speed: 1000 },
  };
  TALENT_ABILITIES.thermist_thermocline = { cls: 'thermist', ab: thermocline,
    spec: { pendulum: Object.assign({}, thermocline, { desc: 'Instant: a {d:170} bolt that swings the dial 3 steps toward the other side (toward Rime from 0). It counts as the element it swings toward, and hits 8% harder for every step from 0 you started.' }) } };
  TALENT_ABILITIES.thermist_zero = { cls: 'thermist', ab: {
    id: 'zero', replaces: 'rime', icon: 'rime', name: 'Absolute Zero', type: 'gcd', target: 'enemy', range: RANGED, cast: 2, cd: 45, anim: 'big', el: -1,
    desc: '2s cast, 45s cooldown: the dial plunges straight to -5, wherever it was. It hits for {d:100}, plus {d:15} for every step it fell, and from 3 or more on the hot side that crossing is a Thermal Shock of up to 10.',
    glow: k => k.g.temp >= 3,
    effect(k) {
      const fell = k.g.temp + THERMIST.EDGE;
      thermBrink(k, -1);
      k.damage(100 + 15 * fell, { ab: this, mult: thermMult(k, -1) });
      k.g.temp = -THERMIST.EDGE; thermSettle(k, -THERMIST.EDGE, 1);
    },
    fx: { type: 'zone', color: '#bfe8ff', r: 80, range: RANGED, dur: 1 },
  } };
  const gyre = {
    id: 'gyre', replaces: 'hook', icon: 'hook', name: 'Gyre', type: 'ogcd', target: 'enemy', range: MELEE, charges: 2, cd: 10, lock: 0.5, anim: 'attack',
    desc: 'Loop once round your target, cutting it for {d:105} once for every 25 Drift you have (up to 4 cuts). It spends nothing, and the loop adds 10 Drift. Two charges.',
    glow: k => k.g.drift >= 75,
    effect(k) {
      const n = Math.max(1, Math.min(4, Math.floor((k.g.drift || 0) / 25)));
      for (let i = 0; i < n; i++) k.after(0.12 * i, () => k.damage(105, { ab: this }));
      driftAdd(k, 10); driftHook(k, this);
      if (k.def.orbit) k.buff('orbit', 5, {}, 5, 5);   // (Orbit: a full loop round the target is all five stacks)
      k.fx('gyre', { n });
    },
    fx: { type: 'slash', color: '#9ff0e0', r: 70, span: 6.28 },
  };
  TALENT_ABILITIES.driftblade_gyre = { cls: 'driftblade', ab: gyre,
    spec: { orbit: Object.assign({}, gyre, { desc: gyre.desc + ' A full loop is a full Orbit: it gives all five stacks.' }) } };
  TALENT_ABILITIES.driftblade_tailspin = { cls: 'driftblade', ab: {
    id: 'tailspin', replaces: 'still', icon: 'still', name: 'Tailspin', type: 'ogcd', target: 'self', cd: 25, lock: 0.5, anim: 'big',
    desc: 'Whirl in place for a moment: you parry like Stillpoint, cut the nearest enemy three times for {d:115} each (up to 50% more with Drift), then spring 150 px the way you\'re heading. Your Drift holds while you spin.',
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
  // (spec row VII: the Orbit's Roost and the Comet's Starfall, both in Gale Run's place)
  TALENT_ABILITIES.driftblade_roost = { cls: 'driftblade', ab: {
    id: 'roost', replaces: 'gale', icon: 'gale', name: 'Roost', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
    desc: 'Settle on the wind for 8s: your Orbit stays full whether you circle or not, Carve cuts on its own every 1s, your Drift holds, and you take 20% less damage.',
    effect(k) { k.buff('roost', 8); k.buff('orbit', 5, {}, 5, 5); k.mitigate('self', 0.2, 8, { ab: this }); },
    fx: { type: 'aura', color: '#a8f0c8', r: 38, dur: 2 },
  } };
  TALENT_ABILITIES.driftblade_starfall = { cls: 'driftblade', ab: {
    id: 'starfall', replaces: 'gale', icon: 'gale', name: 'Starfall', type: 'ogcd', target: 'enemy', range: 300, cd: 45, lock: 0.5, anim: 'big',
    desc: 'Needs 120 Drift. Spend it all: call the star down on your target for {d:300}, plus {d:80} for every 10 Drift spent. It always crits, and the fall throws you 150 px the way you\'re heading.',
    usable: k => k.g.drift >= 120,
    glow: k => k.g.drift >= 180,
    effect(k) {
      const d = k.g.drift; k.g.drift = 0;
      k.damage(300 + 8 * d, { ab: this, autoCrit: true });
      driftSpend(k, d, 200);
      k.teleport('dash', { ab: this, d: 150 });
    },
    fx: { type: 'line', color: '#ffe0a8', range: 300 },
  } };
})();

// The nine original classes' moves (the talent rework): each one's two, rows III and V. Every move is plain data with
// its own name, `replaces`, desc, effect, fx and icon fallback, so it works the same in the base kit and both specs.
const talentMoves = (cls, moves) => { for (const [id, ab] of Object.entries(moves)) TALENT_ABILITIES[id] = { cls, ab }; };
// Bastion
talentMoves('bastion', {
  bastion_hallowed: {
    id: 'hallowed', replaces: 'banner', icon: 'banner', name: 'Hallowed Ground', type: 'ogcd', target: 'self', cd: 30, anim: 'cast', talent: true,
    desc: 'Pour out all your Resolve (at least 30) to consecrate the ground under you for 10s. The boss burns every 2s, for {d:36} at 30 Resolve up to {d:120} at 100, and a Perfect Block inside the circle gives 10 more Resolve.',
    usable: k => k.g.resolve >= 30,
    glow: k => k.g.resolve >= 90 && !k.has('oath'),
    effect(k) {
      const n = k.g.resolve; k.g.resolve = 0;
      k.dot('hallowed', n * 1.2, 10, 2, { ab: this });
      const p = k.env.pos ? k.env.pos() : null;
      k.g.hallow = { end: k.now + 10, x: p ? p.x : null, y: p ? p.y : null };
    },
    fx: { type: 'zone', color: '#ffd65a', r: 130, range: 0, dur: 10 },
  },
  // (Sentinel's spec row VII: SPEC_TALENTS in talents.js)
  bastion_aegis: {
    id: 'aegis', replaces: 'bulwark', icon: 'bulwark', name: 'Aegis', type: 'ogcd', target: 'self', cd: 120, anim: 'big', talent: true,
    desc: 'Big cooldown: plant your shield as a dome for 8s. You take 25% less damage and the party 15% less, Brace\'s charges refill, and every Perfect Block under it heals the party for {h:60}.',
    effect(k) {
      k.mitigate('self', 0.25, 8, { ab: this }); k.mitigate('party', 0.15, 8, { ab: this });
      k.refill('brace'); k.buff('aegis', 8);
      if (k.perk('bastion_w3')) k.shield('party', 160, 8, { ab: this });
      bastionGuard(k, this);
    },
    fx: { type: 'zone', style: 'hex', color: '#bcd8ff', r: 140, range: 0, dur: 8 },
  },
  bastion_avatar: {
    id: 'avatar', replaces: 'oath', icon: 'oath', name: 'Avatar of Dawn', type: 'ogcd', target: 'self', cd: 60, anim: 'big', talent: true,
    get desc() { return 'Burst: wings of light for 15s (20s as a Crusader). +10% damage, Judgment grants double Resolve and Holy Edge hits for {d:720} instead of {d:560}, and every Perfect Block calls a pillar of light down on the boss for {d:120}.'; },
    glow: k => k.g.resolve >= 50,
    effect(k) { const dur = k.def.spec === 'crusader' ? 20 : 15; k.buff('oath', dur); k.buff('avatar', dur); },
    fx: { type: 'aura', color: '#ffe08a', r: 40, dur: 2 },
  },
});
// Bloodreaver
talentMoves('bloodreaver', {
  bloodreaver_scab: {
    id: 'scab', replaces: 'warcry', icon: 'warcry', name: 'Scab', type: 'ogcd', target: 'self', cd: 20, anim: 'big', talent: true,
    desc: 'Spend 30 Blood: a scab grows over your wounds, a shield worth the damage you took in the last 6s (at least a tenth of your HP) for 8s. Whatever is left of it when it falls off comes back as Blood.',
    usable: k => k.g.blood >= 30,
    effect(k) {
      k.spend('blood', 30);
      const mx = k.env.maxHp(), amt = Math.min(mx * 0.4, Math.max(mx * 0.1, k.env.recentDamage(6)));
      k.env.emit({ type: 'shield', target: 'self', amount: Math.round(amt), dur: 8, ab: this, tag: 'scab' });
      if (k.perk('bloodreaver_a2')) k.healRaw('self', mx * 0.1, { ab: this });
    },
    fx: { type: 'aura', color: '#a01028', r: 34, dur: 2 },
  },
  bloodreaver_moon: {
    id: 'moon', replaces: 'undying', icon: 'undying', name: 'Blood Moon', type: 'ogcd', target: 'self', cd: 120, anim: 'big', talent: true,
    desc: 'For 10s you cannot drop below 1 HP, and your heals on yourself are doubled. When the moon sets you burst in a tide of blood: the boss takes damage for every hit you took under it (up to {d:1500}), and you heal for a quarter of that.',
    effect(k) { k.mitigate('self', 0, 10, { kind: 'living', ab: this }); k.buff('undying', 10); k.buff('bloodmoon', 10); },
    fx: { type: 'aura', color: '#c0102a', r: 40, dur: 3 },
  },
  // (the spec rows VII, SPEC_TALENTS in talents.js: the Berserker's Bloodbath, the Hemomancer's Crimson Pact)
  bloodreaver_bloodbath: {
    id: 'bloodbath', replaces: 'letting', icon: 'letting', name: 'Bloodbath', type: 'ogcd', target: 'enemy', range: MELEE, charges: 2, cd: 15, anim: 'attack', talent: true,
    desc: 'Open a vein and fling the blood between attacks: {d:260} and +35 Rage, at the price of 5% of your HP. The cut counts in your bank. Not below 30% HP. Two charges.',
    usable: k => hpOf(k) > 0.3,
    glow: k => { const a = abBase(k, 'letting'); return !!a && k.charges(a) === 2 && hpOf(k) > 0.5; },
    effect(k) {
      k.damage(260 * reaverRetaliate(k), { ab: this }); k.selfDamage(0.05, { ab: this }); reaverGain(k, k.perk('bloodreaver_w1') ? 45 : 35);
      if (k.perk('bloodreaver_a4')) k.healRaw('self', k.env.maxHp() * 0.05, { ab: this });
      reaverLetting(k, this);
    },
    fx: { type: 'slash', color: '#c0102a', r: 46, span: 1.2 },
  },
  bloodreaver_pact: {
    id: 'pact', replaces: 'frenzy', icon: 'frenzy', name: 'Crimson Pact', type: 'ogcd', target: 'self', cd: 60, anim: 'big', talent: true,
    desc: 'Burst: for 12s the healing Crimson Drain gives you flows to the whole party at three quarters of its strength, and your next three Crimson Drains are free and hit for {d:110} more.',
    effect(k) {
      k.buff('pact', 12); k.buff('gorge', 12, {}, 3, 3); if (k.perk('bloodreaver_w3')) k.gain('blood', 30);
      if (k.talent('bloodreaver_frenzied')) { const l = abBase(k, 'letting'); if (l) k.refill(l.id); }
    },
    fx: { type: 'aura', color: '#c0204a', r: 40, dur: 2.5 },
  },
});
// Runeguard
talentMoves('runeguard', {
  runeguard_whirl: {
    id: 'whirl', replaces: 'sanctum', icon: 'sanctum', name: 'Whirling Runes', type: 'ogcd', target: 'self', cd: 30, anim: 'big', talent: true,
    desc: 'Every Rune you hold tears loose and spins around you as a blade for 12s, striking the boss every 2s for {d:35} per Rune.',
    usable: k => k.g.runes >= 1,
    glow: k => k.g.runes >= 3 && !k.has('overload'),
    effect(k) { const n = k.g.runes; k.g.runes = 0; runeSpent(k, n); k.dot('whirl', 35 * n, 12, 2, { ab: this }); k.fx('whirl', { n }); },
    fx: { type: 'aura', style: 'runes', color: '#b18cff', r: 40, dur: 1 },
  },
  runeguard_living: {
    id: 'living', replaces: 'overload', icon: 'overload', name: 'Living Rune', type: 'ogcd', target: 'self', cd: 60, anim: 'big', talent: true,
    desc: 'Burst: a great rune rises behind you for 15s. +10% damage, Rune Strike gives 2 Runes, Glyph Burst hits for {d:1080} and Ward blasts 50% harder, and every Rune you spend makes the rune fire a bolt at the boss for {d:90}.',
    effect(k) { k.buff('overload', 15); k.buff('living', 15); if (k.perk('runeguard_w3')) k.gain('runes', 2, 3); runeSurge(k, this); },
    fx: { type: 'aura', color: '#b18cff', r: 40, dur: 2 },
  },
  // (Spellwarden's spec row VII: SPEC_TALENTS in talents.js)
  runeguard_wardglyph: {
    id: 'wardglyph', replaces: 'glyph', icon: 'glyph', name: 'Glyph of Warding', type: 'gcd', target: 'enemy', range: 260, anim: 'cast', talent: true,
    desc: 'Spend 3 Runes: a glyph that wards every ally for {s:300} for 8s and cuts the target for {d:560} ({d:730} during Runic Overload).',
    usable: k => k.g.runes >= 3,
    glow: k => k.g.runes >= 3,
    effect(k) {
      k.spend('runes', 3); const pot = k.has('overload') ? 730 : 560;
      k.damage(pot, { ab: this }); k.shield('party', 300, 8, { ab: this });
      if (k.perk('runeguard_w2')) k.gain('runes', 1, 3);
      runeGlyph(k, this, pot);
    },
    fx: { type: 'zone', style: 'vortex', color: '#9fd8ff', r: 70, range: 260, dur: 0.8 },
  },
});
// Ranger
talentMoves('ranger', {
  ranger_explosive: {
    id: 'explosive', replaces: 'rapid', icon: 'rapid', name: 'Explosive Shot', type: 'ogcd', target: 'enemy', range: RANGED, cd: 2, anim: 'attack', talent: true,
    desc: 'Spend 50 Focus (25 while Hunter\'s Mark is up): plant a charge in the boss that blows 2.5s later for {d:300} ({d:640} if planted in the Mark). Every Quick Shot or Piercing Arrow that lands before then makes the blast 30% bigger.',
    usable: k => k.g.focus >= rangerRapidCost(k) && !k.g.charge,
    glow: k => !k.g.charge && (k.g.focus >= 90 || (k.has('markself') && k.g.focus >= 25)),
    effect(k, t) {
      k.spend('focus', rangerRapidCost(k)); if (k.perk('ranger_a2')) k.gain('focus', 10);
      const c = k.g.charge = { pot: (k.has('markself') ? 640 : 300) * (k.perk('ranger_a4') ? 1.15 : 1), n: 0 }, ab = this, en = t && t.id;
      k.after(2.5, () => { k.damage(c.pot, { ab }); k.fx('explode', { en, n: c.n }); if (k.g.charge === c) k.g.charge = null; });
    },
    fx: { type: 'line', color: '#ffb040', range: RANGED },
  },
  ranger_falcon: {
    id: 'falcon', replaces: 'barrage', icon: 'barrage', name: 'Falcon', type: 'ogcd', target: 'enemy', range: RANGED, cd: 30, anim: 'cast', talent: true,
    desc: 'Your falcon dives onto the boss and harries it for 10s, striking every 2s for {d:90}. Every Keen Eye you light while it hunts sends it into a diving strike for {d:200} at once.',
    glow: k => k.has('markself'),
    effect(k) { k.dot('falcon', 90, 10, 2, { ab: this }); k.buff('falconHunt', 10); if (k.perk('ranger_w3')) k.proc('keen', 15); },
    fx: { type: 'aura', color: '#ffe27a', r: 30, dur: 1 },
  },
});
// Shadowblade
talentMoves('shadowblade', {
  shadowblade_rupture: {
    id: 'rupture', replaces: 'venom', icon: 'venom', name: 'Rupture', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack', talent: true,
    desc: 'Finisher: spend all your combo points to cut the boss open for {d:100}, bleeding {d:120} every 2s for 4s per point. While it bleeds, your finisher hits 15% harder.',
    usable: k => k.g.combo >= 1,
    glow: k => k.g.combo >= 4 && k.dotRemaining('rupture') < 4,
    effect(k) { const cp = k.g.combo; k.g.combo = 0; k.damage(100, { ab: this }); k.dot('rupture', 120 * (k.perk('shadowblade_w1') ? 1.25 : 1), 4 * cp, 2, { ab: this }); },
    fx: { type: 'slash', color: '#d0203a', r: 50, span: 1.6 },
  },
  shadowblade_blossom: {
    id: 'blossom', replaces: 'smoke', icon: 'smoke', name: 'Death Blossom', type: 'ogcd', target: 'enemy', range: MELEE, cd: 120, anim: 'big', talent: true,
    desc: 'Vanish into a storm of knives around the boss: six cuts of {d:30} over 1.5s, each giving a combo point. The last is a free finisher with everything you hold.',
    glow: k => k.g.combo <= 1,
    effect(k) {
      const ab = this;
      for (let i = 0; i < 6; i++) k.after(0.25 * i, () => { k.damage(30, { ab }); bladeCombo(k, 1); });
      k.after(1.55, () => { const ev = k.abilities.find(a => k.baseId(a) === 'evis'); if (ev && k.g.combo > 0) { ev.effect.call(ev, k); k.fx('blossomEnd'); } });
    },
    fx: { type: 'slash', color: '#e0c8ff', r: 70, span: 6.28 },
  },
});
// Pyromancer
talentMoves('pyromancer', {
  pyromancer_firestep: {
    id: 'firestep', replaces: 'smolder', icon: 'smolder', name: 'Firestep', type: 'ogcd', target: 'self', cd: 20, anim: 'cast', lock: 0.3, talent: true,
    desc: 'Blink forward through a burst of flame. It gives 15 Heat and makes your next Fireball instant.',
    effect(k) { kitMove(k, 'forward', { d: 150 }); k.gain('heat', 15, 100); k.buff('firestep', 10); },
    fx: { type: 'ring', color: '#ff8a2a', r: 40 },
  },
  pyromancer_phoenix: {
    id: 'phoenix', replaces: 'vent', icon: 'vent', name: 'Phoenix Flight', type: 'gcd', target: 'enemy', range: RANGED, cd: 12, anim: 'big', talent: true,
    desc: 'Instant: release all your Heat as a phoenix that sweeps through the boss and wheels back for a second pass, each pass {d:70} plus {d:26} for every 10 Heat. At 60 Heat or more it leaves you Hot Streak.',
    usable: k => k.g.heat >= 10,
    glow: k => k.g.heat >= 85,
    effect(k) {
      const h = k.g.heat, pot = 70 + 2.6 * h, ab = this; k.g.heat = 0;
      k.damage(pot, { ab, extra: true });
      k.after(1.1, () => k.damage(pot, { ab, extra: true }));
      if (h >= 60) pyroLight(k);
    },
    fx: { type: 'projectile', style: 'fire', color: '#ff7a1a', range: RANGED, speed: 600 },
  },
});
// Thermist (Zenith's spec row VII: SPEC_TALENTS in talents.js)
talentMoves('thermist', {
  thermist_redgiant: {
    id: 'redgiant', replaces: 'invert', icon: 'invert', name: 'Red Giant', type: 'ogcd', target: 'self', cd: 60, anim: 'big', talent: true,
    desc: `For ${CORONA.GIANT_DUR}s you swell: you can hold up to ${CORONA.GIANT} Corona at the edge instead of ${CORONA.MAX}, and the 4th and 5th edge casts hit half again as hard. If you're On the Brink with a full Corona, it lets you hold on.`,
    glow: k => thermAt(k, THERMIST.EDGE) && k.stacks('corona') >= 2,
    effect(k) {
      k.buff('redgiant', CORONA.GIANT_DUR);
      // a full three no longer fills the Corona: the Brink it set is lifted
      if (k.has('brink') && k.stacks('corona') < CORONA.GIANT) k.clear('brink');
    },
    fx: { type: 'aura', color: '#ff5a3a', r: 40, dur: 1.2 },
  },
});
// Cleric
talentMoves('cleric', {
  cleric_bloom: {
    id: 'dawnbloom', replaces: 'intervene', icon: 'intervene', name: 'Bloom of Dawn', type: 'gcd', target: 'ally', cd: 30, anim: 'big', allowDead: true, talent: true,
    desc: 'Instant: spend all your Petals on one ally. A fallen ally rises at once, with heavy Raise Sickness (30% less damage and healing for 30s, more for every fall this pull); a living one is healed for {h:500} per Petal. Every Petal counts toward Dawnstar.',
    usable: k => k.g.petals >= 1,
    effect(k, t) {
      const n = k.g.petals; k.g.petals = 0;
      if (k.env.isDead(t)) k.raise(t, { ab: this }); else k.heal(t, 500 * n, { ab: this });
      clericBloom(k, n);
    },
    fx: { type: 'ring', color: '#ffe680', r: 50, onTarget: true },
  },
  cleric_sanctum: {
    id: 'dawnsanctum', replaces: 'prayer', icon: 'prayer', name: 'Dawn Sanctum', type: 'ogcd', target: 'self', cd: 90, anim: 'big', talent: true,
    desc: 'A great circle of dawn at your feet for 12s. Allies standing in it take 15% less damage and heal {h:70} every 1.5s, and your Smites cast from inside it are instant.',
    effect(k) {
      const p = k.env.pos ? k.env.pos() : null;
      k.g.sanctum = { end: k.now + 12, x: p ? p.x : null, y: p ? p.y : null };
      const pa = k.healAmount(k.perk('cleric_a4') ? 105 : 70, { ab: this }).amount;
      k.env.emit({ type: 'splash', target: 'self', r: 0, pr: 160, ticks: 8, interval: 1.5, pa, pct: k.perk('cleric_w3') ? 0.2 : 0.15, ab: this });
    },
    fx: { type: 'zone', style: 'holy', color: '#ffe680', r: 160, range: 0, dur: 12 },
  },
});
// Grovekeeper
talentMoves('grovekeeper', {
  grovekeeper_seed: {
    id: 'seed', replaces: 'rebirth', icon: 'rebirth', name: 'Seed of Renewal', type: 'gcd', target: 'ally', cd: 30, anim: 'big', allowDead: true, talent: true,
    desc: 'Instant: spend 40 Bloom to plant a seed on an ally for 20s. If they fall while it grows, they spring back up at once; if not, it blooms into a {h:900} heal when it ends. On a fallen ally, it raises them at once. Either raise is instant, so it leaves heavy Raise Sickness: 30% less damage and healing for 30s, more for every fall this pull.',
    usable: k => k.g.bloom >= 40,
    effect(k, t) {
      k.spend('bloom', 40);
      if (k.env.isDead(t)) { k.raise(t, { ab: this }); return; }
      k.g.seed = { t, end: k.now + 20 };
    },
    fx: { type: 'ring', color: '#a8ff9a', r: 40, onTarget: true },
  },
  grovekeeper_treant: {
    id: 'treant', replaces: 'thorn', icon: 'thorn', name: 'Treant', type: 'ogcd', target: 'enemy', range: RANGED, cd: 45, anim: 'big', talent: true,
    desc: 'Call up a treant beside the boss for 15s. It slams the boss for {d:170} every 3s, and every slam heals your most hurt ally for {h:150}.',
    effect(k, tg) {
      const ab = this, pot = k.perk('grovekeeper_w1') ? 210 : 170, en = tg && tg.id;
      k.buff('treant', 15);
      for (let i = 1; i <= 5; i++) k.after(3 * i, () => { k.damage(pot, { ab }); k.heal('lowest', 150, { ab }); if (k.perk('grovekeeper_a4')) groveGain(k, 5); k.fx('treantSlam', { en }); });
    },
    fx: { type: 'zone', style: 'roots', color: '#4f9f3f', r: 60, range: RANGED, dur: 1.2 },
  },
});
// Chronomancer
talentMoves('chronomancer', {
  chronomancer_bubble: {
    id: 'bubble', replaces: 'stasis', icon: 'stasis', name: 'Time Bubble', type: 'ogcd', target: 'ally', cd: 40, anim: 'big', talent: true,
    desc: 'Spend 30 Flux: wrap an ally in a bubble of slowed time for 6s. It follows them, and everyone inside takes 25% less damage.',
    usable: k => k.g.flux >= 30,
    effect(k, t) { k.spend('flux', 30); k.env.emit({ type: 'splash', target: t, r: 0, pr: 90, ticks: 4, interval: 1.5, pct: 0.25, fol: 1, ab: this }); },
    fx: { type: 'ring', style: 'rewind', color: '#9ff4ff', r: 60, onTarget: true },
  },
  chronomancer_warp: {
    id: 'warp', replaces: 'accel', icon: 'accel', name: 'Time Warp', type: 'ogcd', target: 'ally', cd: 60, anim: 'big', talent: true, allyBuff: 'quickened',
    desc: 'Party burst: a great clock hangs over the party for 15s (20s as an Accelerant). Everyone acts 10% faster (15% as an Accelerant; an Echoist\'s echoes are full strength), and the ally you aim it at is Quickened: 12% faster still for 15s. Every 3s its hands strike the boss for {d:70} and heal the whole party for {h:40}. You gain 40 Flux.',
    effect(k, t) {
      const acc = k.def.spec === 'accelerant', dur = acc ? 20 : 15, ab = this;
      k.partyBuff('haste', acc ? 0.15 : 0.1, dur, { ab });
      chronoQuicken(k, ab, t);
      if (k.def.spec === 'echoist') k.buff('chamber', dur);
      k.buff('warp', dur);
      k.gain('flux', 40); if (k.perk('chronomancer_w3')) k.heal('party', 150, { ab });
      for (let i = 1; i * 3 <= dur; i++) k.after(3 * i, () => { k.damage(70, { ab }); k.heal('party', 40, { ab }); k.fx('clockStrike'); });
    },
    fx: { type: 'zone', style: 'clock', color: '#3fd0d0', r: 160, range: 0, dur: 2 },
  },
});

// The Alembist's two (classes-b). They began in the kit's own talentAbilities table; when the two talent-move systems
// became one they moved here. (A kit can still list moves in talentAbilities: specs.js talentMoveFor reads both.)
TALENT_ABILITIES.alembist_blend = { cls: 'alembist', ab: {
    id: 'blend', replaces: 'batch', icon: 'batch', name: 'Grand Blend', type: 'ogcd', target: 'self', cd: 90, anim: 'big', lock: 0.3, talent: true,
    desc: 'Pour every vial in your bandolier into one Grand Blend. Thrown, it does all of their effects at once where it lands, each at 80% of the strength it had.',
    usable: k => k.g.vials.length >= 2,
    effect(k) {
      const parts = [];
      for (const v of k.g.vials) { if (v.parts) parts.push(...v.parts); else parts.push({ r: v.r, m: alemStrength(k, v) }); }
      const v = { r: 'BL', parts, at: k.now, born: k.now, id: ++k.g.n, keep: true };
      if (k.def.alem.fuse) v.fuse = k.now + k.def.alem.fuse + (k.talent('alembist_cask') ? 2 : 0);
      k.g.vials = [v]; k.g.mark = null; k.g.count = 1;
      k.g.popAt = k.now; k.g.popR = 'BL';
      k.fx('brew', { r: 'BL' });
      alemRestock(k);
    },
    fx: { color: '#ffe0a8' },
  } };
TALENT_ABILITIES.alembist_quicksilver = { cls: 'alembist', ab: Object.assign(alemReagentAb('quicksilver', 'Q', 'Quicksilver', alemSaltGlow,
    'A reagent (1s) that takes Salt\'s place. Quicksilver + Quicksilver is a Silver Mirror, Quicksilver + Dew a Silver Tonic, Quicksilver + Ember a Fulminate. It glows while a raidwide is on its way and you hold no Silver Mirror, Salt Ward or Salve.'),
  { replaces: 'salt', icon: 'salt', talent: true }) };

if (typeof module !== 'undefined') Object.assign(module.exports, { kitMoveDest, kitSegDist, THERMIST, CORONA, thermCorona, thermSunset, thermSpell, thermMove, thermSettle, thermShock, thermBrink, thermMult, thermAt,
  thermEdgeCast, thermEquil, thermUtility, thermInvert, thermPlan, thermTick, thermOverload, DRIFT, DRIFT_BODY, DRIFT_NEAR, DRIFT_REACH, driftAdd, driftTick, driftPass, driftK, driftMax,
  driftSpend, driftHook, driftRiposte, driftLoop, TALENT_ABILITIES });

// ===================================================================================================================
// ADVANCED TANKS (tanks-2): Gorgemaw and Oathbroker (docs/plans/2026-10-new-classes.md). Each one leans on the host:
// the Gorgemaw's open jaw is a window the host checks when a telegraph lands (fight.js classHit / eatInfo), and the
// Oathbroker's Ledger lives on the host, which owns HP (OATH below holds its rules, shared with tools/simulate.js).
// ===================================================================================================================

// ---------------------------------------------------------------- Gorgemaw: boss attacks are food
// Open Wide sends a `maw` event: for its window, an edible telegraph that lands on you deals 25% and the host answers
// with an 'eat' notice naming the Morsel's shape (circle and donut: Ring, line and cross: Lance, cone: Fang,
// tankbuster: Spike). The Belly (k.g.belly) is the kit's: Spit fires the oldest back at the boss, Digest eats them all.
const MAW = {
  WINDOW: 1.5, BELLY: 3,
  SPIT: { ring: 420, lance: 460, fang: 490, spike: 800 },   // potency of each shape spat back
  FUSE: 2.4,                                                 // Glutton: two of a shape spat together
  HEAL: 0.06, DR: 0.05,                                      // Digest: per Morsel
  NAMES: { ring: 'Ring', lance: 'Lance', fang: 'Fang', spike: 'Spike' },
  FUSION: { ring: 'Quake', lance: 'Skewer', fang: 'Maul', spike: 'Impale' },
  COLOR: { ring: '#ff9a3a', lance: '#7fd0ff', fang: '#ff5a6a', spike: '#ffe27a' },
  ULT_EAT: 5, ULT_USE: 1.5,                                  // Maw of Ruin's charge: a Morsel eaten, one spat or digested
  ACID: 0.5, ACID_MAX: 1, ACID_DUR: 15,                      // Digest: the next Spit hits 50% harder per Morsel digested (up to +100%)
  GULP_CD: 20,                                               // Gulp into an empty Belly: a Ring Morsel, once every 20s at most
};
const MAW_TYPES = ['ring', 'lance', 'fang', 'spike'];
const mawMax = k => k.def.bellyMax || MAW.BELLY;
// open the jaw for dur seconds (o.all: Bottomless, raidwides too). The host owns what lands in it.
function mawOpen(k, dur, o = {}) {
  k.env.emit({ type: 'maw', dur, all: o.all ? 1 : 0 });
  k.buff(o.all ? 'bottomless' : 'jaw', dur);
  k.g.jawUntil = Math.max(k.g.jawUntil || 0, k.now + dur);
}
// the host says something was eaten: a Morsel of that shape goes into the Belly (Stone Belly makes every one a Spike)
function mawEat(k, d) {
  let m = MAW_TYPES.includes(d.m) ? d.m : 'ring';
  if (k.has('stone')) m = 'spike';
  k.stats.eaten = (k.stats.eaten || 0) + 1;
  k.ultGain(MAW.ULT_EAT);   // (Maw of Ruin)
  k.g.popAt = k.now; k.g.popM = m;
  if (k.talent('gorgemaw_cud')) k.healRaw('self', k.env.maxHp() * 0.03, { ab: k.abilities[1] });
  if (k.talent('gorgemaw_scraps') && typeof d.f === 'number') k.shield(d.f, 200, 6, { ab: k.abilities[1] });
  // Chain Eater (Glutton, spec row VI): each Morsel keeps the jaw open a little longer, for the next
  if (k.talent('gorgemaw_chain') && k.has('jaw') && !k.has('bottomless')) mawOpen(k, Math.min(3, k.remaining('jaw') + 0.6));
  // Grinder (Gizzard, spec row VI): while the gut is grinding, a Morsel is digested the moment it is eaten
  if (k.talent('gorgemaw_grinder') && k.has('grinding')) {
    k.healRaw('self', k.env.maxHp() * 0.03 * mawGut(k), { ab: k.abilities[3] }); mawProtect(k, k.abilities[3], [m], mawGut(k));
    k.ultGain(MAW.ULT_USE); k.fx('digest', { n: 1, m: m[0] }); k.g.count = k.g.belly.length;
    return;
  }
  if (k.g.belly.length >= mawMax(k)) {
    // a full Belly: the Morsel is lost, unless Overflow spits it straight back out
    if (k.talent('gorgemaw_overflow')) { k.g.belly.push({ m, at: k.now }); mawSpit(k, k.abilities[2], { free: true }); }
    else k.wasted('morsel');
  } else {   // (item effects: a Morsel builds the gauge)
    k.g.belly.push({ m, at: k.now }); k.fxGain(1);
    if (k.has('twice') && k.g.belly.length < mawMax(k)) k.g.belly.push({ m, at: k.now });   // (Feeding Frenzy: a copy of it joins the Belly)
  }
  k.g.count = k.g.belly.length;
}
// one Spit: the oldest Morsel (Glutton: with the next if it's the same shape, a Fusion). o.share: Regurgitate's strength
function mawSpitOne(k, ab, o = {}) {
  const b = k.g.belly; if (!b.length) return null;
  const m = b.shift();
  const fused = !!k.def.fuse && b.length > 0 && b[0].m === m.m;
  if (fused) b.shift();
  // Triple Course (Glutton, spec row VII): three of a shape in a row fuse into a Feast
  let feast = false;
  if (fused && k.talent('gorgemaw_triple') && b.length > 0 && b[0].m === m.m) { b.shift(); feast = true; }
  let pot = MAW.SPIT[m.m] * (feast ? 3.6 : fused ? MAW.FUSE : 1) * (o.share || 1);
  if (k.talent('gorgemaw_sour') && k.now - m.at >= 15) pot *= 1.4;
  if (k.g.marinade && k.now < k.g.marinade) pot *= 1.25;
  if (k.has('acid')) { pot *= 1 + k.buffs.get('acid').data.x; k.clear('acid'); k.stats.acidSpits = (k.stats.acidSpits || 0) + 1; }   // (Digest's acid)
  const r = k.damage(pot, { ab });
  if (k.talent('gorgemaw_aftertaste')) k.dot('aftertaste', m.m === 'spike' ? 65 : 35, 9, 3, { ab });
  if (k.talent('gorgemaw_spitshield')) mawProtect(k, ab, [m.m], 0.5);   // (Warm Spit, Gizzard spec row VII)
  k.stats.spits = (k.stats.spits || 0) + 1;
  k.ultGain(MAW.ULT_USE);   // (Maw of Ruin)
  if (fused) k.stats.fusions = (k.stats.fusions || 0) + 1;
  k.fx('spit', { m: m.m, f: fused ? 1 : 0, n: o.n || 0 });
  return r;
}
function mawSpit(k, ab, o = {}) {
  const r = mawSpitOne(k, ab, o);
  k.g.marinade = 0;
  k.g.count = k.g.belly.length;
  return r;
}
// Digest's shared part: how many it eats (Rumination keeps the oldest), Bile
function mawDigestTake(k, ab) {
  const keep = k.talent('gorgemaw_rumination') && k.g.belly.length > 1 ? [k.g.belly[0]] : [];
  const eaten = k.g.belly.slice(keep.length);
  k.g.belly = keep; k.g.count = keep.length;
  if (eaten.length && k.talent('gorgemaw_bile')) for (let i = 0; i < eaten.length; i++) k.after(0.12 * i, () => k.damage(110, { ab, extra: true }));
  k.fx('digest', { n: eaten.length, m: eaten.map(e => e.m[0]).join('') });
  k.ultGain(MAW.ULT_USE * eaten.length);   // (Maw of Ruin)
  // the acid it leaves: the next Spit hits harder for every Morsel digested (Iron Gut: each counts twice)
  if (eaten.length) k.buff('acid', MAW.ACID_DUR, { x: Math.min(MAW.ACID_MAX, MAW.ACID * eaten.length * mawGut(k)) });
  return eaten;
}
// Iron Gut grinds: while it lasts Digest works in any moment, and every Morsel it digests counts twice
const mawGut = k => (k.has('irongut') ? 2 : 1);
// the Gizzard's protection for Morsels of these shapes (Digest, Grinder, Banquet; Warm Spit at half): each shape its own kind.
// share scales the amounts (a Spike's immunity lasts 2s at full strength or more, half that at half)
function mawProtect(k, ab, shapes, share = 1) {
  const n = m => shapes.filter(s => s === m).length * share;
  if (n('ring')) k.shield('party', 150 * n('ring'), 10, { ab });
  if (n('lance')) k.shield('lowest', 360 * n('lance'), 10, { ab });
  if (n('fang')) k.mitigate('party', Math.min(0.3, 0.15 * n('fang')), 6, { ab });
  if (n('spike')) k.mitigate('lowest', 1, share < 1 ? 2 * share : 2, { kind: 'invuln', ab });
}
if (typeof module !== 'undefined') Object.assign(module.exports, { mawProtect, runeSurge, runeTick });
// Gulp (Gnash's third bite) into an empty Belly: the mouthful is a Ring Morsel (not an eaten hit: no Maw of Ruin charge)
function mawGulp(k) {
  // Matching Bite (Glutton, spec row VI): into a Belly with room, the mouthful is a copy of the newest Morsel
  const copy = k.talent('gorgemaw_matching') && k.g.belly.length > 0 && k.g.belly.length < mawMax(k);
  if ((k.g.belly.length && !copy) || k.now < (k.g.gulpAt ?? -99)) return;
  k.g.gulpAt = k.now + MAW.GULP_CD;
  const m = copy ? k.g.belly[k.g.belly.length - 1].m : 'ring';
  k.g.belly.push({ m, at: k.now }); k.g.count = k.g.belly.length;
  k.g.popAt = k.now; k.g.popM = m;
  k.stats.gulps = (k.stats.gulps || 0) + 1;
}
// a hard moment, the only time Digest works: under 60% HP, or a cast aimed at you (a tankbuster) on its way
// (wide: any boss cast counts, raidwides too: the Gizzard's Digest protects the party)
const MAW_HARD_HP = 0.6;
const mawHard = (k, wide) => { const b = bossNow(k); return hpOf(k) < MAW_HARD_HP || !!(b && b.casting && (wide || b.onMe)); };
// (the Gizzard's Digest, the party's protection, works any time: it only glows in a hard moment)
const mawDigestOk = k => k.g.belly.length > 0 && (k.def.spec === 'gizzard' || mawHard(k) || k.has('irongut'));
const mawDigestGlow = k => k.g.belly.length > 0 && (mawHard(k, k.def.spec === 'gizzard') || k.has('irongut')) && (k.g.belly.length >= 2 || hpOf(k) < MAW_HARD_HP || k.has('irongut'));
// the glowing Spit: any Morsel (Glutton: a pair that fuses, or a full Belly; Gizzard: a full Belly, the rest is for
// Digest), but not in a hard moment, when the Belly is better digested
const mawSpitGlow = k => {
  const b = k.g.belly;
  if (!b.length || mawHard(k)) return false;
  if (k.has('acid')) return true;   // (Digest's acid: the next Spit hits harder)
  if (k.def.fuse) return b.length >= mawMax(k) || (b.length >= 2 && b[0].m === b[1].m);
  return k.def.spec === 'gizzard' ? b.length >= mawMax(k) : true;
};
// the glowing Open Wide: a cast aimed at you about to land, inside the jaw's window
const mawWideGlow = k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft <= MAW.WINDOW - 0.2) && !(k.now < (k.g.jawUntil || 0)); };

KITS.gorgemaw = {
  potMult: 0.86, // balance knob (tools/simulate.js)
  role: 'tank',
  eats: true,   // (tools/simulate.js: edible hits land on this kit)
  auto: { kind: 'maw', potency: 40, range: MELEE },
  gauge: { kind: 'belly', key: 'count', max: 3, label: 'Belly', w: 150 },
  init: () => ({ belly: [], count: 0, step: 0, comboUntil: 0, jawUntil: 0, marinade: 0, popAt: -9, popM: null }),
  onNotify(k, type, d) { if (type === 'eat') mawEat(k, d); },
  tick(k) {
    k.g.count = k.g.belly.length;
    tankUltHits(k, 8);   // (Maw of Ruin)
    // Iron Lining: every Morsel in the Belly is armour
    if (k.talent('gorgemaw_lining') && k.g.belly.length && k.now >= (k.g.liningAt || 0)) { k.g.liningAt = k.now + 1; k.mitigate('self', 0.03 * k.g.belly.length, 1.2, { ab: k.abilities[3] }); }
    // Gastric Reflex (Gizzard, spec row VI): a boss cast beginning brings a recharging Digest back sooner
    if (k.talent('gorgemaw_reflex')) onBossCast(k, () => { if (k.cdRemaining(k.abilities[3]) > 0) k.reduceCooldown('digest', 5); });
  },
  signature: 'Eating mechanics',
  floor: 'Press Q to bite. Press W just before a tankbuster lands on you to eat it, then E to spit it back. R heals you with whatever you have eaten, but only below 60% HP or as a tankbuster comes.',
  ceiling: [
    'Open Wide eats whatever lands on you in its window: you take a quarter of it and keep a Morsel shaped like it. Circles make Rings, lines make Lances, cones make Fangs, tankbusters make Spikes.',
    'Step into a teammate\'s spread circle, or a circle chasing them, with your jaw open: you eat it for them.',
    'Spit is your big damage and Digest is your big heal, and they feed each other: Digest leaves acid that makes the next Spit 50% harder for each Morsel (up to twice as hard). Digest as the tankbuster comes, eat it, and spit the Spike back doubled.',
    'Iron Gut lets you Digest in any moment, and every Morsel counts twice: one Morsel is a full heal and a doubled Spit.',
    'Gulp, the third bite of Gnash, swallows a Ring into an empty Belly (once every 20s), so there is always something to spit or digest.',
    'Bottomless eats raidwides for the whole party: they take half, and every hit is a Morsel for you. Save it for the fight\'s worst moment.',
  ],
  abilities: [
    {
      id: 'gnash', name: 'Gnash', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'Three bites on one button: Gnash ({d:220}) > Rend ({d:300}) > Gulp ({d:390}). Gulp swallows a mouthful and heals you for 2% of your HP. Into an empty Belly, the mouthful goes down as a Ring Morsel (once every 20s at most).',
      label: k => ['Gnash', 'Rend', 'Gulp'][k.now < k.g.comboUntil ? k.g.step : 0],
      effect(k) {
        const step = k.now < k.g.comboUntil ? k.g.step : 0;
        k.damage([220, 300, 390][step], { ab: this });
        if (step === 2) {
          k.healRaw('self', k.env.maxHp() * (k.perk('gorgemaw_w1') ? 0.035 : 0.02), { ab: this });
          if (k.talent('gorgemaw_crunch')) k.after(0.2, () => k.damage(70, { ab: this, extra: true }));
          if (k.talent('gorgemaw_marinade')) k.g.marinade = k.now + 10;
          mawGulp(k);
        }
        k.g.step = (step + 1) % 3; k.g.comboUntil = k.now + 15;
      },
      fx: { type: 'slash', color: '#ffb070', r: 50, span: 1.6 },
    },
    {
      id: 'wide', name: 'Open Wide', type: 'ogcd', target: 'self', charges: 2, cd: 14, lock: 0.3, anim: 'big',
      desc: 'Unhinge your jaw for 1.5s. A boss attack that lands on you in that time is eaten: you take a quarter of it and keep a Morsel shaped like it (circle: Ring, line: Lance, cone: Fang, tankbuster: Spike). Step into a teammate\'s spread circle to eat it for them. Two charges.',
      glow: k => mawWideGlow(k),
      effect(k) { mawOpen(k, (k.talent('gorgemaw_widejaw') ? 2.2 : MAW.WINDOW) + (k.perk('gorgemaw_a2') ? 0.4 : 0)); },
      fx: { color: '#ff8a5a' },
    },
    {
      id: 'spit', name: 'Spit', type: 'gcd', target: 'enemy', range: 300, anim: 'cast',
      desc: 'Spit your oldest Morsel back at the boss in the shape you ate it: a Ring bursts round it ({d:420}), a Lance runs it through ({d:460}), a Fang bites ({d:490}), and a Spike is one huge blow ({d:800}). After a Digest it carries the acid: 50% harder for each Morsel digested, up to twice as hard.',
      label: k => (k.g.belly.length ? `Spit ${MAW.NAMES[k.g.belly[0].m]}` : 'Spit'),
      usable: k => k.g.belly.length > 0,
      glow: k => mawSpitGlow(k),
      effect(k) { const r = mawSpit(k, this); if (r && k.perk('gorgemaw_w2') && r.crit) { k.damage(120, { ab: this }); k.fx('empower'); } },
      fx: { color: '#ffb070' },
    },
    {
      id: 'digest', name: 'Digest', type: 'ogcd', target: 'self', cd: 25, anim: 'big',
      desc: 'Digest every Morsel at once: you heal 6% of your HP and take 5% less damage for 8s for each one, and the acid makes your next Spit within 15s hit 50% harder for each (up to 100%). Only in a hard moment: below 60% HP, or with a tankbuster coming at you.',
      usable: k => mawDigestOk(k),
      glow: k => mawDigestGlow(k),
      effect(k) {
        const n = mawDigestTake(k, this).length * mawGut(k);
        if (!n) return;
        k.healRaw('self', k.env.maxHp() * MAW.HEAL * n, { ab: this });
        k.mitigate('self', Math.min(0.3, MAW.DR * n), 8, { ab: this });
      },
      fx: { color: '#ffd27a' },
    },
    {
      id: 'iron', name: 'Iron Gut', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
      desc: 'Clench: 40% less damage for 8s. Your gut grinds while it lasts: Digest works in any moment, and every Morsel it digests counts twice.',
      effect(k) {
        k.mitigate('self', k.perk('gorgemaw_a4') ? 0.5 : 0.4, 8, { ab: this });
        k.buff('irongut', 8);
        if (k.talent('gorgemaw_ironjaw')) mawOpen(k, 2);
      },
      fx: { color: '#9fb0c6' },
    },
    {
      id: 'bottomless', name: 'Bottomless', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
      desc: 'For 4s you eat everything, raidwide attacks too: the whole party takes half from them, and every hit is a Morsel for you.',
      effect(k) {
        mawOpen(k, 4, { all: true });
        if (k.talent('gorgemaw_feast')) k.refill(k.abilities[1].id);
        if (k.perk('gorgemaw_w3')) k.shield('party', 140, 6, { ab: this });
      },
      fx: { color: '#ff6a3a' },
    },
  ],
};

// Gorgemaw's Ultimate (TANK ULTIMATES): eating fills it (MAW.ULT_EAT per Morsel, mawEat), spitting and digesting a
// little (MAW.ULT_USE per Morsel, mawSpitOne, mawDigestTake). The one time the Belly is spat AND digested at once.
ULTIMATES.gorgemaw = {
  id: 'mawofruin', name: 'Maw of Ruin', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: MELEE, anim: 'big', icon: 'bottomless',
  lock: 1.0, dr: 0.3,
  charge: { rate: 0.45, keep: 0.5 },
  desc: 'Unhinge all the way and bring the whole Belly down on your target in one bite: {d:600}, {d:350} more for each Morsel and {d:600} more for each Spike. ' +
    'What went down is digested at the same time, in any moment: you heal 6% of your HP and take 5% less damage for 8s for each Morsel. ' +
    'The warmth spills over the party: everyone is shielded for {s:150}, and {s:60} more for each Morsel, for 8s. Then your jaw hangs open for 1.5s, ready for the next one. ' +
    'You take 30% less damage and can\'t be knocked back while you bite.' +
    '<div class="it-ult"><span><u>Charge:</u> 5% for every Morsel you eat, 1.5% for every one you spit or digest, more for every hit you take, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
  effect(k) {
    const ab = this, eaten = k.g.belly.slice();
    k.g.belly = []; k.g.count = 0; k.g.marinade = 0;
    const n = eaten.length, spikes = eaten.filter(e => e.m === 'spike').length;
    k.damage(600 + 350 * n + 600 * spikes, { ab, threat: 2 });
    if (n) { k.healRaw('self', k.env.maxHp() * MAW.HEAL * n, { ab }); k.mitigate('self', Math.min(0.3, MAW.DR * n), 8, { ab }); }
    k.shield('party', 150 + 60 * n, 8, { ab });
    mawOpen(k, MAW.WINDOW);
    k.fx('maw-ruin', { n, m: eaten.map(e => e.m[0]).join('') });
  },
};

// ---------------------------------------------------------------- Oathbroker: the debt comes due
// 60% of the damage you take is written into your Ledger instead of hitting you; each entry comes due 8s later and is
// billed to you then. The Ledger is the host's (HP is). OATH holds its rules as plain functions on a ledger object, so
// the host (fight.js) and the balance tools (tools/simulate.js) run the same rules. The kit sends `ledger` events
// ({ op, ... }) and keeps the copy the host sends back (an 'ledger' notice: [[amount, seconds left, co-signed ally]]).
const OATH = {
  DUE: 8, SHARE: 0.6, CO: 0.3, SETTLE: 0.5, LIEN: 1 / 2, COL: 0.5, FREEZE: 10, PAY: 0.02, MAX: 24,
  ULT_PAY: 1.6, ULT_SETTLE: 15, ULT_SETTLE_MAX: 5,   // Final Reckoning's charge: a Collect strike that pays, a Settle (per share of HP settled)
  // a renegotiated entry (pushed back by Renegotiate: e.rn): the boss pays LIEN_RN of it under Lien, Writ halves what
  // you pay of it, and Foreclose counts it FORE_RN times. DEFAULT: the share of the Ledger a Default strikes the boss for.
  LIEN_RN: 1, WRIT_RN: 0.5, FORE_RN: 1.5, DEFAULT: 0.5, BIG: 0.3, FORE_BIG: 1.25, FORE_SMALL: 0.3,
  make() { return { e: [], n: 0, due: OATH.DUE, share: OATH.SHARE, col: 0, small: 0, tithe: 0, frozen: -99, lien: -99, writ: -99, hold: -99, summons: -99, writMark: 0, cosign: null, ver: 0 }; },
  clamp: (v, a, b, d = a) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, +v)) : d),
  total: L => L.e.reduce((s, e) => s + e.a, 0),
  // the terms a kit asks for (talents and spec): clamped. small: entries under this share of max HP are struck off
  terms(L, ev, maxHp) {
    L.due = OATH.clamp(ev.due, 6, 10, OATH.DUE); L.col = OATH.clamp(ev.col, 0, 0.6, 0);
    L.small = OATH.clamp(ev.small, 0, 0.03, 0) * maxHp; L.tithe = OATH.clamp(ev.tithe, 0, 0.25, 0);
  },
  // part of a hit goes into the Ledger (o.co: an ally's hit, co-signed). Returns how much of the hit it took.
  write(L, amt, t, o = {}) {
    if (t < L.frozen || !(amt > 0)) return 0;
    let share = o.co ? OATH.CO : L.share, extra = 0;
    if (!o.co && t < L.summons) { share = 1; extra = 3; L.summons = -99; }   // the taunt: the next blow goes straight on
    const moved = amt * share, a = moved * (t < L.writ ? 0.5 : 1);
    if (a >= 0.5) L.e.push({ a, due: t + L.due + extra, id: ++L.n, co: o.co || 0, b: t < L.writ ? L.writMark : 0, born: t });
    // a very long Ledger folds its two oldest entries together (keeps the message and the column small)
    if (L.e.length > OATH.MAX) { const [x, y] = L.e.splice(0, 2); L.e.unshift({ a: x.a + y.a, due: Math.min(x.due, y.due), id: ++L.n, co: 0, b: Math.max(x.b, y.b), born: x.born, rn: x.rn || y.rn ? 1 : 0 }); }
    L.ver++;
    return moved;
  },
  // entries that come due now. Each bill: self (billed to you), boss (paid by the boss: Lien, a marked Writ entry, a
  // Collector's share on top), heal (Tithe: to the most hurt ally). Held (Moratorium): nothing comes due.
  bills(L, t, dt) {
    if (t < L.hold) { for (const e of L.e) e.due += dt; return []; }
    const due = [];
    L.e = L.e.filter(e => (e.due > t ? true : (due.push(e), false)));
    if (due.length) L.ver++;
    return due.map(e => {
      if (L.small && e.a < L.small) return { a: e.a, self: 0, boss: 0, heal: 0, co: e.co, small: 1 };
      const bs = Math.min(1, Math.max(t < L.lien ? (e.rn ? OATH.LIEN_RN : OATH.LIEN) : 0, e.b || 0));
      const wr = e.rn && t < L.writ ? OATH.WRIT_RN : 1;   // (a renegotiated entry due under Writ: you pay half)
      return { a: e.a, self: e.a * (1 - bs) * wr, boss: e.a * (bs + L.col), heal: e.a * L.tithe, co: e.co, rn: e.rn ? 1 : 0 };
    });
  },
  // an order from the kit. Returns { self: billed now, boss: struck from the boss now }
  op(L, ev, t, maxHp) {
    const r = { self: 0, boss: 0 }, C = OATH.clamp;
    switch (ev.op) {
      case 'pay': {   // pay down the oldest entries (o.hit: and strike the boss for it; o.push: the newest comes due later)
        let left = C(ev.amount, 0, maxHp * 0.06, 0);
        const paid0 = left;
        // (a co-signed line paid down heals the ally it was written for: r.co { allyId: amount })
        for (const e of L.e) { if (left <= 0) break; const p = Math.min(e.a, left); e.a -= p; left -= p; if (e.co && p > 0) { r.co = r.co || {}; r.co[e.co] = (r.co[e.co] || 0) + p; } }
        L.e = L.e.filter(e => e.a >= 0.5);
        if (ev.hit) r.boss += (paid0 - left) * C(ev.hit, 0, 1, 0);   // (Garnish 0.4; under Lien the whole payment)
        if (ev.push && L.e.length) L.e[L.e.length - 1].due += C(ev.push, 0, 3, 0);
        break;
      }
      case 'reneg': {
        const s = C(ev.secs, 0, 4, 0);
        for (const e of L.e) { e.due += s; e.rn = 1; }
        if (ev.drop && L.e.length) { let lo = 0; L.e.forEach((e, i) => { if (e.a < L.e[lo].a) lo = i; }); L.e.splice(lo, 1); }
        if (ev.merge && L.e.length > 1) { const sum = OATH.total(L), due = Math.max(...L.e.map(e => e.due)); L.e = [{ a: sum, due, id: ++L.n, co: 0, b: 0, born: t, rn: 1 }]; }
        break;
      }
      case 'settle': {   // pay what's written at pct of its size (o.older: only entries at least that old)
        const pct = C(ev.pct, 0.25, 0.6, OATH.SETTLE), older = C(ev.older, 0, 8, 0);
        const take = L.e.filter(e => t - e.born >= older);
        r.self += take.reduce((s, e) => s + e.a, 0) * pct;
        L.e = L.e.filter(e => !take.includes(e));
        break;
      }
      case 'lien': L.lien = t + C(ev.dur, 0, 13, 0); break;
      case 'writ': L.writ = t + C(ev.dur, 0, 8, 0); L.writMark = C(ev.mark, 0, OATH.LIEN, 0); break;
      // Default strikes the boss for part of what it tears up; Foreclose for all of it, a renegotiated line at FORE_RN
      // (a renegotiated line in full; a Ledger of BIG of your HP or more is a debt worth defaulting on: every line in full,
      // a renegotiated one at FORE_RN)
      case 'default': {
        const big = OATH.total(L) >= maxHp * OATH.BIG;
        r.boss += L.e.reduce((s, e) => s + e.a * (big ? (e.rn ? OATH.FORE_RN : 1) * OATH.FORE_BIG : (e.rn ? 1 : OATH.DEFAULT)), 0) * C(ev.mult, 0, OATH.DEFAULT, 0) / OATH.DEFAULT;
        L.e = []; L.frozen = t + C(ev.freeze, 4, OATH.FREEZE, OATH.FREEZE); break;
      }
      case 'foreclose': r.boss += L.e.reduce((s, e) => s + e.a * (e.rn ? OATH.FORE_RN : 1), 0) * C(ev.mult, 0, 1.2, 1) * (OATH.total(L) >= maxHp * OATH.BIG ? OATH.FORE_BIG : OATH.FORE_SMALL); if (!ev.keep) L.e = []; L.frozen = t + C(ev.freeze, 4, OATH.FREEZE, OATH.FREEZE); break;   // (keep: Rollover, the Collector's spec row: the entries stay)
      case 'summons': L.summons = t + 6; break;
      case 'reckon': L.e = []; break;   // Final Reckoning (the Ultimate): every entry comes due on the boss; the kit strikes for it
      case 'hold': L.hold = t + C(ev.dur, 0, 6, 0); break;
      // the spec rows: Blanket Surety writes a debt of your own (owe); Compound Interest swells the entries on the books (grow)
      case 'owe': { const a = C(ev.amount, 0, maxHp * 0.3, 0); if (a > 0 && t >= L.frozen) L.e.push({ a, due: t + L.due, id: ++L.n, co: 0, b: 0, born: t }); break; }
      case 'grow': { const g = C(ev.pct, 0, 0.3, 0); for (const e of L.e) e.a *= 1 + g; break; }
    }
    L.ver++;
    return r;
  },
  // the copy the owner's gauge draws: [[amount, seconds left (0.1), co-signed ally or 0, renegotiated], ...] plus timers
  pack(L, t) {
    const left = x => Math.max(0, Math.round((x - t) * 10) / 10);
    return { l: L.e.map(e => [Math.round(e.a), left(e.due), e.co || 0, e.rn ? 1 : 0]), z: left(L.frozen), li: left(L.lien), wr: left(L.writ), ho: left(L.hold), su: t < L.summons ? 1 : 0,
      co: L.cosign && L.cosign.until > t ? L.cosign.id : null, cl: left(L.cosign ? L.cosign.until : -99) };
  },
};

// the kit's side: the host's copy of the Ledger, as entries with due times on this client's clock
function oathTake(k, d) {
  const now = k.now;
  k.g.ledger = (d.l || []).map(([a, s, co, rn]) => ({ a, due: now + s, co, rn: rn || 0 }));
  k.g.frozen = now + (d.z || 0); k.g.lienUntil = now + (d.li || 0); k.g.writUntil = now + (d.wr || 0); k.g.holdUntil = now + (d.ho || 0);
  k.g.summoned = !!d.su; k.g.cosign = d.co ?? null; k.g.cosignUntil = now + (d.cl || 0);
  k.g.total = k.g.ledger.reduce((s, e) => s + e.a, 0);
  if (k.g.ledger.length > (k.g.count || 0)) k.fxGain(1);   // (item effects: a new entry builds the gauge)
  k.g.count = k.g.ledger.length;
  if (d.bill) {
    k.g.stampAt = now; k.g.stampA = d.bill;
    if (k.talent('oathbroker_compound') && oathLien(k)) oathSend(k, { op: 'grow', pct: 0.15 });   // Compound Interest (Collector, spec row VI)
  }
}
const oathTotal = k => k.g.total || 0;
const oathLien = k => k.now < (k.g.lienUntil || 0);   // (Lien running: a Collect payment strikes the boss)
const oathHp = k => k.env.maxHp() || 1;
// how much of the Ledger comes due in the next s seconds
const oathDueSoon = (k, s) => k.g.ledger.filter(e => e.due - k.now <= s).reduce((t, e) => t + e.a, 0);
function oathSend(k, ev) { k.env.emit(Object.assign({ type: 'ledger' }, ev)); }
// the terms the host keeps for this hero (sent every few seconds, so a host that missed one has them soon)
function oathTerms(k) {
  if (k.now - (k.g.termsAt ?? -99) < 3) return;
  k.g.termsAt = k.now;
  oathSend(k, { op: 'terms', due: k.talent('oathbroker_grace') ? 10 : OATH.DUE, col: k.def.collector || 0, small: k.talent('oathbroker_fineprint') ? 0.02 : 0, tithe: k.talent('oathbroker_tithe') ? 0.25 : 0 });
}
// Settle's glow: enough written that paying half now beats paying it all later
const oathSettleGlow = k => oathTotal(k) >= oathHp(k) * 0.22 && k.now >= (k.g.frozen || 0);

KITS.oathbroker = {
  potMult: 0.865, // balance knob (tools/simulate.js)
  role: 'tank',
  ledger: true,   // (tools/simulate.js: hits go through the Ledger)
  auto: { kind: 'stamp', potency: 40, range: MELEE },
  gauge: { kind: 'ledger', key: 'count', max: 8, label: 'Ledger', w: 150 },
  init: () => ({ ledger: [], total: 0, count: 0, step: 0, comboUntil: 0, frozen: 0, lienUntil: 0, writUntil: 0, holdUntil: 0, summoned: false, cosign: null, cosignUntil: 0, stampAt: -9, stampA: 0 }),
  onNotify(k, type, d) { if (type === 'ledger') oathTake(k, d); },
  tick(k) {
    oathTerms(k);
    // the copy's timers run on between the host's updates; entries past due drop off when the host bills them
    k.g.ledger = k.g.ledger.filter(e => e.due > k.now - 1.5);
    k.g.count = k.g.ledger.length;
    // the Guarantor's spec rows: Roving Surety moves the Co-Sign to whoever is hurt most; Foresight brings Co-Sign back when the boss begins a cast
    if (k.talent('oathbroker_roving') && k.g.cosign != null && k.g.cosignUntil > k.now + 1 && k.now >= (k.g.roamAt || 0)) { k.g.roamAt = k.now + 3; oathSend(k, { op: 'cosign', target: null, dur: k.g.cosignUntil - k.now }); }
    if (k.talent('oathbroker_foresight')) onBossCast(k, () => { if (k.now >= (k.g.foreAt || 0)) { k.g.foreAt = k.now + 10; k.refill('cosign'); k.fx('empower'); } });
    // Escrow: a long Ledger is armour
    if (k.talent('oathbroker_escrow') && k.g.ledger.length >= 3 && k.now >= (k.g.escrowAt || 0)) { k.g.escrowAt = k.now + 1; k.mitigate('self', 0.1, 1.2, { ab: k.abilities[2] }); }
  },
  signature: 'The Ledger',
  floor: 'Press Q to strike: it pays your debts down. Press E when the Ledger gets long to settle it at half, and F if it\'s about to kill you.',
  ceiling: [
    '60% of every hit you take is written into the Ledger and comes due 8s later. The column on your gauge shows each entry and its timer.',
    'Renegotiate pushes every entry back 4s and marks it ». Roll a tankbuster\'s bill past the raidwide that follows it, and into a window that pays for it: under Lien the boss pays all of a marked line, under Writ you pay half, and Default strikes for it in full.',
    'Settle pays the whole Ledger now, at half. It turns scary delayed damage into one chunk your healer can see coming. Or let it grow for Default: a small Ledger torn up strikes the boss for half, but one holding 30% of your HP or more is a debt worth defaulting on and strikes for a quarter more than it held. Keep Writ off the tankbuster you mean to Default on.',
    'Lien makes the boss pay half of every bill that comes due for 10s, and every Collect strike that pays the Ledger down also strikes the boss for what it paid. Line it up with a tankbuster\'s bill: hold it a few seconds past the burst if one is about to land.',
  ],
  abilities: [
    {
      id: 'collect', name: 'Collect', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'Three strikes of the seal-mace on one button: Dun ({d:230}) > Levy ({d:300}) > Collect ({d:400}). Every strike pays your oldest entry down by 2% of your HP.',
      label: k => ['Dun', 'Levy', 'Collect'][k.now < k.g.comboUntil ? k.g.step : 0],
      effect(k) {
        const step = k.now < k.g.comboUntil ? k.g.step : 0;
        let pot = [230, 300, 400][step];
        if (step === 2 && k.talent('oathbroker_interest')) pot += 16 * Math.min(5, k.g.ledger.length);
        const over = step < 2 && k.talent('oathbroker_overdraft');   // Overdraft (Collector, spec row VI): Dun and Levy stop paying the Ledger down; only the third strike does
        k.damage(pot, { ab: this });
        if (k.g.ledger.length) {
          const amount = oathHp(k) * OATH.PAY * (k.perk('oathbroker_w1') ? 1.5 : 1);
          if (!over) {
            // (under Lien the whole payment strikes the boss; otherwise Garnish's share)
            oathSend(k, { op: 'pay', amount, hit: oathLien(k) ? 1 : k.talent('oathbroker_garnish') ? 0.4 : 0, push: step === 2 && k.talent('oathbroker_notary') ? 3 : 0 });
            k.g.payAt = k.now;
            // the copy pays down too, so the column answers at once
            let left = amount, coPaid = null; for (const e of k.g.ledger) { if (left <= 0) break; const p = Math.min(e.a, left); if (p > 0 && e.co) coPaid = e.co; e.a -= p; left -= p; }
            k.g.ledger = k.g.ledger.filter(e => e.a >= 0.5); k.g.total = k.g.ledger.reduce((s, e) => s + e.a, 0);
            if (!k.g.ledger.length && k.now >= (k.g.paidAt || 0)) { k.g.paidAt = k.now + 6; k.fx('paidFull'); }   // (the last line paid off: the books stamped clean)
            if (k.talent('oathbroker_garnish')) k.stats.garnished = (k.stats.garnished || 0) + amount - left;
            if (coPaid && k.talent('oathbroker_endorse')) k.shield(coPaid, 60, 6, { ab: this });   // Endorsement (Guarantor, spec row VI)
          }
          k.ultGain(OATH.ULT_PAY);   // (Final Reckoning)
        }
        k.g.step = (step + 1) % 3; k.g.comboUntil = k.now + 15;
      },
      fx: { type: 'slash', color: '#d8d0c0', r: 50, span: 1.4 },
    },
    {
      id: 'reneg', name: 'Renegotiate', type: 'ogcd', target: 'self', cd: 20, lock: 0.3, anim: 'cast',
      desc: 'Push every entry in your Ledger back 4s. A renegotiated entry is a setup: if it comes due under Lien the boss pays all of it (not half), under Writ of Protection you pay only half of it, and Default strikes for it at full.',
      glow: k => oathDueSoon(k, 1.5) >= oathHp(k) * 0.12,
      effect(k) {
        oathSend(k, { op: 'reneg', secs: 4, drop: k.talent('oathbroker_amnesty') ? 1 : 0, merge: k.talent('oathbroker_consolidate') ? 1 : 0 });
        for (const e of k.g.ledger) { e.due += 4; e.rn = 1; }
        if (k.perk('oathbroker_a2')) k.shield('self', 160, 6, { ab: this });
      },
      fx: { color: '#c8c0e8' },
    },
    {
      id: 'settle', name: 'Settle', type: 'ogcd', target: 'self', cd: 25, lock: 0.4, anim: 'big',
      desc: 'Pay the whole Ledger now, at half its size: one chunk of damage your healer can see, instead of a column of bills.',
      usable: k => k.g.ledger.length > 0,
      glow: k => oathSettleGlow(k),
      effect(k) {
        const tot = oathTotal(k);
        oathSend(k, { op: 'settle', pct: OATH.SETTLE });
        k.ultGain(Math.min(OATH.ULT_SETTLE_MAX, tot / oathHp(k) * OATH.ULT_SETTLE));   // (Final Reckoning)
        if (k.talent('oathbroker_stamp')) k.damage(Math.min(700, tot / ENGINE.POT_SCALE * 0.5), { ab: this });
        if (k.perk('oathbroker_w2')) k.healRaw('self', oathHp(k) * 0.05, { ab: this });
        k.g.ledger = []; k.g.total = 0; k.g.settleAt = k.now; k.g.settleA = tot * OATH.SETTLE;
      },
      fx: { color: '#e8d8a8' },
    },
    {
      id: 'lien', name: 'Lien', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
      desc: 'Burst: for 10s, the boss pays half of every bill that comes due (all of a renegotiated one), as damage, and every Collect strike that pays your Ledger down also strikes the boss for what it paid.',
      glow: k => oathDueSoon(k, 9) >= oathHp(k) * 0.1,
      effect(k) { oathSend(k, { op: 'lien', dur: k.perk('oathbroker_w3') ? 13 : 10 }); k.g.lienUntil = k.now + 10; },
      fx: { color: '#b8a8ff' },
    },
    {
      id: 'writ', name: 'Writ of Protection', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
      desc: '30% less damage for 8s, and every entry written in that time is halved. A renegotiated entry that comes due in that time is billed to you at half.',
      effect(k) {
        k.mitigate('self', 0.3, 8, { ab: this });
        oathSend(k, { op: 'writ', dur: 8, mark: k.talent('oathbroker_garnishwrit') ? 1 / 3 : 0 });
      },
      fx: { color: '#e8e0c8' },
    },
    {
      id: 'default', name: 'Default', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
      desc: 'Tear the Ledger up: every entry is erased, and the boss is struck for half of what it held (a renegotiated entry in full). A Ledger holding 30% of your HP or more is a debt worth defaulting on: it strikes for a quarter more than it held, a renegotiated entry at nearly twice its size. Your credit freezes for 10s after: damage hits you as it lands.',
      usable: k => k.g.ledger.length > 0,
      glow: k => oathTotal(k) >= oathHp(k) * OATH.BIG,
      effect(k) {
        oathSend(k, { op: 'default', mult: OATH.DEFAULT, freeze: k.perk('oathbroker_a4') ? 7 : OATH.FREEZE });
        k.g.ledger = []; k.g.total = 0;
        oathDefaultAfter(k, this);
      },
      fx: { color: '#ff7a5a' },
    },
  ],
};
// what follows a Default or a Foreclose (the talents that don't depend on which one it is)
function oathDefaultAfter(k, ab) {
  if (k.talent('oathbroker_receivership')) k.mitigate('party', 0.1, 8, { ab });
  if (k.talent('oathbroker_slate')) { for (const id of ['reneg', 'settle']) { const a = k.abilities.find(x => k.baseId(x) === id); if (a) k.refill(a.id); } }
}

// the two tanks' taunts (carried by Open Wide and Renegotiate, TAUNT_CARRY): each feeds the class's own mechanic
Object.assign(TAUNT, {
  gorgemaw: {
    name: 'Bellow', icon: 'wide',
    desc: 'A roar from the bottom of the belly: your jaw hangs open for a second after it: anything that lands on you then is eaten.',
    use(k) { mawOpen(k, 1); },
  },
  oathbroker: {
    name: 'Summons', icon: 'lien',
    desc: 'A summons is served: the next blow you take within 6s goes onto the Ledger in full, due 3s later than usual.',
    use(k) { oathSend(k, { op: 'summons' }); k.g.summoned = true; },
  },
});

// Audit's reach: entries written at least 4s ago (on the copy: due within the Ledger's term less 4s)
const oathAuditable = k => { const due0 = (k.talent('oathbroker_grace') ? 10 : OATH.DUE) - 4; return k.g.ledger.filter(e => e.due - k.now <= due0); };

// talents that grant a new move (TALENT_ABILITIES, the shared system above)
TALENT_ABILITIES.gorgemaw_regurgitate = { cls: 'gorgemaw', ab: {
  id: 'regurgitate', replaces: 'spit', icon: 'spit', name: 'Regurgitate', type: 'gcd', target: 'enemy', range: 300, anim: 'big',
  desc: 'Bring the whole Belly up at once: every Morsel is spat at the boss in its own shape, each at 75% strength.',
  usable: k => k.g.belly.length > 0,
  glow: k => k.g.belly.length >= mawMax(k),
  effect(k) {
    let n = 0;
    while (k.g.belly.length) {
      const i = n++, r = mawSpitOne(k, this, { share: 0.75, n: i });
      if (r && r.crit && k.perk('gorgemaw_w2')) { k.damage(120, { ab: this }); k.fx('empower'); }   // (the Spit enhancement: each Morsel is a Spit)
    }
    k.g.marinade = 0; k.g.count = 0;
  },
  fx: { color: '#ffb070' },
} };
TALENT_ABILITIES.gorgemaw_stonebelly = { cls: 'gorgemaw', ab: {
  id: 'stonebelly', replaces: 'iron', icon: 'iron', name: 'Stone Belly', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
  desc: 'Swallow a stone: 30% less damage for 8s, and every Morsel you eat in that time is a Spike.',
  effect(k) { k.mitigate('self', k.perk('gorgemaw_a4') ? 0.4 : 0.3, 8, { ab: this }); k.buff('stone', 8); if (k.talent('gorgemaw_ironjaw')) mawOpen(k, 2); },
  fx: { color: '#a8a090' },
} };
// (the spec rows VII, SPEC_TALENTS in talents.js: the Glutton's Feeding Frenzy and the Gizzard's Banquet, both in Bottomless's place)
TALENT_ABILITIES.gorgemaw_frenzy = { cls: 'gorgemaw', ab: {
  id: 'feedingfrenzy', replaces: 'bottomless', icon: 'bottomless', name: 'Feeding Frenzy', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
  desc: 'For 4s you eat everything, raidwide attacks too: the whole party takes half from them, and every hit is a Morsel for you, twice over: a copy of it joins the Belly.',
  effect(k) {
    mawOpen(k, 4, { all: true }); k.buff('twice', 5);
    if (k.talent('gorgemaw_feast')) k.refill(k.abilities[1].id);
    if (k.perk('gorgemaw_w3')) k.shield('party', 140, 6, { ab: this });
  },
  fx: { color: '#ff6a3a' },
} };
TALENT_ABILITIES.gorgemaw_banquet = { cls: 'gorgemaw', ab: {
  id: 'banquet', replaces: 'bottomless', icon: 'bottomless', name: 'Banquet', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
  desc: 'For 4s you eat everything, raidwide attacks too: the whole party takes half from them, and every hit is a Morsel for you. When the jaw closes, the whole Belly is digested at once, twice over.',
  effect(k) {
    const ab = this;
    mawOpen(k, 4, { all: true });
    if (k.talent('gorgemaw_feast')) k.refill(k.abilities[1].id);
    if (k.perk('gorgemaw_w3')) k.shield('party', 140, 6, { ab });
    k.after(4.2, () => {
      const eaten = k.g.belly.slice(); if (!eaten.length) return;
      k.g.belly = []; k.g.count = 0;
      k.healRaw('self', k.env.maxHp() * 0.03 * eaten.length * 2, { ab }); mawProtect(k, ab, eaten.map(e => e.m), 2);
      k.ultGain(MAW.ULT_USE * eaten.length); k.fx('digest', { n: eaten.length, m: eaten.map(e => e.m[0]).join('') });
    });
  },
  fx: { color: '#ffb070' },
} };
TALENT_ABILITIES.oathbroker_audit = { cls: 'oathbroker', ab: {
  id: 'audit', replaces: 'settle', icon: 'settle', name: 'Audit', type: 'ogcd', target: 'self', cd: 15, lock: 0.4, anim: 'cast',
  desc: 'Go through the books: every entry at least 4s old is paid now at 30% of its size. Newer entries stay.',
  usable: k => k.g.ledger.length > 0,
  glow: k => oathAuditable(k).reduce((s, e) => s + e.a, 0) >= oathHp(k) * 0.12,
  effect(k) {
    oathSend(k, { op: 'settle', pct: 0.3, older: 4 });
    const take = oathAuditable(k);
    if (k.talent('oathbroker_stamp')) k.damage(Math.min(500, take.reduce((s, e) => s + e.a, 0) / ENGINE.POT_SCALE * 0.5), { ab: this });
    k.g.ledger = k.g.ledger.filter(e => !take.includes(e)); k.g.total = k.g.ledger.reduce((s, e) => s + e.a, 0);
    k.g.settleAt = k.now;
    k.ultGain(Math.min(OATH.ULT_SETTLE_MAX, take.reduce((s, e) => s + e.a, 0) / oathHp(k) * OATH.ULT_SETTLE));   // (Final Reckoning)
    if (k.perk('oathbroker_w2')) k.healRaw('self', oathHp(k) * 0.05, { ab: this });   // (Settle's enhancement)
  },
  fx: { color: '#e8d8a8' },
} };
TALENT_ABILITIES.oathbroker_moratorium = { cls: 'oathbroker', ab: {
  id: 'moratorium', replaces: 'reneg', icon: 'reneg', name: 'Moratorium', type: 'ogcd', target: 'self', cd: 45, lock: 0.3, anim: 'big',
  desc: 'Declare a moratorium: for 5s nothing comes due. Every timer in the Ledger stops until it ends.',
  glow: k => oathDueSoon(k, 2) >= oathHp(k) * 0.15,
  effect(k) { oathSend(k, { op: 'hold', dur: 5 }); for (const e of k.g.ledger) e.due += 5; k.g.holdUntil = k.now + 5; if (k.perk('oathbroker_a2')) k.shield('self', 160, 6, { ab: this }); },   // (Renegotiate's enhancement)
  fx: { color: '#c8c0e8' },
} };
// (spec row VII, both in Writ of Protection's place)
TALENT_ABILITIES.oathbroker_blanket = { cls: 'oathbroker', ab: {
  id: 'blanket', replaces: 'writ', icon: 'writ', name: 'Blanket Surety', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
  desc: 'Stand surety for the whole party: everyone takes 20% less damage for 8s, and a fifth of your HP is written into your Ledger at once, due like any other entry.',
  glow: k => bossCasting(k),
  effect(k) { k.mitigate('party', 0.2, 8, { ab: this }); oathSend(k, { op: 'owe', amount: oathHp(k) * 0.2 }); },
  fx: { color: '#e8e0c8' },
} };
TALENT_ABILITIES.oathbroker_warrant = { cls: 'oathbroker', ab: {
  id: 'warrant', replaces: 'writ', icon: 'writ', name: 'Warrant', type: 'ogcd', target: 'enemy', range: 300, cd: 60, anim: 'big',
  desc: 'Serve the boss with a warrant: a blow for {d:250}, and for 10s it takes 6% more damage from the whole party. You take 15% less damage while it stands.',
  effect(k) { k.damage(250, { ab: this, threat: 2 }); k.debuffTarget('vuln', 0.06, 10, { ab: this }); k.mitigate('self', 0.15, 10, { ab: this }); },
  fx: { color: '#ffd27a' },
} };

// Oathbroker's Ultimate (TANK ULTIMATES): paying the Ledger fills it (OATH.ULT_PAY for every Collect strike that pays
// an entry down, and a Settle or Audit by the share of your HP it settled). Every entry comes due at once, on the boss:
// the host strikes the Ledger off ('reckon', no bill, no freeze) and the kit's own copy is what the blow and the
// shields are measured by.
ULTIMATES.oathbroker = {
  id: 'reckoning', name: 'Final Reckoning', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: 300, anim: 'big', icon: 'foreclose',
  lock: 1.0, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5 },
  desc: 'The Ledger is closed and every entry in it comes due at once, on the boss instead of you: nothing is billed to you, and your credit never freezes. ' +
    'The seal comes down on your target for {d:700}, and {d:50} more for every 1% of your HP the Ledger held, up to {d:1500} more.' +
    'The settled account is shared out: the whole party is shielded for {s:150} plus a quarter of what the Ledger held (at most 15% of your HP) for 8s. ' +
    'You take 30% less damage and can\'t be knocked back while you close it.' +
    '<div class="it-ult"><span><u>Charge:</u> 1.6% for every Collect strike that pays an entry down, up to 5% for every Settle or Audit (the more it settles, the more), and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
  effect(k) {
    const ab = this, tot = oathTotal(k), mx = oathHp(k);
    oathSend(k, { op: 'reckon' });
    k.g.ledger = []; k.g.total = 0; k.g.count = 0;
    k.damage(700 + Math.min(1500, 50 * tot / mx * 100), { ab, threat: 2 });
    k.shield('party', 150 + Math.min(mx * 0.15, tot * 0.25) / ENGINE.POT_SCALE, 8, { ab });
    k.fx('oath-reckoning', { a: Math.round(tot) });
  },
};

if (typeof module !== 'undefined') Object.assign(module.exports, { MAW, MAW_TYPES, mawMax, mawOpen, mawEat, mawSpit, mawSpitOne, mawDigestTake, mawGut, mawGulp, mawSpitGlow, mawHard, mawDigestOk, mawDigestGlow, mawWideGlow,
  OATH, oathTake, oathTotal, oathLien, oathHp, oathDueSoon, oathSend, oathTerms, oathSettleGlow, oathDefaultAfter, oathAuditable });

// IRONPALM (tank; the combo-paced class from docs/plans/2026-10-pacing-and-class-ideas.md). Its own block, so the
// classes above stay exactly as they were.
// ===================================================================================================================
// No global cooldown (`pacing`, engine.js). Light / Heavy / Kick on Q W E are inputs: every press is a quick hit with its
// own recovery, costs Breath, and adds a letter (L H K) to the string. A string that spells a named move fires it on
// its last press (IP_MOVES). Strings branch (H H, then H is Iron Ox and K is Stone Breaker) and some carry on past a
// finished move (Rising Gate is L L H; K K after it is Heaven's Drop). A press that fits no string breaks it and starts
// a new one, and so does waiting longer than WINDOW after the last recovery ends; after a finished move any key just
// starts the next string. A press made in the first moment after the recovery ends (pressed then, not buffered early)
// is Crisp: harder and cheaper, so mashing works but rhythm wins. Breath refills slowly while you press, fast once you
// stop for a moment. R Read is a parry stance (mitigate kind 'parry'): a hit caught in its first 0.4 s (fight.js
// READ_WINDOW) lands at half strength and the kit hears 'read'; a caught tankbuster opens a free Thousand Palms.
const IRONPALM = {
  WINDOW: 0.8,       // after a press's recovery ends, the string waits this long for the next input
  JUGGLE: 1.3,       // ... after Rising Gate (the boss is in the air)
  GATE_GUARD: 0.3,   // ... and while it is, you take this much less damage (for JUGGLE + 0.2 s: the 1.5s the tooltip gives)
  CRISP: 0.3,        // a press made in this first moment after the recovery ends (not buffered early) is Crisp
  CRISP_SAVE: 0.4,   // ... it costs 40% less Breath
  CRISP_HIT: 0.1,    // ... and hits 10% harder
  STAGGER: 0.2,      // Avalanche Fist: a broken string locks you this long
  WINDED: 18, RECOVER: 45,   // below 18 Breath you're winded until it's back to 45: the resting pace (TAP_REFILL of it while you keep tapping)
  TAP: 0.5,          // ... and every press is a weak tap at half the input's hit: no string, no named move, no Breath
  CRISP_BUFFER: 0.25, // a press buffered no more than this early still lands Crisp
  LONG: 1.15,        // Avalanche Fist: a named move of four inputs or more, its bonus this much stronger
  RUSH: 0.02, RUSH_MAX: 8, RUSH_FADE: 4,   // Avalanche Fist's Momentum: +2% a named move, up to 8, gone 4s after the last
  OPENING: 4,        // a read tankbuster: the next Heavy within 4s is a free Thousand Palms
  OFFBAL: 4,         // Iron Ox: Read back at once, and a blow read within 4s opens like a tankbuster
  FLOW_BREATH: 12, FLOW_LOW: 40,   // Flowing Palms with all three palms Crisp, finished under 40 Breath, gives 12 back
  TAP_REFILL: 0.75,  // winded and still tapping: Breath comes back at this share of the resting pace
  READ: { pct: 0.2, dur: 1.2, counter: 63 },
  PERFECT: 0.5, PERFECT_REST: 8,   // Perfect Form (talent): a named move with every press Crisp echoes its finishing blow at this strength, at most once every 8s
  pool: { key: 'breath', max: 100, regen: 11, rest: 36, delay: 0.45 },   // (delay: counted from the end of the last press's recovery, engine.js)
};
const IP_SLOT = { L: 0, H: 1, K: 2 };
const IP_ANIM = { L: 'palm', H: 'fist', K: 'kick' };
// the inputs: the press's own potency, the Breath it costs, and its recovery (animation lock)
const IP_INPUT = { L: { pot: 52, cost: 12, lock: 0.38 }, H: { pot: 83, cost: 18, lock: 0.6 }, K: { pot: 68, cost: 15, lock: 0.48 } };
const IP_NAME = { L: 'Light', H: 'Heavy', K: 'Kick' };

// a named move: what a string fires on its last press (that press's hit, plus `bonus`, or a flurry of `flurry` hits)
function ipMove(id, name, seq, o) {
  const x = seq[seq.length - 1];
  return Object.assign({ id, name, seq, input: x, slot: IP_SLOT[x], named: true, type: 'gcd', target: 'enemy', range: MELEE, anim: IP_ANIM[x],
    bonus: 0, threat: 1, effect(k) { ipPress(k, this); } }, o);
}
const IP_MOVES = [
  ipMove('crane', 'Crane Step', 'KL', { bonus: 17, desc: 'A hop and a flicked palm for {d:69}. It gives back 22 Breath.',
    finish(k) { ipBreath(k, k.perk('ironpalm_w1') ? 30 : 22); } }),
  ipMove('flow', 'Flowing Palms', 'LLL', { bonus: 70, desc: 'Three quick open palms, the last one pushed through for {d:122}. Cheap and simple, and a way to breathe without stopping: if all three palms land Crisp and leave you under 40 Breath, they give 12 back.',
    finish(k) { const ks = k.g.keys.slice(-3); if (ks.length === 3 && ks.every(e => e.crisp) && k.g.breath < IRONPALM.FLOW_LOW) { ipBreath(k, IRONPALM.FLOW_BREATH); k.stats.flowCrisp = (k.stats.flowCrisp || 0) + 1; k.fx('flowBreath'); } } }),
  ipMove('gate', 'Rising Gate', 'LLH', { bonus: 42, threat: 3, anim: 'uppercut', alt: { ironpalm_swallow: 'KLH' },
    desc: 'A launching uppercut for {d:125}. The boss is in the air: you take 30% less damage for 1.5s, the next input has longer to come, and any key you press carries the string on to Heaven\'s Drop.',
    finish(k, mv) { k.mitigate('self', IRONPALM.GATE_GUARD, IRONPALM.JUGGLE + 0.2, { ab: mv }); } }),
  ipMove('drop', 'Heaven\'s Drop', 'LLHKK', { bonus: 98, anim: 'axe', lock: 0.62, alt: { ironpalm_swallow: 'KLHKK' },
    desc: 'Rising Gate, then two kicks: an axe kick brought down on the airborne boss for {d:166}.',
    finish(k, mv) { if (k.talent('ironpalm_mountain')) k.after(1, () => { k.damage(40, { ab: mv }); k.fx('aftershock'); }); } }),
  ipMove('wall', 'Tiger Wall', 'HKK', { bonus: 13, anim: 'guard', desc: 'A low blocking kick for {d:81}, then a stance: 25% less damage for 5s.',
    finish(k, mv) { k.mitigate('self', 0.25, 5, { ab: mv }); k.buff('wall', 5); if (k.talent('ironpalm_shirt')) k.shield('self', 130, 5, { ab: mv }); } }),
  ipMove('breaker', 'Stone Breaker', 'HHK', { bonus: 39, desc: 'A crushing kick to the knee for {d:107}: the boss is Bruised and takes {d:20} every 3s for 15s.',
    finish(k, mv) { k.dot('bruise', 20, 15, 3, { ab: mv }); } }),
  ipMove('ox', 'Iron Ox', 'HHH', { bonus: 63, threat: 2, desc: 'Three heavy blows, the last driven home with the whole body for {d:146}. It throws the boss off balance: Read is ready again at once, and the next blow you Read within 4s opens it up as a tankbuster does (your next Heavy is a free Thousand Palms).',
    finish(k) { k.reduceCooldown(ipAbId(k, 'read'), 99); k.buff('offbal', IRONPALM.OFFBAL); k.fx('oxStagger'); } }),
  ipMove('palms', 'Thousand Palms', 'LKHH', { flurry: 5, bonus: 119, anim: 'flurry', lock: 0.75, desc: 'The finisher: a storm of open palms, five strikes of {d:24} on top of the blow ({d:83}).',
    finish(k, mv, st) {
      if (k.talent('ironpalm_hundred')) k.buff('guard', 6);
      if (k.talent('ironpalm_echo')) k.after(0.6, () => { for (let i = 0; i < 3; i++) k.after(i * 0.08, () => k.damage(mv.bonus * (st.open ? 1.3 : 1) / 9, { ab: mv })); k.fx('echo-palm'); });
    } }),
];

// every string this kit knows: [{ seq, mv }] (a talent can add another way to spell a move: Swallow's Return)
function ipMoves(k) {
  const key = (k.def.spec || '') + (k.talent('ironpalm_swallow') ? '+swallow' : '');
  if (k._ipKey === key && k._ipList) return k._ipList;
  const list = [];
  for (const mv of k.def.moves) {
    list.push({ seq: mv.seq, mv });
    for (const [tid, seq] of Object.entries(mv.alt || {})) if (k.talent(tid)) list.push({ seq, mv });
  }
  k._ipKey = key;
  return (k._ipList = list);
}
// Unbroken (talent): while your D cooldown's buff lasts, strings never drop or break
const ipUnbroken = k => k.talent('ironpalm_unbroken') && (k.has('skin') || k.has('pond') || k.has('bellows'));
// is the string still open (pressed in time)?
const ipLive = k => !!k.g.str && (k.now <= k.g.strUntil || k.has('slide') || ipUnbroken(k));
// Winded: once Breath falls below WINDED you're winded until it's back to RECOVER. It refills at the resting pace the
// whole time (KITS.ironpalm.poolRest), the keys stop glowing, and every press is a weak tap. Updated every frame (ipTick).
const ipWinded = k => !!k.g.winded;
function ipWindUpdate(k) {
  const g = k.g, b = g.breath || 0;
  if (g.winded && b >= IRONPALM.RECOVER) g.winded = false;
  else if (!g.winded && b < IRONPALM.WINDED) { g.winded = true; g.windedAt = k.now; k.stats.winded = (k.stats.winded || 0) + 1; }
}
// a winded press: the input's own hit at TAP strength; the string goes quietly (an Opening's Heavy still lands in full)
const ipTaps = (k, x) => ipWinded(k) && !(x === 'H' && k.has('opening'));
// the string after pressing x: { s, move (the named move it fires, or null), broke (it broke a string), open (a free finisher), ends }
function ipStep(k, x) {
  const list = ipMoves(k), fits = s => list.some(e => e.seq.startsWith(s));
  const base = ipLive(k) ? k.g.str : '';
  let s = base + x, broke = false, open = false;
  // the boss in the air after Rising Gate: any key carries on to Heaven's Drop (the juggle can't break)
  const air = !fits(s) && base.length >= 3 && list.find(e => e.mv.id === 'drop' && e.seq.length > base.length && e.seq.startsWith(base));
  if (x === 'H' && k.has('opening')) { s = 'LKHH'; open = true; }   // a read tankbuster: this Heavy is the finisher
  else if (air) s = base + air.seq[base.length];
  else if (!fits(s)) { broke = base.length > 0 && !k.g.clean; s = fits(x) ? x : ''; }
  const hit = list.find(e => e.seq === s) || null;
  const ends = !!hit && !list.some(e => e.seq.length > s.length && e.seq.startsWith(s));
  return { s, move: hit ? hit.mv : null, broke, open, ends };
}
// Breath straight back (a refund, not the gauge filling on its own: no item triggers)
function ipBreath(k, n) { const was = k.g.breath || 0; k.g.breath = Math.min(k.poolMax(), was + n); if (k.g.breath > was) k.fxGain(k.g.breath - was); }
// a string broken or let go mid-way. Avalanche Fist staggers and loses its Momentum.
function ipDrop(k, why) {
  const g = k.g;
  g.dropAt = k.now; g.dropWhy = why; g.plan = null;
  k.stats.drops = (k.stats.drops || 0) + 1;
  if (!k.def.avalanche || k.has('slide') || ipUnbroken(k)) return;
  // a broken string costs you 2 Momentum and staggers you (one let go just ends)
  if (why !== 'broke') return;
  const rb = k.buffs.get('rush');
  if (rb && rb.end > k.now) { rb.stacks = Math.max(0, rb.stacks - 2); if (!rb.stacks) k.clear('rush'); }
  k.lockUntil = Math.max(k.lockUntil, k.now + IRONPALM.STAGGER); k.lockLen = Math.max(0.1, k.lockUntil - k.now);
  k.buff('stagger', IRONPALM.STAGGER);
  k.fx('stagger');
}
// one press of Light, Heavy or Kick (ab is the input, or the named move it completed)
function ipPress(k, ab) {
  const g = k.g, x = ab.input, inp = IP_INPUT[x], now = k.now;
  if (ipTaps(k, x)) {
    k.damage(inp.pot * IRONPALM.TAP, { ab });
    g.str = ''; g.keys = []; g.plan = null; g.clean = false; g.lastPress = now;
    g.tapUntil = now + inp.lock + IRONPALM.pool.delay;   // (tapping through it breathes at half the resting pace: poolRate)
    k.stats.taps = (k.stats.taps || 0) + 1;
    return;
  }
  const st = ipStep(k, x), mv = st.move;
  // Crisp: pressed in the first moment after the last recovery ended (or buffered no more than CRISP_BUFFER before it
  // ended), while you're in the rhythm
  const inq = k.input;
  // (an Opening's Thousand Palms is always Crisp)
  const crisp = st.open || (!!inq && (inq.buffered ? now - inq.at <= IRONPALM.CRISP_BUFFER : inq.idle <= IRONPALM.CRISP) && now - g.lastPress < 3);
  if (st.broke) ipDrop(k, 'broke');
  if (!g.str || st.s.length <= 1 || st.open || st.broke || !ipLive(k)) g.keys = [];
  g.keys.push({ x, crisp, t: now });
  g.str = st.s; g.lastPress = now;
  k.stats.presses = (k.stats.presses || 0) + 1;
  if (st.open) { ipBreath(k, inp.cost); k.consume('opening'); k.stats.openings = (k.stats.openings || 0) + 1; }
  else if (crisp) ipBreath(k, inp.cost * IRONPALM.CRISP_SAVE);
  if (crisp) { k.stats.crisp = (k.stats.crisp || 0) + 1; k.env.emit({ type: 'fxLocal', name: 'crisp', data: { x } }); }
  k.ultGain(crisp ? IRONPALM.ULT_CRISP : IRONPALM.ULT_PRESS);   // (Hundred Palms: every press of a string, a Crisp one a little more)
  let pot = inp.pot * (x === 'L' && k.has('guard') ? 1.3 : 1);
  const bonusMult = (st.open ? 1.3 : 1) * (k.def.avalanche && mv && mv.seq.length >= 4 ? IRONPALM.LONG : 1);
  if (mv && !mv.flurry) pot += mv.bonus * bonusMult;
  const mult = crisp ? 1 + IRONPALM.CRISP_HIT : 1;
  k.damage(pot, { ab, mult, threat: (mv && mv.threat) || 1 });
  g.clean = !!mv;
  if (mv) {
    g.flash = { id: mv.id, name: mv.name, at: now, keys: g.keys.slice(), open: st.open };
    k.stats.moves = (k.stats.moves || 0) + 1;
    k.ultGain(IRONPALM.ULT_MOVE);   // (Hundred Palms)
    if (mv.flurry) {
      const n = mv.flurry + (k.perk('ironpalm_w2') ? 1 : 0);
      for (let i = 0; i < n; i++) k.after(0.07 * (i + 1), () => k.damage(mv.bonus * bonusMult / mv.flurry * (i >= mv.flurry ? 0.3 : 1), { ab: mv, mult }));
    }
    if (k.def.avalanche) k.buff('rush', k.has('slide') ? 30 : IRONPALM.RUSH_FADE, {}, IRONPALM.RUSH_MAX, mv.seq.length >= 4 ? 2 : 1);   // (a long move: 2)
    if (mv.finish) mv.finish(k, mv, st);
    // Perfect Form (talent): a named move with every press Crisp strikes again a moment later, its finishing blow at half strength
    if (k.talent('ironpalm_perfect') && now >= (g.perfectAt || 0) && (st.open || (g.keys.length >= mv.seq.length && g.keys.slice(-mv.seq.length).every(e => e.crisp)))) {
      g.perfectAt = now + IRONPALM.PERFECT_REST;
      const echo = (pot + (mv.flurry ? mv.bonus * bonusMult : 0)) * IRONPALM.PERFECT;
      k.after(0.3, () => { k.damage(echo, { ab: mv, mult, extra: true }); k.fx('perfectForm', { id: mv.id }); });
      k.stats.perfectForm = (k.stats.perfectForm || 0) + 1;
    }
    // the spec rows: Flood Tide (Still Water, VI) echoes a named move after a perfect Read; Cascade (Avalanche, VI) drops a rockfall behind a long one
    if (k.has('flood')) { k.consume('flood'); k.damage(25, { ab: mv }); k.fx('echo-palm'); }
    if (k.talent('ironpalm_cascade') && mv.seq.length >= 4 && k.stacks('rush')) { k.damage(5 * k.stacks('rush'), { ab: mv }); k.fx('aftershock'); }
    if (mv.id === 'crane' && k.talent('ironpalm_heron')) { k.mitigate('self', IRONPALM.READ.pct, IRONPALM.READ.dur, { kind: 'parry', ab: mv }); k.buff('read', IRONPALM.READ.dur); }   // Heron's Stance (Still Water, VII)
    if (mv.seq.length >= 4 && k.talent('ironpalm_scree')) k.shield('lowest', 100 + 25 * k.stacks('rush'), 6, { ab: mv });   // Scree (Avalanche, VII)
    if (k.has('bellows')) { k.damage(54, { ab: k.abilities[4] }); ipBreath(k, 6); }
    if (ipUnbroken(k)) ipBreath(k, 4);
    if (k.talent('ironpalm_quiet')) k.lastSpend = now - IRONPALM.pool.delay;   // the resting refill starts at once
  }
  g.juggle = !!mv && mv.id === 'gate';
  g.strUntil = k.lockUntil + (g.juggle ? IRONPALM.JUGGLE : IRONPALM.WINDOW);
  if (st.ends || !g.str) { g.str = ''; g.keys = []; g.plan = null; }
}
// every frame: a string left hanging drops (a finished move just ends quietly)
function ipTick(k) {
  const g = k.g;
  ipWindUpdate(k);
  // the spec rows' reactions: Calm Before the Blow (Still Water) and Mountain Wakes (Avalanche) answer a cast aimed at you; Bedrock holds at 6 Momentum
  if (k.talent('ironpalm_calm')) onBossCast(k, () => { const b = bossNow(k); if (b && b.onMe) { ipBreath(k, k.poolMax()); g.winded = false; k.fx('flowBreath'); } });
  else if (k.talent('ironpalm_wake')) onBossCast(k, () => { const b = bossNow(k); if (b && b.onMe) { k.buff('rush', 8, {}, IRONPALM.RUSH_MAX, IRONPALM.RUSH_MAX); k.fx('aftershock'); } });
  if (k.talent('ironpalm_bedrock') && k.stacks('rush') >= 6 && k.now >= (g.bedAt || 0)) { g.bedAt = k.now + 1; k.mitigate('self', 0.1, 1.2, { ab: k.abilities[0] }); }
  if (g.str && !ipLive(k)) {
    if (!g.clean) ipDrop(k, 'late');
    g.str = ''; g.keys = []; g.plan = null;
  }
}
// The glowing key: the next input of a planned string. It picks a plan when a string starts (Crane Step when Breath is
// low, Stone Breaker when the Bruise is wearing off, otherwise Rising Gate into Heaven's Drop or Thousand Palms in turn)
// and follows it; a press off the plan re-plans from wherever the string is now.
function ipGuide(k) {
  if (k.has('opening')) return 'H';
  const g = k.g, live = ipLive(k) ? g.str : '';
  if (!g.plan || !g.plan.startsWith(live) || g.plan.length <= live.length) g.plan = ipPlan(k, live);
  return g.plan ? g.plan[live.length] : null;
}
function ipPlan(k, live) {
  const g = k.g, list = ipMoves(k);
  if (!live || g.clean) {
    if (g.breath < 30 && list.some(e => e.mv.id === 'crane')) return 'KL';
    if (k.dotRemaining('bruise') < 4 && list.some(e => e.mv.id === 'breaker')) return 'HHK';
    g.alt = !g.alt;
    return g.alt ? 'LLHKK' : 'LKHH';
  }
  const on = list.filter(e => e.seq.startsWith(live) && e.seq.length > live.length).sort((a, b) => b.seq.length - a.seq.length);
  return on.length ? on[0].seq : null;
}
// the slot of the next input of a plan from where the string is now, or null if it doesn't fit (bots and the simulator)
function ipNext(k, plan) {
  const g = k.g, live = ipLive(k) ? g.str : '';
  if (k.has('opening')) return IP_SLOT.H;
  if (plan.startsWith(live) && plan.length > live.length) return IP_SLOT[plan[live.length]];
  if (!live || g.clean) return IP_SLOT[plan[0]];
  return null;
}
// the beat: the glowing key lights only as the last press's recovery ends (from CRISP_BUFFER before it), so pressing
// it when it lights lands Crisp
const ipOnBeat = k => k.lockUntil - k.now <= IRONPALM.CRISP_BUFFER;
function ipInputAb(x, id, desc) {
  const I = IP_INPUT[x];
  return { id, name: IP_NAME[x], input: x, type: 'gcd', target: 'enemy', range: MELEE, anim: IP_ANIM[x], lock: I.lock,
    meta: `${x} · no GCD · ${I.lock}s recovery · ${I.cost} Breath`, cost: k => (ipTaps(k, x) ? 0 : I.cost), glow: k => !ipWinded(k) && ipOnBeat(k) && ipGuide(k) === x, desc, effect(k) { ipPress(k, this); } };
}
// the base ability (by the id a spec or talent replaced) and its current id, for cooldown changes
const ipAbId = (k, base) => (k.abilities.find(a => k.baseId(a) === base) || {}).id;
function ipRead(k, d) {
  const b = !!(d && d.b), ab = k.abilities[3];
  k.stats.reads = (k.stats.reads || 0) + 1;
  if (b) k.stats.readBusters = (k.stats.readBusters || 0) + 1;
  k.ultGain(IRONPALM.ULT_READ * (b ? 2 : 1));   // (Hundred Palms)
  k.damage(IRONPALM.READ.counter + (!b && k.talent('ironpalm_deflect') ? 60 : 0), { ab, threat: 2 });
  ipBreath(k, k.def.stillWater ? k.poolMax() : 15);
  // a tankbuster read, or any blow read while Iron Ox has the boss off balance, opens it up
  const offbal = !b && k.consume('offbal');
  if (offbal) k.stats.oxOpen = (k.stats.oxOpen || 0) + 1;
  if (b || offbal) k.buff('opening', IRONPALM.OPENING);
  if (k.perk('ironpalm_a2') && k.now >= (k.g.readShieldAt || 0)) { k.g.readShieldAt = k.now + 10; k.shield('self', 160, 6, { ab }); }   // (at most one in 10s: a Still Pond's string of Reads is not a constant barrier)
  if (b && k.talent('ironpalm_ripples')) { k.mitigate('party', 0.15, 5, { ab }); k.fx('gong'); }   // Ripples (Still Water, VI)
  if (k.talent('ironpalm_flood')) k.buff('flood', 6, {}, 2, 2);   // Flood Tide (Still Water, VI)
  if (b && k.talent('ironpalm_answer')) { k.reduceCooldown(ipAbId(k, 'skin'), 20); k.reduceCooldown(ipAbId(k, 'bell'), 20); }
  k.fx('read', { b: b ? 1 : 0 });
}

KITS.ironpalm = {
  potMult: 0.64, // balance knob (tools/simulate.js)
  pacing: { kind: 'combo', gcd: false, buffer: 0.45, bufferSize: 2, repeat: false, pool: IRONPALM.pool },   // (item effects: each press counts by its recovery, engine.js itemGcdShare)
  auto: { kind: 'fist', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'breath', key: 'breath', max: 100, label: 'Breath', w: 250 },
  init: () => ({ breath: IRONPALM.pool.max, str: '', strUntil: 0, keys: [], plan: null, flash: null, dropAt: -9, lastPress: -9, clean: false, juggle: false, alt: false }),
  moves: IP_MOVES,
  moveFor(k, ab) { if (!ab.input || ipTaps(k, ab.input)) return ab; const st = ipStep(k, ab.input); return st.move || ab; },
  tick: k => ipTick(k),
  dmgMod: k => (k.has('wind') ? 0.1 : 0) + (k.def.avalanche ? IRONPALM.RUSH * k.stacks('rush') : 0),
  poolRate: k => (k.has('wind') ? 2 : 1) * (k.talent('ironpalm_lungs') ? 1.2 : 1) * (k.has('bellows') ? 1.5 : 1) * (ipWinded(k) && k.now < (k.g.tapUntil || 0) && !k.has('skin') ? IRONPALM.TAP_REFILL : 1),
  poolRest: k => k.has('skin') || ipWinded(k),   // winded: the resting pace until Breath is back to 45
  onNotify(k, type, d) { if (type === 'read') ipRead(k, d); },
  signature: 'Strings and Reads',
  floor: 'Press the glowing key as it lights: it lights on the beat, so following it keeps your presses Crisp, and Q, W and E spell named moves on their own. When the ring runs dry you\'re winded: the keys stop glowing and every press is a weak tap until it\'s back to 45, so stop and breathe. Press R when it glows, just as a big hit lands, D when you\'re in trouble, and F when the party is about to be hit.',
  ceiling: [
    'Every move is a string of Light, Heavy and Kick (L H K). Rising Gate is L L H, and two Kicks after it bring Heaven\'s Drop down on the airborne boss. Thousand Palms is L K H H. The gauge shows what you have pressed and every move still in reach.',
    'There is no GCD. Breath is the limit: every press costs some, it creeps back while you fight and floods back once you stop for half a second. Below 18 you\'re winded until you\'re back to 45: every press is a weak tap at half strength, with no string. Stop and it floods back at the full resting pace; keep tapping and it comes back a quarter slower. Crane Step (K L), or Flowing Palms (L L L) pressed Crisp when you\'re low, gives Breath back without stopping.',
    'Iron Ox (H H H) throws the boss off balance: Read is ready again at once, and a blow you Read in the next 4s opens it up like a tankbuster. Ox, Read the next swing, Heavy: a free Thousand Palms.',
    'Rhythm: a press made just as the last one\'s recovery ends is Crisp, 10% harder for 40% less Breath. Mashing still works, because early presses are buffered, but only one pressed in the last quarter second of the recovery, or within 0.3s after it ends, is Crisp. The glowing key lights on that beat.',
    'Read (R) in the last moment before a hit lands catches it: half the damage, a counter and Breath. Read a tankbuster and your next Heavy is a free, stronger Thousand Palms.',
  ],
  abilities: [
    ipInputAb('L', 'palm', 'An open-palm strike for {d:52}, quick to recover. Adds L to your string.'),
    ipInputAb('H', 'fist', 'An iron-wrapped punch for {d:83}, slow to recover. Adds H to your string.'),
    ipInputAb('K', 'kick', 'A snapping kick for {d:68}. Adds K to your string.'),
    {
      id: 'read', name: 'Read', type: 'ogcd', target: 'self', cd: 6, lock: 0.25, anim: 'guard',
      desc: 'Drop into a reading stance for 1.2s: 20% less damage. A hit that lands in its first 0.4s is read: it lands at half strength, you counter for {d:63}, and you get 15 Breath. Read a tankbuster (or any blow after Iron Ox) and your next Heavy is a free, Crisp Thousand Palms, 30% stronger. It doesn\'t break your string.',
      glow: k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft < 0.55); },   // (a tankbuster about to land: lit late enough that pressing it as it lights catches the hit)
      effect(k) {
        k.mitigate('self', IRONPALM.READ.pct, IRONPALM.READ.dur, { kind: 'parry', ab: this }); k.buff('read', IRONPALM.READ.dur);
        if (k.has('pond')) { const id = this.id; k.after(0.8, () => k.refundCharge(id)); }   // Still Water's Still Pond: Read is back at once
      },
    },
    {
      id: 'skin', name: 'Iron Skin', type: 'ogcd', target: 'self', cd: 120, lock: 0.5, anim: 'big',
      desc: 'Harden like forged iron: 40% less damage for 10s, and your Breath refills at its resting pace the whole time.',
      effect(k) { k.mitigate('self', k.perk('ironpalm_a4') ? 0.5 : 0.4, 10, { ab: this }); k.buff('skin', 10); },
    },
    {
      id: 'bell', name: 'Temple Bell', type: 'ogcd', target: 'self', cd: 60, lock: 0.5, anim: 'big',
      desc: 'Strike your chest like a temple bell: the whole party takes 10% less damage for 8s, and you get Second Wind for 15s: Breath refills twice as fast and you deal 10% more damage.',
      effect(k) {
        k.mitigate('party', 0.1, 8, { ab: this });
        k.buff('wind', k.perk('ironpalm_w3') ? 20 : 15);
        if (k.talent('ironpalm_bellecho')) k.heal('party', 130, { ab: this });
        if (k.talent('ironpalm_gong')) k.after(8, () => { k.mitigate('party', 0.1, 4, { ab: this }); k.fx('gong'); });
      },
    },
  ],
};

// the taunt (carried by Read, TAUNT_CARRY): a beckoning palm. It steadies your breathing.
TAUNT.ironpalm = {
  name: 'Beckoning Palm', icon: 'read',
  desc: 'A beckoning palm: calling it out steadies your breathing: +30 Breath.',
  use(k) { ipBreath(k, 30); },
};

// Ironpalm's Ultimate (TANK ULTIMATES): the grand string. Crisp presses (IRONPALM.ULT_CRISP), every named move you
// finish (ULT_MOVE) and every Read (ULT_READ, double on a tankbuster) fill it (ipPress, ipRead). It plays every string
// the kit knows as one flurry, each strike under its own move's name, and ends it with the shockwave no string reaches.
const IP_GRAND = ['crane', 'flow', 'gate', 'drop', 'wall', 'breaker', 'ox', 'palms'];
Object.assign(IRONPALM, { ULT_PRESS: 0.15, ULT_CRISP: 0.18, ULT_MOVE: 0.25, ULT_READ: 1.5, GRAND_GAP: 0.1 });
ULTIMATES.ironpalm = {
  id: 'hundredpalms', name: 'Hundred Palms', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: MELEE, anim: 'big', icon: 'bell',
  lock: 1.1, dr: 0.5,
  charge: { rate: 0.47, keep: 0.5 },
  desc: 'The grand string: every string you know, in one breath. Crane Step, Flowing Palms, Rising Gate, Heaven\'s Drop, Tiger Wall, Stone Breaker, Iron Ox and Thousand Palms land one after another, {d:110} each, ' +
    'and the last palm drives a shockwave through your target for {d:800}. The boss is Bruised ({d:20} every 3s for 15s), you hold Tiger Wall\'s stance (25% less damage for 5s), and your Breath fills to the top. ' +
    'The shockwave rings out over the party like Temple Bell: everyone takes 15% less damage for 8s. ' +
    'You take 50% less damage and can\'t be knocked back during the flurry.' +
    '<div class="it-ult"><span><u>Charge:</u> 0.15% for every press of a string (0.18% if it\'s Crisp), 0.25% for every named move, 1.5% for every Read (3% on a tankbuster), and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
  effect(k) {
    const ab = this, g = k.g, moves = k.def.moves || IP_MOVES, mv = id => moves.find(m => m.id === id) || ab;
    g.str = ''; g.keys = []; g.plan = null; g.clean = true;   // (the flurry is its own string: nothing drops)
    IP_GRAND.forEach((id, i) => k.after(IRONPALM.GRAND_GAP * (i + 1), () => k.damage(110, { ab: mv(id) })));
    k.mitigate('self', 0.25, 5, { ab: mv('wall') }); k.buff('wall', 5);
    ipBreath(k, k.poolMax()); g.winded = false;
    k.after(IRONPALM.GRAND_GAP * (IP_GRAND.length + 1.5), () => {
      k.damage(800, { ab, threat: 3 });
      k.dot('bruise', 20, 15, 3, { ab: mv('breaker') });
      k.mitigate('party', 0.15, 8, { ab });
      k.fx('ip-hundred');
    });
  },
};

// Ironpalm's talent moves (the shared system above): Bellows Stance takes Iron Skin's key, Dragon Ascends Temple Bell's
TALENT_ABILITIES.ironpalm_bellows = { cls: 'ironpalm', ab: {
  id: 'bellows', replaces: 'skin', icon: 'skin', name: 'Bellows Stance', type: 'ogcd', target: 'self', cd: 90, lock: 0.5, anim: 'big',
  desc: 'Breathe like a forge bellows for 10s: 30% less damage, Breath refills half again as fast, and every named move you finish breathes out a shockwave ({d:54}) and gives back 6 Breath.',
  effect(k) { k.mitigate('self', k.perk('ironpalm_a4') ? 0.4 : 0.3, 10, { ab: this }); k.buff('bellows', 10); },   // (Iron Skin's enhancement: 10% more)
} };
const ipDragon = {
  id: 'dragon', replaces: 'bell', icon: 'bell', name: 'Dragon Ascends', type: 'ogcd', target: 'enemy', range: 300, cd: 60, lock: 0.6, anim: 'big',
  desc: 'Leap and come down on your target like a dragon: a {d:170} blow, the whole party deals 5% more damage for 12s, and you get Second Wind for 15s.',
  effect(k) { k.damage(170, { ab: this, threat: 2 }); k.partyBuff('dmg', 0.05, 12, { ab: this }); k.buff('wind', k.perk('ironpalm_w3') ? 20 : 15); },
};
TALENT_ABILITIES.ironpalm_dragon = { cls: 'ironpalm', ab: ipDragon,
  spec: { avalanche: Object.assign({}, ipDragon, {
    desc: 'Leap and come down on your target like a dragon: a {d:170} blow, the whole party deals 5% more damage for 12s, and you get Second Wind for 15s. Your Momentum fills and lasts 15s, unless a string breaks.',
    effect(k) { ipDragon.effect.call(this, k); k.buff('rush', 15, {}, IRONPALM.RUSH_MAX, IRONPALM.RUSH_MAX); },
  }) } };

if (typeof module !== 'undefined') Object.assign(module.exports, { IRONPALM, IP_SLOT, IP_INPUT, IP_MOVES, ipMoves, ipLive, ipWinded, ipStep, ipPress, ipDrop, ipGuide, ipPlan, ipNext, ipBreath, ipRead, ipAbId });
// CLASSES-C: Threadweaver (healer) and Marionettist (DPS). docs/plans/2026-10-new-classes.md
// The host owns the threads (fight.js, the weave block) and judges which mechanics land on a Doll; the kits own the
// rest. Both read a few optional world hooks (actor.js): env.threads() (this weaver's threads, { me, l: [[a, b, d]] }),
// env.aim() (the cursor, or a bot's chosen spot), env.collide(point, r) (push a point out of solid props) and
// env.dolls(list) (where this player's Dolls are, for the host). The simulator has none of them; the kits cope.
// ===================================================================================================================

// ---------------------------------------------------------------- Threadweaver: the web between us
// Threads tie two allies (Tie: your target to you, or press it on two allies in a row to tie them to each other). The
// host splits any hit on one end evenly along its threads, runs 60% of a heal down them, and snaps a thread whose ends
// get more than 550 px apart (a small heal to both). The damage threads carry comes back as Spool ('carry' notices).
const WEAVE = { SNAP: 550, MAX: 3, SPOOL: 1.1, MEND_COST: 35, TIE_GAP: 2, LOOSE: 10, SHUTTLE: 120, SHUTTLE_HEAL: 120 };
const weaveMax = k => k.def.maxThreads || WEAVE.MAX;
// is a host keeping the threads? (no: the simulator, or the town, where the kit counts its own ties)
const weaveHosted = k => !!(k.env.threads && k.env.threads());
// this weaver's threads: from the host when there is one; otherwise the kit's own count
function weaveThreads(k) {
  const w = k.env.threads ? k.env.threads() : null;
  if (w) return w.l;
  return Array.from({ length: Math.min(weaveMax(k), k.g.n || 0) }, () => [0, 0, 120]);
}
const weaveCount = k => weaveThreads(k).length;
// threads pulled near their snapping length (for Taut and the gauge)
const weaveStrained = k => weaveThreads(k).filter(t => t[2] > WEAVE.SNAP * 0.75).length;
function weaveSpool(k, n) { if (n > 0) k.gain('spool', n, 100); }
// the damage your threads carried (host notice), as Spool: about 1 Spool per 1% of your HP carried
function weaveCarry(k, a) {
  const mx = k.env.maxHp ? k.env.maxHp() : 1000;
  weaveSpool(k, Math.max(0, a) / Math.max(1, mx) * 100 * WEAVE.SPOOL);
  k.g.carried = (k.g.carried || 0) + Math.max(0, a);
}
// a thread snapped on its own (pulled too far): Knotwork gives the Tie charge back
function weaveSnapped(k) {
  if (!weaveHosted(k)) k.g.n = Math.max(0, (k.g.n || 0) - 1);
  if (k.talent('threadweaver_knotwork')) { const t = abBase(k, 'tie'); if (t) k.refundCharge(t.id); }
  weaveLoose(k);
}
// Loose End: a thread snapping (on its own or by Snap) makes your next Needle instant
function weaveLoose(k) { k.buff('looseend', WEAVE.LOOSE); }
// Tie glows while you hold fewer than 2 threads (3 with room for 5)
const weaveTieGlow = k => weaveCount(k) < (weaveMax(k) > WEAVE.MAX ? 3 : 2);
// is ally t already on one of your threads? (a Tie on them pulls them instead; only the host knows)
function weaveTiedTo(k, t) {
  const w = k.env.threads ? k.env.threads() : null;
  if (!w || typeof t !== 'number' || t === w.me) return false;
  return w.l.some(th => th[0] === t || th[1] === t);
}
function weaveTie(k, ab, t) {
  const g = k.g, now = k.now, held = weaveCount(k);
  if (k.consume('spare')) { const tie = abBase(k, 'tie'); if (tie) k.refundCharge(tie.id); }   // (Spare Thread, Shears spec row VI: this Tie costs no charge)
  // a second Tie on another ally soon after the first ties those two allies to each other instead of to you
  const pair = g.tie && g.tie.t !== t && now - g.tie.at < WEAVE.TIE_GAP ? g.tie.t : undefined;
  // Tie on an ally already on your threads (and no pair waiting): pull them along it (Shears: and a shield)
  if (pair == null && weaveTiedTo(k, t)) {
    g.tie = null; weaveTighten(k, ab, t, !!k.def.lash);
    if (k.talent('threadweaver_hub')) for (const th of weaveThreads(k)) if (th[0] === t || th[1] === t) k.heal(th[0] === t ? th[1] : th[0], 100, { ab });   // (Hub and Spoke, Loomwright spec row VI: a pulse down each thread on them)
    if (k.talent('threadweaver_ahead') && held >= 3) k.buff('ahead', 6);
    return;
  }
  g.tie = pair != null ? null : { t, at: now };
  const sh = k.healAmount(150, { ab }).amount;
  k.env.emit({ type: 'tie', target: t, pair, mx: weaveMax(k), amount: sh, st: k.def.store || 1, dp: k.def.deep ? 1 : 0, hm: k.talent('threadweaver_skein') ? 6 : 0, ab });
  if (!weaveHosted(k) && pair == null) g.n = Math.min(weaveMax(k), (g.n || 0) + 1);
  if (k.talent('threadweaver_crossstitch')) { k.heal(t, 110, { ab }); if (pair != null) k.heal(pair, 110, { ab }); }
  if (k.perk('threadweaver_a2')) k.shield(t, 120, 6, { ab });
  if (k.talent('threadweaver_ahead') && held >= 3) k.buff('ahead', 6);   // (Stitched Ahead, Loomwright spec row VII: the next Mend Seam is instant)
}
// Snap: cut the threads on your target (all of yours if it has none). Each releases what it carried in the last 5s
// (times the spec's store) as a heal to both ends, never less than a small heal.
function weaveSnip(k, ab, t, all) {
  const mine = weaveThreads(k), n = mine.length;   // (read before the host cuts them)
  const value = (k.def.store || 1) * (k.perk('threadweaver_w3') ? 1.25 : 1);
  const amount = k.healAmount(k.def.snipPot || 200, { ab }).amount;
  const sh = k.talent('threadweaver_thimble') ? Math.round(150 * ENGINE.POT_SCALE * (1 + (k.gear().power || 0))) : 0;
  // (Severance, Shears spec row VII: every thread you hold, by each of their ends in turn)
  const ends = all ? [...new Set(mine.flatMap(th => [th[0], th[1]]))] : [t];
  for (const e of ends.length ? ends : [t]) k.env.emit({ type: 'snip', target: e, value, amount, sh, ab });
  if (n && k.talent('threadweaver_spare')) k.buff('spare', 6);   // (Spare Thread, Shears spec row VI)
  if (n && k.talent('threadweaver_looseends')) {   // (Loose Ends, Shears spec row VII: the cut ends mend for a while)
    const on = typeof t === 'number' ? mine.filter(th => th[0] === t || th[1] === t) : [];
    for (const id of new Set((on.length ? on : mine).flatMap(th => [th[0], th[1]]))) k.hot(id, 50, 4, 1.5, { ab, id: 'looseends' });
  }
  // (the simulator has no host: a snip there heals both ends of each thread for its small heal or a bit more)
  if (!weaveHosted(k)) { k.env.emit({ type: 'heal', target: t, amount: Math.round(amount * 1.6 * Math.max(1, n)), crit: false, ab, sim: true }); k.g.n = 0; }
  if (n) weaveLoose(k);
  if (n && k.def.shuttleCut) {
    // (the threads on the target, or all of them if it has none: as the host cuts them)
    const on = typeof t === 'number' ? weaveThreads(k).filter(th => th[0] === t || th[1] === t).length : 0;
    (k.g.cuts = (k.g.cuts || []).filter(c => c.at > k.now - k.def.shuttleCut)).push({ at: k.now, n: on || n });
  }
  if (k.def.snipSpool) weaveSpool(k, k.def.snipSpool * Math.max(1, n));
  if (k.talent('threadweaver_tension')) weaveSpool(k, 8 * n);
  if (k.talent('threadweaver_heartstring') && n) { const e = k.env.target({ target: 'enemy', range: 2000 }); if (e) k.damage(50, { ab, tgt: e.id !== 'dummy' ? e.id : undefined }); }
}
// Tie on a tied ally: pull them toward the ally on the far end of its threads (Reel In: both meet in the middle;
// Shears: a shield too). The host does the pulling ('tighten').
function weaveTighten(k, ab, t, lash) {
  const both = k.talent('threadweaver_reelin');
  k.env.emit({ type: 'tighten', target: t, r: 220, both: both ? 1 : 0, mit: both ? 0.1 : 0, ab });
  if (lash) k.shield(t, 260, 2, { ab });
}
// Shuttle: the shuttle runs every thread you hold, striking the boss once per thread, and tugs a heal down each one on you
// (Shears: it runs the threads Snap cut in the last few seconds too, up to 5 strikes)
function weaveShuttleN(k) {
  const held = weaveCount(k), cs = k.def.shuttleCut;
  if (!cs) return held;
  const cut = (k.g.cuts || []).filter(c => c.at > k.now - cs).reduce((s, c) => s + c.n, 0);
  return Math.min(5, held + cut);
}
function weaveShuttle(k, ab, pot, heal, tgt) {
  const n = weaveShuttleN(k), held = weaveCount(k);
  if (!n) return;
  if (k.def.shuttleCut) k.g.cuts = [];
  const r = k.damage(pot * n, tgt ? { ab, tgt } : { ab });
  k.ultGain(1 * n);   // (Grand Loom)
  if (!heal) return r;
  const tug = k.healAmount(heal, { ab }).amount;
  k.env.emit({ type: 'tug', amount: tug, ab });
  if (!weaveHosted(k) && held) k.env.emit({ type: 'heal', target: 'self', amount: tug * Math.min(2, held), crit: false, ab, sim: true });
  return r;
}

KITS.threadweaver = {
  potMult: 0.84, // balance knob (tools/simulate.js)
  auto: { kind: 'needle', potency: 25, range: RANGED },
  gauge: { kind: 'spool', key: 'spool', max: 100, label: 'Spool' },
  init: () => ({ spool: 0, tie: null, n: 0, carried: 0, ties: 0 }),
  onNotify(k, type, d) {
    if (type === 'carry') weaveCarry(k, d.a || 0);
    if (type === 'snapped') weaveSnapped(k, d);
    if (type === 'tiefail') { const t = abBase(k, 'tie'); if (t) k.refundCharge(t.id); k.g.tie = null; }   // nobody to tie (yourself, or someone fallen)
  },
  // reactions to the boss's casts (the spec rows VI-VII): Drawn Taut (Loomwright) and Snap Judgment (Shears)
  tick(k) {
    onBossCast(k, () => {
      if (k.talent('threadweaver_drawn')) { const n = Math.min(5, weaveCount(k)); if (n) k.mitigate('party', 0.02 * n, 5, { ab: abBase(k, 'tie') }); }
      if (k.talent('threadweaver_judgment')) { const s = abBase(k, 'snip'); if (s) k.resetCooldown(s); }
    });
  },
  signature: 'Threads',
  floor: 'Press W on the tank and one more ally to tie them to you, then heal with E. Press Q to attack when nobody needs you, and D whenever it is up. R when your threads have carried a lot.',
  ceiling: [
    'A hit on one end of a thread is split evenly along it, and a heal on one end runs 60% of the way down. Tie the person about to be hit to someone healthy.',
    'Threads snap when their ends get more than 550 px apart: a spread mechanic will tear your web. Snap it yourself just before, for a much bigger heal, and re-tie on the stack. Any snap makes your next Needle instant: spend it on the move.',
    'Tie twice in a row on two allies to tie them to each other; Tie an ally already on your threads to pull them along it. Each Thread on you makes Needle heal whichever end of it is more hurt.',
    'Shuttle hits once for every thread you hold: keep the web full ({d:360} with three) and it is your biggest hit.',
    'Tapestry ties everyone into one web for 8s: a tankbuster or a raidwide split four ways. Save it for the hit that would kill someone.',
  ],
  abilities: [
    {
      id: 'needle', name: 'Needle', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
      cast: k => (k.has('looseend') ? 0 : k.talent('threadweaver_taut') && weaveCount(k) >= 3 ? 1 : 1.5),
      desc: '1.5s cast attack: a thrust of the long needle for {d:270}. Each Thread on you tugs a {h:120} heal to whichever end of it is more hurt, you or them. After a thread snaps (on its own or by Snap), your next Needle within 10s is instant.',
      glow: k => k.has('looseend'),
      effect(k) {
        k.consume('looseend');
        const r = k.damage(270, { ab: this });
        const tug = k.healAmount(WEAVE.SHUTTLE_HEAL * (k.perk('threadweaver_w1') ? 1.3 : 1), { ab: this }).amount;
        k.env.emit({ type: 'tug', amount: tug, ab: this });
        if (!weaveHosted(k) && k.g.n) k.env.emit({ type: 'heal', target: 'self', amount: tug * Math.min(2, k.g.n), crit: false, ab: this, sim: true });
        k.ultGain(0.2 * Math.min(3, weaveCount(k)));   // (Grand Loom: a tug down every thread)
        if (k.talent('threadweaver_backstitch')) weaveSpool(k, 5);
        return r;
      },
      fx: { type: 'projectile', color: '#d8c8ff', range: RANGED, speed: 1100 },
    },
    {
      id: 'tie', name: 'Tie', type: 'ogcd', target: 'ally', charges: 2, cd: 6, anim: 'cast', lock: 0.4,
      desc: 'Tie your target to yourself with a glowing thread. Press it on a second ally within 2s and those two are tied to each other instead. On an ally already on your threads, it pulls them up to 220 px along the thread toward its far end instead: yank someone out of a puddle. Up to 3 threads; tying another drops your oldest. Two charges.',
      glow: k => weaveTieGlow(k),
      effect(k, t) { weaveTie(k, this, t); },
      fx: { color: '#cbb8ff' },
    },
    {
      id: 'mend', name: 'Mend Seam', type: 'gcd', target: 'ally', anim: 'cast',
      cast: k => (k.g.spool >= WEAVE.MEND_COST || k.has('ahead') ? 0 : 1.8),
      desc: '1.8s cast: a {h:500} heal that runs down every Thread on your target at full strength. With 35 Spool it spends it, is instant and heals 35% more.',
      glow: k => k.g.spool >= 70,
      effect(k, t) {
        const sp = k.g.spool >= WEAVE.MEND_COST;
        if (sp) k.spend('spool', WEAVE.MEND_COST); else k.consume('ahead');   // (Stitched Ahead: instant with no Spool)
        const m = (sp ? 1.35 * (k.perk('threadweaver_w2') ? 1.2 : 1) : 1) * (k.talent('threadweaver_bobbin') && k.g.spool >= 50 ? 1.2 : 1);
        const { amount, crit } = k.healAmount(500 * m, { ab: this });
        k.env.emit({ type: 'heal', target: t, amount, crit, ab: this, seam: 1 });
        k.itemHook('heal');
        // (simulator: the seam runs to about one more ally)
        if (!weaveHosted(k) && k.g.n) k.env.emit({ type: 'heal', target: 'self', amount, crit: false, ab: this, sim: true });
      },
      fx: { color: '#e4d8ff' },
    },
    {
      id: 'snip', name: 'Snap', type: 'ogcd', target: 'ally', cd: 25, anim: 'big', lock: 0.4,
      desc: 'Cut the threads on your target (all of yours, if it has none). Each one releases the damage it carried in the last 5s as a heal to both its ends (at least {h:200}).',
      usable: k => weaveCount(k) > 0,
      glow: k => weaveStrained(k) > 0,
      effect(k, t) { weaveSnip(k, this, t); },
      fx: { color: '#ffe0f0' },
    },
    {
      id: 'shuttle', name: 'Shuttle', type: 'ogcd', target: 'enemy', range: RANGED, cd: 15, anim: 'cast', lock: 0.4,
      desc: 'Instant: throw the shuttle down every thread you hold. It strikes the boss for {d:120} per thread (three threads: {d:360}), and each Thread on you tugs a {h:120} heal to whichever end of it is more hurt.',
      usable: k => weaveShuttleN(k) > 0,
      glow: k => weaveShuttleN(k) >= 3,
      effect(k) { return weaveShuttle(k, this, WEAVE.SHUTTLE, WEAVE.SHUTTLE_HEAL); },
      fx: { type: 'projectile', color: '#cbb8ff', range: RANGED, speed: 1200 },
    },
    {
      id: 'tapestry', name: 'Tapestry', type: 'ogcd', target: 'self', cd: 120, anim: 'big',
      desc: 'Tie the whole party into one web for 8s: any damage to one of you is split evenly among everyone.',
      effect(k) {
        const dur = k.perk('threadweaver_a4') ? 10 : 8, ab = this;
        k.g.tapUntil = k.now + dur;   // (Grand Loom doesn't cut an open Tapestry short)
        k.env.emit({ type: 'tapestry', dur, keep: k.talent('threadweaver_selvedge') ? 1 : 0, ab });
        if (k.talent('threadweaver_grand')) k.after(dur, () => { k.heal('party', 220, { ab }); k.fx('tapestryEnd'); });
        // (simulator: the split spares the party roughly a big heal's worth)
        if (!weaveHosted(k)) k.env.emit({ type: 'heal', target: 'party', amount: k.healAmount(300, { ab }).amount, crit: false, ab, sim: true });
      },
      fx: { color: '#b89cff' },
    },
  ],
};

// ----------------------------------------------------------------- HEALER ULTIMATES: Cleric, Grovekeeper, Chronomancer, Alembist, Threadweaver
// All instant: one timed party moment (a big heal and a blow on the boss) that cashes in the class's own loop and ties
// together the buttons it otherwise keeps apart. Each lands HEAL_ULT_LAND after the press, on its recipe's impact
// (ability-vfx.js "Ultimates · healers"). The effect never calls ultGain or a gauge's gain/spend map (it was just spent):
// gauges it refills are set directly. Bots (bots.js BotAI.ult): 3+ allies under 60%, or a raidwide next in the feed;
// an `after` Ultimate (it heals what already happened) waits for the hurt allies instead.
const HEAL_ULT_LAND = 0.4;
const healUltCharge = text => `<div class="it-ult"><span><u>Charge:</u> ${text} and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`;
Object.assign(ULTIMATES, {
  // Cleric: Petals spent, Mends, Dawnstars and Smites (clericUltGain, from clericPetal, the Mend, clericDawnstar, clericSmite)
  cleric: {
    id: 'dawnbreaks', name: 'Dawn Breaks', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'prayer',
    lock: 0.9, dr: 0.3, after: true,
    charge: { rate: 0.4, keep: 0.5 },
    desc: 'The sun comes up over the whole party. A pillar of dawn heals everyone for {h:600}, plus {h:150} for every Petal you hold (three: {h:1050}), and they regenerate {h:80} every 3s for 12s. ' +
      'Its light smites your target for {d:1200}; a ready Dawnstar rises with it and adds {d:1425}. Then all three Petals grow back. You take 30% less damage and can\'t be knocked back while you call it.' +
      healUltCharge('5.5% for every Petal you spend on someone below 90% health (2% on someone healthier; an Aegis gets 40% of that), 1% for every Mend, 8% for every Dawnstar (16% inside the party\'s burst), 0.5% for every Smite,'),
    effect(k) {
      const ab = this, petals = Math.floor(k.g.petals || 0), dawn = (k.g.bloom || 0) >= 3, held = dawn ? clericHeld(k) : 1;
      if (dawn) k.g.bloom = 0;   // (the Dawnstar goes up with the pillar)
      k.after(HEAL_ULT_LAND, () => {
        k.heal('party', 600 + 150 * petals, { ab });
        k.hot('party', 80, 4, 3, { ab, id: 'dawnbreaks' });
        k.damage(1200 + (dawn ? 1425 * held : 0), { ab });
        if (dawn) clericDawnstar(k, ab);
        k.g.petals = 3;
        k.fx('cleric-dawn', { n: petals, s: dawn ? 1 : 0 });
      });
    },
  },
  // Grovekeeper: Rejuvenate ticks (their 5 Bloom: 1% each, the Bloom gain map), Bloom spent (6 per Bloom: the spend map),
  // Thornlash ticks (0.4 each) and Wraths while the Thornlash is on (0.8 each; both grovekeeper onDamage)
  grovekeeper: {
    id: 'worldtree', name: 'World Tree', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'treant',
    lock: 0.9, dr: 0.3,
    charge: { scale: 0.58, rate: 0.4, keep: 0.5, gain: { bloom: 0.2 }, spend: { bloom: 0.12 } },
    desc: 'A great tree bursts from the ground at your feet. The whole party heals {h:450}, and for 12s everyone under its canopy (180 px around where it stands) heals {h:110} every 1.5s. ' +
      'Every ally wearing your Rejuvenate blooms at once for {h:300} more. Its roots tear into your target for {d:900}, or {d:1400} if your Thornlash is on it, and the Thornlash starts over at 30s. You gain 50 Bloom. ' +
      'You take 30% less damage and can\'t be knocked back while it grows.' +
      healUltCharge('1% for every Rejuvenate tick, 6% for every Bloom you spend, 0.4% for every Thornlash tick, 0.8% for every Wrath that lands while your Thornlash is on,'),
    effect(k) {
      const ab = this;
      k.after(HEAL_ULT_LAND, () => {
        k.heal('party', 450, { ab });
        k.env.emit({ type: 'splash', target: 'self', r: 0, pr: 180, ticks: 8, interval: 1.5, pa: k.healAmount(110, { ab }).amount, ab });
        for (const r of k.g.rejuvs) k.heal(r.t, 300, { ab });
        const th = k.dots.get('thorn'), on = !!th && th.end > k.now;
        k.damage(on ? 1400 : 900, { ab });
        if (on) th.end = k.now + 30;
        k.g.bloom = Math.min(100, (k.g.bloom || 0) + 50);
        k.fx('grove-tree', { n: k.g.rejuvs.length, s: on ? 1 : 0 });
      });
    },
  },
  // Chronomancer: the Flux that Haste burns (1% per 7, chronoFlux), Bolts cast in Haste (1.6, chronoBoltAfter) and
  // every Rewind (2, its effect)
  chronomancer: {
    id: 'timereversal', name: 'Time Reversal', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'rewind',
    lock: 0.9, dr: 0.3, after: true,
    charge: { rate: 0.4, keep: 0.5 },
    desc: 'Turn the whole party\'s clock back: everyone\'s health returns to its highest point in the last 6s (up to 40% of their max health each), and everyone heals at least {h:300}. ' +
      'The boss stutters as its own moment comes undone, for {d:900}, and its clock stops for 2.5s: it stands frozen and its next move comes 2.5s later (what is already on the floor still lands on time; not in a phase change, a damage or heal check, the enrage or Royal Doom, nor within 20s of the last stop). Then Recall is ready again, Stasis is 30s closer, your Flux fills, and you slip into Haste with your next two Bolts instant. ' +
      'You take 30% less damage and can\'t be knocked back while you turn it.' +
      healUltCharge('1% for every 7 Flux you burn in Haste, 1.6% for every Bolt you cast in Haste, 2% for every Rewind,'),
    effect(k) {
      const ab = this;
      k.after(HEAL_ULT_LAND, () => {
        k.env.emit({ type: 'rewind', target: 'party', secs: 6, pct: 0.4, dur: 2.5, ab });   // (dur: the boss's Time Stop, fight.js pauseBoss)
        k.heal('party', 300, { ab });
        k.damage(900, { ab });
        const rc = abBase(k, 'recall'); if (rc) k.refill(rc.id);
        const st = abBase(k, 'stasis'); if (st) k.reduceCooldown(st.id, 30);
        k.g.flux = 100; k.g.stance = 'haste'; k.clear('lag');
        k.buff('surge', 10, {}, 2, 2);
        k.fx('chrono-undo');
      });
    },
  },
  // Alembist: every vial thrown (alemUltThrow: more for a ripe one, more for a cure on someone hurt) and every Kiln
  // Bomb (2.5, alemKiln)
  alembist: {
    id: 'magnumopus', name: 'Magnum Opus', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'blend',
    lock: 0.9, dr: 0.3,
    charge: { scale: 0.74, rate: 0.4, keep: 0.5 },
    desc: 'Pour a drop of every vial you hold into one mythic flask and hurl it high over the party: everyone heals {h:500} and gains a {s:250} shield for 10s, and it bursts on your target for {d:1000}. ' +
      'Every vial you hold adds {h:80} to the heal and {d:200} to the blast, a ripe one 30% more. Your vials aren\'t used up: they all ripen at once, and all three Kiln coals light. ' +
      'You take 30% less damage and can\'t be knocked back while you throw it.' +
      healUltCharge('1.2% for every vial you throw, 3% for a ripe one (an Apothecary 1.9%), a cure 40% more on someone below 70% health and 40% less on someone healthier, 2.5% for every Kiln Bomb,'),
    effect(k) {
      const ab = this, vs = k.g.vials, m = vs.reduce((s, v) => s + alemStrength(k, v), 0);
      const show = { p: vs.map(v => (v.parts ? 'BL' : v.r)).slice(0, 5), m: +m.toFixed(2) };
      for (const v of vs) if (!v.parts) v.at = Math.min(v.at, k.now - alemRipeTime(k));
      k.g.kiln = ALEMBIC.KILN;
      k.after(HEAL_ULT_LAND, () => {
        k.heal('party', 500 + 80 * m, { ab });
        k.shield('party', 250, 10, { ab });
        k.damage(1000 + 200 * m, { ab });
        k.fx('alem-opus', show);
      });
    },
  },
  // Threadweaver: the damage your threads carry (the Spool gain map: 1% per 4 Spool), every Shuttle strike (1 per
  // thread, weaveShuttle) and every Needle tug down a thread (0.2 per thread, up to 3)
  threadweaver: {
    id: 'grandloom', name: 'Grand Loom', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'tapestry',
    lock: 0.9, dr: 0.3,
    charge: { scale: 0.78, rate: 0.4, keep: 0.5, gain: { spool: 0.25 } },
    desc: 'Pull every thread you hold taut until they all flare at once. The whole party heals {h:350}, plus {h:120} for every thread you hold (three: {h:710}), and the light runs down them into your target: {d:500}, plus {d:300} for every thread (three: {d:1400}). ' +
      'Then the web re-forms around everyone as a Tapestry for 6s (any damage to one of you is split evenly among all), and you gain 35 Spool. You take 30% less damage and can\'t be knocked back while you pull.' +
      healUltCharge('1% for every 4 Spool you gain (the damage your threads carry), 1% for every Shuttle strike, 0.2% for every thread a Needle tugs down,'),
    effect(k) {
      const ab = this, n = weaveCount(k);
      k.after(HEAL_ULT_LAND, () => {
        k.heal('party', 350 + 120 * n, { ab });
        k.damage(500 + 300 * n, { ab });
        k.env.emit({ type: 'tapestry', dur: Math.max(6, (k.g.tapUntil || 0) - k.now), keep: 0, ab });
        k.g.spool = Math.min(100, (k.g.spool || 0) + 35);
        k.fx('weave-loom', { n });
      });
    },
  },
});
// Alembist: a thrown vial's charge (bombs by ripeness; a cure counts more on someone hurt, less on someone healthy)
function alemUltThrow(k, v, t, m) {
  if (!k.ult) return;
  const ripe = m >= 1 + ALEMBIC.GROW - 0.001;
  let n = ripe ? (k.def.alem.ripe <= 5 ? 1.9 : 3) : 1.2;   // (an Apothecary's vials ripen twice as fast)
  if (!alemIsBomb(v)) { const hurt = alemHurt(k, t); n *= hurt === false ? 0.6 : hurt ? 1.4 : 1; }
  k.ultGain(n);
}

// ---------------------------------------------------------------- Marionettist: strings and a painted Doll
// The Doll (k.g.dolls; two for the Understudy) lives in the kit: it drifts to a station on the boss's far side (or a
// flank when the far side is out of reach of the strings), W posts it where you aim, and the attacks come from it.
// Strings (3): torn when the Doll is pulled past its reach (300 px) or a mechanic lands on it (the host's 'dollhit'
// notice). At 0 it goes limp for 4s and comes back with 3; Pull Strings ties all three back at once (and revives it).
// Encore (0-5) builds from Cue and the other moves and pays for Grand Finale. The Doll jabs on its own (mariJab) while
// you fight and it has the enemy in reach: every JAB_EVERY s, or JAB_FAST s for the QUICK jabs after a Cue.
// STAGE: Stage Cross's window after a Swap. STRUNG: every String still tied gives 5% more damage and 5% faster Jabs (the
// Strung buff, mariStrung).
const MARI = { STRETCH: 300, REACH: 64, SPEED: 360, LIMP: 4, REGEN: 15, YANK: 1.2, RING: 24, TAUT: 12, TAUT_MAX: 72, STAGE: 6, FINALE: 253,
  JAB: 40, JAB_EVERY: 4, JAB_FAST: 2, QUICK: 3, CUE: 180, FLOURISH: 100, STRUNG: 0.05,
  RIPOSTE: 90, RIPOSTE_EVERY: 4, LASH: 0.7, CORD: 480 };
const MARI_STRING = { id: 'string', name: 'Bladed String' };
const MARI_JAB = { id: 'jab', name: 'Jab' };   // (the Doll's own jab: no button, its hits are named for the meters)
const MARI_FAR = { target: 'enemy', range: 2000 };
const mariStretch = k => k.def.stretch || MARI.STRETCH;
const mariEnemy = k => k.env.target(MARI_FAR);
const mariER = e => (e && e.r) || (e && e.id && e.id !== 'boss' && e.id !== 'dummy' ? 34 : 70);
const mariPos = k => (k.env.pos ? k.env.pos() : { x: 0, y: 0 });
const mariLimp = k => k.now < (k.g.limpUntil || 0);
// a live fight: the Doll works the boss and jabs on its own, whatever you press (kits.js bossNow is null outside one)
const mariFight = k => !!(k.env.boss && k.env.boss());
// Strung: the Strings still tied (none while the Doll lies limp), each 5% more damage and 5% faster Jabs, kept as a buff for the tracker
const mariTied = k => (mariLimp(k) ? 0 : k.g.strings | 0);
function mariStrung(k) {
  const n = mariTied(k);
  if (!n) { k.buffs.delete('strung'); return; }
  k.buff('strung', 3600, {}, 3).stacks = n;
}
// the Doll(s) close enough to hit the enemy
function mariInReach(k, e = mariEnemy(k)) {
  if (!e || mariLimp(k)) return [];
  const R = mariER(e) + MARI.REACH;
  return k.g.dolls.filter(d => Math.hypot(d.x - e.x, d.y - e.y) <= R);
}
const mariReady = k => mariInReach(k).length > 0;
// where Doll i stands by itself: on the ring round the enemy, as far round to its far side as the strings allow
function mariStation(k, i, p, e) {
  const R = mariER(e) + MARI.RING, base = Math.atan2(e.y - p.y, e.x - p.x);
  const off = k.def.dolls === 2 ? (i ? 0.95 : -0.95) : 0, lim = mariStretch(k) - 30;
  for (let s = 0; s <= 12; s++) {
    const da = (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 0.26 * (off < 0 ? -1 : 1);
    const a = base + off + da, pt = { x: e.x + Math.cos(a) * R, y: e.y + Math.sin(a) * R };
    if (Math.hypot(pt.x - p.x, pt.y - p.y) <= lim) return pt;
  }
  return { x: e.x - Math.cos(base) * R, y: e.y - Math.sin(base) * R };
}
// the Doll nearest where you aim (Understudy: W and Swap move that one)
function mariPick(k, aim) {
  const ds = k.g.dolls;
  if (!aim || ds.length < 2) return 0;
  return Math.hypot(ds[1].x - aim.x, ds[1].y - aim.y) < Math.hypot(ds[0].x - aim.x, ds[0].y - aim.y) ? 1 : 0;
}
function mariLose(k, i, why) {
  const g = k.g, now = k.now;
  if (mariLimp(k) || now < (g.loseAt || 0)) return;
  g.loseAt = now + 0.4;   // one blow costs one String, even if it lands on both Dolls
  if (why === 'hit' && k.talent('marionettist_standin') && now < (g.swapAt || -9) + 3) { k.fx('standin'); return; }
  if (why === 'far' && k.talent('marionettist_slack')) return;   // (Slack Line: it is only yanked back)
  g.strings = Math.max(0, g.strings - 1); g.taut = 0;   // (a torn String slackens Taut String)
  g.regenAt = now + MARI.REGEN;
  k.stats.strings = (k.stats.strings || 0) + 1;
  k.fx('strtear', { i, w: why === 'hit' ? 1 : 0 });
  if (g.strings <= 0) {
    g.limpUntil = now + MARI.LIMP;
    for (const d of g.dolls) { d.mode = 'limp'; d.until = g.limpUntil; }
    k.stats.limps = (k.stats.limps || 0) + 1;
    k.fx('limp');
  }
}
function mariEncore(k, n) { k.gain('encore', n, 5); }
// the Doll's next QUICK Jabs come twice as fast (Cue; the first one JAB_FAST from now)
function mariQuick(k) {
  const g = k.g;
  g.quick = MARI.QUICK * g.dolls.length;   // (the Understudy's Dolls take turns: three each)
  const due = g.jabAt > k.now ? g.jabAt : Infinity;   // (a jab already on its way comes no later than it would have)
  g.jabAt = Math.max(k.now + 0.6, Math.min(due, k.now + MARI.JAB_FAST * k.hasteMult()));
}
// the Doll's own Jab, on its timer: while you're fighting (as autos: an enemy move in the last few seconds) and it has the
// enemy in reach; never mid-Finale. Out of reach it waits and jabs the moment it's back. Flourish: the last quick one of
// a Cue flourishes into a second stab
function mariJab(k) {
  const g = k.g, now = k.now;
  // (it keeps jabbing all through a fight, or while you have an enemy picked, not only after you press a button at one)
  const engaged = now - k.engagedAt <= ENGINE.AUTO_ENGAGE || mariFight(k) || !!(k.env.picked && k.env.picked());
  if (now < (g.jabAt || 0) || !engaged || (k.env.canAuto && !k.env.canAuto())) return;
  if (g.dolls.some(d => d.mode === 'finale')) return;
  // (the Understudy's two Dolls take turns, each on half the beat: the next one in reach, or the other)
  const two = g.dolls.length > 1, e = mariEnemy(k), near = mariInReach(k, e);
  let only = two ? ((g.jabI | 0) % 2) : -1;
  if (two && !near.includes(g.dolls[only]) && near.length) only = g.dolls.indexOf(near[0]);
  const fast = (g.quick || 0) > 0, rip = k.talent('marionettist_riposte') && ((g.jabN | 0) + 1) % MARI.RIPOSTE_EVERY === 0;
  let n = mariHit(k, MARI_JAB, rip ? MARI.RIPOSTE : MARI.JAB, { auto: true, only });
  // Long Arms: out of reach, it jabs down the strings from wherever it stands (weaker)
  const lash = !n && k.talent('marionettist_longarms') && !!e && !mariLimp(k);
  if (lash) { n = 1; k.damage(MARI.JAB * MARI.LASH * (k.def.dollMult || 1), { ab: MARI_JAB, auto: true, tgt: e.id !== 'dummy' ? e.id : undefined }); }
  if (!n) return;
  if (two) g.jabI = only + 1;
  if (fast) g.quick--;
  g.jabN = (g.jabN | 0) + 1;
  if (rip && !lash) { mariEncore(k, 1); k.fx('riposte', { i: Math.max(0, only) }); }   // (Riposte: every fourth Jab)
  g.jabAt = now + (g.quick > 0 ? MARI.JAB_FAST : MARI.JAB_EVERY) * k.hasteMult() / (1 + MARI.STRUNG * mariTied(k)) / (two ? 2 : 1);   // (Strung)
  k.stats.jabs = (k.stats.jabs || 0) + 1;
  k.fx('mari-jab', { fast, i: only, far: lash });
  if (fast && !g.quick && k.talent('marionettist_flourish')) { k.after(0.25, () => mariHit(k, MARI_JAB, MARI.FLOURISH, { extra: true })); k.fx('flourish'); }
}
// Pull Strings ties every String back and revives a limp Doll
function mariRestring(k) {
  const g = k.g, revived = mariLimp(k), n = revived ? 3 : 3 - g.strings;
  if (n <= 0) return 0;
  if (revived) { g.limpUntil = 0; for (const d of g.dolls) { d.mode = 'idle'; d.until = 0; } }
  g.strings = 3;
  mariEncore(k, revived ? 1 : n);   // (Retie: 1 Encore for each String tied back; 1 for getting a limp Doll up)
  k.fx('restring', { n, revived });
  return n;
}
function mariTick(k) {
  const g = k.g, now = k.now, dt = now - (g.lastT ?? now);
  g.lastT = now;
  const p = mariPos(k), e = mariEnemy(k);
  if (!g.dolls.length) for (let i = 0; i < (k.def.dolls || 1); i++) g.dolls.push({ x: p.x + (i ? 40 : -40), y: p.y - 30, mode: 'idle', until: 0, safe: 0 });
  if (!(dt > 0 && dt < 0.5)) { mariShare(k); return; }
  // limp: lie where it fell; coming back up with all three Strings
  if (g.limpUntil && now >= g.limpUntil) { g.limpUntil = 0; g.strings = 3; for (const d of g.dolls) d.mode = 'idle'; k.fx('unlimp'); }
  if (!mariLimp(k) && g.strings < 3 && now >= (g.regenAt || 0)) { g.strings++; g.regenAt = now + MARI.REGEN; }
  const lim = mariStretch(k);
  g.dolls.forEach((d, i) => {
    if (d.mode === 'limp') return;
    if ((d.mode === 'post' || d.mode === 'finale') && now >= d.until) d.mode = 'idle';
    let goal = null;
    if (d.mode === 'idle') {
      // it only works a target you have chosen; with none it stays where it was put, and is only brought along when you
      // walk it to the end of its strings
      // (in a fight with nothing picked it goes to work on the enemy you face)
      const c = k.env.picked ? (k.env.picked() || (mariFight(k) ? e : null)) : e;
      const here = Math.hypot(d.x - p.x, d.y - p.y);
      if (c && c.id !== g.pickId) { g.pickId = c.id; for (const o of g.dolls) o.manual = false; }   // a new target sends them back to work
      if (d.manual) { /* put there by Pull Strings: it stays */ }
      else if (c && Math.hypot(c.x - p.x, c.y - p.y) < 720) goal = mariStation(k, i, p, c);
      else if (here > lim - 10) { const a = Math.atan2(d.y - p.y, d.x - p.x); goal = { x: p.x + Math.cos(a) * lim * 0.8, y: p.y + Math.sin(a) * lim * 0.8 }; }
    }
    if (goal) {
      const dx = goal.x - d.x, dy = goal.y - d.y, L = Math.hypot(dx, dy), step = MARI.SPEED * dt * (L > 160 ? 1.6 : 1);
      if (L > 1) { const q = Math.min(1, step / L); d.x += dx * q; d.y += dy * q; d.moving = L > 6; } else d.moving = false;
    } else d.moving = false;
    if (k.env.collide) k.env.collide(d, 14);
    // pulled past the strings' reach: one tears, and the Doll is yanked back toward you
    const far = Math.hypot(d.x - p.x, d.y - p.y);
    if (far > lim) {
      if (now >= (g.yankAt || 0)) { g.yankAt = now + MARI.YANK; mariLose(k, i, 'far'); }
      const a = Math.atan2(d.y - p.y, d.x - p.x);
      d.x = p.x + Math.cos(a) * lim * 0.92; d.y = p.y + Math.sin(a) * lim * 0.92;
    }
  });
  // Cutting Line: the strings themselves cut whatever they cross, once a second. Taut String: every second the line
  // stays across, the cut grows by MARI.TAUT (up to TAUT_MAX more); the line leaving the enemy, or a String tearing, slackens it
  if (k.def.bladed && e && !mariLimp(k) && now >= (g.lineAt || 0)) {
    const R = mariER(e) + 10;
    const n = g.dolls.filter(d => kitSegDist(e.x, e.y, p.x, p.y, d.x, d.y) <= R).length;
    if (n) {
      g.lineAt = now + 1; k.damage((48 + (g.taut || 0)) * n, { ab: MARI_STRING, tgt: e.id, extra: true }); g.taut = Math.min(MARI.TAUT_MAX, (g.taut || 0) + MARI.TAUT);
      if (k.talent('marionettist_saw') && (g.sawN = (g.sawN || 0) + 1) % 5 === 0) { const c = abBase(k, 'cross'); if (c) k.reduceCooldown(c.id, 1.5); }   // (Saw, Cutting Line spec row VI)
    }
    else g.taut = 0;
  } else if (k.def.bladed && (!e || mariLimp(k))) g.taut = 0;
  // Held Breath (Cutting Line spec row VI): the boss begins a cast, and the line draws tight
  if (k.talent('marionettist_breath')) onBossCast(k, () => { g.taut = MARI.TAUT_MAX; k.buff('heldbreath', 8); });
  // Twin Strings: a Cross-Cut's line lingers and cuts whatever still crosses it
  if (g.linger && now >= g.linger.next) {
    const L = g.linger;
    L.next += 1; L.left--;
    if (e && L.lines.some(s => kitSegDist(e.x, e.y, s[0], s[1], s[2], s[3]) <= mariER(e) + 10)) k.damage(45 * L.m, { ab: abBase(k, 'cross'), tgt: e.id, extra: true });
    if (L.left <= 0) g.linger = null;
  }
  mariStrung(k);
  mariJab(k);
  mariShare(k);
}
// tell the world where the Dolls are (the host judges mechanics on them; other players draw them)
function mariShare(k) {
  if (!k.env.dolls) return;
  k.env.dolls(k.g.dolls.map(d => ({ x: Math.round(d.x), y: Math.round(d.y), st: d.mode === 'limp' ? 2 : d.mode === 'finale' ? 3 : k.now < d.safe ? 1 : d.moving ? 4 : 0, s: k.g.strings })));
}
// one Doll attack: every Doll in reach hits (each at the Understudy's smaller share)
function mariHit(k, ab, pot, o = {}) {
  const e = mariEnemy(k);
  let ds = mariInReach(k, e);
  if (o.only != null) { if (o.only >= 0) ds = ds.filter(d => d === k.g.dolls[o.only]); o = Object.assign({}, o); delete o.only; }
  if (!e || !ds.length) return 0;
  const m = k.def.dollMult || 1;
  let total = 0;
  ds.forEach(() => { total += k.damage(pot * m, Object.assign({ ab, tgt: e.id !== 'dummy' ? e.id : undefined }, o)).amount; });
  return ds.length;
}
function mariCross(k, ab) {
  const e = mariEnemy(k), p = mariPos(k);
  if (!e || mariLimp(k)) return;
  const R = mariER(e) + 12, m = k.def.dollMult || 1, lines = [], cue = k.consume('oncue');   // (On Cue: a Swap just before)
  const breath = k.consume('heldbreath') ? 1.5 : 1;   // (Held Breath, Cutting Line spec row VI)
  let hits = 0;
  for (const d of k.g.dolls) {
    lines.push([p.x, p.y, d.x, d.y]);
    if (kitSegDist(e.x, e.y, p.x, p.y, d.x, d.y) <= R) { hits++; k.damage(560 * m * (cue ? 2 : 1) * breath, { ab, tgt: e.id !== 'dummy' ? e.id : undefined }); }
  }
  k.fx('cut', { n: hits });
  if (hits && k.talent('marionettist_house') && mariInStage(k)) k.partyBuff('dmg', 0.04, 8, { ab });   // (Packed House, Understudy spec row VI)
  if (hits) { mariEncore(k, 2 + (cue ? 1 : 0) + (k.perk('marionettist_w2') ? 1 : 0)); k.stats.cuts = (k.stats.cuts || 0) + 1; k.ultGain(MARI_ULT.GAIN_CUT); }   // (Curtain Call)
  else k.stats.misses = (k.stats.misses || 0) + 1;
  if (k.talent('marionettist_twin')) k.g.linger = { lines, next: k.now + 1, left: 2, m };
}
// a telegraph about to land on a Doll (Pirouette glows: spin through it)
const mariDanger = k => !mariLimp(k) && !!k.env.danger && k.g.dolls.some(d => k.now >= d.safe && k.env.danger(d.x, d.y, 1.5));
// Cross-Cut glows when the line between you and a Doll crosses the enemy
function mariLineOn(k) {
  const e = mariEnemy(k), p = mariPos(k);
  if (!e || mariLimp(k)) return false;
  return k.g.dolls.some(d => kitSegDist(e.x, e.y, p.x, p.y, d.x, d.y) <= mariER(e) + 12);
}
// the Understudy's Stage: is the enemy's middle inside the triangle between you and both Dolls?
function mariInStage(k) {
  const e = mariEnemy(k), ds = k.g.dolls;
  if (!e || ds.length < 2 || mariLimp(k)) return false;
  const p = mariPos(k), s = (a, b, c) => (a.x - c.x) * (b.y - c.y) - (b.x - c.x) * (a.y - c.y);
  const d1 = s(e, p, ds[0]), d2 = s(e, ds[0], ds[1]), d3 = s(e, ds[1], p);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
// Crossfire glows when the line between the two Dolls crosses the enemy (Understudy spec row VII)
function mariChordOn(k) {
  const e = mariEnemy(k), ds = k.g.dolls;
  if (!e || ds.length < 2 || mariLimp(k)) return false;
  return kitSegDist(e.x, e.y, ds[0].x, ds[0].y, ds[1].x, ds[1].y) <= mariER(e) + 12;
}
function mariAim(k) {
  const a = k.env.aim ? k.env.aim() : null;
  if (a) return a;
  const e = mariEnemy(k);
  return e ? { x: e.x, y: e.y } : null;
}

KITS.marionettist = {
  potMult: 0.713, // balance knob (tools/simulate.js; Strung pays the rest)
  // (no auto-attack of your own: the Doll jabs on its own, mariJab)
  gauge: { kind: 'marionette', key: 'encore', max: 5, label: 'Encore' },
  dolls: 1,
  dmgMod: k => MARI.STRUNG * mariTied(k),   // (Strung: 5% per String tied)
  init: () => ({ encore: 0, strings: 3, dolls: [], limpUntil: 0, regenAt: 0, jabAt: 0, quick: 0 }),
  tick: k => mariTick(k),
  onNotify(k, type, d) {
    if (type !== 'dollhit') return;
    const dl = k.g.dolls[d.i | 0];
    if (dl && k.now >= dl.safe) mariLose(k, d.i | 0, 'hit');
    else if (dl && k.now < (k.g.dodgeUntil || 0)) { k.g.dodgeUntil = 0; mariEncore(k, 1); k.fx('empower'); }   // (a blow danced through under Pirouette or a Final Bow: +1 Encore)
  },
  signature: 'The Doll and its Strings',
  floor: 'Stand back from the boss: the Doll does the fighting and jabs on its own. Press E when it glows, R when it\'s ready, F at full Encore, and Q when nothing else is up. Keep the Doll out of the red with W, which also ties its Strings back.',
  ceiling: [
    'Your attacks come from the Doll, not from you. It drifts to the far side of the boss on its own, but you have to keep it out of telegraphs: W sends it where you aim.',
    'Three Strings tie you together, and each one still tied gives you 5% more damage and 5% faster Jabs (Strung). One tears if the Doll is pulled past 300 px from you or a blow lands on it; at 0 it goes limp for 4s. Every Pull Strings ties all three back and gets a limp Doll up at once, so keep a charge for after a blow.',
    'Cue makes the Doll\'s next three Jabs come twice as fast. It is your filler: press it when nothing else is up, ideally once the last quick Jab has landed.',
    'Cross-Cut cuts along the line between you and the Doll: with the boss between you it\'s your biggest hit. Stand where the line crosses the boss.',
    'Grand Finale spends 5 Encore on five hits, but the Doll can\'t move while it plays. Look at what\'s coming before you start the show, and don\'t let full Encore sit: every point past 5 is lost.',
    'Pirouette is worth most saved for a blow you see coming at the Doll: it spins through for 1 more Encore. Swap a few seconds before Cross-Cut is up and the cut lands twice as hard.',
  ],
  abilities: [
    {
      id: 'cue', name: 'Cue', type: 'gcd', target: 'enemy', range: 640, anim: 'cast',
      desc: `You snap your fingers: the Doll lunges at once for a {d:${MARI.CUE}} stab, and its next three Jabs come twice as fast. Builds 1 Encore. ` +
        `Out of reach, the Doll lunges back onto its mark across the enemy first. ` +
        `On its own the Doll jabs for {d:${MARI.JAB}} every ${MARI.JAB_EVERY}s all through a fight while it has the enemy in reach, whatever you press (5% faster for each String still tied).`,
      usable: k => !mariLimp(k) && !!mariEnemy(k),
      effect(k) {
        const e = mariEnemy(k);
        if (k.perk('marionettist_w1') && k.g.strings < 3) { k.g.strings++; k.g.regenAt = k.now + MARI.REGEN; }   // (its item perk: a String tied back)
        // (the Doll's reach: out of reach, it lunges back onto its mark across the enemy first)
        if (e && !mariReady(k)) {
          const p = mariPos(k);
          k.g.dolls.forEach((d, i) => { const st = mariStation(k, i, p, e); d.x = st.x; d.y = st.y; d.mode = 'idle'; d.manual = false; });
          mariShare(k);
        }
        const n = mariHit(k, this, MARI.CUE);
        if (!n) return;
        mariEncore(k, 1 + (k.talent('marionettist_presence') && mariInStage(k) ? 1 : 0));   // (Stage Presence, Understudy spec row VI)
        mariQuick(k);
      },
      fx: { color: '#f0c8dc' },
    },
    {
      id: 'pull', name: 'Pull Strings', type: 'ogcd', target: 'none', charges: 2, cd: 10, anim: 'cast', lock: 0.35,
      desc: 'Fling the Doll to where you aim (within its strings\' reach). It cuts anything it passes through for {d:160}, and stays there until you pull it again or pick another target. Builds 1 Encore on a hit. Every pull also ties all three Strings back (1 Encore for each one tied back), and gets a limp Doll up at once. Two charges.',
      usable: k => k.g.dolls.length > 0,
      effect(k) {
        const p = mariPos(k), aim = mariAim(k), i = mariPick(k, aim), d = k.g.dolls[i];
        if (!d || !aim) return;
        mariRestring(k);
        let to = { x: aim.x, y: aim.y };
        const lim = mariStretch(k) - 24, L = Math.hypot(to.x - p.x, to.y - p.y);
        if (L > lim) to = { x: p.x + (to.x - p.x) / L * lim, y: p.y + (to.y - p.y) / L * lim };
        // (inside the arena only: in town the arena's walls would fling the Doll miles off and tear a String)
        if (typeof ARENA !== 'undefined' && ARENA.clamp && (!ARENA.sd || ARENA.sd(p.x, p.y) <= 0)) ARENA.clamp(to, 20);
        const e = mariEnemy(k), from = { x: d.x, y: d.y };
        d.x = to.x; d.y = to.y; d.mode = 'post'; d.until = k.now + 3; d.manual = !!(k.env.human && k.env.human());   // a player's Doll stays put; a bot's goes back to work
        if (k.talent('marionettist_mended')) d.safe = Math.max(d.safe || 0, k.now + 1.5);   // (Safe Landing)
        if (k.env.collide) k.env.collide(d, 14);
        k.fx('pull', { i });
        if (e && kitSegDist(e.x, e.y, from.x, from.y, d.x, d.y) <= mariER(e) + 18) {
          k.damage(160 * (k.def.dollMult || 1), { ab: this, tgt: e.id !== 'dummy' ? e.id : undefined });
          mariEncore(k, 1 + (k.talent('marionettist_presence') && mariInStage(k) ? 1 : 0));   // (Stage Presence)
        }
        mariShare(k);
      },
      fx: { color: '#f0a8cc' },
    },
    {
      id: 'cross', name: 'Cross-Cut', type: 'gcd', target: 'enemy', range: 640, cd: 8, anim: 'big',
      desc: 'Your strings become blades and cut along the line between you and the Doll. With the enemy on that line it\'s a {d:560} cut and 2 Encore; otherwise it cuts nothing.',
      usable: k => !mariLimp(k),
      glow: k => mariLineOn(k),
      effect(k) { mariCross(k, this); },
      fx: { color: '#ffd8ec' },
    },
    {
      id: 'pirouette', name: 'Pirouette', type: 'gcd', target: 'enemy', range: 640, cd: 12, anim: 'cast',
      desc: 'The Doll spins, cutting all around it for {d:300}, and nothing can touch it for 1.5s. Builds 1 Encore, and 1 more if a blow lands on it while it spins.',
      usable: k => mariReady(k),
      glow: k => mariDanger(k),
      effect(k) {
        const safe = k.perk('marionettist_a4') ? 3 : 1.5;
        for (const d of k.g.dolls) d.safe = k.now + safe;
        k.g.dodgeUntil = k.now + safe;
        const n = mariHit(k, this, 300);
        if (n) mariEncore(k, 1);
        if (k.talent('marionettist_secondact')) { const pl = abBase(k, 'pull'); if (pl) k.resetCooldown(pl); }   // (Second Act: a Pull Strings back)
      },
      fx: { color: '#f0c8dc' },
    },
    {
      id: 'swap', name: 'Swap', type: 'ogcd', target: 'none', cd: 20, anim: 'cast', lock: 0.4,
      desc: 'You and the Doll trade places in a flutter of silk. It\'s your escape, and the Doll takes your spot. Stage Cross: your next Cross-Cut within 6s cuts twice as hard and gives 1 more Encore.',
      usable: k => !mariLimp(k),
      effect(k) {
        const p = mariPos(k), aim = k.env.aim ? k.env.aim() : null, i = mariPick(k, aim), d = k.g.dolls[i];
        if (!d) return;
        kitMove(k, 'point', { x: Math.round(d.x), y: Math.round(d.y), ab: this });
        d.x = p.x; d.y = p.y; d.mode = 'post'; d.until = k.now + 1.5; d.manual = false;
        k.g.swapAt = k.now; k.buff('oncue', MARI.STAGE);
        if (k.perk('marionettist_a2')) mariQuick(k);
        if (k.talent('marionettist_together') && mariInStage(k)) k.mitigate('party', 0.08, 5, { ab: this });   // (Stand Together, Understudy spec row VII)
        if (k.consume('curtaincall')) mariBow(k, this);   // (Curtain Call: the bow)
        k.fx('swap', { i });
        mariShare(k);
      },
      fx: { color: '#f0a8cc' },
    },
    {
      id: 'finale', name: 'Grand Finale', type: 'gcd', target: 'enemy', range: 640, cd: 10, anim: 'big',
      desc: `Spend 5 Encore: the Doll performs a routine of five hits, each {d:${MARI.FINALE}}. It can't move while it plays.`,
      usable: k => k.g.encore >= (k.talent('marionettist_intermission') ? 3 : 5) && mariReady(k),
      glow: k => k.g.encore >= 5,
      effect(k) {
        // (Intermission: from 3 Encore, a beat for each; Full House: a sixth beat with all three Strings tied)
        const E = k.g.encore, ab = this, six = k.talent('marionettist_fullhouse') && mariTied(k) === 3, hits = Math.min(5, E) + (six ? 1 : 0), gap = 0.45, end = k.now + gap * hits + 0.2;
        k.g.encore = 0;
        k.ultGain(MARI_ULT.GAIN_FINALE * E);   // (Curtain Call)
        for (const d of k.g.dolls) { d.mode = 'finale'; d.until = end; }
        // one beat per hit (the routine's look follows them); Standing Ovation: the last one sends the Doll out quick
        for (let i = 0; i < hits; i++) k.after(gap * i, () => {
          mariHit(k, ab, MARI.FINALE * (six && i === hits - 1 ? 0.5 : 1));   // (Full House: the sixth is a bow, half as hard)
          k.fx('finale-beat', { i, n: hits });
          if (i === hits - 1 && k.talent('marionettist_curtain')) mariQuick(k);
          if (k.talent('marionettist_garrote')) {   // (Garrote, Cutting Line spec row VII: each beat the line cuts as well, at 40% of its strength)
            const e = mariEnemy(k), p = mariPos(k), R = e ? mariER(e) + 10 : 0, n = e ? k.g.dolls.filter(d => kitSegDist(e.x, e.y, p.x, p.y, d.x, d.y) <= R).length : 0;
            if (n) k.damage((48 + (k.g.taut || 0)) * 0.4 * n, { ab: MARI_STRING, tgt: e.id, extra: true });
          }
        });
        // Final Bow: nothing touches the Doll during the show, and a blow it dances through builds 1 Encore
        if (k.talent('marionettist_bow')) { for (const d of k.g.dolls) d.safe = Math.max(d.safe || 0, end); k.g.dodgeUntil = Math.max(k.g.dodgeUntil || 0, end); }
        if (k.perk('marionettist_w3')) { const pl = abBase(k, 'pull'); if (pl) k.resetCooldown(pl); }
        k.fx('finale', { e: E });
      },
      fx: { color: '#ffd27a' },
    },
  ],
};

// the moves the two classes' talents grant (rows III and V)
talentMoves('threadweaver', {
  threadweaver_embroider: {
    id: 'embroider', replaces: 'mend', icon: 'mend', name: 'Embroider', type: 'gcd', target: 'ally', anim: 'cast', talent: true,
    desc: 'Instant, 20 Spool: a {h:400} heal that runs down every Thread on your target at full strength, and on through their threads at 60%.',
    usable: k => k.g.spool >= 20 || k.has('ahead'),
    glow: k => k.g.spool >= 60,
    effect(k, t) {
      if (k.g.spool >= 20) k.spend('spool', 20); else k.consume('ahead');   // (Stitched Ahead: no Spool needed)
      const { amount, crit } = k.healAmount(400 * (k.perk('threadweaver_w2') ? 1.2 : 1), { ab: this });   // (Mend Seam's enhancement: it spends Spool)
      k.env.emit({ type: 'heal', target: t, amount, crit, ab: this, seam: 2 });
      k.itemHook('heal');
      if (!weaveHosted(k) && k.g.n) k.env.emit({ type: 'heal', target: 'self', amount: amount * 1.4, crit: false, ab: this, sim: true });
    },
    fx: { color: '#f0d8ff' },
  },
  threadweaver_cradle: {
    id: 'cradle', replaces: 'shuttle', icon: 'shuttle', name: 'Cat\'s Cradle', type: 'ogcd', target: 'self', cd: 30, anim: 'big', talent: true,
    desc: 'String a cradle of threads at your feet for 9s. Allies inside take 15% less damage and heal {h:70} every 1.5s. Its shuttle runs every thread you hold on the way: it strikes the boss for {d:240} per thread (three threads: {d:720}).',
    effect(k) {
      const pa = k.healAmount(70, { ab: this }).amount;
      k.env.emit({ type: 'splash', target: 'self', r: 0, pr: 150, ticks: 6, interval: 1.5, pa, pct: 0.15, ab: this });
      const e = k.env.target({ target: 'enemy', range: 2000 });
      if (e) weaveShuttle(k, this, 2 * WEAVE.SHUTTLE, 0, e.id !== 'dummy' ? e.id : undefined);
    },
    fx: { color: '#cbb8ff' },
  },
});
talentMoves('marionettist', {
  marionettist_tangle: {
    id: 'tangle', replaces: 'pirouette', icon: 'pirouette', name: 'Tangle', type: 'gcd', target: 'enemy', range: 640, cd: 12, anim: 'cast', talent: true,
    desc: 'The Doll winds its strings round the enemy: a {d:160} cut now, and it bleeds {d:38} every 2s for 10s. Builds 1 Encore.',
    usable: k => mariReady(k),
    effect(k) {
      // (Pirouette's enhancement: the strings wound tight, nothing can touch the Doll for 1.5s, 3s with the perk)
      if (k.perk('marionettist_a4')) { const safe = 3; for (const d of k.g.dolls) d.safe = k.now + safe; k.g.dodgeUntil = k.now + safe; }
      const n = mariHit(k, this, 160);
      if (!n) return;
      const e = mariEnemy(k);
      k.dot('tangle', 38 * (k.def.dollMult || 1) * n, 10, 2, { ab: this, tgt: e && e.id !== 'dummy' ? e.id : undefined });
      mariEncore(k, 1);
    },
    fx: { color: '#f0c8dc' },
  },
  marionettist_curtainrise: {
    id: 'redcurtain', replaces: 'swap', icon: 'swap', name: 'Red Curtain', type: 'ogcd', target: 'self', cd: 45, anim: 'big', talent: true,
    desc: 'Drop a red curtain round you for 8s: allies inside take 15% less damage. The Doll bows and comes back to you.',
    effect(k) {
      k.env.emit({ type: 'splash', target: 'self', r: 0, pr: 140, ticks: 5, interval: 1.6, pct: 0.15, ab: this });
      if (k.talent('marionettist_together') && mariInStage(k)) k.mitigate('party', 0.08, 5, { ab: this });   // (Stand Together: read before the Dolls come back)
      const p = mariPos(k);
      k.g.dolls.forEach((d, i) => { if (d.mode !== 'limp') { d.x = p.x + (i ? 30 : -30); d.y = p.y + 20; d.mode = 'post'; d.until = k.now + 0.6; } });
      if (k.perk('marionettist_a2')) mariQuick(k);   // (Swap's enhancement)
      mariShare(k);
    },
    fx: { color: '#d03050' },
  },
});
talentMoves('marionettist', {
  marionettist_cutcord: {
    id: 'cutcord', replaces: 'pirouette', icon: 'pirouette', name: 'Cut the Cord', type: 'gcd', target: 'enemy', range: 640, cd: 12, anim: 'big', talent: true,
    desc: `Snip one of your Strings on purpose: the Doll, cut loose, strikes for {d:${MARI.CORD}}, builds 2 Encore, and nothing can touch it for 1.5s. The String grows back as a torn one does, or the next Pull Strings ties it back (and its Encore with it). Needs two Strings tied.`,
    usable: k => mariReady(k) && mariTied(k) >= 2,
    glow: k => mariTied(k) === 3 && k.charges(abBase(k, 'pull') || {}) > 0,
    effect(k) {
      const safe = k.perk('marionettist_a4') ? 3 : 1.5;   // (Pirouette's enhancement: 3s)
      for (const d of k.g.dolls) d.safe = k.now + safe;
      const n = mariHit(k, this, MARI.CORD);
      if (!n) return;
      k.g.strings--; k.g.regenAt = k.now + MARI.REGEN;   // (snipped, not torn: Taut String holds)
      mariEncore(k, 2);
      k.fx('cutcord');
    },
    fx: { color: '#ff5a7a' },
  },
});
// (the Understudy's two Dolls each hit at 58%: its Tangle and Cut the Cord say so in numbers)
TALENT_ABILITIES.marionettist_tangle.spec = { understudy: Object.assign({}, TALENT_ABILITIES.marionettist_tangle.ab, {
  desc: 'Each Doll in reach winds its strings round the enemy: a {d:92.8} cut now, and it bleeds {d:22} every 2s for 10s. Builds 1 Encore.' }) };
TALENT_ABILITIES.marionettist_cutcord.spec = { understudy: Object.assign({}, TALENT_ABILITIES.marionettist_cutcord.ab, {
  desc: 'Snip one of your Strings on purpose: each Doll in reach, cut loose, strikes for {d:278.4}, it builds 2 Encore, and nothing can touch them for 1.5s. The String grows back as a torn one does, or the next Pull Strings ties it back (and its Encore with it). Needs two Strings tied.' }) };

// ---- SPEC ROWS VII (SPEC_TALENTS in talents.js): the moves they grant
// Loomwright's Thrum and Shears' Severance
talentMoves('threadweaver', {
  threadweaver_thrum: {
    id: 'thrum', replaces: 'snip', icon: 'snip', name: 'Thrum', type: 'ogcd', target: 'self', cd: 20, anim: 'big', lock: 0.4, talent: true,
    desc: 'Pluck every thread you hold and leave it whole. Each rings with a {h:90} heal to both its ends, and the whole party takes 3% less damage for 4s for each thread (up to 5, so 15%).',
    usable: k => weaveCount(k) > 0,
    glow: k => weaveStrained(k) > 0,
    effect(k) {
      const ths = weaveThreads(k);
      for (const th of ths) { k.heal(th[0], 90, { ab: this }); k.heal(th[1], 90, { ab: this }); }
      k.mitigate('party', 0.03 * Math.min(5, ths.length), 4, { ab: this });
    },
    fx: { color: '#e4d8ff' },
  },
  threadweaver_severance: {
    id: 'severance', replaces: 'tapestry', icon: 'tapestry', name: 'Severance', type: 'ogcd', target: 'self', cd: 60, anim: 'big', talent: true,
    desc: 'Cut every thread you hold at once. Each releases what it carried in the last 5s to both its ends (at least {h:170}), gives back 10 Spool, and for 5s the whole party takes 15% less damage.',
    usable: k => weaveCount(k) > 0,
    glow: k => weaveStrained(k) > 0,
    effect(k) {
      weaveSnip(k, this, null, true);
      k.mitigate('party', 0.15, 5, { ab: this });
      if (!weaveHosted(k)) k.env.emit({ type: 'heal', target: 'party', amount: k.healAmount(220, { ab: this }).amount, crit: false, ab: this, sim: true });   // (simulator: the cover it gives the party)
    },
    fx: { color: '#ffe0f0' },
  },
});
// Cutting Line's Strum and Understudy's Crossfire
talentMoves('marionettist', {
  marionettist_strum: {
    id: 'strum', replaces: 'cue', icon: 'cue', name: 'Strum', type: 'gcd', target: 'enemy', range: 640, anim: 'cast', talent: true,
    desc: 'Pluck the strings for a {d:230} cut along the line when it is across the enemy ({d:90} when not), add 24 to Taut String and build 1 Encore. It sends no quick Jabs.',
    usable: k => !mariLimp(k) && !!mariEnemy(k),
    glow: k => mariLineOn(k),
    effect(k) {
      const e = mariEnemy(k), on = mariLineOn(k);
      if (!e) return;
      k.damage(on ? 230 : 90, { ab: this, tgt: e.id !== 'dummy' ? e.id : undefined });
      k.g.taut = Math.min(MARI.TAUT_MAX, (k.g.taut || 0) + 24);
      if (on) mariEncore(k, 1);
    },
    fx: { color: '#f0c8dc' },
  },
  marionettist_crossfire: {
    id: 'crossfire', replaces: 'cross', icon: 'cross', name: 'Crossfire', type: 'gcd', target: 'enemy', range: 640, cd: 8, anim: 'big', talent: true,
    desc: 'The Dolls haul their strings taut between them, wherever you stand. With the enemy on that line it is a {d:500} cut and 2 Encore; otherwise it cuts nothing. A Swap just before doubles it, as for Cross-Cut.',
    usable: k => !mariLimp(k) && k.g.dolls.length >= 2,
    glow: k => mariChordOn(k),
    effect(k) {
      const e = mariEnemy(k), cue = k.consume('oncue');
      if (!e || !mariChordOn(k)) { k.stats.misses = (k.stats.misses || 0) + 1; return; }
      k.damage(500 * (cue ? 2 : 1), { ab: this, tgt: e.id !== 'dummy' ? e.id : undefined });
      mariEncore(k, 2 + (cue ? 1 : 0) + (k.perk('marionettist_w2') ? 1 : 0));
      k.stats.cuts = (k.stats.cuts || 0) + 1; k.ultGain(MARI_ULT.GAIN_CUT);
      if (k.talent('marionettist_house') && mariInStage(k)) k.partyBuff('dmg', 0.04, 8, { ab: this });
      k.fx('cut', { n: 1 });
    },
    fx: { color: '#ffd8ec' },
  },
});

if (typeof module !== 'undefined') Object.assign(module.exports, { WEAVE, weaveMax, weaveHosted, weaveThreads, weaveCount, weaveStrained, weaveSpool, weaveCarry, weaveSnapped, weaveLoose, weaveTieGlow, weaveTiedTo, weaveTie, weaveSnip, weaveTighten, weaveShuttleN, weaveShuttle,
  MARI, MARI_STRING, MARI_JAB, MARI_FAR, mariStretch, mariFight, mariTied, mariStrung, mariEnemy, mariER, mariPos, mariLimp, mariInReach, mariReady, mariStation, mariPick, mariLose, mariEncore, mariQuick, mariJab, mariRestring, mariTick, mariShare, mariHit, mariCross,
  mariLineOn, mariAim, mariInStage, mariChordOn });

// ======================================================================= ULTIMATES · DAMAGE CLASSES
// Driftblade, Shadowblade, Ranger, Marionettist, Thermist (the shape: ULTIMATES above, docs/DESIGN.md "Ultimates").
// Each is the climax of its class's own loop and ties in a button that otherwise stands alone. Their charge hooks
// (k.ultGain) sit in the kit code, each marked with the Ultimate's name; the looks are the "ULTIMATES · damage
// classes" block of ability-vfx.js; bots open them through BotAI.ult (bots.js), held back by each one's botOk.
// Gains are per point: a pro fills each in about 90s, a newcomer in about 120s (with charge.rate's trickle).

// ---- Driftblade · Eye of the Gale (window, 8s). Fills from Passing Strikes and the Drift a Crosswind spends. Your
// Drift fills and you blow through the target; for 8s every Passing Strike is a long gale line, Crosswind is Gale
// Line (it spends 30, not everything) and Stillpoint is Eye Step, a blink through the target that is itself a
// Passing Strike: the stand-still button turns into a movement one. Drift drains twice as fast and at once whenever
// you stop (driftTick). It ends in a tempest sized by the Drift you kept.
const DRIFT_ULT = { GAIN_PASS: 0.5, GAIN_CROSS: 3, LINE: 150, LINE_D: 380, GL: 200, GL_D: 750, GL_COST: 30, STEP_CD: 4, END: 400, END_D: 1300, DUR: 8 };
function driftEye(k) { return !!(k.ultWin && k.ultWin.ab.id === 'eyeofthegale'); }
ULTIMATES.driftblade = {
  id: 'eyeofthegale', name: 'Eye of the Gale', slot: 7, type: 'ogcd', ult: true, mode: 'window', target: 'enemy', range: 300, anim: 'big', icon: 'gale',
  lock: 0.6, dr: 0.3,
  burst: 'gale',
  charge: { rate: 0.4, keep: 0.5 },
  botOk: k => !!k.env.target({ target: 'enemy', range: 220 }),
  desc: `Become the eye of a storm: your Drift fills, and you blow clean through your target as a Passing Strike. For ${DRIFT_ULT.DUR}s every Passing Strike cuts a long gale line for {d:${DRIFT_ULT.LINE}}, ` +
    `plus up to {d:${DRIFT_ULT.LINE_D}} more with 100 Drift (twice that during Gale Run). Crosswind (a Comet's Impact) becomes <b>Gale Line</b> and Stillpoint <b>Eye Step</b>, a blink through your target. ` +
    `But the wind never stands still with you: stop moving and your Drift drains 30 a second at once. When the ${DRIFT_ULT.DUR}s are up a tempest bursts on your target for {d:${DRIFT_ULT.END}}, plus up to {d:${DRIFT_ULT.END_D}} more with 100 Drift. ` +
    'You take 30% less damage and can\'t be knocked back while you open it.' +
    `<div class="it-ult"><span><u>Charge:</u> ${DRIFT_ULT.GAIN_PASS}% for every Passing Strike, ${DRIFT_ULT.GAIN_CROSS}% for a Crosswind that spends a full gauge (${Math.round(DRIFT_ULT.GAIN_CROSS * Math.SQRT2 * 10) / 10}% for a Comet's full Impact; less for less), and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
  effect(k, t) {
    const ab = this, still = abBase(k, 'still');
    driftAdd(k, driftMax(k));
    if (still) k.refill(still.id);   // (Eye Step is ready at once; Stillpoint comes back ready after)
    k.teleport('through', { ab, d: 110 });
    k.after(0.18, () => { const tg = k.env.target({ target: 'enemy', range: 300 }) || t; if (tg) { k.g.passAt = k.now + DRIFT.ICD; driftPass(k, tg); } });
  },
  window: {
    dur: DRIFT_ULT.DUR,
    over: {
      cross: {
        fxId: 'galeline', name: 'Gale Line', range: 300, anim: 'big',
        desc: `Eye of the Gale: a long gale line through your target for {d:${DRIFT_ULT.GL}}, plus up to {d:${DRIFT_ULT.GL_D}} more with 100 Drift. It spends only ${DRIFT_ULT.GL_COST} Drift.`,
        usable: k => (k.g.drift || 0) >= DRIFT_ULT.GL_COST,
        glow: k => (k.g.drift || 0) >= 60,
        effect(k) { const m = driftK(k); k.g.drift = Math.max(0, (k.g.drift || 0) - DRIFT_ULT.GL_COST); k.damage(DRIFT_ULT.GL + DRIFT_ULT.GL_D * m, { ab: this }); },
      },
      still: {
        fxId: 'eyestep', name: 'Eye Step', type: 'ogcd', target: 'enemy', range: 300, cd: DRIFT_ULT.STEP_CD, lock: 0.3, anim: 'attack',
        desc: `Eye of the Gale: blink clean through your target, 120 px past it: a Passing Strike as a gale line. You parry for 1s as you go (50% less damage; catch a hit in the first moment and you riposte). ${DRIFT_ULT.STEP_CD}s cooldown.`,
        glow: () => true,
        effect(k) {
          const ab = this;
          k.teleport('through', { ab, d: 120 });
          k.mitigate('self', 0.5, 1, { kind: 'brace', ab }); k.buff('still', 1);
          k.after(0.15, () => { const tg = k.env.target({ target: 'enemy', range: 300 }); if (tg) { k.g.passAt = k.now + DRIFT.ICD; driftPass(k, tg); } });
        },
      },
    },
    onEnd(k) { k.damage(DRIFT_ULT.END + DRIFT_ULT.END_D * driftK(k), { ab: k.ult }); k.fx('drift-tempest', { d: Math.round(driftK(k) * 100) }); },
  },
};

// ---- Shadowblade · Thousand Cuts (window, 7s). Fills from the combo points your finishers spend. It opens in a
// burst of smoke (Smoke Bomb's cover for the party, 7s) with you behind the target and 2 combo points; inside it
// every Strike is a Shadow Cut that blinks you to the target's back (+2 points), and your finisher (Eviscerate or
// Backstab) hits at full strength without spending them. The points you hold, and every cut you made, come down at
// the end as one huge Thousand Cuts.
const BLADE_ULT = { GAIN_CP: 1.5, DUR: 7, GCD: 1.8, CUT: 280, END: 350, END_CP: 130, END_CUT: 65, MAX_CUTS: 8 };
function bladeThousand(k) { return !!(k.ultWin && k.ultWin.ab.id === 'thousandcuts'); }
ULTIMATES.shadowblade = {
  id: 'thousandcuts', name: 'Thousand Cuts', slot: 7, type: 'ogcd', ult: true, mode: 'window', target: 'enemy', range: 380, anim: 'big', icon: 'dance',
  lock: 0.6, dr: 0.3,
  burst: 'dance',
  charge: { rate: 0.4, keep: 0.5 },
  botOk: k => !!k.env.target({ target: 'enemy', range: MELEE }),
  desc: `Vanish in a burst of smoke and step out behind your target with 2 combo points; the smoke covers the party (10% less damage for ${BLADE_ULT.DUR}s). ` +
    `For ${BLADE_ULT.DUR}s every hit counts as a positional, Strike becomes <b>Shadow Cut</b>, and your finisher spends no combo points, both on a ${BLADE_ULT.GCD}s global cooldown. ` +
    `When the ${BLADE_ULT.DUR}s are up every cut comes due at once: <b>Thousand Cuts</b>, {d:${BLADE_ULT.END}} plus {d:${BLADE_ULT.END_CP}} for every combo point you hold and {d:${BLADE_ULT.END_CUT}} for every Shadow Cut and finisher you made (up to ${BLADE_ULT.MAX_CUTS}), 15% more on a poisoned target. It spends the points. ` +
    'You take 30% less damage and can\'t be knocked back while you vanish.' +
    `<div class="it-ult"><span><u>Charge:</u> ${BLADE_ULT.GAIN_CP}% for every combo point a finisher spends, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
  effect(k) {
    const ab = this;
    k.mitigate('party', 0.1, BLADE_ULT.DUR, { ab });
    k.teleport('behind', { ab });
    k.buff('truenorth', BLADE_ULT.DUR);
    k.g.cuts = 0;
    k.gain('combo', 2, 5);
  },
  window: {
    dur: BLADE_ULT.DUR,
    over: {
      strike: {
        fxId: 'shadowcut', name: 'Shadow Cut', recastGcd: BLADE_ULT.GCD, anim: 'attack',
        desc: `Thousand Cuts: blink to your target's back and cut for {d:${BLADE_ULT.CUT}}. +2 combo points.`,
        glow: k => k.g.combo < 4,
        effect(k) { k.teleport('behind', { ab: this }); k.damage(BLADE_ULT.CUT, { ab: this }); bladeCombo(k, 2); k.g.cuts = (k.g.cuts || 0) + 1; },
      },
      evis: {
        fxId: 'shadowedge', recastGcd: BLADE_ULT.GCD,
        desc: 'Thousand Cuts: your finisher at full strength for the combo points you hold, but it spends none of them.',
        glow: k => k.g.combo >= 4,
        effect(k, t) {
          const cp = k.g.combo, base = k.baseAbilities.find(a => a.id === this.id);
          if (base) base.effect.call(this, k, t);
          k.g.combo = Math.max(cp, k.g.combo || 0);
          k.g.cuts = (k.g.cuts || 0) + 1;
        },
      },
    },
    onEnd(k) {
      const cp = k.g.combo || 0, n = Math.min(BLADE_ULT.MAX_CUTS, k.g.cuts || 0);
      k.g.combo = 0; k.g.cuts = 0;
      const pois = k.dotRemaining('poison') > 0 || k.dotRemaining('rupture') > 0;
      k.damage(BLADE_ULT.END + BLADE_ULT.END_CP * cp + BLADE_ULT.END_CUT * n, { ab: k.ult, mult: pois ? 1.15 : 1 });
      k.fx('blade-thousand', { n: n + cp });
    },
  },
};

// ---- Ranger · Starfall Volley (instant). Fills from Keen Eye procs and the Focus your Rapid Fires spend. It looses
// all your Focus into the sky: a first star for the hit, then six volleys over 3s at your target, every one sized
// by the Focus you had; under it every Quick Shot lights Keen Eye. Loosed while Hunter's Cloak is up, the volleys
// mend the party too, so the Cloak's minute and a half and the Ultimate's line up.
const RANGER_ULT = { GAIN_KEEN: 4.5, GAIN_FOCUS: 0.07, HIT: 800, HIT_F: 7, VOL: 190, VOL_F: 1.3, N: 6, GAP: 0.5, HEAL: 40 };
const RANGER_STAR = { id: 'starvolley', name: 'Starfall' };
ULTIMATES.ranger = {
  id: 'starfall', name: 'Starfall Volley', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: RANGED, anim: 'big', icon: 'barrage',
  lock: 0.6, dr: 0.3,
  charge: { scale: 0.95, rate: 0.4, keep: 0.5, spend: { focus: RANGER_ULT.GAIN_FOCUS } },
  botOk: k => (k.g.focus || 0) >= 50,
  desc: `Loose all your Focus into the sky. A first star strikes your target for {d:${RANGER_ULT.HIT}} plus {d:${RANGER_ULT.HIT_F * 10}} for every 10 Focus, then the sky falls on it: ` +
    `${RANGER_ULT.N} volleys over 3s, each {d:${RANGER_ULT.VOL}} plus {d:${Math.round(RANGER_ULT.VOL_F * 10)}} for every 10 Focus (at 100 Focus: {d:${Math.round(RANGER_ULT.HIT + 100 * RANGER_ULT.HIT_F)}} and {d:${Math.round(RANGER_ULT.VOL + 100 * RANGER_ULT.VOL_F)}} each). ` +
    `While the stars fall every Quick Shot lights Keen Eye. Loosed while Hunter's Cloak is up, every volley also heals the whole party for {h:${RANGER_ULT.HEAL}}. ` +
    'You take 30% less damage and can\'t be knocked back while you draw.' +
    `<div class="it-ult"><span><u>Charge:</u> ${RANGER_ULT.GAIN_KEEN}% for every Keen Eye you light, ${Math.round(RANGER_ULT.GAIN_FOCUS * 500) / 10}% for every 50 Focus you spend, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
  effect(k, t) {
    const ab = this, F = Math.round(k.g.focus || 0), cloak = k.has('cloaked'), tgt = t && t.id && t.id !== 'dummy' ? t.id : undefined;
    k.g.focus = 0;   // (set, not spent: spending feeds the charge back)
    k.buff('starfall', 0.4 + RANGER_ULT.N * RANGER_ULT.GAP);
    k.fx('ranger-stars', { f: F, c: cloak ? 1 : 0 });
    k.after(0.4, () => k.damage(RANGER_ULT.HIT + RANGER_ULT.HIT_F * F, { ab, tgt }));
    for (let i = 1; i <= RANGER_ULT.N; i++) k.after(0.4 + RANGER_ULT.GAP * i, () => {
      k.damage(RANGER_ULT.VOL + RANGER_ULT.VOL_F * F, { ab: RANGER_STAR, tgt });
      if (cloak) k.heal('party', RANGER_ULT.HEAL, { ab: RANGER_STAR });
    });
  },
};

// ---- Marionettist · Curtain Call (instant). Fills from the Encore you build and the Encore a Grand Finale spends.
// The Doll's star turn: every Doll leaps to its mark across the target, untouchable for a moment, and the whole
// troupe strikes at once along every String still taut. The curtain leaves a bow behind: your next Swap within 10s
// snaps the Strings across the target as you trade places.
const MARI_ULT = { GAIN_ENC: 0.4, GAIN_CUT: 3, GAIN_FINALE: 0.3, HIT: 1100, PER_STR: 450, BOW: 600, BOW_DUR: 10 };
function mariBow(k, ab) {
  const n = k.g.dolls.length || 1, m = k.def.dollMult || 1, e = mariEnemy(k);
  k.damage(MARI_ULT.BOW * n * m, { ab, tgt: e && e.id !== 'dummy' ? e.id : undefined });
  k.fx('mari-bow');
}
ULTIMATES.marionettist = {
  id: 'curtaincall', name: 'Curtain Call', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: 640, anim: 'big', icon: 'finale',
  lock: 0.7, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5, gain: { encore: MARI_ULT.GAIN_ENC } },
  usable: k => !mariLimp(k),
  botOk: k => (k.g.strings || 0) >= 2,
  desc: `The Doll's star turn. Every Doll leaps to its mark across your target, untouchable for 1.5s, and the whole troupe strikes at once: {d:${MARI_ULT.HIT}} plus {d:${MARI_ULT.PER_STR}} for every String still taut ` +
    `(three Strings: {d:${MARI_ULT.HIT + 3 * MARI_ULT.PER_STR}}; the Understudy's two Dolls each strike at their share). ` +
    `For ${MARI_ULT.BOW_DUR}s after, your next Swap is the bow: the Strings snap taut across the target as you trade places, {d:${MARI_ULT.BOW}}. Needs the Doll on its Strings. ` +
    'You take 30% less damage and can\'t be knocked back while the curtain is up.' +
    `<div class="it-ult"><span><u>Charge:</u> ${MARI_ULT.GAIN_CUT}% for every Cross-Cut that lands, ${MARI_ULT.GAIN_ENC}% for every Encore you build, ${MARI_ULT.GAIN_FINALE}% for every Encore a Grand Finale spends, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
  effect(k, t) {
    const ab = this, e = mariEnemy(k), p = mariPos(k), S = k.g.strings || 0, m = k.def.dollMult || 1;
    if (!e) return;
    k.g.dolls.forEach((d, i) => { const st = mariStation(k, i, p, e); d.x = st.x; d.y = st.y; d.until = Math.max(d.mode === 'finale' ? d.until : 0, k.now + 1.1); d.mode = 'finale'; d.safe = Math.max(d.safe || 0, k.now + 1.5); d.manual = false; });
    mariShare(k);
    k.buff('curtaincall', MARI_ULT.BOW_DUR);
    const n = k.g.dolls.length || 1, tgt = e.id !== 'dummy' ? e.id : undefined;
    k.after(0.45, () => k.damage((MARI_ULT.HIT + MARI_ULT.PER_STR * S) * n * m, { ab, tgt }));
    k.fx('mari-curtain', { s: S });
  },
};

// ---- Thermist · Supernova (instant). Fills from Thermal Shocks (by their swing) and edge casts. The dial slams to
// both of its ends: frost shatters on the target, then fire detonates through it, both sized by the stored swing
// (k.g.peak: how far the dial got on its side since it last crossed 0). Equilibrium keeps that swing, so it now has
// a payoff: snap back to safety, cash the swing here. The dial itself stays where it is (the swing stays armed), and
// for 6s both sides burn (Attuned, Inversion's state).
const THERM_ULT = { GAIN_SWING: 1.3, GAIN_EDGE: 1.3, PEND: 0.65, FROST: 400, FROST_S: 75, FIRE: 750, FIRE_S: 260, ATTUNE: 6 };
const THERM_NOVA = { id: 'novafrost', name: 'Supernova: Frost' };
ULTIMATES.thermist = {
  id: 'supernova', name: 'Supernova', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: RANGED, anim: 'big', icon: 'invert',
  lock: 0.8, dr: 0.3,
  charge: { scale: 0.88, rate: 0.4, keep: 0.5 },
  botOk: k => (k.g.peak || 0) >= 4,
  desc: `The dial slams to both of its ends at once. Frost shatters on your target for {d:${THERM_ULT.FROST}} plus {d:${THERM_ULT.FROST_S}} for every step of your stored swing, ` +
    `then fire detonates through it for {d:${THERM_ULT.FIRE}} plus {d:${THERM_ULT.FIRE_S}} per step (5 steps: {d:${THERM_ULT.FROST + 5 * THERM_ULT.FROST_S}} and {d:${THERM_ULT.FIRE + 5 * THERM_ULT.FIRE_S}}). ` +
    'Your stored swing is how far the dial got on its side since it last crossed 0, up to 5, and Equilibrium keeps it: snap back to safety, then cash it here. ' +
    `The dial stays where it was, your swing still armed, and for ${THERM_ULT.ATTUNE}s you are Attuned: both elements count as your side. You take 30% less damage and can't be knocked back while it builds.` +
    `<div class="it-ult"><span><u>Charge:</u> ${THERM_ULT.GAIN_SWING}% for every step of a Thermal Shock's swing (${Math.round(THERM_ULT.GAIN_SWING * THERM_ULT.PEND * 100) / 100}% as a Pendulum), ${THERM_ULT.GAIN_EDGE}% for every spell cast at its own edge, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
  effect(k, t) {
    const ab = this, S = Math.max(0, Math.min(THERMIST.EDGE, k.g.side ? k.g.peak || 0 : 0)), tgt = t && t.id && t.id !== 'dummy' ? t.id : undefined;
    k.buff('attuned', Math.max(k.remaining('attuned'), THERM_ULT.ATTUNE));
    k.fx('therm-nova', { s: S });
    k.after(0.35, () => k.damage(THERM_ULT.FROST + THERM_ULT.FROST_S * S, { ab: THERM_NOVA, tgt }));
    k.after(0.7, () => k.damage(THERM_ULT.FIRE + THERM_ULT.FIRE_S * S, { ab, tgt }));
  },
};

// ======================================================================= GLOOMSWORN (tank, class 18): the Undying Vigil
// Gloom (0-100) fills as you strike (8 for every hit of your own abilities) and as you are struck (6 for every hit you
// take, heard from the host as a 'taken' notice). It is spent on Gloom Strike (40), Black Pall (30) and Last Rite (all),
// and fades slowly once nothing has landed either way for a while. The signature is the host's (fight.js HOLLOW_HOST):
// a blow that would kill you while your Gloom is FULL does not. You go Hollow for 8s (10 for the Reaver of Dusk): HP held
// at 1, every point of damage added to a debt instead, and 30% more damage dealt. Healing received through the Hollow and
// a short grace after it must cover the debt (shields count half) or you fall when the grace ends; if it does, you stand
// up at a quarter of your health. Doom, the enrage and a fall still kill. The kit keeps the host's copy of the Gloom up to
// date ('gloom' events), hears 'hollow' (it began or ended) and the debt/healed numbers of the party update ('hollowtick').
const GLOOM = {
  MAX: 100, HIT: 8, TAKEN: 6, TAKEN_GAP: 0.35,   // gains: a hit of yours, a hit you take (at most one every TAKEN_GAP s)
  REST: 6, DECAY: 2.5, DECAY_SLOW: 1,            // out of combat (nothing landed or taken for REST s): lost per second (a Sentinel: slower)
  STRIKE: 40, PALL: 30, MANTLE: 15, RITE_MIN: 20, // Gloom Strike and Black Pall spend; Black Mantle gives; Last Rite needs at least RITE_MIN and spends all
  ECHO: 0.85, ECHO_DUR: 4,                        // Shade Step: the next two Gloom Strikes echo at 85%, for 4s
  HOLLOW: 8, HOLLOW_LONG: 10, GRACE: 4, GRACE_LONG: 6, WATCH: 0.15, CD: 60, DMG: 0.3, WAKE: 0.25,   // (HOLLOW_HOST in fight.js clamps what the kit asks for)
  BRIM: 0.1, BRIM_EVERY: 1, DREGS: 40,         // a full vessel: 10% less damage taken while it stays full; a Hollow leaves 40 Gloom of dregs
  ULT_SPEND: 0.13, ULT_SAVE: 25, ULT_HIT: 800, ULT_HIT_G: 8, ULT_SH: 200, ULT_SH_G: 3, ULT_MIT: 0.1,
};
const gloomDur = k => (k.def.hollowLong ? GLOOM.HOLLOW_LONG : GLOOM.HOLLOW);
const gloomGraceLen = k => (k.def.sentinel ? GLOOM.GRACE_LONG : GLOOM.GRACE);   // (a Sentinel's watch holds longer: the healer has more time to pay the debt)
const gloomHollow = k => k.has('hollow');
// +gain, with Spill: what would run past the vessel hardens into a barrier on you
function gloomGain(k, n) {
  if (!(n > 0)) return;
  if (k.talent('gloomsworn_spill')) { const over = (k.g.gloom || 0) + n - GLOOM.MAX; if (over > 0.5) k.shield('self', over * 10, 8, { ab: k.abilities[1] }); }
  k.gain('gloom', n, GLOOM.MAX);
  k.g.actAt = k.now;
}
// Shade Step's echo: a Gloom Strike with the shade behind it hits again (85%) and spends one of the two echoes
function gloomEcho(k, ab, pot) {
  if (!k.consume('shade')) return false;
  k.after(0.3, () => k.damage(pot * GLOOM.ECHO, { ab, extra: true }));
  k.fx('shade-echo');
  return true;
}
// the host's copy: the Gloom (and what Hollow would be, with this hero's talents), a few times a second while it moves
function gloomSend(k) {
  const g = k.g, v = Math.round(g.gloom || 0), sent = g.sentV ?? -1;
  if (v === sent && (v === 0 || k.now - g.sentAt < 1)) return;
  if (v !== sent && k.now - g.sentAt < 0.2 && (v >= GLOOM.MAX) === (sent >= GLOOM.MAX)) return;
  g.sentV = v; g.sentAt = k.now;
  k.env.emit({ type: 'gloom', value: v, dur: gloomDur(k), secs: gloomGraceLen(k), st: GLOOM.CD });
}
// the host says the Hollow began (d.d: its seconds, d.g: the grace after) or ended (d.ok: the knight stood up)
function gloomHollowNote(k, d) {
  if (d.on) {
    k.g.gloom = 0; k.g.sentV = -1;
    k.buff('hollow', d.d);
    // the payoff of the held vessel: the dregs (40 Gloom), both Gloom Strikes back and the shade behind them for the whole Hollow
    k.g.gloom = GLOOM.DREGS; k.g.hollowCdAt = k.now + GLOOM.CD;
    { const st = gloomAb(k, 'strike'); if (st) k.refill(st.id); }
    k.buff('shade', d.d, {}, 2, 2);
    k.g.hollowUntil = k.now + d.d; k.g.graceUntil = k.now + d.d + d.g;
    k.g.hl = { debt: 0, healed: 0, at: k.now };
    k.stats.hollows = (k.stats.hollows || 0) + 1;
    if (k.def.sentinel) k.mitigate('party', GLOOM.WATCH, d.d, { ab: gloomAb(k, 'pall') });   // (the Sentinel's watch: the party is covered while the knight stands hollow)
    k.fx('hollow-on', { d: d.d, g: d.g });
    return;
  }
  k.clear('hollow'); k.g.hollowUntil = 0; k.g.graceUntil = 0; k.g.hl = null;
  if (d.ok) {
    k.stats.hollowSaves = (k.stats.hollowSaves || 0) + 1;
    k.ultGain(GLOOM.ULT_SAVE);   // (Eclipse of the Vigil)
    if (k.talent('gloomsworn_wakened')) { for (const id of ['mantle', 'rite']) { const a = k.abilities.find(x => k.baseId(x) === id); if (a) k.refill(a.id); } }
    if (k.talent('gloomsworn_weeping') && d.debt > 0) k.shield('party', Math.min(k.env.maxHp() * 0.25, d.debt * 0.5) / ENGINE.POT_SCALE, 8, { ab: k.abilities[3] });
    // Debt Collected (the Reaver's spec row VII): the debt breaks over the boss, half of it, up to 900 potency
    if (k.talent('gloomsworn_debt') && d.debt > 0) { k.damage(Math.min(900, d.debt * 0.5 / ENGINE.POT_SCALE), { ab: gloomAb(k, 'strike'), extra: true }); k.fx('last-rite', { g: 100 }); }
    k.fx('hollow-end', { ok: 1 });
  } else k.fx('hollow-end', { ok: 0 });
}
// Gloom Strike's price: 40 (a Reaver of Dusk with Hollow Hunger pays 20 while Hollow); a Sentinel's Cover makes the next one free
const gloomStrikeCost = k => (k.talent('gloomsworn_hunger') && gloomHollow(k) ? GLOOM.STRIKE / 2 : GLOOM.STRIKE);
const gloomStrikeReady = k => (k.talent('gloomsworn_cover') && k.has('cover')) || (k.g.gloom || 0) >= gloomStrikeCost(k);
// Black Pall (and the Vigil Ward in its place) costs nothing for a Sentinel's Wall Within while Hollow
const gloomPallCost = k => (k.talent('gloomsworn_hollowwall') && gloomHollow(k) ? 0 : GLOOM.PALL);
// the ability whose base id this is (a spec's or a talent's replacement answers to it)
const gloomAb = (k, id) => k.abilities.find(a => k.baseId(a) === id);

KITS.gloomsworn = {
  potMult: 0.6,   // balance knob (tools/simulate.js)
  role: 'tank',
  auto: { kind: 'slash', potency: 40, range: MELEE },
  gauge: { kind: 'gloom', key: 'gloom', max: 100, label: 'Gloom', w: 150 },
  init: () => ({ gloom: 0, step: 0, comboUntil: 0, actAt: -99, takenAt: -9, sentV: -1, sentAt: -9, hollowUntil: 0, graceUntil: 0, hl: null }),
  dmgMod: k => (gloomHollow(k) ? GLOOM.DMG : 0),
  onDamage(k, amount, crit, opts) {
    // a hit of your own ability fills the vessel (not autos, damage over time, echoes or an item's strike)
    if (!opts.ab || opts.auto || opts.dot || opts.extra || opts.item) return;
    gloomGain(k, k.perk('gloomsworn_w1') ? 10 : GLOOM.HIT);
    if (k.has('omen') && k.baseId(opts.ab) === 'rend') { k.clear('omen'); gloomGain(k, 12); }
    if (gloomHollow(k) && k.talent('gloomsworn_feast')) k.healRaw('self', k.env.maxHp() * 0.03, { ab: opts.ab });   // (self healing counts against the debt)
  },
  onNotify(k, type, d) {
    if (type === 'taken') {
      if (!(d.a > 0)) return;
      if (k.now - k.g.takenAt >= GLOOM.TAKEN_GAP) { k.g.takenAt = k.now; gloomGain(k, GLOOM.TAKEN); }
      // Thorned Mantle: the Mantle strikes back for a quarter of what gets through it
      if (k.has('mantle') && k.talent('gloomsworn_thorns')) k.damage(Math.min(500, d.a / ENGINE.POT_SCALE * 0.25), { ab: gloomAb(k, 'mantle'), extra: true });
      // Warden's Mantle (the Sentinel's spec row VII): each hit that gets through lays a barrier on the most hurt ally (one a second)
      if (k.has('wardmantle') && k.now >= (k.g.wardAt || 0)) { k.g.wardAt = k.now + 1; k.shield('lowest', 45, 6, { ab: gloomAb(k, 'mantle') }); }
    }
    if (type === 'hollow') gloomHollowNote(k, d);
    if (type === 'hollowtick') k.g.hl = d.on ? { debt: d.debt, healed: d.healed, at: k.now } : null;
  },
  tick(k) {
    const g = k.g, now = k.now;
    gloomSend(k);
    tankUltHits(k, 6);   // (Eclipse of the Vigil: the hits you take also fill it, as the other tanks')
    onBossCast(k, () => {
      if (k.talent('gloomsworn_omen')) k.buff('omen', 8);
      const b = bossNow(k);
      if (k.talent('gloomsworn_cover') && b && !b.onMe) { k.buff('cover', 8); k.fx('shade-echo'); }   // (Cover, spec row VI: a cast aimed at someone else)
    });
    // Brimming Vessel (spec row VI): the moment the vessel fills, a pall falls over the party (once every 20s)
    const brim = (g.gloom || 0) >= 99.5;
    if (brim && !g.wasFull && k.talent('gloomsworn_brim') && now >= (g.brimAt || 0)) { g.brimAt = now + 20; k.mitigate('party', 0.1, 8, { ab: gloomAb(k, 'pall') }); k.fx('black-pall'); }
    g.wasFull = brim;
    // Brimming: a vessel held full hardens you, 10% less damage taken for as long as it stays full
    if (brim && now >= (g.brimMitAt || 0)) { g.brimMitAt = now + GLOOM.BRIM_EVERY; k.mitigate('self', GLOOM.BRIM, GLOOM.BRIM_EVERY, { ab: gloomAb(k, 'strike') }); }
    // out of combat the vessel drains, slowly
    if (g.gloom > 0 && now - g.actAt > GLOOM.REST) {
      const dt = now - (g.decayT ?? now);
      if (dt > 0 && dt < 1) g.gloom = Math.max(0, g.gloom - (k.def.slowDecay ? GLOOM.DECAY_SLOW : GLOOM.DECAY) * dt);
    }
    g.decayT = now;
    if (g.hollowUntil && now > g.graceUntil + 1) { g.hollowUntil = 0; g.graceUntil = 0; g.hl = null; }   // (a missed notice never leaves it stuck)
  },
  signature: 'Hollow',
  floor: 'Press Q to strike, W when it glows to spend Gloom on a heavy blow and a barrier, F if you are about to die. Keep your health up and your healer on you.',
  ceiling: [
    'Gloom fills 8 for every hit you land and 6 for every hit you take. Every spend (Gloom Strike 40, Black Pall 30, Last Rite all of it) is Gloom you will not have when the killing blow lands.',
    'Hollow: a blow that would kill you while your Gloom is full does not. For 8s you cannot fall below 1 HP, you deal 30% more damage, and all the damage you take is written down as a debt. Your healer must heal at least that much by the end of the 4s after, or you fall. Mitigation and barriers still cut the debt as they cut a hit.',
    'Hold the vessel full before the hits that could kill you (the tankbuster, the raidwide on a sagging tank). Hollow comes back once a minute. A full vessel is armour too: while it brims you take 10% less damage.',
    'When the Hollow lands the vessel breaks into its dregs: 40 Gloom, both Gloom Strikes back, and the shade behind them for the whole Hollow. Spend it all, 30% harder.',
    'Shade Step closes the gap and gives your next two Gloom Strikes an echo for 4s: step when you hold the Gloom for both.',
    'Black Pall is the party\'s cooldown and costs Gloom you may want to keep: spend it on the raidwide that matters.',
  ],
  abilities: [
    {
      id: 'rend', name: 'Rend', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'Three-hit combo on one button: Rend ({d:200}) > Sunder ({d:270}) > Gloaming ({d:350}). Every hit you land fills 8 Gloom. It carries your taunt.',
      label: k => ['Rend', 'Sunder', 'Gloaming'][k.now < k.g.comboUntil ? k.g.step : 0],
      fxStep: k => (k.now < k.g.comboUntil ? k.g.step : 0),
      effect(k) {
        const step = k.now < k.g.comboUntil ? k.g.step : 0, pot = [200, 270, 350][step];
        k.damage(pot, { ab: this });
        if (step === 2 && k.talent('gloomsworn_bleed')) k.dot('gloomblood', 35, 9, 3, { ab: this });
        k.g.step = (step + 1) % 3; k.g.comboUntil = k.now + 15;
      },
      fx: { type: 'slash', color: '#7a5aa8', r: 54, span: 1.7 },
    },
    {
      id: 'strike', name: 'Gloom Strike', type: 'gcd', target: 'enemy', range: MELEE, charges: 2, cd: 7, anim: 'bash',
      desc: 'Spend 40 Gloom: a heavy blow for {d:760} that wraps you in a barrier of {s:150} for 6s. Two charges. Needs 40 Gloom. It glows while the shade is behind it, while you are Hollow, and when the vessel is full with the Hollow still coming back.',
      usable: k => gloomStrikeReady(k),
      glow: k => gloomStrikeReady(k) && (k.has('shade') || gloomHollow(k) || ((k.g.gloom || 0) >= 90 && k.now < (k.g.hollowCdAt || 0))),
      effect(k) {
        const pot = 760, sen = !!k.def.sentinel;
        const covered = k.talent('gloomsworn_cover') && k.consume('cover');   // (Cover, spec row VI: free, and the chained barrier doubled)
        if (!covered) k.spend('gloom', gloomStrikeCost(k));
        k.damage(pot, { ab: this });
        gloomEcho(k, this, pot);
        // a Reaver of Dusk's Strike echoes again while Hollow
        if (k.def.hollowEcho && gloomHollow(k)) { k.after(0.55, () => k.damage(pot * GLOOM.ECHO, { ab: this, extra: true })); k.fx('shade-echo'); }
        if (k.talent('gloomsworn_interest') && (k.g.gloom || 0) >= 40) k.after(0.4, () => k.damage(pot * 0.4, { ab: this, extra: true }));
        const dur = sen ? 10 : 6;
        if (sen) k.shield('lowest', covered ? 220 : 110, dur, { ab: this });   // (a Sentinel's barrier chains on to the most hurt ally; if that is you, yours below replaces it)
        k.shield('self', k.perk('gloomsworn_a2') ? 225 : 150, dur, { ab: this });
      },
      fx: { type: 'slash', color: '#5a3a8a', r: 60, span: 1.3 },
    },
    {
      id: 'shade', name: 'Shade Step', type: 'ogcd', target: 'enemy', range: 320, cd: 15, lock: 0.4, anim: 'attack',
      desc: 'Step through the dark to your target and cut it for {d:150}. For 4s your next two Gloom Strikes echo, hitting again for 85%. It glows when the vessel can pay for both.',
      glow: k => !k.has('shade') && (k.g.gloom || 0) >= 2 * gloomStrikeCost(k) && k.charges(gloomAb(k, 'strike')) >= 1,
      effect(k) {
        if (!k.env.target({ target: 'enemy', range: MELEE })) k.teleport('dash', { ab: this, d: 150 });
        k.damage(150, { ab: this });
        const n = k.perk('gloomsworn_w2') ? 3 : 2;
        k.buff('shade', GLOOM.ECHO_DUR, {}, n, n);
        if (k.talent('gloomsworn_veil')) k.mitigate('self', 0.15, 4, { ab: this });
        if (k.talent('gloomsworn_gravecut')) { k.g.step = 2; k.g.comboUntil = k.now + 15; }   // (Gravecut, spec row VI: straight into Gloaming)
      },
      fx: { type: 'slash', color: '#8a6ac8', r: 40, span: 1.1 },
    },
    {
      id: 'pall', name: 'Black Pall', type: 'ogcd', target: 'self', cd: 60, lock: 0.5, anim: 'big',
      desc: 'Spend 30 Gloom: a pall falls over the whole party, 25% less damage taken for 6s (8s as a Sentinel).',
      usable: k => (k.g.gloom || 0) >= gloomPallCost(k),
      glow: k => { const b = bossNow(k); return !!(b && b.wide) && (k.g.gloom || 0) >= gloomPallCost(k); },
      effect(k) {
        k.spend('gloom', gloomPallCost(k));
        k.mitigate('party', 0.25, (k.def.sentinel ? 8 : 6) + (k.perk('gloomsworn_w3') ? 2 : 0), { ab: this });
        if (k.talent('gloomsworn_bearer')) k.shield('party', 100, 8, { ab: this });
        k.fx('black-pall');
      },
      fx: { type: 'ring', color: '#6a4aa0', r: 160 },
    },
    {
      id: 'mantle', name: 'Black Mantle', type: 'ogcd', target: 'self', cd: 60, lock: 0.5, anim: 'big',
      desc: 'Pull the dark about you: 40% less damage taken for 8s, and 15 Gloom.',
      glow: k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft < 1.5); },
      effect(k) {
        k.mitigate('self', k.perk('gloomsworn_a4') ? 0.5 : 0.4, 8, { ab: this });
        k.buff('mantle', 8);
        gloomGain(k, GLOOM.MANTLE);
      },
      fx: { type: 'aura', color: '#4a2a7a', r: 36, dur: 2.5 },
    },
    {
      id: 'rite', name: 'Last Rite', type: 'ogcd', target: 'self', cd: 120, lock: 0.5, anim: 'big',
      desc: 'Spend all your Gloom (at least 20): a barrier of {s:220} plus {s:7} for every point, for 8s, and you heal 5% of your HP plus 0.07% for every point.',
      usable: k => (k.g.gloom || 0) >= GLOOM.RITE_MIN,
      glow: k => hpOf(k) < 0.4,
      effect(k) {
        const g = Math.floor(k.g.gloom || 0);
        k.spend('gloom', g);
        const pot = 220 + 7 * g;
        k.shield('self', pot, 8, { ab: this });
        if (k.talent('gloomsworn_requiem')) k.shield('party', pot * 0.5, 8, { ab: this });
        k.healRaw('self', k.env.maxHp() * (0.05 + 0.0007 * g), { ab: this });
        k.fx('last-rite', { g });
      },
      fx: { type: 'aura', color: '#9a7ad8', r: 38, dur: 2.5 },
    },
  ],
};

// the taunt (carried by Rend, TAUNT_CARRY): a mark the dark drinks from
Object.assign(TAUNT, {
  gloomsworn: {
    name: 'Dread Mark', icon: 'rend',
    desc: 'The mark feeds the vessel: +20 Gloom.',
    use(k) { gloomGain(k, 20); },
  },
});
TAUNT_CARRY.gloomsworn = 'rend';

// talents that grant a new move (TALENT_ABILITIES, the shared system above)
TALENT_ABILITIES.gloomsworn_vigil = { cls: 'gloomsworn', ab: {
  id: 'vigil', replaces: 'pall', icon: 'vigil', name: 'Vigil Ward', type: 'ogcd', target: 'self', cd: 45, lock: 0.5, anim: 'big',
  desc: 'Spend 30 Gloom: stand watch over whoever is hurt most (you, if that is you). They take 50% less damage for 5s and are wrapped in a barrier of {s:200} for 6s. You take 15% less damage for 5s.',
  usable: k => (k.g.gloom || 0) >= gloomPallCost(k),
  glow: k => { const b = bossNow(k); return !!(b && b.casting && !b.onMe) && (k.g.gloom || 0) >= gloomPallCost(k); },
  effect(k) {
    k.spend('gloom', gloomPallCost(k));
    const x = k.perk('gloomsworn_w3') ? 2 : 0;   // (Black Pall's enhancement: 2s longer)
    k.mitigate('lowest', 0.5, 5 + x, { ab: this });
    k.shield('lowest', 200, 6 + x, { ab: this });
    k.mitigate('self', 0.15, 5 + x, { ab: this });
    k.fx('black-pall');
  },
  fx: { type: 'ring', color: '#8a6ac8', r: 70 },
} };
TALENT_ABILITIES.gloomsworn_pyre = { cls: 'gloomsworn', ab: {
  id: 'pyre', replaces: 'rite', icon: 'pyre', name: 'Black Pyre', type: 'ogcd', target: 'enemy', range: 300, cd: 90, lock: 0.5, anim: 'big',
  desc: 'Spend all your Gloom (at least 30): the vessel breaks over your target in black fire, {d:600} plus {d:10} for every point, and a barrier of {s:150} plus {s:2} for every point wraps you for 8s.',
  usable: k => (k.g.gloom || 0) >= 30,
  glow: k => (k.g.gloom || 0) >= 90,
  effect(k) {
    const g = Math.floor(k.g.gloom || 0);
    k.spend('gloom', g);
    k.damage(600 + 10 * g, { ab: this, threat: 1.5 });
    k.shield('self', 150 + 2 * g, 8, { ab: this });
    k.fx('last-rite', { g });
  },
  fx: { type: 'slash', color: '#9a5ad8', r: 70, span: 2 },
} };
// the spec rows VII (SPEC_TALENTS in talents.js): the Sentinel's Warden's Mantle and the Reaver of Dusk's Dark Pact, both in Black Mantle's slot
TALENT_ABILITIES.gloomsworn_wardmantle = { cls: 'gloomsworn', ab: {
  id: 'wardmantle', replaces: 'mantle', icon: 'wardmantle', name: 'Warden\'s Mantle', type: 'ogcd', target: 'self', cd: 60, lock: 0.5, anim: 'big', talent: true,
  desc: 'Pull the dark about you: 40% less damage taken for 8s, and 15 Gloom. For those 8s every hit that gets through lays a barrier of {s:45} on the most hurt ally.',
  glow: k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft < 1.5); },
  effect(k) {
    k.mitigate('self', k.perk('gloomsworn_a4') ? 0.5 : 0.4, 8, { ab: this });
    k.buff('mantle', 8); k.buff('wardmantle', 8);
    gloomGain(k, GLOOM.MANTLE);
  },
  fx: { type: 'aura', color: '#6a8ad8', r: 36, dur: 2.5 },
} };
TALENT_ABILITIES.gloomsworn_pact = { cls: 'gloomsworn', ab: {
  id: 'pact', replaces: 'mantle', icon: 'pact', name: 'Dark Pact', type: 'ogcd', target: 'self', cd: 75, lock: 0.5, anim: 'big', talent: true,
  desc: 'The vessel fills to the brim at once, and your next two Gloom Strikes within 4s echo, hitting again for 85%. The dark takes a tenth of your health for it. Needs more than a third of your health.',
  usable: k => hpOf(k) > 0.35,
  glow: k => (k.g.gloom || 0) < 40 && k.charges(k.abById('strike')) >= 2,
  effect(k) {
    k.selfDamage(0.1, { ab: this });
    k.gain('gloom', GLOOM.MAX, GLOOM.MAX); k.g.actAt = k.now;
    k.buff('shade', GLOOM.ECHO_DUR, {}, 2, 2);
    k.fx('last-rite', { g: 100 });
  },
  fx: { type: 'aura', color: '#c85a8a', r: 36, dur: 2.5 },
} };

// the spec row VII of the Lifebinder (Canopy, in Wild Growth's slot)
TALENT_ABILITIES.grovekeeper_canopy = { cls: 'grovekeeper', ab: {
  id: 'canopy', replaces: 'growth', icon: 'growth', name: 'Canopy', type: 'ogcd', target: 'self', cd: 60, anim: 'big', talent: true,
  desc: 'Everyone under your Lifebind takes 25% less damage for 8s and is healed for {h:150}. The whole party heals {h:90} every 3s for 15s, and your heals are 25% stronger for 15s.',
  glow: k => k.g.rejuvs.length >= 2,
  effect(k) {
    k.buff('growth', 15); k.hot('party', 90, 5, 3, { ab: this, id: 'growth' });
    for (const r of k.g.rejuvs) { k.mitigate(r.t, 0.25, 8, { ab: this }); k.heal(r.t, 150, { ab: this }); }
    if (k.perk('grovekeeper_w3')) k.gain('bloom', 25);
    groveGrowth(k, this);
  },
  fx: { type: 'cone', color: '#7ee06a', r: 170, span: 6.28 },
} };
if (typeof module !== 'undefined') Object.assign(module.exports, { clericBrand, clericForesight, clericAbsolve, groveEvergreen, gloomStrikeCost, gloomPallCost });

// Eclipse of the Vigil (T): the vessel pours out. Gloom (spends: 0.13% each, and 25% for a Hollow you stand up from) and
// the hits you take fill it. Instant: a blow on the target worth 800 plus 8 for every Gloom, a barrier on the whole party
// of 200 plus 3 for every Gloom, and the party takes 10% less damage for 6s. It empties the vessel (Last Light keeps half).
ULTIMATES.gloomsworn = {
  id: 'eclipsevigil', name: 'Eclipse of the Vigil', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big', icon: 'eclipsevigil',
  lock: 1.0, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5, spend: { gloom: GLOOM.ULT_SPEND } },
  botOk: k => (k.g.gloom || 0) >= 40,
  desc: `The vigil breaks. Every point of Gloom you hold is poured out: a blow on your target for {d:${GLOOM.ULT_HIT}} plus {d:${GLOOM.ULT_HIT_G}} for every Gloom (full: {d:${GLOOM.ULT_HIT + 100 * GLOOM.ULT_HIT_G}}), ` +
    `a barrier of {s:${GLOOM.ULT_SH}} plus {s:${GLOOM.ULT_SH_G}} for every Gloom on the whole party for 8s, and the party takes ${GLOOM.ULT_MIT * 100}% less damage for 6s. ` +
    'It empties the vessel. You take 30% less damage and can\'t be knocked back while you pour it out.' +
    `<div class="it-ult"><span><u>Charge:</u> ${GLOOM.ULT_SPEND * 100}% for every Gloom you spend, ${GLOOM.ULT_SAVE}% for a Hollow you stand up from, more for every hit you take, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
  effect(k) {
    const ab = this, g = Math.floor(k.g.gloom || 0);
    k.g.gloom = k.talent('gloomsworn_dusk') ? Math.floor(g / 2) : 0;   // (set, not spent: spending feeds the charge just spent)
    k.damage(GLOOM.ULT_HIT + GLOOM.ULT_HIT_G * g, { ab, threat: 2 });
    k.shield('party', GLOOM.ULT_SH + GLOOM.ULT_SH_G * g, 8, { ab });
    k.mitigate('party', GLOOM.ULT_MIT, 6, { ab });
    k.fx('gloom-eclipse', { g });
  },
};

if (typeof module !== 'undefined') Object.assign(module.exports, { GLOOM, gloomGain, gloomEcho, gloomSend, gloomHollowNote, gloomStrikeReady, gloomDur, gloomGraceLen, gloomHollow, gloomAb });

// ======================================================================= THRESHER (damage, class 19): afflict, weigh, reap
// Four AFFLICTIONS (k.g.aff: id -> { w, until, next } or null) lie on the boss: Mark (Slash; a bleed), Drain (Cleave; ticks mend
// you), Bind (Gloam Blink and the Wisp; a pulse) and Thread (Hook; no ticks, the heaviest pop). Each lasts THRESH.DUR s and has a
// WEIGHT of 1 to THRESH.MAXW: laying one that is already up adds a Weight and starts its time again. Every Weight ticks. They do not
// age or change colour: when to pop them is the fight's question, not a clock's. POPPING one pays its damage times its Weight and
// sets off its own effect: Mark is the big hit, Drain mends you, Bind fetters the boss (the party takes less for a few seconds),
// Thread snaps and gives a Hook charge back. Reap pops every one; Sever (the move keeps the id `gather`) rips out only the one
// you laid last (k.g.last), harder. Spirit Wisp is a timed, cosmetic companion (like the Ranger's falcon: a damage over time and
// a buff, nothing synced). Reaper's Gate (T) is a window: you vanish, every Slash is a Gate Strike that lays one affliction in
// turn at full Weight, and the fifth pops all four.
const THRESH = {
  IDS: ['mark', 'drain', 'bind', 'thread'],
  NAMES: { mark: 'Mark', drain: 'Drain', bind: 'Bind', thread: 'Thread' },
  DUR: 15, MAXW: 3, TICK: 3,            // an affliction lasts DUR s from its last laying, up to MAXW Weight, and ticks every TICK s
  TICKP: { mark: 20, drain: 12, bind: 18, thread: 0 }, DRAIN_HEAL: 0.005,   // per Weight, a tick (Drain's mend: of your health)
  SWING: 1.2,                           // Backswing: the next hit pressed this soon after the last recovery
  SLASH: 200, CLEAVE: 270, BACK: 90,
  HOOK: 150, BLINK: 140, BLINK_MIT: 0.5,
  BASE: 80, PAY: { mark: 130, drain: 90, bind: 90, thread: 140 },   // Reap: a base cut, and what each affliction pays for every Weight
  FULL: 1.3, DRAIN_POP: 0.02, FETTER: 0.1, FETTER_DUR: 4,                       // Drain's pop mends 2% a Weight; Bind's: the party takes 10% less for 4s
  REAP_CD: 8, SEVER_CD: 12, SEVER: 1.5,
  KNELL: 150, U_KNELL: 3,               // the Full Toll: a Reap that pops every affliction at full Weight rings a knell, a last blow, and the Ultimate charges more
  WISP_DUR: 15, WISP_HIT: 60, WISP_EVERY: 2.5, WISP_CD: 45, SAC: 320, SAC_BUFF: 0.1, SAC_DUR: 8,
  U_REAP: 1.6, U_W: 0.5,                // Ultimate charge: a Reap, and every Weight it pops (a Sever: its Weight)
  GATE: { DUR: 8, GCD: 1.0, STRIKE: 190, END: 260, MULT: 0.4 },   // (the fifth: every affliction as 3 Weight at full, MULT of that)
  ARC: 2.1, ARC_R: 95, ARC_SHARE: 0.6,   // the scythe's wide arc (about 120 degrees, a little past melee): other enemies in it take 60% of the cut
};
const thMaxW = k => k.def.maxW || THRESH.MAXW, thDur = k => k.def.affDur || THRESH.DUR;
const thAvail = k => THRESH.IDS.filter(id => !(k.def.noAff && k.def.noAff.indexOf(id) >= 0));
// an affliction's Weight (0: not up)
const thW = (k, id) => { const a = k.g.aff[id]; return a && a.w > 0 ? a.w : 0; };
const thCount = k => THRESH.IDS.filter(id => thW(k, id) > 0).length;
const thFull = k => THRESH.IDS.filter(id => thW(k, id) >= thMaxW(k)).length;
const thTotal = k => THRESH.IDS.reduce((s, id) => s + thW(k, id), 0);
const thAb = (k, id) => k.abilities.find(a => k.baseId(a) === id) || k.baseAbilities.find(a => k.baseId(a) === id);
// lay an affliction: a new one at `n` Weight, or `n` more on one that is up (to the most), its time started again.
// o.full: at full Weight at once (Hourglass, the Gate's strikes); o.force: lays even what the spec never lays (the Gate)
function thApply(k, id, n = 1, o = {}) {
  if (!o.force && k.def.noAff && k.def.noAff.indexOf(id) >= 0) return;
  const max = o.max || thMaxW(k), a = k.g.aff[id], full = o.full || k.now < (k.g.fullUntil || 0);   // (Hourglass, Wraith spec row VII)
  const anchored = id === 'thread' && k.talent('thresher_anchor');   // (Anchored Thread, Wraith spec row VI: it never runs out)
  const until = anchored ? Infinity : k.now + thDur(k);
  if (!a) k.g.aff[id] = { w: full ? max : Math.min(max, n), until, next: k.now + THRESH.TICK };
  else { if (a.w >= max) k.wasted(id + ' weight'); a.w = full ? max : Math.min(max, a.w + n); a.until = until; }
  k.g.last = id;
  k.fxGain(1);   // (item effects: an affliction laid builds the gauge)
  k.fx('afflict', { id, w: k.g.aff[id].w, max, dur: anchored ? 0 : thDur(k) });
}
// every affliction that is up gains a Weight (Nightfall)
function thDeepen(k) { for (const id of THRESH.IDS) if (thW(k, id)) thApply(k, id, 1); }
// one affliction popped: its damage (PAY a Weight), and its own effect unless o.quiet (Cull)
function thPop(k, ab, id, w, mult, o = {}) {
  const full = !o.plain && (o.full || w >= thMaxW(k)), pay = THRESH.PAY[id] * (id === 'mark' && k.perk('thresher_a2') ? 1.2 : 1) * (full ? THRESH.FULL : 1);   // (at full Weight it pays 50% more)
  k.damage(pay * w * mult, { ab, extra: true });
  if (!o.quiet) {
    if (id === 'drain') k.healRaw(k.talent('thresher_tithe') ? 'lowest' : 'self', k.env.maxHp() * THRESH.DRAIN_POP * w, { ab });
    else if (id === 'bind') { k.mitigate('party', THRESH.FETTER, THRESH.FETTER_DUR, { ab }); k.fx('th-fetter'); }
    else if (id === 'thread') { const h = thAb(k, 'hook'); if (h) k.refundCharge(h.id); }
  }
  k.fx('afflict-pop', { id, w, full });
}
// what a Reap (or the Gate's fifth strike, or Cull) pays: a base hit, then each affliction in turn. ws: id -> Weight
function thPayout(k, ab, ws, o) {
  let n = 0, total = 0;
  k.damage(o.base * (o.baseMult || o.mult), { ab });
  for (const id of THRESH.IDS) {
    const w = ws[id];
    if (!w) continue;
    n++; total += w;
    k.after(o.gap * n, () => thPop(k, ab, id, w, o.mult, o));
  }
  return { n, total };
}
// the wide arc: every OTHER enemy (the boss or an add) in the arc in front of you takes `share` of the cut, through the
// ordinary damage path (so threat, add HP and kill credit work). Needs a host with env.enemiesNear; without one (the dummy) nothing.
function thArc(k, ab, pot, o = {}) {
  if (!k.env.enemiesNear || !k.env.pos) return 0;
  const me = k.env.pos(), e = k.env.target({ target: 'enemy', range: MELEE });
  if (!me || !e || typeof e !== 'object') return 0;
  const dir = Math.atan2(e.y - me.y, e.x - me.x), same = c => (c.id === 'dummy' || e.id === 'dummy' ? c.x === e.x && c.y === e.y : c.id === e.id);
  let n = 0;
  for (const c of k.env.enemiesNear(THRESH.ARC_R) || []) {
    if (same(c)) continue;
    const dx = c.x - me.x, dy = c.y - me.y, d = Math.hypot(dx, dy), r = c.r || 0;
    if (d - r > THRESH.ARC_R) continue;
    let da = Math.abs(Math.atan2(dy, dx) - dir); if (da > Math.PI) da = 2 * Math.PI - da;
    if (d > 0.001 && da - Math.asin(Math.min(1, r / d)) > THRESH.ARC / 2) continue;
    k.damage(pot * (o.share || THRESH.ARC_SHARE), { ab, extra: true, tgt: c.id !== 'dummy' ? c.id : undefined });
    k.fx('reap-add', { id: c.id, x: Math.round(c.x), y: Math.round(c.y) });
    n++;
  }
  return n;
}
const thWeights = k => { const ws = {}; for (const id of THRESH.IDS) ws[id] = thW(k, id); return ws; };
// Reap, and what the talents add to it
function thReap(k, ab) {
  const ws = thWeights(k), m = k.def.reapMult || 1, max = thMaxW(k), vul = bossNow(k);
  if (k.talent('thresher_wound') && vul && vul.vuln > 0) for (const id of THRESH.IDS) if (ws[id]) ws[id] = max;   // (Open Wound, Grim spec row VII: every affliction pays at full Weight)
  const full = thAvail(k).every(id => ws[id] >= max);
  thArc(k, ab, THRESH.BASE * m);
  const r = thPayout(k, ab, ws, { base: THRESH.BASE, mult: m, gap: 0.14 });
  for (const id of THRESH.IDS) if (ws[id]) k.g.aff[id] = null;
  if (k.talent('thresher_second') && full && ws.mark) k.g.aff.mark = { w: 1, until: k.now + thDur(k), next: k.now + THRESH.TICK };   // (Unpaid Debt: after a Full Toll the Mark stays, light)
  if (k.talent('thresher_joined') && k.has('wisp')) { k.after(0.3, () => k.damage(140, { ab, extra: true })); k.fx('wisp-strike'); }
  if (k.talent('thresher_gleaning') && r.n >= 3) k.buff('gleaning', 10);
  if (k.talent('thresher_fleet')) k.buff('fleet', 5);   // (Fleet Hour, Wraith spec row VI: see the Wraith's haste in specs.js)
  if (k.talent('thresher_lasthour') && r.n >= 4) k.partyBuff('dmg', 0.04, 6, { ab });   // (Last Hour, Wraith spec row VII)
  k.ultGain(THRESH.U_REAP + THRESH.U_W * r.total);
  // the Full Toll: every affliction popped at full Weight, and the hour strikes (the Gate's release bloom and toll)
  if (full) { k.after(0.14 * 5 + 0.1, () => { k.damage(THRESH.KNELL * m, { ab, extra: true }); k.fx('gate-release', { n: 4 }); }); k.ultGain(THRESH.U_KNELL); k.stats.knells = (k.stats.knells || 0) + 1; }
  k.g.swingBy = k.now + k.gcdLen + THRESH.SWING;
  k.fx('reap', { n: r.n, w: r.total, full });
  return r;
}
// Sever: the affliction laid last, popped alone and harder (Patient Blade, Grim spec row VI: at full Weight it pops twice)
function thSever(k, ab) {
  const id = k.g.last, w = thW(k, id);
  if (!w) return;
  const twice = k.talent('thresher_patient') && w >= thMaxW(k);
  thPop(k, ab, id, w, THRESH.SEVER * (k.def.reapMult || 1));
  if (twice) k.after(0.22, () => thPop(k, ab, id, w, THRESH.SEVER * (k.def.reapMult || 1)));
  k.g.aff[id] = null;
  if (k.talent('thresher_hush')) k.shield('self', 100, 6, { ab });
  k.ultGain(THRESH.U_W * w);
  k.fx('th-sever', { id, w, twice });
}
// Slash and Cleave (the Gate's strikes are theirs, below)
function thSlash(k, ab) {
  const g = k.g, step = k.now < g.comboUntil ? g.step : 0, back = k.now <= g.swingBy, pot = step ? THRESH.CLEAVE : THRESH.SLASH;
  k.damage(pot, { ab });
  if (step) thArc(k, ab, pot);   // (Cleave is the wide arc)
  if (step === 0) { if (k.def.sower) thApply(k, 'drain'); thApply(k, 'mark'); }
  else { if (k.def.sower) thApply(k, 'bind'); thApply(k, 'drain'); }
  g.step = (step + 1) % 2; g.comboUntil = k.now + 15;
  if (k.consume('gleaning')) { k.after(0.2, () => k.damage(pot * 0.35, { ab, extra: true })); k.fx('backswing'); }
  if (back) {
    k.after(0.28, () => k.damage(THRESH.BACK * (k.perk('thresher_w1') ? 1.5 : 1), { ab, extra: true }));
    if (k.talent('thresher_drag')) for (const id of THRESH.IDS) { const a = g.aff[id]; if (a && isFinite(a.until)) a.until = k.now + thDur(k); }   // (Dragging Edge: their time starts again)
    k.fx('backswing');
  }
  g.swingBy = k.now + k.gcdLen + THRESH.SWING;
}
function thSacrifice(k, ab) {
  k.dots.delete('wisp'); k.clear('wisp'); k.g.wispOn = false;
  k.damage(THRESH.SAC, { ab });
  if (k.g.last && thW(k, k.g.last)) thApply(k, k.g.last, 1);
  k.buff('wispgift', THRESH.SAC_DUR);
  k.cd[ab.id] = Math.max(k.now, (k.g.wispAt || 0) + THRESH.WISP_CD);
  k.fx('wisp-sacrifice');
}

KITS.thresher = {
  potMult: 0.83,   // balance knob (tools/simulate.js)
  auto: { kind: 'slash', potency: 40, range: MELEE },
  gauge: { kind: 'harvest', key: 'aff', max: 100, label: 'Toll', w: 150 },
  init: () => ({ aff: {}, last: null, step: 0, comboUntil: 0, swingBy: 0, gate: 0, wispAt: -99, wispOn: false, castSeen: false }),
  dmgMod: k => (k.has('wispgift') ? THRESH.SAC_BUFF : 0),
  onDamage(k, amount, crit, opts) {
    if (opts.dot && opts.ab && k.baseId(opts.ab) === 'wisp') { k.fx('wisp-strike'); if (!thW(k, 'bind')) thApply(k, 'bind'); }
  },
  tick(k) {
    const g = k.g, now = k.now, far = { target: 'enemy', range: 2000 };
    for (const id of THRESH.IDS) {
      const a = g.aff[id];
      if (!a) continue;
      // run out: gone (Grave Interest: it pays half its pop as it goes, with no effect)
      if (now >= a.until) {
        g.aff[id] = null;
        if (k.talent('thresher_compost') && k.env.target(far)) { k.damage(THRESH.PAY[id] * a.w * 0.5 * (k.def.reapMult || 1), { ab: thAb(k, 'reap'), extra: true }); k.fx('afflict-pop', { id, w: a.w, fade: true }); }
        else k.fx('afflict-fade', { id });
        continue;
      }
      if (now < a.next) continue;
      // every Weight ticks (Deepening Toll, Grim spec row VI: at full Weight twice as fast)
      a.next = now + (k.talent('thresher_deepening') && a.w >= thMaxW(k) ? THRESH.TICK / 2 : THRESH.TICK);
      if (!THRESH.TICKP[id] || !k.env.target(far)) continue;
      k.damage(THRESH.TICKP[id] * a.w, { ab: thAb(k, id === 'mark' || id === 'drain' ? 'slash' : 'blink'), dot: true });
      if (id === 'drain') { k.healRaw(k.talent('thresher_tithe') ? 'lowest' : 'self', k.env.maxHp() * THRESH.DRAIN_HEAL * a.w, { ab: thAb(k, 'slash') }); k.fx('drain-tick'); }
      if (id === 'bind') k.fx('bind-pulse');
    }
    // (Omen of the Toll: a boss cast beginning brings Sever back)
    onBossCast(k, () => { if (k.talent('thresher_omen')) { const s = thAb(k, 'gather'); if (s && s.id === 'gather') k.cd[s.id] = now; k.fx('omen'); } });
    // the Wisp ran out on its own: with Sacrifice held the cooldown only starts now (counted from the summon)
    if (g.wispOn && !k.has('wisp')) { g.wispOn = false; const w = thAb(k, 'wisp'); if (w) k.cd[w.id] = Math.max(k.cd[w.id] || 0, g.wispAt + THRESH.WISP_CD); }
  },
  signature: 'The Toll',
  floor: 'Press Q to cut, and E when it glows: that is the reaping. Keep Q going, and weave the others when they are ready.',
  ceiling: [
    'Slash lays a Mark and Cleave a Drain; Hook lays a Thread and Gloam Blink binds. Laying one that is already up adds a Weight (up to 3) and starts its 15s again. Every Weight ticks, and every Weight pays when it is popped.',
    'Each pops its own way: Mark is the big hit, Drain mends you, Bind fetters the boss (the party takes 10% less for 4s) and Thread snaps and gives a Hook charge back. Pop a Bind into a raidwide or a tankbuster.',
    'Reap pops them all. One at full Weight pays 50% more, and all of them at full Weight is the Full Toll: a knell, one more heavy blow and more Ultimate charge. Popping early buys the effects when you need them; waiting buys Weight.',
    'Sever rips out only the affliction you laid last, at half again its worth. Blink then Sever is a Bind popped on the moment; Hook then Sever, a Thread and a Hook charge back.',
    'Backswing: press the next Q within 1.2s of your recovery and the scythe comes back round for a second hit. Every Reap you make keeps it going.',
    'Reaper\'s Gate: every strike lays the next affliction at full Weight, and the fifth pops all four. Open it with the party\'s burst, or with a raidwide coming for the Bind.',
  ],
  abilities: [
    {
      id: 'slash', name: 'Slash', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'Two-hit combo on one button: Slash ({d:200}) > Cleave ({d:270}), a wide arc. Slash lays a Mark on the boss (a bleed, {d:20} every 3s for every Weight) and Cleave a Drain ({d:12} every 3s for every Weight, and it mends you). Press the next hit within 1.2s of your recovery and a Backswing follows for {d:90}.',
      label: k => ['Slash', 'Cleave'][k.now < k.g.comboUntil ? k.g.step : 0],
      fxStep: k => (k.now < k.g.comboUntil ? k.g.step : 0),
      effect(k) { thSlash(k, this); },
      fx: { type: 'slash', color: '#9be06a', r: 64, span: 2.3 },
    },
    {
      id: 'hook', name: 'Hook', type: 'ogcd', target: 'enemy', range: 320, charges: 2, cd: 12, lock: 0.4, anim: 'attack',
      desc: 'Throw the chain: if you are not at the boss, pull yourself in, and cut for {d:150}. It lays a Thread on the boss: it does not tick, but it pays the most when popped, and snapping it gives a Hook charge back. Two charges.',
      glow: k => !thW(k, 'thread'),
      effect(k) {
        if (!k.env.target({ target: 'enemy', range: MELEE })) k.teleport('dash', { ab: this, d: 150 });
        k.damage(THRESH.HOOK * (k.perk('thresher_w2') ? 1.3 : 1), { ab: this });
        if (k.def.sower) thApply(k, 'bind');
        const tw = thW(k, 'thread');
        if (k.talent('thresher_weight') && tw >= thMaxW(k)) { thPop(k, this, 'thread', tw, k.def.reapMult || 1); k.g.aff.thread = null; }   // (Dread Weight: a full Thread snaps on the spot)
        else thApply(k, 'thread');   // (last: it is the one a Sever takes)
        k.g.swingBy = Math.max(k.g.swingBy, k.now + 3);
      },
      fx: { type: 'slash', color: '#7fc86a', r: 44, span: 1.1 },
    },
    {
      id: 'reap', name: 'Reap', type: 'gcd', target: 'enemy', range: MELEE, cd: k => k.def.reapCd || THRESH.REAP_CD, anim: 'bash',
      desc: 'Pop every affliction on the boss. A cut for {d:80}, then each pays for every Weight it has: Mark {d:130}, Drain {d:90} (and mends you for 2% of your health), Bind {d:90} (and the party takes 10% less damage for 4s) and Thread {d:140} (and a Hook charge comes back). One at full Weight pays 50% more. Every one at full Weight is the Full Toll: the hour strikes for {d:320} more. Glows with three up. Needs an affliction up.',
      usable: k => thCount(k) > 0,
      glow: k => thCount(k) >= Math.min(3, thAvail(k).length),
      effect(k) { thReap(k, this); },
      fx: { type: 'slash', color: '#e8c84a', r: 76, span: 3.0 },
    },
    {
      id: 'gather', icon: 'sever', name: 'Sever', type: 'ogcd', target: 'enemy', range: MELEE, cd: THRESH.SEVER_CD, lock: 0.5, anim: 'attack',
      label: k => 'Sever' + (k.g.last && thW(k, k.g.last) ? ' ' + THRESH.NAMES[k.g.last] : ''),
      desc: 'Rip out the affliction you laid last, alone: it pops at half again its worth, with its own effect (Mark the big hit, Drain a mend, Bind the party\'s 10% less for 4s, Thread a Hook charge). The others stay.',
      usable: k => !!(k.g.last && thW(k, k.g.last)),
      glow: k => !!(k.g.last && thW(k, k.g.last) >= thMaxW(k)),
      effect(k) { thSever(k, this); },
      fx: { type: 'slash', color: '#d8c84a', r: 50, span: 1.4 },
    },
    {
      id: 'blink', name: 'Gloam Blink', type: 'ogcd', target: 'enemy', range: 320, charges: 2, cd: 15, lock: 0.4, anim: 'attack',
      desc: 'Cut through the dark to the boss for {d:140} and bind it: a Bind pulses for {d:18} every 3s for every Weight. The cut keeps your Backswing going, and you take 50% less damage for 1s. Two charges.',
      glow: k => !thW(k, 'bind'),
      effect(k) {
        if (!k.env.target({ target: 'enemy', range: MELEE })) k.teleport('dash', { ab: this, d: 150 });
        k.damage(THRESH.BLINK, { ab: this });
        if (k.def.blinkDeepen) { const l = k.g.last; if (l && thW(k, l)) thApply(k, l, 1); }   // (a Grim binds nothing: its Blink deepens the one laid last)
        else thApply(k, 'bind');
        k.mitigate('self', k.perk('thresher_a4') ? 0.7 : THRESH.BLINK_MIT, 1, { ab: this });
        if (k.talent('thresher_vanish')) k.mitigate('self', 1, 1.5, { ab: this, kind: 'invuln' });
        k.g.swingBy = Math.max(k.g.swingBy, k.now + 3.5);
      },
      fx: { type: 'slash', color: '#5a8a6a', r: 40, span: 1.1 },
    },
    {
      id: 'wisp', name: 'Spirit Wisp', type: 'ogcd', target: 'self', cd: THRESH.WISP_CD, lock: 0.5, anim: 'cast',
      label: k => (k.has('wisp') && k.talent('thresher_sacrifice') ? 'Sacrifice' : 'Spirit Wisp'),
      usable: k => !k.has('wisp') || k.talent('thresher_sacrifice'),
      desc: 'A wisp rises beside you for 15s and harries the boss, striking for {d:60} every 2.5s and binding it if nothing else has.',
      glow: k => k.has('wisp') && k.talent('thresher_sacrifice') && thCount(k) >= 3,
      effect(k) {
        if (k.has('wisp')) { thSacrifice(k, this); return; }
        const wd = k.perk('thresher_w3') ? 20 : THRESH.WISP_DUR;
        k.buff('wisp', wd); k.g.wispAt = k.now; k.g.wispOn = true;
        k.dot('wisp', THRESH.WISP_HIT, wd, THRESH.WISP_EVERY, { ab: this });
        if (k.talent('thresher_sacrifice')) k.cd[this.id] = k.now + 1;
        k.fx('wisp-summon');
      },
      fx: { type: 'aura', color: '#a8f0d0', r: 34, dur: 2 },
    },
  ],
};

// talents that grant a new move (TALENT_ABILITIES, the shared system above)
TALENT_ABILITIES.thresher_sowing = { cls: 'thresher', ab: {
  id: 'sowing', replaces: 'gather', icon: 'sowing', name: 'Shroud', type: 'ogcd', target: 'enemy', range: 420, cd: 30, lock: 0.6, anim: 'cast',
  desc: 'Cast the shroud: every affliction lands on the boss at once, a Weight more on any already up, and a cut for {d:70}.',
  glow: k => thCount(k) <= 1,
  effect(k) {
    k.damage(70, { ab: this });
    for (const id of THRESH.IDS) thApply(k, id);
    k.fx('sowing');
  },
  fx: { type: 'zone', color: '#7fc86a', r: 90, range: 0, dur: 1.5 },
} };
TALENT_ABILITIES.thresher_cull = { cls: 'thresher', ab: {
  id: 'cull', replaces: 'wisp', icon: 'cull', name: 'Cull', type: 'ogcd', target: 'enemy', range: MELEE, cd: k => (k.perk('thresher_w3') ? 35 : 40), lock: 0.6, anim: 'big',   // (Spirit Wisp's enhancement: it comes back 5s sooner)
  desc: 'Take what is owed now: every affliction on the boss pays out for its Weight (3 at the most), and none is spent (none of their effects go off). A cut for {d:80} first, then for every Weight Mark {d:130}, Drain {d:90}, Bind {d:90} and Thread {d:140}.',
  usable: k => thCount(k) > 0,
  glow: k => thTotal(k) >= 6,
  effect(k) {
    const ws = thWeights(k); for (const id of THRESH.IDS) ws[id] = Math.min(ws[id], THRESH.MAXW);
    const r = thPayout(k, this, ws, { base: THRESH.BASE, mult: 1, gap: 0.14, quiet: true, plain: true });
    k.ultGain(THRESH.U_REAP + THRESH.U_W * r.total);
    k.fx('cull', { n: r.n });
  },
  fx: { type: 'slash', color: '#c8e84a', r: 70, span: 2.6 },
} };
// the spec rows VII (SPEC_TALENTS in talents.js): the Wraith's Hourglass and the Grim's Nightfall, each in the place of Gloam Blink
// (a cut through the dark like the Blink's, with no Bind laid; one turns the glass so what you lay lands full, the other deepens it all)
const thTimeMove = (id, name, cd, then, desc, glow) => ({
  id, replaces: 'blink', icon: id, name, type: 'ogcd', target: 'enemy', range: 320, cd, lock: 0.4, anim: 'attack', talent: true, desc, glow,
  effect(k) {
    if (!k.env.target({ target: 'enemy', range: MELEE })) k.teleport('dash', { ab: this, d: 150 });
    k.damage(THRESH.BLINK, { ab: this });
    then(k);
    k.mitigate('self', k.perk('thresher_a4') ? 0.7 : THRESH.BLINK_MIT, 1, { ab: this });
    k.g.swingBy = Math.max(k.g.swingBy, k.now + 3.5);
  },
  fx: { type: 'slash', color: '#5a8a6a', r: 40, span: 1.1 },
});
talentMoves('thresher', {
  thresher_hourglass: thTimeMove('hourglass', 'Hourglass', 28, k => { k.g.fullUntil = k.now + 5; },
    'Cut through the dark to the boss for {d:140} and turn the glass: for 5s every affliction you lay lands at full Weight. You take 50% less damage for 1s.',
    k => k.cdRemaining(thAb(k, 'reap')) < 4),
  thresher_nightfall: thTimeMove('nightfall', 'Nightfall', 25, k => thDeepen(k),
    'Cut through the dark to the boss for {d:140}, and every affliction on it gains a Weight. You take 50% less damage for 1s.',
    k => thCount(k) >= 2 && thFull(k) < thCount(k)),
});

// Reaper's Gate (T). Fills from Reaps (more for every Weight they pop). A window of 8s: you vanish (nothing can touch you), and
// every Slash is a Gate Strike on a 1s global cooldown that lays the next affliction in turn (Mark, Drain, Bind, Thread) at full
// Weight (3 at the most); the fifth strike pops all four as 3 Weight at full, a heavy burst with every effect, and the cycle starts again.
const GATE = THRESH.GATE, GATE_ORDER = ['mark', 'drain', 'bind', 'thread'];
const thGateW = k => Math.min(thMaxW(k), THRESH.MAXW);
ULTIMATES.thresher = {
  id: 'reapersgate', name: 'Reaper\'s Gate', slot: 7, type: 'ogcd', ult: true, mode: 'window', target: 'enemy', range: 380, anim: 'big', icon: 'reapersgate',
  lock: 0.6, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5 },
  botOk: k => !!k.env.target({ target: 'enemy', range: 220 }),
  desc: `Step through the Gate and out of the world for ${GATE.DUR}s: nothing can touch you, and you strike from behind your target. Slash becomes <b>Gate Strike</b> on a ${GATE.GCD}s global cooldown: each one cuts for {d:${GATE.STRIKE}} and lays the next affliction in turn (Mark, Drain, Bind, Thread) at full Weight. ` +
    `The fifth strike pops all four as if at full Weight, with all their effects: {d:${GATE.END}}, then Mark {d:${Math.round(THRESH.PAY.mark * 3 * THRESH.FULL * GATE.MULT)}}, Drain {d:${Math.round(THRESH.PAY.drain * 3 * THRESH.FULL * GATE.MULT)}}, Bind {d:${Math.round(THRESH.PAY.bind * 3 * THRESH.FULL * GATE.MULT)}} and Thread {d:${Math.round(THRESH.PAY.thread * 3 * THRESH.FULL * GATE.MULT)}}. Your afflictions are spent (Open Gate keeps them). ` +
    'You take 30% less damage and can\'t be knocked back while you step through.' +
    `<div class="it-ult"><span><u>Charge:</u> ${THRESH.U_REAP}% for every Reap and ${THRESH.U_W} more for every Weight it pops (a Sever: its Weight), and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
  effect(k) {
    k.mitigate('self', 1, GATE.DUR, { ab: this, kind: 'invuln' });
    k.teleport('behind', { ab: this });
    k.buff('gate', GATE.DUR);
    k.g.gate = 0;
    k.fx('gate-open');
  },
  window: {
    dur: GATE.DUR,
    over: {
      slash: {
        fxId: 'gatestrike', name: 'Gate Strike', recastGcd: GATE.GCD, anim: 'attack',
        label: k => (k.g.gate >= 4 ? 'The Fifth' : 'Gate Strike'),
        desc: `Reaper's Gate: a strike for {d:${GATE.STRIKE}} that lays the next affliction in turn (Mark, Drain, Bind, Thread) at full Weight. The fifth pops all four.`,
        glow: k => k.g.gate >= 4,
        effect(k) {
          const n = k.g.gate | 0;
          if (n < 4) {
            k.damage(GATE.STRIKE, { ab: this });
            thApply(k, GATE_ORDER[n], 1, { full: true, force: true, max: thGateW(k) });
            k.g.gate = n + 1;
            k.fx('gate-strike', { n });
            return;
          }
          const ws = {}; for (const id of THRESH.IDS) ws[id] = thW(k, id) ? THRESH.MAXW : 0;
          const r = thPayout(k, this, ws, { base: GATE.END, baseMult: 1, mult: GATE.MULT, gap: 0.12, full: true });
          if (!k.talent('thresher_opengate')) for (const id of THRESH.IDS) k.g.aff[id] = null;
          k.g.gate = 0;
          k.fx('gate-release', { n: r.n });
        },
      },
    },
    onEnd(k) { k.clear('gate'); k.g.gate = 0; k.fx('gate-close'); },
  },
};

if (typeof module !== 'undefined') Object.assign(module.exports, { thArc, THRESH, thW, thCount, thFull, thTotal, thMaxW, thAvail, thApply, thDeepen, thPop, thPayout, thReap, thSever, thSlash });

// ======================================================================= Tidecaller (healer, class 20; docs/plans/2026-10-new-classes-3.md §2)
// The Tide: a water line (k.g.tide, 0-100) on its own clock. It rises from Low to High over TIDE.RISE s (k.g.tphase 'rise'),
// holds at the top (the crest: 'hold', until k.g.holdEnd), then ebbs back to the floor over TIDE.EBB s ('ebb'), and loops.
// Spending lowers the water and lets it ebb from there (a Sip barely lowers it, a Surge drains it to the floor); Salt
// Spray and Current push it up. The cycle is readable and never random.
// Gauge data for the HUD (gauges.js kind 'tide'): k.g.tide, k.g.tphase, k.g.holdEnd, k.g.floodUntil (Spring Flood),
// k.g.wallUntil (Breakwater: no ebb), k.g.spring (Neap and Spring: this crest is a long one), k.g.mark ({ t, until }:
// the Riptide Mark), tideNextCrest(k) (seconds to the next crest, for Tide Table's tick mark), k.g.deepUntil (Undertow).
// fx events (k.fx, for ability-vfx.js): crest {spring}, slack (the floor), riptide {to}, riptidePop {to}, sip {low, free},
// swell, surge {f, full, flood}, undertow {f}, current {dir: 'up'|'turn'|'hold'}, breakwater, ebbShield, flood, floodEnd,
// leviathan, maelstrom {f}, tidalBore {f}, deepBell, brine {f}.
const TIDE = { RISE: 12, HOLD: 2, EBB: 6, SIP: 10, LOW: 35, HIGH: 90, SPRAY: 4, CURRENT: 25, FLOOD: 6, WALL: 8 };
const tideF = k => Math.max(0, Math.min(1, (k.g.tide || 0) / 100));
const tideFlood = k => k.now < (k.g.floodUntil || 0);
const tideFull = k => tideFlood(k) || k.g.tphase === 'hold';
const tideHigh = k => tideFull(k) || (k.g.tide || 0) >= TIDE.HIGH;
const tideLow = k => (k.g.tide || 0) < TIDE.LOW;
const tideWall = k => k.now < (k.g.wallUntil || 0);
const tideMarked = k => !!k.g.mark && k.now < k.g.mark.until;
// how long the crest holds: 2s (a Spring Tide 3s), Deep Water +1s; Neap and Spring alternates short and long crests
function tideHoldLen(k) {
  let h = (k.def.tideHold || TIDE.HOLD) + (k.talent('tidecaller_deep') ? 1 : 0);
  if (k.talent('tidecaller_neap')) h += k.g.spring ? 1.5 : -0.75;
  return h;
}
// seconds until the next crest (Tide Table's tick mark on the gauge)
function tideNextCrest(k) {
  const t = k.g.tide || 0;
  if (k.g.tphase === 'rise') return (100 - t) / 100 * TIDE.RISE;
  if (k.g.tphase === 'hold') return Math.max(0, k.g.holdEnd - k.now) + TIDE.EBB + TIDE.RISE;
  return t / 100 * TIDE.EBB + TIDE.RISE;
}
function tideCrest(k) {
  k.g.crests = (k.g.crests || 0) + 1;
  k.g.spring = !!k.talent('tidecaller_neap') && k.g.crests % 2 === 0;
  k.g.tide = 100; k.g.tphase = 'hold'; k.g.holdEnd = k.now + tideHoldLen(k);
  if (tideMarked(k)) tidePop(k);
  k.fx('crest', { spring: k.g.spring ? 1 : 0 });
}
// the Riptide Mark pops at the crest
function tidePop(k) {
  const m = k.g.mark, ab = abBase(k, 'riptide');
  k.g.mark = null;
  const pop = 200;
  k.heal(m.t, pop, { ab });
  if (m.t2 != null) k.heal(m.t2, pop, { ab });   // (Grip of the Deep)
  if (k.perk('tidecaller_w2')) k.after(1.5, () => { k.heal(m.t, pop / 2, { ab }); if (m.t2 != null) k.heal(m.t2, pop / 2, { ab }); });   // (item: the pop rings twice, the second at half)
  k.ultGain(2);
  k.fx('riptidePop', { to: typeof m.t === 'number' ? m.t : null });
}
function tideGain(k, n) {
  if (tideFlood(k)) return;
  k.g.tide = Math.min(100, (k.g.tide || 0) + n);
  if (k.g.tphase === 'rise' && k.g.tide >= 100) tideCrest(k);
}
function tideSpend(k, n) {
  if (tideFlood(k)) return;
  k.g.tide = Math.max(0, (k.g.tide || 0) - n);
  if (k.g.tphase === 'hold') k.g.tphase = 'ebb';
  if (k.g.tide <= 0) { k.g.tide = 0; k.g.tphase = 'rise'; }
}
function tideTick(k) {
  const dt = Math.max(0, Math.min(0.5, k.now - (k.g.tAt ?? k.now))); k.g.tAt = k.now;
  // Spring Flood: high water, held; when it ends the crest lets go (Leviathan: its last surge strikes the boss)
  if (k.g.floodUntil) {
    if (tideFlood(k)) { k.g.tide = 100; k.g.tphase = 'hold'; k.g.holdEnd = k.now; return; }
    k.g.floodUntil = 0; k.g.holdEnd = k.now;
    if (k.talent('tidecaller_leviathan') && k.g.floodSurges) { k.damage(600, { ab: k.ult }); k.fx('leviathan'); }
    k.fx('floodEnd');
  }
  // Breakwater ends (Ebb Shield: the water it held drains into a shield on the party)
  if (k.g.wallUntil && k.now >= k.g.wallUntil) {
    k.g.wallUntil = 0;
    if (k.talent('tidecaller_ebbshield') && (k.g.tide || 0) > 10) {
      k.shield('party', 30 + 90 * tideF(k), 8, { ab: abBase(k, 'breakwater') });
      k.g.tide = 0; k.g.tphase = 'rise';
      k.fx('ebbShield');
    }
  }
  // Moon Pull: every cast the boss begins pulls the tide a little higher
  if (k.talent('tidecaller_moon')) onBossCast(k, () => { tideGain(k, 10); k.fx('moonPull'); });
  const wall = tideWall(k);
  if (k.g.tphase === 'rise') {
    k.g.tide = (k.g.tide || 0) + 100 / TIDE.RISE * dt;
    if (k.g.tide >= 100) tideCrest(k);
  } else if (k.g.tphase === 'hold') {
    if (k.now >= k.g.holdEnd && !wall) k.g.tphase = 'ebb';
  } else if (!wall) {
    k.g.tide -= 100 / TIDE.EBB * dt;
    if (k.g.tide <= 0) {
      k.g.tide = 0; k.g.tphase = 'rise';
      if (k.talent('tidecaller_lowwater')) k.g.lowWater = true;
      k.fx('slack');
    }
  }
  // Still Water (Undertow): while you stand still, the Deep Shield seeps to whoever is hurt most
  if (k.def.stillWater && k.now < (k.g.deepUntil || 0) && !(k.env.moving && k.env.moving()) && k.now >= (k.g.stillAt || 0)) {
    k.g.stillAt = k.now + 2;
    k.heal('lowest', 30, { ab: abBase(k, 'surge') });
  }
}
// the heal a Surge (or a Tidal Bore) carries at this height of water
function tideSurgePot(k, lo, hi) {
  const full = tideFull(k);
  let pot = lo + (hi - lo) * tideF(k);
  if (k.def.kingTide && full) pot *= 1.3;   // (King Tide, the Spring Tide's passive: 10% for each ally it reaches)
  if (k.talent('tidecaller_neap') && full && k.g.spring) pot *= 1.2;
  return pot;
}
// after a Surge-like wave: the Spring Tide's shield, Brine Lash, the flood's own blow, the water spent, the charge
function tideWave(k, ab, f, full) {
  if (k.def.surgeShield && (full || (k.talent('tidecaller_overflow') && f >= 0.6))) k.shield('party', k.talent('tidecaller_overflow') ? 120 : 100, 8, { ab });
  if (k.talent('tidecaller_brine')) { k.damage(15 + 40 * f, { ab }); k.fx('brine', { f: +f.toFixed(2) }); }
  if (tideFlood(k)) { k.damage(250, { ab }); k.g.floodSurges = (k.g.floodSurges || 0) + 1; }
  else {
    k.ultGain(2 + 6 * f + (k.perk('tidecaller_w3') ? 1 + 1.5 * f : 0));   // (item tidecaller_w3: a little more Spring Flood charge from every wave)
    tideSpend(k, 100);
    if (k.perk('tidecaller_w1') && full) { k.g.tide = 15; k.g.tphase = 'rise'; }   // (item tidecaller_w1: a crest wave leaves a sliver of tide)
  }
}
function tideSurge(k, ab) {
  const f = tideF(k), full = tideFull(k), flood = tideFlood(k);
  k.heal('party', tideSurgePot(k, 120, 480), { ab });
  k.fx('surge', { f: +f.toFixed(2), full: full ? 1 : 0, flood: flood ? 1 : 0 });
  tideWave(k, ab, f, full);
}
const tideSurgeCast = k => (tideFlood(k) || (k.talent('tidecaller_sealegs') && tideWall(k)) || (k.talent('tidecaller_roguewave') && k.g.tphase === 'hold') ? 0 : 1.5);
// Undertow (the Undertow spec's R): the water pulls the party's hurt down into your Deep Shield and gives it back over 8s
function tideUndertow(k, ab) {
  const f = tideF(k), full = tideFull(k);
  const pot = tideSurgePot(k, 120, 480);
  k.hot('party', pot / 4, 4, 2, { ab, id: 'undertow' });
  k.g.deepAmt = k.shield('self', 150 + 250 * f, 8, { ab, tag: 'deep' });
  k.g.deepUntil = k.now + 8;
  if (k.talent('tidecaller_bell')) { const was = k.g.deepUntil; k.after(8, () => { if (k.g.deepUntil === was) { k.heal('party', 60 + 60 * f, { ab }); k.fx('deepBell'); } }); }
  k.fx('undertow', { f: +f.toFixed(2) });
  tideWave(k, ab, f, full);
}
function tideSip(k, ab, t, pot, cost) {
  const free = !!k.g.lowWater, low = tideLow(k);
  k.g.lowWater = false;
  k.heal(t, pot * (low && cost > 0 ? 1.3 : 1) * (free ? 1.5 : 1), { ab });
  if (cost > 0 && !free) tideSpend(k, cost); else if (cost < 0) tideGain(k, -cost);
  if (k.talent('tidecaller_foam') && tideMarked(k) && k.g.mark.t === t) k.env.emit(Object.assign({ type: 'heal', target: 'lowest', not: t, ab }, { amount: k.healAmount(60, { ab }).amount }));
  if (k.talent('tidecaller_seawall') && tideWall(k)) k.shield(t, 80, 6, { ab });
  k.ultGain(1.5);
  k.fx(cost < 0 ? 'swell' : 'sip', { low: low ? 1 : 0, free: free ? 1 : 0, to: typeof t === 'number' ? t : null });
}
function tideCurrent(k, ab) {
  let dir;
  if (k.g.tphase === 'rise') { dir = 'up'; tideGain(k, k.talent('tidecaller_table') ? 100 : TIDE.CURRENT); }
  else if (k.g.tphase === 'hold') { dir = 'hold'; k.g.holdEnd += 2; }
  else { dir = 'turn'; k.g.tphase = 'rise'; tideGain(k, 15); }
  if (k.perk('tidecaller_a4')) k.heal('party', 80, { ab });   // (item: Current washes a little health over the party)
  if (k.talent('tidecaller_tidewalk')) kitMove(k, 'dash', { d: 130 });
  // Slack Water (Undertow): the Deep Shield's drain stops for 4s: it stands 4s longer and gives the party a little more
  if (k.talent('tidecaller_slack') && k.now < (k.g.deepUntil || 0)) {
    k.g.deepUntil += 4; k.shield('self', 100, k.g.deepUntil - k.now, { ab, tag: 'deep' }); k.hot('party', 40, 2, 2, { ab, id: 'slack' });
  }
  // Twin Currents: the first press leaves a second ready (cooldown counts from the second)
  if (k.talent('tidecaller_twin')) {
    if (!k.g.twinOut) { k.g.twinOut = true; k.cd[ab.id] = k.now; }
    else k.g.twinOut = false;
  }
  k.fx('current', { dir });
}
const tideBossCasting = k => bossCasting(k);
const tideSurgeGlow = k => tideFlood(k) || (tideHigh(k) && tideBossCasting(k));
function tideSipGlow(k, ab) {
  if (k.g.lowWater) return true;
  if (!tideLow(k) || !k.env.allyHp) return false;
  const t = k.env.target(ab), f = t != null && t !== true ? k.env.allyHp(t) : null;
  return f != null && f < 0.7;
}

KITS.tidecaller = {
  potMult: 1.157, // balance knob (tools/simulate.js)
  auto: { kind: 'spark', potency: 25, range: RANGED },
  gauge: { kind: 'tide', key: 'tide', max: 100, label: 'Tide' },
  init: () => ({ tide: 30, tphase: 'rise', holdEnd: 0, mark: null, floodUntil: 0, wallUntil: 0, crests: 0 }),
  tick: k => tideTick(k),
  signature: 'The Tide',
  floor: 'Press Q to attack. W heals one ally, best at low water. When the tide is high, R heals the whole party. E marks an ally; F before big hits.',
  ceiling: [
    'The tide rises on its own, holds at the crest, then ebbs. Sip at low water (it is stronger there) and save Surge for high water: a crest Surge heals four times what a low one does.',
    'Line the crest up with the boss: Current pushes a rising tide up, turns an ebbing one back, and holds a crest 2s longer. Bend the cycle so high water meets each raidwide.',
    'A Riptide Mark pops at the next crest. Mark the tank just before a crest that lands on a tankbuster.',
    'Breakwater stops the ebb as well as cutting the damage: put it down at the crest and the water stays high for the whole raidwide.',
    'Spring Flood holds high water for 6s and every Surge in it is free and instant. Save it for the fight\'s heaviest stretch.',
  ],
  abilities: [
    {
      id: 'spray', name: 'Salt Spray', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
      desc: 'Instant: a lash of salt water at the boss for {d:280}. Nudges the tide up a little.',
      effect(k) {
        const pressure = k.talent('tidecaller_pressure') && k.now < (k.g.deepUntil || 0);
        k.damage(280 * (pressure ? 1.07 : 1), { ab: this });
        if (k.talent('tidecaller_spindrift') && tideHigh(k)) k.after(0.3, () => { k.damage(60, { ab: this }); k.fx('spindrift'); });
        tideGain(k, TIDE.SPRAY);
        k.ultGain(0.3);
      },
      fx: { type: 'projectile', color: '#bff3ea', range: RANGED, speed: 850 },
    },
    {
      id: 'sip', name: 'Sip', type: 'gcd', target: 'ally', anim: 'cast',
      desc: 'Instant: heals one ally for {h:210}. Costs a small slice of the tide; at low water it heals 30% more.',
      glow(k) { return tideSipGlow(k, this); },
      effect(k, t) { tideSip(k, this, t, 210, TIDE.SIP); },
      fx: { type: 'ring', color: '#d7f2ee', r: 36, onTarget: true },
    },
    {
      id: 'riptide', name: 'Riptide Mark', type: 'gcd', target: 'ally', cd: 12, anim: 'cast',
      desc: 'Mark an ally: they heal {h:80} every 2s for 12s, and when the tide next crests the mark pops for {h:200}.',
      glow: k => !tideMarked(k),
      effect(k, t) {
        k.hot(t, 80, 6, 2, { ab: this, id: 'riptide' });
        k.g.mark = { t, until: k.now + 20 };
        if (k.talent('tidecaller_grip')) { k.g.mark.t2 = 'lowest'; k.hot('lowest', 80, 6, 2, { ab: this, id: 'riptide2' }); }
        if (k.talent('tidecaller_kelp')) k.mitigate(t, 0.05, 12, { ab: this });
        if (k.def.markDeep) k.shield(t, 120, 10, { ab: this, tag: 'deep' });   // (Undertow: the Deep takes the next hit)
        k.fx('riptide', { to: typeof t === 'number' ? t : null });
      },
      fx: { type: 'ring', color: '#5fd0c0', r: 44, onTarget: true },
    },
    {
      id: 'surge', name: 'Surge', type: 'gcd', target: 'self', cast: k => tideSurgeCast(k), anim: 'big',
      desc: '1.5s cast: spend all the tide in a wave that heals the whole party, from {h:120} at low water up to {h:480} at high water.',
      glow: k => tideSurgeGlow(k),
      effect(k) { tideSurge(k, this); },
      fx: { type: 'zone', style: 'wave', color: '#bff3ea', r: 180, range: 0, dur: 1.2 },
    },
    {
      id: 'current', name: 'Current', type: 'ogcd', target: 'self', cd: 20, anim: 'cast',
      desc: 'Bend the tide. Rising, it climbs a quarter at once. Ebbing, it turns and rises again. At the crest, the crest holds 2s longer.',
      glow: k => tideBossCasting(k) && k.g.tphase === 'ebb' && !tideFlood(k),
      effect(k) { tideCurrent(k, this); },
      fx: { type: 'aura', color: '#5fd0c0', r: 34, dur: 0.8 },
    },
    {
      id: 'breakwater', name: 'Breakwater', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
      desc: 'A wall of water: the party takes 15% less damage for 8s, and while it stands the tide does not ebb.',
      glow: k => tideBossCasting(k) && tideHigh(k),
      effect(k) {
        const dur = TIDE.WALL + (k.perk('tidecaller_a2') ? 2 : 0);
        k.mitigate('party', 0.15, dur, { ab: this });
        k.g.wallUntil = k.now + dur;
        k.fx('breakwater');
      },
      fx: { type: 'zone', style: 'wave', color: '#5fd0c0', r: 160, range: 0, dur: 2 },
    },
  ],
};

// Spring Flood (T, instant): fills from the healing you do (Sip 1.5, a Surge 2-8 by the water, a Riptide pop 2, Salt Spray 0.3)
ULTIMATES.tidecaller = {
  id: 'springflood', name: 'Spring Flood', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'self', anim: 'big',
  lock: 0.9, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5 },
  desc: 'Call the spring flood: the whole party heals {h:300}, and the tide goes to high water and stays there for 6s. Every Surge in that time is instant, costs nothing and strikes the boss for {d:250}. ' +
    'You take 30% less damage and can\'t be knocked back while you call it.' +
    healUltCharge('1.5% for every Sip, 2% for every Surge and up to 8% at high water, 2% for every Riptide Mark that pops, a little for every Salt Spray,'),
  effect(k) {
    const ab = this;
    k.g.floodUntil = k.now + TIDE.FLOOD; k.g.floodSurges = 0; k.g.tide = 100; k.g.tphase = 'hold';
    k.fx('flood');
    k.after(HEAL_ULT_LAND, () => k.heal('party', 300, { ab }));
  },
};

// talent moves (rows III and V)
talentMoves('tidecaller', {
  tidecaller_maelstrom: {
    id: 'maelstrom', replaces: 'riptide', icon: 'maelstrom', name: 'Maelstrom', type: 'gcd', target: 'self', cd: 15, anim: 'cast', talent: true,
    desc: 'A whirlpool opens on the floor where you stand for 9s: allies in it heal every 1.5s, from {h:40} at low water up to {h:110} at high water (the height when you cast it).',
    glow: k => tideHigh(k),
    effect(k) {
      const f = tideF(k);
      k.env.emit({ type: 'splash', target: 'self', r: 0, pr: 130, ticks: 6, interval: 1.5, pa: k.healAmount(40 + 70 * f, { ab: this }).amount, ab: this });
      k.fx('maelstrom', { f: +f.toFixed(2) });
    },
    fx: { type: 'zone', style: 'wave', color: '#5fd0c0', r: 130, range: 0, dur: 9 },
  },
  tidecaller_bore: {
    id: 'bore', replaces: 'surge', icon: 'bore', name: 'Tidal Bore', type: 'gcd', target: 'self', anim: 'big', talent: true,
    desc: 'Instant: spend all the tide in a wave rolled out ahead of you. It heals the party from {h:90} at low water up to {h:360} at high water, and breaks on the boss for {d:30} up to {d:100}.',
    glow: k => tideSurgeGlow(k),
    effect(k) {
      const f = tideF(k), full = tideFull(k);
      k.heal('party', tideSurgePot(k, 90, 360), { ab: this });
      k.damage(30 + 70 * f, { ab: this });
      k.fx('tidalBore', { f: +f.toFixed(2), aim: k.env.aim ? k.env.aim() : null });
      tideWave(k, this, f, full);
    },
    fx: { type: 'cone', color: '#bff3ea', r: 220, span: 0.7 },
  },
});

if (typeof module !== 'undefined') Object.assign(module.exports, { TIDE, tideF, tideFlood, tideFull, tideHigh, tideLow, tideWall, tideMarked, tideNextCrest, tideGain, tideSpend, tideSurge, tideUndertow, tideSip, tideSurgePot, tideSurgeGlow, tideSurgeCast, tideCurrent });

// ===================================================================================================================
// LANTERNKEEPER (healer, class 21; docs/plans/2026-10-new-classes-3.md): lanterns on the floor and on allies.
// The kit owns its lanterns (where they stand, their wicks, how long they last) and reports them every tick
// (k.env.lamps, the way a Marionettist reports its Dolls); the host heals with them (fight.js, the LANTERNS block):
// once a second everyone alive inside a glow heals that lantern's pulse, and it answers bursts (Flare, Relight). The
// owner draws its own lanterns from the kit, everyone else from the host's 'lamps' list (lanterns.js).
// A lantern: { id, kind, x, y, on (an ally id it hangs on, 'c' the party's centre, or null), ox, oy (offset from
//   what it hangs on), born, end, wick (1 full .. 0 stub), r (glow radius), pot (heal potency a second at full wick),
//   dash (Pathfinder: dropped by a dash), passed (Trailing Sparks: walked back through) }.
// kind: 'floor' (Set Lantern), 'beacon' (Great Beacon), 'hand' (Hand Lantern), 'small' (Lamplighter's Stride),
//   'float' (Lantern Festival), 'eternal' (Eternal Lamp). Report codes (k): floor 0, beacon 1, hand 2, small 3, float 4, eternal 5.
// Gauge data (gauges.js kind 'embers', not drawn yet): k.g.emb (Embers), lkEmbMax(k), k.g.embAt (seconds into the
//   next Ember, of LANTERN.EMB_EVERY), k.g.trims (0-2: every third Trim gives one), k.g.lan (the lanterns: wick for the
//   flames), k.g.lightUntil (Lighthouse), k.g.strideUntil (Lamplighter's Stride).
// fx events (k.fx, for ability-vfx.js; every name carries the class prefix lk-): place {x, y, kind}, hang {to}, flare {n, all, twin}, carry {fx, fy, x, y}, relight {n},
//   trim {x, y} (the lantern it relit), ember (an Ember gained), snuff {x, y} (a lantern gone out), lighthouse, lighthouseEnd,
//   stride, drop {x, y} (a small light), trail {dx, dy}, festival, wisp, eternal {x, y}, sparks {x, y}, pillar {x, y}.
// ===================================================================================================================
const LANTERN = { R: 110, LIFE: 18, BURN: 12, HAND_R: 90, HAND_LIFE: 12, MAX: 3, EMB_MAX: 4, EMB_EVERY: 5, TRIM: 0.25, REACH: 200,
  BEACON_R: 150, CALL_REACH: 420, CALL_POT: 150, WAY_STEP: 80, WAY_CD: 1.5, WAY_POT: 110, BEACON_MAX: 2, SMALL_R: 75, SMALL_LIFE: 6, SMALL_MAX: 6, STRIDE: 10, STEP: 60, FLOAT_R: 70, FLOAT_LIFE: 12, LIGHT: 8,
  FLARE: 340 };   // (Flare's burst for each glow: big enough to lift a party out of a Hard raidwide)
const LK_KIND = { floor: 0, beacon: 1, hand: 2, small: 3, float: 4, eternal: 5 };
const lkEmbMax = k => (k.talent('lanternkeeper_hoard') ? 5 : LANTERN.EMB_MAX);
const lkLight = k => k.now < (k.g.lightUntil || 0);
const lkPos = k => (k.env.pos ? k.env.pos() : { x: 0, y: 0 });
const lkFloor = l => l.on == null;   // (on the floor: not hung on anyone)
// the lanterns Carry the Flame can pick up: on the floor, not a Great Beacon or the Eternal Lamp
const lkMovable = l => (l.kind === 'floor' || l.kind === 'small');
// ...and for a Beacon, only its Great Beacons (Call the Beacon)
const lkCarryable = k => (k.def.steadyGlow ? (l => l.kind === 'beacon') : lkMovable);
const lkStub = l => l.wick <= 0.02;
function lkEmber(k, n = 1) {
  const was = k.g.emb;
  k.g.emb = Math.min(lkEmbMax(k), k.g.emb + n);
  if (k.g.emb > was) k.fx('lk-ember');
}
// what one pulse of a lantern heals (no crit roll on a pulse: its crit chance is folded in as an average)
function lkPulse(k, l) {
  const gear = k.gear(), crit = ENGINE.BASE_CRIT + (gear.crit || 0) + k.fxMod('crit');
  let pot = l.pot * (0.5 + 0.5 * Math.max(0, Math.min(1, l.wick)));
  if (lkLight(k)) pot *= 2;
  return Math.round(pot * ENGINE.POT_SCALE * (1 + (k.def.healMod ? k.def.healMod(k, {}) : 0)) * (1 + (gear.power || 0)) * (1 + crit * (ENGINE.CRIT_MULT - 1)) * (1 + k.fxMod('heal')));
}
function lkAdd(k, kind, o) {
  const p = lkPos(k);
  const l = Object.assign({ id: k.g.lid++, kind, x: p.x, y: p.y, on: null, ox: 0, oy: 0, born: k.now, end: k.now + LANTERN.LIFE, wick: 1, r: LANTERN.R, pot: 55 }, o);
  // the cap on each kind: placing one more snuffs the oldest
  const cap = kind === 'floor' ? LANTERN.MAX : kind === 'beacon' ? LANTERN.BEACON_MAX : kind === 'small' ? LANTERN.SMALL_MAX : kind === 'hand' ? 1 : kind === 'float' ? 5 : 1;
  const same = k.g.lan.filter(o2 => o2.kind === kind);
  while (same.length >= cap) lkSnuff(k, same.shift(), true);
  k.g.lan.push(l);
  return l;
}
// a lantern goes out (burned through its time, or snuffed by a newer one); Ember Fall: one out at its stub gives an Ember back
function lkSnuff(k, l, early) {
  const i = k.g.lan.indexOf(l);
  if (i < 0) return;
  k.g.lan.splice(i, 1);
  if (k.talent('lanternkeeper_emberfall')) {
    if (lkStub(l) && (l.kind === 'floor' || l.kind === 'beacon')) lkEmber(k);
    else if (l.kind === 'small' && !early && (k.g.outs = (k.g.outs || 0) + 1) % 4 === 0) lkEmber(k);
  }
  if (!early || lkFloor(l)) k.fx('lk-snuff', { x: Math.round(l.x), y: Math.round(l.y) });
}
// the nearest lantern on the floor to a point (filter: which ones count)
function lkNearest(k, p, filter = lkFloor, not) {
  let best = null, bd = Infinity;
  for (const l of k.g.lan) { if (l === not || !filter(l)) continue; const d = Math.hypot(l.x - p.x, l.y - p.y); if (d < bd) { bd = d; best = l; } }
  return best ? { l: best, d: bd } : null;
}
function lkTick(k) {
  const g = k.g, dt = Math.max(0, Math.min(0.5, k.now - (g.tAt ?? k.now))); g.tAt = k.now;
  // Embers: one every 5s
  if (g.emb < lkEmbMax(k)) { g.embAt += dt; if (g.embAt >= LANTERN.EMB_EVERY) { g.embAt = 0; lkEmber(k); } } else g.embAt = 0;
  // where you walk: Lamplighter's Stride drops a small light every 60 units; Road Worn and Pilgrim's Pace watch how long you have moved or stood
  const p = lkPos(k), step = g.last ? Math.hypot(p.x - g.last.x, p.y - g.last.y) : 0;
  g.last = { x: p.x, y: p.y };
  const moving = step > 0.5 && step < 300 * Math.max(dt, 0.05);
  if (moving) { g.moveFor += dt; g.stillFor = 0; } else { g.stillFor += dt; g.moveFor = 0; }
  if (k.now < (g.strideUntil || 0) && moving) {
    g.strideDist += step;
    while (g.strideDist >= LANTERN.STEP) { g.strideDist -= LANTERN.STEP; lkSmall(k); }
  }
  // Road Worn (Wayfarer): every few steps a light lands on the most hurt ally in reach (the host picks them, fight.js lampEvent)
  if (k.def.roadWorn && moving) {
    g.wayDist = (g.wayDist || 0) + step;
    if (g.wayDist >= LANTERN.WAY_STEP && k.now >= (g.wayAt || 0)) {
      g.wayDist = 0; g.wayAt = k.now + LANTERN.WAY_CD;
      k.env.emit({ type: 'lamp', op: 'waylight', amount: k.healAmount(LANTERN.WAY_POT, { ab: abBase(k, 'set') }).amount });
    }
  }
  if (k.talent('lanternkeeper_pilgrim') && g.moveFor >= 5 && !g.pilgrim) { g.pilgrim = true; k.fx('lk-pilgrim'); }
  // the wicks burn down (a Great Beacon never below half, the Eternal Lamp never; Lighthouse holds them all)
  const light = lkLight(k);
  const smalls = g.lan.filter(l => l.kind === 'small');
  for (const l of [...g.lan]) {
    if (l.kind !== 'eternal' && !light) {
      l.wick -= dt / LANTERN.BURN;
      if (l.kind === 'beacon') l.wick = Math.max(0.5, l.wick);
      // Road Worn: stand still for 3s and your newest light dims
      if (l.kind === 'small' && g.stillFor >= 3 && l === smalls[smalls.length - 1]) l.wick -= dt * 0.4;
      l.wick = Math.max(0, l.wick);
    }
    if (l.kind === 'float') { const a = k.now * 0.6 + l.ph; l.ox = Math.cos(a) * 60; l.oy = Math.sin(a) * 40; }
    // Trailing Sparks: walk back through a small light of yours and it flares up and stings the boss
    if (l.kind === 'small' && k.talent('lanternkeeper_sparks') && !l.passed && k.now - l.born > 1.5 && Math.hypot(l.x - p.x, l.y - p.y) < 30) {
      l.passed = true; l.wick = 1; k.damage(60, { ab: abBase(k, 'set') }); k.fx('lk-sparks', { x: Math.round(l.x), y: Math.round(l.y) });
    }
    if (l.kind !== 'eternal' && k.now >= l.end) lkSnuff(k, l);
  }
  // Pillar of Flame: a Great Beacon with the boss in its glow scorches it every 3s (one Beacon at a time)
  if (k.talent('lanternkeeper_pillar') && k.now >= (g.pillarAt || 0)) {
    const e = k.env.target({ target: 'enemy', range: 2000 });
    const b = e && typeof e === 'object' ? g.lan.find(l => l.kind === 'beacon' && Math.hypot(l.x - e.x, l.y - e.y) <= l.r + 40) : null;
    if (b) { g.pillarAt = k.now + 3; k.damage(15, { ab: abBase(k, 'set') }); k.fx('lk-pillar', { x: Math.round(b.x), y: Math.round(b.y) }); }
  }
  lkShare(k);
}
// tell the world where the lanterns are (the host heals with them; other players draw them)
function lkShare(k) {
  if (!k.env.lamps) return;
  const st = !!k.def.steadyGlow, lean = k.talent('lanternkeeper_keeper'), sig = k.talent('lanternkeeper_signal');
  const hh = k.talent('lanternkeeper_hearth') ? lkPulse(k, { pot: 90, wick: 1 }) / (lkLight(k) ? 2 : 1) : 0;
  const crumbs = k.talent('lanternkeeper_breadcrumbs') ? k.g.lan.filter(l => l.kind === 'small').slice(-3) : [];
  k.env.lamps(k.g.lan.map(l => {
    let h = lkPulse(k, l);
    if (crumbs.includes(l)) h = Math.round(h * 1.3);
    if (l.dash) h *= 2;
    const o = { id: l.id, x: Math.round(l.x), y: Math.round(l.y), r: Math.round(l.r), h, w: Math.round(Math.max(0, Math.min(1, l.wick)) * 100), k: LK_KIND[l.kind] };
    if (l.on != null) { o.on = l.on; o.ox = Math.round(l.ox); o.oy = Math.round(l.oy); }
    if (l.kind === 'beacon') { if (st) o.st = 1; if (lean) o.ln = 1; if (sig) o.sg = 1; if (hh) o.hh = Math.round(hh); }
    if (lkLight(k)) o.all = 1;
    return o;
  }));
}
// Lamplighter's Stride: a small light where you stand
function lkSmall(k, o = {}) {
  const l = lkAdd(k, 'small', Object.assign({ r: LANTERN.SMALL_R, pot: 25, end: k.now + LANTERN.SMALL_LIFE }, o));
  if (k.talent('lanternkeeper_breadcrumbs')) for (const s of k.g.lan.filter(x => x.kind === 'small').slice(-3)) s.end = Math.max(s.end, s.born + LANTERN.SMALL_LIFE + 4);
  k.fx('lk-drop', { x: Math.round(l.x), y: Math.round(l.y) });
  return l;
}
// a burst from the host: every lantern (or one, lid) heals everyone in its glow
function lkBurst(k, amount, o = {}) { k.env.emit(Object.assign({ type: 'lamp', op: 'burst', amount }, o)); }
function lkFlare(k, ab, half) {
  const g = k.g;
  // Shadow Catch: the lanterns on the floor are pulled 40 toward you first
  if (k.talent('lanternkeeper_shadow') && !half) {
    const p = lkPos(k);
    for (const l of g.lan) if (lkMovable(l) || l.kind === 'beacon') { const d = Math.hypot(p.x - l.x, p.y - l.y); if (d > 1) { const m = Math.min(40, d); l.x += (p.x - l.x) / d * m; l.y += (p.y - l.y) / d * m; } }
  }
  let pot = LANTERN.FLARE * (half ? 0.5 : 1);
  if (g.pilgrim && !half) { pot *= 1.3; g.pilgrim = false; }
  const ward = k.talent('lanternkeeper_flareshield'), sh = lkShieldAmt(k, half ? 50 : ward ? 240 : 100);   // (a Flare shields everyone it reaches; Flare Shield makes it far stronger)
  lkBurst(k, k.healAmount(pot, { ab }).amount, { all: lkLight(k) ? 1 : 0, sh });
  if (ward && !half) { k.partyBuff('haste', 0.1, 6, { ab }); k.hot('party', 30, 3, 2, { ab, id: 'flareward' }); }
  k.itemHook('heal');
  if (!half) for (const l of g.lan) if (l.kind !== 'eternal' && !lkLight(k)) l.wick = Math.max(l.kind === 'beacon' ? 0.5 : 0, l.wick - 1 / 3);
  k.fx('lk-flare', { n: g.lan.length, all: lkLight(k) ? 1 : 0, twin: half ? 1 : 0 });
}
const lkShieldAmt = (k, pot) => Math.round(pot * ENGINE.POT_SCALE * (1 + (k.def.healMod ? k.def.healMod(k, {}) : 0)) * (1 + (k.gear().power || 0)) * (1 + k.fxMod('heal')));
function lkCarryReach(k) { const r = k.def.steadyGlow ? LANTERN.CALL_REACH : LANTERN.REACH; return k.talent('lanternkeeper_longtoss') ? r * 2 : r; }

KITS.lanternkeeper = {
  potMult: 1.09, // balance knob (tools/simulate.js)
  auto: { kind: 'spark', potency: 25, range: RANGED },
  gauge: { kind: 'embers', key: 'emb', max: 4, label: 'Embers' },
  init: () => ({ emb: 3, embAt: 0, trims: 0, lan: [], lid: 1, lightUntil: 0, inGlow: 0, strideUntil: 0, strideDist: 0, moveFor: 0, stillFor: 0, pilgrim: false, last: null }),
  tick: k => lkTick(k),
  // the host's word on the lanterns (fight.js lampTick, twice a second): how many allies stood in a glow (n: ally-pulses)
  onNotify(k, type, d) {
    if (type === 'relit' && d.w && d.to != null) { k.fx('lk-hang', { to: d.to }); return; }
    if (type !== 'lit') return;
    k.g.inGlow = d.c || 0;
    k.ultGain((d.n || 0) * 0.08);
  },
  healMod: k => (k.def.roadWorn && k.g.moveFor > 0 ? 0.1 : 0),   // (Road Worn: you heal 10% more while moving)
  signature: 'Lanterns',
  floor: 'Press Q to attack. W sets a lantern at your feet: everyone near it heals. E hangs one on an ally. R makes every lantern burst.',
  ceiling: [
    'Lanterns heal everyone in their glow once a second. Set them where the party is going to stand, not where it stood.',
    'Each lantern\'s wick burns down, and a stub heals at half. Trim the Wick tops up the nearest one; Relight fills them all.',
    'Flare bursts every lantern at once, and glows that overlap stack: stand the party where two glows meet before a raidwide.',
    'Carry the Flame picks up the nearest lantern and sets it at your feet. Walk to where the party is going, then carry the light after you.',
    'Lighthouse lights the whole room for 8s: everyone counts as inside a glow, every lantern heals double, and Flare is ready again.',
  ],
  abilities: [
    {
      id: 'trim', name: 'Trim the Wick', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
      desc: 'Instant: a bolt of ember at the boss for {d:270}. Tops up the wick of your nearest lantern a little, and every third bolt gives an Ember.',
      effect(k) {
        k.damage(270, { ab: this });
        const p = lkPos(k), n = lkNearest(k, p, l => l.kind !== 'eternal');
        if (n) {
          n.l.wick = Math.min(1, n.l.wick + LANTERN.TRIM);
          k.fx('lk-trim', { x: Math.round(n.l.x), y: Math.round(n.l.y) });
          if (k.talent('lanternkeeper_moth')) lkBurst(k, k.healAmount(30, { ab: this }).amount, { lid: n.l.id });
          if (k.talent('lanternkeeper_spark')) { const m = lkNearest(k, p, l => l.kind !== 'eternal', n.l); if (m) m.l.wick = Math.min(1, m.l.wick + LANTERN.TRIM); }
        }
        k.g.trims = (k.g.trims + 1) % 3;
        if (!k.g.trims) lkEmber(k);
      },
      fx: { type: 'projectile', color: '#ffc46b', range: RANGED, speed: 800 },
    },
    {
      id: 'set', name: 'Set Lantern', type: 'gcd', target: 'self', anim: 'cast',
      usable: k => k.g.emb >= 1,
      desc: 'Instant, 1 Ember: set a lantern at your feet. For 18s everyone in its glow heals {h:55} every second (half that once the wick is a stub). Three at most: a fourth snuffs the oldest.',
      glow: k => k.g.emb >= 1 && !lkNearest(k, lkPos(k), l => l.kind === 'floor' && Math.hypot(l.x - lkPos(k).x, l.y - lkPos(k).y) < 120),
      effect(k) {
        k.g.emb -= 1;
        const l = lkAdd(k, 'floor', {});
        if (k.perk('lanternkeeper_w2')) l.end += 1;
        lkPlaced(k, this, l);
      },
      fx: { type: 'ring', color: '#ffc46b', r: 40, onTarget: false },
    },
    {
      id: 'hand', name: 'Hand Lantern', type: 'gcd', target: 'ally', cd: 8, anim: 'cast',
      usable: k => k.g.emb >= 1,
      desc: 'Instant, 1 Ember: hang a lantern on an ally for 12s. It goes where they go and heals them and anyone close for {h:80} every second.',
      glow: k => k.g.emb >= 1 && !k.g.lan.some(l => l.kind === 'hand'),
      effect(k, t) {
        k.g.emb -= 1;
        lkAdd(k, 'hand', { on: typeof t === 'number' ? t : 'self', r: LANTERN.HAND_R, pot: 80, end: k.now + LANTERN.HAND_LIFE + (k.perk('lanternkeeper_w2') ? 3 : 0), ox: 0, oy: -6 });
        if (k.talent('lanternkeeper_ward')) k.mitigate(t, 0.1, LANTERN.HAND_LIFE, { ab: this });
        k.itemHook('heal');
        k.fx('lk-hang', { to: typeof t === 'number' ? t : null });
      },
      fx: { type: 'ring', color: '#ffd89a', r: 36, onTarget: true },
    },
    {
      id: 'flare', name: 'Flare', type: 'ogcd', target: 'self', cd: 12, anim: 'big',
      desc: 'Every lantern bursts at once: everyone in a glow heals {h:340}, once for every glow they stand in, and takes a shield of {s:100}. Each wick burns down a stage.',
      glow: k => { const b = bossNow(k); return !!(b && b.wide) && k.g.lan.length > 0 && (k.g.inGlow >= 2 || lkLight(k)); },
      effect(k) {
        lkFlare(k, this, false);
        if (k.talent('lanternkeeper_twin')) k.after(1, () => lkFlare(k, this, true));
      },
      fx: { type: 'aura', color: '#ffc46b', r: 40, dur: 0.6 },
    },
    {
      id: 'carry', name: 'Carry the Flame', type: 'ogcd', target: 'self', cd: 15, charges: 2, anim: 'cast',
      desc: 'Pick up your nearest lantern (within a short throw) and set it down at your feet. It keeps its wick. Great Beacons stay put.',
      usable: k => !!lkNearest(k, lkPos(k), l => lkCarryable(k)(l) && Math.hypot(l.x - lkPos(k).x, l.y - lkPos(k).y) <= lkCarryReach(k)),
      glow: k => { const n = lkNearest(k, lkPos(k), lkCarryable(k)); return !!n && n.d > 130 && n.d <= lkCarryReach(k); },
      effect(k) {
        const p = lkPos(k), n = lkNearest(k, p, l => lkCarryable(k)(l) && Math.hypot(l.x - p.x, l.y - p.y) <= lkCarryReach(k));
        if (!n) return;
        const fx = n.l.x, fy = n.l.y;
        n.l.x = p.x; n.l.y = p.y;
        if (k.perk('lanternkeeper_a2')) n.l.wick = Math.min(1, n.l.wick + 1 / 3);
        k.fx('lk-carry', { fx: Math.round(fx), fy: Math.round(fy), x: Math.round(p.x), y: Math.round(p.y) });
        if (k.def.steadyGlow) { const id = n.l.id, amt = k.healAmount(LANTERN.CALL_POT, { ab: this }).amount; k.after(0.15, () => lkBurst(k, amt, { lid: id })); }   // (Call the Beacon: the glow pulses once the host has seen it land)
        if (k.talent('lanternkeeper_nightwalk')) kitMove(k, 'dash', { d: 90, ab: this });
      },
      fx: { type: 'aura', color: '#ffd89a', r: 30, dur: 0.4 },
    },
    {
      id: 'relight', name: 'Relight', type: 'gcd', target: 'self', anim: 'big',
      usable: k => k.g.emb >= 2,
      desc: 'Instant, 2 Embers: every lantern\'s wick back to full, and the most hurt ally heals {h:320} (one standing in a glow first).',
      glow: k => k.g.emb >= 2 && k.g.lan.filter(l => l.kind !== 'hand' && lkStub(l)).length >= 2,
      effect(k) {
        k.g.emb -= 2;
        for (const l of k.g.lan) l.wick = 1;
        k.env.emit({ type: 'lamp', op: 'relight', amount: k.healAmount(320, { ab: this }).amount, last: k.talent('lanternkeeper_lastlight') ? 1 : 0, ab: this });
        k.itemHook('heal');
        k.fx('lk-relight', { n: k.g.lan.length });
      },
      fx: { type: 'aura', color: '#fff0c8', r: 36, dur: 0.6 },
    },
  ],
};
// a lantern just set down: Ember Ward (the boss is casting: when the cast lands, a shield on everyone in its glow)
function lkPlaced(k, ab, l) {
  k.itemHook('heal');
  k.fx('lk-place', { x: Math.round(l.x), y: Math.round(l.y), kind: l.kind });
  const b = bossNow(k);
  if (k.talent('lanternkeeper_emberward') && b && b.casting) {
    const id = l.id, sh = lkShieldAmt(k, 60);
    k.after(Math.max(0.1, b.castLeft), () => { if (k.g.lan.some(o => o.id === id)) lkBurst(k, 0, { lid: id, sh }); });
  }
}

// Lighthouse (T, a window of 8s): fills from the healing your lanterns do (about 1% for every dozen ally-seconds in a glow)
ULTIMATES.lanternkeeper = {
  id: 'lighthouse', name: 'Lighthouse', slot: 7, type: 'ogcd', ult: true, mode: 'window', target: 'self', anim: 'big', icon: 'lighthouse',
  lock: 0.9, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5 },
  desc: 'A tall beam rises from your lantern. For 8s the whole room counts as inside every glow, every lantern heals double and no wick burns down, and Flare is ready again. ' +
    'You take 30% less damage and can\'t be knocked back while you raise it.' +
    healUltCharge('a little for every ally your lanterns heal,'),
  effect(k) {
    k.g.lightUntil = k.now + LANTERN.LIGHT;
    k.refill('flare');
    if (k.talent('lanternkeeper_eternal') && !k.g.lan.some(l => l.kind === 'eternal')) {
      const l = lkAdd(k, 'eternal', { r: LANTERN.R, pot: 10, end: Infinity });
      k.fx('lk-eternal', { x: Math.round(l.x), y: Math.round(l.y) });
    }
    k.fx('lk-lighthouse');
  },
  window: {
    dur: LANTERN.LIGHT,
    over: {
      flare: { fxId: 'beaconflare', name: 'Lighthouse Flare', desc: 'Lighthouse: every lantern bursts at once, and the whole room is in the glow: everyone heals {h:340} for every lantern you have lit.', glow: () => true },
    },
    onEnd(k) { k.g.lightUntil = 0; k.fx('lk-lighthouseEnd'); },
  },
};

// talent moves (rows III and V)
talentMoves('lanternkeeper', {
  lanternkeeper_wisp: {
    id: 'wisp', replaces: 'relight', icon: 'wisp', name: 'Will-o\'-Wisp', type: 'gcd', target: 'self', cd: 10, anim: 'cast', talent: true,
    usable: k => k.g.emb >= 1,
    desc: 'Instant, 1 Ember: a wandering wisp floats to the most hurt ally and heals them {h:50} every second for 6s.',
    glow: k => k.g.emb >= 2,
    effect(k) {
      k.g.emb -= 1;
      k.hot('lowest', 50, 6, 1, { ab: this, id: 'wisp' });
      k.fx('lk-wisp');
    },
    fx: { type: 'ring', color: '#fff0c8', r: 30, onTarget: false },
  },
  lanternkeeper_festival: {
    id: 'festival', replaces: 'set', icon: 'festival', name: 'Lantern Festival', type: 'gcd', target: 'self', cd: 12, anim: 'big', talent: true,
    usable: k => k.g.emb >= 1,
    desc: 'Instant, 1 Ember: release five floating lanterns that drift over the party for 12s. Each heals everyone under it {h:11} every second.',
    glow: k => k.g.emb >= 1 && !k.g.lan.some(l => l.kind === 'float'),
    effect(k) {
      k.g.emb -= 1;
      for (let i = 0; i < 5; i++) lkAdd(k, 'float', { on: 'c', r: LANTERN.FLOAT_R, pot: 11, end: k.now + LANTERN.FLOAT_LIFE, ph: i * Math.PI * 2 / 5 });
      k.itemHook('heal');
      k.fx('lk-festival');
    },
    fx: { type: 'aura', color: '#ffc46b', r: 50, dur: 0.8 },
  },
});

// the specs' moves (specs.js SPECS.lanternkeeper)
// Beacon: Great Beacon, a tall post with a wide glow that never burns below half (two at most; Carry can't move it)
function lkBeacon(k, ab) {
  k.g.emb -= 1;
  const l = lkAdd(k, 'beacon', { r: LANTERN.BEACON_R, pot: 65, end: k.now + LANTERN.LIFE });
  if (k.perk('lanternkeeper_w2')) l.end += 1;
  lkPlaced(k, ab, l);
}
// Wayfarer: Lamplighter's Stride, small lights dropped as you walk for 10s (the first one at once)
function lkStride(k, ab) {
  k.g.emb -= 1;
  k.g.strideUntil = k.now + LANTERN.STRIDE; k.g.strideDist = 0;
  lkSmall(k);
  k.itemHook('heal');
  k.fx('lk-stride');
}
// Wayfarer: Trailblaze, a dash that drags every small light along with you (Pathfinder: drops two lights on its way that heal double)
function lkTrail(k, ab) {
  const p0 = lkPos(k);
  if (k.talent('lanternkeeper_pathfinder')) lkSmall(k, { dash: true });
  kitMove(k, 'dash', { d: k.talent('lanternkeeper_longtoss') ? 300 : 150, ab });
  k.after(0.05, () => {
    const p = lkPos(k), dx = p.x - p0.x, dy = p.y - p0.y;
    for (const l of k.g.lan) if (l.kind === 'small' && !l.dash) { l.x += dx; l.y += dy; if (k.talent('lanternkeeper_nightwalk')) l.wick = Math.min(1, l.wick + LANTERN.TRIM); if (k.perk('lanternkeeper_a2')) l.wick = Math.min(1, l.wick + 1 / 3); }   // (Silkwick Coat: Trailblaze is the Wayfarer's Carry the Flame)
    if (k.talent('lanternkeeper_pathfinder')) lkSmall(k, { dash: true, x: (p.x + p0.x) / 2, y: (p.y + p0.y) / 2 });
    k.fx('lk-trail', { dx: Math.round(dx), dy: Math.round(dy) });
  });
}

if (typeof module !== 'undefined') Object.assign(module.exports, { LANTERN, LK_KIND, lkEmbMax, lkLight, lkNearest, lkMovable, lkStub, lkCarryReach, lkCarryable, lkPos, lkAdd, lkSmall, lkPlaced, lkBeacon, lkStride, lkTrail });

// ===================================================================================================================
// KENSEIER (tank, class 22; docs/plans/2026-10-new-classes-3.md, section 4): every blow has a beat. Catch it.
// The deflect is judged on the host against the real hit (fight.js, the KENSEI_HOST block at its end), the way a Brace is.
// The kit's side of the conversation, all of it one event type, 'kensei' (op in the event):
//   op 'deflect'  W pressed. dur: the window either side of the hit, amount / value / mult: what a Perfect, a Good and a
//                 tankbuster Perfect add to the boss's Posture, r: reach to an ally (Warden), sh / ticks: Guard Stance's
//                 shield and how many allies get it, secs / keep: the Break's length, and the bar's start after it (Crack)
//   op 'step'     E pressed (Mikiri Step): an avoidable hit that lands in the next dur s passes through you, +amount Posture
//   op 'posture'  Posture from your own moves (amount), or full: 1 to Break the boss at once
//   op 'end'      a Deathblow ends the Break early      op 'off'  you are Off-balance for dur s (+10% damage taken, no deflects)
//   op 'duel'     Ember Duel: the boss's autos come every 2 s for dur s
// and the host answers with fev messages, which reach onNotify: 'kdef' (q: 2 Perfect, 1 Good, 3 Mikiri; late: the press
// came after the hit and gave it back; a: what the hit would have dealt; b: a tankbuster; to: the ally it was turned from;
// p: the Posture bar after it, 0..1), 'kbrk' (a Break begins: secs) and 'kbend' (it is over). A hit you took without a
// deflect arrives as 'taken' (k: its kind, df: a deflect caught it) and costs Poise.
// Posture is BOSS state, only a Kenseier fills it (fight.js boss.post: p, until (the Break's end), hold; the 'fb' message's
// `po`: [p, max, break seconds left, held full, recovering, builder]); KENSEI below holds its rules for the host, the
// simulator and the kit alike. What the HUD and the VFX read: k.g.poise (0..100), k.g.offUntil, k.g.breakUntil, k.g.deflAt /
// k.g.dseq (the last press), k.g.lastDef, and from the world's boss(): hitIn / hitKind (seconds until the next auto or
// tankbuster that lands on you: the closing ring), posture. fx names (k.fx): ken-perfect, ken-good, ken-miss, ken-pass,
// ken-break, ken-off, ken-deathblow, ken-pommel, ken-redirect, ken-iai, ken-iai-stance, ken-mantle, ken-guard, ken-duel,
// ken-step, ken-spin, ken-thousand.
// ===================================================================================================================
const KENSEI = {
  PERFECT: 0.12, GOOD: 0.3, GOOD_MANTLE: 0.5, LOCK: 0.6,   // deflect windows (s, either side of the hit; Ash Mantle widens the Good one), the lockout after a miss
  MAX: 200,                          // the boss's Posture bar (a Good deflect on every swing breaks it about every 45 s, a Perfect on every swing about every 25 s)
  REST: 4, RECOVER: 5,               // the bar recovers RECOVER a second once nothing has added to it for REST s
  BREAK: 4, BREAK_DEADLY: 5, BREAK_DMG: 0.15,   // a Break: the stagger's length, and how much more the boss takes from the party
  DUEL: 10, DUEL_EVERY: 2,           // Ember Duel: how long, and the steady beat of the boss's autos
  OFF: 2, OFF_DMG: 0.1,              // Off-balance: how long, and the extra damage you take
  POISE: 100, MISS: 12, HIT: 15, HIT_BUSTER: 30, CROSS: 10, REGEN: 8, REGEN_AFTER: 1.5, REVIVE: 40,
  POMMEL_CD: 8,
  POST: { cut3: 8, pommel: 5, perfect: 18, buster: 30, deadly: 25, deadlyBuster: 37, good: 8, mikiri: 25, whirl: 4 },
  // ---- the boss's Posture bar: pure rules, run by the host (fight.js), the simulator and the tests alike
  make: () => ({ p: 0, at: -99, until: 0, hold: false, by: null, secs: 4, keep: 0 }),
  broken: (P, t) => t < P.until,
  recovering: (P, t) => !P.until && !P.hold && P.p > 0 && t - P.at > KENSEI.REST,
  frac: P => P.p / KENSEI.MAX,
  // how a press lands against a hit, by how far apart they are (either side): 2 Perfect, 1 Good, 0 nothing
  judge: (off, good = KENSEI.GOOD) => { const a = Math.abs(off); return a <= KENSEI.PERFECT ? 2 : a <= good ? 1 : 0; },
  // add Posture (n may be 0, to just look again). o: { secs (the Break's length), keep (the bar's start after it), by (who),
  // casting (the boss is in a scripted cast: a full bar holds until it ends) }. Returns 'break' when a Break begins.
  add(P, n, t, o = {}) {
    if (t < P.until) return null;   // a cracked bar takes nothing more until the Break is over
    if (o.secs) P.secs = o.secs;
    if (o.keep != null) P.keep = o.keep;
    if (o.by != null) P.by = o.by;
    if (n > 0) { P.p = Math.min(KENSEI.MAX, P.p + n); P.at = t; }
    return KENSEI.check(P, t, o.casting);
  },
  check(P, t, casting) {
    if (P.p < KENSEI.MAX - 1e-6) { P.hold = false; return null; }
    if (casting) { P.hold = true; return null; }   // never during a scripted cast: it holds full until the cast ends
    P.hold = false; P.p = 0; P.until = t + (P.secs || KENSEI.BREAK); P.at = t;
    return 'break';
  },
  endBreak(P, t) { if (P.until > t) P.until = t; },
  // every update: a Break running out ('end': the bar starts again at keep), a held bar breaking as the cast ends ('break'), recovery
  tick(P, t, dt, casting) {
    if (P.until) {
      if (t < P.until) return null;
      P.until = 0; P.p = Math.min(KENSEI.MAX - 1, P.keep * KENSEI.MAX); P.at = t;
      return 'end';
    }
    if (P.hold) return casting ? null : KENSEI.check(P, t, false);
    if (P.p > 0 && t - P.at > KENSEI.REST) P.p = Math.max(0, P.p - KENSEI.RECOVER * dt);
    return null;
  },
};

const kenBroken = k => k.now < (k.g.breakUntil || 0);
const kenOff = k => k.now < (k.g.offUntil || 0);
const kenBreakSecs = k => (k.def.deadly ? KENSEI.BREAK_DEADLY : KENSEI.BREAK);
const kenKeep = k => (k.talent('kenseier_crack') ? 0.125 : 0);
const kenCross = k => (k.def.warden ? (k.talent('kenseier_longguard') ? 180 : 120) : 0);
// what a Perfect adds to the boss's Posture (Ember Duel doubles it), on a swing and on a tankbuster
const kenPerfectPost = (k, buster) => (k.def.deadly ? (buster ? KENSEI.POST.deadlyBuster : KENSEI.POST.deadly) : (buster ? KENSEI.POST.buster : KENSEI.POST.perfect)) * (k.now < (k.g.duelUntil || 0) ? 2 : 1);
const kenShieldAmt = (k, pot) => Math.round(pot * ENGINE.POT_SCALE * (1 + (k.def.healMod ? k.def.healMod(k, {}) : 0)) * (1 + (k.gear().power || 0)) * (1 + k.fxMod('heal')));
// the third hit of Ember Cut: the combo's next step, or the third at once when the boss is on someone else (the Pull Cut, which carries the taunt)
function kenStep(k) {
  const b = bossNow(k);
  if (b && b.onMe === false) return 2;
  return k.now < k.g.comboUntil ? k.g.step : 0;
}
// Posture from your own moves: the host adds it to the boss's bar (nothing without a Kenseier, nothing during a Break)
function kenPosture(k, n, o = {}) {
  if (!(n > 0) && !o.full) return;
  k.env.emit(Object.assign({ type: 'kensei', op: 'posture', amount: Math.round(n * 10) / 10, secs: kenBreakSecs(k), keep: kenKeep(k) }, o.full ? { full: 1 } : null));
}
// Poise: a mistimed deflect or a blow taken costs it; at nothing you are Off-balance
function kenPoise(k, d) {
  const g = k.g;
  if (d < 0) g.hurtAt = k.now;
  g.poise = Math.max(0, Math.min(KENSEI.POISE, g.poise + d));
  if (g.poise <= 0 && !kenOff(k)) {
    const off = k.perk('kenseier_a2') ? KENSEI.OFF / 2 : KENSEI.OFF;   // (item kenseier_a2: Off-balance lasts half as long)
    g.offUntil = k.now + off;
    k.env.emit({ type: 'kensei', op: 'off', dur: off });
    k.fx('ken-off');
  }
}
// a deflect that caught nothing: it costs a little Poise, and the key rests (answered presses set k.g.dres)
function kenMissCheck(k, id, at) {
  const g = k.g;
  if ((g.dres || 0) >= id) return;
  if (!(k.has('mantle') && k.talent('kenseier_unbroken'))) kenPoise(k, -KENSEI.MISS);
  g.noDefl = Math.max(g.noDefl || 0, at + KENSEI.LOCK);
  k.stats.misses = (k.stats.misses || 0) + 1;
  k.fx('ken-miss');
}
// W: the window opens now; the host holds it against the next blow aimed at you (or an ally in reach, as a Warden)
function kenDeflect(k, ab) {
  const g = k.g, P = KENSEI.POST, mantle = k.has('mantle');
  g.dseq = (g.dseq || 0) + 1;
  const id = g.dseq, win = mantle ? KENSEI.GOOD_MANTLE : KENSEI.GOOD;
  g.deflAt = k.now;
  k.env.emit({ type: 'kensei', op: 'deflect', dur: win, amount: kenPerfectPost(k, false), value: P.good, mult: kenPerfectPost(k, true), r: kenCross(k), secs: kenBreakSecs(k), keep: kenKeep(k),
    sh: k.has('guard') ? kenShieldAmt(k, 150) : 0, ticks: k.talent('kenseier_fireside') ? 2 : 1 });
  k.stats.deflects = (k.stats.deflects || 0) + 1;
  const at = k.now;
  k.after(win + 0.25, () => kenMissCheck(k, id, at + win));
}
// the host's word on a press (fev 'kdef'): q 2 Perfect, 1 Good, 3 Mikiri Step passed through
function kenOnDeflect(k, d) {
  const g = k.g;
  if (d.q === 3) {
    k.stats.steps = (k.stats.steps || 0) + 1; k.ultGain(1.2); k.fx('ken-pass');
    if (k.perk('kenseier_w2')) { g.step = 2; g.comboUntil = k.now + 15; }   // (item kenseier_w2: the step through a blow readies the third cut)
    return;
  }
  g.dres = g.dseq || 0;
  // (the press came after the hit: it gave the blow back, and the Poise it had cost)
  if (d.late && g.lastTake && k.now - g.lastTake.at <= 0.8) { kenPoise(k, g.lastTake.cost); g.lastTake = null; }
  if (d.to != null) kenPoise(k, -KENSEI.CROSS * (d.q === 2 ? 0.5 : 1));   // (stepping in front of an ally: your Poise, their safety)
  g.lastDef = { a: d.a || 0, b: d.b ? 1 : 0, at: k.now, q: d.q };
  if (d.q === 2) kenPerfectHit(k, d);
  else {
    if (k.perk('kenseier_w8')) k.ultGain(d.b ? 1.2 : 0.6);   // (item kenseier_w8: a Good deflect charges Thousand Cuts a third of a Perfect)
    k.fx('ken-good', { b: d.b ? 1 : 0, late: d.late ? 1 : 0, to: d.to != null ? d.to : null });
    // Feint (row I): a Good deflect leaves a moment to turn it into a Perfect with your Pommel (or Redirect)
    if (k.talent('kenseier_feint') && k.now >= (g.pommelAt || 0) && !kenBroken(k)) { g.feintUntil = k.now + 1.2; g.feint = { a: d.a, b: d.b, to: d.to }; }
  }
}
// everything a Perfect sets off: Ultimate charge, the Riposte, Iai Stance's counter-cut, Ash Wall, the Shatter, Shared Poise
function kenPerfectHit(k, d) {
  const g = k.g, ab = abBase(k, 'deflect');
  k.stats.perfects = (k.stats.perfects || 0) + 1;
  k.ultGain(d.b ? 3.6 : 1.8);   // (Thousand Cuts)
  if (k.perk('kenseier_w1')) k.healRaw('self', k.env.maxHp() * 0.02, { ab });   // (item kenseier_w1: a Perfect heals you about 2% of your HP)
  if (k.talent('kenseier_riposte') && k.now >= (g.riposteAt || 0)) { g.riposteAt = k.now + 10; g.step = 2; g.comboUntil = k.now + 15; }   // (Riposte: the next Ember Cut is the third, at most once every 10s)
  if (k.def.deadly && k.has('iai')) {   // (Deathblade: the counter-cut follows the Perfect)
    k.clear('iai');
    const gab = abBase(k, 'guard');
    k.after(0.3, () => {
      k.damage(450, { ab: gab, threat: 2 });
      if (k.talent('kenseier_crane')) kenPosture(k, 10);
      if (k.talent('kenseier_fireside')) k.shield('lowest', 150, 6, { ab: gab });
      k.fx('ken-iai');
    });
  }
  if (k.def.warden) {   // (Ash Wall: a tiny cut for the party, up to three at once)
    g.wall = (g.wall || []).filter(e => e > k.now);
    if (g.wall.length < 3) { g.wall.push(k.now + 4); k.mitigate('party', 0.02, 4, { ab }); }
  }
  if (k.has('mantle')) g.mantlePerf = (g.mantlePerf || 0) + 1;   // (Blazing Mantle counts them)
  if (k.talent('kenseier_shatter') && d.b && d.p > 0.5) kenPosture(k, 0, { full: true });
  if (d.to != null && k.talent('kenseier_sharedpoise')) k.shield(d.to, 100, 3, { ab });
  k.fx('ken-perfect', { b: d.b ? 1 : 0, late: d.late ? 1 : 0, to: d.to != null ? d.to : null, up: d.up ? 1 : 0 });
}
// a Break begins (fev 'kbrk')
function kenOnBreak(k, d) {
  const g = k.g, at = k.now;
  g.breakUntil = at + (d.secs || KENSEI.BREAK); g.breakAt = at; g.dbUsed = false;
  k.stats.breaks = (k.stats.breaks || 0) + 1;
  g.feintUntil = 0;
  if (k.talent('kenseier_lastspark') && !(at - (g.thousandAt ?? -9) < 1.5)) k.ultGain(25);   // (Last Spark: a Break you built charges Thousand Cuts a quarter; not the Break Thousand Cuts itself forces)
  // Patient Edge (Deathblade, row VI): a Break you did not spend a Deathblow on within 2 s gives the party +5% damage instead
  if (k.talent('kenseier_patient')) k.after(2, () => { if (g.breakAt === at && !g.dbUsed && kenBroken(k)) k.partyBuff('dmg', 0.05, Math.max(0.5, g.breakUntil - k.now), { ab: abBase(k, 'deathblow') }); });
  k.fx('ken-break', { s: d.secs || KENSEI.BREAK });
}
// the Deathblow, a free one under Thousand Cuts (o.ult), and its follow-ups
function kenDeathblow(k, ab, o = {}) {
  const g = k.g, mult = o.mult || 1, early = k.now - (g.breakAt || 0) <= 1.2;
  const pot = 900 * mult * (!o.ult && early && k.talent('kenseier_grand') ? 1.2 : 1);
  const r = k.damage(pot, { ab, threat: 2 });
  k.healRaw('self', k.env.maxHp() * 0.15, { ab });
  if (k.def.deadly) k.buff('killing', 10);   // (Killing Edge: the boss takes 5% more from you for 10 s)
  if (k.perk('kenseier_a4') && k.now - (g.breakAt || 0) <= 1) k.shield('party', 90, 5, { ab });   // (item kenseier_a4: a Deathblow in the first second of a Break leaves the party a short shield)
  if (k.talent('kenseier_double')) k.after(0.35, () => k.damage(110 * mult, { ab, threat: 2 }));   // (Double Stroke: a small second stroke)
  if (k.talent('kenseier_cleave')) for (const e of (k.env.enemiesNear ? k.env.enemiesNear(260) : null) || []) if (e.id !== 'boss') k.damage(pot * 0.6, { ab, tgt: e.id });   // (Cleaving Death)
  k.fx('ken-deathblow', { u: o.ult ? 1 : 0 });
  return r;
}
function kenPommel(k, ab) {
  const g = k.g, up = k.talent('kenseier_feint') && k.now < (g.feintUntil || 0);
  k.damage(200, { ab, threat: 2 });
  kenPosture(k, KENSEI.POST.pommel + (up ? kenPerfectPost(k, false) - KENSEI.POST.good : 0));
  g.pommelAt = k.now + KENSEI.POMMEL_CD;
  k.fx('ken-pommel');
  if (up) { const f = g.feint || {}; g.feintUntil = 0; kenPerfectHit(k, { q: 2, a: f.a, b: f.b, to: f.to, up: 1 }); }
}
// Redirect (Warden, in Pommel's place): the last deflected blow goes back at the boss, 30% of what it would have dealt
function kenRedirect(k, ab) {
  const g = k.g, L = g.lastDef, up = k.talent('kenseier_feint') && k.now < (g.feintUntil || 0);
  if (!L) return;
  const r = k.damage(Math.min(500, 0.3 * L.a / ENGINE.POT_SCALE), { ab, threat: 2 });
  if (k.talent('kenseier_emberreturn') && r && r.amount > 0) k.healRaw('self', r.amount, { ab });   // (Ember Return)
  if (k.talent('kenseier_turnedtide')) kenPosture(k, L.b ? 20 : 10);   // (Turned Tide: any blow sent back adds Posture, a tankbuster more)
  g.lastDef = null; g.pommelAt = k.now + KENSEI.POMMEL_CD;
  k.fx('ken-redirect', { b: L.b });
  if (up) { const f = g.feint || {}; g.feintUntil = 0; kenPosture(k, kenPerfectPost(k, false) - KENSEI.POST.good); kenPerfectHit(k, { q: 2, a: f.a, b: f.b, to: f.to, up: 1 }); }
}
function kenTick(k) {
  const g = k.g, now = k.now, dt = Math.max(0, Math.min(0.5, now - (g.tAt ?? now)));
  g.tAt = now;
  // Poise: it refills while you are not being hit (Iron Breath: twice as fast); out of Off-balance you stand up at REVIVE
  if (!kenOff(k)) {
    if (g.poise <= 0) g.poise = KENSEI.REVIVE;
    else if (g.poise < KENSEI.POISE && now - (g.hurtAt ?? -9) > KENSEI.REGEN_AFTER) g.poise = Math.min(KENSEI.POISE, g.poise + KENSEI.REGEN * (k.talent('kenseier_ironbreath') ? 2 : 1) * dt);
  }
  // Ember Edge: the burn from a third cut adds a Posture a second
  while (g.burnUntil && g.burnAt <= now + 1e-6 && g.burnAt <= g.burnUntil + 1e-6) { g.burnAt += 1; kenPosture(k, 1); }
  if (g.burnUntil && now > g.burnUntil + 1) g.burnUntil = 0;
  if (g.breakUntil && now >= g.breakUntil) g.breakUntil = 0;
}

KITS.kenseier = {
  potMult: 1.246,   // balance knob (tools/simulate.js)
  role: 'tank',
  auto: { kind: 'slash', potency: 40, range: MELEE },
  gauge: { kind: 'poise', key: 'poise', max: KENSEI.POISE, label: 'Poise' },
  init: () => ({ poise: KENSEI.POISE, step: 0, comboUntil: 0, dseq: 0, dres: 0, deflAt: -9, noDefl: 0, offUntil: 0, hurtAt: -9, lastTake: null, lastDef: null,
    breakUntil: 0, breakAt: 0, dbUsed: true, pommelAt: 0, feintUntil: 0, feint: null, burnUntil: 0, burnAt: 0, wall: [], mantlePerf: 0, duelUntil: 0, tAt: null }),
  // the taunt rides on the Ember Cut that is the third hit: when the boss is on someone else, a press is that hit (kenStep)
  tauntWhen: k => !bossNow(k) || kenStep(k) === 2,
  dmgMod: k => (k.has('killing') ? 0.05 : 0),
  tick: k => kenTick(k),
  onNotify(k, type, d) {
    if (type === 'kdef') kenOnDeflect(k, d);
    else if (type === 'kbrk') kenOnBreak(k, d);
    else if (type === 'kbend') { k.g.breakUntil = 0; }
    else if (type === 'taken') {   // a blow you took without a deflect costs Poise (a Good deflect's half does not: pdmg's df)
      if (!(d.a > 0) || d.df || !(d.k === 'auto' || d.k === 'buster')) return;
      const cost = d.k === 'buster' ? KENSEI.HIT_BUSTER : KENSEI.HIT;
      k.g.lastTake = { at: k.now, cost };
      kenPoise(k, -cost);
    }
  },
  signature: 'The Beat',
  floor: 'Press Q for the combo. W when it glows, just as a blow lands. R when it glows, D before a big hit, F when the party is about to be hit.',
  ceiling: [
    'Every boss auto and tankbuster has a beat, and the ring closing on your feet counts it down. Press W as it closes: within a blink of the hit is Perfect (no damage, +18 Posture, +30 on a tankbuster), a little further is Good (half damage, +8).',
    'Pressing W with no blow to meet costs Poise and locks the key for a moment. Poise also drains when a blow hits you with no deflect; at nothing you are Off-balance for 2s: no deflects, 10% more damage taken. It refills quickly while you are not hit.',
    'Posture is the boss\'s, and only you can fill it. At full the boss Breaks: 4s of stagger, no casts, and everyone deals 15% more. A full bar holds until a cast ends. Deathblow (R) in a Break hits for {d:900}, but it ends the Break: line it up with the party\'s burst.',
    'Mikiri Step (E) is a small step through an attack: let one land as you move and it passes through you untouched, for 25 Posture.',
    'Ash Mantle (D) halves a tankbuster and makes any deflect at least Good. Guard Stance (F) turns your deflects into shields on your allies.',
  ],
  abilities: [
    {
      id: 'cut', name: 'Ember Cut', type: 'gcd', target: 'enemy', range: MELEE, lock: 0.3, anim: 'attack',
      desc: 'Three-hit combo on one button: Cut ({d:170}) > Rising Cut ({d:190}) > Ember Cut ({d:240}). The third hit adds 8 Posture to the boss. It carries your taunt: while the boss is on someone else, this press is the third hit, and pulls it.',
      label: k => ['Cut', 'Rising Cut', 'Ember Cut'][kenStep(k)],
      fxStep: k => kenStep(k),
      effect(k) {
        const step = kenStep(k);
        k.damage([170, 190, 240][step], { ab: this });
        if (step === 2) {
          kenPosture(k, KENSEI.POST.cut3);
          if (k.talent('kenseier_emberedge')) { k.g.burnUntil = k.now + 6; k.g.burnAt = k.now + 1; }   // (Ember Edge)
          k.g.step = 0;
        } else k.g.step = step + 1;
        k.g.comboUntil = k.now + 15;
      },
      fx: { type: 'slash', color: '#ff8a3d', r: 56, span: 1.6 },
    },
    {
      id: 'deflect', name: 'Deflect', type: 'ogcd', target: 'self', lock: 0.2, anim: 'guard',
      desc: 'Meet the next blow with your blade. Pressed within a blink of a boss auto or tankbuster landing on you, either side of it, it turns the blow aside (Perfect: no damage, +18 Posture, +30 on a tankbuster) and a little further out it halves it (Good: +8 Posture). No cooldown, but pressed with no blow to meet it costs a little Poise and the key rests for a moment.',
      usable: k => !kenOff(k) && k.now >= (k.g.noDefl || 0),
      glow: k => { const b = bossNow(k); return !kenOff(k) && !!(b && b.hitIn != null && b.hitIn <= 0.14 && b.hitIn >= -0.1); },
      effect(k) { kenDeflect(k, this); },
      fx: { type: 'ring', color: '#ffd9a0', r: 40 },
    },
    {
      id: 'mikiri', name: 'Mikiri Step', type: 'ogcd', target: 'self', cd: 12, lock: 0.4, anim: 'attack',
      desc: 'A small step through an attack. A blow that lands on you as you step passes through you untouched, and adds 25 Posture to the boss. It glows when a telegraph is about to land where you stand.',
      glow: k => { const p = k.env.pos ? k.env.pos() : null; return !!(p && k.env.danger && k.env.danger(p.x, p.y, 0.9)); },
      effect(k) {
        kitMove(k, 'dash', { ab: this, d: k.talent('kenseier_longstep') ? 220 : 110 });
        k.env.emit({ type: 'kensei', op: 'step', dur: 0.45, amount: KENSEI.POST.mikiri, secs: kenBreakSecs(k), keep: kenKeep(k) });
        k.fx('ken-step');
      },
      fx: { type: 'aura', color: '#ffb070', r: 30, dur: 0.5 },
    },
    {
      id: 'deathblow', name: 'Deathblow', type: 'gcd', target: 'enemy', range: MELEE, lock: 0.3, anim: 'attack',
      desc: 'Only while the boss is Broken: a Deathblow for {d:900} that heals you for 15% of your health, and ends the Break early. Out of a Break this is a Pommel: {d:200} and +5 Posture (8s cooldown).',
      label: k => (kenBroken(k) ? 'Deathblow' : k.def.warden ? 'Redirect' : 'Pommel'),
      usable: k => kenBroken(k) || (k.now >= (k.g.pommelAt || 0) && (!k.def.warden || !!(k.g.lastDef && k.now - k.g.lastDef.at < 8))),
      // (Feint, row I: right after a Good deflect the Pommel is off the global cooldown)
      freeGcd: k => !kenBroken(k) && k.talent('kenseier_feint') && k.now < (k.g.feintUntil || 0) && k.now >= (k.g.pommelAt || 0),
      // (Redirect glows for a blow worth sending back: a tankbuster, not an auto)
      glow: k => kenBroken(k) || (!!k.def.warden && !!(k.g.lastDef && k.now - k.g.lastDef.at < 8 && k.g.lastDef.a >= k.env.maxHp() * 0.15) && k.now >= (k.g.pommelAt || 0)),
      effect(k) {
        if (kenBroken(k)) {
          kenDeathblow(k, this);
          k.g.dbUsed = true; k.g.breakUntil = 0;
          k.env.emit({ type: 'kensei', op: 'end' });
        } else if (k.def.warden) kenRedirect(k, this);
        else kenPommel(k, this);
      },
      fx: { type: 'slash', color: '#fff0c0', r: 70, span: 2.2 },
    },
    {
      id: 'mantle', name: 'Ash Mantle', type: 'ogcd', target: 'self', cd: 60, lock: 0.5, anim: 'big',
      desc: 'Pull a cloak of ash about you: 40% less damage taken for 8s, and every deflect in it counts as Good at least (any press within a longer window).',
      glow: k => { const b = bossNow(k); return !!(b && b.casting && b.onMe && b.castLeft < 1.5); },
      effect(k) {
        const dur = k.perk('kenseier_w3') ? 10 : 8;   // (item kenseier_w3: 2s longer)
        k.mitigate('self', 0.4, dur, { ab: this });
        k.buff('mantle', dur);
        k.g.mantlePerf = 0;
        if (k.talent('kenseier_blazing')) k.after(dur, () => { const n = k.g.mantlePerf || 0; if (n > 0) k.damage(100 * n, { ab: this, threat: 2 }); k.fx('ken-blaze', { n }); });   // (Blazing Mantle)
        k.fx('ken-mantle', { dur });
      },
      fx: { type: 'aura', color: '#8a8478', r: 36, dur: 2.5 },
    },
    {
      id: 'guard', name: 'Guard Stance', type: 'ogcd', target: 'self', cd: 90, lock: 0.5, anim: 'big',
      desc: 'For 6s every deflect of yours also shields the nearest ally for {s:150}.',
      effect(k) { k.buff('guard', 6); k.fx('ken-guard'); },
      fx: { type: 'ring', color: '#ffd27a', r: 60 },
    },
  ],
};

// the taunt (carried by Ember Cut, TAUNT_CARRY): the pull cut steadies you
Object.assign(TAUNT, {
  kenseier: {
    name: 'Pull Cut', icon: 'cut',
    desc: 'The cut steadies you: +15 Poise.',
    use(k) { kenPoise(k, 15); },
  },
});
TAUNT_CARRY.kenseier = 'cut';

// Thousand Cuts (T, instant): Perfect deflects fill it (1.8% each, 3.6% on a tankbuster, a little on its own while you fight)
ULTIMATES.kenseier = {
  id: 'thousandcuts', name: 'Thousand Cuts', slot: 7, type: 'ogcd', ult: true, mode: 'instant', target: 'enemy', range: MELEE, anim: 'big', icon: 'thousandcuts',
  lock: 1.0, dr: 0.3,
  charge: { rate: 0.35, keep: 0.5 },
  desc: 'A thousand cuts in the space of a breath: the boss\'s Posture fills at once and it Breaks, and then a free Deathblow lands at double strength, {d:1800}, healing you for 15%. The Deathblow does not end this Break. (A cast that is under way holds the Break until it ends.) ' +
    'You take 30% less damage and can\'t be knocked back while you cut.' +
    '<div class="it-ult"><span><u>Charge:</u> 1.8% for every Perfect deflect (3.6% on a tankbuster), and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
  effect(k) {
    const ab = this;
    k.g.thousandAt = k.now;   // (Last Spark skips the Break this forces)
    kenPosture(k, 0, { full: true });
    k.after(0.5, () => kenDeathblow(k, ab, { mult: 2, ult: true }));
    k.fx('ken-thousand');
  },
};

// talents that grant a new move (row III's Whirlwind Slash in Mikiri Step's place, row V's Ember Duel in Guard Stance's)
TALENT_ABILITIES.kenseier_whirlwind = { cls: 'kenseier', ab: {
  id: 'whirlwind', replaces: 'mikiri', icon: 'whirlwind', name: 'Whirlwind Slash', type: 'ogcd', target: 'self', cd: 12, lock: 0.5, anim: 'attack', talent: true,
  desc: 'Spin with the blade drawn: every enemy within reach is cut for {d:50}, and adds 4 Posture to the boss for each one hit (the adds count).',
  effect(k) {
    const near = (k.env.enemiesNear ? k.env.enemiesNear(110) : null) || [{ id: 'boss' }];
    for (const e of near) k.damage(50, { ab: this, tgt: e.id });
    kenPosture(k, KENSEI.POST.whirl * near.length);
    k.fx('ken-spin', { n: near.length });
  },
  fx: { type: 'ring', color: '#ffb070', r: 110 },
} };
TALENT_ABILITIES.kenseier_duel = { cls: 'kenseier', ab: {
  id: 'duel', replaces: 'guard', icon: 'duel', name: 'Ember Duel', type: 'ogcd', target: 'self', cd: 90, lock: 0.5, anim: 'big', talent: true,
  desc: 'For 10s the boss strikes to a steady beat, every 2s exactly, and every Perfect deflect adds double Posture.',
  effect(k) {
    k.g.duelUntil = k.now + KENSEI.DUEL; k.buff('duel', KENSEI.DUEL);
    k.env.emit({ type: 'kensei', op: 'duel', dur: KENSEI.DUEL });
    k.fx('ken-duel');
  },
  fx: { type: 'ring', color: '#ff8a3d', r: 80 },
} };

if (typeof module !== 'undefined') Object.assign(module.exports, { KENSEI, kenStep, kenBroken, kenOff, kenPoise, kenPosture, kenDeflect, kenOnDeflect, kenOnBreak, kenDeathblow, kenBreakSecs, kenCross });

// ---------------------------------------------------------------- Houndmaster (melee damage, class 23): two hounds and the word they spell
// docs/plans/2026-10-new-classes-3.md section 3. The hounds (k.g.hounds; one for the Lone Wolf, four more spectral ones in Wild
// Hunt: the list is general) live in the kit like the Marionettist's Dolls: they run to a station on the ring round the enemy,
// bite on their own (hdBite), take the boss's telegraphs as pets (the host's 'houndhit') and come back 10s after going down.
//  - A station is an angle round the enemy (h.ring, absolute) and a slot (h.slot: 'left' | 'right' | 'front' | 'behind', measured
//    from the enemy's facing; null while the hound is on its way). Two arrived hounds make a PAIR (hdPairOf): left + right
//    Rend, front + behind Hamstring, both behind Bring Down. The Pack Finisher is whichever pair stands.
//  - A free hound drifts: every few seconds it picks a flank again, and a boss that turns sends it round (its ring is fixed in
//    the world, so the turn changes its slot, and it picks again a moment later). An ordered hound (Whistle: Flank, a pounce)
//    and any hound while Hold is up keep their slot through a turn instead (their ring follows the facing).
//  - Whistle: Flank sends the next hound to where you point (the side of the enemy nearest the cursor; with the cursor on the
//    enemy, the flank nearest you). Whistle: Hold freezes both slots; pressed again, both pounce and land behind.
// Bond (k.g.bond, shared, and each hound's own) is built by bites and spent by the finisher. Wild Hunt makes every pair count.
// Hooks for specs and talents: hdBite, hdOrder, hdDown, hdRevive, hdAfterPounce, hdFinish, hdPairOf; k.def.hounds (ids), k.def.solo
// (the pair is the hound's slot and yours), k.def.houndHp, k.def.houndMult.
const HOUND = { RING: 36, SPEED: 330, LEAP: 650, GUARD_SPEED: 700, SPREAD: 0.28, ARRIVE: 38, REACH: 74, HOLD: 15, ORDER: 10, LAND_HOLD: 6, DRIFT: [6, 10], TURN: 0.5,
  HP: 100, HIT: 100, HIT_WIDE: 60, REGEN: 8, RESPAWN: 10, BITE: 55, BITE_EVERY: 3, BITE_BOND: 5, KNIFE_BOND: 7, POUNCE: 250, COST: 40,
  GUARD: 5, GUARD_DR: 0.2, QUARRY: 12, QUARRY_FAST: 1.5, WILD_DUR: 10, WILD_EVERY: 2, WILD_BITE: 55,
  REND: 420, REND_TICK: 50, HAMSTRING: 480, HAM_VULN: 0.05, HAM_DUR: 10, BRING: 700, SNAP: 300 };
const HD_FAR = { target: 'enemy', range: 2000 };
const HD_BITE = { id: 'bite', name: 'Bite' };   // (a hound's own bite: no button, its hits are named for the meters)
const HD_BLEED = { id: 'rend', name: 'Rend' };
const HD_OFF = { front: 0, right: Math.PI / 2, behind: Math.PI, left: -Math.PI / 2 };   // (from the enemy's facing; y runs down, so +90 degrees is its right hand)
const HD_NAMES = { rend: 'Rend', hamstring: 'Hamstring', bringdown: 'Bring Down', snap: 'Snap' };
const hdWrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const hdER = e => mariER(e);
const hdEnemy = k => (k.env.picked && k.env.picked()) || k.env.target(HD_FAR);
const hdFace = (k, e) => { if (k.now < (k.g.hornUntil || 0)) return k.g.hornFace; const f = k.env.bossFace ? k.env.bossFace(e) : null; return typeof f === 'number' && isFinite(f) ? f : Math.PI / 2; };
const hdStep = k => (k.now < k.g.comboUntil ? k.g.step : 0);
const hdWild = k => !!(k.ultWin && k.ultWin.ab.id === 'wildhunt');
const hdHolding = k => k.now < (k.g.holdUntil || 0);
const hdQuarry = k => k.now < (k.g.markUntil || 0);
const hdReal = k => k.g.hounds.filter(h => !h.spectral);
const hdLiveReal = k => hdReal(k).filter(h => h.mode !== 'down');
function hdSlotOf(ang, F) { const r = hdWrap(ang - F), a = Math.abs(r); return a < Math.PI / 4 ? 'front' : a > Math.PI * 3 / 4 ? 'behind' : r > 0 ? 'right' : 'left'; }
// where a free hound drifts to next: a flank (a lone Greyfang may also pick the back of the enemy, where you are likely to stand)
function hdDriftGoal(k) { if (k.def.solo) { const r = k.rng(); return r < 1 / 3 ? 'left' : r < 2 / 3 ? 'right' : 'behind'; } return k.rng() < 0.5 ? 'left' : 'right'; }
// the pair a set of slots makes: the two flanks, front and back, or two behind (null: nothing special)
function hdPairOf(slots) {
  const has = s => slots.indexOf(s) >= 0;
  if (has('left') && has('right')) return 'rend';
  if (has('front') && has('behind')) return 'hamstring';
  if (slots.filter(s => s === 'behind').length >= 2) return 'bringdown';
  return null;
}
// where you stand round the enemy (the Lone Wolf's half of the pair)
function hdYourSlot(k, e) {
  if (!e) return null;
  const p = mariPos(k);
  return Math.hypot(p.x - e.x, p.y - e.y) <= hdER(e) + 220 ? hdSlotOf(Math.atan2(p.y - e.y, p.x - e.x), hdFace(k, e)) : null;
}
// the slots the pair is made of right now: the arrived hounds' (and yours, for a single hound)
function hdSlots(k) {
  const out = hdLiveReal(k).filter(h => h.slot).map(h => h.slot);
  if (k.def.solo) { const s = hdYourSlot(k, hdEnemy(k)); if (s) out.push(s); }
  return out;
}
const hdPairNow = k => (hdEnemy(k) ? hdPairIn(k, hdSlots(k)) || hdRelayed(k) : null);
// (the Lone Wolf's pair is Greyfang's place and yours, and you on a flank with it behind is a Bring Down as well: the Pack)
function hdPairIn(k, s) { return k.def.solo && s.length === 2 && s[0] === 'behind' && (s[1] === 'left' || s[1] === 'right') ? 'bringdown' : hdPairOf(s); }
function hdMake(k, id, i, p, o = {}) {
  return Object.assign({ id, x: p.x + (i % 2 ? 40 : -40), y: p.y - 30 + (i > 1 ? 24 : 0), face: 0, slot: null, bond: 0, hp: k.def.houndHp || HOUND.HP, maxHp: k.def.houndHp || HOUND.HP,
    downUntil: 0, mode: 'run', spectral: false, goal: null, ring: null, spread: i % 2 ? HOUND.SPREAD : -HOUND.SPREAD, orderUntil: 0, driftAt: 0, biteAt: 1 + k.rng() * 2, biteFxUntil: 0,
    safe: 0, shield: false, leapEnd: 0 }, o);
}
function hdSpawn(k, p) { (k.def.hounds || ['rust', 'ash']).forEach((id, i) => k.g.hounds.push(hdMake(k, id, i, p))); }
function hdRevive(k, h) {
  const p = mariPos(k);
  Object.assign(h, { mode: 'run', hp: h.maxHp, downUntil: 0, x: p.x + (h.spread > 0 ? 40 : -40), y: p.y - 30, goal: null, ring: null, driftAt: 0, orderUntil: 0, biteAt: k.now + 1.5, bond: 0 });
  k.fx('houndUp', { hound: h.id });
}
// a hound goes down (a telegraph): it comes back after RESPAWN seconds (Thick Coat: 6)
function hdDown(k, h) {
  if (h.mode === 'down') return;
  h.mode = 'down'; h.hp = 0; h.slot = null; h.bond = 0; h.shield = false;
  h.downUntil = k.now + (k.talent('houndmaster_thickcoat') ? 6 : HOUND.RESPAWN);
  k.stats.houndsDown = (k.stats.houndsDown || 0) + 1;
  k.fx('houndDown', { hound: h.id });
}
// the host's 'houndhit': a telegraph resolved over this hound (w: a raidwide that a cover would have stopped). Pets take what a
// player would: a hound on its way to you (Call Off), in mid-pounce or with a shield up does not go down
function hdHit(k, d) {
  const h = k.g.hounds.find(x => x.id === d.h);
  if (!h || h.spectral || h.mode === 'down' || h.mode === 'guard' || h.mode === 'pounce' || k.now < h.safe) return;
  if (h.shield) { h.shield = false; k.fx('houndShield', { hound: h.id }); return; }
  h.hp -= d.w ? HOUND.HIT_WIDE * (k.talent('houndmaster_oldscars') ? 0.7 : 1) : HOUND.HIT;   // (Old Scars: Greyfang takes 30% less from a raidwide)
  if (h.hp <= 0) hdDown(k, h);
}
// the add nearest the enemy you work (Blood Scent): any other enemy in reach of the hounds, never the dummy
function hdAddNear(k, e) {
  const list = (k.env.enemiesNear ? k.env.enemiesNear(600) : null) || [];
  let best = null, bd = Infinity;
  for (const c of list) {
    if (!c || c.id === 'dummy' || c.id === e.id) continue;
    const d = Math.hypot(c.x - e.x, c.y - e.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
// a hound bites (its own timer, the third knife hit, Mark the Quarry): damage, and Bond for it and the pack
// (o.mult: a bigger bite, o.bond: the Bond it gives, o.ab: a move's own name for the meters)
function hdBite(k, h, e, o = {}) {
  const m = (k.perk('houndmaster_w1') && k.has('rendbite') ? 1.1 : 1) * (k.def.houndMult || 1) * (o.mult || 1) * hdFang(k, h);
  const dmg = (h.spectral ? HOUND.WILD_BITE : HOUND.BITE) * m;
  k.damage(dmg, { ab: o.ab || HD_BITE, tgt: e.id !== 'dummy' ? e.id : undefined, auto: true });
  if (hdQuarry(k) && k.talent('houndmaster_bloodscent')) {   // (Blood Scent: the Mark has spread to the nearest add, and every bite bites it too)
    const ad = hdAddNear(k, e);
    if (ad) k.damage(dmg, { ab: o.ab || HD_BITE, tgt: ad.id, auto: true });
  }
  h.biteFxUntil = k.now + 0.3;
  if (!h.spectral) {
    const n = (o.bond != null ? o.bond : HOUND.BITE_BOND) * (hdQuarry(k) ? 2 : 1) * (k.def.bondMult || 1);   // (One Heart: Greyfang's bites give you more Bond)
    k.gain('bond', n, 100);
    h.bond = Math.min(100, h.bond + n);
  }
  k.stats.bites = (k.stats.bites || 0) + 1;
  k.fx('bite', { hound: h.id, big: !!o.big });
  if (!o.echo && !h.spectral && k.talent('houndmaster_littermates')) hdLitter(k, h, e);   // (Littermates)
}
// every hound in reach of the enemy bites at once (the third knife hit, the Quarry's first moment)
function hdBiteAll(k, o = {}) {
  const e = hdEnemy(k);
  if (!e) return;
  const R = hdER(e) + HOUND.REACH;
  for (const h of hdLiveReal(k)) if (h.mode !== 'guard' && h.mode !== 'pounce' && Math.hypot(h.x - e.x, h.y - e.y) <= R) { hdBite(k, h, e, o); h.biteAt = Math.max(h.biteAt, k.now + 1.2); }
}
// send a hound to a slot round the enemy and keep it there for ORDER seconds (through the enemy's turns)
function hdOrder(k, h, slot) {
  const e = hdEnemy(k);
  if (!e) return;
  h.goal = slot; h.ring = hdFace(k, e) + HD_OFF[slot]; h.orderUntil = k.now + HOUND.ORDER; h.driftAt = k.now + HOUND.ORDER + 4; h.slot = null;
  if (h.mode !== 'guard' && h.mode !== 'pounce') h.mode = 'run';
}
// where the cursor points: the side of the enemy nearest it; on the enemy itself (or no cursor), the flank nearest you
function hdAimSlot(k, e, h) {
  const F = hdFace(k, e), aim = k.env.aim ? k.env.aim() : null, p = mariPos(k);
  if (aim && Math.hypot(aim.x - e.x, aim.y - e.y) > hdER(e) + 24) return hdSlotOf(Math.atan2(aim.y - e.y, aim.x - e.x), F);
  const s = Math.sin(hdWrap(Math.atan2(p.y - e.y, p.x - e.x) - F));
  return Math.abs(s) < 0.15 ? (h.spread > 0 ? 'right' : 'left') : s > 0 ? 'right' : 'left';
}
// Whistle: Flank
function hdWhistle(k) {
  const e = hdEnemy(k), live = hdLiveReal(k);
  if (!e || !live.length) return null;
  let h = live.find(x => x.id === k.g.next) || live[0];
  if (live.length > 1 && k.env.shift && k.env.shift()) h = live.find(x => x !== h);
  const other = live.find(x => x !== h);
  const wasFront = h.slot === 'front';
  k.g.next = (other || h).id;
  hdOrder(k, h, hdAimSlot(k, e, h));
  k.fx('whistle', { hound: h.id, kind: 'flank' });
  // (Scent Line: the hound bites on its way through the boss, at most once every 2.5s now that the Whistle is quick)
  if (k.talent('houndmaster_scentline') && k.now >= (k.g.scentAt ?? -9)) { k.g.scentAt = k.now + 2.5; hdBite(k, h, e, { mult: 120 / HOUND.BITE, big: true, ab: abBase(k, 'flank') }); }
  if (wasFront && k.perk('houndmaster_w2')) k.gain('bond', 10, 100);   // (item houndmaster_w2: a hound whistled out of the boss's front gives 10 Bond)
  return h;
}
// Whistle: Hold, first press: both hounds freeze where they are (or where they are going)
// both hounds hold their places until `until` (they won't drift when the boss turns or moves); `busy` leaves a guarding or
// pouncing hound to finish first
function hdHoldAll(k, until, busy = false) {
  const e = hdEnemy(k), g = k.g;
  if (!e) return false;
  g.holdUntil = Math.max(g.holdUntil || 0, until);
  const F = hdFace(k, e);
  for (const h of hdLiveReal(k)) {
    if (busy && (h.mode === 'guard' || h.mode === 'pounce')) continue;
    if (!h.goal) { h.ring = Math.atan2(h.y - e.y, h.x - e.x); h.goal = hdSlotOf(h.ring, F); }
    h.mode = 'hold';
  }
  return true;
}
function hdHold(k, ab) {
  if (!hdHoldAll(k, k.now + HOUND.HOLD)) return;
  if (ab.charges) k.refundCharge(ab.id); else k.cd[ab.id] = k.now + 0.7;   // (a charged Pounce, Pack Leader: the hold costs no charge)
  // (the hold itself is not the move: a second press may come at once, and that one pounces)
  k.fx('whistle', { hound: 'all', kind: 'hold' });
}
// Whistle, second press: both hounds pounce, a hit each, and land behind
function hdPounce(k) {
  const e = hdEnemy(k), g = k.g;
  if (!e) return;
  g.holdUntil = 0; g.pouncing = true;
  const F = hdFace(k, e), ids = [];
  for (const h of hdLiveReal(k)) {
    if (h.mode === 'guard') continue;
    h.mode = 'pounce'; h.goal = 'behind'; h.ring = F + Math.PI; h.leapEnd = k.now + 1.3; h.orderUntil = k.now + 1.3; h.slot = null; ids.push(h.id);
  }
  k.fx('whistle', { hound: 'all', kind: 'pounce' });
  k.fx('pounce', { hounds: ids });
}
function hdLand(k, h, e) {
  h.mode = 'hold'; h.goal = 'behind'; h.orderUntil = k.now + HOUND.LAND_HOLD; h.driftAt = k.now + HOUND.LAND_HOLD + 4;
  if (e) k.damage(HOUND.POUNCE * (k.def.houndMult || 1), { ab: abBase(k, 'pounce') || HD_BITE, tgt: e.id !== 'dummy' ? e.id : undefined });
  k.stats.pounces = (k.stats.pounces || 0) + 1;
}
// every pouncer has landed: the pair they made (Pack Leader and the loot hook in here)
function hdAfterPounce(k) {
  const pair = hdPairNow(k);
  if (pair && k.def.pounceBond) k.gain('bond', k.def.pounceBond, 100);   // (Pack Leader: a pounce that forms a pair gives 20 Bond)
  if (k.talent('houndmaster_huntinghorn')) hdHorn(k);   // (Hunting Horn)
  if (pair && k.perk('houndmaster_w3')) {   // (Pounce: 10 Bond for every hound that lands in a pair)
    const n = hdLiveReal(k).filter(h => h.slot).length;
    k.gain('bond', 10 * n, 100);
  }
  k.stats.pounceKeeps = (k.stats.pounceKeeps || 0) + (pair === 'bringdown' ? 1 : 0);
}
// Call Off: both hounds run to you and stand guard
function hdCallOff(k, ab) {
  const g = k.g;
  if (k.talent('houndmaster_fetch')) hdFetch(k, ab);   // (Fetch: read the hounds' places before they set off)
  if (k.talent('houndmaster_guarddog') && hdLiveReal(k).length) { k.shield('self', 200, 8, { ab, tag: 'houndblock' }); k.fx('houndShield', { hound: hdLiveReal(k)[0].id }); }   // (Guard Dog: a hound takes the next hit)
  g.guardUntil = k.now + HOUND.GUARD;
  for (const h of hdLiveReal(k)) { h.mode = 'guard'; h.slot = null; h.safe = Math.max(h.safe, k.now + HOUND.GUARD + 0.2); if (k.perk('houndmaster_a2')) h.shield = true; }   // (Call Off's enhancement: a small shield on each)
  k.mitigate('self', HOUND.GUARD_DR, HOUND.GUARD, { ab });
  k.buff('guarded', HOUND.GUARD);
  if (k.talent('houndmaster_tagteam')) g.tagUntil = k.now + HDS.TAG;   // (Tag Team, Pack Leader: the next finisher after a Call Off counts every pair)
  k.fx('calloff');
  k.fx('whistle', { hound: 'all', kind: 'call' });
}
// the Pack Finisher: the pair decides the move. Wild Hunt: every pair at once (Bring Down's blow, Rend's bleed, Hamstring's weakness), free
function hdFinish(k, ab) {
  const e = hdEnemy(k), g = k.g, wild = hdWild(k), pair = hdPairNow(k);
  if (!wild) k.spend('bond', HOUND.COST);
  const tgt = e && e.id !== 'dummy' ? e.id : undefined;
  const key = wild ? 'bringdown' : pair || 'snap';
  const pot = { rend: HOUND.REND, hamstring: HOUND.HAMSTRING, bringdown: HOUND.BRING, snap: HOUND.SNAP }[key];
  const prev = g.lastFin ? g.lastFin.pair : null;
  const alpha = key === 'bringdown' && k.talent('houndmaster_alpha') && hdFullBond(k);   // (Alpha: both hounds at full Bond, and a Bring Down is a sure crit)
  k.damage(pot, { ab, tgt, autoCrit: alpha });
  if (wild || key === 'rend') {
    k.dot('rend', HOUND.REND_TICK, 6, 1.5, { ab: HD_BLEED, tgt });
    k.buff('rendbite', 6);   // (the loot: a bleed makes the bites hit harder)
  }
  if (wild || key === 'hamstring') k.debuffTarget('vuln', HOUND.HAM_VULN, HOUND.HAM_DUR, { ab });
  for (const h of hdLiveReal(k)) { h.bond = Math.max(0, h.bond - HOUND.COST); if (h.mode !== 'guard' && h.mode !== 'pounce') h.biteFxUntil = k.now + 0.4; }
  g.lastFin = { pair: key, at: k.now };
  if (alpha) k.stats.alphas = (k.stats.alphas || 0) + 1;
  // (Echo Bark: the same pair twice in a row, and the pack bites it again a moment later at 20%)
  if (k.talent('houndmaster_echobark') && prev === key && key !== 'snap') {
    k.after(0.4, () => { k.damage(pot * 0.2, { ab, tgt }); for (const h of hdLiveReal(k)) k.fx('bite', { hound: h.id, big: true }); k.stats.echoes = (k.stats.echoes || 0) + 1; });
  }
  // (Shared Kill: a finisher on a boss below 30% gives 20 Bond back)
  if (k.talent('houndmaster_sharedkill')) { const b = bossNow(k); if (b && b.hp != null && b.hp < 0.3) k.gain('bond', 20, 100); }
  // (item houndmaster_a4: a Snap brings a downed hound back on its feet at once)
  if (key === 'snap' && k.perk('houndmaster_a4')) for (const h of hdReal(k)) if (h.mode === 'down') hdRevive(k, h);
  k.stats.finishers = (k.stats.finishers || 0) + 1;
  k.stats['fin_' + key] = (k.stats['fin_' + key] || 0) + 1;
  k.fx('finisher', Object.assign({ pair: key }, wild ? { all: 1 } : null));
  return key;
}
// ---- the talents (talents.js TALENTS.houndmaster, rows I-V)
// Alpha: every hound the kit keeps has its own Bond full (a hound that is down is not full)
function hdFullBond(k) {
  const live = hdLiveReal(k);
  return live.length >= (k.def.hounds ? k.def.hounds.length : 2) && live.every(h => h.bond >= 99.5);
}
// Heel Nip: the third knife hit sends the hound nearer to it to the place that makes a pair with the other (a hold, a guard, a pounce or Wild Hunt leaves them be)
const HD_MATE = { left: ['right'], right: ['left'], front: ['behind'], behind: ['front', 'behind'] };
function hdNip(k) {
  const e = hdEnemy(k), live = hdLiveReal(k);
  if (!e || live.length !== 2 || hdWild(k) || hdHolding(k) || live.some(h => h.mode === 'guard' || h.mode === 'pounce')) return;
  const F = hdFace(k, e), goal = h => h.goal || (h.ring != null ? hdSlotOf(h.ring, F) : null);
  const ga = goal(live[0]), gb = goal(live[1]);
  if (!ga || !gb || hdPairOf([ga, gb])) return;
  let best = null;
  for (const [h, o] of [[live[0], live[1]], [live[1], live[0]]]) for (const s of HD_MATE[goal(o)]) {
    const d = Math.abs(hdWrap(F + HD_OFF[s] - Math.atan2(h.y - e.y, h.x - e.x)));
    if (!best || d < best.d) best = { h, s, d };
  }
  if (best) { hdOrder(k, best.h, best.s); k.stats.nips = (k.stats.nips || 0) + 1; }
}
// Fetch: Call Off drags you up to 150 toward the nearest hound, and never into the enemy
function hdFetch(k, ab) {
  const p = mariPos(k), e = hdEnemy(k), live = hdLiveReal(k);
  if (!live.length) return;
  let h = live[0];
  for (const x of live) if (Math.hypot(x.x - p.x, x.y - p.y) < Math.hypot(h.x - p.x, h.y - p.y)) h = x;
  const dist = Math.hypot(h.x - p.x, h.y - p.y), step = Math.min(150, dist - 40);
  if (step < 20) return;
  const dest = { x: p.x + (h.x - p.x) / dist * step, y: p.y + (h.y - p.y) / dist * step };
  if (e) {
    const keep = hdER(e) + 30, dd = Math.hypot(dest.x - e.x, dest.y - e.y);
    if (dd < keep) { dest.x = e.x + (dest.x - e.x) / (dd || 1) * keep; dest.y = e.y + (dest.y - e.y) / (dd || 1) * keep; }
  }
  kitMove(k, 'point', { ab, x: Math.round(dest.x), y: Math.round(dest.y), d: Math.round(step) });
}
// Howl: both hounds hold where they are (as Whistle: Hold's first press does, without its fx and cooldown), so the Hold button now pounces
function hdFreeze(k) {
  const e = hdEnemy(k);
  if (!e) return;
  k.g.holdUntil = k.now + HOUND.HOLD;
  const F = hdFace(k, e);
  for (const h of hdLiveReal(k)) {
    if (h.mode === 'guard' || h.mode === 'pounce') continue;
    if (!h.goal) { h.ring = Math.atan2(h.y - e.y, h.x - e.x); h.goal = hdSlotOf(h.ring, F); }
    h.mode = 'hold';
  }
}
// The Long Chase: the pack runs a lap round the enemy (fx 'longchase' lays four hits a third of a second apart), each quarter bites,
// and it ends in the Pack pair, both behind
function hdChase(k, ab) {
  const e = hdEnemy(k);
  if (!e) return;
  for (const h of hdLiveReal(k)) if (h.mode !== 'guard' && h.mode !== 'pounce') hdOrder(k, h, 'behind');
  for (let q = 1; q <= 4; q++) k.after(q * 0.31, () => {
    const live = hdLiveReal(k), en = hdEnemy(k);
    if (live.length && en) hdBite(k, live[(q - 1) % live.length], en, { mult: 250 / HOUND.BITE, bond: 4, big: true, ab });
  });
  k.stats.chases = (k.stats.chases || 0) + 1;
  k.fx('longchase');
}
// a telegraph about to land on a hound that is not safe (Call Off glows)
const hdDanger =k => !!k.env.danger && k.g.hounds.some(h => !h.spectral && h.mode !== 'down' && h.mode !== 'guard' && h.mode !== 'pounce' && k.now >= h.safe && k.env.danger(h.x, h.y, 1.5));
// one step toward a spot: round the ring (not through the enemy) when near it, straight otherwise
function hdMove(h, to, e, R, speed, dt) {
  let nx, ny;
  const hr = e ? Math.hypot(h.x - e.x, h.y - e.y) : 0;
  if (e && to.a != null && hr < R + 70 && hr > 20) {
    const cur = Math.atan2(h.y - e.y, h.x - e.x), da = hdWrap(to.a - cur), mx = speed * dt / Math.max(40, hr);
    const a = cur + Math.max(-mx, Math.min(mx, da)), r = hr + Math.max(-speed * dt * 0.8, Math.min(speed * dt * 0.8, R - hr));
    nx = e.x + Math.cos(a) * r; ny = e.y + Math.sin(a) * r;
  } else {
    const dx = to.x - h.x, dy = to.y - h.y, L = Math.hypot(dx, dy);
    if (L < 0.5) return false;
    const s = Math.min(L, speed * dt * (L > 200 ? 1.5 : 1));
    nx = h.x + dx / L * s; ny = h.y + dy / L * s;
  }
  const moved = Math.hypot(nx - h.x, ny - h.y);
  if (moved > 0.4) h.face = Math.atan2(ny - h.y, nx - h.x);
  h.x = nx; h.y = ny;
  return moved > 0.4;
}
function hdTick(k) {
  const g = k.g, now = k.now, dt = now - (g.lastT ?? now);
  g.lastT = now;
  const p = mariPos(k), e = hdEnemy(k);
  if (!g.hounds.length) hdSpawn(k, p);
  if (!(dt > 0 && dt < 0.5)) { hdShare(k); return; }
  g.all = hdWild(k);
  if (g.spectralUntil && now >= g.spectralUntil) { g.hounds = g.hounds.filter(h => !h.spectral); g.spectralUntil = 0; g.huntUntil = 0; }
  if (g.guardUntil && now >= g.guardUntil) { g.guardUntil = 0; for (const h of g.hounds) if (h.mode === 'guard') h.mode = 'run'; }
  const near = !!e && Math.hypot(e.x - p.x, e.y - p.y) < 900;
  const er = e ? hdER(e) : 70, R = er + HOUND.RING, F = e ? hdFace(k, e) : 0;
  let turned = false;
  if (e) { if (g.face0 == null) g.face0 = F; if (Math.abs(hdWrap(F - g.face0)) > HOUND.TURN) { turned = true; g.face0 = F; } }
  const held = hdHolding(k), engaged = now - k.engagedAt <= ENGINE.AUTO_ENGAGE && (!k.env.canAuto || k.env.canAuto());
  let pouncers = 0;
  g.hounds.forEach((h, i) => {
    if (h.mode === 'down') { if (now < h.downUntil) return; hdRevive(k, h); }
    h.hp = Math.min(h.maxHp, h.hp + HOUND.REGEN * dt);
    let to, speed = HOUND.SPEED, ringed = false;
    if (h.mode === 'guard') { to = now < (g.mountUntil || 0) ? { x: p.x, y: p.y + 6 } : { x: p.x + (i % 2 ? 34 : -34), y: p.y + 22 }; speed = HOUND.GUARD_SPEED; }   // (mounted: Greyfang is under you)
    else if (e && near) {
      const locked = held || now < h.orderUntil || h.mode === 'pounce';
      if (locked && h.goal) { h.ring = F + HD_OFF[h.goal]; h.driftAt = Math.max(h.driftAt, now + HOUND.DRIFT[0] + k.rng() * (HOUND.DRIFT[1] - HOUND.DRIFT[0])); }
      else if (!locked) {
        if (turned) h.driftAt = Math.min(h.driftAt, now + 0.4 + k.rng() * 0.8);
        if (h.ring == null || now >= h.driftAt) { h.goal = hdDriftGoal(k); h.ring = F + HD_OFF[h.goal]; h.driftAt = now + HOUND.DRIFT[0] + k.rng() * (HOUND.DRIFT[1] - HOUND.DRIFT[0]); }
      }
      const a = h.ring + (h.spectral ? 0 : h.spread);
      to = { x: e.x + Math.cos(a) * R, y: e.y + Math.sin(a) * R, a };
      ringed = true;
      if (h.mode === 'pounce') speed = HOUND.LEAP;
    } else { to = { x: p.x + (i % 2 ? 46 : -46), y: p.y + 30 }; h.ring = null; h.goal = null; }
    const moved = hdMove(h, to, ringed ? e : null, R, speed, dt);
    if (k.env.collide) k.env.collide(h, 14);
    const arrived = ringed && Math.hypot(h.x - to.x, h.y - to.y) <= HOUND.ARRIVE;
    h.slot = arrived ? hdSlotOf(h.ring, F) : null;
    if (moved && !arrived && ringed && !h.spectral && k.talent('houndmaster_runningbond')) {   // (Running Bond: 5 Bond a second for each hound on its way to a new place, paid out in whole points)
      g.runBond = (g.runBond || 0) + 5 * dt;
      if (g.runBond >= 1) { const n = Math.floor(g.runBond); g.runBond -= n; k.gain('bond', n, 100); }
    }
    if (!moved && e) h.face = Math.atan2(e.y - h.y, e.x - h.x);
    if (h.mode === 'pounce') {
      if (arrived || now >= h.leapEnd) hdLand(k, h, e); else pouncers++;
    }
    if (h.mode !== 'guard' && h.mode !== 'pounce') h.mode = now < h.biteFxUntil ? 'bite' : (held || now < h.orderUntil) ? 'hold' : 'run';
    // the hound's own bite
    if (e && h.mode !== 'guard' && h.mode !== 'pounce' && now >= h.biteAt) {
      if (engaged && Math.hypot(h.x - e.x, h.y - e.y) <= er + HOUND.REACH) {
        hdBite(k, h, e);
        h.biteAt = now + (h.spectral ? HOUND.WILD_EVERY : HOUND.BITE_EVERY) / (hdQuarry(k) ? HOUND.QUARRY_FAST : 1) * k.hasteMult();
      } else h.biteAt = now + 0.25;
    }
  });
  if (g.pouncing && !pouncers) { g.pouncing = false; hdAfterPounce(k); }
  g.pair = hdPairNow(k) || (g.all ? 'bringdown' : null);
  hdShare(k);
}
// tell the world where the hounds are (the host judges telegraphs on them; other players draw them)
function hdShare(k) {
  if (!k.env.hounds) return;
  k.env.hounds(k.g.hounds.map(h => ({ id: h.id, x: Math.round(h.x), y: Math.round(h.y), face: +h.face.toFixed(2), slot: h.slot, mode: h.mode, spectral: h.spectral,
    hp: Math.round(h.hp), maxHp: h.maxHp, bond: Math.round(h.bond), shield: !!h.shield, ring: h.ring == null ? null : +h.ring.toFixed(2) })));
}

KITS.houndmaster = {
  potMult: 1.06,   // balance knob (tools/simulate.js)
  auto: { kind: 'slash', potency: 40, range: MELEE },
  gauge: { kind: 'pack', key: 'bond', max: 100, label: 'Bond', w: 190 },
  init: () => ({ hounds: [], pair: null, bond: 0, holdUntil: 0, markUntil: 0, huntUntil: 0, mountUntil: 0, guardUntil: 0, next: 'rust', step: 0, comboUntil: 0, all: false, spectralUntil: 0, face0: null, lastT: null }),
  tick: k => hdTick(k),
  onNotify(k, type, d) { if (type === 'houndhit') hdHit(k, d); },
  signature: 'The Pack',
  floor: 'Press Q for the combo. E when it glows. W when it glows, with the cursor off to a side of the boss. D when a hound stands in the red. F with the party\'s burst.',
  ceiling: [
    'Your hounds bite on their own and stand where they like: every few seconds each one picks a flank again, so left and right (a pincer) happens about half the time. Whatever pair they hold when you press E is your finisher.',
    'Pincer (a hound on each flank) is Rend, front and back is Hamstring, both behind is Bring Down. Anything else, Snap. Whistle: Flank sends the next hound to the side of the boss your cursor is over; with the cursor on the boss, the flank nearest you. Shift sends the other hound.',
    'When the boss turns, free hounds drift round with it and pick again. Whistle: Hold keeps them where they are through a turn; pressed again they pounce, hit, and land behind: Bring Down.',
    'Bring Down before Mark the Quarry, Hamstring before the party\'s burst so its weakness is up, Rend the rest of the time. Bond is built by every bite and spent 40 at a time: do not let it sit at full.',
    'Hounds take the boss\'s red like a pet: a hound caught in it goes down for 10s. Call Off sends them to you, and you take less damage while they guard.',
  ],
  abilities: [
    {
      id: 'knife', name: 'Hunting Knife', type: 'gcd', target: 'enemy', range: MELEE, lock: 0.3, anim: 'attack',
      desc: 'Three-hit combo on one button: Slash ({d:160}) > Skin ({d:180}) > Gut ({d:230}). The third hit lets both hounds bite at once, and every bite builds Bond.',
      label: k => ['Slash', 'Skin', 'Gut'][hdStep(k)],
      fxStep: k => hdStep(k),
      effect(k) {
        const step = hdStep(k);
        k.damage([160, 180, 230][step], { ab: this });
        if (step === 2) { hdBiteAll(k, { bond: HOUND.KNIFE_BOND, big: true }); if (k.talent('houndmaster_heelnip')) hdNip(k); k.g.step = 0; } else k.g.step = step + 1;
        k.g.comboUntil = k.now + 15;
      },
      fx: { type: 'slash', color: '#c9b18a', r: 52, span: 1.5 },
    },
    {
      id: 'flank', name: 'Whistle: Flank', type: 'ogcd', target: 'none', cd: 1, lock: 0.3, anim: 'cast',
      desc: 'Send the next hound (Rust, then Ash; hold Shift for the other) to where you point: the side of the boss nearest your cursor. With the cursor on the boss it takes the flank nearest you. The hound stays there through the boss\'s turns for 10s. It glows when a hound stands in front of the boss, or when the two hounds make no pair.',
      usable: k => !!hdEnemy(k) && hdLiveReal(k).length > 0,
      glow: k => !k.g.all && (k.g.hounds.some(h => !h.spectral && h.slot === 'front') || (hdLiveReal(k).length >= 2 && !k.g.pair)),
      effect(k) { hdWhistle(k); },
      fx: { type: 'aura', color: '#e8d9a8', r: 30, dur: 0.8 },
    },
    {
      id: 'finisher', name: 'Pack Finisher', type: 'gcd', target: 'enemy', range: HD_FAR.range,   // (the hounds do the biting: from anywhere)
      lock: 0.3, anim: 'big',
      desc: `Spend 40 Bond, from any range: the hounds do the biting. The move is whichever pair they hold. <b>Rend</b> (the hounds on both flanks): {d:${HOUND.REND + 4 * HOUND.REND_TICK}} with a bleed. <b>Hamstring</b> (front and behind): {d:${HOUND.HAMSTRING}}, and the boss takes 5% more damage for ${HOUND.HAM_DUR}s. ` +
        `<b>Bring Down</b> (both behind): {d:${HOUND.BRING}}. No pair: <b>Snap</b>, {d:${HOUND.SNAP}}. It glows with 40 Bond and a pair held.`,
      label: k => HD_NAMES[hdWild(k) ? 'bringdown' : hdPairNow(k) || 'snap'],
      usable: k => hdWild(k) || (k.g.bond || 0) >= HOUND.COST,
      glow: k => (hdWild(k) || (k.g.bond || 0) >= HOUND.COST) && !!k.g.pair,
      effect(k) { hdFinish(k, this); },
      fx: { type: 'slash', color: '#c46a3a', r: 70, span: 2.2 },
    },
    {
      id: 'pounce', name: 'Whistle: Hold', type: 'ogcd', target: 'none', cd: 10, lock: 0.3, anim: 'cast',
      desc: `Tap: both hounds hold their spot, and will not drift when the boss turns or moves (${HOUND.HOLD}s). Press again: both pounce for {d:${HOUND.POUNCE}} each and land behind the boss, which is a Bring Down pair. The cooldown starts with the pounce.`,
      label: k => (hdHolding(k) ? 'Pounce' : 'Whistle: Hold'),
      usable: k => !!hdEnemy(k) && hdLiveReal(k).length > 0,
      glow: k => hdHolding(k) && k.g.pair !== 'bringdown',
      effect(k) { if (hdHolding(k)) hdPounce(k); else hdHold(k, this); },
      fx: { type: 'aura', color: '#c46a3a', r: 34, dur: 0.8 },
    },
    {
      id: 'calloff', name: 'Call Off', type: 'ogcd', target: 'none', cd: 15, lock: 0.3, anim: 'cast',
      desc: `Both hounds sprint to you and stand guard for ${HOUND.GUARD}s: you take 20% less damage, and nothing can touch them. A hound caught in a boss telegraph goes down for ${HOUND.RESPAWN}s, so this is what saves them. It glows when a telegraph is about to land on a hound.`,
      usable: k => hdLiveReal(k).length > 0,
      glow: k => hdDanger(k),
      effect(k) { hdCallOff(k, this); },
      fx: { type: 'aura', color: '#b8b2a8', r: 40, dur: 1.2 },
    },
    {
      id: 'quarry', name: 'Mark the Quarry', type: 'ogcd', target: 'none', cd: 60, lock: 0.4, anim: 'big',
      desc: `Tie a red cloth on the boss: for ${HOUND.QUARRY}s the hounds bite 50% faster and every Bond you gain is doubled. Both hounds bite at once as you do it.`,
      usable: k => !!hdEnemy(k),
      effect(k) {
        k.g.markUntil = k.now + HOUND.QUARRY; k.buff('quarry', HOUND.QUARRY);
        if (k.talent('houndmaster_drive')) hdHoldAll(k, k.g.markUntil, true);   // (Drive: the hounds hold their places for the whole Mark)
        if (k.talent('houndmaster_cornered')) k.after(HOUND.QUARRY, () => { if (hdLiveReal(k).length) hdPounce(k); });   // (Cornered: the Mark ends in a pounce from both hounds)
        hdBiteAll(k);
        k.fx('quarry');
      },
      fx: { type: 'aura', color: '#c46a3a', r: 46, dur: 1.5 },
    },
  ],
};

// Wild Hunt (T, a 10s window). Fills from the Bond a finisher spends. Four spectral hounds come out of the dark and take the four
// sides of the enemy: every pair counts as all three at once (the Pack Finisher is Bring Down's blow with Rend's bleed and
// Hamstring's weakness as well), and the finisher costs no Bond. The spectral hounds bite too.
ULTIMATES.houndmaster = {
  id: 'wildhunt', name: 'Wild Hunt', slot: 7, type: 'ogcd', ult: true, mode: 'window', target: 'enemy', range: RANGED, anim: 'big', icon: 'wildhunt',
  lock: 0.8, dr: 0.3,
  burst: 'quarry',   // (bots open it with Mark the Quarry up)
  charge: { rate: 0.3, keep: 0.5, spend: { bond: 0.07 } },
  botOk: k => hdLiveReal(k).length > 0 && !!hdEnemy(k),
  desc: `The pack answers the horn. Four spectral hounds take the four sides of your target for ${HOUND.WILD_DUR}s and bite as they stand. Every pair counts as all three at once: the Pack Finisher is Bring Down's {d:${HOUND.BRING}} with Rend's bleed and Hamstring's weakness as well, and it costs no Bond. ` +
    'You take 30% less damage and can\'t be knocked back while you sound the horn.' +
    '<div class="it-ult"><span><u>Charge:</u> 7% for every 100 Bond a finisher spends, and a little on its own while you fight. It never drains; a fall keeps half.</span></div>',
  effect(k) {
    const g = k.g, e = hdEnemy(k), p = mariPos(k);
    g.hounds = g.hounds.filter(h => !h.spectral);
    g.spectralUntil = k.now + HOUND.WILD_DUR + 0.2; g.huntUntil = k.now + HOUND.WILD_DUR;
    ['left', 'right', 'front', 'behind'].forEach((slot, i) => {
      const h = hdMake(k, 'sp' + i, i, p, { spectral: true, goal: slot, spread: 0, orderUntil: k.now + HOUND.WILD_DUR + 5, hp: 1, maxHp: 1, biteAt: k.now + 0.8 + i * 0.3 });
      h.ring = (e ? hdFace(k, e) : 0) + HD_OFF[slot];
      g.hounds.push(h);
    });
    if (k.perk('houndmaster_w7') && e) for (let i = 0; i < 4; i++) k.damage(HOUND.POUNCE, { ab: HD_BITE, tgt: e.id !== 'dummy' ? e.id : undefined });   // (the loot: the pack opens with a pounce)
    k.fx('wildhunt');
  },
  window: {
    dur: HOUND.WILD_DUR,
    onEnd(k) { k.g.spectralUntil = k.now + (k.talent('houndmaster_kingofpack') ? 4 : 0.01); },   // (King of the Pack: the spectral hounds stay 4s more)
  },
};

// talents that grant a new move (row III's Howl in Whistle: Flank's place, row V's The Long Chase in Mark the Quarry's)
TALENT_ABILITIES.houndmaster_howl = { cls: 'houndmaster', ab: {
  id: 'howl', replaces: 'flank', icon: 'howl', name: 'Howl', type: 'ogcd', target: 'none', cd: 25, lock: 0.4, anim: 'cast', talent: true,
  desc: `Both hounds throw back their heads: the whole party deals 5% more damage for 8s, and both hounds hold where they stand (${HOUND.HOLD}s). Press the Hold button to pounce from there.`,
  usable: k => hdLiveReal(k).length > 0,
  effect(k) {
    k.partyBuff('dmg', 0.05, 8, { ab: this });
    hdFreeze(k);
    k.fx('howl');
  },
  fx: { type: 'ring', color: '#fff4d0', r: 60 },
} };
TALENT_ABILITIES.houndmaster_longchase = { cls: 'houndmaster', ab: {
  id: 'longchase', replaces: 'quarry', icon: 'longchase', name: 'The Long Chase', type: 'ogcd', target: 'none', cd: 45, lock: 0.4, anim: 'big', talent: true,
  desc: 'Send the pack on a lap round the boss: each quarter it passes bites for {d:250} and gives 4 Bond, and the lap ends with both hounds behind the boss, which is a Bring Down pair.',
  usable: k => !!hdEnemy(k) && hdLiveReal(k).length > 0,
  effect(k) { hdChase(k, this); },
  fx: { type: 'aura', color: '#c46a3a', r: 46, dur: 1.5 },
} };

// ---------------------------------------------------------------- Houndmaster: the specs (specs.js SPECS.houndmaster) and their talent rows VI-VII (talents.js SPEC_TALENTS.houndmaster)
// Pack Leader: Pounce keeps two charges and a pounce that lands in a pair gives 20 Bond (k.def.pounceBond); Call Off is Relay, the two hounds
//   trade places (and bite as they break away); Harmony (hdHarmony, the spec's dmgMod) makes a finisher on a pair you did not use last time hit 10% harder.
// Lone Wolf: Greyfang alone (k.def.hounds, solo, houndHp, houndMult), the pair is its place and yours, One Heart gives half as much Bond again for its bites
//   (k.def.bondMult), and Whistle: Flank is Mount: for 6s Greyfang is under you, you run quicker (k.def.moveMult), the knife is a mounted charge,
//   and the same button is Ride Down (the bar swaps to it, hdSyncBar), which ends the ride with a blow. The cooldown starts with the dismount.
const HDS = { RELAY_SAFE: 1.6, LITTER: 0.2, HORN: 1.5, TAG: 20, MOUNT: 6, PAUSE: 0.5, CHARGE: 260, RIDE: 550, LEAP: 220, SPEED: 1.5, HARMONY: 0.1 };
const hdMounted = k => k.now < (k.g.mountUntil || 0);
const hdRelayed = k => (k.g.relayHold && k.now < k.g.relayHold.until ? k.g.relayHold.pair : null);

// Relay: the two hounds trade places (each keeps its order for as long as one lasts), safe on the way, and both bite as they break away
function hdRelay(k, ab) {
  const e = hdEnemy(k), live = hdLiveReal(k), g = k.g;
  if (!e || live.length < 2) return;
  const F = hdFace(k, e), [a, b] = live;
  g.relayHold = { pair: hdPairNow(k), until: k.now + HDS.RELAY_SAFE };   // (the pair holds through the swap: the finisher right after a Relay still has it)
  const slotOf = h => h.goal || hdSlotOf(Math.atan2(h.y - e.y, h.x - e.x), F);
  const sa = slotOf(a), sb = slotOf(b);
  for (const [h, to] of [[a, sb], [b, sa]]) {   // (not hdOrder: a Relay does not lock the hounds for ten seconds, only long enough to get there)
    h.goal = to; h.ring = F + HD_OFF[to]; h.slot = null; h.orderUntil = Math.max(h.orderUntil, k.now + 3); h.driftAt = Math.max(h.driftAt, k.now + 5);
    if (h.mode !== 'guard') h.mode = 'run';
    h.safe = Math.max(h.safe, k.now + HDS.RELAY_SAFE);
  }
  hdBiteAll(k, { big: true });
  g.relayAt = k.now;
  k.stats.relays = (k.stats.relays || 0) + 1;
  k.fx('relay');
}
// Harmony: a finisher on a pair you did not use last time (and its bleed) hits 10% harder
function hdHarmony(k, o) {
  const ab = o && o.ab;
  if (!ab || !k.def.harmony) return 0;
  if (ab.id === 'finisher' && !o.dot) {
    const key = hdWild(k) ? 'bringdown' : hdPairNow(k) || 'snap', l = k.g.lastFin;
    k.g.harm = !l || l.pair !== key;
  }
  return (ab.id === 'finisher' || ab.id === 'rend') && k.g.harm ? HDS.HARMONY : 0;
}
// after any move of a spec: the finisher's riders (Tag Team, Pincer Drill)
function hdSpecAfter(k, ab) {
  if (ab.id !== 'finisher' || !k.g.lastFin) return;
  const g = k.g, e = hdEnemy(k), tgt = e && e.id !== 'dummy' ? e.id : undefined, key = g.lastFin.pair, wild = hdWild(k);
  let rend = wild || key === 'rend';
  if (k.talent('houndmaster_tagteam') && k.now < (g.tagUntil || 0)) {   // (Tag Team: after a Call Off the next finisher counts every pair: its own blow, with Rend's bleed and Hamstring's weakness)
    g.tagUntil = 0;
    if (!rend) { k.dot('rend', HOUND.REND_TICK, 6, 1.5, { ab: HD_BLEED, tgt }); k.buff('rendbite', 6); rend = true; }
    if (!wild && key !== 'hamstring') k.debuffTarget('vuln', HOUND.HAM_VULN, HOUND.HAM_DUR, { ab });
    k.stats.tagTeams = (k.stats.tagTeams || 0) + 1;
  }
  if (rend && e && k.talent('houndmaster_pincerdrill')) {   // (Pincer Drill: Rend's bleed jumps to an add)
    const ad = hdAddNear(k, e);
    if (ad) { k.dot('rend2', HOUND.REND_TICK, 6, 1.5, { ab: HD_BLEED, tgt: ad.id }); k.stats.drills = (k.stats.drills || 0) + 1; }
  }
}
// Littermates: one hound bites, and the other bites too one time in five
function hdLitter(k, h, e) {
  if (k.rng() >= HDS.LITTER) return;
  const o = hdLiveReal(k).find(x => x !== h && x.mode !== 'guard' && x.mode !== 'pounce' && Math.hypot(x.x - e.x, x.y - e.y) <= hdER(e) + HOUND.REACH);
  if (!o) return;
  hdBite(k, o, e, { echo: true, bond: 0 });
  k.stats.litters = (k.stats.litters || 0) + 1;
}
// Hunting Horn: a pounce that has landed sounds the horn: the boss's face swings toward you for a beat (the host, fight.js 'horn'), and the hounds
// keep to the side it faced when the horn sounded, so the swing does not send them round the boss
function hdHorn(k) {
  const e = hdEnemy(k);
  if (!e) return;
  k.g.hornFace = hdFace(k, e); k.g.hornUntil = k.now + HDS.HORN + 0.3;
  k.env.emit({ type: 'horn', dur: HDS.HORN });
  k.stats.horns = (k.stats.horns || 0) + 1;
}
// Fang and Knife: a knife hit makes the next bite of Greyfang's double
function hdFang(k, h) { if (k.g.fang > k.now && !h.spectral) { k.g.fang = 0; return 2; } return 1; }

// ---- Lone Wolf: the ride
// Mount: Greyfang goes under you for a few seconds. The cooldown is left for the dismount to start (Ride Down's own press does, or the ride running out)
function hdMount(k, ab) {
  const g = k.g, p = mariPos(k), dur = HDS.MOUNT + (k.talent('houndmaster_saddleborn') ? 2 : 0);
  g.mountUntil = k.now + dur; g.mountAt = k.now; g.pouncing = false; g.holdUntil = 0;
  for (const h of hdLiveReal(k)) { h.mode = 'guard'; h.slot = null; h.goal = null; h.ring = null; h.x = p.x; h.y = p.y + 6; h.safe = Math.max(h.safe, g.mountUntil + 0.3); }
  k.buff('mounted', dur);
  k.cd[ab.id] = k.now + HDS.PAUSE;
  k.stats.mounts = (k.stats.mounts || 0) + 1;
  k.fx('mount');
  hdSyncBar(k);
}
// the ride ends (Ride Down, or it ran out): Greyfang is back on its feet at your side and picks a flank
function hdDismount(k, rode) {
  const g = k.g;
  if (!g.mountUntil) return;
  g.mountUntil = 0; k.clear('mounted');
  const p = mariPos(k);
  for (const h of hdLiveReal(k)) {
    if (h.mode === 'guard' && !(k.now < (g.guardUntil || 0))) h.mode = 'run';
    h.x = p.x; h.y = p.y + 6; h.goal = null; h.ring = null; h.driftAt = 0; h.orderUntil = 0; h.biteAt = Math.max(h.biteAt, k.now + 1); h.safe = Math.max(h.safe, k.now + 0.6);
  }
  const mt = k.abById('mount');
  if (!rode && mt) k.cd[mt.id] = Math.max(k.cd[mt.id] || 0, k.now + k.recast(mt));
  hdSyncBar(k);
}
// the mounted charge: your blow, and Greyfang under you bites with it
function hdMountedCharge(k, ab) {
  k.damage(HDS.CHARGE, { ab });
  const e = hdEnemy(k), h = hdLiveReal(k)[0];
  if (e && h) hdBite(k, h, e, { bond: HOUND.KNIFE_BOND, big: true });
}
// Ride Down: the leap off, a blow at the enemy; with Leap Off you land where you aim
function hdRideDown(k, ab) {
  const e = hdEnemy(k), tgt = e && e.id !== 'dummy' ? e.id : undefined;
  k.damage(HDS.RIDE, { ab, tgt });
  if (k.talent('houndmaster_leapoff')) {   // (Leap Off: short of the cursor, but no further than a leap)
    const aim = k.env.aim ? k.env.aim() : null, p = mariPos(k);
    if (aim) {
      const d = Math.hypot(aim.x - p.x, aim.y - p.y), L = Math.min(d, HDS.LEAP);
      if (L > 30) kitMove(k, 'point', { ab, x: Math.round(p.x + (aim.x - p.x) / d * L), y: Math.round(p.y + (aim.y - p.y) / d * L), d: Math.round(L) });
    }
  }
  k.stats.rideDowns = (k.stats.rideDowns || 0) + 1;
  hdDismount(k, true);
  k.fx('ridedown');
}
// the bar while you ride: Mount's button is Ride Down (same slot and cooldown, its own name and icon; other players are told 'ridedown')
const HD_RIDE = new WeakMap();
function hdRideFace(a) {
  let f = HD_RIDE.get(a);
  if (!f) {
    f = Object.defineProperties({}, Object.getOwnPropertyDescriptors(a));
    const set = (n, v) => Object.defineProperty(f, n, { value: v, writable: true, configurable: true, enumerable: true });
    set('name', 'Ride Down'); set('icon', 'ridedown'); set('fxId', 'ridedown'); set('target', 'enemy'); set('range', RANGED); set('anim', 'big');
    set('desc', `Leap off Greyfang at the enemy for {d:${HDS.RIDE}}. The ride ends and Mount's cooldown starts.`);
    set('usable', k => !!hdEnemy(k)); set('glow', () => true);
    set('effect', function (k) { hdRideDown(k, this); });
    set('fx', { type: 'slash', color: '#b8b2a8', r: 66, span: 2.2 });
    HD_RIDE.set(a, f);
  }
  return f;
}
function hdSyncBar(k) {
  if (!k.def.solo) return;
  const base = k.baseAbilities, want = hdMounted(k) ? base.map(a => (a.id === 'mount' ? hdRideFace(a) : a)) : base;
  if (k.abilities.length === want.length && k.abilities.every((a, i) => a === want[i])) return;
  k.swapBar(want);
}
// every tick of a spec: the ride running out, Greyfang kept under you, the bar following
function hdSpecTick(k) {
  const g = k.g;
  if (g.mountUntil) {
    if (k.now >= g.mountUntil) hdDismount(k, false);
    else for (const h of hdLiveReal(k)) if (h.mode !== 'guard') h.mode = 'guard';
  }
  hdSyncBar(k);
}
if (typeof module !== 'undefined') Object.assign(module.exports, { HDS, hdDanger, hdMountedCharge, hdMounted, hdRelay, hdHarmony, hdSpecAfter, hdMount, hdDismount, hdRideDown, hdRideFace, hdSyncBar, hdSpecTick });

if (typeof module !== 'undefined') Object.assign(module.exports, { HOUND, HD_OFF, hdHolding, hdPairOf, hdSlotOf, hdTick, hdWrap, hdLiveReal, hdWild, hdPairNow, hdOrder, hdDown, hdHit, hdEnemy, hdFace });

// every tank's taunt carrier (TAUNT_CARRY, next to TAUNT): a spec's kit copies it from the base kit (specs.js specKit)
for (const [cls, id] of Object.entries(TAUNT_CARRY)) if (KITS[cls]) KITS[cls].tauntOn = id;
// ... and its Ultimate (ULTIMATES, next to TAUNT), copied the same way
for (const [cls, u] of Object.entries(ULTIMATES)) if (KITS[cls]) KITS[cls].ultimate = u;
