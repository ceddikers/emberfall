// Morrow-Oak, the Starved Grove: everything he looks like and the two rooms he stands in, drawn in code. His body (an elder tree as tall as a
// tower, the heartwood split open on the Hunger, a crown of dead leaves floating round a hollow face), a pose for each of his casts and the
// second form (the Grove Remade: bigger, gnarled, the Hunger wider in him); the sapling add and the eight limbs he grows (each grown from a
// monster the party has killed); the holes the Hunger leaves in the floor; the dead grove on the crater's rim and the floating grove over the
// dark, and both rooms' ambient life. Loaded after arena-view.js and set3-sky.js; it adds to BOSS_ART / ADD_ART / ArenaView itself.
// Look: the user's painted sheets (docs/art/vfx-reference/morrowoak-1.png, -2.png): scorched cracked brown earth, withered grey-brown bark, a
// few dead gold leaves, the Hunger as black-violet with a bright violet rim, the orange-red meteor in the night sky. A limb shows its own colour
// only while its move is up (docs/plans/2026-10-morrowoak-build.md).
//
// st.props (main.js, boss-vfx.js CAST_POSE):
//   remade                                  the second form (raid.form === 'remade')
//   held while the move runs:               mgSeed, mgInhale, mgBloom, mgLash, mgTide, mgSaplings, mgDark, mgSwallow, mgUnfold, mgRage (the enrage);
//                                           a limb's move: mgCleaver, mgRoots, mgStorm, mgLantern, mgWing, mgFist, mgRune, mgHead
// An add's st.props (main.js, set each frame for his adds): { f: the angle it faces, act: its move is up } (the limbs, the sapling).
// MG_ART.hole(ctx, fl, t, k) draws one hole; MG_ART.holes(ctx, room, t) draws every hole of a room (ArenaView.drawRoomUnder calls it).

