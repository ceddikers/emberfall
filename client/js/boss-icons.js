// An icon for every boss move, keyed by the move's cast name (the name on the cast frame and in the upcoming feed).
// Each is drawn once on a 64px canvas and kept as a data URL: a dark badge lit in the boss's colour, a light glyph of
// the move on it, and a rim in the boss's colour. A boss whose icons are painted (docs/art/boss-icons.md) shows the
// file instead, icons/boss/<boss>/<slug>.png, with the drawn one underneath until it loads (or if one is missing).

const BossIcons = (() => {
  const ACCENT = { grubnak: '#ff9a3a', skitterra: '#b8ef5a', volkar: '#7fe8ff', hollowking: '#6dff9a' };
  const L = '#f2e6c8', INK = '#14111a';
  const cache = new Map();
  const PAINTED = new Set(['grubnak', 'skitterra', 'volkar', 'hollowking']);
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
    'Flare-Up': (c, A) => { flame(c, 32, 36, 24, A, '#ffe08a'); stroke(c, L, 2.5, [[12, 54], [52, 54]]); },
    'Ladle Spin': (c, A) => { c.beginPath(); c.arc(32, 32, 22, 0.2, 5.2); c.strokeStyle = A; c.lineWidth = 3; c.stroke(); stroke(c, L, 4, [[18, 18], [36, 36]]); c.beginPath(); c.arc(40, 40, 8, 0, Math.PI); c.fillStyle = L; c.fill(); },
    'Lid Slam': (c, A) => { c.beginPath(); c.ellipse(32, 30, 22, 8, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#c8ced4'; c.fill(); disc(c, 32, 20, 4, '#c8ced4'); motion(c, A, [[[10, 48], [54, 48]], [[16, 56], [48, 56]]]); },
    'Stockpot': (c, A) => { fill(c, L, [[10, 22], [54, 22], [50, 56], [14, 56]]); fill(c, '#8a5a2e', [[6, 20], [58, 20], [58, 25], [6, 25]]); for (const x of [22, 34, 44]) ring(c, x, 14, 3.5, A, 2); },
    'Gorge': (c, A) => { c.beginPath(); c.arc(32, 34, 20, 0.35, TAU - 0.35); c.lineTo(32, 34); c.closePath(); c.fillStyle = L; c.fill(); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(32, 34, 8 + i * 6, i, i + 2); c.strokeStyle = A; c.lineWidth = 2; c.stroke(); } },
    'Mince': (c, A) => { fill(c, '#8a5a2e', [[8, 42], [56, 42], [56, 54], [8, 54]]); fill(c, A, [[8, 42], [32, 42], [32, 54], [8, 54]]); cleaver(c, 26, 24, -0.35, 1.1, L); stroke(c, '#ffe08a', 2, [[14, 10], [18, 14]]); },
    'Double Chop': (c, A) => { fill(c, A, [[8, 42], [31, 42], [31, 54], [8, 54]]); fill(c, shade(A, -0.35), [[33, 42], [56, 42], [56, 54], [33, 54]]); cleaver(c, 20, 24, -0.25, 0.85, L); cleaver(c, 44, 22, 0.25, 0.85, L); },
    "Butcher's Charge": (c, A) => { for (const sd of [-1, 1]) fill(c, L, [[32 + sd * 8, 22], [32 + sd * 22, 10], [32 + sd * 14, 26]]); disc(c, 32, 30, 11, '#9a5a2e'); disc(c, 27, 28, 2, INK); disc(c, 37, 28, 2, INK); fill(c, A, [[26, 44], [38, 44], [38, 50], [44, 50], [32, 60], [20, 50], [26, 50]]); },
    'Last Call': (c, A) => { ring(c, 32, 32, 20, L, 3.5); stroke(c, L, 3, [[32, 32], [32, 17]]); stroke(c, L, 3, [[32, 32], [40, 36]]); flame(c, 50, 50, 12, A, '#ffe08a'); },
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
    'Ceiling Ambush': (c, A) => { stroke(c, L, 1.5, [[32, 0], [32, 20]]); spider(c, 32, 30, 0.9, L); c.beginPath(); c.ellipse(32, 54, 16, 4, 0, 0, TAU); c.fillStyle = A; c.fill(); },
    'Into the Dark': (c, A) => { disc(c, 32, 32, 22, '#05040a'); spider(c, 32, 28, 0.7, '#3a3448'); disc(c, 27, 24, 2, A); disc(c, 37, 24, 2, A); },
    'From the Dark': (c, A) => { stroke(c, L, 1.5, [[32, 0], [32, 22]]); spider(c, 32, 32, 0.9, '#5a4a6a'); ring(c, 32, 52, 10, L, 2.5); },
    'Molt': (c, A) => { spider(c, 32, 32, 1.1, 'rgba(242,230,200,0.35)'); stroke(c, L, 2, [[22, 20], [28, 30], [24, 40], [30, 50]]); },
    'Tightening Web': (c, A) => { web(c, 32, 32, 24, L, 1.8); ring(c, 32, 32, 24, A, 3); },
    'The Web Gives Way': (c, A) => { ring(c, 32, 32, 24, '#ff4ab0', 4); web(c, 32, 32, 14, L, 1.6); stroke(c, '#ff4ab0', 2, [[48, 16], [54, 10]]); stroke(c, '#ff4ab0', 2, [[12, 48], [8, 56]]); },
    'Chrysalis': (c, A) => { c.beginPath(); c.ellipse(32, 32, 14, 22, 0, 0, TAU); c.fillStyle = L; c.fill(); for (let i = 0; i < 6; i++) stroke(c, INK, 1.6, [[19, 14 + i * 7], [32, 18 + i * 7], [45, 13 + i * 7]]); stroke(c, A, 2, [[32, 2], [32, 10]]); for (const x of [20, 44]) stroke(c, '#ff4ab0', 2.5, [[x, 30], [x + (x < 32 ? -8 : 8), 26]]); },
    'Devour': (c, A) => { c.beginPath(); c.arc(32, 30, 22, 0, Math.PI); c.closePath(); c.fillStyle = '#2a1424'; c.fill(); for (const sd of [-1, 1]) fill(c, '#ff7ac0', [[32 + sd * 14, 26], [32 + sd * 6, 26], [32 + sd * 9, 50]]); for (const x of [20, 44]) drop(c, x, 54, 0.5, A); },
    // Volkar
    'Thunderclap': (c, A) => { cloud(c, 32, 22, 1.1, '#5a6a84'); bolt(c, A, 32, 42, 0.9); },
    'Distant Thunder': (c, A) => { cloud(c, 32, 30, 1, '#4a5874'); bolt(c, 'rgba(127,232,255,0.5)', 44, 42, 0.5); },
    'Titan Fist': (c, A) => { fill(c, '#8a9ab0', [[14, 22], [42, 20], [50, 26], [50, 44], [16, 46]]); for (const y of [27, 33, 39]) stroke(c, INK, 2, [[38, y], [50, y]]); bolt(c, A, 54, 14, 0.4); bolt(c, A, 10, 52, 0.4); },
    'Thunder Crash': (c, A) => { cloud(c, 32, 14, 0.9, '#5a6a84'); stroke(c, '#ffe27a', 3, [[32, 22], [30, 32], [22, 46]]); stroke(c, '#ffe27a', 3, [[30, 32], [40, 46]]); disc(c, 22, 50, 4, L); disc(c, 40, 50, 4, L); },
    'Static Field': (c, A) => { ring(c, 32, 32, 18, '#d79bff', 3); bolt(c, '#d79bff', 32, 32, 0.6); },
    'Polarity Surge': (c, A) => { disc(c, 20, 32, 12, '#ffc24a'); disc(c, 44, 32, 12, '#4ad8ff'); stroke(c, INK, 3, [[14, 32], [26, 32]]); stroke(c, INK, 3, [[20, 26], [20, 38]]); stroke(c, INK, 3, [[38, 32], [50, 32]]); },
    'Lightning Rods': (c, A) => { stroke(c, L, 4, [[32, 56], [32, 16]]); fill(c, L, [[26, 18], [32, 6], [38, 18]]); bolt(c, A, 46, 22, 0.5); ring(c, 32, 56, 10, A, 2); },
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
    'Heavens Fall': (c, A) => { fill(c, 'rgba(223,244,255,0.85)', [[22, 0], [42, 0], [42, 40], [22, 40]]); for (const x of [18, 28, 36, 46]) disc(c, x, 50, 4, L); ring(c, 32, 50, 16, '#ffd84a', 2.5); },
    'Skybreak': (c, A) => { cloud(c, 32, 20, 1.1, '#3a4660'); stroke(c, '#ffffff', 3, [[14, 18], [26, 24], [34, 16], [48, 22]]); bolt(c, A, 26, 44, 0.7); bolt(c, A, 44, 46, 0.55); },
    'Gathering Storm': (c, A) => { cloud(c, 32, 20, 1, '#4a5874'); for (const [x, y] of [[18, 44], [32, 50], [46, 44]]) bolt(c, A, x, y, 0.42); ring(c, 32, 46, 22, 'rgba(127,232,255,0.4)', 2); },
    'Thunderhead': (c, A) => { cloud(c, 32, 18, 1.3, '#2e3850'); bolt(c, '#ffffff', 32, 44, 1); bolt(c, A, 32, 44, 0.75); },
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
    'Royal Tithe': (c, A) => { crown(c, 32, 16, 0.8, '#e8c15a'); c.beginPath(); c.moveTo(18, 30); c.lineTo(46, 30); c.lineTo(40, 50); c.lineTo(24, 50); c.closePath(); c.fillStyle = '#5a6266'; c.fill(); for (const [x, y] of [[26, 54], [38, 56]]) drop(c, x, y, 0.5, '#d6304a'); disc(c, 32, 38, 4, A); },
    'Dirge': (c, A) => { bell(c, 32, 26, 0.9, '#7a8488'); for (const r of [20, 27]) { c.beginPath(); c.arc(32, 30, r, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = A; c.lineWidth = 2.5; c.stroke(); } },
    'Moonset': (c, A) => { disc(c, 32, 34, 18, '#cfe2ff'); disc(c, 40, 28, 15, '#0e1218'); fill(c, '#0e1218', [[0, 44], [64, 44], [64, 64], [0, 64]]); stroke(c, A, 3, [[6, 44], [58, 44]]); },
    'Doom Pass': (c, A) => { skull(c, 22, 32, 0.6, '#efe2ff'); stroke(c, L, 2.5, [[34, 32], [52, 32]]); fill(c, L, [[50, 26], [58, 32], [50, 38]]); },
  };
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
