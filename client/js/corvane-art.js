// Corvane, the Unburied Blade: everything he looks like and the pass he stands in, drawn in code. His body (a tall dead guard in
// black lacquered armour cracked with frost, a stiff tattered cloak, a broad single-edged blade), the Whetstone gauge on the
// back edge of his blade, his stance, the Vigil's kneel and a pose for each of his casts; the wisp; the stone lantern; the room's
// floor (snow over stone flags, the ruined shrine, rock pillars and cliffs, the Fallen Star in the northern sky) and its life.
// Loaded after arena-view.js and set3-sky.js; it adds to BOSS_ART / ADD_ART / ArenaView itself.
// Look: the user's painted sheets (docs/art/vfx-reference/corvane-1.png, -2.png): moonlit blue-grey snow, black lacquer, frost-cyan
// and white for every danger, warm amber only in the lantern flames.
//
// st.props (main.js, boss-vfx.js CAST_POSE):
//   stance 'crane' | 'comet' | 'parting' | null   what he is about to unleash (blade low and back / raised high / planted in the snow)
//   notch 0-4, over                                the Whetstone: lit notches on the blade's back edge; Hard's extra ones flicker past the tip
//   kneel                                          the Vigil: kneeling in the snow, blade across his knees
//   cast poses (held while the move runs): raise (Sundering Cut, Cracked Guard), draw (Draw Cut), sweepL / sweepR (Scabbard Sweep, the
//   scabbard out to that side), still (Still Water: planted parry), gale (White Gale), breath (Hollow Breath), sheathe (Cold Sheathe),
//   burn (the whole edge alight: the enrage)

