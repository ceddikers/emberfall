// Boss VIII: The Hydra of the Drowned Temple, Mother of Nine Heads — "The Drowned Temple". Many threats, one body.
// Last boss of set 2 until the Void Gate exists (docs/plans/2026-10-set-2-bosses.md), so it is the hardest of the four. The
// HEADS are the mechanic. The Mother sits in the stagnant pool at the heart of a flooded temple and does not move; her heads
// rise from the water round her on long necks. Every head is a killable add (inert: it never walks or bites) with its own
// element, and each one aims its attack at a random hero, going round in turn (clockwise from the north), one head about
// every 3 to 6 s.
//   Cutting a GREAT head makes its stump bleed; a blue ring opens at the temple column behind it for ~10 s. Stand in it
//   and the stump is seared (the head is gone for good). Leave it, and two LESSER heads of the same element sprout there.
//   Lesser heads are weaker but fire in the same turn as everyone else. Hard: a missed searing is a Regrowth, three of them.
//   The first great head cut in the whole fight grows back as an ELDER (bigger, hits harder) at the start of the last act.
//   The ORDER heads are cut in is remembered: the Mother's Heart replays every cut head's attack from its stump in that order.
//   The eight elements: Acid Spray (a cone, leaves acid), Tidal Line (a long line), Venom Bloom (a stack), Flame Gout (spread
//   fire on two heroes), Rime Crown (a ring round the head: stand close in or far out), Stormcall (three lines fanned),
//   Stonegaze (everything the head can see: hide behind a column), Mire Spit (slowing bog under three heroes).
//   The STUMP REMEMBERS: from the second cut on, the stump of the head cut before answers once ("Stump Echo", a gentler copy of
//   that head's move from the stump), in place of the next head's turn: the Heart, in small.
//   The body keeps a three-beat rhythm: Rending Maul, Tail Thrash (a ring at her feet), Mother's Cry. No head lands within a beat
//   and a half of a Cry or a Maul, and the big Hard moves (Gaze, Tidal Dance) hold the heads' round while they run.
//   Act I, Three Heads (100% → 75%): Acid, Tide and Venom rise. Mother's Cry, Rending Maul, Tail Thrash.
//   Act II, Six Heads (75% → 45%): Flame, Frost and Storm rise at the three gaps between them.
//   The Submerge (the seam): she dives for 15 s and the temple floods (everyone wades, slowed). Five lesser heads break
//   the surface at random columns, one after another; cut them down as they come. Then she surfaces and Act III begins.
//   Act III, Nine Heads (45% → 10%): Gaze and Mire rise, and the Elder.
//   The Mother's Heart (10%): a WALL. She cannot be hurt while every head she has had strikes again, the cut ones first, in
//   the order they were cut, from their stumps; then those still alive all at once; then the Heart beats.
//   Last Heads (10% → dead): the last ten percent, until she falls or the Drowning comes.
// Acts use PUSH: a party that reaches a gate early cuts the rest of the act and moves on (fight.js course).
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, the heads come round
// faster and each pull draws which head stands where, and:
//   Regrowth: a missed searing grows three lesser heads, not two.
//   Tidal Dance: two heads' lines cross three times, each a step along; the wedges between the lines are the safe ground.
//   Hydra's Gaze: the whole inside of the temple at once; only the ground by the wall is safe.

