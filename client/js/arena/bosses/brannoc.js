// Boss X: Brannoc the Undefeated — "The Drowned Colosseum". The champion who becomes the summon.
// Second boss of set 3 (the Fallen Star, docs/plans/2026-10-set-3-pitches.md). A pit-fighter still fighting for a crowd of ghosts in an
// arena that sank long ago; halfway through the bout the star claims him and he rises from the sea as its titan, the Tidewrought.
// The question is always: where will it bounce?
//   THE BANK SHOT: everything he throws bounces off the walls, and the whole path is painted bounce by bounce before it moves.
//     Sunwheel: his round war-shield is thrown, bounces off three walls and comes to rest on a blue catch point. A hero standing
//     there catches it (a heavy blow to them); if nobody does, it bursts and the whole room takes it.
//   Act I, First Blood (100% -> 75%): Sunwheel, Victory Leap (a jump onto a hero, then a pose that leaves him open), Hammer Heel
//     (the tank pair), Roar of the Stands.
//   Act II, Crowd-Pleaser (75% -> 52%): Sand Furrow (a slow line of churned sand that stays a while) across a Sunwheel, Banner Fall
//     (the wheel's bounces knock the banners loose), two Sunwheels in a row.
//   The Tide Rises (52%, PUSH): the colosseum floods and breaks apart; he rises from the sea as the Tidewrought and the party lands on
//     a ring of stone (the room becomes 'brannoc:sea', fight.js setForm). Debris stands on the ring and shelters from his waves.
//   Act III, The Tidewrought (52% -> 20%): he stands in the sea at the ring's north edge and never walks. Fist Slam follows the tank;
//     Undertow Grip (his hand closes on a hero: break it before he slams them), Breaker (a fist slam's wave runs to the rim and
//     bounces back; debris blocks it), Sunwheel Unbound (a giant wheel, more bounces, two catch points), Deep Call (a raidwide that
//     shoves everyone toward the rim).
//   Act IV, Last Round (20% -> dead, PUSH): everything faster; the closing pass is a six-bounce wheel during a Grip.
// Every telegraph shows on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Twin Wheels: two wheels at once, crossing paths, two catch points.
//   Double Grip: both hands, on two heroes; the party splits to break them.
//   Riposte:     a caught wheel is kicked back once more, along a new painted path.
//   Riptide:     Breaker's wave bounces twice.
// Hard also draws the first form's wheel walls, the Grip targets and the order of the titan's sets fresh each pull.

