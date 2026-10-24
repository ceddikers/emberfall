// Boss V: Vhalgrath, the Ember Wyrm, Tyrant of the Cinder Peaks — "The Crater". The hunter in the air.
// First boss of set 2 (the wild realm beyond the road, docs/plans/2026-10-set-2-bosses.md). The fight alternates ground and
// flight, and the question is always: where is it going to land? He walks after his tank on the ground; in the air he is
// out of reach, and a faint trail of embers draws the line he will dive along four seconds ahead. The dive lands on one of
// three crater spots (picked at random each time: the red circle on the floor is the only way to know), and everything on
// the line or under the landing takes it. Every breath leaves molten ground for 20 s.
//   Act I, Ground (100% → 75%): Tyrant's Roar, Rending Claws (tankbuster), Ember Breath (a cone at a random hero; molten
//     floor for 20 s), Tail Lash (the cone behind him), Magma Burst (spread; each puddle stays), Cinder Feast (stack).
//   Act II, First Flight (75% → 50%): Take Flight, then Dragonfall (the dive) between ground stretches; Twin Pass (two lines
//     at once, landing on the second).
//   The Roost (the seam, opens Act III): he perches on the rim for 12 s and shakes his burning scales loose on random
//     tiles while two ember whelps harry the party (any left alive when he drops detonate). Then the Crater Boils: the
//     outer ring of the floor turns molten for the rest of the fight.
//   Act III, Ground, Scorched (50% → 24%): the same moves in a smaller room, paired (Twin Breath, claws into tail).
//   Act IV, Final Flight (24% → 10%): dives close together. At 10% the Ember Heart opens: a WALL (fight.js). He cannot be
//     hurt until the Heart Burn has passed. Scorch marks bloom at the three crater spots one after another; the last one
//     marks the island that the floor-wide fire will leave standing (nothing is painted on it: it is the hole in the red).
//   Last Ember (10% → dead): the burn, until he falls or Ashfall comes.
// Acts II to IV use PUSH: a party that reaches a gate early cuts the rest of the act and moves on.
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Wingbeat: each dive's wings shove everyone near the flight line away from it (into a wall, a slam).
//   Cinder Rain: embers fall across the crater; each leaves a small molten pool.
//   Heart Flare: a stack on a random hero, then a spread right after it.
// Hard also shuffles the order of its ground sets each pull, adds a third Heart Burn, and the outer ring boils further in.

