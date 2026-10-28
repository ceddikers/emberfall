// Volkar, Unbound (Hard, from Heavens Fall): everything the storm form looks like, drawn in code. His body cracks with light and breaks apart into
// the storm (roomev 'volbreak', then 'volrise'), and he rises over the summit as a huge face in the clouds, a dark canopy round the summit and
// lightning arms; what the party hits is the STORM HEART at the middle (the boss entity: a crackling core with the two charges, gold and blue,
// running round it). The summit under it is darker, windier and cracked ('volkar:storm', buildStormPeak). The arms are drawn from the real
// telegraphs, so each shows exactly where its blow lands: 'armslam' (an arm coming down on the tank), 'armcross' (an arm raking a line) and
// 'arm' (an arm reaching down to a gold or blue tower). Loaded after arena-view.js; it adds buildStormPeak to ArenaView itself.
//
// Timing (volkar.js unbound): the change is a slow dread and then a payoff.
//   roomev volbreak {dur}   the cast begins: the sky blackens, the body groans and cracks, far thunder rolls in (FLASHES: a flash, then its
//                           thunder LAG s later, each nearer)
//   roomev volhush {dur}    HUSH s before the burst: the wind dies, the rain stops, the clouds hold still, the music drops out, a heartbeat of
//                           light in the cracks and a ring of air drawing in; no thunder, a beat of near-silence
//   roomev volrise {dur}    0.6 s before the burst the form flips; the burst is BURST (0.6 s) into volrise. The face rises with its eyes shut
//                           (age 0.8 to 3.2), opens them and roars (age 3.0 to 3.6)
//   roomev volcharge {at, every, n}  three bolts pour from the face into the Storm Heart, each filling a bar of its health (volkar.js heals as each lands)
// st.props (main.js, VK_STORM.props): storm (the burst has happened), stormBreak 0..1 (the body cracking), stormHush 0..1, stormAge (seconds since
// volrise began, -1 before it), stormHits / stormHitAge (the bolts that have landed, seconds since the last).
//   VK_STORM.under(ctx, room, t)       summit light, the canopy, the face (under the telegraphs and the units: ArenaView.drawRoomUnder)
//   VK_STORM.over(ctx, room, t, env)   the arms (over the units: ArenaView.drawRoomOver), reading env.tgs
//   VK_STORM.heart(ctx, st, angle) / crumble(ctx, st, pk, angle) / tremble(pk, t)   the boss's body (bosses.js volkar)
//   VK_STORM.event(msg, h)             the screen moments (main.js roomev), h = { later }

