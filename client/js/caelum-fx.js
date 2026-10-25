// Caelum Vey, the Starborn: how every move of his looks on the floor and when it lands. His body, rooms and props live in
// caelum-art.js and arena-view.js; this file is the moves: the silver afterimages that foretell every cut (ArenaView.drawRoomOver),
// the meteor's shadow (ArenaView.drawZones, from roomev 'clshadow'), the Starwyrm, a serpent of stars on its painted path (roomev
// 'clwyrm:<n>', on the clients' clock the way Brannoc's wheel runs its path), Ascendant and Grace Withdrawn (room moments), the
// warnings painted inside the red and blue outlines (boss-tells.js get() / buster), the burning zones, what each move does when it
// lands and what it leaves behind (boss-vfx.js impact(), boss-tells.js track()), the Dark Ember and the broken star-shards
// (propfx), and the enrage, entrance and fall. Loaded after caelum-art.js; the other files reach it through CL_FX and every call
// is guarded by `typeof CL_FX !== 'undefined'`.
// The rule as everywhere: the red (or blue) outline marks the exact area and is drawn by boss-tells.js; what is painted inside is
// the clue, and safe floor is never painted: the Horizon Cut's gap and the shadows behind the star stay clear floor (the light of
// Constellation Fall is cut away from them by the shared cover code, never drawn over them). No text in the fight: the order of
// the afterimages is a count of pips and a falling-off of light. The look follows the painted sheets (docs/art/vfx-reference/
// caelum-*.png): black glass and white-silver light, star-dust, deep night violet, the orange-red meteor, gold and white on the cloud.

