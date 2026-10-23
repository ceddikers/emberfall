// Boss VI: Hrimgar, the Frost Titan, Warden of the White Reach — "The White Reach". The slow giant, and the ground itself.
// Second boss of set 2 (the wild realm beyond the road, docs/plans/2026-10-set-2-bosses.md). The question is always: what will
// the floor do? The plateau is a mosaic of twenty ice sheets (a 5 x 4 grid of 200-wide squares, shapes.js ARENA_DEFS.titan).
// Where Hrimgar strikes, the sheets crack: the cracked sheet is painted red for the whole warning and sinks when it lands, and a
// sunk sheet is black water (it hurts and slows whoever stands in it) until the Whiteout, or for 32 s. A FROZEN sheet is thick
// and glassy: the Titan's blows glance off it (it cannot crack), but it is slick: stepping onto it from other ground shoves you a
// short way along your heading. Winter's Grasp freezes the sheet under two random heroes' feet (and thaws the old frost).
// Four braziers stand at the grid's crossings. Frostbite chills a random hero (slowed, then frozen solid); a flame cures it, and a
// stack on them is the fallback if they cannot get there.
//   Act I, the Thaw (100% → 74%): Winter's Howl, Glacial Fist (tankbuster), Rime Slam (a circle on a random hero; the sheet under
//     it cracks), Fault Line (a line out of his fist; the sheets it crosses crack), Icefall, Titan's Sweep.
//   Act II, the Freeze (74% → 48%): Winter's Grasp, Frostbite, Whiteout (the lake freezes over again), Twin Slam.
//   Act III, the Crack (48% → 22%): the Long Night opens it (the seam: 20 s of huge slow arcs while two Graspshape the floor),
//     then the cracks come in pairs.
//   Act IV, the Avalanche (22% → 10% wall): the Grasp, then the Avalanche in five lanes; every sheet in a lane that is not frozen
//     is hit (the frozen ones are unpainted and safe). At 10% he is sealed (wall: The Plateau Tips) until the waves have passed.
//   The last stretch (10% → dead): until he falls or Endless Winter lands.
// Acts II to IV use PUSH. Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Glacial Stomp: a stomp, then two rings of shards running out from it.
//   Breath of Winter: a cone that freezes the sheets it crosses instead of hurting, and a burst a few seconds later that breaks them.
//   Titan's Grip: his fist closes on a hero and holds them; a stack on them frees them or they are crushed.
// Hard also shuffles the order of each act's middle sets each pull, adds a third wave to the Plateau Tips, and the frost islands
// number three.

