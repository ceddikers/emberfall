// Boss IV: The Hollow King, Lord of the Barrow — "The Barrow". The court of the dead.
// One authored hearing, the same on every pull: call and response. He calls (a swing, a Gaze, a decree) and the court
// answers a fixed beat later (the knights replay it, the coffins stir, the bells toll). The question he keeps asking:
// what did I just see? He walks after his tank like the first bosses did.
//   I. The Summons (100% → 80%): his calls, one at a time. Barrow Knell, Sceptre Sweep (a wide cone in front), Royal
//     Gaze (turn your back), Grave Cleave (tankbuster + bleed), Barrow Stomp (around him), Royal Doom (carry a lantern
//     to the doomed), Crown of Graves (everywhere but close to him).
//   II. Testimony (80% → 62%): two Echo Knights rise by the walls. Each remembers one of his swings as he makes it (it
//     flashes on the knight) and replays it from where it stands. The Charge Sheet: three banners above the throne light
//     in turn, each with the sigil of one of his swings, then go dark. Coffin Lids → Royal Decree (hide behind a lid),
//     Stomp → its echo with a Gaze, Barrow Bells (two to a bell), Lights Out (stand in a brazier's light).
//   III. Court of Bones (at 62%, 38 s): he sits on the throne, out of reach, and six coffins wake one by one down the
//     walls. Break each before it opens; an opened one sends out a skeleton. His Grave Warden climbs down from the dais
//     as well (a big, slow, hard-biting skeleton): the tank takes it and holds it out of the party's way, the melee and
//     the rest cut it down between coffins. Meanwhile he hurls his sceptre at whoever
//     stands farthest (twice), the dead gather on a random hero (the party stacks in), and the Knell and Marks fall in
//     between: never more than 6 s from one cast to the next. Then the knights move, and he rises.
//   IV. The Verdict (62% → 25%): calls and their answers overlap: two swings at once and two echoes, Doom with Grave
//     Marks, the lids and the Decree again. Then Judgement: the Charge Sheet's three swings land in that order, from him
//     and both knights at once, each shown on the floor for 1.6 s (Hard: 1.8 s; an Echo replay shows for 2.0 s).
//   V. The Long Night (25% → dead): the braziers die; one lantern is left. Doom passes from player to player in a fixed
//     order (the next one's sigil glows 6 s ahead) and the lantern passes on touch: whoever it cures carries it to the
//     next. Swings, echoes, Gazes and Knells between, until he falls or the moon sets.
//   Royal Tithe (in the Verdict): a heal check you prepare for. Everyone drops to a third of their health (shields
//     stay), and the Dirge tolls everyone 8 s later; he holds his blows on the tank meanwhile.
// A slow party runs each part's last set again, +10% each pass (f.course in fight.js). Every telegraph shows on the
// floor on every difficulty.
// Hard: casts 15% faster, 25% more damage; the Charge Sheet has four sigils (one is Royal
// Audience: face him); Grave Cleave on the tank as Gravebind lands on the healer and a DPS; Doom on two in the Verdict;
// two lanterns and two dooms at once in the Long Night; Falling Masonry with three of the Knells (not in the Verdict);
// and his moves:
//   Royal Audience: his crown blazes. Anyone with their back to the king when it lands is caught, as by the Gaze.
//   Funeral March: ranks of his dead march across the hall, wall to wall, leaving one lane open the whole way.
//   Gravebind: a grave-chain binds two players (never the tank); they must stay close until it breaks.
//   Burial Rites and the Writ of Execution: a grave each, and the Writ's burning lines (see burialRites, writ), then in close
//     for a Crown of Graves and out to your grave.
// Hard draws its dances fresh each pull (f.rng): the Charge Sheet's order, the Funeral March's open lane, who is Pardoned,
// who is bound in Gravebind, and which grave is whose. The Echo replays and the Judgement's swings always land on the beat
// (the order may be new; the timing never is).
// Work for the tank and the healer (2026-10-26): every act is laid out in units (see `lay` in the hearing). Some hand the tank a job (a
// Sweep to point, a Grave Cleave to take; the Crown of Graves, the Doom, the Lids and the Charge Sheet each have one riding with them) and
// most of those carry a Knell or a Decree for the healer; the rest are the plain calls. Normal runs them in the authored order. Hard draws
// the order of an act's units anew each pull, but weaves the two kinds one for one, so no order leaves either role idle for long. Not
// drawn: the Verdict (Burial Rites runs to a fixed clock, and Hard's Cleaves must stay a cooldown apart), the Tithe and what follows it, the Court's casts
// (the Knell, the stack and the Marks need the healer's time) and the Long Night (the order of the relay is the lesson). Drawn instead: which coffin
// of each side wakes when. Hard's Cleave is more than the tank's health, so it can
// only come as often as his cooldowns allow (about one a minute and a half), so Hard's tank has fewer jobs than Normal's. Every swing he makes once
// the knights have risen is answered by an Echo, in the closing passes too (Burial Rites' Crown is the one he keeps to himself).
// The room (arena props): six grave-light braziers down the hall, coffins in the bays along the walls.