const WYRM = {
  id: 'wyrm', name: 'Vhalgrath', title: 'Tyrant of the Cinder Peaks',
  hp: { normal: 4800000, hard: 5635000 },
  autoDmg: { normal: 2300, hard: 2100 },
  enrage: { normal: 612, hard: 622 },   // the cast starts here and lands 8 s later (10:20 / 10:30)
  enrageName: 'Ashfall',
  vuln: 0.5,
  spawn: { x: 0, y: -60 },
  arena: { theme: 'crater' },
  gates: [0.75, 0.5, 0.24, { f: 0.1, wall: 1 }],   // where the acts change (ticks on the boss bar; fight.js course)
  push: true,                                       // reach a gate early and he moves on (fight.js course: push)

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      roar: H ? 12100 : 15900, buster: H ? 29700 : 34500, tail: H ? 17000 : 21800, breath: H ? 18700 : 23400, molten: H ? 3000 : 2900, puddle: H ? 2400 : 2300,
      magma: H ? 11400 : 14700, feast: H ? 32100 : 42000, gust: H ? 3600 : 3500, pass: H ? 14500 : 19200, land: H ? 20600 : 25800, wing: H ? 4600 : 5400, slam: H ? 6600 : 7500,
      scale: H ? 12700 : 16500, boom: H ? 15100 : 18000, boil: H ? 10900 : 14300, scorch: H ? 15700 : 20300, burn: H ? 24800 : 27800, heart: H ? 9100 : 10500,
      rain: H ? 9100 : 10500, flareStack: H ? 25500 : 30000, flareSpread: H ? 11400 : 13200, whelpHp: 30000, whelpBite: H ? 2300 : 2300, last: H ? 13400 : 14300,
    };
    const S = (...steps) => steps.filter(Boolean);
    const R = 560;                       // the crater floor's radius (shapes.js)
    const SPOT_R = 260;                  // the three crater spots sit this far from the middle: south, north-west, north-east
    const SPOTS = [[0, SPOT_R], [-SPOT_R * 0.866, -SPOT_R * 0.5], [SPOT_R * 0.866, -SPOT_R * 0.5]];
    const PATH_W = 170, LAND_R = 225, SCORCH_R = 105;
    let rimR2 = 0;                       // the molten ring's inner edge once the Crater Boils (0: not yet)
    // Hard draws the order of an act's middle sets fresh each pull (the opening and the last set stay put)
    const mix = (head, mid, tail) => [...head, ...(H ? f.shuffle(mid) : mid), ...tail];

    // shared with the bots and the host's view (raid-host.js)
    f.island = null;                     // the Heart Burn's island (host and sim only; never sent to clients as a marker)
    // the boss turns to face whatever it is aiming a cone at, until that telegraph has landed
    const aiming = [];
    f.ticker(() => {
      for (let i = aiming.length - 1; i >= 0; i--) {
        const m = aiming[i];
        if (!f.mechs.has(m.id)) { aiming.splice(i, 1); continue; }
        if (m.shape.angle != null) B.facing = m.shape.angle;
      }
    });
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    const grounded = () => { B.untargetable = false; B.lockFacing = false; B.moveTo = null; };
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };

    // --- ground moves -----------------------------------------------------------------------------
    const roar = () => {
      const d = f.ct(4.5);
      f.cast("Tyrant's Roar", d, 'roar');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.roar, hidden: true, tag: 'roar' });
    };
    const claws = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.4);
      f.cast('Rending Claws', d, 'claws');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 1.4, angle: B.facing }, delay: d, dmg: dmg.buster, target: tank.id, aimFromBoss: tank.id, tag: 'buster' });
    };
    // Tail Lash: the cone behind him (he faces his tank, so it sweeps the other side of him)
    const tailLash = (delay = f.ct(3.6)) => {
      B.lockFacing = true;
      f.cast('Tail Lash', delay, 'tail');
      f.aoe({ kind: 'cone', x: B.x, y: B.y, r: 380, arc: 2.5, angle: B.facing + Math.PI }, delay, dmg.tail, { tag: 'taillash' });
      hold(delay);
      f.afterKeep(delay + 0.1, () => { B.lockFacing = false; });
    };
    // Ember Breath: a cone at a random hero, following them until a second before it goes. Where it lands, the floor is molten for 20 s.
    const breath = (target, delay = f.ct(4.2), cast = true) => {
      target = target || nonTank(); if (!target) return null;
      if (cast) f.cast('Ember Breath', delay, 'breath');
      const m = f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 760, arc: 0.95, angle: Math.atan2(target.y - B.y, target.x - B.x) }, delay, dmg: dmg.breath,
        tag: 'breath', aimFromBoss: target.id, lockAt: 1.1,
        onResolve: () => {
          // the molten floor starts a little way out from him: the ground he stands on stays clear
          const s = m.shape, c = Math.cos(s.angle), sn = Math.sin(s.angle);
          const z = f.zone({ shape: { kind: 'cone', x: s.x + c * 190, y: s.y + sn * 190, r: s.r - 190, arc: s.arc, angle: s.angle }, dur: 20, delay: 0, effect: 'burn', dmg: dmg.molten, tag: 'lava' });
          for (const o of f.alive()) z.last[o.id] = f.t;   // (a second to step off it before it first burns)
        } });
      aiming.push(m); hold(delay);
      return m;
    };
    // Twin Breath (Act III on): two cones, at two different heroes, the second a beat behind
    const twinBreath = () => {
      const pool = f.nonTanks().length > 1 ? f.shuffle(f.nonTanks()) : f.shuffle(f.alive());
      const d = f.ct(4.4);
      f.cast('Twin Breath', d, 'breath');
      breath(pool[0], d, false);
      if (pool[1]) f.afterKeep(0.02, () => breath(pool[1], d + 1.6, false));
    };
    // Magma Burst: a circle on every hero but the tank; each leaves a molten pool for a while
    const magma = () => {
      const d = f.ct(5), targets = f.alive().length > 1 ? f.nonTanks() : f.alive();
      if (!targets.length) return;
      f.cast('Magma Burst', d, 'burst');
      for (const p of targets) {
        f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.magma, follow: p.id, tag: 'spread',
          onResolve: () => { const q = f.alive().find(z => z.id === p.id); if (q) { const pd = f.puddle(q.x, q.y, 80, H ? 16 : 14, dmg.puddle, 1, 'ember'); for (const o of f.alive()) pd.last[o.id] = f.t; } } });   // (a second to step out of it before it first burns)
      }
    };
    // Cinder Feast: a stack on a random hero (the tank, standing on him, is forgiven on Normal)
    const feast = () => {
      const pool = f.alive().length > 1 ? f.nonTanks() : f.alive();
      const t = pool.length ? f.pick(pool) : null; if (!t) return;
      const d = f.ct(5.2), n = f.alive().length;
      f.cast('Cinder Feast', d, 'feast');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: t.x, y: t.y, r: 120 }, delay: d, dmg: dmg.feast * Math.min(n, 4) / 4, follow: t.id, need: H ? n : Math.max(1, n - 1), tag: 'stack' });
    };

    // --- flight ---------------------------------------------------------------------------------
    // Take Flight: wings out, a gust through the crater, and he is gone from the ground for good (until he lands)
    const takeFlight = () => {
      const d = f.ct(2.4);
      f.cast('Take Flight', d, 'fly');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.gust, hidden: true, tag: 'gust' });
      f.afterKeep(d, () => { B.untargetable = true; B.lockFacing = true; B.moveTo = { x: 0, y: -30, speed: 460 }; });
    };
    // where a dive comes from: the edge of the crater past one of the other two spots
    const edgeOf = P => { const a = Math.atan2(P[1], P[0]); return { x: Math.cos(a) * (R + 190), y: Math.sin(a) * (R + 190) }; };
    const land = (L, ang) => {
      B.untargetable = false; B.lockFacing = false; B.moveTo = null;
      B.x = L[0]; B.y = L[1]; B.facing = ang; B.autoAt = f.t + 3;
      f.anim('land', 1);
      f.emit({ t: 'propfx', k: 'slam', x: Math.round(L[0]), y: Math.round(L[1]), a: +ang.toFixed(2), boss: 1 });
    };
    // Wingbeat (Hard): as he rushes the line, his wings push everyone near it away from it
    const wingbeat = (E, ang, len, delay) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      f.afterKeep(Math.max(0, delay - 1.5), () => f.emit({ t: 'bcast', name: 'Wingbeat', dur: 1.0, anim: 'wing' }));   // (named for the cast frame and the journal)
      f.aoe({ kind: 'rect', x: E.x, y: E.y, angle: ang, len, w: 470 }, delay, dmg.wing, { tag: 'wingbeat',
        onResolve: inside => {
          for (const p of inside) {
            const along = Math.max(0, Math.min(len, (p.x - E.x) * c + (p.y - E.y) * s));
            const fx = E.x + c * along, fy = E.y + s * along;
            const res = f.knock(p, fx, fy, 240, { slam: dmg.slam, slamAt: 40 });
            void res;
          }
        } });
    };
    // Dragonfall: a line of embers is drawn from the edge to the landing spot; he comes along it and lands in the red circle
    // at the end. opts: { land: [x, y], from: [x, y] } (spots), start (seconds from now the telegraph runs).
    const dive = (opts = {}) => {
      const d = opts.delay || f.ct(4.6), L = opts.land || f.pick(SPOTS), P = opts.from || f.pick(SPOTS.filter(s => s !== L));
      const E = edgeOf(P), ang = Math.atan2(L[1] - E.y, L[0] - E.x), len = Math.hypot(L[0] - E.x, L[1] - E.y);
      if (!opts.quiet) f.cast('Dragonfall', d, 'dive');
      B.untargetable = true; B.lockFacing = true; B.facing = ang; B.moveTo = { x: E.x, y: E.y, speed: 1500 };
      const group = new Set();
      f.aoe({ kind: 'rect', x: E.x, y: E.y, angle: ang, len, w: PATH_W }, d, dmg.pass, { tag: 'divepath', group });
      f.aoe({ kind: 'circle', x: L[0], y: L[1], r: LAND_R }, d, dmg.land, { tag: 'dragonfall', group });
      if (H) wingbeat(E, ang, len, d - 0.6);
      const fly = 1.5;
      f.afterKeep(d - fly, () => { B.facing = ang; B.moveTo = { x: L[0], y: L[1], speed: len / fly }; });
      f.afterKeep(d + 0.03, () => land(L, ang));
      return { E, L, ang, len, d };
    };
    // Twin Pass: two lines at once. He sweeps across the crater along the first without landing, then comes round on the second.
    const twinPass = () => {
      const d1 = f.ct(4.4), gap = f.ct(3.2);
      const L1 = f.pick(SPOTS), P1 = f.pick(SPOTS.filter(s => s !== L1));
      const L2 = f.pick(SPOTS.filter(s => s !== L1)), P2 = f.pick(SPOTS.filter(s => s !== L2));
      f.cast('Twin Pass', d1, 'dive');
      // the first line runs from the edge by P1 through the spot L1 and out the far side
      const E1 = edgeOf(P1), ang1 = Math.atan2(L1[1] - E1.y, L1[0] - E1.x), len1 = Math.hypot(L1[0] - E1.x, L1[1] - E1.y) + R * 0.7;
      B.untargetable = true; B.lockFacing = true; B.facing = ang1; B.moveTo = { x: E1.x, y: E1.y, speed: 1500 };
      f.aoe({ kind: 'rect', x: E1.x, y: E1.y, angle: ang1, len: len1, w: PATH_W }, d1, dmg.pass, { tag: 'divepath' });
      if (H) wingbeat(E1, ang1, len1, d1 - 0.6);
      const fly = 1.5;
      f.afterKeep(d1 - fly, () => { B.moveTo = { x: E1.x + Math.cos(ang1) * len1, y: E1.y + Math.sin(ang1) * len1, speed: len1 / fly }; });
      // ... and the second shows 3.5 s ahead of its landing, as the first goes off
      f.afterKeep(d1 - 0.3, () => {
        const E2 = edgeOf(P2), ang2 = Math.atan2(L2[1] - E2.y, L2[0] - E2.x), len2 = Math.hypot(L2[0] - E2.x, L2[1] - E2.y), group = new Set();
        const dd = gap + 0.3;
        f.cast('Dragonfall', dd, 'dive');
        f.afterKeep(0.8, () => { B.facing = ang2; B.moveTo = { x: E2.x, y: E2.y, speed: 1500 }; });
        f.aoe({ kind: 'rect', x: E2.x, y: E2.y, angle: ang2, len: len2, w: PATH_W }, dd, dmg.pass, { tag: 'divepath2', group });
        f.aoe({ kind: 'circle', x: L2[0], y: L2[1], r: LAND_R }, dd, dmg.land, { tag: 'dragonfall', group });
        if (H) wingbeat(E2, ang2, len2, dd - 0.6);
        f.afterKeep(dd - fly, () => { B.moveTo = { x: L2[0], y: L2[1], speed: len2 / fly }; });
        f.afterKeep(dd + 0.03, () => land(L2, ang2));
      });
    };

    // --- the Roost (the seam) and the Crater Boils ---------------------------------------------------
    const WHELPS = [[-240, -150], [240, -150]];
    const roost = () => {
      const d = f.ct(2.6), HOLD = 12;
      f.cast('The Roost', d, 'roost');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.gust, hidden: true, tag: 'gust' });
      f.afterKeep(d, () => {
        B.untargetable = true; B.lockFacing = true; B.facing = Math.PI / 2; B.moveTo = { x: 0, y: -400, speed: 500 };
        f.emit({ t: 'roomev', k: 'roost', dur: HOLD });
        // the whelps drop from his perch; any left alive when he comes down detonate
        const whelps = WHELPS.map(([x, y]) => f.spawnAdd({ kind: 'whelp', x, y, hp: dmg.whelpHp, r: 26, speed: 95, bite: dmg.whelpBite, biteEvery: 2.2, prio: 5 }));
        // burning scales: a volley every 2 s, three tiles each, one of them under a random hero
        for (let i = 0; i < 6; i++) {
          f.afterKeep(1 + i * 2, () => {
            const tgt = nonTank();
            const at = [];
            if (tgt) at.push([tgt.x, tgt.y]);
            while (at.length < 3) { const a = f.rng() * TAU, r = Math.sqrt(f.rng()) * (R - 120); at.push([Math.cos(a) * r, Math.sin(a) * r]); }
            for (const [x, y] of at) f.aoe({ kind: 'circle', x: Math.round(x), y: Math.round(y), r: 95 }, f.ct(2.4), dmg.scale, { tag: 'scales' });
          });
        }
        f.afterKeep(HOLD - 2.6, () => {
          for (const w of whelps) if (f.adds.has(w.id)) f.aoe({ kind: 'circle', x: Math.round(w.x), y: Math.round(w.y), r: 150 }, 2.2, dmg.boom, { tag: 'whelpboom', onResolve: () => f.killAdd(w) });
        });
        f.afterKeep(HOLD, () => {
          grounded(); B.x = 0; B.y = -380; B.autoAt = f.t + 3; f.anim('land', 1);
          f.emit({ t: 'propfx', k: 'slam', x: 0, y: -380, a: Math.PI / 2, boss: 1 });
        });
      });
    };
    // The Crater Boils: the ring of floor by the rim turns molten for the rest of the fight
    const boils = () => {
      const d = f.ct(4), r2 = H ? 430 : 465;
      f.cast('Crater Boils', d, 'boil');
      const ring = { kind: 'donut', x: 0, y: 0, r: 900, r2 };
      f.aoe(ring, d, dmg.boil, { tag: 'boil' });
      f.zone({ shape: ring, dur: 9999, delay: d, effect: 'burn', dmg: dmg.molten, tag: 'lava' });
      rimR2 = r2;
      f.afterKeep(d, () => f.emit({ t: 'roomev', k: 'boil', r2, dur: 9999 }));
    };

    // --- Hard only ------------------------------------------------------------------------------
    // Cinder Rain: embers fall across the crater; each lands in a circle and leaves a small pool
    const cinderRain = () => {
      const d = f.ct(2.6), n = 10;
      f.cast('Cinder Rain', f.ct(3), 'rain');
      for (let i = 0; i < n; i++) {
        const a = f.rng() * TAU, r = Math.sqrt(f.rng()) * ((rimR2 || R) - 100), x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r);
        f.afterKeep(i * 0.45, () => f.aoe({ kind: 'circle', x, y, r: 75 }, d, dmg.rain, { tag: 'cinder', onResolve: () => { const pd = f.puddle(x, y, 70, 9, dmg.puddle, 1, 'ember'); for (const o of f.alive()) pd.last[o.id] = f.t; } }));
      }
    };
    // Heart Flare: a stack on a random hero, and the moment it lands a spread on everyone
    const heartFlare = () => {
      const pool = f.alive().length > 1 ? f.nonTanks() : f.alive();
      const t = pool.length ? f.pick(pool) : null; if (!t) return;
      const d = f.ct(4.6), n = f.alive().length;
      f.cast('Heart Flare', d, 'flare');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: t.x, y: t.y, r: 120 }, delay: d, dmg: dmg.flareStack * Math.min(n, 4) / 4, follow: t.id, need: n, tag: 'stack',
        onResolve: () => {
          for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 105 }, delay: 3, dmg: dmg.flareSpread, follow: p.id, tag: 'spread' });
        } });
    };

    // --- the Ember Heart (the wall) ------------------------------------------------------------------
    // The Heart opens in his chest and he is sealed (fight.js raiseWall). Scorch marks bloom at the three crater spots one by one;
    // the last one marks the island the floor-wide fire leaves standing. Two waves (Hard: three), each smaller.
    const heartWave = (k) => {
      const order = f.shuffle([0, 1, 2]), hole = [H ? 215 : 235, H ? 195 : 215, 180][k] || 195;
      const last = SPOTS[order[2]], d = f.ct(9);
      f.cast('Heart Burn', d, 'heart');
      const step = f.ct(2.0);
      order.forEach((i, j) => f.afterKeep(1.2 + j * step, () => f.aoe({ kind: 'circle', x: Math.round(SPOTS[i][0]), y: Math.round(SPOTS[i][1]), r: SCORCH_R }, f.ct(2.6), dmg.scorch, { tag: 'scorch' })));
      // the fire shows once the last mark has bloomed: everything but the island
      f.afterKeep(1.2 + 2 * step + 0.2, () => {
        f.island = { x: last[0], y: last[1], r: hole };
        f.aoe({ kind: 'donut', x: Math.round(last[0]), y: Math.round(last[1]), r: 1600, r2: hole }, d - (1.2 + 2 * step + 0.2), dmg.burn, { tag: 'heartburn' });
      });
      f.afterKeep(d + 0.1, () => { f.island = null; });
    };
    const heartRun = () => {
      B.lockFacing = false;
      f.emit({ t: 'roomev', k: 'heart', dur: 60 });
      // the waves and their names are laid out now, so the upcoming-moves feed shows them
      const waves = H ? 3 : 2, gap = f.ct(9) + 3.5;
      for (let k = 0; k < waves; k++) f.afterKeep(3 + k * gap, () => heartWave(k), 'Heart Burn');
      // meanwhile the tank and the healer have work: a Roar as the last fire lands (Hard: the Flare between the waves), then the Heart
      // closes in the same breath as a buster (named in the same tick, so the feed never runs short; the next act is laid out at once)
      if (H) f.afterKeep(3 + 2 * gap - 1.5, heartFlare, 'Heart Flare');
      const lastLands = 3 + (waves - 1) * gap + f.ct(9);
      f.afterKeep(lastLands - 3, roar, "Tyrant's Roar");
      f.afterKeep(lastLands + 1, claws, 'Rending Claws');
      f.afterKeep(lastLands + 1, () => f.wallDown(), 'The Heart Closes');
    };

    // --- the acts ------------------------------------------------------------------------------------
    const groundStart = () => { grounded(); };
    // I. Ground
    const ground = from => f.course({
      until: 0.75, push: true, onStart: groundStart,
      sets: mix([S([4, roar, "Tyrant's Roar"]), S([12, () => breath(), 'Ember Breath']), S([14, () => tailLash(), 'Tail Lash'])], [
        S([13, claws, 'Rending Claws']),
        S([12, magma, 'Magma Burst']),
        S([12, () => { claws(); f.afterKeep(f.ct(4.4) + 0.6, () => tailLash()); }, 'Rending Claws']),
        H && S([9.5, cinderRain, 'Cinder Rain']),
        S([13, feast, 'Cinder Feast']),
      ].filter(Boolean), [
        S([12, roar, "Tyrant's Roar"]),
        S([12, () => { breath(); f.afterKeep(f.ct(4.2) + 0.4, () => breath()); }, 'Ember Breath']),
        S([13, magma, 'Magma Burst']),
      ]),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, () => breath(), 'Ember Breath']],
      next: flight1,
    }, from);

    // II. First Flight
    const flight1 = from => f.course({
      until: 0.5, push: true, onStart: groundStart,
      sets: [
        S([4, takeFlight, 'Take Flight'], [3, () => dive(), 'Dragonfall']),
        S([9, claws, 'Rending Claws']),
        S([12, () => breath(), 'Ember Breath']),
        S([13, takeFlight, 'Take Flight'], [3, () => dive(), 'Dragonfall']),
        S([9, magma, 'Magma Burst']),
        S([12, () => tailLash(), 'Tail Lash']),
        H && S([9.5, cinderRain, 'Cinder Rain']),
        S([12, takeFlight, 'Take Flight'], [3, () => twinPass(), 'Twin Pass']),
        S([13, feast, 'Cinder Feast']),
        S([12, roar, "Tyrant's Roar"]),
        S([12, () => { claws(); f.afterKeep(f.ct(4.4) + 0.6, () => tailLash()); }, 'Rending Claws']),
      ].filter(Boolean),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, takeFlight, 'Take Flight'], [3, () => dive(), 'Dragonfall']],
      next: roosted,
    }, from);

    // The Roost, then III. Ground, Scorched
    const roosted = from => f.course({
      until: 0.24, push: true, onStart: groundStart,
      sets: mix([S([2, roost, 'The Roost']), S([15.5, boils, 'Crater Boils']), S([9, claws, 'Rending Claws'])], [
        S([12, twinBreath, 'Twin Breath']),
        S([13, magma, 'Magma Burst']),
        H && S([10, heartFlare, 'Heart Flare']),
        S([12, feast, 'Cinder Feast']),
        S([12, () => { claws(); f.afterKeep(f.ct(4.4) + 0.6, () => tailLash()); }, 'Rending Claws']),
        H && S([9.5, cinderRain, 'Cinder Rain']),
      ].filter(Boolean), [
        S([12, roar, "Tyrant's Roar"]),
        S([13, () => { breath(); f.afterKeep(f.ct(4.2) + 0.4, () => breath()); }, 'Ember Breath']),
        S([12, magma, 'Magma Burst']),
        S([13, () => tailLash(), 'Tail Lash']),
      ]),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, twinBreath, 'Twin Breath']],
      next: flight2,
    }, from);

    // IV. Final Flight: the dives come close together, and at the last gate the Ember Heart opens
    const flight2 = from => f.course({
      until: 0.1, push: true, onStart: groundStart,
      wall: { label: 'Ember Heart', run: heartRun, until: 'resolved', timeout: 70 },
      sets: [
        S([4, takeFlight, 'Take Flight'], [3, () => dive(), 'Dragonfall']),
        S([8, claws, 'Rending Claws']),
        S([11, takeFlight, 'Take Flight'], [3, () => twinPass(), 'Twin Pass']),
        S([9, H ? heartFlare : magma, H ? 'Heart Flare' : 'Magma Burst']),
        S([12, roar, "Tyrant's Roar"]),
        S([11, takeFlight, 'Take Flight'], [3, () => dive(), 'Dragonfall']),
        S([9, () => tailLash(), 'Tail Lash'], [8, twinBreath, 'Twin Breath']),
        S([11, takeFlight, 'Take Flight'], [3, () => twinPass(), 'Twin Pass']),
        S([13, feast, 'Cinder Feast']),
        S([12, claws, 'Rending Claws']),
      ],
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, twinBreath, 'Twin Breath']],
      next: lastEmber,
    }, from);

    // Last Ember: the Heart has closed and he is nearly done
    const lastEmber = from => f.course({
      onStart: groundStart,
      sets: [
        S([3, roar, "Tyrant's Roar"]),
        S([11, twinBreath, 'Twin Breath']),
        S([11, claws, 'Rending Claws']),
        S([11, magma, 'Magma Burst']),
        S([11, () => tailLash(), 'Tail Lash']),
      ],
      closing: [[10, roar, "Tyrant's Roar"], [10, twinBreath, 'Twin Breath'], [10, claws, 'Rending Claws']],
      ramp: 0.08,
    }, from);

    ground(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.dive())
    f.moves = { roar, claws, tailLash, breath, twinBreath, magma, feast, takeFlight, dive, twinPass, roost, boils, cinderRain, heartFlare, heartWave, heartRun };
  },
};

if (typeof module !== 'undefined') module.exports = { WYRM };
