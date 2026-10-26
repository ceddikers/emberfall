// Boss V: Vhalgrath, the Ember Wyrm, Tyrant of the Cinder Peaks — "The Crater". The hunter in the air.
// First boss of set 2 (the wild realm beyond the road, docs/plans/2026-10-set-2-bosses.md). The fight alternates ground and
// flight, and the question is always: where is it going to land? He walks after his tank on the ground; in the air he is
// out of reach, and a faint trail of embers draws the line he will dive along four seconds ahead. The dive lands on one of
// three crater spots (picked at random each time: the red circle on the floor is the only way to know), and everything on
// the line or under the landing takes it. Every breath leaves molten ground for a dozen seconds (fourteen on Hard).
//   Act I, Ground (100% → 75%): Tyrant's Roar, Rending Claws (tankbuster), Pounce (the tank's own: a ring on whoever holds him, he
//     springs into it and the floor there burns for a few seconds; it rides between the claws), Ember Breath (a cone at a random hero; molten
//     floor for 12 s, 14 on Hard), Tail Lash (the cone behind him), Magma Burst (spread; each puddle stays), Cinder Feast (stack),
//     and one early flight (a plain Dragonfall, by about 70 s on Normal) so the fight's question is asked early.
//   Act II, First Flight (75% → 50%): Take Flight, then Dragonfall (the dive) between ground stretches; Twin Pass (two lines
//     at once, crossing, landing on the second close behind the first, both drawn from the start); Searing Descent (a
//     Dragonfall that breathes a fan of three cones as it lands: leave the ring, then move with the sweep); Talon Dive (he dives at whoever holds him: the line runs to
//     the tank's feet, and where he lands the ground rings out as the Aftershock, quiet only in the middle by his feet).
//   The Roost (the seam, opens Act III): he perches on the rim for 12 s and shakes his burning scales loose on random
//     tiles while two ember whelps harry the party (any left alive when he drops detonate). Then the Crater Boils: the
//     outer ring of the floor turns molten for the rest of the fight.
//   Act III, Ground, Scorched (50% → 24%): the same moves in a smaller room, paired (Twin Breath, claws into tail).
//   Act IV, Final Flight (24% → 10%): dives close together. At 10% the Ember Heart opens: a WALL (fight.js). He cannot be
//     hurt until the Heart Burn has passed. Scorch marks bloom at the three crater spots one after another; the last one
//     marks the island that the floor-wide fire will leave standing (nothing is painted on it: it is the hole in the red).
//   Last Ember (10% → dead): the burn, until he falls or Ashfall comes. Cinder Run is its own: three landings (Hard: four) in
//     a row, every line and ring drawn at once; the middle of the crater is on none of them. Then the sets run close together
//     (Roar, a Talon Dive and its Aftershock, Twin Breath, claws into tail); Hard draws their order.
// Acts II to IV use PUSH: a party that reaches a gate early cuts the rest of the act and moves on.
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, hits about 1.1x Normal's (hardDmg 1.7 on a lower table; the buster a touch lower, 1.07x), and:
//   Pounce springs twice: a second, quicker spring a beat after the first, at wherever the tank has gone (ring and pool a little bigger).
//   Wingbeat: each dive's wings shove everyone near the flight line away from it (into a wall, a slam).
//   Cinder Rain: embers fall across the crater; each leaves a small molten pool.
//   Heart Flare: a stack on a random hero, then a spread right after it.
//   Aftershock rings twice (the second ring closes in on his feet) and Cinder Run adds a fourth landing.
// Hard also shuffles the order of its middle sets in every act each pull (mix() keeps the tank and healer beats even), draws whether
// the Flare falls after the first or the second burn, adds a third Heart Burn, and the outer ring boils further in.

