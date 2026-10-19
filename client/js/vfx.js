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
  let now = 0;
  let scale = 1;   // alpha multiplier for whatever is being spawned (others' abilities are dimmed)

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
      default: return sprite('glow', color);
    }
    cache.set(key, c);
    return c;
  }

  // ---------------------------------------------------------------- particles
  // p: { x, y, z, vx, vy, vz, g, drag, life, size, size1, color, kind, add, rot, vr, stretch, a, spin, ground, fadeIn }
  function spawn(p) {
    if (parts.length >= MAX_PARTS) parts.shift();
    p.t0 = now; p.z = p.z || 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0;
    p.rot = p.rot ?? Math.random() * Math.PI * 2;
    p.a = (p.a ?? 1) * scale;
    parts.push(p);
    return p;
  }
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- effects
  // e: { layer: 'ground'|'air', dur, draw(ctx, p, t, e), add }
  function fx(e) { e.t0 = now + (e.delay || 0); e.sc = scale; e.a = (e.a ?? 1) * scale; effects.push(e); return e; }
  // run an effect's callbacks with the dimming it was spawned with
  function withScale(s, fn) { const prev = scale; scale = s; try { fn(); } finally { scale = prev; } }

  function update(t, dt) {
    now = t;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      const age = now - p.t0;
      if (age > p.life) { parts.splice(i, 1); continue; }
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
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      if (now - e.t0 > e.dur) { effects.splice(i, 1); if (e.done) withScale(e.sc, e.done); continue; }
      if (e.tick && now >= e.t0) withScale(e.sc, () => e.tick(Math.max(0, (now - e.t0) / e.dur), dt, e));
    }
  }

  function drawPart(ctx, p) {
    const age = now - p.t0, q = age / p.life;
    let a = p.a * (q < (p.fadeIn || 0.08) ? q / (p.fadeIn || 0.08) : 1) * (1 - Math.pow(q, p.fadePow || 1.6));
    if (a <= 0.01) return;
    const size = p.size + ((p.size1 ?? p.size) - p.size) * q;
    const img = sprite(p.kind || 'glow', p.color);
    ctx.globalAlpha = Math.min(1, a);
    ctx.globalCompositeOperation = p.add === false ? 'source-over' : 'lighter';
    const y = p.y - p.z;
    if (p.stretch) {
      // streaks point along their velocity (sparks)
      const sp = Math.hypot(p.vx, p.vy - p.vz);
      const ang = Math.atan2(p.vy - p.vz, p.vx);
      const len = Math.max(size, size * p.stretch * Math.min(1, sp / 300));
      ctx.save(); ctx.translate(p.x, y); ctx.rotate(ang);
      ctx.drawImage(img, -len / 2, -size / 4, len, size / 2);
      ctx.restore();
    } else if (p.kind && p.kind !== 'glow' && p.kind !== 'soft' && p.kind !== 'smoke') {
      ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot);
      if (p.flutter) ctx.scale(1, Math.abs(Math.cos(now * p.flutter + p.t0 * 7)) * 0.8 + 0.2);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else ctx.drawImage(img, p.x - size / 2, y - size / 2, size, size);
  }

  function draw(ctx, layer) {
    ctx.save();
    for (const e of effects) {
      if ((e.layer || 'air') !== layer || now < e.t0) continue;
      const p = Math.min(1, (now - e.t0) / e.dur);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = e.add ? 'lighter' : 'source-over';
      e.draw(ctx, p, now - e.t0, e);
    }
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
      return fx({ dur: o.dur ?? 1.2, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
        const cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y;
        const k = env(p, 0.15, 0.3) * e.a, grow = easeOut(Math.min(1, p / 0.2));
        const R = r * (0.6 + 0.4 * grow), flat = 0.78;
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
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const [col, rr, ww, al] of [[color, r, w, 0.55], ['#ffffff', r * 0.98, w * 0.35, 0.9]]) {
          c.globalAlpha = al * k; c.fillStyle = col;
          c.beginPath(); c.arc(x, y - 10, rr, flip > 0 ? aT : a1, flip > 0 ? a1 : aT, false);
          c.arc(x, y - 10, rr * (1 - ww), flip > 0 ? a1 : aT, flip > 0 ? aT : a1, true); c.closePath(); c.fill();
        }
        c.restore();
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
  };

  function setScale(s) { scale = s; }
  function clear() { parts.length = 0; effects.length = 0; }

  return Object.assign({ update, draw, spawn, fx, sprite, setScale, clear, glowAt, neonRing, neonPath, get count() { return parts.length; } }, B);
})();
