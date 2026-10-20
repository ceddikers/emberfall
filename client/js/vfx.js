// Particle + effect engine for ability and boss visuals. Cosmetic only.
//
// Built around three ideas from VFX practice:
//  - every effect has anticipation -> a bright climax -> dissipation (fade, embers, smoke);
//  - attention scales with importance: spammed fillers stay small, cooldowns and boss hits go big;
//  - your own effects are full strength; other players' are dimmed so the floor stays readable.
//
// Two kinds of things live here:
//  - particles: lots of small sprites (glow dots, sparks, stars, smoke, embers, petals, leaves, shards);
//  - effects: one-off animated shapes drawn by a function (shockwaves, magic circles, pillars, beams...).
// Both are in world coordinates. `z` is height above the floor (drawn as y - z), so things can rise.

const VFX = (() => {
  const parts = [];
  const effects = [];
  const MAX_PARTS = 1800;
  const TICK = 1 / 60;   // the fixed rate effect ticks run at
  let now = 0;
  let scale = 1;   // alpha multiplier for whatever is being spawned (others' abilities are dimmed)
  let muted = false;   // a hidden tab spawns nothing (it would all play at once on the way back)

  // ---------------------------------------------------------------- sprites (cached canvases)
  const cache = new Map();
  function makeCanvas(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c; }
  function sprite(kind, color) {
    const key = kind + color;
    let c = cache.get(key);
    if (c) return c;
    const [r, g, b] = hexToRgb(color);
    const col = a => `rgba(${r},${g},${b},${a})`;
    switch (kind) {
      case 'glow': c = makeCanvas(64, (x, s) => {
        const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, col(0.95)); gr.addColorStop(0.5, col(0.35)); gr.addColorStop(1, col(0));
        x.fillStyle = gr; x.fillRect(0, 0, s, s);
      }); break;
      case 'soft': c = makeCanvas(64, (x, s) => {
        const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        gr.addColorStop(0, col(0.8)); gr.addColorStop(0.6, col(0.25)); gr.addColorStop(1, col(0));
        x.fillStyle = gr; x.fillRect(0, 0, s, s);
      }); break;
      case 'star': c = makeCanvas(64, (x, s) => {
        // a four-point twinkle with a soft halo
        const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        gr.addColorStop(0, col(0.6)); gr.addColorStop(1, col(0));
        x.fillStyle = gr; x.fillRect(0, 0, s, s);
        x.translate(s / 2, s / 2); x.fillStyle = '#ffffff';
        x.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? s * 0.07 : s * 0.46; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        x.closePath(); x.fill();
      }); break;
      case 'smoke': c = makeCanvas(64, (x, s) => {
        // a cartoon puff: overlapping blobs, lit from the top left
        x.fillStyle = col(1);
        for (const [px, py, pr] of [[0.5, 0.56, 0.3], [0.32, 0.5, 0.2], [0.68, 0.5, 0.2], [0.42, 0.34, 0.2], [0.6, 0.36, 0.18]]) { x.beginPath(); x.arc(px * s, py * s, pr * s, 0, Math.PI * 2); x.fill(); }
        x.globalCompositeOperation = 'source-atop';
        const gr = x.createLinearGradient(0, 0, s, s);
        gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
        x.fillStyle = gr; x.fillRect(0, 0, s, s);
      }); break;
      case 'petal': c = makeCanvas(32, (x, s) => {
        x.translate(s / 2, s / 2); x.fillStyle = col(1);
        x.beginPath(); x.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(-s * 0.1, -s * 0.04, s * 0.18, s * 0.06, 0, 0, Math.PI * 2); x.fill();
      }); break;
      case 'leaf': c = makeCanvas(32, (x, s) => {
        x.translate(s / 2, s / 2); x.fillStyle = col(1); x.strokeStyle = 'rgba(10,30,10,0.7)'; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(-s * 0.42, 0); x.quadraticCurveTo(0, -s * 0.3, s * 0.42, 0); x.quadraticCurveTo(0, s * 0.3, -s * 0.42, 0); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-s * 0.36, 0); x.lineTo(s * 0.36, 0); x.stroke();
      }); break;
      case 'shard': c = makeCanvas(32, (x, s) => {
        x.translate(s / 2, s / 2); x.fillStyle = col(1); x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(0, -s * 0.45); x.lineTo(s * 0.16, 0); x.lineTo(0, s * 0.45); x.lineTo(-s * 0.16, 0); x.closePath(); x.fill(); x.stroke();
      }); break;
      case 'plus': c = makeCanvas(32, (x, s) => {
        const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        gr.addColorStop(0, col(0.5)); gr.addColorStop(1, col(0)); x.fillStyle = gr; x.fillRect(0, 0, s, s);
        x.fillStyle = col(1); x.fillRect(s * 0.4, s * 0.16, s * 0.2, s * 0.68); x.fillRect(s * 0.16, s * 0.4, s * 0.68, s * 0.2);
        x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(s * 0.44, s * 0.2, s * 0.08, s * 0.6);
      }); break;
      case 'drop': c = makeCanvas(32, (x, s) => {
        x.translate(s / 2, s / 2); x.fillStyle = col(1);
        x.beginPath(); x.moveTo(0, -s * 0.4); x.quadraticCurveTo(s * 0.28, s * 0.05, 0, s * 0.32); x.quadraticCurveTo(-s * 0.28, s * 0.05, 0, -s * 0.4); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(-s * 0.06, s * 0.04, s * 0.06, 0, Math.PI * 2); x.fill();
      }); break;
      case 'feather': c = makeCanvas(40, (x, s) => {
        // a soft quill: tinted vane, white spine, a few cuts in the edge
        x.translate(s / 2, s / 2); x.rotate(-0.5);
        x.fillStyle = col(0.95); x.beginPath(); x.moveTo(0, -s * 0.44); x.quadraticCurveTo(s * 0.2, -s * 0.1, s * 0.05, s * 0.36); x.lineTo(-s * 0.04, s * 0.36);
        x.quadraticCurveTo(-s * 0.2, -s * 0.1, 0, -s * 0.44); x.fill();
        x.globalCompositeOperation = 'destination-out'; x.lineWidth = 1.5;
        for (const yy of [-0.12, 0.05, 0.18]) { x.beginPath(); x.moveTo(s * 0.16, yy * s); x.lineTo(s * 0.04, (yy + 0.06) * s); x.stroke(); }
        x.globalCompositeOperation = 'source-over';
        x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -s * 0.4); x.lineTo(0, s * 0.44); x.stroke();
      }); break;
      default: return sprite('glow', color);
    }
    cache.set(key, c);
    return c;
  }

  // ---------------------------------------------------------------- particles
  // p: { x, y, z, vx, vy, vz, g, drag, life, size, size1, color, kind, add, rot, vr, stretch, a, spin, ground, fadeIn }
  // (full: the new one takes the slot of the oldest still around, instead of shifting the whole list)
  let oldest = 0;
  function spawn(p) {
    p.t0 = now; p.z = p.z || 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0;
    p.rot = p.rot ?? Math.random() * Math.PI * 2;
    p.a = (p.a ?? 1) * scale;
    if (muted) return p;
    if (parts.length >= MAX_PARTS) { oldest = (oldest + 1) % parts.length; parts[oldest] = p; }
    else parts.push(p);
    return p;
  }
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- effects
  // e: { layer: 'ground'|'air', dur, draw(ctx, p, t, e), add }
  function fx(e) { e.t0 = now + (e.delay || 0); e.sc = scale; e.a = (e.a ?? 1) * scale; if (!muted) effects.push(e); return e; }
  // run an effect's callbacks with the dimming it was spawned with
  function withScale(s, fn) { const prev = scale; scale = s; try { fn(); } finally { scale = prev; } }

  function update(t, dt) {
    now = t;
    // dead particles are dropped by compacting the list in one pass (keeps the draw order, no per-removal splice)
    let w = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const age = now - p.t0;
      if (age > p.life) continue;
      parts[w++] = p;
      const drag = p.drag ? Math.pow(1 - p.drag, dt * 60) : 1;
      p.vx *= drag; p.vy *= drag; p.vz *= drag;
      p.vz -= (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.z < 0 && p.bounce) { p.z = 0; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; }
      else if (p.z < 0 && p.g) { p.z = 0; p.vz = 0; p.vx *= 0.8; p.vy *= 0.8; }
      if (p.vr) p.rot += p.vr * dt;
      if (p.orbit) { // circling a point (auras, swirls)
        p.orbit.a += p.orbit.w * dt; p.orbit.r += (p.orbit.dr || 0) * dt;
        const c = p.orbit.follow || p.orbit;
        p.x = c.x + Math.cos(p.orbit.a) * p.orbit.r; p.y = c.y + Math.sin(p.orbit.a) * p.orbit.r * (p.orbit.flat ?? 0.55);
      }
    }
    parts.length = w;
    if (oldest >= w) oldest = 0;
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      if (now - e.t0 > e.dur) { effects.splice(i, 1); if (e.done) withScale(e.sc, e.done); continue; }
      // ticks (trails, motes) run at a steady 60 a second whatever the frame rate, so a 144 Hz screen doesn't spawn more
      // than twice the particles of a 60 Hz one, nor a slow frame fewer
      if (e.tick && now >= e.t0) {
        e._acc = Math.min((e._acc ?? TICK) + dt, TICK * 4);
        const q = Math.max(0, (now - e.t0) / e.dur);
        while (e._acc >= TICK - 1e-9) { e._acc -= TICK; withScale(e.sc, () => e.tick(q, TICK, e)); }
      }
    }
  }

  function drawPart(ctx, p) {
    const age = now - p.t0, q = age / p.life;
    let a = p.a * (q < (p.fadeIn || 0.08) ? q / (p.fadeIn || 0.08) : 1) * (1 - Math.pow(q, p.fadePow || 1.6));
    if (a <= 0.01) return;
    const size = p.size + ((p.size1 ?? p.size) - p.size) * q;
    const img = sprite(p.kind || 'glow', p.color);
    ctx.globalAlpha = Math.min(1, a);
    const op = p.add === false ? 'source-over' : 'lighter';
    if (op !== curOp) { ctx.globalCompositeOperation = op; curOp = op; }
    const y = p.y - p.z;
    if (p.stretch) {
      // streaks point along their velocity (sparks)
      const sp = Math.hypot(p.vx, p.vy - p.vz);
      const ang = Math.atan2(p.vy - p.vz, p.vx);
      const len = Math.max(size, size * p.stretch * Math.min(1, sp / 300));
      place(ctx, p.x, y, ang, 1);
      ctx.drawImage(img, -len / 2, -size / 4, len, size / 2);
      ctx.setTransform(base);
    } else if (p.kind && p.kind !== 'glow' && p.kind !== 'soft' && p.kind !== 'smoke') {
      place(ctx, p.x, y, p.rot, p.flutter ? Math.abs(Math.cos(now * p.flutter + p.t0 * 7)) * 0.8 + 0.2 : 1);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.setTransform(base);
    } else ctx.drawImage(img, p.x - size / 2, y - size / 2, size, size);
  }
  // rotated particles: one setTransform onto the camera's matrix instead of a save/translate/rotate/restore each
  let base = null, curOp = null;
  function place(ctx, x, y, ang, sy) {
    const c = Math.cos(ang), s = Math.sin(ang), m = base;
    ctx.setTransform(m.a * c + m.c * s, m.b * c + m.d * s, (m.c * c - m.a * s) * sy, (m.d * c - m.b * s) * sy, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f);
  }

  function draw(ctx, layer) {
    ctx.save();
    for (const e of effects) {
      if ((e.layer || 'air') !== layer || now < e.t0) continue;
      const p = Math.min(1, (now - e.t0) / e.dur);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = e.add ? 'lighter' : 'source-over';
      // one effect that throws is dropped, not allowed to stop the frame (its own save/restore is unwound here)
      ctx.save();
      try { e.draw(ctx, p, now - e.t0, e); } catch (err) { e.dur = 0; if (!e.warned) { e.warned = true; console.warn('effect dropped:', err); } }
      ctx.restore();
    }
    base = ctx.getTransform(); curOp = null;
    for (const pt of parts) if (!!pt.ground === (layer === 'ground')) drawPart(ctx, pt);
    ctx.restore();
  }

  // ---------------------------------------------------------------- drawing helpers for effects
  const env = (p, inT = 0.12, outT = 0.35) => Math.min(1, p / inT) * Math.min(1, (1 - p) / outT); // fade in/out
  function glowAt(ctx, x, y, r, color, a) {
    if (a <= 0.01 || r <= 0) return;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(sprite('glow', color), x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = prev; ctx.globalAlpha = 1;
  }
  function ringStroke(ctx, x, y, r, color, w, a, flat = 1) {
    if (a <= 0.01 || r <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * flat, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // a bright ring: wide colored glow, then a thin white-hot core
  function neonRing(ctx, x, y, r, color, w, a, flat = 1) {
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ringStroke(ctx, x, y, r, rgba(color, 0.35), w * 3, a, flat);
    ringStroke(ctx, x, y, r, color, w, a, flat);
    ringStroke(ctx, x, y, r, 'rgba(255,255,255,0.9)', Math.max(1, w * 0.35), a, flat);
    ctx.globalCompositeOperation = prev;
  }
  function neonPath(ctx, color, w, a, trace) {
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [c, lw] of [[rgba(color, 0.3), w * 3], [color, w], ['rgba(255,255,255,0.9)', Math.max(1, w * 0.35)]]) {
      ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); trace(); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = prev;
  }
  // a curved band from angle a1 to a2 (in the current transform), its radius easing from r0 to r1, w thick.
  // taper 'mid' swells in the middle (a blade, a ribbon), 'head' grows toward a2 (the smear behind something moving)
  function band(c, r0, r1, a1, a2, w, taper) {
    c.beginPath();
    for (let i = 0; i <= 12; i++) { const q = i / 12, a = a1 + (a2 - a1) * q, r = r0 + (r1 - r0) * q; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    for (let i = 12; i >= 0; i--) { const q = i / 12, a = a1 + (a2 - a1) * q, r = Math.max(0, r0 + (r1 - r0) * q - w * (taper === 'head' ? q : Math.sin(Math.PI * q))); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
  }
  // a little flame tongue standing on (x, y): h tall, w wide at the base, its tip swaying sideways by sway
  function tongue(c, x, y, h, w, sway, color) {
    c.fillStyle = color; c.beginPath(); c.moveTo(x - w, y);
    c.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h); c.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
    c.quadraticCurveTo(x, y + w * 0.4, x - w, y); c.fill();
  }

  // ---------------------------------------------------------------- building blocks
  const B = {
    // sparkle explosion (stars + glow dots flying out)
    burst(x, y, o = {}) {
      const n = o.n ?? 14, color = o.color || '#ffffff';
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(0.35, 1) * (o.speed ?? 220);
        spawn({ x, y, z: o.z ?? 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(-0.3, 1) * (o.up ?? 80), g: o.g ?? 0, drag: o.drag ?? 0.06,
          life: rand(0.6, 1) * (o.life ?? 0.7), size: rand(0.6, 1.2) * (o.size ?? 14), size1: 0, color: i % 3 === 0 && o.color2 ? o.color2 : color,
          kind: o.kind || (i % 2 ? 'star' : 'glow'), vr: rand(-6, 6) });
      }
      if (o.flash !== false) B.flash(x, y - (o.z ?? 10), o.flashR ?? (o.size ?? 14) * 3.2, color, o.flashDur ?? 0.22);
    },
    // short white-hot flash
    flash(x, y, r, color, dur = 0.2) {
      fx({ dur, layer: 'air', draw: (c, p, t, e) => { glowAt(c, x, y, r * (0.6 + 0.6 * p), color, e.a * (1 - p)); glowAt(c, x, y, r * 0.45 * (1 - p * 0.5), '#ffffff', e.a * (1 - p)); } });
    },
    // stretched sparks flying from a point (hits, metal on metal)
    sparks(x, y, o = {}) {
      const n = o.n ?? 10;
      for (let i = 0; i < n; i++) {
        const a = (o.angle ?? Math.random() * Math.PI * 2) + rand(-1, 1) * (o.spread ?? Math.PI);
        const sp = rand(0.4, 1) * (o.speed ?? 420);
        spawn({ x, y, z: o.z ?? 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, vz: rand(0, 1) * (o.up ?? 120), g: o.g ?? 500, drag: 0.04,
          life: rand(0.25, 0.5) * (o.life ?? 1), size: rand(0.7, 1.2) * (o.size ?? 9), color: o.color || '#fff2c0', stretch: 4 });
      }
    },
    // classic hit: flash + star + sparks + little ring
    hit(x, y, color, size = 1) {
      B.flash(x, y - 14, 34 * size, color, 0.18);
      spawn({ x, y, z: 14, life: 0.22, size: 46 * size, size1: 20 * size, color, kind: 'star', vr: 4 });
      B.sparks(x, y, { color, n: Math.round(7 * size), speed: 380 * size });
      B.shock(x, y, { r: 38 * size, color, dur: 0.3, w: 3 });
    },
    // expanding ring on the floor
    shock(x, y, o = {}) {
      const r0 = o.r0 ?? 0, r1 = o.r ?? 80, color = o.color || '#ffffff', w = o.w ?? 5;
      return fx({ dur: o.dur ?? 0.45, layer: o.layer || 'ground', delay: o.delay, draw: (c, p, t, e) => {
        const q = easeOut(p);
        neonRing(c, x, y, r0 + (r1 - r0) * q, color, w * (1 - p * 0.7), e.a * (1 - p), o.flat ?? 0.78);
      } });
    },
    // magic circle on the floor: rings, ticks, a rotating star/runes. style: star4 | star5 | hex | runes | clock | petals | gears
    sigil(x, y, o = {}) {
      const r = o.r ?? 70, color = o.color || '#ffffff', style = o.style || 'star4', spin = o.spin ?? 1;
      return fx({ dur: o.dur ?? 1.2, layer: o.layer || 'ground', follow: o.follow, draw: (c, p, t, e) => {
        const cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y;
        const k = env(p, 0.15, 0.3) * e.a, grow = easeOut(Math.min(1, p / 0.2));
        const R = r * (0.6 + 0.4 * grow), flat = o.flat ?? 0.78;   // flat 1 + layer 'air': a rune standing up in the air
        c.save(); c.translate(cx, cy); c.scale(1, flat);
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 0.18 * k; c.fillStyle = color; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
        c.restore();
        neonRing(c, cx, cy, R, color, 3, k, flat);
        neonRing(c, cx, cy, R * 0.82, color, 1.5, k * 0.8, flat);
        c.save(); c.translate(cx, cy); c.scale(1, flat); c.rotate(t * spin);
        const line = (pts, closed = true) => neonPath(c, color, 2, k, () => { pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); if (closed) c.closePath(); });
        const ticks = style === 'clock' ? 12 : 24;
        for (let i = 0; i < ticks; i++) {
          const a = i * Math.PI * 2 / ticks, r1 = R * 0.84, r2 = R * (i % 2 || style === 'clock' ? 0.9 : 0.96);
          neonPath(c, color, 1.2, k * 0.7, () => { c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); });
        }
        const star = (n, inner) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, rr = i % 2 ? R * inner : R * 0.78; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } line(pts); };
        switch (style) {
          case 'star4': star(4, 0.28); break;
          case 'star5': star(5, 0.36); break;
          case 'hex': {
            const tri = off => line([0, 1, 2].map(i => { const a = off + i * Math.PI * 2 / 3; return [Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78]; }));
            tri(-Math.PI / 2); tri(Math.PI / 2); break;
          }
          case 'runes':
            for (let i = 0; i < 8; i++) {
              const a = i * Math.PI / 4, rr = R * 0.6;
              c.save(); c.translate(Math.cos(a) * rr, Math.sin(a) * rr); c.rotate(a + Math.PI / 2);
              const s = R * 0.09;
              line([[-s, s], [0, -s], [s, s], [-s * 0.5, 0], [s * 0.5, 0]], false);
              c.restore();
            }
            line([[0, -R * 0.4], [R * 0.35, R * 0.2], [-R * 0.35, R * 0.2]]);
            break;
          case 'clock': {
            c.rotate(-t * spin);
            neonPath(c, color, 3, k, () => { c.moveTo(0, 0); c.lineTo(Math.cos(t * 6) * R * 0.6, Math.sin(t * 6) * R * 0.6); });
            neonPath(c, color, 4, k, () => { c.moveTo(0, 0); c.lineTo(Math.cos(t * 0.8) * R * 0.38, Math.sin(t * 0.8) * R * 0.38); });
            break;
          }
          case 'petals':
            for (let i = 0; i < 6; i++) {
              const a = i * Math.PI / 3;
              neonPath(c, color, 2, k, () => { c.ellipse(Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4, R * 0.36, R * 0.14, a, 0, Math.PI * 2); });
            }
            break;
          case 'gears':
            for (let i = 0; i < 16; i++) {
              const a = i * Math.PI / 8;
              line([[Math.cos(a - 0.08) * R * 0.5, Math.sin(a - 0.08) * R * 0.5], [Math.cos(a - 0.06) * R * 0.62, Math.sin(a - 0.06) * R * 0.62], [Math.cos(a + 0.06) * R * 0.62, Math.sin(a + 0.06) * R * 0.62], [Math.cos(a + 0.08) * R * 0.5, Math.sin(a + 0.08) * R * 0.5]], false);
            }
            neonRing(c, 0, 0, R * 0.5, color, 2, k);
            break;
        }
        c.restore();
      } });
    },
    // column of light rising from a ring, with motes floating up
    pillar(x, y, o = {}) {
      const r = o.r ?? 40, h = o.h ?? 200, color = o.color || '#ffffff', dur = o.dur ?? 1.2;
      fx({ dur, layer: 'air', add: true, follow: o.follow, tick: (p, dt, e) => {
        if (Math.random() < 0.6 * (1 - p)) { const cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y, a = Math.random() * Math.PI * 2;
          spawn({ x: cx + Math.cos(a) * r * 0.8, y: cy + Math.sin(a) * r * 0.5, z: 0, vz: rand(60, 160), life: rand(0.6, 1), size: rand(5, 10), size1: 0, color, kind: Math.random() < 0.3 ? 'star' : 'glow' }); }
      }, draw: (c, p, t, e) => {
        const cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y;
        const k = env(p, 0.12, 0.4) * e.a, w = r * (0.7 + 0.3 * Math.sin(t * 12) * 0.1);
        const g = c.createLinearGradient(0, cy - h, 0, cy);
        g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.7, rgba(color, 0.35 * k)); g.addColorStop(1, rgba(color, 0.7 * k));
        c.fillStyle = g; c.fillRect(cx - w, cy - h, w * 2, h);
        const g2 = c.createLinearGradient(0, cy - h * 0.9, 0, cy);
        g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(1, `rgba(255,255,255,${0.7 * k})`);
        c.fillStyle = g2; c.fillRect(cx - w * 0.25, cy - h * 0.9, w * 0.5, h * 0.9);
        neonRing(c, cx, cy, r, color, 3, k, 0.45);
        glowAt(c, cx, cy, r * 1.6, color, 0.5 * k);
      } });
    },
    // spiral portal / vortex
    swirl(x, y, o = {}) {
      const r = o.r ?? 60, color = o.color || '#ffffff', dur = o.dur ?? 1, arms = o.arms ?? 4, dir = o.dir ?? 1, inward = o.inward;
      fx({ dur, layer: o.layer || 'ground', add: true, follow: o.follow, draw: (c, p, t, e) => {
        const cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y;
        const k = env(p, 0.15, 0.35) * e.a, R = r * (inward ? 1 - p * 0.6 : 0.5 + 0.5 * easeOut(Math.min(1, p / 0.3)));
        glowAt(c, cx, cy, R * 0.9, color, 0.6 * k);
        for (let i = 0; i < arms; i++) {
          neonPath(c, color, 2.5, k * 0.9, () => {
            for (let s = 0; s <= 24; s++) { const q = s / 24, a = dir * (t * 7 + i * Math.PI * 2 / arms + q * 3.4), rr = R * (0.12 + q * 0.88);
              const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.6; s ? c.lineTo(px, py) : c.moveTo(px, py); }
          });
        }
      } });
    },
    // crescent slash with a glowing edge and sparks from the tip
    slash(x, y, angle, o = {}) {
      const r = o.r ?? 60, span = o.span ?? 1.8, color = o.color || '#ffffff', dur = o.dur ?? 0.3, w = o.w ?? 0.45, flip = o.flip ? -1 : 1;
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const sweep = easeOut(Math.min(1, p / 0.45));
        const a0 = angle - flip * span / 2, a1 = a0 + flip * span * sweep;
        const tail = Math.max(0, sweep - 0.55) / 0.45;
        const aT = a0 + flip * span * tail;
        const k = e.a * (1 - Math.max(0, (p - 0.45) / 0.55));
        const arcBand = (rr, ww) => { c.beginPath(); c.arc(x, y - 10, rr, flip > 0 ? aT : a1, flip > 0 ? a1 : aT, false); c.arc(x, y - 10, rr * (1 - ww), flip > 0 ? a1 : aT, flip > 0 ? aT : a1, true); c.closePath(); c.fill(); };
        c.save();
        // an ink band under the light, so the cut reads on a bright floor too, and a fading smear trailing it
        c.globalAlpha = 0.32 * k; c.fillStyle = '#140a14'; arcBand(r * 1.03, w * 1.15);
        c.globalCompositeOperation = 'lighter';
        if (tail < 1) { c.globalAlpha = 0.18 * k; c.fillStyle = color; c.beginPath(); c.arc(x, y - 10, r * 0.96, flip > 0 ? a0 : aT, flip > 0 ? aT : a0, false); c.arc(x, y - 10, r * (1 - w * 0.7), flip > 0 ? aT : a0, flip > 0 ? a0 : aT, true); c.closePath(); c.fill(); }
        for (const [col, rr, ww, al] of [[color, r, w, 0.55], ['#ffffff', r * 0.98, w * 0.35, 0.9]]) { c.globalAlpha = al * k; c.fillStyle = col; arcBand(rr, ww); }
        c.restore();
        // a glint riding the blade's tip while it sweeps
        if (sweep < 1) glowAt(c, x + Math.cos(a1) * r, y - 10 + Math.sin(a1) * r, 14 + r * 0.12, '#ffffff', 0.8 * k);
      } });
      fx({ dur: dur * 0.35, layer: 'air', draw: () => {}, done: () => B.sparks(x + Math.cos(angle) * r, y + Math.sin(angle) * r, { color, n: o.sparks ?? 6, angle, spread: 0.9, speed: 300 }) });
    },
    // projectile that flies from a to b, leaving a trail, then calls onHit. style: orb | comet | arrow | fire | leaf | helix | blade | meteor
    missile(sx, sy, tx, ty, o = {}) {
      const color = o.color || '#ffffff', speed = o.speed ?? 700, d = Math.hypot(tx - sx, ty - sy), dur = Math.max(0.1, d / speed);
      const arc = o.arc ?? 0, size = o.size ?? 1, style = o.style || 'orb';
      const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p, z: 18 + Math.sin(p * Math.PI) * arc });
      const ang = Math.atan2(ty - sy, tx - sx);
      fx({ dur, layer: 'air', tick: (p) => {
        const q = pos(p);
        // the trail: soft dots (and embers for fire) left behind, so the tail shows the direction of travel
        const tc = style === 'fire' || style === 'meteor' ? (Math.random() < 0.5 ? '#ff6a1a' : '#ffc040') : color;
        for (let i = 0; i < (style === 'meteor' ? 3 : 2); i++) spawn({ x: q.x + rand(-3, 3) * size, y: q.y + rand(-3, 3) * size, z: q.z, vz: style === 'fire' || style === 'meteor' ? 30 : 0, life: rand(0.18, 0.35) * (style === 'meteor' ? 2 : 1), size: rand(8, 14) * size * (style === 'meteor' ? 1.6 : 1), size1: 0, color: tc });
        if (style === 'leaf' && Math.random() < 0.4) spawn({ x: q.x, y: q.y, z: q.z, vx: rand(-40, 40), vy: rand(-40, 40), vz: rand(-20, 30), g: 60, life: 0.7, size: 9, color, kind: 'leaf', add: false, vr: rand(-8, 8) });
        // embers shed backwards off the flame, slowing and falling
        if (style === 'fire' && Math.random() < 0.6) { const ca = Math.cos(ang), sa = Math.sin(ang); spawn({ x: q.x, y: q.y, z: q.z, vx: -ca * rand(40, 130) + rand(-35, 35), vy: -sa * rand(40, 130) + rand(-35, 35), vz: rand(10, 70), drag: 0.06, g: 140, life: rand(0.3, 0.6), size: rand(3, 5) * size, size1: 0, color: Math.random() < 0.5 ? '#ffd070' : '#ff8a2a', stretch: 2 }); }
        if ((style === 'fire' || style === 'meteor') && Math.random() < 0.4) spawn({ x: q.x, y: q.y, z: q.z, vx: rand(-30, 30), vy: rand(-30, 30), vz: rand(20, 60), life: 0.6, size: rand(10, 18) * size, size1: 26, color: '#3a2a2a', kind: 'smoke', add: false, a: 0.35 });
      }, draw: (c, p, t, e) => {
        const q = pos(p), y = q.y - q.z;
        const back = pos(Math.max(0, p - 0.12));
        c.save(); c.globalCompositeOperation = 'lighter';
        // streak from slightly behind to the head
        const grd = c.createLinearGradient(back.x, back.y - back.z, q.x, y);
        grd.addColorStop(0, rgba(color, 0)); grd.addColorStop(1, rgba(color, 0.9 * e.a));
        c.strokeStyle = grd; c.lineCap = 'round'; c.lineWidth = 8 * size; c.beginPath(); c.moveTo(back.x, back.y - back.z); c.lineTo(q.x, y); c.stroke();
        c.restore();
        switch (style) {
          case 'arrow': {
            c.save(); c.translate(q.x, y); c.rotate(ang);
            c.strokeStyle = '#3a2a1a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-18, 0); c.lineTo(8, 0); c.stroke();
            c.fillStyle = '#eef1f5'; c.beginPath(); c.moveTo(13, 0); c.lineTo(5, -4); c.lineTo(5, 4); c.closePath(); c.fill();
            c.fillStyle = color; c.beginPath(); c.moveTo(-18, 0); c.lineTo(-23, -4); c.lineTo(-14, 0); c.lineTo(-23, 4); c.closePath(); c.fill();
            c.restore();
            glowAt(c, q.x, y, 16 * size, color, 0.5 * e.a);
            break;
          }
          case 'blade': {
            c.save(); c.translate(q.x, y); c.rotate(ang + t * 0);
            glowAt(c, 0, 0, 30 * size, color, 0.8 * e.a);
            c.fillStyle = '#fffbe8'; c.beginPath(); c.moveTo(22, 0); c.lineTo(-10, -5); c.lineTo(-16, 0); c.lineTo(-10, 5); c.closePath(); c.fill();
            c.restore();
            break;
          }
          case 'helix':
            for (let i = 0; i < 4; i++) {
              const pp = pos(Math.max(0, p - i * 0.035));
              c.save(); c.translate(pp.x, pp.y - pp.z); c.rotate(ang);
              neonPath(c, color, 2, e.a * (1 - i * 0.2), () => c.ellipse(0, 0, 4, 12 - i, 0, 0, Math.PI * 2));
              c.restore();
            }
            glowAt(c, q.x, y, 22 * size, color, 0.9 * e.a);
            glowAt(c, q.x, y, 8 * size, '#ffffff', e.a);
            break;
          case 'fire': case 'meteor': {
            const s = style === 'meteor' ? 1.8 * size : size;
            glowAt(c, q.x, y, 30 * s, '#ff7a1a', 0.9 * e.a);
            if (style === 'fire') {
              // a teardrop of flame, its tail flickering back along the flight
              const fl = 1 + Math.sin(t * 40) * 0.12, hx = Math.cos(ang), hy = Math.sin(ang);
              c.save(); c.translate(q.x, y); c.rotate(Math.atan2(hy, hx)); c.globalCompositeOperation = 'lighter';
              for (const [col, L, W, al] of [['#ff5a1a', 30, 11, 0.75], ['#ffb040', 22, 7.5, 0.85], ['#fff2c0', 13, 4.5, 1]]) {
                c.globalAlpha = al * e.a; c.fillStyle = col; c.beginPath();
                c.moveTo(W * s, 0); c.quadraticCurveTo(W * s * 0.9, W * s, -L * s * 0.45 * fl, W * 0.35 * s); c.lineTo(-L * s * fl, 0); c.lineTo(-L * s * 0.45 * fl, -W * 0.35 * s); c.quadraticCurveTo(W * s * 0.9, -W * s, W * s, 0); c.fill();
              }
              c.restore();
            }
            glowAt(c, q.x, y, 14 * s, '#ffe08a', e.a);
            if (style === 'meteor') { c.save(); c.translate(q.x, y); c.rotate(t * 6); c.fillStyle = '#4a2a1a'; c.beginPath(); for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7, rr = 9 * s * (i % 2 ? 0.8 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore(); glowAt(c, q.x, y, 10 * s, '#ffb040', 0.7 * e.a); }
            break;
          }
          case 'leaf':
            glowAt(c, q.x, y, 18 * size, color, 0.8 * e.a);
            c.save(); c.translate(q.x, y); c.rotate(t * 14); c.drawImage(sprite('leaf', color), -9, -9, 18, 18); c.restore();
            break;
          default:
            glowAt(c, q.x, y, 22 * size, color, 0.9 * e.a);
            glowAt(c, q.x, y, 9 * size, '#ffffff', e.a);
        }
      }, done: () => { if (o.onHit) o.onHit(tx, ty); } });
      return dur;
    },
    // straight beam (laser / holy ray), from a to b
    beam(sx, sy, tx, ty, o = {}) {
      const color = o.color || '#ffffff', w = o.w ?? 10, dur = o.dur ?? 0.35;
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const k = env(p, 0.08, 0.6) * e.a, ww = w * (1 - p * 0.6);
        neonPath(c, color, ww, k, () => { c.moveTo(sx, sy - 14); c.lineTo(tx, ty - 14); });
        glowAt(c, tx, ty - 14, ww * 4, color, k);
      } });
    },
    // jagged lightning between two points
    lightning(sx, sy, tx, ty, o = {}) {
      const color = o.color || '#c0e8ff', dur = o.dur ?? 0.25;
      const pts = [], n = 9;
      for (let i = 0; i <= n; i++) { const q = i / n, j = i && i < n ? rand(-1, 1) * (o.jag ?? 18) : 0; const nx = -(ty - sy), ny = tx - sx, L = Math.hypot(nx, ny) || 1; pts.push([sx + (tx - sx) * q + nx / L * j, sy + (ty - sy) * q + ny / L * j]); }
      fx({ dur, layer: 'air', draw: (c, p, t, e) => { const k = (1 - p) * e.a * (Math.random() < 0.8 ? 1 : 0.3); neonPath(c, color, 3, k, () => pts.forEach(([a, b], i) => (i ? c.lineTo(a, b - 16) : c.moveTo(a, b - 16)))); } });
    },
    // crystal / spike eruption (ice, runes, green growth)
    crystals(x, y, o = {}) {
      const n = o.n ?? 7, r = o.r ?? 40, color = o.color || '#9fe0ff', h = o.h ?? 46, dur = o.dur ?? 0.9;
      const spikes = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3), d = rand(0.2, 1) * r; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, h: h * rand(0.6, 1.2), w: rand(6, 11), lean: rand(-0.35, 0.35) }; })
        .sort((a, b) => a.y - b.y);
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const grow = easeOut(Math.min(1, p / 0.18)), k = e.a * Math.min(1, (1 - p) / 0.3);
        glowAt(c, x, y, r * 1.5, color, 0.5 * k);
        for (const s of spikes) {
          const hh = s.h * grow, tipx = s.x + s.lean * hh;
          c.globalAlpha = k;
          c.fillStyle = color; c.beginPath(); c.moveTo(s.x - s.w, s.y); c.lineTo(tipx, s.y - hh); c.lineTo(s.x + s.w, s.y); c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(s.x - s.w * 0.2, s.y); c.lineTo(tipx, s.y - hh); c.lineTo(s.x + s.w * 0.5, s.y); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(20,10,30,0.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s.x - s.w, s.y); c.lineTo(tipx, s.y - hh); c.lineTo(s.x + s.w, s.y); c.stroke();
        }
        c.globalAlpha = 1;
      }, done: () => { for (const s of spikes) for (let i = 0; i < 2; i++) spawn({ x: s.x, y: s.y, z: s.h * 0.5, vx: rand(-90, 90), vy: rand(-60, 60), vz: rand(40, 140), g: 400, life: 0.5, size: 9, color, kind: 'shard', add: false, vr: rand(-12, 12) }); } });
      B.shock(x, y, { r: r * 1.4, color, dur: 0.35, w: 3 });
    },
    // cartoon smoke puffs
    smoke(x, y, o = {}) {
      const n = o.n ?? 8;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(0.3, 1) * (o.speed ?? 70);
        spawn({ x: x + Math.cos(a) * (o.r ?? 10), y: y + Math.sin(a) * (o.r ?? 10) * 0.6, z: rand(0, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(10, 40), drag: 0.05,
          life: rand(0.6, 1) * (o.life ?? 0.9), size: rand(0.7, 1.1) * (o.size ?? 30), size1: (o.size ?? 30) * 1.8, color: o.color || '#f2eef8', kind: 'smoke', add: false, a: o.a ?? 0.85, fadeIn: 0.05, fadePow: 2 });
      }
    },
    // floating particles that rise (auras, heals, buffs)
    motes(x, y, o = {}) {
      const n = o.n ?? 8;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = rand(0, o.r ?? 26);
        spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.55, z: rand(0, 20), vz: rand(40, 110) * (o.rise ?? 1), vx: rand(-10, 10),
          life: rand(0.7, 1.2) * (o.life ?? 1), size: rand(0.6, 1.1) * (o.size ?? 9), size1: 0, color: o.color || '#ffffff', kind: o.kind || (Math.random() < 0.35 ? 'star' : 'glow'),
          add: o.kind === 'leaf' || o.kind === 'petal' ? false : undefined, vr: rand(-3, 3), flutter: o.kind === 'petal' || o.kind === 'leaf' ? 6 : 0 });
      }
    },
    // follow an entity for a while: ring under the feet + rising motes. style: ring | hex | flame | blood | runes | shadow
    aura(ent, o = {}) {
      const color = o.color || '#ffffff', r = o.r ?? 34, dur = o.dur ?? 2, style = o.style || 'ring';
      fx({ dur, layer: 'ground', tick: (p) => {
        if (Math.random() < (o.rate ?? 0.5)) {
          const a = Math.random() * Math.PI * 2;
          if (style === 'flame') spawn({ x: ent.x + Math.cos(a) * r * 0.7, y: ent.y + Math.sin(a) * r * 0.4, z: 4, vz: rand(70, 140), life: rand(0.4, 0.7), size: rand(10, 18), size1: 2, color: Math.random() < 0.5 ? color : '#ffd070' });
          else if (style === 'shadow') spawn({ x: ent.x + Math.cos(a) * r * 0.7, y: ent.y + Math.sin(a) * r * 0.4, z: 0, vz: rand(30, 80), life: 0.8, size: rand(16, 26), size1: 34, color: '#2a1838', kind: 'smoke', add: false, a: 0.45 });
          else spawn({ x: ent.x + Math.cos(a) * r * 0.8, y: ent.y + Math.sin(a) * r * 0.45, z: 2, vz: rand(40, 100), life: rand(0.6, 1), size: rand(5, 9), size1: 0, color, kind: Math.random() < 0.3 ? 'star' : 'glow' });
        }
      }, draw: (c, p, t, e) => {
        const k = env(p, 0.1, 0.25) * e.a;
        if (style === 'hex') {
          c.save(); c.translate(ent.x, ent.y + 2); c.scale(1, 0.55); c.rotate(t * 0.8);
          neonPath(c, color, 2.5, k, () => { for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } });
          c.restore();
        } else if (style === 'runes') {
          neonRing(c, ent.x, ent.y + 2, r, color, 2.5, k, 0.55);
          for (let i = 0; i < 3; i++) { const a = t * 2 + i * Math.PI * 2 / 3; glowAt(c, ent.x + Math.cos(a) * r, ent.y + 2 + Math.sin(a) * r * 0.55, 9, color, k); }
        } else neonRing(c, ent.x, ent.y + 2, r * (1 + Math.sin(t * 6) * 0.04), color, 2.5, k, 0.55);
        glowAt(c, ent.x, ent.y, r * 1.3, color, 0.25 * k);
      } });
    },
    // shield on an entity. shape: bubble | front | hex
    shield(ent, o = {}) {
      const color = o.color || '#9fd0ff', dur = o.dur ?? 1.4, shape = o.shape || 'bubble', r = o.r ?? 40;
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const k = env(p, 0.08, 0.3) * e.a, y = ent.y - 14 - (ent.lift || 0);
        if (shape === 'front') {
          const a = ent.angle;
          c.save(); c.globalCompositeOperation = 'lighter';
          c.globalAlpha = 0.35 * k; c.fillStyle = color;
          c.beginPath(); c.arc(ent.x, y, r, a - 0.9, a + 0.9); c.arc(ent.x, y, r - 10, a + 0.9, a - 0.9, true); c.closePath(); c.fill();
          c.restore();
          neonPath(c, color, 3, k, () => c.arc(ent.x, y, r, a - 0.9, a + 0.9));
          glowAt(c, ent.x + Math.cos(a) * r, y + Math.sin(a) * r, 26, color, 0.7 * k);
        } else {
          const rr = r * (1 + Math.sin(t * 5) * 0.02);
          c.save(); c.globalCompositeOperation = 'lighter';
          const g = c.createRadialGradient(ent.x - rr * 0.3, y - rr * 0.3, rr * 0.1, ent.x, y, rr);
          g.addColorStop(0, rgba('#ffffff', 0.12 * k)); g.addColorStop(0.75, rgba(color, 0.12 * k)); g.addColorStop(1, rgba(color, 0.45 * k));
          c.fillStyle = g; c.beginPath(); c.arc(ent.x, y, rr, 0, Math.PI * 2); c.fill();
          c.restore();
          neonRing(c, ent.x, y, rr, color, 2, k);
          if (shape === 'hex') {
            c.save(); c.beginPath(); c.arc(ent.x, y, rr, 0, Math.PI * 2); c.clip();
            const s = 11;
            for (let gx = -3; gx <= 3; gx++) for (let gy = -3; gy <= 3; gy++) {
              const hx = ent.x + gx * s * 1.5, hy = y + gy * s * 1.73 + (gx % 2 ? s * 0.86 : 0);
              const shimmer = 0.35 + 0.65 * Math.max(0, Math.sin(t * 4 + gx * 0.9 + gy * 0.6));
              c.globalAlpha = 0.5 * k * shimmer; hexagon(c, hx, hy, s, null, color, 1);
            }
            c.restore(); c.globalAlpha = 1;
          }
          // a moving glint
          const ga = t * 2.5;
          glowAt(c, ent.x + Math.cos(ga) * rr * 0.7, y + Math.sin(ga) * rr * 0.7, 12, '#ffffff', 0.6 * k);
        }
      } });
    },
    // healing crosses rising
    plus(x, y, o = {}) {
      for (let i = 0; i < (o.n ?? 5); i++) spawn({ x: x + rand(-18, 18), y: y + rand(-8, 8), z: rand(10, 30), vz: rand(40, 80), life: rand(0.8, 1.1), size: rand(10, 15), color: o.color || '#7dff8a', kind: 'plus', rot: 0, fadeIn: 0.15 });
    },
    // falling volley of arrows / rain onto a spot
    rain(x, y, o = {}) {
      const n = o.n ?? 8, r = o.r ?? 50, color = o.color || '#ffffff';
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7, delay = i * 0.04;
        fx({ dur: 0.22, delay, layer: 'air', draw: (c, p, t, e) => {
          const z = 220 * (1 - p);
          c.save(); c.translate(px, py - z); c.rotate(Math.PI / 2 + 0.25);
          c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-16, 0); c.lineTo(6, 0); c.stroke();
          c.fillStyle = '#eef1f5'; c.beginPath(); c.moveTo(11, 0); c.lineTo(4, -3); c.lineTo(4, 3); c.closePath(); c.fill();
          c.restore(); glowAt(c, px, py - z, 10, color, 0.5 * e.a);
        }, done: () => { B.sparks(px, py, { color, n: 3, speed: 160, z: 2 }); spawn({ x: px, y: py, life: 0.3, size: 20, size1: 4, color }); } });
      }
    },
    // little flipping streamers for a victory
    confetti(x, y, o = {}) {
      const cols = ['#ff5a5a', '#ffd84a', '#5ae0ff', '#7dff6a', '#c27aff', '#ff9ad8'];
      for (let i = 0; i < (o.n ?? 80); i++) spawn({ x: x + rand(-40, 40), y: y + rand(-20, 20), z: 30, vx: rand(-260, 260), vy: rand(-200, 120), vz: rand(200, 520), g: 380, drag: 0.03,
        life: rand(1.8, 2.8), size: rand(7, 11), color: cols[i % cols.length], kind: i % 3 ? 'petal' : 'shard', add: false, vr: rand(-12, 12), flutter: 9, fadeIn: 0.02, fadePow: 4 });
    },
    // fire flare erupting from the floor
    flare(x, y, o = {}) {
      const color = o.color || '#ff7a1a', n = o.n ?? 16;
      for (let i = 0; i < n; i++) spawn({ x: x + rand(-1, 1) * (o.r ?? 16), y: y + rand(-1, 1) * (o.r ?? 16) * 0.5, z: 0, vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(120, 320) * (o.h ?? 1),
        drag: 0.04, life: rand(0.35, 0.7), size: rand(14, 26) * (o.size ?? 1), size1: 3, color: i % 3 ? color : '#ffe08a' });
      B.smoke(x, y, { n: Math.round(n / 4), color: '#4a3a3a', size: 22, a: 0.45, speed: 40 });
    },
    // drops that splash and fall (blood, soup, venom)
    splash(x, y, o = {}) {
      for (let i = 0; i < (o.n ?? 10); i++) { const a = Math.random() * Math.PI * 2, sp = rand(80, 260) * (o.speed ?? 1);
        spawn({ x, y, z: o.z ?? 16, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 220), g: 700, life: rand(0.4, 0.7), size: rand(6, 11) * (o.size ?? 1), color: o.color || '#c01a2a', kind: 'drop', add: false, rot: a + Math.PI / 2 }); }
    },
    // streams of motes from one point to another (lifesteal, absorb)
    stream(sx, sy, ent, o = {}) {
      for (let i = 0; i < (o.n ?? 10); i++) {
        const delay = i * 0.03, ox = rand(-20, 20), oy = rand(-20, 20), color = o.color || '#ff3a4a';
        fx({ dur: 0.45, delay, layer: 'air', add: true, draw: (c, p, t, e) => {
          const q = easeOut(p), mx = (sx + ent.x) / 2 + ox * 2, my = (sy + ent.y) / 2 + oy * 2 - 40;
          const x = (1 - q) * (1 - q) * sx + 2 * (1 - q) * q * mx + q * q * ent.x, y = (1 - q) * (1 - q) * (sy - 20) + 2 * (1 - q) * q * my + q * q * (ent.y - 20);
          glowAt(c, x, y, 10, color, e.a * (1 - p * 0.5)); glowAt(c, x, y, 4, '#ffffff', e.a);
        } });
      }
    },
    // ground decal that lingers (scorch, crack)
    decal(x, y, o = {}) {
      fx({ dur: o.dur ?? 3, layer: 'ground', draw: (c, p, t, e) => {
        const k = Math.min(1, (1 - p) / 0.5) * e.a * (o.a ?? 0.5);
        if (o.style === 'crack') {
          c.strokeStyle = `rgba(20,12,8,${k})`; c.lineWidth = 2.5; c.lineCap = 'round';
          for (let i = 0; i < 7; i++) { const a = i * 0.9 + (o.seed || 0); let px = x, py = y; c.beginPath(); c.moveTo(px, py); for (let s = 0; s < 3; s++) { px += Math.cos(a + Math.sin(s * 3 + i) * 0.5) * (o.r ?? 40) / 3; py += Math.sin(a + Math.sin(s * 3 + i) * 0.5) * (o.r ?? 40) / 3 * 0.7; c.lineTo(px, py); } c.stroke(); }
        } else {
          const g = c.createRadialGradient(x, y, 0, x, y, o.r ?? 40);
          g.addColorStop(0, `rgba(20,10,5,${k})`); g.addColorStop(1, 'rgba(20,10,5,0)');
          c.fillStyle = g; c.beginPath(); c.ellipse(x, y, o.r ?? 40, (o.r ?? 40) * 0.7, 0, 0, Math.PI * 2); c.fill();
          if (o.embers) for (let i = 0; i < 5; i++) glowAt(c, x + Math.cos(i * 1.3) * (o.r ?? 40) * 0.5, y + Math.sin(i * 1.3) * (o.r ?? 40) * 0.35, 6, '#ff7a1a', k * (0.5 + 0.5 * Math.sin(t * 6 + i)));
        }
      } });
    },
    // particles spiralling in toward a point (charging up: anticipation)
    charge(x, y, o = {}) {
      const color = o.color || '#ffffff', r = o.r ?? 60;
      for (let i = 0; i < (o.n ?? 12); i++) {
        const a = Math.random() * Math.PI * 2;
        spawn({ x, y, z: o.z ?? 20, life: o.dur ?? 0.5, size: rand(5, 9), size1: 12, color, orbit: { x, y, a, r, w: rand(4, 7) * (Math.random() < 0.5 ? 1 : -1), dr: -r / (o.dur ?? 0.5), flat: 0.6, follow: o.follow } });
      }
    },
    // twisting column (tornado)
    tornado(x, y, o = {}) {
      const color = o.color || '#dff4ff', h = o.h ?? 180, r = o.r ?? 50, dur = o.dur ?? 1.2;
      fx({ dur, layer: 'air', add: true, draw: (c, p, t, e) => {
        const k = env(p, 0.15, 0.3) * e.a;
        for (let i = 0; i < 10; i++) {
          const q = i / 9, yy = y - q * h, rr = r * (0.35 + q * 0.9), a = t * 9 + i * 0.7;
          neonPath(c, color, 2.5 * (1 - q * 0.5), k * (0.4 + 0.6 * (1 - q)), () => c.ellipse(x + Math.sin(t * 3 + q * 3) * 8 * q, yy, rr, rr * 0.28, 0, a, a + Math.PI * 1.4));
        }
      } });
    },

    // ---- painted-style pieces (after the reference sheets in docs/art/vfx-reference): a small wind-up, a bold
    // shape with a hot core and dark edges, then a slow aftermath (dust, motes, mist) that outlives the effect.

    // a golden dome over a rune circle on the floor, on an entity (Divine Barrier)
    dome(ent, o = {}) {
      const color = o.color || '#ffd86a', r = o.r ?? 46, dur = o.dur ?? 2.4;
      const pos = () => ({ x: ent.x, y: ent.y + 4 });
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
        const k = env(p, 0.15, 0.3) * e.a, { x, y } = pos(), R = r * 1.25;
        ringStroke(c, x, y, R + 2, 'rgba(30,20,5,0.35)', 6, k, 0.5);
        glowAt(c, x, y, R * 1.3, color, 0.35 * k);
        neonRing(c, x, y, R, color, 2.5, k, 0.5); neonRing(c, x, y, R * 0.8, color, 1.2, k * 0.8, 0.5);
        c.save(); c.translate(x, y); c.scale(1, 0.5); c.rotate(t * 0.6);
        neonPath(c, color, 1.4, k * 0.8, () => { for (let i = 0; i <= 6; i++) { const a = i * Math.PI * 4 / 6; c.lineTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); } });
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.globalAlpha = k * 0.9; c.fillStyle = '#fff6d8'; c.fillRect(Math.cos(a) * R * 0.9 - 2, Math.sin(a) * R * 0.9 - 2, 4, 4); }
        c.restore(); c.globalAlpha = 1;
      } });
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const rise = easeOut(Math.min(1, p / 0.18)), k = env(p, 0.1, 0.3) * e.a, { x, y } = pos(), H = r * 1.15 * rise;
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(x, y - H, x, y);
        g.addColorStop(0, rgba('#ffffff', 0.22 * k)); g.addColorStop(0.5, rgba(color, 0.1 * k)); g.addColorStop(1, rgba(color, 0.32 * k));
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, H, 0, Math.PI, 0); c.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI, false); c.fill();
        c.restore();
        neonPath(c, color, 2.2, k, () => c.ellipse(x, y, r, H, 0, Math.PI, 0));
        for (const f of [0.35, 0.7]) neonPath(c, color, 1, k * 0.5, () => c.ellipse(x, y - H * f * 0.9, r * Math.sqrt(1 - f * f * 0.8), r * 0.5 * (1 - f) + 2, 0, Math.PI, 0));
        neonPath(c, color, 1, k * 0.45, () => c.ellipse(x, y, r * 0.45, H, 0, Math.PI, 0));
        const ga = t * 2.2; glowAt(c, x + Math.cos(ga) * r * 0.6, y - H * (0.5 + Math.sin(ga) * 0.3), 14, '#ffffff', 0.7 * k);
      }, tick: () => { if (Math.random() < 0.25) { const { x, y } = pos(), a = Math.random() * Math.PI; spawn({ x: x + Math.cos(a) * r * 0.9, y: y - Math.sin(a) * r * 0.5, z: 4, vz: rand(30, 70), life: 0.9, size: rand(6, 10), size1: 0, color, kind: 'star' }); } },
      done: () => { const { x, y } = pos(); for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2; spawn({ x: x + Math.cos(a) * r * 0.8, y: y + Math.sin(a) * r * 0.4 - 20, z: rand(10, 50), vx: Math.cos(a) * 40, vy: Math.sin(a) * 20, vz: rand(-10, 20), drag: 0.04, life: rand(0.7, 1.2), size: rand(6, 11), size1: 0, color: i % 3 ? color : '#ffffff', kind: 'star' }); } } });
    },

    // a column of holy light: shafts falling onto a spot, feathers drifting down, a golden ring that lingers
    lightfall(x, y, o = {}) {
      const color = o.color || '#ffe680', r = o.r ?? 34, h = o.h ?? 260, dur = o.dur ?? 1.2;
      const shafts = Array.from({ length: 7 }, () => ({ dx: rand(-1, 1) * r * 0.8, w: rand(3, 9), ph: rand(0, 6), len: rand(0.6, 1) }));
      B.charge(x, y, { color, r: r * 1.6, n: 8, dur: 0.25, z: 10 });
      fx({ dur, layer: 'air', add: true, draw: (c, p, t, e) => {
        const k = env(p, 0.1, 0.45) * e.a;
        glowAt(c, x, y - 20, r * 2.2, color, 0.55 * k);
        for (const s of shafts) {
          const top = y - h * s.len, a = k * (0.5 + 0.5 * Math.sin(t * 9 + s.ph));
          const g = c.createLinearGradient(0, top, 0, y);
          g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.7, rgba(color, 0.55 * a)); g.addColorStop(1, rgba('#ffffff', 0.9 * a));
          c.fillStyle = g; c.fillRect(x + s.dx - s.w / 2, top, s.w, y - top);
        }
      } });
      for (let i = 0; i < (o.feathers ?? 6); i++) spawn({ x: x + rand(-r, r), y: y + rand(-6, 6), z: rand(90, 180), vz: rand(-70, -40), vx: rand(-20, 20), life: rand(1.2, 1.7), size: rand(12, 16), color: '#fff8e6', kind: 'feather', add: false, vr: rand(-2, 2), flutter: 3, fadeIn: 0.1 });
      fx({ dur: dur + 1.2, layer: 'ground', draw: (c, p, t, e) => {
        const k = env(p, 0.1, 0.6) * e.a;
        neonRing(c, x, y, r * (1 + p * 0.3), color, 2, k * 0.8, 0.5);
        glowAt(c, x, y, r * 1.6, color, 0.3 * k);
      }, tick: () => { if (Math.random() < 0.3) spawn({ x: x + rand(-r, r), y: y + rand(-r, r) * 0.5, z: 0, vz: rand(20, 50), life: 0.9, size: rand(3, 6), size1: 0, color }); } });
    },

    // an ornate floor circle that grows vines and flowers and lingers (druid heals, Moonwell)
    grove(x, y, o = {}) {
      const color = o.color || '#7ee06a', color2 = o.color2 || '#fff0a8', r = o.r ?? 120, dur = o.dur ?? 3, follow = o.follow;
      const at = () => (follow ? { x: follow.x, y: follow.y } : { x, y });
      const blooms = Array.from({ length: o.flowers ?? 6 }, (_, i) => ({ a: i / (o.flowers ?? 6) * Math.PI * 2 + rand(-0.3, 0.3), d: rand(0.55, 0.85) }));
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
        const grow = easeOut(Math.min(1, p / 0.2)), k = env(p, 0.12, 0.3) * e.a, { x: cx, y: cy } = at(), R = r * grow;
        // the pool itself (a deep tint first, so light colours don't wash out on grass), an ink edge, then the rim
        if (o.tint) { c.globalAlpha = 0.28 * k; c.fillStyle = o.tint; c.beginPath(); c.ellipse(cx, cy, R, R * 0.55, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
        ringStroke(c, cx, cy, R + 2, 'rgba(10,16,30,0.4)', 7, k, 0.55);
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, rgba(color, 0.05 * k)); g.addColorStop(0.75, rgba(color, 0.14 * k)); g.addColorStop(1, rgba(color, 0.3 * k));
        c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, R, R * 0.55, 0, 0, Math.PI * 2); c.fill();
        c.restore();
        neonRing(c, cx, cy, R, color, 3, k, 0.55); neonRing(c, cx, cy, R * 0.9, color, 1.2, k * 0.7, 0.55);
        // vine scrollwork turning slowly: S-curls around the ring
        c.save(); c.translate(cx, cy); c.scale(1, 0.55);
        for (let i = 0; i < 8; i++) {
          const a0 = i * Math.PI / 4 + t * 0.25;
          neonPath(c, color, 1.6, k * 0.85, () => { for (let s = 0; s <= 14; s++) { const q = s / 14, a = a0 + q * 0.7, rr = R * (0.62 + 0.18 * Math.sin(q * Math.PI * 2)); s ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } });
          const a = a0 + 0.7, cr = R * 0.62;
          neonPath(c, color, 1.3, k * 0.8, () => { for (let s = 0; s <= 10; s++) { const q = s / 10, aa = a + q * 4, rr = 9 * (1 - q * 0.8); c.lineTo(Math.cos(a) * cr + Math.cos(aa) * rr, Math.sin(a) * cr + Math.sin(aa) * rr); } });
        }
        if (o.moon) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - t * 0.2, mx = Math.cos(a) * R * 0.35, my = Math.sin(a) * R * 0.35;
          neonPath(c, color2, 1.6, k, () => { c.arc(mx, my, 10, 0.6, Math.PI * 2 - 0.6); c.arc(mx + 5, my, 8, Math.PI * 2 - 0.9, 0.9, true); }); }
        c.restore();
        for (const b of blooms) { const bx = cx + Math.cos(b.a) * R * b.d, by = cy + Math.sin(b.a) * R * b.d * 0.55, bk = k * Math.min(1, Math.max(0, (p - 0.08) / 0.15));
          for (let j = 0; j < 5; j++) { const pa = j * Math.PI * 2 / 5 + t * 0.4; glowAt(c, bx + Math.cos(pa) * 4, by + Math.sin(pa) * 2.5, 6, color2, bk * 0.8); }
          glowAt(c, bx, by, 3, '#ffffff', bk); }
      }, tick: () => {
        const { x: cx, y: cy } = at();
        if (Math.random() < (o.rate ?? 0.35)) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r * 0.9;
          spawn({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.55, z: 0, vz: rand(25, 60), vx: rand(-12, 12), life: rand(1, 1.6), size: rand(8, 12), color: Math.random() < 0.5 ? color : color2, kind: o.moon ? (Math.random() < 0.5 ? 'star' : 'glow') : 'leaf', add: o.moon ? undefined : false, vr: rand(-3, 3), flutter: o.moon ? 0 : 5 }); }
      }, done: () => { const { x: cx, y: cy } = at(); B.smoke(cx, cy, { n: 6, r: r * 0.5, color: o.mist || '#cfe8d0', size: 34, a: 0.22, speed: 30, life: 1.4 }); } });
    },

    // ---- more painted pieces: wind-up glints, starbursts, meteors and craters, arrows that stay stuck in the floor,
    // puddles, smoke bombs, a blade vortex, dragon's breath, a fire spiral, song ribbons and a shadow dash.

    // wind-up glint: a white four-point twinkle that swells and fades, with a coloured halo
    glint(x, y, o = {}) {
      const s = o.size ?? 26, color = o.color || '#fff2c0', life = o.life ?? 0.3;
      spawn({ x, y, z: o.z ?? 20, life: life * 0.8, size: s * 0.7, size1: s * 0.3, color });
      spawn({ x, y, z: o.z ?? 20, life, size: s * 0.6, size1: s * 1.3, color, kind: 'star', vr: o.spin ?? 5, fadeIn: 0.3 });
    },

    // a soft dark band under a floor circle, so a light ring still reads on stone and sand. Spawn it just before
    // the circle (with the same r and dur) so it draws underneath
    ink(x, y, o = {}) {
      const r = o.r ?? 80, flat = o.flat ?? 0.78, col = o.color || '#1a1020';
      return fx({ dur: o.dur ?? 1.2, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
        const k = env(p, 0.15, 0.3) * e.a * (o.a ?? 0.35), cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y, R = r * (0.6 + 0.4 * easeOut(Math.min(1, p / 0.2)));
        c.globalAlpha = k * 0.45; c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, R, R * flat, 0, 0, Math.PI * 2); c.fill();
        ringStroke(c, cx, cy, R, col, 8, k, flat);
      } });
    },

    // jagged starburst: a spiky white-yellow core, a saturated body and a dark ink rim (Fire Blast, Backstab).
    // o.hole (0..1) cuts the middle out for a ring of spikes on the floor (War Cry); o.fill tints the hole
    spikeburst(x, y, o = {}) {
      const r = o.r ?? 60, n = o.n ?? 14, hole = o.hole ?? 0, dur = o.dur ?? 0.35, flat = o.flat ?? 0.8, z = o.z ?? 14;
      const color = o.color || '#ff8a2a', core = o.core || '#fff4c0', ink = o.ink || '#3a1408';
      const lo = hole ? hole + 0.1 : 0.42, tilt = rand(0, Math.PI);
      const m = Array.from({ length: n * 2 }, (_, i) => (i % 2 ? rand(lo - 0.06, lo + 0.08) : rand(0.8, 1.15)));
      fx({ dur, layer: o.layer || 'air', draw: (c, p, t, e) => {
        const grow = easeOut(Math.min(1, p / 0.3)), k = e.a * (1 - Math.max(0, (p - 0.35) / 0.65)), R = r * (0.3 + 0.7 * grow), cy = y - z;
        const shape = (s, hs) => {
          c.beginPath();
          for (let i = 0; i < n * 2; i++) { const a = tilt + i * Math.PI / n, rr = R * s * m[i]; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          c.closePath();
          if (hole) { c.moveTo(R * hole * hs, 0); c.arc(0, 0, R * hole * hs, 0, Math.PI * 2, true); }
          c.fill();
        };
        c.save(); c.translate(x, cy); c.scale(1, flat);
        if (hole && o.fill) { c.globalAlpha = k * 0.3; c.fillStyle = o.fill; c.beginPath(); c.arc(0, 0, R * hole, 0, Math.PI * 2); c.fill(); }
        c.globalAlpha = k * 0.85; c.fillStyle = ink; shape(1.1, 0.88);
        c.globalAlpha = k; c.fillStyle = color; shape(1, 1);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.85; c.fillStyle = core; shape(hole ? 0.9 : 0.55, 1.12);
        c.restore();
        if (!hole) glowAt(c, x, cy, R * 0.6, core, k * 0.8);
      } });
    },

    // rock chunks thrown up by an impact: they arc, bounce once, lie on the floor a moment and fade.
    // o.hot gives them an orange glow while they fly
    debris(x, y, o = {}) {
      const color = o.color || '#6a5a4a', dur = o.dur ?? 1.8;
      const rocks = Array.from({ length: o.n ?? 8 }, () => { const a = Math.random() * Math.PI * 2, sp = rand(50, 190) * (o.speed ?? 1);
        return { x, y, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(140, 320) * (o.up ?? 1), s: rand(3, 6.5) * (o.size ?? 1), r: rand(0, 6), vr: rand(-12, 12),
          pts: [rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1)], rest: false }; });
      const rock = (c, b, k) => {
        c.save(); c.translate(b.x, b.y - b.z); c.rotate(b.r); c.globalAlpha = k;
        c.fillStyle = color; c.strokeStyle = 'rgba(20,12,8,0.9)'; c.lineWidth = 1.3; c.beginPath();
        for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.lineTo(Math.cos(a) * b.s * b.pts[i], Math.sin(a) * b.s * b.pts[i]); }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-b.s * 0.4, -b.s * 0.5, b.s * 0.5, b.s * 0.3);
        c.restore();
      };
      const fade = (p, e) => e.a * Math.min(1, (1 - p) / 0.35);
      // flying rocks draw above everything; once they settle they draw on the floor, under the heroes
      fx({ dur, layer: 'air', tick: (p, dt) => {
        for (const b of rocks) {
          if (b.rest) continue;
          b.vz -= 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.r += b.vr * dt;
          if (b.z <= 0) { b.z = 0; if (b.vz < -140) { b.vz *= -0.3; b.vx *= 0.5; b.vy *= 0.5; b.vr *= 0.5; } else b.rest = true; }
        }
      }, draw: (c, p, t, e) => {
        const k = fade(p, e);
        for (const b of rocks) if (!b.rest) { rock(c, b, k); if (o.hot) glowAt(c, b.x, b.y - b.z, b.s * 2.5, '#ff7a1a', k * 0.7); }
        c.globalAlpha = 1;
      } });
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => { const k = fade(p, e); for (const b of rocks) if (b.rest) rock(c, b, k); c.globalAlpha = 1; } });
    },

    // a scorched, cracked crater that lingers: a dark pit, cracks glowing with heat that cools, little flames
    // dying down one by one, smoke drifting up. o.color is the heat colour (lava for a ground slam)
    crater(x, y, o = {}) {
      const r = o.r ?? 50, dur = o.dur ?? 3.5, glow = o.color || '#ff7a1a', nc = o.cracks ?? 8;
      const cracks = Array.from({ length: nc }, (_, i) => {
        const a = i / nc * Math.PI * 2 + rand(-0.25, 0.25); let px = Math.cos(a) * r * 0.3, py = Math.sin(a) * r * 0.18; const pts = [[px, py]];
        for (let s = 0; s < 3; s++) { const aa = a + rand(-0.5, 0.5), L = r * rand(0.2, 0.32); px += Math.cos(aa) * L; py += Math.sin(aa) * L * 0.6; pts.push([px, py]); }
        return pts;
      });
      const flames = Array.from({ length: o.flames ?? 5 }, () => { const a = Math.random() * Math.PI * 2, d = rand(0.3, 0.9) * r; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, ph: rand(0, 6), s: rand(0.7, 1.2), life: rand(0.5, 0.9) }; });
      const trace = c => { for (const pts of cracks) { c.moveTo(x + pts[0][0], y + pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(x + pts[i][0], y + pts[i][1]); } };
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, (1 - p) / 0.4), heat = Math.max(0, 1 - p * 1.5);
        // the pit: a dark scorch with a darker lip (source-over, so it reads on light floors)
        c.save(); c.translate(x, y); c.scale(1, 0.6);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, 'rgba(30,16,8,0.8)'); g.addColorStop(0.6, 'rgba(45,26,14,0.5)'); g.addColorStop(0.82, 'rgba(22,12,6,0.7)'); g.addColorStop(1, 'rgba(22,12,6,0)');
        c.globalAlpha = k * (o.a ?? 0.8); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
        c.restore();
        // cracks: ink first, then the heat glowing inside them while it lasts
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.globalAlpha = k * 0.85; c.strokeStyle = '#1a0e08'; c.lineWidth = 3.5; c.beginPath(); trace(c); c.stroke();
        if (heat > 0.02) {
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * heat;
          c.strokeStyle = glow; c.lineWidth = 2; c.beginPath(); trace(c); c.stroke();
          c.strokeStyle = o.core || '#ffe08a'; c.lineWidth = 0.8; c.beginPath(); trace(c); c.stroke();
          c.globalCompositeOperation = 'source-over';
          glowAt(c, x, y, r * 0.7, glow, 0.4 * k * heat);
        }
        for (const f of flames) {
          const fk = k * Math.max(0, 1 - p / f.life); if (fk < 0.03) continue;
          const h = 14 * f.s * (0.8 + 0.2 * Math.sin(t * 11 + f.ph)) * Math.min(1, fk * 2), sw = Math.sin(t * 7 + f.ph) * 3;
          c.globalAlpha = fk * 0.9; tongue(c, f.x, f.y, h, 5 * f.s, sw, '#5a1a08'); tongue(c, f.x, f.y - 1, h * 0.9, 4 * f.s, sw, glow); tongue(c, f.x, f.y - 1, h * 0.5, 2.2 * f.s, sw * 0.6, '#ffe08a');
        }
        c.globalAlpha = 1;
      }, tick: (p) => {
        if (Math.random() < 0.1 * (1 - p)) { const f = flames[Math.floor(Math.random() * flames.length)] || { x, y };
          spawn({ x: f.x, y: f.y, z: 10, vx: rand(-8, 8), vz: rand(18, 40), drag: 0.02, life: rand(1, 1.6), size: rand(12, 18), size1: 34, color: '#4a3c38', kind: 'smoke', add: false, a: 0.3, fadeIn: 0.2 });
          if (Math.random() < 0.5) spawn({ x: f.x, y: f.y, z: 8, vx: rand(-15, 15), vz: rand(40, 90), life: rand(0.6, 1), size: rand(3, 5), size1: 0, color: '#ffb040' }); }
      } });
    },

    // ---- painted floor scars (boss hits). Each is cut once, sits on the floor under the heroes with an ink edge, and
    // fades over its last second or two. They last a while on purpose: the floor remembers what just happened.
    // gouge: a long cut in the floor (a cleaver blow): a tapered black slit with a brown lip, short side cracks, and
    // embers cooling inside it
    gouge(x1, y1, x2, y2, o = {}) {
      const dur = o.dur ?? 9, w = o.w ?? 18, len = Math.max(1, Math.hypot(x2 - x1, y2 - y1)), ang = Math.atan2(y2 - y1, x2 - x1);
      const ca = Math.cos(ang), sa = Math.sin(ang), n = Math.max(6, Math.round(len / 22)), heatT = o.heatT ?? 3;
      const prof = Array.from({ length: n + 1 }, (_, i) => ({ q: i / n, w: Math.pow(Math.sin(Math.PI * i / n), 0.55) * w * rand(0.7, 1.15), j: rand(-0.2, 0.2) * w }));
      const at = (q, off) => [x1 + ca * len * q - sa * off, y1 + sa * len * q + ca * off];
      const cracks = Array.from({ length: Math.round(len / 55) + 2 }, () => {
        const q = rand(0.08, 0.92), side = Math.random() < 0.5 ? -1 : 1, base = prof[Math.round(q * n)].w * 0.5 * side;
        const pts = [[0, base]]; let u = 0, v = base;
        for (let s = 0; s < 3; s++) { u += rand(4, 14); v += side * rand(5, 12); pts.push([u, v]); }
        return { q, pts };
      });
      const embers = Array.from({ length: Math.round(len / 35) + 2 }, () => ({ q: rand(0.06, 0.94), ph: rand(0, 6), s: rand(0.7, 1.3) }));
      const trace = (c, s) => {
        c.beginPath();
        for (const pt of prof) { const [x, y] = at(pt.q, pt.j - pt.w * 0.5 * s); c.lineTo(x, y); }
        for (let i = prof.length - 1; i >= 0; i--) { const pt = prof[i], [x, y] = at(pt.q, pt.j + pt.w * 0.5 * s); c.lineTo(x, y); }
        c.closePath(); c.fill();
      };
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); if (typeof ARENA !== 'undefined') { ARENA.trace(c, 2); c.clip(); }
        const life = p * dur, k = e.a * Math.min(1, life / 0.08) * Math.min(1, (dur - life) / 1.6), heat = Math.max(0, 1 - life / heatT);
        c.globalAlpha = k * 0.5; c.fillStyle = o.lip || '#5a3418'; trace(c, 1.9);
        c.globalAlpha = k * 0.95; c.fillStyle = '#120804'; trace(c, 1);
        c.strokeStyle = '#1a0e08'; c.lineWidth = 2; c.lineCap = 'round'; c.globalAlpha = k * 0.85;
        for (const cr of cracks) { c.beginPath(); cr.pts.forEach(([u, v], i) => { const [x, y] = at(cr.q, 0); const px = x + ca * u - sa * v, py = y + sa * u + ca * v; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); }
        if (heat > 0.01) {
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * heat * 0.8; c.fillStyle = o.heat || '#ff5a14'; trace(c, 0.45);
          c.globalCompositeOperation = 'source-over';
          for (const em of embers) { const [x, y] = at(em.q, 0); glowAt(c, x, y, 9 * em.s, o.ember || '#ffb040', k * heat * (0.55 + 0.45 * Math.sin(t * 7 + em.ph))); }
        }
        c.globalAlpha = 1;
        c.restore();
      }, tick: (p) => {
        if (Math.random() < 0.12 * Math.max(0, 1 - p * dur / heatT)) { const [x, y] = at(rand(0.1, 0.9), 0); spawn({ x, y, z: 2, vx: rand(-10, 10), vz: rand(25, 50), life: rand(0.5, 0.9), size: rand(2, 4), size1: 0, color: o.ember || '#ffc060' }); }
      } });
    },
    // smear: something heavy rolled through sauce (a meatball's gravy trail): a lumpy brown band with an ink edge, a
    // wet highlight, chunks and red sauce flecks; o.splat makes a wider splash at the far end
    smear(x1, y1, x2, y2, o = {}) {
      const dur = o.dur ?? 9, w = o.w ?? 30, len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
      const ca = Math.cos(ang), sa = Math.sin(ang), color = o.color || '#7a4620', dark = o.dark || '#2e1808', hi = o.hi || '#c08a52';
      const blobs = [];
      let off = 0;
      for (let d = 0; d <= len; d += w * 0.3) { const q = len ? d / len : 0, taper = 0.55 + 0.45 * Math.min(1, q * 4); off = Math.max(-0.2, Math.min(0.2, off / w + rand(-0.05, 0.05))) * w; blobs.push({ x: x1 + ca * d - sa * off, y: y1 + sa * d + ca * off, r: w * 0.5 * rand(0.82, 1.02) * taper }); }
      if (o.splat) for (let i = 0; i < 7; i++) { const a = ang + Math.PI + rand(-1.4, 1.4), d = rand(0.2, 1.1) * w; blobs.push({ x: x2 + Math.cos(a) * d, y: y2 + Math.sin(a) * d * 0.7, r: w * rand(0.3, 0.6) }); }
      const chunks = Array.from({ length: Math.round(len / 50) + (o.splat ? 6 : 2) }, () => { const b = blobs[Math.floor(Math.random() * blobs.length)], a = rand(0, 6.28), d = b.r * rand(0.6, 1.6); return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, s: rand(3, 6.5), r: rand(0, 6), pts: [rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1)] }; });
      const flecks = Array.from({ length: Math.round(len / 40) + 4 }, () => { const b = blobs[Math.floor(Math.random() * blobs.length)], a = rand(0, 6.28), d = b.r * rand(0.9, 2); return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, r: rand(1.5, 3.5) }; });
      const shape = (c, pad, s = 1) => { c.beginPath(); for (const b of blobs) { const r = b.r * s + pad; if (r <= 0.5) continue; c.moveTo(b.x + r, b.y); c.ellipse(b.x, b.y, r, r * 0.7, 0, 0, Math.PI * 2); } c.fill(); };
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); if (typeof ARENA !== 'undefined') { ARENA.trace(c, 2); c.clip(); }
        const life = p * dur, k = e.a * Math.min(1, life / 0.1) * Math.min(1, (dur - life) / 1.8), dry = Math.min(1, life / dur * 1.4);
        c.globalAlpha = k * 0.8; c.fillStyle = dark; shape(c, 3);
        c.globalAlpha = k * 0.9; c.fillStyle = color; shape(c, 0);
        c.globalAlpha = k * 0.35 * (1 - dry * 0.7); c.fillStyle = hi; shape(c, -w * 0.18, 0.55);
        c.globalAlpha = k * 0.85;
        for (const f of flecks) circle(c, f.x, f.y, f.r, o.sauce || '#a8281a');
        for (const ch of chunks) {
          c.save(); c.translate(ch.x, ch.y); c.rotate(ch.r); c.fillStyle = '#5a3016'; c.strokeStyle = '#1a0c04'; c.lineWidth = 1.2; c.beginPath();
          for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.lineTo(Math.cos(a) * ch.s * ch.pts[i], Math.sin(a) * ch.s * ch.pts[i]); }
          c.closePath(); c.fill(); c.stroke(); c.restore();
        }
        c.globalAlpha = 1;
        c.restore();
      } });
    },
    // scorch: a charred streak (or, with no length, a blot) left by fire: a soft black band with a darker cracked core,
    // embers dying in it and thin smoke curling up for a while
    scorch(x1, y1, x2, y2, o = {}) {
      const dur = o.dur ?? 8, w = o.w ?? 50, len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
      const ca = Math.cos(ang), sa = Math.sin(ang), step = Math.max(12, w * 0.45);
      const blobs = [];
      for (let d = 0; d <= len; d += step) { const off = rand(-0.15, 0.15) * w; blobs.push({ x: x1 + ca * d - sa * off, y: y1 + sa * d + ca * off, r: w * 0.5 * rand(0.75, 1.15) }); }
      if (!len) for (let i = 0; i < 5; i++) { const a = rand(0, 6.28), d = rand(0.2, 0.5) * w; blobs.push({ x: x1 + Math.cos(a) * d, y: y1 + Math.sin(a) * d * 0.7, r: w * rand(0.3, 0.5) }); }
      const embers = Array.from({ length: Math.round(len / 45) + 3 }, () => { const b = blobs[Math.floor(Math.random() * blobs.length)]; return { x: b.x + rand(-0.4, 0.4) * b.r, y: b.y + rand(-0.3, 0.3) * b.r, ph: rand(0, 6), life: rand(0.35, 0.8) }; });
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); if (typeof ARENA !== 'undefined') { ARENA.trace(c, 2); c.clip(); }
        const life = p * dur, k = e.a * Math.min(1, life / 0.15) * Math.min(1, (dur - life) / 2) * (o.a ?? 1);
        for (const b of blobs) {
          const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, `rgba(16,9,5,${0.78 * k})`); g.addColorStop(0.65, `rgba(28,16,9,${0.5 * k})`); g.addColorStop(1, 'rgba(28,16,9,0)');
          c.fillStyle = g; c.beginPath(); c.ellipse(b.x, b.y, b.r, b.r * 0.72, 0, 0, Math.PI * 2); c.fill();
        }
        for (const em of embers) { const ek = Math.max(0, 1 - p / em.life); if (ek > 0.02) glowAt(c, em.x, em.y, 8, o.ember || '#ff7a1a', k * ek * (0.5 + 0.5 * Math.sin(t * 6 + em.ph))); }
        c.restore();
      }, tick: (p) => {
        if (o.smoke !== false && Math.random() < (o.smokeRate ?? 0.18) * (1 - p)) { const b = blobs[Math.floor(Math.random() * blobs.length)]; spawn({ x: b.x + rand(-0.3, 0.3) * b.r, y: b.y, z: 4, vx: rand(-6, 6), vz: rand(14, 30), drag: 0.02, life: rand(1.4, 2.2), size: rand(8, 13), size1: 30, color: '#5a4c48', kind: 'smoke', add: false, a: 0.28, fadeIn: 0.25 }); }
      } });
    },
    // flameWall: fire going up along a line (brandy, a gut of flame): rows of flame tongues, ink-edged, orange body,
    // yellow-white heart, catching along the line over o.travel seconds, roaring and dying down over o.dur
    flameWall(x1, y1, x2, y2, o = {}) {
      const dur = o.dur ?? 1.3, h = o.h ?? 70, spread = o.w ?? 40, len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
      const ca = Math.cos(ang), sa = Math.sin(ang), step = o.step ?? 46, rows = Math.max(1, Math.round(spread / 50) + 1), travel = o.travel ?? 0;
      const fl = [];
      for (let d = 0; d <= len; d += step) for (let r = 0; r < rows; r++) {
        const off = rows > 1 ? (r / (rows - 1) - 0.5) * spread : 0, jd = d + rand(-0.3, 0.3) * step;
        const lo = off + rand(-0.35, 0.35) * Math.min(spread / Math.max(1, rows - 1), 60);
        fl.push({ x: x1 + ca * jd - sa * lo, y: y1 + sa * jd + ca * lo, h: h * rand(0.5, 1.1), w: rand(18, 28) * (o.size ?? 1), at: (len ? jd / len : 0) * travel + rand(0, 0.12), life: dur * rand(0.55, 0.95) - travel * (len ? jd / len : 0) * 0.5, ph: rand(0, 6), lean: rand(-0.35, 0.35) });
      }
      fl.sort((a, b) => a.y - b.y);
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const life = p * dur;
        for (const f of fl) {
          const q = (life - f.at) / Math.max(0.2, f.life); if (q <= 0 || q >= 1) continue;
          const k = e.a * Math.min(1, q / 0.12) * Math.min(1, (1 - q) / 0.35), hh = f.h * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, q * 1.3))) * (0.85 + 0.15 * Math.sin(t * 14 + f.ph)), sw = (f.lean + Math.sin(t * 9 + f.ph) * 0.35) * hh * 0.5;
          glowAt(c, f.x, f.y - hh * 0.3, f.w * 3, '#ff7a1a', k * 0.35);
          c.globalAlpha = k * 0.9; tongue(c, f.x, f.y, hh * 1.08, f.w * 1.25, sw, o.ink || '#4a1206');
          c.globalAlpha = k; tongue(c, f.x, f.y - 1, hh, f.w, sw, o.color || '#ff6a14');
          tongue(c, f.x, f.y - 1, hh * 0.62, f.w * 0.62, sw * 0.7, o.mid || '#ffb428');
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.85; tongue(c, f.x, f.y - 1, hh * 0.3, f.w * 0.3, sw * 0.4, '#fff4c8');
          c.globalCompositeOperation = 'source-over';
        }
        c.globalAlpha = 1;
      }, tick: (p) => {
        if (Math.random() < 0.6 * (1 - p)) { const f = fl[Math.floor(Math.random() * fl.length)]; spawn({ x: f.x + rand(-8, 8), y: f.y, z: f.h * 0.5, vx: rand(-25, 25), vz: rand(90, 180), drag: 0.04, life: rand(0.5, 0.9), size: rand(3, 5), size1: 0, color: Math.random() < 0.5 ? '#ffd070' : '#ff8a2a' }); }
        if (Math.random() < 0.25 * p) { const f = fl[Math.floor(Math.random() * fl.length)]; spawn({ x: f.x, y: f.y, z: f.h * 0.6, vx: rand(-10, 10), vz: rand(30, 60), drag: 0.03, life: rand(1, 1.6), size: rand(14, 20), size1: 42, color: '#3a2a26', kind: 'smoke', add: false, a: 0.35, fadeIn: 0.15 }); }
      } });
    },

    // a meteor called down onto a rune circle: the circle draws itself, a burning rock falls in at a slant,
    // then a bright blast, flying rocks and a cracked crater that burns for a while. o.onHit(x, y) fires on impact
    meteor(x, y, o = {}) {
      const r = o.r ?? 60, color = o.color || '#ff6a1a', wind = o.wind ?? 0.45, fall = o.fall ?? 0.32, H = 380, dx = o.from ?? 170;
      B.ink(x, y, { r: r * 1.15, dur: wind + fall + 0.3, flat: 0.6, a: 0.3 });
      fx({ dur: wind + fall + 0.3, layer: 'ground', draw: (c, p, t, e) => {
        const k = env(p, 0.15, 0.2) * e.a, R = r * (0.75 + 0.25 * easeOut(Math.min(1, p / 0.3))), pulse = 0.7 + 0.3 * Math.sin(t * 16);
        // the rock's shadow, growing as it nears
        const fp = (t - wind) / fall;
        if (fp > 0 && fp < 1) { c.globalAlpha = 0.35 * fp * e.a; c.fillStyle = '#140a06'; c.beginPath(); c.ellipse(x, y, r * 0.45 * fp, r * 0.27 * fp, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
        neonRing(c, x, y, R, color, 2.5, k, 0.6); neonRing(c, x, y, R * 0.82, color, 1.2, k * 0.8, 0.6);
        c.save(); c.translate(x, y); c.scale(1, 0.6); c.rotate(t * 0.9);
        // glyph chevrons round the rim and four pointed nubs, like a summoning ring
        neonPath(c, color, 1.3, k * 0.9, () => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, ca = Math.cos(a), sa = Math.sin(a);
          c.moveTo(ca * R * 0.86 - sa * 3, sa * R * 0.86 + ca * 3); c.lineTo(ca * R * 0.94, sa * R * 0.94); c.lineTo(ca * R * 0.86 + sa * 3, sa * R * 0.86 - ca * 3); } });
        neonPath(c, color, 1.6, k, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
          c.moveTo(ca * R * 0.95 - sa * 6, sa * R * 0.95 + ca * 6); c.lineTo(ca * R * 1.12, sa * R * 1.12); c.lineTo(ca * R * 0.95 + sa * 6, sa * R * 0.95 - ca * 6); } });
        c.restore();
        glowAt(c, x, y, R * 1.1, color, 0.3 * k * pulse);
      } });
      const at = q => ({ x: x + dx * (1 - q), y, z: H * (1 - q) });
      fx({ dur: fall, delay: wind, layer: 'air', tick: (p) => {
        const q = at(p * p);
        spawn({ x: q.x + rand(-6, 6), y: q.y, z: q.z + rand(-6, 6), vx: rand(10, 40), vz: rand(20, 60), life: rand(0.25, 0.45), size: rand(14, 24), size1: 0, color: Math.random() < 0.5 ? '#ff6a1a' : '#ffc040' });
        if (Math.random() < 0.35) spawn({ x: q.x, y: q.y, z: q.z, vx: rand(10, 40), vz: rand(10, 40), life: 0.7, size: 16, size1: 34, color: '#3a2a2a', kind: 'smoke', add: false, a: 0.35 });
      }, draw: (c, p, t, e) => {
        const q = at(p * p), b = at(Math.max(0, p * p - 0.25)), hx = q.x, hy = q.y - q.z, bx = b.x, by = b.y - b.z, s = r / 60;
        // the flame tail: a fat streak, orange fading to gold at the head
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        const g = c.createLinearGradient(bx, by, hx, hy); g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.6, rgba(color, 0.7 * e.a)); g.addColorStop(1, rgba('#ffe08a', 0.95 * e.a));
        c.strokeStyle = g; c.lineWidth = 22 * s; c.beginPath(); c.moveTo(bx, by); c.lineTo(hx, hy); c.stroke();
        c.lineWidth = 8 * s; c.strokeStyle = rgba('#ffffff', 0.6 * e.a); c.beginPath(); c.moveTo((bx + hx * 2) / 3, (by + hy * 2) / 3); c.lineTo(hx, hy); c.stroke();
        c.restore();
        glowAt(c, hx, hy, 34 * s, '#ff7a1a', 0.9 * e.a);
        // the rock: dark and ink-edged, with glowing cracks
        c.save(); c.translate(hx, hy); c.rotate(t * 5); c.globalAlpha = e.a;
        c.fillStyle = '#3a2418'; c.strokeStyle = '#140a06'; c.lineWidth = 2; c.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = 13 * s * (i % 2 ? 0.82 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = '#ffb040'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-7 * s, -2 * s); c.lineTo(0, s); c.lineTo(5 * s, -5 * s); c.moveTo(0, s); c.lineTo(2 * s, 8 * s); c.stroke();
        c.restore(); c.globalAlpha = 1;
        glowAt(c, hx, hy, 10 * s, '#ffe08a', 0.6 * e.a);
      }, done: () => {
        B.flash(x, y - 20, r * 1.8, '#ffb040', 0.3);
        B.crater(x, y, { r: r * 0.9, dur: o.dur ?? 3.5 });
        B.spikeburst(x, y, { r: r * 1.15, n: 16, color: '#ff6a1a', dur: 0.42 });
        B.shock(x, y, { r: r * 2, color: '#ffa040', dur: 0.5, w: 7 });
        B.flare(x, y, { n: 14, r: r * 0.35, size: 1.2, h: 1.2 });
        B.debris(x, y, { n: 9, hot: true, color: '#4a3226' });
        B.smoke(x, y, { n: 5, r: r * 0.5, color: '#4a3a38', size: 32, a: 0.5, speed: 50, life: 1.6 });
        if (o.onHit) o.onHit(x, y);
      } });
    },

    // a volley of arrows: a target ring on the floor, arrows dropping in at a slant, then they stay stuck in the
    // ground for a while (a puff of dust where each one bites) before fading. One effect draws them all, so it stays cheap
    volley(x, y, o = {}) {
      const n = o.n ?? 10, r = o.r ?? 55, color = o.color || '#bfff9a', wind = o.wind ?? 0.25, stay = o.stay ?? 2, gap = o.gap ?? 0.035, fall = 0.2;
      const arrows = Array.from({ length: n }, (_, i) => { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
        return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, t: wind + i * gap + rand(0, 0.03), lean: rand(-0.3, 0.12), len: rand(13, 17), hit: false }; })
        .sort((a, b) => a.y - b.y);
      const dur = wind + n * gap + 0.03 + fall + stay;
      // the target ring: an ink band, a rim with four ticks, a soft glow
      if (o.ring !== false) fx({ dur: wind + fall + 0.4, layer: 'ground', draw: (c, p, t, e) => {
        const k = env(p, 0.2, 0.4) * e.a, R = r * (0.7 + 0.3 * easeOut(Math.min(1, p / 0.4)));
        ringStroke(c, x, y, R + 2, 'rgba(16,24,8,0.45)', 7, k, 0.6);
        neonRing(c, x, y, R, color, 2.5, k, 0.6); neonRing(c, x, y, R * 0.55, color, 1.2, k * 0.7, 0.6);
        neonPath(c, color, 1.5, k, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.moveTo(x + Math.cos(a) * R * 0.85, y + Math.sin(a) * R * 0.51); c.lineTo(x + Math.cos(a) * R * 1.15, y + Math.sin(a) * R * 0.69); } });
        glowAt(c, x, y, R, color, 0.25 * k);
      } });
      // one arrow along +x with its tip at 0; stuck arrows have the head buried, so only the shaft and fletching show
      const arrow = (c, k, stuck, len) => {
        c.globalAlpha = k;
        c.strokeStyle = '#1a120a'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-len, 0); c.lineTo(stuck ? 0 : -3, 0); c.stroke();
        c.strokeStyle = '#8a6a3a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-len, 0); c.lineTo(stuck ? 0 : -3, 0); c.stroke();
        c.strokeStyle = '#1a120a'; c.lineWidth = 1;
        if (!stuck) { c.fillStyle = '#eef1f5'; c.beginPath(); c.moveTo(4, 0); c.lineTo(-4, -3.5); c.lineTo(-4, 3.5); c.closePath(); c.fill(); c.stroke(); }
        c.fillStyle = color; c.beginPath(); c.moveTo(-len + 6, 0); c.lineTo(-len - 1, -4); c.lineTo(-len + 1, 0); c.lineTo(-len - 1, 4); c.closePath(); c.fill(); c.stroke();
      };
      fx({ dur, layer: 'air', tick: (p) => {
        const t = p * dur;
        for (const a of arrows) if (!a.hit && t >= a.t + fall) {
          a.hit = true;
          spawn({ x: a.x, y: a.y, z: 2, vx: rand(-25, 25), vy: rand(-8, 8), vz: rand(10, 30), drag: 0.05, life: rand(0.5, 0.8), size: rand(9, 13), size1: 22, color: '#b8a888', kind: 'smoke', add: false, a: 0.55 });
          if (Math.random() < 0.3) B.sparks(a.x, a.y, { color: '#fff2c0', n: 2, speed: 150, z: 2, up: 60 });
        }
      }, draw: (c, p, t, e) => {
        const fade = e.a * Math.min(1, (dur - t) / 0.5);
        c.lineCap = 'round';
        for (const a of arrows) {
          const at = t - a.t, ang = Math.PI / 2 + a.lean;
          if (at < 0) continue;
          if (at < fall) {   // dropping in at a slant, a white speed streak behind it
            const d = 240 * (1 - at / fall);
            c.save(); c.translate(a.x - Math.cos(ang) * d, a.y - Math.sin(ang) * d); c.rotate(ang);
            c.globalAlpha = e.a * 0.5; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-60, 0); c.lineTo(-24, 0); c.stroke();
            arrow(c, e.a, false, 22);
            c.restore();
          } else {   // stuck in the floor, a little dirt mound at its foot
            c.globalAlpha = fade * 0.5; c.fillStyle = '#3a2c1c'; c.beginPath(); c.ellipse(a.x, a.y, 5, 2, 0, 0, Math.PI * 2); c.fill();
            c.save(); c.translate(a.x, a.y); c.rotate(ang); arrow(c, fade, true, a.len); c.restore();
          }
        }
        c.globalAlpha = 1;
      } });
    },

    // a bubbling pool on the floor (poison, acid, blood): it spreads, bubbles swell and pop, then it dries and fades.
    // o.bubbles false for a plain splatter, o.fumes false for no rising vapour
    puddle(x, y, o = {}) {
      const r = o.r ?? 34, color = o.color || '#7adf3a', dark = o.dark || '#1e3a0a', dur = o.dur ?? 2.5;
      const blobs = Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2 + rand(-0.4, 0.4), d = rand(0.3, 0.6) * r; return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.55, r: rand(0.3, 0.5) * r }; });
      blobs.push({ x: 0, y: 0, r: r * 0.6 });
      const bubbles = o.bubbles === false ? [] : Array.from({ length: 4 }, () => ({ x: rand(-0.5, 0.5) * r, y: rand(-0.2, 0.2) * r, ph: rand(0, 1), sp: rand(0.9, 1.5) }));
      fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
        const s = 0.35 + 0.65 * easeOut(Math.min(1, p / 0.12)), k = e.a * Math.min(1, (1 - p) / 0.35);
        const shape = pad => { c.beginPath(); for (const b of blobs) { const bx = x + b.x * s, by = y + b.y * s, br = b.r * s + pad; c.moveTo(bx + br, by); c.ellipse(bx, by, br, br * 0.55, 0, 0, Math.PI * 2); } c.fill(); };
        c.globalAlpha = k * 0.8; c.fillStyle = dark; shape(2.5);
        c.globalAlpha = k * 0.85; c.fillStyle = color; shape(0);
        c.globalAlpha = k * 0.4; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x - r * 0.22 * s, y - r * 0.1 * s, r * 0.2 * s, r * 0.05 * s, -0.15, 0, Math.PI * 2); c.fill();
        for (const b of bubbles) {
          const q = (t * b.sp + b.ph) % 1; if (q > 0.85 || p > 0.75) continue;
          const br = (1.5 + q * 4) * s, bx = x + b.x * s, by = y + b.y * s - br * 0.5;
          c.globalAlpha = k; c.fillStyle = color; c.strokeStyle = dark; c.lineWidth = 1; c.beginPath(); c.arc(bx, by, br, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(bx - br * 0.35, by - br * 0.35, br * 0.3, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
      }, tick: (p) => {
        if (o.fumes !== false && Math.random() < 0.08 * (1 - p)) spawn({ x: x + rand(-0.6, 0.6) * r, y: y + rand(-0.25, 0.25) * r, z: 2, vz: rand(20, 40), life: rand(0.8, 1.2), size: rand(10, 14), size1: 22, color, kind: 'soft', a: 0.5 });
      } });
    },

    // smoke bomb: a little ball tossed, a pop, then a big cartoon cloud of puffs (ink-edged, lit from above) that
    // billows, hangs around thinning out, and breaks into drifting wisps
    smokebomb(x, y, o = {}) {
      const r = o.r ?? 90, color = o.color || '#8a7a9a', dur = o.dur ?? 2.6, toss = o.toss ?? 0.28, sx = o.sx ?? x - 20, sy = o.sy ?? y - 4;
      const puffs = Array.from({ length: o.n ?? 12 }, () => { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r * 0.7;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.5, z: rand(4, r * 0.4) * (1 - d / r), r: rand(0.26, 0.4) * r, ph: rand(0, 6) }; }).sort((a, b) => a.y - b.y);
      if (toss > 0) fx({ dur: toss, layer: 'air', draw: (c, p, t, e) => {
        const bx = sx + (x - sx) * p, by = sy + (y - sy) * p - 18 - Math.sin(p * Math.PI) * 40;
        c.globalAlpha = e.a; c.fillStyle = '#e8dce8'; c.strokeStyle = '#2a2034'; c.lineWidth = 1.5; c.beginPath(); c.arc(bx, by, 5, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#c0304a'; c.lineWidth = 1; c.beginPath(); c.arc(bx, by, 3, -1, 1); c.stroke(); c.globalAlpha = 1;
      } });
      fx({ dur: 0.05, delay: toss, layer: 'air', draw: () => {}, done: () => { B.flash(x, y - 20, r * 0.6, '#e8dcf8', 0.2); B.sparks(x, y, { color: '#e8dcf8', n: 5, speed: 300, z: 20 }); B.shock(x, y, { r: r * 1.4, color: o.ring || '#a08ac0', dur: 0.5 }); } });
      fx({ dur, delay: toss, layer: 'air', draw: (c, p, t, e) => {
        const pop = easeOut(Math.min(1, p / 0.12)), thin = p < 0.25 ? 1 : 1 - (p - 0.25) / 0.75 * 0.7, k = e.a * Math.min(1, (1 - p) / 0.3) * thin * (o.a ?? 1), sp = (0.4 + 0.6 * pop) * (1 + p * 0.3);
        const pr = b => b.r * (0.35 + 0.65 * pop) * (1 + p * 0.25), px = b => x + b.x * sp, py = b => y + b.y * sp - b.z - 16 - p * 14 + Math.sin(t * 2 + b.ph) * 2;
        // ink silhouette, then the body over it (so the ink only shows round the outside), then the light on top
        const blobs = (sc, pad, dx, dy) => { c.beginPath(); for (const b of puffs) { const R = pr(b) * sc + pad, bx = px(b) + R * dx, by = py(b) + R * dy; c.moveTo(bx + R, by); c.arc(bx, by, R, 0, Math.PI * 2); } c.fill(); };
        c.globalAlpha = k * 0.75; c.fillStyle = '#2a2034'; blobs(1, 3, 0, 0);
        c.globalAlpha = k * 0.92; c.fillStyle = color; blobs(1, 0, 0, 0);
        c.globalAlpha = k * 0.3; c.fillStyle = '#ffffff'; blobs(0.55, 0, -0.5, -0.6);
        c.globalAlpha = 1;
      }, done: () => { for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; spawn({ x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.3, z: rand(10, 40), vx: Math.cos(a) * 30 + rand(-10, 10), vz: rand(5, 20), drag: 0.02, life: rand(1, 1.5), size: r * 0.4, size1: r * 0.7, color, kind: 'smoke', add: false, a: 0.35, fadeIn: 0.02 }); } } });
    },

    // spinning blade vortex round a point or an entity (Blade Furry): steel crescents over a coloured smear and dark
    // ink, whirling fast; afterwards crossed scratch marks glint on the floor and fade
    vortex(x, y, o = {}) {
      const r = o.r ?? 70, color = o.color || '#9a4dff', steel = o.steel || '#eef0ff', dur = o.dur ?? 0.9, n = o.n ?? 6, follow = o.follow;
      const at = () => (follow ? { x: follow.x, y: follow.y } : { x, y });
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const { x: cx, y: cy } = at(), k = env(p, 0.12, 0.35) * e.a, R = r * (0.45 + 0.55 * easeOut(Math.min(1, p / 0.25))), spin = t * 13;
        glowAt(c, cx, cy - 12, R * 0.6, color, 0.35 * k);
        c.save(); c.translate(cx, cy - 12); c.scale(1, 0.6);
        for (let i = 0; i < n; i++) {
          const a = spin + i * Math.PI * 2 / n, rr = R * (0.55 + 0.22 * (i % 3));
          c.globalAlpha = k * 0.6; c.fillStyle = '#1a0a26'; band(c, rr + 4, rr * 0.8, a - 1.9, a + 0.06, 18, 'head');
          c.globalAlpha = k * 0.8; c.fillStyle = color; band(c, rr, rr * 0.8, a - 1.7, a, 14, 'head');
          c.globalAlpha = k; c.fillStyle = steel; band(c, rr + 1, rr * 0.96, a - 0.6, a + 0.1, 7, 'mid');
        }
        c.restore(); c.globalAlpha = 1;
      }, tick: () => {
        if (Math.random() < 0.3) { const { x: cx, y: cy } = at(), a = Math.random() * Math.PI * 2; B.sparks(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.48, { color: '#ffd0a0', n: 1, speed: 200, angle: a + Math.PI / 2, spread: 0.4 }); }
      }, done: () => {
        const { x: cx, y: cy } = at();
        const marks = Array.from({ length: o.marks ?? 4 }, () => { const a = Math.random() * Math.PI * 2, d = rand(0.4, 0.9) * r; return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.6, a: rand(0, Math.PI), s: rand(9, 14) }; });
        fx({ dur: 1.4, layer: 'ground', draw: (c, p, t, e) => {
          const k = e.a * Math.min(1, (1 - p) / 0.5);
          c.lineCap = 'round';
          for (const m of marks) for (const da of [0, 1.1]) {
            const ca = Math.cos(m.a + da) * m.s, sa = Math.sin(m.a + da) * m.s * 0.6;
            c.globalAlpha = k * 0.7; c.strokeStyle = '#1a0a20'; c.lineWidth = 3; c.beginPath(); c.moveTo(m.x - ca, m.y - sa); c.lineTo(m.x + ca, m.y + sa); c.stroke();
            c.globalAlpha = k * 0.9; c.strokeStyle = color; c.lineWidth = 1.2; c.beginPath(); c.moveTo(m.x - ca, m.y - sa); c.lineTo(m.x + ca, m.y + sa); c.stroke();
          }
          c.globalAlpha = 1;
          for (const m of marks) glowAt(c, m.x, m.y, 8, '#ffd0a0', k * (0.5 + 0.5 * Math.sin(t * 10 + m.a * 5)));
        } });
        for (const m of marks) B.sparks(m.x, m.y, { color: '#ffd0a0', n: 2, speed: 160, z: 4, up: 60 });
      } });
    },

    // dragon's breath: a spark at the mouth, then a roaring cone of fire (white-hot near the caster, an orange body,
    // dark red licks round the edge), then embers settling and a light scorch along the floor
    breath(x, y, ang, o = {}) {
      const len = o.len ?? 220, half = (o.span ?? 0.7) / 2, dur = o.dur ?? 0.8, wind = o.wind ?? 0.15, mx = x + Math.cos(ang) * 18, my = y + Math.sin(ang) * 18, W = Math.tan(half);
      const along = (q, s) => ({ x: mx + Math.cos(ang) * q - Math.sin(ang) * s, y: my + Math.sin(ang) * q + Math.cos(ang) * s });
      B.glint(mx, my, { color: '#ffb040', size: 22, z: 16 });
      const lobes = Array.from({ length: 10 }, (_, i) => ({ q: 0.3 + i * 0.075, s: rand(-0.8, 0.8), ph: rand(0, 6), r: rand(0.55, 0.9) }));
      fx({ dur, delay: wind, layer: 'air', draw: (c, p, t, e) => {
        const L = len * easeOut(Math.min(1, p / 0.25)), k = e.a * Math.min(1, (1 - p) / 0.4);
        c.save(); c.translate(mx, my - 16); c.rotate(ang);
        const shape = pad => {
          c.beginPath(); c.moveTo(-pad, 0); c.lineTo(L * 0.8, -L * 0.8 * W - pad); c.lineTo(L * 0.8, L * 0.8 * W + pad); c.closePath();
          for (const b of lobes) { const bx = L * b.q, by = b.s * bx * W * 0.8, br = bx * W * b.r * (0.85 + 0.15 * Math.sin(t * 14 + b.ph)) + pad; c.moveTo(bx + br, by); c.arc(bx, by, br, 0, Math.PI * 2); }
          c.fill();
        };
        c.globalAlpha = k * 0.7; c.fillStyle = '#4a0e04'; shape(3);
        const g = c.createLinearGradient(0, 0, Math.max(1, L), 0);
        g.addColorStop(0, '#fff6c8'); g.addColorStop(0.25, '#ffc040'); g.addColorStop(0.6, '#ff7a1a'); g.addColorStop(1, '#c8301a');
        c.globalAlpha = k * 0.95; c.fillStyle = g; shape(0);
        // a white-hot tongue down the middle
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.7; c.fillStyle = '#ffe9a0';
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.35, -L * W * 0.25, L * 0.6, 0); c.quadraticCurveTo(L * 0.35, L * W * 0.25, 0, 0); c.fill();
        c.restore();
        glowAt(c, mx, my - 16, 30, '#ffb040', k);
      }, tick: () => {
        if (Math.random() < 0.5) { const q = rand(0.2, 1) * len, pt = along(q, rand(-1, 1) * W * q); spawn({ x: pt.x, y: pt.y, z: 16, vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 60, vz: rand(20, 70), life: rand(0.4, 0.7), size: rand(8, 14), size1: 0, color: Math.random() < 0.5 ? '#ff7a1a' : '#ffc040' }); }
      }, done: () => {
        for (const f of [0.45, 0.8]) { const pt = along(len * f, 0); B.decal(pt.x, pt.y, { r: len * 0.18 * (0.6 + f), dur: 2.2, a: 0.35, embers: true }); }
        for (let i = 0; i < 14; i++) { const q = rand(0.2, 1) * len, pt = along(q, rand(-1, 1) * W * q);
          spawn({ x: pt.x, y: pt.y, z: rand(10, 40), vx: rand(-10, 10), vz: rand(-15, 15), drag: 0.03, life: rand(1, 1.8), size: rand(3, 5), size1: 0, color: Math.random() < 0.5 ? '#ff8a2a' : '#ffd070', fadeIn: 0.02 }); }
        const mid = along(len * 0.6, 0); B.smoke(mid.x, mid.y, { n: 4, r: len * 0.2, color: '#4a3a38', size: 30, a: 0.35, speed: 30, life: 1.5 });
      } });
    },

    // a spiral of fire wrapping an entity (Blazing Barrier): four little whorls spin up around it, merge into a big
    // turning flame spiral, then it flies apart into embers
    blaze(ent, o = {}) {
      const r = o.r ?? 50, dur = o.dur ?? 1.6, color = o.color || '#ff7a1a', core = o.core || '#ffe08a', ink = o.ink || '#4a1406';
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const k = env(p, 0.08, 0.3) * e.a, cx = ent.x, cy = ent.y - 14;
        const arm = (r0, r1, a0, span, w) => {
          c.globalAlpha = k * 0.6; c.fillStyle = ink; band(c, r0 + 2, r1 + 2, a0 - 0.05, a0 + span + 0.05, w + 4, 'mid');
          c.globalAlpha = k * 0.95; c.fillStyle = color; band(c, r0, r1, a0, a0 + span, w, 'mid');
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.85; c.fillStyle = core; band(c, r0 - w * 0.3, r1 - w * 0.3, a0 + span * 0.15, a0 + span * 0.85, w * 0.35, 'mid');
          c.globalCompositeOperation = 'source-over';
        };
        c.save(); c.translate(cx, cy); c.scale(1, 0.6);
        if (p < 0.22) {   // wind-up: four little whorls spinning up round the caster
          const q = p / 0.22;
          for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 3; c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); arm(4, 4 + 12 * q, t * 10, 4, 4); c.restore(); }
        } else {   // the big spiral: three flame arms wrapping round
          const q = easeOut(Math.min(1, (p - 0.22) / 0.2));
          for (let i = 0; i < 3; i++) arm(r * 0.3, r * (0.7 + 0.5 * q), t * 7 + i * Math.PI * 2 / 3, 2.6, 10);
        }
        c.restore(); c.globalAlpha = 1;
        glowAt(c, cx, cy, r * 1.1, color, 0.35 * k);
      }, tick: () => {
        if (Math.random() < 0.4) { const a = Math.random() * Math.PI * 2; spawn({ x: ent.x + Math.cos(a) * r, y: ent.y + Math.sin(a) * r * 0.6, z: 14, vx: -Math.sin(a) * 60, vy: Math.cos(a) * 36, vz: rand(20, 60), life: rand(0.3, 0.6), size: rand(8, 13), size1: 0, color: Math.random() < 0.5 ? color : core }); }
      }, done: () => {
        for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = rand(60, 160);
          spawn({ x: ent.x + Math.cos(a) * r * 0.8, y: ent.y + Math.sin(a) * r * 0.5, z: rand(10, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(10, 60), drag: 0.05, life: rand(0.8, 1.4), size: rand(3, 6), size1: 0, color: i % 2 ? color : core, fadeIn: 0.02 }); }
      } });
    },

    // swirling ribbons of song (the bard look): teal, violet and gold bands circling a spot with twinkles, then they
    // stretch out into wisps that drift away. o.dir -1 winds them backwards and inward (rewind)
    ribbons(x, y, o = {}) {
      const r = o.r ?? 50, dur = o.dur ?? 1.4, dir = o.dir ?? 1, follow = o.follow, cols = o.colors || ['#5ff0d0', '#b48cff', '#ffd27a'], nb = o.n ?? 3;
      const bands = Array.from({ length: nb }, (_, i) => ({ col: cols[i % cols.length], rr: rand(0.65, 1.05), a: i * Math.PI * 2 / nb, w: rand(10, 14), h: rand(8, 26), sp: rand(4, 6) }));
      const at = () => (follow ? { x: follow.x, y: follow.y } : { x, y });
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const { x: cx, y: cy } = at(), k = env(p, 0.12, 0.3) * e.a, grow = easeOut(Math.min(1, p / 0.25));
        for (const b of bands) {
          const R = r * b.rr * (dir > 0 ? 0.5 + 0.5 * grow : 1.3 - 0.5 * grow), a0 = b.a + dir * t * b.sp;
          c.save(); c.translate(cx, cy - b.h); c.scale(1, 0.45);
          c.globalAlpha = k * 0.35; c.fillStyle = '#141428'; band(c, R + 2, R + 2, a0 - 2.2 * dir, a0 + 0.05 * dir, b.w + 4, 'mid');
          c.globalAlpha = k * 0.8; c.fillStyle = b.col; band(c, R, R, a0 - 2.2 * dir, a0, b.w, 'mid');
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.8; c.fillStyle = '#ffffff'; band(c, R - b.w * 0.3, R - b.w * 0.3, a0 - 1.6 * dir, a0 - 0.3 * dir, b.w * 0.25, 'mid');
          c.restore();
        }
        c.globalAlpha = 1;
      }, tick: () => {
        if (Math.random() < 0.25) { const { x: cx, y: cy } = at(), a = Math.random() * Math.PI * 2; spawn({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.45, z: rand(10, 30), vz: rand(10, 30), life: 0.6, size: rand(7, 11), size1: 0, color: cols[Math.floor(Math.random() * cols.length)], kind: 'star', vr: 3 }); }
      }, done: () => {
        const { x: cx, y: cy } = at();
        for (let i = 0; i < 6; i++) { const s = Math.random() < 0.5 ? -1 : 1; spawn({ x: cx + rand(-r, r) * 0.6, y: cy + rand(-r, r) * 0.3, z: rand(10, 34), vx: s * rand(160, 260), drag: 0.06, life: rand(0.6, 0.9), size: rand(8, 12), color: cols[i % cols.length], kind: 'soft', stretch: 5, a: 0.7 }); }
      } });
    },

    // shadow dash: a dark violet smear from where you were to where you land, ink-edged with a thin bright core,
    // and purple smoke left hanging where it started
    shadowdash(sx, sy, tx, ty, o = {}) {
      const color = o.color || '#8a4dff', dur = o.dur ?? 0.45, ang = Math.atan2(ty - sy, tx - sx), L = Math.hypot(tx - sx, ty - sy);
      fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const head = easeOut(Math.min(1, p / 0.35)), hx = L * head, bx = L * head * Math.max(0, (p - 0.2) / 0.8), k = e.a * (1 - Math.max(0, (p - 0.5) / 0.5));
        const streak = (w, col, a) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.moveTo(bx, 0); c.quadraticCurveTo((bx + hx) / 2, -w, hx, -w * 0.9); c.arc(hx, 0, w * 0.9, -Math.PI / 2, Math.PI / 2); c.quadraticCurveTo((bx + hx) / 2, w, bx, 0); c.fill(); };
        c.save(); c.translate(sx, sy - 16); c.rotate(ang);
        streak(16, '#140a1e', k * 0.8); streak(11, color, k * 0.75);
        c.globalCompositeOperation = 'lighter'; streak(3, '#e0c8ff', k * 0.8);
        c.restore();
      } });
      B.smoke(sx, sy, { n: 4, color: o.smoke || '#4a3060', size: 24, a: 0.6, speed: 40, life: 1.3 });
    },
  };

  function setScale(s) { scale = s; }
  function clear() { parts.length = 0; effects.length = 0; }
  function mute(on) { muted = !!on; }

  return Object.assign({ update, draw, spawn, fx, sprite, setScale, clear, mute, glowAt, neonRing, neonPath, get count() { return parts.length; } }, B);
})();
