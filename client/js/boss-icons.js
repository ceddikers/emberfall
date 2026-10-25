// An icon for every boss move, keyed by the move's cast name (the name on the cast frame and in the upcoming feed).
// Each is drawn once on a 64px canvas and kept as a data URL: a dark badge lit in the boss's colour, a light glyph of
// the move on it, and a rim in the boss's colour. A boss whose icons are painted (docs/art/boss-icons.md) shows the
// file instead, icons/boss/<boss>/<slug>.png, with the drawn one underneath until it loads (or if one is missing).

const BossIcons = (() => {
  const ACCENT = { archmage: '#3fb8b0', grubnak: '#ff9a3a', skitterra: '#b8ef5a', volkar: '#7fe8ff', hollowking: '#6dff9a', wyrm: '#ff8a2a', titan: '#8ad0ee' };
  ACCENT.hydra = '#7fe0a8';
  Object.assign(ACCENT, { corvane: '#9fc8ec', brannoc: '#e0a84a', morrowoak: '#a77cf0', caelum: '#e9dcae' });   // (set 3)
  const L = '#f2e6c8', INK = '#14111a';
  const cache = new Map();
  const PAINTED = new Set(['grubnak', 'skitterra', 'volkar', 'hollowking', 'wyrm', 'titan', 'archmage', 'hydra', 'corvane', 'brannoc', 'morrowoak', 'caelum']);
  // 'Order Up!' -> order-up, 'Flambé' -> flambe, "Butcher's Charge" -> butchers-charge
  const slug = name => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // ---- drawing bits (all on the 64x64 badge)
  const path = (c, pts, close = true) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (close) c.closePath(); };
  const fill = (c, col, pts) => { path(c, pts); c.fillStyle = col; c.fill(); };
  const stroke = (c, col, w, pts, close = false) => { path(c, pts, close); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); };
  const disc = (c, x, y, r, col) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); };
  const ring = (c, x, y, r, col, w) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  const bolt = (c, col, x, y, s = 1, w = 0) => {
    const pts = [[x + 3 * s, y - 18 * s], [x - 8 * s, y + 2 * s], [x, y + 2 * s], [x - 4 * s, y + 18 * s], [x + 9 * s, y - 3 * s], [x + 1 * s, y - 3 * s]];
    if (w) stroke(c, col, w, pts, true); else fill(c, col, pts);
  };
  const flame = (c, x, y, h, col, core) => {
    c.beginPath(); c.moveTo(x, y - h); c.bezierCurveTo(x + h * 0.55, y - h * 0.45, x + h * 0.5, y + h * 0.1, x, y + h * 0.3);
    c.bezierCurveTo(x - h * 0.5, y + h * 0.1, x - h * 0.55, y - h * 0.4, x, y - h); c.fillStyle = col; c.fill();
    if (core) { c.beginPath(); c.moveTo(x, y - h * 0.4); c.quadraticCurveTo(x + h * 0.25, y, x, y + h * 0.2); c.quadraticCurveTo(x - h * 0.25, y, x, y - h * 0.4); c.fillStyle = core; c.fill(); }
  };
  const cloud = (c, x, y, s, col) => { for (const [dx, dy, r] of [[-12, 2, 9], [0, -5, 12], [12, 1, 9], [-4, 6, 9], [6, 6, 9]]) disc(c, x + dx * s, y + dy * s, r * s, col); };
  const drop = (c, x, y, s, col) => { c.beginPath(); c.moveTo(x, y - 10 * s); c.quadraticCurveTo(x + 8 * s, y + 2 * s, x, y + 7 * s); c.quadraticCurveTo(x - 8 * s, y + 2 * s, x, y - 10 * s); c.fillStyle = col; c.fill(); };
  const cleaver = (c, x, y, a, s, col) => {
    c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
    fill(c, col, [[-14, -10], [10, -10], [10, 8], [-14, 8]]); disc(c, -8, -4, 2.5, INK);
    fill(c, '#8a5a2e', [[10, -3], [24, -3], [24, 2], [10, 2]]);
    c.restore();
  };
  const sword = (c, x, y, a, len, col) => {
    c.save(); c.translate(x, y); c.rotate(a);
    fill(c, col, [[-3, -len], [3, -len], [4, 8], [0, 12], [-4, 8]]); fill(c, '#c8a24a', [[-11, 8], [11, 8], [11, 12], [-11, 12]]); fill(c, '#5a4024', [[-2, 12], [2, 12], [2, 22], [-2, 22]]);
    c.restore();
  };
  const web = (c, x, y, r, col, w = 1.6) => {
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; stroke(c, col, w, [[x, y], [x + Math.cos(a) * r, y + Math.sin(a) * r]]); }
    for (const f of [0.35, 0.65, 0.95]) { const pts = []; for (let i = 0; i <= 8; i++) { const a = i * TAU / 8; pts.push([x + Math.cos(a) * r * f, y + Math.sin(a) * r * f]); } stroke(c, col, w, pts); }
  };
  const spider = (c, x, y, s, col) => {
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6; stroke(c, col, 2.2 * s, [[x, y], [x + sd * 9 * s, y + Math.sin(a) * 10 * s - 4 * s], [x + sd * 15 * s, y + Math.sin(a) * 14 * s + 4 * s]]); }
    disc(c, x, y + 4 * s, 7 * s, col); disc(c, x, y - 4 * s, 4.5 * s, col);
  };
  const egg = (c, x, y, s, col) => { c.beginPath(); c.ellipse(x, y, 7 * s, 9 * s, 0, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke(); };
  const eye = (c, x, y, s, col, pupil) => {
    c.beginPath(); c.moveTo(x - 20 * s, y); c.quadraticCurveTo(x, y - 16 * s, x + 20 * s, y); c.quadraticCurveTo(x, y + 16 * s, x - 20 * s, y); c.fillStyle = col; c.fill();
    disc(c, x, y, 7 * s, pupil); disc(c, x, y, 3 * s, INK);
  };
  const bell = (c, x, y, s, col) => {
    c.beginPath(); c.moveTo(x - 5 * s, y - 14 * s); c.quadraticCurveTo(x - 12 * s, y - 12 * s, x - 13 * s, y + 6 * s); c.lineTo(x - 17 * s, y + 10 * s); c.lineTo(x + 17 * s, y + 10 * s); c.lineTo(x + 13 * s, y + 6 * s);
    c.quadraticCurveTo(x + 12 * s, y - 12 * s, x + 5 * s, y - 14 * s); c.closePath(); c.fillStyle = col; c.fill(); disc(c, x, y + 14 * s, 3.5 * s, col);
  };
  const crown = (c, x, y, s, col) => fill(c, col, [[x - 16 * s, y + 8 * s], [x - 18 * s, y - 8 * s], [x - 8 * s, y], [x, y - 12 * s], [x + 8 * s, y], [x + 18 * s, y - 8 * s], [x + 16 * s, y + 8 * s]]);
  const skull = (c, x, y, s, col) => {
    c.beginPath(); c.arc(x, y - 3 * s, 12 * s, Math.PI * 0.85, Math.PI * 2.15); c.lineTo(x + 7 * s, y + 12 * s); c.lineTo(x - 7 * s, y + 12 * s); c.closePath(); c.fillStyle = col; c.fill();
    disc(c, x - 5 * s, y - 2 * s, 3.4 * s, INK); disc(c, x + 5 * s, y - 2 * s, 3.4 * s, INK); fill(c, INK, [[x, y + 3 * s], [x - 2 * s, y + 7 * s], [x + 2 * s, y + 7 * s]]);
  };
  const coffin = (c, x, y, s, col) => fill(c, col, [[x - 6 * s, y - 20 * s], [x + 6 * s, y - 20 * s], [x + 11 * s, y - 8 * s], [x + 7 * s, y + 20 * s], [x - 7 * s, y + 20 * s], [x - 11 * s, y - 8 * s]]);
  const motion = (c, col, lines) => { for (const l of lines) stroke(c, col, 2.5, l); };
  // the illustrated style (the newer glyphs, standing in for the painted icons): a flat fill, a dark ink outline, one
  // hard shadow tone and a small hard highlight, lit from the upper left
  const inked = (c, col, pts, w = 2.2) => { path(c, pts); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); };
  const inkDisc = (c, x, y, r, col, w = 2) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = w; c.stroke(); };
  const inkEll = (c, x, y, rx, ry, col, w = 2, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = w; c.stroke(); };
  const hi = (c, x, y, rx, ry, rot = -0.5) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill(); };
  const shadowUnder = (c, x, y, rx) => { c.beginPath(); c.ellipse(x, y, rx, rx * 0.28, 0, 0, TAU); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fill(); };
  // a meat cleaver, inked: blade (with its hard shadow and edge glint), hanging hole, wooden handle
  const inkCleaver = (c, x, y, a, s, edge) => {
    c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
    inked(c, '#8a5a2e', [[10, -3], [26, -3], [27, 3], [10, 3]], 2);
    inked(c, '#dfe4ea', [[-16, -11], [11, -11], [11, 9], [-12, 9], [-16, 5]], 2.2);
    fill(c, '#9aa4b0', [[-16, 2], [11, 2], [11, 9], [-12, 9], [-16, 5]]);
    stroke(c, edge || '#ffffff', 1.6, [[-14, 8], [10, 8]]);
    disc(c, -9, -5, 2.4, INK);
    c.restore();
  };
  const inkCloud = (c, x, y, s, col, dark) => {
    const lobes = [[-12, 3, 9], [0, -5, 12], [12, 2, 9], [-5, 7, 9], [6, 7, 9]];
    for (const [dx, dy, r] of lobes) inkDisc(c, x + dx * s, y + dy * s, r * s, col, 2.4);
    for (const [dx, dy, r] of lobes) disc(c, x + dx * s, y + dy * s, r * s - 1.2, col);
    for (const [dx, dy, r] of lobes.slice(3)) disc(c, x + dx * s, y + dy * s + 2 * s, r * s - 2.5, dark);
    hi(c, x - 4 * s, y - 9 * s, 4 * s, 2 * s);
  };
  const inkBolt = (c, col, x, y, s = 1) => { const pts = [[x + 3 * s, y - 18 * s], [x - 8 * s, y + 2 * s], [x, y + 2 * s], [x - 4 * s, y + 18 * s], [x + 9 * s, y - 3 * s], [x + 1 * s, y - 3 * s]]; inked(c, col, pts, 1.8); };
  const inkBell = (c, x, y, s, col, dark) => {
    const pts = [[x - 5 * s, y - 14 * s], [x - 11 * s, y - 10 * s], [x - 13 * s, y + 6 * s], [x - 17 * s, y + 10 * s], [x + 17 * s, y + 10 * s], [x + 13 * s, y + 6 * s], [x + 11 * s, y - 10 * s], [x + 5 * s, y - 14 * s]];
    inked(c, col, pts, 2.2);
    fill(c, dark, [[x + 4 * s, y - 12 * s], [x + 10 * s, y - 9 * s], [x + 12 * s, y + 6 * s], [x + 16 * s, y + 9 * s], [x + 6 * s, y + 9 * s]]);
    hi(c, x - 6 * s, y - 6 * s, 2 * s, 5 * s, 0.2);
    inkDisc(c, x, y + 14 * s, 3.5 * s, dark, 1.6);
  };
  const inkCrown = (c, x, y, s, col = '#e8c15a') => {
    inked(c, col, [[x - 16 * s, y + 8 * s], [x - 18 * s, y - 8 * s], [x - 8 * s, y], [x, y - 12 * s], [x + 8 * s, y], [x + 18 * s, y - 8 * s], [x + 16 * s, y + 8 * s]], 2);
    fill(c, '#a8823a', [[x - 16 * s, y + 3 * s], [x + 16 * s, y + 3 * s], [x + 16 * s, y + 8 * s], [x - 16 * s, y + 8 * s]]);
    disc(c, x, y + 1 * s, 2.4 * s, '#6dff9a');
  };
  // the party slots' own colours (FIGHT.SLOTS in fight.js; a copy so the icons draw before a fight is loaded)
  const FIGHT_SLOTS = typeof FIGHT !== 'undefined' && FIGHT.SLOTS ? FIGHT.SLOTS : ['#5fe36a', '#b26cff', '#ff6fd2', '#f2eee4'];

  // ---- the glyphs, by cast name. A = the boss's accent colour
  const G = {
    // Grubnak
    'Chop Chop': (c, A) => { cleaver(c, 26, 30, -0.5, 1, L); cleaver(c, 38, 34, 0.5, 1, A); },
    'Tenderize': (c, A) => { cleaver(c, 32, 26, -0.15, 1.3, L); motion(c, A, [[[14, 50], [50, 50]], [[20, 56], [44, 56]]]); },
    'Cleaver Toss': (c, A) => { cleaver(c, 30, 30, 0.8, 1.1, L); c.beginPath(); c.arc(32, 32, 24, -0.6, 1.4); c.strokeStyle = A; c.lineWidth = 3; c.stroke(); },
    'Simmer': (c, A) => { fill(c, L, [[12, 30], [52, 30], [48, 52], [16, 52]]); fill(c, L, [[8, 28], [56, 28], [56, 32], [8, 32]]); for (const x of [22, 32, 42]) ring(c, x, 20 - (x % 3), 4, A, 2.5); },
    'Boil Over': (c, A) => { fill(c, L, [[14, 34], [50, 34], [46, 54], [18, 54]]); for (const [x, y] of [[20, 26], [32, 18], [44, 26], [26, 12], [40, 12]]) disc(c, x, y, 5, A); },
    'Order Up!': (c, A) => { c.beginPath(); c.arc(32, 40, 16, Math.PI, 0); c.closePath(); c.fillStyle = L; c.fill(); fill(c, L, [[10, 40], [54, 40], [54, 45], [10, 45]]); disc(c, 32, 22, 3.5, L); motion(c, A, [[[14, 18], [19, 23]], [[50, 18], [45, 23]], [[32, 8], [32, 13]]]); },
    'Clogged Drains': (c, A) => { ring(c, 32, 32, 18, L, 4); for (const x of [24, 32, 40]) stroke(c, L, 3, [[x, 18], [x, 46]]); drop(c, 46, 48, 1, A); },
    'Flambé': (c, A) => { flame(c, 32, 34, 22, '#6ab0ff', '#e8f4ff'); stroke(c, L, 3, [[14, 52], [50, 52]]); },
    'Grease Fire': (c, A) => { c.beginPath(); c.ellipse(32, 46, 20, 6, 0, 0, TAU); c.fillStyle = '#5a4020'; c.fill(); flame(c, 24, 38, 16, A, '#ffe08a'); flame(c, 40, 40, 13, A, '#ffe08a'); },
    'Last Orders': (c, A) => { fill(c, L, [[18, 10], [46, 10], [46, 54], [18, 54]]); for (const y of [20, 28, 36]) stroke(c, INK, 2.5, [[23, y], [41, y]]); flame(c, 44, 50, 12, A, '#ffe08a'); },
    'Belly Flop': (c, A) => { c.beginPath(); c.ellipse(32, 38, 22, 14, 0, 0, TAU); c.fillStyle = L; c.fill(); motion(c, A, [[[20, 8], [20, 18]], [[32, 4], [32, 16]], [[44, 8], [44, 18]]]); stroke(c, A, 2.5, [[8, 56], [56, 56]]); },
    'Gut Blast': (c, A) => { disc(c, 16, 32, 9, L); fill(c, A, [[22, 28], [56, 12], [56, 52], [22, 36]]); disc(c, 16, 32, 4, INK); },
    'Larder Toss': (c, A) => { fill(c, '#a8743a', [[14, 24], [44, 24], [44, 50], [14, 50]]); stroke(c, INK, 2, [[14, 37], [44, 37]]); stroke(c, A, 3, [[46, 22], [54, 12]]); fill(c, A, [[50, 8], [58, 10], [54, 16]]); },
    'Rolling Meatballs': (c, A) => { for (const [x, y] of [[20, 40], [34, 30], [46, 42]]) { disc(c, x, y, 9, '#9a5a2e'); disc(c, x - 3, y - 3, 3, '#d89a5a'); } motion(c, A, [[[6, 22], [16, 22]], [[4, 32], [14, 32]]]); },
    'Meat Toss': (c, A) => { c.beginPath(); c.ellipse(32, 34, 18, 12, -0.3, 0, TAU); c.fillStyle = '#c0503a'; c.fill(); c.beginPath(); c.ellipse(28, 35, 6, 4, -0.3, 0, TAU); c.fillStyle = L; c.fill(); stroke(c, A, 3, [[14, 12], [22, 20]]); },
    'Mise en Place': (c, A) => { c.beginPath(); c.ellipse(32, 44, 22, 7, 0, 0, TAU); c.fillStyle = L; c.fill(); c.beginPath(); c.arc(32, 42, 15, Math.PI, 0); c.fillStyle = '#c8ced4'; c.fill(); disc(c, 32, 25, 3, A); },
    'Family Meal': (c, A) => { for (const x of [18, 46]) { c.beginPath(); c.ellipse(x, 40, 12, 5, 0, 0, TAU); c.fillStyle = L; c.fill(); } c.beginPath(); c.ellipse(32, 30, 14, 6, 0, 0, TAU); c.fillStyle = A; c.fill(); },
    'Whisk': (c, A) => { stroke(c, '#8a5a2e', 5, [[32, 56], [32, 40]]); for (const w of [6, 11, 16]) { c.beginPath(); c.ellipse(32, 24, w, 18, 0, 0, TAU); c.strokeStyle = L; c.lineWidth = 2; c.stroke(); } motion(c, A, [[[6, 14], [12, 20]], [[58, 14], [52, 20]]]); },
    'Spice Rack': (c, A) => { for (const [x, col] of [[18, '#c0503a'], [32, '#e8c15a'], [46, '#7aa04a']]) { fill(c, col, [[x - 6, 24], [x + 6, 24], [x + 6, 50], [x - 6, 50]]); fill(c, L, [[x - 7, 18], [x + 7, 18], [x + 7, 24], [x - 7, 24]]); } for (const x of [24, 40]) disc(c, x, 10, 2.5, A); },
    'Service!': (c, A) => { c.beginPath(); c.arc(32, 40, 16, Math.PI, 0); c.closePath(); c.fillStyle = L; c.fill(); fill(c, L, [[10, 40], [54, 40], [54, 45], [10, 45]]); disc(c, 32, 22, 3.5, L); fill(c, A, [[29, 6], [35, 6], [33, 16], [31, 16]]); disc(c, 32, 19, 1.5, A); },
    // four plates set down round a cleaver, the nearest with a full blue rim (a soak), the others filling less (the order)
    'Dinner Rush': (c, A) => {
      inkCleaver(c, 32, 28, -1.2, 0.8, A);
      for (const [x, y, f] of [[18, 48, 1], [47, 47, 0.66], [12, 16, 0.33], [53, 15, 0.33]]) {
        shadowUnder(c, x + 1, y + 6, 8); inkEll(c, x, y, 8, 6.5, '#f6f3ea', 1.8); c.beginPath(); c.ellipse(x, y, 5, 4, 0, 0, TAU); c.strokeStyle = '#d8d2c2'; c.lineWidth = 1.2; c.stroke();
        c.beginPath(); c.ellipse(x, y, 10.5, 9, 0, -Math.PI / 2, -Math.PI / 2 + TAU * f); c.strokeStyle = '#3d8bff'; c.lineWidth = 2.6; c.lineCap = 'round'; c.stroke();
      }
      for (let i = 0; i < 2; i++) stroke(c, 'rgba(246,242,238,0.8)', 1.8, [[15 + i * 6, 38], [13 + i * 6, 33], [16 + i * 6, 29]]);
    },
    'Flare-Up': (c, A) => { flame(c, 32, 36, 24, A, '#ffe08a'); stroke(c, L, 2.5, [[12, 54], [52, 54]]); },
    'Ladle Spin': (c, A) => { c.beginPath(); c.arc(32, 32, 22, 0.2, 5.2); c.strokeStyle = A; c.lineWidth = 3; c.stroke(); stroke(c, L, 4, [[18, 18], [36, 36]]); c.beginPath(); c.arc(40, 40, 8, 0, Math.PI); c.fillStyle = L; c.fill(); },
    'Lid Slam': (c, A) => { c.beginPath(); c.ellipse(32, 30, 22, 8, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#c8ced4'; c.fill(); disc(c, 32, 20, 4, '#c8ced4'); motion(c, A, [[[10, 48], [54, 48]], [[16, 56], [48, 56]]]); },
    'Stockpot': (c, A) => { fill(c, L, [[10, 22], [54, 22], [50, 56], [14, 56]]); fill(c, '#8a5a2e', [[6, 20], [58, 20], [58, 25], [6, 25]]); for (const x of [22, 34, 44]) ring(c, x, 14, 3.5, A, 2); },
    'Gorge': (c, A) => { c.beginPath(); c.arc(32, 34, 20, 0.35, TAU - 0.35); c.lineTo(32, 34); c.closePath(); c.fillStyle = L; c.fill(); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(32, 34, 8 + i * 6, i, i + 2); c.strokeStyle = A; c.lineWidth = 2; c.stroke(); } },
    // a chopping board, a heap of minced meat on it, the cleaver coming down into the heap
    'Mince': (c, A) => {
      shadowUnder(c, 32, 54, 24);
      inked(c, '#a8743a', [[8, 42], [56, 42], [58, 52], [6, 52]]); stroke(c, '#7a4e22', 1.2, [[12, 47], [52, 47]]);
      for (const [x, y, r] of [[22, 40, 6], [30, 37, 7], [38, 40, 6], [27, 42, 5], [35, 42, 5]]) inkDisc(c, x, y, r, '#c0503a', 1.5);
      for (const [x, y] of [[24, 37], [33, 34], [39, 38]]) disc(c, x, y, 1.6, '#f0d8c0');
      inkCleaver(c, 34, 20, -0.55, 1.15, A);
      motion(c, A, [[[50, 12], [54, 6]], [[54, 20], [60, 17]]]);
    },
    // both halves of the board hit at once: two cleavers coming down crossed, the left half lit in his colour
    'Double Chop': (c, A) => {
      inked(c, A, [[6, 44], [31, 44], [31, 56], [6, 56]]); inked(c, shade(A, -0.45), [[33, 44], [58, 44], [58, 56], [33, 56]]);
      stroke(c, '#fff2c0', 2, [[32, 40], [32, 60]]);
      inkCleaver(c, 21, 24, -0.75, 0.95, A); inkCleaver(c, 43, 24, 0.75 + Math.PI, 0.95, A);
      motion(c, '#fff2c0', [[[8, 8], [14, 14]], [[56, 8], [50, 14]]]);
    },
    // a line straight across the board: horns lowered at the near end, skid marks and dust behind, a cask splitting
    // at the far end
    "Butcher's Charge": (c, A) => {
      inked(c, 'rgba(255,154,58,0.35)', [[6, 30], [54, 30], [54, 42], [6, 42]], 1.5);
      motion(c, '#3a1e0e', [[[8, 34], [30, 34]], [[8, 39], [26, 39]]]);
      inked(c, '#9a6a36', [[46, 24], [58, 24], [58, 48], [46, 48]]); stroke(c, '#3a3a42', 2.5, [[46, 30], [58, 30]]); stroke(c, '#3a3a42', 2.5, [[46, 42], [58, 42]]);
      stroke(c, INK, 2, [[52, 22], [50, 34], [54, 40], [51, 50]]);
      for (const sd of [-1, 1]) inked(c, L, [[30, 36 + sd * 5], [42, 36 + sd * 14], [36, 36 + sd * 4]], 1.8);
      inkDisc(c, 28, 36, 9, '#9a5a2e'); hi(c, 25, 32, 3, 1.6);
      for (const [x, y] of [[10, 24], [16, 20], [12, 50]]) disc(c, x, y, 3, 'rgba(232,220,200,0.7)');
    },
    // the last orders: a brass service bell, a clock face behind it at the stroke of the hour, a flame catching
    'Last Call': (c, A) => {
      inkDisc(c, 34, 26, 20, '#efe6cf', 2.4); ring(c, 34, 26, 16, 'rgba(26,22,34,0.25)', 1.2);
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; disc(c, 34 + Math.cos(a) * 16, 26 + Math.sin(a) * 16, i % 3 ? 0.9 : 1.8, INK); }
      stroke(c, INK, 3, [[34, 26], [34, 12]]); stroke(c, INK, 2.2, [[34, 26], [35, 15]]);
      shadowUnder(c, 22, 57, 14);
      c.beginPath(); c.arc(22, 52, 12, Math.PI, 0); c.closePath(); c.fillStyle = '#d8a84a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      inked(c, '#6a4a22', [[8, 52], [36, 52], [36, 56], [8, 56]], 1.8); inkDisc(c, 22, 38, 2.6, '#5a5a62', 1.4); hi(c, 17, 46, 2.2, 3.5);
      flame(c, 52, 52, 13, A, '#ffe08a');
    },
    // Skitterra
    'Venom Mist': (c, A) => { cloud(c, 32, 30, 1.2, A); for (const x of [22, 34, 44]) drop(c, x, 50, 0.6, L); },
    'Venom Spit': (c, A) => { drop(c, 42, 24, 1.3, A); for (const [x, y, r] of [[30, 34, 3.5], [22, 42, 3], [15, 49, 2.5]]) disc(c, x, y, r, A); ring(c, 44, 46, 8, L, 2); },
    'Venom Drip': (c, A) => { for (const [x, y] of [[20, 22], [34, 30], [46, 18]]) drop(c, x, y, 1, A); for (const x of [20, 34, 46]) ring(c, x, 48, 6, L, 2); },
    'Eightfold Lunge': (c, A) => { stroke(c, L, 6, [[10, 52], [24, 18], [46, 30]]); fill(c, '#d6304a', [[44, 26], [58, 40], [46, 36]]); fill(c, '#ff7ac0', [[20, 58], [12, 42], [30, 44]]); },
    'Silk Wrap': (c, A) => { c.beginPath(); c.ellipse(32, 32, 12, 20, 0, 0, TAU); c.fillStyle = L; c.fill(); for (let i = 0; i < 6; i++) stroke(c, INK, 1.5, [[21, 16 + i * 6], [43, 20 + i * 6]]); },
    'Silk Lines': (c, A) => { disc(c, 12, 46, 6, L); disc(c, 52, 18, 6, L); stroke(c, A, 2.5, [[12, 46], [24, 28], [36, 38], [52, 18]]); },
    'Spin': (c, A) => { for (const [x, y] of [[12, 12], [52, 12], [52, 52], [12, 52]]) disc(c, x, y, 5, L); stroke(c, L, 2.5, [[12, 12], [52, 12], [52, 52], [12, 52]], true); disc(c, 18, 12, 4, A); },
    'Brood': (c, A) => { for (const [x, y] of [[24, 38], [40, 38], [32, 26], [32, 46]]) egg(c, x, y, 1, L); stroke(c, A, 2, [[26, 30], [30, 34], [27, 38]]); },
    'The Swarm': (c, A) => { spider(c, 20, 26, 0.7, L); spider(c, 44, 24, 0.7, L); spider(c, 32, 46, 0.7, A); },
    'Egg Sacs': (c, A) => { egg(c, 32, 34, 2, L); for (let i = 0; i < 3; i++) stroke(c, A, 1.5, [[18, 24 + i * 9], [46, 28 + i * 9]]); },
    'Fang Rush': (c, A) => { fill(c, L, [[24, 14], [30, 14], [27, 40]]); fill(c, L, [[34, 14], [40, 14], [37, 40]]); for (const y of [20, 32, 44]) stroke(c, A, 3, [[46, y], [58, y]]); stroke(c, A, 3, [[8, 54], [56, 54]]); },
    'Silk Reel': (c, A) => { stroke(c, L, 2.5, [[10, 10], [44, 44]]); c.beginPath(); c.arc(44, 50, 6, -Math.PI / 2, Math.PI); c.strokeStyle = A; c.lineWidth = 3.5; c.stroke(); },
    'Strand Reel': (c, A) => { fill(c, '#7a7090', [[44, 10], [56, 10], [54, 56], [46, 56]]); stroke(c, L, 2.5, [[8, 34], [44, 30]]); spider(c, 16, 38, 0.55, A); },
    'Spinneret Volley': (c, A) => { for (const [x, y] of [[18, 22], [34, 14], [46, 30]]) { stroke(c, L, 1.5, [[x, 0], [x, y - 8]]); disc(c, x, y, 7, L); } for (const x of [18, 34, 46]) ring(c, x, 52, 5, A, 2); },
    'Acid Deluge': (c, A) => { for (const [x, y] of [[14, 14], [30, 10], [46, 16], [22, 32], [40, 30], [54, 38], [12, 44], [32, 48]]) { stroke(c, A, 2, [[x + 4, y - 9], [x, y]]); disc(c, x, y + 1, 3, A); } },
    'Strand': (c, A) => { stroke(c, L, 2.5, [[8, 34], [56, 30]]); },
    // a field of overlapping snares with three holes left clear, and a clutch hanging at the side
    'Snare Weave': (c, A) => {
      for (const [x, y] of [[14, 14], [32, 11], [50, 14], [11, 32], [53, 32], [21, 51], [43, 52], [32, 34]]) {
        ring(c, x, y, 10, INK, 4); ring(c, x, y, 10, L, 2);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + x; stroke(c, 'rgba(242,230,200,0.45)', 1, [[x - Math.cos(a) * 9, y - Math.sin(a) * 9], [x + Math.cos(a) * 9, y + Math.sin(a) * 9]]); }
      }
      for (const [x, y] of [[23, 23], [41, 23], [32, 50]]) { disc(c, x, y, 6.5, '#1a2440'); ring(c, x, y, 6.5, INK, 1.5); }
      stroke(c, L, 1.2, [[57, 2], [57, 16]]); egg(c, 57, 21, 0.6, '#efeedc'); hi(c, 55, 18, 1.5, 2.5);
    },
    'Ceiling Ambush': (c, A) => { stroke(c, L, 1.5, [[32, 0], [32, 20]]); spider(c, 32, 30, 0.9, L); c.beginPath(); c.ellipse(32, 54, 16, 4, 0, 0, TAU); c.fillStyle = A; c.fill(); },
    'Into the Dark': (c, A) => { disc(c, 32, 32, 22, '#05040a'); spider(c, 32, 28, 0.7, '#3a3448'); disc(c, 27, 24, 2, A); disc(c, 37, 24, 2, A); },
    'From the Dark': (c, A) => { stroke(c, L, 1.5, [[32, 0], [32, 22]]); spider(c, 32, 32, 0.9, '#5a4a6a'); ring(c, 32, 52, 10, L, 2.5); },
    'Molt': (c, A) => { spider(c, 32, 32, 1.1, 'rgba(242,230,200,0.35)'); stroke(c, L, 2, [[22, 20], [28, 30], [24, 40], [30, 50]]); },
    'Tightening Web': (c, A) => { web(c, 32, 32, 24, L, 1.8); ring(c, 32, 32, 24, A, 3); },
    'The Web Gives Way': (c, A) => { ring(c, 32, 32, 24, '#ff4ab0', 4); web(c, 32, 32, 14, L, 1.6); stroke(c, '#ff4ab0', 2, [[48, 16], [54, 10]]); stroke(c, '#ff4ab0', 2, [[12, 48], [8, 56]]); },
    // a silk cocoon hanging in the web, wound tight in bands, her glow showing through a seam, strands pulling round it
    'Chrysalis': (c, A) => {
      web(c, 32, 30, 28, 'rgba(242,230,200,0.22)', 1);
      stroke(c, L, 1.6, [[32, 0], [32, 9]]);
      inkEll(c, 32, 34, 14, 22, '#efeedc', 2.4);
      c.save(); c.beginPath(); c.ellipse(32, 34, 13, 21, 0, 0, TAU); c.clip();
      fill(c, '#c8c2b0', [[38, 10], [48, 20], [48, 58], [36, 58]]);
      for (let i = 0; i < 6; i++) stroke(c, 'rgba(26,22,34,0.55)', 1.4, [[17, 17 + i * 7], [32, 21 + i * 7], [47, 16 + i * 7]]);
      stroke(c, '#ff7ac0', 2.2, [[30, 24], [33, 32], [30, 40], [33, 46]]);
      c.restore();
      hi(c, 25, 24, 2.5, 6, 0.1);
      for (const sd of [-1, 1]) stroke(c, A, 1.6, [[32 + sd * 13, 30], [32 + sd * 26, 22]]);
    },
    'Devour': (c, A) => { c.beginPath(); c.arc(32, 30, 22, 0, Math.PI); c.closePath(); c.fillStyle = '#2a1424'; c.fill(); for (const sd of [-1, 1]) fill(c, '#ff7ac0', [[32 + sd * 14, 26], [32 + sd * 6, 26], [32 + sd * 9, 50]]); for (const x of [20, 44]) drop(c, x, 54, 0.5, A); },
    // Volkar
    'Thunderclap': (c, A) => { cloud(c, 32, 22, 1.1, '#5a6a84'); bolt(c, A, 32, 42, 0.9); },
    'Distant Thunder': (c, A) => { cloud(c, 32, 30, 1, '#4a5874'); bolt(c, 'rgba(127,232,255,0.5)', 44, 42, 0.5); },
    'Titan Fist': (c, A) => { fill(c, '#8a9ab0', [[14, 22], [42, 20], [50, 26], [50, 44], [16, 46]]); for (const y of [27, 33, 39]) stroke(c, INK, 2, [[38, y], [50, y]]); bolt(c, A, 54, 14, 0.4); bolt(c, A, 10, 52, 0.4); },
    'Thunder Crash': (c, A) => { cloud(c, 32, 14, 0.9, '#5a6a84'); stroke(c, '#ffe27a', 3, [[32, 22], [30, 32], [22, 46]]); stroke(c, '#ffe27a', 3, [[30, 32], [40, 46]]); disc(c, 22, 50, 4, L); disc(c, 40, 50, 4, L); },
    'Static Field': (c, A) => { ring(c, 32, 32, 18, '#d79bff', 3); bolt(c, '#d79bff', 32, 32, 0.6); },
    'Polarity Surge': (c, A) => { disc(c, 20, 32, 12, '#ffc24a'); disc(c, 44, 32, 12, '#4ad8ff'); stroke(c, INK, 3, [[14, 32], [26, 32]]); stroke(c, INK, 3, [[20, 26], [20, 38]]); stroke(c, INK, 3, [[38, 32], [50, 32]]); },
    'Lightning Rods': (c, A) => { stroke(c, L, 4, [[32, 56], [32, 16]]); fill(c, L, [[26, 18], [32, 6], [38, 18]]); bolt(c, A, 46, 22, 0.5); ring(c, 32, 56, 10, A, 2); },
    // a rod held point-down over a hand, sparks on its tip
    'Grounding Rods': (c, A) => {
      for (const dx of [-6, 0, 6]) inked(c, '#8a939e', [[32 + dx - 2.5, 12], [32 + dx, 3 - (dx ? 0 : 3)], [32 + dx + 2.5, 12]], 1.4);
      inked(c, '#6a7480', [[22, 11], [42, 11], [42, 16], [22, 16]], 1.8);
      inked(c, '#5a626e', [[29, 16], [35, 16], [35, 44], [29, 44]], 2);
      stroke(c, 'rgba(220,230,240,0.55)', 1.4, [[30.5, 18], [30.5, 42]]);
      inked(c, '#8a939e', [[27, 43], [37, 43], [32, 56]], 2);
      c.beginPath(); c.ellipse(32, 58, 12, 3.5, 0, 0, TAU); c.fillStyle = 'rgba(127,232,255,0.5)'; c.fill();
      inkBolt(c, A, 46, 28, 0.42); inkBolt(c, A, 18, 34, 0.34);
      for (const [x, y] of [[40, 50], [24, 52], [44, 56]]) stroke(c, '#dffbff', 1.6, [[x, y], [x + 3, y - 4]]);
    },
    // a squall front marching across in three bands, broken by a rod with a clear lane behind it
    'Supercell': (c, A) => {
      for (const x of [12, 25, 38]) {
        inked(c, '#3a4a64', [[x - 5, 6], [x + 5, 6], [x + 5, 58], [x - 5, 58]], 1.8);
        for (let y = 10; y < 56; y += 9) stroke(c, 'rgba(188,214,238,0.6)', 1, [[x - 2, y], [x - 4, y + 5]]);
      }
      inked(c, '#1a2440', [[20, 28], [58, 28], [58, 36], [20, 36]], 1.4);
      inked(c, '#5a626e', [[14, 14], [18, 14], [18, 34], [14, 34]], 1.6); inked(c, '#8a939e', [[12, 33], [20, 33], [16, 41]], 1.6);
      inkBolt(c, A, 50, 16, 0.42); inkBolt(c, '#ffffff', 30, 48, 0.3);
    },
    'Still Air': (c, A) => { fill(c, '#ffd84a', [[10, 18], [26, 18], [24, 52], [12, 52]]); fill(c, '#6ab8ff', [[38, 18], [54, 18], [52, 52], [40, 52]]); stroke(c, INK, 3, [[18, 28], [18, 40]]); stroke(c, INK, 3, [[12, 34], [24, 34]]); stroke(c, INK, 3, [[40, 34], [52, 34]]); },
    'Rod Strike': (c, A) => { fill(c, '#8a9ab0', [[22, 22], [42, 22], [40, 56], [24, 56]]); bolt(c, A, 32, 14, 0.7); },
    'Gale Slam': (c, A) => { for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(32, 32, 8 + i * 8, -2.4 + i * 0.4, 0.4 + i * 0.4); c.strokeStyle = i ? L : A; c.lineWidth = 3; c.stroke(); } },
    'Storm Walls': (c, A) => { ring(c, 32, 32, 22, '#5a6a84', 2); fill(c, A, [[30, 32], [34, 32], [34, 8], [30, 8]]); fill(c, A, [[30, 32], [34, 32], [34, 56], [30, 56]]); c.beginPath(); c.arc(32, 32, 26, -1.2, -0.5); c.strokeStyle = L; c.lineWidth = 2.5; c.stroke(); },
    'Squall Line': (c, A) => { disc(c, 32, 32, 26, '#2a3448'); disc(c, 32, 32, 13, '#4a5a70'); ring(c, 32, 32, 13, A, 3); bolt(c, A, 14, 14, 0.35); bolt(c, A, 50, 48, 0.35); },
    'Eye of the Storm': (c, A) => { for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(32, 32, 10 + i * 7, i * 2, i * 2 + 4); c.strokeStyle = '#8a9ab0'; c.lineWidth = 3; c.stroke(); } disc(c, 32, 32, 6, L); },
    'Eye Closes': (c, A) => { for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(32, 32, 8 + i * 6, i * 2, i * 2 + 5); c.strokeStyle = '#5a6a84'; c.lineWidth = 4; c.stroke(); } bolt(c, A, 32, 32, 0.35); },
    'Avalanche': (c, A) => { for (const [x, y, r] of [[18, 40, 10], [36, 36, 13], [50, 46, 7]]) { disc(c, x, y, r, '#8a8478'); disc(c, x - r * 0.3, y - r * 0.3, r * 0.3, '#b8b0a0'); } motion(c, A, [[[6, 20], [20, 20]], [[10, 12], [26, 12]]]); },
    'Chain Lightning': (c, A) => { for (const [x, y] of [[10, 44], [28, 20], [42, 46], [56, 22]]) disc(c, x, y, 4, L); stroke(c, A, 2.5, [[10, 44], [18, 30], [28, 20], [34, 34], [42, 46], [50, 32], [56, 22]]); },
    'Ball Lightning': (c, A) => { disc(c, 32, 32, 16, 'rgba(127,232,255,0.35)'); disc(c, 32, 32, 9, A); disc(c, 32, 32, 4, '#ffffff'); for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; stroke(c, L, 2, [[32 + Math.cos(a) * 16, 32 + Math.sin(a) * 16], [32 + Math.cos(a + 0.3) * 24, 32 + Math.sin(a + 0.3) * 24]]); } },
    'Skyfall': (c, A) => { fill(c, 'rgba(223,244,255,0.85)', [[24, 0], [40, 0], [44, 48], [20, 48]]); c.beginPath(); c.ellipse(32, 50, 20, 6, 0, 0, TAU); c.strokeStyle = A; c.lineWidth = 3; c.stroke(); },
    'Heavens Fall': (c, A) => { fill(c, 'rgba(223,244,255,0.85)', [[22, 0], [42, 0], [42, 40], [22, 40]]); for (const x of [18, 28, 36, 46]) disc(c, x, 50, 4, L); ring(c, 32, 50, 16, '#3d8bff', 2.5); },
    'Skybreak': (c, A) => { cloud(c, 32, 20, 1.1, '#3a4660'); stroke(c, '#ffffff', 3, [[14, 18], [26, 24], [34, 16], [48, 22]]); bolt(c, A, 26, 44, 0.7); bolt(c, A, 44, 46, 0.55); },
    // a low storm cloud, three bolts already crackling out of its underside, sparks at their feet
    'Gathering Storm': (c, A) => {
      for (const [x, y] of [[18, 46], [32, 50], [46, 46]]) { inkBolt(c, A, x, y - 4, 0.48); for (const d of [-5, 5]) stroke(c, '#dffbff', 1.4, [[x + d * 0.6, y + 12], [x + d, y + 8]]); }
      inkCloud(c, 32, 20, 1.15, '#5a6a84', '#3a4660');
    },
    // one great anvil cloud, a single thick white bolt splitting it to the ground
    'Thunderhead': (c, A) => {
      inked(c, '#3a4660', [[6, 14], [58, 14], [52, 22], [12, 22]], 2.2); fill(c, '#2a3448', [[8, 18], [56, 18], [52, 22], [12, 22]]);
      inkCloud(c, 32, 26, 1.1, '#4a5874', '#2e3850');
      inkBolt(c, '#ffffff', 32, 46, 0.95); stroke(c, A, 1.6, [[34, 30], [26, 46], [33, 46], [29, 62]]);
      c.beginPath(); c.ellipse(32, 61, 12, 3, 0, 0, TAU); c.fillStyle = 'rgba(223,251,255,0.55)'; c.fill();
    },
    // the Hollow King
    'Sceptre Sweep': (c, A) => { c.beginPath(); c.moveTo(14, 50); c.arc(14, 50, 40, -1.4, -0.1); c.closePath(); c.fillStyle = 'rgba(232,193,90,0.55)'; c.fill(); stroke(c, '#e8c15a', 4, [[14, 50], [40, 18]]); disc(c, 40, 18, 5, '#e8c15a'); },
    'Barrow Stomp': (c, A) => { ring(c, 32, 40, 18, '#4fe0d0', 3); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; stroke(c, '#4fe0d0', 2, [[32, 40], [32 + Math.cos(a) * 16, 40 + Math.sin(a) * 12]]); } fill(c, L, [[24, 6], [40, 6], [40, 24], [46, 28], [24, 28]]); },
    'Crown of Graves': (c, A) => { crown(c, 32, 20, 0.8, '#e8c15a'); for (const x of [12, 24, 40, 52]) { stroke(c, '#d0b0ff', 3, [[x, 58], [x, 42]]); for (const f of [-3, 0, 3]) stroke(c, '#d0b0ff', 1.6, [[x, 42], [x + f, 36]]); } },
    'Barrow Knell': (c, A) => { bell(c, 32, 26, 1.1, L); for (const r of [24, 30]) { c.beginPath(); c.ellipse(32, 46, r, r * 0.3, 0, 0.2, Math.PI - 0.2); c.strokeStyle = A; c.lineWidth = 2; c.stroke(); } },
    'Barrow Bells': (c, A) => { bell(c, 22, 28, 0.75, '#c89a4a'); bell(c, 42, 30, 0.75, '#c89a4a'); disc(c, 22, 52, 3, L); disc(c, 42, 52, 3, L); },
    'Royal Gaze': (c, A) => eye(c, 32, 32, 1.2, L, A),
    'Royal Audience': (c, A) => { crown(c, 32, 30, 1.3, '#e8c15a'); for (const x of [18, 32, 46]) disc(c, x, 34, 2.5, A); },
    'Grave Cleave': (c, A) => { sword(c, 30, 30, 0.6, 26, L); fill(c, '#b46aff', [[40, 44], [56, 56], [44, 58]]); },
    'Royal Doom': (c, A) => { ring(c, 32, 32, 24, '#b46aff', 3); skull(c, 32, 32, 1, '#efe2ff'); },
    'Grave Marks': (c, A) => { ring(c, 32, 32, 18, A, 3); for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.78; stroke(c, L, 3, [[32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6], [32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14]]); } },
    // four graves round a crown, each rim in a party colour
    'Burial Rites': (c, A) => {
      inkCrown(c, 32, 34, 0.6);
      for (const [x, y, col] of [[32, 12, FIGHT_SLOTS[0]], [32, 54, FIGHT_SLOTS[1]], [10, 33, FIGHT_SLOTS[2]], [54, 33, FIGHT_SLOTS[3]]]) {
        for (const sd of [-1, 1]) disc(c, x + sd * 8, y + 3, 3, '#3a3026');
        inked(c, '#060807', [[x - 6, y - 2], [x + 6, y - 2], [x + 6, y + 7], [x - 6, y + 7]], 1.4);
        stroke(c, col, 2.2, [[x - 6, y - 2], [x + 6, y - 2], [x + 6, y + 7], [x - 6, y + 7]], true);
        inked(c, '#6a7276', [[x - 4, y - 2], [x - 4, y - 8], [x, y - 10], [x + 4, y - 8], [x + 4, y - 2]], 1.4);
      }
    },
    // a sealed writ, three chains out from it and a fourth hanging broken
    'Writ of Execution': (c, A) => {
      const chain = (a, d0, d1) => { for (let d = d0; d < d1; d += 5) { const x = 32 + Math.cos(a) * d, y = 32 + Math.sin(a) * d; c.beginPath(); c.ellipse(x, y, 3, (d / 5) % 2 < 1 ? 1.6 : 2.6, a, 0, TAU); c.strokeStyle = '#8a939e'; c.lineWidth = 1.6; c.stroke(); } };
      for (const a of [-2.4, -0.7, 0.9]) chain(a, 10, 30);
      chain(2.4, 10, 17); chain(2.6, 22, 29);
      inked(c, '#efe2c4', [[20, 20], [44, 20], [44, 42], [20, 42]], 2); fill(c, '#d8c8a4', [[36, 20], [44, 20], [44, 42], [36, 42]]);
      inked(c, '#c8b48a', [[18, 18], [46, 18], [46, 22], [18, 22]], 1.6); inked(c, '#c8b48a', [[18, 40], [46, 40], [46, 44], [18, 44]], 1.6);
      for (const y of [26, 30]) stroke(c, 'rgba(26,22,34,0.6)', 1.4, [[23, y], [37, y]]);
      inkDisc(c, 32, 36, 5, '#b8322a', 1.6); hi(c, 30, 34, 1.4, 1);
    },
    'Gravebind': (c, A) => { for (const x of [22, 42]) { c.beginPath(); c.ellipse(x, 32, 10, 7, 0, 0, TAU); c.strokeStyle = L; c.lineWidth = 4; c.stroke(); } stroke(c, '#ff5a4a', 2, [[30, 32], [34, 32]]); },
    'Funeral March': (c, A) => { for (const x of [16, 30, 44]) { stroke(c, L, 2.5, [[x, 54], [x + 10, 12]]); fill(c, L, [[x + 8, 14], [x + 13, 6], [x + 13, 16]]); } motion(c, A, [[[6, 58], [56, 58]]]); },
    'Lights Out': (c, A) => { fill(c, '#3a3f43', [[20, 40], [44, 40], [38, 56], [26, 56]]); for (const [x, y] of [[28, 30], [34, 22], [30, 12]]) disc(c, x, y, 5, '#24282b'); },
    'Coffin Lids': (c, A) => { c.save(); c.translate(32, 32); c.rotate(0.6); coffin(c, 0, 0, 0.9, '#7a8488'); c.restore(); motion(c, A, [[[6, 50], [18, 46]], [[8, 58], [20, 54]]]); },
    'Royal Decree': (c, A) => { fill(c, L, [[14, 10], [50, 10], [50, 44], [14, 44]]); for (const y of [18, 24, 30]) stroke(c, INK, 2, [[20, y], [44, y]]); c.beginPath(); c.moveTo(6, 52); for (let x = 6; x <= 58; x += 4) c.lineTo(x, 52 + Math.sin(x / 4) * 3); c.strokeStyle = A; c.lineWidth = 3; c.stroke(); },
    'Falling Masonry': (c, A) => { fill(c, '#7a8084', [[20, 10], [40, 6], [46, 22], [30, 30], [16, 24]]); c.beginPath(); c.ellipse(32, 52, 14, 4, 0, 0, TAU); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fill(); motion(c, L, [[[24, 34], [24, 42]], [[36, 34], [36, 42]]]); },
    'Court of Bones': (c, A) => { coffin(c, 32, 32, 1, '#5a6266'); skull(c, 32, 22, 0.6, L); },
    'Echo Knights': (c, A) => { fill(c, 'rgba(159,208,255,0.85)', [[22, 50], [22, 20], [32, 10], [42, 20], [42, 50]]); stroke(c, INK, 3, [[26, 26], [38, 26]]); },
    'The King Rises': (c, A) => { crown(c, 32, 26, 1.2, '#e8c15a'); fill(c, A, [[26, 56], [26, 40], [32, 34], [38, 40], [38, 56]]); },
    'The Charge Sheet': (c, A) => { fill(c, L, [[16, 8], [48, 8], [48, 56], [16, 56]]); for (const y of [18, 30, 42]) { disc(c, 22, y, 2.5, A); stroke(c, INK, 2, [[28, y], [42, y]]); } },
    'Judgement': (c, A) => { stroke(c, L, 3, [[32, 10], [32, 52]]); stroke(c, L, 3, [[14, 18], [50, 18]]); for (const x of [14, 50]) { c.beginPath(); c.arc(x, 30, 8, 0, Math.PI); c.fillStyle = A; c.fill(); } stroke(c, L, 3, [[22, 54], [42, 54]]); },
    'The Long Night': (c, A) => { disc(c, 32, 32, 26, '#05060c'); fill(c, '#c89a4a', [[26, 24], [38, 24], [40, 44], [24, 44]]); disc(c, 32, 34, 5, '#ffe2a0'); stroke(c, '#c89a4a', 2, [[32, 24], [32, 16]]); },
    // a tarnished offering bowl under a floating crown, life-light pouring up out of the bowl into it
    'Royal Tithe': (c, A) => {
      const g = c.createLinearGradient(0, 22, 0, 44); g.addColorStop(0, rgba(A, 0.15)); g.addColorStop(1, rgba(A, 0.7));
      c.fillStyle = g; c.beginPath(); c.moveTo(24, 42); c.quadraticCurveTo(28, 30, 26, 22); c.lineTo(38, 22); c.quadraticCurveTo(36, 30, 40, 42); c.closePath(); c.fill();
      for (const [x, y] of [[28, 30], [35, 26], [32, 36]]) disc(c, x, y, 1.6, '#eafff0');
      inkCrown(c, 32, 14, 0.8);
      shadowUnder(c, 32, 57, 16);
      inked(c, '#b89a4a', [[14, 42], [50, 42], [44, 52], [20, 52]], 2.2); fill(c, '#8a6a2a', [[38, 42], [50, 42], [44, 52], [36, 52]]);
      inkEll(c, 32, 42, 18, 3.5, '#5a4a20', 1.8); inked(c, '#8a6a2a', [[26, 52], [38, 52], [40, 56], [24, 56]], 1.6);
    },
    // an old iron funeral bell, still, wide slow rings of sound spreading out under it
    'Dirge': (c, A) => {
      stroke(c, '#4a3b22', 3, [[32, 2], [32, 10]]);
      inkBell(c, 32, 24, 1, '#7a8488', '#4a5256');
      for (const [r, a] of [[20, 0.9], [27, 0.6], [34, 0.35]]) { c.beginPath(); c.ellipse(32, 44, r, r * 0.32, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.strokeStyle = rgba(A, a); c.lineWidth = 2.5; c.stroke(); }
    },
    'Moonset': (c, A) => { disc(c, 32, 34, 18, '#cfe2ff'); disc(c, 40, 28, 15, '#0e1218'); fill(c, '#0e1218', [[0, 44], [64, 44], [64, 64], [0, 64]]); stroke(c, A, 3, [[6, 44], [58, 44]]); },
    'Doom Pass': (c, A) => { skull(c, 22, 32, 0.6, '#efe2ff'); stroke(c, L, 2.5, [[34, 32], [52, 32]]); fill(c, L, [[50, 26], [58, 32], [50, 38]]); },
    // Vhalgrath (drawn badges; painted icons come later)
    // a dragon's head thrown back, jaws wide, rings of sound rolling out
    "Tyrant's Roar": (c, A) => {
      for (const r of [14, 21, 28]) { c.beginPath(); c.arc(40, 24, r, -0.5, 0.9); c.strokeStyle = rgba(A, 0.75 - r / 50); c.lineWidth = 2.5; c.stroke(); }
      inked(c, '#4a2a22', [[8, 40], [20, 26], [34, 20], [40, 24], [30, 30], [22, 36]], 2);
      inked(c, '#6b3a2c', [[8, 42], [22, 40], [34, 38], [26, 46], [14, 48]], 2);
      for (const x of [20, 25, 30]) fill(c, L, [[x, 28 + (x - 20) * -0.5], [x + 2, 33], [x - 2, 33]]);
      disc(c, 30, 24, 2.2, A); inked(c, L, [[10, 26], [4, 14], [16, 22]], 1.6);
    },
    // three claw marks raked down across a dark ground, the middle one deepest
    'Rending Claws': (c, A) => {
      for (const [x, d] of [[18, 0], [32, 4], [46, 0]]) { inked(c, '#efe2c4', [[x - 3, 8 + d], [x + 3, 8 + d], [x + 8, 56], [x - 4, 52]], 2); stroke(c, A, 2, [[x, 14 + d], [x + 2, 48]]); }
      motion(c, A, [[[6, 12], [12, 20]], [[54, 12], [50, 20]]]);
    },
    // a cone of flame, a dragon's snout at its tip, embers drifting off
    'Ember Breath': (c, A) => {
      fill(c, rgba(A, 0.5), [[8, 32], [58, 12], [58, 52]]); fill(c, rgba('#ffd27a', 0.8), [[10, 32], [46, 22], [46, 42]]); fill(c, '#fff4c8', [[10, 32], [30, 28], [30, 36]]);
      inked(c, '#4a2a22', [[2, 26], [14, 26], [16, 32], [14, 38], [2, 38]], 2); disc(c, 9, 30, 1.8, A);
      for (const [x, y] of [[50, 18], [54, 34], [44, 48], [56, 44]]) disc(c, x, y, 2, '#ffe0a0');
    },
    // a spined tail swinging round in a wide arc behind
    'Tail Lash': (c, A) => {
      c.beginPath(); c.arc(32, 36, 22, 3.6, 6.1); c.strokeStyle = A; c.lineWidth = 12; c.lineCap = 'round'; c.stroke();
      c.beginPath(); c.arc(32, 36, 22, 3.6, 6.1); c.strokeStyle = '#4a2a22'; c.lineWidth = 8; c.stroke();
      for (let i = 0; i < 6; i++) { const a = 3.8 + i * 0.4; fill(c, '#efe2c4', [[32 + Math.cos(a) * 27, 36 + Math.sin(a) * 27], [32 + Math.cos(a) * 33, 36 + Math.sin(a) * 33], [32 + Math.cos(a + 0.12) * 27, 36 + Math.sin(a + 0.12) * 27]]); }
      inked(c, '#efe2c4', [[53, 28], [60, 36], [53, 38]], 1.8);
    },
    // three bursts of lava, each a ring with a bright core
    'Magma Burst': (c, A) => {
      for (const [x, y] of [[18, 22], [44, 18], [32, 44]]) { ring(c, x, y, 11, A, 2.6); disc(c, x, y, 7, '#ffb04a'); disc(c, x, y, 3.5, '#fff4c8'); for (let i = 0; i < 6; i++) { const a = i * 1.05; stroke(c, A, 1.6, [[x + Math.cos(a) * 11, y + Math.sin(a) * 11], [x + Math.cos(a) * 16, y + Math.sin(a) * 16]]); } }
    },
    // a ring of embers round a bowl of coals, the whole table gathered at it
    'Cinder Feast': (c, A) => {
      shadowUnder(c, 32, 50, 22);
      inked(c, '#3a2a22', [[14, 34], [50, 34], [44, 50], [20, 50]], 2.2); inkEll(c, 32, 34, 18, 5, '#2a1812', 1.8);
      flame(c, 32, 30, 15, A, '#ffe08a'); flame(c, 24, 32, 9, '#ff6a1a', '#ffd27a'); flame(c, 40, 32, 9, '#ff6a1a', '#ffd27a');
      ring(c, 32, 40, 26, '#3d8bff', 2);
    },
    // wings spread above a ground line, a gust under them
    'Take Flight': (c, A) => {
      for (const sd of [-1, 1]) inked(c, '#7a2f1a', [[32, 22], [32 + sd * 28, 8], [32 + sd * 26, 22], [32 + sd * 20, 24], [32 + sd * 14, 32], [32 + sd * 6, 28]], 2);
      inked(c, '#4a2a22', [[26, 20], [38, 20], [36, 36], [28, 36]], 2); disc(c, 32, 17, 3.5, '#6b3a2c');
      motion(c, L, [[[16, 46], [26, 52]], [[48, 46], [38, 52]], [[28, 56], [36, 56]]]);
    },
    // a line of embers down from the top edge to a ring on a scorched pit
    'Dragonfall': (c, A) => {
      stroke(c, rgba(A, 0.55), 10, [[16, 2], [32, 36]]); stroke(c, '#ffd27a', 2.5, [[16, 2], [32, 36]]);
      for (const [x, y] of [[20, 10], [25, 20], [29, 28]]) disc(c, x, y, 2.4, '#fff4c8');
      c.beginPath(); c.ellipse(34, 46, 22, 9, 0, 0, TAU); c.fillStyle = '#100806'; c.fill(); c.strokeStyle = A; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.ellipse(34, 46, 12, 4.5, 0, 0, TAU); c.fillStyle = '#ff8a2a'; c.fill();
    },
    // two lines crossing, the second ending in a ring
    'Twin Pass': (c, A) => {
      stroke(c, rgba(A, 0.45), 8, [[4, 10], [60, 30]]); stroke(c, '#ffd27a', 2, [[4, 10], [60, 30]]);
      stroke(c, rgba(A, 0.7), 8, [[58, 6], [24, 46]]); stroke(c, '#fff4c8', 2, [[58, 6], [24, 46]]);
      ring(c, 22, 48, 9, A, 3); disc(c, 22, 48, 4, '#ffb04a');
    },
    // a high rim, a dragon's wing over it, burning scales falling
    'The Roost': (c, A) => {
      inked(c, '#3a2a26', [[0, 20], [64, 20], [64, 28], [0, 28]], 2);
      inked(c, '#7a2f1a', [[6, 22], [22, 4], [44, 10], [58, 22], [44, 18], [30, 20], [18, 18]], 2);
      for (const [x, y, r] of [[18, 40, 5], [34, 48, 6], [48, 38, 5]]) { flame(c, x, y, r + 5, A, '#ffe08a'); }
    },
    // the rim of a crater glowing, lava creeping in
    'Crater Boils': (c, A) => {
      disc(c, 32, 34, 26, '#ff7a22'); disc(c, 32, 34, 18, '#1c1210'); ring(c, 32, 34, 26, '#ffd27a', 2);
      for (const [x, y] of [[14, 22], [50, 24], [44, 50], [18, 48]]) { disc(c, x, y, 3.2, '#ffd27a'); }
      for (const [x, y] of [[26, 30], [38, 38], [30, 42]]) disc(c, x, y, 1.8, A);
    },
    // two cones of fire, the second behind the first
    'Twin Breath': (c, A) => {
      fill(c, rgba(A, 0.45), [[6, 18], [58, 4], [58, 34]]); fill(c, rgba('#ffd27a', 0.8), [[8, 18], [44, 14], [44, 24]]);
      fill(c, rgba(A, 0.7), [[6, 46], [58, 34], [58, 62]]); fill(c, rgba('#fff4c8', 0.85), [[8, 46], [44, 42], [44, 52]]);
      inked(c, '#4a2a22', [[0, 12], [10, 12], [12, 18], [10, 24], [0, 24]], 1.8); inked(c, '#4a2a22', [[0, 40], [10, 40], [12, 46], [10, 52], [0, 52]], 1.8);
    },
    // a glowing heart in the middle of three scorch marks
    'Heart Burn': (c, A) => {
      for (const [x, y] of [[32, 54], [12, 20], [52, 20]]) { disc(c, x, y, 8, '#100806'); ring(c, x, y, 8, A, 2); }
      c.beginPath(); c.moveTo(32, 46); c.bezierCurveTo(10, 32, 16, 14, 32, 24); c.bezierCurveTo(48, 14, 54, 32, 32, 46); c.fillStyle = '#ff5a1a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      glow(c, 32, 32, 14, '#ffd27a', 0.7); hi(c, 25, 28, 3, 4.5, 0.3);
    },
    // two gusts pushing away from a line
    'Wingbeat': (c, A) => {
      stroke(c, A, 3, [[32, 4], [32, 60]]);
      for (const sd of [-1, 1]) for (const y of [16, 32, 48]) { stroke(c, L, 2.5, [[32 + sd * 6, y], [32 + sd * 24, y]]); fill(c, L, [[32 + sd * 24, y - 5], [32 + sd * 31, y], [32 + sd * 24, y + 5]]); }
    },
    // embers falling, each landing in a small ring
    'Cinder Rain': (c, A) => {
      for (const [x, y] of [[14, 30], [32, 22], [50, 34], [22, 52], [42, 56]]) { stroke(c, rgba(A, 0.7), 2.5, [[x + 3, y - 18], [x, y]]); disc(c, x, y, 3.4, '#ffd27a'); ring(c, x, y + 4, 7, A, 1.8); }
    },
    // a ring, shared, and small marks outside it
    'Heart Flare': (c, A) => {
      c.beginPath(); c.moveTo(32, 36); c.bezierCurveTo(18, 28, 22, 16, 32, 22); c.bezierCurveTo(42, 16, 46, 28, 32, 36); c.fillStyle = '#ff5a1a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
      ring(c, 32, 28, 12, '#3d8bff', 2.5);
      for (const [x, y] of [[10, 12], [54, 12], [10, 52], [54, 52]]) { ring(c, x, y, 6, A, 2); disc(c, x, y, 2.2, '#ffd27a'); }
    },
    'Ashfall': (c, A) => {
      cloud(c, 32, 20, 1.2, '#3a3238');
      for (const [x, y] of [[16, 40], [28, 48], [40, 42], [50, 52], [22, 56]]) disc(c, x, y, 2.4, '#d8d0c4');
      for (const [x, y] of [[34, 38], [46, 46], [14, 50]]) disc(c, x, y, 2, A);
    },
  };
  // Hrimgar (drawn badges; painted icons come later: docs/art/icon-prompts.md)
  Object.assign(G, {
    // a giant's bearded head thrown back, rings of cold rolling out
    "Winter's Howl": (c, A) => {
      for (const r of [14, 21, 28]) { c.beginPath(); c.arc(38, 24, r, -0.6, 0.9); c.strokeStyle = rgba(A, 0.8 - r / 45); c.lineWidth = 2.5; c.stroke(); }
      inked(c, '#8a9db3', [[6, 44], [10, 28], [24, 20], [34, 22], [30, 32], [24, 44]], 2);
      for (const x of [12, 17, 22, 27]) fill(c, '#eaf6ff', [[x, 40], [x + 3, 40], [x + 1.5, 52]]);
      inked(c, '#cfeaff', [[10, 24], [4, 12], [16, 20]], 1.6); disc(c, 26, 28, 2, A);
    },
    // a great pale fist coming down on a cone of dark ground
    'Glacial Fist': (c, A) => {
      fill(c, rgba(A, 0.35), [[32, 26], [8, 62], [56, 62]]);
      inked(c, '#9fb6c9', [[20, 4], [44, 4], [48, 24], [40, 34], [24, 34], [16, 24]], 2.2);
      for (const x of [22, 29, 36]) stroke(c, '#55657a', 1.8, [[x, 24], [x + 2, 33]]);
      fill(c, '#cfeaff', [[16, 24], [12, 34], [22, 30]]); hi(c, 28, 12, 5, 3, 0.1);
    },
    // a ring on the ice, a crack starting in the middle
    'Rime Slam': (c, A) => {
      ring(c, 32, 34, 22, A, 3); disc(c, 32, 34, 18, rgba('#cfeaff', 0.25));
      stroke(c, INK, 4, [[32, 34], [26, 24], [30, 16]]); stroke(c, INK, 4, [[32, 34], [42, 40], [46, 50]]); stroke(c, INK, 4, [[32, 34], [20, 42], [16, 50]]);
      stroke(c, '#eaf6ff', 1.6, [[32, 34], [26, 24], [30, 16]]); stroke(c, '#eaf6ff', 1.6, [[32, 34], [42, 40], [46, 50]]); stroke(c, '#eaf6ff', 1.6, [[32, 34], [20, 42], [16, 50]]);
    },
    // two rings, one behind the other, a crack under each
    'Twin Slam': (c, A) => {
      for (const [x, y] of [[20, 22], [42, 42]]) { ring(c, x, y, 14, A, 2.8); disc(c, x, y, 11, rgba('#cfeaff', 0.25)); stroke(c, INK, 3, [[x, y], [x - 5, y - 8]]); stroke(c, INK, 3, [[x, y], [x + 6, y + 7]]); stroke(c, '#eaf6ff', 1.4, [[x, y], [x - 5, y - 8]]); stroke(c, '#eaf6ff', 1.4, [[x, y], [x + 6, y + 7]]); }
    },
    // a long jagged crack running across the ice, sheets splitting either side
    'Fault Line': (c, A) => {
      fill(c, rgba(A, 0.3), [[2, 22], [62, 6], [62, 30], [2, 46]]);
      stroke(c, INK, 6, [[2, 36], [16, 28], [24, 36], [38, 24], [48, 30], [62, 18]]); stroke(c, '#eaf6ff', 2, [[2, 36], [16, 28], [24, 36], [38, 24], [48, 30], [62, 18]]);
      stroke(c, INK, 3, [[24, 36], [20, 50]]); stroke(c, '#eaf6ff', 1.2, [[24, 36], [20, 50]]); stroke(c, INK, 3, [[38, 24], [42, 10]]); stroke(c, '#eaf6ff', 1.2, [[38, 24], [42, 10]]);
    },
    // icicles falling out of the aurora, each into a small ring
    'Icefall': (c, A) => {
      for (const [x, y] of [[14, 40], [32, 30], [50, 44]]) { fill(c, '#eaf6ff', [[x - 4, y - 24], [x + 4, y - 24], [x, y - 4]]); stroke(c, INK, 1.5, [[x - 4, y - 24], [x, y - 4], [x + 4, y - 24]]); ring(c, x, y + 6, 9, A, 2); }
    },
    // a vast arc swung in front of a giant's shoulder
    "Titan's Sweep": (c, A) => {
      fill(c, rgba(A, 0.35), [[10, 56], [4, 24], [20, 6], [44, 6], [60, 24], [54, 56]]);
      c.beginPath(); c.arc(32, 58, 44, 3.6, 5.8); c.strokeStyle = '#eaf6ff'; c.lineWidth = 3; c.stroke();
      inkEll(c, 32, 54, 12, 8, '#9fb6c9', 2); inkEll(c, 32, 52, 7, 5, '#cfeaff', 1.4);
    },
    // frost spreading from a footprint, a hand of ice rising
    "Winter's Grasp": (c, A) => {
      inkEll(c, 32, 46, 16, 9, '#cfeaff', 2); ring(c, 32, 46, 24, A, 2);
      for (const [x, y] of [[16, 32], [24, 24], [32, 20], [40, 24], [48, 32]]) fill(c, '#eaf6ff', [[x - 3, y + 10], [x, y - 8], [x + 3, y + 10]]);
      for (const [x, y] of [[16, 32], [24, 24], [32, 20], [40, 24], [48, 32]]) stroke(c, INK, 1.4, [[x - 3, y + 10], [x, y - 8], [x + 3, y + 10]]);
    },
    // a snowflake over a small thermometer
    'Frostbite': (c, A) => {
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; stroke(c, '#eaf6ff', 3, [[32 + Math.cos(a) * 20, 28 + Math.sin(a) * 20], [32 - Math.cos(a) * 20, 28 - Math.sin(a) * 20]]); }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; stroke(c, A, 2, [[32 + Math.cos(a) * 12, 28 + Math.sin(a) * 12], [32 + Math.cos(a + 0.5) * 18, 28 + Math.sin(a + 0.5) * 18]]); }
      disc(c, 32, 28, 4, '#ffffff'); ring(c, 32, 54, 6, A, 2); disc(c, 32, 54, 3, '#ff9a6a');
    },
    // a blind white blast, the aurora behind
    'Whiteout': (c, A) => {
      glow(c, 32, 32, 34, '#ffffff', 0.9);
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10; stroke(c, rgba('#eaf6ff', 0.8), 2, [[32 + Math.cos(a) * 12, 32 + Math.sin(a) * 12], [32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30]]); }
      for (const [x, y] of [[10, 12], [52, 10], [54, 50], [12, 52]]) disc(c, x, y, 2.4, A);
    },
    // a dim aurora ribbon over huge slow shapes
    'The Long Night': (c, A) => {
      disc(c, 46, 14, 8, '#cfe2ff'); disc(c, 50, 12, 7, '#0e1218');
      fill(c, '#1a2a44', [[0, 22], [20, 14], [40, 24], [64, 16], [64, 36], [0, 36]]); stroke(c, A, 2.5, [[0, 28], [20, 20], [40, 30], [64, 22]]);
      inked(c, '#2a3548', [[8, 56], [14, 38], [26, 36], [30, 56]], 1.8); inked(c, '#2a3548', [[34, 56], [40, 40], [54, 38], [58, 56]], 1.8);
    },
    // five lanes of snow and rock running down, one lane left clear
    'Avalanche': (c, A) => {
      for (let i = 0; i < 5; i++) { if (i === 2) continue; const x = 6 + i * 13; fill(c, rgba(A, 0.5), [[x, 4], [x + 11, 4], [x + 11, 60], [x, 60]]); for (const y of [14, 28, 42, 54]) disc(c, x + 5.5, y, 3, '#eaf6ff'); }
      fill(c, rgba('#cfeaff', 0.35), [[32, 4], [43, 4], [43, 60], [32, 60]]); stroke(c, '#eaf6ff', 1.6, [[32, 4], [32, 60]]); stroke(c, '#eaf6ff', 1.6, [[43, 4], [43, 60]]);
    },
    // a giant's foot, shards running out in two rings
    'Glacial Stomp': (c, A) => {
      ring(c, 32, 34, 28, rgba(A, 0.6), 3); ring(c, 32, 34, 20, A, 3);
      inkEll(c, 32, 34, 11, 14, '#9fb6c9', 2.2); for (const x of [26, 30, 34, 38]) disc(c, x, 22, 2.2, '#eaf6ff');
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; fill(c, '#eaf6ff', [[32 + Math.cos(a) * 20, 34 + Math.sin(a) * 20], [32 + Math.cos(a) * 29, 34 + Math.sin(a) * 29], [32 + Math.cos(a + 0.2) * 20, 34 + Math.sin(a + 0.2) * 20]]); }
    },
    // a cone of frost, three sheets inside it turning white
    'Breath of Winter': (c, A) => {
      fill(c, rgba(A, 0.4), [[4, 32], [60, 8], [60, 56]]); fill(c, rgba('#eaf6ff', 0.7), [[6, 32], [36, 24], [36, 40]]);
      for (const [x, y] of [[42, 18], [48, 34], [44, 48]]) { inked(c, '#cfeaff', [[x - 6, y - 6], [x + 6, y - 6], [x + 6, y + 6], [x - 6, y + 6]], 1.6); stroke(c, INK, 1.2, [[x - 2, y - 6], [x + 1, y + 6]]); }
      inked(c, '#9fb6c9', [[0, 26], [12, 26], [14, 32], [12, 38], [0, 38]], 1.8);
    },
    // a huge hand closing on a small figure
    "Titan's Grip": (c, A) => {
      disc(c, 32, 40, 6, '#f2e6c8'); fill(c, '#f2e6c8', [[27, 44], [37, 44], [36, 58], [28, 58]]);
      for (const x of [14, 24, 34, 44]) inked(c, '#9fb6c9', [[x, 4], [x + 8, 4], [x + 9, 30], [x + 4, 36], [x - 1, 30]], 1.8);
      inked(c, '#7fa0bb', [[10, 2], [54, 2], [52, 14], [12, 14]], 1.8); ring(c, 32, 50, 12, '#3d8bff', 2);
    },
    // the whole plateau snowed over, the sun a pale ring
    'Endless Winter': (c, A) => {
      ring(c, 32, 26, 14, '#eaf6ff', 2.5); disc(c, 32, 26, 7, rgba('#cfeaff', 0.5));
      fill(c, '#2a3a54', [[0, 44], [18, 34], [36, 44], [50, 32], [64, 42], [64, 64], [0, 64]]); fill(c, '#eaf6ff', [[18, 34], [24, 40], [12, 40]]); fill(c, '#eaf6ff', [[50, 32], [57, 40], [43, 40]]);
      for (const [x, y] of [[8, 12], [54, 10], [20, 54], [44, 56], [30, 48]]) { disc(c, x, y, 2.2, '#ffffff'); }
    },
    // a sheet of ice tipping on its edge, snow sliding off
    'The Plateau Tips': (c, A) => {
      inked(c, '#cfeaff', [[6, 44], [50, 14], [58, 24], [14, 54]], 2.2); stroke(c, rgba(INK, 0.5), 1.4, [[20, 40], [38, 22]]); stroke(c, rgba(INK, 0.5), 1.4, [[32, 46], [48, 28]]);
      for (const [x, y] of [[48, 40], [54, 48], [44, 52], [56, 34]]) disc(c, x, y, 3, A);
      motion(c, L, [[[40, 42], [46, 56]], [[28, 50], [34, 60]]]);
    },
  });
  // The Hydra (drawn badges; painted icons come later: docs/art/icon-prompts.md)
  Object.assign(G, {
    // a great scaled face thrown back, mouth wide, rings of sound rolling out under a brass collar
    "Mother's Cry": (c, A) => {
      for (const r of [14, 21, 28]) { c.beginPath(); c.arc(40, 26, r, -0.5, 0.9); c.strokeStyle = rgba('#ffe9a8', 0.8 - r / 45); c.lineWidth = 2.5; c.stroke(); }
      inked(c, '#2f5a3a', [[6, 46], [10, 28], [24, 20], [38, 24], [30, 32], [20, 40]], 2);
      inked(c, '#16301f', [[8, 48], [22, 42], [34, 40], [26, 50], [14, 52]], 2);
      for (const x of [18, 23, 28]) fill(c, L, [[x, 28 + (x - 18) * -0.4], [x + 2, 33], [x - 2, 33]]);
      disc(c, 26, 24, 2.2, '#ffd870'); stroke(c, '#b8903a', 3, [[6, 54], [30, 56]]);
    },
    // a broad jaw closing on a cone of dark water, teeth top and bottom
    'Rending Maul': (c, A) => {
      fill(c, rgba('#ff4a5a', 0.3), [[32, 30], [8, 4], [56, 4]]);
      inked(c, '#2f5a3a', [[6, 30], [20, 22], [44, 22], [58, 30], [44, 34], [20, 34]], 2.2);
      inked(c, '#16301f', [[6, 38], [20, 46], [44, 46], [58, 38], [44, 34], [20, 34]], 2.2);
      for (const x of [14, 22, 30, 38, 46]) { fill(c, L, [[x, 34], [x + 2.5, 34], [x + 1, 26]]); fill(c, L, [[x + 2, 34], [x + 4.5, 34], [x + 3, 42]]); }
      motion(c, A, [[[6, 12], [14, 18]], [[58, 12], [50, 18]]]);
    },
    // a cone of green spray from a snout, drops and bubbles in it, something eaten through
    'Acid Spray': (c) => {
      fill(c, rgba('#9ccc2e', 0.5), [[8, 32], [58, 10], [58, 54]]); fill(c, rgba('#d8ff70', 0.75), [[10, 32], [46, 22], [46, 42]]);
      inked(c, '#3d5a12', [[2, 26], [14, 26], [16, 32], [14, 38], [2, 38]], 2); disc(c, 8, 30, 1.8, '#d8ff70');
      for (const [x, y, r] of [[44, 16, 3], [52, 32, 2.6], [46, 48, 3], [34, 38, 2]]) { ring(c, x, y, r, '#e8ffb0', 1.8); }
    },
    // a long lane of water with waves in it, a snout at one end
    'Tidal Line': (c) => {
      fill(c, rgba('#2fbfb0', 0.35), [[4, 24], [60, 20], [60, 44], [4, 40]]);
      for (const y of [28, 33, 38]) stroke(c, '#d8fffa', 2.2, [[8, y], [16, y - 3], [24, y + 3], [32, y - 3], [40, y + 3], [48, y - 3], [56, y]]);
      inked(c, '#0f4a46', [[0, 22], [10, 22], [12, 32], [10, 42], [0, 42]], 2);
    },
    // a violet flower of poison, a ring round it shared
    'Venom Bloom': (c) => {
      ring(c, 32, 32, 24, '#3d8bff', 2.5);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; inkEll(c, 32 + Math.cos(a) * 11, 32 + Math.sin(a) * 11, 8, 5, '#a050e0', 1.8, a); }
      inkDisc(c, 32, 32, 6, '#e0a0ff', 1.8); hi(c, 30, 30, 2, 1.5);
      for (const [x, y] of [[10, 12], [54, 52], [12, 54]]) drop(c, x, y, 0.8, '#e0a0ff');
    },
    // two rings of fire on two small figures
    'Flame Gout': (c) => {
      for (const [x, y] of [[20, 24], [44, 40]]) { ring(c, x, y, 13, '#ff8a2a', 3); disc(c, x, y, 9, rgba('#ffb060', 0.45)); flame(c, x, y + 4, 12, '#ff8a2a', '#ffe08a'); }
    },
    // a ring of ice round a head, a safe hollow in the middle, crystals set in it
    'Rime Crown': (c) => {
      ring(c, 32, 32, 25, '#a8d8f0', 7); ring(c, 32, 32, 25, '#f0fbff', 2);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; fill(c, '#eaf6ff', [[32 + Math.cos(a - 0.1) * 21, 32 + Math.sin(a - 0.1) * 21], [32 + Math.cos(a) * 33, 32 + Math.sin(a) * 33], [32 + Math.cos(a + 0.1) * 21, 32 + Math.sin(a + 0.1) * 21]]); }
      inkEll(c, 32, 33, 8, 6, '#2f5a3a', 1.8); disc(c, 35, 31, 1.6, '#e8f8ff');
    },
    // three bolts fanned out from one point
    'Stormcall': (c) => {
      for (const [a, col] of [[-0.55, '#fff6a0'], [0, '#ffffff'], [0.55, '#fff6a0']]) {
        const ca = Math.cos(a - 0.2 + 0.2), sa = Math.sin(a);
        stroke(c, rgba('#e8d040', 0.55), 9, [[8, 32], [8 + ca * 50, 32 + sa * 50]]);
        stroke(c, col, 2.4, [[8, 32], [8 + ca * 14, 32 + sa * 14 - 5], [8 + ca * 26, 32 + sa * 26 + 5], [8 + ca * 38, 32 + sa * 38 - 4], [8 + ca * 50, 32 + sa * 50]]);
      }
      inkDisc(c, 8, 32, 5, '#e8d040', 1.8);
    },
    // one great pale eye, a column's shadow cut out of the light
    'Stonegaze': (c, A) => {
      fill(c, rgba('#d8d4e4', 0.22), [[32, 20], [0, 62], [64, 62]]);
      fill(c, '#0a1410', [[24, 62], [28, 40], [36, 40], [40, 62]]);
      eye(c, 32, 18, 0.95, '#f4f2ee', '#c8c4d4'); disc(c, 32, 18, 3.2, INK); hi(c, 30, 15, 2, 1.4);
      for (const a of [-0.6, 0.6]) stroke(c, rgba('#ffffff', 0.6), 2, [[32, 28], [32 + Math.sin(a) * 28, 28 + Math.cos(a) * 28]]);
    },
    // three blobs of bog, a slow arrow in each
    'Mire Spit': (c) => {
      for (const [x, y] of [[16, 22], [44, 18], [30, 46]]) { inkEll(c, x, y, 11, 8, '#9a7a44', 2); inkEll(c, x - 2, y - 1, 6, 4, '#5a4222', 1.4); stroke(c, L, 1.8, [[x - 3, y - 2], [x - 3, y + 3]]); fill(c, L, [[x - 6, y + 2], [x, y + 2], [x - 3, y + 6]]); }
    },
    // a bleeding stump, a brazier flame searing it
    'Searing': (c, A) => {
      inked(c, '#2f5a3a', [[22, 56], [24, 34], [40, 34], [42, 56]], 2); inkEll(c, 32, 34, 9, 4, '#16301f', 1.8); disc(c, 32, 34, 2.4, '#ff4a5a');
      flame(c, 32, 26, 20, '#ff8a2a', '#ffe08a'); flame(c, 22, 30, 11, '#ff6a1a', '#ffd27a'); flame(c, 42, 30, 11, '#ff6a1a', '#ffd27a');
      ring(c, 32, 56, 12, '#3d8bff', 2);
    },
    // a column and a rising line of water, the Mother's eyes just above it
    'Submerge': (c, A) => {
      fill(c, rgba('#2fbfb0', 0.55), [[0, 30], [64, 30], [64, 64], [0, 64]]);
      for (const y of [34, 42, 50]) stroke(c, '#d8fffa', 2, [[4, y], [14, y - 3], [24, y + 3], [34, y - 3], [44, y + 3], [54, y - 3], [60, y]]);
      for (const x of [20, 44]) { inkEll(c, x, 24, 6, 3.6, '#e8c050', 1.6); disc(c, x, 24, 1.4, INK); }
      for (const [x, y, r] of [[30, 14, 2.5], [36, 8, 2], [26, 6, 1.6]]) ring(c, x, y, r, '#d8fffa', 1.4);
      motion(c, A, [[[8, 18], [8, 8]], [[56, 18], [56, 8]]]);
    },
    // a beating heart in gold, brass studs, strikes from nine points
    "Mother's Heart": (c) => {
      c.beginPath(); c.moveTo(32, 50); c.bezierCurveTo(6, 32, 14, 12, 32, 22); c.bezierCurveTo(50, 12, 58, 32, 32, 50); c.fillStyle = '#e8b030'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      glow(c, 32, 32, 18, '#fff0b0', 0.8); hi(c, 24, 26, 3, 5, 0.3);
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + i * TAU / 9; disc(c, 32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28, 2.6, '#b8903a'); }
    },
    // water over everything, a hand reaching up out of it
    'The Drowning': (c, A) => {
      fill(c, rgba('#2fbfb0', 0.65), [[0, 18], [64, 18], [64, 64], [0, 64]]);
      for (const y of [24, 34, 44, 54]) stroke(c, '#d8fffa', 2, [[2, y], [12, y - 3], [22, y + 3], [32, y - 3], [42, y + 3], [52, y - 3], [62, y]]);
      inked(c, '#cfe0d6', [[28, 40], [28, 22], [31, 8], [34, 22], [36, 6], [39, 22], [42, 10], [44, 24], [46, 40]], 1.8);
      for (const [x, y, r] of [[14, 12, 3], [52, 10, 2.4], [18, 4, 1.8]]) ring(c, x, y, r, A, 1.6);
    },
    // a stump with two small heads sprouting from it
    'Regrowth': (c) => {
      inked(c, '#2f5a3a', [[22, 58], [26, 38], [38, 38], [42, 58]], 2); inkEll(c, 32, 38, 8, 3.6, '#16301f', 1.6);
      for (const sd of [-1, 1]) {
        stroke(c, '#16301f', 8, [[32, 38], [32 + sd * 8, 26], [32 + sd * 14, 14]]); stroke(c, '#4f8a55', 5, [[32, 38], [32 + sd * 8, 26], [32 + sd * 14, 14]]);
        inkEll(c, 32 + sd * 15, 11, 7, 4.6, '#4f8a55', 1.8, sd * 0.5); disc(c, 32 + sd * 17, 9, 1.4, '#ffd870');
      }
    },
    // two lines crossing, the water between them
    'Tidal Dance': (c) => {
      stroke(c, rgba('#2fbfb0', 0.5), 9, [[4, 8], [60, 50]]); stroke(c, '#d8fffa', 2, [[4, 8], [60, 50]]);
      stroke(c, rgba('#2fbfb0', 0.7), 9, [[60, 10], [4, 54]]); stroke(c, '#d8fffa', 2, [[60, 10], [4, 54]]);
      for (const [x, y] of [[8, 30], [56, 30]]) inkEll(c, x, y, 4.5, 3, '#0f4a46', 1.4);
      for (const y of [18, 46]) disc(c, 32, y, 2.4, '#ffffff');
    },
    // the whole inside of the room under one eye, the wall left clear
    "Hydra's Gaze": (c) => {
      ring(c, 32, 32, 29, '#d8d4e4', 2.5); disc(c, 32, 32, 22, rgba('#d8d4e4', 0.3));
      eye(c, 32, 32, 0.8, '#f4f2ee', '#c8c4d4'); disc(c, 32, 32, 3.4, INK); hi(c, 30, 29, 2, 1.4);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; stroke(c, rgba('#ffffff', 0.55), 1.8, [[32 + Math.cos(a) * 18, 32 + Math.sin(a) * 18], [32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24]]); }
    },
  });
  // Azerath, the Sunken Archmage
  Object.assign(G, {
    // Azerath (drawn badges; painted icons come later). Fire orange, frost blue, lightning yellow, the void violet.
    // seven sparks ringed round a star, the ring spreading outward
    'Arcane Burst': (c, A) => {
      for (const [r, a] of [[28, 0.35], [21, 0.6]]) ring(c, 32, 32, r, rgba(A, a), 2.5);
      for (let i = 0; i < 7; i++) { const an = -Math.PI / 2 + i * TAU / 7; disc(c, 32 + Math.cos(an) * 21, 32 + Math.sin(an) * 21, 3, i % 2 ? '#bff8f0' : '#ffe08a'); }
      inked(c, '#e8fffa', [[32, 18], [36, 28], [46, 32], [36, 36], [32, 46], [28, 36], [18, 32], [28, 28]], 1.8);
    },
    // a long lance of pale light, a cone of shadow behind its point
    'Arcane Lance': (c, A) => {
      fill(c, rgba(A, 0.3), [[4, 54], [60, 10], [50, 40]]);
      inked(c, '#e8fffa', [[6, 56], [48, 14], [54, 8], [52, 20], [12, 60]], 2); stroke(c, A, 2.4, [[10, 56], [50, 14]]);
      disc(c, 53, 9, 3.4, '#ffffff'); motion(c, A, [[[40, 44], [30, 52]], [[50, 36], [42, 46]]]);
    },
    // a ring with a rune in it, two small marks orbiting
    'Rune Mark': (c, A) => {
      ring(c, 32, 32, 22, A, 3); ring(c, 32, 32, 17, rgba(A, 0.5), 1.5);
      stroke(c, L, 3, [[32, 18], [32, 46]]); stroke(c, L, 3, [[24, 26], [32, 32], [40, 26]]); stroke(c, L, 3, [[26, 40], [38, 40]]);
      disc(c, 10, 14, 4, '#ff6a2a'); disc(c, 54, 50, 4, '#7fd8ff');
    },
    // two rings of flame, set well apart, and a spark where they would meet
    'Cinder Rune': (c, A) => {
      for (const [x, y] of [[16, 32], [48, 32]]) { ring(c, x, y, 12, '#ff6a2a', 3); flame(c, x, y, 9, '#ff8a2a', '#ffe08a'); }
      stroke(c, rgba('#ff6a2a', 0.5), 2, [[29, 32], [35, 32]]); fill(c, '#ffe08a', [[32, 22], [34, 30], [42, 32], [34, 34], [32, 42], [30, 34], [22, 32], [30, 30]]);
    },
    // a blue circle between two small flakes
    'Rime Rune': (c, A) => {
      ring(c, 32, 32, 21, '#3d8bff', 3); ring(c, 32, 32, 14, rgba('#3d8bff', 0.4), 1.5);
      for (const [x, y] of [[10, 52], [54, 12]]) { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; stroke(c, '#d8f4ff', 2, [[x + Math.cos(a) * 8, y + Math.sin(a) * 8], [x - Math.cos(a) * 8, y - Math.sin(a) * 8]]); } }
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; stroke(c, '#d8f4ff', 2.6, [[32 + Math.cos(a) * 12, 32 + Math.sin(a) * 12], [32 - Math.cos(a) * 12, 32 - Math.sin(a) * 12]]); }
    },
    // a bolt running from one rune to the other
    'Storm Rune': (c, A) => {
      for (const [x, y] of [[10, 52], [54, 12]]) { disc(c, x, y, 8, '#10222a'); ring(c, x, y, 8, '#ffe45a', 2.5); disc(c, x, y, 3, '#fff6b0'); }
      stroke(c, rgba('#ffe45a', 0.4), 9, [[14, 48], [26, 38], [34, 40], [48, 18]]); stroke(c, '#fff6b0', 3, [[14, 48], [26, 38], [34, 40], [48, 18]]);
    },
    // two rings of void with a quiet middle, each held away from the other
    'Rift Rune': (c, A) => {
      for (const [x, y] of [[17, 32], [47, 32]]) { disc(c, x, y, 13, '#10041e'); ring(c, x, y, 13, '#a05aff', 3); disc(c, x, y, 5, '#000000'); ring(c, x, y, 5, '#c8a0ff', 1.5); }
      motion(c, L, [[[30, 32], [26, 32]], [[34, 32], [38, 32]]]);
    },
    // three rings on the floor, two burning, one dark
    'Pyre Rings': (c, A) => {
      disc(c, 32, 34, 28, rgba('#ff6a2a', 0.55)); disc(c, 32, 34, 20, '#0e1c22'); disc(c, 32, 34, 12, rgba('#ff6a2a', 0.85)); disc(c, 32, 34, 5, '#ffe08a');
      ring(c, 32, 34, 28, '#ffb04a', 2); ring(c, 32, 34, 20, rgba(L, 0.35), 1.5);
    },
    // three shards of ice flying out from a point
    'Ice Lances': (c, A) => {
      for (const an of [-0.6, 0, 0.6]) { const x = 14, y = 32, ex = x + Math.cos(an) * 46, ey = y + Math.sin(an) * 46; inked(c, '#d8f4ff', [[x - Math.sin(an) * 4, y + Math.cos(an) * 4], [ex, ey], [x + Math.sin(an) * 4, y - Math.cos(an) * 4]], 1.8); stroke(c, '#7fd8ff', 1.6, [[x, y], [ex - Math.cos(an) * 6, ey - Math.sin(an) * 6]]); }
      disc(c, 12, 32, 5, '#7fd8ff');
    },
    // a bolt jumping from one point to the next
    'Leaping Bolt': (c, A) => {
      const P = [[10, 48], [28, 22], [44, 40], [56, 12]];
      stroke(c, rgba('#ffe45a', 0.4), 8, P); stroke(c, '#fff6b0', 2.6, P);
      for (const [x, y] of P) { disc(c, x, y, 5.5, '#ffe45a'); ring(c, x, y, 5.5, INK, 1.5); }
    },
    // rifts opening in the floor, once, and again further on
    'Void Rifts': (c, A) => {
      for (const [x, y, rx] of [[20, 24, 14], [42, 44, 16]]) { inkEll(c, x, y, rx, rx * 0.45, '#10041e', 2); c.beginPath(); c.ellipse(x, y, rx, rx * 0.45, 0, 0, TAU); c.strokeStyle = '#a05aff'; c.lineWidth = 2.2; c.stroke(); disc(c, x, y, 3.5, '#000000'); }
      motion(c, '#c8a0ff', [[[30, 34], [34, 38]]]);
    },
    // a sigil with a small thing being led into it
    'The Binding': (c, A) => {
      ring(c, 38, 38, 20, A, 3); ring(c, 38, 38, 14, rgba(A, 0.45), 1.5);
      for (let i = 0; i < 8; i++) { const an = i * TAU / 8; stroke(c, A, 2, [[38 + Math.cos(an) * 20, 38 + Math.sin(an) * 20], [38 + Math.cos(an) * 25, 38 + Math.sin(an) * 25]]); }
      inkDisc(c, 14, 14, 7, '#ff6a2a', 1.8); stroke(c, L, 2, [[19, 19], [29, 29]]); fill(c, L, [[27, 24], [33, 33], [24, 31]]);
    },
    // four rings of four elements, overlapping, and a white lens where two meet
    'Convergence': (c, A) => {
      for (const [x, y, col] of [[32, 18, '#ff6a2a'], [46, 32, '#7fd8ff'], [32, 46, '#ffe45a'], [18, 32, '#a05aff']]) { disc(c, x, y, 15, rgba(col, 0.35)); ring(c, x, y, 15, col, 2.5); }
      for (const [x, y] of [[39, 25], [39, 39], [25, 39], [25, 25]]) disc(c, x, y, 3.2, '#ffffff');
    },
    // a circle thrown across a dotted line to the far side
    'Counterspell': (c, A) => {
      ring(c, 18, 20, 11, '#a05aff', 3); disc(c, 18, 20, 4, rgba('#a05aff', 0.6));
      for (let i = 0; i < 7; i++) disc(c, 8 + i * 8, 32, 1.6, rgba(L, 0.7));
      ring(c, 46, 44, 11, '#c8a0ff', 3);
      stroke(c, rgba(L, 0.6), 2, [[22, 28], [42, 38]]); fill(c, rgba(L, 0.8), [[40, 34], [46, 40], [38, 41]]);
    },
    // two runes trading places
    'Rune Swap': (c, A) => {
      for (const [x, y, col] of [[14, 32, '#ff6a2a'], [50, 32, '#7fd8ff']]) { disc(c, x, y, 9, '#10222a'); ring(c, x, y, 9, col, 2.6); disc(c, x, y, 3.6, col); }
      stroke(c, L, 2.6, [[24, 22], [32, 16], [40, 22]]); fill(c, L, [[38, 16], [46, 22], [37, 26]]);
      stroke(c, L, 2.6, [[40, 42], [32, 48], [24, 42]]); fill(c, L, [[26, 38], [18, 42], [27, 48]]);
    },
    // a blue ring and a small elemental rising in the middle of it
    'Arcane Mark': (c, A) => {
      ring(c, 32, 36, 24, '#3d8bff', 3); ring(c, 32, 36, 18, rgba('#3d8bff', 0.4), 1.5);
      glow(c, 32, 30, 16, '#ffe08a', 0.7); flame(c, 32, 32, 13, '#ff8a2a', '#ffe08a');
      stroke(c, L, 2.2, [[32, 8], [32, 14]]); stroke(c, L, 2.2, [[26, 11], [38, 11]]);
    },
    // water climbing a tower
    'The Tide Rises': (c, A) => {
      inked(c, '#3a5a60', [[24, 8], [40, 8], [42, 52], [22, 52]], 2); for (const y of [16, 26, 36]) stroke(c, '#0e1c22', 2, [[26, y], [38, y]]);
      for (const [y, a] of [[44, 0.9], [38, 0.6]]) { c.beginPath(); c.moveTo(0, 64); c.lineTo(0, y); for (let x = 0; x <= 64; x += 8) c.quadraticCurveTo(x + 4, y - 8, x + 8, y); c.lineTo(64, 64); c.closePath(); c.fillStyle = rgba(A, a * 0.8); c.fill(); c.strokeStyle = rgba('#bff8f0', 0.8); c.lineWidth = 2; c.stroke(); }
    },
  });
  G['Call of the Circle'] = G['The Binding'];
  // moves that share a badge with their nearest sibling until they get their own
  G['Cocoon Drop'] = G['Egg Sacs']; G['Sceptre Throw'] = G['Sceptre Sweep']; G['Grave Summons'] = G['Court of Bones'];
  function draw(bossId, name) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d'), A = ACCENT[bossId] || '#e8c15a';
    const bg = c.createRadialGradient(32, 26, 4, 32, 32, 46);
    bg.addColorStop(0, shade(A, -0.62)); bg.addColorStop(1, '#100e14');
    c.fillStyle = bg; c.fillRect(0, 0, 64, 64);
    const g = G[name];
    if (g) { c.save(); try { g(c, A); } catch (e) { /* a broken glyph falls back to the letter */ } c.restore(); }
    else { c.fillStyle = L; c.font = '700 30px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((name || '?')[0].toUpperCase(), 32, 34); }
    c.strokeStyle = rgba(A, 0.7); c.lineWidth = 2; c.strokeRect(1, 1, 62, 62);
    return cv.toDataURL();
  }
  function get(bossId, name) {
    if (typeof document === 'undefined') return '';
    const key = bossId + '/' + name;
    if (!cache.has(key)) cache.set(key, draw(bossId, name));
    return cache.get(key);
  }
  // the CSS background for a move's icon: the painted file over the drawn badge
  function css(bossId, name) {
    const drawn = `url(${get(bossId, name)})`;
    if (!PAINTED.has(bossId)) return drawn;
    const path = `icons/boss/${bossId}/${slug(name)}.png`;
    return typeof ArtProbe === 'undefined' || ArtProbe.ok(path) !== false ? `url(${path}), ${drawn}` : drawn;
  }
  return { get, css, slug, has: name => !!G[name], names: () => Object.keys(G) };
})();

if (typeof module !== 'undefined') module.exports = { BossIcons };
