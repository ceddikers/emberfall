// The Founding: the secret chain, host side (pass 3). A long run of hidden big fights, one after another, Hero of the Empire style.
//   * The first link wakes from a curious act (a cracked bell on the Ledge, from wave 3). Each kill wakes the next 2-3 minutes later
//     somewhere else on the map: the host sends only `chwake i hx hy` (a rough point), the client plays a far sound and pulses the
//     minimap edge toward it. The party finds it through the fog; the boss itself appears when a hero comes close.
//   * The chain stops when the siege (the last wave) begins, or the run ends.
//   * Gold: part `chain` (15 for the first kill, +5 each, 60 for the tenth). Each link drops its found-only item (never shop, drop table or forge).
//   * Links 1-4 are plain big bodies: high attack, two or three moves, plain telegraphs (red damage, blue share; always sent as `t` events).
//     Links 5-9 are set pieces (cover that runs out, thorns that stay, a herd in lanes, two bodies on one health pool, a pack with an
//     untouchable leader); the tenth wears the shape of each link in turn and ends as a colossus. Every strike waits for its telegraph.
// Events (all start with ch): chbell x y | chwake i hx hy | chfound i | chm id name wind type | chdown i gold | chbonus i | chcut x y n need
//   | chsoak x y ok | chcall id | chlose i | chend | chzone id x y R arm dur kind | chzoff id | chbreak x y | chrise n | chlamps secs | chdim k
//   | chshape eid k | chpull pid x y | chcairn x y | chherd ang x y | chfell eid x y | chhound k | chpost i n need x y | chcrown pid
//   | chrage link step name.   Props: chb [x, y, rung, open], chn [cur, hx, hy, state, done, over], chs [[x, y, hits, cairn]...], chx [state...], chl [[link, kind, x, y, done]...].
// Intent used: `carry` (the generic interact) near the bell, the carved oak and the other acts' landmarks.
(function () {
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const hyp = Math.hypot, PI = Math.PI, TAU = PI * 2;
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  function segDist(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return hyp(px - (x1 + dx * t), py - (y1 + dy * t)); }

  // ---------------------------------------------------------------- the tuning (one place)
  const TUNE = {
    gapMin: 85, gapMax: 135,         // seconds between a kill and the next link waking (about two minutes; the hour run has room for ten links only for a quick party)
    bellFrom: 3,                      // the bell answers from this wave
    wakeDelay: 3,                     // seconds from the bell's ring to the Ram
    intro: 2.4,                       // a woken boss only watches for this long
    leashAway: 14,                    // no hero within `leashR` for this long: it slips back, whole, and waits to be found again
    leashR: 1000,
    pay0: 15, payStep: 5,             // gold part `chain`: 15, 20 ... 60
    weaken: 0.8,                      // a link whose optional act was done before it arrived has this share of its health
    hintJitter: 240,
    zoneTick: 0.6, zoneMax: 14,
    // the soft enrage: after `rageAt` seconds of fight (`rageAtLast` for the tenth) a named fury rises a step every `rageStep` s: +`rageDmg` damage, a little quicker
    rageAt: 112, rageAtLast: 240, rageStep: 12, rageDmg: 0.2, rageRest: 0.94,
  };

  // The chain does not scale: every link has ONE fixed health and fixed move damage whatever the party size (a goal to work towards, tuned for a full party of four;
  // smaller parties must out-level and out-gear it). It reads nothing from D.bossHpMul either. Minions have fixed health too, set for the level of their link.
  const MINION_HP = { chainwhelp: 220, foghound: 650, stonecalf: 1500 };
  const minionHp = (kind, e) => Math.round(MINION_HP[kind] * (e && e.link && e.link.i === 9 ? 1.5 : 1));

  // ---------------------------------------------------------------- the links. hp is fixed (the same for one hero or four).
  // Move types: ring (red circle round it), cone (red wedge), line (red lane; dash: it runs the lane), spot (red circles under heroes; root),
  // share (blue circle: enough heroes inside, or all take the burst; need = share of the living; fail: burst | hounds | heal | calm), call (minions);
  // set pieces: gaze, rockfall, bellow, stampede, calf, tether (see the module).
  const LINKS = [
    { id: 'ram', kind: 'ram', name: 'The Ram of the High Pass', place: [3680, 524], spawn: [3810, 528], r: 42, hp: 23600, speed: 74, reach: 40, rest: 0.75, wake: 0, home: 150, item: 'chram',
      moves: {
        jab: { type: 'cone', wind: 0.75, reach: 118, half: 0.5, dmg: 30, label: 'Horn jab' },
        swing: { type: 'cone', wind: 1.0, reach: 150, half: 1.0, dmg: 34, label: 'Horn sweep' },
        charge: { type: 'line', wind: 1.35, len: 300, hw: 48, dmg: 44, dash: 0.38, label: 'Charge', pick: 'far' },
        stamp: { type: 'ring', wind: 1.25, R: 125, dmg: 34, label: 'Stamp' },
      }, seq: ['jab', 'charge', 'swing', 'stamp', 'jab', 'jab', 'charge', 'stamp'] },
    { id: 'pike', kind: 'pike', name: 'The Pale Pike', place: [4210, 3270], spawn: [4210, 3270], r: 46, hp: 35500, speed: 60, reach: 0, rest: 0.8, wake: 380, pond: true, item: 'chpike',
      moves: {
        lunge: { type: 'line', wind: 1.25, len: 330, hw: 42, dmg: 36, dash: 0, label: 'Lunge', pick: 'any' },
        slap: { type: 'ring', wind: 1.2, R: 118, dmg: 27, label: 'Tail slap' },
        spit: { type: 'share', wind: 2.1, R: 92, dmg: 34, label: 'Pale bubble' },
      }, seq: ['lunge', 'spit', 'slap', 'lunge', 'slap', 'spit', 'lunge'] },
    { id: 'warden', kind: 'stumpwarden', name: 'The Stumpwarden', place: [5910, 744], spawn: [5910, 744], r: 52, hp: 33900, speed: 46, reach: 62, rest: 0.8, wake: 340, home: 230, item: 'chroot',
      moves: {
        slam: { type: 'cone', wind: 1.1, reach: 175, half: 0.8, dmg: 48, label: 'Bough slam' },
        pound: { type: 'ring', wind: 1.3, R: 140, dmg: 38, label: 'Pound' },
        roots: { type: 'spot', wind: 1.5, R: 72, dmg: 16, root: 2.4, count: 2, label: 'Root snare' },
        throw: { type: 'spot', wind: 1.6, R: 88, dmg: 46, count: 1, label: 'Stump throw', pick: 'far' },
      }, seq: ['slam', 'roots', 'pound', 'throw', 'slam', 'throw', 'roots', 'pound'] },
    { id: 'mother', kind: 'ashmother', name: 'The Ash Mother', place: [1400, 492], spawn: [1400, 492], r: 54, hp: 67000, speed: 56, reach: 50, rest: 0.75, wake: 340, home: 260, item: 'chfang',
      moves: {
        maul: { type: 'cone', wind: 0.9, reach: 140, half: 1.0, dmg: 42, label: 'Maul' },
        breath: { type: 'cone', wind: 1.5, reach: 390, half: 0.5, dmg: 38, label: 'Ash breath' },
        stamp: { type: 'ring', wind: 1.3, R: 150, dmg: 36, label: 'Ember stamp' },
        call: { type: 'call', wind: 1.2, n: 3, label: 'Whelp call' },
      }, seq: ['maul', 'breath', 'call', 'stamp', 'maul', 'breath', 'stamp', 'call'] },
    // 5. The Lantern Warden: a stone sentinel on the plain between the two roads. Its gaze burns what it looks at; standing stones stop it.
    { id: 'lantern', kind: 'lanternwarden', name: 'The Lantern Warden', place: [3700, 2380], spawn: [3700, 2380], r: 48, hp: 100700, speed: 36, reach: 58, rest: 0.8, wake: 380, home: 240, item: 'chain5', fx: 'lantern',
      moves: {
        gaze: { type: 'gaze', wind: 1.6, len: 560, hw: 34, dmg: 58, label: 'Gaze' },
        fist: { type: 'ring', wind: 1.2, R: 132, dmg: 50, label: 'Stone fist' },
        rockfall: { type: 'rockfall', wind: 1.5, R: 80, dmg: 54, label: 'Rockfall' },
        flare: { type: 'share', wind: 2.2, R: 124, dmg: 58, need: 0.5, lamps: true, label: 'Lantern flare' },
      }, seq: ['gaze', 'fist', 'flare', 'gaze', 'rockfall', 'fist', 'gaze', 'flare'] },
    // 6. The Hollow Stag: antler and fog in the thick woods south-east of the ford road. Every stab plants thorns that stay.
    { id: 'stag', kind: 'hollowstag', name: 'The Hollow Stag', place: [5760, 2740], spawn: [5760, 2740], r: 44, hp: 121400, speed: 72, reach: 46, rest: 0.75, wake: 380, home: 380, item: 'chain6', fx: 'stag',
      moves: {
        charge: { type: 'line', wind: 1.4, len: 400, hw: 44, dmg: 58, dash: 0.42, label: 'Charge', pick: 'far', thorns: { R: 48, dmg: 14, dur: 8, every: 105 } },
        stab: { type: 'cone', wind: 1.0, reach: 150, half: 0.55, dmg: 54, label: 'Antler stab', thorns: { R: 56, dmg: 14, dur: 8 } },
        bellow: { type: 'bellow', wind: 1.5, R: 196, zr: 58, n: 8, dmg: 15, dur: 8, label: 'Bellow' },
        heartbeat: { type: 'share', wind: 2.3, R: 150, dmg: 0, need: 1, fail: 'hounds', at: 'near', label: 'Heartbeat' },
      }, seq: ['stab', 'charge', 'bellow', 'stab', 'heartbeat', 'charge', 'stab', 'bellow'] },
    // 7. The Drover of Cairns: a ghost with a herd of stone cattle, in the west field beside the north road.
    { id: 'drover', kind: 'drover', name: 'The Drover of Cairns', place: [2560, 2480], spawn: [2560, 2480], r: 36, hp: 115300, speed: 46, reach: 52, rest: 0.8, wake: 380, home: 240, item: 'chain7', fx: 'drover',
      moves: {
        stampede: { type: 'stampede', wind: 2.1, len: 800, hw: 56, slots: 5, slot: 130, dmg: 66, label: 'Stampede', anyRange: true },
        whip: { type: 'cone', wind: 1.0, reach: 290, half: 0.32, dmg: 64, label: 'Whip crack' },
        cairn: { type: 'share', wind: 2.1, R: 104, dmg: 50, need: 0.5, ok: 'cairn', at: 'hero', label: 'Cairn call' },
        calf: { type: 'calf', wind: 1.1, label: 'Lost calf', anyRange: true },
      }, seq: ['whip', 'stampede', 'cairn', 'stampede', 'calf', 'whip', 'stampede', 'cairn'] },
    // 8. The Gorge-Twins: two gargoyles that were one statue, at the two ends of the old meadow road in the south-west.
    { id: 'twins', kind: 'gorgetwin', name: 'The Gorge-Twins', place: [1900, 4180], spawn: [1900, 4180], r: 40, hp: 164300, speed: 40, reach: 50, rest: 0.8, wake: 380, home: 150, item: 'chain8', fx: 'twins', solo: true,
      ends: [[1740, 4180], [2060, 4180]],
      moves: {
        tether: { type: 'tether', wind: 1.2, hw: 40, dmg: 56, label: 'Tether', anyRange: true },
        roar: { type: 'share', wind: 2.0, R: 118, dmg: 54, need: 0.5, at: 'self', label: 'Gorge-roar' },
        splinter: { type: 'spot', wind: 1.4, R: 64, dmg: 46, count: 3, pick: 'any', label: 'Splinter' },
        pull: { type: 'cone', wind: 1.1, reach: 240, half: 0.3, dmg: 42, pull: true, label: 'Pull' },
      }, seq: ['splinter', 'tether', 'roar', 'pull', 'tether', 'splinter', 'pull', 'roar'] },
    // 9. The Ember-Hound Pack: three hounds of different fire and their leader, on the south shore.
    { id: 'hounds', kind: 'emberlord', name: 'The Ember-Hound Pack', place: [4020, 4580], spawn: [4020, 4580], r: 42, hp: 75000, speed: 72, reach: 50, rest: 0.8, wake: 420, home: 340, item: 'chain9', fx: 'hounds',
      moves: { maul: { type: 'cone', wind: 0.95, reach: 150, half: 1.0, dmg: 60, label: 'Maul' } }, seq: ['maul'] },
    // 10. The First Hunger's Shadow: an echo of the first hungry thing, on the crater rim above Beacon Hill. It wears each link in turn.
    { id: 'shadow', kind: 'shadow', name: "The First Hunger's Shadow", place: [1600, 980], spawn: [1600, 980], r: 52, hp: 265000, speed: 52, reach: 62, rest: 0.7, wake: 420, home: 330, item: 'choath', fx: 'shadow',
      moves: { }, seq: [] },
  ];
  LINKS.forEach((L, i) => { L.i = i; if (L.built === undefined) L.built = true; L.pay = TUNE.pay0 + TUNE.payStep * i; });
  const BUILT = LINKS.length;

  // the pack: three hounds, each with its own moves; the leader takes a move from each that falls
  const HOUNDS = [
    { id: 'cinder', kind: 'hcinder', name: 'Cinder Hound', r: 24, hp: 32300, speed: 96, reach: 30, rest: 0.9, home: 340, dist: [-150, -80],
      moves: { lane: { type: 'line', wind: 1.3, len: 460, hw: 38, dmg: 46, dash: 0, label: 'Fire lane', pick: 'any' }, bite: { type: 'cone', wind: 0.7, reach: 84, half: 0.7, dmg: 32, label: 'Bite' } }, seq: ['bite', 'lane', 'lane', 'bite', 'lane'],
      gives: { name: 'flame', spec: { type: 'line', wind: 1.35, len: 460, hw: 40, dmg: 54, dash: 0, label: 'Ember lane', pick: 'any' } } },
    { id: 'thorn', kind: 'hthorn', name: 'Thornback', r: 28, hp: 37400, speed: 70, reach: 34, rest: 0.9, home: 340, dist: [140, -90],
      moves: { ring: { type: 'ring', wind: 1.2, R: 108, dmg: 44, label: 'Spine ring' }, gore: { type: 'cone', wind: 0.9, reach: 100, half: 0.8, dmg: 40, label: 'Gore' } }, seq: ['gore', 'ring', 'ring', 'gore'],
      gives: { name: 'spines', spec: { type: 'ring', wind: 1.25, R: 142, dmg: 52, label: 'Bone ring' } } },
    { id: 'howl', kind: 'hhowl', name: 'Howler', r: 22, hp: 27800, speed: 88, reach: 28, rest: 1.0, home: 340, dist: [20, -200],
      moves: { howl: { type: 'share', wind: 1.9, R: 122, dmg: 24, need: 0.5, fail: 'heal', at: 'hero', label: 'Howl' }, snap: { type: 'cone', wind: 0.65, reach: 78, half: 0.7, dmg: 28, label: 'Snap' } }, seq: ['snap', 'howl', 'snap', 'howl'],
      gives: { name: 'howl2', spec: { type: 'share', wind: 2.0, R: 128, dmg: 62, need: 0.5, fail: 'burst', at: 'hero', label: 'Pack howl' } } },
  ];

  const RAGE_NAMES = ["The Bellwether's Fury", 'The Starving Water', 'Rootrage', 'Brood-Fury', 'The Blinding Light', 'The Rut of the Fog', 'The Wild Herd', 'Gorge-Grief', 'The Pack Frenzy', 'The Hunger Wakes'];

  // the Shadow's shapes: the first nine are links 1-9 (two of each one's moves, a little harder), then the colossus
  const sc = (spec, k) => Object.assign({}, spec, { dmg: Math.round((spec.dmg || 0) * 1.18), wind: Math.max(0.7, spec.wind * 0.94) }, k || {});
  const SHAPE_MOVES = [
    L => ({ charge: sc(L[0].moves.charge), stamp: sc(L[0].moves.stamp) }),
    L => ({ lunge: sc(L[1].moves.lunge, { pick: 'any' }), spit: sc(L[1].moves.spit) }),
    L => ({ roots: sc(L[2].moves.roots), throw: sc(L[2].moves.throw) }),
    L => ({ breath: sc(L[3].moves.breath), call: Object.assign({}, L[3].moves.call, { n: 2 }) }),
    L => ({ gaze: sc(L[4].moves.gaze), flare: sc(L[4].moves.flare) }),
    L => ({ charge: sc(L[5].moves.charge), bellow: sc(L[5].moves.bellow) }),
    L => ({ stampede: sc(L[6].moves.stampede), whip: sc(L[6].moves.whip) }),
    L => ({ splinter: sc(L[7].moves.splinter), roar: sc(L[7].moves.roar) }),
    L => ({ flame: sc(HOUNDS[0].gives.spec), howl: sc(HOUNDS[2].gives.spec) }),
  ];
  const SHAPE_SEQ = [['charge', 'stamp', 'charge'], ['lunge', 'spit', 'lunge', 'spit'], ['roots', 'throw', 'roots', 'throw'], ['breath', 'call', 'breath'], ['gaze', 'flare', 'gaze'],
    ['charge', 'bellow', 'charge'], ['whip', 'stampede', 'whip', 'stampede'], ['splinter', 'roar', 'splinter'], ['flame', 'howl', 'flame']];
  const SHAPE_NAMES = ['the Ram', 'the Pike', 'the Stumpwarden', 'the Ash Mother', 'the Lantern Warden', 'the Hollow Stag', 'the Drover', 'the Twins', 'the Pack'];
  const COLOSSUS = {
    quake: { type: 'ring', wind: 2.2, R: 215, dmg: 84, label: 'Ash quake' },
    sweep: { type: 'cone', wind: 2.0, reach: 340, half: 1.5, dmg: 76, label: 'Ash sweep' },
    ashlane: { type: 'line', wind: 2.0, len: 660, hw: 82, dmg: 80, dash: 0, label: 'Ash lane', pick: 'any' },
    meteors: { type: 'spot', wind: 2.0, R: 100, dmg: 70, count: 4, pick: 'any', label: 'Ash fall' },
    stackfall: { type: 'share', wind: 2.7, R: 150, dmg: 74, need: 0.75, at: 'hero', label: 'Stack in the dark' },
  };
  const COLOSSUS_SEQ = ['quake', 'meteors', 'ashlane', 'sweep', 'stackfall', 'quake', 'ashlane', 'meteors', 'sweep', 'stackfall'];
  const ASHFALL = { type: 'share', wind: 2.4, R: 134, dmg: 64, need: 0.75, at: 'hero', label: 'Ash-fall' };

  // ---------------------------------------------------------------- enemies (load order is the same on every machine, so the type indexes match)
  const BOSS_DEF = (name, r, speed, atk) => ({ name, r, hp: 1000, speed, aggro: 0, xp: 650, gold: 90, elite: true, boss: true, kbRes: 1, drop: 0, chain: true, atk: atk || { wind: 1, cd: 2, dmg: 30, hitR: 60, reach: 20, off: 0, tele: true } });
  for (const L of LINKS) D.addEnemy(L.kind, BOSS_DEF(L.name, L.r, L.speed));
  for (const H of HOUNDS) D.addEnemy(H.kind, { name: H.name, r: H.r, hp: 1000, speed: H.speed, aggro: 0, xp: 300, gold: 40, elite: true, boss: false, kbRes: 0.9, drop: 0, chain: true, atk: { wind: 1, cd: 2, dmg: 30, hitR: 40, reach: 20, off: 0, tele: true } });
  D.addEnemy('chainwhelp', { name: 'Ash-Whelp', r: 10, hp: 30, speed: 112, aggro: 700, xp: 3, gold: 0, atk: { wind: 0.45, cd: 1.0, dmg: 5, hitR: 20, reach: 10, off: 16 } });
  D.addEnemy('foghound', { name: 'Fog-Hound', r: 12, hp: 90, speed: 118, aggro: 700, xp: 4, gold: 0, atk: { wind: 0.5, cd: 1.1, dmg: 9, hitR: 22, reach: 12, off: 18 } });
  D.addEnemy('stonecalf', { name: 'Lost Calf', r: 16, hp: 200, speed: 86, aggro: 900, xp: 6, gold: 0, atk: { wind: 0.9, cd: 2, dmg: 30, hitR: 40, reach: 10, off: 0, tele: true } });

  // ---------------------------------------------------------------- the drops (found only: never sold, never dropped by the tables, never forged)
  // Rarity climbs with the chain. Founder's Oath's skill changes are in the module (release / perfectBlock wraps).
  const ITEMS = [
    ['chram', 2, 'Ramshorn Buckle', '+110 health, 12% less damage taken, +10% damage. A cracked horn on a herdsman\'s strap.', { hp: 110, armor: 0.12, dmg: 0.10 }],
    ['chpike', 2, 'Pike-Scale Lantern', 'Your lamp shines much farther. +14% attack speed, +12% damage.', { sight: 0.9, as: 0.14, dmg: 0.12 }],
    ['chroot', 3, 'Rootbound Charm', '+200 health, heals over time, 15% less damage taken.', { hp: 200, reg: 3, armor: 0.15 }],
    ['chfang', 3, "Mother's Ember-Fang", '+22% damage, +16% attack speed. Your hits burn.', { dmg: 0.22, as: 0.16, burn: 1 }],
    ['chain5', 3, "Bluff-Watcher's Eye", '+18% damage, skills reach 20% farther. Whatever you strike is lit for four seconds: every ally hits it 10% harder.', { dmg: 0.18, range: 0.20 }],
    ['chain6', 3, 'Hollow Heart', '+260 health, 18% less damage taken. A quarter of every blow you take comes back to you four seconds later.', { hp: 260, armor: 0.18 }],
    ['chain7', 4, "Drover's Horn", '+25% damage, 15% shorter cooldowns. Your ultimate rouses the allies near you: faster for six seconds, and freed of roots and slows.', { dmg: 0.25, cdr: 0.15 }],
    ['chain8', 4, 'Gorge-Glass', '+30% attack speed, +20% damage. A tenth of the damage you deal mends the most hurt ally.', { as: 0.30, dmg: 0.20 }],
    ['chain9', 4, 'Cairn-Crown', '+300 health, heals over time, 20% shorter cooldowns. Stand still a moment and a cairn of stone shields you (every ten seconds).', { hp: 300, reg: 4, cdr: 0.20 }],
    ['choath', 4, "Founder's Oath", '+30% damage, +25% attack speed, 20% shorter cooldowns, 15% less damage taken, +150 health, heal 8% of the damage you deal. One skill is changed: Bastion\'s Brace shields the whole party on a Perfect Block; Cleric\'s Mend also mends everyone near its target; Pyromancer\'s Meteor falls twice; Ranger\'s Piercing Arrow looses a second arrow.', { dmg: 0.30, as: 0.25, cdr: 0.20, armor: 0.15, hp: 150, leech: 0.08 }],
  ];
  if (D.addItem) for (const [id, rar, name, text, stats] of ITEMS) D.addItem(id, rar, name, text, stats, 0, 0, 0, true);

  FS.mods = FS.mods || [];
  FS.mods.push(sim => {
    const C = sim.chain = {
      st: LINKS.map(() => 'dormant'),     // dormant | gap | placed | fight | done
      cur: -1, at: 0,                      // the link in play and the time its next step happens (gap end, or the Ram's wake)
      done: 0, paid: 0, over: false, rung: false, hint: [0, 0], boss: null, away: 0, items: {}, bodies: [],
      bonus: LINKS.map(() => false), bonusT: 0, bt: LINKS.map(() => 0), cuts: 0, whelpKills: 0, live: [], tune: TUNE, log: [],
      zones: [], zid: 0, stones: [], acts: {}, hold: 0, tw: null, pack: null, dim: 0, shape: -1, pile: 0,
      fightT: 0, rage: 0, rageMul: 1,
    };
    const tele = (shape, x, y, a, b, w, warn, col) => { const id = sim.tele(shape, x, y, a, b, w, warn, col); C.live.push({ id, shape, x, y, a, b, w, col: col || 0, t0: sim.time, warn }); return id; };
    const resolveTele = (id, x, y) => { sim.ev(['i', id, Math.round(x), Math.round(y)]); const k = C.live.findIndex(t => t.id === id); if (k >= 0) C.live.splice(k, 1); };
    const aliveHeroes = () => sim.heroes.filter(h => !h.dead);
    const hurt = (h, amt, e, o) => sim.hurtHero(h, Math.round(amt * C.rageMul * ((e && e.ai && e.ai.dmgMul) || 1) * ((e && e.link && e.link.dm) || 1)), e, Object.assign({ block: true }, o));   // (L.dm: a link's own hitting power)
    const nearestHero = (x, y, R) => sim.nearestHeroTo(x, y, R);
    const log = s => { if (C.log.length < 80) C.log.push(sim.time.toFixed(0) + ' ' + s); };
    const rnd = () => sim.rand();
    const walk = (x, y, r) => sim.nearestWalkable(x, y, r || 14);
    const healerOf = () => aliveHeroes().find(h => h.K && h.K.role === 'heal') || aliveHeroes()[0];
    C.focus = h => {   // what the party should strike now (the scripted test party uses this)
      if (C.pack) { const g = C.pack.hs.filter(b => !b.dead).sort((a, b) => hyp(a.x - h.x, a.y - h.y) - hyp(b.x - h.x, b.y - h.y))[0]; return g || C.pack.lead; }
      if (C.tw) { const tw = [C.tw.A, C.tw.B].filter(b => b && !b.dead).sort((a, b) => hyp(a.x - h.x, a.y - h.y) - hyp(b.x - h.x, b.y - h.y)); return tw[0] || C.boss; }
      return C.boss;
    };
    C._begin = (e, name) => beginMove(e, name);
    const spawnMinion = (kind, x, y, mod, hp) => { const w = sim.spawnAt(kind, x, y, mod, { hp }); w.chainMinion = true; return w; };

    // ------------------------------------------------------------ the chain's steps
    function startGap(i) {
      if (i >= BUILT || sim.wave >= D.LAST_WAVE) { C.over = true; C.cur = -1; log('chain over after ' + C.done); return; }
      C.cur = i; C.st[i] = 'gap'; C.at = sim.time + TUNE.gapMin + rnd() * (TUNE.gapMax - TUNE.gapMin); C.bonusT = 0;
    }
    function announce(i) {   // the link wakes: a far sound and a rough direction, nothing else
      const L = LINKS[i]; C.st[i] = 'placed';
      C.hint = [Math.round((L.place[0] + (rnd() - 0.5) * 2 * TUNE.hintJitter) / 20) * 20, Math.round((L.place[1] + (rnd() - 0.5) * 2 * TUNE.hintJitter) / 20) * 20];
      sim.ev(['chwake', i, C.hint[0], C.hint[1]]); log('announce ' + L.id);
    }
    function mkBody(L, x, y, hp, o) {
      o = o || {};
      const ai = Object.assign({ intro: TUNE.intro, rest: 1.0, k: 0, mv: null, tgt: null, tgtT: 0, wind: false, dash: null, orb: 0, hx: L.place[0], hy: L.place[1], home: L.home, force: null, seq: null, moves: null, dmgMul: 1, restMul: 1 }, o.ai);
      const e = sim.spawnAt(o.kind || L.kind, x, y, MOD, { hp, face: o.face === undefined ? PI : o.face, ai });
      e.link = o.link || L; return e;
    }
    function spawnBoss(i) {
      const L = LINKS[i], weak = C.bonus[i] ? TUNE.weaken : 1, mul = weak;
      C.bodies = []; C.zones.length = 0; C.stones.length = 0; C.tw = null; C.pack = null; C.hold = 0; C.dim = 0; C.shape = -1;
      C.fightT = 0; C.rage = 0; C.rageMul = 1;
      let e;
      if (L.fx && FX[L.fx].spawn) e = FX[L.fx].spawn(L, mul);
      else { const sp = walk(L.spawn[0], L.spawn[1]); const hp = Math.round(L.hp * mul); e = mkBody(L, L.pond ? L.spawn[0] : sp[0], L.pond ? L.spawn[1] : sp[1], hp, { face: L.pond ? PI / 2 : PI }); }
      e.chain = i; C.st[i] = 'fight'; C.boss = e; C.away = 0;
      sim.ev(['boss', e.id, e.type]); sim.ev(['chfound', i]); log('spawn ' + L.id + ' hp ' + e.max);
      if (L.fx && FX[L.fx].after) FX[L.fx].after(e);
      return e;
    }
    function clearField() {   // zones, stones, minions and the other bodies go
      for (const z of C.zones) sim.ev(['chzoff', z.id]);
      C.zones.length = 0; C.stones.length = 0;
      for (const m of sim.enemies) if (m.chainMinion || m.chainX) m.dead = true;
      for (const t of C.live) sim.ev(['i', t.id, t.x, t.y]);
      C.live.length = 0; C.bodies = []; C.tw = null; C.pack = null; C.hold = 0; C.rage = 0; C.rageMul = 1; C.fightT = 0;
    }
    function despawn(e) {   // it slips back: a wipe, or everyone left; it waits where it was, whole
      e.dead = true; const i = e.chain; C.st[i] = 'placed'; C.boss = null; clearField();
      sim.ev(['chlose', i]); log('despawn ' + LINKS[i].id);
    }
    function award(i, at) {   // the found-only item goes to the hero with the fewest chain items who has room (in play it lies where the link fell, and never fades)
      if (at && !sim.autoLoot && sim.worldDrop) { sim.worldDrop(at.x, at.y, LINKS[i].item, { keep: true }); return null; }
      const id = LINKS[i].item, order = sim.heroes.slice().sort((a, b) => (C.items[a.id] || 0) - (C.items[b.id] || 0));
      for (const h of order) if (sim.giveItem(h, id)) { C.items[h.id] = (C.items[h.id] || 0) + 1; sim.ev(['dr', h.id, id]); return h; }
      for (const h of sim.heroes) { h.gold += 60; h.dirty = true; }
      return null;
    }

    // ------------------------------------------------------------ zones that stay (thorns): a red circle warns, then it burns while it lasts
    function addZone(e, x, y, R, dmg, dur, arm, kind) {
      if (C.zones.length >= TUNE.zoneMax) { const z = C.zones.shift(); sim.ev(['chzoff', z.id]); if (!z.armed) resolveTele(z.tele, z.x, z.y); }
      const id = ++C.zid, tl = tele(0, x, y, R, 0, 0, arm);
      C.zones.push({ id, x, y, R, dmg, arm: sim.time + arm, until: sim.time + arm + dur, next: 0, src: e, tele: tl, armed: false, kind: kind || 0 });
      sim.ev(['chzone', id, Math.round(x), Math.round(y), R, arm, dur, kind || 0]);
    }
    function tickZones() {
      const t = sim.time;
      for (let k = C.zones.length - 1; k >= 0; k--) {
        const z = C.zones[k]; if (!z) continue;   // (a blow that ends the fight clears the zones under this loop)
        if (!z.armed && t >= z.arm) {   // the warning ends: one hard burst, then it burns
          z.armed = true; resolveTele(z.tele, z.x, z.y); z.next = t + TUNE.zoneTick;
          for (const h of aliveHeroes()) if (hyp(h.x - z.x, h.y - z.y) < z.R + h.r * 0.5) hurt(h, z.dmg * 1.6, z.src, { zone: true, block: false });
        } else if (z.armed && t >= z.next) {
          z.next = t + TUNE.zoneTick;
          for (const h of aliveHeroes()) if (hyp(h.x - z.x, h.y - z.y) < z.R + h.r * 0.5) hurt(h, z.dmg, z.src, { zone: true, block: false });
        }
        if (C.zones[k] === z && t >= z.until) { C.zones.splice(k, 1); sim.ev(['chzoff', z.id]); }
      }
    }

    // ------------------------------------------------------------ standing stones and cairns: solid to heroes, and they stop a gaze
    function addStone(x, y, r, cairn) { const s = { x, y, r: r || 34, hits: 0, cairn: !!cairn }; C.stones.push(s); return s; }
    function stonesRise(e, n) {
      let made = 0;
      for (let tries = 0; tries < 30 && made < n; tries++) {
        const a = rnd() * TAU, d = 190 + rnd() * 90, p = walk(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 20);
        if (hyp(p[0] - (e.x + Math.cos(a) * d), p[1] - (e.y + Math.sin(a) * d)) > 40) continue;
        if (C.stones.some(s => hyp(s.x - p[0], s.y - p[1]) < 110)) continue;
        addStone(p[0], p[1]); made++;
      }
      if (made) sim.ev(['chrise', made]);
    }
    function stoneHit(s) { if (++s.hits >= 2) breakStone(s); }
    function breakStone(s) { const k = C.stones.indexOf(s); if (k >= 0) C.stones.splice(k, 1); sim.ev(['chbreak', Math.round(s.x), Math.round(s.y)]); }
    function stoneStop(x, y, ang, len, hw) {
      const dx = Math.cos(ang), dy = Math.sin(ang); let best = null, bt = len;
      for (const s of C.stones) {
        if (s.cairn) continue; const t = (s.x - x) * dx + (s.y - y) * dy; if (t <= 0 || t > len) continue;
        const d = Math.abs(-(s.x - x) * dy + (s.y - y) * dx);
        if (d < s.r + hw * 0.4 && t - s.r * 0.6 < bt) { bt = Math.max(30, t - s.r * 0.6); best = s; }
      }
      return { len: bt, stone: best };
    }
    function pushFromStones() {
      for (const s of C.stones) for (const h of aliveHeroes()) { const d = hyp(h.x - s.x, h.y - s.y), m = s.r + h.r; if (d < m) { const k = d < 1 ? 0 : 1 / d; h.x = s.x + (d < 1 ? m : (h.x - s.x) * k * m); h.y = s.y + (d < 1 ? 0 : (h.y - s.y) * k * m); h.path = null; } }
    }

    // ------------------------------------------------------------ the fights: one small engine, moves are data
    const MOD = { update(e, dt) { bossTick(e, dt); } };
    const movesOf = e => e.ai.moves || e.link.moves, seqOf = e => e.ai.seq || e.link.seq;
    function pickHero(e, how) {
      const hs = aliveHeroes(); if (!hs.length) return null;
      if (how === 'far') { let b = null, bd = -1; for (const h of hs) { const d = hyp(h.x - e.x, h.y - e.y); if (d > bd) { bd = d; b = h; } } if (rnd() < 0.5) return hs[Math.floor(rnd() * hs.length)]; return b; }
      if (how === 'any') return hs[Math.floor(rnd() * hs.length)];
      return nearestHero(e.x, e.y, 2000);
    }
    function lineLen(e, ang, len) {   // a charge stops where the ground ends (the Ledge is short, the woods have trunks)
      if (e.link.pond) return len;
      let d = 0; for (; d < len; d += 12) if (!M.walkable(e.x + Math.cos(ang) * (d + 12), e.y + Math.sin(ang) * (d + 12), 12)) break;
      return Math.max(60, d);
    }
    const otherBody = e => (C.tw ? (e === C.tw.A ? C.tw.B : C.tw.A) : null);
    function shareCenter(e, spec, tg) {
      if (spec.at === 'self') { const a = Math.atan2(tg.y - e.y, tg.x - e.x); return [e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90]; }
      if (spec.at === 'near') { const a = Math.atan2(tg.y - e.y, tg.x - e.x), p = walk(e.x + Math.cos(a) * 230, e.y + Math.sin(a) * 230, 16); return [p[0], p[1]]; }
      const h = pickHero(e, 'any'); return [h.x, h.y];
    }
    const CT = {   // the set-piece move types: begin(e, spec, m, tg) returns false if it cannot be used now; resolve(e, spec, m)
      gaze: {
        begin(e, spec, m) {
          const hs = aliveHeroes().slice(), n = Math.min(e.hp < e.max * 0.6 ? 2 : 1, hs.length); m.lanes = [];
          for (let k = 0; k < n; k++) {
            const h = hs.splice(Math.floor(rnd() * hs.length), 1)[0], ang = Math.atan2(h.y - e.y, h.x - e.x), want = Math.min(spec.len, hyp(h.x - e.x, h.y - e.y) + 150), st = stoneStop(e.x, e.y, ang, want, spec.hw);
            m.lanes.push({ ang, len: st.len, stone: st.stone }); m.ids.push(tele(1, e.x, e.y, ang, st.len, spec.hw, spec.wind)); m.pts.push([e.x, e.y]);
          }
          m.ang = m.lanes[0].ang; e.face = m.ang;
        },
        resolve(e, spec, m) {
          for (const L of m.lanes) {
            const x1 = e.x + Math.cos(L.ang) * L.len, y1 = e.y + Math.sin(L.ang) * L.len;
            for (const h of aliveHeroes()) if (segDist(h.x, h.y, e.x, e.y, x1, y1) < spec.hw + h.r * 0.5) hurt(h, spec.dmg, e);
            if (L.stone && C.stones.includes(L.stone)) stoneHit(L.stone);
          }
        },
      },
      rockfall: {
        can() { return C.stones.some(s => !s.cairn); },
        begin(e, spec, m) {
          const hs = aliveHeroes(), cand = C.stones.filter(s => !s.cairn).sort((a, b) => Math.min(...hs.map(h => hyp(h.x - a.x, h.y - a.y))) - Math.min(...hs.map(h => hyp(h.x - b.x, h.y - b.y)))).slice(0, 2);
          m.stones = cand; for (const s of cand) { m.ids.push(tele(0, s.x, s.y, spec.R, 0, 0, spec.wind)); m.pts.push([s.x, s.y]); }
          m.ang = Math.atan2(cand[0].y - e.y, cand[0].x - e.x);
        },
        resolve(e, spec, m) { for (const s of m.stones) { for (const h of aliveHeroes()) if (hyp(h.x - s.x, h.y - s.y) < spec.R + h.r * 0.5) hurt(h, spec.dmg, e); if (C.stones.includes(s)) breakStone(s); } },
      },
      bellow: {   // thorns burst round it in a ring; the middle is clear
        begin(e, spec, m) {
          const ph = rnd() * TAU; m.ang = ph;
          for (let k = 0; k < spec.n; k++) { const a = ph + k * TAU / spec.n, p = walk(e.x + Math.cos(a) * spec.R, e.y + Math.sin(a) * spec.R, 16); addZone(e, p[0], p[1], spec.zr, spec.dmg, spec.dur, spec.wind, 1); }
        },
        resolve() { },
      },
      stampede: {
        begin(e, spec, m) {
          const hs = aliveHeroes(), dirs = [0, PI / 2, PI, PI * 1.5], ang = dirs[Math.floor(rnd() * 4)] + (e.hp < e.max * 0.5 && rnd() < 0.5 ? PI / 4 : 0), dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
          let cx = 0, cy = 0; for (const h of hs) { cx += h.x; cy += h.y; } cx /= hs.length; cy /= hs.length;
          const cairn = C.stones.find(s => s.cairn);
          const perp0 = cairn ? cairn.x * px + cairn.y * py : cx * px + cy * py + (rnd() - 0.5) * 70, along = cx * dx + cy * dy;
          // (the free slot is always between two lanes, never at an edge where the party could simply step outside)
          const gaps = new Set(); gaps.add(cairn ? 2 : 1 + Math.floor(rnd() * (spec.slots - 2))); if (cairn) gaps.add((gaps.has(0) ? 4 : (rnd() < 0.5 ? 0 : 4)));
          m.lanes = []; m.gaps = [...gaps]; m.hw = spec.hw;
          for (let k = 0; k < spec.slots; k++) {
            if (gaps.has(k)) continue;
            const off = perp0 + (k - (spec.slots - 1) / 2) * spec.slot, x0 = px * off + dx * (along - spec.len / 2), y0 = py * off + dy * (along - spec.len / 2);
            m.lanes.push({ x: x0, y: y0, len: spec.len }); m.ids.push(tele(1, x0, y0, ang, spec.len, spec.hw, spec.wind)); m.pts.push([x0, y0]);
          }
          m.ang = ang; e.face = ang; m.cairn = cairn;
          sim.ev(['chherd', Math.round(ang * 100) / 100, Math.round(cx), Math.round(cy)]);
        },
        resolve(e, spec, m) {
          for (const h of aliveHeroes()) for (const L of m.lanes) if (segDist(h.x, h.y, L.x, L.y, L.x + Math.cos(m.ang) * L.len, L.y + Math.sin(m.ang) * L.len) < spec.hw + h.r * 0.5) { hurt(h, spec.dmg, e); break; }
          if (m.cairn) { const k = C.stones.indexOf(m.cairn); if (k >= 0) C.stones.splice(k, 1); sim.ev(['chbreak', Math.round(m.cairn.x), Math.round(m.cairn.y)]); }
          if (e.link.id === 'drover' && e.hp < e.max * 0.5 && !e.ai.again) { e.ai.again = true; e.ai.force = 'stampede'; e.ai.rest = 0.3; } else e.ai.again = false;
        },
      },
      calf: {
        can(e) { return !sim.enemies.some(x => !x.dead && x.kind === 'stonecalf'); },
        begin(e, spec, m) {
          const h = healerOf(), a = rnd() * TAU, p = walk(e.x + Math.cos(a) * 100, e.y + Math.sin(a) * 100, 10);
          m.ids.push(tele(0, p[0], p[1], 40, 0, 0, spec.wind, 1)); m.pts.push([p[0], p[1]]); m.ang = Math.atan2(h.y - e.y, h.x - e.x); m.spawn = p;
        },
        resolve(e, spec, m) {
          const hp = minionHp('stonecalf', e), c = spawnMinion('stonecalf', m.spawn[0], m.spawn[1], CALF, hp); c.owner = e; sim.ev(['chcall', e.id, 1]);
        },
      },
      tether: {
        can(e) { const B = otherBody(e); return !!B && !B.dead && hyp(B.x - e.x, B.y - e.y) < 620; },
        begin(e, spec, m) {
          const B = otherBody(e), ang = Math.atan2(B.y - e.y, B.x - e.x), len = hyp(B.x - e.x, B.y - e.y);
          m.ids.push(tele(1, e.x, e.y, ang, len, spec.hw, spec.wind)); m.pts.push([e.x, e.y]); m.ang = ang; m.seg = [e.x, e.y, B.x, B.y]; C.hold = sim.time + spec.wind + 0.15; e.face = ang;
        },
        resolve(e, spec, m) { for (const h of aliveHeroes()) if (segDist(h.x, h.y, m.seg[0], m.seg[1], m.seg[2], m.seg[3]) < spec.hw + h.r * 0.5) hurt(h, spec.dmg, e); },
      },
    };
    function beginMove(e, name) {
      const spec = movesOf(e)[name]; if (!spec) return false;
      const ai = e.ai, tgt = ai.tgt, m = { name, spec, t: 0, ids: [], pts: [], ang: 0 };
      const ct = CT[spec.type]; if (ct && ct.can && !ct.can(e)) return false;
      let tg = spec.pick ? pickHero(e, spec.pick) || tgt : tgt; if (!tg) return false;
      m.ang = Math.atan2(tg.y - e.y, tg.x - e.x); e.face = m.ang;
      switch (spec.type) {
        case 'ring': m.ids.push(tele(0, e.x, e.y, spec.R, 0, 0, spec.wind)); m.pts.push([e.x, e.y]); break;
        case 'cone': m.ids.push(tele(2, e.x, e.y, m.ang, spec.reach, spec.half, spec.wind)); m.pts.push([e.x, e.y]); break;
        case 'line': { const len = lineLen(e, m.ang, spec.len); m.len = len; m.ids.push(tele(1, e.x, e.y, m.ang, len, spec.hw, spec.wind)); m.pts.push([e.x, e.y]); break; }
        case 'spot': {
          const pool = aliveHeroes().slice(), n = Math.min(spec.count + (spec.count > 1 ? 1 : 0), pool.length);
          if (spec.pick === 'far') pool.sort((a, b) => hyp(b.x - e.x, b.y - e.y) - hyp(a.x - e.x, a.y - e.y));
          for (let k = 0; k < n; k++) { const h = spec.pick === 'far' ? pool[k] : pool.splice(Math.floor(rnd() * pool.length), 1)[0]; m.pts.push([h.x, h.y]); m.ids.push(tele(0, h.x, h.y, spec.R, 0, 0, spec.wind)); }
          break;
        }
        case 'share': { const c = shareCenter(e, spec, tg); m.pts.push([c[0], c[1]]); m.ids.push(tele(0, c[0], c[1], spec.R, 0, 0, spec.wind, 1)); break; }
        case 'call': m.ids.push(tele(0, e.x, e.y, 60, 0, 0, spec.wind, 1)); m.pts.push([e.x, e.y]); break;
        default: if (!ct) return false; if (ct.begin(e, spec, m, tg) === false) return false;
      }
      ai.mv = m; ai.wind = true; sim.ev(['chm', e.id, name, spec.wind, spec.type]);
      return true;
    }
    function resolveMove(e) {
      const ai = e.ai, m = ai.mv, spec = m.spec, L = e.link; ai.mv = null; ai.wind = false; ai.rest = L.rest * (0.8 + rnd() * 0.5) * (ai.restMul || 1);
      const alive = aliveHeroes();
      switch (spec.type) {
        case 'ring': for (const h of alive) if (hyp(h.x - m.pts[0][0], h.y - m.pts[0][1]) < spec.R + h.r * 0.5) hurt(h, spec.dmg, e); break;
        case 'cone':
          for (const h of alive) if (sim.coneHit(h, m.pts[0][0], m.pts[0][1], m.ang, spec.reach, spec.half)) {
            hurt(h, spec.dmg, e);
            if (spec.pull) { const B = otherBody(e); if (B && !B.dead) { const a = Math.atan2(e.y - B.y, e.x - B.x), p = walk(B.x + Math.cos(a) * 74, B.y + Math.sin(a) * 74, 12); h.x = p[0]; h.y = p[1]; h.path = null; h.rootT = Math.max(h.rootT || 0, 0.8); sim.ev(['chpull', h.id, Math.round(p[0]), Math.round(p[1])]); } }
          }
          if (spec.thorns) { const t = spec.thorns; addZone(e, m.pts[0][0] + Math.cos(m.ang) * spec.reach * 0.78, m.pts[0][1] + Math.sin(m.ang) * spec.reach * 0.78, t.R, t.dmg, t.dur, 0.9, 1); }
          break;
        case 'line': {
          const x0 = m.pts[0][0], y0 = m.pts[0][1], x1 = x0 + Math.cos(m.ang) * m.len, y1 = y0 + Math.sin(m.ang) * m.len;
          for (const h of alive) if (segDist(h.x, h.y, x0, y0, x1, y1) < spec.hw + h.r * 0.5) hurt(h, spec.dmg, e);
          if (spec.dash) ai.dash = { x: x1, y: y1, t: 0, dur: spec.dash, x0: e.x, y0: e.y };
          if (spec.thorns) { const t = spec.thorns; for (let d = 70; d < m.len - 20; d += t.every) addZone(e, x0 + Math.cos(m.ang) * d, y0 + Math.sin(m.ang) * d, t.R, t.dmg, t.dur, 0.95, 1); }
          break;
        }
        case 'spot': for (const h of alive) for (const p of m.pts) if (hyp(h.x - p[0], h.y - p[1]) < spec.R + h.r * 0.5) { hurt(h, spec.dmg, e); if (spec.root) h.rootT = Math.max(h.rootT || 0, spec.root); break; } break;
        case 'share': {
          const inside = alive.filter(h => hyp(h.x - m.pts[0][0], h.y - m.pts[0][1]) < spec.R + h.r * 0.5), need = Math.max(1, Math.ceil(alive.length * (spec.need || 0.5) - 1e-6));
          const ok = inside.length >= need;
          if (ok) { if (spec.ok === 'cairn') { for (let q = C.stones.length - 1; q >= 0; q--) if (C.stones[q].cairn) C.stones.splice(q, 1); addStone(m.pts[0][0], m.pts[0][1], 40, true); sim.ev(['chcairn', Math.round(m.pts[0][0]), Math.round(m.pts[0][1])]); } }
          else {
            if (spec.fail === 'hounds') { for (let k = 0; k < 5 && sim.enemies.length < 120; k++) { const a = rnd() * TAU, p = walk(e.x + Math.cos(a) * (e.r + 30), e.y + Math.sin(a) * (e.r + 30), 8); spawnMinion('foghound', p[0], p[1], WHELP, minionHp('foghound', e)); } sim.ev(['chcall', e.id, 3]); }
            else if (spec.fail === 'heal') { const pk = packBodies(); for (const b of pk) { b.hp = Math.min(b.max, b.hp + b.max * 0.10); b.dirty = true; } for (const h of alive) hurt(h, spec.dmg, e); }
            else for (const h of alive) hurt(h, spec.dmg, e);
            if (spec.lamps) sim.ev(['chlamps', 4]);
          }
          sim.ev(['chsoak', Math.round(m.pts[0][0]), Math.round(m.pts[0][1]), ok ? 1 : 0]); break;
        }
        case 'call': {
          const n = spec.n + 4; let made = 0;
          for (let k = 0; k < n && sim.enemies.length < 120; k++) { const a = rnd() * TAU, p = walk(e.x + Math.cos(a) * (e.r + 24), e.y + Math.sin(a) * (e.r + 24), 8); spawnMinion('chainwhelp', p[0], p[1], WHELP, minionHp('chainwhelp', e)).chainMinion = true; made++; }
          sim.ev(['chcall', e.id, made]); break;
        }
        default: CT[spec.type].resolve(e, spec, m);
      }
      m.ids.forEach((id, k) => resolveTele(id, m.pts[k][0], m.pts[k][1]));
      if (L.fx && FX[L.fx].moved) FX[L.fx].moved(e, m);
    }
    function bossTick(e, dt) {
      const ai = e.ai, L = e.link;
      if (e.stun > 0) e.stun = 0;
      if (ai.intro > 0) { ai.intro -= dt; return; }
      if (ai.dash) {   // glide along the charge lane
        const d = ai.dash; d.t += dt; const k = Math.min(1, d.t / d.dur), nx = d.x0 + (d.x - d.x0) * k, ny = d.y0 + (d.y - d.y0) * k;
        e.x = nx; e.y = ny; if (k >= 1) ai.dash = null; return;
      }
      if (ai.mv) { ai.mv.t += dt; if (ai.mv.t >= ai.mv.spec.wind) resolveMove(e); return; }
      if (ai.dead) return;
      ai.tgtT -= dt;
      if (!ai.tgt || ai.tgt.dead || ai.tgtT <= 0) { ai.tgt = nearestHero(e.x, e.y, 2000); ai.tgtT = 2.5; }
      if (L.pond) orbit(e, dt);
      const t = ai.tgt; if (!t) return;
      const ang = Math.atan2(t.y - e.y, t.x - e.x); e.face += angDiff(e.face, ang) * Math.min(1, dt * 8);
      if (L.solo && (C.hold > sim.time || (C.bodies.concat(C.boss).some(o => o && o !== e && !o.dead && o.ai && o.ai.mv)))) { if (!(C.hold > sim.time)) ai.rest = Math.max(ai.rest, 0.3); return; }
      ai.rest -= dt; ai.idle = (ai.idle || 0) + dt;
      const dc = hyp(t.x - e.x, t.y - e.y), gap = dc - e.r - (t.r || 0);
      if (ai.rest <= 0) {
        if (ai.force) { const nm = ai.force; ai.force = null; if (beginMove(e, nm)) { ai.idle = 0; return; } }
        // the next move in its rhythm that can actually reach someone; if none can, it walks closer (the Pike cannot: it waits)
        const seq = seqOf(e), mv = movesOf(e);
        let pick = -1; for (let q = 0; q < seq.length; q++) { const nm = seq[(ai.k + q) % seq.length]; if (mv[nm] && inRange(mv[nm], dc)) { pick = q; break; } }
        if (pick >= 0) { const nm = seq[(ai.k + pick) % seq.length]; ai.k += pick + 1; if (beginMove(e, nm)) { ai.idle = 0; return; } }
      }
      if (!L.pond && gap > (L.reach || 40) * 0.6) {
        sim.stepToward(e, t.x, t.y, dt); homeClamp(e);
        if (e.stuck > 1.2) { const p = walk(e.x + (ai.hx - e.x) * 0.45, e.y + (ai.hy - e.y) * 0.45, 20); e.x = p[0]; e.y = p[1]; e.stuck = 0; }   // wedged against a rock: it steps back out
      }
    }
    function homeClamp(e) {   // a link keeps to its own ground: it does not follow the party down the ramp
      const a = e.ai, hx = a.hx, hy = a.hy, dx = e.x - hx, dy = e.y - hy, d = hyp(dx, dy); if (a.home && d > a.home) { e.x = hx + dx / d * a.home; e.y = hy + dy / d * a.home; }
    }
    const inRange = (spec, d) => spec.anyRange ? true : spec.type === 'ring' ? d <= spec.R + 24 : spec.type === 'cone' ? d <= spec.reach * 0.95 : spec.type === 'line' ? d <= spec.len * 0.9 : spec.type === 'call' ? true : d <= 560;
    function orbit(e, dt) {   // the Pike circles in its pool, turning toward the hero it hunts
      const ai = e.ai, cx = LINKS[e.chain].place[0], cy = LINKS[e.chain].place[1]; ai.orb += dt * 0.55;
      const tx = cx + Math.cos(ai.orb) * 30, ty = cy + Math.sin(ai.orb) * 18; e.x += (tx - e.x) * Math.min(1, dt * 1.6); e.y += (ty - e.y) * Math.min(1, dt * 1.6);
    }
    // small ones: run at the nearest hero and bite (the Ash Mother's whelps, the Stag's fog-hounds)
    const WHELP = { update(e, dt) {
      if (e.stun > 0 || e.stag > 0) { e.atk = null; return; }
      if (e.atk) { e.atk.t += dt; if (e.atk.t >= e.atk.dur) { const a = e.atk; e.atk = null; e.acd = e.def.atk.cd; for (const h of aliveHeroes()) if (hyp(h.x - a.cx, h.y - a.cy) < a.R + h.r) hurt(h, e.def.atk.dmg * 1.0, e); } return; }
      const h = nearestHero(e.x, e.y, 900); if (!h) return;
      const gap = hyp(h.x - e.x, h.y - e.y) - e.r - h.r;
      if (gap > e.def.atk.reach) { if (e.rootT <= 0) sim.stepToward(e, h.x, h.y, dt); } else if (e.acd <= 0) sim.startAtk(e, h);
    } };
    // the Drover's lost calf: it runs to the healer and bursts there, unless it is killed first
    const CALF = { update(e, dt) {
      if (e.blast) { e.blast.t += dt; if (e.blast.t >= 0.9) { const b = e.blast; for (const h of aliveHeroes()) if (hyp(h.x - b.x, h.y - b.y) < 82 + h.r * 0.5) hurt(h, 46, e); resolveTele(b.id, b.x, b.y); e.dead = true; } return; }
      const h = healerOf(); if (!h) return;
      if (hyp(h.x - e.x, h.y - e.y) < 46) { e.blast = { t: 0, x: e.x, y: e.y, id: tele(0, e.x, e.y, 82, 0, 0, 0.9) }; return; }
      if (e.rootT <= 0) sim.stepToward(e, h.x, h.y, dt);
    } };

    // ------------------------------------------------------------ link set pieces: spawn / per-tick step / after a move
    const packBodies = () => (C.pack ? [C.pack.lead].concat(C.pack.hs).filter(b => b && !b.dead) : []);
    const FX = {
      lantern: {
        spawn(L, mul) {
          const sp = walk(L.spawn[0], L.spawn[1]), e = mkBody(L, sp[0], sp[1], Math.round(L.hp * mul)); stonesRise(e, 4); if (C.stones.length < 4) stonesRise(e, 4 - C.stones.length);
          if (C.bonus[4] && C.stones[0]) C.stones[0].hits = 1; e.ai.gate = 0; return e;
        },
        step(e) {   // the lantern relights its dais twice as the fight goes on: the cover is a resource that runs out
          const f = e.hp / e.max; if (e.ai.gate === 0 && f < 0.7) { e.ai.gate = 1; stonesRise(e, 3); } else if (e.ai.gate === 1 && f < 0.4) { e.ai.gate = 2; stonesRise(e, 3); }
        },
      },
      stag: { spawn(L, mul) { const sp = walk(L.spawn[0], L.spawn[1]); return mkBody(L, sp[0], sp[1], Math.round(L.hp * mul)); } },
      drover: { spawn(L, mul) { const sp = walk(L.spawn[0], L.spawn[1]); return mkBody(L, sp[0], sp[1], Math.round(L.hp * mul)); } },
      twins: {
        spawn(L, mul) {
          const hp = Math.round(L.hp * mul), a = walk(L.ends[0][0], L.ends[0][1], 16), b = walk(L.ends[1][0], L.ends[1][1], 16);
          const A = mkBody(L, a[0], a[1], hp, { face: 0 }), B = mkBody(L, b[0], b[1], hp, { face: PI });
          A.ai.hx = a[0]; A.ai.hy = a[1]; B.ai.hx = b[0]; B.ai.hy = b[1]; A.ai.home = B.ai.home = 150; B.twin = true; B.chainX = true; B.chain = undefined;
          C.tw = { A, B, pool: hp, enraged: false }; C.bodies = [B]; return A;
        },
        step(e) {
          const tw = C.tw; if (!tw || tw.A.dead) return;
          const A = tw.A, B = tw.B, bAlive = !B.dead;
          let pool = bAlive ? A.hp + B.hp - tw.pool : A.hp; pool = Math.min(pool, A.max);
          if (pool <= 0) { A.hp = B.hp = 1; tw.pool = 1; sim.dmgE(A, 5, A.last || B.last); return; }
          tw.pool = pool; A.hp = pool; if (bAlive) B.hp = pool;
          if (!tw.enraged && pool < A.max * 0.25) {   // the gap closes: one twin shatters, the other burns with it
            tw.enraged = true; if (bAlive) { B.dead = true; sim.ev(['chfell', B.id, Math.round(B.x), Math.round(B.y)]); }
            A.ai.dmgMul = 1.25; A.ai.restMul = 0.7; log('twins: one falls, the other burns');
          }
        },
      },
      hounds: {
        spawn(L, mul) {
          const sp = walk(L.spawn[0], L.spawn[1]), lead = mkBody(L, sp[0], sp[1], Math.round(L.hp * mul)); lead.invuln = true; lead.ai.seq = ['maul']; lead.ai.moves = Object.assign({}, L.moves);
          const hs = [];
          HOUNDS.forEach((H, k) => {
            const p = walk(sp[0] + H.dist[0], sp[1] + H.dist[1], 16), hp = Math.round(H.hp * mul * (C.bonus[8] && k === 0 ? 0.4 : 1));
            const sub = Object.assign({}, H, { place: [p[0], p[1]] }); const h = mkBody(sub, p[0], p[1], hp, { kind: H.kind, link: sub, ai: { hx: sp[0], hy: sp[1], home: H.home } });
            h.chainX = true; h.hound = k; hs.push(h);
          });
          C.pack = { lead, hs, left: 3 }; C.bodies = hs.slice(); return lead;
        },
        step(e) {
          const P = C.pack; if (!P) return;
          if (P.left <= 0 && e.invuln) { e.invuln = false; e.ai.dmgMul = 1.1; }
        },
      },
      shadow: {
        spawn(L, mul) { const sp = walk(L.spawn[0], L.spawn[1]), e = mkBody(L, sp[0], sp[1], Math.round(L.hp * mul)); e.ai.moves = {}; e.ai.seq = []; return e; },
        after(e) { shapeTo(e, 0); },
        step(e) {
          const f = e.hp / e.max, idx = f <= 0.25 ? 9 : Math.min(8, Math.floor((1 - f) / (0.75 / 9)));
          if (idx > C.shape) shapeTo(e, idx);
          if (C.shape === 9) { const k = Math.round(Math.min(1, 0.25 + (0.25 - f) / 0.25 * 0.75) * 10) / 10; if (k !== C.dim) { C.dim = k; sim.ev(['chdim', k]); } }
        },
      },
    };
    function shapeTo(e, idx) {   // it puts on the next shape: new moves, and an Ash-fall to get through first
      const first = C.shape < 0; C.shape = idx; const ai = e.ai;
      if (idx < 9) { ai.moves = SHAPE_MOVES[idx](LINKS); ai.seq = SHAPE_SEQ[idx].slice(); } else { ai.moves = Object.assign({}, COLOSSUS); ai.seq = COLOSSUS_SEQ.slice(); e.r = 62; ai.dmgMul = 1.0; }
      ai.moves.ashfall = ASHFALL; ai.k = 0;
      if (!first) { ai.force = 'ashfall'; ai.rest = Math.min(ai.rest, 0.4); }
      if (idx === 4 && !C.stones.length) stonesRise(e, 3);
      sim.ev(['chshape', e.id, idx]); log('shadow wears ' + (idx < 9 ? SHAPE_NAMES[idx] : 'nothing'));
      if (idx === 3) e.ai.hasCall = true;
    }

    // ------------------------------------------------------------ the optional acts that weaken a link before it arrives
    const bonusOn = i => C.st[i] !== 'fight' && C.st[i] !== 'done' && !C.bonus[i] && !C.over;
    function setBonus(i) { C.bonus[i] = true; sim.ev(['chbonus', i]); log('bonus ' + LINKS[i].id); }
    function startActs() {   // landmark spots for the acts of links 5-9 (kept off the ground the fights use, on the ground that is walkable)
      const w = (x, y) => { const p = walk(x, y, 20); return [p[0], p[1]]; };
      C.acts.lantern = w(3700 - 150, 2380 + 120);                                             // link 5: the dark lantern
      C.acts.stagFire = w(5760, 2740);                                                         // link 6: a brand lit in its clearing
      C.acts.posts = [w(2560 - 200, 2480 - 150), w(2560 + 10, 2480 - 230), w(2560 + 230, 2480 - 120)].map(p => ({ x: p[0], y: p[1], on: false })); // link 7: the fence line
      C.acts.pile = w(2220 + 120, 4180 - 40);                                                  // link 8: the loose rockfall at the road's east end
      C.acts.kennel = [w(4020 - 190, 4580 - 50), w(4020 + 10, 4580 - 140), w(4020 + 150, 4580 + 20)].map(p => ({ x: p[0], y: p[1], on: false })); // link 9: kennel posts
    }
    function touchPosts(i, posts) {
      let n = posts.filter(p => p.on).length; if (n >= posts.length) return;
      for (const p of posts) if (!p.on) for (const h of aliveHeroes()) if (hyp(h.x - p.x, h.y - p.y) < 55) { p.on = true; n++; sim.ev(['chpost', i, n, posts.length, Math.round(p.x), Math.round(p.y)]); if (n >= posts.length) setBonus(i); break; }
    }

    // ------------------------------------------------------------ item effects (per hero, through the hooks)
    const wears = (h, id) => h.items.some(x => x && x.id === id);
    const wrap = (name, fn) => { const orig = sim[name].bind(sim); sim[name] = (...a) => fn(orig, ...a); };
    const me = h => h._ch || (h._ch = { crown: 0 });
    wrap('release', (orig, h, s, a, pw) => {
      orig(h, s, a, pw);
      if (h.dead || pw !== 1) return;
      if (s === 'r' && wears(h, 'chain7')) { for (const u of sim.heroes) if (!u.dead && hyp(u.x - h.x, u.y - h.y) < 450) { u.hasteT = Math.max(u.hasteT, 6); u.rootT = 0; u.slowT = 0; u.dirty = true; } }
      if (!wears(h, 'choath')) return;
      if (h.hero === 'pyromancer' && s === 'r') sim.after(1.1, () => { if (!h.dead && sim.st === 'live') orig(h, 'r', a, 0.6); });
      if (h.hero === 'ranger' && s === 'q') sim.after(0.3, () => { if (!h.dead && sim.st === 'live') orig(h, 'q', a, 0.5); });
      if (h.hero === 'cleric' && s === 'q' && a.u) for (const u of sim.heroes) if (!u.dead && u !== a.u && hyp(u.x - a.u.x, u.y - a.u.y) < 220) sim.heal(u, D.rk(h.K.skills.q.heal, h.ranks[0]) * 0.35, h);
    });
    wrap('perfectBlock', (orig, h, src) => {
      orig(h, src);
      if (wears(h, 'choath')) for (const u of sim.heroes) if (!u.dead && hyp(u.x - h.x, u.y - h.y) < 340) { u.shield = Math.max(u.shield, 60); u.shieldT = Math.max(u.shieldT, 5); u.dirty = true; }
    });

    return {
      start() {
        const p = sim.nearestWalkable(3470, 516, 14); C.bell = [p[0], p[1]]; C.oak = [5910, 644]; startActs();
      },
      wave(n) {
        if (n >= D.LAST_WAVE && !C.over) {   // the siege begins: the chain stops
          C.over = true; if (C.boss && !C.boss.dead) despawn(C.boss); C.cur = -1; sim.ev(['chend']);
        }
      },
      tick(dt) {
        // item effects that run on their own
        for (const h of sim.heroes) {
          if (h.dead) continue;
          if (wears(h, 'chain9')) { const s = me(h); if (h.stillT >= 1.5 && sim.time >= s.crown) { s.crown = sim.time + 10; h.shield = Math.max(h.shield, Math.round(h.max * 0.12)); h.shieldT = Math.max(h.shieldT, 6); h.dirty = true; sim.ev(['chcrown', h.id]); } }
        }
        if (C.over) return;
        const t = sim.time;
        tickZones(); pushFromStones();
        for (let k = C.live.length - 1; k >= 0; k--) if (t - C.live[k].t0 > C.live[k].warn + 4 && !C.zones.some(z => z.tele === C.live[k].id)) C.live.splice(k, 1);   // (a warning nobody resolved does not linger)
        // optional acts, any time before the link arrives
        if (bonusOn(1) && sim.wave >= 2) { for (const h of aliveHeroes()) if (h.brand > 0 && hyp(h.x - LINKS[1].place[0], h.y - LINKS[1].place[1]) < 140) { C.bonusT += dt; break; } if (C.bonusT >= 9) setBonus(1); }
        if (bonusOn(3) && C.whelpKills >= 18) setBonus(3);
        if (bonusOn(5) && sim.wave >= 2) { let near = false; for (const h of aliveHeroes()) if (h.brand > 0 && hyp(h.x - C.acts.stagFire[0], h.y - C.acts.stagFire[1]) < 150) { near = true; break; } if (near) C.bt[5] += dt; if (C.bt[5] >= 6) setBonus(5); }
        if (bonusOn(6)) touchPosts(6, C.acts.posts);
        if (bonusOn(8)) touchPosts(8, C.acts.kennel);
        if (C.cur >= 0) {
          const i = C.cur, L = LINKS[i];
          if (C.st[i] === 'gap' && t >= C.at) announce(i);
          if (i === 0 && C.st[i] === 'placed' && !C.boss && t >= C.at) spawnBoss(0);
          if (C.st[i] === 'gap' || C.st[i] === 'placed') {
            if (i >= 1 && C.st[i] === 'placed' && !C.boss) {
              const near = nearestHero(L.place[0], L.place[1], L.wake || 340);
              if (near) spawnBoss(i);
            }
          } else if (C.st[i] === 'fight' && C.boss) {
            const e = C.boss;
            if (e.dead) { C.boss = null; }
            else {
              if (L.fx && FX[L.fx].step) FX[L.fx].step(e);
              C.fightT += dt;
              const rageAt = i === 9 ? TUNE.rageAtLast : TUNE.rageAt;
              if (C.fightT >= rageAt + C.rage * TUNE.rageStep) {   // the soft enrage: named, shown, rising
                C.rage++; C.rageMul = 1 + TUNE.rageDmg * C.rage; for (const b of [e].concat(C.bodies)) if (b && b.ai) b.ai.restMul *= TUNE.rageRest;
                sim.ev(['chrage', i, C.rage, RAGE_NAMES[i]]); log('rage ' + C.rage);
              }
              if (!nearestHero(e.x, e.y, TUNE.leashR)) { C.away += dt; if (C.away >= TUNE.leashAway) despawn(e); } else C.away = 0;
            }
          }
        }
      },
      intent(h, m) {
        if (m.k !== 'carry' || C.over || h.dead) return false;
        // the cracked bell on the Ledge
        if (!C.rung && C.bell && sim.wave >= TUNE.bellFrom && hyp(h.x - C.bell[0], h.y - C.bell[1]) < 85) {
          C.rung = true; C.cur = 0; C.st[0] = 'placed'; C.at = sim.time + TUNE.wakeDelay; sim.ev(['chbell', C.bell[0], C.bell[1]]); log('bell');
          return true;
        }
        // the carved oak: cut it (before the Stumpwarden arrives) and it comes thinner
        if (C.oak && bonusOn(2) && hyp(h.x - C.oak[0], h.y - C.oak[1]) < 95) {
          if (!(h.cutT > sim.time)) { h.cutT = sim.time + 0.8; C.cuts++; sim.ev(['chcut', C.oak[0], C.oak[1], C.cuts, 6]); if (C.cuts >= 6) setBonus(2); }
          return true;
        }
        // burn the nest: a lit brand at the Ash Mother's cave
        if (bonusOn(3) && h.brand > 0 && hyp(h.x - LINKS[3].place[0], h.y - LINKS[3].place[1]) < 130) { setBonus(3); return true; }
        // the dark lantern: a lit brand held to it
        if (bonusOn(4) && h.brand > 0 && C.acts.lantern && hyp(h.x - C.acts.lantern[0], h.y - C.acts.lantern[1]) < 90) { setBonus(4); return true; }
        // the loose rockfall at the road's end: topple it (twice)
        if (bonusOn(7) && C.acts.pile && hyp(h.x - C.acts.pile[0], h.y - C.acts.pile[1]) < 95) {
          if (!(h.cutT > sim.time)) { h.cutT = sim.time + 0.8; C.pile++; sim.ev(['chcut', C.acts.pile[0], C.acts.pile[1], C.pile, 2]); if (C.pile >= 2) setBonus(7); }
          return true;
        }
        return false;
      },
      kill(e) {
        if (e.ai && e.ai.mv && e.ai.mv.ids && e !== C.boss) { e.ai.mv.ids.forEach((id, k) => resolveTele(id, e.ai.mv.pts[k] ? e.ai.mv.pts[k][0] : e.x, e.ai.mv.pts[k] ? e.ai.mv.pts[k][1] : e.y)); e.ai.mv = null; }   // a body that falls mid-wind takes its warning with it
        if (e.kind === 'whelp' || e.kind === 'chainwhelp') { if (e.kind === 'whelp') C.whelpKills++; return; }
        if (e.chainMinion) return;
        if (e.hound !== undefined) {   // a hound of the pack falls: the leader takes one of its moves
          const P = C.pack; if (!P) return; const H = HOUNDS[e.hound], L = P.lead; P.left--;
          if (!L.dead) { L.ai.moves[H.gives.name] = H.gives.spec; L.ai.seq.push(H.gives.name, 'maul'); sim.ev(['chhound', e.hound]); }
          return;
        }
        if (e.twin && C.tw) { const A = C.tw.A; if (!A.dead) { A.hp = 1; C.tw.pool = 1; sim.dmgE(A, 5, e.last); } return; }
        if (e.chain === undefined || !e.link) return;
        const i = e.chain; C.st[i] = 'done'; C.done = i + 1; C.boss = null; C.paid += LINKS[i].pay;
        clearField();
        const who = award(i, e); sim.ev(['chdown', i, LINKS[i].pay]); log('down ' + LINKS[i].id);
        startGap(i + 1);
        void who;
      },
      hit(a, e, h) {   // the Eye: what a wearer strikes is lit for four seconds, and every ally hits it harder
        if (h && h.tk === 'hero' && wears(h, 'chain5')) e.chEye = sim.time + 4;
        let m = 1; if (e.chEye > sim.time) m *= 1.10;
        // the Gorge-Glass: a tenth of the damage mends the most hurt ally
        if (h && h.tk === 'hero' && wears(h, 'chain8')) { let low = null, lf = 1.01; for (const u of sim.heroes) if (!u.dead && u.hp / u.max < lf) { lf = u.hp / u.max; low = u; } if (low && lf < 1) sim.heal(low, a * m * 0.10, { healMul: 1 }, true); }
        return m !== 1 ? a * m : undefined;
      },
      hurt(a, h) {   // the Hollow Heart: a quarter of a blow comes back four seconds later
        if (wears(h, 'chain6') && a >= 4) { const back = a * 0.25; sim.after(4, () => { if (!h.dead && sim.st === 'live') sim.heal(h, back, { healMul: 1 }, true); }); }
      },
      props(p) {
        const i = C.cur, L = i >= 0 ? LINKS[i] : null;
        p.chb = C.bell ? [C.bell[0], C.bell[1], C.rung ? 1 : 0, sim.wave >= TUNE.bellFrom && !C.over ? 1 : 0] : 0;
        p.chn = [i, i >= 0 && C.st[i] === 'placed' ? C.hint[0] : 0, i >= 0 && C.st[i] === 'placed' ? C.hint[1] : 0, i >= 0 ? ['dormant', 'gap', 'placed', 'fight', 'done'].indexOf(C.st[i]) : 0, C.done, C.over ? 1 : 0];
        p.chs = C.stones.map(s => [Math.round(s.x), Math.round(s.y), s.hits, s.cairn ? 1 : 0]);
        p.chx = C.pack ? [C.pack.hs.map(b => (b.dead ? 0 : 1)), C.pack.left] : C.shape >= 0 ? [C.shape, C.dim] : 0;
        const A = C.acts, lm = [];
        if (A.lantern && !C.bonus[4] && C.st[4] !== 'done') lm.push([4, 0, Math.round(A.lantern[0]), Math.round(A.lantern[1]), 0]);
        if (A.posts && C.st[6] !== 'done') for (const q of A.posts) lm.push([6, 1, Math.round(q.x), Math.round(q.y), q.on ? 1 : 0]);
        if (A.pile && C.st[7] !== 'done') lm.push([7, 2, Math.round(A.pile[0]), Math.round(A.pile[1]), C.bonus[7] ? 1 : 0]);
        if (A.kennel && C.st[8] !== 'done') for (const q of A.kennel) lm.push([8, 3, Math.round(q.x), Math.round(q.y), q.on ? 1 : 0]);
        p.chl = lm;
      },
      payout(parts) { return Object.assign({}, parts, { chain: (parts.chain || 0) + C.paid }); },
    };
  });
  FS.CHAIN = { LINKS, TUNE, BUILT, ITEMS, HOUNDS, SHAPE_NAMES, RAGE_NAMES };
})();
