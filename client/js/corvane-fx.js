// Corvane, the Unburied Blade: how every move of his looks on the floor and when it lands. His body, room and lanterns live in
// corvane-art.js and arena-view.js; this file is the moves: the warnings painted inside the red outlines (boss-tells.js get() /
// buster / track()), the cracked-ice zone of Still Water (ArenaView.drawZones), what each move does when it lands and what it
// leaves behind (boss-vfx.js impact()), the numbered silver afterimages of the Hundredfold Parting (ArenaView.drawRoomOver),
// the dash and the wisps (propfx), and the enrage, entrance and fall. Loaded after corvane-art.js; the other files reach it
// through CV_FX and every call is guarded by `typeof CV_FX !== 'undefined'`.
// The rule as everywhere: the red (or blue) outline marks the exact area and is drawn by boss-tells.js; what is painted inside is
// the clue, and safe floor is never painted. The look follows the painted sheets (docs/art/vfx-reference/corvane-*.png): moonlit
// blue-grey snow, frost-cyan and white for every danger, silver for afterimages, warm amber only in the lantern flames.

const CV_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeIn = q => q * q;
  const C = { frost: '#8fe0ff', ice: '#cfeeff', white: '#f4fbff', deep: '#06182a', mid: '#4fa8e0', navy: '#0a1e3a', silver: '#c8d4e4', silverHi: '#eef4ff', amber: '#ffb050' };
  const AR = () => ARENA.R;
  const clipRoom = c => { ARENA.trace(c, 4); c.clip(); };
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  // what the moves remember between frames: when the last Sundering Cut landed (so Cracked Guard reads as the second blow), the
  // angle of the first Rising Crane (so the second can show its turn), when the camera last held, the afterimages already shown
  const S = { out: new Set(), cutAt: -99, guard: false, craneA: null, camAt: -99, img: { n: 0, at: {} }, whiffAt: new Map(), n: null, over: 0, stopAt: -99 };
  // how far a line from (x, y) along a runs before it meets the wall
  const wall = (x, y, a, max = 2400) => { const c = Math.cos(a), s = Math.sin(a); let d = 0; while (d < max && ARENA.sd(x + c * d, y + s * d) < -10) d += 12; return d; };
  const inPoly = (poly, x, y) => { let r = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r; } return r; };
  // the camera holds for a beat when an unleashing lands (the existing hook: main.js FX.cam); never more than once in a few seconds
  function cam(stop = 0.1, punch = 0.035, dur = 0.5, gap = 3) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }

  // ---------------------------------------------------------------- small painted pieces
  // a rect telegraph drawn in its own frame: x runs down the lane, y across it
  function lane(ctx, s, fn) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    fn(Math.min(s.len, AR() * 2.3), s.w / 2); ctx.restore();
  }
  // a jagged path (added to the current one) from (x1, y1) to (x2, y2)
  function zigPath(ctx, x1, y1, x2, y2, seed, jag = 8, seg = 26) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / seg)), nx = -dy / L, ny = dx / L;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n, o = (hash(i, seed) - 0.5) * 2 * jag; ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
    ctx.lineTo(x2, y2);
  }
  // a crack in ice or snow: a dark edge, a pale body
  function crackLine(ctx, x1, y1, x2, y2, seed, k, o = {}) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); zigPath(ctx, x1, y1, x2, y2, seed, o.jag ?? 8, o.seg ?? 24);
    ctx.strokeStyle = rgba(o.ink || C.deep, 0.5 * k); ctx.lineWidth = (o.w || 2) + 2.4; ctx.stroke();
    ctx.strokeStyle = rgba(o.col || '#e8f6ff', k); ctx.lineWidth = o.w || 2; ctx.stroke();
    ctx.restore();
  }
  // cracks running out of a point
  function crackStar(ctx, x, y, r, n, seed, k, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, seed) * 0.6, d = r * (0.55 + 0.45 * hash(i, seed + 1));
      const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d * (o.flat ?? 0.8);
      crackLine(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, ex, ey, seed + i, k, { w: o.w || 1.8, jag: o.jag ?? 7, seg: 20 });
      if (hash(i, seed + 2) < 0.7) { const u = 0.4 + 0.3 * hash(i, seed + 3), bx = x + (ex - x) * u, by = y + (ey - y) * u, ba = a + (hash(i, seed + 4) < 0.5 ? -1 : 1) * 0.8; crackLine(ctx, bx, by, bx + Math.cos(ba) * d * 0.3, by + Math.sin(ba) * d * 0.3 * 0.8, seed + i + 9, k * 0.8, { w: (o.w || 1.8) * 0.7, jag: 4, seg: 14 }); }
    }
  }
  // a six-armed flake
  function flake(ctx, x, y, r, col, lw = 1.6) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, bx = Math.cos(a) * r * 0.6, by = Math.sin(a) * r * 0.6; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a + 0.9) * r * 0.28, by + Math.sin(a + 0.9) * r * 0.28); ctx.lineTo(bx, by); ctx.lineTo(bx + Math.cos(a - 0.9) * r * 0.28, by + Math.sin(a - 0.9) * r * 0.28); ctx.stroke(); }
    ctx.restore();
  }
  // snowflakes and glints thrown off a point
  function flurry(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(40, o.speed || 170);
      VFX.spawn({ x, y, z: rand(4, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(30, 130), g: 160, drag: 0.03, life: rand(0.7, 1.4), size: rand(5, 10) * (o.size || 1), size1: 0,
        color: i % 3 ? '#ffffff' : '#bfe8ff', kind: i % 2 ? 'star' : 'glow', vr: rand(-5, 5) });
    }
  }
  // the pale figure of him (silver, see-through): drawn with his own art onto a small layer, tinted there, then laid on the scene
  let gc = null;
  function ghostFig(ctx, x, y, face, a, o = {}) {
    if (a <= 0.01 || typeof document === 'undefined' || typeof drawBoss !== 'function') return;
    const BOX = 380, m = ctx.getTransform(), px = Math.min(Math.hypot(m.a, m.b) || 1, 1.5), N = Math.ceil(BOX * px);
    if (!gc) gc = document.createElement('canvas');
    if (gc.width !== N) gc.width = gc.height = N;
    const c = gc.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, N, N);
    c.setTransform(px, 0, 0, px, N / 2, N / 2);
    drawBoss(c, { id: 'corvane' }, 0, 0, face, { t: o.t || 0, moving: false, action: null, phase: 0, props: o.props || { stance: 'parting', notch: 0, over: 0 } }, 1.3);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = 0.66; c.fillStyle = C.silver; c.fillRect(0, 0, N, N);
    c.globalAlpha = 0.3; c.fillStyle = '#ffffff'; c.fillRect(0, 0, N, N);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a) * 0.62; ctx.drawImage(gc, x - BOX / 2, y - BOX / 2, BOX, BOX);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.45; ctx.drawImage(gc, x - BOX / 2, y - BOX / 2, BOX, BOX);
    ctx.restore();
  }

  // ---------------------------------------------------------------- the warnings (boss-tells.js get() reads TELLS[tag])
  // Each paints only the danger, inside the outline the shared code draws: a line, a fan, a mist. Nothing marks a safe place.
  const TELLS = {};

  // Draw Cut: a thin frost line scored across the snow from him, a hair of light that sharpens as the blade comes
  TELLS.cvDraw = { ground(ctx, tg, s, p, k, t) {
    lane(ctx, s, (L, hw) => {
      const grow = easeOut(clamp(p / 0.5, 0, 1)), X = L * grow;
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba(C.frost, (0.14 + 0.14 * p) * k)); g.addColorStop(1, rgba(C.frost, (0.04 + 0.05 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(0, -hw * 0.28, X, hw * 0.56);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(X, 0);
      ctx.strokeStyle = rgba(C.deep, 0.45 * k); ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = rgba(C.frost, (0.35 + 0.4 * p) * k); ctx.lineWidth = 3.6; ctx.stroke();
      ctx.strokeStyle = rgba(C.white, (0.7 + 0.3 * p) * k); ctx.lineWidth = 1.5; ctx.stroke();
      // frost feathering off the line, angled forward
      for (let i = 0, n = Math.floor(X / 44); i < n; i++) {
        const x = i * 44 + hash(i, tg.id) * 18, sd = i % 2 ? 1 : -1, ln = 6 + hash(i, tg.id + 1) * 9;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + ln * 0.9, sd * ln); ctx.strokeStyle = rgba(C.ice, (0.3 + 0.3 * p) * k); ctx.lineWidth = 1.2; ctx.stroke();
      }
      // glints running down it, and the bright tip
      for (let i = 0; i < 5; i++) { const x = (t * (220 + 300 * p) + i * L / 5) % L; if (x < X) glow(ctx, x, 0, 9 + 4 * p, C.white, (0.4 + 0.3 * p) * k); }
      glow(ctx, X, 0, 26 + 16 * p, C.frost, (0.3 + 0.4 * p) * k);
      ctx.beginPath(); ctx.moveTo(X - 14, -9); ctx.lineTo(X, 0); ctx.lineTo(X - 14, 9); ctx.strokeStyle = rgba(C.white, (0.4 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
    });
  } };

  // Scabbard Sweep: half the room glazed with frost, snow streaming round it toward the scabbard side
  TELLS.cvSweep = { ground(ctx, tg, s, p, k, t, env) {
    const b = env.boss, side = b && Math.sin(s.angle - (b.f || 0)) < 0 ? -1 : 1;
    const a0 = s.angle - side * s.arc / 2, a1 = s.angle + side * s.arc / 2;   // from the facing edge to the far edge
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 40, s.x, s.y, 900);
    g.addColorStop(0, rgba(C.ice, (0.1 + 0.12 * p) * k)); g.addColorStop(1, rgba(C.frost, (0.03 + 0.05 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - 1000, s.y - 1000, 2000, 2000);
    // the glassy cracks laid across it
    for (let i = 0; i < 10; i++) {
      const u = (i + 0.5) / 10 + (hash(i, tg.id) - 0.5) * 0.06, an = a0 + (a1 - a0) * u, d0 = 70 + hash(i, tg.id + 1) * 140, d1 = d0 + 240 + hash(i, tg.id + 2) * 620;
      crackLine(ctx, s.x + Math.cos(an) * d0, s.y + Math.sin(an) * d0, s.x + Math.cos(an) * d1, s.y + Math.sin(an) * d1, tg.id + i, (0.2 + 0.3 * p) * k, { w: 1.3, jag: 9, seg: 30 });
    }
    ctx.lineCap = 'round';
    for (let j = 0; j < 8; j++) { const r = 190 + j * 105, aa = a0 + (a1 - a0) * hash(j, tg.id + 5) * 0.85; ctx.beginPath(); ctx.arc(s.x, s.y, r, Math.min(aa, aa + side * 0.2), Math.max(aa, aa + side * 0.2)); ctx.strokeStyle = rgba(C.ice, (0.15 + 0.25 * p) * k); ctx.lineWidth = 1.2; ctx.stroke(); }
    // snow streaming round in the sweep's own direction, faster as it comes
    const sp = 0.16 + 0.5 * p;
    for (let i = 0; i < 30; i++) {
      const r = 140 + hash(i, tg.id + 4) * 900, ph = (hash(i, tg.id + 5) + t * sp * (0.6 + hash(i, 2) * 0.8)) % 1, an = a0 + (a1 - a0) * ph, len = (40 + hash(i, 7) * 100) / r;
      const lo = Math.min(an, an - side * len), hi = Math.max(an, an - side * len), fade = Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.arc(s.x, s.y, r, lo, hi); ctx.strokeStyle = rgba('#eaf6ff', (0.22 + 0.4 * p) * fade * k); ctx.lineWidth = 1.5 + hash(i, 9) * 2; ctx.stroke();
      glow(ctx, s.x + Math.cos(an) * r, s.y + Math.sin(an) * r, 6, '#ffffff', 0.4 * fade * k * (0.3 + p));
    }
    ctx.restore();
  } };

  // Hollow Breath: cold mist wheeling round the healer, calm in the very middle
  TELLS.cvBreath = { ground(ctx, tg, s, p, k, t) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.2, s.x, s.y, s.r);
    g.addColorStop(0, rgba(C.ice, 0.02 * k)); g.addColorStop(0.55, rgba('#dff0ff', (0.1 + 0.12 * p) * k)); g.addColorStop(1, rgba('#cfe4f8', (0.2 + 0.18 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const r = s.r * (0.5 + 0.45 * hash(i, tg.id)), dir = i % 2 ? 1 : -1, an = hash(i, tg.id + 1) * TAU + t * (0.5 + hash(i, 3)) * dir, len = 0.5 + hash(i, 4) * 0.7;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, an, an + len * dir, dir < 0); ctx.strokeStyle = rgba('#eaf6ff', (0.12 + 0.12 * p) * k); ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', (0.28 + 0.3 * p) * k); ctx.lineWidth = 1.6; ctx.stroke();
    }
    for (let i = 0; i < 7; i++) { const q = (t * 0.5 + i / 7 + tg.id * 0.13) % 1, a = hash(i, tg.id + 6) * TAU; circle(ctx, s.x + Math.cos(a) * s.r * 0.75, s.y + Math.sin(a) * s.r * 0.75 - q * 24, 2 * (1 - q) + 0.6, rgba('#ffffff', 0.7 * (1 - q) * k)); }
    ctx.restore();
    // a ring round the healer where the air is still
    circle(ctx, s.x, s.y, s.r * 0.22, null, rgba(C.frost, (0.3 + 0.4 * p) * k), 1.6);
    // in the last moments the cold bites up at the rim
    if (p > 0.7) for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + hash(i, tg.id) * 0.3, h = 12 * clamp((p - 0.7) / 0.3, 0, 1) * (0.6 + 0.6 * hash(i, 8)), x = s.x + Math.cos(a) * (s.r - 4), y = s.y + Math.sin(a) * (s.r - 4); poly(ctx, [x - 3, y, x + Math.cos(a) * h * 0.3, y + Math.sin(a) * h * 0.3 - h, x + 3, y], rgba('#e8f6ff', 0.8 * k)); }
  } };

  // Rising Crane: a fan of frost, ribbed like a folding fan, light running out along each rib. The second shows its turn.
  function craneTell(second) {
    return { ground(ctx, tg, s, p, k, t, env) {
      const R = Math.min(s.r, 1150), a0 = s.angle - s.arc / 2, a1 = s.angle + s.arc / 2;
      if (!second) S.craneA = { a: s.angle, t };
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 40, s.x, s.y, R);
      g.addColorStop(0, rgba(C.ice, (0.14 + 0.14 * p) * k)); g.addColorStop(1, rgba(C.frost, (0.04 + 0.07 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - R, s.y - R, R * 2, R * 2);
      const n = 9;
      // alternate leaves of the fan, a little paler
      for (let i = 0; i < n; i += 2) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, R, a0 + s.arc * i / n, a0 + s.arc * (i + 1) / n); ctx.closePath(); ctx.fillStyle = rgba('#eaf6ff', (0.04 + 0.05 * p) * k); ctx.fill(); }
      ctx.lineCap = 'round';
      for (let i = 0; i <= n; i++) {
        const an = a0 + s.arc * i / n, ca = Math.cos(an), sa = Math.sin(an);
        if (second) ctx.setLineDash([16, 12]);
        ctx.beginPath(); ctx.moveTo(s.x + ca * 60, s.y + sa * 60); ctx.lineTo(s.x + ca * R, s.y + sa * R);
        ctx.strokeStyle = rgba(C.frost, (0.28 + 0.4 * p) * k * (i === 0 || i === n ? 0.7 : 1)); ctx.lineWidth = i === 0 || i === n ? 2.4 : 1.4; ctx.stroke(); ctx.setLineDash([]);
        const d = 120 + ((t * (260 + 400 * p) + i * 97) % (R - 140)); glow(ctx, s.x + ca * d, s.y + sa * d, 9, C.white, 0.5 * k * (0.3 + p));
      }
      for (const rr of [230, 440, 660, 890, 1120]) if (rr < R + 40) { ctx.beginPath(); ctx.arc(s.x, s.y, rr, a0, a1); ctx.strokeStyle = rgba(C.ice, (0.14 + 0.24 * p) * k); ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.restore();
      if (second) {
        // the fan before this one stood here; this one has turned from it
        const first = S.craneA && Math.abs(S.craneA.t - t) < 4 ? S.craneA.a : null;
        let sib = null; if (env.tgs) for (const o of env.tgs.values()) if (o.tag === 'cvCrane' && o !== tg && Math.abs(o.start - tg.start) < 1.5) sib = o;
        const fa = sib ? sib.live.angle : first;
        if (fa != null) {
          let d = Math.atan2(Math.sin(s.angle - fa), Math.cos(s.angle - fa));
          const rr = 330, ex = s.x + Math.cos(s.angle) * rr, ey = s.y + Math.sin(s.angle) * rr, tx = -Math.sin(s.angle) * Math.sign(d), ty = Math.cos(s.angle) * Math.sign(d);
          ctx.save(); ctx.lineCap = 'round';
          ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(fa) * 90, s.y + Math.sin(fa) * 90); ctx.lineTo(s.x + Math.cos(fa) * 900, s.y + Math.sin(fa) * 900); ctx.strokeStyle = rgba(C.ice, 0.28 * k); ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
          for (const [w, col, al] of [[5, C.deep, 0.35], [2.2, C.white, 0.85]]) { ctx.beginPath(); ctx.arc(s.x, s.y, rr, fa, fa + d, d < 0); ctx.strokeStyle = rgba(col, al * k); ctx.lineWidth = w; ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(ex - tx * 12 - Math.cos(s.angle) * 9, ey - ty * 12 - Math.sin(s.angle) * 9); ctx.lineTo(ex + tx * 4, ey + ty * 4); ctx.lineTo(ex - tx * 12 + Math.cos(s.angle) * 9, ey - ty * 12 + Math.sin(s.angle) * 9);
          ctx.strokeStyle = rgba(C.white, 0.9 * k); ctx.lineWidth = 2.4; ctx.stroke();
          ctx.restore();
        }
      }
    } };
  }
  TELLS.cvCrane = craneTell(false);
  TELLS.cvCrane2 = craneTell(true);

  // Comet Draw: a straight lane to the wall, dashes and chevrons running down it (a lantern's shadow is cut out of it by the caller)
  TELLS.cvComet = { ground(ctx, tg, s, p, k, t) {
    lane(ctx, s, (L, hw) => {
      const grow = easeOut(clamp(p / 0.45, 0, 1)), X = L * grow;
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba(C.white, (0.22 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.frost, (0.05 + 0.06 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(0, -hw * 0.34, X, hw * 0.68);
      ctx.lineCap = 'round';
      ctx.setLineDash([24, 14]); ctx.lineDashOffset = -t * (60 + 140 * p);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(X, 0); ctx.strokeStyle = rgba(C.deep, 0.4 * k); ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = rgba(C.white, (0.55 + 0.4 * p) * k); ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 14; i++) {
        const x = ((i / 14) * L + t * (140 + 380 * p)) % L; if (x > X) continue;
        const f = (1 - x / L) * 0.8 + 0.2;
        ctx.beginPath(); ctx.moveTo(x - 24, -hw * 0.28); ctx.lineTo(x, 0); ctx.lineTo(x - 24, hw * 0.28); ctx.strokeStyle = rgba(C.ice, 0.55 * f * k * (0.3 + p)); ctx.lineWidth = 2; ctx.stroke();
      }
      glow(ctx, 30, 0, 70 + 30 * p, C.white, (0.2 + 0.35 * p) * k);
      glow(ctx, X, 0, 40 + 20 * p, C.frost, (0.25 + 0.4 * p) * k);
    });
  } };

  // Hundredfold Parting: a thin silver line between two afterimages, light flowing along it the way he will
  TELLS.cvPart = { ground(ctx, tg, s, p, k, t) {
    lane(ctx, s, (L, hw) => {
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0);
      ctx.strokeStyle = rgba(C.deep, 0.4 * k); ctx.lineWidth = 5.5; ctx.stroke();
      ctx.strokeStyle = rgba(C.silver, (0.5 + 0.4 * p) * k); ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', (0.55 + 0.4 * p) * k); ctx.lineWidth = 0.9; ctx.stroke();
      const n = Math.max(1, Math.round(L / 150));
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * L / n; ctx.beginPath(); ctx.moveTo(x - 12, -8); ctx.lineTo(x, 0); ctx.lineTo(x - 12, 8); ctx.strokeStyle = rgba('#ffffff', (0.5 + 0.4 * p) * k); ctx.lineWidth = 1.8; ctx.stroke();
      }
      for (let i = 0; i < 3; i++) glow(ctx, (t * (160 + 260 * p) + i * L / 3) % L, 0, 9, '#ffffff', 0.55 * k * (0.4 + p));
      glow(ctx, L, 0, 22, C.silverHi, (0.25 + 0.4 * p) * k);
    });
  } };

  // White Gale: a blizzard blowing sideways across the whole pass, long streaks and arrows, faster as it nears
  TELLS.cvGale = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const W = (ARENA.hw || AR()) + 60, Hh = (ARENA.hh || AR()) + 60, span = W * 2 + 600;
    ctx.save();
    ctx.fillStyle = rgba(C.navy, (0.08 + 0.26 * p) * k); ctx.fillRect(-W, -Hh, W * 2, Hh * 2);
    ctx.lineCap = 'round';
    for (let i = 0; i < 64; i++) {
      const y = -Hh + hash(i, 3) * Hh * 2, v = (240 + 760 * p) * (0.6 + hash(i, 5) * 0.9), len = 90 + 240 * hash(i, 7) * (0.4 + p);
      const x = ((hash(i, 9) * span + t * v) % span) - W - 300;
      ctx.beginPath(); ctx.moveTo(x - len, y - len * 0.05); ctx.lineTo(x, y);
      ctx.strokeStyle = rgba(i % 4 ? C.ice : C.white, (0.16 + 0.34 * p) * (0.5 + hash(i, 11) * 0.5) * k); ctx.lineWidth = 1.4 + hash(i, 13) * 2.8; ctx.stroke();
    }
    for (let r = 0; r < 5; r++) {
      const y = -Hh * 0.7 + r * Hh * 0.35, x = ((t * 190 * (0.7 + p) + r * 213) % (W * 2 + 300)) - W;
      ctx.beginPath(); ctx.moveTo(x - 360, y); ctx.lineTo(x, y); ctx.moveTo(x - 18, y - 12); ctx.lineTo(x, y); ctx.lineTo(x - 18, y + 12);
      ctx.strokeStyle = rgba(C.frost, (0.12 + 0.36 * p) * k); ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.restore();
  } };

  // Cold Sheathe: frost creeping in from the walls and rings drawing in on him as the blade goes home
  TELLS.cvSheathe = { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
    const b = env.boss || { x: 0, y: 0 }, R = AR() * 1.05;
    ctx.save();
    ctx.fillStyle = rgba(C.navy, (0.04 + 0.16 * p) * k); ctx.fillRect(-R, -R, R * 2, R * 2);
    ARENA.trace(ctx, -4); ctx.lineJoin = 'round';
    for (const [w, a] of [[70, 0.05], [40, 0.08], [18, 0.12], [6, 0.25]]) { ctx.strokeStyle = rgba(C.ice, a * (0.3 + p) * k); ctx.lineWidth = w * (0.4 + 0.8 * p); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1, r = 40 + (1 - q) * R * 0.9; ellipse(ctx, b.x, b.y, r, r * 0.9, 0, null, rgba(C.silver, 0.3 * q * k * (0.3 + p)), 2.2); }
    ctx.restore();
    glow(ctx, b.x, b.y - 20, 120 * (0.4 + 0.6 * p), C.silverHi, (0.1 + 0.3 * p) * k);
  } };

  // Sundering Cut / Cracked Guard (the shared tankbuster draws its red wash, then hands over): glass cracking out along the cone
  // from him, a blade of light coming down on the tank. The second blow of the pair is more broken.
  function buster(ctx, tg, s, p, k, t, env) {
    const tgt = tg.target != null && env.entById ? env.entById(tg.target) : null;
    const second = S.cutAt > -90 && nowS() - S.cutAt < 9;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const reach = s.r * easeOut(clamp(p * 1.25, 0, 1));
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
    g.addColorStop(0, rgba(C.ice, (0.12 + 0.14 * p) * k)); g.addColorStop(1, rgba(C.frost, (0.03 + 0.05 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    const n = second ? 13 : 8;
    for (let i = 0; i < n; i++) {
      const an = s.angle - s.arc / 2 + s.arc * (i + 0.5) / n + (hash(i, tg.id) - 0.5) * 0.08, d1 = Math.min(reach, 120 + hash(i, tg.id + 1) * (s.r - 100));
      if (d1 < 70) continue;
      crackLine(ctx, s.x + Math.cos(an) * 50, s.y + Math.sin(an) * 50, s.x + Math.cos(an) * d1, s.y + Math.sin(an) * d1, tg.id + i, (0.25 + 0.4 * p) * k, { w: 1.4, jag: 8, seg: 24 });
    }
    for (let j = 0; j < (second ? 6 : 4); j++) { const r = 90 + j * 60; if (r > reach) break; ctx.beginPath(); ctx.arc(s.x, s.y, r, s.angle - s.arc * 0.42, s.angle + s.arc * 0.42); ctx.strokeStyle = rgba(C.ice, (0.12 + 0.2 * p) * k); ctx.lineWidth = 1.1; ctx.stroke(); }
    ctx.restore();
    if (tgt) {
      const hx = tgt.x, hy = tgt.y - (tgt.lift || 0);
      // the blade of light, high over the tank, coming down on them
      const top = hy - 40 - 360 * (1 - p * p);
      ctx.save(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx + 18 * (1 - p), top - 140); ctx.lineTo(hx, hy - 6);
      ctx.strokeStyle = rgba(C.frost, (0.2 + 0.3 * p) * k); ctx.lineWidth = 12; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', (0.4 + 0.5 * p) * k); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      glow(ctx, hx, hy, 28 + 26 * p, C.frost, (0.2 + 0.5 * p) * k);
      ellipse(ctx, hx, hy + 6, 20 + 16 * (1 - p), 8 + 6 * (1 - p), 0, null, rgba(C.white, (0.3 + 0.5 * p) * k), 1.8);
      if (second) crackStar(ctx, hx, hy + 6, 34 * easeOut(p), 7, tg.id + 4, 0.5 * k * p, { w: 1.2, jag: 4 });
    }
  }

  // ---------------------------------------------------------------- Still Water's floor (ArenaView.drawZones hands it over)
  // Glassy cracked ice spreading out from his feet in front of him while he plants himself; once it is set, standing on it is bad.
  function iceCells(s, id) {
    const rings = [0, 0.14, 0.32, 0.52, 0.75, 1], m = 10, v = [];
    for (let i = 0; i < rings.length; i++) {
      v.push([]);
      for (let j = 0; j <= m; j++) {
        const jr = i === 0 || i === rings.length - 1 ? 0 : 0.06 * (hash(i * 31 + j, id) - 0.5), ja = i === 0 || j === 0 || j === m ? 0 : 0.7 * (hash(i * 17 + j, id + 1) - 0.5);
        const a = s.angle - s.arc / 2 + s.arc * (j + ja) / m, r = s.r * (rings[i] + jr);
        v[i].push([s.x + Math.cos(a) * r, s.y + Math.sin(a) * r]);
      }
    }
    const cells = [];
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < m; j++) cells.push({ p: [v[i][j], v[i][j + 1], v[i + 1][j + 1], v[i + 1][j]], r0: rings[i] * s.r, r1: rings[i + 1] * s.r, a: 0.04 + 0.14 * hash(i * 13 + j, id + 2), ph: hash(i, j + id) * 6 });
    return cells;
  }
  function zone(ctx, z, k, t) {
    const s = z.shape, at = z.at != null ? z.at : z.start, live = t >= at, warm = clamp((t - z.start) / Math.max(0.3, at - z.start), 0, 1), spread = live ? 1 : easeOut(warm), R = s.r * spread;
    const cells = z._cv || (z._cv = iceCells(s, Math.round(s.x * 7 + s.y * 3)));
    const ending = clamp(1 - (z.end - t) / 0.9, 0, 1);
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    SHAPES.trace(ctx, s); ctx.save(); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 30, s.x, s.y, s.r);
    g.addColorStop(0, rgba(C.ice, 0.4 * k)); g.addColorStop(1, rgba('#7fc8f0', 0.24 * k));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R, s.angle - s.arc / 2 - 0.1, s.angle + s.arc / 2 + 0.1); ctx.lineTo(s.x, s.y); ctx.closePath(); ctx.fill();
    ctx.lineJoin = 'round';
    for (const c of cells) {
      if (c.r0 > R) continue;
      const edge = clamp((R - c.r0) / Math.max(1, c.r1 - c.r0), 0, 1), glint = live ? Math.max(0, Math.sin(t * 1.4 + c.ph)) ** 6 : 0, ox = ending * (hash(c.ph, 1) - 0.5) * 26, oy = ending * (hash(c.ph, 2) - 0.5) * 26 - ending * 8;
      ctx.beginPath(); c.p.forEach(([x, y], i) => (i ? ctx.lineTo(x + ox, y + oy) : ctx.moveTo(x + ox, y + oy))); ctx.closePath();
      ctx.fillStyle = rgba(glint > 0.1 ? '#ffffff' : '#dff2ff', (c.a + 0.3 * glint) * k * edge * (1 - ending * 0.6)); ctx.fill();
      ctx.strokeStyle = rgba(C.deep, 0.32 * k * edge); ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = rgba('#e8f8ff', (live ? 0.6 : 0.4) * k * edge); ctx.lineWidth = 1.1; ctx.stroke();
    }
    ctx.restore();
    // the creeping front, while the ice is still spreading
    if (!live) { ctx.beginPath(); ctx.arc(s.x, s.y, R, s.angle - s.arc / 2, s.angle + s.arc / 2); ctx.strokeStyle = rgba('#ffffff', 0.55 * k * (1 - warm * 0.5)); ctx.lineWidth = 3; ctx.stroke(); }
    // the outline, red: dashed while it is still only a warning, solid once the ice has set
    SHAPES.trace(ctx, s); ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#05101c', 0.7 * k); ctx.lineWidth = 8; ctx.stroke();
    if (!live) { ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 24; }
    ctx.strokeStyle = rgba(BossTells.COL.danger, (live ? 0.85 : 0.6) * k); ctx.lineWidth = live ? 2.6 : 2.2; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------------------------------------------------------------- the Parting's afterimages (ArenaView.drawRoomOver hands it over)
  // numbered silver ghosts of him standing where each hero stood, until the slash
  function roomOver(ctx, room, t, env) {
    // the Whetstone gaining a notch: the edge flares where he stands (the gauge is a roomev, 'whet')
    const w = room && room.ev && room.ev.whet, bb = env && env.boss;
    if (w && bb) {
      const n = w.n | 0, over = w.over | 0, prev = S.n == null ? (t - w.start < 0.6 ? 0 : n) : S.n;
      if (n > prev) notchFx(bb, n, n >= (w.max || 4));
      else if (over > S.over) overFx(bb);
      S.n = n; S.over = over;
    } else { S.n = null; S.over = 0; }
    const ev = room && room.ev && room.ev.cvimgs;
    if (!ev || t >= ev.end || !ev.l || !ev.l.length) { if (S.img.n) S.img = { n: 0, at: {} }; return; }
    const l = ev.l;
    if (l.length < S.img.n) S.img = { n: 0, at: {} };
    S.img.n = l.length;
    l.forEach(([x, y, n], i) => {
      const born = S.img.at[n] != null ? S.img.at[n] : (S.img.at[n] = t), u = clamp((t - born) / 0.4, 0, 1), a = easeOut(u);
      const nx = l[i + 1], pv = l[i - 1];
      const face = nx ? Math.atan2(nx[1] - y, nx[0] - x) : pv ? Math.atan2(y - pv[1], x - pv[0]) : Math.atan2(-y, -x);
      // a pale ring on the snow where he stood, the figure over it, the number over his head
      ctx.save();
      ellipse(ctx, x, y + 8, 30 + 22 * (1 - u), 12 + 8 * (1 - u), 0, rgba(C.silver, 0.12 * a), rgba(C.silverHi, 0.6 * a), 1.6);
      glow(ctx, x, y - 14, 70, C.silver, 0.2 * a);
      ctx.restore();
      ghostFig(ctx, x, y - 6 + (1 - u) * 8, face, a * (0.82 + 0.1 * Math.sin(t * 3 + n)), { t });
      ctx.save();
      const by = y - 112 - (1 - u) * 12;
      circle(ctx, x, by, 18, rgba('#0a1424', 0.82 * a), rgba(C.silverHi, 0.95 * a), 2.4);
      ctx.fillStyle = rgba('#ffffff', a); ctx.font = 'bold 23px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), x, by + 1);
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------- what stays on the floor (boss-tells.js track() asks once per landed move)
  // quiet decals, cooling: never louder than the warning was
  function aftermath(tg, env, A) {
    const { mark, AFTER } = A, T = AFTER.tier, s = tg.live, id = tg.id;
    if (tg.type === 'buster') {
      const e = tg.target != null && env.entById ? env.entById(tg.target) : null; if (!e) return;
      const x = e.x, y = e.y, second = S.guard, sa = s.angle, sx = s.x, sy = s.y;
      mark(second ? T.long : T.short, { x, y }, (ctx, q, k, age, seed) => {
        crackStar(ctx, x, y + 6, second ? 120 : 82, second ? 12 : 8, seed, k, { w: 2, jag: 8, flat: 0.7 });
        // a line of cracks running back along the blow to him
        const d = Math.min(Math.hypot(x - sx, y - sy), 300), bx = sx + Math.cos(sa) * 70, by = sy + Math.sin(sa) * 70;
        crackLine(ctx, bx, by, x, y, seed + 3, k * 0.8, { w: 1.6, jag: 9, seg: 28 });
        if (second) for (let i = 0; i < 8; i++) { const a = hash(i, seed) * TAU, r = 40 + 70 * hash(i, seed + 1), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.7; poly(ctx, [px - 5, py + 2, px, py - 7, px + 5, py + 2], rgba('#dff4ff', 0.7 * k), rgba(C.deep, 0.5 * k), 1); }
      }, id);
      return;
    }
    switch (tg.tag) {
      case 'cvDraw': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, wall(s.x, s.y, s.angle)), x0 = s.x, y0 = s.y;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          // a groove in the snow, its lips thrown up on either side, hoar frost where it was cut
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [off, col, w, al] of [[0, '#04101c', 9, 0.8], [-8, '#dfe8f4', 2.2, 0.55], [8, '#dfe8f4', 2.2, 0.55], [0, '#6fb8e8', 1.4, 0.45]]) {
            ctx.beginPath(); zigPath(ctx, x0 - sa * off, y0 + ca * off, x0 + ca * L - sa * off, y0 + sa * L + ca * off, seed + off, 2.2, 34);
            ctx.strokeStyle = rgba(col, al * k); ctx.lineWidth = w; ctx.stroke();
          }
          for (let i = 0, n = Math.floor(L / 60); i < n; i++) { const d = i * 60 + hash(i, seed) * 40, sd = i % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(x0 + ca * d, y0 + sa * d); ctx.lineTo(x0 + ca * (d + 14) - sa * sd * 14, y0 + sa * (d + 14) + ca * sd * 14); ctx.strokeStyle = rgba('#e8f6ff', 0.5 * k); ctx.lineWidth = 1.2; ctx.stroke(); }
          ctx.restore();
        }, id);
        break;
      }
      case 'cvSweep': {
        const b = env.boss, side = b && Math.sin(s.angle - (b.f || 0)) < 0 ? -1 : 1, a0 = s.angle - side * s.arc / 2, a1 = s.angle + side * s.arc / 2, cx = s.x, cy = s.y;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          ctx.save(); ctx.lineCap = 'round';
          for (let j = 0; j < 12; j++) {
            const r = 150 + j * 72, u0 = hash(j, seed) * 0.3, u1 = 0.55 + hash(j, seed + 1) * 0.45;
            ctx.beginPath(); ctx.arc(cx, cy, r, a0 + (a1 - a0) * u0, a0 + (a1 - a0) * u1, a1 < a0);
            ctx.strokeStyle = rgba('#0a1830', 0.3 * k); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = rgba('#e8f0fa', 0.55 * k); ctx.lineWidth = 2.2; ctx.stroke();
          }
          ctx.restore();
        }, id);
        break;
      }
      case 'cvBreath':
        mark(T.short, { x: s.x, y: s.y, r: s.r }, (ctx, q, k, age, seed) => {
          for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + hash(i, seed) * 0.3, r = q.r * (0.5 + 0.5 * hash(i, seed + 1)), px = q.x + Math.cos(a) * r, py = q.y + Math.sin(a) * r * 0.85; ellipse(ctx, px, py, 14 + 14 * hash(i, seed + 2), 7 + 6 * hash(i, seed + 3), a, rgba('#e8f2fc', 0.28 * k)); }
          crackStar(ctx, q.x, q.y, q.r * 0.7, 6, seed, k * 0.8, { w: 1.4 });
        }, id);
        break;
      case 'cvCrane': case 'cvCrane2': {
        const a0 = s.angle - s.arc / 2, a1 = s.angle + s.arc / 2, cx = s.x, cy = s.y, R = Math.min(s.r, 1100);
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          // the fan scarred into the snow: ribs and the arcs between them, shattered ice along the rim
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i <= 8; i++) { const an = a0 + (a1 - a0) * i / 8; crackLine(ctx, cx + Math.cos(an) * 80, cy + Math.sin(an) * 80, cx + Math.cos(an) * R, cy + Math.sin(an) * R, seed + i, k * 0.7, { w: 1.5, jag: 7, seg: 30 }); }
          for (const rr of [420, 700, 980]) if (rr < R) { ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.strokeStyle = rgba(C.deep, 0.3 * k); ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = rgba('#dff2ff', 0.55 * k); ctx.lineWidth = 1.8; ctx.stroke(); }
          for (let i = 0; i < 26; i++) { const an = a0 + (a1 - a0) * hash(i, seed), rr = 300 + hash(i, seed + 1) * (R - 340), px = cx + Math.cos(an) * rr, py = cy + Math.sin(an) * rr; poly(ctx, [px - 6, py + 3, px - 1, py - 8, px + 6, py + 2], rgba('#dff4ff', 0.55 * k), rgba(C.deep, 0.4 * k), 1); }
          ctx.restore();
        }, id);
        break;
      }
      case 'cvComet': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, wall(s.x, s.y, s.angle)), x0 = s.x, y0 = s.y;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          // broken blocks of ice and packed snow along the line he ran
          for (let i = 0, n = Math.floor(L / 34); i < n; i++) {
            const d = 60 + i * 34 + hash(i, seed) * 10, off = (hash(i, seed + 1) - 0.5) * 30, px = x0 + ca * d - sa * off, py = y0 + sa * d + ca * off, w = 16 + 14 * hash(i, seed + 2);
            ctx.save(); ctx.translate(px, py); ctx.rotate(s.angle + (hash(i, seed + 3) - 0.5) * 0.9);
            rrect(ctx, -w / 2, -w * 0.35, w, w * 0.7, 2, rgba('#2a4064', 0.8 * k), rgba('#f0f8ff', 0.9 * k), 1.6); ctx.restore();
          }
        }, id);
        break;
      }
      case 'cvPart': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, x0 = s.x, y0 = s.y;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [off, col, w, al] of [[0, '#04101c', 11, 0.75], [-9, '#dfe8f4', 2, 0.5], [9, '#dfe8f4', 2, 0.5], [0, '#cfe0ff', 1.4, 0.5]]) {
            ctx.beginPath(); zigPath(ctx, x0 - sa * off, y0 + ca * off, x0 + ca * L - sa * off, y0 + sa * L + ca * off, seed + off, 2.5, 30);
            ctx.strokeStyle = rgba(col, al * k); ctx.lineWidth = w; ctx.stroke();
          }
          for (const d of [0, L]) glow(ctx, x0 + ca * d, y0 + sa * d, 24, '#dfeaff', 0.25 * k);
          ctx.restore();
        }, id);
        break;
      }
      case 'cvGale':
        mark(T.short, {}, (ctx, q, k, age, seed) => {
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 16; i++) { const y = -400 + hash(i, seed) * 800, x0 = -560 + hash(i, seed + 1) * 700, L = 160 + hash(i, seed + 2) * 360; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + L, y + L * 0.04); ctx.strokeStyle = rgba('#eef6ff', 0.3 * k); ctx.lineWidth = 3 + hash(i, seed + 3) * 4; ctx.stroke(); }
          ctx.restore();
        }, id);
        break;
    }
  }

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // H: the shared helpers boss-vfx.js owns (shapeFlash, shockAt, scatter, after, shake, roomTint, sweep, streak, bang, AFT, coverShadows, clipOut, AR)
  const IMP = {};
  const dist2line = (u, s) => { const ca = Math.cos(s.angle), sa = Math.sin(s.angle), dx = u.x - s.x, dy = u.y - s.y, al = dx * ca + dy * sa, off = Math.abs(-dx * sa + dy * ca); return { al, off }; };

  // Sundering Cut: a blade of light comes down on the tank, the guard bursts into ice. Cracked Guard is the heavier second blow.
  IMP.buster = (tg, ctx, H) => {
    const s = tg.live, e = tg.target != null ? ctx.entById(tg.target) : null, x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
    const second = S.cutAt > -90 && nowS() - S.cutAt < 9;
    S.guard = second; S.cutAt = second ? -99 : nowS();
    H.shapeFlash(s, '#cfeeff', { a: 0.26, dur: 0.5 });
    // the blade of light, down out of the dark
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, o) => {
      const q = easeOut(clamp(p / 0.12, 0, 1)), k = o.a * Math.min(1, (1 - p) / 0.5);
      c.save(); c.lineCap = 'round';
      VFX.neonPath(c, '#8fe0ff', (second ? 22 : 16) * (1 - p * 0.5), k, () => { c.moveTo(x + 40 * (1 - q), y - 700 * q + 10); c.lineTo(x, y - 6); });
      c.restore();
    } });
    VFX.hit(x, y, '#bfe8ff', second ? 2.8 : 2.2);
    H.bang(x, y, second ? 130 : 100, { n: 13, color: '#8fe0ff', core: '#ffffff', ink: '#06182a' });
    VFX.crystals(x, y, { r: second ? 70 : 52, n: second ? 12 : 8, h: second ? 76 : 60, color: '#cfeeff', dur: 1.1 });
    H.shockAt(x, y, { r: second ? 190 : 140, color: '#bfe8ff', w: 7, flat: 1 });
    VFX.sparks(x, y, { color: '#eaf8ff', n: second ? 18 : 12, speed: 380 });
    flurry(x, y, second ? 16 : 8);
    if (second) {
      // the guard itself: shards of it thrown off
      for (let i = 0; i < 10; i++) { const a = rand(0, TAU), sp = rand(120, 300); VFX.spawn({ x, y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(80, 220), g: 520, life: 0.8, size: 12, color: i % 2 ? '#dff4ff' : '#8a96a8', kind: 'shard', add: false, vr: rand(-12, 12) }); }
      H.shockAt(x, y, { r: 260, color: '#eaf8ff', w: 4, dur: 0.6, flat: 1, delay: 0.08 });
    }
    VFX.debris(x, y, { color: '#cfe0f0', n: 8, speed: 1.1 });
    H.shake(second ? 12 : 8);
    cam(second ? 0.1 : 0.06, second ? 0.032 : 0.022, 0.45, 1.2);
  };

  // Draw Cut: the hair of light becomes a white cut along the whole line; snow thrown up off it
  IMP.cvDraw = (tg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, wall(s.x, s.y, s.angle));
    H.streak(s.x, s.y, s.angle, '#8fe0ff', { len: L, w: 15, dur: 0.4 });
    H.streak(s.x, s.y, s.angle, '#ffffff', { len: L, w: 5, dur: 0.3 });
    H.shapeFlash(s, '#cfeeff', { a: 0.22, dur: 0.45 });
    for (let d = 90, i = 0; d < L; d += 85, i++) H.after(d / L * 0.14, () => { VFX.smoke(s.x + ca * d, s.y + sa * d, { n: 1, color: '#eaf2fa', size: 30, a: 0.5, speed: 90 }); if (i % 2) VFX.sparks(s.x + ca * d, s.y + sa * d, { color: '#eaf8ff', n: 3, speed: 240 }); });
    for (const u of ctx.units || []) { const q = dist2line(u, s); if (q.al > 0 && q.al < L && q.off < s.w / 2 + 8) { VFX.hit(u.x, u.y, '#bfe8ff', 1.8); VFX.crystals(u.x, u.y, { r: 26, n: 5, h: 46, color: '#cfeeff', dur: 0.8 }); flurry(u.x, u.y, 6); } }
    // the draw itself: a crescent of the blade at his hand, the silver figure left standing along the cut, a ring where it ends
    VFX.slash(s.x, s.y - 26, s.angle, { r: 120, span: 2.2, color: C.frost, core: '#ffffff', dur: 0.36, sparks: 5 });
    ghostTrail(s.x, s.y, s.angle, L, 4);
    H.shockAt(s.x + ca * L, s.y + sa * L, { r: 120, color: '#dff4ff', w: 5, dur: 0.45, flat: 1 });
    H.shake(6);
    cam(0.04, 0.02, 0.35, 1.2);
  };

  // Scabbard Sweep: a great wheel of snow thrown round the room
  IMP.cvSweep = (tg, ctx, H) => {
    const s = tg.live, b = ctx.bossDraw, side = b && Math.sin(s.angle - (b.f || 0)) < 0 ? -1 : 1, a0 = s.angle - side * s.arc / 2, a1 = s.angle + side * s.arc / 2;
    H.shapeFlash(s, '#dff0ff', { a: 0.25, dur: 0.55 });
    VFX.fx({ dur: 0.85, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.6, 0, 1)), k = e.a * (1 - clamp((p - 0.35) / 0.65, 0, 1));
      c.save(); clipRoom(c); c.lineCap = 'round';
      for (let j = 0; j < 16; j++) {
        const r = 120 + j * 62, lead = a0 + (a1 - a0) * clamp(q * (1.15 - hash(j, 3) * 0.3), 0, 1), tail = lead - (a1 - a0) * (0.16 + 0.26 * hash(j, 4));
        const lo = Math.min(lead, tail), hi = Math.max(lead, tail);
        c.beginPath(); c.arc(s.x, s.y, r, lo, hi); c.strokeStyle = rgba('#8fc8f0', 0.35 * k); c.lineWidth = 18; c.stroke();
        c.strokeStyle = rgba('#ffffff', 0.8 * k * (0.5 + 0.5 * hash(j, 5))); c.lineWidth = 4.4; c.stroke();
      }
      c.restore();
    } });
    for (const q of H.scatter(s, 16)) H.after(rand(0, 0.35), () => { VFX.smoke(q.x, q.y, { n: 1, color: '#eef6ff', size: 42, a: 0.55, speed: 150 }); if (Math.random() < 0.5) VFX.sparks(q.x, q.y, { color: '#eaf8ff', n: 2, speed: 200 }); });
    // the scabbard's own crescent follows the wheel of snow round
    VFX.slash(s.x, s.y - 22, s.angle, { r: 150, span: Math.min(2.8, s.arc * 0.9), color: '#dff0ff', core: '#ffffff', dur: 0.42, sparks: 6, flip: side > 0 });
    H.shake(9);
    cam(0.05, 0.026, 0.4, 2);
  };

  // White Gale: the blizzard breaks across the room from one side
  IMP.cvGale = (tg, ctx, H) => {
    H.roomTint('#cfe4ff', 0.28, 0.9);
    const W = (ARENA.hw || AR()) + 60, Hh = (ARENA.hh || AR()) + 60, span = W * 2 + 500;
    VFX.fx({ dur: 1.3, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.4);
      c.save(); clipRoom(c); c.lineCap = 'round';
      for (let i = 0; i < 60; i++) {
        const y = -Hh + hash(i, 21) * Hh * 2, len = 120 + 360 * hash(i, 22), x = -W - 200 + ((hash(i, 23) * span * 0.4 + t * (1400 + 900 * hash(i, 24))) % span);
        c.beginPath(); c.moveTo(x - len, y - len * 0.04); c.lineTo(x, y); c.strokeStyle = rgba(i % 3 ? '#eaf6ff' : '#ffffff', 0.5 * k * (0.4 + 0.6 * hash(i, 25))); c.lineWidth = 1.5 + hash(i, 26) * 3; c.stroke();
      }
      c.restore();
    } });
    H.shake(8);
  };

  // Hollow Breath: the cold lets go; ice bites up where the healer stood
  IMP.cvBreath = (tg, ctx, H) => {
    const s = tg.live;
    H.shapeFlash(s, '#e8f4ff', { a: 0.22, dur: 0.4 });
    VFX.smoke(s.x, s.y, { n: 5, color: '#e8f2fa', size: 44, a: 0.5, speed: 100, r: s.r * 0.5 });
    VFX.crystals(s.x, s.y, { r: s.r * 0.85, n: 6, h: 46, color: '#cfeeff', dur: 0.8 });
    H.shockAt(s.x, s.y, { r: s.r * 1.1, color: '#cfe8ff', w: 5, dur: 0.45, flat: 1 });
    H.shake(2);
  };

  // Rising Crane: a bright fan sweeps out through the cone and ice stands up along it; the second landing holds the camera a beat
  IMP.cvCrane = (tg, ctx, H) => {
    const s = tg.live, second = tg.tag === 'cvCrane2', R = Math.min(s.r, AR() * 1.6), a0 = s.angle - s.arc / 2, a1 = s.angle + s.arc / 2;
    H.shapeFlash(s, '#bfeaff', { a: 0.3, dur: 0.55 });
    VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.45, 0, 1)), r = 80 + (R - 80) * q, k = e.a * (1 - clamp((p - 0.3) / 0.7, 0, 1));
      c.save(); clipRoom(c); c.lineCap = 'round';
      for (const [w, col, al] of [[34, '#6fc8f0', 0.35], [14, '#dff4ff', 0.7], [4, '#ffffff', 0.95]]) { c.beginPath(); c.arc(s.x, s.y, r, a0, a1); c.lineWidth = w * (1 - p * 0.4); c.strokeStyle = rgba(col, al * k); c.stroke(); }
      for (let i = 0; i < 9; i++) { const an = a0 + (a1 - a0) * (i + 0.5) / 9; c.beginPath(); c.moveTo(s.x + Math.cos(an) * r * 0.25, s.y + Math.sin(an) * r * 0.25); c.lineTo(s.x + Math.cos(an) * r, s.y + Math.sin(an) * r); c.strokeStyle = rgba('#eaf8ff', 0.35 * k); c.lineWidth = 2; c.stroke(); }
      c.restore();
    } });
    for (const q of H.scatter(s, 9)) H.after(rand(0, 0.35), () => { VFX.crystals(q.x, q.y, { r: 22, n: 3, h: 46, color: '#cfeeff', dur: 0.7 }); VFX.sparks(q.x, q.y, { color: '#eaf8ff', n: 3, speed: 240 }); });
    H.shake(second ? 13 : 9);
    if (second) cam(0.1, 0.035, 0.5, 1); else cam(0.04, 0.022, 0.4, 1.2);
    // the blade comes back across the room along the fan's own centre
    VFX.slash(s.x, s.y - 26, s.angle, { r: 170, span: 2.6, color: '#cfeeff', core: '#ffffff', dur: 0.4, sparks: 6, flip: second });
  };
  IMP.cvCrane2 = IMP.cvCrane;

  // Comet Draw: a streak of white light along the lane (a lantern's shadow left alone), ice bursting where he stops at the wall
  IMP.cvComet = (tg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, wall(s.x, s.y, s.angle)), ex = s.x + ca * L, ey = s.y + sa * L;
    const src = tg.cover || [s.x, s.y], sh = H.coverShadows(src[0], src[1], ctx && ctx.props);
    VFX.fx({ dur: 0.75, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p);
      c.save(); clipRoom(c); H.clipOut(c, sh);
      c.translate(s.x, s.y); c.rotate(s.angle);
      const g = c.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba('#ffffff', 0.7 * k)); g.addColorStop(1, rgba('#8fe0ff', 0.4 * k));
      c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(0, -s.w * 0.4, L, s.w * 0.8);
      c.globalCompositeOperation = 'source-over'; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(L, 0); c.strokeStyle = rgba('#ffffff', 0.95 * k); c.lineWidth = 7 * (1 - p * 0.5); c.stroke();
      c.restore();
    } });
    for (let d = 100, i = 0; d < L; d += 70, i++) H.after(d / L * 0.16, () => { if (!sh.some(poly => inPoly(poly, s.x + ca * d, s.y + sa * d))) VFX.sparks(s.x + ca * d, s.y + sa * d, { color: '#eaf8ff', n: 2, speed: 220 }); });
    for (const u of ctx.units || []) { const q = dist2line(u, s); if (q.al > 0 && q.al < L && q.off < s.w / 2 + 6 && !sh.some(poly => inPoly(poly, u.x, u.y))) { VFX.hit(u.x, u.y, '#bfe8ff', 2); VFX.crystals(u.x, u.y, { r: 28, n: 5, h: 50, color: '#cfeeff', dur: 0.8 }); flurry(u.x, u.y, 8); } }
    // where he comes to rest at the wall
    VFX.hit(ex, ey, '#dff4ff', 1.8);
    VFX.crystals(ex, ey, { r: 46, n: 8, h: 60, color: '#cfeeff', dur: 1.0 });
    H.shockAt(ex, ey, { r: 170, color: '#dff4ff', w: 6, dur: 0.5, flat: 1 });
    flurry(ex, ey, 12, { speed: 220 });
    ghostTrail(s.x, s.y, s.angle, L, 5);
    H.shake(10);
    cam(0.1, 0.035, 0.5, 0.9);
  };

  // Hundredfold Parting: each line of the zigzag lights white at once; silver sparks where the slash passes through an image
  IMP.cvPart = (tg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), ex = s.x + ca * s.len, ey = s.y + sa * s.len;
    H.streak(s.x, s.y, s.angle, '#c8d4e4', { len: s.len, w: 13, dur: 0.38 });
    H.streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 4, dur: 0.3 });
    H.shapeFlash(s, '#e8eeff', { a: 0.2, dur: 0.4 });
    VFX.sparks(ex, ey, { color: '#eef4ff', n: 10, speed: 360 });
    VFX.hit(ex, ey, '#dfe8ff', 1.2);
    flurry(ex, ey, 6, { speed: 160 });
    for (const u of ctx.units || []) { const q = dist2line(u, s); if (q.al > 0 && q.al < s.len && q.off < s.w / 2 + 6) VFX.hit(u.x, u.y, '#dfe8ff', 1.4); }
    ghostTrail(s.x, s.y, s.angle, s.len, Math.max(2, Math.min(4, Math.round(s.len / 220))));
    VFX.slash(ex, ey - 20, s.angle + Math.PI, { r: 80, span: 1.8, color: C.silver, core: '#ffffff', dur: 0.3, sparks: 3 });
    H.shake(5);
    cam(0.1, 0.03, 0.5, 1.2);
  };

  // Cold Sheathe: the blade goes home; a ring of cold goes out from him across the pass
  IMP.cvSheathe = (tg, ctx, H) => {
    const b = ctx.bossDraw || { x: 0, y: 0 };
    H.roomTint('#eaf6ff', 0.22, 0.8);
    for (let i = 0; i < 3; i++) H.shockAt(b.x, b.y, { r: H.AR * 1.2, color: i ? '#cfeeff' : '#ffffff', w: 10 - i * 3, dur: 0.7 + i * 0.12, flat: 1, delay: i * 0.1 });
    flurry(b.x, b.y, 18, { speed: 260 });
    // the blade home: one thin white line across the whole pass, there and gone
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => horizonCut(c, 0.5, t, e.a * (1 - p) * (1 - p) * Math.min(1, p / 0.08), 1) });
    try { if (typeof FX !== 'undefined' && FX.cam) FX.cam.flash('#eaf6ff', 0.14, 0.25); } catch (err) { /* cosmetic */ }
    H.shake(7);
    cam(0.06, 0.024, 0.45, 1.5);
  };

  // ---------------------------------------------------------------- the whiff (a blow that just missed a hero)
  // A hero who stood within a stride of a blow's edge, and was not hit, feels the blade go by: a bright sliver of the edge drawn past
  // them, torn strands of snow-cloth thrown off, a ring at their feet; for your own hero a flash at the screen's rim, a push of the
  // camera, a held breath and a soft whoosh. Only ever drawn for a hero the blow did not take and was close to, so it is a reward for
  // a dodge, never a hint of where is safe.
  const NEAR = 80;
  const WHIFF = new Set(['cvDraw', 'cvComet', 'cvCrane', 'cvCrane2', 'cvSweep', 'cvPart']);
  const isMe = u => typeof Net !== 'undefined' && Net && u.id === Net.id;
  // a whole-screen layer: fn(c, W, H, t, p, e) each frame in screen space
  function screenFx(dur, fn) {
    return VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); fn(c, c.canvas.width, c.canvas.height, t, p, e); c.restore(); } });
  }
  // where the edge of a blow lies from a hero it just missed: gap (px between them), dir (the way the edge runs), away (from the blow to them)
  function edgeOf(s, u) {
    if (s.kind === 'rect') {
      const c = Math.cos(s.angle), sn = Math.sin(s.angle), across = -(u.x - s.x) * sn + (u.y - s.y) * c, sg = across >= 0 ? 1 : -1;
      return { gap: Math.max(14, Math.abs(across) - s.w / 2), dir: { x: c, y: sn }, away: { x: -sn * sg, y: c * sg } };
    }
    const dx = u.x - s.x, dy = u.y - s.y, d = Math.hypot(dx, dy) || 1, h = Math.atan2(dy, dx);
    const rel = Math.atan2(Math.sin(h - s.angle), Math.cos(h - s.angle)), sg = rel >= 0 ? 1 : -1;
    return { gap: Math.max(14, (Math.abs(rel) - s.arc / 2) * d), dir: { x: dx / d, y: dy / d }, away: { x: -Math.sin(h) * sg, y: Math.cos(h) * sg } };
  }
  function whiff(u, s, tag, mine) {
    const e = edgeOf(s, u), col = tag === 'cvPart' ? C.silverHi : tag === 'cvComet' ? C.white : C.frost, back = Math.min(e.gap, 58);
    const gx = u.x - e.away.x * back, gy = u.y - e.away.y * back - 16, dx = e.dir.x, dy = e.dir.y;
    VFX.fx({ dur: 0.36, layer: 'air', draw: (c, p, t, q) => {
      const k = q.a * (1 - p) * (1 - p), L = 44 + 84 * easeOut(Math.min(1, p / 0.45)), sh = (p - 0.15) * 80;   // (the edge, and the last inch of it running on past)
      c.save(); c.lineCap = 'round';
      VFX.neonPath(c, col, 5.5 * (1 - p * 0.6), k, () => { c.moveTo(gx + dx * (sh - L), gy + dy * (sh - L)); c.lineTo(gx + dx * (sh + L), gy + dy * (sh + L)); });
      VFX.neonPath(c, '#ffffff', 1.8, k * 0.9, () => { c.moveTo(gx + dx * (sh - L * 0.5), gy + dy * (sh - L * 0.5)); c.lineTo(gx + dx * (sh + L * 0.5), gy + dy * (sh + L * 0.5)); });
      // the air torn after the edge: a fainter line set back from it that comes late
      const k2 = k * clamp((p - 0.12) / 0.3, 0, 1) * 0.6;
      c.beginPath(); c.moveTo(gx - e.away.x * 16 + dx * (sh - L * 0.7), gy - e.away.y * 16 + dy * (sh - L * 0.7)); c.lineTo(gx - e.away.x * 16 + dx * (sh + L * 0.3), gy - e.away.y * 16 + dy * (sh + L * 0.3));
      c.strokeStyle = rgba(C.ice, k2); c.lineWidth = 1.4; c.stroke();
      c.restore();
    } });
    VFX.shock(u.x, u.y + 6, { r: 66, color: col, w: 3, dur: 0.34, flat: 0.6 });
    VFX.sparks(u.x - e.away.x * 16, u.y - 12, { color: '#eef8ff', n: mine ? 12 : 7, speed: 300, angle: Math.atan2(e.away.y, e.away.x), spread: 0.9, up: 80, life: 0.9 });
    // strands of cloak and scarf the blade cut free as it went by
    for (let i = 0; i < (mine ? 6 : 3); i++) {
      const sp = rand(120, 260);
      VFX.spawn({ x: u.x, y: u.y, z: rand(26, 54), vx: (e.away.x * 0.7 + rand(-0.4, 0.4)) * sp, vy: (e.away.y * 0.7 + rand(-0.4, 0.4)) * sp * 0.7, vz: rand(40, 150), g: 420, drag: 0.02, life: 0.8, size: 9, color: i % 2 ? '#dff4ff' : '#8a96a8', kind: 'shard', add: false, vr: rand(-12, 12) });
    }
    flurry(u.x - e.away.x * 10, u.y, mine ? 8 : 4, { speed: 140, size: 0.8 });
    if (mine) {
      try {
        if (typeof FX !== 'undefined' && FX.cam) {
          FX.cam.flash(col, 0.1, 0.2); FX.cam.punch(0.02, 0.34);
          const tn = nowS(); if (tn - S.stopAt > 1.2) { S.stopAt = tn; FX.cam.stop(0.04); }   // (a held breath, not every time)
        }
        if (typeof Sound !== 'undefined' && Sound.play) Sound.play('dash', { vol: 0.3, key: 'cv-whiff', minGap: 0.3 });
      } catch (err) { /* cosmetic */ }
      screenFx(0.5, (c, W, Hh, t, p, q) => {
        const k = (1 - p) * (1 - p) * q.a; c.globalCompositeOperation = 'screen';
        const g = c.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.38, W / 2, Hh / 2, Math.hypot(W, Hh) * 0.55); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.3 * k));
        c.fillStyle = g; c.fillRect(0, 0, W, Hh);
      });
    }
  }
  function whiffs(tg, msg, ctx) {
    if (!ctx || !ctx.units || !msg || !WHIFF.has(tg.tag)) return;
    const s = tg.live, hits = msg.hits || [], t = nowS();
    for (const u of ctx.units) {
      if (hits.includes(u.id)) continue;
      if (t - (S.whiffAt.get(u.id) || -9) < 0.7) continue;
      if (SHAPES.contains(s, u.x, u.y)) continue;   // inside and not hit: sheltered, not a dodge
      if (!SHAPES.contains(s, u.x, u.y, NEAR)) continue;
      S.whiffAt.set(u.id, t);
      whiff(u, s, tg.tag, isMe(u));
    }
  }
  // silver copies of him standing along a cut, each coming apart in turn (the figure that drew it)
  function ghostTrail(x, y, ang, L, n) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    VFX.fx({ dur: 0.85, layer: 'air', draw: (c, p, t, e) => {
      c.save(); clipRoom(c);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.7) / (n + 0.4), q = clamp((p - u * 0.3) / 0.5, 0, 1); if (q <= 0 || q >= 1) continue;
        ghostFig(c, x + ca * L * u, y + sa * L * u + 22 * q, ang, (1 - q) * Math.min(1, q * 6) * e.a);
      }
      c.restore();
    } });
  }

  // ---------------------------------------------------------------- the gathering while he casts (boss-vfx.js castStart() asks)
  // what each stance and move looks like as it is drawn: the stance reads on the blade before any floor is painted. The shared ring
  // and glow stay under all of it. H: { drawIn, emit, beat, soon, own } from boss-vfx.js.
  const stanceNow = () => { const ev = typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.ev && ArenaView.liveRoom.ev.whet; return ev ? ev.st || null : null; };
  function cast(sh, b, dur, anim, name, H) {
    const own = e => H.own(sh, e), bx = () => b.x, by = () => b.y;
    if (anim === 'stance') {
      const st = stanceNow(), flip = name === 'False Stance', over = name === 'Overwhet';
      // the whetstone: sparks rubbed off the edge, quicker as it nears
      H.beat(sh, dur, over ? 0.14 : 0.2, () => { VFX.sparks(bx() + rand(-22, 22), by() - rand(34, 86), { color: '#eaf8ff', n: 3, speed: 180, up: 70 }); });
      if (st === 'crane') {
        // blade low and back: a folding fan of cold light opens behind his shoulder
        own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
          const k = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.94) / 0.06, 0, 1)), open = easeOut(clamp(p / 0.85, 0, 1)), cx = bx(), cy = by() - 64, len = 110 + 100 * easeOut(p);
          c.save(); c.lineCap = 'round';
          glow(c, cx, cy, 60 + 50 * p, C.ice, 0.16 * k);
          for (let i = 0; i < 8; i += 2) { const a0 = -Math.PI / 2 - 1.0 * open + 2.0 * open * (i / 8), a1 = a0 + 2.0 * open / 8; c.beginPath(); c.moveTo(cx, cy); c.ellipse(cx, cy, len, len * 0.8, 0, a0, a1); c.closePath(); c.fillStyle = rgba(C.ice, (0.05 + 0.1 * p) * k); c.fill(); }
          for (let i = 0; i < 9; i++) {
            const an = -Math.PI / 2 - 1.0 * open + 2.0 * open * (i / 8), ca = Math.cos(an), sa = Math.sin(an);
            c.beginPath(); c.moveTo(cx + ca * 24, cy + sa * 20); c.lineTo(cx + ca * len, cy + sa * len * 0.8);
            c.strokeStyle = rgba(C.deep, 0.35 * k); c.lineWidth = (i % 2 ? 1.6 : 3) + 2.5; c.stroke();
            c.strokeStyle = rgba(i % 2 ? C.ice : C.white, (0.35 + 0.55 * p) * k); c.lineWidth = i % 2 ? 1.6 : 3; c.stroke();
          }
          c.beginPath(); c.ellipse(cx, cy, len, len * 0.8, 0, -Math.PI / 2 - 1.0 * open, -Math.PI / 2 + 1.0 * open); c.strokeStyle = rgba(C.white, (0.2 + 0.5 * p) * k); c.lineWidth = 2; c.stroke();
          c.restore();
        } }));
        H.drawIn(sh, dur, () => ({ x: bx() - 14, y: by() - 30 }), { color: C.frost, color2: '#ffffff', r: 90, z: 16, rate: 0.5 });
      } else if (st === 'comet') {
        // blade raised high: a lance of white light climbs the sky above him, chevrons running up it
        own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
          const k = e.a * Math.min(1, p / 0.15) * (1 - clamp((p - 0.94) / 0.06, 0, 1)), h = 40 + 330 * easeOut(clamp(p / 0.9, 0, 1)), cx = bx(), base = by() - 70, w = 7 + 9 * p;
          c.save();
          const g = c.createLinearGradient(cx, base, cx, base - h); g.addColorStop(0, rgba(C.white, 0.7 * k)); g.addColorStop(1, rgba(C.frost, 0));
          c.fillStyle = g; c.fillRect(cx - w, base - h, w * 2, h);
          c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, base); c.lineTo(cx, base - h); c.strokeStyle = rgba('#ffffff', (0.5 + 0.5 * p) * k); c.lineWidth = 2.4; c.stroke();
          for (let i = 0; i < 5; i++) { const y = base - ((t * (160 + 200 * p) + i * h / 5) % h), f2 = 1 - (base - y) / h; c.beginPath(); c.moveTo(cx - 14, y + 12); c.lineTo(cx, y); c.lineTo(cx + 14, y + 12); c.strokeStyle = rgba(C.ice, 0.6 * f2 * k); c.lineWidth = 1.8; c.stroke(); }
          glow(c, cx, base - h, 30 + 40 * p, C.white, (0.2 + 0.4 * p) * k);
          c.restore();
        } }));
        H.drawIn(sh, dur, () => ({ x: bx(), y: by() - 100 }), { color: C.white, color2: C.frost, r: 80, z: 40, rate: 0.5 });
      } else if (st === 'parting') {
        // blade planted in the snow: silver rings run out across it, and the figures he will leave stand up at the edges, faint
        own(VFX.fx({ dur: dur + 0.2, layer: 'ground', draw: (c, p, t, e) => {
          const k = e.a * Math.min(1, p / 0.15) * (1 - clamp((p - 0.94) / 0.06, 0, 1));
          c.save();
          for (let i = 0; i < 3; i++) { const q = (p * 1.6 + i / 3) % 1; ellipse(c, bx(), by() + 10, 40 + q * 230, (40 + q * 230) * 0.8, 0, null, rgba(C.silverHi, (1 - q) * (0.2 + 0.5 * p) * k), 1.8); }
          c.restore();
        } }));
        own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
          const a = clamp((p - 0.35) / 0.4, 0, 1) * (1 - clamp((p - 0.94) / 0.06, 0, 1)) * e.a; if (a <= 0.02) return;
          c.save(); clipRoom(c);
          [[-1, 1], [1, 1], [0, -1]].forEach(([sx, sy], i) => ghostFig(c, bx() + sx * 150, by() + 30 + (sy < 0 ? -140 : 0), Math.atan2(-sy * 30, -sx * 150), a * 0.75 * (0.8 + 0.2 * Math.sin(t * 5 + i)), { t }));
          c.restore();
        } }));
      }
      if (flip) {
        // False Stance: the figure comes apart in two, the old stance shearing off him
        own(VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
          const a = Math.abs(Math.sin(t * 17)) * (1 - p * 0.5) * e.a * 0.7;
          c.save(); clipRoom(c);
          ghostFig(c, bx() + Math.sin(t * 29) * 26, by() + 2, b.f || 0, a, { t });
          c.restore();
        } }));
        H.soon(sh, 0.02, () => { VFX.shock(bx(), by() + 8, { r: 130, color: C.frost, w: 3, dur: 0.4, flat: 1 }); });
      }
      if (over) {
        // Overwhet: a second ring of sparks as the edge is run along the stone again
        H.beat(sh, dur, 0.28, () => { VFX.shock(bx(), by() + 8, { r: 100, color: '#ffffff', w: 2, dur: 0.35, flat: 1 }); });
      }
    } else if (anim === 'draw') {
      // iaido: the hand settles on the hilt, a hair of light at the mouth of the scabbard, and the click as it leaves
      own(VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.2), hx = bx() + 12, hy = by() - 50;
        glow(c, hx, hy, 16 + 22 * p, C.white, (0.12 + 0.5 * p * p) * k * (0.85 + 0.15 * Math.sin(t * 22)));
        c.save(); c.lineCap = 'round'; c.beginPath(); c.moveTo(hx - 4, hy + 2); c.lineTo(hx + 8 + 36 * p * p, hy - 2 - 10 * p * p); c.strokeStyle = rgba('#ffffff', (0.3 + 0.6 * p) * k); c.lineWidth = 1.4 + p; c.stroke(); c.restore();
      } }));
      H.drawIn(sh, dur, () => ({ x: bx() + 12, y: by() - 50 }), { color: C.ice, r: 54, z: 0, rate: 0.35, glow: false });
      H.soon(sh, Math.max(0.05, dur - 0.1), () => { VFX.flash(bx() + 14, by() - 52, 54, '#ffffff', 0.18); VFX.sparks(bx() + 14, by() - 52, { color: '#ffffff', n: 8, speed: 300, up: 40 }); });
    } else if (anim === 'cut' || anim === 'guard') {
      // the blade is lifted over the head and a long vertical of light gathers along it
      own(VFX.fx({ dur: dur + 0.1, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.95) / 0.05, 0, 1)), cx = bx(), top = by() - 120 - 190 * easeOut(p);
        c.save(); c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx + 6, by() - 96); c.lineTo(cx + 6, top); c.strokeStyle = rgba(C.frost, (0.2 + 0.3 * p) * k); c.lineWidth = anim === 'guard' ? 14 : 10; c.stroke();
        c.strokeStyle = rgba('#ffffff', (0.4 + 0.5 * p) * k); c.lineWidth = anim === 'guard' ? 3.6 : 2.6; c.stroke();
        glow(c, cx + 6, top, 24 + 26 * p, C.white, (0.2 + 0.4 * p) * k);
        c.restore();
      } }));
    } else if (anim === 'comet') {
      // he sets his weight: the wind pulls in along the snow toward his feet, then lets go
      H.emit(sh, dur, 0.9, (p) => { const a = rand(0, TAU), r = rand(150, 330) * (1 - p * 0.4); VFX.spawn({ x: bx() + Math.cos(a) * r, y: by() + 10 + Math.sin(a) * r * 0.5, z: 6, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 0.8, life: 0.55, size: 6, size1: 2, color: '#eaf6ff', kind: 'glow' }); });
      H.soon(sh, Math.max(0.05, dur - 0.15), () => { VFX.flash(bx(), by() - 40, 90, '#ffffff', 0.2); VFX.shock(bx(), by() + 8, { r: 160, color: '#ffffff', w: 4, dur: 0.35, flat: 1 }); });
    } else if (anim === 'kneel') {
      // frost spreading out across the snow from the kneeling figure, the cracks finding the lanterns
      const big = name === 'The Last Vigil', R = big ? 330 : 200;
      own(VFX.fx({ dur: dur + (big ? 1.2 : 0.6), layer: 'ground', draw: (c, p, t, e) => {
        const grow = easeOut(clamp(p / 0.7, 0, 1)), k = e.a * (1 - clamp((p - 0.75) / 0.25, 0, 1));
        c.save(); ARENA.trace(c, 2); c.clip();
        crackStar(c, bx(), by() + 6, R * grow, big ? 16 : 11, 61, 0.7 * k, { w: 1.8, jag: 7 });
        ellipse(c, bx(), by() + 8, R * grow * 0.9, R * grow * 0.72, 0, rgba(C.ice, 0.06 * k), rgba(C.white, 0.5 * k), 2);
        c.restore();
      } }));
    } else if (anim === 'still') {
      // glass forming: little rings of cold running out from his feet
      H.beat(sh, dur, 0.4, () => { VFX.shock(bx() + rand(-30, 30), by() + 12, { r: 110, color: '#cfeeff', w: 3, dur: 0.5, flat: 1 }); VFX.crystals(bx() + rand(-70, 70), by() + rand(30, 110), { r: 16, n: 2, h: 30, color: '#cfeeff', dur: 0.6 }); });
    }
  }

  // ---------------------------------------------------------------- the blade sharpening (roomOver sees the gauge change)
  // a notch added: the edge flares where he stands; a full blade is a bigger flare and a ring running out
  function notchFx(b, n, full) {
    const x = b.x, y = b.y - 66;
    VFX.flash(x + 10, y, 42 + n * 10, C.frost, 0.26);
    VFX.sparks(x + 10, y, { color: '#eaf8ff', n: 8 + n * 3, speed: 300, up: 110 });
    VFX.shock(b.x, b.y + 8, { r: 70 + n * 16, color: full ? '#ffffff' : C.frost, w: 3 + n, dur: 0.45, flat: 1 });
    if (full) {
      VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p); VFX.neonRing(c, b.x, b.y + 4, 60 + 340 * easeOut(p), C.ice, 7 * (1 - p), k, 0.8); glow(c, x + 10, y, 90 * (1 - p * 0.4), C.white, 0.4 * k); } });
      flurry(b.x, b.y, 14, { speed: 200 });
      cam(0.05, 0.02, 0.4, 2);
    }
  }
  function overFx(b) {
    VFX.flash(b.x + 10, b.y - 66, 64, '#ffffff', 0.22);
    VFX.sparks(b.x + 10, b.y - 66, { color: '#ffffff', n: 12, speed: 340, up: 130 });
    VFX.shock(b.x, b.y + 8, { r: 150, color: '#ffffff', w: 4, dur: 0.4, flat: 1 });
  }

  // ---------------------------------------------------------------- propfx (boss-vfx.js propFx() asks first: it is his, or it is a lantern)
  function dash(msg, H) {
    const x = msg.x, y = msg.y, x2 = msg.x2, y2 = msg.y2, ang = Math.atan2(y2 - y, x2 - x), L = Math.hypot(x2 - x, y2 - y);
    VFX.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p), q = easeOut(clamp(p / 0.2, 0, 1));
      c.save(); clipRoom(c);
      const ex = x + (x2 - x) * q, ey = y + (y2 - y) * q;
      VFX.neonPath(c, '#8fe0ff', 20 * (1 - p * 0.6), k, () => { c.moveTo(x, y - 8); c.lineTo(ex, ey - 8); });
      c.beginPath(); c.moveTo(x, y - 8); c.lineTo(ex, ey - 8); c.lineCap = 'round'; c.strokeStyle = rgba('#ffffff', k); c.lineWidth = 5; c.stroke();
      // the figure left standing at where he began and along the way, fading
      for (let i = 0; i < 4; i++) { const u = i / 4; ghostFig(c, x + (x2 - x) * u * 0.7, y + (y2 - y) * u * 0.7, ang, (1 - p) * (0.9 - u * 0.5)); }
      c.restore();
    } });
    for (let d = 40; d < L; d += 55) VFX.smoke(x + (x2 - x) * d / L, y + (y2 - y) * d / L, { n: 1, color: '#eef6ff', size: 34, a: 0.5, speed: 90 });
    VFX.sparks(x, y, { color: '#eaf8ff', n: 8, speed: 240 });
    flurry(x2, y2, 12, { speed: 220 });
    H.shockAt(x2, y2, { r: 130, color: '#dff4ff', w: 6, dur: 0.45, flat: 1 });
    H.shockAt(x, y, { r: 100, color: '#ffffff', w: 5, dur: 0.35, flat: 1 });
    VFX.flash(x, y - 40, 80, '#ffffff', 0.18);
    H.shake(4);
    cam(0.04, 0.02, 0.3, 0.8);
  }
  function wispBurst(x, y, H, big) {
    VFX.flash(x, y - 20, big ? 70 : 44, C.frost, 0.3);
    flurry(x, y, big ? 22 : 10, { speed: 150, size: 1.1 });
    const fl = Array.from({ length: big ? 7 : 4 }, (_, i) => ({ a: rand(0, TAU), d: rand(14, 54), r: rand(6, 12), ph: rand(0, 6) }));
    VFX.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * Math.min(1, p / 0.1);
      c.save();
      for (const f of fl) flake(c, x + Math.cos(f.a) * f.d * easeOut(p), y - 14 + Math.sin(f.a) * f.d * 0.6 * easeOut(p) - p * 16, f.r * (0.6 + 0.6 * p), rgba('#ffffff', 0.9 * k), 1.5);
      c.restore();
    } });
    if (H) H.shockAt(x, y, { r: big ? 90 : 50, color: '#cfeeff', w: 4, dur: 0.4, flat: 1 });
  }
  // a lantern breaking: the flame goes out in a puff of cold smoke
  function lanternBreak(msg, H) {
    const x = msg.x, y = msg.y;
    VFX.debris(x, y - 18, { color: '#4a5262', n: 14, speed: 1.3, up: 1.2 });
    VFX.flash(x, y - 34, 70, C.amber, 0.35);
    VFX.sparks(x, y - 34, { color: C.amber, n: 12, speed: 260 });
    VFX.smoke(x, y - 20, { color: '#8a94a6', n: 8, size: 34, a: 0.6, speed: 90 });
    H.shockAt(x, y, { r: (msg.r || 30) * 2.4, color: '#b8c4d4', w: 6, dur: 0.45, flat: 1 });
    if (msg.how === 'cut') { VFX.crystals(x, y, { r: 34, n: 5, h: 40, color: '#cfeeff', dur: 0.7 }); }
    H.shake(5);
  }
  // a wisp struck down flies home as a cold light and the lantern's flame catches again
  function relight(msg, H) {
    const x0 = msg.fx, y0 = msg.fy, x1 = msg.x, y1 = msg.y;
    flurry(x0, y0, 8, { speed: 120 });
    VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.6, 0, 1)), hx = x0 + (x1 - x0) * q, hy = y0 + (y1 - y0) * q - Math.sin(q * Math.PI) * 50 - 20, k = e.a * (1 - clamp((p - 0.6) / 0.4, 0, 1));
      c.save(); c.lineCap = 'round';
      const tq = Math.max(0, q - 0.25), tx = x0 + (x1 - x0) * tq, ty = y0 + (y1 - y0) * tq - Math.sin(tq * Math.PI) * 50 - 20;
      VFX.neonPath(c, '#8fe0ff', 8, k, () => { c.moveTo(tx, ty); c.lineTo(hx, hy); });
      VFX.glowAt(c, hx, hy, 26, '#ffffff', 0.8 * k); c.restore();
    }, done: () => {
      S.out.delete(Math.round(x1) + ',' + Math.round(y1));
      VFX.flash(x1, y1 - 32, 70, C.amber, 0.4); VFX.sparks(x1, y1 - 32, { color: C.amber, n: 10, speed: 220 });
      H.shockAt(x1, y1, { r: 70, color: '#ffd890', w: 4, dur: 0.4, flat: 1 });
    } });
  }
  // the Last Vigil: he kneels once more. Every standing lantern gives him its flame (a beam of amber light runs to him and the flame
  // travels it), frost runs out across the snow, the pass goes pale, and as the last flame arrives he is wrapped in a column of white
  function lastVigilFx(msg, H) {
    const x = msg.x, y = msg.y, lans = lanterns();
    lans.forEach((pr, i) => VFX.fx({ dur: 0.05, delay: 0.15 + i * 0.1, layer: 'air', draw: () => {}, done: () => { VFX.flash(pr.x, pr.y - 30, 64, C.amber, 0.45); VFX.sparks(pr.x, pr.y - 32, { color: C.amber, n: 6, speed: 180 }); } }));
    // the beams: lantern to blade, the flame running up each
    VFX.fx({ dur: 2.3, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * (1 - clamp((p - 0.82) / 0.18, 0, 1));
      c.save(); c.lineCap = 'round';
      lans.forEach((pr, i) => {
        const q = clamp((p - 0.06 - i * 0.04) / 0.55, 0, 1), mx = pr.x + (x - pr.x) * 0.5, my = Math.min(pr.y, y) - 80 - 30 * (i % 3);
        const bz = u => ({ x: (1 - u) * (1 - u) * pr.x + 2 * (1 - u) * u * mx + u * u * x, y: (1 - u) * (1 - u) * (pr.y - 34) + 2 * (1 - u) * u * my + u * u * (y - 60) });
        c.beginPath(); for (let j = 0; j <= 18; j++) { const pt = bz(j / 18 * easeOut(q)); j ? c.lineTo(pt.x, pt.y) : c.moveTo(pt.x, pt.y); }
        c.strokeStyle = rgba(C.amber, 0.16 * k); c.lineWidth = 9; c.stroke(); c.strokeStyle = rgba('#ffe8b8', 0.5 * k); c.lineWidth = 2; c.stroke();
        const hd = bz(easeOut(q)); glow(c, hd.x, hd.y, 22, '#ffd890', 0.7 * k);
      });
      glow(c, x, y - 60, 40 + 90 * p, C.white, 0.35 * k * p);
      c.restore();
    } });
    // frost across the snow from the kneeling figure, lines running toward the lanterns
    VFX.fx({ dur: 2.8, layer: 'ground', draw: (c, p, t, e) => {
      const grow = easeOut(clamp(p / 0.5, 0, 1)), k = e.a * (1 - clamp((p - 0.7) / 0.3, 0, 1));
      c.save(); ARENA.trace(c, 2); c.clip();
      crackStar(c, x, y + 6, 380 * grow, 18, 83, 0.7 * k, { w: 2, jag: 8 });
      ellipse(c, x, y + 8, 300 * grow, 240 * grow, 0, rgba(C.ice, 0.05 * k), rgba(C.white, 0.5 * k), 2.4);
      for (const pr of lans) crackLine(c, x, y + 6, x + (pr.x - x) * grow, y + 6 + (pr.y - y) * grow, Math.round(pr.x + pr.y), 0.45 * k, { w: 1.6, jag: 9, seg: 26, col: '#ffe8b8' });
      c.restore();
    } });
    H.shockAt(x, y, { r: 420, color: C.frost, w: 8, dur: 1.1, flat: 1 });
    H.shockAt(x, y, { r: 240, color: '#ffffff', w: 4, dur: 0.9, flat: 1, delay: 0.15 });
    H.roomTint('#cfe4ff', 0.28, 1.4);
    flurry(x, y, 26, { speed: 260, size: 1.2 });
    H.shake(5);
    // as the last flame reaches him: a column of white, the whole pass lit for a breath
    VFX.fx({ dur: 0.05, delay: 1.5, layer: 'air', draw: () => {}, done: () => {
      VFX.pillar(x, y, { r: 62, h: 560, color: '#cfeeff', dur: 1.1 });
      H.shockAt(x, y, { r: 560, color: '#ffffff', w: 10, dur: 0.9, flat: 1 });
      H.shockAt(x, y, { r: 330, color: C.amber, w: 5, dur: 0.8, flat: 1, delay: 0.1 });
      flurry(x, y, 30, { speed: 340, size: 1.3 });
      try { if (typeof FX !== 'undefined' && FX.cam) FX.cam.flash('#eaf6ff', 0.3, 0.55); } catch (err) { /* cosmetic */ }
      H.shake(9);
      cam(0.1, 0.04, 0.6, 0);
    } });
  }
  function prop(msg, H) {
    if (msg.k === 'cvdash') { dash(msg, H); return true; }
    if (msg.k === 'cvlast') { lastVigilFx(msg, H); return true; }
    if (msg.k === 'cvwisp') { wispBurst(msg.x, msg.y, H, true); return true; }
    if (msg.k === 'cvrelight') { relight(msg, H); return true; }
    if (msg.kind === 'stonelantern') {
      if (msg.k === 'break') { lanternBreak(msg, H); return true; }
      if (msg.k === 'chip') { VFX.flash(msg.x, msg.y - 34, 60, '#ffd890', 0.25); VFX.sparks(msg.x, msg.y - 30, { color: C.amber, n: 6, speed: 200 }); H.shockAt(msg.x, msg.y, { r: 70, color: '#ffd890', w: 4, dur: 0.35, flat: 1 }); return true; }
    }
    return false;
  }

  // ---------------------------------------------------------------- the enrage, the entrance, the fall
  // Last Light of the Pass: the lanterns go out one by one and a single white line opens along the horizon, thickening
  function horizonCut(c, q, t, a, big) {
    const W = c.canvas.width, Hh = c.canvas.height, y = Hh * 0.44, sc = Hh / 900, th = (1.5 + 5 * q + 38 * q * q * q) * sc * (big || 1);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, y - th * 6, 0, y + th * 6);
    g.addColorStop(0, 'rgba(160,210,255,0)'); g.addColorStop(0.5, rgba('#bfe4ff', 0.7 * q * a)); g.addColorStop(1, 'rgba(160,210,255,0)');
    c.fillStyle = g; c.fillRect(0, y - th * 6, W, th * 12);
    c.fillStyle = rgba('#ffffff', a * (0.5 + 0.5 * q)); c.fillRect(0, y - th / 2, W, th);
    for (let i = 0; i < 70; i++) { const x = hash(i, 31) * W, yy = y + (hash(i, 32) - 0.5) * th * 3.5, bl = 0.5 + 0.5 * Math.sin(t * (3 + hash(i, 33) * 5) + i); c.fillStyle = rgba('#ffffff', a * q * bl * 0.8); c.fillRect(x, yy, 2 * sc + 1, 2 * sc + 1); }
    c.restore();
  }
  const lanterns = () => ((typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.props) || []).filter(p => p.kind === 'stonelantern');
  function snuff(pr) {
    S.out.add(Math.round(pr.x) + ',' + Math.round(pr.y));   // (the lantern's own drawing may ask CV_FX.out(pr): its flame is out)
    VFX.smoke(pr.x, pr.y - 30, { color: '#8a94a6', n: 5, size: 28, a: 0.6, speed: 40 });
    VFX.sparks(pr.x, pr.y - 30, { color: C.amber, n: 8, speed: 180 });
    VFX.flash(pr.x, pr.y - 30, 56, C.amber, 0.3);
    VFX.shock(pr.x, pr.y, { r: 90, color: '#b8c4d4', w: 3, dur: 0.5, flat: 1 });
    VFX.fx({ dur: 14, layer: 'ground', draw: (c, p, t, e) => glow(c, pr.x, pr.y, 150, '#02060e', 0.42 * e.a * Math.min(1, t / 0.6) * Math.min(1, (14 - t) / 2)) });
  }
  function enrage(sh, b, dur, H) {
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => H.wash(c, '#7f98c8', e.a * 0.42 * Math.min(1, t / dur), 'multiply') }));
    const lans = lanterns().sort((a, c) => a.x - c.x);
    lans.forEach((pr, i) => H.soon(sh, dur * (0.12 + 0.72 * i / Math.max(1, lans.length - 1)), () => snuff(pr)));
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'air', draw: (c, p, t, e) => horizonCut(c, clamp(t / dur, 0, 1), t, e.a * Math.min(1, t / 0.8)) }));
    H.emit(sh, dur + 2, 0.5, () => { const q = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(40, 120), vx: rand(60, 140), vz: -rand(5, 25), life: rand(1.2, 2), size: rand(4, 7), color: '#eef6ff', kind: 'glow' }); });
  }
  function enrageLand(b, H) {
    VFX.fx({ dur: 1.8, layer: 'air', draw: (c, p, t, e) => horizonCut(c, 1, t, e.a * (1 - clamp((p - 0.35) / 0.65, 0, 1)), 1 + 2.4 * easeOut(clamp(p / 0.2, 0, 1))) });
    H.shockAt(b.x, b.y, { r: H.AR * 1.3, color: '#eaf6ff', w: 14, dur: 0.8, flat: 1 });
    H.shockAt(b.x, b.y, { r: H.AR * 1.0, color: '#ffffff', w: 8, dur: 0.9, flat: 1, delay: 0.12 });
    H.roomTint('#eaf6ff', 0.4, 1.1);
    flurry(b.x, b.y, 30, { speed: 420, size: 1.4 });
    H.shake(14);
  }
  // the entrance: the lanterns flare as he is seen, frost runs out from his feet
  function intro(sh, b, H) {
    lanterns().forEach((pr, i) => H.soon(sh, 0.1 + i * 0.12, () => VFX.flash(pr.x, pr.y - 30, 64, C.amber, 0.45)));
    H.soon(sh, 0.3, () => { H.shockAt(b.x, b.y, { r: 300, color: C.frost, w: 8, dur: 0.9, flat: 1 }); H.shockAt(b.x, b.y, { r: 180, color: '#ffffff', w: 4, dur: 0.7, flat: 1, delay: 0.1 }); flurry(b.x, b.y, 16, { speed: 200 }); VFX.smoke(b.x, b.y, { n: 8, color: '#dfeaf6', size: 40, a: 0.45, speed: 120 }); });
    H.soon(sh, 1.1, () => { VFX.flash(b.x, b.y - 40, 90, '#ffffff', 0.3); H.shake(4); });
  }
  // his fall: he goes to a knee, the black lacquer lets go and he crumbles into snow; his blade is left standing in the pass
  function death(sh, b, H) {
    H.soon(sh, 0.4, () => { H.shockAt(b.x, b.y, { r: 240, color: '#dff4ff', w: 8, dur: 0.7, flat: 1 }); H.shake(8); });
    H.soon(sh, 1.1, () => {
      VFX.debris(b.x, b.y, { color: '#1a1d26', n: 16, speed: 1.4 });
      flurry(b.x, b.y, 30, { speed: 240 });
      H.shockAt(b.x, b.y, { r: 330, color: '#eaf6ff', w: 7, dur: 0.9, flat: 1 });
      VFX.smoke(b.x, b.y, { n: 10, color: '#e8f0fa', size: 44, a: 0.5, speed: 130 });
      H.shake(10);
    });
    H.emit(sh, 2.4, 0.22, (p) => { if (p < 0.3) return; const a = rand(0, TAU), d = rand(0, 46); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: rand(10, 70), vx: rand(-18, 18), vz: -rand(8, 30), life: rand(1, 1.8), size: rand(5, 9), color: Math.random() < 0.7 ? '#eef6ff' : '#2a3040', kind: Math.random() < 0.7 ? 'glow' : 'shard', add: false, vr: rand(-4, 4) }); });
    VFX.fx({ dur: 16, delay: 1.3, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.7) * Math.min(1, (16 - t) / 3), x = b.x + 6, y = b.y + 16;
      c.save(); c.globalAlpha = k; c.lineCap = 'round';
      glow(c, x, y - 40, 60, C.frost, 0.16);
      ellipse(c, x, y + 2, 16, 5, 0, 'rgba(0,0,0,0.3)');
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 86); c.strokeStyle = '#06101c'; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#c8d4e4'; c.lineWidth = 4.4; c.stroke();
      c.beginPath(); c.moveTo(x - 1, y - 6); c.lineTo(x - 1, y - 80); c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(x - 12, y - 90); c.lineTo(x + 12, y - 90); c.strokeStyle = '#06101c'; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#7a8aa4'; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.moveTo(x, y - 90); c.lineTo(x, y - 112); c.strokeStyle = '#06101c'; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#2a3040'; c.lineWidth = 3.2; c.stroke();
      c.restore();
    } });
  }

  return {
    tell: tag => TELLS[tag] || null, buster, zone, roomOver, aftermath, prop, enrage, enrageLand, intro, death,
    impact(tg, ctx, H, msg) {
      try { whiffs(tg, msg, ctx); } catch (e) { /* cosmetic */ }
      if (tg.type === 'buster') { IMP.buster(tg, ctx, H); return true; }
      const f = IMP[tg.tag]; if (!f) return false;
      f(tg, ctx, H); return true;
    },
    cast(sh, b, dur, anim, name, H) { try { cast(sh, b, dur, anim, name, H); } catch (e) { /* cosmetic */ } },
    wispSpawn(x, y, H) { VFX.flash(x, y - 14, 40, C.frost, 0.25); flurry(x, y, 8, { speed: 110, size: 0.9 }); H.shockAt(x, y, { r: 60, color: '#cfeeff', w: 3, dur: 0.4, flat: 1 }); },
    wispDeath(x, y, H) { wispBurst(x, y, H, false); },
    // the room and lantern art may read these
    ghostFig, flurry,
    out: pr => S.out.has(Math.round(pr.x) + ',' + Math.round(pr.y)),   // true while that lantern's flame is out (the enrage; a Vigil wisp struck down)
  };
})();
