// Morrow-Oak, the Starved Grove: how every move of his looks on the floor and when it lands. His body, rooms, holes, adds and props live
// in morrowoak-art.js and arena-view.js; this file is the moves: the warnings painted inside the red and blue outlines (boss-tells.js
// get() / buster), what each move does when it lands and what it leaves behind (boss-vfx.js impact(), boss-tells.js track()), the holes'
// birth, a sapling diving in, a hero falling in, a limb breaking (propfx), the Twin Seed tether (ArenaView.tether), the Rime puddle
// (ArenaView.drawPuddles), the Swallowing and the limbs growing (ArenaView.drawZones and drawRoomOver hand over), and the enrage,
// entrance and fall. Loaded after morrowoak-art.js; the other files reach it through MG_FX and every call is guarded by
// `typeof MG_FX !== 'undefined'`.
// The rule as everywhere: the red (or blue) outline marks the exact area and is drawn by boss-tells.js; what is painted inside is the
// clue, and safe floor is never painted. The look follows the painted sheets (docs/art/vfx-reference/morrowoak-*.png): scorched cracked
// brown earth, withered bark, a few dead gold leaves, the Hunger as black-violet with a bright violet rim, amber sap, and each limb in
// its own colour only on its own move (orange cleaver, lime roots, cyan storm, pale-green lantern).

