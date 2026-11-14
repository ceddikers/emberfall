// Boss XIII: Garrow, the Moon's Hound — "The Long Mere". The first boss of Season 2 (the Silver Road, docs/plans/2026-11-season-2-design.md).
// The Moon's hound has come down her road ahead of her household, and it hunts by track: the fresh snow on the lake keeps every step
// anyone takes. The question is always: where have I walked?
//   THE TRAIL: every hero's last steps lie on the snow as footprints (the last 8 s; the script keeps them, the clients draw their own from
//     the positions they already have). Anything of his that moves goes where a trail goes, never along a line of his own.
//     On the Scent: he lowers his head at one hero (a `prey` head mark). 1.5 s before the cast ends that hero's trail of the last 6 s
//     locks, the whole corridor is painted, and he runs it from its oldest step to its newest and pounces where it ends. He hunts what
//     runs: the shorter the trail, the wider the pounce (a hero who never moved is simply fallen on, POUNCE_R). So the scented hero
//     writes a long, clean line away from everyone, then steps off its end.
//   Act I, First Snow (100% -> 76%): On the Scent, Throat Snap (the tank's cone), Howl (raidwide), Rime (two spread circles that leave
//     slick mist behind).
//   Act II, The Pack (76% -> 52%): Mist-Hounds (lesser hounds that each walk one hero's trail, a little slower than a hero, and bite
//     when they catch up; two that meet go out together, so two followed heroes run through each other), Circle the Prey (he trots a
//     ring round the party along his own track and the track bursts; inside it and outside it are both safe).
//   Whiteout (52%): Snowdrift wipes every track, he goes into the white and runs the Long Chase: three hunts in a row on three heroes,
//     each starting from clean snow. A Howl closes it.
//   Act III, Hard Frost (52% -> 26%): his runs throw up a ridge of ice along the corridor for 18 s, a wall heroes and mist-hounds cannot
//     cross. Snowdrift comes back as a single beat.
//   Act IV, Last Light (26% -> dead): the snow stops falling and tracks stop fading: the Whole Trail runs up to 14 s of a hero's steps.
//     Mist-hounds in threes. The enrage is Cold Trail.
// Every telegraph shows on every difficulty. Hard: casts 15% faster, harder hits, ridges from Act II, and:
//   Crossed Trails: where the trail he is running crosses a fresher one he turns onto it (the real route is painted in full at the lock).
//   Double Scent:   two heroes marked 1 and 2, run one after the other; if the two corridors touch he does not stop between them.
//   Doubling Back:  he runs the trail and then runs it back.
//   Buried Scent:   a flurry lands in the middle of the cast, so the trail he takes is only what was walked after it.
// Hard draws one of three orders for the middle sets of Acts I, II and III per pull (f.dance); Normal and Extreme run the first.
// Extreme (f.extreme), three rules of his own:
//   Blood on the Snow: a hero caught by anything avoidable leaves red prints for 10 s, and at a crossing he takes red over fresh.
//   The Second Hound:  a shade of him hunts a second hero at the same moment (two corridors and two pounces at once).
//   Stillness:         two heroes who are not the scented one carry `still` through a hunt: every step either takes while it lasts
//                      bursts when the trail locks, so the scented hero writes a line that asks neither of them to move.
// ROOM EVENTS (f.emit({ t: 'roomev', k, dur, ... }); the room and the staging (garrow-room.js, garrow-fx.js, walls/garrow.js) draw from them; none changes a move):
//   gwpath:<n> { l, w, sp, at, who, kd, dur }   a laid run (the lit corridor);  gwring { x, y, r, a0, dir, dur }   Circle the Prey;  gwdrift { dur }   Snowdrift's flurry (the one of the Whiteout also carries wo: 1);
//   gwwipe { dur: 1 }   the snow takes every track;  gwfrost { dur: 4 }   Act III begins;  gwlast { dur: 9999 }   Act IV begins.
// MOMENTS (the Whiteout, a showpiece; nothing is added to the floor by these, they only say when):
//   THE WHITEOUT: Snowdrift (gwdrift { dur: cast + 1, wo: 1 }) -> the wipe (gwwipe, as the cast ends) -> gwhold { dur: 1.2 }, THE CALM AFTER THE WIPE (the same instant, no cast and nothing laid
//     on the floor for its length) -> gwchase { dur: the whole chase (three hunts and their tail), hunts: 3 } as The Long Chase begins (he goes into the mist) -> gwchaseend { dur: 1.6 }
//     as it ends (the last mist: he is back at his place, the Howl's cast follows at once). Act III's single Snowdrift sends gwdrift and gwwipe only (no wo, no gwhold).

