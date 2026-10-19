// The town hub map: layout, colliders, a pre-rendered static layer, and animated decorations.

const WORLD = { w: 2400, h: 1700 };

const TOWN = {
  tavern: { x: 260, y: 470, w: 380, h: 290, name: 'The Gilded Tankard', roof: '#8a3b2a', wall: '#d9c6a0', chimney: 0.72, windows: [0.14, 0.31, 0.69, 0.86] },
  smithy: { x: 1900, y: 690, w: 280, h: 220, name: 'Forge', roof: '#5c6470', wall: '#b0a38a', chimney: 0.12 },
  houses: [
    { x: 160, y: 1250, w: 210, h: 170, roof: '#4f6e9a', wall: '#d8cbb0' },
    { x: 820, y: 1300, w: 230, h: 170, roof: '#7a5a3a', wall: '#d8cbb0', chimney: 0.7 },
    { x: 1420, y: 1400, w: 210, h: 160, roof: '#8a3b2a', wall: '#d8cbb0' },
    { x: 2050, y: 380, w: 200, h: 160, roof: '#4f6e9a', wall: '#d8cbb0', chimney: 0.25 },
    { x: 170, y: 150, w: 200, h: 160, roof: '#7a5a3a', wall: '#d8cbb0' },
  ],
  plaza: { x: 1200, y: 960, r: 240 },
  fountain: { x: 1200, y: 960, r: 72 },
  portal: { x: 1200, y: 260, r: 78 },
  terrace: { x: 680, y: 470, w: 1040, h: 180 },
  deck: { x: 240, y: 780, w: 470, h: 340 },
  keeper: { x: 560, y: 805 },
  trainer: { x: 1664, y: 1112 },   // the Talent Trainer, just inside the Training Yard gate
  yard: { x: 1600, y: 1060, w: 520, h: 300 },
  dummies: [{ x: 1730, y: 1210 }, { x: 1870, y: 1170 }, { x: 2010, y: 1230 }],
  pedestals: [{ x: 780, y: 560 }, { x: 1020, y: 560 }, { x: 1380, y: 560 }, { x: 1620, y: 560 }],
  lamps: [],
  trees: [],
  spawn: { x: 1200, y: 1180 },
};

const COLLIDERS = { rects: [], circles: [] };

function lineupSpot(roleIdx, col) { return { x: 390 + col * 110, y: 870 + roleIdx * 90 }; }

function initTown() {
  const r = rng(42);
  const t = TOWN.trees;
  for (let x = 30; x < WORLD.w; x += 75) {
    t.push([x + r() * 20, 30 + r() * 30, 1 + r() * 0.3]);
    if (Math.abs(x - 1200) > 100) t.push([x + r() * 20, WORLD.h - 40 - r() * 30, 1 + r() * 0.3]);
  }
  for (let y = 110; y < WORLD.h - 80; y += 75) {
    t.push([30 + r() * 30, y + r() * 20, 1 + r() * 0.3]);
    t.push([WORLD.w - 40 - r() * 30, y + r() * 20, 1 + r() * 0.3]);
  }
  for (const [x, y] of [[780, 300], [650, 230], [1640, 300], [1790, 220], [2270, 1030], [2260, 1400], [140, 720],
    [140, 1060], [560, 1500], [1720, 1560], [1960, 1520], [480, 300], [900, 1190], [1450, 1260], [1900, 380]]) {
    t.push([x, y, 1.1 + r() * 0.3]);
  }
  for (const a of [0.25, 0.75, 1.25, 1.75]) {
    TOWN.lamps.push({ x: TOWN.plaza.x + Math.cos(a * Math.PI) * 270, y: TOWN.plaza.y + Math.sin(a * Math.PI) * 270 });
  }
  TOWN.lamps.push({ x: 700, y: 790 }, { x: 700, y: 1110 }, { x: 690, y: 650 }, { x: 1710, y: 650 });

  for (const b of [TOWN.tavern, TOWN.smithy, ...TOWN.houses]) COLLIDERS.rects.push({ x: b.x, y: b.y, w: b.w, h: b.h });
  for (const [x, y, s] of t) COLLIDERS.circles.push({ x, y: y + 4, r: 18 * s });
  for (const p of TOWN.pedestals) COLLIDERS.circles.push({ x: p.x, y: p.y, r: 58 });
  for (const l of TOWN.lamps) COLLIDERS.circles.push({ x: l.x, y: l.y, r: 8 });
  for (const d of TOWN.dummies) COLLIDERS.circles.push({ x: d.x, y: d.y, r: 16 });
  COLLIDERS.circles.push({ x: TOWN.fountain.x, y: TOWN.fountain.y, r: TOWN.fountain.r + 6 });
}

