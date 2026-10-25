// The town hub map: layout, colliders, a pre-rendered static layer, and animated decorations.

const WORLD = { w: 2400, h: 1700 };

const TOWN = {
  tavern: { x: 260, y: 470, w: 380, h: 290, name: 'The Gilded Tankard', roof: '#8a3b2a', wall: '#d9c6a0', chimney: 0.72, windows: [0.14, 0.31, 0.69, 0.86] },
  smithy: { x: 1900, y: 690, w: 280, h: 220, name: 'Forge', roof: '#5c6470', wall: '#b0a38a', chimney: 0.12 },
  houses: [
    { x: 160, y: 1250, w: 210, h: 170, roof: '#4f6e9a', wall: '#d8cbb0' },
    { x: 820, y: 1300, w: 230, h: 170, roof: '#7a5a3a', wall: '#d8cbb0', chimney: 0.7 },
    { x: 1420, y: 1400, w: 210, h: 160, roof: '#8a3b2a', wall: '#d8cbb0' },
    { x: 2050, y: 380, w: 200, h: 160, roof: '#3e5a48', wall: '#cfc3a6', chimney: 0.25, name: 'Practice Hall', hall: true },
    { x: 170, y: 150, w: 200, h: 160, roof: '#7a5a3a', wall: '#d8cbb0' },
  ],
  plaza: { x: 1200, y: 960, r: 240 },
  fountain: { x: 1200, y: 960, r: 72 },
  // the portal terrace: one portal per set of bosses, side by side (TOWN.portals, below); the Trophy Hall building (TOWN.trophy) stands north of it
  terrace: { x: 680, y: 556, w: 1040, h: 216 },
  deck: { x: 240, y: 780, w: 470, h: 340 },
  keeper: { x: 560, y: 805 },
  trainer: { x: 1664, y: 1112 },   // the Talent Trainer, just inside the Training Yard gate
  yard: { x: 1600, y: 1060, w: 520, h: 300 },
  dummies: [{ x: 1730, y: 1210 }, { x: 1870, y: 1170 }, { x: 2010, y: 1230 }],
  // the Trophy Hall as a building in town (drawTrophyBuilding), its door facing the terrace. Stepping onto the pad at its door carries you
  // inside (main.js trophyStep); `out` is where you are set down coming back, just south of the door.
  trophy: { x: 1050, y: 300, w: 300, h: 230, name: 'Trophy Hall', pad: { x: 1200, y: 556, r: 32 }, out: { x: 1244, y: 632 } },
  // the Trophy Hall's inside: its own pocket of the map east of the town, outside WORLD (the room is TOWN.room; nothing walks between
  // the two but the pads). Every boss statue, a row of four per set in BOSSES' order (set 1 at the back, the newest set at the front).
  // Its depth is the limit: another set's row wants the room taller. `door` is the pad's alcove between its two pillars; `from` is
  // where you are set down coming in, just north of the pad.
  room: { x: 2700, y: 0, w: 1272, h: 700 },
  hall: { x: 2800, y: 60, w: 1072, h: 580, door: { x: 3236, w: 200 }, cols: [2931, 3201, 3471, 3741], rows: [156, 312, 468], pad: { x: 3336, y: 556, r: 32 }, from: { x: 3336, y: 498 } },
  pedestals: [],   // (the twelve statue spots, filled from the hall just below)
  portals: [],     // (the four portals, filled just below)
  lamps: [],
  trees: [],
  spawn: { x: 1200, y: 1180 },
  // the Arena (PvP, pvp-ui.js draws it): a stone pit south of the Training Yard, its gate on the north rim
  arena: { x: 1990, y: 1405, w: 230, h: 160, door: { x: 2105, y: 1398 } },
  // the Barrow Gate (barrow-gate.js draws it): the way back into the Hollow King's hall for the spec trials, north-east of the
  // Trophy Hall building, its stepping stones running to the building's east wall. It only exists once a hero has cleared the Hollow King.
  barrow: { x: 1600, y: 300 },
};

// whether a point is in the Trophy Hall's room (east of the town, outside WORLD) rather than in the town
const inTrophyRoom = e => e.x > WORLD.w;
// keep a point inside the town, or inside the room when it is already there (a destination is judged by `from`, where the mover stands now)
function townClamp(e, m = 40, from = e) {
  const R = TOWN.room;
  if (inTrophyRoom(from)) { e.x = clamp(e.x, R.x + m, R.x + R.w - m); e.y = clamp(e.y, R.y + m, R.y + R.h - m); }
  else { e.x = clamp(e.x, m, WORLD.w - m); e.y = clamp(e.y, m, WORLD.h - m); }
}

// the statues in the hall are a little smaller than the old terrace's: pedestal, plaque, trophy and statue all scale by this
const PED_S = 0.9;
TOWN.hall.rows.forEach(y => TOWN.hall.cols.forEach(x => TOWN.pedestals.push({ x, y })));
// one portal per set, in a row on the terrace (the old statue row); the fourth is shrouded and does nothing yet (the ultimate raid)
TOWN.portals = [
  { id: 'kings-road', set: 1, name: "The King's Road", x: 780, y: 658, r: 52 },
  { id: 'wild-realm', set: 2, name: 'The Wild Realm', x: 1020, y: 658, r: 52 },
  { id: 'fallen-star', set: 3, name: 'The Fallen Star', x: 1380, y: 658, r: 52 },
  { id: 'sealed', set: 0, name: null, sealed: true, x: 1620, y: 658, r: 52 },
];
// how each set's portal looks: the swirl's colours (the ring is drawn by drawPortalRing)
const PORTAL_LOOK = {
  1: { glow: '#a06bff', c0: '#f0d8ff', c1: '#9a5cf0', c2: '#2a0f52', arm: '#e8d0ff', mote: '#e0c8ff', rune: '#d0b0ff' },
  2: { glow: '#9be05a', c0: '#f6f2b0', c1: '#6cb83e', c2: '#10301a', arm: '#e4f2a0', mote: '#e8e49a', rune: '#c8e87a' },
  3: { glow: '#8fb0ff', c0: '#f6f9ff', c1: '#4c6cd6', c2: '#050920', arm: '#d4e2ff', mote: '#eef4ff', rune: '#b8ccff' },
};

const COLLIDERS = { rects: [], circles: [] };

