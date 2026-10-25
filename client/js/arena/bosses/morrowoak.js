// Boss XI: Morrow-Oak, the Starved Grove — "The Crater's Rim". The warlock tree and the hunger that eats.
// Third boss of set 3 (the Fallen Star, docs/plans/2026-10-set-3-pitches.md). The oldest tree in the realm drank from the star and has
// been feeding his own grove to the Hunger in his split heartwood to keep living. Halfway through, the Hunger swallows the grove, and
// he rises out of it wearing everything he ever fed it.
// The question is always: what will the Hunger eat next, and where do we let it?
//   WHAT THE HUNGER EATS STAYS GONE: a Hunger Seed rides on a hero, and where they stand when it bursts becomes a hole for good
//     (an f.floor entry, kind 'hole', kept across the arena swap). Anyone who steps or is dragged into a hole falls: a heavy blow,
//     held a moment, then climbing out on the side nearer the middle. The party decides where the room disappears.
//   Act I, The Grove (100% -> 75%): Hunger Seed (on one), Inhale (a pull toward him: a drag that crosses a hole ends in it), Fourfold
//     Bloom (four petals open round him, snap, turn an eighth of the way and snap again), Root Lash (the tank's buster, and a root),
//     Sap Tide (a raidwide that grows every time).
//   Act II, Hollowing (75% -> 48%): seeds on two, Saplings (little trees that walk to the nearest hole; one that reaches it grows it).
//   The Swallowing (48%, WALL): the grove tears loose and falls; the party rides the pieces down onto what is left (the room becomes
//     'morrowoak:remade', fight.js setForm), the holes kept. He unfolds, and the wall drops when he is done.
//   Act III, The Grove Remade (48% -> 15%, PUSH): four limbs grown from what he fed the Hunger, each a breakable part with its own bar;
//     they take turns, and breaking one takes its move away (the DPS choose the order):
//       Cleaver Bough (the Ogre Butcher's): a soak on a hero, then a chop down the line from the bough through where they stood.
//       Brood Roots (the Broodmother's): root strands from the limb, painted first; anyone in one is held.
//       Storm Knot (the Storm's): three rods come down where three heroes stand; keep clear of them.
//       Barrow Lantern (the Hollow King's): a light mark that bursts and passes to the hero farthest away, on a beat.
//   Act IV, Last Bloom (15% -> dead): what limbs are left, and every one of them fires with a last Fourfold Bloom.
// THE HUNGER HAS ITS FILL (rework): a seed that bursts beside an old hole feeds it instead of digging a new one, a hole stops growing at a
//   ceiling, and once six holes are open every seed feeds the nearest. Inhale and Hungering Dark drag you to a hole's edge, never into it, so
//   a fall is always the walker's own step. One heavy move at a time (seeds, Inhale, Bloom, the limbs, Hungering Dark wait their turn, so a
//   limb's turn is never stacked on a seed, a Hungering Dark or a Last Gasp: spacing, not cutting), the Lantern's marks never pass to the same hero twice, and Sap Tides are
//   spaced. Act IV opens with an Inhale that rolls straight into a Fourfold Bloom (the pull puts you at his feet; the petals open there).
// Every telegraph shows on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Twin Seed:      two seeds, joined: burst them far apart, or they open one giant hole between them.
//   Hungering Dark: the holes breathe in; the ground round each one drags anyone on it over the edge.
//   Deeper Roots:   set 2's monsters join the limbs (a wyrm wing, a frost fist, an archmage rune, a hydra head): each pull grows 4 of 8.
//   Last Gasp:      a broken limb's move fires once more from where it fell.
// Hard also draws the seed targets, the limbs and the petals' turn each pull.

