// The Founding: the later quests, drawing. A layer on Founding.addLayer (docs/plans/founding-pass3.md). Everything is drawn in code.
// The host sends the moving parts in each snapshot as `fds.qx` (see sim-quests.js) and the places are fixed in FoundingSim.QUESTX; the quest
// states themselves come from the ordinary quest rows. Drawn here: the Warden and her stakes with the rope between them (The Bounds), the
// mill going up and turning (The First Mill), the sacks in the far corners and the larder shed (The Winter Larder), the quarry, the two
// building sites and whichever one stands (The Last of the Stone), and the three watch-fires (The Watch-Fires). It also keeps the quest
// tracker's lines for these five readable (the core's tracker only knows its own nine), and adds the fires' light.
(function () {
  'use strict';
  if (typeof Founding === 'undefined' || !Founding.addLayer || typeof FoundingSim === 'undefined' || !FoundingSim.QUESTX) return;
  const X = FoundingSim.QUESTX, T = X.TUNE, D = FOUNDING_DATA;
  const PI = Math.PI, TAU = PI * 2, OUT = '#0b0806';
  const IDS = ['stakes', 'mill', 'larder', 'choice', 'watchfires'];
  let K = null;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const S = () => K && K.S;
  const E = (g, x, y, rx, ry, rot, fill, stroke, lw) => K.ell(g, x, y, rx, ry, rot, fill, stroke, lw);
  const poly = (g, pts, fill, stroke, lw) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.4; g.lineJoin = 'round'; g.stroke(); } };
  const line = (g, x0, y0, x1, y1, w, col) => { g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = w + 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const qrow = id => { const s = S(); if (!s || !s.q) return null; for (const r of s.q) if (r[0] === id) return r; return null; };
  const qst = id => { const r = qrow(id); return r ? r[1] : 0; };
  const seen = (x, y, pad) => K.visAt(x, y, pad || 40);
  const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const keyLabel = id => { try { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null; return (KB && KB.label && KB.keyFor ? KB.label(KB.keyFor(id)) : null) || 'G'; } catch (e) { return 'G'; } };

  let qx = {}, prevQ = {}, T0 = 0, now = 0;
  const fx = { bell: -9, ring: {}, hit: {}, stake: [-9, -9, -9, -9], lit: [-9, -9, -9], snuff: [-9, -9, -9], gather: {} };
  const smoke = [];   // snuffed fires' smoke puffs
  const wdn = { x: X.START[0], y: X.START[1], face: 0, walk: 0, lx: X.START[0], ly: X.START[1] };   // the Warden, smoothed between snapshots

  // ---------------------------------------------------------------- small figures and things
  function person(g, x, y, face, p) {   // p: { cloak, trim, hood, walk, work, staff, lamp, t, scale }
    const t = p.t || 0, sc = p.scale || 1, flip = Math.cos(face) < 0 ? -1 : 1, step = Math.sin(t * 9) * (p.walk ? 1 : 0);
    g.save(); g.translate(x, y); g.scale(sc, sc);
    E(g, 0, 3, 11, 4.5, 0, 'rgba(0,0,0,.34)');
    E(g, -3.2 * flip, 0, 3.2, 2.3, 0, '#2a1f18', OUT, 1); E(g, 3.2 * flip, 0, 3.2, 2.3, 0, '#2a1f18', OUT, 1);
    if (step) { E(g, -3.2 + step * 2.2, -0.5, 3.2, 2.3, 0, '#2a1f18', OUT, 1); }
    poly(g, [[-8, 0], [-6.5, -17], [6.5, -17], [8, 0]], p.cloak || '#8a7a52', OUT, 1.5);
    poly(g, [[-6.5, -17], [-3, -21], [3, -21], [6.5, -17]], p.trim || '#b9a56a', OUT, 1.1);
    E(g, 0, -22.5, 4.6, 4.8, 0, '#d9b48c', OUT, 1.3);
    poly(g, [[-5.4, -22], [0, -29], [5.4, -22], [4, -19.5], [-4, -19.5]], p.hood || p.cloak || '#8a7a52', OUT, 1.3);
    if (p.work) { const sw = Math.sin(t * 8) * 0.5; line(g, 5 * flip, -14, (11 + sw * 6) * flip, -22 - sw * 8, 2.4, '#6b4a2b'); E(g, (12 + sw * 6) * flip, -24 - sw * 8, 3.6, 2.6, 0, '#7d7468', OUT, 1.1); }
    else if (p.staff) { line(g, 8 * flip, 1, 9 * flip, -34, 2.2, '#6b4a2b'); if (p.lamp) { K.glowAt(g, 9 * flip, -36, 16, '255,190,90', 0.5); E(g, 9 * flip, -36, 2.8, 3.4, 0, '#ffd27a', OUT, 1); } }
    g.restore();
  }
  function flameAt(g, x, y, r, tm, seed, big) {
    const f = 0.8 + 0.2 * Math.sin(tm * 13 + seed), h = r * (1.7 + 0.5 * Math.sin(tm * 9 + seed * 2)) * (big ? 1.25 : 1);
    K.glowAt(g, x, y - h * 0.35, r * (big ? 4 : 2.8), '255,130,50', 0.5 * f);
    poly(g, [[x - r, y], [x - r * 0.7, y - h * 0.55], [x - r * 0.12 + Math.sin(tm * 11 + seed) * r * 0.2, y - h], [x + r * 0.5, y - h * 0.5], [x + r, y]], '#ff7a22', OUT, 1.2);
    poly(g, [[x - r * 0.55, y], [x - r * 0.3, y - h * 0.45], [x + Math.sin(tm * 14 + seed) * r * 0.12, y - h * 0.8], [x + r * 0.4, y - h * 0.4], [x + r * 0.55, y]], '#ffc24a');
    poly(g, [[x - r * 0.25, y], [x, y - h * 0.5], [x + r * 0.25, y]], '#fff0b0');
  }
  function bar(g, x, y, w, k, col) { g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 6); g.fillStyle = col; g.fillRect(x - w / 2, y, w * clamp(k, 0, 1), 4); }
  function sack(g, x, y, s, tm, glow) {
    g.save(); g.translate(x, y); g.scale(s, s);
    E(g, 0, 4, 11, 4, 0, 'rgba(0,0,0,.36)');
    poly(g, [[-9, 2], [-8, -9], [-3.5, -13], [3.5, -13], [8, -9], [9, 2], [4, 5], [-4, 5]], '#b79a62', OUT, 1.5);
    poly(g, [[-3.5, -13], [-5, -17], [-1.5, -15], [0, -18], [1.5, -15], [5, -17], [3.5, -13]], '#a98a54', OUT, 1.2);
    g.strokeStyle = '#5a4528'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-3.6, -12); g.lineTo(3.6, -12); g.stroke();
    g.strokeStyle = 'rgba(80,60,30,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-5, -6); g.lineTo(-4, 2); g.moveTo(4, -7); g.lineTo(5, 1); g.stroke();
    if (glow) { g.restore(); K.glowAt(g, x, y - 8 * s, 26 * s, '255,225,150', 0.28 + 0.12 * Math.sin(tm * 3 + x)); return; }
    g.restore();
  }
  function stone(g, x, y, w, h, tone) { poly(g, [[x - w, y], [x - w * 0.8, y - h], [x + w * 0.8, y - h], [x + w, y]], tone || '#928b7c', OUT, 1.3); poly(g, [[x - w * 0.8, y - h], [x + w * 0.8, y - h], [x + w * 0.55, y - h - 3], [x - w * 0.55, y - h - 3]], '#aaa393', OUT, 1); }

  // ---------------------------------------------------------------- The Bounds
  function stakeAt(g, x, y, tm, drawn, k) {
    const sway = Math.sin(tm * 2 + x * 0.01) * 2, up = k === undefined ? 1 : k;
    g.save(); g.translate(x, y);
    E(g, 0, 3, 9, 3.4, 0, 'rgba(0,0,0,.33)');
    poly(g, [[-2.8, 2], [-2.2, -34 * up], [2.2, -34 * up], [2.8, 2]], '#7a5a38', OUT, 1.4);
    poly(g, [[-2.2, -34 * up], [0, -39 * up], [2.2, -34 * up]], '#8f6b43', OUT, 1.1);
    if (drawn) {   // a rag of red cloth tied at the top, stirring
      const f = 6 + sway; poly(g, [[2, -33 * up], [15 + f * 0.6, -31 * up + sway * 0.5], [12 + f, -27 * up + sway], [2, -25 * up]], '#c24a36', OUT, 1.2);
      E(g, 0, -4, 7, 2.6, 0, '#6b5a40', OUT, 1);
    }
    g.restore();
  }
  function ropeAt(g, a, b, tm, alpha) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 24 + 4 * Math.sin(tm * 1.6 + a[0]), midY = my + 7 + Math.hypot(a[0] - b[0], a[1] - b[1]) * 0.05;
    g.save(); g.globalAlpha = alpha === undefined ? 1 : alpha; g.lineCap = 'round';
    g.strokeStyle = OUT; g.lineWidth = 3.6; g.beginPath(); g.moveTo(a[0], a[1] - 28); g.quadraticCurveTo(mx, midY, b[0], b[1] - 28); g.stroke();
    g.strokeStyle = '#c9ae72'; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1] - 28); g.quadraticCurveTo(mx, midY, b[0], b[1] - 28); g.stroke();
    g.restore();
  }
  function drawBounds(g, tm) {
    const st = qst('stakes'), q = qx.st; if (!st && !q) return;
    const n = q ? q[0] : st === 2 ? X.STAKES.length : 0, active = st === 1;
    for (let i = 0; i < X.STAKES.length; i++) {
      const p = X.STAKES[i], driven = i < n;
      if (!seen(p[0], p[1], 60)) continue;
      if (driven) {
        const age = tm - fx.stake[i], k = age < 0.5 ? K.eo(clamp(age / 0.5, 0, 1)) : 1;
        stakeAt(g, p[0], p[1], tm, true, k);
      } else if (active) {
        const cur = i === (q ? q[7] : 0);   // (the next stake is marked by the core's quiet marker; the ones further on are not painted)
        if (cur) { g.save(); g.setLineDash([6, 7]); E(g, p[0], p[1], 20, 18, 0, 'rgba(240,214,140,.05)', 'rgba(240,214,140,.45)', 1.4); g.setLineDash([]); g.restore(); }
      }
    }
    for (let i = 1; i < n; i++) if (seen(X.STAKES[i][0], X.STAKES[i][1], 100)) ropeAt(g, X.STAKES[i - 1], X.STAKES[i], tm);
    if (st === 2 && seen(X.STAKES[0][0], X.STAKES[0][1], 100)) ropeAt(g, X.STAKES[0], [X.START[0] + 10, X.START[1] - 4], tm, 0.9);   // tied off at the hall
  }
  function wardenUnit(L) {
    const st = qst('stakes'), q = qx.st; if (!q || (st !== 1 && st !== 2)) return;
    const x = wdn.x, y = wdn.y;
    L.push([y, 9, { draw(c) {
      if (!seen(x, y, 60)) return;
      const tm = now, driving = q[5] === 1;
      if (st === 1) {   // the circle she needs you inside, and what she waits for
        const near = q[6] === 1; c.save(); c.setLineDash([8, 9]); c.lineDashOffset = -tm * 10; E(c, x, y, T.stakes.near, T.stakes.near * 0.9, 0, near ? 'rgba(240,214,140,.035)' : 'rgba(255,150,90,.06)', near ? 'rgba(240,214,140,.35)' : `rgba(255,150,90,${0.45 + 0.25 * Math.sin(tm * 5)})`, 1.6); c.setLineDash([]); c.restore();
      }
      person(c, x, y, wdn.face, { cloak: '#6f7d4e', trim: '#d6c27a', hood: '#566339', walk: wdn.walk, work: driving, staff: !driving, lamp: true, t: tm, scale: 1.12 });
      if (driving && st === 1) { const k = clamp(q[8] / T.stakes.drive, 0, 1); bar(c, x, y - 52, 36, k, '#e6c98a'); }
      if (st === 1) { bar(c, x, y - 44 + (driving ? -0 : 0), 36, q[3] / Math.max(1, q[4]), q[3] / q[4] < 0.35 ? '#d9533f' : '#6aa86a'); }
      c.font = '10px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(235,225,200,.88)'; c.fillText('The Warden', x, y - (st === 1 ? 60 : 44));
    } }]);
  }

  // ---------------------------------------------------------------- The First Mill
  function millAt(g, x, y, prog, tm, kind) {   // kind: 0 going up, 1 done, 2 abandoned
    const k = kind === 1 ? 1 : clamp(prog, 0, 1), H = 96 * Math.min(1, k / 0.7 + 0.12), spin = kind === 1 ? 0.7 : kind === 2 ? 0 : 0.3 + k * 0.9;
    g.save(); g.translate(x, y);
    E(g, 0, 8, 54, 17, 0, 'rgba(0,0,0,.38)');
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; E(g, Math.cos(a) * 41, Math.sin(a) * 12 + 6, 7, 4, 0, i % 2 ? '#8a8272' : '#9a9382', OUT, 1.2); }   // the footing
    const wBot = 38, wTop = 26, tone = kind === 2 ? '#7d776a' : '#aaa292';
    g.beginPath(); g.moveTo(-wBot, 4); g.lineTo(-wTop, 4 - H); g.lineTo(wTop, 4 - H); g.lineTo(wBot, 4); g.closePath(); g.fillStyle = g.createLinearGradient(-wBot, 0, wBot, 0); const gr = g.createLinearGradient(-wBot, 0, wBot, 0); gr.addColorStop(0, tone); gr.addColorStop(0.6, tone); gr.addColorStop(1, '#7c7566'); g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(60,52,42,.45)'; g.lineWidth = 1; for (let r = 1; r * 12 < H; r++) { const yy = 4 - r * 12, w = wBot + (wTop - wBot) * (r * 12 / H); g.beginPath(); g.moveTo(-w, yy); g.lineTo(w, yy); g.stroke(); for (let c2 = 0; c2 < 4; c2++) { const xx = -w + ((c2 + (r % 2) * 0.5 + 0.3) / 4) * 2 * w; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 12 > 4 ? 4 : yy + 12); g.stroke(); } }
    poly(g, [[-9, 4], [-9, -14], [0, -21], [9, -14], [9, 4]], '#4a3322', OUT, 1.5);   // the door
    if (kind !== 0 || k > 0.55) {   // the cap and the sails
      const capY = 4 - H;
      poly(g, [[-wTop - 5, capY], [0, capY - 38], [wTop + 5, capY]], kind === 2 ? '#6f5a3c' : '#9a6a3a', OUT, 2);
      poly(g, [[-wTop - 5, capY], [wTop + 5, capY], [wTop, capY + 5], [-wTop, capY + 5]], '#6b4a2b', OUT, 1.4);
      if (kind !== 2 || k > 0.9) {
        const hx = 0, hy = capY - 12, a0 = tm * spin;
        for (let b = 0; b < 4; b++) {
          const a = a0 + b * PI / 2, ex = hx + Math.cos(a) * 58, ey = hy + Math.sin(a) * 58;
          line(g, hx, hy, ex, ey, 3.4, '#6b4a2b');
          const nx = -Math.sin(a), ny = Math.cos(a);
          poly(g, [[hx + Math.cos(a) * 14 + nx * 2, hy + Math.sin(a) * 14 + ny * 2], [ex + nx * 2, ey + ny * 2], [ex + nx * 15, ey + ny * 15], [hx + Math.cos(a) * 14 + nx * 15, hy + Math.sin(a) * 14 + ny * 15]], kind === 2 ? '#b7ad92' : '#e6dcc0', OUT, 1.5);
          for (let r = 1; r < 4; r++) { const t2 = 0.25 + r * 0.2; line(g, hx + Math.cos(a) * 58 * t2 + nx * 2, hy + Math.sin(a) * 58 * t2 + ny * 2, hx + Math.cos(a) * 58 * t2 + nx * 15, hy + Math.sin(a) * 58 * t2 + ny * 15, 1, 'rgba(70,55,35,.7)'); }
        }
        E(g, hx, hy, 6, 6, 0, '#5a3d24', OUT, 1.5);
      }
    }
    if (kind === 0) {   // scaffold poles round the unfinished wall
      for (const s of [-1, 1]) { line(g, s * 52, 6, s * 40, 4 - H - 10, 3, '#8a6a3f'); line(g, s * 44, 4 - H * 0.35, s * 30, 4 - H * 0.35 - 4, 2.4, '#8a6a3f'); line(g, s * 46, 4 - H * 0.7, s * 33, 4 - H * 0.7 - 4, 2.4, '#8a6a3f'); }
    }
    g.restore();
  }
  function drawMill(L) {
    const st = qst('mill'), q = qx.ml; if (st === 0 && !q) return;
    const x = X.MILL[0], y = X.MILL[1], prog = q ? q[0] : st === 2 ? 1 : 0, kind = st === 2 ? 1 : st === 3 ? 2 : 0;
    if (st === 0) return;
    L.push([y + 10, 9, { draw(c) {
      if (!seen(x, y, 120)) return;
      const tm = now;
      if (kind === 0) { const staffed = q && q[3] === 1; c.save(); c.setLineDash([9, 10]); E(c, x, y, T.mill.staffR * 0.5, T.mill.staffR * 0.46, 0, null, staffed ? 'rgba(240,214,140,.16)' : 'rgba(255,150,90,.3)', 1.3); c.setLineDash([]); c.restore(); }
      millAt(c, x, y, prog, tm, kind);
      if (kind === 0) {
        // the Smith's builders, hammering while someone holds the frame
        const staffed = q && q[3] === 1;
        for (let i = 0; i < 3; i++) person(c, x - 70 + i * 66 + (i === 1 ? 14 : 0), y + 22 + (i === 1 ? 14 : 0), PI * (i % 2), { cloak: ['#8c6a4a', '#7a6a58', '#6a5a4a'][i], trim: '#c9b27a', work: staffed, walk: 0, t: tm + i * 1.3, scale: 0.9 });
        if (q) { bar(c, x, y + 52, 70, q[0], '#e6c98a'); bar(c, x, y + 60, 70, q[1] / Math.max(1, q[2]), q[1] / q[2] < 0.35 ? '#d9533f' : '#6aa86a'); }
        if (staffed && Math.sin(tm * 8) > 0.9) { K.burst && K.burst(x + (hash(Math.floor(tm * 8), 1) - 0.5) * 100, y + 20, 2, { color: '#a89878', spd: 40, dur: 0.4, size: 2, kind: 'dust' }); }
      } else if (kind === 1) { for (const [dx, dy] of [[-62, 26], [66, 24]]) sack(c, x + dx, y + dy, 0.8, tm, false); K.glowAt(c, x + 20, y - 20, 30, '255,190,90', 0.25); }
    } }]);
  }

  // ---------------------------------------------------------------- The Winter Larder
  function shedAt(g, x, y, tm) {
    g.save(); g.translate(x, y);
    E(g, 0, 8, 62, 18, 0, 'rgba(0,0,0,.38)');
    poly(g, [[-46, 4], [-46, -34], [46, -34], [46, 4]], '#8b6c45', OUT, 2);
    g.strokeStyle = 'rgba(40,28,16,.55)'; g.lineWidth = 1.2; for (let i = -40; i <= 40; i += 10) { g.beginPath(); g.moveTo(i, -33); g.lineTo(i, 3); g.stroke(); }
    poly(g, [[-54, -32], [0, -66], [54, -32], [46, -30], [0, -56], [-46, -30]], '#a6753d', OUT, 2);
    poly(g, [[-54, -32], [0, -66], [0, -56], [-46, -30]], '#b8864a');
    poly(g, [[-12, 4], [-12, -22], [12, -22], [12, 4]], '#4a3322', OUT, 1.6);
    g.restore();
    for (const [dx, dy, s] of [[-62, 12, 0.85], [-48, 20, 0.8], [58, 14, 0.85]]) sack(g, x + dx, y + dy, s, tm, false);
    for (const dx of [50, 66]) { poly(g, [[x + dx - 7, y + 14], [x + dx - 8, y - 4], [x + dx + 8, y - 4], [x + dx + 7, y + 14]], '#7a5a38', OUT, 1.3); g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + dx - 8, y); g.lineTo(x + dx + 8, y); g.stroke(); }
  }
  function drawLarder(g, L, tm) {
    const st = qst('larder'), q = qx.lg;
    if (st === 2 || (q && q[1] >= q[2])) { const x = X.SHED[0], y = X.SHED[1]; L.push([y + 6, 9, { draw(c) { if (seen(x, y, 80)) shedAt(c, x, y, now); } }]); }
    if (st !== 1 || !q) return;
    for (let i = 0; i < X.LARDER.length; i++) {
      if (q[0] & (1 << i)) continue; const p = X.LARDER[i];
      L.push([p[1], 9, { draw(c) { if (!seen(p[0], p[1], 40)) return; sack(c, p[0], p[1], 1.25, now, true); } }]);
    }
  }

  // ---------------------------------------------------------------- The Last of the Stone
  function siteFoot(g, x, y, tm, got, need, alpha, label) {
    g.save(); g.globalAlpha = alpha;
    g.setLineDash([8, 8]); E(g, x, y, T.choice.siteR, T.choice.siteR * 0.62, 0, 'rgba(240,214,140,.03)', 'rgba(240,214,140,.45)', 1.5); g.setLineDash([]);
    for (let i = 0; i < need; i++) { const a = (i / need) * TAU - PI / 2, px = x + Math.cos(a) * 34, py = y + Math.sin(a) * 21; if (i < got) { stone(g, px, py + 5, 7, 7, '#a8a190'); } else E(g, px, py, 6.5, 4, 0, null, 'rgba(240,214,140,.55)', 1.3); }
    g.restore();
  }
  function bellTowerAt(g, x, y, tm, swing) {
    g.save(); g.translate(x, y);
    E(g, 0, 8, 46, 14, 0, 'rgba(0,0,0,.38)');
    for (const s of [-1, 1]) { poly(g, [[s * 30, 6], [s * 24, -86], [s * 18, -86], [s * 22, 6]], '#85623a', OUT, 1.8); }
    line(g, -28, -26, 26, -62, 3, '#6b4a2b'); line(g, 28, -26, -26, -62, 3, '#6b4a2b');
    poly(g, [[-30, -86], [30, -86], [30, -92], [-30, -92]], '#6b4a2b', OUT, 1.6);
    poly(g, [[-38, -92], [0, -128], [38, -92]], '#9a6a3a', OUT, 2); poly(g, [[-38, -92], [0, -128], [0, -118], [-30, -92]], '#b07b44');
    const sw = Math.sin(tm * 7) * 0.45 * clamp(swing, 0, 1);
    g.save(); g.translate(0, -90); g.rotate(sw); line(g, 0, 0, 0, 12, 2.4, '#4a3322'); poly(g, [[-9, 30], [-6, 12], [6, 12], [9, 30], [11, 33], [-11, 33]], '#c9a24a', OUT, 1.6); E(g, 0, 34, 3, 3, 0, '#4a3322', OUT, 1); g.restore();
    g.restore();
  }
  function wardStoneAt(g, x, y, tm, pulse) {
    g.save(); g.translate(x, y);
    E(g, 0, 8, 40, 13, 0, 'rgba(0,0,0,.38)');
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; stone(g, Math.cos(a) * 34, 6 + Math.sin(a) * 10, 7, 6, '#8d8677'); }
    const gl = 0.55 + 0.25 * Math.sin(tm * 2.2) + pulse * 0.5;
    poly(g, [[-17, 6], [-12, -72], [-4, -96], [6, -92], [14, -66], [18, 6]], '#8f897a', OUT, 2.2); poly(g, [[-17, 6], [-12, -72], [-4, -96], [0, -90], [-6, -60], [-8, 6]], '#a8a291');
    g.strokeStyle = `rgba(255,${130 + 50 * gl | 0},50,${0.55 + 0.4 * gl})`; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-3, -20); g.lineTo(3, -34); g.lineTo(-4, -46); g.lineTo(4, -60); g.lineTo(0, -74); g.stroke();
    g.beginPath(); g.moveTo(-8, -32); g.lineTo(-2, -40); g.moveTo(5, -48); g.lineTo(10, -40); g.stroke();
    g.restore(); K.glowAt(g, x, y - 52, 70, '255,130,50', 0.28 * gl);
  }
  function drawChoice(g, L, tm) {
    const st = qst('choice'), q = qx.ch; if (!st && !q) return;
    const chosen = q ? q[3] : 0;
    if (st === 1 && q) {
      // the quarry: a stack of dressed stone
      const px = X.PILE[0], py = X.PILE[1];
      L.push([py + 6, 9, { draw(c) { if (!seen(px, py, 60)) return; c.save(); E(c, px, py + 6, 40, 14, 0, 'rgba(0,0,0,.35)');
        const n = q[2]; for (let i = 0; i < Math.min(n, 5); i++) stone(c, px - 22 + (i % 3) * 22 + (i > 2 ? 11 : 0), py + 6 - (i > 2 ? 14 : 0), 10, 10, '#a39c8b');
        c.restore(); } }]);
    }
    for (const [site, p, pending] of [[1, X.BELL, 'bell'], [2, X.WARD, 'ward']]) {
      const got = q ? q[site - 1] : 0, need = q ? q[4] : 3;
      if (chosen === site || (st === 2 && !q && site === 1)) {
        L.push([p[1] + 8, 9, { draw(c) { if (!seen(p[0], p[1], 100)) return; if (site === 1) bellTowerAt(c, p[0], p[1], now, 1 - clamp((now - fx.bell) / 2.2, 0, 1)); else wardStoneAt(c, p[0], p[1], now, clamp(1 - (now - fx.ring.ward || 9) / 1.2, 0, 1)); } }]);
      } else if (st === 1) {
        L.push([p[1] + 4, 9, { draw(c) { if (seen(p[0], p[1], 80)) siteFoot(c, p[0], p[1], now, got, need, 0.95, pending); } }]);
      } else if (st === 3 || (st === 2 && chosen)) {
        L.push([p[1] + 4, 9, { draw(c) { if (seen(p[0], p[1], 80)) { c.save(); c.globalAlpha = 0.28; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; stone(c, p[0] + Math.cos(a) * 30, p[1] + Math.sin(a) * 14, 6, 5, '#7d776a'); } c.restore(); } } }]);
      }
    }
  }

  // ---------------------------------------------------------------- The Watch-Fires
  function fireAt(g, x, y, tm, lit, i, hurt) {
    g.save(); g.translate(x, y);
    E(g, 0, 8, 46, 15, 0, 'rgba(0,0,0,.38)');
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; stone(g, Math.cos(a) * 30, 6 + Math.sin(a) * 9, 7, 7, k % 2 ? '#8a8272' : '#9a9382'); }
    for (const s of [-1, 0, 1]) line(g, s * 17, 4, s * 5, -34, 3.2, '#4a3a2a');   // a tripod of iron-shod poles
    poly(g, [[-18, -28], [18, -28], [14, -20], [-14, -20]], '#3a2f28', OUT, 1.6); E(g, 0, -29, 18, 5.6, 0, '#2a211b', OUT, 1.4);
    if (lit) { g.restore(); const fl = hurt ? 0.7 : 1; flameAt(g, x, y - 30, 13 * fl, tm, i * 3.7, true); for (let k = 0; k < 3; k++) { const ph = (tm * 0.7 + k * 0.33 + i * 0.1) % 1; g.fillStyle = `rgba(255,${190 - 80 * ph | 0},80,${0.8 * (1 - ph)})`; g.fillRect(x + Math.sin(ph * 5 + k * 2) * 10, y - 40 - ph * 54, 2, 2); } return; }
    // cold: a heap of ash with a thread of smoke
    E(g, 0, -29, 13, 4, 0, '#5a554b'); g.strokeStyle = 'rgba(120,115,105,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(4 * Math.sin(tm + i), -44, -2 * Math.sin(tm * 0.8), -56); g.stroke();
    g.restore();
  }
  function drawFires(L, tm) {
    const st = qst('watchfires'), q = qx.wf; if (!q) return;
    for (let i = 0; i < X.FIRES.length; i++) {
      const p = X.FIRES[i], f = q[i] || [0, 0, 1];
      if (st === 0) continue;
      L.push([p[1] + 6, 9, { draw(c) {
        if (!seen(p[0], p[1], 90)) return;
        const lit = f[0] === 1, hurt = lit && f[1] < f[2] * 0.6;
        fireAt(c, p[0], p[1], now, lit, i, hurt);
        if (lit && f[1] < f[2]) { bar(c, p[0], p[1] - 78, 40, f[1] / f[2], f[1] / f[2] < 0.35 ? '#d9533f' : '#e6a24a'); }
        const age = now - fx.snuff[i]; if (age < 1.4) { c.save(); c.globalAlpha = 1 - age / 1.4; E(c, p[0], p[1] - 30 - age * 30, 16 + age * 10, 10 + age * 6, 0, 'rgba(110,105,98,.7)'); c.restore(); }
      } }]);
    }
  }

  // ---------------------------------------------------------------- hover tooltips (the core draws S.tipTxt)
  function hoverTip() {
    const s = S(); if (!s || s.tipTxt || !s.mouse) return;
    const mx = s.mouse.wx, my = s.mouse.wy, near = (p, r) => Math.hypot(mx - p[0], my - p[1]) < r, G = keyLabel('fdUse'), Xk = keyLabel('fdDrop');
    const tip = (a, b) => { s.tipTxt = [a, b]; };
    if (qst('watchfires') === 1 && qx.wf) for (let i = 0; i < X.FIRES.length; i++) if (near([X.FIRES[i][0], X.FIRES[i][1] - 20], 50)) return tip('A watch-fire', qx.wf[i][0] ? 'It burns. Things out in the dark will come to snuff it: keep them off.' : 'Light a brand at a camp fire, carry it here and press ' + G + ' beside this fire. Hold still a moment while it catches.');
    if (qst('choice') === 1 && qx.ch) {
      if (near(X.PILE, 60)) return tip('The quarry', 'Press ' + G + ' beside the stone to shoulder one. ' + Xk + ' sets it down. Carry it to the bell tower site or the ward-stone site: whichever is finished first is the one that stands.');
      if (near(X.BELL, T.choice.siteR)) return tip('Bell tower site', 'Lay stone here to raise a bell. When it is raised, the bell shields every hero at the start of each wave. ' + qx.ch[0] + ' of ' + qx.ch[4] + ' laid.');
      if (near(X.WARD, T.choice.siteR)) return tip('Ward-stone site', 'Lay stone here to raise a ward-stone. When it is raised, the camp takes a quarter less from every blow. ' + qx.ch[1] + ' of ' + qx.ch[4] + ' laid.');
    }
    if (qst('larder') === 1 && qx.lg) for (let i = 0; i < X.LARDER.length; i++) if (!(qx.lg[0] & (1 << i)) && near([X.LARDER[i][0], X.LARDER[i][1] - 10], 30)) return tip('A sack for the larder', 'Walk up to it to gather it.');
    if (qst('mill') === 1 && qx.ml && near(X.MILL, 90)) return tip('The mill site', 'The sails only go up while someone stands near. The hungry things will come for the builders in surges.');
    if (qst('stakes') === 1 && qx.st && near([wdn.x, wdn.y - 10], 34)) return tip('The Warden', 'She walks only while a hero is close, and drives each stake once the way is clear. Keep the hungry things off her.');
    if (qst('stakes') === 1 && qx.st) { const cur = X.STAKES[qx.st[7]]; if (cur && near(cur, 34)) return tip('The next stake', 'The Warden will drive a stake here.'); }
  }

  // ---------------------------------------------------------------- the tracker lines (the core's tracker knows its own nine quests)
  const LINES = {
    stakes: () => { const q = qx.st; return q ? 'Walk beside the Warden as she drives the stakes, and keep the hungry things off her. ' + q[0] + ' of ' + X.STAKES.length + ' set' + (q[6] ? '' : '. She waits for company.') : D.QUESTS.stakes.text; },
    mill: () => { const q = qx.ml; return q ? 'Stand near the mill site while the sails go up; hold the builders against the surges. ' + Math.round(q[0] * 100) + '%' + (q[3] ? '' : '. The work stops without you.') : D.QUESTS.mill.text; },
    larder: () => { const q = qx.lg; return q ? 'Gather the sacks lying in the far corners of the valley. ' + q[1] + ' of ' + q[2] : D.QUESTS.larder.text; },
    choice: () => { const q = qx.ch; return q ? 'Carry stone from the quarry to the bell tower or the ward-stone: the first finished stands. Bell ' + q[0] + ', ward ' + q[1] + ' of ' + q[4] : D.QUESTS.choice.text; },
    watchfires: () => { const q = qx.wf; return q ? 'Carry a brand from a camp fire to each far fire and keep them burning. ' + q.filter(f => f[0]).length + ' of ' + q.length + ' lit' : D.QUESTS.watchfires.text; },
  };
  let trackT = 0;
  function patchTracker() {
    if (typeof document === 'undefined') return; const root = document.getElementById('fd-quests'); if (!root || root.style.display === 'none') return;
    for (const id of IDS) { if (qst(id) !== 1) continue; const n = root.querySelector('.q.act[data-q="' + id + '"] .qo'); if (!n) continue; const t = LINES[id](); if (n.textContent !== t) n.textContent = t; }
  }

  // ---------------------------------------------------------------- events
  function ev(e) {
    const tag = e[0]; if (typeof tag !== 'string' || tag.length < 3 || tag.slice(0, 2) !== 'qx') return false;
    const s = S(), me = K.me(), snd = K.snd;
    switch (tag) {
      case 'qxs': { const p = X.STAKES[e[1]] || [e[2], e[3]]; fx.stake[e[1]] = now; snd('fd-post-plant'); K.burst(p[0], p[1], 8, { color: '#a89878', spd: 70, dur: 0.5, size: 2.6, kind: 'dust' }); K.fxRing(p[0], p[1], 8, 52, 0.6, '255,230,160', 3, 0); K.ftxt(p[0], p[1] - 46, (e[1] + 1) + ' / ' + X.STAKES.length, '#f3dfa4', 13, 1.5); break; }
      case 'qxh': K.ftxt(e[1], e[2], '' + e[3], '#ff8a78', 12, 0.9); K.snd('fd-camp-hit', { vol: 0.5 }); break;
      case 'qxr': { const k = e[1]; snd('fd-alert'); if (K.say) K.say(k === 0 ? 'Hungry things are coming for the Warden.' : k === 1 ? 'They are coming for the builders.' : 'Something in the dark is coming for the fire.'); K.fxRing(e[2], e[3], 20, 90, 0.9, '255,120,90', 3, 0); break; }
      case 'qxm': snd('fd-wave', { vol: 0.5 }); K.shake && K.shake(2, 0.2); break;
      case 'qxg': { snd('fd-pickup'); K.burst(e[2], e[3], 8, { color: '#ffe9a8', spd: 70, dur: 0.6, size: 2.2, kind: 'dot', vy: -40, g: -20 }); K.ftxt(e[2], e[3] - 34, e[4] + ' / ' + e[5], '#f3dfa4', 13, 1.5); K.fxRing(e[2], e[3], 8, 50, 0.5, '255,230,160', 2.5, 0); break; }
      case 'qxp': snd('fd-pickup'); break;
      case 'qxd': { snd('fd-deliver'); K.burst(e[4], e[5], 8, { color: '#a89878', spd: 70, dur: 0.6, size: 3, kind: 'chunk', g: 260 }); K.ftxt(e[4], e[5] - 40, e[2] + ' / ' + e[3], '#f3dfa4', 13, 1.5); K.fxRing(e[4], e[5], 10, 70, 0.6, '255,230,160', 3, 0); break; }
      case 'qxc': { const p = e[1] === 1 ? X.BELL : X.WARD; snd(e[1] === 1 ? 'fd-bell-ring' : 'fd-cover'); fx.bell = now; fx.ring.ward = now; K.fxRing(p[0], p[1], 20, 200, 1.2, '255,230,160', 4, 0); K.burst(p[0], p[1] - 40, 24, { color: '#ffe9a8', spd: 160, dur: 0.9, size: 2.6, kind: 'spark' }); K.shake && K.shake(3, 0.25); break; }
      case 'qxf': {
        const p = X.FIRES[e[1]]; if (!p) break;
        if (e[2]) { fx.lit[e[1]] = now; snd('fd-brand'); K.burst(p[0], p[1] - 30, 22, { color: '#ffb048', spd: 150, dur: 0.9, size: 2.6, kind: 'spark', vy: -60, g: -40 }); K.fxRing(p[0], p[1], 14, 130, 0.9, '255,200,110', 3.5, 0); K.ftxt(p[0], p[1] - 70, 'Lit', '#ffd27a', 14, 1.5); }
        else { fx.snuff[e[1]] = now; snd('fd-post-out'); K.burst(p[0], p[1] - 30, 12, { color: '#6a655c', spd: 60, dur: 1.2, size: 4, kind: 'dust', vy: -30 }); K.ftxt(p[0], p[1] - 70, 'Snuffed out', '#ff9a8a', 13, 1.6); }
        break;
      }
      case 'qxw': {
        if (e[1] === 1) { fx.bell = now; snd('fd-bell-ring', { vol: 0.7 }); }
        else if (e[1] === 0 && me && e[2] === s.myId) { snd('fd-mend', { vol: 0.5 }); K.ftxt(me.x, me.y - 50, 'A hot meal', '#bfe8b0', 12, 1.4); }
        else if (e[1] === 2 && me && e[2] === s.myId) { K.ftxt(me.x, me.y - 50, '+' + T.mill.gold + ' gold', '#ffd27a', 12, 1.3); }
        break;
      }
      case 'qxe': K.fxRing(e[1], e[2], 10, 150, 0.5, '255,150,70', 3, 0); K.burst(e[1], e[2], 12, { color: '#ff8a3a', spd: 120, dur: 0.5, size: 2.4, kind: 'spark' }); K.snd('fd-erupt', { vol: 0.35 }); break;
      case 'qxb': { const u = K.U('h' + e[1]); if (u) { K.ftxt(u.x, u.y - 50, 'Cornerstone', '#e6c98a', 12, 1.4); K.fxRing(u.x, u.y, 8, 54, 0.6, '255,230,160', 2.5, 0); } break; }
    }
    return true;
  }

  // the core never calls a layer's update, so the layer keeps its own clock from the client's (S.T) on each ground draw
  let lastT = null;
  function step() {
    const s = S(); if (!s) return; const t = s.T; if (lastT === null) lastT = t; const dt = clamp(t - lastT, 0, 0.1); lastT = t; now = t;
    // the Warden glides to the host's position
    const k = Math.min(1, dt * 8), dx = wdn.lx - wdn.x, dy = wdn.ly - wdn.y;
    if (Math.hypot(dx, dy) > 300) { wdn.x = wdn.lx; wdn.y = wdn.ly; } else { wdn.x += dx * k; wdn.y += dy * k; }
    if (wdn.tf !== undefined) { let d = wdn.tf - wdn.face; while (d > PI) d -= TAU; while (d < -PI) d += TAU; wdn.face += d * Math.min(1, dt * 10); }
    wdn.walk = qx.st && qx.st[9] ? 1 : 0;
    trackT -= dt; if (trackT <= 0) { trackT = 0.3; patchTracker(); }
    for (const id of IDS) { const st = qst(id); if (st !== prevQ[id]) { prevQ[id] = st; } }
  }

  Founding.addLayer({
    init(kit) { K = kit; },
    event: ev,
    snap(m) {
      qx = m.qx || {}; const s = S();
      if (qx.st) { wdn.lx = qx.st[1]; wdn.ly = qx.st[2]; wdn.tf = qx.st[10]; wdn.walkT = qx.st[9]; }
    },
    ground(c, inV) {
      if (!K) return; step();
      const tm = now; try { drawBounds(c, tm); } catch (err) { if (!this._e1) { this._e1 = 1; console.error('quests ground', err); } }
    },
    units(L, inV) {
      if (!K || !S() || S().phase === 'camp') return;
      const tm = now;
      wardenUnit(L); drawMill(L); drawLarder(null, L, tm); drawChoice(null, L, tm); drawFires(L, tm);
    },
    top() { if (K) hoverTip(); },
    // each of these quests' current step, for the core's quiet markers and the minimap (one per quest)
    qfocus(out, my) {
      const s = S(); if (!K || !s) return;
      const hx = my ? my.x : X.START[0], hy = my ? my.y : X.START[1], G = keyLabel('fdUse');
      const add = (id, step, p, R, carry, title, tip, sub) => out.push({ id, step, x: p[0], y: p[1], R: R || 0, code: 0, carry: !!carry, title, tip, sub: sub || '' });
      const nearest = pts => { let b = null, bd = 1e12; for (const p of pts) { const d = (p[0] - hx) * (p[0] - hx) + (p[1] - hy) * (p[1] - hy); if (d < bd) { bd = d; b = p; } } return b; };
      if (qst('stakes') === 1 && qx.st) { const cur = X.STAKES[qx.st[7]]; if (cur) add('stakes', 'site', cur, 0, false, 'The next stake', 'The Warden will drive a stake here.', qx.st[0] + ' of ' + X.STAKES.length); }
      if (qst('mill') === 1) add('mill', 'site', X.MILL, 0, false, 'The mill site', 'The sails only go up while someone stands near.', qx.ml ? Math.round(qx.ml[0] * 100) + '%' : '');
      if (qst('larder') === 1 && qx.lg) { const p = nearest(X.LARDER.filter((q, i) => !(qx.lg[0] & (1 << i)))); if (p) add('larder', 'pick', p, 0, false, 'A sack for the larder', 'Walk up to it to gather it.', qx.lg[1] + ' of ' + qx.lg[2]); }
      if (qst('choice') === 1 && qx.ch) {
        const carrying = !!my && my.carry === 4 && qst('stonegate') !== 1;
        if (carrying) { const p = nearest([X.BELL, X.WARD]); add('choice', 'dest', p, T.choice.siteR, true, p === X.BELL ? 'Bell tower site' : 'Ward-stone site', 'Lay the stone here. Whichever site is finished first is the one that stands.', ''); }
        else if (qx.ch[2] > 0) add('choice', 'pick', X.PILE, 0, false, 'The quarry', 'Press ' + G + ' beside the stone to shoulder one.', qx.ch[2] + ' left');
      }
      if (qst('watchfires') === 1 && qx.wf) {
        const branded = !!my && !!(my.f & K.FLAG.BRAND), unlit = X.FIRES.filter((p, i) => !qx.wf[i][0]), lit = qx.wf.filter(f => f[0]).length;
        if (branded && unlit.length) add('watchfires', 'dest', nearest(unlit), 0, true, 'A watch-fire', 'Press ' + G + ' beside this fire and hold still a moment while it catches.', lit + ' of ' + qx.wf.length + ' lit');
        else {
          const camp = nearest(((s.props && s.props.qo) || []).filter(o => o[0] === 8).map(o => [o[1], o[2]])) || nearest(unlit);
          if (camp) add('watchfires', 'site', camp, 0, false, branded ? 'A watch-fire' : 'A camp fire', branded ? 'Light a brand and carry it here.' : 'Press ' + G + ' beside it to light a brand, then carry it to a far fire.', lit + ' of ' + qx.wf.length + ' lit');
        }
      }
    },
    lights(add) {
      if (!K) return;
      if (qx.wf) for (let i = 0; i < X.FIRES.length; i++) if (qx.wf[i] && qx.wf[i][0]) add(X.FIRES[i][0], X.FIRES[i][1] - 30, T.fires.lightR * 0.9, 1);
      if (qst('mill') === 2) add(X.MILL[0], X.MILL[1] - 40, 140, 0.8);
      if (qx.ch && qx.ch[3] === 2) add(X.WARD[0], X.WARD[1] - 50, 110, 0.7);
      if (qst('stakes') === 1 && qx.st) add(wdn.x, wdn.y - 36, 80, 0.7);
    },
    mini(g, kx, ky) {
      if (!K) return;
      const dot = (p, col, r) => { g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(p[0] * kx, p[1] * ky, r, 0, TAU); g.fill(); g.stroke(); };
      if (qst('mill') === 2) dot(X.MILL, '#e6dcc0', 3);
      if (qx.wf && qst('watchfires')) X.FIRES.forEach((p, i) => { if (qx.wf[i][0]) dot(p, '#ff9a3a', 3.5); });
    },
  });
})();