// where the col-th of n heroes of a role waits on the deck: three spread out, more packed closer so they all fit
function lineupSpot(roleIdx, col, n = 3) { const gap = n <= 3 ? 110 : Math.min(110, 330 / (n - 1)); return { x: 500 + (col - (n - 1) / 2) * gap, y: 870 + roleIdx * 90 }; }

function initTown() {
  const r = rng(42);
  const t = TOWN.trees;
  // (no trees against the Trophy Hall building)
  const Tb = TOWN.trophy, nearTrophy = (x, y) => (x > Tb.x - 70 && x < Tb.x + Tb.w + 70 && y > Tb.y - 50 && y < Tb.y + Tb.h + 40);
  for (let x = 30; x < WORLD.w; x += 75) {
    const tx = x + r() * 20, ty = 30 + r() * 30, ts = 1 + r() * 0.3;
    if (!nearTrophy(tx, ty)) t.push([tx, ty, ts]);
    if (Math.abs(x - 1200) > 100) t.push([x + r() * 20, WORLD.h - 40 - r() * 30, 1 + r() * 0.3]);
  }
  for (let y = 110; y < WORLD.h - 80; y += 75) {
    t.push([30 + r() * 30, y + r() * 20, 1 + r() * 0.3]);
    t.push([WORLD.w - 40 - r() * 30, y + r() * 20, 1 + r() * 0.3]);
  }
  for (const [x, y] of [[650, 230], [1790, 220], [2270, 1030], [2260, 1400], [140, 720],
    [140, 1060], [560, 1500], [1720, 1560], [1960, 1520], [480, 300], [900, 1190], [1450, 1260], [1900, 380]]) {
    const s = 1.1 + r() * 0.3;
    if (nearTrophy(x, y)) continue;   // (the random draw stays so every other tree is unchanged)
    t.push([x, y, s]);
  }
  // the old hall's ground is lawn again: a few more trees about the building and the Barrow Gate's stones (their own draws, after all the others)
  const r2 = rng(311);
  for (const [x, y] of [[790, 190], [905, 335], [1010, 150], [835, 440], [975, 480], [1465, 135], [1425, 485], [1750, 520], [1690, 140], [760, 330]]) t.push([x + r2() * 14, y + r2() * 14, 1.1 + r2() * 0.3]);
  for (const a of [0.25, 0.75, 1.25, 1.75]) {
    TOWN.lamps.push({ x: TOWN.plaza.x + Math.cos(a * Math.PI) * 270, y: TOWN.plaza.y + Math.sin(a * Math.PI) * 270 });
  }
  TOWN.lamps.push({ x: 700, y: 790 }, { x: 700, y: 1110 }, { x: 690, y: 650 }, { x: 1710, y: 650 });

  for (const b of [TOWN.tavern, TOWN.smithy, ...TOWN.houses, TOWN.trophy]) COLLIDERS.rects.push({ x: b.x, y: b.y, w: b.w, h: b.h });
  for (const px of [TOWN.trophy.x - 26, TOWN.trophy.x + TOWN.trophy.w + 26]) COLLIDERS.circles.push({ x: px, y: TOWN.trophy.y + TOWN.trophy.h - 4, r: 16 });   // (the brazier pillars either side of its steps)
  if (TOWN.arena) COLLIDERS.rects.push({ x: TOWN.arena.x, y: TOWN.arena.y + 14, w: TOWN.arena.w, h: TOWN.arena.h - 14 });
  for (const [x, y, s] of t) COLLIDERS.circles.push({ x, y: y + 4, r: 18 * s });
  for (const p of TOWN.pedestals) COLLIDERS.circles.push({ x: p.x, y: p.y, r: 58 * PED_S });
  // the room's walls: back, west, east and the front, with a pillar each side of the pad's alcove
  const HL = TOWN.hall, hx1 = HL.x + HL.w, hy1 = HL.y + HL.h, dx0 = HL.door.x, dx1 = HL.door.x + HL.door.w;
  COLLIDERS.rects.push({ x: HL.x, y: 0, w: HL.w, h: HL.y + 44 }, { x: HL.x, y: HL.y, w: 26, h: HL.h }, { x: hx1 - 26, y: HL.y, w: 26, h: HL.h },
    { x: HL.x, y: hy1 - 24, w: HL.w, h: 24 });
  COLLIDERS.circles.push({ x: dx0, y: hy1 - 12, r: 16 }, { x: dx1, y: hy1 - 12, r: 16 });
  for (const p of TOWN.portals) if (p.sealed) COLLIDERS.circles.push({ x: p.x, y: p.y, r: p.r + 6 });   // (the shrouded one is solid)
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
  townClamp(e);
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

// ---------------------------------------------------------------------------
// The Trophy Hall (the building north of the portal terrace, and its room), the teleporter pads and the four portals

// a column at the hall's door: stone shaft, a capital, and a brazier bowl on top (its flame is drawn each frame)
function drawHallPillar(g, x, y) {
  ellipse(g, x + 8, y + 6, 24, 9, 0, 'rgba(0,0,0,0.3)');
  rrect(g, x - 20, y - 8, 40, 18, 3, '#9a9484', OUT, 2);
  rrect(g, x - 11, y - 54, 22, 48, 2, '#aaa493', OUT, 2);
  rrect(g, x - 11, y - 54, 7, 48, 2, 'rgba(255,255,255,0.16)');
  rrect(g, x + 4, y - 54, 7, 48, 2, 'rgba(0,0,0,0.16)');
  rrect(g, x - 17, y - 64, 34, 12, 3, '#b3ad9b', OUT, 2);
  ellipse(g, x, y - 69, 15, 6, 0, '#3a3226', OUT, 2);
  ellipse(g, x, y - 70, 10, 3.5, 0, '#d8541f');
}

// the room inside the Trophy Hall (drawn once into the room's own layer)
function drawHall(g) {
  const H = TOWN.hall, r = rng(281), x0 = H.x, y0 = H.y, x1 = H.x + H.w, y1 = H.y + H.h, dx0 = H.door.x, dx1 = H.door.x + H.door.w;
  const mx = (x0 + x1) / 2;
  // plinth and floor
  rrect(g, x0 - 8, y0 + 6, H.w + 16, H.h + 8, 14, 'rgba(0,0,0,0.28)');
  rrect(g, x0 - 5, y0 - 5, H.w + 10, H.h + 10, 12, '#5a564b');
  g.save(); g.beginPath(); g.roundRect(x0, y0, H.w, H.h, 8); g.clip();
  g.fillStyle = '#7f7a6c'; g.fillRect(x0, y0, H.w, H.h);
  flagstones(g, x0, y0, H.w, H.h, r, '#85806f', 36);
  // one band of inlay per set: gold for the King's Road, green for the wild, pale blue for the star, with a small sign at each end
  const BAND = [['201,166,90', '#e8c15a'], ['127,191,74', '#9bd05a'], ['159,180,236', '#cfdcff']];
  H.rows.forEach((ry, k) => {
    const [rgb, solid] = BAND[k] || BAND[0], top = ry - 62, bot = ry + 88;
    g.fillStyle = 'rgba(' + rgb + ',0.12)'; g.fillRect(x0 + 26, top, H.w - 52, bot - top);
    g.strokeStyle = 'rgba(' + rgb + ',0.5)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x0 + 26, top); g.lineTo(x1 - 26, top); g.moveTo(x0 + 26, bot); g.lineTo(x1 - 26, bot); g.stroke();
    for (const sx of [x0 + 52, x1 - 52]) {
      circle(g, sx, ry + 12, 17, 'rgba(60,56,48,0.55)', 'rgba(' + rgb + ',0.7)', 1.5);
      if (k === 0) poly(g, [sx - 9, ry + 19, sx - 10, ry + 6, sx - 4, ry + 11, sx, ry + 3, sx + 4, ry + 11, sx + 10, ry + 6, sx + 9, ry + 19], solid, OUT, 1);
      else if (k === 1) { poly(g, [sx, ry + 22, sx - 8, ry + 12, sx, ry + 2, sx + 8, ry + 12], solid, OUT, 1); line(g, sx, ry + 21, sx, ry + 5, 'rgba(30,60,20,0.6)', 1); }
      else poly(g, [sx, ry - 2, sx + 3, ry + 9, sx + 12, ry + 12, sx + 3, ry + 15, sx, ry + 26, sx - 3, ry + 15, sx - 12, ry + 12, sx - 3, ry + 9], solid, OUT, 1);
    }
  });
  // the runner down the middle, from the pad to the back wall, and a pale star in it where the third row's statues meet
  rrect(g, mx - 42, y0 + 46, 84, H.h - 46, 0, '#5c2b36');
  g.strokeStyle = 'rgba(201,166,90,0.65)'; g.lineWidth = 2; g.strokeRect(mx - 40, y0 + 46, 80, H.h - 46);
  g.strokeStyle = 'rgba(201,166,90,0.3)'; g.lineWidth = 1; g.strokeRect(mx - 33, y0 + 46, 66, H.h - 46);
  for (let y = y0 + 70; y < y1 - 20; y += 44) poly(g, [mx, y - 7, mx + 6, y, mx, y + 7, mx - 6, y], 'rgba(201,166,90,0.38)');
  const sy = H.rows[2] - 8;
  poly(g, [mx, sy - 24, mx + 5, sy - 5, mx + 24, sy, mx + 5, sy + 5, mx, sy + 24, mx - 5, sy + 5, mx - 24, sy, mx - 5, sy - 5], 'rgba(214,224,244,0.7)', 'rgba(70,76,96,0.6)', 1.2);
  g.restore();
  // side walls (low, with a cap) and the back wall (a stone face with arched niches and banners)
  for (const wx of [x0, x1 - 26]) {
    rrect(g, wx, y0, 26, H.h, 4, '#8f897a', OUT, 2.5);
    rrect(g, wx + (wx === x0 ? 18 : 2), y0 + 44, 6, H.h - 70, 2, 'rgba(255,255,255,0.15)');
    for (let wy = y0 + 70; wy < y1 - 30; wy += 54) line(g, wx + 2, wy, wx + 24, wy, 'rgba(40,36,28,0.3)', 1.2);
  }
  rrect(g, x0, y0, H.w, 46, [10, 10, 0, 0], '#968f7e', OUT, 2.5);
  rrect(g, x0 + 3, y0 + 3, H.w - 6, 8, [8, 8, 0, 0], '#aaa493');
  for (let by = y0 + 24; by < y0 + 44; by += 10) line(g, x0 + 4, by, x1 - 4, by, 'rgba(40,36,28,0.28)', 1.2);
  for (let k = 0; k < 9; k++) {
    const nx = x0 + 76 + k * 115;
    rrect(g, nx - 15, y0 + 15, 30, 31, [15, 15, 0, 0], '#3e3a32', OUT, 1.5);
    glow(g, nx, y0 + 34, 20, '#ffb347', 0.12);
    if (k % 2 === 1) {   // a banner hung from the cap: deep red with gold trim
      poly(g, [nx - 13, y0 + 8, nx + 13, y0 + 8, nx + 13, y0 + 60, nx, y0 + 52, nx - 13, y0 + 60], '#6a2a34', OUT, 1.6);
      line(g, nx - 13, y0 + 12, nx + 13, y0 + 12, '#c9a65a', 2);
      circle(g, nx, y0 + 30, 5, null, '#c9a65a', 1.4);
    }
  }
  // the front: a low wall with a baluster rail along it, and a pillar each side of the pad's alcove (a recess in the wall, floored in darker stone)
  rrect(g, x0, y1 - 24, H.w, 24, 4, '#8f897a', OUT, 2.5);
  rrect(g, x0 + 2, y1 - 22, H.w - 4, 5, 2, '#aaa493');
  for (let bx = x0 + 16; bx < x1 - 10; bx += 24) if (bx < dx0 - 14 || bx > dx1 + 14) rrect(g, bx - 4, y1 - 15, 8, 11, 2, '#a39d8c', 'rgba(40,36,28,0.5)', 1);
  rrect(g, dx0, y1 - 24, H.door.w, 24, 3, '#3f3b33', OUT, 2);
  rrect(g, dx0 + 6, y1 - 20, H.door.w - 12, 16, 2, '#4d483e');
  drawHallPillar(g, dx0, y1 - 12); drawHallPillar(g, dx1, y1 - 12);
  drawTeleporterBase(g, H.pad);
}

// the Trophy Hall as it stands in town: a slate roof over a pediment with a gold cup in it, a stone front with four columns, a tall door
// between two lit windows, the name on a beam over the door, and a brazier pillar either side of the steps. The pad at the door is the way in.
function drawTrophyBuilding(g, b) {
  const { x, y, w, h } = b, cx = x + w / 2, wallH = 130, roofB = y + h - wallH, bot = y + h;
  const stone = '#b9b3a2', hi = '#cdc7b6', lo = '#9a9484', slate = '#4d5866';
  rrect(g, x + 12, y + 16, w, h, 6, 'rgba(0,0,0,0.25)');
  // the roof: slate in two pitches, a pale ridge band
  const rx = x - 14, ry = y - 14, rw = w + 28, rh = roofB - ry + 8, mid = ry + rh * 0.45;
  rrect(g, rx, ry, rw, rh, 6, slate);
  g.save(); g.beginPath(); g.roundRect(rx, ry, rw, rh, 6); g.clip();
  g.fillStyle = shade(slate, 0.12); g.fillRect(rx, ry, rw, mid - ry);
  g.fillStyle = shade(slate, -0.15); g.fillRect(rx, mid, rw, ry + rh - mid);
  let row = 0;
  for (let sy = ry + 12; sy < ry + rh; sy += 12, row++) {
    line(g, rx, sy, rx + rw, sy, 'rgba(0,0,0,0.2)', 1.5);
    for (let sx = rx + (row % 2) * 14; sx < rx + rw; sx += 28) line(g, sx, sy - 12, sx, sy, 'rgba(0,0,0,0.12)', 1.2);
  }
  g.restore();
  rrect(g, rx, ry, rw, rh, 6, null, OUT, 3);
  rrect(g, rx + 4, mid - 3, rw - 8, 6, 2, '#c9c2b0', OUT, 1.5);
  // the front wall: dressed stone in courses, a darker plinth course, pale quoins at the corners
  rrect(g, x, roofB - 6, w, wallH + 6, 3, stone, OUT, 2.5);
  const r = rng(x);
  for (let cy = roofB + 14, k = 0; cy < bot - 12; cy += 18, k++) {
    line(g, x + 2, cy, x + w - 2, cy, 'rgba(60,54,44,0.3)', 1.2);
    for (let jx = x + 14 + (k % 2) * 22; jx < x + w - 8; jx += 44) line(g, jx, cy, jx, cy + 18, 'rgba(60,54,44,0.2)', 1);
  }
  for (let i = 0; i < 26; i++) rrect(g, x + 6 + r() * (w - 14), roofB + 16 + r() * (wallH - 34), 14 + r() * 10, 8, 2, r() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)');
  rrect(g, x, bot - 14, w, 14, [0, 0, 3, 3], lo, OUT, 2);
  for (let q = 0; q < 6; q++) { rrect(g, x + 1, roofB + 2 + q * 20, 11, 18, 1, q % 2 ? hi : '#d7d1c0', 'rgba(60,54,44,0.4)', 1); rrect(g, x + w - 12, roofB + 2 + q * 20, 11, 18, 1, q % 2 ? '#d7d1c0' : hi, 'rgba(60,54,44,0.4)', 1); }
  // the cornice, and the pediment over the middle of it with a gold cup in a wreath
  rrect(g, x - 8, roofB - 8, w + 16, 20, 3, hi, OUT, 2);
  rrect(g, x - 5, roofB - 5, w + 10, 5, 2, '#dcd6c5');
  line(g, x - 6, roofB + 8, x + w + 6, roofB + 8, 'rgba(60,54,44,0.4)', 1.4);
  poly(g, [cx - 104, roofB - 8, cx, roofB - 72, cx + 104, roofB - 8], hi, OUT, 2.4);
  poly(g, [cx - 84, roofB - 12, cx, roofB - 59, cx + 84, roofB - 12], '#8f8979', 'rgba(40,36,28,0.5)', 1.4);
  poly(g, [cx - 84, roofB - 12, cx, roofB - 59, cx, roofB - 12], 'rgba(0,0,0,0.1)');
  for (let k = 0; k < 11; k++) {
    const a = Math.PI * 0.62 + k * Math.PI * 1.76 / 10, lx = cx + Math.cos(a) * 17, ly = roofB - 27 + Math.sin(a) * 17;
    poly(g, [lx - Math.sin(a) * 4, ly + Math.cos(a) * 4, lx + Math.cos(a) * 5, ly + Math.sin(a) * 5, lx + Math.sin(a) * 4, ly - Math.cos(a) * 4], k % 2 ? '#8aa65a' : '#a8c070', 'rgba(30,50,20,0.6)', 0.8);
  }
  poly(g, [cx - 8, roofB - 40, cx + 8, roofB - 40, cx + 6, roofB - 30, cx + 2, roofB - 26, cx - 2, roofB - 26, cx - 6, roofB - 30], '#e8c15a', OUT, 1.3);
  line(g, cx, roofB - 26, cx, roofB - 19, '#c9a65a', 2.2); rrect(g, cx - 6, roofB - 20, 12, 3.5, 1.5, '#e8c15a', OUT, 1);
  line(g, cx - 8, roofB - 38, cx - 11, roofB - 33, '#c9a65a', 1.4); line(g, cx + 8, roofB - 38, cx + 11, roofB - 33, '#c9a65a', 1.4);
  // the windows (arched, lit) and the door (arched, two leaves, studded, the light of the hall behind it)
  for (const wx of [cx - 88, cx + 88]) {
    glow(g, wx, roofB + 54, 30, '#ffcf6a', 0.3);
    rrect(g, wx - 11, roofB + 36, 22, 38, [11, 11, 2, 2], '#ffd98a', OUT, 2);
    line(g, wx, roofB + 36, wx, roofB + 74, '#5a3d22', 2); line(g, wx - 11, roofB + 58, wx + 11, roofB + 58, '#5a3d22', 2);
    rrect(g, wx - 15, roofB + 72, 30, 5, 1.5, hi, OUT, 1.4);
  }
  const dw = 60, dh = 86;
  glow(g, cx, bot - 30, 54, '#ffcf6a', 0.22);
  rrect(g, cx - dw / 2 - 5, bot - dh - 5, dw + 10, dh + 5, [dw / 2 + 5, dw / 2 + 5, 0, 0], hi, OUT, 2.2);
  rrect(g, cx - dw / 2, bot - dh, dw, dh, [dw / 2, dw / 2, 0, 0], '#4a3020', OUT, 2.4);
  g.save(); g.beginPath(); g.roundRect(cx - dw / 2, bot - dh, dw, dh, [dw / 2, dw / 2, 0, 0]); g.clip();
  g.fillStyle = 'rgba(255,200,110,0.16)'; g.fillRect(cx - dw / 2, bot - dh, dw, dh);
  for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) circle(g, cx + sd * 12, bot - 22 - k * 14, 1.7, '#c9a65a');
  g.restore();
  line(g, cx, bot - dh + 4, cx, bot, '#2a1a0c', 1.8);
  circle(g, cx - 5, bot - 36, 2.4, '#e8c15a', OUT, 1); circle(g, cx + 5, bot - 36, 2.4, '#e8c15a', OUT, 1);
  // the columns: a plinth, a fluted shaft, a capital
  for (const px of [cx - 58, cx + 58, cx - 124, cx + 124]) {
    ellipse(g, px + 7, bot - 4, 16, 6, 0, 'rgba(0,0,0,0.25)');
    rrect(g, px - 12, bot - 14, 24, 13, 2, '#a8a290', OUT, 1.8);
    rrect(g, px - 8, roofB + 12, 16, bot - 14 - roofB - 12, 1, '#cfc9b8', OUT, 1.8);
    rrect(g, px - 8, roofB + 12, 5, bot - 14 - roofB - 12, 1, 'rgba(255,255,255,0.28)');
    rrect(g, px + 3, roofB + 12, 5, bot - 14 - roofB - 12, 1, 'rgba(0,0,0,0.15)');
    line(g, px, roofB + 14, px, bot - 16, 'rgba(60,54,44,0.25)', 1);
    rrect(g, px - 12, roofB + 8, 24, 8, 2, '#d9d3c2', OUT, 1.8);
  }
  // the name beam, hung over the door
  g.font = '700 14px Cinzel, Georgia, serif';
  const sw = g.measureText(b.name).width + 34;
  rrect(g, cx - sw / 2, roofB + 17, sw, 26, 5, '#3a2a1a', '#c9a65a', 2);
  g.fillStyle = '#f0d48a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(b.name, cx, roofB + 31); g.textBaseline = 'alphabetic';
  // two low steps up to the door, and the brazier pillars either side
  rrect(g, cx - 66, bot - 3, 132, 9, 2, '#a8a290', OUT, 1.6);
  rrect(g, cx - 78, bot + 4, 156, 9, 2, '#b3ad9b', OUT, 1.6);
  drawHallPillar(g, x - 26, bot - 4); drawHallPillar(g, x + w + 26, bot - 4);
}

