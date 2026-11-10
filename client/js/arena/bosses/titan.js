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
//   Act V, Last Winter (10% → dead): Winter's Grasp marks three heroes and freezes the sheets under them, then The Lake Rises paints every
//     other sheet red and sinks it, row by row, for good (no Whiteout, no thaw). The rest is fought on the islands the party chose
//     (Howl, Fist, a thicker Icefall; Hard adds the Grip) until he falls or Endless Winter lands.
// The moves stand on their own with room round them: each is one beat with a calm after it, and a quiet window (nothing live, the boss
// free to be hit) opens about every 40 s in every act. A few pairs are kept as the fight's seasoning: Winter's Grasp into the Icebreaker
// or into a Fault Line, an Icebreaker into a Whiteout, Frostbite into a Sweep, a Fist into the Last Winter's hail. The tank has a blow to
// meet about every half minute (a Fist or an Icebreaker) and the healer something to heal about as often.
// Icebreaker (the tank's own, both difficulties): a lighter blow than the Fist at the tank, short enough to come between two of them. Where
// the tank stands when it lands, the sheet cracks (red, then it sinks), so the tank steps off; a FROZEN sheet glances the blow (a third of
// its weight, nothing cracks), so a tank who has read the ice leads the Titan onto it. It follows Winter's Grasp at the start of Act II,
// comes before a Whiteout, between the Long Night's arcs, and stands between Fists; a Fist and an Icebreaker never land within 9 s
// of each other and two Icebreakers never within 14 s. Hard also cracks the sheet behind the tank, on the line from the Titan.
// docs/plans/rework-hrimgar.md has the questions and the reasons.
// The revamp (docs/plans/2026-11-boss-revamp.md): the Whiteout is Bitter Cold (a sign over every head: keep moving or be frozen in place as it lands), the
// Howl is Thin Ice (stand still, or the sheet under you cracks), the Sweep shoves whoever it hits a sheet's width, Icefall's two hunting shards freeze the
// sheet they land on, The Ice Groans and Deep Winter open the Freeze and the Avalanche. Hard draws one of three fixed dances (f.danceRng) for each
// act's middle sets and for the Lake's rows. Extreme adds Two Winters (Bitter Cold and Thin Ice through an Avalanche), Ice Tomb (sealed heroes freed only by
// a Fault Line or an Icebreaker passing through) and Sunk Towers (soak towers on sunk sheets that Winter's Grasp must melt first).
// Acts II to IV use PUSH. Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Glacial Stomp: a stomp, then two rings of shards running out from it.
//   Breath of Winter: a cone that freezes the sheets it crosses instead of hurting, and a burst a few seconds later that breaks them.
//   Titan's Grip: his fist closes on a hero and holds them; a stack on them frees them or they are crushed.
// Hard also shuffles the order of each act's middle sets each pull (the Avalanche act too, its Grasps kept in place), but only to an
// order that keeps the tank and the healer busy and a quiet window open (mix / fits below), adds a third wave to the Plateau Tips, and
// Winter's Grasp freezes three sheets (two on Normal; the Lake's Grasp always three). Last Winter opens on the Lake, then a Fist, a
// Rime Slam (it cannot crack the frozen islands, so it is a test of where the party stands), an Icebreaker on the islands, a Howl, and
// a thick Icefall (Hard adds the Grip).

