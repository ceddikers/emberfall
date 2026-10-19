// Boss I: Grubnak, the Ogre Chef — "The Scullery".
// A kitchen brawl: everything he does is told by his tools, and it comes fast and in pairs from the first minute.
//   Phase 1 (100% → 55%): Grease Fire (raidwide), Tenderize (tankbuster cleave), Mince (left/right half-room,
//     told by which cleaver glows), Ladle Spin (out) / Lid Slam (in), Meat Toss (spread, leaves grease puddles) and
//     Family Meal (stack) back to back, Chop Chop (cleave + in/out combo), Order Up! (plate towers) with Rolling
//     Meatballs launched while the plates are served.
//   Intermission at 55%: he dives into the stockpot; Simmer waves ripple out, then back in.
//   Phase 2: Whisk (rotating cross), Spice Rack (delayed circles) into Ladle/Lid, Boil Over (get far away), Family Meal
//     under falling spice, remixes of phase 1, Gorge below 15% (soft enrage), Last Call at the hard enrage timer.
// Hard: telegraphs for Mince / Ladle / Lid are not drawn (read his cleavers and pots), Mince becomes a double
// chop, Tenderize leaves a vulnerability for the next one, plates leave "Stuffed", spread + stack overlap, Kitchen Rush
// replaces a Boil Over, faster casts and 25% more damage. Three moves only Hard has:
//   Belly Flop: he flops down (out of the circle under him), throwing everyone away; the tool on his back says whether
//     the Ladle Spin or Lid Slam that follows wants you out or back under him.
//   Cleaver Toss: a cleaver flies at each of the two farthest players along a line, then flies back along it.
//   Flambé: brandy in stripes across the kitchen catches fire, every other stripe first, then the rest.