// a teleporter pad's stone (drawn once): a worn round slab in a rim, eight rune marks round it and a gold ring; the glow and swirl are drawn each frame
function drawTeleporterBase(g, P) {
  const { x, y, r } = P;
  circle(g, x + 4, y + 7, r + 12, 'rgba(0,0,0,0.28)');
  circle(g, x, y, r + 12, '#6a6558', OUT, 2.4);
  circle(g, x, y, r + 7, '#8d8777');
  circle(g, x, y, r + 7, null, 'rgba(201,166,90,0.55)', 1.4);
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8 + TAU / 16, sx = x + Math.cos(a) * (r + 9.5), sy = y + Math.sin(a) * (r + 9.5);
    poly(g, [sx + Math.cos(a) * 4, sy + Math.sin(a) * 4, sx - Math.sin(a) * 2.6, sy + Math.cos(a) * 2.6, sx - Math.cos(a) * 3, sy - Math.sin(a) * 3, sx + Math.sin(a) * 2.6, sy - Math.cos(a) * 2.6], '#2c2820', 'rgba(232,193,90,0.7)', 0.9);
  }
  circle(g, x, y, r + 1, '#2a2218', OUT, 2);
  circle(g, x, y, r - 3, '#1b1409');
}

// a teleporter pad's glow (drawn each frame): a warm light over the slab, four arms of gold turning in it, runes circling slowly the other way, motes rising
function drawTeleporter(ctx, P, t) {
  const { x, y, r } = P, ph = P.x * 0.013;
  glow(ctx, x, y, r * 2.3, '#ffcf70', 0.3 + Math.sin(t * 2.1 + ph) * 0.06);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 3, 0, TAU); ctx.clip();
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, '#fff3cf'); gr.addColorStop(0.4, '#e0a63e'); gr.addColorStop(1, '#2e1d08');
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const q = k / 24, a = t * 1.7 + i * TAU / 4 + q * 3.6, rr = q * (r - 3);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = 'rgba(255,240,196,0.4)'; ctx.lineWidth = 2.4; ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(-t * 0.5);
  ctx.setLineDash([2, 6]); circle(ctx, 0, 0, r - 8, null, 'rgba(255,236,170,0.65)', 1.5); ctx.setLineDash([]);
  ctx.restore();
  circle(ctx, x, y, r - 3, null, 'rgba(255,226,140,' + (0.55 + Math.sin(t * 2.6 + ph) * 0.15).toFixed(2) + ')', 1.6);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + t * 0.6, q = (t * 0.45 + i * 0.15) % 1, rr = r * 0.9 * (1 - q);
    circle(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr - q * 16, 1.9 * (1 - q) + 0.4, rgba('#ffe9a8', 0.85 * q));
  }
}

