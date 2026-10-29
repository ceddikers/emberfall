// The Ultimate's echoes: burnt ghosts of the twelve fallen bosses, drawn with each boss's own art, and the call that raises them.
// Contract: docs/plans/2026-10-ultimate-build.md ("Echoes"). One echo is one roomev 'svecho:<n>' (who, sig, x, y, fly, rise, dur, face,
// kneel), ended by a second 'svecho:<n>' that carries no `who`, and posed by 'svechoact:<n>' { anim, dur }. Each echo lives like this:
//   the call     a comet of flame flies from its sigil on the halo to the floor (fly > 0), and the boss's sigil burns itself in on the
//                floor, stroke by stroke, like calligraphy;
//   the assembly cinders fly in from all round and settle, a bit at a time, into the boss's own body, drawn with its own art (BOSS_ART)
//                and then burnt: near-black, an ember rim, glowing cracks, bites missing from the edge (half-formed);
//   the kneel    it bows toward the Sovereign (not the Hollow King);
//   the stand    it idles in a shimmer of heat with embers rising, and plays a pose from 'svechoact' where its art has one;
//   the crumble  it breaks into flakes that a wind carries off, and its sigil fades slowly where it stood.
// Everything is a pure function of the clock, so a scrubbed or re-joined client draws the same thing. It is all drawn UNDER the
// telegraphs (ULT_ECHO.floor is called from ArenaView.drawZones, wrapped below), so an echo can never hide a mechanic.
// The look follows the painted VFX sheets: a hot white-yellow core, a saturated mid colour, dark ink edges, a slow aftermath.
// Preview: tools/preview/ult-echo.html, or window.__echoPreview(canvas, who, t, opts).