const GRUBNAK = {
  id: 'grubnak', name: 'Grubnak', title: 'The Ogre Chef',
  hp: { normal: 1250000, hard: 1700000 },
  autoDmg: { normal: 1600, hard: 1600 },
  enrage: { normal: 330, hard: 360 },
  enrageName: 'Last Call',
  vuln: 0.5,   // every avoidable hit leaves you taking half again as much for a while
  arena: { theme: 'kitchen' },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const dmg = {
      grease: 8500, buster: 26000, mince: 13000, ladle: 13000, spread: H ? 6500 : 7500, stack: H ? 20000 : 22000,
      puddle: 2600, tower: 5000, towerFail: 14000, simmer: 13000, whisk: 13000, spice: 13000, boil: H ? 46000 : 40000, rush: 15000, gorge: 6500,
      meatball: 13000, flop: 13000, cleaver: 13000, flambe: 14000,
    };
    const LL = { ladle: 'Ladle Spin', lid: 'Lid Slam' };
    const coin = (a, b) => (f.rng() < 0.5 ? a : b);

    // --- building blocks ------------------------------------------------------------------
    const grease = () => {
      f.cast('Grease Fire', f.ct(4), 'raise');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(4), dmg: dmg.grease, hidden: true, tag: 'grease' });
    };
    const tenderize = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.5);
      f.cast('Tenderize', d, 'cleaver');
      const vuln = H && f.hasDebuff(tank.id, 'tenderized');
      // the cleave sits on the boss and turns to follow the tank until just before it lands
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 320, arc: 1.5, angle: B.facing }, delay: d,
        dmg: dmg.buster * (vuln ? 1.6 : 1), target: tank.id, aimFromBoss: tank.id, tag: 'buster',
        onResolve: () => { if (H) f.debuff(tank.id, 'tenderized', 30); } });
    };
    const halfRoom = side => {
      const a = B.facing + (side === 'left' ? -Math.PI / 2 : Math.PI / 2);
      return { kind: 'rect', x: B.x, y: B.y, angle: a, len: 1300, w: 2600 };
    };
    // Mince: one cleaver glows; that side of the room gets chopped. Hard: two chops, glowing side first.
    const mince = (delay = f.ct(4.5), then) => {
      const first = coin('left', 'right');
      const second = first === 'left' ? 'right' : 'left';
      B.lockFacing = true;
      f.cast(H ? 'Double Chop' : 'Mince', delay, 'mince', { side: first, second: H ? second : null });
      f.aoe(halfRoom(first), delay, dmg.mince, { hidden: H, tag: 'mince' });
      if (H) f.afterKeep(delay - 0.01, () => f.aoe(halfRoom(second), 2.2, dmg.mince, { hidden: true, tag: 'mince' }));
      f.afterKeep(delay + (H ? 2.3 : 0.1), () => { B.lockFacing = false; if (then) then(); });
      return delay + (H ? 2.2 : 0);
    };
    // Ladle Spin: stay out (point-blank circle). Lid Slam: get in (donut, safe under him).
    const ladleShape = () => ({ kind: 'circle', x: B.x, y: B.y, r: 240 });
    const lidShape = () => ({ kind: 'donut', x: B.x, y: B.y, r: 1300, r2: 190 });
    const ladleOrLid = (delay = f.ct(4), which) => {
      which = which || coin('ladle', 'lid');
      f.cast(LL[which], delay, which);
      f.aoe(which === 'ladle' ? ladleShape() : lidShape(), delay, dmg.ladle, { hidden: H, tag: which });
      return delay;
    };
    // Chop Chop: Mince, then Ladle/Lid right after
    const chopChop = (second = coin('ladle', 'lid')) => {
      const d = f.ct(5);
      const first = coin('left', 'right');
      B.lockFacing = true;
      f.cast('Chop Chop', d, 'mince', { side: first, then: second });
      f.aoe(halfRoom(first), d, dmg.mince, { hidden: H, tag: 'mince' });
      f.afterKeep(d - 0.01, () => {
        B.lockFacing = false;
        f.anim(second, 2.4);
        f.aoe(second === 'ladle' ? ladleShape() : lidShape(), 2.4, dmg.ladle, { hidden: H, tag: second });
      });
    };
    // Meat Toss: spread circles on players; where they land, a grease puddle stays for a while.
    const meatToss = (targets) => {
      const d = f.ct(5.5);
      targets = targets || (f.alive().length > 1 ? f.nonTanks() : f.alive());
      if (!targets.length) return;
      f.cast('Meat Toss', d, 'toss');
      for (const p of targets) {
        f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 120 }, delay: d, dmg: dmg.spread, follow: p.id, tag: 'spread',
          onResolve: () => { const q = f.alive().find(z => z.id === p.id); if (q) f.puddle(q.x, q.y, H ? 105 : 90, H ? 28 : 24, dmg.puddle, 1, 'grease'); } });
      }
    };
    const familyMeal = (target, delay = f.ct(5.5)) => {
      const pool = f.alive().length > 1 ? f.nonTanks() : f.alive();
      target = target || f.pick(pool);
      if (!target) return;
      f.cast('Family Meal', delay, 'serve');
      // Normal forgives the tank staying on the boss; Hard wants everyone in
      const n = f.alive().length;
      f.mech({ type: 'stack', shape: { kind: 'circle', x: target.x, y: target.y, r: 115 }, delay, dmg: dmg.stack * Math.min(n, 4) / 4, follow: target.id,
        need: H ? n : Math.max(1, n - 1), tag: 'stack' });
    };
    // spread, then the stack right after it (Hard: both called at once; the meal is served to the tank, who wasn't
    // tossed, and lands a moment after the toss)
    const tossThenMeal = () => {
      meatToss();
      if (H) f.afterKeep(0.01, () => familyMeal(f.alive().length > 1 ? f.tank() : null, f.ct(5.5) + 2.5));
      else f.afterKeep(f.ct(5.5) + 0.2, () => familyMeal(null, f.ct(3.5)));
    };
    // Order Up!: one plate (tower) per player around the room. Hard: soaking makes you Stuffed; soaking again hurts.
    const orderUp = () => {
      const n = Math.max(1, f.alive().length);
      const d = f.ct(7.5);
      f.cast('Order Up!', d, 'bell');
      const base = f.rng() < 0.5 ? Math.PI / 4 : 0;
      for (let i = 0; i < n; i++) {
        const a = base + i * Math.PI * 2 / Math.max(n, 2) + (n === 1 ? Math.PI / 2 : 0);
        const x = Math.cos(a) * 300, y = Math.sin(a) * 300;
        f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: 72 }, delay: d, dmg: dmg.tower, failDmg: dmg.towerFail, need: 1, tag: 'plate',
          onResolve: inside => {
            for (const p of inside) {
              if (H && f.hasDebuff(p.id, 'stuffed')) f.damagePlayer(p, 14000, { kind: 'stuffed' });
              if (H) f.debuff(p.id, 'stuffed', 40);
            }
          } });
      }
    };
    const spiceRack = (count = 3) => {
      const d = f.ct(6);
      f.cast('Spice Rack', d, 'toss');
      for (let i = 0; i < count; i++) {
        const a = f.rng() * Math.PI * 2, r = 120 + f.rng() * 300;
        f.aoe({ kind: 'circle', x: Math.cos(a) * r, y: Math.sin(a) * r, r: 150 }, d, dmg.spice, { tag: 'spice' });
      }
      // one lands on each DPS / healer, so nobody can stand still
      for (const p of f.nonTanks()) f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.spice, tag: 'spice', follow: p.id, lockAt: 2.5 });
    };
    // Whisk: a cross of beams through the boss that turns 30° four times. Walk with it.
    const whisk = () => {
      const dir = f.rng() < 0.5 ? 1 : -1, a0 = f.rng() * Math.PI / 2;
      f.cast('Whisk', f.ct(3), 'whisk');
      for (let i = 0; i < 4; i++) {
        f.afterKeep(i * 1.5, () => f.aoe({ kind: 'cross', x: B.x, y: B.y, angle: a0 + dir * i * Math.PI / 6, len: 1300, w: 130 }, f.ct(3), dmg.whisk, { tag: 'whisk' }));
      }
    };
    const boilOver = () => {
      const d = f.ct(6);
      f.cast('Boil Over', d, 'boil');
      f.mech({ type: 'proximity', shape: { kind: 'circle', x: B.x, y: B.y, r: 520 }, delay: d, dmg: dmg.boil, falloff: 760, tag: 'boil' });
    };
    const farthest = (pool, n) => [...pool].sort((a, b) => Math.hypot(b.x - B.x, b.y - B.y) - Math.hypot(a.x - B.x, a.y - B.y)).slice(0, n);
    const kitchenRush = () => {
      const far = farthest(f.alive(), 1)[0];
      if (!far) return;
      const d = f.ct(4.5);
      B.lockFacing = true;
      f.cast('Kitchen Rush', d, 'rush');
      const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: 0, len: 1100, w: 150 }, delay: d, dmg: dmg.rush, tag: 'rush', aimFromBoss: far.id });
      f.afterKeep(d, () => {
        const len = Math.min(Math.hypot(far.x - B.x, far.y - B.y), 380);
        f.moveBoss(B.x + Math.cos(m.shape.angle) * len, B.y + Math.sin(m.shape.angle) * len, 900);
        B.lockFacing = false;
      });
    };
    const simmer = (outward) => {
      // the last coil reaches the far corners, whatever shape the room is
      const rings = [[0, 130], [130, 260], [260, 390], [390, Math.max(560, ARENA.R + 20)]];
      if (!outward) rings.reverse();
      const step = H ? 1.15 : 1.35;
      rings.forEach(([r2, r], i) => {
        const shape = r2 === 0 ? { kind: 'circle', x: 0, y: 0, r } : { kind: 'donut', x: 0, y: 0, r, r2 };
        f.aoe(shape, 3 + i * step, dmg.simmer, { tag: 'simmer' });
      });
      return 3 + 3 * step;
    };

    // Rolling Meatballs: he lobs giant meatballs against the walls. Each one wobbles where it landed, then rolls
    // straight across the kitchen. No floor marker: the meatball and the way it faces are the warning.
    const meatballs = () => {
      const d = f.ct(3);
      f.cast('Rolling Meatballs', d, 'meatballs');
      const n = H ? 4 : 3, a0 = f.rng() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * Math.PI * 2 / n + (f.rng() - 0.5) * 0.5, R = ARENA.edge(a) - 50;
        const dir = a + Math.PI + (f.rng() - 0.5) * 0.8;   // across the room, not quite through the middle
        f.afterKeep(d - 1.4 + i * (H ? 0.5 : 0.7), () => f.roller({ x: Math.cos(a) * R, y: Math.sin(a) * R, angle: dir,
          speed: H ? 330 : 300, delay: 1.7, dmg: dmg.meatball, r: 44 }));
      }
    };

    // --- Hard only ------------------------------------------------------------------------------
    // Belly Flop: he flops down where he stands (get out from under him), and the shock throws everyone away from him.
    // The tool on his back says what comes straight after: the Ladle Spin (stay out) or the Lid Slam (run back in).
    const bellyFlop = (then = coin('ladle', 'lid')) => {
      const d = f.ct(4);
      f.cast('Belly Flop', d, 'flop', { then });
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: B.x, y: B.y, r: 230 }, delay: d, dmg: dmg.flop, tag: 'flop',
        onResolve: () => {
          for (const p of f.alive()) f.emit({ t: 'kb', id: p.id, x: B.x, y: B.y, d: 280 });
          f.anim(then, 2.8);
          f.aoe(then === 'ladle' ? ladleShape() : lidShape(), 2.8, dmg.ladle, { hidden: true, tag: then });
        } });
    };
    // Cleaver Toss: a cleaver flies along a line at each of the two farthest players (the line follows them until a
    // second before it flies), then comes back along the same line to his hand.
    const cleaverToss = () => {
      const d = f.ct(4.5);
      const far = farthest(f.nonTanks().length ? f.nonTanks() : f.alive(), 2);
      if (!far.length) return;
      f.cast('Cleaver Toss', d, 'throw');
      for (const p of far) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: 0, len: 1300, w: 120 }, delay: d, dmg: dmg.cleaver,
          tag: 'cleaver', aimFromBoss: p.id, lockAt: 1.0,
          onResolve: () => f.aoe(Object.assign({}, m.shape), 1.5, dmg.cleaver, { tag: 'cleaverback' }) });
      }
    };
    // Flambé: brandy splashes in stripes across the kitchen and goes up in flames, every other stripe first, then the rest.
    // The second set shows once the first has burnt, so you step into a burnt stripe.
    const flambe = () => {
      const d = f.ct(5);
      f.cast('Flambé', d, 'flambe');
      const tall = f.rng() < 0.5;   // stripes running top to bottom (6 of them) or side to side (4)
      const n = tall ? 6 : 4, span = tall ? ARENA.hw * 2 : ARENA.hh * 2, len = tall ? ARENA.hh * 2 : ARENA.hw * 2, w = span / n;
      const first = f.rng() < 0.5 ? 0 : 1;
      const lane = i => (tall ? { kind: 'rect', x: -ARENA.hw + w * (i + 0.5), y: -ARENA.hh, angle: Math.PI / 2, len, w }
        : { kind: 'rect', x: -ARENA.hw, y: -ARENA.hh + w * (i + 0.5), angle: 0, len, w });
      for (let i = 0; i < n; i++) {
        if (i % 2 === first) f.aoe(lane(i), d, dmg.flambe, { tag: 'flambe' });
        else f.afterKeep(d, () => f.aoe(lane(i), 2.2, dmg.flambe, { tag: 'flambe' }));
      }
    };

    // --- phase 1 ----------------------------------------------------------------------------
    f.loop(n => {
      const w1 = coin('ladle', 'lid');
      return [
        [4, grease, 'Grease Fire'],
        [7, tenderize, 'Tenderize'],
        [7.5, () => mince(), H ? 'Double Chop' : 'Mince'],
        [H ? 10 : 8, () => ladleOrLid(undefined, w1), LL[w1]],
        H && [8.5, () => bellyFlop(), 'Belly Flop'],
        [H ? 10 : 8, tossThenMeal, 'Meat Toss'],
        [12, () => chopChop(), 'Chop Chop'],
        [9.5, grease, 'Grease Fire'],
        [7, orderUp, 'Order Up!'],
        [6, meatballs, 'Rolling Meatballs'],   // launched while the plates are served; they roll once the plates are done
        [9, tenderize, 'Tenderize'],
        H && [8, cleaverToss, 'Cleaver Toss'],
        [8, tossThenMeal, 'Meat Toss'],
        [12, () => chopChop(), 'Chop Chop'],
        [10, grease, 'Grease Fire'],
        [7],
      ].filter(Boolean);
    });

    // --- intermission + phase 2 ---------------------------------------------------------------
    f.onHp(0.55, () => {
      f.setPhase(2);
      f.mechs.clear();
      f.emit({ t: 'tgclear' });
      f.clearPuddles();
      f.clearRollers();
      B.untargetable = true; B.lockFacing = false; B.cast = null;
      f.anim('leap', 1.4);
      f.moveBoss(0, 0, 700);
      f.seq([
        [1.6, () => { f.cast('Simmer', 3, 'boil'); simmer(true); }, 'Simmer'],
        [7.2, () => { f.cast('Simmer', 3, 'boil'); simmer(false); }, 'Simmer'],
        [7.8, () => { B.untargetable = false; f.anim('roar', 1); p2(); }],
      ]);
    });

    const p2 = () => f.loop(n => {
      const w = coin('ladle', 'lid');
      return [
        [2, grease, 'Grease Fire'],
        [7, tenderize, 'Tenderize'],
        [8, whisk, 'Whisk'],
        [9, () => { spiceRack(); f.afterKeep(f.ct(6) + 0.3, () => ladleOrLid(f.ct(3), w)); }, 'Spice Rack'],
        [11, () => { orderUp(); if (H) f.afterKeep(1.0, () => meatToss()); }, 'Order Up!'],
        [10, H ? kitchenRush : boilOver, H ? 'Kitchen Rush' : 'Boil Over'],
        H && [8, flambe, 'Flambé'],
        [8, tenderize, 'Tenderize'],
        [8, () => (H ? mince() : chopChop()), H ? 'Double Chop' : 'Chop Chop'],
        H && [9, () => bellyFlop(), 'Belly Flop'],
        // the jars lock on everyone while they share the meal, and fall two seconds after it lands
        [9, () => { familyMeal(); f.afterKeep(1.5, () => spiceRack(2)); }, 'Family Meal'],
        [10, boilOver, 'Boil Over'],
        [9, () => { meatballs(); if (H) f.afterKeep(2.5, cleaverToss); }, 'Rolling Meatballs'],
        [11, grease, 'Grease Fire'],
        [8, H ? flambe : whisk, H ? 'Flambé' : 'Whisk'],
        [9],
      ].filter(Boolean);
    });

    // soft enrage: below 15% he starts eating, hitting everyone and getting stronger each time
    f.onHp(0.15, () => {
      const gorge = () => {
        if (f.state !== 'live') return;
        f.anim('gorge', 2);
        f.raidwide(dmg.gorge, 2);
        B.dmgUp += 0.1;
        f.afterKeep(18, gorge, 'Gorge');
      };
      f.afterKeep(3, gorge, 'Gorge');
    });
  },
};

if (typeof module !== 'undefined') module.exports = { GRUBNAK };
