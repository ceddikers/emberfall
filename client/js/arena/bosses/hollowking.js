// Boss IV: The Hollow King, Lord of the Barrow — "The Barrow". The final exam: three phases, everything combined.
// He is a dead king who walks after his tank like the first bosses did.
//   Royal Gaze: he lifts his head. Anyone looking at him when it lands is caught: hurt, held in place for a moment,
//     and left Dreading; caught again while Dreading hurts far more. Turn your back (your hero faces where they walk).
//   Royal Doom: a sentence on one player (two on Hard) that kills when it runs out. Lanterns are set down around
//     the hall; the doomed walk into one's light, or anyone picks one up (walk over it) and carries it to them.
//   Grave Cleave: tankbuster that leaves the tank bleeding. Barrow Knell: raidwide. Grave Marks: spread out.
//   His swings: Sceptre Sweep (a wide cone in front), Barrow Stomp (around him) and Crown of Graves (everywhere
//     but close to him).
//   Phase 2 at 65%, Echoes: two Echo Knights rise by the walls. Each remembers one of his swings as he makes it (it
//     flashes on the knight) and replays it from where it stands a few seconds later, aimed at the middle of the hall.
//     Barrow Bells: two bells, two people under each; a missed bell dooms everyone.
//   Phase 3 at 30%, The Long Night: the lanterns go out. The hall goes dark but for a little light around each hero
//     and the last lantern, which someone carries; now it's the only cure for Doom. Everything comes back shorter.
//     The moon finishes setting: hard enrage.
// Hard: Doom on two players at once; the Gaze lands together with an Echo Knight's replay; replays warn for less time.

