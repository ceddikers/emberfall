// Boss II: Queen Skitterra, the Spider Broodmother — "The Web Cave". The hunt in the web.
// One authored hunt, the same on every pull: long dread, then sudden swarms. The question is always what to break:
// egg clutches (each one broken costs damage on her now, and is two fewer spiderlings later), the knots of her threads
// (each one cut is one less drop in the dark, and one less strip of floor at the end), and her pillars (every Acid
// Deluge chips the ones you hide behind).
//   Act I, The Web (100% → 70%): one thing at a time, 14–15 s apart. Venom Mist, Silk Wrap (buster, roots), Eightfold
//     Lunge (the safe side rotates), Silk Lines (stretch), Spin (four threads pillar to pillar: crossing one stings and
//     roots), Venom Spit, Strand Reel, Brood (the two ripest of the six clutches in the web hatch: kill them together),
//     Silk Reel, Acid Deluge (hide behind a pillar).
//   The Dark Between (70%): she climbs into the dark for 40 s. The cave falls to pools of light; her shadow runs along
//     each uncut thread in turn and she drops where it ends. Breaking a thread's knot before she gets there spares you
//     that drop, and the eggs can be broken meanwhile too. She comes back down and the outer web turns sticky.
//   Act II, The Brood (68% → 28%): pairs, then the Swarm: every clutch still standing hatches at once.
//   Act III, The Collapse (28% → 0%): the cave floor falls away ring by ring from the walls. The hub, the eight spokes
//     and the threads nobody cut stay; anyone on falling floor drops (heavy damage, held, then hauled back up the silk).
//   The Chrysalis (at 28%): a hard damage check. She cocoons at the hub for 25 s; take 5% of her health off in that
//     time and she tears free, staggered (+25% damage taken, 8 s). Fail and she devours the party.
// A slow party runs each act's last set again, +10% each pass (f.course in fight.js). Devour is the hard enrage.
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, six-step Lunges,
// green and red Silk Lines, a burning beam on the brood pair, three spiderlings to a clutch, two drops per uncut thread
// in the dark, Molt (the husk replays her last Lunge), Silk Wrap on the tank as Silk Reel takes the healer, Ceiling
// Ambush, sticky acid; and her three moves: Egg Sacs, Fang Rush, Spinneret Volley.