const VK_STORM = (() => {
  const TAU2 = Math.PI * 2;
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const c01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = q => q * q * (3 - 2 * q);
  const lerp = (a, b, q) => a + (b - a) * q;
  const K = { cy: '#7fe8ff', wh: '#eaffff', deep: '#08101c', cl: '#18222f', cl2: '#2a384c', gold: '#ffc24a', blue: '#4ad8ff', stone: '#5b6a80', stoneD: '#3a4455' };
  const BURST = 0.6;                    // seconds into 'volrise' at which the body bursts
  const HUSH = 3.8;                     // the calm before the burst (volkar.js UNB_HUSH)
  // the far thunder before the calm: [seconds into the cast, how long the thunder lags the flash, size, distance of the bolt from the middle]
  // (the thunder arrives at 2.8, 3.7, 4.5 and 5.1 s, each nearer, a second or so apart; the calm begins at 5.55)
  const FLASHES = [[0.5, 2.3, 0.35, 780], [2.0, 1.7, 0.5, 720], [3.5, 1.0, 0.7, 660], [4.7, 0.4, 0.95, 610]];
  const GROANS = [[1.2, 0.55], [3.2, 0.7], [4.3, 0.85]];   // the stone groaning before the calm: [seconds into the cast, volume]
  const BEATS = [[0.9, 0.8], [1.9, 1.0], [2.7, 1.4], [3.15, 1.8]];   // the heartbeat in the calm: [seconds into it, weight]
  const FACE = { x: 0, y: -520 };       // the face's centre: over the north rim of the summit
  const SHOULDER = [{ x: -370, y: -440, s: -1 }, { x: 370, y: -440, s: 1 }];
  const ARM_TAGS = { armslam: 1, armcross: 1, arm: 1 };

  // where the sequence is: storm (the burst has happened and the form is the storm's), brk (the body cracking, 0..1), age (since volrise), c (how much
  // storm is in the sky, 0..1), face (the face risen, 0..1), eyes (open, 0..1), roar (the mouth wide), hush (the calm, 0..1), hushAge, tw (the clouds' clock: it slows in the calm)
  function seq(room, t) {
    const ev = (room && room.ev) || {}, fm = ev.form, vb = ev.volbreak;
    // (only this pull's events: one older than the cast belongs to an earlier pull)
    const vh = ev.volhush && vb && ev.volhush.start >= vb.start ? ev.volhush : null, vr = ev.volrise && (!vb || ev.volrise.start >= vb.start) ? ev.volrise : null;
    const age = vr ? t - vr.start : -1;
    // (the form flips BURST s before the body bursts: until then he is still the cracking stone body, and the sky is still dread)
    const storm = !!(fm && fm.form === 'storm') && !(vr && age < BURST);
    const brk = vb && !storm ? c01((t - vb.start) / Math.max(0.1, vb.dur)) : 0;
    const burstAt = vr ? vr.start + BURST : vb ? vb.start + vb.dur : 0;
    const hush = vh && t >= vh.start && t < burstAt ? ease(c01((t - vh.start) / 0.8)) : 0;
    const tw = vh ? t - 0.85 * Math.max(0, Math.min(t, burstAt) - vh.start) : t;
    let c = 0.8 * Math.pow(brk, 0.85), face = 0, eyes = 0, roar = 0;
    if (storm) {
      if (vr && age < 6.4) {
        c = 0.8 + 0.2 * c01((age - BURST) / 3); face = ease(c01((age - BURST - 0.2) / 2.4));
        eyes = ease(c01((age - 3.1) / 0.5)); roar = c01((age - 3.0) / 0.25) * (1 - c01((age - 4.4) / 0.7));
      } else { c = 1; face = 1; eyes = 1; }
    }
    return { storm, brk, age, burstAge: age - BURST, c, face, eyes, roar, hush, hushAge: vh ? t - vh.start : -1, tw };
  }
  // the three bolts of the charge: { n, t0 (the first lands), every } or null; hits so far and seconds since the last
  function charge(room, t) {
    const ev = (room && room.ev) || {}, vc = ev.volcharge, vr = ev.volrise;
    if (!vc || (vr && vc.start < vr.start)) return null;
    const t0 = vc.start + (vc.at || 3), every = vc.every || 0.8, n = vc.n || 3, c = t - t0;
    const hits = c < 0 ? 0 : Math.min(n, Math.floor(c / every) + 1);
    return { n, t0, every, hits, age: hits ? c - (hits - 1) * every : -1 };
  }
  // what the boss's body reads from the room (main.js puts it on raid.props)
  function props(room, form, now) {
    const s = seq(room, now), ch = charge(room, now);
    return { storm: form === 'storm' && s.storm, stormBreak: s.storm ? 0 : s.brk, stormHush: s.hush, stormBeat: s.hush > 0.05 ? beat(s.hushAge) : 0, stormAge: s.age, stormHits: ch ? ch.hits : 0, stormHitAge: ch ? ch.age : -1 };
  }

  // ---------------------------------------------------------------------------------------------------------- parts
  // a polyline lit like lightning: a wide soft glow, a mid line and a white core (additive)
  function bolt(ctx, pts, col, w, a = 1) {
    tracePath(ctx, pts); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = w * 3.2; ctx.strokeStyle = rgba(col, 0.14 * a); ctx.stroke();
    ctx.lineWidth = w * 1.5; ctx.strokeStyle = rgba(col, 0.42 * a); ctx.stroke();
    ctx.lineWidth = Math.max(1, w * 0.5); ctx.strokeStyle = rgba('#ffffff', 0.95 * a); ctx.stroke();
  }
  // a crackling segment from (x0, y0) to (x1, y1), re-seeded `rate` times a second
  function crack(ctx, x0, y0, x1, y1, t, seed, col, w, a = 1, rate = 14, n = 7, amp = 0.16) {
    const sd = Math.floor(t * rate) * 13 + seed, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, pts = [x0, y0];
    for (let i = 1; i < n; i++) { const u = i / n, o = (hs(sd, i) - 0.5) * L * amp * Math.sin(u * Math.PI); pts.push(x0 + dx * u + nx * o, y0 + dy * u + ny * o); }
    pts.push(x1, y1);
    bolt(ctx, pts, col, w, a);
  }

  // the canopy: the sky round the summit goes dark and the cloud turns slowly, with lightning in it
  function canopy(ctx, t, c, bk = 1, t0 = t) {   // (t0: the clouds' own clock, which slows in the calm; bk: how much lightning moves in them)
    if (c <= 0.01) return;
    t = t0;
    ctx.save();
    const g = ctx.createRadialGradient(0, 0, 280, 0, 0, 820);
    g.addColorStop(0, 'rgba(4,8,18,0)'); g.addColorStop(0.45, `rgba(4,8,18,${0.5 * c})`); g.addColorStop(1, `rgba(3,6,14,${0.92 * c})`);
    ctx.fillStyle = g; ctx.fillRect(-1100, -1100, 2200, 2200);
    for (let i = 0; i < 22; i++) {
      const sp = (0.018 + hs(i, 1) * 0.02) * (i % 2 ? -1 : 1), a = hs(i, 2) * TAU2 + t * sp, d = 370 + hs(i, 3) * 240, r = 130 + hs(i, 4) * 120;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.86;
      glow(ctx, x, y, r, i % 3 ? '#141d2e' : '#1d2a40', 0.62 * c);
      glow(ctx, x - r * 0.2, y - r * 0.25, r * 0.55, '#3a4d6c', 0.2 * c);
    }
    // lightning moving inside the cloud, outside the summit
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3 && bk > 0.02; i++) {
      const per = 1.1 + i * 0.37, q = ((t + i * 0.7) % per) / per, n = Math.floor((t + i * 0.7) / per);
      if (q > 0.16) continue;
      const k = (1 - q / 0.16) * bk, a = hs(n, i + 5) * TAU2, d = 420 + hs(n, i + 9) * 150, a2 = a + (hs(n, i + 11) - 0.5) * 0.9;
      crack(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.86, Math.cos(a2) * (d + 120), Math.sin(a2) * (d + 120) * 0.86, n * 7 + i, n + i, K.cy, 2.2, 0.8 * k * c, 60, 8, 0.3);
      glow(ctx, Math.cos(a2) * (d + 60), Math.sin(a2) * (d + 60) * 0.86, 150, '#7fc8ff', 0.22 * k * c);
    }
    ctx.restore();
  }

  // the face: light and cloud, a dark brow and eyes (one gold, one blue: both charges), a mouth full of lightning, a beard of cloud and a crown of bolts.
  // k is how far it has risen (0..1): it comes up out of the middle (small, pale) to its place over the north rim.
  function face(ctx, t, k, c, eyes = 1, roar = 0) {   // eyes: how far open (0 shut, a thin seam of light); roar: the jaw dropped and the throat alight
    if (k <= 0.01) return;
    const x = lerp(0, FACE.x, k), y = lerp(-30, FACE.y, k), S = lerp(0.3, 1, k);
    ctx.save(); ctx.translate(x, y); ctx.scale(S, S);
    const A = c01(k * 1.4), pulse = 0.5 + 0.5 * Math.sin(t * 2.3);
    glow(ctx, 0, 0, 360, '#4a8ac0', 0.2 * A + 0.05 * pulse);
    // the head: a mass of dark cloud, lit along its upper edge
    for (let i = 0; i < 18; i++) {
      const a = i * TAU2 / 18 + Math.sin(t * 0.3 + i) * 0.05, rx = 150 + hs(i, 1) * 30, ry = 190 + hs(i, 2) * 30;
      glow(ctx, Math.cos(a) * rx * 0.75, Math.sin(a) * ry * 0.7 + 10, 120 + hs(i, 3) * 60, '#0a1220', 0.8 * A);
    }
    for (let i = 0; i < 10; i++) { const a = Math.PI * 1.05 + i * Math.PI * 0.1; glow(ctx, Math.cos(a) * 150, Math.sin(a) * 175, 70, '#4a6a92', 0.3 * A); }
    // a crown of bolts streaming up and out of the head
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * (1.06 + 0.88 * i / 12), r0 = 150, len = 90 + hs(i, 5) * 120 + 20 * Math.sin(t * 3 + i);
      crack(ctx, Math.cos(a) * r0, Math.sin(a) * r0 * 1.15, Math.cos(a + 0.12 * Math.sin(t + i)) * (r0 + len), Math.sin(a) * (r0 + len) * 1.15, t, i * 17, K.cy, 1.6, 0.8 * A, 9, 6, 0.22);
    }
    ctx.restore();
    // the face plate: pale light going to cloud at the edges, mottled with drifting dark
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-108, -118); ctx.bezierCurveTo(-130, 10, -96, 120, -34, 176); ctx.lineTo(0, 190); ctx.lineTo(34, 176);
    ctx.bezierCurveTo(96, 120, 130, 10, 108, -118); ctx.bezierCurveTo(60, -158, -60, -158, -108, -118); ctx.closePath();
    const fg = ctx.createRadialGradient(0, -30, 10, 0, 10, 170);
    fg.addColorStop(0, `rgba(226,246,255,${0.95 * A})`); fg.addColorStop(0.55, `rgba(140,184,220,${0.85 * A})`); fg.addColorStop(1, `rgba(44,68,100,${0.7 * A})`);
    ctx.fillStyle = fg; ctx.fill();
    ctx.clip();
    for (let i = 0; i < 12; i++) {
      const gx = ((hs(i, 6) * 300 - 150 + t * (6 + hs(i, 7) * 10) * (i % 2 ? 1 : -1) + 450) % 300) - 150;
      glow(ctx, gx, -120 + hs(i, 8) * 300, 40 + hs(i, 9) * 40, '#1a2a44', 0.34 * A);
    }
    ctx.restore();
    // the plate's edge dissolving into the cloud: pale and dark puffs along it
    for (let i = 0; i < 22; i++) {
      const a = i * TAU2 / 22 + 0.3, ex = Math.cos(a) * 118, ey = Math.sin(a) * 160 + 14;
      glow(ctx, ex, ey, 34 + hs(i, 2) * 24, i % 3 ? '#0e1a2c' : '#5a7ea6', (i % 3 ? 0.5 : 0.22) * A);
    }
    ctx.lineJoin = 'round';
    // the cheekbones and the line of the jaw, drawn in darker cloud
    for (const s of [-1, 1]) {
      limb(ctx, [s * 100, -20, s * 92, 60, s * 56, 130, s * 18, 176], rgba('#1a2a44', 0.5 * A), 7);
      poly(ctx, [s * 40, 40, s * 96, 34, s * 70, 72, s * 30, 70], rgba('#1a2a44', 0.28 * A));
    }
    // brows and eyes
    for (const s of [-1, 1]) {
      poly(ctx, [s * 112, -62, s * 22, -44, s * 14, -18, s * 108, -38], rgba(K.deep, 0.96 * A), rgba('#9fdcff', 0.55 * A), 2);
      const col = s < 0 ? '#ffd36a' : '#6ad8ff', ex = s * 56, ey = -20, ew = 0.1 + 0.9 * eyes;
      poly(ctx, [ex - s * 34, ey - 6, ex, ey - 17, ex + s * 34, ey + 2, ex, ey + 10], rgba(K.deep, 0.98 * A));
      // (shut: only a seam of light through the lid; opening: a flare of its colour)
      glow(ctx, ex, ey - 2, 70, col, (0.12 + 0.43 * eyes) * A * (0.8 + 0.2 * pulse), 0.8);
      if (eyes > 0.02 && eyes < 0.98) glow(ctx, ex, ey - 2, 150, col, 0.6 * Math.sin(eyes * Math.PI) * A, 0.8);
      ellipse(ctx, ex, ey - 3, 21 * (0.55 + 0.45 * eyes), 5.5 * ew, s * -0.1, rgba('#ffffff', A * (0.35 + 0.65 * eyes)));
    }
    // the nose, and the mouth: a dark fissure with lightning in it
    limb(ctx, [0, -14, -3, 34, -14, 62], rgba(K.deep, 0.6 * A), 8);
    poly(ctx, [-18, 66, -2, 74, 18, 66, 8, 80, -8, 80], rgba(K.deep, 0.7 * A));
    const jaw = roar * 22;   // (the jaw drops for the roar)
    poly(ctx, [-70, 104, -34, 94, 0, 99, 34, 94, 70, 104, 40 + roar * 6, 128 + jaw, 0, 134 + jaw * 1.2, -40 - roar * 6, 128 + jaw], rgba(K.deep, 0.97 * A), rgba('#9fdcff', 0.5 * A), 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const tp = [-56, 112]; for (let i = 1; i <= 9; i++) tp.push(-56 + i * 12.4, 112 + (i % 2 ? -9 : 7) * (1 + roar * 1.8) + Math.sin(t * 9 + i) * 2 + (i % 2 ? 0 : jaw * 0.5));
    bolt(ctx, tp, K.cy, 2 + roar * 2.5, A * (0.7 + 0.3 * pulse));
    glow(ctx, 0, 112 + jaw * 0.5, 90 + roar * 120, roar > 0.05 ? '#dff8ff' : K.cy, (0.22 + 0.5 * roar) * A * (0.6 + 0.4 * pulse));
    ctx.restore();
    // the beard: cloud pouring down off the chin, with lightning hung in it
    for (let i = 0; i < 12; i++) {
      const q = (i + 0.5) / 12, bx = lerp(-70, 70, q) + Math.sin(t * 0.9 + i) * 10, by = 168 + Math.sin(q * Math.PI) * 46 + hs(i, 3) * 24;
      glow(ctx, bx, by, 70 + hs(i, 4) * 40, '#0e1828', 0.7 * A);
      glow(ctx, bx - 10, by - 14, 38, '#4a6a92', 0.22 * A);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) crack(ctx, lerp(-60, 60, i / 4), 190, lerp(-80, 80, i / 4) + Math.sin(t + i) * 12, 240 + hs(i, 2) * 50, t, i * 31 + 3, K.cy, 1.4, 0.7 * A, 8, 6, 0.18);
    ctx.restore();
    ctx.restore();
  }

  // an arm: out of the cloud at a shoulder, bending to its hand; lightning in a sleeve of dark cloud
  function armPath(S, Hh, bend, t, seed, jit) {
    const mx = (S.x + Hh.x) / 2, my = (S.y + Hh.y) / 2, dx = Hh.x - S.x, dy = Hh.y - S.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const cx = mx + nx * bend * L * 0.22, cy = my + ny * bend * L * 0.22, N = 16, sd = Math.floor(t * 15) * 7 + seed, pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u, ax = a * S.x + b * cx + d * Hh.x, ay = a * S.y + b * cy + d * Hh.y;
      const o = (hs(sd, i) - 0.5) * 2 * jit * Math.sin(u * Math.PI);
      pts.push(ax + nx * o, ay + ny * o);
    }
    return pts;
  }
  function arm(ctx, t, S, Hh, o = {}) {
    const col = o.col || K.cy, a = o.a ?? 1, w = o.w || 5, bend = o.bend ?? S.s * 0.8;
    if (a <= 0.01) return;
    ctx.save();
    glow(ctx, S.x, S.y, 110, '#0c1424', 0.7 * a); glow(ctx, S.x - S.s * 20, S.y - 20, 60, '#3a5478', 0.25 * a);
    const main = armPath(S, Hh, bend, t, o.seed || 0, o.jit ?? 9), side = armPath(S, Hh, bend, t + 0.031, (o.seed || 0) + 5, (o.jit ?? 9) * 1.7);
    for (let i = 0; i < main.length; i += 4) { const u = i / main.length; glow(ctx, main[i], main[i + 1], lerp(46, 22, u), '#0c1424', 0.55 * a); }
    ctx.globalCompositeOperation = 'lighter';
    bolt(ctx, side, col, w * 0.55, 0.55 * a);
    bolt(ctx, main, col, w * 1.25, a);
    // forks off the arm
    for (let i = 0; i < 3; i++) {
      const k = 3 + Math.floor(hs(Math.floor(t * 6), i + (o.seed || 0)) * 10) * 2, px = main[k], py = main[k + 1];
      if (px === undefined) continue;
      const fa = hs(Math.floor(t * 6) + i, 4) * TAU2;
      crack(ctx, px, py, px + Math.cos(fa) * 46, py + Math.sin(fa) * 46, t, i * 9 + 1, col, 1.2, 0.7 * a, 12, 4, 0.3);
    }
    ctx.restore();
    if (o.hand !== false) hand(ctx, t, Hh, o.dir ?? Math.PI / 2, col, a, o.spread ?? 0.9, o.scale ?? 1, o.seed || 0);
  }
  // the hand: a glow, a dark palm and fingers of lightning
  function hand(ctx, t, p, dir, col, a, spread, sc, seed) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, p.x, p.y, 62 * sc, col, 0.5 * a, 0.7);
    for (let i = 0; i < 5; i++) {
      const an = dir + (i - 2) * spread * 0.5, len = (30 + hs(i, seed) * 14 + 5 * Math.sin(t * 11 + i)) * sc;
      crack(ctx, p.x, p.y, p.x + Math.cos(an) * len, p.y + Math.sin(an) * len, t, seed + i * 5, col, 1.5 * sc, a, 16, 4, 0.2);
    }
    ctx.restore();
    circle(ctx, p.x, p.y, 10 * sc, rgba('#dff8ff', 0.95 * a), rgba(col, 0.95 * a), 2.5);
    glow(ctx, p.x, p.y, 20 * sc, '#ffffff', 0.7 * a);
  }
  const shoulderFor = x => SHOULDER[x >= 0 ? 1 : 0];

  // the arms the telegraphs ask for. Each is drawn from its own telegraph's shape, so the arm and the area always agree.
  function armsFor(ctx, t, env, face) {
    const used = new Set();
    for (const tg of env.tgs.values()) {
      if (!ARM_TAGS[tg.tag]) continue;
      const age = tg.gone != null ? t - tg.gone : -1, dur = tg.dur, p = (t - tg.start) / Math.max(0.1, dur), L = tg.live;
      if (age > 0.7 || p < 0) continue;
      const fade = age < 0 ? Math.min(1, (t - tg.start) / 0.35) : 1 - age / 0.7;
      if (tg.tag === 'armslam') {
        const S = shoulderFor(L.x); used.add(S.s);
        const lock = Math.max(0.3, tg.lockAt || 1), toL = dur - (t - tg.start);
        const lift = age >= 0 ? 0 : toL > lock ? 120 + 8 * Math.sin(t * 5) : 120 * Math.pow(Math.max(0, toL) / lock, 1.6);
        const reach = ease(c01((t - tg.start) / 0.7));
        const Hh = { x: lerp(S.x, L.x, reach), y: lerp(S.y, L.y - lift, reach) };
        arm(ctx, t, S, Hh, { a: fade * face, w: 7, seed: 3, scale: 1.6, spread: 0.55, dir: Math.PI / 2 });
        if (age >= 0) impact(ctx, t, L.x, L.y, L.r || 115, age, K.cy);
      } else if (tg.tag === 'armcross') {
        const ca = Math.cos(L.angle), sa = Math.sin(L.angle), P0 = { x: L.x, y: L.y }, P1 = { x: L.x + ca * L.len, y: L.y + sa * L.len };
        const A = P0.y <= P1.y ? P0 : P1, B = A === P0 ? P1 : P0, S = shoulderFor(A.x); used.add(S.s);
        const toL = dur - (t - tg.start), RAKE = 0.5;
        const u = age >= 0 ? 1 : c01(1 - toL / RAKE), reach = ease(c01((t - tg.start) / 0.7));
        const hover = { x: A.x - (B.x - A.x) * 0.04, y: A.y - 80 + 6 * Math.sin(t * 6) };
        const along = { x: lerp(A.x, B.x, ease(u)), y: lerp(A.y, B.y, ease(u)) - lerp(80, 14, ease(u)) };
        const target = u > 0 ? along : hover, Hh = { x: lerp(S.x, target.x, reach), y: lerp(S.y, target.y, reach) };
        arm(ctx, t, S, Hh, { a: fade * face, w: 6, seed: 11, scale: 1.4, spread: 1.0, dir: Math.atan2(B.y - A.y, B.x - A.x) });
        // the rake: a trail of lightning along the line behind the hand, then the whole line goes off
        if (u > 0 && age < 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; crack(ctx, A.x, A.y, along.x, along.y + 14, t, 77, K.cy, 2.4, 0.9, 30, 10, 0.05); ctx.restore(); }
        if (age >= 0) lineBurst(ctx, t, A, B, L.w, age, K.cy);
      } else if (tg.tag === 'arm') {
        const S = shoulderFor(L.x); used.add(S.s);
        const col = tg.color || K.cy, toL = dur - (t - tg.start), reach = ease(c01((t - tg.start) / 0.8));
        const lift = age >= 0 ? 0 : toL > 0.6 ? 110 + 8 * Math.sin(t * 4 + L.x) : 110 * Math.pow(Math.max(0, toL) / 0.6, 1.5);
        const Hh = { x: lerp(S.x, L.x, reach), y: lerp(S.y, L.y - lift, reach) };
        if (age < 0) {   // a thin column of the arm's colour down to the tower
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const n = 9; for (let i = 0; i <= n; i++) glow(ctx, Hh.x + (L.x - Hh.x) * i / n, lerp(Hh.y, L.y, i / n), L.r * (0.35 + 0.25 * i / n), col, (0.1 + 0.08 * i / n) * fade);
          ctx.restore();
        }
        arm(ctx, t, S, Hh, { a: fade * face, col, w: 6, seed: 19, scale: 1.5, spread: 1.15, dir: Math.PI / 2 });
        if (age >= 0) impact(ctx, t, L.x, L.y, L.r, age, col, true);
      }
    }
    // the arms with nothing to do hang out over the rim, lit and restless
    for (const S of SHOULDER) {
      if (used.has(S.s)) continue;
      const Hh = { x: S.x + S.s * (110 + 16 * Math.sin(t * 0.6 + S.s)), y: S.y + 250 + 22 * Math.sin(t * 0.8 + S.s * 2) };
      arm(ctx, t, S, Hh, { a: 0.8 * face, w: 4.5, seed: S.s > 0 ? 29 : 41, scale: 1.1, spread: 0.7, dir: Math.PI / 2, jit: 7, bend: S.s * 0.9 });
    }
  }
  // where a blow has landed: a flash, a ring and a ground-hugging burst
  function impact(ctx, t, x, y, r, age, col, pillar) {
    const k = 1 - age / 0.7;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, r * 1.5, col, 0.55 * k, 0.9);
    ellipse(ctx, x, y, r * (0.4 + age * 1.6), r * (0.4 + age * 1.6) * 0.8, 0, null, rgba(col, 0.8 * k), 4 * k + 1);
    if (pillar) { const g = ctx.createLinearGradient(0, y - 260, 0, y); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.6 * k)); ctx.fillStyle = g; ctx.fillRect(x - r * 0.5, y - 260, r, 260); }
    for (let i = 0; i < 7; i++) { const a = hs(i, 3) * TAU2; crack(ctx, x, y, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 0.9, t, i * 5 + 2, col, 1.8, 0.9 * k, 24, 5, 0.25); }
    ctx.restore();
  }
  function lineBurst(ctx, t, A, B, w, age, col) {
    const k = 1 - age / 0.7, dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineWidth = w * 0.9; ctx.strokeStyle = rgba(col, 0.2 * k); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const u = (i + hs(i, 1)) / 9, px = A.x + dx * u, py = A.y + dy * u, s = (hs(i, 2) > 0.5 ? 1 : -1) * w * 0.5;
      crack(ctx, px - nx * s, py - ny * s, px + nx * s, py + ny * s, t, i * 7, col, 1.8, 0.9 * k, 26, 5, 0.2);
    }
    crack(ctx, A.x, A.y, B.x, B.y, t, 5, col, 3, 0.8 * k, 26, 14, 0.04);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the summit under the storm
  // the floor: the summit as it was, in colder, darker light, with fissures of light run out from the middle and a heavier cloud beyond
  function buildStormPeak(c, bx, by) {
    this.buildPeak(c, bx, by);
    const R = ARENA.full, r = rng(311);
    c.fillStyle = 'rgba(8,12,26,0.46)'; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU2, d = R + 30 + r() * Math.max(bx, by), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9;
      glow(c, x, y, 70 + r() * 110, r() < 0.5 ? '#161e30' : '#202c44', 0.4 + r() * 0.3);
    }
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU2); c.clip();
    // a cold light round the middle, where the heart hangs
    glow(c, 0, 0, 260, '#3a78b0', 0.2);
    // the summit cracking: forked fissures, dark in the stone with a cold light in them
    for (let i = 0; i < 11; i++) {
      let a = i * TAU2 / 11 + (r() - 0.5) * 0.3, d = 50 + r() * 60, x = Math.cos(a) * d, y = Math.sin(a) * d, w0 = 3.6 - r() * 1.2;
      const path = [x, y], forks = [];
      while (d < R - 10) {
        a += (r() - 0.5) * 0.5; d += 24 + r() * 22; x = Math.cos(a) * d; y = Math.sin(a) * d; path.push(x, y);
        if (r() < 0.22) forks.push([x, y, a + (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.5), 60 + r() * 90]);
      }
      c.lineCap = 'round'; c.lineJoin = 'round';
      tracePath(c, path); c.lineWidth = w0 + 4; c.strokeStyle = 'rgba(4,6,12,0.7)'; c.stroke();
      tracePath(c, path); c.lineWidth = w0 * 0.8; c.strokeStyle = 'rgba(110,190,235,0.5)'; c.stroke();
      tracePath(c, path); c.lineWidth = 1; c.strokeStyle = 'rgba(225,248,255,0.55)'; c.stroke();
      for (const [fx, fy, fa, fl] of forks) {
        const fp = [fx, fy]; let q = fa, px = fx, py = fy;
        for (let k = 0; k < 4; k++) { q += (r() - 0.5) * 0.7; px += Math.cos(q) * fl / 4; py += Math.sin(q) * fl / 4; fp.push(px, py); }
        tracePath(c, fp); c.lineWidth = 2.6; c.strokeStyle = 'rgba(4,6,12,0.6)'; c.stroke();
        tracePath(c, fp); c.lineWidth = 0.9; c.strokeStyle = 'rgba(150,215,245,0.45)'; c.stroke();
      }
    }
    // fused, scorched rock where bolts have been walking the summit
    for (let i = 0; i < 9; i++) { const a = r() * TAU2, d = 110 + r() * (R - 160); glow(c, Math.cos(a) * d, Math.sin(a) * d, 36 + r() * 30, '#05070c', 0.5); }
    // the rim falls into shadow
    const v = c.createRadialGradient(0, 0, R * 0.4, 0, 0, R);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,4,10,0.55)');
    c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    if (this.amb) this.amb.storm = true;
  }

  // under the telegraphs and the units: the wind, the canopy, the face, the cracks lit from below and the burst's ring
  // the heart's beat in the calm: 0 between, a spike on each of BEATS
  function beat(a) {
    let v = 0;
    for (const [tb, w] of BEATS) { const d = a - tb; if (d > -0.06 && d < 0.55) v += w * Math.exp(-d * d / 0.025) * (d < 0 ? 0.25 : 1); }
    return Math.min(2, v);
  }
  // the dread before the change: dusk over the summit, thunder far off and coming nearer, then the calm (the cloud is under this, in canopy)
  function dread(ctx, t, s, room) {
    const vb = room.ev.volbreak, el = t - vb.start;
    ctx.save();
    ctx.fillStyle = `rgba(2,5,14,${0.36 * Math.pow(s.brk, 1.1)})`; ctx.fillRect(-1100, -1100, 2200, 2200);   // the light going out of the sky
    ctx.globalCompositeOperation = 'lighter';
    // far lightning in the cloud sea: each flash nearer, brighter and bigger than the last (their thunder is heard LAG s behind: event())
    for (let i = 0; i < FLASHES.length; i++) {
      const [at, , size, dist] = FLASHES[i], a = el - at;
      if (at > vb.dur - HUSH - 0.6 || a < 0 || a > 0.6) continue;
      const k = Math.pow(1 - a / 0.6, 1.7) * (a < 0.05 ? a / 0.05 : 1), ang = hs(i, 41) * TAU2, x = Math.cos(ang) * dist, y = Math.sin(ang) * dist * 0.86;
      ctx.fillStyle = rgba('#b8d4ff', 0.13 * size * k); ctx.fillRect(-1100, -1100, 2200, 2200);
      glow(ctx, x, y, 240 + 140 * size, '#9ccfff', 0.55 * size * k);
      crack(ctx, x + 50, y - 320, x, y, el, i * 9 + 1, '#d6e8ff', 1.8 + 2 * size, Math.min(1, 0.25 + size) * k, 40, 11, 0.2);
      crack(ctx, x + 18, y - 180, x + 90, y - 90, el, i * 9 + 4, '#d6e8ff', 1.2, 0.6 * size * k, 40, 6, 0.3);
    }
    // the calm: a ring of air drawing in on the middle, over and over, and the middle beating
    if (s.hush > 0.01) {
      for (let k = 0; k < 3; k++) {
        const q = (s.hushAge / 1.4 + k / 3) % 1, rr = 70 + (1 - q) * 560;
        ellipse(ctx, 0, 0, rr, rr * 0.86, 0, null, rgba('#a8d0ff', 0.17 * s.hush * Math.sin(q * Math.PI)), 2);
      }
      glow(ctx, 0, -10, 140, '#cfe8ff', 0.3 * s.hush * Math.min(1, beat(s.hushAge)));
    }
    ctx.restore();
  }

  function under(ctx, room, t) {
    const s = seq(room, t);
    if (typeof ArenaView !== 'undefined' && ArenaView.amb) ArenaView.amb.calm = s.hush;   // (the wind dies: the summit's own rain, grass and grit read this, arena-view.js peakLife)
    if (!s.storm && s.brk <= 0) return;
    canopy(ctx, t, s.c, s.storm ? 1 : c01((s.brk - 0.3) / 0.4) * (1 - s.hush), s.tw);
    if (!s.storm) dread(ctx, t, s, room);
    // the summit cracking open as the body breaks: light along the fissures, growing with it (and beating in the calm)
    const R = ARENA.full, lit = (s.storm ? 0.3 + 0.1 * Math.sin(t * 3) : s.brk * s.brk) * (1 + 0.8 * s.hush * Math.min(1, beat(s.hushAge)));
    if (lit > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 150 + 130 * (s.storm ? 0.4 : s.brk), K.cy, 0.35 * lit);
      const n = s.storm ? 11 : Math.max(0, Math.floor(s.brk * 11)), reach = s.storm ? 1 : c01(s.brk * 1.3);
      for (let i = 0; i < n; i++) {
        const a = i * TAU2 / 11 + (hs(i, 1) - 0.5) * 0.3, len = (R - 20) * reach * (0.55 + 0.45 * hs(i, 2));
        crack(ctx, Math.cos(a) * 40, Math.sin(a) * 40, Math.cos(a) * len, Math.sin(a) * len, t, i * 3, K.cy, 2, 0.7 * lit, 6, 9, 0.12);
      }
      ctx.restore();
    }
    // the burst: a ring running out over the summit
    if (s.storm && s.burstAge > 0 && s.burstAge < 1.8) {
      const q = c01(s.burstAge / 1.2), rr = 40 + easeOut(q) * 620;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ellipse(ctx, 0, 0, rr, rr, 0, null, rgba('#dff8ff', 0.7 * (1 - q)), 6 * (1 - q) + 1.5);
      ellipse(ctx, 0, 0, rr * 0.72, rr * 0.72, 0, null, rgba(K.cy, 0.5 * (1 - q)), 6 * (1 - q) + 1);
      glow(ctx, 0, 0, 300 * (1 - q) + 60, '#ffffff', 0.4 * (1 - q), 0.6);
      // a second, slower ring, and a white-hot column thrown up from the middle toward the sky
      const q2 = c01(s.burstAge / 1.8), r2 = 30 + easeOut(q2) * 760, pq = c01(s.burstAge / 1.5), pw = 90 * (1 - pq * 0.6);
      ellipse(ctx, 0, 0, r2, r2 * 0.86, 0, null, rgba(K.cy, 0.35 * (1 - q2)), 4 * (1 - q2) + 1);
      column(ctx, 0, -20, -780, pw, '#ffffff', 0.75 * (1 - pq), 0);
      ctx.restore();
    }
    if (s.storm) {
      // wind: long streaks sweeping over the summit
      ctx.save(); ctx.strokeStyle = 'rgba(200,225,255,0.09)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < 44; i++) {
        const sp = 520 + hs(i, 1) * 480, x = ((t * sp + hs(i, 2) * 1800) % 1800) - 900, y = (hs(i, 3) - 0.5) * 1000, len = 70 + hs(i, 4) * 120;
        ctx.moveTo(x, y); ctx.lineTo(x + len, y + len * 0.12);
      }
      ctx.stroke(); ctx.restore();
      face(ctx, t, s.face, s.c, s.eyes, s.roar);
      // the roar: rings of thunder running out from the face
      if (s.age > 3.0 && s.age < 4.6) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) {
          const q = c01((s.age - 3.0 - k * 0.22) / 1.0); if (q <= 0 || q >= 1) continue;
          ellipse(ctx, FACE.x, FACE.y + 110, 60 + easeOut(q) * 520, (60 + easeOut(q) * 520) * 0.7, 0, null, rgba('#cfeaff', 0.4 * (1 - q)), 5 * (1 - q) + 1);
        }
        ctx.restore();
      }
      // the body lifting: bolts from the heart up to the rising face
      if (s.face > 0.02 && s.face < 0.98) {
        const fx = lerp(0, FACE.x, s.face), fy = lerp(-30, FACE.y, s.face);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) crack(ctx, (hs(i, 1) - 0.5) * 60, -20, fx + (hs(i, 2) - 0.5) * 140, fy + 120, t, i * 11, K.cy, 2.2, 0.75 * (1 - s.face), 18, 9, 0.2);
        ctx.restore();
      }
    }
  }
  function easeOut(q) { return 1 - (1 - q) * (1 - q); }

  // over the units: the arms
  // a soft-edged column of light from (x, yNear) out to (x, yFar), w wide: a run of glows, brightest at the near end and thinning to `far` of that at the far end
  function column(ctx, x, yNear, yFar, w, col, a, far = 0) {
    const n = 16;
    for (let i = 0; i <= n; i++) { const q = i / n; glow(ctx, x, lerp(yNear, yFar, q), w * (1.15 - 0.35 * q), col, a * lerp(1, far, q) * 0.34); }
  }
  // the three bolts pouring from the face into the Storm Heart, one for each bar it takes back (volkar.js heals as each lands): a thread of light
  // gathers from the mouth, the bolt falls with the sky converging on it, and between them a stream of light keeps pouring down the line
  const POUR = ['#ffc24a', '#4ad8ff', '#eaffff'];
  function pour(ctx, t, room) {
    const ch = charge(room, t);
    if (!ch) return;
    const lastEnd = ch.t0 + (ch.n - 1) * ch.every + 0.9;
    if (t < ch.t0 - 0.6 || t > lastEnd + 0.8) return;
    const x0 = FACE.x, y0 = FACE.y + 118, x1 = 0, y1 = -26;
    const flow = c01((t - (ch.t0 - 0.5)) / 0.4) * (1 - c01((t - lastEnd) / 0.7));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // the stream: bright dashes falling down the line to the heart
    for (let i = 0; i < 14 && flow > 0.02; i++) {
      const q = (t * 2.3 + i / 14) % 1, yy = lerp(y0, y1, q), xx = Math.sin(i * 5.3 + t * 7) * (18 * (1 - q) + 5);
      line(ctx, xx, yy, xx * 0.92, yy + 36, rgba('#eaffff', 0.75 * flow * (0.35 + 0.65 * q)), 2.2);
    }
    for (let k = 0; k < ch.n; k++) {
      const a = t - (ch.t0 + k * ch.every), col = POUR[k % 3];
      if (a < -0.6 || a > 0.8) continue;
      const fl = a < 0 ? 0.3 * (1 + a / 0.6) : Math.pow(Math.max(0, 1 - a / 0.8), 1.2);
      // the column of light down the whole line
      column(ctx, 0, y1, y0, 60, col, 0.5 * fl, 0.15);
      crack(ctx, x0, y0, x1 + (k - 1) * 8, y1, t, k * 17 + 3, col, 6.5, fl, 30, 15, 0.1);
      crack(ctx, x0 + 14, y0 + 20, x1 - 10, y1 - 6, t, k * 17 + 9, col, 3.2, 0.7 * fl, 30, 12, 0.16);
      if (a >= 0) {
        // the sky comes in behind it: bolts running in from the whole ring of cloud, and the heart where it lands
        for (let i = 0; i < 7; i++) {
          const an = hs(k * 11 + i, 5) * TAU2, sx = Math.cos(an) * 620, sy = Math.sin(an) * 540 - 60;
          crack(ctx, sx, sy, x1, y1, t, k * 29 + i * 5, col, 1.9, 0.65 * fl, 24, 9, 0.18);
        }
        glow(ctx, 0, -20, 190, col, 0.75 * fl); glow(ctx, 0, -20, 90, '#ffffff', 0.7 * fl);
      }
    }
    ctx.restore();
  }

  function over(ctx, room, t, env) {
    const s = seq(room, t);
    if (!s.storm) return;
    pour(ctx, t, room);
    if (s.face < 0.3) return;
    armsFor(ctx, t, env || { tgs: new Map() }, c01((s.face - 0.3) / 0.5));
  }

  // ---------------------------------------------------------------------------------------------------------- the body
  // the body trembling as it cracks (art units, before the giant's scale)
  // (in the calm it goes still, and only jolts with each beat of the heart)
  function tremble(pk, t, pr) {
    if (pk <= 0) return [0, 0];
    const h = (pr && pr.stormHush) || 0, a = (0.3 + pk * pk * 3.2) * (1 - 0.94 * h) + 2.4 * ((pr && pr.stormBeat) || 0);
    return [Math.sin(t * 61) * a, Math.sin(t * 47 + 1) * a];
  }
  const CRACKS = [[-6, -36, -14, -22, -6, -12, -12, -2, -4, 10], [-8, 38, -16, 24, -8, 14, -14, 4], [-26, -4, -16, -8, -6, -2, 6, -8, 16, -4], [-24, 14, -14, 8, -4, 12, 8, 8],
    [-10, -30, 2, -22, 10, -26], [-18, 28, -6, 30, 4, 24, 12, 28], [-26, -16, -18, -12, -22, 2], [-4, -6, 6, 2, 4, 16, 12, 22], [-14, 18, -22, 24, -18, 34]];
  // cracks of light opening in him, chunks of stone breaking off, the light rising in him (pk 0..1 over the cast); drawn in his own frame
  function crumble(ctx, st, pk, angle, pr) {
    if (pk <= 0) return;
    const t = st.t, bt = Math.min(1, (pr && pr.stormBeat) || 0), hu = (pr && pr.stormHush) || 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, -6, 0, (40 + pk * 70) * (1 + 0.5 * bt), '#dff8ff', Math.min(1, (0.1 + 0.7 * pk * pk) * (1 + 0.7 * bt)), pk > 0.7 ? (pk - 0.7) * 3 : 0);
    for (let i = 0; i < CRACKS.length; i++) {
      const g = c01((pk - i * 0.075) / 0.14); if (g <= 0) continue;
      const pts = CRACKS[i], n = Math.max(2, Math.ceil(pts.length / 2 * g)), use = [];
      for (let k = 0; k < n; k++) use.push(pts[k * 2], pts[k * 2 + 1]);
      tracePath(ctx, use); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 3 + pk * 4 + bt * 3 * hu; ctx.strokeStyle = rgba(K.cy, 0.28 * (0.4 + pk) * (1 + 0.8 * bt)); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = rgba('#ffffff', 0.5 + 0.5 * pk); ctx.stroke();
      glow(ctx, use[0], use[1], 16, K.cy, 0.35 * g * pk);
    }
    ctx.restore();
    // chunks coming away: they fall and spin, drifting off in the world's frame (so not with his facing)
    ctx.save(); ctx.rotate(-angle);
    for (let i = 0; i < 14; i++) {
      const t0 = 0.18 + 0.72 * i / 14, age = (pk - t0) * 6.8;
      if (age <= 0 || age > 1.7) continue;
      const a = hs(i, 1) * TAU2, d0 = 12 + hs(i, 2) * 16, sp = 22 + hs(i, 3) * 24, x = Math.cos(a) * (d0 + sp * age), y = Math.sin(a) * (d0 + sp * age) + 30 * age * age, s = 3 + hs(i, 4) * 5;
      ctx.save(); ctx.translate(x, y); ctx.rotate(age * (2 + hs(i, 5) * 4)); ctx.globalAlpha = 1 - age / 1.7;
      poly(ctx, [-s, -s * 0.5, -s * 0.2, -s, s, -s * 0.3, s * 0.7, s, -s * 0.6, s * 0.8], K.stone, OUT, 1.6);
      line(ctx, -s * 0.6, 0, s * 0.5, s * 0.2, rgba(K.cy, 0.8), 1);
      ctx.restore();
    }
    ctx.restore();
  }

  // the Storm Heart: a crackling core with the two charges, gold and blue, running round it; remnants of stone orbit. burstAge: seconds since the body burst.
  function heart(ctx, st, angle, props) {
    const t = st.t, age = props && props.stormAge != null ? props.stormAge - BURST : 99, fresh = age < 2.2;
    ctx.rotate(-angle);
    ctx.translate(0, -18 + Math.sin(t * 1.9) * 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 5.3), flash = age > 0 && age < 0.7 ? 1 - age / 0.7 : 0;
    // the charge: a bolt for each bar it takes back; it blazes brighter with each (and settles once the third has landed)
    const hits = (props && props.stormHits) || 0, ha = props && props.stormHitAge != null ? props.stormHitAge : -1;
    const boost = hits * 0.3 * (hits >= 3 ? 1 - c01((ha - 0.9) / 1.6) : 1), hitK = ha >= 0 && ha < 0.6 ? 1 - ha / 0.6 : 0;
    glow(ctx, 0, 0, (120 + 12 * pulse) * (1 + boost * 0.7), '#5ab8ff', Math.min(1, 0.3 + 0.1 * pulse + boost * 0.25));
    glow(ctx, 0, 0, 60 * (1 + boost * 0.5), K.cy, 0.5, 0.6);
    if (flash) glow(ctx, 0, 0, 220, '#ffffff', 0.8 * flash);
    if (hitK) {
      glow(ctx, 0, 0, 280, '#ffffff', 0.85 * hitK);
      ellipse(ctx, 0, 0, 34 + ha * 330, (34 + ha * 330) * 0.8, 0, null, rgba(POUR[(hits - 1) % 3], 0.85 * hitK), 5 * hitK + 1);
    }
    // the two charges, running round it the opposite ways
    for (let k = 0; k < 2; k++) {
      const col = k ? '#2a9cff' : '#ffb81f', sp = (k ? -1.9 : 1.5);
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.rotate(t * sp + k * Math.PI);
      for (const [r, a0, a1, w] of [[44, 0.15, 2.3, 5], [34, 0.5, 1.8, 3]]) {
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.lineCap = 'round';
        ctx.lineWidth = w * 3.4; ctx.strokeStyle = rgba(col, 0.32); ctx.stroke();
        ctx.lineWidth = w * 1.4; ctx.strokeStyle = rgba(col, 0.95); ctx.stroke();
        ctx.lineWidth = Math.max(1, w * 0.3); ctx.strokeStyle = rgba('#fffbe8', 0.55); ctx.stroke();
      }
      glow(ctx, Math.cos(2.3) * 44, Math.sin(2.3) * 44, 18, col, 0.8, 0.8);
      ctx.restore();
    }
    ctx.restore();
    // the core: white-hot at the middle, going to cold blue, with a cracked dark rind of stone coming away
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 27 + 2 * pulse);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#dff8ff'); g.addColorStop(0.75, '#5aa8e0'); g.addColorStop(1, '#1a3a62');
    ctx.beginPath(); ctx.arc(0, 0, 27 + 2 * pulse, 0, TAU2); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i * TAU2 / 6 + t * 0.4, r = 30 + 4 * Math.sin(t * 2 + i), s = 8 + hs(i, 3) * 4;
      ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.rotate(a + 1.2);
      poly(ctx, [-s, -s * 0.6, 0, -s * 0.9, s, -s * 0.4, s * 0.6, s * 0.7, -s * 0.5, s * 0.6], K.stoneD, OUT, 1.6);
      line(ctx, -s * 0.8, -s * 0.5, s * 0.8, -s * 0.3, rgba(K.cy, 0.7), 1.2);
      ctx.restore();
    }
    // lightning crackling off it
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = hs(Math.floor(t * 12), i) * TAU2, r1 = 62 + hs(Math.floor(t * 12) + i, 2) * 34;
      crack(ctx, Math.cos(a) * 24, Math.sin(a) * 24, Math.cos(a) * r1, Math.sin(a) * r1, t, i * 5, i % 2 ? K.blue : K.gold, 1.5, 0.9, 12, 5, 0.3);
    }
    ctx.restore();
    // just burst: the body's stone thrown out, and cloud puffing off it
    if (fresh && age > 0) {
      for (let i = 0; i < 16; i++) {
        const a = hs(i, 11) * TAU2, d = 30 + (60 + hs(i, 12) * 90) * easeOut(c01(age / 1.6)), s = 4 + hs(i, 13) * 7;
        ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d * 0.9 + 14 * age * age); ctx.rotate(age * (3 + hs(i, 14) * 4) + i); ctx.globalAlpha = c01(1 - age / 2.2);
        poly(ctx, [-s, -s * 0.5, -s * 0.2, -s, s, -s * 0.3, s * 0.7, s, -s * 0.6, s * 0.8], K.stone, OUT, 1.6);
        ctx.restore();
      }
      for (let i = 0; i < 9; i++) { const a = hs(i, 21) * TAU2, d = 20 + 100 * easeOut(c01(age / 1.8)); glow(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.9 - 20 * age, 40 + 30 * age, '#1a2436', 0.6 * c01(1 - age / 2.2)); }
    }
  }

  // the screen's moments (main.js roomev): a rumble as the body cracks, and the burst
  // h: { later(delay, fn), play(name, opts) (the sound, if it is on), duck(amount, secs) (the music) }. Every sound is here and not in the cast's own cue, which
  // only opens the dread (bm-volkar-storm-unbound); the rest follows the clock above, so the thunder meets its flash and the calm is silent.
  function event(msg, h) {
    if (typeof FX === 'undefined') return;
    const shake = v => { FX.shake = Math.max(FX.shake, v); };
    const flash = (col, a, s) => { if (FX.cam && FX.cam.flash) FX.cam.flash(col, a, s); };
    const play = (n, o) => { if (h.play) h.play(n, o); };
    if (msg.k === 'volbreak') {
      const d = Math.max(2, msg.dur || 9.35), calm = d - HUSH;
      // the thunder: each flash was nearer, so its thunder comes sooner behind it and louder (the last two are close claps)
      FLASHES.forEach(([at, lag, size], i) => {
        if (at > calm - 0.6) return;
        h.later(at + lag, () => { play(i < 2 ? 'bm-volkar-storm-roll' : 'bm-volkar-storm-clap', { vol: 0.42 + 0.58 * size, rate: 0.82 + 0.18 * size }); shake(1.4 + 2.2 * size); });
      });
      // the stone groaning, louder each time, with a shudder
      GROANS.forEach(([at, vol]) => { if (at < calm - 0.3) h.later(at, () => { play('bm-volkar-storm-groan', { vol }); shake(1.2 + 1.6 * vol); }); });
    } else if (msg.k === 'volhush') {
      // the calm: the music drops out, one long held sound under it, and a heartbeat of the stone
      if (h.duck) h.duck(0.9, HUSH);
      play('bm-volkar-storm-hush', { vol: 0.9 });
      BEATS.forEach(([at, w]) => h.later(at, () => shake(0.5 + 0.7 * w)));
    } else if (msg.k === 'volrise') {
      h.later(BURST, () => {
        shake(24);
        flash('#f4fcff', 0.85, 0.7);
        if (FX.cam && FX.cam.punch) FX.cam.punch(0.07, 0.7);
        play('bm-volkar-storm-burst', { vol: 1 });
        if (typeof VFX !== 'undefined') { try { VFX.sparks(0, 0, { color: '#bff4ff', n: 60, speed: 620 }); } catch (e) { /* (a missing effect never stops the form) */ } }
      });
      for (let i = 1; i <= 4; i++) h.later(BURST + i * 0.5, () => shake(10 - i * 2));
      // the eyes open and it roars
      h.later(3.0, () => { play('bm-volkar-storm-roar', { vol: 1 }); shake(15); flash('#dff0ff', 0.45, 0.6); });
      for (let i = 1; i <= 5; i++) h.later(3.0 + i * 0.28, () => shake(13 - i * 2));
    } else if (msg.k === 'volcharge') {
      // three bolts pour into the heart, one for each bar it takes back
      const at = msg.at || 3, every = msg.every || 0.8, n = msg.n || 3;
      h.later(Math.max(0, at - 0.4), () => play('bm-volkar-storm-charge', { vol: 1 }));
      for (let i = 0; i < n; i++) h.later(at + i * every, () => {
        shake(9 + 2 * i);
        flash(POUR[i % 3], 0.22 + 0.06 * i, 0.4);
        if (typeof VFX !== 'undefined') { try { VFX.sparks(0, 0, { color: POUR[i % 3], n: 26 + 8 * i, speed: 380 }); } catch (e) { /* (cosmetic) */ } }
      });
      h.later(at + (n - 1) * every + 1.0, () => play('bm-volkar-storm-heart', { vol: 0.85 }));
    }
  }

  return { under, over, heart, crumble, tremble, event, buildStormPeak, seq, props, charge, FACE, SHOULDER, BURST, HUSH };
})();

if (typeof ArenaView !== 'undefined') ArenaView.buildStormPeak = VK_STORM.buildStormPeak;
