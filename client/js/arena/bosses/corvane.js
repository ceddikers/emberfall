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
// No push: an act ends at the next set seam after its gate. Every telegraph shows on every difficulty. Hard: casts 15% faster, 42%
// more damage (against base numbers set for the old, longer fight), a smaller health bar and an earlier enrage, and:
//   Overwhet:          notches landed while he unleashes are kept; one left over fires a second unleashing a breath after.
//   False Stance:      halfway through a wind-up he changes stance; the floor is only painted for the stance he ends on. Never on the
//                      second unleashing of an Overwhet pair, and never two in a row.
//   Returning Parting: the dance runs again, back the other way, through where everyone has moved to (also at the end of the Last Vigil).
//   Comet Volley:      Comet Draw becomes three dashes, each at the hero farthest from where the last one ended.
// Hard also draws which six of eight lanterns stand, the order of Act III's unleashings, the order of the closing three edges and when
// Hollow Breath comes, fresh each pull.

const CORVANE = {
  id: 'corvane', name: 'Corvane', title: 'the Unburied Blade',
  hp: { normal: 5700000, hard: 5450000 },
  hardDmg: 1.42,   // (Hard's damage multiplier; fight.js default 1.25: held up to keep the clear rate when Hard's health was cut for enrage slack)
  autoDmg: { normal: 2200, hard: 2050 },
  enrage: { normal: 590, hard: 580 },   // the cast starts here and lands 8 s later (9:58 / 9:48: a minute after the script's end, 45 s on Hard)
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
      gale: H ? 9400 : 14800, cut: H ? 19500 : 22000, guard: H ? 18000 : 20500, draw: H ? 19400 : 23800, sweep: H ? 20200 : 24600,
      still: H ? 9600 : 9200, breath: H ? 2900 : 3000, crane: H ? 24800 : 28600, comet: H ? 19500 : 26000, part: H ? 22600 : 26400,
      sheathe: H ? 9000 : 16200, wispHp: 26000, last: H ? 15400 : 17800,
    };
    const S = (...steps) => steps.filter(Boolean);
    const live = id => f.alive().find(p => p.id === id);
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    const healer = () => f.alive().find(p => p.role === 'healer') || nonTank();
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
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
    f.onAvoidable = (p) => {
      if (f.wall || f.state !== 'live' || f.cleanRun) return;   // (cleanRun: tools/check.js's timeline, whose dummies take every hit)
      if (f.t - (lastNotch[p.id] ?? -9) < 1.5) return;
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
    // Draw Cut: a long line through a hero, drawn a moment before the blade is
    const drawCut = (target) => {
      target = target || nonTank(); if (!target) return;
      const d = f.ct(3.0);
      f.cast('Draw Cut', d, 'draw');
      f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(target.y - B.y, target.x - B.x), len: 1300, w: 110 }, delay: d, dmg: dmg.draw,
        aimFromBoss: target.id, lockAt: 0.5, tag: 'cvDraw' });
      hold(d);
    };
    // two at once, at two different heroes (Act III)
    const twinDraw = () => {
      const pool = f.shuffle(f.nonTanks().length > 1 ? f.nonTanks() : f.alive());
      const d = f.ct(3.4);
      f.cast('Draw Cut', d, 'draw');
      for (const p of pool.slice(0, 2)) f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(p.y - B.y, p.x - B.x), len: 1300, w: 110 }, delay: d, dmg: dmg.draw, aimFromBoss: p.id, lockAt: 0.5, tag: 'cvDraw' });
      hold(d);
    };
    // Scabbard Sweep: half the room on the side the scabbard points to
    const sweep = (side) => {
      side = side || (f.rng() < 0.5 ? -1 : 1);
      const d = f.ct(3.8);
      B.lockFacing = true;
      f.cast('Scabbard Sweep', d, side < 0 ? 'sweepL' : 'sweepR');
      f.aoe({ kind: 'cone', x: B.x, y: B.y, r: 1500, arc: Math.PI, angle: B.facing + side * Math.PI / 2 }, d, dmg.sweep, { tag: 'cvSweep' });
      hold(d);
      f.afterKeep(d + 0.1, () => { B.lockFacing = false; });
    };
    // Still Water: he plants in a parry stance; the floor in front of him is glassy, and anyone standing on it is countered
    const stillWater = () => {
      const d = f.ct(2.4), dur = 7;
      B.lockFacing = true;
      f.cast('Still Water', d, 'still');
      const ang = B.facing;
      f.zone({ shape: { kind: 'cone', x: Math.round(B.x), y: Math.round(B.y), r: 760, arc: 2.2, angle: +ang.toFixed(3) }, dur, delay: d, effect: 'burn', dmg: dmg.still, tag: 'cvStill' });
      B.noAutoUntil = f.t + d + dur;
      hold(d + dur);
      f.afterKeep(d + dur, () => { B.lockFacing = false; });
    };
    // Hollow Breath: a cold circle that follows the healer and bites anyone else in it, five breaths
    const hollowBreath = () => {
      const h = healer(); if (!h) return;
      f.cast('Hollow Breath', f.ct(2), 'breath');
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
      const a = tgt ? Math.atan2(tgt.y - B.y, tgt.x - B.x) : B.facing, turn = (f.rng() < 0.5 ? -1 : 1) * Math.PI / 4;
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
      if (f.def.enrage && f.t > f.def.enrage[f.mode] - 25) return;
      const len = unleash(choose());
      slide(len + 1);
    });
    // an act's own unleashing: the gauge fills itself, then he unleashes (on the script: nothing slides)
    const scripted = st => () => {
      if (whet.busy) return;
      whet.n = MAX; sendWhet();
      unleash(st || choose());
    };

    // --- the Vigil (the wall) ------------------------------------------------------------------------------------------------
    // he kneels; two waves of wisps drift in from the lanterns (and from the snow where none stand), and each one that reaches him
    // adds a notch. The last wisp is with him by about twenty seconds in, and he rises: the wall falls at a fixed time.
    const VIGIL = 22;
    const vigil = () => {
      B.lockFacing = true; B.moveTo = { x: 0, y: -80, speed: 420 };
      f.clearZones();   // (a Still Water caught by the gate lets go: the glass was laid for another place in the room)
      f.cast('The Vigil', 2.4, 'kneel');
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
      f.afterKeep(6, gale, 'White Gale');
      f.afterKeep(H ? 10 : 12, hollowBreath, 'Hollow Breath');
      f.afterKeep(VIGIL - 5, () => drawCut(), 'Draw Cut');
      // (and what he does as he rises is laid now, so the feed reads across the wall into Act III)
      f.afterKeep(VIGIL + 3, cut, 'Sundering Cut');
      f.afterKeep(VIGIL + 14, gale, 'White Gale');
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
    const threefold = () => {
      whet.busy = true; whet.n = MAX; whet.over = 0; sendWhet();
      const order = H ? f.shuffle(['crane', 'comet', 'parting']) : ['crane', 'comet', 'parting'];
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
    const lastVigil = () => {
      const t0 = f.t;
      whenFree(() => {
        if (f.t - t0 > 0.3) slide(f.t - t0);   // (he was still finishing something: the rest of the script waits with him)
        B.lockFacing = true;
        f.cast('The Last Vigil', 2.6, 'kneel');
        f.emit({ t: 'propfx', k: 'cvlast', x: Math.round(B.x), y: Math.round(B.y) });
        hold(2.8);
        f.afterKeep(2.7, () => { B.lockFacing = false; threefold(); });
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
      ids.forEach((_, k) => {
        const last = k === ids.length - 1;
        f.afterKeep(at, () => {
          if (f.state !== 'live') return;
          const now = f.alive().map(p => p.id), r = now.slice(k % now.length).concat(now.slice(0, k % now.length));
          const run = parting(r);
          if (H && last) f.afterKeep(run + 0.5, () => { if (f.state === 'live') parting(f.alive().map(p => p.id).reverse(), { name: 'Returning Parting' }); });
        }, 'Hundredfold Parting');
        at += one;
      });
      sheathe(H ? at - one + 2 * run1 + 1.2 : at, true);
    };

    // --- the acts ------------------------------------------------------------------------------------------------------------
    const tankPair = [cut, 'Sundering Cut'];
    // (the pairs: two moves close enough that the second is read while the first is still being dodged)
    const tankDraw = () => drawCut(f.tank());      // a line through the tank: he steps off it without leaving his place
    const healerDraw = () => drawCut(healer());    // a line through the healer, inside Hollow Breath's circle
    // I. The Pass
    const pass = from => f.course({
      until: 0.72, onStart: () => { act = 1; },
      sets: [
        S([4, gale, 'White Gale']),
        S([10, () => drawCut(), 'Draw Cut'], [8, () => sweep(), 'Scabbard Sweep']),
        S([10, ...tankPair]),
        S([11, tankDraw, 'Draw Cut'], [6, () => drawCut(), 'Draw Cut'], [5, gale, 'White Gale']),
        S([10, () => sweep(), 'Scabbard Sweep'], [6, tankDraw, 'Draw Cut'], [6, gale, 'White Gale']),
        S([8, ...tankPair]),
        S([12, () => drawCut(), 'Draw Cut'], [0.8, () => sweep(), 'Scabbard Sweep'], [8, tankDraw, 'Draw Cut']),
        S([11, gale, 'White Gale'], [6, tankDraw, 'Draw Cut']),
        S([8, scripted('crane'), 'Whetted Edge']),
        S([12, ...tankPair]),
      ],
      closing: [[10, gale, 'White Gale'], [10, cut, 'Sundering Cut'], [12, () => drawCut(), 'Draw Cut']],
      next: shrine,
    }, from);

    // II. The Shrine (its gate is the Vigil's wall)
    const shrine = from => f.course({
      until: 0.42, onStart: () => { act = 2; },
      wall: { label: 'The Vigil', run: vigil, until: 'resolved', timeout: VIGIL + 8 },
      sets: [
        S([4, stillWater, 'Still Water']),
        S([12, ...tankPair]),
        S([12, () => comet(false), 'Comet Draw'], [5, tankDraw, 'Draw Cut']),
        S([10, hollowBreath, 'Hollow Breath'], [H ? 4 + Math.round(f.rng() * 4) : 6, healerDraw, 'Draw Cut']),
        S([9, ...tankPair]),
        S([9, gale, 'White Gale']),
        S([10, stillWater, 'Still Water'], [3.4, tankDraw, 'Draw Cut']),
        S([11, () => drawCut(), 'Draw Cut'], [0.8, () => sweep(), 'Scabbard Sweep'], [7, ...tankPair]),
        S([11, () => comet(false), 'Comet Draw']),
        S([10, hollowBreath, 'Hollow Breath'], [6, tankDraw, 'Draw Cut']),
        S([10, gale, 'White Gale'], [5, tankDraw, 'Draw Cut']),
        S([6, scripted('comet'), 'Whetted Edge']),
        S([13, stillWater, 'Still Water'], [3.4, tankDraw, 'Draw Cut']),
        S([11, ...tankPair], [5.5, gale, 'White Gale']),
      ],
      closing: [[10, gale, 'White Gale'], [10, cut, 'Sundering Cut'], [12, stillWater, 'Still Water']],
      next: edge,
    }, from);

    // III. The Whetted Edge: the three unleashings on the script (Hard draws their order), the pairs between them
    const edge = from => {
      const order = H ? f.shuffle(['crane', 'comet', 'parting']) : ['crane', 'comet', 'parting'];
      return f.course({
        until: 0.16, onStart: () => { act = 3; B.lockFacing = false; },
        sets: [
          S([16, twinDraw, 'Draw Cut'], [8, scripted(order[0]), 'Whetted Edge']),
          S([14, stillWater, 'Still Water'], [3.4, tankDraw, 'Draw Cut']),
          S([10, ...tankPair]),
          S([12, () => drawCut(), 'Draw Cut'], [0.8, () => sweep(), 'Scabbard Sweep'], [7.5, tankDraw, 'Draw Cut']),
          S([9, scripted(order[1]), 'Whetted Edge']),
          S([12, hollowBreath, 'Hollow Breath'], [6, healerDraw, 'Draw Cut']),
          S([10, ...tankPair], [5.5, gale, 'White Gale']),
          S([12, scripted(order[2]), 'Whetted Edge']),
          S([18, ...tankPair]),
        ],
        closing: [[12, gale, 'White Gale'], [10, cut, 'Sundering Cut'], [12, twinDraw, 'Draw Cut']],
        ramp: 0.08,
        next: finale,
      }, from);
    };

    // IV. The Last Vigil: all three edges, then a Parting from each hero in turn
    const finale = from => f.course({
      onStart: () => { act = 3; B.lockFacing = false; },
      sets: [
        S([3, lastVigil, 'The Last Vigil']),
        S([27, ...tankPair]),
        S([10, finalDance, 'Hundredfold Parting']),
      ],
      closing: [[44, gale, 'White Gale'], [9, cut, 'Sundering Cut'], [12, twinDraw, 'Draw Cut']],   // (the first waits out the dance)
      ramp: 0.08,
    }, from);

    pass(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.parting())
    f.moves = { gale, cut, drawCut, tankDraw, healerDraw, twinDraw, sweep, stillWater, hollowBreath, sheathe, crane, comet, parting, unleash, scripted, vigil, lastVigil, threefold, finalDance, notch };
  },
};

if (typeof module !== 'undefined') module.exports = { CORVANE };
