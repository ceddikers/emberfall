// Azerath, the Sunken Archmage — everything he looks like, drawn in code: his body and the four elementals, how each of his
// mechanics is drawn on the floor (the tells), what each one does when it lands, the drowned tower's floor with its seven
// circles, and the link that joins the two heroes who carry a rune. Loaded after arena-view.js; the other files reach it through
// AZ_ART (boss-tells.js get(), boss-vfx.js impact()), and it adds to ArenaView and BOSS_ART / ADD_ART itself.
// The rule as everywhere: the red outline and the sweeping wash mark the exact area; what is drawn inside is the extra clue.

const AZ_ART = (() => {
  const COL = AZ.COL, ELS = AZ.ELS;
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const mix2 = (a, b, q) => {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join('');
  };
  // 'azReact:fire:frost' -> ['azReact', 'fire', 'frost']
  const parse = tag => String(tag || '').split(':');

  // ---------------------------------------------------------------- element glyphs (the same four everywhere)
  // fire: a flame; frost: a six-armed flake; bolt: a bolt; void: a ring round a dark eye
  function glyph(ctx, el, x, y, r, col, lw = 2) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (el === 'fire') {
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.8, -r * 0.3, r * 0.75, r * 0.6, 0, r * 0.8);
      ctx.bezierCurveTo(-r * 0.75, r * 0.6, -r * 0.8, -r * 0.2, 0, -r); ctx.fill();
    } else if (el === 'frost') {
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.55 - Math.sin(a) * r * 0.25, Math.sin(a) * r * 0.55 + Math.cos(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.lineTo(Math.cos(a) * r * 0.55 + Math.sin(a) * r * 0.25, Math.sin(a) * r * 0.55 - Math.cos(a) * r * 0.25); ctx.stroke(); }
    } else if (el === 'bolt') {
      ctx.beginPath(); ctx.moveTo(r * 0.25, -r); ctx.lineTo(-r * 0.55, r * 0.1); ctx.lineTo(-r * 0.05, r * 0.1); ctx.lineTo(-r * 0.3, r); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 0.1, -r * 0.2); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0.4, 0.4 + TAU * 0.78); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- tells (boss-tells.js get() asks for one by tag)
  // a spread of points inside a shape, the same each frame for a seed
  function pts(s, n, seed) {
    const out = [], R = s.kind === 'rect' ? Math.min(s.len, ARENA.R * 2) : s.r || 100;
    const ca = s.kind === 'rect' ? Math.cos(s.angle) : 0, sa = s.kind === 'rect' ? Math.sin(s.angle) : 0;
    for (let i = 0; i < n * 5 && out.length < n; i++) {
      let x, y;
      if (s.kind === 'rect') { const u = hash(i, seed) * R, v = (hash(i, seed + 1) - 0.5) * s.w; x = s.x + ca * u - sa * v; y = s.y + sa * u + ca * v; }
      else { x = s.x + (hash(i, seed) * 2 - 1) * R; y = s.y + (hash(i, seed + 1) * 2 - 1) * R; if (s.kind !== 'circle' && s.kind !== 'donut' && s.kind !== 'cone') continue; }
      if (SHAPES.contains(s, x, y, -6)) out.push({ x, y, i });
    }
    return out;
  }
  const wash = (ctx, col, a) => { ctx.fillStyle = rgba(col, a); ctx.fillRect(-ARENA.R * 2, -ARENA.R * 2, ARENA.R * 4, ARENA.R * 4); };
  const MOTIF = {
    // fire: embers lifting off the stone
    fire(ctx, s, p, k, t, seed) {
      wash(ctx, '#ff5a1a', (0.05 + 0.15 * p) * k);
      for (const q of pts(s, 26, seed)) { const u = (t * 0.6 + hash(q.i, seed + 2)) % 1; glow(ctx, q.x, q.y - u * 34, 12 + 10 * p, q.i % 2 ? '#ff8a2a' : '#ffd27a', (0.16 + 0.4 * p) * k * (1 - u)); }
    },
    // frost: crystals pushing up out of the floor
    frost(ctx, s, p, k, t, seed) {
      wash(ctx, '#7fd8ff', (0.05 + 0.15 * p) * k);
      for (const q of pts(s, 22, seed)) {
        const h = (8 + 16 * hash(q.i, seed + 3)) * (0.35 + 0.65 * p), w = 3 + 3 * hash(q.i, seed + 4);
        poly(ctx, [q.x - w, q.y, q.x + 1, q.y - h, q.x + w, q.y], rgba('#d8f4ff', (0.35 + 0.4 * p) * k), rgba('#2a5a7a', 0.5 * k), 1);
      }
    },
    // lightning: crooked threads of light, jumping about
    bolt(ctx, s, p, k, t, seed) {
      wash(ctx, '#ffe45a', (0.04 + 0.12 * p) * k);
      const step = Math.floor(t * 9);
      for (const q of pts(s, 12, seed)) {
        const a = hash(q.i, step) * TAU, len = 16 + 22 * hash(q.i, step + 1);
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + Math.cos(a) * len * 0.5 + 5, q.y + Math.sin(a) * len * 0.5 - 4); ctx.lineTo(q.x + Math.cos(a) * len, q.y + Math.sin(a) * len);
        ctx.strokeStyle = rgba('#fff6b0', (0.3 + 0.5 * p) * k * (hash(q.i, step + 2) > 0.3 ? 1 : 0.25)); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke();
      }
    },
    // void: dark motes drawn in, a violet rim round each
    void(ctx, s, p, k, t, seed) {
      wash(ctx, '#2a0a4a', (0.1 + 0.2 * p) * k);
      for (const q of pts(s, 20, seed)) {
        const u = (t * 0.5 + hash(q.i, seed + 5)) % 1, cx = s.x, cy = s.y, d = Math.hypot(q.x - cx, q.y - cy) || 1, f = s.kind === 'rect' ? 0 : 0.25 * u;
        const x = q.x + (cx - q.x) * f, y = q.y + (cy - q.y) * f;
        circle(ctx, x, y, 5 + 5 * p, rgba('#10041e', 0.5 * k), rgba('#a05aff', (0.35 + 0.4 * p) * k), 1.6);
        void d;
      }
    },
  };
  const elemTell = el => ({ ground(ctx, tg, s, p, k, t) { ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); MOTIF[el](ctx, s, p, k, t, tg.id); ctx.restore(); } });
  const TELLS = {
    azFire: elemTell('fire'), azFrost: elemTell('frost'), azBolt: elemTell('bolt'), azVoid: elemTell('void'),
    // Arcane Burst / the elementals blowing: the room rings with each element in turn
    azBurst: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        const R = ARENA.R, b = env.boss || { x: 0, y: 0 };
        ctx.save(); ctx.fillStyle = `rgba(4,26,32,${(0.06 + 0.22 * p * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
        ELS.forEach((el, i) => { const q = (t * 0.55 + i / 4) % 1; ellipse(ctx, b.x, b.y, 60 + q * R, (60 + q * R) * 0.92, 0, null, rgba(COL[el], 0.3 * (1 - q) * k * (0.4 + 0.6 * p)), 3); });
      },
    },
    // a lightning bolt from one rune to the other
    azBeam: {
      ground(ctx, tg, s, p, k, t) {
        if (s.len < 4) return;
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), step = Math.floor(t * 12), n = 9, nx = -sa, ny = ca;
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        wash(ctx, '#ffe45a', (0.08 + 0.14 * p) * k);
        ctx.restore();
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const [w, a, c] of [[9, 0.25, '#ffe45a'], [3, 0.9, '#fffbe0']]) {
          ctx.beginPath(); ctx.moveTo(s.x, s.y);
          for (let i = 1; i < n; i++) { const u = i / n, j = (hash(i, step) - 0.5) * 34; ctx.lineTo(s.x + ca * s.len * u + nx * j, s.y + sa * s.len * u + ny * j); }
          ctx.lineTo(s.x + ca * s.len, s.y + sa * s.len);
          ctx.strokeStyle = rgba(c, a * k * (0.5 + 0.5 * p)); ctx.lineWidth = w; ctx.stroke();
        }
        ctx.restore();
      },
    },
    // an elemental rising from a hero's spot: a shared blow
    azMark: {
      ground(ctx, tg, s, p, k, t) {
        const el = parse(tg.tag)[1] || 'fire', col = COL[el];
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        glow(ctx, s.x, s.y, s.r * 1.1, col, (0.16 + 0.4 * p) * k);
        for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * (0.2 + 0.7 * q), null, rgba(col, 0.5 * (1 - q) * k), 2); }
        ctx.restore();
        glyph(ctx, el, s.x, s.y - 4 - 6 * Math.sin(t * 3), 18 + 6 * p, rgba(col, (0.5 + 0.4 * p) * k), 2.4);
      },
      air(ctx, tg, s, p, k, t) { const el = parse(tg.tag)[1] || 'fire'; glow(ctx, s.x, s.y - 14 - 18 * p, 26, COL[el], (0.2 + 0.4 * p) * k); },
    },
    // two elements meeting: a swirl of both
    azReact: {
      ground(ctx, tg, s, p, k, t) {
        const [, e1, e2] = parse(tg.tag), c1 = COL[e1] || '#ffffff', c2 = COL[e2] || '#ffffff';
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        wash(ctx, mix2(c1, c2, 0.5), (0.1 + 0.2 * p) * k);
        const n = 22;
        for (const q of pts(s, n, tg.id)) {
          const u = (t * 0.7 + hash(q.i, 7)) % 1;
          glow(ctx, q.x + Math.sin(t * 3 + q.i) * 6, q.y - u * 30, 10 + 8 * p, q.i % 2 ? c1 : c2, (0.2 + 0.4 * p) * k * (1 - u));
          if (q.i % 5 === 0) circle(ctx, q.x, q.y, 2.2, rgba('#ffffff', (0.4 + 0.4 * p) * k));
        }
        ctx.restore();
      },
    },
    // the working's pulses and a failed binding's blast
    azPulse: {
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.1, '#3fe0d0', (0.14 + 0.36 * p) * k);
        for (let i = 0; i < 6; i++) { const u = (t * 0.8 + hash(i, tg.id)) % 1, a = hash(i, tg.id + 1) * TAU, d = hash(i, tg.id + 2) * s.r * 0.8; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - u * 20, 2 + 3 * u, null, rgba('#bff8f0', 0.6 * (1 - u) * k), 1.4); }
      },
    },
    azSurge: { raidwide: true, ground(ctx, tg, s, p, k, t, env) { const R = ARENA.R, b = env.boss || { x: 0, y: 0 }; ctx.save(); ctx.fillStyle = `rgba(20,10,40,${(0.05 + 0.18 * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore(); for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; ellipse(ctx, b.x, b.y, 50 + q * R, (50 + q * R) * 0.92, 0, null, rgba('#9af0ff', 0.28 * (1 - q) * k), 3); } } },
  };
  const tell = tag => {
    const t0 = parse(tag)[0];
    return TELLS[t0] || null;
  };

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  function impact(tg, ctx, H) {
    const s = tg.live, [base, e1, e2] = parse(tg.tag), pal = { azFire: COL.fire, azFrost: COL.frost, azBolt: COL.bolt, azVoid: COL.void };
    const col = pal[base];
    if (tg.type === 'buster') {
      const e = tg.target != null ? ctx.entById(tg.target) : null, x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
      H.shapeFlash(s, '#9af0ff', { a: 0.3 });
      for (const c of [COL.frost, COL.bolt]) VFX.lightning(s.x, s.y - 10, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, { color: c, jag: 14, dur: 0.35 });
      VFX.hit(x, y, '#9af0ff', 2.2); H.shockAt(x, y, { r: 100, color: '#7fe8e0', w: 6, flat: 1 }); H.shake(9);
      return;
    }
    if (base === 'azBurst' || base === 'azSurge') { H.roomTint(base === 'azBurst' ? '#3fe0d0' : '#a05aff', 0.2, 0.8); H.shake(8); return; }
    if (base === 'azFire') {
      H.shapeFlash(s, COL.fire, { a: 0.36, dur: 0.55 });
      if (s.kind === 'donut' || (s.kind === 'circle' && s.r > 150)) H.shockAt(s.x, s.y, { r: Math.min(s.r, 560), r0: s.r2 || 0, color: '#ffb04a', w: 8, dur: 0.6, flat: 1 });
      for (const q of H.scatter(s, 14)) H.after(Math.random() * 0.25, () => VFX.sparks(q.x, q.y, { color: '#ffd27a', n: 3, speed: 260 }));
      H.shake(7);
    } else if (base === 'azFrost') {
      H.shapeFlash(s, COL.frost, { a: 0.34, dur: 0.55 });
      if (s.kind === 'rect') H.sweep(s, '#e8faff', 0.4);
      for (const q of H.scatter(s, 6)) H.after(Math.random() * 0.2, () => VFX.crystals(q.x, q.y, { r: 30, n: 5, h: 54, color: '#9fe0ff', dur: 0.9 }));
      H.shake(7);
    } else if (base === 'azBolt' || base === 'azBeam') {
      H.shapeFlash(s, COL.bolt, { a: 0.3, dur: 0.45 });
      if (base === 'azBolt') { VFX.lightning(s.x + (Math.random() - 0.5) * 40, s.y - 520, s.x, s.y, { color: '#fff6b0', jag: 26, dur: 0.4 }); VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 420, color: '#ffe45a', dur: 0.45 }); H.shockAt(s.x, s.y, { r: s.r * 1.2, color: '#fff6b0', w: 6, dur: 0.4, flat: 1 }); }
      else { H.sweep(s, '#fffbe0', 0.3); for (const q of H.scatter(s, 6)) VFX.sparks(q.x, q.y, { color: '#fff6b0', n: 3, speed: 280 }); }
      H.shake(8);
    } else if (base === 'azVoid') {
      H.shapeFlash(s, COL.void, { a: 0.36, dur: 0.6 });
      VFX.swirl(s.x, s.y, { r: Math.min(s.r * 0.8, 240), color: '#a05aff', dur: 0.6, arms: 3, inward: 1 });
      H.shockAt(s.x, s.y, { r: s.r * 1.1, r0: s.r2 || 0, color: '#c8a0ff', w: 6, dur: 0.5, flat: 1 });
      H.shake(7);
    } else if (base === 'azReact') {
      const c1 = COL[e1] || '#ffffff', c2 = COL[e2] || '#ffffff', mid = mix2(c1, c2, 0.5);
      H.shapeFlash(s, mid, { a: 0.4, dur: 0.6 });
      for (const q of H.scatter(s, 8)) H.after(Math.random() * 0.2, () => { VFX.sparks(q.x, q.y, { color: c1, n: 3, speed: 260 }); VFX.sparks(q.x, q.y, { color: c2, n: 3, speed: 260 }); });
      if (s.kind === 'circle') H.shockAt(s.x, s.y, { r: s.r * 1.2, color: mid, w: 7, dur: 0.5, flat: 1 });
      H.shake(8);
    } else if (base === 'azMark') {
      const c = COL[e1] || '#ffffff';
      H.shapeFlash(s, '#ffe27a', { a: 0.3 }); VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 300, color: c, dur: 0.6 }); H.shockAt(s.x, s.y, { r: s.r * 1.3, color: c, w: 6, dur: 0.5, flat: 1 }); H.shake(6);
    } else if (base === 'azPulse') {
      H.shapeFlash(s, '#3fe0d0', { a: 0.3, dur: 0.4 }); H.shockAt(s.x, s.y, { r: s.r * 1.2, color: '#bff8f0', w: 4, dur: 0.4, flat: 1 }); H.shake(4);
    } else {
      H.shapeFlash(s, col || '#9af0ff', { a: 0.34 });
    }
  }

  // ---------------------------------------------------------------- the drowned tower's floor
  const SIG = AZ.SIG;
  function sigil(c, el, x, y, r, a) {
    const col = COL[el];
    glow(c, x, y, r * 1.5, col, 0.22 * a);
    circle(c, x, y, r, 'rgba(6,22,28,0.55)', rgba(col, 0.7 * a), 3);
    circle(c, x, y, r * 0.86, null, rgba(col, 0.45 * a), 1.4);
    for (let i = 0; i < 24; i++) { const an = i * TAU / 24; line(c, x + Math.cos(an) * r * 0.9, y + Math.sin(an) * r * 0.9, x + Math.cos(an) * r * (i % 2 ? 1.0 : 1.06), y + Math.sin(an) * r * (i % 2 ? 1.0 : 1.06), rgba(col, 0.5 * a), 1.5); }
    glyph(c, el, x, y, r * 0.5, rgba(col, 0.85 * a), 3);
  }
  function buildTower(c, bx, by) {
    const r = rng(131), R = ARENA.full;
    // the dark water round the tower, a few drowned columns standing in it
    c.fillStyle = '#04141a'; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 70; i++) { const a = r() * TAU, d = R + 10 + r() * Math.max(bx, by), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.95; if (Math.abs(x) > bx - 6 || Math.abs(y) > by - 6) continue; glow(c, x, y, 40 + r() * 90, r() < 0.5 ? '#0a3a44' : '#06222a', 0.35 + r() * 0.35); }
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + 0.2 + r() * 0.2, d = R + 50 + r() * 50, x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (Math.abs(x) > bx - 30 || Math.abs(y) > by - 30) continue;
      circle(c, x, y, 20 + r() * 8, '#1c3a40', 'rgba(0,0,0,0.6)', 3); circle(c, x - 3, y - 3, 12, '#2a5258'); glow(c, x, y, 40, '#0a4048', 0.3);
    }
    // the floor: wet teal stone in rings of dressed blocks
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    const g = c.createRadialGradient(0, -R * 0.1, 30, 0, 0, R);
    g.addColorStop(0, '#34565c'); g.addColorStop(0.6, '#2a464c'); g.addColorStop(1, '#1b3338');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    for (let ring = 0; ring < 10; ring++) {
      const r0 = ring * 54, r1 = r0 + 54, n = Math.max(6, Math.round(TAU * (r0 + r1) / 2 / 46)), off = r();
      for (let i = 0; i < n; i++) {
        const a0 = (i + off) * TAU / n, a1 = a0 + TAU / n - 0.012, v = 52 + r() * 26;
        c.beginPath(); c.arc(0, 0, r1 - 1, a0, a1); c.arc(0, 0, r0 + 1, a1, a0, true); c.closePath();
        c.fillStyle = `rgba(${v * 0.7 | 0},${v + 14 | 0},${v + 20 | 0},${0.22 + r() * 0.2})`; c.fill(); c.strokeStyle = 'rgba(4,14,18,0.5)'; c.lineWidth = 1.4; c.stroke();
      }
    }
    for (let i = 0; i < 2600; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.5 + r() * 1.2, r() < 0.6 ? `rgba(4,14,18,${0.2 + r() * 0.3})` : `rgba(140,230,225,${0.05 + r() * 0.08})`); }
    // kelp and algae creeping over the blocks, and standing water
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R, s = 14 + r() * 36; glow(c, Math.cos(a) * d, Math.sin(a) * d, s, r() < 0.5 ? '#1c5a44' : '#14403a', 0.22 + r() * 0.2); }
    for (let i = 0; i < 16; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R * 0.9, x = Math.cos(a) * d, y = Math.sin(a) * d, w = 24 + r() * 60;
      ellipse(c, x, y, w, w * 0.45, r() * TAU, 'rgba(10,50,60,0.4)', 'rgba(150,240,235,0.18)', 1.5); ellipse(c, x - w * 0.2, y - w * 0.1, w * 0.35, w * 0.1, 0, 'rgba(200,255,250,0.14)');
    }
    for (let i = 0; i < 18; i++) {
      let x = (r() * 2 - 1) * R * 0.9, y = (r() * 2 - 1) * R * 0.9, a = r() * TAU;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5 + r() * 5; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (10 + r() * 18); y += Math.sin(a) * (10 + r() * 18); c.lineTo(x, y); }
      c.strokeStyle = 'rgba(2,10,14,0.55)'; c.lineWidth = 1.6; c.stroke();
    }
    // the seven circles: the middle one (a seven-pointed star), the two rings round it, and the four sigils
    const inlay = (rad, w, a) => { c.beginPath(); c.arc(0, 0, rad, 0, TAU); c.strokeStyle = `rgba(94,200,192,${a})`; c.lineWidth = w; c.stroke(); };
    inlay(170, 4, 0.5); inlay(164, 1.4, 0.4); inlay(350, 4, 0.5); inlay(344, 1.4, 0.4); inlay(R - 16, 3, 0.35);
    for (const rad of [170, 350]) for (let i = 0; i < 72; i++) { const a = i * TAU / 72; line(c, Math.cos(a) * (rad - 10), Math.sin(a) * (rad - 10), Math.cos(a) * (rad + (i % 6 ? 2 : 10)), Math.sin(a) * (rad + (i % 6 ? 2 : 10)), 'rgba(94,200,192,0.4)', 1.4); }
    glow(c, 0, 0, 120, '#2a8a86', 0.25);
    circle(c, 0, 0, 84, 'rgba(6,24,30,0.45)', 'rgba(94,200,192,0.7)', 3); circle(c, 0, 0, 74, null, 'rgba(94,200,192,0.4)', 1.4);
    c.beginPath(); for (let i = 0; i <= 7; i++) { const a = -Math.PI / 2 + i * 3 * TAU / 7; i ? c.lineTo(Math.cos(a) * 70, Math.sin(a) * 70) : c.moveTo(Math.cos(a) * 70, Math.sin(a) * 70); }
    c.strokeStyle = 'rgba(150,240,232,0.55)'; c.lineWidth = 2; c.stroke();
    for (const el of ELS) sigil(c, el, SIG[el][0], SIG[el][1], 108, 0.62);
    c.restore();
    c.beginPath(); c.arc(0, 0, R - 4, 0, TAU); c.strokeStyle = 'rgba(80,220,210,0.18)'; c.lineWidth = 12; c.stroke();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 3; c.stroke();
    ArenaView.amb = { kind: 'tower', bubbles: Array.from({ length: 22 }, () => ({ a: r() * TAU, d: Math.sqrt(r()) * R, sp: 0.04 + r() * 0.08, ph: r() * 9, s: 1 + r() * 2.2 })), caus: Array.from({ length: 12 }, () => ({ a: r() * TAU, d: Math.sqrt(r()) * R, sp: 0.02 + r() * 0.04, s: 60 + r() * 90, ph: r() * 9 })) };
  }
  // the room's life: light moving on the water, bubbles, and the sigils glowing with what the fight asks of them
  function towerLife(ctx, a, t) {
    const room = ArenaView.liveRoom, ev = (room && room.ev) || {};
    ctx.save(); ARENA.trace(ctx, 0); ctx.clip();
    for (const cs of a.caus) { const an = cs.a + t * cs.sp; glow(ctx, Math.cos(an) * cs.d, Math.sin(an) * cs.d * 0.95, cs.s, '#5ad0c8', 0.045 + 0.03 * Math.sin(t * 0.6 + cs.ph)); }
    for (const b of a.bubbles) { const u = (t * b.sp + b.ph) % 1, x = Math.cos(b.a) * b.d + Math.sin(t + b.ph) * 6, y = Math.sin(b.a) * b.d * 0.95 - u * 26; circle(ctx, x, y, b.s, null, rgba('#c8fff6', 0.32 * Math.sin(u * Math.PI)), 1); }
    const bind = ev.bind && t < ev.bind.end ? ev.bind.els || [] : [], conv = ev.conv && t < ev.conv.end ? ev.conv : null;
    for (const el of ELS) {
      const [x, y] = SIG[el], col = COL[el];
      let k = 0.12 + 0.06 * Math.sin(t * 1.1 + el.length);
      if (bind.includes(el)) k = 0.5 + 0.3 * Math.sin(t * 5);
      if (conv) k = Math.max(k, 0.25 + 0.55 * clamp((t - conv.start) / Math.max(0.5, conv.end - conv.start), 0, 1));
      const bd = ev.bound && ev.bound.el === el ? ev.bound : null, sg = ev.surge && ev.surge.el === el ? ev.surge : null;
      if (bd && t < bd.end) k = Math.max(k, 1.0 - (t - bd.start) / (bd.end - bd.start) * 0.5);
      glow(ctx, x, y, 150, col, k * 0.55);
      circle(ctx, x, y, 108, null, rgba(col, Math.min(1, k * 1.4) * 0.8), 2.5);
      if (bind.includes(el)) for (let i = 0; i < 2; i++) { const q = (t * 0.8 + i * 0.5) % 1; circle(ctx, x, y, 108 + q * 50, null, rgba(col, 0.5 * (1 - q)), 2); }
      if (bd && t < bd.end) { const q = (t - bd.start) / (bd.end - bd.start); circle(ctx, x, y, 108 + q * 200, null, rgba('#ffffff', 0.7 * (1 - q)), 4); }
      if (sg && t < sg.end) glow(ctx, x, y, 220, col, 0.5 * (1 - (t - sg.start) / (sg.end - sg.start)));
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the link between the two rune bearers (ArenaView.tether hands it over)
  function runeLink(ctx, a, b, th, t) {
    const [, ea, eb] = parse(th.tag), ca = COL[ea] || '#ffffff', cb = COL[eb] || '#ffffff';
    const d = Math.hypot(b.x - a.x, b.y - a.y), near = d < 250, mid = mix2(ca, cb, 0.5);
    const ay = a.y - 22 - (a.lift || 0), by = b.y - 22 - (b.lift || 0), mx = (a.x + b.x) / 2, my = (ay + by) / 2;
    ctx.save(); ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(a.x, ay, b.x, by); g.addColorStop(0, rgba(ca, 0.9)); g.addColorStop(1, rgba(cb, 0.9));
    const wob = Math.sin(t * 5) * 7, nx = -(by - ay) / (d || 1), ny = (b.x - a.x) / (d || 1);
    ctx.beginPath(); ctx.moveTo(a.x, ay); ctx.quadraticCurveTo(mx + nx * wob, my + ny * wob, b.x, by);
    ctx.strokeStyle = g; ctx.lineWidth = near ? 5 : 3; if (!near) ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.25; ctx.lineWidth = 11; ctx.stroke(); ctx.globalAlpha = 1;
    // the reaction where the runes are close: a bloom of both
    if (near) {
      const k = 1 - d / 250;
      glow(ctx, mx, my, 50 + 40 * k, mid, 0.35 + 0.35 * k);
      for (let i = 0; i < 6; i++) { const q = (t * 0.9 + i / 6) % 1, an = i * 1.05 + t; glow(ctx, mx + Math.cos(an) * 18 * q, my + Math.sin(an) * 12 * q - q * 26, 9, i % 2 ? ca : cb, 0.6 * (1 - q)); }
    }
    // a rune over each head
    for (const [e, el, col] of [[a, ea, ca], [b, eb, cb]]) {
      const hx = e.x, hy = e.y - 78 - (e.lift || 0) + Math.sin(t * 2.4 + e.x) * 2;
      glow(ctx, hx, hy, 34, col, 0.4);
      circle(ctx, hx, hy, 15, 'rgba(6,20,26,0.8)', rgba(col, 0.9), 2.2);
      glyph(ctx, el, hx, hy, 9, col, 2);
      circle(ctx, e.x, e.y + 4, 22 + Math.sin(t * 4) * 1.5, null, rgba(col, 0.5), 2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the elementals (adds) and his body
  const elementalArt = el => (ctx, st) => {
    const t = st.t || 0, col = COL[el];
    glow(ctx, 0, 0, 40, col, 0.45);
    if (el === 'fire') {
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + t * 1.5, d = 9 + Math.sin(t * 5 + i) * 3; poly(ctx, [Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a - 0.5) * d * 1.8, Math.sin(a - 0.5) * d * 1.8, Math.cos(a) * d * 2.5, Math.sin(a) * d * 2.5, Math.cos(a + 0.5) * d * 1.8, Math.sin(a + 0.5) * d * 1.8], i % 2 ? '#ff8a2a' : '#ff5a1a', OUT, 1.6); }
      circle(ctx, 0, 0, 10, '#ffd27a', OUT, 2); circle(ctx, 0, 0, 5, '#fff4c8');
    } else if (el === 'frost') {
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 0.4; poly(ctx, [Math.cos(a - 0.2) * 6, Math.sin(a - 0.2) * 6, Math.cos(a) * 26, Math.sin(a) * 26, Math.cos(a + 0.2) * 6, Math.sin(a + 0.2) * 6], '#d8f4ff', OUT, 1.6); }
      circle(ctx, 0, 0, 11, '#7fd8ff', OUT, 2); circle(ctx, -3, -3, 4, '#ffffff');
    } else if (el === 'bolt') {
      circle(ctx, 0, 0, 12, '#fff6b0', OUT, 2);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.floor(t * 8) * 0.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 14 + 3, Math.sin(a) * 14 - 3); ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.strokeStyle = '#ffe45a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke(); }
    } else {
      circle(ctx, 0, 0, 20, '#10041e', '#a05aff', 2.4);
      for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; ctx.beginPath(); ctx.arc(0, 0, 9 + i * 4, a, a + 2.2); ctx.strokeStyle = rgba('#c8a0ff', 0.8 - i * 0.2); ctx.lineWidth = 2; ctx.stroke(); }
      circle(ctx, 0, 0, 5, '#000000');
    }
    // two eyes, so it reads as a thing that follows you
    circle(ctx, 8, -4, 2, '#ffffff'); circle(ctx, 8, 4, 2, '#ffffff');
  };
  function archmage(ctx, st) {
    const props = st.props || {}, t = st.t || 0;
    const el = ELS.find(e => props[e]) || null, hot = el ? COL[el] : '#7fe8e0';
    const cast = props.arc || el || props.rune || props.bind || props.conv || props.counter || props.swap || props.mark || props.burst || props.lance;
    const bob = Math.sin(t * 1.5) * 2;
    // seven rings turning round him, one for each element in turn
    for (let i = 0; i < 7; i++) {
      const el2 = ELS[i % 4], rad = 30 + i * 3.5, a0 = t * (0.6 + i * 0.13) * (i % 2 ? -1 : 1), lit = el === el2 || props.conv ? 1 : 0.35;
      ctx.beginPath(); ctx.arc(0, bob, rad, a0, a0 + 2.1 + (i % 3) * 0.5); ctx.strokeStyle = rgba(COL[el2], 0.35 + 0.5 * lit); ctx.lineWidth = 1.6 + lit; ctx.stroke();
      circle(ctx, Math.cos(a0) * rad, bob + Math.sin(a0) * rad, 1.9 + lit, rgba(COL[el2], 0.6 + 0.4 * lit));
    }
    glow(ctx, 0, bob, 56, hot, cast ? 0.4 : 0.18);
    // robe, drowned: a heavy teal gown with the hem trailing in strands of weed
    for (let i = 0; i < 7; i++) { const y = (i - 3) * 8.5, w = Math.sin(t * 2 + i) * 4; limb(ctx, [-14, bob + y * 0.7, -30 + w, bob + y, -46 + w * 1.6, bob + y * 1.1], i % 2 ? '#1f5a54' : '#2a6a60', 5); }
    ellipse(ctx, -2, bob, 23, 29, 0, '#17383e', OUT, 2.5);
    ellipse(ctx, -3, bob, 14, 22, 0, '#1f4d52');
    line(ctx, -10, bob - 24, -10, bob + 24, rgba('#d8b45a', 0.8), 2.4);
    // sleeves out in front, hands holding the orb between them
    const lift = cast ? 4 : 0;
    for (const sy of [-1, 1]) { limb(ctx, [4, bob + 18 * sy, 16, bob + (14 - lift) * sy, 27, bob + (9 - lift) * sy], '#17383e', 8); circle(ctx, 28, bob + (9 - lift) * sy, 3.6, '#c9b99a', OUT, 1.5); }
    const pulse = 0.8 + 0.2 * Math.sin(t * 5);
    glow(ctx, 31, bob, 24 + (cast ? 8 : 0), hot, 0.55 * pulse);
    circle(ctx, 31, bob, 7 + (cast ? 1.5 : 0), rgba(hot, 0.95), OUT, 2); circle(ctx, 29, bob - 2, 2.6, '#ffffff');
    if (el) glyph(ctx, el, 31, bob, 4.4, '#10222a', 1.6);
    // hood, a pale face in it, eyes lit in the colour of what he is calling
    circle(ctx, 6, bob, 12.5, '#0d2a30', OUT, 2.5);
    circle(ctx, 9, bob, 8, '#d8e0d4', OUT, 1.6);
    circle(ctx, 12, bob - 3.2, 1.9, hot); circle(ctx, 12, bob + 3.2, 1.9, hot); glow(ctx, 12, bob, 10, hot, 0.55);
    // a crown of broken coral
    for (let k = 0; k < 5; k++) { const a = -1.2 + k * 0.6; poly(ctx, [4 + Math.cos(a - 0.12) * 12, bob + Math.sin(a - 0.12) * 12, 4 + Math.cos(a) * 19, bob + Math.sin(a) * 19, 4 + Math.cos(a + 0.12) * 12, bob + Math.sin(a + 0.12) * 12], '#e8a890', OUT, 1.2); }
  }
  return { tell, impact, glyph, buildTower, towerLife, runeLink, elementalArt, archmage };
})();

// his body and the four elementals he calls
BOSS_ART.archmage = AZ_ART.archmage;
ADD_ART.azfire = AZ_ART.elementalArt('fire'); ADD_ART.azfrost = AZ_ART.elementalArt('frost'); ADD_ART.azbolt = AZ_ART.elementalArt('bolt'); ADD_ART.azvoid = AZ_ART.elementalArt('void');

// the tower floor, its life, and the rune link
ArenaView.buildTower = AZ_ART.buildTower;
ArenaView.towerLife = AZ_ART.towerLife;
ArenaView.runeLink = AZ_ART.runeLink;

