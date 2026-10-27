// Boss II: Queen Skitterra, the Spider Broodmother — "The Web Cave". The hunt in the web. (Plan: docs/plans/rework-skitterra.md)
// One authored hunt, the same on every pull: long dread, then sudden swarms. The question is always what to break:
// egg clutches (each one broken costs damage on her now, and is two fewer spiderlings later), the knots of her threads
// (each one cut is one less drop in the dark, and one less strip of floor at the end), and her pillars (every Acid
// Deluge chips the ones you hide behind).
//   Act I, The Web (100% → 70%): ten sets with 14 to 16 s of calm between them, a move on its own wherever it can be (a pair only
//     where the pair is the point: Mist into Wrap to open, Venom Spit into a Lunge fought across the pools, Spin into the Acid
//     Deluge); Brood (the two ripest of the six clutches in the web hatch: kill them together), Silk Reel, Strand Reel (Hard: Fang Rush),
//     the Wrap-Lunge across the threads, Lines. Spin (four threads pillar to pillar: crossing one stings and roots) goes up only
//     after the Spit-Lunge and the charges, so each is fought on a clean floor.
//   The Dark Between (70%): she climbs into the dark for about 30 s. The cave falls to pools of light; her shadow runs along
//     each uncut thread in turn and she drops where it ends. Breaking a thread's knot before she gets there spares you
//     that drop, but a cut thread is one she hunts instead: her shadow goes to whoever stands farthest and drops there
//     (lighter; the circle follows its mark until 1.6 s out). Her body comes down with each drop: she lands as the circle does and is
//     hittable for about 4 s (Hard 2.7 s at a thread's first point, which she springs from before the second circle lands, then 3 s;
//     a hunted drop 2.5 s, Hard 2 s), with nothing of hers hurting and nothing able to stagger her, then hauls herself back out of reach.
//     A cocoon falls on a random one of them (the party stacks in)
//     and venom drips over every head, so something always lands within 4 s of the last cast whatever was cut.
//     The brood does not wait: three times the clutch with the shortest clock splits and what hatches runs at the tank
//     (a spiderling; on Hard a linked pair), so the tank holds, the melee cut it down and the ranged go to the knots and
//     the eggs; a clutch broken first sends nothing, and one is always left for the Swarm. She comes back down and the
//     outer web turns sticky.
//   Act II, The Brood (68% → 28%): eleven sets (Hard thirteen), three Lunges that each have a twist (Normal: the Wrap-Lunge, the rim
//     Lunge struck from the pillar a Strand Reel hung her on, a wiper from the wall, and Lines into a Lunge that lands as they come
//     due), the Swarm and its Wrap two problems rather than one, Mists and Reels between. Hard adds Molt, Egg Sacs, Fang Rush, Snare
//     Weave into the Deluge, the Volley with its Reel and Wrap and the Ambush, and reads the order differently each pull. The Swarm:
//     every clutch still standing hatches at once.
//   Act III, The Collapse (28% → 0%): the cave floor falls away ring by ring from the walls, four rings, the last taking
//     the hub down to a disc. The eight spokes and the threads nobody cut stay; anyone on falling floor drops (heavy damage,
//     held, then hauled back up the silk). Nothing is quiet for long: the Reel, the Lines and the Lunge are fought on
//     thinning silk, and she hunts whoever stands farthest out along it (From the Dark, from the web overhead).
//   The Chrysalis (at 28%): a hard damage check. She cocoons at the hub for 25 s; take 5% of her health off in that
//     time and she tears free, staggered (+25% damage taken, 8 s). Fail and she devours the party.
// The tank's own beat: Fang Strike (both difficulties). She rears and drives a fang down a lane from her through the tank, drawn
// from the cast and set where he stood when it began: he steps out of it, and the party keeps out of the strip behind him (whoever
// stands in it takes it too). About a quarter of the tank's health, so it fills the quiet stretches between the Wraps (never
// within about 11 s of one, in or out of a set), about every 20 to 25 s. Hard: the casts are faster, the blow a little
// harder, and in the Collapse a second lane follows the first, set on wherever he stepped.
// A slow party meets each act's closing loop (closeOne/Two/Three: a ring of different moves, one Lunge a pass at most), +12% each pass (f.course in fight.js). Devour is the hard enrage.
// Every telegraph shows on the floor on every difficulty; a Lunge is on the floor from two steps out (the strike landing next in full,
// the one after it as a thin outline, boss-tells.js lungeOrder; her legs and a turn arrow show the whole order). Hard: casts 15% faster, 25% more damage, six-step Lunges, green and red Silk Lines, a burning
// beam on the brood pair, three spiderlings to a clutch, two drops per uncut thread in the dark (3.6 s apart), Molt (the
// husk replays her last Lunge), Silk Wrap on the tank as Silk Reel takes the healer, Ceiling Ambush, sticky acid; and her
// three moves: Egg Sacs, Fang Rush, Spinneret Volley (with Molt, Ceiling Ambush and Snare Weave, six that Normal never uses).