function resolveCollisions(e, R = 14) {
  for (const c of COLLIDERS.circles) {
    const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy), min = c.r + R;
    if (d < min) {
      if (d < 0.001) { e.y = c.y + min; continue; }
      e.x = c.x + dx / d * min; e.y = c.y + dy / d * min;
    }
  }
  for (const b of COLLIDERS.rects) {
    const nx = clamp(e.x, b.x, b.x + b.w), ny = clamp(e.y, b.y, b.y + b.h);
    const dx = e.x - nx, dy = e.y - ny, d = Math.hypot(dx, dy);
    if (d === 0) {
      // inside the rect: push out through the nearest edge
      const opts = [[e.x - b.x, -1, 0], [b.x + b.w - e.x, 1, 0], [e.y - b.y, 0, -1], [b.y + b.h - e.y, 0, 1]];
      opts.sort((a, c) => a[0] - c[0]);
      const [dist, ox, oy] = opts[0];
      e.x += ox * (dist + R); e.y += oy * (dist + R);
    } else if (d < R) {
      e.x = nx + dx / d * R; e.y = ny + dy / d * R;
    }
  }
  e.x = clamp(e.x, 40, WORLD.w - 40);
  e.y = clamp(e.y, 40, WORLD.h - 40);
}

// ---------------------------------------------------------------------------
// Static layer (drawn once)

function drawBuilding(g, b) {
  const { x, y, w, h } = b, wallH = 50, roofB = y + h - wallH;
  const beam = shade(b.wall, -0.35);
  rrect(g, x + 10, y + 14, w, h, 6, 'rgba(0,0,0,0.25)');
  // front wall
  rrect(g, x, roofB - 6, w, wallH + 6, 3, b.wall, OUT, 2.5);
  for (let bx = x + 35; bx < x + w - 20; bx += 70) line(g, bx, roofB, bx, y + h - 2, beam, 4);
  line(g, x + 3, roofB + 6, x + w - 3, roofB + 6, beam, 4);
  const doorX = x + w / 2;
  for (const f of b.windows || [0.2, 0.8]) {
    const wx = x + w * f;
    glow(g, wx, roofB + 26, 28, '#ffcf6a', 0.35);
    rrect(g, wx - 13, roofB + 14, 26, 22, 3, '#ffd98a', OUT, 2);
    line(g, wx, roofB + 14, wx, roofB + 36, '#5a3d22', 2);
    line(g, wx - 13, roofB + 25, wx + 13, roofB + 25, '#5a3d22', 2);
  }
  rrect(g, doorX - 18, y + h - 42, 36, 42, [14, 14, 0, 0], '#5a3a20', OUT, 2.5);
  line(g, doorX, y + h - 40, doorX, y + h, '#3e2814', 1.5);
  circle(g, doorX + 9, y + h - 20, 2, '#e8c15a');
  // gabled roof
  const rx = x - 12, ry = y - 14, rw = w + 24, rh = roofB - ry + 8, mid = ry + rh * 0.45;
  rrect(g, rx, ry, rw, rh, 6, b.roof);
  g.save(); g.beginPath(); g.roundRect(rx, ry, rw, rh, 6); g.clip();
  g.fillStyle = shade(b.roof, 0.12); g.fillRect(rx, ry, rw, mid - ry);
  g.fillStyle = shade(b.roof, -0.15); g.fillRect(rx, mid, rw, ry + rh - mid);
  let row = 0;
  for (let sy = ry + 12; sy < ry + rh; sy += 12, row++) {
    line(g, rx, sy, rx + rw, sy, 'rgba(0,0,0,0.18)', 1.5);
    for (let sx = rx + (row % 2) * 14; sx < rx + rw; sx += 28) line(g, sx, sy - 12, sx, sy, 'rgba(0,0,0,0.12)', 1.2);
  }
  g.restore();
  rrect(g, rx, ry, rw, rh, 6, null, OUT, 3);
  line(g, rx + 4, mid, rx + rw - 4, mid, shade(b.roof, -0.4), 4);
  if (b.chimney) {
    const cx = x + w * b.chimney, cy = ry + 10;
    rrect(g, cx, cy, 28, 30, 3, '#8a8478', OUT, 2);
    rrect(g, cx + 4, cy + 3, 20, 10, 2, '#2a2620');
    b.smoke = { x: cx + 14, y: cy + 6 };
  }
  if (b.name) {
    g.font = '700 15px Cinzel, Georgia, serif';
    const sw = g.measureText(b.name).width + 34;
    rrect(g, doorX - sw / 2, roofB - 28, sw, 28, 5, '#3a2a1a', '#c9a65a', 2);
    g.fillStyle = '#f0d48a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.name, doorX, roofB - 13);
    g.textBaseline = 'alphabetic';
  }
}