// Hard's damage multiplier (fight.js default 1.25). Hard's table is a notch below Normal's on the moves both have, so with 1.7 each
// of those hits lands about 1.1x Normal's. The floor fire, the whelps, the autos and Hard's own moves are scaled back by 1.25 / HD
// (KEEP below) so they hit as they did before this went up. The Hard buster is set a little lower (about 1.07x) because the tank has little more health than it hits for.
const HD = 1.7;
const WYRM = {
  id: 'wyrm', name: 'Vhalgrath', title: 'Tyrant of the Cinder Peaks',
  hp: { normal: 4800000, hard: 5430000 },
  hardDmg: HD,
  autoDmg: { normal: 2300, hard: Math.round(2100 * 1.25 / HD) },
  enrage: { normal: 582, hard: 622 },   // the cast starts here and lands 8 s later (9:50 / 10:30)
  enrageName: 'Ashfall',
  vuln: 0.5,
  spawn: { x: 0, y: -60 },
  arena: { theme: 'crater' },
  gates: [0.75, 0.5, 0.24, { f: 0.1, wall: 1 }, { f: 0.03, wall: 1 }],   // where the acts change (ticks on the boss bar; fight.js course)
  push: true,                                       // reach a gate early and he moves on (fight.js course: push)

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      roar: H ? 12100 : 15900, buster: H ? 17000 : 23500, tail: H ? 17000 : 21800, breath: H ? 18700 : 23400, molten: H ? 2700 : 2500, puddle: H ? 2200 : 2100,
      magma: H ? 11400 : 14700, feast: H ? 32100 : 42000, gust: H ? 3600 : 3500, pass: H ? 14500 : 19200, land: H ? 20600 : 25800, wing: H ? 4600 : 5400, slam: H ? 6600 : 7500,
      pounce: H ? 7600 : 10000, pounce2: H ? 5400 : 0, scale: H ? 12700 : 16500, boom: H ? 15100 : 18000, boil: H ? 10900 : 14300, scorch: H ? 15700 : 20300, burn: H ? 24800 : 27800, heart: H ? 9100 : 10500,
      rain: H ? 9100 : 10500, quake: H ? 11800 : 14000, flareStack: H ? 31000 : 30000, flareSpread: H ? 12500 : 13200, whelpHp: 30000, whelpBite: H ? 2300 : 2300, last: H ? 13400 : 14300,
    };
    const K = H ? 1.0 : 1.15;           // tuning: every hit but the floor fire and the whelps, together
    const KEEP = ['molten', 'puddle', 'whelpBite', 'gust', 'wing', 'slam', 'rain', 'flareStack', 'flareSpread'];   // (floor fire, whelps and Hard's own moves keep what they hit before hardDmg went up)
    for (const k in dmg) if (k !== 'molten' && k !== 'puddle' && k !== 'whelpHp' && k !== 'whelpBite') dmg[k] = Math.round(dmg[k] * K);
    if (H) for (const k of KEEP) dmg[k] = Math.round(dmg[k] * 1.25 / HD);
    const S = (...steps) => steps.filter(Boolean);
    const R = 560;                       // the crater floor's radius (shapes.js)
    const SPOT_R = 260;                  // the three crater spots sit this far from the middle: south, north-west, north-east
    const SPOTS = [[0, SPOT_R], [-SPOT_R * 0.866, -SPOT_R * 0.5], [SPOT_R * 0.866, -SPOT_R * 0.5]];
    const PATH_W = 170, LAND_R = 225, SCORCH_R = 105;
    let rimR2 = 0;                       // the molten ring's inner edge once the Crater Boils (0: not yet)
    // Hard draws the order of an act's middle sets fresh each pull (the opening and the last sets stay put). A draw is only taken
    // if it keeps the rhythm: the tank is never more than 26 s from a beat (Rending Claws, Talon Dive, Tail Lash, Pounce), two Rending
    // Claws are never closer than 12 s, the healer is never more than 36 s from work (a buster or a real hit on the whole party)
    // and never more than 75 s from a hit on the whole party (Twin Breath and the Aftershock are avoidable, so they do not count).
    // The act's start counts as a beat of every kind. Normal plays the written order, which is written to pass the same check
    // (f.moves.orderOk, run by the scratch tools; an act with a wall after it also ends within endMax of a tank beat); if no draw passes, Hard falls back to the written order too.
    const TANK_B = new Set(['Rending Claws', 'Talon Dive', 'Tail Lash', 'Pounce']);
    const RAID_B = new Set(["Tyrant's Roar", 'Cinder Feast', 'Magma Burst', 'Heart Flare', 'Cinder Rain', 'Crater Boils', 'The Roost']);
    const orderOk = (sets, endMax = 26) => {
      let t = 0, lastT = 0, lastH = 0, lastR = 0, lastC = -99;
      for (const set of sets) for (const [dt, , name] of set) {
        t += dt;
        if (name === 'Rending Claws') { if (t - lastC < 12) return false; lastC = t; }
        if (TANK_B.has(name)) { if (t - lastT > 26) return false; lastT = t; }
        if (name === 'Rending Claws' || RAID_B.has(name)) { if (t - lastH > 36) return false; lastH = t; }
        if (RAID_B.has(name)) { if (t - lastR > 75) return false; lastR = t; }
      }
      return t - lastT <= endMax && t - lastH <= 38;   // (and the act does not end on a long wait)
    };
    const mix = (head, mid, tail, endMax) => {
      if (!H) return [...head, ...mid, ...tail];
      for (let i = 0; i < 80; i++) { const c = [...head, ...f.shuffle(mid), ...tail]; if (orderOk(c, endMax)) return c; }
      return [...head, ...mid, ...tail];
    };

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
    // Pounce (the tank's own, on the ground): he coils and springs at whoever holds him. A ring is drawn on the tank from the start of the
    // cast and follows them until 1.3 s before the spring, then it stays; he comes down in it, and where he lands the floor is molten for a
    // few seconds. The tank decides where he lands: stay and take it, or step out and he comes down on empty floor (then he has to be
    // walked back out of his own fire). Lighter than Rending Claws (about 0.45x), so it comes between the claws. Hard: the same, with a
    // second, quicker spring a beat later at wherever the tank has gone (no second cast bar, like Twin Breath's second cone).
    const POUNCE_R = H ? 135 : 125, POUNCE_POOL = H ? 6 : 5;
    const pounce = (second = false, single = false) => {
      const t = f.tank(); if (!t) return;
      const d = second ? f.ct(2.0) : f.ct(3.6), LOCK = second ? 1.2 : 1.3;
      if (!second) f.cast('Pounce', d, 'dive');
      const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: t.x, y: t.y, r: POUNCE_R }, delay: d, dmg: second ? dmg.pounce2 : dmg.pounce, follow: t.id, lockAt: LOCK, tag: 'pounce', ddown: true,
        onResolve: () => {
          const pd = f.puddle(Math.round(m.shape.x), Math.round(m.shape.y), POUNCE_R, POUNCE_POOL, dmg.puddle, 1, 'ember', { ddown: true });
          for (const o of f.alive()) pd.last[o.id] = f.t + 0.5;   // (a second and a half to step off it before it first burns)
        } });
      // the spring: he is off the ground for the last half second and comes down in the ring
      const SPRING = 0.55;
      f.afterKeep(d - SPRING, () => {
        const dx = m.shape.x - B.x, dy = m.shape.y - B.y, dist = Math.hypot(dx, dy);
        B.untargetable = true; B.lockFacing = true; B.facing = Math.atan2(dy, dx);
        B.moveTo = { x: m.shape.x, y: m.shape.y, speed: Math.max(300, dist / SPRING) };
      });
      f.afterKeep(d + 0.03, () => land([m.shape.x, m.shape.y], B.facing));
      if (H && !second && !single) f.afterKeep(d + 0.3, () => pounce(true));
    };
    // Tail Lash: the cone behind him (he faces his tank, so it sweeps the other side of him)
    const tailLash = (delay = f.ct(3.6)) => {
      B.lockFacing = true;
      f.cast('Tail Lash', delay, 'tail');
      f.aoe({ kind: 'cone', x: B.x, y: B.y, r: 380, arc: 2.5, angle: B.facing + Math.PI }, delay, dmg.tail, { tag: 'taillash' });
      hold(delay);
      f.afterKeep(delay + 0.1, () => { B.lockFacing = false; });
    };
    // Ember Breath: a cone at a random hero, following them until a second before it goes. Where it lands, the floor is molten for 12 s (14 on Hard).
    const breath = (target, delay = f.ct(4.2), cast = true) => {
      target = target || nonTank(); if (!target) return null;
      if (cast) f.cast('Ember Breath', delay, 'breath');
      const m = f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 760, arc: 0.95, angle: Math.atan2(target.y - B.y, target.x - B.x) }, delay, dmg: dmg.breath,
        tag: 'breath', ddown: true, aimFromBoss: target.id, lockAt: 1.1,
        onResolve: () => {
          // the molten floor starts a little way out from him: the ground he stands on stays clear
          const s = m.shape, c = Math.cos(s.angle), sn = Math.sin(s.angle);
          const z = f.zone({ shape: { kind: 'cone', x: s.x + c * 190, y: s.y + sn * 190, r: s.r - 190, arc: s.arc, angle: s.angle }, dur: H ? 14 : 12, delay: 0, effect: 'burn', dmg: dmg.molten, tag: 'lava', ddown: true });
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
        f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.magma, follow: p.id, tag: 'spread', ddown: true,
          onResolve: () => { const q = f.alive().find(z => z.id === p.id); if (q) { const pd = f.puddle(q.x, q.y, 80, H ? 11 : 9, dmg.puddle, 1, 'ember', { ddown: true }); for (const o of f.alive()) pd.last[o.id] = f.t; } } });   // (a second to step out of it before it first burns)
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
    const land = (L, ang, hop) => {
      B.untargetable = !!hop; B.lockFacing = !!hop; B.moveTo = null;   // (hop: Cinder Run touches down and is off again)
      B.x = L[0]; B.y = L[1]; B.facing = ang; B.autoAt = f.t + 3;
      f.anim('land', 1);
      f.emit({ t: 'propfx', k: 'slam', x: Math.round(L[0]), y: Math.round(L[1]), a: +ang.toFixed(2), boss: 1 });
    };
    // Wingbeat (Hard): as he rushes the line, his wings push everyone near it away from it. The push comes WING s before the
    // landing (it used to be 0.6 s: a hero thrown into the ring had no time to step out), so there is time to read where
    // the push put you; Searing Descent lays its cones after it. (No cast bar of its own: the dive's bar stays up and the telegraph carries it.)
    const WING = 1.7;
    const wingbeat = (E, ang, len, delay) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      // (named for the cast frame, the sound and the journal: a bar that runs from a second before the push on through the
      // landing, so the bar never empties before the dive comes down)
      f.afterKeep(Math.max(0, delay - 1.0), () => f.emit({ t: 'bcast', name: 'Wingbeat', dur: 1.0 + WING, anim: 'wing' }));
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
      if (!opts.quiet) f.cast(opts.name || 'Dragonfall', d, 'dive');
      B.untargetable = true; B.lockFacing = true; B.facing = ang; B.moveTo = { x: E.x, y: E.y, speed: 1500 };
      const group = new Set();
      f.aoe({ kind: 'rect', x: E.x, y: E.y, angle: ang, len, w: PATH_W }, d, dmg.pass, { tag: 'divepath', group });
      f.aoe({ kind: 'circle', x: L[0], y: L[1], r: LAND_R }, d, dmg.land, { tag: 'dragonfall', group });
      if (H) wingbeat(E, ang, len, d - WING);
      const fly = 1.5;
      f.afterKeep(d - fly, () => { B.facing = ang; B.moveTo = { x: L[0], y: L[1], speed: len / fly }; });
      f.afterKeep(d + 0.03, () => land(L, ang));
      return { E, L, ang, len, d };
    };
    // Aftershock: where he comes down the ground rings out from his feet; only the middle, by him, is quiet. Hard rings once more,
    // closer in. It follows Talon Dive only (never a plain Dragonfall), so the party has a reason to come back to the boss.
    const aftershock = L => {
      const d = f.ct(2.8), ring = (r2, at, tag) => f.aoe({ kind: 'donut', x: Math.round(L[0]), y: Math.round(L[1]), r: 1400, r2 }, at, dmg.quake, { tag });
      f.cast('Aftershock', d, 'roar');
      ring(250, d, 'aftershock');
      if (H) ring(140, d + 1.6, 'aftershock');
    };
    // a point the dive can come down on: on the floor, and clear of the molten ring once the Crater Boils
    const onFloor = (x, y) => { const lim = (rimR2 || R) - 140, d = Math.hypot(x, y); return d > lim ? [x / d * lim, y / d * lim] : [x, y]; };
    // Talon Dive: he dives at whoever holds him. The line runs from the rim to where the tank stands as the cast begins (the
    // party and the tank both leave it), and when he lands the ground rings out (Aftershock).
    const talonDive = () => {
      const t = f.tank(); if (!t) return dive();
      const L = onFloor(t.x, t.y), far = SPOTS.reduce((a, q) => Math.hypot(q[0] - L[0], q[1] - L[1]) > Math.hypot(a[0] - L[0], a[1] - L[1]) ? q : a, SPOTS[0]);
      const r = dive({ land: L, from: far, name: 'Talon Dive' });
      f.afterKeep(r.d + 0.4, () => aftershock(L));
    };
    // Searing Descent: a Dragonfall that breathes as it lands. The ring comes first; then a fan of fire sweeps out from his feet,
    // one cone after another (all on the floor from a couple of seconds before the landing, the first one aimed where a random
    // hero stands then). A cone that has gone off is safe: leave the ring, then move with the sweep.
    let sweepDir = f.rng() < 0.5 ? 1 : -1;   // the sweep turns the other way each time (the first is random)
    const searingDescent = () => {
      const r = dive({ name: 'Searing Descent' }), arc = 0.8, sign = (sweepDir = -sweepDir), lead = 1.5;   // (laid after Hard's Wingbeat has pushed)
      f.afterKeep(Math.max(0.1, r.d - lead), () => {
        const tg = nonTank(); if (!tg) return;
        const base = Math.atan2(tg.y - r.L[1], tg.x - r.L[0]), first = lead + f.ct(1.3), step = f.ct(1.15);
        for (let i = 0; i < 3; i++) {
          const angle = base + sign * (i - 1) * arc;
          f.aoe({ kind: 'cone', x: Math.round(r.L[0]), y: Math.round(r.L[1]), r: 760, arc, angle }, first + i * step, Math.round(dmg.breath * 0.5), { tag: 'breath' });
        }
      });
    };
    // two lane segments (a to b, c to d) that cross: the point, or null
    const crossAt = (a, b, c, d) => {
      const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx;
      if (Math.abs(den) < 1e-6) return null;
      const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x + t * rx, y: a.y + t * ry } : null;
    };
    // Twin Pass: two lines at once. He sweeps across the crater along the first without landing, then comes round on the second;
    // the two lines cross over the floor, and the second follows close on the first.
    const twinPass = () => {
      const d1 = f.ct(4.4), gap = f.ct(2.6), t2 = d1 + gap, fly = 1.5;
      let L1, P1, L2, P2;
      for (let tries = 0; tries < 24; tries++) {
        L1 = f.pick(SPOTS); P1 = f.pick(SPOTS.filter(s => s !== L1));
        L2 = f.pick(SPOTS.filter(s => s !== L1)); P2 = f.pick(SPOTS.filter(s => s !== L2));
        const A = edgeOf(P1), a1 = Math.atan2(L1[1] - A.y, L1[0] - A.x), l1 = Math.hypot(L1[0] - A.x, L1[1] - A.y) + R * 0.7, C2 = edgeOf(P2);
        const x = crossAt(A, { x: A.x + Math.cos(a1) * l1, y: A.y + Math.sin(a1) * l1 }, C2, { x: L2[0], y: L2[1] });
        if (x && Math.hypot(x.x, x.y) < R - 140) break;
      }
      f.cast('Twin Pass', d1, 'dive');
      // the first line runs from the edge by P1 through the spot L1 and out the far side
      const E1 = edgeOf(P1), ang1 = Math.atan2(L1[1] - E1.y, L1[0] - E1.x), len1 = Math.hypot(L1[0] - E1.x, L1[1] - E1.y) + R * 0.7;
      B.untargetable = true; B.lockFacing = true; B.facing = ang1; B.moveTo = { x: E1.x, y: E1.y, speed: 1500 };
      f.aoe({ kind: 'rect', x: E1.x, y: E1.y, angle: ang1, len: len1, w: PATH_W }, d1, dmg.pass, { tag: 'divepath' });
      if (H) wingbeat(E1, ang1, len1, d1 - WING);
      f.afterKeep(d1 - fly, () => { B.moveTo = { x: E1.x + Math.cos(ang1) * len1, y: E1.y + Math.sin(ang1) * len1, speed: len1 / fly }; });
      // ... and the second, which lands a few seconds after the first has passed, is on the floor from the start too
      const E2 = edgeOf(P2), ang2 = Math.atan2(L2[1] - E2.y, L2[0] - E2.x), len2 = Math.hypot(L2[0] - E2.x, L2[1] - E2.y), group = new Set();
      f.aoe({ kind: 'rect', x: E2.x, y: E2.y, angle: ang2, len: len2, w: PATH_W }, t2, dmg.pass, { tag: 'divepath2', group });
      f.aoe({ kind: 'circle', x: L2[0], y: L2[1], r: LAND_R }, t2, dmg.land, { tag: 'dragonfall', group });
      if (H) wingbeat(E2, ang2, len2, t2 - 1.5);   // (after the first pass has fired, and 1.5 s before the landing)
      f.afterKeep(d1 + 0.02, () => { f.cast('Dragonfall', gap - 0.02, 'dive'); f.afterKeep(0.05, () => { B.facing = ang2; B.moveTo = { x: E2.x, y: E2.y, speed: 2400 }; }); });   // (the second cast starts as the first ends)
      f.afterKeep(t2 - fly, () => { B.moveTo = { x: L2[0], y: L2[1], speed: len2 / fly }; });
      f.afterKeep(t2 + 0.03, () => land(L2, ang2));
    };
    // Cinder Run (the finale's own): he skims the crater and comes down on each of the three spots in turn (Hard: a fourth), every
    // line and ring drawn from the start. The middle of the crater is on none of them.
    const cinderRun = () => {
      const order = f.shuffle(SPOTS);
      if (H) order.push(f.pick(SPOTS.filter(s => s !== order[2])));
      const d1 = f.ct(4.4), gap = f.ct(2.6), P = f.pick(SPOTS.filter(s => s !== order[0])), E = edgeOf(P);
      f.cast('Cinder Run', d1, 'dive');
      B.untargetable = true; B.lockFacing = true; B.moveTo = { x: E.x, y: E.y, speed: 1500 };
      let from = E;
      order.forEach((L, i) => {
        const at = d1 + i * gap, ang = Math.atan2(L[1] - from.y, L[0] - from.x), len = Math.hypot(L[0] - from.x, L[1] - from.y), group = new Set(), fl = i ? gap - 0.4 : 1.5, src = from;
        f.aoe({ kind: 'rect', x: src.x, y: src.y, angle: ang, len, w: PATH_W }, at, dmg.pass, { tag: i ? 'divepath2' : 'divepath', group });
        f.aoe({ kind: 'circle', x: L[0], y: L[1], r: LAND_R }, at, dmg.land, { tag: 'dragonfall', group });
        if (H && !i) wingbeat(src, ang, len, at - WING);
        f.afterKeep(at - fl, () => { B.facing = ang; B.moveTo = { x: L[0], y: L[1], speed: len / fl }; });
        f.afterKeep(at + 0.03, () => land(L, ang, i < order.length - 1));
        from = { x: L[0], y: L[1] };
      });
      return d1 + (order.length - 1) * gap + 0.8;   // (when the last landing has gone off)
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
        f.afterKeep(i * 0.45, () => f.aoe({ kind: 'circle', x, y, r: 75 }, d, dmg.rain, { tag: 'cinder', ddown: true, onResolve: () => { const pd = f.puddle(x, y, 70, 9, dmg.puddle, 1, 'ember', { ddown: true }); for (const o of f.alive()) pd.last[o.id] = f.t; } }));
      }
    };
    // Heart Flare: a stack on a random hero, and the moment it lands a spread on everyone
    const heartFlare = () => {
      const pool = f.alive().length > 1 ? f.nonTanks() : f.alive();
      const t = pool.length ? f.pick(pool) : null; if (!t) return;
      const d = f.ct(4.6), n = f.alive().length;
      f.cast('Heart Flare', d, 'flare');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: t.x, y: t.y, r: 112 }, delay: d, dmg: dmg.flareStack * Math.min(n, 4) / 4, follow: t.id, need: n, tag: 'stack',
        onResolve: () => {
          for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 118 }, delay: 2.6, dmg: dmg.flareSpread, follow: p.id, tag: 'spread' });
        } });
    };

    // --- the Ember Heart (the wall) ------------------------------------------------------------------
    // The Heart opens in his chest and he is sealed (fight.js raiseWall). Scorch marks bloom at the three crater spots one by one;
    // the last one marks the island the floor-wide fire leaves standing. Two waves (Hard: three), each smaller.
    const heartWave = (k) => {
      const order = f.shuffle([0, 1, 2]), hole = [H ? 195 : 235, H ? 175 : 215, H ? 160 : 180][k] || 195;
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
      // the waves and their names are laid out now, so the upcoming-moves feed shows them. The tank's beat sits in the quiet after
      // a burn (the cast is over before the next burn begins). Hard: the Flare fills the quiet after the first or the second burn
      // (drawn each pull) with a buster after its spread, and the burn after it only starts more than five seconds after the
      // spread has gone off.
      const waves = H ? 3 : 2, cl = f.ct(4.4), burn = f.ct(9), fl = f.ct(4.6);
      const flareSlot = H ? (f.rng() < 0.5 ? 0 : 1) : -1;
      const starts = [3], clawsAt = [];
      let flareAt = 0, pounceAt = 0;
      for (let k = 0; k < waves - 1; k++) {
        const lands = starts[k] + burn;
        if (k === flareSlot) { flareAt = lands + 4.5; pounceAt = lands + 0.35; clawsAt.push(flareAt + fl + 2.6 + 0.4); starts.push(flareAt + fl + 2.6 + 5.5); }
        else { clawsAt.push(lands + 0.4); starts.push(lands + 0.4 + cl + 0.3); }
      }
      starts.forEach((t, k) => f.afterKeep(t, () => heartWave(k), 'Heart Burn'));
      clawsAt.forEach(t => f.afterKeep(t, claws, 'Rending Claws'));
      if (H) { f.afterKeep(pounceAt, () => pounce(false, true), 'Pounce'); f.afterKeep(flareAt, heartFlare, 'Heart Flare'); }
      // then a Roar as the last fire lands, and the Heart closes in the same breath as a buster, once the Roar has been cast (named in
      // the same tick, so the feed never runs short; the next act is laid out at once)
      const lastLands = starts[waves - 1] + burn, end = Math.max(lastLands + 1, lastLands - 3 + f.ct(4.5) + 0.1);
      f.afterKeep(lastLands - 3, roar, "Tyrant's Roar");
      f.afterKeep(end, claws, 'Rending Claws');
      f.afterKeep(end, () => f.wallDown(), 'The Heart Closes');
    };

    // --- the acts ------------------------------------------------------------------------------------
    // Every act opens on a beat for the tank and holds one about every 25 s; each flight rides on a beat (claws, tail or Talon Dive)
    // so a Hard shuffle of the middle sets cannot open a long gap (mix() checks each draw).
    const groundStart = () => { grounded(); };
    const PD = 6.5;                      // a Pounce comes this long after the claws that open its set (the claws' bar has ended; the next step still has its 12 s)
    const clawsTail = () => { claws(); f.afterKeep(f.ct(4.4) + 0.6, () => tailLash()); };
    const doubleBreath = () => { breath(); f.afterKeep(f.ct(4.2) + 0.4, () => breath()); };
    // I. Ground. One early flight (a plain Dragonfall) so the fight's question is asked by about 70 s (Normal's written order).
    const ground = from => f.course({
      until: 0.75, push: true, onStart: groundStart,
      sets: mix([S([4, roar, "Tyrant's Roar"]), S([10, claws, 'Rending Claws'], [PD, pounce, 'Pounce']), S([12 - PD, () => breath(), 'Ember Breath'])], [
        S([12, clawsTail, 'Rending Claws'], [12, magma, 'Magma Burst']),
        S([12, claws, 'Rending Claws'], [10, takeFlight, 'Take Flight'], [3, () => dive(), 'Dragonfall']),
        H ? S([12, claws, 'Rending Claws'], [9.5, cinderRain, 'Cinder Rain']) : S([12, claws, 'Rending Claws'], [PD, pounce, 'Pounce'], [13 - PD, feast, 'Cinder Feast']),
        S([12, claws, 'Rending Claws'], [PD, pounce, 'Pounce'], [12 - PD, roar, "Tyrant's Roar"]),
      ], []),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, () => breath(), 'Ember Breath'], [10, () => tailLash(), 'Tail Lash']],
      next: flight1,
    }, from);

    // II. First Flight: opens on a Talon Dive (the tank's own dive) and a Roar
    const flight1 = from => f.course({
      until: 0.5, push: true, onStart: groundStart,
      sets: mix([S([4, takeFlight, 'Take Flight'], [3, () => talonDive(), 'Talon Dive']), S([12, roar, "Tyrant's Roar"])], [
        S([12, claws, 'Rending Claws'], [10, takeFlight, 'Take Flight'], [3, () => searingDescent(), 'Searing Descent']),
        S([12, clawsTail, 'Rending Claws'], H ? [12, cinderRain, 'Cinder Rain'] : [12, magma, 'Magma Burst']),
        S([12, claws, 'Rending Claws'], [10, takeFlight, 'Take Flight'], [3, () => twinPass(), 'Twin Pass']),
        S([12, claws, 'Rending Claws'], [PD, pounce, 'Pounce'], [13 - PD, feast, 'Cinder Feast']),
      ], [
        S([12, () => tailLash(), 'Tail Lash']),   // (the tank's beat before the Roost, where the gap would otherwise run long)
      ]),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, takeFlight, 'Take Flight'], [3, () => dive(), 'Dragonfall']],
      next: roosted,
    }, from);

    // The Roost, then III. Ground, Scorched. The buster comes right as he lands, then the Crater Boils.
    const roosted = from => f.course({
      until: 0.24, push: true, onStart: groundStart,
      sets: mix([S([2, roost, 'The Roost']), S([15.5, claws, 'Rending Claws']), S([8, boils, 'Crater Boils'])], [
        S([12, clawsTail, 'Rending Claws'], [12, twinBreath, 'Twin Breath']),
        H ? S([12, claws, 'Rending Claws'], [9.5, cinderRain, 'Cinder Rain']) : S([12, claws, 'Rending Claws'], [PD, pounce, 'Pounce'], [13 - PD, magma, 'Magma Burst']),
        S([12, claws, 'Rending Claws'], [PD, pounce, 'Pounce'], [12 - PD, feast, 'Cinder Feast']),
        S([12, claws, 'Rending Claws'], [PD, pounce, 'Pounce'], [12 - PD, roar, "Tyrant's Roar"]),
      ], [
        S([5, pounce, 'Pounce'], [8, doubleBreath, 'Ember Breath']),
      ]),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, twinBreath, 'Twin Breath'], [10, () => tailLash(), 'Tail Lash']],
      next: flight2,
    }, from);

    // IV. Final Flight: the dives come close together, and at the last gate the Ember Heart opens
    const flight2 = from => f.course({
      until: 0.1, push: true, onStart: groundStart,
      wall: { label: 'Ember Heart', run: heartRun, until: 'resolved', timeout: 70 },
      sets: mix([S([4, takeFlight, 'Take Flight'], [3, () => talonDive(), 'Talon Dive'])], [
        S([12, claws, 'Rending Claws'], [10, takeFlight, 'Take Flight'], [3, () => searingDescent(), 'Searing Descent']),
        H ? S([12, claws, 'Rending Claws'], [11, heartFlare, 'Heart Flare']) : S([12, claws, 'Rending Claws'], [PD, pounce, 'Pounce'], [11 - PD, magma, 'Magma Burst']),
        S([12, claws, 'Rending Claws'], [10, takeFlight, 'Take Flight'], [3, () => twinPass(), 'Twin Pass']),
        S([9, takeFlight, 'Take Flight'], [3, () => talonDive(), 'Talon Dive'], [9, roar, "Tyrant's Roar"]),
      ], []),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, twinBreath, 'Twin Breath'], [10, () => tailLash(), 'Tail Lash']],
      next: lastEmber,
    }, from);

    // Last Ember (10% to 3%): the Heart has closed (its Roar and buster already fell) and the sets run close together: Roar, a dive at
    // the tank with the Aftershock, a dive that breathes, Twin Breath, claws into tail (Hard draws their order). At 3% he seals once
    // more and flies the Cinder Run, three landings (Hard: four) with every line and ring on the floor at once: the fight's whole
    // question in one read. When the last landing has gone off the seal opens and the last of him is left to burn down.
    const lastEmber = from => f.course({
      until: 0.03, push: true, onStart: groundStart,
      wall: { label: 'Last Ember', run: finale, until: 'resolved', timeout: 35 },
      sets: mix([S([0.01, null, 'Rending Claws'])], [
        S([8, roar, "Tyrant's Roar"]),
        S([8, takeFlight, 'Take Flight'], [3, () => talonDive(), 'Talon Dive']),
        S([8, twinBreath, 'Twin Breath']),
        S([12, clawsTail, 'Rending Claws']),
      ], [], 9),
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, twinBreath, 'Twin Breath']],
      ramp: 0.08,
      next: lastStand,
    }, from);
    const finale = () => {
      B.lockFacing = false;
      f.afterKeep(0.3, takeFlight, 'Take Flight');
      // (the last of him is laid out now, so the upcoming-moves feed never runs short: a buster and Twin Breath once the seal has opened)
      const at = 0.3 + f.ct(2.4) + 0.6, run = 4.4 + 2 * 2.6 + (H ? 2.6 : 0);
      f.afterKeep(at, () => { const end = cinderRun(); f.afterKeep(end, () => f.wallDown(), 'The Last Ember Falls'); }, 'Cinder Run');
      f.afterKeep(at + f.ct(run) + 5, claws, 'Rending Claws');
      f.afterKeep(at + f.ct(run) + 15, twinBreath, 'Twin Breath');
    };
    // the last of him: the buster and Twin Breath were laid by the finale; then the slow-party passes if the fight is not over
    const lastStand = from => f.course({
      onStart: groundStart,
      sets: [S([8, null])],
      closing: [[10, roar, "Tyrant's Roar"], [10, claws, 'Rending Claws'], [10, twinBreath, 'Twin Breath']],
      ramp: 0.08,
    }, from);

    ground(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.dive())
    f.moves = { roar, claws, pounce, tailLash, breath, twinBreath, magma, feast, takeFlight, dive, talonDive, aftershock, cinderRun, twinPass, searingDescent, roost, boils, cinderRain, heartFlare, heartWave, heartRun, orderOk };
  },
};

if (typeof module !== 'undefined') module.exports = { WYRM };