const HYDRA = {
  id: 'hydra', name: 'The Hydra', title: 'Mother of Nine Heads',
  hp: { normal: 4950000, hard: 5600000 },
  autoDmg: { normal: 1500, hard: 1650 },
  enrage: { normal: 612, hard: 622 },   // the cast starts here and lands 8 s later (10:20 / 10:30)
  enrageName: 'The Drowning',
  vuln: 0.5,
  spawn: { x: 0, y: 0 }, anchor: true,
  arena: { theme: 'temple' },
  gates: [0.75, 0.45, { f: 0.1, wall: 1 }],   // where the acts change (ticks on the boss bar; fight.js course)
  push: true,                                  // reach a gate early and she moves on (fight.js course: push)

  // nine temple columns in a ring, one behind each head's place: cover from a Stonegaze, and the foot of each is where
  // a stump is seared
  room(f) {
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + k * Math.PI * 2 / 9;
      f.addProp({ kind: 'column', x: Math.round(Math.cos(a) * 400), y: Math.round(Math.sin(a) * 400), r: 30, hp: 0, solid: true, cover: true, rubble: false, state: 0 });
    }
  },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      cry: H ? 10200 : 10800, thrash: H ? 9800 : 8400, maul: H ? 22000 : 18000, gazeAll: H ? 21000 : 0, dance: H ? 12700 : 0, heart: H ? 16100 : 16600,
      acid: H ? 16600 : 16200, pool: H ? 2100 : 2200, tide: H ? 18700 : 18700, bloom: H ? 30700 : 28300, bloomPool: H ? 1700 : 1700,
      flame: H ? 13200 : 13200, ember: H ? 2000 : 2000, frost: H ? 15600 : 15600, storm: H ? 13500 : 13500, gaze: H ? 21500 : 21200,
      mire: H ? 7300 : 7400, mirePool: H ? 1700 : 1700, sear: 1400, rise: H ? 7000 : 7500,
      headHp: 34000, elderHp: 52000, lesserHp: 14000, surfHp: 16000,
    };
    // (Normal is tuned for a party in set-1 gear after set 2's step (items.js SET2_STEP): every hit, not the heads' HP, a notch up)
    const HIT = H ? 1.22 : 1.26;
    for (const k in dmg) if (!/Hp$/.test(k)) dmg[k] = Math.round(dmg[k] * HIT);
    const S = (...steps) => steps.filter(Boolean);
    const HEAD_R = 210;                 // the heads stand this far from the middle, one to a slot (nine slots, the first due north)
    const COL_R = 400, SEAR_R = 470;    // the columns, and the ring at the foot of each where a stump is seared
    const slotAng = k => -Math.PI / 2 + k * TAU / 9;
    const slotPos = (k, r = HEAD_R, da = 0) => ({ x: Math.round(Math.cos(slotAng(k) + da) * r), y: Math.round(Math.sin(slotAng(k) + da) * r) });
    const columns = () => f.props.filter(p => p.kind === 'column');
    const CYC = H ? 16 : 17.5;        // seconds for every head to have had its turn (a longer round the more heads there are; see relay)
    const GAP_MIN = H ? 3.7 : 3.4;      // the least time between one head's attack and the next

    // --- the heads ------------------------------------------------------------------------------------------
    // element: number (the head's mark), name of its attack, colour (journal and art), what it does (run: below)
    const EL = {
      acid:  { n: 1, name: 'Acid Spray', base: 3.8, run: h => acid(h) },
      tide:  { n: 2, name: 'Tidal Line', base: 3.8, run: h => tide(h) },
      venom: { n: 3, name: 'Venom Bloom', base: 4.4, run: h => bloom(h) },
      flame: { n: 4, name: 'Flame Gout', base: 4.2, run: h => gout(h) },
      frost: { n: 5, name: 'Rime Crown', base: 4.2, run: h => rime(h) },
      storm: { n: 6, name: 'Stormcall', base: 4.0, run: h => stormcall(h) },
      gaze:  { n: 7, name: 'Stonegaze', base: 4.4, run: h => stonegaze(h) },
      mire:  { n: 8, name: 'Mire Spit', base: 4.0, run: h => mire(h) },
    };
    const heads = new Map();            // add id -> head
    const order = [];                   // the great heads cut so far, in the order they fell: { el, slot }
    const stumps = new Map();           // slot -> { el, seared }
    let paused = false;                 // the Submerge and the Heart: the heads hold their turns
    let holdUntil = 0;                  // Gaze and Tidal Dance: the heads' round starts no new cast before this
    const headLands = [];               // when the casts now in flight land
    const avoid = [];                   // [from, to]: a Cry or a Maul lands inside: no head lands here
    const echoQ = [];                   // stumps waiting to answer (the stump remembers)
    const AVOID = 1.5;
    let lastTarget = null;
    f.heads = heads; f.cutOrder = order;   // (tools and the host's view)

    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? pool : []; };
    // a random hero for a head to aim at (never the same one twice running if there is anyone else); `any`: the tank too
    const pick1 = (any) => {
      const pool = any ? f.alive() : nonTank();
      if (!pool.length) return null;
      const rest = pool.filter(p => p.id !== lastTarget);
      const t = f.pick(rest.length ? rest : pool);
      lastTarget = t.id;
      return t;
    };
    const pickN = (n) => {
      const pool = f.shuffle(nonTank());
      return pool.slice(0, Math.max(1, Math.min(n, pool.length)));
    };
    // a head's cast: the cast bar, a lunge, and a glow gathering at the head for the length of it
    const wind = (h, name, d) => {
      for (let i = headLands.length - 1; i >= 0; i--) if (headLands[i] < f.t - 0.5) headLands.splice(i, 1);
      headLands.push(f.t + d);
      f.cast(name, d, 'head');
      if (h.add) f.emit({ t: 'addev', k: 'bite', id: h.add.id, tg: null });
      f.emit({ t: 'propfx', k: 'hcast', x: Math.round(h.x), y: Math.round(h.y), el: h.el, dur: +d.toFixed(2), s: h.lesser ? 0 : 1 });
    };
    const cd = (h, base) => f.ct(base) * (h.fast ? 0.85 : 1) * (h.lesser ? 0.9 : 1);

    // Acid Spray: a cone at a random hero; the floor in its middle stays acid for a few seconds
    const acid = h => {
      const t = pick1(); if (!t) return;
      const d = cd(h, 3.8);
      wind(h, 'Acid Spray', d);
      const m = f.mech({ type: 'aoe', shape: { kind: 'cone', x: h.x, y: h.y, r: 780 * h.sz, arc: 0.78, angle: Math.atan2(t.y - h.y, t.x - h.x) }, delay: d, dmg: dmg.acid * h.pw, tag: 'acid', ddown: true,
        onResolve: () => {
          const s = m.shape, c = Math.cos(s.angle), sn = Math.sin(s.angle);
          const z = f.zone({ shape: { kind: 'cone', x: s.x + c * 190, y: s.y + sn * 190, r: Math.max(120, s.r - 330), arc: s.arc, angle: s.angle }, dur: 8, delay: 0, effect: 'burn', dmg: dmg.pool * h.pw, tag: 'acid', ddown: true });
          for (const o of f.alive()) z.last[o.id] = f.t;   // (a second to step off it before it first stings)
        } });
    };
    // Tidal Line: a long line through a random hero
    const tide = h => {
      const t = pick1(true); if (!t) return;
      const d = cd(h, 3.8);
      wind(h, 'Tidal Line', d);
      f.mech({ type: 'aoe', shape: { kind: 'rect', x: h.x, y: h.y, angle: Math.atan2(t.y - h.y, t.x - h.x), len: 1100, w: 120 * (h.lesser ? 0.8 : 1) }, delay: d, dmg: dmg.tide * h.pw, tag: 'tide' });
    };
    // Venom Bloom: a stack on a random hero; the ground where it burst is a slowing bog for a while
    const bloom = h => {
      const t = pick1(); if (!t) return;
      const d = cd(h, 4.4), n = f.alive().length;
      wind(h, 'Venom Bloom', d);
      f.mech({ type: 'stack', shape: { kind: 'circle', x: t.x, y: t.y, r: 120 * h.sz }, delay: d, dmg: dmg.bloom * Math.min(n, 4) / 4 * h.pw, follow: t.id, need: Math.max(1, (H ? n : n - 1) - [...f.mechs.values()].filter(m => m.tag === 'sear').length), tag: 'bloom', ddown: true,
        onResolve: () => { const q = f.alive().find(z => z.id === t.id); const at = q || t; const pd = f.puddle(at.x, at.y, 85, 9, dmg.bloomPool * h.pw, 1, 'bloom', { slow: true, ddown: true }); for (const o of f.alive()) pd.last[o.id] = f.t; } });
    };
    // Flame Gout: fire under two heroes (one, from a lesser head); each leaves embers
    const gout = h => {
      const ps = pickN(h.lesser ? 1 : 2); if (!ps.length) return;
      const d = cd(h, 4.2);
      wind(h, 'Flame Gout', d);
      for (const p of ps) {
        f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 105 * h.sz }, delay: d, dmg: dmg.flame * h.pw, follow: p.id, tag: 'gout',
          onResolve: () => { const q = f.alive().find(z => z.id === p.id) || p; const pd = f.puddle(q.x, q.y, 70, 8, dmg.ember, 1, 'ember'); for (const o of f.alive()) pd.last[o.id] = f.t; } });
      }
    };
    // Rime Crown: a ring of ice round the head. Close in by its throat is safe, and so is the far side of the ring.
    const rime = h => {
      const d = cd(h, 4.2);
      wind(h, 'Rime Crown', d);
      f.mech({ type: 'aoe', shape: { kind: 'donut', x: h.x, y: h.y, r: 345 * h.sz, r2: 130 * h.sz }, delay: d, dmg: dmg.frost * h.pw, tag: 'rime', ddown: true });
    };
    // Stormcall: three lines fanned from the head, the middle one through a random hero (a lesser head: two, either side)
    const stormcall = h => {
      const t = pick1(true); if (!t) return;
      const d = cd(h, 4.0), a = Math.atan2(t.y - h.y, t.x - h.x), group = new Set();
      wind(h, 'Stormcall', d);
      const fan = h.lesser ? [-0.42, 0.42] : [-0.64, 0, 0.64];
      for (const da of fan) f.mech({ type: 'aoe', shape: { kind: 'rect', x: h.x, y: h.y, angle: a + da, len: 1100, w: 100 }, delay: d, dmg: dmg.storm * h.pw, tag: 'storm', group });
    };
    // Stonegaze: everything the head can see; whoever has a column between them and it is spared
    const stonegaze = h => {
      const d = cd(h, 4.4);
      wind(h, 'Stonegaze', d);
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: h.x, y: h.y, r: 2400 }, delay: d, dmg: dmg.gaze * h.pw, tag: 'gaze', cover: true, src: { x: h.x, y: h.y } });
    };
    // Mire Spit: bog under three heroes (a lesser head: two); each leaves a slowing pool
    const mire = h => {
      const ps = pickN(h.lesser ? 2 : 3); if (!ps.length) return;
      const d = cd(h, 4.0);
      wind(h, 'Mire Spit', d);
      for (const p of ps) {
        f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 95 * h.sz }, delay: d, dmg: dmg.mire * h.pw, follow: p.id, tag: 'mirespit',
          onResolve: () => { const q = f.alive().find(z => z.id === p.id) || p; const pd = f.puddle(q.x, q.y, 90, 11, dmg.mirePool * h.pw, 1, 'mire', { slow: true }); for (const o of f.alive()) pd.last[o.id] = f.t; } });
      }
    };

    // a head being born: a great one stands in its slot; a lesser one at the side of it (side -1 / 1, or 0 for the third, further out)
    const mkHead = (el, slot, o = {}) => {
      const lesser = !!o.lesser, elder = !!o.elder, side = o.side || 0;
      const pos = lesser ? (side ? slotPos(slot, HEAD_R + 6, side * 0.2) : slotPos(slot, 295)) : elder ? slotPos(slot, HEAD_R + 20) : slotPos(slot);
      const a = f.spawnAdd({ kind: 'hy-' + el + (elder ? '-e' : o.surf ? '-w' : lesser ? '-s' : ''), x: pos.x, y: pos.y, hp: elder ? dmg.elderHp : o.surf ? dmg.surfHp : lesser ? dmg.lesserHp : dmg.headHp,
        r: lesser ? 26 : elder ? 40 : 34, inert: true, prio: 0 });
      a.el = el; a.slot = slot; a.great = !lesser; a.elder = elder; a.facing = Math.atan2(pos.y, pos.x);
      const h = { add: a, el, slot, x: pos.x, y: pos.y, lesser, elder, surf: !!o.surf, fast: !!o.surf, pw: elder ? 1.25 : lesser ? 0.55 : 1, sz: elder ? 1.1 : lesser ? 0.8 : 1,
        last: f.t + (o.late ?? 6), ready: f.t + (o.late ?? 6), sunk: false };
      heads.set(a.id, h);
      a.onDeath = () => headDied(h);
      return h;
    };
    // --- the turn order: one head after another, the one that has waited longest first ---
    const rot = () => f.events.filter(e => e.owner === 'rot');
    const rotClear = () => { f.events = f.events.filter(e => e.owner !== 'rot'); };
    const liveHeads = () => [...heads.values()].filter(h => !h.sunk && f.adds.has(h.add.id));
    const gapFor = n => Math.min(11, Math.max(GAP_MIN, CYC / Math.max(1, n)));
    const castOf = h => cd(h, EL[h.el].base);
    const relay = (firstT) => {
      rotClear();
      if (paused) return;
      for (let i = avoid.length - 1; i >= 0; i--) if (avoid[i][1] < f.t) avoid.splice(i, 1);
      const hs = liveHeads().sort((a, b) => a.last - b.last || a.slot - b.slot);
      if (!hs.length) return;
      const gap = gapFor(hs.length);
      let t = Math.max(firstT ?? f.t + gap, f.t + 0.3);
      for (let i = 0; i < Math.min(4, hs.length); i++) {
        const h = hs[i];
        let at = Math.max(t, h.ready, holdUntil);
        // a head never lands on top of a Cry or a Maul: it waits until the body move has landed
        for (let k = 0; k < 4; k++) {
          const land = at + castOf(h), w = avoid.find(v => land > v[0] && land < v[1]);
          if (!w) break;
          at = w[1] - castOf(h) + 0.05;
        }
        f.events.push({ t: at, fn: () => fire(h), phase: f.phase, keep: true, name: EL[h.el].name, owner: 'rot', head: h });
        t = Math.max(t + gap, at + 0.1);
      }
      f.events.sort((a, b) => a.t - b.t);
    };
    // the stump remembers: the stump of an earlier head answers once, gentler, in place of the next head's turn
    const stumpEcho = o => {
      const pos = slotPos(o.slot), d0 = 1.2;
      f.cast('Stump Echo', d0, 'head');
      f.emit({ t: 'propfx', k: 'echo', x: pos.x, y: pos.y, el: o.el });
      f.afterKeep(d0, () => { if (!paused) EL[o.el].run({ x: pos.x, y: pos.y, el: o.el, pw: H ? 0.85 : 0.75, sz: 1, lesser: false, fast: false }); }, EL[o.el].name);
    };
    const fire = h => {
      if (paused || !heads.has(h.add.id) || !f.adds.has(h.add.id) || h.sunk) return;
      if (echoQ.length) { stumpEcho(echoQ.shift()); relay(f.t + 1.2 + gapFor(liveHeads().length)); return; }
      h.last = f.t;
      EL[h.el].run(h);
      relay(f.t + gapFor(liveHeads().length));
    };
    // a head that falls
    const headDied = h => {
      heads.delete(h.add.id);
      const nxt = rot().find(e => e.head !== h);
      if (h.surf) { relay(nxt ? nxt.t : undefined); return; }
      if (!h.lesser) {
        order.push({ el: h.el, slot: h.slot }); stump(h);
        if (order.length >= 2 && !paused && echoQ.length < 2) echoQ.push(order[order.length - 2]);   // (the stump before it answers)
      }
      relay(nxt ? nxt.t : undefined);
    };
    // the stump of a great head: it bleeds, and a ring opens at the foot of its column. In it, it is seared; left, it regrows
    const stump = h => {
      const col = columns()[h.slot], pos = slotPos(h.slot, SEAR_R), st = { el: h.el, seared: false };
      stumps.set(h.slot, st);
      f.cast('Searing', 2.4, 'head');   // (the stump bleeds: the cast bar names it, and the ring at the column opens a moment later)
      f.emit({ t: 'propfx', k: 'stump', x: Math.round(h.x), y: Math.round(h.y), el: h.el, slot: h.slot });
      if (col) f.setPropState(col, 1);
      f.afterKeep(1.0, () => {
        f.mech({ type: 'tower', shape: { kind: 'circle', x: pos.x, y: pos.y, r: 62 }, delay: f.ct(10), dmg: dmg.sear, failDmg: dmg.sear, need: 1, tag: 'sear', from: 'Searing',
          onResolve: (inside) => {
            if (col) f.setPropState(col, 0);
            if (inside.length) {
              st.seared = true;
              f.emit({ t: 'propfx', k: 'sear', x: Math.round(h.x), y: Math.round(h.y), px: pos.x, py: pos.y, el: h.el });
            } else {
              f.emit({ t: 'propfx', k: 'regrow', x: Math.round(h.x), y: Math.round(h.y), el: h.el });
              if (H) f.cast('Regrowth', 1.6, 'head');
              sprout(h);
            }
          } });
      });
    };
    const sprout = h => {
      const hs = [mkHead(h.el, h.slot, { lesser: true, side: -1 }), mkHead(h.el, h.slot, { lesser: true, side: 1 })];
      if (H) hs.push(mkHead(h.el, h.slot, { lesser: true, side: 0 }));
      relay(rot()[0] ? rot()[0].t : undefined);
    };

    // which heads the bots go for (fight.js addTarget aside, DPS bots read prio: bots.js pickEnemy). The ones that break the
    // surface first; then lesser heads (quick to remove); then the great ones in the order the bots think is kindest
    // (the gentlest first, so the one that grows back is the gentlest).
    const PLAN = ['acid', 'gaze', 'storm', 'venom', 'frost', 'flame', 'tide', 'mire'];
    let prioAt = 0;
    f.ticker(() => {
      if (f.t < prioAt) return;
      prioAt = f.t + 0.4;
      const hs = [...heads.values()].filter(h => f.adds.has(h.add.id));
      if (!hs.length) return;
      const surf = hs.filter(h => h.surf);
      for (const h of hs) h.add.prio = 0;
      if (surf.length) { surf.sort((a, b) => a.add.born - b.add.born)[0].add.prio = 9; return; }
      const lesser = hs.filter(h => h.lesser && !h.sunk);
      if (lesser.length) { lesser.sort((a, b) => a.add.hp - b.add.hp)[0].add.prio = 6; return; }
      const great = hs.filter(h => !h.lesser && !h.sunk).sort((a, b) => (b.add.hp < b.add.maxHp ? 1 : 0) - (a.add.hp < a.add.maxHp ? 1 : 0) || PLAN.indexOf(a.el) - PLAN.indexOf(b.el));
      if (great[0]) great[0].add.prio = 5;
    });

    // --- the body ---------------------------------------------------------------------------------------------
    // a body move that lands d after it starts never lands on top of a head: if one is about to, it starts a moment later, and
    // the heads' round keeps clear of the place it lands
    const bodyAt = (d, go) => {
      let delay = 0;
      for (let i = 0; i < 4; i++) {
        const land = f.t + delay + d, hit = headLands.find(x => Math.abs(x - land) < AVOID);
        if (hit === undefined) break;
        delay = Math.max(delay, hit + AVOID - f.t - d + 0.05);
      }
      delay = Math.min(delay, 2.5);
      const run = () => { avoid.push([f.t + d - AVOID, f.t + d + AVOID]); relay(rot()[0] ? rot()[0].t : undefined); go(); };
      if (delay > 0.05) f.afterKeep(delay, run); else run();
    };
    // the heads hold their round for a while (Gaze and Tidal Dance run alone)
    const quiet = dur => { holdUntil = Math.max(holdUntil, f.t + dur); relay(rot()[0] ? rot()[0].t : undefined); };
    const cry = () => {
      const d = f.ct(4.4);
      bodyAt(d, () => {
        f.cast("Mother's Cry", d, 'cry');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.cry, hidden: true, tag: 'cry' });
      });
    };
    const maul = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.4);
      bodyAt(d, () => {
        f.cast('Rending Maul', d, 'maul');
        f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 1.4, angle: B.facing }, delay: d, dmg: dmg.maul, target: tank.id, aimFromBoss: tank.id, tag: 'buster' });
      });
    };
    // Tail Thrash: the Mother's tail sweeps the ring of water at her feet; whoever stands by her (the knight, a melee hand) steps out
    const thrash = () => {
      const d = f.ct(2.8);
      f.cast('Tail Thrash', d, 'maul');
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: B.x, y: B.y, r: 230 }, delay: d, dmg: dmg.thrash, tag: 'thrash' });
    };
    // Hydra's Gaze (Hard): the whole inside of the temple. Only the ground near the wall is left out.
    const hydraGaze = () => {
      const d = f.ct(5.4);
      bodyAt(d, () => {
        quiet(d + 0.6);
        f.cast("Hydra's Gaze", d, 'gaze');
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: 0, y: 0, r: 372 }, delay: d, dmg: dmg.gazeAll, tag: 'hgaze' });
      });
    };
    // Tidal Dance (Hard): two heads send their lines across the temple, three times, each pair crossing a step along from the last
    const tidalDance = () => bodyAt(f.ct(3.9), tidalDance_);
    const tidalDance_ = () => {
      const hs = f.shuffle(liveHeads().filter(h => !h.lesser));
      const src = hs.length >= 2 ? [hs[0], hs[1]] : [{ x: slotPos(0).x, y: slotPos(0).y }, { x: slotPos(4).x, y: slotPos(4).y }];
      const d = f.ct(3.9), a0 = f.rng() * TAU, dir = f.rng() < 0.5 ? 1 : -1;
      quiet(d + 3.0 + 0.6);
      f.cast('Tidal Dance', d, 'head');
      for (let j = 0; j < 3; j++) {
        f.afterKeep(j * 1.5, () => {
          const a = a0 + dir * j * 0.95, P = { x: Math.cos(a) * 190, y: Math.sin(a) * 190 };
          for (const s of src) {
            const ang = Math.atan2(P.y - s.y, P.x - s.x);
            f.mech({ type: 'aoe', shape: { kind: 'rect', x: s.x, y: s.y, angle: ang, len: 1300, w: 125 }, delay: d, dmg: dmg.dance, tag: 'tide' });
            if (src[0] === s && s.add) f.emit({ t: 'addev', k: 'bite', id: s.add.id, tg: null });
          }
        });
      }
    };

    // --- the births ---------------------------------------------------------------------------------------------
    // which element stands where: fixed on Normal, drawn fresh each pull on Hard
    const place = (els, slots) => { const sl = H ? f.shuffle(slots) : slots; return els.map((el, i) => [el, sl[i]]); };
    const birth = (list, o = {}) => {
      for (const [el, slot] of list) { const h = mkHead(el, slot, Object.assign({}, o)); void h; }
      const first = rot()[0];
      relay(first ? first.t : f.t + (o.late ?? 6));
    };
    const actStart = n => () => {
      B.untargetable = false;
      if (n === 1) birth(place(['acid', 'tide', 'venom'], [0, 3, 6]), { late: 7 });
      else if (n === 2) {
        f.emit({ t: 'propfx', k: 'rise', x: 0, y: 0, n: 3 });
        birth(place(['flame', 'frost', 'storm'], [1, 4, 7]), { late: 6 });
      } else {
        f.emit({ t: 'propfx', k: 'rise', x: 0, y: 0, n: 3 });
        const elder = (order[0] && order[0].el) || 'acid';
        const sl = H ? f.shuffle([2, 5, 8]) : [2, 5, 8];
        mkHead('gaze', sl[0], { late: 6 }); mkHead('mire', sl[1], { late: 6 }); mkHead(elder, sl[2], { elder: true, late: 9 });
        const first = rot()[0];
        relay(first ? first.t : f.t + 6);
      }
    };

    // --- the Submerge (the seam) ----------------------------------------------------------------------------------
    // She dives and the temple floods. For 15 s heads break the surface at random columns, one after another: each shows a ring
    // where it will come up, rises, strikes once, and sinks again if it is not cut first.
    const submerge = () => {
      const d = f.ct(3.4), HOLD = 15;
      f.cast('Submerge', d, 'dive');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.cry * 0.7, hidden: true, tag: 'surge' });
      f.afterKeep(d, () => {
        paused = true; rotClear();
        for (const h of liveHeads()) h.sunk = true;
        B.untargetable = true;
        f.emit({ t: 'roomev', k: 'flood', dur: HOLD });
        f.zone({ shape: { kind: 'circle', x: 0, y: 0, r: 700 }, dur: HOLD, delay: 0, effect: 'slow', tag: 'flood' });
        const cols = f.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4), els = f.shuffle(['acid', 'tide', 'venom', 'flame', 'storm', 'frost']);
        cols.forEach((slot, i) => {
          f.afterKeep(0.8 + i * 2.4, () => {
            const at = slotPos(slot, 330), dd = f.ct(2.4);
            f.aoe({ kind: 'circle', x: at.x, y: at.y, r: 120 }, dd, dmg.rise, { tag: 'rise', from: 'Submerge' });
            f.afterKeep(dd, () => {
              const h = mkHead(els[i], slot, { lesser: true, surf: true, late: 2 });
              h.x = at.x; h.y = at.y; h.add.x = at.x; h.add.y = at.y; h.add.facing = Math.atan2(at.y, at.x);
              h.ready = f.t + 2; h.sunk = false;
              f.afterKeep(2.0, () => { if (heads.has(h.add.id) && f.adds.has(h.add.id)) EL[h.el].run(h); }, EL[els[i]].name);
              f.afterKeep(8, () => { if (heads.has(h.add.id) && f.adds.has(h.add.id)) { h.add.onDeath = null; heads.delete(h.add.id); f.killAdd(h.add); } });
            });
          });
        });
      });
    };
    const emerge = () => {
      const d = f.ct(3.0);
      f.cast("Mother's Cry", d, 'cry');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.cry, hidden: true, tag: 'cry' });
      f.afterKeep(d, () => {
        B.untargetable = false; paused = false;
        for (const h of heads.values()) h.sunk = false;
        // anything of the flood still rising is gone now
        for (const h of [...heads.values()]) if (h.surf && f.adds.has(h.add.id)) { h.add.onDeath = null; heads.delete(h.add.id); f.killAdd(h.add); }
        for (const h of heads.values()) h.last = Math.min(h.last, f.t - 1);
        relay(f.t + 2);
      });
    };

    // --- the Mother's Heart (the wall) ---------------------------------------------------------------------------
    // Sealed. Every cut head strikes again from its stump, in the order it was cut; then every head still alive at once;
    // then the Heart beats and the seal opens.
    const heartRun = () => {
      paused = true; rotClear(); B.lockFacing = false;
      f.emit({ t: 'roomev', k: 'hheart', dur: 70 });
      const gap = f.ct(3.3);
      // the Heart opens, and the stumps answer in the order the heads fell
      f.afterKeep(0.4, () => f.cast("Mother's Heart", f.ct(2.4), 'heart'), "Mother's Heart");
      let t = 3.2;
      for (const o of order.slice(0, 5)) {
        const pos = slotPos(o.slot);
        f.afterKeep(t, () => { f.emit({ t: 'propfx', k: 'echo', x: pos.x, y: pos.y, el: o.el }); EL[o.el].run({ x: pos.x, y: pos.y, el: o.el, pw: 1.1, sz: 1, lesser: false, fast: false }); }, EL[o.el].name);
        t += gap;
      }
      // then the heads still standing (the Elder first, then round the ring from the north), one after another
      t += 1.0;
      const living = liveHeads().filter(h => !h.lesser).sort((a, b) => (b.elder ? 1 : 0) - (a.elder ? 1 : 0) || a.slot - b.slot).slice(0, 3);
      const lgap = f.ct(H ? 2.4 : 2.7);
      living.forEach((h, i) => f.afterKeep(t + i * lgap, () => { if (heads.has(h.add.id) && f.adds.has(h.add.id)) EL[h.el].run(h); }, EL[h.el].name));
      // the next act is laid out a head before the end, so the feed already reads across the join; she is still sealed (the floor
      // under her health stays) until the Heart beats
      const tOpen = living.length > 1 ? t + (living.length - 2) * lgap : t;
      if (living.length) t += (living.length - 1) * lgap + 3.6;   // (the beat lands well after the last head has)
      f.afterKeep(tOpen, () => { f.wallDown(); f.wallHp = Math.max(1, Math.floor(B.maxHp * 0.1)); });
      // ... and last the Heart beats and the seal opens
      f.afterKeep(t, () => {
        const d = f.ct(3.0);
        f.cast("Mother's Heart", d, 'heart');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.heart, hidden: true, tag: 'heartbeat' });
        paused = false; relay(f.t + 6); f.wallHp = null;
      }, "Mother's Heart");
    };

    // --- the acts ---------------------------------------------------------------------------------------------------
    // The body keeps a three-beat rhythm, a beat every 8.5 s or so: Rending Maul, Tail Thrash, Mother's Cry. The heads go
    // round on theirs (relay above) and keep clear of the body's landings. Both are fixed: the same on every pull, the
    // targets are what change. `swap` puts one of Hard's big moves in a beat's place (the beat after it comes later).
    const BEAT = 8.5;
    const rhythm = (n, first, from, swap = {}) => {
      const seq = [[maul, 'Rending Maul'], [thrash, 'Tail Thrash'], [cry, "Mother's Cry"]], out = [];
      let after = null;
      for (let i = 0; i < n; i++) {
        const sw = H && swap[i], [fn, name] = sw ? [sw[0], sw[1]] : seq[(i + from) % 3];
        out.push(S([i === 0 ? first : after || BEAT, fn, name]));
        after = sw ? sw[2] : null;
      }
      return out;
    };
    const DANCE = [tidalDance, 'Tidal Dance', 10.5], GAZE = [hydraGaze, "Hydra's Gaze", 9];
    const closingBeats = [[10, cry, "Mother's Cry"], [10, maul, 'Rending Maul'], [10, thrash, 'Tail Thrash'], [10, cry, "Mother's Cry"]];
    // I. Three Heads
    const actI = from => f.course({
      until: 0.75, push: true, onStart: actStart(1),
      sets: rhythm(17, 5, 2),
      closing: closingBeats,
      next: actII,
    }, from);

    // II. Six Heads
    const actII = from => f.course({
      until: 0.45, push: true, onStart: actStart(2),
      sets: rhythm(19, 3, 2, { 2: DANCE, 8: DANCE }),
      closing: closingBeats,
      next: submerged,
    }, from);

    // The Submerge, then III. Nine Heads
    const submerged = from => f.course({
      sets: [S([2, submerge, 'Submerge']), S([15.5, emerge, "Mother's Cry"]), S([3.2])],
      next: actIII,
    }, from);

    const actIII = from => f.course({
      until: 0.1, push: true, onStart: actStart(3),
      wall: { label: "Mother's Heart", run: heartRun, until: 'resolved', timeout: 80 },
      sets: rhythm(24, 4, 0, { 4: GAZE, 7: DANCE, 10: GAZE }),
      closing: closingBeats,
      next: lastHeads,
    }, from);

    // Last Heads: the Heart has beaten
    const lastHeads = from => f.course({
      onStart: () => { B.untargetable = false; },
      sets: rhythm(7, 9, 2),   // (laid out a head before the Heart's end: the first beat is a Cry, a breath after the beat)
      closing: closingBeats,
      ramp: 0.08,
    }, from);

    actI(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.cry())
    f.moves = { cry, maul, thrash, stumpEcho, hydraGaze, tidalDance, submerge, emerge, heartRun, relay, mkHead, birth, place };
  },
};

if (typeof module !== 'undefined') module.exports = { HYDRA };