const SKITTERRA = {
  id: 'skitterra', name: 'Queen Skitterra', title: 'Spider Broodmother',
  hp: { normal: 3000000, hard: 3200000 },
  autoDmg: { normal: 1550, hard: 1550 },
  enrage: { normal: 602, hard: 612 },   // the cast starts here and lands 8 s later (10:10 / 10:20)
  enrageName: 'Devour',
  vuln: 0.5,
  arena: { theme: 'webcave' },
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
      mist: 8500, wrap: 26000, lunge: H ? 11000 : 13000, tether: 16000, spit: H ? 10500 : 12000, pool: 2200,
      bite: H ? 2000 : 1600, fury: 5500, beam: 6000, reel: H ? 15000 : 17000,
      sac: 5000, sacFail: 10000, fang: 15000, glob: 11000, snare: 10000,
      deluge: H ? 16000 : 15000, strand: 11000, ambush: 16000, slam: 5000,
      clutchHp: 24000, knotHp: 24000, broodHp: H ? 30000 : 26000, swarmHp: H ? 16000 : 18000,
      sting: 3000, drop: 13000, drip: 7000, fall: 14000,
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
    // The floor telegraph for a strike only shows up shortly before it lands; her lit legs show the whole order.
    let lastLunge = null;
    const lunge = (opts = {}) => {
      const src = opts.src || { x: B.x, y: B.y };
      const a0 = opts.a0 ?? f.rng() * TAU, dir = opts.dir ?? (f.rng() < 0.5 ? 1 : -1);
      const steps = H ? 6 : 4, step = H ? 1.15 : 1.3, d = opts.delay ?? f.ct(5), win = Math.min(d, H ? 2.0 : 2.5);
      if (!opts.husk) {
        lastLunge = { a0, dir };
        B.lockFacing = true;
        if (!opts.noCast) f.cast('Eightfold Lunge', d, 'lunge');
        f.afterKeep(d + (steps - 1) * step + 0.15, () => { B.lockFacing = false; });
      }
      f.emit({ t: 'lunge', who: opts.husk ? 'husk' : 'boss', x: Math.round(src.x), y: Math.round(src.y), a0: +a0.toFixed(3), dir, n: steps, step, delay: d });
      for (let k = 0; k < steps; k++) {
        const a = a0 + dir * k * Math.PI / 4;
        f.after(d + k * step - win, () => {
          for (const ang of [a, a + Math.PI]) {
            f.aoe({ kind: 'cone', x: src.x, y: src.y, r: 1300, arc: 1.22, angle: ang }, win, dmg.lunge, { tag: 'lunge' });
          }
        });
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
    const wrapLunge = () => {
      const d = f.ct(6.5);
      lunge({ delay: d });
      silkWrap(d - 0.3, true);
    };

    // Silk Lines: tethers between players. Long ones must be stretched past LONG; short ones kept within SHORT.
    const silkLines = (delay = f.ct(9)) => {
      const al = f.alive();
      if (al.length < 2) return;
      f.cast('Silk Lines', f.ct(3), 'silk');
      const tie = (a, b, kind) => f.tether(a.id, b.id, delay, { kind, len: kind === 'long' ? LONG : SHORT, dmg: dmg.tether, tag: 'silk' });
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
          tag: 'venom', aimFromBoss: p.id, lockAt: 1.2,
          onResolve: () => {
            const q = f.players().find(z => z.id === p.id);
            const dist = q ? Math.hypot(q.x - m.shape.x, q.y - m.shape.y) : 380;
            const L = Math.max(200, dist);
            const at = ARENA.clamp({ x: m.shape.x + Math.cos(m.shape.angle) * L, y: m.shape.y + Math.sin(m.shape.angle) * L }, 60);
            f.puddle(at.x, at.y, H ? 100 : 90, H ? 60 : 45, dmg.pool, 1, 'venom', { slow: true });
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
        for (const p of picks) f.reel(p.id, { speed: H ? 210 : 180, dur: 4, windup: 0.9, dmg: dmg.reel });
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
    const SNARE_R = 190, SNARE_GAP = 75, LADEN_R = 110;
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
      l: liveClutches().map(c => [c.x, c.y, Math.round(((c.ripe ? ripeIn : swarmIn) || 0) * 10) / 10]) });
    const enrageAdd = a => {
      if (a.enraged) return;
      a.enraged = true; a.speed = 140; a.bite *= 3; a.furyAt = f.t + 1;
      a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.3));
      f.addsDirty = true;
      f.emit({ t: 'addev', k: 'enrage', id: a.id, x: Math.round(a.x), y: Math.round(a.y) });
    };
    // spiderlings in pairs: when one dies the other has 5 s to die, or it enrages; left 45 s, both do
    const spiderlings = (spots, hp) => {
      const made = spots.map(s => f.spawnAdd({
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
      }));
      for (let i = 0; i + 1 < made.length; i += 2) { made[i].link = made[i + 1].id; made[i + 1].link = made[i].id; }
      return made;
    };
    // a clutch splits: it goes, and its spiderlings come out on the far side of it
    const hatch = (c, perClutch) => {
      f.adds.delete(c.id); f.addsDirty = true; f.emit({ t: 'addev', k: 'gone', id: c.id });
      f.emit({ t: 'eggs', pts: [[c.x, c.y]], dur: 0.6 });
      const out = Math.atan2(c.y, c.x), spots = [];
      for (let k = 0; k < perClutch; k++) { const a = out + (k - (perClutch - 1) / 2) * 0.9; spots.push({ x: c.x + Math.cos(a) * 40, y: c.y + Math.sin(a) * 40 }); }
      return spots;
    };
    let swarmAt = null;
    // Brood (Act I): the two ripest clutches hatch, one spiderling each: a pair across the web
    const brood = () => {
      const d = f.ct(3);
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
      // what the bots break (once no spiderling is loose): in the dark, the knot she's running to next, then the eggs; in the light, eggs while
      // more than two clutches stand and nothing has hatched
      const hostile = [...f.adds.values()].some(a => !a.inert);
      const next = room.dark ? uncut().find(th => th.order >= room.runAt) : null;
      for (const th of room.threads) if (th.knot && f.adds.has(th.knot.id)) th.knot.prio = next === th && !hostile ? 6 : 0;
      for (const c of liveClutches()) c.prio = !hostile && (room.dark || liveClutches().length > 2) ? 2 : 0;
    });

    // --- The Dark Between: she's gone into the dark for 40 s --------------------------------------
    let from = { x: 0, y: 0 };
    const intoDark = () => {
      f.cast('Into the Dark', 2, 'ambush');
      f.afterKeep(2, () => {
        B.untargetable = true; B.lockFacing = true;
        room.dark = true; room.runAt = 0; from = { x: B.x, y: B.y };
        f.emit({ t: 'roomev', k: 'lightsout', r: 120, extra: f.props.filter(p => p.kind === 'pillar').map(p => ({ x: p.x, y: p.y })), dur: 37 });
      });
    };
    // she runs the length of a thread overhead and drops at its far end (Hard: then back to the near end); a thread
    // already cut, she can't use
    const dropFrom = k => {
      room.runAt = k + 1;
      const th = room.threads.find(t => t.order === k);
      if (!th || th.cut) return;
      f.cast('From the Dark', 6, 'ambush');
      const ends = H ? [[th.x2, th.y2], [th.x1, th.y1]] : [[th.x2, th.y2]];
      ends.forEach(([ex, ey], i) => {
        const at = ARENA.clamp({ x: ex * 0.86, y: ey * 0.86 }, 90), land = 6 + i * 2.5;
        f.afterKeep(i * 2.5, () => {
          f.emit({ t: 'roomev', k: 'ambush', pts: [[Math.round(from.x), Math.round(from.y)], [Math.round(at.x), Math.round(at.y)]], dur: land - i * 2.5, ease: 1.2 });
          from = at;
        });
        f.aoe({ kind: 'circle', x: at.x, y: at.y, r: 190 }, land, dmg.drop, { tag: 'ambush' });
      });
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
      f.emit({ t: 'roomev', k: 'ambush', pts: [[Math.round(from.x), Math.round(from.y)], [0, 0]], dur: d, ease: 1.2 });
      f.cast('Tightening Web', d, 'web');
      f.afterKeep(d, () => {
        B.x = 0; B.y = 0; B.untargetable = false; B.lockFacing = false;
        f.anim('leap', 0.4);
        f.zone({ shape: { kind: 'donut', x: 0, y: 0, r: ARENA.R + 40, r2: 390 }, tag: 'sticky', effect: 'slow' });
        f.raidwide(dmg.mist * 0.8, 0);
      });
    };

    // --- The Collapse: the floor falls away to the silk ------------------------------------------
    // Rings fall from the wall inward. What stays: the hub, the eight spokes (center to each pillar's place) and every
    // thread nobody cut. Each ring shudders for 6 s first, drawn with the silk cut out of it.
    const RINGS = [[430, 2000], [330, 430], [260, 330]];
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
    broodClock(137 + f.ct(3), 0);   // the Brood step's time, plus its cast
    // The Chrysalis (a hard damage check): as the Collapse begins she wraps herself in silk at the hub. Tear 5% of her
    // health off before it closes and she falls out of it, staggered and open for 8 s; let it close and she devours.
    const chrysalis = () => {
      f.dpsCheck('Chrysalis', H ? 24 : 25, 0.05, { anim: 'chrysalis',
        onPass: () => { B.stunUntil = f.t + 8; B.exposedUntil = f.t + 8; B.exposed = 0.25; f.emit({ t: 'roomev', k: 'torn', dur: 8 }); },
        onFail: () => f.enrage(),
      });
    };

    const actOne = at => f.course({
      until: 0.7,
      sets: [
        S([5, venomMist, 'Venom Mist']),
        S([13, () => silkWrap(), 'Silk Wrap']),
        S([14, () => lunge(), 'Eightfold Lunge']),
        S([15, () => silkLines(), 'Silk Lines']),
        S([15, spin, 'Spin']),
        S([15, venomSpit, 'Venom Spit'], H && [8, eggSacs, 'Egg Sacs']),
        S([15, strandReel, 'Strand Reel'], H && [9, fangRush, 'Fang Rush']),
        S([H ? 10 : 15, venomMist, 'Venom Mist']),
        S([15, wrapLunge, 'Eightfold Lunge']),
        S([15, brood, 'Brood'], [10, () => silkReel(), 'Silk Reel']),
        S([15, deluge, 'Acid Deluge']),
      ].filter(Boolean),
      closing: [[10, venomMist, 'Venom Mist'], [12, () => lunge(), 'Eightfold Lunge']],
      next: dark,
    }, at);

    const dark = at => f.course({
      onStart: () => { f.clearTethers(); f.clearReels(); },
      sets: [
        S([2, intoDark, 'Into the Dark']),
        S([4, () => dropFrom(0), 'From the Dark']),
        S([7, () => dropFrom(1), 'From the Dark']),
        S([7, () => dropFrom(2), 'From the Dark'], [3, venomDrip, 'Venom Drip']),
        S([4, () => dropFrom(3), 'From the Dark']),
        S([8, comeBack, 'Tightening Web']),
        S([6]),
      ],
      next: actTwo,
    }, at);

    const actTwo = at => f.course({
      until: 0.28,
      onStart: () => { swarmAt = f.t + (H ? 108 : 124) + f.ct(3); broodClock(0, swarmAt - f.t); },
      sets: [
        S([3, venomMist, 'Venom Mist']),
        S([12, wrapLunge, 'Eightfold Lunge']),
        S([15, linesThenSpit, 'Silk Lines']),
        H && S([12, volley, 'Spinneret Volley']),
        S([H ? 12 : 15, () => { silkReel(H ? 'healer' : null); if (H) silkWrap(); }, 'Silk Reel']),
        S([13, () => (H ? molt() : lunge()), H ? 'Molt' : 'Eightfold Lunge']),
        S([H ? 15 : 14, strandReel, 'Strand Reel']),
        H && S([10, ambush, 'Ceiling Ambush']),
        S([H ? 10 : 14, venomMist, 'Venom Mist']),
        H && S([11, snareWeave, 'Snare Weave']),
        S([H ? 15 : 14, deluge, 'Acid Deluge']),
        S([H ? 6 : 15, swarm, 'The Swarm']),
        S([14, () => silkWrap(), 'Silk Wrap']),
        S([14, () => silkLines(), 'Silk Lines']),
        H && S([12, eggSacs, 'Egg Sacs'], [10, fangRush, 'Fang Rush']),
        S([14, venomMist, 'Venom Mist']),
        S([14, () => lunge(), 'Eightfold Lunge']),
        S([12, linesThenSpit, 'Silk Lines']),
        S([12, () => silkReel(), 'Silk Reel']),
      ].filter(Boolean),
      closing: [[10, venomMist, 'Venom Mist'], [12, () => lunge(), 'Eightfold Lunge']],
      next: actThree,
    }, at);

    const actThree = at => f.course({
      sets: [
        S([2, chrysalis, 'Chrysalis'], [12, () => venomDrip(true), 'Venom Drip']),   // venom drips from the cocoon as it closes
        S([H ? 14 : 15, () => giveWay(0), 'The Web Gives Way']),
        S([8, venomMist, 'Venom Mist']),
        S([12, () => giveWay(1), 'The Web Gives Way'], [7, () => lunge(), 'Eightfold Lunge']),
        S([12, () => silkLines(), 'Silk Lines']),
        S([6, () => giveWay(2), 'The Web Gives Way'], [7, () => silkWrap(), 'Silk Wrap']),
        H && S([10, volley, 'Spinneret Volley']),
        S([11, () => silkLines(), 'Silk Lines']),
        S([12, venomMist, 'Venom Mist']),
        S([10, () => lunge(), 'Eightfold Lunge']),
      ].filter(Boolean),
      closing: [[12, venomMist, 'Venom Mist'], [9, () => lunge(), 'Eightfold Lunge']],
      ramp: 0.06,   // the burn: gentler, it never ends
    }, at);

    actOne(0);

    f.moves = { venomMist, lunge, silkWrap, wrapLunge, silkLines, venomSpit, brood, swarm, molt, silkReel, eggSacs, fangRush, volley, deluge,
      strandReel, ambush, snareWeave, spin, intoDark, dropFrom, venomDrip, comeBack, giveWay };
  },
};

if (typeof module !== 'undefined') module.exports = { SKITTERRA };