function drawTree(g, x, y, s, r) {
  ellipse(g, x + 12 * s, y + 14 * s, 34 * s, 22 * s, 0, 'rgba(0,0,0,0.25)');
  circle(g, x, y + 6 * s, 6 * s, '#5a3d22');
  const blobs = [];
  for (let k = 0; k < 5; k++) {
    const a = r() * TAU, d = r() * 13 * s;
    blobs.push([x + Math.cos(a) * d, y - 6 * s + Math.sin(a) * d, (15 + r() * 8) * s]);
  }
  for (const [bx, by, br] of blobs) circle(g, bx, by, br + 2, '#1f3d1c');
  for (const [bx, by, br] of blobs) circle(g, bx, by, br, '#346f2c');
  for (const [bx, by, br] of blobs) circle(g, bx - br * 0.25, by - br * 0.3, br * 0.55, '#438a38');
  for (const [bx, by, br] of blobs) circle(g, bx - br * 0.35, by - br * 0.45, br * 0.22, '#56a046');
}

function flagstones(g, x, y, w, h, r, base, cell = 26) {
  for (let gy = y; gy < y + h; gy += cell) {
    for (let gx = x + ((gy / cell) % 2) * cell / 2; gx < x + w; gx += cell) {
      const c = ['#b1aa99', '#9d9686', '#aaa392', '#a49d8c'][Math.floor(r() * 4)];
      rrect(g, gx + 1.5 + r() * 2, gy + 1.5 + r() * 2, cell - 4, cell - 4, 4, base ? shade(base, (r() - 0.5) * 0.12) : c, 'rgba(50,45,38,0.35)', 1);
    }
  }
}

