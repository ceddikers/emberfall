// Boss III: Volkar, the Storm Titan — "The Peak".
// Polarity, knockbacks, rods that become cover, and a room that closes in. The hardest healing fight.
// He is a giant who never leaves the middle of the peak; everything comes out of him.
//   Every player carries a charge, + or − (an aura in its colour). Polarity Surge: stand with someone of the
//     opposite charge; two of the same charge together arc, and anyone alone takes the full surge.
//   Thunder Crash: a stack on every + player, so each +/− pair stacks together and pairs keep apart; Static Field
//     (everyone spreads) follows straight after.
//   Static Field: spread out. Thunderclap: raidwide. Titan Fist: tankbuster that cleaves.
//   Lightning Rods: each rod wants one person under it when the bolt lands. Catching one leaves you Conductive,
//     and the next one you catch hurts far more, so people take turns. An uncaught rod strikes everyone.
//     After the strike the rod stays planted for 30 s: still air behind it shelters you from Gale Slam.
//   Gale Slam: a blast of wind throws everyone away from him. Slammed into the wall hurts; behind a rod you stay put.
//   Storm Walls: walls of wind turn slowly around him. Walk with them.
//   Pulse: the storm's light, constant damage on everyone, stepping up every minute.
//   Phase 2 at 50%: the edge of the peak electrifies and closes in, three warned steps, to about 60% of the room.
//     Everything happens in less space; late in the fight nobody survives a Gale Slam without a rod.
// Hard: charges flip at 50%; the rods land together with a Gale Slam (shelter behind the rod you're catching);
// three storm walls that turn faster; Titan Fist leaves the tank Conductive. Three moves only Hard has:
//   Chain Lightning: a bolt gathers over one player; when it strikes it leaps to whoever stands nearest them (within
//     300), and on from there, up to three more times.
//   Ball Lightning: crackling orbs gather at the cliff edge, then drift slowly across the peak. Touching one hurts and
//     throws you aside.
//   Skyfall (phase 2): the sky comes down on the spot where a player stood when he called it. The closer you are to
//     it, the harder it hits.