const MG_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeIn = q => q * q;
  const easeIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q));
  const lerp = (a, b, q) => a + (b - a) * q;
  const C = {
    earth: '#6b5238', earthDk: '#2a1e14', earthHi: '#9a7a54', bark: '#7a6448', barkDk: '#3a2c20', leaf: '#d8a83a', leafHi: '#ffe08a',
    void: '#05020a', voidMid: '#160830', violet: '#a064ff', violetHi: '#dcc4ff', violetDk: '#3a1a66', bone: '#e8dcc0',
    thorn: '#7ed23a', thornDk: '#1f4a10', thornTip: '#f0c84a', frost: '#9fd8ff', frostHi: '#eaf8ff', frostDk: '#2a5a7a',
    spark: '#ffd23a', sparkHi: '#fff6b8', blight: '#9a3cd8', blightDk: '#3a0a5a', blightHi: '#d49aff',
    sap: '#ffb020', sapHi: '#ffe48a', sapDk: '#8a4a0a',
    cleaver: '#ff8a2a', cleaverHi: '#ffd08a', cleaverDk: '#5a2208', share: '#3d8bff', shareHi: '#cfe4ff',
    brood: '#b8ef5a', broodHi: '#e8ffb0', broodDk: '#3a5a14', silk: '#e4eadc',
    storm: '#7fe8ff', stormHi: '#ffffff', stormDk: '#0a4a6a', lantern: '#6dff9a', lanternHi: '#d8ffe8', lanternDk: '#14542c',
    wing: '#ff6a2a', wingHi: '#ffc08a', rime: '#8ad0ee', rune: '#3fe0c8', runeHi: '#d0fff6', head: '#4ad8a0', headHi: '#c8ffe8', headDk: '#0c4a38',
  };
  const AR = () => ARENA.R;
  const clipRoom = c => { ARENA.trace(c, 4); c.clip(); };
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  // what the moves remember between frames: when the camera last held, and the Swallowing's / limbs' one-shots
  const S = { camAt: -99, sw: null, limbs: null, fired: new Set() };
  const evs = () => (typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.ev) || {};
  const later = (sec, fn) => VFX.fx({ dur: Math.max(0.001, sec), layer: 'ground', draw() {}, done: fn });
  // the camera holds for a beat when something big lands (the existing hook: main.js FX.cam); never more than once in a few seconds
  function cam(stop = 0.1, punch = 0.035, dur = 0.5, gap = 3) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };
  const SPLIT = -96;   // how far above his feet the Hunger's split sits on the screen (the chest of the trunk)

  // ---------------------------------------------------------------- small painted pieces
  // a rect telegraph drawn in its own frame: x runs down the lane, y across it (full: the whole length, however long)
  function lane(ctx, s, fn, full) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    fn(full ? s.len : Math.min(s.len, AR() * 2.3), s.w / 2); ctx.restore();
  }
  // a jagged path (added to the current one) from (x1, y1) to (x2, y2)
  function zigPath(ctx, x1, y1, x2, y2, seed, jag = 8, seg = 26) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / seg)), nx = -dy / L, ny = dx / L;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n, o = (hash(i, seed) - 0.5) * 2 * jag; ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
    ctx.lineTo(x2, y2);
  }
  // a crack in the scorched earth: a dark edge and a lit body (violet for the Hunger, amber for sap, lime for roots...)
  function crackLine(ctx, x1, y1, x2, y2, seed, k, o = {}) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); zigPath(ctx, x1, y1, x2, y2, seed, o.jag ?? 8, o.seg ?? 24);
    ctx.strokeStyle = rgba(o.ink || C.void, 0.6 * k); ctx.lineWidth = (o.w || 2) + 2.6; ctx.stroke();
    ctx.strokeStyle = rgba(o.col || C.violet, k); ctx.lineWidth = o.w || 2; ctx.stroke();
    ctx.restore();
  }
  function crackStar(ctx, x, y, r, n, seed, k, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, seed) * 0.6, d = r * (0.55 + 0.45 * hash(i, seed + 1));
      crackLine(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * d, y + Math.sin(a) * d * (o.flat ?? 0.8), seed + i, k, { w: o.w || 1.8, jag: o.jag ?? 7, seg: 20, col: o.col, ink: o.ink });
    }
  }
  // a tapered ribbon along a list of points (a root, a tendril, a vine): wide at the first point, narrow at the last
  function taper(c, pts, w0, w1, fill, edge, ew = 1.6) {
    if (pts.length < 2) return;
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (pts.length - 1)) / 2;
      L.push([pts[i][0] - dy / d * w, pts[i][1] + dx / d * w]); R.push([pts[i][0] + dy / d * w, pts[i][1] - dx / d * w]);
    }
    c.beginPath(); L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (edge) { c.strokeStyle = edge; c.lineWidth = ew; c.lineJoin = 'round'; c.stroke(); }
  }
  // points along a quadratic curve
  function curve(x0, y0, cx, cy, x1, y1, n = 14) {
    const out = [];
    for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; out.push([v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1]); }
    return out;
  }
  // a dead leaf (a pointed oval with a vein)
  function leaf(c, x, y, rot, sz, col, a) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(-sz, 0); c.quadraticCurveTo(0, -sz * 0.55, sz, 0); c.quadraticCurveTo(0, sz * 0.55, -sz, 0); c.closePath();
    c.fillStyle = rgba(col, a); c.fill(); c.strokeStyle = rgba(C.earthDk, 0.7 * a); c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(-sz * 0.8, 0); c.lineTo(sz * 0.8, 0); c.strokeStyle = rgba(C.earthDk, 0.5 * a); c.stroke();
    c.restore();
  }
  // the Hunger's seed: a dark faceted crystal wrapped in violet light
  function gem(c, x, y, sz, t, k, pulse) {
    c.save(); c.translate(x, y);
    glow(c, 0, 0, 60 * sz * (0.85 + 0.25 * pulse), C.violet, 0.5 * k);
    const pts = [[0, -30], [12, -8], [8, 20], [0, 30], [-8, 20], [-12, -8]].map(([a, b]) => [a * sz, b * sz]);
    c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath();
    const g = c.createLinearGradient(-12 * sz, -30 * sz, 12 * sz, 30 * sz);
    g.addColorStop(0, rgba('#4a2a88', 0.97 * k)); g.addColorStop(0.45, rgba(C.void, 0.98 * k)); g.addColorStop(1, rgba('#1a0a34', 0.98 * k));
    c.fillStyle = g; c.fill();
    c.lineJoin = 'round'; c.strokeStyle = rgba(C.violet, (0.7 + 0.3 * pulse) * k); c.lineWidth = 2.6; c.stroke();
    c.strokeStyle = rgba(C.violetHi, 0.55 * k); c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -30 * sz); c.lineTo(-3 * sz, 26 * sz); c.moveTo(12 * sz, -8 * sz); c.lineTo(0, 2 * sz); c.lineTo(-12 * sz, -8 * sz); c.stroke();
    // little shards circling it, quicker as it nears
    for (let i = 0; i < 3; i++) { const a = t * (2 + 3 * pulse) + i * TAU / 3; circle(c, Math.cos(a) * 24 * sz, Math.sin(a) * 9 * sz - 4 * sz, 2.4 * sz, rgba(C.violetHi, 0.8 * k)); }
    c.restore();
  }
  // a black crystal spire seen from the side: base at (x, y), tip up
  function spire(c, x, y, h, w, rot, k, col = C.violet, f0 = '#0a0414', f1 = '#2a1450') {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w * 0.28, -h * 0.55); c.lineTo(0, -h); c.lineTo(w * 0.3, -h * 0.5); c.lineTo(w / 2, 0); c.closePath();
    const g = c.createLinearGradient(-w / 2, 0, w / 2, -h); g.addColorStop(0, rgba(f0, 0.98 * k)); g.addColorStop(1, rgba(f1, 0.98 * k));
    c.fillStyle = g; c.fill(); c.lineJoin = 'round'; c.strokeStyle = rgba(col, 0.9 * k); c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.moveTo(0, -h); c.lineTo(-w * 0.04, 0); c.strokeStyle = rgba(C.violetHi, 0.45 * k); c.lineWidth = 1; c.stroke();
    c.restore();
  }
  // the Hunger's own mouth: a ragged dark pit with a violet rim (for the birth of a hole and what falls into one)
  function pit(c, x, y, r, k, seed = 0, o = {}) {
    const n = 22, pts = [];
    for (let i = 0; i < n; i++) { const a = i * TAU / n, rr = r * (0.82 + 0.3 * hash(i, seed)) * (o.stretch ? 1 : 1); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.84]); }
    c.save(); c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath();
    const g = c.createRadialGradient(x, y, r * 0.1, x, y, r * 1.1); g.addColorStop(0, rgba(C.void, 0.98 * k)); g.addColorStop(0.7, rgba('#0c0420', 0.97 * k)); g.addColorStop(1, rgba(C.voidMid, 0.95 * k));
    c.fillStyle = g; c.fill(); c.lineJoin = 'round';
    if (o.rim !== false) { c.strokeStyle = rgba(C.violet, 0.85 * k); c.lineWidth = 3.4; c.stroke(); c.strokeStyle = rgba(C.violetHi, 0.7 * k); c.lineWidth = 1.2; c.stroke(); }
    c.restore();
  }
  // wisps of the dead grove thrown up off a point: leaves, grey dust, a few splinters
  function groveUp(x, y, n, o = {}) {
    VFX.smoke(x, y, { n: Math.max(1, Math.round(n / 3)), color: o.dust || '#8a7a64', size: 34 * (o.size || 1), a: 0.5, speed: 110 * (o.speed || 1), r: o.r });
    VFX.debris(x, y, { color: o.col || '#6b5238', n, speed: 1.1 * (o.speed || 1), size: o.size || 1 });
    for (let i = 0; i < Math.round(n / 3); i++) { const a = rand(0, TAU), sp = rand(40, 130); VFX.spawn({ x, y, z: rand(6, 24), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(70, 190), g: 300, drag: 0.04, life: rand(0.9, 1.6), size: rand(8, 13) * (o.size || 1), size1: 4, color: Math.random() < 0.7 ? C.leaf : '#8a6a2a', kind: 'leaf', add: false, vr: rand(-6, 6), flutter: 6 }); }
  }
  // violet shards and sparks thrown up off a point
  function hungerUp(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(80, o.speed || 280);
      VFX.spawn({ x, y, z: rand(4, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(90, 280), g: 620, drag: 0.02, life: rand(0.5, 1.0), size: rand(6, 12) * (o.size || 1), size1: 2, color: i % 3 ? '#1a0a30' : i % 3 === 0 ? C.violet : C.violetHi, kind: i % 2 ? 'shard' : 'glow', add: i % 3 === 0, vr: rand(-10, 10) });
    }
  }
  const ang = (s, d, th, lean) => s.angle + th + lean * (d / 700);

  // ---------------------------------------------------------------- the warnings (boss-tells.js get() reads TELLS[tag])
  // Each paints only the danger, inside the outline the shared code draws. Nothing marks a safe place.
  const TELLS = {};
  const limbIndex = key => { const ev = evs().mglimbs; return ev && ev.l ? ev.l.indexOf(key) : -1; };
  const SIDE = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function limbPos(env, key) {
    const i = limbIndex(key), b = env && env.boss; if (i < 0 || !b) return null;
    return { x: b.x + SIDE[i][0] * 120, y: b.y + SIDE[i][1] * 95 };
  }

  // Hunger Seed: the dark seed hanging over their head, pulsing faster as it nears, a ring shrinking round them. At the lock (1.6 s before it
  // bursts) the ground splits under the circle: cracks run out with violet light in them and the dark opens, so the carrier sees where the hole
  // will be, and the seed falls from over their head into the split.
  TELLS.mgSeed = { ground(ctx, tg, s, p, k, t, env) {
    const left = (1 - p) * tg.dur, lock = tg.lockAt || 1.6, locked = left <= lock, q = locked ? clamp((lock - left) / 0.55, 0, 1) : 0, r = s.r;
    const e = tg.follow != null && env.entById ? env.entById(tg.follow) : null;
    const pulse = 0.5 + 0.5 * Math.sin(t * (4 + 14 * p));
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    // the dark gathering underfoot
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, r);
    g.addColorStop(0, rgba(C.void, (0.18 + 0.4 * p) * k)); g.addColorStop(0.8, rgba(C.voidMid, (0.1 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.violetDk, 0.05 * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    // hairline cracks creeping from the middle while it is still being carried
    const hair = clamp(p / 0.6, 0, 1);
    crackStar(ctx, s.x, s.y, r * 0.55 * hair, 7, tg.id, (0.25 + 0.3 * p) * k, { w: 1.2, jag: 4 });
    // the ring shrinking in on them
    for (const [w, a] of [[8, 0.12], [2.4, 0.85]]) { ctx.beginPath(); ctx.arc(s.x, s.y, r * (1 - 0.8 * p), 0, TAU); ctx.strokeStyle = rgba(C.violetHi, a * k * (locked ? 0.4 : 1)); ctx.lineWidth = w; ctx.stroke(); }
    ctx.setLineDash([5, 9]); ctx.lineDashOffset = t * 30; ctx.beginPath(); ctx.arc(s.x, s.y, r * (1.0 - 0.8 * p) * 0.72, 0, TAU); ctx.strokeStyle = rgba(C.violet, 0.5 * k * (locked ? 0.3 : 1)); ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
    if (locked) {
      // the ground splits: a ragged dark opening, cracks running out of it with violet light inside
      const R2 = r * 0.83 * easeOut(q);
      crackStar(ctx, s.x, s.y, r * 1.02 * easeOut(q), 12, tg.id + 7, (0.55 + 0.4 * q) * k, { w: 2.4, jag: 8 });
      pit(ctx, s.x, s.y, R2, k * (0.5 + 0.5 * q), tg.id);
      glow(ctx, s.x, s.y, r * 0.9, C.violet, 0.2 * q * k * (0.7 + 0.3 * Math.sin(t * 9)));
      // dust and splinters lifting off the lips
      for (let i = 0; i < 10; i++) { const a = hash(i, tg.id) * TAU, qq = (t * 0.9 + hash(i, 2)) % 1, d = R2 * (0.95 + 0.2 * qq); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.84 - qq * 22, 5 + 4 * qq, C.violetHi, 0.45 * (1 - qq) * q * k); }
    }
    ctx.restore();
    // the seed itself: over their head, then dropping into the split at the lock
    const hy = (e ? e.y - (e.lift || 0) : s.y) - 98 + Math.sin(t * 5) * 3, hx = e && !locked ? e.x : s.x;
    const sy = locked ? lerp(hy, s.y - 14, easeIn(q)) : hy, sx = locked ? lerp(hx, s.x, q) : hx;
    const sz = locked ? 1.5 - 0.55 * q : 1.4 + 0.15 * pulse;
    gem(ctx, sx, sy, sz, t, k * (locked ? 1 - 0.3 * q : 1), pulse);
  } };

  // Twin Seed's tether (ArenaView.tether hands over): a rope of dark root, straining; taut and bright once they are far enough apart,
  // slack and sagging, with a knot of dark gathering at the middle, when they are not
  function twin(ctx, a, b, th, t, d, ok) {
    const left = Math.max(0, th.end - t), p = 1 - left / Math.max(0.1, th.end - th.start);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 20, nx = -(b.y - a.y) / (d || 1), ny = (b.x - a.x) / (d || 1);
    const sag = ok ? 0 : 34 + Math.sin(t * 5) * 8, strain = ok ? 1 : 0.4;
    const P = curve(a.x, a.y - 20, mx + nx * sag, my + ny * sag, b.x, b.y - 20, 18);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // the rope: a dark root with a violet glow, its fibres twisting round it
    ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = rgba(C.violet, (ok ? 0.4 : 0.2) + 0.1 * Math.sin(t * 9)); ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = rgba(C.void, 0.95); ctx.lineWidth = 11; ctx.stroke();
    ctx.strokeStyle = rgba(ok ? C.violetHi : C.violet, ok ? 0.95 : 0.6 + 0.3 * Math.sin(t * 10)); ctx.lineWidth = 3.4; ctx.stroke();
    for (let f = 0; f < 3; f++) {
      ctx.beginPath();
      P.forEach(([x, y], i) => { const o = Math.sin(i * 1.1 - t * 6 + f * 2.1) * 4 * strain, nn = P[Math.min(P.length - 1, i + 1)], pp = P[Math.max(0, i - 1)], dx = nn[0] - pp[0], dy = nn[1] - pp[1], dd = Math.hypot(dx, dy) || 1; (i ? ctx.lineTo : ctx.moveTo).call(ctx, x - dy / dd * o, y + dx / dd * o); });
      ctx.strokeStyle = rgba(C.violetHi, 0.35); ctx.lineWidth = 1; ctx.stroke();
    }
    // a seed at each end, and a bead of dark running the rope faster as it nears bursting
    for (const e of [a, b]) gem(ctx, e.x, e.y - 90 + Math.sin(t * 5 + e.x) * 3, 0.85, t, 0.95, 0.5 + 0.5 * Math.sin(t * 9));
    const q = (t * (0.6 + p * 2.5)) % 1, i = Math.min(P.length - 1, Math.floor(q * (P.length - 1)));
    glow(ctx, P[i][0], P[i][1], 14, C.violetHi, 0.8);
    // slack: they would open one great hole between them; the middle of the rope darkens and the ground under it starts to crack
    if (!ok) { glow(ctx, mx, my + 20, 54, C.void, 0.5); for (let c2 = 0; c2 < 5; c2++) { const aa = c2 * TAU / 5 + 0.5; crackLine(ctx, mx, my + 22, mx + Math.cos(aa) * 40, my + 22 + Math.sin(aa) * 28, c2, 0.5 + 0.2 * Math.sin(t * 8), { w: 1.4, jag: 4 }); } }
    ctx.restore();
  }

  // Inhale: the Hunger breathing in. Dust, dead leaves and light stream across the whole room toward his split, quicker and thicker the nearer
  // it comes; violet roots glow along the floor toward his feet. There is nothing on the floor to stand outside of: the pull is the move.
  TELLS.mgInhale = { outline: false, ground(ctx, tg, s, p, k, t, env) {
    const R = AR(), cx = s.x, cy = s.y, sp = 0.45 + 1.7 * p;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    // roots glowing along the ground toward him
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + hash(i, 5) * 0.3, sw = 0.5 * (i % 2 ? 1 : -1);
      ctx.beginPath();
      for (let j = 0; j <= 10; j++) { const d = R * 1.05 * (1 - j / 10) + 40, an = a + sw * (1 - d / R); const x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d * 0.96; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = rgba(C.violetDk, (0.2 + 0.3 * p) * k); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = rgba(C.violet, (0.1 + 0.4 * p) * k * (0.7 + 0.3 * Math.sin(t * 6 + i))); ctx.lineWidth = 2; ctx.stroke();
    }
    // streams of dust and light curving in
    for (let i = 0; i < 40; i++) {
      const a = i * TAU / 40 + hash(i, 1) * 0.5, sw = 0.55 * (i % 2 ? 1 : -1), q = (t * sp * (0.55 + 0.8 * hash(i, 2)) + hash(i, 3)) % 1, d0 = R * 1.05 * (1 - q) + 30, len = 40 + 110 * p * (0.5 + hash(i, 4));
      const al = Math.sin(q * Math.PI) * (0.15 + 0.55 * p) * k;
      ctx.beginPath();
      for (let j = 0; j <= 5; j++) { const d = d0 + len * (j / 5), an = a + sw * (1 - d / R); const x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d * 0.96; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = rgba(i % 3 ? C.bone : C.violetHi, Math.min(1, al * 1.5)); ctx.lineWidth = 2.4 + 2.6 * hash(i, 6); ctx.stroke();
    }
    // dead leaves swept in
    for (let i = 0; i < 18; i++) {
      const a = hash(i, 8) * TAU, sw = 0.6, q = (t * sp * 0.5 + hash(i, 9)) % 1, d = R * (1 - q * 0.95) + 40, an = a + sw * (1 - d / R);
      leaf(ctx, cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.96 - 8 * Math.sin(q * Math.PI), an + q * 9, 7 + 4 * hash(i, 10), hash(i, 11) < 0.7 ? C.leaf : '#8a6a2a', Math.sin(q * Math.PI) * (0.4 + 0.5 * p) * k);
    }
    // the split breathing in: a dark wheel at his feet and the glow in his chest
    for (let i = 0; i < 3; i++) { const q = (1 - (t * (0.8 + p) + i / 3) % 1), rr = 30 + 190 * q; ctx.beginPath(); ctx.ellipse(cx, cy + 16, rr, rr * 0.4, 0, 0, TAU); ctx.strokeStyle = rgba(C.violetHi, (1 - q) * (0.1 + 0.5 * p) * k); ctx.lineWidth = 2; ctx.stroke(); }
    glow(ctx, cx, cy + 10, 90 + 120 * p, C.void, (0.2 + 0.4 * p) * k);
    ctx.restore();
    glow(ctx, cx, cy + SPLIT, 40 + 70 * p, C.violet, (0.15 + 0.5 * p) * k * (0.8 + 0.2 * Math.sin(t * 8)));
    glow(ctx, cx, cy + SPLIT, 18 + 20 * p, C.violetHi, (0.2 + 0.5 * p) * k);
  } };

  // ---------------------------------------------------------------- Fourfold Bloom
  // Four petals, one object each: thorn (green, thorny), frost (ice blue), spark (gold, crackling), blight (violet, rotten). Each leans
  // (its vines and shards bend) the way it will turn, with turn arrows curling along it; after the first snap the second set is already
  // turned, and a swept smear shows the way it went.
  function bloomInfo(tg) {
    const ev = evs().mgbloom, dir = ev ? (ev.dir || 1) : 1;
    return { dir, second: !!ev && tg.start - ev.start > (ev.at || 3) * 0.6 };
  }
  // the turn arrows: two chevrons curling along an arc, pointing the way the petals will go
  function turnArrows(c, s, o, col, k, reach) {
    const { dir, second } = o; if (second) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let j = 0; j < 3; j++) {
      const rr = reach * (0.42 + 0.21 * j), span = s.arc * 0.3 + 0.08, aTail = s.angle - dir * span, aHead = s.angle + dir * span, ph = ((o.t * 0.5) + j * 0.33) % 1;
      // a curved shaft that fills in the way the petals will go, ending in a chevron
      const aMid = aTail + (aHead - aTail) * (0.25 + 0.75 * ph);
      c.beginPath(); c.arc(s.x, s.y, rr, Math.min(aTail, aMid), Math.max(aTail, aMid)); c.strokeStyle = rgba('#05020a', 0.45 * k); c.lineWidth = 8; c.stroke(); c.strokeStyle = rgba(col, (0.55 + 0.3 * Math.sin(ph * Math.PI)) * k); c.lineWidth = 3.4; c.stroke();
      const px = s.x + Math.cos(aMid) * rr, py = s.y + Math.sin(aMid) * rr;
      c.save(); c.translate(px, py); c.rotate(aMid + (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      c.beginPath(); c.moveTo(-11, -13); c.lineTo(0, 3); c.lineTo(11, -13); c.strokeStyle = rgba('#05020a', 0.5 * k); c.lineWidth = 7; c.stroke(); c.strokeStyle = rgba(col, 0.95 * k); c.lineWidth = 3.4; c.stroke(); c.restore();
    }
    c.restore();
  }
  const PETAL = {};
  PETAL.thorn = (c, o) => {
    const { s, p, k, t, pt, reach, half } = o;
    // the green of it, thickening toward the tip
    c.beginPath(); c.moveTo(s.x, s.y); for (let i = 0; i <= 16; i++) { const th = -half + i / 16 * 2 * half, [x, y] = pt(reach, th); c.lineTo(x, y); } c.closePath();
    const [gx, gy] = pt(reach, 0), g = c.createLinearGradient(s.x, s.y, gx, gy); g.addColorStop(0, rgba(C.thornDk, 0.2 * k)); g.addColorStop(1, rgba(C.thorn, (0.2 + 0.14 * p) * k)); c.fillStyle = g; c.fill();
    c.lineCap = 'round'; c.lineJoin = 'round';
    const N = 9;
    for (let i = 0; i < N; i++) {
      const th = (-1 + (2 * i + 1) / N) * half * 0.94, pts = [], pts2 = [];
      for (let d = 50; d <= reach; d += 20) { const w = Math.sin(d * 0.045 + i * 1.7) * 0.03; pts.push(pt(d, th + w)); pts2.push(pt(d, th - w * 0.9 + 0.012)); }
      if (pts.length < 2) continue;
      for (const [P, w0, fill] of [[pts2, 8, rgba('#18380c', 0.9 * k)], [pts, 12, rgba(C.thornDk, 0.95 * k)]]) taper(c, P, w0, 3, fill, rgba('#0a1a06', 0.85 * k), 1.2);
      c.beginPath(); pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = rgba(C.thorn, 0.85 * k); c.lineWidth = 2.6; c.stroke();
      // thorns at every joint, alternating sides, gold at the tip
      for (let j = 1; j < pts.length - 1; j++) {
        const [x, y] = pts[j], [x2, y2] = pts[j + 1], dd = Math.hypot(x2 - x, y2 - y) || 1, ux = (x2 - x) / dd, uy = (y2 - y) / dd, sd = j % 2 ? 1 : -1, ln = 17 + 10 * hash(j, i), bw = 4.5;
        c.beginPath(); c.moveTo(x - uy * bw * sd - ux * 3, y + ux * bw * sd - uy * 3); c.lineTo(x + ux * 9 - uy * ln * sd, y + uy * 9 + ux * ln * sd); c.lineTo(x + ux * 4, y + uy * 4); c.closePath();
        c.fillStyle = rgba(C.thornTip, 0.95 * k); c.fill(); c.strokeStyle = rgba('#3a2a08', 0.8 * k); c.lineWidth = 1; c.stroke();
      }
    }
    // the border thorns, big, along both edges
    for (const sd of [-1, 1]) for (let d = 70; d < reach; d += 46) {
      const [x, y] = pt(d, sd * half * 0.985), a = s.angle + sd * half * 0.985 + o.lean * (d / 700), ln = 30 + 14 * hash(d | 0, 3);
      c.beginPath(); c.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9); c.lineTo(x + Math.cos(a - sd * 1.3) * ln + Math.cos(a) * 8, y + Math.sin(a - sd * 1.3) * ln + Math.sin(a) * 8); c.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); c.closePath();
      c.fillStyle = rgba(C.thornTip, 0.92 * k); c.fill(); c.strokeStyle = rgba('#3a2a08', 0.8 * k); c.lineWidth = 1.2; c.stroke();
    }
    turnArrows(c, s, o, C.thornTip, k, reach);
  };
  PETAL.frost = (c, o) => {
    const { s, p, k, t, pt, reach, half } = o;
    c.beginPath(); c.moveTo(s.x, s.y); for (let i = 0; i <= 12; i++) { const th = -half + i / 12 * 2 * half, [x, y] = pt(reach, th); c.lineTo(x, y); } c.closePath();
    const [gx, gy] = pt(reach, 0), g = c.createLinearGradient(s.x, s.y, gx, gy); g.addColorStop(0, rgba(C.frostDk, 0.25 * k)); g.addColorStop(1, rgba(C.frost, (0.28 + 0.16 * p) * k)); c.fillStyle = g; c.fill();
    c.lineJoin = 'round';
    // ice shards, long and thin, jutting out along the whole cone
    const n = 26;
    for (let i = 0; i < n; i++) {
      const th = (hash(i, 9) * 2 - 1) * half * 0.88, d0 = 50 + (reach - 120) * (i / n) + 30 * hash(i, 1), len = Math.min(reach - d0 + 20, 90 + 170 * hash(i, 2)); if (len < 24) continue;
      const [x0, y0] = pt(d0, th), [x1, y1] = pt(d0 + len, th + 0.045 * (hash(i, 8) - 0.5)), dx = x1 - x0, dy = y1 - y0, dd = Math.hypot(dx, dy) || 1, wv = 7 + 8 * hash(i, 3);
      c.beginPath(); c.moveTo(x0 - dy / dd * wv, y0 + dx / dd * wv); c.lineTo(x1, y1); c.lineTo(x0 + dy / dd * wv, y0 - dx / dd * wv); c.closePath();
      const gg = c.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, rgba(C.frost, 0.7 * k)); gg.addColorStop(1, rgba(C.frostHi, 0.98 * k)); c.fillStyle = gg; c.fill();
      c.strokeStyle = rgba('#ffffff', 0.85 * k); c.lineWidth = 1.4; c.stroke();
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = rgba(C.frostDk, 0.6 * k); c.lineWidth = 1; c.stroke();
    }
    // the cone's spine: one long frost-rimed blade down the middle
    { const [x0, y0] = pt(60, 0), [x1, y1] = pt(reach, 0), dx = x1 - x0, dy = y1 - y0, dd = Math.hypot(dx, dy) || 1; c.beginPath(); c.moveTo(x0 - dy / dd * 11, y0 + dx / dd * 11); c.lineTo(x1, y1); c.lineTo(x0 + dy / dd * 11, y0 - dx / dd * 11); c.closePath(); c.fillStyle = rgba(C.frostHi, 0.4 * k); c.fill(); c.strokeStyle = rgba('#ffffff', 0.8 * k); c.lineWidth = 1.6; c.stroke(); }
    // crystals glinting, mist crawling
    for (let i = 0; i < 22; i++) { const q = (t * 0.5 + hash(i, 4)) % 1, [x, y] = pt(70 + hash(i, 5) * (reach - 70), (hash(i, 6) * 2 - 1) * half * 0.9); glow(c, x, y, 6 + 7 * Math.sin(q * Math.PI), '#ffffff', 0.75 * Math.sin(q * Math.PI) * k); }
    for (let i = 0; i < 9; i++) { const [x, y] = pt(100 + hash(i, 7) * (reach - 100), (hash(i, 8) * 2 - 1) * half * 0.7); glow(c, x + Math.sin(t * 0.8 + i) * 12, y, 44, C.frost, 0.16 * k); }
    turnArrows(c, s, o, C.frostHi, k, reach);
  };
  PETAL.spark = (c, o) => {
    const { s, p, k, t, pt, reach, half } = o, fr = Math.floor(t * 14);
    c.beginPath(); c.moveTo(s.x, s.y); for (let i = 0; i <= 16; i++) { const th = -half + i / 16 * 2 * half, [x, y] = pt(reach, th); c.lineTo(x, y); } c.closePath();
    const [gx, gy] = pt(reach, 0), g = c.createLinearGradient(s.x, s.y, gx, gy); g.addColorStop(0, rgba(C.spark, 0.12 * k)); g.addColorStop(1, rgba(C.spark, (0.2 + 0.14 * p) * k)); c.fillStyle = g; c.fill();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // lightning running down the petal, forking, redrawn a dozen times a second
    for (let i = 0; i < 10; i++) {
      const th = (-1 + (2 * i + 1) / 10) * half * 0.92; if ((fr + i) % 5 === 0) continue;
      const P = []; P.push(pt(50, th));
      for (let d = 50 + 26; d <= reach; d += 26) { const w = (hash(d | 0, fr * 3 + i) - 0.5) * 0.1; P.push(pt(d, th + w)); }
      c.beginPath(); P.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = rgba(C.spark, 0.55 * k); c.lineWidth = 7; c.stroke(); c.strokeStyle = rgba(C.sparkHi, 0.98 * k); c.lineWidth = 2.2; c.stroke();
      // a fork off it
      const j = 3 + ((fr + i) % 5), [fx, fy] = P[Math.min(P.length - 1, j)], [gx2, gy2] = pt(50 + 26 * j + 60, th + (hash(i, fr) - 0.5) * 0.3);
      c.beginPath(); zigPath(c, fx, fy, gx2, gy2, fr + i, 7, 18); c.strokeStyle = rgba(C.sparkHi, 0.7 * k); c.lineWidth = 1.4; c.stroke();
    }
    // a net of arcs across it, sparks jumping
    for (let r2 = 140; r2 < reach; r2 += 100) {
      c.beginPath(); for (let i = 0; i <= 16; i++) { const th = -half + i / 16 * 2 * half, jj = (hash(i + r2, fr) - 0.5) * 16, [x, y] = pt(r2 + jj, th); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = rgba(C.spark, (0.24 + 0.22 * p) * k); c.lineWidth = 1.8; c.stroke();
    }
    for (let i = 0; i < 20; i++) { const [x, y] = pt(70 + hash(i + fr, 3) * (reach - 70), (hash(i + fr, 4) * 2 - 1) * half * 0.95); glow(c, x, y, 8 + 8 * hash(i, 5), C.sparkHi, 0.7 * k); }
    turnArrows(c, s, o, C.sparkHi, k, reach);
  };
  PETAL.blight = (c, o) => {
    const { s, p, k, t, pt, reach, half } = o;
    c.beginPath(); c.moveTo(s.x, s.y); for (let i = 0; i <= 10; i++) { const th = -half + i / 10 * 2 * half, [x, y] = pt(reach, th); c.lineTo(x, y); } c.closePath();
    const [gx, gy] = pt(reach, 0), g = c.createLinearGradient(s.x, s.y, gx, gy); g.addColorStop(0, rgba(C.blightDk, 0.35 * k)); g.addColorStop(1, rgba('#2a0a44', (0.5 + 0.12 * p) * k)); c.fillStyle = g; c.fill();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // rotten vines, hanging and curling, with sores along them
    for (let i = 0; i < 5; i++) {
      const th = (-1 + (2 * i + 1) / 5) * half * 0.85, pts = [];
      for (let d = 50; d <= reach; d += 20) pts.push(pt(d, th + Math.sin(d * 0.05 + i * 2.2 + t * 0.6) * 0.07));
      taper(c, pts, 15, 3, rgba('#2a0a44', 0.92 * k), rgba(C.blightHi, 0.6 * k), 1.4);
      for (let j = 2; j < pts.length; j += 3) { const [x, y] = pts[j]; ellipse(c, x, y, 9, 6.5, 0, rgba(C.blight, 0.7 * k), rgba('#12001e', 0.7 * k), 1); circle(c, x - 1.5, y - 1.5, 2.4, rgba(C.blightHi, 0.9 * k)); }
    }
    // sores bubbling in the floor
    for (let i = 0; i < 24; i++) {
      const [x, y] = pt(80 + hash(i, 2) * (reach - 80), (hash(i, 3) * 2 - 1) * half * 0.85), q = (t * 0.7 + hash(i, 4)) % 1, rr = 12 + 16 * hash(i, 5);
      ellipse(c, x, y, rr, rr * 0.7, 0, rgba('#12001e', 0.75 * k), rgba(C.blight, 0.85 * k), 2);
      circle(c, x + rr * 0.2, y - rr * 0.6 * q, 2.5 + 4 * q, rgba(C.blightHi, 0.9 * (1 - q) * k));
    }
    // spores drifting
    for (let i = 0; i < 18; i++) { const q = (t * 0.35 + hash(i, 6)) % 1, [x, y] = pt(70 + hash(i, 7) * (reach - 70), (hash(i, 8) * 2 - 1) * half * 0.8); glow(c, x + Math.sin(t + i) * 9, y - q * 32, 9, C.blightHi, 0.65 * (1 - q) * k); }
    turnArrows(c, s, o, C.blightHi, k, reach);
  };
  function petalTell(kind) {
    return { ground(ctx, tg, s, p, k, t, env) {
      const bi = bloomInfo(tg), L = Math.min(s.r, 740);
      const reach = L * (bi.second ? 0.6 + 0.4 * easeOut(p) : easeOut(clamp(p * 1.3, 0, 1)));
      const lean = bi.second ? 0 : 0.5 * bi.dir, half = s.arc / 2;
      const pt = (d, th) => { const a = s.angle + th + lean * (d / 700); return [s.x + Math.cos(a) * d, s.y + Math.sin(a) * d]; };
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      PETAL[kind](ctx, { s, p, k, t, pt, reach, half, lean, dir: bi.dir, second: bi.second });
      // the second snap: the smear of the turn just made, curling away behind the petal
      if (bi.second) {
        const sm = 1 - clamp((t - tg.start) / 0.7, 0, 1);
        if (sm > 0.01) for (let j = 0; j < 7; j++) {
          const rr = 90 + j * 90, a1 = s.angle - bi.dir * Math.PI / 4 * (1 - 0.15 * j / 7), a0 = s.angle;
          ctx.beginPath(); ctx.arc(s.x, s.y, rr, Math.min(a0, a1), Math.max(a0, a1)); ctx.strokeStyle = rgba(kindCol(kind), 0.5 * sm * k); ctx.lineWidth = 4 - 0.4 * j; ctx.lineCap = 'round'; ctx.stroke();
        }
      }
      ctx.restore();
    } };
  }
  const kindCol = kind => ({ thorn: C.thorn, frost: C.frostHi, spark: C.sparkHi, blight: C.blightHi }[kind]);
  TELLS.mgThorn = petalTell('thorn'); TELLS.mgFrost = petalTell('frost'); TELLS.mgSpark = petalTell('spark'); TELLS.mgBlight = petalTell('blight');

  // ---------------------------------------------------------------- Root Lash
  // The shared tankbuster draws its red wash and hands over: a great root arching in from his base and hanging over them in claws, lowering as
  // it nears; root-tips bristling up round the ring and bending in; the earth cracking
  function buster(ctx, tg, s, p, k, t, env) {
    const r = s.r, b = env && env.boss, bx = b ? b.x : s.x, by = b ? b.y : s.y - 320;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, r);
    g.addColorStop(0, rgba('#0a0604', (0.25 + 0.4 * p) * k)); g.addColorStop(1, rgba('#0a0604', (0.05 + 0.12 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    if (p > 0.3) { const q = (p - 0.3) / 0.7; crackStar(ctx, s.x, s.y, r * 0.95 * q, 9, tg.id, 0.6 * q * k, { w: 1.6, jag: 6, col: '#c05a30', ink: '#1a0804' }); }
    // root-tips rising round the ring and leaning in over it
    const grow = easeOut(clamp(p * 1.3, 0, 1));
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10 + hash(i, tg.id) * 0.3, x0 = s.x + Math.cos(a) * r * 0.97, y0 = s.y + Math.sin(a) * r * 0.97 * 0.9, h = 70 * grow * (0.7 + 0.5 * hash(i, 2));
      const pts = curve(x0, y0, x0 - Math.cos(a) * 18, y0 - h * 0.9, x0 - Math.cos(a) * h * 0.7, y0 - h, 8);
      taper(ctx, pts, 9, 1.5, rgba(C.bark, 0.9 * k), rgba('#120a04', 0.9 * k), 1.2);
    }
    ctx.restore();
    // the great root
    const lift = (1 - easeIn(p)) * 150 + Math.sin(t * 4) * 8 * (1 - p), ex = s.x, ey = s.y - lift, a = (0.35 + 0.6 * p) * k;
    const pts = curve(bx, by - 10, (bx + ex) / 2 + 30, Math.min(by, ey) - 190, ex, ey, 16);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    taper(ctx, pts, 58, 20, rgba('#5a4630', 0.97 * a), rgba('#120a04', 0.97 * a), 3); taper(ctx, pts, 58, 20, null, rgba('#ff9a5a', 0.55 * a), 1.2);
    ctx.strokeStyle = rgba(C.earthHi, 0.4 * a); ctx.lineWidth = 1.4;
    for (let o = -1; o <= 1; o += 2) { ctx.beginPath(); pts.forEach(([x, y], i) => { const w = lerp(40, 14, i / 16) * 0.22 * o; (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + w, y - w * 0.5); }); ctx.stroke(); }
    // the claws at its end, splayed and closing
    for (let i = -2; i <= 2; i++) {
      const sp = i * 0.34 * (1.15 - 0.35 * p), cl = curve(ex, ey, ex + i * 22, ey + 18, ex + Math.sin(sp) * 64, ey + Math.cos(sp) * 46 + 10, 6);
      taper(ctx, cl, 18, 3, rgba('#4a3826', 0.97 * a), rgba('#120a04', 0.97 * a), 1.8);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- Sap Tide
  // The whole floor weeping amber: fissures opening and lit from inside, blobs of sap welling up out of them and swelling
  TELLS.mgSap = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const R = AR();
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    ctx.fillStyle = rgba(C.sap, (0.03 + 0.1 * p) * k); ctx.fillRect(-R - 20, -R - 20, R * 2 + 40, R * 2 + 40);
    for (let i = 0; i < 34; i++) {
      const a0 = hash(i, 1) * TAU, d0 = Math.sqrt(hash(i, 2)) * R * 0.95, x = Math.cos(a0) * d0, y = Math.sin(a0) * d0 * 0.96, a = hash(i, 3) * TAU, len = (90 + 150 * hash(i, 4)) * clamp(p * 1.7 - hash(i, 5) * 0.6, 0, 1);
      if (len < 6) continue;
      crackLine(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.8, i, (0.35 + 0.6 * p) * k, { w: 2.6 + 2 * p, jag: 9, seg: 22, col: C.sap, ink: C.sapDk });
      ctx.beginPath(); zigPath(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.8, i, 9, 22); ctx.strokeStyle = rgba(C.sapHi, (0.2 + 0.4 * p) * k); ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 22; i++) {
      const a = hash(i, 11) * TAU, d = Math.sqrt(hash(i, 12)) * R * 0.92, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.96, gr = easeOut(clamp(p * 1.5 - hash(i, 13) * 0.5, 0, 1)), rr = (12 + 30 * hash(i, 14)) * gr;
      if (rr < 3) continue;
      const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.35, rr * 0.1, x, y, rr); g.addColorStop(0, rgba(C.sapHi, 0.95 * k)); g.addColorStop(0.55, rgba(C.sap, 0.9 * k)); g.addColorStop(1, rgba(C.sapDk, 0.9 * k));
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.72, 0, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba('#3a1a02', 0.7 * k); ctx.lineWidth = 1.4; ctx.stroke();
      ellipse(ctx, x - rr * 0.3, y - rr * 0.3, rr * 0.3, rr * 0.14, -0.4, rgba('#ffffff', 0.6 * k));
    }
    for (let i = 0; i < 26; i++) { const q = (t * 0.45 + hash(i, 15)) % 1, a = hash(i, 16) * TAU, d = Math.sqrt(hash(i, 17)) * R * 0.9; glow(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.96 - q * 40, 6 + 4 * q, C.sapHi, 0.4 * (1 - q) * (0.3 + p) * k); }
    ctx.restore();
  } };

  // ---------------------------------------------------------------- Hungering Dark (Hard)
  // The ground round a hole leaning in: a shadow thickening toward the rim, cracks running to it, rings of chevrons pointing in, dust sliding
  TELLS.mgDark = { ground(ctx, tg, s, p, k, t) {
    const R = s.r, r0 = s.r2 != null ? s.r2 : 0;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, Math.max(1, r0), s.x, s.y, R);
    g.addColorStop(0, rgba(C.void, (0.45 + 0.35 * p) * k)); g.addColorStop(0.6, rgba(C.voidMid, (0.2 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.violetDk, 0.04 * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - R, s.y - R, R * 2, R * 2);
    // cracks, running from the outer edge in toward the lip
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + hash(i, tg.id) * 0.2, q = clamp(p * 1.5 - hash(i, 3) * 0.4, 0, 1), d1 = lerp(R, r0 + 4, q);
      crackLine(ctx, s.x + Math.cos(a) * R, s.y + Math.sin(a) * R * 0.92, s.x + Math.cos(a) * d1, s.y + Math.sin(a) * d1 * 0.92, tg.id + i, (0.3 + 0.6 * p) * k, { w: 1.8, jag: 5, seg: 18 });
    }
    // chevrons pointing in, drawing toward the hole faster as it nears
    for (let j = 0; j < 14; j++) {
      const a = j * TAU / 14 + 0.2, q = (t * (0.5 + 1.2 * p) + (j % 3) / 3) % 1, d = lerp(R - 10, r0 + 14, q), al = Math.sin(q * Math.PI) * (0.3 + 0.5 * p) * k;
      ctx.save(); ctx.translate(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.92); ctx.rotate(a + Math.PI);
      ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(4, 0); ctx.lineTo(-8, 9); ctx.strokeStyle = rgba(C.violetHi, Math.min(1, al * 1.4)); ctx.lineWidth = 3.6; ctx.stroke(); ctx.restore();
    }
    glow(ctx, s.x, s.y, R * 0.9, C.violet, (0.05 + 0.12 * p) * k);
    ctx.restore();
  } };

  // The Swallowing's blow: the dark comes in off the rim and the whole floor rings with violet seams
  TELLS.mgSwallow = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const R = AR();
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    const g = ctx.createRadialGradient(0, 0, R * (0.95 - 0.55 * p), 0, 0, R * 1.05); g.addColorStop(0, rgba(C.void, 0)); g.addColorStop(1, rgba(C.void, (0.3 + 0.4 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(-R - 20, -R - 20, R * 2 + 40, R * 2 + 40);
    for (let i = 0; i < 20; i++) { const a = hash(i, 1) * TAU, d0 = R * (0.2 + 0.7 * hash(i, 2)); crackLine(ctx, Math.cos(a) * d0, Math.sin(a) * d0 * 0.96, Math.cos(a + 0.3) * (d0 + 120 * p), Math.sin(a + 0.3) * (d0 + 120 * p) * 0.96, i, (0.3 + 0.6 * p) * k * (0.7 + 0.3 * Math.sin(t * 9 + i)), { w: 2.2, jag: 9 }); }
    for (let i = 0; i < 3; i++) { const q = (t * (0.5 + p) + i / 3) % 1; ctx.beginPath(); ctx.arc(0, 0, R * (1 - q * 0.85), 0, TAU); ctx.strokeStyle = rgba(C.violetHi, 0.4 * Math.sin(q * Math.PI) * (0.3 + p) * k); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  } };

  // ---------------------------------------------------------------- the limbs
  // Cleaver Bough's soak: blue rings drawing in, and the orange line the chop will run down already glowing from the bough, through the
  // circle, to the wall
  TELLS.mgCleave = { ground(ctx, tg, s, p, k, t, env) {
    const r = s.r;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 8, s.x, s.y, r); g.addColorStop(0, rgba(C.shareHi, (0.16 + 0.2 * p) * k)); g.addColorStop(0.7, rgba(C.share, (0.1 + 0.1 * p) * k)); g.addColorStop(1, rgba(C.share, (0.04 + 0.06 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, r * (1 - q * 0.82), 0, TAU); ctx.strokeStyle = rgba(C.shareHi, (0.55 * Math.sin(q * Math.PI) + 0.1) * k); ctx.lineWidth = 2.2; ctx.stroke(); }
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + 0.2, q = (t * 0.9 + i * 0.125) % 1, d = r * (0.92 - 0.58 * q), al = Math.sin(q * Math.PI) * (0.5 + 0.4 * p) * k;
      ctx.save(); ctx.translate(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d); ctx.rotate(a + Math.PI);
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(3, 0); ctx.lineTo(-9, 8); ctx.strokeStyle = rgba('#ffffff', al); ctx.lineWidth = 2.6; ctx.stroke(); ctx.restore();
    }
    glow(ctx, s.x, s.y, r * 0.5, C.shareHi, (0.12 + 0.3 * p * p) * k);
    ctx.restore();
    // the line of the chop to come: from the bough through the middle of the soak, to the wall
    const L = limbPos(env, 'cleaver');
    if (L) {
      const a = Math.atan2(s.y - L.y, s.x - L.x), ca = Math.cos(a), sa = Math.sin(a), ex = L.x + ca * 2600, ey = L.y + sa * 2600;
      ctx.save(); clipRoom(ctx); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(ex, ey); ctx.strokeStyle = rgba(C.cleaverDk, 0.3 * k); ctx.lineWidth = 6; ctx.stroke();
      ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 60; ctx.strokeStyle = rgba(C.cleaver, (0.35 + 0.5 * p) * k); ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]);
      for (let d = 80 + (t * 120) % 140; d < 1400; d += 140) { ctx.save(); ctx.translate(L.x + ca * d, L.y + sa * d); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(3, 0); ctx.lineTo(-8, 7); ctx.strokeStyle = rgba(C.cleaverHi, (0.25 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      ctx.restore();
    }
  } };

  // Cleaver Bough's chop: the lane heating from the bough outward, a white-hot seam down it, embers streaming along, chevrons running the way it falls
  TELLS.mgChop = { ground(ctx, tg, s, p, k, t) {
    lane(ctx, s, (L, hw) => {
      const X = L * easeOut(clamp(p * 1.4, 0, 1));
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.cleaverDk, 0)); g.addColorStop(0.5, rgba(C.cleaver, (0.22 + 0.4 * p) * k)); g.addColorStop(1, rgba(C.cleaverDk, 0));
      ctx.fillStyle = g; ctx.fillRect(0, -hw, X, hw * 2);
      ctx.lineCap = 'round';
      // splits opening along the lane edges
      for (const sd of [-1, 1]) { ctx.beginPath(); for (let x = 0; x <= X; x += 20) { const y = sd * hw * (0.86 + 0.06 * Math.sin(x * 0.09 + sd) + 0.05 * hash(x | 0, tg.id)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.strokeStyle = rgba('#1a0804', 0.5 * k); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = rgba(C.cleaver, (0.3 + 0.4 * p) * k); ctx.lineWidth = 1.8; ctx.stroke(); }
      // the seam: the blade's path, glowing
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(X, 0); ctx.strokeStyle = rgba('#3a1004', 0.6 * k); ctx.lineWidth = 14; ctx.stroke();
      ctx.strokeStyle = rgba(C.cleaver, (0.5 + 0.5 * p) * k); ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = rgba(C.cleaverHi, (0.5 + 0.5 * p) * k); ctx.lineWidth = 2.4; ctx.stroke();
      // embers drifting off it, rust flakes
      for (let i = 0; i < 30; i++) { const x = hash(i, tg.id) * X, q = (t * 0.7 + hash(i, 2)) % 1, y = (hash(i, 3) - 0.5) * hw * 1.3 - q * 30; glow(ctx, x, y, 4 + 5 * q, i % 3 ? C.cleaver : C.cleaverHi, 0.55 * (1 - q) * (0.3 + p) * k); }
      for (let i = 0, n = Math.max(1, Math.round(X / 70)); i < n; i++) { const x = ((i / n) * X + t * (140 + 260 * p)) % Math.max(1, X); ctx.beginPath(); ctx.moveTo(x - 12, -hw * 0.3); ctx.lineTo(x, 0); ctx.lineTo(x - 12, hw * 0.3); ctx.strokeStyle = rgba(C.cleaverHi, (0.3 + 0.5 * p) * k); ctx.lineWidth = 2.2; ctx.stroke(); }
      glow(ctx, 0, 0, hw * 1.6, C.cleaver, (0.15 + 0.3 * p) * k);
    }, true);
  } };

  // Brood Roots: root-strands from the limb: a lit vein down each with side-veins, silk threads strung across between its edges
  TELLS.mgRoots = { ground(ctx, tg, s, p, k, t) {
    lane(ctx, s, (L, hw) => {
      const X = Math.min(L, AR() * 1.4) * easeOut(clamp(p * 1.5, 0, 1)), pul = 0.7 + 0.3 * Math.sin(t * 6 + tg.id);
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.brood, 0)); g.addColorStop(0.5, rgba(C.brood, (0.18 + 0.26 * p) * k)); g.addColorStop(1, rgba(C.brood, 0));
      ctx.fillStyle = g; ctx.fillRect(0, -hw, X, hw * 2);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // silk strung across the strand
      for (let x = 36; x < X; x += 46) {
        const sag = 7 + 5 * hash(x | 0, tg.id), ph = Math.sin(t * 3 + x * 0.05) * 2;
        ctx.beginPath(); ctx.moveTo(x, -hw * 0.9); ctx.quadraticCurveTo(x + 16 + ph, 0 + sag * 0.3, x + 4, hw * 0.9); ctx.strokeStyle = rgba(C.silk, (0.45 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
      }
      // the main vein, jagged, with veinlets
      ctx.beginPath(); for (let x = 0; x <= X; x += 20) { const y = Math.sin(x * 0.06 + tg.id) * hw * 0.22 + (hash(x | 0, tg.id + 4) - 0.5) * 6; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = rgba(C.broodDk, 0.75 * k); ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = rgba(C.brood, (0.6 + 0.4 * p) * pul * k); ctx.lineWidth = 5.4; ctx.stroke(); ctx.strokeStyle = rgba(C.broodHi, (0.4 + 0.5 * p) * k); ctx.lineWidth = 1.8; ctx.stroke();
      for (let x = 50; x < X; x += 64) for (const sd of [-1, 1]) {
        const y0 = Math.sin(x * 0.06 + tg.id) * hw * 0.22, len = hw * (0.55 + 0.35 * hash(x | 0, sd + 3));
        ctx.beginPath(); zigPath(ctx, x, y0, x + 28, y0 + sd * len, x * sd, 4, 12); ctx.strokeStyle = rgba(C.brood, (0.45 + 0.45 * p) * pul * k); ctx.lineWidth = 2.6; ctx.stroke();
      }
      glow(ctx, 0, 0, hw * 1.6, C.brood, (0.15 + 0.3 * p) * k);
      glow(ctx, X, 0, hw * 1.1, C.broodHi, 0.3 * k * (p < 0.99 ? 1 : 0));
    }, true);
  } };

  // a lightning rod: a hexagonal cyan crystal on a ring of runes
  function rodCrystal(c, x, y, h, w, t, k, charge) {
    c.save();
    glow(c, x, y - h * 0.5, h * 0.9, C.storm, (0.25 + 0.4 * charge) * k);
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h * 0.78); c.lineTo(x, y - h); c.lineTo(x + w / 2, y - h * 0.78); c.lineTo(x + w / 2, y); c.closePath();
    const g = c.createLinearGradient(x - w / 2, y, x + w / 2, y); g.addColorStop(0, rgba(C.stormDk, 0.95 * k)); g.addColorStop(0.45, rgba(C.storm, 0.95 * k)); g.addColorStop(0.6, rgba(C.stormHi, 0.95 * k)); g.addColorStop(1, rgba(C.stormDk, 0.95 * k));
    c.fillStyle = g; c.fill(); c.lineJoin = 'round'; c.strokeStyle = rgba('#031a28', 0.9 * k); c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(x, y - h); c.lineTo(x - w * 0.04, y); c.moveTo(x - w / 2, y - h * 0.78); c.lineTo(x, y - h * 0.7); c.lineTo(x + w / 2, y - h * 0.78); c.strokeStyle = rgba('#ffffff', 0.45 * k); c.lineWidth = 1; c.stroke();
    glow(c, x, y - h, 16 + 18 * charge, C.stormHi, (0.3 + 0.6 * charge) * k * (0.7 + 0.3 * Math.sin(t * 22)));
    c.restore();
  }
  // Storm Knot: a rod at each centre on a spinning ring of runes, lightning arcing between the rods
  TELLS.mgRod = { ground(ctx, tg, s, p, k, t, env) {
    const r = s.r, fr = Math.floor(t * 14);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, r); g.addColorStop(0, rgba(C.storm, (0.12 + 0.22 * p) * k)); g.addColorStop(1, rgba(C.stormDk, (0.03 + 0.07 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    for (const [rr, sp, n] of [[r * 0.82, 0.25, 14], [r * 0.5, -0.4, 9]]) {
      ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, TAU); ctx.strokeStyle = rgba(C.storm, (0.3 + 0.35 * p) * k); ctx.lineWidth = 1.6; ctx.stroke();
      for (let i = 0; i < n; i++) { const a = i * TAU / n + t * sp; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * (rr - 7), s.y + Math.sin(a) * (rr - 7)); ctx.lineTo(s.x + Math.cos(a) * (rr + 7), s.y + Math.sin(a) * (rr + 7)); ctx.strokeStyle = rgba(C.stormHi, (0.35 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke(); }
    }
    // sparks crawling in the ground toward the rod
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + hash(i, tg.id) * 0.4, q = (t * (0.6 + p) + hash(i, 2)) % 1, d = r * 0.8 * (1 - q); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 6, C.stormHi, 0.6 * Math.sin(q * Math.PI) * k); }
    ctx.restore();
    // arcs to the other rods (drawn once per pair)
    if (env.tgs) for (const o of env.tgs.values()) {
      if (o === tg || o.tag !== 'mgRod' || o.gone != null || o.id < tg.id || Math.abs(o.start - tg.start) > 0.3) continue;
      const a = { x: s.x, y: s.y - 96 * (0.5 + 0.5 * easeOut(clamp(p * 3, 0, 1))) }, b = { x: o.live.x, y: o.live.y - 96 * (0.5 + 0.5 * easeOut(clamp(p * 3, 0, 1))) };
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 2; j++) { ctx.beginPath(); zigPath(ctx, a.x, a.y, b.x, b.y, fr * 7 + j + tg.id, 16, 26); ctx.strokeStyle = rgba(C.storm, (j ? 0.9 : 0.35) * (0.3 + 0.7 * p) * k); ctx.lineWidth = j ? 1.6 : 5; ctx.stroke(); }
      ctx.restore();
    }
    rodCrystal(ctx, s.x, s.y + 4, 96 * (0.5 + 0.5 * easeOut(clamp(p * 3, 0, 1))), 22, t, k, p);
  } };

  // a watching eye: an almond with a lit iris, rays above it
  function eye(c, x, y, sz, t, k, col, hi) {
    c.save(); c.translate(x, y);
    glow(c, 0, 0, 46 * sz, col, 0.4 * k);
    c.beginPath(); c.moveTo(-24 * sz, 0); c.quadraticCurveTo(0, -17 * sz, 24 * sz, 0); c.quadraticCurveTo(0, 17 * sz, -24 * sz, 0); c.closePath();
    c.fillStyle = rgba(C.lanternDk, 0.88 * k); c.fill(); c.strokeStyle = rgba(col, 0.95 * k); c.lineWidth = 2.2; c.stroke();
    const gx = Math.sin(t * 1.3) * 5 * sz;
    circle(c, gx, 0, 8 * sz, rgba(hi, 0.95 * k)); circle(c, gx, 0, 3.6 * sz, rgba('#04180c', 0.95 * k));
    c.strokeStyle = rgba(col, 0.7 * k); c.lineWidth = 1.6; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.42; c.beginPath(); c.moveTo(Math.cos(a) * 24 * sz, Math.sin(a) * 18 * sz - 4 * sz); c.lineTo(Math.cos(a) * 34 * sz, Math.sin(a) * 28 * sz - 4 * sz); c.stroke(); }
    c.restore();
  }
  // Barrow Lantern: pale grave-light: a ring of cold flame round them, wisps rising, the watching eye over their head
  TELLS.mgLantern = { ground(ctx, tg, s, p, k, t, env) {
    const r = s.r, e = tg.follow != null && env.entById ? env.entById(tg.follow) : null;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, r); g.addColorStop(0, rgba(C.lanternHi, (0.12 + 0.2 * p) * k)); g.addColorStop(0.7, rgba(C.lantern, (0.08 + 0.1 * p) * k)); g.addColorStop(1, rgba(C.lantern, (0.05 + 0.08 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + hash(i, 1) * 0.3, q = (t * 0.6 + hash(i, 2)) % 1, d0 = r * (0.78 + 0.18 * hash(i, 3)), x = s.x + Math.cos(a) * d0, y = s.y + Math.sin(a) * d0 * 0.9, h = 30 + 30 * hash(i, 4);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(t * 3 + i) * 5, y - h * 0.5, x + Math.sin(t * 2 + i) * 4, y - h * q); ctx.strokeStyle = rgba(C.lanternHi, 0.45 * (1 - q) * (0.4 + 0.6 * p) * k); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
    }
    for (let i = 0; i < 2; i++) { const q = (t * 0.5 + i / 2) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, r * (0.3 + 0.7 * q), 0, TAU); ctx.strokeStyle = rgba(C.lanternHi, 0.4 * (1 - q) * k); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    const ex = e ? e.x : s.x, ey = (e ? e.y - (e.lift || 0) : s.y) - 88 + Math.sin(t * 3) * 3;
    eye(ctx, ex, ey, 0.9, t, (0.55 + 0.4 * p) * k, C.lantern, C.lanternHi);
  } };

  // ---------------------------------------------------------------- Hard: the second set's limbs
  // Wyrm Wing: a bat-wing of bark and ember fanned out over half the room: ribs of burnt wood, the membrane scalloped between their tips, seams of ember
  TELLS.mgWing = { ground(ctx, tg, s, p, k, t) {
    const L = Math.min(s.r, 760), reach = L * easeOut(clamp(p * 1.3, 0, 1)), half = s.arc / 2, N = 6;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const tips = [];
    for (let i = 0; i < N; i++) { const th = -half * 0.88 + i * (2 * half * 0.88) / (N - 1), d = reach * (0.8 + 0.2 * Math.sin(i * 1.2 + 1)), a = s.angle + th; tips.push([s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, a]); }
    // the membrane between the ribs
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tips[0][0], tips[0][1]);
    for (let i = 1; i < N; i++) { const [x0, y0] = tips[i - 1], [x1, y1] = tips[i], mx = (x0 + x1) / 2, my = (y0 + y1) / 2; ctx.quadraticCurveTo(lerp(mx, s.x, 0.28), lerp(my, s.y, 0.28), x1, y1); }
    ctx.closePath();
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, reach); g.addColorStop(0, rgba('#2a0a04', (0.22 + 0.14 * p) * k)); g.addColorStop(1, rgba(C.wing, (0.24 + 0.24 * p) * k));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(C.wingHi, 0.3 * k); ctx.lineWidth = 1.4; ctx.stroke();
    // ribs
    ctx.lineCap = 'round';
    for (const [x, y, a] of tips) {
      const mx = (s.x + x) / 2 + Math.cos(a + 1.57) * 14, my = (s.y + y) / 2 + Math.sin(a + 1.57) * 14, pts = curve(s.x, s.y, mx, my, x, y, 10);
      taper(ctx, pts, 20, 4, rgba('#2a1408', 0.92 * k), rgba(C.wing, 0.8 * k), 1.8);
      ctx.beginPath(); pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.strokeStyle = rgba(C.wingHi, (0.3 + 0.5 * p) * (0.7 + 0.3 * Math.sin(t * 7 + a)) * k); ctx.lineWidth = 1.6; ctx.stroke();
    }
    for (let i = 0; i < 26; i++) { const a = s.angle + (hash(i, 1) * 2 - 1) * half * 0.85, d = hash(i, 2) * reach, q = (t * 0.6 + hash(i, 3)) % 1; glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 36, 5 + 4 * q, i % 3 ? C.wing : C.wingHi, 0.55 * (1 - q) * (0.3 + p) * k); }
    ctx.restore();
  } };

  // an ice-bound fist hanging over a point, closing
  function iceFist(c, x, y, R, k, lift, t) {
    c.save(); c.translate(x, y - lift);
    ellipse(c, 6, R * 0.6 + lift * 0.3, R * 0.95, R * 0.28, 0, rgba('#000000', 0.28 * k));
    c.lineJoin = 'round';
    // the back of the hand: a heavy block of frosted wood, the fingers curled into it along the front
    c.beginPath(); c.moveTo(-R * 0.9, R * 0.1); c.quadraticCurveTo(-R * 1.0, -R * 0.75, -R * 0.2, -R * 0.85); c.quadraticCurveTo(R * 0.7, -R * 0.95, R * 0.95, -R * 0.2); c.quadraticCurveTo(R * 1.0, R * 0.5, R * 0.4, R * 0.7); c.lineTo(-R * 0.5, R * 0.75); c.closePath();
    const g = c.createLinearGradient(-R, -R, R, R); g.addColorStop(0, rgba('#e8f8ff', 0.98 * k)); g.addColorStop(0.5, rgba('#8fc4e0', 0.98 * k)); g.addColorStop(1, rgba('#3a6a8a', 0.98 * k));
    c.fillStyle = g; c.fill(); c.strokeStyle = rgba('#0a2a3a', 0.95 * k); c.lineWidth = 3; c.stroke();
    c.strokeStyle = rgba('#1a3a52', 0.5 * k); c.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-R * 0.7 + i * R * 0.3, -R * 0.6); c.quadraticCurveTo(-R * 0.6 + i * R * 0.3, 0, -R * 0.75 + i * R * 0.32, R * 0.55); c.stroke(); }
    for (let i = 0; i < 4; i++) { const a = -0.5 + i * 0.36, fx = Math.cos(a) * R * 0.78 + R * 0.05, fy = R * 0.5 + Math.sin(a) * R * 0.12; ellipse(c, fx - R * 0.15, fy, R * 0.22, R * 0.2, a * 0.3, rgba('#cfeeff', 0.97 * k), rgba('#0a2a3a', 0.9 * k), 2.4); ellipse(c, fx - R * 0.2, fy - R * 0.06, R * 0.08, R * 0.05, 0, rgba('#ffffff', 0.9 * k)); }
    for (let i = 0; i < 7; i++) { const a = -2.7 + i * 0.5; spire(c, Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.6 - R * 0.25, R * 0.42, R * 0.16, a * 0.12, k, '#ffffff', C.frostDk, C.frostHi); }
    glow(c, 0, 0, R * 1.5, C.rime, 0.22 * k);
    c.restore();
  }
  // Frost Fist: an ice-bound fist hanging over them, lowering; frost-crystals rising round the ring and leaning in
  TELLS.mgRime = { ground(ctx, tg, s, p, k, t, env) {
    const r = s.r;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 8, s.x, s.y, r); g.addColorStop(0, rgba('#041420', (0.25 + 0.35 * p) * k)); g.addColorStop(1, rgba(C.frostDk, (0.05 + 0.1 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    const gr = easeOut(clamp(p * 1.4, 0, 1));
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + hash(i, 1) * 0.2, h = (36 + 44 * hash(i, 2)) * gr; spire(ctx, s.x + Math.cos(a) * r * 0.92, s.y + Math.sin(a) * r * 0.92 * 0.9, h, 15, Math.cos(a) * -0.3, 0.95 * k, '#ffffff', C.frostDk, C.frostHi); }
    for (let i = 0; i < 9; i++) { const q = (t * 0.4 + hash(i, 3)) % 1, a = hash(i, 4) * TAU, d = r * hash(i, 5) * 0.8; glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 20, 26, C.frost, 0.12 * Math.sin(q * Math.PI) * k); }
    ctx.restore();
    iceFist(ctx, s.x, s.y, r * 0.55 * (1.15 - 0.15 * p), (0.3 + 0.6 * p) * k, (1 - easeIn(p)) * 180, t);
  } };
  // the ice a Frost Fist leaves (ArenaView.drawPuddles hands over): a pale slick, cracked, glittering, with a red rim (it hurts and it slows)
  function puddle(ctx, p, r, k, t) {
    ctx.save(); ctx.globalAlpha = k;
    ctx.beginPath(); for (let i = 0; i <= 22; i++) { const a = i * TAU / 22, w = 1 + Math.sin(a * 5 + p.id) * 0.08 + Math.sin(a * 9) * 0.03, x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w * 0.9; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r); g.addColorStop(0, '#e8f8ff'); g.addColorStop(0.6, '#a8d8f0'); g.addColorStop(1, '#4a86a8');
    ctx.fillStyle = g; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#0a2a3a', 0.8); ctx.lineWidth = 8; ctx.stroke(); ctx.fill();
    ctx.strokeStyle = rgba(BossTells.COL.danger, 0.8); ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.clip();
    for (let i = 0; i < 9; i++) { const a = hash(i, p.id) * TAU, d = r * (0.4 + 0.6 * hash(i, 2)); crackLine(ctx, p.x, p.y, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.9, i, 0.7, { w: 1.2, jag: 5, col: '#ffffff', ink: '#2a6a8a' }); }
    for (let i = 0; i < 7; i++) { const q = (t * 0.5 + hash(i, 5)) % 1, a = hash(i, 6) * TAU, d = r * hash(i, 7) * 0.85; glow(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.9, 6 + 4 * q, '#ffffff', 0.7 * Math.sin(q * Math.PI)); }
    ctx.restore();
  }

  // a ring of rune marks: small glyphs spaced round a circle (the glyph is picked by hash: a cross, a triangle, a dotted bar, a zigzag)
  function glyphRing(c, x, y, r, n, rot, col, k, sz = 8, seed = 0) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = rgba(col, k); c.lineWidth = 2.8;
    for (let i = 0; i < n; i++) {
      const a = rot + i * TAU / n, gx = x + Math.cos(a) * r, gy = y + Math.sin(a) * r;
      c.save(); c.translate(gx, gy); c.rotate(a + Math.PI / 2); c.beginPath();
      switch (Math.floor(hash(i, seed) * 4)) {
        case 0: c.moveTo(-sz, 0); c.lineTo(sz, 0); c.moveTo(0, -sz); c.lineTo(0, sz); break;
        case 1: c.moveTo(0, -sz); c.lineTo(sz * 0.9, sz * 0.7); c.lineTo(-sz * 0.9, sz * 0.7); c.closePath(); break;
        case 2: c.moveTo(-sz, -sz * 0.4); c.lineTo(sz, -sz * 0.4); c.moveTo(-sz, sz * 0.4); c.lineTo(sz, sz * 0.4); c.moveTo(0, -sz); c.lineTo(0, sz); break;
        default: c.moveTo(-sz, sz * 0.6); c.lineTo(-sz * 0.4, -sz * 0.6); c.lineTo(sz * 0.4, sz * 0.6); c.lineTo(sz, -sz * 0.6); break;
      }
      c.stroke(); c.restore();
    }
    c.restore();
  }
  // Archmage Rune: a rune circle at his feet, rings and glyphs turning, a star of light inside
  TELLS.mgRune = { ground(ctx, tg, s, p, k, t) {
    const r = s.r, sp = 0.2 + 0.5 * p;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, r); g.addColorStop(0, rgba(C.runeHi, (0.1 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.rune, (0.04 + 0.08 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    for (const rr of [0.92, 0.7, 0.42]) { ctx.beginPath(); ctx.arc(s.x, s.y, r * rr, 0, TAU); ctx.strokeStyle = rgba(C.rune, (0.3 + 0.4 * p) * k); ctx.lineWidth = 1.6; ctx.stroke(); }
    glyphRing(ctx, s.x, s.y, r * 0.81, 18, t * sp, C.runeHi, (0.55 + 0.45 * p) * k, 13, tg.id);
    glyphRing(ctx, s.x, s.y, r * 0.56, 12, -t * sp * 1.3, C.rune, (0.55 + 0.45 * p) * k, 11, tg.id + 5);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(t * sp * 0.8); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI * 0.75, rr = r * 0.4; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
    ctx.strokeStyle = rgba(C.runeHi, (0.35 + 0.5 * p) * k); ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
    glow(ctx, s.x, s.y, r * 0.5, C.rune, (0.1 + 0.3 * p * p) * k);
    ctx.restore();
  } };
  // the ring round it: glyphs running outward across the whole outer floor, rings sliding in toward the circle
  TELLS.mgRuneRing = { ground(ctx, tg, s, p, k, t) {
    const r0 = s.r2 != null ? s.r2 : 270, sp = 0.15 + 0.5 * p;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ctx.fillStyle = rgba(C.rune, (0.05 + 0.1 * p) * k); ctx.fillRect(s.x - 1500, s.y - 1500, 3000, 3000);
    for (let j = 0; j < 5; j++) {
      const rr = r0 + 60 + j * 90, dir = j % 2 ? 1 : -1;
      ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, TAU); ctx.strokeStyle = rgba(C.rune, (0.2 + 0.3 * p) * k); ctx.lineWidth = 1.4; ctx.stroke();
      glyphRing(ctx, s.x, s.y, rr, 10 + j * 4, t * sp * dir, C.runeHi, (0.45 + 0.5 * p) * k, 13, tg.id + j);
    }
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, r0 + 40 + (1 - q) * 500, 0, TAU); ctx.strokeStyle = rgba(C.runeHi, 0.4 * Math.sin(q * Math.PI) * (0.3 + p) * k); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  } };
  // Hydra Head: the serpent's breath down the lane: scale-pattern in the water, droplets streaming off the head's end, chevrons running the way it goes
  TELLS.mgHead = { ground(ctx, tg, s, p, k, t) {
    lane(ctx, s, (L, hw) => {
      const X = Math.min(L, AR() * 1.4) * easeOut(clamp(p * 1.4, 0, 1));
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.head, 0.04 * k)); g.addColorStop(0.5, rgba(C.head, (0.24 + 0.3 * p) * k)); g.addColorStop(1, rgba(C.head, 0.06 * k));
      ctx.fillStyle = g; ctx.fillRect(0, -hw, X, hw * 2);
      ctx.lineJoin = 'round';
      for (let x = 30, row = 0; x < X; x += 30, row++) for (let y = -hw + (row % 2 ? 0 : 15); y < hw; y += 30) { ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x, y - 12); ctx.lineTo(x + 15, y); ctx.lineTo(x, y + 12); ctx.closePath(); ctx.strokeStyle = rgba(C.headHi, (0.2 + 0.35 * p) * k); ctx.lineWidth = 1.6; ctx.stroke(); }
      for (let i = 0; i < 22; i++) { const q = (t * (0.8 + p) + hash(i, tg.id)) % 1, x = q * X, y = (hash(i, 3) - 0.5) * hw * 1.4; glow(ctx, x, y, 5 + 4 * hash(i, 4), i % 3 ? C.head : C.headHi, 0.5 * Math.sin(q * Math.PI) * k); }
      for (let i = 0, n = Math.max(1, Math.round(X / 80)); i < n; i++) { const x = ((i / n) * X + t * (120 + 240 * p)) % Math.max(1, X); ctx.beginPath(); ctx.moveTo(x - 12, -hw * 0.3); ctx.lineTo(x, 0); ctx.lineTo(x - 12, hw * 0.3); ctx.strokeStyle = rgba(C.headHi, (0.3 + 0.5 * p) * k); ctx.lineWidth = 2.2; ctx.stroke(); }
      // the maw at the lane's start: a fan of fangs opening
      const op = 14 + 26 * p; ctx.fillStyle = rgba(C.headDk, 0.7 * k); ctx.beginPath(); ctx.moveTo(0, -op); ctx.lineTo(26, 0); ctx.lineTo(0, op); ctx.closePath(); ctx.fill();
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(2, i * op * 0.42); ctx.lineTo(16, i * op * 0.3); ctx.strokeStyle = rgba('#f0fff8', 0.7 * k); ctx.lineWidth = 2; ctx.stroke(); }
      glow(ctx, 0, 0, hw * 1.4, C.head, (0.15 + 0.3 * p) * k);
    }, true);
  } };

  // ---------------------------------------------------------------- what stays on the floor (boss-tells.js track() asks once per landed move)
  // quiet decals, cooling: never louder than the warning was (the holes themselves are the floor, drawn by arena-view.js)
  function aftermath(tg, env, A) {
    const { mark, AFTER } = A, T = AFTER.tier, s = tg.live, id = tg.id;
    if (tg.type === 'buster') {
      const e = tg.target != null && env.entById ? env.entById(tg.target) : null; if (!e) return;
      const x = e.x, y = e.y, R = s.r;
      mark(T.short, { x, y }, (ctx, q, k, age, seed) => {
        // the ground the root struck: a dark dent, cracks with ember in them, torn root-fibres lying across it
        ellipse(ctx, x, y + 6, R * 0.85, R * 0.66, 0, rgba('#0a0604', 0.5 * k), rgba(C.earthHi, 0.35 * k), 2);
        crackStar(ctx, x, y + 6, R * 1.0, 10, seed, k * 0.8, { w: 1.8, flat: 0.74, col: '#c05a30', ink: '#1a0804' });
        for (let i = 0; i < 8; i++) { const a = hash(i, seed) * TAU, d0 = R * 0.25, d1 = R * (0.6 + 0.5 * hash(i, seed + 1)); ctx.beginPath(); zigPath(ctx, x + Math.cos(a) * d0, y + 6 + Math.sin(a) * d0 * 0.8, x + Math.cos(a + 0.5) * d1, y + 6 + Math.sin(a + 0.5) * d1 * 0.8, seed + i, 6, 14); ctx.strokeStyle = rgba(C.bark, 0.85 * k); ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.stroke(); }
      }, id);
      return;
    }
    const cone = (col, draw) => mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => { ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); draw(ctx, k, seed); ctx.restore(); }, id);
    const reachD = Math.min(s.r || 700, 740);
    switch (tg.tag) {
      case 'mgThorn':
        cone(C.thorn, (ctx, k, seed) => { for (let i = 0; i < 9; i++) { const a = s.angle + (hash(i, seed) - 0.5) * s.arc * 0.9, d = 90 + hash(i, seed + 1) * (reachD - 90), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d; for (let j = 0; j < 3; j++) spire(ctx, x + (j - 1) * 7, y + Math.abs(j - 1) * 3, 16 + 8 * hash(j, seed + i), 6, (j - 1) * 0.3, 0.9 * k, C.thorn); crackLine(ctx, x, y, x + Math.cos(a) * 30, y + Math.sin(a) * 30, seed + i, 0.5 * k, { w: 1.2, col: C.thornDk, ink: '#0a1a06' }); } });
        break;
      case 'mgFrost':
        cone(C.frost, (ctx, k, seed) => { ctx.fillStyle = rgba(C.frostHi, 0.12 * k); ctx.fillRect(s.x - 900, s.y - 900, 1800, 1800); for (let i = 0; i < 12; i++) { const a = s.angle + (hash(i, seed) - 0.5) * s.arc * 0.9, d = 80 + hash(i, seed + 1) * (reachD - 80); crackStar(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 26 + 22 * hash(i, 2), 5, seed + i, 0.7 * k, { w: 1.2, jag: 4, col: '#ffffff', ink: C.frostDk }); } });
        break;
      case 'mgSpark':
        cone(C.spark, (ctx, k, seed) => { for (let i = 0; i < 8; i++) { const a = s.angle + (hash(i, seed) - 0.5) * s.arc * 0.95, d = 70 + hash(i, seed + 1) * (reachD - 70), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d; ellipse(ctx, x, y, 22, 12, a, rgba('#0a0804', 0.4 * k)); crackStar(ctx, x, y, 34, 6, seed + i, 0.7 * k, { w: 1.3, jag: 5, col: C.spark, ink: '#1a1004' }); } });
        break;
      case 'mgBlight':
        cone(C.blight, (ctx, k, seed) => { for (let i = 0; i < 10; i++) { const a = s.angle + (hash(i, seed) - 0.5) * s.arc * 0.9, d = 80 + hash(i, seed + 1) * (reachD - 80), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d, rr = 14 + 16 * hash(i, 3); ellipse(ctx, x, y, rr, rr * 0.7, 0, rgba('#12001e', 0.55 * k), rgba(C.blight, 0.6 * k), 1.4); circle(ctx, x - rr * 0.2, y - rr * 0.2, rr * 0.2, rgba(C.blightHi, 0.5 * k)); } });
        break;
      case 'mgSap':
        mark(T.short, {}, (ctx, q, k, age, seed) => {
          for (let i = 0; i < 16; i++) { const a = hash(i, seed) * TAU, d = Math.sqrt(hash(i, seed + 1)) * AR() * 0.9, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.96, rr = 10 + 22 * hash(i, seed + 2); ellipse(ctx, x, y, rr, rr * 0.7, 0, rgba(C.sapDk, 0.45 * k), rgba(C.sap, 0.55 * k), 1.4); ellipse(ctx, x - rr * 0.25, y - rr * 0.25, rr * 0.3, rr * 0.14, -0.4, rgba('#ffffff', 0.35 * k)); }
        }, id);
        break;
      case 'mgChop': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), Ld = Math.min(s.len, AR() * 2.2);
        mark(T.long, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          // the gash: a black seam with the last heat dying in it, splintered earth on both lips, flecks of rust
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [off, col, w, al] of [[0, '#0a0402', 14, 0.7], [0, C.cleaver, 3.2, 0.35 + 0.4 * Math.max(0, 1 - age / 4)], [0, C.cleaverHi, 1.2, 0.3 * Math.max(0, 1 - age / 3)], [-12, C.earthHi, 2, 0.4], [12, C.earthHi, 2, 0.4]]) {
            ctx.beginPath(); zigPath(ctx, s.x - sa * off, s.y + ca * off, s.x + ca * Ld - sa * off, s.y + sa * Ld + ca * off, seed + off, 3, 30); ctx.strokeStyle = rgba(col, al * k); ctx.lineWidth = w; ctx.stroke();
          }
          for (let i = 0, n = Math.floor(Ld / 46); i < n; i++) { const d = i * 46 + hash(i, seed) * 30, sd = i % 2 ? 1 : -1; poly(ctx, [s.x + ca * d - sa * sd * 16 - 5, s.y + sa * d + ca * sd * 16 + 3, s.x + ca * d - sa * sd * 20, s.y + sa * d + ca * sd * 20 - 8, s.x + ca * d - sa * sd * 16 + 6, s.y + sa * d + ca * sd * 16 + 2], rgba(C.earth, 0.9 * k), rgba(C.earthDk, 0.7 * k), 1); }
          ctx.restore();
        }, id);
        break;
      }
      case 'mgRoots': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), Ld = Math.min(s.len, AR() * 1.6);
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          // the strand's torn stump: a lime-lit crack, shreds of silk caught on it
          ctx.save(); ctx.lineCap = 'round';
          ctx.beginPath(); zigPath(ctx, s.x, s.y, s.x + ca * Ld, s.y + sa * Ld, seed, 6, 26); ctx.strokeStyle = rgba('#0a1204', 0.6 * k); ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = rgba(C.brood, 0.6 * k); ctx.lineWidth = 2; ctx.stroke();
          for (let i = 0, n = Math.floor(Ld / 60); i < n; i++) { const d = 30 + i * 60, sd = i % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(s.x + ca * d, s.y + sa * d); ctx.quadraticCurveTo(s.x + ca * d - sa * sd * 20, s.y + sa * d + ca * sd * 20, s.x + ca * (d + 22) - sa * sd * 34, s.y + sa * (d + 22) + ca * sd * 34); ctx.strokeStyle = rgba(C.silk, 0.4 * k); ctx.lineWidth = 1.2; ctx.stroke(); }
          ctx.restore();
        }, id);
        break;
      }
      case 'mgRod':
        mark(T.short, { x: s.x, y: s.y, r: s.r }, (ctx, q, k, age, seed) => {
          // a scorched ring with the last blue light running round its rim, glass-fused flecks, the rod's stump
          glow(ctx, s.x, s.y, s.r * 0.8, '#02080c', 0.45 * k);
          ellipse(ctx, s.x, s.y, s.r * 0.55, s.r * 0.46, 0, null, rgba(C.storm, 0.55 * k * (0.7 + 0.3 * Math.sin(age * 12))), 2.2);
          ellipse(ctx, s.x, s.y, s.r * 0.88, s.r * 0.74, 0, null, rgba(C.storm, 0.3 * k), 1.4);
          crackStar(ctx, s.x, s.y, s.r * 0.9, 9, seed, 0.7 * k, { w: 1.4, jag: 6, col: C.storm, ink: '#02080c' });
        }, id);
        break;
      case 'mgLantern':
        mark(T.brief, { x: s.x, y: s.y, r: s.r }, (ctx, q, k, age, seed) => { ellipse(ctx, s.x, s.y, s.r * 0.7, s.r * 0.6, 0, rgba(C.lantern, 0.07 * k), rgba(C.lanternHi, 0.35 * k), 2); for (let i = 0; i < 5; i++) glow(ctx, s.x + (hash(i, seed) - 0.5) * s.r, s.y + (hash(i, seed + 1) - 0.5) * s.r * 0.8 - (age * 12 + i * 6) % 40, 8, C.lanternHi, 0.4 * k); }, id);
        break;
      case 'mgCleave':
        mark(T.brief, { x: s.x, y: s.y, r: s.r }, (ctx, q, k) => { for (let i = 0; i < 3; i++) ellipse(ctx, s.x, s.y + 4, s.r * (0.5 + 0.2 * i), s.r * (0.42 + 0.17 * i), 0, null, rgba(C.shareHi, (0.45 - i * 0.12) * k), 2); }, id);
        break;
      case 'mgWing':
        cone(C.wing, (ctx, k, seed) => { for (let i = 0; i < 7; i++) { const a = s.angle + (hash(i, seed) - 0.5) * s.arc * 0.85, d = 100 + hash(i, seed + 1) * (reachD - 100); crackLine(ctx, s.x + Math.cos(a) * d * 0.6, s.y + Math.sin(a) * d * 0.6, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, seed + i, 0.55 * k, { w: 1.6, jag: 5, col: C.wing, ink: '#1a0804' }); } });
        break;
      case 'mgRime':
        mark(T.short, { x: s.x, y: s.y, r: s.r }, (ctx, q, k, age, seed) => { ellipse(ctx, s.x, s.y + 4, s.r * 0.8, s.r * 0.66, 0, rgba(C.frostHi, 0.1 * k), rgba('#ffffff', 0.35 * k), 2); crackStar(ctx, s.x, s.y + 4, s.r * 0.95, 10, seed, 0.7 * k, { w: 1.4, jag: 5, col: '#ffffff', ink: C.frostDk }); }, id);
        break;
      case 'mgRune': case 'mgRuneRing':
        mark(T.short, { x: s.x, y: s.y, r: tg.tag === 'mgRune' ? s.r : 300 }, (ctx, q, k, age, seed) => { ctx.save(); ctx.globalAlpha = 0.6 * k; glyphRing(ctx, s.x, s.y, tg.tag === 'mgRune' ? s.r * 0.8 : (s.r2 || 270) + 40, 16, age * 0.2, C.rune, 0.6, 8, seed); ctx.restore(); }, id);
        break;
      case 'mgHead': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), Ld = Math.min(s.len, AR() * 1.6);
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => { ctx.save(); ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const v = (i / 5 * 2 - 1) * s.w * 0.4; ctx.beginPath(); ctx.moveTo(s.x + ca * 30 - sa * v, s.y + sa * 30 + ca * v); ctx.lineTo(s.x + ca * Ld * (0.5 + 0.4 * hash(i, seed)) - sa * v, s.y + sa * Ld * (0.5 + 0.4 * hash(i, seed)) + ca * v); ctx.strokeStyle = rgba(C.head, 0.28 * k); ctx.lineWidth = 3 + 3 * hash(i, 2); ctx.stroke(); } ctx.restore(); }, id);
        break;
      }
    }
  }

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // H: the shared helpers boss-vfx.js owns (shapeFlash, shockAt, scatter, after, shake, roomTint, sweep, streak, bang, AFT, coverShadows, clipOut, AR)
  const IMP = {};
  const inside = (ctx, s, pad = 0) => (ctx.units || []).filter(u => SHAPES.contains(s, u.x, u.y, pad));
  // a ring drawing in (the Hunger's breath): VFX.shock reads r0 > r as a ring that closes
  const closing = (x, y, r0, r1, color, w, dur, delay) => VFX.shock(x, y, { r0, r: r1, color, w, dur, flat: 0.8, delay });

  // Hunger Seed bursts: the seed splits like a geode: black crystal spires thrown up round them, violet light through the cracks, shards flying
  IMP.mgSeed = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.shapeFlash(s, C.violet, { a: 0.28, dur: 0.5 });
    H.bang(x, y, s.r * 1.05, { n: 14, color: C.violet, core: '#ffffff', ink: C.void, dur: 0.5 });
    VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => {
      const grow = easeOut(clamp(p / 0.25, 0, 1)), k = e.a * (1 - clamp((p - 0.45) / 0.55, 0, 1));
      for (let i = 0; i < 13; i++) { const a = i * TAU / 13 + hash(i, 1) * 0.4, d = s.r * (0.12 + 0.55 * hash(i, 2)), h = (50 + 90 * hash(i, 3)) * grow * (1 - 0.3 * d / s.r); spire(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, h, 16 + 12 * hash(i, 4), Math.cos(a) * 0.35, k); }
      glow(c, x, y - 10, s.r * 1.1, C.violet, 0.5 * k);
    } });
    hungerUp(x, y, 24, { size: 1.3 });
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.violetHi, 2);
    H.shockAt(x, y, { r: s.r * 1.5, color: C.violet, w: 9, dur: 0.55, flat: 0.8 });
    H.shockAt(x, y, { r: s.r * 0.9, color: C.violetHi, w: 4, dur: 0.45, flat: 0.8, delay: 0.06 });
    H.shake(8);
  };
  // Inhale lands: the breath goes in: rings closing on his split, a gust of dust and leaves, a flare in his chest
  IMP.mgInhale = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    for (let i = 0; i < 3; i++) closing(x, y + 8, 520 - i * 70, 40, i % 2 ? C.violetHi : C.violet, 9 - i * 2, 0.55 + i * 0.1, i * 0.07);
    VFX.flash(x, y + SPLIT, 130, C.violetHi, 0.3);
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => { const k = e.a * (1 - p); glow(c, x, y + SPLIT, 90 * (1 + 0.5 * easeOut(p)), C.violet, 0.6 * k); glow(c, x, y + SPLIT, 36, '#ffffff', 0.5 * k); } });
    for (const u of (ctx.units || [])) { const a = Math.atan2(y - u.y, x - u.x); VFX.sparks(u.x, u.y, { color: C.violetHi, n: 8, speed: 260, angle: a + Math.PI, spread: 0.7, z: 14 }); VFX.smoke(u.x, u.y, { n: 2, color: '#8a7a64', size: 24, a: 0.45, speed: 80 }); }
    for (let i = 0; i < 14; i++) { const a = rand(0, TAU), d = rand(120, 480); VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.9, z: rand(6, 30), vx: -Math.cos(a) * 520, vy: -Math.sin(a) * 470, g: 0, drag: 0.5, life: rand(0.4, 0.7), size: rand(8, 13), size1: 2, color: C.leaf, kind: 'leaf', add: false, vr: rand(-12, 12) }); }
    H.shake(7);
  };

  // Fourfold Bloom: each petal snaps shut in its own element
  function petalImp(col, hi, dark, kind) {
    return (tg, msg, ctx, H) => {
      const s = tg.live, reach = Math.min(s.r, 740);
      H.shapeFlash(s, col, { a: 0.22, dur: 0.45 });
      for (let d = 70, i = 0; d < reach; d += 62, i++) {
        const a = s.angle + (hash(i, tg.id) - 0.5) * s.arc * 0.85, x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d; if (ARENA.sd(x, y) > -10) continue;
        H.after(d / reach * 0.16, () => {
          if (kind === 'thorn') { VFX.spikeburst(x, y, { r: 38, n: 7, color: col, core: '#f4ffb0', ink: dark, dur: 0.36 }); VFX.sparks(x, y, { color: C.thornTip, n: 3, speed: 200 }); }
          else if (kind === 'frost') { for (let j = 0; j < 4; j++) { const aa = rand(0, TAU), sp = rand(80, 200); VFX.spawn({ x, y, z: 10, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp * 0.6, vz: rand(80, 190), g: 500, life: rand(0.5, 0.8), size: rand(7, 12), size1: 1, color: j % 2 ? '#ffffff' : col, kind: 'shard', add: false, vr: rand(-10, 10) }); } VFX.shock(x, y, { r: 54, color: hi, w: 4, dur: 0.4, flat: 0.8 }); }
          else if (kind === 'spark') { VFX.lightning(x + rand(-50, 50), y - 360, x, y, { color: hi, jag: 22, dur: 0.3 }); VFX.sparks(x, y, { color: hi, n: 6, speed: 300 }); VFX.hit(x, y, hi, 1.1); }
          else { VFX.smoke(x, y, { n: 2, color: '#3a1a56', size: 34, a: 0.5, speed: 60 }); VFX.sparks(x, y, { color: hi, n: 3, speed: 150 }); for (let j = 0; j < 3; j++) VFX.spawn({ x, y, z: 6, vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(40, 100), g: 120, life: rand(0.7, 1.1), size: rand(8, 13), size1: 2, color: hi, kind: 'glow', add: true }); }
        });
      }
      for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, hi, 1.8); }
      H.shake(7);
    };
  }
  IMP.mgThorn = petalImp(C.thorn, C.thornTip, '#102a06', 'thorn');
  IMP.mgFrost = petalImp(C.frost, C.frostHi, C.frostDk, 'frost');
  IMP.mgSpark = petalImp(C.spark, C.sparkHi, '#3a2a04', 'spark');
  IMP.mgBlight = petalImp(C.blight, C.blightHi, '#12001e', 'blight');

  // Root Lash: the root comes down on the tank: a white burst, roots wrapping, bark flying
  IMP.buster = (tg, msg, ctx, H) => {
    const s = tg.live, e = tg.target != null ? ctx.entById(tg.target) : null, x = e ? e.x : s.x, y = e ? e.y : s.y, b = ctx.bossDraw, bx = b ? b.x : x, by = b ? b.y : y - 300;
    VFX.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, e2) => {
      const q = clamp(p / 0.22, 0, 1), k = e2.a * (1 - clamp((p - 0.4) / 0.6, 0, 1)), lift = (1 - easeIn(q)) * 260;
      const pts = curve(bx, by - 10, (bx + x) / 2, Math.min(by, y) - 160, x, y - lift, 14);
      c.save(); c.lineJoin = 'round'; taper(c, pts, 44, 18, rgba(C.bark, 0.95 * k), rgba('#120a04', 0.95 * k), 2.4);
      for (let i = -2; i <= 2; i++) { const sp = i * 0.3, cl = curve(x, y - lift, x + i * 24, y - lift + 20, x + Math.sin(sp) * 70, y - lift + Math.cos(sp) * 50 + 12, 6); taper(c, cl, 15, 2, rgba(C.barkDk, 0.95 * k), rgba('#120a04', 0.95 * k), 1.4); }
      c.restore();
    } });
    H.shapeFlash(s, '#ff6a3a', { a: 0.3, dur: 0.5 });
    H.bang(x, y, 150, { n: 14, color: '#ffe4c0', core: '#ffffff', ink: '#3a1808', dur: 0.45 });
    VFX.hit(x, y, '#ffffff', 2.8);
    H.shockAt(x, y, { r: s.r * 1.3, color: C.earthHi, w: 10, dur: 0.55, flat: 0.8 });
    H.shockAt(x, y, { r: s.r * 0.8, color: '#ffffff', w: 5, dur: 0.45, flat: 0.8, delay: 0.05 });
    groveUp(x, y, 14, { size: 1.3, speed: 1.4 });
    for (let i = 0; i < 7; i++) { const a = rand(0, TAU), sp = rand(120, 260); VFX.spawn({ x, y, z: 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 220), g: 600, life: rand(0.5, 0.8), size: rand(8, 13), size1: 2, color: '#7a6448', kind: 'shard', add: false, vr: rand(-10, 10) }); }
    H.shake(10); cam(0.08, 0.03, 0.4, 3);
  };

  // Sap Tide: a surge of amber through the room: rings, drops thrown up off the welling blobs, the whole floor glowing for a moment
  IMP.mgSap = (tg, msg, ctx, H) => {
    H.roomTint(C.sap, 0.3, 1.0);
    for (let i = 0; i < 3; i++) H.shockAt(0, 0, { r: H.AR * (1.15 - i * 0.2), color: i % 2 ? C.sapHi : C.sap, w: 11 - i * 2, dur: 0.7 + i * 0.1, flat: 0.8, delay: i * 0.1 });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 30 }, 12)) H.after(Math.random() * 0.35, () => {
      for (let j = 0; j < 7; j++) { const a = rand(0, TAU), sp = rand(40, 160); VFX.spawn({ x: q.x, y: q.y, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(120, 260), g: 560, life: rand(0.6, 1), size: rand(6, 11), size1: 2, color: j % 2 ? C.sapHi : C.sap, kind: 'drop', add: false, rot: a + Math.PI / 2 }); }
      VFX.flash(q.x, q.y - 8, 40, C.sapHi, 0.3);
    });
    H.shake(6);
  };

  // Hungering Dark: each hole breathes in: its rim flares, a ring closes on it, dust and leaves sucked across the ground, anyone on it dragged
  IMP.mgDark = (tg, msg, ctx, H) => {
    const s = tg.live, r0 = s.r2 != null ? s.r2 : 0;
    closing(s.x, s.y, s.r, r0 + 6, C.violetHi, 7, 0.45, 0);
    closing(s.x, s.y, s.r * 0.8, r0, C.violet, 4, 0.5, 0.08);
    VFX.fx({ dur: 0.5, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - p); c.save(); c.globalCompositeOperation = 'lighter'; c.beginPath(); c.arc(s.x, s.y, r0 + 4, 0, TAU); c.strokeStyle = rgba(C.violet, 0.8 * k); c.lineWidth = 12 * (1 - p) + 3; c.stroke(); c.restore(); } });
    for (let i = 0; i < 8; i++) { const a = rand(0, TAU), d = s.r * rand(0.7, 1.0); VFX.spawn({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d * 0.9, z: 6, vx: -Math.cos(a) * 280, vy: -Math.sin(a) * 250, drag: 0.3, life: 0.5, size: rand(7, 12), size1: 1, color: i % 2 ? C.leaf : '#8a7a64', kind: i % 2 ? 'leaf' : 'smoke', add: false, a: 0.6 }); }
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.violetHi, 1.4);
    H.shake(5);
  };

  // The Swallowing's blow: the dark closes over the grove: a violet-white flash from every seam, the biggest shake of the fight so far
  IMP.mgSwallow = (tg, msg, ctx, H) => {
    H.roomTint(C.violet, 0.4, 1.2);
    for (let i = 0; i < 4; i++) H.shockAt(0, 0, { r: H.AR * (1.3 - i * 0.2), color: i % 2 ? C.violetHi : C.violet, w: 14 - i * 3, dur: 0.8 + i * 0.1, flat: 0.8, delay: i * 0.08 });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 12)) H.after(Math.random() * 0.4, () => { hungerUp(q.x, q.y, 6, { size: 1.2 }); VFX.pillar(q.x, q.y, { r: 20, h: 140 + rand(0, 90), color: C.violet, dur: 0.5 }); });
    H.shake(16); cam(0.14, 0.05, 0.8, 0.5);
  };

  // Cleaver Bough's soak: the cleaver scores the air above them: a ring of blue, light thrown out
  IMP.mgCleave = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.shapeFlash(s, C.shareHi, { a: 0.34, dur: 0.55 });
    H.bang(x, y, s.r * 0.8, { n: 14, color: C.share, core: '#ffffff', ink: '#06183a', dur: 0.45 });
    H.shockAt(x, y, { r: s.r * 1.3, color: C.shareHi, w: 8, dur: 0.5, flat: 0.8 });
    H.shockAt(x, y, { r: s.r * 0.8, color: '#ffffff', w: 4, dur: 0.45, flat: 0.8, delay: 0.06 });
    VFX.sparks(x, y, { color: C.cleaver, n: 10, speed: 300 });
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.shareHi, 1.8);
    H.shake(8);
  };
  // Cleaver Bough's chop: the whole lane splits open in a blaze of orange: embers, rusted flakes, rock thrown up, a white seam
  IMP.mgChop = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), Ld = Math.min(s.len, H.AR * 2.2);
    H.shapeFlash(s, C.cleaver, { a: 0.3, dur: 0.5 });
    H.streak(s.x, s.y, s.angle, C.cleaver, { len: Ld, w: 30, dur: 0.45 });
    H.streak(s.x, s.y, s.angle, '#ffffff', { len: Ld, w: 8, dur: 0.34 });
    for (let d = 20, i = 0; d < Ld; d += 56, i++) {
      const x = s.x + ca * d, y = s.y + sa * d; if (ARENA.sd(x, y) > -8) continue;
      H.after(d / Ld * 0.12, () => { VFX.sparks(x, y, { color: i % 2 ? C.cleaver : C.cleaverHi, n: 4, speed: 300 }); if (i % 2) groveUp(x + (Math.random() - 0.5) * s.w * 0.5, y, 3, { size: 0.9, col: '#5a3a20' }); else VFX.spawn({ x, y, z: 8, vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(80, 190), g: 400, life: rand(0.5, 0.9), size: rand(7, 12), size1: 1, color: C.cleaver, kind: 'glow' }); });
    }
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, C.cleaverHi, 2.4); VFX.sparks(u.x, u.y, { color: C.cleaver, n: 10, speed: 320 }); }
    H.shake(12); cam(0.1, 0.04, 0.5, 2);
  };

  // Brood Roots: the strands burst up out of the floor: lime roots thrown up, silk and splinters
  IMP.mgRoots = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), Ld = Math.min(s.len, H.AR * 1.5);
    H.shapeFlash(s, C.brood, { a: 0.22, dur: 0.45 });
    H.streak(s.x, s.y, s.angle, C.brood, { len: Ld, w: 18, dur: 0.4 });
    VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => {
      const grow = easeOut(clamp(p / 0.25, 0, 1)), k = e.a * (1 - clamp((p - 0.5) / 0.5, 0, 1));
      c.save(); c.lineJoin = 'round';
      for (let d = 40, i = 0; d < Ld; d += 70, i++) {
        const x = s.x + ca * d, y = s.y + sa * d, h = (60 + 50 * hash(i, tg.id)) * grow, sd = i % 2 ? 1 : -1;
        const pts = curve(x, y, x + sd * 18, y - h * 0.6, x + sd * (30 + 20 * hash(i, 4)) * (0.5 + 0.5 * grow), y - h, 8);
        taper(c, pts, 34, 6, rgba(C.broodDk, 0.95 * k), rgba('#0a1204', 0.9 * k), 2);
        c.beginPath(); pts.forEach(([px, py], j) => (j ? c.lineTo(px, py) : c.moveTo(px, py))); c.strokeStyle = rgba(C.brood, 0.8 * k); c.lineWidth = 1.8; c.stroke();
      }
      c.restore();
    } });
    for (let d = 40, i = 0; d < Ld; d += 70, i++) { const x = s.x + ca * d, y = s.y + sa * d; if (ARENA.sd(x, y) > -8) continue; H.after(d / Ld * 0.1, () => { groveUp(x, y, 3, { size: 0.9, dust: '#7a8a5a', col: '#4a5a20' }); VFX.spawn({ x, y, z: 8, vx: rand(-50, 50), vy: rand(-30, 30), vz: rand(90, 190), g: 380, life: rand(0.6, 1), size: rand(6, 10), size1: 1, color: C.brood, kind: 'glow' }); }); }
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, C.broodHi, 1.8); VFX.sparks(u.x, u.y, { color: C.brood, n: 8, speed: 220 }); }
    H.shake(8);
  };

  // Storm Knot: a bolt down each rod: white-cyan columns, a ring of lightning, scorched flecks thrown up
  IMP.mgRod = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.shapeFlash(s, C.storm, { a: 0.3, dur: 0.5 });
    VFX.lightning(x + rand(-40, 40), y - 900, x, y, { color: '#ffffff', jag: 34, dur: 0.4 });
    VFX.lightning(x + rand(-90, 90), y - 900, x, y, { color: C.storm, jag: 40, dur: 0.34 });
    VFX.pillar(x, y, { r: 34, h: 520, color: C.storm, dur: 0.45 });
    VFX.flash(x, y - 20, s.r * 0.45, '#ffffff', 0.2);
    VFX.hit(x, y, '#ffffff', 1.8);
    H.shockAt(x, y, { r: s.r * 1.1, color: C.storm, w: 9, dur: 0.5, flat: 0.8 });
    H.shockAt(x, y, { r: s.r * 0.6, color: '#ffffff', w: 4, dur: 0.4, flat: 0.8, delay: 0.05 });
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + rand(0, 0.6); VFX.lightning(x + Math.cos(a) * 20, y + Math.sin(a) * 12, x + Math.cos(a) * s.r * 0.8, y + Math.sin(a) * s.r * 0.6, { color: C.stormHi, jag: 14, dur: 0.2 }); }
    VFX.sparks(x, y, { color: C.storm, n: 20, speed: 420 });
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.stormHi, 2);
    H.shake(10);
  };

  // Barrow Lantern: the light bursts in a cold green ring; motes of grave-light rise; the eye flares and closes
  IMP.mgLantern = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.shapeFlash(s, C.lantern, { a: 0.24, dur: 0.5 });
    VFX.flash(x, y - 30, s.r * 0.8, C.lanternHi, 0.3);
    H.shockAt(x, y, { r: s.r * 1.2, color: C.lantern, w: 8, dur: 0.55, flat: 0.8 });
    H.shockAt(x, y, { r: s.r * 0.7, color: C.lanternHi, w: 4, dur: 0.45, flat: 0.8, delay: 0.06 });
    VFX.motes(x, y, { n: 12, color: C.lanternHi, r: s.r * 0.7, rise: 1.4 });
    VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => { const k = e.a * (1 - p); eye(c, x, y - 88, 0.9 * (1 + 0.5 * p), t, k, C.lantern, C.lanternHi); } });
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.lanternHi, 1.6);
    H.shake(5);
  };

  // Wyrm Wing: a wall of orange across half the room: embers swept along it, scorched bark flying
  IMP.mgWing = (tg, msg, ctx, H) => {
    const s = tg.live, reach = Math.min(s.r, 740);
    H.shapeFlash(s, C.wing, { a: 0.28, dur: 0.5 });
    H.sweep(s, C.wingHi, 0.4);
    for (let i = 0; i < 9; i++) { const a = s.angle + (i / 8 - 0.5) * s.arc * 0.85, x = s.x + Math.cos(a) * reach * 0.6, y = s.y + Math.sin(a) * reach * 0.6; if (ARENA.sd(x, y) > -10) continue; H.after(0.05 + i * 0.02, () => { VFX.sparks(x, y, { color: i % 2 ? C.wing : C.wingHi, n: 5, speed: 320 }); VFX.smoke(x, y, { n: 1, color: '#3a2a22', size: 30, a: 0.4, speed: 60 }); }); }
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, C.wingHi, 2); VFX.sparks(u.x, u.y, { color: C.wing, n: 10, speed: 300 }); }
    H.shake(10);
  };
  // Frost Fist: the fist comes down: ice shards thrown up, a white frost ring
  IMP.mgRime = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => { const q = clamp(p / 0.25, 0, 1), k = e.a * (1 - clamp((p - 0.5) / 0.5, 0, 1)); iceFist(c, x, y, s.r * 0.55, 0.9 * k, (1 - easeIn(q)) * 420, t); } });
    H.shapeFlash(s, C.frostHi, { a: 0.32, dur: 0.55 });
    H.bang(x, y, 170, { n: 14, color: C.frost, core: '#ffffff', ink: C.frostDk, dur: 0.5 });
    VFX.hit(x, y, '#ffffff', 2.8);
    H.shockAt(x, y, { r: s.r * 1.3, color: C.frostHi, w: 10, dur: 0.6, flat: 0.8 });
    for (let i = 0; i < 14; i++) { const a = rand(0, TAU), sp = rand(100, 280); VFX.spawn({ x, y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(120, 260), g: 520, life: rand(0.6, 1), size: rand(7, 13), size1: 1, color: i % 2 ? '#ffffff' : C.frost, kind: 'shard', add: false, vr: rand(-10, 10) }); }
    VFX.smoke(x, y, { n: 6, color: '#dff4ff', size: 40, a: 0.5, speed: 120 });
    H.shake(11); cam(0.08, 0.03, 0.4, 3);
  };
  // Archmage Rune: the circle flares and a ring of runes goes out; the second step flares the whole outer floor
  IMP.mgRune = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.shapeFlash(s, C.rune, { a: 0.3, dur: 0.5 });
    VFX.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - p); glyphRing(c, x, y, s.r * (0.6 + 0.5 * easeOut(p)), 18, t * 2, C.runeHi, k, 10, 3); } });
    for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: s.r * (1.1 - i * 0.25), color: i % 2 ? '#ffffff' : C.rune, w: 9 - i * 2, dur: 0.55 + i * 0.08, flat: 0.8, delay: i * 0.06 });
    VFX.sparks(x, y, { color: C.runeHi, n: 18, speed: 380 });
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.runeHi, 1.8);
    H.shake(9);
  };
  IMP.mgRuneRing = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.roomTint(C.rune, 0.26, 0.8);
    for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: H.AR * (1.3 - i * 0.2), r0: (s.r2 || 270), color: i % 2 ? '#ffffff' : C.rune, w: 12 - i * 3, dur: 0.6 + i * 0.1, flat: 0.8, delay: i * 0.06 });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 10)) { if (Math.hypot(q.x - x, q.y - y) < (s.r2 || 270)) continue; H.after(Math.random() * 0.3, () => { VFX.sparks(q.x, q.y, { color: C.runeHi, n: 5, speed: 300 }); VFX.flash(q.x, q.y - 8, 34, C.rune, 0.3); }); }
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.runeHi, 1.8);
    H.shake(10);
  };
  // Hydra Head: the breath: a rush of sea-green water down the lane, spray and foam
  IMP.mgHead = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), Ld = Math.min(s.len, H.AR * 1.8);
    H.shapeFlash(s, C.head, { a: 0.24, dur: 0.5 });
    H.streak(s.x, s.y, s.angle, C.head, { len: Ld, w: 26, dur: 0.4 });
    H.streak(s.x, s.y, s.angle, C.headHi, { len: Ld, w: 7, dur: 0.32 });
    for (let d = 30, i = 0; d < Ld; d += 64, i++) { const x = s.x + ca * d, y = s.y + sa * d; if (ARENA.sd(x, y) > -8) continue; H.after(d / Ld * 0.12, () => { for (let j = 0; j < 4; j++) { const a = rand(0, TAU), sp = rand(40, 150); VFX.spawn({ x, y, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(90, 220), g: 520, life: rand(0.5, 0.9), size: rand(6, 11), size1: 1, color: j % 2 ? C.headHi : C.head, kind: 'drop', add: false, rot: a + Math.PI / 2 }); } }); }
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, C.headHi, 1.9);
    H.shake(9);
  };

  // ---------------------------------------------------------------- propfx (boss-vfx.js propFx() asks first when it is his)
  // A hole's birth: the seed's ring of black glass bursts, and the ground over it caves in: slabs of earth, leaves and roots dropping in at the lip, the
  // rim flaring violet, the dark opening (the hole itself is drawn from the floor list by arena-view.js)
  function dig(msg, H) {
    const x = msg.x, y = msg.y, r = msg.r || 75;
    VFX.fx({ dur: 0.9, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * (1 - clamp((p - 0.25) / 0.75, 0, 1)), q = easeOut(clamp(p / 0.3, 0, 1));
      c.save(); c.globalCompositeOperation = 'lighter'; c.beginPath(); c.ellipse(x, y, r * (0.9 + 0.2 * q), r * (0.9 + 0.2 * q) * 0.84, 0, 0, TAU);
      c.strokeStyle = rgba(C.violet, 0.9 * k); c.lineWidth = 16 * (1 - p) + 3; c.stroke(); c.strokeStyle = rgba('#ffffff', 0.8 * k); c.lineWidth = 2.4; c.stroke(); c.restore();
      glow(c, x, y, r * 1.4, C.violet, 0.4 * k);
    } });
    closing(x, y, r * 2.1, r * 0.9, C.violetHi, 8, 0.5, 0);
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + rand(-0.15, 0.15), d = r * rand(0.95, 1.3), sp = rand(70, 150), sz = rand(9, 17);
      VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.84, z: rand(0, 14), vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp * 0.84, vz: rand(-20, 30), g: 90, drag: 0.1, life: rand(0.5, 0.85), size: sz, size1: 0, color: i % 3 === 0 ? C.earthHi : i % 3 === 1 ? C.earth : C.barkDk, kind: 'shard', add: false, vr: rand(-6, 6) });
    }
    for (let i = 0; i < 8; i++) { const a = rand(0, TAU), d = r * rand(0.9, 1.4); VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.84, z: rand(6, 24), vx: -Math.cos(a) * 80, vy: -Math.sin(a) * 66, vz: rand(-10, 30), g: 60, drag: 0.15, life: rand(0.7, 1.1), size: rand(8, 12), size1: 0, color: C.leaf, kind: 'leaf', add: false, vr: rand(-8, 8) }); }
    VFX.smoke(x, y, { n: 6, color: '#7a6a58', size: 34, a: 0.5, speed: 90, r: r * 0.9 });
    hungerUp(x, y, 10, { size: 1.0, speed: 220 });
    for (const [rr, col, w] of [[r * 1.7, C.violet, 8], [r * 1.2, C.violetHi, 4]]) H.shockAt(x, y, { r: rr, color: col, w, dur: 0.55, flat: 0.8 });
    H.shake(8);
  }
  // a sapling dives into a hole and the rim tears wider: the little tree falling in, a shock ring and a ragged tear running out to the new edge
  function grow(msg, H) {
    const x = msg.x, y = msg.y, r = msg.r || 90, a0 = rand(0, TAU), sx = x + Math.cos(a0) * r * 0.95, sy = y + Math.sin(a0) * r * 0.95 * 0.84;
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - clamp((p - 0.5) / 0.5, 0, 1)), px = lerp(sx, x, easeIn(p) * 0.7), py = lerp(sy, y, easeIn(p) * 0.7) + 24 * easeIn(p), sc = 1 - 0.7 * easeIn(p);
      c.save(); c.translate(px, py); c.scale(sc, sc); c.rotate(0.5 * p); c.globalAlpha = k;
      c.fillStyle = '#5a4a36'; c.fillRect(-3, -4, 6, 18); c.beginPath(); c.arc(0, -12, 12, 0, TAU); c.fillStyle = '#8a9a52'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
      for (let i = 0; i < 3; i++) { const a = -1.9 + i * 0.95; circle(c, Math.cos(a) * 12, -12 + Math.sin(a) * 12, 3.4, rgba('#ffe08a', 0.9)); }
      c.restore();
    } });
    closing(x, y, r * 1.6, r * 1.0, C.violetHi, 7, 0.5, 0.05);
    H.shockAt(x, y, { r: r * 1.35, color: C.violet, w: 8, dur: 0.5, flat: 0.8, delay: 0.1 });
    VFX.fx({ dur: 0.9, layer: 'ground', delay: 0.1, draw: (c, p, t, e) => { const k = e.a * (1 - p); crackStar(c, x, y, r * (1.0 + 0.4 * easeOut(p)), 12, 5, 0.9 * k, { w: 2.4, jag: 8 }); glow(c, x, y, r * 1.3, C.violet, 0.3 * k); } });
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + rand(0, 0.5), d = r * rand(0.95, 1.2); VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.84, z: 4, vx: -Math.cos(a) * 70, vy: -Math.sin(a) * 60, vz: 10, g: 80, life: rand(0.5, 0.8), size: rand(8, 14), size1: 0, color: i % 2 ? C.earth : C.earthHi, kind: 'shard', add: false, vr: rand(-6, 6) }); }
    VFX.smoke(x, y, { n: 4, color: '#7a6a58', size: 30, a: 0.45, speed: 80, r: r });
    H.shake(5);
  }
  // a hero drops into a hole: the lip rises over their legs and they sink, held; the ground shudders; (the climb out is a normal knock, 2.7 s later)
  function fall(msg, H) {
    const x = msg.x, y = msg.y, hx = msg.hx != null ? msg.hx : x, hy = msg.hy != null ? msg.hy : y;
    VFX.flash(x, y - 20, 90, C.violetHi, 0.3);
    H.shockAt(x, y, { r: 110, color: C.violet, w: 8, dur: 0.45, flat: 0.8 });
    hungerUp(x, y, 12, { size: 1.0, speed: 200 });
    VFX.smoke(x, y, { n: 4, color: '#3a2a4a', size: 32, a: 0.5, speed: 70 });
    for (let i = 0; i < 6; i++) { const a = rand(0, TAU); VFX.spawn({ x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 20, z: 14, vx: Math.cos(a) * 10, vy: Math.sin(a) * 6, vz: rand(40, 100), g: -20, life: rand(1, 1.6), size: rand(5, 9), size1: 0, color: C.violetHi, kind: 'glow' }); }
    const e0 = H.entById ? H.entById(msg.pid) : null;
    VFX.fx({ dur: 2.6, layer: 'air', draw: (c, p, t, e) => {
      const hero = H.entById ? H.entById(msg.pid) : e0, px = hero ? hero.x : x, py = hero ? hero.y : y;
      const sink = clamp(t / 0.35, 0, 1) * (1 - clamp((t - 2.15) / 0.4, 0, 1)), k = e.a * Math.min(1, (2.6 - t) / 0.2);
      if (sink < 0.02) return;
      // the pit's mouth round their feet, and its near lip drawn over their legs
      c.save(); c.globalAlpha = k;
      ellipse(c, px, py + 10, 38 * sink + 6, 14 * sink + 3, 0, rgba(C.void, 0.92), rgba(C.violet, 0.9), 2.4);
      c.beginPath(); c.moveTo(px - 36, py + 12); c.quadraticCurveTo(px, py + 12 + 30 * sink, px + 36, py + 12); c.quadraticCurveTo(px, py - 8 + 42 * sink - 24 * (1 - sink), px - 36, py + 12); c.closePath();
      c.fillStyle = rgba('#0a0414', 0.95); c.fill(); c.strokeStyle = rgba(C.violet, 0.9); c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.moveTo(px - 33, py + 14); c.quadraticCurveTo(px, py + 14 + 26 * sink, px + 33, py + 14); c.strokeStyle = rgba(C.violetHi, 0.6); c.lineWidth = 1; c.stroke();
      // things falling past them into the dark, and a pale rim of light at the lip
      for (let i = 0; i < 5; i++) { const q = (t * 0.9 + i / 5) % 1; glow(c, px + Math.sin(i * 2.1) * 26, py + 6 + q * 22, 5, C.violetHi, 0.5 * (1 - q) * sink); }
      glow(c, px, py + 14, 46, C.violet, 0.3 * sink * (0.7 + 0.3 * Math.sin(t * 8)));
      c.restore();
    } });
    H.shake(9); cam(0.06, 0.02, 0.35, 2);
  }
  // a limb breaking off: the wood bursting in its own colour: splinters, the monster's own light, a ring, a sweep of embers (or sparks, or ice)
  const LIMBFX = {
    cleaver: { col: C.cleaver, hi: C.cleaverHi, ink: '#2a1004', bits: ['#9a5a2a', '#c8cdd2', '#7a3a1a'], kind: 'ember' },
    brood: { col: C.brood, hi: C.broodHi, ink: '#0a1204', bits: ['#4a5a20', C.silk, '#7a8a3a'], kind: 'silk' },
    storm: { col: C.storm, hi: '#ffffff', ink: '#02101a', bits: ['#3a4a5a', '#7fe8ff', '#5a3a28'], kind: 'bolt' },
    lantern: { col: C.lantern, hi: C.lanternHi, ink: '#04180c', bits: ['#8fbf9a', '#d8ffe8', '#4a3a28'], kind: 'glass' },
    wing: { col: C.wing, hi: C.wingHi, ink: '#2a0a04', bits: ['#3a2418', '#7a3a1a', '#ff8a4a'], kind: 'ember' },
    rime: { col: C.rime, hi: C.frostHi, ink: '#062030', bits: ['#dff4ff', '#8ad0ee', '#6a5a48'], kind: 'ice' },
    rune: { col: C.rune, hi: C.runeHi, ink: '#02201c', bits: ['#3a4a48', '#3fe0c8', '#6a5a48'], kind: 'rune' },
    head: { col: C.head, hi: C.headHi, ink: '#02201a', bits: ['#2a5a4a', '#c8ffe8', '#5a4a38'], kind: 'water' },
  };
  function limbBreak(msg, H) {
    const x = msg.x, y = msg.y, L = LIMBFX[msg.limb] || LIMBFX.cleaver;
    VFX.flash(x, y - 30, 120, L.hi, 0.3);
    VFX.spikeburst(x, y, { r: 120, n: 14, color: L.col, core: L.hi, ink: L.ink, dur: 0.5 });
    // splinters of the limb itself
    for (let i = 0; i < 20; i++) { const a = rand(0, TAU), sp = rand(120, 340); VFX.spawn({ x, y, z: rand(10, 40), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 300), g: 620, life: rand(0.6, 1.1), size: rand(7, 15), size1: 2, color: L.bits[i % 3], kind: 'shard', add: false, vr: rand(-12, 12) }); }
    for (let i = 0; i < 14; i++) { const a = rand(0, TAU), sp = rand(80, 260); VFX.spawn({ x, y, z: rand(10, 40), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(80, 240), g: 300, drag: 0.03, life: rand(0.7, 1.2), size: rand(7, 12), size1: 0, color: i % 2 ? L.col : L.hi, kind: 'glow', add: true }); }
    if (L.kind === 'bolt') for (let i = 0; i < 4; i++) { const a = rand(0, TAU); VFX.lightning(x, y - 20, x + Math.cos(a) * 160, y + Math.sin(a) * 100 - 20, { color: '#ffffff', jag: 16, dur: 0.25 }); }
    if (L.kind === 'rune') VFX.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, e) => glyphRing(c, x, y, 60 + 80 * easeOut(p), 12, t * 3, C.runeHi, e.a * (1 - p), 9, 2) });
    if (L.kind === 'water') for (let i = 0; i < 12; i++) { const a = rand(0, TAU), sp = rand(60, 200); VFX.spawn({ x, y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 240), g: 520, life: rand(0.6, 1), size: rand(6, 11), size1: 1, color: C.headHi, kind: 'drop', add: false, rot: a + Math.PI / 2 }); }
    VFX.smoke(x, y, { n: 4, color: '#5a4a3a', size: 34, a: 0.45, speed: 90 });
    for (let i = 0; i < 6; i++) { const a = rand(0, TAU), sp = rand(40, 100); VFX.spawn({ x, y, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(40, 120), g: 120, life: rand(1, 1.6), size: rand(8, 12), size1: 3, color: C.leaf, kind: 'leaf', add: false, vr: rand(-6, 6), flutter: 6 }); }
    H.shockAt(x, y, { r: 200, color: L.col, w: 10, dur: 0.55, flat: 0.8 });
    H.shockAt(x, y, { r: 120, color: L.hi, w: 5, dur: 0.45, flat: 0.8, delay: 0.06 });
    H.shake(11); cam(0.1, 0.035, 0.45, 2);
  }
  function prop(msg, H) {
    if (msg.k === 'mgdig') { dig(msg, H); return true; }
    if (msg.k === 'mggrow') { grow(msg, H); return true; }
    if (msg.k === 'mgfall') { fall(msg, H); return true; }
    if (msg.k === 'mglimb') { limbBreak(msg, H); return true; }
    return false;
  }

  // ---------------------------------------------------------------- the Swallowing (ArenaView.drawZones and drawRoomOver hand over, from roomev 'swallow', 21 s)
  // 0-6    the grove cracks along seams that light up from the rim in; slab after slab tears loose, the dark showing where it was, and falls
  // 6      the blow: the rest of the floor lurches, everything left shakes and the party starts down; streaks of the fall rush upward
  // ~8     the floor changes ('form'): a flash covers it, and the room is the floating grove over the dark (arena-view.js)
  // 8-16   dust and torn leaves drifting up past the new floor while the dark settles
  // 16.5-21  roots as thick as trunks reach out of the dark round his feet as he unfolds; the last second is the limbs growing (roomev 'mglimbs')
  const SW = 21, CORE = { x: 0, y: -40 };
  const RINGS = [[0, 125, 1], [125, 270, 7], [270, 420, 11], [420, 580, 15]];
  const CH = (() => {
    const out = [];
    RINGS.forEach(([r0, r1, n], ri) => {
      for (let j = 0; j < n; j++) {
        const id = out.length, a0 = j * TAU / n + ri * 0.31, a1 = (j + 1) * TAU / n + ri * 0.31, pts = [], jit = k => hash(id, k) - 0.5;
        if (ri === 0) for (let m = 0; m < 12; m++) { const a = m * TAU / 12, rr = r1 * (0.9 + 0.2 * hash(id, m)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        else {
          for (let m = 0; m <= 3; m++) { const a = lerp(a0, a1, m / 3), rr = r1 - 3 + (m && m < 3 ? jit(m) * 24 : 0); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
          for (let m = 3; m >= 0; m--) { const a = lerp(a0, a1, m / 3), rr = r0 + 3 + (m && m < 3 ? jit(m + 9) * 24 : 0); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        }
        let cx = 0, cy = 0; pts.forEach(([x, y]) => { cx += x; cy += y; }); cx /= pts.length; cy /= pts.length;
        out.push({ id, ri, pts, cx, cy, T: 1.2 + (3 - ri) * 0.95 + hash(id, 77) * 0.55 });
      }
    });
    return out;
  })();
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const occupied = ch => (S.units || []).some(u => [[0, 0], [26, 0], [-26, 0], [0, 18], [0, -18]].some(([dx, dy]) => inPoly(ch.pts, u.x + dx, u.y + dy)));
  const swState = ev => (S.sw && S.sw.start === ev.start ? S.sw : (S.sw = { start: ev.start, rel: new Map(), shake: 0, camForm: false, rings: 0, dust: 0, sixFlash: false }));
  const formAtOf = ev => { const fm = evs().form; return fm && fm.start >= ev.start - 0.5 ? fm.start - ev.start : 99; };
  const polyPath = (c, pts, ox = 0, oy = 0) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x + ox, y + oy) : c.moveTo(x + ox, y + oy))); c.closePath(); };

  // under the units: the seams lighting, the dark where slabs have gone, the roots coming out of the dark round his feet
  function swallowFloor(c, ev, t) {
    const u = t - ev.start; if (u < 0) return;
    const st = swState(ev), formAt = formAtOf(ev);
    c.save(); ARENA.trace(c, 2); c.clip();
    if (u < formAt) {
      // releases: a slab goes once its turn comes and nobody is standing on it; the ones with someone on stay (the party rides them down)
      for (const ch of CH) if (!st.rel.has(ch.id) && u >= ch.T && u < 6.4 && !occupied(ch)) {
        st.rel.set(ch.id, u);
        if (u - ch.T < 1.2) { groveUp(ch.cx, ch.cy, 6, { size: 1.3, speed: 1.2 }); hungerUp(ch.cx, ch.cy, 5, { size: 1.0 }); }
      }
      // the dark where a slab was
      for (const ch of CH) {
        const rel = st.rel.get(ch.id);
        if (rel == null) continue;
        const age = u - rel, a2 = clamp((age - 0.15) / 0.3, 0, 1);
        polyPath(c, ch.pts);
        const g = c.createRadialGradient(ch.cx, ch.cy, 10, ch.cx, ch.cy, 150); g.addColorStop(0, rgba(C.void, 0.98 * a2)); g.addColorStop(1, rgba(C.voidMid, 0.96 * a2));
        c.fillStyle = g; c.fill(); c.lineJoin = 'round'; c.strokeStyle = rgba(C.violet, (0.55 + 0.3 * Math.sin(t * 5 + ch.id)) * a2); c.lineWidth = 3; c.stroke(); c.strokeStyle = rgba(C.violetHi, 0.6 * a2); c.lineWidth = 1; c.stroke();
        for (let i = 0; i < 2; i++) glow(c, ch.cx + Math.sin(t * 0.8 + ch.id + i * 3) * 30, ch.cy + Math.cos(t * 0.6 + i) * 20, 60, i ? C.violetDk : '#2a0e55', 0.4 * a2);
      }
      // seams: every slab still down lights along its edge as its time comes, brightest on the ones that are staying
      for (const ch of CH) {
        if (st.rel.has(ch.id)) continue;
        const a = clamp((u - (ch.T - 1.3)) / 1.3, 0, 1), stay = u > ch.T + 0.2 ? 1 : 0, al = Math.max(a, stay);
        if (al < 0.02) continue;
        polyPath(c, ch.pts); c.fillStyle = rgba(C.void, 0.1 * al + 0.18 * stay); c.fill();
        c.lineJoin = 'round'; c.strokeStyle = rgba(C.violetDk, 0.5 * al); c.lineWidth = 9; c.stroke();
        c.strokeStyle = rgba(C.violet, (0.25 + 0.55 * al) * (0.75 + 0.25 * Math.sin(t * 9 + ch.id * 2))); c.lineWidth = 2 + 2 * al; c.stroke();
      }
      // fissures running out of the middle first
      const fq = easeOut(clamp(u / 3.6, 0, 1));
      crackStar(c, CORE.x, CORE.y, 560 * fq, 14, 3, 0.55 * (1 - clamp((u - 4.5) / 1.5, 0, 1)), { w: 2.4, jag: 10, seg: 30 });
      // the party starts down: a dark settling over everything that is left
      if (u > 6) { const q = clamp((u - 6) / 1.4, 0, 1) * (1 - clamp((u - formAt) / 0.5, 0, 1)); const g2 = c.createRadialGradient(0, 0, 80, 0, 0, 640); g2.addColorStop(0, rgba(C.void, 0)); g2.addColorStop(1, rgba(C.void, 0.55 * q)); c.fillStyle = g2; c.fillRect(-700, -700, 1400, 1400); }
    }
    // roots out of the dark at his feet
    const un = clamp((u - 16.5) / 4.5, 0, 1), fade = 1 - clamp((t - ev.end) / 1.2, 0, 1);
    if (un > 0 && fade > 0) {
      glow(c, CORE.x, CORE.y + 14, 220 * easeOut(un), C.void, 0.55 * fade); glow(c, CORE.x, CORE.y + 14, 130 * easeOut(un), C.violet, 0.25 * fade * (0.7 + 0.3 * Math.sin(t * 7)));
      c.lineJoin = 'round'; c.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10 + hash(i, 5) * 0.4, len = (150 + 190 * hash(i, 6)) * easeOut(clamp(un * 1.2 - hash(i, 7) * 0.3, 0, 1)), wob = Math.sin(t * 2 + i * 1.7) * 18, pts = [];
        if (len < 10) continue;
        for (let j = 0; j <= 12; j++) { const d = 30 + len * j / 12, an = a + Math.sin(j * 0.55 + i) * 0.1 + wob / 400 * j; pts.push([CORE.x + Math.cos(an) * d, CORE.y + 16 + Math.sin(an) * d * 0.75]); }
        taper(c, pts, 34 * (0.7 + 0.5 * hash(i, 8)), 5, rgba(C.bark, 0.95 * fade), rgba(C.violet, 0.8 * fade), 2.2);
        c.beginPath(); pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = rgba(C.barkDk, 0.7 * fade); c.lineWidth = 3; c.stroke();
      }
    }
    c.restore();
  }

  // a torn slab of the grove: its underside, the cracked face, the Hunger's light along its edge, roots dangling
  function slab(c, ch, k, lift, spin) {
    c.save(); c.translate(ch.cx, ch.cy - lift); c.rotate(spin); c.globalAlpha = k;
    const rel = ch.pts.map(([x, y]) => [x - ch.cx, y - ch.cy]);
    polyPath(c, rel, 0, 16 + lift * 0.18); c.fillStyle = rgba(C.earthDk, 0.97); c.fill(); c.strokeStyle = rgba('#05020a', 0.9); c.lineWidth = 2; c.stroke();
    polyPath(c, rel); const g = c.createLinearGradient(-90, -90, 90, 90); g.addColorStop(0, rgba('#8a6a48', 1)); g.addColorStop(0.5, rgba(C.earth, 1)); g.addColorStop(1, rgba('#3e2f20', 1));
    c.fillStyle = g; c.fill(); c.lineJoin = 'round'; c.strokeStyle = rgba(C.violet, 0.85); c.lineWidth = 2.4; c.stroke(); c.strokeStyle = rgba(C.violetHi, 0.45); c.lineWidth = 1; c.stroke();
    c.save(); c.clip();
    crackStar(c, 0, 0, 90, 5, ch.id, 0.35, { w: 1.4, jag: 5, col: '#c8a06a', ink: C.earthDk });
    for (let i = 0; i < 4; i++) { const a = hash(i, ch.id) * TAU, d = 40 + 70 * hash(i, 3); c.beginPath(); zigPath(c, Math.cos(a) * d * 0.4, Math.sin(a) * d * 0.4, Math.cos(a) * d, Math.sin(a) * d, i + ch.id, 6, 18); c.strokeStyle = rgba(C.bark, 0.55); c.lineWidth = 3; c.stroke(); }
    c.restore();
    for (let i = 0; i < 4; i++) { const [x, y] = rel[Math.floor(hash(i, ch.id + 3) * rel.length)]; taper(c, curve(x, y + 16, x + 4, y + 30, x + (hash(i, 9) - 0.5) * 16, y + 34 + 18 * hash(i, 10), 5), 8, 1.5, rgba(C.bark, 0.95), rgba('#120a04', 0.9), 1); }
    c.restore();
  }
  // over the units: the slabs rising and falling away, the rush of the fall, the flashes, what comes up through the new floor
  function swallowOver(c, ev, t, env) {
    const u = t - ev.start; if (u < 0) return;
    const st = swState(ev), formAt = formAtOf(ev), out = clamp((ev.end + 0.4 - t) / 0.4, 0, 1);
    // a rumble through the floor, building toward the blow
    if (u < formAt + 0.2 && u - st.shake > 0.45) { st.shake = u; shakeNow(2 + 4 * clamp(u / 6, 0, 1)); }
    // one-shots: the blow itself (6), the floor changing (form), the roots' slams as he unfolds
    if (u >= 6 && !st.sixFlash) { st.sixFlash = true; if (u < 7) { shakeNow(12); cam(0.1, 0.04, 0.6, 1); } }
    if (u >= formAt && !st.camForm) { st.camForm = true; if (u < formAt + 1) { shakeNow(14); cam(0.16, 0.06, 0.9, 0.5); for (let i = 0; i < 3; i++) VFX.shock(CORE.x, CORE.y, { r: 700 - i * 160, color: i % 2 ? C.violetHi : C.violet, w: 14 - i * 3, dur: 0.9 + i * 0.1, flat: 0.8, delay: i * 0.08 }); } }
    if (u < formAt) for (const ch of CH) {
      const rel = st.rel.get(ch.id); if (rel == null) continue;
      const age = u - rel; if (age < 0.25 || age > 3.2) continue;
      const lift = age < 1.2 ? 70 * easeOut(clamp((age - 0.25) / 0.95, 0, 1)) : 70 - 300 * Math.pow((age - 1.2) / 1.6, 1.7), sc = 1 + 0.05 * (lift / 70) - 0.55 * clamp((age - 1.0) / 2.0, 0, 1);
      c.save(); c.translate(ch.cx, ch.cy); c.scale(sc, sc); c.translate(-ch.cx, -ch.cy);
      slab(c, ch, 1 - clamp((age - 1.6) / 1.4, 0, 1), lift, (hash(ch.id, 5) - 0.5) * 0.5 * clamp(age / 2, 0, 1));
      c.restore();
    }
    // the fall: streaks of debris rushing upward past everything
    const fall = easeIO(clamp((u - 5.6) / 0.9, 0, 1)) * (1 - clamp((u - formAt) / 0.7, 0, 1));
    if (fall > 0.02) {
      c.save(); ARENA.trace(c, 60); c.clip(); c.lineCap = 'round';
      for (let i = 0; i < 52; i++) {
        const x = (hash(i, 1) * 2 - 1) * 640, sp = 700 + 900 * hash(i, 2), y = 800 - ((hash(i, 3) * 1700 + t * sp) % 1700), len = 40 + 130 * hash(i, 4);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.strokeStyle = rgba(i % 3 ? C.violetHi : '#ffffff', (0.1 + 0.22 * hash(i, 5)) * fall * out); c.lineWidth = 1.2 + 2 * hash(i, 6); c.stroke();
      }
      for (let i = 0; i < 14; i++) {
        const x = (hash(i, 11) * 2 - 1) * 620, sp = 500 + 700 * hash(i, 12), y = 800 - ((hash(i, 13) * 1700 + t * sp) % 1700), sz = 8 + 22 * hash(i, 14), rot = t * (1 + hash(i, 15) * 3);
        c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = 0.55 * fall * out; c.fillStyle = '#2a1e14'; c.strokeStyle = rgba(C.violet, 0.8); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-sz, -sz * 0.5); c.lineTo(sz * 0.6, -sz * 0.8); c.lineTo(sz, sz * 0.4); c.lineTo(-sz * 0.4, sz * 0.7); c.closePath(); c.fill(); c.stroke(); c.restore();
      }
      c.restore();
    }
    // the flashes: a small one at the blow, the big one as the floor changes
    const f6 = u < 6.0 ? Math.max(0, 1 - (6.0 - u) / 0.12) : Math.max(0, 1 - (u - 6.0) / 0.5), fF = formAt < 90 ? Math.max(0, 1 - Math.abs(u - formAt - 0.1) / 0.75) : 0;
    if (f6 > 0.01) { c.globalCompositeOperation = 'screen'; c.fillStyle = rgba(C.violetHi, 0.24 * f6 * f6 * out); c.fillRect(-2600, -2600, 5200, 5200); c.globalCompositeOperation = 'source-over'; }
    if (fF > 0.01) { c.globalCompositeOperation = 'screen'; c.fillStyle = rgba('#efe4ff', 0.62 * fF * fF * out); c.fillRect(-2600, -2600, 5200, 5200); c.globalCompositeOperation = 'source-over'; }
    // after the change: dust and torn leaves drifting up past the new floor
    if (u > formAt && u < formAt + 6 && u - st.dust > 0.08) { st.dust = u; const a = rand(0, TAU), d = rand(60, 520); VFX.spawn({ x: Math.cos(a) * d, y: Math.sin(a) * d, z: rand(0, 40), vx: rand(-14, 14), vy: rand(-10, 10), vz: rand(40, 120), g: -10, life: rand(1.4, 2.4), size: rand(6, 12), size1: 1, color: Math.random() < 0.5 ? C.leaf : C.violetHi, kind: Math.random() < 0.5 ? 'leaf' : 'glow', add: false, vr: rand(-4, 4), flutter: 5 }); }
    // he unfolds: each wave of root heaves up under him
    for (const at of [17.3, 18.9, 20.3]) if (u >= at && st.rings < [17.3, 18.9, 20.3].indexOf(at) + 1) {
      st.rings = [17.3, 18.9, 20.3].indexOf(at) + 1;
      if (u - at < 0.6) { VFX.shock(CORE.x, CORE.y + 16, { r: 360 + 60 * st.rings, color: C.violet, w: 12, dur: 0.8, flat: 0.55 }); VFX.shock(CORE.x, CORE.y + 16, { r: 220, color: C.violetHi, w: 6, dur: 0.6, flat: 0.55, delay: 0.08 }); groveUp(CORE.x + rand(-80, 80), CORE.y + 40, 8, { size: 1.4, speed: 1.4 }); shakeNow(6 + 3 * st.rings); }
    }
  }

  // the limbs grow (roomev 'mglimbs'): at his four sides the wood tears out of the dark in each limb's own colour
  function limbsGrow(ev, env) {
    if (S.limbs === ev.start) return; S.limbs = ev.start;
    const b = env.boss;
    (ev.l || []).forEach((key, i) => {
      const L = LIMBFX[key] || LIMBFX.cleaver, x = b.x + SIDE[i][0] * 120, y = b.y + SIDE[i][1] * 95;
      later(i * 0.14, () => {
        VFX.spikeburst(x, y, { r: 100, n: 12, color: L.col, core: L.hi, ink: L.ink, dur: 0.5 });
        VFX.shock(x, y, { r: 170, color: L.col, w: 9, dur: 0.55, flat: 0.8 }); VFX.shock(x, y, { r: 100, color: L.hi, w: 4, dur: 0.45, flat: 0.8, delay: 0.06 });
        for (let j = 0; j < 12; j++) { const a = rand(0, TAU), sp = rand(100, 280); VFX.spawn({ x, y, z: 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 260), g: 560, life: rand(0.6, 1), size: rand(7, 13), size1: 1, color: L.bits[j % 3], kind: 'shard', add: false, vr: rand(-10, 10) }); }
        VFX.flash(x, y - 30, 90, L.hi, 0.3); shakeNow(8);
      });
    });
    cam(0.12, 0.045, 0.6, 1);
  }

  // ---------------------------------------------------------------- the room under the units / over the units (arena-view.js hands over)
  function floor(ctx, room, t) {
    const ev = room && room.ev; if (!ev) return;
    if (ev.swallow && t < ev.swallow.end + 1.4) swallowFloor(ctx, ev.swallow, t);
  }
  function roomOver(ctx, room, t, env) {
    const ev = room && room.ev; if (!ev) return;
    S.units = env && env.units;
    if (ev.swallow && t < ev.swallow.end + 1.4) swallowOver(ctx, ev.swallow, t, env);
    if (ev.mglimbs && env && env.boss) { const L = ev.mglimbs; if (S.limbs !== L.start) { if (t - L.start > 1.5) S.limbs = L.start; else limbsGrow(L, env); } }
  }

  // ---------------------------------------------------------------- the enrage, the entrance, the fall
  // Nothing Left: the Hunger swallowing the whole room, light and all. The dark closes in from the rim on a ragged edge with the violet burning
  // along it; slabs of floor lift off the lip and are gone; what light there is gets pulled across the floor into the split; at the end the
  // dark is a hand's breadth round them
  function eatenEdge(c, rr, t, q, keep) {
    if (!keep) c.beginPath();
    for (let i = 0; i <= 72; i++) { const a = i * TAU / 72, r = Math.max(8, rr * (1 + 0.07 * Math.sin(a * 5 + t * 0.9) + 0.045 * Math.sin(a * 11 - t * 1.7) + 0.03 * Math.sin(a * 19 + t * 2.3))); i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath();
  }
  function enrage(sh, b, dur, H) {
    const pulses = [0.3, 0.56, 0.8].map(f => f * dur);
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => {
      const q = clamp(t / dur, 0, 1), k = e.a * easeOut(clamp(t / 1.2, 0, 1)) * (1 - clamp((t - dur) / 2.5, 0, 1)), R = AR() + 40, rr = lerp(R, 70, Math.pow(q, 1.15));
      c.save();
      // the dark: everything outside a ragged, shrinking circle
      c.beginPath(); c.rect(-2800, -2800, 5600, 5600); eatenEdge(c, rr, t, q, true); c.fillStyle = rgba(C.void, 0.96 * k); c.fill('evenodd');
      // the violet burning along its edge, and the glow of what it is eating
      eatenEdge(c, rr, t, q); c.lineJoin = 'round';
      for (const [w, col, a] of [[44, C.violetDk, 0.35], [16, C.violet, 0.55], [5, C.violetHi, 0.9], [1.6, '#ffffff', 0.9]]) { c.strokeStyle = rgba(col, a * k); c.lineWidth = w; c.stroke(); }
      // slabs of the floor lifting off the lip and going
      for (let i = 0; i < 12; i++) {
        const a = hash(i, 3) * TAU + t * 0.05, born = hash(i, 4) * 0.85, qq = clamp((q - born) / 0.12, 0, 1); if (qq <= 0 || qq >= 1) continue;
        const d = rr + 24 + 120 * qq, sz = 18 + 30 * hash(i, 5);
        c.save(); c.translate(Math.cos(a) * d, Math.sin(a) * d - 40 * qq); c.rotate(a + qq * 3); c.globalAlpha = (1 - qq) * k;
        c.fillStyle = C.earth; c.strokeStyle = rgba(C.violet, 0.9); c.lineWidth = 2; c.beginPath(); c.moveTo(-sz, -sz * 0.5); c.lineTo(sz * 0.7, -sz * 0.8); c.lineTo(sz, sz * 0.5); c.lineTo(-sz * 0.5, sz * 0.7); c.closePath(); c.fill(); c.stroke(); c.restore();
      }
      // light being drawn across the floor into the split: little motes streaming to the middle
      for (let i = 0; i < 30; i++) { const a = hash(i, 6) * TAU, qq = (t * 0.5 * (0.6 + hash(i, 7)) + hash(i, 8)) % 1, d = rr * 0.95 * (1 - qq); glow(c, Math.cos(a + qq * 0.8) * d, Math.sin(a + qq * 0.8) * d, 8 + 6 * qq, i % 3 ? '#e8dcc0' : C.violetHi, 0.55 * Math.sin(qq * Math.PI) * k); }
      c.restore();
    } }));
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => {
      const q = clamp(t / dur, 0, 1), k = e.a * (1 - clamp((t - dur) / 2.5, 0, 1));
      H.wash(c, '#000000', 0.2 * q * k, 'source-over');
      // the room's own light going: the whole thing warming toward violet-black as it nears
      glow(c, CORE.x, CORE.y + SPLIT, 120 + 360 * q, C.violet, 0.12 * q * k * (0.8 + 0.2 * Math.sin(t * 7)));
    } }));
    pulses.forEach((ts, i) => H.soon(sh, ts, () => {
      H.shockAt(0, 0, { r: H.AR * 1.2, color: C.violet, w: 10, dur: 0.9, flat: 0.8 }); H.shockAt(0, 0, { r: H.AR * 0.8, color: C.violetHi, w: 5, dur: 0.8, flat: 0.8, delay: 0.1 });
      H.roomTint(C.violetDk, 0.18 + 0.05 * i, 0.8); H.shake(5 + i * 2);
    }));
    H.emit(sh, dur + 2, 0.5, () => { const a = rand(0, TAU), d = rand(120, 480); VFX.spawn({ x: Math.cos(a) * d, y: Math.sin(a) * d, z: rand(8, 30), vx: -Math.cos(a) * 80, vy: -Math.sin(a) * 80, drag: 0.1, life: rand(1.0, 1.6), size: rand(5, 9), size1: 0, color: Math.random() < 0.5 ? C.violetHi : '#e8dcc0', kind: 'glow' }); });
  }
  function enrageLand(b, H) {
    VFX.fx({ dur: 2.0, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a, f = Math.max(0, 1 - p / 0.18);
      c.save();
      c.fillStyle = rgba(C.void, 0.92 * clamp(p / 0.25, 0, 1) * k); c.fillRect(-2800, -2800, 5600, 5600);
      c.globalCompositeOperation = 'screen'; c.fillStyle = rgba('#efe4ff', 0.6 * f * f * k); c.fillRect(-2800, -2800, 5600, 5600); c.globalCompositeOperation = 'source-over';
      glow(c, CORE.x, CORE.y + SPLIT, 260 * (1 - 0.8 * p), C.violetHi, 0.7 * k * (1 - clamp((p - 0.5) / 0.5, 0, 1)));
      c.restore();
    } });
    for (let i = 0; i < 4; i++) H.shockAt(0, 0, { r: H.AR * (1.5 - i * 0.25), color: i % 2 ? '#ffffff' : C.violet, w: 16 - i * 3, dur: 0.9 + i * 0.1, flat: 0.8, delay: i * 0.1 });
    H.roomTint('#05020a', 0.7, 1.4);
    H.shake(16);
  }
  // the entrance: the roots crack out across the floor from his feet, leaves rise off the ground, and his chest opens on the dark
  function intro(sh, b, H) {
    VFX.fx({ dur: 2.6, layer: 'ground', draw: (c, p, t, e) => {
      const q = easeOut(clamp(t / 1.6, 0, 1)), k = e.a * (1 - clamp((t - 1.8) / 0.8, 0, 1));
      c.save(); ARENA.trace(c, 2); c.clip();
      crackStar(c, b.x, b.y + 14, AR() * 1.1 * q, 16, 11, 0.8 * k, { w: 2.6, jag: 10, seg: 30 });
      glow(c, b.x, b.y + 14, 200 * q, C.void, 0.4 * k);
      c.restore();
    } });
    H.soon(sh, 0.15, () => { H.shockAt(b.x, b.y + 14, { r: AR() * 1.05, color: C.violet, w: 8, dur: 0.9, flat: 0.8 }); });
    H.soon(sh, 0.9, () => { H.shockAt(b.x, b.y + 14, { r: 300, color: C.earthHi, w: 9, dur: 0.8, flat: 0.8 }); groveUp(b.x, b.y + 20, 12, { size: 1.5, speed: 1.5 }); H.shake(7); });
    H.soon(sh, 1.3, () => { VFX.flash(b.x, b.y + SPLIT, 150, C.violetHi, 0.35); H.shockAt(b.x, b.y + 14, { r: 180, color: C.violetHi, w: 5, dur: 0.6, flat: 0.8, delay: 0.1 }); hungerUp(b.x, b.y + SPLIT + 40, 14, { size: 1.1, speed: 220 }); H.shake(5); });
    for (let i = 0; i < 18; i++) H.soon(sh, 0.3 + i * 0.07, () => { const a = rand(0, TAU), d = rand(80, 480); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.9, z: 4, vx: rand(-20, 20), vy: rand(-12, 12), vz: rand(120, 260), g: 120, drag: 0.04, life: rand(1.4, 2.2), size: rand(8, 13), size1: 3, color: C.leaf, kind: 'leaf', add: false, vr: rand(-6, 6), flutter: 7 }); });
  }
  // his fall: the tree shudders, the Hunger in his chest closes for good (a violet lens drawing shut, a last flare), the cracks of light going out
  // one after another, and the grove goes still and grey; dead leaves come down
  function death(sh, b, H) {
    VFX.fx({ dur: 3.4, layer: 'air', draw: (c, p, t, e) => {
      const open = 1 - easeIO(clamp((t - 0.5) / 1.6, 0, 1)), k = e.a * (1 - clamp((t - 2.7) / 0.7, 0, 1)), cx = b.x, cy = b.y + SPLIT;
      c.save();
      // the split drawing shut: a lens of dark with a violet rim, closing from the sides
      if (open > 0.02) {
        const hw = 15 * open + 1.5, hh = 62 * (0.4 + 0.6 * open);
        c.beginPath(); c.moveTo(cx, cy - hh); c.quadraticCurveTo(cx + hw * 1.6, cy, cx, cy + hh); c.quadraticCurveTo(cx - hw * 1.6, cy, cx, cy - hh); c.closePath();
        c.fillStyle = rgba(C.void, 0.9 * k); c.fill(); c.strokeStyle = rgba(C.violet, 0.9 * open * k); c.lineWidth = 2.4; c.stroke();
        glow(c, cx, cy, 70 * open + 10, C.violet, 0.35 * open * k * (0.7 + 0.3 * Math.sin(t * 18)));
      }
      // the last flare as it shuts
      const fl = Math.max(0, 1 - Math.abs(t - 2.1) / 0.2); if (fl > 0) { glow(c, cx, cy, 120, C.violetHi, 0.7 * fl * k); glow(c, cx, cy, 40, '#ffffff', 0.8 * fl * k); }
      // a grey shade of ash settling over the body
      const ash = easeOut(clamp((t - 1.0) / 1.8, 0, 1)); glow(c, b.x, b.y - 30, 230, '#8a8a86', 0.16 * ash * k);
      c.restore();
    } });
    H.soon(sh, 0.3, () => { H.shockAt(b.x, b.y + 14, { r: 340, color: C.violet, w: 10, dur: 0.8, flat: 0.8 }); groveUp(b.x, b.y + 10, 10, { size: 1.4, speed: 1.3 }); H.shake(9); });
    H.soon(sh, 1.0, () => { H.shockAt(b.x, b.y + 14, { r: 240, color: C.earthHi, w: 8, dur: 0.8, flat: 0.8 }); H.shake(6); });
    H.soon(sh, 2.1, () => { VFX.flash(b.x, b.y + SPLIT, 120, C.violetHi, 0.3); H.shockAt(b.x, b.y + 14, { r: 460, color: C.violetHi, w: 7, dur: 1.0, flat: 0.8 }); H.shake(8); });
    H.emit(sh, 3.2, 0.5, (p) => { const a = rand(0, TAU), d = rand(0, 200); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y - 60 + Math.sin(a) * d * 0.4, z: rand(80, 240), vx: rand(-14, 14), vy: rand(-8, 8), vz: rand(-50, -20), g: 0, drag: 0.1, life: rand(1.4, 2.4), size: rand(7, 12), size1: 2, color: p < 0.5 ? '#8a7a64' : C.leaf, kind: 'leaf', add: false, vr: rand(-4, 4), flutter: 7 }); });
    H.emit(sh, 2.6, 0.3, () => { const a = rand(0, TAU), d = rand(0, 110); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + SPLIT + 20 + Math.sin(a) * d * 0.4, z: rand(10, 80), vx: rand(-10, 10), vz: rand(20, 60), g: -10, life: rand(1, 1.6), size: rand(5, 9), size1: 0, color: C.violetHi, kind: 'glow' }); });
  }

  return {
    tell: tag => TELLS[tag] || null, buster, floor, roomOver, aftermath, prop, twin, puddle, enrage, enrageLand, intro, death,
    // (boss-vfx.js impact(): his moves land here; a tag it does not know falls through to the shared ones)
    impact(tg, msg, ctx, H) {
      const f = tg.type === 'buster' ? IMP.buster : IMP[tg.tag]; if (!f) return false;
      f(tg, msg, ctx, H); return true;
    },
    pit, spire, gem, LIMBFX,
  };
})();