const TITAN = {
  id: 'titan', name: 'Hrimgar', title: 'Warden of the White Reach',
  hp: { normal: 5550000, hard: 5600000 },
  autoDmg: { normal: 1800, hard: 1980 },
  enrage: { normal: 600, hard: 590 },   // the cast starts here and lands 8 s later (10:08 / 9:58)
  enrageName: 'Endless Winter',
  vuln: 0.5,
  spawn: { x: 0, y: -250 },
  arena: { theme: 'glacier' },
  gates: [0.74, 0.48, 0.22, { f: 0.1, wall: 1 }],   // where the acts change (ticks on the boss bar; fight.js course)
  push: true,                                       // reach a gate early and he moves on (fight.js course: push)
  // the four braziers stand where four sheets meet; the sheets themselves are floor entries the script changes as the fight goes
  room(f) {
    for (const x of [-300, 300]) for (const y of [-200, 200]) f.addProp({ kind: 'brazier', x, y, r: 24, solid: true, cover: false, state: 3 });
    f.sheets = [];
    for (let i = 0; i < 20; i++) {
      const fl = f.addFloor({ kind: 'sheet', i, x: -500 + (i % 5) * 200 + 100, y: -400 + Math.floor(i / 5) * 200 + 100, w: 200, st: 0 });
      f.sheets.push({ i, st: 0, fl });
    }
  },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    B.speed = 112;
    const dmg = {
      howl: H ? 13000 : 13000, fist: H ? 31850 : 28750, slam: H ? 21450 : 20000, sink: H ? 11050 : 10000, fault: H ? 18850 : 18150, icicle: H ? 10650 : 10000,
      sweep: H ? 16250 : 15000, cold: H ? 34450 : 31250, frozen: H ? 17550 : 15000, water: H ? 3750 : 3650, slide: H ? 25350 : 23150, whiteout: H ? 14950 : 13750,
      arc: H ? 18850 : 17500, stomp: H ? 18850 : 16900, ring: H ? 15600 : 13750, breath: H ? 6250 : 5650, burst: H ? 18200 : 16250,
      gripAim: H ? 6500 : 6250, gripStack: H ? 33800 : 30000, crush: H ? 31200 : 27500,
    };
    const S = (...steps) => steps.filter(Boolean);
    // --- the floor ------------------------------------------------------------------------------
    const W = 200, COLS = 5, ROWS = 4, X0 = -500, Y0 = -400;
    const sh = f.sheets;
    const cellAt = (x, y) => { const c = Math.floor((x - X0) / W), r = Math.floor((y - Y0) / W); return c < 0 || c >= COLS || r < 0 || r >= ROWS ? -1 : r * COLS + c; };
    const cxOf = i => X0 + (i % COLS) * W + W / 2, cyOf = i => Y0 + Math.floor(i / COLS) * W + W / 2;
    const rectOf = i => ({ kind: 'rect', x: X0 + (i % COLS) * W, y: cyOf(i), angle: 0, len: W, w: W });
    const setSheet = (i, st) => { const s = sh[i]; if (s.st === st) return; s.st = st; s.fl.st = st; f.floorVer++; f.propsDirty = true; };
    f.cellAt = cellAt; f.cellState = i => (i >= 0 ? sh[i].st : -1);   // (tools and the bots' view)
    const iced = new Set();               // the sheets Winter's Grasp has frozen (thawed when the next Grasp lands)
    const waters = new Map();             // sheet -> its water zone
    const sink = i => {
      setSheet(i, 3);
      const z = { id: f.nextMechId++, effect: 'burn', tag: 'drown', last: {}, shape: rectOf(i), dmg: dmg.water, startAt: f.t, end: 1e9 };
      f.zones.push(z); waters.set(i, z);
      // the lake freezes over again after a while on its own (and sooner at a Whiteout)
      f.afterKeep(32, () => thaw(i));
    };
    const thaw = i => { if (sh[i].st === 3) { setSheet(i, 0); const z = waters.get(i); if (z) z.end = f.t; waters.delete(i); } };
    // a sheet is marked, shows red for d s, and sinks when it lands
    const crack = (i, d) => {
      if (i < 0 || sh[i].st !== 0) return false;
      setSheet(i, 2);
      f.aoe(rectOf(i), d, dmg.sink, { tag: 'tisink', onResolve: () => sink(i) });
      return true;
    };
    // frozen ground is slick: stepping onto it from other ground shoves you a short way along the way you were going
    const prev = new Map(), slidAt = new Map();
    f.ticker(() => {
      for (const p of f.alive()) {
        const c = cellAt(p.x, p.y), pr = prev.get(p.id);
        prev.set(p.id, { x: p.x, y: p.y, c });
        if (!pr || c < 0 || sh[c].st !== 1 || pr.c === c || (pr.c >= 0 && sh[pr.c].st === 1) || f.t < (slidAt.get(p.id) || 0)) continue;
        const hx = p.x - pr.x, hy = p.y - pr.y, hl = Math.hypot(hx, hy);
        if (hl < 2) continue;
        slidAt.set(p.id, f.t + 0.9);
        f.knock(p, p.x - hx / hl * 20, p.y - hy / hl * 20, 105);
      }
      // black water slows whoever wades in it (the burn is the zone's)
      for (const [i] of waters) for (const p of f.alive()) if (cellAt(p.x, p.y) === i) {
        f.debuff(p.id, 'slowed', 0.35);
        if (typeof process !== 'undefined' && process.env && process.env.TITAN_DEBUG && f.t - (p.dbgAt || -9) > 0.9) { p.dbgAt = f.t; console.log('DROWN', f.t.toFixed(1), p.id, Math.round(p.x), Math.round(p.y), 'cell', i, 'mechs', [...f.mechs.values()].filter(m => m.resolveAt - f.t < 6).map(m => m.tag + '@' + (m.resolveAt - f.t).toFixed(1)).join(',')); }
      }
    });

    // --- the Titan -----------------------------------------------------------------------------------
    const aiming = [];
    f.ticker(() => {
      for (let i = aiming.length - 1; i >= 0; i--) {
        const m = aiming[i];
        if (!f.mechs.has(m.id)) { aiming.splice(i, 1); continue; }
        if (m.shape.angle != null) B.facing = m.shape.angle;
      }
    });
    // while he winds up a heavy blow he holds still and his ordinary swings stop
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); B.noAutoUntil = Math.max(B.noAutoUntil || 0, f.t + d - 0.3); };
    const nonTank = (not) => { const pool = (f.nonTanks().length ? f.nonTanks() : f.alive()).filter(p => !not || !not.includes(p.id)); const any = pool.length ? pool : f.alive(); return any.length ? f.pick(any) : null; };
    const braziers = () => f.props.filter(p => p.kind === 'brazier');
    const RAW_WARM = 125;

    // --- ground moves -------------------------------------------------------------------------------
    const howl = () => {
      const d = f.ct(4.6);
      f.cast("Winter's Howl", d, 'howl'); hold(d);
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.howl, hidden: true, tag: 'tihowl' });
    };
    const fist = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.8);
      f.cast('Glacial Fist', d, 'fist');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 400, arc: 1.5, angle: B.facing }, delay: d, dmg: dmg.fist, target: tank.id, aimFromBoss: tank.id, tag: 'tifist' });
    };
    // Rime Slam: a circle on a random hero, following them until a second before it lands; the sheet under it then cracks
    const slamOn = (target, d, cast = true) => {
      target = target || nonTank(); if (!target) return null;
      if (cast) f.cast('Rime Slam', d, 'slam');
      const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: target.x, y: target.y, r: 150 }, delay: d, dmg: dmg.slam, follow: target.id, lockAt: 1.1, tag: 'tislam',
        onResolve: () => { crack(cellAt(m.shape.x, m.shape.y), f.ct(4.6)); } });
      hold(d);
      return m;
    };
    const slam = () => slamOn(null, f.ct(5.2));
    const twinSlam = () => {
      const pool = f.nonTanks().length > 1 ? f.shuffle(f.nonTanks()) : f.shuffle(f.alive());
      const d = f.ct(5.2);
      f.cast('Twin Slam', d, 'slam');
      slamOn(pool[0], d, false);
      if (pool[1]) f.afterKeep(0.02, () => slamOn(pool[1], d + 1.7, false));
    };
    // Fault Line: his fist drives a line out across the plateau at a random hero; every sheet it crosses cracks
    const fault = () => {
      const tgt = nonTank(); if (!tgt) return;
      const d = f.ct(5.4), LEN = 880, LW = 140;
      f.cast('Fault Line', d, 'slam');
      const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(tgt.y - B.y, tgt.x - B.x), len: LEN, w: LW }, delay: d, dmg: dmg.fault,
        aimFromBoss: tgt.id, lockAt: 1.2, tag: 'tifault',
        onResolve: () => {
          const s = m.shape, ca = Math.cos(s.angle), sa = Math.sin(s.angle), hit = [];
          for (let i = 0; i < 20; i++) {
            if (sh[i].st !== 0) continue;
            const dx = cxOf(i) - s.x, dy = cyOf(i) - s.y, along = dx * ca + dy * sa, across = Math.abs(-dx * sa + dy * ca);
            if (along > -40 && along < s.len + 60 && across < LW / 2 + 55) hit.push([along, i]);
          }
          hit.sort((a, b) => a[0] - b[0]);
          for (const [, i] of hit.slice(0, 3)) crack(i, f.ct(4.6));
        } });
      aiming.push(m); hold(d);
    };
    // Icefall: shards come down out of the aurora, two of them on heroes and the rest scattered
    const icefall = () => {
      const d = f.ct(3.4), n = 8;
      f.cast('Icefall', d, 'cast'); hold(d);
      const who = f.shuffle(f.alive()).slice(0, 2);
      for (let i = 0; i < n; i++) {
        let x, y;
        if (who[i]) { x = who[i].x; y = who[i].y; }
        else { x = Math.round(-460 + f.rng() * 920); y = Math.round(-360 + f.rng() * 720); }
        f.afterKeep(i * 0.45, () => f.aoe({ kind: 'circle', x: Math.round(x), y: Math.round(y), r: 88 }, d, dmg.icicle, { tag: 'ticicle' }));
      }
    };
    // Titan's Sweep: a huge slow arc at a random hero
    const sweepAt = (tgt, d, cast = true) => {
      tgt = tgt || nonTank(); if (!tgt) return null;
      if (cast) f.cast("Titan's Sweep", d, 'sweep');
      const m = f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 660, arc: 1.9, angle: Math.atan2(tgt.y - B.y, tgt.x - B.x) }, delay: d, dmg: dmg.sweep,
        aimFromBoss: tgt.id, lockAt: 1.3, tag: 'tisweep' });
      aiming.push(m); hold(d);
      return m;
    };
    const sweep = () => sweepAt(null, f.ct(5.4));

    // --- the frost ----------------------------------------------------------------------------------
    // Winter's Grasp: frost spreads from the feet of two random heroes (Hard: three); the sheet under each freezes when it lands
    const grasp = (then) => {
      const n = H ? 3 : 2, d = f.ct(3.6);
      const who = f.shuffle(f.alive()).slice(0, n);
      f.cast("Winter's Grasp", d, 'cast'); hold(d);
      who.forEach((p, j) => {
        f.mech({ type: 'drop', color: '#9fe8ff', shape: { kind: 'circle', x: p.x, y: p.y, r: 100 }, delay: d, follow: p.id, lockAt: 0.9, tag: 'tigrasp',
          onResolve: () => {
            if (j === 0) { for (const i of iced) if (sh[i].st === 1) setSheet(i, 0); iced.clear(); }
            const m2 = f.alive().find(q => q.id === p.id), x = m2 ? m2.x : p.x, y = m2 ? m2.y : p.y, c = cellAt(x, y);
            if (c >= 0 && (sh[c].st === 0 || sh[c].st === 2)) { setSheet(c, 1); iced.add(c); }
          } });
      });
      if (then) f.afterKeep(d + 0.05, then);
      return d;
    };
    // Frostbite: a random hero is chilled. They are slowed, and a stack follows them; a brazier draws the cold out (and the stack
    // with it). Not warmed in time, they are frozen solid.
    const chilled = new Map();
    f.ticker(dt => {
      for (const [id, e] of chilled) {
        const p = f.alive().find(q => q.id === id);
        if (!p) { chilled.delete(id); continue; }
        f.debuff(id, 'slowed', 0.5);
        const near = braziers().some(b => Math.hypot(b.x - p.x, b.y - p.y) < RAW_WARM);
        e.warm = near ? e.warm + dt : Math.max(0, e.warm - dt * 2);
        if (e.warm >= 1.2) {
          chilled.delete(id);
          const s = f.ps.get(id); if (s) delete s.debuffs.frostbite;
          if (f.mechs.has(e.m.id)) { f.mechs.delete(e.m.id); f.emit({ t: 'tgx', id: e.m.id, hits: [], cure: 1 }); }
          f.emit({ t: 'propfx', k: 'warm', x: Math.round(p.x), y: Math.round(p.y) });
        }
      }
    });
    const frostbite = () => {
      const t = nonTank(); if (!t) return;
      const cast = f.ct(2.6), stackAt = f.ct(10), solidAt = f.ct(15.5), n = f.alive().length;
      f.cast('Frostbite', cast, 'cast');
      f.debuff(t.id, 'frostbite', solidAt);
      const m = f.mech({ type: 'stack', shape: { kind: 'circle', x: t.x, y: t.y, r: 130 }, delay: stackAt, dmg: dmg.cold * Math.min(n, 4) / 4, follow: t.id, need: H ? n : Math.max(1, n - 1), tag: 'tifrost' });
      chilled.set(t.id, { m, warm: 0 });
      f.afterKeep(solidAt, () => {
        if (!chilled.has(t.id)) return;
        chilled.delete(t.id);
        const q = f.alive().find(z => z.id === t.id);
        if (q) { f.damagePlayer(q, dmg.frozen, { kind: 'frozen', avoidable: true, n: 'Frostbite' }); f.debuff(q.id, 'rooted', 3); f.emit({ t: 'propfx', k: 'freeze', x: Math.round(q.x), y: Math.round(q.y) }); }
      });
    };
    // Whiteout: the aurora flares, a blinding snow, and every sunk sheet is ice again
    const whiteout = () => {
      const d = f.ct(4.2);
      f.cast('Whiteout', d, 'howl'); hold(d);
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.whiteout, hidden: true, tag: 'tiwhite', onResolve: () => { for (let i = 0; i < 20; i++) thaw(i); } });
    };

    // --- the Avalanche -----------------------------------------------------------------------------
    // Five lanes down the plateau, one per column of sheets. Every sheet in a lane that is neither frozen nor already water is
    // painted red from the start; the frozen ones are left unpainted. The lanes land one after another.
    const avalanche = (quiet) => {
      const D = f.ct(5.4), orders = [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [2, 1, 3, 0, 4], [0, 4, 1, 3, 2]], ord = f.pick(orders), group = new Set();
      if (!quiet) f.cast('Avalanche', D, 'avalanche');
      hold(D);
      for (let c = 0; c < COLS; c++) {
        const at = D + ord.indexOf(c) * 0.8;
        let r = 0;
        while (r < ROWS) {
          const i = r * COLS + c;
          if (sh[i].st === 1 || sh[i].st === 3) { r++; continue; }
          let r2 = r; while (r2 + 1 < ROWS && sh[(r2 + 1) * COLS + c].st !== 1 && sh[(r2 + 1) * COLS + c].st !== 3) r2++;
          f.aoe({ kind: 'rect', x: X0 + c * W + W / 2, y: Y0 + r * W, angle: Math.PI / 2, len: (r2 - r + 1) * W, w: W }, at, dmg.slide, { tag: 'tislide', group });
          r = r2 + 1;
        }
        f.afterKeep(at - 0.1, () => f.emit({ t: 'roomev', k: 'slide', c, dur: 1.4 }));
      }
      return D + 3.2;
    };
    const graspAvalanche = () => { grasp(() => avalanche()); };

    // --- the Long Night (the seam) ---------------------------------------------------------------
    // The aurora dims and huge shapes loom. Four slow arcs, and twice the frost is called: where the marked heroes stand when it
    // lands is where the ice will be for what follows.
    const longNight = () => {
      const HOLD = 22;
      const d = f.ct(2.8);
      f.cast('The Long Night', d, 'cast');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.howl, hidden: true, tag: 'tinight' });
      f.afterKeep(d, () => f.emit({ t: 'roomev', k: 'night', dur: HOLD }));
      f.afterKeep(d + 0.4, () => sweepAt(null, f.ct(5.6)), "Titan's Sweep");
      f.afterKeep(d + 3.4, () => grasp(), "Winter's Grasp");
      f.afterKeep(d + 7.6, () => sweepAt(null, f.ct(5.6)), "Titan's Sweep");
      f.afterKeep(d + 11.4, () => sweepAt(null, f.ct(5.6)), "Titan's Sweep");
      f.afterKeep(d + 14.6, () => grasp(), "Winter's Grasp");
      f.afterKeep(d + 18.4, () => sweepAt(null, f.ct(5.6)), "Titan's Sweep");
    };

    // --- Hard only ----------------------------------------------------------------------------------
    // Glacial Stomp: a stomp at his feet, and two rings of shards that run out from it
    const stomp = () => {
      const d = f.ct(4.8);
      f.cast('Glacial Stomp', d, 'slam');
      f.aoe({ kind: 'circle', x: B.x, y: B.y, r: 190 }, d, dmg.stomp, { tag: 'tistomp' });
      f.aoe({ kind: 'donut', x: B.x, y: B.y, r: 360, r2: 190 }, d + 1.7, dmg.ring, { tag: 'tiring' });
      f.aoe({ kind: 'donut', x: B.x, y: B.y, r: 540, r2: 360 }, d + 3.4, dmg.ring, { tag: 'tiring' });
      hold(d + 3.4);
    };
    // Breath of Winter: a cone at a random hero. It does not hurt much, but the sheets it crosses freeze; a few seconds on they break
    const breath = () => {
      const t = nonTank(); if (!t) return;
      const d = f.ct(4.6);
      f.cast('Breath of Winter', d, 'breath');
      const m = f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 780, arc: 0.9, angle: Math.atan2(t.y - B.y, t.x - B.x) }, delay: d, dmg: dmg.breath,
        aimFromBoss: t.id, lockAt: 1.1, tag: 'tibreath',
        onResolve: () => {
          const s = m.shape, got = [];
          for (let i = 0; i < 20; i++) {
            if (sh[i].st !== 0) continue;
            const dx = cxOf(i) - s.x, dy = cyOf(i) - s.y, dist = Math.hypot(dx, dy);
            let a = Math.atan2(dy, dx) - s.angle; while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU;
            if (dist < s.r && Math.abs(a) <= s.arc / 2 + 80 / Math.max(dist, 80)) got.push(i);
          }
          for (const i of got) setSheet(i, 1);
          const bd = f.ct(5.6), group = new Set();
          for (const i of got) f.aoe(rectOf(i), bd, dmg.burst, { tag: 'tiburst', group, onResolve: () => { setSheet(i, 0); sink(i); } });
        } });
      aiming.push(m); hold(d);
    };
    // Titan's Grip: his fist closes on whoever stands in the circle; a stack on them frees them, or they are crushed
    const grip = () => {
      const t = nonTank(); if (!t) return;
      const d = f.ct(3.6), n = f.alive().length;
      f.cast("Titan's Grip", d, 'fist');
      const aim = f.mech({ type: 'aoe', shape: { kind: 'circle', x: t.x, y: t.y, r: 110 }, delay: d, dmg: dmg.gripAim, follow: t.id, lockAt: 0.9, tag: 'tigrip',
        onResolve: (inside) => {
          const v = inside.length ? inside.slice().sort((a, b) => Math.hypot(a.x - aim.shape.x, a.y - aim.shape.y) - Math.hypot(b.x - aim.shape.x, b.y - aim.shape.y))[0] : null;
          if (!v) return;
          const sd = f.ct(7);
          f.debuff(v.id, 'gripped', sd);
          let held = true;
          const hold1 = () => { if (held) { f.debuff(v.id, 'rooted', 0.4); f.afterKeep(0.2, hold1); } };
          hold1();
          f.mech({ type: 'stack', shape: { kind: 'circle', x: v.x, y: v.y, r: 125 }, delay: sd, dmg: dmg.gripStack * Math.min(n, 4) / 4, need: Math.max(1, n - 1), tag: 'tigripstack',
            onResolve: (ins) => {
              held = false;
              const s = f.ps.get(v.id); if (s) { delete s.debuffs.gripped; delete s.debuffs.rooted; }
              if (ins.length < Math.max(1, n - 1)) { const q = f.alive().find(z => z.id === v.id); if (q) { f.damagePlayer(q, dmg.crush, { kind: 'crush', avoidable: true, n: "Titan's Grip" }); f.debuff(q.id, 'rooted', 2); } }
            } });
        } });
      hold(d + 1);
    };

    // --- the Plateau Tips (the wall) -----------------------------------------------------------------
    // At 10% he is sealed. Frost is called, the lanes follow it, again (Hard: three times); the seal falls with the last lane.
    const tipRun = () => {
      B.lockFacing = false;
      f.emit({ t: 'roomev', k: 'tip', dur: 60 });
      const waves = H ? 3 : 2, dg = f.ct(3.6), da = f.ct(5.4) + 3.2, gap = dg + 0.1 + da + 3;
      for (let k = 0; k < waves; k++) {
        f.afterKeep(3 + k * gap, () => grasp(), "Winter's Grasp");
        f.afterKeep(3 + k * gap + dg + 0.1, () => avalanche(), 'Avalanche');
      }
      if (H) f.afterKeep(3 + 2 * gap - 4.5, () => sweep(), "Titan's Sweep");
      const lastLands = 3 + (waves - 1) * gap + dg + 0.1 + da;
      f.afterKeep(lastLands - 3, howl, "Winter's Howl");
      f.afterKeep(lastLands + 1, fist, 'Glacial Fist');
      f.afterKeep(lastLands + 1, () => f.wallDown(), 'The Plateau Tips');
    };

    // --- the acts ------------------------------------------------------------------------------------
    const mix = (head, mid, tail) => [...head, ...(H ? f.shuffle(mid) : mid), ...tail];
    const standing = () => { B.lockFacing = false; B.moveTo = null; };

    // I. the Thaw
    const thawAct = from => f.course({
      until: 0.74, push: true, onStart: standing,
      sets: mix([S([4, howl, "Winter's Howl"]), S([12, slam, 'Rime Slam']), S([13, fist, 'Glacial Fist'])], [
        S([13, fault, 'Fault Line']),
        H ? S([10, stomp, 'Glacial Stomp']) : S([12, icefall, 'Icefall']),
        S([13, sweep, "Titan's Sweep"]),
        S([13, () => { fist(); f.afterKeep(f.ct(4.8) + 0.6, slam); }, 'Glacial Fist']),
      ], [
        S([12, howl, "Winter's Howl"]),
        S([13, icefall, 'Icefall']),
      ]),
      closing: [[10, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, slam, 'Rime Slam']],
      next: freezeAct,
    }, from);

    // II. the Freeze
    const freezeAct = from => f.course({
      until: 0.48, push: true, onStart: standing,
      sets: mix([S([4, () => grasp(), "Winter's Grasp"]), S([12, frostbite, 'Frostbite']), S([13, fist, 'Glacial Fist'])], [
        S([13, slam, 'Rime Slam']),
        S([12, whiteout, 'Whiteout']),
        H ? S([10, breath, 'Breath of Winter']) : S([13, twinSlam, 'Twin Slam']),
        H ? S([10, grip, "Titan's Grip"]) : S([12, fault, 'Fault Line']),
      ], [
        S([12, howl, "Winter's Howl"]),
        S([13, frostbite, 'Frostbite']),
      ]),
      closing: [[10, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, twinSlam, 'Twin Slam']],
      next: crackAct,
    }, from);

    // III. the Crack, opened by the Long Night
    const crackAct = from => f.course({
      until: 0.22, push: true, onStart: standing,
      sets: mix([S([2, longNight, 'The Long Night']), S([24.5, fist, 'Glacial Fist']), S([9, whiteout, 'Whiteout'])], [
        S([13, () => { fault(); f.afterKeep(f.ct(5.4) + 0.8, slam); }, 'Fault Line']),
        S([13, frostbite, 'Frostbite']),
        H ? S([10, stomp, 'Glacial Stomp']) : S([13, twinSlam, 'Twin Slam']),
        H ? S([10, grip, "Titan's Grip"]) : S([13, () => grasp(), "Winter's Grasp"]),
      ], [
        S([12, howl, "Winter's Howl"]),
        S([13, () => { fault(); f.afterKeep(f.ct(5.4) + 0.8, slam); }, 'Fault Line']),
      ]),
      closing: [[10, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, fault, 'Fault Line']],
      next: avalancheAct,
    }, from);

    // IV. the Avalanche: the lanes run, and at the last gate the plateau tips
    const avalancheAct = from => f.course({
      until: 0.1, push: true, onStart: standing,
      wall: { label: 'The Plateau Tips', run: tipRun, until: 'resolved', timeout: 80 },
      sets: [
        S([4, graspAvalanche, "Winter's Grasp"]),
        S([13, fist, 'Glacial Fist']),
        S([12, frostbite, 'Frostbite']),
        S([13, graspAvalanche, "Winter's Grasp"]),
        H ? S([10, breath, 'Breath of Winter']) : S([12, twinSlam, 'Twin Slam']),
        S([13, () => { fist(); f.afterKeep(f.ct(4.8) + 0.6, sweep); }, 'Glacial Fist']),
        S([13, graspAvalanche, "Winter's Grasp"]),
        S([13, howl, "Winter's Howl"]),
      ],
      closing: [[10, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, twinSlam, 'Twin Slam']],
      next: lastWinter,
    }, from);

    // the last stretch: the plateau has stopped tipping and he is nearly done
    const lastWinter = from => f.course({
      onStart: standing,
      sets: [
        S([3, howl, "Winter's Howl"]),
        S([11, whiteout, 'Whiteout']),
        S([12, fault, 'Fault Line']),
        S([11, fist, 'Glacial Fist']),
        S([11, twinSlam, 'Twin Slam']),
        S([11, sweep, "Titan's Sweep"]),
      ],
      closing: [[10, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, twinSlam, 'Twin Slam']],
      ramp: 0.08,
    }, from);

    thawAct(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.fault())
    f.moves = { howl, fist, slam, twinSlam, fault, icefall, sweep, grasp, frostbite, whiteout, avalanche, graspAvalanche, longNight, stomp, breath, grip, tipRun };
  },
};

if (typeof module !== 'undefined') module.exports = { TITAN };