const SKITTERRA = {
  id: 'skitterra', name: 'Queen Skitterra', title: 'Spider Broodmother',
  hp: { normal: 3700000, hard: 4000000 },   // (Hard 4.3M before 2026-10-27)
  hardDmg: 1.09,   // (Hard's damage multiplier; fight.js default 1.25. 2026-10-27: tuned for a human party rather than perfect bots, CLAUDE.md)
  autoDmg: { normal: 1800, hard: 1650 },
  enrage: { normal: 602, hard: 568 },   // the cast starts here and lands 8 s later (10:10 / 9:36)
  enrageName: 'Devour',
  vuln: 0.5,
  arena: { theme: 'webcave' },
  gates: [0.7, 0.28],   // where the acts change (ticks on the boss bar; fight.js course)
  // the eight pillars the web hangs from, one toward each corner of the cave
  room(f) {
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 2 + Math.PI / 8 + i * Math.PI / 4;
      f.addProp({ kind: 'pillar', x: Math.round(Math.cos(a) * 375), y: Math.round(Math.sin(a) * 375), r: 34, hp: 3, solid: true, cover: true });
    }
  },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      mist: H ? 10700 : 10800, wrap: H ? 28700 : 28500, lunge: H ? 16800 : 18600, tether: H ? 19400 : 22000, spit: H ? 15200 : 17200, pool: H ? 3050 : 3400,
      bite: H ? 2200 : 2100, fury: H ? 6400 : 7150, beam: H ? 6900 : 7800, reel: H ? 19500 : 22100,
      sac: H ? 5800 : 6500, sacFail: H ? 11500 : 13000, fang: H ? 17200 : 19500, glob: H ? 12100 : 14300, snare: H ? 11000 : 13000,
      deluge: H ? 18500 : 19500, strand: H ? 12700 : 14300, ambush: H ? 18400 : 20800, slam: H ? 5800 : 6500,
      clutchHp: 24000, knotHp: 24000, broodHp: H ? 30000 : 20000, swarmHp: H ? 16000 : 18000,
      fangStrike: H ? 7200 : 8000,
      sting: H ? 4100 : 4600, drop: H ? 14900 : 16900, drip: H ? 8100 : 9100, fall: H ? 15400 : 15600, cocoon: H ? 18700 : 14300,
    };
    const LONG = 420, SHORT = 150;
    const S = (...steps) => steps.filter(Boolean);
    const room = f.room = { threads: [], dark: false, fallen: Infinity, warn: null, safe: null };

    // --- building blocks ------------------------------------------------------------------
    const venomMist = () => {
      f.cast('Venom Mist', f.ct(4), 'mist');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(4), dmg: dmg.mist, hidden: true, tag: 'mist' });
    };

    // Eightfold Lunge: each step strikes a leg's direction and the opposite one; the steps turn 45° at a time.
    // The whole sequence is on the floor from the cast: the strike landing next in full, the ones after it as faint
    // ghosts (boss-tells.js ghost), and her lit legs show the order.
    let lastLunge = null;
    const lunge = (opts = {}) => {
      const src = opts.src || { x: B.x, y: B.y };
      const a0 = opts.a0 ?? f.rng() * TAU, dir = opts.dir ?? (f.rng() < 0.5 ? 1 : -1);
      const steps = H ? 6 : 4, step = H ? 1.0 : 1.3, d = opts.delay ?? f.ct(5);
      if (!opts.husk) {
        lastLunge = { a0, dir };
        B.lockFacing = true;
        if (!opts.noCast) f.cast('Eightfold Lunge', d, 'lunge');
        f.afterKeep(d + (steps - 1) * step + 0.15, () => { B.lockFacing = false; });
      }
      f.emit({ t: 'lunge', who: opts.husk ? 'husk' : 'boss', x: Math.round(src.x), y: Math.round(src.y), a0: +a0.toFixed(3), dir, n: steps, step, delay: d });
      for (let k = 0; k < steps; k++) {
        const a = a0 + dir * k * Math.PI / 4;
        for (const ang of [a, a + Math.PI]) {
          f.aoe({ kind: 'cone', x: src.x, y: src.y, r: 1300, arc: 1.22, angle: ang }, d + k * step, dmg.lunge, { tag: 'lunge' });
        }
      }
      return d + (steps - 1) * step;
    };

    // Silk Wrap: a cleaving tankbuster; it roots the tank where it lands.
    const silkWrap = (d = f.ct(5), noCast) => {
      const tank = f.tank(); if (!tank) return;
      if (!noCast) f.cast('Silk Wrap', d, 'wrap');
      else f.anim('wrap', d);
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 320, arc: 1.4, angle: B.facing }, delay: d,
        dmg: dmg.wrap, target: tank.id, aimFromBoss: tank.id, tag: 'buster',
        onResolve: () => { if (f.alive().some(p => p.id === tank.id)) f.debuff(tank.id, 'rooted', H ? 3 : 2.6); } });
    };
    // Phase 2: the wrap lands just before a Lunge starts; wherever the tank is rooted has to survive the first strikes.
    // Hard: the wrap lands well before the first strike, and the Lunge starts square across from wherever the tank
    // stands (the first two strikes pass either side of the root), so the buster and the Lunge are no longer one wall.
    const wrapLunge = () => {
      const d = f.ct(6.5), tank = f.tank();
      if (H && tank) {
        lunge({ delay: d, a0: Math.atan2(tank.y - B.y, tank.x - B.x) + Math.PI / 2 });
        silkWrap(d - 1.8, true);
        return;
      }
      lunge({ delay: d });
      silkWrap(d - 0.3, true);
    };

    // Fang Strike (both difficulties, the tank's own): she rears and drives a fang down the line to the tank. The lane is drawn
    // from the cast, from her through where he stands; it hits whoever is in it (about a quarter of the tank's health, the
    // same for anyone behind him), so the tank steps out of it and the party keeps out of the strip behind him. A light, quick
    // blow, so it fills the quiet between the Wraps. Hard (in the Collapse): a second lane is drawn the moment the first has
    // landed, set on wherever the tank went to dodge it.
    const FS_CAST = 1.8, FS_SAVE = 3.0 - FS_CAST;   // (FS_SAVE: the sets' calm before each Strike was worked out for a 3.0 s cast)
    const fangStrike = (twin = false) => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(FS_CAST);
      f.cast('Fang Strike', d, 'fang');
      const lane = delay => {
        const t = f.alive().find(p => p.id === tank.id); if (!t) return;
        f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(t.y - B.y, t.x - B.x), len: 1300, w: 150 }, delay, dmg: dmg.fangStrike,
          tag: 'fangstrike' });
      };
      lane(d);
      if (H && twin) f.afterKeep(d + 0.05, () => lane(1.4));
    };
    // a Fang Strike laid on the tail of a set, dt s after its last step; it takes `trim` s out of the calm before the next set (weave)
    const withFS = (set, dt, trim, twin = false) => { set.push([dt, twin ? () => fangStrike(true) : () => fangStrike(), 'Fang Strike']); set.trim = trim; return set; };
    const weave = sets => {
      for (let i = 0; i + 1 < sets.length; i++) { const s = sets[i], nx = sets[i + 1]; if (s && s.trim && nx && nx.length) nx[0] = [Math.max(4, nx[0][0] - s.trim - f.ct(FS_SAVE)), ...nx[0].slice(1)]; }
      return sets;
    };

    // a Fang Strike laid dt s after a set's last step that leaves the set's total calm as written (the Strike sits inside the calm)
    const fsIn = (set, dt, twin = false) => withFS(set, dt, dt - FS_SAVE, twin);

    // Silk Lines: tethers between players. Long ones must be stretched past LONG; short ones kept within SHORT.
    const silkLines = (delay = f.ct(9)) => {
      const al = f.alive();
      if (al.length < 2) return;
      f.cast('Silk Lines', f.ct(3), 'silk');
      const tie = (a, b, kind) => f.tether(a.id, b.id, delay, { kind, len: kind === 'long' ? LONG : SHORT, dmg: dmg.tether, tag: 'silk', ddown: true });
      if (H && al.length >= 4) {
        const sh = f.shuffle(al);
        tie(sh[0], sh[1], 'long'); tie(sh[2], sh[3], 'short');
      } else {
        const pool = f.nonTanks().length >= 2 ? f.nonTanks() : al;
        const sh = f.shuffle(pool);
        tie(sh[0], sh[1], 'long');
      }
    };

    const farthest = (pool, n) => [...pool].sort((a, b) => Math.hypot(b.x - B.x, b.y - B.y) - Math.hypot(a.x - B.x, a.y - B.y)).slice(0, n);
    // Venom Spit: a narrow cone at each of the two farthest players; a slowing pool stays where it lands.
    const venomSpit = () => {
      const d = f.ct(5);
      const far = farthest(f.alive(), 2);
      if (!far.length) return;
      f.cast('Venom Spit', d, 'spit');
      for (const p of far) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 1300, arc: 0.42, angle: 0 }, delay: d, dmg: dmg.spit,
          tag: 'venom', ddown: true, aimFromBoss: p.id, lockAt: 1.2,
          onResolve: () => {
            const q = f.players().find(z => z.id === p.id);
            const dist = q ? Math.hypot(q.x - m.shape.x, q.y - m.shape.y) : 380;
            const L = Math.max(200, dist);
            const at = ARENA.clamp({ x: m.shape.x + Math.cos(m.shape.angle) * L, y: m.shape.y + Math.sin(m.shape.angle) * L }, 60);
            f.puddle(at.x, at.y, H ? 100 : 90, H ? 45 : 45, dmg.pool, 1, 'venom', { slow: true, ddown: true });
          } });
      }
    };
    const linesThenSpit = () => { silkLines(); f.after(f.ct(3.5), venomSpit); };

    // Molt (Hard, phase 2): she leaves her husk behind, which replays her last Lunge while she starts a new one.
    const molt = () => {
      if (!lastLunge) return lunge();
      const last = lastLunge, hx = B.x, hy = B.y;
      f.cast('Molt', 2, 'molt');
      B.lockFacing = true;
      f.after(2, () => {
        f.emit({ t: 'husk', x: Math.round(hx), y: Math.round(hy), f: +B.facing.toFixed(2), dur: 16 });
        // she skitters off to one side of the husk
        let a = f.rng() * TAU, nx = hx + Math.cos(a) * 240, ny = hy + Math.sin(a) * 240;
        if (Math.hypot(nx, ny) > 300) { a += Math.PI; nx = hx + Math.cos(a) * 240; ny = hy + Math.sin(a) * 240; }
        f.moveBoss(nx, ny, 700);
        f.anim('leap', 0.6);
        f.after(1.0, () => lunge());
        f.after(6, () => lunge({ husk: true, src: { x: hx, y: hy }, a0: last.a0, dir: last.dir, delay: f.ct(3) }));
      });
    };

    // Silk Reel: she hooks whoever is farthest away (two on Hard) and drags them in. Struggling slows it;
    // a dash snaps the thread. Dragged all the way in: a venomous bite that slows.
    const silkReel = (role = null) => {
      const d = f.ct(2.5);
      f.cast('Silk Reel', d, 'reel');
      f.after(d - 0.9, () => {
        const pool = f.nonTanks().length ? f.nonTanks() : f.alive();
        // Hard's role split: the healer is always one of the two
        const healer = role && pool.find(p => p.role === role);
        const picks = healer ? [healer, ...farthest(pool.filter(p => p !== healer), H ? 1 : 0)] : farthest(pool, H ? 2 : 1);
        for (const p of picks) f.reel(p.id, { speed: H ? 210 : 180, dur: 4, windup: 0.9, dmg: dmg.reel, ddown: true });
      });
    };

    // --- Hard only ------------------------------------------------------------------------------
    // Egg Sacs: three sacs drop around the web, each wanting one person to stomp it. Stomping sticks you in the goo for
    // a moment; a sac nobody stomps bursts over everyone and leaves venom where it lay.
    const eggSacs = () => {
      const d = f.ct(7);
      f.cast('Egg Sacs', d, 'eggs');
      const a0 = f.rng() * TAU;
      for (let i = 0; i < 3; i++) {
        const a = a0 + i * TAU / 3, x = Math.cos(a) * 290, y = Math.sin(a) * 290;
        f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: 70 }, delay: d, dmg: dmg.sac, failDmg: dmg.sacFail, need: 1, tag: 'eggsac',
          onResolve: inside => {
            for (const p of inside) f.debuff(p.id, 'rooted', 1.5);
            if (!inside.length) f.puddle(x, y, 110, 30, dmg.pool, 1, 'venom', { slow: true });
          } });
      }
    };
    // Fang Rush: she charges the farthest player across the web (the line follows them until just before), then the
    // silk she drags behind her stays on the floor, sticky, for a while.
    const fangRush = () => {
      const far = farthest(f.alive(), 1)[0];
      if (!far) return;
      const d = f.ct(4.5);
      B.lockFacing = true;
      f.cast('Fang Rush', d, 'fang');
      const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: 0, len: 1300, w: 160 }, delay: d, dmg: dmg.fang, tag: 'fang', aimFromBoss: far.id, lockAt: 0.8 });
      f.afterKeep(d, () => {
        const a = m.shape.angle;
        let len = Math.max(150, Math.min(ARENA.edge(a) - 140, Math.hypot(far.x - B.x, far.y - B.y) + 60));
        // a pillar in the way stops her, and takes the blow
        const hit = PROPS.ray(m.shape.x, m.shape.y, m.shape.x + Math.cos(a) * len, m.shape.y + Math.sin(a) * len, f.props, FIGHT.BOSS_R * 0.7);
        if (hit) { len = Math.max(0, hit.t * len - 4); f.afterKeep(len / 1000, () => f.hitProp(hit.prop, 1, 'fang')); }
        f.zone({ shape: { kind: 'rect', x: m.shape.x, y: m.shape.y, angle: a, len, w: 130 }, dur: 16, tag: 'trail', effect: 'slow' });
        f.moveBoss(m.shape.x + Math.cos(a) * len, m.shape.y + Math.sin(a) * len, 1000);
        f.anim('leap', 0.4);
        B.lockFacing = false;
      });
    };
    // Spinneret Volley: four globs of silk fall in turn on everyone but the tank; each follows its target, then
    // stops a second before it lands
    const volley = () => {
      const d = f.ct(3);
      f.cast('Spinneret Volley', d, 'volley');
      const targets = f.nonTanks().length ? f.nonTanks() : f.alive();
      for (let k = 0; k < 4; k++) {
        f.afterKeep(d - 1.0 + k * 1.15, () => {
          for (const p of targets) if (f.alive().some(q => q.id === p.id)) {
            const q = f.players().find(z => z.id === p.id);
            f.mech({ type: 'aoe', shape: { kind: 'circle', x: q.x, y: q.y, r: 100 }, delay: 1.9, dmg: dmg.glob, tag: 'glob', follow: p.id, lockAt: 0.9 });
          }
        });
      }
    };

    // Snare Weave (Hard, Act II): she scuttles to the hub and weaves the whole web full of spring-snares, two layers of
    // them, with only three pockets of floor (not painted: read from the snares) clear in each: one close in by her (for her shield and anyone
    // who fights up close) and two out at range. The pockets are the same every time, and the second layer's are the
    // first's turned a sixth of the way round her, so the whole party steps round with her, pocket to pocket, in one
    // turn. The second layer is drawn from early on, faint until the first lands. A snare that catches you hits and
    // flings you out of it. As she weaves, the two farthest from her shield are Egg-Laden: a clutch hangs on them, and it
    // drops (a venom pool that stays) between the two layers. The pocket you have just left is the place for it: the
    // second layer covers it anyway, and nobody's way to a pillar for the Acid Deluge that follows runs through it.
    const SNARE_R = 190, SNARE_GAP = 100, LADEN_R = 110;   // (the pockets are wide enough to read as clear floor: the whole party fits in one)
    // a layer: snares on a close grid over the whole web, each shrunk where it nears a pocket, so the pockets (and a
    // little round them) are the only clear floor
    const snareLayer = (gaps, delay, group) => {
      const step = 200, out = [];
      for (let row = -4; row <= 4; row++) for (let col = -4; col <= 4; col++) {
        const x = col * step + (row & 1 ? step / 2 : 0), y = row * step * 0.866;
        if (ARENA.sd(x, y) > 70) continue;   // (the ones just past the wall still reach in)
        const r = Math.min(SNARE_R, ...gaps.map(g => Math.hypot(g.x - x, g.y - y) - SNARE_GAP - 6));
        if (r >= 70) out.push({ x, y, r: Math.round(r) });
      }
      // then fill any hole the grid left away from the pockets (under her, mostly) with smaller snares, so the
      // pockets are the only clear floor that matters
      const gapD = (x, y) => Math.min(...gaps.map(g => Math.hypot(g.x - x, g.y - y)));
      for (let n = 0; n < 12; n++) {
        let worst = null;
        for (let x = -540; x <= 540; x += 40) for (let y = -540; y <= 540; y += 40) {
          if (ARENA.sd(x, y) > -10 || out.some(c => Math.hypot(c.x - x, c.y - y) < c.r)) continue;
          const dg = gapD(x, y);
          if (dg > SNARE_GAP + 75 && (!worst || dg > worst.dg)) worst = { x, y, dg };
        }
        if (!worst) break;
        out.push({ x: worst.x, y: worst.y, r: Math.round(Math.min(SNARE_R * 0.7, worst.dg - SNARE_GAP - 6)) });
      }
      for (const c of out) f.aoe({ kind: 'circle', x: c.x, y: c.y, r: c.r }, delay, dmg.snare, { tag: 'snare', group,
        onResolve: (inside, hits) => { for (const id of hits) { const q = f.alive().find(z => z.id === id); if (q) f.knock(q, c.x, c.y, 200, { slam: dmg.slam }); } } });
      for (const g of gaps) f.mech({ type: 'safe', shape: { kind: 'circle', x: g.x, y: g.y, r: SNARE_GAP }, delay, dmg: 0, tag: 'snaregap' });
    };
    const snareWeave = () => {
      const d = f.ct(7), between = 3.4, a0 = Math.PI / 2;   // the near pocket first south of her, toward the way in
      f.moveBoss(0, 0, 600);
      f.cast('Snare Weave', d, 'silk');
      const ring = off => [[0, 140], [1, 320], [2, 320]].map(([k, R0]) => ({ x: Math.round(Math.cos(a0 + off + k * TAU / 3) * R0), y: Math.round(Math.sin(a0 + off + k * TAU / 3) * R0) }));
      snareLayer(ring(0), d, new Set());
      // the second layer shows a little later (still well before the first lands), pockets turned a sixth of the way
      f.afterKeep(2.5, () => snareLayer(ring(Math.PI / 3), d - 2.5 + between, new Set()));
      // the Egg-Laden: the two farthest from her tank (one if only two are standing)
      const tank = f.tank(), pool = f.alive().filter(p => !tank || p.id !== tank.id);
      const far = [...pool].sort((a, b) => (tank ? Math.hypot(b.x - tank.x, b.y - tank.y) - Math.hypot(a.x - tank.x, a.y - tank.y) : 0)).slice(0, f.alive().length > 2 ? 2 : 1);
      const drop = d + 1.0;   // (between the layers, with time to step out of it and on to the next pocket)
      for (const p of far) {
        f.debuff(p.id, 'laden', drop);
        f.mech({ type: 'drop', shape: { kind: 'circle', x: p.x, y: p.y, r: LADEN_R }, delay: drop, dmg: 0, follow: p.id, tag: 'eggdrop', avoidable: false,
          onResolve: () => {
            const q = f.alive().find(z => z.id === p.id);
            const at = q ? { x: q.x, y: q.y } : null;
            if (at) f.puddle(at.x, at.y, LADEN_R, 26, dmg.pool * 1.6, 1, 'venom');
          } });
      }
    };

    // --- the pillars ---------------------------------------------------------------------------------
    const pillars = () => f.props.filter(p => p.kind === 'pillar');
    // Acid Deluge: she scuttles to the middle, rears up and sprays the whole cave. Only a pillar's shadow is safe, and
    // every pillar that sheltered someone takes a hit. Hard: the floor the acid reached stays sticky for 8 s.
    const deluge = () => {
      const d = f.ct(5.5);
      f.moveBoss(0, 0, 600);
      B.lockFacing = true;
      f.cast('Acid Deluge', d, 'deluge');
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: 0, y: 0, r: 2400 }, delay: d, dmg: dmg.deluge, tag: 'deluge', cover: true, src: { x: 0, y: 0 }, chip: 'used',
        onResolve: () => {
          B.lockFacing = false;
          if (H) f.zone({ shape: { kind: 'lit', x: 0, y: 0, covers: pillars().map(p => [p.x, p.y, p.r]) }, dur: 8, tag: 'acid', effect: 'slow' });
        } });
    };
    // Strand Reel: a strand to a pillar (one well away from her), and she reels herself to it in a straight line. Anyone
    // on the line is hit and webbed; she hangs on the pillar for a few seconds, so her melee have to follow.
    const strandReel = () => {
      // along a thread still standing if there is one
      const far = pillars().filter(p => Math.hypot(p.x - B.x, p.y - B.y) > 260), tied = far.filter(p => room.threads.some(th => !th.cut && (th.a === p || th.b === p)));
      const opts = tied.length ? tied : far;
      if (!opts.length) return venomSpit();
      const pr = f.pick(opts), a = Math.atan2(pr.y - B.y, pr.x - B.x), len = Math.hypot(pr.x - B.x, pr.y - B.y) - pr.r;
      const d = f.ct(4);
      B.lockFacing = true; B.facing = a;
      f.cast('Strand Reel', d, 'strand', { x: pr.x, y: pr.y });
      f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: a, len, w: 120 }, delay: d, dmg: dmg.strand, tag: 'strand',
        onResolve: (inside) => {
          for (const p of inside) f.debuff(p.id, 'rooted', 2);
          if (!f.props.includes(pr)) { B.lockFacing = false; return; }
          const stop = Math.max(0, len - FIGHT.BOSS_R * 0.7 - 8);
          B.moveTo = { x: B.x + Math.cos(a) * stop, y: B.y + Math.sin(a) * stop, speed: 1000, done: () => { B.lockFacing = false; B.holdUntil = f.t + 4; } };
          f.anim('leap', 0.4);
        } });
    };
    // Ceiling Ambush (Hard): she climbs into the ceiling web; only her shadow crosses the floor, gathering speed, to
    // where someone stood when she went up. She drops there: hit hard, and thrown into the walls.
    const ambush = () => {
      const up = 1.5, dur = 5;
      f.cast('Ceiling Ambush', up, 'ambush');
      const who = f.pick(f.alive());
      if (!who) return;
      f.afterKeep(up, () => {
        B.untargetable = true; B.lockFacing = true;
        const mid = ARENA.clamp({ x: (f.rng() - 0.5) * 500, y: (f.rng() - 0.5) * 400 }, 160), end = ARENA.clamp({ x: who.x, y: who.y }, 120);
        const pts = [[Math.round(B.x), Math.round(B.y)], [Math.round(mid.x), Math.round(mid.y)], [Math.round(end.x), Math.round(end.y)]];
        f.emit({ t: 'roomev', k: 'ambush', pts, dur, ease: 1.7 });
        // the landing circle shows on the floor as well as her shadow (telegraphs are never hidden)
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: end.x, y: end.y, r: 230 }, delay: dur, dmg: dmg.ambush, tag: 'ambush', throwDist: 380,
          onResolve: inside => {
            B.x = end.x; B.y = end.y; B.untargetable = false; B.lockFacing = false;
            f.anim('leap', 0.3);
            for (const p of inside) f.knock(p, end.x, end.y, 380, { slam: dmg.slam });
          } });
      });
    };

    // --- the brood clock: six egg clutches in the web from the pull ------------------------------
    // Inert, breakable things (adds with HP). The two ripest (opposite each other) hatch as the Brood pair in Act I; every
    // clutch still standing hatches in the Swarm in Act II. A clutch broken first sends nothing.
    const CLUTCH = [0, 1, 3, 4, 5, 7].map(i => { const a = Math.PI / 2 + i * Math.PI / 4; return { x: Math.round(Math.cos(a) * 250), y: Math.round(Math.sin(a) * 250), ripe: i === 1 || i === 5 }; });
    const clutches = CLUTCH.map(c => f.spawnAdd({ kind: 'clutch', x: c.x, y: c.y, hp: dmg.clutchHp, r: 30, inert: true, ripe: c.ripe }));
    const liveClutches = () => clutches.filter(c => f.adds.has(c.id));
    // every client sees how ripe each clutch is: [x, y, seconds until it hatches (0: not yet known)]
    const broodClock = (ripeIn, swarmIn) => f.emit({ t: 'roomev', k: 'brood', dur: 9999,
      l: liveClutches().map(c => [c.x, c.y, Math.round(((c.hatchAt ? c.hatchAt - f.t : c.ripe ? ripeIn : swarmIn) || 0) * 10) / 10]) });
    const enrageAdd = a => {
      if (a.enraged) return;
      a.enraged = true; a.speed = 140; a.bite *= 3; a.furyAt = f.t + 1;
      a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.3));
      f.addsDirty = true;
      f.emit({ t: 'addev', k: 'enrage', id: a.id, x: Math.round(a.x), y: Math.round(a.y) });
    };
    // spiderlings in pairs: when one dies the other has 5 s to die, or it enrages; left 45 s, both do
    const spiderlings = (spots, hp, extra = {}) => {
      const made = spots.map(s => f.spawnAdd(Object.assign({
        kind: 'spiderling', x: s.x, y: s.y, hp, r: 30, speed: 60, bite: dmg.bite, biteEvery: 2, leash: 240, spit: dmg.bite * 0.6,
        linkDmg: H ? dmg.beam : 0,
        onDeath: dead => { const o = f.adds.get(dead.link); if (o && !o.deadline) o.deadline = f.t + 5; },
        onTick: ad => {
          if (!ad.enraged && ((ad.deadline && f.t >= ad.deadline) || f.t - ad.born > 45)) enrageAdd(ad);
          if (ad.enraged && f.t >= ad.furyAt) {
            ad.furyAt = f.t + 3;
            f.emit({ t: 'addev', k: 'fury', id: ad.id, x: Math.round(ad.x), y: Math.round(ad.y) });
            for (const p of f.alive()) f.damagePlayer(p, dmg.fury, { kind: 'fury' });
          }
        },
      }, extra)));
      for (let i = 0; i + 1 < made.length; i += 2) { made[i].link = made[i + 1].id; made[i + 1].link = made[i].id; }
      return made;
    };
    // a clutch splits: it goes, and its spiderlings come out on the near side of it (the side toward the middle: the
    // threads run past the clutches on their far side, and nobody should have to cross one to reach what hatches)
    const hatch = (c, perClutch) => {
      f.adds.delete(c.id); f.addsDirty = true; f.emit({ t: 'addev', k: 'gone', id: c.id });
      f.emit({ t: 'eggs', pts: [[c.x, c.y]], dur: 0.6 });
      const out = Math.atan2(c.y, c.x) + Math.PI, spots = [];
      for (let k = 0; k < perClutch; k++) { const a = out + (k - (perClutch - 1) / 2) * 0.9; spots.push({ x: c.x + Math.cos(a) * 50, y: c.y + Math.sin(a) * 50 }); }
      return spots;
    };
    let swarmAt = null;
    // a Time Stop (fight.js pauseBoss) slides her Brood and Swarm steps later: the clock on the clutches goes with them
    f.onPause = dur => {
      const step = n => f.events.find(e => e.step && e.name === n), br = step('Brood'), sw = step('The Swarm');
      if (sw) swarmAt = sw.t + f.ct(3); else if (swarmAt != null && swarmAt > f.t) swarmAt += dur;
      if (liveClutches().length) broodClock(br ? br.t - f.t + f.ct(3) : 0, swarmAt != null ? swarmAt - f.t : 0);
    };
    // Brood (Act I): the two ripest clutches hatch, one spiderling each: a pair across the web
    const brood = () => {
      const d = f.ct(3);
      f.moveBoss(0, 0, 600);   // (she broods from the hub)
      f.cast('Brood', d, 'brood');
      f.after(d, () => {
        spiderlings(liveClutches().filter(c => c.ripe).flatMap(c => hatch(c, 1)), dmg.broodHp);
        broodClock(0, swarmAt != null ? swarmAt - f.t : 0);
      });
    };
    // the Swarm (Act II): every clutch still standing hatches at once, two to a clutch (three on Hard)
    const swarm = () => {
      const d = f.ct(3);
      f.cast('The Swarm', d, 'brood');
      f.after(d, () => {
        for (const c of liveClutches()) spiderlings(hatch(c, H ? 3 : 2), dmg.swarmHp);
        f.emit({ t: 'roomev', k: 'brood', dur: 0, l: [] });
      });
    };

    // --- the threads: Spin, and the knots that cut them ------------------------------------------
    // Four threads pillar to pillar, a square round the middle. Crossing one stings and roots you for a moment. Each
    // has a knot by its first pillar (an inert add): break it and the thread is cut for good. A pillar that falls cuts
    // its threads too. In the dark she runs along the uncut ones in turn; in the collapse they're floor.
    const PILLAR_A = i => Math.PI / 2 + Math.PI / 8 + i * Math.PI / 4;
    const pillarAt = i => f.props.find(p => p.kind === 'pillar' && Math.hypot(p.x - Math.cos(PILLAR_A(i)) * 375, p.y - Math.sin(PILLAR_A(i)) * 375) < 5);
    const cutThread = th => {
      if (th.cut) return;
      th.cut = true;
      if (th.fl) f.removeFloor(th.fl);
      if (th.knot && f.adds.has(th.knot.id)) { f.adds.delete(th.knot.id); f.addsDirty = true; f.emit({ t: 'addev', k: 'gone', id: th.knot.id }); }
      f.emit({ t: 'propfx', k: 'chip', x: Math.round(th.kx), y: Math.round(th.ky), kind: 'pillar' });
    };
    const spin = () => {
      const d = f.ct(3.5);
      f.cast('Spin', d, 'silk');
      f.after(d, () => {
        [[0, 2], [2, 4], [4, 6], [6, 0]].forEach(([i, j], n) => {
          const a = pillarAt(i), b = pillarAt(j);
          if (!a || !b) return;
          const L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
          const x1 = a.x + ux * (a.r + 4), y1 = a.y + uy * (a.r + 4), x2 = b.x - ux * (b.r + 4), y2 = b.y - uy * (b.r + 4);
          const th = { id: n, order: n, a, b, x1, y1, x2, y2, kx: a.x + ux * (a.r + 44), ky: a.y + uy * (a.r + 44), cut: false, last: {} };
          th.fl = f.addFloor({ kind: 'thread', x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2), r: Math.round(L / 2), x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2) });
          th.knot = f.spawnAdd({ kind: 'knot', x: th.kx, y: th.ky, hp: dmg.knotHp, r: 24, inert: true, onDeath: () => cutThread(th) });
          room.threads.push(th);
        });
      });
    };
    const uncut = () => room.threads.filter(th => !th.cut);
    f.ticker(() => {
      for (const th of room.threads) {
        if (th.cut) continue;
        // a fallen pillar cuts its threads
        if (!f.props.includes(th.a) || !f.props.includes(th.b)) { cutThread(th); continue; }
        // walking through one stings and roots (the knots themselves are safe to stand by)
        for (const p of f.alive()) {
          if (PROPS.segDist(p.x, p.y, th.x1, th.y1, th.x2, th.y2) > 14 || f.t - (th.last[p.id] ?? -9) < 2) continue;
          if (Math.hypot(p.x - th.kx, p.y - th.ky) < 50) continue;
          th.last[p.id] = f.t;
          f.damagePlayer(p, dmg.sting, { kind: 'thread', avoidable: true, noVuln: true });
          f.debuff(p.id, 'rooted', 0.7);
        }
      }
      // what the bots break (once no spiderling is loose): in the dark, the knot she's running to next, then the eggs (the ones
      // about to split first); in the light, an unripe clutch or two while more than four stand
      const hostile = [...f.adds.values()].some(a => !a.inert);
      const next = room.dark && !room.grounded ? uncut().find(th => th.order >= room.runAt) : null;
      for (const th of room.threads) if (th.knot && f.adds.has(th.knot.id)) th.knot.prio = next === th && !hostile ? 6 : 0;
      for (const c of liveClutches()) c.prio = hostile || room.grounded ? 0 : room.dark ? (c.hatchAt ? 3 : 0) : liveClutches().length > 4 && !c.ripe ? 2 : 0;
    });

    // --- The Dark Between: she's gone into the dark for about 30 s --------------------------------------
    let from = { x: 0, y: 0 };
    // The brood does not wait while she is up there: three times the clutch with the shortest clock splits (the clock
    // shows on the egg) and what comes out runs at the tank: one spiderling, on Hard a linked pair with its beam. A
    // clutch broken first sends nothing.
    const HATCH_AT = H ? [3.5, 13, 24] : [3, 11, 19.5];
    const strayHp = H ? 42000 : 55000;
    const darkHatch = c => {
      c.hatchAt = 0;
      if (!f.adds.has(c.id)) return;
      const spots = hatch(c, H ? 2 : 1);
      spiderlings(spots, strayHp, { leash: 0, speed: 85 });
      broodClock(0, swarmAt != null ? swarmAt - f.t : 0);
    };
    const intoDark = () => {
      f.cast('Into the Dark', 2, 'ambush');
      f.afterKeep(2, () => {
        B.untargetable = true; B.lockFacing = true;
        room.dark = true; room.runAt = 0; from = { x: B.x, y: B.y };
        f.emit({ t: 'roomev', k: 'lightsout', r: 120, extra: f.props.filter(p => p.kind === 'pillar').map(p => ({ x: p.x, y: p.y })), dur: H ? 35.5 : 30.5 });
        const stand = liveClutches().slice(0, Math.max(0, liveClutches().length - 1));   // (one is always left for the Swarm)
        HATCH_AT.forEach((at, i) => {
          const c = stand[i];
          if (!c) return;
          c.hatchAt = f.t + at;
          f.afterKeep(at, () => darkHatch(c));
        });
        broodClock(0, swarmAt != null ? swarmAt - f.t : 0);
      });
    };
    // The Dark Between is all reaction. She runs a thread overhead and drops at its far end (Hard: then back to the near
    // end), so which drops come, and where, is the party's doing: a thread already cut she cannot use, and hunts instead:
    // her shadow goes to whoever stands farthest from her and drops there (lighter than the thread's drop, and the circle
    // follows its mark until 1.6 s out). In between she lets a cocoon fall on a random one of them (a shared hit: everyone
    // in), and the dark drips on whoever is where.
    const DROP = 4.5, LOCK = 1.6, GAP2 = 3.6;
    // THE PUNISH WINDOW. Her body comes down with the drop: she lands at the point the circle falls on, crouches on the stone and
    // can be hit for a few seconds (from the moment the circle lands, so: dodge the impact, then punish), then hauls herself back up
    // her silk, out of reach, and runs on to the next drop. A thread's drop keeps her down longer (4 s; Hard 2.7 s to the first
    // point, as she must spring to the second before its circle lands 3.6 s behind the first, then 3 s at the last); a hunted
    // drop (a cut thread) is shorter (2.5 s; Hard 2 s), so cutting threads is a trade. Nothing of hers hurts while she is down (no
    // autos, no casts of her own, facing held), and nothing can stagger or stop her: b.noStagger (fight.js kenAdd) holds a
    // Kenseier's Posture off, the Time Stop (f.noPause) is refused, nothing here sets stunUntil.
    const STAY = H ? [2.7, 3] : [4, 4], STAY_HUNT = H ? 2 : 2.5;
    let groundEnd = 0;   // when the last window laid out so far closes (a drop lays its windows out as it is called)
    f.noPause = () => !!room.grounded;
    const land = (at, stay) => {
      room.grounded = true;
      B.x = at.x; B.y = at.y; B.facing = Math.atan2(-at.y, -at.x);
      B.untargetable = false; B.noStagger = true; B.noAutoUntil = f.t + stay + 0.2; B.autoAt = Math.max(B.autoAt, f.t + stay + 0.2);
      f.emit({ t: 'roomev', k: 'grounded', x: Math.round(at.x), y: Math.round(at.y), dur: stay });
      f.afterKeep(stay, climb);
    };
    // she hauls herself up the silk and is gone again (the next shadow starts from here)
    const climb = () => {
      if (!room.grounded) return;
      room.grounded = false; B.noStagger = false; B.untargetable = true;
    };
    // one drop of the hunt: her shadow goes to whoever stands farthest from where she last landed, and she drops there
    // (the circle follows its mark until LOCK s out)
    const huntDrop = (wait, mul, shadow = true, stay = 0) => {
      const al = f.alive();
      if (!al.length) return;
      const far = [...al].sort((a, b) => Math.hypot(b.x - from.x, b.y - from.y) - Math.hypot(a.x - from.x, a.y - from.y))[0];
      const lock = Math.min(LOCK, wait - 1.5);
      const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: far.x, y: far.y, r: H ? 170 : 150 }, delay: wait, dmg: dmg.drop * mul,
        follow: far.id, lockAt: lock, tag: 'ambush' });
      let spot = null;
      f.afterKeep(wait - lock, () => {
        const at = ARENA.clamp({ x: m.shape.x, y: m.shape.y }, 90);
        spot = at;
        if (stay) { B.x = at.x; B.y = at.y; }   // (up in the dark and out of sight: the body is already where she lands)
        if (shadow) f.emit({ t: 'roomev', k: 'ambush', pts: [[Math.round(from.x), Math.round(from.y)], [Math.round(at.x), Math.round(at.y)]], dur: lock, ease: 1.2 });
        from = at;
      });
      if (stay) { groundEnd = Math.max(groundEnd, f.t + wait + stay); f.afterKeep(wait, () => spot && land(spot, stay)); }
    };
    // Hard: once she has landed she hunts the next farthest from where she came down, 3.6 s later (a circle that only
    // appears when the first has landed, not stacked behind it)
    const hunt = () => {
      f.cast('From the Dark', DROP, 'ambush');
      huntDrop(DROP, H ? 1 : 0.7, true, STAY_HUNT);
      if (H) f.afterKeep(DROP + 0.05, () => huntDrop(GAP2, 1, true, STAY_HUNT));
    };
    // The finale's hunt: she does not need to leave to find you. From the web overhead her weight falls on whoever stands
    // farthest out on the silk, then on whoever is farthest from where it landed, three times in turn (four on Hard,
    // closer together): run it along the silk without stepping off.
    const lastHunt = () => {
      from = { x: B.x, y: B.y };
      f.cast('From the Dark', DROP, 'ambush');
      huntDrop(DROP, H ? 0.9 : 0.7, false);
      const more = H ? 3 : 2, gap = H ? 3.4 : 3.8;
      for (let i = 0; i < more; i++) f.afterKeep(DROP + 0.05 + i * gap, () => huntDrop(gap, H ? 0.9 : 0.7, false));
    };
    const dropFrom = k => {
      room.runAt = k + 1;
      const th = room.threads.find(t => t.order === k);
      if (!th || th.cut) return hunt();
      f.cast('From the Dark', DROP, 'ambush');
      const ends = H ? [[th.x2, th.y2], [th.x1, th.y1]] : [[th.x2, th.y2]];
      // (her shadow sets out when she is up again: the moment the last drop's window closes, or at once)
      ends.forEach(([ex, ey], i) => {
        const at = ARENA.clamp({ x: ex * 0.86, y: ey * 0.86 }, 90), lands = DROP + i * GAP2;
        const go = i === 0 ? Math.max(0, groundEnd - f.t) : DROP + (i - 1) * GAP2 + STAY[i - 1];
        f.afterKeep(go, () => {
          f.emit({ t: 'roomev', k: 'ambush', pts: [[Math.round(from.x), Math.round(from.y)], [Math.round(at.x), Math.round(at.y)]], dur: lands - go, ease: 1.2 });
          from = at; B.x = at.x; B.y = at.y;
        });
        f.aoe({ kind: 'circle', x: at.x, y: at.y, r: 190 }, lands, dmg.drop, { tag: 'ambush' });
        groundEnd = Math.max(groundEnd, f.t + lands + STAY[i]);
        f.afterKeep(lands, () => land(at, STAY[i]));
      });
    };
    // Cocoon Drop: a cocoon falls on one of them (never the tank); whoever it is, the rest of the party has to be in it
    const cocoonDrop = () => {
      const al = f.alive();
      if (al.length < 2) return;
      const p = f.pick(f.nonTanks().length ? f.nonTanks() : al), d = f.ct(5);
      f.cast('Cocoon Drop', f.ct(3), 'brood');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.cocoon * Math.min(al.length, 4) / 4, follow: p.id,
        need: H ? al.length : Math.max(1, al.length - 1), tag: 'stack' });
    };
    const venomDrip = noCast => {
      const d = f.ct(4);
      if (!noCast) f.cast('Venom Drip', d, 'spit');
      for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 100 }, delay: d, dmg: dmg.drip, follow: p.id, tag: 'spread' });
    };
    // she comes back down into the middle, and the outer web turns sticky for the rest of the fight
    const comeBack = () => {
      const d = 4;
      room.dark = false;
      // (if she is still down from the last drop she climbs when her window closes, and the shadow runs home from there)
      const go = Math.min(d - 0.8, Math.max(0, groundEnd - f.t));
      f.afterKeep(go, () => { f.emit({ t: 'roomev', k: 'ambush', pts: [[Math.round(from.x), Math.round(from.y)], [0, 0]], dur: d - go, ease: 1.2 }); B.x = 0; B.y = 0; });
      f.cast('Tightening Web', d, 'web');
      f.afterKeep(d, () => {
        room.grounded = false; B.noStagger = false;
        B.x = 0; B.y = 0; B.untargetable = false; B.lockFacing = false;
        for (const c of liveClutches()) c.hatchAt = 0;
        f.anim('leap', 0.4);
        f.zone({ shape: { kind: 'donut', x: 0, y: 0, r: ARENA.R + 40, r2: 390 }, tag: 'sticky', effect: 'slow' });
        f.raidwide(dmg.mist * 0.8, 0);
      });
    };

    // --- The Collapse: the floor falls away to the silk ------------------------------------------
    // Rings fall from the wall inward. What stays: the hub, the eight spokes (center to each pillar's place) and every
    // thread nobody cut. Each ring shudders for 6 s first, drawn with the silk cut out of it.
    const RINGS = [[430, 2000], [330, 430], [260, 330], [215, 260]];   // (the last takes the hub down to a disc not much wider than she is)
    const SPOKE_W = 80;
    const paths = () => {
      const out = [];
      for (let i = 0; i < 8; i++) out.push([0, 0, Math.round(Math.cos(PILLAR_A(i)) * 600), Math.round(Math.sin(PILLAR_A(i)) * 600), SPOKE_W]);
      for (const th of uncut()) out.push([Math.round(th.x1), Math.round(th.y1), Math.round(th.x2), Math.round(th.y2), SPOKE_W]);
      return out;
    };
    const onSilk = (x, y, list) => list.some(([x1, y1, x2, y2, w]) => PROPS.segDist(x, y, x1, y1, x2, y2) < w / 2);
    // for the bots: is this spot floor now, and will it still be once the ring that's shuddering goes?
    room.safe = (x, y, soon) => { const r = Math.hypot(x, y), edge = soon && room.warn ? Math.min(room.fallen, room.warn.r2) : room.fallen; return r < edge || onSilk(x, y, paths()); };
    const giveWay = k => {
      const [r2, r] = RINGS[k], warn = 6;
      f.cast('The Web Gives Way', warn, 'web');
      const list = paths();
      room.warn = { r2 };
      f.emit({ t: 'roomev', k: 'collapse', r2, r, paths: list, dur: warn });
      f.afterKeep(warn, () => {
        room.fallen = r2; room.warn = null;
        f.addFloor({ kind: 'pit', x: 0, y: 0, r, r2, paths: list });
        for (const pr of [...f.props]) if (Math.hypot(pr.x, pr.y) > r2 - pr.r) f.breakProp(pr, 'fall');
      });
    };
    // anyone on fallen floor drops: hurt, held, and hauled back up onto the floor nearer the middle
    const fellAt = {};
    f.ticker(() => {
      if (room.fallen === Infinity) return;
      const list = paths();
      for (const p of f.alive()) {
        if (Math.hypot(p.x, p.y) < room.fallen || onSilk(p.x, p.y, list) || f.t - (fellAt[p.id] ?? -9) < 3) continue;
        fellAt[p.id] = f.t;
        f.damagePlayer(p, dmg.fall, { kind: 'fall', avoidable: true, noVuln: true });
        f.debuff(p.id, 'rooted', 2);
        f.emit({ t: 'propfx', k: 'fall', x: Math.round(p.x), y: Math.round(p.y), pid: p.id });
        const back = Math.max(0, Math.hypot(p.x, p.y) - room.fallen + 40);
        f.afterKeep(2.1, () => { const q = f.alive().find(z => z.id === p.id); if (q && back > 0) f.knock(q, q.x * 2, q.y * 2, back); });
      }
    });

    // --- the hunt ---------------------------------------------------------------------------------
    // The Chrysalis (a hard damage check): as the Collapse begins she wraps herself in silk at the hub. Tear 5% of her
    // health off before it closes and she falls out of it, staggered and open for 8 s; let it close and she devours.
    const chrysalis = () => {
      f.dpsCheck('Chrysalis', H ? 24 : 25, 0.05, { anim: 'chrysalis',
        onPass: () => { B.stunUntil = f.t + 8; B.exposedUntil = f.t + 8; B.exposed = 0.25; f.emit({ t: 'roomev', k: 'torn', dur: 8 }); },
        onFail: () => f.enrage(),
      });
    };

    // Act I, The Web. Each movement is a move on its own with room round it (13 to 16 s of calm); a pair only where the pair is the
    // point: the opening (Mist into Wrap), the Spit pools under a Lunge, the threads and the pillars (Spin into Deluge). The threads
    // (Spin) go up only after the Spit-Lunge and the charges (Strand Reel, Hard: Fang Rush) are done, so the first Lunge is fought
    // across pools with no silk to cross and the charges land on a bare floor; the Wrap-Lunge later is fought across the threads with
    // no pools left. Hard reads two stretches in a new order each pull: the brood (Brood, Egg Sacs) and the charges trade ends round
    // the Spit-Lunge, and Lines and the Reel trade places near the end of the act.
    const oneN = () => [
      S([5, venomMist, 'Venom Mist'], [10, () => silkWrap(), 'Silk Wrap']),
      S([15, brood, 'Brood']),
      fsIn(S([15, venomMist, 'Venom Mist']), 7),
      S([15, strandReel, 'Strand Reel']),
      fsIn(S([15, () => silkReel(), 'Silk Reel']), 7),
      fsIn(S([14, venomSpit, 'Venom Spit'], [6.5, () => lunge(), 'Eightfold Lunge']), 12),
      fsIn(S([16, () => venomDrip(), 'Venom Drip']), 6.5),
      S([14, spin, 'Spin'], [12, deluge, 'Acid Deluge']),
      fsIn(S([14, () => silkLines(), 'Silk Lines']), 9),
      S([16, wrapLunge, 'Eightfold Lunge']),
      S([14, venomMist, 'Venom Mist']),
    ];
    const oneH = () => {
      // the N sets (no healer beat) are kept apart by Mists, the Reel and the Deluge; the brood and the charges trade places each pull
      const g1 = [S([13, brood, 'Brood']), fsIn(S([13, eggSacs, 'Egg Sacs']), 8)];
      const g2 = [S([13, strandReel, 'Strand Reel']), fsIn(S([14, fangRush, 'Fang Rush']), 7)];
      const [a, b] = f.rng() < 0.5 ? [g1, g2] : [g2, g1];
      return [
        S([5, venomMist, 'Venom Mist'], [9, () => silkWrap(), 'Silk Wrap']),
        a[0], a[1],
        fsIn(S([13, () => venomDrip(), 'Venom Drip']), 7),
        fsIn(S([13, venomSpit, 'Venom Spit'], [6.5, () => lunge(), 'Eightfold Lunge']), 12.5),
        S([16, () => silkReel(), 'Silk Reel']),
        b[0],
        fsIn(S([14, venomMist, 'Venom Mist']), 7),
        b[1],
        S([13, spin, 'Spin'], [12, deluge, 'Acid Deluge']),
        fsIn(S([14, () => silkLines(), 'Silk Lines']), 8.5),
        S([18, wrapLunge, 'Eightfold Lunge']),
        S([13, venomMist, 'Venom Mist']),
      ];
    };
    // A slow party's closing loops (f.course closing: they run again and again once an act's sets are spent, each pass with more boss
    // damage). Not one dodge-heavy pair on repeat: a ring of different moves from her kit with 10 to 14 s between them, a tank beat
    // (Fang Strike, Strand Reel, the Wrap) and a healer beat (Mist, Reel, Cocoon, Wrap) in every stretch, and no more than one Lunge a
    // pass (none in Act I, where the threads are up). The Deluge is left out (every use chips the pillars) and so is the Swarm (the clutches are spent).
    const FS = (d, twin) => [d, () => fangStrike(twin), 'Fang Strike'];
    const closeOne = () => [
      [12, strandReel, 'Strand Reel'], [11, venomMist, 'Venom Mist'], [11, () => silkLines(), 'Silk Lines'], FS(10),
      [12, () => silkReel(), 'Silk Reel'], H ? [12, fangRush, 'Fang Rush'] : [12, venomSpit, 'Venom Spit'], FS(11), [13, () => silkWrap(), 'Silk Wrap'],
    ];
    const closeTwo = () => H ? [
      [12, () => silkReel('healer'), 'Silk Reel'], [12, eggSacs, 'Egg Sacs'], FS(11), [12, () => venomDrip(), 'Venom Drip'], [13, snareWeave, 'Snare Weave'],
      FS(11), [12, venomMist, 'Venom Mist'], [13, strandReel, 'Strand Reel'], [6, rimLunge, 'Eightfold Lunge'], [13, () => silkWrap(), 'Silk Wrap'],
    ] : [
      [12, venomSpit, 'Venom Spit'], FS(12), [12, () => silkReel(), 'Silk Reel'], [12, strandReel, 'Strand Reel'], [6, rimLunge, 'Eightfold Lunge'],
      [14, cocoonDrop, 'Cocoon Drop'], FS(12), [13, venomMist, 'Venom Mist'], [13, () => silkWrap(), 'Silk Wrap'],
    ];
    const closeThree = () => [
      [12, () => silkReel(H ? 'healer' : null), 'Silk Reel'], FS(11, true), [12, () => silkLines(), 'Silk Lines'], [12, cocoonDrop, 'Cocoon Drop'], FS(12, true),
      [12, wrapLunge, 'Eightfold Lunge'], [12, lastHunt, 'From the Dark'], [12, venomMist, 'Venom Mist'], FS(11, true), [12, () => venomDrip(), 'Venom Drip'],
    ];

    const actOne = at => f.course({
      until: 0.7,
      sets: weave(H ? oneH() : oneN()),
      closing: closeOne(), ramp: 0.12,   // (a party that is behind meets the Reel and the Strand, not a Lunge over the Spit pools and the threads)
      next: dark,
    }, at);

    // (cast-free gaps stay under 4 s whatever the party cuts; the Hard drop's second landing is 3.6 s behind its first)
    // (Hard: the cocoon and the drip trade places each pull, read from their casts)
    const dark = at => { const dripFirst = H && f.rng() < 0.5; return f.course({
      onStart: () => { f.clearTethers(); f.clearReels(); },
      sets: [
        S([2, intoDark, 'Into the Dark']),
        S([3, () => dropFrom(0), 'From the Dark']),
        S([6, ...(dripFirst ? [() => venomDrip(), 'Venom Drip'] : [cocoonDrop, 'Cocoon Drop'])]),
        S([3.5, () => dropFrom(1), 'From the Dark']),
        S([H ? 8 : 5.5, ...(dripFirst ? [cocoonDrop, 'Cocoon Drop'] : [() => venomDrip(), 'Venom Drip'])]),
        S([H ? 5 : 4.5, () => dropFrom(2), 'From the Dark']),
        S([H ? 8 : 6, comeBack, 'Tightening Web']),   // (three drops: the dark ran long with four; the cast waits out the last window)
        S([6]),
      ],
      next: actTwo,
    }, at); };

    // Act II, The Brood: movements of two (a move and the one that answers it), 10 to 12 s of calm between them and 4 to 10 s
    // inside. The rim Lunge: Strand Reel hangs her on a pillar and the Lunge that follows is struck from there, sweeping the
    // cave like a wiper from the wall. Reel into Spit drags someone across the pools; Lines into Lunge lands the strikes as the
    // lines come due; the Swarm into the Wrap holds the tank under what hatched.
    // Tank and healer: the tank's work is the Wrap, the brood to hold and the places she is moved to (a Strand Reel, the Deluge,
    // Molt, Fang Rush, Snare Weave), the healer's the Mists, the Reels and the Deluge; the movements are laid so that one or the
    // other has a beat in nearly every one of them, and the two Wraps stay a long way apart.
    const rimLunge = () => lunge(Math.hypot(B.x, B.y) > 150 ? { a0: Math.atan2(-B.y, -B.x) + (f.rng() - 0.5) * 0.6 } : {});
    // Hard reads Act II in a new order each pull, but only where the swap is safe: the Wrap-Lunge and the Volley (with its Wrap) trade the
    // first and last slots (so the two Wraps are always far apart), and Egg Sacs and Molt trade places round the first Mist. The Spit
    // is not in this act (its 45 s pools could not avoid lying under a Lunge), the Swarm needs the middle of the act for the clutches
    // to be broken first, and the Mists keep the healer's beats about 35 s apart, so those movements keep their places.
    const hardTwo = () => {
      const swap = (a, b) => (f.rng() < 0.5 ? [a, b] : [b, a]);
      const mkW = (c, wl) => wl ? S([c, wrapLunge, 'Eightfold Lunge']) : S([c, volley, 'Spinneret Volley'], [9, () => { silkReel('healer'); silkWrap(); }, 'Silk Reel']);
      const wlFirst = f.rng() < 0.5;
      const [w1, w2] = [mkW(9.5, wlFirst), mkW(15.5, !wlFirst)];
      const [e1, e2] = swap(fsIn(S([14, eggSacs, 'Egg Sacs']), 8), S([14, molt, 'Molt']));
      return [
        w1,
        e1,
        fsIn(S([14, venomMist, 'Venom Mist']), 7),
        e2,
        S([14, swarm, 'The Swarm'], [9, () => silkWrap(), 'Silk Wrap']),
        S([14, strandReel, 'Strand Reel'], [6, rimLunge, 'Eightfold Lunge']),
        S([14, snareWeave, 'Snare Weave'], [9, deluge, 'Acid Deluge']),
        fsIn(S([14, ambush, 'Ceiling Ambush']), 9.5),
        fsIn(S([14, () => venomDrip(), 'Venom Drip']), 7),
        fsIn(S([14, () => silkLines(), 'Silk Lines'], [4, () => lunge(), 'Eightfold Lunge']), 14),
        S([14, venomMist, 'Venom Mist']),
        w2,
      ];
    };
    // Normal: eleven sets, the healer's and the non-healer's beats taking turns, three Lunges that each have a twist (the Wrap-Lunge,
    // the rim Lunge from the wall, the Lines-Lunge), the Swarm and its Wrap far enough apart that they are two problems.
    const twoN = () => [
      S([9.5, wrapLunge, 'Eightfold Lunge']),
      fsIn(S([15.5, venomSpit, 'Venom Spit']), 8),
      fsIn(S([15.5, venomMist, 'Venom Mist']), 7),
      fsIn(S([15.5, () => silkLines(), 'Silk Lines']), 10),
      S([15.5, () => silkReel(), 'Silk Reel']),
      S([15.5, strandReel, 'Strand Reel'], [6, rimLunge, 'Eightfold Lunge']),
      S([15.5, deluge, 'Acid Deluge']),
      fsIn(S([15.5, swarm, 'The Swarm']), 7),
      S([15.5, () => silkWrap(), 'Silk Wrap']),
      fsIn(S([15.5, cocoonDrop, 'Cocoon Drop']), 7),
      S([15.5, () => silkLines(), 'Silk Lines'], [4, () => lunge(), 'Eightfold Lunge']),
      S([15.5, venomMist, 'Venom Mist']),
    ];
    const twoSets = () => weave(H ? hardTwo() : twoN()).filter(Boolean);
    const actTwo = at => {
      // the Swarm's own clock on the clutches follows where its step falls in the sets
      const sets = twoSets();
      let swarmIn = 0, tt = 0;
      for (const set of sets) for (const [dt, , name] of set) { tt += dt; if (name === 'The Swarm') swarmIn = tt; }
      return f.course({
        until: 0.28,
        onStart: () => { swarmAt = f.t + swarmIn + f.ct(3); broodClock(0, swarmAt - f.t); },
        sets,
        closing: closeTwo(), ramp: 0.12,
        next: actThree,
      }, at);
    };

    // Act III, The Collapse: nothing is quiet for long. The Reel, the Lines and the Lunge are all fought on thinning silk,
    // a fourth ring takes the hub down to a disc, and the hunt comes last: she hunts whoever stands farthest out along the
    // spokes, the whole act's lesson in the last half minute (the Wraps are spread out: one early, one in the middle, one
    // before the end). Hard moves the Wrap and the Mist/Reel that follow the rings round each pull.
    const actThree = at => {
      // (each follows a ring, so it waits out the ring's 6 s cast: a step any sooner would cut its cast bar short)
      const wrapStep = [6, () => silkWrap(), 'Silk Wrap'], mistStep = [6, venomMist, 'Venom Mist'], reelStep = [6, () => silkReel('healer'), 'Silk Reel'];
      let R = [wrapStep, [6, venomMist, 'Venom Mist'], [6, () => silkReel(), 'Silk Reel']];
      // Hard: the Wrap comes first (then the Wrap-Lunge in the middle) or last (the Wrap-Lunge early), the Mist and the Reel
      // fill the other two rings, so the tank's two blows are always a long way apart and the order is read each pull
      const wrapFirst = !H || f.rng() < 0.5;
      if (H) { const ends = f.shuffle([mistStep, reelStep]); R = wrapFirst ? [wrapStep, ends[0], ends[1]] : [ends[0], ends[1], wrapStep]; }
      const linesLunge = S([H ? 10 : 6.5, () => silkLines(), 'Silk Lines'], [4, () => lunge(), 'Eightfold Lunge']);
      const wrapLungeSet = S([H ? 9 : 7, wrapLunge, 'Eightfold Lunge'], H && [9, volley, 'Spinneret Volley']);
      const [early, mid] = wrapFirst ? [linesLunge, wrapLungeSet] : [wrapLungeSet, linesLunge];
      const ring0 = S([H ? 10 : 11, () => giveWay(0), 'The Web Gives Way'], R[0]);
      const ring1 = S([H ? 7 : 6, () => giveWay(1), 'The Web Gives Way'], H ? R[1] : [6, venomMist, 'Venom Mist']);
      const ring2 = S([H ? 7 : 5, () => giveWay(2), 'The Web Gives Way'], [6, () => venomDrip(), 'Venom Drip']);
      const ring3 = S([H ? 7 : 4, () => giveWay(3), 'The Web Gives Way'], R[2]);
      // the tank's Fang Strikes of the Collapse, each well clear of a Wrap. Normal: after the second ring's Mist (a good way ahead of the
      // Wrap-Lunge) and after the last ring. Hard (a second lane each): after the second ring when the Wrap-Lunge is early, after the
      // third, and after the last ring when the Wrap itself is not on it
      if (!H) return f.course({
        sets: weave([
          S([2, chrysalis, 'Chrysalis'], [12, () => venomDrip(true), 'Venom Drip']),
          S([11, () => giveWay(0), 'The Web Gives Way'], [6, () => silkWrap(), 'Silk Wrap']),
          S([11, () => silkLines(), 'Silk Lines'], [4, () => lunge(), 'Eightfold Lunge']),
          fsIn(S([10, () => giveWay(1), 'The Web Gives Way'], [6, () => venomDrip(), 'Venom Drip']), 4.5),
          S([12, wrapLunge, 'Eightfold Lunge']),
          S([8, () => giveWay(2), 'The Web Gives Way'], [6, venomMist, 'Venom Mist']),
          fsIn(S([10, () => giveWay(3), 'The Web Gives Way'], [6, () => silkReel(), 'Silk Reel']), 6.5),
          S([14, () => silkWrap(), 'Silk Wrap']),
          S([6.5, () => silkLines(), 'Silk Lines'], [5, lastHunt, 'From the Dark']),
        ]),
        closing: closeThree(),
        ramp: 0.06,
      }, at);
      if (H) { if (!wrapFirst) withFS(ring1, 5.5, 3, true); withFS(ring2, 5.2, 2, true); if (wrapFirst) withFS(ring3, 5.2, 4, true); }
      return f.course({
        sets: weave([
          S([2, chrysalis, 'Chrysalis'], [12, () => venomDrip(true), 'Venom Drip']),   // venom drips from the cocoon as it closes
          wrapFirst ? fsIn(ring0, 13.5, true) : ring0,
          early,
          ring1,
          mid,
          ring2,
          ring3,
          H ? S([11, () => lunge(), 'Eightfold Lunge'], [9, () => silkReel('healer'), 'Silk Reel']) : S([10, () => silkWrap(), 'Silk Wrap']),
          S([H ? 8 : 6.5, () => silkLines(), 'Silk Lines'], [5, lastHunt, 'From the Dark']),
        ].filter(Boolean)),
        closing: closeThree(),
        ramp: 0.06,   // the burn: gentler, it never ends
      }, at);
    };

    actOne(0);
    { const br = f.events.find(e => e.step && e.name === 'Brood'); broodClock(br ? br.t - f.t + f.ct(3) : 0, 0); }   // (the Brood step's time, plus its cast)

    f.moves = { venomMist, lunge, silkWrap, wrapLunge, silkLines, venomSpit, brood, swarm, molt, silkReel, eggSacs, fangRush, volley, deluge,
      strandReel, ambush, snareWeave, fangStrike, spin, intoDark, dropFrom, venomDrip, comeBack, giveWay, lastHunt };
  },
};

if (typeof module !== 'undefined') module.exports = { SKITTERRA };