const HOLLOWKING = {
  id: 'hollowking', name: 'The Hollow King', title: 'Lord of the Barrow',
  hp: { normal: 2300000, hard: 3000000 },
  autoDmg: { normal: 1450, hard: 1450 },
  enrage: { normal: 540, hard: 480 },
  enrageName: 'Moonset',
  spawn: { x: 0, y: -80 },
  arena: { theme: 'barrow' },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      knell: 6500, cleave: H ? 23000 : 18500, bleed: 700, gaze: 6000, gazeAgain: 12000, swing: 9000, echo: 9000,
      marks: 5500, bell: 3000, bellFail: 2000,
    };
    const GAZE_ARC = 1.2;     // you're looking at him if he's within this angle of where you face (~70° either side)
    const LANT_PICK = 40;     // walk this close to a lantern on the floor to pick it up
    const LANT_CURE = 85;     // a lantern's light cures Doom this far out
    const ECHO_WARN = H ? 1.8 : 2.6;

    // shared with the bots and the host's view (raid-host.js)
    f.lanterns = []; f.doomed = new Map(); f.knights = []; f.echoPlan = []; f.night = false;
    const memory = [null, null];   // the swing each knight remembers
    let memNext = 0, lastSwing = null;

    const sendLanterns = () => f.emit({ t: 'lant', l: f.lanterns.map(l => [l.id, Math.round(l.x), Math.round(l.y), l.carrier ?? null, l.last ? 1 : 0]) });
    const sendKnights = () => f.emit({ t: 'knights', k: f.knights.map(k => [k.id, k.x, k.y, +k.f.toFixed(2)]) });
    const alive = id => f.alive().find(p => p.id === id);

    // --- lanterns and Doom ------------------------------------------------------------------
    // a lantern on the floor goes to whoever walks over it (not the doomed, one each); the light cures Doom, and a
    // cure uses the lantern up, except the last lantern of the Long Night
    f.ticker(() => {
      let dirty = false;
      const al = f.alive();
      for (const l of f.lanterns) {
        if (l.carrier == null) continue;
        const c = al.find(p => p.id === l.carrier);
        if (c) { l.x = c.x; l.y = c.y; } else { l.carrier = null; dirty = true; }   // the carrier fell: it drops where they stood
      }
      for (const [id, end] of f.doomed) {
        const p = al.find(q => q.id === id);
        if (!p) { f.doomed.delete(id); continue; }
        const l = f.lanterns.find(o => Math.hypot(o.x - p.x, o.y - p.y) < LANT_CURE);
        if (l) {
          f.doomed.delete(id); delete p.s.debuffs.doom;
          f.emit({ t: 'cure', id, l: l.id });
          if (!l.last) f.lanterns = f.lanterns.filter(o => o !== l);
          dirty = true;
        } else if (f.t >= end) {
          f.doomed.delete(id);
          f.damagePlayer(p, 9999999, { kind: 'doom' });
        }
      }
      for (const l of f.lanterns) {
        if (l.carrier != null) continue;
        const p = al.find(q => !f.doomed.has(q.id) && !f.lanterns.some(o => o.carrier === q.id) && Math.hypot(q.x - l.x, q.y - l.y) < LANT_PICK);
        if (p) { l.carrier = p.id; dirty = true; }
      }
      // spare lanterns gutter out once nobody is doomed
      if (!f.doomed.size) {
        const keep = f.lanterns.filter(l => l.last || f.t < l.fade);
        if (keep.length !== f.lanterns.length) { f.lanterns = keep; dirty = true; }
      }
      if (dirty) sendLanterns();
    });

    // lanterns set down around the hall, spread out, away from the walls
    const setLanterns = (n, until) => {
      const a0 = f.rng() * TAU;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * TAU / n + (f.rng() - 0.5) * 0.5;
        let x = Math.cos(a) * 330, y = Math.sin(a) * 250;
        if (ARENA.sd(x, y) > -70) { x *= 0.8; y *= 0.8; }
        f.lanterns.push({ id: f.nextMechId++, x, y, carrier: null, last: false, fade: until });
      }
      sendLanterns();
    };
    const doomOn = (ids, dur) => {
      for (const id of ids) { f.doomed.set(id, f.t + dur); f.debuff(id, 'doom', dur); }
      f.emit({ t: 'doomed', ids, dur });
      if (!f.night) setLanterns(ids.length + 1, f.t + dur + 2);
    };
    const royalDoom = (dur = H ? 13 : 15) => {
      const d = f.ct(3);
      f.cast('Royal Doom', d, 'doom');
      f.afterKeep(d, () => {
        const tank = f.tank();
        const pool = f.shuffle(f.alive().filter(p => (!tank || p.id !== tank.id) && !f.doomed.has(p.id)));
        const ids = pool.slice(0, H ? 2 : 1).map(p => p.id);
        if (ids.length) doomOn(ids, dur);
      });
    };

    // --- the court ------------------------------------------------------------------------------
    const looking = p => {
      let d = Math.atan2(B.y - p.y, B.x - p.x) - (p.a || 0);
      while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      return Math.abs(d) < GAZE_ARC;
    };
    const gaze = (d = f.ct(4)) => {
      f.cast('Royal Gaze', d, 'gaze');
      f.mech({ type: 'gaze', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: d, dmg: 0, tag: 'gaze', avoidable: false,
        onResolve: () => {
          for (const p of f.alive()) {
            if (!looking(p)) continue;
            f.damagePlayer(p, f.hasDebuff(p.id, 'dread') ? dmg.gazeAgain : dmg.gaze, { kind: 'gaze', avoidable: true });
            f.debuff(p.id, 'rooted', 2); f.debuff(p.id, 'dread', 20);
            f.emit({ t: 'gazed', id: p.id });
          }
        } });
    };

    const knell = () => {
      f.cast('Barrow Knell', f.ct(4), 'knell');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(4), dmg: dmg.knell, hidden: true, tag: 'knell' });
    };

    const bleed = id => {
      f.debuff(id, 'bleed', 9.2);
      for (let i = 1; i <= 6; i++) f.afterKeep(i * 1.5, () => { const p = alive(id); if (p && f.hasDebuff(id, 'bleed')) f.damagePlayer(p, dmg.bleed, { kind: 'bleed' }); });
    };
    const graveCleave = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.5);
      f.cast('Grave Cleave', d, 'cleave');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 320, arc: 1.4, angle: B.facing }, delay: d,
        dmg: dmg.cleave, target: tank.id, aimFromBoss: tank.id, tag: 'buster', onResolve: () => { if (alive(tank.id)) bleed(tank.id); } });
    };

    const marks = (d = f.ct(5)) => {
      f.cast('Grave Marks', d, 'marks');
      for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 120 }, delay: d, dmg: dmg.marks, follow: p.id, tag: 'marks' });
    };

    // --- his swings, and the knights who remember them --------------------------------------------
    const swingShape = (kind, x, y, face, echo) => (
      kind === 'sweep' ? { kind: 'cone', x, y, r: 1100, arc: echo ? 1.25 : 2.0, angle: face }
        : kind === 'stomp' ? { kind: 'circle', x, y, r: echo ? 290 : 320 }
          : { kind: 'donut', x, y, r: 1100, r2: echo ? 250 : 210 });
    const SWING_NAME = { sweep: 'Sceptre Sweep', stomp: 'Barrow Stomp', ring: 'Crown of Graves' };
    const swing = kind => {
      if (!kind) { const opts = ['sweep', 'stomp', 'ring'].filter(k => k !== lastSwing); kind = opts[Math.floor(f.rng() * opts.length)]; }
      lastSwing = kind;
      const d = f.ct(4.5);
      f.cast(SWING_NAME[kind], d, kind);
      if (kind === 'sweep') B.lockFacing = true;
      f.mech({ type: 'aoe', shape: swingShape(kind, B.x, B.y, B.facing, false), delay: d, dmg: dmg.swing, tag: kind,
        onResolve: () => {
          if (kind === 'sweep') B.lockFacing = false;
          // a risen knight remembers it
          if (f.knights.length) {
            const k = f.knights[memNext % f.knights.length];
            memory[memNext % f.knights.length] = kind;
            f.emit({ t: 'kmem', id: k.id, kind });
            memNext++;
          }
        } });
      return kind;
    };
    // a knight replays what it remembers, from where it stands, aimed at the middle of the hall
    const knightSwing = (k, kind) => {
      const shape = swingShape(kind, k.x, k.y, k.f, true);
      f.echoPlan = f.echoPlan.filter(e => e.knight !== k.id || e.kind !== kind);
      f.emit({ t: 'kswing', id: k.id, kind, dur: ECHO_WARN });
      f.mech({ type: 'aoe', shape, delay: ECHO_WARN, dmg: dmg.echo, tag: 'e' + kind });
    };
    // replay what the knights remember: each in turn (or only the last one, in the Long Night). Returns when the
    // first replay lands, so the Gaze can land with it on Hard.
    const echo = (lead = 1.5, onlyLast) => {
      const order = onlyLast ? [(memNext - 1 + f.knights.length) % f.knights.length] : f.knights.map((_, i) => i);
      let t = lead, first = null;
      for (const i of order) {
        const k = f.knights[i], kind = memory[i];
        if (!k || !kind) continue;
        // the bots "remember" too: where each replay will land, before it shows
        f.echoPlan.push({ knight: k.id, kind, at: f.t + t + ECHO_WARN, shape: swingShape(kind, k.x, k.y, k.f, true) });
        f.after(t, () => knightSwing(k, kind));   // (dropped if the phase changes first)
        if (first == null) first = t + ECHO_WARN;
        t += 3.4;
      }
      for (const i of order) memory[i] = null;
      return first;
    };
    // knights stand by the side walls, one each side, facing the middle
    const placeKnights = () => {
      const ys = [[-170, 170], [170, -170], [0, 0], [-200, -200], [200, 200]][Math.floor(f.rng() * 5)];
      const flip = f.rng() < 0.5 ? 1 : -1;
      f.knights = [-1, 1].map((sx, i) => {
        const x = sx * flip * 505, y = ys[i];
        return { id: f.nextMechId++, x, y, f: Math.atan2(-y, -x) };
      });
      memory[0] = memory[1] = null; memNext = 0;
      sendKnights();
    };

    // --- Barrow Bells: two people under each bell, or everyone is doomed --------------------------
    const bells = () => {
      const d = f.ct(8);
      f.cast('Barrow Bells', f.ct(3), 'bells');
      const a = f.rng() * TAU, need = f.alive().length >= 4 ? 2 : 1;
      let missed = false;
      for (const s of [1, -1]) {
        const x = Math.cos(a) * 300 * s, y = Math.sin(a) * 210 * s;
        f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: 85 }, delay: d, dmg: dmg.bell, failDmg: dmg.bellFail, need, tag: 'bell',
          onResolve: inside => {
            if (inside.length >= Math.min(need, f.alive().length) || missed) return;
            missed = true;
            const ids = f.alive().filter(p => !f.doomed.has(p.id)).map(p => p.id);
            if (ids.length) doomOn(ids, 14);
          } });
      }
    };

    // --- phase 1: the court -------------------------------------------------------------------------
    const p1 = () => {
      f.seq([
        [3, knell],
        [6, () => swing('sweep')],
        [7, () => gaze()],
        [7, graveCleave],
        [8, () => royalDoom()],
        [17, () => swing()],
        [6, () => marks()],
        [8, () => swing()],
        [7, () => gaze()],
        [7, graveCleave],
        [8, knell],
        [6, p1],
      ]);
    };
    p1();

    // --- phase 2: echoes -------------------------------------------------------------------------------
    f.onHp(0.65, () => {
      f.setPhase(2);
      f.mechs.clear(); f.emit({ t: 'tgclear' });
      B.cast = null; B.lockFacing = false;
      f.cast('Rise, My Guard', 4, 'rise');
      f.afterKeep(3, placeKnights);
      f.seq([[6, () => p2(0)]]);
    });
    const echoCycle = (gazeWith) => {
      const first = echo(1.5);
      // Hard: the Gaze lands together with the first replay
      if (gazeWith && first != null) gaze(first);
    };
    const p2 = loop => {
      f.seq([
        [2, () => swing()],
        [6, () => swing()],
        [5.5, () => echoCycle(H)],
        [9, graveCleave],
        [7, bells],
        [11, () => royalDoom()],
        [14, knell],
        [6, () => { if (loop % 2) placeKnights(); }],
        [2, () => swing()],
        [6, () => swing()],
        [5.5, () => echoCycle(H)],
        [9, () => (H ? marks() : gaze())],
        [8, graveCleave],
        [7, () => (H ? gaze() : marks())],
        [8, () => p2(loop + 1)],
      ]);
    };

    // --- phase 3: the Long Night -----------------------------------------------------------------------
    f.onHp(0.3, () => {
      f.setPhase(3);
      f.mechs.clear(); f.emit({ t: 'tgclear' });
      B.cast = null; B.lockFacing = false;
      f.echoPlan = [];
      f.cast('The Long Night', 5, 'night');
      f.afterKeep(5, () => {
        f.night = true;
        f.lanterns = [{ id: f.nextMechId++, x: 0, y: 200, carrier: null, last: true, fade: Infinity }];
        f.emit({ t: 'night', on: 1 });
        sendLanterns();
      });
      f.seq([[7, () => p3(0)]]);
    });
    const p3 = loop => {
      f.seq([
        [2, knell],
        [6, () => swing()],
        [5.5, () => { const first = echo(1, true); if (H && first != null) gaze(first); }],
        [7, () => (H ? graveCleave() : gaze(f.ct(3.5)))],
        [7, () => royalDoom(H ? 12 : 14)],
        [10, bells],
        [11, () => swing()],
        [5, () => marks(f.ct(4))],
        [6, () => gaze(f.ct(3.5))],
        [6, graveCleave],
        [7, () => (loop % 2 ? placeKnights() : null)],
        [1, () => p3(loop + 1)],
      ]);
    };
  },
};

if (typeof module !== 'undefined') module.exports = { HOLLOWKING };
