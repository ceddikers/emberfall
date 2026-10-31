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
  const towers = new Map(), sol = new Map(), fxT = new Map(), corpses = [], solGone = new Map();   // solGone: soldiers just gone from the snapshot, for their fall (events run a moment late)
  const SPIRE = DEF.SPIRE, spires = (DEF.SPIRES || []).map(d => ({ d, x: d.x, y: d.y, hitAt: -9, fireAt: -9, flags: 0, wk: 0, seen: false, seenT: 0, tl: null }));   // the Ash Spires (see sim-defence.js)
  const L = { last: performance.now(), down: false, over: null, placing: null, shift: false, sel: null, open: false, tab: 't', panel: null, sig: '', tsig: '', lastVis: null, baseVis: null, board: null, hover: null, msgT: 0, prev: 0, mini: 0 };
  const have = n => typeof Sound !== 'undefined' && Sound.has && Sound.has(n);
  const sfx = (...names) => { for (const n of names) if (have(n)) { K.snd(n); return; } };
  // the same, heard by how far (x, y) is from you (Founding sound by vicinity); a tower's or a soldier's sound is a place's, never the whole map's
  const sfxAt = (x, y, o, ...names) => { for (const n of names) if (have(n)) { K.sndAt(n, x, y, o); return; } };
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
  // Painted models at about hero scale (a little under, so heroes stay the focus). Every soldier is a few cached sprites per type x squad ranks
  // (armour, weapon, healing) x animation frame, drawn once at 2x and then blitted: a walk cycle, an attack/shot/heal, a bow draw, a gallop and
  // a charge. Only the lantern glow, the hit flash, the shadow, the health bar and the death fall are drawn live, so thirty soldiers cost almost nothing.
  const CRIM = '#a8301f', CRIM_D = '#64190f', CRIM_L = '#cf4a2e', GOLD = '#e6c98a', GOLD_D = '#a47a2c', GOLD_L = '#f7e2a6', LEATH = '#6b4a2c', LEATH_D = '#3e2a18', SKIN = '#d6b48a', SKIN_D = '#a8845e';
  const METAL = [['#a7adb6', '#4f545e', '#c9cfd8'], ['#bcc3cd', '#5a606c', '#e0e6ee'], ['#d2d8e2', '#667088', '#f2f6fc'], ['#d6dae4', '#7c6a3e', '#fff2c8']];   // by armour rank: iron, steel, bright steel, gilded
  const SQ = 2;   // sprite supersample
  const DIM = { foot: [76, 84, 38, 76], horse: [138, 98, 60, 86] };   // [w, h, origin x, origin y] of a sprite, the origin being the feet
  const FRAMES = { walk: 8, idle: 4, act: 6, draw: 6, chg: 6 };
  const CYC = { walk: 2.8, idle: 0.5, chg: 3.3 };   // cycles per second
  const sprites = new Map(), BUILD = { n: 0 };   // (BUILD.n: pictures made this frame)
  const SOLD_SC = 0.88;   // soldiers stand a little under the heroes (HS 1.25), so the heroes stay the focus
