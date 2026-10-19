// Boss IV: The Hollow King, Lord of the Barrow — "The Barrow". Three phases, everything he has.
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
//     Every second cycle a Gaze lands together with the first replay. Barrow Bells: two bells, two people under each;
//     a missed bell dooms everyone.
//   Phase 3 at 30%, The Long Night: the lanterns go out. The hall goes dark but for a little light around each hero
//     and the last lantern, which someone carries; now it's the only cure for Doom. Everything comes back shorter.
//     The moon finishes setting: hard enrage.
// Hard: Doom on two players at once; every echo cycle brings a Gaze with it; replays warn for less time. Three moves only
// Hard has:
//   Royal Audience: his crown blazes. Anyone with their back to the king when it lands is caught, as by the Gaze
//     (and it Dreads you the same way). Face him.
//   Funeral March: ranks of his dead march across the hall from one wall to the other, one after another, leaving one
//     lane open the whole way. Stand in the lane, or step in behind a rank once it has passed.
//   Gravebind: a grave-chain binds two players; they must stay close until it breaks, while everyone else spreads.

const HOLLOWKING = {
  id: 'hollowking', name: 'The Hollow King', title: 'Lord of the Barrow',
  hp: { normal: 2300000, hard: 3000000 },
  autoDmg: { normal: 1650, hard: 1650 },
  enrage: { normal: 460, hard: 460 },
  enrageName: 'Moonset',
  vuln: 0.5,
  spawn: { x: 0, y: -80 },
  arena: { theme: 'barrow' },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      knell: 9000, cleave: 25000, bleed: H ? 900 : 750, gaze: 9000, gazeAgain: 16000, swing: 13000, echo: 13000,
      marks: 8000, bell: 4500, bellFail: 2000, march: 14000, bind: 16000,
    };
    const GAZE_ARC = 1.2;     // you're looking at him if he's within this angle of where you face (~70° either side)
    const LANT_PICK = 40;     // walk this close to a lantern on the floor to pick it up
    const LANT_CURE = 85;     // a lantern's light cures Doom this far out
    const ECHO_WARN = H ? 1.8 : 2.6;

    // shared with the bots and the host's view (raid-host.js)
    f.lanterns = []; f.doomed = new Map(); f.knights = []; f.echoPlan = []; f.night = false;
    const memory = [null, null];   // the swing each knight remembers
    let memNext = 0;

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
    const royalDoom = (dur = H ? 13 : 14) => {
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
    const facing = p => {
      let d = Math.atan2(B.y - p.y, B.x - p.x) - (p.a || 0);
      while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      return Math.abs(d) < GAZE_ARC;
    };
    // caught by the Gaze or the Audience: hurt, held for a moment, and Dreading (caught again while Dreading hurts more)
    const caught = (p, kind) => {
      f.damagePlayer(p, f.hasDebuff(p.id, 'dread') ? dmg.gazeAgain : dmg.gaze, { kind, avoidable: true });
      f.debuff(p.id, 'rooted', 2); f.debuff(p.id, 'dread', 20);
      f.emit({ t: 'gazed', id: p.id });
    };
    const gaze = (d = f.ct(4)) => {
      f.cast('Royal Gaze', d, 'gaze');
      f.mech({ type: 'gaze', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: d, dmg: 0, tag: 'gaze', avoidable: false,
        onResolve: () => { for (const p of f.alive()) if (facing(p)) caught(p, 'gaze'); } });
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

    const marks = (d = f.ct(5), who) => {
      if (!who) f.cast('Grave Marks', d, 'marks');
      for (const p of who || f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 120 }, delay: d, dmg: dmg.marks, follow: p.id, tag: 'marks' });
    };

    // --- his swings, and the knights who remember them --------------------------------------------
    const swingShape = (kind, x, y, face, echo) => (
      kind === 'sweep' ? { kind: 'cone', x, y, r: 1100, arc: echo ? 1.25 : 2.0, angle: face }
        : kind === 'stomp' ? { kind: 'circle', x, y, r: echo ? 290 : 320 }
          : { kind: 'donut', x, y, r: 1100, r2: echo ? 250 : 210 });
    const SWING_NAME = { sweep: 'Sceptre Sweep', stomp: 'Barrow Stomp', ring: 'Crown of Graves' };
    // the swings are chosen as each loop is laid out (never the same one twice running), so the feed can name them
    let lastPlanned = null;
    const nextSwing = () => { const opts = ['sweep', 'stomp', 'ring'].filter(k => k !== lastPlanned); lastPlanned = opts[Math.floor(f.rng() * opts.length)]; return lastPlanned; };
    const swing = kind => {
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
    const swingStep = (dt, kind = nextSwing()) => [dt, () => swing(kind), SWING_NAME[kind]];
    // a knight replays what it remembers, from where it stands, aimed at the middle of the hall
    const knightSwing = (k, kind) => {
      const shape = swingShape(kind, k.x, k.y, k.f, true);
      f.echoPlan = f.echoPlan.filter(e => e.knight !== k.id || e.kind !== kind);
      f.emit({ t: 'kswing', id: k.id, kind, dur: ECHO_WARN });
      f.mech({ type: 'aoe', shape, delay: ECHO_WARN, dmg: dmg.echo, tag: 'e' + kind });
    };
    // replay what the knights remember: each in turn (or only the last one, in the Long Night). Returns when the
    // first replay lands, so a Gaze can land with it.
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

    // --- Hard only ------------------------------------------------------------------------------
    // Royal Audience: his crown blazes; anyone with their back to him when it lands is caught, as by the Gaze
    const audience = (d = f.ct(4)) => {
      f.cast('Royal Audience', d, 'audience');
      f.mech({ type: 'audience', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: d, dmg: 0, tag: 'audience', avoidable: false,
        onResolve: () => { for (const p of f.alive()) if (!facing(p)) caught(p, 'audience'); } });
    };
    // Funeral March: five ranks of the dead march across the hall, wall to wall, a second apart. One lane stays open all
    // the way; or wait for a rank to pass and step in behind it.
    const march = () => {
      const d = f.ct(5), ranks = 5, depth = ARENA.hw * 2 / ranks, gap = 110;
      const dir = f.rng() < 0.5 ? 1 : -1, gy = (f.rng() - 0.5) * 2 * (ARENA.hh - 190);
      f.cast('Funeral March', d, 'march');
      // the open lane, for the bots
      const safe = [-420, -210, 0, 210, 420].map(x => ({ x, y: gy }));
      const rank = i => {
        const x0 = -dir * ARENA.hw + dir * depth * i, top = -ARENA.hh, bottom = ARENA.hh;
        return [[top, gy - gap], [gy + gap, bottom]].filter(([a, b]) => b - a > 10)
          .map(([a, b]) => ({ kind: 'rect', x: x0, y: (a + b) / 2, angle: dir > 0 ? 0 : Math.PI, len: depth, w: b - a }));
      };
      for (let i = 0; i < ranks; i++) {
        const lands = d + i * 1.0, warn = i ? 2.4 : d;
        f.afterKeep(lands - warn, () => { for (const s of rank(i)) f.aoe(s, warn, dmg.march, { tag: 'march', safe }); });
      }
    };
    // Gravebind: a grave-chain holds two players together (they must stay close when it breaks) while the rest spread
    const gravebind = () => {
      const d = f.ct(9), al = f.alive();
      f.cast('Gravebind', f.ct(3), 'bind');
      const tank = f.tank(), pool = f.shuffle(al.filter(p => !tank || p.id !== tank.id || al.length < 3));
      if (pool.length < 2) return marks();
      const [a, b] = pool;
      f.tether(a.id, b.id, d, { kind: 'short', len: 160, dmg: dmg.bind, tag: 'bind' });
      const rest = al.filter(p => p.id !== a.id && p.id !== b.id);
      if (rest.length) f.afterKeep(d - f.ct(5), () => marks(f.ct(5), rest.filter(p => alive(p.id))));
    };

    // --- phase 1: the court -------------------------------------------------------------------------
    f.loop(n => [
      [3, knell, 'Barrow Knell'],
      swingStep(6, 'sweep'),
      [6, () => gaze(), 'Royal Gaze'],
      H && [6, () => audience(), 'Royal Audience'],
      [7, graveCleave, 'Grave Cleave'],
      [7, () => royalDoom(), 'Royal Doom'],
      swingStep(12),
      [6, () => marks(), 'Grave Marks'],
      H && [8, march, 'Funeral March'],
      swingStep(H ? 10 : 7),
      [7, () => gaze(), 'Royal Gaze'],
      [7, graveCleave, 'Grave Cleave'],
      [7, knell, 'Barrow Knell'],
      [6],
    ].filter(Boolean));

    // --- phase 2: echoes -------------------------------------------------------------------------------
    f.onHp(0.65, () => {
      f.setPhase(2);
      f.mechs.clear(); f.emit({ t: 'tgclear' });
      B.cast = null; B.lockFacing = false;
      f.cast('Rise, My Guard', 4, 'rise');
      f.afterKeep(3, placeKnights);
      f.seq([[6, () => p2()]]);
    });
    // the knights replay; with a Gaze landing together with the first replay when gazeWith
    const echoCycle = (gazeWith) => {
      const first = echo(1.5);
      if (gazeWith && first != null) gaze(first);
    };
    const p2 = () => f.loop(n => [
      swingStep(2),
      swingStep(6),
      [5.5, () => echoCycle(H), H ? 'Royal Gaze' : 'Echo Knights'],
      [9, graveCleave, 'Grave Cleave'],
      [7, bells, 'Barrow Bells'],
      [11, () => royalDoom(), 'Royal Doom'],
      H && [9, march, 'Funeral March'],
      [H ? 12 : 13, knell, 'Barrow Knell'],
      [6, () => { if (n % 2) placeKnights(); }],
      swingStep(2),
      swingStep(6),
      [5.5, () => echoCycle(true), 'Royal Gaze'],
      [9, H ? gravebind : () => marks(), H ? 'Gravebind' : 'Grave Marks'],
      [H ? 11 : 8, graveCleave, 'Grave Cleave'],
      H && [7, () => audience(), 'Royal Audience'],
      [8],
    ].filter(Boolean));

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
      f.seq([[7, () => p3()]]);
    });
    const p3 = () => f.loop(n => [
      [2, knell, 'Barrow Knell'],
      swingStep(6),
      [5.5, () => { const first = echo(1, true); if (H && first != null) gaze(first); }, H ? 'Royal Gaze' : 'Echo Knights'],
      [7, () => (H ? graveCleave() : gaze(f.ct(3.5))), H ? 'Grave Cleave' : 'Royal Gaze'],
      [7, () => royalDoom(H ? 12 : 13), 'Royal Doom'],
      [10, bells, 'Barrow Bells'],
      H && [9, march, 'Funeral March'],
      swingStep(H ? 9 : 10),
      [5, () => marks(f.ct(4)), 'Grave Marks'],
      [6, () => gaze(f.ct(3.5)), 'Royal Gaze'],
      H && [6, () => audience(f.ct(3.5)), 'Royal Audience'],
      [6, graveCleave, 'Grave Cleave'],
      [7, () => { if (n % 2) placeKnights(); }],
      [1],
    ].filter(Boolean));
  },
};

if (typeof module !== 'undefined') module.exports = { HOLLOWKING };
