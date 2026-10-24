// Vhalgrath, the Ember Wyrm — how his moves look, from the two painted sheets (docs/art/vfx-reference/wyrm-1.png, wyrm-2.png):
// the floor marking of every move (the tells), what each one does when it lands (the impacts), what it leaves on the floor for a few
// seconds (the aftermath marks), the molten ground and the lava pools, and the gathering on his body while he casts.
// Loaded after arena-view.js; the other files reach it through WYRM_ART (boss-tells.js get() and track(), boss-vfx.js impact() and
// castStart(), arena-view.js moltenFloor() and emberPool()).
// The rules as everywhere: the red outline and the sweeping wash mark the exact area on every difficulty, and safe floor is never
// painted; what is drawn inside is the extra clue. Palette: ember orange and yellow-white fire, black basalt, ash grey. Red only for a
// ground ring (damage), blue only for a stack.

const WYRM_ART = (() => {
  const AR = () => ARENA.R;
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const easeIn = p => p * p;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const C = { red: '#ff3b2f', deep: '#c8301a', fire: '#ff7a1a', amber: '#ffb030', hot: '#ffd890', white: '#fff4d8', ink: '#1a0804', coal: '#2a1410', basalt: '#1c1210',
    ash: '#cfc3b4', ashD: '#7a6e64', blue: '#3d8bff', blueHi: '#bfe0ff' };
  const wash = (ctx, col, a) => { const R = AR(); ctx.fillStyle = rgba(col, a); ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4); };

  // a flame tongue standing on (x, y): h tall, w wide at the base, its tip swaying sideways by sway
  function tongue(c, x, y, h, w, sway, color) {
    c.fillStyle = color; c.beginPath(); c.moveTo(x - w, y);
    c.bezierCurveTo(x - w * 1.3, y - h * 0.3, x - w * 0.2 + sway * 0.35, y - h * 0.55, x + sway, y - h);
    c.bezierCurveTo(x + w * 0.35 + sway * 0.6, y - h * 0.55, x + w * 1.3, y - h * 0.3, x + w, y);
    c.quadraticCurveTo(x, y + w * 0.5, x - w, y); c.fill();
  }
  // the painted flame: ink edge, orange body, yellow middle, a white-hot heart
  const FIRE = ['#3a0e04', '#ff6a14', '#ffb428', '#fff4c8', '#ff7a1a'], BLUEFIRE = ['#06143a', '#3d8bff', '#8cc4ff', '#f0f8ff', '#3d8bff'];
  function flame(c, x, y, h, w, sway, k, pal = FIRE) {
    const ga = c.globalAlpha;
    glow(c, x, y - h * 0.4, w * 3, pal[4], k * 0.4 * ga);
    c.globalAlpha = ga * k * 0.9; tongue(c, x, y, h * 1.08, w * 1.3, sway, pal[0]);
    c.globalAlpha = ga * k;
    for (const sd of [-1, 1]) { tongue(c, x + sd * w * 0.85, y, h * 0.58, w * 0.62, -sway * 0.7 + sd * w * 0.5, pal[0]); tongue(c, x + sd * w * 0.85, y - 1, h * 0.52, w * 0.5, -sway * 0.7 + sd * w * 0.5, pal[1]); }
    tongue(c, x, y - 1, h, w, sway, pal[1]);
    tongue(c, x, y - 1, h * 0.64, w * 0.64, sway * 0.7, pal[2]);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * k * 0.85; tongue(c, x, y - 1, h * 0.32, w * 0.3, sway * 0.4, pal[3]);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = ga;
  }
  // a spread of points inside a shape, the same each frame for a seed
  function pts(s, n, seed) {
    const out = [], R = s.kind === 'rect' ? Math.min(s.len, AR() * 2) : (s.kind === 'donut' ? AR() : s.r || 100);
    const ca = s.kind === 'rect' ? Math.cos(s.angle) : 0, sa = s.kind === 'rect' ? Math.sin(s.angle) : 0;
    for (let i = 0; i < n * 6 && out.length < n; i++) {
      let x, y;
      if (s.kind === 'rect') { const u = hash(i, seed) * R, v = (hash(i, seed + 1) - 0.5) * s.w; x = s.x + ca * u - sa * v; y = s.y + sa * u + ca * v; }
      else if (s.kind === 'donut') { const a = hash(i, seed) * TAU, d = Math.sqrt(hash(i, seed + 1)) * R; x = Math.cos(a) * d; y = Math.sin(a) * d; if (ARENA.sd(x, y) > -10) continue; }
      else { x = s.x + (hash(i, seed) * 2 - 1) * R; y = s.y + (hash(i, seed + 1) * 2 - 1) * R; }
      if (SHAPES.contains(s, x, y, -6)) out.push({ x, y, i });
    }
    return out;
  }
  // glowing cracks running out of a point: ink beneath, heat on top, a thin hot line along the middle
  function cracks(ctx, x, y, r0, r1, n, seed, grow, col, a, lw, jit = 0.4) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const a0 = i * TAU / n + (hash(i, seed) - 0.5) * 0.5, L = r0 + (r1 - r0) * grow * (0.6 + 0.4 * hash(i, seed + 1));
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0);
      for (let j = 1; j <= 4; j++) { const aa = a0 + (hash(i * 7 + j, seed + 2) - 0.5) * jit, d = r0 + (L - r0) * j / 4; ctx.lineTo(x + Math.cos(aa) * d, y + Math.sin(aa) * d); }
      ctx.strokeStyle = rgba(C.ink, a * 0.85); ctx.lineWidth = lw * 2.4; ctx.stroke();
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.stroke();
      ctx.strokeStyle = rgba(C.white, a * 0.5); ctx.lineWidth = Math.max(0.8, lw * 0.35); ctx.stroke();
    }
    ctx.restore();
  }
  // a ring drawn as three strokes: a wide soft one, the body, a thin hot line (flat < 1 squashes it)
  function glowRing(ctx, x, y, r, col, a, w, flat = 1, hotCol = C.hot) {
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, flat);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.strokeStyle = rgba(col, a * 0.22); ctx.lineWidth = w * 3.2; ctx.stroke();
    ctx.strokeStyle = rgba(col, a * 0.85); ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = rgba(hotCol, a * 0.8); ctx.lineWidth = Math.max(1, w * 0.3); ctx.stroke();
    ctx.restore();
  }
  // a rock chunk (ink edge, a lit upper face)
  function rock(ctx, x, y, s, rot, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = k;
    poly(ctx, [-s, -s * 0.3, -s * 0.3, -s, s * 0.8, -s * 0.6, s, s * 0.4, 0, s, -s * 0.8, s * 0.6], '#2a1c18', C.ink, 1.4);
    poly(ctx, [-s * 0.7, -s * 0.3, -s * 0.3, -s * 0.8, s * 0.6, -s * 0.5, 0, -s * 0.1], rgba('#6a4a3a', 0.8));
    ctx.restore();
  }

  // ---------------------------------------------------------------- tells (boss-tells.js get() asks for one by tag)
  // a disc of heat on the floor, building: cracks opening, a hot core waking, embers lifting (Magma Burst, scorch marks, the whelps)
  function fireDisc(ctx, s, p, k, t, seed, o = {}) {
    const r = s.r;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, r * 0.05, s.x, s.y, r);
    g.addColorStop(0, rgba(o.core || C.amber, (0.18 + 0.4 * p) * k)); g.addColorStop(0.6, rgba(o.mid || C.fire, (0.08 + 0.2 * p) * k)); g.addColorStop(1, rgba(o.edge || C.red, (0.1 + 0.16 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    if (o.dark) circle(ctx, s.x, s.y, r * (0.25 + 0.55 * p), rgba(C.ink, (0.25 + 0.4 * p) * k));
    cracks(ctx, s.x, s.y, r * 0.12, r * 0.95, o.n || 9, seed, easeOut(p), C.amber, (0.35 + 0.55 * p) * k, 2);
    glow(ctx, s.x, s.y, r * (0.25 + 0.3 * p), C.hot, (0.1 + 0.4 * p * p) * k * (0.8 + 0.2 * Math.sin(t * (o.pulse || 10))));
    for (let i = 0; i < 10; i++) {
      const q = (t * 0.7 + hash(i, seed + 3)) % 1, a = hash(i, seed + 4) * TAU, d = Math.sqrt(hash(i, seed + 5)) * r * 0.85;
      circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 34, 1.6 + 2 * (1 - q), rgba(i % 2 ? C.hot : C.fire, 0.8 * (1 - q) * k * (0.3 + p)));
    }
    ctx.restore();
  }
  // a comet: the burning rock falling in at a slant toward (x, y), h up in the air (Roost, Cinder Rain)
  function comet(ctx, x, y, h, size, k) {
    const hx = x - h * 0.45, hy = y - h, tx = hx - 90 * size * 0.45, ty = hy - 90 * size;
    ctx.save(); ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(tx, ty, hx, hy);
    g.addColorStop(0, rgba(C.fire, 0)); g.addColorStop(0.6, rgba(C.fire, 0.55 * k)); g.addColorStop(1, rgba(C.amber, 0.95 * k));
    ctx.strokeStyle = g; ctx.lineWidth = 12 * size; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = rgba(C.white, 0.85 * k); ctx.lineWidth = 4 * size; ctx.beginPath(); ctx.moveTo((tx + hx * 2) / 3, (ty + hy * 2) / 3); ctx.lineTo(hx, hy); ctx.stroke();
    glow(ctx, hx, hy, 24 * size, C.fire, 0.9 * k);
    rock(ctx, hx, hy, 8 * size, hx * 0.1, k);
    circle(ctx, hx, hy, 4 * size, rgba(C.white, 0.9 * k));
    ctx.restore();
  }
  // streaks running along a line toward its far end (the dive's trail): comets of ember, hotter toward where he comes down
  function diveTrail(ctx, s, p, k, t, seed) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, hw = s.w / 2;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ctx.fillStyle = rgba(C.coal, (0.1 + 0.18 * p) * k); ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
    ctx.lineCap = 'round';
    // two ember lines down the sides of the path, hotter toward the landing
    for (const side of [-1, 1]) {
      const ox = -sa * hw * 0.5 * side, oy = ca * hw * 0.5 * side;
      const g = ctx.createLinearGradient(s.x, s.y, s.x + ca * L, s.y + sa * L);
      g.addColorStop(0, rgba(C.fire, 0.05 * k)); g.addColorStop(1, rgba(C.amber, (0.3 + 0.55 * p) * k));
      ctx.strokeStyle = g; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(s.x + ox, s.y + oy); ctx.lineTo(s.x + ox + ca * L, s.y + oy + sa * L); ctx.stroke();
      ctx.strokeStyle = rgba(C.white, (0.15 + 0.4 * p) * k); ctx.lineWidth = 2.2; ctx.stroke();
    }
    // streaks racing down it
    for (let i = 0; i < 9; i++) {
      const lane = ((i % 3) - 1) * hw * 0.55 + (hash(i, seed) - 0.5) * 18, u = (t * (0.35 + 0.35 * p) + hash(i, seed + 1)) % 1, d = u * L, tail = 30 + 70 * hash(i, seed + 2);
      const hx = s.x + ca * d - sa * lane, hy = s.y + sa * d + ca * lane, tx = hx - ca * tail, ty = hy - sa * tail;
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, rgba(C.fire, 0)); g.addColorStop(1, rgba(i % 2 ? C.amber : C.hot, (0.3 + 0.5 * p) * k));
      ctx.strokeStyle = g; ctx.lineWidth = 4 + 3 * hash(i, seed + 3); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      glow(ctx, hx, hy, 11 + 6 * p, C.hot, (0.3 + 0.4 * p) * k);
    }
    // sparks thrown off to either side
    for (let i = 0; i < 22; i++) {
      const u = (t * 0.5 + hash(i, seed + 4)) % 1, d = hash(i, seed + 5) * L, off = (hash(i, seed + 6) - 0.5) * s.w * 0.9, x = s.x + ca * d - sa * off, y = s.y + sa * d + ca * off;
      circle(ctx, x, y - u * 24, 1.6 + 1.6 * (1 - u), rgba(i % 2 ? C.hot : C.fire, 0.75 * (1 - u) * k * (0.3 + p)));
    }
    ctx.restore();
  }

  const TELLS = {
    // Tyrant's Roar: the floor round him darkens and four red rings come up round him, one after another
    roar: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        const b = env.boss || { x: 0, y: 0 };
        wash(ctx, '#2a0600', (0.08 + 0.24 * easeIn(p)) * k);
        for (let i = 0; i < 4; i++) {
          const on = clamp(p * 5 - i * 0.7, 0, 1); if (on <= 0) continue;
          glowRing(ctx, b.x, b.y, 110 + i * 100 + 8 * Math.sin(t * 5 - i), C.red, (0.35 + 0.55 * on) * k, 4);
        }
        cracks(ctx, b.x, b.y, 50, 120 + 300 * easeOut(p), 12, 3, easeOut(p), C.amber, (0.25 + 0.5 * p) * k, 2);
        for (let i = 0; i < 12; i++) { const q = (t * 0.6 + hash(i, 8)) % 1, a = hash(i, 9) * TAU, d = 90 + hash(i, 10) * 380; circle(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d - q * 36, 2 + 2 * (1 - q), rgba(C.hot, 0.7 * (1 - q) * k * (0.2 + p))); }
      },
    },
    // Take Flight / the Roost: his wings drive a gust round the crater: ash-grey spirals and grit blown across, a few embers in it
    gust: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        const b = env.boss || { x: 0, y: 0 }, R = AR();
        wash(ctx, '#140a06', (0.05 + 0.15 * p) * k);
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          for (let j = 0; j <= 18; j++) { const u = j / 18, a = i * TAU / 5 + u * 1.5 + t * 2.2, r = 50 + u * R * (0.45 + 0.5 * p); j ? ctx.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r) : ctx.moveTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); }
          ctx.strokeStyle = rgba(C.ashD, (0.18 + 0.2 * p) * k); ctx.lineWidth = 9; ctx.stroke();
          ctx.strokeStyle = rgba(C.ash, (0.25 + 0.35 * p) * k); ctx.lineWidth = 2.4; ctx.stroke();
        }
        ctx.restore();
        for (let i = 0; i < 26; i++) {
          const a = hash(i, 5) * TAU, u = (t * 0.9 + hash(i, 6)) % 1, d0 = R * (1.05 - u * 0.95), x = b.x + Math.cos(a) * d0, y = b.y + Math.sin(a) * d0;
          line(ctx, x, y, x + Math.cos(a + 0.5) * 30, y + Math.sin(a + 0.5) * 30, rgba(i % 5 ? C.ash : C.fire, 0.45 * k * Math.sin(u * Math.PI)), 2);
        }
      },
    },
    // Rending Claws: three claw lines scored toward the tank, red, drawing out as the cast runs
    buster: {
      color: '#ff6a5a',
      ground(ctx, tg, s, p, k, t, env) {
        const tgt = tg.target != null && env.entById ? env.entById(tg.target) : null;
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba(C.red, (0.06 + 0.1 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        ctx.lineCap = 'round';
        for (const j of [-1, 0, 1]) {
          const a = s.angle + j * 0.3, bend = j * 0.09, d0 = 70, d1 = d0 + (s.r - 110) * easeOut(Math.min(1, p * 1.8)), mid = (d0 + d1) / 2;
          const x0 = s.x + Math.cos(a) * d0, y0 = s.y + Math.sin(a) * d0, x1 = s.x + Math.cos(a + bend) * d1, y1 = s.y + Math.sin(a + bend) * d1;
          const cx = s.x + Math.cos(a + bend * 0.2) * mid, cy = s.y + Math.sin(a + bend * 0.2) * mid;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
          ctx.strokeStyle = rgba(C.red, 0.2 * k); ctx.lineWidth = 20; ctx.stroke();
          ctx.strokeStyle = rgba('#ff5a2a', (0.5 + 0.4 * p) * k); ctx.lineWidth = 6; ctx.stroke();
          ctx.strokeStyle = rgba('#ffe0b0', (0.2 + 0.6 * p) * k); ctx.lineWidth = 2; ctx.stroke();
          glow(ctx, x1, y1, 18 + 10 * p, C.amber, (0.3 + 0.4 * p) * k);
        }
        ctx.restore();
        if (tgt && p > 0.4) glow(ctx, tgt.x, tgt.y, 46, C.red, (p - 0.4) * 0.8 * k);
      },
    },
    // Tail Lash: the shadow of the swing behind him, three arcs of it sweeping across, bone-pale spikes on the outermost
    taillash: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba('#140806', (0.2 + 0.3 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const rr = s.r * (0.45 + i * 0.22), sweep = clamp(p * 1.6 - i * 0.15, 0, 1), a0 = s.angle - s.arc / 2 + 0.05, a1 = a0 + (s.arc - 0.1) * sweep;
          if (sweep <= 0) continue;
          ctx.beginPath(); ctx.arc(s.x, s.y, rr, a0, a1);
          ctx.strokeStyle = rgba(C.ashD, 0.35 * k); ctx.lineWidth = 12; ctx.stroke();
          ctx.strokeStyle = rgba('#e6dcc4', (0.3 + 0.4 * p) * k); ctx.lineWidth = 2.4; ctx.stroke();
        }
        for (let i = 0; i < 9; i++) { const a = s.angle - s.arc / 2 + ((i + 0.5) / 9) * s.arc, d = s.r * (0.35 + 0.6 * p); poly(ctx, [s.x + Math.cos(a - 0.04) * d, s.y + Math.sin(a - 0.04) * d, s.x + Math.cos(a) * (d + 26), s.y + Math.sin(a) * (d + 26), s.x + Math.cos(a + 0.04) * d, s.y + Math.sin(a + 0.04) * d], rgba('#e6dcc4', (0.35 + 0.4 * p) * k)); }
        ctx.restore();
      },
    },
    // Ember Breath: the cone filling red, tongues of fire streaming down it, a bloom of heat building at his mouth
    breath: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        const fr = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
        fr.addColorStop(0, rgba(C.amber, (0.16 + 0.34 * p) * k)); fr.addColorStop(0.5, rgba(C.red, (0.14 + 0.18 * p) * k)); fr.addColorStop(1, rgba(C.red, (0.08 + 0.14 * p) * k));
        ctx.fillStyle = fr; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        for (let i = 0; i < 16; i++) {
          const a = s.angle + (hash(i, tg.id) - 0.5) * s.arc * 0.85, u = (t * (0.4 + 0.5 * hash(i, 4)) + hash(i, tg.id + 1)) % 1, d = 70 + u * (s.r - 90), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
          const tx = x - Math.cos(a) * (50 + 40 * hash(i, 5)), ty = y - Math.sin(a) * (50 + 40 * hash(i, 5));
          const g = ctx.createLinearGradient(tx, ty, x, y); g.addColorStop(0, rgba(C.fire, 0)); g.addColorStop(1, rgba(i % 2 ? C.amber : C.hot, (0.25 + 0.45 * p) * k * Math.sin(u * Math.PI)));
          ctx.strokeStyle = g; ctx.lineWidth = 6 + 4 * hash(i, 6); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        }
        glow(ctx, s.x + Math.cos(s.angle) * 40, s.y + Math.sin(s.angle) * 40, 50 + 50 * p, C.hot, (0.25 + 0.5 * p) * k * (0.85 + 0.15 * Math.sin(t * 14)));
        ctx.restore();
      },
    },
    // Magma Burst (and Heart Flare's spread): a ring of heat under the hero, cracks opening in it
    spread: { ground(ctx, tg, s, p, k, t) { fireDisc(ctx, s, p, k, t, tg.id, { n: 9 }); } },
    // the whelps swelling to burst: the same heat, faster
    whelpboom: { ground(ctx, tg, s, p, k, t) { fireDisc(ctx, s, p, k, t, tg.id, { n: 11, pulse: 16, dark: true }); } },
    // the Heart Burn's scorch marks: a dark heart blooming in the stone, cracks running out of it
    scorch: { ground(ctx, tg, s, p, k, t) { fireDisc(ctx, s, p, k, t, tg.id, { n: 12, dark: true, pulse: 7 }); } },
    // Cinder Feast (and Heart Flare's stack): blue, the share ring, motes of blue fire drawing in toward the middle, a pale flame gathering
    stack: {
      ground(ctx, tg, s, p, k, t) {
        const r = s.r;
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        const g = ctx.createRadialGradient(s.x, s.y, r * 0.05, s.x, s.y, r);
        g.addColorStop(0, rgba(C.blueHi, (0.2 + 0.35 * p) * k)); g.addColorStop(0.55, rgba(C.blue, (0.12 + 0.18 * p) * k)); g.addColorStop(1, rgba(C.blue, (0.14 + 0.16 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
        // chevrons walking inward from the rim
        for (let i = 0; i < 6; i++) {
          const q = (t * 0.8 + i / 6) % 1, a = i * TAU / 6 + 0.3, d = r * (0.95 - 0.7 * q), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d, ia = a + Math.PI;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(ia - 2.4) * 11, y + Math.sin(ia - 2.4) * 11); ctx.lineTo(x, y); ctx.lineTo(x + Math.cos(ia + 2.4) * 11, y + Math.sin(ia + 2.4) * 11);
          ctx.strokeStyle = rgba(C.blueHi, (0.35 + 0.5 * p) * k * Math.sin(q * Math.PI)); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
        }
        // a pale blue flame at the heart of it
        for (let i = 0; i < 3; i++) flame(ctx, s.x + (i - 1) * 9, s.y + 6, (20 + 28 * p) * (1 - Math.abs(i - 1) * 0.25), 7 + 4 * p, Math.sin(t * 9 + i * 2) * 4, (0.4 + 0.5 * p) * k, BLUEFIRE);
        ctx.restore();
        glow(ctx, s.x, s.y, r * 0.5, C.blueHi, (0.15 + 0.35 * p) * k);
      },
    },
    // Dragonfall: streaks of ember running along the line he will fly (the line is faint at first, then hot)
    divepath: { ground(ctx, tg, s, p, k, t) { diveTrail(ctx, s, p, k, t, tg.id); } },
    divepath2: { ground(ctx, tg, s, p, k, t) { diveTrail(ctx, s, p, k, t, tg.id + 7); } },
    // where he comes down: the heat gathering in the pit, wind spiralling in, cracks opening; his shadow grows over it
    dragonfall: {
      ground(ctx, tg, s, p, k, t) {
        fireDisc(ctx, s, p, k, t, tg.id, { n: 14, dark: true, pulse: 8 });
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          for (let j = 0; j <= 12; j++) { const u = j / 12, a = i * TAU / 3 + u * 1.6 - t * 1.6, r = s.r * (1.0 - u * 0.75); j ? ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r) : ctx.moveTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); }
          ctx.strokeStyle = rgba(C.ash, (0.12 + 0.25 * p) * k); ctx.lineWidth = 3; ctx.stroke();
        }
        ctx.restore();
      },
      air(ctx, tg, s, p, k) {
        const q = easeIn(p), r = s.r * (0.2 + 0.75 * q);
        ellipse(ctx, s.x, s.y, r, r * 0.55, 0, rgba('#000000', 0.12 + 0.4 * q), null);
        // the span of his wings in the shadow
        poly(ctx, [s.x - r * 1.3, s.y - r * 0.1, s.x - r * 0.2, s.y - r * 0.38, s.x - r * 0.2, s.y + r * 0.1], rgba('#000000', (0.1 + 0.3 * q) * k));
        poly(ctx, [s.x + r * 1.3, s.y - r * 0.1, s.x + r * 0.2, s.y - r * 0.38, s.x + r * 0.2, s.y + r * 0.1], rgba('#000000', (0.1 + 0.3 * q) * k));
      },
    },
    // the Roost's burning scales: the ring on the stone, the scale itself coming down at a slant
    scales: {
      ground(ctx, tg, s, p, k, t) { fireDisc(ctx, s, p, k, t, tg.id, { n: 7, pulse: 9 }); },
      air(ctx, tg, s, p, k) { comet(ctx, s.x, s.y, (1 - easeIn(p)) * 300, 1, k); },
    },
    // Cinder Rain (Hard): smaller, many; each ember has its own streak
    cinder: {
      ground(ctx, tg, s, p, k, t) { fireDisc(ctx, s, p, k, t, tg.id, { n: 6, core: C.hot, mid: C.amber, edge: C.deep, pulse: 12 }); },
      air(ctx, tg, s, p, k) { comet(ctx, s.x, s.y, (1 - easeIn(p)) * 340, 0.75, k); },
    },
    // Wingbeat (Hard): pale gusts bending away from the line on both sides, white arrows pointing out, grit blown with them
    wingbeat: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
        ctx.beginPath(); ctx.rect(0, -s.w / 2, s.len, s.w); ctx.clip();
        ctx.fillStyle = rgba(C.ash, (0.05 + 0.1 * p) * k); ctx.fillRect(0, -s.w / 2, s.len, s.w);
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) for (const sd of [-1, 1]) {
          const u0 = s.len * (i + 0.5) / 8, sl = (t * 40 + i * 30) % 60, hw = s.w / 2;
          ctx.beginPath(); ctx.moveTo(u0 - 20 + sl * 0.3, sd * 24); ctx.quadraticCurveTo(u0 + 30, sd * hw * 0.55, u0 + 70 + sl * 0.3, sd * hw * 0.95);
          ctx.strokeStyle = rgba(C.ashD, (0.14 + 0.2 * p) * k); ctx.lineWidth = 16; ctx.stroke();
          ctx.strokeStyle = rgba(C.ash, (0.2 + 0.35 * p) * k); ctx.lineWidth = 3; ctx.stroke();
        }
        for (let i = 0; i < 14; i++) for (const sd of [-1, 1]) {
          const u = hash(i, tg.id) * s.len, q = (t * 0.7 + hash(i, tg.id + 1)) % 1, v = sd * (36 + q * (s.w / 2 - 56)), al = (0.2 + 0.7 * p) * k * Math.sin(q * Math.PI);
          ctx.beginPath(); ctx.moveTo(u - 9, v - sd * 11); ctx.lineTo(u, v); ctx.lineTo(u + 9, v - sd * 11);
          ctx.strokeStyle = rgba('#ffffff', al); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
        }
        for (let i = 0; i < 24; i++) { const u = hash(i, tg.id + 3) * s.len, q = (t * 0.9 + hash(i, tg.id + 4)) % 1, sd = i % 2 ? 1 : -1, v = sd * q * s.w * 0.5; circle(ctx, u + q * 40, v, 1.4 + 1.6 * hash(i, 9), rgba(C.ash, 0.55 * (1 - q) * k * (0.3 + p))); }
        ctx.restore();
      },
    },
    // the Crater Boils: the rim edge glowing, yellow arrows walking inward along the floor that will go, heat rising, bubbles breaking
    boil: {
      ground(ctx, tg, s, p, k, t) {
        const R = AR();
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        const g = ctx.createRadialGradient(0, 0, s.r2, 0, 0, R);
        g.addColorStop(0, rgba(C.fire, (0.06 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.deep, (0.16 + 0.3 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
        ctx.restore();
        ctx.save(); ARENA.trace(ctx, 4); ctx.clip();
        // the edge of what will go, burning
        glowRing(ctx, 0, 0, s.r2, C.amber, (0.35 + 0.55 * p) * k, 3.5);
        for (let i = 0; i < 36; i++) { const a = i * TAU / 36 + hash(i, 2) * 0.1, q = (t * 0.6 + hash(i, 3)) % 1; glow(ctx, Math.cos(a) * (s.r2 + 4), Math.sin(a) * (s.r2 + 4) - q * 18, 8 + 6 * p, C.hot, (0.3 + 0.4 * p) * k * (1 - q)); }
        // arrows pointing in, sliding toward the edge
        for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12 + 0.12, q = (t * 0.5 + hash(i, 4)) % 1, d = s.r2 + 20 + 90 * (1 - q), x = Math.cos(a) * d, y = Math.sin(a) * d, ia = a + Math.PI;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(ia - 2.5) * 16, y + Math.sin(ia - 2.5) * 16); ctx.lineTo(x, y); ctx.lineTo(x + Math.cos(ia + 2.5) * 16, y + Math.sin(ia + 2.5) * 16);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.strokeStyle = rgba(C.ink, 0.5 * k); ctx.lineWidth = 8; ctx.stroke();
          ctx.strokeStyle = rgba(C.hot, (0.35 + 0.55 * p) * k * Math.sin(q * Math.PI)); ctx.lineWidth = 4; ctx.stroke();
        }
        for (let i = 0; i < 30; i++) { const a = hash(i, 11) * TAU, d = s.r2 + hash(i, 12) * (R - s.r2), q = (t * 0.5 + hash(i, 13)) % 1; circle(ctx, Math.cos(a) * d, Math.sin(a) * d - q * 14, 3 + q * 5, null, rgba(C.hot, 0.7 * (1 - q) * k * (0.3 + p)), 1.8); }
        ctx.restore();
      },
    },
    // the Heart Burn's fire: the floor from wall to wall except the island, flames standing up out of it
    heartburn: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); ARENA.trace(ctx, 4); ctx.clip(); SHAPES.trace(ctx, s); ctx.clip();
        const g = ctx.createRadialGradient(s.x, s.y, s.r2, s.x, s.y, s.r2 + 700);
        g.addColorStop(0, rgba(C.amber, (0.1 + 0.26 * p) * k)); g.addColorStop(1, rgba(C.red, (0.1 + 0.28 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
        for (const q of pts(s, 34, tg.id)) {
          const u = (t * 0.7 + hash(q.i, 23)) % 1, h = (24 + 30 * p) * (0.6 + 0.6 * hash(q.i, 24)) * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.8 + 0.3);
          flame(ctx, q.x, q.y, h, 8 + 6 * p, Math.sin(t * 8 + q.i) * 5, (0.25 + 0.45 * p) * k * (1 - u * 0.6));
        }
        ctx.restore();
      },
    },
  };
  const tell = (tag, type) => (type === 'buster' ? TELLS.buster : TELLS[tag]) || null;

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // flames standing up and dying: list of { x, y, h, w, at, life, lean, ph }
  function flames(list, layer = 'air') {
    if (!list.length) return;
    const dur = Math.max(...list.map(f => f.at + f.life)) + 0.05;
    list.sort((a, b) => a.y - b.y);
    VFX.fx({ dur, layer, draw: (c, p, t, e) => {
      c.save();
      for (const f of list) {
        const q = (t - f.at) / f.life; if (q <= 0 || q >= 1) continue;
        const k = e.a * Math.min(1, q / 0.12) * Math.min(1, (1 - q) / 0.4), hh = f.h * (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, q * 1.25))) * (0.9 + 0.1 * Math.sin(t * 16 + f.ph)), sw = (f.lean + Math.sin(t * 9 + f.ph) * 0.3) * hh * 0.4;
        flame(c, f.x, f.y, hh, f.w, sw, k);
      }
      c.restore();
    } });
  }
  // n flames standing inside a circle
  function cluster(x, y, r, n, o = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * r;
      out.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, h: (o.h ?? 120) * rnd(0.55, 1.1), w: (o.w ?? 18) * rnd(0.8, 1.2), at: (o.at ?? 0) + rnd(0, o.spread ?? 0.15), life: (o.life ?? 0.8) * rnd(0.8, 1.1), lean: rnd(-0.35, 0.35), ph: rnd(0, 6) });
    }
    flames(out);
  }
  // a black basalt spire thrown up out of the stone, lit along its edges, standing a while (the Roost's scales)
  function spire(x, y, h, w, dur = 1.8) {
    const pts2 = [[-w, 0], [-w * 0.55, -h * 0.5], [-w * 0.25, -h * 0.62], [w * 0.05, -h], [w * 0.3, -h * 0.6], [w * 0.6, -h * 0.45], [w, 0]];
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const rise = easeOut(Math.min(1, p / 0.12)), k = e.a * Math.min(1, (1 - p) / 0.3), hh = rise;
      c.save(); c.translate(x, y); c.globalAlpha = k;
      glow(c, 0, -h * 0.2, w * 3, C.fire, 0.4 * (1 - p));
      c.beginPath(); pts2.forEach(([px, py], i) => (i ? c.lineTo(px, py * hh) : c.moveTo(px, py * hh))); c.closePath();
      c.fillStyle = '#1a100d'; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.moveTo(-w * 0.55, -h * 0.5 * hh); c.lineTo(w * 0.05, -h * hh); c.lineTo(w * 0.3, -h * 0.6 * hh); c.lineTo(0, -h * 0.4 * hh); c.closePath(); c.fillStyle = 'rgba(110,80,66,0.55)'; c.fill();
      c.strokeStyle = rgba(C.amber, 0.7 * (1 - p * 0.6)); c.lineWidth = 2; c.beginPath(); c.moveTo(-w * 0.8, -4); c.lineTo(-w * 0.4, -h * 0.4 * hh); c.lineTo(w * 0.05, -h * 0.9 * hh); c.moveTo(w * 0.7, -4); c.lineTo(w * 0.35, -h * 0.3 * hh); c.stroke();
      c.restore(); c.globalAlpha = 1;
      for (const sd of [-1, 1]) flame(c, x + sd * w * 0.9, y, 30 * (1 - p), 8, sd * 3, k);
    } });
  }
  // lava flooding in across a ring of floor, its leading edge white-hot (the Crater Boils, the Heart Burn)
  function flood(cx, cy, rFar, rNear, dur, o = {}) {
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.55)), edge = rFar - (rFar - rNear) * q, k = e.a * Math.min(1, (1 - p) / 0.4);
      c.save(); ARENA.trace(c, 2); c.clip();
      c.beginPath(); c.arc(cx, cy, rFar + 40, 0, TAU); c.arc(cx, cy, edge, 0, TAU, true);
      c.fillStyle = rgba(C.fire, 0.5 * k); c.fill('evenodd');
      c.globalCompositeOperation = 'lighter';
      c.beginPath(); c.arc(cx, cy, edge, 0, TAU); c.strokeStyle = rgba(C.hot, 0.85 * k); c.lineWidth = 16 * (1 - p * 0.5); c.stroke();
      c.strokeStyle = rgba(C.white, 0.9 * k); c.lineWidth = 5; c.stroke();
      c.restore();
    } });
    // flames racing along the front
    const n = o.n ?? 26, list = [];
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + rnd(-0.08, 0.08), at = 0.55 * dur * 0.5 * rnd(0.6, 1), r = rFar - (rFar - rNear) * 0.5;
      list.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, h: (o.h ?? 130) * rnd(0.6, 1.1), w: 20, at, life: dur * 0.6, lean: rnd(-0.3, 0.3), ph: rnd(0, 6) });
    }
    flames(list);
  }
  // flames standing along a line, now and then (a gash with fire in it, the dive's line)
  function lineFlames(x0, y0, x1, y1, step, o = {}) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step)), list = [];
    for (let i = 0; i <= n; i++) { const q = i / n, jit = rnd(-0.3, 0.3) * step; list.push({ x: x0 + (x1 - x0) * q + jit * 0.3, y: y0 + (y1 - y0) * q + jit * 0.2, h: (o.h ?? 60) * rnd(0.6, 1.1), w: (o.w ?? 12) * rnd(0.8, 1.2), at: (o.travel ?? 0.2) * q + rnd(0, 0.1), life: (o.life ?? 0.8) * rnd(0.8, 1.1), lean: rnd(-0.4, 0.4), ph: rnd(0, 6) }); }
    flames(list);
  }
  // the breath: a river of fire out of his mouth, billowing edge, white-hot at the root, going dark red at the far end
  function fireStream(x, y, ang, len, span, dur) {
    const half = span / 2, W = Math.tan(half);
    let grad = null;
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const grow = easeOut(Math.min(1, p / 0.22)), k = e.a * Math.min(1, (1 - p) / 0.35), L = len * grow;
      c.save(); c.translate(x, y - 16); c.rotate(ang);
      const shape = (sc, pad) => {
        const N = 22;
        c.beginPath();
        for (let side = 1; side >= -1; side -= 2) {
          for (let i = side > 0 ? 0 : N; side > 0 ? i <= N : i >= 0; i += side) {
            const u = i / N, bil = 1 + 0.1 * Math.sin(u * 18 + t * 12 + side) + 0.06 * Math.sin(u * 31 - t * 17), w = (W * u * L * sc + 12 * sc) * bil + pad;
            c.lineTo(u * L, side * w);
          }
        }
        c.closePath(); c.fill();
      };
      c.globalAlpha = k * 0.75; c.fillStyle = '#3a0e04'; shape(1, 7);
      if (!grad) { grad = c.createLinearGradient(0, 0, Math.max(1, len), 0); grad.addColorStop(0, '#fff6c8'); grad.addColorStop(0.22, '#ffc040'); grad.addColorStop(0.6, '#ff7a1a'); grad.addColorStop(1, '#b02a14'); }
      c.globalAlpha = k * 0.95; c.fillStyle = grad; shape(1, 0);
      c.globalAlpha = k * 0.9; c.fillStyle = '#ffc850'; shape(0.6, 0);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.8; c.fillStyle = '#fff4d0'; shape(0.28, 0);
      c.restore();
      glow(c, x + Math.cos(ang) * 20, y - 16 + Math.sin(ang) * 20, 46, '#ffd890', k * 0.9);
    }, tick: () => {
      if (Math.random() < 0.7) { const u = rnd(0.15, 1), w = u * len * W * rnd(-0.9, 0.9), px = x + Math.cos(ang) * u * len - Math.sin(ang) * w, py = y + Math.sin(ang) * u * len + Math.cos(ang) * w;
        VFX.spawn({ x: px, y: py, z: 16, vx: Math.cos(ang) * 70, vy: Math.sin(ang) * 70, vz: rnd(20, 80), life: rnd(0.4, 0.8), size: rnd(6, 12), size1: 0, color: Math.random() < 0.5 ? '#ff7a1a' : '#ffc040' }); }
    } });
  }
  const pillarAt = (x, y, o) => VFX.pillar(x, y, o);

  // the impact of each of his moves; returns true when it handled the tag
  function impact(tg, ctx, H) {
    const s = tg.live, b = (ctx && ctx.bossDraw) || { x: 0, y: 0, f: 0 };
    const tag = tg.tag;
    if (tg.type === 'buster') {
      // Rending Claws: three gashes torn along the cone, fire standing in them, rock thrown up
      const e = tg.target != null && ctx.entById ? ctx.entById(tg.target) : null, x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
      H.shapeFlash(s, '#ff4a3a', { a: 0.26 });
      for (const j of [-1, 0, 1]) {
        const a = s.angle + j * 0.3, d0 = 80, d1 = Math.min(s.r, 340), x0 = s.x + Math.cos(a) * d0, y0 = s.y + Math.sin(a) * d0, x1 = s.x + Math.cos(a) * d1, y1 = s.y + Math.sin(a) * d1;
        lineFlames(x0, y0, x1, y1, 70, { h: 58, w: 11, travel: 0.2, life: 0.9 });
        H.after(0.15, () => H.AFT.gouge(x0, y0, x1, y1, { w: 28, dur: 8, heat: '#ff5a14', lip: '#14100e', ember: '#ffb040', heatT: 4 }));
        VFX.sparks(x1, y1, { color: C.hot, n: 6, speed: 300, angle: a, spread: 0.6 });
      }
      VFX.hit(x, y, '#ff5a3a', 2.1);
      H.shockAt(x, y, { r: 100, color: '#ff8a3a', w: 6, dur: 0.4, flat: 1 });
      VFX.debris(x, y, { color: '#2a1c18', n: 10, speed: 1.2, hot: true, up: 1.1 });
      H.shake(9);
      return true;
    }
    switch (tag) {
      case 'roar': {
        // the roar goes out of him: a ring of fire standing up round him, rocks thrown, the crater flaring
        H.roomTint('#ff8a3a', 0.24, 0.8);
        H.shockAt(b.x, b.y, { r: 360, color: C.fire, w: 14, dur: 0.7, flat: 1 });
        H.shockAt(b.x, b.y, { r: 330, color: C.hot, w: 6, dur: 0.6, flat: 1, delay: 0.04 });
        H.shockAt(b.x, b.y, { r: 520, color: C.red, w: 7, dur: 0.9, flat: 1, delay: 0.12 });
        const n = 18, list = [];
        for (let i = 0; i < n; i++) { const a = i * TAU / n + rnd(-0.1, 0.1), r = 300 + rnd(-24, 24); list.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r * 0.9, h: rnd(110, 190), w: rnd(16, 24), at: rnd(0, 0.18), life: 0.9, lean: Math.cos(a) * 0.5, ph: rnd(0, 6) }); }
        flames(list);
        for (let i = 0; i < 9; i++) { const a = rnd(0, TAU), r = rnd(250, 420); VFX.debris(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, { color: '#2a1c18', n: 2, speed: 1.1, hot: true }); }
        VFX.sparks(b.x, b.y, { color: C.hot, n: 16, speed: 420 });
        H.shake(11);
        return true;
      }
      case 'gust': {
        // the wings drive the air out across the crater: a ring of grit, ash streaming off him
        H.roomTint('#7a6e64', 0.1, 0.6);
        H.shockAt(b.x, b.y, { r: 520, color: C.ashD, w: 9, dur: 0.7, flat: 1 });
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + rnd(-0.15, 0.15); VFX.smoke(b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80, { n: 1, color: '#8a7e74', size: 38, a: 0.55, speed: 240 }); }
        VFX.debris(b.x, b.y, { color: '#4a3a34', n: 8, speed: 1.6 });
        H.shake(6);
        return true;
      }
      case 'taillash': {
        H.shapeFlash(s, '#e8c8a0', { a: 0.26, dur: 0.45 });
        for (let i = 0; i < 9; i++) { const a = s.angle - s.arc / 2 + (i + 0.5) / 9 * s.arc, d = rnd(0.5, 0.95) * s.r; VFX.smoke(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, { n: 1, color: '#6a5648', size: 32, a: 0.55, speed: 140 }); }
        for (const q of H.scatter(s, 5)) VFX.debris(q.x, q.y, { color: '#2a1c18', n: 2, speed: 1 });
        H.shake(9);
        return true;
      }
      case 'breath': {
        // the breath goes: a river of fire out of his mouth down the whole cone, rock thrown up along it
        const L = Math.min(s.r, 760);
        fireStream(s.x + Math.cos(s.angle) * 30, s.y + Math.sin(s.angle) * 30, s.angle, L, s.arc, 1.1);
        H.shapeFlash(s, '#ff7a1a', { a: 0.26, dur: 0.6 });
        for (const q of H.scatter(s, 9)) H.after(rnd(0.15, 0.6), () => VFX.debris(q.x, q.y, { color: '#2a1c18', n: 2, speed: 1.1, hot: true }));
        VFX.smoke(s.x + Math.cos(s.angle) * L * 0.8, s.y + Math.sin(s.angle) * L * 0.8, { n: 4, color: '#4a3a38', size: 34, a: 0.4, speed: 60, r: 120 });
        H.shake(7);
        return true;
      }
      case 'spread': {
        // a geyser of fire up out of the floor under each hero, cracked rock flung out of it
        cluster(s.x, s.y, s.r * 0.5, 6, { h: 190, w: 15, life: 0.9, spread: 0.12 });
        VFX.pillar(s.x, s.y, { r: s.r * 0.35, h: 230, color: '#ffb030', dur: 0.6 });
        VFX.flash(s.x, s.y - 20, s.r * 1.2, C.white, 0.25);
        H.shockAt(s.x, s.y, { r: s.r * 1.25, color: C.fire, w: 7, dur: 0.5, flat: 1 });
        VFX.debris(s.x, s.y, { color: '#2a1c18', n: 7, speed: 1.2, hot: true, up: 1.2 });
        H.shake(5);
        return true;
      }
      case 'stack': {
        // the Feast: one great eruption where they stand together, white-hot at the heart, black rock thrown out of it
        H.shapeFlash(s, '#ff8a2a', { a: 0.3, dur: 0.6 });
        cluster(s.x, s.y, s.r * 0.8, 14, { h: 260, w: 24, life: 1.0, spread: 0.18 });
        VFX.spikeburst(s.x, s.y, { r: s.r * 1.5, n: 16, color: '#ff8a2a', core: '#fff4d8', ink: '#3a1408', dur: 0.45 });
        VFX.pillar(s.x, s.y, { r: s.r * 0.6, h: 420, color: '#ffd890', dur: 0.7 });
        H.shockAt(s.x, s.y, { r: s.r * 1.8, color: C.hot, w: 9, dur: 0.6, flat: 1 });
        H.shockAt(s.x, s.y, { r: s.r * 1.1, color: '#ffffff', w: 4, dur: 0.4, flat: 1, delay: 0.05 });
        VFX.debris(s.x, s.y, { color: '#1c1210', n: 14, speed: 1.5, hot: true, up: 1.5, size: 1.4 });
        H.roomTint('#ff8a3a', 0.12, 0.6);
        H.shake(13);
        return true;
      }
      case 'divepath': case 'divepath2': {
        // the dive's line: fire racing down it, the stone scorched along it
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        H.shapeFlash(s, '#ffb04a', { a: 0.26, dur: 0.5 });
        lineFlames(s.x, s.y, s.x + ca * s.len, s.y + sa * s.len, 95, { h: 62, w: 13, travel: 0.35, life: 0.9 });
        H.AFT.scorch(s.x, s.y, s.x + ca * s.len, s.y + sa * s.len, { w: 70, dur: 6, ember: '#ffb040', smokeRate: 0.06 });
        for (const q of H.scatter(s, 8)) VFX.sparks(q.x, q.y, { color: C.hot, n: 3, speed: 280 });
        H.shake(6);
        return true;
      }
      case 'dragonfall': {
        // he comes down: a column of fire, a white-hot heart, the floor bursting out of the pit in black rock, a crater left
        H.shockAt(s.x, s.y, { r: s.r * 1.3, color: '#ffb04a', w: 11, dur: 0.65, flat: 1 });
        H.shockAt(s.x, s.y, { r: s.r * 0.8, color: '#fff0c0', w: 5, dur: 0.4, flat: 1, delay: 0.05 });
        H.shapeFlash(s, '#ff7a22', { a: 0.34, dur: 0.6 });
        VFX.spikeburst(s.x, s.y, { r: s.r * 1.1, n: 18, color: '#ff8a2a', core: '#fff4d8', ink: '#3a1408', dur: 0.5 });
        VFX.pillar(s.x, s.y, { r: s.r * 0.45, h: 520, color: '#ffd890', dur: 0.8 });
        cluster(s.x, s.y, s.r * 0.75, 18, { h: 300, w: 28, life: 1.1, spread: 0.2 });
        VFX.debris(s.x, s.y, { color: '#1c1210', n: 22, speed: 1.9, hot: true, up: 1.7, size: 1.5 });
        for (const q of H.scatter(s, 10)) H.after(rnd(0, 0.3), () => VFX.smoke(q.x, q.y, { n: 1, color: '#3a2a26', size: 36, a: 0.55, speed: 90 }));
        H.AFT.crater(s.x, s.y, { r: s.r * 0.8, dur: 8 });
        H.AFT.decal(s.x, s.y, { style: 'crack', r: s.r * 0.8, dur: 8, a: 0.6, seed: s.x * 0.01 + s.y * 0.013 });
        H.roomTint('#ff8a3a', 0.16, 0.6);
        H.shake(15);
        return true;
      }
      case 'scorch': {
        cluster(s.x, s.y, s.r * 0.7, 8, { h: 170, w: 17, life: 0.9 });
        H.shockAt(s.x, s.y, { r: s.r * 1.25, color: '#ffb04a', w: 7, dur: 0.45, flat: 1 });
        H.shapeFlash(s, '#ff7a22', { a: 0.36, dur: 0.5 });
        VFX.sparks(s.x, s.y, { color: C.hot, n: 10, speed: 300 });
        H.shake(6);
        return true;
      }
      case 'scales': {
        // a burning scale lands and a spire of black basalt jumps up where it hit
        spire(s.x, s.y, 130, 22);
        cluster(s.x, s.y, s.r * 0.5, 4, { h: 80, w: 12, life: 0.7 });
        H.shockAt(s.x, s.y, { r: s.r * 1.2, color: C.fire, w: 6, dur: 0.45, flat: 1 });
        VFX.debris(s.x, s.y, { color: '#1c1210', n: 8, speed: 1.2, hot: true });
        H.shake(5);
        return true;
      }
      case 'cinder': {
        cluster(s.x, s.y, s.r * 0.55, 5, { h: 150, w: 14, life: 0.8 });
        VFX.flash(s.x, s.y - 14, s.r * 1.2, C.white, 0.22);
        H.shockAt(s.x, s.y, { r: s.r * 1.3, color: C.amber, w: 5, dur: 0.4, flat: 1 });
        VFX.debris(s.x, s.y, { color: '#1c1210', n: 6, speed: 1.1, hot: true });
        H.shake(4);
        return true;
      }
      case 'whelpboom': {
        H.shapeFlash(s, '#ff7a22', { a: 0.36, dur: 0.5 });
        cluster(s.x, s.y, s.r * 0.6, 8, { h: 190, w: 20, life: 0.9 });
        VFX.spikeburst(s.x, s.y, { r: s.r * 0.9, n: 14, color: '#ff8a2a', core: '#fff4d8', ink: '#3a1408', dur: 0.42 });
        H.shockAt(s.x, s.y, { r: s.r * 1.2, color: C.hot, w: 7, dur: 0.5, flat: 1 });
        VFX.debris(s.x, s.y, { color: '#1c1210', n: 8, speed: 1.3, hot: true });
        H.shake(7);
        return true;
      }
      case 'wingbeat': {
        // the wings' wall of air: ash, grit and small rock thrown out to both sides of the line
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        H.shapeFlash(s, '#cfc3b4', { a: 0.22, dur: 0.5, rimOnly: true });
        for (let i = 0; i < 14; i++) {
          const d = rnd(0.05, 0.95) * s.len, sd = i % 2 ? 1 : -1, x = s.x + ca * d, y = s.y + sa * d;
          VFX.smoke(x, y, { n: 1, color: '#a89c90', size: 40, a: 0.55, speed: 10 });
          VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => { const q = easeOut(p), v = sd * q * 220, k = e.a * (1 - p); c.save(); c.lineCap = 'round'; c.strokeStyle = rgba(C.ash, 0.6 * k); c.lineWidth = 4; c.beginPath(); c.moveTo(x - sa * (v - sd * 40), y + ca * (v - sd * 40)); c.lineTo(x - sa * v, y + ca * v); c.stroke(); c.strokeStyle = rgba('#ffffff', 0.7 * k); c.lineWidth = 1.4; c.stroke(); c.restore(); } });
        }
        for (const q of H.scatter(s, 8)) VFX.debris(q.x, q.y, { color: '#3a2c26', n: 3, speed: 1.4 });
        H.shake(8);
        return true;
      }
      case 'boil': {
        // the rim floods: lava surging in from the wall, flames along its front
        flood(0, 0, AR(), s.r2 || 465, 1.2);
        H.roomTint('#ff5a1a', 0.2, 0.9);
        H.shockAt(0, 0, { r: AR(), r0: s.r2 || 465, color: C.amber, w: 9, dur: 0.8, flat: 1 });
        H.shake(12);
        return true;
      }
      case 'heartburn': {
        // everything but the island goes up at once
        flood(s.x, s.y, AR() + Math.hypot(s.x, s.y), s.r2, 1.3, { n: 34, h: 170 });
        H.roomTint('#ff5a1a', 0.32, 1.0);
        H.shockAt(s.x, s.y, { r: 900, r0: s.r2, color: C.hot, w: 10, dur: 0.8, flat: 1 });
        H.shake(16);
        return true;
      }
      default: return false;
    }
  }

  // ---------------------------------------------------------------- aftermath: the marks a landed move leaves (boss-tells.js track() asks)
  let afterSet = null;
  function aftermath(mark, AFTER) {
    if (afterSet) return afterSet;
    const T = AFTER.tier;
    // scorched stone under a circle: a dark blot, its ring charred, cracks still glowing while they cool
    const charred = (tier, rad, n = 10, heat = 3.5) => tg => mark(tier, tg.live, (ctx, s, k, age, seed) => {
      const r = (rad || s.r), hk = Math.max(0, 1 - age / heat);
      glow(ctx, s.x, s.y, r * 1.1, C.ink, k * 0.8);
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.95, 0, TAU); ctx.strokeStyle = rgba(C.ink, k * 0.7); ctx.lineWidth = 12; ctx.stroke();
      cracks(ctx, s.x, s.y, r * 0.15, r * 1.05, n, seed, 1, C.fire, k * hk, 2);
    }, tg.id);
    afterSet = {
      // Tyrant's Roar: the floor cracked in rings round where he stood, the cracks glowing as they cool
      roar(tg, env) {
        const b = env.boss || { x: 0, y: 0 };
        mark(T.long, { kind: 'circle', x: b.x, y: b.y, r: 0 }, (ctx, s, k, age, seed) => {
          const hk = Math.max(0, 1 - age / 6);
          ctx.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            const r = 110 + i * 100, n = 9 + i * 3;
            for (let j = 0; j < n; j++) {
              const a0 = j * TAU / n + hash(j, i + seed) * 0.2, a1 = a0 + TAU / n * 0.62;
              ctx.beginPath(); ctx.arc(s.x, s.y, r + (hash(j, i) - 0.5) * 16, a0, a1);
              ctx.strokeStyle = rgba(C.ink, k * 0.85); ctx.lineWidth = 6; ctx.stroke();
              ctx.strokeStyle = rgba(C.fire, k * hk); ctx.lineWidth = 2; ctx.stroke();
              ctx.strokeStyle = rgba(C.hot, k * hk * 0.6); ctx.lineWidth = 0.8; ctx.stroke();
            }
          }
          cracks(ctx, s.x, s.y, 100, 440, 16, seed, 1, C.fire, k * hk * 0.8, 1.8, 0.6);
        }, tg.id);
      },
      // Rending Claws: three black gashes with a lit edge
      buster(tg) {
        mark(T.short, tg.live, (ctx, s, k, age, seed) => {
          const hk = Math.max(0, 1 - age / 3);
          ctx.lineCap = 'round';
          for (const j of [-1, 0, 1]) {
            const a = s.angle + j * 0.3, d0 = 80, d1 = Math.min(s.r, 340);
            ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0); ctx.lineTo(s.x + Math.cos(a) * d1, s.y + Math.sin(a) * d1);
            ctx.strokeStyle = rgba(C.ink, k * 0.9); ctx.lineWidth = 16; ctx.stroke();
            ctx.strokeStyle = rgba(C.fire, k * hk * 0.9); ctx.lineWidth = 3.5; ctx.stroke();
          }
        }, tg.id);
      },
      // Ember Breath / Twin Breath: a dark scorched swath where it went (the molten floor itself is its own zone)
      breath(tg) {
        mark(T.short, tg.live, (ctx, s, k, age, seed) => {
          ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
          ctx.fillStyle = rgba(C.ink, k * 0.45); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
          for (let i = 0; i < 16; i++) { const a = s.angle + (hash(i, seed) - 0.5) * s.arc * 0.85, d = 120 + hash(i, seed + 1) * (s.r - 160); rock(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 5 + 4 * hash(i, seed + 2), i, k); }
          ctx.restore();
        }, tg.id);
      },
      taillash(tg) {
        mark(T.brief, tg.live, (ctx, s, k, age, seed) => {
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.5 + i * 0.22), s.angle - s.arc / 2 + 0.1, s.angle + s.arc / 2 - 0.1); ctx.strokeStyle = rgba(C.ashD, k * 0.6); ctx.lineWidth = 8; ctx.stroke(); }
        }, tg.id);
      },
      // Magma Burst: a charred ring round where it went off (the pool is the puddle drawn over it)
      spread: charred(T.short, 0, 8),
      stack: charred(T.short, 0, 12, 4),
      scorch: charred(T.short, 0, 12, 4),
      whelpboom: charred(T.short, 0, 10),
      cinder: charred(T.brief, 0, 7, 2),
      // the dive's line: scorched along it, a few seams still glowing
      divepath: tg => mark(T.short, tg.live, (ctx, s, k, age, seed) => scorchLine(ctx, s, k, age, seed), tg.id),
      divepath2: tg => mark(T.short, tg.live, (ctx, s, k, age, seed) => scorchLine(ctx, s, k, age, seed), tg.id),
      // the crater he left: a lip of black rock round a glowing pit, smoke on it
      dragonfall(tg) {
        mark(T.long, tg.live, (ctx, s, k, age, seed) => {
          const hk = Math.max(0, 1 - age / 7), r = s.r * 0.85;
          glow(ctx, s.x, s.y, r * 1.1, C.ink, k * 0.9);
          glowRing(ctx, s.x, s.y, r * 0.9, C.fire, k * (0.4 + 0.5 * hk), 4, 0.95);
          cracks(ctx, s.x, s.y, r * 0.15, r * 0.9, 14, seed, 1, C.fire, k * hk, 2);
          for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + hash(i, seed) * 0.2, d = r * (0.92 + 0.12 * hash(i, seed + 1)); rock(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.96, 11 + 8 * hash(i, seed + 2), i * 1.7, k); }
        }, tg.id);
      },
      // the scales' spires: shards of black rock left standing, lit at their feet
      scales(tg) {
        mark(T.short, tg.live, (ctx, s, k, age, seed) => {
          const hk = Math.max(0, 1 - age / 3);
          glow(ctx, s.x, s.y, s.r * 0.9, C.ink, k * 0.7);
          for (let i = 0; i < 5; i++) {
            const a = i * TAU / 5 + hash(i, seed), d = i ? s.r * 0.45 : 0, x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d * 0.8, h = i ? 26 : 44;
            glow(ctx, x, y, 22, C.fire, k * hk * 0.6);
            poly(ctx, [x - 9, y, x - 4, y - h * 0.6, x + 1, y - h, x + 5, y - h * 0.5, x + 10, y], rgba('#1a100d', Math.min(1, k * 1.5)), C.ink, 1.5);
            line(ctx, x - 5, y - 2, x, y - h * 0.8, rgba(C.amber, k * hk * 0.9), 1.4);
          }
        }, tg.id);
      },
      // Wingbeat: ash streaked along the line, small rock left where the wind dropped it
      wingbeat(tg) {
        mark(T.brief, tg.live, (ctx, s, k, age, seed) => {
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle); ctx.lineCap = 'round';
          for (let i = 0; i < 18; i++) {
            const u = hash(i, seed) * s.len * 0.9, v = (hash(i, seed + 1) - 0.5) * s.w * 0.9, l = 50 + 90 * hash(i, seed + 2);
            ctx.beginPath(); ctx.moveTo(u, v); ctx.lineTo(u + l, v); ctx.strokeStyle = rgba(C.ash, k * 0.5); ctx.lineWidth = 2 + 2 * hash(i, seed + 3); ctx.stroke();
          }
          for (let i = 0; i < 12; i++) rock(ctx, hash(i, seed + 4) * s.len, (hash(i, seed + 5) - 0.5) * s.w * 0.9, 4 + 3 * hash(i, seed + 6), i, k);
          ctx.restore();
        }, tg.id);
      },
      // the Heart Burn: the floor still lava from wall to wall but the island, cooling
      heartburn(tg) {
        mark(T.long, tg.live, (ctx, s, k, age, seed) => lavaBody(ctx, s, k * 1.2, age, seed, { heat: Math.max(0.35, 1 - age / 12), flames: true }), tg.id);
      },
    };
    function scorchLine(ctx, s, k, age, seed) {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), hk = Math.max(0, 1 - age / 3);
      ctx.save(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + ca * s.len, s.y + sa * s.len);
      ctx.strokeStyle = rgba(C.ink, k * 0.55); ctx.lineWidth = s.w * 0.5; ctx.stroke();
      ctx.strokeStyle = rgba(C.ink, k * 0.7); ctx.lineWidth = s.w * 0.2; ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const d = hash(i, seed) * s.len, v = (hash(i, seed + 1) - 0.5) * s.w * 0.4, x = s.x + ca * d - sa * v, y = s.y + sa * d + ca * v, l = 24 + 40 * hash(i, seed + 2);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ca * l - sa * 6, y + sa * l + ca * 6); ctx.strokeStyle = rgba(C.fire, k * hk * 0.9); ctx.lineWidth = 2.2; ctx.stroke();
      }
      ctx.restore();
    }
    return afterSet;
  }

  // ---------------------------------------------------------------- molten ground and lava pools (arena-view.js asks)
  // lava over a shape: a bright body under a crust of black plates drifting on it, the glow showing in the seams, bubbles rising
  function lavaBody(ctx, s, k, t, id, o = {}) {
    const R = AR(), heat = o.heat ?? 1;
    ctx.save();
    SHAPES.trace(ctx, s); ctx.clip();
    const cx = s.x, cy = s.y;
    const g = ctx.createRadialGradient(cx, cy, s.r2 || 30, cx, cy, R * 1.3);
    g.addColorStop(0, rgba(C.amber, 0.6 * k * heat)); g.addColorStop(1, rgba(C.deep, 0.55 * k));
    ctx.fillStyle = g; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    // the crust: dark plates, a lit seam round each
    const donut = s.kind === 'donut', plates = donut ? 70 : 44, far = donut ? Math.min(s.r, R + Math.hypot(s.x, s.y)) : 0;
    for (let i = 0; i < plates; i++) {
      let x, y;
      if (donut) { const a = hash(i * 3 + id, 1) * TAU, d = s.r2 + (far - s.r2) * Math.sqrt(hash(i * 5 + id, 2)); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      else { const a = s.angle + (hash(i * 3 + id, 1) - 0.5) * s.arc, d = s.r * Math.sqrt(hash(i * 5 + id, 2)); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      x += Math.sin(t * 0.3 + i) * 8; y += Math.cos(t * 0.27 + i) * 8;
      const w = 20 + hash(i, id + 40) * 34, rot = hash(i, id + 41) * TAU;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      const nv = 5 + Math.floor(hash(i, id + 42) * 4);
      ctx.beginPath(); for (let j = 0; j < nv; j++) { const a = j * TAU / nv + (hash(i * 7 + j, id + 43) - 0.5) * 0.6, rr = w * (0.55 + 0.65 * hash(i * 7 + j, id)); j ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.7) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.7); }
      ctx.closePath(); ctx.fillStyle = rgba('#241210', (donut ? 0.62 : 0.78) * k * (1.2 - 0.4 * heat)); ctx.fill();
      ctx.strokeStyle = rgba(C.amber, 0.55 * k * heat); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
    // bubbles and sparks
    for (let i = 0; i < (donut ? 16 : 8); i++) {
      let x, y;
      if (donut) { const a = hash(i * 9 + id, 3) * TAU, d = s.r2 + 30 + (far - s.r2 - 30) * hash(i * 11 + id, 4); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      else { const a = s.angle + (hash(i * 9 + id, 3) - 0.5) * s.arc * 0.8, d = s.r * (0.15 + 0.8 * hash(i * 11 + id, 4)); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      const q = (t * 0.35 + hash(i, id + 5)) % 1, r = 9 + 7 * hash(i, id + 6);
      if (q < 0.7) { circle(ctx, x, y, r * (0.5 + q * 0.7), rgba('#ff6a14', 0.8 * k * heat), rgba(C.hot, 0.8 * k * heat), 1.5); circle(ctx, x - r * 0.2, y - r * 0.25, r * 0.18, rgba(C.white, 0.8 * k * heat)); }
      else { const u = (q - 0.7) / 0.3; circle(ctx, x, y, r * (1.1 + u), null, rgba(C.hot, 0.8 * (1 - u) * k * heat), 2); }
    }
    for (let i = 0; i < 26; i++) {
      let x, y;
      if (donut) { const a = hash(i * 5 + 3 + id, 7) * TAU, d = s.r2 + (far - s.r2) * hash(i * 11 + id, 8); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      else { const a = s.angle + (hash(i * 5 + 3 + id, 7) - 0.5) * s.arc, d = s.r * hash(i * 11 + id, 8); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      const q = (t * 0.6 + hash(i, id + 9)) % 1; circle(ctx, x, y - q * 20, 2 + q * 2.5, rgba(C.hot, 0.7 * (1 - q) * k * heat));
    }
    if (o.flames) for (let i = 0; i < 16; i++) {
      const a = hash(i * 3 + id, 12) * TAU, d = s.r2 + (far - s.r2) * Math.sqrt(hash(i * 5 + id, 13)), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
      flame(ctx, x, y, 30 + 22 * hash(i, id + 14), 8, Math.sin(t * 7 + i) * 4, 0.5 * k * heat);
    }
    ctx.restore();
  }
  // Vhalgrath's molten floor (a breath's cone, the boiling rim): lava under a drifting crust, a lit lip, a red rim (it hurts)
  function moltenFloor(ctx, z, k, t) {
    const s = z.shape, id = z.id || 0;
    ctx.save();
    ARENA.trace(ctx, 2); ctx.clip();
    lavaBody(ctx, s, k, t, id);
    if (s.kind === 'donut') {
      // the lip of the lava where the floor stays: a hot edge with flames licking up it
      glowRing(ctx, 0, 0, s.r2, C.amber, 0.55 * k, 3);
      for (let i = 0; i < 22; i++) { const a = i * TAU / 22 + hash(i, id) * 0.1, q = (t * 0.8 + hash(i, id + 1)) % 1; flame(ctx, Math.cos(a) * (s.r2 + 6), Math.sin(a) * (s.r2 + 6), 18 + 14 * hash(i, id + 2), 5, Math.sin(t * 6 + i) * 3, 0.45 * k * (0.6 + 0.4 * Math.sin(q * Math.PI))); }
    }
    SHAPES.trace(ctx, s);
    ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85 * k); ctx.lineWidth = 2.5; ctx.stroke();   // a lasting hazard: red rim
    ctx.restore();
  }
  // a pool of lava left where a Magma Burst or a Cinder Rain ember fell: ragged black rim, bright body, a white-hot middle, bubbles breaking
  function emberPool(ctx, p, r, k, t) {
    const id = p.id || 0;
    ctx.save(); ctx.globalAlpha = k;
    glow(ctx, p.x, p.y, r * 1.5, '#ff6a1a', 0.34);
    const blob = (rr, pad) => {
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) { const a = i * TAU / 18, w = 1 + Math.sin(a * 3 + id) * 0.09 + Math.sin(a * 5 + t * 1.6) * 0.04, x = p.x + Math.cos(a) * (rr * w + pad), y = p.y + Math.sin(a) * (rr * w + pad); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath();
    };
    blob(r, 4); ctx.fillStyle = '#1a0c08'; ctx.fill();
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.05, p.x, p.y, r);
    g.addColorStop(0, C.white); g.addColorStop(0.25, C.hot); g.addColorStop(0.6, '#ff7a22'); g.addColorStop(1, '#8a2208');
    blob(r, 0); ctx.fillStyle = g; ctx.fill();
    // a few black crust plates floating on it
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + id + Math.sin(t * 0.4 + i) * 0.3, d = r * 0.5; ellipse(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.9, r * 0.2, r * 0.12, a, rgba('#241210', 0.8)); }
    blob(r, 0); ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85); ctx.lineWidth = 2.5; ctx.stroke();
    // rock thrown out of it, lying round the edge
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + id * 2, d = r * (1.08 + 0.16 * hash(i, id)); rock(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.92, 5 + 3 * hash(i, id + 1), i, 0.95); }
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3 + id * 0.13) % 1, a = i * 2.1 + id; circle(ctx, p.x + Math.cos(a) * r * 0.45, p.y + Math.sin(a) * r * 0.45, 2 + q * 6, null, rgba(C.white, 0.7 * (1 - q)), 1.5); }
    flame(ctx, p.x + r * 0.15, p.y - r * 0.1, 14 + 6 * Math.sin(t * 8 + id), 5, Math.sin(t * 6 + id) * 3, 0.7);
    ctx.restore();
  }

  // ---------------------------------------------------------------- the gathering on his body while he casts (boss-vfx.js castStart() asks)
  // H: the gathering helpers (drawIn, emit, beat, P) boss-vfx.js owns
  function cast(sh, b, dur, anim, name, H) {
    const mouth = H.P(b, 'wyrm', 100, 0), chest = H.P(b, 'wyrm', 14, 0);
    if (anim === 'roar') {
      // the roar gathering in his throat: fire in the mouth, embers lifting off his back
      H.drawIn(sh, dur, mouth, { color: '#ff8a2a', color2: '#ffe0a0', r: 70, gr: 36, z: 20 });
      H.emit(sh, dur, 0.5, () => { const q = chest(); VFX.spawn({ x: q.x + rnd(-30, 30), y: q.y + rnd(-20, 20), z: 20, vz: rnd(60, 130), life: rnd(0.6, 1), size: rnd(3, 6), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ff6a1a' }); });
    } else if (anim === 'claws') {
      // a claw drawn back, embers shaken off it
      const claw = H.P(b, 'wyrm', 58, -34);
      H.drawIn(sh, dur, claw, { color: '#ffb040', color2: '#fff4d8', r: 44, gr: 24, rate: 0.25 });
      H.drawIn(sh, dur, mouth, { color: '#ff8a2a', r: 40, gr: 20, rate: 0.15, z: 20 });
    } else if (anim === 'breath') {
      // fire pooling in his mouth: a white-hot point growing in it, smoke curling from the nostrils
      H.drawIn(sh, dur, mouth, { color: '#ffd27a', color2: '#ffffff', r: 90, gr: 44, rate: 0.5, z: 20 });
      H.emit(sh, dur, 0.4, () => { const q = mouth(); VFX.smoke(q.x, q.y, { n: 1, color: '#4a3a38', size: 20, a: 0.4, speed: 40 }); });
    } else if (anim === 'tail') {
      const tail = H.P(b, 'wyrm', -150, 0);
      H.emit(sh, dur, 0.5, () => { const q = tail(); VFX.smoke(q.x + rnd(-20, 20), q.y + rnd(-20, 20), { n: 1, color: '#6a5648', size: 24, a: 0.45, speed: 60 }); });
    } else if (anim === 'burst') {
      // heat gathering under the party: embers jumping off the floor round them
      H.emit(sh, dur, 0.7, () => { const a = rnd(0, TAU), d = rnd(60, 300); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: 0, vz: rnd(60, 130), life: rnd(0.5, 0.9), size: rnd(3, 6), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ff6a1a' }); });
      H.drawIn(sh, dur, mouth, { color: '#ff8a2a', r: 50, gr: 24, rate: 0.2, z: 20 });
    } else if (anim === 'feast' || anim === 'flare') {
      // a ball of fire gathering over his head, spinning, tightening
      const orb = H.P(b, 'wyrm', 70, 0);
      H.drawIn(sh, dur, orb, { color: '#ff8a2a', color2: '#ffe0a0', r: 100, gr: 56, rate: 0.7, z: 48 });
      H.emit(sh, dur, 0.5, () => { const q = orb(), a = rnd(0, TAU); VFX.spawn({ x: q.x + Math.cos(a) * 26, y: q.y + Math.sin(a) * 18, z: 48 + Math.sin(a) * 14, vx: -Math.sin(a) * 40, vy: Math.cos(a) * 30, vz: rnd(-20, 30), life: 0.5, size: rnd(4, 7), size1: 0, color: '#ffd27a' }); });
    } else if (anim === 'fly') {
      // the wings driving air: a wind of ash round him, grit streaming off the stone
      H.emit(sh, dur, 0.9, () => { const a = rnd(0, TAU), d = rnd(60, 140); VFX.smoke(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7, { n: 1, color: '#7a6e64', size: 26, a: 0.5, speed: 160 }); });
      H.drawIn(sh, dur, () => b, { color: '#cfc3b4', r: 170, gr: 60, rate: 0.5, glow: false });
    } else if (anim === 'dive') {
      H.emit(sh, dur, 0.6, () => { const a = rnd(0, TAU); VFX.spawn({ x: b.x + Math.cos(a) * 40, y: b.y + Math.sin(a) * 30, z: 40, vz: rnd(20, 60), life: rnd(0.5, 0.9), size: rnd(3, 6), size1: 0, color: '#ffb040' }); });
    } else if (anim === 'roost') {
      H.emit(sh, dur, 0.8, () => { const a = rnd(0, TAU), d = rnd(40, 120); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: 60, vz: -rnd(20, 60), life: rnd(0.6, 1), size: rnd(3, 6), size1: 0, color: '#ff8a2a' }); });
    } else if (anim === 'boil') {
      // the rim glowing: embers lifting off the edge of the crater all the way round
      H.emit(sh, dur, 0.9, () => { const a = rnd(0, TAU), d = AR() * rnd(0.82, 1); VFX.spawn({ x: Math.cos(a) * d, y: Math.sin(a) * d, z: 0, vz: rnd(50, 120), life: rnd(0.6, 1.1), size: rnd(3, 7), size1: 0, color: Math.random() < 0.5 ? '#ffd27a' : '#ff6a1a' }); });
    } else if (anim === 'rain') {
      // embers gathering above him, loosening
      H.emit(sh, dur, 0.8, () => { const q = chest(); VFX.spawn({ x: q.x + rnd(-60, 60), y: q.y + rnd(-40, 40), z: 90, vz: rnd(-40, 20), life: rnd(0.5, 0.9), size: rnd(4, 7), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ff6a1a' }); });
      H.drawIn(sh, dur, chest, { color: '#ff8a2a', r: 90, gr: 40, rate: 0.4, z: 70 });
    } else if (anim === 'heart') {
      // the Heart in his chest: it beats, and each beat sends a ring of heat out across the floor
      H.drawIn(sh, dur, chest, { color: '#ffe08a', color2: '#ffffff', r: 60, gr: 50, rate: 0.5, z: 10 });
      H.beat(sh, dur, 0.9, () => { const q = chest(); VFX.shock(q.x, q.y, { r: 160, color: '#ffb040', w: 5, dur: 0.6, flat: 0.8 }); });
    } else if (anim === 'wing') {
      H.emit(sh, dur, 0.9, () => { const a = rnd(0, TAU), d = rnd(60, 200); VFX.smoke(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7, { n: 1, color: '#8a7e74', size: 28, a: 0.5, speed: 150 }); });
    }
  }

  // an ember whelp dropping off his perch: a gout of sparks, ash, a small ring of heat
  function whelpSpawn(x, y, H) {
    VFX.burst(x, y, { color: '#ff8a2a', color2: '#ffe0a0', n: 14, speed: 200 });
    VFX.spikeburst(x, y, { r: 40, n: 10, color: '#ff7a1a', core: '#fff4d8', ink: '#3a1408', dur: 0.35 });
    VFX.smoke(x, y, { color: '#4a3a38', n: 5, size: 26, a: 0.5, speed: 70 });
    VFX.debris(x, y, { color: '#2a1c18', n: 4, speed: 0.9, hot: true });
    H.shockAt(x, y, { r: 80, color: C.fire, w: 4, dur: 0.4, flat: 1 });
  }
  // a whelp cut down: it flares, comes apart in embers and black scale, a little flame left burning
  function whelpDeath(x, y, H) {
    VFX.flash(x, y - 10, 60, C.white, 0.25);
    VFX.burst(x, y, { color: '#ff8a2a', color2: '#ffffff', n: 18, speed: 260, size: 15 });
    VFX.debris(x, y, { color: '#2a1c18', n: 6, speed: 1.1, hot: true });
    VFX.smoke(x, y, { color: '#3a2a26', n: 5, size: 28, a: 0.55, speed: 60 });
    cluster(x, y, 14, 3, { h: 60, w: 11, life: 0.6 });
    H.shockAt(x, y, { r: 70, color: C.hot, w: 4, dur: 0.35, flat: 1 });
  }

  return { tell, impact, aftermath, moltenFloor, emberPool, lavaBody, cast, whelpSpawn, whelpDeath };
})();
