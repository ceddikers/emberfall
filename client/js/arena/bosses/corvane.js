// Boss IX: Corvane, the Unburied Blade — "The Pass". The duellist your mistakes sharpen.
// First boss of set 3 (the Fallen Star, docs/plans/2026-10-set-3-pitches.md). The last guard of the crater road, never relieved.
// The question is always: what is his stance telling us?
//   THE WHETSTONE: every avoidable hit he lands puts a notch on his blade (four notches; Hard keeps counting past the top). When it
//     is full he unleashes, and his stance shows which unleashing it will be before anything is painted:
//       blade low and back  -> Rising Crane         (a wide fan, then a second fan turned 45 degrees)
//       blade raised high   -> Comet Draw           (a dash through the farthest hero to the wall; a stone lantern shelters, once)
//       blade in the snow   -> Hundredfold Parting  (he blinks to each hero in turn, leaving numbered afterimages; one slash joins them)
//     Every unleashing ends with Cold Sheathe (a raidwide for the healer). An unleashing the party earned slides the rest of his
//     script later, so a sloppy party meets the enrage with more of the fight still to do: the party's mistakes set the pace.
//     Every act also ends with an unleashing on the script (the gauge fills itself), so a clean party sees them on schedule.
//   Act I, The Pass (100% -> 72%): Draw Cut, Scabbard Sweep, Sundering Cut and Cracked Guard (the tank pair), White Gale, then Rising Crane.
//   Act II, The Shrine (72% -> 42%): Still Water (a parry stance: the floor in front of him counters), Comet Draws through the lanterns,
//     Hollow Breath (a cold circle that follows the healer), then a Comet Draw.
//   The Vigil (the WALL at 42%): he kneels in the snow; cold wisps drift toward him, first from the broken lanterns, and each one
//     that reaches him adds a notch. A lantern's wisp struck down on the way relights its lantern. He rises after a fixed time.
//   Act III, The Whetted Edge (42% -> 16%): all three unleashings, one at a time, and the pairs that make new problems (a Draw Cut
//     with a Scabbard Sweep laid just behind it, a Draw Cut at the tank on the glass of Still Water or at the healer inside Hollow Breath).
//   Act IV, The Last Vigil (16% -> dead): he kneels once more, rises and gives all three edges back to back, each stance shown as the last
//     one lands (the sentence the whole fight has been spelling), then a Hundredfold Parting begun from each hero in turn.
// THE TANK'S OWN CUT (2026-10-26): Answering Cut, a quick light cut at the tank from his draw stance (a buster, about a third of a Sundering
//   Cut, 1.9 s of warning), the duel's beat between the pairs: the tank guards it or spends a cooldown, and keeps him turned from the lanterns
//   (it breaks any it reaches, like the Sundering Cut) and from the party (the cone cleaves). It sits in the quiet stretches of every act, in the
//   Vigil, and as he rises for the Last Vigil. Never within 9 s before a Sundering Cut: the shared tankbuster look would read the Cut as the
//   Cracked Guard. Hard: the Return Stroke, a second cone on the tank 1.4 s after the first, painted from the start under the one cast bar; the
//   tank takes the first and must step out of the second.
// Pairs that ask for skill, on both difficulties: a Comet Draw is followed by a Draw Cut from where the dash left him (a line from the far
// wall through the place everyone just ran to), and the two lines of an Act III twin Draw land a beat apart, the second still following its
// own hero while the first lands.
// No push: an act ends at the next set seam after its gate. Every telegraph shows on every difficulty. Hard: casts 15% faster, about a third
// more damage (a smaller multiplier than it was: the difficulty moved into the moves below), a smaller health bar and an earlier enrage, and:
//   Overwhet:          notches landed while he unleashes are kept; one left over fires a second unleashing a breath after.
//   False Stance:      halfway through a wind-up he changes stance; the floor is only painted for the stance he ends on. Never on the
//                      second unleashing of an Overwhet pair, and never two in a row.
//   Returning Parting: the dance runs again, back the other way, through where everyone has moved to (also at the end of the Last Vigil).
//   Comet Volley:      Comet Draw becomes three dashes, each at the hero farthest from where the last one ended.
//   Return Stroke:     Answering Cut comes back: a second cone on the tank a beat after the first (the tank takes the first and steps out of the second).
//   Closing Fan:       the second Rising Crane fan turns toward the side most of the party is standing on (the door they would have used
//                      is the one that closes; the turn is painted from the start, like everything else); a Comet Draw in Act II may be
//                      followed by a Draw Cut at anyone, not only the tank.
// Hard also draws which six of eight lanterns stand, the order of Act III's unleashings, the order of the closing three edges and when
// Hollow Breath comes, fresh each pull.

