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
    },
    onExpire(k, id, b) { reaverExpire(k, id, b); },
  },

  runeguard: {
    potMult: 0.65, // balance knob (tools/simulate.js)
    auto: { kind: 'runebash', potency: 40, range: MELEE },  // passive auto-attack (see ENGINE.AUTO_EVERY); a rune-shield bash (AUTO_VFX.runebash)
    gauge: { kind: 'runes', key: 'runes', max: 3, label: 'Runes' },
    init: () => ({ runes: 0 }),
    dmgMod: k => (k.has('overload') ? 0.1 : 0),
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
        usable: k => k.g.runes >= 1 || runeEmergency(k),
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
        glow: k => k.has('markself'),
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
          bladeCombo(k, r.posHit ? 2 : 1);
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
        k.selfDamage(k.perk('pyromancer_a2') ? 0.075 : 0.15);
        k.buff('burnt', 5);
        k.stats.overheats = (k.stats.overheats || 0) + 1;
        k.fx('overheat');
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
          if (hs && k.talent('pyromancer_twin')) { const ab = this; k.after(0.35, () => { k.damage(pot * 0.1, { ab, extra: true }); k.fx('twinFlame'); }); }
          if (hs && k.talent('pyromancer_chain') && !k.has('hotstreak') && k.now >= (k.g.chainAt || 0)) { k.g.chainAt = k.now + 10; k.buff('heating', 15); k.fx('chainReact'); }
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
          if (k.talent('pyromancer_flashpoint') && k.g.heat >= 85) { k.g.heat -= 30; k.damage(120, { ab: this, extra: true }); k.fx('flashpoint'); }
          else k.gain('heat', 6, 100);
        },
        fx: { type: 'ring', color: '#ffb03a', r: 40, range: RANGED },
      },
      {
        id: 'combust', name: 'Combustion', type: 'ogcd', target: 'self', cd: 60, anim: 'big',
        desc: 'Burst: for 10s everything you cast crits. Every Hot Streak Pyroblast in it makes it burn 1s longer (up to 4s).',
        effect(k) {
          const dur = (k.perk('pyromancer_a4') ? 13 : 10) + (k.talent('pyromancer_longburn') ? 3 : 0);
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
    potMult: 0.9, // balance knob (tools/simulate.js)
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
      'A Mend counts as half a Petal toward Dawnstar, worth {d:158} of it: less than the {d:280} Smite you gave up for it. Heal with Petals, Benediction and Prayer Circle first; Mend is the last resort.',
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
        desc: '1.8s cast: heals one ally for {h:700}. Counts as half a Petal toward Dawnstar.',
        effect(k, t) { k.consume('quickmend'); k.heal(t, 700, { ab: this }); clericBloom(k, 0.5); clericUltGain(k, 'mend', t); },
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
        id: 'intervene', name: 'Intervention', type: 'gcd', target: 'ally', cast: 2.5, cd: 30, anim: 'big', allowDead: true,
        desc: '2.5s cast: bring a fallen ally back to life, or heal a living one for {h:1200}.',
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
        while (r.ticks > 0 && k.now >= r.next) { r.ticks--; r.next += 3; groveGain(k, k.perk('grovekeeper_a2') ? 7 : 5); }
        if (r.ticks <= 0 && k.talent('grovekeeper_blossom')) { k.heal(r.t, 300, { ab: k.abilities.find(a => k.baseId(a) === 'rejuv') }); k.fx('lastBlossom', { to: typeof r.t === 'number' ? r.t : null }); }
      }
      k.g.rejuvs = k.g.rejuvs.filter(r => r.ticks > 0);
      groveTick(k);
    },
    signature: 'Planting heals early',
    floor: 'Press Q to attack and E to keep thorns on the boss. W on hurt allies; R and D when the whole party is hurt.',
    ceiling: [
      'Rejuvenate heals over 15 seconds. Put it on BEFORE damage lands so nothing is wasted, then attack while it works.',
      'Every Rejuvenate tick grows Bloom. Spend it on Bloom for a big instant burst of healing that also makes your next Wrath instant and stronger.',
      'Keep Thornlash up on the boss: every tick grows 2 Bloom, so the thorns feed your heals. Refresh it when it glows, in its last third (up to 9s carries over). It\'s also your instant attack while moving.',
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
        desc: 'Instant: thorns that hit the target for {d:120}, then {d:60} every 3s for 30s. Every tick grows 2 Bloom. Refreshing it keeps up to 9s of what was left.',
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
        desc: 'Spend 50 Bloom: instantly heal everyone with your Rejuvenate for {h:400} (and the whole party for {h:350} during Wild Growth). Your next Wrath is instant.',
        usable: k => k.g.bloom >= 50,
        glow: k => k.g.bloom >= 90,
        effect(k) {
          k.spend('bloom', 50);
          if (k.has('growth')) k.heal('party', 350, { ab: this });
          for (const r of k.g.rejuvs) k.heal(r.t, 400, { ab: this });
          if (!k.g.rejuvs.length && !k.has('growth')) k.heal(k.talent('grovekeeper_roots') ? 'lowest' : 'self', 400, { ab: this });
          k.buff('awaken', 15);
          groveBloom(k, this);
        },
        fx: { type: 'ring', color: '#a8ff9a', r: 150 },
      },
      {
        id: 'rebirth', name: 'Rebirth', type: 'gcd', target: 'ally', cd: 30, anim: 'big', allowDead: true, allyBuff: 'wildheart',
        cast: k => (groveRebirthDead(k) ? 2.5 : 0),
        desc: '2.5s cast: bring a fallen ally back. On a living ally it is instant: it heals them for {h:1100} and fills them with Wildheart, 10% more damage dealt for 12s. Spend it on a damage dealer in the burst, or keep it for the raise.',
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
        desc: 'Set an ally\'s HP back to its highest point in the last 4s (revives them if they died in that time). They become your link. In Haste it costs 25 Flux instead of a charge (while you have the Flux), and that Flux feeds Paradox.',
        effect(k, t) {
          chronoRewindCost(k, this);
          k.rewind(t, k.perk('chronomancer_a4') ? 6 : 4, { ab: this }); k.g.link = t; k.ultGain(2); /* (Time Reversal) */ if (k.perk('chronomancer_w2')) k.shield(t, 250, 8, { ab: this }); if (k.talent('chronomancer_hourglass')) k.mitigate(t, 0.15, 6, { ab: this });
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
        cast: k => (k.talent('chronomancer_lastmoment') && chronoLate(k) ? 0 : 2.5),   // (Last Moment, a talent)
        desc: '2.5s cast: bring a fallen ally back, or heal a living one for {h:1400}.',
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
const bastionCanEdge = k => k.has('turned') || k.g.resolve >= bastionCost(k);
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
  if (step === 2 && k.talent('bastion_echo')) { k.damage(75, { ab }); k.heal('self', 60, { ab }); k.fx('edgeShard'); }
  k.g.step = (step + 1) % 3; k.g.comboUntil = k.now + 15;
  if (countered && step < 2 && k.talent('bastion_rhythm')) k.g.step = 2;
}
// after Holy Edge / Shield Bash: its heal (Shared Mercy) and Returning Edge
function bastionEdge(k, ab, pot) {
  if (k.talent('bastion_mercy') && hpOf(k) > 0.7) k.heal('lowest', 240, { ab });
  else k.heal('self', 120, { ab });
  if (k.talent('bastion_returning')) k.after(0.8, () => { k.damage(pot * 0.1, { ab }); k.fx('edgeReturn'); });
}
// Bulwark / Zealous Guard
function bastionGuard(k, ab) {
  if (k.talent('bastion_unbreakable')) k.buff('unbreak', 10);
  if (k.talent('bastion_shelter')) k.mitigate('party', 0.1, 4, { ab });
}
// a Perfect Block's talent parts
function bastionPerfect(k) {
  if (k.talent('bastion_steady')) k.buff('steady', 6);
  if (k.talent('bastion_unbreakable') && k.has('unbreak')) k.refundCharge('brace');
  if (k.has('avatar')) { k.damage(120, { ab: abBase(k, 'oath') }); k.fx('dawnPillar'); }
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
    const b = k.buffs.get('frenzy');
    if (b && b.end > k.now) b.end += over / 10; else k.reduceCooldown('frenzy', over / 10);
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
function reaverCash(k) { const t = reaverBank(k); k.g.wound = reaverWound(k); k.g.drainAt = k.now; k.g.cashed = t; k.g.bank = 0; return t; }
// a Drain's price: a free one (Frenzy's Gorged: +bonus), Undying's, War Cry's, or 40 Blood
const reaverDrainOk = k => k.g.blood >= 40 || k.stacks('gorge') > 0 || k.has('deathless') || k.has('roar');
const reaverDrainGlow = k => k.stacks('gorge') > 0 || k.has('deathless') || k.has('roar') || k.g.blood >= 90 || (k.g.blood >= 40 && (reaverBank(k) >= k.env.maxHp() * REAVER.GLOW || reaverWound(k)));
function reaverDrainCost(k, bonus) {
  if (k.stacks('gorge') > 0) { k.consume('gorge'); return bonus; }
  if (k.has('deathless')) return 0;
  if (k.consume('roar')) { k.g.roared = true; return 0; }
  k.spend('blood', 40); return 0;
}
// every frame: the bank for the heart, and Undying's hits turned to Blood
function reaverTick(k) {
  k.g.bank = reaverBank(k);
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
  if (k.g.roared) { k.g.roared = false; k.healRaw('party', healed * 0.25, { ab }); k.fx('warcryDrain'); }   // (War Cry's free Drain)
  k.ultGain(Math.min(6, 18 * (k.g.cashed ?? k.env.recentDamage(6)) / mx));   // (Crimson Eclipse: a Drain that cashes a big bank fills it most)
}
// Bloodletting / Blood Lance: Retaliation's strength, then Cauterize
const reaverRetaliate = k => (k.talent('bloodreaver_retaliate') && k.env.recentDamage(2) >= k.env.maxHp() * 0.1 ? 2 : 1);
function reaverLetting(k, ab) {
  const b = bossNow(k);
  if (k.talent('bloodreaver_cauterize') && b && b.selfVuln && k.now >= (k.g.cautAt || 0)) {
    k.g.cautAt = k.now + 30;
    k.env.emit({ type: 'splash', target: 'self', r: 10, cl: 1, ab }); k.fx('cauterize');
  }
}
// a buff running out: Bloodlust's free Drain when Frenzy ends, Blood Moon setting
function reaverExpire(k, id, b) {
  if (id === 'frenzy' && k.talent('bloodreaver_bloodlust')) {
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
  if (k.g.runes >= 1) { k.spend('runes', 1); runeSpent(k, 1); }
  else { k.g.emAt = k.now + 30; k.fx('emergency'); }
}
// a Ward going up (on t: 'self' or an ally): Shatter marks the old one, Glyph Echo goes off
function runeWardUp(k, ab, t) {
  if (k.talent('runeguard_shatter') && (t === 'self' ? k.g.selfWard : k.g.allyWardT === t && k.now < (k.g.allyWardEnd || 0))) k.g.shatter = true;
  if (t !== 'self') { k.g.allyWardT = t; k.g.allyWardEnd = k.now + 8; }
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
  if (k.talent('runeguard_leap') && !shattered && frac < 0.97 && amt) { k.env.emit({ type: 'shield', target: 'lowest', amount: Math.round(amt * (1 - frac)), dur: 6, ab: k.abById('ward') }); k.fx('wardLeap'); }
  if (k.talent('runeguard_nova') && frac >= novaAt && amt) { k.damage(120, { ab: k.abById('ward') }); k.healRaw('party', amt * 0.2, { ab: k.abById('ward') }); k.fx('wardNova'); }
}
// after Glyph Burst / Rune Cleave (pot: its strength): Runes spent, Glyph Echo, Sigil of Binding, Glyphguard
function runeGlyph(k, ab, pot) {
  runeSpent(k, 3);
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
  const c = (k.has('markself') ? 0.55 : 0.35) + (k.perk('ranger_w1') ? 0.1 : 0);
  return k.talent('ranger_steady') && k.now - (k.g.movedAt ?? -99) >= 2 ? Math.max(c, 0.55) : c;
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
  if (k.talent('shadowblade_clone') && k.has('dance')) k.after(0.35, () => { k.damage(full * 0.25, { ab }); k.fx('shadowClone'); });
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
}

// ----------------------------------------------------------------- Pyromancer
function pyroTick(k) {
  if (k.talent('pyromancer_molten') && k.g.heat > 70 && k.now >= (k.g.armorAt || 0)) { k.g.armorAt = k.now + 1; k.mitigate('self', 0.1, 1.2, { ab: k.abById('fireball') }); }
  if (k.talent('pyromancer_haze')) onBossCast(k, () => { k.buff('haze', 10); k.fx('haze'); });
}
// Wildfire: a crit during Combustion (or in Ember Circle) leaves a flame on the boss
function pyroWildfire(k, ab) {
  if (!k.talent('pyromancer_wildfire') || !(k.has('combust') || k.has('incircle'))) return;
  k.g.wild = ((k.g.wild || 0) + 1) % 5;
  k.dot('wild' + k.g.wild, 25, 6, 2, { ab, extra: true });
}
// Combustion / Ember Circle (Afterburn)
function pyroBurst(k, dur) {
  if (k.talent('pyromancer_afterburn')) k.after(dur, () => k.proc('hotstreak', 15));
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
  if (h >= 90) { k.proc('hotstreak', 15); k.ultGain(4); k.fx('empower'); }
  const m = k.g.meteors && k.g.meteors[0];
  if (m) { m.at = Math.min(m.at, k.now + 0.3); m.heat = (m.heat || 0) + h; }
}

// ----------------------------------------------------------------- Cleric
// a Petal growing back (past 3 it blooms by itself onto the most hurt ally, and counts toward Dawnstar)
function clericGrow(k) {
  if (k.g.petals >= 3) { k.heal('lowest', 450, { ab: abBase(k, 'petal') }); clericBloom(k, 1); k.fx('petalBloom'); }
  else k.gain('petals', 1, 3);
}
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
}
function clericPetal(k, ab, t, healPot) {
  clericUltGain(k, 'petal', t);
  if (k.talent('cleric_petalfall')) { k.damage(40, { ab }); k.fx('petalfall'); }
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
const GROVE_THORN_BLOOM = 2;
// is Rebirth's target fallen? (then it's the 2.5s raise, and it glows; on the living it's instant)
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
  if (k.talent('grovekeeper_balance')) for (const x of k.g.rejuvs) k.healRaw(x.t, r.amount * 0.2, { ab });
  if (a && k.talent('grovekeeper_cycle')) groveGain(k, 20);
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
    if (k.g.flux <= 0) { k.g.stance = 'slow'; k.g.paraFlux = 0; k.buff('lag', 3); k.fx('lag'); k.stats.lags = (k.stats.lags || 0) + 1; }
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
  hold: 'your threat jumps to 10% above the highest, and the boss stays on you for 3s whatever anyone else does (an add, for 6s)',
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
// one at your heal target (a bomb flies at the enemy instead). Vials ripen (+30% over 10s), then spoil at 40s.
// The bandolier's rules live in k.def.alem, which the specs change: Apothecary { slots 5, ripe 5, pick }, Volatile
// { fuse 6, heat 4 } (every vial heats up fast and goes off wherever it is) with Catalyst for three-reagent Reactions.
// A thrown vial is a `splash` event: the host finds who stands within r of the ally it lands on (fight.js), and a
// lingering cloud or ward is a floor pool there. The look of a throw rides on k.fx('vial', data) to every client.
const ALEMBIC = {
  FLIGHT: 0.4,      // seconds from the throw to the shatter
  GROW: 0.3,        // a fully ripe (or fully heated) vial is 30% stronger
  RAISE_CD: 30,     // a Mending Draught raises a fallen ally it lands on, once every 30s
  HURT: 0.7,        // Smart Throw: an ally below this much health gets a cure, anyone else a bomb
  KILN: 3,          // cure vials thrown before the Kiln is hot: the next Throw also launches a free Kiln Bomb
  KILN_POT: 900,    // that Kiln Bomb's potency (three heals pay back about two and a half Fire Bombs)
  reagents: {
    E: { name: 'Ember', color: '#ff7a2a' }, D: { name: 'Dew', color: '#4fc8ff' },
    S: { name: 'Salt', color: '#efe6cf' }, Q: { name: 'Quicksilver', color: '#c9d4e6' },
  },
  // two-reagent recipes, keyed by their reagents in sorted order. kind: heal | bomb | ward | salve | quick
  recipes: {
    DD: { name: 'Mending Draught', color: '#4fe0c0', glyph: 'plus', kind: 'heal', text: 'a {h:480} splash heal. It raises a fallen ally it lands on (once every 30s).' },
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
    DDD: { name: 'Elixir of Life', color: '#6fffd0', glyph: 'plus', kind: 'heal', text: 'a {h:620} splash heal that lingers as a healing mist ({h:60} every 1.5s), and raises the fallen.' },
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
  if (A.fuse) return 1 + ALEMBIC.GROW * Math.min(k.talent('alembist_cask') ? 1.5 : 1, Math.max(0, age / A.heat));
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
// which vial Throw takes (Smart Throw): an ally below 70% gets your strongest heal (the oldest of equals), or failing
// that your oldest other cure; anyone else gets your oldest bomb (a Salt Ward or Salve first while a raidwide is on its
// way), or failing that your oldest vial. The Apothecary's Shift+R pick overrides it; a bot may name a slot (g.aim).
function alemPick(k, t) {
  const vs = k.g.vials, n = vs.length; if (!n) return -1;
  if (k.def.alem.pick && k.g.picked) return Math.max(0, Math.min(n - 1, k.g.sel | 0));
  if (k.g.aim != null && k.g.aim >= 0 && k.g.aim < n) return k.g.aim;
  const hurt = alemHurt(k, t);
  if (hurt == null) return 0;
  const kind = v => (v.parts ? 'blend' : alemInfo(v.r).kind);
  if (hurt) {
    let best = -1;
    vs.forEach((v, i) => { if ((kind(v) === 'heal' || kind(v) === 'blend') && (best < 0 || alemStrength(k, v) > alemStrength(k, vs[best]) + 0.001)) best = i; });
    if (best >= 0) return best;
    const c = vs.findIndex(v => kind(v) !== 'bomb');
    return c >= 0 ? c : 0;
  }
  if (alemWide(k)) { const w = vs.findIndex(v => kind(v) === 'ward' || kind(v) === 'salve'); if (w >= 0) return w; }
  const q = vs.findIndex(v => kind(v) === 'quick'); if (q >= 0) return q;   // (a healthy ally takes the Quickpowder: Galvanized)
  const b = vs.findIndex(v => kind(v) === 'bomb');
  return b >= 0 ? b : 0;
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
    case 'QQ': alemSplash(k, t, { pool: { r: 120, ticks: 4, interval: 1.5, sh: 120 * m } }); break;
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
  const t = k.env.target(alemAb(k) || { target: 'ally' }), i = alemPick(k, t); if (i < 0) return false;
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
      k.after(ALEMBIC.FLIGHT, () => alemBomb(k, { t: null, en, self: false }, ALEMBIC.KILN_POT));
      k.stats.kiln = (k.stats.kiln || 0) + 1;
      k.ultGain(2.5);   // (Magnum Opus)
    }
  }
  if (!alemIsBomb(v)) k.g.kiln = Math.min(ALEMBIC.KILN, (k.g.kiln || 0) + 1);
}

KITS.alembist = {
  potMult: 0.73, // balance knob (tools/simulate.js)
  auto: { kind: 'spark', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'bandolier', key: 'count', max: 3, label: 'Bandolier', w: 200 },
  alem: { slots: 3, ripe: 10, spoil: 40 },
  init: () => ({ half: [], vials: [], count: 0, sel: 0, picked: false, aim: null, kiln: 0, n: 0, last: null, raiseAt: 0, popAt: -9, popR: null }),
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
    // the pick moves on one from the vial Throw would take now (Smart Throw's, until you have picked), and holds until you throw
    const n = k.g.vials.length, from = k.g.picked ? k.g.sel | 0 : Math.max(0, alemPick(k));
    k.g.picked = n > 0; k.g.sel = n > 1 ? (from + 1) % n : 0;
    return true;
  },
  signature: 'Brewing ahead',
  floor: 'Press W twice to brew a Mending Draught, then R on whoever is hurt. Brew Fire Bombs with Q, and R on a healthy ally sends the bomb at the enemy.',
  ceiling: [
    'Two reagents make a vial: Dew + Dew heals, Ember + Ember bombs, Salt + Salt wards, Ember + Dew steams, Dew + Salt shields and cleanses, Ember + Salt hastens the party.',
    'Vials grow 30% stronger over their first 10s and spoil at 40s. Brew in the quiet, throw ripe vials into the storm.',
    'Smart Throw: an ally below 70% health gets your strongest heal, anyone else your Quickpowder if you hold one (they are Galvanized: 10% more damage for 10s), else your oldest bomb. While a raidwide is on its way, a Salt Ward or Salve goes first.',
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
      desc: 'Throw a vial at your heal target (1.25s): it shatters and splashes everyone close by. Smart Throw: an ally below 70% health gets your strongest heal, anyone else your Quickpowder (Galvanized: 10% more damage for 10s), else your oldest bomb, which flies at the enemy (while a raidwide is on its way, a Salt Ward or Salve goes first). Every vial that is not a bomb heats the Kiln by 1: at 3, your next Throw also launches a free Kiln Bomb for {d:900}. Vials grow 30% stronger over 10s, and spoil after 40s.',
      effect(k, t) {
        const i = alemPick(k, t); if (i < 0) return;
        const v = k.g.vials.splice(i, 1)[0];
        k.g.sel = 0; k.g.picked = false; k.g.aim = null; k.g.count = k.g.vials.length;
        const en = alemIsBomb(v) ? k.env.target({ target: 'enemy', range: RANGED }) : null;
        alemUltThrow(k, v, t, alemStrength(k, v));   // (Magnum Opus; before the Kiln, which can fill it too)
        alemLaunch(k, v, t, en, alemStrength(k, v), false);
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
    BASTION, bastionCanEdge, bastionTurned, bastionBanner, bastionGain, bastionCost, bastionSpend, bastionBraceDur, bastionInHallow, bastionBlade, bastionEdge, bastionGuard, bastionPerfect, bastionTick,
    REAVER, reaverBank, reaverWound, reaverWarm, reaverCash, reaverDrainOk, reaverDrainGlow, reaverDrainCost, reaverTick, reaverGain, reaverHackHeal, reaverDrainPot, reaverAfterDrain, reaverRetaliate, reaverLetting, reaverExpire,
    runeGain, runeSpent, runeEmergency, runeWardCost, runeWardUp, runeWardEnd, runeGlyph, runeGlyphguard, runeGlyphguardEnd,
    rangerTrack, rangerKeenChance, rangerFocusFire, rangerShot, rangerFocus, rangerKeen, rangerNoKeen, rangerRhythm, rangerFeed, rangerQuickAfter, rangerPierce, rangerMark,
    bladeCombo, bladeMult, bladeOpts, bladeFinisher, bladeStep, bladePoise, rangerRapidCost, pyroStoke, pyroVent, pyroTick, pyroWildfire, pyroBurst,
    clericGrow, clericBloom, clericFirstLight, clericHeld, clericInSanctum, clericSmite, clericDawnstar, clericPetal, clericBless, clericTick,
    groveGain, groveMoonfire, groveWrath, groveSproutGcd, groveRejuv, groveGrowth, groveBloom, groveTick, GROVE_THORN_BLOOM, groveRebirthDead,
    chronoFlux, chronoLate, chronoBolt, chronoBoltAfter, chronoInstant, chronoAccel, chronoSecondChance,
    CHRONO_PARADOX, chronoParadox, chronoRewindCost, chronoQuicken, CHRONO_STASIS, chronoStasis, chronoRelease, chronoWideDone };
  // Alembist (classes-b)
  Object.assign(module.exports, { ALEMBIC, alemKey, alemReactionKey, alemInfo, alemIsBomb, alemIsHeal, alemKnown, alemBook, alemSavedKnown, alemRipeTime,
    alemSpoilTime, alemStrength, alemAb, alemPick, alemAdd, alemReagent, alemShieldAmt, alemSplash, alemBomb, alemRaise, alemRecipe, alemGoOff, alemLaunch,
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
// a big Thermist spell's cast time (Cinder Bolt and Rime Shard are always instant): instant after a Shock with Rebound,
// at its own edge, or after a quick spell with Flicker. Only looks: asking must never spend Rebound (thermSpell does).
function thermCast(k, el, base, edge) {
  if (k.has('rebound') || k.has('flicker') || (edge && thermEdgeCast(k, el))) return 0;
  return base;
}

// one Thermist spell: el +1 fire / -1 frost, moving the dial `steps` (plus Pendulum's extra step) after it hits.
// o.edge: a big spell with the edge rule (at its own edge: instant, a sure crit, and On the Brink instead of moving).
function thermSpell(k, ab, el, steps, pot, o = {}) {
  const edge = !!o.edge && thermEdgeCast(k, el);
  k.consume('rebound');
  if (o.edge) k.consume('flicker');
  else if (o.quick && k.talent('thermist_flicker')) k.buff('flicker', 6);   // Flicker: a quick spell readies an instant big one
  thermBrink(k, el);
  const mult = thermMult(k, el) * (o.mult || 1) * thermPerk(k, ab, el);
  const r = k.damage(pot, { ab, mult, autoCrit: edge && !k.def.redline });
  if (edge && k.talent('thermist_twin')) k.after(0.3, () => { k.damage(pot * (k.def.redline ? 0.09 : 0.3), { ab, mult, extra: true }); k.fx('twin', { el }); });
  if (edge && k.talent('thermist_afterglow')) k.dot(el > 0 ? 'afterglow' : 'afterfrost', k.def.redline ? 30 : 42, 9, 3, { ab });
  if (el > 0 && k.talent('thermist_embers') && k.g.temp >= 3) k.g.embers = Math.min(3, (k.g.embers || 0) + 1);
  if (edge) k.ultGain(THERM_ULT.GAIN_EDGE);   // (Supernova: an edge cast)
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
  k.ultGain(THERM_ULT.GAIN_SWING * swing * (k.def.stepBonus ? THERM_ULT.PEND : 1));   // (Supernova; Pendulum shocks far more often)
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
  // the dial snaps to 0 but the swing is kept: side and peak stay, so the next spell across 0 still detonates a Shock
  // sized by the stored peak (unless Equilibrium Pulse sets that heat off right here)
  k.g.temp = 0;
  thermUtility(k, ab, fell >= 4);
  if (fell >= THERMIST.SHOCK_MIN && k.talent('thermist_pulse')) { Object.assign(k.g, { side: 0, peak: 0 }); thermShock(k, fell, 1, -from); }
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
  potMult: 0.88, // balance knob (tools/simulate.js)
  auto: { kind: 'thermo', potency: 25, range: RANGED },  // passive auto-attack (see ENGINE.AUTO_EVERY)
  gauge: { kind: 'dial', key: 'temp', max: 5, label: 'Temperature' },
  init: () => ({ temp: 0, side: 0, peak: 0, dir: 1, strain: 0, embers: 0, latent: 0 }),
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
      desc: 'Snap the dial back to 0 behind a shield: {s:70} for every step it fell. The swing is kept: your next spell across 0 still sets off a Thermal Shock sized by how far you had swung. It also clears On the Brink.',
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
    const eye = driftEye(k), held = k.has('gale') || k.has('still') || (!eye && g.stillT < (k.def.driftHold || DRIFT.HOLD));
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
  const g = k.g, t = moving && pos ? k.env.target(DRIFT_NEAR) : null;
  if (!t || t.x == null) { g.orbA = null; return; }
  const a = Math.atan2(pos.y - t.y, pos.x - t.x);
  if (g.orbA != null) g.orbAcc = (g.orbAcc || 0) + Math.abs(driftAngDiff(a, g.orbA));
  g.orbA = a;
  while (g.orbAcc >= 1) { g.orbAcc -= 1; k.buff('orbit', 5, {}, 5, 1); }
  if (k.stacks('orbit') >= 5 && k.now >= (g.orbCutAt || 0) && k.env.target(DRIFT_REACH)) {
    g.orbCutAt = k.now + 1.4;
    k.damage(80 * (1 + 0.3 * driftK(k)), { ab: k.abilities[0], extra: true });
    k.fx('orbitcut');
  }
}
function driftSpend(k, d, full) {
  k.ultGain(DRIFT_ULT.GAIN_CROSS * d / full * Math.sqrt(full / 100));   // (Eye of the Gale: a Crosswind, or Comet's rarer, bigger Impact)
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
  TALENT_ABILITIES.driftblade_gyre = { cls: 'driftblade', ab: {
    id: 'gyre', replaces: 'hook', icon: 'hook', name: 'Gyre', type: 'ogcd', target: 'enemy', range: MELEE, charges: 2, cd: 10, lock: 0.5, anim: 'attack',
    desc: 'Loop once round your target, cutting it for {d:105} once for every 25 Drift you have (up to 4 cuts). It spends nothing, and the loop adds 10 Drift. Two charges.',
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
    effect(k) { k.buff('overload', 15); k.buff('living', 15); if (k.perk('runeguard_w3')) k.gain('runes', 2, 3); },
    fx: { type: 'aura', color: '#b18cff', r: 40, dur: 2 },
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
      if (h >= 60) k.proc('hotstreak', 15);
    },
    fx: { type: 'projectile', style: 'fire', color: '#ff7a1a', range: RANGED, speed: 600 },
  },
});
// Cleric
talentMoves('cleric', {
  cleric_bloom: {
    id: 'dawnbloom', replaces: 'intervene', icon: 'intervene', name: 'Bloom of Dawn', type: 'gcd', target: 'ally', cd: 30, anim: 'big', allowDead: true, talent: true,
    desc: 'Instant: spend all your Petals on one ally. A fallen ally rises at once; a living one is healed for {h:500} per Petal. Every Petal counts toward Dawnstar.',
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
    desc: 'Instant: spend 40 Bloom to plant a seed on an ally for 20s. If they fall while it grows, they spring back up at once; if not, it blooms into a {h:900} heal when it ends. On a fallen ally, it raises them at once.',
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
      k.g.vials = [v]; k.g.sel = 0; k.g.count = 1;
      k.g.popAt = k.now; k.g.popR = 'BL';
      k.fx('brew', { r: 'BL' });
      alemRestock(k);
    },
    fx: { color: '#ffe0a8' },
  } };
TALENT_ABILITIES.alembist_quicksilver = { cls: 'alembist', ab: Object.assign(alemReagentAb('quicksilver', 'Q', 'Quicksilver', alemSaltGlow,
    'A reagent (1s) that takes Salt\'s place. Quicksilver + Quicksilver is a Silver Mirror, Quicksilver + Dew a Silver Tonic, Quicksilver + Ember a Fulminate. It glows while a raidwide is on its way and you hold no Silver Mirror, Salt Ward or Salve.'),
  { replaces: 'salt', icon: 'salt', talent: true }) };

if (typeof module !== 'undefined') Object.assign(module.exports, { kitMoveDest, kitSegDist, THERMIST, thermSpell, thermMove, thermSettle, thermShock, thermBrink, thermMult, thermAt,
  thermEdgeCast, thermEquil, thermUtility, thermInvert, thermPlan, thermTick, thermOverload, DRIFT, DRIFT_BODY, DRIFT_NEAR, DRIFT_REACH, driftAdd, driftTick, driftPass, driftK, driftMax,
  driftSpend, driftHook, driftRiposte, TALENT_ABILITIES });

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
  if (k.g.belly.length >= mawMax(k)) {
    // a full Belly: the Morsel is lost, unless Overflow spits it straight back out
    if (k.talent('gorgemaw_overflow')) { k.g.belly.push({ m, at: k.now }); mawSpit(k, k.abilities[2], { free: true }); }
    else k.wasted('morsel');
  } else k.g.belly.push({ m, at: k.now });
  k.g.count = k.g.belly.length;
}
// one Spit: the oldest Morsel (Glutton: with the next if it's the same shape, a Fusion). o.share: Regurgitate's strength
function mawSpitOne(k, ab, o = {}) {
  const b = k.g.belly; if (!b.length) return null;
  const m = b.shift();
  const fused = !!k.def.fuse && b.length > 0 && b[0].m === m.m;
  if (fused) b.shift();
  let pot = MAW.SPIT[m.m] * (fused ? MAW.FUSE : 1) * (o.share || 1);
  if (k.talent('gorgemaw_sour') && k.now - m.at >= 15) pot *= 1.4;
  if (k.g.marinade && k.now < k.g.marinade) pot *= 1.25;
  if (k.has('acid')) { pot *= 1 + k.buffs.get('acid').data.x; k.clear('acid'); k.stats.acidSpits = (k.stats.acidSpits || 0) + 1; }   // (Digest's acid)
  const r = k.damage(pot, { ab });
  if (k.talent('gorgemaw_aftertaste')) k.dot('aftertaste', m.m === 'spike' ? 65 : 35, 9, 3, { ab });
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
// Gulp (Gnash's third bite) into an empty Belly: the mouthful is a Ring Morsel (not an eaten hit: no Maw of Ruin charge)
function mawGulp(k) {
  if (k.g.belly.length || k.now < (k.g.gulpAt ?? -99)) return;
  k.g.gulpAt = k.now + MAW.GULP_CD;
  const m = 'ring';
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
      case 'foreclose': r.boss += L.e.reduce((s, e) => s + e.a * (e.rn ? OATH.FORE_RN : 1), 0) * C(ev.mult, 0, 1.2, 1) * (OATH.total(L) >= maxHp * OATH.BIG ? OATH.FORE_BIG : OATH.FORE_SMALL); L.e = []; L.frozen = t + C(ev.freeze, 4, OATH.FREEZE, OATH.FREEZE); break;
      case 'summons': L.summons = t + 6; break;
      case 'reckon': L.e = []; break;   // Final Reckoning (the Ultimate): every entry comes due on the boss; the kit strikes for it
      case 'hold': L.hold = t + C(ev.dur, 0, 6, 0); break;
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
  k.g.count = k.g.ledger.length;
  if (d.bill) { k.g.stampAt = now; k.g.stampA = d.bill; }
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
        k.damage(pot, { ab: this });
        if (k.g.ledger.length) {
          const amount = oathHp(k) * OATH.PAY * (k.perk('oathbroker_w1') ? 1.5 : 1);
          // (under Lien the whole payment strikes the boss; otherwise Garnish's share)
          oathSend(k, { op: 'pay', amount, hit: oathLien(k) ? 1 : k.talent('oathbroker_garnish') ? 0.4 : 0, push: step === 2 && k.talent('oathbroker_notary') ? 3 : 0 });
          k.g.payAt = k.now;
          // the copy pays down too, so the column answers at once
          let left = amount; for (const e of k.g.ledger) { if (left <= 0) break; const p = Math.min(e.a, left); e.a -= p; left -= p; }
          k.g.ledger = k.g.ledger.filter(e => e.a >= 0.5); k.g.total = k.g.ledger.reduce((s, e) => s + e.a, 0);
          if (k.talent('oathbroker_garnish')) k.stats.garnished = (k.stats.garnished || 0) + amount - left;
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
  effect(k) { let n = 0; while (k.g.belly.length) { const i = n++; mawSpitOne(k, this, { share: 0.75, n: i }); } k.g.marinade = 0; k.g.count = 0; },
  fx: { color: '#ffb070' },
} };
TALENT_ABILITIES.gorgemaw_stonebelly = { cls: 'gorgemaw', ab: {
  id: 'stonebelly', replaces: 'iron', icon: 'iron', name: 'Stone Belly', type: 'ogcd', target: 'self', cd: 90, anim: 'big',
  desc: 'Swallow a stone: 30% less damage for 8s, and every Morsel you eat in that time is a Spike.',
  effect(k) { k.mitigate('self', k.perk('gorgemaw_a4') ? 0.4 : 0.3, 8, { ab: this }); k.buff('stone', 8); if (k.talent('gorgemaw_ironjaw')) mawOpen(k, 2); },
  fx: { color: '#a8a090' },
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
  },
  fx: { color: '#e8d8a8' },
} };
TALENT_ABILITIES.oathbroker_moratorium = { cls: 'oathbroker', ab: {
  id: 'moratorium', replaces: 'reneg', icon: 'reneg', name: 'Moratorium', type: 'ogcd', target: 'self', cd: 45, lock: 0.3, anim: 'big',
  desc: 'Declare a moratorium: for 5s nothing comes due. Every timer in the Ledger stops until it ends.',
  glow: k => oathDueSoon(k, 2) >= oathHp(k) * 0.15,
  effect(k) { oathSend(k, { op: 'hold', dur: 5 }); for (const e of k.g.ledger) e.due += 5; k.g.holdUntil = k.now + 5; },
  fx: { color: '#c8c0e8' },
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
    desc: 'A launching uppercut for {d:125} that draws the boss to you (triple threat). The boss is in the air: the next input has longer to come, and any key you press carries the string on to Heaven\'s Drop.' }),
  ipMove('drop', 'Heaven\'s Drop', 'LLHKK', { bonus: 98, anim: 'axe', lock: 0.62, alt: { ironpalm_swallow: 'KLHKK' },
    desc: 'Rising Gate, then two kicks: an axe kick brought down on the airborne boss for {d:166}.',
    finish(k, mv) { if (k.talent('ironpalm_mountain')) k.after(1, () => { k.damage(40, { ab: mv }); k.fx('aftershock'); }); } }),
  ipMove('wall', 'Tiger Wall', 'HKK', { bonus: 13, anim: 'guard', desc: 'A low blocking kick for {d:81}, then a stance: 25% less damage for 5s.',
    finish(k, mv) { k.mitigate('self', 0.25, 5, { ab: mv }); k.buff('wall', 5); if (k.talent('ironpalm_shirt')) k.shield('self', 130, 5, { ab: mv }); } }),
  ipMove('breaker', 'Stone Breaker', 'HHK', { bonus: 39, desc: 'A crushing kick to the knee for {d:107}: the boss is Bruised and takes {d:20} every 3s for 15s.',
    finish(k, mv) { k.dot('bruise', 20, 15, 3, { ab: mv }); } }),
  ipMove('ox', 'Iron Ox', 'HHH', { bonus: 63, threat: 2, desc: 'Three heavy blows, the last driven home with the whole body for {d:146} (double threat). It throws the boss off balance: Read is ready again at once, and the next blow you Read within 4s opens it up as a tankbuster does (your next Heavy is a free Thousand Palms).',
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
function ipBreath(k, n) { k.g.breath = Math.min(k.poolMax(), (k.g.breath || 0) + n); }
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
  else if (crisp) ipBreath(k, inp.cost * (k.talent('ironpalm_clean') ? 1 : IRONPALM.CRISP_SAVE));
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
  if (k.perk('ironpalm_a2')) k.shield('self', 160, 6, { ab });
  if (b && k.talent('ironpalm_answer')) { k.reduceCooldown(ipAbId(k, 'skin'), 20); k.reduceCooldown(ipAbId(k, 'bell'), 20); }
  k.fx('read', { b: b ? 1 : 0 });
}

KITS.ironpalm = {
  potMult: 0.64, // balance knob (tools/simulate.js)
  pacing: { kind: 'combo', gcd: false, buffer: 0.45, bufferSize: 2, repeat: false, pool: IRONPALM.pool, itemGcd: (k, ab) => !!ab.named },
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
    'and the last palm drives a shockwave through your target for {d:800} (triple threat). The boss is Bruised ({d:20} every 3s for 15s), you hold Tiger Wall\'s stance (25% less damage for 5s), and your Breath fills to the top. ' +
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
  effect(k) { k.mitigate('self', 0.3, 10, { ab: this }); k.buff('bellows', 10); },
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
// get more than 260 px apart (a small heal to both). The damage threads carry comes back as Spool ('carry' notices).
const WEAVE = { SNAP: 260, MAX: 3, SPOOL: 1.1, MEND_COST: 35, TIE_GAP: 4, LOOSE: 10, SHUTTLE: 120, SHUTTLE_HEAL: 100 };
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
  const g = k.g, now = k.now;
  // a second Tie on another ally soon after the first ties those two allies to each other instead of to you
  const pair = g.tie && g.tie.t !== t && now - g.tie.at < WEAVE.TIE_GAP ? g.tie.t : undefined;
  // Tie on an ally already on your threads (and no pair waiting): pull them along it (Shears: and a shield)
  if (pair == null && weaveTiedTo(k, t)) { g.tie = null; weaveTighten(k, ab, t, !!k.def.lash); return; }
  g.tie = pair != null ? null : { t, at: now };
  const sh = k.healAmount(150, { ab }).amount;
  k.env.emit({ type: 'tie', target: t, pair, mx: weaveMax(k), amount: sh, st: k.def.store || 1, dp: k.def.deep ? 1 : 0, hm: k.talent('threadweaver_skein') ? 6 : 0, ab });
  if (!weaveHosted(k) && pair == null) g.n = Math.min(weaveMax(k), (g.n || 0) + 1);
  if (k.talent('threadweaver_crossstitch')) { k.heal(t, 110, { ab }); if (pair != null) k.heal(pair, 110, { ab }); }
  if (k.perk('threadweaver_a2')) k.shield(t, 120, 6, { ab });
}
// Snap: cut the threads on your target (all of yours if it has none). Each releases what it carried in the last 5s
// (times the spec's store) as a heal to both ends, never less than a small heal.
function weaveSnip(k, ab, t) {
  const n = weaveCount(k);
  const value = (k.def.store || 1) * (k.perk('threadweaver_w3') ? 1.25 : 1);
  const amount = k.healAmount(k.def.snipPot || 200, { ab }).amount;
  const sh = k.talent('threadweaver_thimble') ? Math.round(150 * ENGINE.POT_SCALE * (1 + (k.gear().power || 0))) : 0;
  k.env.emit({ type: 'snip', target: t, value, amount, sh, ab });
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
  signature: 'Threads',
  floor: 'Press W on the tank and one more ally to tie them to you, then heal with E. Press Q to attack when nobody needs you, and D whenever it is up. R when your threads have carried a lot.',
  ceiling: [
    'A hit on one end of a thread is split evenly along it, and a heal on one end runs 60% of the way down. Tie the person about to be hit to someone healthy.',
    'Threads snap when their ends get more than 260 px apart: a spread mechanic will tear your web. Snap it yourself just before, for a much bigger heal, and re-tie on the stack. Any snap makes your next Needle instant: spend it on the move.',
    'Tie twice in a row on two allies to tie them to each other; Tie an ally already on your threads to pull them along it. Each Thread on you makes Needle heal whoever is on the far end.',
    'Shuttle hits once for every thread you hold: keep the web full ({d:360} with three) and it is your biggest hit.',
    'Tapestry ties everyone into one web for 8s: a tankbuster or a raidwide split four ways. Save it for the hit that would kill someone.',
  ],
  abilities: [
    {
      id: 'needle', name: 'Needle', type: 'gcd', target: 'enemy', range: RANGED, anim: 'cast',
      cast: k => (k.has('looseend') ? 0 : k.talent('threadweaver_taut') && weaveCount(k) >= 3 ? 1 : 1.5),
      desc: '1.5s cast attack: a thrust of the long needle for {d:270}. Each Thread on you tugs a {h:100} heal to whoever is on its far end. After a thread snaps (on its own or by Snap), your next Needle within 10s is instant.',
      glow: k => k.has('looseend'),
      effect(k) {
        k.consume('looseend');
        const r = k.damage(270, { ab: this });
        const tug = k.healAmount(100 * (k.perk('threadweaver_w1') ? 1.3 : 1), { ab: this }).amount;
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
      desc: 'Tie your target to yourself with a glowing thread. Press it on a second ally within 4s and those two are tied to each other instead. On an ally already on your threads, it pulls them up to 220 px along the thread toward its far end instead: yank someone out of a puddle. Up to 3 threads; tying another drops your oldest. Two charges.',
      glow: k => weaveTieGlow(k),
      effect(k, t) { weaveTie(k, this, t); },
      fx: { color: '#cbb8ff' },
    },
    {
      id: 'mend', name: 'Mend Seam', type: 'gcd', target: 'ally', anim: 'cast',
      cast: k => (k.g.spool >= WEAVE.MEND_COST ? 0 : 1.8),
      desc: '1.8s cast: a {h:440} heal that runs down every Thread on your target at full strength. With 35 Spool it spends it, is instant and heals 35% more.',
      glow: k => k.g.spool >= 70,
      effect(k, t) {
        const sp = k.g.spool >= WEAVE.MEND_COST;
        if (sp) k.spend('spool', WEAVE.MEND_COST);
        const m = (sp ? 1.35 * (k.perk('threadweaver_w2') ? 1.2 : 1) : 1) * (k.talent('threadweaver_bobbin') && k.g.spool >= 50 ? 1.2 : 1);
        const { amount, crit } = k.healAmount(440 * m, { ab: this });
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
      desc: 'Instant: throw the shuttle down every thread you hold. It strikes the boss for {d:120} per thread (three threads: {d:360}), and each Thread on you tugs a {h:100} heal to whoever is on its far end.',
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
// notice). At 0 it goes limp for 4s and comes back with 3. Encore (0-5) builds from hits and pays for Grand Finale.
const MARI = { STRETCH: 300, REACH: 64, SPEED: 360, LIMP: 4, REGEN: 15, YANK: 1.2, RING: 24, TAUT: 12, TAUT_MAX: 72, CUE: 6, FINALE: 160 };
const MARI_STRING = { id: 'string', name: 'Bladed String' };
const MARI_FAR = { target: 'enemy', range: 2000 };
const mariStretch = k => k.def.stretch || MARI.STRETCH;
const mariEnemy = k => k.env.target(MARI_FAR);
const mariER = e => (e && e.r) || (e && e.id && e.id !== 'boss' && e.id !== 'dummy' ? 34 : 70);
const mariPos = k => (k.env.pos ? k.env.pos() : { x: 0, y: 0 });
const mariLimp = k => k.now < (k.g.limpUntil || 0);
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
  g.strings = Math.max(0, g.strings - 1); g.taut = 0;   // (a torn String slackens Taut String)
  g.regenAt = now + (k.talent('marionettist_mended') ? MARI.REGEN / 2 : MARI.REGEN);
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
function mariTick(k) {
  const g = k.g, now = k.now, dt = now - (g.lastT ?? now);
  g.lastT = now;
  const p = mariPos(k), e = mariEnemy(k);
  if (!g.dolls.length) for (let i = 0; i < (k.def.dolls || 1); i++) g.dolls.push({ x: p.x + (i ? 40 : -40), y: p.y - 30, mode: 'idle', until: 0, safe: 0 });
  if (!(dt > 0 && dt < 0.5)) { mariShare(k); return; }
  // limp: lie where it fell; coming back up with all three Strings
  if (g.limpUntil && now >= g.limpUntil) { g.limpUntil = 0; g.strings = 3; for (const d of g.dolls) d.mode = 'idle'; k.fx('unlimp'); }
  if (!mariLimp(k) && g.strings < 3 && now >= (g.regenAt || 0)) { g.strings++; g.regenAt = now + (k.talent('marionettist_mended') ? MARI.REGEN / 2 : MARI.REGEN); }
  const lim = mariStretch(k);
  g.dolls.forEach((d, i) => {
    if (d.mode === 'limp') return;
    if ((d.mode === 'post' || d.mode === 'finale') && now >= d.until) d.mode = 'idle';
    let goal = null;
    if (d.mode === 'idle') {
      // it only works a target you have chosen; with none it stays where it was put, and is only brought along when you
      // walk it to the end of its strings
      const c = k.env.picked ? k.env.picked() : e;
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
    if (n) { g.lineAt = now + 1; k.damage((48 + (g.taut || 0)) * n, { ab: MARI_STRING, tgt: e.id, extra: true }); g.taut = Math.min(MARI.TAUT_MAX, (g.taut || 0) + MARI.TAUT); }
    else g.taut = 0;
  } else if (k.def.bladed && (!e || mariLimp(k))) g.taut = 0;
  // Twin Strings: a Cross-Cut's line lingers and cuts whatever still crosses it
  if (g.linger && now >= g.linger.next) {
    const L = g.linger;
    L.next += 1; L.left--;
    if (e && L.lines.some(s => kitSegDist(e.x, e.y, s[0], s[1], s[2], s[3]) <= mariER(e) + 10)) k.damage(45 * L.m, { ab: abBase(k, 'cross'), tgt: e.id, extra: true });
    if (L.left <= 0) g.linger = null;
  }
  mariShare(k);
}
// tell the world where the Dolls are (the host judges mechanics on them; other players draw them)
function mariShare(k) {
  if (!k.env.dolls) return;
  k.env.dolls(k.g.dolls.map(d => ({ x: Math.round(d.x), y: Math.round(d.y), st: d.mode === 'limp' ? 2 : d.mode === 'finale' ? 3 : k.now < d.safe ? 1 : d.moving ? 4 : 0, s: k.g.strings })));
}
// one Doll attack: every Doll in reach hits (each at the Understudy's smaller share)
function mariHit(k, ab, pot, o = {}) {
  const e = mariEnemy(k), ds = mariInReach(k, e);
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
  let hits = 0;
  for (const d of k.g.dolls) {
    lines.push([p.x, p.y, d.x, d.y]);
    if (kitSegDist(e.x, e.y, p.x, p.y, d.x, d.y) <= R) { hits++; k.damage(560 * m * (cue ? 2 : 1), { ab, tgt: e.id !== 'dummy' ? e.id : undefined }); }
  }
  k.fx('cut', { n: hits });
  if (hits) { mariEncore(k, 2 + (cue ? 1 : 0) + (k.perk('marionettist_w2') ? 1 : 0)); k.stats.cuts = (k.stats.cuts || 0) + 1; k.ultGain(MARI_ULT.GAIN_CUT); }   // (Curtain Call)
  else { k.stats.misses = (k.stats.misses || 0) + 1; if (k.talent('marionettist_counterweight')) k.reduceCooldown(ab.id, (k.recast(ab) || 8) / 2); }
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
function mariAim(k) {
  const a = k.env.aim ? k.env.aim() : null;
  if (a) return a;
  const e = mariEnemy(k);
  return e ? { x: e.x, y: e.y } : null;
}

KITS.marionettist = {
  potMult: 0.922, // balance knob (tools/simulate.js)
  auto: { kind: 'doll', potency: 30, range: 640 },
  gauge: { kind: 'marionette', key: 'encore', max: 5, label: 'Encore' },
  dolls: 1,
  init: () => ({ encore: 0, strings: 3, dolls: [], limpUntil: 0, regenAt: 0, jabs: 0 }),
  tick: k => mariTick(k),
  onNotify(k, type, d) {
    if (type !== 'dollhit') return;
    const dl = k.g.dolls[d.i | 0];
    if (dl && k.now >= dl.safe) mariLose(k, d.i | 0, 'hit');
    else if (dl && k.now < (k.g.dodgeUntil || 0)) { k.g.dodgeUntil = 0; mariEncore(k, 1); k.fx('empower'); }   // (a blow danced through under Pirouette: +1 Encore)
  },
  signature: 'The Doll and its Strings',
  floor: 'Stand back from the boss and press Q: the Doll does the fighting. Press E when it glows, R when it\'s ready, F at full Encore. Keep the Doll out of the red with W.',
  ceiling: [
    'Your attacks come from the Doll, not from you. It drifts to the far side of the boss on its own, but you have to keep it out of telegraphs: W sends it where you aim.',
    'Three Strings tie you together. One tears if the Doll is pulled past 300 px from you or a blow lands on it; at 0 it goes limp for 4s.',
    'Cross-Cut cuts along the line between you and the Doll: with the boss between you it\'s your biggest hit. Stand where the line crosses the boss.',
    'Grand Finale spends 5 Encore on five hits, but the Doll can\'t move while it plays. Look at what\'s coming before you start the show, and don\'t let full Encore sit: every point past 5 is lost.',
    'Pirouette is worth most saved for a blow you see coming at the Doll: it spins through for 1 more Encore. Swap a few seconds before Cross-Cut is up and the cut lands twice as hard.',
  ],
  abilities: [
    {
      id: 'jab', name: 'Jab', type: 'gcd', target: 'enemy', range: 640, anim: 'cast',
      desc: 'The Doll stabs for {d:250}. Builds 1 Encore.',
      usable: k => mariReady(k),
      effect(k) {
        const flo = k.talent('marionettist_flourish') && ++k.g.jabs % 3 === 0;
        const n = mariHit(k, this, 250 * (k.perk('marionettist_w1') ? 1.15 : 1));
        if (flo && n) { k.after(0.25, () => mariHit(k, this, 100, { extra: true })); k.fx('flourish'); }
        if (n) mariEncore(k, 1);
      },
      fx: { color: '#f0c8dc' },
    },
    {
      id: 'pull', name: 'Pull Strings', type: 'ogcd', target: 'none', charges: 2, cd: 10, anim: 'cast', lock: 0.35,
      desc: 'Fling the Doll to where you aim (within its strings\' reach). It cuts anything it passes through for {d:160}, and stays there until you pull it again or pick another target. Builds 1 Encore on a hit. Two charges.',
      usable: k => !mariLimp(k),
      effect(k) {
        const p = mariPos(k), aim = mariAim(k), i = mariPick(k, aim), d = k.g.dolls[i];
        if (!d || !aim) return;
        let to = { x: aim.x, y: aim.y };
        const lim = mariStretch(k) - 24, L = Math.hypot(to.x - p.x, to.y - p.y);
        if (L > lim) to = { x: p.x + (to.x - p.x) / L * lim, y: p.y + (to.y - p.y) / L * lim };
        if (typeof ARENA !== 'undefined' && ARENA.clamp) ARENA.clamp(to, 20);
        const e = mariEnemy(k), from = { x: d.x, y: d.y };
        d.x = to.x; d.y = to.y; d.mode = 'post'; d.until = k.now + 3; d.manual = !!(k.env.human && k.env.human());   // a player's Doll stays put; a bot's goes back to work
        if (k.env.collide) k.env.collide(d, 14);
        k.fx('pull', { i });
        if (e && kitSegDist(e.x, e.y, from.x, from.y, d.x, d.y) <= mariER(e) + 18) {
          k.damage(160 * (k.talent('marionettist_lunge') ? 1.4 : 1) * (k.def.dollMult || 1), { ab: this, tgt: e.id !== 'dummy' ? e.id : undefined });
          mariEncore(k, 1);
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
        if (k.talent('marionettist_secondact') && k.g.strings < 3) { k.g.strings++; k.fx('mend'); }
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
        k.g.swapAt = k.now; k.buff('oncue', MARI.CUE);
        if (k.talent('marionettist_bodydouble')) k.shield('self', 150, 5, { ab: this });
        if (k.perk('marionettist_a2') && k.g.strings < 3 && !mariLimp(k)) k.g.strings++;
        if (k.talent('marionettist_cue')) { const c = abBase(k, 'cross'); if (c) k.reduceCooldown(c.id, 3); }
        if (k.consume('curtaincall')) mariBow(k, this);   // (Curtain Call: the bow)
        k.fx('swap', { i });
        mariShare(k);
      },
      fx: { color: '#f0a8cc' },
    },
    {
      id: 'finale', name: 'Grand Finale', type: 'gcd', target: 'enemy', range: 640, cd: 10, anim: 'big',
      desc: 'Spend 5 Encore: the Doll performs a routine of five hits, each {d:160}. It can\'t move while it plays.',
      usable: k => k.g.encore >= 5 && mariReady(k),
      glow: k => k.g.encore >= 5,
      effect(k) {
        const E = k.g.encore, ab = this, hits = k.perk('marionettist_w3') ? 6 : 5;
        k.g.encore = k.talent('marionettist_encore') ? 2 : 0;
        k.ultGain(MARI_ULT.GAIN_FINALE * E);   // (Curtain Call)
        for (const d of k.g.dolls) { d.mode = 'finale'; d.until = k.now + 0.45 * hits + 0.2; }
        for (let i = 0; i < hits; i++) k.after(0.45 * i, () => mariHit(k, ab, MARI.FINALE, { autoCrit: i === hits - 1 && k.talent('marionettist_curtain') }));
        if (E >= 5 && k.talent('marionettist_bow')) { k.g.strings = 3; for (const d of k.g.dolls) d.safe = k.now + 0.45 * hits + 1; }
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
    usable: k => k.g.spool >= 20,
    glow: k => k.g.spool >= 60,
    effect(k, t) {
      k.spend('spool', 20);
      const { amount, crit } = k.healAmount(400, { ab: this });
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
      const p = mariPos(k);
      k.g.dolls.forEach((d, i) => { if (d.mode !== 'limp') { d.x = p.x + (i ? 30 : -30); d.y = p.y + 20; d.mode = 'post'; d.until = k.now + 0.6; } });
      mariShare(k);
    },
    fx: { color: '#d03050' },
  },
});
// (the Understudy's two Dolls each hit at 58%: its Tangle says so in numbers)
TALENT_ABILITIES.marionettist_tangle.spec = { understudy: Object.assign({}, TALENT_ABILITIES.marionettist_tangle.ab, {
  desc: 'Each Doll in reach winds its strings round the enemy: a {d:92.8} cut now, and it bleeds {d:22} every 2s for 10s. Builds 1 Encore.' }) };

if (typeof module !== 'undefined') Object.assign(module.exports, { WEAVE, weaveMax, weaveHosted, weaveThreads, weaveCount, weaveStrained, weaveSpool, weaveCarry, weaveSnapped, weaveLoose, weaveTieGlow, weaveTiedTo, weaveTie, weaveSnip, weaveTighten, weaveShuttleN, weaveShuttle,
  MARI, MARI_STRING, MARI_FAR, mariStretch, mariEnemy, mariER, mariPos, mariLimp, mariInReach, mariReady, mariStation, mariPick, mariLose, mariEncore, mariTick, mariShare, mariHit, mariCross,
  mariLineOn, mariAim });

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
  HOLLOW: 8, HOLLOW_LONG: 10, GRACE: 4, CD: 60, DMG: 0.3, WAKE: 0.25,   // (HOLLOW_HOST in fight.js clamps what the kit asks for)
  ULT_SPEND: 0.13, ULT_SAVE: 25, ULT_HIT: 800, ULT_HIT_G: 8, ULT_SH: 200, ULT_SH_G: 3, ULT_MIT: 0.1,
};
const gloomDur = k => (k.def.hollowLong ? GLOOM.HOLLOW_LONG : GLOOM.HOLLOW);
const gloomGraceLen = k => GLOOM.GRACE;
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
    k.g.hollowUntil = k.now + d.d; k.g.graceUntil = k.now + d.d + d.g;
    k.g.hl = { debt: 0, healed: 0, at: k.now };
    k.stats.hollows = (k.stats.hollows || 0) + 1;
    k.fx('hollow-on', { d: d.d, g: d.g });
    return;
  }
  k.clear('hollow'); k.g.hollowUntil = 0; k.g.graceUntil = 0; k.g.hl = null;
  if (d.ok) {
    k.stats.hollowSaves = (k.stats.hollowSaves || 0) + 1;
    k.ultGain(GLOOM.ULT_SAVE);   // (Eclipse of the Vigil)
    if (k.talent('gloomsworn_wakened')) { for (const id of ['mantle', 'rite']) { const a = k.abilities.find(x => k.baseId(x) === id); if (a) k.refill(a.id); } }
    if (k.talent('gloomsworn_weeping') && d.debt > 0) k.shield('party', Math.min(k.env.maxHp() * 0.25, d.debt * 0.5) / ENGINE.POT_SCALE, 8, { ab: k.abilities[3] });
    k.fx('hollow-end', { ok: 1 });
  } else k.fx('hollow-end', { ok: 0 });
}
const gloomStrikeReady = k => (k.g.gloom || 0) >= GLOOM.STRIKE;
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
    }
    if (type === 'hollow') gloomHollowNote(k, d);
    if (type === 'hollowtick') k.g.hl = d.on ? { debt: d.debt, healed: d.healed, at: k.now } : null;
  },
  tick(k) {
    const g = k.g, now = k.now;
    gloomSend(k);
    tankUltHits(k, 6);   // (Eclipse of the Vigil: the hits you take also fill it, as the other tanks')
    onBossCast(k, () => { if (k.talent('gloomsworn_omen')) k.buff('omen', 8); });
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
    'Hold the vessel full before the hits that could kill you (the tankbuster, the raidwide on a sagging tank). Hollow comes back once a minute.',
    'Shade Step closes the gap and gives your next two Gloom Strikes an echo for 4s: step when you hold the Gloom for both.',
    'Black Pall is the party\'s cooldown and costs Gloom you may want to keep: spend it on the raidwide that matters.',
  ],
  abilities: [
    {
      id: 'rend', name: 'Rend', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'Three-hit combo on one button: Rend ({d:220}) > Sunder ({d:300}) > Gloaming ({d:390}). Every hit you land fills 8 Gloom. It carries your taunt.',
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
      desc: 'Spend 40 Gloom: a heavy blow for {d:540} that wraps you in a barrier of {s:150} for 6s. Two charges. Needs 40 Gloom.',
      usable: k => gloomStrikeReady(k),
      glow: k => (k.g.gloom || 0) >= 90,
      effect(k) {
        const pot = 760, sen = !!k.def.sentinel;
        k.spend('gloom', GLOOM.STRIKE);
        k.damage(pot, { ab: this });
        gloomEcho(k, this, pot);
        // a Reaver of Dusk's Strike echoes again while Hollow
        if (k.def.hollowEcho && gloomHollow(k)) { k.after(0.55, () => k.damage(pot * GLOOM.ECHO, { ab: this, extra: true })); k.fx('shade-echo'); }
        if (k.talent('gloomsworn_interest') && (k.g.gloom || 0) >= 40) k.after(0.4, () => k.damage(pot * 0.4, { ab: this, extra: true }));
        const dur = sen ? 10 : 6;
        if (sen) k.shield('lowest', 110, dur, { ab: this });   // (a Sentinel's barrier chains on to the most hurt ally; if that is you, yours below replaces it)
        k.shield('self', k.perk('gloomsworn_a2') ? 225 : 150, dur, { ab: this });
      },
      fx: { type: 'slash', color: '#5a3a8a', r: 60, span: 1.3 },
    },
    {
      id: 'shade', name: 'Shade Step', type: 'ogcd', target: 'enemy', range: 320, cd: 15, lock: 0.4, anim: 'attack',
      desc: 'Step through the dark to your target and cut it for {d:150}. For 4s your next two Gloom Strikes echo, hitting again for 85%.',
      effect(k) {
        if (!k.env.target({ target: 'enemy', range: MELEE })) k.teleport('dash', { ab: this, d: 150 });
        k.damage(150, { ab: this });
        const n = k.perk('gloomsworn_w2') ? 3 : 2;
        k.buff('shade', GLOOM.ECHO_DUR, {}, n, n);
        if (k.talent('gloomsworn_veil')) k.mitigate('self', 0.15, 4, { ab: this });
      },
      fx: { type: 'slash', color: '#8a6ac8', r: 40, span: 1.1 },
    },
    {
      id: 'pall', name: 'Black Pall', type: 'ogcd', target: 'self', cd: 60, lock: 0.5, anim: 'big',
      desc: 'Spend 30 Gloom: a pall falls over the whole party, 25% less damage taken for 6s (8s as a Sentinel).',
      usable: k => (k.g.gloom || 0) >= GLOOM.PALL,
      glow: k => { const b = bossNow(k); return !!(b && b.wide) && (k.g.gloom || 0) >= GLOOM.PALL; },
      effect(k) {
        k.spend('gloom', GLOOM.PALL);
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
  id: 'vigil', replaces: 'pall', icon: 'pall', name: 'Vigil Ward', type: 'ogcd', target: 'self', cd: 45, lock: 0.5, anim: 'big',
  desc: 'Spend 30 Gloom: stand watch over whoever is hurt most (you, if that is you). They take 50% less damage for 5s and are wrapped in a barrier of {s:200} for 6s. You take 15% less damage for 5s.',
  usable: k => (k.g.gloom || 0) >= GLOOM.PALL,
  glow: k => { const b = bossNow(k); return !!(b && b.casting && !b.onMe) && (k.g.gloom || 0) >= GLOOM.PALL; },
  effect(k) {
    k.spend('gloom', GLOOM.PALL);
    k.mitigate('lowest', 0.5, 5, { ab: this });
    k.shield('lowest', 200, 6, { ab: this });
    k.mitigate('self', 0.15, 5, { ab: this });
    k.fx('black-pall');
  },
  fx: { type: 'ring', color: '#8a6ac8', r: 70 },
} };
TALENT_ABILITIES.gloomsworn_pyre = { cls: 'gloomsworn', ab: {
  id: 'pyre', replaces: 'rite', icon: 'rite', name: 'Black Pyre', type: 'ogcd', target: 'enemy', range: 300, cd: 90, lock: 0.5, anim: 'big',
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

if (typeof module !== 'undefined') Object.assign(module.exports, { GLOOM, gloomGain, gloomEcho, gloomSend, gloomHollowNote, gloomStrikeReady, gloomDur, gloomGraceLen });

// ======================================================================= THRESHER (damage, class 19): afflict, ripen, reap
// Four AFFLICTIONS (k.g.aff: id -> the second it was laid) build on the boss: Mark (Slash; a damage over time that keeps
// ticking after its bonus is paid), Drain (Cleave; heals you a little while it lasts), Bind (Gloam Blink and the Wisp; a pulse
// of damage every few seconds) and Thread (Hook; planted, snapped for burst). They RIPEN with age: young (green) for the first
// few seconds, gold while ripe, then rotten. A hit lays an affliction that is not up, or one that has rotted; a ripe one is left to
// ripen. Reap spends them all: gold pays in full, young a little, rotten a smaller, messy payout. Gather puts every affliction
// back on the young/ripe edge (so it is gold at once, and its rot is reset). Spirit Wisp is a timed, cosmetic companion
// (like the Ranger's falcon: a damage over time and a buff, nothing synced). Reaper's Gate (T) is a window: you vanish, every
// Slash is a Gate Strike that lays one affliction in turn, and the fifth releases all four at full ripeness.
const THRESH = {
  IDS: ['mark', 'drain', 'bind', 'thread'],
  NAMES: { mark: 'Mark', drain: 'Drain', bind: 'Bind', thread: 'Thread' },
  YOUNG: 3, ROT: 8, LIFE: 6,            // young under YOUNG s, gold until ROT s, rotten after; gone LIFE s later
  SWING: 1.2,                           // Backswing: the next hit pressed this soon after the last recovery
  SLASH: 200, CLEAVE: 270, BACK: 90,
  HOOK: 150, HOOK_AGE: 1.5, BLINK: 140, BLINK_MIT: 0.5,
  MARK_DOT: 28, MARK_DUR: 12, BIND: 60, BIND_EVERY: 4, DRAIN_EVERY: 3, DRAIN_HEAL: 0.012, DRAIN_POP: 0.03,
  BASE: 120, PAY: { mark: 110, drain: 100, bind: 110, thread: 170 },   // Reap: a base hit and what each affliction pays at gold
  P_YOUNG: 0.4, P_ROT: 0.65, REAP_CD: 6,
  GATHER_CD: 20,
  WISP_DUR: 15, WISP_HIT: 60, WISP_EVERY: 2.5, WISP_CD: 45, SAC: 320, SAC_BUFF: 0.1, SAC_DUR: 8,
  U_REAP: 1.6, U_GOLD: 1.2, U_OTHER: 0.4,                              // Ultimate charge: a Reap, and each affliction it cashes
  GATE: { DUR: 8, GCD: 1.0, STRIKE: 190, END: 260, MULT: 1.3 },
};
const thY = k => k.def.young || THRESH.YOUNG, thR = k => k.def.rot || THRESH.ROT;
// 0: not up, 1: young, 2: gold (ripe), 3: rotten
function thStage(k, id) {
  const at = k.g.aff[id];
  if (at == null) return 0;
  const a = k.now - at;
  return a < thY(k) ? 1 : a < thR(k) ? 2 : 3;
}
const thCount = (k, stage) => THRESH.IDS.filter(id => (stage ? thStage(k, id) === stage : thStage(k, id) > 0)).length;
const thAb = (k, id) => k.abilities.find(a => k.baseId(a) === id) || k.baseAbilities.find(a => k.baseId(a) === id);
// lay an affliction: one that is not up, or has rotted, starts again young; a ripening one is left to ripen
function thApply(k, id) {
  if (k.def.noAff && k.def.noAff.indexOf(id) >= 0) return;
  const st = thStage(k, id);
  if (st !== 0 && st !== 3) return;
  k.g.aff[id] = k.now;
  if (id === 'bind') k.g.bindAt = k.now + THRESH.BIND_EVERY;
  if (id === 'drain') k.g.drainAt = k.now + THRESH.DRAIN_EVERY;
  if (id === 'mark') k.dot('mark', THRESH.MARK_DOT, THRESH.MARK_DUR, 3, { ab: thAb(k, 'slash') });
  k.fx('afflict', { id });
}
// every affliction that is up ripens by `secs` (it counts as that much older)
function thAge(k, secs) { for (const id of THRESH.IDS) if (k.g.aff[id] != null) k.g.aff[id] -= secs; }
// ... or to the young/ripe edge at the least
function thRipen(k) { for (const id of THRESH.IDS) if (k.g.aff[id] != null && k.now - k.g.aff[id] < thY(k)) k.g.aff[id] = k.now - thY(k); }
const thGold = k => thCount(k, 2) > 0;
// what a Reap (or the Gate's fifth strike, or Cull) pays: a base hit, then each affliction in turn. stage: id -> 1|2|3
function thPayout(k, ab, stage, o) {
  let n = 0, gold = 0, rot = 0;
  k.damage(o.base * o.mult, { ab });
  for (const id of THRESH.IDS) {
    const s = stage[id];
    if (!s) continue;
    n++; if (s === 2) gold++; if (s === 3) rot++;
    const f = s === 1 ? THRESH.P_YOUNG : s === 2 ? 1 : o.rotPay;
    k.after(o.gap * n, () => {
      k.damage(THRESH.PAY[id] * f * o.mult, { ab, extra: true });
      if (id === 'drain' && s !== 3) k.healRaw(k.talent('thresher_tithe') ? 'lowest' : 'self', k.env.maxHp() * THRESH.DRAIN_POP * (s === 2 ? 1 : 0.5), { ab });
      k.fx('afflict-pop', { id, s });
    });
  }
  return { n, gold, rot };
}
const thStages = k => { const st = {}; for (const id of THRESH.IDS) st[id] = thStage(k, id); return st; };
function thCharge(k, r) { k.ultGain(THRESH.U_REAP + THRESH.U_GOLD * r.gold + THRESH.U_OTHER * (r.n - r.gold)); }
// Reap, and what the talents add to it
function thReap(k, ab) {
  const st = thStages(k), m = k.def.reapMult || 1;
  const r = thPayout(k, ab, st, { base: THRESH.BASE, mult: m, rotPay: k.def.rotPay || (k.perk('thresher_a2') ? 0.8 : THRESH.P_ROT), gap: 0.14 });
  for (const id of THRESH.IDS) if (st[id]) k.g.aff[id] = k.talent('thresher_second') && st[id] === 2 ? k.now - thY(k) * 0.6 : null;   // (Second Growth: a gold one stays, just young)
  if (k.talent('thresher_compost') && r.rot > 0) k.dot('compost', 30 * r.rot, 8, 2, { ab });
  if (k.talent('thresher_joined') && k.has('wisp')) { k.after(0.3, () => k.damage(140, { ab, extra: true })); k.fx('wisp-strike'); }
  if (k.talent('thresher_gleaning') && r.gold >= 2) k.buff('gleaning', 10);
  thCharge(k, r);
  k.g.swingBy = k.now + k.gcdLen + THRESH.SWING;
  k.fx('reap', { gold: r.gold, n: r.n, rot: r.rot });
  return r;
}
// Slash and Cleave (the Gate's strikes are theirs, below)
function thSlash(k, ab) {
  const g = k.g, step = k.now < g.comboUntil ? g.step : 0, back = k.now <= g.swingBy, pot = step ? THRESH.CLEAVE : THRESH.SLASH;
  k.damage(pot, { ab });
  if (step === 0) { thApply(k, 'mark'); if (k.def.sower) thApply(k, 'drain'); }
  else { thApply(k, 'drain'); if (k.def.sower) thApply(k, 'bind'); }
  g.step = (step + 1) % 2; g.comboUntil = k.now + 15;
  if (k.consume('gleaning')) { k.after(0.2, () => k.damage(pot * 0.35, { ab, extra: true })); k.fx('backswing'); }
  if (back) {
    k.after(0.28, () => k.damage(THRESH.BACK * (k.perk('thresher_w1') ? 1.5 : 1), { ab, extra: true }));
    if (k.talent('thresher_drag')) thAge(k, 1);
    k.fx('backswing');
  }
  g.swingBy = k.now + k.gcdLen + THRESH.SWING;
}
function thSacrifice(k, ab) {
  k.dots.delete('wisp'); k.clear('wisp'); k.g.wispOn = false;
  k.damage(THRESH.SAC, { ab });
  thRipen(k);
  k.buff('wispgift', THRESH.SAC_DUR);
  k.cd[ab.id] = Math.max(k.now, (k.g.wispAt || 0) + THRESH.WISP_CD);
  k.fx('wisp-sacrifice');
}

KITS.thresher = {
  potMult: 1.05,   // balance knob (tools/simulate.js)
  auto: { kind: 'slash', potency: 40, range: MELEE },
  gauge: { kind: 'harvest', key: 'aff', max: 100, label: 'Harvest', w: 150 },
  init: () => ({ aff: {}, step: 0, comboUntil: 0, swingBy: 0, bindAt: 0, drainAt: 0, gate: 0, wispAt: -99, wispOn: false, castSeen: false }),
  dmgMod: k => (k.has('wispgift') ? THRESH.SAC_BUFF : 0),
  onDamage(k, amount, crit, opts) {
    if (opts.dot && opts.ab && k.baseId(opts.ab) === 'wisp') { k.fx('wisp-strike'); if (thStage(k, 'bind') === 0) thApply(k, 'bind'); }
  },
  tick(k) {
    const g = k.g, now = k.now, life = thR(k) + THRESH.LIFE, far = { target: 'enemy', range: 2000 };
    for (const id of THRESH.IDS) if (g.aff[id] != null && now - g.aff[id] >= life) g.aff[id] = null;   // (it has fallen away)
    // Bind pulses while it is up and not rotten; Drain mends you the same way
    if (g.aff.bind != null && now >= g.bindAt) {
      g.bindAt = now + THRESH.BIND_EVERY;
      if (thStage(k, 'bind') < 3 && k.env.target(far)) { k.damage(THRESH.BIND, { ab: thAb(k, 'blink'), extra: true }); k.fx('bind-pulse'); }
    }
    if (g.aff.drain != null && now >= g.drainAt) {
      g.drainAt = now + THRESH.DRAIN_EVERY;
      const s = thStage(k, 'drain');
      if (s < 3 && k.env.target(far)) { k.healRaw(k.talent('thresher_tithe') ? 'lowest' : 'self', k.env.maxHp() * THRESH.DRAIN_HEAL * (s === 2 ? 1.5 : 1), { ab: thAb(k, 'slash') }); k.fx('drain-tick'); }
    }
    onBossCast(k, () => { if (k.talent('thresher_omen')) { thRipen(k); k.fx('omen'); } });
    // the Wisp ran out on its own: with Sacrifice held the cooldown only starts now (counted from the summon)
    if (g.wispOn && !k.has('wisp')) { g.wispOn = false; const w = thAb(k, 'wisp'); if (w) k.cd[w.id] = Math.max(k.cd[w.id] || 0, g.wispAt + THRESH.WISP_CD); }
  },
  signature: 'Ripeness',
  floor: 'Press Q to cut, and E when it glows: that is the harvest. Keep Q going, and weave the others when they are ready.',
  ceiling: [
    'Slash lays a Mark and Cleave a Drain; Hook plants a Thread and Gloam Blink binds. An affliction is young for 3s (green), gold for the next 5s, then rotten. Reap pays gold in full, young 40%, rotten 65%: watch the gauge, and Reap when most of it is gold.',
    'A hit only lays an affliction that is not up or has rotted: it does not reset one that is ripening. So the gold comes of its own accord, and rot comes of waiting.',
    'Gather puts every affliction back on the edge of ripe, gold at once and its rot reset. Use it to Reap early, or to hold the gold for the party\'s burst.',
    'Backswing: press the next Q within 1.2s of your recovery and the scythe comes back round for a second hit. Every Reap you make keeps it going.',
    'Reaper\'s Gate: every hit lays the next affliction in turn, and the fifth strike releases all four at full ripeness. Open it with your afflictions up, and the party\'s burst.',
  ],
  abilities: [
    {
      id: 'slash', name: 'Slash', type: 'gcd', target: 'enemy', range: MELEE, anim: 'attack',
      desc: 'Two-hit combo on one button: Slash ({d:200}) > Cleave ({d:270}), a wide arc. Slash lays a Mark on the boss and Cleave a Drain. Press the next hit within 1.2s of your recovery and a Backswing follows for {d:90}.',
      label: k => ['Slash', 'Cleave'][k.now < k.g.comboUntil ? k.g.step : 0],
      fxStep: k => (k.now < k.g.comboUntil ? k.g.step : 0),
      effect(k) { thSlash(k, this); },
      fx: { type: 'slash', color: '#9be06a', r: 64, span: 2.3 },
    },
    {
      id: 'hook', name: 'Hook', type: 'ogcd', target: 'enemy', range: 320, charges: 2, cd: 12, lock: 0.4, anim: 'attack',
      desc: 'Throw the chain: if you are not at the boss, pull yourself in, and cut for {d:150}. It plants a Thread on the boss and ages Mark, Drain and Bind by 1.5s. Two charges.',
      glow: k => thStage(k, 'thread') === 0,
      effect(k) {
        if (!k.env.target({ target: 'enemy', range: MELEE })) k.teleport('dash', { ab: this, d: 150 });
        thAge(k, k.perk('thresher_w2') ? 2.5 : THRESH.HOOK_AGE);
        k.damage(THRESH.HOOK, { ab: this });
        thApply(k, 'thread');
        if (k.talent('thresher_weight') || k.def.sower) thApply(k, 'bind');
        k.g.swingBy = Math.max(k.g.swingBy, k.now + 3);
      },
      fx: { type: 'slash', color: '#7fc86a', r: 44, span: 1.1 },
    },
    {
      id: 'reap', name: 'Reap', type: 'gcd', target: 'enemy', range: MELEE, cd: k => k.def.reapCd || THRESH.REAP_CD, anim: 'bash',
      desc: 'Spend every affliction on the boss. A cut for {d:120}, then each pays out: Mark {d:110}, Drain {d:100} (and mends you for 3% of your health), Bind {d:110} and Thread {d:170}. Gold pays in full, young 40%, rotten 65%. Glows when something is gold. Needs an affliction up.',
      usable: k => thCount(k) > 0,
      glow: k => thGold(k),
      effect(k) { thReap(k, this); },
      fx: { type: 'slash', color: '#e8c84a', r: 76, span: 3.0 },
    },
    {
      id: 'gather', name: 'Gather', type: 'ogcd', target: 'self', cd: THRESH.GATHER_CD, lock: 0.8, anim: 'cast',
      desc: 'Pull every affliction on the boss back to the edge of ripe: gold at once, with the rot reset. It does not lay any that are not up.',
      usable: k => thCount(k) > 0,
      glow: k => thCount(k, 3) > 0 || (thCount(k, 1) >= 2 && thCount(k, 2) === 0),
      effect(k) {
        for (const id of THRESH.IDS) if (k.g.aff[id] != null) k.g.aff[id] = k.now - thY(k);
        if (k.talent('thresher_hush')) k.shield('self', 100, 6, { ab: this });
        k.fx('gather');
      },
      fx: { type: 'aura', color: '#d8c84a', r: 40, dur: 1.5 },
    },
    {
      id: 'blink', name: 'Gloam Blink', type: 'ogcd', target: 'enemy', range: 320, charges: 2, cd: 15, lock: 0.4, anim: 'attack',
      desc: 'Cut through the dark to the boss for {d:140} and bind it: a Bind pulses for {d:60} every 4s while it lasts. The cut keeps your Backswing going, and you take 50% less damage for 1s. Two charges.',
      glow: k => thStage(k, 'bind') === 0,
      effect(k) {
        if (!k.env.target({ target: 'enemy', range: MELEE })) k.teleport('dash', { ab: this, d: 150 });
        k.damage(THRESH.BLINK, { ab: this });
        thApply(k, 'bind');
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
      glow: k => k.has('wisp') && k.talent('thresher_sacrifice') && thCount(k, 1) + thCount(k, 2) >= 3,
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
  id: 'sowing', replaces: 'gather', icon: 'sowing', name: 'Sowing', type: 'ogcd', target: 'enemy', range: 420, cd: 25, lock: 0.6, anim: 'cast',
  desc: 'Sow ruin: all four afflictions land on the boss at once, young (any that is ripening is left to ripen), and a cut for {d:100}.',
  glow: k => thCount(k) <= 1,
  effect(k) {
    k.damage(100, { ab: this });
    for (const id of THRESH.IDS) thApply(k, id);
    k.fx('sowing');
  },
  fx: { type: 'zone', color: '#7fc86a', r: 90, range: 0, dur: 1.5 },
} };
TALENT_ABILITIES.thresher_cull = { cls: 'thresher', ab: {
  id: 'cull', replaces: 'wisp', icon: 'cull', name: 'Cull', type: 'ogcd', target: 'enemy', range: MELEE, cd: 40, lock: 0.6, anim: 'big',
  desc: 'Take what is owed now: every affliction on the boss pays out as if it were gold, whatever its age, and none is spent. A cut for {d:120} first, then Mark {d:110}, Drain {d:100}, Bind {d:110} and Thread {d:170}.',
  usable: k => thCount(k) > 0,
  glow: k => thCount(k) >= 3,
  effect(k) {
    const st = {}; for (const id of THRESH.IDS) st[id] = thStage(k, id) ? 2 : 0;
    const r = thPayout(k, this, st, { base: THRESH.BASE, mult: k.def.reapMult || 1, rotPay: 1, gap: 0.14 });
    thCharge(k, r);
    k.fx('cull', { n: r.n });
  },
  fx: { type: 'slash', color: '#c8e84a', r: 70, span: 2.6 },
} };

// Reaper's Gate (T). Fills from Reaps (more for every gold affliction they cash). A window of 8s: you vanish (nothing can touch
// you), and every Slash is a Gate Strike on a 1s global cooldown that lays the next affliction in turn (Mark, Drain, Bind, Thread);
// the fifth strike releases all four at full ripeness, a heavy burst, and the cycle starts again.
const GATE = THRESH.GATE, GATE_ORDER = ['mark', 'drain', 'bind', 'thread'];
ULTIMATES.thresher = {
  id: 'reapersgate', name: 'Reaper\'s Gate', slot: 7, type: 'ogcd', ult: true, mode: 'window', target: 'enemy', range: 380, anim: 'big', icon: 'gate',
  lock: 0.6, dr: 0.3,
  charge: { rate: 0.4, keep: 0.5 },
  botOk: k => !!k.env.target({ target: 'enemy', range: 220 }) && thCount(k) >= 1,
  desc: `Step through the Gate and out of the world for ${GATE.DUR}s: nothing can touch you, and you strike from behind your target. Slash becomes <b>Gate Strike</b> on a ${GATE.GCD}s global cooldown: each one cuts for {d:${GATE.STRIKE}} and lays the next affliction in turn (Mark, Drain, Bind, Thread). ` +
    `The fifth strike releases all four at full ripeness: {d:${GATE.END}} and every affliction paying at gold, ${Math.round((GATE.MULT - 1) * 100)}% more. Your afflictions are spent (Open Gate keeps them). ` +
    'You take 30% less damage and can\'t be knocked back while you step through.' +
    `<div class="it-ult"><span><u>Charge:</u> ${THRESH.U_REAP}% for every Reap, ${THRESH.U_GOLD} more for every gold affliction it cashes (${THRESH.U_OTHER} for the others), and a little on its own while you fight. It never drains; a fall keeps half.</span></div>`,
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
        desc: `Reaper's Gate: a strike for {d:${GATE.STRIKE}} that lays the next affliction in turn (Mark, Drain, Bind, Thread). The fifth releases all four at full ripeness.`,
        glow: k => k.g.gate >= 4,
        effect(k) {
          const n = k.g.gate | 0;
          if (n < 4) {
            k.damage(GATE.STRIKE, { ab: this });
            const id = GATE_ORDER[n];
            if (k.g.aff[id] == null || thStage(k, id) === 3) {
              k.g.aff[id] = k.now;
              if (id === 'bind') k.g.bindAt = k.now + THRESH.BIND_EVERY;
              if (id === 'drain') k.g.drainAt = k.now + THRESH.DRAIN_EVERY;
              if (id === 'mark') k.dot('mark', THRESH.MARK_DOT, THRESH.MARK_DUR, 3, { ab: this });
              k.fx('afflict', { id });
            }
            k.g.gate = n + 1;
            k.fx('gate-strike', { n });
            return;
          }
          const st = {}; for (const id of THRESH.IDS) st[id] = 2;
          const r = thPayout(k, this, st, { base: GATE.END, mult: GATE.MULT, rotPay: 1, gap: 0.12 });
          if (!k.talent('thresher_opengate')) for (const id of THRESH.IDS) k.g.aff[id] = null;
          k.g.gate = 0;
          k.fx('gate-release', { n: r.n });
        },
      },
    },
    onEnd(k) { k.clear('gate'); k.g.gate = 0; k.fx('gate-close'); },
  },
};

if (typeof module !== 'undefined') Object.assign(module.exports, { THRESH, thStage, thCount, thApply, thPayout, thReap, thSlash, thAge, thRipen, thY, thR });

// every tank's taunt carrier (TAUNT_CARRY, next to TAUNT): a spec's kit copies it from the base kit (specs.js specKit)
for (const [cls, id] of Object.entries(TAUNT_CARRY)) if (KITS[cls]) KITS[cls].tauntOn = id;
// ... and its Ultimate (ULTIMATES, next to TAUNT), copied the same way
for (const [cls, u] of Object.entries(ULTIMATES)) if (KITS[cls]) KITS[cls].ultimate = u;