// a chain of small links from (x1, y1) to (x2, y2)
function drawChain(g, x1, y1, x2, y2, sag = 0) {
  const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / 9)), a = Math.atan2(y2 - y1, x2 - x1);
  for (let i = 0; i <= n; i++) {
    const q = i / n, px = x1 + (x2 - x1) * q, py = y1 + (y2 - y1) * q + Math.sin(q * Math.PI) * sag;
    g.save(); g.translate(px, py); g.rotate(a + (i % 2 ? Math.PI / 2 : 0));
    rrect(g, -5, -2.6, 10, 5.2, 2.6, i % 2 ? '#5f6570' : '#7a808c', OUT, 1.1);
    g.restore();
  }
}

// a portal's ring and the paved dais it stands on (drawn once; the swirl inside is drawn each frame by drawPortalDynamic)
function drawPortalRing(g, P) {
  const { x, y, r } = P, set = P.set, rr = r + 16, ca = rng(P.x);
  const dais = P.sealed ? '#6a665f' : set === 1 ? '#77718a' : set === 2 ? '#6f7c62' : '#6f7592';
  circle(g, x + 5, y + 9, 100, 'rgba(0,0,0,0.25)');
  circle(g, x, y, 98, set === 1 ? '#4f4a5c' : set === 2 ? '#4a5444' : P.sealed ? '#4a4742' : '#444a60');
  g.save(); g.beginPath(); g.arc(x, y, 92, 0, TAU); g.clip();
  g.fillStyle = dais; g.fillRect(x - 94, y - 94, 188, 188);
  flagstones(g, x - 94, y - 94, 188, 188, ca, dais, 26);
  g.restore();
  if (set === 1) {
    // the old royal gate: the violet ring with gold in it, and a crown on its crest
    circle(g, x, y, rr, '#3b3548', OUT, 3);
    circle(g, x, y, rr - 5, null, 'rgba(201,166,90,0.6)', 1.5);
    for (let k = 0; k < 8; k++) {
      const a = k * TAU / 8, sx = x + Math.cos(a) * (r + 8), sy = y + Math.sin(a) * (r + 8);
      circle(g, sx, sy, 7, '#6a6280', OUT, 1.5); circle(g, sx, sy, 2.5, k % 2 ? '#d0b0ff' : '#f0d48a');
    }
    poly(g, [x - 15, y - rr + 2, x - 16, y - rr - 14, x - 8, y - rr - 7, x, y - rr - 18, x + 8, y - rr - 7, x + 16, y - rr - 14, x + 15, y - rr + 2], '#e8c15a', OUT, 1.6);
    circle(g, x, y - rr - 5, 2.2, '#b8381c', OUT, 0.8);
  } else if (set === 2) {
    // the wild realm: a mossy ring grown over with ivy, leaves and small gold flowers
    circle(g, x, y, rr, '#46563a', OUT, 3);
    circle(g, x, y, rr - 5, null, 'rgba(201,180,90,0.45)', 1.4);
    for (let k = 0; k < 9; k++) {
      const a = k * TAU / 9 + 0.2, a0 = a - 0.32, a1 = a + 0.32;
      g.strokeStyle = '#2f5a24'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, rr - 2, a0, a1); g.stroke();
      g.strokeStyle = '#5f9a3a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, rr - 2, a0, a1); g.stroke();
    }
    for (let k = 0; k < 8; k++) {
      const a = k * TAU / 8, ca1 = Math.cos(a), sa = Math.sin(a), bx = x + ca1 * (r + 8), by = y + sa * (r + 8);
      poly(g, [bx - sa * 6, by + ca1 * 6, bx + ca1 * 17, by + sa * 17, bx + sa * 6, by - ca1 * 6], k % 2 ? '#5f9a3a' : '#8cc450', OUT, 1.3);
      line(g, bx, by, bx + ca1 * 14, by + sa * 14, 'rgba(20,50,16,0.55)', 1);
      if (k % 2 === 0) { circle(g, bx + Math.cos(a + 0.5) * 9, by + Math.sin(a + 0.5) * 9, 3.2, '#f0cf5a', OUT, 1); circle(g, bx + Math.cos(a + 0.5) * 9, by + Math.sin(a + 0.5) * 9, 1.1, '#fff4c0'); }
    }
    for (const sd of [-1, 1]) { line(g, x + sd * 22, y + rr - 2, x + sd * 34, y + rr + 16, '#3a2a18', 3); line(g, x + sd * 34, y + rr + 16, x + sd * 48, y + rr + 18, '#3a2a18', 2.4); }
  } else if (set === 3) {
    // the fallen star: cold dark stone, a pale rim, star-shaped studs, a crack across it and shards thrown up on one side
    circle(g, x, y, rr, '#262c44', OUT, 3);
    circle(g, x, y, rr - 5, null, 'rgba(184,200,240,0.55)', 1.4);
    for (let k = 0; k < 8; k++) {
      const a = k * TAU / 8, sx = x + Math.cos(a) * (r + 8), sy = y + Math.sin(a) * (r + 8);
      poly(g, [sx, sy - 8, sx + 2.2, sy - 2.2, sx + 8, sy, sx + 2.2, sy + 2.2, sx, sy + 8, sx - 2.2, sy + 2.2, sx - 8, sy, sx - 2.2, sy - 2.2], '#dfe8ff', OUT, 1.2);
    }
    for (const [a, b] of [[-0.9, -0.5], [2.2, 2.7]]) {
      g.strokeStyle = '#080b18'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + Math.cos(a) * (rr - 12), y + Math.sin(a) * (rr - 12)); g.lineTo(x + Math.cos((a + b) / 2) * (rr + 1) + 3, y + Math.sin((a + b) / 2) * (rr + 1) - 2); g.lineTo(x + Math.cos(b) * (rr + 6), y + Math.sin(b) * (rr + 6)); g.stroke();
      g.strokeStyle = 'rgba(214,228,255,0.7)'; g.lineWidth = 1; g.stroke();
    }
    poly(g, [x + 38, y - rr + 2, x + 46, y - rr - 22, x + 54, y - rr + 4], '#7f95cc', OUT, 1.4);
    poly(g, [x + 56, y - rr + 10, x + 70, y - rr - 12, x + 68, y - rr + 12], '#a0b4e4', OUT, 1.3);
    poly(g, [x + 38, y - rr + 2, x + 46, y - rr - 22, x + 46, y - rr + 3], 'rgba(255,255,255,0.35)');
    poly(g, [x - 60, y + 56, x - 70, y + 40, x - 52, y + 50], '#6c82b8', OUT, 1.2);
  } else {
    // the shrouded one: a dark iron ring, a stone seal over the opening, heavy cloth hung over the top and chains across it
    circle(g, x, y, rr, '#2c2a30', OUT, 3);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; circle(g, x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8), 6, '#454149', OUT, 1.4); }
    circle(g, x, y, r + 1, '#74706a', OUT, 2);
    circle(g, x, y, r - 10, null, 'rgba(40,36,30,0.5)', 1.6); circle(g, x, y, r - 22, null, 'rgba(40,36,30,0.4)', 1.2);
    for (const [a, b, c] of [[0.6, 0.2, 26], [2.4, 0.3, 30], [4.3, 0.25, 22]]) line(g, x + Math.cos(a) * 14, y + Math.sin(a) * 14, x + Math.cos(a + b) * (14 + c), y + Math.sin(a + b) * (14 + c), 'rgba(30,26,20,0.65)', 1.4);
    // the cloth: over the top of the ring and down across the seal, ragged at the hem
    const hem = [[-r - 14, 10], [-r + 6, 24], [-30, 14], [-14, 34], [6, 18], [26, 38], [40, 20], [r - 4, 30], [r + 14, 12]];
    const cloth = [[-r - 16, -r + 6], [-r - 4, -rr - 8], [-r * 0.5, -rr - 14], [r * 0.5, -rr - 14], [r + 4, -rr - 8], [r + 16, -r + 6]];
    const pts = []; for (const [cx, cy] of cloth) pts.push(x + cx, y + cy); for (let i = hem.length - 1; i >= 0; i--) pts.push(x + hem[i][0], y + hem[i][1]);
    poly(g, pts, '#2b2433', OUT, 2.2);
    for (const [fx, fy] of [[-r + 10, 24], [-26, 14], [-8, 34], [18, 38], [r - 10, 30]]) line(g, x + fx * 0.9, y - rr - 6, x + fx, y + fy - 4, 'rgba(120,100,150,0.35)', 1.6);
    for (const [fx, fy] of [[-r + 16, 20], [4, 30], [r - 18, 24]]) line(g, x + fx * 0.8, y - rr + 6, x + fx, y + fy - 6, 'rgba(8,6,12,0.55)', 2);
    // chains: crossed over it, ending in iron staples in the ring, and a dull gold seal where they meet
    drawChain(g, x - r - 4, y - r + 4, x + r + 4, y + r - 2, 6);
    drawChain(g, x + r + 4, y - r + 4, x - r - 4, y + r - 2, 6);
    drawChain(g, x - r - 12, y + 4, x + r + 12, y + 4, 10);
    circle(g, x, y + 4, 12, '#a88a46', OUT, 2); circle(g, x, y + 4, 8, null, 'rgba(60,44,16,0.7)', 1.2);
    circle(g, x, y + 2, 2.4, '#2a2010'); rrect(g, x - 1.2, y + 3, 2.4, 6, 1, '#2a2010');
    return;
  }
  circle(g, x, y, r, '#1a1426', OUT, 2);
}