const BRANNOC = {
  id: 'brannoc', name: 'Brannoc', title: 'the Undefeated',
  hp: { normal: 5600000, hard: 5800000 },
  hardDmg: 1.22,   // (Hard's damage multiplier; fight.js default 1.25)
  autoDmg: { normal: 2200, hard: 2050 },
  enrage: { normal: 607, hard: 592 },   // the cast starts here and lands 8 s later (10:15 / 10:00)
  enrageName: 'The Final Bell',
  vuln: 0.5,
  spawn: { x: 0, y: -60 },
  arena: { theme: 'colosseum' },
  // the second form (fight.js setForm 'sea'): the bar, the room and the music change with it (raid-ui.js reads forms)
  forms: { sea: { name: 'The Tidewrought', title: 'Titan of the Fallen Star' } },
  gates: [0.75, { f: 0.52, push: 1 }, { f: 0.2, push: 1 }],

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      roar: H ? 11200 : 14000, heel1: H ? 15000 : 17000, heel2: H ? 19000 : 22000, leap: H ? 21000 : 24500, wheel: H ? 19800 : 23000,
      catch: H ? 15500 : 18000, catchBig: H ? 11500 : 13000, burst: H ? 17000 : 20000, furrow: H ? 3400 : 3200, furrowLine: H ? 15800 : 18200, banner: H ? 17000 : 19600,
      slam: H ? 20500 : 23500, wave: H ? 21000 : 24000, bleed: H ? 1300 : 1200, undertow: H ? 19000 : 27000, deep: H ? 13600 : 16400,
      handHp: H ? 17000 : 24000, rise: H ? 9800 : 11200,
    };
    const S = (...steps) => steps.filter(Boolean);
    const live = id => f.alive().find(p => p.id === id);
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    const mix = (head, mid, tail) => [...head, ...(H ? f.shuffle(mid) : mid), ...tail];
    let pathN = 0;                // (each painted path is its own room moment: 'brpath:<n>', so two at once both show)
    let titan = false;            // the second form: he stands in the sea and never walks
    const TITAN_AT = { x: 0, y: -400 };

    // --- the bank shot ------------------------------------------------------------------------------------------------------
    // a path from (x, y) along angle a that bounces n times off the round wall (the wheel's centre stays `pad` inside it)
    const bounce = (x, y, a, n, pad = 40) => {
      const RW = ARENA.r - pad, pts = [[x, y]];
      let dx = Math.cos(a), dy = Math.sin(a);
      for (let i = 0; i < n; i++) {
        const b = x * dx + y * dy, c = x * x + y * y - RW * RW, t = -b + Math.sqrt(Math.max(0, b * b - c));
        x += dx * t; y += dy * t; pts.push([x, y]);
        const nx = x / RW, ny = y / RW, dd = dx * nx + dy * ny;
        dx -= 2 * dd * nx; dy -= 2 * dd * ny;
      }
      return { pts, dx, dy };
    };
    // a throw that doesn't run through the middle (a path there would bounce straight back at him): its first line passes the
    // centre at least `near` off, at most `far`
    const throwAngle = (x, y, near = 160, far = 400) => {
      for (let k = 0; k < 24; k++) {
        const a = f.rng() * TAU, off = Math.abs(-x * Math.sin(a) + y * Math.cos(a));
        if (off >= near && off <= far) return a;
      }
      return f.rng() * TAU;
    };
    // lay a thrown thing's path: red pieces that land as it passes (speed px/s, from `delay` s), blue catch circles where they stand
    // on the path (the pieces stop short of them: the catcher takes the catch, not the wheel). o: { w, speed, delay, catches:
    // [[x, y], ...] (on the path), catchR, tag, onCatch(i, ok), banners }
    const lay = (pts, o) => {
      const along = [0];
      for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const cs = (o.catches || []).map(([x, y]) => {
        // where on the path each catch point sits
        let best = 0, bd = Infinity;
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay) || 1;
          const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (L * L))), d = Math.hypot(ax + (bx - ax) * u - x, ay + (by - ay) * u - y);
          if (d < bd) { bd = d; best = along[i - 1] + u * L; }
        }
        return { x, y, s: best };
      });
      const R = o.catchR || 95, group = new Set();
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
        if (L < 10) continue;
        // chopped into pieces, each landing as the wheel reaches its far end; a piece that would cross a catch circle is cut round it
        const cuts = [0];
        for (const c of cs) if (c.s > along[i - 1] && c.s < along[i]) { const u = c.s - along[i - 1]; cuts.push(Math.max(0, u - R), Math.min(L, u + R)); }
        cuts.push(L); cuts.sort((p, q) => p - q);
        for (let k = 0; k + 1 < cuts.length; k += 2) {
          let u0 = cuts[k];
          const u1 = cuts[k + 1];
          while (u1 - u0 > 12) {
            const u = Math.min(u1, u0 + 260);
            f.aoe({ kind: 'rect', x: Math.round(ax + Math.cos(ang) * u0), y: Math.round(ay + Math.sin(ang) * u0), angle: +ang.toFixed(3), len: Math.round(u - u0), w: o.w },
              o.delay + (along[i - 1] + u) / o.speed, dmg[o.dmg || 'wheel'], { tag: o.tag || 'brWheel', group, ddown: true });
            u0 = u;
          }
        }
        // Banner Fall: a bounce knocks the banner on that stretch of wall loose
        if (o.banners && i < pts.length - 1) {
          const nx = -bx / Math.hypot(bx, by), ny = -by / Math.hypot(bx, by);
          f.aoe({ kind: 'rect', x: Math.round(bx - nx * 30), y: Math.round(by - ny * 30), angle: +Math.atan2(ny, nx).toFixed(3), len: 200, w: 120 },
            o.delay + along[i] / o.speed + 1.6, dmg.banner, { tag: 'brBanner' });
        }
      }
      cs.forEach((c, i) => f.mech({ type: 'tower', shape: { kind: 'circle', x: Math.round(c.x), y: Math.round(c.y), r: R }, delay: o.delay + c.s / o.speed, dmg: dmg[o.catchDmg || 'catch'], need: 1,
        failDmg: dmg.burst, tag: 'brCatch', onResolve: (inside) => { if (o.onCatch) o.onCatch(i, inside.length > 0, c); } }));
      f.emit({ t: 'roomev', k: 'brpath:' + (++pathN), l: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), c: cs.map(c => [Math.round(c.x), Math.round(c.y)]), sp: o.speed,
        at: +o.delay.toFixed(2), w: o.w, big: o.w > 150 ? 1 : 0, dur: +(o.delay + along[along.length - 1] / o.speed + 0.5).toFixed(2) });
      return o.delay + along[along.length - 1] / o.speed;
    };
    // where a path comes to rest: partway down the next line after its last bounce
    const rest = (path, frac = 0.45) => {
      const [x, y] = path.pts[path.pts.length - 1], b = x * path.dx + y * path.dy, RW = ARENA.r - 40, c = x * x + y * y - RW * RW, t = -b + Math.sqrt(Math.max(0, b * b - c));
      return [x + path.dx * t * frac, y + path.dy * t * frac];
    };

    // Sunwheel: three bounces and a catch. o: { n, banners, volley (Hard's second wheel), quiet }
    const sunwheel = (o = {}) => {
      const d = f.ct(4.6), n = o.n || 3;
      if (!o.quiet) f.cast(H && o.twin ? 'Twin Wheels' : 'Sunwheel', d, 'throw');
      hold(d + 1);
      const plan = a => { const path = bounce(B.x, B.y, a, n); return { path, end: rest(path) }; };
      const throwOne = ({ path, end }) => {
        lay([...path.pts, end], { w: 130, speed: 950, delay: d, catches: [end], banners: o.banners,
          onCatch: (i, ok, c) => { if (ok && H) f.afterKeep(0.3, () => riposte(c)); } });
      };
      const a1 = throwAngle(B.x, B.y), p1 = plan(a1);
      B.facing = a1; B.lockFacing = true;
      throwOne(p1);
      // Twin Wheels (Hard): the second wheel crosses the first and comes to rest well apart from it (two catchers, not one)
      if (H && o.twin) {
        let p2 = null;
        for (let k = 0; k < 16 && !p2; k++) { const q = plan(a1 + Math.PI * (0.45 + f.rng() * 0.45) * (f.rng() < 0.5 ? -1 : 1)); if (Math.hypot(q.end[0] - p1.end[0], q.end[1] - p1.end[1]) > 340) p2 = q; }
        if (p2) throwOne(p2);
      }
      f.afterKeep(d + 0.4, () => { B.lockFacing = false; });
    };
    // Riposte (Hard): the catcher's wheel is kicked back once more along a fresh path, two bounces, nothing to catch
    const riposte = (c) => {
      if (f.state !== 'live') return;
      const d = f.ct(2.6), path = bounce(c.x, c.y, throwAngle(c.x, c.y, 120, 380), 2);
      f.emit({ t: 'bcast', name: 'Riposte', dur: d, anim: 'riposte' });
      lay(path.pts, { w: 120, speed: 950, delay: d, tag: 'brRiposte' });
    };
    // Victory Leap: onto a hero (the ring follows them, then holds), and then he poses for the crowd: open to hits for a while
    const leap = () => {
      const tgt = nonTank(); if (!tgt) return;
      const d = f.ct(4.0);
      f.cast('Victory Leap', d, 'leap');
      B.untargetable = true;
      const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 200 }, delay: d, dmg: dmg.leap, follow: tgt.id, lockAt: 1.4, tag: 'brLeap',
        onResolve: () => {
          B.untargetable = false; B.x = m.shape.x; B.y = m.shape.y; ARENA.clamp(B, 110); B.autoAt = f.t + 3;
          f.emit({ t: 'propfx', k: 'brland', x: Math.round(B.x), y: Math.round(B.y), boss: 1 });
          f.anim('pose', 4);
          B.exposed = 0.15; B.exposedUntil = f.t + 6; hold(4); B.noAutoUntil = f.t + 4;
        } });
      f.afterKeep(0.8, () => { if (f.mechs.has(m.id)) B.moveTo = null; });
    };
    // Hammer Heel: two stamps on the tank, the second bigger
    const heel = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.0), gap = f.ct(2.2);
      f.cast('Hammer Heel', d + gap, 'heel');
      f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 150 }, delay: d, dmg: dmg.heel1, target: tank.id, follow: tank.id, lockAt: 0.8, tag: 'buster' });
      f.afterKeep(0.05, () => { const t2 = live(tank.id) || f.tank(); if (t2) f.mech({ type: 'buster', shape: { kind: 'circle', x: t2.x, y: t2.y, r: 170 }, delay: d + gap - 0.05, dmg: dmg.heel2, target: t2.id, follow: t2.id, lockAt: 0.8, tag: 'buster' }); });
    };
    const roar = () => {
      const d = f.ct(4.4);
      f.cast('Roar of the Stands', d, 'roar');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.roar, hidden: true, tag: 'brRoar' });
    };
    // Sand Furrow: he drags his heel through the sand across the room; the furrow stays churned and wet a while
    const furrow = () => {
      const d = f.ct(4.2), a = f.rng() * Math.PI, c = Math.cos(a), sn = Math.sin(a);
      f.cast('Sand Furrow', d, 'furrow');
      hold(d);
      const shape = { kind: 'rect', x: Math.round(B.x - c * 1300), y: Math.round(B.y - sn * 1300), angle: +a.toFixed(3), len: 2600, w: 110 };
      f.aoe(shape, d, dmg.furrowLine, { tag: 'brFurrow' });
      f.zone({ shape: Object.assign({}, shape), dur: 16, delay: d, effect: 'burn', dmg: dmg.furrow, tag: 'brFurrow' });
    };

    // --- the Tide Rises (the push seam) -------------------------------------------------------------------------------------
    const DEBRIS = [[-260, 80], [260, 80], [-140, 300], [140, 300], [-330, -120], [330, -120]];
    const rise = () => {
      const d = 8;
      f.cast('The Tide Rises', d, 'rise');
      B.untargetable = true; B.lockFacing = true;
      f.emit({ t: 'roomev', k: 'tide', dur: d + 2 });
      f.afterKeep(4, () => f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 2, dmg: dmg.rise, hidden: true, tag: 'brRise' }));
      f.afterKeep(6, () => {
        f.clearZones(); f.clearPuddles();
        for (const pr of [...f.props]) f.removeProp(pr);
        f.setForm('sea');
        f.edgeGrace = f.t + 3;
        // the party lands on the ring: anyone the water took past its edge is set down inside it
        for (const p of f.alive()) { const r = Math.hypot(p.x, p.y); if (r > ARENA.r - 50) f.knock(p, p.x * 3, p.y * 3, r - (ARENA.r - 90)); }
        const at = H ? f.shuffle(DEBRIS).slice(0, 4) : DEBRIS.slice(0, 4);
        for (const [x, y] of at) f.addProp({ kind: 'debris', x, y, r: 38, hp: 0, solid: true, cover: true, rubble: false });
        titan = true;
        B.x = TITAN_AT.x; B.y = TITAN_AT.y; B.facing = Math.PI / 2; B.anchor = true; B.moveTo = null;
      });
      f.afterKeep(d, () => { B.untargetable = false; B.lockFacing = true; B.facing = Math.PI / 2; B.noAutoUntil = 1e9; f.anim('risen', 2); });
    };

    // --- the Tidewrought -----------------------------------------------------------------------------------------------------
    // Fist Slam: the great fist comes down where the tank stands (the tank keeps it away from everyone)
    const fist = () => {
      const tank = f.tank(); if (!tank) return null;
      const d = f.ct(3.8);
      f.cast('Fist Slam', d, 'slam');
      return f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 175 }, delay: d, dmg: dmg.slam, target: tank.id, follow: tank.id, lockAt: 1.0, tag: 'brFist' });
    };
    // Breaker: the slam sends a wave out to the rim, and it comes back off it (Hard: twice). Debris in the way shelters.
    const breaker = () => {
      const m = fist(); if (!m) return;
      const d = m.resolveAt - f.t;
      f.cast('Breaker', d, 'slam');
      f.afterKeep(d - 1.0, () => {
        const sx = m.shape.x, sy = m.shape.y;
        const away = Math.atan2(sy - TITAN_AT.y, sx - TITAN_AT.x) + (f.rng() - 0.5) * 0.9;
        const path = bounce(sx, sy, away, H ? 2 : 1, 30);
        const end = rest(path, 0.9), pts = [...path.pts, end], speed = 650, delay = 1.0 + 0.6;
        let s0 = 0;
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
          f.aoe({ kind: 'rect', x: Math.round(ax), y: Math.round(ay), angle: +ang.toFixed(3), len: Math.round(L), w: 210 }, delay + (s0 + L * 0.6) / speed, dmg.wave,
            { tag: i === 1 ? 'brWave' : 'brWaveBack', cover: true, src: { x: ax, y: ay } });
          s0 += L;
        }
        f.emit({ t: 'roomev', k: 'brpath:' + (++pathN), l: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), c: [], sp: speed, at: delay, w: 210, wave: 1, dur: +(delay + s0 / speed + 0.5).toFixed(2) });
      });
    };
    // Undertow Grip: the hand's shadow falls over a hero; then it closes on them. Break the hand before he slams them.
    const grip = (n = 1) => {
      const pool = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive()).slice(0, n);
      if (!pool.length) return;
      const d = f.ct(3.4);
      f.cast(n > 1 ? 'Double Grip' : 'Undertow Grip', d, 'grip');
      for (const tgt of pool) {
        f.mech({ type: 'drop', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 110 }, delay: d, dmg: 0, follow: tgt.id, lockAt: 1.0, tag: 'brGrip', avoidable: false,
          onResolve: () => {
            const q = live(tgt.id); if (!q) return;
            const hand = f.spawnAdd({ kind: 'tidehand', x: q.x, y: q.y - 30, hp: dmg.handHp, r: 40, inert: true, prio: 6 });
            let held = 0;
            const tick = () => {
              const p = live(tgt.id);
              if (!f.adds.has(hand.id) || !p || f.state !== 'live') { if (p) f.debuff(p.id, 'rooted', 0); return; }
              f.debuff(p.id, 'rooted', 1.2);
              f.damagePlayer(p, dmg.bleed, { kind: 'brBleed', n: 'Undertow Grip' });
              held++;
              if (held >= 8) {
                f.killAdd(hand); f.debuff(p.id, 'rooted', 0);
                f.damagePlayer(p, dmg.undertow, { kind: 'brUndertow', n: 'Undertow Grip' });
                f.emit({ t: 'propfx', k: 'brcrush', x: Math.round(p.x), y: Math.round(p.y), pid: p.id });
                return;
              }
              f.afterKeep(1, tick);
            };
            tick();
          } });
      }
    };
    // Sunwheel Unbound: the giant wheel, more bounces, two catch points (one on its way, one where it comes to rest)
    const unbound = (n = 4, quiet = false) => {
      const d = f.ct(4.8);
      if (!quiet) f.cast('Sunwheel Unbound', d, 'unbound');
      const path = bounce(B.x, B.y + 120, throwAngle(B.x, B.y + 120, 120, 360), n, 50), end = rest(path, 0.5);
      // the first catch: halfway along the second line
      const [ax, ay] = path.pts[1], [bx, by] = path.pts[2], mid = [(ax + bx) / 2, (ay + by) / 2];
      lay([...path.pts, end], { w: 190, speed: 800, delay: d, catches: [mid, end], catchR: 100, dmg: 'wheel', catchDmg: 'catchBig' });
    };
    // Deep Call: the sea heaves; everyone is shoved toward the rim (never over it)
    const deepCall = () => {
      const d = f.ct(4.4);
      f.cast('Deep Call', d, 'call');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.deep, hidden: true, tag: 'brDeep',
        onResolve: () => { for (const p of f.alive()) { const r = Math.hypot(p.x, p.y) || 1; f.knock(p, p.x - p.x / r * 40, p.y - p.y / r * 40, Math.min(170, Math.max(0, ARENA.r - 70 - r))); } } });
    };

    // --- the acts -------------------------------------------------------------------------------------------------------------
    // I. First Blood
    const first = from => f.course({
      until: 0.75, push: false,
      sets: mix([S([4, roar, 'Roar of the Stands']), S([9, () => sunwheel(), 'Sunwheel'])], [
        S([13, heel, 'Hammer Heel']),
        S([12, leap, 'Victory Leap']),
        S([14, () => sunwheel(), 'Sunwheel'], [9, roar, 'Roar of the Stands']),
        S([11, heel, 'Hammer Heel']),
        S([12, leap, 'Victory Leap']),
        H && S([12, () => sunwheel({ twin: true }), 'Twin Wheels']),
      ].filter(Boolean), [
        S([13, () => sunwheel(), 'Sunwheel']),
        S([12, heel, 'Hammer Heel']),
        S([11, roar, 'Roar of the Stands']),
        S([11, leap, 'Victory Leap']),
      ]),
      closing: [[10, roar, 'Roar of the Stands'], [10, heel, 'Hammer Heel'], [10, () => sunwheel(), 'Sunwheel']],
      next: crowd,
    }, from);

    // II. Crowd-Pleaser (its gate pushes straight into the Tide)
    const crowd = from => f.course({
      until: 0.52, push: true,
      sets: [
        S([4, furrow, 'Sand Furrow'], [5, () => sunwheel({ banners: true }), 'Sunwheel']),
        S([13, heel, 'Hammer Heel']),
        S([12, roar, 'Roar of the Stands']),
        S([11, leap, 'Victory Leap']),
        S([12, () => sunwheel({ banners: true, twin: true }), H ? 'Twin Wheels' : 'Sunwheel'], [10, () => sunwheel({ banners: true }), 'Sunwheel']),
        S([12, heel, 'Hammer Heel']),
        S([12, furrow, 'Sand Furrow'], [6, leap, 'Victory Leap']),
        S([12, roar, 'Roar of the Stands']),
        S([11, () => sunwheel({ banners: true }), 'Sunwheel'], [10, () => sunwheel({ banners: true, twin: true }), H ? 'Twin Wheels' : 'Sunwheel']),
        S([12, heel, 'Hammer Heel']),
      ],
      closing: [[10, roar, 'Roar of the Stands'], [10, heel, 'Hammer Heel'], [10, () => sunwheel({ banners: true }), 'Sunwheel']],
      next: tide,
    }, from);

    // The Tide Rises: no gate of its own; it runs its course and the titan begins
    const tide = from => f.course({
      onStart: () => { B.lockFacing = false; },
      sets: [S([0.5, rise, 'The Tide Rises'], [9.5, deepCall, 'Deep Call'])],
      next: tidewrought,
    }, from);

    // III. The Tidewrought (Hard draws the order of his middle sets)
    const tidewrought = from => f.course({
      until: 0.2, push: true, onStart: () => { B.lockFacing = true; B.facing = Math.PI / 2; },
      sets: mix([S([6, fist, 'Fist Slam']), S([9, () => grip(H ? 2 : 1), H ? 'Double Grip' : 'Undertow Grip'])], [
        S([12, breaker, 'Breaker']),
        S([12, () => unbound(4), 'Sunwheel Unbound']),
        S([12, fist, 'Fist Slam'], [7, deepCall, 'Deep Call']),
        S([12, () => grip(H ? 2 : 1), H ? 'Double Grip' : 'Undertow Grip']),
        S([12, breaker, 'Breaker']),
        S([12, fist, 'Fist Slam']),
        S([10, () => unbound(5), 'Sunwheel Unbound']),
        S([13, deepCall, 'Deep Call'], [8, fist, 'Fist Slam']),
      ], [
        S([12, () => grip(H ? 2 : 1), H ? 'Double Grip' : 'Undertow Grip'], [8, breaker, 'Breaker']),
        S([13, fist, 'Fist Slam']),
        S([10, () => unbound(5), 'Sunwheel Unbound']),
        S([13, deepCall, 'Deep Call']),
        S([10, fist, 'Fist Slam']),
      ]),
      closing: [[10, deepCall, 'Deep Call'], [10, fist, 'Fist Slam'], [10, breaker, 'Breaker']],
      next: lastRound,
    }, from);

    // IV. Last Round: everything faster, and at the last a six-bounce wheel while his hand holds someone
    const lastRound = from => f.course({
      sets: [
        S([3, deepCall, 'Deep Call']),
        S([10, breaker, 'Breaker'], [7, fist, 'Fist Slam']),
        S([9, () => unbound(5), 'Sunwheel Unbound']),
        S([10, () => grip(H ? 2 : 1), H ? 'Double Grip' : 'Undertow Grip'], [6, breaker, 'Breaker']),
        S([9, deepCall, 'Deep Call']),
        S([9, () => grip(1), 'Undertow Grip'], [4, () => unbound(6), 'Sunwheel Unbound']),
      ],
      closing: [[12, deepCall, 'Deep Call'], [9, fist, 'Fist Slam'], [9, breaker, 'Breaker']],
      ramp: 0.08,
    }, from);

    first(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.sunwheel())
    f.moves = { sunwheel, riposte, leap, heel, roar, furrow, rise, fist, breaker, grip, unbound, deepCall, bounce };
    f.brannocTitan = () => titan;
  },
};

if (typeof module !== 'undefined') module.exports = { BRANNOC };