const MORROWOAK = {
  id: 'morrowoak', name: 'Morrow-Oak', title: 'the Starved Grove',
  hp: { normal: 5000000, hard: 5000000 },
  hardDmg: 1.15,   // (Hard's damage multiplier; fight.js default 1.25)
  autoDmg: { normal: 2450, hard: 2400 },
  enrage: { normal: 612, hard: 597 },   // the cast starts here and lands 8 s later (10:20 / 10:05)
  enrageName: 'Nothing Left',
  vuln: 0.5,
  spawn: { x: 0, y: -40 },
  arena: { theme: 'grove' },
  // the second form (fight.js setForm 'remade'): the bar, the room and the music change with it (raid-ui.js reads forms)
  forms: { remade: { name: 'The Grove Remade', title: 'All the Hunger Ate' } },
  gates: [0.75, { f: 0.48, wall: 1 }, { f: 0.15, push: 1 }],

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      sap: H ? 11500 : 12600, lash: H ? 23800 : 26000, seed: H ? 16800 : 18000, fall: H ? 20500 : 22000, petal: H ? 19600 : 21500,
      twin: H ? 15000 : 0, dark: H ? 9000 : 0, swallow: H ? 9000 : 10500, sapHp: H ? 11000 : 12000, limbHp: H ? 185000 : 200000,
      cleave: H ? 52000 : 54000, chop: H ? 21400 : 23000, roots: H ? 10700 : 11500, rod: H ? 20200 : 22000, lantern: H ? 13100 : 13800,
      wing: H ? 20000 : 0, rime: H ? 18400 : 0, rimePool: H ? 2400 : 0, rune: H ? 18900 : 0, head: H ? 19400 : 0,
    };
    const TUNE = H ? 1.13 : 1.13;   // (the spacing and caps below keep the room fair; this keeps the hits worth healing)
    for (const k of Object.keys(dmg)) if (k !== 'sapHp' && k !== 'limbHp') dmg[k] = Math.round(dmg[k] * TUNE);
    const S = (...steps) => steps.filter(Boolean);
    const live = id => f.alive().find(p => p.id === id);
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    let sapN = 0;                  // Sap Tide grows every time
    let riding = false;            // the Swallowing: the party rides the pieces down, nobody falls
    let wallOn = false;            // the Swallowing is under way: nothing waiting for its turn starts
    // One heavy move at a time: seeds, Inhale, Bloom, a limb's turn and Hungering Dark each take the floor for as long as they run, and
    // one that comes due sooner waits for the one before it. (Sap Tide and Root Lash are the tank's and healer's own beat and never wait.)
    let lockUntil = 0;
    const busy = d => { lockUntil = Math.max(lockUntil, f.t + d); };
    const serial = (fn, name) => {
      const go = (...a) => {
        if (f.state !== 'live' || wallOn) return;
        const w = lockUntil - f.t;
        if (w > 0.05) { const re = () => go(...a); re.limb = go.limb; f.afterKeep(w + 0.5, re, name); return; }
        fn(...a);
      };
      return go;
    };

    // --- the holes ------------------------------------------------------------------------------------------------------------
    const HOLE_R = 75, HOLE_MAX = 105, GIANT_R = 125, HOLE_CAP = 6, FEED = 120;   // a hole stops at HOLE_MAX (a Twin Seed's giant one at GIANT_R)
    const holes = [];              // f.floor entries { kind: 'hole', x, y, r } (the same objects the clients and bots get)
    const inHole = (x, y, pad = 0) => holes.find(h => Math.hypot(x - h.x, y - h.y) < h.r - pad);
    const dig = (x, y, r = HOLE_R) => {
      const p = ARENA.clamp({ x, y }, 10);
      const h = f.addFloor({ kind: 'hole', x: Math.round(p.x), y: Math.round(p.y), r: Math.round(r) });
      holes.push(h);
      f.emit({ t: 'propfx', k: 'mgdig', x: h.x, y: h.y, r: h.r });
      return h;
    };
    const ceil = new WeakMap();    // a hole's ceiling (a giant one's is higher)
    const grow = (h, by) => {
      h.r = Math.min(ceil.get(h) || HOLE_MAX, h.r + by); f.floorVer++; f.propsDirty = true;
      f.emit({ t: 'propfx', k: 'mggrow', x: h.x, y: h.y, r: h.r });
    };
    // where a seed bursts: beside an old hole (or with the Hunger full, anywhere) it feeds the nearest instead of digging a new one
    const burst = (x, y, r = HOLE_R) => {
      let near = null, nd = Infinity;
      for (const h of holes) { const d = Math.hypot(x - h.x, y - h.y) - h.r; if (d < nd) { nd = d; near = h; } }
      if (near && (nd < FEED || holes.length >= HOLE_CAP)) { grow(near, r > HOLE_R ? 30 : 14); return near; }
      const h = dig(x, y, r);
      if (r > HOLE_R) ceil.set(h, GIANT_R);
      return h;
    };
    // for the bots: is this spot floor? (soon: with a step's margin round each hole)
    f.room = { fallen: 0, holes, safe: (x, y, soon) => !holes.some(h => Math.hypot(x - h.x, y - h.y) < h.r + (soon ? 30 : 6)) };
    // the way out of a hole: the nearest floor on the side toward the middle
    const climbOut = (q, h) => {
      const base = Math.atan2(-h.y, -h.x);
      for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
        const a = base + off, ex = h.x + Math.cos(a) * (h.r + 34), ey = h.y + Math.sin(a) * (h.r + 34);
        if (ARENA.sd(ex, ey) < -20 && !inHole(ex, ey, -24)) return { x: ex, y: ey };
      }
      return null;
    };
    const fellAt = {};
    const fall = (p, h) => {
      fellAt[p.id] = f.t;
      f.damagePlayer(p, dmg.fall, { kind: 'fall', avoidable: true, noVuln: true, n: 'The Hunger' });
      f.debuff(p.id, 'rooted', 2.6);
      f.emit({ t: 'propfx', k: 'mgfall', x: Math.round(p.x), y: Math.round(p.y), pid: p.id, hx: h.x, hy: h.y });
      f.afterKeep(2.7, () => {
        const q = live(p.id); if (!q) return;
        const at = inHole(q.x, q.y, -6) || h, e = climbOut(q, at); if (!e) return;
        const d = Math.hypot(e.x - q.x, e.y - q.y) || 1;
        f.knock(q, q.x - (e.x - q.x) / d, q.y - (e.y - q.y) / d, d);
      });
    };
    f.ticker(() => {
      if (!holes.length || riding || f.state !== 'live') return;
      for (const p of f.alive()) {
        const h = inHole(p.x, p.y, 10);
        if (h && f.t - (fellAt[p.id] ?? -9) >= 3.5) fall(p, h);
      }
    });

    // --- Act I and II moves -----------------------------------------------------------------------------------------------------
    // Hunger Seed: a dark seed rides a hero; where it locks (a moment before it bursts) the ground splits, and then it is a hole.
    // Hard's Twin Seed joins two seeds: burst them apart, or they make one giant hole between them.
    const seed = serial((n = 1, twin = false) => {
      const pool = f.shuffle(f.nonTanks().length >= n ? f.nonTanks() : f.alive()).slice(0, n);
      if (!pool.length) return;
      const d = f.ct(6), lock = 1.6;
      busy(d + 0.8);
      f.cast(twin && pool.length > 1 ? 'Twin Seed' : 'Hunger Seed', f.ct(3), 'seed');
      const pair = { ok: true, done: false, ms: [] };
      if (twin && pool.length > 1) f.tether(pool[0].id, pool[1].id, d - lock, { kind: 'long', len: 330, dmg: dmg.twin, tag: 'mgTwin', onResolve: ok => { pair.ok = ok; } });
      for (const p of pool) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: HOLE_R + 15 }, delay: d, dmg: dmg.seed, follow: p.id, lockAt: lock, tag: 'mgSeed',
          onResolve: () => {
            if (pair.done) return;
            if (twin && pool.length > 1 && !pair.ok) {
              pair.done = true;
              const [a, b] = pair.ms;
              burst((a.shape.x + b.shape.x) / 2, (a.shape.y + b.shape.y) / 2, GIANT_R - 5);
              return;
            }
            burst(m.shape.x, m.shape.y);
          } });
        pair.ms.push(m);
      }
    }, 'Hunger Seed');
    // Inhale: the Hunger breathes in, and everyone is dragged toward him; a drag that crosses a hole ends in it
    const PULL = 300;
    const inhale = serial(() => {
      const d = f.ct(4.4);
      f.cast('Inhale', d, 'inhale');
      hold(d + 0.6); busy(d + 1.2);
      f.mech({ type: 'drop', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: d, dmg: 0, avoidable: false, tag: 'mgInhale', pullDist: PULL,
        onResolve: () => {
          for (const p of f.alive()) {
            const dx = B.x - p.x, dy = B.y - p.y, D = Math.hypot(dx, dy);
            if (D < 110) continue;
            const ux = dx / D, uy = dy / D;
            let go = Math.min(PULL, D - 95);
            // a hole in the way stops the drag at its edge (the Hunger pulls you up to it, never over it)
            for (let s = 0; s <= go; s += 10) if (inHole(p.x + ux * s, p.y + uy * s, -22)) { go = Math.max(0, s - 12); break; }
            f.knock(p, p.x - ux, p.y - uy, go);
          }
        } });
    }, 'Inhale');
    // Fourfold Bloom: four petals open round him (thorn and spark wide, frost and blight narrow), snap shut, turn an eighth of the way
    // (clockwise on Normal; Hard draws the way) and snap again
    const PETALS = ['mgThorn', 'mgFrost', 'mgSpark', 'mgBlight'], ARC = [1.25, 0.55, 1.25, 0.55];
    const bloomRaw = (o = {}) => {
      const d = f.ct(o.quick ? 3.8 : 4.6), turn = f.ct(2.4), dir = H && f.rng() < 0.5 ? -1 : 1, a0 = f.rng() * TAU;
      if (!o.quiet) f.cast('Fourfold Bloom', d + turn, 'bloom', { dir });
      hold(d + turn + 0.4); busy(d + turn + 1);
      const cx = B.x, cy = B.y;
      const petals = (a, delay) => { const group = new Set(); PETALS.forEach((tag, i) => f.aoe({ kind: 'cone', x: cx, y: cy, r: 1300, arc: ARC[i], angle: +(a + i * Math.PI / 2).toFixed(3) }, delay, dmg.petal, { tag, group })); };
      petals(a0, d);
      f.emit({ t: 'roomev', k: 'mgbloom', x: Math.round(cx), y: Math.round(cy), a: +a0.toFixed(3), dir, at: +d.toFixed(2), turn: +turn.toFixed(2), dur: +(d + turn + 0.6).toFixed(2) });
      f.afterKeep(d - 0.02, () => { if (f.state === 'live') petals(a0 + dir * Math.PI / 4, turn + 0.02); });
    };
    const bloom = serial(bloomRaw, 'Fourfold Bloom');
    // Root Lash: the tank's buster, and it roots them a moment (so the tank moves him off the holes before, not after)
    const lash = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.0);
      f.cast('Root Lash', d, 'lash');
      f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 150 }, delay: d, dmg: dmg.lash, target: tank.id, follow: tank.id, lockAt: 0.8, tag: 'mgLash',
        onResolve: inside => { for (const p of inside) f.debuff(p.id, 'rooted', H ? 2 : 1.5); } });
    };
    // Sap Tide: a raidwide, a little heavier every time
    let tideAt = -99;
    const sapTide = () => {
      if (f.state !== 'live') return;
      const w = tideAt + 9 - f.t;   // two tides are never stacked: one that comes due too soon waits for the one before
      if (w > 0.05) { f.afterKeep(w, sapTide, 'Sap Tide'); return; }
      tideAt = f.t;
      const d = f.ct(4.4), k = sapN++;
      f.cast('Sap Tide', d, 'tide');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: Math.round(dmg.sap * Math.min(1.5, 1 + 0.05 * k)), hidden: true, tag: 'mgSap' });
    };
    // Saplings: little trees that walk to the nearest hole; one that reaches it, grows it
    const saplings = () => {
      const d = f.ct(3.2), n = H ? 4 : 3;
      f.cast('Saplings', d, 'saplings');
      f.afterKeep(d, () => {
        if (f.state !== 'live') return;
        const a0 = f.rng() * TAU;
        for (let i = 0; i < n; i++) {
          const a = a0 + i * TAU / n, sp = { x: Math.cos(a) * 260, y: Math.sin(a) * 260 };
          const at = inHole(sp.x, sp.y, -30) ? { x: sp.x * 0.6, y: sp.y * 0.6 } : sp;
          f.spawnAdd({ kind: 'sapling', x: at.x, y: at.y, hp: dmg.sapHp, r: 24, inert: true, prio: 5,
            onTick: (s, dt) => {
              if (s.wait == null) s.wait = f.t + 1.2;
              if (f.t < s.wait) return;
              let h = null, hd = Infinity;
              for (const q of holes) { const dd = Math.hypot(q.x - s.x, q.y - s.y) - q.r; if (dd < hd) { hd = dd; h = q; } }
              if (!h) return;
              if (hd < 6) { s.onDeath = null; f.killAdd(s); grow(h, 18); return; }
              const dx = h.x - s.x, dy = h.y - s.y, D = Math.hypot(dx, dy) || 1, st = (H ? 34 : 30) * dt;
              s.x += dx / D * st; s.y += dy / D * st; s.facing = Math.atan2(dy, dx);
            } });
        }
      });
    };
    // Hungering Dark (Hard): the holes breathe in; the ground round each one drags anyone on it over the edge
    const hungeringDark = serial(() => {
      if (!holes.length) return;
      const d = f.ct(4.0);
      f.cast('Hungering Dark', d, 'dark');
      busy(d + 1);
      const group = new Set(), pulled = new Set();
      for (const h of holes) {
        f.mech({ type: 'aoe', shape: { kind: 'donut', x: h.x, y: h.y, r: h.r + 95, r2: h.r - 4 }, delay: d, dmg: dmg.dark, tag: 'mgDark', group,
          onResolve: inside => {
            // the ground drags you to the hole's edge (one hole's pull a hero, the nearest), never over it
            for (const p of inside) {
              if (pulled.has(p.id)) continue;
              pulled.add(p.id);
              const dd = Math.hypot(h.x - p.x, h.y - p.y) || 1, go = dd - (h.r + 26);
              if (go > 4) f.knock(p, p.x - (h.x - p.x) / dd, p.y - (h.y - p.y) / dd, go);
            }
          } });
      }
    }, 'Hungering Dark');

    // --- the Swallowing (the wall) ------------------------------------------------------------------------------------------
    const SWALLOW = 21;
    const swallowing = () => {
      wallOn = true; lockUntil = 0;
      f.cast('The Swallowing', 6, 'swallow');
      B.lockFacing = true; hold(SWALLOW);
      f.emit({ t: 'roomev', k: 'swallow', dur: SWALLOW });
      f.afterKeep(4, () => f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 2, dmg: dmg.swallow, hidden: true, tag: 'mgSwallow' }));
      f.afterKeep(6, () => {
        riding = true;
        f.clearZones(); f.clearPuddles();
        for (const a of [...f.adds.values()]) if (a.kind === 'sapling') { a.onDeath = null; f.killAdd(a); }
      });
      f.afterKeep(8, () => {
        f.setForm('remade');
        f.edgeGrace = f.t + 3;
        B.x = 0; B.y = -40; B.moveTo = null;
        // the party lands on what is left: anyone past its edge, or over a hole, is set down on floor
        for (const p of f.alive()) {
          const r = Math.hypot(p.x, p.y), h = inHole(p.x, p.y, -10);
          if (h) { const e = climbOut(p, h); if (e) { const dd = Math.hypot(e.x - p.x, e.y - p.y) || 1; f.knock(p, p.x - (e.x - p.x) / dd, p.y - (e.y - p.y) / dd, dd); } }
          else if (r > ARENA.r - 50) f.knock(p, p.x * 3, p.y * 3, r - (ARENA.r - 90));
        }
      });
      f.afterKeep(10.5, () => { riding = false; });
      f.afterKeep(11, sapTide, 'Sap Tide');
      f.afterKeep(14.5, lash, 'Root Lash');
      f.afterKeep(SWALLOW - 4.5, () => f.cast(H ? 'Deeper Roots' : 'The Grove Remade', 4.5, 'unfold'));
      f.afterKeep(SWALLOW, () => {
        B.lockFacing = false;
        wallOn = false; lockUntil = 0;
        growLimbs();
        relabel();
        if (f.wall) f.wallDown();
      }, H ? 'Deeper Roots' : 'The Grove Remade');
      // (and what the limbs do as they wake is laid now, so the feed reads across the wall into Act III)
      f.atKeep(f.t + SWALLOW + 4, limbTurn, LIMB[order[0]].name);
      f.afterKeep(SWALLOW + 13, lash, 'Root Lash');
    };

    // --- the limbs --------------------------------------------------------------------------------------------------------------
    // Each limb is a breakable part (an inert add with its own bar) held at his side; each one's move is aimed from where it stands.
    const farFrom = (x, y, not) => { let best = null, bd = -1; for (const p of f.alive()) { if (not && (not instanceof Set ? not.has(p.id) : p.id === not)) continue; const d = Math.hypot(p.x - x, p.y - y); if (d > bd) { bd = d; best = p; } } return best; };
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    // Cleaver Bough: a soak on a hero; then a chop from the bough through where they stood
    const cleaver = L => {
      const tgt = nonTank(); if (!tgt) return;
      const d = f.ct(4.6), lx = L.x, ly = L.y;
      f.cast('Cleaver Bough', d, 'cleaver');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 120 }, delay: d, dmg: dmg.cleave, follow: tgt.id, lockAt: 0.6, need: 3, tag: 'mgCleave',
        onResolve: () => {
          const q = live(tgt.id) || tgt, a = Math.atan2(q.y - ly, q.x - lx);
          f.aoe({ kind: 'rect', x: Math.round(lx), y: Math.round(ly), angle: +a.toFixed(3), len: 1500, w: 150 }, f.ct(2.2), dmg.chop, { tag: 'mgChop' });
        } });
    };
    // Brood Roots: strands from the limb, painted first; anyone standing in one when they close is held
    const broodRoots = L => {
      const d = f.ct(4.2), a0 = f.rng() * TAU, n = 5, lx = L.x, ly = L.y;
      f.cast('Brood Roots', d, 'roots');
      const group = new Set();
      for (let i = 0; i < n; i++) {
        const a = a0 + i * TAU / n;
        f.aoe({ kind: 'rect', x: Math.round(lx), y: Math.round(ly), angle: +a.toFixed(3), len: 1100, w: 90 }, d, dmg.roots, { tag: 'mgRoots', group,
          onResolve: inside => { for (const p of inside) f.debuff(p.id, 'rooted', 3); } });
      }
    };
    // Storm Knot: three rods come down where three heroes stand; keep clear of them
    const stormKnot = () => {
      const d = f.ct(4.4), ps = f.shuffle(f.alive()).slice(0, 3);
      f.cast('Storm Knot', d, 'storm');
      const group = new Set();
      for (const p of ps) f.aoe({ kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: 190 }, d, dmg.rod, { tag: 'mgRod', group });
    };
    // Barrow Lantern: a light mark bursts on a hero and passes to whoever is farthest from them, on a beat
    const lantern = () => {
      const first = nonTank(); if (!first) return;
      const d = f.ct(4.0), beat = f.ct(2.6), n = H ? 4 : 3, had = new Set([first.id]);   // (no hero carries it twice)
      f.cast('Barrow Lantern', d + beat * (n - 1), 'lantern');
      const mark = (p, k, delay) => f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 150 }, delay, dmg: dmg.lantern, follow: p.id, lockAt: 0.3, tag: 'mgLantern',
        onResolve: () => { if (k + 1 >= n || f.state !== 'live') return; const q = live(p.id) || p, nx = farFrom(q.x, q.y, had); if (nx) { had.add(nx.id); mark(nx, k + 1, beat); } } });
      mark(first, 0, d);
    };
    // (Hard: Deeper Roots) Wyrm Wing: the wyrm's wing on its side of him sweeps that whole half of the room
    const wing = L => {
      const d = f.ct(4.6), a = Math.atan2(L.y - B.y, L.x - B.x);
      f.cast('Wyrm Wing', d, 'wing');
      hold(d);
      f.aoe({ kind: 'cone', x: Math.round(B.x), y: Math.round(B.y), r: 1300, arc: Math.PI, angle: +a.toFixed(3) }, d, dmg.wing, { tag: 'mgWing' });
    };
    // Frost Fist: the frost giant's fist on the hero farthest from him, and the ice it leaves slows
    const rimeFist = () => {
      const tgt = farFrom(B.x, B.y); if (!tgt) return;
      const d = f.ct(4.2);
      f.cast('Frost Fist', d, 'fist');
      const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 210 }, delay: d, dmg: dmg.rime, follow: tgt.id, lockAt: 1.1, tag: 'mgRime',
        onResolve: () => { const pd = f.puddle(m.shape.x, m.shape.y, 170, 12, dmg.rimePool, 1, 'mgRimeIce', { slow: true }); for (const o of f.alive()) pd.last[o.id] = f.t; } });
    };
    // Archmage Rune: the archmage's rune under him: out of the circle, then into it as the ring round it goes
    const rune = () => {
      const d = f.ct(4.2), d2 = f.ct(2.4), cx = Math.round(B.x), cy = Math.round(B.y);
      f.cast('Archmage Rune', d + d2, 'rune');
      hold(d + d2);
      f.aoe({ kind: 'circle', x: cx, y: cy, r: 270 }, d, dmg.rune, { tag: 'mgRune' });
      f.afterKeep(d - 0.02, () => { if (f.state === 'live') f.aoe({ kind: 'donut', x: cx, y: cy, r: 1400, r2: 270 }, d2 + 0.02, dmg.rune, { tag: 'mgRuneRing' }); });
    };
    // Hydra Head: the hydra's head breathes down the line to the hero farthest from it
    const head = L => {
      const d = f.ct(4.0), lx = L.x, ly = L.y;
      f.cast('Hydra Head', d, 'head');
      const tgt = farFrom(lx, ly); if (!tgt) return;
      f.aoe({ kind: 'rect', x: Math.round(lx), y: Math.round(ly), angle: +Math.atan2(tgt.y - ly, tgt.x - lx).toFixed(3), len: 1500, w: 130 }, d, dmg.head, { tag: 'mgHead' });
    };
    // dur: how long the move holds the floor (cast to last hit), for the one-heavy-move-at-a-time rule
    const LIMB = {
      cleaver: { name: 'Cleaver Bough', fn: cleaver, dur: 6.8 },
      brood: { name: 'Brood Roots', fn: broodRoots, dur: 4.4 },
      storm: { name: 'Storm Knot', fn: stormKnot, dur: 4.4 },
      lantern: { name: 'Barrow Lantern', fn: lantern, dur: H ? 11.8 : 9.2 },
      wing: { name: 'Wyrm Wing', fn: wing, dur: 4.6 },
      rime: { name: 'Frost Fist', fn: rimeFist, dur: 5.4 },
      rune: { name: 'Archmage Rune', fn: rune, dur: 6.6 },
      head: { name: 'Hydra Head', fn: head, dur: 4.0 },
    };
    const SET1 = ['cleaver', 'brood', 'storm', 'lantern'], SET2 = ['wing', 'rime', 'rune', 'head'];
    const order = H ? f.shuffle([...SET1, ...SET2]).slice(0, 4) : SET1.slice();
    const SIDE = [[-1, -1], [1, -1], [1, 1], [-1, 1]];   // where each limb stands at his side (the four diagonals)
    const limbs = {};
    let turnI = 0, grown = false;
    const liveLimbs = () => order.filter(k => limbs[k] && f.adds.has(limbs[k].id));
    // the feed names the limb whose turn it will be
    const relabel = () => {
      const ls = liveLimbs();
      let j = 0;
      for (const e of f.events) if (e.fn && e.fn.limb && e.t >= f.t) { e.name = ls.length ? LIMB[ls[(turnI + j) % ls.length]].name : BARE[(bareI + j) % BARE.length][1]; j++; }
    };
    const growLimbs = () => {
      if (grown) return;
      grown = true;
      order.forEach((k, i) => {
        const [sx, sy] = SIDE[i], ox = sx * 120, oy = sy * 95;
        const a = f.spawnAdd({ kind: 'limb-' + k, x: B.x + ox, y: B.y + oy, hp: dmg.limbHp, r: 36, inert: true, prio: 3,
          onTick: q => { q.x = B.x + ox; q.y = B.y + oy; q.facing = Math.atan2(oy, ox); },
          onDeath: q => {
            f.emit({ t: 'propfx', k: 'mglimb', x: Math.round(q.x), y: Math.round(q.y), limb: k });
            relabel();
            // Last Gasp (Hard): its move fires once more from where it fell
            // ... but not on top of another heavy move: it waits its turn
            if (H && f.state === 'live') { const at = { x: q.x, y: q.y }; f.afterKeep(1.4, serial(() => { busy(f.ct(LIMB[k].dur) + 0.8); LIMB[k].fn(at); }, 'Last Gasp'), 'Last Gasp'); }
          } });
        a.limb = k;
        limbs[k] = a;
      });
      f.emit({ t: 'roomev', k: 'mglimbs', l: order, dur: 9999 });
    };
    // one limb's turn: the next one still living (none left: a Bloom or an Inhale, by turns)
    const BARE = [[() => bloom(), 'Fourfold Bloom'], [() => inhale(), 'Inhale']];
    let bareI = 0;
    const limbTurn = serial(() => {
      const ls = liveLimbs();
      if (!ls.length) { BARE[bareI++ % BARE.length][0](); relabel(); return; }
      const k = ls[turnI % ls.length];
      turnI++;
      busy(f.ct(LIMB[k].dur) + 0.8);
      LIMB[k].fn(limbs[k]);
      relabel();
    }, 'The Grove Remade');
    limbTurn.limb = true;
    // Last Bloom: every limb still standing fires, one after another, and then the last Fourfold Bloom
    const lastBloom = serial(() => {
      const ls = liveLimbs();
      busy(ls.length * f.ct(1.6) + f.ct(8));
      ls.forEach((k, i) => f.afterKeep(i * f.ct(1.6), () => { if (f.state === 'live' && f.adds.has(limbs[k].id)) LIMB[k].fn(limbs[k]); }, LIMB[k].name));
      f.afterKeep(ls.length * f.ct(1.6) + 0.5, () => bloomRaw(), 'Fourfold Bloom');
    }, 'Fourfold Bloom');
    // Draw and Bloom: an Inhale that rolls straight into a Fourfold Bloom (the pull puts you at his feet, the petals open there)
    const drawBloom = serial(() => {
      inhale();
      f.afterKeep(f.ct(4.4) + 1.3, () => { if (f.state === 'live') bloom({ quick: true }); }, 'Fourfold Bloom');
    }, 'Inhale');

    // --- the acts -------------------------------------------------------------------------------------------------------------
    const mix = (head, mid, tail) => [...head, ...(H ? f.shuffle(mid) : mid), ...tail];
    const seeds = n => H ? [() => seed(n, true), 'Twin Seed'] : [() => seed(n), 'Hunger Seed'];
    // I. The Grove
    const grove = from => f.course({
      until: 0.75,
      sets: mix([S([4, sapTide, 'Sap Tide']), S([9, () => seed(1), 'Hunger Seed'])], [
        S([12, lash, 'Root Lash']),
        S([10, inhale, 'Inhale']),
        S([12, () => bloom(), 'Fourfold Bloom']),
        S([12, sapTide, 'Sap Tide']),
        S([10, () => seed(1), 'Hunger Seed']),
        S([12, lash, 'Root Lash'], [8, inhale, 'Inhale']),
      ], [
        S([12, () => bloom(), 'Fourfold Bloom']),
        S([11, sapTide, 'Sap Tide']),
        S([10, () => seed(1), 'Hunger Seed']),
        S([12, lash, 'Root Lash']),
      ]),
      closing: [[10, sapTide, 'Sap Tide'], [10, lash, 'Root Lash'], [10, () => bloom(), 'Fourfold Bloom']],
      next: hollowing,
    }, from);

    // II. Hollowing (its gate is the Swallowing's wall)
    const hollowing = from => f.course({
      until: 0.48,
      wall: { label: 'The Swallowing', run: swallowing, until: 'resolved', timeout: SWALLOW + 8 },
      sets: [
        S([4, saplings, 'Saplings']),
        S([8, ...seeds(2)]),
        S([12, lash, 'Root Lash'], [8, inhale, 'Inhale']),
        S([12, sapTide, 'Sap Tide']),
        S([10, () => bloom(), 'Fourfold Bloom']),
        S([12, saplings, 'Saplings'], [6, ...seeds(2)]),
        S([12, lash, 'Root Lash']),
        S(H ? [9, hungeringDark, 'Hungering Dark'] : [9, inhale, 'Inhale']),
        S([11, sapTide, 'Sap Tide']),
        S([11, ...seeds(2)]),
        S([12, () => bloom(), 'Fourfold Bloom']),
        S([12, lash, 'Root Lash'], [8, inhale, 'Inhale']),
        S([12, sapTide, 'Sap Tide']),
      ].filter(Boolean),
      closing: [[10, sapTide, 'Sap Tide'], [10, lash, 'Root Lash'], [10, inhale, 'Inhale']],
      next: remade,
    }, from);

    // III. The Grove Remade: the limbs take turns, the DPS choose which to break
    const turn = [limbTurn, 'The Grove Remade'];
    const remade = from => f.course({
      until: 0.15, push: true,
      onStart: () => { growLimbs(); relabel(); },
      sets: [
        S([22, ...turn]),
        S([10, sapTide, 'Sap Tide']),
        S([9, ...turn]),
        S([10, ...seeds(2)]),
        S([10, ...turn]),
        S([10, lash, 'Root Lash'], [8, ...turn]),
        S([10, sapTide, 'Sap Tide']),
        S(H ? [9, hungeringDark, 'Hungering Dark'] : [9, inhale, 'Inhale']),
        S([9, ...turn]),
        S([10, lash, 'Root Lash']),
        S([10, drawBloom, 'Inhale']),
        S([12, ...turn]),
        S([10, sapTide, 'Sap Tide']),
        S([9, ...turn]),
        S([10, ...seeds(2)]),
        S([10, lash, 'Root Lash'], [8, ...turn]),
        S([10, sapTide, 'Sap Tide']),
        S([9, inhale, 'Inhale']),
        S([9, ...turn]),
      ].filter(Boolean),
      closing: [[10, sapTide, 'Sap Tide'], [9, lash, 'Root Lash'], [9, ...turn]],
      next: lastAct,
    }, from);

    // IV. Last Bloom
    const lastAct = from => f.course({
      onStart: () => relabel(),
      sets: [
        S([4, drawBloom, 'Inhale']),
        S([9, sapTide, 'Sap Tide']),
        S([8, ...turn]),
        S([8, lash, 'Root Lash']),
        S([9, lastBloom, 'Fourfold Bloom']),
        S([11, sapTide, 'Sap Tide']),
        S([9, ...turn]),
        S([8, lash, 'Root Lash']),
      ],
      closing: [[10, sapTide, 'Sap Tide'], [9, lash, 'Root Lash'], [10, lastBloom, 'Fourfold Bloom']],
      ramp: 0.08,
    }, from);

    grove(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.bloom())
    f.moves = { seed, inhale, bloom, drawBloom, lash, sapTide, saplings, hungeringDark, swallowing, growLimbs, limbTurn, lastBloom, dig, cleaver, broodRoots, stormKnot, lantern, wing, rimeFist, rune, head,
      limb: k => limbs[k] && LIMB[k].fn(limbs[k]) };
    f.morrowHoles = holes;
  },
};

if (typeof module !== 'undefined') module.exports = { MORROWOAK };
