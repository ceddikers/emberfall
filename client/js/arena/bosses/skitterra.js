// Boss II: Queen Skitterra, the Spider Broodmother — "The Web Cave".
// She holds the middle of her web; her threads, her brood and the floor itself are the danger.
//   Phase 1 (100% → 50%): Venom Mist (raidwide), Silk Wrap (tankbuster that roots the tank where it lands),
//     Eightfold Lunge (her legs light up in order; each lit leg and its opposite strike in turn, so the safe
//     side rotates), Silk Lines (a tether that must be stretched) with Venom Spit straight after (cones at the two
//     farthest players, leaving slowing pools), Brood (two spiderlings on opposite sides; when one dies the other
//     must die within 5 s or it enrages), Silk Reel (a thread drags the farthest player in; a dash snaps it).
//   Phase 2 at 50%: the web tightens. She returns to the middle and the outer ring turns sticky (slowing).
//     Silk Wrap now lands just before a Lunge, so the tank must stand somewhere safe before being rooted.
//     Brood comes with Silk Lines. Devour at the hard enrage timer.
// Hard: Lunge telegraphs are not drawn (read her legs) and run six strikes; Silk Lines become two tethers,
// green (stretch it) and red (keep it short); the brood pair is joined by a beam that burns anyone across it;
// in phase 2 she Molts, and the husk replays her last Lunge while she starts a new one. Faster casts, 25% more damage.
// Three moves only Hard has:
//   Egg Sacs: three sacs drop around her web, one person each. Stomping one sticks you in the goo for a moment; a sac
//     nobody stomps bursts over everyone and leaves a pool of venom.
//   Fang Rush: she charges the farthest player across the web and leaves a trail of sticky silk behind her.
//   Spinneret Volley: four globs of silk fall one after another on everyone but the tank, each where its target stood
//     a moment before. Keep walking.

