// The Founding: towers, soldiers and the Builder's board, client side (pass 3). A layer on Founding.addLayer (see docs/plans/founding-pass3.md).
// Everything is drawn in code. The host sends `tw` (towers) and `sd` (soldiers) in each snapshot and tw* / so* events (see sim-defence.js).
(function () {
  if (typeof Founding === 'undefined' || !Founding.addLayer) return;
  const D = FOUNDING_DATA, DEF = D.DEFENCE;
  if (!DEF) return;
  const TAU = Math.PI * 2, PI = Math.PI, OUT = '#0b0806';
  const KINDS = DEF.KINDS, TW = DEF.TOWER, TUNE = DEF.TUNE;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const KIND_COL = { post: '#c9a45c', brazier: '#e8803a', bell: '#e6c98a', ballista: '#9aa4b4' };
  const HEIGHT = { post: [54, 72, 92], brazier: [38, 54, 78], bell: [56, 68, 82], ballista: [30, 36, 44] };
  const BLURB = {
    post: 'Archers on a timber lookout. Cheap, quick, and it sees far.',
    brazier: 'Throws fire, burns the ground and lights the night.',
    bell: 'Does no harm of its own; slows what comes near.',
    ballista: 'A slow heavy bolt. Elites and bosses first.',
  };
  let K = null, S = null;
  const towers = new Map(), sol = new Map(), fxT = new Map();
  const L = { last: performance.now(), placing: null, shift: false, sel: null, open: false, tab: 't', panel: null, tp: null, sig: '', tsig: '', lastVis: null, baseVis: null, board: null, hover: null, msgT: 0, prev: 0, mini: 0 };
  const have = n => typeof Sound !== 'undefined' && Sound.has && Sound.has(n);
  const sfx = (...names) => { for (const n of names) if (have(n)) { K.snd(n); return; } };
  const myGold = () => (S && S.sheet ? S.sheet.gold | 0 : 0);
  const keyLabel = () => { try { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null; return (KB && KB.label && KB.keyFor ? KB.label(KB.keyFor('fdBuild')) : null) || 'H'; } catch (e) { return 'H'; } };
  const tip = (node, fn) => { if (typeof Tip !== 'undefined' && Tip.set) Tip.set(node, fn); };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);   // (drawing only; never the sim)

  // ============================================================ small painting helpers
  function poly(c, pts, fill, stroke, lw) {
    c.beginPath(); for (let i = 0; i < pts.length; i++) { if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]); } c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.4; c.lineJoin = 'round'; c.stroke(); }
  }
  function limb(c, x0, y0, x1, y1, w, col, hi) {
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 2.2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    if (hi) { c.strokeStyle = hi; c.lineWidth = Math.max(0.8, w * 0.28); c.beginPath(); c.moveTo(x0 - w * 0.22, y0); c.lineTo(x1 - w * 0.22, y1); c.stroke(); }
  }
  function vgrad(c, y0, y1, a, b) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function hgrad(c, x0, x1, a, b, m) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); if (m) g.addColorStop(0.5, m); g.addColorStop(1, b); return g; }
  function shadow(c, rx) { K.ell(c, 0, 3, rx, rx * 0.4, 0, 'rgba(0,0,0,.34)'); }
  function stones(c, rx, seed) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + seed, x = Math.cos(a) * rx * 0.86, y = Math.sin(a) * rx * 0.36 + 1, s = 4.5 + ((i * 7 + seed * 5) % 4);
      K.ell(c, x, y, s, s * 0.62, 0, i % 2 ? '#8f8777' : '#7a7263', OUT, 1.1); K.ell(c, x - s * 0.25, y - s * 0.2, s * 0.45, s * 0.2, 0, 'rgba(255,255,255,.16)');
    }
  }
  function flameAt(c, x, y, r, tm, seed, white) {
    const f = 0.78 + 0.22 * Math.sin(tm * 13 + seed), h = r * (1.5 + 0.45 * Math.sin(tm * 9 + seed * 2));
    K.glowAt(c, x, y - h * 0.4, r * 2.4, '255,120,40', 0.5 * f);
    c.fillStyle = '#ee6a1c'; c.beginPath(); c.moveTo(x - r * 0.62, y); c.quadraticCurveTo(x - r * 0.4 * f, y - h * 0.65, x + Math.sin(tm * 10 + seed) * 2, y - h); c.quadraticCurveTo(x + r * 0.4 * f, y - h * 0.6, x + r * 0.62, y); c.fill();
    c.fillStyle = '#ffb83a'; c.beginPath(); c.moveTo(x - r * 0.36, y); c.quadraticCurveTo(x - 1, y - h * 0.5, x + Math.sin(tm * 12 + seed) * 1.5, y - h * 0.66); c.quadraticCurveTo(x + 1, y - h * 0.3, x + r * 0.36, y); c.fill();
    c.fillStyle = white ? '#fff6d0' : '#ffe27a'; c.beginPath(); c.ellipse(x, y - h * 0.18, r * 0.2, h * 0.2, 0, 0, TAU); c.fill();
  }
  function smoke(c, x, y, tm, n, a) {
    for (let i = 0; i < n; i++) { const k = ((tm * 0.5 + i / n) % 1), px = x + Math.sin(tm * 2 + i * 2) * 4 + k * 6, py = y - k * 34; c.fillStyle = `rgba(70,64,60,${(1 - k) * a})`; c.beginPath(); c.arc(px, py, 3 + k * 6, 0, TAU); c.fill(); }
  }

  // ============================================================ the towers (origin: the middle of the footing, y up is negative)
  function archer(c, x, y, dir, draw, tm) {
    c.save(); c.translate(x, y);
    K.ell(c, 0, 0, 5, 2, 0, 'rgba(0,0,0,.25)');
    c.fillStyle = '#5b6b3c'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3.6, 0); c.lineTo(-2.6, -9); c.lineTo(2.6, -9); c.lineTo(3.6, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d6b48a'; c.beginPath(); c.arc(0, -12, 3.1, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#44522c'; c.beginPath(); c.arc(0, -12.8, 3.3, PI, TAU); c.fill();
    const pull = draw > 0 ? Math.min(1, draw) : 0;
    c.strokeStyle = '#5a3a20'; c.lineWidth = 1.7; c.beginPath(); c.arc(dir * (6 + pull), -8, 7, dir > 0 ? -1.15 : PI - 1.15, dir > 0 ? 1.15 : PI + 1.15, dir < 0); c.stroke();
    c.strokeStyle = 'rgba(240,230,200,.8)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(dir * (6 + 7 * Math.cos(1.15)), -8 - 7 * Math.sin(1.15)); c.lineTo(dir * (3 - pull * 3), -8); c.lineTo(dir * (6 + 7 * Math.cos(1.15)), -8 + 7 * Math.sin(1.15)); c.stroke();
    c.restore();
  }
  function drawPost(c, t, rank, tm) {
    const h = HEIGHT.post[rank - 1], hw = 14 + (rank - 1) * 1.5;
    shadow(c, 24); stones(c, 24, t.id);
    const wl = '#8a6340', wm = '#6a4a2e', wd = '#473120';
    // back legs, then front legs and braces
    limb(c, -hw + 4, -4, -hw + 3, -h + 4, 4.5, wd); limb(c, hw - 4, -4, hw - 3, -h + 4, 4.5, wd);
    limb(c, -hw - 3, 0, -hw + 1, -h, 5.5, wm, wl); limb(c, hw + 3, 0, hw - 1, -h, 5.5, wm, wl);
    limb(c, -hw - 1, -h * 0.18, hw - 1, -h * 0.62, 3.2, wd); limb(c, hw + 1, -h * 0.18, -hw + 1, -h * 0.62, 3.2, wd);
    // the deck
    K.ell(c, 0, -h, hw + 9, 8, 0, hgrad(c, -hw - 9, hw + 9, '#8d6a44', '#5c4128'), OUT, 1.5);
    for (let i = -2; i <= 2; i++) { c.strokeStyle = 'rgba(30,18,10,.45)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(i * 7, -h - 7); c.lineTo(i * 7, -h + 7); c.stroke(); }
    // rail
    limb(c, -hw - 8, -h - 3, -hw - 8, -h - 15, 3, wm); limb(c, hw + 8, -h - 3, hw + 8, -h - 15, 3, wm); limb(c, -hw - 8, -h - 15, hw + 8, -h - 15, 3, wm, wl);
    limb(c, -hw - 8, -h - 8, hw + 8, -h - 8, 2, wd);
    const aim = t.aimA, dir = Math.cos(aim) >= 0 ? 1 : -1, fresh = clamp(1 - (tm - t.firedAt) / 0.35, 0, 1);
    if (rank >= 2) {   // a shingled roof on four poles
      limb(c, -hw - 7, -h - 6, -hw - 7, -h - 36, 3.2, wm); limb(c, hw + 7, -h - 6, hw + 7, -h - 36, 3.2, wm);
      poly(c, [[-hw - 17, -h - 33], [0, -h - 56 - (rank - 2) * 8], [hw + 17, -h - 33], [hw + 10, -h - 29], [-hw - 10, -h - 29]], vgrad(c, -h - 60, -h - 28, rank >= 3 ? '#9a4a30' : '#8a5a3a', '#4c2a1c'), OUT, 1.6);
      for (let i = -2; i <= 2; i++) { c.strokeStyle = 'rgba(20,10,6,.38)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(i * 8, -h - 31); c.lineTo(i * 3, -h - 50 - (rank - 2) * 6); c.stroke(); }
      archer(c, -7, -h + 1, dir, fresh, tm); archer(c, 7, -h + 3, dir, fresh * 0.8, tm);
    } else archer(c, 0, -h + 2, dir, fresh, tm);
    if (rank === 1) { limb(c, hw + 8, -h - 15, hw + 8, -h - 34, 2, wd); poly(c, [[hw + 8, -h - 34], [hw + 22 + Math.sin(tm * 3) * 2, -h - 30], [hw + 8, -h - 25]], '#c8923a', OUT, 1.1); }
    if (rank >= 3) {   // iron bands, a banner and a torch
      for (const y of [-h * 0.3, -h * 0.72]) { c.strokeStyle = '#2c2e34'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-hw - 2.5, y); c.lineTo(-hw + 3.5, y + 1); c.moveTo(hw + 2.5, y); c.lineTo(hw - 3.5, y + 1); c.stroke(); }
      limb(c, 0, -h - 56, 0, -h - 78, 2, wd); const wv = Math.sin(tm * 3 + t.id) * 3;
      poly(c, [[0, -h - 78], [20 + wv, -h - 73], [17 + wv, -h - 66], [20 + wv, -h - 60], [0, -h - 62]], '#c8923a', OUT, 1.2);
      K.ell(c, 9, -h - 69, 2.4, 2.4, 0, '#7a2a14');
      limb(c, -hw - 7, -h - 15, -hw - 7, -h - 24, 2, wd); flameAt(c, -hw - 7, -h - 24, 3.4, tm, t.id, 0); K.glowAt(c, -hw - 7, -h - 28, 40, '255,170,70', 0.35);
    }
  }
  function bowlFire(c, x, y, r, tm, seed, n, white) { for (let i = 0; i < n; i++) flameAt(c, x + (i - (n - 1) / 2) * r * 0.9, y - Math.abs(i - (n - 1) / 2) * 1.5, r, tm + i * 0.3, seed + i, white); }
  function drawBrazier(c, t, rank, tm) {
    const h = HEIGHT.brazier[rank - 1];
    shadow(c, 20); stones(c, 19, t.id);
    K.glowAt(c, 0, -10, 70 + rank * 22, '255,130,50', 0.1 + 0.05 * rank);
    if (rank === 1) {   // an iron bowl on three legs
      limb(c, -11, 0, -6, -h + 8, 3, '#3a3c42', '#6a6e78'); limb(c, 11, 0, 6, -h + 8, 3, '#3a3c42', '#6a6e78'); limb(c, 0, 1, 0, -h + 8, 3, '#2a2c32');
    } else {   // a stone pedestal
      const pw = 9 + rank * 2, ph = rank === 2 ? 26 : 50;
      poly(c, [[-pw - 4, 0], [-pw, -ph], [pw, -ph], [pw + 4, 0]], hgrad(c, -pw - 4, pw + 4, '#a39a88', '#554f45', '#8a8272'), OUT, 1.6);
      for (let i = 1; i < (rank === 2 ? 3 : 5); i++) { c.strokeStyle = 'rgba(30,24,18,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-pw - 3 + 0.5, -i * ph / (rank === 2 ? 3 : 5)); c.lineTo(pw + 3, -i * ph / (rank === 2 ? 3 : 5)); c.stroke(); }
      if (rank === 3) for (const sx of [-1, 1]) { c.strokeStyle = '#2c2e34'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx * 20, -h + 6); c.quadraticCurveTo(sx * 24, -h * 0.5, sx * 13, 0); c.stroke(); }
    }
    const by = -h + 4, bw = 13 + rank * 3.5;
    c.fillStyle = hgrad(c, -bw, bw, '#52545c', '#2a2c32', '#70747e'); c.strokeStyle = OUT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-bw, by - 5); c.quadraticCurveTo(-bw * 0.8, by + 10, 0, by + 11); c.quadraticCurveTo(bw * 0.8, by + 10, bw, by - 5); c.closePath(); c.fill(); c.stroke();
    K.ell(c, 0, by - 5, bw, 4, 0, '#1a0e08', OUT, 1.2);
    K.ell(c, 0, by - 5, bw * 0.8, 2.6, 0, '#e8600e');
    bowlFire(c, 0, by - 5, 4 + rank * 1.7, tm, t.id, rank + 1, rank === 3);
    if (t.firedAt && tm - t.firedAt < 0.3) K.glowAt(c, 0, by - 8, 60, '255,200,100', 0.7 * (1 - (tm - t.firedAt) / 0.3));
    for (let i = 0; i < 3 + rank; i++) { const k = ((tm * 0.7 + i * 0.37 + t.id) % 1); c.fillStyle = `rgba(255,${150 + i * 20},60,${(1 - k) * 0.9})`; c.fillRect(Math.sin(tm * 3 + i * 5) * (6 + rank * 2) + k * 4, by - 8 - k * (28 + rank * 8), 1.6, 1.6); }
  }
  function drawBell(c, t, rank, tm) {
    const h = HEIGHT.bell[rank - 1], hw = 15 + rank * 2;
    shadow(c, 22); stones(c, 21, t.id);
    const wl = '#8a6340', wm = '#6a4a2e', wd = '#473120';
    if (rank < 3) {
      limb(c, -hw - 2, 0, -hw + 3, -h, 5.5, wm, wl); limb(c, hw + 2, 0, hw - 3, -h, 5.5, wm, wl);
      limb(c, -hw - 3, -h + 2, hw + 3, -h + 2, 5, wm, wl); limb(c, -hw, -h * 0.35, hw, -h * 0.35, 2.6, wd);
      if (rank === 2) { poly(c, [[-hw - 8, -h + 2], [0, -h - 14], [hw + 8, -h + 2]], vgrad(c, -h - 14, -h + 2, '#9a6a3c', '#5a3a20'), OUT, 1.5); for (const sx of [-1, 1]) { c.strokeStyle = '#e6c98a'; c.lineWidth = 1.2; c.beginPath(); c.arc(sx * (hw - 1), -h * 0.55, 3, 0, TAU); c.stroke(); } }
    } else {   // a stone arch
      for (const sx of [-1, 1]) poly(c, [[sx * (hw + 7), 0], [sx * (hw + 6), -h + 16], [sx * (hw - 5), -h + 16], [sx * (hw - 4), 0]], hgrad(c, -hw - 8, hw + 8, '#a39a88', '#5a544a', '#8e8676'), OUT, 1.6);
      c.fillStyle = hgrad(c, -hw - 8, hw + 8, '#9a9282', '#5a544a', '#b0a898'); c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-hw - 7, -h + 16); c.bezierCurveTo(-hw - 6, -h - 8, hw + 6, -h - 8, hw + 7, -h + 16); c.lineTo(hw - 5, -h + 16); c.bezierCurveTo(hw - 4, -h + 4, -hw + 4, -h + 4, -hw + 5, -h + 16); c.closePath(); c.fill(); c.stroke();
      const g = 0.5 + 0.35 * Math.sin(tm * 2 + t.id); c.strokeStyle = `rgba(255,225,150,${g})`; c.lineWidth = 1.3;
      for (let i = -1; i <= 1; i += 2) { c.beginPath(); c.moveTo(i * (hw + 1), -h * 0.3); c.lineTo(i * (hw + 1), -h * 0.52); c.moveTo(i * (hw - 1), -h * 0.38); c.lineTo(i * (hw + 3), -h * 0.38); c.stroke(); }
      K.glowAt(c, 0, -h * 0.45, 70, '255,225,150', 0.12 + 0.05 * Math.sin(tm * 2));
    }
    // the bell, swinging after a ring
    const age = tm - (t.ringAt || -9), sw = age < 1.6 ? Math.sin(age * 17) * Math.exp(-age * 2.8) * 0.55 : Math.sin(tm * 1.1 + t.id) * 0.03;
    const bs = 0.8 + rank * 0.15, top = -h + (rank === 3 ? 10 : 3);
    c.save(); c.translate(0, top); c.rotate(sw); c.scale(bs, bs);
    limb(c, 0, 0, 0, 7, 1.6, '#2c2e34');
    c.fillStyle = hgrad(c, -11, 11, '#e0b25a', '#8a5a1e', '#f2d27c'); c.strokeStyle = OUT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-4, 7); c.quadraticCurveTo(-5, 12, -10, 22); c.lineTo(10, 22); c.quadraticCurveTo(5, 12, 4, 7); c.closePath(); c.fill(); c.stroke();
    K.ell(c, 0, 22, 10, 2.6, 0, '#6e4a1a', OUT, 1.2); K.ell(c, 0, 25 + Math.sin(age * 17) * 1.2 * Math.exp(-age * 3), 2.4, 2.4, 0, '#2c2e34');
    c.strokeStyle = 'rgba(255,245,200,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3.5, 10); c.quadraticCurveTo(-5.5, 16, -7.5, 20); c.stroke();
    c.restore();
    if (rank >= 2) for (const sx of [-1, 1]) { const w = Math.sin(tm * 2.4 + sx) * 1.4; c.strokeStyle = '#e6c98a'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx * (hw - 2), -h + 3); c.lineTo(sx * (hw - 2) + w, -h + 14); c.stroke(); K.ell(c, sx * (hw - 2) + w, -h + 15, 1.8, 1.8, 0, '#e6c98a'); }
  }
  function drawBallista(c, t, rank, tm) {
    const a = t.aimA, ca = Math.cos(a), sa = Math.sin(a) * 0.55, px = -Math.sin(a), py = Math.cos(a) * 0.55;
    const sc = 0.95 + (rank - 1) * 0.16, lift = -(14 + rank * 3);
    shadow(c, 28 * sc); if (rank >= 3) stones(c, 26, t.id);
    // the platform
    K.ell(c, 0, 0, 26 * sc, 12 * sc, 0, hgrad(c, -26, 26, '#8d6a44', '#4e3822'), OUT, 1.6);
    for (let i = -2; i <= 2; i++) { c.strokeStyle = 'rgba(30,18,10,.4)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(i * 9 * sc, -10 * sc * (1 - Math.abs(i) * 0.1)); c.lineTo(i * 9 * sc, 10 * sc * (1 - Math.abs(i) * 0.1)); c.stroke(); }
    limb(c, 0, 0, 0, lift + 2, 8, '#5c4128', '#8a6340');
    const rec = Math.max(0, 1 - (tm - t.firedAt) / 0.5), back = 14 * rec;
    // stock
    limb(c, -ca * (20 + back) * sc, lift - sa * (20 + back) * sc, ca * 30 * sc, lift + sa * 30 * sc, 5.5, '#6a4a2e', '#8a6340');
    // bow arms (a curved bow across the stock, tips drawn back)
    const bx = ca * 12 * sc, by = lift + sa * 12 * sc, span = (24 + rank * 3) * sc, tipBack = 9 * sc;
    for (const s of [-1, 1]) {
      const tx = bx + px * span * s - ca * tipBack * (1 - rec * 0.8), ty = by + py * span * s - sa * tipBack * (1 - rec * 0.8);
      c.strokeStyle = OUT; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + px * span * 0.5 * s + ca * 3, by + py * span * 0.5 * s + sa * 3, tx, ty); c.stroke();
      c.strokeStyle = rank >= 2 ? '#7c7f89' : '#6a4a2e'; c.lineWidth = 3.8; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + px * span * 0.5 * s + ca * 3, by + py * span * 0.5 * s + sa * 3, tx, ty); c.stroke();
      if (rank >= 2) { c.strokeStyle = '#2c2e34'; c.lineWidth = 1.6; c.beginPath(); c.arc(tx, ty, 2.4, 0, TAU); c.stroke(); }
      c.strokeStyle = 'rgba(235,225,200,.85)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(tx, ty); c.lineTo(bx - ca * (14 * sc * (1 - rec) + 3), by - sa * (14 * sc * (1 - rec) + 3)); c.stroke();
    }
    // the bolt, sliding home after a shot
    const load = clamp((tm - t.firedAt - 0.6) / 1.2, 0, 1);
    if (load > 0 || tm - t.firedAt > 5) { const L2 = (tm - t.firedAt > 5 ? 1 : load); limb(c, -ca * 14 * sc, lift - 1 - sa * 14 * sc, ca * (6 + 22 * L2) * sc, lift - 1 + sa * (6 + 22 * L2) * sc, 2.8, '#8a6340', '#c8a070'); const tx = ca * (6 + 22 * L2) * sc, ty = lift - 1 + sa * (6 + 22 * L2) * sc; poly(c, [[tx + ca * 6, ty + sa * 6], [tx - py * 3, ty + px * 3 * 0.4], [tx + py * 3, ty - px * 3 * 0.4]], '#aab0bc', OUT, 1); }
    if (rank >= 3) { poly(c, [[ca * 30 * sc - px * 9, lift + sa * 30 * sc - py * 9 - 7], [ca * 30 * sc + px * 9, lift + sa * 30 * sc + py * 9 - 7], [ca * 30 * sc + px * 7, lift + sa * 30 * sc + py * 7 + 6], [ca * 30 * sc - px * 7, lift + sa * 30 * sc - py * 7 + 6]], hgrad(c, -10, 10, '#8a8e98', '#454850', '#aab0bc'), OUT, 1.3); limb(c, -ca * 22 * sc, lift - sa * 22 * sc, -ca * 22 * sc + px * 7, lift - sa * 22 * sc + py * 7, 2.4, '#2c2e34'); }
    if (rank >= 2) { K.ell(c, 0, lift + 2, 6, 3, 0, '#3e4047', OUT, 1.2); }
  }
  function drawRubble(c, t, tm) {
    shadow(c, 26);
    K.ell(c, 0, 2, 24, 10, 0, 'rgba(18,10,6,.5)');
    const seeds = [[-12, 0, 9, 5], [8, -1, 10, 6], [-1, 5, 8, 4], [15, 5, 6, 3.5], [-18, 6, 6, 3.5], [2, -4, 7, 4]];
    seeds.forEach((s, i) => { K.ell(c, s[0], s[1], s[2], s[3], (i - 2) * 0.12, i % 2 ? '#7d7567' : '#938a79', OUT, 1.2); K.ell(c, s[0] - 2, s[1] - 1.5, s[2] * 0.5, s[3] * 0.3, 0, 'rgba(255,255,255,.14)'); });
    limb(c, -14, -3, 10, -13, 4, '#5c4128', '#8a6340'); limb(c, 4, 2, 20, -7, 3.4, '#473120'); limb(c, -8, 4, -22, -2, 3, '#5c4128');
    smoke(c, 0, -6, tm + t.id, 2, 0.22);
  }
  const DRAW = { post: drawPost, brazier: drawBrazier, bell: drawBell, ballista: drawBallista };

  function drawTower(c, t, tm, o) {
    o = o || {};
    c.save(); c.translate(t.x, t.y);
    if (t.rubble) { drawRubble(c, t, tm); c.restore(); return; }
    const hit = tm - t.hitAt, shake = hit < 0.18 ? (Math.sin(hit * 90) * 1.6 * (1 - hit / 0.18)) : 0;
    c.translate(shake, 0);
    const up = tm - t.upAt;
    if (up < 0.7) { const k = up / 0.7; c.scale(1 + 0.05 * Math.sin(k * PI), 1 + 0.05 * Math.sin(k * PI)); }
    const bp = t.flags & 2 ? clamp((tm - t.bornAt) / TUNE.buildSecs, 0, 1) : 1, H = HEIGHT[t.kind][t.rank - 1] + 80;
    if (bp < 1) {
      c.save(); c.beginPath(); c.rect(-70, -H * (0.12 + 0.88 * bp), 140, H + 20); c.clip(); DRAW[t.kind](c, t, t.rank, tm); c.restore();
      // scaffold poles and a hammer
      c.strokeStyle = 'rgba(210,180,130,.7)'; c.lineWidth = 2; for (const sx of [-24, 24]) { c.beginPath(); c.moveTo(sx, 4); c.lineTo(sx * 0.9, -H * 0.55 * (0.3 + 0.7 * bp)); c.stroke(); }
      c.beginPath(); c.moveTo(-24, -H * 0.3 * bp - 6); c.lineTo(24, -H * 0.3 * bp - 6); c.stroke();
      const hm = Math.sin(tm * 14) * 0.5 + 0.5; c.strokeStyle = '#6a4a2e'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(26, -H * 0.3 * bp - 6); c.lineTo(32 + hm * 4, -H * 0.3 * bp - 18 - hm * 5); c.stroke();
      if (hm > 0.9) K.burst(t.x + 28, t.y - H * 0.3 * bp, 2, { color: '#ffd9a0', spd: 90, dur: 0.3, size: 1.6, kind: 'spark' });
    } else DRAW[t.kind](c, t, t.rank, tm);
    if (up < 0.9) { const k = up / 0.9; K.glowAt(c, 0, -HEIGHT[t.kind][t.rank - 1] * 0.6, 70 + 40 * k, '255,230,160', (1 - k) * 0.8); }
    if (t.flags & 8) { const sh = 0.4 + 0.3 * Math.sin(tm * 8); K.ell(c, 0, -HEIGHT[t.kind][t.rank - 1] * 0.45, 36, 40, 0, `rgba(255,236,170,${0.1 * sh})`, `rgba(255,236,170,${0.6 * sh})`, 1.6); }
    if (t.hp < t.max * 0.5 && !(t.flags & 2)) smoke(c, 6, -HEIGHT[t.kind][t.rank - 1] * 0.8, tm + t.id, 2, 0.28);
    if (t.hp < t.max * 0.25 && !(t.flags & 2)) flameAt(c, -5, -HEIGHT[t.kind][t.rank - 1] * 0.55, 3, tm, t.id + 3, 0);
    if (t.flags & 16) { for (let i = 0; i < 2; i++) { const k = (tm * 2 + i * 0.5) % 1; c.fillStyle = `rgba(255,236,170,${1 - k})`; c.fillRect(-12 + i * 18, -10 - k * 30, 2, 2); } }
    c.restore();
    // rank pips and health under the footing
    const hv = (S && L.hover === t.id) || L.sel === t.id;
    for (let i = 0; i < 3; i++) { const px = (i - 1) * 8; poly(c, [[t.x + px, t.y + 13], [t.x + px + 3, t.y + 16], [t.x + px, t.y + 19], [t.x + px - 3, t.y + 16]], i < t.rank ? '#e6c98a' : 'rgba(20,16,12,.7)', OUT, 0.9); }
    if (t.hp < t.max || hv) { const w = 40, x = t.x - w / 2, y = t.y + 23; c.fillStyle = '#000a'; c.fillRect(x - 1, y - 1, w + 2, 5); c.fillStyle = t.hp / t.max > 0.5 ? '#6aa86a' : t.hp / t.max > 0.25 ? '#d9a050' : '#c4513f'; c.fillRect(x, y, w * clamp(t.hp / t.max, 0, 1), 3); if (t.shield > 0) { c.fillStyle = 'rgba(255,236,170,.9)'; c.fillRect(x, y - 2, w * clamp(t.shield / 80, 0, 1), 1.5); } }
  }
  const rangeOf = t => { const T = TW[t.kind]; return t.kind === 'bell' ? T.radius[t.rank - 1] : t.kind === 'post' ? T.range[t.rank - 1] : t.kind === 'brazier' ? T.range[t.rank - 1] : T.range[t.rank - 1]; };

  // ============================================================ the soldiers
  function drawSoldier(c, s, tm) {
    const dir = Math.cos(s.face) >= 0 ? 1 : -1, ur = s.ur, ar = ur & 3, wp = (ur >> 2) & 3, hl = (ur >> 4) & 3, walk = s.moving, ph = tm * 9 + s.id * 1.7, bob = walk ? Math.abs(Math.sin(ph)) * 1.6 : 0;
    const rider = s.ti === 3;
    c.save(); c.translate(s.x, s.y); K.ell(c, 0, 1, rider ? 15 : 8.5, rider ? 4.4 : 3.4, 0, 'rgba(0,0,0,.32)'); c.scale(dir, 1);
    const leg = walk ? Math.sin(ph) * 3 : 0;
    if (!rider) { limb(c, -2.2, -6 - bob * 0.3, -2.2 + leg * 0.6, 0, 2.6, '#3a2e24'); limb(c, 2.2, -6 - bob * 0.3, 2.2 - leg * 0.6, 0, 2.6, '#3a2e24'); }
    const fl = s.flash > 0 ? s.flash : 0;
    if (rider) {   // a cavalry knight: a chestnut horse, a rider with a couched lance; the gallop is wider when it charges
      const gp = tm * (s.chg ? 17 : 11) + s.id * 1.3, gl = walk ? 1 : 0, rise = walk ? Math.sin(gp * 2) * (s.chg ? 2.2 : 1.2) : 0, sw = fl > 0 ? Math.sin((1 - fl / 0.25) * PI) : 0;
      const legs = [[-8, 0], [-5, 2.4], [5, 1.2], [8, 3.6]];
      legs.forEach(([lx, po], li) => { const a = Math.sin(gp + po) * 5.5 * gl, lift = Math.max(0, Math.cos(gp + po)) * 2.5 * gl; limb(c, lx, -10 - rise, lx + a, -lift, 2.4, li % 2 ? '#4a2c18' : '#5e3a20'); K.ell(c, lx + a, -lift, 1.6, 1.1, 0, '#1e1812'); });
      c.strokeStyle = '#2a1a10'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-11, -15 - rise); c.quadraticCurveTo(-17, -14 + Math.sin(gp) * 2 * gl, -16, -7 + Math.sin(gp * 1.5) * 2 * gl); c.stroke(); c.lineCap = 'butt';
      K.ell(c, 0, -13 - rise, 12, 5.6, 0, hgrad(c, -8, 8, '#a8602c', '#6a3818', '#c07a3c'), OUT, 1.2);
      poly(c, [[7, -16 - rise], [11, -25 - rise], [15, -24 - rise], [13, -15 - rise]], hgrad(c, 6, 15, '#a8602c', '#6a3818', '#c07a3c'), OUT, 1.1);
      K.ell(c, 16.4, -23.6 - rise, 4.6, 2.5, 0.5, hgrad(c, 12, 20, '#a8602c', '#6a3818', '#c07a3c'), OUT, 1.1); c.fillStyle = '#1a1612'; c.fillRect(15.6, -25 - rise, 1.2, 1.2);
      c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.beginPath(); c.moveTo(10.5, -25 - rise); c.quadraticCurveTo(7, -24 - rise, 8, -18 - rise); c.stroke();
      poly(c, [[-4, -17.5 - rise], [5, -17.5 - rise], [6, -9 - rise], [-5, -9 - rise]], ar >= 1 ? '#b23a24' : '#8a2e1c', OUT, 1.1);   // the horse's cloth
      if (ar >= 1) { c.strokeStyle = '#e6c98a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-4.6, -10 - rise); c.lineTo(5.4, -10 - rise); c.stroke(); }
      if (ar >= 2) poly(c, [[14.4, -26.6 - rise], [19.4, -24.6 - rise], [18.4, -23.2 - rise], [13.8, -24.4 - rise]], '#9aa0ac', OUT, 1);
      poly(c, [[-3.6, -17.5 - rise], [-3, -27 - rise], [3, -27 - rise], [3.6, -17.5 - rise]], hgrad(c, -4, 4, '#d9a24a', '#9a6a22', '#e8b45c'), OUT, 1.2);
      K.ell(c, 0, -30.6 - rise, 3.6, 3.7, 0, hgrad(c, -4, 4, '#aab0bc', '#555a64', '#d0d6e0'), OUT, 1.2); c.fillStyle = '#1a1612'; c.fillRect(0.4, -31.2 - rise, 3, 1.2);
      if (ar >= 2) { c.strokeStyle = ar >= 3 ? '#e6c98a' : '#b23a24'; c.lineWidth = 2; c.beginPath(); c.moveTo(-1, -34 - rise); c.quadraticCurveTo(-5, -37 - rise + Math.sin(gp) * gl, -8, -33 - rise); c.stroke(); }
      K.ell(c, -3.2, -22.6 - rise, 2.8, 4.2, 0, hgrad(c, -6, 0, '#9aa0ac', '#4a4e58', '#c0c6d0'), OUT, 1.1); K.ell(c, -3.2, -22.6 - rise, 1, 1, 0, '#c8923a');
      const ll = 19 + wp * 2.2 + sw * 4, tipy = -24 - rise - (s.chg ? 1 : 3) + sw * 3; limb(c, 2, -22.5 - rise, 2 + ll, tipy, 1.6, '#7a5a38'); limb(c, 2 + ll - 4, tipy + 0.3, 2 + ll + 3, tipy, 2.1, wp >= 3 ? '#e6eef8' : '#c4cad4');
      c.fillStyle = '#b23a24'; c.beginPath(); c.moveTo(2 + ll - 6, tipy); c.lineTo(2 + ll - 14 - Math.sin(gp) * gl, tipy + 3.4); c.lineTo(2 + ll - 6, tipy + 4.4); c.closePath(); c.fill();
      if (wp >= 3) K.glowAt(c, 2 + ll, tipy, 11, '255,240,200', 0.4);
      if (s.chg) { c.strokeStyle = 'rgba(230,210,170,.35)'; c.lineWidth = 1.2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-18 - i * 5, -8 - i * 6); c.lineTo(-27 - i * 6, -8 - i * 6); c.stroke(); } }
    } else if (s.ti === 0) {   // a knight
      const sw = fl > 0 ? Math.sin((1 - fl / 0.25) * PI) : 0;
      poly(c, [[-4.8, -7 - bob], [-3.8, -17 - bob], [3.8, -17 - bob], [4.8, -7 - bob]], hgrad(c, -5, 5, '#d9a24a', '#9a6a22', '#e8b45c'), OUT, 1.2);
      c.strokeStyle = '#7a1e12'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -16 - bob); c.lineTo(0, -8 - bob); c.stroke();
      K.ell(c, -5.4, -11 - bob, 3.2, 4.6, 0, hgrad(c, -8, -2, '#9aa0ac', '#4a4e58', '#c0c6d0'), OUT, 1.2); K.ell(c, -5.4, -11 - bob, 1.1, 1.1, 0, '#c8923a');
      if (ar >= 1) { K.ell(c, 4.6, -16.6 - bob, 2.6, 1.8, 0, '#9aa0ac', OUT, 1); K.ell(c, -4.6, -16.6 - bob, 2.6, 1.8, 0, '#9aa0ac', OUT, 1); }
      K.ell(c, 0, -20 - bob, 3.8, 3.9, 0, hgrad(c, -4, 4, '#aab0bc', '#555a64', '#d0d6e0'), OUT, 1.2);
      c.fillStyle = '#1a1612'; c.fillRect(0.4, -20.6 - bob, 3.2, 1.3);
      if (ar >= 2) { c.strokeStyle = ar >= 3 ? '#e6c98a' : '#b23a24'; c.lineWidth = 2; c.beginPath(); c.moveTo(-1, -23.6 - bob); c.quadraticCurveTo(-4, -26 - bob, -5.5, -22 - bob); c.stroke(); }
      if (ar >= 3) { c.strokeStyle = '#e6c98a'; c.lineWidth = 1; c.beginPath(); c.arc(0, -20 - bob, 3.9, PI * 1.05, PI * 1.95); c.stroke(); }
      const ang = -0.9 + sw * 2.0, bl = 9 + wp * 1.8;
      limb(c, 4.4, -13 - bob, 4.4 + Math.cos(ang) * bl, -13 - bob + Math.sin(ang) * bl, 1.8, wp >= 3 ? '#e6eef8' : '#c4cad4');
      limb(c, 4.4, -13 - bob, 6, -11.5 - bob, 2.4, '#5c4128');
      if (sw > 0.2) { c.strokeStyle = `rgba(255,245,210,${sw * 0.7})`; c.lineWidth = 2; c.beginPath(); c.arc(4.4, -13 - bob, bl, -1.4, 0.7); c.stroke(); }
      if (wp >= 3) K.glowAt(c, 4.4 + Math.cos(ang) * bl * 0.6, -13 - bob + Math.sin(ang) * bl * 0.6, 12, '255,240,200', 0.4);
    } else if (s.ti === 1) {   // an archer
      poly(c, [[-4.2, -7 - bob], [-3.2, -16 - bob], [3.2, -16 - bob], [4.2, -7 - bob]], hgrad(c, -5, 5, '#6e7f46', '#3e4a28', '#7e9050'), OUT, 1.2);
      if (ar >= 1) { c.strokeStyle = '#8a6340'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3, -16 - bob); c.lineTo(3, -8 - bob); c.stroke(); }
      K.ell(c, 0, -19.5 - bob, 3.5, 3.5, 0, '#d6b48a', OUT, 1.1); c.fillStyle = ar >= 2 ? '#4a5a2c' : '#44522c'; c.beginPath(); c.arc(0, -20.3 - bob, 3.9, PI, TAU); c.lineTo(3.9, -17 - bob); c.lineTo(-3.9, -17 - bob); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#5a3a20'; c.fillRect(-6.2, -17 - bob, 2.4, 8);
      const draw = fl > 0 ? 1 - fl / 0.25 : 0.4; c.strokeStyle = '#6a4a2e'; c.lineWidth = 1.7; c.beginPath(); c.arc(6.5 + draw * 0.4, -12.5 - bob, 7 + wp * 0.8, -1.1, 1.1); c.stroke();
      c.strokeStyle = 'rgba(240,230,200,.85)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(6.5 + 7 * Math.cos(1.1), -12.5 - bob - 7 * Math.sin(1.1)); c.lineTo(3.5 - draw * 3, -12.5 - bob); c.lineTo(6.5 + 7 * Math.cos(1.1), -12.5 - bob + 7 * Math.sin(1.1)); c.stroke();
      if (wp >= 3) K.glowAt(c, 9, -12.5 - bob, 10, '255,225,150', 0.35);
    } else {   // the cleric
      poly(c, [[-5.4, -1], [-3.4, -16 - bob], [3.4, -16 - bob], [5.4, -1]], hgrad(c, -6, 6, '#f2ead4', '#b8ad90', '#fffaf0'), OUT, 1.2);
      c.strokeStyle = '#d6aa4a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3.4, -12 - bob); c.lineTo(3.4, -12 - bob); c.stroke();
      K.ell(c, 0, -19.5 - bob, 3.5, 3.5, 0, '#d6b48a', OUT, 1.1); c.fillStyle = '#f2ead4'; c.beginPath(); c.arc(0, -20.4 - bob, 3.9, PI, TAU); c.lineTo(3.4, -17 - bob); c.lineTo(-3.4, -17 - bob); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
      limb(c, 6.4, -2 - bob, 6.4, -23 - bob, 1.8, '#8a6340'); const g = 0.55 + 0.25 * Math.sin(tm * 4 + s.id) + (fl > 0 ? 0.6 : 0);
      K.ell(c, 6.4, -24.6 - bob, 2.6 + hl * 0.4, 2.6 + hl * 0.4, 0, '#fff3b0', OUT, 1);
      K.glowAt(c, 6.4, -24.6 - bob, 16 + hl * 5 + (fl > 0 ? 12 : 0), '255,230,150', g * 0.7);
    }
    c.restore();
    if (s.hp < 100) { const by = s.y - (rider ? 42 : 31); c.fillStyle = '#000a'; c.fillRect(s.x - 8, by, 16, 3); c.fillStyle = s.hp > 50 ? '#6aa86a' : s.hp > 25 ? '#d9a050' : '#c4513f'; c.fillRect(s.x - 7.5, by + 0.5, 15 * s.hp / 100, 2); }
  }

  const SQ_NAME = { knight: ['knight', 'knights'], archer: ['archer', 'archers'], cleric: ['cleric', 'clerics'], cavalry: ['cavalry knight', 'cavalry knights'] };
  function squadNote() {
    const list = DEF.squadAt(S ? S.tier : 0), n = {}; for (const t of list) n[t] = (n[t] || 0) + 1;
    const parts = DEF.TYPES.filter(t => n[t]).map(t => n[t] + ' ' + SQ_NAME[t][n[t] > 1 ? 1 : 0]);
    return 'A squad of ' + list.length + ' marches out to each lane with every wave: ' + parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] + '. It gains a soldier each time the enemy lines step up.';
  }

  // ============================================================ effects
  function towerTop(t) { return t.y - HEIGHT[t.kind][t.rank - 1] * 0.85; }
  function fxArrow(x0, y0, x1, y1, dur, rgb, lw, trail) {
    K.fxAdd({ dur: dur + 0.14, draw(c) {
      const k = this.t < dur ? this.t / dur : 1, f = this.t < dur ? 1 : 1 - (this.t - dur) / 0.14, hx = x0 + (x1 - x0) * k, hy = y0 + (y1 - y0) * k, d = Math.hypot(x1 - x0, y1 - y0) || 1, tl = Math.min(trail, d * k), ux = (x1 - x0) / d, uy = (y1 - y0) / d;
      c.strokeStyle = `rgba(${rgb},${0.9 * f})`; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx - ux * tl, hy - uy * tl); c.lineTo(hx, hy); c.stroke();
      c.strokeStyle = `rgba(255,248,225,${0.9 * f})`; c.lineWidth = lw * 0.4; c.beginPath(); c.moveTo(hx - ux * tl * 0.5, hy - uy * tl * 0.5); c.lineTo(hx, hy); c.stroke();
    } });
  }
  function fxLob(x0, y0, x1, y1, dur, blast) {
    K.fxAdd({ dur, draw(c) {
      const k = this.t / dur, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * PI) * 70;
      K.glowAt(c, x, y, 26, '255,130,40', 0.8); K.ell(c, x, y, 4, 4, 0, '#ffb040'); K.ell(c, x, y, 2, 2, 0, '#fff0b0');
      if (Math.random() < 0.6) K.burst(x, y, 1, { color: '#ff9a40', spd: 30, dur: 0.3, size: 1.8, kind: 'spark' });
    } });
    K.fxAdd({ dur: dur + 0.5, draw() {}, });
    setTimeout(() => { try { if (S && K) { K.fxBlast(x1, y1, blast, '255,150,60', false); sfx('fd-fireball-hit', 'fd-erupt'); } } catch (e) { /* the run ended */ } }, dur * 1000);
  }
  function fxBolt(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / d, uy = (y1 - y0) / d;
    K.fxAdd({ dur: 0.34, draw(c) {
      const k = Math.min(1, this.t / 0.2), f = this.t < 0.2 ? 1 : 1 - (this.t - 0.2) / 0.14, hx = x0 + (x1 - x0) * k, hy = y0 + (y1 - y0) * k;
      c.strokeStyle = `rgba(30,22,16,${f})`; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx - ux * 26, hy - uy * 26); c.lineTo(hx, hy); c.stroke();
      c.strokeStyle = `rgba(200,160,110,${f})`; c.lineWidth = 3; c.beginPath(); c.moveTo(hx - ux * 26, hy - uy * 26); c.lineTo(hx, hy); c.stroke();
      c.fillStyle = `rgba(190,196,208,${f})`; c.beginPath(); c.arc(hx, hy, 3.4, 0, TAU); c.fill(); K.glowAt(c, hx, hy, 18, '255,240,200', 0.4 * f);
    } });
    setTimeout(() => { try { if (S && K) { K.burst(x1, y1, 7, { color: '#d9c9a0', spd: 150, dur: 0.4, size: 2.2, kind: 'spark' }); K.burst(x1, y1, 4, { color: '#7a4a30', spd: 80, dur: 0.6, size: 3, kind: 'dust' }); K.fxRing(x1, y1, 4, 30, 0.3, '240,225,190', 2); } } catch (e) { /* ended */ } }, 200);
  }
  function fxRingGold(x, y, R) {
    K.fxAdd({ dur: 0.7, draw(c) { const k = K.eo(this.t / 0.7); K.ell(c, x, y, R * k, R * k * 0.92, 0, `rgba(255,225,150,${(1 - k) * 0.1})`, `rgba(255,228,160,${(1 - k) * 0.85})`, 3 * (1 - k) + 0.8); } });
    K.fxAdd({ dur: 0.5, draw(c) { const k = K.eo(this.t / 0.5); K.ell(c, x, y, R * 0.7 * k, R * 0.7 * k * 0.92, 0, null, `rgba(255,240,200,${(1 - k) * 0.5})`, 1.4); } });
  }
  function fxDust(x, y, n) { K.burst(x, y, n, { color: '#a89878', spd: 70, dur: 0.7, size: 3.4, kind: 'dust', vy: -20 }); K.burst(x, y, Math.ceil(n / 2), { color: '#ffd9a0', spd: 100, dur: 0.4, size: 1.8, kind: 'spark' }); }

  // ============================================================ state from the host
  function applySnap(m) {
    if (Array.isArray(m.tw)) {
      const seen = new Set();
      for (const r of m.tw) {
        seen.add(r[0]); let t = towers.get(r[0]);
        if (!t) { t = { id: r[0], x: r[3], y: r[4], bornAt: S.T - (r[7] & 2 ? 1 : 9), firedAt: -9, ringAt: -9, hitAt: -9, upAt: -9, aimA: PI / 2, hpPrev: r[5] }; towers.set(r[0], t); }
        t.kind = KINDS[r[1]] || 'post'; t.rank = r[2]; t.x = r[3]; t.y = r[4]; t.max = r[6]; t.flags = r[7]; t.rubble = !!(r[7] & 1); t.inv = r[8];
        t.shield = r[7] & 8 ? 80 : 0;
        if (r[5] < t.hpPrev - 0.5 && !t.rubble) { t.hitAt = S.T; if (S.T - (t.flt || -9) > 0.6) { t.flt = S.T; K.ftxt(t.x, t.y - 50, '-' + Math.round(t.hpPrev - r[5]), '#ffb4a0', 10, 0.7); } }
        t.hpPrev = r[5]; t.hp = r[5];
      }
      for (const id of towers.keys()) if (!seen.has(id)) { const t = towers.get(id); if (L.sel === id) L.sel = null; towers.delete(id); }
    }
    if (Array.isArray(m.sd)) {
      const seen = new Set();
      for (const r of m.sd) {
        seen.add(r[0]); let s = sol.get(r[0]);
        if (!s) { s = { id: r[0], x: r[2], y: r[3], face: r[4] / 10, flash: 0, moving: false, hp: 100, ur: 0, ti: r[1] }; sol.set(r[0], s); }
        s.ti = r[1]; s.tx = r[2]; s.ty = r[3]; s.tf = r[4] / 10; s.hp = r[5]; s.moving = !!(r[6] & 2); s.ur = (r[6] >> 2) & 63; s.chg = !!(r[6] & 256); s.lane = r[7];
        if (r[6] & 1 && s.flash <= 0) { s.flash = s.ti === 2 ? 0.35 : 0.25; if ((s.ti === 0 || s.ti === 3) && K.visAt(s.x, s.y, 10)) K.snd('fd-soldier-swing', { minGap: 0.12 }); }
      }
      for (const id of sol.keys()) if (!seen.has(id)) sol.delete(id);
    }
  }
  const byId = id => towers.get(id);
  const ERR = { 1: 'Not enough gold.', 2: 'The camp cannot hold more towers.', 3: 'The ground will not take it.', 4: 'Too far from your party.', 5: 'Stand closer to it.', 6: 'Nothing more to add.' };
  function onEvent(ev) {
    const tag = ev[0];
    if (tag.charCodeAt(0) === 116 && tag.charCodeAt(1) === 119) {   // tw*
      const t = byId(ev[1]);
      switch (tag) {
        case 'twb': { const kind = KINDS[ev[2]], x = ev[4], y = ev[5]; if (!t) { towers.set(ev[1], { id: ev[1], kind, rank: 1, x, y, max: TW[kind].hp[0], hp: TW[kind].hp[0] * 0.35, hpPrev: TW[kind].hp[0] * 0.35, flags: 2, bornAt: S.T, firedAt: -9, ringAt: -9, hitAt: -9, upAt: -9, aimA: PI / 2, inv: TW[kind].cost[0] }); } else t.bornAt = S.T; fxDust(x, y, 10); sfx('fd-post-plant', 'fd-setdown'); break; }
        case 'twu': if (t) { t.rank = ev[2]; t.upAt = S.T; t.bornAt = S.T - 9; K.burst(t.x, t.y - 30, 12, { color: '#ffe9a8', spd: 110, dur: 0.7, size: 2.2, kind: 'spark', vy: -30 }); K.fxRing(t.x, t.y, 10, 60, 0.5, '255,228,160', 2.5); sfx('fd-rankup'); } break;
        case 'twf': if (t) {
          const tx = ev[2], ty = ev[3], v = ev[4], a = Math.atan2(ty - t.y, tx - t.x); t.aimA = a; t.firedAt = S.T;
          if (v === 0 || v === 1) { const ox = t.x + Math.cos(a) * 10, oy = towerTop(t); fxArrow(ox, oy, tx, ty - 6, 0.12, '255,236,190', 1.6, 24); if (v === 1) fxArrow(tx, ty - 6, tx + Math.cos(a) * 90, ty - 6 + Math.sin(a) * 90, 0.12, '255,236,190', 1.2, 30); K.sfxGap && 0; sfx('fd-arrow'); }
          else if (v === 2) { fxLob(t.x, towerTop(t) + 6, tx, ty, 0.38, TW.brazier.blast[t.rank - 1]); sfx('fd-fireball-cast', 'fd-fireball-hit'); }
          else if (v === 3) { fxBolt(t.x + Math.cos(a) * 24, t.y - 22 + Math.sin(a) * 10, tx, ty - 8); sfx('fd-ballista', 'fd-pierce', 'fd-arrow'); K.shake(1.5, 0.12); }
        } break;
        case 'twr': if (t) { t.ringAt = S.T; fxRingGold(t.x, t.y, ev[2]); sfx('fd-bell-ring', 'fd-sanctum'); } break;
        case 'twd': if (t) { t.hpPrev = 0; } fxDust(ev[2], ev[3], 18); K.burst(ev[2], ev[3] - 20, 10, { color: '#5c4128', spd: 140, dur: 0.8, size: 3.4, kind: 'dust', vy: -50, g: 160 }); K.shake(3, 0.25); sfx('fd-tower-fall', 'fd-gate-break'); break;
        case 'twx': { const o = byId(ev[1]); if (o) { fxDust(ev[2], ev[3], 6); towers.delete(ev[1]); if (L.sel === ev[1]) L.sel = null; } break; }
        case 'tws': { const o = byId(ev[1]); if (o) { K.burst(ev[2], ev[3] - 20, 8, { color: '#f0cf72', spd: 90, dur: 0.8, size: 2.4, kind: 'spark', vy: -50 }); K.ftxt(ev[2], ev[3] - 40, 'Sold', '#f0cf72', 11, 0.9); fxDust(ev[2], ev[3], 8); towers.delete(ev[1]); if (L.sel === ev[1]) L.sel = null; sfx('fd-sell'); } break; }
        case 'twre': if (t) { t.bornAt = S.T; fxDust(t.x, t.y, 10); sfx('fd-post-plant', 'fd-setdown'); } break;
        case 'twno': if (ev[1] === S.myId) { K.say(ERR[ev[2]] || 'Cannot do that.'); } break;
      }
      return true;
    }
    if (tag.charCodeAt(0) === 115 && tag.charCodeAt(1) === 111) {   // so*
      switch (tag) {
        case 'sob': sfx('fd-march', 'fd-wave'); break;
        case 'sof': { const s = sol.get(ev[1]); if (s) { s.flash = 0.25; if (K.visAt(s.x, s.y, 10)) K.snd('fd-soldier-shot', { minGap: 0.12 }); fxArrow(s.x + (Math.cos(s.face) >= 0 ? 6 : -6), s.y - 12, ev[2], ev[3] - 6, 0.1, '255,236,190', 1.2, 14); } break; }
        case 'soh': { const s = sol.get(ev[1]); if (s) { s.flash = 0.35; if (K.visAt(s.x, s.y, 10)) K.snd('fd-soldier-heal', { minGap: 0.3 }); const x1 = ev[2], y1 = ev[3]; K.fxAdd({ dur: 0.45, draw(c) { const k = this.t / 0.45; K.glowAt(c, s.x + (x1 - s.x) * K.eo(k), s.y - 16 + (y1 - 12 - s.y + 16) * K.eo(k), 14, '255,240,170', 1 - k * 0.6); } }); K.burst(x1, y1 - 10, 4, { color: '#bff2c4', spd: 30, dur: 0.7, size: 2, kind: 'dot', vy: -36 }); } break; }
        case 'sod': K.burst(ev[2], ev[3] - 8, 6, { color: '#a89878', spd: 60, dur: 0.6, size: 3, kind: 'dust', vy: -20 }); sol.delete(ev[1]); break;
        case 'soc': { const s = sol.get(ev[1]); if (s) { s.flash = 0.25; } K.burst(ev[2], ev[3] - 6, 9, { color: '#d9c9a0', spd: 140, dur: 0.45, size: 2.4, kind: 'spark' }); K.burst(ev[2], ev[3], 5, { color: '#a89878', spd: 70, dur: 0.6, size: 3, kind: 'dust', vy: -16 }); K.fxRing(ev[2], ev[3], 4, 34, 0.3, '240,225,190', 2); if (K.visAt(ev[2], ev[3], 10)) K.snd('fd-soldier-swing', { minGap: 0.1 }); break; }
        case 'sou': if (ev[1] === S.myId) sfx('fd-buy'); break;
      }
      return true;
    }
    return false;
  }

  // ============================================================ placing and selecting
  function myHeroes() { const out = []; if (!S) return out; for (const u of S.units.values()) if (u.kind === 'h' && !(u.f & K.FLAG.DEAD)) out.push(u); return out; }
  function ghostState(kind, x, y) {
    const P = S.props || {}, hs = myHeroes();
    if (!hs.some(h => Math.hypot(h.x - x, h.y - y) <= TUNE.buildReach)) return 4;
    if (DEF.fits(x, y, towerList(), P)) return 3;
    const cap = P.tcap || [0, 99]; if (cap[0] >= cap[1]) return 2;
    if (myGold() < TW[kind].cost[0]) return 1;
    return 0;
  }
  const towerList = () => { const a = []; for (const t of towers.values()) a.push(t); return a; };
  function startPlacing(kind) { L.placing = kind; L.sel = null; closeTp(); setOpen(false); K.snd('ui-open'); }
  function cancelPlacing() { L.placing = null; }
  function towerAtPoint(wx, wy) {
    let best = null, bd = 1e9;
    for (const t of towers.values()) {
      const h = t.rubble ? 12 : HEIGHT[t.kind][t.rank - 1] + 14, dx = Math.abs(wx - t.x), dy = wy - t.y;
      if (dx < 24 && dy > -h && dy < 18) { const d = Math.hypot(wx - t.x, (wy - t.y + h / 2) * 0.5); if (d < bd) { bd = d; best = t; } }
    }
    return best;
  }
  function boardPos() { return L.board || (L.board = DEF.boardAt || [1700, 1806]); }
  function onBoard(wx, wy) { const b = boardPos(); return wx > b[0] - 34 && wx < b[0] + 34 && wy > b[1] - 62 && wy < b[1] + 10; }

  // ============================================================ DOM: the board and the tower panel
  function rootEl() { return document.getElementById('fd-root'); }
  function mkPanel(id, cls) { let e = document.getElementById(id); if (!e) { const r = rootEl(); if (!r) return null; e = document.createElement('div'); e.id = id; e.className = cls; e.style.display = 'none'; r.appendChild(e); e.addEventListener('contextmenu', ev => ev.preventDefault()); e.addEventListener('mousedown', ev => ev.stopPropagation()); } return e; }
  function setOpen(on) {
    L.open = on;
    const p = mkPanel('fd-build', 'fd-panel fd-pn'); if (!p) return;
    p.style.display = on ? '' : 'none'; if (on) { L.sig = ''; renderBoard(true); K.snd('ui-open'); closeTp(); L.sel = null; } else if (typeof Tip !== 'undefined' && Tip.hide) Tip.hide();
  }
  function closeTp() { if (L.tp) L.tp.style.display = 'none'; L.tsig = ''; }
  function miniCanvas(kind, rank, w, h) {
    const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.dataset.kind = kind; cv.dataset.rank = rank; return cv;
  }
  function paintMini(cv, tm) {
    const kind = cv.dataset.kind, rank = +cv.dataset.rank, g = cv.getContext('2d'), w = cv.width, h = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    const bg = g.createRadialGradient(w / 2, h * 0.7, 4, w / 2, h * 0.7, w * 0.8); bg.addColorStop(0, '#2c2418'); bg.addColorStop(1, '#17130f'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const fake = { id: rank * 7 + kind.length, kind, rank, x: 0, y: 0, hp: 1, max: 1, flags: 0, firedAt: -9, ringAt: -9, hitAt: -9, upAt: -9, bornAt: -9, aimA: -0.5, rubble: false, shield: 0 };
    const hh = HEIGHT[kind][rank - 1] + (kind === 'post' ? (rank >= 3 ? 84 : rank === 2 ? 60 : 34) : kind === 'bell' ? 28 : 34), sc = Math.min(1.35, (h - 22) / hh * 0.92) * (w / 112);
    g.setTransform(sc, 0, 0, sc, w / 2, h - 16 * (w / 112)); DRAW[kind](g, fake, rank, tm);
  }
  // the board is the tent's twin: the four towers and the three squad trainings as tiles on the left, what you point at on the right
  const FUI = () => (typeof FoundingUI !== 'undefined' ? FoundingUI : null);
  const coinHtml = () => { const u = FUI(); return u ? u.coinImg() : ''; };
  function iconHolder(p) {
    const u = FUI(), I = u && u.icons;
    p.querySelectorAll('.fd-ic[data-ic]').forEach(n => {
      const id = n.dataset.ic, big = n.dataset.big ? 1 : 0;
      if (DEF.UP_IDS.indexOf(id) >= 0 || (I && I.has('build-' + id))) { const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.src = I ? I.build(id) : ''; n.appendChild(im); return; }
      const w = big ? 58 : 66, cv = miniCanvas(id, 1, w - 4, w - 4); cv.style.margin = '0'; n.appendChild(cv);
    });
  }
  function boardDetail(p, cap, sdu, gold) {
    const dt = p.querySelector('#fd-bdet'); if (!dt) return; const coin = coinHtml();
    if (L.tab === 't') {
      const k = TW[L.bsel] ? L.bsel : KINDS[0], T = TW[k], can = gold >= T.cost[0] && cap[0] < cap[1];
      dt.innerHTML = `<div class="dt-h"><span class="fd-ic big" style="--rc:#8a6f35" data-ic="${k}" data-big="1"></span><div><b style="color:#e6c98a">${esc(T.name)}</b><em>${coin}${T.cost.join(' + ')} gold, ${DEF.invested(k, 3)} in all</em></div></div>
        <div class="rk3">${[1, 2, 3].map(r => `<div class="bd-pv" data-r="${r}" data-k="${k}"><i class="mini-holder"></i><em>${r === 1 ? 'Build' : 'Rank ' + r}</em><span>${coin}${T.cost[r - 1]}</span></div>`).join('')}</div>
        <div class="dt-s">${esc(BLURB[k])} Each rank changes how it works. A tower has its own health, and the hungry things will go for it.</div>${[0, 1, 2].map(i => `<div class="dt-r"><em>Rank ${i + 1}</em>${esc(T.text[i])}</div>`).join('')}
        <button class="fd-btn gold" data-build="${k}" ${can ? '' : 'disabled'}>${cap[0] >= cap[1] ? 'No room' : gold < T.cost[0] ? 'Needs ' + T.cost[0] + ' gold' : 'Place it'}</button>`;
      dt.querySelectorAll('.bd-pv').forEach(n => {
        const kk = n.dataset.k, r = +n.dataset.r; n.querySelector('.mini-holder').replaceWith(miniCanvas(kk, r, 74, 80));
        tip(n, () => `<b>${esc(TW[kk].name)}${r > 1 ? ', rank ' + r : ''}</b><em>${r === 1 ? 'Build' : 'Upgrade'} &middot; ${TW[kk].cost[r - 1]} gold</em>${esc(TW[kk].text[r - 1])}`);
      });
      dt.querySelector('button[data-build]').addEventListener('click', () => startPlacing(k));
    } else {
      const id = DEF.SOLDIER_UP[L.ssel] ? L.ssel : DEF.UP_IDS[0], U = DEF.SOLDIER_UP[id], r = sdu[DEF.UP_IDS.indexOf(id)], next = r < 3 ? U.cost[r] : 0, can = r < 3 && gold >= next;
      dt.innerHTML = `<div class="dt-h"><span class="fd-ic big" style="--rc:#8a6f35" data-ic="${id}" data-big="1"></span><div><b style="color:#e6c98a">${esc(U.name)}</b><em>${r} of 3 trained</em><span class="bd-pips">${[0, 1, 2].map(i => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</span></div></div>
        <div class="dt-s">Training reaches the squads that march after you buy it.</div>${[0, 1, 2].map(i => `<div class="dt-r" style="${i < r ? 'color:#9ed7a6' : ''}"><em>${['I', 'II', 'III'][i]}</em>${esc(U.text[i])}</div>`).join('')}
        ${r < 3 ? `<button class="fd-btn gold" data-sup="${id}" ${can ? '' : 'disabled'}>${can ? 'Train' : 'Needs ' + next + ' gold'}${can ? ' &middot; ' + next + ' gold' : ''}</button>` : '<div class="dt-f"><em class="ok">Fully trained</em></div>'}`;
      const b = dt.querySelector('button[data-sup]'); if (b) b.addEventListener('click', () => { K.send({ k: 'soldier', up: b.dataset.sup }); });
    }
    iconHolder(dt); dt.querySelectorAll('canvas[data-kind]').forEach(cv => paintMini(cv, S.T));
  }
  function renderBoard(force) {
    const p = document.getElementById('fd-build'); if (!p || !L.open) return;
    const P = (S && S.props) || {}, cap = P.tcap || [0, 6], sdu = P.sdu || [0, 0, 0], gold = myGold(), u = FUI(), coin = coinHtml();
    const sig = JSON.stringify([L.tab, gold, cap, sdu, sol.size]); if (!force && sig === L.sig) return; L.sig = sig;
    if (!L.bsel || !TW[L.bsel]) L.bsel = KINDS[0]; if (!L.ssel || !DEF.SOLDIER_UP[L.ssel]) L.ssel = DEF.UP_IDS[0];
    let shelf = '';
    if (L.tab === 't') {
      shelf = `<div class="sec">TOWERS <small>${cap[0]} of ${cap[1]} stand</small></div><div class="tiles tw">` + KINDS.map(k => { const T = TW[k]; return `<div class="tile${L.bsel === k ? ' sel' : ''}" data-hv="${k}"><span class="fd-ic" style="--rc:#8a6f35" data-ic="${k}"></span><div class="tw-i"><b>${esc(T.name)}</b><span>${esc(BLURB[k])}</span><span class="pc${gold < T.cost[0] ? ' no' : ''}">${coin}${T.cost[0]} <small>to build</small></span></div></div>`; }).join('')
        + '</div><div class="fd-note">Anyone may upgrade or mend any tower, and you pay from your own purse. Click a tower in the valley to look at it.</div>';
    } else {
      shelf = `<div class="sec">THE SQUADS <small>${sol.size} stand in the lanes now</small></div><div class="tiles sq">` + DEF.UP_IDS.map((id, i) => { const U = DEF.SOLDIER_UP[id], r = sdu[i]; return `<div class="tile${L.ssel === id ? ' sel' : ''}" data-hv="${id}"><span class="fd-ic" style="--rc:#8a6f35" data-ic="${id}"></span><div class="tw-i"><b>${esc(U.name)}</b><span>${esc(U.text[Math.min(2, r)])}</span></div><span class="bd-pips">${[0, 1, 2].map(j => `<i class="${j < r ? 'on' : ''}"></i>`).join('')}</span></div>`; }).join('')
        + '</div><div class="fd-note">' + squadNote() + '</div>';
    }
    p.innerHTML = `<div class="ph"><img class="hi" alt="" src="${u ? u.icons.hud('builder') : ''}"><div class="fd-title sm">BUILDER'S BOARD</div><div class="tabs"><button class="${L.tab === 't' ? 'on' : ''}" data-t="t">Towers</button><button class="${L.tab === 's' ? 'on' : ''}" data-t="s">Soldiers</button></div><div class="gd">${gold}${coin}</div><button class="x" id="fd-buildx">&times;</button></div><div class="shop"><div class="pb shelf">${shelf}</div><div class="dt" id="fd-bdet"></div></div>`;
    p.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { L.tab = b.dataset.t; L.sig = ''; renderBoard(true); }));
    p.querySelector('#fd-buildx').addEventListener('click', () => setOpen(false));
    iconHolder(p.querySelector('.shelf'));
    p.querySelectorAll('.shelf [data-hv]').forEach(n => n.addEventListener('mouseenter', () => {
      if (L.tab === 't') { if (L.bsel === n.dataset.hv) return; L.bsel = n.dataset.hv; } else { if (L.ssel === n.dataset.hv) return; L.ssel = n.dataset.hv; }
      p.querySelectorAll('.shelf .sel').forEach(e => e.classList.remove('sel')); n.classList.add('sel'); boardDetail(p, cap, sdu, gold);
    }));
    p.querySelectorAll('.shelf [data-hv]').forEach(n => n.addEventListener('click', () => { if (L.tab === 't') { L.bsel = n.dataset.hv; p.querySelectorAll('.shelf .sel').forEach(e => e.classList.remove('sel')); n.classList.add('sel'); boardDetail(p, cap, sdu, gold); } }));
    boardDetail(p, cap, sdu, gold);
    p.querySelectorAll('canvas[data-kind]').forEach(cv => paintMini(cv, S.T));
  }
  function renderTower() {
    const t = L.sel != null ? byId(L.sel) : null, p = mkPanel('fd-tpanel', 'fd-pn');
    if (!p) return; if (!t) { p.style.display = 'none'; return; }
    const gold = myGold(), me = K.me(), near = me && Math.hypot(me.x - t.x, me.y - t.y) <= TUNE.repairReach + TUNE.r;
    const P = (S && S.props) || {}, cap = P.tcap || [0, 99];
    const sig = JSON.stringify([t.id, t.rank, Math.round(t.hp / 4), t.rubble ? 1 : 0, gold, near ? 1 : 0, cap[0], t.flags & 16]);
    if (sig !== L.tsig) {
      L.tsig = sig; const T = TW[t.kind]; let h = '';
      if (t.rubble) {
        const c = t.inv;
        h = `<div class="tp-h"><b>${esc(T.name)}, fallen</b><button class="x">&times;</button></div><div class="tp-t">Rubble. A hero standing here can raise it again for half its price.</div><div class="tp-b"><button class="fd-btn buy" data-a="repair" ${near && gold >= c && cap[0] < cap[1] ? '' : 'disabled'}>Rebuild &middot; ${c}</button><button class="fd-btn buy" data-a="sell">Clear it</button></div>`;
      } else {
        const next = t.rank < 3 ? T.cost[t.rank] : 0, hurt = t.hp < t.max;
        h = `<div class="tp-h"><b>${esc(T.name)}</b><span class="tp-r">${[0, 1, 2].map(i => `<i class="${i < t.rank ? 'on' : ''}"></i>`).join('')}</span><button class="x">&times;</button></div>
          <div class="fd-bar"><i style="transform:scaleX(${clamp(t.hp / t.max, 0, 1).toFixed(3)});background:${t.hp / t.max > 0.5 ? '#4c9a55' : t.hp / t.max > 0.25 ? '#c98a3a' : '#c4513f'}"></i><span>${Math.round(t.hp)} / ${t.max}</span></div>
          <div class="tp-t">${esc(T.text[t.rank - 1])}</div>${t.rank < 3 ? `<div class="tp-n"><em>Rank ${t.rank + 1}</em> ${esc(T.text[t.rank])}</div>` : ''}
          <div class="tp-b">${t.rank < 3 ? `<button class="fd-btn buy" data-a="up" ${gold >= next ? '' : 'disabled'}>Upgrade &middot; ${next}</button>` : '<i class="own">Fully built</i>'}<button class="fd-btn buy" data-a="repair" ${hurt && near ? '' : 'disabled'}>${t.flags & 16 ? 'Mending' : 'Repair'}</button><button class="fd-btn buy" data-a="sell">Sell &middot; ${Math.floor(t.inv * TUNE.refund)}</button></div>`;
      }
      p.innerHTML = h;
      p.querySelector('.x').addEventListener('click', () => { L.sel = null; closeTp(); });
      p.querySelectorAll('button[data-a]').forEach(b => {
        const a = b.dataset.a; b.addEventListener('click', () => { if (a === 'up') K.send({ k: 'upTower', id: t.id }); else if (a === 'repair') K.send({ k: 'repair', id: t.id }); else if (a === 'sell') { K.send({ k: 'sellTower', id: t.id }); L.sel = null; closeTp(); } });
        if (a === 'repair') tip(b, () => t.rubble ? `<b>Rebuild</b>Stand beside the rubble. It costs half of what the tower cost.` : `<b>Repair</b>Stand beside it while nothing is hitting it or you. It mends over a few breaths for a little gold.`);
        if (a === 'sell') tip(b, () => `<b>Sell</b>${t.rubble ? 'Clears the rubble.' : 'Half of what was paid comes back to whoever paid it.'}`);
      });
    }
    p.style.display = '';
    const cam = S.cam, k = K.W() / (K.W()), sx = (t.x - cam.x) * cam.zoom + K.W() / 2, sy = (t.y - cam.y) * cam.zoom + K.H() / 2;
    const w = p.offsetWidth || 230, hh = p.offsetHeight || 150;
    p.style.left = clamp(sx + 40, 8, K.W() - w - 8) + 'px'; p.style.top = clamp(sy - hh / 2 - 20, 60, K.H() - hh - 150) + 'px';
  }

  // ============================================================ the Builder's board in the camp
  function drawBoard(c, tm) {
    const b = boardPos(), near = L.hoverBoard;
    c.save(); c.translate(b[0], b[1]);
    K.ell(c, 0, 4, 34, 10, 0, 'rgba(0,0,0,.32)');
    limb(c, -24, 4, -22, -50, 5.5, '#6a4a2e', '#8a6340'); limb(c, 24, 4, 22, -50, 5.5, '#6a4a2e', '#8a6340');
    poly(c, [[-31, -54], [31, -54], [29, -14], [-29, -14]], vgrad(c, -54, -14, '#b08a58', '#7c5a34'), OUT, 1.8);
    for (let i = 1; i < 4; i++) { c.strokeStyle = 'rgba(40,24,12,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-30 + i * 15, -53); c.lineTo(-28 + i * 14.5, -15); c.stroke(); }
    poly(c, [[-26, -49], [-8, -49], [-8, -31], [-26, -31]], '#e8dcc0', OUT, 1); poly(c, [[-2, -49], [24, -49], [24, -38], [-2, -38]], '#d8caa8', OUT, 1);
    poly(c, [[-2, -34], [24, -34], [24, -20], [-2, -20]], '#e2d4b4', OUT, 1);
    c.strokeStyle = '#4a3420'; c.lineWidth = 1.1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-24, -45 + i * 5); c.lineTo(-11, -45 + i * 5); c.stroke(); } c.beginPath(); c.moveTo(1, -45); c.lineTo(21, -45); c.moveTo(1, -41.5); c.lineTo(18, -41.5); c.moveTo(1, -30); c.lineTo(21, -30); c.moveTo(1, -26); c.lineTo(15, -26); c.stroke();
    // a tower drawn small on the plan, a pinned corner, a hammer hung on a nail
    c.strokeStyle = '#7a1e12'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-17, -33); c.lineTo(-17, -42); c.lineTo(-13, -42); c.lineTo(-13, -33); c.stroke();
    K.ell(c, -26, -49, 2, 2, 0, '#b23a24', OUT, 0.8); K.ell(c, 24, -49, 2, 2, 0, '#b23a24', OUT, 0.8);
    limb(c, 30, -40, 40, -34, 2.6, '#5c4128'); limb(c, 38, -38, 43, -30, 4, '#6a6e78');
    if (near) K.glowAt(c, 0, -34, 60, '255,230,160', 0.35 + 0.1 * Math.sin(tm * 4));
    c.restore();
  }

  // ============================================================ the layer
