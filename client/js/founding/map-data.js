// The Founding: the valley's shape, shared by the host's sim (founding/sim.js), the map art (founding/map-art.js) and the
// client (founding/client.js). Pure data and geometry, no drawing and no DOM, so it also loads in Node (tools/founding-test.js).
// World units are pixels at zoom 1; north is up. Taken from the showcase map (showcase/founding-map.html).
//
// Terrain (pass 2): high ground (plateaus with cliff faces and ramps), a river with shallows and a deep channel, a pond, and thick woods.
// It is rasterised once at load onto a 10 px grid; the map art paints the very same shapes (PLATEAUS, RAMPS, WOODS, POND), so what
// you see is what blocks. The API everyone reads:
//   walkable(x, y, rad)   false on cliff faces and deep water too (ramps, shallows, thick woods stay walkable)
//   heightAt(x, y)        0 low ground, 1 high ground, 2 mountain shelf
//   slowAt(x, y)          move multiplier: 1, or 0.7 in shallow water and thick woods
//   losClear(x1,y1,x2,y2) sight: blocked by thick woods and by looking up a cliff (never sees ground higher than its own)
//   SIGHT                 default vision radii

const FoundingMap = (() => {
  const W = 3200, H = 2400;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function hash(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const s = t => t * t * (3 - 2 * t); const u = s(xf), v = s(yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); }
  const fbm = (x, y) => noise(x, y) * .55 + noise(x * 2.1 + 7, y * 2.1 + 3) * .3 + noise(x * 4.3 + 1, y * 4.3 + 9) * .15;
  // a Catmull-Rom curve through the points, sampled every `step` px: each sample is [x, y, distance along, dirX, dirY]
  function spline(pts, step) {
    const out = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      const k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t, f = a => 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[n - 1].slice());
    let s = 0; out.forEach((p, i) => { if (i) s += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]); p[2] = s; });
    out.forEach((p, i) => { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; p[3] = (b[0] - a[0]) / l; p[4] = (b[1] - a[1]) / l; });
    return out;
  }
  // the same curve closed into a loop (for the cliff outlines), samples are [x, y]
  function closedSpline(pts, step) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t, f = a => 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    return out;
  }
  const near = (pl, x, y) => { let m = 1e9, at = 0; for (let i = 0; i < pl.length; i++) { const d = Math.hypot(pl[i][0] - x, pl[i][1] - y); if (d < m) { m = d; at = i; } } return { d: m, i: at }; };

  // the places (the camp is the heart to defend; the Hearth sits in it)
  const P = {
    hearth: [1600, 1940], spring: [1450, 2085], shop: [1795, 2070], hall: [1330, 1870], steward: [1790, 1810],
    gate: [1330, 840], forge: [2090, 1860], beacon: [700, 690], meadow: [640, 1960], woods: [2860, 520],
    ford: [2540, 1110], junction: [1600, 1590], spawn1: [1480, 70], spawn2: [3130, 1010],
  };
  const CAMP_R = 300;   // the camp ring round the Hearth: an enemy that reaches it strikes the camp
  // the two lanes, each from its spawn to the camp
  const LANES = [
    { id: 'north', name: 'The North Road', path: spline([[1480, 10], [1500, 250], [1380, 460], [1300, 650], [1330, 840], [1430, 1030], [1530, 1230], [1590, 1400], [1600, 1580], [1600, 1780]], 8) },
    { id: 'east', name: 'The East Ford', path: spline([[3200, 1010], [2900, 1040], [2700, 1090], [2540, 1110], [2380, 1185], [2150, 1300], [1900, 1440], [1700, 1530], [1600, 1585], [1600, 1780]], 8) },
  ];
  const LANE_HW = 66;   // a lane's half-width (worn earth); enemies walk inside it
  // the river, with its half-width at each sample (wider at the ford, where it runs shallow)
  const RIVER = spline([[2440, -60], [2470, 200], [2420, 420], [2500, 640], [2570, 860], [2540, 1110], [2470, 1330], [2330, 1520], [2260, 1720], [2250, 1900], [2290, 2080], [2210, 2250], [2240, 2470]], 8);
  RIVER.forEach((p, i) => { p.push(72 + 12 * Math.sin(i * 0.045) + 10 * noise(i * 0.05, 3) + 16 * Math.exp(-Math.pow((p[1] - 1110) / 90, 2))); });
  const FORD_R = 140;   // within this of P.ford the river can be waded
  // footpaths from the lanes and the camp to the sites off the lanes
  const FOOT = {
    beacon: spline([[1296, 690], [1100, 720], [920, 700], [790, 690]], 8),
    meadow: spline([[1480, 1960], [1250, 2010], [1020, 1990], [830, 1960]], 8),
    forge: spline([[1900, 1860], [1990, 1870], [2050, 1860]], 8),
    woods: spline([[2610, 1080], [2680, 960], [2760, 760], [2830, 620], [2860, 540]], 8),
    gate: spline([[1500, 1100], [1380, 950], [1290, 890]], 8),
  };
  const MOUNTAIN_Y = 120;   // the mountains along the top: nothing walks above this except down the pass
  const PASS = [1380, 1600];   // x range of the pass through the mountains

  const inRiver = (x, y, pad = 0) => { for (let i = 0; i < RIVER.length; i += 2) { const p = RIVER[i]; if (Math.abs(p[0] - x) < 260 && Math.hypot(p[0] - x, p[1] - y) < p[5] + pad) return true; } return false; };

  // ====================================================================== terrain
  const TC = 10, TCOLS = Math.ceil(W / TC), TROWS = Math.ceil(H / TC), NCELL = TCOLS * TROWS;
  const F_CLIFF = 1, F_SHALLOW = 2, F_DEEP = 4, F_WOOD = 8, F_RAMP = 16, F_SOLID = 32;
  const FL = new Uint8Array(NCELL), HT = new Uint8Array(NCELL), RLO = new Uint8Array(NCELL);
  const ci = (x, y) => { let cx = (x / TC) | 0, cy = (y / TC) | 0; if (cx < 0) cx = 0; else if (cx >= TCOLS) cx = TCOLS - 1; if (cy < 0) cy = 0; else if (cy >= TROWS) cy = TROWS - 1; return cy * TCOLS + cx; };
  const CLIFF_HW = 24;   // a cliff face is this far either side of the lip (so 48 px across: nothing steps or dashes over it)

  // ---- high ground. Outlines are drawn loose and smoothed; the art uses the very same smoothed outline (poly).
  const PLATEAU_DEFS = [
    // the pass terrace: the North Road comes down off it by a long ramp; the spawn sits up here
    { id: 'terrace', name: 'The High Pass', level: 1, pts: [[1120, -100], [2080, -100], [2075, 200], [2060, 335], [1980, 405], [1850, 432], [1700, 418], [1560, 440], [1420, 424], [1290, 446], [1190, 410], [1135, 330], [1122, 200]] },
    // the ledge above the pass, reached by a goat track from the terrace
    { id: 'ledge', name: 'The Ledge', level: 2, pts: [[1700, 190], [1830, 170], [1940, 205], [1978, 272], [1925, 330], [1805, 346], [1715, 312], [1685, 245]] },
    // the north-west mountain side: Beacon Hill at its foot, the high shelf above it
    { id: 'mountainside', name: 'Beacon Hill', level: 1, pts: [[150, 230], [380, 185], [640, 175], [860, 215], [935, 330], [940, 470], [945, 610], [925, 700], [875, 760], [800, 800], [690, 826], [580, 806], [500, 748], [370, 705], [220, 640], [130, 500], [110, 350]] },
    { id: 'shelf', name: 'The High Shelf', level: 2, pts: [[290, 290], [470, 268], [650, 290], [700, 360], [640, 425], [470, 450], [320, 425], [260, 350]] },
    // the timber plateau north-east of the ford
    { id: 'timber', name: 'The Timber Heights', level: 1, pts: [[2690, -100], [3320, -100], [3320, 885], [3200, 888], [3080, 872], [2960, 892], [2860, 868], [2790, 890], [2735, 866], [2722, 770], [2730, 600], [2705, 420], [2695, 200]] },
    // the bluff between the North Road and the river, a lookout over the gate and the ford
    { id: 'bluff', name: 'The East Bluff', level: 1, pts: [[1990, 570], [2150, 530], [2300, 590], [2370, 720], [2360, 880], [2280, 980], [2120, 1010], [1990, 950], [1930, 830], [1940, 680]] },
  ];
  const PLATEAUS = PLATEAU_DEFS.map(def => {
    let pts = closedSpline(def.pts, 14), a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    if (a < 0) pts.reverse();   // clockwise on screen (y down): the outward normal of an edge (dx, dy) is (dy, -dx)
    const n = pts.length, wob = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], pr = pts[(i + n - 1) % n], nx2 = pts[(i + 1) % n], tx = nx2[0] - pr[0], ty = nx2[1] - pr[1], l = Math.hypot(tx, ty) || 1;
      const off = (fbm(p[0] / 90, p[1] / 90) - .5) * 30 + (noise(p[0] / 30 + 9, p[1] / 30 + 4) - .5) * 9;
      wob.push([p[0] + ty / l * off, p[1] - tx / l * off]);
    }
    const poly = wob.map((p, i) => { const pr = wob[(i + n - 1) % n], nx2 = wob[(i + 1) % n], tx = nx2[0] - pr[0], ty = nx2[1] - pr[1], l = Math.hypot(tx, ty) || 1; return [p[0], p[1], ty / l, -tx / l]; });
    return { id: def.id, name: def.name, level: def.level, poly };
  });
  function stampPlateau(pl) {
    const poly = pl.poly, n = poly.length;
    // the inside: a scanline fill (cell rows against the outline's crossings)
    let y0 = 1e9, y1 = -1e9; for (const p of poly) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    for (let cy = Math.max(0, Math.floor(y0 / TC)); cy <= Math.min(TROWS - 1, Math.ceil(y1 / TC)); cy++) {
      const py = cy * TC + TC / 2, xs = [];
      for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[1] > py) !== (b[1] > py)) xs.push((b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]); }
      xs.sort((u, v) => u - v);
      for (let j = 0; j + 1 < xs.length; j += 2) for (let cx = Math.max(0, Math.ceil((xs[j] - TC / 2) / TC)); cx <= Math.min(TCOLS - 1, Math.floor((xs[j + 1] - TC / 2) / TC)); cx++) { const k = cy * TCOLS + cx; if (HT[k] < pl.level) HT[k] = pl.level; }
    }
    // the cliff face: every cell within CLIFF_HW of the outline
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], abx = b[0] - a[0], aby = b[1] - a[1], ll = abx * abx + aby * aby || 1;
      const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - CLIFF_HW) / TC)), c1 = Math.min(TCOLS - 1, Math.ceil((Math.max(a[0], b[0]) + CLIFF_HW) / TC)), r0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - CLIFF_HW) / TC)), r1 = Math.min(TROWS - 1, Math.ceil((Math.max(a[1], b[1]) + CLIFF_HW) / TC));
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        const px = cx * TC + TC / 2, py = cy * TC + TC / 2; let t = ((px - a[0]) * abx + (py - a[1]) * aby) / ll; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - (a[0] + abx * t), dy = py - (a[1] + aby * t);
        if (dx * dx + dy * dy < CLIFF_HW * CLIFF_HW) FL[cy * TCOLS + cx] |= F_CLIFF;
      }
    }
  }
  for (const pl of PLATEAUS) stampPlateau(pl);

  // ---- ramps: a polyline from the LOW end to the HIGH end and a half-width. They clear the cliff face. Every cliff a lane or a
  // footpath crosses has one that covers the lane at full width.
  const lanePts = (pl, ya, yb, every) => pl.filter(p => p[1] >= ya && p[1] <= yb).filter((p, i) => i % every === 0).map(p => [p[0], p[1]]);
  const footPts = (pl, ia, ib, every) => pl.filter((p, i) => i >= ia && i <= ib && (i - ia) % every === 0).map(p => [p[0], p[1]]);
  const RAMPS = [
    { id: 'pass-road', kind: 'road', lo: 0, hi: 1, hw: 128, pts: lanePts(LANES[0].path, 330, 560, 4).reverse() },
    { id: 'ledge-track', kind: 'track', lo: 1, hi: 2, hw: 46, pts: [[1640, 340], [1700, 300], [1770, 262]] },
    { id: 'beacon-path', kind: 'path', lo: 0, hi: 1, hw: 80, pts: [[1060, 720], [990, 712], [920, 702], [850, 694]] },
    { id: 'shelf-track', kind: 'track', lo: 1, hi: 2, hw: 46, pts: [[615, 545], [585, 480], [565, 420], [555, 350]] },
    { id: 'timber-path', kind: 'path', lo: 0, hi: 1, hw: 80, pts: [[2668, 990], [2692, 930], [2722, 860], [2745, 800]] },
    { id: 'bluff-path', kind: 'path', lo: 0, hi: 1, hw: 74, pts: [[2125, 1090], [2133, 1020], [2140, 950], [2142, 890]] },
  ];
  function stampRamp(R) {
    const pts = R.pts, seg = [];
    let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); tot += l; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const pad = R.hw + 6;
    const c0 = Math.max(0, Math.floor((x0 - pad) / TC)), c1 = Math.min(TCOLS - 1, Math.ceil((x1 + pad) / TC)), r0 = Math.max(0, Math.floor((y0 - pad) / TC)), r1 = Math.min(TROWS - 1, Math.ceil((y1 + pad) / TC));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const px = cx * TC + TC / 2, py = cy * TC + TC / 2;
      let md = 1e18, mt = 0, run = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], abx = b[0] - a[0], aby = b[1] - a[1];
        let t = ((px - a[0]) * abx + (py - a[1]) * aby) / (abx * abx + aby * aby || 1); t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - (a[0] + abx * t), dy = py - (a[1] + aby * t), d = dx * dx + dy * dy;
        if (d < md) { md = d; mt = (run + seg[i] * t) / tot; }
        run += seg[i];
      }
      if (md > R.hw * R.hw) continue;
      const k = cy * TCOLS + cx;
      if (FL[k] & F_CLIFF) { HT[k] = mt < .5 ? R.lo : R.hi; FL[k] &= ~F_CLIFF; } else if (mt >= .5 && HT[k] < R.hi) HT[k] = R.hi;
      FL[k] |= F_RAMP; RLO[k] = R.lo;
    }
  }
  for (const R of RAMPS) stampRamp(R);

  // ---- water: the river's channel is deep (blocked) with shallows along both banks; the ford is shallow all across and the deep
  // channel tapers out into it. A pond lies west of the river, south of the ford.
  const deepIn = (dFord, hw) => 30 + (1 - clamp((dFord - FORD_R) / 90, 0, 1)) * hw;   // how far into the water a cell must be to be deep
  const POND = { x: 2105, y: 1635, rx: 80, ry: 54 };
  {
    const WD = new Float32Array(NCELL).fill(-1), WH = new Float32Array(NCELL);
    for (const p of RIVER) {
      const r = p[5], c0 = Math.max(0, Math.floor((p[0] - r) / TC)), c1 = Math.min(TCOLS - 1, Math.ceil((p[0] + r) / TC)), r0 = Math.max(0, Math.floor((p[1] - r) / TC)), r1 = Math.min(TROWS - 1, Math.ceil((p[1] + r) / TC));
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { const v = r - Math.hypot(cx * TC + TC / 2 - p[0], cy * TC + TC / 2 - p[1]), k = cy * TCOLS + cx; if (v > 0 && v > WD[k]) { WD[k] = v; WH[k] = r; } }
    }
    for (let k = 0; k < NCELL; k++) {
      if (WD[k] <= 0) continue;
      const px = (k % TCOLS) * TC + TC / 2, py = Math.floor(k / TCOLS) * TC + TC / 2, dF = Math.hypot(px - P.ford[0], py - P.ford[1]);
      FL[k] |= dF <= FORD_R ? F_SHALLOW : WD[k] > deepIn(dF, WH[k]) ? F_DEEP : F_SHALLOW;
    }
    for (let cy = Math.floor((POND.y - POND.ry * 1.5) / TC); cy <= Math.ceil((POND.y + POND.ry * 1.5) / TC); cy++) for (let cx = Math.floor((POND.x - POND.rx * 1.5) / TC); cx <= Math.ceil((POND.x + POND.rx * 1.5) / TC); cx++) {
      const px = cx * TC + TC / 2, py = cy * TC + TC / 2, nn = Math.hypot((px - POND.x) / POND.rx, (py - POND.y) / POND.ry) + (fbm(px / 60, py / 60) - .5) * .3;
      if (nn < 1) FL[cy * TCOLS + cx] |= nn < .5 ? F_DEEP : F_SHALLOW;
    }
    // (a deep cell is never also shallow)
    for (let k = 0; k < NCELL; k++) if (FL[k] & F_DEEP) FL[k] &= ~F_SHALLOW;
  }

  // ---- thick woods: slow, and they block sight. Trunks (the map art's solids) stand in them with room to squeeze between; a SOLID
  // wood is the dense forest at the world's edge (trunks too close to pass). Woods keep off the lanes, the footpaths and the sites.
  const WOODS = [
    { x: 2935, y: 480, rx: 300, ry: 275, lvl: 1 },                    // the timber heights
    { x: 2235, y: 735, rx: 150, ry: 235, lvl: 1 },                    // the bluff's far half
    { x: 1030, y: 470, rx: 235, ry: 190, lvl: 0 },                    // the gully between the shelf and the terrace
    { x: 1600, y: 2450, rx: 1100, ry: 135, lvl: 0, solid: true },     // behind the camp
    { x: 55, y: 1400, rx: 205, ry: 800, lvl: 0, solid: true },        // the west edge
    { x: 2850, y: 1800, rx: 430, ry: 560, lvl: 0 },                   // across the river, south-east
    { x: 910, y: 1390, rx: 150, ry: 105, lvl: 0 },                    // copses on open ground: cover, not walls
    { x: 1230, y: 1500, rx: 125, ry: 95, lvl: 0 },
    { x: 1045, y: 1125, rx: 135, ry: 105, lvl: 0 },
    { x: 2790, y: 1275, rx: 160, ry: 110, lvl: 0 },
  ];
  const WOOD_CARVE = [[1600, 1960, 452], [2860, 520, 215], [2938, 565, 90], [2140, 900, 125], [300, 2192, 95], [1478, 2284, 90], [1396, 2121, 90], [3130, 1010, 150], [1480, 70, 150], [2563, 1163, 100]];
  {
    const cap = 130, F = new Float32Array(NCELL).fill(cap), rad = Math.ceil(cap / TC);
    const paths = LANES.map(L => L.path).concat(Object.values(FOOT));
    const hwOf = new Map(); LANES.forEach(L => hwOf.set(L.path, LANE_HW + 44)); Object.values(FOOT).forEach(pl => hwOf.set(pl, 62));
    // F holds each cell's distance to the nearest lane/footpath minus that path's clear half-width
    F.fill(cap);
    for (const pl of paths) { const hw = hwOf.get(pl); for (let i = 0; i < pl.length; i += 2) { const p = pl[i], cx = Math.round(p[0] / TC), cy = Math.round(p[1] / TC); for (let j = Math.max(0, cy - rad); j <= Math.min(TROWS - 1, cy + rad); j++) for (let q = Math.max(0, cx - rad); q <= Math.min(TCOLS - 1, cx + rad); q++) { const d = Math.hypot(q * TC + TC / 2 - p[0], j * TC + TC / 2 - p[1]) - hw, k = j * TCOLS + q; if (d < F[k]) F[k] = d; } } }
    for (const z of WOODS) {
      const c0 = Math.max(0, Math.floor((z.x - z.rx * 1.3) / TC)), c1 = Math.min(TCOLS - 1, Math.ceil((z.x + z.rx * 1.3) / TC)), r0 = Math.max(0, Math.floor((z.y - z.ry * 1.3) / TC)), r1 = Math.min(TROWS - 1, Math.ceil((z.y + z.ry * 1.3) / TC));
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        const k = cy * TCOLS + cx, px = cx * TC + TC / 2, py = cy * TC + TC / 2;
        if ((FL[k] & (F_CLIFF | F_DEEP | F_SHALLOW | F_RAMP)) || HT[k] !== z.lvl) continue;
        if (Math.hypot((px - z.x) / z.rx, (py - z.y) / z.ry) + (fbm(px / 110, py / 110) - .5) * .5 >= 1) continue;
        if (F[k] < 0) continue;
        let carved = false; for (const c of WOOD_CARVE) if (Math.hypot(px - c[0], py - c[1]) < c[2] + (fbm(px / 50, py / 50) - .5) * 40) { carved = true; break; }
        if (carved) continue;
        FL[k] |= F_WOOD | (z.solid ? F_SOLID : 0);
      }
    }
  }

  // ---- the questions the world asks
  const flagsAt = (x, y) => FL[ci(x, y)];
  const heightAt = (x, y) => HT[ci(x, y)];
  const slowAt = (x, y) => (FL[ci(x, y)] & (F_SHALLOW | F_WOOD)) ? 0.7 : 1;
  const waterAt = (x, y) => { const f = FL[ci(x, y)]; return f & F_DEEP ? 2 : f & F_SHALLOW ? 1 : 0; };
  const woodAt = (x, y) => { const f = FL[ci(x, y)]; return f & F_SOLID ? 2 : f & F_WOOD ? 1 : 0; };
  const rampAt = (x, y) => (FL[ci(x, y)] & F_RAMP) ? 1 : 0;
  const cliffAt = (x, y) => (FL[ci(x, y)] & F_CLIFF) ? 1 : 0;
  // sight along a line. A viewer never sees ground higher than its own (a unit standing on a ramp counts as its low end), higher
  // ground in between hides what lies behind it, and thick woods hide everything beyond a short way in.
  const WOOD_SEE = 70;   // how far into thick woods anyone can see
  function losClear(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d < 12) return true;
    const k1 = ci(x1, y1), k2 = ci(x2, y2), hv = HT[k1], ht2 = (FL[k2] & F_RAMP) ? RLO[k2] : HT[k2];
    if (ht2 > hv) return false;
    const n = Math.ceil(d / 10), step = d / n; let wood = 0;
    for (let i = 1; i < n; i++) {
      const k = ci(x1 + dx * i / n, y1 + dy * i / n), f = FL[k];
      if (HT[k] > hv && !(f & F_RAMP)) return false;
      if (f & F_WOOD) { wood += step; if (wood > WOOD_SEE) return false; }
    }
    return true;
  }
  const SIGHT = { hero: 520, nightHero: 340, camp: 600 };

  // solid props (tents, carts, the Hearth's ring, rocks, tree trunks): circles [x, y, r]. The map art may push more with addSolid
  // before the sim starts; the sim and the art both read this one list so they never disagree.
  const SOLIDS = [];
  // the solids sit in a coarse grid so walkable() only looks at the few near a point (the art adds about 800)
  const CELL = 100, GCOLS = Math.ceil(W / CELL), GROWS = Math.ceil(H / CELL);
  let grid = null;
  function buildGrid() {
    grid = Array.from({ length: GCOLS * GROWS }, () => []);
    for (const s of SOLIDS) {
      const c0 = Math.max(0, Math.floor((s[0] - s[2]) / CELL)), c1 = Math.min(GCOLS - 1, Math.floor((s[0] + s[2]) / CELL));
      const r0 = Math.max(0, Math.floor((s[1] - s[2]) / CELL)), r1 = Math.min(GROWS - 1, Math.floor((s[1] + s[2]) / CELL));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r * GCOLS + c].push(s);
    }
  }
  const addSolid = (x, y, r) => { SOLIDS.push([x, y, r]); grid = null; };
  // where a hero or enemy may stand: inside the world, out of the mountains (except the pass), off cliff faces and out of deep water
  // (shallows, the ford, ramps and thick woods are fine), clear of solids
  function walkable(x, y, rad = 12) {
    if (x < rad || y < rad || x > W - rad || y > H - rad) return false;
    if (y < MOUNTAIN_Y && (x < PASS[0] || x > PASS[1])) return false;
    const BAD = F_CLIFF | F_DEEP;
    if (FL[ci(x, y)] & BAD) return false;
    if (rad > 4) { const r = (rad > 14 ? 14 : rad) * 0.85; if ((FL[ci(x + r, y)] | FL[ci(x - r, y)] | FL[ci(x, y + r)] | FL[ci(x, y - r)]) & BAD) return false; }
    if (!grid) buildGrid();
    // (a unit's radius can reach one cell over; solids are at most a cell across, so the 3x3 block round the point covers it)
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let r = Math.max(0, cy - 1); r <= Math.min(GROWS - 1, cy + 1); r++) for (let c = Math.max(0, cx - 1); c <= Math.min(GCOLS - 1, cx + 1); c++)
      for (const s of grid[r * GCOLS + c]) if (Math.hypot(x - s[0], y - s[1]) < s[2] + rad) return false;
    return true;
  }
  // the lane a point is on (or null), and how far along it
  function laneAt(x, y) { let best = null; for (const L of LANES) { const n = near(L.path, x, y); if (n.d <= LANE_HW && (!best || n.d < best.d)) best = { lane: L.id, d: n.d, along: L.path[n.i][2], i: n.i }; } return best; }
  const lane = id => LANES.find(L => L.id === id);
  // a point a distance `s` along a lane (clamped), as [x, y, dirX, dirY]
  function along(id, s) { const pl = lane(id).path; let i = 0; while (i < pl.length - 1 && pl[i + 1][2] < s) i++; const a = pl[i], b = pl[Math.min(pl.length - 1, i + 1)], seg = (b[2] - a[2]) || 1, t = Math.max(0, Math.min(1, (s - a[2]) / seg)); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), a[3], a[4]]; }
  const laneLength = id => { const pl = lane(id).path; return pl[pl.length - 1][2]; };

  return { W, H, P, CAMP_R, LANES, LANE_HW, RIVER, FORD_R, FOOT, MOUNTAIN_Y, PASS, SOLIDS, addSolid, spline, noise, hash, inRiver, walkable, laneAt, lane, along, laneLength, near,
    heightAt, slowAt, losClear, SIGHT, PLATEAUS, RAMPS, WOODS, POND, TC, TCOLS, TROWS, CLIFF_HW, deepIn, flagsAt, waterAt, woodAt, rampAt, cliffAt, fbm, closedSpline };
})();

if (typeof module !== 'undefined') module.exports = { FoundingMap };