const VOLKAR = {
  id: 'volkar', name: 'Volkar', title: 'The Storm Titan',
  hp: { normal: 1650000, hard: 2200000 },
  autoDmg: { normal: 1550, hard: 1550 },
  enrage: { normal: 390, hard: 420 },
  enrageName: 'Skybreak',
  vuln: 0.5,
  spawn: { x: 0, y: 0 }, anchor: true,
  arena: { theme: 'peak' },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      clap: 7500, fist: H ? 22000 : 20000, surgeAlone: 8500, surgeSame: 15000, surgePair: 2000,
      crash: 15000, field: 6500, rod: 5000, rodAgain: 12000, rodFail: 12000, slam: 9000, wall: H ? 9500 : 11000, edge: 12000, pulse: H ? 480 : 420,
      chain: 7000, orb: 12000, skyfall: 36000,
    };
    const PAIR = 150;        // how close a polarity partner has to stand
    const ROD_R = 70;        // a rod's catch circle
    const GALE = 300;        // how far Gale Slam throws you
    const COVER_W = 46;      // half the width of the still air behind a rod
    const CHAIN = 300;       // how far Chain Lightning leaps
    const RINGS = [470, 400, 330];

    // shared with the bots and the host's view (raid-host.js)
    f.polarity = new Map(); f.posts = []; f.edgeNext = null;
    const charge = id => f.polarity.get(id) || 1;
    const sendPolarity = flip => f.emit({ t: 'pol', m: [...f.polarity].map(([id, s]) => [id, s]), flip: flip ? 1 : 0 });

    // --- building blocks ------------------------------------------------------------------
    // half the party +, half −, shuffled (the dead keep theirs for when they're raised)
    const assignPolarity = () => {
      f.shuffle(f.players()).forEach((p, i) => f.polarity.set(p.id, i % 2 ? -1 : 1));
      sendPolarity(false);
    };
    const flipPolarity = () => { for (const [id, s] of f.polarity) f.polarity.set(id, -s); sendPolarity(true); };

    const thunderclap = () => {
      f.cast('Thunderclap', f.ct(4), 'clap');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(4), dmg: dmg.clap, hidden: true, tag: 'clap' });
    };

    const titanFist = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.5);
      f.cast('Titan Fist', d, 'fist');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 1.3, angle: B.facing }, delay: d,
        dmg: dmg.fist, target: tank.id, aimFromBoss: tank.id, tag: 'buster',
        onResolve: () => { if (H) f.debuff(tank.id, 'conductive', 20); } });
    };

    // Polarity Surge: same charges together arc; opposite charges together cancel out; alone takes it all
    const surge = () => {
      const d = f.ct(6);
      f.cast('Polarity Surge', d, 'surge');
      f.mech({ type: 'polarity', shape: { kind: 'circle', x: 0, y: 0, r: PAIR }, delay: d, dmg: 0, tag: 'surge', avoidable: false,
        onResolve: () => {
          const al = f.alive();
          for (const p of al) {
            const near = al.filter(o => o.id !== p.id && Math.hypot(o.x - p.x, o.y - p.y) <= PAIR);
            if (near.some(o => charge(o.id) === charge(p.id))) f.damagePlayer(p, dmg.surgeSame, { kind: 'arc', avoidable: true });
            else if (near.length) f.damagePlayer(p, dmg.surgePair, { kind: 'surge' });
            else f.damagePlayer(p, dmg.surgeAlone, { kind: 'surge' });
          }
        } });
    };

    // Thunder Crash: a stack on every + player, so pairs stack together and keep apart from the other pair
    const crash = (d = f.ct(5.5)) => {
      const al = f.alive();
      const owners = al.filter(p => charge(p.id) > 0);
      f.cast('Thunder Crash', d, 'crash');
      for (const p of (owners.length ? owners : al.slice(0, 1))) {
        f.mech({ type: 'stack', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.crash, follow: p.id, need: 2, tag: 'crash' });
      }
      return d;
    };
    // Static Field: everyone spreads
    const field = (d = f.ct(5), noCast, mult = 1) => {
      if (noCast) f.anim('field', d); else f.cast('Static Field', d, 'field');
      for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.field * mult, follow: p.id, tag: 'static' });
    };
    // stack in pairs, then scatter (Normal leaves a moment to heal in between)
    const crashField = () => { const d = crash(); f.afterKeep(d + 0.1, () => (H ? field(3.3, true, 0.55) : field(3.8, true, 0.6))); };

    // Lightning Rods, and the posts they leave behind
    const post = (x, y, dur = 30) => {
      const id = f.nextMechId++;
      f.posts.push({ id, x, y, end: f.t + dur });
      f.emit({ t: 'post', id, x: Math.round(x), y: Math.round(y), dur });
    };
    const rods = (n = H ? 3 : 2, d = f.ct(8)) => {
      n = Math.min(n, Math.max(1, f.alive().length));
      const room = f.edgeNext ? f.edgeNext.r : ARENA.r;
      f.cast('Lightning Rods', f.ct(3), 'rods');
      const a0 = f.rng() * TAU;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * TAU / n + (f.rng() - 0.5) * 0.4, r = Math.max(150, (room - 110) * (0.62 + f.rng() * 0.28));
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: ROD_R }, delay: d, dmg: dmg.rod, failDmg: dmg.rodFail, need: 1, tag: 'rod',
          onResolve: inside => {
            for (const p of inside) {
              if (f.hasDebuff(p.id, 'conductive')) f.damagePlayer(p, dmg.rodAgain, { kind: 'conductive' });
              f.debuff(p.id, 'conductive', 32);
            }
            post(x, y);
          } });
      }
      return d;
    };
    // still air: anything standing (posts, and rods waiting for their bolt) shelters whoever is right behind it
    const covers = () => {
      f.posts = f.posts.filter(c => c.end > f.t);
      const out = f.posts.map(c => ({ x: c.x, y: c.y }));
      for (const m of f.mechs.values()) if (m.tag === 'rod') out.push({ x: m.shape.x, y: m.shape.y });
      return out;
    };
    const sheltered = p => covers().some(c => {
      const cx = c.x - B.x, cy = c.y - B.y, cd = Math.hypot(cx, cy);
      if (cd < 1) return false;
      const ux = cx / cd, uy = cy / cd, px = p.x - B.x, py = p.y - B.y;
      return px * ux + py * uy >= cd - 30 && Math.abs(-px * uy + py * ux) <= COVER_W;
    });

    // Gale Slam: everyone is thrown away from him, except whoever stands behind a rod. Hitting the wall hurts.
    const galeSlam = (d = f.ct(5)) => {
      f.cast('Gale Slam', d, 'gale');
      f.mech({ type: 'gale', shape: { kind: 'circle', x: B.x, y: B.y, r: 120 }, delay: d, dmg: 0, dist: GALE, tag: 'gale', avoidable: false,
        onResolve: () => {
          for (const p of f.alive()) {
            if (sheltered(p)) continue;
            const a = Math.atan2(p.y - B.y, p.x - B.x);
            if (ARENA.sd(p.x + Math.cos(a) * GALE, p.y + Math.sin(a) * GALE) > -12) f.damagePlayer(p, dmg.slam, { kind: 'slam', avoidable: true });
            f.emit({ t: 'kb', id: p.id, x: B.x, y: B.y, d: GALE });
          }
        } });
    };
    // rods, then the gale once they stand (Hard: both at once, so you shelter behind the rod you're catching)
    const rodsGale = () => {
      if (H) { const d = rods(); f.after(0.01, () => galeSlam(d - 0.01)); }
      else { rods(); f.after(f.ct(5), () => galeSlam()); }
    };

    const stormWalls = () => {
      const d = f.ct(3);
      f.cast('Storm Walls', d, 'walls');
      f.sweep({ x: B.x, y: B.y, arms: H ? 3 : 2, a0: f.rng() * TAU, spin: (f.rng() < 0.5 ? 1 : -1) * (H ? 0.56 : 0.5),
        w: 150, delay: d, dur: H ? 12 : 10, dmg: dmg.wall, tag: 'storm' });
    };

    // the storm's light: constant damage on everyone, a fifth stronger every minute
    const pulse = () => {
      if (f.state !== 'live') return;
      const k = 1 + 0.2 * Math.floor(f.t / 60);
      f.emit({ t: 'pulse', k: +k.toFixed(2) });
      for (const p of f.alive()) f.damagePlayer(p, dmg.pulse * k, { kind: 'pulse' });
      f.afterKeep(4, pulse);
    };

    // the electrified edge closes in: sparks mark the new wall, then it jumps there
    const edgeStep = (r, warn = 5) => {
      f.edgeNext = { r, at: f.t + warn };
      f.emit({ t: 'edgewarn', r, dur: warn });
      f.afterKeep(warn, () => {
        for (const p of f.alive()) if (Math.hypot(p.x - 0, p.y - 0) > r - 16) f.damagePlayer(p, dmg.edge, { kind: 'edge', avoidable: true });
        ARENA.resize(r);
        f.edgeGrace = f.t + 2.5; f.edgeNext = null;
        f.posts = f.posts.filter(c => Math.hypot(c.x, c.y) < r - 30);
        f.emit({ t: 'edge', r });
      });
    };

    // --- Hard only ------------------------------------------------------------------------------
    // Chain Lightning: a bolt gathers over one player. It strikes them, then leaps to the nearest player within CHAIN of
    // the last one struck, up to three more times. Keep your distance from them, and from each other.
    const chainLightning = () => {
      const d = f.ct(6);
      const pool = f.nonTanks().length ? f.nonTanks() : f.alive();
      const target = f.pick(pool);
      if (!target) return;
      f.cast('Chain Lightning', d, 'chain');
      f.mech({ type: 'chain', shape: { kind: 'circle', x: target.x, y: target.y, r: CHAIN }, delay: d, dmg: 0, follow: target.id, tag: 'chain', avoidable: false,
        onResolve: () => {
          let from = f.alive().find(p => p.id === target.id);
          const struck = new Set(), path = [];
          for (let jump = 0; from && jump < 4; jump++) {
            struck.add(from.id); path.push(from.id);
            f.damagePlayer(from, dmg.chain, { kind: 'chain', avoidable: jump > 0 });
            let next = null, nd = CHAIN + 14;
            for (const p of f.alive()) { if (struck.has(p.id)) continue; const dd = Math.hypot(p.x - from.x, p.y - from.y); if (dd < nd) { nd = dd; next = p; } }
            from = next;
          }
          f.emit({ t: 'chain', ids: path });
        } });
    };
    // Ball Lightning: orbs gather at the edge of the peak, then drift slowly across it. Touch one and it bursts.
    const ballLightning = () => {
      const d = f.ct(3);
      f.cast('Ball Lightning', d, 'orbs');
      const n = 4, a0 = f.rng() * TAU, room = f.edgeNext ? f.edgeNext.r : ARENA.r;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * TAU / n + (f.rng() - 0.5) * 0.4, R = room - 50;
        const dir = a + Math.PI + (f.rng() - 0.5) * 0.9;
        f.afterKeep(d - 1.2 + i * 0.4, () => f.roller({ x: Math.cos(a) * R, y: Math.sin(a) * R, angle: dir, speed: 135, delay: 2.2, dmg: dmg.orb, r: 40, kb: 120, tag: 'orb' }));
      }
    };
    // Skyfall: the sky falls on where a player stood when he called it; the nearer you are, the harder it hits
    const skyfall = () => {
      const d = f.ct(6);
      const p = f.pick(f.alive());
      if (!p) return;
      f.cast('Skyfall', d, 'skyfall');
      const at = ARENA.clamp({ x: p.x, y: p.y }, 80);
      f.mech({ type: 'proximity', shape: { kind: 'circle', x: at.x, y: at.y, r: 260 }, delay: d, dmg: dmg.skyfall, falloff: 520, tag: 'skyfall' });
    };

    // --- phase 1 ----------------------------------------------------------------------------
    assignPolarity();
    f.afterKeep(6, pulse);
    f.loop(n => [
      [4, thunderclap, 'Thunderclap'],
      [7, titanFist, 'Titan Fist'],
      [8, surge, 'Polarity Surge'],
      [9, () => rods(), 'Lightning Rods'],
      [8, () => galeSlam(), 'Gale Slam'],
      [9, crashField, 'Thunder Crash'],
      H && [11, chainLightning, 'Chain Lightning'],
      [H ? 10 : 11, stormWalls, 'Storm Walls'],
      [14, () => field(), 'Static Field'],
      [8, titanFist, 'Titan Fist'],
      [8, rodsGale, 'Lightning Rods'],
      H && [14, ballLightning, 'Ball Lightning'],
      [H ? 10 : 14, surge, 'Polarity Surge'],
      [10, thunderclap, 'Thunderclap'],
      [7],
    ].filter(Boolean));

    // --- phase 2: the sky closes in --------------------------------------------------------------
    f.onHp(0.5, () => {
      f.setPhase(2);
      f.mechs.clear();
      f.emit({ t: 'tgclear' });
      f.clearSweeps();
      f.clearRollers();
      B.cast = null; B.lockFacing = false;
      f.cast('Eye of the Storm', 4, 'storm');
      if (H) f.afterKeep(2, flipPolarity);
      RINGS.forEach((r, i) => f.afterKeep(4 + i * 40, () => edgeStep(r, 5)));
      f.seq([[6, () => p2()]]);
    });

    const p2 = () => f.loop(n => [
      [2, thunderclap, 'Thunderclap'],
      [7, titanFist, 'Titan Fist'],
      [9, crashField, 'Thunder Crash'],
      [11, rodsGale, 'Lightning Rods'],
      H && [14, skyfall, 'Skyfall'],
      [H ? 10 : 14, surge, 'Polarity Surge'],
      [10, stormWalls, 'Storm Walls'],
      [14, titanFist, 'Titan Fist'],
      [8, () => field(), 'Static Field'],
      H && [9, chainLightning, 'Chain Lightning'],
      [9, thunderclap, 'Thunderclap'],
      [8, rodsGale, 'Lightning Rods'],
      H && [14, n % 2 ? skyfall : ballLightning, n % 2 ? 'Skyfall' : 'Ball Lightning'],
      [H ? 11 : 14, crashField, 'Thunder Crash'],
      [11, surge, 'Polarity Surge'],
      [9],
    ].filter(Boolean));
  },
};

if (typeof module !== 'undefined') module.exports = { VOLKAR };