// a portal's swirl (open) or a still dark pool with a seal in it (the set's road not yet walked)
function drawPortalDynamic(ctx, P, t, open) {
  const { x, y, r } = P;
  if (P.sealed) {
    glow(ctx, x, y + 6, r * 1.2, '#7a64b0', 0.07 + Math.sin(t * 1.3) * 0.025);   // (a little light seeping out from under the cloth)
    return;
  }
  const L = PORTAL_LOOK[P.set];
  if (!open) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 4, 0, TAU); ctx.clip();
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, shade(L.c2, 0.12)); gr.addColorStop(1, shade(L.c2, -0.45));
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.12);
    ctx.setLineDash([3, 7]); circle(ctx, 0, 0, r - 14, null, rgba(L.rune, 0.22), 1.4); ctx.setLineDash([]);
    ctx.restore();
    circle(ctx, x, y, 13, 'rgba(36,32,44,0.9)', rgba(L.rune, 0.45), 1.6);
    circle(ctx, x, y, 5, null, rgba(L.rune, 0.35), 1.2);
    return;
  }
  glow(ctx, x, y, r * 1.9, L.glow, 0.35 + Math.sin(t * 2 + P.x) * 0.05);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 4, 0, TAU); ctx.clip();
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, L.c0); gr.addColorStop(0.35, L.c1); gr.addColorStop(1, L.c2);
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const q = k / 30, a = t * 1.5 + i * TAU / 5 + q * 4, rr = q * (r - 4);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = rgba(L.arm, 0.35); ctx.lineWidth = 3; ctx.stroke();
  }
  if (P.set === 3) {
    // the meteor's glint: a bright streak crossing the pool every few seconds, and a few still stars in it
    const q = (t % 6.5) / 0.9;
    if (q < 1) {
      const hx = x + r * 0.95 - q * r * 1.5, hy = y - r * 0.8 + q * r * 1.2, tl = 0.28 * (1 - q * 0.4);
      const g2 = ctx.createLinearGradient(hx, hy, hx + r * 0.9 * tl * 2, hy - r * 0.8 * tl * 2);
      g2.addColorStop(0, 'rgba(255,255,255,0.95)'); g2.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.strokeStyle = g2; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + r * 0.9 * tl * 2, hy - r * 0.8 * tl * 2); ctx.stroke();
      circle(ctx, hx, hy, 2.6, '#ffffff'); glow(ctx, hx, hy, 14, '#cfe0ff', 0.5);
    }
    for (let i = 0; i < 6; i++) { const a = i * 2.1 + 0.4, d = 10 + (i * 13) % (r - 18), tw = 0.5 + 0.5 * Math.sin(t * 2.3 + i * 1.7); circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 1.2 + tw * 0.8, 'rgba(255,255,255,' + (0.4 + tw * 0.5).toFixed(2) + ')'); }
  }
  ctx.restore();
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4 + t * 0.5, q = (t * 0.4 + i * 0.13) % 1, rr = r * 1.4 * (1 - q);
    circle(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr - q * 10, 2 * (1 - q) + 0.5, rgba(L.mote, 0.8 * q));
  }
}