function buildTownLayer(scale) {
  const c = document.createElement('canvas');
  c.width = Math.round(WORLD.w * scale); c.height = Math.round(WORLD.h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  const r = rng(7);
  const { w: W, h: H } = WORLD;

  // grass
  g.fillStyle = '#5d8c3c'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) ellipse(g, r() * W, r() * H, 10 + r() * 40, 6 + r() * 24, r() * 3, r() < 0.5 ? 'rgba(40,80,30,0.12)' : 'rgba(140,190,90,0.10)');
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H;
    line(g, x, y, x - 1.5, y - 4, 'rgba(45,90,32,0.6)', 1.2);
    line(g, x + 2, y, x + 3, y - 4.5, 'rgba(45,90,32,0.6)', 1.2);
  }
  const flowers = ['#f2e27a', '#f2a0c0', '#ffffff', '#a0c8ff'];
  for (let i = 0; i < 320; i++) circle(g, r() * W, r() * H, 1.8, flowers[Math.floor(r() * 4)]);

  // dirt paths
  const paths = [
    [1200, 960, 950, 945, 710, 950],
    [1200, 960, 1200, 650],
    [1200, 470, 1200, 330],
    [1200, 960, 1600, 920, 2040, 935],
    [1200, 960, 1500, 1100, 1610, 1210],
    [1200, 960, 1200, 1700],
  ];
  for (const [lw, col] of [[80, '#7d6544'], [68, '#b8996a']]) {
    for (const p of paths) {
      tracePath(g, p); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = col; g.stroke();
    }
  }
  for (const p of paths) {
    for (let i = 0; i + 3 < p.length; i += 2) {
      const len = Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
      for (let d = 0; d < len; d += 9) {
        const q = d / len, ox = (r() - 0.5) * 56, oy = (r() - 0.5) * 56;
        circle(g, p[i] + (p[i + 2] - p[i]) * q + ox, p[i + 1] + (p[i + 3] - p[i + 1]) * q + oy, 1 + r() * 2, r() < 0.5 ? 'rgba(120,95,60,0.5)' : 'rgba(220,200,160,0.4)');
      }
    }
  }

  // central plaza
  const P = TOWN.plaza;
  circle(g, P.x, P.y, P.r + 10, '#6f6a5c');
  g.save(); g.beginPath(); g.arc(P.x, P.y, P.r, 0, TAU); g.clip();
  g.fillStyle = '#8f8878'; g.fillRect(P.x - P.r, P.y - P.r, P.r * 2, P.r * 2);
  flagstones(g, P.x - P.r, P.y - P.r, P.r * 2, P.r * 2, r, null, 24);
  g.restore();
  circle(g, P.x, P.y, P.r - 40, null, 'rgba(210,190,140,0.5)', 3);

  // terrace of boss statues + portal plaza
  const T = TOWN.terrace;
  rrect(g, T.x - 6, T.y - 6, T.w + 12, T.h + 12, 12, '#5f5a50');
  g.save(); g.beginPath(); g.roundRect(T.x, T.y, T.w, T.h, 10); g.clip();
  g.fillStyle = '#8e8778'; g.fillRect(T.x, T.y, T.w, T.h);
  flagstones(g, T.x, T.y, T.w, T.h, r, '#8f8879', 30);
  g.restore();
  const PO = TOWN.portal;
  circle(g, PO.x, PO.y, 172, '#4f4a5c');
  g.save(); g.beginPath(); g.arc(PO.x, PO.y, 164, 0, TAU); g.clip();
  g.fillStyle = '#6f6a7a'; g.fillRect(PO.x - 170, PO.y - 170, 340, 340);
  flagstones(g, PO.x - 170, PO.y - 170, 340, 340, r, '#77718a', 30);
  g.restore();

  // tavern deck where the heroes wait
  const D = TOWN.deck;
  rrect(g, D.x + 6, D.y + 8, D.w, D.h, 8, 'rgba(0,0,0,0.25)');
  rrect(g, D.x, D.y, D.w, D.h, 8, '#8a6a44', '#4a3420', 3);
  for (let y = D.y + 18; y < D.y + D.h; y += 18) line(g, D.x + 4, y, D.x + D.w - 4, y, 'rgba(60,40,20,0.45)', 1.5);
  for (let y = D.y + 9; y < D.y + D.h; y += 18) for (let x = D.x + 20 + (y % 36) * 2; x < D.x + D.w; x += 90) line(g, x, y - 9, x, y + 9, 'rgba(60,40,20,0.35)', 1.2);
  ['tank', 'dps', 'healer'].forEach((role, i) => {
    const s = lineupSpot(i, 0);
    for (let col = 0; col < 3; col++) {
      const p = lineupSpot(i, col);
      ellipse(g, p.x, p.y + 4, 28, 20, 0, 'rgba(120,30,30,0.55)', 'rgba(230,190,110,0.6)', 2);
    }
    g.font = '700 13px Cinzel, Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = ROLES[role].color;
    g.fillText(role === 'dps' ? 'DPS' : ROLES[role].name.toUpperCase() + 'S', D.x + 16, s.y);
    g.textBaseline = 'alphabetic';
  });

  // training yard
  const Y = TOWN.yard;
  rrect(g, Y.x, Y.y, Y.w, Y.h, 8, '#a88d62');
  for (let i = 0; i < 500; i++) circle(g, Y.x + r() * Y.w, Y.y + r() * Y.h, 1 + r() * 1.6, r() < 0.5 ? 'rgba(120,95,60,0.5)' : 'rgba(230,210,170,0.4)');
  const fence = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 40));
    line(g, x1, y1 - 3, x2, y2 - 3, '#5a3d22', 3); line(g, x1, y1 + 3, x2, y2 + 3, '#5a3d22', 3);
    for (let i = 0; i <= n; i++) circle(g, x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, 4.5, '#7a5636', OUT, 1.5);
  };
  fence(Y.x, Y.y, Y.x + Y.w, Y.y);
  fence(Y.x + Y.w, Y.y, Y.x + Y.w, Y.y + Y.h);
  fence(Y.x, Y.y + Y.h, Y.x + Y.w, Y.y + Y.h);
  fence(Y.x, Y.y, Y.x, Y.y + 100);
  fence(Y.x, Y.y + 200, Y.x, Y.y + Y.h);
  g.font = '700 14px Cinzel, Georgia, serif'; g.textAlign = 'center';
  rrect(g, Y.x + Y.w / 2 - 80, Y.y + 14, 160, 26, 5, '#3a2a1a', '#c9a65a', 2);
  g.fillStyle = '#f0d48a'; g.textBaseline = 'middle'; g.fillText('Training Yard', Y.x + Y.w / 2, Y.y + 27); g.textBaseline = 'alphabetic';

  // statue pedestals
  TOWN.pedestals.forEach((pd, i) => {
    circle(g, pd.x + 6, pd.y + 8, 62, 'rgba(0,0,0,0.3)');
    circle(g, pd.x, pd.y, 60, '#9a9384', '#5f5a50', 3);
    circle(g, pd.x, pd.y, 48, '#aba493');
    circle(g, pd.x, pd.y, 54, null, 'rgba(201,166,90,0.6)', 1.5);
    const boss = BOSSES[i];
    g.font = '700 13px Cinzel, Georgia, serif';
    const tw = g.measureText(boss.name).width + 28;
    rrect(g, pd.x - tw / 2, pd.y + 66, tw, 24, 4, '#3a3226', '#c9a65a', 1.5);
    g.fillStyle = '#f0d48a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(boss.name, pd.x, pd.y + 78);
    g.textBaseline = 'alphabetic';
  });

  // raid portal ring
  circle(g, PO.x, PO.y, PO.r + 16, '#3b3548', OUT, 3);
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8;
    const sx = PO.x + Math.cos(a) * (PO.r + 8), sy = PO.y + Math.sin(a) * (PO.r + 8);
    circle(g, sx, sy, 7, '#6a6280', OUT, 1.5);
    circle(g, sx, sy, 2.5, '#d0b0ff');
  }
  circle(g, PO.x, PO.y, PO.r, '#1a1426', OUT, 2);
  g.font = '700 13px Cinzel, Georgia, serif';
  rrect(g, PO.x - 70, PO.y + PO.r + 34, 140, 24, 4, '#2a2238', '#a080e0', 1.5);
  g.fillStyle = '#e0d0ff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('Raid Portal', PO.x, PO.y + PO.r + 46); g.textBaseline = 'alphabetic';

  // fountain basin
  const F = TOWN.fountain;
  circle(g, F.x + 5, F.y + 7, F.r + 12, 'rgba(0,0,0,0.25)');
  circle(g, F.x, F.y, F.r + 10, '#9a9384', OUT, 3);
  circle(g, F.x, F.y, F.r, '#5a5448');
  circle(g, F.x, F.y, F.r - 6, '#3b86c0');
  circle(g, F.x - 14, F.y - 16, F.r * 0.5, 'rgba(255,255,255,0.08)');

  // props
  for (const [x, y] of [[226, 560], [222, 598], [232, 690]]) {
    circle(g, x + 3, y + 4, 14, 'rgba(0,0,0,0.25)');
    circle(g, x, y, 13, '#8a5a2e', OUT, 2);
    circle(g, x, y, 9, null, '#5a3a1a', 1.5);
    circle(g, x - 3, y - 3, 3, 'rgba(255,255,255,0.15)');
  }
  for (const [x, y] of [[1860, 870], [1872, 840]]) {
    rrect(g, x - 13, y - 13, 26, 26, 3, '#9a7040', OUT, 2);
    line(g, x - 11, y - 11, x + 11, y + 11, '#6a4a28', 2);
    line(g, x + 11, y - 11, x - 11, y + 11, '#6a4a28', 2);
  }
  poly(g, [1950, 955, 1985, 955, 1980, 963, 1990, 972, 1945, 972, 1955, 963], '#5a5f68', OUT, 2);
  for (const l of TOWN.lamps) { circle(g, l.x + 3, l.y + 4, 9, 'rgba(0,0,0,0.3)'); circle(g, l.x, l.y, 7, '#3a3226', OUT, 2); }

  // buildings, then trees on top
  for (const b of [TOWN.tavern, TOWN.smithy, ...TOWN.houses]) drawBuilding(g, b);
  const tr = rng(99);
  for (const [x, y, s] of [...TOWN.trees].sort((a, b) => a[1] - b[1])) drawTree(g, x, y, s, tr);

  return c;
}