const ULT_ECHO = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const easeIn = q => q * q;
  const easeIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q));
  const C = { ink: '#0a0605', char: '#1a0e08', ember: '#ff7a22', emberHi: '#ffb050', hot: '#ffe9a0', white: '#fff8e8', red: '#b02a0c', redDk: '#4a1006', ash: '#7a726a', ashLt: '#a89f96' };
  const mixHex = (a, b, q) => { const pa = hexToRgb(a), pb = hexToRgb(b); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join(''); };
  // the timings that do not come in the message
  const KNEEL = 2.2, CRUMBLE = 2.6, LINGER = 1.9, SIGIL_FADE = 3.5, LIE = 3.2, LIE_HOLD = 0.8, LIE_ASH = 3.4, HALO_R = 118;
  // lying down (the kill): a slow lowering to the ground (LIE), a held breath (LIE_HOLD), then a soft fade to ash that rises as embers and flakes (LIE_ASH). Never the crumble's wind.
  const lieOf = rec => { const a = rec.acts.find(x => x.anim === 'liedown'); return a ? { s: a.start, d: a.start + LIE, a0: a.start + LIE + LIE_HOLD, a1: a.start + LIE + LIE_HOLD + LIE_ASH } : null; };
  // the wind that takes the flakes (screen right and a little up)
  const WIND = { x: 0.92, y: -0.38 };
  // `flame` is the boss's colour in its flame (the comet's rim and the sigil's mid colour are mixed from it). k is the art's scale, dx/dy
  // shift its centre in the sprite, box is the sprite's side; the Hydra is one head (ADD_ART 'hy-flame') with its neck left to fade away.
  const LOOK = {
    grubnak:    { k: 1.1,  box: 560, oy: 0.5, flame: '#9ccc4a' },
    skitterra:  { k: 1.1,  box: 560, oy: 0.5, flame: '#c58cff' },
    volkar:     { k: 1.1,  box: 600, oy: 0.5, flame: '#7fd8ff' },
    hollowking: { k: 1.1,  box: 560, oy: 0.5, flame: '#8affc0' },
    wyrm:       { k: 1.0,  box: 720, oy: 0.5, flame: '#ff9a4a' },
    titan:      { k: 1.0,  box: 640, oy: 0.5, flame: '#bfe8ff' },
    archmage:   { k: 1.1,  box: 600, oy: 0.5, flame: '#6ff0e0' },
    hydra:      { k: 1.5,  box: 560, oy: 0.5, flame: '#a8ff6a', dx: 0, head: true },
    corvane:    { k: 1.1,  box: 520, oy: 0.5, flame: '#8fe0ff' },
    brannoc:    { k: 1.4,  box: 680, oy: 0.5, flame: '#ffc23a' },
    morrowoak:  { k: 0.8,  box: 760, oy: 0.5, flame: '#a064ff' },
    caelum:     { k: 1.1,  box: 560, oy: 0.5, flame: '#d6dcf0' },
  };
  const WHO = Object.keys(LOOK);

  // ---------------------------------------------------------------- the floor sigils: a ringed circle and a glyph for each boss
  // Strokes are lists of polylines in a unit circle (y runs down); a stroke is drawn in order, each one taking time by its length.
  const arc = (cx, cy, r, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const ring = (r, n = 8, a0 = 0) => arc(0, 0, r, a0, a0 + TAU, n);
  const GLYPH = {
    grubnak: [[arc(0.05, 0.12, 0.42, 0, TAU)], [[[-0.78, 0.7], [-0.78, 0.1], [-0.55, 0.1], [-0.55, 0.7]]], [[[-0.4, -0.5], [-0.28, -0.65], [-0.4, -0.8]], [[-0.1, -0.5], [0.02, -0.65], [-0.1, -0.8]], [[0.2, -0.5], [0.32, -0.65], [0.2, -0.8]]], [[[0.55, 0.15], [0.8, 0.15], [0.8, 0.75], [0.55, 0.75], [0.55, 0.15]]]],
    skitterra: [[[[-0.72, 0], [0.72, 0]]], [[[-0.5, -0.5], [0.5, 0.5]]], [[[0.5, -0.5], [-0.5, 0.5]]], [[[0, -0.72], [0, 0.72]]], [ring(0.24, 8, 0.4)], [ring(0.48, 8, 0.4)], [ring(0.7, 8, 0.4)]],
    volkar: [[[[0.2, -0.82], [-0.3, -0.04], [0.06, -0.04], [-0.22, 0.82], [0.4, -0.02], [0.04, -0.02], [0.2, -0.82]]], [arc(0, 0, 0.78, 2.5, 3.8)], [arc(0, 0, 0.78, -0.65, 0.65)]],
    hollowking: [[[[-0.62, 0.22], [-0.62, -0.46], [-0.3, -0.16], [0, -0.62], [0.3, -0.16], [0.62, -0.46], [0.62, 0.22], [-0.62, 0.22]]], [[[0, 0.22], [0, 0.46]]], [arc(0, 0.64, 0.17, 0, TAU, 14)], [[[-0.14, 0.9], [0.14, 0.9]]]],
    wyrm: [[[[0, -0.1], [-0.34, -0.62], [-0.82, -0.4], [-0.58, -0.04], [-0.78, 0.3], [-0.3, 0.16], [0, 0.72]]], [[[0, -0.1], [0.34, -0.62], [0.82, -0.4], [0.58, -0.04], [0.78, 0.3], [0.3, 0.16], [0, 0.72]]], [[[0, -0.84], [0, -0.1]]]],
    titan: [[[[-0.8, 0], [0.8, 0]]], [[[-0.4, -0.69], [0.4, 0.69]]], [[[0.4, -0.69], [-0.4, 0.69]]], [ring(0.4, 6)], [[[-0.62, -0.18], [-0.8, 0], [-0.62, 0.18]], [[0.62, -0.18], [0.8, 0], [0.62, 0.18]], [[0.1, -0.78], [0.4, -0.69], [0.34, -0.4]], [[-0.1, 0.78], [-0.4, 0.69], [-0.34, 0.4]]]],
    archmage: [[[[0, -0.78], [0.68, 0.4], [-0.68, 0.4], [0, -0.78]]], [[[0, 0.78], [-0.68, -0.4], [0.68, -0.4], [0, 0.78]]], [arc(0, 0, 0.2, 0, TAU, 12)], [[[-0.06, 0], [0.06, 0]]]],
    hydra: [[arc(0, 0.62, 0.34, 3.4, 6.0, 14)], [[[0, 0.62], [-0.3, 0.1], [-0.62, -0.3], [-0.6, -0.62]]], [[[0, 0.62], [0.02, 0.05], [-0.06, -0.4], [0, -0.82]]], [[[0, 0.62], [0.3, 0.1], [0.62, -0.3], [0.6, -0.62]]], [[[-0.72, -0.5], [-0.6, -0.68], [-0.46, -0.5]], [[-0.1, -0.7], [0, -0.88], [0.1, -0.7]], [[0.46, -0.5], [0.6, -0.68], [0.72, -0.5]]]],
    corvane: [[[[-0.72, -0.72], [0.72, 0.72]]], [[[0.72, -0.72], [-0.72, 0.72]]], [[[-0.6, -0.2], [-0.2, -0.6]], [[0.6, -0.2], [0.2, -0.6]]], [arc(0, 0, 0.32, 0.9, TAU - 0.9, 14)]],
    brannoc: [[ring(0.4, 20)], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [[[Math.cos(i * TAU / 8) * 0.46, Math.sin(i * TAU / 8) * 0.46], [Math.cos(i * TAU / 8) * 0.8, Math.sin(i * TAU / 8) * 0.8]]]), [arc(0, 0, 0.16, 0, TAU, 10)]],
    morrowoak: [[[[0, 0.78], [0, -0.2]]], [[[0, 0.02], [-0.5, -0.4]], [[0, -0.2], [0.5, -0.6]], [[0, 0.3], [0.46, 0]], [[0, 0.38], [-0.42, 0.1]]], [arc(0, -0.4, 0.46, 3.5, 5.9, 14)], [[[0, 0.78], [-0.38, 0.88]], [[0, 0.78], [0.38, 0.88]]]],
    caelum: [[[[0, -0.84], [0.15, -0.15], [0.84, 0], [0.15, 0.15], [0, 0.84], [-0.15, 0.15], [-0.84, 0], [-0.15, -0.15], [0, -0.84]]], [arc(0, 0, 0.5, 0.4, 2.7, 12)], [[[0.82, -0.82], [0.34, -0.34]]]],
  };
  // (the tick marks between the two rings: many short parts that are drawn as one stroke)
  const TICKS = Array.from({ length: 16 }, (_, i) => { const a = (i + 0.5) * TAU / 16; return [[Math.cos(a) * 0.89, Math.sin(a) * 0.89], [Math.cos(a) * 0.98, Math.sin(a) * 0.98]]; });
  const polyLen = p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
  const sigilCache = new Map();
  // the strokes of a boss's sigil with their share of the burn: { parts, len, w, t0, t1 }
  function sigilOf(who) {
    let s = sigilCache.get(who); if (s) return s;
    const raw = [{ parts: [ring(1, 48)], w: 2.6 }, { parts: [ring(0.86, 48)], w: 1.6 }, { parts: TICKS, w: 1.8 }, ...(GLYPH[who] || []).map(parts => ({ parts, w: 3.2 }))];
    let tot = 0;
    for (const st of raw) { st.len = st.parts.reduce((a, p) => a + polyLen(p), 0); st.wt = 0.3 + Math.sqrt(st.len); tot += st.wt; }
    let at = 0;
    for (const st of raw) { st.t0 = at / tot; at += st.wt; st.t1 = at / tot; }
    sigilCache.set(who, raw); return raw;
  }

  // ---------------------------------------------------------------- the burnt bodies
  const S = { echoes: new Map(), spr: new Map(), frame: -1e9, warned: false };
  const mk = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  const artOf = who => (who === 'hydra' ? (typeof ADD_ART !== 'undefined' ? ADD_ART['hy-flame'] : null) : (typeof BOSS_ART !== 'undefined' ? BOSS_ART[who] : null));
  // the boss in the state its art draws as standing at rest, or in the pose a 'svechoact' asks for
  function stateOf(who, pose) {
    const u = pose ? pose.u : 0.4, st = { t: u, moving: false, action: null, phase: 0, props: {}, hs: 1.3 }, P = st.props;
    if (who === 'caelum') P.clWake = true;
    if (who === 'corvane') { P.stance = null; P.notch = 0; P.over = 0; }
    if (!pose) return st;
    const a = pose.anim;
    if (a === 'crane' || a === 'comet' || a === 'parting') P.stance = a;
    else if (a === 'kneel') P.kneel = true;
    else if (a === 'bell' || a === 'knell') P.knell = 1;
    else if (a === 'attack' || a === 'strike') st.action = { type: 'attack', t0: 0, dur: pose.dur || 1.2 };
    else if (a && a !== 'liedown') P[a] = 1;
    return st;
  }
  // the silhouette's cells: the body is broken into a grid, and each cell has its own moment to come in and to blow away
  const CG = 16;
  function makeSprite(who, face, pose) {
    const L = LOOK[who], art = artOf(who);
    if (!L || !art || typeof document === 'undefined') return null;
    const N = L.box, ox = N / 2 + (L.dx || 0), oy = N * L.oy + (L.dy || 0), ang = face, cv = mk(N), c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, ox, oy); c.scale(L.k, L.k); c.rotate(ang);
    try { art(c, stateOf(who, pose), L.head ? false : ang); } catch (err) { /* a body that will not draw leaves an empty ghost */ }
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the Hydra's neck runs away behind the head: let it fade to nothing like smoke
    if (L.head) { c.setTransform(1, 0, 0, 1, ox, oy); c.rotate(ang); c.globalCompositeOperation = 'destination-in'; const g = c.createLinearGradient(-95 * L.k, 0, -28 * L.k, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(-N, -N, 2 * N, 2 * N); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; }
    // harden the edge (the art's soft glows would otherwise burn into black haloes), and read the shape: its box, interior and edge points
    const sp = { N, ox, oy, B: null, K: null, bb: { x0: N, y0: N, x1: 0, y1: 0 }, pts: [], edge: [], cells: [], cs: N / CG };
    let img = null;
    try { img = c.getImageData(0, 0, N, N); } catch (err) { img = null; }
    if (img) {
      const d = img.data;
      for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
      c.putImageData(img, 0, 0);
      const bb = sp.bb, A = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : d[(y * N + x) * 4 + 3]);
      for (let y = 0; y < N; y += 3) for (let x = 0; x < N; x += 3) {
        if (!d[(y * N + x) * 4 + 3]) continue;
        if (x < bb.x0) bb.x0 = x; if (x > bb.x1) bb.x1 = x; if (y < bb.y0) bb.y0 = y; if (y > bb.y1) bb.y1 = y;
        sp.pts.push([x, y]);
        if (!A(x - 4, y) || !A(x + 4, y) || !A(x, y - 4) || !A(x, y + 4)) sp.edge.push([x, y]);
      }
    }
    const bb = sp.bb;
    if (bb.x1 <= bb.x0) { bb.x0 = N * 0.4; bb.x1 = N * 0.6; bb.y0 = N * 0.4; bb.y1 = N * 0.6; sp.pts = [[N / 2, N / 2]]; sp.edge = sp.pts; }
    bb.w = bb.x1 - bb.x0; bb.h = bb.y1 - bb.y0; bb.cx = (bb.x0 + bb.x1) / 2; bb.cy = (bb.y0 + bb.y1) / 2;
    // the body: near-black with a ghost of its own shading, lit a little from underneath
    const B = sp.B = mk(N), b = B.getContext('2d');
    b.drawImage(cv, 0, 0); b.globalCompositeOperation = 'source-atop';
    b.fillStyle = 'rgba(8,4,3,0.94)'; b.fillRect(0, 0, N, N);
    b.globalAlpha = 0.1; b.drawImage(cv, 0, 0); b.globalAlpha = 1;
    const lg = b.createLinearGradient(0, bb.y1, 0, bb.y0 + bb.h * 0.4); lg.addColorStop(0, 'rgba(255,92,20,0.38)'); lg.addColorStop(1, 'rgba(255,92,20,0)');
    b.fillStyle = lg; b.fillRect(0, 0, N, N);
    // the rim: an outer ring of ember, and a hot inner edge along the lower-left (the fire under it)
    const R = mk(N), r = R.getContext('2d');
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2.2, -2.2], [2.2, 2.2], [2.2, -2.2], [-2.2, 2.2]]) r.drawImage(cv, dx, dy);
    r.globalCompositeOperation = 'source-in'; r.fillStyle = C.ember; r.fillRect(0, 0, N, N);
    r.globalCompositeOperation = 'destination-out'; r.drawImage(cv, 0, 0);
    const I = mk(N), ic = I.getContext('2d');
    ic.drawImage(cv, 0, 0); ic.globalCompositeOperation = 'source-in'; ic.fillStyle = C.emberHi; ic.fillRect(0, 0, N, N);
    ic.globalCompositeOperation = 'destination-out'; ic.drawImage(cv, 2.4, -2.4); ic.drawImage(cv, 0.8, -3); ic.drawImage(cv, 3, -0.8);
    b.globalCompositeOperation = 'source-over'; b.globalAlpha = 0.95; b.drawImage(R, 0, 0); b.globalAlpha = 0.85; b.drawImage(I, 0, 0); b.globalAlpha = 1;
    // the cracks: jagged fissures that glow, an ink edge, a hot core; a heart of fire in the middle, and all of it kept inside the shape
    const K = sp.K = mk(N), k = K.getContext('2d'), pts = sp.pts;
    k.lineCap = 'round'; k.lineJoin = 'round';
    const seed = WHO.indexOf(who) * 17 + 3, pick = i => pts[Math.floor(hash(i, seed) * pts.length) % pts.length];
    const heart = k.createRadialGradient(bb.cx, bb.cy, 0, bb.cx, bb.cy, Math.max(30, bb.w * 0.2)); heart.addColorStop(0, 'rgba(255,150,50,0.22)'); heart.addColorStop(1, 'rgba(255,90,20,0)');
    k.fillStyle = heart; k.fillRect(0, 0, N, N);
    const crack = (x, y, a, steps, w, depth) => {
      const path = [[x, y]];
      for (let i = 0; i < steps; i++) { a += (hash(x + i * 3.1, y + depth + seed) - 0.5) * 1.5; x += Math.cos(a) * (10 + 12 * hash(i, x + seed)); y += Math.sin(a) * (10 + 12 * hash(i, y + seed)); path.push([x, y]); if (depth < 2 && i === 2 && hash(i, x + y) < 0.7) crack(x, y, a + (hash(x, y) < 0.5 ? 0.8 : -0.8), steps - 2, w * 0.7, depth + 1); }
      for (const [col, lw] of [['rgba(0,0,0,0.65)', w + 3.6], [C.ember, w + 0.8], [C.hot, Math.max(0.8, w * 0.38)]]) { k.beginPath(); path.forEach(([px, py], i) => (i ? k.lineTo(px, py) : k.moveTo(px, py))); k.strokeStyle = col; k.lineWidth = lw; k.stroke(); }
    };
    for (let i = 0; i < 9; i++) { const [px, py] = pick(i); crack(px, py, hash(i, seed + 5) * TAU, 5 + Math.floor(hash(i, seed + 9) * 4), 2.2, 0); }
    k.globalCompositeOperation = 'destination-in'; k.drawImage(cv, 0, 0);
    // half-formed: bites out of the edge (more of them high up and out at the points), through the body, the rim and the cracks
    if (sp.edge.length) {
      const u = clamp(Math.min(bb.w, bb.h) / 70, 0.5, 3);
      for (const g of [b, k]) {
        g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
        for (let i = 0; i < 12; i++) {
          let e = sp.edge[Math.floor(hash(i, seed + 21) * sp.edge.length) % sp.edge.length];
          if (i % 2 && e[1] > bb.cy) e = sp.edge[Math.floor(hash(i, seed + 22) * sp.edge.length) % sp.edge.length];
          for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(e[0] + (hash(j, i + seed) - 0.5) * 9 * u, e[1] + (hash(j + 5, i + seed) - 0.5) * 9 * u, (2 + 5 * hash(j + 9, i + seed)) * u, 0, TAU); g.fill(); }
        }
        g.globalCompositeOperation = 'source-over';
      }
    }
    // the cells that hold something
    const cs = sp.cs, occ = new Set(); for (const [x, y] of pts) occ.add(Math.floor(x / cs) + Math.floor(y / cs) * CG);
    for (const id of occ) {
      const gx = id % CG, gy = (id - gx) / CG, cx = (gx + 0.5) * cs, cy = (gy + 0.5) * cs, n = sp.cells.length;
      const yn = clamp((cy - bb.y0) / Math.max(1, bb.h), 0, 1), wind = clamp(((cx - bb.cx) * WIND.x + (cy - bb.cy) * WIND.y) / Math.max(1, bb.w * 0.55) * 0.5 + 0.5, 0, 1);
      sp.cells.push({ x: gx * cs, y: gy * cs, cx, cy, ta: clamp(0.62 * hash(n, seed + 31) + 0.38 * (1 - yn), 0, 1), tc: clamp(0.5 * hash(n, seed + 33) + 0.5 * (1 - wind * 0.7 - yn * 0.3), 0, 1), n });
    }
    return sp;
  }
  function spriteOf(who, face, pose, pid) {
    const qf = Math.round((((face % TAU) + TAU) % TAU) / TAU * 24) % 24, key = who + '|' + qf + '|' + (pose ? pid : 'rest');
    let sp = S.spr.get(key); if (sp !== undefined) return sp;
    if (S.spr.size > 70) S.spr.clear();
    sp = makeSprite(who, qf * TAU / 24, pose); S.spr.set(key, sp); return sp;
  }

  // ---------------------------------------------------------------- where the halo and the Sovereign are (the art can replace these)
  const hooks = {
    // the Sovereign's place: the live boss, or the middle of the room
    boss() { try { const r = window.__game && window.__game.raid, b = r && r.bossDraw; if (b && Number.isFinite(b.x)) return { x: b.x, y: b.y }; } catch (e) { /* cosmetic */ } return { x: 0, y: 0 }; },
    // sigil i on the halo at time t
    halo(i, t) { const b = hooks.boss(), a = i / 12 * TAU + t * 0.12 - Math.PI / 2; return { x: b.x + Math.cos(a) * HALO_R, y: b.y + Math.sin(a) * HALO_R }; },
  };

  // ---------------------------------------------------------------- the pieces
  const stroke = (ctx, pts, col, w, a) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.stroke(); };
  const ember = (ctx, x, y, r, a, flame, k = 1) => { glow(ctx, x, y, r * 2.6, flame || C.red, 0.5 * a * k); glow(ctx, x, y, r * 1.4, C.ember, 0.7 * a * k); glow(ctx, x, y, r * 0.6, C.hot, a * k); };
  // the floor sigil burning in (bp 0..1 = how much of it is drawn), smouldering after, fading as fa falls
  function sigil(ctx, rec, t, bp, fa) {
    if (fa <= 0.01 || bp <= 0) return;
    const st = sigilOf(rec.who), L = LOOK[rec.who], R = rec.sigR, x = rec.x, y = rec.y + (rec.sigDy || 0), wk = R / 84, flame = L.flame, mid = mixHex(C.ember, flame, 0.3);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // the scorch under it, and a breath of heat
    const sc = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 1.25); sc.addColorStop(0, rgba('#050202', 0.34 * fa * Math.min(1, bp * 2))); sc.addColorStop(0.8, rgba('#050202', 0.24 * fa * Math.min(1, bp * 2))); sc.addColorStop(1, rgba('#050202', 0));
    ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(x, y, R * 1.25, 0, TAU); ctx.fill();
    let tip = null;
    for (let si = 0; si < st.length; si++) {
      const s = st[si], p = clamp((bp - s.t0) / (s.t1 - s.t0), 0, 1); if (p <= 0) continue;
      const since = p >= 1 ? (bp - s.t1) * rec.burnDur : 0, hot = p < 1 ? 1 : Math.max(0, 1 - since / 0.9), smo = 0.55 + 0.2 * Math.sin(t * 1.7 + si * 1.3);
      let left = s.len * p, W = s.w * wk;
      // draw the parts up to `left` of length; width tapers at the ends of the stroke like a brush
      const segs = [];
      let done = 0;
      for (const part of s.parts) {
        const pl = polyLen(part); if (left <= 0) break;
        const take = Math.min(1, left / Math.max(pl, 1e-6)), pts = [];
        let acc = 0;
        for (let i = 0; i < part.length; i++) {
          if (i === 0) { pts.push(part[0]); continue; }
          const dl = Math.hypot(part[i][0] - part[i - 1][0], part[i][1] - part[i - 1][1]);
          if (acc + dl <= pl * take + 1e-9) { pts.push(part[i]); acc += dl; }
          else { const q = (pl * take - acc) / Math.max(dl, 1e-6); pts.push([lerp(part[i - 1][0], part[i][0], q), lerp(part[i - 1][1], part[i][1], q)]); break; }
        }
        segs.push({ pts, off: done / s.len, ln: pl / s.len }); left -= pl; done += pl;
        if (take < 1) tip = pts[pts.length - 1];
      }
      const bw = u => 0.55 + 0.45 * Math.pow(Math.sin(clamp(u, 0.02, 0.98) * Math.PI), 0.5);
      for (const [col, wm, al] of [['#060202', 2.1, 0.5 * fa], [mid, 1, (0.5 + 0.35 * hot) * fa * (hot > 0.01 ? 1 : smo + 0.2)], [C.hot, 0.38, (0.25 + 0.7 * hot) * fa]]) {
        for (const sg of segs) {
          const pts = sg.pts;
          for (let i = 1; i < pts.length; i++) {
            const u = sg.off + sg.ln * (i / (pts.length - 1)), a = [x + pts[i - 1][0] * R, y + pts[i - 1][1] * R], b = [x + pts[i][0] * R, y + pts[i][1] * R];
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = rgba(col, al); ctx.lineWidth = W * wm * bw(u); ctx.stroke();
          }
        }
      }
      if (hot > 0.02) { ctx.globalCompositeOperation = 'lighter'; for (const sg of segs) { const m = sg.pts[Math.floor(sg.pts.length / 2)]; glow(ctx, x + m[0] * R, y + m[1] * R, 22 * wk, mid, 0.25 * hot * fa); } ctx.globalCompositeOperation = 'source-over'; }
    }
    // the pen: a white-hot tip with sparks, while the last stroke is being drawn
    if (tip && bp < 1) {
      const tx = x + tip[0] * R, ty = y + tip[1] * R; ctx.globalCompositeOperation = 'lighter';
      ember(ctx, tx, ty, 9 * wk + 3, fa, flame);
      for (let i = 0; i < 6; i++) { const ph = (t * 3 + i * 0.37) % 1, a = hash(Math.floor(t * 3 + i * 0.37), i) * TAU; glow(ctx, tx + Math.cos(a) * ph * 18, ty + Math.sin(a) * ph * 12 - ph * 16, 3, C.hot, (1 - ph) * 0.8 * fa); }
      ctx.globalCompositeOperation = 'source-over';
    }
    // the whole sigil, lit softly from within once it is there
    if (bp >= 1) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, R * 1.05, mid, (0.1 + 0.04 * Math.sin(t * 1.4 + rec.n)) * fa); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }

  // the comet: a flame with a long trail, flying from the halo to the floor, leaving a ring of heat and a burst of embers where it lands
  function comet(ctx, rec, t) {
    const L = LOOK[rec.who], flame = L.flame, mid = mixHex(C.ember, flame, 0.3), land = rec.land, fly = rec.fly;
    const P0 = rec.from, P2 = { x: rec.x, y: rec.y }, dist = Math.hypot(P2.x - P0.x, P2.y - P0.y);
    const P1 = { x: (P0.x + P2.x) / 2, y: Math.min(P0.y, P2.y) - 70 - dist * 0.22 };
    const bez = s => { const m = 1 - s; return { x: m * m * P0.x + 2 * m * s * P1.x + s * s * P2.x, y: m * m * P0.y + 2 * m * s * P1.y + s * s * P2.y }; };
    ctx.save();
    if (t < land) {
      const q = clamp((t - rec.T0) / fly, 0, 1), s = Math.pow(q, 1.45), head = bez(s);
      // the dark streak behind it (ink), then the lit trail from tail to head
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const tail = Math.max(0, s - 0.5), N = 26;
      ctx.beginPath(); for (let j = 0; j <= N; j++) { const p = bez(lerp(s, tail, j / N)); j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.strokeStyle = rgba(C.ink, 0.32); ctx.lineWidth = 9; ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 24; j >= 0; j--) {
        const sj = Math.max(0, s - j * 0.019), p = bez(sj), f = 1 - j / 25, col = j < 3 ? C.white : j < 8 ? C.hot : j < 16 ? mid : C.red;
        glow(ctx, p.x, p.y, 7 + 24 * Math.pow(f, 1.2), col, 0.78 * Math.pow(f, 1.2) * (q < 0.04 ? q / 0.04 : 1));
      }
      // sparks shed along the way, and a flare at the head
      for (let m = 0; m < 12; m++) {
        const lag = 0.03 + ((m * 0.41 + t * 2.1) % 1) * 0.22, sj = Math.max(0, s - lag), p = bez(sj), k = 1 - lag / 0.25, off = (hash(m, Math.floor(t * 2.1 + m * 0.41)) - 0.5) * 36 * (1 - k * 0.4);
        glow(ctx, p.x + off, p.y + Math.abs(off) * 0.8 + (1 - k) * 22, 3 + 2 * k, m % 3 ? C.emberHi : C.hot, 0.8 * k);
      }
      glow(ctx, head.x, head.y, 46, mid, 0.55); glow(ctx, head.x, head.y, 22, C.hot, 0.9); glow(ctx, head.x, head.y, 9, C.white, 1);
      ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(t * 5); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, -2); ctx.lineTo(34, 0); ctx.lineTo(26, 2); ctx.closePath(); ctx.fillStyle = rgba(C.hot, 0.55); ctx.fill(); } ctx.restore();
    } else {
      // the landing: a ring of heat running out over the floor, a flash, embers thrown up
      const u = (t - land) / 0.9;
      if (u >= 0 && u < 1) {
        const x = P2.x, y = P2.y + 6; ctx.globalCompositeOperation = 'lighter';
        const e = 1 - Math.pow(1 - u, 2.4);
        ctx.beginPath(); ctx.arc(x, y, 30 + 150 * e, 0, TAU); ctx.strokeStyle = rgba(mid, 0.7 * (1 - u)); ctx.lineWidth = 7 * (1 - u) + 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 20 + 100 * e, 0, TAU); ctx.strokeStyle = rgba(C.hot, 0.8 * (1 - u)); ctx.lineWidth = 2.4 * (1 - u) + 0.5; ctx.stroke();
        glow(ctx, x, y - 20, 140 * (1 - u * 0.6), mid, 0.5 * (1 - u)); glow(ctx, x, y - 20, 60, C.white, 0.8 * Math.pow(1 - u, 2));
        for (let i = 0; i < 22; i++) { const a = hash(i, 4) * TAU, sp = 60 + 140 * hash(i, 5), px = x + Math.cos(a) * sp * e, py = y - 14 + Math.sin(a) * sp * e * 0.6 - 90 * e * hash(i, 6) + 60 * u * u; glow(ctx, px, py, 4 + 3 * hash(i, 7), i % 3 ? C.emberHi : C.hot, (1 - u) * 0.9); }
      }
    }
    ctx.restore();
  }

  // draw the body's cells: fn(cell) gives { dx, dy, rot, s, a, g } or null; the cracks go on over each in additive light
  function tiles(ctx, sp, fn, glowK) {
    const cs = sp.cs, ga = ctx.globalAlpha;
    for (let i = 0; i < sp.cells.length; i++) {
      const c = sp.cells[i], m = fn(c); if (!m || m.a <= 0.01) continue;
      ctx.save(); ctx.translate(c.cx + m.dx, c.cy + m.dy); if (m.rot) ctx.rotate(m.rot); if (m.s !== 1) ctx.scale(m.s, m.s);
      ctx.globalAlpha = ga * m.a; ctx.drawImage(sp.B, c.x, c.y, cs, cs, -cs / 2, -cs / 2, cs, cs);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * m.a * glowK * (m.g ?? 1); ctx.drawImage(sp.K, c.x, c.y, cs, cs, -cs / 2, -cs / 2, cs, cs);
      ctx.restore();
    }
    ctx.globalAlpha = ga;
  }
  // the whole body at rest: in thin strips that sway a little with the heat, the cracks on top
  function steady(ctx, sp, t, seed, glowK) {
    const bb = sp.bb, x0 = bb.x0 - 8, w = bb.w + 16, ga = ctx.globalAlpha;
    for (let v = Math.floor(bb.y0 - 4); v < bb.y1 + 4; v += 5) {
      const sx = Math.sin(v * 0.085 + t * 4.1 + seed) * 1.3 * (0.4 + 0.6 * (1 - (v - bb.y0) / Math.max(1, bb.h)));
      ctx.drawImage(sp.B, x0, v, w, 5, x0 + sx, v, w, 5);
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * glowK; ctx.drawImage(sp.K, 0, 0); ctx.globalAlpha = ga; ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- one echo's whole life at time t
  function body(ctx, rec, t) {
    const L = LOOK[rec.who], flame = L.flame, mid = mixHex(C.ember, flame, 0.3);
    const q = clamp((t - rec.land) / rec.rise, 0, 1);
    if (t < rec.land && q <= 0) return;
    // what it is doing: the pose now, the kneel, lying down, crumbling
    let pose = null;
    for (const a of rec.acts) if (t >= a.start && t < a.start + a.dur && a.anim !== 'liedown') pose = { anim: a.anim, u: t - a.start, dur: a.dur };
    const ks = rec.land + rec.rise, ku = (t - ks) / KNEEL, kneelK = rec.kneel && ku > 0 && ku < 1 ? Math.min(easeIO(clamp(ku / 0.28, 0, 1)), easeIO(clamp((1 - ku) / 0.28, 0, 1))) : 0;
    const lie = rec.acts.find(a => a.anim === 'liedown'), lieK = lie ? easeIO(clamp((t - lie.start) / LIE, 0, 1)) : 0, lt = lie ? lieOf(rec) : null;
    const cAt = lt ? Infinity : rec.crumbleAt, cq = (t - cAt) / CRUMBLE, aq = lt ? clamp((t - lt.a0) / LIE_ASH, 0, 1) : 0;
    if (lt && t > lt.a1 + 0.5) return;
    if (cq > 1 + LINGER / CRUMBLE) return;
    const wasPose = pose && pose.anim !== 'kneel', cornKneel = rec.who === 'corvane' && kneelK > 0.4;
    const pid = cornKneel ? 'kneel' : pose ? pose.anim + Math.floor(pose.u * 9) : '';
    const sp = spriteOf(rec.who, rec.face, cornKneel ? { anim: 'kneel', u: 0.4, dur: 1 } : wasPose ? pose : null, pid);
    if (!sp) return;
    const bb = sp.bb, seed = rec.n * 3.7 + WHO.indexOf(rec.who);
    const solid = q * (1 - clamp(cq, 0, 1)) * (1 - aq);
    const crackFlare = 1 + 0.9 * Math.sin(clamp(cq * 3, 0, 1) * Math.PI) * (cq > 0 ? 1 : 0) + 0.6 * Math.sin(clamp(q * 1.0, 0, 1) * Math.PI) * (q < 1 ? 1 : 0);
    const glowK = (0.55 + 0.3 * Math.sin(t * 2.3 + seed) + 0.1 * Math.sin(t * 5.1 + seed * 2)) * crackFlare * (1 - 0.82 * lieK) * (1 - 0.5 * aq);
    const ba = Math.atan2(rec.boss.y - rec.y, rec.boss.x - rec.x);
    ctx.save();
    // the soot where it stands, and the heat of it
    const fx = rec.x, fy = rec.y + (bb.y1 - sp.oy) - 8, sr = Math.max(50, bb.w * 0.55), sa = clamp(q * 1.6, 0, 1) * (1 - clamp(cq - 0.4, 0, 1));
    if (sa > 0.01) {
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1, 0.46); const g = ctx.createRadialGradient(0, 0, sr * 0.1, 0, 0, sr); g.addColorStop(0, rgba('#050202', 0.5 * sa)); g.addColorStop(0.7, rgba('#050202', 0.34 * sa)); g.addColorStop(1, rgba('#050202', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, sr, 0, TAU); ctx.fill(); ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, fx, fy - 6, sr * 1.15, mid, 0.13 * sa * (0.8 + 0.2 * Math.sin(t * 2 + seed))); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.translate(rec.x, rec.y);
    if (kneelK > 0 && rec.who !== 'corvane') { ctx.rotate(ba); ctx.translate(9 * kneelK, 5 * kneelK); ctx.scale(1 - 0.15 * kneelK, 1 + 0.04 * kneelK); ctx.rotate(-ba); }
    else if (kneelK > 0) { ctx.rotate(ba); ctx.translate(5 * kneelK, 2 * kneelK); ctx.rotate(-ba); }
    const fy2 = bb.y1 - sp.oy, lside = rec.n % 2 ? 1 : -1, lKn = easeIO(clamp(lieK / 0.5, 0, 1)), lFl = easeIO(clamp((lieK - 0.3) / 0.7, 0, 1)), lAng = lside * 1.25 * lFl, lSx = 1 + 0.1 * lFl, lSy = 1 - 0.16 * lKn - 0.32 * lFl;
    if (lieK > 0) { ctx.translate(0, fy2); ctx.rotate(lAng); ctx.scale(lSx, lSy); ctx.translate(0, -fy2); }   // (it kneels a little, then is lowered onto its side, and settles)
    ctx.translate(-sp.ox, -sp.oy);
    const ga0 = ctx.globalAlpha;
    if (aq > 0) {
      // the ash: each cell lets go of its colour and lifts a little, one after another, fading; nothing is thrown
      tiles(ctx, sp, c => { const u = clamp((aq - c.tc * 0.55) / 0.45, 0, 1); if (u >= 1) return null; return { dx: Math.sin(t * 0.9 + c.n) * 2.2 * u, dy: -u * (10 + 16 * u), rot: 0, s: 1 - 0.15 * u, a: (1 - u) * (1 - u * 0.3), g: 0.7 + 0.5 * u }; }, glowK);
    } else if (q >= 1 && cq <= 0) steady(ctx, sp, t, seed, glowK);
    else if (cq <= 0) {
      // the assembly: each cell has its flake of ash and ember that flies in from a long way off and settles into it
      tiles(ctx, sp, c => {
        const ka = clamp((q - c.ta * 0.68) / 0.32, 0, 1), ta = clamp((ka - 0.55) / 0.45, 0, 1);
        return ta > 0 ? { dx: 0, dy: 0, rot: (1 - ta) * 0.4 * (hash(c.n, 5) - 0.5), s: 0.65 + 0.35 * ta, a: ta, g: 0.4 + ta } : null;
      }, glowK);
      ctx.globalCompositeOperation = 'lighter';
      for (const c of sp.cells) {
        const ka = clamp((q - c.ta * 0.68) / 0.32, 0, 1); if (ka <= 0 || ka >= 0.98) continue;
        const a = hash(c.n, 3) * TAU, d = 150 + 130 * hash(c.n, 4), e = ka * ka * (3 - 2 * ka), fx0 = Math.cos(a) * d + 70, fy0 = Math.sin(a) * d * 0.7 - 80;
        for (let tr = 0; tr < 3; tr++) { const ee = clamp(e - tr * 0.09, 0, 1); glow(ctx, c.cx + fx0 * (1 - ee), c.cy + fy0 * (1 - ee) + Math.sin(t * 9 + c.n) * 3, 6 - tr * 1.4, tr ? C.emberHi : C.hot, (0.9 - tr * 0.28) * Math.sin(ka * Math.PI) ** 0.5); }
      }
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // the crumble: cells leave in the order the wind finds them, turning as they go, and become flakes that burn down to ash
      tiles(ctx, sp, c => {
        const u = Math.max(0, (cq - c.tc * 0.6) / 0.4); if (u >= 1) return null;
        const o = easeIn(u), side = hash(c.n, 8) - 0.5;
        return { dx: WIND.x * o * 130 + side * 20 * o + Math.sin(t * 3 + c.n) * 3 * u, dy: WIND.y * o * 90 - o * 34 + side * 14 * o, rot: o * 3 * side, s: 1 - 0.55 * o, a: (1 - u) * (1 - u * 0.2), g: 1 + 1.4 * u };
      }, glowK * 1.4);
      for (const c of sp.cells) {
        const u = Math.max(0, (cq - c.tc * 0.6) / 0.4); if (u < 0.12 || u > 2.1) continue;
        for (let f = 0; f < 3; f++) {
          const sd = hash(c.n + f * 13, 11), uu = u * (0.8 + 0.5 * sd), o = Math.pow(uu, 1.25), al = clamp(1 - (u - 0.12) / 1.9, 0, 1) * (0.5 + 0.5 * sd);
          const px = c.cx + (hash(f, c.n) - 0.5) * 26 + WIND.x * o * (150 + 110 * sd) + Math.sin(t * 2 + c.n + f) * 7, py = c.cy + (hash(f + 3, c.n) - 0.5) * 26 + WIND.y * o * (100 + 80 * sd) - o * (30 + 40 * sd) + o * o * 8;
          if (uu < 0.7) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, px, py, 5 + 4 * sd, uu < 0.4 ? C.hot : C.ember, al * 0.9); }
          ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(px, py); ctx.rotate(t * (2 + sd * 3) + f); ctx.fillStyle = rgba(sd < 0.5 ? C.ash : C.ashLt, al * 0.7); const sz = 2.2 + 3.2 * sd; ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2); ctx.restore();
        }
      }
    }
    // embers rising off the standing body, and a haze of heat above it
    if (solid > 0.5) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const per = 2.4 + 1.6 * hash(i, 41), ph = (t / per + hash(i, 42)) % 1, e = sp.pts[Math.floor(hash(i + Math.floor(t / per + hash(i, 42)) * 7, 43) * sp.pts.length) % sp.pts.length];
        const al = Math.sin(ph * Math.PI) * 0.9 * clamp(solid * 1.6 - 0.2, 0, 1);
        glow(ctx, e[0] + Math.sin(t * 1.3 + i * 2) * 9, e[1] - ph * (70 + 50 * hash(i, 44)), 2.5 + 2.4 * hash(i, 45), ph < 0.5 ? C.hot : C.ember, al);
      }
      glow(ctx, sp.bb.cx, sp.bb.y0 - 10, sp.bb.w * 0.42, mid, 0.05 * solid * (0.7 + 0.3 * Math.sin(t * 1.9 + seed)));
    }
    ctx.globalAlpha = ga0;
    ctx.restore();
    if (aq > 0 && aq < 1) {
      // embers lifting off the body and grey flakes drifting up, in the world's frame (the body lies on its side, so 'up' is not the sprite's)
      const sy = lSy, sx = lSx, ca = Math.cos(lAng), sa = Math.sin(lAng), at = (cx, cy) => { const px = (cx - sp.ox) * sx, py = (cy - sp.oy - fy2) * sy; return [rec.x + px * ca - py * sa, rec.y + fy2 + px * sa + py * ca]; };
      const step = lowFx() ? 3 : 1;
      for (const c of sp.cells) {
        if (c.n % step) continue;
        const u0 = clamp((aq - c.tc * 0.55) / 0.45, 0, 1.6); if (u0 <= 0.04) continue;
        const [bx, by] = at(c.cx, c.cy);
        for (let f = 0; f < 2; f++) {
          const sd = hash(c.n + f * 17, 51), uu = clamp((aq - c.tc * 0.55 - 0.03 * f) / 0.5, 0, 1.4); if (uu <= 0 || uu >= 1.4) continue;
          const al = Math.sin(clamp(uu / 1.4, 0, 1) * Math.PI), px = bx + Math.sin(t * 0.7 + c.n + f * 2) * (6 + 6 * sd) + (hash(f, c.n) - 0.5) * 14, py = by - uu * (36 + 60 * sd);
          if (f === 0) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, px, py, 3.2 + 2 * sd, uu < 0.5 ? C.emberHi : C.ember, 0.55 * al); ctx.globalCompositeOperation = 'source-over'; }
          else { ctx.save(); ctx.translate(px, py); ctx.rotate(t * (0.6 + sd) + f); ctx.fillStyle = rgba(sd < 0.5 ? C.ash : C.ashLt, 0.5 * al); const sz = 1.8 + 2.4 * sd; ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2); ctx.restore(); }
        }
      }
    }
  }

  function draw(ctx, rec, t) {
    if (!rec.sigR) { const rs = spriteOf(rec.who, rec.face, null, ''); rec.sigR = rs ? clamp(Math.max(rs.bb.w, rs.bb.h * 0.85) * 0.55 + 14, 58, 170) : 70; }
    const bp = clamp((t - rec.sigAt) / rec.burnDur, 0, 1);
    const lt = lieOf(rec), gone = lt ? lt.a1 : rec.crumbleAt + CRUMBLE, fa = t < gone ? 1 : 1 - clamp((t - gone) / SIGIL_FADE, 0, 1);
    sigil(ctx, rec, t, bp, fa);
    if (rec.fly > 0 && t >= rec.T0 && t < rec.land + 1) comet(ctx, rec, t);
    body(ctx, rec, t);
  }
  const lifeEnd = rec => { const lt = lieOf(rec); return lt ? lt.a1 + SIGIL_FADE + 0.3 : rec.crumbleAt + CRUMBLE + Math.max(SIGIL_FADE, LINGER) + 0.2; };
  const lowFx = () => { try { return !!((typeof Save !== 'undefined' && Save.setting && Save.setting('lowFx', false)) || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)); } catch (e) { return false; } };

  // ---------------------------------------------------------------- the room's events -> the live echoes
  function build(ev, extra) {
    const L = LOOK[ev.who]; if (!L) return null;
    const T0 = ev.start, fly = Math.max(0, +ev.fly || 0), rise = Math.max(0.3, +ev.rise || 3), dur = ev.dur == null ? -1 : +ev.dur, n = +String(ev.k || extra || '0').split(':').pop() || 0;
    const rec = { key: ev.k, n, who: ev.who, sig: ev.sig | 0, x: +ev.x || 0, y: +ev.y || 0, T0, fly, rise, dur, face: +ev.face || 0, kneel: !!ev.kneel && ev.who !== 'hollowking', land: T0 + fly, acts: [], endAt: null, lastAct: -1 };
    rec.sigAt = fly > 0 ? rec.land : T0; rec.burnDur = fly > 0 ? 1.7 : 0.6;
    rec.sigR = 0;
    rec.from = hooks.halo(rec.sig, T0); rec.boss = hooks.boss();
    // (a dur counts from the call, crumble included; -1 stays until told)
    rec.crumbleAt = Infinity; if (dur > 0) rec.crumbleAt = Math.max(T0 + dur - CRUMBLE, rec.land + rise);
    return rec;
  }
  function setEnd(rec, at) { if (rec.endAt == null) { rec.endAt = at; rec.crumbleAt = Math.max(rec.land + 0.2, Math.min(rec.crumbleAt, at)); } }
  // The kill (roomev svlie { order, step, hk, echo[], pos[[x, y, face]] }; its `start` is the client's own, the first lie is LIE_FIRST after it, the rest step apart, the Hollow King's hk after the eleventh).
  // An echo standing at a sigil (echo[k] > 0) is laid down by its own svechoact liedown; every other sigil's boss is raised here from its floor sigil just in time and laid down too.
  const LIE_FIRST = 1.8;
  function syncLie(L) {
    if (!Array.isArray(L.order) || !Array.isArray(L.pos)) return;
    const step = +L.step || 0.62, hk = L.hk == null ? 1.3 : +L.hk, n = L.order.length;
    for (let k = 0; k < n; k++) {
      const i = L.order[k], key = 'svlie:' + i; if (S.echoes.has(key) || (L.echo && L.echo[k] > 0) || !LOOK[WHO[i]]) continue;
      const p = L.pos[k] || [0, 0, 0], lieAt = L.start + LIE_FIRST + k * step + (k === n - 1 ? hk - step : 0), T0 = Math.max(L.start + 0.05, lieAt - 2.3), rise = Math.max(0.8, lieAt - T0 - 0.1);
      const rec = build({ who: WHO[i], k: key, sig: i, x: +p[0] || 0, y: +p[1] || 0, fly: 0, rise, dur: -1, face: +p[2] || 0, kneel: false, start: T0 });
      if (!rec) continue;
      rec.burnDur = 1.1; rec.lieFrom = L.start; rec.acts.push({ anim: 'liedown', start: lieAt, dur: 9999 }); S.echoes.set(key, rec);
    }
  }
  function sync(room, t) {
    const ev = room && room.ev; if (!ev) { S.echoes.clear(); return; }
    const LV = ev.svlie;
    for (const [key, rec] of S.echoes) if (key.startsWith('svlie:') ? !(LV && LV.start === rec.lieFrom) : (!(key in ev) || t < rec.T0 - 1)) S.echoes.delete(key);
    if (LV) syncLie(LV);
    for (const key in ev) {
      if (key.startsWith('svecho:')) {
        const e = ev[key]; let rec = S.echoes.get(key);
        if (e.who !== undefined) { if (!rec || rec.T0 !== e.start) { rec = build(e); if (rec) S.echoes.set(key, rec); } if (rec && e.ended) setEnd(rec, e.start); }
        else if (rec) setEnd(rec, e.start);   // (a second message with no body in it: crumble now; room events overwrite `end`, so the host's {end:1} is read by the missing `who`)
      } else if (key.startsWith('svechoact:')) {
        const a = ev[key], rec = S.echoes.get('svecho:' + key.slice(10)); if (!rec || a.start === rec.lastAct) continue;
        rec.lastAct = a.start; rec.acts.push({ anim: a.anim, start: a.start, dur: a.dur > 0 ? a.dur : 1.2 }); if (rec.acts.length > 8) rec.acts.shift();
      }
    }
  }
  // the hook: everything is under the telegraphs
  function floor(ctx, room, t) {
    if (t === S.frame) return; S.frame = t;
    sync(room, t);
    if (!S.echoes.size) return;
    for (const rec of S.echoes.values()) { if (t > lifeEnd(rec) && (rec.crumbleAt !== Infinity || lieOf(rec))) continue; if (t < rec.T0) continue; draw(ctx, rec, t); }
  }
  // ArenaView.drawZones is the first thing under the telegraphs, and it is the hook: wrap it, so no other file has to change
  // (arena-view.js can also call ULT_ECHO.floor itself; a second call in the same frame draws nothing)
  function hook() {
    if (typeof ArenaView === 'undefined' || ArenaView.__ultEcho) return;
    const dz = ArenaView.drawZones;
    ArenaView.drawZones = function (ctx, zones, t) {
      try { floor(ctx, this.liveRoom, t); } catch (err) { if (!S.warned) { S.warned = true; console.warn('ult-echo', err); } }
      return dz.apply(this, arguments);
    };
    ArenaView.__ultEcho = 1;
  }
  hook();

  // ---------------------------------------------------------------- the preview (tools/preview/ult-echo.html and the debug hook)
  // o: { x, y, boss: {x, y}, sig, fly, rise, dur, face, kneel, acts: [{ anim, at, dur }], scale, bg, cam: {x, y} }; t is seconds from the call
  function preview(cv, who, t, o = {}) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, sc = o.scale || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const bg = ctx.createRadialGradient(W / 2, H * 0.55, 20, W / 2, H * 0.55, Math.max(W, H) * 0.7); bg.addColorStop(0, o.bg || '#4a423a'); bg.addColorStop(1, '#2a2521');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(sc, 0, 0, sc, W / 2 - (o.cam ? o.cam.x : 0) * sc, H * 0.56 - (o.cam ? o.cam.y : 0) * sc);
    if (o.floor !== false) { ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 90, -400); ctx.lineTo(i * 90, 400); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-600, i * 70); ctx.lineTo(600, i * 70); ctx.stroke(); } }
    const key = who + JSON.stringify([o.x, o.y, o.fly, o.rise, o.dur, o.face, o.kneel, o.sig, o.acts, o.boss]);
    let rec = cv.__echo && cv.__echo.key === key ? cv.__echo.rec : null;
    if (!rec) {
      const boss = o.boss || { x: -250, y: -190 }, saved = hooks.boss;
      hooks.boss = () => boss;
      rec = build({ who, k: 'svecho:' + (o.n || 0), sig: o.sig ?? WHO.indexOf(who), x: o.x ?? 60, y: o.y ?? 60, fly: o.fly ?? 1.5, rise: o.rise ?? 2.4, dur: o.dur ?? 14, face: o.face ?? Math.atan2(boss.y - (o.y ?? 60), boss.x - (o.x ?? 60)), kneel: o.kneel ?? 1, start: 0 });
      hooks.boss = saved;
      if (rec) { rec.boss = boss; for (const a of o.acts || []) rec.acts.push({ anim: a.anim, start: a.at, dur: a.dur || 1.2 }); }
      cv.__echo = { key, rec };
    }
    if (!rec) return;
    // the Sovereign's place and halo, so the call has somewhere to come from
    const b = rec.boss; ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, b.x, b.y, 40, '#ff8a3a', 0.35);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 0.12 - Math.PI / 2; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * HALO_R, b.y + Math.sin(a) * HALO_R, i === rec.sig ? (t < rec.land ? 6 : 2) : 3, 0, TAU); ctx.fillStyle = i === rec.sig && t >= rec.land ? 'rgba(80,60,50,0.5)' : 'rgba(255,170,90,0.7)'; ctx.fill(); } ctx.restore();
    draw(ctx, rec, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return rec;
  }
  if (typeof window !== 'undefined') window.__echoPreview = preview;

  return { floor, draw, preview, hooks, hook, WHO, LOOK, sync, S, CRUMBLE, KNEEL, LIE, LIE_HOLD, LIE_ASH };
})();