// a portal's name plaque below it: its name in gold, "Sealed" after it while no boss of its set is open yet; the shrouded one says only "Sealed"
function drawPortalPlaque(ctx, P, open) {
  const text = P.sealed ? 'Sealed' : open ? P.name : P.name + ' · Sealed', dim = P.sealed || !open;
  ctx.save();
  ctx.font = '700 13px Cinzel, Georgia, serif';
  const tw = ctx.measureText(text).width + 30, y = P.y + P.r + 24;
  rrect(ctx, P.x - tw / 2, y, tw, 24, 4, dim ? '#2c2822' : '#3a3226', dim ? '#7a7058' : '#c9a65a', 1.5);
  ctx.fillStyle = dim ? '#b0a58a' : '#f0d48a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, P.x, y + 12);
  ctx.restore();
}

// the Trophy Hall's room, its own layer: dark all round, the hall, and every statue's pedestal (a little smaller than the old terrace's)
function buildRoomLayer(scale) {
  const R = TOWN.room, c = document.createElement('canvas');
  c.width = Math.round(R.w * scale); c.height = Math.round(R.h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale); g.translate(-R.x, -R.y);
  g.fillStyle = '#0c0a08'; g.fillRect(R.x, R.y, R.w, R.h);
  drawHall(g);
  TOWN.pedestals.forEach(pd => {
    circle(g, pd.x + 6 * PED_S, pd.y + 8 * PED_S, 62 * PED_S, 'rgba(0,0,0,0.3)');
    circle(g, pd.x, pd.y, 60 * PED_S, '#9a9384', '#5f5a50', 3);
    circle(g, pd.x, pd.y, 48 * PED_S, '#aba493');
    circle(g, pd.x, pd.y, 54 * PED_S, null, 'rgba(201,166,90,0.6)', 1.5);   // (the name plaque is drawn each frame: a boss you haven't reached reads "Sealed")
  });
  return c;
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
    [1200, 960, 1200, 700],
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

  // the portal terrace: flagstones, and a paved dais under each of the four portals
  const T = TOWN.terrace;
  rrect(g, T.x - 6, T.y - 6, T.w + 12, T.h + 12, 12, '#5f5a50');
  g.save(); g.beginPath(); g.roundRect(T.x, T.y, T.w, T.h, 10); g.clip();
  g.fillStyle = '#8e8778'; g.fillRect(T.x, T.y, T.w, T.h);
  flagstones(g, T.x, T.y, T.w, T.h, r, '#8f8879', 30);
  g.restore();
  for (const P of TOWN.portals) drawPortalRing(g, P);

  // tavern deck where the heroes wait
  const D = TOWN.deck;
  rrect(g, D.x + 6, D.y + 8, D.w, D.h, 8, 'rgba(0,0,0,0.25)');
  rrect(g, D.x, D.y, D.w, D.h, 8, '#8a6a44', '#4a3420', 3);
  for (let y = D.y + 18; y < D.y + D.h; y += 18) line(g, D.x + 4, y, D.x + D.w - 4, y, 'rgba(60,40,20,0.45)', 1.5);
  for (let y = D.y + 9; y < D.y + D.h; y += 18) for (let x = D.x + 20 + (y % 36) * 2; x < D.x + D.w; x += 90) line(g, x, y - 9, x, y + 9, 'rgba(60,40,20,0.35)', 1.2);
  ['tank', 'dps', 'healer'].forEach((role, i) => {
    // (each hero's pad is drawn under them each frame by drawDeckPad: the deck shows only the heroes waiting on it)
    const s = lineupSpot(i, 0);
    g.font = '700 13px Cinzel, Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = ROLES[role].color;
    g.fillText(role === 'dps' ? 'DPS' : ROLES[role].name.toUpperCase() + 'S', D.x + 16, s.y - 30);
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
  drawTrophyBuilding(g, TOWN.trophy);
  drawTeleporterBase(g, TOWN.trophy.pad);
  if (TOWN.arena && typeof PvpView !== 'undefined') PvpView.drawBuilding(g, TOWN.arena);
  const tr = rng(99);
  for (const [x, y, s] of [...TOWN.trees].sort((a, b) => a[1] - b[1])) drawTree(g, x, y, s, tr);

  return c;
}

// ---------------------------------------------------------------------------
// Animated decorations (drawn every frame)

function drawTownDynamic(ctx, t, portalOpen) {
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

  // the four portals' swirls (a set whose road isn't open yet lies still), their plaques, the Trophy Hall's two teleporter pads and the
  // braziers by them (the building's two, and the room's two beside its pad)
  TOWN.portals.forEach((P, i) => { const open = !!(portalOpen && portalOpen[i]); drawPortalDynamic(ctx, P, t, open); drawPortalPlaque(ctx, P, open); });
  drawTeleporter(ctx, TOWN.trophy.pad, t); drawTeleporter(ctx, TOWN.hall.pad, t);
  {
    const Hl = TOWN.hall, Tb = TOWN.trophy, hy = Hl.y + Hl.h - 12 - 72, ty = Tb.y + Tb.h - 4 - 72;
    [[Hl.door.x, hy], [Hl.door.x + Hl.door.w, hy], [Tb.x - 26, ty], [Tb.x + Tb.w + 26, ty]].forEach(([bx, by], k) => {
      glow(ctx, bx, by + 4, 58, '#ffb347', 0.26 + Math.sin(t * 8 + k * 2) * 0.05);
      flame(ctx, bx, by, 6, t + k * 1.7);
    });
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
    // soft layered smoke: each puff a soft-edged body (cached glow sprites, no gradients per frame) with a lighter lit
    // side, swelling and thinning as the wind leans it over; the smithy's is darker and thicker
    const dark = b === TOWN.smithy, body = dark ? '#5e5a58' : '#b8b4ae', lit = dark ? '#8e8884' : '#eceae4';
    const seed = (b.smoke.x * 0.013) % 1;
    for (let i = 0; i < 9; i++) {
      const q = (t * 0.19 + i / 9 + seed) % 1, r = 8 + q * 22, a = Math.sin(Math.min(1, q * 4) * Math.PI / 2) * (1 - q) * (dark ? 0.5 : 0.42);
      const x = b.smoke.x + q * q * 46 + Math.sin(t * 0.9 + i * 1.7) * 3 * (0.4 + q), y = b.smoke.y - q * 96;
      glow(ctx, x, y, r * 1.35, body, a);
      glow(ctx, x - r * 0.25, y - r * 0.3, r * 0.85, lit, a * 0.75);
    }
  }
}

// a pedestal's name plaque (drawn every frame, so a newly reached boss gets its name)
function drawPlaque(g, pd, text) {
  g.save();
  g.font = '700 13px Cinzel, Georgia, serif';
  const tw = g.measureText(text).width + 28;
  rrect(g, pd.x - tw / 2, pd.y + 58, tw, 22, 4, '#3a3226', '#c9a65a', 1.5);
  g.fillStyle = '#f0d48a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, pd.x, pd.y + 69);
  g.restore();
}

// a hero's pad on the tavern deck (packed rows get smaller pads)
// (a small round rug: a warm glow under it, a deep red field with a woven inner ring, a gold rim with a lit top edge)
function drawDeckPad(g, x, y, packed) {
  const rx = packed ? 24 : 28, ry = packed ? 17 : 20, cy = y + 4;
  g.save(); g.translate(x, cy); g.scale(1, ry / rx); glow(g, 0, 0, rx * 1.45, '#ffb860', 0.16); g.restore();
  ellipse(g, x, cy, rx, ry, 0, 'rgba(112,28,28,0.62)', 'rgba(40,14,10,0.55)', 3);
  ellipse(g, x, cy, rx * 0.72, ry * 0.72, 0, 'rgba(150,44,36,0.4)', 'rgba(230,190,110,0.32)', 1);
  g.save(); g.setLineDash([2, 3]); ellipse(g, x, cy, rx * 0.86, ry * 0.86, 0, null, 'rgba(240,200,130,0.3)', 1); g.restore();
  ellipse(g, x, cy, rx, ry, 0, null, 'rgba(230,190,110,0.62)', 1.6);
  g.strokeStyle = 'rgba(255,236,190,0.5)'; g.lineWidth = 1.2; g.lineCap = 'round';
  g.beginPath(); g.ellipse(x, cy, rx - 0.5, ry - 0.5, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
}