// ---------------------------------------------------------------------------
// Animated decorations (drawn every frame)

function drawTownDynamic(ctx, t) {
  // fountain ripples and spray
  const F = TOWN.fountain;
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.5 + i / 3) % 1;
    circle(ctx, F.x, F.y, 18 + q * (F.r - 26), null, rgba('#d8f0ff', 0.5 * (1 - q)), 2);
  }
  circle(ctx, F.x, F.y, 16, '#9a9384', OUT, 2.5);
  circle(ctx, F.x, F.y, 9, '#5aa8e0');
  for (let k = 0; k < 10; k++) {
    const a = k * TAU / 10 + t * 0.3, q = (t * 1.2 + k * 0.1) % 1;
    const d = 10 + q * 32, h = Math.sin(q * Math.PI) * 16;
    circle(ctx, F.x + Math.cos(a) * d, F.y + Math.sin(a) * d - h, 2, rgba('#e8f8ff', 0.85));
  }

  // portal swirl
  const P = TOWN.portal;
  glow(ctx, P.x, P.y, P.r * 1.9, '#a06bff', 0.35 + Math.sin(t * 2) * 0.05);
  ctx.save(); ctx.beginPath(); ctx.arc(P.x, P.y, P.r - 4, 0, TAU); ctx.clip();
  const gr = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, P.r);
  gr.addColorStop(0, '#f0d8ff'); gr.addColorStop(0.35, '#9a5cf0'); gr.addColorStop(1, '#2a0f52');
  ctx.fillStyle = gr; ctx.fillRect(P.x - P.r, P.y - P.r, P.r * 2, P.r * 2);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const q = k / 30, a = t * 1.5 + i * TAU / 5 + q * 4, rr = q * (P.r - 4);
      const px = P.x + Math.cos(a) * rr, py = P.y + Math.sin(a) * rr;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = rgba('#e8d0ff', 0.35); ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4 + t * 0.5, q = (t * 0.4 + i * 0.13) % 1, rr = P.r * 1.4 * (1 - q);
    circle(ctx, P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr - q * 10, 2 * (1 - q) + 0.5, rgba('#e0c8ff', 0.8 * q));
  }

  // lamp flames
  TOWN.lamps.forEach((l, i) => {
    const fl = Math.sin(t * 9 + i * 2) * 0.05 + Math.sin(t * 23 + i) * 0.03;
    glow(ctx, l.x, l.y, 46, '#ffb347', 0.3 + fl);
    flame(ctx, l.x, l.y - 2, 3.5, t + i);
  });

  // forge glow and sparks
  glow(ctx, 2124, 880, 36, '#ff7a1a', 0.45 + Math.sin(t * 7) * 0.08);
  const sq = (t % 1.4) / 1.4;
  if (sq < 0.4) {
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.35, d = sq * 90;
      circle(ctx, 1968 + Math.cos(a) * d, 955 + Math.sin(a) * d + sq * sq * 120, 1.8, rgba('#ffd27a', 1 - sq / 0.4));
    }
  }
}

function drawSmoke(ctx, t) {
  for (const b of [TOWN.tavern, TOWN.smithy, ...TOWN.houses]) {
    if (!b.smoke) continue;
    const dark = b === TOWN.smithy;
    for (let i = 0; i < 6; i++) {
      const q = (t * 0.22 + i / 6) % 1;
      circle(ctx, b.smoke.x + q * 34 + Math.sin(t + i) * 4, b.smoke.y - q * 90, 7 + q * 16, rgba(dark ? '#8a8a8a' : '#e0e0e0', 0.45 * (1 - q)));
    }
  }
}