const GARROW = {
  id: 'garrow', name: 'Garrow', title: "the Moon's Hound",
  // Tuned 2026-11-11 at GEAR=post5 / post6 / post7, the standard line-up, 24 pulls a sample (Hard and Extreme on seeds 1000 and 5000):
  //   HUMAN=dps: Normal 23 of 24, Hard 27 of 48, Extreme 8 of 48; perfect bots: Normal 24 of 24, Hard 23 of 24, Extreme 19 of 24.
  //   A human-like party kills at about 9:10 on Normal and 9:40 on Hard.
  //   2026-11-13: post6 and post7 became the whole set's gear (all four bosses' tiers; bot-gear.js), no longer Garrow's tier alone, so Hard's damage went 1.85 -> 1.80 and Extreme's 1.85 -> 1.96
  //   to bring the old rates back (48 pulls, seeds 1 and 2): HUMAN=dps Hard 29 of 48 and Extreme 16 of 48; perfect bots Hard 40 and Extreme 36. The new gear alone gave 20 / 18 and 19 / 44.
  hp: { normal: 8600000, hard: 9100000, extreme: 10300000 },
  normalDmg: 1.06, hardDmg: 1.80, extremeDmg: 1.96,
  autoDmg: { normal: 2700, hard: 2700, extreme: 2700 },
  enrage: { normal: 600, hard: 620, extreme: 620 },   // the cast starts here and lands 8 s later
  enrageName: 'Cold Trail',
  vuln: 0.5,
  spawn: { x: 0, y: -120 },
  arena: { theme: 'mere' },
  gates: [{ f: 0.76, push: 1 }, { f: 0.52, push: 1 }, { f: 0.26, push: 1 }],

  script(f) {
    const H = f.hard, X = f.extreme, B = f.boss, TAU = Math.PI * 2;
    const dmg = {
      howl: H ? 12200 : 15200, snap: H ? 30500 : 35000, run: H ? 19500 : 22500, pounce: H ? 21500 : 25000,
      rime: H ? 13500 : 16000, bite: H ? 4600 : 5400, ring: H ? 20000 : 23500,
      still: H ? 15000 : 17500, chaseHowl: H ? 13000 : 16000,
    };
    // (Hard closes every calm between sets by a sixteenth: the moves are the same, they come sooner)
    const S = (...steps) => { const st = steps.filter(Boolean); return H && st.length ? [[st[0][0] * 0.94, ...st[0].slice(1)], ...st.slice(1)] : st; };
    const live = id => f.alive().find(p => p.id === id);
    const rd = n => Math.round(n);
    const HOME = { x: 0, y: -120 };
    B.holdUntil = 1e9;   // (he never walks a line of his own: he stands where a hunt left him, and comes back out of the mist to where he stood)

    // --- the trail ----------------------------------------------------------------------------------------------------------
    const STEP = 0.15, KEEP = 30, SHOW = 8, SPAN = 6, WHOLE = 14, LOCK = 1.5, SPEED = 820;
    const hist = new Map();        // hero id -> [{ x, y, t, red }], oldest first
    const bloodEnd = new Map(), seenAvoid = new Map();   // (Extreme, Blood on the Snow)
    let wipedAt = -1, lastAct = null, acc = 0, stare = null, ridgeOn = false, busyUntil = 0, pathN = 0, chasing = false, lastPrey = null;
    const ridges = [];
    const bloody = id => X && bloodEnd.get(id) > f.t;
    f.ticker(dt => {
      if (stare != null) { const p = live(stare); if (p) B.facing = Math.atan2(p.y - B.y, p.x - B.x); }
      for (let i = ridges.length - 1; i >= 0; i--) if (ridges[i].end <= f.t) { f.removeProp(ridges[i].pr); ridges.splice(i, 1); }
      acc += dt; if (acc < STEP) return;
      acc = 0;
      for (const p of f.alive()) {
        let h = hist.get(p.id); if (!h) hist.set(p.id, h = []);
        const l = h[h.length - 1];
        if (!l || Math.hypot(p.x - l.x, p.y - l.y) >= 12) h.push({ x: p.x, y: p.y, t: f.t, red: bloody(p.id) });
        while (h.length && h[0].t < f.t - KEEP) h.shift();
        if (X) {
          const av = f.stats[p.id] ? f.stats[p.id].avoidable : 0;
          if (av > (seenAvoid.get(p.id) || 0)) { bloodEnd.set(p.id, f.t + 10); f.mark(p.id, { sym: 'dot', col: '#ff4a4a', dur: 10, key: 'gwblood' }); }
          seenAvoid.set(p.id, av);
        }
      }
    });
    // a hero's steps of the last `span` s (nothing from before the last Snowdrift), ending where they stand now
    const trail = (pid, span) => {
      const from = Math.max(f.t - span, wipedAt), out = [];
      for (const q of hist.get(pid) || []) if (q.t >= from) out.push(q);
      const p = live(pid);
      if (p) { const l = out[out.length - 1]; if (!l || Math.hypot(p.x - l.x, p.y - l.y) > 4) out.push({ x: p.x, y: p.y, t: f.t, red: bloody(pid) }); }
      return out;
    };
    const lenOf = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return L; };
    // a wandering line of steps as a few straight stretches (no point of the walked line is more than `tol` off them)
    const simplify = (pts, tol = 16) => {
      if (pts.length < 3) return pts.slice();
      const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
      const stack = [[0, pts.length - 1]];
      while (stack.length) {
        const [a, b] = stack.pop(), ax = pts[a].x, ay = pts[a].y, dx = pts[b].x - ax, dy = pts[b].y - ay, l2 = dx * dx + dy * dy;
        let far = -1, fd = tol;
        for (let i = a + 1; i < b; i++) {
          const u = l2 ? Math.max(0, Math.min(1, ((pts[i].x - ax) * dx + (pts[i].y - ay) * dy) / l2)) : 0, d = Math.hypot(pts[i].x - ax - dx * u, pts[i].y - ay - dy * u);
          if (d > fd) { fd = d; far = i; }
        }
        if (far > 0) { keep[far] = true; stack.push([a, far], [far, b]); }
      }
      return pts.filter((_, i) => keep[i]);
    };
    // where two stretches cross (not at the very ends of the first)
    const crossAt = (a, b, c, d) => {
      const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx;
      if (Math.abs(den) < 1e-6) return null;
      const u = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, v = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
      return u > 0.03 && u < 0.97 && v >= 0 && v <= 1 ? { x: a.x + rx * u, y: a.y + ry * u, u } : null;
    };
    // Crossed Trails (Hard): at the first place the trail he is on crosses a fresher one (Extreme: a red one over one that is not), he turns
    // onto it and runs it to where its hero stands. One turn a hunt.
    const turnOnto = (P, pid) => {
      for (let i = 0; i + 1 < P.length; i++) {
        let best = null;
        for (const q of f.alive()) {
          if (q.id === pid) continue;
          const Q = trail(q.id, SHOW);
          for (let j = 0; j + 1 < Q.length; j++) {
            const c = crossAt(P[i], P[i + 1], Q[j], Q[j + 1]); if (!c) continue;
            const red = X && Q[j].red && !P[i].red, fresher = Q[j].t > P[i].t + 0.4 && !(X && P[i].red && !Q[j].red);
            if ((red || fresher) && (!best || c.u < best.c.u)) best = { c, Q, j, who: q.id };
          }
        }
        if (best) return { pts: [...P.slice(0, i + 1), { x: best.c.x, y: best.c.y, t: P[i].t }, ...best.Q.slice(best.j + 1)], who: best.who, turned: true };
      }
      return { pts: P, who: pid, turned: false };
    };
    // lay a run along a line of steps: red pieces that land as he reaches them. o: { delay, w, speed, tag, dmg, who, kind }
    const layRun = (raw, o) => {
      const pts = simplify(raw).map(q => [q.x, q.y]), along = [0], group = new Set();
      for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = along[along.length - 1];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], sl = along[i] - along[i - 1], ang = Math.atan2(by - ay, bx - ax);
        if (sl < 6) continue;
        for (let u0 = 0; u0 < sl - 1;) {
          const u = Math.min(sl, u0 + 280);
          f.aoe({ kind: 'rect', x: rd(ax + Math.cos(ang) * u0), y: rd(ay + Math.sin(ang) * u0), angle: +ang.toFixed(3), len: rd(u - u0), w: o.w }, o.delay + (along[i - 1] + u) / o.speed, dmg[o.dmg], { tag: o.tag, group });
          u0 = u;
        }
        // (the corner between two stretches is his too)
        if (i < pts.length - 1) f.aoe({ kind: 'circle', x: rd(bx), y: rd(by), r: rd(o.w / 2) }, o.delay + along[i] / o.speed, dmg[o.dmg], { tag: o.tag, group });
      }
      f.emit({ t: 'roomev', k: 'gwpath:' + (++pathN), l: pts.map(([x, y]) => [rd(x), rd(y)]), w: o.w, sp: o.speed, at: +o.delay.toFixed(2), who: o.who ?? null, kd: o.kind || 'run',
        dur: +(o.delay + L / o.speed + 0.6).toFixed(2) });
      return { pts, L, end: o.delay + L / o.speed };
    };
    // Hard Frost: a ridge of ice stands along each long stretch he ran, for 18 s (a gap is left at every corner, so nobody is sealed in)
    const raise = (pts, at) => f.afterKeep(at, () => {
      if (f.state !== 'live') return;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], sl = Math.hypot(bx - ax, by - ay);
        if (sl < 130) continue;
        const pr = f.addProp({ kind: 'ridge', shape: 'rect', x: rd((ax + bx) / 2), y: rd((ay + by) / 2), w: rd(sl - 64), h: 34, a: +Math.atan2(by - ay, bx - ax).toFixed(3), hp: 0, solid: true, cover: false, rubble: false });
        ridges.push({ pr, end: f.t + 18 });
      }
    });
    const clearRidges = () => { for (const r of ridges) f.removeProp(r.pr); ridges.length = 0; };
    // he runs a laid line (untargetable while he does)
    const runBoss = (pts, speed, done) => {
      if (f.state !== 'live') return;
      B.x = pts[0][0]; B.y = pts[0][1]; B.untargetable = true; B.lockFacing = true;
      let i = 1;
      const next = () => {
        if (f.state !== 'live') return;
        if (i >= pts.length) { if (done) done(); return; }
        const [x, y] = pts[i++];
        if (Math.hypot(x - B.x, y - B.y) > 1) B.facing = Math.atan2(y - B.y, x - B.x);
        B.moveTo = { x, y, speed, done: next };
      };
      next();
    };
    const mistTo = (x, y) => {
      f.emit({ t: 'propfx', k: 'gwmist', x: rd(B.x), y: rd(B.y), boss: 1 });
      B.moveTo = null; B.x = x; B.y = y;
      f.emit({ t: 'propfx', k: 'gwmist', x: rd(x), y: rd(y), boss: 1, in: 1 });
    };
    // a step that would begin while a hunt is still on the floor waits for it (two of his moves never overlap unless a set pairs them)
    const free = fn => () => { const w = busyUntil - f.t; if (w > 0.02) f.afterKeep(w + 0.05, fn); else fn(); };

    // --- On the Scent ---------------------------------------------------------------------------------------------------------
    // he hunts what runs: a trail of 600 or more ends in a pounce of 150; a hero who stood still is fallen on (390). The wider the pounce,
    // the longer he hangs in the air before it lands (0.6 s for the smallest, 1.4 s for the widest)
    const POUNCE_R = L => rd(150 + Math.max(0, 600 - L) * 0.4);
    const HANG = r => 0.6 + (r - 150) / 300;
    const XNAME = { second: 'The Second Hound', still: 'Stillness' };
    const xn = (x, base) => (X && x ? XNAME[x] : base);
    const pickPrey = (n, not = []) => {
      let pool = f.nonTanks().filter(p => !not.includes(p.id)); if (!pool.length) pool = f.alive().filter(p => !not.includes(p.id));
      if (pool.length > n && lastPrey != null) pool = pool.filter(p => p.id !== lastPrey);
      return f.shuffle(pool).slice(0, n);
    };
    // o: { who: [ids], D, quiet, name, two (Double Scent), back (Doubling Back), buried (Buried Scent), whole (the Whole Trail), x ('second' | 'still', Extreme) }
    const scent = (o = {}) => {
      const prey = o.who ? o.who.map(live).filter(Boolean) : pickPrey(o.two ? 2 : 1);
      if (!prey.length) return;
      const x = X ? o.x : null, D = o.D || f.ct(5), lockAt = D - LOCK, t0 = f.t;
      if (!o.quiet) f.cast(o.name || xn(x, 'On the Scent'), D, 'scent');
      lastPrey = prey[0].id; stare = prey[0].id; B.lockFacing = true;
      prey.forEach((p, i) => {
        f.mark(p.id, { sym: 'prey', col: '#e2f2ff', dur: lockAt, key: 'gwprey' });
        if (prey.length > 1) f.mark(p.id, { sym: 'num', n: i + 1, col: '#e2f2ff', dur: lockAt, key: 'gword' });
      });
      // The Second Hound (Extreme): a shade takes a second scent at the same moment
      const second = x === 'second' ? pickPrey(1, prey.map(p => p.id))[0] : null;
      if (second) f.mark(second.id, { sym: 'prey', col: '#b9a8e8', dur: lockAt, key: 'gwprey2' });
      // Stillness (Extreme): two heroes who are not scented are asked not to move until the trail locks
      const still = x === 'still' ? pickPrey(2, prey.map(p => p.id)) : [];
      for (const p of still) f.mark(p.id, { sym: 'still', col: '#9fd8ff', dur: lockAt, key: 'gwstill' });
      // Buried Scent (Hard): a flurry lands 1.6 s before the lock
      if (o.buried) { f.emit({ t: 'roomev', k: 'gwdrift', dur: +(lockAt - 1.6 + 0.6).toFixed(2) }); f.afterKeep(lockAt - 1.6, () => wipe(true)); }
      busyUntil = Math.max(busyUntil, f.t + D + 3);
      f.afterKeep(lockAt, () => lockRun(prey.map(p => p.id), o, { second: second && second.id, still: still.map(p => p.id), t0 }));
    };
    const lockRun = (ids, o, more) => {
      if (f.state !== 'live') return;
      stare = null;
      const home = chasing ? null : { x: B.x, y: B.y }, runs = [];
      let at = LOCK, prevEnd = null;
      for (const id of ids) {
        if (!live(id)) continue;
        let r = { pts: trail(id, o.whole && lastAct != null ? Math.min(WHOLE, f.t - lastAct) : SPAN), who: id };
        if (H) r = turnOnto(r.pts, id);
        if (!r.pts.length) continue;
        // (Double Scent: the second run starts a beat after the first lands, or at once if it begins where the first ended)
        if (prevEnd) at += Math.hypot(r.pts[0].x - prevEnd[0], r.pts[0].y - prevEnd[1]) < 140 ? 0.25 : 1.0;
        const run = layRun(r.pts, { delay: at, w: 120, speed: SPEED, tag: 'gwRun', dmg: 'run', who: r.who, kind: o.whole ? 'whole' : 'run' });
        const end = run.pts[run.pts.length - 1], pr = POUNCE_R(run.L), landAt = run.end + HANG(pr);
        f.aoe({ kind: 'circle', x: rd(end[0]), y: rd(end[1]), r: pr }, landAt, dmg.pounce, { tag: 'gwPounce' });
        runs.push({ pts: run.pts, at, L: run.L, landAt });
        (f.garrowRuns = f.garrowRuns || []).push({ t: +f.t.toFixed(1), L: rd(run.L), r: POUNCE_R(run.L), turned: !!r.turned, n: run.pts.length });   // (for tools and testing)
        if (typeof process !== 'undefined' && process.env && process.env.GW_LOG) console.log('gwrun', JSON.stringify(f.garrowRuns[f.garrowRuns.length - 1]));
        if (ridgeOn) raise(run.pts, run.end);
        at = landAt; prevEnd = end;
        // Doubling Back (Hard): and then he runs it back, to a plain pounce where it began
        if (o.back && run.L > 60) {
          const back = layRun(r.pts.slice().reverse(), { delay: at + 0.9, w: 120, speed: SPEED, tag: 'gwBack', dmg: 'run', who: r.who, kind: 'back' });
          const e2 = back.pts[back.pts.length - 1], land2 = back.end + 0.6;
          f.aoe({ kind: 'circle', x: rd(e2[0]), y: rd(e2[1]), r: 150 }, land2, dmg.pounce, { tag: 'gwPounce' });
          runs.push({ pts: back.pts, at: at + 0.9, L: back.L, landAt: land2 });
          at = land2; prevEnd = e2;
        }
      }
      // The Second Hound (Extreme): the shade's own run and pounce, at the same moment as his first
      if (more.second != null && live(more.second)) {
        const sp = trail(more.second, SPAN);
        if (sp.length) {
          const run = layRun(sp, { delay: LOCK, w: 120, speed: SPEED, tag: 'gwShade', dmg: 'run', who: more.second, kind: 'shade' });
          const end = run.pts[run.pts.length - 1], pr = POUNCE_R(run.L);
          f.aoe({ kind: 'circle', x: rd(end[0]), y: rd(end[1]), r: pr }, run.end + HANG(pr), dmg.pounce, { tag: 'gwPounce' });
          const sh = f.spawnAdd({ kind: 'gwshade', x: run.pts[0][0], y: run.pts[0][1], hp: 4000000, r: 60, inert: true, onTick: a => { a.hp = a.maxHp; } });
          f.afterKeep(LOCK, () => {
            let i = 1;
            const tick = () => {
              if (!f.adds.has(sh.id) || f.state !== 'live') return;
              if (i >= run.pts.length) { f.afterKeep(0.7, () => f.killAdd(sh)); return; }
              const [x, y] = run.pts[i], d = Math.hypot(x - sh.x, y - sh.y), st = SPEED * 0.05;
              if (d <= st) { sh.x = x; sh.y = y; i++; } else { sh.facing = Math.atan2(y - sh.y, x - sh.x); sh.x += (x - sh.x) / d * st; sh.y += (y - sh.y) / d * st; }
              f.addsDirty = true;
              f.afterKeep(0.05, tick);
            };
            tick();
          });
        }
      }
      // Stillness (Extreme): what a marked hero walked since the mark bursts as the trail locks
      for (const id of more.still || []) {
        f.unmark(id, 'gwstill');
        const sp = trail(id, f.t - more.t0);
        if (lenOf(sp) > 50) layRun(sp, { delay: LOCK, w: 90, speed: 6000, tag: 'gwStill', dmg: 'still', who: id, kind: 'still' });
      }
      if (!runs.length) { B.lockFacing = false; busyUntil = f.t + 0.5; return; }
      for (const r of runs) f.afterKeep(r.at, () => { f.anim('run', r.L / SPEED + 0.15); runBoss(r.pts, SPEED, () => f.anim('pounce', Math.max(0.7, r.landAt - r.at - r.L / SPEED + 0.1))); });
      f.afterKeep(at + 0.9, () => {
        if (f.state !== 'live') return;
        if (home) { mistTo(home.x, home.y); B.untargetable = false; }
        B.lockFacing = false; B.autoAt = Math.max(B.autoAt, f.t + 1.5);
      });
      busyUntil = f.t + at + 1.1;
    };
    const doubleScent = () => scent({ two: true, name: 'Double Scent' });
    const backScent = () => scent({ back: true, name: 'Doubling Back' });
    const buriedScent = () => scent({ buried: true, name: 'Buried Scent' });
    const wholeTrail = (x = null) => scent({ whole: true, name: xn(x, 'The Whole Trail'), x });

    // --- the rest of his kit ----------------------------------------------------------------------------------------------------
    // Throat Snap: his jaws, along the line to his tank
    const snap = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4);
      f.cast('Throat Snap', d, 'snap');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 1.2, angle: B.facing }, delay: d, dmg: dmg.snap, target: tank.id, aimFromBoss: tank.id, tag: 'buster' });
    };
    const howl = (amt = dmg.howl) => {
      const d = f.ct(4.4);
      f.cast('Howl', d, 'howl');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: amt, hidden: true, tag: 'gwHowl' });
    };
    // Rime: a breath of frost on two heroes; where each lands a patch of slick mist stays (it slows whoever walks in it)
    const rime = () => {
      const pool = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive()).slice(0, 2);
      if (!pool.length) return;
      const d = f.ct(4.6);
      f.cast('Rime', d, 'rime');
      for (const p of pool) {
        const m = f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.rime, follow: p.id, tag: 'gwRime',
          onResolve: () => f.zone({ shape: { kind: 'circle', x: rd(m.shape.x), y: rd(m.shape.y), r: 110 }, dur: 10, effect: 'slow', tag: 'gwRime' }) });
      }
    };
    // Mist-Hounds: each takes one hero's scent and walks that hero's trail, step for step, a little slower than a hero. One that catches
    // up bites. Two that meet go out together; one walled off by a ridge loses the scent; each lasts HOUND_LIFE s.
    const HOUND_LIFE = 16, HOUND_SPEED = 196;
    const houndsOut = () => [...f.adds.values()].filter(a => a.kind === 'misthound');
    const dissolve = (a, met) => {
      if (!f.adds.has(a.id)) return;
      if (met) f.emit({ t: 'propfx', k: 'gwcancel', x: rd(a.x), y: rd(a.y) });
      f.killAdd(a);
      if (!houndsOut().some(b => b.fol === a.fol)) f.unmark(a.fol, 'gwfol');
    };
    const spawnHound = (pid, i, n) => {
      const a0 = B.facing + Math.PI + (i - (n - 1) / 2) * 0.8, t0 = f.t;
      const pos = ARENA.clamp({ x: B.x + Math.cos(a0) * 120, y: B.y + Math.sin(a0) * 120 }, 40);
      f.mark(pid, { sym: 'eye', col: '#bfe3ff', dur: HOUND_LIFE, key: 'gwfol' });
      f.spawnAdd({ kind: 'misthound', x: pos.x, y: pos.y, hp: 4000000, r: 28, inert: true, fol: pid, pt: t0 - 0.8, lastMove: t0, lx: pos.x, ly: pos.y, bite: t0 + 1.5,
        onTick: (a, dt) => {
          a.hp = a.maxHp;   // (mist: a blade goes through it)
          const p = live(a.fol);
          if (!p || f.t - t0 > HOUND_LIFE) return dissolve(a);
          for (const b of f.adds.values()) if (b !== a && b.kind === 'misthound' && Math.hypot(b.x - a.x, b.y - a.y) < 60) { dissolve(b, true); return dissolve(a, true); }
          let goal = null;
          for (const q of hist.get(a.fol) || []) if (q.t > a.pt) { goal = q; break; }
          if (goal && Math.hypot(goal.x - a.x, goal.y - a.y) < 14) { a.pt = goal.t; return; }
          const g = goal || p, gd = Math.hypot(g.x - a.x, g.y - a.y), dp = Math.hypot(p.x - a.x, p.y - a.y);
          if (dp < 40) {
            if (f.t >= a.bite) { a.bite = f.t + 1.5; f.emit({ t: 'addev', k: 'bite', id: a.id, tg: p.id }); f.damagePlayer(p, dmg.bite, { kind: 'gwBite', avoidable: true, noVuln: true, n: 'Mist-Hounds' }); }
            a.lastMove = f.t;
          } else if (gd > 1) {
            const st = Math.min(gd, HOUND_SPEED * dt);
            a.facing = Math.atan2(g.y - a.y, g.x - a.x);
            a.x += (g.x - a.x) / gd * st; a.y += (g.y - a.y) / gd * st;
            PROPS.collide(a, f.props, 20);
            f.addsDirty = true;
          }
          if (Math.hypot(a.x - a.lx, a.y - a.ly) > 8) { a.lx = a.x; a.ly = a.y; a.lastMove = f.t; }
          else if (f.t - a.lastMove > 2.2) dissolve(a);   // (walled off)
        } });
    };
    const hounds = (n = 2) => {
      const d = f.ct(3.2);
      f.cast('Mist-Hounds', d, 'pack');
      let pool = f.shuffle(f.nonTanks()); if (pool.length < n) pool = pool.concat(f.alive().filter(p => !pool.includes(p)));
      pool = pool.slice(0, n);
      for (const p of pool) f.mark(p.id, { sym: 'eye', col: '#bfe3ff', dur: d, key: 'gwfol' });
      f.afterKeep(d, () => { if (f.state === 'live') pool.forEach((p, i) => { if (live(p.id)) spawnHound(p.id, i, pool.length); }); });
    };
    // Circle the Prey: he trots a ring round the party along his own track, and the track bursts. Inside it and outside it are safe.
    const circle = () => {
      const al = f.nonTanks().length ? f.nonTanks() : f.alive(); if (!al.length) return;
      const d = f.ct(5.2), R = 250, cx = Math.max(-230, Math.min(230, al.reduce((s, p) => s + p.x, 0) / al.length)), cy = Math.max(-90, Math.min(90, al.reduce((s, p) => s + p.y, 0) / al.length));
      f.cast('Circle the Prey', d, 'circle');
      const home = { x: B.x, y: B.y }, a0 = Math.atan2(B.y - cy, B.x - cx), dir = f.rng() < 0.5 ? -1 : 1, N = 18, pts = [];
      for (let k = 0; k <= N; k++) { const a = a0 + dir * k * TAU / N; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      f.aoe({ kind: 'donut', x: rd(cx), y: rd(cy), r: R + 60, r2: R - 60 }, d, dmg.ring, { tag: 'gwRing' });
      f.emit({ t: 'roomev', k: 'gwring', x: rd(cx), y: rd(cy), r: R, a0: +a0.toFixed(2), dir, dur: +(d + 0.6).toFixed(2) });
      mistTo(pts[0][0], pts[0][1]);
      B.lockFacing = true;
      let i = 1; const speed = TAU * R / (d - 0.5);
      const next = () => {
        if (f.state !== 'live' || i >= pts.length) return;
        const [x, y] = pts[i++];
        B.facing = Math.atan2(y - B.y, x - B.x);
        B.moveTo = { x, y, speed, done: next };
      };
      next();
      busyUntil = Math.max(busyUntil, f.t + d + 1);
      f.afterKeep(d + 0.5, () => { if (f.state !== 'live') return; mistTo(home.x, home.y); B.lockFacing = false; B.autoAt = Math.max(B.autoAt, f.t + 1.5); });
    };
    // Snowdrift: a flurry wipes every track, and with it the mist, the ridges and the lesser hounds
    const wipe = (quiet) => {
      if (f.state !== 'live') return;
      wipedAt = f.t; hist.clear();
      if (!quiet) { clearRidges(); f.clearZones(); for (const a of houndsOut()) dissolve(a); }
      f.emit({ t: 'roomev', k: 'gwwipe', dur: 1 });
    };
    const CALM = 1.2;   // (the calm after the Whiteout's wipe, before the chase begins)
    const drift = wo => {
      const d = f.ct(3.6);
      f.cast('Snowdrift', d, 'drift');
      f.emit({ t: 'roomev', k: 'gwdrift', dur: +(d + 1).toFixed(2), ...(wo === 'whiteout' ? { wo: 1 } : {}) });
      f.afterKeep(d, () => { wipe(false); if (wo === 'whiteout' && f.state === 'live') f.emit({ t: 'roomev', k: 'gwhold', dur: CALM }); });
    };
    // The Long Chase: he is in the white, and hunts three heroes in turn, each from clean snow
    const CHASE_T = f.ct(4), CHASE_GAP = 0.8, CHASE_TAIL = 2.2, CHASE_LEN = 3 * CHASE_T + 2 * CHASE_GAP + CHASE_TAIL;
    const chase = () => {
      const order = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive()); if (!order.length) return;
      f.cast('The Long Chase', CHASE_LEN - CHASE_TAIL, 'drift');
      f.emit({ t: 'roomev', k: 'gwchase', dur: +CHASE_LEN.toFixed(2), hunts: 3 });
      mistTo(B.x, B.y);
      B.untargetable = true; chasing = true;
      for (let i = 0; i < 3; i++) f.afterKeep(i * (CHASE_T + CHASE_GAP), () => { const p = live(order[i % order.length].id) || f.nonTanks()[0] || f.alive()[0]; if (p) scent({ who: [p.id], D: CHASE_T, quiet: true }); });
      busyUntil = Math.max(busyUntil, f.t + CHASE_LEN);
      f.afterKeep(CHASE_LEN, () => { if (f.state !== 'live') return; chasing = false; f.emit({ t: 'roomev', k: 'gwchaseend', dur: 1.6 }); mistTo(HOME.x, HOME.y); B.untargetable = false; B.lockFacing = false; });
    };

    // --- the dance (Hard draws one of three orders of an act's middle sets per pull; Normal and Extreme run the order as written) -----
    // An order is valid when the tank is never without a Throat Snap for more than `lim` s nor given two under `near` s apart, two
    // Howls never land under 18 s apart, and the act's first Howl is not later than `rw.first` s in nor its last earlier than `rw.tail` s
    // before its end (so the party is never long without one across an act's seam). The three dances of an act are drawn until they open their middle with three different sets.
    const BEAT_AT = { 'Throat Snap': 4 }, RW_AT = { 'Howl': 4.4 }, RW_NEAR = 18;
    const orderScore = (sets, lim, near, lims = {}) => {
      let t = 0, last = 0, rwLast = -99, rwFirst = Infinity, worst = 0, tight = 0, rw = 0;
      for (const set of sets) for (const st of set) {
        const name = st[3] || st[2]; t += st[0];
        if (st[1] && BEAT_AT[name]) { const at = t + BEAT_AT[name]; worst = Math.max(worst, at - last); if (last > 0 && at - last < near) tight++; last = at; }
        if (st[1] && RW_AT[name]) { if (t + RW_AT[name] - rwLast < RW_NEAR) rw++; rwLast = t + RW_AT[name]; rwFirst = Math.min(rwFirst, rwLast); }
      }
      worst = Math.max(worst, t + 6 - last);
      const far = (lims.first != null && rwFirst > lims.first) || (lims.tail != null && t - rwLast > lims.tail);
      return { worst, tight, rw, far, ok: worst <= lim && !tight && !rw && !far };
    };
    const mix = (head, mid, tail, lim = 40, near = 18, act = 'act', lims = {}) => {
      const keep = [...head, ...mid, ...tail], log = f.garrowMix = f.garrowMix || [];
      if (!H || X) { log.push({ normal: orderScore(keep, lim, near, lims) }); return keep; }
      const valid = [], n = mid.length, idx = mid.map((_, k) => k), c = new Array(n).fill(0);
      let bad = null, badPen = Infinity;
      const see = () => {
        const sets = [...head, ...idx.map(k => mid[k]), ...tail], sc = orderScore(sets, lim, near, lims);
        if (sc.ok) valid.push(sets);
        else { const pen = sc.worst + (sc.tight + sc.rw + (sc.far ? 1 : 0)) * 30; if (pen < badPen) { badPen = pen; bad = sets; } }
      };
      see();
      for (let k = 0; k < n;) { if (c[k] < k) { const a = k % 2 ? c[k] : 0; [idx[a], idx[k]] = [idx[k], idx[a]]; see(); c[k]++; k = 0; } else { c[k] = 0; k++; } }   // (Heap's algorithm)
      log.push({ valid: valid.length, act });
      if (typeof process !== 'undefined' && process.env && process.env.GW_LOG) console.log('gwmix', act, valid.length, 'of', mid.length, 'sets; worst penalty', badPen);
      if (!valid.length) return bad;
      let pickK = 0, bestSc = -1;
      for (let k = 0; k < 400; k++) {
        const o3 = [0, 1, 2].map(d => valid[Math.floor(f.danceRng(act + ':' + k, d)() * valid.length)]);
        let i = head.length; while (i < o3[0].length && o3[0][i] === o3[1][i] && o3[1][i] === o3[2][i]) i++;
        const sc = new Set(o3.map(o => o[i])).size === 3 ? 100 - i : 0;
        if (sc > bestSc) { bestSc = sc; pickK = k; }
      }
      return valid[Math.floor(f.danceRng(act + ':' + pickK, f.dance)() * valid.length)];
    };

    // --- the acts -----------------------------------------------------------------------------------------------------------------
    // A pair is two moves that make a new problem (a hunt with a hound already behind you, a ring that gathers the party before the frost
    // falls on two of them). Pairs are highlights, two or three to an act; the rest stand alone with a calm after each.
    const HOWL_SNAP = 9, RING_RIME = 6.6, PACK_SCENT = 6.5;
    const sc = (x = null) => [free(() => scent({ x })), xn(x, 'On the Scent'), 'On the Scent'];
    // I. First Snow
    const first = from => f.course({
      until: 0.76, push: true,
      sets: mix([S([4, howl, 'Howl']), S([9, ...sc()])], [
        S([13, free(snap), 'Throat Snap']),
        S([14, free(rime), 'Rime']),
        S([13, ...sc('second')]),
        S([13, free(howl), 'Howl'], [HOWL_SNAP, snap, 'Throat Snap']),
        H ? S([14, free(doubleScent), 'Double Scent']) : S([14, ...sc()]),
      ], [
        S([13, free(rime), 'Rime']),
        S([13, free(snap), 'Throat Snap']),
        S([13, ...sc('second')]),
      ], 44, 18, 'act1', { tail: 62 }),
      closing: [[10, free(howl), 'Howl'], [10, free(snap), 'Throat Snap'], [10, free(() => scent()), 'On the Scent']],
      next: pack,
    }, from);

    // II. The Pack
    const pack = from => f.course({
      until: 0.52, push: true, onStart: () => { ridgeOn = H; },
      sets: mix([S([4, free(() => hounds(2)), 'Mist-Hounds']), S([10, free(snap), 'Throat Snap'])], [
        S([13, ...sc('still')]),
        S([14, free(circle), 'Circle the Prey'], [RING_RIME, rime, 'Rime']),
        S([14, free(() => hounds(2)), 'Mist-Hounds'], H ? [PACK_SCENT, free(backScent), 'Doubling Back'] : [PACK_SCENT, ...sc()]),
        S([13, free(howl), 'Howl'], [HOWL_SNAP, snap, 'Throat Snap']),
        S([13, free(snap), 'Throat Snap']),
        H && S([14, free(buriedScent), 'Buried Scent']),
      ].filter(Boolean), [
        S([11, free(snap), 'Throat Snap']),
        S([13, free(() => hounds(3)), 'Mist-Hounds']),
        S([12, ...sc('second')]),
      ], 46, 18, 'act2', { first: 86 }),
      closing: [[10, free(howl), 'Howl'], [10, free(snap), 'Throat Snap'], [10, free(() => scent()), 'On the Scent']],
      next: whiteout,
    }, from);

    // Whiteout: no gate of its own; it runs its course and the frost begins
    const whiteout = from => f.course({
      sets: [S([0.6, free(() => drift('whiteout')), 'Snowdrift'], [f.ct(3.6) + CALM, chase, 'The Long Chase'], [CHASE_LEN + 0.1, () => howl(dmg.chaseHowl), 'Howl'], [f.ct(4.4) + 0.4])],   // (the gap after the Howl: a course's very last step would be cut by the next act beginning)
      next: frost,
    }, from);

    // III. Hard Frost: where he runs, the ice stands up behind him
    const frost = from => f.course({
      until: 0.26, push: true, onStart: () => { ridgeOn = true; f.emit({ t: 'roomev', k: 'gwfrost', dur: 4 }); },
      sets: mix([S([3, free(snap), 'Throat Snap']), S([10, ...sc()])], [
        S([14, free(() => hounds(2)), 'Mist-Hounds'], [PACK_SCENT, ...sc('still')]),
        S([13, free(drift), 'Snowdrift'], [6, ...sc('second')]),
        S([14, free(circle), 'Circle the Prey'], [RING_RIME, rime, 'Rime']),
        S([13, free(howl), 'Howl'], [HOWL_SNAP, snap, 'Throat Snap']),
        S([13, free(snap), 'Throat Snap']),
        H && S([14, free(doubleScent), 'Double Scent']),
      ].filter(Boolean), [
        S([11, free(snap), 'Throat Snap']),
        S([13, free(() => hounds(3)), 'Mist-Hounds']),
        S([12, ...sc('second')]),
      ], 46, 18, 'act3'),
      closing: [[10, free(howl), 'Howl'], [10, free(snap), 'Throat Snap'], [10, free(() => scent()), 'On the Scent']],
      next: lastLight,
    }, from);

    // IV. Last Light: the snow stops, and nothing a hero walks fades any more
    const wt = (x = null) => [free(() => wholeTrail(x)), xn(x, 'The Whole Trail'), 'The Whole Trail'];
    const lastLight = from => f.course({
      onStart: () => { lastAct = f.t; ridgeOn = true; f.emit({ t: 'roomev', k: 'gwlast', dur: 9999 }); },
      sets: [
        S([4, free(howl), 'Howl']),
        S([10, ...wt()]),
        S([13, free(() => hounds(3)), 'Mist-Hounds'], [8, snap, 'Throat Snap']),
        S([13, ...wt('second')]),
        S([13, free(howl), 'Howl'], [HOWL_SNAP, snap, 'Throat Snap']),
        S([13, free(() => hounds(3)), 'Mist-Hounds'], [PACK_SCENT, ...wt('still')]),
        S([13, free(circle), 'Circle the Prey'], [RING_RIME, rime, 'Rime']),
        H ? S([12, free(backScent), 'Doubling Back']) : S([12, ...wt()]),
      ],
      closing: [[10, free(howl), 'Howl'], [10, free(snap), 'Throat Snap'], [10, free(() => wholeTrail()), 'The Whole Trail']],
      ramp: 0.08,
    }, from);

    first(0);

    // what the bots read (bots.js): a hero's trail as he would take it now, how long a trail he wants, and the lesser hounds
    f.room = {
      trail: (pid, span = SPAN) => trail(pid, span).map(q => [q.x, q.y]),
      span: () => (lastAct != null ? Math.min(WHOLE, f.t - lastAct) : SPAN), want: 600, pounceR: POUNCE_R,
      hounds: houndsOut, wipedAt: () => wipedAt,
    };
    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.scent())
    f.moves = { scent, doubleScent, backScent, buriedScent, wholeTrail, snap, howl, rime, hounds, circle, drift, chase, trail };
  },
};

if (typeof module !== 'undefined') module.exports = { GARROW };