const SKITTERRA = {
  id: 'skitterra', name: 'Queen Skitterra', title: 'Spider Broodmother',
  hp: { normal: 1300000, hard: 1750000 },
  autoDmg: { normal: 1550, hard: 1550 },
  enrage: { normal: 360, hard: 380 },
  enrageName: 'Devour',
  vuln: 0.5,
  arena: { theme: 'webcave' },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      mist: 8500, wrap: 26000, lunge: H ? 11000 : 13000, tether: 16000, spit: H ? 10500 : 12000, pool: 2200,
      bite: H ? 2000 : 1600, fury: 5500, beam: 6000, reel: H ? 15000 : 17000,
      sac: 5000, sacFail: 10000, fang: 15000, glob: 11000,
    };
    const LONG = 420, SHORT = 150;

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
            f.aoe({ kind: 'cone', x: src.x, y: src.y, r: 1300, arc: 1.22, angle: ang }, win, dmg.lunge, { hidden: H, tag: 'lunge' });
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

    // Brood: two spiderlings on opposite sides. Kill one and the other has 5 s to die before it enrages.
    const enrageAdd = a => {
      if (a.enraged) return;
      a.enraged = true; a.speed = 140; a.bite *= 3; a.furyAt = f.t + 1;
      a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.3));
      f.addsDirty = true;
      f.emit({ t: 'addev', k: 'enrage', id: a.id, x: Math.round(a.x), y: Math.round(a.y) });
    };
    const brood = () => {
      const d = f.ct(3);
      const a = f.rng() * TAU;
      const spots = [0, 1].map(i => ({ x: Math.cos(a + i * Math.PI) * 400, y: Math.sin(a + i * Math.PI) * 400 }));
      f.cast('Brood', d, 'brood');
      f.emit({ t: 'eggs', pts: spots.map(s => [Math.round(s.x), Math.round(s.y)]), dur: d });
      f.after(d, () => {
        const pair = spots.map(s => f.spawnAdd({
          kind: 'spiderling', x: s.x, y: s.y, hp: H ? 30000 : 26000, r: 30, speed: 60, bite: dmg.bite, biteEvery: 2,
          leash: 240, spit: dmg.bite * 0.6,
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
        pair[0].link = pair[1].id; pair[1].link = pair[0].id;
      });
    };

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
    const silkReel = () => {
      const d = f.ct(2.5);
      f.cast('Silk Reel', d, 'reel');
      f.after(d - 0.9, () => {
        const pool = f.nonTanks().length ? f.nonTanks() : f.alive();
        for (const p of farthest(pool, H ? 2 : 1)) f.reel(p.id, { speed: H ? 210 : 180, dur: 4, windup: 0.9, dmg: dmg.reel });
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
        const a = m.shape.angle, len = Math.max(150, Math.min(ARENA.edge(a) - 140, Math.hypot(far.x - B.x, far.y - B.y) + 60));
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

    // --- phase 1 ----------------------------------------------------------------------------
    f.loop(n => [
      [5, venomMist, 'Venom Mist'],
      [7, () => silkWrap(), 'Silk Wrap'],
      [8, () => lunge(), 'Eightfold Lunge'],
      [10, () => silkLines(), 'Silk Lines'],
      [10, venomSpit, 'Venom Spit'],
      [8, brood, 'Brood'],
      [12, silkReel, 'Silk Reel'],
      H && [8, fangRush, 'Fang Rush'],
      [H ? 9 : 10, venomMist, 'Venom Mist'],
      [7, () => lunge(), 'Eightfold Lunge'],
      [10, linesThenSpit, 'Silk Lines'],
      H && [11, eggSacs, 'Egg Sacs'],   // once the brood is dead
      [11, () => silkWrap(), 'Silk Wrap'],
      [8, venomSpit, 'Venom Spit'],
      [9],
    ].filter(Boolean));

    // --- phase 2: the web tightens ------------------------------------------------------------
    f.onHp(0.5, () => {
      f.setPhase(2);
      f.mechs.clear();
      f.emit({ t: 'tgclear' });
      f.clearTethers();
      f.clearAdds();
      f.clearReels();
      f.clearZones();
      B.untargetable = true; B.lockFacing = false; B.cast = null;
      f.anim('leap', 1.4);
      f.moveBoss(0, 0, 700);
      f.seq([
        [1.6, () => f.cast('Tightening Web', 4, 'web'), 'Tightening Web'],
        [4, () => {
          f.zone({ shape: { kind: 'donut', x: 0, y: 0, r: ARENA.R + 40, r2: 390 }, tag: 'sticky', effect: 'slow' });
          f.raidwide(dmg.mist * 0.8, 0);
        }],
        [1.5, () => { B.untargetable = false; f.anim('roar', 1); p2(); }],
      ]);
    });

    const p2 = () => f.loop(n => [
      [2, venomMist, 'Venom Mist'],
      [7, wrapLunge, 'Eightfold Lunge'],
      [13, () => { brood(); f.after(f.ct(3) + 1, () => silkLines()); }, 'Brood'],
      H && [11, volley, 'Spinneret Volley'],
      [12, silkReel, 'Silk Reel'],
      [11, venomSpit, 'Venom Spit'],
      [9, () => (H ? molt() : lunge()), H ? 'Molt' : 'Eightfold Lunge'],
      [H ? 18 : 10, () => silkWrap(), 'Silk Wrap'],
      [9, linesThenSpit, 'Silk Lines'],
      H && [12, n % 2 ? eggSacs : fangRush, n % 2 ? 'Egg Sacs' : 'Fang Rush'],
      [12, venomMist, 'Venom Mist'],
      [8, () => lunge(), 'Eightfold Lunge'],
      [11, brood, 'Brood'],
      H && [13, volley, 'Spinneret Volley'],
      [H ? 12 : 22],
    ].filter(Boolean));
  },
};

if (typeof module !== 'undefined') module.exports = { SKITTERRA };