const MG_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const K = {
    bark: '#4d3f33', barkD: '#2b2219', barkM: '#3a2f26', barkL: '#7a6652', barkH: '#a08a6c', grey: '#6d6459', greyD: '#3d3731', greyL: '#9a8f80',
    heart: '#c8b490', heartD: '#8a7656',
    dark: '#05020a', darkM: '#120824', vio: '#a77cf0', vioH: '#dcc8ff', vioD: '#5a2a9a', vioG: '#8a4fe0',
    leaf: ['#d4a93e', '#b8892c', '#9a7428', '#e8c452', '#8a7440'],
    sap: '#ffb020', sapH: '#ffe080', ember: '#ff7a2a',
    petal: { thorn: '#7fd24a', frost: '#9fdcff', spark: '#ffd84a', blight: '#b070f0' },
  };
  const LIMB_COL = { cleaver: '#ff9a3a', brood: '#b8ef5a', storm: '#7fe8ff', lantern: '#6dff9a', wing: '#ff6a3a', rime: '#8ad0ee', rune: '#3fb8b0', head: '#7fe0a8' };
  const LIMB_PROP = { cleaver: 'mgCleaver', brood: 'mgRoots', storm: 'mgStorm', lantern: 'mgLantern', wing: 'mgWing', rime: 'mgFist', rune: 'mgRune', head: 'mgHead' };
  const POSES = ['seed', 'inhale', 'bloom', 'lash', 'tide', 'saplings', 'dark', 'swallow', 'unfold', 'rage'];

  // where a cast is in its swing: strike 0 (gathering) .. 1 (the blow has landed), then rest 0 .. 1 (back to standing)
  function atk(st) {
    const a = st.action;
    if (!a || a.type !== 'attack') return { strike: 0, rest: 0, p: -1 };
    const p = (actT(st) - a.t0) / a.dur;
    if (p < 0.3) return { strike: 0, rest: 0, p };
    if (p < 0.55) return { strike: easeOut((p - 0.3) / 0.25), rest: 0, p };
    return { strike: 1, rest: p >= 1 ? 1 : easeOut((p - 0.55) / 0.45), p };
  }
  // a value eased toward its target a little each frame (kept on the entity's own st; a copy of it just starts over)
  const sm = (st, key, target, rate = 0.1) => { const v = st[key]; return (st[key] = v == null ? target : v + (target - v) * rate); };
  const smv = (st, key, target, rate = 0.1) => { const v = st[key]; if (!v) return (st[key] = target.slice()); for (let i = 0; i < v.length; i++) v[i] += (target[i] - v[i]) * rate; return v; };

  // ---------------------------------------------------------------------------------------------------------- small parts
  // a dead leaf, a pointed oval with a rib
  function leaf(ctx, x, y, rot, s, col, al = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (al < 1) ctx.globalAlpha *= al;
    poly(ctx, [-5 * s, 0, -1.6 * s, -2.7 * s, 5 * s, 0, -1.6 * s, 2.7 * s], col, OUT, 0.9);
    line(ctx, -4 * s, 0, 3.6 * s, 0, 'rgba(50,34,12,0.55)', 0.7);
    ctx.restore();
  }
  // a tapered bough along a quadratic curve: bark with a lit side, a shaded side and ridges. Returns the point at u (0..1) along it.
  function bough(ctx, x0, y0, cx, cy, x1, y1, w0, w1, o = {}) {
    const col = o.col || K.bark, N = o.n || 10, seed = o.seed || 0, Lp = [], Rp = [], mid = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      const px = a * x0 + b * cx + c * x1, py = a * y0 + b * cy + c * y1;
      let dx = 2 * (1 - u) * (cx - x0) + 2 * u * (x1 - cx), dy = 2 * (1 - u) * (cy - y0) + 2 * u * (y1 - cy);
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const h = lerp(w0, w1, u) * 0.5 * (1 + 0.1 * Math.sin(u * 9 + seed));
      Lp.push(px - dy * h, py + dx * h); Rp.push(px + dy * h, py - dx * h); mid.push(px, py, dx, dy, h);
    }
    const pts = Lp.slice(); for (let i = N; i >= 0; i--) pts.push(Rp[i * 2], Rp[i * 2 + 1]);
    poly(ctx, pts, col, OUT, o.lw || 2.4);
    // the lit side, the shaded side
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const k = i * 5, px = mid[k] - mid[k + 3] * mid[k + 4] * 0.55, py = mid[k + 1] + mid[k + 2] * mid[k + 4] * 0.55; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.strokeStyle = o.hi || 'rgba(214,190,150,0.28)'; ctx.lineWidth = Math.max(1, (w0 + w1) * 0.07); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const k = i * 5, px = mid[k] + mid[k + 3] * mid[k + 4] * 0.55, py = mid[k + 1] - mid[k + 2] * mid[k + 4] * 0.55; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.strokeStyle = 'rgba(12,8,4,0.4)'; ctx.lineWidth = Math.max(1, (w0 + w1) * 0.08); ctx.stroke();
    for (let i = 1; i < N; i += 2) { const k = i * 5, h = mid[k + 4] * 0.7; line(ctx, mid[k] - mid[k + 3] * h, mid[k + 1] + mid[k + 2] * h, mid[k] + mid[k + 3] * h * 0.3, mid[k + 1] - mid[k + 2] * h * 0.3, 'rgba(12,8,4,0.34)', 1); }
    ctx.restore();
    return u => { const k = Math.min(N, Math.max(0, Math.round(u * N))) * 5; return [mid[k], mid[k + 1], Math.atan2(mid[k + 3], mid[k + 2])]; };
  }
  // a twig with twigs: depth levels of forks, swaying a little
  function twig(ctx, x, y, a, len, w, depth, seed, t, col = K.barkM, sway = 0.05) {
    const a2 = a + Math.sin(t * 0.7 + seed * 1.7) * sway, ex = x + Math.cos(a2) * len, ey = y + Math.sin(a2) * len;
    line(ctx, x, y, ex, ey, OUT, w + 2.4); line(ctx, x, y, ex, ey, col, w);
    if (w > 2.2) line(ctx, x - 0.5, y - 0.5, ex - 0.5, ey - 0.5, 'rgba(214,190,150,0.2)', Math.max(0.8, w * 0.3));
    if (depth > 0) {
      twig(ctx, ex, ey, a2 + 0.5 + hash(seed, 1) * 0.3, len * 0.62, w * 0.66, depth - 1, seed + 1, t, col, sway * 1.3);
      twig(ctx, ex, ey, a2 - 0.5 - hash(seed, 2) * 0.3, len * 0.62, w * 0.66, depth - 1, seed + 2, t, col, sway * 1.3);
      if (depth > 1) twig(ctx, lerp(x, ex, 0.55), lerp(y, ey, 0.55), a2 + (hash(seed, 3) < 0.5 ? 0.8 : -0.8), len * 0.5, w * 0.55, depth - 2, seed + 5, t, col, sway * 1.2);
    }
  }
  // a gnarled hand: twig fingers fanned from (x, y) about direction a, curling shut as curl goes 0 -> 1
  function hand(ctx, x, y, a, scale, curl, t, seed, col) {
    for (let i = 0; i < 5; i++) {
      const fa = a + (i - 2) * (0.42 - curl * 0.26) + Math.sin(t * 0.9 + i + seed) * 0.05, len = (i === 2 ? 30 : i === 0 || i === 4 ? 20 : 26) * scale;
      twig(ctx, x, y, fa, len, 4.4 * scale, 1, seed + i * 3, t, col, 0.04);
    }
    circle(ctx, x, y, 6.4 * scale, col || K.barkM, OUT, 2);
  }
  // a violet seep: a jagged glowing crack from (x, y) heading a
  function seep(ctx, x, y, a, len, seed, al = 0.8) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = [x, y]; let px = x, py = y, an = a;
    for (let i = 0; i < 4; i++) { an += (hash(i, seed) - 0.5) * 1.5; px += Math.cos(an) * len / 4; py += Math.sin(an) * len / 4; pts.push(px, py); }
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.strokeStyle = rgba('#05020a', 0.65 * al); ctx.lineWidth = 3; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(K.vio, al); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }
  // a five-petal flower of a petal colour, opening as k goes 0 -> 1
  function flower(ctx, x, y, col, k, t, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.3);
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 30 * s * (0.5 + k), col, 0.4 * (0.4 + k * 0.6));
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5, L = (6 + 14 * k) * s, wd = (2.4 + 3.6 * k) * s;
      poly(ctx, [0, 0, Math.cos(a - 0.5) * L * 0.6, Math.sin(a - 0.5) * L * 0.6, Math.cos(a) * L, Math.sin(a) * L, Math.cos(a + 0.5) * L * 0.6, Math.sin(a + 0.5) * L * 0.6], col, OUT, 1.2);
      void wd;
    }
    circle(ctx, 0, 0, 2.6 * s, '#fff4c0', OUT, 0.8);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- Morrow-Oak
  // the trunk's half width at height y (the foot flares, the shoulders swell, the top narrows to the crown)
  const TRUNK = [[48, 72], [30, 54], [-10, 44], [-60, 43], [-92, 48], [-124, 36], [-154, 24]];
  const hwAt = y => { for (let i = 0; i < TRUNK.length - 1; i++) { const a = TRUNK[i], b = TRUNK[i + 1]; if (y <= a[0] && y >= b[0]) return lerp(a[1], b[1], (a[0] - y) / (a[0] - b[0])); } return y > 48 ? 62 : 21; };
  const trunkX = (y, side, rem) => side * (hwAt(y) * (rem ? 1.1 : 1) + Math.sin(y * 0.09 + (side > 0 ? 1.7 : 0)) * 3.2 + (hash(Math.round(y / 6), side > 0 ? 5 : 9) - 0.5) * 3);
  function trunkPath(ctx, rem) {
    ctx.beginPath();
    for (let y = 48; y >= -154; y -= 7) { const x = trunkX(y, -1, rem); y === 48 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    for (let y = -154; y <= 48; y += 7) ctx.lineTo(trunkX(y, 1, rem), y);
    ctx.closePath();
  }
  // the split: a long ragged opening in the heartwood, its top the hollow face's mouth. open widens it. Returns the path points.
  const SPLIT_TOP = -108, SPLIT_BOT = 30;
  const splitCx = y => Math.sin(y * 0.05) * 3;
  function splitPts(open, rem) {
    const L = [], R = [], N = 20;
    for (let i = 0; i <= N; i++) {
      const u = i / N, y = lerp(SPLIT_TOP, SPLIT_BOT, u), w = open * 23 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.95) * (0.82 + 0.36 * hash(i, 31)) * (1 + (rem ? 0.8 * Math.max(0, 1 - u / 0.3) : 0));
      L.push([splitCx(y) - w * (0.9 + 0.2 * hash(i, 32)), y]); R.push([splitCx(y) + w * (0.9 + 0.2 * hash(i, 33)), y]);
    }
    const pts = []; for (const p of L) pts.push(p[0], p[1]); for (let i = N; i >= 0; i--) pts.push(R[i][0], R[i][1]);
    return pts;
  }
  function splitDraw(ctx, open, t, rem, hot) {
    const pts = splitPts(open, rem);
    ctx.save();
    // the bark's own torn lips round it, pale heartwood showing
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(K.heart, 0.55); ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = rgba(K.heartD, 0.7); ctx.lineWidth = 5.5; ctx.stroke();
    ctx.fillStyle = K.dark; ctx.fill();
    ctx.save(); ctx.clip();
    // the violet comes in from the lip, the middle is the dark
    ctx.strokeStyle = rgba(K.vioD, 0.5); ctx.lineWidth = 15; ctx.stroke();
    ctx.strokeStyle = rgba(K.vioG, 0.5 + 0.12 * hot); ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = rgba(K.vioH, 0.85); ctx.lineWidth = 2.4; ctx.stroke();
    // faint stars, being eaten: they drift in toward the middle and are gone
    for (let i = 0; i < 12; i++) {
      const q = (t * 0.22 + hash(i, 40)) % 1, y0 = lerp(SPLIT_TOP + 10, SPLIT_BOT - 12, hash(i, 41)), x0 = (hash(i, 42) - 0.5) * 36 * open;
      const cy = -38, x = lerp(x0, 0, q), y = lerp(y0, cy, q * q);
      circle(ctx, x, y, 0.9 * (1 - q) + 0.2, rgba('#f0e8ff', 0.75 * (1 - q) * (0.5 + 0.5 * Math.sin(t * 3 + i))));
    }
    ctx.restore();
    // the bright rim, and a bloom of violet where it is widest
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath();
    ctx.strokeStyle = rgba(K.vioH, 0.9); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const y = lerp(SPLIT_TOP + 14, SPLIT_BOT - 14, i / 5); glow(ctx, splitCx(y) + (i % 2 ? 1 : -1) * 16 * open, y, 16 * Math.sqrt(open) + 6, K.vioG, (0.1 + 0.05 * hot + 0.03 * Math.sin(t * 2 + i)) * (rem ? 1.3 : 1)); }
    ctx.restore();
    // torn splinters of bark standing into it
    for (let i = 0; i < 7; i++) {
      const u = 0.12 + i * 0.12 + hash(i, 50) * 0.04, y = lerp(SPLIT_TOP, SPLIT_BOT, u), side = i % 2 ? 1 : -1, k = Math.floor(u * 20) * 2, ex = side < 0 ? pts[k] : pts[pts.length - 2 - k];
      poly(ctx, [ex, y - 4, ex - side * (5 + 5 * hash(i, 51)) * 1.4, y + 1, ex, y + 4], K.heartD, OUT, 1);
    }
  }
  // the face: two hollow eyes under bark brows, a nose ridge; the split below is its mouth
  function face(ctx, t, rem, hot, lit) {
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.translate(sx * 17, -128); ctx.rotate(sx * 0.3);
      poly(ctx, [-12, -9, 12, -5 - sx * 3, 11, -1, -11, -4], K.barkD, OUT, 2);                       // the brow
      ellipse(ctx, 0, 3, 8.6 * (rem ? 1.2 : 1), 14 * (rem ? 1.25 : 1), 0, '#07030c', OUT, 2.4);        // the hollow
      ellipse(ctx, -1.5, 0, 3, 8, 0, 'rgba(0,0,0,0.6)');
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 6, (rem ? 15 : 10) + 4 * lit, K.vioG, 0.14 + 0.2 * lit + 0.05 * Math.sin(t * 2.3 + sx));
      ellipse(ctx, 0, 7, 1.3, 3.4, 0, rgba(K.vioH, 0.25 + 0.55 * lit));
      ctx.restore();
    }
    poly(ctx, [-3, -134, 3, -134, 5, -108, 0, -104, -5, -108], K.barkM, OUT, 1.6);
    line(ctx, 0, -131, 0, -110, 'rgba(214,190,150,0.22)', 1.4);
  }

  function body(ctx, st, angle = 0) {
    const pr = st.props || {}, t = st.t || 0, A = atk(st), rem = !!pr.remade, moving = st.moving ? 1 : 0;
    let pose = 'idle', limbK = null;
    for (const k of POSES) if (pr['mg' + k[0].toUpperCase() + k.slice(1)]) { pose = k; break; }
    if (pose === 'idle') for (const k in LIMB_PROP) if (pr[LIMB_PROP[k]]) { pose = 'limb'; limbK = k; break; }
    const spread = pose === 'bloom' || pose === 'unfold' || pose === 'swallow' || pose === 'rage';
    const hot = pose === 'idle' ? 0 : pose === 'swallow' || pose === 'rage' ? 1 : 0.6;
    const baseOpen = rem ? 1.5 : 1;
    const open = sm(st, 'mgOpen', baseOpen * ({ inhale: 1.6, swallow: 2.3, unfold: 1.25, rage: 1.8, seed: 1.3, dark: 1.3, bloom: 1.1 }[pose] || 1), 0.07) * (1 + 0.06 * Math.sin(t * 1.1));
    const sway = Math.sin(t * 0.5) * 2.2, breathe = Math.sin(t * 0.9);
    const LC = limbK ? LIMB_COL[limbK] : null;

    // arm targets: elbow and hand, for the left arm (the right mirrors it)
    let E = rem ? [-70, -126, -94, -176] : [-98, -70, -126, -16];
    if (pose === 'inhale') E = [-90, -84, -62, -36];
    else if (spread) E = rem ? [-96, -126, -150, -178] : [-112, -112, -178, -150];
    else if (pose === 'tide' || pose === 'saplings') E = [-84, -58, -96, 10];
    else if (pose === 'dark') E = [-104, -74, -136, -40];
    else if (pose === 'limb') E = [-100, -104, -140, -98];
    else if (pose === 'lash') E = [-96, -112, -132, -132];
    if (pose === 'bloom') E = [-120, -100, -190, -118];
    const eL = smv(st, 'mgAL', E, 0.08);
    let ER = [-E[0], E[1], -E[2], E[3]];
    if (pose === 'seed') ER = [92, -92, 128, -70 - 20 * A.strike];
    const eR = smv(st, 'mgAR', ER, 0.08);
    const bob = Math.sin(t * 0.7) * 1.5 + moving * Math.sin(t * 3) * 1.6;

    ctx.save(); ctx.rotate(-angle);
    const sc = rem ? 1.12 : 1; ctx.scale(sc, sc);
    if (pose === 'swallow' || pose === 'rage') ctx.translate(Math.sin(t * 38) * 1.5, Math.sin(t * 31) * 1.1);
    // ---- the floor under him: shadow, the Hunger's glow (the Remade stands up out of the dark: his roots hang free, his shadow stays on the ground)
    ellipse(ctx, 0, 52, 118, 44, 0, 'rgba(4,2,2,0.42)'); ellipse(ctx, 0, 52, 78, 28, 0, 'rgba(4,2,2,0.3)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 40, 130, K.vioG, 0.08 + 0.1 * hot + (rem ? 0.1 : 0)); ctx.restore();
    ctx.translate(0, rem ? -22 : 0);
    const drawRoots = () => {
      const NR = 11;
      for (let i = 0; i < NR; i++) {
        const a = -0.2 + i * (Math.PI + 0.4) / (NR - 1) + (hash(i, 60) - 0.5) * 0.25, L = (88 + 52 * hash(i, 61)) * (pose === 'inhale' ? 0.88 : 1) * (rem ? 0.8 : 1), bend = (hash(i, 62) - 0.5) * 50;
        const x1 = Math.cos(a) * L * 1.15, y1 = 40 + Math.sin(a) * L * 0.55 + (rem ? 36 + 20 * hash(i, 63) : 0);
        const lift = pose === 'inhale' ? 10 + 8 * Math.sin(t * 6 + i) : 0, wob = Math.sin(t * 0.6 + i * 1.3) * 3;
        bough(ctx, Math.cos(a) * 20, 40, Math.cos(a) * L * 0.55 + bend * 0.3, 40 + Math.sin(a) * L * 0.3 - lift + wob, x1, y1 + wob, 17 - (i % 3) * 3, 3.4, { col: i % 2 ? K.grey : K.bark, seed: i, hi: 'rgba(200,184,160,0.25)' });
        if (pose === 'inhale') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x1 * 0.7, lerp(40, y1, 0.7), 14, K.vioG, 0.25); ctx.restore(); }
      }
    };
    drawRoots();
    if (pose === 'dark') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 2; i++) { const q = (t * 0.7 + i / 2) % 1; ctx.beginPath(); ctx.ellipse(0, 46, 70 + q * 110, (70 + q * 110) * 0.38, 0, 0, TAU); ctx.strokeStyle = rgba(K.vioG, 0.5 * (1 - q)); ctx.lineWidth = 3; ctx.stroke(); } ctx.restore(); }

    // ---- the canopy behind the head: bare boughs reaching up, and the leaves of the crown that are behind him
    const CROWN = [0, -146];
    const crownLeaves = (back) => {
      const n = rem ? 22 : 30;
      for (let i = 0; i < n; i++) {
        const sp = pose === 'rage' || pose === 'swallow' ? 1.1 : pose === 'inhale' ? -0.5 : 0.22, a = t * sp + i * TAU / n + hash(i, 70) * 0.5, sn = Math.sin(a);
        if ((sn < 0) !== back) continue;
        const rx = (66 + 12 * Math.sin(t * 0.4 + i)) * (rem ? 1.12 : 1), ry = 26, bobl = Math.sin(t * 1.1 + i * 2.1) * 4;
        let x = CROWN[0] + Math.cos(a) * rx, y = CROWN[1] + sn * ry + bobl;
        if (pose === 'inhale') { const q = (t * 0.5 + i / n) % 1; x = lerp(x, 0, q * 0.9); y = lerp(y, -44, q * 0.9); }
        leaf(ctx, x, y, a * 1.3 + i, 1.5 + 0.8 * hash(i, 71), K.leaf[i % 5], back ? 0.75 : 1);
      }
    };
    const bs = [[-14, -146, -50, -182, -96, -190, 16, 5], [14, -146, 52, -180, 104, -184, 16, 5], [-4, -150, -22, -190, -34, -200, 13, 4], [6, -150, 24, -190, 14, -202, 12, 4], [-26, -140, -90, -166, -148, -150, 12, 4], [26, -140, 96, -168, 150, -148, 12, 4]];
    crownLeaves(true);
    bs.forEach((b, i) => {
      const s1 = Math.sin(t * 0.45 + i * 1.3) * 3;
      const open2 = pose === 'bloom' || pose === 'unfold' || pose === 'rage' ? 1.1 : 1;
      const g = bough(ctx, b[0], b[1], b[2], b[3], b[4] * open2 + s1, b[5], b[6], b[7], { seed: i * 3, col: rem ? K.barkM : K.bark });
      const e = g(1);
      twig(ctx, e[0], e[1], e[2] - 0.5, 30, 4, 2, i * 7 + 1, t); twig(ctx, e[0], e[1], e[2] + 0.4, 25, 3.6, 2, i * 7 + 4, t);
      const m = g(0.55);
      twig(ctx, m[0], m[1], m[2] + (i % 2 ? 1 : -1) * 0.9, 38, 4.2, 2, i * 7 + 9, t);
      if (pose === 'bloom' && i < 4) flower(ctx, e[0], e[1] - 4, [K.petal.thorn, K.petal.frost, K.petal.spark, K.petal.blight][i], 0.35 + 0.65 * Math.max(A.strike, Math.min(1, (A.p + 1) * 0.5)), t, 1.9);
    });
    if (rem) {   // the Remade's antlers: more boughs, black and twisted
      for (let i = 0; i < 4; i++) { const s = i < 2 ? -1 : 1, k = i % 2; bough(ctx, s * 10, -150, s * (50 + k * 30), -198 - k * 8, s * (86 + k * 38), -214 + k * 26, 15, 4, { seed: 50 + i, col: K.barkD }); twig(ctx, s * (86 + k * 38), -214 + k * 26, -Math.PI / 2 + s * 0.6, 26, 3.6, 2, 80 + i, t, K.barkD); }
    }

    // ---- the limbs' sockets (the Remade): where the four limbs are rooted, bare if one is gone
    if (rem) for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const bx = sx * 34, by = sy < 0 ? -62 : 18, ex = sx * 64, ey = sy < 0 ? -66 : 36;
      bough(ctx, bx, by, (bx + ex) / 2, (by + ey) / 2 - 6, ex, ey, 22, 16, { seed: sx * 9 + sy, col: K.barkM });
      poly(ctx, [ex - 9, ey - 3, ex - 3, ey - 10, ex + 3, ey - 8, ex + 9, ey - 2, ex + 8, ey + 6, ex, ey + 10, ex - 8, ey + 7], '#2a1c14', OUT, 2); circle(ctx, ex, ey, 4.4, K.dark);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, ey, 20, K.vioG, 0.3); ctx.restore(); seep(ctx, ex, ey, sx > 0 ? 0.3 : Math.PI - 0.3, 12, sx * 7 + sy, 0.7);
    }

    // ---- the trunk
    ctx.save(); ctx.translate(0, bob * 0.3);
    trunkPath(ctx, rem); ctx.fillStyle = rem ? K.barkM : K.bark; ctx.fill();
    ctx.save(); trunkPath(ctx, rem); ctx.clip();
    // the shaded side and the lit side (the meteor is up and to the right), roots of bark running up it
    ctx.fillStyle = rem ? 'rgba(8,2,12,0.46)' : 'rgba(8,4,2,0.34)'; ctx.fillRect(-90, -170, 90, 240);
    ctx.fillStyle = 'rgba(255,170,100,0.1)'; ctx.fillRect(22, -170, 60, 240);
    for (let k = -5; k <= 5; k++) {
      ctx.beginPath();
      for (let y = 46; y >= -152; y -= 8) { const f = k / 5.6, x = trunkX(y, f < 0 ? -1 : 1, rem) * Math.abs(f) + Math.sin(y * 0.07 + k * 1.9) * 3.4; y === 46 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(14,8,4,0.5)'; ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(210,184,140,0.16)'; ctx.translate(2, 0); ctx.stroke(); ctx.translate(-2, 0);
    }
    for (let i = 0; i < 9; i++) { const x = (hash(i, 80) - 0.5) * 70, y = -140 + hash(i, 81) * 170; if (Math.abs(x) < 15 && y > SPLIT_TOP && y < SPLIT_BOT) continue; ellipse(ctx, x, y, 5 + 4 * hash(i, 82), 8 + 5 * hash(i, 83), 0, K.barkD, OUT, 1.4); ellipse(ctx, x - 1, y - 1, 2.6, 4, 0, 'rgba(210,184,140,0.14)'); }
    if (rem) for (let k = 0; k < 4; k++) { ctx.beginPath(); for (let y = 46; y >= -152; y -= 8) { const x = Math.sin(y * 0.045 + k * 1.57 + 0.6) * 38; y === 46 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(10,6,4,0.42)'; ctx.stroke(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(210,184,140,0.14)'; ctx.stroke(); }
    if (rem) for (let i = 0; i < 10; i++) { const y = -140 + hash(i, 84) * 180; seep(ctx, (hash(i, 85) - 0.5) * 64, y, hash(i, 86) * TAU, 16 + 14 * hash(i, 87), i * 5, 0.6); }
    ctx.restore();
    trunkPath(ctx, rem); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
    // the face and the split
    face(ctx, t, rem, hot, pose === 'idle' ? 0 : 1);
    splitDraw(ctx, open, t, rem, hot);
    // seeps round the split
    for (let i = 0; i < 8; i++) { const y = lerp(SPLIT_TOP + 8, SPLIT_BOT - 10, hash(i, 90)), s = i % 2 ? 1 : -1; seep(ctx, splitCx(y) + s * 13 * open, y, (s > 0 ? 0 : Math.PI) + (hash(i, 91) - 0.5) * 1.2, 16 + 12 * hash(i, 92), 100 + i, 0.55 + 0.25 * hot); }
    // a limb's own colour gathering in him while its move is up
    if (LC) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -40, 70, LC, 0.14 + 0.06 * Math.sin(t * 6)); ctx.restore(); }
    ctx.restore();

    // ---- sap welling out of the bark
    if (pose === 'tide') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const x = (i - 4) * 9 + (hash(i, 100) - 0.5) * 6, q = (t * (0.5 + 0.3 * hash(i, 101)) + hash(i, 102)) % 1, y0 = -120 + hash(i, 103) * 60, y = y0 + q * (60 - y0 + 30);
        line(ctx, x, y0, x, y, rgba(K.sap, 0.55), 2.4); circle(ctx, x, y, 2.6, rgba(K.sapH, 0.85)); glow(ctx, x, y0 + 8, 16, K.sap, 0.22);
      }
      glow(ctx, 0, 48, 120, K.sap, 0.2 + 0.08 * Math.sin(t * 3)); ctx.restore();
      ellipse(ctx, 0, 50, 90 + 6 * Math.sin(t * 2), 20, 0, rgba(K.sap, 0.4));
    }

    // ---- the lash: a root-arm whipping down at the one he faces
    const doLash = pose === 'lash';
    const dxA = Math.cos(angle), dyA = Math.sin(angle);
    const armDraw = (side, e) => {
      const sx = side * 38, sy = -92 + bob * 0.3, ex = e[0] + sway * side * 0.6, ey = e[1], hx = e[2] + sway * side, hy = e[3] + breathe * 2;
      const cwd = rem ? 1.25 : 1;
      bough(ctx, sx, sy, (sx + ex) / 2, (sy + ey) / 2 - 4, ex, ey, 22 * cwd, 14 * cwd, { seed: side * 4, col: rem ? K.barkM : K.bark });
      const mx = (ex + hx) / 2, my = (ey + hy) / 2;
      bough(ctx, ex, ey, mx + side * 6, my - 4, hx, hy, 14 * cwd, 8, { seed: side * 4 + 2, col: rem ? K.barkM : K.bark });
      circle(ctx, ex, ey, 8.4 * cwd, K.barkM, OUT, 2);
      twig(ctx, lerp(sx, ex, 0.6), lerp(sy, ey, 0.6), -Math.PI / 2 + side * 0.9, 24, 4, 2, 120 + side, t);
      const ha = Math.atan2(hy - ey, hx - ex);
      hand(ctx, hx, hy, ha, 1, pose === 'inhale' ? 0.9 : pose === 'lash' || pose === 'seed' ? 0.6 : 0.1, t, 130 + side, K.barkM);
      return [hx, hy];
    };
    armDraw(-1, eL);
    if (doLash) {
      const raised = [dxA * 52, dyA * 40 - 150], hit = [dxA * 118, dyA * 118], k = A.strike * (1 - A.rest);
      const tip = [lerp(raised[0], hit[0], k) + (1 - k) * Math.sin(t * 9) * 4, lerp(raised[1], hit[1], k)];
      const sx = 38, sy = -92, c = [lerp((sx + tip[0]) / 2 + 40, (sx + tip[0]) / 2, k), Math.min(sy, tip[1]) - 80 * (1 - k)];
      bough(ctx, sx, sy, c[0], c[1], tip[0], tip[1], 26, 12, { seed: 7, col: K.bark, n: 14 });
      const ang = Math.atan2(tip[1] - c[1], tip[0] - c[0]);
      for (let i = 0; i < 5; i++) twig(ctx, tip[0], tip[1], ang + (i - 2) * 0.5, 30 - Math.abs(i - 2) * 4, 5.2, 1, 140 + i, t, K.barkM, 0.03);
      if (k > 0.9) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, hit[0], hit[1], 60, '#ffb070', 0.35 * (1 - A.rest)); ctx.restore(); }
    } else armDraw(1, eR);

    // ---- a seed flung from the split
    if (pose === 'seed') {
      const k = A.strike * (1 - A.rest), g = 0.3 + 0.7 * Math.min(1, A.p < 0 ? 0.6 : 1);
      let sx0 = 0, sy0 = -42, x = sx0, y = sy0, s = (6 + 5 * Math.sin(t * 7)) * g, al = 1;
      if (A.strike > 0) { const d = 150 * k; x = dxA * d; y = sy0 + dyA * d * 0.8 - Math.sin(k * Math.PI) * 60; s = 11; al = 1 - A.rest; }
      ctx.save(); ctx.globalAlpha *= al; ctx.translate(x, y); ctx.rotate(t * 3);
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 38, K.vioG, 0.5);
      ctx.globalCompositeOperation = 'source-over';
      poly(ctx, [0, -s * 1.5, s * 0.8, -s * 0.2, s * 0.5, s, 0, s * 1.4, -s * 0.6, s * 0.2, -s * 0.8, -s * 0.5], '#0a0414', K.vioH, 1.4);
      line(ctx, -s * 0.3, -s * 0.6, s * 0.2, s * 0.5, rgba(K.vioG, 0.6), 1);
      ctx.restore();
    }
    // ---- the Hunger breathing in: leaves, dust and light streaming into the split
    if (pose === 'inhale' || pose === 'swallow' || pose === 'unfold' || pose === 'rage') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const n = pose === 'swallow' ? 36 : 24;
      for (let i = 0; i < n; i++) {
        const q = (t * (pose === 'inhale' ? 0.8 : 1.1) + i / n) % 1, a = hash(i, 110) * TAU + i, R0 = 190 + 70 * hash(i, 111), r = R0 * Math.pow(1 - q, 1.5);
        const x = Math.cos(a + q * 1.4) * r, y = -42 + Math.sin(a + q * 1.4) * r * 0.62;
        const al = Math.min(1, q * 5) * (1 - q * 0.4);
        line(ctx, x, y, x + Math.cos(a + q * 1.4 + 2.2) * 10 * (1 - q), y + Math.sin(a + q * 1.4 + 2.2) * 6 * (1 - q), rgba(K.vioH, 0.5 * al), 1.4);
        if (i % 3 === 0) { ctx.globalCompositeOperation = 'source-over'; leaf(ctx, x, y, a + q * 6, 0.8, K.leaf[i % 5], al); ctx.globalCompositeOperation = 'lighter'; }
        else circle(ctx, x, y, 1.5, rgba(K.vioH, 0.8 * al));
      }
      ctx.restore();
    } else if (pose === 'idle') {   // the Hunger always feeding: a few motes drawn in
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) { const q = (t * 0.28 + i / 9) % 1, a = hash(i, 112) * TAU, r = 80 * (1 - q); circle(ctx, Math.cos(a) * r, -42 + Math.sin(a) * r * 0.7, 1.2 + (1 - q), rgba(K.vioH, 0.5 * q * (1 - q) * 4)); }
      ctx.restore();
    }
    if (pose === 'saplings') for (let i = 0; i < 10; i++) { const q = (t * 0.7 + i / 10) % 1, x = (hash(i, 120) - 0.5) * 170; leaf(ctx, x + Math.sin(t * 2 + i) * 6, -150 + q * 200, t * 2 + i, 0.9, K.leaf[i % 5], 1 - q * 0.6); }
    // ---- the crown's leaves in front, and the glow of a move
    crownLeaves(false);
    if (spread || pose === 'rage') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -60, 150, K.vioG, 0.1 + 0.1 * hot); ctx.restore(); }
    if (pose === 'rage') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const q = (t * 0.9 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, -60, 90 + q * 170, 60 + q * 120, 0, 0, TAU); ctx.strokeStyle = rgba(K.vioH, 0.55 * (1 - q)); ctx.lineWidth = 4 - q * 2.4; ctx.stroke(); } ctx.restore(); }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the sapling
  // a little walking dead tree, upright, roots for legs, a gold flower where its crown should be
  function sapling(ctx, st) {
    const pr = st.props || {}, t = st.t || 0, mv = st.moving ? 1 : 0, f = pr.f || 0, ph = t * (mv ? 9 : 1.6);
    ctx.save(); ctx.rotate(-f); ctx.translate(0, -3 - Math.abs(Math.sin(ph)) * 2.2 * mv);
    for (let i = 0; i < 4; i++) {   // the legs: roots, planted and drawn up again as it walks
      const x = (i - 1.5) * 5.2, s = Math.sin(ph + i * 1.7), fx = x * 2.1 + s * 3.6 * mv, fy = 15 - Math.max(0, Math.cos(ph + i * 1.7)) * 3 * mv, kx = (x * 0.5 + fx) / 2 + (i % 2 ? 2 : -2);
      line(ctx, x * 0.5, 4, kx, 10, OUT, 5.2); line(ctx, kx, 10, fx, fy, OUT, 4.2);
      line(ctx, x * 0.5, 4, kx, 10, K.grey, 3); line(ctx, kx, 10, fx, fy, K.grey, 2.2);
    }
    for (const sd of [-1, 1]) {   // the arms: twig arms, swinging
      const sw = Math.sin(ph + (sd > 0 ? 0 : Math.PI)) * 0.5 * mv + Math.sin(t * 1.3 + sd) * 0.1;
      twig(ctx, sd * 7, -7, (sd > 0 ? 0.35 : Math.PI - 0.35) + (sd > 0 ? sw : -sw), 15, 3, 1, sd > 0 ? 3 : 8, t, K.barkL, 0.05);
    }
    poly(ctx, [-9, 8, -7.5, -6, -5.5, -17, 5.5, -17, 7.5, -6, 9, 8], K.bark, OUT, 2.2);   // the trunk, with its face
    poly(ctx, [2, 8, 3.5, -6, 5.5, -17, 7.5, -6, 9, 8], 'rgba(8,4,2,0.3)');
    line(ctx, -4, 6, -3, -14, 'rgba(210,184,140,0.22)', 1.4); line(ctx, 1, 6, 0.5, -15, 'rgba(12,8,4,0.4)', 1.2);
    for (const sx of [-1, 1]) { ellipse(ctx, sx * 3.1, -9, 2.2, 1.3, sx * 0.45, '#07030c'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx * 3.1, -9, 4.5, K.vioG, 0.4); ctx.restore(); }
    line(ctx, -3, -3.4, 3, -3.4, '#07030c', 1.6); line(ctx, -1.8, -3.4, -1.8, -1, 'rgba(7,3,12,0.8)', 1); line(ctx, 1.8, -3.4, 1.8, -1, 'rgba(7,3,12,0.8)', 1);
    twig(ctx, -3, -16, -2.2, 10, 2.4, 1, 21, t, K.barkL, 0.08); twig(ctx, 3, -16, -0.95, 10, 2.4, 1, 24, t, K.barkL, 0.08);   // a few bare twigs, a gold flower
    leaf(ctx, -9, -22, -0.6, 0.9, K.leaf[1]); leaf(ctx, 10, -21, 0.5, 0.8, K.leaf[4]);
    ctx.save(); ctx.translate(0, -23); ctx.rotate(Math.sin(t * 1.4) * 0.12);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ellipse(ctx, Math.cos(a) * 5.4, Math.sin(a) * 5.4, 3.7, 2.2, a, '#f2c230', OUT, 1.1); }
    circle(ctx, 0, 0, 2.8, '#ff9a2a', OUT, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 12, '#ffd060', 0.22); ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the limbs
  // Each is drawn in its add's frame: the add faces away from him, so +x runs out from his body, and the limb's own root is back at -98 (his
  // middle: the add stands about 150 px from it and is drawn 1.5 times over). An upright part (a lantern) is turned back by the facing.
  const mixHex = (a, b, q) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], q)).toString(16).padStart(2, '0')).join(''); };
  const upright = (ctx, f, x, y, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-f); fn(); ctx.restore(); };
  const limbBase = (ctx, t, sw, seed, x1 = -4, w1 = 12, y1 = 0) => bough(ctx, -98, 3, -52, -12 + sw, x1, y1, 24, w1, { seed, col: K.bark, n: 12 });
  // a jointed root-leg: two segments and a claw; returns the joint and the foot
  function rootLeg(ctx, x, y, a, l1, l2, bend, w, col) {
    const jx = x + Math.cos(a) * l1, jy = y + Math.sin(a) * l1, a2 = a + bend, tx = jx + Math.cos(a2) * l2, ty = jy + Math.sin(a2) * l2, a3 = a2 + bend * 0.8, cx = tx + Math.cos(a3) * 9, cy = ty + Math.sin(a3) * 9;
    line(ctx, x, y, jx, jy, OUT, w + 2.6); line(ctx, jx, jy, tx, ty, OUT, w * 0.7 + 2.6); line(ctx, tx, ty, cx, cy, OUT, 4);
    line(ctx, x, y, jx, jy, col, w); line(ctx, jx, jy, tx, ty, col, w * 0.7); line(ctx, tx, ty, cx, cy, K.barkL, 1.6);
    circle(ctx, jx, jy, w * 0.62, K.barkM, OUT, 1.6);
    return [jx, jy, tx, ty];
  }
  function limbCleaver(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.cleaver, hotc = mixHex('#6e6a64', '#ffb060', act), edge = mixHex('#cfcabd', '#ffd8a0', act);
    limbBase(ctx, t, sw, 1, 2, 11);
    ctx.save(); ctx.translate(6, -act * 3); ctx.rotate(-0.1 + Math.sin(t * 17) * 0.04 * act);
    line(ctx, -6, 0, 18, 0, OUT, 11); line(ctx, -6, 0, 18, 0, '#5a3a22', 8);   // the grip
    for (const x of [-2, 4, 10, 15]) line(ctx, x, -4, x, 4, 'rgba(10,6,2,0.55)', 1.4);
    for (const x of [-4, 14]) circle(ctx, x, 0, 1.5, '#b8b0a0', OUT, 0.8);
    ctx.save(); ctx.translate(16, 0); ctx.scale(1.32, 1.32); ctx.translate(-16, 0);   // (a huge one)
    if (act > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 40, 4, 64, col, 0.3 * act); ctx.restore(); }
    poly(ctx, [16, -10, 62, -19, 68, -14, 70, 14, 60, 25, 16, 13], hotc, OUT, 2.8);   // the blade, broad, the belly of the edge on the far side
    poly(ctx, [16, -10, 62, -19, 68, -14, 20, -4], 'rgba(255,255,255,0.14)');
    for (const [x, y, rx, ry] of [[30, 2, 7, 4], [52, -2, 6, 4], [44, 12, 8, 3], [24, -4, 4, 3]]) ellipse(ctx, x, y, rx, ry, 0.3, rgba('#a8541e', 0.45 + 0.4 * act));
    line(ctx, 16, 13, 60, 25, edge, 2.2); line(ctx, 60, 25, 70, 14, edge, 2.2);
    circle(ctx, 40, -5, 3.6, '#120c08', OUT, 1.2);                                    // the hanging hole
    for (const x of [30, 46]) poly(ctx, [x - 3, 20, x + 3, 21.5, x, 26], '#2a1a10');   // notches bitten in the edge
    for (let i = 0; i < 3; i++) line(ctx, 24 + i * 12, -14, 28 + i * 12, 8, 'rgba(20,14,10,0.3)', 1);
    if (act > 0.2) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const q = (t * 1.3 + i / 6) % 1; circle(ctx, 30 + hash(i, 5) * 36, 18 - q * 34, 1.6 * (1 - q) + 0.4, rgba('#ffb060', 0.9 * (1 - q) * act)); } }
    ctx.restore();
    ctx.restore();
  }
  function limbBrood(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.brood;
    limbBase(ctx, t, sw, 2, -14, 12);
    const legs = [[-1.2, 28, 30, 0.7], [-0.62, 34, 30, 0.6], [-0.08, 38, 32, 0.5], [0.46, 34, 30, -0.6], [1.05, 28, 28, -0.7]], J = [];
    legs.forEach(([a, l1, l2, b], i) => { const tw = Math.sin(t * 1.6 + i * 1.3) * (0.05 + 0.1 * act); J.push(rootLeg(ctx, -12, 0, a * (1 + 0.1 * act) + tw, l1, l2, b, 8.5, i % 2 ? K.grey : K.bark)); });
    // silk strung between the legs and wound round the knot where they meet
    ctx.save(); ctx.lineCap = 'round';
    const silk = rgba(mixHex('#cfd0d8', '#e6ff9a', act), 0.8);
    for (let i = 0; i < J.length - 1; i++) {
      const a = J[i], b = J[i + 1];
      for (const [ax, ay, bx, by] of [[a[0], a[1], b[0], b[1]], [a[2], a[3], b[2], b[3]], [lerp(a[0], a[2], 0.5), lerp(a[1], a[3], 0.5), lerp(b[0], b[2], 0.5), lerp(b[1], b[3], 0.5)]]) {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2 - 3, (ay + by) / 2 + 2 * Math.sin(t * 2 + i), bx, by); ctx.strokeStyle = silk; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    ctx.restore();
    ellipse(ctx, -12, 0, 13, 11, 0, K.barkM, OUT, 2);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-12, 0, 13, 4 + i, i * 0.6, 0, TAU); ctx.strokeStyle = silk; ctx.lineWidth = 1; ctx.stroke(); }
    if (act > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const j of J) { glow(ctx, j[2], j[3], 22, col, 0.35 * act); line(ctx, j[0], j[1], j[2], j[3], rgba(col, 0.5 * act), 3); } glow(ctx, -12, 0, 40, col, 0.28 * act); ctx.restore(); }
  }
  function limbStorm(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.storm;
    limbBase(ctx, t, sw, 3, 6, 14);
    // the knot: a burl of twisted grain with crystal rods standing out of it
    for (const [a, L] of [[-0.95, 34], [0.12, 40], [1.0, 32], [-0.4, 24]]) {
      const sx = 16 + Math.cos(a) * 8, sy = Math.sin(a) * 8, ex = 16 + Math.cos(a) * (8 + L), ey = Math.sin(a) * (8 + L), nx = -Math.sin(a) * 4.4, ny = Math.cos(a) * 4.4;
      poly(ctx, [sx + nx, sy + ny, ex + nx * 0.4, ey + ny * 0.4, ex + Math.cos(a) * 7, ey + Math.sin(a) * 7, ex - nx * 0.4, ey - ny * 0.4, sx - nx, sy - ny], mixHex('#6f8ea2', '#bff4ff', act), OUT, 1.6);
      line(ctx, sx + nx * 0.3, sy + ny * 0.3, ex, ey, rgba('#ffffff', 0.35 + 0.5 * act), 1.2);
      if (act > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, ey, 14, col, 0.5 * act); ctx.restore(); }
    }
    circle(ctx, 14, 0, 18, K.barkM, OUT, 2.4);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(14, 0, 16 - i * 3.5, 12 - i * 2.6, 0.5 + i * 0.4, 0.4, 5.4); ctx.strokeStyle = 'rgba(12,8,4,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    ellipse(ctx, 14, 0, 4.6, 3, 0.4, '#1a120c', OUT, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 14, 0, 30 + 20 * act, col, 0.1 + 0.4 * act);
    const arcs = act > 0.1 ? 5 : (Math.floor(t * 0.7) % 3 === 0 && (t * 0.7) % 1 < 0.2 ? 1 : 0), tick = Math.floor(t * (act > 0.1 ? 16 : 10));
    for (let i = 0; i < arcs; i++) { const a = hash(tick + i * 7, 1) * TAU, L = 34 + 36 * hash(tick + i * 3, 2) * (0.4 + act); ctx.globalAlpha = Math.max(0.35, act); jagged(ctx, 14 + Math.cos(a) * 14, Math.sin(a) * 14, 14 + Math.cos(a) * L, Math.sin(a) * L, tick * 5 + i, col, 1.5); }
    ctx.restore();
  }
  function limbLantern(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.lantern, fl = 0.85 + 0.1 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23);
    bough(ctx, -98, 3, -50, -12 + sw, -6, -8, 24, 11, { seed: 4, n: 12 });
    bough(ctx, -6, -8, 12, -22, 24, -10, 11, 6, { seed: 5, n: 6 });   // the crook it hangs from
    upright(ctx, f, 26, 0, () => {
      line(ctx, 0, -10, 0, -2, OUT, 3.4); line(ctx, 0, -10, 0, -2, '#8a8478', 1.6);   // the chain
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 14, 36 + 40 * act, col, (0.2 + 0.4 * act) * fl); if (act > 0.1) glow(ctx, 0, 14, 90, col, 0.18 * act); ctx.restore();
      poly(ctx, [-8, -2, 8, -2, 11, 4, -11, 4], '#3a3d38', OUT, 1.8); circle(ctx, 0, -3.4, 2.4, '#3a3d38', OUT, 1.2);   // the cap
      poly(ctx, [-10, 4, 10, 4, 9, 28, -9, 28], rgba(mixHex('#7fa08a', '#d8ffe4', act), 0.55), OUT, 1.8);               // the glass
      ellipse(ctx, 0, 17, 3.6 * fl + 1, 7 * fl + 1, 0, mixHex('#a8e8c0', '#e8fff0', act)); ellipse(ctx, 0, 18.5, 1.8, 3.6, 0, '#ffffff');
      for (const x of [-9, 0, 9]) line(ctx, x, 4, x, 28, '#2a2d2a', 1.4);   // the frame
      poly(ctx, [-11, 28, 11, 28, 8, 33, -8, 33], '#3a3d38', OUT, 1.6);
      if (act > 0.1) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) { const a = t * 0.6 + i * TAU / 7, L = 24 + 14 * Math.sin(t * 3 + i); line(ctx, 0, 17, Math.cos(a) * L, 17 + Math.sin(a) * L, rgba(col, 0.28 * act), 1.4); } }
    });
  }
  function limbWing(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.wing, fl = Math.sin(t * (2 + 6 * act)) * (0.06 + 0.08 * act), spars = [[-1.35, 56], [-0.82, 66], [-0.28, 72], [0.28, 68], [0.84, 60], [1.32, 48]];
    limbBase(ctx, t, sw, 6, -2, 12);
    const tips = spars.map(([a, L], i) => { const aa = a * (1 + 0.1 * act) + fl * (i % 2 ? 1 : -1); return [-2 + Math.cos(aa) * L * (1 + 0.1 * act), Math.sin(aa) * L * (1 + 0.1 * act), aa]; });
    // the membrane: charred bark-leather between the spars, scalloped, cracked with ember
    const mp = [-2, 0]; tips.forEach((p, i) => { if (i) { const q = tips[i - 1]; mp.push((p[0] + q[0]) / 2 - 8, (p[1] + q[1]) / 2); } mp.push(p[0], p[1]); }); mp.push(-2, 0);
    poly(ctx, mp, '#3b1d12', OUT, 2.4);
    ctx.save(); ctx.beginPath(); ctx.moveTo(mp[0], mp[1]); for (let i = 2; i < mp.length; i += 2) ctx.lineTo(mp[i], mp[i + 1]); ctx.closePath(); ctx.clip();
    for (let i = 0; i < tips.length - 1; i++) { const a = tips[i], b = tips[i + 1]; for (let k = 1; k < 4; k++) { const q = k / 4; line(ctx, -2 + (a[0] + 2) * q, a[1] * q, -2 + (b[0] + 2) * q, b[1] * q, 'rgba(14,6,4,0.55)', 1.4); } }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const a = tips[i % tips.length], q = 0.25 + hash(i, 9) * 0.6; seep(ctx, -2 + (a[0] + 2) * q, a[1] * q, a[2] + (hash(i, 8) - 0.5), 14 + 10 * hash(i, 7), 200 + i, 0.25 + 0.7 * act); }
    ctx.restore();
    for (const p of tips) { line(ctx, -2, 0, p[0], p[1], OUT, 7); line(ctx, -2, 0, p[0], p[1], K.barkM, 4.6); line(ctx, -2, -1, p[0], p[1] - 1, 'rgba(210,184,140,0.25)', 1.2); circle(ctx, p[0], p[1], 2.8, K.barkL, OUT, 1.2); }
    if (act > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 30, 0, 70, col, 0.3 * act); for (const p of tips) glow(ctx, p[0], p[1], 14, col, 0.35 * act); ctx.restore(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { const q = (t * 0.6 + i / 7) % 1, p = tips[i % tips.length], k = 0.7 + 0.3 * hash(i, 3); circle(ctx, p[0] * k, p[1] * k - q * 22, 1.3 * (1 - q) + 0.3, rgba('#ff9a4a', (0.5 + 0.5 * act) * (1 - q))); }
    ctx.restore();
  }
  function limbRime(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.rime, g = 1 + 0.12 * act;
    limbBase(ctx, t, sw, 7, 8, 14);
    // the fist: gnarled wood, knuckles in a row, a thumb folded over
    ellipse(ctx, 22, 0, 20, 19, 0, K.barkM, OUT, 2.6);
    for (let i = 0; i < 4; i++) { const y = -13 + i * 8.6; circle(ctx, 36, y, 7.6, K.bark, OUT, 2); circle(ctx, 34.5, y - 1.5, 3.2, 'rgba(210,184,140,0.25)'); line(ctx, 26, y, 38, y, 'rgba(12,8,4,0.4)', 1.2); }
    ellipse(ctx, 18, -16, 11, 6, -0.4, K.bark, OUT, 2);
    // ice bound round it
    for (const [a, L, w] of [[-1.5, 30, 7], [-0.9, 38, 8], [-0.3, 40, 8], [0.3, 40, 8], [0.9, 38, 8], [1.5, 30, 7], [2.2, 24, 6], [-2.2, 24, 6], [3.0, 20, 6]]) {
      const bx = 24 + Math.cos(a) * 12, by = Math.sin(a) * 12, ex = 24 + Math.cos(a) * (12 + L * g * 0.8), ey = Math.sin(a) * (12 + L * g * 0.8), nx = -Math.sin(a) * w * 0.5, ny = Math.cos(a) * w * 0.5;
      poly(ctx, [bx + nx, by + ny, ex, ey, bx - nx, by - ny], rgba(mixHex('#bfe0f0', '#e8fbff', act), 0.78), '#6aa8c8', 1.2);
      line(ctx, bx, by, ex, ey, rgba('#ffffff', 0.5), 1);
    }
    ellipse(ctx, 22, 2, 17, 14, 0, rgba('#d8f0fa', 0.35), rgba('#ffffff', 0.4), 1.2);
    if (act > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 24, 0, 60, col, 0.38 * act); for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * 1.05, r = 28 + 10 * Math.sin(t * 5 + i); circle(ctx, 24 + Math.cos(a) * r, Math.sin(a) * r, 1.6, rgba('#ffffff', 0.8 * act)); } ctx.restore(); }
  }
  function limbRune(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.rune, glowc = mixHex('#2a6a68', '#a8fff0', act);
    limbBase(ctx, t, sw, 8, 6, 12);
    for (const sd of [-1, 1]) twig(ctx, 6, sd * 3, sd * 1.2, 20, 4, 1, 40 + sd, t, K.barkM, 0.03);   // two twigs holding the disc
    ctx.save(); ctx.translate(30, 0);
    circle(ctx, 0, 0, 27, K.barkM, OUT, 2.8); circle(ctx, 0, 0, 24, K.bark); circle(ctx, 0, 0, 21, null, 'rgba(12,8,4,0.5)', 1.4);
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; line(ctx, Math.cos(a) * 22.5, Math.sin(a) * 22.5, Math.cos(a) * 26, Math.sin(a) * 26, 'rgba(12,8,4,0.5)', 1.4); }
    if (act > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 66, col, 0.32 * act); ctx.restore(); }
    ctx.save(); ctx.rotate(t * (0.15 + 0.9 * act));
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; line(ctx, Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a) * 20, Math.sin(a) * 20, rgba(glowc, 0.4 + 0.55 * act), 2.2); if (i % 2) line(ctx, Math.cos(a - 0.2) * 17, Math.sin(a - 0.2) * 17, Math.cos(a + 0.2) * 17, Math.sin(a + 0.2) * 17, rgba(glowc, 0.4 + 0.55 * act), 1.6); }
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.strokeStyle = rgba(glowc, 0.5 + 0.5 * act); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    poly(ctx, [0, -8, 7, 5, -7, 5], null, rgba(glowc, 0.5 + 0.5 * act), 1.8); line(ctx, 0, -3, 0, 2, rgba(glowc, 0.6 + 0.4 * act), 1.8); circle(ctx, 0, 1.6, 1.4, rgba('#ffffff', 0.5 + 0.5 * act));
    ctx.restore();
  }
  function limbHead(ctx, st, f, t, act, sw) {
    const col = LIMB_COL.head, wet = '#3a4a3a', mo = 4 + 8 * act + Math.sin(t * 1.7) * 1.5;
    bough(ctx, -98, 3, -62, -22 + sw, -22, 4, 24, 15, { seed: 9, n: 14, col: wet });
    bough(ctx, -22, 4, -2, 18, 14, 0, 15, 13, { seed: 10, n: 8, col: wet });   // the neck's S
    ctx.save(); ctx.translate(14, 0); ctx.rotate(Math.sin(t * 0.9) * 0.08 + act * Math.sin(t * 7) * 0.05);
    const eyec = mixHex('#4a8a68', '#9fffcc', act);
    poly(ctx, [-4, -12, 20, -14, 40, -8, 50, -2, 50, 0, 20, -2 - mo * 0.2, -2, -1], mixHex('#3c4e3e', '#46705a', act), OUT, 2.6);      // the upper jaw
    poly(ctx, [-2, 1, 20, 2 + mo * 0.5, 46, 2 + mo * 0.9, 42, 7 + mo * 0.9, 18, 11 + mo * 0.5, -4, 11], mixHex('#35463a', '#3f6a54', act), OUT, 2.4);   // the lower jaw, open
    ellipse(ctx, 48, 0.4 + mo * 0.4, 1.8, mo * 0.5, 0, '#0a1a14');
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(6 + i * 6, -6, 4, 0.3, 2.8); ctx.strokeStyle = 'rgba(14,26,18,0.55)'; ctx.lineWidth = 1.2; ctx.stroke(); }   // bark scales
    for (const [x, y, d] of [[44, -1, 1], [34, -2, 1], [40, 4 + mo * 0.9, -1], [30, 3 + mo * 0.5, -1]]) poly(ctx, [x - 2, y, x + 2, y, x + 0.5, y + 7 * d], '#ece8d4', OUT, 0.8);   // fangs
    for (const sy of [-1, 1]) { ellipse(ctx, 24, sy * 7.5, 3.4, 2.4, 0, '#0a1410', OUT, 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 24, sy * 7.5, 10 + 12 * act, col, 0.35 + 0.5 * act); ctx.restore(); ellipse(ctx, 24.4, sy * 7.5, 1.6, 1.1, 0, eyec); }
    line(ctx, 8, -10, 36, -8, 'rgba(210,240,220,0.35)', 1.4);   // the wet along its back
    ctx.restore();
    for (let i = 0; i < 4; i++) { const q = (t * 0.7 + i / 4) % 1; circle(ctx, 40 + (hash(i, 2) - 0.5) * 20, 12 + q * 18, 1.7 * (1 - q * 0.5), rgba(act > 0.1 ? col : '#7fa890', 0.8 * (1 - q))); }
    if (act > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 38, 2, 54, col, 0.3 * act); ctx.restore(); }
  }
  const LIMBS = { cleaver: limbCleaver, brood: limbBrood, storm: limbStorm, lantern: limbLantern, wing: limbWing, rime: limbRime, rune: limbRune, head: limbHead };
  const limbArt = key => (ctx, st) => {
    const pr = st.props || {}, t = st.t || 0, act = sm(st, 'mgAct', pr.act ? 1 : 0, 0.14), sw = Math.sin(t * 0.8 + key.length) * 2;
    ctx.save(); ctx.scale(1 + 0.07 * act, 1 + 0.07 * act); LIMBS[key](ctx, st, pr.f || 0, t, act, sw); ctx.restore();
  };

  // ---------------------------------------------------------------------------------------------------------- the holes
  // A hole is not floor: a ragged pit into the starless dark with a bright violet rim, roots torn at its edge, things falling in. It is drawn
  // from its entry's own x, y, r every frame (it can grow), and over whatever floor is under it. k (0..1) is how far it has opened.
  function holePath(ctx, x, y, r, seed, dx = 0, dy = 0, sc = 1) {
    const N = 38; ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = i * TAU / N, m = (0.9 + 0.13 * hash(i, seed) + 0.025 * Math.sin(a * 3 + seed) - ((i + (seed | 0)) % 11 === 0 ? 0.08 : 0)) * sc;
      const px = x + dx + Math.cos(a) * r * m, py = y + dy + Math.sin(a) * r * m * 0.95;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function hole(ctx, fl, t, k = 1) {
    const x = fl.x, y = fl.y, r = fl.r * k, seed = (fl.id | 0) * 13 + 7;
    if (r < 3) return;
    ctx.save();
    // ---- the broken ground round it: scorched, cracked, clods and chips thrown up
    holePath(ctx, x, y, r * 1.2 + 6, seed + 3); ctx.fillStyle = 'rgba(24,12,6,0.5)'; ctx.fill();
    holePath(ctx, x, y, r * 1.08 + 2, seed + 5); ctx.fillStyle = 'rgba(14,6,4,0.45)'; ctx.fill();
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10 + hash(i, seed) * 0.5, r0 = r * 1.0, r1 = r * (1.3 + 0.55 * hash(i, seed + 1)), bx = x + Math.cos(a) * r1, by = y + Math.sin(a) * r1 * 0.95;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.95); ctx.lineTo((x + Math.cos(a) * r0 + bx) / 2 + (hash(i, seed + 2) - 0.5) * 12, (y + Math.sin(a) * r0 * 0.95 + by) / 2 + (hash(i, seed + 3) - 0.5) * 12); ctx.lineTo(bx, by);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(10,4,2,0.75)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,90,230,0.4)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 9; i++) {   // clods and chips on the lip
      const a = hash(i, seed + 8) * TAU, d = r * (1.06 + 0.2 * hash(i, seed + 9)), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d * 0.95, s = 3 + 5 * hash(i, seed + 10), q = hash(i, seed + 11) * TAU;
      poly(ctx, [cx + Math.cos(q) * s, cy + Math.sin(q) * s, cx + Math.cos(q + 2) * s * 0.8, cy + Math.sin(q + 2) * s * 0.8, cx + Math.cos(q + 4) * s * 0.9, cy + Math.sin(q + 4) * s * 0.9], '#5a4430', OUT, 1.4);
    }
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 1.75, K.vioG, (0.2 + 0.05 * Math.sin(t * 1.6 + seed)) * k);
    ctx.globalCompositeOperation = 'source-over';
    // ---- the pit: the earth's wall on the far side, then the dark
    holePath(ctx, x, y, r, seed); ctx.fillStyle = '#4a3020'; ctx.fill();
    ctx.save(); holePath(ctx, x, y, r, seed); ctx.clip();
    const g = ctx.createLinearGradient(0, y - r, 0, y + r * 0.3); g.addColorStop(0, 'rgba(60,36,22,0.0)'); g.addColorStop(0.55, 'rgba(18,8,12,0.85)'); g.addColorStop(1, 'rgba(5,2,10,1)');
    ctx.fillStyle = g; ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
    holePath(ctx, x, y, r, seed + 1, 0, r * 0.2, 0.9); ctx.fillStyle = '#030108'; ctx.fill();
    const g2 = ctx.createRadialGradient(x, y + r * 0.15, 0, x, y + r * 0.15, r * 0.85); g2.addColorStop(0, 'rgba(100,50,190,0.34)'); g2.addColorStop(0.6, 'rgba(60,24,120,0.14)'); g2.addColorStop(1, 'rgba(60,24,120,0)');
    ctx.fillStyle = g2; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    for (let i = 0; i < 14; i++) {   // stars far down, being eaten
      const q = (t * 0.18 + hash(i, seed + 20)) % 1, a = hash(i, seed + 21) * TAU, d = r * 0.8 * hash(i, seed + 22) * (1 - q);
      circle(ctx, x + Math.cos(a) * d, y + r * 0.12 + Math.sin(a) * d * 0.8, 0.7 + (1 - q), rgba('#f0e8ff', 0.7 * (1 - q) * (0.4 + 0.6 * Math.sin(t * 2.5 + i) ** 2)));
    }
    holePath(ctx, x, y, r, seed); ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(K.vioD, 0.7); ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = rgba(K.vioG, 0.55); ctx.lineWidth = 8; ctx.stroke();
    ctx.restore();
    // ---- the bright rim
    holePath(ctx, x, y, r, seed); ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#05020a', 0.8); ctx.lineWidth = 6; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(K.vioG, 0.55 + 0.1 * Math.sin(t * 2 + seed)); ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = rgba(K.vioH, 0.95); ctx.lineWidth = 2; ctx.stroke();
    // ---- roots torn off at the edge, hanging over it
    for (let i = 0; i < 8; i++) {
      const a = hash(i, seed + 30) * TAU, d0 = r * (1.45 + 0.3 * hash(i, seed + 31)), d1 = r * (0.62 + 0.25 * hash(i, seed + 32)), sg = Math.sin(t * 1.3 + i * 2 + seed) * 2.5;
      const x0 = x + Math.cos(a) * d0, y0 = y + Math.sin(a) * d0 * 0.95, x1 = x + Math.cos(a + 0.12) * d1 + sg, y1 = y + Math.sin(a + 0.12) * d1 * 0.95 + 6 + sg;
      const w = 6 + 5 * hash(i, seed + 33);
      const sgn = i % 2 ? 1 : -1; bough(ctx, x0, y0, (x0 + x1) / 2 + sgn * 16, (y0 + y1) / 2 - 12, x1, y1 + 8, w * 1.5, w * 0.45, { seed: i, col: i % 2 ? K.grey : K.bark, n: 8, lw: 1.8, hi: 'rgba(200,180,150,0.22)' });
      poly(ctx, [x1 - w * 0.3, y1 + 6, x1 - w * 0.1, y1 + 14, x1 + w * 0.05, y1 + 8, x1 + w * 0.25, y1 + 15, x1 + w * 0.3, y1 + 6], K.heart, OUT, 1);
    }
    // ---- things falling in: dust, dead leaves, light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = 8 + Math.round(r / 11);
    for (let i = 0; i < n; i++) {
      const q = (t * (0.35 + 0.25 * hash(i, seed + 40)) + hash(i, seed + 41)) % 1, a = hash(i, seed + 42) * TAU + q * 1.8, d = r * (1.02 - 0.85 * q * q);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.95 + q * q * r * 0.25, al = Math.min(1, q * 6) * (1 - q * q) * k;
      if (i % 4 === 0) { ctx.globalCompositeOperation = 'source-over'; leaf(ctx, px, py, a * 3, 0.8 * (1 - q * 0.6), K.leaf[i % 5], al); ctx.globalCompositeOperation = 'lighter'; }
      else circle(ctx, px, py, 1.1 + 1.6 * (1 - q), rgba(i % 3 ? K.vioH : '#c8a878', 0.8 * al));
    }
    ctx.restore();
    if (k < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 2.2 + 30, '#dcc8ff', 0.6 * (1 - k)); ctx.restore(); }
    ctx.restore();
  }
  // every hole in a room's floor list, each at its entry's current size, easing open when it first appears
  function holes(ctx, room, t) {
    if (!room || !room.floor || !room.floor.length) return;
    for (const fl of room.floor) {
      if (fl.kind !== 'hole') continue;
      const m = room.mgHoles || (room.mgHoles = new Map());
      let h = m.get(fl.id);
      if (!h) { h = { born: t, r: fl.r }; m.set(fl.id, h); }
      const dr = fl.r - h.r; h.r = Math.abs(dr) < 0.6 ? fl.r : h.r + dr * 0.14;
      hole(ctx, { id: fl.id, x: fl.x, y: fl.y, r: h.r }, t, easeOut(Math.min(1, (t - h.born) / 0.5)));
    }
  }

  // ---------------------------------------------------------------------------------------------------------- the dead grove
  // a withered root running over the ground: a wandering path, thick at the foot, forking, shadowed, with a lit ridge
  function rootRun(c, x, y, a, len, w, seed, depth = 1) {
    const R = rng(seed), pts = [[x, y]], n = Math.max(4, Math.round(len / 20)); let px = x, py = y, an = a;
    for (let i = 0; i < n; i++) { an += (R() - 0.5) * 0.75; px += Math.cos(an) * len / n; py += Math.sin(an) * len / n; pts.push([px, py]); }
    c.save(); c.lineCap = 'round';
    for (const [pass, ox, oy, wk] of [['sh', 3, 5, 1.15], ['out', 0, 0, 1.4], ['body', 0, 0, 1], ['hi', -0.8, -1, 0.3]]) {
      for (let i = 0; i < n; i++) {
        const wi = Math.max(1.2, w * (1 - i / n * 0.8)) * wk + (pass === 'out' ? 2.4 : 0);
        c.beginPath(); c.moveTo(pts[i][0] + ox, pts[i][1] + oy); c.lineTo(pts[i + 1][0] + ox, pts[i + 1][1] + oy);
        c.strokeStyle = pass === 'sh' ? 'rgba(8,3,2,0.32)' : pass === 'out' ? OUT : pass === 'body' ? (i % 3 === 1 ? '#54483a' : '#5e5142') : 'rgba(190,168,138,0.2)'; c.lineWidth = wi; c.stroke();
      }
    }
    c.restore();
    if (depth > 0) for (let i = 2; i < n - 1; i++) if (R() < 0.3) rootRun(c, pts[i][0], pts[i][1], an + (R() < 0.5 ? 0.9 : -0.9), len * 0.45, w * 0.5, seed + i * 7, depth - 1);
  }
  function pillar(c, x, y, w, h, seed, lit) {
    const R = rng(seed), top = y - h;
    ellipse(c, x + 4, y + 2, w * 0.8, w * 0.28, 0, 'rgba(4,2,2,0.45)');
    const pg = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); pg.addColorStop(0, '#120c0a'); pg.addColorStop(0.6, '#2a1d17'); pg.addColorStop(1, '#4a2c1c');
    poly(c, [x - w / 2, y, x - w * 0.52, top + R() * 16, x - w * 0.2, top - R() * 12, x + w * 0.1, top + R() * 10, x + w * 0.5, top - R() * 8, x + w / 2, y], pg, OUT, 2.4);
    poly(c, [x + w * 0.22, y, x + w * 0.2, top + 12, x + w * 0.5, top - 6, x + w / 2, y], rgba('#e8883c', 0.12 + 0.34 * lit));
    for (let i = 0; i < 3; i++) line(c, x - w * 0.3 + R() * w * 0.5, y - h * (0.2 + 0.2 * i), x - w * 0.1 + R() * w * 0.4, y - h * (0.35 + 0.2 * i), 'rgba(6,2,2,0.5)', 1.4);
  }
  // a dead standing tree against the sky: black, forking
  function snag(c, x, y, h, seed) {
    const R = rng(seed);
    const arm = (px, py, a, L, w, d) => { const ex = px + Math.cos(a) * L, ey = py + Math.sin(a) * L; line(c, px, py, ex, ey, '#120d0b', w); if (d > 0) { arm(ex, ey, a + 0.5 + R() * 0.3, L * 0.7, w * 0.7, d - 1); arm(ex, ey, a - 0.5 - R() * 0.3, L * 0.7, w * 0.7, d - 1); } };
    arm(x, y, -Math.PI / 2 + (R() - 0.5) * 0.3, h * 0.5, 9, 3);
  }

  function buildGrove(c, bx, by) {
    const r = rng(2201), R = ARENA.r, mx = bx * 0.5, my = -by + 100;
    // ---- the night beyond: dusk haze, the meteor's glow, a few stars
    const g0 = c.createLinearGradient(0, -by, 0, by); g0.addColorStop(0, '#1c0f12'); g0.addColorStop(0.5, '#120a0b'); g0.addColorStop(1, '#0a0607');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 70; i++) circle(c, (r() * 2 - 1) * bx, -by + r() * by * 0.9, 0.5 + r() * 1.0, rgba('#f0dcc8', 0.12 + r() * 0.4));
    glow(c, mx, my, 560, '#b04a1a', 0.42); glow(c, mx, my, 300, '#ff8a3a', 0.3);
    for (let i = 0; i < 26; i++) { const a = r() * TAU, d = R + 40 + r() * 200; glow(c, Math.cos(a) * d, Math.sin(a) * d * 0.96, 80 + r() * 120, '#7a3414', 0.12 + 0.14 * Math.max(0, Math.cos(a + 0.9))); }   // the burning night, low on every side
    for (let i = 0; i < 18; i++) glow(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 90 + r() * 160, r() < 0.5 ? '#2a1424' : '#331a12', 0.35);
    SET3_SKY.draw(c, mx, my, 0.66, { dir: -0.55 });
    // ---- the crater's rim: dead trees, standing stones and snapped posts against the glow
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + r() * 0.3, d = R + 70 + r() * 90; snag(c, Math.cos(a) * d, Math.sin(a) * d * 0.96, 130 + r() * 120, 300 + i); }
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + r() * 0.2, d = R + 34 + r() * 110, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.96;
      pillar(c, x, y, 26 + r() * 22, 60 + r() * 100, 400 + i, clamp(0.5 + (x / bx) * 0.5 - (y / by) * 0.2, 0, 1));
    }
    c.beginPath(); c.arc(0, 0, R + 60, 0, TAU); c.arc(0, 0, R, 0, TAU, true); c.fillStyle = '#1c1210'; c.fill();      // the slope of the rim, dark
    for (let i = 0; i < 46; i++) {   // snapped posts of an old fence along the lip
      const a = i * TAU / 46 + r() * 0.05, d = R + 14 + r() * 24, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.98, h = 16 + r() * 34, w = 6 + r() * 5;
      poly(c, [x - w, y, x - w, y - h, x - w * 0.2, y - h - r() * 8, x + w, y - h + r() * 6, x + w, y], '#2c2019', OUT, 1.6); line(c, x + w * 0.6, y, x + w * 0.6, y - h + 4, rgba('#c8683a', 0.3), 1.6);
    }
    // ---- the ground: scorched, cracked brown earth
    c.save(); ARENA.trace(c, 0); c.clip();
    const sg = c.createRadialGradient(0, -30, 20, 0, 0, R); sg.addColorStop(0, '#a07a50'); sg.addColorStop(0.62, '#7c5a3c'); sg.addColorStop(1, '#4a301f');
    c.fillStyle = sg; c.fillRect(-R, -R, R * 2, R * 2);
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; glow(c, Math.cos(a) * d, Math.sin(a) * d, 40 + r() * 90, r() < 0.55 ? '#2a170c' : '#9a7048', 0.12 + r() * 0.12); }
    for (let i = 0; i < 20; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.95; glow(c, Math.cos(a) * d, Math.sin(a) * d, 30 + r() * 80, '#0e0705', 0.34); }   // soot
    for (let i = 0; i < 170; i++) {   // plates of dry earth
      const a = r() * TAU, d = Math.sqrt(r()) * R, s = 16 + r() * 36, pts = [], q0 = r() * TAU;
      for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.6; pts.push(Math.cos(a) * d + Math.cos(q) * s, Math.sin(a) * d + Math.sin(q) * s * 0.8); }
      poly(c, pts, `rgba(${120 + r() * 50 | 0},${86 + r() * 34 | 0},${54 + r() * 22 | 0},${0.12 + r() * 0.2})`, 'rgba(18,8,4,0.4)', 1.4);
    }
    const fiss = [];
    for (let i = 0; i < 84; i++) {   // long cracks, some with the Hunger's violet in them
      let x = (r() * 2 - 1) * R * 0.92, y = (r() * 2 - 1) * R * 0.92, a = r() * TAU; const n = 5 + Math.floor(r() * 7), pts = [x, y];
      for (let k = 0; k < n; k++) { a += (r() - 0.5) * 1.0; x += Math.cos(a) * (14 + r() * 26); y += Math.sin(a) * (14 + r() * 26); pts.push(x, y); }
      c.beginPath(); c.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k], pts[k + 1]); c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = 'rgba(12,5,3,0.78)'; c.lineWidth = 3.6; c.stroke(); c.strokeStyle = 'rgba(4,1,1,0.65)'; c.lineWidth = 1.6; c.stroke();
      if (i % 4 === 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(150,90,230,0.28)'; c.lineWidth = 1.4; c.stroke(); c.restore(); fiss.push({ pts, ph: r() * 9 }); }
    }
    for (let i = 0; i < 2200; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.1, r() < 0.6 ? `rgba(20,10,6,${0.12 + r() * 0.22})` : `rgba(210,170,120,${0.05 + r() * 0.14})`); }
    // ---- the roots, everywhere, running from where he stands out over the ground; more crossing between them
    for (let i = 0; i < 15; i++) { const a = i * TAU / 15 + (r() - 0.5) * 0.3; rootRun(c, Math.cos(a) * 52, -34 + Math.sin(a) * 36, a, 230 + r() * 280, 21 - (i % 3) * 3, 900 + i * 11, 1); }
    for (let i = 0; i < 9; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.9; rootRun(c, Math.cos(a) * d, Math.sin(a) * d, r() * TAU, 90 + r() * 140, 6 + r() * 4, 1300 + i * 5, 0); }
    for (let i = 0; i < 52; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.95; leaf(c, Math.cos(a) * d, Math.sin(a) * d, r() * TAU, 1.0 + r() * 0.8, K.leaf[Math.floor(r() * 5)], 0.9); }   // dead gold leaves
    glow(c, R * 0.5, -R * 0.55, 480, '#ff8a4a', 0.1);                                     // the meteor's light, from the upper right
    const v = c.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(8,3,2,0)'); v.addColorStop(1, 'rgba(8,3,2,0.58)'); c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    // ---- the lip: a dark ridge of rock, blocks of it broken away, its upper right edge lit by the meteor
    c.save(); ARENA.trace(c, 0); c.clip(); ARENA.trace(c, 0); c.strokeStyle = 'rgba(8,3,2,0.55)'; c.lineWidth = 34; c.stroke(); c.restore();
    const NB = 54;
    for (let i = 0; i < NB; i++) {
      const a0 = i * TAU / NB + 0.003, a1 = (i + 1) * TAU / NB - 0.003, ro = R + 12 + r() * 8, v2 = r(), am = (a0 + a1) / 2;
      c.beginPath(); c.arc(0, 0, ro, a0, a1); c.arc(0, 0, R - 1, a1, a0, true); c.closePath(); c.fillStyle = `rgb(${46 + v2 * 22 | 0},${32 + v2 * 16 | 0},${24 + v2 * 12 | 0})`; c.fill(); c.strokeStyle = 'rgba(6,2,2,0.9)'; c.lineWidth = 2.2; c.stroke();
      const lit = clamp(Math.cos(am + 0.9) * 0.9 + 0.1, 0, 1);
      c.beginPath(); c.arc(0, 0, ro - 2, a0 + 0.005, a1 - 0.005); c.strokeStyle = rgba('#e8884a', 0.1 + 0.4 * lit); c.lineWidth = 2; c.stroke();
      if (r() < 0.15) { c.save(); c.translate(Math.cos(am) * (R + 4), Math.sin(am) * (R + 4)); c.rotate(r() * TAU); jagged(c, -8, 0, 12, (r() - 0.5) * 8, i + 700, 'rgba(150,90,230,0.5)', 1.2); c.restore(); }
    }
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = 'rgba(2,1,1,0.9)'; c.lineWidth = 2.6; c.stroke();
    for (let i = 0; i < 9; i++) { const a = r() * TAU; rootRun(c, Math.cos(a) * (R + 18), Math.sin(a) * (R + 18), a + Math.PI + (r() - 0.5) * 0.6, 60 + r() * 70, 8 + r() * 4, 1600 + i * 3, 0); }   // roots gripping over the lip
    ArenaView.amb = {
      kind: 'grove', star: [mx, my], fiss,
      leaves: Array.from({ length: 30 }, () => ({ x: r(), y: r(), vx: 6 + r() * 12, vy: 4 + r() * 9, ph: r() * 9, sp: 0.5 + r() * 1.5, s: 1.1 + r() * 0.9, c: Math.floor(r() * 5) })),
      living: Array.from({ length: 9 }, () => { const a = r() * TAU, d = 90 + r() * (R - 160); return { x: Math.cos(a) * d, y: Math.sin(a) * d, a: r() * TAU, len: 50 + r() * 60, w: 7 + r() * 4, ph: r() * 9 }; }),
      embers: Array.from({ length: 26 }, () => ({ x: r(), y: r(), sp: 0.2 + r() * 0.4, ph: r() * 9 })),
    };
  }
  function groveLife(ctx, a, t) {
    const R = ARENA.r, fb = ArenaView.floorBox || { bx: R + 220, by: R + 220 }, bx = fb.bx, by = fb.by;
    ctx.save(); ctx.beginPath(); ARENA.trace(ctx, 0); ctx.clip();
    for (const f of a.fiss) {   // the cracks breathe violet
      const q = 0.5 + 0.5 * Math.sin(t * 0.9 + f.ph); if (q < 0.25) continue;
      ctx.beginPath(); ctx.moveTo(f.pts[0], f.pts[1]); for (let k = 2; k < f.pts.length; k += 2) ctx.lineTo(f.pts[k], f.pts[k + 1]);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(K.vioG, 0.1 + 0.26 * q); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    for (const rt of a.living) {   // roots shifting, slowly, as if they were looking for something
      const sw = Math.sin(t * 0.5 + rt.ph) * 0.35, ex = rt.x + Math.cos(rt.a + sw) * rt.len, ey = rt.y + Math.sin(rt.a + sw) * rt.len;
      bough(ctx, rt.x, rt.y, (rt.x + ex) / 2 + Math.sin(t * 0.7 + rt.ph) * 8, (rt.y + ey) / 2 + Math.cos(t * 0.6 + rt.ph) * 8, ex, ey, rt.w, 2.2, { seed: rt.ph, col: '#665a4a', n: 7, lw: 1.8, hi: 'rgba(200,184,160,0.24)' });
    }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const e of a.embers) { const q = (t * e.sp * 0.1 + e.ph) % 1, x = -bx + ((e.x + q * 0.12) % 1) * bx * 2, y = -by + ((e.y + q * 0.5 + 1) % 1) * by * 2; circle(ctx, x, y, 1.2, rgba('#ff9a4a', 0.35 + 0.3 * Math.sin(t * 3 + e.ph))); }
    ctx.restore();
    for (const l of a.leaves) {   // dead leaves blown across the grove
      const x = ((l.x * bx * 2 + t * l.vx) % (bx * 2) + bx * 2) % (bx * 2) - bx, y = ((l.y * by * 2 + t * l.vy) % (by * 2) + by * 2) % (by * 2) - by + Math.sin(t * l.sp + l.ph) * 8;
      if (Math.hypot(x, y) < R + 80) leaf(ctx, x, y, t * l.sp * 1.5 + l.ph, l.s, K.leaf[l.c], 0.85);
    }
    SET3_SKY.life(ctx, a.star[0], a.star[1], 0.66, t);
  }

  // ---------------------------------------------------------------------------------------------------------- the grove remade
  // keep the part of a flat polygon where nx*x + ny*y <= d (one step of cutting a cell out of its neighbours)
  function clipHalf(pts, nx, ny, d) {
    const out = [], n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[((i + 1) % n) * 2], by = pts[((i + 1) % n) * 2 + 1], da = nx * ax + ny * ay - d, db = nx * bx + ny * by - d;
      if (da <= 0) out.push(ax, ay);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const q = da / (da - db); out.push(ax + (bx - ax) * q, ay + (by - ay) * q); }
    }
    return out;
  }
  const shifted = (pts, dx, dy) => pts.map((v, i) => v + (i % 2 ? dy : dx));
  // one floating piece of the grove: a slab of cracked earth with a dark, violet-edged underside. Drawn once into its own sprite (they bob).
  function drawChunk(g, pts, o) {
    const R2 = rng(o.seed), T = o.thick || 11, R = ARENA.r;
    g.save();
    if (o.clip) { g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip(); }
    for (let k = T; k > 0; k -= 2.2) poly(g, shifted(pts, 0, k), k > T - 3 ? '#1c0e22' : k < 4 ? '#3c2519' : '#2b1911');
    poly(g, shifted(pts, 0, T), null, rgba('#b88aff', 0.6), 1.8);
    const base = ['#6c4e35', '#634730', '#765639', '#5c432e'][o.seed % 4];
    poly(g, pts, base, null);
    g.save(); g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.clip();
    let cx = 0, cy = 0; for (let i = 0; i < pts.length; i += 2) { cx += pts[i]; cy += pts[i + 1]; } cx /= pts.length / 2; cy /= pts.length / 2;
    glow(g, cx - 20, cy - 24, 120, '#b08850', 0.14);
    for (let i = 0; i < 4; i++) glow(g, cx + (R2() - 0.5) * 120, cy + (R2() - 0.5) * 90, 30 + R2() * 40, R2() < 0.5 ? '#2a170c' : '#9a7048', 0.16);
    for (let i = 0; i < 5; i++) {   // cracks
      let x = cx + (R2() - 0.5) * 110, y = cy + (R2() - 0.5) * 80, a = R2() * TAU; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { a += (R2() - 0.5) * 1.1; x += Math.cos(a) * (10 + R2() * 18); y += Math.sin(a) * (10 + R2() * 18); g.lineTo(x, y); }
      g.lineJoin = 'round'; g.strokeStyle = 'rgba(12,5,3,0.7)'; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = 'rgba(2,1,1,0.5)'; g.lineWidth = 1; g.stroke();
      if (i === 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(150,90,230,0.4)'; g.lineWidth = 1.2; g.stroke(); g.restore(); }
    }
    for (let i = 0; i < 90; i++) circle(g, cx + (R2() - 0.5) * 220, cy + (R2() - 0.5) * 180, 0.4 + R2() * 1.1, R2() < 0.6 ? 'rgba(20,10,6,0.25)' : 'rgba(220,180,130,0.18)');
    if (R2() < 0.7) rootRun(g, cx - 60 + R2() * 40, cy - 30 + R2() * 60, R2() * TAU, 70 + R2() * 70, 8 + R2() * 5, o.seed * 3, 0);
    if (R2() < 0.55) leaf(g, cx + (R2() - 0.5) * 80, cy + (R2() - 0.5) * 60, R2() * TAU, 1.2 + R2() * 0.7, K.leaf[Math.floor(R2() * 5)], 0.95);
    g.restore();
    // the edge: dark rim, lit along the far (north) side, violet along the near one where it overhangs the dark
    poly(g, pts, null, 'rgba(16,6,4,0.9)', 2.2);
    g.save(); g.globalCompositeOperation = 'lighter'; poly(g, pts, null, 'rgba(170,110,255,0.34)', 1.3); g.restore();
    g.restore();
  }
  function buildRemade(c, bx, by) {
    const r = rng(2301), R = ARENA.r, sc = c.getTransform().a || 1;
    // ---- the dark: starless, violet-black, with the grove's light bleeding up out of it, and the stars being eaten
    c.fillStyle = '#040209'; c.fillRect(-bx, -by, bx * 2, by * 2);
    const g0 = c.createRadialGradient(0, 40, R * 0.3, 0, 40, Math.hypot(bx, by)); g0.addColorStop(0, '#150a2a'); g0.addColorStop(0.5, '#0a0516'); g0.addColorStop(1, '#030107');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 34; i++) glow(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 90 + r() * 200, r() < 0.5 ? '#3a1672' : '#240c4a', 0.16 + r() * 0.18);
    glow(c, 0, 50, R * 1.25, '#5a2ab0', 0.18);
    for (let i = 0; i < 150; i++) {   // faint stars, some already stretched toward the middle as they are eaten
      const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by, d = Math.hypot(x, y) || 1;
      if (i % 3 === 0) line(c, x, y, x - x / d * (6 + r() * 12), y - y / d * (6 + r() * 12), rgba('#e8dcff', 0.1 + r() * 0.22), 1);
      else circle(c, x, y, 0.4 + r() * 0.9, rgba('#f0e8ff', 0.08 + r() * 0.3));
    }
    for (let i = 0; i < 9; i++) {   // long wisps of the Hunger
      const a = r() * TAU, d = R * (0.9 + r() * 0.6); c.beginPath(); c.arc(0, 0, d, a, a + 0.5 + r() * 0.6); c.strokeStyle = rgba(K.vioG, 0.05 + r() * 0.07); c.lineWidth = 8 + r() * 14; c.lineCap = 'round'; c.stroke();
    }
    const mx = bx * 0.28, my = -by + 150;
    SET3_SKY.draw(c, mx, my, 0.82, { dir: -1.3 });
    // ---- the pieces: a Voronoi of cracked earth, each cut back from its neighbours so a thin crack of dark runs between them
    const seeds = [], sp = 150;
    for (let gy = -6; gy <= 6; gy++) for (let gx = -7; gx <= 7; gx++) {
      const x = gx * sp + (gy & 1 ? sp / 2 : 0) + (r() - 0.5) * 100, y = gy * sp * 0.88 + (r() - 0.5) * 100, d = Math.hypot(x, y);
      if (d < R + 230) seeds.push({ x, y, d });
    }
    const chunks = [], dustAt = [];
    seeds.forEach((s, i) => {
      let pts = [s.x - 500, s.y - 500, s.x + 500, s.y - 500, s.x + 500, s.y + 500, s.x - 500, s.y + 500];
      for (const o of seeds) {
        if (o === s) continue;
        const dx = o.x - s.x, dy = o.y - s.y, L = Math.hypot(dx, dy); if (L > 400) continue;
        const nx = dx / L, ny = dy / L; pts = clipHalf(pts, nx, ny, nx * (s.x + dx / 2) + ny * (s.y + dy / 2) - 5); if (pts.length < 6) break;
      }
      if (pts.length < 6) return;
      let near = s.d < R + 8; for (let k = 0; k < pts.length && !near; k += 2) if (Math.hypot(pts[k], pts[k + 1]) < R + 8) near = true;
      let o = { seed: i + 17, clip: near, thick: near ? 11 : 9 }, amp = 1.2 + r() * 1.4;
      if (!near) {   // outside the room: a drifting fragment, smaller, pushed out a little
        if (r() < 0.42 || s.d > R + 190) return;
        let cx = 0, cy = 0; for (let k = 0; k < pts.length; k += 2) { cx += pts[k]; cy += pts[k + 1]; } cx /= pts.length / 2; cy /= pts.length / 2;
        const k = 0.45 + r() * 0.3, push = 14 + r() * 40, ux = s.x / (s.d || 1), uy = s.y / (s.d || 1);
        pts = pts.map((v, j) => (j % 2 ? cy + (v - cy) * k + uy * push + (r() - 0.5) * 4 : cx + (v - cx) * k + ux * push)); o = { seed: i + 17, clip: false, thick: 8 }; amp = 2.4 + r() * 2;
      }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < pts.length; k += 2) { x0 = Math.min(x0, pts[k]); x1 = Math.max(x1, pts[k]); y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); }
      if (near) { x0 = Math.max(x0, -R - 4); x1 = Math.min(x1, R + 4); y0 = Math.max(y0, -R - 4); y1 = Math.min(y1, R + 4); }
      const pad = 16, w = Math.ceil(x1 - x0) + pad * 2, h = Math.ceil(y1 - y0) + pad * 2 + 10, cv = document.createElement('canvas');
      cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc);
      const g = cv.getContext('2d'); g.scale(cv.width / w, cv.height / h); g.translate(pad - x0, pad - y0);
      drawChunk(g, pts, o);
      let mxx = 0, myy = 0; for (let k = 0; k < pts.length; k += 2) { mxx += pts[k]; myy += pts[k + 1]; }
      glow(c, mxx / (pts.length / 2), myy / (pts.length / 2) + 10, Math.max(x1 - x0, y1 - y0) * 0.75, '#5a2ab0', near ? 0.12 : 0.2);   // its light on the dark under it
      chunks.push({ cv, x: x0 - pad, y: y0 - pad, w, h, ph: r() * 9, amp, far: !near });
      if (!near || s.d > R - 60) dustAt.push([x0 + (x1 - x0) * r(), y1 - 2]);
    });
    chunks.sort((a, b) => (b.far - a.far));   // the fragments beyond the room go behind
    ArenaView.amb = {
      kind: 'remade', star: [mx, my], chunks,
      dust: dustAt.concat(Array.from({ length: 30 }, () => { const a = (0.15 + r() * 0.7) * Math.PI, d = R - 4 + r() * 8; return [Math.cos(a) * d, Math.sin(a) * d]; })).map(p => ({ x: p[0] + (r() - 0.5) * 8, y: p[1], sp: 0.1 + r() * 0.16, ph: r(), s: 0.8 + r() * 1.4 })),
      motes: Array.from({ length: 40 }, () => ({ x: (r() * 2 - 1) * (R + 120), y: (r() * 2 - 1) * (R + 120), ph: r() * 9, sp: 0.3 + r() * 0.5 })),
    };
  }
  function remadeLife(ctx, a, t) {
    for (const k of a.chunks) ctx.drawImage(k.cv, k.x, k.y + Math.sin(t * 0.6 + k.ph) * k.amp, k.w, k.h);   // the pieces bob, each in its own time
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of a.motes) { const q = 0.5 + 0.5 * Math.sin(t * m.sp + m.ph); if (q > 0.55) circle(ctx, m.x + Math.sin(t * 0.3 + m.ph) * 14, m.y - (t * 6 + m.ph * 40) % 60, 1.2, rgba(K.vioH, 0.4 * (q - 0.5) * 2)); }
    for (const d of a.dust) {   // dust slipping off the edges and falling into the dark
      const q = (t * d.sp + d.ph) % 1, x = d.x + Math.sin(t * 1.3 + d.ph * 20) * 2, y = d.y + q * q * 120;
      circle(ctx, x, y, d.s * (1 - q * 0.6), rgba(q < 0.5 ? '#c8a878' : K.vioH, 0.6 * (1 - q)));
    }
    ctx.restore();
    SET3_SKY.life(ctx, a.star[0], a.star[1], 0.82, t);
  }


  return { body, sapling, limbArt, hole, holes, buildGrove, groveLife, buildRemade, remadeLife, LIMB_PROP, LIMB_COL };
})();

BOSS_ART.morrowoak = MG_ART.body;
ADD_ART.sapling = MG_ART.sapling;
ArenaView.buildGrove = MG_ART.buildGrove;
ArenaView.groveLife = MG_ART.groveLife;
ArenaView.buildRemade = MG_ART.buildRemade;
ArenaView.remadeLife = MG_ART.remadeLife;
for (const k in MG_ART.LIMB_COL) ADD_ART['limb-' + k] = MG_ART.limbArt(k);