const sm = t => t * t * (3 - 2 * t);
  function kfi(A, k) { for (let i = 1; i < A.length; i++) if (k <= A[i][0]) { const a = A[i - 1], b = A[i], t = sm((k - a[0]) / (b[0] - a[0] || 1)); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * t); } return A[A.length - 1].slice(1); }
  function limb2(c, p, w, col, hi) {
    c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.strokeStyle = OUT; c.lineWidth = w + 2.2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
    if (hi) { c.strokeStyle = hi; c.lineWidth = Math.max(0.8, w * 0.26); c.stroke(); }
  }
  const mg = (c, x0, x1, ar) => hgrad(c, x0, x1, METAL[ar][0], METAL[ar][1], METAL[ar][2]);
  function ember(c, x, y, s, col, out) {
    c.beginPath(); c.moveTo(x, y - s * 1.35); c.quadraticCurveTo(x + s * 0.95, y - s * 0.2, x + s * 0.55, y + s * 0.55); c.quadraticCurveTo(x, y + s * 1.0, x - s * 0.55, y + s * 0.55); c.quadraticCurveTo(x - s * 0.95, y - s * 0.1, x, y - s * 1.35);
    c.fillStyle = col; c.fill(); if (out) { c.strokeStyle = out; c.lineWidth = 0.5; c.stroke(); }
  }
  function gait(an, k) {
    const g = { ph: k * TAU, sA: 0, sB: 0, lA: 0, lB: 0, bob: 0, sway: 0 };
    if (an === 'walk' || an === 'chg') { const s = Math.sin(g.ph), cs = Math.cos(g.ph); g.sA = s * 6.2; g.sB = -s * 6.2; g.lA = Math.max(0, cs) * 4.2; g.lB = Math.max(0, -cs) * 4.2; g.bob = Math.abs(cs) * 1.5; g.sway = s; }
    else if (an === 'idle') { g.sway = Math.sin(g.ph) * 0.7; g.bob = Math.sin(g.ph) * 0.35 + 0.35; }
    else { g.sA = 2.2; g.sB = -2.6; }
    return g;
  }
  // two legs: hip y, trouser colour, optional greaves (armour rank)
  function legs(c, g, hy, col, ar, greave, long) {
    [[-1, g.sB, g.lB], [1, g.sA, g.lA]].forEach(([sd, sx, lf]) => {
      const hx = sd * 1.9, fx = hx + sx * 0.9 + sd * 0.8, fy = -lf, kx = (hx + fx) / 2 + 1.5, ky = (hy + fy) / 2 - 0.2 - lf * 0.25;
      limb2(c, [hx, hy, kx, ky, fx, fy], 3.4, col);
      if (greave) limb2(c, [kx, ky, fx, fy - 0.5], 3.1, METAL[ar][0], METAL[ar][2]);
      if (greave && ar >= 1) K.ell(c, kx + 0.4, ky, 1.9, 1.5, 0, ar >= 3 ? GOLD : METAL[ar][2], OUT, 0.8);   // a knee cop
      K.ell(c, fx + 1.5, fy - 0.1, long ? 3.4 : 3, 1.7, 0, LEATH_D, OUT, 1);
    });
  }
  // a helm by armour rank: cap, sallet, great helm, gilded great helm. (x, y) is the head's middle.
  function helm(c, x, y, ar, sw) {
    const m = METAL[ar];
    if (ar === 0) {
      K.ell(c, x, y + 0.4, 3.9, 4.0, 0, SKIN, OUT, 1.1);
      c.fillStyle = hgrad(c, x - 4.3, x + 4.3, m[0], m[1], m[2]); c.beginPath(); c.arc(x, y - 0.4, 4.4, PI, TAU); c.lineTo(x + 4.9, y - 0.2); c.lineTo(x - 4.9, y - 0.2); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; c.stroke();
      c.fillStyle = m[1]; c.fillRect(x + 0.5, y - 0.3, 1.2, 3.4);   // the nasal bar
      c.fillStyle = '#1a1612'; c.fillRect(x - 2, y + 0.9, 1.3, 1.1); c.fillRect(x + 2.2, y + 0.9, 1.3, 1.1);
    } else if (ar === 1) {
      K.ell(c, x, y, 4.4, 4.5, 0, mg(c, x - 4.4, x + 4.4, 1), OUT, 1.2);
      c.fillStyle = '#14100c'; c.fillRect(x - 0.4, y - 0.8, 4.6, 1.3); c.strokeStyle = m[2]; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 3.8, y - 1.8); c.quadraticCurveTo(x, y - 3.2, x + 3.8, y - 1.8); c.stroke();
      c.strokeStyle = m[1]; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 0.6, y - 4.4); c.lineTo(x - 0.6, y - 6.4); c.stroke();   // a low comb
    } else {
      const top = y - 5.4, bot = y + 4.6;
      c.beginPath(); c.moveTo(x - 4.5, bot); c.lineTo(x - 4.5, y - 2); c.quadraticCurveTo(x - 4.5, top, x, top); c.quadraticCurveTo(x + 4.5, top, x + 4.5, y - 2); c.lineTo(x + 4.5, bot); c.closePath();
      c.fillStyle = mg(c, x - 4.5, x + 4.5, ar); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#14100c'; c.fillRect(x - 0.4, y - 0.9, 4.9, 1.2); c.fillRect(x + 1.6, y - 3.8, 1.1, 6.6);
      c.strokeStyle = ar >= 3 ? GOLD : m[2]; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - 4.3, y - 3.3); c.lineTo(x + 4.3, y - 3.3); c.moveTo(x - 4.3, y + 2.6); c.lineTo(x + 4.3, y + 2.6); c.stroke();
      const pl = ar >= 3 ? 1 : 0.8; c.beginPath(); c.moveTo(x - 0.4, top + 0.4); c.quadraticCurveTo(x - 5 - sw * 1.5, top - 3.4, x - 8.6 * pl - sw * 2.4, y - 2 + sw * 1.6); c.quadraticCurveTo(x - 5, top + 0.2, x + 0.8, top + 1.4); c.closePath();
      c.fillStyle = ar >= 3 ? CRIM_L : CRIM; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.9; c.stroke();
      if (ar >= 3) { c.strokeStyle = GOLD; c.lineWidth = 1.2; c.beginPath(); c.arc(x + 0.2, y - 2.4, 4.9, PI * 1.12, PI * 1.9); c.stroke(); }
    }
  }
  // the squad's standard: a pole on the bearer's back; the flag streams behind when marching and hangs when still. Better weapons, finer cloth.
  function banner(c, wp, g, walk) {
    const x0 = -7.8, top = -66;
    limb2(c, [x0, -4, x0, top], 1.7, '#7a5636');
    const W = 12.5 + wp * 2.4, H = 15 + wp * 2.2, drop = walk ? 0.16 : 0.85 + g.sway * 0.07, wav = walk ? 2 : 0.9, ax = Math.cos(drop), ay = Math.sin(drop), tp = [], bt = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6, wv = Math.sin(g.ph - t * 3.4) * wav * t, px = x0 - ax * W * t, py = top + 2 + ay * W * t + wv; tp.push([px, py]); bt.push([px + ay * H * (1 - 0.12 * t), py + ax * H * (1 - 0.12 * t)]); }
    const nm = [(tp[6][0] + bt[6][0]) / 2 + ax * 4.2, (tp[6][1] + bt[6][1]) / 2 - ay * 4.2], pts = tp.concat([nm]).concat(bt.slice().reverse());
    c.beginPath(); pts.forEach((p, i) => { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
    c.fillStyle = hgrad(c, x0 - W, x0, CRIM_D, CRIM_L, CRIM); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; c.lineJoin = 'round'; c.stroke();
    if (wp >= 1) { c.strokeStyle = wp >= 2 ? GOLD : GOLD_D; c.lineWidth = 1; c.beginPath(); tp.forEach((p, i) => { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke(); c.beginPath(); bt.forEach((p, i) => { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke(); }
    const ex = (tp[2][0] + bt[2][0]) / 2, ey = (tp[2][1] + bt[2][1]) / 2; ember(c, ex, ey, 2.6 + wp * 0.35, GOLD, OUT);
    if (wp >= 3) for (let i = 1; i < 6; i++) { c.strokeStyle = GOLD; c.lineWidth = 0.9; c.beginPath(); c.moveTo(bt[i][0], bt[i][1]); c.lineTo(bt[i][0] + ay * 2.2, bt[i][1] + ax * 2.2); c.stroke(); }
    K.ell(c, x0, top - 1.2, 1.9 + (wp >= 2 ? 0.5 : 0), 1.9 + (wp >= 2 ? 0.5 : 0), 0, wp >= 2 ? GOLD_L : '#8a909c', OUT, 1);
    if (wp >= 3) K.glowAt(c, x0, top - 1.2, 11, '255,225,150', 0.5);
  }

  // ---- the knight
  function paintKnight(c, o) {
    const { ar, wp, ban, an, k } = o, g = gait(an, k), b = g.bob, m = METAL[ar], act = an === 'act', walk = an === 'walk';
    let lean = 0, th = -1.05 + (walk ? Math.sin(g.ph) * 0.07 : g.sway * 0.04), hx = 7.6, hy = -21 - b * 0.6, thPrev = th;
    const SW = [[0, -1.05, 7.6, -21], [0.22, -2.2, 6.4, -32.5], [0.5, 0.15, 10.8, -23.5], [0.76, 0.75, 9.8, -19], [1, -1.05, 7.6, -21]];
    if (act) { const v = kfi(SW, k); th = v[0]; hx = v[1]; hy = v[2]; thPrev = kfi(SW, Math.max(0, k - 0.1))[0]; lean = kfi([[0, 0], [0.22, -1.2], [0.5, 2.4], [0.76, 1.6], [1, 0]], k)[0]; }
    const sway = g.sway * 1.4 + (walk ? 0.8 : 0);
    if (ban) banner(c, wp, g, walk);
    if (ar >= 3) { c.beginPath(); c.moveTo(-3.4, -28.6 - b); c.lineTo(3, -28.6 - b); c.quadraticCurveTo(1 - sway * 1.2, -18, -6 - sway * 2.4 - (walk ? 3 : 0), -8.5); c.lineTo(-12 - sway * 2.2 - (walk ? 3 : 0), -9.5); c.quadraticCurveTo(-7, -19, -5.4, -28.6 - b); c.closePath(); c.fillStyle = hgrad(c, -13, 3, CRIM_D, CRIM, CRIM_L); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; c.stroke(); }   // the cloak
    legs(c, g, -15.5 - b, ar === 0 ? '#4a3a2c' : '#33291f', ar, ar >= 1, false);
    // body: a gambeson, then plate
    const T = [[-4.2, -15.5 - b], [-5.5 + lean, -28 - b], [-3.5 + lean, -29.8 - b], [3.5 + lean, -29.8 - b], [5.5 + lean, -28 - b], [4.2, -15.5 - b]];
    poly(c, T, ar === 0 ? hgrad(c, -5.5, 5.5, '#8c6a46', '#4a3320', '#a58056') : mg(c, -5.5, 5.5, ar), OUT, 1.2);
    if (ar === 0) { c.strokeStyle = 'rgba(40,26,14,.5)'; c.lineWidth = 0.7; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-4.6 + lean * 0.5, -26 + i * 3.6 - b); c.lineTo(4.6 + lean * 0.5, -26 + i * 3.6 - b); c.stroke(); } }
    const tb = lean * 0.6;
    poly(c, [[-3.3 + tb, -28 - b], [3.3 + tb, -28 - b], [4 + sway * 0.7, -7.4], [-4 + sway * 0.7, -7.4]], hgrad(c, -4, 4, CRIM_D, CRIM_L, CRIM), OUT, 1);   // the tabard
    if (ar >= 1) { c.strokeStyle = ar >= 2 ? GOLD : GOLD_D; c.lineWidth = 1; c.beginPath(); c.moveTo(-4 + sway * 0.7, -7.9); c.lineTo(4 + sway * 0.7, -7.9); c.stroke(); }
    ember(c, tb + sway * 0.2, -19.5 - b * 0.5, 2.2, ar >= 1 ? GOLD : '#d9a24a', OUT);
    c.fillStyle = LEATH_D; c.fillRect(-4.6, -16.8 - b, 9.2, 2.1); if (ar >= 1) { c.fillStyle = GOLD; c.fillRect(-1, -17 - b, 2.2, 2.5); }
    if (ar >= 1) { const rr = ar === 1 ? [2.8, 2] : [3.7, 2.7]; [-1, 1].forEach(sd => { K.ell(c, sd * 5.8 + lean, -28.2 - b, rr[0], rr[1], sd * 0.25, mg(c, sd * 5.8 - 3, sd * 5.8 + 3, ar), OUT, 1); if (ar >= 2) { c.strokeStyle = ar >= 3 ? GOLD : m[2]; c.lineWidth = 0.8; c.beginPath(); c.ellipse(sd * 5.8 + lean, -28.2 - b, rr[0] - 0.7, rr[1] - 0.6, sd * 0.25, PI, TAU); c.stroke(); } }); }
    else { [-1, 1].forEach(sd => K.ell(c, sd * 5.4 + lean, -27.6 - b, 2.1, 1.7, 0, '#7a5a3a', OUT, 1)); }
    helm(c, 0.8 + lean, -34.2 - b + (act ? lean * 0.1 : 0), ar, sway * 0.5);
    // sword arm
    const sx = 5.4 + lean, sy = -27.6 - b;
    limb2(c, [sx, sy, (sx + hx) / 2 + 2, (sy + hy) / 2 + 1.5, hx, hy], 2.5, ar === 0 ? '#7a5a3a' : m[0], ar === 0 ? null : m[2]);
    K.ell(c, hx, hy, 1.6, 1.6, 0, ar === 0 ? SKIN : '#5a4430', OUT, 0.8);
    // the sword by weapon rank
    const bl = 11 + wp * 2.1, cx = Math.cos(th), cy = Math.sin(th), px = -cy, py = cx;
    if (act && th > thPrev + 0.02 && k > 0.2 && k < 0.85) { c.save(); c.strokeStyle = `rgba(255,245,215,${0.55})`; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.arc(hx, hy, bl * 0.82, thPrev - 0.9, th, false); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.stroke(); c.restore(); }
    const blade = ['#9aa0a8', '#c4cad4', '#e6ecf6', '#f6faff'][wp];
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 3.3 + (wp >= 2 ? 0.4 : 0); c.beginPath(); c.moveTo(hx + cx * 1.5, hy + cy * 1.5); c.lineTo(hx + cx * bl, hy + cy * bl); c.stroke();
    c.strokeStyle = blade; c.lineWidth = 1.7 + (wp >= 2 ? 0.4 : 0); c.stroke();
    if (wp >= 2) { c.strokeStyle = 'rgba(90,100,120,.6)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(hx + cx * 4, hy + cy * 4); c.lineTo(hx + cx * (bl - 2), hy + cy * (bl - 2)); c.stroke(); }
    if (wp >= 1) { c.strokeStyle = wp >= 2 ? GOLD : '#7a7f88'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hx + cx * 1.6 + px * 2.5, hy + cy * 1.6 + py * 2.5); c.lineTo(hx + cx * 1.6 - px * 2.5, hy + cy * 1.6 - py * 2.5); c.stroke(); }
    K.ell(c, hx - cx * 1.5, hy - cy * 1.5, 1.1, 1.1, 0, wp >= 2 ? GOLD : '#7a7f88', OUT, 0.7);
    if (wp >= 3) { K.glowAt(c, hx + cx * bl * 0.6, hy + cy * bl * 0.6, 12, '255,236,190', 0.45); c.strokeStyle = 'rgba(255,214,120,.85)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(hx + cx * 4, hy + cy * 4); c.lineTo(hx + cx * bl, hy + cy * bl); c.stroke(); }
    // shield on the other arm: round wood, a heater, steel-rimmed, gilded
    const shx = -6.6 + lean * 0.8, shy = -21 - b;
    limb2(c, [-5.4 + lean, sy, -7 + lean, -23 - b, shx + 1.5, shy + 1], 2.5, ar === 0 ? '#7a5a3a' : m[0]);
    if (ar === 0) {
      K.ell(c, shx, shy, 5.6, 5.8, 0, hgrad(c, shx - 5.6, shx + 5.6, '#a07040', '#5c3a1c', '#b88650'), OUT, 1.2); c.strokeStyle = '#5a5e66'; c.lineWidth = 1.1; c.beginPath(); c.arc(shx, shy, 4.6, 0, TAU); c.stroke();
      K.ell(c, shx, shy, 1.6, 1.6, 0, '#8a909c', OUT, 0.8); ember(c, shx, shy - 3, 1.1, '#d9a24a');
    } else {
      const w = ar === 1 ? 5.6 : 6.2, h = ar === 1 ? 13 : 14.5;
      c.beginPath(); c.moveTo(shx - w, shy - h * 0.5); c.lineTo(shx + w, shy - h * 0.5); c.lineTo(shx + w, shy + h * 0.05); c.quadraticCurveTo(shx + w * 0.8, shy + h * 0.38, shx, shy + h * 0.55); c.quadraticCurveTo(shx - w * 0.8, shy + h * 0.38, shx - w, shy + h * 0.05); c.closePath();
      c.fillStyle = hgrad(c, shx - w, shx + w, CRIM_D, CRIM_L, CRIM); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
      c.strokeStyle = ar >= 3 ? GOLD : m[2]; c.lineWidth = 1.5; c.stroke();
      ember(c, shx, shy - 1.4, ar >= 2 ? 3 : 2.5, ar >= 3 ? GOLD_L : GOLD, OUT);
      if (ar >= 2) { K.ell(c, shx - w + 0.6, shy - h * 0.5 + 0.6, 0.9, 0.9, 0, GOLD, null); K.ell(c, shx + w - 0.6, shy - h * 0.5 + 0.6, 0.9, 0.9, 0, GOLD, null); }
    }
  }

  // ---- the archer
  function paintArcher(c, o) {
    const { ar, wp, an, k } = o, g = gait(an, k), b = g.bob, walk = an === 'walk', m = METAL[ar];
    let d = 0.18, ang = 0, gx = 10.6, gy = -26.5 - b, arrow = true, flick = 0;
    if (an === 'draw') { d = 0.2 + k * 0.8; gy = -26.8 - b; } else if (an === 'act') { d = 0; arrow = false; flick = 1 - k; gx = 10.6 + Math.sin(k * 9) * 0.6 * (1 - k); }
    else if (walk) { ang = 0.4; gx = 8.8; gy = -19.5 - b; d = 0.1; }
    const jk = ['#6f8148', '#5c6e3c', '#4c5c30', '#3c4828'][ar], jkd = ['#41502a', '#344122', '#2c3820', '#232c18'][ar];
    legs(c, g, -15.5 - b, '#3c3226', ar, ar >= 2, false);
    // the quiver on the back
    c.save(); c.translate(-6.4, -22 - b); c.rotate(-0.28);
    [-2, 0, 1.6].forEach((x, i) => { c.strokeStyle = '#d8d0b8'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x, -6); c.lineTo(x - 0.3, -10 - i * 0.7); c.stroke(); c.fillStyle = i === 1 ? CRIM : '#efe8d4'; c.beginPath(); c.moveTo(x - 1.1, -9.4 - i * 0.7); c.lineTo(x + 0.2, -11.8 - i * 0.7); c.lineTo(x + 1.1, -9 - i * 0.7); c.closePath(); c.fill(); });
    poly(c, [[-2.8, -7], [2.8, -7], [2.4, 6], [-2.4, 6]], hgrad(c, -3, 3, '#7a5836', '#3e2a18', '#8c6842'), OUT, 1.1);
    c.fillStyle = ar >= 3 ? GOLD : '#2c1e10'; c.fillRect(-2.8, -7, 5.6, 1.4); c.fillRect(-2.5, 1, 5, 1);
    c.restore();
    // the draw arm, behind the chest
    const dhx = gx - 1.5 - d * 9.5, dhy = gy + 0.3;
    const torso = [[-4, -15.5 - b], [-4.8, -27.8 - b], [4.8, -27.8 - b], [4, -15.5 - b]];
    if (an === 'draw' || an === 'act') limb2(c, [-3.4, -26.5 - b, (-3.4 + dhx) / 2 - 1.2, (-26.5 - b + dhy) / 2 - 2.2, dhx, dhy], 2.3, jk);
    poly(c, torso, hgrad(c, -5, 5, jk, jkd, jk), OUT, 1.2);
    poly(c, [[-4.2, -15.8 - b], [4.2, -15.8 - b], [5.4, -9.4], [2.2, -10.4], [0, -8.6], [-2.4, -10.4], [-5.4, -9.4]], jkd, OUT, 1);
    c.strokeStyle = LEATH; c.lineWidth = 1.7; c.beginPath(); c.moveTo(-3.6, -27.4 - b); c.lineTo(4.2, -15.6 - b); c.stroke();
    if (ar >= 1) { c.fillStyle = '#c8ccd2'; for (let i = 0; i < 4; i++) c.fillRect(-2.6 + i * 1.4, -24 + i * 2.6 - b, 0.9, 0.9); }
    c.fillStyle = LEATH_D; c.fillRect(-4.4, -16.8 - b, 8.8, 2); c.fillStyle = ar >= 3 ? GOLD : '#a08050'; c.fillRect(-0.8, -17 - b, 2, 2.4);
    c.strokeStyle = CRIM; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-4.2, -17.4 - b); c.lineTo(4.4, -17.4 - b); c.stroke();   // the founders' sash
    c.lineWidth = 1.7; c.beginPath(); c.moveTo(3.2, -17 - b); c.quadraticCurveTo(5.2 + g.sway * 1.2, -13.5, 4.4 + g.sway * 1.6, -10.4); c.stroke();
    if (ar >= 2) { K.ell(c, -5.2, -27.6 - b, 3.1, 2.4, -0.2, mg(c, -8, -2, ar), OUT, 1); if (ar >= 3) { c.strokeStyle = GOLD; c.lineWidth = 0.9; c.beginPath(); c.ellipse(-5.2, -27.6 - b, 2.4, 1.8, -0.2, PI, TAU); c.stroke(); } }
    if (ar >= 3) { c.strokeStyle = GOLD; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-4.8, -27.8 - b); c.lineTo(4.8, -27.8 - b); c.stroke(); }
    // the hood
    const hxx = 0.7, hyy = -33.4 - b;
    K.ell(c, hxx - 0.9, hyy + 0.3, 5.1, 5.3, 0, hgrad(c, -5, 4, jkd, jk, jkd), OUT, 1.1);
    K.ell(c, hxx + 0.9, hyy + 0.8, 3.1, 3.3, 0, SKIN, OUT, 0.9);
    c.fillStyle = 'rgba(30,20,12,.5)'; c.beginPath(); c.ellipse(hxx + 0.9, hyy - 0.4, 3, 1.4, 0, PI, TAU); c.fill();
    c.fillStyle = '#1a1612'; c.fillRect(hxx + 0.4, hyy + 0.2, 1, 1); c.fillRect(hxx + 2.5, hyy + 0.2, 1, 1);
    c.beginPath(); c.arc(hxx, hyy - 0.2, 5.1, PI * 0.98, TAU * 0.995); c.lineTo(hxx + 4.2, hyy - 0.8); c.quadraticCurveTo(hxx + 1.5, hyy - 3.6, hxx - 2.4, hyy - 1); c.closePath(); c.fillStyle = hgrad(c, -5, 5, jk, jkd, jk); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; c.stroke();
    c.beginPath(); c.moveTo(hxx - 4.6, hyy + 0.6); c.quadraticCurveTo(hxx - 7.4, hyy + 1.4 + g.sway * 0.6, hxx - 9.4, hyy + 4.4 + g.sway); c.quadraticCurveTo(hxx - 6, hyy + 4.6, hxx - 3.8, hyy + 4.2); c.closePath(); c.fillStyle = jkd; c.fill(); c.stroke();   // the hood's tail
    if (ar >= 2) { c.strokeStyle = m[2]; c.lineWidth = 1; c.beginPath(); c.arc(hxx + 0.3, hyy - 0.3, 4.4, PI * 1.12, PI * 1.8); c.stroke(); }
    if (ar >= 3) { c.fillStyle = CRIM_L; c.beginPath(); c.moveTo(hxx - 1, hyy - 4.6); c.quadraticCurveTo(hxx - 3.4, hyy - 9.4, hxx - 6.6, hyy - 8.2); c.quadraticCurveTo(hxx - 4, hyy - 6.6, hxx - 1.2, hyy - 4.2); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke(); K.ell(c, 0, -28.2 - b, 1.1, 1.1, 0, GOLD, OUT, 0.7); }
    // the bow arm, then the longbow
    limb2(c, [4.6, -26.8 - b, (4.6 + gx) / 2 + 0.6, (-26.8 - b + gy) / 2 + 1.8, gx - 0.4, gy], 2.4, jk);
    c.save(); c.translate(gx, gy); c.rotate(ang);
    const half = 16 + wp * 0.5, belly = (wp >= 2 ? 9.4 : 8.2) - d * 2.2, tipx = -1.2 * d - (wp >= 2 ? 1.4 : 0), wood = ['#7a5636', '#8a6038', '#6a3e1e', '#5a3418'][wp];
    c.lineCap = 'round'; c.beginPath(); c.moveTo(tipx, -half); c.quadraticCurveTo(belly, 0, tipx, half); c.strokeStyle = OUT; c.lineWidth = 3.7; c.stroke(); c.strokeStyle = wood; c.lineWidth = 2.2; c.stroke();
    c.strokeStyle = 'rgba(255,230,180,.35)'; c.lineWidth = 0.7; c.stroke();
    if (wp >= 1) { c.fillStyle = '#2c1e10'; c.fillRect(belly * 0.5 - 1.2, -2.6, 2.4, 5.2); }
    if (wp >= 2) { K.ell(c, tipx, -half, 1.2, 1.2, 0, GOLD, OUT, 0.6); K.ell(c, tipx, half, 1.2, 1.2, 0, GOLD, OUT, 0.6); }
    const hx = -1.5 - d * 9.5 + (flick ? -flick * 1.5 : 0);
    c.strokeStyle = 'rgba(244,238,214,.9)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(tipx, -half); c.lineTo(arrow || an === 'act' ? hx : tipx + 0.8, 0.2); c.lineTo(tipx, half); c.stroke();
    if (arrow) {
      const ax1 = hx + 24; c.strokeStyle = '#e8dcc0'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, 0.1); c.lineTo(ax1, 0.1); c.stroke();
      c.fillStyle = wp >= 3 ? '#ffb040' : '#c4cad4'; c.beginPath(); c.moveTo(ax1 - 1, -1.7); c.lineTo(ax1 + 3.4, 0.1); c.lineTo(ax1 - 1, 1.9); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
      c.fillStyle = CRIM_L; c.beginPath(); c.moveTo(hx + 0.6, 0.1); c.lineTo(hx + 4, -1.6); c.lineTo(hx + 4, 1.8); c.closePath(); c.fill();
      if (wp >= 3) K.glowAt(c, ax1 - 1, 0.1, 4.5, '255,170,70', 0.7);
    }
    K.ell(c, hx, 0.3, 1.4, 1.4, 0, SKIN, OUT, 0.7);
    c.restore();
    K.ell(c, gx, gy, 1.5, 1.6, 0, SKIN, OUT, 0.7);
  }

  // ---- the cleric
  function paintCleric(c, o) {
    const { ar, hl, an, k } = o, g = gait(an, k), b = g.bob, walk = an === 'walk', act = an === 'act', m = METAL[ar];
    const rob = ['#ece3c8', '#f2ead2', '#f8f1dc', '#fffaea'][hl], robd = ['#b5aa8a', '#bdb292', '#c6bb9a', '#d6cba8'][hl], hem = walk ? g.sway * 1.3 : g.sway * 0.5;
    const e = act ? Math.sin(k * PI) : 0;
    // staff, planted; in the heal it lifts and tips toward the ally
    const sx = 8.4 + (act ? e * 1.5 : 0), sbot = act ? -2 - e * 7 : -1.5, stop = -45 - (act ? e * 5 : 0), tilt = act ? e * 5.5 : g.sway * 0.5, hy = act ? -24 - e * 3 : -15.5 - b;
    limb2(c, [sx, sbot, sx + tilt * 0.45, (sbot + stop) / 2, sx + tilt, stop], 1.9, '#7a5636');
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(sx + tilt, stop); c.quadraticCurveTo(sx + tilt + 3.2, stop - 3.4, sx + tilt + 6.2, stop + 0.6); c.stroke(); c.strokeStyle = hl >= 2 ? GOLD : '#8a6a3c'; c.lineWidth = 1.5; c.stroke();   // the hook
    const lsw = Math.sin(g.ph * (walk ? 1 : 1) + 1) * (walk ? 0.28 : 0.1) + (act ? 0.5 * e : 0), lax = sx + tilt + 6.2, lay = stop + 0.8, ls = 1 + hl * 0.1, lx = lax + Math.sin(lsw) * 5 * ls, ly = lay + 3.8 + Math.cos(lsw) * 4.2 * ls;
    // the robe, a bell to the ground; a stole in the founders' crimson
    const sw = hem * 1.4;
    c.beginPath(); c.moveTo(-3.6, -29.4 - b); c.quadraticCurveTo(-5.6, -17, -7.6 + sw, -1.6); c.quadraticCurveTo(-3 + sw, -0.2, 0, -1 + (walk ? Math.abs(g.sway) * 0.8 : 0)); c.quadraticCurveTo(3.4 + sw, -0.2, 7.6 + sw, -1.6); c.quadraticCurveTo(5.6, -17, 3.6, -29.4 - b); c.closePath();
    c.fillStyle = hgrad(c, -7.6, 7.6, robd, robd, rob); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.lineJoin = 'round'; c.stroke();
    c.strokeStyle = 'rgba(110,98,70,.35)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-2.4, -13); c.quadraticCurveTo(-3.6 + sw * 0.5, -7, -4.4 + sw, -2); c.moveTo(2.6, -13); c.quadraticCurveTo(3.8 + sw * 0.5, -7, 4.6 + sw, -2); c.stroke();
    if (walk) { K.ell(c, -2.4 + g.sA * 0.4, -0.4 - g.lA * 0.4, 2.3, 1.3, 0, LEATH_D, OUT, 0.9); K.ell(c, 2.6 + g.sB * 0.4, -0.4 - g.lB * 0.4, 2.3, 1.3, 0, LEATH_D, OUT, 0.9); }
    poly(c, [[-1.5, -29 - b], [1.5, -29 - b], [2 + sw * 0.4, -1.4], [-2 + sw * 0.4, -1.4]], hgrad(c, -2, 2, CRIM_D, CRIM_L, CRIM), OUT, 0.9);
    if (hl >= 1) { c.strokeStyle = GOLD; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-1.5, -28 - b); c.lineTo(-2 + sw * 0.4, -2); c.moveTo(1.5, -28 - b); c.lineTo(2 + sw * 0.4, -2); c.stroke(); ember(c, sw * 0.2, -6.4, 1.6 + (hl >= 2 ? 0.4 : 0), GOLD); c.strokeStyle = GOLD; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-7.4 + sw, -2.6); c.quadraticCurveTo(0, -0.9, 7.4 + sw, -2.6); c.stroke(); }
    c.fillStyle = GOLD_D; c.fillRect(-4.6, -17.6 - b, 9.2, 1.7); c.strokeStyle = GOLD; c.lineWidth = 0.9; c.beginPath(); c.moveTo(2.8, -16.2 - b); c.quadraticCurveTo(4.4 + sw * 0.5, -11, 3.6 + sw * 0.7, -8.6); c.stroke();
    // armour: a crimson mantle, then a steel gorget and pauldron, then a gilded mantle and cape
    if (ar >= 1) { c.beginPath(); c.moveTo(-6.4, -26.6 - b); c.quadraticCurveTo(0, -31.8 - b, 6.4, -26.6 - b); c.lineTo(5.4, -22.4 - b); c.quadraticCurveTo(0, -25.4 - b, -5.4, -22.4 - b); c.closePath(); c.fillStyle = hgrad(c, -6.4, 6.4, CRIM_D, CRIM_L, CRIM); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke(); if (ar >= 3) { c.strokeStyle = GOLD; c.lineWidth = 1; c.beginPath(); c.moveTo(-5.4, -22.4 - b); c.quadraticCurveTo(0, -25.4 - b, 5.4, -22.4 - b); c.stroke(); } }
    if (ar >= 2) { K.ell(c, 0, -28.6 - b, 3.6, 1.7, 0, mg(c, -3.6, 3.6, ar), OUT, 1); K.ell(c, -5.8, -27.4 - b, 3, 2.3, -0.3, mg(c, -8.8, -2.8, ar), OUT, 1); }
    // sleeves and hands: the staff hand, and the free hand (open, forward, when healing)
    const lhx = act ? 11 + e * 4 : -6.4, lhy = act ? -27 - e * 2 : -16.4 - b;
    limb2(c, [-4.4, -27 - b, act ? 4 : -6.6, act ? -29 : -22, lhx, lhy], 2.6, rob);
    K.ell(c, lhx, lhy, 1.6, 1.6, 0, SKIN, OUT, 0.8);
    limb2(c, [4.4, -27 - b, 7 + sx * 0.15, (-27 - b + hy) / 2 + 1, sx - 0.6, hy], 2.6, rob);
    K.ell(c, sx, hy, 1.7, 1.7, 0, SKIN, OUT, 0.8);
    // head: a cream cowl and a circlet
    const hxx = 0.6, hyy = -33.4 - b;
    if (hl >= 3) { c.strokeStyle = 'rgba(255,230,150,.7)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(hxx, hyy - 0.4, 7.4, 7.7, 0, 0, TAU); c.stroke(); K.glowAt(c, hxx, hyy, 12, '255,228,150', 0.35); }
    K.ell(c, hxx - 0.7, hyy + 0.4, 5, 5.3, 0, hgrad(c, -5, 4, robd, rob, robd), OUT, 1.1);
    K.ell(c, hxx + 0.9, hyy + 0.9, 3.1, 3.3, 0, SKIN, OUT, 0.9);
    c.fillStyle = '#1a1612'; c.fillRect(hxx + 0.2, hyy + 0.4, 1, 1); c.fillRect(hxx + 2.4, hyy + 0.4, 1, 1);
    c.beginPath(); c.arc(hxx, hyy - 0.2, 5, PI * 0.98, TAU * 0.995); c.lineTo(hxx + 4, hyy - 0.8); c.quadraticCurveTo(hxx + 1.5, hyy - 3.2, hxx - 2.4, hyy - 1); c.closePath(); c.fillStyle = hgrad(c, -5, 5, rob, robd, rob); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; c.stroke();
    if (hl >= 1) { c.strokeStyle = GOLD; c.lineWidth = 1.1; c.beginPath(); c.arc(hxx + 0.2, hyy - 0.4, 4.5, PI * 1.08, PI * 1.9); c.stroke(); if (hl >= 2) K.ell(c, hxx + 0.2, hyy - 4.7, 1.1, 1.1, 0, '#ff8a6a', OUT, 0.5); }
    // the lantern on the hook: glass and a bright core
    c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.moveTo(lax, lay); c.lineTo(lx, ly - 3.7 * ls - 2); c.stroke();
    const lw = 2.6 * ls + 0.4, lh = 3.7 * ls;
        poly(c, [[lx - lw * 0.6, ly - lh], [lx + lw * 0.6, ly - lh], [lx + lw, ly - lh + 1.5], [lx + lw, ly + lh - 1.2], [lx - lw, ly + lh - 1.2], [lx - lw, ly - lh + 1.5]], hgrad(c, lx - lw, lx + lw, '#f6c25a', '#f3b040', '#fff6c8'), OUT, 1.1);
    c.strokeStyle = '#4a3418'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(lx, ly - lh); c.lineTo(lx, ly + lh - 1.2); c.stroke();
    poly(c, [[lx - lw - 0.5, ly - lh], [lx, ly - lh - 2.2], [lx + lw + 0.5, ly - lh]], hl >= 2 ? GOLD : '#8a6a3c', OUT, 0.9);
    poly(c, [[lx - lw, ly + lh - 1.2], [lx + lw, ly + lh - 1.2], [lx, ly + lh + 0.8]], hl >= 2 ? GOLD : '#8a6a3c', OUT, 0.8);
    K.ell(c, lx, ly, lw * 0.5, lh * 0.5, 0, '#ffffe6');
    if (hl >= 2) { c.strokeStyle = 'rgba(255,214,110,.9)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(lx, ly + lh + 0.8); c.lineTo(lx + 0.4, ly + lh + 3.6); c.stroke(); }
    return { x: lx, y: ly, r: 17 + hl * 4 + (act ? 9 * e : 0) };
  }

  // ---- the cavalry knight: a chestnut horse with barding by armour rank, a rider in plate, a lance
  function paintCavalry(c, o) {
    const { ar, wp, an, k } = o, chg = an === 'chg', gal = an === 'walk' || chg, act = an === 'act', ph = k * TAU, m = METAL[ar];
    const e = act ? Math.sin(k * PI) : 0, rise = gal ? Math.sin(ph * 2) * (chg ? 2.5 : 1.3) : an === 'idle' ? Math.sin(ph) * 0.35 + 0.3 : -e * 1;
    c.save(); if (act) { c.translate(-10, 0); c.rotate(-0.14 * e); c.translate(10, 0); }   // a rear on the thrust
    if (chg) { c.strokeStyle = 'rgba(230,210,170,.4)'; c.lineWidth = 1.3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-26 - i * 4, -10 - i * 6.5); c.lineTo(-37 - i * 6 - (k * 6) % 3, -10 - i * 6.5); c.stroke(); } }
    // legs: far pair darker, rotary gallop; white socks
    const OFF = [0, 0.75, 2.6, 3.35], LX = [-12.5, -9, 9.5, 12.5], amp = chg ? 8.5 : gal ? 6 : 0;
    for (const i of [0, 2, 1, 3]) {
      const hind = i < 2, a = Math.sin(ph + OFF[i]) * amp, lift = gal ? Math.max(0, Math.cos(ph + OFF[i])) * (chg ? 5.5 : 3.6) : (!hind && act ? e * 4 : 0), lx = LX[i];
      const hipx = lx, hipy = -16 - rise, fx = lx + a - (!hind && act ? e * 2 : 0), fy = -lift, mx = lx + a * 0.5 + (hind ? -2.6 : 2), my = -9 - lift * 0.55;
      const near = i === 1 || i === 3;
      limb2(c, [hipx, hipy, mx, my, fx, fy - 2], 2.9, near ? '#8c4e26' : '#6a3a1c');
      if (i === 1 || i === 2) limb2(c, [mx + (fx - mx) * 0.2, my + (fy - 2 - my) * 0.2, fx, fy - 2], 2.7, '#efe7d4');
      K.ell(c, fx + 0.6, fy - 0.4, 1.9, 1.3, 0, '#1e1812', OUT, 0.7);
    }
    // tail
    const tw = Math.sin(ph * (gal ? 1 : 0.5)) * (chg ? 4 : 2);
    c.lineCap = 'round'; c.beginPath(); c.moveTo(-15, -26 - rise); c.quadraticCurveTo(-24 - (chg ? 4 : 0), -25 - rise + tw * 0.4, -26 - (chg ? 6 : 0), -15 + tw - (chg ? 4 : 0)); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#2c180c'; c.lineWidth = 3.2; c.stroke();
    // body
    const bodyG = c.createLinearGradient(0, -31, 0, -13); bodyG.addColorStop(0, '#c07a3c'); bodyG.addColorStop(0.5, '#a05a28'); bodyG.addColorStop(1, '#6e3a1a');
    K.ell(c, -8, -22.5 - rise, 8.4, 8, 0, bodyG, OUT, 1.2); K.ell(c, 8.5, -23 - rise, 7.2, 8.4, 0, bodyG, OUT, 1.2); K.ell(c, 0, -21.5 - rise, 13.5, 6.6, 0, bodyG);
    // neck and head
    const P = chg ? [22, -37 - rise] : [19.5, -43 - rise], Mz = chg ? [32.4, -31.5 - rise] : [28.2, -35.4 - rise];
    poly(c, [[3.5, -27 - rise], [6.5, -34 - rise], [P[0] - 2.8, P[1] - 1.4], [P[0] + 2.6, P[1] + 3.6], [14.2, -21.4 - rise]], bodyG, OUT, 1.2);
    c.strokeStyle = '#2c180c'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(5.4, -33.4 - rise); c.quadraticCurveTo(10, -38 - rise, P[0] - 1.6, P[1] - 1.2); c.stroke();   // the mane
    const hc = [(P[0] + Mz[0]) / 2, (P[1] + Mz[1]) / 2], hr = Math.atan2(Mz[1] - P[1], Mz[0] - P[0]), hl2 = Math.hypot(Mz[0] - P[0], Mz[1] - P[1]) / 2 + 1.4;
    K.ell(c, hc[0], hc[1], hl2, 3, hr, bodyG, OUT, 1.1); K.ell(c, Mz[0] - 0.4, Mz[1] + 0.2, 2.5, 2.2, hr, '#5a3418', OUT, 0.9);
    c.strokeStyle = '#efe7d4'; c.lineWidth = 1; c.beginPath(); c.moveTo(P[0] + 0.5, P[1] - 0.2); c.lineTo(Mz[0] - 1.4, Mz[1] - 0.4); c.stroke();
    poly(c, [[P[0] - 1.8, P[1] - 1.2], [P[0] - 1, P[1] - 5.6], [P[0] + 1.4, P[1] - 1.4]], '#7a4222', OUT, 0.9);
    c.fillStyle = '#1a1612'; c.fillRect(P[0] + 1.6, P[1] + 0.6, 1.2, 1.2);
    // barding by armour rank
    if (ar >= 1) {
      c.beginPath(); c.moveTo(-14.6, -29 - rise); c.lineTo(8.4, -30 - rise); c.lineTo(10, -17 - rise); for (let i = 0; i < 5; i++) c.lineTo(7.4 - i * 4.6, -11 - rise + (i % 2) * 1.8); c.lineTo(-14.6, -17 - rise); c.closePath();
      c.fillStyle = hgrad(c, -15, 10, CRIM_D, CRIM_L, CRIM); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.lineJoin = 'round'; c.stroke();
      c.strokeStyle = ar >= 2 ? GOLD : GOLD_D; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-14.6, -17.8 - rise); for (let i = 0; i < 5; i++) c.lineTo(7.4 - i * 4.6, -11.6 - rise + (i % 2) * 1.8); c.stroke();
      ember(c, -3.4, -22.6 - rise, 3, ar >= 3 ? GOLD_L : GOLD, OUT);
    } else {
      poly(c, [[-5.6, -29 - rise], [5.4, -29.5 - rise], [6.4, -18 - rise], [-6.4, -18 - rise]], hgrad(c, -6, 6, CRIM_D, CRIM_L, CRIM), OUT, 1.1);
      c.strokeStyle = GOLD_D; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-6.2, -18.8 - rise); c.lineTo(6.2, -18.8 - rise); c.stroke();
    }
    if (ar >= 2) {
      K.ell(c, 11.2, -24 - rise, 3.4, 5.6, 0.1, mg(c, 8, 15, ar), OUT, 1.1);   // the peytral
      for (let i = 0; i < 4; i++) { const t = i / 3, nx = 5.2 + (P[0] - 7.2) * t * 0.9, ny = -33 - rise + (P[1] + rise + 33) * t * 0.9; K.ell(c, nx + 1.6, ny + 1.2, 2, 1.6, 0.6, mg(c, nx - 2, nx + 3, ar), OUT, 0.7); }   // the crinet
      poly(c, [[P[0] - 0.4, P[1] - 1.2], [Mz[0] - 2, Mz[1] - 2], [Mz[0] - 2, Mz[1] + 1.2], [P[0] + 2.6, P[1] + 3.2]], mg(c, P[0], Mz[0], ar), OUT, 0.9);   // the chamfron
      if (ar >= 3) { c.fillStyle = CRIM_L; c.beginPath(); c.moveTo(P[0] - 0.4, P[1] - 4.4); c.quadraticCurveTo(P[0] - 3.6, P[1] - 10.6 + Math.sin(ph) * (gal ? 1 : 0), P[0] - 7.4, P[1] - 7.6); c.quadraticCurveTo(P[0] - 3.6, P[1] - 6, P[0] + 0.8, P[1] - 3); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke(); }
    }
    // reins
    c.strokeStyle = LEATH_D; c.lineWidth = 0.9; c.beginPath(); c.moveTo(Mz[0] - 2.4, Mz[1] + 0.6); c.quadraticCurveTo(14, -32 - rise, 5.4, -34 - rise); c.stroke();
    K.ell(c, 0.5, -29.6 - rise, 5.4, 1.7, 0, LEATH, OUT, 0.9);   // the saddle
    // the rider
    const rl = chg ? 2.5 : 0;
    limb2(c, [-1, -31.4 - rise, 5.6, -26.8 - rise, 2.4, -19.4 - rise], 3, ar === 0 ? '#4a3a2c' : '#33291f');
    if (ar >= 1) limb2(c, [5.6, -26.8 - rise, 2.4, -19.4 - rise], 2.5, m[0]); K.ell(c, 3.2, -18.4 - rise, 2.6, 1.4, 0, LEATH_D, OUT, 0.8);
    const T = [[-3.8, -30 - rise], [-4.9 + rl * 0.3, -41 - rise], [-3.2 + rl * 0.3, -43 - rise], [3.2 + rl * 0.3, -43 - rise], [4.9 + rl * 0.3, -41 - rise], [3.8, -30 - rise]];
    poly(c, T, ar === 0 ? hgrad(c, -5, 5, '#8c6a46', '#4a3320', '#a58056') : mg(c, -5, 5, ar), OUT, 1.2);
    poly(c, [[-3.1, -41 - rise], [3.1, -41 - rise], [3.7, -29.6 - rise], [-3.7, -29.6 - rise]], hgrad(c, -4, 4, CRIM_D, CRIM_L, CRIM), OUT, 0.9); ember(c, 0.2, -36 - rise, 2, GOLD, OUT);
    if (ar >= 1) { const rr = ar === 1 ? [2.6, 1.9] : [3.4, 2.5]; [-1, 1].forEach(sd => K.ell(c, sd * 5 + rl * 0.3, -41.4 - rise, rr[0], rr[1], 0, mg(c, sd * 5 - 3, sd * 5 + 3, ar), OUT, 1)); }
    helm(c, 1.2 + rl * 0.4, -48.6 - rise, ar, Math.sin(ph) * (gal ? 1 : 0.3) - 0.5 - (chg ? 1 : 0));
    // the shield on the near arm, strapped across the chest
    const shx = -3.4, shy = -35.4 - rise;
    if (ar === 0) { K.ell(c, shx, shy, 4.8, 5, 0, hgrad(c, shx - 5, shx + 5, '#a07040', '#5c3a1c', '#b88650'), OUT, 1.1); K.ell(c, shx, shy, 1.4, 1.4, 0, '#8a909c', OUT, 0.7); }
    else { const w = 4.9, h = 11.5; c.beginPath(); c.moveTo(shx - w, shy - h * 0.5); c.lineTo(shx + w, shy - h * 0.5); c.lineTo(shx + w, shy); c.quadraticCurveTo(shx + w * 0.7, shy + h * 0.38, shx, shy + h * 0.55); c.quadraticCurveTo(shx - w * 0.7, shy + h * 0.38, shx - w, shy); c.closePath(); c.fillStyle = hgrad(c, shx - w, shx + w, CRIM_D, CRIM_L, CRIM); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = ar >= 3 ? GOLD : m[2]; c.lineWidth = 1.2; c.stroke(); ember(c, shx, shy - 1.2, 2.3, ar >= 3 ? GOLD_L : GOLD, OUT); }
    // the lance: raised when still, carried slanted at the march, couched at the charge, thrust on the blow. It never crosses the helm.
    const hand = [6.8 + rl * 0.4, -35 - rise], a = an === 'idle' ? -1.0 + Math.sin(ph) * 0.02 : chg ? 0.1 : act ? kfi([[0, -0.5], [0.25, -0.2], [0.55, 0.1], [1, -0.5]], k)[0] : -0.52 + Math.sin(ph * 2) * 0.03, push = act ? e * 7 : 0;
    limb2(c, [4.6, -40 - rise, 6.4, -38 - rise, hand[0], hand[1]], 2.6, m[0]); K.ell(c, hand[0], hand[1], 1.7, 1.7, 0, '#5a4430', OUT, 0.8);
    c.save(); c.translate(hand[0], hand[1]); c.rotate(a);
    const LF = 40 + wp * 1.4 + push;
    c.lineCap = 'round'; c.beginPath(); c.moveTo(-9, 0); c.lineTo(LF, 0); c.strokeStyle = OUT; c.lineWidth = 3.8; c.stroke(); c.strokeStyle = wp >= 3 ? '#e8d8b0' : '#8a6a42'; c.lineWidth = 2.1; c.stroke();
    if (wp >= 2) { c.strokeStyle = GOLD; c.lineWidth = 2.2; [4, 14, 24].forEach(x => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 1.1, 0); c.stroke(); }); }
    if (wp >= 1) { K.ell(c, 3.4, 0, 1.6, 4.2, 0, mg(c, 2, 5, Math.max(1, ar)), OUT, 0.9); }   // the vamplate
    const pw = Math.sin(ph * (gal ? 2 : 1)) * (gal ? 2.4 : 0.8), ps = LF - 6;
    c.beginPath(); c.moveTo(ps, -0.8); c.lineTo(ps - 15 - (chg ? 3 : 0), -3.2 + pw * 0.3); c.lineTo(ps - 12.4, -0.6 + pw); c.lineTo(ps - 15 - (chg ? 3 : 0), 3.2 + pw * 0.6 + 1); c.lineTo(ps, 1.4); c.closePath(); c.fillStyle = hgrad(c, ps - 16, ps, CRIM_L, CRIM_D, CRIM); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.9; c.stroke();
    if (wp >= 2) { c.strokeStyle = GOLD; c.lineWidth = 0.7; c.beginPath(); c.moveTo(ps, -0.8); c.lineTo(ps - 15 - (chg ? 3 : 0), -3.2 + pw * 0.3); c.stroke(); }
    poly(c, [[LF - 1, -1.7], [LF + 6.4, 0], [LF - 1, 1.7]], wp >= 3 ? '#f4f8ff' : wp >= 1 ? '#d4dae4' : '#a8aeb8', OUT, 0.9);
    if (wp >= 3) K.glowAt(c, LF + 3, 0, 12, '255,240,200', 0.5);
    c.restore(); c.restore();
  }

  // ---- sprites: one cached picture per (type, squad ranks, standard, animation frame)
  function frameOf(ti, an) { return ti === 3 && an === 'walk' ? 6 : FRAMES[an]; }
  function getSprite(ti, ur, ban, an, idx) {
    const key = ti + '|' + ur + '|' + ban + '|' + an + idx;
    let sp = sprites.get(key); if (sp) return sp;
        if (BUILD.n >= 5) {   // a frame builds only a few new pictures: a near frame of the same motion will do for now
      const n = frameOf(ti, an); for (let j = 1; j < n; j++) { const alt = sprites.get(ti + '|' + ur + '|' + ban + '|' + an + ((idx + j) % n)); if (alt) return alt; }
    }
    BUILD.n++;
    if (sprites.size > 700) sprites.clear();
    const o = { ar: ur & 3, wp: (ur >> 2) & 3, hl: (ur >> 4) & 3, ban, an, k: an === 'draw' || an === 'act' ? idx / 5 : idx / frameOf(ti, an) };
    const dm = ti === 3 ? DIM.horse : DIM.foot, fn = ti === 0 ? paintKnight : ti === 1 ? paintArcher : ti === 2 ? paintCleric : paintCavalry;
    const cv = document.createElement('canvas'); cv.width = dm[0] * SQ; cv.height = dm[1] * SQ;
    const c = cv.getContext('2d'); c.scale(SQ, SQ); c.translate(dm[2], dm[3]);
    const hot = fn(c, o) || null;
    sp = { cv, ox: dm[2], oy: dm[3], w: dm[0], h: dm[1], hot }; sprites.set(key, sp); return sp;
  }
  function whiteOf(sp) {
    if (sp.wh) return sp.wh;
    const cv = document.createElement('canvas'); cv.width = sp.cv.width; cv.height = sp.cv.height; const c = cv.getContext('2d');
    c.drawImage(sp.cv, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); return (sp.wh = cv);
  }
  // which animation and frame a soldier is in right now
  function pose(s, tm) {
    const ti = s.ti, ph = tm + s.id * 0.37;
    if (s.flash > 0) { const k = clamp(1 - s.flash / (s.fdur || 0.25), 0, 0.999); return ['act', Math.floor(k * FRAMES.act)]; }
    if (s.moving) { const an = ti === 3 && s.chg ? 'chg' : 'walk', n = frameOf(ti, an); return [an, Math.floor(((ph * CYC[an]) % 1) * n)]; }
    if (ti === 1 && tm - s.actAt < 2.6) return ['draw', Math.round(clamp((tm - s.actAt - 0.25) / 1.0, 0, 1) * 5)];
    return ['idle', Math.floor(((ph * CYC.idle) % 1) * FRAMES.idle)];
  }
  function drawSoldier(c, s, tm) {
    const dir = Math.cos(s.face) >= 0 ? 1 : -1, rider = s.ti === 3, [an, idx] = pose(s, tm), sp = getSprite(s.ti, s.ur, s.bear ? 1 : 0, an, idx);
    K.ell(c, s.x, s.y + 1, (rider ? 17 : 9.5) * SOLD_SC, (rider ? 4.6 : 3.6) * SOLD_SC, 0, 'rgba(0,0,0,.34)');
    c.save(); c.translate(s.x, s.y); c.scale(dir * SOLD_SC, SOLD_SC);
    c.drawImage(sp.cv, -sp.ox, -sp.oy, sp.w, sp.h);
    if (s.hit > 0) { c.globalAlpha = clamp(s.hit / 0.16, 0, 1) * 0.75; c.drawImage(whiteOf(sp), -sp.ox, -sp.oy, sp.w, sp.h); c.globalAlpha = 1; }
    if (sp.hot) K.glowAt(c, sp.hot.x, sp.hot.y, sp.hot.r * (1 + 0.1 * Math.sin(tm * 5 + s.id)), '255,226,150', 0.5 + 0.12 * Math.sin(tm * 4 + s.id) + (s.flash > 0 ? 0.25 : 0));
    c.restore();
    if (s.hp < 100) { const by = s.y - (rider ? 66 : 50) * SOLD_SC, w = 18; c.fillStyle = '#000a'; c.fillRect(s.x - w / 2 - 1, by - 1, w + 2, 4.4); c.fillStyle = s.hp > 50 ? '#6aa86a' : s.hp > 25 ? '#d9a050' : '#c4513f'; c.fillRect(s.x - w / 2, by, w * s.hp / 100, 2.4); }
  }
  // a fallen soldier: tipped backward off their feet and gone with a fade
  function drawCorpse(c, o) {
    const k = o.t / 0.85, e = 1 - Math.pow(1 - clamp(k, 0, 1), 3), rider = o.ti === 3, sp = getSprite(o.ti, o.ur, 0, 'idle', 0);
    K.ell(c, o.x, o.y + 1, (rider ? 17 : 9.5) * SOLD_SC * (1 + e * 0.5), (rider ? 4.6 : 3.6) * SOLD_SC * (1 + e * 0.3), 0, `rgba(0,0,0,${0.34 * (1 - clamp((o.t - 0.5) / 0.9, 0, 1))})`);
    c.save(); c.translate(o.x, o.y); c.scale(o.dir * SOLD_SC, SOLD_SC); c.globalAlpha = 1 - clamp((o.t - 0.55) / 0.5, 0, 1);
    c.translate(-e * 3, -Math.sin(clamp(k * 1.6, 0, 1) * PI) * 3); c.rotate(-(rider ? 0.55 : 1.45) * e); c.scale(1, 1 - (rider ? 0.3 : 0.12) * e);
    c.drawImage(sp.cv, -sp.ox, -sp.oy, sp.w, sp.h);
    if (o.t < 0.1) { c.globalAlpha *= (1 - o.t / 0.1) * 0.8; c.drawImage(whiteOf(sp), -sp.ox, -sp.oy, sp.w, sp.h); }
    c.restore();
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
    setTimeout(() => { try { if (S && K) { K.fxBlast(x1, y1, blast, '255,150,60', false); sfxAt(x1, y1, null, 'fd-fireball-hit', 'fd-erupt'); } } catch (e) { /* the run ended */ } }, dur * 1000);
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
    if (Array.isArray(m.sp)) for (let i = 0; i < m.sp.length && i < spires.length; i++) spires[i].flags = m.sp[i] | 0;
    if (Array.isArray(m.sd)) {
      const seen = new Set();
      for (const r of m.sd) {
        seen.add(r[0]); let s = sol.get(r[0]);
        if (!s) { s = { id: r[0], x: r[2], y: r[3], face: r[4] / 10, flash: 0, fdur: 0.25, hit: 0, actAt: -9, moving: false, hp: 100, ur: 0, ti: r[1], sq: r[7] + '@' + S.T.toFixed(2), bear: false }; sol.set(r[0], s); }
        s.ti = r[1]; s.tx = r[2]; s.ty = r[3]; s.tf = r[4] / 10; if (r[5] < s.hp - 0.5) s.hit = 0.16; s.hp = r[5]; s.moving = !!(r[6] & 2); s.ur = (r[6] >> 2) & 63; s.chg = !!(r[6] & 256); s.lane = r[7];
        if (r[6] & 1 && s.flash <= 0) { kick(s, s.ti === 2 ? 0.35 : 0.25); if ((s.ti === 0 || s.ti === 3) && K.visAt(s.x, s.y, 10)) K.sndAt('fd-soldier-swing', s.x, s.y, { minGap: 0.12 }); }
      }
      for (const [id, s] of sol) if (!seen.has(id)) { solGone.set(id, { s, at: S.T }); sol.delete(id); }
      for (const [id, g] of solGone) if (S.T - g.at > 2) solGone.delete(id);
      // the squad's first knight carries the standard (and when they fall, the next takes it up)
      const first = new Map(); for (const s of sol.values()) if (s.ti === 0 && !(first.get(s.sq) < s.id)) first.set(s.sq, s.id);
      for (const s of sol.values()) s.bear = s.ti === 0 && first.get(s.sq) === s.id;
    }
  }
  function kick(s, dur) { s.flash = dur; s.fdur = dur; s.actAt = S ? S.T : 0; }
  const byId = id => towers.get(id);
  const ERR = { 1: 'Not enough gold.', 2: 'The camp cannot hold more towers.', 3: 'The ground will not take it.', 4: 'Too far from your party.', 5: 'Stand closer to it.', 6: 'Nothing more to add.' };
  function onEvent(ev) {
    const tag = ev[0];
    if (tag.charCodeAt(0) === 116 && tag.charCodeAt(1) === 119) {   // tw*
      const t = byId(ev[1]);
      switch (tag) {
        case 'twb': { const kind = KINDS[ev[2]], x = ev[4], y = ev[5]; if (!t) { towers.set(ev[1], { id: ev[1], kind, rank: 1, x, y, max: TW[kind].hp[0], hp: TW[kind].hp[0] * 0.35, hpPrev: TW[kind].hp[0] * 0.35, flags: 2, bornAt: S.T, firedAt: -9, ringAt: -9, hitAt: -9, upAt: -9, aimA: PI / 2, inv: TW[kind].cost[0] }); } else t.bornAt = S.T; fxDust(x, y, 10); sfxAt(x, y, null, 'fd-post-plant', 'fd-setdown'); break; }
        case 'twu': if (t) { t.rank = ev[2]; t.upAt = S.T; t.bornAt = S.T - 9; K.burst(t.x, t.y - 30, 12, { color: '#ffe9a8', spd: 110, dur: 0.7, size: 2.2, kind: 'spark', vy: -30 }); K.fxRing(t.x, t.y, 10, 60, 0.5, '255,228,160', 2.5); sfxAt(t.x, t.y, null, 'fd-rankup'); } break;
        case 'twf': if (t) {
          const tx = ev[2], ty = ev[3], v = ev[4], a = Math.atan2(ty - t.y, tx - t.x); t.aimA = a; t.firedAt = S.T;
          if (v === 0 || v === 1) { const ox = t.x + Math.cos(a) * 10, oy = towerTop(t); fxArrow(ox, oy, tx, ty - 6, 0.12, '255,236,190', 1.6, 24); if (v === 1) fxArrow(tx, ty - 6, tx + Math.cos(a) * 90, ty - 6 + Math.sin(a) * 90, 0.12, '255,236,190', 1.2, 30); sfxAt(t.x, t.y, null, 'fd-arrow'); }
          else if (v === 2) { fxLob(t.x, towerTop(t) + 6, tx, ty, TW.brazier.lob || 0.38, TW.brazier.blast[t.rank - 1]); sfxAt(t.x, t.y, null, 'fd-fireball-cast', 'fd-fireball-hit'); }
          else if (v === 3) { fxBolt(t.x + Math.cos(a) * 24, t.y - 22 + Math.sin(a) * 10, tx, ty - 8); sfxAt(t.x, t.y, null, 'fd-ballista', 'fd-pierce', 'fd-arrow'); K.shake(1.5, 0.12); }
        } break;
        case 'twr': if (t) { t.ringAt = S.T; fxRingGold(t.x, t.y, ev[2]); sfxAt(t.x, t.y, null, 'fd-bell-ring', 'fd-sanctum'); } break;
        case 'twd': if (t) { t.hpPrev = 0; } fxDust(ev[2], ev[3], 18); K.burst(ev[2], ev[3] - 20, 10, { color: '#5c4128', spd: 140, dur: 0.8, size: 3.4, kind: 'dust', vy: -50, g: 160 }); K.shake(3, 0.25); sfxAt(ev[2], ev[3], { reach: 1.5 }, 'fd-tower-fall', 'fd-gate-break'); break;
        case 'twx': { const o = byId(ev[1]); if (o) { fxDust(ev[2], ev[3], 6); towers.delete(ev[1]); if (L.sel === ev[1]) L.sel = null; } break; }
        case 'tws': { K.burst(ev[2], ev[3] - 20, 8, { color: '#f0cf72', spd: 90, dur: 0.8, size: 2.4, kind: 'spark', vy: -50 }); K.ftxt(ev[2], ev[3] - 40, 'Sold', '#f0cf72', 11, 0.9); fxDust(ev[2], ev[3], 8); towers.delete(ev[1]); if (L.sel === ev[1]) L.sel = null; sfxAt(ev[2], ev[3], null, 'fd-sell'); break; }
        case 'twre': if (t) { t.bornAt = S.T; fxDust(t.x, t.y, 10); sfxAt(t.x, t.y, null, 'fd-post-plant', 'fd-setdown'); } break;
        case 'twno': if (ev[1] === S.myId) { K.say(ERR[ev[2]] || 'Cannot do that.'); } break;
      }
      return true;
    }
    if (tag.charCodeAt(0) === 115 && tag.charCodeAt(1) === 112) return onSpireEvent(ev);   // sp*: the Ash Spires
    if (tag.charCodeAt(0) === 115 && tag.charCodeAt(1) === 111) {   // so*
      switch (tag) {
        case 'sob': sfx('fd-march', 'fd-wave'); break;
        case 'sof': { const s = sol.get(ev[1]); if (s) { kick(s, 0.25); if (K.visAt(s.x, s.y, 10)) K.sndAt('fd-soldier-shot', s.x, s.y, { minGap: 0.12 }); fxArrow(s.x + (Math.cos(s.face) >= 0 ? 12 : -12), s.y - 24, ev[2], ev[3] - 6, 0.1, '255,236,190', 1.2, 14); } break; }
        case 'soh': { const s = sol.get(ev[1]); if (s) { kick(s, 0.35); if (K.visAt(s.x, s.y, 10)) K.sndAt('fd-soldier-heal', s.x, s.y, { minGap: 0.3 }); const x1 = ev[2], y1 = ev[3]; K.fxAdd({ dur: 0.45, draw(c) { const k = this.t / 0.45; K.glowAt(c, s.x + (x1 - s.x) * K.eo(k), s.y - 34 + (y1 - 12 - s.y + 34) * K.eo(k), 14, '255,240,170', 1 - k * 0.6); } }); K.burst(x1, y1 - 10, 4, { color: '#bff2c4', spd: 30, dur: 0.7, size: 2, kind: 'dot', vy: -36 }); } break; }
        case 'sod': { const s = sol.get(ev[1]) || (solGone.get(ev[1]) || {}).s; solGone.delete(ev[1]); if (s && corpses.length < 40) corpses.push({ ti: s.ti, ur: s.ur, x: s.x, y: s.y, dir: Math.cos(s.face) >= 0 ? 1 : -1, t: 0 }); K.burst(ev[2], ev[3] - 8, 6, { color: '#a89878', spd: 60, dur: 0.6, size: 3, kind: 'dust', vy: -20 }); sol.delete(ev[1]); break; }
        case 'soc': { const s = sol.get(ev[1]); if (s) kick(s, 0.25); K.burst(ev[2], ev[3] - 6, 9, { color: '#d9c9a0', spd: 140, dur: 0.45, size: 2.4, kind: 'spark' }); K.burst(ev[2], ev[3], 5, { color: '#a89878', spd: 70, dur: 0.6, size: 3, kind: 'dust', vy: -16 }); K.fxRing(ev[2], ev[3], 4, 34, 0.3, '240,225,190', 2); if (K.visAt(ev[2], ev[3], 10)) K.sndAt('fd-soldier-swing', ev[2], ev[3], { minGap: 0.1 }); break; }
        case 'sou': if (ev[1] === S.myId) sfx('fd-buy'); break;
      }
      return true;
    }
    return false;
  }

  // ============================================================ the Ash Spires
  // A crooked pillar of black ash and glowing cracks beside each lane's far end, where the ash pours out. Painted live (a few shapes), only once
  // the party has explored the ground it stands on. The host sends only a flag per spire (`sp`: 1 struck, 2 awake) and the spf / spi / sph events.
  const seedF = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const SP_H = 128;
  // has the party seen the ground the spire stands on (so it may show, and answer a hover)? Asked about twice a second, and once yes, always yes
  function spireSeen(sp) {
    if (S.inIntro) return false;   // (the opening film: the founders cross a pass with no spire in it yet)
    if (sp.seen) return true;
    if (!S.fogOn || !S.fog || !S.fog.exp) return true;   // (no fog now, as in the opening scene: shown, but not yet explored)
    if (S.T - sp.seenT < 0.5) return false;
    sp.seenT = S.T;
    if (K.visAt(sp.x, sp.y - 40, 50)) { sp.seen = true; return true; }
    try { const F = S.fog, k = F.w / K.M.W, d = F.exp.getContext('2d').getImageData(Math.max(0, Math.floor(sp.x * k)), Math.max(0, Math.floor(sp.y * k)), 1, 1).data; if (d[3] > 24) sp.seen = true; } catch (e) { sp.seen = true; }
    return sp.seen;
  }
  function spireAt(wx, wy) { for (const sp of spires) { const dx = Math.abs(wx - sp.x), dy = wy - sp.y; if (dx < 30 && dy > -SP_H - 6 && dy < 16 && spireSeen(sp)) return sp; } return null; }
  // the pool of ash round the foot: a dark stain, ash run out toward the lane, cooled shards, and a few cracks in the ground still glowing
  function drawSpireGround(c, sp, tm) {
    if (!sp.tl) { const q = K.M.LANES[sp.d.lane].path[SPIRE.at]; sp.tl = Math.atan2(q[1] - sp.y, q[0] - sp.x); }
    c.save(); c.translate(sp.x, sp.y);
    K.ell(c, 0, 2, 96, 40, 0, 'rgba(40,34,30,.42)'); K.ell(c, 0, 2, 66, 28, 0, 'rgba(22,18,16,.55)'); K.ell(c, 0, 3, 38, 16, 0, 'rgba(12,10,9,.6)');
    const ca = Math.cos(sp.tl), sa = Math.sin(sp.tl);   // ash run out toward the road, where the waves come from
    poly(c, [[ca * 20 - sa * 16, sa * 20 + ca * 16], [ca * 96 - sa * 40, sa * 96 + ca * 40], [ca * 128, sa * 128], [ca * 96 + sa * 40, sa * 96 - ca * 40], [ca * 20 + sa * 16, sa * 20 - ca * 16]], 'rgba(34,29,26,.34)');
    for (let i = 0; i < 12; i++) { const a = seedF(i + sp.d.lane * 31) * TAU, r = 38 + seedF(i * 3 + 5) * 62, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.42, z = 2.5 + seedF(i + 9) * 3.5; K.ell(c, x, y, z, z * 0.6, 0, i % 3 ? '#2b2624' : '#3a3330', OUT, 1); }
    const g = 0.28 + 0.16 * Math.sin(tm * 1.7 + sp.d.lane);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4 + seedF(i) * 0.5, r0 = 34, r1 = 58 + seedF(i + 40) * 26, mx = Math.cos(a + 0.12) * (r0 + r1) / 2, my = Math.sin(a + 0.12) * (r0 + r1) / 2 * 0.42;
      c.strokeStyle = `rgba(255,${100 + i * 8},30,${g})`; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.42); c.lineTo(mx, my); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.42); c.stroke();
    }
    c.restore();
  }
  function drawSpire(c, sp, tm) {
    const lane = sp.d.lane, pulse = 0.72 + 0.28 * Math.sin(tm * 2.1 + lane * 1.7), hit = clamp(1 - (tm - sp.hitAt) / 0.35, 0, 1), fire = clamp(1 - (tm - sp.fireAt) / 0.6, 0, 1);
    const heat = clamp((0.42 + 0.34 * sp.wk) * pulse + 0.5 * hit + 0.4 * fire, 0, 1.3);
    c.save(); c.translate(sp.x, sp.y);
    shadow(c, 44);
    K.glowAt(c, 3, -SP_H * 0.55, 90, '255,100,28', 0.1 + 0.16 * heat);
    // the heap it stands in, behind the pillar
    K.ell(c, 0, 2, 40, 13, 0, '#26211f', OUT, 1.4); K.ell(c, -6, -1, 30, 9, 0, '#322b28');
    // the pillar: crooked, leaning courses, and a broken crown
    const ys = [0, -16, -36, -54, -74, -94, -112, -130], cx = [0, -3, 3, -4, 5, -1, 6, 3], hw = [28, 26, 21, 23, 16, 14, 8, 1];
    const Lp = [], Rp = [];
    for (let i = 0; i < ys.length; i++) { Lp.push([cx[i] - hw[i] * (0.92 + 0.16 * seedF(i + lane * 7)), ys[i]]); Rp.push([cx[i] + hw[i] * (0.92 + 0.16 * seedF(i + 20 + lane * 7)), ys[i]]); }
    const body = Lp.concat(Rp.slice().reverse());
    poly(c, body, hgrad(c, -30, 30, '#4b4440', '#14110f', '#2c2724'), OUT, 2);
    // the shaded side
    poly(c, [[cx[0] + 6, 0], [cx[2] + 6, ys[2]], [cx[4] + 4, ys[4]], [cx[6] + 1, ys[6]], Rp[7], Rp[6], Rp[5], Rp[4], Rp[3], Rp[2], Rp[1], Rp[0]], 'rgba(0,0,0,.26)');
    // course joints and flaked edges
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.6; c.lineCap = 'round'; [2, 4].forEach(i => { c.beginPath(); c.moveTo(Lp[i][0] + 1, ys[i]); c.lineTo(cx[i] + 2, ys[i] + 3); c.lineTo(Rp[i][0] - 1, ys[i] - 1); c.stroke(); });
    c.strokeStyle = 'rgba(150,136,126,.3)'; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(Lp[i][0] + 3, ys[i] - 3); c.lineTo(Lp[i + 1][0] + 2.5, ys[i + 1] + 2); c.stroke(); }
    // the cracks, glowing from within
    const cracks = [[[-6, -4], [-10, -22], [-3, -36], [-9, -54], [-1, -68], [-4, -86], [2, -104], [3, -120]], [[9, -8], [12, -28], [6, -44], [12, -62], [8, -74]], [[-15, -30], [-10, -43], [-16, -56]], [[5, -72], [10, -86], [6, -98]]];
    for (const pts of cracks) for (const [col, lw, a] of [['255,80,18', 6, 0.2], ['255,138,40', 2.8, 0.85], ['255,232,170', 1, 0.95]]) {
      c.strokeStyle = `rgba(${col},${Math.min(1, a * heat)})`; c.lineWidth = lw; c.lineJoin = 'round'; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
    }
    if (hit > 0) { poly(c, body, `rgba(255,236,200,${0.3 * hit})`); K.glowAt(c, 0, -SP_H * 0.45, 70, '255,230,180', 0.4 * hit); }
    // front chips of black stone
    K.ell(c, -22, 4, 8, 4, 0, '#2e2826', OUT, 1.2); K.ell(c, 19, 6, 6, 3.2, 0, '#37302d', OUT, 1.2); K.ell(c, 4, 8, 4.4, 2.4, 0, '#26211f', OUT, 1);
    // the crown: a hot core, shards turning round it, ash rising
    const ty = -SP_H + 2;
    K.glowAt(c, 3, ty, 36 + 16 * heat + 18 * fire, '255,150,50', clamp(0.34 + 0.34 * heat + 0.3 * fire, 0, 1));
    K.ell(c, 3, ty, 3.4, 3.4, 0, `rgba(255,${Math.round(200 + 40 * fire)},130,${clamp(0.5 + heat * 0.5, 0, 1)})`);
    for (let i = 0; i < 3; i++) { const a = tm * 0.55 + i * 2.09 + lane, x = 3 + Math.cos(a) * 20, y = ty + 8 + Math.sin(a) * 6 - i * 5; if (Math.sin(a) < 0) continue; poly(c, [[x, y - 5], [x + 3, y], [x, y + 5], [x - 3, y]], '#1c1816', `rgba(255,${120 + i * 20},40,${0.5 + 0.4 * heat})`, 1.3); }
    for (let i = 0; i < 9; i++) {
      const k = (tm * (0.2 + (i % 3) * 0.05) + i / 9) % 1, px = 3 + Math.sin(tm * 0.9 + i * 2.7) * (6 + 9 * k) + k * 16, py = ty - 4 - k * 80;
      if (i % 3 === 0) { c.fillStyle = `rgba(255,${130 + (i * 11) % 70},50,${(1 - k) * 0.85})`; c.beginPath(); c.arc(px, py, 1.1 + (1 - k) * 0.7, 0, TAU); c.fill(); }
      else { c.fillStyle = `rgba(52,46,42,${(1 - k) * 0.55})`; c.beginPath(); c.arc(px, py, 1.6 + k * 4, 0, TAU); c.fill(); }
    }
    c.restore();
  }
  // a slow heavy bolt from the crown to a soldier (it follows him, and lands when the host says so)
  function fxSpireBolt(sp, id, tx, ty) {
    const x0 = sp.x + 3, y0 = sp.y - SP_H + 2, dur = SPIRE.travel;
    K.fxAdd({ dur: dur + 0.05, draw(c) {
      const t = sol.get(id), ex = t ? t.x : tx, ey = (t ? t.y : ty) - 14, k = Math.min(1, this.t / dur);
      const at = kk => [x0 + (ex - x0) * kk, y0 + (ey - y0) * kk - Math.sin(kk * PI) * 48];
      for (let j = 6; j >= 1; j--) { const p = at(Math.max(0, k - j * 0.04)); K.glowAt(c, p[0], p[1], 9 + (6 - j) * 1.6, '255,100,30', 0.2 + (6 - j) * 0.04); }
      const p = at(k); K.glowAt(c, p[0], p[1], 32, '255,120,30', 0.8); K.ell(c, p[0], p[1], 6.5, 6.5, 0, '#ff9a30', OUT, 1.2); K.ell(c, p[0] - 1, p[1] - 1, 3, 3, 0, '#fff0b8');
      if (Math.random() < 0.5) K.burst(p[0], p[1], 1, { color: '#ff9040', spd: 25, dur: 0.35, size: 2, kind: 'spark' });
    } });
  }
  function onSpireEvent(ev) {
    const sp = spires[ev[1]]; if (!sp) return true;
    switch (ev[0]) {
      case 'spf': {
        sp.fireAt = S.T; const t = sol.get(ev[2]);
        if (K.visAt(sp.x, sp.y - 60, 60) || K.visAt(ev[3], ev[4], 10) || (t && K.visAt(t.x, t.y, 10))) { fxSpireBolt(sp, ev[2], ev[3], ev[4]); K.sndAt('fd-spire-bolt', sp.x, sp.y - 60, { minGap: 0.2 }); }
        break;
      }
      case 'spi': if (K.visAt(ev[3], ev[4], 12)) {
        K.burst(ev[3], ev[4] - 10, 9, { color: '#ff9a40', spd: 130, dur: 0.5, size: 2.4, kind: 'spark' }); K.burst(ev[3], ev[4] - 4, 5, { color: '#4a423c', spd: 60, dur: 0.7, size: 3.4, kind: 'dust', vy: -26 });
        K.fxRing(ev[3], ev[4], 4, 38, 0.3, '255,170,90', 2); K.sndAt('fd-spire-hit', ev[3], ev[4], { minGap: 0.08 });
      } break;
      case 'sph': sp.hitAt = S.T; if (spireSeen(sp) && K.visAt(sp.x, sp.y - 40, 50)) K.burst(sp.x + (Math.random() - 0.5) * 24, sp.y - 24 - Math.random() * 30, 4, { color: '#ffb060', spd: 80, dur: 0.4, size: 2, kind: 'spark' }); break;
    }
    return true;
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
  function startPlacing(kind) { L.placing = kind; if (S) S.placing = kind; L.sel = null; closeTp(); setOpen(false); K.snd('ui-open'); }
  function cancelPlacing() { L.placing = null; if (S) S.placing = null; }
  function towerAtPoint(wx, wy) {
    let best = null, bd = 1e9;
    for (const t of towers.values()) {
      const h = t.rubble ? 12 : HEIGHT[t.kind][t.rank - 1] + 14, dx = Math.abs(wx - t.x), dy = wy - t.y;
      if (dx < 24 && dy > -h && dy < 18) { const d = Math.hypot(wx - t.x, (wy - t.y + h / 2) * 0.5); if (d < bd) { bd = d; best = t; } }
    }
    return best;
  }
  function boardPos() { return L.board || (L.board = DEF.boardAt || [3400, 3612]); }
  function onBoard(wx, wy) { const b = boardPos(); return wx > b[0] - 34 && wx < b[0] + 34 && wy > b[1] - 62 && wy < b[1] + 10; }

  // ============================================================ DOM: the board and the tower panel
  function rootEl() { return document.getElementById('fd-root'); }
  function mkPanel(id, cls) { let e = document.getElementById(id); if (!e) { const r = rootEl(); if (!r) return null; e = document.createElement('div'); e.id = id; e.className = cls; e.style.display = 'none'; r.appendChild(e); e.addEventListener('contextmenu', ev => ev.preventDefault()); e.addEventListener('mousedown', ev => { ev.stopPropagation(); L.down = true; });
    e.addEventListener('mouseenter', () => { L.over = id; }); e.addEventListener('mouseleave', () => { if (L.over === id) L.over = null; }); } return e; }
  function setOpen(on) {
    L.open = on;
    const p = mkPanel('fd-build', 'fd-panel fd-pn'); if (!p) return;
    p.style.display = on ? '' : 'none'; if (on) { L.sig = ''; renderBoard(true); K.snd('ui-open'); closeTp(); L.sel = null; } else if (typeof Tip !== 'undefined' && Tip.hide) Tip.hide();
  }
  function closeTp() { const p = document.getElementById('fd-tpanel'); if (p && p.style.display !== 'none') p.style.display = 'none'; L.tsig = ''; if (L.over === 'fd-tpanel') L.over = null; }
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
    const sig = JSON.stringify([L.tab, gold, cap, sdu, sol.size]); if (!force && (sig === L.sig || L.down)) return; L.sig = sig;
    if (!L.bsel || !TW[L.bsel]) L.bsel = KINDS[0]; if (!L.ssel || !DEF.SOLDIER_UP[L.ssel]) L.ssel = DEF.UP_IDS[0];
    let shelf = '';
    if (L.tab === 't') {
      shelf = `<div class="sec">TOWERS <small>${cap[0]} of ${cap[1]} stand</small></div><div class="tiles tw">` + KINDS.map(k => { const T = TW[k]; return `<div class="tile${L.bsel === k ? ' sel' : ''}" data-hv="${k}"><span class="fd-ic" style="--rc:#8a6f35" data-ic="${k}"></span><div class="tw-i"><b>${esc(T.name)}</b><span>${esc(BLURB[k])}</span><span class="pc${gold < T.cost[0] ? ' no' : ''}">${coin}${T.cost[0]} <small>to build</small></span></div></div>`; }).join('')
        + '</div><div class="fd-note">Anyone may upgrade or mend any tower, and you pay from your own purse. Click a tower in the valley to look at it.</div>';
    } else {
      shelf = `<div class="sec">THE SQUADS <small>${sol.size} stand in the lanes now</small></div><div class="tiles sq">` + DEF.UP_IDS.map((id, i) => { const U = DEF.SOLDIER_UP[id], r = sdu[i]; return `<div class="tile${L.ssel === id ? ' sel' : ''}" data-hv="${id}"><span class="fd-ic" style="--rc:#8a6f35" data-ic="${id}"></span><div class="tw-i"><b>${esc(U.name)}</b><span>${esc(U.text[Math.min(2, r)])}</span></div><span class="bd-pips">${[0, 1, 2].map(j => `<i class="${j < r ? 'on' : ''}"></i>`).join('')}</span></div>`; }).join('')
        + '</div><div class="fd-note">' + squadNote() + '</div>';
    }
    p.innerHTML = `<div class="ph"><img class="hi" alt="" src="${u ? u.icons.hud('builder') : ''}"><div class="fd-title sm">BUILDER'S BOARD</div><div class="tabs"><button class="${L.tab === 't' ? 'on' : ''}" data-t="t">Towers</button><button class="${L.tab === 's' ? 'on' : ''}" data-t="s">Soldiers</button></div><div class="gd">${gold}${coin}</div><button class="x" id="fd-buildx">&times;</button></div><div class="shop"><div class="pbody shelf">${shelf}</div><div class="dt" id="fd-bdet"></div></div>`;
    p.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { L.tab = b.dataset.t; L.sig = ''; renderBoard(true); }));
    p.querySelector('#fd-buildx').addEventListener('click', () => setOpen(false));
    iconHolder(p.querySelector('.shelf'));
    p.querySelectorAll('.shelf [data-hv]').forEach(n => n.addEventListener('click', () => {   // (a click picks; pointing at a tile changes nothing)
      if (L.tab === 't') { if (L.bsel === n.dataset.hv) return; L.bsel = n.dataset.hv; } else { if (L.ssel === n.dataset.hv) return; L.ssel = n.dataset.hv; }
      p.querySelectorAll('.shelf .sel').forEach(e => e.classList.remove('sel')); n.classList.add('sel'); boardDetail(p, cap, sdu, gold); K.snd('ui-click');
    }));
    boardDetail(p, cap, sdu, gold);
    p.querySelectorAll('canvas[data-kind]').forEach(cv => paintMini(cv, S.T));
  }
  function renderTower() {
    const t = L.sel != null ? byId(L.sel) : null, p = mkPanel('fd-tpanel', 'fd-pn');
    if (!p) return; if (!t) { p.style.display = 'none'; return; }
    const gold = myGold(), me = K.me(), near = me && Math.hypot(me.x - t.x, me.y - t.y) <= TUNE.repairReach + TUNE.r;
    const P = (S && S.props) || {}, cap = P.tcap || [0, 99];
    const sig = JSON.stringify([t.id, t.rank, Math.round(t.hp / 4), t.rubble ? 1 : 0, gold, near ? 1 : 0, cap[0], t.flags & 16]);
    if (sig !== L.tsig && !L.down) {
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
      p.querySelector('.x').addEventListener('mousedown', ev => { if (ev.button === 0) { L.sel = null; L.down = false; L.over = null; closeTp(); K.snd('ui-close'); } });
      p.querySelectorAll('button[data-a]').forEach(b => {
        const a = b.dataset.a; b.addEventListener('click', () => { if (a === 'up') K.send({ k: 'upTower', id: t.id }); else if (a === 'repair') K.send({ k: 'repair', id: t.id }); else if (a === 'sell') { K.send({ k: 'sellTower', id: t.id }); L.sel = null; closeTp(); } });
        if (a === 'repair') tip(b, () => t.rubble ? `<b>Rebuild</b>Stand beside the rubble. It costs half of what the tower cost.` : `<b>Repair</b>Stand beside it while nothing is hitting it or you. It mends over a few breaths for a little gold.`);
        if (a === 'sell') tip(b, () => `<b>Sell</b>${t.rubble ? 'Clears the rubble.' : 'Half of what was paid comes back to whoever paid it.'}`);
      });
    }
    // it sits beside its tower and goes with it; once the tower is off the screen the panel closes rather than cling to the edge.
    // While the pointer is on the panel it holds still, so a button is never pulled from under a click.
    const cam = S.cam, sx = (t.x - cam.x) * cam.zoom + K.W() / 2, sy = (t.y - cam.y) * cam.zoom + K.H() / 2;
    if ((sx < -30 || sx > K.W() + 30 || sy < -30 || sy > K.H() + 30) && L.over !== 'fd-tpanel') { L.sel = null; closeTp(); return; }
    p.style.display = '';
    if (L.over === 'fd-tpanel' && p.style.left) return;
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
    if (S.phase !== 'live') { for (const sp of spires) { sp.seen = false; sp.seenT = 0; sp.flags = 0; sp.wk = 0; sp.hitAt = sp.fireAt = -9; } if (towers.size || sol.size || L.open) { towers.clear(); sol.clear(); corpses.length = 0; L.sel = null; L.placing = null; if (L.open) setOpen(false); closeTp(); } return; }
    for (const s of sol.values()) { const k = 1 - Math.exp(-dt * 11); s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k; let d = s.tf - s.face; d = ((d % TAU) + TAU + PI) % TAU - PI; s.face += d * Math.min(1, dt * 10); if (s.flash > 0) s.flash -= dt; if (s.hit > 0) s.hit -= dt; if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) > 200) { s.x = s.tx; s.y = s.ty; } }
    for (const sp of spires) sp.wk += ((sp.flags & 2 ? 1 : 0) - sp.wk) * (1 - Math.exp(-dt * 3));
    BUILD.n = 0; for (let i = corpses.length - 1; i >= 0; i--) { corpses[i].t += dt; if (corpses[i].t > 1.2) corpses.splice(i, 1); }
    // hover and the panels
    const m = S.mouse, ht = L.placing ? null : towerAtPoint(m.wx, m.wy); L.hover = ht ? ht.id : null; L.hoverBoard = !L.placing && onBoard(m.wx, m.wy);
    L.prev += dt; if (L.open && L.prev > 0.15) { L.prev = 0; renderBoard(false); }
    if (L.open) { L.mini += dt; if (L.mini > 0.16) { L.mini = 0; const p = document.getElementById('fd-build'); if (p) p.querySelectorAll('canvas[data-kind]').forEach(cv => paintMini(cv, S.T)); } }
    if (L.sel != null) renderTower(); else closeTp();
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
    for (const sp of spires) if (sp.seen) add(sp.x, sp.y - 70, 66, 0.4 + 0.2 * sp.wk);   // (under the radius that opens the fog)
}
  Founding.addLayer({
    reset() { towers.clear(); sol.clear(); solGone.clear(); fxT.clear(); corpses.length = 0; L.sel = null; L.placing = null; L.down = false; L.over = null; if (L.open) setOpen(false); closeTp(); for (const sp of spires) { sp.seen = false; sp.seenT = 0; sp.flags = 0; sp.wk = 0; sp.hitAt = sp.fireAt = -9; } },
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
      window.addEventListener('mouseup', () => { if (L.down) setTimeout(() => { L.down = false; }, 0); }, true);   // (after the click that press makes)
    },
    snap(m) { S = K.S; if (S) applySnap(m); },
    event(ev) { S = K.S; return onEvent(ev); },
    lights(add) { const now = performance.now(), dt = clamp((now - L.last) / 1000, 0, 0.1); L.last = now; frameUpdate(dt); lightsOut(add); },
    ground(c, inV) {
      for (const sp of spires) if (inV(sp.x, sp.y) && spireSeen(sp)) drawSpireGround(c, sp, S.T);
      for (const t of towers.values()) if (inV(t.x, t.y) && !t.rubble) { const sel = L.sel === t.id || L.hover === t.id; if (sel) { const r = rangeOf(t); K.ell(c, t.x, t.y, r, r * 0.92, 0, 'rgba(255,236,170,.05)', 'rgba(255,236,170,.4)', 1.4); } }
    },
    units(list, inV) {
      for (const sp of spires) if (inV(sp.x, sp.y) && spireSeen(sp)) list.push([sp.y, 9, { draw(c) { drawSpire(c, sp, S.T); } }]);
      for (const t of towers.values()) if (inV(t.x, t.y)) list.push([t.y, 9, { draw(c) { drawTower(c, t, S.T); } }]);
      for (const s of sol.values()) if (inV(s.x, s.y) && K.visAt(s.x, s.y, 10)) list.push([s.y, 9, { draw(c) { drawSoldier(c, s, S.T); } }]);
      for (const o of corpses) if (inV(o.x, o.y) && K.visAt(o.x, o.y, 10)) list.push([o.y, 8, { draw(c) { drawCorpse(c, o); } }]);
      const b = boardPos(); if (inV(b[0], b[1])) list.push([b[1], 9, { draw(c) { drawBoard(c, S.T); } }]);
    },
    top(c) {
      const m = S.mouse;
      if (!S.tipTxt && !L.placing && !L.open) {
        if (L.hover != null) { const t = byId(L.hover); if (t) { const T = TW[t.kind]; S.tipTxt = t.rubble ? [T.name + ', fallen', 'Rubble. Click it, then stand beside it to raise it again for half the price.'] : [T.name + ', rank ' + t.rank + ' of 3', T.text[t.rank - 1] + ' Health ' + Math.round(t.hp) + ' of ' + t.max + '. Click it to upgrade, mend or sell.']; } }
        else if (spireAt(m.wx, m.wy)) S.tipTxt = ['Ash Spire', 'Where the ash pours out. It cannot be felled.'];
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
      for (const sp of spires) if (sp.seen) { const x = sp.x * kx, y = sp.y * ky; g.fillStyle = '#d2692a'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - 3.4); g.lineTo(x + 2.6, y); g.lineTo(x, y + 3.4); g.lineTo(x - 2.6, y); g.closePath(); g.fill(); g.stroke(); }
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