const HOLLOWKING = {
  id: 'hollowking', name: 'The Hollow King', title: 'Lord of the Barrow',
  hp: { normal: 3560000, hard: 4345000 },
  autoDmg: { normal: 1650, hard: 1800 },
  enrage: { normal: 622, hard: 632 },   // the cast starts here and lands 8 s later (10:30 / 10:40)
  enrageName: 'Moonset',
  vuln: 0.5,
  spawn: { x: 0, y: -80 },
  arena: { theme: 'barrow' },
  gates: [0.8, 0.62, 0.46, 0.25],   // where the sessions change (ticks on the boss bar; fight.js course)
  // six grave-light braziers down the hall, three a side
  room(f) {
    for (const x of [-400, 400]) for (const y of [-190, 0, 190]) f.addProp({ kind: 'brazier', x, y, r: 24, solid: true, cover: false, state: 1 });
  },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      knell: H ? 10000 : 9000, cleave: H ? 35000 : 25000, bleed: H ? 1150 : 750, gaze: H ? 11250 : 9000, gazeAgain: H ? 20000 : 16000, swing: H ? 18750 : 14000, echo: H ? 18750 : 14000,
      dirge: H ? 6250 : 3000,
      marks: H ? 12800 : 8000, bell: H ? 5650 : 4500, bellFail: H ? 2500 : 2000, march: H ? 17500 : 14000, bind: H ? 20000 : 16000,
      throw: H ? 17500 : 14000, summons: H ? 21250 : 11000, lid: H ? 15000 : 12000, decree: H ? 21250 : 15000, masonry: H ? 15000 : 12000, writ: H ? 11250 : 9000, scorch: H ? 5000 : 4000, unburied: H ? 18750 : 15000, grave: H ? 12500 : 10000, restless: H ? 3150 : 2500, coffinHp: 7000, skelHp: 9000, skelBite: H ? 1650 : 1300, wardenHp: H ? 58000 : 48000, wardenBite: H ? 5200 : 3800,
    };
    const HARD_HIT = 1.18;   // (Hard's every blow, one factor: the bots dodge well since the prop-steering fix, so Hard is retuned here, not by changing a dance)
    if (H) for (const k in dmg) if (!/Hp$/.test(k)) dmg[k] = Math.round(dmg[k] * HARD_HIT);
    const S = (...steps) => steps.filter(Boolean);
    const GAZE_ARC = 1.2;     // you're looking at him if he's within this angle of where you face (~70° either side)
    const LANT_PICK = 40;     // walk this close to a lantern on the floor to pick it up
    const LANT_CURE = 85;     // a lantern's light cures Doom this far out
    const ECHO_WARN = H ? 2.0 : 2.6;
    const JUDGE_WARN = H ? 1.8 : 1.6;   // (each swing of the Judgement is on the floor this long before it lands; they land 1.5 s apart)
    // the Charge Sheet: the swings Judgement brings back, in order
    // (Hard: the order is drawn fresh each pull, so a group cannot learn it; the banners and the floor still show it truthfully)
    const CHARGES = H ? f.shuffle(['stomp', 'audience', 'sweep', 'ring']) : ['stomp', 'sweep', 'ring'];
    // where the Echo Knights stand: by the side walls, facing the middle (they move after the Court of Bones)
    const KNIGHTS = [[[-505, -170], [505, 170]], [[-505, 170], [505, -170]]];

    // shared with the bots and the host's view (raid-host.js)
    f.lanterns = []; f.doomed = new Map(); f.knights = []; f.echoPlan = []; f.night = false; f.doomNext = null;
    // no Time Stop (fight.js pauseBoss) on Royal Doom: while it's cast, while anyone carries it, and all the Long Night
    f.noPause = () => f.night || f.doomed.size > 0 || !!(f.doomNext && f.doomNext.length) || !!(B.cast && B.cast.name === 'Royal Doom' && f.t < B.cast.end);
    const memory = [null, null];   // the swing each knight remembers
    let memNext = 0;

    const sendLanterns = () => f.emit({ t: 'lant', l: f.lanterns.map(l => [l.id, Math.round(l.x), Math.round(l.y), l.carrier ?? null, l.last ? 1 : 0]) });
    const sendKnights = () => f.emit({ t: 'knights', k: f.knights.map(k => [k.id, k.x, k.y, +k.f.toFixed(2)]) });
    const alive = id => f.alive().find(p => p.id === id);

    // --- lanterns and Doom ------------------------------------------------------------------
    // a lantern on the floor goes to whoever walks over it (not the doomed, one each); the light cures Doom, and a
    // cure uses the lantern up, except the last lanterns of the Long Night, which pass to whoever they cure
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
          else if (!f.lanterns.some(o => o !== l && o.carrier === id)) l.carrier = id;   // the relay: it's theirs now
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
    const royalDoom = (n = 1, dur = H ? 13 : 14) => {
      const d = f.ct(3);
      f.cast('Royal Doom', d, 'doom');
      f.afterKeep(d, () => {
        const tank = f.tank();
        const pool = f.shuffle(f.alive().filter(p => (!tank || p.id !== tank.id) && !f.doomed.has(p.id)));
        const ids = pool.slice(0, n).map(p => p.id);
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
    const gaze = (d = f.ct(4), quiet) => {
      if (!quiet) f.cast('Royal Gaze', d, 'gaze');
      f.mech({ type: 'gaze', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: d, dmg: 0, tag: 'gaze', avoidable: false,
        onResolve: () => { for (const p of f.alive()) if (facing(p)) caught(p, 'gaze'); } });
    };

    // (Hard: three of the Knells bring down part of the vault: the Summons' last, Testimony's and Judgement's first. Not in the Verdict, where there is enough on the floor)
    const knell = rocks => {
      f.cast('Barrow Knell', f.ct(4), 'knell');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(4), dmg: dmg.knell, hidden: true, tag: 'knell' });
      if (rocks === true) masonry();
    };
    const knellRocks = () => knell(true);

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
      for (const p of who || f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 120 }, delay: d, dmg: dmg.marks, follow: p.id, tag: 'marks', ddown: true });
    };

    // --- his swings, and the knights who remember them --------------------------------------------
    const swingShape = (kind, x, y, face, echo) => (
      kind === 'sweep' ? { kind: 'cone', x, y, r: 1100, arc: echo ? 1.25 : 2.0, angle: face }
        : kind === 'stomp' ? { kind: 'circle', x, y, r: echo ? 290 : 320 }
          : { kind: 'donut', x, y, r: 1100, r2: echo ? 250 : 210 });
    const SWING_NAME = { sweep: 'Sceptre Sweep', stomp: 'Barrow Stomp', ring: 'Crown of Graves' };
    // The Stomp's Aftershock: the hall answers the stomp a beat later with the Crown's ring (everywhere but close round him).
    // Be out of the stomp when it lands, then in again before the ring: a step out and a dash back through the line.
    // Both are on the floor well before the first lands (the ring is laid down at half the cast).
    const AFTER_GAP = H ? 1.0 : 1.25;
    const aftershock = (x, y, d) => {
      f.afterKeep(d * 0.45, () => f.mech({ type: 'aoe', shape: { kind: 'donut', x, y, r: 1100, r2: 190 }, delay: d * 0.55 + AFTER_GAP, dmg: dmg.swing, tag: 'ring' }));
    };
    // The Sweep's Backhand: the sceptre comes back the other way. When the first cone lands, the one behind him is laid down
    // (BACK_WARN s on the floor): whoever slipped round behind him to dodge the front slips out to his flank. Cones: the first
    // covers the front, the second the back (a little narrower); the two flanks stay clear.
    const BACK_WARN = H ? 1.25 : 1.5;
    const backhand = s0 => {
      B.lockFacing = true;
      const s = { kind: 'cone', x: s0.x, y: s0.y, r: 1100, arc: 1.75, angle: s0.angle + Math.PI };
      f.echoPlan.push({ knight: -1, kind: 'sweep', at: f.t + BACK_WARN, shape: s });
      f.mech({ type: 'aoe', shape: s, delay: BACK_WARN, dmg: dmg.swing, tag: 'sweep',
        onResolve: () => { B.lockFacing = false; f.echoPlan = f.echoPlan.filter(e => e.knight !== -1 || e.shape !== s); } });
    };
    // a swing; a risen knight remembers it as it lands. (quiet: a second swing in the same breath, no cast bar of its own)
    // (noMemory: the knights don't take this one in: Burial Rites' Crown of Graves)
    // (combo: the Sweep's Backhand, or the Stomp's Aftershock; see below)
    const swing = (kind, quiet, noMemory, combo) => {
      const d = f.ct(4.5);
      if (!quiet) f.cast(SWING_NAME[kind], d, kind);
      if (kind === 'sweep') B.lockFacing = true;
      if (combo && kind === 'stomp') aftershock(B.x, B.y, d);
      const shape0 = swingShape(kind, B.x, B.y, B.facing, false);
      f.mech({ type: 'aoe', shape: shape0, delay: d, dmg: dmg.swing, tag: kind,
        onResolve: () => {
          if (combo && kind === 'sweep') backhand(shape0);
          else if (kind === 'sweep') B.lockFacing = false;
          if (f.knights.length && !noMemory) {
            // (Hard: whichever knight is free takes it in, chosen at random: the flash on the knight is the only tell)
            let i = memNext % f.knights.length;
            if (H && f.knights.length > 1 && !memory[1 - i]) i = Math.floor(f.rng() * f.knights.length);
            if (H && memory[i] && f.knights.length > 1) i = 1 - i;
            const k = f.knights[i];
            memory[i] = kind;
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
    // replay what the knights remember: each in turn (or only the last one). Returns when the first replay lands, so a
    // Gaze can land with it.
    const echo = (lead = 1.5, onlyLast) => {
      let order = onlyLast ? [(memNext - 1 + f.knights.length) % f.knights.length] : f.knights.map((_, i) => i);
      // (Hard: which knight answers first is not fixed, but the first replay always lands on the beat: the Gaze that rides with it can be counted)
      if (H && !onlyLast) order = f.shuffle(order);
      let t = lead, first = null;
      for (const i of order) {
        const k = f.knights[i], kind = memory[i];
        if (!k || !kind) continue;
        // the bots "remember" too: where each replay will land, before it shows
        f.echoPlan.push({ knight: k.id, kind, at: f.t + t + ECHO_WARN, shape: swingShape(kind, k.x, k.y, k.f, true) });
        f.afterKeep(t, () => { if (f.knights.includes(k)) knightSwing(k, kind); });
        if (first == null) first = t + ECHO_WARN;
        t += 3.4;
      }
      for (const i of order) memory[i] = null;
      return first;
    };
    const echoGaze = (lead = 1.5, onlyLast) => { const first = echo(lead, onlyLast); gaze(first ?? f.ct(4)); };
    const placeKnights = layout => {
      f.knights = KNIGHTS[layout].map(([x, y]) => ({ id: f.nextMechId++, x, y, f: Math.atan2(-y, -x) }));
      memory[0] = memory[1] = null; memNext = 0;
      f.echoPlan = [];
      sendKnights();
    };
    const knightsRise = () => { f.cast('Echo Knights', 3, 'rise'); f.afterKeep(2, () => placeKnights(0)); };

    // --- Barrow Bells: two people under each bell, or everyone is doomed --------------------------
    const bells = a => {
      const d = f.ct(8);
      f.cast('Barrow Bells', f.ct(3), 'bells');
      const need = f.alive().length >= 4 ? 2 : 1;
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
    const audience = (d = f.ct(4), quiet) => {
      if (!quiet) f.cast('Royal Audience', d, 'audience');
      f.mech({ type: 'audience', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: d, dmg: 0, tag: 'audience', avoidable: false,
        onResolve: () => { for (const p of f.alive()) if (!facing(p)) caught(p, 'audience'); } });
    };
    // Funeral March: five ranks of the dead march across the hall, wall to wall, a second apart. One lane stays open all
    // the way; or wait for a rank to pass and step in behind it.
    // (Hard: the open lane is drawn at random each time, anywhere across the hall, and never in the same place twice running)
    let lastLane = 0;
    const laneY = () => {
      let y = lastLane;
      for (let i = 0; i < 12 && Math.abs(y - lastLane) < 160; i++) y = Math.round((f.rng() * 2 - 1) * 300);
      return (lastLane = y);
    };
    const march = (dir, gy) => {
      const d = f.ct(5), ranks = 5, depth = ARENA.hw * 2 / ranks, gap = 110;
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
    // Gravebind: a grave-chain holds the healer and a DPS together (they must stay close when it breaks) while the rest
    // spread. It comes as Grave Cleave lands on the tank: three roles, three jobs.
    const gravebind = () => {
      const d = f.ct(9), al = f.alive(), tank = f.tank();
      f.afterKeep(0.3, () => f.cast('Gravebind', f.ct(3), 'bind'));
      // (drawn at random from the party, each pull: any two but the tank)
      const pair = f.shuffle(al.filter(p => !tank || p.id !== tank.id)).slice(0, 2);
      if (pair.length < 2) return;
      const [a, b] = pair;
      f.tether(a.id, b.id, d, { kind: 'short', len: 160, dmg: dmg.bind, tag: 'bind', ddown: true });
    };

    // Burial Rites (Hard, the Verdict): he allots each hero a grave of their own, a circle in their own colour (the
    // colour of their place in the party), open in a corner of the hall for 20 s. When it closes, each must be lying in
    // their own: a hero out of theirs is Unburied (a heavy blow, and the hall's dead strike everyone); a hero in someone
    // else's is struck instead. Between the opening and the closing come the Writ and a Crown of Graves (in close to
    // him), so the graves are a walk away with a few seconds left.
    // Which grave is whose is drawn at random each pull (these four spots: north toward the throne, south, west, east). The Writ's lines go out the same ways, so each hero
    // walks one line all through: out to their side for the Writ, in to him for the Crown, out to their grave.
    const GRAVES = f.shuffle([[0, -290], [0, 300], [-410, 20], [410, 20]]);   // (drawn per pull: which hero gets which grave is not fixed)
    const burialRites = () => {
      const d = f.ct(3), open = 19.5;
      // he takes his place in the middle of the hall to read the rites (the graves round him, the writ's spokes out
      // from him), and stays there until they're read
      f.moveBoss(0, -20, 520);
      f.cast('Burial Rites', d, 'doom');
      f.alive().forEach(p => {
        const slot = f.slotOf(p.id), [x, y] = GRAVES[slot % GRAVES.length];
        f.mech({ type: 'own', shape: { kind: 'circle', x, y, r: 95 }, delay: open, dmg: dmg.unburied, otherDmg: dmg.grave, target: p.id, tag: 'grave',
          slot: slot + 1, color: FIGHT.SLOTS[slot % FIGHT.SLOTS.length],
          onResolve: (inside, hits) => {
            if (!alive(p.id) || inside.some(q => q.id === p.id)) return;
            // Unburied: the dead of the hall rise for them, and strike everyone
            f.afterKeep(0.4, () => { for (const q of f.alive()) f.damagePlayer(q, dmg.restless, { kind: 'restless', n: 'Burial Rites' }); });
            void hits;
          } });
      });
    };
    // Writ of Execution (Hard): a grave-chain runs from him to every hero, and when the writ is read a line of
    // grave-light runs out from him through each of them. Each takes their own; anyone else it crosses takes more, so
    // the lines go out to the sides, away from each other. One hero's writ is torn up (Pardoned, the broken chain): theirs
    // does nothing, so they're the one free to stand anywhere off the others' lines. The thinking part: a fired line
    // stays burning as a spoke out from him until the graves close, so the lines must point between the graves (the
    // hall's corners), never at one; then the way out to every grave stays open. The Pardoned is drawn at random
    // each pull.
    // Each line follows its hero while it's aimed, then sets WRIT_LOCK s before it's read: from then it's the red lane on
    // the floor, fixed, and stepping out of it is stepping out of the blow (the burn only comes after, where it ran).
    const WRIT_BURN = 12, WRIT_LOCK = 2;
    const writ = () => {
      const d = f.ct(5.5), al = f.alive();
      if (!al.length) return;
      f.cast('Writ of Execution', d, 'judgement');
      const bySlot = [...al].sort((a, b) => f.slotOf(a.id) - f.slotOf(b.id));
      const pardoned = f.pick(bySlot).id;
      for (const p of al) {
        const free = p.id === pardoned;
        const m = f.mech({ type: free ? 'safe' : 'bait', shape: { kind: 'rect', x: B.x, y: B.y, angle: 0, len: 1400, w: 110 }, delay: d, dmg: free ? 0 : dmg.writ,
          target: p.id, aimFromBoss: p.id, lockAt: WRIT_LOCK, tag: free ? 'pardon' : 'writ',
          // a read writ leaves its line burning on the floor (from a stride off him out to the wall) until the graves
          // close: spokes round him. Aimed at a grave, it bars the way to it; aimed between the graves, it doesn't.
          onResolve: free ? null : () => {
            const s = m.shape, c = Math.cos(s.angle), sn = Math.sin(s.angle);
            f.zone({ shape: { kind: 'rect', x: s.x + c * 95, y: s.y + sn * 95, angle: s.angle, len: 1400, w: 100 }, delay: 0.8, dur: WRIT_BURN - 0.8, effect: 'burn', dmg: dmg.scorch, tag: 'writburn', ddown: true });
          } });
      }
      f.debuff(pardoned, 'pardoned', d);
    };

    // --- the hall: braziers, coffin lids, the Decree, the vault coming down ----------------------------
    const braziers = () => f.props.filter(p => p.kind === 'brazier');
    const LIGHT_R = 140;
    // Lights Out: every brazier goes out; a moment later the two nearest him flare back up. When it lands his Dread
    // Gaze finds anyone outside a light.
    const lightsOut = (d = f.ct(5)) => {
      f.cast('Lights Out', d, 'lightsout');
      for (const b of braziers()) f.setPropState(b, 0);
      const near = braziers().sort((a, b) => Math.hypot(a.x - B.x, a.y - B.y) - Math.hypot(b.x - B.x, b.y - B.y)).slice(0, 2);
      f.emit({ t: 'roomev', k: 'lightsout', dur: d, r: LIGHT_R, extra: [] });
      f.afterKeep(Math.min(1.2, d * 0.3), () => { for (const b of near) f.setPropState(b, 1); f.emit({ t: 'propfx', k: 'flare', kind: 'brazier', x: 0, y: 0, ids: near.map(b => b.id) }); });
      const lit = () => braziers().filter(b => b.state === 1).map(b => ({ x: b.x, y: b.y }));
      f.mech({ type: 'dark', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: d, dmg: 0, tag: 'dark', avoidable: false, lightR: LIGHT_R, lights: lit,
        onResolve: () => {
          const L = lit();
          for (const p of f.alive()) if (!L.some(l => Math.hypot(l.x - p.x, l.y - p.y) <= LIGHT_R + 10)) caught(p, 'dark');
          f.afterKeep(2.5, () => { for (const b of braziers()) f.setPropState(b, f.night ? 0 : 1); });
        } });
    };
    // coffins down the side walls: where the lids come from, and Court of Bones' coffins
    const COFFIN_Y = [-285, -95, 95, 285];   // the sarcophagi in the bays between the pillars
    // Coffin Lids: he tears the lids off two coffins, one each side (left from bay l, right from bay r), and sends them
    // skidding into the hall (anyone in the way is hit). Each comes to rest where it stops, solid: the cover for the
    // Royal Decree that follows.
    const coffinLids = (l, r) => {
      const d = f.ct(4.5);
      f.cast('Coffin Lids', d, 'lids');
      for (const [sx, y] of [[-1, COFFIN_Y[l]], [1, COFFIN_Y[r]]]) {
        const x0 = sx * (ARENA.hw - 10), len = 470, a = sx < 0 ? 0 : Math.PI;
        f.aoe({ kind: 'rect', x: x0, y, angle: a, len, w: 100 }, d, dmg.lid, { tag: 'lid',
          onResolve: () => {
            // it skids until it hits something solid (fallen masonry, a brazier), or runs out
            const end = { x: x0 + Math.cos(a) * (len - 65), y };
            const hit = PROPS.ray(x0, y, end.x, end.y, f.props, 50);
            if (hit) { end.x = x0 + (end.x - x0) * hit.t; }
            f.addProp({ kind: 'lid', shape: 'rect', x: Math.round(end.x), y, w: 130, h: 46, a: 0, hp: 1, maxHp: 2, solid: true, cover: true });
          } });
      }
    };
    // Royal Decree: a wave of grave-light rolls down the hall from the throne. Only something solid between you and the
    // throne shelters you (a lid, fallen masonry); the lids are smashed by it.
    const decree = () => {
      const d = f.ct(5);
      f.cast('Royal Decree', d, 'decree');
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: 0, y: -2600, r: 4000 }, delay: d, dmg: dmg.decree, tag: 'decree', cover: true, src: { x: 0, y: -2600 }, chip: 'all' });
    };
    const crumbleLids = why => { for (const p of f.props.filter(q => q.kind === 'lid')) f.breakProp(p, why); };
    // Falling Masonry (Hard): with each Knell two chunks of the vault come down, and stay
    const masonry = () => {
      if (!H) return;
      const fallen = f.props.filter(p => p.kind === 'masonry').length;
      for (let i = 0; i < 2 && fallen + i < 8; i++) {
        let at = null;
        for (let tries = 0; tries < 20 && !at; tries++) {
          const c = { x: (f.rng() * 2 - 1) * (ARENA.hw - 150), y: (f.rng() * 2 - 1) * (ARENA.hh - 140) };
          if (f.props.some(p => Math.hypot(p.x - c.x, p.y - c.y) < 150) || Math.hypot(c.x - B.x, c.y - B.y) < 160) continue;
          at = c;
        }
        if (!at) continue;
        f.aoe({ kind: 'circle', x: at.x, y: at.y, r: 85 }, f.ct(4), dmg.masonry, { tag: 'masonry',
          onResolve: () => f.addProp({ kind: 'masonry', x: Math.round(at.x), y: Math.round(at.y), r: 42, solid: true, cover: true }) });
      }
    };

    // --- the Charge Sheet, and Judgement --------------------------------------------------------------
    // He reads out the charges: the banners above the throne light in turn, each with one of his swings' sigils, and go
    // dark again. Nothing lands; it's a thing to remember.
    const chargeSheet = () => {
      const step = 2, d = 1 + CHARGES.length * step;
      f.cast('The Charge Sheet', d, 'charges');
      f.emit({ t: 'roomev', k: 'charges', l: CHARGES, step, lead: 1, dur: d + 0.5 });
    };
    // Judgement: the charges land in that order, 1.5 s apart, from him and both knights at once (a Crown of Graves from
    // him only: there's no standing close to three people at once). Each is on the floor JUDGE_WARN s before it lands.
    const judgement = () => {
      const d = f.ct(5), gapS = 1.5, face = B.facing;
      f.cast('Judgement', d, 'judgement');
      B.lockFacing = true;
      f.emit({ t: 'roomev', k: 'judgement', l: CHARGES, at: d, step: gapS, warn: JUDGE_WARN, dur: d + CHARGES.length * gapS + 0.6 });
      CHARGES.forEach((kind, i) => {
        const land = d + i * gapS;
        if (kind === 'audience') { f.afterKeep(land - JUDGE_WARN, () => audience(JUDGE_WARN, true)); return; }
        const shapes = [[swingShape(kind, B.x, B.y, face, false), kind]];
        // (the knights' sweeps narrower than their echoes: with his own as well, two full ones would leave no floor)
        if (kind !== 'ring') for (const k of f.knights) shapes.push([Object.assign(swingShape(kind, k.x, k.y, k.f, true), kind === 'sweep' ? { arc: 0.8 } : {}), 'e' + kind]);
        for (const [shape] of shapes) f.echoPlan.push({ knight: -1, kind, at: f.t + land, shape });
        f.afterKeep(land - JUDGE_WARN, () => { for (const [shape, tag] of shapes) f.mech({ type: 'aoe', shape, delay: JUDGE_WARN, dmg: dmg.swing, tag }); });
      });
      f.afterKeep(d + CHARGES.length * gapS, () => { B.lockFacing = false; f.echoPlan = f.echoPlan.filter(e => e.knight !== -1); });
    };

    // --- Court of Bones: a recess --------------------------------------------------------------------
    // He goes back to his throne, out of reach, and wakes the coffins down the walls in a set order, 3 s apart. Each
    // glows as it nears opening; break it first and it sends nothing, or a skeleton climbs out.
    // (Hard: the sides still take turns, but which coffin of each side wakes when is drawn each pull)
    const LEFT = H ? f.shuffle([0, 2, 3]) : [0, 2, 3], RIGHT = H ? f.shuffle([3, 1, 0]) : [3, 1, 0];
    const COURT = [[-1, LEFT[0]], [1, RIGHT[0]], [-1, LEFT[1]], [1, RIGHT[1]], [-1, LEFT[2]], [1, RIGHT[2]]];
    const courtOfBones = () => {
      f.cast('Court of Bones', 4, 'rise');
      crumbleLids('court');
      f.echoPlan = [];
      B.untargetable = true; B.lockFacing = true;
      f.moveBoss(0, -ARENA.hh + 110, 520);
      const spots = COURT.map(([sx, i]) => ({ x: sx * (ARENA.hw - 40), y: COFFIN_Y[i] }));
      f.emit({ t: 'roomev', k: 'court', l: spots.map((s, i) => [s.x, s.y, 7 + i * 3]), dur: 7 + spots.length * 3 });
      // his Grave Warden climbs down from the dais as the coffins wake: slow, heavy, and it goes for whoever is nearest until
      // someone is hit or taunts it. The tank's job in this recess (hold it out of the party's way), and the melee's to cut it down
      f.afterKeep(4, () => f.spawnAdd({ kind: 'warden', x: B.x, y: B.y + 150, hp: dmg.wardenHp, r: 40, speed: 62, bite: dmg.wardenBite, biteEvery: 2.5, prio: 4 }));
      spots.forEach((s, i) => {
        const opensAt = f.t + 7 + i * 3;
        f.spawnAdd({ kind: 'coffin', x: s.x, y: s.y, hp: dmg.coffinHp, r: 30, inert: true, prio: 10 - i, opensAt,
          onTick: ad => {
            if (f.t < opensAt) return;
            f.adds.delete(ad.id); f.addsDirty = true; f.emit({ t: 'addev', k: 'gone', id: ad.id });
            f.spawnAdd({ kind: 'skeleton', x: s.x - Math.sign(s.x) * 40, y: s.y, hp: dmg.skelHp, r: 28, speed: 85, bite: dmg.skelBite, biteEvery: 2, prio: 1 });
          } });
      });
    };
    // Sceptre Throw: from the throne he hurls his sceptre at whoever stands farthest from him (the two farthest on Hard);
    // the line follows them until a moment before it lands, so the party can bait it where it likes.
    const sceptreThrow = () => {
      const al = f.alive();
      if (!al.length) return;
      const d = f.ct(3.4);
      f.cast('Sceptre Throw', d, 'cleave');
      const far = [...al].sort((a, b) => Math.hypot(b.x - B.x, b.y - B.y) - Math.hypot(a.x - B.x, a.y - B.y)).slice(0, H && al.length > 2 ? 2 : 1);
      for (const p of far) f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: 0, len: 1300, w: 120 }, delay: d, dmg: dmg.throw, tag: 'throw', aimFromBoss: p.id, lockAt: 1.0 });
    };
    // Sceptre Throw, thrice (the Verdict, Judgement): the sceptre is hurled three times, at three heroes in turn (never the tank;
    // the same hero twice if the party is small), VOLLEY_GAP s apart. Each line follows its hero until VOLLEY_LOCK s before it lands and
    // then sets: a step out of a set line is a dodge, and the lines are all on the floor from the cast, so the party can see where
    // each one will run and keep out of its neighbours'. Every line is red from the boss out to the wall.
    const VOLLEY_GAP = H ? 0.85 : 1.05, VOLLEY_LOCK = H ? 0.7 : 0.85;
    const sceptreVolley = () => {
      const al = f.alive();
      if (al.length < 2) return;
      const d = f.ct(3.4), pool = f.shuffle(f.nonTanks().length ? f.nonTanks() : al);
      f.cast('Sceptre Throw', d, 'cleave');
      for (let i = 0; i < 3; i++) {
        const p = pool[i % pool.length];
        f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: 0, len: 1300, w: 100 }, delay: d + i * VOLLEY_GAP, dmg: dmg.throw, tag: 'throw', aimFromBoss: p.id, lockAt: VOLLEY_LOCK });
      }
    };
    // Grave Summons: the dead gather on one of them (never the tank); wherever they are standing, the party closes on them
    const graveSummons = () => {
      const al = f.alive();
      if (al.length < 2) return;
      const p = f.pick(f.nonTanks().length ? f.nonTanks() : al), d = f.ct(5);
      f.cast('Grave Summons', f.ct(3), 'rise');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.summons * Math.min(al.length, 4) / 4, follow: p.id,
        need: Math.max(1, al.length - 1), tag: 'stack' });
    };
    // Hard (the Verdict and Judgement): the dead gather on a random hero (the party stacks in), and 3.5 s after it lands
    // each hero is marked: out again, spread. The stack is blue, the marks red, both on the floor the whole time.
    const gatherThenScatter = () => {
      const al = f.alive();
      if (al.length < 3) return;
      const p = f.pick(f.nonTanks().length ? f.nonTanks() : al), d = f.ct(4.5);
      f.cast('Grave Summons', d, 'rise');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.summons * Math.min(al.length, 4) / 4, follow: p.id,
        need: Math.max(1, al.length - 1), tag: 'stack' });
      f.afterKeep(d + 0.2, () => marks(3.5));
    };
    const kingRises = () => {
      const d = 3;
      f.cast('The King Rises', d, 'rise');
      f.afterKeep(1, () => placeKnights(1));
      f.afterKeep(d, () => { B.untargetable = false; B.lockFacing = false; });
    };

    // --- the Long Night: the relay ---------------------------------------------------------------------
    // One lantern (two on Hard) and Doom passing round the party in a fixed order (the tank last of all, and only when
    // nobody else is left). The next doomed's sigil glows 6 s before it lands; whoever a lantern cures carries it on.
    let relay = { k: 0 };
    const relayOrder = () => {
      const al = f.alive().map(p => p.id).sort((a, b) => a - b), tank = f.tank();
      const non = al.filter(id => !tank || id !== tank.id);
      return non.length >= (H ? 2 : 1) + 1 ? non : al;
    };
    const pickNext = () => {
      const order = relayOrder(), n = Math.min(H ? 2 : 1, order.length), out = [];
      const carrying = new Set(f.lanterns.map(l => l.carrier).filter(c => c != null));
      for (let i = 0; i < order.length * 2 && out.length < n; i++) {
        const id = order[relay.k % order.length]; relay.k++;
        if (out.includes(id) || f.doomed.has(id) || (carrying.has(id) && order.length > n + 1)) continue;
        out.push(id);
      }
      return out;
    };
    const announce = () => {
      f.doomNext = pickNext();
      if (f.doomNext.length) f.emit({ t: 'roomev', k: 'doomnext', ids: f.doomNext, dur: 6.5 });
    };
    const longNight = () => {
      const d = 5;
      f.cast('The Long Night', d, 'night');
      crumbleLids('night');
      f.afterKeep(d, () => {
        f.night = true;
        for (const b of braziers()) f.setPropState(b, 0);   // the braziers die with the lanterns
        f.lanterns = (H ? [-110, 110] : [0]).map(x => ({ id: f.nextMechId++, x, y: 200, carrier: null, last: true, fade: Infinity }));
        f.emit({ t: 'night', on: 1 });
        sendLanterns();
        announce();
      });
    };
    const doomPass = () => {
      const d = f.ct(3);
      f.cast('Royal Doom', d, 'doom');
      f.afterKeep(d, () => {
        let ids = (f.doomNext || []).filter(id => alive(id) && !f.doomed.has(id));
        if (!ids.length) ids = pickNext();
        f.doomNext = null;
        if (ids.length) doomOn(ids, H ? 10 : 11);
        f.afterKeep(12 - 6, announce);
      });
    };

    // --- the hearing ------------------------------------------------------------------------------------
    // Every act is laid out in units (a set each: a call and what rides with it). On Hard the units of an act are drawn in a fresh order each
    // pull, so it is read and not memorised. They are not drawn loose: the units that hand the tank a job (a Sweep to point, a Grave Cleave
    // to take) and the others are woven one for one, so in any order the tank and the healer are never more than a unit or two from work.
    const shuf = a => (H ? f.shuffle(a) : a);
    const weave = (T, O) => { const out = [], first = O.length > T.length ? O : T, second = first === O ? T : O; for (let i = 0; i < first.length; i++) { out.push(first[i]); if (second[i]) out.push(second[i]); } return out; };
    const lay = (head, T, O, tail) => [...head, ...weave(shuf(T.filter(Boolean)), shuf(O.filter(Boolean))), ...tail];
    // a job for the tank besides the Sweeps the knights answer. Hard's Cleave is more than the tank's health, so on Hard it can only come as often as his
    // cooldowns allow: there the extra jobs are Sweeps in the Summons (the knights are not there yet) and the units carry no extra job after that.
    // Every swing he makes once the knights have risen is answered by an Echo, here and in the closing passes.
    const tb = dt => H ? [dt, () => swing('sweep'), 'Sceptre Sweep'] : [dt, graveCleave, 'Grave Cleave'];
    const nc = dt => (H ? [] : [[dt, graveCleave, 'Grave Cleave']]);
    const lightsUnit = lead => S([lead, () => lightsOut(), 'Lights Out']);
    const lidsUnit = (lead, a, b) => S([lead, () => coffinLids(a, b), 'Coffin Lids'], ...nc(4), [H ? 8 : 4, decree, 'Royal Decree']);
    const L = n => (H ? n - 1 : n);   // (Hard's calms between the units are a second shorter)
    const cleaveBind = () => { graveCleave(); if (H) gravebind(); };

    // I. The Summons: his calls, one at a time (a Sweep or a Cleave for the tank in every other call, a Knell now and then for the healer)
    const summons = at => f.course({
      until: 0.8,
      sets: lay(
        [S([5, knell, 'Barrow Knell'])],
        [
          S([L(9), knell, 'Barrow Knell'], [5, () => swing('sweep', false, false, true), 'Sceptre Sweep']),
          S([H ? 7 : 10, graveCleave, 'Grave Cleave']),
          S([H ? 8 : 10, () => swing('ring'), 'Crown of Graves'], tb(4.5)),
          S([H ? 9 : 11, () => royalDoom(), 'Royal Doom'], [5, knell, 'Barrow Knell'], [5, () => swing('sweep'), 'Sceptre Sweep']),
        ],
        [
          S([H ? 7 : 8, () => gaze(), 'Royal Gaze']),
          H && S([7, () => audience(), 'Royal Audience']),
          S([H ? 9 : 11, () => swing('stomp', false, false, true), 'Barrow Stomp']),
        ],
        [S([H ? 8 : 10, knellRocks, 'Barrow Knell'])]),
      closing: [[10, () => swing('sweep'), 'Sceptre Sweep'], [10, knell, 'Barrow Knell']],
      next: testimony,
    }, at);

    // II. Testimony: the knights rise and answer every call; the charges are read out
    const testimony = at => f.course({
      until: 0.62,
      sets: lay(
        [S([3, knightsRise, 'Echo Knights']), S([6, chargeSheet, 'The Charge Sheet'], [H ? 10 : 8, graveCleave, 'Grave Cleave'], [5, knell, 'Barrow Knell'])],
        [
          !H && S([10, graveCleave, 'Grave Cleave']),
          S([H ? 6 : 8, () => swing('sweep'), 'Sceptre Sweep'], [5, () => echo(1.5), 'Echo Knights'], [3.5, knell, 'Barrow Knell']),
          !H && lidsUnit(10, 1, 2),
        ],
        [
          S([H ? 10 : 11, () => swing('stomp'), 'Barrow Stomp'], [5.5, () => echoGaze(1.5), 'Royal Gaze']),
          S([H ? 8 : 10, () => bells(0.6), 'Barrow Bells']),
          H ? lidsUnit(9, 1, 2) : lightsUnit(11),
          H && lightsUnit(9),
          H && S([8, () => march(1, laneY()), 'Funeral March']),
        ],
        [S([H ? 8 : 9, knellRocks, 'Barrow Knell'])]),
      closing: [[10, graveCleave, 'Grave Cleave'], [10, () => swing('sweep'), 'Sceptre Sweep'], [5.5, () => echo(1.5), 'Echo Knights'], [8, knell, 'Barrow Knell']],
      next: court,
    }, at);

    // III. Court of Bones: a recess on the throne while the coffins wake
    // (every gap between casts is under 6 s whatever the party does; the throws and the summons go where the party is)
    // (Hard draws anew each pull which coffin of each side wakes when; every coffin shows its countdown. The casts keep their order: the Knell, the stack and the Marks need the healer's time)
    const court = at => f.course({
      sets: [
        S([2, courtOfBones, 'Court of Bones']),
        S([5.5, sceptreThrow, 'Sceptre Throw']),
        S([5.5, H ? sceptreThrow : knell, H ? 'Sceptre Throw' : 'Barrow Knell']),   // (Hard: a Knell before the stack and the Marks was too much for the healer, so a second throw takes its place)
        S([5.5, graveSummons, 'Grave Summons'], [H ? 6 : 3.5, () => marks(), 'Grave Marks']),
        S([6, sceptreThrow, 'Sceptre Throw']),
        H && S([6, knell, 'Barrow Knell']),   // (Hard: the Knell comes last, well after the Marks)
        S([4.5, kingRises, 'The King Rises']),
        S([5]),
      ],
      next: verdict,
    }, at);

    // Royal Tithe (a heal check you prepare for): he takes his tithe of life: everyone falls to a third of their health. Shields
    // aren't life, so they stay; then the Dirge tolls 8 s later. He stays his hand (no blows on the tank) till then.
    const tithe = () => {
      const d = f.ct(5);
      f.cast('Royal Tithe', d, 'knell');
      f.healCheck(d + 8.6);   // to just after the Dirge lands
      // the Verdict waits for this set (Tithe, Dirge) to play out whole before the Judgement can follow
      const c = f.curCourse;
      if (c) { c.o.seam = 20; f.afterKeep(d + 8.5, () => { c.o.seam = 8; }); }
      f.afterKeep(d, () => {
        B.noAutoUntil = f.t + 9;
        f.emit({ t: 'roomev', k: 'tithe' });
        for (const p of f.alive()) {
          const s = f.ps.get(p.id);
          if (!s || s.mits.some(m => m.kind === 'invuln')) continue;
          // (all your health above a third of a full bar)
          const a = Math.round(s.hp - s.maxHp * 0.33);
          if (a <= 0) continue;
          s.hp -= a; f.stats[p.id].taken += a;
          f.emit({ t: 'pdmg', id: p.id, a, k: 'tithe', hp: Math.round(s.hp), dd: 0 });
        }
      });
    };
    // ... and the Dirge, 3 s after the Tithe lands (laid out in the same set, so it comes whatever the pace)
    const dirge = () => {
      f.cast('Dirge', 5, 'knell');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 5, dmg: dmg.dirge, hidden: true, tag: 'knell' });
    };

    // IV. The Verdict: the calls and their answers overlap; Judgement opens its second half, whatever the pace
    // (Hard: the Cleave, Burial Rites, the Doom that follows it and the Lids keep this order: the Cleave must come within a cooldown of the one before it. The Tithe and what
    // follows it stay in their place: a party at a third of its health is not given a new problem.)
    const lidsDecree = () => lidsUnit(10, 0, 3);
    const verdict = at => f.course({
      until: 0.46,
      sets: [
        S([4, () => swing('sweep'), 'Sceptre Sweep'], [H ? 3 : 0, () => swing('stomp', true), 'Barrow Stomp'], [H ? 6.5 : 5.5, () => echo(1.5), 'Echo Knights']),
        ...(H
          // (Hard) the graves open, the Writ is read with them, then in close for a Crown of Graves and out to your grave
          ? [S([9, cleaveBind, 'Grave Cleave']), S([10, burialRites, 'Burial Rites'], [3.5, writ, 'Writ of Execution'], [8.5, () => swing('ring', false, true), 'Crown of Graves']),
            S([12, () => royalDoom(2), 'Royal Doom'], [4, () => marks(), 'Grave Marks']), lidsDecree()]
          : [lidsDecree(), S([10, () => royalDoom(1), 'Royal Doom'], [4, () => marks(), 'Grave Marks']), S([9, cleaveBind, 'Grave Cleave'])]),
        S([H ? 11 : 12, tithe, 'Royal Tithe'], [f.ct(5) + 3, dirge, 'Dirge']),
        S([H ? 6 : 7, () => swing('ring'), 'Crown of Graves'], [5.5, () => echoGaze(1.5), 'Royal Gaze'], ...nc(7)),
        H && S([7, () => march(-1, laneY()), 'Funeral March']),
        S([H ? 9 : 10, sceptreVolley, 'Sceptre Throw']),
      ].filter(Boolean),
      closing: [[10, graveCleave, 'Grave Cleave'], [10, () => swing('sweep'), 'Sceptre Sweep'], [5.5, () => echo(1.5), 'Echo Knights'], [8, knell, 'Barrow Knell']],
      next: judged,
    }, at);
    const judged = at => f.course({
      until: 0.25,
      sets: lay(
        [S([3, judgement, 'Judgement']), S([H ? 10 : 15, knellRocks, 'Barrow Knell']), ...(H ? [S([9, cleaveBind, 'Grave Cleave'])] : [])],   // (Hard: the Cleave comes first, so it is never a long way from the one in the Verdict)
        [
          S([L(9), () => swing('stomp', false, false, true), 'Barrow Stomp'], [4.6, () => swing('sweep'), 'Sceptre Sweep'], [5, () => echo(1.5), 'Echo Knights'], [3.5, knell, 'Barrow Knell']),
          !H && S([9, cleaveBind, 'Grave Cleave']),
          !H && lidsUnit(9, 2, 1),
          S([L(9), () => swing('sweep'), 'Sceptre Sweep'], [5, () => echo(1.5), 'Echo Knights'], [3.5, knell, 'Barrow Knell']),
        ],
        [
          S([L(9), () => swing('ring'), 'Crown of Graves'], [5.5, () => echoGaze(1.5), 'Royal Gaze']),
          S([L(8), () => bells(2.2), 'Barrow Bells']),
          H ? lidsUnit(8, 2, 1) : lightsUnit(8),
          H && lightsUnit(8),
          S([H ? 11 : 9, H ? gatherThenScatter : graveSummons, 'Grave Summons']),
          H && S([8, () => audience(), 'Royal Audience']),
        ],
        [H ? S([8, () => swing('sweep'), 'Sceptre Sweep'], [5, () => echo(1.5), 'Echo Knights'], [3.5, knell, 'Barrow Knell']) : S([8, graveCleave, 'Grave Cleave'], [5.5, knell, 'Barrow Knell'])]),
      closing: [[10, graveCleave, 'Grave Cleave'], [10, () => swing('sweep'), 'Sceptre Sweep'], [5.5, () => echo(1.5), 'Echo Knights'], [8, knell, 'Barrow Knell']],
      next: night,
    }, at);

    // V. Sentence: the Long Night. Doom passes on every 12 s; the lantern goes with it. Between the passes the whole hearing comes back, a little
    // harder each time: a Cleave, a Sweep and the knight's answer to it, then the Stomp and the Sweep together and the knights' answer to both
    // (the order is the lesson, so Hard leaves it as it is; it has its two dooms and two lanterns)
    const night = at => f.course({
      sets: [
        S([2, longNight, 'The Long Night']),
        S([10, doomPass, 'Royal Doom']),
        S([6, graveCleave, 'Grave Cleave']),
        S([6, doomPass, 'Royal Doom']),
        S([6, () => swing('sweep', false, false, true), 'Sceptre Sweep']),
        S([6, doomPass, 'Royal Doom']),
        S([6, () => echoGaze(1, true), 'Royal Gaze']),
        S([6, doomPass, 'Royal Doom']),
        S([6, () => swing('stomp', false, false, true), 'Barrow Stomp'], [5, () => swing('sweep'), 'Sceptre Sweep'], [5.5, () => echo(1.5), 'Echo Knights']),
      ],
      closing: [[6, doomPass, 'Royal Doom'], [6, () => swing('stomp', false, false, true), 'Barrow Stomp'], [6, doomPass, 'Royal Doom'], [6, () => echo(1.5), 'Echo Knights']],
    }, at);

    summons(0);

    f.moves = { knell, gaze, audience, graveCleave, royalDoom, marks, swing, echo, bells, march, gravebind, lightsOut, coffinLids, decree, masonry,
      courtOfBones, kingRises, placeKnights, burialRites, writ, chargeSheet, judgement, longNight, doomPass };
  },
};

if (typeof module !== 'undefined') module.exports = { HOLLOWKING };
