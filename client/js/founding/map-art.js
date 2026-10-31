// The Founding: the valley drawn in code. Static terrain is painted once into cached tiles (build()); the state-dependent
// props (spring, gate, forge, graves ...) are drawn on top each frame from cached sprites. Pure drawing: no sim, no Net.
// Needs FoundingMap (founding/map-data.js) loaded first. All files LF.
// Terrain (pass 2): the cliffs, ramps, river depths, pond and thick woods are painted from FoundingMap's own shapes (PLATEAUS, RAMPS,
// WOODS, POND), so the art and the sim's walkable()/heightAt()/slowAt()/losClear() always agree. The trees are placed by the seeded
// layout (thick woods get trunks with room to squeeze between; the dense edge forest does not), the same on every tab.
//
// API (all take the screen canvas context; the art sets and restores its own world transform, so the caller's transform
// does not matter). cam = { x, y, zoom, w, h }: the world point at the screen centre, the zoom, and the canvas size in CSS px.
//   FoundingArt.build()                  paints every tile now (about 1 s) and adds the solids to FoundingMap. Call it BEFORE the
//                                        sim starts, on every tab (the host's sim and each client's art must see the same solids).
//                                        Solids come from a seeded layout and never depend on the device; painting does (scale).
//   FoundingArt.buildAsync()             same, but paints one tile per animation frame; the solids are added at once. Promise.
//   FoundingArt.drawGround(ctx, cam, state, t)   tiles + ground props + founders. Draw heroes and enemies after this.
//   FoundingArt.drawOver(ctx, cam, state, t)     canopies, roofs, smoke. Draw after the units, before telegraphs.
//   FoundingArt.drawLight(ctx, cam, state, t)    the dusk / night layer. Draw after drawOver, before the telegraphs.
//   FoundingArt.marks(state)             clarity markers for the HUD and minimap: [{ id, x, y, label, kind, icon, active }]
//   FoundingArt.minimap(w, h)            a canvas of the whole map (lanes marked)
// state = { props, units, quests }.   t is seconds (any clock).
//   state.units   [{ x, y, hero? }]   world positions; canopies and roofs fade over them, and a unit with hero:true carries a lamp at night.
//   state.quests  the snapshot's q array [[questId, state, progress, deadlineWave], ...]; marks() adds an objective marker for each
//                 quest that is not done / missed (matched by words in the id: spring, gate/stone, fire/forge, beacon, road, grave, roof, cover).
//   state.props (every field optional; the host snapshot's `props`):
//     spring   'trickle' | 'well'         the Digger's dig: a muddy seep, then the finished well (the fountain)
//     fountainR number                    heal radius of the fountain ring (default FoundingArt.FOUNTAIN_R; set it from founding/data.js)
//     gate     'none' | 'palisade' | 'stone'      gateHp 0..1 (cracks and gaps), shut true at the end
//     carved   0..1                       the Words being carved on the back of the stone gate
//     forge    bool lit                   smith bool: the Smith is hammering (sparks)
//     carts    [{ x, y, a? }]             stone carts on the North Road
//     night    0..1                       dusk to dark (drawLight)
//     beacon   bool lit                   jars: number of oil jars still stacked in camp
//     posts    number planted (from the camp end) or array of slot indexes; postSlots true shows the empty slots (POST_SLOTS)
//     graves   number dug 0..7 (true = all)
//     roof     false | 0..1 | true        the hall going up (1 = roofed)
//     capstone false | 0..1 | true        the Covering (1 = capped)
//     founders { steward|smith|digger|warden: [x, y, ang] }  optional overrides
//     found    bitmask of finds already made (bit i = FoundingArt.SPOTS[i]); SPOTS are the ground spots the art dresses
//     glint, prints   bool flags for two small ground details (set by the sim's finds)
//     labels   false hides the region names painted on the ground
const FoundingArt = (() => {
  'use strict';
  const FM = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const { W, H, P, LANES, RIVER: RV, FOOT, CAMP_R, LANE_HW } = FM;
  const L1 = LANES[0].path, L2 = LANES[1].path;
  const TAU = Math.PI * 2, TS = 800, NTX = Math.ceil(W / TS), NTY = Math.ceil(H / TS);
  const FOUNTAIN_R = 150;
  const GATE = { x: P.gate[0], y: P.gate[1], x0: P.gate[0] - 295, x1: P.gate[0] + 335, hw: 75 };
  const HALL = { x: P.hall[0], y: P.hall[1], w: 236, h: 160 };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = FM.hash, noise = FM.noise;
  const fbm = (x, y) => noise(x, y) * .55 + noise(x * 2.1 + 7, y * 2.1 + 3) * .3 + noise(x * 4.3 + 1, y * 4.3 + 9) * .15;
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let R = mulberry(1); const seedR = n => { R = mulberry(n); }; const rr = (a, b) => a + (b - a) * R();
  const hexc = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const shade = (c, f) => { const [r, g, b] = hexc(c), t = f < 0 ? 0 : 255, p = Math.abs(f); return `rgb(${Math.round((t - r) * p + r)},${Math.round((t - g) * p + g)},${Math.round((t - b) * p + b)})`; };

  // ---------- where things stand (shared by the solids, the painters and the marks)
  const TENTS = [   // x, y, w, h, rot, colour, stripe, solid radius
    [3580, 3580, 130, 96, -.2, '#7f4338', 'rgba(220,196,140,.25)', 58], [2940, 3410, 92, 66, .3, '#a58f62', null, 42], [3850, 3890, 100, 72, -.5, '#7e8a56', null, 46],
    [3400, 4500, 96, 70, .2, '#9a8a6a', null, 44], [2660, 4340, 96, 70, -.3, '#8a7650', null, 44], [3880, 4220, 82, 62, .6, '#6f7f8c', null, 40], [2470, 3380, 80, 60, -.4, '#a78d5c', null, 38],
  ];
  const CARTS = [[3970, 3600, .25, 'stone', 38], [2500, 3530, -.2, 'timber', 36], [3880, 4430, -.4, 'broken', 36]];
  const PITS = [[3760, 3764, 17], [3400, 4300, 15]];
  const SHOP_AT = [P.shop[0], P.shop[1], -.1];
  const SIGNS = [   // id, x, y, text, icon
    ['spring', 2736, 4060, 'THE SPRING', 'drop'], ['shop', 3600, 4364, 'SUPPLIES', 'coin'], ['forge', 3950, 3854, 'THE FORGE', 'anvil'], ['hall', 2684, 3572, 'THE HALL SITE', 'roof'],
    ['gate', 2524, 1824, 'THE GATE', 'gate'], ['beacon', 1532, 1612, 'BEACON HILL', 'flame'], ['meadow', 1744, 3984, 'THE MEADOW', 'flower'], ['woods', 5504, 1208, 'TIMBER WOODS', 'axe'],
    ['ford', 5304, 2372, 'THE EAST FORD', 'ford'],
  ];
  const PLOTS = [   // survey plots for the town to come: cx, cy, w, h, rot, footing
    [4140, 4104, 120, 90, .08, 1], [4172, 4372, 92, 70, -.1, 0], [2200, 3724, 104, 82, 0, 1], [2236, 4256, 110, 84, -.05, 0], [2060, 4460, 96, 74, .1, 0], [3060, 4672, 110, 80, 0, 1], [3700, 4688, 100, 78, .06, 0],
  ];
  const POST_SLOTS = [];   // lantern post slots along the North Road (camp end first)
  { const tot = L1[L1.length - 1][2]; let k = 0; for (let s = tot - 180; s > 560; s -= 236, k++) { let i = L1.length - 1; while (i > 0 && L1[i][2] > s) i--; const p = L1[i], side = k % 2 ? -1 : 1; POST_SLOTS.push([Math.round(p[0] - p[4] * side * 84), Math.round(p[1] + p[3] * side * 84), side]); } }
  // the old ruins on the west plain: a broken ring wall with two gaps and the stump of a watchtower (a landmark); the Grey Stones,
  // a ring of standing stones on the Greyback. Both are solids (the sim walks round them).
  const RUINS = [];
  for (let i = 0; i < 20; i++) { if (i === 4 || i === 5 || i === 14 || i === 15) continue; const a = i / 20 * TAU, rad = 235 + (hash(i, 77) - .5) * 20; RUINS.push({ x: Math.round(P.ruins[0] + Math.cos(a) * rad), y: Math.round(P.ruins[1] + Math.sin(a) * rad * .9), r: 24 + Math.round(hash(i, 78) * 6), a, k: hash(i, 79) }); }
  RUINS.push({ x: P.ruins[0] + 150, y: P.ruins[1] - 175, r: 46, tower: true, k: .5 });
  const STONES = [];
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + .3; STONES.push([Math.round(P.stones[0] + Math.cos(a) * 92), Math.round(P.stones[1] + Math.sin(a) * 78), i]); }
  const SPOTS = [[5876, 1130], [1504, 1872], [2792, 4242], [5126, 2326], [3810, 3700], [600, 4384], [P.gate[0], P.gate[1] + 36], [2956, 4568]];
  const QUEST_SPOTS = { spring: [2810, 4080, 'Dig'], gate: [2500, 1880, 'Stone'], fire: [4000, 3760, 'Forge'], beacon: [1580, 1400, 'Beacon'], road: [3200, 2800, 'Road'], grave: [1480, 3900, 'Graves'], roof: [5720, 1040, 'Timber'], cover: [3200, 3660, 'Cover'] };

  // ---------- distance fields (cheap lane / footpath tests for the forest layout)
  function makeField(paths, cell, cap) {
    const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, f = new Float32Array(gw * gh).fill(cap), rad = Math.ceil(cap / cell);
    for (const pl of paths) for (const p of pl) {
      const cx = Math.round(p[0] / cell), cy = Math.round(p[1] / cell);
      for (let j = Math.max(0, cy - rad); j <= Math.min(gh - 1, cy + rad); j++) for (let i = Math.max(0, cx - rad); i <= Math.min(gw - 1, cx + rad); i++) { const d = Math.hypot(i * cell - p[0], j * cell - p[1]), k = j * gw + i; if (d < f[k]) f[k] = d; }
    }
    return (x, y) => f[clamp(Math.round(y / cell), 0, gh - 1) * gw + clamp(Math.round(x / cell), 0, gw - 1)];
  }
  const laneD = makeField([L1, L2], 8, 200), footD = makeField(Object.values(FOOT), 8, 120);

  // ---------- the seeded layout: mountains, trees, rocks; and the solids the sim shares
  let LAY = null, built = false;
  const EXCL = [[3200, 3880, 780], [1400, 1400, 340], [2660, 1700, 380], [4180, 3720, 240], [1300, 3920, 420], [5720, 1040, 200], [P.ruins[0], P.ruins[1], 330], [P.stones[0], P.stones[1], 170], [P.spawn1[0], P.spawn1[1], 130], [6260, 2020, 130], [2900, 4170, 140], [4080, 3240, 110]];
  for (const k of FM.KEEP) EXCL.push([k[0], k[1], 230]);
  for (const sp of FM.SPIRES) EXCL.push([sp.x, sp.y, 110]);   // the Ash Spires (founding/sim-defence.js) stand in the open
  for (const p of PLOTS) EXCL.push([p[0], p[1], Math.max(p[2], p[3]) * .8 + 30]);
  for (const t of TENTS) EXCL.push([t[0], t[1], 95]);
  for (const c of CARTS) EXCL.push([c[0], c[1], 95]);
  for (const sg of SIGNS) EXCL.push([sg[1], sg[2] - 20, 70]);
  function forestDensity(x, y) {
    const wz = FM.woodAt(x, y);   // the map's thick woods (1) and the dense forest at the world's edge (2)
    if (wz) return wz === 2 ? .95 : .92;
    const h = FM.heightAt(x, y);
    if (h === 2) return .03;      // the high shelf is bare rock and thin grass
    let d = .07;
    if (x > 5600 && y > 2300 && h === 0) d = Math.max(d, .3);   // the Ashwood's fringe
    if (x < 560) d = Math.max(d, .45);
    if (y > 4500) d = Math.max(d, .6);
    if (y < 840 && (x < 2500 || x > 3400) && h === 0) d = Math.max(d, .35);
    if (h === 1) d = Math.min(d, .1);   // the high ground is open, with only a few old trees (sightlines)
    if (FM.waterAt(x, y)) d = 0;
    if (h === 0 && d < .2) d = .025;   // open ground stays calm: a lone tree here and there   // the high ground is open, with only a few old trees
    d *= .6 + .8 * fbm(x / 260, y / 260);
    return clamp(d, 0, .95);
  }
  function clearOf(x, y, pad) {
    if (laneD(x, y) < LANE_HW + pad) return false;
    if (FM.inRiver(x, y, pad + 26)) return false;
    for (const e of EXCL) if (Math.hypot(e[0] - x, e[1] - y) < e[2] + pad * .5) return false;
    if (footD(x, y) < 40 + pad) return false;
    // keep off cliff faces, ramps and water, with room to spare
    if (FM.flagsAt(x, y) & 23) return false;
    const m = 16 + pad; if ((FM.flagsAt(x + m, y) | FM.flagsAt(x - m, y) | FM.flagsAt(x, y + m) | FM.flagsAt(x, y - m)) & 21) return false;
    return true;
  }
  function layout() {
    const LR = mulberry(20261029), rr2 = (a, b) => a + (b - a) * LR();
    const lay = { peaks: [], hills: [], rubble: [], trees: [], bushes: [], rocks: [] };
    const passClear = (x, rad, m) => Math.abs(x - 2980) < m + rad * .85;
    const list = [];
    for (let x = -60; x < W + 100; x += 120) { const base = 140 + 100 * fbm(x / 500, 1.5), rad = rr2(130, 200), jx = rr2(-24, 24), jy = rr2(-30, 30); if (!passClear(x, rad, 120)) list.push([x + jx, base + jy, rad, true]); }
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { const rad = rr2(80, 110); list.push([side < 0 ? 2756 - rad * .8 - k * 60 : 3208 + rad * .8 + k * 60, 12 + rr2(0, 60) + k * 20, rad, true]); }
    for (let x = -20; x < W + 80; x += 220) { const rad = rr2(180, 260), jx = rr2(-50, 50), jy = rr2(-10, 60); if (!passClear(x, rad, 150)) list.push([x + jx, -40 + jy, rad, true]); }
    for (let x = 20; x < W; x += 170) { const jx = rr2(-40, 40), jy = rr2(-10, 40), rad = rr2(80, 130); if (x > 2600 && x < 3400) continue; if (FM.heightAt(x + jx, 400 + jy) || FM.cliffAt(x + jx, 400 + jy)) continue; list.push([x + jx, 400 + 60 * fbm(x / 200, 8) + jy, rad, false]); }
    for (let y = 500; y < H - 160; y += 170) { const a = rr2(-20, 50), b = rr2(-30, 30), c = rr2(80, 130); if (y > 1760 && y < 2340) continue; list.push([a, y + b, c, false]); }
    for (let y = 500; y < H - 160; y += 170) { const a = rr2(-20, 50), b = rr2(-30, 30), c = rr2(80, 130); if (y > 1760 && y < 2340) continue; list.push([W - a, y + b, c, false]); }
    list.sort((a, b) => a[1] - b[1]);
    list.forEach((p, i) => lay.peaks.push({ x: p[0], y: p[1], r: p[2], seed: i * 7 + 3, snow: p[3] && p[1] < 300 }));
    // the two hills that pinch the valley at the gate
    [[GATE.x - 375, GATE.y, GATE.x0 - 40, GATE.y + 10], [GATE.x + 405, GATE.y + 24, GATE.x1 + 30, GATE.y + 28]].forEach(([cx, cy, ax, ay], j) => {
      for (let i = 0; i < 12; i++) { const a = rr2(0, TAU), d = Math.sqrt(rr2(0, 1)) * 94; lay.hills.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * .8, r: rr2(40, 62), seed: 1200 + i + j * 20 }); }
      lay.hills.push({ x: ax, y: ay, r: 58, seed: 1290 + j });
    });
    for (let i = 0; i < 40; i++) lay.rubble.push({ x: GATE.x - 370 + (i % 2) * 740 + rr2(-150, 150), y: GATE.y - 5 + rr2(-80, 110), r: rr2(5, 12), seed: 1500 + i });
    // forest
    const grid = new Map(), key = (x, y) => Math.floor(x / 56) + ',' + Math.floor(y / 56);
    const near = (x, y, d) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = grid.get((Math.floor(x / 56) + i) + ',' + (Math.floor(y / 56) + j)); if (a) for (const t of a) if (Math.hypot(t.x - x, t.y - y) < d) return true; } return false; };
    const all = [];
    const tryTree = (x, y) => {
      const d = forestDensity(x, y), q = LR();
      if (q > d) return;
      if (y < 400 && !(x > 2600 && x < 3400)) return;
      if (!clearOf(x, y, 12)) return;
      const dense = d > .5, wz = FM.woodAt(x, y), sp = wz === 1 ? 50 : dense ? 46 : 74;   // (thick woods leave room to squeeze between trunks; the edge forest does not)
      if (near(x, y, sp)) return;
      const t = { x, y, type: hash(x | 0, y | 0) < (x > 5000 && y < 1800 ? .45 : x > 5000 && y > 2400 ? .2 : FM.heightAt(x, y) ? .5 : .75) ? 'oak' : 'pine', s: rr2(30, 52) * (wz === 1 ? 1.1 : dense ? .92 : 1), seed: Math.floor(rr2(0, 1000)) };
      all.push(t); const k = key(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t);
    };
    for (let a = 0; a < 30000; a++) { const x = rr2(10, W - 10), y = rr2(10, H - 10); tryTree(x, y); }
    // the thick woods get extra tries so they fill in
    for (const z of FM.WOODS) for (let a = 0, n = Math.floor(Math.PI * z.rx * z.ry / 380); a < n; a++) { const x = rr2(Math.max(10, z.x - z.rx), Math.min(W - 10, z.x + z.rx)), y = rr2(Math.max(10, z.y - z.ry), Math.min(H - 10, z.y + z.ry)); tryTree(x, y); }
    for (let a = 0; a < 420; a++) {
      const x = rr2(10, W - 10), y = rr2(520, H - 10);
      if (!clearOf(x, y, 8) || near(x, y, 30)) continue;
      if (LR() > .35 + forestDensity(x, y) * .4) continue;
      if (LR() < .5) lay.bushes.push({ x, y, s: rr2(12, 20), seed: Math.floor(rr2(0, 1000)) }); else lay.rocks.push({ x, y, s: rr2(8, 17), seed: Math.floor(rr2(0, 1000)) });
    }
    // a fringe of scattered trees stepping out of each wood: for the eye only (no solids, its own random stream, so the sim and every other tree stay as they were)
    { const FR = mulberry(7731), fr = (a, b) => a + (b - a) * FR();
      for (const z of FM.WOODS) for (let a = 0, n = Math.floor(Math.PI * z.rx * z.ry / 5200); a < n; a++) {
        const th = fr(0, TAU), q = fr(1.02, 1.34), x = z.x + Math.cos(th) * q * z.rx, y = z.y + Math.sin(th) * q * z.ry;
        if (x < 10 || y < 400 || x > W - 10 || y > H - 10 || FM.woodAt(x, y) || FM.heightAt(x, y) !== 0 || fr(0, 1) > (1.34 - q) / .32 * (.4 + fbm(x / 140 + 3, y / 140 + 3)) * .6) continue;
        if (!clearOf(x, y, 12) || near(x, y, 64)) continue;
        const t = { x, y, type: hash(x | 0, y | 0) < .6 ? 'oak' : 'pine', s: fr(26, 44), seed: Math.floor(fr(0, 1000)), deco: true }; all.push(t); const k = key(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t);
      } }
    all.sort((a, b) => a.y - b.y); lay.trees = all;
    lay.bushes.sort((a, b) => a.y - b.y); lay.rocks.sort((a, b) => a.y - b.y);
    return lay;
  }
  function addSolids() {
    const s = FM.addSolid;
    for (const p of LAY.peaks) if (p.y + p.r * .8 > FM.MOUNTAIN_Y + 4) s(p.x, p.y, p.r * .8);
    for (const p of LAY.hills) s(p.x, p.y, p.r * .85);
    s(GATE.x - 410, GATE.y, 70); s(GATE.x + 440, GATE.y + 26, 70);
    for (const r of RUINS) s(r.x, r.y, r.r);
    for (const r of STONES) s(r[0], r[1], 16);
    for (const t of LAY.trees) if (!t.deco) s(t.x, t.y, 7);
    for (const r of LAY.rocks) s(r.x, r.y, r.s * .8);
    s(P.hearth[0], P.hearth[1], 108);
    for (const t of TENTS) s(t[0], t[1], t[7]);
    s(SHOP_AT[0], SHOP_AT[1], 70); s(SHOP_AT[0], SHOP_AT[1] + 55, 50);
    for (const c of CARTS) s(c[0], c[1], c[4]);
    for (const p of PITS) s(p[0], p[1], p[2] + 5);
    s(P.spring[0], P.spring[1], 58);
    s(P.forge[0] - 30, P.forge[1], 36); s(P.forge[0], P.forge[1], 36); s(P.forge[0] + 32, P.forge[1], 32);
    s(P.beacon[0], P.beacon[1], 34);
    s(5820, 960, 42);
  }

  // ====================================================================== shapes (browser only below this line)
  function circ(g, x, y, r, f) { g.fillStyle = f; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, f, rot = 0) { g.fillStyle = f; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); }
  function blob(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function poly(g, pts, f, s, lw) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = lw || 1; g.stroke(); } }
  function line(g, x0, y0, x1, y1, col, w, cap) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = cap || 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  function rect(g, x, y, w, h, f, s, lw) { g.fillStyle = f; g.fillRect(x, y, w, h); if (s) { g.strokeStyle = s; g.lineWidth = lw || 1; g.strokeRect(x, y, w, h); } }

  function peak(g, x, y, r, seed, snow) {
    const n = 11, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU; const rad = r * (.72 + .38 * hash(seed, i)); pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad * .92]); }
    g.save(); g.translate(r * .14, r * .22); poly(g, pts, 'rgba(0,0,0,.28)'); g.restore();
    const gr = g.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r * 1.1); gr.addColorStop(0, '#9b958a'); gr.addColorStop(1, '#4a4640');
    poly(g, pts, gr);
    const dark = pts.filter((p, i) => { const a = i / n * TAU; return Math.cos(a) + Math.sin(a) > .1; }); dark.push([x, y]);
    poly(g, dark, 'rgba(18,16,14,.38)');
    const lite = pts.filter((p, i) => { const a = i / n * TAU; return Math.cos(a) + Math.sin(a) < -.3; }); lite.push([x, y]);
    poly(g, lite, 'rgba(255,244,222,.16)');
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const p = pts[Math.floor(hash(seed, 20 + i) * n)];
      line(g, x, y, lerp(x, p[0], .92), lerp(y, p[1], .92), 'rgba(28,25,22,.5)', 2.4);
      line(g, x - 2, y - 2, lerp(x, p[0], .9) - 2, lerp(y, p[1], .9) - 2, 'rgba(255,248,230,.2)', 1.3);
    }
    if (snow) { const sp = pts.map(p => [lerp(x, p[0], .42 + .1 * hash(seed, 40)), lerp(y, p[1], .42 + .12 * hash(seed, 41))]); poly(g, sp, 'rgba(232,236,238,.78)'); poly(g, sp.slice(0, 5).concat([[x, y]]), 'rgba(255,255,255,.3)'); }
  }
  function rock(g, x, y, r, seed) {
    const n = 8, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + hash(seed, 7) * 2; const rad = r * (.75 + .3 * hash(seed, i)); pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad * .8]); }
    g.save(); g.translate(r * .2, r * .3); poly(g, pts, 'rgba(0,0,0,.28)'); g.restore();
    const gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, '#a5a095'); gr.addColorStop(1, '#5d5a54');
    poly(g, pts, gr, 'rgba(30,28,24,.5)', 1.2);
    poly(g, pts.slice(0, 4).concat([[x, y]]), 'rgba(255,250,235,.2)');
    if (hash(seed, 3) > .55) ell(g, x - r * .1, y - r * .1, r * .4, r * .26, 'rgba(92,130,60,.45)');
  }
  function oak(g, x, y, s, seed, shadow) {
    if (shadow) ell(g, x + s * .3, y + s * .4, s * 1.0, s * .6, 'rgba(0,0,0,.26)');
    const base = ['#2f4a28', '#36552b', '#3d5e2d'][seed % 3];
    circ(g, x, y, s, shade(base, -.15));
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + seed, lx = x + Math.cos(a) * s * .5, ly = y + Math.sin(a) * s * .5; const gr = g.createRadialGradient(lx - s * .15, ly - s * .2, 1, lx, ly, s * .62); gr.addColorStop(0, shade(base, .3)); gr.addColorStop(1, shade(base, -.1)); g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, s * .6, 0, TAU); g.fill(); }
    const cg = g.createRadialGradient(x - s * .25, y - s * .3, 1, x, y, s * .6); cg.addColorStop(0, shade(base, .4)); cg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = cg; g.beginPath(); g.arc(x, y, s * .62, 0, TAU); g.fill();
    for (let i = 0; i < 9; i++) { const a = hash(seed, i) * TAU, d = hash(seed, i + 9) * s * .8; circ(g, x + Math.cos(a) * d - s * .1, y + Math.sin(a) * d - s * .1, 1.6, 'rgba(180,215,110,.35)'); }
  }
  function pine(g, x, y, s, seed, shadow) {
    if (shadow) ell(g, x + s * .3, y + s * .4, s * .8, s * .5, 'rgba(0,0,0,.28)');
    const cols = ['#1d3523', '#244029', '#2d4d2f'];
    for (let L = 0; L < 3; L++) {
      const r = s * (1 - L * .27), n = 10, pts = [];
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + seed; const rad = (i % 2 ? r * .55 : r) * (.92 + .1 * hash(seed, i + L * 20)); pts.push([x + Math.cos(a) * rad - L * 1.5, y + Math.sin(a) * rad - L * 1.5]); }
      poly(g, pts, cols[L], 'rgba(0,0,0,.22)', 1);
      g.strokeStyle = 'rgba(140,190,120,.2)'; g.lineWidth = 1; for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(x - L * 1.5, y - L * 1.5); g.lineTo(pts[i * 2][0], pts[i * 2][1]); g.stroke(); }
    }
    circ(g, x - s * .12, y - s * .14, s * .13, 'rgba(190,225,150,.35)');
  }
  function bush(g, x, y, s, seed) {
    ell(g, x + s * .25, y + s * .35, s, s * .55, 'rgba(0,0,0,.22)');
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + seed; circ(g, x + Math.cos(a) * s * .4, y + Math.sin(a) * s * .35, s * .55, i % 2 ? '#3f6130' : '#486c36'); }
    circ(g, x - s * .15, y - s * .2, s * .4, '#5f8644');
    if (hash(seed, 5) > .7) for (let i = 0; i < 4; i++) circ(g, x + (hash(seed, i) - .5) * s, y + (hash(seed, i + 4) - .5) * s, 1.8, '#b8574a');
  }
  function tent(g, x, y, w, h, rot, col, stripe) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-w / 2 + 9, -h / 2 + 11, w, h);
    g.strokeStyle = 'rgba(40,30,20,.7)'; g.lineWidth = 1.2;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(c => { g.beginPath(); g.moveTo(c[0] * w * .5, c[1] * h * .5); g.lineTo(c[0] * (w * .5 + 16), c[1] * (h * .5 + 14)); g.stroke(); circ(g, c[0] * (w * .5 + 16), c[1] * (h * .5 + 14), 1.8, '#3a2c1e'); });
    g.fillStyle = shade(col, .08); g.fillRect(-w / 2, -h / 2, w, h / 2);
    g.fillStyle = shade(col, -.28); g.fillRect(-w / 2, 0, w, h / 2);
    if (stripe) { g.fillStyle = stripe; for (let i = -w / 2 + 8; i < w / 2; i += 18) { g.fillRect(i, -h / 2, 8, h / 2); g.globalAlpha = .6; g.fillRect(i, 0, 8, h / 2); g.globalAlpha = 1; } }
    g.strokeStyle = 'rgba(20,14,8,.55)'; g.lineWidth = 1.4; g.strokeRect(-w / 2, -h / 2, w, h);
    line(g, -w / 2 - 6, 0, w / 2 + 6, 0, shade(col, .5), 2.2);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.moveTo(w / 2, -h * .22); g.lineTo(w / 2 + 2, 0); g.lineTo(w / 2, h * .22); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let i = -w / 2 + 12; i < w / 2; i += 14) { g.beginPath(); g.moveTo(i, -h / 2); g.lineTo(i + 3, h / 2); g.stroke(); }
    g.restore();
  }
  function wheel(g, x, y, r, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0); circ(g, 0, 0, r + 2, '#2f2216'); circ(g, 0, 0, r - 1, '#7a5a38'); circ(g, 0, 0, r - 3.2, '#4a3622');
    g.strokeStyle = '#7a5a38'; g.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3)); g.lineTo(-Math.cos(a) * (r - 3), -Math.sin(a) * (r - 3)); g.stroke(); }
    circ(g, 0, 0, 2.6, '#2f2216'); g.restore();
  }
  function cart(g, x, y, rot, load) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-38, -20, 84, 50);
    g.strokeStyle = '#4a3622'; g.lineWidth = 4; g.beginPath(); g.moveTo(-40, -8); g.lineTo(-78, -12); g.moveTo(-40, 8); g.lineTo(-78, 12); g.stroke();
    [[-26, -27], [-26, 27], [26, -27], [26, 27]].forEach((w, i) => { if (load === 'broken' && i === 3) return; ell(g, w[0], w[1], 10, 4.5, '#2f2216'); ell(g, w[0], w[1], 8, 3, '#5a4128'); });
    g.fillStyle = '#7a5a38'; g.fillRect(-40, -22, 80, 44); g.strokeStyle = '#3d2c1b'; g.lineWidth = 1.4; g.strokeRect(-40, -22, 80, 44);
    g.strokeStyle = 'rgba(40,28,16,.5)'; for (let i = -30; i < 40; i += 10) { g.beginPath(); g.moveTo(i, -22); g.lineTo(i, 22); g.stroke(); }
    g.fillStyle = '#5d4329'; g.fillRect(-40, -22, 80, 4); g.fillRect(-40, 18, 80, 4);
    if (load === 'stone') [[-22, -6, 24, 18], [2, -8, 22, 20], [-12, 8, 22, 12], [14, 6, 20, 14]].forEach((b, i) => { g.fillStyle = ['#a29b8d', '#8f897d', '#b0a999'][i % 3]; g.fillRect(b[0], b[1], b[2], b[3]); g.strokeStyle = '#4c473f'; g.lineWidth = 1; g.strokeRect(b[0], b[1], b[2], b[3]); });
    if (load === 'sacks' || load === 'broken') for (let i = 0; i < 6; i++) ell(g, -26 + (i % 3) * 22, -10 + Math.floor(i / 3) * 20, 11, 8, i % 2 ? '#c4aa78' : '#b39b69', .2);
    if (load === 'timber') for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#8a6a45' : '#7d5f3d'; g.fillRect(-34, -16 + i * 7, 70, 6); circ(g, 36, -13 + i * 7, 3, '#c9a77a'); }
    g.restore();
  }
  function barrel(g, x, y) { circ(g, x + 3, y + 4, 9, 'rgba(0,0,0,.25)'); circ(g, x, y, 9, '#6b4a2b'); circ(g, x, y, 7, '#82603a'); g.strokeStyle = '#3d2c1b'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.stroke(); }
  function crate(g, x, y, s, rot) { g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-s / 2 + 3, -s / 2 + 4, s, s); g.fillStyle = '#8c6d44'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = '#4a3622'; g.lineWidth = 1.2; g.strokeRect(-s / 2, -s / 2, s, s); g.beginPath(); g.moveTo(-s / 2, -s / 2); g.lineTo(s / 2, s / 2); g.moveTo(s / 2, -s / 2); g.lineTo(-s / 2, s / 2); g.stroke(); g.restore(); }
  function pitFire(g, x, y, r) {
    circ(g, x, y, r + 5, 'rgba(0,0,0,.25)'); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; rock(g, x + Math.cos(a) * r, y + Math.sin(a) * r, 5.5, i + Math.floor(x)); }
    circ(g, x, y, r - 3, '#1d1713'); circ(g, x, y, r - 8, '#2a211b');
    g.strokeStyle = '#4a3320'; g.lineWidth = 4; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * 1.05 + .3; g.beginPath(); g.moveTo(x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7)); g.lineTo(x - Math.cos(a) * (r - 7), y - Math.sin(a) * (r - 7)); g.stroke(); }
  }
  function stump(g, x, y, r) { circ(g, x + 2, y + 3, r + 2, 'rgba(0,0,0,.28)'); circ(g, x, y, r, '#5a4028'); circ(g, x, y, r - 2, '#c6a374'); g.strokeStyle = 'rgba(110,80,48,.7)'; g.lineWidth = .8; for (let k = 3; k < r - 2; k += 3) { g.beginPath(); g.arc(x, y, k, 0, TAU); g.stroke(); } }
  function logPile(g, x, y, rot, n, len) {
    g.save(); g.translate(x, y); g.rotate(rot); for (let k = 0; k < n; k++) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-len / 2 + 2, k * 7 + 3, len, 6); g.fillStyle = k % 2 ? '#8a6a45' : '#7d5f3d'; g.fillRect(-len / 2, k * 7, len, 6); circ(g, len / 2, k * 7 + 3, 3.2, '#d6b88a'); } g.restore();
  }
  function stoneBlock(g, x, y, w, h, i) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - w / 2 + 3, y - h / 2 + 4, w, h); g.fillStyle = ['#a29b8d', '#8f897d', '#b0a999'][i % 3]; g.fillRect(x - w / 2, y - h / 2, w, h); g.strokeStyle = '#4c473f'; g.lineWidth = 1; g.strokeRect(x - w / 2, y - h / 2, w, h); g.fillStyle = 'rgba(255,250,235,.18)'; g.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, 3); }
  function stoneStack(g, x, y, rot, rows, seed) {   // neatly stacked dressed stone
    g.save(); g.translate(x, y); g.rotate(rot);
    for (let r = 0; r < rows; r++) { const n = 4 - (r > 1 ? 1 : 0); for (let i = 0; i < n; i++) stoneBlock(g, (i - (n - 1) / 2) * 25 + (r % 2) * 5, -r * 5 + (hash(seed, r * 5 + i) - .5) * 1.4, 24, 16, i + r + seed); }
    g.restore();
  }
  function stake(g, x, y, rag, tilt) {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 2, y + 2, 3, 2, 0, 0, TAU); g.fill();
    line(g, x, y, x + (tilt || 0), y - 13, '#6a4d2f', 2.8); line(g, x + (tilt || 0), y - 13, x + (tilt || 0), y - 14.5, '#c9b07a', 2.6);
    if (rag) { g.fillStyle = rag; g.beginPath(); g.moveTo(x + (tilt || 0) + 1, y - 12); g.lineTo(x + (tilt || 0) + 8, y - 9); g.lineTo(x + (tilt || 0) + 2, y - 7); g.fill(); }
  }
  function survey(g, cx, cy, w, h, rot, footing, seed) {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.fillStyle = 'rgba(70,52,34,.16)'; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(232,224,196,.62)'; g.lineWidth = 1; g.setLineDash([]); g.strokeRect(-w / 2, -h / 2, w, h);
    if (footing) { for (let i = 0; i < Math.floor(w / 17); i++) { stoneBlock(g, -w / 2 + 9 + i * 17, h / 2 - 5, 15, 9, i); } for (let i = 0; i < 3; i++) stoneBlock(g, -w / 2 + 8, h / 2 - 16 - i * 12, 14, 9, i + 1); }
    g.strokeStyle = 'rgba(232,224,196,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, 6); g.moveTo(6, -6); g.lineTo(-6, 6); g.stroke();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((c, i) => stake(g, c[0] * w / 2, c[1] * h / 2, ['#e6dcc0', '#c9a45c', '#d8d0b8', '#b9c4a0'][(i + seed) % 4], (hash(seed, i) - .5) * 3));
    g.restore();
  }
  function laundry(g, x0, y0, x1, y1, seed) {
    const sag = 9, cols = ['#d9d2c0', '#b9c4a0', '#c9a45c', '#c3918a', '#aab4bf', '#e6dcc0', '#9aab84'];
    [[x0, y0], [x1, y1]].forEach(p => { circ(g, p[0] + 2, p[1] + 3, 3.4, 'rgba(0,0,0,.3)'); line(g, p[0], p[1], p[0], p[1] - 16, '#5d4329', 3.2); });
    const at = t => [lerp(x0, x1, t), lerp(y0, y1, t) - 16 + Math.sin(t * Math.PI) * sag];
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 12; i++) { const p = at(i / 12); i ? g.lineTo(p[0] + 3, p[1] + 8) : g.moveTo(p[0] + 3, p[1] + 8); } g.stroke();
    g.strokeStyle = '#d6c9a4'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 12; i++) { const p = at(i / 12); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
    const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 24);
    for (let i = 0; i < n; i++) { const t = (i + .6) / (n + .2), p = at(t), w = 10 + hash(seed, i) * 7, h = 10 + hash(seed, i + 9) * 12; g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(p[0] - w / 2 + 3, p[1] + 5, w, h); g.fillStyle = cols[Math.floor(hash(seed, i + 4) * cols.length)]; g.fillRect(p[0] - w / 2, p[1] + 1, w, h); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(p[0] - w / 2, p[1] + h - 3, w, 4); g.strokeStyle = 'rgba(60,50,36,.35)'; g.lineWidth = .8; g.strokeRect(p[0] - w / 2, p[1] + 1, w, h); }
  }
  function stickHorse(g, x, y, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    line(g, 0, 0, 0, -30, '#7a5a38', 2.6); ell(g, 1, -33, 6, 4.4, '#c4aa78', -.5); ell(g, 5, -31, 3.4, 2.6, '#b39b69', -.4);
    g.fillStyle = '#7a5a38'; g.beginPath(); g.moveTo(-2, -36); g.lineTo(-1, -41); g.lineTo(1, -37); g.fill(); line(g, -3, -34, -7, -28, '#4a3622', 2.2);
    circ(g, 2, -34.5, 1, '#2a2018'); g.strokeStyle = '#c9a45c'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, -32); g.quadraticCurveTo(10, -22, 4, -16); g.stroke(); g.restore();
  }
  function hopscotch(g, x, y, rot) {
    g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = 'rgba(244,238,216,.5)'; g.lineWidth = 1.4; g.lineCap = 'round';
    const cells = [[0, 0], [0, 1], [-.5, 2], [.5, 2], [0, 3], [0, 4], [-.5, 5], [.5, 5]];
    cells.forEach(([cx, cy]) => { g.strokeRect(cx * 21 - 10, -cy * 21 - 10, 20, 20); });
    circ(g, 0, -1 * 21, 3.2, 'rgba(160,150,130,.7)'); g.restore();
  }
  function jar(g, x, y, s) { circ(g, x + 2, y + 3, 8 * s, 'rgba(0,0,0,.25)'); circ(g, x, y, 8 * s, '#a0623a'); circ(g, x, y, 5.4 * s, '#7b4526'); circ(g, x - 2 * s, y - 2 * s, 2 * s, 'rgba(255,220,180,.5)'); }
  function mound(g, x, y) { ell(g, x + 4, y + 6, 24, 12, 'rgba(0,0,0,.3)'); ell(g, x, y, 22, 11, '#55402c'); ell(g, x - 2, y - 2, 18, 8, '#6d5439'); ell(g, x - 5, y - 4, 9, 3, 'rgba(255,230,190,.12)', -.2); }
  function marker(g, x, y, kind) {
    if (kind) { g.fillStyle = '#8f897d'; g.beginPath(); g.moveTo(x - 14, y - 4); g.lineTo(x - 14, y - 18); g.quadraticCurveTo(x - 9, y - 23, x - 4, y - 18); g.lineTo(x - 4, y - 4); g.fill(); g.strokeStyle = '#4c473f'; g.lineWidth = 1; g.stroke(); }
    else { line(g, x - 9, y - 4, x - 9, y - 20, '#6a4d2f', 2.6); line(g, x - 15, y - 14, x - 3, y - 14, '#6a4d2f', 2.6); }
  }
  function pathStrip(g, pl, hw, main, edge, ruts, vis) {
    // worn earth: the track is stroked in short chunks of slightly different width along a gently wandering centreline, so its edges
    // are uneven and feathered rather than a string of discs
    const cl = pl.map((p, i) => { const j = (noise(i * .06, 11) - .5) * 13; return [p[0] - p[4] * j, p[1] + p[3] * j]; });
    const layer = (w, col, alpha, seed, wob) => {
      g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = alpha;
      for (let i = 0; i < cl.length - 1; i += 3) {
        const a = cl[i], b = cl[Math.min(cl.length - 1, i + 4)];
        if (!vis((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, w)) continue;
        g.lineWidth = w * (1 + (noise(i * .11 + seed, 3) - .5) * wob);
        g.beginPath(); g.moveTo(a[0], a[1]); for (let k = 1; k <= 4 && i + k < cl.length; k++) g.lineTo(cl[i + k][0], cl[i + k][1]); g.stroke();
      }
      g.globalAlpha = 1;
    };
    layer(hw * 2 + 40, edge, .2, 1, .35);
    layer(hw * 2 + 22, edge, .5, 2, .3);
    layer(hw * 2, main, 1, 3, .22);
    layer(hw * 1.1, 'rgba(176,148,104,.28)', 1, 4, .5);
    if (ruts) for (const side of [-1, 1]) {
      const pts = pl.map((p, i) => { const o = side * hw * .36 + (noise(i * .08, side * 3) - .5) * 10; return [p[0] - p[4] * o, p[1] + p[3] * o]; });
      const pts2 = pl.map((p, i) => { const o = side * hw * .36 + 4 + (noise(i * .08, side * 3) - .5) * 10; return [p[0] - p[4] * o, p[1] + p[3] * o]; });
      for (const [arr, col, lw] of [[pts, 'rgba(48,34,22,.42)', 5.2], [pts2, 'rgba(196,166,120,.2)', 1.8]]) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); arr.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
    }
    for (let i = 0; i < pl.length * 1.6; i++) {
      const p = pl[Math.floor(R() * pl.length)], o = (R() - .5) * hw * 2.3, x = p[0] - p[4] * o, y = p[1] + p[3] * o, k = R(), a = rr(1.2, 3), b = R(), c1 = rr(-2, 2), c2 = rr(3, 6);
      if (!vis(x, y, 8)) continue;
      if (k < .5) circ(g, x, y, a, b < .5 ? 'rgba(70,56,38,.55)' : 'rgba(150,130,100,.5)');
      else if (Math.abs(o) > hw * .8) { g.strokeStyle = 'rgba(92,120,60,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + c1, y - c2); g.stroke(); }
    }
  }
  function chevron(g, x, y, ang, s, a) {
    g.save(); g.translate(x, y); g.rotate(ang); g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = `rgba(36,26,18,${a})`; g.lineWidth = 5; g.beginPath(); g.moveTo(-9 * s, -12 * s); g.lineTo(7 * s, 0); g.lineTo(-9 * s, 12 * s); g.stroke();
    g.strokeStyle = `rgba(214,188,140,${a * .5})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-9 * s, -12 * s - 3); g.lineTo(7 * s, -3); g.lineTo(-9 * s, 12 * s - 3); g.stroke(); g.restore();
  }
  function person(g, x, y, ang, o, t, walk, s = 1, act) {
    g.save(); g.translate(x, y); g.scale(s, s);
    ell(g, 2, 4, 13, 6, 'rgba(0,0,0,.3)');
    g.rotate(ang - Math.PI / 2);
    const sw = walk ? Math.sin(t * 11) * 3 : 0;
    ell(g, -4, 5 + sw, 3.4, 4.4, '#2a2018'); ell(g, 4, 5 - sw, 3.4, 4.4, '#2a2018');
    ell(g, 0, 0, 12, 7.5, o.cloak); ell(g, 0, 1, 12, 7.5, 'rgba(0,0,0,.18)'); ell(g, 0, -1, 10, 5.5, shade(o.cloak, .25));
    ell(g, -11, 0, 3.4, 3.4, '#d9b48e'); ell(g, 11, 0, 3.4, 3.4, '#d9b48e');
    circ(g, 0, -2, 6.4, o.hair); circ(g, 0.5, -3.5, 4.5, '#e2bd96'); circ(g, 0, -1.2, 5.4, o.hair); circ(g, 0, -1.5, 3.4, shade(o.hair, .1));
    const b = act ? Math.sin(t * 7) : 0;
    if (o.tool === 'staff') { line(g, 14, 9, 14, -16, '#6a4d2f', 2.2); circ(g, 14, -17, 3, '#e6c98a'); }
    if (o.tool === 'hammer') { const lift = act ? Math.max(0, b) * 10 : 0; line(g, 12, 4, 17, -10 - lift, '#6a4d2f', 2.2); rect(g, 12, -14 - lift, 11, 6, '#6d6d70'); }
    if (o.tool === 'shovel') { const dip = act ? b * 5 : 0; line(g, 13, 8, 13, -14 + dip, '#6a4d2f', 2.2); ell(g, 13, -17 + dip, 3.6, 4.6, '#8c8f94'); }
    if (o.tool === 'ledger') { rect(g, 9, -9, 8, 11, '#5b3a24'); rect(g, 10, -8, 6, 9, '#e8dcc0'); }
    g.restore();
  }

  // ====================================================================== the static tiles
  let VX0 = 0, VY0 = 0, VX1 = 0, VY1 = 0;
  const vis = (x, y, r) => x + r >= VX0 && x - r <= VX1 && y + r >= VY0 && y - r <= VY1;
  const hearthXY = P.hearth;

  function shopTent(g) {
    const sp = SHOP_AT;
    g.save(); g.translate(sp[0], sp[1]); g.rotate(sp[2]);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-72, -50, 150, 112);
    g.fillStyle = '#d6c79c'; g.fillRect(-70, -52, 140, 52); g.fillStyle = '#b3a276'; g.fillRect(-70, 0, 140, 52);
    for (let i = -70; i < 70; i += 28) { g.fillStyle = '#a2573d'; g.fillRect(i, -52, 14, 52); g.globalAlpha = .65; g.fillRect(i, 0, 14, 52); g.globalAlpha = 1; }
    g.strokeStyle = 'rgba(30,20,10,.6)'; g.lineWidth = 1.5; g.strokeRect(-70, -52, 140, 104);
    line(g, -78, 0, 78, 0, '#efe0b0', 3);
    // scalloped valance over the counter
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#d6c79c' : '#a2573d'; g.beginPath(); g.moveTo(-70 + i * 14, 52); g.lineTo(-56 + i * 14, 52); g.quadraticCurveTo(-63 + i * 14, 64, -70 + i * 14, 52); g.fill(); }
    g.fillStyle = '#6a4a2a'; g.fillRect(-70, 60, 140, 22); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-70, 78, 140, 4); g.strokeStyle = '#3d2c1b'; g.lineWidth = 1; g.strokeRect(-70, 60, 140, 22);
    // goods on the counter: loaves, a pan, flasks, a rolled blanket, a lantern, a short sword
    ell(g, -58, 71, 8, 5, '#c98f4a'); ell(g, -45, 72, 7, 4.5, '#b9803f'); circ(g, -30, 71, 7, '#4a4a4e'); circ(g, -30, 71, 5, '#6a6a70'); line(g, -24, 71, -14, 71, '#4a4a4e', 2.4);
    [[-4, '#d6a447'], [6, '#5c8f4a'], [16, '#7a6aa8']].forEach(([x, c]) => { circ(g, x, 72, 4.6, c); circ(g, x - 1.4, 70.4, 1.4, 'rgba(255,255,255,.5)'); });
    g.fillStyle = '#9a8f6e'; g.fillRect(28, 66, 20, 10); circ(g, 28, 71, 5, '#b3a77f'); circ(g, 48, 71, 5, '#8a805f');
    rect(g, 54, 64, 8, 12, '#2c2118'); rect(g, 55.5, 66, 5, 7, '#e0b050');
    line(g, 64, 78, 64, 60, '#b9bfc8', 2); line(g, 61, 77, 67, 77, '#7a5a38', 2.4);
    // a weapon rack and sacks under the awning
    line(g, -50, -36, -50, -8, '#6a4d2f', 2.6); line(g, -42, -36, -42, -8, '#8a8f98', 2.2); line(g, -34, -36, -34, -8, '#8a8f98', 2.2);
    for (let i = 0; i < 4; i++) ell(g, 18 + (i % 2) * 20, -34 + Math.floor(i / 2) * 16, 11, 8, i % 2 ? '#c4aa78' : '#b39b69');
    g.restore();
  }
  function hearthBase(g) {
    const [x, y] = hearthXY;
    ell(g, x + 6, y + 10, 124, 112, 'rgba(0,0,0,.28)');
    circ(g, x, y, 114, '#3e3228'); circ(g, x, y, 106, '#2f261e');
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; rock(g, x + Math.cos(a) * 98, y + Math.sin(a) * 98, 12 + hash(i, 4) * 3, 900 + i); }
    // the ring has been walked round a thousand times
    for (let i = 0; i < 60; i++) { const a = hash(i, 11) * TAU, d = 124 + hash(i, 12) * 26; ell(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 5, 2.4, 'rgba(34,26,18,.24)', a + 1.5); }
  }
  function campFence(g) {
    const [hx, hy] = hearthXY, n = 100, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = hx + Math.cos(a) * CAMP_R, y = hy + Math.sin(a) * CAMP_R;
      let ok = y < H - 24 && laneD(x, y) > LANE_HW + 18 && footD(x, y) > 34;
      if (ok) for (const t of TENTS) if (Math.hypot(t[0] - x, t[1] - y) < t[7] + 16) ok = false;
      if (ok && Math.hypot(x - SHOP_AT[0], y - SHOP_AT[1]) < 90) ok = false;
      if (ok && Math.hypot(x - HALL.x, y - HALL.y) < 130 && x < HALL.x + 130) ok = false;
      pts.push(ok ? [x, y, a] : null);
    }
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n]; if (!p || !q) continue;
      if (!vis((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 60)) continue;
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = (mx - hx) * .02, oy = (my - hy) * .02;
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(p[0] + 2, p[1] + 3); g.quadraticCurveTo(mx + ox + 2, my + oy + 4, q[0] + 2, q[1] + 3); g.stroke();
      g.strokeStyle = '#cdbb8e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(mx + ox, my + oy, q[0], q[1]); g.stroke();
    }
    for (let i = 0; i < n; i++) {
      const p = pts[i]; if (!p || !vis(p[0], p[1], 40)) continue;
      circ(g, p[0] + 3, p[1] + 4, 4.4, 'rgba(0,0,0,.3)'); circ(g, p[0], p[1], 4.2, '#5d4329'); circ(g, p[0], p[1], 2.8, '#8a6a45');
      if (i % 4 === 0) { line(g, p[0], p[1], p[0], p[1] - 26, '#4a3622', 2.4); const c = i % 8 === 0 ? '#e6dcc0' : '#c9a45c'; g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1] - 26); g.lineTo(p[0] + 17, p[1] - 21); g.lineTo(p[0], p[1] - 15); g.fill(); g.strokeStyle = 'rgba(40,30,18,.4)'; g.lineWidth = .8; g.stroke(); }
    }
    // the threshold where the roads come in: two stout posts, a bunting rope, a row of flat white stones across the road
    const gy = hy - Math.sqrt(CAMP_R * CAMP_R - 84 * 84);
    if (vis(hx, gy, 120)) {
      for (const s of [-1, 1]) { const x = hx + s * 84; circ(g, x + 3, gy + 5, 8, 'rgba(0,0,0,.32)'); circ(g, x, gy, 7.4, '#4a3622'); circ(g, x, gy, 5, '#7d5f3d'); line(g, x, gy, x, gy - 44, '#4a3622', 3.4); circ(g, x, gy - 45, 3.4, '#c9a45c'); }
      g.strokeStyle = '#cdbb8e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo((hx - 84), gy - 40); g.quadraticCurveTo(hx, gy - 18, (hx + 84), gy - 40); g.stroke();
      for (let i = 0; i < 8; i++) { const t = (i + .5) / 8, x = lerp((hx - 84), (hx + 84), t), y = gy - 40 + Math.sin(t * Math.PI) * 20 + 5; g.fillStyle = i % 2 ? '#e6dcc0' : '#c9a45c'; g.beginPath(); g.moveTo(x - 5, y - 4); g.lineTo(x + 5, y - 4); g.lineTo(x, y + 9); g.fill(); }
      for (let i = 0; i < 11; i++) { const x = hx + (i - 5) * 13.5, y = hy - Math.sqrt(CAMP_R * CAMP_R - (x - hx) * (x - hx)) + 3; ell(g, x, y, 6.4, 3.8, '#dcd6c6', (i - 5) * .07); ell(g, x - 1, y - 1, 4, 2, 'rgba(255,255,250,.45)'); g.strokeStyle = 'rgba(60,54,44,.5)'; g.lineWidth = .8; g.beginPath(); g.ellipse(x, y, 6.4, 3.8, (i - 5) * .07, 0, TAU); g.stroke(); }
    }
  }

  // ====================================================================== terrain painting
  // The shapes (cliff outlines, ramps, water, woods) come from FoundingMap, so what you see is what blocks.
  const mixc = (a, b, t) => { const A = hexc(a), B = hexc(b); return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`; };
  const litOf = (nx, ny) => -(nx * .55 + ny * .83);   // 1 on a face turned toward the north-west light, -1 on one turned away
  const outlineD = (x, y) => { let m = 1e9; for (const pl of FM.PLATEAUS) for (const p of pl.poly) { const dx = p[0] - x, dy = p[1] - y; if (dx > 60 || dx < -60 || dy > 60 || dy < -60) continue; const d = Math.hypot(dx, dy); if (d < m) m = d; } return m; };
  const polyPath = (g, poly) => { g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
  const bbOf = pl => { if (!pl.bb) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pl.poly) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } pl.bb = [x0, y0, x1, y1]; } return pl.bb; };
  const bbVis = (bb, pad) => bb[2] + pad >= VX0 && bb[0] - pad <= VX1 && bb[3] + pad >= VY0 && bb[1] - pad <= VY1;

  // dry, bare, lush and stony ground, so the meadow is not one green
  function groundDetail(g) {
    const bl = (x, y, r, c, a) => { if (vis(x, y, r)) blob(g, x, y, r, c, a); };
    seedR(111);
    for (let i = 0; i < 2400; i++) {
      const x = rr(-50, W + 50), y = rr(-50, H + 50), r = rr(60, 200), n = fbm(x / 360 + 5, y / 360 + 2), a = rr(.09, .2);
      if (n > .64) bl(x, y, r, [118, 98, 62], a);            // bare, dry earth
      else if (n > .54) bl(x, y, r * .8, [152, 150, 84], a * .6);   // sun-dried grass
      else if (n < .3) bl(x, y, r, [34, 70, 44], a * .5);   // lush and damp
    }
    // stones, lying about in small groups
    for (let i = 0; i < 260; i++) {
      const x = hash(i, 901) * W, y = hash(i, 902) * H, cnt = 3 + Math.floor(hash(i, 903) * 5);
      if (!vis(x, y, 40) || !clearOf(x, y, 4)) continue;
      for (let k = 0; k < cnt; k++) {
        const px = x + (hash(i, 910 + k) - .5) * 40, py = y + (hash(i, 920 + k) - .5) * 28, r = 2.2 + hash(i, 930 + k) * 4.2, c = hash(i, 940 + k);
        ell(g, px + 1.5, py + 2, r * 1.1, r * .7, 'rgba(0,0,0,.25)');
        ell(g, px, py, r, r * .72, c < .33 ? '#8f8b80' : c < .66 ? '#a39d90' : '#767268', hash(i, 950 + k) * 3);
        ell(g, px - r * .25, py - r * .25, r * .5, r * .28, 'rgba(255,250,235,.22)');
      }
    }
  }

  // the top of each plateau: a lighter, drier tint with a glow along the lip, scattered stones
  function plateauTops(g) {
    seedR(1201);
    for (const pl of FM.PLATEAUS) {
      const bb = bbOf(pl), lv = pl.level;
      // (the random draws happen whether or not the plateau is on this tile, so every tile paints the same ground)
      const n = Math.floor((bb[2] - bb[0]) * (bb[3] - bb[1]) / (lv === 2 ? 5200 : 8500)), pts = [];
      for (let i = 0; i < n; i++) pts.push([rr(bb[0], bb[2]), rr(bb[1], bb[3]), rr(30, 90), R(), R()]);
      if (!bbVis(bb, 60)) continue;
      g.save(); polyPath(g, pl.poly); g.clip();
      g.fillStyle = lv === 2 ? 'rgba(170,168,152,.30)' : 'rgba(214,206,118,.16)'; g.fillRect(bb[0] - 10, bb[1] - 10, bb[2] - bb[0] + 20, bb[3] - bb[1] + 20);
      for (const p of pts) { if (FM.heightAt(p[0], p[1]) < lv || !vis(p[0], p[1], p[2])) continue; blob(g, p[0], p[1], p[2], lv === 2 ? (p[3] < .5 ? [190, 188, 172] : [120, 128, 100]) : (p[3] < .5 ? [186, 178, 100] : [96, 126, 62]), .1 + p[4] * .1); }
      g.lineJoin = 'round'; polyPath(g, pl.poly);
      g.strokeStyle = lv === 2 ? 'rgba(236,232,214,.08)' : 'rgba(226,230,150,.07)'; g.lineWidth = 36; g.stroke();
      g.restore();
      const nr = Math.floor((bb[2] - bb[0]) * (bb[3] - bb[1]) / (lv === 2 ? 9000 : 26000));
      for (let i = 0; i < nr; i++) { const x = bb[0] + hash(i, 1301 + lv) * (bb[2] - bb[0]), y = bb[1] + hash(i, 1302 + lv) * (bb[3] - bb[1]); if (!vis(x, y, 20) || FM.heightAt(x, y) < lv || !clearOf(x, y, 4)) continue; rock(g, x, y, 4 + hash(i, 1303) * (lv === 2 ? 9 : 6), 3000 + i); }
    }
  }

  // thick woods: a dark, dappled forest floor under the trunks
  function woodFloor(g) {
    seedR(1101);
    for (const z of FM.WOODS) {
      const n = Math.floor(Math.PI * z.rx * z.ry / 3600), pts = [];
      for (let i = 0; i < n; i++) { const a = R() * TAU, d = Math.sqrt(R()); pts.push([z.x + Math.cos(a) * d * z.rx * 1.05, z.y + Math.sin(a) * d * z.ry * 1.05, rr(40, 90), R(), R()]); }
      if (z.x + z.rx < VX0 - 100 || z.x - z.rx > VX1 + 100 || z.y + z.ry < VY0 - 100 || z.y - z.ry > VY1 + 100) continue;
      for (const p of pts) { if (!vis(p[0], p[1], p[2]) || !FM.woodAt(p[0], p[1])) continue; blob(g, p[0], p[1], p[2], z.solid ? [8, 20, 14] : [14, 34, 22], .2 + p[3] * .13); }
      for (let i = 0, nf = Math.floor(Math.PI * z.rx * z.ry / 9000); i < nf; i++) {   // the edge: undergrowth shading out into the open, no hard line
        const a = R() * TAU, d = 1 + R() * .3 + .08 * Math.sin(a * 5 + z.x), x = z.x + Math.cos(a) * d * z.rx, y = z.y + Math.sin(a) * d * z.ry, r = rr(36, 74), k = R();
        if (!vis(x, y, r) || FM.woodAt(x, y) || FM.waterAt(x, y)) continue; blob(g, x, y, r, z.solid ? [10, 24, 16] : [22, 46, 28], .06 + .08 * (1.3 - d) / .3 * k);
      }
      for (const p of pts) { if (p[4] > .45 || !vis(p[0], p[1], 30) || !FM.woodAt(p[0], p[1])) continue; blob(g, p[0] + 10, p[1] - 8, 16 + p[3] * 14, [150, 176, 84], .06); }   // sun that gets through
      // ferns
      for (const p of pts) { if (p[3] > .5 || !vis(p[0], p[1], 14) || !FM.woodAt(p[0], p[1])) continue; g.strokeStyle = 'rgba(96,138,64,.55)'; g.lineWidth = 1.2; for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * .6; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(a) * 9, p[1] + Math.sin(a) * 9); g.stroke(); } }
    }
  }

  // cliff faces: a band of rock along each plateau's outline, lit from the north-west, with a bright lip, strata, cracks, a dark
  // foot and loose stones. Where a ramp crosses, the face is left out and the ramp is painted over.
  function cliffs(g) {
    for (const pl of FM.PLATEAUS) {
      if (!bbVis(bbOf(pl), 70)) continue;
      const poly = pl.poly, n = poly.length, lv = pl.level, cool = lv === 2;
      const topLit = cool ? '#cdd0c8' : '#cbbf9f', topDk = cool ? '#9ea4a4' : '#a09478', midLit = cool ? '#a3a8a6' : '#9a8e74', midDk = cool ? '#737a7c' : '#766b57', baseLit = cool ? '#70777a' : '#6b6150', baseDk = cool ? '#4a5156' : '#4b4338';
      const jt = [], jb = []; for (let i = 0; i < n; i++) { jt.push((hash(i * 3 + lv * 100, 21) - .5) * 6); jb.push((hash(i * 3 + lv * 100, 22) - .5) * 6); }
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n], i2 = (i + 1) % n, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if (!vis(mx, my, 60)) continue;
        let nx = a[2] + b[2], ny = a[3] + b[3]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        if (FM.rampAt(mx, my) || FM.rampAt(mx + nx * 16, my + ny * 16) || FM.rampAt(mx - nx * 16, my - ny * 16)) continue;
        const L = litOf(nx, ny), sd = -L, h = k => hash(i * 13 + lv * 977 + pl.id.length * 31, k);
        const P = (v, o) => [v[0] + v[2] * o, v[1] + v[3] * o];
        if (pass === 0) {   // the shadow the cliff throws on the ground below: a dark ring all round, long to the south-east
          const len = 14 + 44 * Math.max(0, sd + .15), c0 = P(a, 21), c1 = P(b, 21), c2 = P(b, 21 + len), c3 = P(a, 21 + len);
          const gr = g.createLinearGradient(mx + nx * 21, my + ny * 21, mx + nx * (21 + len), my + ny * (21 + len)); gr.addColorStop(0, `rgba(8,12,6,${.2 + .16 * Math.max(0, sd)})`); gr.addColorStop(1, 'rgba(8,12,6,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.closePath(); g.fill();
          continue;
        }
        // the face: bright at the lip, grey-brown in the middle, nearly black where it meets the ground; lit a little more on the lit side
        const f0 = P(a, -9 + jt[i]), f1 = P(b, -9 + jt[i2]), f2 = P(b, 23 + jb[i2]), f3 = P(a, 23 + jb[i]), t = (L + 1) / 2 * .7 + .15;
        const gr = g.createLinearGradient(mx + nx * -9, my + ny * -9, mx + nx * 23, my + ny * 23);
        gr.addColorStop(0, mixc(topDk, topLit, t)); gr.addColorStop(.45, mixc(midDk, midLit, t)); gr.addColorStop(1, mixc(baseDk, baseLit, t));
        g.fillStyle = gr; g.beginPath(); g.moveTo(f0[0], f0[1]); g.lineTo(f1[0], f1[1]); g.lineTo(f2[0], f2[1]); g.lineTo(f3[0], f3[1]); g.closePath(); g.fill();
        g.lineCap = 'round';
        const tx = b[0] - a[0], ty = b[1] - a[1];
        // rock blocks: lighter and darker patches so it does not read as a wall
        for (let k = 0; k < 4; k++) {
          const u = h(30 + k) * .8, o = -5 + h(40 + k) * 20, sw = .45 + h(50 + k) * .4, sh = 5 + h(60 + k) * 6, ax = a[0] + tx * u + nx * o, ay = a[1] + ty * u + ny * o, bx = ax + tx * sw, by = ay + ty * sw;
          g.fillStyle = h(70 + k) < .5 ? `rgba(255,246,222,${.05 + .09 * t})` : 'rgba(10,8,6,.15)';
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by + (h(80 + k) - .5) * 3); g.lineTo(bx + nx * sh, by + ny * sh); g.lineTo(ax + nx * sh * .8, ay + ny * sh * .8); g.closePath(); g.fill();
        }
        // one wavy stratum line and a crack or two running down the face
        if (h(1) < .75) { const o = 4 + h(2) * 8; g.strokeStyle = 'rgba(20,14,10,.22)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a[0] + a[2] * o, a[1] + a[3] * o); g.quadraticCurveTo(mx + nx * (o + (h(3) - .5) * 7), my + ny * (o + (h(3) - .5) * 7), b[0] + b[2] * o, b[1] + b[3] * o); g.stroke(); }
        for (let k = 0; k < 2; k++) if (h(4 + k) < .6) {
          const u = .15 + h(6 + k) * .7, px = a[0] + tx * u, py = a[1] + ty * u, d1 = 11 + h(8 + k) * 10, jx = (h(10 + k) - .5) * 6;
          g.strokeStyle = `rgba(16,12,8,${.22 + .16 * (1 - t)})`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px + nx * -7, py + ny * -7); g.lineTo(px + nx * (d1 * .5) + jx * .6, py + ny * (d1 * .5)); g.lineTo(px + nx * d1 + jx, py + ny * d1); g.stroke();
        }
        // the lip: a lit grass edge, a darker line just inside it
        line(g, f0[0], f0[1], f1[0], f1[1], `rgba(255,246,208,${.14 + .42 * Math.max(0, L)})`, 2.2);
        line(g, a[0] + a[2] * (-13 + jt[i]), a[1] + a[3] * (-13 + jt[i]), b[0] + b[2] * (-13 + jt[i2]), b[1] + b[3] * (-13 + jt[i2]), 'rgba(30,44,20,.38)', 2.2);
        // the foot
        line(g, f3[0], f3[1], f2[0], f2[1], 'rgba(10,8,6,.28)', 2.4);
        // loose stones and the odd boulder at the foot
        if (h(11) < .6) { const o = 24 + h(12) * 10, u = h(13), px = a[0] + tx * u + nx * o, py = a[1] + ty * u + ny * o, r = 2.2 + h(14) * 3.4; ell(g, px + 1.5, py + 2, r * 1.1, r * .7, 'rgba(0,0,0,.28)'); ell(g, px, py, r, r * .72, h(15) < .5 ? '#8f8b80' : '#a39d90', h(16) * 3); }
        if (h(17) < .12) rock(g, mx + nx * (27 + h(18) * 6), my + ny * (27 + h(18) * 6), 6 + h(19) * 5, 4000 + i);
      }
    }
  }

  // ramps: an earth slope laid across the cliff, painted into a small layer and masked to the cliff band so it melts into the ground
  function rampBox(Rp) { if (!Rp.bb) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of Rp.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } Rp.bb = [x0, y0, x1, y1]; } return Rp.bb; }
  const rampWalk = (Rp, fn) => {   // calls fn(x, y, dirX, dirY, s) every 1 px of arc along the ramp polyline (from the low end)
    let s = 0;
    for (let i = 0; i < Rp.pts.length - 1; i++) { const a = Rp.pts[i], b = Rp.pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / l, dy = (b[1] - a[1]) / l; for (let u = 0; u < l; u += 1, s += 1) fn(a[0] + dx * u, a[1] + dy * u, dx, dy, s); }
  };
  function rampLayer(g, kind) {
    for (const Rp of FM.RAMPS) {
      const bb = rampBox(Rp), hw = Rp.hw, pad = hw + 70;
      if (!bbVis(bb, pad)) continue;
      const ox = bb[0] - pad, oy = bb[1] - pad, w = bb[2] - bb[0] + pad * 2, h = bb[3] - bb[1] + pad * 2;
      const oc = mk(w * sc, h * sc), og = oc.getContext('2d'), mc = mk(w * sc, h * sc), mg = mc.getContext('2d');
      og.setTransform(sc, 0, 0, sc, -ox * sc, -oy * sc); mg.setTransform(sc, 0, 0, sc, -ox * sc, -oy * sc);
      const track = Rp.kind === 'track';
      const path = c => { c.beginPath(); Rp.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); };
      og.lineJoin = 'round'; og.lineCap = 'round';
      if (kind === 'earth') {
        const cols = track ? ['#5e584b', '#7a7260', '#8d8470'] : ['#654f33', '#7d6340', '#93764a'];
        og.strokeStyle = 'rgba(40,30,20,.30)'; og.lineWidth = hw * 2 + 26; path(og); og.stroke();
        og.strokeStyle = cols[0]; og.lineWidth = hw * 2 + 6; path(og); og.stroke();
        og.strokeStyle = cols[1]; og.lineWidth = hw * 1.8; path(og); og.stroke();
        og.strokeStyle = cols[2]; og.globalAlpha = .6; og.lineWidth = hw * 1.1; path(og); og.stroke(); og.globalAlpha = 1;
        // pebbles of old use
        const pr = mulberry(Math.floor(hw * 7 + Rp.pts[0][0]));
        rampWalk(Rp, (x, y, dx, dy, s) => { if (s % 9) return; const o = (pr() - .5) * hw * 1.8, r = .9 + pr() * 2.2; circ(og, x - dy * o, y + dx * o, r, pr() < .5 ? 'rgba(48,38,28,.5)' : 'rgba(176,160,128,.45)'); });
      } else {
        // the incline: steps (a dark line, then a light one just above it) across the way up, a little wavy
        const step = 14;
        if (track) rampWalk(Rp, (x, y, dx, dy, s) => {   // a goat track: flat stones to step on, scuffed earth between
          if (s % 10) return; const k = s / 10 | 0, o = ((k % 2) ? 1 : -1) * hw * (.15 + .5 * hash(k, 7)), px = x + dy * o, py = y - dx * o, ang = Math.atan2(dy, dx) + (hash(k, 9) - .5);
          ell(og, px + 1.5, py + 2.5, 8.5, 5, 'rgba(0,0,0,.3)', ang); ell(og, px, py, 8, 4.8, hash(k, 11) < .5 ? '#8d887c' : '#a39e90', ang); ell(og, px - 1.6, py - 1.2, 4.4, 2, 'rgba(255,250,235,.25)', ang);
        });
        else rampWalk(Rp, (x, y, dx, dy, s) => {
          if (s % step) return;
          const wob = (noise(s * .07, Rp.hw) - .5) * 5, hh = hw * (track ? .85 : .93) + wob;
          const x0 = x + dy * hh, y0 = y - dx * hh, x1 = x - dy * hh, y1 = y + dx * hh;
          const bow = (hash(s, 5) - .3) * 7;
          og.strokeStyle = 'rgba(36,26,14,.20)'; og.lineWidth = 2.2; og.beginPath(); og.moveTo(x0, y0); og.quadraticCurveTo(x + dx * bow, y + dy * bow, x1, y1); og.stroke();
          og.strokeStyle = 'rgba(236,214,170,.12)'; og.lineWidth = 1.2; og.beginPath(); og.moveTo(x0 + dx * 2.4, y0 + dy * 2.4); og.quadraticCurveTo(x + dx * (bow + 2.4), y + dy * (bow + 2.4), x1 + dx * 2.4, y1 + dy * 2.4); og.stroke();
        });
        // a rope of small stones down each side
        if (!track) rampWalk(Rp, (x, y, dx, dy, s) => { if (s % 20) return; for (const sd of [-1, 1]) circ(og, x + dy * sd * (hw - 3), y - dx * sd * (hw - 3), 2.2, 'rgba(34,28,22,.5)'); });
      }
      // mask: only the cliff band (and a soft edge round it)
      mg.lineJoin = 'round'; mg.strokeStyle = '#000';
      for (const [lw, al] of [[104, .2], [88, .3], [72, .5], [58, 1]]) { mg.globalAlpha = al; for (const pl of FM.PLATEAUS) { if (!bbVis(bbOf(pl), 60)) continue; polyPath(mg, pl.poly); mg.lineWidth = lw; mg.stroke(); } }
      mg.globalAlpha = 1;
      og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'destination-in'; og.drawImage(mc, 0, 0); og.globalCompositeOperation = 'source-over';
      g.drawImage(oc, ox, oy, w, h);
    }
  }
  // boulders heaped along both sides of a ramp where it cuts through the cliff
  function rampCheeks(g) {
    for (const Rp of FM.RAMPS) {
      const bb = rampBox(Rp), hw = Rp.hw; if (!bbVis(bb, hw + 40)) continue;
      const pr = mulberry(Math.floor(hw * 11 + Rp.pts[0][1])), track = Rp.kind === 'track';
      rampWalk(Rp, (x, y, dx, dy, s) => {
        if (s % (track ? 15 : 19)) return;
        for (const sd of [-1, 1]) { const o = sd * (hw + 4 + pr() * 8), px = x + dy * o, py = y - dx * o, r = (track ? 5 : 7) + pr() * 6, sx = pr() * 900 | 0; if (outlineD(px, py) < FM.CLIFF_HW + 16 && vis(px, py, r + 10)) rock(g, px, py, r, 5000 + sx); }
      });
    }
  }

  // the river: a ribbon along its centreline in layers (wet bank, shallows, mid-water, the deep channel that actually blocks), then the pond
  function ribbon(g, widthAt, step) {
    const Lp = [], Rr = [];
    for (let i = 0; i < RV.length; i += step) { const p = RV[i], w = widthAt(p, i); Lp.push([p[0] - p[4] * w, p[1] + p[3] * w]); Rr.push([p[0] + p[4] * w, p[1] - p[3] * w]); }
    g.beginPath(); Lp.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]); g.closePath();
  }
  const dFordOf = p => Math.hypot(p[0] - P.ford[0], p[1] - P.ford[1]);
  const deepW = p => { const d = dFordOf(p); return d <= FM.FORD_R ? 0 : Math.max(0, p[5] - FM.deepIn(d, p[5])); };
  function riverArt(g) {
    if (VX1 < 4100 || VX0 > 5400) return;
    const nz = (i, k) => noise(i * .35 + k, 5) - .5;
    g.lineJoin = 'round';
    g.fillStyle = 'rgba(122,104,70,.26)'; ribbon(g, (p, i) => p[5] + 32 + nz(i, 1) * 16, 2); g.fill();
    g.fillStyle = 'rgba(100,86,58,.55)'; ribbon(g, (p, i) => p[5] + 15 + nz(i, 2) * 9, 2); g.fill();
    g.fillStyle = '#76a198'; ribbon(g, (p, i) => p[5] + nz(i, 3) * 4, 2); g.fill();              // shallows over pale sand
    g.fillStyle = '#5b9aa0'; ribbon(g, (p, i) => { const f = clamp((dFordOf(p) - FM.FORD_R + 40) / 110, 0, 1); return (p[5] - 12) * f; }, 2); g.fill();   // mid-water
    g.fillStyle = '#3a7488'; ribbon(g, (p, i) => deepW(p) * 1.18 + 2 * (deepW(p) > 0), 2); g.fill();
    g.fillStyle = '#2b6076'; ribbon(g, (p, i) => deepW(p) * .98, 2); g.fill();                   // the deep channel (matches what blocks)
    g.fillStyle = '#214e63'; ribbon(g, (p, i) => deepW(p) * .55, 2); g.fill();
    // foam at the edge of the shallows, pebbles on the shoals
    for (const side of [-1, 1]) {
      g.strokeStyle = 'rgba(240,248,242,.42)'; g.lineWidth = 1.5; g.lineCap = 'round'; g.setLineDash([9, 13]); g.beginPath();
      RV.forEach((p, i) => { if (i % 2) return; const o = side * (p[5] - 1 + nz(i, 4) * 4), x = p[0] - p[4] * o, y = p[1] + p[3] * o; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke(); g.setLineDash([]);
    }
    for (let i = 0; i < 260; i++) {
      const p = RV[(hash(i, 1501) * RV.length) | 0], o = (hash(i, 1502) - .5) * p[5] * 1.9, x = p[0] - p[4] * o, y = p[1] + p[3] * o; if (!vis(x, y, 20)) continue;
      const shoal = Math.abs(o) > p[5] - 30 || dFordOf(p) <= FM.FORD_R + 20;
      if (shoal) circ(g, x, y, 1.2 + hash(i, 1503) * 2.4, hash(i, 1504) < .5 ? 'rgba(206,194,156,.55)' : 'rgba(112,110,98,.5)');
    }
  }
  function pondR(a, T, Pd) {   // distance from the pond's centre to where its norm reaches T, along angle a (the same formula as the map's)
    let lo = 0, hi = 1.8;
    for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2, px = Pd.x + Math.cos(a) * m * Pd.rx, py = Pd.y + Math.sin(a) * m * Pd.ry, nn = Math.hypot((px - Pd.x) / Pd.rx, (py - Pd.y) / Pd.ry) + (FM.fbm(px / 60, py / 60) - .5) * .3; if (nn < T) lo = m; else hi = m; }
    return lo;
  }
  function pondArt(g) {
    for (const Pd of [FM.POND].concat(FM.POOLS)) {
      if (vis(Pd.x, Pd.y, Math.max(Pd.rx, Pd.ry) * 1.8)) for (let i = 0, n = 14; i < n; i++) { const a = i / n * TAU + hash(i, Pd.x | 0) * .4, k = 1.15 + .35 * hash(i, 77); blob(g, Pd.x + Math.cos(a) * Pd.rx * k, Pd.y + Math.sin(a) * Pd.ry * k, Math.max(Pd.rx, Pd.ry) * (.35 + .25 * hash(i, 78)), [92, 84, 56], .16); }   // wet mud grading out from the water
      poolArt(g, Pd);
    }
  }
  function poolArt(g, Pd) {
    const deep = Pd === FM.POND || Pd.deep, pondRadius = (a, T) => pondR(a, T, Pd);
    if (Pd.x + Pd.rx * 2 < VX0 || Pd.x - Pd.rx * 2 > VX1 || Pd.y + Pd.ry * 2 < VY0 || Pd.y - Pd.ry * 2 > VY1) return;
    const blobPath = (T, grow) => { g.beginPath(); const n = 40; for (let i = 0; i <= n; i++) { const a = i / n * TAU, m = pondRadius(a, T) + grow / Pd.rx, x = Pd.x + Math.cos(a) * m * Pd.rx, y = Pd.y + Math.sin(a) * m * Pd.ry; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
    g.fillStyle = 'rgba(112,96,64,.35)'; blobPath(1, .22); g.fill();
    g.fillStyle = 'rgba(96,84,58,.6)'; blobPath(1, .09); g.fill();
    g.fillStyle = '#76a198'; blobPath(1, 0); g.fill();
    g.fillStyle = deep ? '#4f8f9a' : '#6a9c90'; blobPath(.78, 0); g.fill();
    if (deep) { g.fillStyle = '#2f6a80'; blobPath(Pd === FM.POND ? .5 : .4, 0); g.fill(); g.fillStyle = '#245a70'; blobPath(.3, 0); g.fill(); }
    g.strokeStyle = 'rgba(240,248,242,.4)'; g.lineWidth = 1.4; g.setLineDash([8, 12]); blobPath(.98, 0); g.stroke(); g.setLineDash([]);
    // reeds and a lily pad or two round the shore
    for (let i = 0; i < 46; i++) {
      const a = hash(i, 1601) * TAU, m = pondRadius(a, 1) * (1.0 + hash(i, 1602) * .12), x = Pd.x + Math.cos(a) * m * Pd.rx, y = Pd.y + Math.sin(a) * m * Pd.ry;
      if (!vis(x, y, 20)) continue;
      for (let k = 0; k < 4; k++) { const rx = x + (hash(i, 1610 + k) - .5) * 12, ry = y + (hash(i, 1620 + k) - .5) * 8, hgt = 12 + hash(i, 1630 + k) * 14; line(g, rx, ry, rx + (hash(i, 1640 + k) - .5) * 5, ry - hgt, '#587d3c', 1.5); if (k === 0 && hash(i, 1650) < .5) line(g, rx, ry - hgt, rx, ry - hgt - 5, '#6b4a2b', 3); }
    }
    for (let i = 0; i < 6; i++) { const a = hash(i, 1660) * TAU, m = pondRadius(a, .7) * hash(i, 1661) * .8, x = Pd.x + Math.cos(a) * m * Pd.rx, y = Pd.y + Math.sin(a) * m * Pd.ry; if (vis(x, y, 10)) { ell(g, x, y, 6, 3.6, '#4d7a3c', a); ell(g, x - 1, y - 1, 3, 1.6, 'rgba(180,220,120,.5)', a); } }
  }

  function paintTile(g, tx, ty) {
    VX0 = tx * TS; VY0 = ty * TS; VX1 = VX0 + TS; VY1 = VY0 + TS;
    const bl = (x, y, r, c, a) => { if (vis(x, y, r)) blob(g, x, y, r, c, a); };
    const cc = (x, y, r, f) => { if (vis(x, y, r)) circ(g, x, y, r, f); };
    const ee = (x, y, rx, ry, f, rot) => { if (vis(x, y, Math.max(rx, ry))) ell(g, x, y, rx, ry, f, rot); };
    const rk = (x, y, r, s) => { if (vis(x, y, r + 8)) rock(g, x, y, r, s); };

    // ---- ground: grass in patches, tufts, wildflowers
    g.fillStyle = '#4b6636'; g.fillRect(VX0, VY0, TS, TS);
    seedR(101);
    for (let i = 0; i < 5200; i++) { const x = rr(-50, W + 50), y = rr(-50, H + 50), r = rr(80, 300), n = fbm(x / 900, y / 900), a = rr(.07, .14); bl(x, y, r, n > .56 ? [104, 132, 66] : n > .42 ? [72, 102, 50] : [50, 76, 42], a); }
    // broad swathes of drier and lusher ground (soft, large, seeded), so no stretch of the valley sits on one flat green
    for (let i = 0; i < 1500; i++) { const x = rr(-50, W + 50), y = rr(-50, H + 50), r = rr(220, 460), n = fbm(x / 2200 + 40, y / 2200 + 40); if (!vis(x, y, r)) continue; if (n > .58) bl(x, y, r, [150, 150, 78], rr(.05, .1)); else if (n < .4) bl(x, y, r, [40, 92, 58], rr(.05, .1)); else if (R() < .25) bl(x, y, r, [96, 118, 64], .05); }
    for (let i = 0; i < 1000; i++) { const a = R() * TAU, d = Math.sqrt(R()), r = rr(50, 130); bl(P.meadow[0] + Math.cos(a) * d * 860, P.meadow[1] + 60 + Math.sin(a) * d * 660, r, [140, 160, 76], .1); }
    for (let i = 0; i < 1000; i++) { const a = R() * TAU, d = Math.sqrt(R()), r = rr(50, 120); bl(5760 + Math.cos(a) * d * 760, 960 + Math.sin(a) * d * 880, r, [28, 48, 32], .12); }
    {
      const pa = [new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < 32000; i++) {
        const x = rr(0, W), y = rr(0, H), k = R(), a = rr(-2, 2), b = rr(3, 7), c = rr(-2, 2), d = rr(2, 5);
        if (!vis(x, y, 10)) continue;
        const p = pa[k < .4 ? 0 : k < .75 ? 1 : 2]; p.moveTo(x, y); p.lineTo(x + a, y - b); p.moveTo(x + 3, y + 1); p.lineTo(x + 3 + c, y - d);
      }
      g.lineWidth = 1.2; g.lineCap = 'butt';
      g.strokeStyle = 'rgba(130,170,84,.38)'; g.stroke(pa[0]); g.strokeStyle = 'rgba(36,60,32,.35)'; g.stroke(pa[1]); g.strokeStyle = 'rgba(168,160,86,.3)'; g.stroke(pa[2]);
    }
    for (let i = 0; i < 2600; i++) {
      const a = R() * TAU, d = Math.sqrt(R()), x = P.meadow[0] + Math.cos(a) * d * 860, y = P.meadow[1] + 60 + Math.sin(a) * d * 660, k = R(), r = rr(1.6, 2.8);
      if (Math.hypot(x - P.meadow[0] - 200, y - P.meadow[1]) < 380 || laneD(x, y) < 60) continue;
      cc(x, y, r, k < .35 ? 'rgba(244,240,226,.85)' : k < .6 ? 'rgba(240,206,80,.85)' : k < .8 ? 'rgba(220,150,170,.8)' : 'rgba(180,150,220,.75)');
    }
    // high ground, dressed ground, woods; the beacon hill's stones
    {
      groundDetail(g); plateauTops(g); woodFloor(g);
      for (let i = 0; i < 40; i++) { const a = R() * TAU, d = rr(.5, 1); rk(P.beacon[0] + Math.cos(a) * 300 * d, P.beacon[1] + Math.sin(a) * 250 * d, rr(5, 11), i + 300); }
    }

    // ---- cliffs and the ramps through them
    cliffs(g); rampLayer(g, 'earth');

    // ---- roads and footpaths
    seedR(202);
    // worn verges: a dusty fringe of trodden grass on both sides of every road and path, thinning outward, so they grow out of the grass
    for (const [pl, hw] of [[L1, 62], [L2, 56], [FOOT.beacon, 15], [FOOT.meadow, 17], [FOOT.forge, 22], [FOOT.woods, 15], [FOOT.gate, 15]]) {
      let next = 0;
      for (let i = 0; i < pl.length; i++) {
        const q = pl[i]; if (q[2] < next || !vis(q[0], q[1], hw + 90)) continue; next = q[2] + (hw > 30 ? 30 : 22);
        for (const sd of [-1, 1]) {
          const o = sd * (hw + rr(0, hw > 30 ? 30 : 12)), x = q[0] - q[4] * o, y = q[1] + q[3] * o;
          bl(x, y, rr(hw > 30 ? 34 : 20, hw > 30 ? 62 : 34), [126, 104, 64], rr(.06, .11));
          if (R() < .5) { const o2 = sd * (hw + rr(26, hw > 30 ? 80 : 46)); bl(q[0] - q[4] * o2, q[1] + q[3] * o2, rr(18, 38), [104, 128, 62], rr(.05, .09)); }
        }
      }
    }
    pathStrip(g, L1, 62, '#8a6f48', 'rgba(88,72,44,.5)', true, vis);
    pathStrip(g, L2, 56, '#8a6f48', 'rgba(88,72,44,.5)', true, vis);
    pathStrip(g, FOOT.beacon, 15, 'rgba(150,126,84,.8)', 'rgba(110,100,60,.4)', false, vis);
    pathStrip(g, FOOT.meadow, 17, 'rgba(150,126,84,.8)', 'rgba(110,100,60,.4)', false, vis);
    pathStrip(g, FOOT.forge, 22, 'rgba(140,116,78,.9)', 'rgba(100,86,50,.4)', false, vis);
    pathStrip(g, FOOT.woods, 15, 'rgba(150,126,84,.8)', 'rgba(110,100,60,.4)', false, vis);
    pathStrip(g, FOOT.gate, 15, 'rgba(150,126,84,.8)', 'rgba(110,100,60,.4)', false, vis);
    rampLayer(g, 'steps'); rampCheeks(g);
    // chevrons pressed into the earth: the way the hungry things walk
    for (const pl of [L1, L2]) {
      const tot = pl[pl.length - 1][2]; let i = 0;
      for (let s = 80; s < tot - 160; s += (s < 1520 ? 220 : 780)) {
        while (i < pl.length - 1 && pl[i][2] < s) i++;
        const p = pl[i]; if (pl === L2 && p[1] > 3000 && p[0] < 3520) continue;
        if (vis(p[0], p[1], 24)) chevron(g, p[0], p[1], Math.atan2(p[4], p[3]), 1.05, s < 1520 ? .42 : .3);
      }
    }
    // soil patches at the work sites
    seedR(303);
    [[P.gate[0] - 20, P.gate[1] + 20, 190], [P.forge[0], P.forge[1], 120], [P.woods[0], P.woods[1], 150], [1400, 1620, 90]].forEach(([x, y, r], j) => {
      for (let i = 0; i < 40; i++) { const a = R() * TAU, d = Math.sqrt(R()) * r, rad = rr(24, 50), al = rr(.18, .3); bl(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, rad, j === 2 ? [104, 84, 56] : [118, 96, 62], al); }
    });

    // ---- the camp's trodden ground
    seedR(404);
    { const CX = P.hearth[0], CY = P.hearth[1] + 50;
      for (let k = 0; k < 3; k++) for (let i = 0; i < 150; i++) {
        const a = i / 150 * TAU, rad = (540 + 80 * fbm(Math.cos(a) * 1.2 + 4, Math.sin(a) * 1.2 + 4) + 60 * Math.sin(a * 3)) * (k === 0 ? 1.12 : k === 1 ? 1 : .8);
        for (let j = 0; j < 4; j++) { const rrr = rad * (.55 + j * .15), r = rr(90, 150); bl(CX + Math.cos(a) * rrr * 1.06, CY + Math.sin(a) * rrr * .9, r, k === 0 ? [96, 84, 52] : k === 1 ? [92, 72, 48] : [82, 62, 42], k === 0 ? .1 : .16); }
      }
      // worn dents and puddles: a few small groups where people gather (round the fires, the supply tent, the first tents), not strewn over the ground
      { const spots = [...PITS.map(p => [p[0], p[1], p[2] + 40]), [SHOP_AT[0], SHOP_AT[1] + 70, 60], ...TENTS.slice(0, 4).map(t => [t[0], t[1] + 50, 40])];
        for (const [sx, sy, sr] of spots) for (let i = 0; i < 3; i++) { const a = R() * TAU, d = sr * (.6 + R() * .6), x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * .8, rx = rr(12, 22), ry = rr(6, 10), rot = R() * 3; ee(x, y, rx, ry, 'rgba(40,30,22,.4)', rot); if (i === 0) ee(x - 1, y - 1, rx * .6, ry * .5, 'rgba(122,148,164,.35)', rot); } }
      { const pa = new Path2D(); for (let i = 0; i < 600; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 540, x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d * .85, u = rr(-6, 6), v = rr(-3, 3); if (vis(x, y, 8)) { pa.moveTo(x, y); pa.lineTo(x + u, y + v); } } g.strokeStyle = 'rgba(200,170,90,.35)'; g.lineWidth = 1; g.stroke(pa); }
      for (let i = 0; i < 300; i++) {   // the fringe: dirt that creeps out in tongues where the ground is worn, and grass that pokes in where it is not
        const a = R() * TAU, n = fbm(Math.cos(a) * 1.6 + 9, Math.sin(a) * 1.6 + 9), d = 500 + 170 * n + 100 * R();
        if (R() < .35) continue; bl(CX + Math.cos(a) * d * 1.06, CY + Math.sin(a) * d * .9, rr(34, 90), [98, 82, 52], rr(.05, .1));
        if (R() < .3) bl(CX + Math.cos(a) * (d - 90) * 1.06, CY + Math.sin(a) * (d - 90) * .9, rr(26, 50), [72, 104, 52], .09);
      }
      for (let i = 0; i < 380; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 560, rot = R() * 3; ee(CX + Math.cos(a) * d, CY + Math.sin(a) * d * .85, 2.2, 3.4, 'rgba(40,30,22,.28)', rot); }
      for (const side of [-1, 1]) if (vis(1700, 1880, 220)) { g.strokeStyle = 'rgba(40,30,20,.3)'; g.lineWidth = 4; g.beginPath(); g.moveTo(1560 + side * 22, 1780); g.quadraticCurveTo(1590 + side * 24, 1900, 1900, 1970 + side * 18); g.stroke(); }
    }

    // ---- the river and its ford
    seedR(505);
    riverArt(g); pondArt(g);
    { const pa = [new Path2D(), new Path2D()];
      for (let i = 0; i < 900; i++) { const p = RV[Math.floor(R() * RV.length)], o = (R() - .5) * p[5] * 1.6, x = p[0] - p[4] * o, y = p[1] + p[3] * o, len = rr(12, 34), k = R(), lw = rr(1.2, 2.6); if (!vis(x, y, 40)) continue; const pt = pa[k < .5 ? 0 : 1]; pt.moveTo(x, y); pt.lineTo(x + p[3] * len * .15, y + p[4] * len); void lw; }
      g.lineWidth = 2; g.lineCap = 'round'; g.strokeStyle = 'rgba(190,226,230,.3)'; g.stroke(pa[0]); g.strokeStyle = 'rgba(20,50,64,.3)'; g.stroke(pa[1]); }
    for (const side of [-1, 1]) RV.forEach((p, i) => { if (i % 2) return; const o = side * (p[5] + 2 + noise(i * .3, side) * 8), x = p[0] - p[4] * o, y = p[1] + p[3] * o, k = R(), r = rr(2, 5); if (k < .6) cc(x, y, r, 'rgba(235,242,240,.35)'); });
    for (let i = 0; i < 90; i++) {
      const p = RV[Math.floor(R() * RV.length)]; if (Math.abs(p[1] - P.ford[1]) < 220) continue;
      const side = R() < .5 ? -1 : 1, o = side * (p[5] + rr(8, 26)), x = p[0] - p[4] * o, y = p[1] + p[3] * o;
      if (laneD(x, y) < 90 || Math.hypot(x - P.forge[0], y - P.forge[1]) < 110) continue;
      for (let k = 0; k < 7; k++) { const rx = x + rr(-10, 10), ry = y + rr(-8, 8), a = rr(-4, 4), b = rr(10, 20); if (!vis(rx, ry, 24)) continue; line(g, rx, ry, rx + a, ry - b, '#4e7338', 1.6); if (k % 3 === 0) line(g, rx, ry - 14, rx + 1, ry - 22, '#6b4a2b', 3); }
    }
    { const fi = RV.filter(p => Math.abs(p[1] - P.ford[1]) < 120);
      ee(5080, 2222, 118, 62, 'rgba(120,180,170,.22)'); ee(5080, 2222, 100, 46, 'rgba(150,205,185,.28)'); ee(5080, 2222, 80, 30, 'rgba(176,205,170,.25)');
      if (vis(5080, 2222, 140)) for (let i = 0; i < 40; i++) { const sx = 4970 + i * 6; line(g, sx, 2210 + Math.sin(i) * 4, sx + 5, 2236 + Math.cos(i) * 4, 'rgba(190,176,140,.3)', 2, 'butt'); }
      for (let i = 0; i < 150; i++) { const p = fi[Math.floor(R() * fi.length)], x = p[0] + rr(-90, 90), y = p[1] + rr(-30, 30), r = rr(1.5, 4), k = R(); cc(x, y, r, k < .5 ? 'rgba(190,176,140,.75)' : 'rgba(110,104,90,.7)'); }
      ee(5040, 2185, 30, 11, 'rgba(180,164,128,.5)'); ee(5150, 2260, 38, 12, 'rgba(180,164,128,.5)');
      for (let i = 0; i < 12; i++) { const x = 4960 + i * 20 + rr(-3, 3), y = 2222 + Math.sin(i * 1.1) * 9; if (!vis(x, y, 16)) continue; ell(g, x + 2, y + 3, 11, 8, 'rgba(0,0,0,.25)'); ell(g, x, y, 10, 7, i % 2 ? '#8a877d' : '#9a968a'); ell(g, x - 2, y - 2, 5, 3, 'rgba(255,255,240,.18)'); }
      for (let i = 0; i < 16; i++) { const p = fi[Math.floor(R() * fi.length)], x = p[0] + rr(-100, 100), y = p[1] + rr(-50, 50), r = rr(4, 8); if (Math.abs(y - 2222) < 20) continue; rk(x, y, r, 500 + i); }
      // a child's paper boat, sailed into the reeds at the ford's edge
      if (vis(5010, 2268, 20)) { g.save(); g.translate(5010, 2268); g.rotate(-.5); g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(1, 2, 9, 3.4, 0, 0, TAU); g.fill(); g.fillStyle = '#e6dcc0'; g.beginPath(); g.moveTo(-9, -1); g.lineTo(9, -1); g.lineTo(5, 3); g.lineTo(-5, 3); g.fill(); g.fillStyle = '#d3c8a8'; g.beginPath(); g.moveTo(0, -1); g.lineTo(0, -9); g.lineTo(5, -1); g.fill(); g.restore(); }
    }

    // ---- the beacon's hearth-stones
    { const b = P.beacon;
      cc(b[0] + 4, b[1] + 6, 64, 'rgba(0,0,0,.25)');
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; rk(b[0] + Math.cos(a) * 50, b[1] + Math.sin(a) * 50, 10, 600 + i); }
      cc(b[0], b[1], 42, '#5d5850'); cc(b[0], b[1], 38, '#716b60');
      seedR(606); for (let i = 0; i < 30; i++) { const a = R() * TAU, d = R() * 34, r = rr(3, 6), k = R(); cc(b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d, r, k < .5 ? '#7d776b' : '#6a655a'); }
    }

    // ---- mountains and the two gates of the dark
    for (const p of LAY.peaks) if (vis(p.x, p.y, p.r * 1.4)) peak(g, p.x, p.y, p.r, p.seed, p.snow);
    seedR(707);
    for (let i = 0; i < 160; i++) { const x = rr(0, W), y = rr(420, 600), r = rr(4, 9); if (x > 2600 && x < 3400) continue; rk(x, y, r, 800 + i); }
    if (vis(2980, 140, 300)) { const fg = g.createLinearGradient(2760, 0, 2760, 280); fg.addColorStop(0, 'rgba(210,218,226,.4)'); fg.addColorStop(1, 'rgba(210,218,226,0)'); g.fillStyle = fg; g.fillRect(2660, 0, 640, 280); }
    [P.spawn1, P.spawn2].forEach((sp, k) => {
      const [x, y] = sp; if (!vis(x, y, 180)) return;
      const q = mulberry(9000 + k), qr = (a, b) => a + (b - a) * q();
      for (let i = 0; i < 34; i++) { const a = q() * TAU, d = Math.sqrt(q()) * 105; blob(g, x + Math.cos(a) * d, y + Math.sin(a) * d * .85, qr(18, 44), [30, 18, 30], .36); }
      ell(g, x, y, 112, 94, 'rgba(26,16,26,.35)');
      g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const a = q() * TAU, a2 = a + qr(-.3, .3), l1 = qr(55, 100), l2 = qr(48, 84); line(g, x + Math.cos(a) * 18, y + Math.sin(a) * 15, x + Math.cos(a2) * l1, y + Math.sin(a2) * l2, 'rgba(12,8,12,.62)', 2); line(g, x + Math.cos(a) * 18, y + Math.sin(a) * 15, x + Math.cos(a2) * l1 * .6, y + Math.sin(a2) * l2 * .6, 'rgba(190,110,60,.25)', 1); }
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + .3 + k, px = x + Math.cos(a) * 92, py = y + Math.sin(a) * 78; if (laneD(px, py) < LANE_HW + 22) continue; g.save(); g.translate(px, py); g.rotate(a + Math.PI / 2); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-6 + 4, -13 + 5, 12, 26); g.fillStyle = '#35302d'; g.fillRect(-6, -13, 12, 26); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-6, -13, 4, 26); g.fillStyle = 'rgba(150,90,60,.4)'; g.fillRect(-4, -9, 8, 1.6); g.fillRect(-4, -3, 8, 1.6); g.restore(); }
      // tattered dark pennants either side of the road
      const dir = k ? [-1, 0] : [0, 1], nx = -dir[1], ny = dir[0];
      for (const s of [-1, 1]) { const fx = x + dir[0] * 118 + nx * s * 96, fy = y + dir[1] * 118 + ny * s * 96; line(g, fx, fy, fx, fy - 36, '#2a2220', 2.6); g.fillStyle = '#3a2a3c'; g.beginPath(); g.moveTo(fx, fy - 36); g.lineTo(fx + 15, fy - 31); g.lineTo(fx + 8, fy - 27); g.lineTo(fx + 16, fy - 22); g.lineTo(fx, fy - 24); g.fill(); }
    });

    // ---- the camp
    hearthBase(g);
    for (const t of TENTS) if (vis(t[0], t[1], 90)) tent(g, t[0], t[1], t[2], t[3], t[4], t[5], t[6]);
    if (vis(SHOP_AT[0], SHOP_AT[1], 120)) shopTent(g);
    if (vis(3600, 4080, 140)) { g.save(); g.translate(1800, 2040); barrel(g, 1720, 2000); barrel(g, 1740, 2012); crate(g, 1735, 1985, 18, .3); crate(g, 1872, 2028, 20, .1); crate(g, 1890, 2044, 18, -.2); barrel(g, 1862, 2108); g.restore(); }
    for (const c of CARTS) if (vis(c[0], c[1], 90)) {
      if (c[3] === 'broken') {   // a cart that lost a wheel on the road: propped on a log, the wheel leaning against it
        cart(g, c[0], c[1], c[2], 'broken'); g.save(); g.translate(c[0], c[1]); g.rotate(c[2]); g.fillStyle = '#6d5236'; g.fillRect(14, 20, 24, 8); circ(g, 38, 24, 4, '#c9a77a'); wheel(g, 56, 44, 11, .5); line(g, 40, 30, 42, 46, '#4a3622', 2); g.restore();
        for (let i = 0; i < 4; i++) ell(g, c[0] + 40 + i * 8, c[1] + 58 + (i % 2) * 6, 5, 3.4, '#c4aa78');
      } else cart(g, c[0], c[1], c[2], c[3]);
    }
    for (const p of PITS) if (vis(p[0], p[1], 80)) {
      pitFire(g, p[0], p[1], p[2]);
      for (let i = 0; i < 3; i++) { const a = 2.4 + i * 1.3 + p[0] % 3, d = p[2] + 34; g.save(); g.translate(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d); g.rotate(a + Math.PI / 2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-14 + 2, -4 + 3, 28, 8); g.fillStyle = '#7d5e3c'; g.fillRect(-14, -4, 28, 8); circ(g, 14, 0, 4, '#c9a77a'); g.restore(); }
    }
    // survey stakes round the Hearth: where the square will be
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + .15, x = hearthXY[0] + Math.cos(a) * 300, y = hearthXY[1] + Math.sin(a) * 280;
      if (!vis(x, y, 20) || laneD(x, y) < LANE_HW + 8) continue; let hit = false; for (const t of TENTS) if (Math.hypot(t[0] - x, t[1] - y) < t[7] + 14) hit = true; if (Math.hypot(x - SHOP_AT[0], y - SHOP_AT[1]) < 100 || Math.hypot(x - P.spring[0], y - P.spring[1]) < 80) hit = true;
      if (!hit) stake(g, x, y, i % 2 ? '#e6dcc0' : '#c9a45c', (i % 3 - 1) * 1.4);
    }
    campFence(g);
    // stacked timber and stone, laid out by the work still to do
    if (vis(2960, 3680, 60)) { g.save(); g.translate(1480, 1840); logPile(g, 1470, 1836, .3, 5, 56); logPile(g, 1452, 1868, .12, 4, 50); g.restore(); }
    if (vis(3400, 3480, 80)) { g.save(); g.translate(1700, 1740); rect(g, 1688, 1678, 4, 26, '#5d4329'); rect(g, 1736, 1678, 4, 26, '#5d4329'); rect(g, 1682, 1664, 64, 20, '#8a6a45', '#3d2c1b', 1.2); [[1688, 1668, '#e6dcc0'], [1704, 1670, '#d3c8a8'], [1720, 1667, '#e6dcc0']].forEach(([x, y, c]) => { rect(g, x, y, 11, 14, c); line(g, x + 2, y + 4, x + 9, y + 4, 'rgba(60,40,20,.5)', 1, 'butt'); line(g, x + 2, y + 8, x + 8, y + 8, 'rgba(60,40,20,.5)', 1, 'butt'); }); g.restore(); }
    if (vis(2710, 3308, 100)) laundry(g, 2645, 3304, 2775, 3312, 7);
    if (vis(3990, 4060, 80)) laundry(g, 3988, 4026, 3999, 4102, 3);
    if (vis(2524, 3470, 40)) { g.save(); g.translate(1262, 1735); stickHorse(g, 1268, 1736, .35); ell(g, 1290, 1750, 8, 8, 'rgba(0,0,0,0)'); g.strokeStyle = '#8a6a45'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(1296, 1752, 9, 9, 0, 0, TAU); g.stroke(); line(g, 1308, 1750, 1322, 1740, '#6a4d2f', 1.8); g.restore(); }
    if (vis(3760, 3400, 80)) { g.save(); g.translate(1880, 1700); hopscotch(g, 1884, 1712, .1); circ(g, 1850, 1742, 5, 'rgba(0,0,0,.2)'); ell(g, 1850, 1741, 5.4, 6.4, '#b9a58a'); circ(g, 1850, 1735, 3.4, '#e2bd96'); circ(g, 1850, 1734, 3.6, '#7a5a38'); g.restore(); }
    if (vis(4300, 3980, 80)) { g.save(); g.translate(2150, 1990);   // fish drying beside the river
      for (const x of [2128, 2178]) { line(g, x, 2000, x, 1978, '#5d4329', 3); } line(g, 2126, 1982, 2180, 1982, '#6a4d2f', 2.4);
      for (let i = 0; i < 4; i++) { ell(g, 2138 + i * 12, 1992, 3, 8, '#aab4b6', .1); line(g, 2138 + i * 12, 1982, 2138 + i * 12, 1986, '#6a4d2f', 1); }
      g.restore();
    }
    if (vis(4350, 4188, 40)) {   // a rowboat hauled up on the bank
      g.save(); g.translate(4332, 4192); g.rotate(1.35); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(3, 4, 32, 11, 0, 0, TAU); g.fill();
      g.fillStyle = '#6d5236'; g.beginPath(); g.moveTo(-30, 0); g.quadraticCurveTo(0, -14, 32, 0); g.quadraticCurveTo(0, 14, -30, 0); g.fill(); g.fillStyle = '#4a3622'; g.beginPath(); g.moveTo(-24, 0); g.quadraticCurveTo(0, -9, 26, 0); g.quadraticCurveTo(0, 9, -24, 0); g.fill();
      line(g, -8, -8, -8, 8, '#8a6a45', 2.6); line(g, 8, -8, 8, 8, '#8a6a45', 2.6); line(g, -4, 2, 30, 14, '#a58a5c', 1.8); g.restore();
    }
    // survey plots for the town to come
    PLOTS.forEach((p, i) => { if (vis(p[0], p[1], 90)) survey(g, p[0], p[1], p[2], p[3], p[4], p[5], i + 1); });
    // the spring's ground
    { const s = P.spring; cc(s[0], s[1], 82, 'rgba(60,46,34,.55)'); cc(s[0], s[1], 70, '#4c3a2a'); seedR(808);
      for (let i = 0; i < 24; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 80, r = rr(2, 5), k = R(); cc(s[0] + Math.cos(a) * d, s[1] + Math.sin(a) * d, r, k < .5 ? '#6a523a' : '#3d2f22'); } }

    // ---- sites off the lanes
    { const fg = P.forge;
      if (vis(fg[0] + 140, fg[1] + 40, 140)) {   // the jetty the Smith quenches from
        ell(g, fg[0] + 140, fg[1] + 40, 76, 32, 'rgba(0,0,0,.2)');
        for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#7c5d3a' : '#6f5233'; g.fillRect(fg[0] + 100, fg[1] + 12 + i * 8, 100, 7); }
        for (let i = 0; i < 4; i++) { circ(g, fg[0] + 108 + i * 28, fg[1] + 8, 3, '#3d2c1b'); circ(g, fg[0] + 108 + i * 28, fg[1] + 62, 3, '#3d2c1b'); }
      }
      if (vis(fg[0], fg[1], 160)) { seedR(909); for (let i = 0; i < 22; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 90, rx = rr(6, 14), ry = rr(4, 9); ee(fg[0] - 10 + Math.cos(a) * d, fg[1] + 14 + Math.sin(a) * d * .7, rx, ry, 'rgba(26,22,20,.34)', R() * 3); } }
    }
    { const wd = P.woods; seedR(1001);
      for (let i = 0; i < 9; i++) { const x = wd[0] + rr(-120, 120), y = wd[1] + rr(-100, 100), r = rr(9, 15); if (vis(x, y, r + 4)) stump(g, x, y, r); }
      if (vis(5810, 1096, 40)) stump(g, 5810, 1096, 14);
      for (let i = 0; i < 4; i++) if (vis(wd[0], wd[1] + 80, 80)) logPile(g, wd[0] - 60 + i * 4, wd[1] + 70 + i * 8 - 3 * 7 * 0, .15, 5, 90);
      if (vis(wd[0] + 50, wd[1] - 40, 80)) {
        g.save(); g.translate(wd[0] + 50, wd[1] - 40); g.rotate(-.25); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-52, -14, 108, 36); g.fillStyle = '#6a4d2f'; g.fillRect(-50, -12, 104, 32); g.fillStyle = '#3a2a1c'; g.fillRect(-50, -2, 104, 8); g.strokeStyle = '#3a2a1c'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-44 + i * 15, -12); g.lineTo(-44 + i * 15, 20); g.stroke(); } g.restore();
        g.save(); g.translate(wd[0] - 30, wd[1] - 60); g.rotate(.4); g.fillStyle = '#9a7c50'; g.fillRect(-40, -3, 80, 6); g.restore();
        // sawhorse and a half-sawn plank, an axe left in a block
        g.save(); g.translate(wd[0] - 100, wd[1] - 8); g.rotate(-.1); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-26, -4, 56, 12); g.fillStyle = '#9a7c50'; g.fillRect(-28, -6, 56, 8); line(g, -22, 2, -26, 14, '#5d4329', 3); line(g, 22, 2, 26, 14, '#5d4329', 3); g.restore();
        circ(g, wd[0] - 150, wd[1] + 24, 11, 'rgba(0,0,0,.25)'); circ(g, wd[0] - 150, wd[1] + 22, 10, '#8a6a45'); circ(g, wd[0] - 150, wd[1] + 22, 7, '#c6a374'); line(g, wd[0] - 150, wd[1] + 22, wd[0] - 134, wd[1] + 10, '#5d4329', 2.6); g.fillStyle = '#8c8f94'; g.beginPath(); g.moveTo(wd[0] - 138, wd[1] + 6); g.lineTo(wd[0] - 128, wd[1] + 12); g.lineTo(wd[0] - 134, wd[1] + 18); g.fill();
        seedR(1002); for (let i = 0; i < 30; i++) { const x = wd[0] - 100 + rr(-30, 30), y = wd[1] - 8 + rr(-12, 18); cc(x, y, rr(1, 2), 'rgba(222,196,150,.4)'); }
      }
    }
    // the meadow's plots, pegged out before anyone has needed them
    [[1200, 3885], [1250, 3895], [1300, 3905], [1352, 3892], [1220, 3950], [1276, 3960], [1330, 3952]].forEach(([x, y], i) => { if (vis(x, y, 30)) { g.strokeStyle = 'rgba(232,224,196,.4)'; g.lineWidth = 1; g.strokeRect(x - 20, y - 10, 40, 22); stake(g, x - 20, y + 12, '#e6dcc0', 0); stake(g, x + 20, y - 10, '#e6dcc0', 0); } });
    if (vis(1280, 3720, 160)) { g.save(); g.translate(640, 1860); for (let i = 0; i < 5; i++) { const x = 560 + i * 40; line(g, x, 1868, x, 1850, '#5d4329', 3); } line(g, 556, 1856, 724, 1856, '#6a4d2f', 2); line(g, 556, 1862, 724, 1862, '#6a4d2f', 2); g.restore(); }
    // mountain rubble and the stone the gate will be built from
    for (const p of LAY.hills) if (vis(p.x, p.y, p.r * 1.4)) peak(g, p.x, p.y, p.r, p.seed, false);
    for (const p of LAY.rubble) if (vis(p.x, p.y, 20)) rock(g, p.x, p.y, p.r, p.seed);
    [[600, 4420], [630, 4460]].forEach(([x, y], i) => { if (vis(x + i * 40, y, 24)) rock(g, x + i * 40, y, 14, 1700 + i); });
    // the old ruins: worn flagstones inside a broken ring wall, and the stump of the watchtower
    if (vis(P.ruins[0], P.ruins[1], 320)) {
      const [rx0, ry0] = P.ruins; seedR(1777);
      ell(g, rx0, ry0, 230, 200, 'rgba(120,112,92,.18)');
      for (let i = 0; i < 70; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 200, x = rx0 + Math.cos(a) * d, y = ry0 + Math.sin(a) * d * .88, w = rr(18, 34), h = rr(12, 22); g.save(); g.translate(x, y); g.rotate(rr(-.2, .2)); g.fillStyle = R() < .5 ? 'rgba(150,144,128,.5)' : 'rgba(126,120,106,.45)'; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = 'rgba(40,36,30,.25)'; g.lineWidth = 1; g.strokeRect(-w / 2, -h / 2, w, h); g.restore(); }
      for (const r of RUINS) {
        if (r.tower) { ell(g, r.x + 10, r.y + 14, r.r + 10, r.r * .8, 'rgba(0,0,0,.32)'); circ(g, r.x, r.y, r.r + 4, '#5e594f'); circ(g, r.x, r.y, r.r, '#8f8a7c'); circ(g, r.x, r.y, r.r - 12, '#3d3a33'); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; if (hash(i, 31) < .3) continue; stoneBlock(g, r.x + Math.cos(a) * (r.r - 5), r.y + Math.sin(a) * (r.r - 5), 16, 12, i); } continue; }
        g.save(); g.translate(r.x, r.y); g.rotate(r.a + Math.PI / 2); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-r.r - 4, -6, r.r * 2 + 12, 22);
        const n = 3 + Math.floor(r.k * 3); for (let i = 0; i < n; i++) stoneBlock(g, -r.r + 8 + i * (r.r * 2 - 10) / Math.max(1, n - 1), -2 + (i % 2) * 2, 22, 16, i + Math.floor(r.k * 9));
        g.restore(); if (r.k > .6) rock(g, r.x + 26 * Math.cos(r.a + 1), r.y + 26 * Math.sin(r.a + 1), 7, 1800 + Math.floor(r.k * 99));
      }
    }
    // the Grey Stones on the Greyback
    for (const s of STONES) if (vis(s[0], s[1], 40)) { ell(g, s[0] + 9, s[1] + 12, 18, 9, 'rgba(0,0,0,.32)'); ell(g, s[0], s[1], 14, 18, '#6f6c64'); ell(g, s[0] - 2, s[1] - 4, 10, 13, '#9a968a'); ell(g, s[0] - 4, s[1] - 9, 4, 5, 'rgba(255,250,235,.25)'); }

    // ---- forest floor: shadows of every tree, bushes, boulders
    for (const t of LAY.trees) if (vis(t.x, t.y, 70)) ell(g, t.x + t.s * .3, t.y + t.s * .4, t.s * (t.type === 'oak' ? 1.0 : .8), t.s * (t.type === 'oak' ? .6 : .5), t.type === 'oak' ? 'rgba(0,0,0,.26)' : 'rgba(0,0,0,.28)');
    for (const b of LAY.bushes) if (vis(b.x, b.y, 30)) bush(g, b.x, b.y, b.s, b.seed);
    for (const r of LAY.rocks) if (vis(r.x, r.y, 30)) rock(g, r.x, r.y, r.s, r.seed);
    // the dark edges of the world
    { const vg = g.createLinearGradient(0, 0, 0, 260); vg.addColorStop(0, 'rgba(18,22,30,.62)'); vg.addColorStop(1, 'rgba(18,22,30,0)'); if (VY0 < 260) { g.fillStyle = vg; g.fillRect(0, 0, W, 260); }
      const ed = 160;
      [['l', 0, 0, ed, 0], ['r', W, 0, W - ed, 0], ['b', 0, H, 0, H - ed]].forEach(([k, x0, y0, x1, y1]) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(8,10,12,.65)'); gr.addColorStop(1, 'rgba(8,10,12,0)'); g.fillStyle = gr; if (k === 'l') g.fillRect(0, 0, ed, H); else if (k === 'r') g.fillRect(W - ed, 0, ed, H); else g.fillRect(0, H - ed, W, ed); }); }
  }

  // ====================================================================== cached sprites
  let sc = 1;
  const SPR = new Map(), TXT = new Map();
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function spr(key, w, h, ox, oy, fn) {
    let s = SPR.get(key); if (s) return s;
    const c = mk(w * sc, h * sc), g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, ox * sc, oy * sc); fn(g);
    s = { c, w: c.width / sc, h: c.height / sc, ox, oy }; SPR.set(key, s); return s;
  }
  function put(g, s, x, y, a) {
    if (a != null && a < 1) { const o = g.globalAlpha; g.globalAlpha = o * a; g.drawImage(s.c, x - s.ox, y - s.oy, s.w, s.h); g.globalAlpha = o; } else g.drawImage(s.c, x - s.ox, y - s.oy, s.w, s.h);
  }
  function putRot(g, s, x, y, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(s.c, -s.ox, -s.oy, s.w, s.h); g.restore(); }
  const GLOW = { warm: [255, 150, 60], cool: [215, 245, 250], ember: [200, 90, 50], violet: [120, 60, 130], gold: [255, 215, 130], white: [255, 255, 255] };
  const glowCache = {};
  function glowSpr(name) {
    if (glowCache[name]) return glowCache[name];
    const c = mk(128, 128), g = c.getContext('2d'), col = GLOW[name] || [255, 255, 255], gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (name === 'hole') { gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.55, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
    else if (name === 'ringfill') { gr.addColorStop(0, 'rgba(120,210,225,0)'); gr.addColorStop(.6, 'rgba(120,210,225,.07)'); gr.addColorStop(.96, 'rgba(130,215,230,.3)'); gr.addColorStop(1, 'rgba(130,215,230,0)'); }
    else { gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},1)`); gr.addColorStop(.5, `rgba(${col[0]},${col[1]},${col[2]},.35)`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`); }
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return glowCache[name] = c;
  }
  function glowAt(g, name, x, y, r, a) { const o = g.globalAlpha; g.globalAlpha = o * a; g.drawImage(glowSpr(name), x - r, y - r, r * 2, r * 2); g.globalAlpha = o; }
  const fontOk = () => { try { return !document.fonts || document.fonts.check('600 16px Cinzel'); } catch (e) { return true; } };
  // text in the game's font, letter-spaced; rebuilt once the web font has arrived
  function textSpr(key, text, px, color, o) {
    o = o || {}; let s = TXT.get(key); const ok = fontOk();
    if (s && (s.ok || !ok)) return s;
    const ls = o.ls || 0, font = `${o.weight || 600} ${px}px Cinzel, Georgia, serif`, m = mk(8, 8).getContext('2d'); m.font = font;
    const ws = [...text].map(ch => m.measureText(ch).width + ls), tw = ws.reduce((a, b) => a + b, 0), pad = 8;
    const c = mk((tw + pad * 2) * sc, (px * 1.5 + pad * 2) * sc), g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, 0, 0);
    g.font = font; g.textBaseline = 'middle'; g.fillStyle = color; if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = 5; }
    let x = pad; [...text].forEach((ch, i) => { g.fillText(ch, x, px * .75 + pad); x += ws[i]; });
    s = { c, w: c.width / sc, h: c.height / sc, ox: c.width / sc / 2, oy: c.height / sc / 2, ok, tw }; TXT.set(key, s); return s;
  }
  const LABELS = [
    ['THE NORTH ROAD', 3236, 2500, -Math.PI / 2 + .08, 30], ['THE EAST FORD', 5670, 2168, .08, 30], ['THE FOUNDERS\' CAMP', 3200, 4560, 0, 32], ['BEACON HILL', 1400, 1000, 0, 28],
    ['THE MEADOW', 1560, 3780, 0, 28], ['TIMBER WOODS', 5800, 620, 0, 28], ['THE RIVER', 4760, 3200, -1.1, 26], ['THE MOUNTAIN PASS', 2980, 344, 0, 24], ['EAST BLUFF', 4160, 1580, 0, 24], ['THE HIGH SHELF', 960, 744, 0, 24],
    ['THE GREYBACK', 1060, 2290, 0, 26], ['THE NARROWS', 1990, 1660, 1.2, 20], ['THE OLD RUINS', 1060, 3520, 0, 26], ['THE SEDGE FEN', 720, 3760, 0, 26], ['THE DELTA', 4950, 4300, 0, 24], ['THE ASHWOOD', 5860, 2860, 0, 26],
  ];

  // ---------- small icons for the sign boards and nothing else
  function icon(g, kind, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
    if (kind === 'drop') { g.beginPath(); g.moveTo(0, -8); g.quadraticCurveTo(7, 0, 0, 7); g.quadraticCurveTo(-7, 0, 0, -8); g.fill(); }
    else if (kind === 'coin') { g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill(); }
    else if (kind === 'anvil') { g.beginPath(); g.moveTo(-8, -3); g.lineTo(6, -3); g.lineTo(8, -1); g.lineTo(3, 2); g.lineTo(3, 6); g.lineTo(-5, 6); g.lineTo(-5, 2); g.lineTo(-3, 0); g.closePath(); g.fill(); }
    else if (kind === 'roof') { g.beginPath(); g.moveTo(-8, 2); g.lineTo(0, -7); g.lineTo(8, 2); g.stroke(); g.fillRect(-6, 2, 12, 5); }
    else if (kind === 'gate') { g.beginPath(); g.moveTo(-7, 7); g.lineTo(-7, -4); g.arc(0, -4, 7, Math.PI, 0); g.lineTo(7, 7); g.stroke(); g.fillRect(-1, -1, 2, 8); }
    else if (kind === 'flame') { g.beginPath(); g.moveTo(0, -9); g.quadraticCurveTo(8, -1, 4, 6); g.quadraticCurveTo(0, 9, -4, 6); g.quadraticCurveTo(-8, -1, 0, -9); g.fill(); }
    else if (kind === 'flower') { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(Math.cos(a) * 4.4, Math.sin(a) * 4.4, 2.8, 0, TAU); g.fill(); } }
    else if (kind === 'axe') { g.beginPath(); g.moveTo(-5, 8); g.lineTo(4, -6); g.stroke(); g.beginPath(); g.moveTo(1, -8); g.quadraticCurveTo(9, -5, 7, 1); g.lineTo(3, -2); g.closePath(); g.fill(); }
    else if (kind === 'ford') { for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-8, -3 + i * 6); g.quadraticCurveTo(-4, -7 + i * 6, 0, -3 + i * 6); g.quadraticCurveTo(4, 1 + i * 6, 8, -3 + i * 6); g.stroke(); } }
    g.restore();
  }
  function signSpr(sg) {
    const text = sg[3], key = 'sign:' + sg[0], old = SPR.get(key);
    if (old && (old.ok || !fontOk())) return old;
    SPR.delete(key);
    const ok = fontOk(), m = mk(8, 8).getContext('2d'); m.font = '700 13px Cinzel, Georgia, serif';
    const tw = [...text].reduce((a, ch) => a + m.measureText(ch).width + 1.2, 0), bw = Math.ceil(tw + 46), bh = 26;
    const s = spr(key, bw + 24, 74, (bw + 24) / 2, 62, g => {
      ell(g, 2, 2, 7, 3.4, 'rgba(0,0,0,.35)'); line(g, 0, 0, 0, -24, '#3d2c1b', 5.4, 'butt'); line(g, -1, 0, -1, -24, '#6a4d2f', 2.4, 'butt');
      g.save(); g.translate(0, -38); g.rotate(-.025);
      g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(-bw / 2 + 3, -bh / 2 + 4, bw, bh);
      const pl = g.createLinearGradient(0, -bh / 2, 0, bh / 2); pl.addColorStop(0, '#a07c4e'); pl.addColorStop(1, '#7a5a36'); g.fillStyle = pl; g.fillRect(-bw / 2, -bh / 2, bw, bh);
      g.strokeStyle = 'rgba(40,28,16,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-bw / 2, 0); g.lineTo(bw / 2, 0); g.stroke();
      g.strokeStyle = '#2e2014'; g.lineWidth = 1.6; g.strokeRect(-bw / 2, -bh / 2, bw, bh); g.strokeStyle = 'rgba(255,236,190,.22)'; g.lineWidth = 1; g.strokeRect(-bw / 2 + 2, -bh / 2 + 2, bw - 4, bh - 4);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(c => circ(g, c[0] * (bw / 2 - 4), c[1] * (bh / 2 - 4), 1.3, '#2e2014'));
      icon(g, sg[4], -bw / 2 + 17, 0, 1.05, '#2e2014');
      g.font = '700 13px Cinzel, Georgia, serif'; g.textBaseline = 'middle'; let x = -bw / 2 + 32;
      for (const ch of text) { g.fillStyle = 'rgba(255,236,190,.4)'; g.fillText(ch, x, 1.8); g.fillStyle = '#22160c'; g.fillText(ch, x, .8); x += m.measureText(ch).width + 1.2; }
      g.restore();
    });
    s.ok = ok; return s;
  }

  // ---------- trees: canopies are sprites, drawn over the units
  const TREE_R = 52, TREE_C = 72;
  function treeSpr(type, v) {
    return spr(`tree:${type}:${v}`, TREE_C * 2, TREE_C * 2, TREE_C, TREE_C, g => { if (type === 'oak') oak(g, 0, 0, TREE_R, v, false); else pine(g, 0, 0, TREE_R, v, false); });
  }

  // ---------- the structures that change with the run
  function gateSpr(kind, hpb, shut) {
    const gx = 0, gy = 0, x0 = GATE.x0 - P.gate[0], x1 = GATE.x1 - P.gate[0], dmg = 1 - hpb / 4;
    return spr(`gate:${kind}:${hpb}:${shut ? 1 : 0}`, 800, 220, 400, 110, g => {
      if (kind === 'none') {
        for (let x = x0; x <= x1; x += 40) { const y = (Math.round(x / 40) % 2 ? 4 : -4); stake(g, x, y, Math.round(x / 40) % 3 ? '#e6dcc0' : '#c9a45c', 0); }
        g.strokeStyle = 'rgba(232,224,196,.5)'; g.lineWidth = 1.2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(x0, -14); g.lineTo(x1, -14); g.stroke(); g.setLineDash([]);
        return;
      }
      if (kind === 'palisade') {
        const logs = (xa, xb) => {
          for (let row = 0; row < 2; row++) for (let x = xa + row * 7.5, i = 0; x <= xb; x += 15, i++) {
            const y = row ? 7 : -5, id = i + row * 200, mid = 1 - Math.min(1, Math.abs(x) / 150) * .6, h1 = hash(id, 3), h2 = hash(id, 5);
            if (h1 < dmg * .6 * mid + (hpb === 0 ? .4 : 0)) { if (h2 < .5) { circ(g, x + 3, y + 7, 3.4, 'rgba(0,0,0,.25)'); circ(g, x, y, 3.4, '#4a3622'); circ(g, x + (h2 - .25) * 12, y + 9 + h2 * 8, 2.8, '#8a6a45'); } continue; }
            circ(g, x + 4, y + 6, 9.4, 'rgba(0,0,0,.3)'); circ(g, x, y, 9.4, '#4f3822'); circ(g, x, y, 7.6, '#8a6a45'); circ(g, x - 1.5, y - 1.5, 3.2, '#b89466');
            g.strokeStyle = 'rgba(40,28,16,.5)'; g.lineWidth = .8; g.beginPath(); g.arc(x, y, 7.6, 0, TAU); g.stroke();
            if (h2 < dmg * 1.1) { g.strokeStyle = 'rgba(30,20,12,.85)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 5, y - 4); g.lineTo(x + 1, y); g.lineTo(x - 2, y + 6); g.stroke(); }
          }
          line(g, xa, 1, xb, 1, 'rgba(58,40,24,.55)', 2.4, 'butt');
        };
        g.save(); g.globalAlpha = 1;
        logs(x0, -78); logs(78, x1);
        if (hpb > 0) {   // the gate itself: banded planks between two tall posts
          g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-72, -12, 150, 34);
          g.fillStyle = '#6a4d2f'; g.fillRect(-75, -15, 150, 34); g.fillStyle = '#7c5b38'; g.fillRect(0, -15, 75, 34);
          g.strokeStyle = '#2a2018'; g.lineWidth = 1.4; g.strokeRect(-75, -15, 150, 34); g.beginPath(); g.moveTo(0, -15); g.lineTo(0, 19); g.stroke();
          g.strokeStyle = '#2e2e32'; g.lineWidth = 3; [-9, 4].forEach(d => { g.beginPath(); g.moveTo(-72, d); g.lineTo(-5, d); g.moveTo(5, d); g.lineTo(72, d); g.stroke(); });
          if (dmg > .3) { g.strokeStyle = 'rgba(20,12,6,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-30, -15); g.lineTo(-22, -2); g.lineTo(-34, 8); g.lineTo(-26, 19); g.stroke(); }
          if (dmg > .6) { g.beginPath(); g.moveTo(34, -15); g.lineTo(42, -1); g.lineTo(30, 10); g.lineTo(40, 19); g.stroke(); }
        } else { for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(70,52,34,.8)'; g.fillRect(-60 + hash(i, 1) * 120, -10 + hash(i, 2) * 24, 18, 4); } }
        for (const sx of [-82, 82]) { circ(g, sx + 4, 6, 10, 'rgba(0,0,0,.3)'); circ(g, sx, 0, 9.5, '#4a3622'); circ(g, sx, 0, 7.4, '#7d5f3d'); circ(g, sx, -1, 3, '#b89466'); }
        [[-150, -24], [150, -24]].forEach(([x, y]) => { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 14 + 4, y - 14 + 5, 32, 32); g.fillStyle = '#7a5a38'; g.fillRect(x - 14, y - 14, 28, 28); g.strokeStyle = '#3d2c1b'; g.lineWidth = 1.4; g.strokeRect(x - 14, y - 14, 28, 28); g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke(); });
        g.restore();
        return;
      }
      const wall = (xa, xb) => { for (let x = xa; x < xb; x += 22) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 4, -15 + 6, 22, 30); g.fillStyle = (x / 22 | 0) % 2 ? '#9d978a' : '#8f897c'; g.fillRect(x, -15, 22, 30); g.strokeStyle = '#4c473f'; g.lineWidth = 1; g.strokeRect(x, -15, 22, 30); g.fillStyle = '#b8b2a3'; g.fillRect(x + 2, -13, 18, 5); } };
      wall(x0, -190); wall(190, x1);
      [-1, 1].forEach(sd => {
        const tx = sd * 130, ty = 0;
        g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(tx - 55 + 8, ty - 60 + 12, 110, 120);
        g.fillStyle = '#8a8478'; g.fillRect(tx - 55, ty - 60, 110, 120); g.strokeStyle = '#3d3a34'; g.lineWidth = 2; g.strokeRect(tx - 55, ty - 60, 110, 120);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) { g.fillStyle = (i + j) % 2 ? '#9a9487' : '#8f897c'; g.fillRect(tx - 55 + 2 + i * 18, ty - 60 + 2 + j * 17, 17, 16); }
        g.fillStyle = '#b6b0a2'; for (let i = 0; i < 6; i++) { g.fillRect(tx - 55 + i * 19, ty - 60, 12, 12); g.fillRect(tx - 55 + i * 19, ty + 48, 12, 12); }
        g.fillStyle = '#6e695f'; g.fillRect(tx - 36, ty - 40, 72, 80); g.strokeStyle = '#34312b'; g.lineWidth = 1.4; g.strokeRect(tx - 36, ty - 40, 72, 80);
        circ(g, tx, ty, 9, '#2c2923'); circ(g, tx, ty, 6, '#4a443a');
      });
      if (!shut) { g.fillStyle = '#6a4d2f'; g.fillRect(-75, -20, 7, 38); g.fillRect(68, -20, 7, 38); g.strokeStyle = '#2a2018'; g.lineWidth = 1; g.strokeRect(-75, -20, 7, 38); g.strokeRect(68, -20, 7, 38); }
      else { g.fillStyle = '#6a4d2f'; g.fillRect(-75, -19, 75, 38); g.fillStyle = '#7c5b38'; g.fillRect(0, -19, 75, 38); g.strokeStyle = '#2a2018'; g.lineWidth = 1.4; g.strokeRect(-75, -19, 150, 38); g.beginPath(); g.moveTo(0, -19); g.lineTo(0, 19); g.stroke(); g.strokeStyle = '#2e2e32'; g.lineWidth = 3; [-14, 0, 14].forEach(d => { g.beginPath(); g.moveTo(-72, d); g.lineTo(-5, d); g.moveTo(5, d); g.lineTo(72, d); g.stroke(); }); circ(g, -6, 0, 3, '#8a8f98'); circ(g, 6, 0, 3, '#8a8f98'); }
      if (dmg > .2) {   // cracks in the dressed stone
        g.strokeStyle = 'rgba(30,28,24,.6)'; g.lineWidth = 1.3; const n = Math.round(dmg * 6);
        for (let i = 0; i < n; i++) { const sd = i % 2 ? 1 : -1, bx = sd * (100 + hash(i, 8) * 70), by = -50 + hash(i, 9) * 90; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 5, by + 9); g.lineTo(bx - 3, by + 17); g.lineTo(bx + 4, by + 26); g.stroke(); }
      }
    });
  }
  function gateRoofSpr(hpb, carved) {
    return spr(`gateroof:${hpb}:${Math.round(carved * 4)}`, 190, 110, 95, 55, g => {
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-76 + 5, -40 + 9, 152, 80);
      g.fillStyle = '#9a9487'; g.fillRect(-76, -40, 152, 80); g.strokeStyle = '#34312b'; g.lineWidth = 2; g.strokeRect(-76, -40, 152, 80);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#a7a193' : '#979184'; g.fillRect(-76 + 1 + i * 19, -40 + 1 + j * 20, 18, 19); }
      g.fillStyle = '#b6b0a2'; for (let i = 0; i < 8; i++) { g.fillRect(-76 + i * 19.5, -40, 10, 10); g.fillRect(-76 + i * 19.5, 30, 10, 10); }
      // the lintel's face toward the camp: lines of letters, cut one at a time
      const rows = [[-62, 26], [-62, 33]], n = Math.round(carved * 4);
      g.strokeStyle = 'rgba(30,28,24,.62)'; g.lineWidth = 1.3;
      for (let r = 0; r < rows.length; r++) {
        const cnt = Math.min(15, Math.round(n / 4 * 15 * 1.0)); const rowCnt = r === 0 ? cnt : Math.max(0, cnt - 4);
        for (let i = 0; i < rowCnt; i++) { const x = rows[r][0] + i * 8.6, y = rows[r][1], k = hash(i, r + 11); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k < .5 ? 3 : -1), y + 5 - k * 2); if (k > .4) { g.moveTo(x - 2, y + 2); g.lineTo(x + 4, y + 2); } g.stroke(); }
      }
      if (n >= 4) {   // below the cut lines, a few strokes in a different, lighter hand
        g.strokeStyle = 'rgba(190,184,168,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(8, 36.5); g.lineTo(11, 33.5); g.lineTo(14, 37); g.moveTo(18, 34); g.lineTo(18, 38); g.moveTo(22, 35); g.quadraticCurveTo(26, 32, 28, 37); g.stroke();
      }
      if (hpb < 4) { g.strokeStyle = 'rgba(30,28,24,.5)'; g.lineWidth = 1.1; for (let i = 0; i < 4 - hpb; i++) { const x = -50 + hash(i, 21) * 100; g.beginPath(); g.moveTo(x, -38); g.lineTo(x + 3, -28); g.lineTo(x - 2, -18); g.stroke(); } }
    });
  }
  function hallSpr(stage) {   // stage 0 survey, 1 framing, 2 roofed footing
    const w = 250, h = 190;
    return spr('hall:' + stage, w + 40, h + 40, (w + 40) / 2, (h + 40) / 2, g => {
      const hx = 0, hy = 0;
      if (stage === 2) {
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(hx - 118 + 8, hy - 80 + 12, 236, 164); g.fillStyle = '#6e6a60'; g.fillRect(hx - 120, hy - 82, 240, 164);
        for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#7d786d' : '#726d63'; g.fillRect(hx - 120 + i * 20, hy - 82, 20, 6); g.fillRect(hx - 120 + i * 20, hy + 76, 20, 6); }
        return;
      }
      g.fillStyle = 'rgba(70,52,34,.18)'; g.fillRect(hx - 118, hy - 78, 236, 160);
      g.strokeStyle = 'rgba(232,224,196,.62)'; g.lineWidth = 1.2; g.setLineDash([5, 6]); g.strokeRect(hx - 118, hy - 78, 236, 160); g.setLineDash([]);
      // a course of footing stones laid along the south and west sides, the rest still pegged
      for (let i = 0; i < 12; i++) stoneBlock(g, hx - 110 + i * 20, hy + 78, 18, 10, i);
      for (let i = 0; i < 4; i++) stoneBlock(g, hx - 116, hy + 58 - i * 14, 10, 14, i + 1);
      [[hx - 118, hy - 78], [hx + 118, hy - 78], [hx - 118, hy + 82], [hx + 118, hy + 82], [hx, hy - 78], [hx, hy + 82]].forEach(([x, y]) => { circ(g, x + 2, y + 3, 7, 'rgba(0,0,0,.28)'); circ(g, x, y, 6, '#5d4329'); circ(g, x, y, 4.5, '#8a6a45'); });
      for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#8a6a45' : '#7d5f3d'; g.fillRect(hx - 110, hy + 100 + k * 6, 100, 6); }
      g.fillStyle = '#7a5a38'; g.fillRect(hx + 20 - 30, hy - 120 - 4, 60, 8); g.fillStyle = '#5d4329'; g.fillRect(hx + 20 - 26, hy - 120 + 4, 5, 14); g.fillRect(hx + 20 + 21, hy - 120 + 4, 5, 14);
      line(g, hx - 118, hy - 60, hx + 118, hy - 60, 'rgba(232,224,196,.4)', 1); circ(g, hx + 118, hy - 60, 3.4, '#8c8f94');   // a plumb line
    });
  }
  function hallRoofSpr(p) {   // p: eighths of the roof laid, 8 = done
    const rw = 252, rh = 180, x0 = -rw / 2, y0 = -rh / 2, done = p >= 8;
    return spr('hallroof:' + p, rw + 60, rh + 60, (rw + 60) / 2, (rh + 60) / 2, g => {
      if (!done) {   // raised posts and the ridge, rafters across as far as the roofers have got
        const cols = Math.round(p / 8 * 9);
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x0 + 8, y0 + 10, rw, 6);
        for (let i = 0; i < cols; i++) { const x = x0 + 6 + i * 29.5; g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 3, y0 + 8, 5, rh - 10); g.fillStyle = '#8a6a45'; g.fillRect(x, y0 + 4, 5, rh - 10); g.fillStyle = '#7d5f3d'; g.fillRect(x + 1, y0 + 4, 2, rh - 10); }
        g.fillStyle = '#9b6a45'; g.fillRect(x0 - 4, -3, rw + 8, 6); g.strokeStyle = '#2a1a12'; g.lineWidth = 1; g.strokeRect(x0 - 4, -3, rw + 8, 6);
        for (const [px, py] of [[x0 + 4, y0 + 4], [x0 + rw - 4, y0 + 4], [x0 + 4, y0 + rh - 4], [x0 + rw - 4, y0 + rh - 4], [0, y0 + 4], [0, y0 + rh - 4]]) { circ(g, px + 2, py + 3, 7, 'rgba(0,0,0,.3)'); circ(g, px, py, 6.4, '#5d4329'); circ(g, px, py, 4.5, '#8a6a45'); }
        return;
      }
      g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(x0 + 10, y0 + 14, rw, rh);
      g.fillStyle = '#7e4a34'; g.fillRect(x0, y0, rw, rh / 2); g.fillStyle = '#5f3626'; g.fillRect(x0, y0 + rh / 2, rw, rh / 2);
      for (let j = 0; j < 10; j++) { for (let i = 0; i < 18; i++) { const off = j % 2 ? 7 : 0; g.fillStyle = (i + j) % 3 ? 'rgba(0,0,0,.1)' : 'rgba(255,220,180,.08)'; g.fillRect(x0 + i * 14 - off, y0 + j * 9, 13, 8); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, y0 + j * 9 + 8, rw, 1); }
      for (let j = 0; j < 10; j++) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x0, y0 + rh / 2 + j * 9, rw, 1); }
      g.strokeStyle = '#2a1a12'; g.lineWidth = 2; g.strokeRect(x0, y0, rw, rh);
      g.fillStyle = '#9b6a45'; g.fillRect(x0 - 4, y0 + rh / 2 - 3, rw + 8, 6); g.strokeStyle = '#2a1a12'; g.lineWidth = 1; g.strokeRect(x0 - 4, y0 + rh / 2 - 3, rw + 8, 6);
      g.fillStyle = '#7a7568'; g.fillRect(x0 + 30, y0 + 22, 26, 26); g.strokeStyle = '#34312b'; g.strokeRect(x0 + 30, y0 + 22, 26, 26); g.fillStyle = '#1e1a16'; g.fillRect(x0 + 36, y0 + 28, 14, 14);
      // a lantern board hung at the eave, the first thing to wear a sign
      g.fillStyle = '#5d4329'; g.fillRect(x0 + rw - 60, y0 + rh - 6, 46, 5);
    });
  }
  function springSpr(kind) {
    return spr('spring:' + kind, 240, 240, 120, 120, g => {
      if (kind === 'trickle') {
        ell(g, 0, 0, 42, 32, '#3b2d20'); ell(g, -2, -1, 30, 22, '#5d6d72'); ell(g, -6, -5, 12, 6, 'rgba(180,210,215,.45)');
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ell(g, Math.cos(a) * 44, Math.sin(a) * 34, 6, 4, i % 2 ? '#6a523a' : '#58432e'); }
        ell(g, 52, 12, 24, 12, '#6a523a'); ell(g, 50, 8, 17, 7, '#7d6446'); line(g, 52, 12, 52, -18, '#6a4d2f', 2.6); ell(g, 52, 8, 4, 5, '#8c8f94');
        g.save(); g.translate(-56, 34); g.rotate(.4); g.fillStyle = '#7a5a38'; g.fillRect(-14, -8, 26, 16); g.strokeStyle = '#3d2c1b'; g.lineWidth = 1; g.strokeRect(-14, -8, 26, 16); circ(g, 18, 0, 6, '#2f2216'); circ(g, 18, 0, 4, '#5a4128'); g.restore();
        g.save(); g.translate(-8, -58); g.rotate(-.12); line(g, -22, -3, 22, -3, '#6a4d2f', 2.4); line(g, -22, 3, 22, 3, '#6a4d2f', 2.4); for (let i = -3; i <= 3; i++) line(g, i * 7, -3, i * 7, 3, '#6a4d2f', 2); g.restore();   // a ladder laid by the pit
        g.strokeStyle = '#b9a276'; g.lineWidth = 2; g.beginPath(); g.arc(70, -34, 8, 0, TAU); g.stroke(); g.beginPath(); g.arc(70, -34, 4, 0, TAU); g.stroke();
        return;
      }
      circ(g, 4, 7, 66, 'rgba(0,0,0,.28)');
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; g.save(); g.translate(Math.cos(a) * 58, Math.sin(a) * 58); g.rotate(a); g.fillStyle = i % 2 ? '#9d9686' : '#8e8878'; g.fillRect(-9, -9, 18, 18); g.strokeStyle = 'rgba(30,26,20,.55)'; g.lineWidth = 1; g.strokeRect(-9, -9, 18, 18); g.restore(); }
      circ(g, 0, 0, 48, '#706a5e'); const wg = g.createRadialGradient(-10, -12, 2, 0, 0, 46); wg.addColorStop(0, '#8fcfd0'); wg.addColorStop(.7, '#4a95a0'); wg.addColorStop(1, '#357886'); circ(g, 0, 0, 45, wg);
      circ(g, 0, 0, 11, '#8e8878'); circ(g, 0, 0, 8, '#aaa392'); circ(g, -2, -2, 4, 'rgba(255,255,240,.3)');
      // the windlass over the well: two posts, a beam, a crank, a hung bucket
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-46, -66, 96, 8); line(g, -44, -62, -44, -48, '#4a3622', 4); line(g, 44, -62, 44, -48, '#4a3622', 4); line(g, -44, -62, 44, -62, '#6a4d2f', 5); line(g, 44, -62, 58, -62, '#4a3622', 2.6); circ(g, 58, -62, 3, '#8c8f94');
      line(g, 0, -62, 0, -34, '#b9a276', 1.2); g.fillStyle = '#6a4d2f'; g.fillRect(-6, -36, 12, 9); g.strokeStyle = '#3d2c1b'; g.lineWidth = 1; g.strokeRect(-6, -36, 12, 9);
    });
  }
  function forgeSpr() {
    return spr('forge', 300, 220, 150, 110, g => {
      g.scale(1.2, 1.2);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-52 + 8, -36 + 10, 104, 74);
      [[-50, -34], [50, -34], [-50, 34], [50, 34]].forEach(p => { circ(g, p[0], p[1], 4.6, '#3d2c1b'); });
      for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#6a4d2f' : '#7a5a38'; g.fillRect(-52 + i * 15, -37, 14, 6); }   // the back half of the lean-to roof boarded
      g.fillStyle = '#5a5a5e'; g.fillRect(-20, -26, 52, 38); g.strokeStyle = '#26262a'; g.lineWidth = 1.6; g.strokeRect(-20, -26, 52, 38);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#6b6b70' : '#626266'; g.fillRect(-19 + i * 13, -25 + j * 12.3, 12, 11.5); }
      circ(g, 6, -7, 14, '#1b1512'); circ(g, 6, -7, 11, '#2b231d'); circ(g, 4, -2, 2, '#3a2f27');
      g.fillStyle = '#4a3a2c'; g.fillRect(-38, -20, 16, 30); g.fillStyle = '#6a3a28'; g.fillRect(-36, -18, 12, 22); g.strokeStyle = '#2a1e16'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-36, -14 + i * 7); g.lineTo(-24, -14 + i * 7); g.stroke(); }   // bellows
      // the anvil on its stump: a horn, a face, a waist
      circ(g, -2, 25, 12, 'rgba(0,0,0,.28)'); circ(g, -3, 24, 11, '#5a4128'); circ(g, -3, 24, 8.4, '#7a5a38');
      g.fillStyle = '#26262a'; g.beginPath(); g.moveTo(-16, 22); g.lineTo(2, 20); g.lineTo(6, 22); g.lineTo(6, 26); g.lineTo(2, 28); g.lineTo(-10, 28); g.closePath(); g.fill(); g.fillStyle = '#55555b'; g.fillRect(-9, 21, 11, 3);
      circ(g, 38, 24, 10, '#4a3320'); circ(g, 38, 24, 8, '#3d6573');   // the quench trough
      line(g, 26, 14, 46, 14, '#6a4d2f', 2); for (const [x, c] of [[29, '#8c8f94'], [35, '#9a9ea4'], [41, '#7b7d83']]) { line(g, x, 14, x, 22, c, 2.4); }   // tongs and hammers on the rail
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#7d7d86' : '#8d8d96'; g.fillRect(-48 + i * 4, 44 - i * 3, 14, 4); }   // ingots
      for (let i = 0; i < 8; i++) circ(g, 22 + hash(i, 2) * 14, 38 + hash(i, 3) * 8, 2 + hash(i, 4) * 1.6, '#17140f');   // coal
      for (const [px, py] of [[-50, -34], [50, -34]]) { g.fillStyle = '#5d4329'; g.fillRect(px - 3, py - 3, 6, 6); }
    });
  }
  function beaconSpr() {
    return spr('beacon', 220, 220, 110, 110, g => {
      circ(g, 0, 0, 25, '#2f2a24'); g.strokeStyle = '#6d6a70'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.stroke();
      for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * 1.047 + .3); g.fillStyle = i % 2 ? '#6a4d2f' : '#7d5c38'; g.fillRect(-20, -3, 40, 6); g.restore(); }
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + .8; g.strokeStyle = '#4a4a50'; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.cos(a) * 25, Math.sin(a) * 25); g.lineTo(Math.cos(a) * 33, Math.sin(a) * 33); g.stroke(); }
    });
  }
  function postSpr(side) {
    return spr('post:' + side, 60, 60, 30, 36, g => {
      circ(g, 3, 5, 5, 'rgba(0,0,0,.3)'); circ(g, 0, 0, 4, '#3b2c1c'); circ(g, 0, 0, 2.6, '#5a4128');
      g.strokeStyle = '#3b2c1c'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(8 * side, -8); g.stroke();
      circ(g, 8 * side, -8, 6, '#2c2118');
    });
  }
  function hearthSpr(kind, n) {   // kind 'canvas' | 'cap'; n the slabs laid (of 12)
    return spr(`hearth:${kind}:${n}`, 300, 300, 150, 150, g => {
      if (kind === 'canvas' || n < 12) {
        ell(g, 3, 5, 86, 84, 'rgba(0,0,0,.3)');
        const cg = g.createRadialGradient(-20, -24, 8, 0, 0, 88); cg.addColorStop(0, '#6a5d3e'); cg.addColorStop(.6, '#554a31'); cg.addColorStop(1, '#3e3624'); g.fillStyle = cg; g.beginPath();
        for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, r = 84 + Math.sin(a * 7) * 2.2; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
        g.strokeStyle = 'rgba(30,24,14,.5)'; g.lineWidth = 1.4; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2; g.beginPath(); g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); g.quadraticCurveTo(Math.cos(a + .25) * 50, Math.sin(a + .25) * 50, Math.cos(a) * 82, Math.sin(a) * 82); g.stroke(); }
        g.strokeStyle = 'rgba(160,145,100,.28)'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2; g.beginPath(); g.moveTo(Math.cos(a) * 12 - 2, Math.sin(a) * 12 - 2); g.quadraticCurveTo(Math.cos(a + .25) * 50 - 2, Math.sin(a + .25) * 50 - 2, Math.cos(a) * 80, Math.sin(a) * 80); g.stroke(); }
        circ(g, 0, 0, 10, '#4a4030'); circ(g, -2, -2, 6, '#5d5239');
        // a patch sewn on, a mended seam, a mallet and a coil of rope left on the cloth's edge
        g.save(); g.rotate(.6); g.fillStyle = '#7a6c46'; g.fillRect(30, -12, 22, 18); g.strokeStyle = 'rgba(230,220,170,.45)'; g.setLineDash([2, 2]); g.strokeRect(31, -11, 20, 16); g.setLineDash([]); g.restore();
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + .1, px = Math.cos(a) * 86, py = Math.sin(a) * 86; ell(g, px, py, 5, 4, '#2b2218', a); circ(g, px - 1, py - 1, 2, '#6a5a3a'); line(g, px, py, Math.cos(a) * 104, Math.sin(a) * 104, '#7a5a32', 1.4); }
        g.save(); g.translate(-70, 52); g.rotate(-.6); g.fillStyle = '#5d4329'; g.fillRect(-12, -2, 24, 4); g.fillStyle = '#8a8f98'; g.fillRect(8, -6, 10, 12); g.restore();
        g.strokeStyle = '#b9a276'; g.lineWidth = 2.4; g.beginPath(); g.arc(-82, 38, 6, 0, TAU); g.stroke(); g.beginPath(); g.arc(-82, 38, 3, 0, TAU); g.stroke();
      }
      if (kind === 'cap') {
        const nn = Math.min(12, n);
        for (let i = 0; i < nn; i++) {
          const a0 = i / 12 * TAU - .02, a1 = (i + 1) / 12 * TAU + .02;
          g.beginPath(); g.arc(0, 0, 87, a0, a1); g.arc(0, 0, 14, a1, a0, true); g.closePath();
          const gr = g.createLinearGradient(Math.cos(a0) * 80, Math.sin(a0) * 80, Math.cos(a1) * 80, Math.sin(a1) * 80); gr.addColorStop(0, i % 2 ? '#b3ae9f' : '#a39e90'); gr.addColorStop(1, '#78746a'); g.fillStyle = gr; g.fill();
          g.strokeStyle = 'rgba(40,36,30,.6)'; g.lineWidth = 1.6; g.stroke();
        }
        if (n >= 12) { circ(g, 0, 0, 15, '#a39e90'); g.strokeStyle = 'rgba(40,36,30,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 87, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 60, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(60,54,46,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 74, 0, TAU); g.stroke(); }
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, px = Math.cos(a) * 88, py = Math.sin(a) * 88; ell(g, px, py, 5, 4, '#2b2218', a); }
      }
    });
  }
  function cartSpr(load) { return spr('cart:' + load, 180, 130, 90, 65, g => cart(g, 0, 0, 0, load)); }
  function personSpr(id, o) { return spr('p:' + id, 70, 70, 35, 35, g => person(g, 0, 0, Math.PI / 2, o, 0, false, 1.08)); }
  const FOUNDERS = [
    { id: 'steward', cloak: '#7c3a58', hair: '#d9d2c0', tool: 'staff' }, { id: 'smith', cloak: '#4b4036', hair: '#2a1d14', tool: 'hammer' },
    { id: 'digger', cloak: '#6d7a45', hair: '#8c5a2e', tool: 'shovel' }, { id: 'warden', cloak: '#3d5a7a', hair: '#4a3a2a', tool: 'ledger' },
  ];

  // ====================================================================== tiles, state, view
  const TILES = []; let ready = false, layoutDone = false;
  function ensureLayout() { if (layoutDone) return; LAY = layout(); addSolids(); layoutDone = true; built = true; }
  function initScale() { const d = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1; sc = d > 1.25 ? 1.1 : 1; /* (tiles are painted on demand and capped near TILE_BUDGET, so this only sets their sharpness) */ try { if (document.fonts && document.fonts.load) document.fonts.load('600 16px Cinzel'); } catch (e) { /* the fallback serif is fine */ } }
  // The ground is painted a tile at a time, when the camera first needs it (at most two a frame, nearest the camera first, the ring just
  // beyond the view as a head start), and tiles far from the camera are let go once the cache passes TILE_BUDGET. Until a tile is ready its
  // place shows the plain grass colour. The minimap keeps a small overview that each tile is stamped onto as it is painted.
  const TILE_BUDGET = 40 * 1024 * 1024, GRASS = '#4b6636', OVW = 1024, OVH = Math.round(OVW * H / W);
  let tileStamp = 0, tileCount = 0, ovC = null, ovVer = 0;
  const tileBytes = () => TS * sc * TS * sc * 4;
  function paintOne(tx, ty) {
    const i = ty * NTX + tx; if (TILES[i]) return;
    const c = mk(TS * sc, TS * sc), g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, -tx * TS * sc, -ty * TS * sc);
    paintTile(g, tx, ty); TILES[i] = { c, x: tx * TS, y: ty * TS, used: tileStamp }; tileCount++;
    if (!ovC) { ovC = mk(OVW, OVH); const og = ovC.getContext('2d'); og.fillStyle = GRASS; og.fillRect(0, 0, OVW, OVH); }
    ovC.getContext('2d').drawImage(c, tx * TS * OVW / W, ty * TS * OVH / H, TS * OVW / W + 1, TS * OVH / H + 1); ovVer++;
  }
  function dropTile(i) { const t = TILES[i]; if (!t) return; t.c.width = t.c.height = 1; TILES[i] = undefined; tileCount--; }
  // paint what the view needs (everything at once on the very first frame), then the ring beyond it; let go of the far tiles
  function tilesFor(cam) {
    const stamp = ++tileStamp, x0 = Math.max(0, Math.floor(VW.x0 / TS)), x1 = Math.min(NTX - 1, Math.floor(VW.x1 / TS)), y0 = Math.max(0, Math.floor(VW.y0 / TS)), y1 = Math.min(NTY - 1, Math.floor(VW.y1 / TS));
    const need = [], ring = [], cx = cam.x, cy = cam.y;
    for (let ty = Math.max(0, y0 - 1); ty <= Math.min(NTY - 1, y1 + 1); ty++) for (let tx = Math.max(0, x0 - 1); tx <= Math.min(NTX - 1, x1 + 1); tx++) {
      const i = ty * NTX + tx, inView = tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1, t = TILES[i];
      if (t) t.used = stamp; else (inView ? need : ring).push([Math.hypot((tx + .5) * TS - cx, (ty + .5) * TS - cy), tx, ty]);
    }
    const first = tileCount === 0; need.sort((a, b) => a[0] - b[0]); ring.sort((a, b) => a[0] - b[0]);
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0; let n = 0;
    for (const [, tx, ty] of need) { if (!first && n >= 2) break; if (!first && n >= 1 && t0 && performance.now() - t0 > 14) break; paintOne(tx, ty); n++; }
    if (!n && !need.length) for (const [, tx, ty] of ring) { if (tileCount * tileBytes() + tileBytes() > TILE_BUDGET) break; paintOne(tx, ty); break; }   // (one head-start tile a frame, only while there is room)
    // over budget: the tile least recently in sight goes (never one of this frame's)
    while (tileCount * tileBytes() > TILE_BUDGET) { let w = -1, wu = stamp; for (let i = 0; i < TILES.length; i++) { const t = TILES[i]; if (t && t.used < wu) { wu = t.used; w = i; } } if (w < 0) break; dropTile(w); }
  }
  function build() { ensureLayout(); if (typeof document === 'undefined') return; initScale(); ready = true; }
  // (for tools and screenshots: stamp every tile onto the overview, keeping none of them beyond the budget)
  function paintOverview() { build(); for (let ty = 0; ty < NTY; ty++) for (let tx = 0; tx < NTX; tx++) { const i = ty * NTX + tx, had = !!TILES[i]; paintOne(tx, ty); if (!had && tileCount * tileBytes() > TILE_BUDGET) dropTile(i); } }
  function buildAsync() { build(); return Promise.resolve(); }

  const EMPTY = [];
  const S = { units: EMPTY, quests: EMPTY, spring: 'trickle', fountainR: FOUNTAIN_R, gate: 'none', gateHp: 1, shut: false, carved: 0, forge: false, smith: false, carts: EMPTY, night: 0, beacon: false, jars: 0, postsN: 0, postsArr: null, postsOff: EMPTY, lights: EMPTY, nLights: 0, postSlots: false, graves: 0, roof: 0, cap: 0, founders: null, found: 0, glint: false, prints: false, labels: true };
  function norm(state) {
    const p = (state && state.props) || {};
    S.units = (state && state.units) || EMPTY; S.quests = (state && state.quests) || EMPTY;
    S.spring = p.spring === 'well' ? 'well' : 'trickle'; S.fountainR = p.fountainR > 0 ? p.fountainR : FOUNTAIN_R;
    S.gate = p.gate === 'stone' ? 'stone' : p.gate === 'palisade' ? 'palisade' : 'none'; S.gateHp = p.gateHp == null ? 1 : clamp(+p.gateHp || 0, 0, 1); S.shut = !!p.shut; S.carved = clamp(+p.carved || 0, 0, 1);
    S.forge = !!p.forge; S.smith = !!p.smith; S.carts = p.carts || EMPTY; S.night = clamp(+p.night || 0, 0, 1); S.beacon = p.beacon === true || p.beacon === 'lit' || p.beacon === 1;
    S.jars = p.jars | 0; S.postsArr = Array.isArray(p.posts) ? p.posts : null; S.postsOff = Array.isArray(p.postsOff) ? p.postsOff : EMPTY; S.lights = (state && state.lights) || EMPTY; S.nLights = (state && state.nLights) | 0; S.postsN = typeof p.posts === 'number' ? p.posts : 0; S.postSlots = !!p.postSlots;
    S.graves = p.graves === true ? 7 : clamp(p.graves | 0, 0, 7); S.roof = p.roof === true ? 1 : clamp(+p.roof || 0, 0, 1); S.cap = p.capstone === true ? 1 : clamp(+p.capstone || 0, 0, 1);
    S.founders = p.founders || null; S.qw = Array.isArray(p.qw) ? p.qw : EMPTY; S.found = p.found | 0; S.glint = !!p.glint; S.prints = !!p.prints; S.labels = p.labels !== false;
    return S;
  }
  const planted = i => S.postsArr ? S.postsArr.indexOf(i) >= 0 : i < S.postsN;
  const postOut = i => S.postsOff.length > 0 && S.postsOff.indexOf(i) >= 0;
  const gateHpb = () => S.gateHp <= 0 ? 0 : Math.max(1, Math.round(S.gateHp * 4));
  const VW = { x0: 0, y0: 0, x1: 0, y1: 0, z: 1 };
  const inV = (x, y, r) => x + r >= VW.x0 && x - r <= VW.x1 && y + r >= VW.y0 && y - r <= VW.y1;
  function begin(ctx, cam) {
    const z = cam.zoom || cam.z || 1, k = ctx.canvas.width / cam.w;
    ctx.save(); ctx.setTransform(k * z, 0, 0, k * z, k * (cam.w / 2 - cam.x * z), k * (cam.h / 2 - cam.y * z));
    VW.x0 = cam.x - cam.w / 2 / z - 8; VW.x1 = cam.x + cam.w / 2 / z + 8; VW.y0 = cam.y - cam.h / 2 / z - 8; VW.y1 = cam.y + cam.h / 2 / z + 8; VW.z = z; VW.k = k;
    return k;
  }
  function flame(g, x, y, s, t, seed) {
    const f = 1 + .14 * Math.sin(t * 13 + seed) + .08 * Math.sin(t * 23 + seed * 2);
    [['#ff7a1c', 1, 1], ['#ffb938', .72, .88], ['#fff1b0', .42, .7]].forEach(([c, k, h]) => {
      g.fillStyle = c; g.beginPath(); const w = s * k, hh = s * 1.9 * h * f;
      g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 1.1 + Math.sin(t * 9 + seed) * 2, y - hh * .55, x + Math.sin(t * 11 + seed) * 2.4, y - hh); g.quadraticCurveTo(x + w * 1.1, y - hh * .5, x + w, y); g.quadraticCurveTo(x, y + w * .6, x - w, y); g.fill();
    });
  }
  function smoke(g, x, y, t, n, h, col, spread) {
    if (!inV(x, y - h / 2, h)) return;
    for (let i = 0; i < n; i++) { const ph = ((t * .22 + i / n) % 1), a = (1 - ph) * .28 * (ph < .1 ? ph * 10 : 1); g.fillStyle = `rgba(${col},${a})`; g.beginPath(); g.arc(x + Math.sin(t * .8 + i * 2) * spread * ph + ph * 10, y - ph * h, 6 + ph * 18, 0, TAU); g.fill(); }
  }
  const lanePt = (pl, s) => { let i = 0; while (i < pl.length - 1 && pl[i][2] < s) i++; return pl[i]; };
  const PRINTS = (() => {
    const tr = FM.spline([[3856, 3692], [4020, 3400], [4300, 3000], [4580, 2740], [4800, 2500], [4940, 2340], [5100, 2270], [5300, 2060], [5520, 1640], [5780, 1200], [6020, 760], [6120, 540]], 8), tot = tr[tr.length - 1][2], out = [];
    for (let s = 20, k = 0; s < tot - 20; s += 30, k++) {
      let i = 1; while (i < tr.length - 1 && tr[i][2] < s) i++; const p = tr[i], o = (k % 2 ? 1 : -1) * 5, x = p[0] - p[4] * o, y = p[1] + p[3] * o;
      if (FM.inRiver(x, y, -4) && !(y > 2150 && y < 2320)) continue;
      out.push([x, y, Math.atan2(p[4], p[3]) + Math.PI / 2, clamp(Math.min(s, tot - s) / 150, 0, 1)]);
    }
    return out;
  })();

  // ====================================================================== the ground pass
  function drawSpot(g, t) {
    const f = S.found;
    if (inV(5876, 1130, 30)) {
      if (!(f & 1)) { ell(g, 5877, 1130, 14, 8.5, 'rgba(120,150,84,.22)', -.2); line(g, 5866, 1131, 5889, 1125, 'rgba(30,50,24,.28)', 1, 'butt'); }
      else { ell(g, 5877, 1131, 13, 8, 'rgba(60,44,30,.5)', -.2); ell(g, 5885, 1125, 9, 5, 'rgba(110,138,78,.5)', -.5); }
    }
    if (inV(1504, 1872, 40)) {
      g.save(); g.translate(1504 + ((f & 2) ? 16 : 0), 1872); g.rotate(-.18); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-24, -15, 54, 38); g.fillStyle = '#6f7266'; g.fillRect(-27, -17, 54, 34); g.fillStyle = 'rgba(88,128,64,.5)'; g.fillRect(-27, -17, 54, 7); g.fillRect(-27, 6, 14, 11); g.strokeStyle = 'rgba(30,30,26,.55)'; g.lineWidth = 1; g.strokeRect(-27, -17, 54, 34);
      if (S.beacon) { const k = .5 + .5 * Math.sin(t * 2.2); g.fillStyle = `rgba(210,222,235,${.14 + .1 * k})`; g.fillRect(-26, -16, 52, 32); g.strokeStyle = `rgba(235,244,255,${.5 + .3 * k})`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-12, -5); g.lineTo(18, -9); g.stroke(); const sx = 10 + 6 * Math.sin(t * 1.3); g.strokeStyle = `rgba(255,255,255,${.6 * k})`; g.beginPath(); g.moveTo(sx - 5, 0); g.lineTo(sx + 5, 0); g.moveTo(sx, -5); g.lineTo(sx, 5); g.stroke(); }
      g.restore();
    }
    if (S.spring === 'well' && inV(2792, 4242, 30)) {
      ell(g, 2792, 4242, 10, 6, '#357886'); ell(g, 2791, 4242, 7, 4, '#4d8a3a'); circ(g, 2793, 4240.5, 2.2, '#5fa04a');
      const ph = (t * .09) % 1; if (ph < .12) { g.strokeStyle = `rgba(210,240,240,${.5 * (1 - ph / .12)})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(2792, 4242, 5 + ph * 110, 3 + ph * 60, 0, 0, TAU); g.stroke(); }
      if (((t * .13) % 1) < .06) { ell(g, 2790, 4238, 3, 2, '#5f8a3e'); circ(g, 2788.6, 4236.8, .9, '#1c2a14'); }
    }
    if (S.glint && !(f & 8) && inV(5126, 2326, 20)) { const k = .5 + .5 * Math.sin(t * 3); circ(g, 5126, 2326, 2.2, `rgba(235,244,255,${.18 + .3 * k})`); g.strokeStyle = `rgba(245,250,255,${.25 + .5 * k})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(5119, 2326); g.lineTo(5133, 2326); g.moveTo(5126, 2319); g.lineTo(5126, 2333); g.stroke(); }
    if (S.prints && !(f & 16)) for (const p of PRINTS) {
      if (!inV(p[0], p[1], 8)) continue; g.save(); g.translate(p[0], p[1]); g.rotate(p[2]); g.fillStyle = `rgba(36,26,18,${p[3] * .24})`; g.beginPath(); g.ellipse(0, 0, 2.2, 3.6, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, 4.5, 1.5, 1.8, 0, 0, TAU); g.fill(); g.restore();
    }
    if (S.graves > 0 && inV(600, 4384, 30)) { g.save(); g.translate(600, 4384); g.rotate(.2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-12, -2, 30, 24); g.fillStyle = '#7b7d70'; g.beginPath(); g.moveTo(-12, 16); g.lineTo(-10, -8); g.quadraticCurveTo(2, -16, 14, -8); g.lineTo(16, 16); g.fill(); g.fillStyle = 'rgba(70,104,50,.55)'; g.fillRect(-12, 8, 28, 8); g.fillStyle = 'rgba(40,52,36,.5)'; g.fillRect(-14, 12, 34, 6); g.restore(); }
    if (!(f & 128) && inV(2956, 4568, 40)) { const px = 2956, py = 4568; ell(g, px + 1, py + 1.5, 5, 3.5, 'rgba(0,0,0,.3)'); ell(g, px, py, 5, 3.5, '#9a7a5c'); ell(g, px - 1, py - 1, 2.6, 1.6, 'rgba(255,170,100,.4)'); }
  }
  function drawFounder(g, f, t) {
    let pos = S.founders && S.founders[f.id], act = false;
    if (!pos) {
      if (f.id === 'steward') pos = [3700, 3700, Math.PI];
      else if (f.id === 'smith') { pos = [4160, 3834, -1.3]; act = S.smith; }
      else if (f.id === 'digger') { if (S.spring === 'trickle') { pos = [2810, 4080, .3]; act = true; } else if (S.graves > 0 && S.graves < 7 && !S.qw.some(w => w[1] === 'digger')) { /* (with work to hand out she is back home, where her ! is) */ pos = [1430, 3850, 0]; act = true; } else pos = [2810, 4080, 0]; }
      else pos = [2996, 1970, Math.PI];
    } else act = pos[3];
    if (!inV(pos[0], pos[1], 40)) return;
    person(g, pos[0], pos[1], pos[2] || Math.PI / 2, f, t, false, 1.08, act);
  }
  const questKey = id => { const s = String(id).toLowerCase(); if (s.indexOf('spring') >= 0) return 'spring'; if (s.indexOf('fire') >= 0 || s.indexOf('forge') >= 0) return 'fire'; if (s.indexOf('beacon') >= 0) return 'beacon'; if (s.indexOf('road') >= 0 || s.indexOf('lantern') >= 0) return 'road'; if (s.indexOf('grave') >= 0) return 'grave'; if (s.indexOf('roof') >= 0 || s.indexOf('hall') >= 0) return 'roof'; if (s.indexOf('cover') >= 0 || s.indexOf('cap') >= 0) return 'cover'; if (s.indexOf('gate') >= 0 || s.indexOf('stone') >= 0) return 'gate'; return null; };
  const questLive = st => !(st === 'done' || st === 'failed' || st === 'missed' || st === 'locked' || st === 'complete' || st === 'completed' || st === 0 || st == null || st === false);

  function drawGround(ctx, cam, state, t) {
    if (!layoutDone || !ready) build();
    norm(state);
    const k = begin(ctx, cam), g = ctx, z = VW.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0b09'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k * z, 0, 0, k * z, k * (cam.w / 2 - cam.x * z), k * (cam.h / 2 - cam.y * z));
    if (ready) tilesFor(cam);
    for (let ty = Math.max(0, Math.floor(VW.y0 / TS)); ty <= Math.min(NTY - 1, Math.floor(VW.y1 / TS)); ty++) for (let tx = Math.max(0, Math.floor(VW.x0 / TS)); tx <= Math.min(NTX - 1, Math.floor(VW.x1 / TS)); tx++) {
      const tl = TILES[ty * NTX + tx]; if (tl) g.drawImage(tl.c, tl.x, tl.y, TS + 1, TS + 1); else { g.fillStyle = GRASS; g.fillRect(tx * TS, ty * TS, TS + 1, TS + 1); }
    }
    if (!ready && !tileCount) { ctx.restore(); return; }
    // the river runs
    for (let i = 0; i < RV.length; i += 3) {
      const p = RV[i]; if (!inV(p[0], p[1], 140)) continue;
      for (let j = 0; j < 3; j++) {
        const o = (hash(i, j) - .5) * p[5] * 1.4, ph = (t * .5 + hash(i, j + 5) * 3) % 1, x = p[0] - p[4] * o, y = p[1] + p[3] * o + ph * 30;
        g.strokeStyle = `rgba(210,240,240,${.32 * Math.sin(ph * Math.PI)})`; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 7, y); g.quadraticCurveTo(x, y - 2.5, x + 7, y); g.stroke();
      }
    }
    // the two doors of the dark
    [P.spawn1, P.spawn2].forEach(([x, y], j) => {
      if (!inV(x, y, 150)) return;
      const a = .5 + .5 * Math.sin(t * 1.6 + j * 2); glowAt(g, 'violet', x, y, 100, .3 + a * .16);
      for (let i = 0; i < 7; i++) { const ph = (t * .35 + i / 7 + j) % 1, an = i * 2.4 + j; circ(g, x + Math.cos(an) * (20 + hash(i, j) * 60), y + Math.sin(an) * (16 + hash(i, j + 1) * 50) - ph * 30, 1.8, `rgba(235,${120 + i * 15},80,${(1 - ph) * .65})`); }
    });
    // the camp's healing ground
    const [sx, sy] = P.spring, fr = S.fountainR, kHeal = S.spring === 'well' ? 1 : .55;
    if (inV(sx, sy, fr + 20)) {
      const pul = .75 + .25 * Math.sin(t * 1.7);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = kHeal * (.8 + .2 * pul);
      g.drawImage(glowSpr('ringfill'), sx - fr, sy - fr, fr * 2, fr * 2); g.globalAlpha = 1;
      g.lineCap = 'round';
      g.strokeStyle = `rgba(110,200,215,${.12 * kHeal})`; g.lineWidth = 14; g.beginPath(); g.arc(sx, sy, Math.max(1, fr - 6), 0, TAU); g.stroke();
      g.strokeStyle = `rgba(190,245,250,${(.3 + .2 * pul) * kHeal})`; g.lineWidth = 2.2; g.setLineDash([16, 9]); g.lineDashOffset = -t * 12; g.beginPath(); g.arc(sx, sy, fr, 0, TAU); g.stroke(); g.setLineDash([]);
      for (let i = 0; i < 12; i++) { const ph = (t * .18 + i / 12) % 1, a = ph * TAU + i, rd = Math.max(2, fr - 4 - hash(i, 3) * 22); circ(g, sx + Math.cos(a) * rd, sy + Math.sin(a) * rd, 2, `rgba(220,252,255,${Math.sin(ph * Math.PI) * .8 * kHeal})`); }
      g.globalCompositeOperation = 'source-over';
    }
    put(g, springSpr(S.spring), sx, sy);
    if (S.spring === 'well') {
      for (let i = 0; i < 4; i++) { const ph = (t * .45 + i / 4) % 1; g.strokeStyle = `rgba(225,248,248,${(1 - ph) * .6})`; g.lineWidth = 1.4; g.beginPath(); g.arc(sx, sy, 8 + ph * 36, 0, TAU); g.stroke(); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * .4, ph = (t * 1.1 + i * .17) % 1, r = 6 + ph * 28; circ(g, sx + Math.cos(a) * r, sy + Math.sin(a) * r, 1.6 * (1 - ph) + .4, `rgba(235,252,252,${.7 * (1 - ph)})`); }
    } else { for (let i = 0; i < 4; i++) { const ph = (t * .4 + i / 4) % 1; g.strokeStyle = `rgba(200,230,230,${(1 - ph) * .5})`; g.lineWidth = 1; g.beginPath(); g.ellipse(sx - 2, sy - 1, 3 + ph * 22, 2 + ph * 14, 0, 0, TAU); g.stroke(); } }
    // meadow
    if (S.graves > 0) {
      const gs = spr('bluebells', 380, 220, 190, 110, h => {
        for (let i = 0; i < 260; i++) { const a = hash(i, 1) * TAU, d = Math.sqrt(hash(i, 2)) * 150, x = 20 + Math.cos(a) * d * 1.15, y = Math.sin(a) * d * .65; h.strokeStyle = '#47723a'; h.lineWidth = 1.2; h.beginPath(); h.moveTo(x, y); h.lineTo(x + 1, y - 6); h.stroke(); circ(h, x + 1, y - 7, 2.3, i % 3 ? '#8a93d6' : '#a3a9e6'); circ(h, x + 3, y - 5, 1.7, '#7880c2'); }
      });
      put(g, gs, P.meadow[0], P.meadow[1], clamp(S.graves / 3, .25, 1));
      const mounds = [[1200, 3885], [1250, 3895], [1300, 3905], [1352, 3892], [1220, 3950], [1276, 3960], [1330, 3952]];
      for (let i = 0; i < S.graves; i++) {
        const [x, y] = mounds[i], ms = spr('grave:' + i, 90, 70, 45, 40, h => { mound(h, 0, 0); marker(h, 0, 0, i % 2); for (let q = 0; q < 8; q++) { const a = q / 8 * TAU; circ(h, Math.cos(a) * 17 + 3, Math.sin(a) * 8, 2.1, q % 2 ? '#8a93d6' : '#a3a9e6'); } });
        put(g, ms, x, y);
      }
    }
    // the gate
    const gx = P.gate[0], gy = P.gate[1];
    if (inV(gx, gy, 420)) {
      put(g, gateSpr(S.gate, S.gate === 'none' ? 4 : gateHpb(), S.shut), gx, gy);
      if (S.gate !== 'stone') put(g, spr('gatepiles', 120, 80, 60, 40, h => { stoneStack(h, -14, -8, -.2, 4, 3); stoneStack(h, 16, 12, .15, 3, 7); }), GATE.x - 100, GATE.y + 75);
      if (S.gate === 'none') put(g, spr('gatetimber', 120, 60, 60, 30, h => { logPile(h, 0, -14, -.1, 5, 90); }), GATE.x - 160, GATE.y + 50);
    }
    for (const c of S.carts) if (c && inV(c.x, c.y, 90)) putRot(g, cartSpr('stone'), c.x, c.y, (c.a == null ? -Math.PI / 2 : c.a) + Math.PI);
    // the hall site
    if (inV(HALL.x, HALL.y, 160)) put(g, hallSpr(S.roof >= 1 ? 2 : S.roof > 0 ? 1 : 0), HALL.x, HALL.y);
    // the oil jars waiting in camp, the empty ones at the hill
    if (S.jars > 0 && inV(3810, 4020, 40)) for (let i = 0; i < Math.min(8, S.jars); i++) jar(g, 3799 + (i % 3) * 14 + (i > 2 ? 7 : 0), 4006 + Math.floor(i / 3) * 12, 1);
    // lantern posts
    const tot = POST_SLOTS.length;
    for (let i = 0; i < tot; i++) {
      const ps = POST_SLOTS[i]; if (!inV(ps[0], ps[1], 50)) continue;
      if (planted(i)) {
        put(g, postSpr(ps[2]), ps[0], ps[1]);
        const lx = ps[0] + 8 * ps[2], ly = ps[1] - 8, fl = .8 + .2 * Math.sin(t * 8 + i * 2), on = S.night > .15 && !postOut(i);
        circ(g, lx, ly, 4.6, on ? `rgba(255,${190 + 20 * fl | 0},90,1)` : postOut(i) ? '#4b4338' : '#c79a4a'); circ(g, lx - 1, ly - 1, 1.6, 'rgba(255,250,220,.8)');
        if (on) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'warm', lx, ly, 46, .5 * fl * S.night); g.globalCompositeOperation = 'source-over'; }
      } else if (S.postSlots) stake(g, ps[0], ps[1], '#e6dcc0', 0);
    }
    // forge
    const fx = P.forge[0], fy = P.forge[1];
    if (inV(fx, fy, 160)) {
      put(g, forgeSpr(), fx, fy);
      if (S.forge) {
        const f = 1 + .12 * Math.sin(t * 12) + .06 * Math.sin(t * 21);
        circ(g, fx + 7, fy - 8.4, 13, `rgb(255,${110 + 30 * f | 0},30)`); circ(g, fx + 7, fy - 8.4, 8.4, '#ffbd54'); circ(g, fx + 6, fy - 9.6, 3.8, '#fff0b8'); circ(g, fx + 5, fy - 2.4, 2.4, '#a43a12');
        g.globalCompositeOperation = 'lighter'; glowAt(g, 'warm', fx + 7, fy - 8, 84, .5 * f);
        for (let i = 0; i < 8; i++) { const ph = (t * 1.3 + i / 8) % 1; circ(g, fx + 7 + Math.sin(i * 5 + t * 2) * 18 * ph, fy - 8 - ph * 50, 1.5, `rgba(255,${150 + i * 10},60,${1 - ph})`); }
        if (S.smith) for (let i = 0; i < 9; i++) { const ph = (t * 1.7 + i * .11) % .6 / .6, a = i * 1.7 + Math.floor(t * 1.7 / .6) * 2.3; circ(g, fx - 4 + Math.cos(a) * 26 * ph, fy + 27 + Math.sin(a) * 18 * ph - ph * 8, 1.4, `rgba(255,${200 - i * 8},90,${(1 - ph) * .9})`); }
        g.globalCompositeOperation = 'source-over';
      }
    }
    // beacon
    const bx = P.beacon[0], by = P.beacon[1];
    if (inV(bx, by, 140)) {
      if (!S.beacon) for (const j of [[bx - 70, by + 58], [bx - 52, by + 76], [bx - 82, by + 82]]) jar(g, j[0], j[1], 1.1);
      put(g, beaconSpr(), bx, by);
      if (S.beacon) {
        const f = 1 + .12 * Math.sin(t * 11) + .07 * Math.sin(t * 19);
        g.globalCompositeOperation = 'lighter'; glowAt(g, 'warm', bx, by, 90, .55 * f); g.globalCompositeOperation = 'source-over';
        flame(g, bx, by + 8, 21, t, 1); flame(g, bx - 10, by + 10, 12, t, 4); flame(g, bx + 10, by + 10, 12, t, 7);
        for (let i = 0; i < 10; i++) { const ph = (t * .6 + i / 10) % 1; circ(g, bx + Math.sin(i * 3 + t) * 20 * ph, by - ph * 90, 1.6, `rgba(255,${170 + i * 5},70,${(1 - ph) * .9})`); }
      }
    }
    // the Hearth: oiled canvas, or the capstone, with the warmth leaking at the edges only
    const [hx, hy] = P.hearth, hf = 1 + .08 * Math.sin(t * 7) + .05 * Math.sin(t * 17.3);
    if (inV(hx, hy, 180)) {
      const n = Math.floor(S.cap * 12);
      put(g, hearthSpr(S.cap >= 1 ? 'cap' : n > 0 ? 'cap' : 'canvas', S.cap >= 1 ? 12 : n), hx, hy);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      if (S.cap < 1) {
        glowAt(g, 'warm', hx, hy, 118, .3 * hf);
        g.lineWidth = 7; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, kk = .4 + .6 * Math.sin(t * 5 + i * 1.9) * Math.sin(t * 3.1 + i * 2.7); if (kk < .1) continue; if (n > 0 && Math.floor(a / TAU * 12) < n) continue; g.strokeStyle = `rgba(255,140,40,${.5 * kk * hf})`; g.beginPath(); g.arc(hx, hy, 90.5, a, a + .22); g.stroke(); }
      } else {
        glowAt(g, 'warm', hx, hy, 105, .16 * hf);
        g.lineWidth = 2.4; g.strokeStyle = `rgba(255,140,50,${.35 * hf})`; for (const [a, b] of [[.3, 1.1], [3.4, 4.0], [5.2, 5.7]]) { g.beginPath(); g.arc(hx, hy, 87.5, a, b); g.stroke(); }
      }
      g.restore();
      glowAt(g, 'warm', hx, hy, 160, .16 * hf);
    }
    // pit fires, the Steward's pennant, the Smith's coin sign over the supply tent
    PITS.forEach((p, i) => {
      if (!inV(p[0], p[1], 80)) return;
      flame(g, p[0], p[1] + 4, 9, t, (i + 1) * 3);
      g.globalCompositeOperation = 'lighter'; glowAt(g, 'warm', p[0], p[1], 64, .3 + .06 * Math.sin(t * 9 + i)); g.globalCompositeOperation = 'source-over';
    });
    if (inV(3616, 3568, 40)) { g.save(); g.translate(3616, 3568); line(g, 0, 0, 0, -34, '#4a3622', 2); const w = Math.sin(t * 3) * 3; g.fillStyle = '#b8503a'; g.beginPath(); g.moveTo(0, -34); g.quadraticCurveTo(10, -32 + w, 22, -28); g.quadraticCurveTo(10, -26 - w, 0, -20); g.fill(); g.restore(); }
    if (inV(3780, 4250, 50)) {
      g.save(); g.translate(3780, 4255); circ(g, 2, 3, 3.6, 'rgba(0,0,0,.3)'); line(g, 0, 0, 0, -30, '#4a3622', 3); line(g, 0, -30, -16, -30, '#4a3622', 2.4);
      g.translate(-16, -30); g.rotate(Math.sin(t * 1.6) * .1); line(g, 0, 0, 0, 5, '#8a6a45', 1.4);
      circ(g, 0, 15, 11, '#6a4a14'); circ(g, 0, 15, 9.6, '#e0b84e'); circ(g, 0, 15, 7.4, '#f1d27a'); g.strokeStyle = '#a07a22'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 15, 7.4, 0, TAU); g.stroke(); line(g, 0, 10, 0, 20, '#a07a22', 1.8); line(g, -3.4, 12, 3.4, 12, '#a07a22', 1.4); line(g, -3.4, 18, 3.4, 18, '#a07a22', 1.4); circ(g, -3, 11, 2, 'rgba(255,255,255,.4)');
      g.restore();
    }
    // the Warden's tally post at the head of the road
    if (inV(3072, 1992, 40)) { line(g, 3072, 2002, 3072, 1966, '#3d2c1b', 5.6, 'butt'); line(g, 3071, 2002, 3071, 1966, '#6a4d2f', 2.6, 'butt'); g.strokeStyle = 'rgba(232,222,190,.7)'; g.lineWidth = 1; for (let i = 0; i < 12; i++) { const y = 1971 + (i % 4) * 5, x0 = 3068 + Math.floor(i / 4) * 0; g.beginPath(); g.moveTo(3070, y); g.lineTo(3074, y); g.stroke(); void x0; } }
    // (the quest places are no longer ringed here: the client marks only each quest's current step, quietly)
    drawSpot(g, t);
    // a sign names a place only once it is there: the dug spring, the forge, the hall's roof, the gate, the lit beacon, the first grave. The supply tent, the timber woods and the ford are there from the start.
    const built = { spring: S.spring === 'well', forge: S.forge, hall: S.roof > 0, gate: S.gate !== 'none', beacon: S.beacon, meadow: S.graves > 0 };
    for (const sg of SIGNS) if (inV(sg[1], sg[2], 90) && (built[sg[0]] === undefined || built[sg[0]])) put(g, signSpr(sg), sg[1], sg[2]);
    if (S.labels) {
      g.save(); for (const lb of LABELS) { if (!inV(lb[1], lb[2], lb[4] * 14)) continue; const ts = textSpr('lab:' + lb[0], lb[0], lb[4], 'rgba(244,230,190,.5)', { ls: 8, shadow: 'rgba(0,0,0,.8)' }); putRot(g, ts, lb[1], lb[2], lb[3]); } g.restore();
    }
    // the founders (the Warden stands by the road head)
    for (const f of FOUNDERS) drawFounder(g, f, t);
    ctx.restore();
  }

  // ====================================================================== the overhead pass
  const FADE = { tree: null, last: 0, fr: 0, hall: 1, gate: 1, derrick: 1 };
  function lowerBound(arr, y) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].y < y) lo = m + 1; else hi = m; } return lo; }
  function unitIn(x0, y0, x1, y1) { for (const u of S.units) if (u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1) return true; return false; }
  function drawOver(ctx, cam, state, t) {
    if (!layoutDone) build();
    if (!ready && !TILES.length) return;
    norm(state);
    const dt = clamp(t - FADE.last, 0, .1); FADE.last = t; const kd = Math.min(1, dt * 9), g = ctx;
    begin(ctx, cam);
    const trees = LAY.trees;
    if (!FADE.tree) { FADE.tree = new Float32Array(trees.length).fill(1); FADE.stamp = new Int32Array(trees.length); }
    FADE.fr++;
    for (const u of S.units) { for (let i = lowerBound(trees, u.y - 62); i < trees.length && trees[i].y < u.y + 62; i++) { const tr = trees[i]; if (Math.abs(tr.x - u.x) < tr.s * .95 + 10 && Math.hypot(tr.x - u.x, tr.y - u.y) < tr.s * .95 + 10) FADE.stamp[i] = FADE.fr; } }
    for (let i = lowerBound(trees, VW.y0 - 70); i < trees.length && trees[i].y < VW.y1 + 70; i++) {
      const tr = trees[i]; if (tr.x < VW.x0 - 70 || tr.x > VW.x1 + 70) continue;
      const tgt = FADE.stamp[i] === FADE.fr ? .36 : 1; FADE.tree[i] += (tgt - FADE.tree[i]) * kd; if (FADE.tree[i] > .99) FADE.tree[i] = 1;
      const nv = tr.type === 'oak' ? 8 : 5, s = treeSpr(tr.type, tr.seed % nv), r = tr.s / TREE_R;
      const a = FADE.tree[i]; if (a < 1) g.globalAlpha = a;
      g.drawImage(s.c, tr.x - TREE_C * r, tr.y - TREE_C * r, s.w * r, s.h * r);
      if (a < 1) g.globalAlpha = 1;
    }
    // the hall rising: posts and ridge, then the roof; it fades when anyone is under it
    if (S.roof > 0 && inV(HALL.x, HALL.y, 170)) {
      FADE.hall += ((unitIn(HALL.x - 122, HALL.y - 86, HALL.x + 122, HALL.y + 86) ? .3 : 1) - FADE.hall) * kd;
      put(g, hallRoofSpr(Math.max(1, Math.round(S.roof * 8))), HALL.x, HALL.y, FADE.hall);
    }
    if (S.gate === 'stone' && inV(P.gate[0], P.gate[1], 110)) {
      FADE.gate += ((unitIn(P.gate[0] - 90, P.gate[1] - 50, P.gate[0] + 90, P.gate[1] + 50) ? .32 : 1) - FADE.gate) * kd;
      put(g, gateRoofSpr(gateHpb(), S.carved), P.gate[0], P.gate[1], FADE.gate);
    }
    // the derrick that lifts the capstone
    if (S.cap > 0 && S.cap < 1 && inV(3290, 3860, 130)) {
      FADE.derrick += ((unitIn(3220, 3780, 3380, 3940) ? .35 : 1) - FADE.derrick) * kd; g.globalAlpha = FADE.derrick;
      const top = [3300, 3835], legs = [[3250, 3755], [3360, 3770], [3315, 3925]];
      for (const l of legs) { line(g, l[0] + 4, l[1] + 6, top[0] + 4, top[1] + 6, 'rgba(0,0,0,.25)', 5); line(g, l[0], l[1], top[0], top[1] - 8, '#5d4329', 5); circ(g, l[0], l[1], 4, '#3d2c1b'); }
      circ(g, top[0], top[1] - 8, 6, '#3d2c1b'); circ(g, top[0], top[1] - 8, 3.6, '#8c8f94'); line(g, top[0], top[1] - 8, top[0] - 36, top[1] + 12, '#b9a276', 1.4);
      g.fillStyle = '#a39e90'; g.fillRect(top[0] - 50, top[1] + 8, 28, 18); g.strokeStyle = '#4c473f'; g.lineWidth = 1.2; g.strokeRect(top[0] - 50, top[1] + 8, 28, 18);
      g.globalAlpha = 1;
    }
    // smoke and warm haze
    const [hx, hy] = P.hearth;
    smoke(g, hx + 60, hy - 70, t, 3, 70, '60,50,42', 16);
    PITS.forEach((p, i) => smoke(g, p[0], p[1] - 10, t + i + 1, 4, 60, '70,62,54', 10));
    smoke(g, P.forge[0] - 36, P.forge[1] - 31, t + 5, S.forge ? 6 : 1, 90, '60,52,46', 14);
    if (S.roof >= 1) smoke(g, HALL.x - 126 + 43, HALL.y - 90 + 30, t + 2, 5, 80, '80,72,64', 16);
    if (S.beacon) smoke(g, P.beacon[0], P.beacon[1] - 26, t, 5, 110, '50,44,40', 18);
    if (S.spring === 'well') smoke(g, P.spring[0], P.spring[1] - 6, t + 3, 5, 52, '240,248,246', 8);
    ctx.restore();
  }

  // ====================================================================== dusk and night
  let NC = null, ng = null; const LT = []; let nl = 0;
  function addL(x, y, r, k, cool) { if (!inV(x, y, r)) return; const o = LT[nl] || (LT[nl] = {}); o.x = x; o.y = y; o.r = r; o.k = k; o.cool = !!cool; nl++; }
  function drawLight(ctx, cam, state, t) {
    norm(state); const n = S.night; if (n < .01) return;
    if (!layoutDone) build();
    const cw = ctx.canvas.width, ch = ctx.canvas.height, lw = Math.ceil(cw / 2), lh = Math.ceil(ch / 2);
    if (!cw || !ch) return;   // (a hidden pane has a zero-size canvas)
    if (!NC) { NC = document.createElement('canvas'); ng = NC.getContext('2d'); }
    if (NC.width !== lw || NC.height !== lh) { NC.width = lw; NC.height = lh; }
    const z = cam.zoom || cam.z || 1, k = cw / cam.w;
    VW.x0 = cam.x - cam.w / 2 / z - 8; VW.x1 = cam.x + cam.w / 2 / z + 8; VW.y0 = cam.y - cam.h / 2 / z - 8; VW.y1 = cam.y + cam.h / 2 / z + 8;
    nl = 0;
    const hf = 1 + .08 * Math.sin(t * 7) + .05 * Math.sin(t * 17.3);
    addL(P.hearth[0], P.hearth[1], S.cap >= 1 ? 330 : 400, .95 * hf);
    PITS.forEach((p, i) => addL(p[0], p[1], 230, .8 + .1 * Math.sin(t * 9 + i)));
    addL(3780, 4242, 150, .55);
    addL(P.spring[0], P.spring[1], 120, S.spring === 'well' ? .35 : .15, true);
    if (S.forge) addL(P.forge[0], P.forge[1], 340, .9 * (1 + .12 * Math.sin(t * 12)));
    if (S.beacon) addL(P.beacon[0], P.beacon[1], 620, 1 + .12 * Math.sin(t * 11));
    for (let i = 0; i < POST_SLOTS.length; i++) if (planted(i) && !postOut(i)) { const ps = POST_SLOTS[i]; addL(ps[0] + 8 * ps[2], ps[1] - 8, 210, .85 * (.8 + .2 * Math.sin(t * 8 + i * 2))); }
    if (S.roof >= 1) { addL(HALL.x + 130, HALL.y, 230, .75); addL(HALL.x, HALL.y, 260, .35); }
    if (S.gate === 'stone') { addL(P.gate[0] - 130, P.gate[1] + 56, 200, .7); addL(P.gate[0] + 130, P.gate[1] + 56, 200, .7); }
    addL(P.spawn1[0], P.spawn1[1], 130, .22); addL(P.spawn2[0], P.spawn2[1], 130, .22);
    if (!(S.found & 128)) addL(2956, 4568, 48, .25);
    for (const u of S.units) if (u.hero) addL(u.x, u.y, 190, .6);
    for (let i = 0; i < S.nLights; i++) { const l = S.lights[i]; addL(l.x, l.y, l.r, l.k, l.cool); }
    const kk = k * z * .5, ox = (cam.w / 2 - cam.x * z) * k * .5, oy = (cam.h / 2 - cam.y * z) * k * .5;
    ng.setTransform(1, 0, 0, 1, 0, 0); ng.globalCompositeOperation = 'source-over'; ng.clearRect(0, 0, lw, lh);
    ng.fillStyle = `rgba(8,12,34,${.74 * n})`; ng.fillRect(0, 0, lw, lh);
    ng.globalCompositeOperation = 'destination-out'; const hole = glowSpr('hole');
    for (let i = 0; i < nl; i++) { const l = LT[i]; ng.globalAlpha = Math.min(1, l.k) * n; const r = l.r * kk; ng.drawImage(hole, l.x * kk + ox - r, l.y * kk + oy - r, r * 2, r * 2); }
    ng.globalAlpha = 1; ng.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(NC, 0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';
    const kw = k * z, wx = (cam.w / 2 - cam.x * z) * k, wy = (cam.h / 2 - cam.y * z) * k;
    for (let i = 0; i < nl; i++) { const l = LT[i]; if (l.k < .3) continue; ctx.globalAlpha = .16 * l.k * n; const r = l.r * .8 * kw; ctx.drawImage(glowSpr(l.cool ? 'cool' : 'warm'), l.x * kw + wx - r, l.y * kw + wy - r, r * 2, r * 2); }
    ctx.restore();
  }

  // ====================================================================== clarity marks and the minimap
  const SITE_MARKS = [
    ['hearth', P.hearth[0], P.hearth[1], 'The Hearth', 'camp', 'hearth'], ['spring', P.spring[0], P.spring[1], 'The Spring', 'heal', 'drop'], ['shop', P.shop[0], P.shop[1], 'Supplies', 'shop', 'coin'],
    ['forge', P.forge[0], P.forge[1], 'The Forge', 'site', 'anvil'], ['hall', P.hall[0], P.hall[1], 'The Hall Site', 'site', 'roof'], ['gate', P.gate[0], P.gate[1], 'The Gate', 'site', 'gate'],
    ['beacon', P.beacon[0], P.beacon[1], 'Beacon Hill', 'site', 'flame'], ['meadow', P.meadow[0], P.meadow[1], 'The Meadow', 'site', 'flower'], ['woods', P.woods[0], P.woods[1], 'Timber Woods', 'site', 'axe'],
    ['spawn-north', P.spawn1[0], P.spawn1[1] + 30, 'The North Road', 'spawn', 'skull'], ['spawn-east', P.spawn2[0] - 20, P.spawn2[1], 'The East Ford', 'spawn', 'skull'],
  ];
  const SITE_QUEST = { spring: 'spring', forge: 'fire', hall: 'roof', gate: 'gate', beacon: 'beacon', meadow: 'grave', hearth: 'cover' };
  function marks(state) {
    norm(state); const out = [], live = {};
    for (const q of S.quests) { const key = q && questKey(q[0]); if (key && questLive(q[1])) live[key] = q[0]; }
    for (const m of SITE_MARKS) out.push({ id: m[0], x: m[1], y: m[2], label: m[3], kind: m[4], icon: m[5], active: !!live[SITE_QUEST[m[0]]] });
    for (const key in live) { const sp = QUEST_SPOTS[key]; out.push({ id: 'q:' + live[key], x: sp[0], y: sp[1], label: sp[2], kind: 'quest', icon: 'quest', active: true }); }
    return out;
  }
  const MM = {};
  function minimap(w, h) {
    const key = w + 'x' + h; if (MM[key] && MM[key].ready === ovVer) return MM[key].c;
    const c = mk(w, h), g = c.getContext('2d'), kx = w / W, ky = h / H;
    g.fillStyle = '#26301f'; g.fillRect(0, 0, w, h); g.imageSmoothingEnabled = true;
    if (ovC) g.drawImage(ovC, 0, 0, w, h);   // (the overview: every tile painted so far, kept after the tile itself is let go)
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const L of LANES) { g.strokeStyle = 'rgba(214,92,64,.8)'; g.lineWidth = Math.max(1.4, w / 190); g.setLineDash([w / 90, w / 120]); g.beginPath(); L.path.forEach((p, i) => i ? g.lineTo(p[0] * kx, p[1] * ky) : g.moveTo(p[0] * kx, p[1] * ky)); g.stroke(); }
    g.setLineDash([]);
    for (const sp of [P.spawn1, P.spawn2]) { g.fillStyle = '#b8402c'; g.beginPath(); g.arc(sp[0] * kx, sp[1] * ky, Math.max(2.4, w / 90), 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(230,201,138,.55)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.ellipse(P.hearth[0] * kx, P.hearth[1] * ky, CAMP_R * kx, CAMP_R * ky, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff9a3c'; g.beginPath(); g.arc(P.hearth[0] * kx, P.hearth[1] * ky, Math.max(2.6, w / 80), 0, TAU); g.fill(); g.fillStyle = '#ffe6a8'; g.beginPath(); g.arc(P.hearth[0] * kx, P.hearth[1] * ky, Math.max(1.2, w / 180), 0, TAU); g.fill();
    g.strokeStyle = 'rgba(190,240,246,.7)'; g.lineWidth = 1; g.beginPath(); g.arc(P.spring[0] * kx, P.spring[1] * ky, Math.max(2, w / 110), 0, TAU); g.stroke();
    MM[key] = { c, ready: ovVer }; return c;
  }

  const api = { build, buildAsync, paintOverview, drawGround, drawOver, drawLight, marks, minimap, FOUNTAIN_R, GATE, HALL, POST_SLOTS, SPOTS, LABELS, SIGNS,
    get ready() { return ready; }, get tileInfo() { return { tiles: tileCount, mb: Math.round(tileCount * tileBytes() / 1048576), budgetMb: Math.round(TILE_BUDGET / 1048576), of: NTX * NTY }; }, get solidsAdded() { return built; }, get layout() { ensureLayout(); return LAY; }, layoutOnly: ensureLayout };
  return api;
})();

if (typeof module !== 'undefined') module.exports = { FoundingArt };
