// Boss I: Grubnak, the Ogre Chef — "The Scullery".
// The teaching fight: every core FF14 mechanic appears alone first, then in pairs.
//   Phase 1 (100% → 55%): Grease Fire (raidwide), Tenderize (tankbuster cleave), Mince (left/right half-room,
//     told by which cleaver glows), Ladle Spin (out) / Lid Slam (in), Meat Toss (spread, leaves grease puddles),
//     Family Meal (stack), Order Up! (plate towers), Chop Chop (cleave + in/out combo).
//   Intermission at 55%: he dives into the stockpot; Simmer waves ripple out, then back in.
//   Phase 2: Whisk (rotating cross), Spice Rack (delayed circles), Boil Over (get far away), Kitchen Rush (Hard),
//     remixes of phase 1, Gorge below 15% (soft enrage), Last Call at the hard enrage timer.
// Hard: telegraphs for Mince / Ladle / Lid are not drawn (read his cleavers and pots), Mince becomes a double
// chop, Tenderize leaves a vulnerability for the next one, plates leave "Stuffed", spread + stack overlap,
// faster casts and 25% more damage.

const GRUBNAK = {
  id: 'grubnak', name: 'Grubnak', title: 'The Ogre Chef',
  hp: { normal: 1250000, hard: 1700000 },
  autoDmg: { normal: 1300, hard: 1300 },
  enrage: { normal: 420, hard: 375 },
  enrageName: 'Last Call',
  arena: { theme: 'kitchen' },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const dmg = {
      grease: 6000, buster: H ? 21000 : 18000, mince: 9000, ladle: 9000, spread: 5500, stack: 17000,
      puddle: 1800, tower: 3500, towerFail: 9000, simmer: 9000, whisk: 9000, spice: 9000, boil: H ? 36000 : 30000, rush: 12000, gorge: 4500,
      meatball: 9000,
    };

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
      const first = f.rng() < 0.5 ? 'left' : 'right';
      const second = first === 'left' ? 'right' : 'left';
      B.lockFacing = true;
      f.cast(H ? 'Double Chop' : 'Mince', delay, 'mince', { side: first, second: H ? second : null });
      f.aoe(halfRoom(first), delay, dmg.mince, { hidden: H, tag: 'mince' });
      if (H) f.afterKeep(delay - 0.01, () => f.aoe(halfRoom(second), 2.2, dmg.mince, { hidden: true, tag: 'mince' }));
      f.afterKeep(delay + (H ? 2.3 : 0.1), () => { B.lockFacing = false; if (then) then(); });
      return delay + (H ? 2.2 : 0);
    };
    // Ladle Spin: stay out (point-blank circle). Lid Slam: get in (donut, safe under him).
    const ladleOrLid = (delay = f.ct(4), which) => {
      which = which || (f.rng() < 0.5 ? 'ladle' : 'lid');
      if (which === 'ladle') {
        f.cast('Ladle Spin', delay, 'ladle');
        f.aoe({ kind: 'circle', x: B.x, y: B.y, r: 240 }, delay, dmg.ladle, { hidden: H, tag: 'ladle' });
      } else {
        f.cast('Lid Slam', delay, 'lid');
        f.aoe({ kind: 'donut', x: B.x, y: B.y, r: 1300, r2: 190 }, delay, dmg.ladle, { hidden: H, tag: 'lid' });
      }
      return delay;
    };
    // Chop Chop: Mince, then Ladle/Lid right after (the combo the first half has been teaching).
    const chopChop = () => {
      const d = f.ct(5);
      const first = f.rng() < 0.5 ? 'left' : 'right';
      const second = f.rng() < 0.5 ? 'ladle' : 'lid';
      B.lockFacing = true;
      f.cast('Chop Chop', d, 'mince', { side: first, then: second });
      f.aoe(halfRoom(first), d, dmg.mince, { hidden: H, tag: 'mince' });
      f.afterKeep(d - 0.01, () => {
        B.lockFacing = false;
        f.anim(second, 2.4);
        if (second === 'ladle') f.aoe({ kind: 'circle', x: B.x, y: B.y, r: 240 }, 2.4, dmg.ladle, { hidden: H, tag: 'ladle' });
        else f.aoe({ kind: 'donut', x: B.x, y: B.y, r: 1300, r2: 190 }, 2.4, dmg.ladle, { hidden: H, tag: 'lid' });
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
          onResolve: () => { const q = f.alive().find(z => z.id === p.id); if (q) f.puddle(q.x, q.y, H ? 105 : 85, H ? 28 : 22, dmg.puddle, 1, 'grease'); } });
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
        f.afterKeep(i * 1.6, () => f.aoe({ kind: 'cross', x: B.x, y: B.y, angle: a0 + dir * i * Math.PI / 6, len: 1300, w: 130 }, f.ct(3) - 0.4 + 0.4, dmg.whisk, { tag: 'whisk' }));
      }
    };
    const boilOver = () => {
      const d = f.ct(6);
      f.cast('Boil Over', d, 'boil');
      f.mech({ type: 'proximity', shape: { kind: 'circle', x: B.x, y: B.y, r: 520 }, delay: d, dmg: dmg.boil, falloff: 760, tag: 'boil' });
    };
    const kitchenRush = () => {
      let far = null, fd = -1;
      for (const p of f.alive()) { const d = Math.hypot(p.x - B.x, p.y - B.y); if (d > fd) { fd = d; far = p; } }
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
      const step = H ? 1.15 : 1.45;
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
        f.afterKeep(d - 1.4 + i * (H ? 0.5 : 0.75), () => f.roller({ x: Math.cos(a) * R, y: Math.sin(a) * R, angle: dir,
          speed: H ? 330 : 280, delay: 1.7, dmg: dmg.meatball, r: 44 }));
      }
    };

    // --- phase 1 ----------------------------------------------------------------------------
    const p1 = (loop) => {
      f.seq([
        [5, grease],
        [8, tenderize],
        [9, () => mince()],
        [9, () => ladleOrLid()],
        [9, () => { if (H && loop > 0) { meatToss(); f.afterKeep(0.01, () => familyMeal(null, f.ct(5.5))); } else meatToss(); }],
        [10, () => { if (!(H && loop > 0)) familyMeal(); }],
        [10, chopChop],
        [11, grease],
        [9, meatballs],
        [10, orderUp],
        [10, tenderize],
        [8, () => { meatToss(); f.afterKeep(f.ct(5.5) + 0.2, () => familyMeal(null, f.ct(3.5))); }],
        [14, chopChop],
        [12, grease],
        [8, () => p1(loop + 1)],
      ]);
    };
    p1(0);

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
        [1.6, () => { f.cast('Simmer', 3, 'boil'); simmer(true); }],
        [7.6, () => { f.cast('Simmer', 3, 'boil'); simmer(false); }],
        [8.2, () => { B.untargetable = false; f.anim('roar', 1); p2(0); }],
      ]);
    });

    const p2 = (loop) => {
      f.seq([
        [2, grease],
        [8, tenderize],
        [9, whisk],
        [10, () => { spiceRack(); f.afterKeep(f.ct(6) + 0.3, () => ladleOrLid(f.ct(3))); }],
        [12, () => { orderUp(); if (H) f.afterKeep(1.0, () => meatToss()); }],
        [11, () => (H ? kitchenRush() : boilOver())],
        [8, tenderize],
        [9, () => (H ? mince() : chopChop())],
        [10, () => { familyMeal(); if (loop > 0 || H) f.afterKeep(0.2, () => spiceRack(2)); }],
        [11, boilOver],
        [10, meatballs],
        [10, grease],
        [8, whisk],
        [9, () => p2(loop + 1)],
      ]);
    };

    // soft enrage: below 15% he starts eating, hitting everyone and getting stronger each time
    f.onHp(0.15, () => {
      const gorge = () => {
        if (f.state !== 'live') return;
        f.anim('gorge', 2);
        f.raidwide(dmg.gorge, 2);
        B.dmgUp += 0.1;
        f.afterKeep(20, gorge);
      };
      f.afterKeep(3, gorge);
    });
  },
};

if (typeof module !== 'undefined') module.exports = { GRUBNAK };