function frameUpdate(dt) {
    S = K.S; if (!S) return;
    if (S.phase !== 'live') { if (towers.size || sol.size || L.open) { towers.clear(); sol.clear(); L.sel = null; L.placing = null; if (L.open) setOpen(false); closeTp(); } return; }
    for (const s of sol.values()) { const k = 1 - Math.exp(-dt * 11); s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k; let d = s.tf - s.face; d = ((d % TAU) + TAU + PI) % TAU - PI; s.face += d * Math.min(1, dt * 10); if (s.flash > 0) s.flash -= dt; if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) > 200) { s.x = s.tx; s.y = s.ty; } }
    // hover and the panels
    const m = S.mouse, ht = L.placing ? null : towerAtPoint(m.wx, m.wy); L.hover = ht ? ht.id : null; L.hoverBoard = !L.placing && onBoard(m.wx, m.wy);
    L.prev += dt; if (L.open && L.prev > 0.15) { L.prev = 0; renderBoard(false); }
    if (L.open) { L.mini += dt; if (L.mini > 0.16) { L.mini = 0; const p = document.getElementById('fd-build'); if (p) p.querySelectorAll('canvas[data-kind]').forEach(cv => paintMini(cv, S.T)); } }
    if (L.sel != null) renderTower(); else if (L.tp) closeTp();
    // soldiers and towers add to the party's sight: merge them over the host's circles
    const P = S.props; if (P) {
      if (P.vis !== L.lastVis) L.baseVis = Array.isArray(P.vis) ? P.vis : [];
      const out = L.baseVis.slice(); for (const s of sol.values()) out.push([s.x, s.y, TUNE.sdSight]);
      P.vis = out; L.lastVis = out;
    }
}
function lightsOut(add) {
    for (const t of towers.values()) {
      if (t.rubble) continue;
      if (t.kind === 'brazier' && !(t.flags & 2)) add(t.x, t.y - 14, TW.brazier.light[t.rank - 1], 0.85);
      else if (t.kind === 'post' && t.rank >= 3) add(t.x, t.y - 40, 130, 0.5);
      else if (t.kind === 'bell' && t.rank >= 3) add(t.x, t.y - 36, 110, 0.35, true);
    }
    if (S && (+S.props.night || 0) > 0.2) for (const s of sol.values()) add(s.x, s.y - 8, 62, 0.35);
}
  Founding.addLayer({
    init(kit) {
      K = kit; S = kit.S;
      window.addEventListener('keydown', ev => {
        S = K.S; if (!S || S.phase !== 'live') return;
        if (ev.key === 'Shift') L.shift = true;
        if (ev.key !== 'Escape') return;
        if (L.placing) { cancelPlacing(); ev.preventDefault(); ev.stopImmediatePropagation(); }
        else if (L.open) { setOpen(false); ev.preventDefault(); ev.stopImmediatePropagation(); }
        else if (L.sel != null) { L.sel = null; closeTp(); ev.preventDefault(); ev.stopImmediatePropagation(); }
      }, true);
      window.addEventListener('keyup', ev => { if (ev.key === 'Shift') L.shift = false; }, true);
    },
    snap(m) { S = K.S; if (S) applySnap(m); },
    event(ev) { S = K.S; return onEvent(ev); },
    lights(add) { const now = performance.now(), dt = clamp((now - L.last) / 1000, 0, 0.1); L.last = now; frameUpdate(dt); lightsOut(add); },
    ground(c, inV) {
      for (const t of towers.values()) if (inV(t.x, t.y) && !t.rubble) { const sel = L.sel === t.id || L.hover === t.id; if (sel) { const r = rangeOf(t); K.ell(c, t.x, t.y, r, r * 0.92, 0, 'rgba(255,236,170,.05)', 'rgba(255,236,170,.4)', 1.4); } }
    },
    units(list, inV) {
      for (const t of towers.values()) if (inV(t.x, t.y)) list.push([t.y, 9, { draw(c) { drawTower(c, t, S.T); } }]);
      for (const s of sol.values()) if (inV(s.x, s.y) && K.visAt(s.x, s.y, 10)) list.push([s.y, 9, { draw(c) { drawSoldier(c, s, S.T); } }]);
      const b = boardPos(); if (inV(b[0], b[1])) list.push([b[1], 9, { draw(c) { drawBoard(c, S.T); } }]);
    },
    top(c) {
      const m = S.mouse;
      if (!S.tipTxt && !L.placing && !L.open) {
        if (L.hover != null) { const t = byId(L.hover); if (t) { const T = TW[t.kind]; S.tipTxt = t.rubble ? [T.name + ', fallen', 'Rubble. Click it, then stand beside it to raise it again for half the price.'] : [T.name + ', rank ' + t.rank + ' of 3', T.text[t.rank - 1] + ' Health ' + Math.round(t.hp) + ' of ' + t.max + '. Click it to upgrade, mend or sell.']; } }
        else if (L.hoverBoard) S.tipTxt = ["The Builder's board", 'Click it, or press ' + keyLabel() + ', to raise towers and train the squads that march out with each wave.'];
      }
      if (L.placing) {
        const kind = L.placing, x = m.wx, y = m.wy, why = ghostState(kind, x, y), ok = why === 0, T = TW[kind];
        const r = rangeOf({ kind, rank: 1 });
        K.ell(c, x, y, r, r * 0.92, 0, ok ? 'rgba(120,230,150,.05)' : 'rgba(230,100,80,.04)', ok ? 'rgba(150,240,170,.45)' : 'rgba(230,110,90,.4)', 1.4);
        K.ell(c, x, y, TUNE.r + 4, (TUNE.r + 4) * 0.5, 0, ok ? 'rgba(110,230,140,.35)' : 'rgba(230,90,70,.35)', ok ? '#8ef0a8' : '#ee7a62', 2);
        c.save(); c.globalAlpha = ok ? 0.62 : 0.4; if (!ok) c.filter = 'saturate(.3) sepia(1) hue-rotate(-30deg)'; try { drawTower(c, { id: 1, kind, rank: 1, x, y, hp: 1, max: 1, flags: 0, firedAt: -9, ringAt: -9, hitAt: -9, upAt: -9, bornAt: -9, aimA: -0.4, rubble: false, shield: 0 }, S.T); } catch (e) { /* ghost */ } c.restore();
        c.font = '11px system-ui'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.85)'; const lab = ok ? `${T.name}  ${T.cost[0]}` : ERR[why]; c.strokeText(lab, x, y + 34); c.fillStyle = ok ? '#e6c98a' : '#f0a090'; c.fillText(lab, x, y + 34);
      }
      if (L.sel != null) { const t = byId(L.sel); if (t) { K.ell(c, t.x, t.y, 30, 15, 0, null, 'rgba(255,236,170,.8)', 1.8); if (!t.rubble) { const r = rangeOf(t); K.ell(c, t.x, t.y, r, r * 0.92, 0, null, 'rgba(255,236,170,.28)', 1.2); } } }
    },
    mini(g, kx, ky) {
      for (const t of towers.values()) { const x = t.x * kx, y = t.y * ky; if (t.rubble) { g.strokeStyle = '#8a7a60'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y + 2); g.moveTo(x + 2, y - 2); g.lineTo(x - 2, y + 2); g.stroke(); continue; } g.fillStyle = KIND_COL[t.kind]; g.strokeStyle = '#000'; g.lineWidth = 1; g.fillRect(x - 2.5, y - 2.5, 5, 5); g.strokeRect(x - 2.5, y - 2.5, 5, 5); }
      for (const s of sol.values()) if (K.visAt(s.x, s.y, 10)) { g.fillStyle = '#e6d9a8'; g.fillRect(s.x * kx - 1, s.y * ky - 1, 2.2, 2.2); }
    },
    key(act, ev) {
      if (act !== 'fdBuild') return false;
      if (ev.repeat) return true;
      if (L.placing) cancelPlacing(); else setOpen(!L.open);
      return true;
    },
    click(wx, wy, button) {
      if (!S || S.phase !== 'live') return false;
      if (L.placing) {
        if (button === 2) { cancelPlacing(); return true; }
        if (button === 0) {
          const kind = L.placing, why = ghostState(kind, wx, wy);
          if (why) { K.say(ERR[why]); return true; }
          K.send({ k: 'build', kind, x: Math.round(wx), y: Math.round(wy) });
          if (!L.shift) cancelPlacing();
          return true;
        }
        return false;
      }
      if (button !== 0 || S.aim) return false;
      for (const u of S.units.values()) if (u.kind === 'e' && u.def && Math.hypot(u.x - wx, u.y - wy) < (u.def.r || 12) + 8 && u.fogT !== 0) return false;
      const t = towerAtPoint(wx, wy);
      if (t) { L.sel = t.id; L.tsig = ''; if (L.open) setOpen(false); K.snd('ui-open'); return true; }
      if (onBoard(wx, wy)) { setOpen(!L.open); return true; }
      if (L.sel != null) { L.sel = null; closeTp(); }
      return false;
    },
  });
  // tooltips on the board itself, drawn in the hover cursor
  window.addEventListener('mousemove', () => { if (!S || !K) return; const cv = document.querySelector('canvas'); if (cv && S.phase === 'live' && (L.hoverBoard || L.hover != null)) cv.style.cursor = 'pointer'; if (L.placing && cv) cv.style.cursor = 'crosshair'; }, true);
})();
