// The Founding: wild camps, drawing (pass 3). A layer on Founding.addLayer (see docs/plans/founding-pass3.md).
// Ten creatures in four families (boars, wolves, river things, cairn things), each drawn in code facing +x with their own idle life
// (grazing, prowling, bobbing, smouldering); a mark on the ground at each camp (a wallow, a den, a reed nest, a cairn ring) drawn only
// where the party can see it, and on the minimap once it has been seen. The host sends the creatures as ordinary enemies and
// `props.wc` (one state code per camp: 0 asleep, 1 awake, 2 cleared); events wcwake wcrst wcclr wcre wchowl wcmv wcfx.
(function () {
  'use strict';
  if (typeof Founding === 'undefined' || typeof FoundingSim === 'undefined' || !FoundingSim.WILD) return;
  const WD = FoundingSim.WILD, CAMPS = WD.CAMPS, SPEC = WD.SPECIALS;
  const PI = Math.PI, TAU = PI * 2, OUT = '#0b0806';
  let K = null;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const S = () => K && K.S;
  const seen = CAMPS.map(() => false);           // the party has laid eyes on this camp (minimap)
  const lastSt = CAMPS.map(() => 0);
  const corpses = [];
  const markCache = {};
  const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------------------------------------------------------------- small drawing helpers
  const E = (g, x, y, rx, ry, rot, fill, stroke, lw) => K.ell(g, x, y, rx, ry, rot, fill, stroke, lw);
  const C = (g, x, y, r, fill, stroke, lw) => K.ell(g, x, y, r, r, 0, fill, stroke, lw);
  const poly = (g, pts, fill, stroke, lw) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.lineJoin = 'round'; g.stroke(); } };
  const crack = (g, pts, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); };

  // ---------------------------------------------------------------- the creatures. p: { wh, F, ol, t, wp, mv, idle, wind, ph, tier }
  // Each is drawn round the origin, facing +x, sized by r (the kind's radius).
  function boar(g, r, p, sow) {
    const F = p.F, ol = p.ol, gait = Math.sin(p.wp * 0.55) * p.mv, graze = p.idle ? 0.5 + 0.5 * Math.sin(p.t * 1.1 + p.ph) : 0;
    // legs, trotting
    for (const s of [-1, 1]) for (const [bx, o] of [[0.5, 0], [-0.5, PI]]) E(g, r * bx + Math.sin(p.wp * 0.55 + o + (s > 0 ? PI : 0)) * r * 0.26 * p.mv, s * r * 0.72, r * 0.22, r * 0.15, 0, F('#2a201b'), ol, 1.3);
    // tail: a short ash tuft
    crack(g, [[-r * 0.95, 0], [-r * 1.2, Math.sin(p.t * 5 + p.ph) * r * 0.18 * (1 + p.mv)]], F('#3a2c25'), r * 0.14);
    E(g, -r * 0.1, 0, r * 1.02, r * 0.74, 0, F('#4d3b31'), ol, 1.9);
    // the bristle ridge down the back, grey with ash
    if (!p.wh) { g.fillStyle = '#26201d'; for (let i = -3; i <= 3; i++) { const x = -r * 0.1 + i * r * 0.24; poly(g, [[x - r * 0.1, -r * 0.1], [x, -r * 0.38 - (sow ? 3 : 0)], [x + r * 0.1, -r * 0.1]], '#26201d'); poly(g, [[x - r * 0.1, r * 0.1], [x, r * 0.38 + (sow ? 3 : 0)], [x + r * 0.1, r * 0.1]], '#26201d'); } }
    E(g, -r * 0.1, 0, r * 0.82, r * 0.22, 0, F('#2f2621'));
    // smouldering cracks on the flanks
    if (!p.wh) { const k = 0.7 + 0.3 * Math.sin(p.t * 3 + p.ph); crack(g, [[-r * 0.7, -r * 0.45], [-r * 0.4, -r * 0.3], [-r * 0.55, -r * 0.1]], `rgba(255,${120 + 50 * k | 0},40,.85)`, 1.2); crack(g, [[-r * 0.5, r * 0.5], [-r * 0.2, r * 0.32]], `rgba(255,${120 + 50 * k | 0},40,.8)`, 1.1); }
    // the head, lowered to the ground when it grazes
    const hx = r * 0.98 - graze * r * 0.14;
    E(g, hx, 0, r * 0.52, r * 0.44, 0, F('#5b4538'), ol, 1.7);
    E(g, hx + r * 0.42, 0, r * 0.3, r * 0.26, 0, F('#745646'), ol, 1.4);
    for (const s of [-1, 1]) { poly(g, [[hx + r * 0.3, s * r * 0.2], [hx + r * 0.78, s * r * 0.5], [hx + r * 0.6, s * r * 0.16]], F('#e2d6b4'), ol, 1.1); poly(g, [[hx - r * 0.12, s * r * 0.36], [hx - r * 0.3, s * r * 0.62], [hx + r * 0.05, s * r * 0.46]], F('#3a2d26'), ol, 1); }
    if (!p.wh) { C(g, hx + r * 0.08, -r * 0.2, r * 0.07, '#ffb040'); C(g, hx + r * 0.08, r * 0.2, r * 0.07, '#ffb040'); }
    if (sow && !p.wh) { // a collar of old tusks and a glowing wallow-crust on her back
      for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; poly(g, [[Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.5 + 0], [Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.72], [Math.cos(a + 0.18) * r * 0.58, Math.sin(a + 0.18) * r * 0.46]], '#d8ccaa', OUT, 1); }
      glow(g, -r * 0.3, 0, r * 0.9, '255,120,40', 0.12 + 0.05 * Math.sin(p.t * 3));
    }
  }
  function wolf(g, r, p, alpha) {
    const F = p.F, ol = p.ol, run = p.mv, prowl = p.idle ? Math.sin(p.t * 0.9 + p.ph) * 0.12 : 0;
    // four long legs, a bounding gait
    for (const s of [-1, 1]) for (const [bx, o] of [[0.55, 0], [-0.5, PI]]) E(g, r * bx + Math.sin(p.wp * 0.5 + o + (s > 0 ? 0.9 : 0)) * r * 0.5 * run, s * r * 0.55, r * 0.34, r * 0.13, 0, F('#35302d'), ol, 1.2);
    // the brush of a tail, swaying
    const sw = Math.sin(p.t * 2.2 + p.ph) * 0.35 + prowl;
    E(g, -r * 1.25, Math.sin(sw) * r * 0.3, r * 0.6, r * 0.2, sw * 0.6, F('#4a423d'), ol, 1.5);
    E(g, -r * 0.2, 0, r * 1.05, r * 0.5, 0, F('#5a504a'), ol, 1.8);
    if (!p.wh) { // the ember along the spine
      const k = 0.65 + 0.35 * Math.sin(p.t * 4 + p.ph); crack(g, [[-r * 0.95, 0], [-r * 0.2, 0], [r * 0.45, 0]], `rgba(255,${130 + 50 * k | 0},50,${alpha ? 0.95 : 0.7})`, alpha ? 2.2 : 1.4);
      if (alpha) for (let i = 0; i < 5; i++) { const x = -r * 0.8 + i * r * 0.4; poly(g, [[x - 2, -r * 0.2], [x, -r * (0.52 + 0.12 * Math.sin(p.t * 7 + i))], [x + 2, -r * 0.2]], 'rgba(255,150,50,.85)'); poly(g, [[x - 2, r * 0.2], [x, r * (0.52 + 0.12 * Math.sin(p.t * 7 + i + 1))], [x + 2, r * 0.2]], 'rgba(255,150,50,.85)'); }
    }
    // the head: a wedge, ears back
    const hx = r * 0.98 + prowl * r;
    poly(g, [[hx - r * 0.4, -r * 0.36], [hx + r * 0.7, -r * 0.13], [hx + r * 0.7, r * 0.13], [hx - r * 0.4, r * 0.36]], F('#6a5e56'), ol, 1.7);
    for (const s of [-1, 1]) poly(g, [[hx - r * 0.34, s * r * 0.3], [hx - r * 0.62, s * r * 0.56], [hx - r * 0.1, s * r * 0.4]], F('#3d3531'), ol, 1.1);
    C(g, hx + r * 0.68, 0, r * 0.1, F('#1b1411'));
    if (!p.wh) { C(g, hx + r * 0.12, -r * 0.17, r * 0.08, '#ffc050'); C(g, hx + r * 0.12, r * 0.17, r * 0.08, '#ffc050'); if (p.wind > 0.3) { poly(g, [[hx + r * 0.5, -r * 0.08], [hx + r * 0.7, -r * 0.2], [hx + r * 0.6, 0]], '#efe6cc'); poly(g, [[hx + r * 0.5, r * 0.08], [hx + r * 0.7, r * 0.2], [hx + r * 0.6, 0]], '#efe6cc'); } }
  }
  function snapper(g, r, p) {
    const F = p.F, ol = p.ol, graze = p.idle ? Math.sin(p.t * 0.8 + p.ph) : 0;
    for (const s of [-1, 1]) for (const bx of [0.55, -0.55]) E(g, r * bx + Math.sin(p.wp * 0.45 + (bx > 0 ? 0 : PI) + (s > 0 ? PI : 0)) * r * 0.2 * p.mv, s * r * 0.85, r * 0.3, r * 0.2, s * 0.3, F('#4a4a30'), ol, 1.3);
    crack(g, [[-r * 0.9, 0], [-r * 1.4, Math.sin(p.t * 2 + p.ph) * r * 0.2]], F('#4a4a30'), r * 0.22);
    E(g, -r * 0.05, 0, r * 1.05, r * 0.95, 0, F('#4b4a2c'), ol, 2);
    E(g, -r * 0.05, 0, r * 0.78, r * 0.68, 0, F('#5d5a35'));
    if (!p.wh) { g.strokeStyle = 'rgba(28,26,14,.75)'; g.lineWidth = 1.4; for (const a of [-0.7, 0, 0.7]) { g.beginPath(); g.moveTo(-r * 0.6, Math.sin(a) * r * 0.5); g.lineTo(r * 0.5, Math.sin(a) * r * 0.55); g.stroke(); } g.beginPath(); g.moveTo(-r * 0.05, -r * 0.7); g.lineTo(-r * 0.05, r * 0.7); g.stroke();
      // reeds growing from the shell
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4, bx = Math.cos(a) * r * 0.4, by = Math.sin(a) * r * 0.4, sway = Math.sin(p.t * 2 + i + p.ph) * 2; crack(g, [[bx, by], [bx + sway, by - r * 0.45]], '#8a9a4a', 1.4); } }
    // the head out front, the beak snapping when it winds up
    const open = p.wind > 0.2 ? p.wind * r * 0.3 : 0.25 * r * Math.max(0, graze) * 0.4;
    E(g, r * 1.05 + graze * r * 0.05, 0, r * 0.5, r * 0.36, 0, F('#6a6a3a'), ol, 1.6);
    poly(g, [[r * 1.2, -r * 0.1 - open], [r * 1.65, 0], [r * 1.2, r * 0.0 - open * 0.2]], F('#b3a572'), ol, 1.2); poly(g, [[r * 1.2, r * 0.1 + open], [r * 1.65, 0], [r * 1.2, r * 0.0 + open * 0.2]], F('#b3a572'), ol, 1.2);
    if (!p.wh) { C(g, r * 1.0, -r * 0.2, r * 0.07, '#e9c04a'); C(g, r * 1.0, r * 0.2, r * 0.07, '#e9c04a'); }
  }
  function spit(g, r, p) {
    const F = p.F, ol = p.ol, puff = p.wind > 0 ? p.wind : 0.1 + 0.1 * Math.sin(p.t * 2.4 + p.ph), hop = p.mv > 0.3 ? Math.abs(Math.sin(p.wp * 0.5)) * 2 : 0;
    for (const s of [-1, 1]) { E(g, -r * 0.6, s * r * 0.95, r * 0.5, r * 0.22, s * 0.5, F('#3f4a2c'), ol, 1.2); E(g, r * 0.4, s * r * 0.9, r * 0.42, r * 0.18, -s * 0.4, F('#3f4a2c'), ol, 1.2); }
    E(g, 0, 0, r * 1.1 + hop * 0.2, r * 0.95, 0, F('#566236'), ol, 1.9);
    if (!p.wh) { g.fillStyle = 'rgba(190,200,110,.35)'; for (let i = 0; i < 6; i++) C(g, hash(i, 3) * r - r * 0.7, (hash(i, 5) - 0.5) * r * 1.2, r * 0.1, 'rgba(190,200,110,.4)'); }
    // the throat sac swelling toward a spit
    E(g, r * 0.95, 0, r * (0.4 + 0.5 * puff), r * (0.34 + 0.4 * puff), 0, F(puff > 0.5 ? '#9aa860' : '#7d8a4c'), ol, 1.5);
    for (const s of [-1, 1]) { C(g, r * 0.4, s * r * 0.5, r * 0.3, F('#6a7840'), ol, 1.4); if (!p.wh) { C(g, r * 0.46, s * r * 0.5, r * 0.15, '#e6c24a'); C(g, r * 0.5, s * r * 0.5, r * 0.07, '#18130c'); } }
  }
  function silt(g, r, p) {
    const F = p.F, ol = p.ol, breath = Math.sin(p.t * 1.2 + p.ph) * 0.03;
    // a slumped mound of river-mud with arms dragging
    for (const s of [-1, 1]) { E(g, r * 0.55, s * r * 0.98, r * 0.62, r * 0.28, s * 0.35, F('#4c4a30'), ol, 2); E(g, r * 0.95, s * r * 1.05, r * 0.28, r * 0.24, 0, F('#5d5b3a'), ol, 1.6); }
    E(g, -r * 0.2, 0, r * 1.15 * (1 + breath), r * 1.02 * (1 - breath), 0, F('#403c27'), ol, 2.4);
    E(g, -r * 0.3, -r * 0.1, r * 0.88, r * 0.74, 0, F('#4d4a30'));
    if (!p.wh) { // moss, reeds and a drowned lantern-reed growing from her back
      g.fillStyle = 'rgba(110,130,60,.55)'; for (let i = 0; i < 9; i++) C(g, -r * 0.7 + hash(i, 1) * r * 0.9, (hash(i, 2) - 0.5) * r * 1.2, r * (0.1 + 0.12 * hash(i, 4)), 'rgba(110,130,60,.5)');
      for (let i = 0; i < 7; i++) { const bx = -r * 0.9 + hash(i, 7) * r * 0.9, by = (hash(i, 8) - 0.5) * r * 1.3, sway = Math.sin(p.t * 1.6 + i * 1.7) * 3; crack(g, [[bx, by], [bx + sway, by - r * (0.5 + 0.3 * hash(i, 9))]], i % 3 ? '#8c9b4c' : '#6f7e3a', 1.8); }
      glow(g, -r * 0.5, 0, r * 0.7, '230,190,90', 0.08 + 0.04 * Math.sin(p.t * 2));
    }
    // the broad head, mouth open when it winds
    const open = p.wind * r * 0.25;
    E(g, r * 1.0, 0, r * 0.62, r * 0.62, 0, F('#57532f'), ol, 2);
    E(g, r * 1.3, 0, r * 0.28, r * (0.26 + open / r), 0, F('#1d1a0e'), ol, 1.3);
    if (!p.wh) { for (const s of [-1, 1]) { C(g, r * 0.95, s * r * 0.34, r * 0.1, '#f0c050'); poly(g, [[r * 1.22, s * r * (0.24 + open / r)], [r * 1.34, s * r * (0.1 + open / r)], [r * 1.16, s * r * 0.12]], '#d8ccaa'); } }
  }
  function cairn(g, r, p) {
    const F = p.F, ol = p.ol, sh = p.mv > 0.3 ? Math.sin(p.wp * 0.4) * 1.2 : 0;
    for (const s of [-1, 1]) for (const bx of [0.5, -0.5]) E(g, r * bx + sh * (bx > 0 ? 1 : -1), s * r * 0.95, r * 0.28, r * 0.2, 0, F('#2f2b29'), ol, 1.3);
    // three stacked stones, a body of cairn-rock with an ember in the seams
    poly(g, [[-r * 0.95, -r * 0.5], [-r * 0.35, -r * 0.92], [r * 0.3, -r * 0.7], [r * 0.2, r * 0.3], [-r * 0.6, r * 0.55]], F('#4a4542'), ol, 2);
    poly(g, [[-r * 0.2, r * 0.9], [r * 0.5, r * 0.62], [r * 0.95, r * 0.2], [r * 0.4, -r * 0.1], [-r * 0.5, r * 0.3]], F('#575049'), ol, 2);
    poly(g, [[-r * 0.1, -r * 0.5], [r * 0.7, -r * 0.55], [r * 0.95, -r * 0.1], [r * 0.3, r * 0.15], [-r * 0.3, -r * 0.1]], F('#625b52'), ol, 2);
    if (!p.wh) { const k = 0.6 + 0.4 * Math.sin(p.t * 2.4 + p.ph); crack(g, [[-r * 0.7, -r * 0.2], [-r * 0.2, -r * 0.1], [r * 0.1, r * 0.3], [r * 0.6, r * 0.2]], `rgba(255,${110 + 60 * k | 0},35,.9)`, 1.5); crack(g, [[r * 0.1, -r * 0.4], [r * 0.45, -r * 0.2]], `rgba(255,${110 + 60 * k | 0},35,.8)`, 1.2); C(g, r * 0.62, -r * 0.2, r * 0.12, '#ffb040'); C(g, r * 0.62, r * 0.05, r * 0.12, '#ffb040'); }
  }
  function wisp(g, r, p) {
    const bob = Math.sin(p.t * 3 + p.ph) * 1.8, a = p.wh ? 1 : 0.9;
    if (p.wh) { C(g, 0, bob, r * 1.1, '#fff'); return; }
    // a tail of ember trailing behind
    for (let i = 0; i < 5; i++) { const k = i / 5, x = -r * (0.6 + i * 0.7), y = bob * (1 - k) + Math.sin(p.t * 6 + i) * r * 0.3 * k; C(g, x, y, r * (0.8 - k * 0.6), `rgba(255,${140 + 80 * (1 - k) | 0},50,${0.5 * (1 - k)})`); }
    glow(g, 0, bob, r * 3.2, '255,140,50', 0.35 + 0.1 * Math.sin(p.t * 8));
    C(g, 0, bob, r * 0.95, `rgba(255,170,60,${a})`, 'rgba(120,40,10,.8)', 1.4); C(g, r * 0.1, bob, r * 0.55, '#ffe08a'); C(g, r * 0.2, bob, r * 0.25, '#fffbe6');
    C(g, r * 0.45, bob - r * 0.25, r * 0.12, '#3a1608'); C(g, r * 0.45, bob + r * 0.25, r * 0.12, '#3a1608');
  }
  function warden(g, r, p) {
    const F = p.F, ol = p.ol, breath = Math.sin(p.t * 0.9 + p.ph) * 0.02;
    // a cairn-giant: stacked boulders for shoulders and fists, a slab of a head, ember in every seam
    for (const s of [-1, 1]) { E(g, r * 0.35, s * r * 1.02, r * 0.5, r * 0.38, s * 0.2, F('#4a4542'), ol, 2.4); E(g, r * 0.9 + (p.wind > 0 ? -r * 0.12 * p.wind : 0), s * r * 1.08, r * 0.38, r * 0.34, 0, F('#5b544d'), ol, 2.2); }
    E(g, -r * 0.2, 0, r * 1.05 * (1 + breath), r * 0.98 * (1 - breath), 0, F('#3d3936'), ol, 2.6);
    poly(g, [[-r * 0.9, -r * 0.5], [-r * 0.3, -r * 0.95], [r * 0.35, -r * 0.62], [r * 0.1, -r * 0.1], [-r * 0.6, -r * 0.05]], F('#524c47'), ol, 2);
    poly(g, [[-r * 0.8, r * 0.55], [-r * 0.1, r * 0.95], [r * 0.5, r * 0.5], [r * 0.2, r * 0.05], [-r * 0.5, r * 0.1]], F('#5b544d'), ol, 2);
    poly(g, [[-r * 0.3, -r * 0.3], [r * 0.4, -r * 0.35], [r * 0.5, r * 0.3], [-r * 0.25, r * 0.35]], F('#675f56'), ol, 2);
    if (!p.wh) { const k = 0.6 + 0.4 * Math.sin(p.t * 1.8 + p.ph); crack(g, [[-r * 0.8, -r * 0.2], [-r * 0.3, 0], [-r * 0.1, r * 0.4], [r * 0.2, r * 0.5]], `rgba(255,${105 + 60 * k | 0},30,.95)`, 2.2); crack(g, [[-r * 0.1, -r * 0.7], [r * 0.15, -r * 0.35], [r * 0.45, -r * 0.1]], `rgba(255,${105 + 60 * k | 0},30,.9)`, 1.8); glow(g, -r * 0.2, 0, r * 1.4, '255,110,40', 0.1 + 0.05 * k); }
    // the head: a slab with a crown of small stones, two ember eyes
    E(g, r * 0.7, 0, r * 0.46, r * 0.4, 0, F('#6e665c'), ol, 2.2);
    for (let i = -2; i <= 2; i++) poly(g, [[r * 0.5, i * r * 0.14 - 3], [r * 0.4, i * r * 0.14], [r * 0.5, i * r * 0.14 + 3]], F('#8a8174'), ol, 1);
    if (!p.wh) { C(g, r * 0.88, -r * 0.16, r * 0.09, '#ffb040'); C(g, r * 0.88, r * 0.16, r * 0.09, '#ffb040'); }
  }
  function glow(g, x, y, r, rgb, a) { K.glowAt(g, x, y, r, rgb, a); }
  const ART = { wboar: (g, r, p) => boar(g, r, p, false), wsow: (g, r, p) => boar(g, r, p, true), wwolf: (g, r, p) => wolf(g, r, p, false), walpha: (g, r, p) => wolf(g, r, p, true), wsnapper: snapper, wspit: spit, wsilt: silt, wcairn: cairn, wwisp: wisp, wwarden: warden };

  // ---------------------------------------------------------------- one creature, in the world
  function campOf(u) {
    if (u.wci !== undefined) return u.wci;
    let bi = -1, bd = 360; CAMPS.forEach((c, i) => { const d = Math.hypot(c.x - u.x, c.y - u.y); if (d < bd) { bd = d; bi = i; } });
    return (u.wci = bi);
  }
  const campState = ci => { const P = S() && S().props; return P && P.wc && ci >= 0 ? P.wc[ci] | 0 : 0; };
  function pose(u, wh) {
    const s = S(), t = s.T, def = u.def, wind = !!(u.f & K.FLAG.WIND), ci = campOf(u);
    let atkP = 0;
    if (wind) { const sp = u.spT0 && t - u.spT0 < 2.2 && SPEC[u.spKind] ? SPEC[u.spKind].warn : def.atk.wind; atkP = clamp((t - (u.windT0 || t)) / Math.max(0.2, sp), 0, 1); }
    return { wh, F: wh ? (() => '#fff') : (c => c), ol: wh ? null : OUT, t, wp: u.wp, mv: u.mv, idle: campState(ci) === 0 && u.mv < 0.35 && !wind, wind: atkP, ph: u.ph };
  }
  function drawBody(c, u, k) {
    const def = u.def, r = def.r, art = ART[u.eid]; if (!art) return;
    const s = S(), t = s.T, wind = !!(u.f & K.FLAG.WIND), P = pose(u, false), ret = !!(u.f & K.FLAG.INVULN);
    let alpha = u.vis * (k && k.fade !== undefined ? k.fade : 1);
    const born = t - (u.born || t); if (born < 0.8) alpha *= K.clamp(born / 0.8, 0, 1);   // a camp coming into the world fades in
    if (ret) alpha *= 0.72;
    if (alpha < 0.02) return;
    K.ell(c, u.x + 2, u.y + r * 0.72, r * 1.05, r * 0.56, 0, `rgba(0,0,0,${0.3 * alpha})`);
    c.save(); c.translate(u.x, u.y);
    c.rotate(u.face + Math.sin(u.wp * 1.0 + u.ph) * 0.06 * P.mv * (wind ? 0 : 1));
    const eoo = K.eo, lean = -4 * eoo(Math.min(1, P.wind * 1.3)) * (def.elite ? 1.4 : 1) + u.lunge * (def.elite ? 10 : 8);
    c.translate(lean, 0); c.scale(1 + 0.22 * u.sq, 1 - 0.2 * u.sq);
    const bs = 1 + Math.sin(u.wp * 1.4 + u.ph) * 0.03 * P.mv + (wind ? 0.07 * eoo(P.wind) : 0); c.scale(bs, 1 / bs);
    if (alpha < 1) c.globalAlpha = alpha;
    art(c, r, P);
    if (u.flash > 0) { c.globalAlpha = Math.min(1, u.flash / 0.12 * 0.9) * alpha; art(c, r, pose(u, true)); c.globalAlpha = alpha; }
    if (wind) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = eoo(P.wind) * 0.38 * alpha; art(c, r, pose(u, true)); c.globalCompositeOperation = 'source-over'; c.globalAlpha = alpha; }
    c.restore();
    if (ret) { // a returning creature heals: green motes rise from it
      for (let i = 0; i < 3; i++) { const q = (t * 1.2 + i / 3) % 1; K.ell(c, u.x + Math.sin(i * 2 + t * 3) * r * 0.6, u.y - q * r * 1.4, 2.2 * (1 - q), 2.2 * (1 - q), 0, `rgba(150,235,160,${0.8 * (1 - q)})`); }
      K.ell(c, u.x, u.y + 2, r + 5, (r + 5) * 0.8, 0, null, 'rgba(150,235,160,.5)', 1.6);
    }
    // a leader of a camp stands a little prouder: a faint ember ring on the ground while it holds its camp
    if (def.elite && !ret) K.ell(c, u.x, u.y + 2, r + 7, (r + 7) * 0.8, 0, null, 'rgba(255,170,90,.18)', 1.5);
  }

  // ---------------------------------------------------------------- the camps' ground marks (drawn once each, then blitted)
  function markSprite(i) {
    const key = i; if (markCache[key]) return markCache[key];
    const c = CAMPS[i], SZ = 300, cv = document.createElement('canvas'); cv.width = cv.height = SZ * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(SZ / 2, SZ / 2);
    const h = (a, b) => hash(i * 977 + a, b), bone = (x, y, a, l) => { g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-l / 2, 0); g.lineTo(l / 2, 0); g.stroke(); g.strokeStyle = '#cdbf9c'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-l / 2, 0); g.lineTo(l / 2, 0); g.stroke(); C(g, -l / 2, -1.2, 1.7, '#cdbf9c'); C(g, -l / 2, 1.2, 1.7, '#cdbf9c'); C(g, l / 2, -1.2, 1.7, '#cdbf9c'); C(g, l / 2, 1.2, 1.7, '#cdbf9c'); g.restore(); };
    const fam = c.fam;
    if (fam === 'boar') {   // a trampled wallow: churned dark earth, a rim of heaped mud, tusks and a skull
      E(g, 0, 6, 92, 62, 0, 'rgba(36,26,18,.55)'); E(g, 0, 4, 78, 50, 0, 'rgba(58,40,28,.6)'); E(g, -6, 2, 58, 34, 0, 'rgba(34,24,17,.55)');
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rr = 80 + h(k, 1) * 12; E(g, Math.cos(a) * rr, 6 + Math.sin(a) * rr * 0.66, 9 + h(k, 2) * 7, 5 + h(k, 3) * 4, a, 'rgba(72,52,36,.8)', 'rgba(20,12,8,.5)', 1); }
      for (let k = 0; k < 7; k++) { g.strokeStyle = 'rgba(20,12,8,.5)'; g.lineWidth = 2; const x = (h(k, 5) - 0.5) * 110, y = (h(k, 6) - 0.5) * 70; g.beginPath(); g.moveTo(x - 4, y - 3); g.lineTo(x, y + 3); g.moveTo(x + 4, y - 3); g.lineTo(x + 6, y + 3); g.stroke(); }
      bone(-38, 18, 0.5, 20); bone(30, -14, -0.8, 16); poly(g, [[48, 22], [62, 16], [56, 30]], '#cdbf9c', 'rgba(0,0,0,.4)', 1);
    } else if (fam === 'wolf') {   // a den: a hollow dug into a heaped mound, dark mouth, scattered fur and bones
      E(g, 0, 10, 100, 64, 0, 'rgba(0,0,0,.18)'); E(g, 0, 0, 82, 54, 0, 'rgba(78,60,44,.78)', 'rgba(22,14,9,.6)', 2); E(g, 0, -4, 62, 38, 0, 'rgba(98,78,58,.6)');
      E(g, 4, 6, 40, 22, 0, 'rgba(8,5,4,.9)'); E(g, 8, 4, 28, 14, 0, 'rgba(0,0,0,.95)'); E(g, 0, 2, 44, 25, 0, null, 'rgba(18,10,6,.7)', 2.4);
      for (let k = 0; k < 9; k++) { const a = h(k, 1) * TAU, rr = 60 + h(k, 2) * 36; g.strokeStyle = h(k, 3) > 0.5 ? 'rgba(92,84,76,.8)' : 'rgba(60,54,48,.8)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.65); g.lineTo(Math.cos(a) * rr + 7, Math.sin(a) * rr * 0.65 + 3); g.stroke(); }
      bone(-52, 20, 0.3, 22); bone(46, 28, -0.4, 18); bone(-30, -34, 1.2, 14);
    } else if (fam === 'river') {   // a nest of matted reeds round a mud basin
      E(g, 0, 8, 96, 60, 0, 'rgba(30,34,18,.45)'); E(g, 0, 4, 76, 46, 0, 'rgba(44,48,26,.7)'); E(g, 0, 4, 52, 30, 0, 'rgba(26,30,18,.8)'); E(g, 0, 4, 52, 30, 0, null, 'rgba(120,128,66,.4)', 2);
      for (let k = 0; k < 30; k++) { const a = k / 30 * TAU + h(k, 1) * 0.2, rr = 72 + h(k, 2) * 18; g.strokeStyle = h(k, 3) > 0.45 ? '#6f7e3a' : '#8c9b4c'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); const x0 = Math.cos(a) * rr, y0 = 4 + Math.sin(a) * rr * 0.62; g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a + 1.2) * 12, y0 + Math.sin(a + 1.2) * 8 - 10 - h(k, 5) * 8); g.stroke(); }
      for (let k = 0; k < 3; k++) E(g, (h(k, 7) - 0.5) * 60, 4 + (h(k, 8) - 0.5) * 30, 6, 4, 0, 'rgba(206,196,160,.7)', 'rgba(20,20,10,.5)', 1);   // egg-white shells
      bone(34, 26, 0.7, 16);
    } else {   // a ring of cairn stones with scorched earth and cold embers
      E(g, 0, 8, 100, 64, 0, 'rgba(0,0,0,.2)'); E(g, 0, 4, 84, 52, 0, 'rgba(26,18,14,.55)'); E(g, 0, 4, 60, 36, 0, 'rgba(14,9,7,.5)');
      for (let k = 0; k < 11; k++) { const a = k / 11 * TAU, rr = 78 + h(k, 2) * 6, x = Math.cos(a) * rr, y = 4 + Math.sin(a) * rr * 0.64, s = 10 + h(k, 3) * 8; poly(g, [[x - s, y + s * 0.4], [x - s * 0.6, y - s * 0.7], [x + s * 0.5, y - s * 0.8], [x + s, y + s * 0.3], [x + s * 0.2, y + s * 0.8]], '#575049', 'rgba(10,6,5,.7)', 1.6); poly(g, [[x - s * 0.5, y - s * 0.4], [x + s * 0.3, y - s * 0.5], [x + s * 0.2, y + s * 0.1]], '#6e665c'); }
      for (let k = 0; k < 6; k++) { const x = (h(k, 5) - 0.5) * 90, y = 4 + (h(k, 6) - 0.5) * 50; crack(g, [[x - 6, y], [x, y + 3], [x + 7, y - 2]], 'rgba(255,120,40,.35)', 1.2); }
    }
    return (markCache[key] = cv);
  }
  function drawMark(c, i) {
    const cp = CAMPS[i], st = campState(i), t = S().T, spr = markSprite(i), a = st === 2 ? 0.55 : 1;
    c.save(); c.globalAlpha = a; c.drawImage(spr, cp.x - 150, cp.y - 150, 300, 300); c.restore();
    if (cp.fam === 'stone' && st !== 2) K.glowAt(c, cp.x, cp.y + 4, 70, '255,120,40', 0.1 + 0.05 * Math.sin(t * 1.7 + i));
    if (cp.fam === 'stone' && st === 2) for (let k = 0; k < 3; k++) { const q = (t * 0.25 + k / 3 + i) % 1; K.ell(c, cp.x + (hash(i, k) - 0.5) * 70, cp.y - q * 22, 2, 2, 0, `rgba(160,160,160,${0.25 * (1 - q)})`); }   // a cold camp: a wisp of smoke
  }

  // ---------------------------------------------------------------- the layer
  const LAYER = {
    init(kit) { K = kit; },
    snap() {
      const s = S(); if (!s) return;
      CAMPS.forEach((c, i) => { if (!seen[i] && K.visAt(c.x, c.y, 50)) seen[i] = true; });
    },
    update(dt) {
      const s = S(); if (!s) return;
      for (let i = corpses.length - 1; i >= 0; i--) { const k = corpses[i]; k.t += dt; k.x += k.vx * dt; k.y += k.vy * dt; const f = Math.exp(-dt * 5); k.vx *= f; k.vy *= f; k.rot += k.vr * dt; k.vr *= f; if (k.t > k.life) corpses.splice(i, 1); }
      const P = s.props; if (P && P.wc) CAMPS.forEach((c, i) => {
        const st = P.wc[i] | 0;
        if (lastSt[i] === 2 && st === 0 && K.visAt(c.x, c.y, 60)) { K.fxRing(c.x, c.y, 10, 70, 0.9, '210,200,150', 2, 0); K.burst(c.x, c.y, 8, { color: '#6a5a46', spd: 40, dur: 0.8, size: 3, kind: 'dust' }); }   // the camp fills again, in sight
        lastSt[i] = st;
      });
    },
    ground(c, inV) {
      const s = S(); if (!s) return;
      CAMPS.forEach((cp, i) => { if (!inV(cp.x, cp.y) || !K.visAt(cp.x, cp.y, 90)) return; drawMark(c, i); });
      for (const k of corpses) { if (!inV(k.x, k.y) || !K.visAt(k.x, k.y, k.def.r)) continue; drawCorpse(c, k); }
    },
    drawEnemy(c, u) { if (!u.def || !u.def.wild) return false; strikeSnd(u); drawBody(c, u); return true; },
    mini(g, kx, ky) {
      const t = S().T;
      CAMPS.forEach((cp, i) => {
        if (!seen[i]) return; const st = campState(i), x = cp.x * kx, y = cp.y * ky;
        g.save(); g.lineWidth = 1.3;
        if (st === 2) { g.strokeStyle = 'rgba(190,180,150,.45)'; g.beginPath(); g.arc(x, y, 3.6, 0, TAU); g.stroke(); }
        else { g.strokeStyle = st === 1 ? 'rgba(255,120,90,.95)' : 'rgba(220,205,160,.85)'; g.fillStyle = 'rgba(30,22,14,.7)'; g.beginPath(); g.arc(x, y, 4.2 + (st === 1 ? 0.8 * Math.sin(t * 8) : 0), 0, TAU); g.fill(); g.stroke(); g.fillStyle = st === 1 ? '#ff8a6a' : '#dccfa4'; g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill(); }
        g.restore();
      });
    },
    event(ev) {
      const tag = ev[0], s = S();
      if (tag === 'd') {   // a wild creature dies: its own body on the ground, not the ashling the core would draw
        const u = K.U('e' + ev[1]) || (s && s.gone && s.gone.get('e' + ev[1]));
        if (!u || !u.def || !u.def.wild) return false;
        const elite = !!ev[7];
        K.snd(elite ? 'fd-elite-die' : 'fd-enemy-die');
        corpses.push({ x: ev[2], y: ev[3], rot: ev[4], face: ev[4], vx: ev[5], vy: ev[6], vr: (Math.random() - 0.5) * 4, t: 0, life: 2.6 + Math.random() * 0.4, def: u.def, eid: u.eid, ph: u.ph || 0, wp: u.wp || 0 });
        if (corpses.length > 40) corpses.shift();
        K.burst(ev[2], ev[3], elite ? 12 : 6, { color: '#ff9a3a', spd: 90, dur: 0.6, size: 2.2, kind: 'spark', vy: -20 }); K.burst(ev[2], ev[3], elite ? 7 : 3, { color: '#5a4034', spd: 60, dur: 0.7, size: 3.5, kind: 'dust' });
        if (elite) K.shake(3, 0.25);
        if (s && s.tgt === ev[1]) s.tgt = null;
        return true;
      }
      if (typeof tag !== 'string' || tag.indexOf('wc') !== 0 && tag !== 'wchowl') return false;
      if (tag === 'wcwake') { const cp = CAMPS[ev[1]]; if (cp && K.visAt(ev[3], ev[4], 40)) { K.snd('fd-wild-wake'); const u = K.U('e' + ev[2]); if (u) { u.sq = 1; } K.burst(ev[3], ev[4], 5, { color: '#7a6652', spd: 50, dur: 0.5, size: 3, kind: 'dust' }); } }
      else if (tag === 'wchowl') { if (K.visAt(ev[2], ev[3], 40)) { K.snd('fd-wild-howl'); K.fxRing(ev[2], ev[3], 14, 120, 0.8, '255,190,110', 2, 1); } }
      else if (tag === 'wcrst') { if (K.visAt(ev[2], ev[3], 40)) { K.snd('fd-wild-return'); K.fxRing(ev[2], ev[3], 8, 46, 0.7, '150,235,160', 1.6, 1); } }
      else if (tag === 'wcclr') { /* the kill already speaks; the camp's mark goes quiet through props.wc */ }
      else if (tag === 'wcmv') {
        const u = K.U('e' + ev[1]); if (u) { u.spT0 = s.T; u.spKind = ['rush', 'pounce', 'wave', 'stonefall'][ev[2]]; if (K.visAt(u.x, u.y, 40)) K.snd(['fd-mire-charge', 'fd-wick-lunge', 'fd-tail-sweep', 'fd-quake'][ev[2]] || 'fd-brute-slam'); }
      } else if (tag === 'wcfx') {
        const kind = ev[1], x = ev[2], y = ev[3], R = ev[4]; if (!K.visAt(x, y, 40)) return true;
        if (kind === 0) { const an = ev[5] || 0; K.burst(x, y, 10, { color: '#6a5646', spd: 110, dur: 0.5, size: 3.4, kind: 'dust', ang: an + PI, spread: 0.9 }); K.shake(2, 0.15); }
        else if (kind === 1) { K.fxRing(x, y, R * 0.3, R * 1.1, 0.4, '255,140,70', 3, 1); K.burst(x, y, 12, { color: '#6a5646', spd: 120, dur: 0.5, size: 3.4, kind: 'dust' }); K.shake(2.2, 0.2); }
        else if (kind === 2) { const a = ev[5] || 0; K.snd('fd-mire-stamp'); for (let k = 0; k < 12; k++) K.burst(x + Math.cos(a) * R * k / 12, y + Math.sin(a) * R * k / 12, 2, { color: '#5b5a34', spd: 80, dur: 0.6, size: 3.6, kind: 'dust', ang: a, spread: 0.7 }); K.shake(2, 0.18); }
        else if (kind === 3) { K.snd('fd-meteor-hit'); K.fxRing(x, y, R * 0.3, R * 1.05, 0.35, '210,180,140', 2.6, 1); K.burst(x, y, 9, { color: '#7a7066', spd: 130, dur: 0.55, size: 3.4, kind: 'dust' }); K.burst(x, y, 6, { color: '#ff9a3a', spd: 90, dur: 0.5, size: 2, kind: 'spark', vy: -30 }); K.shake(2.4, 0.2); }
      }
      return true;
    },
  };
  // a plain blow lands (the core flips u.lunge to 1 when the wind-up ends): each family has its own soft strike. The leaders' moves speak through wcmv.
  const STRIKE = { boar: 'fd-wild-boar', wolf: 'fd-wild-wolf', river: 'fd-wild-snap', stone: 'fd-wild-stone' };
  function strikeSnd(u) {
    if (u.lunge < 0.3) { u.wsDone = false; return; }
    if (u.wsDone || u.lunge < 0.45) return;
    u.wsDone = true; const d = u.def;
    if (d.sp || !K.visAt(u.x, u.y, 40)) return;
    K.snd(d.ranged ? (d.fam === 'river' ? 'fd-spit' : 'fd-auto-cast') : STRIKE[d.fam]);
  }
  function drawCorpse(c, k) {
    const art = ART[k.eid], s = S(); if (!art) return;
    const r = k.def.r, col = clamp(k.t / 0.35, 0, 1), fade = k.t > k.life - 0.7 ? clamp((k.life - k.t) / 0.7, 0, 1) : 1, ec = K.eo(col);
    K.ell(c, k.x + 3, k.y + 4, r * 1.1, r * 0.55, 0, `rgba(0,0,0,${0.3 * fade})`);
    c.save(); c.translate(k.x, k.y); c.rotate(k.rot); c.scale(1 + 0.18 * ec, 1 - 0.5 * ec); c.globalAlpha = fade * (1 - 0.25 * ec);
    art(c, r, { wh: false, F: x => x, ol: OUT, t: k.t, wp: 0, mv: 0, idle: false, wind: 0, ph: k.ph });
    c.globalAlpha = fade * 0.4 * ec; c.fillStyle = '#120a06'; c.beginPath(); c.ellipse(0, 0, r * 1.1, r, 0, 0, TAU); c.fill(); c.restore();
  }
  Founding.addLayer(LAYER);
})();