const CV_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const K = {
    lac: '#12151d', lacM: '#1d2331', lacH: '#37425a', cloak: '#151a29', cloakH: '#27304a', cloakE: '#3b4a70',
    steel: '#414d63', steelH: '#cfdcf0', steelD: '#27304380', frost: '#bfeaff', cyan: '#7fd8ff', ice: '#eaf9ff',
    amber: '#ffb44a', amberH: '#ffe3a2', stone: '#6a7588', snow: '#dce8f8',
  };

  // a frost crack: a jagged cyan line from (x, y) heading a, with one small branch (drawn in the figure's own frame)
  function crack(ctx, x, y, a, len, seed, al = 0.85) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = [x, y]; let px = x, py = y, an = a;
    const n = 4;
    for (let i = 0; i < n; i++) { an += (hash(i, seed) - 0.5) * 1.3; px += Math.cos(an) * len / n; py += Math.sin(an) * len / n; pts.push(px, py); }
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.strokeStyle = rgba('#04101e', 0.7 * al); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = rgba('#a8e4ff', al); ctx.lineWidth = 1; ctx.stroke();
    const bx = pts[4], by = pts[5], ba = a + (hash(seed, 9) < 0.5 ? 1 : -1) * 0.9;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ba) * len * 0.35, by + Math.sin(ba) * len * 0.35);
    ctx.strokeStyle = rgba('#a8e4ff', al * 0.8); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the blade
  // A broad single-edged blade from its guard (gx, gy) to its tip (tx, ty), hilt behind the guard. The back edge (the spine) is
  // turned away from his body; the Whetstone is a line of light along it in four notches. o: { w, n (notches lit), over, burn, t, side }
  function sword(ctx, gx, gy, tx, ty, o) {
    const t = o.t || 0, n = Math.min(4, o.n | 0), over = o.over | 0, full = n >= 4 || !!o.burn;
    const dx = tx - gx, dy = ty - gy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const s = o.side || ((nx * (gx + tx) / 2 + ny * (gy + ty) / 2) >= 0 ? 1 : -1), sx = nx * s, sy = ny * s, hw = (o.w || 9) / 2;
    const flick = 0.82 + 0.18 * Math.sin(t * 17) + 0.06 * Math.sin(t * 41);
    // the hilt: wrapped grip, round pommel
    const hx = gx - ux * 17, hy = gy - uy * 17;
    line(ctx, hx, hy, gx, gy, OUT, 7); line(ctx, hx, hy, gx, gy, '#1b2132', 4.4);
    for (let i = 1; i < 4; i++) { const q = i / 4, qx = lerp(hx, gx, q), qy = lerp(hy, gy, q); line(ctx, qx - nx * 2.4 + ux * 1.4, qy - ny * 2.4 + uy * 1.4, qx + nx * 2.4 - ux * 1.4, qy + ny * 2.4 - uy * 1.4, '#6e7d97', 1); }
    circle(ctx, hx - ux * 1.5, hy - uy * 1.5, 3.2, '#5a6780', OUT, 1.6);
    // the glow of the edge when the gauge is full
    if (full) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const q of [0.15, 0.4, 0.65, 0.9]) glow(ctx, lerp(gx, tx, q), lerp(gy, ty, q), 30 + (o.burn ? 10 : 0), '#9fe4ff', 0.5 * flick);
      ctx.restore();
    }
    // the blade: a slab, spine straight, the point cut across
    poly(ctx, [gx + sx * hw, gy + sy * hw, tx - ux * 11 + sx * hw * 0.9, ty - uy * 11 + sy * hw * 0.9, tx, ty, gx - sx * hw, gy - sy * hw], full ? '#6a7a96' : K.steel, OUT, 2.4);
    line(ctx, gx + ux * 9 - sx * hw * 0.1, gy + uy * 9 - sy * hw * 0.1, tx - ux * 20, ty - uy * 20, '#2a3347', 1.6);                                  // the groove
    line(ctx, gx - sx * hw * 0.88, gy - sy * hw * 0.88, tx - ux * 1.2, ty - uy * 1.2, rgba(full ? '#ffffff' : K.steelH, full ? 1 : 0.85), full ? 2.2 : 1.5);   // the edge
    // frost clinging near the guard
    for (let i = 0; i < 3; i++) { const q = 0.08 + i * 0.07, qx = lerp(gx, tx, q) - sx * hw * 0.7, qy = lerp(gy, ty, q) - sy * hw * 0.7; line(ctx, qx, qy, qx - sx * 3 + ux * 2, qy - sy * 3 + uy * 2, rgba(K.ice, 0.8), 1); }
    // the guard
    line(ctx, gx - nx * 8.5, gy - ny * 8.5, gx + nx * 8.5, gy + ny * 8.5, OUT, 6.5); line(ctx, gx - nx * 8.5, gy - ny * 8.5, gx + nx * 8.5, gy + ny * 8.5, '#6c7a94', 3.4);
    // the Whetstone: four notches in a line along the back edge, lit from the guard up
    const o0 = hw - 1.9, a0x = gx + ux * 11 + sx * o0, a0y = gy + uy * 11 + sy * o0, a1x = tx - ux * 17 + sx * o0 * 0.9, a1y = ty - uy * 17 + sy * o0 * 0.9;
    const seg = (i, w, col, al) => {
      const q0 = i / 4 + 0.018, q1 = (i + 1) / 4 - 0.018;
      line(ctx, lerp(a0x, a1x, q0), lerp(a0y, a1y, q0), lerp(a0x, a1x, q1), lerp(a0y, a1y, q1), rgba(col, al), w);
    };
    for (let i = 0; i < 4; i++) seg(i, 2.6, '#8fb6e8', 0.35);                          // the empty slots
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const lit = full || i < n; if (!lit) continue;
      const newest = !full && i === n - 1 ? 0.8 + 0.2 * Math.sin(t * 7) : 1;
      const mx = lerp(a0x, a1x, (i + 0.5) / 4), my = lerp(a0y, a1y, (i + 0.5) / 4);
      glow(ctx, mx, my, 15, K.cyan, 0.7 * newest * (full ? flick : 1));
      seg(i, 5, K.cyan, 0.55 * newest); seg(i, 2.6, '#ffffff', (full ? 1 : 0.95) * newest);
    }
    if (full) {   // the whole edge burns white
      line(ctx, gx - sx * hw, gy - sy * hw, tx, ty, rgba('#bfeaff', 0.55 * flick), 9);
      line(ctx, gx - sx * hw, gy - sy * hw, tx, ty, rgba('#ffffff', 0.95 * flick), 3);
      glow(ctx, tx, ty, 22, '#ffffff', 0.7 * flick);
    }
    // past the top (Hard): flame that will not stay on the blade, flickering off the point
    for (let k = 0; k < over; k++) {
      const j = Math.sin(t * 23 + k * 2.1), h = 12 + k * 7 + 5 * j, ox = (k - (over - 1) / 2) * 5 + 2 * Math.sin(t * 31 + k);
      poly(ctx, [tx + nx * (ox - 2.8), ty + ny * (ox - 2.8), tx + ux * h + nx * ox * 1.5, ty + uy * h + ny * ox * 1.5, tx + nx * (ox + 2.8), ty + ny * (ox + 2.8)], rgba('#e8fbff', 0.9));
      glow(ctx, tx + ux * h * 0.5, ty + uy * h * 0.5, 14, '#ffffff', 0.5);
    }
    ctx.restore();
  }

  // a sheathed blade (Scabbard Sweep): black lacquer scabbard with a white cord, a bright chape, the notches showing in a seam
  function scabbard(ctx, gx, gy, tx, ty, o) {
    const dx = tx - gx, dy = ty - gy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, n = Math.min(4, o.n | 0), t = o.t || 0;
    const hx = gx - ux * 15, hy = gy - uy * 15;
    line(ctx, hx, hy, gx, gy, OUT, 6.5); line(ctx, hx, hy, gx, gy, '#1b2132', 4);
    line(ctx, gx, gy, tx, ty, OUT, 12.5); line(ctx, gx, gy, tx, ty, '#1a2030', 9); line(ctx, gx + nx * 1.6, gy + ny * 1.6, tx + nx * 1.6, ty + ny * 1.6, 'rgba(120,140,180,0.5)', 1.3);
    for (let i = 0; i < 3; i++) { const q = 0.25 + i * 0.22; line(ctx, lerp(gx, tx, q) - nx * 4, lerp(gy, ty, q) - ny * 4, lerp(gx, tx, q) + nx * 4, lerp(gy, ty, q) + ny * 4, rgba(K.frost, 0.55), 1.2); }
    line(ctx, gx - nx * 8, gy - ny * 8, gx + nx * 8, gy + ny * 8, OUT, 6); line(ctx, gx - nx * 8, gy - ny * 8, gx + nx * 8, gy + ny * 8, '#6c7a94', 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const q = 0.18 + i * 0.2; circle(ctx, lerp(gx, tx, q) - nx * 3.4, lerp(gy, ty, q) - ny * 3.4, 1.5, rgba(i < n ? '#ffffff' : '#6f93c8', i < n ? 1 : 0.35)); if (i < n) glow(ctx, lerp(gx, tx, q) - nx * 3.4, lerp(gy, ty, q) - ny * 3.4, 10, K.cyan, 0.6); }
    glow(ctx, tx, ty, 16, K.cyan, 0.45 + 0.1 * Math.sin(t * 9));
    ctx.restore();
    circle(ctx, tx, ty, 3.2, '#dfeaf8', OUT, 1.4);
  }

  // ---------------------------------------------------------------------------------------------------------- the figure
  function cloak(ctx, t, sway, flare, small) {
    const N = 9, hem = small ? -28 : -40, W = 19, pts = [6, -14, -2, -W * flare];
    for (let i = 0; i <= N; i++) {
      const u = i / N, y = (-W + u * 2 * W) * flare;
      pts.push(hem * (0.72 + 0.28 * Math.sin(u * Math.PI)) * (flare > 1 ? 1.2 : 1) - (i % 2 ? 7 : 0) + Math.sin(t * 2.3 + i * 0.9) * sway, y + Math.sin(t * 1.7 + i) * sway * 0.4);
    }
    pts.push(-2, W * flare, 6, 14);
    poly(ctx, pts, '#141a2b', OUT, 2.6);
    // the stiff folds, lit along one side
    for (let i = 2; i < N; i += 3) {
      const x = pts[4 + i * 2], y = pts[5 + i * 2];
      line(ctx, -1, (i / N - 0.5) * 2 * 14, x, y, rgba('#232f4c', 0.95), 3);
      line(ctx, -1, (i / N - 0.5) * 2 * 14 - 1, x + 2, y - 1, rgba('#3b4a72', 0.6), 1);
    }
    // frost caught in the ragged hem
    ctx.save(); ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = pts[4 + i * 2], y = pts[5 + i * 2]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = rgba(K.frost, 0.7); ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    for (let i = 0; i <= N; i += 2) { const x = pts[4 + i * 2], y = pts[5 + i * 2]; circle(ctx, x, y, 1.6, rgba('#f2fbff', 0.95)); }
    for (let i = 0; i < 6; i++) circle(ctx, -7 - hash(i, 3) * 24, (hash(i, 4) - 0.5) * 26 * flare, 0.9 + hash(i, 5), rgba('#e8f4ff', 0.7));   // snow settled on it
  }
  // the helm: a lacquered kabuto with a crescent crest, swept horns and two cold eyes
  function head(ctx, t, lean, lit, bow) {
    ctx.save(); ctx.translate(3 + lean, 0); ctx.scale(1.12, 1.12);
    ellipse(ctx, -6, 0, 7.5, 12.5, 0, '#141824', OUT, 2.2);                              // the neck guard behind it
    for (const sy of [-1, 1]) {                                                           // the horns, swept forward
      poly(ctx, [4, sy * 5.5, 13, sy * 8, 24, sy * 15.5, 26, sy * 14.5, 22, sy * 9.5, 12, sy * 5], '#9aa9c4', OUT, 1.8);
      poly(ctx, [14, sy * 8, 24, sy * 15, 25, sy * 14, 15, sy * 7.2], '#e8f2ff');
    }
    circle(ctx, 0, 0, 8.6 - bow * 0.6, K.lac, OUT, 2.5);                                  // the crown
    line(ctx, -7.5, 0, 7.5, 0, K.lacH, 2.4);
    for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(0, 0, 6.2, sy * 0.6, sy * 2.4, sy < 0); ctx.strokeStyle = rgba(K.lacH, 0.8); ctx.lineWidth = 1.3; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(5.5, -8.5); ctx.quadraticCurveTo(14, 0, 5.5, 8.5); ctx.strokeStyle = OUT; ctx.lineWidth = 4.6; ctx.stroke(); ctx.strokeStyle = '#c4d2ea'; ctx.lineWidth = 2.2; ctx.stroke();   // the crescent on the brow
    crack(ctx, -3, -5, 0.4, 7, 3); crack(ctx, -2, 5, -0.3, 6, 8, 0.7);
    for (const sy of [-1, 1]) { glow(ctx, 8.2, sy * 2.6, 9, K.cyan, 0.5 + 0.35 * lit); circle(ctx, 8.2, sy * 2.6, 1.45, lit > 0.9 ? '#ffffff' : '#d8f6ff'); }
    ctx.restore();
  }
  function torso(ctx, lean, cr) {
    // the back and breastplate, black lacquer; a standing collar round the neck
    ellipse(ctx, -1, 0, 12, 14.5, 0, '#1b202e', OUT, 2.6);
    for (const q of [-6, -2, 2, 6]) line(ctx, q, -11, q, 11, rgba('#43506e', 0.75), 1.4);   // the lames
    line(ctx, -9, 0, 9, 0, rgba('#43506e', 0.5), 1.2);
    // pauldrons: three layered lames each, a lit rim, frost growing at the outer corners
    for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(-0.5, sy * 15.5); ctx.rotate(sy * 0.16);
      rrect(ctx, -11.5, -8.5, 23, 17, 5, '#222a3d', OUT, 2.4);
      rrect(ctx, -8.5, -6.5, 17, 13, 4, '#2a3348', OUT, 1.6);
      rrect(ctx, -5.5, -4.5, 11, 9, 3, '#38445f', OUT, 1.3);
      ctx.beginPath(); ctx.moveTo(-9.5, sy * -6.5); ctx.lineTo(9.5, sy * -6.5); ctx.strokeStyle = rgba('#7c8fb5', 0.8); ctx.lineWidth = 1.2; ctx.stroke();
      for (const [px, py, h] of [[-3, sy * 10.5, 5], [4, sy * 10.5, 4.5]]) poly(ctx, [px - 2, py - sy * 2.5, px, py + sy * h, px + 2, py - sy * 2.5], '#eaf9ff', OUT, 0.9);
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 10.5, 0, 0, TAU); ctx.strokeStyle = '#242c40'; ctx.lineWidth = 4.2; ctx.stroke(); ctx.strokeStyle = rgba('#5a6a90', 0.7); ctx.lineWidth = 1; ctx.stroke();   // the collar
    line(ctx, 9.5, -6.5, 9.5, 6.5, rgba(K.cyan, 0.25 + 0.25 * cr), 1.5);
    crack(ctx, 2, -11, 1.9, 12, 1); crack(ctx, -3, 11, -1.5, 11, 5, 0.8); crack(ctx, 0.5, -19, 2.1, 9, 11, 0.8); crack(ctx, -1, 19, -2.1, 8, 14, 0.8);
  }
  // a gauntleted hand
  const fist = (ctx, x, y) => circle(ctx, x, y, 4.1, '#262e41', OUT, 1.8);
  // a sleeve from the shoulder (sx, sy) to the hand (hx, hy), the elbow bent out to one side
  function arm(ctx, sx, sy, hx, hy, bend) {
    const mx = (sx + hx) / 2, my = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1;
    limb(ctx, [sx, sy, mx - dy / L * bend, my + dx / L * bend, hx, hy], '#1a1f2d', 8);
    line(ctx, sx, sy, mx - dy / L * bend, my + dx / L * bend, rgba(K.lacH, 0.45), 1.4);
  }

  // the body. Facing +x like the others; the hands and blade are laid out on the screen's axes (up is up) so a raised blade and a
  // point-down blade read the same whichever way he faces, and a blade lying low is laid in the floor's own plane.
  function corvane(ctx, st, angle = 0) {
    const pr = st.props || {}, t = st.t || 0;
    const ca = Math.cos(angle), sa = Math.sin(angle), S = (x, y) => [x * ca - y * sa, x * sa + y * ca];
    const notch = Math.min(4, pr.notch | 0), over = pr.over | 0;
    const burn = !!pr.burn || (notch >= 4);
    const act = actP(st, 'attack'), sw = swing(act);
    const windUp = act < 0 || act < 0.3 ? 1 : sw;           // 1 while he gathers, then the stroke, 1 -> -1.2
    const stance = pr.stance || null, kneel = !!pr.kneel;
    let pose = 'idle';
    if (kneel) pose = 'kneel';
    else if (pr.sweepL || pr.sweepR) pose = 'sweep';
    else if (pr.still) pose = 'still';
    else if (pr.sheathe) pose = 'plant';
    else if (pr.draw) pose = 'draw';
    else if (pr.raise) pose = 'raise';
    else if (stance === 'comet') pose = 'comet';
    else if (stance === 'crane') pose = 'crane';
    else if (stance === 'parting') pose = 'plant';
    else if (pr.breath) pose = 'breath';
    const crouch = pose === 'crane' ? 1 : 0, flare = pr.gale ? 1.4 : 1;
    const breathe = Math.sin(t * 1.6) * 0.7, moving = st.moving ? 1 : 0;
    const full = burn ? 1 : 0;

    // the cold round him; more of it the fuller the gauge
    glow(ctx, 0, 0, 62 + notch * 5, K.cyan, 0.08 + 0.05 * notch + (full ? 0.12 : 0));
    if (pose === 'kneel') {   // the snow heaped about his knees
      ellipse(ctx, 6, 0, 36, 40, 0, rgba('#cddcf0', 0.55)); ellipse(ctx, 6, 0, 28, 31, 0, rgba('#e8f2ff', 0.5));
    }
    if (pr.gale) for (let i = 0; i < 7; i++) {   // wind streaming back from him
      const q = (t * 1.5 + i / 7) % 1, y = (hash(i, 2) - 0.5) * 70;
      line(ctx, -26 - q * 40, y, -52 - q * 70, y + (hash(i, 7) - 0.5) * 8, rgba('#e8f6ff', 0.55 * (1 - q)), 2.2);
    }
    ctx.save(); ctx.scale(pose === 'kneel' ? 0.92 : crouch ? 0.94 : 1, pose === 'kneel' ? 0.92 : crouch ? 1.06 : 1);
    cloak(ctx, t, pose === 'kneel' ? 0.4 : 1.1 + moving * 1.4 + (pr.gale ? 2.2 : 0), flare, pose === 'kneel');
    ctx.restore();

    // ---- what lies in the floor's own plane: a low blade (Rising Crane) swept back, a sheathed one swung out to the side
    const lean = crouch ? 5 : pose === 'plant' || pose === 'still' ? 3 : pose === 'kneel' ? 5 : 0;
    ctx.save(); ctx.translate(lean * 0.5, 0);
    if (pose === 'crane') {
      const [gx, gy] = S(4, 19), [tx, ty] = S(-66, 38);
      for (let i = 0; i < 5; i++) { const q = (t * 1.1 + i / 5) % 1, [px, py] = S(-30 - q * 52, 30 + q * 14 + (hash(i, 1) - 0.5) * 10); circle(ctx, px, py, 1.6 + (1 - q) * 1.4, rgba('#e8f6ff', 0.5 * (1 - q))); }   // ice flung up behind the point
      ctx.save(); ctx.rotate(-angle); sword(ctx, gx, gy, tx, ty, { w: 11, n: notch, over, burn: full, t }); ctx.restore();
    }
    ctx.restore();
    ctx.save(); ctx.scale(pose === 'kneel' ? 0.92 : crouch ? 0.94 : 1, pose === 'kneel' ? 0.92 : crouch ? 1.06 : 1);
    torso(ctx, lean, notch / 4);
    ctx.restore();

    // ---- hands and blade, on the screen's axes
    ctx.save(); ctx.rotate(-angle);
    const sh = (sy) => S(0, sy * 15);
    const L = sh(-1), R = sh(1);
    const swordOf = (g, tip, w = 13) => sword(ctx, g[0], g[1], tip[0], tip[1], { w, n: notch, over, burn: full, t });
    if (pose === 'idle' || pose === 'breath') {
      // point-down in his right hand like a walking staff, a little forward
      const hp = S(9, 17), hand = [hp[0], hp[1] - 2 + breathe * 0.3], d = [0.12 + 0.15 * (ca > 0 ? 1 : 0), 1], dl = Math.hypot(d[0], d[1]);
      const g = [hand[0] + d[0] / dl * 8, hand[1] + d[1] / dl * 8], tip = [g[0] + d[0] / dl * 56, g[1] + d[1] / dl * 56];
      const lh = S(6, -15);
      arm(ctx, L[0], L[1], lh[0], lh[1] + 1, 4); arm(ctx, R[0], R[1], hand[0], hand[1], -4);
      swordOf(g, tip); fist(ctx, hand[0], hand[1]); fist(ctx, lh[0], lh[1] + 1);
      circle(ctx, tip[0], tip[1], 5, null, rgba('#e8f4ff', 0.4), 1.4);   // where the point rests in the snow
    } else if (pose === 'plant' || pose === 'still') {
      // planted point-down in the snow in front of him, both hands on the pommel
      const p = S(21, 0), hand = [p[0], p[1] - 6 + breathe * 0.4], g = [hand[0], hand[1] + 9], tip = [hand[0], hand[1] + 58];
      const l1 = [hand[0] - 3, hand[1] + 1], l2 = [hand[0] + 3, hand[1] - 2];
      // snow thrown up at the point, and (Still Water) glass spreading out over the snow round it
      if (pose === 'still') for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ellipse(ctx, tip[0], tip[1], 12 + q * 50, (12 + q * 50) * 0.55, 0, null, rgba('#bfeaff', 0.7 * (1 - q)), 2.2); }
      ellipse(ctx, tip[0], tip[1], 14, 7.5, 0, rgba('#dfeaf8', 0.85), OUT, 1.6);
      arm(ctx, L[0], L[1], l1[0], l1[1], 3); arm(ctx, R[0], R[1], l2[0], l2[1], -3);
      swordOf(g, tip, 12); fist(ctx, l1[0], l1[1]); fist(ctx, l2[0], l2[1]);
      ellipse(ctx, tip[0], tip[1] + 1, 9, 4.5, 0, rgba('#f2f8ff', 0.95));
      if (pr.sheathe) { const q = 0.5 + 0.5 * Math.sin(t * 14); glow(ctx, tip[0], tip[1], 56, '#ffffff', 0.35 + 0.25 * q); }
    } else if (pose === 'comet') {
      // raised high over his head, point to the sky, leaning the way he will go
      const dir = S(1, 0), hp = S(4, 0), hand = [hp[0], hp[1] - 17], d0 = [dir[0] * 0.28, -1], dl = Math.hypot(d0[0], d0[1]), d = [d0[0] / dl, d0[1] / dl];
      const g = [hand[0] + d[0] * 8, hand[1] + d[1] * 8], tip = [g[0] + d[0] * 90, g[1] + d[1] * 90];
      const l1 = [hand[0] - 3, hand[1] + 4], l2 = [hand[0] + 3, hand[1] - 1];
      arm(ctx, L[0], L[1], l1[0], l1[1], 5); arm(ctx, R[0], R[1], l2[0], l2[1], -5);
      swordOf(g, tip, 14); fist(ctx, l1[0], l1[1]); fist(ctx, l2[0], l2[1]);
    } else if (pose === 'raise') {
      // Sundering Cut / Cracked Guard / the enrage: up for the stroke, then down the way he faces
      const k = windUp >= 1 ? 1 : clamp((sw + 1.2) / 2.2, 0, 1), dir = S(1, 0), hp = S(6, 0);
      const hand = [hp[0], hp[1] - 15 * k + 4 * (1 - k)];
      const upTip = [hand[0] + dir[0] * 20, hand[1] - 92], fwd = S(88, 0), fTip = [fwd[0], fwd[1] + 10];
      const tip = [lerp(fTip[0], upTip[0], k), lerp(fTip[1], upTip[1], k)];
      const dx = tip[0] - hand[0], dy = tip[1] - hand[1], dl = Math.hypot(dx, dy) || 1, g = [hand[0] + dx / dl * 8, hand[1] + dy / dl * 8];
      const l1 = [hand[0] - 3, hand[1] + 4], l2 = [hand[0] + 3, hand[1] - 1];
      if (k < 0.35) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, fTip[0] * 0.6, fTip[1] * 0.6, 60, '#dff6ff', 0.5 * (1 - k / 0.35)); ctx.restore(); }
      arm(ctx, L[0], L[1], l1[0], l1[1], 5); arm(ctx, R[0], R[1], l2[0], l2[1], -5);
      swordOf(g, tip, 12); fist(ctx, l1[0], l1[1]); fist(ctx, l2[0], l2[1]);
    } else if (pose === 'draw') {
      // Draw Cut: the blade whips out level along the way he faces
      const phi = -0.14 + clamp(windUp, -0.4, 1) * 2.3, hp = S(9, 13), g = [hp[0], hp[1]];
      const a = [Math.cos(phi), Math.sin(phi)], e = S(a[0] * 82, a[1] * 82), tip = [hp[0] + e[0], hp[1] + e[1]];
      const hl = S(0, -15), g2 = [g[0] - (tip[0] - g[0]) / 8, g[1] - (tip[1] - g[1]) / 8];
      if (windUp < 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; line(ctx, g[0], g[1], tip[0] + 22 * a[0], tip[1] + 22 * a[1], rgba('#ffffff', 0.7), 3); glow(ctx, tip[0], tip[1], 40, '#bfeaff', 0.6); ctx.restore(); }
      arm(ctx, L[0], L[1], hl[0], hl[1], 4); arm(ctx, R[0], R[1], g2[0], g2[1], -4);
      swordOf([g[0] + (tip[0] - g[0]) * 0.1, g[1] + (tip[1] - g[1]) * 0.1], tip, 10); fist(ctx, hl[0], hl[1]); fist(ctx, g2[0], g2[1]);
    } else if (pose === 'sweep') {
      // Scabbard Sweep: the sheathed blade swung out to one side; the scabbard points to the side the floor is painted on
      const side = pr.sweepL ? -1 : 1, al = side * (0.3 + 2.1 * clamp((windUp + 1.2) / 2.2, 0, 1));
      const hp = S(3, side * 15), a = [Math.cos(al), Math.sin(al)], e = S(a[0] * 64, a[1] * 64), tip = [hp[0] + e[0], hp[1] + e[1]];
      if (windUp < 0.999) {   // the sweep's wind
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); const a0 = side * 2.45, r = 58 + i * 11; for (let j = 0; j <= 12; j++) { const aa = lerp(a0, al, j / 12), [px, py] = S(Math.cos(aa) * r, side * 15 + Math.sin(aa) * r); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.strokeStyle = rgba('#e8f8ff', 0.5 - i * 0.14); ctx.lineWidth = 3 - i * 0.7; ctx.stroke(); }
        ctx.restore();
      }
      const other = sh(-side), oh = S(5, -side * 15);
      arm(ctx, other[0], other[1], oh[0], oh[1] + 1, 4);
      arm(ctx, side > 0 ? R[0] : L[0], side > 0 ? R[1] : L[1], hp[0], hp[1], 4 * side);
      scabbard(ctx, hp[0], hp[1], tip[0], tip[1], { n: notch, t }); fist(ctx, hp[0], hp[1]); fist(ctx, oh[0], oh[1] + 1);
    } else if (pose === 'crane') {
      const [g1, g2] = [S(4, 19), S(0, -15)];
      arm(ctx, L[0], L[1], g2[0] + 6, g2[1] + 2, 4); arm(ctx, R[0], R[1], g1[0], g1[1], -4); fist(ctx, g1[0], g1[1]); fist(ctx, g2[0] + 6, g2[1] + 2);
    } else if (pose === 'kneel') {
      // the Vigil: kneeling, the blade laid across his knees, his hands upon it
      const g = S(16, 36), tip = S(16, -42), h1 = S(16, 8), h2 = S(16, -9);
      arm(ctx, L[0], L[1], h2[0], h2[1], 3); arm(ctx, R[0], R[1], h1[0], h1[1], -3);
      swordOf(g, tip, 12); fist(ctx, h1[0], h1[1]); fist(ctx, h2[0], h2[1]);
    }
    ctx.restore();

    // ---- the head over it all
    ctx.save(); if (pose === 'kneel') ctx.scale(0.92, 0.92);
    head(ctx, t, pose === 'kneel' ? 4 : crouch ? 5 : pose === 'plant' ? 2 : 0, Math.min(1, notch / 4 + full), pose === 'kneel' || pr.breath ? 1 : 0);
    ctx.restore();
    if (pr.breath) {   // Hollow Breath: cold pouring from the helm
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const q = (t * 0.9 + i / 6) % 1; glow(ctx, 12 + q * 48, (hash(i, 6) - 0.5) * 18 * q, 12 + q * 22, '#dff2ff', 0.38 * (1 - q)); }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------------------------------------- the wisp
  // a small cold flame of the pass: a bright head and a ragged tail trailing behind it (drawn facing +x, the way it drifts)
  function wisp(ctx, st) {
    const t = st.t || 0, bob = Math.sin(t * 3.1) * 1.5;
    glow(ctx, -2, bob, 36, K.cyan, 0.45 + 0.1 * Math.sin(t * 6));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {   // tail strands
      const ph = i * 1.7, y0 = (i - 1.5) * 2.4;
      ctx.beginPath(); ctx.moveTo(0, bob + y0);
      for (let j = 1; j <= 5; j++) ctx.lineTo(-j * 6, bob + y0 + Math.sin(t * 5 + ph + j * 0.9) * (1.4 + j * 0.9));
      ctx.strokeStyle = rgba(i % 2 ? '#bfeaff' : K.cyan, 0.42); ctx.lineWidth = 4.6 - i * 0.7; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
    // the head: a teardrop of pale flame, two dark eyes
    ctx.beginPath(); ctx.moveTo(-10, bob); ctx.bezierCurveTo(-4, bob - 10, 8, bob - 9, 10, bob); ctx.bezierCurveTo(8, bob + 9, -4, bob + 10, -10, bob); ctx.closePath(); ctx.fillStyle = rgba('#cdeeff', 0.92); ctx.fill(); ctx.strokeStyle = '#eaf9ff'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(ctx, 1, bob, 4.6, '#ffffff');
    circle(ctx, 4.5, bob - 2.4, 1.3, '#16304a'); circle(ctx, 4.5, bob + 2.4, 1.3, '#16304a');
    for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; circle(ctx, -4 - q * 10 + Math.sin(i * 3) * 3, bob + (i - 1) * 7 * q, 1.1 + (1 - q), rgba('#ffffff', 0.8 * (1 - q))); }   // flakes shed off it
  }

  // ---------------------------------------------------------------------------------------------------------- the stone lantern
  // a squat stone lantern with a snow cap and a warm flame. Standing on its base at (pr.x, pr.y), r 30; the amber is the only warm colour in the pass.
  function lantern(ctx, pr, t) {
    const out = typeof CV_FX !== 'undefined' && CV_FX.out && CV_FX.out(pr);   // (its flame snuffed: the enrage, or until a wisp brings it back: corvane-fx.js)
    const { x, y } = pr, ph = pr.id * 1.7, fl = out ? 0.04 : 0.8 + 0.12 * Math.sin(t * 9 + ph) + 0.08 * Math.sin(t * 23 + ph * 2) + 0.05 * Math.sin(t * 3.1 + ph);
    ellipse(ctx, x + 5, y + 7, 33, 15, 0, 'rgba(2,4,12,0.5)');
    const face = '#7a879c', faceD = '#4a556a', faceL = '#9aa8be';
    // the base slab
    poly(ctx, [x - 29, y + 3, x - 25, y - 6, x + 25, y - 6, x + 29, y + 3, x + 24, y + 9, x - 24, y + 9], faceD, OUT, 2.4);
    poly(ctx, [x - 25, y - 6, x + 25, y - 6, x + 22, y - 10, x - 22, y - 10], faceL, OUT, 1.6);
    // the post
    rrect(ctx, x - 9, y - 26, 18, 18, 2, face, OUT, 2.2); line(ctx, x - 6, y - 24, x - 6, y - 10, 'rgba(200,215,235,0.35)', 2);
    ellipse(ctx, x, y - 26, 13, 4.5, 0, faceL, OUT, 1.8);
    // the firebox, the light inside it
    rrect(ctx, x - 17, y - 48, 34, 23, 3, face, OUT, 2.5);
    rrect(ctx, x - 11, y - 44, 22, 15, 2, '#2a1608', OUT, 1.6);
    const g = ctx.createLinearGradient(0, y - 44, 0, y - 29); g.addColorStop(0, rgba(K.amberH, 0.95 * fl)); g.addColorStop(1, rgba('#e8742a', 0.95 * fl));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - 10, y - 43, 20, 13, 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x - 10, y - 43, 20, 13, 2); ctx.clip();
    for (let i = 0; i < 2; i++) { const sw = Math.sin(t * 7 + ph + i * 2) * 2; ellipse(ctx, x + (i - 0.5) * 6 + sw * 0.4, y - 33 - i, 3.4 - i * 0.6, 8 * fl, sw * 0.05, i ? '#fff6d0' : '#ffd070'); }
    ctx.restore();
    line(ctx, x, y - 44, x, y - 30, 'rgba(40,20,6,0.7)', 1.6);   // the paper-less cross of the window
    for (const sx of [-1, 1]) line(ctx, x + sx * 14, y - 46, x + sx * 14, y - 28, 'rgba(210,225,245,0.25)', 1.6);
    // the roof, upturned at the eaves, and the snow lying on it
    poly(ctx, [x - 33, y - 47, x - 28, y - 53, x - 12, y - 66, x + 12, y - 66, x + 28, y - 53, x + 33, y - 47, x + 20, y - 49, x - 20, y - 49], faceD, OUT, 2.6);
    poly(ctx, [x - 28, y - 53, x - 12, y - 66, x + 12, y - 66, x + 28, y - 53, x + 12, y - 58, x - 12, y - 58], face, OUT, 1.4);
    ellipse(ctx, x - 1, y - 67, 14, 5.5, 0, K.snow, OUT, 1.8);
    poly(ctx, [x - 32, y - 49, x - 26, y - 56, x - 10, y - 66, x - 14, y - 59, x - 24, y - 52, x - 30, y - 47], '#eef5ff');   // a drift along the near eave
    poly(ctx, [x + 31, y - 49, x + 25, y - 56, x + 13, y - 62, x + 17, y - 57, x + 24, y - 51], '#eef5ff');
    circle(ctx, x, y - 73, 4.6, K.snow, OUT, 1.8); poly(ctx, [x - 2, y - 69, x + 2, y - 69, x, y - 79], faceL, OUT, 1.3);   // the jewel on the top
    // snow banked at the foot
    for (const [dx, dy, rx] of [[-23, 8, 8], [-8, 10, 11], [14, 10, 12], [26, 5, 6]]) ellipse(ctx, x + dx, y + dy, rx, rx * 0.4, 0, rgba('#e4eefb', 0.92));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y - 36, 38, '#ffa840', 0.5 * fl); glow(ctx, x, y - 36, 14, '#fff0c0', 0.5 * fl); ctx.restore();
  }
  // what a broken lantern leaves: its blocks in the snow, the flame gone to a faint ember
  function lanternRubble(c, fl, r) {
    glow(c, fl.x, fl.y, fl.r * 1.3, '#05080f', 0.5);
    ellipse(c, fl.x, fl.y + 3, fl.r * 1.1, fl.r * 0.6, 0, rgba('#d8e6f8', 0.5));
    for (let i = 0; i < 8; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * fl.r * 0.85, x = fl.x + Math.cos(a) * d, y = fl.y + Math.sin(a) * d * 0.7, s = 5 + r() * 9, rot = r() * TAU;
      c.save(); c.translate(x, y); c.rotate(rot);
      poly(c, [-s, -s * 0.6, s * 0.9, -s * 0.7, s, s * 0.6, -s * 0.8, s * 0.7], i % 3 ? '#6c788c' : '#4d596d', OUT, 1.6);
      poly(c, [-s, -s * 0.6, s * 0.9, -s * 0.7, s * 0.8, -s * 0.3, -s * 0.8, -s * 0.2], 'rgba(235,244,255,0.6)');
      c.restore();
    }
    ellipse(c, fl.x - 4, fl.y - 2, 9, 5, 0, '#1a1410', OUT, 1.2);   // the fire-box, cracked open and cold
    circle(c, fl.x - 4, fl.y - 2, 2, '#ff9a3a');
  }

  // ---------------------------------------------------------------------------------------------------------- the pass
  const snowBlob = (c, x, y, rx, ry, rot, a, hi = true) => {
    ellipse(c, x + rx * 0.08, y + ry * 0.22, rx, ry, rot, rgba('#5d6f92', a * 0.7));
    ellipse(c, x, y, rx, ry, rot, rgba('#c3d3ea', a));
    if (hi) ellipse(c, x - rx * 0.18, y - ry * 0.25, rx * 0.62, ry * 0.5, rot, rgba('#eef5ff', a * 0.7));
  };
  // a pillar of the mountain: stacked blocks of rock, the moon on their left faces, snow on every ledge
  function rockPillar(c, x, y, w, h, seed) {
    const r = rng(seed), tiers = h > 120 ? 4 : h > 60 ? 3 : 2;
    ellipse(c, x + w * 0.25, y + 3, w * 1.25, w * 0.4, 0, 'rgba(2,4,10,0.6)');
    let cy = y + 2;
    for (let i = 0; i < tiers; i++) {
      const th = (h / tiers) * (0.85 + r() * 0.3), ww = w * (1 - i * 0.12) * (0.9 + r() * 0.2), x0 = x + (r() - 0.5) * w * 0.3, top = cy - th, tl = 4 + r() * 6, tr = 4 + r() * 6;
      poly(c, [x0 - ww, cy, x0 - ww * 0.92, top + tl, x0 + ww * 0.05, top - 5, x0 + ww * 0.05, cy + 3], '#3c4d70', 'rgba(3,6,14,0.95)', 2.2);   // the lit face
      poly(c, [x0 + ww * 0.05, cy + 3, x0 + ww * 0.05, top - 5, x0 + ww * 0.95, top + tr, x0 + ww, cy], '#1a2236', 'rgba(3,6,14,0.95)', 2.2);       // the face in shadow
      poly(c, [x0 - ww * 0.92, top + tl, x0 + ww * 0.05, top - 5, x0 + ww * 0.95, top + tr, x0 + ww * 0.05, top + 8], '#6a7fa8', 'rgba(3,6,14,0.9)', 1.6);   // the top
      line(c, x0 - ww * 0.55, cy - th * 0.2, x0 - ww * 0.45, top + th * 0.2, 'rgba(8,14,30,0.55)', 1.6);   // a crack down the lit face
      line(c, x0 - ww * 0.9, top + tl + 2, x0 + ww * 0.02, top - 2, 'rgba(210,228,255,0.35)', 1.4);
      drift(c, x0 - ww * 0.1, top + 2, ww * 0.9, ww * 0.3, seed * 7 + i, 0.95);
      cy = top + 5;
    }
  }
  // a far ridge across the north: a line of peaks, lit on their left
  function ridge(c, bx, y0, hMax, col, litCol, seed, step) {
    const r = rng(seed), pts = [];
    for (let x = -bx - 20; x <= bx + 20; x += step) pts.push([x, y0 - hMax * (0.25 + 0.75 * Math.pow(r(), 1.4))]);
    c.beginPath(); c.moveTo(-bx - 20, y0 + 40);
    for (const [x, y] of pts) c.lineTo(x, y);
    c.lineTo(bx + 20, y0 + 40); c.closePath(); c.fillStyle = col; c.fill();
    for (let i = 1; i < pts.length - 1; i++) {   // the lit side of each peak, and its snow
      const [x, y] = pts[i], [px, py] = pts[i - 1];
      if (y < py && y < pts[i + 1][1]) {
        poly(c, [x, y, px + (x - px) * 0.35, py + (y - py) * 0.35 + 4, x - 4, y + (py - y) * 0.7 + 14], litCol);
        poly(c, [x, y, x - (x - px) * 0.28, y + (py - y) * 0.28, x + 4, y + 7], 'rgba(238,246,255,0.8)');
      }
    }
  }
  // a mass of dark rock (the cliffs and the heaps beyond the walls)
  function rockMass(c, x, y, s, seed) {
    const r = rng(seed), pts = [], n = 8;
    for (let i = 0; i < n; i++) { const a = i * TAU / n + r() * 0.4, d = s * (0.65 + r() * 0.5); pts.push(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7); }
    ellipse(c, x + 4, y + s * 0.3, s * 1.1, s * 0.5, 0, 'rgba(2,4,10,0.4)');
    poly(c, pts, '#141c2e', 'rgba(3,6,14,0.9)', 2.2);
    poly(c, [pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], x, y - s * 0.1], '#202c44');
    snowBlob(c, x - s * 0.1, y - s * 0.35, s * 0.55, s * 0.2, 0, 0.85);
  }

  function buildPass(c, bx, by) {
    const r = rng(907), hw = ARENA.hw, hh = ARENA.hh;
    // ---- the night beyond the walls: sky to the north, dark rock round the rest
    const g0 = c.createLinearGradient(0, -by, 0, by);
    g0.addColorStop(0, '#0e1a36'); g0.addColorStop(0.18, '#0a1226'); g0.addColorStop(0.5, '#080d1a'); g0.addColorStop(1, '#060a14');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    glow(c, -bx * 0.45, -by * 0.95, 340, '#1f3868', 0.35); glow(c, bx * 0.55, -by * 0.9, 300, '#16305a', 0.3);
    for (let i = 0; i < 110; i++) { const x = (r() * 2 - 1) * bx, y = -by + r() * by * 0.32, a = 0.25 + r() * 0.65; circle(c, x, y, 0.5 + r() * 1.1, rgba(r() < 0.2 ? '#bfd8ff' : '#ffffff', a)); }
    ridge(c, bx, -by + 118, 78, '#0f1830', '#1c2c4c', 11, 46);
    ridge(c, bx, -by + 158, 64, '#0c1426', '#1a2742', 17, 38);
    // the near rock all round, and the dark beyond it
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by;
      if (Math.abs(x) < hw + 14 && Math.abs(y) < hh + 14) continue;
      if (y < -by + 170) continue;
      glow(c, x, y, 40 + r() * 90, r() < 0.5 ? '#12203a' : '#0d1830', 0.3 + r() * 0.3);
    }
    const nearTop = -by + 196;   // the near cliffs on the north side begin here
    c.fillStyle = '#0a101e'; c.beginPath(); c.moveTo(-bx, nearTop);
    for (let x = -bx; x <= bx; x += 34) c.lineTo(x, nearTop + (Math.sin(x * 0.021) + Math.sin(x * 0.057 + 2)) * 12 - r() * 12);
    c.lineTo(bx, by); c.lineTo(-bx, by); c.closePath(); c.fill();
    for (let i = 0; i < 46; i++) {   // rocks and drifts on the ledges outside the walls
      const a = r() * TAU, x = Math.cos(a) * (hw + 40 + r() * (bx - hw - 50)), y = Math.sin(a) * (hh + 40 + r() * (by - hh - 50)) * (hh / hh);
      if (Math.abs(x) < hw + 24 && Math.abs(y) < hh + 24) continue;
      if (y < nearTop + 10) continue;
      rockMass(c, x, y, 16 + r() * 34, 100 + i);
    }

    // ---- the ruined shrine behind the north wall: its hall, half fallen in
    const sy = -hh - 38;   // the hall's foot
    ellipse(c, 0, sy + 4, 190, 20, 0, 'rgba(2,4,10,0.5)');
    poly(c, [-132, sy, -132, sy - 52, 132, sy - 52, 132, sy], '#171b2a', OUT, 2.6);                       // the wall
    for (let i = -4; i <= 4; i++) line(c, i * 28, sy - 2, i * 28, sy - 50, 'rgba(8,10,20,0.75)', 2.4);        // posts
    poly(c, [-48, sy, -48, sy - 40, 48, sy - 40, 48, sy], '#06080f', OUT, 2);                              // the dark doorway
    glow(c, 0, sy - 18, 50, '#1a2a48', 0.25);
    poly(c, [-168, sy - 50, -126, sy - 76, -70, sy - 100, 20, sy - 108, 106, sy - 98, 160, sy - 74, 176, sy - 50, 100, sy - 56, -100, sy - 56], '#101421', OUT, 2.8);   // the roof, hipped, upturned at its eaves
    poly(c, [-126, sy - 76, -70, sy - 100, 20, sy - 108, -40, sy - 66], '#1a2136');
    snowBlob(c, -34, sy - 100, 58, 11, -0.04, 0.92); snowBlob(c, 64, sy - 90, 52, 10, 0.1, 0.9); snowBlob(c, -118, sy - 70, 30, 7, -0.28, 0.85);
    poly(c, [-168, sy - 50, -150, sy - 52, -140, sy - 40, -170, sy - 46], '#0b0e18');                         // the roof torn open on the left, the beams showing
    for (const [x1, y1, x2, y2] of [[-110, sy - 70, -78, sy - 58], [-96, sy - 82, -60, sy - 56], [-70, sy - 92, -44, sy - 58]]) line(c, x1, y1, x2, y2, '#3a2a24', 4);
    // ---- the gate (a torii) on the wall line: the right post stands, the left is broken off, its beam down
    const gy = -hh - 8, post = (x, h, broken) => {
      ellipse(c, x + 3, gy + 3, 16, 5, 0, 'rgba(2,4,10,0.5)');
      rrect(c, x - 12, gy - 6, 24, 10, 2, '#4d586c', OUT, 2);
      const top = gy - h;
      poly(c, broken ? [x - 8, gy - 6, x - 8, top + 10, x - 4, top - 4, x + 1, top + 12, x + 5, top - 2, x + 8, top + 8, x + 8, gy - 6] : [x - 8, gy - 6, x - 7, top, x + 7, top, x + 8, gy - 6], '#4a2420', OUT, 2.4);
      poly(c, broken ? [x - 8, gy - 6, x - 8, top + 10, x - 4, top - 4, x - 1, top + 6, x - 3, gy - 6] : [x - 8, gy - 6, x - 7, top, x - 2, top, x - 3, gy - 6], '#6e3a30');
      for (let i = 0; i < 3; i++) line(c, x + 2, gy - 14 - i * 22, x + 2, gy - 22 - i * 22 - 5, 'rgba(10,6,6,0.5)', 1.4);
      if (!broken) snowBlob(c, x, top, 10, 3.5, 0, 0.9, false);
      return top;
    };
    const topR = post(104, 138, false), topL = post(-104, 74, true);
    poly(c, [-60, topR + 40, -60, topR + 49, 116, topR + 49, 116, topR + 40], '#3c1c1a', OUT, 2);        // the lower beam, one end gone
    poly(c, [-6, topR - 8, 6, topR - 14, 138, topR - 12, 158, topR - 24, 150, topR - 4, 128, topR + 7, 6, topR + 7], '#2a1412', OUT, 2.6);   // the great lintel, upturned, ending where the left half fell
    poly(c, [-6, topR - 8, 138, topR - 12, 132, topR - 6, -6, topR - 2], '#5a2c26');
    snowBlob(c, 70, topR - 10, 64, 6, -0.02, 0.92, false);
    ArenaView._passFloor(c, bx, by, r);
    // ---- the steps up to it, inside the north wall: five, worn, with snow on every tread
    for (let i = 0; i < 5; i++) {
      const y1 = -hh + 3 + i * 14, w = 124 - i * 6, treadH = 9, riseH = 5;
      poly(c, [-w - 6, y1 + treadH + riseH, w + 6, y1 + treadH + riseH, w + 6, y1 + treadH, -w - 6, y1 + treadH], '#374159', OUT, 1.6);
      poly(c, [-w - 6, y1 + treadH, w + 6, y1 + treadH, w + 4, y1, -w - 4, y1], i % 2 ? '#7d8ca6' : '#8795ae', OUT, 1.6);
      for (let k = 0; k < 3; k++) { const q = rng(i * 9 + k + 3); crack(c, (q() - 0.5) * (w * 1.6), y1 + 2, 1.57, 8, i * 3 + k, 0.25); }
      snowBlob(c, ((i * 37) % 90) - 45, y1 + 3.5, 26 + (i * 7) % 18, 3, 0, 0.8, false);
      snowBlob(c, ((i * 53) % 90) - 40, y1 + 5, 16, 2.5, 0, 0.75, false);
    }
    fallenBeam(c, -112, gy + 52);
    for (const sx of [-1, 1]) {   // the low walls beside the steps
      poly(c, [sx * 134, -hh + 2, sx * 146, -hh + 2, sx * 146, -hh + 82, sx * 134, -hh + 82], '#4a556c', OUT, 2);
      poly(c, [sx * 134, -hh + 2, sx * 146, -hh + 2, sx * 144, -hh - 6, sx * 136, -hh - 6], '#7d8ca6', OUT, 1.6);
      snowBlob(c, sx * 140, -hh + 38, 7, 26, 0, 0.8, false);
    }

    // ---- pillars of rock and the heaps beyond the walls (tall in the north and at the sides; stumps in the south, so none lies over the floor)
    const spots = [[-480, -hh - 16, 110], [-330, -hh - 30, 82], [330, -hh - 26, 100], [490, -hh - 20, 124], [-250, -hh - 58, 60], [250, -hh - 54, 72],
      [-hw - 40, -300, 96], [-hw - 72, -110, 118], [-hw - 38, 70, 84], [-hw - 78, 250, 108], [hw + 44, -280, 104], [hw + 70, -90, 90], [hw + 40, 90, 122], [hw + 82, 270, 98],
      [-420, hh + 50, 34], [-120, hh + 78, 26], [190, hh + 60, 38], [440, hh + 80, 30], [-hw - 30, hh + 24, 52], [hw + 34, hh + 30, 46]];
    for (const [x, y, h] of spots) { if (Math.abs(x) > bx - 30 || y > by - 20) continue; rockPillar(c, x, y, 20 + hash(x, 3) * 14, y > hh ? h : h * 1.3, Math.abs(Math.floor(x * 3 + y)) % 997 + 5); }

    // ---- the wall of the room: a lip of stone with snow along it, and a shadow falling inside
    c.save(); ARENA.trace(c, 0); c.clip();
    ARENA.trace(c, 0); c.strokeStyle = 'rgba(2,5,14,0.5)'; c.lineWidth = 46; c.stroke();
    ARENA.trace(c, 0); c.strokeStyle = 'rgba(2,5,14,0.4)'; c.lineWidth = 20; c.stroke();
    c.restore();
    ARENA.trace(c, 3); c.strokeStyle = 'rgba(3,6,14,0.95)'; c.lineWidth = 8; c.lineJoin = 'round'; c.stroke();
    ARENA.trace(c, -2); c.strokeStyle = 'rgba(176,200,236,0.55)'; c.lineWidth = 2.4; c.stroke();
    ARENA.trace(c, -4.5); c.strokeStyle = 'rgba(230,242,255,0.22)'; c.lineWidth = 2; c.stroke();

    // ---- the Fallen Star, high over the pass (its place in the set: 0 for Corvane)
    const mx = bx * 0.4, my = -by + 76;
    SET3_SKY.draw(c, mx, my, 0, { dir: -2.6 });

    ArenaView.amb = {
      kind: 'pass', star: [mx, my],
      flakes: Array.from({ length: 70 }, () => ({ x: (r() * 2 - 1) * (hw + 100), y: (r() * 2 - 1) * (hh + 100), s: 0.8 + r() * 1.6, sp: 12 + r() * 26, dr: 8 + r() * 18, ph: r() * 9 })),
      drift: Array.from({ length: 14 }, () => ({ y: (r() * 2 - 1) * hh, ph: r() * 9, sp: 0.05 + r() * 0.08, w: 120 + r() * 160 })),
    };
  }
  // a beam that fell from the broken gate, lying in the snow
  function fallenBeam(c, x, y) {
    ellipse(c, x + 5, y + 6, 70, 9, 0, 'rgba(2,4,10,0.45)');
    c.save(); c.translate(x, y); c.rotate(-0.1);
    poly(c, [-62, -7, 58, -9, 74, -14, 66, -2, 60, 4, -62, 5], '#2d1614', OUT, 2.4);
    poly(c, [-62, -7, 58, -9, 56, -4, -62, -2], '#5a2c26');
    snowBlob(c, -4, -8, 46, 4, 0, 0.9, false);
    c.restore();
    snowBlob(c, x - 60, y + 6, 22, 5, 0, 0.7, false); snowBlob(c, x + 66, y + 3, 18, 4, 0, 0.7, false);
  }

  // an irregular heap of snow: a dark underside, then the lit top
  function drift(c, x, y, rx, ry, seed, a) {
    const r = rng(seed), n = 10, pts = [], top = [];
    for (let i = 0; i < n; i++) { const q = i * TAU / n, k = 0.72 + r() * 0.36; pts.push(x + Math.cos(q) * rx * k, y + Math.sin(q) * ry * k); top.push(x + Math.cos(q) * rx * k * 0.86 - rx * 0.05, y + Math.sin(q) * ry * k * 0.8 - ry * 0.12); }
    poly(c, pts.map((v, i) => (i % 2 ? v + ry * 0.2 : v)), rgba('#3b4d78', a * 0.8));
    poly(c, pts, rgba('#b9cce8', a));
    poly(c, top, rgba('#e6f0fd', a * 0.85));
  }
  // the room itself: snow lying over old stone flags, a swept way from the steps, drifts banked on the walls and the faint prints of the guard's long watch
  function passFloor(c, bx, by, r) {
    const hw = ARENA.hw, hh = ARENA.hh;
    c.save(); ARENA.trace(c, 0); c.clip();
    const g = c.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, '#5b6f95'); g.addColorStop(0.5, '#506489'); g.addColorStop(1, '#465a80');
    c.fillStyle = g; c.fillRect(-hw, -hh, hw * 2, hh * 2);
    // the flags: rows of dressed stone, each a little different, seamed, lit along its upper-left edge
    for (let row = 0, y = -hh - 10; y < hh + 10; row++) {
      const rh = 58 + r() * 24; let x = -hw - 40 - (row % 2) * 44;
      while (x < hw + 20) {
        const w = 76 + r() * 54, v = r();
        c.fillStyle = `rgba(${40 + v * 26 | 0},${54 + v * 28 | 0},${86 + v * 34 | 0},${0.5 + r() * 0.2})`; c.fillRect(x, y, w - 2, rh - 2);
        c.fillStyle = 'rgba(8,12,30,0.55)'; c.fillRect(x - 1, y + rh - 3, w + 1, 3); c.fillRect(x + w - 3, y, 3, rh);
        c.fillStyle = 'rgba(160,184,224,0.2)'; c.fillRect(x, y, w - 3, 1.5); c.fillRect(x, y, 1.5, rh - 3);
        if (r() < 0.2) crack(c, x + r() * w, y + r() * rh, r() * TAU, 20 + r() * 26, row * 40 + (x | 0), 0.16);
        x += w;
      }
      y += rh;
    }
    // the swept way from the steps toward the middle: bare stone, dark and slick with old ice
    const pw = 64, pg = c.createLinearGradient(0, -hh, 0, 60); pg.addColorStop(0, 'rgba(14,22,46,0.5)'); pg.addColorStop(1, 'rgba(14,22,46,0)');
    c.fillStyle = pg; c.fillRect(-pw, -hh, pw * 2, hh + 60);
    // snow: a soft cover everywhere, thicker toward the walls, then heaps with edges banked in the corners and along the foot of the walls
    for (let i = 0; i < 150; i++) {
      const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh, dEdge = Math.min(hw - Math.abs(x), hh - Math.abs(y)), k = clamp(1 - dEdge / 220, 0.1, 1);
      if (Math.abs(x) < pw && y < 60) continue;
      glow(c, x, y, 40 + r() * 90, '#cfdcf0', 0.1 + 0.3 * k * r());
    }
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh, dEdge = Math.min(hw - Math.abs(x), hh - Math.abs(y)), k = clamp(1 - dEdge / 150, 0, 1);
      if (r() > 0.18 + k * 0.9) continue;
      if (Math.abs(x) < pw + 20 && y < 60) continue;
      drift(c, x, y, 26 + r() * 56 * (0.5 + k), 9 + r() * 20 * (0.5 + k), 300 + i, 0.5 + 0.35 * k);
    }
    for (const [x, y] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]) for (let i = 0; i < 7; i++) drift(c, x - Math.sign(x) * (24 + r() * 70), y - Math.sign(y) * (22 + r() * 56), 36 + r() * 44, 18 + r() * 24, 500 + i + (x > 0 ? 9 : 0) + (y > 0 ? 17 : 0), 0.85);
    for (let i = 0; i < 26; i++) { const sd = (i % 4), u = r(); const x = sd < 2 ? (u * 2 - 1) * (hw - 40) : (sd === 2 ? -hw + 14 : hw - 14), y = sd < 2 ? (sd === 0 ? -hh + 12 : hh - 12) : (u * 2 - 1) * (hh - 40); drift(c, x, y, 40 + r() * 40, 10 + r() * 8, 600 + i, 0.8); }
    // grit, ice in the seams, the glitter of frost
    for (let i = 0; i < 1500; i++) { const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh; circle(c, x, y, 0.4 + r() * 0.9, r() < 0.55 ? `rgba(6,10,26,${0.15 + r() * 0.25})` : `rgba(232,244,255,${0.1 + r() * 0.35})`); }
    for (let i = 0; i < 38; i++) {   // scuffs and prints worn into the snow
      const x = (r() * 2 - 1) * hw * 0.85, y = (r() * 2 - 1) * hh * 0.85, a = r() * TAU;
      for (let k = 0; k < 5; k++) ellipse(c, x + Math.cos(a) * k * 15 + (k % 2) * 4, y + Math.sin(a) * k * 15 + (k % 2) * 5, 3.4, 1.9, a, 'rgba(34,48,84,0.4)');
    }
    // the moon laid across it from the upper left, and the dark of the pass closing in at the edges
    glow(c, -hw * 0.35, -hh * 0.45, 520, '#9db8e8', 0.2);
    const v = c.createRadialGradient(0, 0, hh * 0.45, 0, 0, hw * 1.05); v.addColorStop(0, 'rgba(2,5,16,0)'); v.addColorStop(1, 'rgba(2,5,16,0.5)');
    c.fillStyle = v; c.fillRect(-hw, -hh, hw * 2, hh * 2);
    c.restore();
  }

  // the room's life: snow blowing across, the lanterns' light on the snow, the star's twinkle
  function passLife(ctx, a, t) {
    const hw = ARENA.hw, hh = ARENA.hh, room = ArenaView.liveRoom, W = hw * 2 + 200, H = hh * 2 + 200;
    for (const d of a.drift) { const x = (((t * d.sp * 60 + d.ph * 90) % (W + d.w * 2)) + W + d.w * 2) % (W + d.w * 2) - hw - 100 - d.w; glow(ctx, x, d.y, d.w, '#dce8f8', 0.04 + 0.025 * Math.sin(t * 0.5 + d.ph)); }
    if (room && room.props) {
      ctx.save(); ctx.beginPath(); ARENA.trace(ctx, 0); ctx.clip();
      for (const pr of room.props) if (pr.kind === 'stonelantern') {
        const fl = 0.8 + 0.12 * Math.sin(t * 9 + pr.id * 1.7) + 0.08 * Math.sin(t * 23 + pr.id * 3.4);
        glow(ctx, pr.x, pr.y + 8, 150, '#ff9a3a', 0.2 * fl); glow(ctx, pr.x, pr.y + 8, 70, '#ffc070', 0.16 * fl);
      }
      ctx.restore();
    }
    for (const f of a.flakes) {
      const x = ((f.x + t * f.sp * 1.4 + Math.sin(t * 0.7 + f.ph) * f.dr + hw + 100) % W + W) % W - hw - 100;
      const y = ((f.y + t * f.sp * 0.6 + hh + 100) % H + H) % H - hh - 100;
      circle(ctx, x, y, f.s, 'rgba(238,246,255,0.6)');
    }
    SET3_SKY.life(ctx, a.star[0], a.star[1], 0, t);
  }

  return { corvane, wisp, lantern, lanternRubble, buildPass, passFloor, passLife, sword };
})();

BOSS_ART.corvane = CV_ART.corvane;
ADD_ART.wisp = CV_ART.wisp;
ArenaView.buildPass = CV_ART.buildPass;
ArenaView._passFloor = CV_ART.passFloor;
ArenaView.passLife = CV_ART.passLife;
ArenaView.stoneLantern = (ctx, pr, t) => CV_ART.lantern(ctx, pr, t);
ArenaView.lanternRubble = CV_ART.lanternRubble;