const CL_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, q) => a + (b - a) * q;
  const easeIn = q => q * q;
  const easeIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q));
  const C = {
    silver: '#d6dcf0', silverHi: '#f4f7ff', silverLo: '#8f9ac0', deep: '#05060e', glass: '#0b0d19', violet: '#8c70ff', violetHi: '#cdbfff', violetDk: '#2a1f5e',
    ember: '#ff9a4a', emberHi: '#ffd890', fire: '#ff5a1a', fireDk: '#8a1f08', star: '#fff6dc', gold: '#ffd36a', goldHi: '#fff0b8', goldDk: '#8a5a12',
    cloud: '#e8ecf8', navy: '#1a1f48', ink: '#0a0c1c', white: '#ffffff',
  };
  const AR = () => ARENA.R;
  const clipRoom = c => { ARENA.trace(c, 4); c.clip(); };
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  // what the moves remember between frames: when the camera last held, the one-shots a room moment has already fired, the figures
  // already drawn once (sprites), the shadow's smoothed size
  const S = { camAt: -99, fired: new Set(), spr: new Map(), sh: null, tg: new WeakMap() };
  const evs = () => (typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.ev) || {};
  const isSky = () => { const e = evs(); return !!(e.form && e.form.form === 'sky'); };
  // the line colours: silver on the dark crater, gold on the pale cloud (a silver line would be lost on white)
  const pal = () => (isSky() ? { core: '#f0b840', hi: '#fff4cc', ink: '#2a1c06', soft: '#ffd36a', ghost: '#5560a0' } : { core: C.silver, hi: '#ffffff', ink: C.deep, soft: C.violetHi, ghost: C.silver });
  // the camera holds for a beat when something big lands (the existing hook: main.js FX.cam); never more than once in a few seconds
  function cam(stop = 0.1, punch = 0.035, dur = 0.5, gap = 3) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };
  // one-shots for a room moment: true the first time a key is asked
  const once = key => { if (S.fired.has(key)) return false; S.fired.add(key); if (S.fired.size > 400) S.fired.clear(); return true; };
  // how far a line from (x, y) along a runs before it meets the wall
  const wall = (x, y, a, max = 2400) => { const c = Math.cos(a), s = Math.sin(a); let d = 0; while (d < max && ARENA.sd(x + c * d, y + s * d) < -10) d += 12; return d; };
  const inPoly = (poly, x, y) => { let r = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r; } return r; };

  // ---------------------------------------------------------------- small painted pieces
  // a rect telegraph drawn in its own frame: x runs down the lane, y across it
  function lane(ctx, s, fn, full) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    fn(full ? s.len : Math.min(s.len, AR() * 2.3), s.w / 2); ctx.restore();
  }
  // a four-pointed star: a glow, the long thin star, a short fat one over it
  function star4(c, x, y, r, rot, col, hi, k) {
    if (k <= 0.01 || r <= 0.3) return;
    glow(c, x, y, r * 2.6, col, 0.5 * k);
    c.save(); c.translate(x, y); c.rotate(rot);
    for (const [R, w, f, a] of [[r * 1.7, 0.16, col, 0.85], [r, 0.3, hi, 1]]) {
      c.beginPath();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? R * w : R, an = i * Math.PI / 4; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(rr, 0); }
      c.closePath(); c.fillStyle = rgba(f, Math.min(1, a * k)); c.fill();
    }
    c.restore();
  }
  function zigPath(ctx, x1, y1, x2, y2, seed, jag = 8, seg = 26) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / seg)), nx = -dy / L, ny = dx / L;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n, o = (hash(i, seed) - 0.5) * 2 * jag; ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
    ctx.lineTo(x2, y2);
  }
  // a crack in black glass: a dark edge, a bright body
  function crackLine(ctx, x1, y1, x2, y2, seed, k, o = {}) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); zigPath(ctx, x1, y1, x2, y2, seed, o.jag ?? 8, o.seg ?? 24);
    ctx.strokeStyle = rgba(o.ink || C.deep, 0.55 * k); ctx.lineWidth = (o.w || 2) + 2.4; ctx.stroke();
    ctx.strokeStyle = rgba(o.col || C.silverHi, k); ctx.lineWidth = o.w || 2; ctx.stroke();
    ctx.restore();
  }
  function crackStar(ctx, x, y, r, n, seed, k, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, seed) * 0.6, d = r * (0.55 + 0.45 * hash(i, seed + 1));
      crackLine(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * d, y + Math.sin(a) * d * (o.flat ?? 0.8), seed + i, k, { w: o.w || 1.8, jag: o.jag ?? 7, seg: 20, col: o.col });
    }
  }
  // silver shards and star-dust thrown off a point
  function dust(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(40, o.speed || 190);
      VFX.spawn({ x, y, z: rand(4, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(40, 150), g: 200, drag: 0.03, life: rand(0.7, 1.5), size: rand(5, 10) * (o.size || 1), size1: 0,
        color: o.color || (i % 3 ? '#ffffff' : C.silver), kind: i % 2 ? 'star' : 'glow', vr: rand(-5, 5) });
    }
  }
  function shards(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(o.min || 110, o.speed || 330);
      VFX.spawn({ x, y, z: rand(10, 40), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(90, 260), g: 560, life: rand(0.7, 1.1), size: rand(9, 15) * (o.size || 1), color: i % 3 ? (o.color || '#dfe5fa') : (o.color2 || '#8f9ac0'), kind: 'shard', add: false, vr: rand(-12, 12) });
    }
  }
  const polyOf = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };

  // ---------------------------------------------------------------- the figures: him, and the three before him, as silver ghosts
  // Drawn once with their own art onto a small layer, tinted there, remembered per facing, and laid on the scene.
  const BODY = {
    caelum: { box: 540, k: 1.3, oy: 0.64, tint: '#cfd6f2' },
    corvane: { box: 420, k: 1.3, oy: 0.56, tint: '#dfeaff' },
    brannoc: { box: 640, k: 1.2, oy: 0.56, tint: '#ffe9a8' },
    morrowoak: { box: 760, k: 0.9, oy: 0.56, tint: '#d8c8f4', tA: 0.5 },
  };
  const STATE = {
    caelum: () => ({ t: 0.4, moving: false, action: null, phase: 0, props: { clWake: true } }),
    corvane: () => ({ t: 0.4, moving: false, action: null, phase: 0, props: { stance: 'parting', notch: 0, over: 0 } }),
    brannoc: () => ({ t: 0.4, moving: false, action: null, phase: 0, props: {} }),
    morrowoak: () => ({ t: 0.4, moving: false, action: null, phase: 0, props: {} }),
  };
  function spriteOf(who, face) {
    const cfg = BODY[who];
    if (!cfg || typeof document === 'undefined' || typeof BOSS_ART === 'undefined' || !BOSS_ART[who]) return null;
    const qf = Math.round((((face % TAU) + TAU) % TAU) / TAU * 24) % 24, sky = isSky() ? 1 : 0, key = who + qf + sky;
    let e = S.spr.get(key); if (e) return e;
    if (S.spr.size > 90) S.spr.clear();
    const Q = 1.2, N = Math.ceil(cfg.box * Q), cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d'), ang = qf * TAU / 24;
    c.setTransform(Q, 0, 0, Q, N / 2, N * cfg.oy);
    try { c.scale(cfg.k, cfg.k); c.rotate(ang); BOSS_ART[who](c, STATE[who](), ang); } catch (err) { /* a body that will not draw leaves an empty ghost */ }
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop';
    // silver on the dark crater, a cool blue-grey on the pale cloud (a pale ghost would vanish there)
    if (sky && who === 'caelum') { c.globalAlpha = 0.5; c.fillStyle = '#3a4684'; c.fillRect(0, 0, N, N); c.globalAlpha = 0.18; c.fillStyle = '#ffffff'; c.fillRect(0, 0, N, N); }
    else { c.globalAlpha = cfg.tA ?? 0.42; c.fillStyle = cfg.tint; c.fillRect(0, 0, N, N); c.globalAlpha = 0.1; c.fillStyle = '#ffffff'; c.fillRect(0, 0, N, N); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    e = { cv, box: cfg.box, oy: cfg.oy, N }; S.spr.set(key, e); return e;
  }
  // a figure laid on the scene at (x, y), its body centre there (where the boss's own art is drawn)
  function ghostFig(ctx, who, x, y, face, a, o = {}) {
    if (a <= 0.01) return null;
    const sp = spriteOf(who, face); if (!sp) return null;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a) * 0.74; ctx.drawImage(sp.cv, x - sp.box / 2, y - sp.box * sp.oy + (o.dy || 0), sp.box, sp.box);
    if (!(isSky() && who === 'caelum')) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.3; ctx.drawImage(sp.cv, x - sp.box / 2, y - sp.box * sp.oy + (o.dy || 0), sp.box, sp.box); }
    ctx.restore();
    return sp;
  }
  // the figure breaking into silver pieces that drift apart and fade (q 0..1)
  function shatterFig(ctx, sp, x, y, q, seed) {
    if (!sp || q >= 1) return;
    const n = 9, cx = x, cy = y - 70, R = 260, fade = Math.pow(1 - q, 1.3);
    for (let i = 0; i < n; i++) {
      const a0 = i * TAU / n + (hash(i, seed) - 0.5) * 0.3, a1 = (i + 1) * TAU / n + (hash(i + 1, seed) - 0.5) * 0.3, am = (a0 + a1) / 2, off = easeOut(q) * (50 + 60 * hash(i, seed + 2)), rot = (hash(i, seed + 3) - 0.5) * 0.5 * q;
      ctx.save();
      ctx.translate(cx + Math.cos(am) * off, cy + Math.sin(am) * off * 0.85 + q * q * 40); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); ctx.closePath(); ctx.clip();
      ctx.globalAlpha *= 0.62 * fade;
      ctx.drawImage(sp.cv, -sp.box / 2, -sp.box * sp.oy + (y - cy), sp.box, sp.box);
      ctx.restore();
    }
  }
  // pips in rows of four (a count that can be read at a glance, never a digit)
  function pips(ctx, x, y, n, k, col, hi, t, hot) {
    for (let j = 0; j < n; j++) {
      const row = Math.floor(j / 4), cnt = Math.min(4, n - row * 4), idx = j - row * 4, px = x + (idx - (cnt - 1) / 2) * 16, py = y + row * 15;
      star4(ctx, px, py, hot ? 5.6 + 0.9 * Math.sin(t * 7 + j) : 4.6, 0, col, hi, Math.min(1, k * 1.3));
    }
  }

  // ---------------------------------------------------------------- the afterimages (roomev 'climgs:<n>', 'clchorus:<n>')
  // Each is a see-through silver copy of him standing where he will be, facing the next; its place in the order shows in a count of
  // pips over its head and in how bright it burns (the next to be cut brightest, the rest falling off), with a thread of light to
  // the next. It shatters into silver pieces as he cuts through it. The cuts' own telegraphs say when: each image waits for the
  // telegraph that ends on it.
  function landOf(ev, i, env, key) {
    if (!ev._tg) ev._tg = [];
    let tg = ev._tg[i];
    if (!tg && env && env.tgs) {
      const L = ev.l[i];
      for (const o of env.tgs.values()) {
        if ((o.tag !== 'clWake' && o.tag !== 'clGlint') || Math.abs(o.start - ev.start) > 0.6) continue;
        const s = o.live, ex = s.x + Math.cos(s.angle) * s.len, ey = s.y + Math.sin(s.angle) * s.len;
        if (Math.hypot(ex - L[0], ey - L[1]) < 14) { tg = ev._tg[i] = o; break; }
      }
    }
    if (tg) return tg.gone != null ? tg.gone : tg.start + tg.dur;
    return ev.end - 0.7 - (ev.l.length - 1 - i) * 0.1;
  }
  function images(ctx, key, ev, t, env) {
    const l = ev.l; if (!l || !l.length) return;
    const P = pal(), land = l.map((_, i) => landOf(ev, i, env, key));
    // (the order a cut will fall in: images already cut do not count)
    const live = l.map((q, i) => i).filter(i => t < land[i]);
    const rank = new Map(); live.forEach((i, r) => rank.set(i, r));
    const order = l.map((q, i) => i).sort((a, b) => l[a][1] - l[b][1]);
    // the thread: from each live image on to the next one, a faint dashed light running the way he will go
    ctx.save(); ctx.lineCap = 'round';
    for (let r = 0; r + 1 < live.length; r++) {
      const A = l[live[r]], B = l[live[r + 1]];
      if (live[r + 1] !== live[r] + 1) continue;
      const k = clamp((t - ev.start - live[r] * 0.07) / 0.5, 0, 1) * clamp((ev.end - t) / 0.4, 0, 1) * (r === 0 ? 1 : 0.7), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(A[0] + dx / L * 46, A[1] + dy / L * 46); ctx.lineTo(B[0] - dx / L * 46, B[1] - dy / L * 46);
      ctx.strokeStyle = rgba(P.core, 0.42 * k); ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
      const u = (t * 0.9 + live[r] * 0.31) % 1; glow(ctx, A[0] + dx * (0.15 + 0.7 * u), A[1] + dy * (0.15 + 0.7 * u), 9, P.hi, 0.5 * k * Math.sin(u * Math.PI));
    }
    ctx.restore();
    // Starlight: the last cut lets go a ring of silver across the room (roomev fl: the dance ends in a flare that touches everyone)
    if (ev.fl && l.length > 1) {
      const u = (t - Math.max(...land) - 0.25) / 0.9;
      if (u > 0 && u < 1) { const q = l[l.length - 1], R = 40 + 640 * easeOut(u); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ellipse(ctx, q[0], q[1] + 30, R, R * 0.8, 0, rgba(P.core, 0.05 * (1 - u)), rgba(P.hi, 0.6 * (1 - u)), 3); ctx.restore(); }
    }
    for (const i of order) {
      const [x, y, n, face] = l[i], born = ev.start + i * 0.07, a0 = easeOut(clamp((t - born) / 0.45, 0, 1)), since = t - land[i];
      if (a0 <= 0.01) continue;
      const nextOne = rank.get(i) === 0, rk = rank.has(i) ? rank.get(i) : 0, bright = Math.max(0.46, 1 - 0.07 * rk);
      const out = clamp((ev.end - t) / 0.4, 0, 1);
      if (since >= 0) {
        // cut through: the figure comes apart
        if (since < 0.7) {
          const sp = spriteOf('caelum', face);
          ctx.save(); glow(ctx, x, y - 40, 90 * (1 - since / 0.7), P.hi, 0.5 * (1 - since / 0.7)); ctx.restore();
          shatterFig(ctx, sp, x, y, since / 0.7, Math.round(x + y * 3));
          ellipse(ctx, x, y + 48, 30 + 70 * easeOut(since / 0.5), 12 + 24 * easeOut(since / 0.5), 0, null, rgba(P.hi, 0.6 * (1 - since / 0.5 > 0 ? 1 - since / 0.5 : 0)), 2);
        }
        continue;
      }
      const flick = 0.9 + 0.1 * Math.sin(t * 3 + n * 1.7), near = nextOne ? clamp(1 - (land[i] - t) / 0.7, 0, 1) : 0;
      // the ring on the floor where he will stand
      ctx.save();
      const pulse = nextOne ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
      ellipse(ctx, x, y + 48, 38 + 16 * (1 - a0) + 4 * pulse + 10 * near, 14 + 6 * (1 - a0) + 2 * pulse + 4 * near, 0, rgba(P.core, 0.1 * a0 * bright), rgba(P.hi, (0.4 + 0.4 * bright + 0.2 * near) * a0 * out), nextOne ? 2.4 : 1.6);
      glow(ctx, x, y + 20, 80, P.core, 0.18 * a0 * bright * out);
      ctx.restore();
      ghostFig(ctx, 'caelum', x, y - (1 - a0) * 10, face, a0 * bright * flick * out);
      // the blade drawn: light gathers into the figure as the cut comes, and the steel flashes in the last beat
      if (near > 0.05) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 8; j++) { const aa = j * TAU / 8 + t * 2.2, rr = 14 + (1 - near) * 120 * (0.6 + 0.4 * hash(j, 71)); glow(ctx, x + Math.cos(aa) * rr, y - 46 + Math.sin(aa) * rr * 0.7, 4 + 2 * near, P.hi, 0.7 * near * out); }
        if (near > 0.72) { const gq = (near - 0.72) / 0.28; star4(ctx, x + Math.cos(face) * 38, y - 52 + Math.sin(face) * 26, 8 + 16 * gq, face + 0.8, P.core, P.hi, gq * out); glow(ctx, x, y - 40, 60 + 40 * gq, P.hi, 0.28 * gq * out); }
        ctx.restore();
      }
      // the way he will face: a chevron ahead of the figure
      if (ev.l.length > 1 || i === 0) {
        ctx.save(); ctx.translate(x + Math.cos(face) * 62, y + 40 + Math.sin(face) * 62 * 0.7); ctx.rotate(face);
        ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(3, 0); ctx.lineTo(-6, 7); ctx.strokeStyle = rgba(P.hi, 0.7 * a0 * bright * out); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      // the count, over his head
      pips(ctx, x, y + 72 + (1 - a0) * 8, n, a0 * (0.6 + 0.4 * bright) * out, P.core, P.hi, t, nextOne);
    }
  }
  // Chorus of the Fallen (Hard): a ghost of an earlier boss standing at its point for the dance, in its own colours
  const ECHO = { corvane: { ring: '#8fe0ff', hi: '#eaf8ff' }, brannoc: { ring: '#ffc23a', hi: '#fff0a8' }, morrowoak: { ring: '#a064ff', hi: '#dcc4ff' } };
  function chorus(ctx, key, ev, t) {
    const who = ev.who, E = ECHO[who] || ECHO.corvane, a = easeOut(clamp((t - ev.start) / 0.6, 0, 1)) * clamp((ev.end - t) / 0.5, 0, 1);
    if (a <= 0.01) return;
    const x = ev.x, y = ev.y;
    if (once('chorus:' + key + ev.start)) { dust(x, y, 10, { color: E.hi, speed: 140 }); VFX.shock(x, y, { r: 150, color: E.ring, w: 5, dur: 0.6, flat: 1 }); }
    ctx.save();
    for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; ellipse(ctx, x, y + 46, 30 + q * 90, 12 + q * 36, 0, null, rgba(E.ring, 0.5 * (1 - q) * a), 2); }
    ellipse(ctx, x, y + 46, 40, 15, 0, rgba(E.ring, 0.14 * a), rgba(E.hi, 0.7 * a), 2);
    glow(ctx, x, y + 10, 100, E.ring, 0.2 * a);
    ctx.restore();
    ghostFig(ctx, who, x, y + Math.sin(t * 1.4) * 3, Math.atan2(-y, -x), a * (0.85 + 0.1 * Math.sin(t * 2.3)));
    if (Math.random() < 0.3) VFX.spawn({ x: x + rand(-30, 30), y: y + 30, z: rand(0, 60), vz: rand(30, 80), life: 1, size: rand(5, 9), size1: 0, color: E.hi, kind: 'glow' });
  }

  // ---------------------------------------------------------------- the meteor's shadow (roomev 'clshadow': its latest state)
  // A dark disc under everything else on the floor, centred on the star, soft at the edge, slowly breathing, embers drifting in it;
  // in the last act its floor smoulders and burns (it is then also the zone 'clShadowBurn', whose red outline zone() draws).
  function shadowState(ev, t) {
    let sh = S.sh;
    if (sh && t < sh.last - 1) sh = null;   // (the clock went back: a new pull)
    if (!sh) sh = S.sh = { r: ev.r, last: t, x: ev.x, y: ev.y, tr: ev.r, wave: -99, up: 1 };
    // the meteor's shadow moving (an act begins and it grows; a Dark Ember pushes it back): a pressure wave runs out of the rim (or in
    // to it) and the room shudders
    if (Math.abs(ev.r - sh.tr) > 20 && t > 0) { sh.wave = t; sh.up = ev.r > sh.tr ? 1 : -1; sh.tr = ev.r; shakeNow(sh.up > 0 ? 7 : 4); if (sh.up > 0) cam(0.06, 0.025, 0.5, 1.5); }
    sh.tr = ev.r;
    const dt = clamp(t - sh.last, 0, 0.1); sh.last = t;
    sh.r += (ev.r - sh.r) * (1 - Math.exp(-dt * 1.7)); sh.x = ev.x; sh.y = ev.y; sh.burn = ev.burn ? Math.min(1, (sh.burn || 0) + dt * 0.8) : Math.max(0, (sh.burn || 0) - dt);
    return sh;
  }
  function shadowFloor(ctx, room, t) {
    const ev = room && room.ev && room.ev.clshadow;
    if (!ev) { S.sh = null; return; }
    const sh = shadowState(ev, t), R = sh.r * (1 + 0.012 * Math.sin(t * 0.9)), x = sh.x, y = sh.y, sky = isSky(), bn = sh.burn * (S.graceEnd && t < S.graceEnd ? 0.35 : 1);   // (held while Grace Withdrawn has everyone at nothing)
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    const g = ctx.createRadialGradient(x, y, R * 0.1, x, y, R * 1.08);
    const c0 = sky ? '22,16,64' : '2,3,10';
    g.addColorStop(0, `rgba(${c0},${sky ? 0.62 : 0.68})`); g.addColorStop(0.72, `rgba(${c0},${sky ? 0.55 : 0.6})`); g.addColorStop(0.93, `rgba(${c0},${sky ? 0.3 : 0.34})`); g.addColorStop(1, `rgba(${c0},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 1.08, 0, TAU); ctx.fill();
    // its rim: a faint violet shimmer, so the edge is a line that can be read
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.strokeStyle = rgba(C.violet, 0.1 + 0.05 * Math.sin(t * 1.3)); ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = rgba(C.violetHi, 0.1); ctx.lineWidth = 1.2; ctx.stroke();
    // embers drifting up in the dark
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const ph = (t * (0.07 + 0.05 * hash(i, 1)) + hash(i, 2)) % 1, a = hash(i, 3) * TAU, rr = Math.sqrt(hash(i, 4)) * R * 0.92;
      const px = x + Math.cos(a) * rr + Math.sin(t * 0.8 + i) * 6, py = y + Math.sin(a) * rr * 0.9 - ph * 46, al = Math.sin(ph * Math.PI) * (0.28 + 0.2 * bn);
      glow(ctx, px, py, 5 + 4 * hash(i, 5), hash(i, 6) < 0.5 ? C.ember : C.violetHi, al);
    }
    if (bn > 0.01) shadowBurn(ctx, x, y, R, t, bn);
    // the wave: a dark ring with a bright lip, going out across the floor as the shadow spreads (or closing in on its edge when pushed back)
    const wu = (t - sh.wave) / 1.5;
    if (wu >= 0 && wu < 1) {
      const rr = sh.up > 0 ? R + 170 * easeOut(wu) : R + 170 * (1 - easeOut(wu)), wk = (1 - wu) * (1 - wu);
      ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.strokeStyle = rgba(C.deep, 0.5 * wk); ctx.lineWidth = 26 * (1 - wu * 0.5); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(sh.up > 0 ? C.violetHi : '#ffffff', 0.55 * wk); ctx.lineWidth = 3.4; ctx.stroke();
      for (let i = 0; i < 18; i++) { const a = hash(i, 91) * TAU + wu, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.92; glow(ctx, px, py - 10 * wu, 7, i % 2 ? C.ember : C.violetHi, 0.5 * wk); }
    }
    ctx.restore();
  }
  // the shadow's floor burning: cracks of ember light across it, a heat that breathes, flames standing along its edge
  function shadowBurn(ctx, x, y, R, t, bn) {
    ctx.globalCompositeOperation = 'lighter';
    const heat = 0.5 + 0.5 * Math.sin(t * 1.9);
    const g = ctx.createRadialGradient(x, y, R * 0.2, x, y, R);
    g.addColorStop(0, rgba(C.fireDk, 0.1 * bn)); g.addColorStop(0.7, rgba(C.fire, (0.1 + 0.05 * heat) * bn)); g.addColorStop(1, rgba(C.ember, (0.26 + 0.1 * heat) * bn));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + hash(i, 11) * 0.3, r0 = R * (0.12 + 0.5 * hash(i, 12)), r1 = Math.min(R * 0.97, r0 + R * (0.3 + 0.4 * hash(i, 13)));
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
      ctx.beginPath(); zigPath(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, i * 3, 9, 24);
      ctx.strokeStyle = rgba(C.fire, 0.3 * bn * (0.5 + 0.5 * pulse)); ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = rgba(C.emberHi, 0.55 * bn * (0.4 + 0.6 * pulse)); ctx.lineWidth = 1.6; ctx.stroke();
    }
    // flames along the edge
    const n = Math.round(R / 7);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, 21) * 0.05, fl = (0.5 + 0.5 * Math.sin(t * (4 + 3 * hash(i, 22)) + i * 2.3)) * (0.55 + 0.45 * hash(i, 23)), h = (12 + 34 * fl) * bn, bx = x + Math.cos(a) * R * 0.99, by = y + Math.sin(a) * R * 0.99;
      const w = 5 + 3 * hash(i, 24);
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.8, by - h * 0.55, bx + Math.sin(t * 3 + i) * 3, by - h); ctx.quadraticCurveTo(bx + w * 0.8, by - h * 0.55, bx + w, by); ctx.closePath();
      ctx.fillStyle = rgba(i % 3 ? C.fire : C.ember, 0.4 * bn * (0.4 + 0.6 * fl)); ctx.fill();
    }
    for (let i = 0; i < 22; i++) {
      const ph = (t * 0.5 + hash(i, 31)) % 1, a = hash(i, 32) * TAU, rr = Math.sqrt(hash(i, 33)) * R * 0.95;
      glow(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9 - ph * 60, 4 + 3 * hash(i, 34), C.emberHi, Math.sin(ph * Math.PI) * 0.6 * bn);
    }
  }

  // a Dark Ember set down in the wrong place: black glass scorched, ember light in the cracks, flames standing out of it, a red rim
  function puddle(ctx, p, r, k, t) {
    ctx.save(); ctx.globalAlpha = k;
    ctx.beginPath(); for (let i = 0; i <= 22; i++) { const a = i * TAU / 22, w = 1 + Math.sin(a * 5 + p.id) * 0.07 + Math.sin(a * 9) * 0.03, x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w * 0.92; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.1, p.x, p.y, r); g.addColorStop(0, '#0a0306'); g.addColorStop(0.7, '#1a0a0c'); g.addColorStop(1, '#3a1208');
    ctx.fillStyle = g; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#05101c', 0.7); ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85); ctx.lineWidth = 2.6; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + hash(i, p.id) * 0.4, pulse = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); ctx.beginPath(); zigPath(ctx, p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6, p.x + Math.cos(a) * r * 0.95, p.y + Math.sin(a) * r * 0.95, i + p.id, 5, 14); ctx.strokeStyle = rgba(C.fire, 0.4 * (0.4 + 0.6 * pulse)); ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = rgba(C.emberHi, 0.7 * (0.3 + 0.7 * pulse)); ctx.lineWidth = 1.3; ctx.stroke(); }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + hash(i, 5), d = r * (0.2 + 0.7 * hash(i, 6)), fl = 0.5 + 0.5 * Math.sin(t * (4 + 3 * hash(i, 7)) + i * 2.3), h = 12 + 24 * fl, bx = p.x + Math.cos(a) * d, by = p.y + Math.sin(a) * d * 0.9, w = 4 + 3 * hash(i, 8);
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.8, by - h * 0.5, bx + Math.sin(t * 3 + i) * 2, by - h); ctx.quadraticCurveTo(bx + w * 0.8, by - h * 0.5, bx + w, by); ctx.closePath();
      ctx.fillStyle = rgba(i % 2 ? C.fire : C.ember, 0.55 * (0.4 + 0.6 * fl)); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the lasting zones (ArenaView.drawZones hands them over)
  // the red rim of a zone: dashed while it is only a warning, solid once it burns
  function zoneRim(ctx, s, k, live, t) {
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip(); SHAPES.trace(ctx, s); ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#05101c', 0.6 * k); ctx.lineWidth = 7; ctx.stroke();
    if (!live) { ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 24; }
    ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85 * k); ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function zone(ctx, z, k, t) {
    const s = z.shape;
    // while Grace Withdrawn holds everyone at nothing the fire is held too: its rim goes dim and dashed, and it does not burn
    const held = S.graceEnd && t < S.graceEnd;
    if (held) { k *= 0.45; if (z.tag === 'clShadowBurn') { const sh = S.sh; zoneRim(ctx, sh ? Object.assign({}, s, { r: sh.r, kind: 'circle' }) : s, k, false, t); return; } }
    if (z.tag === 'clShadowBurn') {
      // (the burning itself is part of the shadow, which draws under every zone: this is only its outline, following the shadow as it grows)
      const sh = S.sh, q = sh ? Object.assign({}, s, { r: sh.r * (1 + 0.012 * Math.sin(t * 0.9)), kind: 'circle' }) : s;
      zoneRim(ctx, q, k, true, t); return;
    }
    // Cinder Crown's ring of fire: black glass scorched, violet-white flames standing on it
    const ending = clamp(1 - (z.end - t) / 1.2, 0, 1), kk = k * (1 - ending * 0.7), mid = (s.r + s.r2) / 2, hw = (s.r - s.r2) / 2;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#0a0618', 0.34 * kk); ctx.fill('evenodd');
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(s.x, s.y, s.r2, s.x, s.y, s.r); g.addColorStop(0, rgba(C.violet, 0.1 * kk)); g.addColorStop(0.5, rgba(C.violetHi, 0.22 * kk)); g.addColorStop(1, rgba(C.violet, 0.08 * kk));
    ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    const n = Math.round(TAU * mid / 15);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, 5) * 0.08, fl = 0.5 + 0.5 * Math.sin(t * (5 + 3 * hash(i, 6)) + i * 2.1), h = (14 + 30 * fl * (0.5 + hash(i, 7))) * kk, rr = mid + (hash(i, 8) - 0.5) * hw * 1.1, bx = s.x + Math.cos(a) * rr, by = s.y + Math.sin(a) * rr, w = 4.5 + 3 * hash(i, 9);
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.8, by - h * 0.55, bx + Math.sin(t * 3 + i) * 2.5, by - h); ctx.quadraticCurveTo(bx + w * 0.8, by - h * 0.55, bx + w, by); ctx.closePath();
      ctx.fillStyle = rgba(i % 4 ? C.violet : C.violetHi, 0.5 * kk * (0.45 + 0.55 * fl)); ctx.fill();
      if (i % 5 === 0) glow(ctx, bx, by - h * 0.5, 14, i % 2 ? C.ember : C.violetHi, 0.4 * kk * fl);
    }
    for (let i = 0; i < 14; i++) { const ph = (t * 0.6 + hash(i, 10)) % 1, a = hash(i, 11) * TAU, rr = lerp(s.r2 + 8, s.r - 8, hash(i, 12)); glow(ctx, s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr - ph * 50, 4, C.emberHi, Math.sin(ph * Math.PI) * 0.6 * kk); }
    ctx.restore();
    zoneRim(ctx, s, kk, true, t);
  }

  // ---------------------------------------------------------------- the Starwyrm (roomev 'clsummon', 'clwyrm:<n>', 'clrear')
  // The constellations above the crater come loose and knot into a serpent made of stars: bright constellation points joined by faint
  // lines, its head a knot of stars. It runs the coil round the room from `at` at `sp` (the message's own path, on the clients'
  // clock), rears on the rim and gathers light for Constellation Fall, and unravels. The Second Coil's dive (Hard) is the same
  // serpent running straight across.
  const NN = 38, GAP = 27;
  const homeOf = (i, t, T, g) => {
    const c = Math.floor(i / 13) % 3, fc = [[-330, 80, 240], [330, 50, 215], [0, 110, 290]][c], a = hash(i, 41) * TAU, r = 28 + hash(i, 42) * 118;
    const hx = fc[0] + Math.cos(a) * r * 1.25 + Math.sin(t * 0.4 + i) * 7, hy = fc[1] + Math.sin(a) * r * 0.5 + Math.cos(t * 0.33 + i * 1.3) * 5, hz = fc[2] + (hash(i, 43) - 0.5) * 90 + Math.sin(t * 0.5 + i) * 5;
    // coming loose: each point leaves its place and wheels in toward the middle of the sky
    const oa = i * 0.7 + t * (0.8 + 0.2 * (i % 3)), orr = 60 + 10 * (i % 7), ox = Math.cos(oa) * orr, oy = 20 + Math.sin(oa) * orr * 0.45, oz = 230 + Math.sin(oa) * 24;
    return [lerp(hx, ox, g), lerp(hy, oy, g), lerp(hz, oz, g)];
  };
  function ringOf(w) {
    if (w._cl) return w._cl;
    const l = w.l, x0 = l[0][0], y0 = l[0][1], x1 = (l[1] || l[0])[0], y1 = (l[1] || l[0])[1];
    return (w._cl = { R: Math.hypot(x0, y0) || 455, a0: Math.atan2(y0, x0), dir: x0 * y1 - y0 * x1 >= 0 ? 1 : -1, begin: w.start + (w.at || 0) });
  }
  const ringAt = (r, s, lat) => { const a = r.a0 + r.dir * s / r.R, rr = r.R + lat; return [Math.cos(a) * rr, Math.sin(a) * rr, a]; };
  // the head: a knot of stars joined in the shape of a horned head, jaw opening as it gathers light (local frame, facing +x)
  const HEAD_UP = [[36, 0], [25, -6], [12, -13], [0, -12], [-5, -31], [-17, -19], [-23, -5], [-38, 0]];
  const HEAD_LOW = [[22, 5], [36, 3]];
  function head(c, x, y, ang, scale, mouth, t, al, o) {
    c.save(); c.translate(x, y); c.rotate(ang); if (Math.cos(ang) < 0) c.scale(1, -1); c.scale(scale, scale);
    const m = mouth * 0.62, hx = -2, hy = 3, ca = Math.cos(m), sa = Math.sin(m);
    const low = HEAD_LOW.map(([px, py]) => [hx + (px - hx) * ca - (py - hy) * sa, hy + (px - hx) * sa + (py - hy) * ca]);
    const line = (pts, w, col, a) => { c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = w; c.stroke(); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    const jaw = [[hx, hy], low[0], low[1]];
    if (o.ink) { line(HEAD_UP, 5, rgba(C.ink, 0.6), al); line(jaw, 5, rgba(C.ink, 0.6), al); }
    line(HEAD_UP, 6, rgba(C.gold, 0.12), al); line(jaw, 6, rgba(C.gold, 0.12), al);
    line(HEAD_UP, 1.7, rgba('#ffeebb', 0.9), al); line(jaw, 1.7, rgba('#ffeebb', 0.85), al);
    // a beard of light under the jaw, the brow ridge, a spur at the back of the skull
    line([[low[1][0] - 4, low[1][1] + 2], [14, 22 + mouth * 8], [2, 20 + mouth * 8]], 1.2, rgba('#ffeebb', 0.6), al);
    line([[12, -13], [4, -6], [-6, -4]], 1.2, rgba('#ffeebb', 0.5), al);
    line([[-23, -5], [-30, 8], [-40, 14]], 1.2, rgba('#ffeebb', 0.5), al);
    c.globalAlpha = 1;
    const pts = HEAD_UP.concat(low, [[hx, hy]]);
    pts.forEach(([px, py], i) => star4(c, px, py, 2.4 + (i === 0 || i === 4 ? 1.2 : 0), t * 0.5 + i, C.gold, '#ffffff', al * (0.7 + 0.3 * Math.sin(t * 5 + i))));
    star4(c, 11, -4.5, 4.6, t * 0.6, '#ffe9a0', '#ffffff', al);   // the eye
    c.restore();
  }
  // the serpent's points: where each one is now (its place in a constellation, or on the chain behind the head)
  function drawChain(c, nodes, t, o) {
    const al = o.al, add = o.add !== false, n = nodes.length;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (add) c.globalCompositeOperation = 'lighter';
    // a light on the floor under it, so its place on the ground can be read
    if (o.floorGlow) for (let i = 0; i < n; i += 2) { const q = nodes[i]; if (q.a > 0.05) glow(c, q.x, q.y + 4, 46 + (o.fat ? 30 : 0), C.gold, 0.1 * q.a * al); }
    const link = (A, B, w, col, a) => { if (A.a < 0.02 || B.a < 0.02) return; c.beginPath(); c.moveTo(A.x, A.y - A.z); c.lineTo(B.x, B.y - B.z); c.strokeStyle = col; c.globalAlpha = a * Math.min(A.a, B.a) * al; c.lineWidth = w; c.stroke(); };
    // the body: one stroke per layer through every point, so the glow does not pile up where the pieces meet
    let am = 0, cnt = 0; for (const q of nodes) if (q.a > 0.02) { am += q.a; cnt++; }
    if (cnt > 1) {
      am /= cnt;
      const body = (w, col, a) => {
        c.beginPath(); let pen = false;
        for (let i = 0; i < n; i++) { const q = nodes[i]; if (q.a < 0.02) { pen = false; continue; } if (i > 0 && i % 13 === 0 && o.seam < 0.6) pen = false; if (pen) c.lineTo(q.x, q.y - q.z); else c.moveTo(q.x, q.y - q.z); pen = true; }
        c.strokeStyle = col; c.globalAlpha = a * am * al * o.seam0; c.lineWidth = w; c.stroke();
      };
      if (o.ink) body(o.fat ? 12 : 8, rgba(C.ink, 0.5), 0.7);
      body(o.fat ? 46 : 30, rgba(C.gold, 0.07), 1); body(o.fat ? 18 : 12, rgba(C.gold, 0.14), 1); body(o.fat ? 5 : 3.2, rgba('#fff4cc', 0.9), 0.85);
    }
    for (let i = 0; i + 1 < n; i++) {
      const A = nodes[i], B = nodes[i + 1];
      if (i % 2 === 0 && i + 3 < n) link(A, nodes[i + 3], 1.6, rgba('#ffeebb', 0.5), 0.5 * o.web);
      if (i % 3 === 1 && i + 2 < n) link(A, nodes[i + 2], 1.6, rgba('#ffeebb', 0.5), 0.42 * o.web);
    }
    c.globalAlpha = 1;
    for (let i = n - 1; i >= 0; i--) {
      const q = nodes[i]; if (q.a < 0.03) continue;
      const tw = 0.65 + 0.35 * Math.sin(t * (3 + 2 * hash(i, 51)) + i * 1.9), r = (5.4 + 5 * hash(i, 52)) * (i < 6 ? 1.45 : 1) * (o.fat ? 1.3 : 1);
      star4(c, q.x, q.y - q.z, r, t * 0.4 + i, hash(i, 53) < 0.6 ? C.gold : C.silver, '#ffffff', q.a * al * tw);
    }
    if (o.head) head(c, o.head.x, o.head.y - o.head.z, o.head.a, o.head.s, o.head.mouth, t, al * nodes[0].a, o);
    c.restore();
  }
  function wyrm(ctx, room, t) {
    const e = room.ev, sum = e.clsummon; if (!sum || t < sum.start) return;
    let wy = null;
    for (const k in e) if (k.startsWith('clwyrm:')) { const w = e[k]; if (!w.dive && w.start >= sum.start - 0.5 && w.start <= sum.start + 14 && (!wy || w.start < wy.start)) wy = w; }
    const rear = e.clrear && e.clrear.start >= sum.start - 0.5 ? e.clrear : null;
    const T = t - sum.start, U0 = rear ? rear.start + rear.dur - 2 + 0.3 : sum.end - 4, un = t - U0;
    if (un > 3.2) return;
    // he lifts the blade and the sky comes loose: a ring of gold goes out across the floor, the room shakes and the light flares once
    if (T >= 0.2 && T < 3 && once('sumboom' + sum.start)) {
      shakeNow(7); cam(0.08, 0.03, 0.6, 0); VFX.shock(0, 0, { r: 560, color: C.gold, w: 10, dur: 1.1, flat: 1 }); VFX.shock(0, 0, { r: 320, color: '#ffffff', w: 5, dur: 0.8, flat: 1, delay: 0.12 });
      screenFx(1.1, (c, W, Hh, tt, p, e) => { c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.22 * Math.pow(1 - clamp(tt / 1.0, 0, 1), 2) * e.a; c.fillStyle = '#ffeebb'; c.fillRect(0, 0, W, Hh); });
    }
    const fade = clamp(T / 1.2, 0, 1), gather = easeIn(clamp(T / 3.4, 0, 1)) * 0.78;
    const nodes = [], r = wy ? ringOf(wy) : null, sp = wy ? wy.sp || 470 : 470;
    let s = 0, lift = 0, mouth = 0, orb = 0, ha = 0, hs = 1;
    if (r) {
      s = t < r.begin ? 0 : sp * (t - r.begin);
      if (rear && t >= rear.start) {
        // it runs on round the ring to the place it will rear, then rises there
        const sc = sp * Math.max(0, rear.start - r.begin), thr = r.a0 + r.dir * sc / r.R, ra = Math.atan2(rear.y, rear.x);
        let da = ((ra - thr) * r.dir) % TAU; if (da < 0) da += TAU;
        const arc = da * r.R, Tg = Math.max(1.0, arc / 640), u = clamp((t - rear.start) / Tg, 0, 1), arrive = rear.start + Tg;
        s = sc + arc * (1 - (1 - u) * (1 - u));
        lift = easeOut(clamp((t - arrive) / 1.1, 0, 1));
        // it rears: the floor shudders and a ring of light goes out from where it rose
        if (t >= arrive && once('rear' + rear.start)) { shakeNow(8); VFX.shock(rear.x, rear.y, { r: 380, color: C.gold, w: 9, dur: 0.8, flat: 1 }); VFX.shock(rear.x, rear.y, { r: 220, color: '#ffffff', w: 5, dur: 0.6, flat: 1, delay: 0.1 }); dust(rear.x, rear.y, 14, { color: '#ffeebb', speed: 260 }); cam(0.07, 0.03, 0.5, 1.5); }
        orb = clamp((t - arrive - 0.5) / Math.max(0.5, rear.start + rear.dur - 2 - arrive - 0.5), 0, 1);
        mouth = clamp(lift * 1.2, 0, 1) * (0.6 + 0.4 * orb);
      }
    }
    const wob = t * 3.2;
    for (let i = 0; i < NN; i++) {
      const home = homeOf(i, t, T, gather);
      let x = home[0], y = home[1], z = home[2], a = fade;
      if (r) {
        const ui = clamp(easeIO(clamp((t - wy.start) / 1.5, 0, 1)) * 1.5 - i / NN * 0.5, 0, 1);
        if (ui > 0) {
          const neck = Math.pow(Math.max(0, 1 - i / 16), 1.6), latN = Math.pow(Math.max(0, 1 - i / 12), 1.2) * -45 * lift;
          const P = ringAt(r, s - i * GAP, 14 * Math.sin(i * 0.55 - wob) * (1 - lift * 0.7) + latN);
          const cz = 64 + 14 * Math.sin(i * 0.45 - t * 2.6) + lift * 125 * neck;
          x = lerp(x, P[0], ui); y = lerp(y, P[1], ui); z = lerp(z, cz, ui);
          if (i === 0) { const ta = P[2] + r.dir * Math.PI / 2, ia = Math.atan2(-P[1], -P[0]); let d = Math.atan2(Math.sin(ia - ta), Math.cos(ia - ta)); ha = ta + d * lift; }
        }
      }
      if (un > 0) { const q = clamp((un - i * 0.03) / 2.2, 0, 1); x += (hash(i, 61) - 0.5) * 260 * q; y += (hash(i, 62) - 0.5) * 160 * q; z += 40 * q + 150 * q * q; a *= 1 - q; }
      nodes.push({ x, y, z, a });
    }
    const wL = r ? clamp(easeIO(clamp((t - wy.start) / 1.5, 0, 1)), 0, 1) : 0, seam = lerp(0.2, 1, wL), web = un > 0 ? 0 : 1;
    const n0 = nodes[0], showHead = r && wL > 0.5;
    drawChain(ctx, nodes, t, { al: 1, seam, seam0: lerp(0.35, 1, wL), web, floorGlow: wL > 0.4, head: showHead ? { x: n0.x, y: n0.y, z: n0.z, a: ha, s: 2.1 + 0.55 * lift, mouth } : null });
    // the light it gathers at its mouth for Constellation Fall: drawn in towards the jaws
    if (orb > 0 && un < 0.4) {
      const hx = n0.x + Math.cos(ha) * 46 * 1.4, hy = n0.y - n0.z + Math.sin(ha) * 46 * 1.4 * 0.6, R = 14 + 120 * Math.pow(orb, 1.3), al = clamp(1 - un / 0.4, 0, 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, hx, hy, R * 2.2, C.gold, 0.5 * orb * al); glow(ctx, hx, hy, R, '#ffffff', 0.85 * orb * al);
      for (let i = 0; i < 14; i++) { const q = (t * 1.3 + hash(i, 71)) % 1, a = hash(i, 72) * TAU, d = R * (2.6 - 1.9 * q); ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * d * 1.1, hy + Math.sin(a) * d * 1.1); ctx.lineTo(hx + Math.cos(a) * d * 0.85, hy + Math.sin(a) * d * 0.85); ctx.strokeStyle = rgba('#fff4cc', 0.8 * q * orb * al); ctx.lineWidth = 1.6; ctx.stroke(); }
      ctx.restore();
    }
  }
  // Second Coil (Hard): the same serpent, fat and fast, straight across the painted line
  function dive(ctx, key, w, t) {
    const begin = w.start + (w.at || 0) - 0.5, sp = w.sp || 1400, L = Math.hypot(w.l[1][0] - w.l[0][0], w.l[1][1] - w.l[0][1]), a = Math.atan2(w.l[1][1] - w.l[0][1], w.l[1][0] - w.l[0][0]);
    const gap = 26, n = 40, s = sp * (t - begin);
    // before it comes: a star-light gathering where it will enter
    if (t < begin) {
      const ux = Math.cos(a), uy = Math.sin(a), bq = ux * w.l[0][0] + uy * w.l[0][1], cx = w.l[0][0] - ux * bq, cy = w.l[0][1] - uy * bq, hh = Math.sqrt(Math.max(0, AR() * AR() - (cx * cx + cy * cy))), ex = cx - ux * hh, ey = cy - uy * hh;
      const q = clamp(1 - (begin - t) / 2.2, 0, 1);
      ctx.save(); ctx.globalCompositeOperation = isSky() ? 'source-over' : 'lighter';
      glow(ctx, ex, ey, 60 + 70 * q, C.gold, 0.35 * q); glow(ctx, ex, ey, 24 + 24 * q, '#ffffff', 0.6 * q);
      for (let i = 0; i < 8; i++) star4(ctx, ex + Math.cos(t * 0.8 + i) * 40 * (1 - q * 0.4), ey + Math.sin(t * 0.8 + i * 1.7) * 30 * (1 - q * 0.4), 2.5 + 2 * hash(i, 3), t + i, C.gold, '#fff', q);
      ctx.restore();
      return;
    }
    if (s - n * gap > L + 60 || t > w.start + (w.at || 0) + 2.4) return;
    const nodes = [];
    for (let i = 0; i < n; i++) {
      const si = s - i * gap, lat = 26 * Math.sin(i * 0.38 - t * 7) * (i === 0 ? 0.3 : 1), x = w.l[0][0] + Math.cos(a) * si - Math.sin(a) * lat, y = w.l[0][1] + Math.sin(a) * si + Math.cos(a) * lat;
      const inside = si >= 0 && si <= L + 40 && ARENA.sd(x, y) < 40;
      nodes.push({ x, y, z: 70 + 26 * Math.sin(i * 0.4 - t * 6), a: inside ? clamp((L - si) / 80 + 1, 0, 1) : 0 });
    }
    const n0 = nodes[0];
    ctx.save(); clipRoom(ctx);
    drawChain(ctx, nodes, t, { al: 1, seam: 1, seam0: 1, web: 0.35, fat: true, ink: isSky(), add: !isSky(), floorGlow: true, head: n0.a > 0.05 ? { x: n0.x, y: n0.y, z: n0.z, a, s: 3.1, mouth: 0.55 } : null });
    ctx.restore();
  }

  // ---------------------------------------------------------------- Horizon Cut (roomev 'clhorizon')
  // Shards of gold hang over the red on either side of the gap, none in it, and fall as the cut comes; the gap itself is left bare floor.
  function horizonOver(ctx, ev, t) {
    const landT = ev.start + (ev.at || 1), q = clamp((t - ev.start) / Math.max(0.5, ev.at || 1), 0, 1);
    if (t > landT + 0.1) return;
    const d = [Math.cos(ev.a), Math.sin(ev.a)], nr = [-d[1], d[0]], lo = ev.g - ev.gw / 2 - 34, hi = ev.g + ev.gw / 2 + 34;
    ctx.save(); clipRoom(ctx); const sky = isSky();
    if (!sky) ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const u = (hash(i, 61) - 0.5) * 1100, v = (hash(i, 62) - 0.5) * 1040;
      if (v > lo && v < hi) continue;
      const x = d[0] * u + nr[0] * v, y = d[1] * u + nr[1] * v; if (ARENA.sd(x, y) > -26) continue;
      const born = hash(i, 63) * 0.9, a = easeOut(clamp((t - ev.start - born) / 0.6, 0, 1)), H0 = 160 + 200 * hash(i, 64) + Math.sin(t * 1.3 + i) * 6;
      const h = H0 * (1 - easeIn(clamp((q - 0.7) / 0.3, 0, 1))), tall = 70 + 40 * hash(i, 65), wd = 9 + 5 * hash(i, 66), by = y - h;
      if (a <= 0.01) continue;
      // a long diamond of gold, standing on its point
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(x, by + tall * 0.35); ctx.lineTo(x + wd, by); ctx.lineTo(x, by - tall * 0.65); ctx.lineTo(x - wd, by); ctx.closePath();
      ctx.fillStyle = rgba(C.gold, sky ? 0.95 : 0.55); ctx.fill(); ctx.strokeStyle = rgba(sky ? C.goldDk : C.goldHi, 0.9); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, by + tall * 0.3); ctx.lineTo(x, by - tall * 0.6); ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.globalAlpha = 1;
      glow(ctx, x, by - tall * 0.1, 26 + 16 * (h < 40 ? 1 : 0), C.gold, 0.28 * a);
      if (q > 0.7) { ctx.beginPath(); ctx.moveTo(x, by + tall * 0.35); ctx.lineTo(x, by + tall * 0.35 + (h - 0) * 0.6); ctx.strokeStyle = rgba('#ffeebb', 0.35 * a * easeIn(clamp((q - 0.7) / 0.3, 0, 1))); ctx.lineWidth = 2; ctx.stroke(); }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- Grace Withdrawn (roomev 'clgrace') and Ascendant (roomev 'clascend')
  // a whole-screen layer: fn(c, W, H, t) each frame (screen space), over everything on the arena canvas
  function screenFx(dur, fn) {
    return VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); fn(c, c.canvas.width, c.canvas.height, t, p, e); c.restore(); } });
  }
  const vig = (c, W, H, a, inner, col = '0,0,6') => {
    if (a <= 0.004) return;
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * inner, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${Math.min(1, a)})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  };
  function graceOver(ctx, ev, t, env) {
    const T = t - ev.start, dur = ev.dur || 8;
    if (once('grace' + ev.start)) {
      // the light goes out of the room and everyone in it: colour drains, the edges close in, a held breath
      screenFx(dur + 0.2, (c, W, H, tt, p, e) => {
        const inn = easeOut(clamp(tt / 1.6, 0, 1)), out = clamp((dur - tt) / 0.35, 0, 1), k = inn * out * e.a;
        c.globalCompositeOperation = 'saturation'; c.globalAlpha = 0.92 * k; c.fillStyle = '#808080'; c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        c.fillStyle = `rgba(4,6,18,${0.3 * k})`; c.fillRect(0, 0, W, H);
        // the breath: the dark closes in a little, hangs, and a faint heart beats in it
        const beat = Math.pow(Math.max(0, Math.sin(tt * 2.1)), 12);
        vig(c, W, H, k * (0.8 + 0.1 * beat), 0.2 + 0.1 * (1 - inn) - 0.015 * Math.sin(tt * 1.1));
      });
    }
    const b = env && env.boss;
    // the light leaving: threads of it drawn off each hero and up into the dark, rings of it drawn in toward him
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (T < 1.8 && b) for (let i = 0; i < 3; i++) { const q = clamp((T - i * 0.25) / 1.3, 0, 1); if (q <= 0 || q >= 1) continue; const R = (1 - easeIn(q)) * 520; ellipse(ctx, b.x, b.y + 30, R, R * 0.8, 0, null, rgba(C.silverHi, 0.5 * Math.sin(q * Math.PI)), 2.4); }
    for (const u of (env && env.units) || []) {
      const lift = u.lift || 0, pulse = 0.5 + 0.5 * Math.sin(t * 3.4 + u.x * 0.01);
      if (T < 2.4 && b) for (let i = 0; i < 5; i++) {
        const q = clamp((T - i * 0.12) / 1.4, 0, 1); if (q <= 0 || q >= 1) continue;
        const sx = u.x, sy = u.y - 30 - lift, ex = b.x, ey = b.y - 110, px = lerp(sx, ex, easeIn(q)) + Math.sin(i * 2 + q * 6) * 14 * (1 - q), py = lerp(sy, ey, easeIn(q)) - Math.sin(q * Math.PI) * 80;
        glow(ctx, px, py, 8, C.silverHi, 0.8 * Math.sin(q * Math.PI));
      }
      // what is left of them: a thin, steady light
      ellipse(ctx, u.x, u.y + 6, 22, 8, 0, null, rgba(C.silverHi, 0.25 + 0.2 * pulse), 1.4);
      glow(ctx, u.x, u.y - 26 - lift, 24, C.silverHi, 0.1 + 0.08 * pulse);
    }
    ctx.restore();
  }
  // Ascendant: 0-3 the crater breaks (floor(): slabs of it fall away into the fire beneath); 3 the floor is the cloud (a flash,
  // roomev 'form'); 3-6 the cloud rushes up past them; 6 his halo opens into the wheel of blades
  const ASC = (() => {
    const out = [], rings = [[0, 112, 1], [112, 250, 7], [250, 400, 11], [400, 590, 15]];
    rings.forEach(([r0, r1, n], ri) => {
      for (let j = 0; j < n; j++) {
        const id = out.length, a0 = j * TAU / n + ri * 0.37, a1 = (j + 1) * TAU / n + ri * 0.37, pts = [], jit = k => hash(id, k) - 0.5;
        if (ri === 0) for (let m = 0; m < 12; m++) { const a = m * TAU / 12, rr = r1 * (0.9 + 0.2 * hash(id, m)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        else {
          for (let m = 0; m <= 3; m++) { const a = lerp(a0, a1, m / 3), rr = r1 + (m && m < 3 ? jit(m) * 26 : 0); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
          for (let m = 3; m >= 0; m--) { const a = lerp(a0, a1, m / 3), rr = r0 + (m && m < 3 ? jit(m + 9) * 26 : 0); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        }
        let cx = 0, cy = 0; for (const [px, py] of pts) { cx += px; cy += py; } cx /= pts.length; cy /= pts.length;
        out.push({ id, pts, cx, cy, td: 0.2 + (1 - r0 / 590) * 2.1 + hash(id, 3) * 0.4, spin: (hash(id, 4) - 0.5) * 0.9, ri });
      }
    });
    return out;
  })();
  function ascendFloor(ctx, ev, t) {
    const T = t - ev.start; if (T > 3.2 || T < 0) return;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    // the glare of the fire under the crater, climbing through the cracks as the floor lets go
    const fire = easeIn(clamp(T / 2.8, 0, 1));
    const gf = ctx.createRadialGradient(0, 0, 40, 0, 0, 620); gf.addColorStop(0, rgba('#ff7a2a', 0.0)); gf.addColorStop(0.55, rgba('#ff5a1a', 0.12 * fire)); gf.addColorStop(1, rgba('#ff9a4a', 0.34 * fire));
    ctx.fillStyle = gf; ctx.fillRect(-640, -640, 1280, 1280);
    for (const c of ASC) {
      const u = T - c.td;
      ctx.save(); ctx.translate(0, 0);
      if (u < 0) {
        // not yet: the seams of it begin to burn
        const heat = clamp(1 + u / 0.9, 0, 1) * fire;
        if (heat > 0.02) { polyOf(ctx, c.pts); ctx.strokeStyle = rgba('#ff9a4a', 0.55 * heat); ctx.lineWidth = 2.2 + 3 * heat; ctx.stroke(); ctx.strokeStyle = rgba('#fff0c0', 0.5 * heat); ctx.lineWidth = 1; ctx.stroke(); }
      } else {
        // gone: where it was, the dark and the fire beneath; it falls away, turning, small and dark
        polyOf(ctx, c.pts); const hg = ctx.createRadialGradient(c.cx, c.cy, 4, c.cx, c.cy, 150); const hv = 0.55 + 0.45 * hash(c.id, 7); hg.addColorStop(0, hv > 0.8 ? '#ffd890' : '#ffb060'); hg.addColorStop(0.45, hv > 0.7 ? '#e05a22' : '#a8301a'); hg.addColorStop(1, '#1c0604');
        ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = rgba('#ffd890', 0.7); ctx.lineWidth = 1.4; ctx.stroke();
        const f = clamp(u / 1.3, 0, 1);
        if (f < 1) {
          ctx.translate(c.cx, c.cy + 560 * f * f); ctx.rotate(c.spin * f); ctx.scale(1 - 0.5 * f, 1 - 0.5 * f); ctx.translate(-c.cx, -c.cy);
          polyOf(ctx, c.pts); ctx.globalAlpha = 1 - f * f; ctx.fillStyle = '#141a30'; ctx.fill(); ctx.strokeStyle = rgba('#ff9a4a', 0.8); ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function ascendOver(ctx, ev, t, env) {
    const T = t - ev.start, b = env && env.boss;
    if (T < 0) return;
    if (T < 3.1) {
      // embers and sparks thrown up out of the breaking floor
      if (Math.random() < 0.7) { const a = rand(0, TAU), r = rand(80, 540); VFX.spawn({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.9, z: rand(0, 20), vx: rand(-30, 30), vz: rand(120, 300) * (0.5 + T / 3), g: 80, life: rand(0.9, 1.6), size: rand(4, 9), size1: 0, color: Math.random() < 0.5 ? C.ember : C.emberHi, kind: 'glow' }); }
      if (T > 0.1 && once('asc-a' + ev.start)) { shakeNow(5); VFX.shock(0, 0, { r: 600, color: '#ff9a4a', w: 8, dur: 1.2, flat: 1 }); }
      if (T > 1.4 && once('asc-b' + ev.start)) shakeNow(7);
    }
    if (T >= 2.95 && once('asc-flash' + ev.start)) {
      // the floor is gone: white, and the cloud under their feet
      screenFx(1.6, (c, W, H, tt, p, e) => { c.globalCompositeOperation = 'screen'; c.globalAlpha = Math.min(1, (1 - clamp((tt - 0.2) / 1.3, 0, 1)) * e.a); c.fillStyle = '#fff4dc'; c.fillRect(0, 0, W, H); });
      cam(0.12, 0.04, 0.6, 0); shakeNow(10);
      // the cloud rushing up past them: long streaks of white and fire, rising faster and faster, thinning as they settle
      screenFx(3.1, (c, W, H, tt, p, e) => {
        const k = e.a * clamp(tt / 0.3, 0, 1) * (1 - clamp((tt - 1.8) / 1.3, 0, 1)), sc = H / 900;
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (let i = 0; i < 70; i++) {
          const x = hash(i, 81) * W, v = (900 + 1800 * hash(i, 82)) * sc * (1 - 0.5 * clamp(tt / 3, 0, 1)), len = (120 + 360 * hash(i, 83)) * sc, y = H + len - ((hash(i, 84) * H * 2 + tt * v) % (H + len * 2));
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.strokeStyle = rgba(i % 3 ? '#ffffff' : '#ffb870', (0.1 + 0.3 * hash(i, 85)) * k); c.lineWidth = (2 + 6 * hash(i, 86)) * sc; c.stroke();
        }
        c.globalCompositeOperation = 'screen'; c.fillStyle = rgba('#ffe9c8', 0.18 * k); c.fillRect(0, 0, W, H);
      });
    }
    if (T >= 5.95 && once('asc-halo' + ev.start) && b) {
      // his halo opens: a ring of light, then the blades of the wheel thrown out and settling round him
      cam(0.1, 0.04, 0.6, 0); shakeNow(9);
      for (let i = 0; i < 3; i++) VFX.shock(b.x, b.y, { r: 700, color: i % 2 ? '#ffffff' : C.gold, w: 12 - i * 3, dur: 0.9 + i * 0.12, flat: 0.8, delay: i * 0.1 });
      screenFx(1.4, (c, W, H, tt, p, e) => { c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.5 * Math.pow(1 - clamp(tt / 1.2, 0, 1), 2) * e.a; c.fillStyle = '#fff4cc'; c.fillRect(0, 0, W, H); });
      VFX.fx({ dur: 1.5, layer: 'air', draw: (c, p, tt, e) => {
        const q = easeOut(clamp(p / 0.5, 0, 1)), k = e.a * (1 - clamp((p - 0.4) / 0.6, 0, 1));
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + p * 0.6, r0 = 60 + 40 * q, r1 = 90 + 330 * q; c.beginPath(); c.moveTo(b.x + Math.cos(a) * r0, b.y - 110 + Math.sin(a) * r0 * 0.85); c.lineTo(b.x + Math.cos(a) * r1, b.y - 110 + Math.sin(a) * r1 * 0.85); c.strokeStyle = rgba(i % 2 ? '#ffffff' : C.gold, 0.8 * k); c.lineWidth = 3 + 7 * (1 - q); c.stroke(); }
        glow(c, b.x, b.y - 110, 200 * (0.4 + q), '#ffffff', 0.6 * k);
        c.restore();
      } });
      dust(b.x, b.y - 100, 22, { speed: 420, size: 1.3, color: '#fff0b8' });
    }
    // after it: the light of the meteor under the cloud, fire breathing up at the edges of the new floor
    if (T > 3.2 && T < 8 && Math.random() < 0.35) { const a = rand(0, TAU); VFX.spawn({ x: Math.cos(a) * 500, y: Math.sin(a) * 480, z: 0, vz: rand(40, 110), vx: rand(-10, 10), life: rand(1.2, 2), size: rand(14, 28), size1: 3, color: Math.random() < 0.5 ? '#ffb870' : '#ffffff', kind: 'smoke', add: false, a: 0.35 }); }
  }

  // ---------------------------------------------------------------- the room over the units (ArenaView.drawRoomOver hands it over) and under them (floor)
  function roomOver(ctx, room, t, env) {
    const ev = room && room.ev; if (!ev) return;
    for (const key in ev) {
      const e = ev[key];
      if (key.startsWith('climgs:')) { if (t < e.end + 0.9) images(ctx, key, e, t, env); }
      else if (key.startsWith('clchorus:')) { if (t < e.end) chorus(ctx, key, e, t); }
      else if (key.startsWith('clwyrm:') && e.dive && t < e.start + (e.at || 0) + 2.6) dive(ctx, key, e, t);
      else if (key.startsWith('clhorizon') && t < e.end) horizonOver(ctx, e, t);
    }
    if (ev.clgrace && t < ev.clgrace.end + 0.2) graceOver(ctx, ev.clgrace, t, env);
    if (ev.clascend && t < ev.clascend.end + 0.2) ascendOver(ctx, ev.clascend, t, env);
    if (ev.clsummon) wyrm(ctx, room, t);
  }
  function floor(ctx, room, t) {
    const gr = room && room.ev && room.ev.clgrace; S.graceEnd = gr ? gr.end : 0;
    shadowFloor(ctx, room, t);
    const ev = room && room.ev; if (ev && ev.clascend) ascendFloor(ctx, ev.clascend, t);
  }

  // ---------------------------------------------------------------- the warnings (boss-tells.js get() reads TELLS[tag])
  // Each paints only the danger, inside the outline the shared code draws: a line, a ring, a glow. Nothing marks a safe place.
  const TELLS = {};
  const chev = (ctx, x, len, hw, col, a, lw = 2) => { ctx.beginPath(); ctx.moveTo(x - len, -hw); ctx.lineTo(x, 0); ctx.lineTo(x - len, hw); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.stroke(); };
  // a hair of light down the lane: a dark edge, a bright body, a white core
  function hair(ctx, X, P, k, a, w = 1) {
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(X, 0);
    ctx.strokeStyle = rgba(P.ink, 0.45 * k); ctx.lineWidth = 6.5 * w; ctx.stroke();
    ctx.strokeStyle = rgba(P.core, (0.35 + 0.5 * a) * k); ctx.lineWidth = 3.2 * w; ctx.stroke();
    ctx.strokeStyle = rgba(P.hi, (0.55 + 0.45 * a) * k); ctx.lineWidth = 1.2 * w; ctx.stroke();
  }

  // Glint: a line of light scored from him to the afterimage, sharpening as the blade comes
  TELLS.clGlint = { ground(ctx, tg, s, p, k, t) {
    const P = pal();
    lane(ctx, s, (L, hw) => {
      const X = L * easeOut(clamp(p / 0.3, 0, 1));
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba(P.core, (0.1 + 0.12 * p) * k)); g.addColorStop(1, rgba(P.core, (0.03 + 0.06 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(0, -hw * 0.34, X, hw * 0.68);
      ctx.lineCap = 'round'; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 50;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, sd * hw * 0.6); ctx.lineTo(X, sd * hw * 0.6); ctx.strokeStyle = rgba(P.core, (0.2 + 0.3 * p) * k); ctx.lineWidth = 1.3; ctx.stroke(); }
      ctx.setLineDash([]);
      hair(ctx, X, P, k, p);
      for (let i = 0, n = Math.max(1, Math.round(L / 90)); i < n; i++) { const x = ((i / n) * L + t * (150 + 380 * p)) % L; if (x < X) chev(ctx, x, 12, hw * 0.3, P.hi, (0.3 + 0.5 * p) * k); }
      glow(ctx, X, 0, 28 + 18 * p, P.core, (0.3 + 0.4 * p) * k); glow(ctx, 40, 0, 50, P.hi, 0.18 * k * p);
    });
  } };

  // the Wakes' cuts: each a line of starlight about to be drawn, in order; the one that lands next runs bright
  TELLS.clWake = { ground(ctx, tg, s, p, k, t, env) {
    const P = pal(), land = tg.start + tg.dur;
    let ahead = 0; if (env && env.tgs) for (const o of env.tgs.values()) if (o !== tg && o.tag === 'clWake' && o.gone == null && o.start + o.dur < land - 0.05) ahead++;
    const first = ahead === 0, br = first ? 1 : Math.max(0.8, 1 - 0.035 * ahead), near = first ? clamp(1 - (land - t) / 0.9, 0, 1) : 0;
    lane(ctx, s, (L, hw) => {
      ctx.lineCap = 'round';
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba(P.core, (0.04 + 0.08 * br) * k)); g.addColorStop(1, rgba(P.core, (0.06 + 0.1 * br) * k));
      ctx.fillStyle = g; ctx.fillRect(0, -hw * 0.3, L, hw * 0.6);
      hair(ctx, L, P, k * br, first ? 0.4 + 0.6 * near : 0.35);
      for (let i = 0, n = Math.max(1, Math.round(L / 110)); i < n; i++) chev(ctx, (i + 0.5) * L / n, 11, hw * 0.22, P.hi, (0.4 + 0.4 * br) * k);
      // the light that will be drawn: pulses run down the lane, quick and bright on the one to land next
      const np = first ? 3 : 1;
      for (let i = 0; i < np; i++) { const u = (t * (first ? 1.2 + 1.2 * near : 0.35) + i / np + hash(tg.id, 3)) % 1; glow(ctx, u * L, 0, first ? 12 : 8, P.hi, (first ? 0.6 + 0.3 * near : 0.35) * k); }
      glow(ctx, L, 0, 22 + 12 * near, P.core, (0.18 + 0.4 * near) * k * br); glow(ctx, 0, 0, 16, P.core, 0.12 * k);
    });
  } };

  // Chorus of the Fallen: each cut in that boss's own colours, ghostly
  TELLS.clChorusCut = { ground(ctx, tg, s, p, k, t) {   // Corvane's Draw Cut: a hair of frost
    lane(ctx, s, (L, hw) => {
      const X = L * easeOut(clamp(p / 0.5, 0, 1));
      ctx.fillStyle = rgba('#8fe0ff', (0.05 + 0.1 * p) * k); ctx.fillRect(0, -hw * 0.28, X, hw * 0.56);
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(X, 0);
      ctx.strokeStyle = rgba('#06182a', 0.4 * k); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = rgba('#8fe0ff', (0.3 + 0.4 * p) * k); ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', (0.6 + 0.3 * p) * k); ctx.lineWidth = 1.3; ctx.stroke();
      for (let i = 0, n = Math.floor(X / 46); i < n; i++) { const x = i * 46 + hash(i, tg.id) * 18, sd = i % 2 ? 1 : -1, ln = 6 + hash(i, tg.id + 1) * 9; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + ln * 0.9, sd * ln); ctx.strokeStyle = rgba('#cfeeff', (0.25 + 0.3 * p) * k); ctx.lineWidth = 1.2; ctx.stroke(); }
      glow(ctx, X, 0, 24 + 14 * p, '#8fe0ff', (0.25 + 0.4 * p) * k);
    });
  } };
  TELLS.clChorusLeap = { ground(ctx, tg, s, p, k, t) {   // Brannoc's Victory Leap: a sun-ring closing, a shadow coming down
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ellipse(ctx, s.x, s.y, s.r * (0.2 + 0.7 * p), s.r * (0.2 + 0.7 * p), 0, rgba('#040a10', (0.1 + 0.35 * p) * k));
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + t * 0.4; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * s.r * 0.25, s.y + Math.sin(a) * s.r * 0.25); ctx.lineTo(s.x + Math.cos(a) * s.r * (i % 2 ? 0.72 : 0.92), s.y + Math.sin(a) * s.r * (i % 2 ? 0.72 : 0.92)); ctx.strokeStyle = rgba(i % 2 ? '#ffc23a' : '#fff0a8', (0.2 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke(); }
    for (let i = 0; i < 2; i++) { const q = (t * 0.8 + i / 2) % 1; circle(ctx, s.x, s.y, s.r * (1 - q), null, rgba('#ffd36a', (0.5 * q + 0.1) * (0.3 + p) * k), 2); }
    glow(ctx, s.x, s.y, s.r * 0.55, '#ffc23a', (0.1 + 0.3 * p) * k);
    ctx.restore();
  } };
  TELLS.clChorusBloom = { ground(ctx, tg, s, p, k, t) {   // Morrow-Oak's Fourfold Bloom: a long petal of violet light
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const R = Math.min(s.r, AR() * 2.4), grow = easeOut(clamp(p / 0.6, 0, 1)) * R, a0 = s.angle - s.arc / 2, a1 = s.angle + s.arc / 2;
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, R); g.addColorStop(0, rgba('#dcc4ff', (0.12 + 0.16 * p) * k)); g.addColorStop(1, rgba('#a064ff', (0.03 + 0.06 * p) * k));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, grow, a0, a1); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(s.angle) * grow, s.y + Math.sin(s.angle) * grow); ctx.strokeStyle = rgba('#05030a', 0.35 * k); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = rgba('#dcc4ff', (0.4 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
    for (let i = 1; i < 5; i++) { const d = grow * i / 5; ctx.beginPath(); ctx.arc(s.x, s.y, d, a0 + 0.04, a1 - 0.04); ctx.strokeStyle = rgba('#dcc4ff', (0.15 + 0.2 * p) * k); ctx.lineWidth = 1.2; ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const q = (t * 0.7 + i / 6) % 1; glow(ctx, s.x + Math.cos(s.angle) * grow * q, s.y + Math.sin(s.angle) * grow * q, 9, '#ffffff', 0.5 * k * Math.sin(q * Math.PI) * (0.3 + p)); }
    ctx.restore();
  } };

  // Nightfall: black-violet flame creeping in from the rim of the room and the edges closing, the light going down
  TELLS.clNight = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const R = AR() - 10;
    ctx.save();
    ctx.fillStyle = rgba('#05030f', (0.04 + 0.2 * p) * k); ctx.fillRect(-R - 20, -R - 20, R * 2 + 40, R * 2 + 40);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R); g.addColorStop(0, rgba(C.violet, 0)); g.addColorStop(1, rgba(C.violet, (0.08 + 0.22 * p) * k));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    const n = 64;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, 5) * 0.04, fl = 0.5 + 0.5 * Math.sin(t * (4 + 3 * hash(i, 6)) + i * 2.3), h = (8 + (24 + 46 * p) * fl * (0.5 + hash(i, 7))) * k, w = 6 + 5 * hash(i, 8), rr = R - 6 - 40 * p * hash(i, 9), bx = Math.cos(a) * rr, by = Math.sin(a) * rr;
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.8, by - h * 0.5, bx + Math.sin(t * 3 + i) * 3, by - h); ctx.quadraticCurveTo(bx + w * 0.8, by - h * 0.5, bx + w, by); ctx.closePath();
      ctx.fillStyle = rgba(i % 4 ? C.violet : C.violetHi, 0.5 * (0.3 + 0.7 * p) * (0.4 + 0.6 * fl)); ctx.fill();
    }
    ctx.restore();
  } };

  // Starfall: a shard of the meteor falling into the blue ring; the floor under it filling with pale light
  TELLS.clStar = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      g.addColorStop(0, rgba('#ffffff', (0.08 + 0.26 * p) * k)); g.addColorStop(0.6, rgba('#9cc0ff', (0.08 + 0.14 * p) * k)); g.addColorStop(1, rgba('#3d8bff', (0.05 + 0.08 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * (1 - q * 0.85), null, rgba('#cfe0ff', (0.1 + 0.4 * p) * (1 - q) * k), 1.6); }
      for (let i = 0; i < 9; i++) { const q = (t * 0.45 + hash(i, tg.id) + i / 9) % 1, a = hash(i, 4) * TAU, d = s.r * 0.8 * Math.sqrt(hash(i, 5)); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 40, 4, '#ffffff', 0.7 * Math.sin(q * Math.PI) * k * (0.3 + p)); }
      ctx.restore();
      // its shadow, growing as it comes
      ellipse(ctx, s.x, s.y + 4, 8 + 56 * p, 5 + 26 * p, 0, rgba('#05030f', 0.5 * p * k));
    },
    air(ctx, tg, s, p, k, t) {
      const h = 780 * Math.pow(1 - p, 2) + 8, dx = h * 0.2, x = s.x + dx, y = s.y - h, r = 18 + 34 * p, a = Math.min(1, p * 3) * k;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const tl = 160 + 280 * p; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 0.3 + 14, y - tl);
      ctx.strokeStyle = rgba(C.violet, 0.28 * a); ctx.lineWidth = r * 1.7; ctx.stroke(); ctx.strokeStyle = rgba(C.violetHi, 0.65 * a); ctx.lineWidth = r * 0.8; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.7 * a); ctx.lineWidth = r * 0.25; ctx.stroke();
      glow(ctx, x, y, r * 3, C.violet, 0.45 * a);
      ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8 + tg.id);
      const pts = []; for (let i = 0; i < 8; i++) { const an = i * TAU / 8, rr = r * (0.7 + 0.5 * hash(i, tg.id)); pts.push([Math.cos(an) * rr, Math.sin(an) * rr * 0.9]); }
      polyOf(ctx, pts); ctx.globalAlpha = a; ctx.fillStyle = '#1c1740'; ctx.fill(); ctx.strokeStyle = rgba('#e8e0ff', 0.98); ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pts[0][0] * 0.4, pts[0][1] * 0.4); ctx.lineTo(pts[3][0] * 0.5, pts[3][1] * 0.5); ctx.lineTo(pts[5][0] * 0.4, pts[5][1] * 0.4); ctx.strokeStyle = rgba('#ffffff', 0.8); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    },
  };
  TELLS.clStarRain = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const R = AR();
    ctx.save();
    ctx.fillStyle = rgba('#0a0620', (0.02 + 0.08 * p) * k); ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) { const x = (hash(i, 3) - 0.5) * R * 2, v = (180 + 420 * p) * (0.6 + hash(i, 5)), y = ((hash(i, 4) * R * 2 + t * v) % (R * 2)) - R, len = 20 + 50 * hash(i, 6); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * 0.2, y - len); ctx.strokeStyle = rgba(C.violetHi, (0.06 + 0.2 * p) * k * (0.4 + 0.6 * hash(i, 7))); ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.restore();
  } };

  // Dark Ember: a black ember on its carrier, the floor under them going dark and cracked with heat
  TELLS.clEmber = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r); g.addColorStop(0, `rgba(3,1,8,${(0.4 + 0.3 * p) * k})`); g.addColorStop(0.7, `rgba(8,3,14,${(0.25 + 0.2 * p) * k})`); g.addColorStop(1, `rgba(20,6,10,${0.08 * k})`);
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + hash(i, 3) * 0.4, pulse = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7); ctx.beginPath(); zigPath(ctx, s.x + Math.cos(a) * 6, s.y + Math.sin(a) * 6, s.x + Math.cos(a) * s.r * (0.6 + 0.35 * hash(i, 4)), s.y + Math.sin(a) * s.r * (0.6 + 0.35 * hash(i, 4)), i, 5, 14); ctx.strokeStyle = rgba(C.fire, (0.3 + 0.4 * p) * k * (0.4 + 0.6 * pulse)); ctx.lineWidth = 1.8; ctx.stroke(); }
      for (let i = 0; i < 7; i++) { const q = (t * 0.6 + i / 7) % 1, a = hash(i, 6) * TAU, d = s.r * 0.7 * hash(i, 7); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 40, 4, C.emberHi, Math.sin(q * Math.PI) * 0.7 * k); }
      ctx.restore();
    },
    air(ctx, tg, s, p, k, t) {
      const x = s.x, y = s.y - 66 - 6 * Math.sin(t * 3), r = 15 + 6 * p;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 3.2, C.fire, (0.25 + 0.3 * p) * k); ctx.restore();
      circle(ctx, x, y, r, rgba('#05030a', 0.95 * k), rgba('#ffd890', (0.5 + 0.4 * p) * k), 1.8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + t * 0.6, rr = r * (0.4 + 0.5 * hash(i, 8)); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rr * 0.3, y + Math.sin(a) * rr * 0.3); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); ctx.strokeStyle = rgba(C.fire, 0.7 * k); ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.restore();
    },
  };

  // the Starwyrm's coil: where it will pass, star-dust lying on the stone and a constellation's line drawn down it, brightening as it comes
  TELLS.clCoil = { ground(ctx, tg, s, p, k, t) {
    const land = tg.start + tg.dur, near = clamp(1 - (land - t) / 0.9, 0, 1);
    lane(ctx, s, (L, hw) => {
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.gold, 0)); g.addColorStop(0.5, rgba(C.gold, (0.08 + 0.2 * near) * k)); g.addColorStop(1, rgba(C.gold, 0));
      ctx.fillStyle = g; ctx.fillRect(0, -hw, L, hw * 2);
      ctx.lineCap = 'round'; ctx.setLineDash([3, 11]); ctx.lineDashOffset = -t * 18;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.strokeStyle = rgba('#ffeebb', (0.3 + 0.4 * near) * k); ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0, n = Math.round(L / 34); i < n; i++) { const x = (i + hash(i, tg.id)) * L / n, y = (hash(i, tg.id + 1) - 0.5) * hw * 1.6, tw = 0.5 + 0.5 * Math.sin(t * (2 + 3 * hash(i, 4)) + i); glow(ctx, x, y, 3.5 + 3 * hash(i, 5), i % 3 ? '#ffeebb' : '#ffffff', (0.25 + 0.4 * near) * tw * k); }
      for (let i = 0, n = Math.max(1, Math.round(L / 140)); i < n; i++) star4(ctx, (i + 0.5) * L / n, 0, 3.2, t * 0.4 + i, C.gold, '#ffffff', (0.4 + 0.5 * near) * k);
      glow(ctx, L * 0.5, 0, hw * 1.1, C.gold, 0.2 * near * k);
    });
  } };

  // Embers of Heaven: burning pieces of the heavens falling on the shards' ground, the floor under them heating
  TELLS.clEmbers = {
    ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, s.r); g.addColorStop(0, rgba(C.emberHi, (0.1 + 0.26 * p) * k)); g.addColorStop(0.6, rgba(C.fire, (0.07 + 0.16 * p) * k)); g.addColorStop(1, rgba(C.fireDk, 0.1 * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * (0.3 + 0.7 * q), null, rgba(C.ember, 0.5 * (1 - q) * (0.2 + p) * k), 2); }
      for (let i = 0; i < 12; i++) { const q = (t * 0.55 + hash(i, tg.id) + i / 12) % 1, a = hash(i, 4) * TAU, d = s.r * 0.9 * Math.sqrt(hash(i, 5)); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 50, 4, C.emberHi, 0.8 * Math.sin(q * Math.PI) * k * (0.3 + p)); }
      ctx.restore();
    },
    air(ctx, tg, s, p, k, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const off = i * 0.1, q = clamp((p - 0.18 - off * 0.7) / (0.82 - off * 0.7), 0, 1); if (q <= 0) continue;
        const a = hash(i, tg.id) * TAU, side = Math.cos(a) * 180, h = 620 * Math.pow(1 - q, 2) + 4, x = s.x + side * (1 - q) * 0.6 + (hash(i, 7) - 0.5) * s.r * 0.9 * q, y = s.y + (hash(i, 8) - 0.5) * s.r * 0.6 * q - h, r = 7 + 10 * q;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - side * 0.12, y - 150 - 90 * q); ctx.strokeStyle = rgba(C.fire, 0.3 * k); ctx.lineWidth = r * 1.1; ctx.stroke(); ctx.strokeStyle = rgba(C.emberHi, 0.7 * k); ctx.lineWidth = r * 0.4; ctx.stroke();
        glow(ctx, x, y, r * 3, C.fire, 0.5 * k);
        // the burning rock itself
        ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(x, y); ctx.rotate(t * 1.4 + i);
        const pts = []; for (let j = 0; j < 7; j++) { const an = j * TAU / 7, rr = r * (0.8 + 0.5 * hash(j, i + tg.id)); pts.push([Math.cos(an) * rr, Math.sin(an) * rr * 0.85]); }
        polyOf(ctx, pts); ctx.globalAlpha = k; ctx.fillStyle = '#2a1810'; ctx.fill(); ctx.strokeStyle = rgba(C.emberHi, 0.95); ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pts[0][0] * 0.3, pts[0][1] * 0.3); ctx.lineTo(pts[3][0] * 0.6, pts[3][1] * 0.6); ctx.strokeStyle = rgba('#ffe9b0', 0.9); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    },
  };

  // Constellation Fall: starlight pouring across the floor from where the serpent rears. The shadows behind the star stay clear
  // because the shared cover code cuts them out of everything painted here: nothing is drawn on them.
  TELLS.clConstellation = { ground(ctx, tg, s, p, k, t) {
    const src = tg.cover || [s.x, s.y], ang = Math.atan2(-src[1], -src[0]), R = AR() * 2.5, W = AR() * 1.4;
    ctx.save(); ctx.translate(src[0], src[1]); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, R, 0); g.addColorStop(0, rgba('#fff0c0', (0.16 + 0.36 * p) * k)); g.addColorStop(0.5, rgba('#ffc060', (0.1 + 0.26 * p) * k)); g.addColorStop(1, rgba('#ff9a3a', (0.05 + 0.16 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(0, -W, R, W * 2);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    // light streaming along it, the way it will pour
    for (let i = 0; i < 46; i++) {
      const y = (hash(i, 3) - 0.5) * W * 2, v = (240 + 900 * p) * (0.6 + hash(i, 5)), len = 70 + 260 * hash(i, 6), x = ((hash(i, 4) * R + t * v) % (R + len)) - len * 0.5;
      ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.strokeStyle = rgba(i % 3 ? '#ffeebb' : '#ffffff', (0.1 + 0.34 * p) * k * (0.3 + 0.7 * hash(i, 7))); ctx.lineWidth = 1.4 + 3 * hash(i, 8); ctx.stroke();
    }
    // rings of light going out from the rim
    for (let i = 0; i < 4; i++) { const q = (t * (0.4 + 0.5 * p) + i / 4) % 1; ctx.beginPath(); ctx.arc(0, 0, q * R * 0.7, -1.1, 1.1); ctx.strokeStyle = rgba('#fff4cc', (0.08 + 0.28 * p) * (1 - q) * k); ctx.lineWidth = 3 + 8 * (1 - q); ctx.stroke(); }
    for (let i = 0; i < 24; i++) { const q = (t * 0.35 + hash(i, 9)) % 1; star4(ctx, q * R * 0.9, (hash(i, 10) - 0.5) * W * 1.6, 2 + 3 * hash(i, 11), t + i, C.gold, '#ffffff', 0.8 * Math.sin(q * Math.PI) * (0.3 + p) * k); }
    ctx.restore();
  } };

  // Horizon Cut: the cut itself, a line of light drawn along each band's length and sweeping toward the gap's edge; the gold shards are in
  // the room's own layer (roomev 'clhorizon'), none over the gap
  TELLS.clHorizon = { ground(ctx, tg, s, p, k, t) {
    const P = pal();
    lane(ctx, s, (L, hw) => {
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(P.core, (0.04 + 0.1 * p) * k)); g.addColorStop(1, rgba(P.core, (0.04 + 0.1 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(0, -hw, L, hw * 2);
      // thin lines of light running the length of the band, drifting across it
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const y = (((i / 7) + t * 0.05 * (0.4 + p)) % 1 * 2 - 1) * hw; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L, y); ctx.strokeStyle = rgba(P.hi, (0.08 + 0.28 * p) * k); ctx.lineWidth = 1.3; ctx.stroke(); }
      for (let i = 0; i < 30; i++) { const x = ((hash(i, 3) * L + t * 120 * (0.4 + p)) % L), y = (hash(i, 4) * 2 - 1) * hw; glow(ctx, x, y, 5, P.hi, 0.4 * k * (0.3 + p) * (0.5 + 0.5 * Math.sin(t * 3 + i))); }
    }, true);
  } };

  // Second Coil: a channel of starlight laid across the room where the serpent will dive, quickening
  TELLS.clDive = { ground(ctx, tg, s, p, k, t) {
    const P = pal();
    lane(ctx, s, (L, hw) => {
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.gold, 0)); g.addColorStop(0.5, rgba(C.gold, (0.1 + 0.22 * p) * k)); g.addColorStop(1, rgba(C.gold, 0));
      ctx.fillStyle = g; ctx.fillRect(0, -hw, L, hw * 2);
      hair(ctx, L, { core: C.gold, hi: '#fff4cc', ink: P.ink }, k, p, 1.3);
      for (let i = 0, n = Math.max(1, Math.round(L / 70)); i < n; i++) { const x = ((i / n) * L + t * (200 + 900 * p * p)) % L; chev(ctx, x, 16, hw * 0.3, '#fff4cc', (0.3 + 0.5 * p) * k, 2.4); }
      for (let i = 0; i < 26; i++) { const x = (hash(i, 3) * L + t * 60) % L, y = (hash(i, 4) * 2 - 1) * hw * 0.9; star4(ctx, x, y, 2 + 2.5 * hash(i, 5), t + i, C.gold, '#ffffff', 0.7 * k * (0.3 + p)); }
    });
  } };

  // ---------------------------------------------------------------- the busters (the shared tankbuster draws its red wash, then hands over)
  // Cinder Crown: embers standing up round the ring, a crown of fire lowering onto the tank. Pinning Thrust: a lance of light down the lane to the wall.
  function buster(ctx, tg, s, p, k, t, env) {
    const P = pal();
    if (tg.tag === 'clCrown') {
      const tgt = tg.target != null && env.entById ? env.entById(tg.target) : null, R = s.r;
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, R); g.addColorStop(0, rgba('#0a0618', (0.2 + 0.24 * p) * k)); g.addColorStop(0.8, rgba(C.violetDk, (0.1 + 0.12 * p) * k)); g.addColorStop(1, rgba(C.violet, 0.14 * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - R, s.y - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'lighter';
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + hash(i, 3) * 0.05, fl = 0.5 + 0.5 * Math.sin(t * (5 + 3 * hash(i, 4)) + i * 2.1), h = (6 + (16 + 36 * p) * fl * (0.5 + hash(i, 5))) * k, w = 5 + 3 * hash(i, 6), bx = s.x + Math.cos(a) * R * 0.9, by = s.y + Math.sin(a) * R * 0.9;
        ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.8, by - h * 0.5, bx + Math.sin(t * 3 + i) * 2, by - h); ctx.quadraticCurveTo(bx + w * 0.8, by - h * 0.5, bx + w, by); ctx.closePath();
        ctx.fillStyle = rgba(i % 3 ? C.violet : C.violetHi, 0.5 * (0.35 + 0.65 * p) * (0.4 + 0.6 * fl)); ctx.fill();
      }
      for (let i = 0; i < 12; i++) { const q = (t * 0.55 + hash(i, 7) + i / 12) % 1, a = hash(i, 8) * TAU, d = R * 0.8 * Math.sqrt(hash(i, 9)); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 50, 4, i % 2 ? C.emberHi : C.violetHi, 0.8 * Math.sin(q * Math.PI) * k * (0.3 + p)); }
      ctx.restore();
      // the crown itself, lowering onto them
      const cx = tgt ? tgt.x : s.x, cy = (tgt ? tgt.y - (tgt.lift || 0) : s.y) - 150 + 100 * easeIn(p);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, cx, cy, 70, C.violet, (0.2 + 0.3 * p) * k);
      for (let i = 0; i < 9; i++) {
        const a = i * TAU / 9 + t * 0.5, bx = cx + Math.cos(a) * 34, by = cy + Math.sin(a) * 12, h = (22 + 10 * Math.sin(t * 6 + i)) * k;
        ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx, by - h); ctx.lineTo(bx + 4, by); ctx.closePath(); ctx.fillStyle = rgba(i % 2 ? C.violetHi : '#ffffff', (0.5 + 0.4 * p) * k); ctx.fill();
      }
      ellipse(ctx, cx, cy, 34, 12, 0, null, rgba('#ffffff', (0.5 + 0.4 * p) * k), 2);
      ellipse(ctx, cx, cy, 34, 12, 0, null, rgba(C.violet, 0.4 * k), 6);
      ctx.restore();
      return;
    }
    // Pinning Thrust
    lane(ctx, s, (L, hw) => {
      const d = Math.min(L, wall(s.x, s.y, s.angle)), X = d * easeOut(clamp(p / 0.4, 0, 1));
      const g = ctx.createLinearGradient(0, 0, d, 0); g.addColorStop(0, rgba(C.violetHi, (0.16 + 0.18 * p) * k)); g.addColorStop(1, rgba(C.violet, (0.06 + 0.1 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(0, -hw * 0.5, X, hw);
      ctx.lineCap = 'round'; ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * (80 + 200 * p);
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, sd * hw * 0.62); ctx.lineTo(X, sd * hw * 0.62); ctx.strokeStyle = rgba(C.violetHi, (0.3 + 0.35 * p) * k); ctx.lineWidth = 1.8; ctx.stroke(); }
      ctx.setLineDash([]);
      hair(ctx, X, { core: C.violetHi, hi: '#ffffff', ink: C.deep }, k, p, 1.5);
      for (let i = 0, n = Math.max(2, Math.round(d / 60)); i < n; i++) { const x = ((i / n) * d + t * (260 + 700 * p)) % d; if (x < X) chev(ctx, x, 18, hw * 0.34, '#ffffff', (0.3 + 0.55 * p) * k, 2.6); }
      glow(ctx, 30, 0, 60, C.violetHi, (0.15 + 0.3 * p) * k); glow(ctx, X, 0, 40 + 20 * p, '#ffffff', (0.2 + 0.4 * p) * k);
      // the wall at its end, cracking where they will be driven
      if (p > 0.2) crackStar(ctx, d, 0, 54 * easeOut(clamp((p - 0.2) / 0.6, 0, 1)), 7, tg.id, (0.3 + 0.5 * p) * k, { w: 1.4, jag: 5, flat: 1, col: '#ffffff' });
    });
  }

  // ---------------------------------------------------------------- what stays on the floor (boss-tells.js track() asks once per landed move)
  // quiet decals, cooling: never louder than the warning was
  function scar(ctx, x0, y0, x1, y1, seed, k, o = {}) {
    const a = Math.atan2(y1 - y0, x1 - x0), ca = Math.cos(a), sa = Math.sin(a);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [off, col, w, al] of o.layers || [[0, '#03040c', 12, 0.8], [-9, '#c4cdee', 2.6, 0.8], [9, '#c4cdee', 2.6, 0.8], [0, '#ffffff', 2, 0.85]]) {
      ctx.beginPath(); zigPath(ctx, x0 - sa * off, y0 + ca * off, x1 - sa * off, y1 + ca * off, seed + off, 2.4, 32);
      ctx.strokeStyle = rgba(col, al * k); ctx.lineWidth = w; ctx.stroke();
    }
    ctx.restore();
  }
  function aftermath(tg, env, A) {
    const { mark, AFTER } = A, T = AFTER.tier, s = tg.live, id = tg.id;
    if (tg.type === 'buster') {
      const e = tg.target != null && env.entById ? env.entById(tg.target) : null; if (!e) return;
      const x = e.x, y = e.y;
      if (tg.tag === 'clCrown') {
        mark(T.long, { x, y }, (ctx, q, k, age, seed) => {
          // a ring of burnt glass where the crown came down, ember in the cracks
          ellipse(ctx, x, y + 6, 150, 110, 0, rgba('#0a0618', 0.4 * k), rgba(C.violetHi, 0.4 * k), 2);
          crackStar(ctx, x, y + 6, 130, 11, seed, k, { w: 2, flat: 0.74, col: '#cdbfff' });
          for (let i = 0; i < 10; i++) glow(ctx, x + Math.cos(i * 0.628 + hash(i, seed)) * (50 + 80 * hash(i, seed + 1)), y + 6 + Math.sin(i * 0.628) * (40 + 60 * hash(i, seed + 2)), 8, C.ember, 0.4 * k * (0.5 + 0.5 * Math.sin(age * 3 + i)));
        }, id);
      } else {
        const sa = s.angle, d = Math.min(s.len, wall(s.x, s.y, sa)), ex = s.x + Math.cos(sa) * d, ey = s.y + Math.sin(sa) * d, x0 = s.x, y0 = s.y;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          scar(ctx, x0, y0, ex, ey, seed, k, { layers: [[0, '#03040c', 14, 0.7], [-10, '#9a8cd8', 2.2, 0.5], [10, '#9a8cd8', 2.2, 0.5], [0, '#cdbfff', 1.5, 0.5]] });
          crackStar(ctx, ex, ey, 70, 9, seed + 5, k, { w: 1.8, flat: 1, col: '#e8e0ff' });
          glow(ctx, ex, ey, 40, C.violet, 0.3 * k);
        }, id);
      }
      return;
    }
    switch (tg.tag) {
      case 'clGlint': case 'clWake': case 'clChorusCut': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), x0 = s.x, y0 = s.y, x1 = s.x + ca * s.len, y1 = s.y + sa * s.len, col = tg.tag === 'clChorusCut' ? '#8fe0ff' : '#e8ecff';
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          scar(ctx, x0, y0, x1, y1, seed, k);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = rgba(col, 0.4 * k); ctx.lineWidth = 12; ctx.stroke(); ctx.restore();
          for (const [px, py] of [[x1, y1]]) for (let i = 0; i < 6; i++) { const a = hash(i, seed) * TAU, r = 10 + 26 * hash(i, seed + 1), qx = px + Math.cos(a) * r, qy = py + Math.sin(a) * r * 0.7; poly(ctx, [qx - 5, qy + 2, qx - 1, qy - 7, qx + 5, qy + 2], rgba('#dfe5fa', 0.7 * k), rgba(C.deep, 0.5 * k), 1); }
        }, id);
        break;
      }
      case 'clChorusLeap': {
        const cx = s.x, cy = s.y, R = s.r;
        mark(T.short, { x: cx, y: cy, r: R }, (ctx, q, k, age, seed) => {
          ellipse(ctx, cx, cy + 4, R * 0.5, R * 0.38, 0, rgba('#1a1208', 0.4 * k), rgba('#ffd36a', 0.4 * k), 2);
          crackStar(ctx, cx, cy + 4, R * 0.9, 10, seed, k * 0.8, { w: 1.8, flat: 0.74, col: '#ffe9a8' });
        }, id);
        break;
      }
      case 'clChorusBloom': {
        const a0 = s.angle, cx = s.x, cy = s.y, R = Math.min(s.r, 900);
        mark(T.short, { x: cx, y: cy }, (ctx, q, k, age, seed) => { scar(ctx, cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, seed, k * 0.8, { layers: [[0, '#0a0418', 9, 0.6], [0, '#dcc4ff', 1.5, 0.5]] }); }, id);
        break;
      }
      case 'clStar': {
        const cx = s.x, cy = s.y;
        mark(T.long, { x: cx, y: cy }, (ctx, q, k, age, seed) => {
          // the shard stands where it fell: a cluster of dark violet crystal with a light in it, the floor cracked round it
          crackStar(ctx, cx, cy + 6, 100, 9, seed, k * 0.8, { w: 1.6, flat: 0.74, col: '#cdbfff' });
          glow(ctx, cx, cy - 10, 70, C.violet, 0.4 * k * (0.7 + 0.3 * Math.sin(age * 2.4)));
          for (let i = 0; i < 6; i++) { const a = i * 1.05 + hash(i, seed), d = i ? 20 + 24 * hash(i, seed + 1) : 0, bx = cx + Math.cos(a) * d, by = cy + 8 + Math.sin(a) * d * 0.6, h = i ? 30 + 24 * hash(i, seed + 2) : 70, w = i ? 8 : 15; poly(ctx, [bx - w, by, bx - w * 0.3, by - h * 0.6, bx + w * 0.1, by - h, bx + w, by - h * 0.3, bx + w * 0.8, by], rgba('#1c1740', 0.95 * k), rgba('#cdbfff', 0.9 * k), 1.4); }
        }, id);
        break;
      }
      case 'clEmbers': {
        const cx = s.x, cy = s.y, R = s.r;
        mark(T.long, { x: cx, y: cy, r: R }, (ctx, q, k, age, seed) => {
          ellipse(ctx, cx, cy + 4, R * 0.95, R * 0.8, 0, rgba('#120604', 0.4 * k));
          crackStar(ctx, cx, cy + 4, R * 1.05, 11, seed, k, { w: 2, flat: 0.8, col: '#ff9a4a', ink: '#2a0a04' });
          for (let i = 0; i < 12; i++) { const a = hash(i, seed) * TAU, r = R * (0.2 + 0.7 * hash(i, seed + 1)); glow(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 9 + 7 * hash(i, seed + 2), C.ember, 0.45 * k * (0.5 + 0.5 * Math.sin(age * 3 + i))); }
        }, id);
        break;
      }
      case 'clCoil': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, x0 = s.x, y0 = s.y, hw = s.w / 2;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 8; i++) { const v = (i / 7 * 2 - 1) * hw * 0.8, d0 = hash(i, seed) * L * 0.2, d1 = L * (0.6 + 0.4 * hash(i, seed + 1)); ctx.beginPath(); ctx.moveTo(x0 + ca * d0 - sa * v, y0 + sa * d0 + ca * v); ctx.lineTo(x0 + ca * d1 - sa * v, y0 + sa * d1 + ca * v); ctx.strokeStyle = rgba('#0a0818', 0.3 * k); ctx.lineWidth = 5; ctx.stroke(); }
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 22; i++) { const d = hash(i, seed + 3) * L, v = (hash(i, seed + 4) - 0.5) * hw * 1.7; glow(ctx, x0 + ca * d - sa * v, y0 + sa * d + ca * v, 4 + 3 * hash(i, seed + 5), '#ffeebb', 0.5 * k * (0.4 + 0.6 * Math.sin(age * 3 + i))); }
          ctx.restore();
        }, id);
        break;
      }
      case 'clConstellation': {
        const src = tg.cover || [s.x, s.y], sh = [];
        for (const pr of env.props || []) if (pr.cover && typeof PROPS !== 'undefined') { const poly = PROPS.shadowPoly(src[0], src[1], pr); if (poly) sh.push(poly); }
        mark(T.long, {}, (ctx, q, k, age, seed) => {
          // the floor the light poured over, left glowing: the shadows of the shards and the star are not touched
          for (const poly of sh) { ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 8000); poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip('evenodd'); }
          ctx.fillStyle = rgba('#1a0a06', 0.2 * k); ctx.fillRect(-700, -700, 1400, 1400);
          for (let i = 0; i < 22; i++) { const a0 = hash(i, seed) * TAU, r0 = 60 + 480 * Math.sqrt(hash(i, seed + 1)), x = Math.cos(a0) * r0, y = Math.sin(a0) * r0 * 0.95, a = hash(i, seed + 2) * TAU, L = 70 + 160 * hash(i, seed + 3); crackLine(ctx, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.8, seed + i, k * 0.9, { w: 2, jag: 8, seg: 28, col: '#ff9a4a', ink: '#2a0a04' }); }
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 26; i++) { const a = hash(i, seed + 7) * TAU, r = 40 + 500 * Math.sqrt(hash(i, seed + 8)); glow(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.95, 14 + 12 * hash(i, seed + 9), i % 3 ? C.ember : C.emberHi, 0.4 * k * (0.5 + 0.5 * Math.sin(age * 2.5 + i))); }
        }, id);
        break;
      }
      case 'clHorizon': {
        // the cuts, left glowing along the long edges of the band
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, x0 = s.x, y0 = s.y, hw = s.w / 2;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          ctx.save(); ctx.lineCap = 'round';
          for (const sd of [-1, 1]) for (const [off, col, w, al, lit] of [[0, '#2a1c06', 9, 0.45, 0], [-4, '#ffd36a', 2, 0.8, 1], [4, '#ffd36a', 2, 0.8, 1]]) {
            const v = sd * hw + off * sd * -1; ctx.globalCompositeOperation = lit ? 'lighter' : 'source-over';
            ctx.beginPath(); ctx.moveTo(x0 - sa * v, y0 + ca * v); ctx.lineTo(x0 + ca * L - sa * v, y0 + sa * L + ca * v); ctx.strokeStyle = rgba(col, al * k); ctx.lineWidth = w; ctx.stroke();
          }
          ctx.restore();
        }, id);
        break;
      }
      case 'clDive': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, x0 = s.x, y0 = s.y;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          scar(ctx, x0, y0, x0 + ca * L, y0 + sa * L, seed, k, { layers: [[0, '#0a0818', 30, 0.3], [-22, '#ffe9a8', 2, 0.45], [22, '#ffe9a8', 2, 0.45], [0, '#fff4cc', 2, 0.5]] });
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 24; i++) { const d = hash(i, seed + 3) * L, v = (hash(i, seed + 4) - 0.5) * 190; glow(ctx, x0 + ca * d - sa * v, y0 + sa * d + ca * v, 5, '#ffeebb', 0.5 * k * (0.4 + 0.6 * Math.sin(age * 3 + i))); }
          ctx.restore();
        }, id);
        break;
      }
      case 'clNight': case 'clStarRain':
        mark(T.short, {}, (ctx, q, k) => {
          ARENA.trace(ctx, -10); ctx.lineJoin = 'round';
          ctx.strokeStyle = rgba(C.violet, 0.2 * k); ctx.lineWidth = 20; ctx.stroke(); ctx.strokeStyle = rgba(C.violetHi, 0.3 * k); ctx.lineWidth = 3; ctx.stroke();
        }, id);
        break;
    }
  }

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // H: the shared helpers boss-vfx.js owns (shapeFlash, shockAt, scatter, after, shake, roomTint, sweep, streak, bang, AFT, coverShadows, clipOut, AR)
  const IMP = {};
  const dist2line = (u, s) => { const ca = Math.cos(s.angle), sa = Math.sin(s.angle), dx = u.x - s.x, dy = u.y - s.y, al = dx * ca + dy * sa, off = Math.abs(-dx * sa + dy * ca); return { al, off }; };
  const onLine = (ctx, s, L, pad = 6) => (ctx.units || []).filter(u => { const q = dist2line(u, s); return q.al > 0 && q.al < L && q.off < s.w / 2 + pad; });
  let wakeSeq = 0;

  // the afterimage cut: he leaves silver copies of himself standing along the line as he goes through, each coming apart in turn
  function afterTrail(s) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, n = Math.max(3, Math.min(6, Math.round(L / 150)));
    VFX.fx({ dur: 0.85, layer: 'air', draw: (c, p, t, e) => {
      c.save(); clipRoom(c);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.7) / (n + 0.4), q = clamp((p - u * 0.3) / 0.5, 0, 1); if (q <= 0 || q >= 1) continue;
        ghostFig(c, 'caelum', s.x + ca * L * u, s.y + sa * L * u + 24 * q, s.angle, (1 - q) * Math.min(1, q * 6) * e.a);
      }
      c.restore();
    } });
  }

  // a cut: the line of light drawn along it in a stroke, the image at its end shattering into silver, sparks where it passes through
  function cutImp(tg, ctx, H, o = {}) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, ex = s.x + ca * L, ey = s.y + sa * L, sky = isSky(), col = o.col || (sky ? C.gold : '#c8d4f4'), core = o.core || '#ffffff';
    H.streak(s.x, s.y, s.angle, col, { len: L, w: o.w || 17, dur: 0.4 });
    H.streak(s.x, s.y, s.angle, core, { len: L, w: (o.w || 17) * 0.34, dur: 0.3 });
    H.shapeFlash(s, col, { a: 0.2, dur: 0.45 });
    for (let d = 70, i = 0; d < L; d += 90, i++) H.after(d / L * 0.14, () => { VFX.sparks(s.x + ca * d, s.y + sa * d, { color: i % 2 ? core : col, n: 3, speed: 260 }); });
    // the figure at the end of it, shattering
    VFX.hit(ex, ey - 40, core, 1.8); shards(ex, ey - 30, o.shards || 12, o.sh); dust(ex, ey - 30, 8, { speed: 170 });
    H.shockAt(ex, ey + 40, { r: 150, color: col, w: 6, dur: 0.5, flat: 1 });
    for (const u of onLine(ctx, s, L)) { VFX.hit(u.x, u.y, core, 1.7); VFX.sparks(u.x, u.y, { color: col, n: 8, speed: 300 }); }
    H.shake(o.shake || 5);
    // the blade's last arc through the figure at its end
    if (!o.noArc) VFX.slash(ex, ey - 30, s.angle + Math.PI, { r: 120, span: 2.4, color: col, core, dur: 0.38, sparks: 5, flip: tg.id % 2 === 0 });
  }
  IMP.clGlint = (tg, msg, ctx, H) => { afterTrail(tg.live); cutImp(tg, ctx, H, { w: 20, shake: 7 }); cam(0.06, 0.03, 0.4, 2.5); };
  IMP.clWake = (tg, msg, ctx, H) => {
    afterTrail(tg.live);
    cutImp(tg, ctx, H);
    // the camera holds a beat after the last cut of a dance
    const my = ++wakeSeq; H.after(0.8, () => { if (wakeSeq === my) cam(0.12, 0.04, 0.55, 0); });
  };
  IMP.clChorusCut = (tg, msg, ctx, H) => { cutImp(tg, ctx, H, { col: '#8fe0ff', core: '#ffffff', w: 15, sh: { color: '#cfeeff', color2: '#6fb8e8' }, noArc: true }); };
  IMP.clChorusLeap = (tg, msg, ctx, H) => {
    const s = tg.live;
    H.shapeFlash(s, '#ffc23a', { a: 0.3, dur: 0.5 }); VFX.hit(s.x, s.y, '#fff0a8', 2.4);
    H.bang(s.x, s.y, 150, { n: 14, color: '#ffc23a', core: '#ffffff', ink: '#3a1e04' }); H.shockAt(s.x, s.y, { r: s.r * 1.1, color: '#ffd36a', w: 8, dur: 0.55, flat: 1 });
    VFX.debris(s.x, s.y, { color: '#9a7e50', n: 10, speed: 1.2 }); H.shake(8);
  };
  IMP.clChorusBloom = (tg, msg, ctx, H) => {
    const s = tg.live, R = Math.min(s.r, AR() * 1.6);
    H.streak(s.x, s.y, s.angle, '#a064ff', { len: R, w: 22, dur: 0.4 }); H.streak(s.x, s.y, s.angle, '#ffffff', { len: R, w: 6, dur: 0.3 });
    H.shapeFlash(s, '#dcc4ff', { a: 0.22, dur: 0.45 });
    for (const q of H.scatter(s, 5)) H.after(rand(0, 0.2), () => VFX.sparks(q.x, q.y, { color: '#dcc4ff', n: 4, speed: 240 }));
    H.shake(4);
  };

  // Cinder Crown and Pinning Thrust (the shared buster hands over)
  IMP.buster = (tg, msg, ctx, H) => {
    const s = tg.live, e = tg.target != null ? ctx.entById(tg.target) : null;
    if (tg.tag === 'clCrown') {
      const x = e ? e.x : s.x, y = e ? e.y : s.y;
      H.shapeFlash(s, C.violetHi, { a: 0.3, dur: 0.55 });
      VFX.pillar(x, y, { r: 70, h: 460, color: '#cdbfff', dur: 0.8 }); VFX.pillar(x, y, { r: 26, h: 520, color: '#ffffff', dur: 0.6 });
      VFX.hit(x, y, '#e8e0ff', 2.6); H.bang(x, y, 160, { n: 14, color: C.violet, core: '#ffffff', ink: '#0a0618' });
      for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: s.r * (1.1 - i * 0.2), color: i ? '#ffffff' : C.violetHi, w: 9 - i * 2, dur: 0.55 + i * 0.1, flat: 1, delay: i * 0.07 });
      VFX.sparks(x, y, { color: '#e8e0ff', n: 20, speed: 420 }); dust(x, y, 14, { color: '#cdbfff', speed: 240 }); shards(x, y, 8, { color: '#cdbfff', color2: '#4a3a98' });
      H.shake(11); return;
    }
    // Pinning Thrust: the lance of light along the lane, to the wall
    const d = Math.min(s.len, wall(s.x, s.y, s.angle)), ca = Math.cos(s.angle), sa = Math.sin(s.angle), ex = s.x + ca * d, ey = s.y + sa * d;
    H.streak(s.x, s.y, s.angle, C.violet, { len: d, w: 26, dur: 0.45 }); H.streak(s.x, s.y, s.angle, '#ffffff', { len: d, w: 9, dur: 0.32 });
    H.shapeFlash(s, C.violetHi, { a: 0.22, dur: 0.5 });
    for (let k = 90, i = 0; k < d; k += 80, i++) H.after(k / d * 0.15, () => VFX.sparks(s.x + ca * k, s.y + sa * k, { color: i % 2 ? '#ffffff' : C.violetHi, n: 3, speed: 260 }));
    const x = e ? e.x : s.x + ca * 300, y = e ? e.y : s.y + sa * 300;
    VFX.hit(x, y, '#e8e0ff', 2.2); H.bang(x, y, 120, { n: 12, color: C.violet, core: '#ffffff', ink: '#0a0618' });
    // where they are driven to the wall: it cracks
    H.after(0.2, () => { VFX.crystals(ex, ey, { r: 60, n: 9, h: 70, color: '#cdbfff', dur: 1.0 }); H.shockAt(ex, ey, { r: 180, color: '#cdbfff', w: 7, dur: 0.5, flat: 1 }); shards(ex, ey, 10, { color: '#cdbfff' }); H.shake(10); });
    H.shake(9); cam(0.1, 0.035, 0.5, 2);
  };

  // Nightfall: the held breath is let go; a dark flame goes in from the rim and the light comes back, thin
  IMP.clNight = (tg, msg, ctx, H) => {
    H.roomTint('#08041a', 0.5, 1.0); H.roomTint(C.violetHi, 0.14, 0.6);
    for (let i = 0; i < 3; i++) H.shockAt(0, 0, { r: AR() * (1.3 - i * 0.25), color: i % 2 ? C.violetHi : C.violet, w: 14 - i * 3, dur: 0.8 + i * 0.1, flat: 1, delay: i * 0.1 });
    VFX.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.5, 0, 1)), k = e.a * (1 - clamp((p - 0.3) / 0.7, 0, 1)), R = AR();
      c.save(); clipRoom(c); c.globalCompositeOperation = 'lighter';
      const n = 60; for (let i = 0; i < n; i++) { const a = i * TAU / n, rr = R - q * R * 0.5 * (0.5 + hash(i, 3)), h = 40 + 60 * hash(i, 4); c.beginPath(); c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); c.lineTo(Math.cos(a) * (rr - h), Math.sin(a) * (rr - h)); c.strokeStyle = rgba(i % 3 ? C.violet : C.violetHi, 0.6 * k); c.lineWidth = 6; c.stroke(); }
      c.restore();
    } });
    for (const u of ctx.units || []) VFX.hit(u.x, u.y, C.violetHi, 1.1);
    H.shake(9);
  };
  // Starfall: the shard comes down into the ring; light stands up out of it, and the crystal it leaves
  IMP.clStar = (tg, msg, ctx, H) => {
    const s = tg.live, fail = !!(msg && msg.fail);
    H.shapeFlash(s, fail ? '#ff8a7a' : '#cfe0ff', { a: 0.34, dur: 0.5 });
    VFX.pillar(s.x, s.y, { r: s.r * 0.7, h: 520, color: '#cdbfff', dur: 0.7 }); VFX.pillar(s.x, s.y, { r: s.r * 0.25, h: 600, color: '#ffffff', dur: 0.55 });
    VFX.hit(s.x, s.y, '#e8e0ff', fail ? 3.2 : 2.4); H.bang(s.x, s.y, s.r * 1.6, { n: 14, color: C.violet, core: '#ffffff', ink: '#0a0618' });
    VFX.crystals(s.x, s.y, { r: s.r * 0.8, n: 10, h: 90, color: '#cdbfff', dur: 1.3 }); H.shockAt(s.x, s.y, { r: s.r * 2.2, color: fail ? '#ff8a7a' : '#cdbfff', w: 8, dur: 0.6, flat: 1 });
    VFX.sparks(s.x, s.y, { color: '#e8e0ff', n: 18, speed: 420 }); shards(s.x, s.y, 8, { color: '#6a5ac8', color2: '#1c1740' });
    if (fail) { H.shockAt(s.x, s.y, { r: AR() * 0.9, color: '#ff6a5a', w: 10, dur: 0.8, flat: 1, delay: 0.05 }); H.shake(13); cam(0.1, 0.04, 0.5, 1.5); }
    else {
      // soaked: the shard is caught, light thrown up the arms of whoever took it, and a second, quieter ring as the crystal settles
      H.shockAt(s.x, s.y, { r: s.r * 1.4, color: '#ffffff', w: 4, dur: 0.7, flat: 1, delay: 0.18 });
      for (const u of inside(ctx, s, 6)) { VFX.pillar(u.x, u.y, { r: 22, h: 220, color: '#e8e0ff', dur: 0.6 }); VFX.motes(u.x, u.y, { n: 6, color: '#ffffff', r: 20, rise: 1 }); }
      H.shake(7); cam(0.06, 0.025, 0.4, 2);
    }
  };
  IMP.clStarRain = (tg, msg, ctx, H) => {
    H.roomTint(C.violetHi, 0.12, 0.6);
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 40 }, 10)) H.after(rand(0, 0.35), () => { VFX.sparks(q.x, q.y, { color: '#cdbfff', n: 3, speed: 220 }); VFX.flash(q.x, q.y - 12, 26, '#cdbfff', 0.25); });
  };
  IMP.clEmber = (tg, msg, ctx, H) => { const s = tg.live; VFX.flash(s.x, s.y - 18, 56, C.fire, 0.3); H.shockAt(s.x, s.y, { r: 90, color: C.ember, w: 5, dur: 0.4, flat: 1 }); };
  // the Starwyrm's coil: a piece goes white-gold as the serpent passes, star-dust thrown up off it
  IMP.clCoil = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len;
    H.streak(s.x, s.y, s.angle, C.gold, { len: L, w: s.w * 0.36, dur: 0.4 }); H.streak(s.x, s.y, s.angle, '#ffffff', { len: L, w: s.w * 0.1, dur: 0.3 });
    H.shapeFlash(s, '#ffeebb', { a: 0.22, dur: 0.5 });
    for (let d = 20, i = 0; d < L; d += 40, i++) H.after(d / L * 0.1, () => { const v = (Math.random() - 0.5) * s.w * 0.7; VFX.sparks(s.x + ca * d - sa * v, s.y + sa * d + ca * v, { color: i % 2 ? '#ffeebb' : '#ffffff', n: 2, speed: 240 }); });
    for (const u of onLine(ctx, s, L)) { VFX.hit(u.x, u.y, '#fff4cc', 1.8); dust(u.x, u.y, 6, { color: '#ffeebb' }); }
    H.shake(5);
  };
  // Embers of Heaven: burning rock comes down on the shard, fire stands up, the star-glass breaks
  IMP.clEmbers = (tg, msg, ctx, H) => {
    const s = tg.live;
    H.shapeFlash(s, C.ember, { a: 0.36, dur: 0.55 });
    VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 460, color: '#ffb870', dur: 0.8 }); VFX.pillar(s.x, s.y, { r: s.r * 0.2, h: 520, color: '#ffffff', dur: 0.55 });
    H.bang(s.x, s.y, s.r * 1.5, { n: 16, color: C.fire, core: '#fff0c0', ink: '#3a1408' }); VFX.hit(s.x, s.y, '#ffd890', 2.6);
    H.shockAt(s.x, s.y, { r: s.r * 1.4, color: C.ember, w: 9, dur: 0.6, flat: 1 }); H.shockAt(s.x, s.y, { r: s.r * 0.9, color: '#ffffff', w: 5, dur: 0.5, flat: 1, delay: 0.08 });
    for (let i = 0; i < 16; i++) { const a = rand(0, TAU), sp = rand(120, 360); VFX.spawn({ x: s.x, y: s.y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(140, 320), g: 560, life: 0.9, size: rand(8, 15), color: i % 2 ? '#ffb870' : '#3a2418', kind: i % 2 ? 'glow' : 'shard', add: i % 2 === 0, vr: rand(-10, 10) }); }
    VFX.smoke(s.x, s.y, { n: 6, color: '#3a2418', size: 44, a: 0.55, speed: 100 });
    for (const u of inside(ctx, s)) VFX.hit(u.x, u.y, '#ffd890', 1.8);
    H.shake(12);
  };
  const inside = (ctx, s, pad = 0) => (ctx.units || []).filter(u => SHAPES.contains(s, u.x, u.y, pad));
  // Constellation Fall: the whole floor lit white; the light is cut away from the shadows behind the star's pieces
  IMP.clConstellation = (tg, msg, ctx, H) => {
    const src = tg.cover || [tg.live.x, tg.live.y], sh = H.coverShadows(src[0], src[1], ctx && ctx.props), ang = Math.atan2(-src[1], -src[0]), R = AR() * 2.5, W = AR() * 1.3;
    VFX.fx({ dur: 1.6, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * (1 - easeOut(clamp((p - 0.1) / 0.9, 0, 1))), q = easeOut(clamp(p / 0.25, 0, 1));
      c.save(); clipRoom(c); H.clipOut(c, sh);
      c.translate(src[0], src[1]); c.rotate(ang); c.globalCompositeOperation = 'screen';
      const g = c.createLinearGradient(0, 0, R * q, 0); g.addColorStop(0, rgba('#ffffff', 0.9 * k)); g.addColorStop(0.6, rgba('#fff0c0', 0.6 * k)); g.addColorStop(1, rgba(C.gold, 0.35 * k));
      c.fillStyle = g; c.fillRect(0, -W, R * q, W * 2);
      c.globalCompositeOperation = 'source-over'; c.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const y = (hash(i, 3) - 0.5) * W * 2, len = 160 + 380 * hash(i, 4), x = ((t * 2400 * (0.6 + hash(i, 5)) + hash(i, 6) * R) % (R + len)) - len; c.beginPath(); c.moveTo(x - len, y); c.lineTo(x, y); c.strokeStyle = rgba('#ffffff', 0.7 * k * hash(i, 7)); c.lineWidth = 2 + 4 * hash(i, 8); c.stroke(); }
      c.restore();
    } });
    H.roomTint('#fff4cc', 0.5, 1.4);
    // the floor takes it: fire standing up, and embers, anywhere the star's shadow is not
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 30 }, 40)) { if (sh.some(poly => inPoly(poly, q.x, q.y))) continue; H.after(rand(0, 0.5), () => { VFX.flare(q.x, q.y, { color: '#ff9a4a', n: 10, r: 26, h: 1.5, size: 1.2 }); VFX.sparks(q.x, q.y, { color: '#ffe9b0', n: 3, speed: 240 }); }); }
    for (let i = 0; i < 3; i++) H.shockAt(src[0], src[1], { r: AR() * 2.2, color: i ? '#ffffff' : C.gold, w: 14 - i * 4, dur: 1.0 + i * 0.12, flat: 1, delay: i * 0.1 });
    H.shake(14); cam(0.14, 0.04, 0.6, 0);
    // anyone left standing in the dark of the star: a cold spark, nothing more
    for (const u of ctx.units || []) if (sh.some(poly => inPoly(poly, u.x, u.y))) VFX.motes(u.x, u.y, { n: 4, color: '#cfd6f2', r: 18, rise: 1 }); else VFX.hit(u.x, u.y, '#fff4cc', 1.6);
  };
  // Horizon Cut: the shards come down on the red and the cut is drawn across the whole band
  IMP.clHorizon = (tg, msg, ctx, H) => {
    const s = tg.live, sky = isSky(), col = sky ? '#ffd36a' : '#fff0b8';
    H.shapeFlash(s, col, { a: 0.4, dur: 0.6 });
    H.streak(s.x, s.y, s.angle, C.gold, { len: s.len, w: 26, dur: 0.5 }); H.streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 9, dur: 0.38 });
    for (const q of H.scatter(s, 12)) H.after(rand(0, 0.3), () => { VFX.crystals(q.x, q.y, { r: 24, n: 4, h: 58, color: '#ffe9a8', dur: 0.8 }); VFX.sparks(q.x, q.y, { color: '#fff4cc', n: 5, speed: 280 }); VFX.flash(q.x, q.y - 10, 30, '#fff4cc', 0.3); });
    for (const u of inside(ctx, s, 4)) { VFX.hit(u.x, u.y, '#fff4cc', 2); }
    // the blade's edge where the gap was left: a razor line of light along it and sparks running down it, so a clean dodge is seen
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), R = AR();
    for (const sd of [-1, 1]) {
      const v = (s.x * -sa + s.y * ca) + sd * s.w / 2; if (Math.abs(v) > R + 20) continue;
      const bx = -sa * v, by = ca * v;
      H.streak(bx - ca * R, by - sa * R, s.angle, '#ffffff', { len: R * 2, w: 5, dur: 0.5 });
      for (let d = -R + 60, i = 0; d < R; d += 85, i++) H.after(0.05 + (d + R) / (R * 2) * 0.25, () => VFX.sparks(bx + ca * d, by + sa * d, { color: i % 2 ? '#fff4cc' : C.gold, n: 3, speed: 230 }));
    }
    H.shake(10); cam(0.1, 0.04, 0.5, 1.5);
  };
  // Second Coil: the serpent goes through, a wake of light behind it
  IMP.clDive = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    H.streak(s.x, s.y, s.angle, C.gold, { len: s.len, w: 54, dur: 0.5 }); H.streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 16, dur: 0.38 });
    H.shapeFlash(s, '#ffeebb', { a: 0.3, dur: 0.55 });
    for (let d = 60, i = 0; d < s.len; d += 70, i++) H.after(d / s.len * 0.16, () => VFX.sparks(s.x + ca * d, s.y + sa * d, { color: i % 2 ? '#ffffff' : C.gold, n: 4, speed: 300 }));
    for (const u of onLine(ctx, s, s.len)) { VFX.hit(u.x, u.y, '#fff4cc', 2.2); dust(u.x, u.y, 8, { color: '#ffeebb', speed: 260 }); }
    H.shake(10); cam(0.1, 0.035, 0.5, 2);
  };

  // ---------------------------------------------------------------- propfx (boss-vfx.js propFx() asks first when the fight is his)
  function prop(msg, H) {
    if (msg.k === 'clember') {
      const x = msg.x, y = msg.y;
      if (msg.ok) {
        // set down at the shadow's edge: a pulse of light, and the dark pushed back
        for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: 170 + i * 50, color: i ? '#ffffff' : '#e8e0ff', w: 8 - i * 2, dur: 0.6 + i * 0.1, flat: 1, delay: i * 0.08 });
        VFX.flash(x, y - 20, 110, '#ffffff', 0.5); VFX.pillar(x, y, { r: 36, h: 300, color: '#e8e0ff', dur: 0.7 }); VFX.sparks(x, y, { color: '#ffffff', n: 16, speed: 360 }); dust(x, y, 12, { color: '#e8e0ff', speed: 220 });
        H.shake(5);
      } else {
        // anywhere else it burns where it fell
        VFX.flash(x, y - 14, 80, C.fire, 0.45); VFX.flare(x, y, { color: '#ff7a2a', n: 14, r: 40, h: 1.6, size: 1.3 }); VFX.smoke(x, y, { n: 6, color: '#1a0e0a', size: 40, a: 0.6, speed: 90 });
        H.shockAt(x, y, { r: 130, color: C.fire, w: 7, dur: 0.5, flat: 1 }); VFX.sparks(x, y, { color: C.emberHi, n: 12, speed: 300 }); H.shake(6);
      }
      return true;
    }
    if (msg.kind === 'starshard' && msg.k === 'break') {
      // a piece of the star breaking: star-glass in bright, sharp pieces, a burst of light
      const x = msg.x, y = msg.y, r = msg.r || 38;
      VFX.crystals(x, y, { r: r * 1.4, n: 12, h: 90, color: '#cdbfff', dur: 1.2 }); shards(x, y - 20, 16, { color: '#e8e0ff', color2: '#5a4fb0', size: 1.2 });
      VFX.flash(x, y - 30, r * 3, '#ffffff', 0.5); VFX.sparks(x, y - 20, { color: '#fff0c4', n: 20, speed: 420 });
      H.shockAt(x, y, { r: r * 3.2, color: '#cdbfff', w: 8, dur: 0.55, flat: 1 }); VFX.smoke(x, y - 10, { n: 5, color: '#5a4fb0', size: 36, a: 0.5, speed: 90 });
      H.shake(9); return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- the enrage, the entrance, the fall
  // The Sky Comes Down: the meteor that has hung over every room of the set falls. The heat climbs from the top of the screen, embers rain,
  // the dark of the shadow deepens; in the last seconds the whole room goes white.
  function enrage(sh, b, dur, H) {
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => H.wash(c, '#8a3a1a', e.a * 0.3 * Math.min(1, t / dur), 'multiply') }));
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'air', draw: (c, p, t, e) => {
      const q = clamp(t / dur, 0, 1), k = e.a * easeOut(clamp(t / 1.5, 0, 1)) * (1 - clamp((t - dur) / 2.5, 0, 1)), W = c.canvas.width, Hh = c.canvas.height;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      // the underside of the meteor, coming down over the top of the room
      const g = c.createLinearGradient(0, 0, 0, Hh * (0.35 + 0.5 * q)); g.addColorStop(0, rgba('#ffd890', (0.3 + 0.7 * q) * k)); g.addColorStop(0.4, rgba('#ff7a2a', (0.18 + 0.5 * q) * k)); g.addColorStop(1, rgba('#ff3a0a', 0));
      c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(0, 0, W, Hh);
      const rg = c.createRadialGradient(W / 2, -Hh * 0.1, 10, W / 2, -Hh * 0.1, Hh * (0.35 + 0.6 * q)); rg.addColorStop(0, rgba('#ffffff', (0.2 + 0.8 * q * q) * k)); rg.addColorStop(1, rgba('#ff9a4a', 0));
      c.fillStyle = rg; c.fillRect(0, 0, W, Hh);
      // the edges of the room reddening
      c.globalCompositeOperation = 'source-over'; vig(c, W, Hh, 0.55 * q * k, 0.28, '60,8,0');
      c.restore();
    } }));
    // the room taking it in beats, each harder: a ring of heat, a shove, the camera held at the last
    [0.2, 0.42, 0.6, 0.74, 0.84, 0.92].forEach((f, i) => H.soon(sh, f * dur, () => {
      H.shockAt(0, 0, { r: H.AR * 1.25, color: i % 2 ? '#ffd890' : '#ff7a2a', w: 8 + i * 2, dur: 0.8, flat: 1 }); H.roomTint('#ff7a2a', 0.08 + 0.03 * i, 0.5); H.shake(4 + i * 2);
      if (i === 5) cam(0.1, 0.03, 0.5, 0);
    }));
    // embers raining out of the dark, burning stones falling through the room
    H.emit(sh, dur + 0.5, 0.9, () => { const q = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 20 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(280, 520), vx: rand(-30, 30), vz: -rand(160, 340), life: 1.6, size: rand(5, 11), size1: 2, color: Math.random() < 0.5 ? '#ffb870' : '#fff0c0', kind: 'glow' }); });
    H.emit(sh, dur, 0.18, () => { const q = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 60 }, 1)[0]; if (q) { VFX.spawn({ x: q.x, y: q.y, z: rand(500, 760), vx: rand(-40, 40), vz: -rand(300, 520), g: 200, life: 1.7, size: rand(14, 24), color: '#2a1e18', kind: 'shard', add: false, vr: rand(-6, 6) }); VFX.spawn({ x: q.x, y: q.y, z: rand(500, 760), vz: -rand(300, 520), g: 200, life: 1.7, size: rand(22, 34), color: '#ff7a2a', kind: 'glow' }); } });
    // the white-hot end: the last second builds to white
    H.own(sh, VFX.fx({ dur: dur + 1, layer: 'air', draw: (c, p, t, e) => { const q = clamp((t - (dur - 1.4)) / 1.4, 0, 1); if (q > 0) H.wash(c, '#fff4dc', e.a * 0.55 * q * q, 'screen'); } }));
  }
  function enrageLand(b, H) {
    // the meteor lands: the whole room goes white, and the white is let go of slowly
    VFX.fx({ dur: 2.8, layer: 'air', draw: (c, p, t, e) => {
      const a = e.a * (p < 0.1 ? 1 : 1 - easeOut(clamp((p - 0.1) / 0.9, 0, 1)) * 0.98);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = Math.min(1, a); c.fillStyle = '#fffaf0'; c.fillRect(0, 0, c.canvas.width, c.canvas.height); c.restore();
    } });
    for (let i = 0; i < 5; i++) H.shockAt(0, 0, { r: H.AR * (1.7 - i * 0.2), color: i % 2 ? '#ffd890' : '#ffffff', w: 20 - i * 3, dur: 1.0 + i * 0.1, flat: 1, delay: i * 0.1 });
    H.roomTint('#ffffff', 0.7, 1.6);
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 30 }, 30)) VFX.flare(q.x, q.y, { color: '#ff9a4a', n: 12, r: 30, h: 1.8, size: 1.3 });
    cam(0.2, 0.06, 0.8, 0); H.shake(24);
  }
  // the entrance: he walks out of the star's light and stands; one held moment, as he speaks (no words on screen)
  function intro(sh, b, H) {
    const sx = 0, sy = 0;
    H.soon(sh, 0.1, () => { VFX.pillar(sx, sy, { r: 70, h: 700, color: '#f4f7ff', dur: 1.8 }); VFX.pillar(sx, sy, { r: 24, h: 760, color: '#ffffff', dur: 1.5 }); H.shockAt(sx, sy, { r: 360, color: '#cfd6f2', w: 8, dur: 1.0, flat: 1 }); H.shockAt(sx, sy, { r: 220, color: '#ffffff', w: 4, dur: 0.8, flat: 1, delay: 0.12 }); VFX.flash(sx, sy - 40, 160, '#ffffff', 0.4); });
    // the light of the star laid along the ground to him, and fading as he steps out of it
    H.own(sh, VFX.fx({ dur: 3.0, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.4) * (1 - clamp((t - 1.6) / 1.2, 0, 1)), a = Math.atan2(b.y - sy, b.x - sx), L = Math.hypot(b.x - sx, b.y - sy);
      c.save(); c.translate(sx, sy); c.rotate(a); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba('#ffffff', 0.5 * k)); g.addColorStop(1, rgba('#cfd6f2', 0.1 * k));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -30); c.lineTo(L, -10); c.lineTo(L, 10); c.lineTo(0, 30); c.closePath(); c.fill();
      for (let i = 0; i < 12; i++) { const q = (t * 0.5 + i / 12) % 1; glow(c, q * L, (hash(i, 3) - 0.5) * 30, 7, '#ffffff', 0.7 * k * Math.sin(q * Math.PI)); }
      c.restore();
    } }));
    H.soon(sh, 1.8, () => { VFX.flash(b.x, b.y - 60, 120, '#ffffff', 0.3); H.shockAt(b.x, b.y, { r: 200, color: '#cfd6f2', w: 5, dur: 0.8, flat: 1 }); H.shake(3); });
    // the held moment: the room draws a breath and is still while he speaks
    H.soon(sh, 2.1, () => { screenFx(1.1, (c, W, Hh, t, p, e) => { const k = Math.sin(clamp(p, 0, 1) * Math.PI) * e.a; vig(c, W, Hh, 0.55 * k, 0.3, '2,3,12'); }); });
  }
  // his fall: the halo breaks, his mask falls and the meteor overhead breaks into falling stars over the whole room
  function mask(c, x, y, k) {
    c.save(); c.translate(x, y); c.globalAlpha = k;
    const g = c.createLinearGradient(-16, -22, 16, 22); g.addColorStop(0, '#f4f7ff'); g.addColorStop(0.5, '#cfd6f2'); g.addColorStop(1, '#8f9ac0');
    c.beginPath(); c.moveTo(0, -24); c.bezierCurveTo(16, -22, 18, 4, 9, 18); c.quadraticCurveTo(0, 28, -9, 18); c.bezierCurveTo(-18, 4, -16, -22, 0, -24); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = '#2a3050'; c.lineWidth = 1.8; c.stroke();
    c.beginPath(); c.moveTo(-9, -4); c.lineTo(-3, -2); c.moveTo(9, -4); c.lineTo(3, -2); c.strokeStyle = '#2a3050'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(0, -22); c.lineTo(1, -10); c.lineTo(-2, 4); c.lineTo(0, 22); c.strokeStyle = rgba('#2a3050', 0.7); c.lineWidth = 1.1; c.stroke();
    c.restore();
  }
  function death(sh, b, H) {
    // the halo breaks: a ring of pieces thrown out, the light going out of the glass
    H.soon(sh, 0.35, () => {
      H.shockAt(b.x, b.y, { r: 380, color: '#dfe5fa', w: 10, dur: 0.8, flat: 1 }); H.shockAt(b.x, b.y, { r: 230, color: '#ffffff', w: 5, dur: 0.7, flat: 1, delay: 0.08 });
      VFX.flash(b.x, b.y - 100, 190, '#ffffff', 0.5); H.shake(10);
      for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + rand(-0.1, 0.1), sp = rand(200, 420); VFX.spawn({ x: b.x, y: b.y, z: 110 + rand(-20, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.55, vz: rand(40, 220), g: 420, life: 1.5, size: rand(14, 22), color: i % 2 ? '#dfe5fa' : '#8f9ac0', kind: 'shard', add: false, vr: rand(-9, 9) }); }
      dust(b.x, b.y - 90, 18, { speed: 300, size: 1.2 });
    });
    // the figure goes to silver light and comes apart, rising
    H.emit(sh, 2.4, 0.3, (p) => { if (p < 0.25) return; const a = rand(0, TAU), d = rand(0, 40); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: rand(20, 150), vx: rand(-14, 14), vz: rand(20, 70), life: rand(1.2, 2), size: rand(6, 12), size1: 0, color: Math.random() < 0.6 ? '#ffffff' : '#cfd6f2', kind: Math.random() < 0.5 ? 'star' : 'glow', vr: rand(-4, 4) }); });
    // the mask falls from where his face was, turns once and breaks on the floor
    VFX.fx({ dur: 3.2, delay: 1.0, layer: 'air', draw: (c, p, t, e) => {
      const q = clamp(t / 0.85, 0, 1), fall = q * q, x = b.x + 10 + Math.sin(t * 5) * 3 * (1 - q), y = b.y - 150 + fall * 190, rot = fall * 4.4, a = e.a * Math.min(1, t / 0.15) * (1 - clamp((t - 2.4) / 0.8, 0, 1));
      if (t < 0.85) { c.save(); c.translate(x, y); c.rotate(rot); mask(c, 0, 0, a); c.restore(); glow(c, x, y, 40, '#ffffff', 0.3 * a); }
      else {
        const u = clamp((t - 0.85) / 1.2, 0, 1), fx2 = b.x + 10, fy = b.y + 40;
        ellipse(c, fx2, fy + 4, 30 * (1 + u), 9 * (1 + u), 0, null, rgba('#ffffff', 0.7 * (1 - u) * a), 2);
        for (const sd of [-1, 1]) { c.save(); c.translate(fx2 + sd * (6 + 22 * easeOut(u)), fy - 4 * (1 - u)); c.rotate(sd * (0.2 + 1.1 * easeOut(u))); c.beginPath(); c.rect(sd > 0 ? 0 : -30, -30, 30, 60); c.clip(); c.translate(sd > 0 ? 0 : 0, 0); mask(c, sd > 0 ? -2 : 2, 0, a); c.restore(); }
      }
    }, tick: (p, dt, e) => { if (!e.landed && p * 3.2 > 0.85) { e.landed = true; VFX.shock(b.x + 10, b.y + 40, { r: 160, color: '#ffffff', w: 5, dur: 0.6, flat: 1 }); dust(b.x + 10, b.y + 30, 10, { speed: 160 }); shakeNow(5); } } });
    // the meteor overhead breaks into falling stars over the whole room
    H.soon(sh, 1.2, () => {
      H.roomTint('#fff4cc', 0.3, 1.2); shakeNow(8);
      const seeds = Array.from({ length: 34 }, (_, i) => ({ x: hash(i, 91), y: hash(i, 92), sp: 0.7 + hash(i, 93), len: 0.1 + 0.18 * hash(i, 94), at: hash(i, 95) * 2.4, w: 2 + 5 * hash(i, 96), hot: hash(i, 97) < 0.5 }));
      screenFx(5.2, (c, W, Hh, t, p, e) => {
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        const k = e.a * (1 - clamp((t - 4) / 1.2, 0, 1)), sc = Hh / 900;
        // the meteor's glow overhead, breaking up
        const gl = c.createRadialGradient(W / 2, -Hh * 0.05, 10, W / 2, -Hh * 0.05, Hh * 0.7); gl.addColorStop(0, rgba('#ffd890', 0.5 * k * (1 - clamp(t / 3, 0, 1)))); gl.addColorStop(1, rgba('#ff7a2a', 0));
        c.fillStyle = gl; c.fillRect(0, 0, W, Hh);
        for (const s of seeds) {
          const u = (t - s.at) / (1.6 / s.sp); if (u < 0 || u > 1) continue;
          const hx = (s.x * 1.3 - 0.15 + 0.5 * u) * W, hy = (-0.1 + 1.25 * u * (0.6 + 0.4 * s.y)) * Hh, tx = hx - (0.34 * s.len * 5) * W * 0.5 * 0.5, ty = hy - s.len * Hh * 1.6;
          const g2 = c.createLinearGradient(hx, hy, tx, ty); g2.addColorStop(0, rgba(s.hot ? '#ffd890' : '#ffffff', 0.9 * k)); g2.addColorStop(1, rgba('#ff7a2a', 0));
          c.beginPath(); c.moveTo(hx, hy); c.lineTo(tx, ty); c.strokeStyle = g2; c.lineWidth = s.w * sc * (1 - 0.3 * u); c.stroke();
          glow(c, hx, hy, 16 * sc * s.w * 0.4 + 6, s.hot ? '#ffb870' : '#ffffff', 0.7 * k);
        }
      });
    });
    H.emit(sh, 4.5, 0.7, () => { const q = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 30 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(300, 520), vx: rand(20, 60), vz: -rand(120, 300), life: 1.7, size: rand(5, 10), size1: 1, color: Math.random() < 0.5 ? '#fff0c0' : '#ffffff', kind: 'star', vr: rand(-4, 4) }); });
  }

  return {
    tell: tag => TELLS[tag] || null, buster, zone, puddle, floor, roomOver, aftermath, prop, enrage, enrageLand, intro, death,
    // (boss-vfx.js impact(): his moves land here; a tag it does not know falls through to the shared ones)
    impact(tg, msg, ctx, H) {
      const f = tg.type === 'buster' ? IMP.buster : IMP[tg.tag]; if (!f) return false;
      f(tg, msg, ctx, H); return true;
    },
    ghostFig, spriteOf, dust, shards,
  };
})();
