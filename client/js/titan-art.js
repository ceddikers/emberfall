// Hrimgar, the Frost Titan: how each of his moves looks on the floor and when it lands, drawn in code to the painted reference
// sheets (docs/art/vfx-reference/titan-1.png and titan-2.png, git-ignored). Every move shows in three beats: the WARNING (a floor
// marking only this move has, plus his body tell, which bosses.js draws), the IMPACT (a bold shape, a hot white core, a saturated
// mid blue, dark inky edges) and the AFTERMATH (what stays on the floor for a few seconds). Loaded after arena-view.js; the other
// files reach it through TI_ART (boss-tells.js get(), boss-vfx.js impact() and propFx(), bosses.js titan()); a move this file does not
// know falls back to the older drawing there. The sheets of the glacier itself (frozen, cracked, sunk) are arena-view.js iceSheet().
// Palette: pale ice and white, deep night blue, grey fur, a little aurora green and violet; red only where a move hurts (a cracked
// sheet, a slam), blue where a hit is shared. The rule as everywhere: the red rim and the sweeping wash (boss-tells.js outline())
// mark the exact area on every difficulty; what is drawn inside is the extra clue, and safe floor is never painted.

const TI_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const eIn = p => p * p;
  const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const C = { white: '#f6fcff', ice: '#d6efff', frost: '#a8d8ff', mid: '#5fa8e8', deep: '#1f4d8c', night: '#061428', red: '#ff4a3a', redHi: '#ffd0c8', aur: '#3affb0', vio: '#9a7aff' };
  const INK = '#041022';
  const clipArena = c => { ARENA.trace(c, 4); c.clip(); };
  const cellOf = (x, y) => { const cx = Math.floor((x + 500) / 200), cy = Math.floor((y + 400) / 200); return cx < 0 || cx > 4 || cy < 0 || cy > 3 ? null : { x: -500 + cx * 200, y: -400 + cy * 200 }; };
  const BRAZIERS = [[-300, -200], [300, -200], [-300, 200], [300, 200]];

  // ---------------------------------------------------------------- pieces
  // six-armed snowflake
  function flake(c, x, y, r, col, lw, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
      c.moveTo(0, 0); c.lineTo(ca * r, sa * r);
      for (const f of [0.45, 0.72]) {
        const bx = ca * r * f, by = sa * r * f, L = r * (f < 0.5 ? 0.3 : 0.2);
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + 0.8) * L, by + Math.sin(a + 0.8) * L);
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - 0.8) * L, by + Math.sin(a - 0.8) * L);
      }
    }
    c.stroke(); c.restore();
  }
  // an ice crystal standing on the floor at (x, y): lit facet, shaded side, dark ink edge
  function spike(c, x, y, h, w, lean, a, o = {}) {
    if (h < 1 || a <= 0) return;
    const tx = x + lean * h, ty = y - h;
    c.save(); c.globalAlpha = cl(a);
    poly(c, [x - w, y, tx, ty, x + w, y], o.mid || '#86c4f2', INK, 1.6);
    poly(c, [x - w, y, tx, ty, x - w * 0.1, y], o.dark || '#2a62aa');
    poly(c, [x - w * 0.1, y, tx, ty, x + w * 0.6, y], o.lit || '#f2fbff');
    c.restore();
  }
  // a chunk of broken ice lying on the floor
  function chunk(c, x, y, r, rot, a, seed) {
    c.save(); c.globalAlpha = cl(a); c.translate(x, y); c.rotate(rot);
    const pts = []; for (let i = 0; i < 6; i++) { const an = i * TAU / 6, d = r * (0.65 + 0.4 * hash(i, seed)); pts.push(Math.cos(an) * d, Math.sin(an) * d * 0.75); }
    poly(c, pts, '#9ccaee', INK, 1.4);
    poly(c, [pts[0], pts[1], pts[2], pts[3], pts[4] * 0.2, pts[5] * 0.2], '#e6f6ff');
    c.restore();
  }
  // a boulder: grey-blue rock, a snow cap, an ink edge
  function rock(c, x, y, r, rot, a, seed) {
    c.save(); c.globalAlpha = cl(a);
    ellipse(c, x + 3, y + r * 0.55, r * 1.05, r * 0.45, 0, 'rgba(2,10,24,0.4)');
    c.translate(x, y); c.rotate(rot);
    const pts = []; for (let i = 0; i < 8; i++) { const an = i * TAU / 8, d = r * (0.78 + 0.3 * hash(i, seed)); pts.push(Math.cos(an) * d, Math.sin(an) * d); }
    poly(c, pts, '#5e7088', INK, 2);
    poly(c, [pts[0], pts[1], pts[2], pts[3], pts[4] * 0.3, pts[5] * 0.3, pts[14], pts[15]], '#8a9db4');
    poly(c, [pts[8], pts[9], pts[10], pts[11], pts[12] * 0.5, pts[13] * 0.5], 'rgba(244,252,255,0.9)');
    c.restore();
  }
  // radial cracks out of (x, y): a coloured glow under, a dark inked line, a bright core; o.glow / o.core / o.n / o.a
  function cracks(c, x, y, R, grow, seed, o = {}) {
    const n = o.n || 9, a = o.a ?? 1, core = o.core || C.white;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const paths = [];
    for (let i = 0; i < n; i++) {
      const ang = i * TAU / n + (hash(i, seed) - 0.5) * 0.5, L = R * grow * (0.55 + 0.45 * hash(i, seed + 1)), segs = 5, pts = [x, y];
      let px = x, py = y, aa = ang;
      for (let j = 1; j <= segs; j++) { aa += (hash(i * 7 + j, seed + 2) - 0.5) * 0.75; px += Math.cos(aa) * L / segs; py += Math.sin(aa) * L / segs; pts.push(px, py); if (j === 2) paths.push([pts[4], pts[5], pts[4] + Math.cos(aa + 0.9) * L * 0.3, pts[5] + Math.sin(aa + 0.9) * L * 0.3]); }
      paths.push(pts);
    }
    const stroke = (col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (const p of paths) { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); } c.stroke(); };
    if (o.glow) stroke(rgba(o.glow, 0.4 * a), (o.wi || 4.5) + 6);
    stroke(rgba(INK, 0.85 * a), o.wi || 4.5);
    stroke(rgba(core, 0.9 * a), o.wc || 1.3);
    c.restore();
  }
  // a giant fist of clear ice, seen from the front: four knuckles, a thumb, a fur cuff; cracks grow with `crack` (0..1)
  function iceFist(c, x, y, sc, a, crack = 0) {
    if (a <= 0) return;
    c.save(); c.translate(x, y); c.scale(sc, sc); c.globalAlpha = cl(a);
    glow(c, 0, 4, 84, C.frost, 0.4);
    const g = c.createLinearGradient(-34, -26, 34, 38); g.addColorStop(0, '#f6fdff'); g.addColorStop(0.5, '#a6d4f6'); g.addColorStop(1, '#4584c8');
    rrect(c, -26, 30, 52, 20, 6, '#7a8ea6', INK, 2.4);
    for (let i = 0; i < 5; i++) poly(c, [-22 + i * 11, 30, -18 + i * 11, 44, -26 + i * 11 + 4, 50], '#a8bad0');
    rrect(c, -32, -4, 64, 38, 12, g, INK, 3);
    for (const kx of [-24, -8, 8, 24]) circle(c, kx, kx === -24 || kx === 24 ? -6 : -10, 12, g, INK, 2.6);
    for (const lx of [-16, 0, 16]) line(c, lx, -2, lx, 14, rgba(INK, 0.5), 1.8);
    ellipse(c, -31, 18, 10, 16, 0.5, g, INK, 2.4);
    poly(c, [-31, -14, -15, -21, -10, -6, -27, -2], 'rgba(255,255,255,0.65)');
    poly(c, [4, -20, 14, -22, 12, -8, 2, -8], 'rgba(255,255,255,0.5)');
    if (crack > 0) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [sx, sy, ex, ey] of [[-4, -14, 4, 8], [4, 8, -6, 22], [14, -6, 24, 14], [-18, 4, -26, 22], [4, 8, 16, 26]]) {
        const q = cl(crack);
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + (ex - sx) * q, sy + (ey - sy) * q); c.strokeStyle = INK; c.lineWidth = 3.4; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
      }
    }
    c.restore();
  }
  // a block of ice round a frozen hero
  function iceBlock(c, x, y, sc, a) {
    c.save(); c.translate(x, y); c.scale(sc, sc); c.globalAlpha = cl(a);
    glow(c, 0, -14, 64, C.frost, 0.4);
    const g = c.createLinearGradient(-26, -50, 26, 20); g.addColorStop(0, 'rgba(246,253,255,0.8)'); g.addColorStop(0.6, 'rgba(150,204,246,0.6)'); g.addColorStop(1, 'rgba(70,130,200,0.7)');
    poly(c, [-24, 14, -28, -32, -10, -52, 14, -50, 28, -30, 24, 14, 0, 22], g, INK, 2.6);
    poly(c, [-24, 14, -28, -32, -10, -52, -4, -20], 'rgba(255,255,255,0.4)');
    poly(c, [0, 22, 24, 14, 28, -30, 8, -8], 'rgba(40,100,180,0.35)');
    for (const [bx, h, w] of [[-26, 30, 6], [-14, 40, 7], [10, 36, 7], [24, 28, 6]]) spike(c, bx, 18, h, w, bx * 0.01, a, { mid: '#a6d4f6' });
    c.restore();
  }
  // a column of fog and snow puffing out and fading (Whiteout, Breath of Winter)
  function puffs(c, pts, k, col = '#f2faff') { for (const q of pts) glow(c, q.x, q.y, q.r, col, k * q.a); }

  // ---------------------------------------------------------------- effects the impacts are built from
  // a ground mark that lasts a few seconds (fades in at once, out over the last 1.4 s) and is always under the telegraphs
  function decal(dur, draw, o = {}) {
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, k = Math.min(1, T / 0.12) * Math.min(1, (dur - T) / 1.4) * e.a * (o.max ?? 0.6);
      if (k <= 0) return;
      c.save(); clipArena(c); draw(c, k, T, p); c.restore();
    } });
  }
  // crystals thrusting up out of the floor: list of { x, y, h, w, lean, delay }; they hold a while, then melt back down
  function eruption(list, o = {}) {
    const dur = o.dur ?? 1.6, hold = o.hold ?? 0.5;
    list.sort((a, b) => a.y - b.y);
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const T = p * dur;
      for (const s of list) {
        const u = T - s.delay; if (u < 0) continue;
        const grow = easeOut(Math.min(1, u / 0.18)), fall = cl((u - hold) / Math.max(0.2, dur - s.delay - hold));
        spike(c, s.x, s.y, s.h * grow * (1 - fall * fall), s.w * (1 - fall * 0.4), s.lean, e.a * (1 - fall * 0.7), o);
      }
    } });
  }
  // the hot core: a white heart in a saturated blue glow, dying fast
  function core(x, y, r, o = {}) {
    VFX.fx({ dur: o.dur ?? 0.5, layer: 'air', delay: o.delay, draw: (c, p, t, e) => {
      const k = (1 - p) * (1 - p) * e.a, g = r * (0.45 + 0.75 * easeOut(p));
      glow(c, x, y - 8, g, o.col || '#4aa0f0', 0.8 * k); glow(c, x, y - 8, g * 0.42, o.hot || '#ffffff', k);
    } });
  }
  // a ring of crystals round a point
  function ringSpikes(x, y, r, n, hMin, hMax, o = {}) {
    const list = [];
    for (let i = 0; i < n; i++) { const a = i * TAU / n + rand(-0.1, 0.1), d = r * rand(0.9, 1.08); list.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.94, h: rand(hMin, hMax), w: rand(7, 12) * (o.wide ?? 1), lean: Math.cos(a) * 0.28 + rand(-0.1, 0.1), delay: (o.delay ?? 0) + rand(0, 0.1) }); }
    eruption(list, o);
  }
  // flecks of ice flung out and lying a moment
  const chips = (x, y, n, sp = 1.2) => { VFX.debris(x, y - 6, { color: '#cfeaff', n, speed: sp, size: 1.1 }); VFX.sparks(x, y - 10, { color: '#f4fbff', n: Math.round(n * 0.8), speed: 300 }); };
  // the plateau's rim bristling with crystals (Winter's Howl)
  function rimSpikes(b) {
    const hw = ARENA.hw - 10, hh = ARENA.hh - 10, per = 2 * (hw * 2 + hh * 2), list = [];
    for (let d = 0; d < per; d += 56) {
      let u = d, x, y;
      if (u < hw * 2) { x = -hw + u; y = -hh; } else if ((u -= hw * 2) < hh * 2) { x = hw; y = -hh + u; } else if ((u -= hh * 2) < hw * 2) { x = hw - u; y = hh; } else { u -= hw * 2; x = -hw; y = hh - u; }
      list.push({ x, y, h: rand(44, 90), w: rand(7, 12), lean: cl(-x / hw * 0.3, -0.3, 0.3) + rand(-0.06, 0.06), delay: Math.hypot(x - b.x, y - b.y) / 1100 });
    }
    eruption(list, { dur: 2.6, hold: 1.0 });
  }
  // snowflake lace frosted over every sheet
  function lace(dur) {
    const seed = Math.random() * 9;
    decal(dur, (c, k) => {
      for (let i = 0; i < 20; i++) { const x = -400 + (i % 5) * 200, y = -300 + ((i / 5) | 0) * 200; flake(c, x, y, 70, rgba('#ffffff', 0.9 * k), 2.2, hash(i, seed) * 1.0); flake(c, x, y, 70, rgba(C.frost, 0.5 * k), 5.5, hash(i, seed) * 1.0); }
    }, { max: 0.6 });
  }

  // ---------------------------------------------------------------- tells (boss-tells.js get() asks for one by tag)
  const TELLS = {};
  // Winter's Howl: the room goes cold, rings of frost spreading out of him over a lace of snowflakes
  TELLS.tihowl = {
    raidwide: true,
    ground(ctx, tg, s, p, k, t, env) {
      const b = env.boss || { x: 0, y: -250 }, R = ARENA.R * 1.5;
      ctx.save();
      ctx.fillStyle = rgba(C.night, (0.06 + 0.22 * eIn(p)) * k); ctx.fillRect(-R, -R, R * 2, R * 2);
      for (let i = 0; i < 20; i++) flake(ctx, -400 + (i % 5) * 200, -300 + ((i / 5) | 0) * 200, 66, rgba(C.ice, (0.1 + 0.36 * p) * k), 1.7, hash(i, 3) + t * 0.04);
      for (let j = 0; j < 4; j++) {
        const rad = 120 + j * 150 + Math.sin(t * 1.6 - j) * 7 * p, fall = 1 - j * 0.14;
        circle(ctx, b.x, b.y, rad, null, rgba('#4aa0f0', (0.1 + 0.2 * p) * k * fall), 15);
        circle(ctx, b.x, b.y, rad, null, rgba(C.white, (0.28 + 0.5 * p) * k * fall), 2.4);
        const n = 22 + j * 8, spin = t * 0.22 * (j % 2 ? -1 : 1);
        for (let m = 0; m < n; m++) { const a = m * TAU / n + spin; line(ctx, b.x + Math.cos(a) * (rad - 7), b.y + Math.sin(a) * (rad - 7), b.x + Math.cos(a) * (rad + 7), b.y + Math.sin(a) * (rad + 7), rgba(C.white, 0.45 * p * k * fall), 1.4); }
      }
      glow(ctx, b.x, b.y, 230, C.frost, (0.1 + 0.28 * p) * k);
      ctx.restore();
    },
  };
  // the Long Night: the aurora gutters, green and violet bleeding over a darkening plateau
  TELLS.tinight = {
    raidwide: true,
    ground(ctx, tg, s, p, k, t, env) {
      const R = ARENA.R * 1.5;
      ctx.save(); ctx.fillStyle = rgba('#020614', (0.08 + 0.32 * eIn(p)) * k); ctx.fillRect(-R, -R, R * 2, R * 2);
      for (let i = 0; i < 6; i++) glow(ctx, -R * 0.65 + i * R * 0.26, -ARENA.hh * 0.7 + Math.sin(t * 0.8 + i) * 24, 140, i % 2 ? C.vio : C.aur, 0.14 * p * k);
      const b = env.boss || { x: 0, y: -250 };
      circle(ctx, b.x, b.y, 140 + 180 * p, null, rgba(C.frost, 0.3 * p * k), 3);
      ctx.restore();
    },
  };
  // Whiteout: fog rolling in from the edges in a slow spiral, snow streaming across
  TELLS.tiwhite = {
    raidwide: true,
    ground(ctx, tg, s, p, k, t) {
      const R = ARENA.R * 1.4;
      ctx.save();
      const g = ctx.createRadialGradient(0, 0, R * (0.95 - 0.7 * eIn(p)), 0, 0, R * 1.05);
      g.addColorStop(0, rgba('#eaf6ff', 0)); g.addColorStop(1, rgba('#eaf6ff', (0.12 + 0.5 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.lineCap = 'round';
      for (let j = 0; j < 7; j++) {
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) { const u = i / 20, a = j * TAU / 7 + t * 0.4 + u * 2.4, d = R * (1.0 - 0.7 * u * (0.4 + 0.6 * p)); i ? ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d * 0.85) : ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d * 0.85); }
        ctx.strokeStyle = rgba('#ffffff', (0.08 + 0.2 * p) * k); ctx.lineWidth = 26; ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', (0.15 + 0.3 * p) * k); ctx.lineWidth = 3; ctx.stroke();
      }
      for (let i = 0; i < 44; i++) { const u = (t * 0.7 + hash(i, 5)) % 1, y = (hash(i, 6) * 2 - 1) * R, x = -R + u * R * 2; line(ctx, x, y, x - 30, y + 10, rgba('#ffffff', 0.5 * k * (0.3 + p)), 2); }
      ctx.restore();
    },
  };
  // Glacial Fist (the tankbuster): a cone of cold with a ring of white ice where the tank stands, and the fist itself overhead
  TELLS.tifist = {
    ground(ctx, tg, s, p, k, t, env) {
      const tgt = tg.target != null && env.entById ? env.entById(tg.target) : null;
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 30, s.x, s.y, s.r);
      g.addColorStop(0, rgba('#0a1e3c', (0.3 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.frost, (0.04 + 0.14 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 7; i++) {
        const a = s.angle - s.arc / 2 + (i + 0.5) / 7 * s.arc, q = (t * 0.9 + i * 0.31) % 1, d0 = 70 + q * (s.r - 130);
        line(ctx, s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0, s.x + Math.cos(a) * (d0 + 46), s.y + Math.sin(a) * (d0 + 46), rgba('#ffffff', 0.6 * (1 - q) * k * (0.4 + p)), 2.4);
      }
      ctx.restore();
      if (tgt) {
        const r0 = 54 - 12 * p;
        circle(ctx, tgt.x, tgt.y, r0 + 7, null, rgba(C.frost, 0.3 * k), 9);
        circle(ctx, tgt.x, tgt.y, r0, null, rgba('#eaf8ff', (0.5 + 0.4 * p) * k), 3);
        for (let m = 0; m < 10; m++) { const a = m * TAU / 10 + t * 0.5; line(ctx, tgt.x + Math.cos(a) * (r0 - 8), tgt.y + Math.sin(a) * (r0 - 8), tgt.x + Math.cos(a) * (r0 + 2), tgt.y + Math.sin(a) * (r0 + 2), rgba('#ffffff', 0.7 * k), 1.8); }
      }
    },
    air(ctx, tg, s, p, k, t, env) {
      const tgt = tg.target != null && env.entById ? env.entById(tg.target) : null;
      if (!tgt) return;
      const q = eIn(p), h = 84 + (1 - q) * 230;
      ellipse(ctx, tgt.x, tgt.y + 6, 38 * (0.5 + 0.7 * q), 22 * (0.5 + 0.7 * q), 0, rgba(INK, (0.1 + 0.3 * q) * k));
      iceFist(ctx, tgt.x + 4, tgt.y - h, 0.85 + 0.3 * (1 - q), (0.5 + 0.4 * p) * k, 0);
    },
  };
  // Rime Slam: a ring of cracks glowing red, spreading from its heart, and the shadow of his fist coming down
  TELLS.tislam = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      glow(ctx, s.x, s.y, s.r * 1.1, C.red, (0.08 + 0.3 * p) * k);
      ctx.restore();
      cracks(ctx, s.x, s.y, s.r * 0.97, 0.35 + 0.65 * easeOut(p), tg.id, { n: 11, glow: C.red, core: C.redHi });
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + hash(i, tg.id) * 0.3, d = s.r * (0.82 + 0.16 * hash(i, tg.id + 1)); poly(ctx, [s.x + Math.cos(a - 0.04) * d, s.y + Math.sin(a - 0.04) * d, s.x + Math.cos(a) * (d + 10 + 14 * p), s.y + Math.sin(a) * (d + 10 + 14 * p), s.x + Math.cos(a + 0.04) * d, s.y + Math.sin(a + 0.04) * d], rgba('#e6f6ff', (0.3 + 0.4 * p) * k), INK, 1); }
    },
    air(ctx, tg, s, p, k) {
      const q = eIn(p);
      ellipse(ctx, s.x, s.y, s.r * (0.25 + 0.7 * q), s.r * (0.25 + 0.7 * q) * 0.7, 0, rgba(INK, 0.1 + 0.34 * q), null);
      if (p > 0.6) for (let i = 0; i < 4; i++) circle(ctx, s.x + (i - 1.5) * 20 * (1 - q * 0.3), s.y - 10 + (i % 2) * 5, 8 + 6 * q, rgba('#d6efff', (p - 0.6) * 1.2 * k), INK, 1.5);
    },
  };
  // a sheet marked to sink: it reddens and the cracks web across it, glowing
  const sheetCracks = (frost) => ({
    ground(ctx, tg, s, p, k, t) {
      const cx = s.x + s.len / 2, cy = s.y;
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      ctx.fillStyle = rgba(frost ? '#eaf6ff' : C.red, (frost ? 0.22 + 0.14 * p : 0.05 + 0.18 * p) * k); ctx.fillRect(s.x - 4, s.y - s.w / 2 - 4, s.len + 8, s.w + 8);
      glow(ctx, cx, cy, 130, C.red, (0.1 + 0.26 * p) * k);
      cracks(ctx, cx, cy, 135, 0.5 + 0.5 * p, tg.id, { n: 11, glow: C.red, core: C.redHi, wi: 5 });
      const lift = eIn(p) * 5; ctx.strokeStyle = rgba('#ffffff', 0.45 * p * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - s.w / 2); ctx.lineTo(cx + lift, cy); ctx.lineTo(s.x + s.len, s.y - s.w / 2); ctx.moveTo(s.x, s.y + s.w / 2); ctx.lineTo(cx - lift, cy); ctx.lineTo(s.x + s.len, s.y + s.w / 2); ctx.stroke();
      ctx.restore();
    },
  });
  TELLS.tisink = sheetCracks(false);
  TELLS.tiburst = sheetCracks(true);
  // Fault Line: a fissure running out from his fist, glowing red in its throat, crystals leaning out of it
  TELLS.tifault = {
    ground(ctx, tg, s, p, k, t) {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len * (0.2 + 0.8 * easeOut(p));
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      ctx.fillStyle = rgba(C.night, (0.12 + 0.22 * p) * k); ctx.fillRect(s.x - s.len, s.y - s.len, s.len * 2, s.len * 2);
      ctx.restore();
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const line1 = () => { ctx.beginPath(); ctx.moveTo(s.x, s.y); for (let i = 1; i <= 16; i++) { const u = i / 16, off = (hash(i, tg.id) - 0.5) * 34 * (i % 2 ? 1 : -1); ctx.lineTo(s.x + ca * L * u - sa * off, s.y + sa * L * u + ca * off); } };
      line1(); ctx.strokeStyle = rgba(C.red, (0.18 + 0.3 * p) * k); ctx.lineWidth = 22; ctx.stroke();
      line1(); ctx.strokeStyle = rgba(INK, 0.88 * k); ctx.lineWidth = 9; ctx.stroke();
      line1(); ctx.strokeStyle = rgba(C.redHi, (0.5 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const u = (0.1 + 0.85 * hash(i, tg.id + 3)) * (0.2 + 0.8 * easeOut(p)), bx = s.x + ca * s.len * u, by = s.y + sa * s.len * u, side = i % 2 ? 1 : -1;
        line(ctx, bx, by, bx - sa * side * 44, by + ca * side * 44, rgba(INK, 0.75 * k), 3.4); line(ctx, bx, by, bx - sa * side * 44, by + ca * side * 44, rgba('#ffffff', 0.5 * k), 1);
      }
      for (let i = 0; i < 14; i++) {
        const u = (0.08 + 0.9 * hash(i, tg.id + 5)) * (0.2 + 0.8 * easeOut(p)), off = (hash(i, tg.id + 4) - 0.5) * s.w * 0.55;
        spike(ctx, s.x + ca * s.len * u - sa * off, s.y + sa * s.len * u + ca * off, 14 + 16 * p, 5, (hash(i, 9) - 0.5) * 0.5, 0.75 * k);
      }
      ctx.restore();
    },
  };
  // Icefall: a white ring and a glint on the ice, the shard itself falling out of the aurora
  TELLS.ticicle = {
    ground(ctx, tg, s, p, k, t) {
      glow(ctx, s.x, s.y, s.r * 1.15, C.frost, (0.12 + 0.36 * p) * k);
      circle(ctx, s.x, s.y, s.r * 0.92, null, rgba('#4aa0f0', (0.2 + 0.3 * p) * k), 9);
      circle(ctx, s.x, s.y, s.r * 0.92, null, rgba('#ffffff', (0.5 + 0.4 * p) * k), 2.4);
      circle(ctx, s.x, s.y, s.r * (0.3 + 0.35 * (1 - p)), null, rgba('#ffffff', 0.5 * k), 1.6);
      const gl = 10 + 14 * p; line(ctx, s.x - gl, s.y, s.x + gl, s.y, rgba('#ffffff', 0.8 * k), 2); line(ctx, s.x, s.y - gl, s.x, s.y + gl, rgba('#ffffff', 0.8 * k), 2);
    },
    air(ctx, tg, s, p, k) {
      const h = (1 - eIn(p)) * 380 + 20;
      const g = ctx.createLinearGradient(0, s.y - h - 140, 0, s.y - h); g.addColorStop(0, rgba('#bff0ff', 0)); g.addColorStop(1, rgba('#bff0ff', 0.4 * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - 9, s.y - h - 140, 18, 140);
      ctx.save(); ctx.globalAlpha = k;
      poly(ctx, [s.x - 11, s.y - h - 62, s.x + 11, s.y - h - 62, s.x + 9, s.y - h - 14, s.x, s.y - h + 8, s.x - 9, s.y - h - 14], '#8ec8f4', INK, 1.8);
      poly(ctx, [s.x - 11, s.y - h - 62, s.x - 1, s.y - h - 62, s.x - 1, s.y - h + 6, s.x - 9, s.y - h - 14], '#2a62aa');
      poly(ctx, [s.x - 1, s.y - h - 62, s.x + 11, s.y - h - 62, s.x + 9, s.y - h - 14, s.x - 1, s.y - h + 6], '#f2fbff');
      ctx.restore();
      glow(ctx, s.x, s.y - h - 30, 26, '#ffffff', 0.55 * k);
    },
  };
  // Titan's Sweep: a great arc of glass-blue, ringed and ribbed, a sheen running along it
  TELLS.tisweep = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 40, s.x, s.y, s.r);
      g.addColorStop(0, rgba(C.night, (0.3 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.frost, (0.06 + 0.2 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      const a0 = s.angle - s.arc / 2, a1 = s.angle + s.arc / 2;
      for (const f of [0.38, 0.62, 0.86]) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * f, a0, a1); ctx.strokeStyle = rgba('#ffffff', (0.22 + 0.35 * p) * k); ctx.lineWidth = 2; ctx.stroke(); }
      for (let i = 1; i < 7; i++) { const a = a0 + (a1 - a0) * i / 7; line(ctx, s.x + Math.cos(a) * s.r * 0.2, s.y + Math.sin(a) * s.r * 0.2, s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r, rgba('#ffffff', (0.12 + 0.2 * p) * k), 1.4); }
      const sh = a0 + (a1 - a0) * ((t * 0.5) % 1);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, s.r, sh - 0.07, sh + 0.07); ctx.closePath(); ctx.fillStyle = rgba('#ffffff', (0.1 + 0.2 * p) * k); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r - 3, a0, a1); ctx.strokeStyle = rgba('#eaf8ff', (0.5 + 0.4 * p) * k); ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
    },
  };
  // Winter's Grasp (a marker): frost lacing out from the feet of the chosen, and the sheet under them going glassy
  TELLS.tigrasp = {
    ground(ctx, tg, s, p, k, t) {
      const cell = cellOf(s.x, s.y);
      if (cell) {
        ctx.save(); ctx.beginPath(); ctx.rect(cell.x, cell.y, 200, 200); ctx.clip();
        circle(ctx, s.x, s.y, 40 + 230 * easeOut(p), rgba('#eaf8ff', (0.06 + 0.2 * p) * k));
        cracks(ctx, s.x, s.y, 200, 0.4 + 0.6 * p, tg.id, { n: 9, glow: C.frost, core: '#ffffff', wi: 3, wc: 1.2, a: 0.8 });
        ctx.restore();
        ctx.strokeStyle = rgba('#ffffff', 0.5 * p * k); ctx.lineWidth = 3; ctx.strokeRect(cell.x + 2, cell.y + 2, 196, 196);
      }
      glow(ctx, s.x, s.y, s.r * 1.2, '#bff0ff', (0.1 + 0.28 * p) * k);
      flake(ctx, s.x, s.y, s.r * 0.85, rgba('#ffffff', (0.4 + 0.5 * p) * k), 2.2, t * 0.15);
    },
  };
  // Frostbite's shared hit (blue): a snowflake in the ring, cold mist; the ice climbs the hero as the time runs down
  TELLS.tifrost = {
    ground(ctx, tg, s, p, k, t) {
      glow(ctx, s.x, s.y, s.r * 1.1, '#7fb8ff', (0.12 + 0.3 * p) * k);
      flake(ctx, s.x, s.y, s.r * 0.88, rgba('#e8f6ff', (0.45 + 0.4 * p) * k), 2.4, t * 0.2);
      circle(ctx, s.x, s.y, s.r * 0.86, null, rgba('#ffffff', 0.3 * k), 1.6);
      for (let i = 0; i < 10; i++) { const a = hash(i, tg.id) * TAU + t * 0.4, d = hash(i, tg.id + 1) * s.r * 0.9; glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - ((t * 20) % 14), 14, '#e8f6ff', 0.14 * k); }
    },
    air(ctx, tg, s, p, k, t) {
      const g = 0.18 + 0.82 * p;
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + 0.3, bx = s.x + Math.cos(a) * 28, by = s.y + 12 + Math.sin(a) * 10;
        spike(ctx, bx, by, (20 + 36 * hash(i, tg.id)) * g, 5.5, Math.cos(a) * 0.15, 0.9 * k, { mid: '#a6d4f6' });
      }
    },
  };
  // the Avalanche: boulders waiting at the head of the lane, snow smoking off them, the lane's ice cracked
  TELLS.tislide = {
    ground(ctx, tg, s, p, k, t) {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), nx = -sa, ny = ca;
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      for (let u = 100; u < s.len; u += 200) cracks(ctx, s.x + ca * u, s.y + sa * u, 95, 0.4 + 0.5 * p, tg.id + (u / 200) | 0, { n: 7, glow: C.red, core: C.redHi, wi: 3.2, wc: 1, a: 0.7 });
      for (let i = 0; i < 34; i++) {
        const lat = (hash(i, tg.id) - 0.5) * s.w * 0.9, u = (t * (0.5 + 0.5 * p) + hash(i, tg.id + 1)) % 1, d = u * s.len, x = s.x + ca * d + nx * lat, y = s.y + sa * d + ny * lat;
        line(ctx, x, y - 14, x, y, rgba('#ffffff', 0.5 * k * (0.3 + p)), 2.4);
      }
      ctx.restore();
      const nr = Math.max(2, Math.round(s.w / 64));
      for (let i = 0; i < nr; i++) {
        const lat = (i - (nr - 1) / 2) * (s.w / nr), sh = Math.sin(t * 40 + i * 2) * 2.5 * p;
        const x = s.x + ca * 34 + nx * lat + sh, y = s.y + sa * 34 + ny * lat;
        rock(ctx, x, y, 17 + 5 * hash(i, tg.id), i + sh * 0.05, (0.7 + 0.3 * p) * k, tg.id + i);
        glow(ctx, x - ca * 14, y - sa * 14 - 6, 20, '#f4fbff', 0.3 * p * k);
      }
    },
  };
  // Glacial Stomp (Hard): the ring cracked red, rune ticks round it, the sole of his foot coming down
  TELLS.tistomp = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); glow(ctx, s.x, s.y, s.r, C.red, (0.08 + 0.26 * p) * k); ctx.restore();
      cracks(ctx, s.x, s.y, s.r * 0.98, 0.4 + 0.6 * easeOut(p), tg.id, { n: 12, glow: C.red, core: C.redHi });
      circle(ctx, s.x, s.y, s.r * 0.97, null, rgba(C.redHi, (0.3 + 0.4 * p) * k), 2);
      for (let m = 0; m < 28; m++) { const a = m * TAU / 28 + t * 0.1; line(ctx, s.x + Math.cos(a) * (s.r * 0.97 - 8), s.y + Math.sin(a) * (s.r * 0.97 - 8), s.x + Math.cos(a) * (s.r * 0.97 + 3), s.y + Math.sin(a) * (s.r * 0.97 + 3), rgba('#ffffff', 0.5 * p * k), 1.6); }
    },
    air(ctx, tg, s, p, k) {
      const q = eIn(p);
      ellipse(ctx, s.x, s.y, s.r * (0.2 + 0.55 * q), s.r * (0.2 + 0.55 * q) * 0.85, 0, rgba(INK, 0.1 + 0.3 * q));
      const h = (1 - q) * 260 + 40;
      ctx.save(); ctx.globalAlpha = (0.4 + 0.4 * p) * k;
      ellipse(ctx, s.x, s.y - h, 62, 84, 0, '#9ccaee', INK, 3);
      ellipse(ctx, s.x - 8, s.y - h - 10, 46, 62, 0, '#d6efff');
      for (let i = -2; i <= 2; i++) line(ctx, s.x + i * 18, s.y - h + 20, s.x + i * 18, s.y - h + 60, rgba(INK, 0.5), 3);
      ctx.restore();
    },
  };
  // the shard rings of the Stomp: two rows of crystals leaning up out of the ice along the band
  TELLS.tiring = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.fillStyle = rgba(C.frost, (0.05 + 0.14 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); ctx.restore();
      const w = s.r - s.r2;
      for (const [f, n] of [[0.3, 26], [0.7, 30]]) {
        const rad = s.r2 + w * f;
        circle(ctx, s.x, s.y, rad, null, rgba('#ffffff', 0.18 * k), 1.6);
        for (let i = 0; i < n; i++) { const a = i * TAU / n + hash(i, tg.id + f * 9) * 0.1; spike(ctx, s.x + Math.cos(a) * rad, s.y + Math.sin(a) * rad, 14 + 20 * p, 5.5, Math.cos(a) * 0.22, (0.35 + 0.4 * p) * k); }
      }
    },
  };
  // Breath of Winter (Hard): a cloud of frost swirling down the cone, the cold glittering in it
  TELLS.tibreath = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
      g.addColorStop(0, rgba('#ffffff', (0.22 + 0.35 * p) * k)); g.addColorStop(1, rgba('#7fc8ff', (0.05 + 0.16 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 22; i++) {
        const a = s.angle + (hash(i, tg.id) - 0.5) * s.arc * 0.9 + Math.sin(t * 1.5 + i) * 0.04, u = (t * 0.5 + hash(i, tg.id + 1)) % 1, d = 70 + u * (s.r - 90);
        glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 22 + 16 * u, '#eaf6ff', (0.15 + 0.3 * p) * k * (1 - u * 0.5));
      }
      for (let i = 0; i < 14; i++) { const a = s.angle + (hash(i, tg.id + 7) - 0.5) * s.arc * 0.9, d = 90 + hash(i, tg.id + 8) * (s.r - 120); flake(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 9, rgba('#ffffff', 0.6 * p * k), 1.3, t * 0.5 + i); }
      ctx.restore();
    },
  };
  // Titan's Grip (Hard): the shadow of his hand over the ring and its great fingers closing
  TELLS.tigrip = {
    ground(ctx, tg, s, p, k, t) {
      glow(ctx, s.x, s.y, s.r * 1.15, C.night, (0.2 + 0.3 * p) * k);
      circle(ctx, s.x, s.y, s.r * 0.9, null, rgba('#d6efff', (0.25 + 0.3 * p) * k), 2);
    },
    air(ctx, tg, s, p, k, t) {
      const q = easeOut(p);
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.62, d = s.r * (1.5 - 0.95 * q), x0 = s.x + Math.cos(a) * d, y0 = s.y + Math.sin(a) * d * 0.9, x1 = s.x + Math.cos(a) * (d + 70), y1 = s.y + Math.sin(a) * (d + 70) * 0.9;
        ctx.strokeStyle = rgba(INK, 0.8 * k * (0.4 + 0.5 * p)); ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = rgba('#b6dcf6', 0.7 * k * (0.4 + 0.5 * p)); ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', 0.5 * k * (0.4 + 0.5 * p)); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0 - 3, y0); ctx.lineTo(x1 - 3, y1); ctx.stroke();
      }
      ctx.restore();
    },
  };
  // the shared hit that frees whoever is held (blue): a column of light, the fist above them cracking
  TELLS.tigripstack = {
    ground(ctx, tg, s, p, k, t) {
      glow(ctx, s.x, s.y, s.r * 1.2, '#7fb8ff', (0.14 + 0.3 * p) * k);
      flake(ctx, s.x, s.y, s.r * 0.88, rgba('#e8f6ff', (0.4 + 0.4 * p) * k), 2.2, t * 0.2);
    },
    air(ctx, tg, s, p, k, t) {
      const g = ctx.createLinearGradient(0, s.y - 150, 0, s.y); g.addColorStop(0, rgba('#bfe0ff', 0)); g.addColorStop(1, rgba('#bfe0ff', 0.4 * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - 18, s.y - 150, 36, 150);
      iceFist(ctx, s.x, s.y - 128 + Math.sin(t * 3) * 2, 0.7, (0.6 + 0.3 * p) * k, p);
    },
  };

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // H: { shapeFlash, shockAt, scatter, after, shake, roomTint, sweep } from boss-vfx.js. Returns false for a tag it does not know.
  function impact(tg, msg, ctx, H) {
    const s = tg.live, bd = (ctx && ctx.bossDraw) || { x: 0, y: -250 };
    switch (tg.tag) {
      case 'tihowl': {
        H.roomTint('#cfeaff', 0.2, 0.8);
        H.shockAt(bd.x, bd.y, { r: 760, color: '#f6fcff', w: 16, dur: 0.9, flat: 1 });
        H.shockAt(bd.x, bd.y, { r: 520, color: '#5fa8e8', w: 12, dur: 0.8, flat: 1, delay: 0.08 });
        core(bd.x, bd.y, 300, { dur: 0.7 });
        rimSpikes(bd); lace(4.5); H.shake(10); return true;
      }
      case 'tinight': {
        H.roomTint('#304a80', 0.25, 1.0);
        H.shockAt(bd.x, bd.y, { r: 700, color: C.vio, w: 12, dur: 1.0, flat: 1 });
        H.shockAt(bd.x, bd.y, { r: 520, color: C.aur, w: 9, dur: 0.9, flat: 1, delay: 0.1 });
        H.shake(8); return true;
      }
      case 'tiwhite': {
        H.roomTint('#f0faff', 0.45, 1.0);
        const pts = Array.from({ length: 40 }, (_, i) => ({ x: (hash(i, 1) * 2 - 1) * 560, y: (hash(i, 2) * 2 - 1) * 450, vx: (hash(i, 3) - 0.5) * 60, vy: (hash(i, 4) - 0.5) * 30, r: 110 + 90 * hash(i, 5) }));
        VFX.fx({ dur: 3.0, layer: 'air', draw: (c, p, t, e) => {
          const env = Math.min(1, p / 0.2) * Math.min(1, (1 - p) / 0.4) * e.a * 0.62;
          c.save(); clipArena(c); c.fillStyle = rgba('#eef8ff', 0.28 * env); c.fillRect(-700, -600, 1400, 1200);
          puffs(c, pts.map(q => ({ x: q.x + q.vx * t, y: q.y + q.vy * t, r: q.r, a: 1 })), env);
          for (let i = 0; i < 36; i++) { const u = (t * 0.9 + hash(i, 8)) % 1, y = (hash(i, 9) * 2 - 1) * 450, x = -600 + u * 1200; line(c, x, y, x - 34, y + 10, rgba('#ffffff', 0.7 * env), 2.2); }
          c.restore();
        } });
        H.shake(8); return true;
      }
      case 'tifist': {
        const e = tg.target != null && ctx.entById ? ctx.entById(tg.target) : null;
        const x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
        H.shapeFlash(s, '#cfeaff', { a: 0.3, dur: 0.5 });
        VFX.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, ef) => {
          const down = Math.min(1, p / 0.12), fade = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.4);
          iceFist(c, x, y - 28 - (1 - eIn(down)) * 190, 1.35, ef.a * fade, p > 0.12 ? Math.min(1, (p - 0.12) / 0.2) : 0);
        } });
        H.after(0.1, () => {
          core(x, y, 150, { dur: 0.5 }); ringSpikes(x, y, 70, 14, 56, 112, { dur: 1.7, hold: 0.55 });
          H.shockAt(x, y, { r: 170, color: '#f6fcff', w: 10, dur: 0.5, flat: 1 }); chips(x, y, 12, 1.5); VFX.hit(x, y, '#bfe8ff', 2.3); H.shake(13);
          const sd = Math.random() * 9;
          decal(4.5, (c, k) => {
            cracks(c, x, y, 96, 1, sd, { n: 10, core: '#ffffff', wi: 4 });
            ellipse(c, x, y, 40, 28, 0, rgba(C.night, 0.8 * k), rgba('#e6f6ff', 0.8 * k), 2.4);
            for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + hash(i, sd); chunk(c, x + Math.cos(a) * (58 + 20 * hash(i, 4)), y + Math.sin(a) * (44 + 12 * hash(i, 5)), 9 + 8 * hash(i, 6), a, k * 1.4, sd + i); }
          }, { max: 0.7 });
        });
        return true;
      }
      case 'tislam': {
        H.shapeFlash(s, '#ff9a8a', { a: 0.32, dur: 0.5 });
        VFX.spikeburst(s.x, s.y, { r: s.r * 0.75, n: 16, color: C.red, core: '#ffffff', ink: '#1a0614', dur: 0.45 });
        core(s.x, s.y, s.r * 0.9, { dur: 0.5, col: C.red });
        ringSpikes(s.x, s.y, s.r * 0.9, 16, 40, 84, { dur: 1.6, hold: 0.5, delay: 0.04 });
        H.shockAt(s.x, s.y, { r: s.r * 1.3, color: '#ffe0da', w: 9, dur: 0.55, flat: 1 }); chips(s.x, s.y, 12, 1.4); H.shake(13);
        const sd = Math.random() * 9;
        decal(4.5, (c, k, T) => {
          const warm = Math.max(0, 1 - T / 2.4);
          cracks(c, s.x, s.y, s.r * 0.9, 1, sd, { n: 11, glow: warm > 0 ? C.red : C.frost, core: warm > 0 ? C.redHi : '#ffffff', a: 1 });
          for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + hash(i, sd), d = s.r * (0.3 + 0.55 * hash(i, sd + 3)); chunk(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9, 8 + 10 * hash(i, sd + 4), a, k * 1.5, sd + i); }
        }, { max: 0.7 });
        return true;
      }
      case 'tisink': case 'tiburst': {
        const x = s.x + s.len / 2, y = s.y, frost = tg.tag === 'tiburst';
        // the sheet breaks into eight plates that tip and drop into black water
        const sd = Math.random() * 9, hw = 100, corners = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]];
        const mids = [[0, -hw], [hw, 0], [0, hw], [-hw, 0]].map(([mx, my], i) => [mx + (hash(i, sd) - 0.5) * 36, my + (hash(i, sd + 1) - 0.5) * 36]);
        const tris = [];
        for (let i = 0; i < 4; i++) { tris.push([[0, 0], corners[i], mids[i]]); tris.push([[0, 0], mids[i], corners[(i + 1) % 4]]); }
        VFX.fx({ dur: 1.3, layer: 'ground', draw: (c, p, t, e) => {
          c.save(); clipArena(c);
          c.beginPath(); c.rect(x - hw, y - hw, hw * 2, hw * 2); c.clip();
          const wat = Math.min(1, p / 0.12);
          c.fillStyle = rgba('#03091a', 0.9 * wat * e.a); c.fillRect(x - hw, y - hw, hw * 2, hw * 2);
          tris.forEach((tri, i) => {
            const fall = cl((p - 0.04 - hash(i, sd + 2) * 0.12) / 0.55), cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
            c.save(); c.translate(x + cx * (1 - 0.15 * fall), y + cy * (1 - 0.15 * fall) + 24 * eIn(fall)); c.rotate((hash(i, sd + 3) - 0.5) * 0.7 * fall); c.scale(1 - 0.35 * fall, 1 - 0.35 * fall);
            c.globalAlpha = (1 - fall) * e.a;
            poly(c, tri.flatMap(([px, py]) => [px - cx, py - cy]), frost ? '#e8f6ff' : '#a8d2f0', INK, 2);
            poly(c, tri.flatMap(([px, py]) => [(px - cx) * 0.7, (py - cy) * 0.7]), 'rgba(255,255,255,0.4)');
            c.restore();
          });
          c.restore();
        } });
        H.shockAt(x, y, { r: 150, color: '#7fc8ff', w: 7, dur: 0.6, flat: 1 });
        VFX.splash(x, y, { color: '#4a8ac8', n: 16 }); chips(x, y, 10, 1.2); H.shake(7); return true;
      }
      case 'tifault': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, list = [];
        H.shapeFlash(s, '#ffd0c8', { a: 0.26, dur: 0.6 }); H.sweep(s, '#eaf6ff', 0.5);
        for (let i = 0; i < 24; i++) {
          const u = (i + rand(0.1, 0.9)) / 24 * L, off = rand(-0.34, 0.34) * s.w;
          list.push({ x: s.x + ca * u - sa * off, y: s.y + sa * u + ca * off, h: rand(46, 100), w: rand(7, 12), lean: rand(-0.3, 0.3), delay: u / L * 0.5 });
        }
        eruption(list, { dur: 1.9, hold: 0.7 });
        VFX.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
          c.save(); c.lineCap = 'round'; c.globalAlpha = (1 - p) * e.a; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + ca * L, s.y + sa * L);
          c.strokeStyle = rgba('#ff6a5a', 0.6); c.lineWidth = 26 * (1 - p * 0.6); c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 6 * (1 - p); c.stroke(); c.restore();
        } });
        for (const q of H.scatter(s, 10)) H.after(rand(0, 0.3), () => chips(q.x, q.y, 3, 1.1));
        const sd = Math.random() * 9, top = [], bot = [];
        for (let i = 0; i <= 18; i++) { const u = i / 18 * L, j = (hash(i, sd) - 0.5) * 22; top.push([s.x + ca * u - sa * (-20 + j), s.y + sa * u + ca * (-20 + j)]); bot.push([s.x + ca * u - sa * (20 - j), s.y + sa * u + ca * (20 - j)]); }
        decal(6, (c, k, T) => {
          const poly2 = top.concat(bot.slice().reverse()).flatMap(q => q);
          poly(c, poly2, rgba('#020a18', 0.9 * k / 0.6), rgba('#e6f6ff', 0.8 * k / 0.6), 3);
          c.beginPath(); c.moveTo(top[0][0], top[0][1]); for (const q of top) c.lineTo(q[0], q[1]); c.strokeStyle = rgba('#3a8ad0', 0.5 * k / 0.6 * Math.max(0, 1 - T / 4)); c.lineWidth = 3; c.stroke();
          for (let i = 0; i < 14; i++) { const u = hash(i, sd + 4) * L, off = (hash(i, sd + 5) - 0.5) * 70; chunk(c, s.x + ca * u - sa * off, s.y + sa * u + ca * off, 7 + 8 * hash(i, sd + 6), i, k * 1.4, sd + i); }
        }, { max: 0.85 });
        H.shake(12); return true;
      }
      case 'ticicle': {
        const x = s.x, y = s.y;
        VFX.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
          const grow = easeOut(Math.min(1, p / 0.12)), fall = cl((p - 0.45) / 0.55);
          spike(c, x, y + 6, 150 * grow * (1 - fall * fall), 17 * (1 - fall * 0.5), 0, e.a * (1 - fall * 0.8), { mid: '#8ec8f4' });
        } });
        core(x, y, s.r * 1.2, { dur: 0.45 }); ringSpikes(x, y, s.r * 0.55, 7, 28, 56, { dur: 1.2, hold: 0.35 });
        H.shockAt(x, y, { r: s.r * 1.25, color: '#f6fcff', w: 6, dur: 0.45, flat: 1 }); chips(x, y, 6, 1.0); H.shake(4);
        const sd = Math.random() * 9;
        decal(4.5, (c, k, T) => {
          const m = Math.max(0.35, 1 - T / 5);
          flake(c, x, y, s.r * 0.8, rgba('#ffffff', 0.8 * k), 1.8, sd);
          for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + sd; spike(c, x + Math.cos(a) * 26, y + Math.sin(a) * 18, 22 * m, 6, Math.cos(a) * 0.2, k * 1.5); }
          for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + sd * 2; chunk(c, x + Math.cos(a) * (46 + 16 * hash(i, sd)), y + Math.sin(a) * (34 + 10 * hash(i, sd)), 5 + 5 * hash(i, sd + 1), a, k * 1.5, sd + i); }
        }, { max: 0.7 });
        return true;
      }
      case 'tisweep': {
        const a0 = s.angle - s.arc / 2, a1 = s.angle + s.arc / 2;
        H.shapeFlash(s, '#cfeaff', { a: 0.3, dur: 0.6 });
        VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => {
          const cur = a0 + (a1 - a0) * easeOut(Math.min(1, p / 0.55)), fade = 1 - cl((p - 0.55) / 0.45), N = 26;
          if (fade <= 0) return;
          const outer = [], inner = [];
          for (let i = 0; i <= N; i++) { const u = i / N, a = a0 + (cur - a0) * u, ro = s.r * 0.98, ri = s.r * (0.98 - 0.08 - 0.3 * u * u); outer.push(s.x + Math.cos(a) * ro, s.y + Math.sin(a) * ro); inner.push(s.x + Math.cos(a) * ri, s.y + Math.sin(a) * ri); }
          const rev = []; for (let i = inner.length - 2; i >= 0; i -= 2) rev.push(inner[i], inner[i + 1]);
          c.save(); c.globalAlpha = fade * e.a; clipArena(c);
          poly(c, outer.concat(rev), 'rgba(196,232,255,0.75)', INK, 2.4);
          const hot = []; for (let i = 0; i <= N; i++) { const u = i / N, a = a0 + (cur - a0) * u, rr = s.r * (0.98 - 0.04 - 0.1 * u * u); hot.push(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); }
          tracePath(c, hot); c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.lineCap = 'round'; c.stroke();
          for (let i = 1; i <= N; i += 2) { const u = i / N, a = a0 + (cur - a0) * u, ro = s.r * 0.98; poly(c, [s.x + Math.cos(a - 0.012) * ro, s.y + Math.sin(a - 0.012) * ro, s.x + Math.cos(a) * (ro + 26 * u), s.y + Math.sin(a) * (ro + 26 * u), s.x + Math.cos(a + 0.012) * ro, s.y + Math.sin(a + 0.012) * ro], '#eaf8ff', INK, 1.2); }
          c.restore();
        } });
        for (const q of H.scatter(s, 14)) { chips(q.x, q.y, 3, 1.2); H.after(rand(0, 0.25), () => VFX.smoke(q.x, q.y, { n: 1, color: '#eaf6ff', size: 34, a: 0.5, speed: 110 })); }
        const sd = Math.random() * 9;
        decal(4.5, (c, k) => {
          for (let i = 0; i < 28; i++) {
            const a = a0 + (a1 - a0) * hash(i, sd), d = s.r * (0.62 + 0.4 * hash(i, sd + 1)), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d, r = 14 + 22 * hash(i, sd + 2);
            ellipse(c, x, y, r, r * 0.6, a, rgba('#f2faff', 0.9 * k), rgba('#7fb4e0', 0.6 * k), 1.4);
          }
          for (let i = 0; i < 8; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / 8; jagged(c, s.x + Math.cos(a) * s.r * 0.5, s.y + Math.sin(a) * s.r * 0.5, s.x + Math.cos(a) * s.r * 0.96, s.y + Math.sin(a) * s.r * 0.96, i + (sd | 0), '#a8d8ff', 1); }
        }, { max: 0.55 });
        H.shake(11); return true;
      }
      case 'tigrasp': {
        const cell = cellOf(s.x, s.y);
        H.shockAt(s.x, s.y, { r: s.r * 1.6, color: '#f6fcff', w: 6, dur: 0.5, flat: 1 });
        if (cell) VFX.fx({ dur: 1.0, layer: 'ground', draw: (c, p, t, e) => {
          c.save(); clipArena(c); c.beginPath(); c.rect(cell.x, cell.y, 200, 200); c.clip();
          c.fillStyle = rgba('#ffffff', 0.55 * (1 - p) * e.a); c.fillRect(cell.x, cell.y, 200, 200);
          for (let i = 0; i < 3; i++) flake(c, cell.x + 100, cell.y + 100, 60 + i * 26 + p * 30, rgba('#ffffff', 0.7 * (1 - p) * e.a), 2, i);
          c.restore();
        } });
        core(s.x, s.y, 120, { dur: 0.4, col: '#a8d8ff' }); VFX.sparks(s.x, s.y - 6, { color: '#f6fcff', n: 14, speed: 240 }); return true;
      }
      case 'tifrost': {
        if (msg && msg.cure) {
          // a brazier's flame reaches the chilled hero: the ice goes to steam and meltwater
          let br = BRAZIERS[0], bd2 = 1e9; for (const q of BRAZIERS) { const d = Math.hypot(q[0] - s.x, q[1] - s.y); if (d < bd2) { bd2 = d; br = q; } }
          VFX.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
            const k = (1 - p) * e.a; c.save(); c.lineCap = 'round'; c.beginPath(); c.moveTo(br[0], br[1] - 30); c.lineTo(s.x, s.y - 14);
            c.strokeStyle = rgba('#ff8a2a', 0.55 * k); c.lineWidth = 16; c.stroke(); c.strokeStyle = rgba('#ffe2a0', 0.9 * k); c.lineWidth = 5; c.stroke(); c.restore();
          } });
          VFX.smoke(s.x, s.y - 10, { n: 5, color: '#f2f8ff', size: 30, a: 0.6, speed: 70 }); VFX.sparks(s.x, s.y - 10, { color: '#ffd890', n: 10, speed: 200 }); chips(s.x, s.y, 8, 1.0);
          decal(3, (c, k, T) => { for (let i = 0; i < 3; i++) { const q = (T * 0.8 + i / 3) % 1; ellipse(c, s.x, s.y + 6, 12 + q * 40, 6 + q * 18, 0, null, rgba('#9fd0ff', 0.9 * k * (1 - q)), 2); } ellipse(c, s.x, s.y + 6, 38, 17, 0, rgba('#5fa8e8', 0.5 * k)); }, { max: 0.6 });
          return true;
        }
        H.shapeFlash(s, '#9fd0ff', { a: 0.3, dur: 0.5 }); core(s.x, s.y, s.r * 1.1, { dur: 0.5, col: '#5fa8e8' });
        ringSpikes(s.x, s.y, s.r * 0.65, 10, 34, 70, { dur: 1.3, hold: 0.4 });
        H.shockAt(s.x, s.y, { r: s.r * 1.3, color: '#cfe8ff', w: 7, dur: 0.5, flat: 1 }); chips(s.x, s.y, 8, 1.2); H.shake(5);
        decal(2.5, (c, k) => flake(c, s.x, s.y, s.r * 0.8, rgba('#ffffff', 0.9 * k), 2.2, 0.3), { max: 0.6 });
        return true;
      }
      case 'tislide': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), nx = -sa, ny = ca, L = s.len, n = Math.max(3, Math.round(L / 120) + 1), sd = Math.random() * 9;
        const rocks = Array.from({ length: n }, (_, i) => ({ lat: (hash(i, sd) - 0.5) * s.w * 0.62, fin: L * (0.25 + 0.7 * hash(i, sd + 1)), lag: 10 + 70 * hash(i, sd + 2), r: 14 + 12 * hash(i, sd + 3), sp: 4 + hash(i, sd + 4) * 4 }));
        H.shapeFlash(s, '#dff0ff', { a: 0.34, dur: 0.7 });
        VFX.fx({ dur: 1.5, layer: 'air', draw: (c, p, t, e) => {
          const u = cl(p / 0.55), front = u * u * (L + 140), cloud = (1 - cl((p - 0.6) / 0.4)) * e.a;
          c.save(); clipArena(c);
          const pts = []; for (let j = 0; j < 22; j++) { const d = front - j * 16 - hash(j, sd) * 20; if (d < -30 || d > L + 60) continue; pts.push({ x: s.x + ca * d + nx * (hash(j, sd + 5) - 0.5) * s.w * 0.9, y: s.y + sa * d + ny * (hash(j, sd + 5) - 0.5) * s.w * 0.9, r: 44 + j * 2, a: 0.9 - j * 0.03 }); }
          puffs(c, pts, cloud * 0.9);
          for (const r of rocks) { const d = Math.min(r.fin, front - r.lag); if (d < 0) continue; rock(c, s.x + ca * d + nx * r.lat, s.y + sa * d + ny * r.lat, r.r, d * 0.05 * r.sp, e.a, sd); }
          for (let i = 0; i < 18; i++) { const d = front - hash(i, sd + 7) * 140; if (d < 0 || d > L || cloud <= 0) continue; const lat = (hash(i, sd + 8) - 0.5) * s.w; line(c, s.x + ca * d + nx * lat, s.y + sa * d + ny * lat - 12, s.x + ca * d + nx * lat, s.y + sa * d + ny * lat, rgba('#ffffff', 0.8 * cloud), 2.4); }
          c.restore();
        } });
        H.after(0.15, () => H.shake(10));
        H.after(0.55, () => decal(4.5, (c, k) => {
          for (let i = 0; i < 6; i++) { const x = s.x + ca * L * (0.1 + 0.85 * hash(i, sd + 9)) + nx * (hash(i, sd + 10) - 0.5) * s.w * 0.7, y = s.y + sa * L * (0.1 + 0.85 * hash(i, sd + 9)) + ny * (hash(i, sd + 10) - 0.5) * s.w * 0.7; ellipse(c, x, y, 36, 16, 0, rgba('#a8404a', 0.4 * k)); }
          for (const r of rocks) { const d = r.fin; rock(c, s.x + ca * d + nx * r.lat, s.y + sa * d + ny * r.lat, r.r, d * 0.05 * r.sp, k * 1.6, sd); ellipse(c, s.x + ca * d + nx * r.lat, s.y + sa * d + ny * r.lat + r.r * 0.7, r.r * 1.3, r.r * 0.45, 0, rgba('#f2faff', 0.9 * k)); }
        }, { max: 0.6 }));
        return true;
      }
      case 'tistomp': {
        H.shapeFlash(s, '#ff9a8a', { a: 0.3, dur: 0.5 });
        VFX.spikeburst(s.x, s.y, { r: s.r * 0.85, n: 18, color: C.red, core: '#ffffff', ink: '#1a0614', dur: 0.5 });
        core(s.x, s.y, s.r * 1.1, { dur: 0.55, col: C.red });
        ringSpikes(s.x, s.y, s.r * 0.95, 20, 70, 126, { dur: 1.8, hold: 0.6, wide: 1.3 });
        H.shockAt(s.x, s.y, { r: s.r * 1.5, color: '#f6fcff', w: 12, dur: 0.6, flat: 1 }); chips(s.x, s.y, 14, 1.6); H.shake(14);
        const sd = Math.random() * 9;
        decal(4.5, (c, k, T) => {
          cracks(c, s.x, s.y, s.r * 0.95, 1, sd, { n: 12, glow: T < 2 ? C.red : C.frost, core: T < 2 ? C.redHi : '#ffffff' });
          for (let i = 0; i < 22; i++) { const a = i * TAU / 22 + hash(i, sd) * 0.1; chunk(c, s.x + Math.cos(a) * s.r * (0.92 + 0.1 * hash(i, sd + 1)), s.y + Math.sin(a) * s.r * (0.92 + 0.1 * hash(i, sd + 1)), 10 + 9 * hash(i, sd + 2), a, k * 1.5, sd + i); }
        }, { max: 0.7 });
        return true;
      }
      case 'tiring': {
        const w = s.r - s.r2, sd = Math.random() * 9, list = [];
        for (const [f, n] of [[0.3, 22], [0.7, 28]]) { const rad = s.r2 + w * f; for (let i = 0; i < n; i++) { const a = i * TAU / n + rand(-0.06, 0.06); list.push({ x: s.x + Math.cos(a) * rad, y: s.y + Math.sin(a) * rad, h: rand(60, 120), w: rand(8, 13), lean: Math.cos(a) * 0.26, delay: rand(0, 0.12) }); } }
        eruption(list, { dur: 1.7, hold: 0.6 });
        H.shockAt(s.x, s.y, { r: s.r, color: '#eaf6ff', w: 9, dur: 0.5, flat: 1 }); core(s.x + Math.cos(0) * (s.r2 + w / 2), s.y, 90, { dur: 0.4 }); H.shake(7);
        decal(4.5, (c, k) => {
          for (let i = 0; i < 26; i++) { const a = i * TAU / 26 + hash(i, sd) * 0.2, d = s.r2 + w * (0.2 + 0.6 * hash(i, sd + 1)); chunk(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 7 + 8 * hash(i, sd + 2), a, k * 1.5, sd + i); }
        }, { max: 0.65 });
        return true;
      }
      case 'tibreath': {
        H.shapeFlash(s, '#dff4ff', { a: 0.34, dur: 0.6 });
        const sd = Math.random() * 9, puff = Array.from({ length: 26 }, (_, i) => ({ a: s.angle + (hash(i, sd) - 0.5) * s.arc * 0.9, d0: 60 + hash(i, sd + 1) * s.r * 0.4, sz: 0.6 + hash(i, sd + 2) }));
        VFX.fx({ dur: 1.4, layer: 'air', draw: (c, p, t, e) => {
          const k = Math.sin(Math.PI * p) * e.a * 0.7; c.save(); clipArena(c);
          puffs(c, puff.map(q => { const d = q.d0 + easeOut(p) * (s.r - q.d0) * 0.95; return { x: s.x + Math.cos(q.a) * d, y: s.y + Math.sin(q.a) * d, r: (34 + 62 * p) * q.sz, a: 1 }; }), k);
          c.restore();
        } });
        const pts = H.scatter(s, 18);
        decal(3.5, (c, k) => { for (const q of pts) { flake(c, q.x, q.y, 14, rgba('#ffffff', 0.9 * k), 1.6, q.x); spike(c, q.x + 8, q.y + 4, 14, 3.5, 0.1, k * 1.5); } }, { max: 0.6 });
        for (const q of pts.slice(0, 6)) VFX.sparks(q.x, q.y, { color: '#eaf6ff', n: 3, speed: 200 });
        H.shake(5); return true;
      }
      case 'tigrip': {
        H.shapeFlash(s, '#cfeaff', { a: 0.3, dur: 0.5 });
        VFX.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => { const fade = 1 - cl((p - 0.25) / 0.5); iceFist(c, s.x, s.y - 34 - (1 - easeOut(Math.min(1, p / 0.12))) * 120, 1.0, e.a * fade, p); } });
        H.shockAt(s.x, s.y, { r: s.r * 1.3, color: '#bfe0ff', w: 7, dur: 0.4, flat: 1 }); chips(s.x, s.y, 8, 1.0); H.shake(6); return true;
      }
      case 'tigripstack': {
        H.shapeFlash(s, '#bfe0ff', { a: 0.34, dur: 0.5 });
        VFX.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, e) => {
          const k = (1 - p) * e.a, g = c.createLinearGradient(0, s.y - 260, 0, s.y); g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(1, rgba('#d8ecff', 0.8 * k));
          c.fillStyle = g; c.fillRect(s.x - 22 * (1 + p), s.y - 260, 44 * (1 + p), 260);
          iceFist(c, s.x, s.y - 128 - p * 40, 0.7 * (1 + p * 0.3), e.a * (1 - cl(p / 0.5)), 1);
        } });
        core(s.x, s.y, s.r * 1.1, { dur: 0.5, col: '#7fb8ff' }); ringSpikes(s.x, s.y, s.r * 0.7, 8, 30, 60, { dur: 1.2, hold: 0.3 });
        H.shockAt(s.x, s.y, { r: s.r * 1.3, color: '#bfe0ff', w: 6, dur: 0.5, flat: 1 }); VFX.debris(s.x, s.y - 40, { color: '#cfeaff', n: 10, speed: 1.2, up: 1.2 }); H.shake(5); return true;
      }
      default: return false;
    }
  }

  // moments the host sends as 'propfx': a chilled hero frozen solid, or warmed back
  function propFx(msg, room, entById, H) {
    if (msg.k === 'freeze') {
      const x = msg.x, y = msg.y;
      VFX.fx({ dur: 3.0, layer: 'air', draw: (c, p, t, e) => {
        const grow = easeOut(Math.min(1, p / 0.08)), fall = cl((p - 0.9) / 0.1);
        iceBlock(c, x, y + 4, (0.8 + 0.2 * grow) * (1 + 0.1 * fall), e.a * (1 - fall));
        if (p > 0.75 && p < 0.92) cracks(c, x, y - 14, 30, (p - 0.75) / 0.17, 5, { n: 5, wi: 2.6, wc: 1 });
      }, done: () => { chips(x, y, 12, 1.3); VFX.hit(x, y, '#bfe8ff', 1.4); } });
      H.shockAt(x, y, { r: 90, color: '#cfeaff', w: 6, dur: 0.45, flat: 1 }); VFX.sparks(x, y - 10, { color: '#f6fcff', n: 12, speed: 220 });
      return true;
    }
    if (msg.k === 'warm') {
      VFX.smoke(msg.x, msg.y - 6, { n: 4, color: '#f2f8ff', size: 28, a: 0.5, speed: 60 }); VFX.sparks(msg.x, msg.y - 10, { color: '#ffd890', n: 8, speed: 180 });
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- his body (bosses.js titan() asks for these)
  // the raised fist wrapped in clear ice, frost curling off it
  function fistGlow(c, hx, hy, t) {
    glow(c, hx + 8, hy, 44, '#e8f8ff', 0.45 + Math.sin(t * 8) * 0.1);
    rrect(c, hx + 2, hy - 13, 26, 26, 7, 'rgba(206,238,255,0.88)', INK, 2);
    poly(c, [hx + 4, hy - 11, hx + 16, hy - 12, hx + 12, hy - 1, hx + 4, hy - 1], 'rgba(255,255,255,0.8)');
    for (const dy of [-9, 0, 9]) poly(c, [hx + 26, hy + dy - 4, hx + 38, hy + dy, hx + 26, hy + dy + 4], '#e6f6ff', INK, 1.2);
    for (let i = 0; i < 5; i++) { const q = (t * 0.9 + i / 5) % 1, a = i * 1.26 + t * 2; glow(c, hx + 14 + Math.cos(a) * 18 * q, hy + Math.sin(a) * 18 * q, 5, '#ffffff', 0.7 * (1 - q)); }
  }
  // a howl: aurora curling out of his open mouth
  function howlAura(c, t) {
    for (let i = 0; i < 6; i++) { const q = (t * 0.7 + i / 6) % 1, a = (i - 2.5) * 0.3; glow(c, 30 + Math.cos(a) * (10 + q * 60), Math.sin(a) * (10 + q * 60), 10 + q * 12, i % 2 ? C.vio : C.aur, 0.35 * (1 - q)); }
  }

  return { tell: tag => TELLS[tag] || null, impact, propFx, fistGlow, howlAura, iceFist, spike, flake, chunk, cracks };
})();