const CORVANE = {
  id: 'corvane', name: 'Corvane', title: 'the Unburied Blade',
  hp: { normal: 5900000, hard: 5250000 },
  hardDmg: 1.33,   // (Hard's damage multiplier; fight.js default 1.25: 1.33 before the 2026-10-26 fun pass, 1.42 before that: a numbers bump, part of that difficulty lives in the Hard-only skill moves below)
  autoDmg: { normal: 2300, hard: 2050 },
  enrage: { normal: 590, hard: 585 },   // the cast starts here and lands 8 s later (9:58 / 9:48: a minute after the script's end, 45 s on Hard)
  enrageName: 'Last Light of the Pass',
  vuln: 0.5,
  spawn: { x: 0, y: -80 },
  arena: { theme: 'pass' },
  gates: [0.72, { f: 0.42, wall: 1 }, 0.16],   // where the acts change (ticks on the boss bar; fight.js course): the Last Vigil is health-gated, so every party meets it

  // the stone lanterns (Hard draws six of the eight spots each pull; Normal stands the same six)
  room(f) {
    const SPOTS = [[-420, -235], [420, -235], [-420, 235], [420, 235], [0, -300], [0, 300], [-170, -275], [170, 275]];
    const pick = f.hard ? f.shuffle(SPOTS).slice(0, 6) : SPOTS.slice(0, 6);
    f.lanternSpots = pick;   // (where they stood: the Vigil's wisps come from the broken ones, and a wisp struck down relights its lantern)
    for (const [x, y] of pick) f.addProp({ kind: 'stonelantern', x, y, r: 30, hp: 1, solid: true, cover: true, state: 0 });
  },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      gale: H ? 12250 : 14800, cut: H ? 18300 : 22000, guard: H ? 17000 : 20500, draw: H ? 19700 : 23800, sweep: H ? 20350 : 24600,
      still: H ? 9600 : 9200, breath: H ? 2900 : 3000, crane: H ? 23700 : 28600, comet: H ? 21550 : 26000, part: H ? 21900 : 26400,
      sheathe: H ? 13900 : 16800, wispHp: 26000, last: H ? 14800 : 17800, answer: H ? 5500 : 6600,
    };
    const S = (...steps) => steps.filter(Boolean);
    const live = id => f.alive().find(p => p.id === id);
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    const healer = () => f.alive().find(p => p.role === 'healer') || nonTank();
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    // an earned unleashing waits out a move still on the floor and a follow-up still to come (it never starts on top of one)
    let quietAt = 0, pairEnd = 0;   // (pairEnd: when the Cracked Guard that follows a Sundering Cut ends)
    const busyFor = d => { quietAt = Math.max(quietAt, f.t + d); };
    // how far a line from (x, y) along a runs before it meets the wall
    const toWall = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); let d = 0; while (d < 2400 && ARENA.sd(x + c * d, y + s * d) < -12) d += 12; return Math.max(60, d); };

    // --- the Whetstone ---------------------------------------------------------------------------------------------------
    // shared with the bots and the host's view (raid-host.js): { n, max, over, st (the stance on show), busy }
    const MAX = 4;
    const whet = f.whet = { n: 0, max: MAX, over: 0, st: null, busy: false };
    let act = 1;             // which act's unleashings he may choose from (1: Crane; 2: Crane, Comet; 3: all three)
    let lastSt = null;
    const sendWhet = () => f.emit({ t: 'roomev', k: 'whet', n: whet.n, max: MAX, over: whet.over, st: whet.st, dur: 9999 });
    const lastNotch = {};
    const notch = (n = 1) => {
      if (whet.busy) { if (H) { whet.over = Math.min(MAX, whet.over + n); sendWhet(); } return; }
      whet.n = Math.min(MAX, whet.n + n); sendWhet();
    };
    // every avoidable hit he lands (fight.js damagePlayer calls this). A hero feeds him at most a notch every second and a half,
    // so one bad step is one notch; in the Vigil only the wisps count.
    // A lingering hazard (the glass of Still Water, Hollow Breath's five breaths) is one bad step however long it is stood in.
    const LINGER = { cvStill: 1, cvBreath: 1 }, lingered = {};
    f.onAvoidable = (p, o) => {
      if (f.wall || f.state !== 'live' || f.cleanRun) return;   // (cleanRun: tools/check.js's timeline, whose dummies take every hit)
      if (f.t - (lastNotch[p.id] ?? -9) < 1.5) return;
      const k = o && LINGER[o.kind] ? p.id + o.kind : null;
      if (k && f.t - (lingered[k] ?? -99) < 12) return;
      if (k) lingered[k] = f.t;
      lastNotch[p.id] = f.t;
      notch(1);
    };
    // push the rest of his script later by dur s (an unleashing the party earned is extra fight, not a swap)
    const slide = dur => {
      const t = f.t, cur = f.curCourse;
      for (const e of f.events) if (e.step && e.t > t) e.t += dur;
      f.events.sort((a, b) => a.t - b.t);
      if (cur) { cur.seams = cur.seams.map(s => (s > t ? s + dur : s)); cur.end += dur; }
      f.pauseShift = (f.pauseShift || 0) + dur;
      f.broadcastNext(true);
    };
    const STANCE_T = 2.2;   // the stance alone, before any floor is painted
    const choose = () => {
      const pool = act === 1 ? ['crane'] : act === 2 ? ['crane', 'comet'] : ['crane', 'comet', 'parting'];
      const fresh = pool.filter(s => s !== lastSt);
      return f.pick(fresh.length ? fresh : pool);
    };

    // --- plain moves -----------------------------------------------------------------------------------------------------
    const gale = () => {
      const d = f.ct(4.4);
      f.cast('White Gale', d, 'gale');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.gale, hidden: true, tag: 'cvGale' });
    };
    // Sundering Cut, then Cracked Guard: the tank's guard breaks under the first and the second lands harder. A lantern the
    // blow reaches breaks too, so the tank keeps him turned away from them.
    const cut = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.2);
      pairEnd = f.t + d + 0.05 + f.ct(4.2);
      f.cast('Sundering Cut', d, 'cut');
      const m = f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 1.3, angle: B.facing }, delay: d, dmg: dmg.cut, target: tank.id, aimFromBoss: tank.id, tag: 'buster',
        onResolve: () => {
          const s = m.shape;
          for (const pr of f.props.filter(q => q.kind === 'stonelantern')) {
            const dx = pr.x - s.x, dy = pr.y - s.y, dd = Math.hypot(dx, dy);
            let da = Math.atan2(dy, dx) - s.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (dd < 380 && Math.abs(da) < 0.7) f.breakProp(pr, 'cut');
          }
          const t2 = live(tank.id); if (t2) f.debuff(t2.id, 'cracked', 5);
        } });
      f.afterKeep(d + 0.05, () => {
        const t2 = live(tank.id) || f.tank(); if (!t2) return;
        const d2 = f.ct(4.2);
        f.cast('Cracked Guard', d2, 'guard');
        f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 1.3, angle: B.facing }, delay: d2, dmg: dmg.guard, target: t2.id, aimFromBoss: t2.id, tag: 'buster' });
      });
    };
    // Answering Cut: the quick cut of the duel, at the tank (a light buster from his draw stance: about a third of a Sundering Cut). The tank takes it with
    // a guard or a cooldown, and keeps him turned from the lanterns, since it breaks any it reaches; whoever stands in the cone takes the cleave. Hard: the
    // blade comes back (the Return Stroke): a second cone on the tank a beat later, painted from the start and still following the tank while the
    // first lands, so the tank takes the first and must step out of the second. One cast bar covers both.
    const answer = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(1.9), gap = f.ct(1.4);
      f.cast('Answering Cut', H ? d + gap : d, 'draw');
      hold(H ? d + gap : d);
      const m = f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 300, arc: 1.1, angle: B.facing }, delay: d, dmg: dmg.answer, target: tank.id, aimFromBoss: tank.id, lockAt: 0.45, tag: 'buster',
        onResolve: () => {
          const s = m.shape;
          for (const pr of f.props.filter(q => q.kind === 'stonelantern')) {
            const dx = pr.x - s.x, dy = pr.y - s.y, dd = Math.hypot(dx, dy);
            let da = Math.atan2(dy, dx) - s.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (dd < 330 && Math.abs(da) < 0.6) f.breakProp(pr, 'cut');
          }
        } });
      if (H) f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 300, arc: 1.1, angle: B.facing }, delay: d + gap, dmg: dmg.answer, aimFromBoss: tank.id, lockAt: 0.45, tag: 'cvAnswer2' });
    };
    // Draw Cut: a long line through a hero, drawn a moment before the blade is
    const drawCut = (target) => {
      target = target || nonTank(); if (!target) return;
      const d = f.ct(3.0);
      f.cast('Draw Cut', d, 'draw');
      f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(target.y - B.y, target.x - B.x), len: 1300, w: 110 }, delay: d, dmg: dmg.draw,
        aimFromBoss: target.id, lockAt: 0.5, tag: 'cvDraw' });
      hold(d);
    };
    // two at two different heroes (Act III), both lines painted at once, the second landing a beat after the first: the line you stepped
    // out of puts you somewhere, and the second line is still following its own hero while the first lands
    const twinDraw = () => {
      const pool = f.shuffle(f.nonTanks().length > 1 ? f.nonTanks() : f.alive());
      const d = f.ct(3.4), gap = f.ct(0.9);
      f.cast('Draw Cut', d + gap, 'draw');
      pool.slice(0, 2).forEach((p, i) => f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(p.y - B.y, p.x - B.x), len: 1300, w: 110 }, delay: d + i * gap, dmg: dmg.draw, aimFromBoss: p.id, lockAt: 0.5, tag: 'cvDraw' }));
      hold(d + gap);
    };
    // Scabbard Sweep: half the room on the side the scabbard points to
    let glassEnd = 0;   // (when Still Water's glass lets go)
    const sweep = (side) => {
      side = side || (f.rng() < 0.5 ? -1 : 1);
      const d = f.ct(3.8);
      B.lockFacing = true;
      f.cast('Scabbard Sweep', d, side < 0 ? 'sweepL' : 'sweepR');
      f.aoe({ kind: 'cone', x: B.x, y: B.y, r: 1500, arc: Math.PI, angle: B.facing + side * Math.PI / 2 }, d, dmg.sweep, { tag: 'cvSweep' });
      hold(d);
      f.afterKeep(d + 0.1, () => { if (f.t >= glassEnd) B.lockFacing = false; });   // (a Sweep laid on the glass leaves him turned until the glass lets go)
    };
    // Still Water: he plants in a parry stance; the floor in front of him is glassy, and anyone standing on it is countered
    const stillWater = () => {
      const d = f.ct(2.4), dur = 7;
      glassEnd = f.t + d + dur;
      B.lockFacing = true;
      f.cast('Still Water', d, 'still');
      const ang = B.facing;
      f.zone({ shape: { kind: 'cone', x: Math.round(B.x), y: Math.round(B.y), r: 760, arc: 2.2, angle: +ang.toFixed(3) }, dur, delay: d, effect: 'burn', dmg: dmg.still, tag: 'cvStill' });
      B.noAutoUntil = f.t + d + dur;
      hold(d + dur); busyFor(d + dur);
      f.afterKeep(d + dur, () => { B.lockFacing = false; });
    };
    // Hollow Breath: a cold circle that follows the healer and bites anyone else in it, five breaths
    const hollowBreath = () => {
      const h = healer(); if (!h) return;
      f.cast('Hollow Breath', f.ct(2), 'breath'); busyFor(5 * 2.2 + 0.2);
      for (let i = 0; i < 5; i++) {
        f.afterKeep(i * 2.2, () => {
          const q = live(h.id); if (!q) return;
          f.mech({ type: 'spread', shape: { kind: 'circle', x: q.x, y: q.y, r: 135 }, delay: 2.2, dmg: dmg.breath, follow: q.id, lockAt: 0.15, tag: 'cvBreath' });
        });
      }
    };
    const sheathe = (delay = 0, named = false) => {
      f.afterKeep(delay, () => {
        const d = f.ct(3.4);
        f.cast('Cold Sheathe', d, 'sheathe');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.sheathe, hidden: true, tag: 'cvSheathe' });
      }, named ? 'Cold Sheathe' : undefined);
      return delay + f.ct(3.4) + 0.3;
    };

    // --- the unleashings ---------------------------------------------------------------------------------------------------
    // each returns how long it runs from the moment its floor is painted
    const crane = () => {
      const d = f.ct(3.4), gap = f.ct(1.4), tgt = nonTank();
      const a = tgt ? Math.atan2(tgt.y - B.y, tgt.x - B.x) : B.facing;
      // Hard: the second fan turns toward the side most of the party is standing on (the door they would have used closes); a tie is the dice
      let side = f.rng() < 0.5 ? -1 : 1;
      if (H) {
        let lean = 0;
        for (const p of f.alive()) { const da = Math.atan2(Math.sin(Math.atan2(p.y - B.y, p.x - B.x) - a), Math.cos(Math.atan2(p.y - B.y, p.x - B.x) - a)); lean += da > 0.05 ? 1 : da < -0.05 ? -1 : 0; }
        if (lean) side = lean > 0 ? 1 : -1;
      }
      const turn = side * Math.PI / 4;
      f.cast('Rising Crane', d + gap, 'crane');
      B.lockFacing = true; B.facing = a; hold(d + gap);
      const group = new Set();
      f.aoe({ kind: 'cone', x: Math.round(B.x), y: Math.round(B.y), r: 1500, arc: 2.0, angle: +a.toFixed(3) }, d, dmg.crane, { tag: 'cvCrane', group });
      f.aoe({ kind: 'cone', x: Math.round(B.x), y: Math.round(B.y), r: 1500, arc: 2.0, angle: +(a + turn).toFixed(3) }, d + gap, dmg.crane, { tag: 'cvCrane2' });
      f.afterKeep(d + gap + 0.1, () => { B.lockFacing = false; });
      return d + gap;
    };
    // the lines run exactly to the wall, wherever they point
    const cometLines = [];
    f.ticker(() => {
      for (let i = cometLines.length - 1; i >= 0; i--) { const m = cometLines[i]; if (!f.mechs.has(m.id)) { cometLines.splice(i, 1); continue; } m.shape.len = toWall(m.shape.x, m.shape.y, m.shape.angle); }
    });
    // one dash through the hero farthest from where he stands, to the wall; a stone lantern in the way shelters, once
    const cometOne = (d, exclude) => {
      const pool = f.alive().filter(p => !exclude.has(p.id));
      if (!pool.length) return null;
      const tgt = pool.reduce((m, p) => (Math.hypot(p.x - B.x, p.y - B.y) > Math.hypot(m.x - B.x, m.y - B.y) ? p : m));
      exclude.add(tgt.id);
      const sx = B.x, sy = B.y;
      const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: sx, y: sy, angle: Math.atan2(tgt.y - sy, tgt.x - sx), len: 1300, w: 150 }, delay: d, dmg: dmg.comet,
        aimFromBoss: tgt.id, lockAt: 0.3, tag: 'cvComet', cover: true, src: { x: sx, y: sy }, chip: 'used', ddown: true,
        onResolve: () => {
          // he arrives at the wall at the end of the line
          const s = m.shape, L = toWall(s.x, s.y, s.angle) - 90, ex = s.x + Math.cos(s.angle) * L, ey = s.y + Math.sin(s.angle) * L;
          B.x = ex; B.y = ey; B.facing = s.angle + Math.PI; B.autoAt = f.t + 2;
          f.emit({ t: 'propfx', k: 'cvdash', x: Math.round(sx), y: Math.round(sy), x2: Math.round(ex), y2: Math.round(ey), boss: 1 });
        } });
      cometLines.push(m);
      return m;
    };
    const comet = (volley) => {
      const d = f.ct(3.6), n = volley ? Math.min(3, f.alive().length) : 1, step = f.ct(2.3);
      f.cast(volley ? 'Comet Volley' : 'Comet Draw', d, 'comet');
      B.lockFacing = true; hold(d + (n - 1) * step + 0.5);
      const taken = new Set();
      cometOne(d, taken);
      for (let i = 1; i < n; i++) f.afterKeep(d + (i - 1) * step + 0.05, () => cometOne(step - 0.05, taken));
      f.afterKeep(d + (n - 1) * step + 0.2, () => { B.lockFacing = false; });
      return d + (n - 1) * step;
    };
    // Comet Draw, and then he turns where the dash left him (at the wall, across the room from the party) and draws on whoever the
    // pair names: a line from the far side through the place everyone just ran to. who: 'tank' | 'healer' | 'any'
    const cometDraw = (who = 'tank') => {
      const run = comet(false);
      busyFor(run + 0.55 + f.ct(3.0) + 0.3);
      f.afterKeep(run + 0.55, () => {
        if (f.state !== 'live') return;
        const tgt = who === 'tank' ? f.tank() : who === 'healer' ? healer() : nonTank();
        if (tgt) drawCut(tgt);
      }, 'Draw Cut');
    };
    // he blinks to each hero in turn and leaves a numbered afterimage where they stood; then one slash runs through them all, in order,
    // from where he began and back to it. order: hero ids (default: everyone, shuffled)
    const parting = (order, o = {}) => {
      const ids = order || f.shuffle(f.alive()).map(p => p.id);
      const step = f.ct(0.85), lead = f.ct(1.6);
      const home = { x: Math.round(B.x), y: Math.round(B.y) };
      const imgs = [];
      if (!o.quiet) f.cast(o.name || 'Hundredfold Parting', lead + ids.length * step + 0.6, 'parting');
      B.lockFacing = true; hold(lead + ids.length * step + 1.4);
      const group = new Set();
      const seg = (a, b, delay) => {
        const len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 20) return;
        f.aoe({ kind: 'rect', x: a.x, y: a.y, angle: +Math.atan2(b.y - a.y, b.x - a.x).toFixed(3), len: Math.round(len), w: 96 }, delay, dmg.part, { tag: 'cvPart', group });
      };
      const slashAt = lead + ids.length * step + f.ct(1.5);
      ids.forEach((id, i) => {
        f.afterKeep(lead + i * step, () => {
          const p = live(id) || { x: home.x, y: home.y };
          const img = { x: Math.round(p.x), y: Math.round(p.y), n: i + 1 };
          imgs.push(img);
          B.x = img.x; B.y = img.y;
          f.emit({ t: 'roomev', k: 'cvimgs', l: imgs.map(q => [q.x, q.y, q.n]), dur: slashAt - (lead + i * step) + 1 });
          // each line is painted the moment both its ends are known
          seg(i === 0 ? home : imgs[i - 1], img, slashAt - (lead + i * step) + i * 0.08);
          if (i === ids.length - 1) seg(img, home, slashAt - (lead + i * step) + (i + 1) * 0.08);
        });
      });
      f.afterKeep(slashAt + ids.length * 0.08 + 0.05, () => {
        B.x = home.x; B.y = home.y; B.lockFacing = false;
        f.emit({ t: 'roomev', k: 'cvimgs', l: [], dur: 0.1 });
        f.anim('slash', 0.8);
      });
      return slashAt + ids.length * 0.08;
    };

    // the whole unleashing: the stance alone first, then the floor. False Stance (Hard): he shifts stance halfway. Overwhet (Hard):
    // a notch left over fires a second one a breath after. Returns its length (the caller slides the script by it when the gauge fired it).
    // A re-read is only asked for once at a time: no False Stance on the second unleashing of a pair, and none two unleashings running.
    const FLIP_T = STANCE_T * 0.85;   // (the stance he ends on, alone, before its floor is painted)
    let lastFlip = false;
    const unleash = (st, over) => {
      whet.busy = true;
      let shift = null;
      if (H && act >= 2 && !over && !lastFlip && f.rng() < 0.5) { const other = (act === 2 ? ['crane', 'comet'] : ['crane', 'comet', 'parting']).filter(s => s !== st); shift = st; st = f.pick(other); }
      lastFlip = !!shift;
      whet.st = shift || st; sendWhet();
      // (the cast bar says only that the edge is coming: which unleashing it is, his stance tells, then the floor and its own cast)
      f.cast(over ? 'Overwhet' : 'Whetted Edge', STANCE_T + (shift ? FLIP_T : 0), 'stance', { st: shift || st });
      if (shift) f.afterKeep(STANCE_T, () => { whet.st = st; sendWhet(); f.cast('False Stance', FLIP_T, 'stance', { st }); });
      const lead = STANCE_T + (shift ? FLIP_T : 0);
      let len = lead;
      f.afterKeep(lead, () => {
        if (f.state !== 'live') return;
        const run = st === 'crane' ? crane() : st === 'comet' ? comet(H && act === 3) : parting();
        let tail = run;
        if (st === 'parting' && H) {
          // Returning Parting: back the other way, through wherever everyone has gone
          f.afterKeep(run + 0.5, () => { if (f.state === 'live') parting(f.alive().map(p => p.id).reverse(), { name: 'Returning Parting' }); });
          tail = run + 0.5 + f.ct(1.6) + f.alive().length * f.ct(0.85) + f.ct(1.5) + 0.4;
        }
        const end = sheathe(tail + 0.4, true);
        f.afterKeep(end, () => {
          lastSt = st; whet.n = 0; whet.st = null; whet.busy = false;
          const again = whet.over > 0; whet.over = 0; sendWhet();
          if (again && f.state === 'live' && !f.wall) {   // Overwhet: a breath, then the second one
            whet.busy = true;
            f.afterKeep(1.0, () => { if (f.state !== 'live') { whet.busy = false; return; } const extra = unleash(choose(), true); slide(extra + 2); });
          }
        });
      }, 'Whetted Edge');
      // an estimate of the whole length, for the slide (the parts run on their own clocks)
      const runLen = st === 'crane' ? f.ct(3.4) + f.ct(1.4) : st === 'comet' ? f.ct(3.6) + (H && act === 3 ? 2 * f.ct(2.3) : 0) : f.ct(1.6) + f.alive().length * f.ct(0.85) + f.ct(1.5);
      len += runLen + (st === 'parting' && H ? runLen + 0.9 : 0) + 0.4 + f.ct(3.4) + 0.3;
      return len;
    };
    // the gauge, full: once he is between moves, he unleashes and the script waits for him
    f.ticker(() => {
      if (whet.busy || whet.n < MAX || f.wall || f.state !== 'live') return;
      if (B.cast && f.t < B.cast.end) return;
      if (f.t < quietAt) return;
      if (f.def.enrage && f.t > f.def.enrage[f.mode] - 25) return;
      const len = unleash(choose());
      slide(len + 1);
    });
    // an act's own unleashing: the gauge fills itself, then he unleashes (on the script: nothing slides)
    const scripted = st => () => {
      if (whet.busy) return;
      whet.n = MAX; sendWhet();
      const len = unleash(st || choose());
      // (Hard's Returning Parting, or a Volley, can run past the next step: the rest of the script waits for it)
      const next = f.events.reduce((m, e) => (e.step && e.t > f.t ? Math.min(m, e.t) : m), Infinity);
      if (next < Infinity && f.t + len + 1 > next) slide(f.t + len + 1 - next);
    };

    // --- the Vigil (the wall) ------------------------------------------------------------------------------------------------
    // he kneels; two waves of wisps drift in from the lanterns (and from the snow where none stand), and each one that reaches him
    // adds a notch. The last wisp is with him by about twenty seconds in, and he rises: the wall falls at a fixed time.
    const VIGIL = 22;
    const vigil = () => {
      B.lockFacing = true; B.moveTo = { x: 0, y: -80, speed: 420 };
      f.clearZones();   // (a Still Water caught by the gate lets go: the glass was laid for another place in the room)
      // (the kneel waits for what he was doing when the gate was reached: a cast, a Sundering pair or an unleashing on its way; nothing of his is cut short)
      let kneelEnd = Infinity;
      const kneel = (waited = 0) => {
        if (f.state !== 'live') return;
        if (((B.cast && f.t < B.cast.end - 0.01) || f.t < pairEnd || whet.busy) && waited < 10) return f.afterKeep(0.2, () => kneel(waited + 0.2));
        f.cast('The Vigil', 2.4, 'kneel'); kneelEnd = f.t + 2.4;
      };
      kneel();
      // (and what is laid in the wall waits for the kneel and for any cast bar still running)
      const later = fn => () => { if (f.state === 'live') { if (f.t < kneelEnd + 0.1 || (B.cast && f.t < B.cast.end - 0.01)) f.afterKeep(0.2, later(fn)); else fn(); } };
      f.emit({ t: 'roomev', k: 'vigil', dur: VIGIL });
      // the wisps rise first from the lanterns that have broken (each one is that lantern's light), then from the snow
      const standing = sp => f.props.some(p => p.kind === 'stonelantern' && Math.hypot(p.x - sp[0], p.y - sp[1]) < 10);
      const broken = f.shuffle((f.lanternSpots || []).filter(sp => !standing(sp)));
      const snow = f.shuffle([[-520, 0], [520, 0], [-300, 360], [300, 360], [-300, -360], [300, -360]]);
      const wisps = [];
      const reach = a => { a.reached = true; f.killAdd(a); f.emit({ t: 'propfx', k: 'cvwisp', x: Math.round(a.x), y: Math.round(a.y) }); if (!f.cleanRun) notch(1); };
      // struck down before it reaches him, a lantern's wisp goes home and the lantern is lit again (cover for Act III)
      const relight = a => {
        if (a.reached || !a.home || standing(a.home)) return;
        f.addProp({ kind: 'stonelantern', x: a.home[0], y: a.home[1], r: 30, hp: 1, solid: true, cover: true, state: 0 });
        f.emit({ t: 'propfx', k: 'cvrelight', x: a.home[0], y: a.home[1], fx: Math.round(a.x), fy: Math.round(a.y) });
      };
      const spawnWisp = (sp, home) => wisps.push(f.spawnAdd({ kind: 'wisp', x: sp[0], y: sp[1], hp: dmg.wispHp, r: 22, inert: true, prio: 5, home, onDeath: relight,
        onTick: (a, dt) => {
          const dx = B.x - a.x, dy = B.y - a.y, d = Math.hypot(dx, dy);
          if (d < 70) return reach(a);
          const sp2 = (H ? 52 : 44) * dt; a.x += dx / d * sp2; a.y += dy / d * sp2; a.facing = Math.atan2(dy, dx);
        } }));
      (H ? [4, 4] : [3, 3]).forEach((n, k) => f.afterKeep(2.6 + k * 6, () => {
        for (let i = 0; i < n; i++) { const home = broken.shift(); spawnWisp(home || snow.shift() || [0, 360], home || null); }
      }));
      // the healer still has work and the tank takes the pair as he rises
      f.afterKeep(6, later(gale), 'White Gale');
      f.afterKeep(H ? 10 : 12, later(hollowBreath), 'Hollow Breath');
      f.afterKeep(H ? 13.3 : 14.4, later(answer), 'Answering Cut');   // (the tank has nothing else in the wall until the pair as he rises; clear of the gale's raidwide)
      f.afterKeep(VIGIL - 5, later(() => drawCut()), 'Draw Cut');
      // (and what he does as he rises is laid now, so the feed reads across the wall into Act III)
      f.afterKeep(VIGIL + 3, later(cut), 'Sundering Cut');
      f.afterKeep(VIGIL + 14, later(gale), 'White Gale');
      f.afterKeep(VIGIL, () => {
        for (const w of wisps) if (f.adds.has(w.id)) reach(w);   // (any still on its way is with him as he rises)
        B.lockFacing = false;
        if (f.wall) f.wallDown();
      }, 'The Vigil Ends');
    };

    // --- the Last Vigil (the closing act) -------------------------------------------------------------------------------------
    // Health-gated, so every party meets it. He kneels once more, rises, and gives all three edges back to back: each stance is shown
    // as the last floor lands, so the party reads the next one with the last one's lines still on the ground.
    const whenFree = fn => {
      const tick = () => {
        if (f.state !== 'live') return;
        if (whet.busy || (B.cast && f.t < B.cast.end)) return f.afterKeep(0.4, tick);
        fn();
      };
      tick();
    };
    // (how long the three edges and their Cold Sheathe run, for the Sundering pair that follows them)
    const sentenceLen = (order, n) => {
      const run = st => st === 'crane' ? f.ct(3.4) + f.ct(1.4) : st === 'comet' ? f.ct(3.6) : f.ct(1.6) + n * (f.ct(0.85) + 0.08) + f.ct(1.5);
      return STANCE_T + 2 * f.ct(STANCE_T * 0.75) + order.reduce((m, st) => m + run(st) + 0.3, 0) + 0.2 + f.ct(3.4) + 0.3;
    };
    const threefold = (order = H ? f.shuffle(['crane', 'comet', 'parting']) : ['crane', 'comet', 'parting']) => {
      whet.busy = true; whet.n = MAX; whet.over = 0; sendWhet();
      // (the feed shows the three stances as plain Whetted Edges: their order is for the blade to tell)
      const runOf = st => st === 'crane' ? f.ct(3.4) + f.ct(1.4) : st === 'comet' ? f.ct(3.6) : f.ct(1.6) + f.alive().length * (f.ct(0.85) + 0.08) + f.ct(1.5);
      const lead1 = f.ct(STANCE_T * 0.75), o1 = STANCE_T + runOf(order[0]) + 0.3, o2 = o1 + lead1 + runOf(order[1]) + 0.3;
      f.afterKeep(0.05, () => {}, 'Whetted Edge'); f.afterKeep(o1, () => {}, 'Whetted Edge'); f.afterKeep(o2, () => {}, 'Whetted Edge');
      const go = i => {
        if (f.state !== 'live') { whet.busy = false; return; }
        if (i >= order.length) {
          const end = sheathe(0.2, true);
          f.afterKeep(end, () => { lastSt = order[order.length - 1]; whet.n = 0; whet.over = 0; whet.st = null; whet.busy = false; sendWhet(); });
          return;
        }
        const st = order[i], lead = i === 0 ? STANCE_T : f.ct(STANCE_T * 0.75);
        whet.st = st; sendWhet();
        f.cast('Whetted Edge', lead, 'stance', { st });
        f.afterKeep(lead, () => {
          if (f.state !== 'live') { whet.busy = false; return; }
          const run = st === 'crane' ? crane() : st === 'comet' ? comet(false) : parting();
          f.afterKeep(run + 0.3, () => go(i + 1));
        });
      };
      go(0);
    };
    const lastVigil = (order) => {
      const t0 = f.t;
      whenFree(() => {
        if (f.t - t0 > 0.3) slide(f.t - t0);   // (he was still finishing something: the rest of the script waits with him)
        B.lockFacing = true;
        f.cast('The Last Vigil', 2.6, 'kneel');
        f.emit({ t: 'propfx', k: 'cvlast', x: Math.round(B.x), y: Math.round(B.y) });
        hold(2.8);
        // (he rises with an Answering Cut for the tank, the one beat of its own in the sentence that follows, and the three edges begin as its bar ends)
        f.afterKeep(2.7, () => {
          B.lockFacing = false;
          if (f.tank()) { answer(); f.afterKeep((H ? f.ct(1.9) + f.ct(1.4) : f.ct(1.9)) + 0.3, () => threefold(order)); } else threefold(order);
        }, 'Answering Cut');
      });
    };

    // --- the closing dance ---------------------------------------------------------------------------------------------------
    // one Parting begun from each hero in turn (Hard: and the last one is run again, back the other way)
    const finalDance = () => {
      const ids = f.alive().map(p => p.id);
      if (!ids.length) return;
      let at = 0;
      const one = f.ct(1.6) + ids.length * f.ct(0.85) + f.ct(1.5) + 1.6;
      const run1 = f.ct(1.6) + ids.length * f.ct(0.85) + f.ct(1.5) + ids.length * 0.08;
      const mid = ids.length >= 3 ? Math.floor(ids.length / 2) - 1 : -1;   // (a Cold Sheathe fits between the halves of the dance: the healer is not left to the end)
      const pause = run1 + 0.15 + f.ct(3.4) + 0.3 - one;
      ids.forEach((_, k) => {
        const last = k === ids.length - 1;
        f.afterKeep(at, () => {
          if (f.state !== 'live') return;
          const now = f.alive().map(p => p.id), r = now.slice(k % now.length).concat(now.slice(0, k % now.length));
          const run = parting(r);
          if (H && last) f.afterKeep(run + 0.5, () => { if (f.state === 'live') parting(f.alive().map(p => p.id).reverse(), { name: 'Returning Parting' }); });
        }, 'Hundredfold Parting');
        if (k === mid) { sheathe(at + run1 + 0.15, true); at += pause; }
        at += one;
      });
      sheathe(H ? at - one + 2 * run1 + 1.2 : at, true);
    };

    // --- the acts ------------------------------------------------------------------------------------------------------------
    // Each step carries a last word, what it asks of whom (for the Hard draw below): P a Sundering pair (tank, then healer), D a Draw Cut at the
    // tank, L one at the healer, H a gale, G Still Water's glass, B Hollow Breath, C a Comet Draw with its line at the tank, k one with a line at anyone (Hard), c a plain one,
    // U an unleashing (the healer catches its Cold Sheathe), W a Sweep, X a Draw Cut at someone else, R an Answering Cut (the tank's light cut).
    const tankPair = [cut, 'Sundering Cut', 'P'];
    const rip = [answer, 'Answering Cut', 'R'];
    // (the pairs: two moves close enough that the second is read while the first is still being dodged)
    const tankDraw = () => drawCut(f.tank());      // a line through the tank: he steps off it without leaving his place
    const healerDraw = () => drawCut(healer());    // a line through the healer, inside Hollow Breath's circle
    // how long an unleashing runs from its first step (U: Rising Crane or Comet Draw, V: Hundredfold Parting, with its return on Hard, Q: Hard's Comet Volley)
    const ULEN = H ? { U: 11.4, V: 20, Q: 15.5 } : { U: 11.1, V: 13.1, Q: 11.1 };
    const EVT = { P: [[4.2, 3], [8.5, 3]], D: [[3, 1]], L: [[3, 2]], H: [[4.4, 2]], G: [[2.4, 1]], B: [[2, 2], [6.6, 2]], U: [[ULEN.U - 0.5, 2]], V: [[ULEN.V - 0.5, 2]], Q: [[ULEN.Q - 0.5, 2]], C: [[7, 1]], R: [[1.9, 1]] };   // [seconds in, 1 tank | 2 healer | 3 both]
    const CAST = { R: 3.3, P: 8.5, D: 3, X: 3, L: 3, H: 4.4, G: 2.4, B: 2, C: 7.2, k: 7.2, c: 3.6, W: 3.8 };   // (how long its casts keep the bar busy; an unleashing the script waits for)
    // the steps of a run of sets with the time each one begins (an unleashing pushes what follows it later, as scripted() does)
    const walk = (sets, fn) => {
      let t = 0, wait = 0;
      for (const set of sets) set.forEach(([dt, , , ev], i) => {
        t = Math.max(t + dt, wait);
        fn(t, ev || '', i === 0);
        if (ULEN[ev]) wait = t + ULEN[ev] + 1;
      });
    };
    const feel = (sets, pre = {}) => {
      const tk = [0, ...(pre.tk || [])], hl = [0, ...(pre.hl || [])];   // (pre: what the tank and the healer had just before the act began)
      walk(sets, (t, ev) => { for (const c of ev) for (const [o, w] of EVT[c] || []) { if (w & 1) tk.push(t + o); if (w & 2) hl.push(t + o); } });
      const gap = a => a.sort((x, y) => x - y).reduce((m, v, i, s) => (i ? Math.max(m, v - s[i - 1]) : m), 0);
      return [gap(tk), gap(hl)];
    };
    // a set never begins before the one before it has finished casting (the pairs inside one set overlap on purpose)
    const crowded = sets => {
      let busy = 0, bad = false;
      walk(sets, (t, ev, first) => { if (first && ev && t < busy - 0.01) bad = true; busy = Math.max(busy, t + (CAST[ev] || 0)); });
      return bad;
    };
    // Answering Cut and Sundering Cut share a look on the floor (the second buster within 9 s of a first reads as the Cracked Guard): no Sundering Cut within 9 s of an Answering Cut
    const lookClash = sets => {
      const r = [], p = [];
      walk(sets, (t, ev) => { if (ev.includes('R')) r.push(t + 1.9); if (ev.includes('P')) p.push(t + 4.2); });
      return r.some(a => p.some(b => b > a && b - a < 9.2));
    };
    const heavy = set => new Set(set.flatMap(([, , , ev]) => [...(ev || '')].filter(c => 'PGCkBUVQ'.includes(c))));
    // Hard draws the order of the sets between the fixed ones (the plan: fixed runs of sets and { mix: [sets], keep: [sets that stay in this order] }
    // runs to be put in an order), fresh each pull, evenly among the orders that are allowed: no two heavy moves of a kind (two Sundering pairs, two
    // glasses, two Breaths...) side by side, no cast bar cut, and neither the tank nor the healer waits more than limit s (31; Act III, where a Hundredfold Parting
    // with its return runs 20 s, 33: below that some orders of its three edges have no arrangement at all). (Every act has several; the
    // written order is only the fallback if a draw of thousands finds none, and f.mixInfo says how many it took.)
    const mix = (plan, pre, limit = 31, tlimit = limit) => {
      const flat = pick => plan.flatMap(x => (Array.isArray(x) ? x : pick(x.mix)));
      if (!f.hard) return flat(m => m);
      const keep = plan.flatMap(x => x.keep || []);
      for (let k = 1; k <= 4000; k++) {
        const seq = flat(m => f.shuffle(m));
        const at = keep.map(x => seq.indexOf(x));
        if (at.some((v, i) => i && v < at[i - 1])) continue;
        let ok = true;
        for (let i = 1; i < seq.length && ok; i++) { const h = heavy(seq[i - 1]); for (const c of heavy(seq[i])) if (h.has(c)) ok = false; }
        if (!ok || crowded(seq) || lookClash(seq)) continue;
        const [tg, hg] = feel(seq, pre);
        if (tg > tlimit || hg > limit) continue;
        f.mixInfo = (f.mixInfo || []).concat([k]);
        return seq;
      }
      f.mixInfo = (f.mixInfo || []).concat([-1]);
      return flat(m => m);
    };
    // I. The Pass (Hard draws the order of the middle sets)
    const pass = from => {
      const head = [S([4, gale, 'White Gale', 'H'])];
      const tail = [S([5.5, scripted('crane'), 'Whetted Edge', 'U'])];
      const mid = [
        S([8, ...tankPair]),
        S([10, () => drawCut(), 'Draw Cut', 'X'], [8, () => sweep(), 'Scabbard Sweep', 'W'], [4.5, ...rip]),
        S([3.5, gale, 'White Gale', 'H'], [6, tankDraw, 'Draw Cut', 'D'], [6, () => drawCut(), 'Draw Cut', 'X'], [4, ...rip]),
        S([6, () => sweep(), 'Scabbard Sweep', 'W'], [4.2, gale, 'White Gale', 'H'], [6, tankDraw, 'Draw Cut', 'D']),
        S([8, ...tankPair]),
        S([12, () => drawCut(), 'Draw Cut', 'X'], [0.8, () => sweep(), 'Scabbard Sweep', 'W'], [8, tankDraw, 'Draw Cut', 'D']),
        S([11, gale, 'White Gale', 'H'], [6, tankDraw, 'Draw Cut', 'D']),
        S([10, ...tankPair]),
        S([8.6, ...rip], [3.4, gale, 'White Gale', 'H']),
      ];
      return f.course({
        until: 0.72, onStart: () => { act = 1; },
        sets: mix([head, { mix: mid }, tail], {}, 31, 24),
        closing: [[10, gale, 'White Gale'], [10, cut, 'Sundering Cut'], [12, () => drawCut(), 'Draw Cut']],
        next: shrine,
      }, from);
    };

    // II. The Shrine (its gate is the Vigil's wall)
    const shrine = from => {
      const head = [S([12, stillWater, 'Still Water', 'G'])];
      const mid = [
        S([12, ...tankPair]),
        S([12, () => cometDraw('tank'), 'Comet Draw', 'C']),
        S([10, hollowBreath, 'Hollow Breath', 'B'], [H ? 4 + Math.round(f.rng() * 4) : 6, healerDraw, 'Draw Cut', 'L'], [3.4, ...rip]),
        S([6.9, ...tankPair]),
        S([9, stillWater, 'Still Water', 'G'], [3.4, tankDraw, 'Draw Cut', 'D']),
        S([8, ...rip], [3.4, gale, 'White Gale', 'H']),
        S([11, () => drawCut(), 'Draw Cut', 'X'], [0.8, () => sweep(), 'Scabbard Sweep', 'W'], [7, ...tankPair]),
        S([11, H ? () => cometDraw('any') : () => comet(false), 'Comet Draw', H ? 'k' : 'c'], [7.4, ...rip]),
        S([3.4, hollowBreath, 'Hollow Breath', 'B'], [6, tankDraw, 'Draw Cut', 'D']),
        S([10, gale, 'White Gale', 'H'], [5, tankDraw, 'Draw Cut', 'D']),
      ];
      const anchor = [S([6, scripted('comet'), 'Whetted Edge', 'U'])];
      const late = [
        S([13, stillWater, 'Still Water', 'G'], [3.4, tankDraw, 'Draw Cut', 'D']),
        S([11, ...tankPair], [5.5, gale, 'White Gale', 'H']),
      ];
      return f.course({
        until: 0.42, onStart: () => { act = 2; },
        wall: { label: 'The Vigil', run: vigil, until: 'resolved', timeout: VIGIL + 8 },
        sets: mix([head, { mix: mid }, anchor, { mix: late }], { hl: [10.5] }, 31, 24),
        closing: [[10, gale, 'White Gale'], [10, cut, 'Sundering Cut'], [12, stillWater, 'Still Water']],
        next: edge,
      }, from);
    };

    // III. The Whetted Edge: the three unleashings on the script (Hard draws their order, and the order of the sets between them)
    const edge = from => {
      const order = H ? f.shuffle(['crane', 'comet', 'parting']) : ['crane', 'comet', 'parting'];
      const uv = i => (order[i] === 'parting' ? 'V' : H && order[i] === 'comet' ? 'Q' : 'U');   // (which kind of unleashing the script lays third, for the Hard draw)
      const s1 = [S([19, twinDraw, 'Draw Cut', 'X'], H ? [5.4, tankDraw, 'Draw Cut', 'D'] : [4.6, ...rip], [H ? 6 : 3.4, scripted(order[0]), 'Whetted Edge', uv(0)])];   // (Hard: and a line at the tank before the first edge)
      const a = [
        S([14, stillWater, 'Still Water', 'G'], [3.4, () => sweep(), 'Scabbard Sweep', 'W']),   // the glass, and half of what is left taken from under it
        S([10, ...tankPair]),
        S([12, () => drawCut(), 'Draw Cut', 'X'], [0.8, () => sweep(), 'Scabbard Sweep', 'W'], [4.5, ...rip]),
      ];
      const s5 = [S([3.4, scripted(order[1]), 'Whetted Edge', uv(1)])];   // (3.4: the Answering Cut at the end of the set before it, where the 9 s was)
      const b = [
        S([12, hollowBreath, 'Hollow Breath', 'B'], [2.4, tankDraw, 'Draw Cut', 'D'], [3.2, healerDraw, 'Draw Cut', 'L'], [3.4, ...rip]),   // (a line at the tank, then one at the healer, inside the breath, then the tank's cut)
        S([6.9, ...tankPair], [5.5, gale, 'White Gale', 'H'], [9.4, ...rip]),
      ];
      const s8 = [S([3.4, scripted(order[2]), 'Whetted Edge', uv(2)])];
      const s9 = [S([14, ...tankPair])];
      return f.course({
        until: 0.16, onStart: () => { act = 3; B.lockFacing = false; },
        sets: mix([s1, { mix: [...a, ...s5, ...b, ...s8], keep: [s5[0], s8[0]] }, s9], { tk: [7.2, 11.5], hl: [7.2, 11.5, 18.4] }, 33, 29),   // (the Vigil's own Sundering pair and gale are just ahead)
        closing: [[12, gale, 'White Gale'], [10, cut, 'Sundering Cut'], [12, twinDraw, 'Draw Cut']],
        ramp: 0.08,
        next: finale,
      }, from);
    };

    // IV. The Last Vigil: all three edges, then a Parting from each hero in turn
    const finale = from => {
      const order = H ? f.shuffle(['crane', 'comet', 'parting']) : ['crane', 'comet', 'parting'];   // (drawn here so the pair that follows the three edges can be laid right behind them)
      const afterEdges = 2.7 + (H ? f.ct(1.9) + f.ct(1.4) : f.ct(1.9)) + 0.3 + sentenceLen(order, 4) + 0.3;   // (from the Last Vigil's step: the kneel, the Answering Cut as he rises, then the edges and the Cold Sheathe)
      return f.course({
        onStart: () => { act = 3; B.lockFacing = false; },
        sets: [
          S([3, () => lastVigil(order), 'The Last Vigil']),
          S([afterEdges, ...tankPair]),
          S([10, finalDance, 'Hundredfold Parting']),
        ],
        closing: [[44, gale, 'White Gale'], [9, cut, 'Sundering Cut'], [12, twinDraw, 'Draw Cut']],   // (the first waits out the dance)
        ramp: 0.08,
      }, from);
    };

    pass(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.parting())
    f.moves = { gale, cut, answer, drawCut, tankDraw, healerDraw, twinDraw, sweep, stillWater, hollowBreath, sheathe, crane, comet, cometDraw, parting, unleash, scripted, vigil, lastVigil, threefold, finalDance, notch };
  },
};

if (typeof module !== 'undefined') module.exports = { CORVANE };