const TITAN = {
  id: 'titan', name: 'Hrimgar', title: 'Warden of the White Reach',
  normalDmg: 1.1,   // (Normal's damage multiplier, fight.js default 1; 2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven))
  hp: { normal: 6110000, hard: 6660000, extreme: 7180000 },   // (2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven), was 5000000 / 5550000)
  autoDmg: { normal: 1800, hard: 1980 },
  hardDmg: 1.9,   // (2026-11-11: Hard brought into line with its set, the user's call; was 1.6)   // (2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven), was 1.48; Hard's blows land a little heavier than the usual 1.25: Hrimgar's seams and shuffles are kinder than they were, so his Hard has to bite. 1.56 before 2026-10-27's retune for a human party)
  enrage: { normal: 600, hard: 590, extreme: 590 },   // the cast starts here and lands 8 s later (10:08 / 9:58)
  extremeDmg: 1.91,   // (Extreme never hits softer than Hard: Hard's multiplier, with its own health and mechanics)
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
    const H = f.hard, X = f.extreme;
    const B = f.boss;
    const TAU = Math.PI * 2;
    B.speed = 112;
    const dmg = {
      howl: H ? 13000 : 13000, fist: H ? 31850 : 28750, slam: H ? 21450 : 20000, sink: H ? 11050 : 10000, fault: H ? 18850 : 18150, icicle: H ? 10650 : 10000,
      sweep: H ? 16250 : 15000, cold: H ? 34450 : 31250, frozen: H ? 17550 : 15000, water: H ? 3750 : 1800, slide: H ? 25350 : 23150, whiteout: H ? 14950 : 13750,
      arc: H ? 18850 : 17500, stomp: H ? 18850 : 16900, ring: H ? 15600 : 13750, breath: H ? 6250 : 5650, burst: H ? 18200 : 16250,
      gripAim: H ? 6500 : 6250, gripStack: H ? 33800 : 30000, crush: H ? 31200 : 27500, maul: H ? 11200 : 11400,
      tower: H ? 11000 : 10000, towerFail: H ? 14000 : 13000,   // (Extreme's Sunk Towers)
    };
    if (!H) for (const k in dmg) dmg[k] = Math.round(dmg[k] * (k === 'fist' || k === 'maul' ? 1.2 : 1.41));   // (Normal's hits are a little heavier than before the rework; Hard's table is its own)
    // when the boss's latest cast ends: an act that begins (or the wall that rises) a heartbeat after a cast waits for it, so no cast bar is cut
    let castEnd = 0;
    { const cast0 = f.cast.bind(f); f.cast = (name, dur, ...rest) => { castEnd = Math.max(castEnd, f.t + dur); return cast0(name, dur, ...rest); }; }
    const settle = (from, first) => Math.max(from, castEnd + 0.3 - first);
    const commit = len => { castEnd = Math.max(castEnd, f.t + len); };   // (a move that follows itself: its later cast is spoken for from the start)
    // --- the floor ------------------------------------------------------------------------------
    const W = 200, COLS = 5, ROWS = 4, X0 = -500, Y0 = -400;
    const sh = f.sheets;
    const cellAt = (x, y) => { const c = Math.floor((x - X0) / W), r = Math.floor((y - Y0) / W); return c < 0 || c >= COLS || r < 0 || r >= ROWS ? -1 : r * COLS + c; };
    const cxOf = i => X0 + (i % COLS) * W + W / 2, cyOf = i => Y0 + Math.floor(i / COLS) * W + W / 2;
    const rectOf = i => ({ kind: 'rect', x: X0 + (i % COLS) * W, y: cyOf(i), angle: 0, len: W, w: W });
    const setSheet = (i, st) => { const s = sh[i]; if (s.st === st) return; s.st = st; s.fl.st = st; f.floorVer++; f.propsDirty = true; };
    f.cellAt = cellAt; f.cellState = i => (i >= 0 ? sh[i].st : -1);   // (tools and the bots' view)
    const iced = new Set();               // the sheets Winter's Grasp has frozen (thawed when the next Grasp lands)
    const towerSheets = new Set();        // (Extreme) the sunk sheets a tower stands on
    const waters = new Map();             // sheet -> its water zone
    let lake = false;                     // The Lake Rises: from then on the water stays for the rest of the fight
    const sink = i => {
      setSheet(i, 3);
      const z = { id: f.nextMechId++, effect: 'burn', tag: 'drown', ddown: true, last: {}, shape: rectOf(i), dmg: dmg.water, startAt: f.t, end: 1e9 };
      f.zones.push(z); waters.set(i, z);
      // the lake freezes over again after a while on its own (and sooner at a Whiteout)
      f.afterKeep(32, () => thaw(i));
    };
    const thaw = i => { if (!lake && sh[i].st === 3) { setSheet(i, 0); const z = waters.get(i); if (z) z.end = f.t; waters.delete(i); } };
    // a sheet is marked, shows red for d s, and sinks when it lands
    const crack = (i, d) => {
      if (i < 0 || sh[i].st !== 0) return false;
      setSheet(i, 2);
      sinking.set(i, f.aoe(rectOf(i), d, dmg.sink, { tag: 'tisink', onResolve: () => { sinking.delete(i); if (sh[i].st === 2) sink(i); } }));
      return true;
    };
    // a red sheet frozen before it sinks is saved: its sinking is called off
    const sinking = new Map();
    const unsink = i => { const m = sinking.get(i); if (m) { f.cancel(m); sinking.delete(i); } };
    // frozen ground is slick: stepping onto it from other ground shoves you a short way along the way you were going
    const prev = new Map(), slidAt = new Map();
    const wadeT = new Map(), NUMB = 0.55;   // seconds in the water before the slow bites
    f.ticker(dtT => {
      for (const p of f.alive()) {
        const c = cellAt(p.x, p.y), pr = prev.get(p.id);
        prev.set(p.id, { x: p.x, y: p.y, c });
        if (!pr || c < 0 || sh[c].st !== 1 || pr.c === c || (pr.c >= 0 && sh[pr.c].st === 1) || f.t < (slidAt.get(p.id) || 0)) continue;
        const hx = p.x - pr.x, hy = p.y - pr.y, hl = Math.hypot(hx, hy);
        if (hl < 2) continue;
        slidAt.set(p.id, f.t + 0.9);
        f.knock(p, p.x - hx / hl * 20, p.y - hy / hl * 20, 78);
      }
      // black water numbs whoever lingers in it: a quick crossing is at full pace, but the legs go heavy after a heartbeat (the burn is the zone's)
      for (const p of f.alive()) {
        const w = waters.has(cellAt(p.x, p.y)), t0 = wadeT.get(p.id) || 0;
        wadeT.set(p.id, w ? t0 + dtT : Math.max(0, t0 - dtT * 2));
        if (w && t0 > NUMB) f.debuff(p.id, 'slowed', 0.35);
      }
      for (const [i] of waters) for (const p of f.alive()) if (cellAt(p.x, p.y) === i) {
        if (typeof process !== 'undefined' && process.env && process.env.TITAN_DEBUG && f.t - (p.dbgAt || -9) > 0.9) { p.dbgAt = f.t; console.log('DROWN', f.t.toFixed(1), p.id, Math.round(p.x), Math.round(p.y), 'cell', i, 'mechs', [...f.mechs.values()].filter(m => m.resolveAt - f.t < 6).map(m => m.tag + '@' + (m.resolveAt - f.t).toFixed(1)).join(',')); }
      }
    });

    // --- keeping moving and standing still (Bitter Cold, Thin Ice) ---------------------------------------
    // Every hero's last couple of seconds of walking is kept: "moved in the last w seconds" and "has not moved in the last w seconds" are read from it,
    // so a hero turning in place, or one whose position arrives a beat late, is judged on where they really went.
    const trail = new Map();
    f.ticker(() => {
      for (const p of f.alive()) {
        let a = trail.get(p.id); if (!a) trail.set(p.id, a = []);
        a.push({ t: f.t, x: p.x, y: p.y });
        while (a.length > 2 && f.t - a[0].t > 2.2) a.shift();
      }
    });
    const movedIn = (id, w) => {
      const a = trail.get(id); if (!a || !a.length) return 0;
      const q = a[a.length - 1]; let m = 0;
      for (const s of a) if (f.t - s.t <= w) m = Math.max(m, Math.hypot(s.x - q.x, s.y - q.y));
      return m;
    };
    // (how much ground the last w seconds covered: the corners of the box round where they went)
    const spanIn = (id, w) => {
      const a = trail.get(id); if (!a || !a.length) return 0;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const s of a) if (f.t - s.t <= w) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
      return Math.hypot(x1 - x0, y1 - y0);
    };
    const MOVE_MIN = 25, STILL_MAX = 55, STILL_FOR = 1.5;   // (moving: 25 px in the last 0.35 s; standing still: under 55 px of ground in the last 1.5 s)
    const isMoving = id => movedIn(id, 0.35) >= MOVE_MIN;
    const isIdle = id => spanIn(id, STILL_FOR) < STILL_MAX;
    const held = id => f.hasDebuff(id, 'rooted');   // (a hero who cannot walk is not judged on it)
    const C_MOVE = '#9fe8ff', C_STILL = '#ffe9a8';
    const markRule = (id, sym, dur, key) => f.mark(id, { sym, col: sym === 'move' ? C_MOVE : C_STILL, dur, key });
    // Bitter Cold: a hero who has stood still frozen in place for a few seconds
    const bitterHit = q => {
      f.damagePlayer(q, Math.round(dmg.frozen * 0.5), { kind: 'frozen', avoidable: true, ddown: true, n: 'Bitter Cold' });
      f.debuff(q.id, 'rooted', 3); f.emit({ t: 'propfx', k: 'freeze', x: Math.round(q.x), y: Math.round(q.y) });
    };
    // Thin Ice: the sheet under a hero who is moving cracks (a frozen sheet holds)
    const thinHit = q => { const c = cellAt(q.x, q.y); if (c >= 0) crack(c, f.ct(4.6)); };
    // (a raidwide with a rule on it: judged as it lands)
    const bitterCold = () => { for (const q of f.alive()) if (!held(q.id) && isIdle(q.id)) bitterHit(q); };
    const thinIce = () => { for (const q of f.alive()) if (!held(q.id) && isMoving(q.id)) thinHit(q); };
    // (a rule that holds for a stretch of the fight, Two Winters: id -> { kind, until, next })
    const winters = new Map();
    f.ticker(() => {
      for (const [id, r] of winters) {
        if (f.t >= r.until) { winters.delete(id); continue; }
        const q = f.alive().find(z => z.id === id);
        if (!q || held(id) || f.t < r.next) continue;
        if (r.kind === 'move' && isIdle(id)) { bitterHit(q); r.next = f.t + 3 + 1.6; }
        else if (r.kind === 'still' && isMoving(id)) { thinHit(q); r.next = f.t + 0.7; }
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
    let rwAt = -99;   // when the last raidwide (Howl, Whiteout, Long Night) lands: an act that opens on one waits for it (nightFrom)
    const howl = () => {
      const d = f.ct(4.6);
      rwAt = f.t + d;
      f.cast("Winter's Howl", d, 'howl'); hold(d);
      // Thin Ice: from the cast every hero carries the stand-still sign; a hero who is moving as the Howl lands cracks the sheet under them
      for (const q of f.alive()) markRule(q.id, 'still', d, 'tirule');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.howl, hidden: true, tag: 'tihowl', onResolve: () => { thinIce(); f.clearMarks('tirule'); } });
    };
    // (two Glacial Fists never land less than FIST_GAP apart, wherever in the fight they fall: one that would waits for the tank's cooldown)
    let fistLand = -99;
    const FIST_GAP = 16;
    const fistWait = () => Math.max(0, fistLand + FIST_GAP - (f.t + f.ct(4.8)), mauLand + MAUL_NEAR - (f.t + f.ct(4.8)));   // (a Fist never lands within MAUL_NEAR s after an Icebreaker)
    const fist = () => { const w = fistWait(); if (w > 0.05) { fistLand = f.t + w + f.ct(4.8); f.afterKeep(w, fistNow); } else fistNow(); return w; };
    const fistNow = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.8);
      fistLand = f.t + d;
      f.cast('Glacial Fist', d, 'fist');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 400, arc: 1.5, angle: B.facing }, delay: d, dmg: dmg.fist, target: tank.id, aimFromBoss: tank.id, tag: 'tifist' });
    };
    // Icebreaker (the tank's own, lighter than the Fist, so it can come between two of them): his fist comes down on the sheet the
    // tank stands on. The blow is a short cone at the tank (a lighter Fist), and where the tank stands when it lands the sheet cracks:
    // red for the whole warning, then it sinks. A FROZEN sheet glances the blow (it falls at a third of its weight and cracks nothing),
    // so the tank who has read the ice leads him onto it. Hard: the sheet behind the tank, on the line from the Titan, cracks as well.
    let mauLand = -99;
    const MAUL_NEAR = 9, MAUL_GAP = 14;   // (no nearer than MAUL_NEAR to a Fist, MAUL_GAP to another Icebreaker)
    const maulWait = () => Math.max(0, fistLand + MAUL_NEAR - (f.t + f.ct(3.8)), mauLand + MAUL_GAP - (f.t + f.ct(3.8)));
    const maul = () => { const w = maulWait(); if (w > 0.05) { mauLand = f.t + w + f.ct(3.8); f.afterKeep(w, maulNow); } else maulNow(); return w; };
    let maulR = 340, maulA = 1.0;   // (Extreme: the Icebreaker that frees a tomb reaches farther and wider)
    const maulNow = () => {
      const tank = f.tank(); if (!tank) return;
      const R = maulR, A = maulA; maulR = 340; maulA = 1.0;
      const d = f.ct(3.8);
      mauLand = f.t + d;
      f.cast('Icebreaker', d, 'slam');
      const m = f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: R, arc: A, angle: B.facing }, delay: d, dmg: dmg.maul, target: tank.id, aimFromBoss: tank.id, tag: 'tiice',
        onResolve: () => {
          breakTombs(m.shape);
          const q = f.alive().find(z => z.id === tank.id); if (!q) return;
          const c = cellAt(q.x, q.y); if (c < 0 || sh[c].st !== 0) return;   // (frozen ground glances it and cracks nothing)
          crack(c, f.ct(4.6));
          if (H) {
            const ux = q.x - B.x, uy = q.y - B.y, ul = Math.hypot(ux, uy) || 1;
            const b = cellAt(cxOf(c) + ux / ul * W, cyOf(c) + uy / ul * W);
            if (b >= 0 && b !== c) crack(b, f.ct(4.6));
          }
        } });
      f.afterKeep(d - 0.05, () => { const q = f.alive().find(z => z.id === tank.id), c = q ? cellAt(q.x, q.y) : -1; if (c >= 0 && sh[c].st === 1) m.dmg = Math.round(m.dmg / 3); });
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
      // (with a tomb standing, the line is aimed at a hero who is free to lead it)
      const free = tombs.size ? f.nonTanks().filter(p => !tombs.has(p.id)) : [];
      const tgt = free.length ? f.pick(free) : nonTank(); if (!tgt) return;
      const d = f.ct(5.4), LEN = 880, LW = 140;
      f.cast('Fault Line', d, 'slam');
      const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(tgt.y - B.y, tgt.x - B.x), len: LEN, w: LW }, delay: d, dmg: dmg.fault,
        aimFromBoss: tgt.id, lockAt: 1.2, tag: 'tifault',
        onResolve: () => {
          breakTombs(m.shape);
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
    const freezeAt = (x, y) => {
      const c = cellAt(x, y); if (c < 0 || (sh[c].st !== 0 && sh[c].st !== 2)) return;
      if (sh[c].st === 2) unsink(c);
      setSheet(c, 1); iced.add(c);
    };
    const icefall = () => {
      const d = f.ct(3.4), n = lake ? 11 : 8;   // (the hail thickens once the lake is up)
      f.cast('Icefall', d, 'cast'); hold(d);
      const who = f.shuffle(f.alive()).slice(0, 2);
      for (let i = 0; i < n; i++) {
        let x, y;
        if (who[i]) { x = who[i].x; y = who[i].y; }
        else { x = Math.round(-460 + f.rng() * 920); y = Math.round(-360 + f.rng() * 720); }
        // the two on heroes hunt them: the ring follows its hero and fixes a moment before the shard lands, so it is outrun and then left behind
        // (and where one of those two lands, the sheet freezes: the two heroes it hunts choose where two free sheets of ice go)
        if (who[i]) { const hid = who[i].id; f.afterKeep(i * 0.45, () => { const m = f.aoe({ kind: 'circle', x: Math.round(x), y: Math.round(y), r: 88 }, d, dmg.icicle, { tag: 'ticicle', follow: hid, lockAt: 0.85, onResolve: () => freezeAt(m.shape.x, m.shape.y) }); }); }
        else f.afterKeep(i * 0.45, () => f.aoe({ kind: 'circle', x: Math.round(x), y: Math.round(y), r: 88 }, d, dmg.icicle, { tag: 'ticicle' }));
      }
    };
    // Titan's Sweep: a huge slow arc at a random hero
    // The backhand. A narrower, shorter arc comes back for the same hero just after the first lands; it appears a heartbeat
    // before the first blow falls, follows them as they dodge and fixes late, so the first dodge must leave room for a second.
    // (Normal's is smaller and slower.)
    const BACK_GAP = H ? 1.8 : 2.1, BACK = H ? { r: 560, arc: 1.4, k: 0.8 } : { r: 480, arc: 1.2, k: 0.65 };
    const backhand = (tgt, d) => {
      f.afterKeep(d - 0.6, () => {
        const t2 = f.alive().find(q => q.id === tgt.id) || nonTank(); if (!t2) return;
        const m2 = f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: BACK.r, arc: BACK.arc, angle: Math.atan2(t2.y - B.y, t2.x - B.x) }, delay: 0.6 + f.ct(BACK_GAP), dmg: Math.round(dmg.sweep * BACK.k),
          aimFromBoss: t2.id, lockAt: 0.85, tag: 'tisweep2' });
        aiming.push(m2); hold(0.6 + f.ct(BACK_GAP));
      });
    };
    const sweepAt = (tgt, d, cast = true, back = false) => {
      tgt = tgt || nonTank(); if (!tgt) return null;
      if (cast) f.cast("Titan's Sweep", d, 'sweep');
      // the swing shoves whoever it hits one sheet's width out along it (a brazier, a solid prop, stops the shove short)
      const m = f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 660, arc: 1.9, angle: Math.atan2(tgt.y - B.y, tgt.x - B.x) }, delay: d, dmg: dmg.sweep,
        aimFromBoss: tgt.id, lockAt: 1.3, tag: 'tisweep', onResolve: inside => { for (const q of inside) { const z = f.alive().find(y => y.id === q.id); if (z) f.knock(z, m.shape.x, m.shape.y, W); } } });
      aiming.push(m); hold(d);
      if (back) backhand(tgt, d);
      return m;
    };
    const sweep = () => sweepAt(null, f.ct(5.4), true, true);
    const sweepGap = () => f.ct(5.4) + f.ct(BACK_GAP) + 0.3;   // (how long until a move that follows a Sweep may begin)

    // --- the frost ----------------------------------------------------------------------------------
    // Winter's Grasp: frost spreads from the feet of two random heroes (Hard: three); the sheet under each freezes when it lands
    const grasp = (then, count) => {
      const n = count || (H ? 3 : 2), d = f.ct(3.6);
      const who = f.shuffle(f.alive()).slice(0, n);
      f.cast("Winter's Grasp", d, 'cast'); hold(d);
      who.forEach((p, j) => {
        f.mech({ type: 'drop', color: '#9fe8ff', shape: { kind: 'circle', x: p.x, y: p.y, r: 100 }, delay: d, follow: p.id, lockAt: 0.9, tag: 'tigrasp',
          onResolve: () => {
            if (j === 0) { for (const i of iced) if (sh[i].st === 1) setSheet(i, 0); iced.clear(); }
            const m2 = f.alive().find(q => q.id === p.id), x = m2 ? m2.x : p.x, y = m2 ? m2.y : p.y, c = cellAt(x, y);
            // (Extreme: a sheet a tower stands on is water; the Grasp spent on it melts it, and then it freezes like any other)
            if (c >= 0 && sh[c].st === 3 && towerSheets.has(c)) { const z = waters.get(c); if (z) z.end = f.t; waters.delete(c); setSheet(c, 0); }
            if (c >= 0 && (sh[c].st === 0 || sh[c].st === 2)) { if (sh[c].st === 2) unsink(c); setSheet(c, 1); iced.add(c); }
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
      const m = f.mech({ type: 'stack', shape: { kind: 'circle', x: t.x, y: t.y, r: 130 }, delay: stackAt, dmg: dmg.cold * Math.min(n, 4) / 4, follow: t.id, need: H ? n : Math.max(1, n - 1), tag: 'tifrost', ddown: true });
      chilled.set(t.id, { m, warm: 0 });
      f.afterKeep(solidAt, () => {
        if (!chilled.has(t.id)) return;
        chilled.delete(t.id);
        const q = f.alive().find(z => z.id === t.id);
        if (q) { f.damagePlayer(q, dmg.frozen, { kind: 'frozen', avoidable: true, ddown: true, n: 'Frostbite' }); f.debuff(q.id, 'rooted', 3); f.emit({ t: 'propfx', k: 'freeze', x: Math.round(q.x), y: Math.round(q.y) }); }
      });
    };
    // Whiteout: the aurora flares, a blinding snow, and every sunk sheet is ice again
    const whiteout = () => {
      const d = f.ct(4.2);
      rwAt = f.t + d;
      f.cast('Whiteout', d, 'howl'); hold(d);
      // Bitter Cold: from the cast every hero carries the keep-moving sign; a hero who has stood still for the last second and a half is frozen where they stand
      for (const q of f.alive()) markRule(q.id, 'move', d, 'tirule');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.whiteout, hidden: true, tag: 'tiwhite', onResolve: () => { for (let i = 0; i < 20; i++) thaw(i); bitterCold(); f.clearMarks('tirule'); } });
    };

    // --- the acts open (a named cast, a beat, a change in the room) --------------------------------------
    // The Ice Groans opens the Freeze: the plateau shifts under him, a light raidwide as the sheets settle. Deep Winter opens the Avalanche: the
    // aurora goes out, a light raidwide, and every sunk sheet is ice again before the lanes begin.
    const iceGroans = () => {
      const d = f.ct(3.2);
      rwAt = f.t + d;
      f.cast('The Ice Groans', d, 'cast'); hold(d);
      f.emit({ t: 'roomev', k: 'titan-ice-groans', dur: d + 1.5 });
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: Math.round(dmg.howl * 0.5), hidden: true, tag: 'tihowl' });
    };
    const deepWinter = () => {
      const d = f.ct(3.2);
      rwAt = f.t + d;
      f.cast('Deep Winter', d, 'howl'); hold(d);
      f.emit({ t: 'roomev', k: 'titan-deep-winter', dur: d + 2 });
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: Math.round(dmg.howl * 0.5), hidden: true, tag: 'tiwhite', onResolve: () => { for (let i = 0; i < 20; i++) thaw(i); } });
    };

    // --- the Avalanche -----------------------------------------------------------------------------
    // Five lanes down the plateau, one per column of sheets. Every sheet in a lane that is neither frozen nor already water is
    // painted red from the start; the frozen ones are left unpainted. The lanes land one after another.
    const avalanche = (quiet, name, twin) => {
      const D = f.ct(5.4), orders = [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [2, 1, 3, 0, 4], [0, 4, 1, 3, 2]], ord = f.pick(orders), group = new Set();
      if (!quiet) f.cast(name || 'Avalanche', D, 'avalanche');
      hold(D);
      if (twin) twoWintersOn(D + 3.2);
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
    const graspAvalanche = () => { commit(f.ct(3.6) + 0.05 + f.ct(5.4)); grasp(() => avalanche()); };

    // --- the Long Night (the seam) ---------------------------------------------------------------
    // The aurora dims and huge shapes loom. Four slow arcs, and twice the frost is called: where the marked heroes stand when it
    // lands is where the ice will be for what follows.
    // The arcs and the frost are cast one after another (no bar is cut); the tank's Icebreaker comes on the ice the first frost made,
    // and the Fist falls between the second and third arc.
    const NIGHT_LEN = f.ct(2.8) + 0.4 + 4 * (f.ct(5.6) + 0.3) + 2 * (f.ct(3.6) + 0.3) + (f.ct(3.8) + 0.3) + f.ct(4.8) + 0.3;
    const NIGHT_MAUL = f.ct(2.8) + 0.4 + (f.ct(5.6) + 0.3) + (f.ct(3.6) + 0.3) + f.ct(3.8);   // (when the Icebreaker lands, from the Night's first step: on the ice the first frost made)
    const NIGHT_FIST = f.ct(2.8) + 0.4 + 2 * (f.ct(5.6) + 0.3) + (f.ct(3.6) + 0.3) + (f.ct(3.8) + 0.3) + f.ct(4.8);   // (when the Fist lands)
    const longNight = () => {
      const HOLD = NIGHT_LEN;
      const d = f.ct(2.8);
      rwAt = f.t + d;
      f.cast('The Long Night', d, 'cast');
      // the lights go out and the black water freezes over in the cold: the arcs are not fought wading
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: Math.round(dmg.howl * 0.85), hidden: true, tag: 'tinight', onResolve: () => { for (let i = 0; i < 20; i++) thaw(i); } });
      f.afterKeep(d, () => f.emit({ t: 'roomev', k: 'night', dur: HOLD }));
      let at = d + 0.4;
      const next = (fn, len, name) => { f.afterKeep(at, fn, name); at += len + 0.3; };
      const arc = () => next(() => sweepAt(null, f.ct(5.6)), f.ct(5.6), "Titan's Sweep"), frost = () => next(() => grasp(), f.ct(3.6), "Winter's Grasp");
      arc(); frost(); next(maul, f.ct(3.8), 'Icebreaker'); arc(); next(fist, f.ct(4.8), 'Glacial Fist'); arc(); frost(); arc();
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
        aimFromBoss: t.id, lockAt: 1.1, tag: 'tibreath', ddown: true,
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
      const waves = H ? 3 : 2, dg = f.ct(3.6), da = f.ct(5.4) + 3.2, gap = dg + 0.1 + da + 3, t0 = Math.max(3, castEnd - f.t + 0.3);
      for (let k = 0; k < waves; k++) {
        f.afterKeep(t0 + k * gap, () => grasp(), "Winter's Grasp");
        f.afterKeep(t0 + k * gap + dg + 0.1, X && k === 1 ? () => avalanche(false, 'Two Winters', true) : () => avalanche(), X && k === 1 ? 'Two Winters' : 'Avalanche');
      }
      // the tank's blow comes while the first lanes run (the cast ends before the next frost is called)
      const slot = t0 + dg + 0.1 + f.ct(5.4) + 0.2, fistFits = Math.max(fistLand + FIST_GAP, mauLand + MAUL_NEAR) <= f.t + slot + f.ct(4.8) + 1;
      f.afterKeep(slot, () => { if (fistWait() < 1) fist(); else if (maulWait() < 1) maul(); }, fistFits ? 'Glacial Fist' : 'Icebreaker');   // (the lighter Icebreaker comes in the Fist's place if the tank's last blow was too near)
      if (H) f.afterKeep(t0 + 2 * gap - 4.8, () => sweep(), "Titan's Sweep");
      const lastLands = t0 + (waves - 1) * gap + dg + 0.1 + da;
      const endAt = lastLands - 3 + f.ct(4.6) + 0.3;   // (the Fist waits for the Howl's cast to end)
      f.afterKeep(lastLands - 3, howl, "Winter's Howl");
      f.afterKeep(endAt, fist, 'Glacial Fist');
      f.afterKeep(endAt, () => f.wallDown(), 'The Plateau Tips');
    };

    // --- the Lake Rises (the last stretch) ---------------------------------------------------------
    // The finale of the floor rule. Winter's Grasp freezes the sheet under three heroes (the islands are wherever they stood), then
    // every sheet that is not frozen is painted red at once and goes under, row by row, and the water stays for the rest of the fight.
    const LAKE_ROWS = (() => { const r = f.danceRng('lake'), a = [[0, 1, 2, 3], [3, 2, 1, 0], [1, 2, 3, 0]]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
    const lakeFlood = () => {
      // (the row order is one of the dance's draws: three fixed orders, one for each dance)
      const D = f.ct(5.2), rows = H ? LAKE_ROWS[f.dance] : [3, 2, 1, 0];
      f.cast('The Lake Rises', D, 'howl'); hold(D);
      lake = true;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) crack(r * COLS + c, D + rows.indexOf(r) * 0.9);
    };
    const lakeRises = () => { grasp(null, 3); f.afterKeep(f.ct(3.6) + 0.1, lakeFlood, 'The Lake Rises'); };

    // --- Extreme: the three more ---------------------------------------------------------------------
    // Two Winters: Bitter Cold and Thin Ice at once, through an Avalanche. Two heroes carry the keep-moving sign, two the stand-still sign, from the cast
    // to the last lane; the rule is judged all that time (a hero who has stood still for a second and a half is frozen; a hero who is moving cracks the sheet
    // under them). Everyone is waiting for the lanes, and the only places the lanes do not paint are the sheets that are frozen or already water.
    const twoWintersOn = win => {
      const who = f.shuffle(f.alive()), nMove = who.length > 1 ? Math.ceil(who.length / 2) : 1;
      who.forEach((q, i) => {
        const kind = i < nMove ? 'move' : 'still';
        markRule(q.id, kind, win, 'tiwin');
        winters.set(q.id, { kind, until: f.t + win, next: f.t + 1.6 });
      });
      f.afterKeep(win + 0.2, () => f.clearMarks('tiwin'));
    };
    const twoWinters = () => { commit(f.ct(3.6) + 0.05 + f.ct(5.4)); grasp(() => avalanche(false, 'Two Winters', true)); };

    // Ice Tomb: two heroes are sealed in ice where they stand (the sheet under them freezes, a block of ice stands over them, they cannot move). Nobody can break
    // a tomb by hand: a Fault Line or an Icebreaker has to pass through it. Left alone it crushes the hero inside.
    const tombs = new Map();   // hero id -> { prop, until }
    const TOMB_FOR = 26;
    const freeTomb = (id, broke) => {
      const t = tombs.get(id); if (!t) return;
      tombs.delete(id); f.removeProp(t.prop); f.unmark(id, 'titomb');
      const s = f.ps.get(id); if (s) { s.mits = s.mits.filter(x => x.kind !== 'tomb'); delete s.debuffs.sealed; if (!(s.debuffs.frozen > f.t)) delete s.debuffs.rooted; }
      f.emit({ t: 'propfx', k: 'break', id: t.prop.id, kind: 'icetomb', x: Math.round(t.prop.x), y: Math.round(t.prop.y), r: 46, a: 0, how: 'tomb' });
      if (!broke) { const q = f.alive().find(z => z.id === id); if (q) f.damagePlayer(q, dmg.crush, { kind: 'crush', avoidable: true, n: 'Ice Tomb' }); }
    };
    const breakTombs = shape => { for (const [id, t] of [...tombs]) if (SHAPES.contains(shape, t.prop.x, t.prop.y, 50)) freeTomb(id, true); };
    f.ticker(() => {
      for (const [id, t] of [...tombs]) {
        if (!f.alive().some(q => q.id === id)) { freeTomb(id, true); continue; }
        if (f.t >= t.until) { freeTomb(id, false); continue; }
        f.debuff(id, 'rooted', 0.4);
      }
    });
    const entomb = q => {
      if (tombs.has(q.id)) return;
      const c = cellAt(q.x, q.y);
      if (c >= 0 && (sh[c].st === 0 || sh[c].st === 2)) { if (sh[c].st === 2) unsink(c); setSheet(c, 1); iced.add(c); }
      const prop = f.addProp({ kind: 'icetomb', x: Math.round(q.x), y: Math.round(q.y), r: 46, solid: false, cover: false });
      tombs.set(q.id, { prop, until: f.t + TOMB_FOR });
      f.mark(q.id, { sym: 'chain', col: C_MOVE, dur: TOMB_FOR, key: 'titomb' });
      f.debuff(q.id, 'sealed', TOMB_FOR); f.debuff(q.id, 'rooted', 0.4);
      const ps = f.ps.get(q.id); if (ps && ps.mits) ps.mits.push({ pct: 0.6, start: f.t, end: f.t + TOMB_FOR, kind: 'tomb', from: q.id });   // (the ice takes most of what lands on them)
      f.emit({ t: 'propfx', k: 'freeze', x: Math.round(q.x), y: Math.round(q.y) });
    };
    const iceTomb = (near) => {
      const d = f.ct(3.4);
      f.cast('Ice Tomb', d, 'cast'); hold(d);
      const pool = f.nonTanks().length >= 2 ? f.nonTanks() : f.alive();
      // (the strike that frees them has to reach: when it is the Icebreaker, the two nearest him are chosen)
      const who = near ? pool.slice().sort((a, b) => Math.hypot(a.x - B.x, a.y - B.y) - Math.hypot(b.x - B.x, b.y - B.y)).slice(0, 2) : f.shuffle(pool).slice(0, 2);
      for (const q of who) {
        const id = q.id;
        f.mech({ type: 'drop', color: '#9fe8ff', shape: { kind: 'circle', x: q.x, y: q.y, r: 75 }, delay: d, follow: id, lockAt: 0.9, tag: 'titomb', onResolve: () => { const z = f.alive().find(y => y.id === id); if (z) entomb(z); } });
      }
      return d;
    };
    const tombFault = () => { commit(f.ct(3.4) + 0.5 + f.ct(5.4)); const d = iceTomb(false); f.afterKeep(d + 0.5, fault); };
    const tombMaul = () => { commit(f.ct(3.4) + 0.5 + f.ct(3.8) + 4); const d = iceTomb(true); f.afterKeep(d + 0.5, () => { maulR = 600; maulA = 1.7; maul(); }); };

    // Sunk Towers: soak towers stand on two sheets that have already sunk (two that are going under, or cracked now, if too few have). A hero can only stand in
    // one once Winter's Grasp has been spent on that sheet: the Grasp that follows is for them, and a tower on a sheet that is still water counts nobody.
    const sunkTowers = () => {
      const GAP = 1.2, d1 = f.ct(3.4), dg = f.ct(3.6), T = d1 + GAP + dg + 3.0;
      // (the towers stand on sheets near where the party is, so the heroes the Grasp follows can reach them in time)
      const near = Array.from({ length: 20 }, (_, i) => i).filter(i => Math.hypot(cxOf(i) - B.x, cyOf(i) - B.y) <= 450), all = near.length >= 6 ? near : Array.from({ length: 20 }, (_, i) => i);
      f.cast('Sunk Towers', d1, 'cast'); hold(d1);
      let pick = f.shuffle(all.filter(i => waters.has(i) && !towerSheets.has(i))).slice(0, 2);
      if (pick.length < 2) pick = pick.concat(f.shuffle(all.filter(i => sh[i].st === 2 && !pick.includes(i))).slice(0, 2 - pick.length));
      if (pick.length < 2) { const dry = f.shuffle(all.filter(i => sh[i].st === 0 && !pick.includes(i))).slice(0, 2 - pick.length); for (const i of dry) crack(i, f.ct(4.6)); pick = pick.concat(dry); }
      for (const i of pick) {
        towerSheets.add(i);
        const m = f.mech({ type: 'tower', shape: { kind: 'circle', x: cxOf(i), y: cyOf(i), r: 90 }, delay: T, dmg: dmg.tower, failDmg: dmg.towerFail, need: 1, tag: 'titower', onResolve: () => { towerSheets.delete(i); } });
        f.afterKeep(T - 0.05, () => { if (sh[i].st === 3) m.shape = { kind: 'circle', x: 5000, y: 5000, r: 1 }; });   // (still water: nobody can stand there)
      }
      f.afterKeep(d1 + GAP, () => grasp(null, 3));
    };

    // --- moves that follow one another: the second starts as the first lands (casts never overlap) ---------
    // (a few only: the pairs are the fight's seasoning, not its rhythm. Grasp into Icebreaker, Grasp into Fault Line, Icebreaker into a
    // Whiteout, Frostbite into a Sweep, a Fist into the Last Winter's hail)
    const fistThen = (move, len) => () => { const w = fistWait(); commit(w + f.ct(4.8) + 0.6 + f.ct(len)); fist(); f.afterKeep(w + f.ct(4.8) + 0.6, move); };
    const fistIcefall = fistThen(icefall, 3.4);
    // the Icebreaker rides with moves that leave the floor to itself: it comes before a Whiteout (the tank's sheet is red while the
    // raidwide is called) and after Winter's Grasp (the ice the Grasp makes is where the tank can take the blow)
    const maulWhiteout = () => { const w = maulWait(); commit(w + f.ct(3.8) + 0.6 + f.ct(4.2)); maul(); f.afterKeep(w + f.ct(3.8) + 0.6, whiteout); };
    const graspMaul = () => { commit(f.ct(3.6) + 0.45 + f.ct(3.8)); grasp(() => f.afterKeep(0.4, maul)); };
    const graspFault = () => { commit(f.ct(3.6) + 0.45 + f.ct(5.4)); grasp(() => f.afterKeep(0.4, fault)); };
    const frostSweep = () => { commit(f.ct(2.6) + 0.5 + f.ct(5.4)); frostbite(); f.afterKeep(f.ct(2.6) + 0.5, sweep); };

    // --- laying the acts out -----------------------------------------------------------------------
    // Every beat is one move that stands on its own. `live` is how long its own telegraphs stay up from its first step (the cast bar,
    // then the red sheets it cracked), `rest` the calm after it: a short one (REST) between beats, a long one (WIN) is a quiet window,
    // nothing live and the boss free to be hit. A set begins once the one before has gone quiet and rested, so no bar is cut and the
    // windows come about every 40 s. The beats also say when their blows land, in seconds from their first step: tk the Glacial Fists,
    // mk the Icebreakers, rw the raidwides, hl the other things only the healer meets (a stack), nov a move only Hard has, sw a Sweep.
    // Hard draws the order of an act's middle beats afresh each pull, but only an order that keeps the tank and the healer busy and
    // a window open: a Fist at least every ~38 s and never two within 16 s of each other, the tank (Fist or Icebreaker) never waiting
    // over TANK_MAX, something for the healer at least every ~34 s, raidwides at least 12 s apart, a window about every 48 s,
    // no two of Hard's new moves side by side, and no Sweep until the water from the first Slam has frozen over again.
    const c = s => f.ct(s), ho = c(4.6), fo = c(4.8), wo = c(4.2), fs = c(10), CRK = c(4.6), SWL = c(5.4) + c(BACK_GAP);
    const REST = 3.5, WIN = 7.5;
    const GAL = c(3.6) + 0.45;   // (Winter's Grasp and the move that follows it: how long to the second cast)
    const MV = {
      howl: { fn: howl, nm: "Winter's Howl", len: ho, live: ho, rw: [ho] },
      fist: { fn: fist, nm: 'Glacial Fist', len: fo, live: fo, tk: [fo] },
      maul: { fn: maul, nm: 'Icebreaker', len: c(3.8), live: c(3.8) + CRK, mk: [c(3.8)] },
      slam: { fn: slam, nm: 'Rime Slam', len: c(5.2), live: c(5.2) + CRK },
      fault: { fn: fault, nm: 'Fault Line', len: c(5.4), live: c(5.4) + CRK },
      icefall: { fn: icefall, nm: 'Icefall', len: c(3.4), live: c(3.4) + 3.2 },
      sweep: { fn: sweep, nm: "Titan's Sweep", len: c(5.4), live: SWL, sw: 1 },
      twin: { fn: twinSlam, nm: 'Twin Slam', len: c(5.2), live: c(5.2) + 1.7 + CRK },
      frost: { fn: frostbite, nm: 'Frostbite', len: c(2.6), live: fs, hl: [fs] },
      white: { fn: whiteout, nm: 'Whiteout', len: wo, live: wo, rw: [wo] },
      ga: { fn: graspAvalanche, nm: "Winter's Grasp", len: c(3.6) + 0.05 + c(5.4), live: c(3.6) + 0.05 + c(5.4) + 3.2 },
      // the pairs
      gm: { fn: graspMaul, nm: "Winter's Grasp", len: GAL + c(3.8), live: GAL + c(3.8) + CRK, mk: [GAL + c(3.8)] },
      gf: { fn: graspFault, nm: "Winter's Grasp", len: GAL + c(5.4), live: GAL + c(5.4) + CRK },
      mw: { fn: maulWhiteout, nm: 'Icebreaker', len: c(3.8) + 0.6 + wo, live: Math.max(c(3.8) + CRK, c(3.8) + 0.6 + wo), mk: [c(3.8)], rw: [c(3.8) + 0.6 + wo] },
      fsw: { fn: frostSweep, nm: 'Frostbite', len: c(2.6) + 0.5 + c(5.4), live: Math.max(fs, c(2.6) + 0.5 + SWL), hl: [fs], sw: 1 },
      fi: { fn: fistIcefall, nm: 'Glacial Fist', len: fo + 0.6 + c(3.4), live: fo + 0.6 + c(3.4) + 3.2, tk: [fo] },
      // Hard's own
      stomp: { fn: stomp, nm: 'Glacial Stomp', len: c(4.8), live: c(4.8) + 3.4, nov: 1 },
      breath: { fn: breath, nm: 'Breath of Winter', len: c(4.6), live: c(4.6) + c(5.6), nov: 1 },
      grip: { fn: grip, nm: "Titan's Grip", len: c(3.6), live: c(3.6) + c(7), nov: 1, hl: [c(3.6) + c(7)] },
      // Extreme's three more
      tf: { fn: tombFault, nm: 'Ice Tomb', len: c(3.4) + 0.5 + c(5.4), live: c(3.4) + 0.5 + c(5.4) + CRK },
      tm: { fn: tombMaul, nm: 'Ice Tomb', len: c(3.4) + 0.5 + c(3.8), live: c(3.4) + 0.5 + c(3.8) + CRK, mk: [c(3.4) + 0.5 + c(3.8)] },
      st: { fn: sunkTowers, nm: 'Sunk Towers', len: c(3.4) + 1.2 + c(3.6) + 3.4, live: c(3.4) + 1.2 + c(3.6) + 4.4 },
      tw: { fn: twoWinters, nm: "Winter's Grasp", len: c(3.6) + 0.05 + c(5.4), live: c(3.6) + 0.05 + c(5.4) + 3.2 },
      // the acts open
      tr1: { fn: iceGroans, nm: 'The Ice Groans', len: c(3.2), live: c(3.2), rw: [c(3.2)] },
      tr2: { fn: deepWinter, nm: 'Deep Winter', len: c(3.2), live: c(3.2), rw: [c(3.2)] },
    };
    const NAMED_GAP = 15.5;   // (the timeline check wants a named step at least every 16 s: a long calm follows only a move that is soon over)
    const bt = (key, rest = REST, lead = 0) => {
      const m = MV[key];
      rest = Math.max(1, Math.min(rest, NAMED_GAP - m.live));
      return Object.assign([[lead, m.fn, m.nm]], { len: m.len, live: m.live, rest, tk: m.tk, mk: m.mk, rw: m.rw, hl: m.hl, nov: m.nov, sw: m.sw });
    };
    const tally = sets => {
      let t = 0; const o = { tk: [], mk: [], rw: [], hl: [], nov: [], sw: [], win: [], end: 0 };
      sets.forEach((s, i) => {
        const t0 = t + s[0][0];
        for (const k of ['tk', 'mk', 'rw', 'hl']) for (const x of (s[k] || [])) o[k].push(t0 + x);
        if (s.nov) o.nov.push(i);
        if (s.sw) o.sw.push(t0);
        if (s.rest >= 6) o.win.push(t0 + s.live);
        o.end = t0 + s.live;
        for (const [dt] of s) t += dt;
      });
      return o;
    };
    const gapMax = a => { a = [...a].sort((x, y) => x - y); let m = 0, l = a[0]; for (const x of a) { m = Math.max(m, x - l); l = x; } return m; };
    const gapMin = a => { a = [...a].sort((x, y) => x - y); let m = 99; for (let i = 1; i < a.length; i++) m = Math.min(m, a[i] - a[i - 1]); return m; };
    // a set begins once the one before has gone quiet and rested (its cast has ended, its sheets are sunk)
    const spaced = sets => sets.map((s, i) => {
      const r = Object.assign(s.map(x => [...x]), { len: s.len, live: s.live, rest: s.rest, tk: s.tk, mk: s.mk, rw: s.rw, hl: s.hl, nov: s.nov, sw: s.sw }), p = sets[i - 1];
      if (p && p.len != null) r[0][0] = Math.max(r[0][0], (p.live != null ? p.live + (p.rest != null ? p.rest : 0) : p.len) + 0.3);
      return r;
    });
    const TANK_MAX = 32;   // (Hard's draws: the tank never waits longer than this between a Fist or an Icebreaker landing and the next)
    const WIN_MAX = 50;    // (and a quiet window opens at least this often)
    const fits = (sets, lead = 99, endBeat = 0) => {
      const o = tally(sets), tb = [...o.tk, ...o.mk], busy = [...tb, ...o.rw, ...o.hl];
      if (gapMin(o.tk) < FIST_GAP || gapMin(o.rw) < 12 || o.nov.some((x, i) => i && x === o.nov[i - 1] + 1) || o.sw.some(x => x < 58)) return 1e9;
      if (o.mk.some(x => tb.some(y => y !== x && Math.abs(y - x) < (o.tk.includes(y) ? MAUL_NEAR : MAUL_GAP)))) return 1e9;   // (an Icebreaker keeps clear of every Fist and the next Icebreaker)
      const pen = Math.max(gapMax(o.tk) - 45, gapMax(endBeat ? [...tb, o.end + endBeat] : tb) - TANK_MAX, gapMax(busy) - 34, gapMax(o.win) - WIN_MAX, Math.min(...tb) - lead, 0);
      return pen > 0 ? pen * 10 + gapMax(o.tk) * 0.01 : 0;
    };
    // (lead: the latest the first Fist may land in the act, for an act the party is likely to leave early; endBeat: when the next act's
    // first blow on the tank lands after this one's last set, so the wait across the seam counts)
    // Hard's draw: one of the legal orders, fixed for the dance (f.danceRng). The three dances are worked out together, so that the first set that is
    // not common to all three is a different one in each: it tells the party which dance this pull is. (Each dance's order is drawn from its own
    // generator, again and again, until the three differ there.)
    const sameSet = (x, y) => x[0][1] === y[0][1];
    const validTriple = t => {
      for (let i = 0; i < t[0].length; i++) {
        if (sameSet(t[0][i], t[1][i]) && sameSet(t[1][i], t[2][i])) continue;
        return !sameSet(t[0][i], t[1][i]) && !sameSet(t[1][i], t[2][i]) && !sameSet(t[0][i], t[2][i]);
      }
      return false;
    };
    const drawTriple = (pool, salt) => {
      for (let a = 0; a < 400; a++) {
        const t = [0, 1, 2].map(k => pool[Math.floor(f.danceRng(salt + '#' + a, k)() * pool.length)]);
        if (validTriple(t)) return t;
      }
      return null;
    };
    const NEAR = 60;   // (an order that is over a gap by no more than six seconds may stand in when the legal ones are too few to give three dances)
    const mix = (head, mid, tail, fixed = [], lead = 99, endBeat = 0, salt = 'act') => {
      let cand = mid;
      if (H) {
        // every order of the sets that are free to move (the sets named in `fixed` keep their places), each one that keeps the tank and the healer busy equally
        // likely; if none does, the best of them
        const free = mid.filter((_, i) => !fixed.includes(i)), ok = [], near = [];
        let best = null, bs = 1e12;
        const walk = (left, got) => {
          if (!left.length) {
            const rest = got.slice(), pick = mid.map((s, i) => (fixed.includes(i) ? s : rest.shift())), sc = fits(spaced([...head, ...pick, ...tail]), lead, endBeat);
            if (sc === 0) ok.push(pick); else { if (sc <= NEAR) near.push(pick); if (sc < bs) { bs = sc; best = pick; } }
            return;
          }
          left.forEach((x, i) => walk(left.filter((_, j) => j !== i), [...got, x]));
        };
        walk(free, []);
        if (typeof process !== 'undefined' && process.env && process.env.TITAN_MIXDBG) console.log('MIX', head.length + '/' + mid.length + '/' + tail.length, 'valid', ok.length, ok.length ? '' : 'best ' + bs.toFixed(1) + ' ' + (() => { const o = tally(spaced([...head, ...best, ...tail])), tb = [...o.tk, ...o.mk]; return JSON.stringify({ tk: gapMax(o.tk).toFixed(0), tb: gapMax(tb).toFixed(0), busy: gapMax([...tb, ...o.rw, ...o.hl]).toFixed(0), win: gapMax(o.win).toFixed(0), tkmin: gapMin(o.tk).toFixed(0), rwmin: gapMin(o.rw).toFixed(0), first: Math.min(...tb).toFixed(0) }); })());
        let tri = ok.length ? drawTriple(ok, salt) : null;
        if (!tri && near.length) tri = drawTriple(ok.concat(near), salt + '+');
        cand = tri ? tri[f.dance] : ok.length ? ok[Math.floor(f.danceRng(salt)() * ok.length)] : best;
      }
      return spaced([...head, ...cand, ...tail]);
    };
    const standing = () => { B.lockFacing = false; B.moveTo = null; };
    // the Long Night opens its act with a raidwide: it waits until the last one is well behind (an act can end, and so begin, a heartbeat after a Howl;
    // two blows that close together killed the healer first)
    const RW_GAP = 15;
    // an act that opens with a named cast of its own (The Ice Groans, Deep Winter): it waits for the cast that is running and for the last raidwide to be a few seconds behind
    const opening = (from, first, d) => Math.max(settle(from, first), rwAt + 8 - f.ct(d) - first);
    // (and the Night's Fist must not have to wait for the tank's cooldown: the next set is placed from the Night's start, so a late Night would run into it)
    const nightFrom = from => Math.max(settle(from, 2), rwAt + RW_GAP - c(2.8) - (2 + c(4.8) + 0.6), fistLand + FIST_GAP - (2 + fo), mauLand + MAUL_NEAR - (2 + fo));
    const fistNight = () => { const w = fistWait(); commit(w + fo + 0.6 + NIGHT_LEN); fist(); f.afterKeep(w + fo + 0.6, longNight); };
    MV.fn = { fn: fistNight, nm: 'Glacial Fist', len: fo + 0.6 + NIGHT_LEN, live: fo + 0.6 + NIGHT_LEN, tk: [fo, fo + 0.6 + NIGHT_FIST], rw: [fo + 0.6 + c(2.8)], mk: [fo + 0.6 + NIGHT_MAUL] };
    MV.lake = { fn: lakeRises, nm: "Winter's Grasp", len: c(3.6) + 0.1 + c(5.2), live: c(3.6) + 0.1 + c(5.2) + 2.7 };

    // I. the Thaw
    const thawAct = from => f.course({
      until: 0.74, push: true, onStart: standing,
      sets: mix([bt('howl', 7.4, 4), bt('maul', REST)], H ? [
        bt(X ? 'st' : 'slam', REST),
        bt('fist', WIN),
        bt('fault', 3.5),
        bt('maul', REST),
        bt('stomp', WIN),
        bt('icefall', WIN),
        bt('fist', REST),
      ] : [
        bt('sweep', WIN),
        bt('fist', WIN),
        bt('slam', REST),
        bt('maul', WIN),
        bt('fault', 3.5),
        bt('fist', WIN),
        bt('icefall', WIN),
      ], [
        bt('howl', WIN),
      ], [], 99, 8, 'thaw'),
      closing: [[10, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, slam, 'Rime Slam']],
      next: freezeAct,
    }, from);

    // II. the Freeze
    const freezeAct = from => f.course({
      until: 0.48, push: true, onStart: standing,
      sets: mix([bt('tr1', 0.9, 0.3), bt('gm', 4, 4)], [
        bt('frost', 4),
        bt('fist', WIN),
        bt(X ? 'tf' : 'gf', REST),
        bt('maul', REST),
        H ? bt('breath', WIN) : bt('white', WIN),
      ], [
        bt('fist', REST),
        bt('howl', WIN),
      ], [], 99, 8, 'freeze'),
      closing: [[16, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, twinSlam, 'Twin Slam']],
      next: crackAct,
    }, opening(from, 0.3, 3.2));

    // III. the Crack, opened by the Long Night
    const crackAct = from => f.course({
      until: 0.22, push: true, onStart: standing,
      sets: mix([bt('fn', 6.5, 2)], H ? [
        bt('mw', WIN),
        bt('fist', WIN),
        bt('fsw', WIN),
        bt(X ? 'tm' : 'maul', REST),
      ] : [
        bt('mw', WIN),
        bt('frost', 4),
        bt('fist', WIN),
        bt('fault', WIN),
      ], [
        bt('fist', WIN),
      ], [], 99, 0, 'crack'),
      closing: [[12, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, fault, 'Fault Line']],
      next: avalancheAct,
    }, nightFrom(from));

    // IV. the Avalanche: the lanes run, and at the last gate the plateau tips. The later Grasp keeps its place; the rest is drawn on Hard.
    const avalancheAct = from => f.course({
      until: 0.1, push: true, onStart: standing,
      wall: { label: 'The Plateau Tips', run: tipRun, until: 'resolved', timeout: 80 },
      sets: mix([bt('tr2', 0.9, 0.3), bt('ga', 5, 4)], H ? [
        bt('fist', WIN),
        bt(X ? 'tw' : 'ga', REST),
        bt('breath', WIN),
        bt('maul', WIN),
        bt('fist', WIN),
        bt('howl', WIN),
        bt('maul', WIN),
      ] : [
        bt('fist', WIN),
        bt('ga', REST),
        bt('howl', WIN),   // (early in the act: the Night's Whiteout is the last raidwide before it)
        bt('maul', WIN),
        bt('fsw', WIN),
        bt('fist', WIN),
        bt('maul', WIN),
      ], [], [1], 28, 15, 'avalanche'),
      closing: [[12, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, twinSlam, 'Twin Slam']],
      next: lastWinter,
    }, opening(from, 0.3, 3.2));

    // V. Last Winter: the plateau has stopped tipping and the lake rises round the islands the party chose
    const lastWinter = from => f.course({
      onStart: standing,
      sets: spaced([
        bt('lake', WIN, 5),
        bt('fist', REST),
        bt(X ? 'st' : 'slam', WIN),
        bt('maul', REST),
        bt('howl', WIN),
        H ? bt('grip', WIN) : false,
        bt('icefall', REST),
      ].filter(Boolean)),
      closing: [[10, howl, "Winter's Howl"], [10, fist, 'Glacial Fist'], [10, icefall, 'Icefall']],
      ramp: 0.08,
    }, settle(from, 5));

    thawAct(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.fault())
    f.moves = { maul, howl, fist, slam, twinSlam, fault, icefall, sweep, grasp, frostbite, whiteout, avalanche, graspAvalanche, longNight, stomp, breath, grip, tipRun, lakeRises, lakeFlood };
  },
};

if (typeof module !== 'undefined') module.exports = { TITAN };
