// The Founding: the HUD and panels (DOM). Everything lives in #fd-root, created on mount and removed on unmount; styles are in
// client/founding.css (scoped under body.in-founding and #fd-* ids). It reads the scene through the api object client.js hands to
// mount(); it never touches the Net. In-game tooltips use Tip (ui-tip.js). All files LF.

// ================================================================ icons, drawn in code
// Every item, boon, quest and HUD mark has a placeholder drawn here (category silhouettes, tinted by rarity or the quest's colour). A painted
// PNG replaces one only when its key is listed in client/founding/icons/manifest.json (a JSON list of keys such as "item-jerkin",
// "skill-bastion-q", "boon-wellspring", "build-post", "quest-spring", "hud-tent"; the files sit beside it as <key>.png). Never list a file that
// is not there: the game only requests what the manifest names, so there are never any 404s.
const FoundingIcons = (() => {
  'use strict';
  const TAU = Math.PI * 2, OUT = '#1a130c', RC = ['#b9b2a2', '#6fd08c', '#5b8def', '#c78bff', '#ffb048'];
  const HERO_COL = { bastion: '#6f8cc0', cleric: '#d8b45a', pyromancer: '#d9703a', ranger: '#7aa860' };
  const QCOL = { spring: '#2f7f8c', gate: '#7a6a58', fire: '#c2561f', beacon: '#2b2f6b', road: '#9a8a58', graves: '#4a5fa0', stonegate: '#8a8f98', roof: '#8a5a30', cover: '#9c2b22', stakes: '#6f7a3a', mill: '#b0883e', larder: '#8c6b44', choice: '#6d7686', watchfires: '#b8441c' };
  let manifest = new Set(); const cache = new Map(), subs = [];
  const mix = (a, b, t) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), f = (s) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); return '#' + ((1 << 24) | (f(16) << 16) | (f(8) << 8) | f(0)).toString(16).slice(1); };
  const path = (c, pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
  const poly = (c, pts, f, s, lw) => { path(c, pts); if (f) { c.fillStyle = f; c.fill(); } if (s !== null) { c.strokeStyle = s || OUT; c.lineWidth = lw || 2; c.lineJoin = 'round'; c.stroke(); } };
  const circ = (c, x, y, r, f, s, lw) => { c.beginPath(); c.arc(x, y, r, 0, TAU); if (f) { c.fillStyle = f; c.fill(); } if (s !== null) { c.strokeStyle = s || OUT; c.lineWidth = lw || 2; c.stroke(); } };
  const ln = (c, x1, y1, x2, y2, col, lw) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw || 2; c.lineCap = 'round'; c.stroke(); };
  const ell = (c, x, y, rx, ry, f, s, lw, rot) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (f) { c.fillStyle = f; c.fill(); } if (s !== null) { c.strokeStyle = s || OUT; c.lineWidth = lw || 2; c.stroke(); } };
  const WOOD = '#8a6340', STEEL = '#c9d0d8', FLAME = '#ffcf5a', EMB = '#ff8a2a', CLOTH = '#e8dcc0';

  // ---- item painters: (ctx, palette, options); the space is 64 x 64
  const PT = {
    blade(c, P, o) { const L = o.len || 22; c.save(); c.translate(32, 32); c.rotate(-Math.PI / 4);
      poly(c, [[-L, -2.4], [-L + 10, -2.4], [-L + 10, 2.4], [-L, 2.4]], WOOD); poly(c, [[-L + 9, -7], [-L + 13, -7], [-L + 13, 7], [-L + 9, 7]], P.C);
      poly(c, [[-L + 13, -3.6], [L - 8, -3.6], [L + 1, 0], [L - 8, 3.6], [-L + 13, 3.6]], mix(STEEL, P.rc, 0.25)); ln(c, -L + 16, -1, L - 8, -1, '#fff', 1.2);
      if (o.ember) { ln(c, -L + 16, 2, L - 6, 2, EMB, 1.8); poly(c, [[L - 8, -3.6], [L - 4, -8], [L - 3, -3]], EMB, null, 0); } c.restore(); },
    vest(c, P, o) { const f = o.plate ? mix(P.A, '#9aa0aa', 0.45) : P.A;
      poly(c, [[19, 11], [27, 9], [32, 14], [37, 9], [45, 11], [53, 22], [46, 28], [45, 53], [19, 53], [18, 28], [11, 22]], f);
      if (o.bands) for (const y of [26, 34, 42]) { poly(c, [[19, y], [45, y], [45, y + 5], [19, y + 5]], P.C, null, 0); for (const x of [23, 41]) circ(c, x, y + 2.5, 1.3, '#d8d0c0', null); }
      if (o.lace) { ln(c, 32, 14, 32, 50, P.C, 1.6); for (let y = 18; y < 48; y += 6) { ln(c, 28, y, 36, y + 4, WOOD, 1.4); ln(c, 36, y, 28, y + 4, WOOD, 1.4); } poly(c, [[36, 36], [44, 36], [44, 44], [36, 44]], P.B, null, 1); }
      if (o.plate) { circ(c, 32, 30, 6, null, P.C, 2.2); circ(c, 32, 30, 1.6, P.C, null); for (const [x, y] of [[23, 20], [41, 20], [23, 46], [41, 46]]) circ(c, x, y, 1.4, '#e8e0d0', null); ln(c, 19, 40, 45, 40, P.C, 2); }
      ln(c, 22, 14, 28, 12, P.B, 1.6); },
    mantle(c, P) { poly(c, [[10, 40], [14, 24], [24, 15], [40, 15], [50, 24], [54, 40], [44, 48], [32, 44], [20, 48]], P.A);
      for (let i = 0; i < 6; i++) { const x = 16 + i * 6.4, y = 24 - Math.sin(i / 5 * Math.PI) * 9 + 9; poly(c, [[x - 2.4, y + 2], [x, y - 9], [x + 2.4, y + 2]], '#2a2420', null, 0); circ(c, x, y - 8, 1.3, '#d04a3a', null); }
      ln(c, 32, 30, 32, 44, P.C, 1.6); },
    whet(c, P) { c.save(); c.translate(32, 32); c.rotate(-0.6); poly(c, [[-22, -6], [22, -6], [24, 0], [22, 6], [-22, 6], [-24, 0]], mix('#8a8f98', P.rc, 0.25)); ell(c, 0, 0, 12, 2, P.C, null); ln(c, -8, -0.5, 8, -0.5, '#fff', 1.2); circ(c, -18, 0, 2, '#14100c', null); ln(c, -18, 0, -24, 6, WOOD, 1.6); c.restore(); },
    stone(c, P, o) { poly(c, [[14, 36], [18, 20], [30, 12], [46, 16], [52, 32], [46, 48], [28, 52], [16, 46]], mix('#8a8f98', P.rc, 0.3));
      ln(c, 20, 22, 28, 15, '#fff', 1.4);
      if (o.slash) { for (let i = 0; i < 5; i++) ln(c, 20 + i * 5, 36, 25 + i * 5, 26, '#c23a2a', 2); poly(c, [[14, 40], [52, 34], [52, 40], [14, 46]], '#7a1e1e', null, 1); }
      if (o.crack) { c.strokeStyle = FLAME; c.lineWidth = 2.4; c.beginPath(); c.moveTo(34, 12); c.lineTo(28, 26); c.lineTo(36, 34); c.lineTo(30, 52); c.stroke(); } },
    boots(c, P) { for (const [ox, oy] of [[9, 10], [29, 14]]) { c.save(); c.translate(ox, oy); poly(c, [[0, 0], [14, 0], [14, 22], [27, 28], [27, 38], [0, 38]], P.A); poly(c, [[0, 32], [27, 32], [27, 38], [0, 38]], P.C, null, 0); ln(c, 3, 5, 11, 5, P.B, 1.4); ln(c, 3, 11, 11, 11, P.B, 1.4); c.restore(); } },
    strap(c, P, o) { c.save(); c.translate(32, 32); c.rotate(-0.5); poly(c, [[-24, -7], [24, -7], [24, 7], [-24, 7]], P.A); ln(c, -22, -3, 22, -3, P.B, 1.2); poly(c, [[-4, -9], [6, -9], [6, 9], [-4, 9]], null, '#c8a55a', 3); ln(c, 2, -5, 2, 5, '#c8a55a', 2); c.restore();
      if (o.feather) { for (const [x, y, r] of [[40, 16, 0.4], [46, 24, 0.9]]) { c.save(); c.translate(x, y); c.rotate(r); ell(c, 0, 0, 3, 8, '#f0ece0'); c.restore(); } } },
    coil(c, P, o) { circ(c, 32, 36, 16, null, P.C, 8); circ(c, 32, 36, 16, null, P.B, 5); circ(c, 32, 36, 10, null, P.A, 3);
      if (o.thread) { for (const [x, y] of [[24, 20], [32, 16], [40, 20]]) circ(c, x, y, 2.4, '#6a6e78', null); ln(c, 20, 52, 18, 58, P.B, 1.6); ln(c, 44, 52, 46, 58, P.B, 1.6); }
      else { ln(c, 44, 24, 54, 12, P.B, 2); c.save(); c.translate(50, 14); c.rotate(0.7); ell(c, 0, 0, 3, 9, '#cfcab8'); c.restore(); } },
    flask(c, P, o) { const r = o.fat ? 17 : 14, cy = o.fat ? 40 : 41, liq = o.fat ? '#8a3a30' : '#d0505a';
      poly(c, [[27, 12], [37, 12], [37, 26], [27, 26]], mix('#9fd0e0', P.rc, 0.2)); poly(c, [[26, 8], [38, 8], [38, 13], [26, 13]], WOOD);
      c.save(); circ(c, 32, cy, r, mix('#9fd0e0', P.rc, 0.2), null); c.clip(); c.fillStyle = liq; c.fillRect(10, cy - 2, 44, 30); c.restore(); circ(c, 32, cy, r, null, OUT, 2.2);
      ln(c, 24, cy - 6, 24, cy + 2, '#fff', 2); ln(c, 27, 26, 37, 26, P.B, 2); },
    feather(c, P) { c.save(); c.translate(32, 32); c.rotate(-0.8); poly(c, [[-24, 0], [-12, -9], [8, -10], [22, -3], [22, 3], [8, 10], [-12, 9]], P.A); ln(c, -24, 0, 22, 0, P.C, 2); for (let x = -8; x < 18; x += 6) { ln(c, x, 0, x + 3, -8, P.B, 1.4); ln(c, x, 0, x + 3, 8, P.B, 1.4); } ln(c, -24, 0, -18, 0, '#c23a2a', 3); c.restore(); },
    lamp(c, P, o) { const bs = o.small ? 0.85 : 1; c.save(); c.translate(32, 34); c.scale(bs, bs); c.translate(-32, -34);
      c.beginPath(); c.arc(32, 12, 6, Math.PI, 0); c.strokeStyle = P.C; c.lineWidth = 2.5; c.stroke();
      poly(c, [[21, 20], [32, 13], [43, 20]], P.A); poly(c, [[22, 20], [42, 20], [44, 48], [20, 48]], mix('#3a2f1c', P.rc, 0.15)); ell(c, 32, 36, 5, 8, FLAME, null); ell(c, 32, 38, 2.4, 4.5, '#fff6c0', null);
      poly(c, [[19, 48], [45, 48], [47, 54], [17, 54]], P.A); ln(c, 22, 22, 22, 46, P.B, 1.6); ln(c, 42, 22, 42, 46, P.B, 1.6);
      if (o.beam) for (const a of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(48, 36); c.lineTo(48 + Math.cos(a) * 12, 36 + Math.sin(a) * 12 - 2); c.lineTo(48 + Math.cos(a) * 12, 36 + Math.sin(a) * 12 + 2); c.closePath(); c.fillStyle = 'rgba(255,230,140,.8)'; c.fill(); } c.restore(); },
    charm(c, P, o) { c.beginPath(); c.moveTo(18, 6); c.lineTo(32, 28); c.lineTo(46, 6); c.strokeStyle = WOOD; c.lineWidth = 2.2; c.stroke();
      if (o.shield) { poly(c, [[20, 26], [44, 26], [44, 42], [32, 56], [20, 42]], P.A); poly(c, [[26, 31], [38, 31], [38, 41], [32, 48], [26, 41]], '#6f8cc0', P.C, 1.6); return; }
      circ(c, 32, 40, 14, P.A); circ(c, 32, 40, 10, null, P.C, 1.2);
      if (o.owl) { circ(c, 26, 37, 4, '#f0e090'); circ(c, 38, 37, 4, '#f0e090'); circ(c, 26, 37, 1.6, OUT, null); circ(c, 38, 37, 1.6, OUT, null); poly(c, [[30, 41], [34, 41], [32, 46]], '#d8a040', null, 1); } },
    moon(c, P) { c.beginPath(); c.moveTo(18, 6); c.lineTo(32, 20); c.lineTo(46, 6); c.strokeStyle = '#2a2a38'; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.arc(32, 38, 17, 0.5, TAU - 0.5); c.arc(38, 38, 13, TAU - 0.9, 0.9, true); c.closePath(); c.fillStyle = mix('#c8d8f0', P.rc, 0.2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); circ(c, 22, 30, 2, '#fff', null); },
    ring(c, P, o) { const r = o.big ? 17 : 13, cy = o.big ? 34 : 38;
      if (o.collar) { ell(c, 32, 36, 20, 12, null, OUT, 9); ell(c, 32, 36, 20, 12, null, P.A, 6); ell(c, 32, 36, 20, 12, null, P.B, 1.6); circ(c, 32, 50, 4, null, '#d8c070', 2.5); poly(c, [[28, 52], [36, 52], [35, 60], [29, 60]], '#e8e0cc', null, 1.4); return; }
      circ(c, 32, cy, r, null, OUT, 9); circ(c, 32, cy, r, null, P.A, 6); circ(c, 32, cy, r, null, P.B, 1.6);
      if (o.spark) { c.beginPath(); c.moveTo(26, 14); c.lineTo(34, 21); c.lineTo(28, 24); c.lineTo(38, 32); c.strokeStyle = FLAME; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
      else if (!o.big) poly(c, [[32, 12], [38, 19], [32, 24], [26, 19]], o.gem || '#9fb0c8');
      else poly(c, [[24, 50], [40, 50], [40, 58], [24, 58]], '#8a8f98'); },
    cup(c, P, o) { if (o.stem) { c.beginPath(); c.moveTo(14, 16); c.quadraticCurveTo(14, 38, 32, 40); c.quadraticCurveTo(50, 38, 50, 16); c.closePath(); c.fillStyle = P.A; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); poly(c, [[30, 40], [34, 40], [34, 52], [30, 52]], P.C); ell(c, 32, 54, 11, 4, P.A); circ(c, 32, 26, 6, '#f4e090'); for (const x of [18, 32, 46]) circ(c, x, 14, 3, P.B, null); return; }
      poly(c, [[16, 18], [46, 18], [42, 50], [20, 50]], P.A); ell(c, 31, 18, 15, 4, P.C); ln(c, 22, 26, 25, 44, P.B, 1.6); c.beginPath(); c.arc(48, 32, 8, -1.2, 1.2); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = P.A; c.lineWidth = 2.4; c.stroke();
      for (const x of [20, 28, 36]) { c.beginPath(); c.moveTo(x, 4); c.quadraticCurveTo(x + 3, 9, x, 12); c.strokeStyle = '#7fc0e8'; c.lineWidth = 2; c.stroke(); } },
    pouch(c, P, o) { poly(c, [[24, 17], [40, 17], [44, 26], [51, 44], [45, 55], [19, 55], [13, 44], [20, 26]], P.A); poly(c, [[22, 14], [42, 14], [42, 20], [22, 20]], P.C); ln(c, 18, 36, 46, 36, P.B, 1.4);
      if (o.flap) { poly(c, [[20, 24], [44, 24], [44, 38], [32, 44], [20, 38]], P.B, OUT, 1.6); circ(c, 32, 40, 2.2, '#c8a55a', null); circ(c, 50, 22, 3, '#c98a3a'); }
      if (o.spill) for (const [x, y] of [[16, 12], [26, 8], [36, 10]]) { ell(c, x, y, 4, 2.6, o.spill, OUT, 1.2, 0.5); if (o.ember) ell(c, x + 1, y, 1.8, 1.2, EMB, null); } },
    glass(c, P) { c.save(); c.translate(32, 32); c.rotate(-Math.PI / 4); poly(c, [[-24, -4], [-10, -4], [-10, 4], [-24, 4]], P.C); poly(c, [[-10, -5.5], [6, -5.5], [6, 5.5], [-10, 5.5]], P.A); poly(c, [[6, -7], [20, -7], [20, 7], [6, 7]], P.B); circ(c, 22, 0, 8, '#bfe4f4', OUT, 2.2); ln(c, 18, -4, 22, -4, '#fff', 2); c.restore(); },
    horn(c, P, o) { c.beginPath(); c.moveTo(12, 50); c.quadraticCurveTo(8, 18, 38, 12); c.quadraticCurveTo(52, 10, 52, 22); c.quadraticCurveTo(46, 20, 40, 26); c.quadraticCurveTo(26, 34, 24, 52); c.closePath(); c.fillStyle = o.tooth ? '#e4dcc4' : mix('#d8d0b8', P.rc, 0.25); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke();
      if (o.band) poly(c, [[10, 42], [26, 44], [26, 50], [10, 50]], '#a8844a', OUT, 1.6);
      if (o.tooth) for (let i = 0; i < 5; i++) { ln(c, 14 + i * 1.5, 24 + i * 5.5, 20 + i * 1.5, 25 + i * 5.5, '#7a6a50', 1.4); ln(c, 22 - i * 0.5, 30 + i * 4, 27 - i * 0.5, 30 + i * 4, '#7a6a50', 1.4); }
      if (o.strap) { c.beginPath(); c.moveTo(14, 48); c.quadraticCurveTo(30, 62, 50, 50); c.strokeStyle = '#4a7a3a'; c.lineWidth = 3; c.stroke(); } },
    shield(c, P) { circ(c, 32, 32, 23, P.A); circ(c, 32, 32, 23, null, P.B, 1.6); circ(c, 32, 32, 17, null, P.C, 1.2); for (const x of [-9, 0, 9]) ln(c, 32 + x - 3, 18, 32 + x + 3, 46, P.C, 1.6); circ(c, 32, 32, 7, '#8a8f98'); circ(c, 32, 32, 3, FLAME, null); },
    hourglass(c, P) { for (const ox of [-8, 8]) { c.save(); c.translate(32 + ox, 32); c.scale(0.7, 0.9); poly(c, [[-9, -20], [9, -20], [2, 0], [9, 20], [-9, 20], [-2, 0]], '#cfe4ee'); poly(c, [[-8, 12], [8, 12], [4, 19], [-4, 19]], ox < 0 ? '#e0a040' : '#e8d8a8', null, 0); poly(c, [[-9, -20], [9, -20], [8, -14], [-8, -14]], ox < 0 ? '#e0a040' : '#e8d8a8', null, 0); c.restore(); }
      poly(c, [[10, 9], [54, 9], [54, 14], [10, 14]], P.A); poly(c, [[10, 50], [54, 50], [54, 55], [10, 55]], P.A); },
    censer(c, P) { for (const x of [20, 32, 44]) ln(c, x, 8, x, 28, P.C, 1.4); circ(c, 32, 8, 3, P.B); ell(c, 32, 38, 15, 12, P.A); for (const [x, y] of [[26, 36], [32, 40], [38, 36], [28, 44], [36, 44]]) circ(c, x, y, 1.8, OUT, null); ln(c, 18, 38, 46, 38, P.B, 1.4);
      c.beginPath(); c.moveTo(32, 26); c.bezierCurveTo(24, 20, 40, 16, 32, 8); c.strokeStyle = 'rgba(230,230,240,.85)'; c.lineWidth = 2; c.stroke(); poly(c, [[24, 50], [40, 50], [36, 56], [28, 56]], P.A); },
    mitt(c, P) { poly(c, [[20, 28], [44, 28], [46, 50], [38, 58], [26, 58], [18, 48]], P.A); for (const [x, w, h] of [[20, 5, 20], [26.5, 5, 23], [33, 5, 21], [39.5, 5, 17]]) poly(c, [[x, 28], [x + w, 28], [x + w, 28 - h], [x, 28 - h]], P.A); poly(c, [[16, 40], [22, 34], [24, 44], [18, 48]], P.A);
      c.beginPath(); c.moveTo(24, 40); c.lineTo(30, 46); c.lineTo(36, 38); c.lineTo(42, 46); c.strokeStyle = EMB; c.lineWidth = 2; c.stroke(); for (const x of [22, 28, 35, 41]) ell(c, x + 2, 14, 2.6, 2.6, '#2a2220', null); },
    arrows(c, P, o) { for (const [a, g] of [[-0.32, 0], [0, 1], [0.32, 0]]) { c.save(); c.translate(32, 56); c.rotate(a); ln(c, 0, 0, 0, -46, WOOD, 2); poly(c, [[-3, -46], [3, -46], [0, -54]], o.silver ? '#e0e8f0' : '#8a8f98', null, 1.2); for (let i = 0; i < 3; i++) poly(c, [[0, -2 - i * 4], [-4.5, 3 - i * 4], [0, -1 - i * 4]], g ? '#5a9a3a' : '#cfcab8', null, 0.8); c.restore(); } ln(c, 24, 54, 40, 54, '#5a9a3a', 2.2); },
    banner(c, P) { ln(c, 18, 6, 18, 58, WOOD, 3); poly(c, [[19, 10], [52, 12], [46, 24], [52, 36], [19, 34]], mix('#d9aa50', P.rc, 0.2)); circ(c, 33, 23, 6, null, '#b8402c', 2.4); circ(c, 33, 23, 2, '#b8402c', null); },
    heart(c, P) { c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(6, 36, 8, 12, 24, 12); c.bezierCurveTo(30, 12, 32, 18, 32, 20); c.bezierCurveTo(32, 18, 34, 12, 40, 12); c.bezierCurveTo(56, 12, 58, 36, 32, 54); c.closePath(); c.fillStyle = '#1e1a18'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke();
      c.strokeStyle = EMB; c.lineWidth = 2.2; c.beginPath(); c.moveTo(22, 20); c.lineTo(28, 30); c.lineTo(22, 38); c.moveTo(36, 22); c.lineTo(42, 30); c.lineTo(36, 44); c.moveTo(30, 30); c.lineTo(34, 38); c.stroke(); for (const x of [20, 32, 44]) ln(c, x, 12, x - 3 + (x === 32 ? 3 : 0), 52, P.A, 2.2); },
    star(c, P) { circ(c, 32, 32, 22, null, P.A, 5); circ(c, 32, 32, 22, null, OUT, 1); c.save(); c.translate(32, 32); for (const [o, col] of [[3, mix(P.C, '#000', 0.2)], [0, '#2e2a30']]) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 5 : 19; c.lineTo(Math.cos(a) * r + o, Math.sin(a) * r + o); } c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); } poly(c, [[0, -19], [3, -5], [-3, -5]], '#f0d070', null, 0); c.restore(); },
    helm(c) { c.beginPath(); c.moveTo(14, 52); c.lineTo(14, 32); c.quadraticCurveTo(32, 2, 50, 32); c.lineTo(50, 52); c.closePath(); c.fillStyle = '#6a6e78'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); poly(c, [[22, 38], [42, 38], [42, 44], [22, 44]], '#1a1612', null, 0);
      c.strokeStyle = '#1a1612'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 14); c.lineTo(30, 24); c.lineTo(33, 32); c.stroke(); ln(c, 32, 16, 32, 4, '#7a5a30', 2); for (const [x, y, r] of [[26, 8, -0.8], [38, 6, 0.8], [32, 2, 0]]) { c.save(); c.translate(x, y); c.rotate(r); ell(c, 0, 0, 2.6, 5, '#5ab040', OUT, 1); c.restore(); } },
    crown(c, P, o) { if (o.echo) { c.save(); c.globalAlpha = 0.35; c.translate(5, -4); PT.crown(c, P, {}); c.restore(); c.save(); c.globalAlpha = 0.6; c.translate(2.5, -2); PT.crown(c, P, {}); c.restore(); }
      poly(c, [[12, 46], [14, 22], [24, 32], [32, 16], [40, 32], [50, 22], [52, 46]], P.A); poly(c, [[12, 44], [52, 44], [52, 52], [12, 52]], P.B); for (const x of [14, 32, 50]) circ(c, x, x === 32 ? 16 : 22, 2.2, '#f0d070'); },
    jar(c, P) { poly(c, [[22, 22], [42, 22], [48, 40], [42, 56], [22, 56], [16, 40]], mix('#8a8078', P.rc, 0.2)); ell(c, 32, 22, 11, 3.5, '#4a4440'); ln(c, 22, 30, 20, 44, '#fff', 1.6);
      c.save(); c.translate(36, 18); c.rotate(0.35); poly(c, [[-12, -4], [12, -4], [10, 2], [-10, 2]], P.A); c.restore(); ell(c, 24, 18, 6, 3, '#a8a8a8', null); c.save(); c.translate(30, 12); c.rotate(-0.3); ell(c, 0, 0, 3, 9, '#e0603a', OUT, 1.4); c.restore(); },
  };
  const KIND = {
    jerkin: ['vest', { lace: 1 }], ironvest: ['vest', { bands: 1 }], wardenplate: ['vest', { plate: 1 }], thornmantle: ['mantle'], whetstone: ['whet'], oldgrudge: ['stone', { slash: 1 }], brinkstone: ['stone', { crack: 1 }],
    roadboots: ['boots'], anklet: ['strap', { feather: 1 }], porterstrap: ['strap'], cord: ['coil'], wardthread: ['coil', { thread: 1 }], draught: ['flask'], thickdraught: ['flask', { fat: 1 }],
    keenedge: ['blade', { len: 16 }], emberblade: ['blade', { len: 23, ember: 1 }], hawkfeather: ['feather'], lampcharm: ['lamp', { small: 1 }], watchlamp: ['lamp', { beam: 1 }], restlantern: ['lamp'],
    owlcharm: ['charm', { owl: 1 }], wardensigil: ['charm', { shield: 1 }], moonsilver: ['moon'], flintring: ['ring', { gem: '#8a8f98' }], sparkring: ['ring', { spark: 1 }], oath: ['ring', { big: 1 }], houndcollar: ['ring', { collar: 1 }],
    pilgrimcup: ['cup'], chalice: ['cup', { stem: 1 }], satchel: ['pouch', { flap: 1 }], petalpouch: ['pouch', { spill: '#f2a6c0' }], coalpouch: ['pouch', { spill: '#2a2522', ember: 1 }],
    longlens: ['glass'], ramhorn: ['horn', { band: 1 }], packhorn: ['horn', { band: 1, strap: 1 }], tallytooth: ['horn', { tooth: 1 }], aegis: ['shield'], hourglass: ['hourglass'], censer: ['censer'], cindermitt: ['mitt'],
    chram: ['horn', { band: 1 }], chpike: ['lamp', { beam: 1 }], chroot: ['charm', { owl: 1 }], chfang: ['horn', { tooth: 1 }], chain5: ['glass'], chain6: ['heart'], chain7: ['horn', { band: 1, strap: 1 }], chain8: ['cup', { stem: 1 }], chain9: ['crown'], choath: ['ring', { big: 1 }],
    thirdarrow: ['arrows'], silverheads: ['arrows', { silver: 1 }], standard: ['banner'], emberheart: ['heart'], lodestar: ['star'], unbowed: ['helm'], crownechoes: ['crown', { echo: 1 }], circlet: ['crown'], phoenixash: ['jar'],
  };
  // an item the table does not know (a feature module's found-only drop) is drawn by what its stats do
  const guess = d => { const s = (d && d.stats) || {}; return s.dmg ? ['blade', {}] : s.as ? ['feather', {}] : s.cdr ? ['hourglass', {}] : s.armor ? ['shield', {}] : s.hp ? ['vest', { bands: 1 }] : s.heal ? ['pouch', {}] : s.ms ? ['boots', {}] : s.gold ? ['pouch', { flap: 1 }] : ['charm', {}]; };

  function disc(c, col, rim) { const g = c.createRadialGradient(28, 24, 4, 32, 32, 34); g.addColorStop(0, mix(col, '#1a1510', 0.62)); g.addColorStop(1, mix(col, '#0a0807', 0.86)); c.fillStyle = g; c.fillRect(0, 0, 64, 64); circ(c, 32, 33, 28, null, mix(col, '#000', 0.55), 1.6); if (rim) circ(c, 32, 33, 29.5, null, rim, 1); }
  function paintItem(c, id, d) {
    const rar = d ? d.rar : 0, rc = RC[rar] || RC[0], P = { rc, A: mix(rc, '#3a2a1c', 0.52), B: mix(rc, '#ffffff', 0.45), C: mix(rc, '#000000', 0.62) };
    disc(c, rc, mix(rc, '#000', 0.2)); const k = KIND[id] || guess(d); c.save(); c.translate(32, 32); c.scale(0.94, 0.94); c.translate(-32, -32); (PT[k[0]] || PT.charm)(c, P, k[1] || {}); c.restore();
    if (d && d.hero && HERO_COL[d.hero]) circ(c, 52, 52, 5.5, HERO_COL[d.hero], OUT, 1.8);
  }
  // ---- quest, boon, HUD and squad painters
  const QGLYPH = {
    stakes(c) { for (const x of [18, 32, 46]) poly(c, [[x - 3, 50], [x - 3, 22], [x, 16], [x + 3, 22], [x + 3, 50]], '#a87f4e'); c.beginPath(); c.moveTo(15, 28); c.quadraticCurveTo(25, 34, 32, 28); c.quadraticCurveTo(39, 34, 49, 28); c.strokeStyle = '#e6d6a8'; c.lineWidth = 2; c.stroke(); },
    mill(c) { poly(c, [[26, 52], [28, 30], [36, 30], [38, 52]], '#c9a76a'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, x = 32 + Math.cos(a) * 18, y = 26 + Math.sin(a) * 18; ln(c, 32, 26, x, y, OUT, 3); ln(c, 32, 26, x, y, '#efe4c8', 1.6); } c.beginPath(); c.arc(32, 26, 3, 0, Math.PI * 2); c.fillStyle = '#5a4630'; c.fill(); },
    larder(c) { poly(c, [[20, 50], [16, 34], [24, 22], [40, 22], [48, 34], [44, 50]], '#cfae7a'); ln(c, 24, 24, 40, 24, OUT, 2.4); ln(c, 26, 36, 38, 36, '#9a7a4a', 1.6); },
    choice(c) { poly(c, [[12, 50], [14, 34], [26, 30], [28, 50]], '#b9b2a6'); poly(c, [[36, 50], [38, 26], [44, 18], [50, 26], [52, 50]], '#c9c2b4'); ln(c, 32, 20, 32, 52, '#e6c98a', 1.6); },
    watchfires(c) { ln(c, 18, 50, 46, 42, '#6a4a2c', 4); ln(c, 18, 42, 46, 50, '#6a4a2c', 4); c.beginPath(); c.moveTo(32, 14); c.bezierCurveTo(44, 26, 42, 40, 32, 44); c.bezierCurveTo(22, 40, 20, 26, 32, 14); c.fillStyle = '#ff9a3c'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(32, 26); c.bezierCurveTo(37, 32, 36, 38, 32, 41); c.bezierCurveTo(28, 38, 27, 32, 32, 26); c.fillStyle = '#ffe08a'; c.fill(); },
    spring(c) { c.beginPath(); c.moveTo(32, 12); c.bezierCurveTo(46, 30, 48, 40, 40, 48); c.bezierCurveTo(34, 54, 26, 54, 22, 48); c.bezierCurveTo(16, 40, 20, 30, 32, 12); c.closePath(); c.fillStyle = '#bfe8f2'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke(); ln(c, 26, 40, 28, 46, '#fff', 2); },
    gate(c) { poly(c, [[16, 22], [40, 18], [48, 26], [46, 48], [20, 50], [14, 40]], '#cfc4b0'); poly(c, [[16, 22], [40, 18], [48, 26], [24, 30]], '#ece4d0', null, 0); ln(c, 30, 22, 34, 34, OUT, 2); ln(c, 34, 34, 30, 46, OUT, 2); },
    fire(c) { c.beginPath(); c.moveTo(32, 10); c.bezierCurveTo(44, 24, 50, 32, 42, 46); c.bezierCurveTo(38, 54, 26, 54, 22, 46); c.bezierCurveTo(16, 36, 24, 30, 24, 24); c.bezierCurveTo(28, 28, 28, 22, 32, 10); c.closePath(); c.fillStyle = '#ffb040'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke(); ell(c, 32, 44, 5, 7, '#fff0a0', null); },
    beacon(c) { poly(c, [[16, 34], [48, 34], [44, 50], [20, 50]], '#8a8f98'); ell(c, 32, 34, 16, 4, '#4a4a56'); c.beginPath(); c.moveTo(32, 10); c.bezierCurveTo(42, 20, 42, 30, 32, 34); c.bezierCurveTo(22, 30, 22, 20, 32, 10); c.closePath(); c.fillStyle = FLAME; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); },
    road(c) { c.beginPath(); c.moveTo(22, 56); c.bezierCurveTo(22, 40, 44, 40, 38, 28); c.bezierCurveTo(34, 20, 30, 18, 32, 10); c.strokeStyle = '#e4d6a8'; c.lineWidth = 9; c.lineCap = 'round'; c.stroke(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.setLineDash([3, 4]); c.stroke(); c.setLineDash([]); ln(c, 48, 16, 48, 40, WOOD, 3); circ(c, 48, 14, 4, FLAME); },
    graves(c) { ell(c, 32, 46, 20, 8, '#6a5a48'); poly(c, [[28, 22], [36, 22], [36, 46], [28, 46]], '#c8a870'); ln(c, 24, 30, 40, 30, '#c8a870', 4); ln(c, 18, 44, 18, 36, '#4a5a90', 2); circ(c, 18, 34, 2.6, '#8aa0e0', null); circ(c, 46, 42, 2.6, '#8aa0e0', null); },
    stonegate(c) { c.beginPath(); c.moveTo(14, 54); c.lineTo(14, 28); c.quadraticCurveTo(32, 2, 50, 28); c.lineTo(50, 54); c.lineTo(40, 54); c.lineTo(40, 32); c.quadraticCurveTo(32, 20, 24, 32); c.lineTo(24, 54); c.closePath(); c.fillStyle = '#d4d0c4'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); ln(c, 18, 38, 22, 38, OUT, 1.6); ln(c, 42, 44, 46, 44, OUT, 1.6); },
    roof(c) { poly(c, [[10, 30], [32, 12], [54, 30], [48, 30], [48, 52], [16, 52], [16, 30]], '#d8b078'); poly(c, [[8, 32], [32, 10], [56, 32], [50, 34], [32, 20], [14, 34]], '#8a4a2a'); poly(c, [[28, 38], [38, 38], [38, 52], [28, 52]], '#5a3a20', null, 1.6); },
    cover(c) { poly(c, [[12, 34], [52, 34], [48, 44], [16, 44]], '#cfc4b0'); poly(c, [[16, 44], [48, 44], [48, 52], [16, 52]], '#8a8070'); ln(c, 22, 8, 26, 32, '#c8aa70', 2); ln(c, 42, 8, 38, 32, '#c8aa70', 2); ln(c, 14, 53, 50, 53, EMB, 2.4); },
  };
  function bloom(c) { ln(c, 32, 58, 32, 26, '#c8aa70', 4); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ell(c, 32 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 6, 4, '#f4e090', OUT, 1.6, a); } circ(c, 32, 18, 4, '#e0b040'); ln(c, 32, 42, 40, 38, '#5a9a3a', 3); }
  const HUD = {
    gold(c) { circ(c, 32, 32, 22, '#e0b84a'); circ(c, 32, 32, 22, null, OUT, 2.4); circ(c, 32, 32, 16, null, '#a8802a', 2); c.beginPath(); c.moveTo(32, 20); c.bezierCurveTo(40, 28, 40, 36, 32, 44); c.bezierCurveTo(24, 36, 24, 28, 32, 20); c.fillStyle = '#c4601c'; c.fill(); ln(c, 18, 22, 24, 17, '#fff', 2); },
    camp(c) { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, x = 32 + Math.cos(a) * 20, y = 42 + Math.sin(a) * 9; ell(c, x, y, 6, 4, i % 2 ? '#8a8578' : '#a39e90', OUT, 1.6, a); } ln(c, 24, 46, 40, 36, WOOD, 3.4); ln(c, 24, 36, 40, 46, '#6a4a2c', 3.4); c.beginPath(); c.moveTo(32, 10); c.bezierCurveTo(44, 22, 42, 34, 32, 38); c.bezierCurveTo(22, 34, 20, 22, 32, 10); c.closePath(); c.fillStyle = '#ffb040'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); ell(c, 32, 32, 4, 6, '#fff0a0', null); },
    tent(c) { poly(c, [[8, 52], [32, 10], [56, 52]], '#d8c89c'); poly(c, [[24, 52], [32, 26], [40, 52]], '#3a2a1c', null, 1.6); ln(c, 32, 10, 32, 4, WOOD, 2); poly(c, [[48, 44], [60, 44], [60, 56], [48, 56]], '#9a7040', null, 1.6); },
    forge(c) { poly(c, [[10, 28], [54, 28], [48, 36], [40, 36], [40, 46], [46, 54], [18, 54], [24, 46], [24, 36], [16, 36]], '#7a8088'); poly(c, [[10, 28], [54, 28], [56, 24], [14, 24]], '#a8b0b8', null, 1.6); ln(c, 22, 20, 46, 8, WOOD, 4); poly(c, [[40, 4], [52, 10], [50, 16], [38, 10]], '#6a6e78', null, 1.6); circ(c, 30, 24, 3, EMB, null); },
    builder(c) { ln(c, 16, 10, 16, 58, WOOD, 4); ln(c, 48, 10, 48, 58, WOOD, 4); poly(c, [[8, 10], [56, 10], [56, 42], [8, 42]], '#b08a58'); poly(c, [[16, 16], [42, 16], [42, 36], [16, 36]], CLOTH, null, 1.4); c.strokeStyle = '#7a1e12'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(22, 32); c.lineTo(22, 22); c.lineTo(28, 22); c.lineTo(28, 32); c.stroke(); for (const [x, y] of [[11, 14], [53, 14], [11, 38], [53, 38]]) circ(c, x, y, 2, '#6a6e78', null); },
    flask(c) { poly(c, [[27, 8], [37, 8], [37, 16], [27, 16]], WOOD); c.beginPath(); c.moveTo(27, 16); c.lineTo(37, 16); c.lineTo(48, 52); c.quadraticCurveTo(32, 60, 16, 52); c.closePath(); c.fillStyle = '#8a6a44'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); for (const [x, y] of [[26, 34], [38, 34], [28, 44], [36, 44]]) { c.beginPath(); c.moveTo(x, y - 4); c.quadraticCurveTo(x + 3, y, x, y + 2); c.quadraticCurveTo(x - 3, y, x, y - 4); c.fillStyle = '#7fc0e8'; c.fill(); } },
    recall(c) { c.beginPath(); c.arc(32, 32, 18, -0.6, 4.4); c.strokeStyle = '#9fc4e6'; c.lineWidth = 5; c.lineCap = 'round'; c.stroke(); poly(c, [[44, 6], [54, 20], [38, 22]], '#9fc4e6', OUT, 1.8); c.beginPath(); c.moveTo(32, 24); c.bezierCurveTo(38, 30, 38, 36, 32, 40); c.bezierCurveTo(26, 36, 26, 30, 32, 24); c.fillStyle = '#ffb040'; c.fill(); },
    arm(c) { PT.vest(c, { A: '#5a6a88', B: '#9aaac8', C: '#2a3248', rc: '#6f8cc0' }, { plate: 1 }); circ(c, 44, 44, 11, '#8a6a44'); circ(c, 44, 44, 11, null, OUT, 2); circ(c, 44, 44, 3.5, '#9aaac8', OUT, 1.4); },
    wpn(c) { PT.blade(c, { A: '#888', B: '#ccd', C: '#444', rc: '#aab' }, { len: 20 }); poly(c, [[10, 52], [34, 52], [34, 58], [10, 58]], '#7a7468', null, 1.6); },
    heal: bloom,
  };

  function make(key, fn) { if (cache.has(key)) return cache.get(key); const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d'); c.scale(1.5, 1.5); try { fn(c); } catch (e) { /* a broken painter leaves a plain tile */ } const u = cv.toDataURL('image/png'); cache.set(key, u); return u; }
  const painted = key => (manifest.has(key) ? 'founding/icons/' + key + '.png' : null);
  const small = (c, fn) => { c.save(); c.translate(32, 32); c.scale(0.9, 0.9); c.translate(-32, -32); fn(c); c.restore(); };
  const api = {
    RC, HERO_COL, QCOL, mix,
    has: key => manifest.has(key),
    item(id, d) { const k = 'item-' + id; return painted(k) || make(k + '/' + (d ? d.rar : 0), c => paintItem(c, id, d)); },
    quest(id) { const k = 'quest-' + id; return painted(k) || make(k, c => { disc(c, QCOL[id] || '#6a5a48', null); (QGLYPH[id] || QGLYPH.gate)(c); }); },
    boon(id, quest, n) { const k = 'boon-' + id; return painted(k) || make(k, c => { disc(c, QCOL[quest] || '#6a5a48', null); c.save(); c.translate(32, 30); c.scale(0.86, 0.86); c.translate(-32, -32); (QGLYPH[quest] || QGLYPH.gate)(c); c.restore(); for (let i = 0; i <= (n | 0); i++) circ(c, 32 + (i - (n | 0) / 2) * 7, 58, 2.2, '#f2e6c8', OUT, 1); }); },
    hud(name) { const k = 'hud-' + name; return painted(k) || make(k, c => { disc(c, name === 'gold' ? '#6a5018' : '#5a4a34', null); small(c, HUD[name] || HUD.gold); }); },
    build(id) { const k = 'build-' + id; return painted(k) || make(k, c => { disc(c, '#7a6a48', null); small(c, HUD[id] || HUD.arm); }); },
    skill(hero, slot) { return painted('skill-' + hero + '-' + slot); },
    // a ready-made icon frame (rarity colour as the border), for HTML strings
    frame(src, rc, cls, extra) { return `<span class="fd-ic ${cls || ''}" style="--rc:${rc || '#6b5634'}${extra ? ';' + extra : ''}"><img alt="" draggable="false" src="${src}"></span>`; },
    // the manifest, once: calls back when it has loaded so panels can redraw with any painted icons
    onManifest(fn) { subs.push(fn); },
    load() { if (api._loading) return; api._loading = true; try { fetch('founding/icons/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : [])).then(list => { const s = new Set((Array.isArray(list) ? list : []).filter(x => typeof x === 'string')); if (s.size) { manifest = s; subs.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); } }).catch(() => { /* no manifest: placeholders only */ }); } catch (e) { /* no fetch */ } },
  };
  return api;
})();

const FoundingUI = (() => {
  'use strict';
  let A = null, root = null, D = null, M = null, FLAG = null;
  const el = {}, cache = {};
  const panels = { tent: false, forge: false };
  let tentTab = 'up', forgePick = [], bannerQ = [], bannerT = 0, lobbyKey = '', tentSig = '', forgeSig = '', boonKey = '', boonHidden = false, reveal = null, lobbyBuilt = false;
  const esc = s => (typeof Tip !== 'undefined' ? Tip.esc(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const S = () => A.state();
  const $ = id => root.querySelector('#' + id);
  function setT(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
  // the help line under the HUD, in the player's own keys (keybinds.js)
  const slotKeyLabel = k => { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null, id = { q: 's0', w: 's1', e: 's2', r: 's3' }[k]; return esc(KB && id ? KB.label(KB.keyFor(id)) || k.toUpperCase() : k.toUpperCase()); };
  function helpLine() {
    const KB = typeof Keybinds !== 'undefined' ? Keybinds : null, L = id => esc(KB ? KB.label(KB.keyFor(id)) || '—' : id);
    const skills = ['s0', 's1', 's2', 's3'].map(L).join(' ');
    return `<b>Right-click</b> move or attack &middot; <b>${skills}</b> skills (aim, then click) &middot; <b>Shift</b> + skill rank up &middot; <b>${L('fdPassive')}</b> passive rank up<br><b>${L('cycle')}</b> target &middot; <b>${L('fdItem1')}-${L('fdItem6')}</b> items &middot; <b>${L('fdTent')}</b> tent &middot; <b>${L('fdForge')}</b> forge &middot; <b>${L('fdRecall')}</b> recall &middot; <b>Alt</b> + click ping &middot; <b>${L('fdFlask')}</b> flask &middot; <b>${L('fdUse')}</b> pick up, plant, relight, light a brand at a camp fire &middot; <b>${L('fdDrop')}</b> put down &middot; <b>${L('fdCenter')}</b> centre &middot; <b>Esc</b> cancel`;
  }
  function setH(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).innerHTML = v; } }
  function setW(id, f) { const v = clamp(f, 0, 1).toFixed(3); if (cache[id] !== v) { cache[id] = v; $(id).style.transform = `scaleX(${v})`; } }
  function setShow(id, on) { const e = $(id), v = on ? 1 : 0; if (cache['s' + id] !== v) { cache['s' + id] = v; e.style.display = on ? '' : 'none'; } }
  const tip = (node, fn) => { if (typeof Tip !== 'undefined') Tip.set(node, fn); };
  const fmtT = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const FI = FoundingIcons;
  const iconSrc = (hero, key) => `icons/${hero}/${A.SKILL_ICON[hero][key]}.png`;
  // a skill's icon: the Founding's own painting when the manifest lists it, else the town's icon for that kit slot, else its first letter
  const iconImg = (hero, key, name) => `<img alt="" src="${FI.skill(hero, key) || iconSrc(hero, key)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="gl">${esc((name || '?')[0])}</span>`;
  const keyOf = (id, fb) => { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null; return esc(KB && KB.label && KB.keyFor ? KB.label(KB.keyFor(id)) || fb : fb); };
  const coinImg = () => `<img class="fcoin" alt="" src="${FI.hud('gold')}">`;
  const rcOf = d => D.RARITY_COLORS[d.rar];
  // an item's icon in its rarity frame
  const itemIcon = (d, cls) => FI.frame(FI.item(d.id, d), rcOf(d), cls);
  const heroTag = d => (d.hero && D.KITS[d.hero] ? `<i class="hero" style="--hc:${FI.HERO_COL[d.hero] || '#c9a45c'}">${esc(D.KITS[d.hero].name)}</i>` : '');
  const TYPE_TAG = sk => sk.type === 'self' ? 'Self' : sk.type === 'unit' ? (sk.tgt === 'ally' ? 'Ally target' : 'Enemy target') : sk.type === 'shot' ? (sk.shape === 'line' ? 'Skillshot, line' : 'Skillshot') : sk.shape === 'wall' ? 'Ground line' : sk.shape === 'blink' ? 'Ground, short blink' : 'Ground target';
  const upPrice = (hero, slot, id) => { const sk = D.KITS[hero].skills[slot]; const owned = sk.ups.filter(u => A.state().sheet && A.state().sheet.up.indexOf(u.id) >= 0).length; return D.upgradePrice(slot, owned); };

  // ================================================================ mount
  function mount(api) {
    A = api; D = api.D; M = api.M; FLAG = api.FLAG;
    unmount();
    root = document.createElement('div'); root.id = 'fd-root';
    root.innerHTML = `
      <div id="fd-top" class="fd-pn"><div class="fd-wave"><span id="fd-wave">PREPARE</span><small id="fd-part"></small></div><i class="fd-div"></i><div class="fd-camp"><img class="ico" id="fd-campico" alt=""><div class="cw"><small>CAMP</small><div class="fd-bar"><i id="fd-campbar"></i><span id="fd-camptxt"></span></div></div></div><i class="fd-div"></i><div class="fd-next" id="fd-next"></div><i class="fd-div"></i><div class="fd-gold" id="fd-gold"><b></b><img class="fcoin" id="fd-coin" alt=""></div></div>
      <div id="fd-boss" class="fd-pn" style="display:none"><b id="fd-bossname"></b><small id="fd-bosssub"></small><div class="fd-bar big"><i id="fd-bossbar"></i><span id="fd-bosstxt"></span></div><div class="fd-bar cast" id="fd-bosscast" style="display:none"><i id="fd-bosscasti"></i><span id="fd-bosscastt"></span></div></div>
      <div id="fd-tframe" class="fd-pn" style="display:none"><b id="fd-tfname"></b><div class="fd-bar"><i id="fd-tfbar"></i><span id="fd-tftxt"></span></div></div>
      <div id="fd-party" class="fd-pn" style="display:none"></div>
      <div id="fd-right"><canvas id="fd-mini" width="216" height="162"></canvas><div id="fd-quests" class="fd-pn" style="display:none"></div></div>
      <div id="fd-hero" class="fd-pn"><canvas id="fd-portrait" width="144" height="144"></canvas>
        <div class="info"><div class="nm"><span id="fd-hname"></span><i class="rl" id="fd-hrole"></i></div><div class="sub"><span id="fd-hlvl"></span><span class="pts" id="fd-hpts"></span></div>
          <div class="fd-bar"><i id="fd-hbar"></i><span id="fd-htxt"></span></div><div class="fd-bar xp"><i id="fd-xbar"></i></div><div class="row" id="fd-hextra"></div></div></div>
      <div id="fd-skills" class="fd-pn"><div id="fd-slots"></div><div class="fd-sep"></div><div id="fd-items"></div></div>
      <div id="fd-chips"><div class="chip rc" id="fd-rcchip"><img alt="" id="fd-rcico"><span id="fd-rctxt"></span></div><span id="fd-chipsdyn"></span></div>
      <div id="fd-help" class="fd-pn">${helpLine()}</div>
      <div id="fd-msg"></div>
      <div id="fd-banner"><div class="t"></div><div class="s"></div></div>
      <div id="fd-boons" class="fd-pn" style="display:none"></div>
      <div id="fd-tent" class="fd-panel fd-pn" style="display:none"></div>
      <div id="fd-forge" class="fd-panel fd-pn" style="display:none"></div>
      <div id="fd-reveal" style="display:none"></div>
      <div id="fd-lobby" style="display:none"></div>
      <div id="fd-titlecard"><div class="t"></div><div class="s"></div></div>
      <div id="fd-end" style="display:none"></div>`;
    document.body.appendChild(root);
    for (const id of ['fd-top', 'fd-boss', 'fd-tframe', 'fd-party', 'fd-hero', 'fd-skills', 'fd-help', 'fd-boons', 'fd-tent', 'fd-forge', 'fd-lobby', 'fd-end', 'fd-quests', 'fd-reveal']) root.querySelector('#' + id).addEventListener('contextmenu', e => e.preventDefault());
    // minimap: left-drag moves the camera, right-click sends the hero
    const mini = $('fd-mini'), at = e => { const r = mini.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    mini.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); const [x, y] = at(e); if (e.altKey && e.button === 0) { A.miniTo(x, y, false, true); return; } A.miniTo(x, y, e.button === 2); mini._drag = e.button === 0; });
    mini.addEventListener('mousemove', e => { if (mini._drag && e.buttons & 1) { const [x, y] = at(e); A.miniTo(x, y, false); } });
    window.addEventListener('mouseup', miniUp); mini.addEventListener('contextmenu', e => e.preventDefault());
    cacheReset();
    setStaticIcons();
    buildSlots(null);
    buildItems();
    FI.onManifest(refreshIcons); FI.load();
    tip($('fd-hpts'), () => { const sh = S().sheet, any = sh && ['q', 'w', 'e', 'r', 'p'].some(A.canLearn); return '<b>Skill points</b>One a level. Spend one on a skill that glows: click its +, or hold Shift and press its key; the passive takes ' + esc(A.keyLabel('p')) + '. Q, W and E take five ranks, the ultimate three, the passive two, and each rank opens at its own level.' + (sh && sh.pts > 0 && !any ? '<div class="fd-t-n">Nothing opens yet: ' + nextOpening(sh) + '</div>' : ''); });
    const rc = $('fd-rcchip'); rc.addEventListener('mousedown', e => e.stopPropagation()); rc.addEventListener('click', () => A.tryRecall());
    tip(rc, () => { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null, k = esc(KB ? KB.label(KB.keyFor('fdRecall')) || '?' : 'B'); return `<b>Recall</b><em>${k}</em>Hold still for four seconds and you are back at the spring. A blow, a step or a cast breaks it. It needs a rest before the next.`; });
    tip($('fd-mini'), () => { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null, k = esc(KB ? KB.label(KB.keyFor('fdCenter')) || '?' : 'Space'); return `<b>The valley</b>Drag to look elsewhere (${k} brings you back). Right-click sends your hero. <b>Alt</b> + click points a spot out to your party. Ground you have not walked is dark; only what your party sees shows enemies.`; });
    tip($('fd-top').querySelector('.fd-camp'), () => '<b>The camp</b>If its health runs out, the run is lost. It mends slowly while no enemy stands near the Hearth.');
    tip($('fd-gold'), () => '<b>Gold</b>Spend it at the supply tent. It stays in the run; your purse is paid when the run ends.');
  }
  function setStaticIcons() {
    const set = (id, src) => { const e = root && root.querySelector('#' + id); if (e) e.src = src; };
    set('fd-campico', FI.hud('camp')); set('fd-coin', FI.hud('gold')); set('fd-rcico', FI.hud('recall'));
  }
  // a painted icon turned up in the manifest: draw everything that shows icons again
  function refreshIcons() { if (!root) return; setStaticIcons(); const s = S(); cacheReset(); if (s && s.sheet) { buildSlots(s.sheet); buildItems(); } tentSig = forgeSig = ''; }
  function miniUp() { const m = root && root.querySelector('#fd-mini'); if (m) m._drag = false; }
  function cacheReset() { for (const k in cache) delete cache[k]; lobbyKey = tentSig = forgeSig = boonKey = ''; slotKey = ''; itemKey = ''; }
  function unmount() {
    window.removeEventListener('mouseup', miniUp);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; panels.tent = panels.forge = false; forgePick = []; tentSel = ''; fgSel = ''; bannerQ = []; bannerT = 0; reveal = null; lobbyBuilt = false; boonHidden = false; cacheReset();
    if (typeof Tip !== 'undefined' && Tip.hide) Tip.hide();
  }

  // ================================================================ the camp: pick a hero
  function showLobby() { root.classList.add('camp'); setShow('fd-lobby', true); lobbyKey = ''; buildLobby(); }
  function onLobby() { if (root) buildLobby(); }
  function onStart() { if (!root) return; root.classList.remove('camp'); setShow('fd-lobby', false); cacheReset(); buildSlots(S().sheet); buildItems(); }
  function buildLobby() {
    const s = S(); if (!s || !root || s.phase !== 'camp') return;
    const me = s.players.find(p => p[0] === s.myId) || [s.myId, '', null, 0];
    const key = JSON.stringify(s.players) + (s.isHost ? 'h' : 'g'); if (key === lobbyKey) return; lobbyKey = key;
    const L = $('fd-lobby');
    const taken = {}; for (const p of s.players) if (p[2]) taken[p[2]] = p;
    let cards = '';
    for (const id of D.HERO_IDS) {
      const K = D.KITS[id], tk = taken[id], mine = tk && tk[0] === s.myId, other = tk && !mine;
      cards += `<div class="fd-hc ${mine ? 'mine' : ''} ${other ? 'taken' : ''}" data-h="${id}"><canvas width="140" height="140" data-p="${id}"></canvas><div class="n">${esc(K.name)}</div><div class="r">${esc(K.title)}</div>
        <div class="role ${K.role}">${K.role === 'tank' ? 'Tank' : K.role === 'heal' ? 'Healer' : 'Damage'}</div>
        <div class="ps"><b>${esc(K.passive.name)}</b></div><div class="sk">${['q', 'w', 'e', 'r'].map(k => `<span data-k="${k}" data-h="${id}">${esc(K.skills[k].name)}</span>`).join('')}</div>
        <div class="who">${mine ? 'You' : other ? esc(tk[1]) : 'Free'}</div></div>`;
    }
    const names = s.players.map(p => `<div class="pl"><span>${esc(p[1])}${p[0] === s.myId ? ' (you)' : ''}</span><em>${p[2] ? esc(D.KITS[p[2]].name) : 'choosing'}</em><i class="${p[3] ? 'rdy' : ''}">${p[3] ? 'Ready' : ''}</i></div>`).join('');
    const can = !!me[2];
    L.innerHTML = `<div class="fd-lobby-box fd-pn"><div class="fd-title">THE FOUNDING</div><div class="fd-sub">Day one. The ember has just fallen. Hold the camp through the days and the nights, and see what the founders raise.</div>
      <div class="fd-hcs">${cards}</div><div class="fd-lfoot"><div class="pls">${names}</div>
      <div class="act">${s.isHost ? `<button class="fd-btn gold" id="fd-go" ${can ? '' : 'disabled'}>Begin</button>` : `<button class="fd-btn gold" id="fd-go" ${can && !me[3] ? '' : 'disabled'}>${me[3] ? 'Waiting for the host' : 'Ready'}</button>`}
      <button class="fd-btn" id="fd-lback">Back to town</button></div></div><div class="fd-hint">${can ? '' : 'Choose a hero.'}</div></div>`;
    L.querySelectorAll('.fd-hc').forEach(c => c.addEventListener('click', () => { if (c.classList.contains('taken')) return; A.send({ k: 'pick', hero: c.dataset.h }); }));
    L.querySelectorAll('.sk span').forEach(sp => tip(sp, () => { const sk = D.KITS[sp.dataset.h].skills[sp.dataset.k]; return `<b>${esc(sk.name)}</b><em>${TYPE_TAG(sk)} &middot; ${sp.dataset.k.toUpperCase()}</em>${esc(sk.text)}`; }));
    L.querySelectorAll('.ps').forEach((p, i) => tip(p, () => { const k = D.KITS[D.HERO_IDS[i]]; return `<b>${esc(k.passive.name)}</b><em>Passive</em>${esc(k.passive.text)}`; }));
    $('fd-go').addEventListener('click', () => A.send({ k: 'ready' }));
    $('fd-lback').addEventListener('click', () => A.leave());
    lobbyBuilt = true;
  }
  function animLobby() {
    const s = S(); if (!s || s.phase !== 'camp' || !lobbyBuilt) return;
    root.querySelectorAll('#fd-lobby canvas[data-p]').forEach(cv => {
      const id = cv.dataset.p, c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 140, 140);
      const st = cv._st || (cv._st = { t: 0, moving: false, action: null }); st.t = s.T;
      c.fillStyle = '#14110d'; c.fillRect(0, 0, 140, 140); drawHero(c, A.clsOf(id), 70, 80, 0.5, st, 2.1, { ring: false, noShadow: true });
    });
  }

  // ================================================================ skill bar
  let slotKey = '', itemKey = '';
  const LOCK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.6 7V5.2a3.4 3.4 0 0 1 6.8 0V7" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="7" width="10" height="7.6" rx="1.5" fill="currentColor"/></svg>';
  function buildSlots(sheet) {
    const host = $('fd-slots'); host.innerHTML = ''; const hero = sheet ? sheet.hero : null; slotKey = hero || ''; if (!hero) return;
    const K = D.KITS[hero];
    for (const k of ['p', 'q', 'w', 'e', 'r']) {
      const d = document.createElement('div'); d.className = 'fd-slot' + (k === 'p' ? ' pass' : ''); d.dataset.s = k;
      d.innerHTML = `${iconImg(hero, k, K.skills[k].name)}<i class="key">${k === 'p' ? '' : slotKeyLabel(k)}</i><div class="cdv"></div><div class="cdt"></div><div class="lk">${k === 'r' ? LOCK_SVG + '<em>' + D.LEVELS.rLevel + '</em>' : ''}</div>${k === 'p' ? '<div class="pd"><u></u><u></u><u></u></div>' : ''}<div class="pips">${'<u></u>'.repeat(K.skills[k].maxRank)}</div><b class="plus">+</b>${k === 'p' ? '' : '<div class="chg"></div>'}`;
      tip(d, () => skillTip(k));
      d.addEventListener('mousedown', e => e.stopPropagation());
      const pl = d.querySelector('.plus'); if (pl) pl.addEventListener('click', e => { e.stopPropagation(); A.learn(k); });
      d.addEventListener('click', e => { if (e.target.classList.contains('plus')) return; if (e.shiftKey) A.learn(k); else if (k !== 'p') A.pressSkill(k); });
      host.appendChild(d);
    }
  }
  // the level a skill's next rank opens at, and the soonest thing a spare point could be spent on (for the points chip)
  const gateOf = (k, r) => D.LEVELS.gate(k, r + 1);
  function nextOpening(sh) {
    const K = D.KITS[sh.hero]; let best = 99, who = '';
    for (const k of ['q', 'w', 'e', 'r', 'p']) { const r = sh.rk['qwerp'.indexOf(k)] | 0, mx = K.skills[k].maxRank; if (r < mx && gateOf(k, r) < best) { best = gateOf(k, r); who = K.skills[k].name; } }
    return best < 99 ? who + ' opens its next rank at level ' + best + '.' : 'everything is at its highest rank.';
  }
  const hintLine = (k, can) => (can ? '<div class="fd-t-n">Learn it: ' + (k === 'p' ? esc(A.keyLabel('p')) : 'Shift + ' + esc(slotKeyLabel(k))) + ', or click its +.</div>' : '');
  function skillTip(k) {
    const s = S(), sh = s.sheet; if (!sh) return ''; const K = D.KITS[sh.hero], sk = K.skills[k], hero = sh.hero;
    if (k === 'p') {
      const r = sh.rk[4] | 0, mx = sk.maxRank; let st = ''; const ps = sh.ps || [];
      if (hero === 'cleric') st = `Petals: ${ps[0]}/3`; else if (hero === 'pyromancer') st = ps[1] ? 'Hot Streak ready: the next Fireball is instant' : `Crit streak: ${ps[0]}/2`; else if (hero === 'ranger') st = `Haste stacks ${ps[0]}/5, ${sk.every[Math.min(2, r)] - ps[1]} shot(s) to the next piercing arrow`; else st = ps[0] ? 'Bracing' : '';
      let h = `<b>${esc(sk.name)}</b><em>Passive &middot; Rank ${r}/${mx}</em>${esc(sk.text)}`;
      for (let j = 1; j <= r; j++) h += `<div class="fd-t-r">Rank ${j}: ${esc(sk.ranks[j - 1])}</div>`;
      if (r < mx) { const g = gateOf('p', r); h += `<div class="fd-t-n">${sh.lv >= g ? 'Next' : 'Opens at level ' + g + ''}, rank ${r + 1}: ${esc(sk.ranks[r])}</div>`; }
      return h + (st ? '<div class="fd-t-c">' + esc(st) + '</div>' : '') + hintLine('p', A.canLearn('p'));
    }
    const i = 'qwer'.indexOf(k), r = sh.rk[i], mx = sk.maxRank, lock = k === 'r' && sh.lv < D.LEVELS.rLevel;
    let h = `<b>${esc(sk.name)}</b><em>${TYPE_TAG(sk)} &middot; ${k.toUpperCase()} &middot; Rank ${r}/${mx}</em>${esc(sk.text)}`;
    if (lock) h += `<div class="fd-t-n">Opens at level ${D.LEVELS.rLevel}.</div>`;
    if (r === 0 && !lock) h += `<div class="fd-t-n">Not learned. Rank 1: ${esc(sk.rank(1))}</div>`;
    else if (r > 0) h += `<div class="fd-t-r">Now, rank ${r}: ${esc(sk.rank(r))}</div>`;
    if (r < mx && (r > 0 || lock)) { const g = gateOf(k, r); h += `<div class="fd-t-n">${sh.lv >= g ? 'Next' : 'Opens at level ' + g + ''}, rank ${r + 1}: ${esc(sk.rank(r + 1))}</div>`; }
    const own = sk.ups.filter(u => sh.up.indexOf(u.id) >= 0);
    if (own.length) h += `<div class="fd-t-r">Upgrades: ${own.map(u => esc(u.name)).join(', ')}</div>`;
    const cd = D.rk(sk.cd, Math.max(1, r)), rg = Array.isArray(sk.range) ? D.rk(sk.range, Math.max(1, r)) : sk.range;
    h += `<div class="fd-t-c">Cooldown ${cd} s${rg ? ' &middot; ' + (sk.type === 'shot' ? 'Reach ' : 'Range ') + rg : ''}</div>`;
    return h + hintLine(k, A.canLearn(k));
  }
  function buildItems() {
    const host = $('fd-items'); host.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('div'); d.className = 'fd-item empty'; d.dataset.i = i; d.innerHTML = `<img alt="" draggable="false" style="display:none"><i class="key">${keyOf('fdItem' + (i + 1), String(i + 1))}</i>`;
      d.addEventListener('mousedown', e => e.stopPropagation()); d.addEventListener('click', () => A.send({ k: 'use', slot: i })); d.addEventListener('contextmenu', e => { e.preventDefault(); sellSlot(i); });
      tip(d, () => itemTip(i)); host.appendChild(d);
    }
    const f = document.createElement('div'); f.className = 'fd-item flask'; f.style.display = 'none'; f.innerHTML = `<img alt="" draggable="false" src="${FI.hud('flask')}"><i class="key">${keyOf('fdFlask', 'V')}</i>`;
    f.addEventListener('mousedown', e => e.stopPropagation()); f.addEventListener('click', () => A.send({ k: 'use', slot: 'f' }));
    tip(f, () => '<b>Carried Water</b><em>Flask, V</em>Drink it anywhere to heal. It refills at the fountain.'); host.appendChild(f);
  }
  // an item's kind line (rarity, Use, the hero it is for) and its passive, in the same few words everywhere it shows
  const kindLine = d => `${D.RARITIES[d.rar]}${d.use ? ' &middot; Use' : ''}${d.hero && D.KITS[d.hero] ? ' &middot; ' + esc(D.KITS[d.hero].name) : ''}`;
  const pasLine = d => (d.pas ? `<small style="display:block;margin-top:3px;color:#e6cf9a;font-size:inherit">${esc(d.pas)}</small>` : '');
  function itemCard(it, extra) { const d = D.ITEM[it]; return `<b style="color:${D.RARITY_COLORS[d.rar]}">${esc(d.name)}</b><em>${kindLine(d)}</em>${esc(d.text)}${pasLine(d)}${extra || ''}`; }
  const sellVal = d => (typeof D.sellPrice === 'function' ? D.sellPrice(d) : Math.floor((d.price || 0) / 2));
  const sellable = d => (typeof D.canSell === 'function' ? D.canSell(d.rar) : d.rar <= 1);
  function itemTip(i) {
    const sh = S().sheet; if (!sh) return ''; const x = sh.it[i]; if (!x) return 'An empty item slot.';
    const d = D.ITEM[x[1]];
    return itemCard(x[1], sellable(d) ? `<div class="fd-t-n">Sells for ${sellVal(d)} gold at the supply tent: right-click it there.</div>` : d.rar >= 2 ? '<div class="fd-t-n">Two of the same rarity forge into something better.</div>' : '');
  }
  function sellSlot(i) {
    const sh = S().sheet, x = sh && sh.it[i]; if (!x) return; const d = D.ITEM[x[1]];
    if (!sellable(d)) { A.say('Only Common and Uncommon things are sold. Better ones go to the forge'); return; }
    if (!panels.tent) { A.say('Sell it at the supply tent'); return; }
    A.send({ k: 'sell', slot: i });
  }

  // ================================================================ per frame
  let hudT = 0, portKey = '';
  function update(dt) {
    const s = S(); if (!s || !root) return;
    if (s.phase === 'camp') { animLobby(); updateMsg(s, dt); return; }
    const sh = s.sheet, T = s.T;
    // top bar
    const live = s.st === 'live';
    setT('fd-wave', s.wave > 0 ? `WAVE ${s.wave} / ${D.LAST_WAVE}` : 'PREPARE'); setT('fd-part', s.wave > 0 ? (D.PARTS[s.part] || D.PARTS[D.partOf(s.wave)])[2] : 'Day one');
    setW('fd-campbar', s.camp[0] / s.camp[1]); setT('fd-camptxt', Math.ceil(s.camp[0]) + ' / ' + s.camp[1]);
    setH('fd-next', !live ? `<b class="t">${s.st === 'won' ? 'Emberfall' : s.st === 'lost' ? 'The camp is lost' : ''}</b>` : s.next >= 0 ? '<small>NEXT WAVE</small><b>' + fmtT(s.nextAt - T) + '</b>' : `<b class="t">${s.q.some(q => q[1] === 1) ? 'Finish the quests' : 'Last wave'}</b>`);
    $('fd-gold').firstChild.textContent = sh ? sh.gold : 0; cache.goldv = 1;
    if (!sh) { updateMsg(s, dt); return; }
    // the hero frame
    if (slotKey !== sh.hero) { buildSlots(sh); cache.portrait = ''; }
    const K = D.KITS[sh.hero], dead = sh.st > 0;
    setT('fd-hname', K.name); setT('fd-hrole', K.role === 'tank' ? 'Tank' : K.role === 'heal' ? 'Healer' : 'Damage'); if (cache.hrole !== K.role) { cache.hrole = K.role; $('fd-hrole').className = 'rl ' + K.role; }
    const anyLearn = ['q', 'w', 'e', 'r', 'p'].some(A.canLearn);
    setT('fd-hlvl', 'Level ' + sh.lv + ' / ' + D.LEVELS.max); setT('fd-hpts', sh.pts > 0 ? sh.pts + (sh.pts > 1 ? ' points' : ' point') : ''); if (cache.ptsDim !== !anyLearn) { cache.ptsDim = !anyLearn; $('fd-hpts').classList.toggle('dim', !anyLearn); }
    const hpNow = s.units.get('h' + s.myId); const hp = hpNow ? hpNow.hp : sh.hp[0], mx = hpNow ? hpNow.max : sh.hp[1];
    setW('fd-hbar', hp / mx); setT('fd-htxt', Math.ceil(hp) + ' / ' + mx + (sh.sh > 0 ? '  (+' + sh.sh + ')' : ''));
    setW('fd-xbar', sh.need ? sh.xp / sh.need : 1);
    setT('fd-hextra', dead ? 'Back on your feet in ' + Math.max(0, Math.ceil(sh.st - (T - s.sheetT))) + ' s' : K.title);
    if (portKey !== sh.hero) { portKey = sh.hero; const c = $('fd-portrait').getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 144, 144); c.fillStyle = '#14110d'; c.fillRect(0, 0, 144, 144); drawHero(c, A.clsOf(sh.hero), 72, 80, 0.55, { t: 0, moving: false, action: null }, 2.3, { ring: false, noShadow: true }); }
    // skills
    for (const d of $('fd-slots').children) {
      const k = d.dataset.s;
      if (k === 'p') {
        const pr = sh.rk[4] | 0, canP = A.canLearn('p'), sgn = 'P' + pr + (canP ? 1 : 0);
        if (cache.psg !== sgn) { cache.psg = sgn; d.classList.toggle('learn', canP); d.querySelector('.plus').style.display = canP ? 'block' : 'none'; d.querySelectorAll('.pips u').forEach((u, j) => u.classList.toggle('f', j < pr)); if (cache.pr !== undefined && pr > cache.pr) { d.classList.remove('rankup'); void d.offsetWidth; d.classList.add('rankup'); } cache.pr = pr; }
        const ps = sh.ps || [], pd = d.querySelectorAll('.pd u'); let n = 0, on = false, a = 0;
        if (sh.hero === 'cleric') { n = ps[0]; if (ps[0] < 3) a = (1 - ps[1] / 100) * 360; } else if (sh.hero === 'pyromancer') { n = ps[1] ? 2 : ps[0]; on = !!ps[1]; } else if (sh.hero === 'ranger') { n = ps[1]; on = ps[1] === 3; } else on = !!ps[0];
        pd.forEach((u, i) => { const f = i < n && !(sh.hero === 'pyromancer' && i > 1); if (cache[k + 'pd' + i] !== f) { cache[k + 'pd' + i] = f; u.classList.toggle('f', f); u.style.display = (sh.hero === 'bastion' || (sh.hero === 'pyromancer' && i > 1)) ? 'none' : ''; } });
        if (cache[k + 'on'] !== on) { cache[k + 'on'] = on; d.classList.toggle('on', on); }
        const av = a.toFixed(0); if (cache[k + 'a'] !== av) { cache[k + 'a'] = av; d.querySelector('.cdv').style.setProperty('--a', av + 'deg'); }
        continue;
      }
      const i = 'qwer'.indexOf(k), r = sh.rk[i], sk = K.skills[k], locked = k === 'r' && sh.lv < D.LEVELS.rLevel, cdv = A.cdLeft(i), ch = A.charges(i), canLearn = !locked && A.canLearn(k);
      const st = (locked ? 'L' : '') + (r === 0 && !locked ? 'U' : '') + (s.aim && s.aim.slot === k ? 'A' : '') + (canLearn ? 'P' : '') + r;
      const rdy = !locked && r > 0 && cdv <= 0 && ch >= 1; if (cache[k + 'rd'] !== rdy) { if (cache[k + 'rd'] === false && rdy) { d.classList.remove('ready'); void d.offsetWidth; d.classList.add('ready'); } cache[k + 'rd'] = rdy; }
      if (cache[k + 'st'] !== st) {
        cache[k + 'st'] = st; d.classList.toggle('unl', r === 0 && !locked); d.classList.toggle('lock', locked); d.classList.toggle('aim', !!(s.aim && s.aim.slot === k));
        d.classList.toggle('learn', canLearn); d.querySelector('.plus').style.display = canLearn ? 'block' : 'none';
        d.querySelectorAll('.pips u').forEach((u, j) => u.classList.toggle('f', j < r));
        if (cache[k + 'r'] !== undefined && r > cache[k + 'r']) { d.classList.remove('rankup'); void d.offsetWidth; d.classList.add('rankup'); }
        cache[k + 'r'] = r;
      }
      const cm = sh.cm[i] || 1, showCd = ch < 1 || (sh.cx[i] > 1 && cdv > 0), av = (showCd && cdv > 0 ? clamp(cdv / cm, 0, 1) * 360 : 0).toFixed(0);
      if (cache[k + 'a'] !== av) { cache[k + 'a'] = av; d.querySelector('.cdv').style.setProperty('--a', av + 'deg'); d.classList.toggle('cd', +av > 0); }
      const ct = showCd && cdv > 0 ? (cdv >= 10 ? String(Math.ceil(cdv)) : cdv.toFixed(1)) : ''; if (cache[k + 'ct'] !== ct) { cache[k + 'ct'] = ct; d.querySelector('.cdt').textContent = ct; }
      const cg = sh.cx[i] > 1 ? String(ch) : ''; if (cache[k + 'cg'] !== cg) { cache[k + 'cg'] = cg; d.querySelector('.chg').textContent = cg; }
    }
    // items
    const its = $('fd-items').children;
    for (let i = 0; i < 6; i++) {
      const d = its[i], x = sh.it[i], key = x ? x[0] + ':' + x[1] : '';
      if (cache['it' + i] !== key) {
        cache['it' + i] = key; d.classList.toggle('empty', !x);
        const im = d.querySelector('img');
        if (x) { const it = D.ITEM[x[1]]; d.style.setProperty('--rc', rcOf(it)); im.src = FI.item(it.id, it); im.style.display = 'block'; }
        else { d.style.removeProperty('--rc'); im.style.display = 'none'; im.removeAttribute('src'); }
      }
    }
    const fl = its[6]; const fv = (sh.bn.indexOf('carriedwater') >= 0) ? (sh.fl ? 2 : 1) : 0; if (cache.fl !== fv) { cache.fl = fv; fl.style.display = fv ? '' : 'none'; fl.classList.toggle('empty', fv === 1); }
    // help line fades after a while
    setShow('fd-help', T < 40 || s.helpOn);
    // party
    const others = []; for (const u of s.units.values()) if (u.kind === 'h' && u.id !== s.myId) others.push(u);
    const pk = others.map(u => u.id + ':' + u.hero).join(',');
    if (cache.pk !== pk) {
      cache.pk = pk; const P = $('fd-party'); P.style.display = others.length ? '' : 'none';
      P.innerHTML = '<div class="fd-h">PARTY</div>' + others.map(u => `<div class="al" data-id="${u.id}"><div><span>${esc(u.name)} <em>${esc(D.KITS[u.hero].name)}</em></span><span class="v"></span></div><div class="fd-bar"><i></i></div></div>`).join('');
      P.querySelectorAll('.al').forEach(a => a.addEventListener('click', () => { s.tgtAlly = isNaN(+a.dataset.id) ? a.dataset.id : +a.dataset.id; }));
    }
    $('fd-party').querySelectorAll('.al').forEach(a => {
      const u = s.units.get('h' + a.dataset.id); if (!u) return; const dead = u.f & FLAG.DEAD;
      a.classList.toggle('dead', !!dead); a.classList.toggle('sel', String(s.tgtAlly) === a.dataset.id);
      const v = dead ? 'Fallen' : Math.ceil(u.hp) + '/' + u.max; const sp = a.querySelector('.v'); if (sp.textContent !== v) sp.textContent = v;
      a.querySelector('i').style.transform = `scaleX(${clamp(u.hp / u.max, 0, 1)})`;
    });
    // target and boss
    const tg = s.tgt != null ? s.units.get('e' + s.tgt) : null;
    if (tg && tg.fogT !== 0 && !(tg.f & FLAG.UNDER)) { setShow('fd-tframe', true); setT('fd-tfname', tg.def.name + ((tg.f & FLAG.MARK) ? '  (marked)' : '') + ((tg.f & FLAG.STUN) ? '  (stunned)' : '')); setW('fd-tfbar', tg.pct / 100); setT('fd-tftxt', Math.ceil(tg.pct) + '%'); $('fd-tframe').classList.toggle('lower', !!s.boss); } else setShow('fd-tframe', false);
    const b = s.boss; setShow('fd-boss', !!b);
    if (b) {
      setT('fd-bossname', b.def.name); setW('fd-bossbar', b.pct / 100); setT('fd-bosstxt', (b.f & FLAG.UNDER) ? 'Burrowed' : Math.ceil(b.pct) + '%');
      setT('fd-bosssub', bossSub(b, s.bsBy[b.id]));
      const bc = s.bcast, on = !!bc && T - bc.t0 < bc.dur + 0.2; setShow('fd-bosscast', on);
      if (on) { setW('fd-bosscasti', (T - bc.t0) / bc.dur); setT('fd-bosscastt', bc.txt); }
    }
    updateChips(s, sh); updateRecall();
    updateQuests(s); updateBoons(s, sh); updateMsg(s, dt); updateBanner(dt);
    // panels follow the hero: walk away and they close
    const me = A.me();
    if (panels.tent && me && Math.hypot(me.x - M.P.shop[0], me.y - M.P.shop[1]) > 340) closePanel('tent');
    if (panels.forge && me && Math.hypot(me.x - M.P.forge[0], me.y - M.P.forge[1]) > 300) closePanel('forge');
    hudT += dt; if (hudT > 0.12) { hudT = 0; if (panels.tent) refreshTent(false); if (panels.forge) refreshForge(false); A.drawMini($('fd-mini')); }
  }
  function updateMsg(s, dt) { const m = $('fd-msg'); const on = s.msg.t > 0; if (cache.msgtxt !== s.msg.txt) { cache.msgtxt = s.msg.txt; m.textContent = s.msg.txt; } const o = on ? '1' : '0'; if (cache.msgo !== o) { cache.msgo = o; m.style.opacity = o; } }
  function updateBanner(dt) {
    const b = $('fd-banner');
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) { b.classList.remove('on'); } }
    if (bannerT <= 0 && bannerQ.length) { const x = bannerQ.shift(); b.querySelector('.t').textContent = x.t; b.querySelector('.s').textContent = x.s || ''; b.dataset.k = x.k || ''; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); bannerT = x.d || 3.2; }
  }
  function banner(t, s, k, d) { if (!root) return; bannerQ.push({ t, s, k, d }); if (bannerQ.length > 4) bannerQ.shift(); }
  // the six parts of the run, in the voice of the camp (keyed by name, so a shorter table still reads right)
  const PART_LINE = { 'day one': 'The ember has fallen. Hold the camp.', 'night one': 'The light is thin. Keep it.', 'day two': 'Morning, and the valley is still here.',
    'night two': 'The dark is back, and it has learned the way.', 'day three': 'The camp is starting to look like a place.', 'the last night': 'The last night. Keep every light you have.' };
  function waveBanner(n, boss, bossIdx, part) {
    const s = S(), pi = part !== undefined && D.PARTS[part] ? part : D.partOf(n), P = D.PARTS[pi];
    const tail = boss ? ' The ground trembles.' : n === D.LAST_WAVE ? ' The siege.' : '';
    if (P && s && s.partShown !== pi) { s.partShown = pi; banner(P[2].toUpperCase(), (PART_LINE[P[2].toLowerCase()] || '') + '  Wave ' + n + '.' + tail, 'part', 4.4); }
    else banner('WAVE ' + n, boss ? 'The ground trembles.' : n === D.LAST_WAVE ? 'The siege.' : '', 'wave', 2.6);
  }
  // the lanes grow stronger every few waves: one small line, once
  function stepBanner(tier, subs) { banner('THE ASH GROWS BOLDER', (subs || []).join('  \u00b7  '), 'step', 3.6); }
  function partBanner(p) { if (GNAW_PARTS[p]) banner(GNAW_PARTS[p].toUpperCase(), '', 'wave', 3); }
  function titleCard(t, sub) { if (!root) return; const e = $('fd-titlecard'); e.querySelector('.t').textContent = t; e.querySelector('.s').textContent = sub || ''; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
  function questEvent(id, st) {
    const Q = D.QUESTS[id]; if (!Q || !root) return;
    if (st === 0) banner('QUEST: ' + Q.name.toUpperCase(), Q.text, 'quest', 5);
    else if (st === 2) banner('QUEST DONE: ' + Q.name.toUpperCase(), Q.done, 'done', 4.5);
    else if (st === 3) banner('QUEST MISSED: ' + Q.name.toUpperCase(), Q.missed, 'missed', 4.5);
  }
  function bossAppears() { A.say('Something large is coming.'); }

  const GNAW_PARTS = ['', 'The Scent', 'The Breach', 'The Cold'];
  function bossSub(b, row) {
    if (!row) return '';
    switch (b.eid) {
      case 'oldgnaw': return GNAW_PARTS[row[5]] || '';
      case 'wickeater': return row[6] ? 'Pinned between two lights' : row[5] ? row[5] + (row[5] === 1 ? ' light out' : ' lights out') : 'Every light is lit';
      case 'mirebull': return row[3] + (row[3] === 1 ? ' dam log standing' : ' dam logs standing') + ' \u00b7 the water is ' + (['calm', 'rising', 'high', 'at its height'][row[2]] || 'calm');
    }
    return '';
  }
  function updateRecall() {
    const KB = typeof Keybinds !== 'undefined' ? Keybinds : null, ing = A.isRecalling(), cd = Math.ceil(A.rcLeft());
    setT('fd-rctxt', ing ? 'Recalling' : cd > 0 ? 'Recall ' + cd + ' s' : 'Recall ' + (KB ? KB.label(KB.keyFor('fdRecall')) || '' : 'B'));
    const k = (ing ? 'i' : '') + (cd > 0 ? 'c' : ''); if (cache.rck !== k) { cache.rck = k; const e = $('fd-rcchip'); e.classList.toggle('on', ing); e.classList.toggle('cd', cd > 0 && !ing); }
  }
  // brand and what is carried, above the hero frame
  const CARRY_NAME = { 1: 'A warm stone', 2: 'An oil jar', 3: 'A fallen founder', 4: 'Dressed stone', 5: 'Timber' };
  function updateChips(s, sh) {
    const left = sh.br >= 999 ? 999 : Math.max(0, Math.ceil(sh.br - (s.T - s.sheetT))), cr = sh.cr | 0, key = left + ':' + cr;
    if (cache.chips === key) return; cache.chips = key;
    const C = $('fd-chipsdyn'), KB = typeof Keybinds !== 'undefined' ? Keybinds : null, L = id => esc(KB ? KB.label(KB.keyFor(id)) || '?' : id);
    let h = '';
    if (left > 0) h += `<div class="chip brand" data-c="brand"><i></i>${left >= 999 ? 'Brand' : 'Brand ' + left + ' s'}</div>`;
    if (cr) h += `<div class="chip carry" data-c="carry"><i class="c${cr}"></i>${esc(CARRY_NAME[cr] || 'Carrying')}</div>`;
    C.innerHTML = h;
    C.querySelectorAll('.chip').forEach(n => tip(n, () => n.dataset.c === 'brand'
      ? `<b>A brand</b>A flame lit at a camp fire. It lights the dark round you, relights a post that has gone out (${L('fdUse')} beside it), and hungry things are drawn to it.${left >= 999 ? '' : '<div class="fd-t-n">It burns down while you hold it.</div>'}`
      : `<b>${esc(CARRY_NAME[cr] || 'Carrying')}</b>Slows you. ${L('fdDrop')} sets it down so you can fight; ${L('fdUse')} beside it takes it up again.`));
  }

  // quests
  // the objective line of an active quest, in the game's voice, from what the world reports
  function objective(s, q) {
    const id = q[0], pc = q[2], P = s.props || {}, H = s.hauls[id], n = s.players.length || 1, hauled = what => (H ? H.got + ' of ' + H.need + ' ' + what : pc + '%');
    switch (id) {
      case 'spring': return `Keep the dig clear and stand near it. ${pc}%`;
      case 'gate': return `Walk beside the carts as they climb the road. ${pc}% delivered`;
      case 'fire': return `Guard the Smith while the forge catches. ${pc}%`;
      case 'beacon': return `Carry the oil up to the beacon hill. ${hauled('jars up')}`;
      case 'road': return `Plant lantern posts along the North Road. ${Array.isArray(P.posts) ? P.posts.length : 0} of ${D.QUEST_TUNE.posts[Math.max(0, Math.min(3, n - 1))]}`;
      case 'graves': return `Carry the founders to the meadow and plant bluebells. ${hauled('laid to rest')}`;
      case 'stonegate': return (P.qd || []).some(d => d[0] === 6) ? `Carve the Words on the gate's back. Do not be struck. ${Math.round((P.carved || 0) * 100)}%` : `Haul the dressed stone to the gate. ${hauled('stones up')}`;
      case 'roof': return `Haul timber from the woods to the hall site. ${hauled('beams up')}`;
      case 'cover': return `Stand with the founders at the Hearth while the capstone is laid. ${Math.round((P.capstone || 0) * 100)}%`;
    }
    return D.QUESTS[id].text;
  }
  function updateQuests(s) {
    const act = s.q.filter(q => q[1] !== 0), P = s.props || {};
    let hk = ''; for (const id in s.hauls) hk += s.hauls[id].got; const key = act.map(q => q.join()).join('|') + s.wave + '/' + hk + '/' + (Array.isArray(P.posts) ? P.posts.length : 0) + '/' + Math.round((P.carved || 0) * 100) + '/' + Math.round((P.capstone || 0) * 100) + '/' + ((P.qd || []).length);
    if (cache.qk === key) return; cache.qk = key;
    const Q = $('fd-quests'); Q.style.display = act.length ? '' : 'none';
    const live = act.filter(q => q[1] === 1), over = act.filter(q => q[1] !== 1);
    Q.innerHTML = '<div class="fd-h">QUESTS</div>' + live.map(q => {
      const d = D.QUESTS[q[0]], left = d.deadlineWave - s.wave;
      return `<div class="q act" data-q="${q[0]}"><img class="qi" alt="" draggable="false" src="${FI.quest(q[0])}"><div class="qb"><b>${esc(d.name)}</b><div class="qo">${esc(objective(s, q))}</div><div class="bar"><i style="width:${q[2]}%"></i></div></div><span class="dl${left <= 1 ? ' soon' : ''}"><small>by</small>wave ${d.deadlineWave}</span></div>`;
    }).join('') + (over.length ? '<div class="qdone">' + over.map(q => `<span class="${q[1] === 2 ? 'ok' : 'no'}" data-q="${q[0]}">${q[1] === 2 ? '&#10003;' : '&#10007;'} ${esc(D.QUESTS[q[0]].name)}</span>`).join('') + '</div>' : '');
    // pointing at a quest's row calls out its place on the map (a larger marker and an arrow at the screen edge)
    Q.querySelectorAll('.q.act').forEach(n => { n.addEventListener('mouseenter', () => A.hoverQuest && A.hoverQuest(n.dataset.q)); n.addEventListener('mouseleave', () => A.hoverQuest && A.hoverQuest(null)); });
    if (A.hoverQuest) { const hv = Q.querySelector('.q.act:hover'); A.hoverQuest(hv ? hv.dataset.q : null); }   // (the rows were just rebuilt under the pointer)
    Q.querySelectorAll('.q.act').forEach(n => tip(n, () => { const d = D.QUESTS[n.dataset.q]; return `<b>${esc(d.name)}</b><em>${esc(d.giver)}</em>${esc(d.text)}<div class="fd-t-r">Done: ${esc(d.done)}</div><div class="fd-t-n">Missed: ${esc(d.missed)}</div>`; }));
    Q.querySelectorAll('.qdone span').forEach(n => tip(n, () => { const d = D.QUESTS[n.dataset.q], st = (S().q.find(q => q[0] === n.dataset.q) || [])[1]; return `<b>${esc(d.name)}</b><em>${st === 2 ? 'Done' : 'Missed'}</em>${esc(st === 2 ? d.done : d.missed)}`; }));
  }

  // boons
  function updateBoons(s, sh) {
    const P = $('fd-boons'), offers = sh.bo || 0, bq = sh.bq | 0; const key = offers ? offers.join(',') + (boonHidden ? 'h' : '') + '/' + bq : '';
    if (cache.bnk === key) return; cache.bnk = key;
    if (!offers) { P.style.display = 'none'; boonHidden = false; return; }
    P.style.display = '';
    if (boonHidden) { P.innerHTML = '<button class="fd-btn gold pulse" id="fd-boonshow">Choose a founders\' boon' + (bq ? ' (' + (bq + 1) + ' waiting)' : '') + '</button>'; P.classList.add('mini'); $('fd-boonshow').addEventListener('click', () => { boonHidden = false; cache.bnk = ''; }); return; }
    P.classList.remove('mini');
    const q = D.BOONS[offers[0]] && D.QUESTS[D.BOONS[offers[0]].quest];
    P.innerHTML = `<div class="fd-h">A FOUNDERS' BOON${q ? ': ' + esc(q.name.toUpperCase()) : ''}${bq ? ' <em>(' + bq + ' more waiting)</em>' : ''}<button class="x" id="fd-boonhide" title="">&minus;</button></div><div class="cards">${offers.map(id => { const b = D.BOONS[id]; const n = Object.keys(D.BOONS).filter(k => D.BOONS[k].quest === b.quest).indexOf(id); return `<div class="card" data-id="${id}"><div class="bh"><img alt="" draggable="false" src="${FI.boon(id, b.quest, n)}"><b>${esc(b.name)}</b></div><span>${esc(b.text)}</span><button class="fd-btn">Take</button></div>`; }).join('')}</div>`;
    P.querySelectorAll('.card').forEach(c => c.querySelector('button').addEventListener('click', () => { A.send({ k: 'boon', id: c.dataset.id }); A.snd('fd-boon'); }));
    $('fd-boonhide').addEventListener('click', () => { boonHidden = true; cache.bnk = ''; });
    tip($('fd-boonhide'), () => 'Put this aside. It stays until you choose.');
  }

  // ================================================================ sheet changes
  function onSheet(prev, cur) {
    if (!root) return;
    tentSig = ''; forgeSig = '';
    if (prev && cur.rk.some((r, i) => r > prev.rk[i])) A.snd('fd-rankup', { minGap: 0 });
    if (!prev && cur) { slotKey = ''; }
  }

  // ================================================================ panels
  function isOpen(n) { return !!panels[n]; }
  function blocking() { const s = S(); return !s || s.phase !== 'live' || s.ended; }
  function closePanel(n) { panels[n] = false; const e = $('fd-' + n); if (e) e.style.display = 'none'; if (typeof Tip !== 'undefined' && Tip.hide) Tip.hide(); }
  function closeTop() {
    if (!root) return false;
    if (reveal) { hideReveal(); return true; }
    if (panels.forge) { closePanel('forge'); return true; }
    if (panels.tent) { closePanel('tent'); return true; }
    const s = S(); if (s && s.phase === 'camp') return false;
    return false;
  }
  function openTent() { if (!root) return; closePanel('forge'); panels.tent = true; $('fd-tent').style.display = ''; tentSig = ''; refreshTent(true); A.snd('ui-open'); }
  function openForge() {
    if (!root) return; if ((S().props.fg | 0) !== 2) { A.say('The forge is cold'); return; }
    closePanel('tent'); panels.forge = true; forgePick = []; $('fd-forge').style.display = ''; forgeSig = ''; refreshForge(true); A.snd('ui-open');
  }
  // ---- the supply tent: a counter. Icons in rarity frames on the left; what you point at is described on the right
  let tentSel = '', fgSel = '';
  const priceLine = (price, ok) => `<span class="pr${ok ? '' : ' no'}">${coinImg()}${price}</span>`;
  function itemDetail(d, foot) {
    return `<div class="dt-h">${itemIcon(d, 'big')}<div><b style="color:${rcOf(d)}">${esc(d.name)}</b><em>${D.RARITIES[d.rar]}${d.use ? ' &middot; Use' : ''}</em>${heroTag(d)}</div></div><div class="dt-s">${esc(d.text)}</div>${d.pas ? `<div class="dt-p">${esc(d.pas)}</div>` : ''}${foot || ''}`;
  }
  const NO_SEL = '<div class="dt-empty">Point at something to look at it.</div>';
  function tentDetailHTML() {
    const sh = S().sheet; if (!sh || !tentSel) return NO_SEL;
    const t = tentSel[0], k = tentSel.slice(2);
    if (t === 'w') {
      const x = D.ITEM[k]; if (!x) return NO_SEL;
      const used = sh.it.filter(Boolean).length, can = sh.gold >= x.price && used < D.ITEM_SLOTS;
      const st = can ? '<em class="go">Click to buy</em>' : used >= D.ITEM_SLOTS ? '<em class="no">Your pack is full. Sell something first.</em>' : `<em class="no">${x.price - sh.gold} more gold needed</em>`;
      return itemDetail(x, `<div class="dt-f">${priceLine(x.price, sh.gold >= x.price)}${st}</div>`);
    }
    if (t === 'p') {
      const e = sh.it[+k]; if (!e) return '<div class="dt-empty">An empty place in your pack.</div>'; const d = D.ITEM[e[1]];
      return itemDetail(d, sellable(d) ? `<div class="dt-f"><span class="pr sell">${coinImg()}${sellVal(d)}</span><em class="go">Right-click to sell</em></div>` : `<div class="dt-n"><b>Not sold here.</b> The forge takes Rare things and better: bring two of the same rarity to the forge (${keyOf('fdForge', 'F')} beside it).</div>`);
    }
    if (t === 'u') {
      const K = D.KITS[sh.hero];
      for (const sk of ['q', 'w', 'e', 'r']) {
        const sd = K.skills[sk], u = sd.ups.find(x => x.id === k); if (!u) continue;
        const r = sh.rk['qwer'.indexOf(sk)], owned = sd.ups.filter(x => sh.up.indexOf(x.id) >= 0).length, has = sh.up.indexOf(u.id) >= 0, price = D.upgradePrice(sk, owned);
        const st = has ? '' : r < 1 ? '<em class="no">Learn the skill first</em>' : sh.gold >= price ? '<em class="go">Click to buy</em>' : `<em class="no">${price - sh.gold} more gold needed</em>`;
        return `<div class="dt-h"><span class="fd-ic big sk" style="--rc:#8a6f35">${iconImg(sh.hero, sk, sd.name)}</span><div><b style="color:#e6c98a">${esc(u.name)}</b><em>Upgrade &middot; ${esc(sd.name)} (${sk.toUpperCase()})</em></div></div><div class="dt-s">${esc(u.text)}</div>${has ? '<div class="dt-f"><em class="ok">Owned</em></div>' : `<div class="dt-f">${priceLine(price, sh.gold >= price)}${st}</div><div class="dt-n">Each upgrade on a skill costs more than the last, so the order is the choice.</div>`}`;
      }
    }
    return NO_SEL;
  }
  function setTentSel(v) { tentSel = v; const T = $('fd-tent'), dt = T.querySelector('#fd-tdet'); if (dt) dt.innerHTML = tentDetailHTML(); T.querySelectorAll('.sel').forEach(e => e.classList.remove('sel')); const n = T.querySelector('[data-hv="' + v + '"]'); if (n) n.classList.add('sel'); }
  function refreshTent(force) {
    const s = S(), sh = s.sheet; if (!sh) return;
    const sig = JSON.stringify([sh.gold, sh.up, sh.rk, sh.it.map(x => x && x[0]), sh.shop, tentTab, sh.lv]); if (!force && sig === tentSig) return; tentSig = sig;
    const T = $('fd-tent'), K = D.KITS[sh.hero], used = sh.it.filter(Boolean).length;
    let body = '', first = '';
    if (tentTab === 'up') {
      for (const k of ['q', 'w', 'e', 'r']) {
        const sk = K.skills[k], i = 'qwer'.indexOf(k), r = sh.rk[i], owned = sk.ups.filter(u => sh.up.indexOf(u.id) >= 0).length;
        body += `<div class="usk"><div class="uh"><span class="fd-ic sm sk" style="--rc:#8a6f35">${iconImg(sh.hero, k, sk.name)}</span><b>${esc(sk.name)}</b><em>${k.toUpperCase()} &middot; ${owned} of 3${r < 1 ? ' &middot; learn it first' : ''}</em></div><div class="ups">`;
        for (const u of sk.ups) {
          const has = sh.up.indexOf(u.id) >= 0, price = D.upgradePrice(k, owned), lockR = r < 1, can = !has && !lockR && sh.gold >= price;
          if (!first) first = 'u:' + u.id;
          body += `<div class="up${has ? ' has' : ''}${lockR ? ' lock' : ''}${can ? ' can' : ''}" data-up="${u.id}" data-hv="u:${u.id}"><b>${esc(u.name)}</b><span class="pr${has || lockR ? ' dim' : ''}">${has ? 'Owned' : lockR ? 'Locked' : coinImg() + price}</span></div>`;
        }
        body += '</div></div>';
      }
    } else {
      const stock = D.ITEMS.filter(x => x.shop === 'basic' || (x.shop === 'forged' && sh.shop === 2)).sort((a, b) => a.rar - b.rar || a.price - b.price);
      body += `<div class="sec">WARES <small>${sh.shop === 2 ? "the Smith's forged goods are on the shelves" : 'basics only for now'}</small></div><div class="tiles">`;
      for (const x of stock) {
        const can = sh.gold >= x.price && used < D.ITEM_SLOTS; if (!first) first = 'w:' + x.id;
        body += `<div class="tile r${x.rar}${can ? '' : ' dim'}${x.hero && x.hero !== sh.hero ? ' other' : ''}" data-item="${x.id}" data-hv="w:${x.id}">${itemIcon(x)}<span class="pc${sh.gold >= x.price ? '' : ' no'}">${coinImg()}${x.price}</span></div>`;
      }
      body += `</div><div class="sec">YOUR PACK <small>${used} of ${D.ITEM_SLOTS}; right-click a Common or Uncommon to sell it</small></div><div class="tiles pack">`;
      sh.it.forEach((x, i) => {
        if (!x) { body += `<div class="tile empty" data-hv="p:${i}"><span class="fd-ic"></span><span class="pc">&nbsp;</span></div>`; return; }
        const d = D.ITEM[x[1]], ok = sellable(d);
        body += `<div class="tile r${d.rar}" data-sell="${i}" data-hv="p:${i}">${itemIcon(d)}<span class="pc ${ok ? 'sell' : 'frg'}">${ok ? coinImg() + sellVal(d) : 'Forge'}</span></div>`;
      });
      body += '</div>';
    }
    if (!tentSel || tentSel[0] !== (tentTab === 'up' ? 'u' : tentSel[0] === 'p' ? 'p' : 'w')) tentSel = first;
    T.innerHTML = `<div class="ph"><img class="hi" alt="" src="${FI.hud('tent')}"><div class="fd-title sm">SUPPLY TENT</div><div class="tabs"><button class="${tentTab === 'up' ? 'on' : ''}" data-t="up">Upgrades</button><button class="${tentTab === 'wares' ? 'on' : ''}" data-t="wares">Wares</button></div><div class="gd">${sh.gold}${coinImg()}</div><button class="x" id="fd-tentx">&times;</button></div><div class="shop"><div class="pb shelf">${body}</div><div class="dt" id="fd-tdet">${tentDetailHTML()}</div></div>`;
    const keep = T.querySelector('.pb'); if (keep && T._sc) keep.scrollTop = T._sc;
    const sel = T.querySelector('[data-hv="' + tentSel + '"]'); if (sel) sel.classList.add('sel');
    T.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { tentTab = b.dataset.t; tentSel = ''; tentSig = ''; refreshTent(true); }));
    const keepSc = () => { T._sc = T.querySelector('.pb').scrollTop; };
    T.querySelectorAll('[data-hv]').forEach(n => n.addEventListener('mouseenter', () => { if (tentSel !== n.dataset.hv) setTentSel(n.dataset.hv); }));
    T.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => { keepSc(); A.send({ k: 'buy', up: b.dataset.up }); }));
    T.querySelectorAll('[data-item]').forEach(b => b.addEventListener('click', () => { keepSc(); A.send({ k: 'buy', item: b.dataset.item }); A.snd('fd-buy'); }));
    T.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('contextmenu', e => { e.preventDefault(); keepSc(); sellSlot(+b.dataset.sell); }));
    $('fd-tentx').addEventListener('click', () => closePanel('tent'));
    T.querySelector('.pb').addEventListener('scroll', e => { T._sc = e.target.scrollTop; });
  }
  // ---- the forge: the same family. Your pack on the left, the pair and what it makes on the right
  function fgDetailHTML(FMIN) {
    const sh = S().sheet; if (!sh) return ''; const e = fgSel !== '' ? sh.it[+fgSel] : null;
    if (!e) return '<div class="dt-empty">Point at a piece to look at it.</div>';
    const d = D.ITEM[e[1]]; return itemDetail(d, d.rar < FMIN ? '<div class="dt-n"><b>Too plain for the forge.</b> It takes Rare things and better. Sell this one at the supply tent.</div>' : '');
  }
  function refreshForge(force) {
    const s = S(), sh = s.sheet; if (!sh) return;
    forgePick = forgePick.filter(u => sh.it.some(x => x && x[0] === u));
    const sig = JSON.stringify([sh.it, forgePick]); if (!force && sig === forgeSig) return; forgeSig = sig;
    const F = $('fd-forge'); const A1 = forgePick[0] && sh.it.find(x => x && x[0] === forgePick[0]), B1 = forgePick[1] && sh.it.find(x => x && x[0] === forgePick[1]);
    const FMIN = D.FORGE_MIN != null ? D.FORGE_MIN : 2, eligible = sh.it.filter(x => x && D.ITEM[x[1]].rar >= FMIN).length;
    let prev = eligible ? '<span class="dim">Choose two items of the same rarity.</span>' : '<span class="dim">Nothing in your pack is Rare or better. Sell Commons and Uncommons at the supply tent, and bring the good ones here.</span>', ok = false, res = '';
    if (A1 && B1) {
      const a = D.ITEM[A1[1]], b = D.ITEM[B1[1]];
      if (a.rar !== b.rar) prev = '<span class="bad">Both items must be the same rarity.</span>';
      else if (a.rar < FMIN) prev = '<span class="bad">The forge only takes Rare things and better.</span>';
      else if (a.rar === 4) { prev = 'Two Mythics forge into a different Mythic.'; ok = true; res = D.RARITY_COLORS[4]; }
      else { const t0 = D.forgeTargetRarity(a.rar, false), t1 = D.forgeTargetRarity(a.rar, true); prev = `The pair becomes a random <b style="color:${D.RARITY_COLORS[t0]}">${D.RARITIES[t0]}</b> item.` + (t1 !== t0 ? `<br>One forge in ten is a <b>hyper-forge</b>: a random <b style="color:${D.RARITY_COLORS[t1]}">${D.RARITIES[t1]}</b> item instead.` : ''); ok = true; res = D.RARITY_COLORS[t0]; }
    } else if (A1) prev = '<span class="dim">Choose one more.</span>';
    const rule = D.RARITIES.map((nm, r) => `<span class="frr ${r >= FMIN ? 'ok' : 'no'}" style="--rc:${D.RARITY_COLORS[r]}">${nm}</span>`).join('');
    const slots = sh.it.map((x, i) => {
      if (!x) return '<div class="tile empty"><span class="fd-ic"></span></div>';
      const d = D.ITEM[x[1]], on = forgePick.indexOf(x[0]);
      return `<div class="tile r${d.rar}${on >= 0 ? ' on' : ''}${d.rar < FMIN ? ' low' : ''}" data-u="${x[0]}" data-low="${d.rar < FMIN ? 1 : 0}" data-i="${i}">${itemIcon(d)}${on >= 0 ? `<u class="pk">${on + 1}</u>` : ''}<span class="nm">${esc(d.name)}</span></div>`;
    }).join('');
    const box = x => (x ? itemIcon(D.ITEM[x[1]], 'big') : '<span class="fd-ic big empty"></span>');
    const old = F.querySelector('.pb'), sc = old ? old.scrollTop : 0;
    F.innerHTML = `<div class="ph"><img class="hi" alt="" src="${FI.hud('forge')}"><div class="fd-title sm">THE FORGE</div><div class="rule"><small>Takes</small>${rule}</div><button class="x" id="fd-forgex">&times;</button></div>
      <div class="shop"><div class="pb shelf"><div class="sec">YOUR PACK <small>pick two of the same rarity</small></div><div class="tiles fg">${slots}</div><div class="fd-note">Rare things and better only. Commons and Uncommons are sold at the supply tent (${keyOf('fdTent', 'T')}).</div></div>
      <div class="dt fgdt"><div class="fgrow">${box(A1)}<u>+</u>${box(B1)}<u>&rarr;</u>${res ? `<span class="fd-ic big res" style="--rc:${res}"><b>?</b></span>` : '<span class="fd-ic big empty"></span>'}</div><div class="fprev">${prev}</div><div class="frow"><button class="fd-btn gold" id="fd-dofg" ${ok ? '' : 'disabled'}>Forge</button></div><div class="dt-sep"></div><div id="fd-fdet">${fgDetailHTML(FMIN)}</div></div></div>`;
    if (F.querySelector('.pb')) F.querySelector('.pb').scrollTop = sc;
    F.querySelectorAll('.tile[data-i]').forEach(n => n.addEventListener('mouseenter', () => { fgSel = n.dataset.i; const dt = F.querySelector('#fd-fdet'); if (dt) dt.innerHTML = fgDetailHTML(FMIN); }));
    F.querySelectorAll('.tile[data-u]').forEach(n => n.addEventListener('click', () => { if (n.dataset.low === '1') { A.say('The forge takes Rare things and better'); return; } const u = +n.dataset.u; const i = forgePick.indexOf(u); if (i >= 0) forgePick.splice(i, 1); else { if (forgePick.length >= 2) forgePick.shift(); forgePick.push(u); } forgeSig = ''; refreshForge(true); }));
    $('fd-forgex').addEventListener('click', () => closePanel('forge'));
    $('fd-dofg').addEventListener('click', () => { if (ok) { A.send({ k: 'forge', a: forgePick[0], b: forgePick[1] }); forgePick = []; } });
  }
  function forgeResult(itemId, hyper) {
    if (!root) return; const d = D.ITEM[itemId]; if (!d) return;
    reveal = true; const R = $('fd-reveal'); R.style.display = '';
    R.innerHTML = `<div class="rv fd-pn${hyper ? ' hyper' : ''}" style="--c:${rcOf(d)}"><div class="fd-h">${hyper ? 'HYPER-FORGE' : 'FORGED'}</div><div class="rvic">${itemIcon(d, 'huge')}</div><b style="color:${rcOf(d)}">${esc(d.name)}</b><em>${kindLine(d)}</em><span>${esc(d.text)}${pasLine(d)}</span><button class="fd-btn gold" id="fd-rvok">Take it</button></div>`;
    $('fd-rvok').addEventListener('click', hideReveal);
  }
  function hideReveal() { reveal = null; const R = $('fd-reveal'); if (R) R.style.display = 'none'; forgeSig = ''; }

  // ================================================================ the end
  function goldBreakdown(res, mine) {
    const gb = res.goldBy && res.goldBy[S().myId];
    if (!gb) return `<div class="fd-pay">${mine > 0 ? `Paid to your purse: <b>${mine} gold</b>` : 'No gold is paid for this run.'}</div>`;
    const rows = [['Waves survived', gb.waves], ['Quests done', gb.quests], ['Holding the camp to the end', gb.hold]]; if (gb.chain > 0) rows.push(['The secret chain', gb.chain]);
    return `<div class="fd-gb"><div class="gh">Paid to your purse</div>${rows.map(r => `<div class="r${r[1] > 0 ? '' : ' z'}"><span>${r[0]}</span><b>${r[1] > 0 ? r[1] : '&ndash;'}</b></div>`).join('')}<div class="r tot"><span>Total</span><b>${mine} gold</b></div></div>`;
  }
  function showEnd(res) {
    if (!root || !res) return; const s = S(); const E = $('fd-end'); E.style.display = '';
    closePanel('tent'); closePanel('forge'); hideReveal(); $('fd-titlecard').classList.remove('on');
    const won = res.won, name = id => { const p = s.players.find(x => x[0] == id); return p ? p[1] : 'Hero'; }, hero = id => { const p = s.players.find(x => x[0] == id); return p && p[2] ? D.KITS[p[2]].name : ''; };
    const qd = D.QUEST_ORDER.map(id => { const st = res.quests[id]; return `<div class="qr ${st === 2 ? 'done' : st === 3 ? 'miss' : ''}"><b>${esc(D.QUESTS[id].name)}</b><i>${st === 2 ? 'Done' : st === 3 ? 'Missed' : st === 1 ? 'Unfinished' : 'Not offered'}</i></div>`; }).join('');
    const rows = Object.keys(res.stats).map(id => { const st = res.stats[id]; return `<tr class="${id == s.myId ? 'me' : ''}"><td>${esc(name(id))}<em>${esc(hero(id))}</em></td><td>${st.kills}</td><td>${st.dmg}</td><td>${st.heal}</td><td>${st.dth}</td><td>${st.gold}</td></tr>`; }).join('');
    const mine = res.gold && res.gold[s.myId] || 0;
    E.innerHTML = `<div class="fd-end-box fd-pn ${won ? 'won' : 'lost'}"><div class="fd-title">${won ? 'EMBERFALL' : 'THE CAMP HAS FALLEN'}</div>
      <div class="fd-sub">${won ? 'The gate is shut and every one of you is counted in. The valley has a name.' : (s.camp[0] <= 0 ? 'The Hearth went dark. The valley was not ready.' : 'No one was left standing.')}</div>
      <div class="fd-facts"><div><b>${res.wave}</b><span>of ${D.LAST_WAVE} waves reached</span></div><div><b>${fmtT(res.time)}</b><span>time held</span></div><div><b>${D.QUEST_ORDER.filter(id => res.quests[id] === 2).length}</b><span>of ${D.QUEST_ORDER.length} quests done</span></div></div>
      <div class="fd-qrs">${qd}</div>
      <table class="fd-stats"><thead><tr><th>Hero</th><th>Kills</th><th>Damage</th><th>Healing</th><th>Falls</th><th>Gold found</th></tr></thead><tbody>${rows}</tbody></table>
      ${goldBreakdown(res, mine)}
      <button class="fd-btn gold" id="fd-endok">Back to town</button></div>`;
    $('fd-endok').addEventListener('click', () => A.leave());
    if (typeof Tip !== 'undefined' && Tip.hide) Tip.hide();
  }

  return { mount, unmount, update, showLobby, onLobby, onStart, onSheet, waveBanner, stepBanner, partBanner, titleCard, banner, questEvent, bossAppears, forgeResult, showEnd, openTent, openForge, closeTop, isOpen, blocking, icons: FI, itemIcon, itemDetail, coinImg, keyOf };
})();
