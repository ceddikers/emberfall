// The Founding: skill effects. Every cast has a wind-up, an impact and an afterglow, and each hero keeps one palette:
// the Bastion is gold and steel, the Cleric warm white and gold with a green heal, the Pyromancer fire (hot core, orange body, smoky edge),
// the Ranger pale gold and leaf green. Everything is drawn in code from a few pre-rendered sprites (rune rings, flares, fire and smoke clouds,
// light shafts, cracks) so a busy fight stays cheap: each ability adds one or two effect objects, never a particle per spark.
// client.js calls in: Fx.init(kit) once, then cast / release / impact / auto from the host's events and the zone and projectile painters.
// Enemy telegraphs are drawn after all of this (client.js drawTop), so nothing here sits on top of a red or blue shape.
const FoundingFx = (() => {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  let K = null;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const eo = t => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) * (1 - t); };
  const ei = t => { t = clamp(t, 0, 1); return t * t * t; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fr = v => v - Math.floor(v);
  const TN = () => K.S.T;
  const zleft = z => Math.max(0, z.tLeft - (TN() - z.at));
  const rk3 = (r, n) => clamp((r | 0) - 1, 0, n - 1);   // a rank (1-based) as an index

  // ---------------------------------------------------------------- the look: palettes
  const GOLD = '255,226,150', HOLY = '255,240,190', STEEL = '160,190,240', FIRE = '255,140,40', HOTC = '255,226,150', LEAF = '150,230,140', ARROW = '255,232,160';

  // ---------------------------------------------------------------- pre-rendered sprites
  const cache = {};
  function mk(key, w, h, paint) {
    let s = cache[key]; if (s) return s;
    s = document.createElement('canvas'); s.width = w; s.height = h; paint(s.getContext('2d'), w, h); return (cache[key] = s);
  }
  function seeded(n) { let a = n | 0 || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
  // a cluster of soft blobs: painted, uneven clouds (fire, smoke) instead of one round gradient
  function cloud(key, size, n, stops, seed) {
    return mk(key, size, size, g => {
      const R = seeded(seed || 7), h = size / 2;
      for (let i = 0; i < n; i++) {
        const a = R() * TAU, d = (i ? R() * 0.34 : 0) * h, r = h * (i ? 0.42 + R() * 0.3 : 0.7), x = h + Math.cos(a) * d, y = h + Math.sin(a) * d;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const s of stops) gr.addColorStop(s[0], s[1]);
        g.fillStyle = gr; g.fillRect(0, 0, size, size);
      }
    });
  }
  const fireSpr = () => cloud('fire', 96, 5, [[0, 'rgba(255,250,214,1)'], [0.2, 'rgba(255,216,112,.95)'], [0.5, 'rgba(255,122,38,.82)'], [0.8, 'rgba(120,30,12,.5)'], [1, 'rgba(40,10,6,0)']], 11);
  const smokeSpr = () => cloud('smoke', 96, 5, [[0, 'rgba(78,68,62,.6)'], [0.55, 'rgba(48,42,40,.34)'], [1, 'rgba(30,26,24,0)']], 5);
  const dustSpr = () => cloud('dust', 96, 5, [[0, 'rgba(176,152,118,.55)'], [0.6, 'rgba(140,118,90,.3)'], [1, 'rgba(110,92,70,0)']], 3);
  function flareSpr(rgb) {
    return mk('fl' + rgb, 128, 128, g => {
      g.translate(64, 64); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, `rgba(${rgb},.9)`); gr.addColorStop(0.4, `rgba(${rgb},.22)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(-64, -64, 128, 128);
      for (let i = 0; i < 8; i++) {
        const L = i % 2 ? 34 : 62, wd = i % 2 ? 2.6 : 4.6; g.save(); g.rotate(i * PI / 4);
        const sg = g.createLinearGradient(0, 0, L, 0); sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(0.35, `rgba(${rgb},.7)`); sg.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = sg; g.beginPath(); g.moveTo(0, -wd); g.lineTo(L, 0); g.lineTo(0, wd); g.closePath(); g.fill(); g.restore();
      }
    });
  }
  // a ground sigil: double ring, tick marks, a band of small glyphs, an inner ring and a star
  function runeSpr(rgb) {
    return mk('rn' + rgb, 256, 256, g => {
      g.translate(128, 128); g.lineCap = 'round';
      const col = a => `rgba(${rgb},${a})`, hi = a => `rgba(255,252,236,${a})`;
      const fg = g.createRadialGradient(0, 0, 40, 0, 0, 124); fg.addColorStop(0, col(0)); fg.addColorStop(1, col(0.2)); g.fillStyle = fg; g.beginPath(); g.arc(0, 0, 124, 0, TAU); g.fill();
      g.strokeStyle = col(0.95); g.lineWidth = 3.4; g.beginPath(); g.arc(0, 0, 122, 0, TAU); g.stroke();
      g.strokeStyle = hi(0.55); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 119, 0, TAU); g.stroke();
      g.strokeStyle = col(0.55); g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 112, 0, TAU); g.stroke();
      for (let i = 0; i < 48; i++) { const a = i * TAU / 48, L = i % 4 === 0 ? 11 : 5; g.strokeStyle = col(i % 4 === 0 ? 0.85 : 0.5); g.lineWidth = i % 4 === 0 ? 2 : 1.2; g.beginPath(); g.moveTo(Math.cos(a) * 111, Math.sin(a) * 111); g.lineTo(Math.cos(a) * (111 - L), Math.sin(a) * (111 - L)); g.stroke(); }
      g.strokeStyle = col(0.6); g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 98, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 80, 0, TAU); g.stroke();
      for (let i = 0; i < 12; i++) {   // the glyph band
        g.save(); g.rotate(i * TAU / 12); g.strokeStyle = hi(0.7); g.lineWidth = 1.6; g.beginPath();
        if (i % 3 === 0) { g.moveTo(89, -6); g.lineTo(94, 0); g.lineTo(89, 6); g.lineTo(84, 0); g.closePath(); } else if (i % 3 === 1) { g.moveTo(84, -5); g.lineTo(94, 0); g.lineTo(84, 5); g.moveTo(88, -3); g.lineTo(88, 3); } else { g.moveTo(85, -5); g.lineTo(93, -5); g.moveTo(85, 0); g.lineTo(93, 0); g.moveTo(85, 5); g.lineTo(93, 5); }
        g.stroke(); g.restore();
      }
      g.strokeStyle = col(0.7); g.lineWidth = 1.6;
      for (let s = 0; s < 2; s++) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = s * PI / 3 + i * TAU / 3 - PI / 2; g.lineTo(Math.cos(a) * 76, Math.sin(a) * 76); } g.closePath(); g.stroke(); }
    });
  }
  function raysSpr(rgb) {
    return mk('ry' + rgb, 256, 256, g => {
      g.translate(128, 128); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const a = i * TAU / 16, w = i % 2 ? 0.07 : 0.13; g.save(); g.rotate(a);
        const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, `rgba(${rgb},.75)`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, -128 * Math.tan(w)); g.lineTo(128, 128 * Math.tan(w)); g.closePath(); g.fill(); g.restore();
      }
    });
  }
  // a vertical shaft of light: soft sides, brightest at the foot, gone at the top; drawn scaled and anchored at the foot
  function shaftSpr(rgb) {
    return mk('sh' + rgb, 64, 256, g => {
      const hg = g.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, `rgba(${rgb},0)`); hg.addColorStop(0.3, `rgba(${rgb},.55)`); hg.addColorStop(0.5, 'rgba(255,255,255,.95)'); hg.addColorStop(0.7, `rgba(${rgb},.55)`); hg.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = hg; g.fillRect(0, 0, 64, 256);
      g.globalCompositeOperation = 'source-atop'; const R = seeded(9);
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${0.12 + R() * 0.16})`; g.fillRect(10 + R() * 44, 0, 1 + R() * 2, 256); }
      g.globalCompositeOperation = 'destination-in'; const vg = g.createLinearGradient(0, 0, 0, 256); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.5, 'rgba(0,0,0,.55)'); vg.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = vg; g.fillRect(0, 0, 64, 256);
    });
  }
  function scorchSpr() {
    return mk('scorch', 256, 256, g => {
      const R = seeded(21); g.translate(128, 128); g.fillStyle = 'rgba(16,7,4,.85)'; g.beginPath();
      for (let i = 0; i <= 28; i++) { const a = i * TAU / 28, r = 96 + R() * 26; if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill(); g.globalCompositeOperation = 'destination-out'; const gr = g.createRadialGradient(0, 0, 40, 0, 0, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(-128, -128, 256, 256);
    });
  }
  function cracksSpr(rgb) {
    return mk('cr' + rgb, 256, 256, g => {
      const R = seeded(33); g.translate(128, 128); g.lineCap = 'round'; g.lineJoin = 'round';
      const branch = (x, y, a, len, w) => {
        let px = x, py = y; g.beginPath(); g.moveTo(px, py);
        const n = 5; for (let i = 0; i < n; i++) { a += (R() - 0.5) * 0.9; px += Math.cos(a) * len / n; py += Math.sin(a) * len / n; g.lineTo(px, py); if (i === 2 && len > 40 && w > 1.2) { g.stroke(); branch(px, py, a + (R() < 0.5 ? 0.7 : -0.7), len * 0.45, w * 0.6); g.beginPath(); g.moveTo(px, py); } }
        g.stroke();
      };
      for (const pass of [[`rgba(${rgb},.55)`, 6], [`rgba(${rgb},.95)`, 3], ['rgba(255,236,170,.95)', 1.2]]) { g.strokeStyle = pass[0]; g.lineWidth = pass[1]; const S2 = seeded(33); for (let i = 0; i < 15; i++) { const a = i * TAU / 15 + S2() * 0.3; R(); const sa = a; g.save(); const RR = seeded(100 + i); const bb = (x, y, aa, len, w) => { let px = x, py = y; g.beginPath(); g.moveTo(px, py); for (let j = 0; j < 5; j++) { aa += (RR() - 0.5) * 0.9; px += Math.cos(aa) * len / 5; py += Math.sin(aa) * len / 5; g.lineTo(px, py); if (j === 2 && len > 40 && w > 1) { g.stroke(); bb(px, py, aa + (RR() < 0.5 ? 0.7 : -0.7), len * 0.42, w * 0.6); g.beginPath(); g.moveTo(px, py); } } g.stroke(); }; bb(Math.cos(sa) * 14, Math.sin(sa) * 14, sa, 70 + (i % 3) * 22, pass[1]); g.restore(); } }
      void branch;
    });
  }
  const warm = () => {   // every sprite the effects use, made once up front so no cast ever pays for one
    fireSpr(); smokeSpr(); dustSpr(); scorchSpr(); cracksSpr('255,120,30'); raysSpr(HOLY); shaftSpr(HOLY); shaftSpr('255,250,235'); shaftSpr(ARROW);
    for (const r of [FIRE, GOLD, HOLY, ARROW, STEEL, '255,170,70', '230,238,255', '255,230,170', '255,150,60']) flareSpr(r);
    for (const r of [GOLD, HOLY, '255,236,170', '255,214,120', '255,150,60', '255,226,150']) runeSpr(r);
  };

  // ---------------------------------------------------------------- small painters
  function G(c, s, x, y, w, h, a, rot, add) {   // one sprite, centred
    if (a <= 0.005) return; c.save(); c.globalAlpha = a > 1 ? 1 : a; if (add) c.globalCompositeOperation = 'lighter'; c.translate(x, y); if (rot) c.rotate(rot); c.drawImage(s, -w / 2, -h / 2, w, h); c.restore();
  }
  const glow = (c, x, y, r, rgb, a) => K.glowAt(c, x, y, r, rgb, a);
  function inView(x, y, r) {
    const S = K.S; if (!S || !S.cam) return true; const z = S.cam.zoom || 1, hw = K.W() / 2 / z + r, hh = K.H() / 2 / z + r;
    return Math.abs(x - S.cam.x) < hw && Math.abs(y - S.cam.y) < hh;
  }
  const seen = (x, y, r) => inView(x, y, r) && K.visAt(x, y, r);
  // a tapered ribbon through a list of points (oldest first): tail width w0, head width w1
  function tape(c, pts, w0, w1, style, add) {
    const n = pts.length; if (n < 2) return;
    c.save(); if (add) c.globalCompositeOperation = 'lighter'; c.fillStyle = style; c.beginPath();
    const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const w = lerp(w0, w1, i / (n - 1)) * 0.5; L.push(pts[i].x - dy * w, pts[i].y + dx * w); Rr.push(pts[i].x + dy * w, pts[i].y - dx * w);
    }
    c.moveTo(L[0], L[1]); for (let i = 2; i < L.length; i += 2) c.lineTo(L[i], L[i + 1]);
    for (let i = Rr.length - 2; i >= 0; i -= 2) c.lineTo(Rr[i], Rr[i + 1]);
    c.closePath(); c.fill(); c.restore();
  }
  // a tongue of flame standing on (x, y)
  function tongue(c, x, y, w, h, t, seed, hot) {
    const f = 0.8 + 0.2 * Math.sin(t * 13 + seed), sw = Math.sin(t * 9 + seed * 2) * w * 0.18;
    c.fillStyle = hot ? '#ff8c2a' : '#ee6a1c'; c.beginPath(); c.moveTo(x - w * 0.5, y); c.quadraticCurveTo(x - w * 0.42 * f, y - h * 0.62, x + sw, y - h); c.quadraticCurveTo(x + w * 0.42 * f, y - h * 0.55, x + w * 0.5, y); c.fill();
    c.fillStyle = '#ffc040'; c.beginPath(); c.moveTo(x - w * 0.3, y); c.quadraticCurveTo(x - w * 0.14, y - h * 0.45, x + sw * 0.8, y - h * 0.72); c.quadraticCurveTo(x + w * 0.14, y - h * 0.3, x + w * 0.3, y); c.fill();
    c.fillStyle = '#fff2b0'; c.beginPath(); c.ellipse(x, y - h * 0.16, w * 0.14, h * 0.18, 0, 0, TAU); c.fill();
  }
  // flying specks that follow one pre-rolled path each, drawn as one stroke (sparks) so thirty of them cost one call
  function specks(n, spdLo, spdHi, g, lifeLo, lifeHi, ang0, spread) {
    const A = []; for (let i = 0; i < n; i++) { const a = ang0 === undefined ? rnd(0, TAU) : ang0 + rnd(-spread, spread); A.push({ a, v: rnd(spdLo, spdHi), l: rnd(lifeLo, lifeHi), g: g || 0, w: rnd(0.8, 1.6) }); }
    return A;
  }
  function drawSpecks(c, A, x, y, t, rgb, add, maxLen) {
    c.save(); if (add) c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 0; i < A.length; i++) {
      const s = A[i], q = t / s.l; if (q >= 1) continue; const d = s.v * (1 - Math.pow(1 - q, 2)) * s.l * 0.6, px = x + Math.cos(s.a) * d, py = y + Math.sin(s.a) * d + s.g * t * t * 0.5, L = (maxLen || 6) * (1 - q);
      c.strokeStyle = `rgba(${rgb},${(1 - q) * 0.95})`; c.lineWidth = s.w * (1 - q * 0.5) + 0.3; c.beginPath(); c.moveTo(px, py); c.lineTo(px - Math.cos(s.a) * L, py - Math.sin(s.a) * L - s.g * t * 0.04); c.stroke();
    }
    c.restore();
  }
  const add = o => K.fxAdd(o);
  const ring = (x, y, r0, r1, dur, rgb, lw, layer) => K.fxRing(x, y, r0, r1, dur, rgb, lw, layer);
  // the light of a blast on the ground, capped: a big one tints the screen a little only when it is near the player
  function bloom(x, y, a, rgb) {
    const S = K.S, m = K.me(); if (!S || !m || Math.hypot(m.x - x, m.y - y) > 520) return; const cap = Math.min(a, 0.2);
    if (!S.flash || S.flash.a < cap) S.flash = { t: 0, dur: 0.3, a: cap, c: rgb || '255,230,180' };
  }
  function flare(x, y, size, rgb, dur, rot) {
    const r0 = rot === undefined ? rnd(0, PI) : rot;
    add({ dur, layer: 1, draw(c) { if (!inView(x, y, size)) return; const k = this.t / dur, s = size * (0.55 + 0.65 * eo(k)); G(c, flareSpr(rgb), x, y, s, s, (1 - k) * (1 - k) * 1.1, r0 + k * 0.4, true); } });
  }
  function smokeUp(x, y, n, size, dur, rise, layer) {
    const P = []; for (let i = 0; i < n; i++) P.push({ ox: rnd(-0.5, 0.5) * size, oy: rnd(-0.2, 0.2) * size, d: rnd(0, 0.35), s: rnd(0.7, 1.2), dr: rnd(-12, 12) });
    add({ dur: dur + 0.4, layer: layer === undefined ? 1 : layer, draw(c) {
      if (!inView(x, y, size * 2)) return; const sp = smokeSpr();
      for (const p of P) { const k = (this.t - p.d) / dur; if (k <= 0 || k >= 1) continue; const s = size * p.s * (0.7 + 0.9 * k); G(c, sp, x + p.ox + p.dr * k, y + p.oy - rise * eo(k), s, s, 0.7 * (1 - k) * Math.min(1, k * 6), p.dr * 0.05); }
    } });
  }
  function dustRing(x, y, R, n, dur) {
    const P = []; for (let i = 0; i < n; i++) P.push({ a: (i + rnd(0, 0.8)) * TAU / n, s: rnd(0.8, 1.3) });
    add({ dur, layer: 1, draw(c) {
      if (!inView(x, y, R * 1.5)) return; const k = this.t / dur, sp = dustSpr();
      for (const p of P) { const r = R * eo(k) * p.s, s = 22 + 26 * k; G(c, sp, x + Math.cos(p.a) * r, y + Math.sin(p.a) * r * 0.8 - 6 * k, s * p.s, s * p.s, 0.75 * (1 - k)); }
    } });
  }
  function decal(x, y, R, dur, kind, hold) {   // marks on the ground that fade: scorch, lava cracks
    const rot = rnd(0, TAU), hd = hold === undefined ? 0.65 : hold;
    add({ dur, layer: 0, draw(c) {
      if (!inView(x, y, R * 1.4) || !K.visAt(x, y, R)) return; const k = this.t / dur, f = k < hd ? 1 : 1 - (k - hd) / (1 - hd);
      G(c, scorchSpr(), x, y, R * 2.2, R * 2.2, 0.8 * f, rot);
      if (kind === 'lava') { const pul = 0.75 + 0.25 * Math.sin(this.t * 6), hot = clamp(1 - k * 1.5, 0, 1); G(c, cracksSpr('255,120,30'), x, y, R * 2.0, R * 2.0, (0.35 + 0.65 * hot) * pul * f, rot, true); }
    } });
  }
  function ground(x, y, rgb, R, dur, spin) {   // a sigil that blooms on the ground and fades
    const rot = rnd(0, TAU);
    add({ dur, layer: 0, draw(c) {
      if (!inView(x, y, R * 1.2) || !K.visAt(x, y, R)) return; const k = this.t / dur, s = R * 2.1 * (0.7 + 0.3 * eo(k * 3));
      G(c, runeSpr(rgb), x, y, s, s, Math.min(1, k * 8) * (1 - k) * 0.9, rot + (spin || 0.6) * this.t, true);
    } });
  }

  // ---------------------------------------------------------------- the wind-ups (a cast begins; the effect itself lands on release)
  function gatherOrb(u, dur, rgb, tx, ty, size) {
    const S = []; for (let i = 0; i < 7; i++) S.push({ a: rnd(0, TAU), r: rnd(24, 42), s: rnd(0.8, 1.4) });
    add({ dur: dur + 0.04, layer: 1, draw(c) {
      if (!inView(u.x, u.y, 70)) return; const k = clamp(this.t / dur, 0, 1), ang = Math.atan2(ty - u.y, tx - u.x), ox = u.x + Math.cos(ang) * (15 + 4 * k), oy = u.y + Math.sin(ang) * (11 + 3 * k) - 9, r = size * (0.4 + 0.6 * eo(k));
      glow(c, ox, oy, r * 3.4, rgb, 0.7); G(c, fireSpr(), ox, oy, r * 3, r * 3, 0.9, this.t * 3);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,248,214,.95)'; c.beginPath(); c.arc(ox, oy, r * 0.5, 0, TAU); c.fill();
      c.strokeStyle = `rgba(${rgb},.9)`; c.lineWidth = 1.3; c.lineCap = 'round'; c.beginPath();
      for (const s of S) { const q = fr(k * s.s), rr = s.r * (1 - q), a = s.a + q * 1.6, px = ox + Math.cos(a) * rr, py = oy + Math.sin(a) * rr * 0.8; c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 3.4, py + Math.sin(a) * 2.7); }
      c.stroke(); c.restore();
    } });
  }
  function converge(x, y, R, dur, rgb, n) {   // motes and a ring drawn in toward a point: the cast is gathering
    const P = []; for (let i = 0; i < n; i++) P.push({ a: rnd(0, TAU), d: rnd(0.6, 1), s: rnd(0.8, 1.5) });
    add({ dur: dur + 0.05, layer: 1, draw(c) {
      if (!inView(x, y, R * 1.5)) return; const k = clamp(this.t / dur, 0, 1);
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${rgb},${0.25 + 0.6 * k})`; c.lineWidth = 1.6 + 1.4 * k; c.beginPath(); c.ellipse(x, y, R * (1 - 0.75 * eo(k)), R * (1 - 0.75 * eo(k)) * 0.92, 0, 0, TAU); c.stroke();
      c.fillStyle = `rgba(${rgb},.9)`; for (const p of P) { const q = fr(k * p.s), rr = R * p.d * (1 - q); c.globalAlpha = Math.sin(q * PI) * 0.9; c.beginPath(); c.arc(x + Math.cos(p.a + q) * rr, y + Math.sin(p.a + q) * rr * 0.9, 1.9, 0, TAU); c.fill(); }
      c.restore(); glow(c, x, y, R * 0.5 * k + 8, rgb, 0.4 * k);
    } });
  }
  function lightFall(x, y, R, dur, n) {   // streaks of light dropping into a circle: the Dawn gathers
    const P = []; for (let i = 0; i < n; i++) { const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * R; P.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.9, s: rnd(0.7, 1.4), o: rnd(0, 1) }); }
    add({ dur: dur + 0.05, layer: 1, draw(c) {
      if (!inView(x, y, R * 1.3) || !K.visAt(x, y, R)) return; const k = clamp(this.t / dur, 0, 1);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineWidth = 2;
      for (const p of P) { const q = fr(k * p.s + p.o); if (q < 0.05) continue; const hy = p.y - 260 * (1 - eo(q)); c.strokeStyle = `rgba(255,240,190,${Math.sin(q * PI) * 0.8 * (0.4 + 0.6 * k)})`; c.beginPath(); c.moveTo(p.x, hy - 34); c.lineTo(p.x, hy); c.stroke(); }
      c.restore();
    } });
  }
  function slowRise(u, rgb, dur, n) {   // sparks climbing off the caster
    add({ dur, layer: 1, draw(c) {
      if (!inView(u.x, u.y, 60)) return; const k = this.t / dur; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${rgb},.9)`;
      for (let i = 0; i < n; i++) { const q = fr(k * 1.6 + i / n), a = i * 2.4 + this.t * 2, r = 20 + 6 * Math.sin(i * 3); c.globalAlpha = Math.sin(q * PI) * 0.9 * (1 - k * 0.4); c.beginPath(); c.arc(u.x + Math.cos(a) * r, u.y + 6 + Math.sin(a) * r * 0.5 - q * 50, 1.8, 0, TAU); c.fill(); }
      c.restore();
    } });
  }
  function cast(u, slot, wind, tx, ty, mine) {
    const h = u.hero, w = Math.max(0.12, wind);
    if (h === 'pyromancer') {
      if (slot === 0 && wind > 0.05) gatherOrb(u, w, FIRE, tx, ty, 7);
      else if (slot === 1) { converge(tx, ty, 60, w, '255,170,80', 10); }
      else if (slot === 3) { ring(u.x, u.y + 8, 60, 22, w, '255,170,80', 2.5, 0); slowRise(u, '255,170,80', w + 0.3, 12); gatherOrb(u, w, '255,120,40', u.x, u.y - 40, 11); }
    } else if (h === 'cleric') {
      if (slot === 1) { converge(tx, ty, 46, w, HOLY, 6); }
      else if (slot === 2) { converge(tx, ty, 70, w, HOLY, 10); }
      else if (slot === 3) {
        const rank = mine && K.S.sheet ? K.S.sheet.rk[3] : 2, R = [150, 190, 230][rk3(rank, 3)];
        ring(tx, ty, R * 1.5, R, w, HOLY, 3, 0); lightFall(tx, ty, R, w, 26); converge(tx, ty, R * 0.6, w, '255,236,170', 12);
        add({ dur: w + 0.05, layer: 0, draw(c) { if (!inView(tx, ty, R * 1.2)) return; const k = clamp(this.t / w, 0, 1), s = R * 2.1; G(c, runeSpr('255,236,170'), tx, ty, s, s, 0.7 * eo(k), k * 1.2, true); } });
      }
    } else if (h === 'bastion') {
      if (slot === 1) converge(tx, ty, 60, w, GOLD, 8);
      else if (slot === 3) converge(tx, ty, 80, w, GOLD, 10);
    } else if (h === 'ranger') {
      if (slot === 3) { slowRise(u, ARROW, w + 0.3, 12); ring(u.x, u.y + 8, 50, 18, w, ARROW, 2, 0); add({ dur: w + 0.2, layer: 1, draw(c) { if (!inView(u.x, u.y, 60)) return; const k = clamp(this.t / (w + 0.2), 0, 1); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, u.y - 220, 0, u.y); g.addColorStop(0, 'rgba(255,232,160,0)'); g.addColorStop(1, `rgba(255,232,160,${0.5 * Math.sin(k * PI)})`); c.fillStyle = g; c.fillRect(u.x - 3, u.y - 220, 6, 220); c.restore(); } }); }
      else if (slot === 0) { glowFlick(u, tx, ty, w, ARROW); }
    }
  }
  function glowFlick(u, tx, ty, dur, rgb) {   // a gleam running up the bow while it is drawn
    add({ dur: dur + 0.05, layer: 1, draw(c) { if (!inView(u.x, u.y, 60)) return; const k = clamp(this.t / dur, 0, 1), a = Math.atan2(ty - u.y, tx - u.x); glow(c, u.x + Math.cos(a) * 13, u.y + Math.sin(a) * 10 - 6, 10 + 8 * k, rgb, 0.3 + 0.55 * k); } });
  }

  // ---------------------------------------------------------------- Bastion
  function arcSlash(u, t, ang) {   // the sword stroke: pale outer sweep, white middle, bright thin core, sparks off the edge
    const dur = 0.2, sp = specks(5, 120, 200, 0, 0.18, 0.3, ang, 0.9);
    add({ dur, layer: 1, draw(c) {
      if (!inView(u.x, u.y, 60)) return; const k = this.t / dur, a0 = -1.15 + k * 0.7, a1 = 1.05 + k * 0.25, f = 1 - k;
      c.save(); c.translate(u.x, u.y); c.rotate(ang); c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(${STEEL},${0.45 * f})`; c.lineWidth = 9 * f + 2; c.beginPath(); c.arc(0, 0, 25, a0, a1); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${0.85 * f})`; c.lineWidth = 4.2 * f + 0.8; c.beginPath(); c.arc(0, 0, 26, a0 + 0.1, a1); c.stroke();
      c.strokeStyle = `rgba(${GOLD},${f})`; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 27.5, a0 + 0.2, a1 + 0.05); c.stroke();
      c.restore(); drawSpecks(c, sp, u.x + Math.cos(ang) * 28, u.y + Math.sin(ang) * 28, this.t, '255,244,214', true, 7);
    } });
    flare(t.x, t.y, 30, '230,238,255', 0.18);
  }
  function bash(x, y, cx, cy, rank) {   // the shield is driven into the target: the slab flies in, a shock and a ring of dust break out
    const sc = 1 + 0.08 * (rank - 1), ang = Math.atan2(y - cy, x - cx), fx = cx + Math.cos(ang) * 22, fy = cy + Math.sin(ang) * 22;
    add({ dur: 0.18, layer: 1, draw(c) {
      if (!inView(x, y, 60)) return; const k = this.t / 0.18, px = lerp(fx, x, eo(k * 1.4)), py = lerp(fy, y, eo(k * 1.4)), f = 1 - k * 0.5;
      c.save(); c.translate(px, py); c.rotate(ang); c.globalAlpha = f; const s = 11 * sc;
      c.fillStyle = '#7d93bd'; c.strokeStyle = '#0b0806'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(s * 0.6, 0); c.lineTo(-s * 0.4, -s * 0.9); c.lineTo(-s * 0.7, 0); c.lineTo(-s * 0.4, s * 0.9); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#e6c98a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(s * 0.3, 0); c.lineTo(-s * 0.5, 0); c.stroke();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${GOLD},${0.4 * f})`; c.fill(); c.restore();
    } });
    add({ dur: 0.5, layer: 1, draw(c) {
      if (!inView(x, y, 120)) return; const k = this.t / 0.5, f = 1 - k;
      G(c, flareSpr(GOLD), x, y, 74 * sc * (0.5 + 0.7 * eo(k * 2)), 74 * sc * (0.5 + 0.7 * eo(k * 2)), Math.max(0, 1 - k * 2.2), ang, true);
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${GOLD},${0.9 * f})`; c.lineWidth = 3.2 * f + 0.6; c.beginPath(); c.ellipse(x, y, 10 + 46 * sc * eo(k), (10 + 46 * sc * eo(k)) * 0.9, 0, 0, TAU); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${0.7 * f})`; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, y, 6 + 28 * sc * eo(k), (6 + 28 * sc * eo(k)) * 0.9, 0, 0, TAU); c.stroke(); c.restore();
    } });
    K.burst(x, y, 10, { color: '#e8dcc0', spd: 150, dur: 0.55, size: 3, kind: 'dust' }); K.burst(x, y, 9, { ang, spread: 1.2, color: '#fff0c0', spd: 190, dur: 0.35, size: 2.2, kind: 'spark' });
  }
  function banner(x, y, cx, cy, rank) {   // the standard is slammed in: dust ring, gold motes lifting off the ground, a sigil that settles
    const sc = 1 + 0.06 * (rank - 1), R = [80, 100, 120, 135, 150][rk3(rank, 5)];
    ground(x, y, GOLD, R, 0.9, 0.8); ring(x, y, 8, R, 0.5, GOLD, 3, 0); ring(x, y, 6, R * 0.6, 0.4, '255,255,255', 1.6, 0);
    dustRing(x, y, R * 0.45 * sc, 8, 0.6); flare(x, y, 80 * sc, GOLD, 0.35);
    add({ dur: 1.1, layer: 1, draw(c) {
      if (!inView(x, y, R)) return; const k = this.t / 1.1; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${GOLD},.9)`;
      for (let i = 0; i < 14; i++) { const a = i * 2.39, d = R * (0.3 + 0.65 * fr(i * 0.618)), q = clamp(k * 1.4 - fr(i * 0.37) * 0.4, 0, 1); c.globalAlpha = Math.sin(q * PI) * 0.85; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9 - q * 60, 1.9, 0, TAU); c.fill(); }
      c.restore();
    } });
  }
  function brace(u, rank) {   // a held shield: a bright crescent and a faint dome that stay on the Bastion for the whole window
    const win = [0.45, 0.45, 0.5, 0.55, 0.6][rk3(rank, 5)] + 0.12;
    add({ dur: win, layer: 1, draw(c) {
      if (!inView(u.x, u.y, 60)) return; const k = this.t / win, f = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, a = u.face;
      c.save(); c.translate(u.x, u.y); c.rotate(a); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(0, 0, 6, 0, 0, 36); gr.addColorStop(0, `rgba(${GOLD},0)`); gr.addColorStop(0.8, `rgba(${GOLD},${0.2 * f})`); gr.addColorStop(1, `rgba(${GOLD},0)`);
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 36, -1.25, 1.25); c.closePath(); c.fill();
      c.lineCap = 'round'; c.strokeStyle = `rgba(255,252,230,${0.95 * f})`; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 30, -1.15, 1.15); c.stroke();
      c.strokeStyle = `rgba(${GOLD},${0.6 * f})`; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 31, -1.0, 1.0); c.stroke();
      c.strokeStyle = `rgba(${GOLD},${0.5 * f})`; c.lineWidth = 1; for (let i = -2; i <= 2; i++) { const q = i * 0.45; c.beginPath(); c.moveTo(Math.cos(q) * 22, Math.sin(q) * 22); c.lineTo(Math.cos(q) * 30, Math.sin(q) * 30); c.stroke(); }
      c.restore(); glow(c, u.x + Math.cos(a) * 28, u.y + Math.sin(a) * 28, 22, GOLD, 0.45 * f);
    } });
    ring(u.x, u.y, 12, 34, 0.25, GOLD, 2, 1);
  }
  function wallRise(x, y, ang, len, rank) {   // a wall: the ground splits along its line, light runs out from the middle, the slabs stand up in dust
    const ux = Math.cos(ang), uy = Math.sin(ang), n = 12, dur = 0.9;
    add({ dur, layer: 0, draw(c) {
      if (!inView(x, y, len)) return; const k = this.t / dur, sw = eo(Math.min(1, this.t / 0.3)), f = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5, half = len * 0.5 * sw;
      c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(14,8,6,${0.55 * f})`; c.lineWidth = 16; c.beginPath(); c.moveTo(x - ux * half, y - uy * half + 6); c.lineTo(x + ux * half, y + uy * half + 6); c.stroke();
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${GOLD},${0.55 * f})`; c.lineWidth = 8; c.beginPath(); c.moveTo(x - ux * half, y - uy * half + 6); c.lineTo(x + ux * half, y + uy * half + 6); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${0.9 * f})`; c.lineWidth = 2.2; c.stroke(); c.restore();
    } });
    add({ dur: 0.7, layer: 1, draw(c) {
      if (!inView(x, y, len)) return; const k = this.t / 0.7; c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5, d = Math.abs(u) * 2, q = clamp((k - d * 0.35) * 2.4, 0, 1); if (q <= 0 || q >= 1) continue;
        const px = x + ux * len * u, py = y + uy * len * u, h = 70 * Math.sin(q * PI * 0.8); const g = c.createLinearGradient(0, py - h, 0, py);
        g.addColorStop(0, `rgba(${GOLD},0)`); g.addColorStop(1, `rgba(255,246,214,${0.7 * (1 - q)})`); c.fillStyle = g; c.fillRect(px - 5, py - h, 10, h);
      }
      c.restore();
    } });
    for (let i = 0; i < 8; i++) { const u = (i + 0.5) / 8 - 0.5; K.burst(x + ux * len * u, y + uy * len * u, 2, { color: '#b9ab8e', spd: 90, dur: 0.7, size: 4, kind: 'dust', vy: -20 }); }
    K.burst(x, y, 14, { color: '#8a97ad', spd: 190, dur: 0.6, size: 3, kind: 'chunk', g: 380, vy: -90 });
    ring(x, y, 10, len * 0.5, 0.45, GOLD, 3, 0); flare(x, y, 120 + 30 * rank, GOLD, 0.4); bloom(x, y, 0.12, '255,236,190');
  }
  function wallEnd(z) {   // the wall is spent: the slabs break and fly
    const ux = Math.cos(z.b), uy = Math.sin(z.b);
    for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7 - 0.5; K.burst(z.x + ux * z.a * u, z.y + uy * z.a * u - 10, 3, { color: i % 2 ? '#5f7aa6' : '#6d87b3', spd: 140, dur: 0.7, size: 4, kind: 'chunk', g: 420, vy: -110 }); K.burst(z.x + ux * z.a * u, z.y + uy * z.a * u, 1, { color: '#a99e88', spd: 50, dur: 0.8, size: 5, kind: 'dust' }); }
    ring(z.x, z.y, 10, z.a * 0.5, 0.4, '190,205,235', 2.5, 0);
    add({ dur: 0.5, layer: 1, draw(c) { if (!inView(z.x, z.y, z.a)) return; const k = this.t / 0.5; c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(210,225,255,${0.6 * (1 - k)})`; c.lineWidth = 4 * (1 - k) + 1; c.lineCap = 'round'; c.beginPath(); c.moveTo(z.x - ux * z.a * 0.5, z.y - uy * z.a * 0.5 - 14 * k); c.lineTo(z.x + ux * z.a * 0.5, z.y + uy * z.a * 0.5 - 14 * k); c.stroke(); c.restore(); } });
  }
  function collapse(x, y, rad) {   // Collapse: it falls forward onto the lane
    dustRing(x, y, rad, 12, 0.7); ring(x, y, 10, rad, 0.5, '190,205,235', 3, 0); flare(x, y, rad * 1.1, STEEL, 0.4); K.shake(4, 0.25);
    K.burst(x, y, 12, { color: '#6d87b3', spd: 180, dur: 0.6, size: 3.4, kind: 'chunk', g: 380 });
  }
  // while the wall stands: a lit rim, a sheen on the slabs, cracks as it is worn down, a few motes
  function wallStand(c, z, k, f, h, x1, y1, ux, uy) {
    const len = z.a, t = TN();
    c.save(); c.globalAlpha = f; c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    const pul = 0.7 + 0.3 * Math.sin(t * 4); c.strokeStyle = `rgba(${GOLD},${0.55 * pul * k})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x1, y1 - h); c.lineTo(x1 + ux * len, y1 + uy * len - h); c.stroke();
    c.strokeStyle = `rgba(255,255,255,${0.35 * k})`; c.lineWidth = 1; c.stroke();
    const sh = c.createLinearGradient(0, y1 - h, 0, y1 + 2); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sh;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + ux * len, y1 + uy * len); c.lineTo(x1 + ux * len, y1 + uy * len - h); c.lineTo(x1, y1 - h); c.closePath(); c.fill();
    c.fillStyle = `rgba(${GOLD},.8)`; for (let i = 0; i < 6; i++) { const q = fr(t * 0.5 + i / 6), px = x1 + ux * len * fr(i * 0.618 + 0.1), py = y1 + uy * len * fr(i * 0.618 + 0.1) - h - q * 22; c.globalAlpha = f * Math.sin(q * PI) * 0.8; c.beginPath(); c.arc(px, py, 1.6, 0, TAU); c.fill(); }
    c.restore();
    if (z.c < 60) {   // worn: dark cracks across the slabs
      c.save(); c.globalAlpha = f * (1 - z.c / 60) * 0.8; c.strokeStyle = 'rgba(10,6,4,.9)'; c.lineWidth = 1.4; c.beginPath();
      for (let i = 0; i < 5; i++) { const q = (i + 0.5) / 5, px = x1 + ux * len * q, py = y1 + uy * len * q; c.moveTo(px, py - h); c.lineTo(px + 3, py - h * 0.65); c.lineTo(px - 2, py - h * 0.35); c.lineTo(px + 2, py); }
      c.stroke(); c.restore();
    }
  }
  function banPole(c, z, ph, f) {   // the standard's halo and the motes round it
    const t = TN(); glow(c, z.x + 8, z.y + ph - 10, 26, GOLD, 0.28 * f);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${GOLD},.85)`;
    for (let i = 0; i < 4; i++) { const q = fr(t * 0.6 + i / 4); c.globalAlpha = Math.sin(q * PI) * 0.7 * f; c.beginPath(); c.arc(z.x + Math.sin(i * 5 + t) * 9 + 6, z.y + ph - 4 - q * 30, 1.5, 0, TAU); c.fill(); }
    c.restore();
  }
  function bannerGround(c, z, f, e) {   // the standard's field: inward chevrons (it draws them in), a slow sigil, motes
    const R = z.a * e, t = TN(); if (!inView(z.x, z.y, R)) return;
    G(c, runeSpr('255,214,120'), z.x, z.y, R * 2.05, R * 2.05, 0.42 * f, t * 0.25, true);
    c.save(); c.globalAlpha = f; c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${GOLD},.7)`; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + 0.3, q = fr(t * 0.7 + i * 0.13), r = R * (0.96 - 0.4 * q), px = z.x + Math.cos(a) * r, py = z.y + Math.sin(a) * r * 0.92, ia = a + PI;
      c.globalAlpha = f * Math.sin(q * PI) * 0.9; c.moveTo(px + Math.cos(ia - 0.6) * 8, py + Math.sin(ia - 0.6) * 8); c.lineTo(px, py); c.lineTo(px + Math.cos(ia + 0.6) * 8, py + Math.sin(ia + 0.6) * 8);
    }
    c.stroke(); c.restore();
  }

  // ---------------------------------------------------------------- Cleric
  function holyBolt(c, p) {   // the Cleric's bolt: a small bright star with a gold wake
    const n = p.trail.length, pts = p.trail.concat([{ x: p.x, y: p.y }]), t = TN();
    tape(c, pts, 1, 6, 'rgba(255,224,150,.55)', true);
    glow(c, p.x, p.y, 15, '255,235,170', 0.85); G(c, flareSpr(HOLY), p.x, p.y, 20, 20, 1, t * 5, true);
    c.save(); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 2.2, 0, TAU); c.fill(); c.restore(); void n;
  }
  function mend(x, y, cx, cy, rank) {   // a ribbon of green-gold motes runs to the ally, then blooms: leaves rise, a soft cross of light
    const sc = 1 + 0.06 * (rank - 1), dur = 0.34, M = []; for (let i = 0; i < 9; i++) M.push({ o: i / 9, w: rnd(0.6, 1.4), p: rnd(0, TAU) });
    const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    add({ dur: dur + 0.25, layer: 1, draw(c) {
      if (!inView(x, y, 200) && !inView(cx, cy, 80)) return; const k = this.t / dur; c.save(); c.globalCompositeOperation = 'lighter';
      for (const m of M) {
        const q = clamp(k * 1.15 - m.o * 0.25, 0, 1); if (q <= 0 || q >= 1) continue; const wig = Math.sin(q * PI * 3 + m.p) * 16 * Math.sin(q * PI) * m.w, px = lerp(cx, x, eo(q)) + nx * wig, py = lerp(cy, y, eo(q)) + ny * wig - 8 * Math.sin(q * PI);
        c.globalAlpha = 0.9 * Math.sin(q * PI); c.fillStyle = m.o > 0.5 ? '#c8ffd0' : '#fff1b8'; c.beginPath(); c.arc(px, py, 3 + m.w * 1.2, 0, TAU); c.fill(); c.globalAlpha *= 0.4; c.beginPath(); c.arc(px, py, 9, 0, TAU); c.fill();
      }
      c.restore();
    } });
    add({ dur: 1.2, layer: 1, draw(c) {
      if (this.t < dur * 0.8 || !inView(x, y, 80)) return; const k = (this.t - dur * 0.8) / (1.2 - dur * 0.8), f = 1 - k;
      glow(c, x, y, 62 * sc * (0.6 + 0.5 * eo(k)), '150,255,170', 0.7 * f);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = `rgba(210,255,215,${0.9 * f})`; c.lineWidth = 2.4 * f + 0.6; const s = 17 * sc * (0.7 + 0.5 * eo(k * 2));
      c.beginPath(); c.moveTo(x - s, y - 4); c.lineTo(x + s, y - 4); c.moveTo(x, y - 4 - s); c.lineTo(x, y - 4 + s); c.stroke();
      c.fillStyle = `rgba(190,255,200,${0.9})`; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = (10 + 20 * fr(i * 0.37)) * sc, q = fr(k * 1.2 + i * 0.11); c.globalAlpha = Math.sin(q * PI) * f; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + 6 + Math.sin(a) * r * 0.5 - q * 42, 2.4, 1.3, a, 0, TAU); c.fill(); }
      c.restore();
    } });
    ring(x, y + 4, 6, 30 * sc, 0.55, '170,255,190', 2, 0);
  }
  function smite(x, y, rank) {   // light comes down on the target in one hard stroke, with feathers falling after
    const sc = 1 + 0.07 * (rank - 1), dur = 0.75, F = []; for (let i = 0; i < 5; i++) F.push({ x: rnd(-26, 26) * sc, d: rnd(0, 0.25), r: rnd(0, TAU), s: rnd(0.8, 1.2) });
    add({ dur, layer: 1, draw(c) {
      if (!inView(x, y - 200, 260)) return; const k = this.t / dur, up = eo(Math.min(1, this.t / 0.07)), f = k < 0.2 ? 1 : 1 - (k - 0.2) / 0.8, h = 460 * up, w = 40 * sc * (1 - 0.4 * k);
      G(c, shaftSpr(HOLY), x, y - h / 2 + 4, w * 2, h, 0.7 * f, 0, true); G(c, shaftSpr('255,250,235'), x, y - h / 2 + 4, w * 0.7, h, 0.95 * f, 0, true);
      glow(c, x, y, 70 * sc * (1 - 0.3 * k), HOLY, 0.9 * f); G(c, flareSpr(HOLY), x, y, 120 * sc * (0.5 + 0.6 * eo(k * 2)), 120 * sc * (0.5 + 0.6 * eo(k * 2)), Math.max(0, 1 - k * 2.4), k, true);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,244,200,.9)`; for (let i = 0; i < 8; i++) { const q = fr(k * 2 + i / 8), px = x + Math.sin(i * 9.1) * w * 0.55, py = y - q * 120; c.globalAlpha = Math.sin(q * PI) * f; c.beginPath(); c.arc(px, py, 1.6, 0, TAU); c.fill(); } c.restore();
      c.save(); c.fillStyle = 'rgba(255,248,226,.95)'; c.strokeStyle = 'rgba(210,180,110,.7)'; c.lineWidth = 0.6;
      for (const p of F) { const q = (this.t - p.d) / 0.6; if (q <= 0 || q >= 1) continue; c.globalAlpha = Math.sin(q * PI) * 0.95; c.save(); c.translate(x + p.x + Math.sin(q * 6 + p.r) * 7, y - 70 * (1 - q) - 6); c.rotate(p.r + q * 3); c.beginPath(); c.ellipse(0, 0, 5.5 * p.s, 1.9 * p.s, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
      c.restore();
    } });
    ring(x, y, 8, 52 * sc, 0.4, '255,246,214', 3, 0); ground(x, y, '255,236,170', 52 * sc, 0.7, 1.2); K.burst(x, y, 7, { color: '#fff1b8', spd: 110, dur: 0.5, size: 2.2, kind: 'spark' });
  }
  function smiteHeal(x, y, rad) {   // the splash: a soft gold ring reaches out and allies in it are touched
    add({ dur: 0.7, layer: 0, draw(c) {
      if (!inView(x, y, rad)) return; const k = this.t / 0.7, e = eo(k), f = 1 - k; c.save(); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(255,236,170,${0.8 * f})`; c.lineWidth = 3 * f + 0.6; c.beginPath(); c.ellipse(x, y, rad * e, rad * e * 0.92, 0, 0, TAU); c.stroke();
      c.fillStyle = `rgba(255,236,170,${0.1 * f})`; c.fill(); c.restore();
    } });
  }
  function sanctumCast(x, y) {   // the ground is consecrated: pillars of light stand up round its rim, then settle into the zone
    add({ dur: 0.7, layer: 1, draw(c) {
      if (!inView(x, y, 160)) return; const k = this.t / 0.7, f = 1 - k;
      glow(c, x, y, 60 + 40 * eo(k), HOLY, 0.7 * f);
    } });
    flare(x, y, 100, HOLY, 0.4);
  }
  function sanctRim(x, y, R) {   // eight short shafts on the rim at the moment of casting
    add({ dur: 0.7, layer: 1, draw(c) {
      if (!inView(x, y, R * 1.2)) return; const k = this.t / 0.7, up = eo(Math.min(1, k * 4)), f = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7, h = 90 * up;
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8, px = x + Math.cos(a) * R * 0.95, py = y + Math.sin(a) * R * 0.95 * 0.92; G(c, shaftSpr(HOLY), px, py - h / 2, 18, h, 0.65 * f, 0, true); }
    } });
  }
  function sanctZone(c, z) {
    const t = TN(), age = t - z.seen, left = zleft(z), R = z.a, k = eo(age / 0.5), f = left < 0.6 ? left / 0.6 : 1, Rr = R * k;
    if (!inView(z.x, z.y, R)) return;
    c.save(); c.globalAlpha = f; glow(c, z.x, z.y, Rr * 1.08, '255,225,140', 0.3);
    K.ell(c, z.x, z.y, Rr, Rr * 0.96, 0, 'rgba(255,236,170,.09)', 'rgba(255,236,170,.85)', 2.4);
    K.ell(c, z.x, z.y, Rr * 0.93, Rr * 0.89, 0, null, 'rgba(255,236,170,.3)', 1);
    G(c, runeSpr('255,236,170'), z.x, z.y, Rr * 2.05, Rr * 2.05, 0.5, t * 0.3, true);
    G(c, runeSpr('255,236,170'), z.x, z.y, Rr * 1.1, Rr * 1.1, 0.35, -t * 0.7, true);
    const q = (t % 2) / 2; c.strokeStyle = `rgba(255,240,190,${0.4 * (1 - q)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(z.x, z.y, Rr * (0.15 + 0.85 * q), Rr * (0.15 + 0.85 * q) * 0.95, 0, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,244,205,.95)';
    for (let i = 0; i < 12; i++) { const ph = fr(t * 0.35 + i / 12), a = i * 2.4 + i * i * 0.1, rr = Rr * (0.2 + 0.75 * fr(i * 0.618)); c.globalAlpha = f * Math.sin(ph * PI) * 0.8; c.beginPath(); c.arc(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.92 - ph * 48, 1.7, 0, TAU); c.fill(); }
    c.restore();
  }
  function dawn(x, y, R) {   // the big one: a pillar of morning from the sky, rays across the ground, rings, a rain of motes and feathers
    const dur = 2.4, F = [], Mo = [];
    for (let i = 0; i < 10; i++) F.push({ a: rnd(0, TAU), d: Math.sqrt(Math.random()) * R * 0.9, p: rnd(0, 0.5), r: rnd(0, TAU) });
    for (let i = 0; i < 34; i++) Mo.push({ a: rnd(0, TAU), d: Math.sqrt(Math.random()) * R, s: rnd(0.6, 1.4), o: Math.random() });
    add({ dur, layer: 1, draw(c) {
      if (!inView(x, y - 300, R * 1.6 + 200)) return; const t = this.t, k = t / dur, up = eo(Math.min(1, t / 0.12)), f = k < 0.25 ? 1 : Math.max(0, 1 - (k - 0.25) / 0.75), h = 900 * up;
      G(c, shaftSpr(HOLY), x, y - h / 2 + 8, R * 1.15, h, 0.62 * f, 0, true); G(c, shaftSpr('255,250,235'), x, y - h / 2 + 8, R * 0.26 * (1 - 0.3 * k), h, 0.8 * f, 0, true);
      glow(c, x, y, R * 1.0, HOLY, 0.5 * f); glow(c, x, y, R * 0.4, '255,255,255', 0.28 * f * (1 - k));
      G(c, flareSpr(HOLY), x, y, R * 1.7 * (0.5 + 0.5 * eo(k * 3)), R * 1.7 * (0.5 + 0.5 * eo(k * 3)), Math.max(0, 1 - k * 3) * 0.6, 0.3, true);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,244,205,.95)';
      for (const m of Mo) { const q = fr(k * 1.2 * m.s + m.o); c.globalAlpha = f * Math.sin(q * PI) * 0.85; c.beginPath(); c.arc(x + Math.cos(m.a) * m.d, y + Math.sin(m.a) * m.d * 0.9 - q * 150, 1.9, 0, TAU); c.fill(); }
      c.restore();
      c.save(); c.fillStyle = 'rgba(255,248,226,.95)'; c.strokeStyle = 'rgba(210,180,110,.6)'; c.lineWidth = 0.6;
      for (const p of F) { const q = (k - p.p) / 0.5; if (q <= 0 || q >= 1) continue; c.globalAlpha = Math.sin(q * PI) * 0.95; c.save(); c.translate(x + Math.cos(p.a) * p.d + Math.sin(q * 5 + p.r) * 9, y + Math.sin(p.a) * p.d * 0.9 - 150 * (1 - q)); c.rotate(p.r + q * 4); c.beginPath(); c.ellipse(0, 0, 7, 2.4, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
      c.restore();
    } });
    add({ dur: 2.2, layer: 0, draw(c) {
      if (!inView(x, y, R * 1.6) || !K.visAt(x, y, R)) return; const k = this.t / 2.2, f = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7, s = R * 2.2;
      G(c, raysSpr(HOLY), x, y, R * 2.9 * (0.6 + 0.4 * eo(k * 3)), R * 2.9 * (0.6 + 0.4 * eo(k * 3)), 0.55 * f, k * 0.8, true);
      G(c, runeSpr('255,236,170'), x, y, s, s, 0.8 * f, k * 1.3, true); G(c, runeSpr('255,236,170'), x, y, s * 0.55, s * 0.55, 0.6 * f, -k * 2, true);
    } });
    ring(x, y, 10, R * 1.25, 1.0, HOLY, 5, 0); ring(x, y, 6, R * 0.9, 0.7, '255,255,255', 3, 0); ring(x, y, 4, R * 0.55, 0.5, HOLY, 2, 0);
    bloom(x, y, 0.2, '255,242,205'); K.shake(3, 0.3);
  }
  function raise(x, y) {   // a hero stands up out of the light
    add({ dur: 1.1, layer: 1, draw(c) {
      if (!inView(x, y - 80, 140)) return; const k = this.t / 1.1, f = 1 - k;
      G(c, shaftSpr(HOLY), x, y - 70 + 8, 56 * (1 - 0.3 * k), 140, 0.85 * f, 0, true); glow(c, x, y, 50 * (0.7 + 0.4 * k), HOLY, 0.8 * f);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,246,210,.95)'; for (let i = 0; i < 10; i++) { const q = fr(k * 1.3 + i * 0.1); c.globalAlpha = f * Math.sin(q * PI); c.beginPath(); c.arc(x + Math.sin(i * 7) * 22, y + 6 - q * 70, 1.8, 0, TAU); c.fill(); } c.restore();
    } });
    ring(x, y, 6, 56, 0.7, HOLY, 3, 0); flare(x, y, 70, HOLY, 0.35);
  }

  // ---------------------------------------------------------------- Pyromancer
  function fireball(c, p) {   // hot white core, orange body, a smoky dark edge, and a long tapered tail that bends with the flight
    const pts = p.trail.concat([{ x: p.x, y: p.y }]), s = p.sz, t = TN();
    tape(c, pts, 1, s * 2.2, 'rgba(70,26,14,.4)', false); tape(c, pts, 1, s * 1.7, 'rgba(255,92,24,.5)', true); tape(c, pts, 1, s * 1.05, 'rgba(255,214,110,.75)', true);
    glow(c, p.x, p.y, s * 3.4, '255,150,60', 0.85); G(c, fireSpr(), p.x, p.y, s * 3.2, s * 3.2, 1, t * 6 + p.x * 0.01);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,248,214,.95)'; c.beginPath(); c.arc(p.x, p.y, s * 0.42 * (0.9 + 0.1 * Math.sin(t * 40)), 0, TAU); c.fill(); c.restore();
    if (s > 13) G(c, flareSpr(FIRE), p.x, p.y, s * 5, s * 5, 0.7, t * 3, true);
  }
  function emberBolt(c, p) {
    const pts = p.trail.concat([{ x: p.x, y: p.y }]); tape(c, pts, 1, 7, 'rgba(255,100,28,.55)', true); tape(c, pts, 1, 3.4, 'rgba(255,224,130,.8)', true);
    glow(c, p.x, p.y, 13, '255,150,60', 0.8); G(c, fireSpr(), p.x, p.y, 13, 13, 1, TN() * 7); c.save(); c.fillStyle = '#fff4c8'; c.beginPath(); c.arc(p.x, p.y, 1.9, 0, TAU); c.fill(); c.restore();
  }
  // the burst of a fireball: a white flash, a ring of fire clouds that boil outward, sparks, a shock ring, smoke after and a scorch mark
  function blast(x, y, R, rgb, scorch, opt) {
    opt = opt || {}; const big = R > 80, n = big ? 9 : 7, B = [], sp = specks(big ? 22 : 14, 150, 280, 220, 0.4, 0.75), dur = 0.6;
    for (let i = 0; i < n; i++) B.push({ a: i * TAU / n + rnd(-0.3, 0.3), d: rnd(0.45, 0.8), s: rnd(0.55, 0.85), r: rnd(0, TAU), o: rnd(0, 0.08) });
    add({ dur, layer: 1, draw(c) {
      if (!inView(x, y, R * 1.8) || !K.visAt(x, y, R)) return; const k = this.t / dur, e = eo(k), f = 1 - k, fb = fireSpr();
      G(c, flareSpr(rgb), x, y, R * 2.6 * (0.4 + 0.7 * eo(k * 2)), R * 2.6 * (0.4 + 0.7 * eo(k * 2)), Math.max(0, 1 - k * 2.2), k * 0.5, true);
      glow(c, x, y, R * (0.7 + 0.6 * e), rgb, 0.85 * f);
      G(c, fb, x, y - 3, R * 1.15 * (0.6 + 0.5 * eo(k)), R * 1.15 * (0.6 + 0.5 * eo(k)), 0.9 * (1 - ei(k)), k * 2);
      for (const b of B) { const q = clamp((k - b.o) / (1 - b.o), 0, 1), r = R * b.d * eo(q), sz = R * b.s * (0.7 + 0.7 * Math.sqrt(q)); G(c, fb, x + Math.cos(b.a) * r, y + Math.sin(b.a) * r * 0.9, sz, sz, 0.95 * (1 - ei(q)), b.r + q); }
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,236,180,${f})`; c.lineWidth = 3 * f + 0.6; c.beginPath(); c.ellipse(x, y, R * e * 1.05, R * e * 0.97, 0, 0, TAU); c.stroke(); c.restore();
      drawSpecks(c, sp, x, y, this.t, '255,196,96', true, 8);
    } });
    smokeUp(x, y - 4, big ? 5 : 3, R * 0.9, big ? 1.5 : 1.0, big ? 50 : 34);
    if (scorch) decal(x, y, R * 0.62, big ? 9 : 6, 'scorch');
    if (!opt.quiet) K.burst(x, y, 4, { color: '#ffd27a', spd: 160, dur: 0.5, size: 2.2, kind: 'spark' });
  }
  function erupt(x, y, R) {   // Flame Circle goes off: tongues of fire stand up round the whole ring, a fireball in the middle
    const n = 16, T = []; for (let i = 0; i < n; i++) T.push({ a: i * TAU / n + rnd(-0.1, 0.1), h: rnd(0.7, 1.2), o: rnd(0, 0.12) });
    add({ dur: 0.85, layer: 1, draw(c) {
      if (!inView(x, y, R * 1.6) || !K.visAt(x, y, R)) return; const t = this.t, k = t / 0.85, f = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
      glow(c, x, y, R * 1.1, '255,140,50', 0.5 * f);
      c.save(); c.globalAlpha = f; for (const q of T) { const u = clamp((t - q.o) / 0.22, 0, 1); if (u <= 0) continue; tongue(c, x + Math.cos(q.a) * R * 0.92, y + Math.sin(q.a) * R * 0.85, 16 + R * 0.1, (24 + R * 0.3) * q.h * eo(u), t + q.a, q.a, true); } c.restore();
      G(c, fireSpr(), x, y - 6, R * 1.5 * eo(Math.min(1, k * 2.5)), R * 1.5 * eo(Math.min(1, k * 2.5)), f * 0.95, t * 2);
      G(c, flareSpr(FIRE), x, y, R * 2.4 * (0.5 + 0.6 * eo(k * 2)), R * 2.4 * (0.5 + 0.6 * eo(k * 2)), Math.max(0, 1 - k * 2.2), 0, true);
    } });
    ring(x, y, R * 0.3, R * 1.18, 0.5, '255,200,120', 3.4, 0); smokeUp(x, y, 4, R * 0.8, 1.4, 56); decal(x, y, R * 0.7, 7, 'scorch'); bloom(x, y, 0.1, '255,200,140');
  }
  function fuseZone(c, z) {   // Flame Circle waiting: a sigil that spins faster and runs hot, flames sprouting along the rim as the fuse burns down
    const t = TN(), R = z.a, left = zleft(z), kk = clamp(1 - left / Math.max(0.1, z.b), 0, 1), e = eo(kk);
    if (!inView(z.x, z.y, R * 1.3) || !K.visAt(z.x, z.y, R)) return;
    glow(c, z.x, z.y, R * 1.05, '255,120,30', 0.14 + 0.32 * ei(kk)); K.ell(c, z.x, z.y, R, R * 0.96, 0, `rgba(70,16,4,${0.08 + 0.18 * kk})`, `rgba(255,170,70,${0.55 + 0.45 * kk})`, 2.5);
    G(c, runeSpr('255,150,60'), z.x, z.y, R * 2.1, R * 2.1, 0.45 + 0.45 * kk, t * (0.9 + 2.4 * kk), true);
    K.ell(c, z.x, z.y, R * e, R * e * 0.96, 0, null, 'rgba(255,214,120,.9)', 2);
    const n = 18, hmax = 10 + 26 * ei(kk); c.save(); c.globalAlpha = 0.35 + 0.65 * kk; for (let i = 0; i < n; i++) { const a = i * TAU / n + t * 0.3, h = hmax * (0.7 + 0.3 * Math.sin(t * 11 + i * 2)); tongue(c, z.x + Math.cos(a) * R, z.y + Math.sin(a) * R * 0.94, 8 + 4 * kk, h, t + i, i, kk > 0.6); } c.restore();
  }
  function trailBase(c, z, f) {   // a glowing seam of embers under the flames of Firestep's trail
    const x2 = z.a, y2 = z.b; if (!inView((z.x + x2) / 2, (z.y + y2) / 2, Math.hypot(x2 - z.x, y2 - z.y) / 2 + 40)) return;
    c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(18,8,4,${0.3 * f})`; c.lineWidth = 22; c.beginPath(); c.moveTo(z.x, z.y + 3); c.lineTo(x2, y2 + 3); c.stroke();
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,100,28,${0.32 * f})`; c.lineWidth = 12; c.beginPath(); c.moveTo(z.x, z.y); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = `rgba(255,214,120,${(0.5 + 0.2 * Math.sin(TN() * 9)) * f})`; c.lineWidth = 3; c.stroke(); c.restore();
  }
  function firestep(x, y, cx, cy, rank) {   // a streak of fire from where you stood to where you landed, flares at both ends
    const sc = 1 + 0.05 * (rank - 1), ang = Math.atan2(y - cy, x - cx), L = Math.hypot(x - cx, y - cy), sp = specks(14, 40, 120, -60, 0.4, 0.8, ang + PI, 1.2);
    add({ dur: 0.5, layer: 1, draw(c) {
      if (!inView((x + cx) / 2, (y + cy) / 2, L / 2 + 80)) return; const k = this.t / 0.5, f = 1 - k, w = 20 * sc * f;
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(cx, cy, x, y); g.addColorStop(0, `rgba(255,120,30,0)`); g.addColorStop(0.6, `rgba(255,120,30,${0.55 * f})`); g.addColorStop(1, `rgba(255,236,170,${0.85 * f})`);
      c.fillStyle = g; c.translate(cx, cy); c.rotate(ang); c.beginPath(); c.moveTo(0, -w * 0.15); c.lineTo(L, -w * 0.55); c.lineTo(L + 8, 0); c.lineTo(L, w * 0.55); c.lineTo(0, w * 0.15); c.closePath(); c.fill(); c.restore();
      drawSpecks(c, sp, x, y, this.t, '255,196,96', true, 7);
    } });
    flare(cx, cy, 70 * sc, FIRE, 0.35); flare(x, y, 90 * sc, FIRE, 0.4); ring(x, y, 40 * sc, 10, 0.3, '255,200,120', 2.4, 1);
    add({ dur: 0.9, layer: 1, draw(c) { if (!inView(cx, cy, 60)) return; const k = this.t / 0.9; G(c, smokeSpr(), cx, cy - 10 - 20 * k, 40 + 30 * k, 40 + 30 * k, 0.5 * (1 - k)); } });
  }
  function meteorCast(u, x, y) {   // the call: a pillar of heat from the caster's hands, a flash on the ground where the sky will open
    flare(u.x, u.y - 10, 70, '255,170,70', 0.4);
    add({ dur: 0.5, layer: 1, draw(c) { if (!inView(x, y, 120)) return; const k = this.t / 0.5; glow(c, x, y, 70 * (0.6 + 0.6 * k), '255,150,60', 0.5 * (1 - k)); } });
  }
  function meteorBody(c, z) {
    const left = zleft(z), kk = clamp(1 - left / Math.max(0.1, z.b), 0, 1); if (kk < 0.5) return;
    const f = ei((kk - 0.5) / 0.5), sc = z.a / 120, ox = 190 * sc, oy = 560 * sc, mx = z.x + ox * (1 - f), my = z.y - oy * (1 - f), t = TN();
    if (!inView(mx, my, 300) && !inView(z.x, z.y, 200)) return;
    const pts = []; for (let i = 0; i < 14; i++) { const q = Math.max(0, f - (13 - i) * 0.028); pts.push({ x: z.x + ox * (1 - q), y: z.y - oy * (1 - q) }); }
    tape(c, pts, 4, 40 * sc, 'rgba(60,24,14,.42)', false); tape(c, pts, 3, 30 * sc, 'rgba(255,90,24,.5)', true); tape(c, pts, 2, 17 * sc, 'rgba(255,220,120,.8)', true);
    for (let i = 3; i < 14; i += 2) { const q = pts[i]; G(c, fireSpr(), q.x, q.y, (10 + i * 2.2) * sc, (10 + i * 2.2) * sc, 0.5 * (i / 14), t * 5 + i); }
    glow(c, mx, my, 70 * sc, '255,150,60', 0.9); G(c, fireSpr(), mx, my, 56 * sc, 56 * sc, 1, t * 3);
    c.save(); c.translate(mx, my); c.rotate(t * 2); c.fillStyle = '#3c2118'; c.strokeStyle = '#ff9a3a'; c.lineWidth = 2.2; c.beginPath(); const R0 = 15 * sc;
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9, r = R0 * (0.78 + 0.28 * ((i * 7) % 5) / 4); if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#ffd070'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-R0 * 0.5, -R0 * 0.2); c.lineTo(-R0 * 0.1, R0 * 0.1); c.lineTo(R0 * 0.3, -R0 * 0.35); c.moveTo(-R0 * 0.1, R0 * 0.1); c.lineTo(0, R0 * 0.6); c.stroke(); c.restore();
    G(c, flareSpr(FIRE), mx, my, 80 * sc, 80 * sc, 0.55, t * 2, true);
    glow(c, z.x, z.y, z.a * (0.4 + 0.5 * f), '255,140,50', 0.25 * f);
  }
  function meteorGround(c, z) {
    const t = TN(), R = z.a, left = zleft(z), kk = clamp(1 - left / Math.max(0.1, z.b), 0, 1);
    if (!inView(z.x, z.y, R * 1.2)) return;
    K.ell(c, z.x, z.y, R * (0.5 + 0.5 * eo(kk)), R * (0.5 + 0.5 * eo(kk)) * 0.95, 0, `rgba(10,2,0,${0.1 + 0.3 * kk})`);
    glow(c, z.x, z.y, R * (0.4 + 0.6 * kk), '255,110,30', 0.12 + 0.4 * ei(kk));
    G(c, runeSpr('255,150,60'), z.x, z.y, R * 2.1 * eo(Math.min(1, kk * 3)), R * 2.1 * eo(Math.min(1, kk * 3)), 0.35 + 0.55 * kk, t * 0.7, true);
    K.ell(c, z.x, z.y, R, R * 0.96, 0, null, `rgba(255,160,70,${0.45 + 0.5 * kk})`, 2.5);
    K.ell(c, z.x, z.y, R * (1 - kk) + 6, (R * (1 - kk) + 6) * 0.96, 0, null, `rgba(255,236,180,${0.3 + 0.5 * kk})`, 1.6);
  }
  function meteorImpact(x, y, R) {   // the big one: white flash, rings, a boiling cloud, debris, a column of smoke, a cratered floor
    const D = [], sp = specks(34, 200, 420, 360, 0.7, 1.3), B = [];
    for (let i = 0; i < 16; i++) D.push({ a: rnd(0, TAU), v: rnd(120, 300), h: rnd(90, 230), r: rnd(0, TAU), s: rnd(3, 7), w: rnd(-9, 9) });
    for (let i = 0; i < 12; i++) B.push({ a: i * TAU / 12 + rnd(-0.2, 0.2), d: rnd(0.35, 0.85), s: rnd(0.5, 0.9), r: rnd(0, TAU), o: rnd(0, 0.15) });
    add({ dur: 1.5, layer: 1, draw(c) {
      if (!inView(x, y, R * 2) || !K.visAt(x, y, R)) return; const t = this.t, k = t / 1.5, e = eo(Math.min(1, t / 0.5)), fb = fireSpr();
      G(c, flareSpr('255,230,170'), x, y, R * 4.2 * (0.35 + 0.7 * eo(Math.min(1, t / 0.4))), R * 4.2 * (0.35 + 0.7 * eo(Math.min(1, t / 0.4))), Math.max(0, 1 - t / 0.55), 0.2, true);
      glow(c, x, y, R * (1.0 + 0.6 * e), '255,170,70', 0.9 * (1 - k)); if (t < 0.18) glow(c, x, y, R * 1.3, '255,255,255', 1 - t / 0.18);
      for (const b of B) { const q = clamp((t - b.o) / 0.9, 0, 1); if (q <= 0) continue; const r = R * b.d * eo(q), sz = R * b.s * (0.7 + 0.8 * Math.sqrt(q)); G(c, fb, x + Math.cos(b.a) * r, y + Math.sin(b.a) * r * 0.9 - 8 * q, sz, sz, 0.95 * (1 - ei(q)), b.r + q * 1.5); }
      drawSpecks(c, sp, x, y, t, '255,190,90', true, 10);
      c.save(); for (const d of D) { const q = t / 1.0; if (q >= 1) continue; const px = x + Math.cos(d.a) * d.v * q * 0.9, py = y + Math.sin(d.a) * d.v * q * 0.5 - d.h * 4 * q * (1 - q); c.globalAlpha = 1 - ei(q); c.translate(px, py); c.rotate(d.r + d.w * q); c.fillStyle = '#4a3326'; c.fillRect(-d.s * 0.5, -d.s * 0.4, d.s, d.s * 0.8); c.fillStyle = '#ff9a3a'; c.fillRect(-d.s * 0.5, -d.s * 0.4, d.s, 1.4); c.rotate(-d.r - d.w * q); c.translate(-px, -py); }
      c.restore();
    } });
    ring(x, y, 10, R * 1.55, 0.6, '255,206,130', 5, 0); ring(x, y, 6, R * 1.1, 0.4, '255,255,255', 3, 0); ring(x, y, 4, R * 0.7, 0.3, '255,236,170', 2, 0);
    smokeUp(x, y - 6, 7, R * 1.0, 2.4, 110); dustRing(x, y, R * 0.9, 12, 0.9); decal(x, y, R * 0.95, 14, 'lava', 0.7); bloom(x, y, 0.22, '255,226,170');
  }
  function craterZone(c, z, f) {   // the crater the meteor leaves: scorched, cracked and glowing, with smoke rising off it
    const t = TN(), R = z.a; if (!inView(z.x, z.y, R * 1.3) || !K.visAt(z.x, z.y, R)) return;
    G(c, scorchSpr(), z.x, z.y, R * 2.3, R * 2.3, 0.85 * f, z.id);
    G(c, cracksSpr('255,120,30'), z.x, z.y, R * 2.0, R * 2.0, (0.65 + 0.3 * Math.sin(t * 5 + z.id)) * f, z.id, true);
    glow(c, z.x, z.y, R * 0.9, '255,100,30', 0.16 * f);
    c.save(); c.globalAlpha = 0.5 * f; const sp = smokeSpr(); for (let i = 0; i < 3; i++) { const q = fr(t * 0.3 + i / 3 + z.id * 0.1); c.globalAlpha = Math.sin(q * PI) * 0.35 * f; c.drawImage(sp, z.x + Math.sin(i * 5 + z.id) * R * 0.3 - 20 - 12 * q, z.y - 10 - q * 60 - 20, 40 + 40 * q, 40 + 40 * q); } c.restore();
  }
  function burnBase(c, z, f) {
    const R = z.a; if (!inView(z.x, z.y, R)) return; K.ell(c, z.x, z.y, R, R * 0.9, 0, `rgba(20,8,4,${0.28 * f})`, `rgba(255,120,40,${0.4 * f})`, 1.5); glow(c, z.x, z.y, R * 1.1, '255,110,30', 0.2 * f);
  }

  // ---------------------------------------------------------------- Ranger
  function arrow(c, p) {   // a shaft with fletching, a gold head, and the wind rings and white streak of a fast arrow
    const z = p.arc ? Math.sin(clamp(p.prog || 0, 0, 1) * PI) * 16 : 0, a = p.ang || 0, ca = Math.cos(a), sa = Math.sin(a), hx = p.x, hy = p.y - z;
    const pts = p.trail.map(q => ({ x: q.x, y: q.y - z * 0.6 })); pts.push({ x: hx, y: hy }); tape(c, pts, 0.5, 4, 'rgba(255,255,255,.4)', true);
    K.ell(c, p.x, p.y + 3, 3, 1.6, 0, 'rgba(0,0,0,.3)');
    c.save(); c.translate(hx, hy); c.rotate(a); c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; for (let i = 1; i <= 2; i++) { c.beginPath(); c.ellipse(-4 - i * 5, 0, 1.5, 3.4 + i * 0.5, 0, 0, TAU); c.stroke(); }
    c.strokeStyle = '#d9cfae'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-14, 0); c.lineTo(3, 0); c.stroke();
    c.fillStyle = '#9ad07a'; c.beginPath(); c.moveTo(-14, 0); c.lineTo(-17, -3); c.lineTo(-10, -0.5); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-14, 0); c.lineTo(-17, 3); c.lineTo(-10, 0.5); c.closePath(); c.fill();
    c.fillStyle = '#ffe9a8'; c.beginPath(); c.moveTo(7, 0); c.lineTo(2, -2.4); c.lineTo(2, 2.4); c.closePath(); c.fill(); c.restore();
    glow(c, hx, hy, 7, ARROW, 0.45); void ca; void sa;
  }
  function arrowHit(x, y, ang) {   // a puff of dust and a few splinters
    K.burst(x, y, 3, { color: '#a89878', spd: 60, dur: 0.35, size: 2.4, kind: 'dust' }); K.burst(x, y, 4, { ang: ang + PI, spread: 1, color: '#fff4d0', spd: 120, dur: 0.25, size: 1.8, kind: 'spark' });
    flare(x, y, 22, ARROW, 0.15);
  }
  // a long arrow of light and the air it tears: a helix of white around a gold core; the shaft sweeps across, the twist hangs a moment
  function beam(x1, y1, x2, y2, w, rank, rgb) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx), dur = 0.42, nn = Math.max(16, Math.min(60, Math.round(L / 9)));
    add({ dur, layer: 1, draw(c) {
      if (!inView((x1 + x2) / 2, (y1 + y2) / 2, L / 2 + 40)) return; const k = this.t / dur, head = Math.min(1, this.t / 0.1), tail = clamp((this.t - 0.05) / 0.25, 0, 1), f = 1 - k;
      c.save(); c.translate(x1, y1); c.rotate(ang); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      const a0 = L * tail, a1 = L * head;
      const g = c.createLinearGradient(a0, 0, a1, 0); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${0.55 * f})`); c.strokeStyle = g; c.lineWidth = w * 2.4 * f + 1; c.beginPath(); c.moveTo(a0, 0); c.lineTo(a1, 0); c.stroke();
      c.strokeStyle = `rgba(255,252,236,${0.95 * f})`; c.lineWidth = w * 0.55 * f + 0.6; c.beginPath(); c.moveTo(a0, 0); c.lineTo(a1, 0); c.stroke();
      for (let s = 0; s < 2; s++) { c.strokeStyle = `rgba(255,255,255,${0.7 * f})`; c.lineWidth = 1.3; c.beginPath(); for (let i = 0; i <= nn; i++) { const q = i / nn, px = lerp(a0, a1, q), amp = w * 1.3 * Math.sin(q * PI) * (1 - 0.4 * k), py = Math.sin(px * 0.075 - this.t * 28 + s * PI) * amp; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); }
      c.restore();
      if (head > 0 && head < 1) glow(c, x1 + dx * head, y1 + dy * head, 16 + w, rgb, 0.9);
    } });
    flare(x1, y1, 38 + w * 2, rgb, 0.2); flare(x2, y2, 26 + w * 2, rgb, 0.3);
  }
  function trapSet(x, y, R) {   // the trap bites down: a puff, a glint, and its range ring pulses once
    K.burst(x, y, 5, { color: '#a89878', spd: 55, dur: 0.4, size: 2.8, kind: 'dust' }); ring(x, y, 4, 26, 0.35, '210,235,170', 2, 0); flare(x, y, 30, ARROW, 0.2);
    void R;
  }
  function trapBurst(x, y, R) {   // spikes thrown out in all directions, a dust ring, a leaf-green shock that is the slow, a white-gold flash
    const S = [], n = 12; for (let i = 0; i < n; i++) S.push({ a: i * TAU / n + rnd(-0.15, 0.15), l: rnd(0.55, 1), r: rnd(0, 1) });
    add({ dur: 0.6, layer: 1, draw(c) {
      if (!inView(x, y, R * 1.4) || !K.visAt(x, y, R)) return; const k = this.t / 0.6, f = 1 - k, e = eo(k);
      G(c, flareSpr(ARROW), x, y, R * 2.1 * (0.4 + 0.7 * eo(k * 2)), R * 2.1 * (0.4 + 0.7 * eo(k * 2)), Math.max(0, 1 - k * 2), 0.3, true); glow(c, x, y, R * (0.6 + 0.5 * e), '255,210,110', 0.7 * f);
      c.save(); c.lineCap = 'round'; for (const s of S) { const d = R * 0.95 * s.l * e, L = 16 + 12 * s.r; c.strokeStyle = `rgba(214,206,186,${f})`; c.lineWidth = 3 * f + 0.5; c.beginPath(); c.moveTo(x + Math.cos(s.a) * Math.max(0, d - L), y + Math.sin(s.a) * Math.max(0, d - L) * 0.92); c.lineTo(x + Math.cos(s.a) * d, y + Math.sin(s.a) * d * 0.92); c.stroke(); } c.restore();
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${LEAF},${0.8 * f})`; c.lineWidth = 3 * f + 0.6; c.beginPath(); c.ellipse(x, y, R * e, R * e * 0.94, 0, 0, TAU); c.stroke(); c.restore();
    } });
    dustRing(x, y, R * 0.6, 8, 0.6); K.shake(2, 0.16); smokeUp(x, y, 2, R * 0.6, 0.9, 30); decal(x, y, R * 0.45, 5, 'scorch');
  }
  function markCast(x, y, cx, cy) {   // a gold glint runs to the target, then a reticle closes on it
    add({ dur: 0.18, layer: 1, draw(c) { if (!inView(x, y, 200)) return; const k = this.t / 0.18, px = lerp(cx, x, eo(k)), py = lerp(cy, y, eo(k)); glow(c, px, py, 14, ARROW, 0.9 * (1 - k * 0.4)); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${ARROW},.7)`; c.lineWidth = 2; c.beginPath(); c.moveTo(lerp(cx, x, Math.max(0, eo(k) - 0.3)), lerp(cy, y, Math.max(0, eo(k) - 0.3))); c.lineTo(px, py); c.stroke(); c.restore(); } });
    add({ dur: 0.6, layer: 1, draw(c) {
      if (!inView(x, y, 80)) return; const k = this.t / 0.6, q = eo(Math.min(1, k * 2.4)), r = lerp(52, 18, q), f = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${ARROW},${0.9 * f})`; c.lineWidth = 2; c.translate(x, y); c.rotate((1 - q) * 1.4); c.lineCap = 'round';
      for (let i = 0; i < 4; i++) { c.rotate(PI / 2); c.beginPath(); c.moveTo(r + 8, 0); c.lineTo(r, 0); c.stroke(); c.beginPath(); c.arc(0, 0, r, -0.4, 0.4); c.stroke(); }
      c.restore(); glow(c, x, y, 30, ARROW, 0.35 * f);
    } });
  }
  function markReticle(c, u, t) {   // the standing sign of a mark on an enemy: a slow gold reticle on the ground under it
    const r = (u.def ? u.def.r : 14) + 10; c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,226,150,.7)'; c.lineWidth = 1.6; c.lineCap = 'round'; c.translate(u.x, u.y + 6); c.scale(1, 0.62); c.rotate(t * 0.9);
    for (let i = 0; i < 4; i++) { c.rotate(PI / 2); c.beginPath(); c.arc(0, 0, r, -0.35, 0.35); c.stroke(); c.beginPath(); c.moveTo(r + 5, 0); c.lineTo(r - 2, 0); c.stroke(); }
    c.restore();
  }
  function volleyZone(c, z) {   // Starfall's field: a gold-green sigil and a faint curtain of light round its edge that the arrows fall inside
    const t = TN(), R = z.a, left = zleft(z), age = t - z.seen, f = left < 0.6 ? left / 0.6 : eo(Math.min(1, age / 0.4)); if (!inView(z.x, z.y, R * 1.2)) return;
    K.ell(c, z.x, z.y, R, R, 0, `rgba(255,235,160,${0.05 * f})`, `rgba(255,235,160,${0.5 * f})`, 2);
    G(c, runeSpr('255,226,150'), z.x, z.y, R * 2.1, R * 2.1, 0.5 * f, -t * 0.4, true);
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    const sh = shaftSpr(ARROW); c.globalAlpha = 0.5 * f; for (let i = 0; i < 14; i++) { const a = i * TAU / 14, h = 48 + 24 * Math.sin(t * 2 + i * 1.7), px = z.x + Math.cos(a) * R, py = z.y + Math.sin(a) * R; c.drawImage(sh, px - 4, py - h, 8, h); }
    c.restore();
  }
  function volleyArrows(c, V) {   // each arrow is a falling streak with a bright head; where it lands a small flare, a ring and the shaft stuck in the ground
    const fl = flareSpr(ARROW);
    for (const a of V) {
      if (a.t > 0.68 || !inView(a.x, a.y - 100, 400)) continue; const k = a.t / 0.4;
      if (!a.done) {
        const f2 = ei(k), ay = a.y - 400 * (1 - f2), ax = a.x + 70 * (1 - f2), L = 100 + 60 * f2;
        K.ell(c, a.x, a.y, 7 * k, 4 * k, 0, 'rgba(255,235,160,.3)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineWidth = 3.2; for (let i = 0; i < 3; i++) { const q0 = i / 3, q1 = (i + 1) / 3; c.strokeStyle = `rgba(255,240,196,${0.18 + 0.8 * q1 * q1})`; c.beginPath(); c.moveTo(ax + L * 0.17 * (1 - q0), ay - L * (1 - q0)); c.lineTo(ax + L * 0.17 * (1 - q1), ay - L * (1 - q1)); c.stroke(); } c.restore();
        glow(c, ax, ay, 14, ARROW, 1); G(c, fl, ax, ay, 22, 22, 0.8, 0, true);
      } else {
        const q = (a.t - 0.4) / 0.28, f = 1 - q; G(c, fl, a.x, a.y, 34 * (0.4 + q * 0.8), 34 * (0.4 + q * 0.8), f, 0, true);
        c.save(); c.strokeStyle = `rgba(255,240,190,${0.8 * f})`; c.lineWidth = 1.4; c.beginPath(); c.ellipse(a.x, a.y, 4 + 18 * eo(q), (4 + 18 * eo(q)) * 0.9, 0, 0, TAU); c.stroke();
        c.strokeStyle = `rgba(226,214,176,${f})`; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + 1.5, a.y - 11 * (1 - q * 0.3)); c.stroke(); c.restore();
      }
    }
  }

  // ---------------------------------------------------------------- the entry points client.js calls
  function release(u, slot, x, y, cx, cy, rank) {
    const h = u.hero;
    if (h === 'bastion') {
      if (slot === 0) { if (rank === 9) { K.fxRing(x, y, 6, 38, 0.35, '255,235,170', 3, 1); K.burst(x, y, 6, { color: '#ffe9a8', spd: 120, dur: 0.4, size: 2.2, kind: 'spark' }); flare(x, y, 40, GOLD, 0.25); } else bash(x, y, cx, cy, rank); K.shake(2.5, 0.18); }
      else if (slot === 1) { banner(x, y, cx, cy, rank); K.shake(2, 0.15); }
      else if (slot === 2) brace(u, rank);
      else if (slot === 3) { const ang = Math.atan2(y - cy, x - cx) + PI / 2, len = [270, 330, 390][rk3(rank, 3)]; wallRise(x, y, ang, len, rank); K.shake(4, 0.3); }
    } else if (h === 'cleric') {
      if (slot === 0) { mend(x, y, cx, cy, rank); K.burst(x, y, 4, { color: Math.random() < 0.5 ? '#ffd9a0' : '#bff2c4', spd: 40, dur: 1.1, size: 3, kind: 'petal', vy: -35, g: -12 }); }
      else if (slot === 1) { smite(x, y, rank); K.shake(1.5, 0.12); }
      else if (slot === 2) { sanctumCast(x, y); sanctRim(x, y, [80, 100, 120, 135, 150][rk3(rank, 5)]); ground(x, y, '255,236,170', [80, 100, 120, 135, 150][rk3(rank, 5)], 0.8, 0.5); }
      else if (slot === 3) { flare(x, y, 160, HOLY, 0.45); }
    } else if (h === 'pyromancer') {
      if (slot === 0) { flare(cx, cy, 36, FIRE, 0.2); }
      else if (slot === 1) { flare(u.x, u.y, 50, FIRE, 0.25); }
      else if (slot === 2) firestep(x, y, cx, cy, rank);
      else if (slot === 3) meteorCast(u, x, y);
    } else if (h === 'ranger') {
      if (slot === 0) { const w = 7 + 1.2 * (rank - 1); beam(x, y, cx, cy, w, rank, ARROW); K.shake(1.5, 0.1); }
      else if (slot === 1) trapSet(x, y);
      else if (slot === 2) markCast(x, y, cx, cy);
      else if (slot === 3) { flare(cx, cy, 80, ARROW, 0.35); ring(x, y, 20, 80, 0.5, ARROW, 2, 0); }
    }
  }
  function impact(hero, slot, x, y, rad, mine) {
    if (hero === 'pyromancer') {
      if (slot === 0) { blast(x, y, rad, FIRE, rad > 40); if (rad > 80) ring(x, y, 10, rad * 1.3, 0.4, '255,230,160', 3, 1); K.shake(rad > 80 ? 5 : 3, 0.2); }
      else if (slot === 1) { erupt(x, y, rad); K.shake(3, 0.22); }
      else if (slot === 2) blast(x, y, rad, FIRE, false);
      else if (slot === 3) { meteorImpact(x, y, rad); K.shake(rad > 100 ? 9 : 4, 0.5); }
    } else if (hero === 'bastion') collapse(x, y, rad);
    else if (hero === 'cleric') { if (slot === 1) smiteHeal(x, y, rad); else if (slot === 3) dawn(x, y, rad); }
    else if (hero === 'ranger') trapBurst(x, y, rad);
    void mine;
  }
  function init(kit) { K = kit; warm(); }

  return {
    init, cast, release, impact, raise, wallEnd,
    autoSlash: arcSlash, holyBolt, emberBolt, arrow, arrowHit, fireball,
    zone: { sanct: sanctZone, fuse: fuseZone, trailBase, craterZone, burnBase, meteorGround, meteorBody, volleyZone, volleyArrows, bannerGround, wallStand, banPole },
    markReticle, flareAt: flare, ground, beam,
  };
})();
