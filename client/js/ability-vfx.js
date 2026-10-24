// What every ability looks like. One recipe per class skill, built from VFX's building blocks.
// recipe(c) gets c = { ent, x, y (caster), tx, ty (where it lands), tent (the ally it lands on, if any), ang (facing), later(delay, fn) }.
// Spammed GCD fillers stay small and quick; cooldowns and big hits get the show.

// ======================================================================= SHARED SHAKE (shared-fx polish)
// Every class block's local `shake` routes here. It respects whose effect it is: a recipe runs under VFX.setScale
// (yours 1, your autos 0.85, a teammate's or a bot's 0.6 / 0.5), so a dimmed effect never moves YOUR camera, and your
// own scale through. src 'boss' (boss-vfx.js) always shakes. Uses FX.addShake(amount, source) when the render
// pipeline provides it, else the old FX.shake max.
function vfxShake(amount, src) {
  if (!(amount > 0) || typeof FX === 'undefined') return;
  const sc = typeof VFX !== 'undefined' && typeof VFX.scale === 'number' ? VFX.scale : 1;
  if (src !== 'boss' && sc < 0.7) return;
  const s = src === 'boss' ? amount : amount * Math.min(1, sc);
  if (typeof FX.addShake === 'function') FX.addShake(s, src || 'mine');
  else FX.shake = Math.max(FX.shake || 0, s);
}

// (QA polish) a lasting floor mark (VFX.sigil / ink / shock... any effect VFX.fx returned) bright for its first `hold`
// seconds, then easing down to `settle` of its strength for the rest of its life, so a boss telegraph under it reads
function vfxLingerSettle(e, settle = 0.32, hold = 0.9) {
  if (!e || typeof e.draw !== 'function') return e;
  const d = e.draw;
  e.draw = (c, p, t, ee) => { const a0 = ee.a; ee.a = a0 * (settle + (1 - settle) * Math.max(0, 1 - t / hold)); try { d(c, p, t, ee); } finally { ee.a = a0; } };
  return e;
}

// OLD_PAINT: pieces for the older seven classes' polish pass (and a few thin moves of the newer ones). Melee moves draw
// their own layered smear and impact on top of VFX.slash; a buff or debuff that lasts leaves a faint marker for its real
// duration, bright for its first moment and then low, so a boss telegraph under it still reads.
const OLD_PAINT = (() => {
  const V = VFX, TAU = Math.PI * 2;
  // a lasting mark's strength: in over 0.12s, `peak` for its first `hold`s easing down to `settle`, out over its last 0.6s
  const markK = (t, dur, peak = 0.9, settle = 0.3, hold = 0.5) => Math.min(1, t / 0.12) * Math.max(0, Math.min(1, (dur - t) / 0.6)) * (settle + (peak - settle) * Math.max(0, 1 - t / hold));
  // draw(c, k, t, fx) every frame for dur seconds (k already carries the remote dimming). Returns the effect: setting
  // fx.cut = true fades it out over 0.3s (a ward broken early, a buff spent); o.tick(p, dt, fx) runs while it lasts.
  // fx.dur can be changed while it runs (a guard a talent held longer: KIT_VFX.braceHold); its fade-out follows
  function linger(dur, layer, draw, o = {}) {
    return V.fx({ dur, layer, tick: o.tick, draw: (c, p, t, e) => {
      if (e.cut && e.cutT == null) e.cutT = t;
      const k = e.a * markK(t, e.dur, o.peak, o.settle, o.hold) * (e.cutT != null ? Math.max(0, 1 - (t - e.cutT) / 0.3) : 1);
      if (k > 0.01) draw(c, k, t, e);
    } });
  }
  // a heavy weapon smear round (x, y) facing ang: an ink band, the coloured body thickening toward its leading edge, a
  // white-hot rim and speed lines trailing it. o: r, span, w (px), color, core, ink, dur, flip, z, flat, lines
  function smear(x, y, ang, o = {}) {
    const r = o.r ?? 70, span = o.span ?? 2.2, W = o.w ?? 18, dur = o.dur ?? 0.3, fl = o.flip ? -1 : 1, z = o.z ?? 12, flat = o.flat ?? 0.82;
    const col = o.color || '#ffffff', core = o.core || '#ffffff', ink = o.ink || '#140a14', nl = o.lines ?? 3;
    const shape = (c, a0, a1, R, Wd) => { c.beginPath();
      for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; c.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
      for (let i = 16; i >= 0; i--) { const q = i / 16, a = a0 + (a1 - a0) * q, th = Wd * Math.pow(q, 0.7) * Math.min(1, (1 - q) * 6 + 0.35); c.lineTo(Math.cos(a) * (R - th), Math.sin(a) * (R - th)); }
      c.closePath(); c.fill(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const sw = easeOut(Math.min(1, p / 0.38)), k = e.a * (1 - Math.max(0, (p - 0.4) / 0.6));
      const lead = -span / 2 + span * sw, back = -span / 2 + span * Math.max(0, (p - 0.2) / 0.8) * 0.9;
      if (lead - back < 0.03 || k < 0.02) return;
      c.save(); c.translate(x, y - z); c.scale(1, flat); c.rotate(ang); c.scale(1, fl);
      c.globalAlpha = 0.4 * k; c.fillStyle = ink; shape(c, back, lead, r * 1.05, W * 1.3);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.8 * k; c.fillStyle = col; shape(c, back, lead, r, W);
      c.globalAlpha = 0.95 * k; c.fillStyle = core; shape(c, back + (lead - back) * 0.3, lead, r * 0.99, W * 0.3);
      c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = 1.6;
      for (let i = 0; i < nl; i++) { const rr = r * (0.6 + i * 0.1), a1 = lead - 0.15 - i * 0.12, a0 = Math.max(back - 0.3, a1 - span * 0.5); if (a1 <= a0) continue; c.globalAlpha = 0.45 * k; c.beginPath(); c.arc(0, 0, rr, a0, a1); c.stroke(); }
      c.restore();
      if (sw < 1) { const a = ang + fl * lead; V.glowAt(c, x + Math.cos(a) * r, y - z + Math.sin(a) * r * flat, 12 + W * 0.6, '#ffffff', 0.8 * k); }
    } });
  }
  // a straight stab of light from (x1, y1) to (x2, y2): a lens that shoots out and thins, ink under, a hot core, two
  // speed lines; o.head puts an arrowhead on its tip (the rogue sheet's Backstab streak)
  function thrust(x1, y1, x2, y2, o = {}) {
    const W = o.w ?? 10, dur = o.dur ?? 0.24, col = o.color || '#ffffff', core = o.core || '#ffffff', ink = o.ink || '#140a14', z = o.z ?? 14;
    const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
    const lens = (c, l0, l1, w) => { c.beginPath(); c.moveTo(l0, 0); c.quadraticCurveTo((l0 + l1) / 2, -w, l1, 0); c.quadraticCurveTo((l0 + l1) / 2, w, l0, 0); c.fill(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const go = easeOut(Math.min(1, p / 0.3)), k = e.a * (1 - Math.max(0, (p - 0.35) / 0.65)), l1 = L * go, l0 = L * Math.max(0, (p - 0.15) / 0.85) * 0.9, w = W * (1 - p * 0.5);
      if (l1 - l0 < 2 || k < 0.02) return;
      c.save(); c.translate(x1, y1 - z); c.rotate(a);
      c.globalAlpha = 0.4 * k; c.fillStyle = ink; lens(c, l0 - 4, l1 + 4, w * 1.4);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.85 * k; c.fillStyle = col; lens(c, l0, l1, w);
      c.globalAlpha = k; c.fillStyle = core; lens(c, l0 + (l1 - l0) * 0.35, l1, w * 0.32);
      if (o.head) { const hs = W * 1.6; c.globalAlpha = 0.95 * k; c.fillStyle = col; c.beginPath(); c.moveTo(l1 + hs * 1.3, 0); c.lineTo(l1 - hs * 0.4, -hs); c.lineTo(l1, 0); c.lineTo(l1 - hs * 0.4, hs); c.closePath(); c.fill();
        c.fillStyle = core; c.beginPath(); c.moveTo(l1 + hs * 1.1, 0); c.lineTo(l1 - hs * 0.1, -hs * 0.35); c.lineTo(l1 - hs * 0.1, hs * 0.35); c.closePath(); c.fill(); }
      c.strokeStyle = col; c.lineWidth = 1.5; c.lineCap = 'round';
      for (const s of [-1, 1]) { const b = l1 - L * 0.2; if (b <= l0) continue; c.globalAlpha = 0.5 * k; c.beginPath(); c.moveTo(Math.max(0, l0 - 20), s * w * 0.95); c.lineTo(b, s * w * 0.95); c.stroke(); }
      c.restore();
    } });
  }
  // a faint rim on the floor that holds for dur: a ring, a finer inner ring, slow-turning ticks; o.style 'hex' adds two
  // triangles, 'runes' six rune marks; o.follow keeps it under an entity
  function rim(x, y, r, col, dur, o = {}) {
    return linger(dur, 'ground', (c, k, t) => {
      const cx = o.follow ? o.follow.x : x, cy = o.follow ? o.follow.y : y, R = r * (0.75 + 0.25 * easeOut(Math.min(1, t / 0.3))), n = o.ticks ?? 16;
      V.neonRing(c, cx, cy, R, col, 2.4, k, 0.78); V.neonRing(c, cx, cy, R * 0.9, col, 1, k * 0.6, 0.78);
      c.save(); c.translate(cx, cy); c.scale(1, 0.78); c.rotate(t * (o.spin ?? 0.15));
      V.neonPath(c, col, 1.4, k * 0.8, () => { for (let i = 0; i < n; i++) { const a = i * TAU / n, r2 = R * (i % 2 ? 0.96 : 1.04); c.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); } });
      if (o.style === 'hex') for (const off of [-Math.PI / 2, Math.PI / 2]) V.neonPath(c, col, 1.2, k * 0.55, () => { for (let i = 0; i <= 3; i++) { const a = off + i * TAU / 3; c.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86); } });
      if (o.style === 'runes') for (let i = 0; i < 6; i++) { const a = i * TAU / 6, px = Math.cos(a) * R * 0.78, py = Math.sin(a) * R * 0.78, s = R * 0.05;
        V.neonPath(c, col, 1.3, k * 0.7, () => { c.moveTo(px - s, py + s); c.lineTo(px, py - s); c.lineTo(px + s, py + s); c.moveTo(px - s * 0.5, py); c.lineTo(px + s * 0.5, py); }); }
      c.restore();
    }, { peak: o.peak ?? 0.9, settle: o.settle ?? 0.28, hold: o.hold ?? 0.6, tick: o.tick });
  }
  // the tanks' taunt (the tank sheet's Iron Chain): heavy iron links thrown out in 0.18s with a head (o.head 'spear' or
  // 'hook') glowing in o.glow, sagging as it flies, holding, then reeled back in
  function chain(sx, sy, tx, ty, o = {}) {
    const L = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx), n = Math.max(5, Math.floor(L / 15)), metal = o.metal || '#9aa0aa', glow = o.glow || '#ffffff';
    V.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, fx) => {
      const reach = p < 0.22 ? easeOut(p / 0.22) : p < 0.55 ? 1 : 1 - easeOut((p - 0.55) / 0.45), k = (p < 0.8 ? 1 : (1 - p) / 0.2) * fx.a, sag = Math.sin(Math.min(1, p / 0.22) * Math.PI) * 12, hx = L * reach;
      if (k < 0.02 || hx < 4) return;
      c.save(); c.translate(sx, sy); c.rotate(ang); c.lineCap = 'round';
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3 * k; c.strokeStyle = glow; c.lineWidth = 12; c.beginPath(); c.moveTo(0, 0); c.lineTo(hx, 0); c.stroke(); c.globalCompositeOperation = 'source-over';
      const link = (i, x, y) => { c.beginPath(); if (i % 2) { c.moveTo(x - 7, y); c.lineTo(x + 7, y); } else c.ellipse(x, y, 9, 5, 0, 0, TAU); c.stroke(); };
      for (let i = 0; i < n; i++) { const x = (i + 0.5) * L / n; if (x > hx - 8) break; const y = -Math.sin(x / hx * Math.PI) * sag;
        c.globalAlpha = k; c.lineWidth = 5; c.strokeStyle = '#141018'; link(i, x, y); c.lineWidth = 2.8; c.strokeStyle = metal; link(i, x, y);
        c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.moveTo(x - 4, y - (i % 2 ? 1 : 3.5)); c.lineTo(x + 3, y - (i % 2 ? 1 : 3.5)); c.stroke(); }
      c.beginPath();
      if (o.head === 'hook') { c.moveTo(hx - 6, -3); c.lineTo(hx + 8, -3); c.quadraticCurveTo(hx + 22, -2, hx + 18, 12); c.lineTo(hx + 12, 6); c.quadraticCurveTo(hx + 13, 2, hx + 6, 3); c.lineTo(hx - 6, 3); }
      else { c.moveTo(hx + 26, 0); c.lineTo(hx - 2, -10); c.lineTo(hx + 5, 0); c.lineTo(hx - 2, 10); }
      c.closePath(); c.globalAlpha = k; c.fillStyle = metal; c.fill(); c.lineWidth = 2; c.strokeStyle = '#141018'; c.stroke();
      V.neonPath(c, glow, 1.4, k, () => { if (o.head === 'hook') { c.moveTo(hx + 8, -3); c.quadraticCurveTo(hx + 22, -2, hx + 18, 12); } else { c.moveTo(hx + 26, 0); c.lineTo(hx - 2, -10); } });
      c.restore();
      V.glowAt(c, sx + Math.cos(ang) * hx, sy + Math.sin(ang) * hx, 22, glow, 0.6 * k);
    } });
  }
  // FX.later that keeps the dimming it was called under (a teammate's 0.6), so a KIT_VFX moment's later beats stay dim
  function later(d, fn) { const s = typeof V.scale === 'number' ? V.scale : 1; FX.later(d, () => { const p = V.scale; V.setScale(s); try { fn(); } finally { V.setScale(typeof p === 'number' ? p : 1); } }); }
  return { markK, linger, smear, thrust, rim, chain, later };
})();

const ABILITY_VFX = (() => {
  const V = VFX;
  // a point d px from the caster toward where the ability lands (a hand, a bow, a blade)
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  // a point part way from the caster (0) to the target (1): floor marks at a boss's feet go here so its sprite doesn't hide them
  const between = (c, f) => ({ x: c.x + (c.tx - c.x) * f, y: c.y + (c.ty - c.y) * f });
  const shake = s => vfxShake(s);
  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), OP = OLD_PAINT;

  // ---- Bastion: steel blue and dawn gold
  const BAST_STEEL = '#7fb2ff', BAST_GOLD = '#ffd65a', BAST_DAWN = '#ffe9a8', BAST_INK = '#0e1a30';
  // Blade Chain's step (0 Strike, 1 Riposte, 2 Judgment), counted per hero the way the kit counts it (back to Strike after 15s)
  // (c.step: the step the kit really made, sent with the cast (kits.js fxStep), so a talent that skips one (Rhythm) never
  // puts the look out of step; the count is only the fallback for a cast that came without it)
  const bastionStep = c => { const e = c.ent, s = e.bastionBlade || (e.bastionBlade = { n: -1, at: -99 }); s.n = c.step != null ? c.step % 3 : FX.now - s.at > 15 ? 0 : (s.n + 1) % 3; s.at = FX.now; return s.n; };
  // Brace: a tower-shield plate held in front for the whole guard (an 80 degree band of steel, a gold rim, the sun boss
  // in its middle, a glint sliding along it); KIT_VFX.perfect sets fx.pb and the plate flares
  function bastionPlate(ent, dur) {
    return OP.linger(dur, 'air', (c, k, t, e) => {
      if (e.pb) { e.pbT = t; e.pb = false; }
      const pb = e.pbT != null ? Math.max(0, 1 - (t - e.pbT) / 0.45) : 0, kk = Math.min(1, k + pb), a = ent.angle || 0, cx = ent.x, cy = ent.y - 14 - (ent.lift || 0);
      // (online-refs pass) the plate snaps out past its rest in 0.06s and settles back by 0.18s: a shield set, not a fade-in
      const R = 40 * (t < 0.06 ? 0.8 + 0.35 * t / 0.06 : 1.15 - 0.15 * easeOut(Math.min(1, (t - 0.06) / 0.12))), half = 0.7, P = (an, r) => [cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.8];
      const arc = (r, a0, a1) => { for (let i = 0; i <= 10; i++) { const [x, y] = P(a0 + (a1 - a0) * i / 10, r); i ? c.lineTo(x, y) : c.moveTo(x, y); } };
      c.beginPath(); arc(R + 8, a - half, a + half); arc(R - 7, a + half, a - half); c.closePath();
      c.globalAlpha = 0.72 * kk; c.fillStyle = '#3a5288'; c.fill(); c.globalAlpha = kk; c.lineWidth = 2.4; c.strokeStyle = BAST_INK; c.stroke(); c.globalAlpha = 1;
      V.neonPath(c, BAST_GOLD, 2.4, kk, () => arc(R + 8, a - half, a + half));
      V.neonPath(c, BAST_STEEL, 1.4, kk * 0.8, () => arc(R - 6, a - half, a + half));
      const [mx, my] = P(a, R + 0.5);
      V.glowAt(c, mx, my, 14 + 34 * pb, BAST_GOLD, 0.55 * kk + 0.6 * pb);
      V.neonPath(c, BAST_DAWN, 1.6, kk, () => { for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2; c.moveTo(mx, my); c.lineTo(mx + Math.cos(q) * 8, my + Math.sin(q) * 8); } });
      for (const s of [-0.5, 0.5]) { const [rx, ry] = P(a + s, R + 0.5); V.glowAt(c, rx, ry, 5, '#ffffff', 0.7 * kk); }
      const [gx, gy] = P(a - half + ((t * 0.7) % 1) * half * 2, R + 6); V.glowAt(c, gx, gy, 9, '#ffffff', 0.55 * kk);
    }, { peak: 1, settle: 0.6, hold: 0.35 });
  }
  // Rally Banner: a war banner on a pole planted where the bastion stood, standing for its 12s (blue cloth, gold trim and
  // star, the cloth waving); it rises out of the floor in 0.25s
  function bastionBanner(bx, by, dur) {
    OP.linger(dur, 'air', (c, k, t) => {
      const H = 76 * easeOut(Math.min(1, t / 0.25)), top = by - H, wave = q => Math.sin(t * 3 - q * 3) * 3.5 * q;
      c.globalAlpha = 0.35 * k; c.fillStyle = '#000'; c.beginPath(); c.ellipse(bx, by, 10, 4, 0, 0, TAU); c.fill();
      c.lineCap = 'round'; c.globalAlpha = k;
      const pole = (w, col) => { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, top - 4); c.moveTo(bx - 17, top + 3); c.lineTo(bx + 17, top + 3); c.stroke(); };
      pole(5, BAST_INK); pole(2.6, '#a07a40');
      const L = bx - 15, Rr = bx + 15, T = top + 4, B = top + 46;
      c.beginPath(); c.moveTo(L, T);
      for (let i = 1; i <= 6; i++) { const q = i / 6; c.lineTo(L + wave(q), T + (B - T) * q); }
      c.lineTo(bx + wave(0.8), B - 9); c.lineTo(Rr + wave(1), B);
      for (let i = 5; i >= 0; i--) { const q = i / 6; c.lineTo(Rr + wave(q), T + (B - T) * q); }
      c.closePath(); c.fillStyle = '#2c4f9a'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = BAST_INK; c.stroke();
      c.globalAlpha = 0.9 * k; c.lineWidth = 1.2; c.strokeStyle = BAST_GOLD; c.beginPath(); c.moveTo(L + 3 + wave(0.9), B - 6); c.lineTo(bx + wave(0.75), B - 14); c.lineTo(Rr - 3 + wave(0.9), B - 6); c.stroke();
      const sx = bx + wave(0.45), sy = T + 18;
      c.fillStyle = BAST_GOLD; c.beginPath(); for (let i = 0; i < 8; i++) { const q = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 2.6 : 7.5; c.lineTo(sx + Math.cos(q) * r, sy + Math.sin(q) * r); } c.closePath(); c.fill();
      c.globalAlpha = 1;
      V.glowAt(c, bx, top - 6, 14, BAST_GOLD, 0.7 * k); V.glowAt(c, bx, top - 6, 4, '#ffffff', k); V.glowAt(c, sx, sy, 12, BAST_GOLD, 0.35 * k);
    }, { peak: 1, settle: 0.85, hold: 0.4, tick: () => { if (Math.random() < 0.05) V.spawn({ x: bx + rnd(-14, 14), y: by, z: rnd(30, 60), vz: rnd(10, 30), life: 1, size: rnd(4, 7), size1: 0, color: BAST_GOLD, kind: 'star' }); } });
  }
  // Bulwark / Zealous Guard: a faint dome of hex plates over the hero for the guard's 10s (outline-led, so the floor reads)
  function bastionDome(ent, dur, col) {
    OP.linger(dur, 'air', (c, k, t) => {
      const x = ent.x, y = ent.y + 4, r = 48, H = 56 * easeOut(Math.min(1, t / 0.2));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(x, y - H, x, y); g.addColorStop(0, `rgba(255,255,255,${0.12 * k})`); g.addColorStop(1, `rgba(140,180,255,${0.1 * k})`);
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, H, 0, Math.PI, 0); c.fill(); c.restore();
      V.neonPath(c, col, 1.8, k, () => c.ellipse(x, y, r, H, 0, Math.PI, 0));
      V.neonPath(c, col, 1.1, k * 0.7, () => c.ellipse(x, y, r, r * 0.45, 0, 0, TAU));
      for (let row = 0; row < 2; row++) for (let i = -2; i <= 2; i++) {
        const hx = x + i * 15 + (row ? 7.5 : 0), hy = y - H * (0.38 + row * 0.3); if (Math.abs(hx - x) > r * (0.75 - row * 0.25)) continue;
        const sh = 0.35 + 0.65 * Math.max(0, Math.sin(t * 3 + i * 1.3 + row * 2));
        V.neonPath(c, col, 1, k * 0.55 * sh, () => { for (let j = 0; j <= 6; j++) { const q = j * Math.PI / 3; c.lineTo(hx + Math.cos(q) * 6.5, hy + Math.sin(q) * 5.5); } });
      }
      V.glowAt(c, x + Math.cos(t * 1.7) * r * 0.55, y - H * 0.62, 10, '#ffffff', 0.5 * k);
    }, { peak: 0.95, settle: 0.4, hold: 0.7 });
  }
  // (online-refs pass: WoW Judgment / FF14 Royal Authority) Judgment's verdict: a sword of light drops point first onto
  // (x, y) in about 0.12s, holds a beat with a flare at its tip, then thins out and is gone by 0.42s
  function bastionVerdict(x, y, s = 1) {
    V.fx({ dur: 0.42, layer: 'air', draw: (c, p, t, e) => {
      const drop = Math.min(1, t / 0.12), land = drop * drop, out = Math.max(0, (t - 0.22) / 0.2), k = e.a * (1 - out), L = 64 * s, W = 7 * s * (1 - out * 0.6);
      if (k < 0.02) return;
      const tipY = y - 8 - (1 - land) * 150, top = tipY - L;
      const blade = (w, l0) => { c.beginPath(); c.moveTo(x, tipY); c.lineTo(x - w, tipY - L * 0.22); c.lineTo(x - w, top + l0); c.lineTo(x + w, top + l0); c.lineTo(x + w, tipY - L * 0.22); c.closePath(); c.fill(); };
      c.globalAlpha = 0.5 * k; c.fillStyle = BAST_INK; blade(W + 2.5, -3);
      c.save(); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.9 * k; c.fillStyle = '#ffc840'; blade(W, 0);
      c.globalAlpha = k; c.fillStyle = '#fffbe0'; blade(W * 0.35, L * 0.1);
      c.restore();
      c.globalAlpha = k; c.lineCap = 'round'; c.strokeStyle = BAST_INK; c.lineWidth = 5 * s; c.beginPath(); c.moveTo(x - 15 * s, top + 2); c.lineTo(x + 15 * s, top + 2); c.stroke();
      c.strokeStyle = BAST_GOLD; c.lineWidth = 2.6 * s; c.stroke(); c.globalAlpha = 1;
      V.glowAt(c, x, top - 6 * s, 7 * s, '#ffffff', 0.8 * k);
      if (drop < 1) { V.neonPath(c, BAST_DAWN, 1.4, 0.6 * k, () => { for (const o of [-1, 1]) { c.moveTo(x + o * W * 1.6, top - 30); c.lineTo(x + o * W * 1.6, tipY - L * 0.3); } }); }
      else V.glowAt(c, x, tipY, 22 * s * (1 - out * 0.5), BAST_GOLD, 0.8 * k);
    } });
  }
  // (online-refs pass: FF14 Holy Spirit) a cross of light standing on (x, y): a tall lens and a short one, opening in
  // 0.08s and gone by 0.32s
  function bastionCross(x, y, s = 1) {
    V.fx({ dur: 0.32, layer: 'air', draw: (c, p, t, e) => {
      const o = easeOut(Math.min(1, p / 0.25)), k = e.a * (1 - Math.max(0, (p - 0.3) / 0.7)), cy = y - 26 * s;
      if (k < 0.02) return;
      const lens = (dx, dy, w, h) => { c.beginPath(); c.moveTo(x, cy - h); c.quadraticCurveTo(x + w, cy, x, cy + h); c.quadraticCurveTo(x - w, cy, x, cy - h); c.fill();
        c.beginPath(); c.moveTo(x - dx, cy); c.quadraticCurveTo(x, cy - dy, x + dx, cy); c.quadraticCurveTo(x, cy + dy, x - dx, cy); c.fill(); };
      c.save(); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.75 * k; c.fillStyle = '#ffc840'; lens(30 * s * o, 7 * s, 9 * s, 52 * s * o);
      c.globalAlpha = k; c.fillStyle = '#fffbe0'; lens(18 * s * o, 3 * s, 4 * s, 34 * s * o);
      c.restore();
      V.glowAt(c, x, cy, 26 * s, BAST_GOLD, 0.6 * k);
    } });
  }
  // (online-refs pass: FF14 Sheltron / WoW Shield of the Righteous) the shield set: a crescent of gold light shoved off the
  // face of the plate, travelling out and thinning over 0.24s
  function bastionShove(ent, ang) {
    V.fx({ dur: 0.24, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), d = 38 + 34 * easeOut(p), cx = ent.x + Math.cos(ang) * d, cy = ent.y - 14 + Math.sin(ang) * d * 0.8, R = 26 + 10 * p;
      if (k < 0.02) return;
      V.neonPath(c, BAST_GOLD, 3.2 * (1 - p * 0.6), k, () => c.arc(cx - Math.cos(ang) * R, cy - Math.sin(ang) * R * 0.8, R, ang - 0.9, ang + 0.9));
      V.neonPath(c, '#ffffff', 1.2, 0.8 * k, () => c.arc(cx - Math.cos(ang) * R, cy - Math.sin(ang) * R * 0.8, R, ang - 0.5, ang + 0.5));
    } });
  }

  // ---- Bloodreaver: crimson and iron
  const REAV_RED = '#d4202c', REAV_INK = '#1a0406';
  // Hack & Maul's step: 0 Hack, 1 Maul, 2 Gore (a talent's third hit); c.step from the kit (fxStep), else counted
  const reaverStep = c => { const e = c.ent, s = e.reaverHack || (e.reaverHack = { n: -1, at: -99 }); s.n = c.step != null ? c.step : FX.now - s.at > 15 ? 0 : (s.n + 1) % 2; s.at = FX.now; return s.n; };
  // Ground Slam (tank sheet): glowing lava cracks run out across the floor, then cool and darken over dur
  function reaverCracks(x, y, r, dur) {
    const rays = Array.from({ length: 10 }, (_, i) => { const a0 = i * TAU / 10 + rnd(-0.25, 0.25), L = r * rnd(0.55, 1), pts = [[0, 0]]; let px = 0, py = 0;
      for (let s = 1; s <= 4; s++) { const a = a0 + rnd(-0.45, 0.45); px += Math.cos(a) * L / 4; py += Math.sin(a) * L / 4; pts.push([px, py]); } return pts; });
    OP.linger(dur, 'ground', (c, k, t) => {
      const grow = easeOut(Math.min(1, t / 0.18)), heat = Math.max(0.2, 1 - t / dur);
      c.save(); c.translate(x, y); c.scale(1, 0.7); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const pts of rays) { const m = Math.max(2, Math.round(pts.length * grow)), tr = () => pts.slice(0, m).forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b)));
        c.globalAlpha = 0.65 * k; c.strokeStyle = '#140604'; c.lineWidth = 8; c.beginPath(); tr(); c.stroke();
        V.neonPath(c, heat > 0.5 ? '#ff6a1a' : '#c0401a', 1 + 2.6 * heat, k * Math.min(1, heat * 1.3), tr); }
      c.restore();
      V.glowAt(c, x, y, r * 0.7, '#ff4a1a', 0.4 * k * heat);
    }, { peak: 1, settle: 0.7, hold: 1.2 });
  }
  // (online-refs pass: WoW Death Strike) the life coming back: a ribbon of blood leaves (x, y), arcs up and runs into the
  // reaver in 0.24s, its tail chasing it; when it arrives a ring closes in on the reaver (the heal) and the drops sink in
  function reaverTendril(x, y, ent, side = 1) {
    V.fx({ dur: 0.42, layer: 'air', draw: (c, p, t, e) => {
      const ex = ent.x, ey = ent.y - 20, mx = (x + ex) / 2 + side * (ey - y) * 0.25, my = (y + ey) / 2 - 46 + side * (x - ex) * 0.1, sy = y - 20;
      const head = easeOut(Math.min(1, t / 0.24)), tail = Math.max(0, Math.min(1, (t - 0.08) / 0.26)), k = e.a * (1 - Math.max(0, (t - 0.3) / 0.12));
      if (head - tail < 0.02 || k < 0.02) return;
      const P = q => { const u = 1 - q; return [u * u * x + 2 * u * q * mx + q * q * ex, u * u * sy + 2 * u * q * my + q * q * ey]; };
      const tr = () => { for (let i = 0; i <= 12; i++) { const [px, py] = P(tail + (head - tail) * i / 12); i ? c.lineTo(px, py) : c.moveTo(px, py); } };
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.globalAlpha = 0.55 * k; c.strokeStyle = REAV_INK; c.lineWidth = 9; c.beginPath(); tr(); c.stroke();
      c.globalAlpha = 0.95 * k; c.strokeStyle = '#a8102a'; c.lineWidth = 6; c.beginPath(); tr(); c.stroke(); c.globalAlpha = 1;
      V.neonPath(c, '#ff4a5a', 1.6, k, tr);
      const [hx, hy] = P(head); V.glowAt(c, hx, hy, 12, '#ff3a4a', 0.8 * k);
    } });
    OP.later(0.22, () => { V.swirl(ent.x, ent.y, { r: 40, color: '#ff2a4a', dur: 0.4, follow: ent, inward: true }); V.flash(ent.x, ent.y - 20, 30, '#ff3a4a', 0.16); });
  }
  // (online-refs pass) Bloodletting's mark: an X of two dark blood scars standing on the target, opening and drying in 0.4s
  function reaverScar(x, y, ang) {
    V.fx({ dur: 0.4, layer: 'air', draw: (c, p, t, e) => {
      const o = easeOut(Math.min(1, p / 0.2)), k = e.a * (1 - Math.max(0, (p - 0.35) / 0.65)), cy = y - 24, L = 26;
      if (k < 0.02) return;
      for (const s of [-1, 1]) { const a = ang + Math.PI / 2 + s * 0.7, dx = Math.cos(a) * L * o, dy = Math.sin(a) * L * o * 0.85;
        const tr = () => { c.moveTo(x - dx, cy - dy); c.lineTo(x + dx, cy + dy); };
        c.lineCap = 'round'; c.globalAlpha = 0.6 * k; c.strokeStyle = REAV_INK; c.lineWidth = 8; c.beginPath(); tr(); c.stroke();
        c.globalAlpha = k; c.strokeStyle = '#b8142a'; c.lineWidth = 4.5; c.beginPath(); tr(); c.stroke(); c.globalAlpha = 1;
        V.neonPath(c, '#ffd0d0', 1.2, k * (1 - p), tr); }
    } });
  }
  // War Cry's blood shield on a hero it covers: a red bubble flashing up, sparks of blood
  const reaverBloodShield = w => { V.shield(w, { color: '#ff3a4a', dur: 0.9, r: 38 }); V.flash(w.x, w.y - 20, 44, '#ff4a4a', 0.25); V.sparks(w.x, w.y - 10, { color: '#ff8a7a', n: 6, speed: 170 }); };

  // ---- Runeguard: violet runes
  // (shared-fx colour pass: a cooler indigo-blue-violet, so the Runeguard never reads as the Shadowblade's magenta-violet)
  const RUNE_VIO = '#8e98ff', RUNE_DEEP = '#6c74f2', RUNE_PALE = '#dde3ff', RUNE_INK = '#0c1236';
  // Runic Ward: rune plates turning round the holder for the ward's life; KIT_VFX.wardBlast cuts it when it ends early
  function runeguardWard(w, dur) {
    const f = OP.linger(dur, 'air', (c, k, t) => {
      const x = w.x, y = w.y - 14 - (w.lift || 0), r = 40 * (0.85 + 0.15 * easeOut(Math.min(1, t / 0.2)));
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, r * 0.3, x, y, r); g.addColorStop(0, 'rgba(177,140,255,0)'); g.addColorStop(1, `rgba(177,140,255,${0.22 * k})`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
      V.neonPath(c, RUNE_VIO, 1.8, k, () => { for (let i = 0; i <= 6; i++) { const q = i * Math.PI / 3 + t * 0.5; c.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r); } });
      for (let i = 0; i < 3; i++) { const q = t * 1.6 + i * TAU / 3, px = x + Math.cos(q) * r * 0.95, py = y + Math.sin(q) * r * 0.45, s = 4.5;
        V.neonPath(c, RUNE_PALE, 1.4, k, () => { c.moveTo(px - s, py + s); c.lineTo(px, py - s); c.lineTo(px + s, py + s); c.moveTo(px - s * 0.5, py); c.lineTo(px + s * 0.5, py); }); }
    }, { peak: 1, settle: 0.55, hold: 0.4 });
    f.w = w; f.at = FX.now; return f;
  }
  // Mirror Aegis: a pane of rune-glass standing in front of the guard, light sliding across it
  function runeguardMirror(ent, dur) {
    OP.linger(dur, 'air', (c, k, t) => {
      // (the pane faces the camera, narrowed as it turns side-on, so it never collapses to a line)
      const a = ent.angle || 0, cx = ent.x + Math.cos(a) * 32, cy = ent.y + Math.sin(a) * 32 * 0.8 - 24, nx = 0.45 + 0.55 * Math.abs(Math.sin(a)), ny = Math.cos(a) * Math.sign(Math.sin(a) || 1) * 0.25, W = 26 * easeOut(Math.min(1, t / 0.15)), H = 28;
      const pts = [[cx, cy - H], [cx + nx * W, cy + ny * W - H * 0.45], [cx + nx * W, cy + ny * W + H * 0.45], [cx, cy + H], [cx - nx * W, cy - ny * W + H * 0.45], [cx - nx * W, cy - ny * W - H * 0.45]];
      const tr = () => { pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.2 * k; c.fillStyle = RUNE_PALE; c.beginPath(); tr(); c.fill(); c.restore();
      V.neonPath(c, RUNE_PALE, 2, k, tr);
      V.neonPath(c, RUNE_VIO, 1.1, k * 0.7, () => { c.moveTo(cx, cy - H * 0.6); c.lineTo(cx, cy + H * 0.6); c.moveTo(cx - nx * W * 0.5, cy - ny * W * 0.5); c.lineTo(cx + nx * W * 0.5, cy + ny * W * 0.5); });
      const s = (t * 0.9) % 1, sx = cx + nx * W * (s * 2 - 1), sy = cy + ny * W * (s * 2 - 1);
      V.neonPath(c, '#ffffff', 1.4, k * 0.6 * Math.sin(s * Math.PI), () => { c.moveTo(sx, sy - H * 0.55); c.lineTo(sx, sy + H * 0.55); });
    }, { peak: 1, settle: 0.6, hold: 0.4 });
  }
  // How many Runes the guard holds once this Rune Strike has landed (1-3): your own hero reads the kit's gauge, anyone else's
  // is counted per hero, 1, 2, 3 and round again, so every client sees the Runes build
  function runeguardRunes(c) {
    const g = typeof window !== 'undefined' && window.__game, k = c.mine && g && g.actor && g.actor.kit, e = c.ent;
    if (k && k.g && k.g.runes != null) return Math.max(1, Math.min(3, Math.round(k.g.runes)));
    e.rgCount = (FX.now - (e.rgCountAt || -99) > 12 ? 0 : e.rgCount || 0) % 3 + 1; e.rgCountAt = FX.now; return e.rgCount;
  }
  // The Runes held, stamped over the struck target as three slots: the ones held lit and rising, the rest a dim outline. At 3 the
  // row flashes white (Glyph Burst is ready)
  function runeguardPips(x, y, held) {
    V.fx({ dur: 0.46, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.1) * (1 - Math.max(0, (p - 0.55) / 0.45)), rise = easeOut(Math.min(1, p / 0.4)) * 14;
      for (let i = 0; i < 3; i++) {
        const on = i < held, px = x + (i - 1) * 15, py = y - rise + (i === 1 ? -4 : 0), s = on ? 5 + (i === held - 1 ? 2 : 0) : 4;
        V.neonPath(c, on ? (held >= 3 ? '#ffffff' : RUNE_PALE) : RUNE_DEEP, on ? 1.8 : 1, k * (on ? 1 : 0.35), () => { c.moveTo(px - s, py + s); c.lineTo(px, py - s); c.lineTo(px + s, py + s); c.moveTo(px - s * 0.5, py); c.lineTo(px + s * 0.5, py); });
        if (on) V.glowAt(c, px, py, 7 + (held >= 3 ? 4 : 0), RUNE_VIO, 0.6 * k);
      }
    } });
  }
  // (online-refs pass: FF14 No Mercy / WoW Empower Rune Weapon) Runic Overload's load: three rune stones stamp alight over
  // the guard one after another (0.1s apart), then snap down into it at 0.32s, where the one bright beat goes off
  function runeguardLoad(ent) {
    V.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => {
      const fq = Math.max(0, Math.min(1, (t - 0.3) / 0.12)), fall = fq * fq, k = e.a * (1 - Math.max(0, (t - 0.4) / 0.1));
      if (k < 0.02) return;
      for (let i = 0; i < 3; i++) { const on = t - i * 0.1; if (on < 0) continue;
        const st = Math.min(1, on / 0.08), s = 7 * (1.7 - 0.7 * st), hx = ent.x + (i - 1) * 24, hy = ent.y - 58 - (i === 1 ? 10 : 0) - (ent.lift || 0);
        const px = hx + (ent.x - hx) * fall, py = hy + (ent.y - 24 - hy) * fall;
        V.glowAt(c, px, py, 12, RUNE_VIO, 0.7 * k * st);
        V.neonPath(c, st < 1 ? '#ffffff' : RUNE_PALE, 2, k * st, () => { c.moveTo(px - s, py + s); c.lineTo(px, py - s); c.lineTo(px + s, py + s); c.moveTo(px - s * 0.5, py); c.lineTo(px + s * 0.5, py); }); }
    } });
  }
  // (online-refs pass: a rune-etched blade) Runeblade's cut leaves three small runes etched along its arc for a moment
  function runeguardEtch(c0, r, span, flip) {
    const a0 = c0.ang, fl = flip ? -1 : 1, x = c0.x, y = c0.y;
    V.fx({ dur: 0.3, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15) * (1 - Math.max(0, (p - 0.4) / 0.6));
      if (k < 0.02) return;
      for (let i = 0; i < 3; i++) { const q = (i - 1) * span * 0.28 * fl, a = a0 + q, px = x + Math.cos(a) * r * 0.85, py = y - 12 + Math.sin(a) * r * 0.85 * 0.82, s = 4;
        if (p < i * 0.12) continue;
        V.neonPath(c, RUNE_PALE, 1.4, k, () => { c.moveTo(px - s, py + s); c.lineTo(px, py - s); c.lineTo(px + s, py + s); c.moveTo(px - s * 0.5, py); c.lineTo(px + s * 0.5, py); }); }
    } });
  }

  // ---- Ranger: leaf green and hunter's gold
  const RANG_GREEN = '#bfff9a', RANG_GOLD = '#ffe27a', RANG_AMBER = '#ff9d3d';
  // an arrow's release: rings of air bursting off the bow across the shot (archer sheet: Quick Shot)
  function rangerRelease(x, y, ang, col, s = 1) {
    V.fx({ dur: 0.3, layer: 'air', draw: (c, p, t, e) => { const k = (1 - p) * e.a, R = (8 + 20 * easeOut(p)) * s;
      c.save(); c.translate(x, y - 18); c.rotate(ang);
      V.neonPath(c, col, 2 * s, k, () => c.ellipse(10 + p * 30 * s, 0, R * 0.32, R, 0, 0, TAU));
      V.neonPath(c, '#ffffff', 1.2, k * 0.7, () => c.ellipse(4 + p * 14 * s, 0, R * 0.22, R * 0.65, 0, 0, TAU));
      c.restore(); } });
  }
  // speed lines riding behind a shot from (sx, sy) to (tx, ty) for its flight
  function rangerStreaks(sx, sy, tx, ty, dur, col, n = 4) {
    const ang = Math.atan2(ty - sy, tx - sx), L = Math.hypot(tx - sx, ty - sy);
    V.fx({ dur: dur + 0.12, layer: 'air', draw: (c, p, t, e) => {
      const q = Math.min(1, t / dur), k = e.a * (t > dur ? 1 - (t - dur) / 0.12 : 1), hx = L * q - 10;
      c.save(); c.translate(sx, sy - 18); c.rotate(ang);
      for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 4.5, len = 46 + (i % 2) * 26, h = hx - (i % 2) * 8; if (h <= 2) continue;
        V.neonPath(c, i % 2 ? '#ffffff' : col, 1.2, k * 0.7, () => { c.moveTo(Math.max(0, h - len), off); c.lineTo(h, off); }); }
      c.restore();
    } });
  }
  // where an arrow bites: a dust puff, stone chips skittering
  function rangerDust(x, y, s = 1) {
    V.smoke(x, y, { n: Math.round(5 * s), r: 8, color: '#c8b898', size: 20 * s, a: 0.55, speed: 60 * s, life: 0.8 });
    for (let i = 0; i < Math.round(5 * s); i++) { const a = Math.random() * TAU, sp = rnd(80, 200); V.spawn({ x, y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rnd(60, 160), g: 600, bounce: true, life: rnd(0.4, 0.7), size: rnd(4, 6), color: '#d8d0c0', kind: 'shard', add: false, vr: rnd(-12, 12) }); }
  }
  // (online-refs pass, docs/art/vfx-online-refs/ranger.md) your own kit, when this recipe is your hero's (else null)
  function rangerKit(c) {
    const g = typeof window !== 'undefined' && window.__game, k = c.mine && g && g.actor && g.actor.kit;
    return k && typeof k.has === 'function' ? k : null;
  }
  // Keen Eye stacks your own kit holds now (a recipe runs once the kit's effect has run), null for anyone else's hero
  const rangerKeens = c => { const k = rangerKit(c); return k ? (typeof k.stacks === 'function' ? k.stacks('keen') : k.has('keen') ? 1 : 0) : null; };
  // the Keen Eye proc on the hero (WoW / FF14 flash a proc on the player, never on the enemy): a gold eye pops open over
  // the head, a gold ring snaps off the bow; a second banked proc doubles the eye's rim
  function rangerKeenProc(ent, n = 1) {
    const a = ent.angle || 0, bx = ent.x + Math.cos(a) * 16, by = ent.y + Math.sin(a) * 10;
    V.glint(bx, by, { color: RANG_GOLD, size: 30, z: 22 });
    V.shock(bx, by, { r: 34, r0: 6, color: RANG_GOLD, dur: 0.26, w: 2.5 });
    V.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => {
      const op = easeOut(Math.min(1, p / 0.22)), k = e.a * (1 - Math.max(0, (p - 0.55) / 0.45)), x = ent.x, y = ent.y - 66 - 8 * easeOut(p), w = 13, h = 6.5 * op;
      if (k < 0.02) return;
      const lens = d => { c.moveTo(x - w - d, y); c.quadraticCurveTo(x, y - (h + d) * 1.6, x + w + d, y); c.quadraticCurveTo(x, y + (h + d) * 1.6, x - w - d, y); };
      c.save(); c.globalAlpha = 0.55 * k; c.fillStyle = '#2a1c04'; c.beginPath(); lens(2); c.fill(); c.restore();
      V.neonPath(c, RANG_GOLD, 2, k, () => lens(0));
      if (n >= 2) V.neonPath(c, '#fff6d0', 1.2, k * 0.8, () => lens(5));
      V.glowAt(c, x, y, 5 + 3 * op, '#ffffff', k); V.glowAt(c, x, y, 16, RANG_GOLD, 0.45 * k);
    } });
  }
  // a gold lance of light along a drawn shot (WoW Aimed Shot's streak): ink under, gold body, white core, gone in ~0.3s
  const rangerLance = (sx, sy, tx, ty, o = {}) => OP.thrust(sx, sy, tx, ty, { w: o.w ?? 9, color: o.color || RANG_GOLD, core: '#fffbe8', ink: '#2a1c04', head: true, dur: o.dur ?? 0.3, z: 18 });

  // ---- Shadowblade: violet shadow and pale steel
  const SHAD_VIO = '#9a4dff', SHAD_STEEL = '#e8e0ff', SHAD_INK = '#14081e';
  // the rogue sheet's Swift Strike: two daggers' cuts crossing in an X at (x, y), violet and steel
  function shadowX(x, y, ang, s = 1) {
    for (const [i, side] of [[0, 1], [1, -1]]) { const a = ang + side * 0.8, L = 46 * s;
      OP.later(i * 0.05, () => OP.thrust(x - Math.cos(a) * L, y - Math.sin(a) * L * 0.7, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.7, { w: 8 * s, color: i ? '#d8d0ff' : SHAD_VIO, core: '#ffffff', ink: SHAD_INK, dur: 0.26, z: 22 })); }
  }
  // (melee pass) what the combo gauge held. A Strike's recipe runs once the kit has added its points, so your own gauge is read
  // there; Eviscerate's runs once they are spent, so it uses the count last seen (another hero's: Strikes counted since their last
  // finisher, a rear one worth two when the geometry says it landed)
  function sbKit(c) {
    const g = typeof window !== 'undefined' && window.__game;
    return g && c.mine && g.actor && g.actor.kit && g.actor.kit.g && typeof g.actor.kit.g.combo === 'number' ? g.actor.kit : null;
  }
  function sbPoints(c, add) {
    const e = c.ent, kit = sbKit(c);
    if (kit) e._sbCp = kit.g.combo; else if (add) e._sbCp = Math.min(5, (e._sbCp || 0) + add);
    return e._sbCp || 0;
  }
  // which side of the boss the hero stands on ('rear' | 'flank' | 'front'), or null when the target is not the boss
  function sbSide(c) {
    const g = typeof window !== 'undefined' && window.__game, r = g && g.raid, b = r && r.boss;
    if (!b || r.state !== 'live' || typeof positionalOf !== 'function' || !isFinite(b.f) || Math.hypot(c.tx - b.x, c.ty - b.y) > 120) return null;
    return positionalOf({ x: c.ent.x, y: c.ent.y }, { x: b.x, y: b.y, facing: b.f });
  }
  // did the hit count as a positional? Your own: the buffs that make every hit one, or the geometry; another's: the geometry
  function sbLanded(c, want) {
    const kit = sbKit(c);
    return (kit && kit.has && (kit.has('truenorth') || kit.has('dance'))) || sbSide(c) === want;
  }
  // "you hit the back": drawn over the boss's body, where the hit itself is hidden. rear: a crimson thorn-burst with a violet "!"
  // that pops over it (the rogue sheet's Backstab; violet, not red, so it never reads as a boss warning); flank: a pale steel
  // diamond with two chevrons closing on it. `s` sizes it
  function sbFlourish(x, y, kind, s = 1) {
    const rear = kind === 'rear', col = rear ? '#e0203e' : '#cdb8ff', hi = rear ? '#ffe0e8' : '#ffffff', ink = rear ? '#2a0410' : SHAD_INK;
    V.spikeburst(x, y, { r: (rear ? 34 : 26) * s, n: rear ? 10 : 8, color: col, core: hi, ink, dur: 0.26, z: 30 });
    V.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => {
      const pop = Math.min(1, p / 0.18), k = e.a * (1 - Math.max(0, (p - 0.6) / 0.4)), sc = (0.4 + 0.75 * easeOut(pop) - 0.15 * Math.sin(Math.min(1, pop) * Math.PI)) * s, cy = y - 58 - 14 * easeOut(p);
      if (k < 0.02) return;
      c.save(); c.translate(x, cy); c.scale(sc, sc); c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha = k;
      if (rear) {
        c.beginPath(); c.moveTo(-5, -15); c.lineTo(5, -15); c.lineTo(3, 3); c.lineTo(-3, 3); c.closePath(); c.moveTo(0, 8); c.arc(0, 11, 3.6, 0, TAU);
        c.lineWidth = 7; c.strokeStyle = ink; c.stroke(); c.fillStyle = SHAD_VIO; c.fill(); c.lineWidth = 1.4; c.strokeStyle = hi; c.stroke();
      } else {
        const d = () => { c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 0); c.lineTo(0, 11); c.lineTo(-8, 0); c.closePath(); };
        d(); c.lineWidth = 6; c.strokeStyle = ink; c.stroke(); c.fillStyle = col; c.fill(); c.lineWidth = 1.4; c.strokeStyle = hi; c.stroke();
        for (const sd of [-1, 1]) { const g = 16 + 10 * (1 - easeOut(pop)); c.beginPath(); c.moveTo(sd * (g + 5), -6); c.lineTo(sd * g, 0); c.lineTo(sd * (g + 5), 6); c.lineWidth = 4.5; c.strokeStyle = ink; c.stroke(); c.lineWidth = 1.6; c.strokeStyle = hi; c.stroke(); }
      }
      c.restore();
      V.glowAt(c, x, cy, 20 * sc, col, 0.35 * k);
    } });
  }
  // one pip per combo point spent, flung out of a finisher's burst: a small diamond each, ink-edged, white-gold at full points
  function sbPips(x, y, cp, col) {
    const a0 = rnd(0, TAU);
    V.fx({ dur: 0.42, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - Math.max(0, (p - 0.5) / 0.5)), q = easeOut(Math.min(1, p / 0.6));
      if (k < 0.02) return;
      for (let i = 0; i < cp; i++) { const a = a0 + i * TAU / cp, R = 14 + 40 * q, px = x + Math.cos(a) * R, py = y - 20 + Math.sin(a) * R * 0.6, sz = (cp >= 5 ? 5.5 : 4.5) * (1 - 0.3 * p);
        c.save(); c.translate(px, py); c.rotate(a + Math.PI / 4); c.globalAlpha = k; c.fillStyle = SHAD_INK; c.fillRect(-sz - 1.5, -sz - 1.5, 2 * sz + 3, 2 * sz + 3);
        c.fillStyle = col; c.fillRect(-sz, -sz, 2 * sz, 2 * sz); c.fillStyle = '#ffffff'; c.globalAlpha = k * 0.9; c.fillRect(-sz * 0.4, -sz * 0.4, sz * 0.8, sz * 0.8); c.restore(); }
    } });
  }

  // ---- Pyromancer: orange flame
  // the fire sheet's Fireball impact: a pillow of fat flame puffs round a white-hot heart, swelling and burning out
  function pyroPillow(x, y, r) {
    const puffs = Array.from({ length: 9 }, (_, i) => ({ a: i * TAU / 9 + rnd(-0.2, 0.2), d: rnd(0.7, 1), s: rnd(0.8, 1.2) }));
    V.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, e) => {
      const g = easeOut(Math.min(1, p / 0.25)), k = e.a * Math.pow(1 - p, 1.4);
      for (const f of puffs) { const px = x + Math.cos(f.a) * r * f.d * g, py = y - 16 + Math.sin(f.a) * r * f.d * g * 0.6;
        V.glowAt(c, px, py, 20 * f.s * (0.6 + 0.6 * g), '#ff6a1a', 0.9 * k); V.glowAt(c, px, py, 9 * f.s, '#ffd070', k); }
      V.glowAt(c, x, y - 16, r * 0.9, '#fff0b0', k);
    } });
  }
  // (online-refs pass, docs/art/vfx-online-refs/pyromancer.md) your own kit's Heating Up / Hot Streak, 0-2, before and
  // after this cast (a recipe runs once the kit's effect has run); null for anyone else's hero
  function pyroProcs(c) {
    const g = typeof window !== 'undefined' && window.__game, k = c.mine && g && g.actor && g.actor.kit;
    if (!k || typeof k.has !== 'function') return null;
    const e = c.ent, now = k.has('hotstreak') ? 2 : k.has('heating') ? 1 : 0, prev = e._pyHeat || 0; e._pyHeat = now;
    return { prev, now };
  }
  // the proc on the mage's hands (WoW's Heating Up / Hot Streak): lvl 1 a spark caught in the hand; lvl 2 flame bursts
  // up off both hands with a gold heart and embers, gone in half a second
  function pyroHandProc(ent, lvl) {
    const a = ent.angle || 0;
    if (lvl < 2) { V.glint(ent.x + Math.cos(a) * 14, ent.y + Math.sin(a) * 8, { color: '#ffb040', size: 22, z: 24 }); return; }
    V.glint(ent.x, ent.y, { color: '#ffe08a', size: 34, z: 34 });
    V.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, e) => {
      const up = easeOut(Math.min(1, p / 0.2)), k = e.a * (1 - Math.max(0, (p - 0.45) / 0.55));
      if (k < 0.02) return;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const s of [-1, 1]) { const hx = ent.x + s * 13, hy = ent.y - 18 - (ent.lift || 0);
        for (const [col, h, w, al] of [['#ff5a1a', 30, 7, 0.75], ['#ffb040', 22, 5, 0.85], ['#fff2c0', 12, 2.6, 1]]) { const H = h * up * (1 + 0.12 * Math.sin(t * 30 + s)), sw = Math.sin(t * 14 + s) * 3;
          c.globalAlpha = al * k; c.fillStyle = col; c.beginPath(); c.moveTo(hx - w, hy); c.quadraticCurveTo(hx - w, hy - H * 0.6, hx + sw, hy - H); c.quadraticCurveTo(hx + w, hy - H * 0.6, hx + w, hy); c.arc(hx, hy, w, 0, Math.PI); c.fill(); } }
      c.restore();
      V.glowAt(c, ent.x, ent.y - 24, 26, '#ff8a2a', 0.35 * k);
    } });
    for (let i = 0; i < 6; i++) V.spawn({ x: ent.x + rnd(-14, 14), y: ent.y, z: rnd(16, 26), vz: rnd(60, 120), vx: rnd(-20, 20), life: rnd(0.35, 0.6), size: rnd(3, 5), size1: 0, color: i % 2 ? '#ffd070' : '#ff8a2a' });
  }
  const pyroProcBeat = (c, pr) => { if (pr && pr.now > pr.prev) { const e = c.ent; c.later(0.08, () => pyroHandProc(e, pr.now)); } };
  // Combustion: a ring of flame round the mage for the burst (fire sheet: the burning ring), tongues licking up
  function pyroFireRing(ent, dur) {
    return OP.linger(dur, 'ground', (c, k, t) => {
      const x = ent.x, y = ent.y + 2, R = 44;
      V.glowAt(c, x, y, R * 1.25, '#ff5a1a', 0.3 * k); V.neonRing(c, x, y, R, '#ff6a1a', 2.4, k, 0.55);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + t * 0.5, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R * 0.55, h = (11 + 5 * Math.sin(t * 9 + i * 1.7)) * (0.7 + 0.3 * Math.sin(a + Math.PI)), w = 4.5, sw = Math.sin(t * 6 + i) * 2;
        c.globalAlpha = 0.7 * k; c.fillStyle = i % 2 ? '#ff7a1a' : '#ffb040'; c.beginPath(); c.moveTo(px - w, py); c.quadraticCurveTo(px - w, py - h * 0.6, px + sw, py - h); c.quadraticCurveTo(px + w, py - h * 0.6, px + w, py); c.closePath(); c.fill(); }
      c.restore();
    }, { peak: 1, settle: 0.5, hold: 0.8, tick: (p, dt, e) => { if (!e.cut && Math.random() < 0.35) { const a = Math.random() * TAU; V.spawn({ x: ent.x + Math.cos(a) * 44, y: ent.y + 2 + Math.sin(a) * 24, z: 2, vz: rnd(50, 110), life: rnd(0.3, 0.5), size: rnd(6, 10), size1: 1, color: Math.random() < 0.5 ? '#ff6a1a' : '#ffb040' }); } } });
  }

  // ---- Cleric: dawn gold and petal pink
  // (shared-fx colour pass: the Cleric's light is a paler white-gold, the Bastion keeps the warm gold)
  const CLER_GOLD = '#fff0b0', CLER_PINK = '#ffd0e0', CLER_PALE = '#fff8dc';
  // a Dawn Petal's mend over time on the ally for its 15s: a faint gold ring under them, a petal or a mote drifting off
  // now and then, a small plus at each 3s tick
  function clericHot(w, dur) {
    OP.linger(dur, 'ground', (c, k, t) => { V.neonRing(c, w.x, w.y + 2, 24 + 2 * Math.sin(t * 3), CLER_GOLD, 1.6, k, 0.55); V.glowAt(c, w.x, w.y, 26, CLER_GOLD, 0.2 * k); },
      { peak: 0.9, settle: 0.35, hold: 0.8, tick: (p, dt, e) => {
        if (Math.random() < 0.05) { const pet = Math.random() < 0.4; V.spawn({ x: w.x + rnd(-14, 14), y: w.y + rnd(-4, 4), z: rnd(4, 20), vz: rnd(20, 40), vx: rnd(-8, 8), life: 1.2, size: pet ? 9 : 6, size1: pet ? 9 : 0, color: pet ? CLER_PINK : CLER_PALE, kind: pet ? 'petal' : 'glow', add: pet ? false : undefined, flutter: pet ? 4 : 0 }); }
        e.n = e.n || 0; if (p * dur >= (e.n + 1) * 3) { e.n++; V.plus(w.x, w.y, { color: CLER_GOLD, n: 2 }); }
      } });
  }
  // a cel-shaded flower stamped on the floor under an ally: six pink petals with an ink edge and a cream heart, popping
  // open with a little overshoot and gone in half a second (Dawn Petal). Kept thin so a telegraph still shows through
  function clericBlossom(w, o = {}) {
    const R = o.r ?? 28, dur = o.dur ?? 0.5, rot = rnd(0, TAU);
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const q = Math.min(1, p / 0.25), g = easeOut(q) * (1 + 0.14 * Math.sin(q * Math.PI)), k = e.a * Math.min(1, (1 - p) / 0.4);
      c.save(); c.translate(w.x, w.y + 2); c.scale(1, 0.62); c.rotate(rot + p * 0.7); c.lineJoin = 'round';
      for (let i = 0; i < 6; i++) {
        c.save(); c.rotate(i * TAU / 6); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(R * g * 0.55, -R * g * 0.5, R * g, 0); c.quadraticCurveTo(R * g * 0.55, R * g * 0.5, 0, 0);
        c.globalAlpha = 0.65 * k; c.fillStyle = i % 2 ? '#ffb4d0' : '#ffe0ec'; c.fill(); c.globalAlpha = 0.9 * k; c.strokeStyle = '#7a3050'; c.lineWidth = 1.5; c.stroke(); c.restore();
      }
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, w.x, w.y, R * 0.55, CLER_PALE, k * 0.9);
    } });
  }
  // Smite is pressed all fight, so it takes three turns: a straight shaft, a slanting lance, a fan of three; each lands
  // with a different mark (a starburst, a stamped seal, a ring of spikes) and all are gone inside half a second
  let clericSmiteN = 0;
  // (online-refs pass, docs/art/vfx-online-refs/cleric.md) heals rise, attacks fall: the Cleric's heals land as a halo,
  // light lifting off the ally and a cross, never an inked starburst (that is the language of a hit)
  // a gold halo forming over the ally's head, then sinking: down the body (o.to unset, Mend: Serenity's glyph coming
  // down) or settling just over the head and holding there a moment (o.to, Benediction's crown)
  function clericHalo(w, o = {}) {
    const dur = o.dur ?? 0.45, hold = o.to != null, R = o.r ?? 20;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const form = easeOut(Math.min(1, p / 0.3)), drop = hold ? easeOut(Math.min(1, p / 0.35)) : Math.max(0, (p - 0.3) / 0.7);
      const y = hold ? w.y - 96 + (96 - o.to) * drop : w.y - 92 + 88 * drop * drop, rx = R * (0.5 + 0.5 * form) * (hold ? 1 : 1 + 0.4 * drop), k = e.a * Math.min(1, (1 - p) / (hold ? 0.3 : 0.45));
      V.glowAt(c, w.x, y, rx * 1.6, CLER_GOLD, 0.45 * k);
      V.neonPath(c, '#ffd65a', 3.4, k, () => c.ellipse(w.x, y, rx, rx * 0.36, 0, 0, TAU));
      V.neonPath(c, '#ffffff', 1.2, k * 0.9, () => c.ellipse(w.x, y, rx, rx * 0.36, 0, 0, TAU));
    } });
  }
  // light lifting off an ally: a few motes climbing in a column and a small gold cross rising over the head
  function clericRise(w, o = {}) {
    const col = o.color || CLER_PALE, n = o.n ?? 6;
    for (let i = 0; i < n; i++) V.spawn({ x: w.x + rnd(-12, 12), y: w.y + rnd(-4, 4), z: rnd(4, 26), vz: rnd(120, 190), drag: 0.05, life: rnd(0.45, 0.7), size: rnd(6, 9), size1: 0, color: i % 2 ? col : CLER_GOLD, stretch: 2.5 });
    if (o.cross === false) return;
    V.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15, (1 - p) / 0.4), x = w.x, y = w.y - 80 - 18 * easeOut(p);
      V.glowAt(c, x, y, 22, CLER_GOLD, 0.5 * k);
      V.neonPath(c, '#ffd65a', 2.6, k, () => { c.moveTo(x, y - 10); c.lineTo(x, y + 10); c.moveTo(x - 7, y - 3); c.lineTo(x + 7, y - 3); });
    } });
  }
  // a gold bell hanging over the cleric, swinging and tolling (Prayer Circle: a Liturgy of the Bell / Temperance beat).
  // Each toll (at o.tolls, seconds) sends a ring out over the party; the bell itself hangs in the air, not on the floor
  function clericBell(ent, o = {}) {
    const dur = o.dur ?? 1.3, S = o.s ?? 30, tolls = o.tolls || [0.15, 0.6];
    const body = c => { c.beginPath(); c.moveTo(-S * 0.35, S * 0.25); c.quadraticCurveTo(-S * 0.45, 0, 0, 0); c.quadraticCurveTo(S * 0.45, 0, S * 0.35, S * 0.25);
      c.quadraticCurveTo(S * 0.5, S * 1.05, S * 0.85, S * 1.25); c.lineTo(-S * 0.85, S * 1.25); c.quadraticCurveTo(-S * 0.5, S * 1.05, -S * 0.35, S * 0.25); c.closePath(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.12, (dur - t) / 0.35), bx = ent.x, by = ent.y - 128 + 6 * (1 - Math.min(1, t / 0.2));
      let sw = 0; for (const tt of tolls) if (t >= tt - 0.1) { const d = t - (tt - 0.1); sw += Math.sin(d * 14) * Math.exp(-d * 4) * 0.35; }
      V.glowAt(c, bx, by + S * 0.7, S * 2.2, CLER_GOLD, 0.4 * k);
      c.save(); c.translate(bx, by); c.rotate(sw); c.globalAlpha = k; c.lineJoin = 'round';
      body(c); c.fillStyle = '#ffd65a'; c.fill(); c.strokeStyle = '#3a2a08'; c.lineWidth = 2; c.stroke();
      c.globalAlpha = k * 0.8; c.strokeStyle = '#fff8dc'; c.lineWidth = 2; c.beginPath(); c.moveTo(-S * 0.18, S * 0.3); c.quadraticCurveTo(-S * 0.3, S * 0.8, -S * 0.55, S * 1.1); c.stroke();
      c.globalAlpha = k; c.fillStyle = '#3a2a08'; c.beginPath(); c.arc(-sw * S * 0.8, S * 1.38, 3.5, 0, TAU); c.fill();
      c.restore(); c.globalAlpha = 1;
    } });
    for (const tt of tolls) c0(tt, () => { V.flash(ent.x, ent.y - 128 + S, 40, CLER_GOLD, 0.2); V.shock(ent.x, ent.y, { r: 180, r0: 30, color: CLER_GOLD, dur: 0.6, w: 4 }); });
    function c0(d, fn) { if (o.later) o.later(d, fn); else fn(); }
  }

  return {
    bastion: {
      // Blade Chain, three different swings: Strike a quick steel cut, Riposte a flipped backhand that bites with a blue
      // starburst, Judgment a glint on the blade, a great gold overhead arc and a sword of light dropped onto the boss
      blade: c => { const st = bastionStep(c), f = st === 1 ? true : st === 2 ? false : Math.random() < 0.5, judg = st === 2, d = judg ? 0.07 : 0;
        if (judg) { const h = ahead(c, 18); V.glint(h.x, h.y, { color: BAST_DAWN, size: 32, z: 34 }); }
        c.later(d, () => { V.slash(c.x, c.y, c.ang, { r: [56, 62, 76][st], span: [1.9, 2.2, 2.7][st], color: judg ? '#ffe08a' : '#9fc4ff', flip: f, sparks: [3, 4, 6][st] });
          OP.smear(c.x, c.y, c.ang, { r: [62, 70, 88][st], span: [1.9, 2.3, 2.9][st], w: [13, 16, 25][st], color: judg ? '#ffc840' : BAST_STEEL, core: judg ? '#fffbe0' : '#e8f2ff', ink: BAST_INK, dur: [0.24, 0.26, 0.34][st], flip: f, lines: judg ? 4 : 2 }); });
        // (online-refs pass: WoW Judgment / FF14 Royal Authority) Judgment's gold comes DOWN on the target: a sword of light
        // drops point first as the arc lands and breaks into the starburst (it replaces the old floor star before the boss)
        if (judg) c.later(d + 0.02, () => bastionVerdict(c.tx, c.ty, 1));
        c.later(d + 0.08, () => {
          if (st === 0) { V.hit(c.tx, c.ty, '#cfe0ff', 0.7); V.sparks(c.tx, c.ty, { color: '#e8f2ff', n: 6, angle: c.ang, spread: 0.8, speed: 320 }); return; }
          if (st === 1) { V.hit(c.tx, c.ty, '#cfe0ff', 0.85); V.spikeburst(c.tx, c.ty, { r: 36, n: 10, color: BAST_STEEL, core: '#ffffff', ink: BAST_INK, dur: 0.26 }); V.sparks(c.tx, c.ty, { color: BAST_DAWN, n: 7, angle: c.ang, spread: 0.7, speed: 360 }); return; }
          V.hit(c.tx, c.ty, '#ffe9a0', 0.7); });
        if (judg) c.later(d + 0.14, () => {
          V.flash(c.tx, c.ty - 16, 56, BAST_GOLD, 0.2); V.spikeburst(c.tx, c.ty, { r: 56, n: 14, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', dur: 0.34 });
          V.shock(c.tx, c.ty, { r: 84, color: '#ffe08a', dur: 0.38, w: 5, delay: 0.04 });
          V.burst(c.tx, c.ty - 10, { color: BAST_DAWN, color2: '#ffffff', n: 9, speed: 220, kind: 'star', flash: false }); shake(3);
          if (c.ent.st && typeof hitStop === 'function') hitStop(c.ent.st, 0.05, FX.now); }); },
      // a glint on the sword, a big radiant blade thrown end over end with a gold wake, a golden starburst and a seal where it lands
      edge: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#ffe08a', size: 34, z: 26 }); V.flash(h.x, h.y - 20, 36, BAST_GOLD, 0.18);
        // (online-refs pass: FF14 Holy Spirit / WoW Avenger's Shield) it lands as a standing cross of light on the target, the
        // starburst and one ring after it; the old floor seal before the boss is gone
        V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: '#ffe08a', speed: 800, size: 1.9, onHit: (x, y) => { bastionCross(x, y, 1); V.hit(x, y, '#ffe9a0', 0.9);
          V.spikeburst(x, y, { r: 50, n: 12, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', dur: 0.32 });
          V.shock(x, y, { r: 76, color: '#ffe08a', dur: 0.36, w: 4, delay: 0.05 }); V.burst(x, y - 20, { color: '#ffe9a0', color2: '#ffffff', n: 8, speed: 200, kind: 'star', flash: false }); shake(2); } }); },
      // Brace: a glint on the shield face, the tower shield set in front for the whole guard: 3s, or what Hold Fast
      // stretched it to (KIT_VFX.braceHold); a Perfect Block flares it and, the guard spent, lowers it (KIT_VFX.perfect).
      // Sparks and a scuff of dust at the feet
      brace: c => { const fx = c.x + Math.cos(c.ang) * 34, fy = c.y + Math.sin(c.ang) * 34; V.glint(fx, fy, { color: '#dbe9ff', size: 26 }); V.shield(c.ent, { shape: 'front', color: BAST_STEEL, dur: 0.4, r: 40 });
        if (c.ent.bastionPlate) c.ent.bastionPlate.cut = true;
        c.ent.bastionPlate = bastionPlate(c.ent, 3);
        // (online-refs pass: Sheltron) the plate snaps out (bastionPlate) and a crescent of gold is shoved off its face
        c.later(0.04, () => bastionShove(c.ent, c.ang));
        V.sparks(fx, fy, { color: '#cfe0ff', n: 6, angle: c.ang, spread: 0.7, speed: 220 }); V.smoke(c.x, c.y, { n: 3, color: '#c8c0b0', size: 18, a: 0.45, speed: 40 }); },
      // a shaft of light slams down (Divine Leap): a golden starburst, a seal on the floor, stones kicked up, then the aura
      oath: c => { V.lightfall(c.x, c.y, { color: '#ffe08a', r: 30, h: 240, dur: 0.8, feathers: 0 }); V.aura(c.ent, { color: '#ffd65a', dur: 15, r: 30, rate: 0.12 });
        c.later(0.2, () => { V.ink(c.x, c.y, { r: 60, dur: 1.4 }); V.sigil(c.x, c.y, { r: 60, style: 'star4', color: '#ffd65a', dur: 1.4, spin: 1.5 }); V.spikeburst(c.x, c.y, { r: 66, n: 14, hole: 0.5, color: '#ffd65a', core: '#fffbe0', ink: '#4a3408', fill: '#8a6a10', dur: 0.4, layer: 'ground', z: 0, flat: 0.6 }); V.debris(c.x, c.y, { n: 6, color: '#8a7a68' }); shake(3); }); },
      // Rally Banner: a glint and a shaft of light where it goes in, then the banner itself stands behind the bastion for
      // its 12s, a small seal at its foot and a faint gold ring round it (the old full-strength floor star is gone)
      banner: c => { const a = c.ang || 0, bx = c.x - Math.cos(a) * 24, by = c.y - Math.sin(a) * 14 - 4;
        V.glint(bx, by, { color: '#ffe08a', size: 30, z: 80 }); V.lightfall(bx, by, { color: '#ffe08a', r: 22, h: 260, dur: 0.8, feathers: 3 });
        c.later(0.12, () => { bastionBanner(bx, by, 12); OP.rim(bx, by, 150, BAST_GOLD, 12, { settle: 0.16, ticks: 20, spin: 0.08 });
          V.sigil(bx, by, { r: 56, style: 'star5', color: '#f2c84b', dur: 1.1, spin: 1 }); V.shock(bx, by, { r: 160, color: '#ffe08a', dur: 0.6, w: 6 });
          V.debris(bx, by, { n: 6, color: '#8a7a68', speed: 0.7 }); V.smoke(bx, by, { n: 4, color: '#c8c0b0', size: 22, a: 0.45, speed: 45 }); shake(3); }); },
      // Bulwark: a glint, a blue dome flaring up, then a faint dome of hex plates that holds over the bastion for the 10s
      bulwark: c => { V.glint(c.x, c.y, { color: '#cfe0ff', size: 30, z: 40 }); V.ink(c.x, c.y, { r: 62, dur: 1.2, flat: 0.5, follow: c.ent }); V.dome(c.ent, { color: '#8fc0ff', r: 48, dur: 1.1 });
        bastionDome(c.ent, 10, '#8fc0ff');
        V.shock(c.x, c.y, { r: 110, color: '#9fc4ff', dur: 0.5, w: 7 }); V.burst(c.x, c.y - 20, { color: '#cfe0ff', n: 12, speed: 220, kind: 'star' }); shake(2); },
      // Sentinel: the tower shield slams forward, a blue shockwave off its face, dust kicked up
      bash: c => {
        const fx = c.x + Math.cos(c.ang) * 34, fy = c.y + Math.sin(c.ang) * 34;
        V.shield(c.ent, { shape: 'front', color: '#bcd8ff', dur: 0.5, r: 42 });
        c.later(0.06, () => { V.spawn({ x: fx, y: fy, z: 18, life: 0.25, size: 70, size1: 26, color: '#dbe9ff', kind: 'star', vr: 4 }); V.shock(fx, fy, { r: 80, color: '#7fb2ff', dur: 0.35, w: 6 });
          V.sparks(fx, fy, { color: '#ffffff', n: 8, angle: c.ang, spread: 0.8, speed: 360 }); V.smoke(fx, fy, { n: 4, color: '#c8c0b0', size: 20, a: 0.5, speed: 50 }); vfxShake(3); });
      },
      // Crusader: a consecrated dome of dawn light over a rune circle
      // (the dome of dawn flares, then a faint gold dome of plates holds for the guard's 10s)
      zeal: c => { V.glint(c.x, c.y - 30, { color: BAST_DAWN, size: 30, z: 40 }); V.dome(c.ent, { color: '#ffd65a', r: 46, dur: 1.2 }); bastionDome(c.ent, 10, '#ffd65a');
        V.sigil(c.x, c.y, { r: 70, style: 'star4', color: '#ffe27a', dur: 1, spin: 2 }); V.shock(c.x, c.y, { r: 110, color: BAST_DAWN, dur: 0.5, w: 6 }); V.burst(c.x, c.y - 30, { color: '#fff2b0', color2: '#ffffff', n: 14, speed: 200, kind: 'star' }); shake(2); },
    },
    bloodreaver: {
      // Hack & Maul (heavy axe): a wide crimson-iron arc, a grit-and-spark bite and a small crack in the floor; Maul, the
      // second swing, comes back the other way, wider, and shakes
      // (online-refs pass: Heavy Swing / Maim / Red Dust) the steps escalate: Hack is a plain heavy cut that leaves nothing
      // behind and doesn't shake; Maul swings back wider with a beat of hit-stop and the floor crack; Gore (the talent's third
      // hit) rips UP through the target, blood flung high and raining back
      hack: c => { const st = reaverStep(c), maul = st >= 1, gore = st === 2, f = maul ? true : Math.random() < 0.5, R = maul ? 86 : 76;
        if (gore) { OP.thrust(c.tx + Math.cos(c.ang) * -6, c.ty + 26, c.tx, c.ty - 92, { w: 15, color: REAV_RED, core: '#f0dcd4', ink: REAV_INK, dur: 0.26, z: 0 });
          V.slash(c.x, c.y, c.ang, { r: R - 14, span: 1.8, color: '#ff3a3a', w: 0.5, flip: false, dur: 0.22 }); }
        else { V.slash(c.x, c.y, c.ang, { r: R - 10, span: 2.4, color: '#ff3a3a', w: 0.55, flip: f });
          OP.smear(c.x, c.y, c.ang, { r: R, span: maul ? 2.9 : 2.6, w: maul ? 28 : 22, color: REAV_RED, core: '#f0dcd4', ink: REAV_INK, dur: maul ? 0.34 : 0.28, flip: f, lines: maul ? 3 : 2 }); }
        c.later(0.1, () => { const m = between(c, 0.72); V.splash(c.tx, c.ty, { n: maul ? 9 : 5 }); V.hit(c.tx, c.ty, '#ff6a5a', maul ? 0.9 : 0.7);
          V.spikeburst(c.tx, c.ty, { r: maul ? 46 : 34, n: 10, color: '#c0202a', core: '#ffe0c0', ink: REAV_INK, dur: maul ? 0.28 : 0.22 });
          V.sparks(c.tx, c.ty, { color: '#ffb070', n: maul ? 8 : 5, angle: gore ? -Math.PI / 2 : c.ang, spread: 0.9, speed: 340 });
          if (gore) for (let i = 0; i < 8; i++) V.spawn({ x: c.tx + rnd(-10, 10), y: c.ty, z: 30, vx: rnd(-90, 90), vy: rnd(-30, 30), vz: rnd(240, 380), g: 900, life: rnd(0.45, 0.7), size: rnd(6, 10), color: '#b0102a', kind: 'drop', add: false });
          if (!maul) return;
          V.sparks(c.tx, c.ty, { color: '#e8e0dc', n: 4, speed: 260 });
          V.debris(m.x, m.y, { n: 4, color: '#6a5048', speed: 0.6, up: 0.6 }); V.decal(m.x, m.y, { style: 'crack', r: 32, dur: 1.2, a: 0.45, seed: Math.random() * 6 });
          shake(3); if (c.ent.st && typeof hitStop === 'function') hitStop(c.ent.st, 0.05, FX.now); }); },
      // (online-refs pass: WoW Death Strike) a heavy cut, then the life comes back: a ribbon of blood arcs off the target into
      // the reaver and a pulse closes in on it as it arrives (reaverTendril); only a small dark splatter is left on the floor
      drain: c => { V.slash(c.x, c.y, c.ang, { r: 74, span: 2.6, color: '#ff1a3a', w: 0.6, dur: 0.34 });
        OP.smear(c.x, c.y, c.ang, { r: 80, span: 2.6, w: 20, color: '#a8102a', core: '#ffd0d0', ink: REAV_INK, dur: 0.28, lines: 2 });
        c.later(0.1, () => { const m = between(c, 0.6); V.splash(c.tx, c.ty, { n: 8, speed: 1.2 }); V.hit(c.tx, c.ty, '#ff2a4a', 1); reaverTendril(c.tx, c.ty, c.ent, Math.random() < 0.5 ? 1 : -1);
          V.puddle(m.x, m.y, { r: 14, color: '#7a0c20', dark: '#2a040c', dur: 1.2, bubbles: false, fumes: false }); }); },
      // Bloodletting: two quick crossing cuts, a crimson starburst, a spray of blood and a few drops left on the floor
      letting: c => { for (const [i, s] of [[0, 1], [1, -1]]) c.later(i * 0.07, () => { V.slash(c.x, c.y, c.ang + 0.4 * s, { r: 56, span: 1.4, color: '#ff6a6a', dur: 0.22, flip: s < 0 });
          OP.smear(c.x, c.y, c.ang + 0.35 * s, { r: 66, span: 1.7, w: 15, color: '#e02a3a', core: '#ffe0e0', ink: REAV_INK, dur: 0.24, flip: s < 0, lines: 2 }); });
        // (online-refs pass) the two cuts leave their X standing on the target (reaverScar) instead of a red pool on the floor
        c.later(0.14, () => { V.splash(c.tx, c.ty, { n: 10, speed: 1.2 }); V.hit(c.tx, c.ty, '#ff5a5a', 0.75); reaverScar(c.tx, c.ty, c.ang);
          V.spikeburst(c.tx, c.ty, { r: 44, n: 12, color: '#d0203a', core: '#ffd0d0', ink: '#2a0408', dur: 0.28 }); }); },
      // power gathers, then a ground slam: a starburst, the floor cracks with glowing lava, rocks fly; the flame aura stays on
      frenzy: c => { V.charge(c.x, c.y, { color: '#ff5a2a', r: 50, n: 8, dur: 0.25, follow: c.ent }); V.aura(c.ent, { color: '#ff2a1a', style: 'flame', dur: 12, r: 30, rate: 0.3 });
        c.later(0.18, () => { const x = c.ent.x, y = c.ent.y; reaverCracks(x, y, 120, 4); V.crater(x, y, { r: 72, color: '#ff4a1a', dur: 3.2, flames: 6, a: 0.7, cracks: 10 }); V.spikeburst(x, y, { r: 84, n: 16, color: '#ff3a1a', core: '#ffd070', ink: '#3a0806', dur: 0.42, layer: 'ground', z: 0, flat: 0.6 });   // (QA) under the reaver, not over it
          V.flash(x, y - 16, 48, '#ff6a2a', 0.18); V.flare(x, y, { color: '#ff3a1a', n: 18, r: 26 }); V.debris(x, y, { n: 10, hot: true, color: '#5a3a2a' }); V.shock(x, y, { r: 140, color: '#ff3a2a', dur: 0.5, w: 8 });
          V.smoke(x, y, { n: 5, r: 40, color: '#5a3a2a', size: 30, a: 0.4, speed: 50, life: 1.4 }); shake(6); }); },
      // a roar: a ring of red spikes bursts across the floor, shockwaves roll out, a dust cloud and embers settle
      warcry: c => { V.glint(c.x, c.y, { color: '#ffb08a', size: 26, z: 40 });
        c.later(0.1, () => { V.spikeburst(c.x, c.y, { r: 120, n: 22, hole: 0.62, color: '#ff4a1a', core: '#ffb070', ink: '#3a0806', fill: '#8a1a0a', dur: 0.55, layer: 'ground', z: 0, flat: 0.6 });
          for (let i = 0; i < 2; i++) V.shock(c.x, c.y, { r: 160 + i * 50, color: '#ff8a5a', dur: 0.6, w: 6 - i * 2, delay: i * 0.12 }); shake(4); });
        // (polish) the roar's blood shield flashes up on the reaver; the rest of the party gets its flash from the shield
        // itself (KIT_VFX.partyWard, on every client)
        c.later(0.3, () => reaverBloodShield(c.ent));
        c.later(0.45, () => { V.smoke(c.x, c.y, { n: 7, r: 70, color: '#8a5a40', size: 34, a: 0.35, speed: 40, life: 1.8 }); V.motes(c.x, c.y, { color: '#ff8a3a', n: 8, r: 90, rise: 0.5, life: 1.4 }); }); },
      // a blood-red rune circle that stays under the reaver, a red dome flaring up, shadows rising
      // (QA) the red rune circle settles faint after its flare: at full strength for 8s it read as a danger zone
      undying: c => { vfxLingerSettle(V.ink(c.x, c.y, { r: 60, dur: 8, follow: c.ent, a: 0.3 }), 0.5, 1); vfxLingerSettle(V.sigil(c.x, c.y, { r: 60, style: 'runes', color: '#c01a2a', dur: 8, spin: -0.8, follow: c.ent }), 0.28, 1.2); V.aura(c.ent, { color: '#8a0010', style: 'shadow', dur: 8, r: 30, rate: 0.3 });
        V.dome(c.ent, { color: '#ff2a3a', r: 44, dur: 1.4 }); c.later(1.2, () => V.motes(c.ent.x, c.ent.y, { color: '#ff2a3a', n: 8, r: 30 })); },
      // Berserker: a wild double swing of burning orange, the floor cracking and smoking where it lands
      rampage: c => {
        V.slash(c.x, c.y, c.ang + 0.3, { r: 80, span: 2.8, color: '#ff7a2a', w: 0.7, dur: 0.34 });
        c.later(0.1, () => V.slash(c.x, c.y, c.ang - 0.3, { r: 84, span: 2.8, color: '#ffb050', w: 0.6, dur: 0.34, flip: true }));
        c.later(0.16, () => { V.flare(c.tx, c.ty, { n: 16, r: 18, color: '#ff5a1a' }); V.hit(c.tx, c.ty, '#ffb060', 1.2); V.decal(c.tx, c.ty, { style: 'crack', r: 50, dur: 2.5, a: 0.6, seed: Math.random() * 6 }); V.decal(c.tx, c.ty, { r: 36, embers: true, dur: 2 }); vfxShake(4); });
      },
      // Hemomancer: a spear of liquid blood, droplets trailing, a splash where it strikes
      lance: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: '#ff2d4b', speed: 1000, onHit: (x, y) => { V.splash(x, y, { n: 12, speed: 1.2 }); V.hit(x, y, '#ff5a6a', 0.9); V.spawn({ x, y, z: 16, life: 0.3, size: 54, size1: 18, color: '#c0204a', kind: 'star', vr: 6 }); } }),
    },
    runeguard: {
      // Rune Strike (the filler, so quick and cheap): three presses make a round. The first two are hooks of the rune gauntlet,
      // one off each side; the third drives the fist straight in as a lance and hits harder. Every press stamps the Runes held
      // over the target (a dim slot each, lit as they fill; white at three) so the loop reads as a build, not three of the same
      strike: c => {
        const e = c.ent, sw = (e.rgSwing = ((e.rgSwing | 0) + 1) % 3), held = runeguardRunes(c), full = held >= 3, h = ahead(c, 14), drive = sw === 2;
        V.glint(h.x, h.y, { color: full ? '#ffffff' : RUNE_PALE, size: 20 + 4 * held, z: 18 });
        if (drive) { const L = ahead(c, 96); c.later(0.03, () => OP.thrust(c.x, c.y, L.x, L.y, { w: 12, color: RUNE_DEEP, core: '#f0e8ff', ink: RUNE_INK, head: true, dur: 0.22, z: 18 })); }
        else V.slash(c.x, c.y, c.ang, { r: 48, span: 1.6, color: '#a8b0ff', w: 0.42, dur: 0.2, flip: sw === 1, sparks: 2 });
        c.later(drive ? 0.1 : 0.08, () => {
          V.hit(c.tx, c.ty, RUNE_VIO, drive ? 1 : 0.75); V.spikeburst(c.tx, c.ty, { r: drive ? 44 : 32, n: drive ? 10 : 8, color: RUNE_DEEP, core: '#f0e8ff', ink: RUNE_INK, dur: 0.24 });
          runeguardPips(c.tx, c.ty - 30, held);
          if (drive) { V.shock(c.tx, c.ty, { r: 54, color: RUNE_VIO, dur: 0.35, w: 4 }); V.sparks(c.tx, c.ty, { color: RUNE_PALE, n: 5, angle: c.ang, spread: 0.8, speed: 260 }); shake(2); if (e.st && typeof hitStop === 'function') hitStop(e.st, 0.04, FX.now); }
          // the third Rune: the guard's fist flares white and a ring runs out of it, Glyph Burst is ready
          if (full) { V.shock(c.x, c.y, { r: 44, color: '#ffffff', dur: 0.3, w: 3 }); V.glint(c.x, c.y - 18, { color: '#ffffff', size: 28, z: 18 }); }
        });
      },
      // a rune circle turns under the guard, the hex ward closes over and holds as rune plates turning round the holder
      // until it ends (KIT_VFX.wardBlast breaks it with a rune burst sized by what it soaked)
      // (QA colour pass: every Runeguard recipe on the indigo RUNE_ palette, not the Shadowblade's violet)
      ward: c => { const w = c.tent || c.ent; V.sigil(w.x, w.y, { r: 40, style: 'runes', color: RUNE_VIO, dur: 0.7, spin: 4, follow: w }); V.shield(w, { shape: 'hex', color: '#9aa4ff', dur: 0.6, r: 40 }); V.burst(w.x, w.y - 20, { color: RUNE_PALE, n: 8, speed: 140, kind: 'star', flash: false });
        if (c.ent.rgWard) c.ent.rgWard.cut = true;
        c.ent.rgWard = runeguardWard(w, 8); },
      // a glyph spins up on the target, then rune crystals erupt in a violet starburst and leave the floor cracked
      // (the three Runes it spends fly off the guard at the target, the glyph blooms under it, and the detonation is a ring of
      // spikes with a pillar of light through it and a kick of the screen)
      glyph: c => { V.ink(c.tx, c.ty, { r: 70, dur: 0.5 }); V.sigil(c.tx, c.ty, { r: 70, style: 'runes', color: RUNE_DEEP, dur: 0.5, spin: 8 });
        for (let i = 0; i < 3; i++) c.later(i * 0.05, () => V.missile(c.x, c.y - 24 - i * 4, c.tx, c.ty - 10, { style: 'orb', color: i === 1 ? RUNE_PALE : '#9aa4ff', speed: 850, size: 0.5, onHit: () => {} }));
        c.later(0.4, () => { V.flash(c.tx, c.ty - 20, 56, '#c8ceff', 0.2); V.crystals(c.tx, c.ty, { color: '#9aa4ff', n: 8, r: 50, h: 66 }); V.spikeburst(c.tx, c.ty, { r: 60, n: 14, color: RUNE_DEEP, core: '#eef1ff', ink: RUNE_INK, dur: 0.34 });
          V.pillar(c.tx, c.ty, { r: 22, h: 190, color: '#8e98ff', dur: 0.5 }); V.shock(c.tx, c.ty, { r: 110, color: RUNE_VIO, dur: 0.45, w: 6 });
          V.decal(c.tx, c.ty, { style: 'crack', r: 50, dur: 1.8, a: 0.55, seed: Math.random() * 6 }); shake(5); if (c.cam) c.cam.punch(0.03, 0.3); if (c.ent.st && typeof hitStop === 'function') hitStop(c.ent.st, 0.07, FX.now); }); },
      // runes spiral in, a rune circle, crackling bolts, a violet burst; motes drift off afterwards
      // (online-refs pass: No Mercy / Empower Rune Weapon) one ordered load and one snap instead of random bolts: three rune
      // stones stamp alight over the guard in turn (runeguardLoad), drop into it, and it goes off once (a white ring, a ring
      // of spikes, a glint), then the rune aura holds for the window
      overload: c => { V.charge(c.x, c.y, { color: '#b8c0ff', r: 50, n: 8, dur: 0.3, follow: c.ent }); runeguardLoad(c.ent);
        V.ink(c.x, c.y, { r: 66, dur: 0.9, a: 0.3 }); V.sigil(c.x, c.y, { r: 66, style: 'runes', color: '#7c84ff', dur: 0.9, spin: 3, follow: c.ent });
        c.later(0.42, () => { const x = c.ent.x, y = c.ent.y; V.aura(c.ent, { color: '#7c84ff', style: 'runes', dur: 15, r: 32, rate: 0.2 });
          V.spikeburst(x, y, { r: 50, n: 12, color: '#7c84ff', core: '#eef1ff', ink: RUNE_INK, dur: 0.32, z: 20 }); V.glint(x, y - 24, { color: '#ffffff', size: 34, z: 20 });
          V.shock(x, y, { r: 96, color: '#e4e8ff', dur: 0.36, w: 5 }); V.flash(x, y - 20, 40, '#c8ceff', 0.16); shake(3); });
        c.later(1, () => V.motes(c.ent.x, c.ent.y, { color: '#b8c0ff', n: 6, r: 34 })); },
      // a great rune circle, a pillar of light, and a ring of rune stones bursting up round its edge
      // (the great circle flares for a moment, then a faint sanctuary rim of runes holds there for the buff's 10s)
      // (QA: the flare whited out the middle) a slimmer pillar, indigo
      sanctum: c => { V.glint(c.x, c.y, { color: RUNE_PALE, size: 30, z: 40 }); V.ink(c.x, c.y, { r: 150, dur: 0.7, a: 0.25 }); V.sigil(c.x, c.y, { r: 150, style: 'runes', color: '#7c84ff', dur: 0.7, spin: 0.5 }); V.pillar(c.x, c.y, { r: 36, h: 160, color: '#7c84ff', dur: 1.1 });
        OP.rim(c.x, c.y, 150, '#7c84ff', 10, { style: 'runes', settle: 0.22, ticks: 24, spin: 0.12 }); V.shock(c.x, c.y, { r: 170, color: RUNE_PALE, dur: 0.55, w: 5 });
        c.later(0.15, () => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; V.crystals(c.x + Math.cos(a) * 140, c.y + Math.sin(a) * 109, { color: '#9aa4ff', n: 3, r: 14, h: 40, dur: 1.6 }); } }); },
      // a glint on the mirror, a pane of rune-glass standing in front for the 3s hold, light sliding across it, shards
      // falling away when it goes
      mirror: c => { const fx = c.x + Math.cos(c.ang) * 30, fy = c.y + Math.sin(c.ang) * 30; V.glint(fx, fy, { color: '#ffffff', size: 34 }); V.shield(c.ent, { shape: 'front', color: RUNE_PALE, dur: 0.5, r: 44 });
        runeguardMirror(c.ent, 3); V.crystals(fx, fy, { color: '#e4e8ff', n: 5, r: 18, h: 40, dur: 0.6 }); V.sparks(fx, fy - 20, { color: RUNE_PALE, n: 6, speed: 200 });
        c.later(2.9, () => { const e = c.ent, a = e.angle || 0; V.crystals(e.x + Math.cos(a) * 32, e.y + Math.sin(a) * 26, { color: '#e4e8ff', n: 4, r: 16, h: 30, dur: 0.5 }); }); },
      // Runeblade: a rune-etched sword cut with a pale indigo trail (Carve, the second hit, cuts wider)
      // (online-refs pass) small runes etched along the arc for a beat (runeguardEtch); Carve also gets the heavier smear
      cut: c => { const carve = !(c.ent.rgCut = !c.ent.rgCut); V.slash(c.x, c.y, c.ang, { r: carve ? 64 : 54, span: carve ? 2.2 : 1.6, color: '#a8b0ff', w: 0.5, dur: 0.24, flip: carve });
        runeguardEtch(c, carve ? 64 : 54, carve ? 2.2 : 1.6, carve);
        if (carve) OP.smear(c.x, c.y, c.ang, { r: 70, span: 2.2, w: 15, color: RUNE_DEEP, core: '#eef1ff', ink: RUNE_INK, dur: 0.24, flip: true, lines: 2 });
        c.later(0.07, () => { V.hit(c.tx, c.ty, '#d8deff', 0.7); V.sigil(c.tx, c.ty, { r: 22, style: 'runes', color: '#b8c0ff', dur: 0.35, spin: 8 }); }); },
      // Rune Cleave: a wide sweep that leaves a burning rune hanging in the air
      cleave: c => {
        V.slash(c.x, c.y, c.ang, { r: 76, span: 2.8, color: '#c8ceff', w: 0.65, dur: 0.32 });
        c.later(0.12, () => { V.sigil(c.tx, c.ty - 30, { r: 34, style: 'runes', color: '#7c84ff', dur: 1.6, spin: 1.5, flat: 1, layer: 'air' }); V.burst(c.tx, c.ty - 20, { color: '#d8deff', n: 14, speed: 220 });
          // (polish) the rune keeps burning, faint, over the target for the burn's 12s, an ember dropping off it now and then
          const rx = c.tx, ry = c.ty - 30;
          OP.linger(12, 'air', (cc, k, t) => { if (t < 1.3) return; const kk = k * Math.min(1, (t - 1.3) / 0.4), fl = 0.8 + 0.2 * Math.sin(t * 7);
            V.glowAt(cc, rx, ry, 26, '#7c84ff', 0.35 * kk * fl); V.neonRing(cc, rx, ry, 20, '#7c84ff', 1.4, kk * fl, 1);
            V.neonPath(cc, RUNE_PALE, 1.5, kk * fl, () => { cc.moveTo(rx - 7, ry + 8); cc.lineTo(rx, ry - 9); cc.lineTo(rx + 7, ry + 8); cc.moveTo(rx - 4, ry + 1); cc.lineTo(rx + 4, ry + 1); }); },
            { peak: 0.6, settle: 0.6, hold: 1, tick: () => { if (Math.random() < 0.04) V.spawn({ x: rx + rnd(-10, 10), y: c.ty, z: 30, vz: -20, life: 0.7, size: 5, size1: 0, color: '#a8b0ff' }); } });
          for (let i = 0; i < 8; i++) V.spawn({ x: c.tx + (Math.random() - 0.5) * 40, y: c.ty, z: 20, vz: 40 + Math.random() * 50, life: 1.2, size: 7, size1: 0, color: '#a8b0ff' }); vfxShake(3); });
      },
    },
    ranger: {
      // a glint on the bow, the arrow, a puff of dust where it bites
      // (archer sheet, Quick Shot) a glint on the bow, rings of air bursting off it, a big arrow with speed lines, and a
      // puff of dust and chips where it bites. Under Barrage (its marker on the hero) three arrows go, fanned
      quick: c => { const b = ahead(c, 16), ang = Math.atan2(c.ty - c.y, c.tx - c.x), nx = -Math.sin(ang), ny = Math.cos(ang); V.glint(b.x, b.y, { color: '#e8ffb0', size: 24 }); rangerRelease(b.x, b.y, ang, RANG_GREEN);
        const fire = (dl, off) => c.later(dl, () => { const tx = c.tx + nx * off, ty = c.ty + ny * off * 0.7, dur = Math.hypot(tx - c.x, ty - c.y) / 1300;
          rangerStreaks(c.x, c.y, tx, ty, dur, RANG_GREEN, 3);
          V.missile(c.x, c.y, tx, ty, { style: 'arrow', color: RANG_GREEN, speed: 1300, size: 1.6, onHit: (x, y) => { V.hit(x, y, '#d8ffc0', 0.6); rangerDust(x, y); } }); });
        const bar = c.ent.rangerBarrage;
        if (bar && !bar.cut && FX.now - bar.at > 0.3) { bar.cut = true; c.ent.rangerBarrage = null; [-12, 0, 12].forEach((o, i) => fire(i * 0.07, o)); c.later(0.07, () => rangerRelease(b.x, b.y, ang, RANG_GOLD, 1.3)); }
        else fire(0, 0);
        // (online-refs pass) Keen Eye lit by this shot (your own hero: the kit's stacks went up): the proc flashes on you
        const kn = rangerKeens(c), e = c.ent;
        if (kn != null) { if (kn > (e._rgKeen || 0)) c.later(0.06, () => rangerKeenProc(e, kn)); e._rgKeen = kn; } },
      // a golden glint on the drawn bow, the arrow wrapped in big spirals that carries on through the boss, a whirlwind
      // where it passes, and dust where it finally drops
      // (online-refs pass: WoW Aimed Shot / FF14 Apex Arrow) a plain Pierce is the green helix arrow with a modest burst;
      // a Keen Eye one (your own hero: the kit's stacks went down) is the drawn shot: a gold flare on the bow, a gold lance
      // of light through the boss, the whirlwind where it passes and a small shake
      pierce: c => { const b = ahead(c, 18), ang = Math.atan2(c.ty - c.y, c.tx - c.x), d = Math.hypot(c.tx - c.x, c.ty - c.y), ex = c.tx + Math.cos(ang) * 170, ey = c.ty + Math.sin(ang) * 170;
        const e = c.ent, kn = rangerKeens(c), keen = kn != null && kn < (e._rgKeen || 0); if (kn != null) e._rgKeen = kn;
        V.glint(b.x, b.y, { color: keen ? '#fff6d0' : '#ffe27a', size: keen ? 42 : 30 }); rangerRelease(b.x, b.y, ang, RANG_GOLD, keen ? 1.5 : 1.1);
        rangerStreaks(c.x, c.y, ex, ey, (d + 170) / 1500, keen ? RANG_GOLD : '#7dffb0', keen ? 4 : 3);
        V.missile(c.x, c.y, ex, ey, { style: 'helix', color: keen ? RANG_GOLD : '#7dffb0', speed: 1500, size: keen ? 1.9 : 1.5, onHit: (x, y) => { V.smoke(x, y, { n: 2, color: '#d8d0c0', size: 16, a: 0.4, speed: 40 }); V.hit(x, y, '#b0ffd0', 0.35); } });
        if (keen) c.later(0.03, () => rangerLance(b.x, b.y, ex, ey, { w: 10, dur: 0.34 }));
        c.later(d / 1500, () => { V.hit(c.tx, c.ty, keen ? '#fff2c0' : '#b0ffd0', keen ? 1.1 : 0.8);
          V.spikeburst(c.tx, c.ty, { r: keen ? 50 : 34, n: keen ? 12 : 9, color: keen ? RANG_GOLD : '#7dffb0', core: '#ffffff', ink: keen ? '#2a1c04' : '#0a2a14', dur: 0.28, z: 20 });
          V.sparks(c.tx, c.ty, { color: '#e8ffd0', n: keen ? 8 : 5, angle: ang, spread: 0.5, speed: 420 });
          if (keen) { V.tornado(c.tx, c.ty, { color: '#fff6d8', h: 92, r: 28, dur: 0.6 }); rangerDust(c.tx, c.ty, 0.8); shake(2); } else rangerDust(c.tx, c.ty, 0.5); }); },
      // (online-refs pass: WoW Rapid Fire) a stream of arrows off the bow, a small tick on the boss for each and a pop on
      // the last; inside Hunter's Mark (its recipe stamps the hero) the stream runs longer and turns gold
      rapid: c => { const e = c.ent, marked = (e._rgMarkUntil || 0) > FX.now, n = marked ? 7 : 5, col = marked ? RANG_GOLD : RANG_GREEN, ang = Math.atan2(c.ty - c.y, c.tx - c.x), nx = -Math.sin(ang), ny = Math.cos(ang), b = ahead(c, 16);
        V.glint(b.x, b.y, { color: col, size: 26 });
        for (let i = 0; i < n; i++) c.later(i * 0.065, () => { const j = rnd(-10, 10), tx = c.tx + nx * j, ty = c.ty + ny * j * 0.7, last = i === n - 1;
          if (i % 2 === 0) rangerRelease(b.x, b.y, ang, col, 0.8);
          // (each arrow a streak with an arrowhead: no trail particles, so a stream of seven stays cheap)
          OP.thrust(b.x + nx * j * 0.3, b.y + ny * j * 0.2, tx, ty, { w: last ? 6 : 4, color: col, core: '#ffffff', ink: '#1a2a0a', head: true, dur: 0.2, z: 18 });
          c.later(0.07, () => { V.hit(tx, ty, '#f0ffd8', last ? 0.7 : 0.3);
            if (last) { V.spikeburst(tx, ty, { r: marked ? 40 : 32, n: 10, color: col, core: '#ffffff', ink: '#1a2a0a', dur: 0.26, z: 20 }); V.sparks(tx, ty, { color: '#e8ffd0', n: 5, angle: ang, spread: 0.6, speed: 360 }); } }); }); },
      // (online-refs pass: WoW Trueshot + Hunter's Mark) a gold eye flares over the ranger, four gold brackets snap shut on
      // the boss (lines only, no floor disc, so a telegraph under it still reads), then the reticle stays for the 15s
      mark: c => { const e = c.ent; e._rgMarkUntil = FX.now + 15; rangerKeenProc(e, 2); V.shock(e.x, e.y, { r: 70, color: RANG_GOLD, dur: 0.4, w: 3 });
        const bx = c.tx, by = c.ty - 40;
        V.fx({ dur: 0.42, layer: 'air', draw: (cc, p, t, fx) => { const q = easeOut(Math.min(1, p / 0.5)), R = 90 - 52 * q, k = fx.a * (1 - Math.max(0, (p - 0.6) / 0.4)), L = 12;
          for (let i = 0; i < 4; i++) { const sx = i % 2 ? 1 : -1, sy = i < 2 ? -1 : 1, x = bx + sx * R, y = by + sy * R * 0.8;
            V.neonPath(cc, RANG_GOLD, 2.6, k, () => { cc.moveTo(x - sx * L, y); cc.lineTo(x, y); cc.lineTo(x, y - sy * L); }); } } });
        c.later(0.22, () => { V.spikeburst(bx, c.ty, { r: 34, n: 10, color: '#ffc850', core: '#fffbe0', ink: '#4a2a08', dur: 0.28, z: 40 }); V.burst(bx, by, { color: '#ffd27a', n: 8, speed: 120, flash: false }); });
        // (polish) the reticle stays on the boss for the debuff's 15s, turning slowly, its four ticks closing in
        const rx = c.tx, ry = c.ty - 40;
        OP.linger(15, 'air', (cc, k, t) => { const R = 30 + 14 * Math.max(0, 1 - t / 0.35);
          V.neonRing(cc, rx, ry, R, RANG_AMBER, 1.6, k, 1); V.neonRing(cc, rx, ry, R * 0.55, RANG_AMBER, 1, k * 0.5, 1);
          cc.save(); cc.translate(rx, ry); cc.rotate(t * 0.6); for (let i = 0; i < 4; i++) { cc.rotate(Math.PI / 2); V.neonPath(cc, '#ffb040', 2, k, () => { cc.moveTo(R + 9, 0); cc.lineTo(R - 7, 0); }); } cc.restore();
          V.glowAt(cc, rx, ry, 5, '#fff2c0', k); }, { peak: 1, settle: 0.42, hold: 0.8 }); },
      // a leafy dome over the ranger, leaves whirling out; then a faint green shimmer stays on the ranger for the 10s, a
      // leaf slipping off now and then
      cloak: c => { V.dome(c.ent, { color: '#8fdf7a', r: 50, dur: 1.4 }); for (let i = 0; i < 12; i++) V.spawn({ x: c.x, y: c.y, z: 10 + Math.random() * 20, life: 1.2, size: 12, color: '#5fbf4a', kind: 'leaf', add: false, vr: 6, orbit: { x: c.x, y: c.y, a: i * 0.52, r: 20, w: 5, dr: 90, flat: 0.6 } });
        V.shock(c.x, c.y, { r: 150, color: '#8fdf7a', dur: 0.6, w: 5 }); const e = c.ent;
        OP.linger(10, 'ground', (cc, k, t) => { V.neonRing(cc, e.x, e.y + 2, 30 + Math.sin(t * 2.4) * 2, '#8fdf7a', 1.6, k, 0.55); V.glowAt(cc, e.x, e.y - 10, 34, '#8fdf7a', 0.22 * k);
          for (let i = 0; i < 3; i++) { const a = t * 1.3 + i * TAU / 3; V.glowAt(cc, e.x + Math.cos(a) * 30, e.y + 2 + Math.sin(a) * 16, 5, '#d8ffb0', 0.8 * k); } },
          { peak: 0.9, settle: 0.4, hold: 1.4, tick: () => { if (Math.random() < 0.04) V.spawn({ x: e.x + rnd(-18, 18), y: e.y, z: rnd(30, 50), vz: rnd(-25, -10), vx: rnd(-15, 15), life: 1.3, size: 10, color: '#6fbf5a', kind: 'leaf', add: false, vr: rnd(-3, 3), flutter: 5 }); } }); },
      // a glint, power spiralling into the bow over a small circle; then the bow keeps a gold glow and three gold arrow
      // ticks over the hero until the next Quick Shot spends it (up to the buff's 15s; quick cuts this marker)
      barrage: c => { V.glint(c.x, c.y, { color: '#ffe27a', size: 30, z: 30 }); V.charge(c.ent.x, c.ent.y, { color: '#d8ff9a', r: 50, follow: c.ent }); V.sigil(c.x, c.y, { r: 40, style: 'star4', color: '#c8ff7a', dur: 0.8, spin: 4, follow: c.ent }); V.aura(c.ent, { color: '#c8ff7a', dur: 1.2, r: 28, rate: 0.4 });
        const e = c.ent; if (e.rangerBarrage) e.rangerBarrage.cut = true;
        e.rangerBarrage = OP.linger(15, 'air', (cc, k, t) => { const a = e.angle || 0, bx = e.x + Math.cos(a) * 16, by = e.y + Math.sin(a) * 12 - 20, pu = 0.75 + 0.25 * Math.sin(t * 5);
          V.glowAt(cc, bx, by, 16, RANG_GOLD, 0.6 * k * pu); V.glowAt(cc, bx, by, 5, '#ffffff', k);
          // (QA: bare chevrons read as a zigzag) three little gold arrows, shaft and head, standing over the hero
          for (let i = -1; i <= 1; i++) { const x = e.x + i * 9, y = e.y - 58 - Math.abs(i) * 3 + Math.sin(t * 3 + i) * 1.5; V.neonPath(cc, RANG_GOLD, 1.4, k, () => { cc.moveTo(x, y + 9); cc.lineTo(x, y - 3); cc.moveTo(x - 3.5, y + 1); cc.lineTo(x, y - 4); cc.lineTo(x + 3.5, y + 1); cc.moveTo(x - 2.5, y + 10); cc.lineTo(x, y + 7); cc.lineTo(x + 2.5, y + 10); }); } },
          { peak: 1, settle: 0.6, hold: 0.6 });
        e.rangerBarrage.at = FX.now; },
    },
    shadowblade: {
      // two daggers cross in an X (violet and steel), a few red sparks and drops
      // (rogue sheet, Swift Strike) a violet smear off the blades, then two big steel cuts crossing in an X before the
      // target, a white glint where they cross, red sparks and a few drops
      // (melee pass) pressed over and over, so two looks that alternate: the crossing X, then a driving thrust with an arrowhead and
      // a steel cut over it; the press that fills the gauge rings it once, and a hit from the back is stamped over the boss
      strike: c => { const e = c.ent, n = (e._sbN = ((e._sbN | 0) + 1) % 2), f = n === 0, ang = Math.atan2(c.ty - c.y, c.tx - c.x), p = between(c, 0.75), was = e._sbCp || 0, cp = sbPoints(c, 1), ca = Math.cos(ang), sa = Math.sin(ang);
        if (f) {
          V.slash(c.x, c.y, c.ang + 0.25, { r: 48, span: 1.3, color: '#c58aff', dur: 0.2, flip: f, sparks: 3 }); c.later(0.04, () => V.slash(c.x, c.y, c.ang - 0.25, { r: 48, span: 1.3, color: '#e8e0ff', dur: 0.2, w: 0.35, flip: !f, sparks: 2 }));
          OP.smear(c.x, c.y, c.ang, { r: 58, span: 1.8, w: 12, color: SHAD_VIO, core: SHAD_STEEL, ink: SHAD_INK, dur: 0.24, flip: f, lines: 2 });
          shadowX(p.x, p.y, ang, 1.35);
        } else {
          V.slash(c.x, c.y, c.ang - 0.3, { r: 50, span: 1.2, color: '#e8e0ff', dur: 0.18, flip: true, w: 0.4, sparks: 2 });
          OP.thrust(c.x + ca * 8, c.y + sa * 8, c.tx + ca * 16, c.ty + sa * 16, { w: 12, color: SHAD_VIO, core: '#ffffff', ink: SHAD_INK, head: true, dur: 0.22, z: 22 });
          c.later(0.03, () => { for (const s of [-1, 1]) OP.thrust(c.x - sa * s * 10, c.y + ca * s * 7, c.tx - ca * 22 - sa * s * 10, c.ty - sa * 22 + ca * s * 7, { w: 4, color: '#c58aff', core: '#ffffff', ink: SHAD_INK, dur: 0.18, z: 22 }); });
          c.later(0.07, () => V.slash(p.x, p.y, ang + 2.2, { r: 44, span: 1.1, color: '#ffffff', w: 0.3, dur: 0.16, sparks: 2 }));
        }
        c.later(0.1, () => { V.glint(p.x, p.y, { color: '#ffffff', size: 30, z: 22 }); V.hit(c.tx, c.ty, '#e0c0ff', 0.55); V.splash(c.tx, c.ty, { n: 4, size: 0.7 }); V.sparks(p.x, p.y, { color: '#ff7a6a', n: 6, speed: 300, z: 22 });
          if (sbLanded(c, 'rear')) sbFlourish(c.tx, c.ty, 'rear', 0.8);
          if (cp >= 5 && was < 5) { V.shock(c.ent.x, c.ent.y, { r: 44, r0: 10, color: SHAD_STEEL, dur: 0.3, w: 3 }); V.glint(c.ent.x + Math.cos(c.ang) * 12, c.ent.y, { color: '#ff9ac0', size: 24, z: 34 }); } }); },
      // a double cut, then a crimson starburst, a spray of blood and a splatter left on the floor
      // (melee pass) it shows what it spent: one crimson cut per combo point fanned across the target, a burst, a splash and a puddle
      // that grow with them, a pip flung out for each point, a crimson arrowhead from three up; five points add a steel X, a white
      // flash and a hit-stop, so four and five are not the same hit. A hit from the side is stamped over the boss
      evis: c => { const e = c.ent, kit = sbKit(c), cp = Math.max(1, Math.min(5, e._sbCp || 4)), ang = Math.atan2(c.ty - c.y, c.tx - c.x), ca = Math.cos(ang), sa = Math.sin(ang), full = cp >= 5, T = 0.035 * cp + 0.06;
        e._sbCp = kit ? kit.g.combo : 0;
        for (let i = 0; i < cp; i++) c.later(i * 0.035, () => V.slash(c.x, c.y, c.ang + (i - (cp - 1) / 2) * 0.34, { r: 50 + 3 * cp, span: 1.5 + 0.05 * cp, color: i % 2 ? '#ff4d9a' : '#ffd0e4', dur: 0.24, flip: i % 2 === 1, w: 0.4 + 0.04 * cp, sparks: i === cp - 1 ? 4 : 1 }));
        c.later(T, () => { const m = between(c, 0.6);
          if (cp >= 3) OP.thrust(c.x - ca * 12, c.y - sa * 12, c.tx + ca * (14 + 6 * cp), c.ty + sa * (14 + 6 * cp), { w: 6 + 2.4 * cp, color: '#d01a3a', core: '#ffe0e8', ink: '#2a0410', head: true, dur: 0.26, z: 20 });
          V.spikeburst(c.tx, c.ty, { r: 30 + 12 * cp, n: 8 + 2 * cp, color: '#d0204a', core: full ? '#ffffff' : '#ffe0ec', ink: '#2a0410', dur: 0.3 + 0.015 * cp });
          V.splash(c.tx, c.ty, { n: 4 + 2 * cp, speed: 0.9 + 0.1 * cp }); V.hit(c.tx, c.ty, full ? '#ffe0f0' : '#ff9ad0', 0.5 + 0.15 * cp);
          V.puddle(m.x, m.y, { r: 8 + 2 * cp, color: '#4a1430', dark: '#1a0612', dur: 1.2, bubbles: false, fumes: false });   // (online refs: a dark wine stain, never a red pool that reads as a telegraph)
          sbPips(c.tx, c.ty, cp, full ? '#fff0c8' : '#ff7aa8');
          if (cp >= 4) V.shock(c.tx, c.ty, { r: 54 + 14 * cp, color: '#ff4d9a', dur: 0.36, w: 2 + cp });
          if (full) { V.flash(c.tx, c.ty - 20, 96, '#ffe8f0', 0.2); shadowX(c.tx, c.ty, ang, 1.8); V.glint(c.tx, c.ty, { color: '#ffffff', size: 46, z: 24 }); V.shock(c.tx, c.ty, { r: 150, color: '#ffe8f0', dur: 0.3, w: 2, delay: 0.05 }); }
          if (cp >= 3) shake(cp - 2);
          if (full && c.mine && e.st && typeof hitStop === 'function') hitStop(e.st, 0.06, FX.now);
          if (sbLanded(c, 'flank')) sbFlourish(c.tx, c.ty, 'flank', 0.7 + 0.06 * cp); }); },
      // a dark smear slipping round the target, purple smoke hanging where you land
      step: c => { const d = Math.hypot(c.x - c.tx, c.y - c.ty) || 1; V.shadowdash(c.tx - (c.x - c.tx) / d * 60, c.ty - (c.y - c.ty) / d * 60, c.x, c.y); V.swirl(c.x, c.y, { r: 36, color: '#b070ff', dur: 0.4, inward: true });
        // (polish) smoke left hanging where the rogue vanished and where it lands, thinning over ~2s
        const d0 = { x: c.tx - (c.x - c.tx) / d * 60, y: c.ty - (c.y - c.ty) / d * 60 };
        V.smoke(d0.x, d0.y, { n: 6, r: 12, color: '#4a3a5a', size: 26, a: 0.55, speed: 30, life: 2.2 });
        // (melee pass) the landing says where you are now: a crimson arrowhead from the new spot into the target's back, a pale ring
        c.later(0.2, () => { V.smoke(c.x, c.y, { n: 7, r: 14, color: '#5a3a7a', size: 26, a: 0.6, speed: 35, life: 2.2 }); V.shock(c.x, c.y, { r: 50, color: '#b070ff', dur: 0.35, w: 3 });
          const a = Math.atan2(c.ty - c.y, c.tx - c.x), L = Math.min(70, Math.hypot(c.tx - c.x, c.ty - c.y) * 0.8);
          OP.thrust(c.x + Math.cos(a) * 10, c.y + Math.sin(a) * 10, c.x + Math.cos(a) * (10 + L), c.y + Math.sin(a) * (10 + L), { w: 9, color: '#d01a3a', core: '#ffe0e8', ink: '#2a0410', head: true, dur: 0.24, z: 22 });
          V.glint(c.x, c.y - 4, { color: '#ffd0e0', size: 24, z: 30 }); }); },
      // two dagger glints, a whirl of blades round the rogue, scratch marks left glinting, then the shadow aura
      // (online refs, WoW Shadow Dance / Kassatsu) an impulse: ink pulled in for a beat, then a snap ring, a pale flicker and
      // smoke thrown off; for the window a shadow double trails the rogue a step behind (faint, so telegraphs read through it)
      dance: c => { const e = c.ent; V.swirl(c.x, c.y, { r: 64, color: '#5a2a8a', dur: 0.16, inward: true, follow: e });
        V.glint(c.x - 14, c.y, { color: '#e8e0ff', size: 20, z: 34 }); V.glint(c.x + 14, c.y, { color: '#e8e0ff', size: 20, z: 34 });
        c.later(0.12, () => { V.flash(e.x, e.y - 24, 40, '#e8e0ff', 0.12); V.shock(e.x, e.y, { r: 86, r0: 14, color: '#b070ff', dur: 0.3, w: 3.5 }); V.vortex(e.x, e.y, { r: 72, color: '#9a4dff', dur: 0.9, follow: e });
          V.smoke(e.x, e.y, { n: 5, r: 10, color: '#2a1838', size: 24, a: 0.5, speed: 90, life: 0.8 }); shake(2); });
        V.aura(e, { color: '#b04dff', style: 'shadow', dur: 10, r: 30, rate: 0.25 });
        if (e.sbDouble) e.sbDouble.cut = true;
        const hist = [];
        e.sbDouble = OP.linger(10, 'air', (cc, k, t) => { const now = FX.now; let h = hist[0];
          for (const q of hist) { if (now - q.t >= 0.18) h = q; else break; }
          if (!h) return;
          const fa = e.angle || 0, still = Math.hypot(h.x - e.x, h.y - e.y) < 6, x = still ? e.x - Math.cos(fa) * 16 + Math.sin(t * 2) * 3 : h.x, y = still ? e.y - Math.sin(fa) * 10 : h.y, a = k * (still ? 0.5 : 0.7);
          cc.globalAlpha = 0.45 * a; cc.fillStyle = '#1a0a2a'; cc.beginPath(); cc.ellipse(x, y - 16, 8, 13, 0, 0, TAU); cc.moveTo(x + 6, y - 35); cc.arc(x, y - 35, 6, 0, TAU); cc.fill(); cc.globalAlpha = 1;
          V.neonPath(cc, '#9a4dff', 1.1, a * 0.55, () => { cc.ellipse(x, y - 16, 8, 13, 0, 0, TAU); cc.moveTo(x + 6, y - 35); cc.arc(x, y - 35, 6, 0, TAU); }); },
          { peak: 1, settle: 0.6, hold: 1, tick: () => { hist.push({ t: FX.now, x: e.x, y: e.y }); while (hist.length > 2 && FX.now - hist[1].t > 0.18) hist.shift(); } }); },
      // a dripping green cut, and a poison puddle bubbling at the target's feet
      // (rogue sheet, Poison Blades) the blade glints green and drips, a green cut with a spray of venom, a bubbling
      // puddle; then a faint green stain stays there for the poison's 24s, a bubble rising now and then
      venom: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#b8ff8a', size: 24, z: 22 });
        for (let i = 0; i < 4; i++) V.spawn({ x: h.x + rnd(-6, 6), y: h.y, z: 22, vz: -20, g: 500, life: 0.4, size: 7, color: '#8aff4a', kind: 'drop', add: false, rot: Math.PI / 2 });
        c.later(0.07, () => { V.slash(c.x, c.y, c.ang, { r: 52, span: 1.6, color: '#8aff4a', dur: 0.24 }); OP.smear(c.x, c.y, c.ang, { r: 64, span: 1.9, w: 15, color: '#5adf2a', core: '#e8ffd0', ink: '#0a1a04', dur: 0.26, lines: 2 }); });
        c.later(0.15, () => { const m = between(c, 0.6); V.splash(c.tx, c.ty, { color: '#7adf3a', n: 10 }); V.hit(c.tx, c.ty, '#b8ff8a', 0.6); V.puddle(m.x, m.y, { r: 28, color: '#7adf3a', dark: '#1e3a0a', dur: 2.6 });
          const bub = Array.from({ length: 3 }, (_, i) => ({ x: rnd(-14, 14), y: rnd(-5, 5), ph: i / 3 }));
          OP.linger(24, 'ground', (cc, k, t) => { if (t < 2) return; const kk = k * Math.min(1, (t - 2) / 0.6);
            cc.globalAlpha = 0.3 * kk; cc.fillStyle = '#2a5a10'; cc.beginPath(); cc.ellipse(m.x, m.y, 26, 12, 0, 0, TAU); cc.ellipse(m.x + 12, m.y + 4, 12, 6, 0, 0, TAU); cc.fill(); cc.globalAlpha = 1;
            V.neonRing(cc, m.x, m.y, 24, '#7adf3a', 1.1, kk * 0.6, 0.48);
            for (const b of bub) { const q = (t * 0.6 + b.ph) % 1; V.glowAt(cc, m.x + b.x, m.y + b.y - q * 6, 2 + q * 4, '#b8ff8a', kk * Math.sin(q * Math.PI)); } },
            { peak: 0.6, settle: 0.6, hold: 1 }); }); },
      // a little bomb tossed down, a pop and a big dense cloud over the party (the kit's r140); it thins to a faint
      // haze with wisps and a violet edge that holds for the buff's 10s (low, so telegraphs read through it)
      // (QA: the pop whited out the middle of the cloud) a small pop flash
      smoke: c => { V.smokebomb(c.x, c.y, { r: 140, color: '#8a7a9a', dur: 2.2, a: 0.5, n: 18, sx: c.x + Math.cos(c.ang) * 10, sy: c.y - 6, flashR: 36 });
        const x = c.x, y = c.y, r = 140;
        OP.linger(10, 'ground', (cc, k) => { cc.globalAlpha = 0.12 * k; cc.fillStyle = '#2a1838'; cc.beginPath(); cc.ellipse(x, y, r, r * 0.78, 0, 0, TAU); cc.fill(); cc.globalAlpha = 1; V.neonRing(cc, x, y, r, '#8a5ac0', 1.4, k * 0.55, 0.78); },
          { peak: 0.7, settle: 0.45, hold: 2, tick: (p, dt, e) => { if (!e.cut && Math.random() < 0.3) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.85;
            V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: rnd(0, 12), vz: rnd(5, 15), vx: rnd(-8, 8), drag: 0.05, life: rnd(1.6, 2.4), size: rnd(26, 40), size1: 54, color: '#6a5a7a', kind: 'smoke', add: false, a: 0.14, fadeIn: 0.3, fadePow: 2 }); } } }); },
    },
    pyromancer: {
      // (online-refs pass: WoW Fireball, the filler) a flame in the hand, the fireball with its comet tail, a cushion of
      // flame puffs round a white-hot heart, a modest starburst and two puffs of smoke; no scorch and no shake, so the
      // Pyroblast's hit is the one that feels big. A crit that lights Heating Up / Hot Streak flashes on your hands
      fireball: c => { const h = ahead(c, 16), pr = pyroProcs(c); V.glint(h.x, h.y, { color: '#ffb040', size: 24, z: 24 }); V.spawn({ x: h.x, y: h.y, z: 22, life: 0.22, size: 22, size1: 6, color: '#ff8a2a' });
        V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ff8c2a', speed: 700, arc: 16, size: 1.4, onHit: (x, y) => { V.flash(x, y - 16, 56, '#ffb050', 0.18); pyroPillow(x, y, 30);
          V.spikeburst(x, y, { r: 50, n: 12, color: '#ff8a2a', core: '#fff0b0', dur: 0.3 }); V.shock(x, y, { r: 66, color: '#ffa040', dur: 0.32, w: 4 });
          V.smoke(x, y, { n: 2, r: 14, color: '#5a4a48', size: 22, a: 0.4, speed: 35, life: 1 }); } });
        pyroProcBeat(c, pr); },
      // (online-refs pass: WoW Pyroblast / FF14 Fire IV) the hard cast: a burning rock lobbed high, a big starburst, rocks,
      // a short scorch and a shake. Spent from Hot Streak (your own hero) it bursts straight off the hand instead: a ring of
      // flame kicks out round the mage, a fast fat fireball with a gold heart, and the same big hit
      pyro: c => { const h = ahead(c, 16), pr = pyroProcs(c), hs = !!pr && pr.prev === 2 && pr.now < 2;
        const hit = (x, y) => { V.spikeburst(x, y, { r: 72, n: 16, color: '#ff6a1a', core: hs ? '#fff6d0' : '#fff0b0', dur: 0.42 }); pyroPillow(x, y, 40); V.flare(x, y, { n: 6, r: 22, size: 1.2, h: 1.2 }); V.shock(x, y, { r: 110, color: '#ff8a3a', dur: 0.5, w: 7 });
          V.flash(x, y - 18, 80, hs ? '#ffe08a' : '#ffb050', 0.22); V.debris(x, y, { n: 3, hot: true, color: '#4a3226' }); V.decal(x, y, { r: 40, embers: true, dur: 1.4 }); V.smoke(x, y, { n: 3, r: 26, color: '#5a4a48', size: 30, a: 0.42, speed: 50, life: 1.4 }); shake(hs ? 5 : 6); };
        if (hs) { V.glint(h.x, h.y, { color: '#fff2c0', size: 40, z: 26 }); V.shock(c.x, c.y, { r: 58, r0: 12, color: '#ffb040', dur: 0.3, w: 4 }); V.blaze(c.ent, { r: 34, dur: 0.45 });
          V.missile(h.x, h.y, c.tx, c.ty, { style: 'fire', color: '#ff7a1a', speed: 950, arc: 12, size: 2.2, onHit: hit }); }
        else { V.glint(h.x, h.y, { color: '#ffd070', size: 30, z: 26 }); V.charge(c.x, c.y, { color: '#ff8a3a', r: 40, n: 8, dur: 0.25 });
          V.missile(c.x, c.y, c.tx, c.ty, { style: 'meteor', color: '#ff5a1a', speed: 560, arc: 50, onHit: hit }); }
        if (pr && pr.now > (hs ? 0 : pr.prev)) { const e = c.ent; c.later(0.1, () => pyroHandProc(e, pr.now)); } },
      // (online-refs pass: WoW Fire Blast, instant and always a crit) a snap of flame off the fingertips, a white crit star
      // inside a fat starburst on the boss, a few sparks and grey smoke; the proc it lights flashes on your hands
      fireblast: c => { const h = ahead(c, 18), pr = pyroProcs(c); V.glint(h.x, h.y, { color: '#ffb040', size: 26 }); V.spawn({ x: h.x, y: h.y, z: 22, life: 0.16, size: 26, size1: 4, color: '#ff8a2a' });
        c.later(0.06, () => { V.spikeburst(c.tx, c.ty, { r: 56, n: 14, color: '#ff8a1a', core: '#fff6d0', dur: 0.32 }); V.spawn({ x: c.tx, y: c.ty, z: 22, life: 0.22, size: 46, size1: 14, color: '#fff2c0', kind: 'star', vr: 5 });
          V.flash(c.tx, c.ty - 14, 54, '#ffb050', 0.18); V.sparks(c.tx, c.ty, { color: '#ffd070', n: 6, speed: 380 }); });
        c.later(0.2, () => V.smoke(c.tx, c.ty, { n: 4, r: 24, color: '#5a5050', size: 26, a: 0.45, speed: 50, life: 1.3 }));
        pyroProcBeat(c, pr); },
      // heat spirals in, then a fire spiral wraps the mage and flies apart into embers; the flame aura stays on
      combust: c => { V.charge(c.x, c.y, { color: '#ffb040', r: 50, n: 10, dur: 0.3, follow: c.ent }); V.sigil(c.x, c.y, { r: 66, style: 'star5', color: '#ff7a1a', dur: 1.2, spin: 2.5 }); V.blaze(c.ent, { r: 50, dur: 1.6 }); V.aura(c.ent, { color: '#ff6a1a', style: 'flame', dur: 10, r: 30, rate: 0.3 });
        // (polish, fire sheet) a ring of flame stands round the mage for the burst's 10s
        c.later(0.25, () => { pyroFireRing(c.ent, 9.75); V.shock(c.ent.x, c.ent.y, { r: 90, color: '#ffb040', dur: 0.45, w: 5 }); }); },
      // a meteor called down on a rune circle: a cracked, burning crater is left behind
      vent: c => V.meteor(c.tx, c.ty, { r: 80, color: '#ffa040', wind: 0.32, fall: 0.28, onHit: () => shake(7) }),   // (r: the kit's 80; online-refs pass: an amber rune ring, never telegraph red)
      // a cone of fire breathed at the boss, then embers, scorch and a smoky haze over the party
      smolder: c => { const L = Math.min(240, Math.max(120, Math.hypot(c.tx - c.x, c.ty - c.y))); V.breath(c.x, c.y, Math.atan2(c.ty - c.y, c.tx - c.x), { len: L, span: 0.75 }); V.shock(c.x, c.y, { r: 130, color: '#ff8a5a', dur: 0.6 });
        c.later(0.7, () => V.smoke(c.x, c.y, { n: 6, r: 60, color: '#5a3a4a', size: 34, speed: 40, a: 0.35, life: 1.8 }));
        // (polish) the boss smoulders for the debuff's 10s: embers circling its middle, a dark wisp rising off it
        const bx = c.tx, by = c.ty;
        if (Math.hypot(bx - c.x, by - c.y) > 10) c.later(0.35, () => OP.linger(9.6, 'air', (cc, k, t) => { const cy = by - 34;
          V.neonPath(cc, '#ff8a3a', 1.2, k * 0.55, () => cc.ellipse(bx, cy, 32, 10, 0, 0, TAU));
          for (let i = 0; i < 6; i++) { const a = t * 1.2 + i * TAU / 6; V.glowAt(cc, bx + Math.cos(a) * 32, cy + Math.sin(a) * 10, 7, '#ff6a1a', k * (0.6 + 0.4 * Math.sin(t * 7 + i))); } },
          { peak: 1, settle: 0.5, hold: 0.8, tick: () => { if (Math.random() < 0.06) V.spawn({ x: bx + rnd(-14, 14), y: by, z: 50, vz: rnd(20, 40), life: 1.4, size: 14, size1: 28, color: '#4a3a3a', kind: 'smoke', add: false, a: 0.3, fadeIn: 0.2 }); } })); },
    },
    cleric: {
      // Smite: a gold glint gathers high over the boss, a shaft of light drops, a gold starburst and ring where it lands
      smite: c => { const n = clericSmiteN++ % 3, side = Math.random() < 0.5 ? -1 : 1, hand = ahead(c, 16);
        V.glint(hand.x, hand.y, { color: CLER_GOLD, size: 22, z: 34 });
        V.glint(c.tx, c.ty - 90, { color: CLER_GOLD, size: 34, z: 0 }); V.spawn({ x: c.tx, y: c.ty - 90, z: 0, life: 0.14, size: 30, size1: 8, color: CLER_PALE });
        const drop = (dx, h, w, d) => c.later(d, () => V.beam(c.tx + dx, c.ty - h, c.tx, c.ty, { color: '#fff0a8', w, dur: 0.34 }));
        if (n === 0) drop(0, 280, 16, 0.08); else if (n === 1) drop(side * 90, 230, 12, 0.07); else { drop(-34, 270, 8, 0.05); drop(34, 270, 8, 0.08); drop(0, 300, 11, 0.11); }
        c.later(n === 2 ? 0.17 : 0.13, () => { V.flash(c.tx, c.ty - 20, 70, CLER_GOLD, 0.2);
          if (n === 0) V.spikeburst(c.tx, c.ty, { r: 50, n: 12, color: '#ffd65a', core: '#fffbe0', ink: '#3a2a08', dur: 0.32, z: 18 });
          else if (n === 1) { V.spikeburst(c.tx, c.ty, { r: 44, n: 10, color: '#ffd65a', core: '#fffbe0', ink: '#3a2a08', dur: 0.3, z: 16 }); V.sigil(c.tx, c.ty, { r: 34, style: 'star4', color: '#ffd65a', dur: 0.4, spin: 6 }); }
          else { V.spikeburst(c.tx, c.ty, { r: 62, n: 14, hole: 0.5, color: '#ffd65a', core: '#fffbe0', ink: '#3a2a08', dur: 0.36, layer: 'ground', z: 0, flat: 0.6 }); V.spikeburst(c.tx, c.ty, { r: 34, n: 8, color: '#fff0a8', core: '#ffffff', ink: '#3a2a08', dur: 0.26, z: 22 }); }
          V.glint(c.tx, c.ty - 14, { color: '#fffbe0', size: n === 2 ? 54 : 44, z: 20, life: 0.34 });
          V.burst(c.tx, c.ty, { color: '#fff4c0', color2: '#ffffff', n: 10, speed: 230, kind: 'star', flash: false }); V.shock(c.tx, c.ty, { r: 72, color: CLER_GOLD, dur: 0.36, w: 5 }); V.sparks(c.tx, c.ty, { color: CLER_PALE, n: 6, speed: 300 }); shake(n === 2 ? 2.5 : 2); });
        // Inquisitor: the strike leaves a burning brand on the boss
        if (c.ent.spec === 'inquisitor') c.later(0.1, () => { V.sigil(c.tx, c.ty, { r: 36, style: 'star4', color: '#ff9a3c', dur: 1.2, spin: 2 }); V.flare(c.tx, c.ty, { n: 6, r: 10, color: '#ff8a2a', size: 0.7 }); });
      },
      // Aegis: holy light falls on the ally and hardens into a golden dome
      barrier: c => { V.lightfall(c.tx, c.ty, { color: '#ffe9a8', r: 30, h: 220, dur: 0.9, feathers: 5 }); const w = c.tent || c.ent; c.later(0.25, () => V.dome(w, { color: '#ffd86a', r: 52, dur: 2.6 })); },
      // Inquisitor: a lance of holy fire that scorches a brand into the boss
      condemn: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ffb04a', speed: 1100, size: 1.2, onHit: (x, y) => {
        V.flare(x, y, { n: 18, r: 16, color: '#ff9a3c' }); V.sigil(x, y, { r: 54, style: 'star4', color: '#ff9a3c', dur: 1.6, spin: 1.5 }); V.shock(x, y, { r: 90, color: '#ffc070', dur: 0.4, w: 5 });
        V.burst(x, y, { color: '#ffe0a0', color2: '#ffffff', n: 14, speed: 260, flashR: 60 }); V.decal(x, y, { r: 40, embers: true, dur: 3 }); vfxShake(4); } }),
      // holy light falls on the ally in shafts, a few feathers drift down, a golden ring lingers
      // (online-refs pass: Mend is the slow, deliberate heal, so it lands like Holy Word: Serenity) a gold halo forms over
      // the ally's head and sinks down through them as the light falls, then light lifts off them with a rising cross
      mend: c => { const w = c.tent || { x: c.tx, y: c.ty };
        clericHalo(w, { dur: 0.42 }); V.lightfall(w.x, w.y, { color: '#ffe680', r: 34, h: 230, dur: 0.85, feathers: 3 });
        c.later(0.24, () => { V.flash(w.x, w.y - 24, 46, CLER_GOLD, 0.22); V.shock(w.x, w.y, { r: 58, color: CLER_GOLD, dur: 0.42, w: 3 }); clericRise(w, { n: 7 }); V.plus(w.x, w.y, { color: '#ffe680', n: 4 }); }); },
      // a glint, a flash and a ring on the ally, petals whirling round them and drifting down after; then the 15s mend
      // over time shows as a faint gold ring under them, motes and petals slipping off, a small plus at each tick
      petal: c => { const w = c.tent || { x: c.tx, y: c.ty }, far = Math.hypot(c.tx - c.x, c.ty - c.y) > 40;
        // (the main heal, pressed all fight: a pink petal-orb flies from the cleric and lands as a stamped blossom, a pink starburst and a rising plus)
        const land = () => { clericBlossom(w, { r: 28 }); V.glint(c.tx, c.ty, { color: '#ffe9a8', size: 34, z: 34 }); V.flash(c.tx, c.ty - 20, 52, '#ffe9a8', 0.25);
          /* (online-refs pass: a soft pink lift instead of an inked starburst, so the instant heal reads as a heal) */ clericRise(w, { color: CLER_PINK, n: 5, cross: false }); V.shock(c.tx, c.ty, { r: 58, color: '#ffc4da', dur: 0.4, w: 4 }); clericHot(w, 15);
          for (let i = 0; i < 10; i++) V.spawn({ x: c.tx, y: c.ty, z: 8 + i * 3, life: 1, size: 12, color: i % 2 ? '#ffd0e0' : '#fff0a8', kind: 'petal', add: false, vr: 5, flutter: 6, orbit: { x: c.tx, y: c.ty, a: i * 0.63, r: 30, w: 4, dr: -20, flat: 0.55 } }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 3 }); };
        if (far) { V.glint(c.x, c.y - 24, { color: '#ffe9a8', size: 20, z: 20 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#ffc4da', speed: 1300, size: 0.8, arc: 18, onHit: land }); } else land();
        c.later(0.9, () => { for (let i = 0; i < 4; i++) V.spawn({ x: c.tx + (Math.random() - 0.5) * 50, y: c.ty + (Math.random() - 0.5) * 16, z: 40 + Math.random() * 20, vz: -25, vx: (Math.random() - 0.5) * 30, life: 1.4, size: 10, color: i % 2 ? '#ffd0e0' : '#fff0a8', kind: 'petal', add: false, vr: 2, flutter: 4 }); });
        if (c.ent.spec === 'aegis' && c.tent) c.later(0.3, () => V.shield(c.tent, { color: '#ffe9a8', dur: 1.4, r: 38 })); },
      // a great holy circle on the floor, light and feathers falling into its middle
      // (the circle flares for a moment, then a faint holy rim holds there for the 15s of healing, motes rising off it)
      // (online-refs pass: a party cooldown announces once, then gets out of the way, like Liturgy of the Bell / Temperance)
      // a gold bell hangs over the cleric and tolls twice, each toll a ring running out over the party; the hex flares
      // without a dark disc under the party, and only the thin rim holds
      prayer: c => { const x = c.x, y = c.y; clericBell(c.ent, { dur: 1.3, tolls: [0.15, 0.6], later: c.later }); V.sigil(x, y, { r: 160, style: 'hex', color: '#ffe680', dur: 0.7, spin: 0.4 }); V.lightfall(x, y, { color: '#fff0b0', r: 40, h: 90, dur: 0.9, feathers: 5 });
        OP.rim(x, y, 160, CLER_GOLD, 15, { style: 'hex', settle: 0.2, ticks: 24, spin: 0.1, tick: () => { if (Math.random() < 0.12) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * 150; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: 0, vz: rnd(25, 50), life: 1.2, size: rnd(4, 7), size1: 0, color: CLER_PALE, kind: Math.random() < 0.3 ? 'star' : 'glow' }); } } }); },
      // a towering column of light and feathers, a holy seal under the ally, a white burst as they rise
      // (QA: lightfall + a white pillar stacked into a solid white column that hid the ally for 1.6s) one gold column,
      // slimmer and shorter, a small flash
      intervene: c => { V.lightfall(c.tx, c.ty, { color: '#ffe9a0', r: 36, h: 340, dur: 1.4, feathers: 10 }); V.pillar(c.tx, c.ty, { r: 22, h: 320, color: '#ffe680', dur: 0.9 });
        c.later(0.2, () => { V.ink(c.tx, c.ty, { r: 70, dur: 1.6 }); V.sigil(c.tx, c.ty, { r: 70, style: 'star4', color: '#ffe680', dur: 1.6, spin: 1 }); V.burst(c.tx, c.ty - 40, { color: '#ffffff', color2: '#ffe680', n: 14, speed: 200, flashR: 40 }); }); },
      // light falls on the ally, then a golden bubble, a burst of stars and rising crosses
      bene: c => { V.lightfall(c.tx, c.ty, { color: '#ffe680', r: 30, h: 240, dur: 0.8, feathers: 4 }); clericHalo(c.tent || { x: c.tx, y: c.ty }, { dur: 1.3, to: 62, r: 16 });   // (online-refs pass: a crown halo settles on them)
        c.later(0.15, () => { if (c.tent) V.shield(c.tent, { color: '#ffe680', dur: 1.6, r: 40 }); V.burst(c.tx, c.ty - 10, { color: '#fff0a8', color2: '#ffffff', n: 12, speed: 220, kind: 'star' }); V.shock(c.tx, c.ty, { r: 70, color: '#ffe680', dur: 0.4 }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 5 }); }); },
    },
    grovekeeper: {
      // (Wrath, Rejuvenate, Wild Growth, Bloom and Moonwell are in the Grovekeeper block of 'ULTIMATES · healers', with
      // the helpers they share with World Tree)
      // (Thornlash is with the Wrath, Rejuvenate and Bloom in the Grovekeeper block of 'ULTIMATES · healers')
      // a shaft of green light, a flower circle under the ally, a swirl, and leaves drifting off as they rise
      rebirth: c => { V.lightfall(c.tx, c.ty, { color: '#a8ff9a', r: 40, h: 280, dur: 1.6, feathers: 0 }); V.grove(c.tx, c.ty, { r: 60, dur: 2.2, color: '#8fff7a', color2: '#ffd0e8', flowers: 5, rate: 0.4, tint: '#1a3a10' }); V.swirl(c.tx, c.ty, { r: 50, color: '#8fff7a', dur: 1.4 });
        c.later(1.4, () => V.motes(c.tx, c.ty, { kind: 'leaf', color: '#8fff7a', n: 10, r: 40 })); },
      // Lifebinder: a small blooming circle under the ally, vines curling, flowers opening
      lifebind: c => { V.grove(c.tx, c.ty, { r: 44, dur: 1.8, color: '#6fffb0', color2: '#ffd0e8', flowers: 4, follow: c.tent, rate: 0.5 }); V.plus(c.tx, c.ty, { color: '#7dff9a', n: 3 }); },
    },
    chronomancer: {
      // (Temporal Bolt, Accelerando and Recall moved to the Chronomancer block of 'ULTIMATES · healers' in the online-refs pass)
      // (Rewind, Shift and Stasis are in the Chronomancer block of 'ULTIMATES · healers', with Time Reversal's helpers)
      // Echoist: the clock face rings out three times, each ring a softer echo of the last
      // (QA) the 160px clock is a moment, not a mark: 1.3s, so it's gone before it sits over a telegraph at full strength
      chamber: c => { V.sigil(c.x, c.y, { r: 160, style: 'clock', color: '#c4a8ff', dur: 1.3, spin: 2 }); for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 150 + i * 30, color: '#b48cff', dur: 0.6, w: 5 - i * 1.3, delay: i * 0.3 }); V.burst(c.x, c.y - 20, { color: '#e8dcff', n: 12, speed: 180, kind: 'star' }); },
    },
  };
})();

// Class-specific moments (perfect block, overheat...) and the shared dash.
const KIT_VFX = {
  // an item enhancement firing: a quick golden flare in the hero's colour
  empower: e => { VFX.flash(e.x, e.y - 20, 40, '#ffd27a', 0.25); VFX.motes(e.x, e.y, { color: (e.cls && e.cls.accent) || '#ffd27a', n: 6, r: 22, kind: 'star' }); VFX.shock(e.x, e.y, { r: 46, color: '#ffd27a', w: 3, dur: 0.3 }); },
  // a shield or a damage cut the caster just put on the whole party (main.js partyWard, raid-host.js for bots; War Cry,
  // Rally Banner, Sanctum, Prayer Circle, the party shields of Ultimates...): a brief flash in the caster's colour on every
  // other living party member, read from the party as it stands on this client (FX.party): a bubble and sparks for a
  // shield, a smaller, shorter bubble for a damage cut (the hex shape costs ~450 canvas calls a hero, too dear here).
  // Always at the dimmed teammate scale; the caster's own recipe dresses the caster
  partyWard: (e, target, d) => {
    const list = typeof FX.party === 'function' ? FX.party() : [FX.me], mit = !!(d && d.m), col = e.cls && e.cls.id === 'bloodreaver' ? '#ff3a4a' : (e.cls && e.cls.accent) || '#e8f4ff';
    const sc = Math.min(typeof VFX.scale === 'number' ? VFX.scale : 1, 0.6);
    OLD_PAINT.later(0.25, () => { const p = VFX.scale; VFX.setScale(sc);
      try { for (const w of list) { if (!w || w === e || w.x == null) continue;
        VFX.shield(w, { color: col, dur: mit ? 0.6 : 0.8, r: mit ? 32 : 36 }); if (!mit) VFX.sparks(w.x, w.y - 10, { color: col, n: 4, speed: 150 }); } }
      finally { VFX.setScale(typeof p === 'number' ? p : 1); } });
  },
  // a Perfect Block: the Brace plate flares (bastionPlate), a gold flash on its face, a gold ring and a steel one
  // (the block spends the guard (fight.js takes its Brace off), so once the flare has shown the plate comes down too)
  perfect: e => { const pl = e.bastionPlate; if (pl && !pl.cut) { pl.pb = true; OLD_PAINT.later(0.4, () => { pl.cut = true; if (e.bastionPlate === pl) e.bastionPlate = null; }); }
    VFX.flash(e.x + Math.cos(e.angle) * 36, e.y + Math.sin(e.angle) * 30 - 16, 64, '#ffe27a', 0.22); VFX.shock(e.x, e.y, { r: 130, color: '#9fc4ff', dur: 0.5, w: 4, delay: 0.06 });
    VFX.shock(e.x, e.y, { r: 90, color: '#ffe27a', dur: 0.4, w: 7 }); VFX.spawn({ x: e.x + Math.cos(e.angle) * 30, y: e.y + Math.sin(e.angle) * 30, z: 18, life: 0.3, size: 80, size1: 30, color: '#ffe27a', kind: 'star', vr: 5 }); VFX.sparks(e.x + Math.cos(e.angle) * 30, e.y + Math.sin(e.angle) * 30, { color: '#fff2b0', n: 12, angle: e.angle, spread: 1, speed: 420 }); vfxShake(4); },
  // Hold Fast held a Brace past its 3s (kits.js, data.d: the guard's real length): the plate just raised stays that long
  braceHold: (e, target, d) => { const pl = e.bastionPlate, dur = d && Number.isFinite(d.d) ? Math.max(0.5, Math.min(8, d.d)) : 0;
    if (pl && !pl.cut && dur) pl.dur = dur; },
  // Crusader: a Radiant Holy Edge leaves as a beam of light toward the boss
  radiant: (e, target) => { const t = target || { x: e.x + Math.cos(e.angle) * 200, y: e.y + Math.sin(e.angle) * 200 }; VFX.beam(e.x, e.y, t.x, t.y, { color: '#fff2b0', w: 14, dur: 0.4 }); VFX.burst(e.x, e.y, { color: '#ffe27a', color2: '#ffffff', n: 14, speed: 240, kind: 'star' }); },
  // Runeguard: a Runic Ward ends and blasts (kits.js runeWardEnd; data.f: how much of it was soaked, 0-1): the ward's
  // plates break off the holder in a burst of runes, crystals and a ring sized by f, and a violet bolt runs to the enemy
  wardBlast: Object.assign((e, target, d) => {
    const f = Math.max(0, Math.min(1, (d && d.f) || 0)), wf = e.rgWard, old = wf && FX.now - wf.at > 0.25, w = old && wf.w && wf.w.x != null ? wf.w : e, R = 40 + 110 * f, cam = FX.camFor(e);
    if (old) { wf.cut = true; e.rgWard = null; }
    // (QA: indigo, and the burst a ring of spikes on the floor round the holder rather than a solid star over them)
    // (the blast grows with what the Ward soaked: a spent-out Ward is a small crack of runes, a full one a ring of spikes and
    // three rings, a pillar of light, a cracked floor and a kick of the screen)
    VFX.flash(w.x, w.y - 20, 30 + 60 * f, f > 0.8 ? '#ffffff' : '#c8ceff', 0.22);
    VFX.spikeburst(w.x, w.y, { r: R * 0.9, n: 8 + Math.round(12 * f), hole: 0.5, color: '#6c74f2', core: '#eef1ff', ink: '#0c1236', fill: '#2a3070', dur: 0.4 + 0.1 * f, layer: 'ground', z: 0, flat: 0.6 });
    VFX.crystals(w.x, w.y, { color: '#9aa4ff', n: 3 + Math.round(7 * f), r: 26 + 40 * f, h: 26 + 44 * f, dur: 0.8 });
    VFX.shock(w.x, w.y, { r: R + 30, color: '#8e98ff', dur: 0.45, w: 3 + 5 * f });
    if (f > 0.4) VFX.shock(w.x, w.y, { r: (R + 30) * 0.7, color: '#e4e8ff', dur: 0.4, w: 3 + 3 * f, delay: 0.06 });
    if (f > 0.75) VFX.shock(w.x, w.y, { r: (R + 30) * 1.35, color: '#6c74f2', dur: 0.55, w: 8, delay: 0.1 });
    if (f >= 0.5) VFX.pillar(w.x, w.y, { r: 18 + 16 * f, h: 110 + 150 * f, color: '#8e98ff', dur: 0.6 });
    if (f >= 0.7) VFX.decal(w.x, w.y, { style: 'crack', r: 36 + 30 * f, dur: 1.8, a: 0.45, seed: Math.random() * 6 });
    VFX.sigil(w.x, w.y, { r: Math.min(100, R), style: 'runes', color: '#b8c0ff', dur: 0.6, spin: 5 });
    for (let i = 0; i < 4 + Math.round(10 * f); i++) { const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 160 + 60 * f; VFX.spawn({ x: w.x, y: w.y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: 60 + Math.random() * 120, g: 500, bounce: true, life: 0.5 + Math.random() * 0.4, size: 7 + Math.random() * 4, color: '#e8e0ff', kind: 'shard', add: false, vr: Math.random() * 20 - 10 }); }
    if (target) { VFX.lightning(w.x, w.y - 20, target.x, target.y - 20, { color: '#c8ceff', jag: 10, dur: 0.25 }); OLD_PAINT.later(0.06, () => VFX.hit(target.x, target.y, '#b8c0ff', 0.6 + 0.9 * f)); }
    if (cam && f >= 0.6) cam.punch(0.02 + 0.04 * f, 0.4);
    vfxShake(1 + 5 * f);
  }, { atTarget: true }),
  'rune-echo': e => { VFX.crystals(e.x, e.y, { color: '#8e98ff', n: 8, r: 44, h: 50 }); VFX.burst(e.x, e.y, { color: '#d0d6ff', n: 14, speed: 240 }); },
  // Oathbroker: a Collect strike pays off the Ledger's last line: the books stamped clean in gold over the knight
  paidFull: e => { VFX.sigil(e.x, e.y, { r: 34, style: 'hex', color: '#f0d890', dur: 0.5, spin: 2 }); VFX.burst(e.x, e.y - 24, { color: '#f0d890', color2: '#ffffff', n: 10, speed: 160, kind: 'star' }); if (globalThis.FX && FX.text) FX.text(e.x, e.y - 58, 'Paid', '#f0d890', 13); },
  reflect: (e, target) => { if (target) VFX.beam(e.x, e.y, target.x, target.y, { color: '#e4e8ff', w: 12, dur: 0.4 }); VFX.burst(e.x, e.y, { color: '#ffffff', color2: '#dde3ff', n: 16, speed: 260, kind: 'star' }); },
  overheat: e => { VFX.flare(e.x, e.y, { n: 24, color: '#ff2a1a', r: 18 }); VFX.shock(e.x, e.y, { r: 90, color: '#ff3a1a', dur: 0.4 }); },
  dawnstar: (e, target) => { const t = target || e; /* (QA: whited out the boss) */ VFX.beam(t.x, t.y - 300, t.x, t.y, { color: '#ffe680', w: 11, dur: 0.45 }); VFX.burst(t.x, t.y, { color: '#ffe680', color2: '#ffffff', n: 20, speed: 320, kind: 'star', flashR: 44 }); VFX.sigil(t.x, t.y, { r: 90, style: 'star4', color: '#ffe680', dur: 0.9, spin: 4 });
    // (online-refs pass: the one big hit of the filler loop, like Afflatus Misery after the Glares) a wide ring of gold
    // rays stamped round the boss's feet and a second, later ring, so it outlasts and outsizes a Smite
    VFX.spikeburst(t.x, t.y, { r: 120, n: 16, hole: 0.55, color: '#ffd65a', core: '#fffbe0', ink: '#3a2a08', dur: 0.5, layer: 'ground', z: 0, flat: 0.6 }); VFX.shock(t.x, t.y, { r: 170, color: '#fff0b0', dur: 0.6, w: 6, delay: 0.12 }); vfxShake(5); },
  lag: e => { VFX.smoke(e.x, e.y, { n: 6, color: '#8aa0a8', size: 22, a: 0.5 }); },
  // Aegis: a Petal shield that held comes back as a petal drifting home
  'petal-back': e => { for (let i = 0; i < 6; i++) VFX.spawn({ x: e.x, y: e.y, z: 30 + i * 4, life: 0.9, size: 12, color: i % 2 ? '#ffd0e0' : '#fff0a8', kind: 'petal', add: false, vr: 5, flutter: 6, orbit: { x: e.x, y: e.y, a: i, r: 40, w: 5, dr: -40, flat: 0.55 } }); VFX.flash(e.x, e.y - 20, 30, '#ffe9a8', 0.25); },
  // Echoist: a fainter copy of the Bolt, three seconds late
  echo: (e, target) => { if (target) VFX.missile(e.x, e.y, target.x, target.y, { style: 'orb', color: '#c4a8ff', speed: 800, size: 0.75, onHit: (x, y) => VFX.hit(x, y, '#e0d4ff', 0.6) }); },
  // Inquisitor: an ally's hit bursts a charge of the brand on the boss
  brandHit: (e, target) => { if (target) { VFX.flare(target.x, target.y, { n: 5, r: 12, color: '#ff9a3c', size: 0.6, h: 0.7 }); VFX.hit(target.x, target.y, '#ffc070', 0.5); } },
  // the dash: each class has its own (DASH_VFX, below: a start burst, a trail, an arrival)
  dash: (e, color) => { if (typeof DASH_VFX !== 'undefined' && DASH_VFX.start(e, color)) return; VFX.smoke(e.x, e.y, { n: 4, color: '#d8ccb8', size: 18, a: 0.6, speed: 40 }); VFX.shock(e.x, e.y, { r: 36, color: color || '#ffffff', dur: 0.3, w: 3 }); },
  // the tanks' taunts, one per class (TAUNT in kits.js), built from each class's own look:
  //   Bastion's Challenge: steel on the shield, gold rings of sound and a line of gold light that lands as a star
  //   Bloodreaver's Reaver's Hook: a red chain thrown out to the target, a hook-bite of blood, then it snaps back
  //   Runeguard's Binding Rune: a lilac rune stamped on the target, its light running back to the warder
  taunt: (e, target) => {
    const id = e.cls && e.cls.id, col = (e.cls && e.cls.accent) || '#ffd27a';
    const sx = e.x, sy = e.y - 18, tx = target ? target.x : e.x, ty = target ? target.y - 26 : e.y;
    const L = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx);
    if (id === 'bloodreaver') {
      VFX.shock(e.x, e.y, { r: 60, color: '#ff5a5a', w: 4, dur: 0.3 });
      if (!target || L < 10) return;
      // (polish) the tank sheet's iron chain: dark red-iron links and a hook, out in 0.18s, a bite of blood, reeled back
      OLD_PAINT.chain(sx, sy, tx, ty, { head: 'hook', metal: '#8a6a68', glow: '#ff3a3a' });
      OLD_PAINT.later(0.17, () => { VFX.hit(tx, ty, '#ff4a4a', 1.1); VFX.spikeburst(tx, ty + 26, { r: 44, n: 10, color: '#d0203a', core: '#ffd0d0', ink: '#2a0408', dur: 0.3, z: 26 });
        VFX.splash(tx, ty + 26, { n: 10, speed: 1.1 }); VFX.sparks(tx, ty, { color: '#c0101a', n: 9, angle: ang + Math.PI, spread: 0.8, speed: 260 });
        VFX.smoke(tx, ty + 26, { n: 4, color: '#a08a78', size: 22, a: 0.45, speed: 50 }); vfxShake(2); });
      OLD_PAINT.later(0.5, () => VFX.smoke(e.x + Math.cos(ang) * 30, e.y + Math.sin(ang) * 20, { n: 3, color: '#a08a78', size: 18, a: 0.4, speed: 40 }));
      return;
    }
    if (id === 'runeguard') {
      // (shared-fx colour pass: Runeguard indigo)
      VFX.crystals(e.x, e.y, { color: '#8e98ff', n: 5, r: 30, h: 30 });
      if (!target) return;
      VFX.lightning(sx, sy + 16, tx, ty + 16, { color: '#aab4ff', jag: 8, dur: 0.3 });
      FX.later(0.1, () => {
        VFX.sigil(target.x, target.y, { r: 64, style: 'runes', color: '#8e98ff', dur: 1.3, spin: 2 });
        VFX.sigil(target.x, target.y - 70, { r: 22, style: 'runes', color: '#dde3ff', dur: 1, spin: -3, flat: 1, layer: 'air' });
        VFX.shock(target.x, target.y, { r: 70, color: '#8e98ff', w: 3, dur: 0.35 });
      });
      return;
    }
    // Bastion (and the fallback)
    VFX.shock(e.x, e.y, { r: 72, color: '#ffe27a', w: 4, dur: 0.35 });
    VFX.shock(e.x, e.y, { r: 112, color: col, w: 2.5, dur: 0.45, delay: 0.08 });
    VFX.sparks(e.x + Math.cos(e.angle || 0) * 24, e.y + Math.sin(e.angle || 0) * 24, { color: '#fff2b0', n: 8, speed: 300 });
    if (!target || L < 10) return;
    // (polish) the tank sheet's iron chain: steel links with a gold spearhead, out in 0.18s, a gold star where it bites
    OLD_PAINT.chain(sx, sy, tx, ty, { head: 'spear', metal: '#a8b0c0', glow: '#ffe27a' });
    OLD_PAINT.later(0.17, () => {
      VFX.spawn({ x: tx, y: ty, z: 10, life: 0.35, size: 70, size1: 22, color: '#ffe27a', kind: 'star', vr: 4 });
      VFX.hit(tx, ty, '#ffe9a0', 0.9); VFX.spikeburst(tx, target.y, { r: 42, n: 10, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', dur: 0.3, z: 26 });
      VFX.shock(tx, target.y, { r: 70, color: '#ffe27a', w: 4, dur: 0.35 }); VFX.smoke(tx, target.y, { n: 4, color: '#c8c0b0', size: 22, a: 0.45, speed: 50 }); vfxShake(2);
    });
    OLD_PAINT.later(0.5, () => VFX.smoke(e.x + Math.cos(ang) * 30, e.y + Math.sin(ang) * 20, { n: 3, color: '#c8c0b0', size: 18, a: 0.4, speed: 40 }));
  },
};

// ======================================================================= DASH_VFX (shared-fx polish)
// Every class dashes in its own way: a start burst where it pushes off, a trail while it moves (FX.dashTrail calls
// trail() up to 45 times a second for the 0.18s dash) and an arrival where it lands. One ribbon effect follows the hero
// for the whole dash, so the trail costs one effect and a few particles. Someone else's dash plays at 0.6.
//   heavy  (tanks): a dust burst and a shoulder-charge shock, scuffed floor behind, dust and a thud on landing
//   shadow (rogues): a smoke pop, a violet smear with streaks, a smoke puff where they land
//   rune   (casters): a little rune flash under the feet, a ribbon of light in the class colour, motes of the class
//   wind   (Driftblade): a wind ribbon, leaves and white gust lines, a small whirl on arrival
//   gust   (Ironpalm): a gust and glowing footprints on the floor
//   nimble (Ranger): a dust kick, leaves, a light green streak
const DASH_VFX = (() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), DUST = '#d8ccb8';
  // kind, c (the main colour), c2 (a second colour), part (trail particle kind), sigil (rune style)
  const T = {
    bastion:      { kind: 'heavy', c: '#9fc4ff', c2: '#ffe08a' },
    bloodreaver:  { kind: 'heavy', c: '#ff3a4a', c2: '#a01028' },
    runeguard:    { kind: 'heavy', c: '#8a90ff', c2: '#d0d6ff', sigil: 'runes' },
    gorgemaw:     { kind: 'heavy', c: '#ffb070', c2: '#8ee03a' },
    oathbroker:   { kind: 'heavy', c: '#c04a5a', c2: '#b8a8e0' },
    ironpalm:     { kind: 'gust', c: '#ffd27a', c2: '#ffffff' },
    ranger:       { kind: 'nimble', c: '#bfff9a', c2: '#6fbf5a', part: 'leaf' },
    shadowblade:  { kind: 'shadow', c: '#b070ff', c2: '#e0c8ff', smoke: '#3a2450' },
    marionettist: { kind: 'shadow', c: '#ff5a8a', c2: '#ffd0e0', smoke: '#4a1a34' },
    gloomsworn:   { kind: 'shadow', c: '#8a5ad8', c2: '#bff8ee', smoke: '#1a0c2a' },
    thresher:     { kind: 'shadow', c: '#8fd8e8', c2: '#e0f6ff', smoke: '#1a0f2a' },
    driftblade:   { kind: 'wind', c: '#8ff0d0', c2: '#e8fff8', part: 'leaf' },
    pyromancer:   { kind: 'rune', c: '#ff8a2a', c2: '#ffd070', part: 'glow', sigil: 'runes' },
    cleric:       { kind: 'rune', c: '#fff0b8', c2: '#ffffff', part: 'feather', sigil: 'star4' },
    grovekeeper:  { kind: 'rune', c: '#8fff7a', c2: '#ffd0e8', part: 'leaf', sigil: 'petals' },
    chronomancer: { kind: 'rune', c: '#b48cff', c2: '#7aa0ff', part: 'star', sigil: 'clock' },
    thermist:     { kind: 'rune', c: '#ff8a3a', c2: '#6fb2f0', part: 'glow', sigil: 'hex' },
    alembist:     { kind: 'rune', c: '#5ff08a', c2: '#ffd27a', part: 'glow', sigil: 'hex' },
    threadweaver: { kind: 'rune', c: '#ff4a5a', c2: '#ffcf7a', part: 'star', sigil: 'star5' },
  };
  const def = { kind: 'rune', c: '#ffffff', c2: '#ffffff', part: 'star', sigil: 'star4' };
  const styleOf = e => { const id = e && e.cls && e.cls.id; return T[id] || Object.assign({}, def, { c: (e && e.cls && e.cls.accent) || '#ffffff' }); };
  // run fn later at the intensity the dash started with
  const later = (d, fn) => { const sc = V.scale; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); };

  // the ribbon: the path the hero took, tapered (thin at the tail, full at the hero) and shrinking away behind them.
  // st: 'glow' (light, additive), 'smear' (ink + colour + a bright core), 'scuff' (faint marks on the floor)
  function ribbon(e, s, st, w) {
    const pts = [], LIFE = st === 'scuff' ? 0.9 : 0.3;
    let last = null;
    V.fx({ dur: 0.24 + LIFE, layer: st === 'scuff' ? 'ground' : 'air', tick: (q, dt, fx) => {
      const tt = q * fx.dur;
      if (tt < 0.24 && (!last || Math.hypot(e.x - last.x, e.y - last.y) > 3)) { last = { x: e.x, y: e.y, t: tt }; pts.push(last); }
    }, draw: (c, p, t, fx) => {
      if (pts.length < 2) return;
      const shape = (W, lift) => {
        const L = [], R = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], nx = -(b.y - a.y), ny = b.x - a.x, n = Math.hypot(nx, ny) || 1;
          const age = Math.max(0, t - pts[i].t), k = Math.max(0, 1 - age / LIFE) * (0.25 + 0.75 * i / (pts.length - 1)), ww = W * k;
          L.push([pts[i].x + nx / n * ww, pts[i].y - lift + ny / n * ww * 0.7]); R.push([pts[i].x - nx / n * ww, pts[i].y - lift - ny / n * ww * 0.7]);
        }
        c.beginPath(); L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); c.fill();
      };
      const k = fx.a;
      if (st === 'scuff') {
        // two faint scrape marks where the feet dragged (lingering floor marks stay faint)
        c.globalAlpha = 0.22 * k * Math.min(1, (1 - p) / 0.4); c.fillStyle = '#1a120c';
        c.save(); c.translate(0, -4); shape(2.2, 0); c.restore(); c.save(); c.translate(0, 5); shape(2.2, 0); c.restore();
        c.globalAlpha = 1; return;
      }
      if (st === 'smear') { c.globalAlpha = 0.55 * k; c.fillStyle = '#140a1e'; shape(w * 1.35, 16); }
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = (st === 'smear' ? 0.75 : 0.5) * k; c.fillStyle = s.c; shape(w, 16);
      c.globalAlpha = 0.8 * k; c.fillStyle = s.c2 || '#ffffff'; shape(w * 0.3, 16);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    } });
  }
  // the dash's direction, a frame in (the hero has started to move by then)
  const dirOf = (e, sx, sy) => (Math.hypot(e.x - sx, e.y - sy) > 2 ? Math.atan2(e.y - sy, e.x - sx) : e.angle || 0);

  const START = {
    heavy(e, s, sx, sy) {
      V.smoke(sx, sy, { n: 5, r: 8, color: DUST, size: 20, a: 0.55, speed: 70, life: 0.8 });
      V.debris(sx, sy, { n: 3, color: '#7a6a58', speed: 0.6, up: 0.5, dur: 1 });
      ribbon(e, s, 'scuff');
      // the shoulder charge: a bright shock arc on the leading side and a flat ring kicked off the floor
      later(0.03, () => { const a = dirOf(e, sx, sy);
        V.fx({ dur: 0.22, layer: 'air', draw: (c, p, t, fx) => { const k = fx.a * (1 - p), R = 22 + 12 * p;
          V.neonPath(c, s.c, 3.5 * (1 - p * 0.5), k, () => c.arc(e.x, e.y - 18, R, a - 0.85, a + 0.85));
          V.glowAt(c, e.x + Math.cos(a) * R, e.y - 18 + Math.sin(a) * R, 18, s.c, 0.8 * k); } });
        V.shock(sx, sy, { r: 46, color: s.c, dur: 0.3, w: 4 });
        V.sparks(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, { color: s.c2, n: 4, angle: a, spread: 0.6, speed: 260 });
        if (s.sigil) V.sigil(sx, sy, { r: 26, style: s.sigil, color: s.c, dur: 0.45, spin: 4 }); });
    },
    shadow(e, s, sx, sy) {
      V.smoke(sx, sy, { n: 5, r: 10, color: s.smoke, size: 24, a: 0.6, speed: 50, life: 1 });
      V.flash(sx, sy - 16, 34, s.c, 0.18);
      ribbon(e, s, 'smear', 9);
    },
    rune(e, s, sx, sy) {
      V.sigil(sx, sy, { r: 26, style: s.sigil || 'star4', color: s.c, dur: 0.42, spin: 5 });
      V.flash(sx, sy - 14, 30, s.c, 0.18);
      V.motes(sx, sy, { color: s.c, n: 5, r: 16, size: 7, life: 0.6 });
      ribbon(e, s, 'glow', 6);
    },
    wind(e, s, sx, sy) {
      V.swirl(sx, sy, { r: 26, color: s.c, dur: 0.35, arms: 3, layer: 'ground' });
      V.smoke(sx, sy, { n: 3, color: '#e8f4f0', size: 16, a: 0.4, speed: 60, life: 0.6 });
      ribbon(e, s, 'glow', 8);
    },
    gust(e, s, sx, sy) {
      V.shock(sx, sy, { r: 40, color: s.c, dur: 0.28, w: 3 });
      V.smoke(sx, sy, { n: 4, color: DUST, size: 18, a: 0.5, speed: 60, life: 0.7 });
      ribbon(e, s, 'glow', 4);
    },
    nimble(e, s, sx, sy) {
      V.smoke(sx, sy, { n: 4, color: DUST, size: 16, a: 0.5, speed: 55, life: 0.7 });
      V.motes(sx, sy, { kind: 'leaf', color: s.c2, n: 3, r: 14, size: 9, life: 0.8 });
      ribbon(e, s, 'glow', 4);
    },
  };
  const TRAIL = {
    heavy(e, s) { if (Math.random() < 0.6) V.spawn({ x: e.x + rand(-6, 6), y: e.y + rand(-3, 3), z: 2, vx: rand(-20, 20), vz: rand(10, 30), drag: 0.05, life: rand(0.4, 0.6), size: rand(12, 16), size1: 26, color: DUST, kind: 'smoke', add: false, a: 0.45 }); },
    shadow(e, s, a) {
      V.spawn({ x: e.x + rand(-5, 5), y: e.y, z: rand(6, 24), vx: -Math.cos(a) * rand(300, 420), vy: -Math.sin(a) * rand(300, 420) * 0.7, drag: 0.2, life: rand(0.18, 0.28), size: rand(8, 12), size1: 2, color: Math.random() < 0.6 ? s.c : s.c2, stretch: 5 });
      if (Math.random() < 0.5) V.spawn({ x: e.x, y: e.y, z: 8, vz: rand(10, 30), life: 0.6, size: 16, size1: 28, color: s.smoke, kind: 'smoke', add: false, a: 0.4 });
    },
    rune(e, s) { V.spawn({ x: e.x + rand(-8, 8), y: e.y + rand(-4, 4), z: rand(6, 26), vz: rand(20, 50), vx: rand(-15, 15), life: rand(0.4, 0.7), size: s.part === 'feather' ? 11 : s.part === 'leaf' ? 9 : rand(5, 8), size1: s.part === 'feather' || s.part === 'leaf' ? undefined : 0,
      color: Math.random() < 0.6 ? s.c : s.c2, kind: s.part || 'glow', add: s.part === 'leaf' || s.part === 'feather' ? false : undefined, vr: rand(-4, 4), flutter: s.part === 'leaf' || s.part === 'feather' ? 5 : 0 }); },
    wind(e, s, a) {
      V.spawn({ x: e.x + rand(-10, 10), y: e.y + rand(-6, 6), z: rand(8, 30), vx: -Math.cos(a) * 320, vy: -Math.sin(a) * 220, drag: 0.15, life: 0.22, size: 10, size1: 3, color: s.c2, kind: 'soft', stretch: 6, a: 0.8 });
      if (Math.random() < 0.4) V.spawn({ x: e.x, y: e.y, z: rand(6, 20), vx: rand(-40, 40), vy: rand(-30, 30), vz: rand(10, 40), g: 60, life: 0.8, size: 9, color: Math.random() < 0.5 ? s.c : '#5fc890', kind: 'leaf', add: false, vr: rand(-8, 8), flutter: 6 });
    },
    gust(e, s, a) {
      // a footprint on alternate sides, glowing faintly gold and fading
      e._dashStep = (e._dashStep || 0) + 1;
      if (e._dashStep % 2 === 0) { const side = (e._dashStep / 2) % 2 ? 1 : -1, px = e.x - Math.sin(a) * 5 * side, py = e.y + Math.cos(a) * 3.5 * side;
        V.fx({ dur: 0.9, layer: 'ground', draw: (c, p, t, fx) => { const k = fx.a * Math.min(1, (1 - p) / 0.5);
          c.save(); c.translate(px, py); c.rotate(a); c.globalAlpha = 0.3 * k; c.fillStyle = '#1a120c';
          c.beginPath(); c.ellipse(0, 0, 5, 2.6, 0, 0, Math.PI * 2); c.fill(); c.restore();
          V.glowAt(c, px, py, 7, s.c, 0.45 * k * (1 - p)); } }); }
      V.spawn({ x: e.x + rand(-8, 8), y: e.y + rand(-5, 5), z: rand(10, 28), vx: -Math.cos(a) * 280, vy: -Math.sin(a) * 200, drag: 0.15, life: 0.2, size: 9, size1: 3, color: '#ffffff', kind: 'soft', stretch: 6, a: 0.6 });
    },
    nimble(e, s) { if (Math.random() < 0.5) V.spawn({ x: e.x, y: e.y, z: rand(4, 16), vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(10, 40), g: 60, life: 0.7, size: 8, color: Math.random() < 0.5 ? s.c2 : '#8fe060', kind: 'leaf', add: false, vr: rand(-8, 8), flutter: 6 });
      if (Math.random() < 0.4) V.spawn({ x: e.x, y: e.y, z: 2, vz: 15, life: 0.45, size: 12, size1: 22, color: DUST, kind: 'smoke', add: false, a: 0.4 }); },
  };
  const ARRIVE = {
    heavy(e, s) { V.smoke(e.x, e.y, { n: 5, r: 14, color: DUST, size: 20, a: 0.5, speed: 80, life: 0.8 }); V.shock(e.x, e.y, { r: 50, color: s.c, dur: 0.32, w: 4 }); V.debris(e.x, e.y, { n: 3, color: '#7a6a58', speed: 0.6, up: 0.5, dur: 1 }); vfxShake(1.5); },
    shadow(e, s) { V.smoke(e.x, e.y, { n: 3, color: s.smoke, size: 22, a: 0.5, speed: 40, life: 0.9 }); V.shock(e.x, e.y, { r: 34, color: s.c, dur: 0.25, w: 3 }); V.glint(e.x, e.y, { color: s.c2, size: 20, z: 22 }); },
    rune(e, s) { V.shock(e.x, e.y, { r: 36, color: s.c, dur: 0.3, w: 3 }); V.motes(e.x, e.y, { color: s.c, n: 4, r: 16, size: 7, life: 0.7, kind: s.part === 'leaf' || s.part === 'feather' ? s.part : undefined }); },
    wind(e, s) { V.tornado(e.x, e.y, { color: s.c2, h: 46, r: 18, dur: 0.4 }); V.shock(e.x, e.y, { r: 40, color: s.c, dur: 0.28, w: 3 }); },
    gust(e, s) { V.shock(e.x, e.y, { r: 44, color: s.c, dur: 0.3, w: 4 }); V.smoke(e.x, e.y, { n: 3, color: DUST, size: 16, a: 0.45, speed: 50, life: 0.6 }); },
    nimble(e, s) { V.smoke(e.x, e.y, { n: 3, color: DUST, size: 16, a: 0.45, speed: 50, life: 0.6 }); V.shock(e.x, e.y, { r: 32, color: s.c, dur: 0.25, w: 2.5 }); },
  };
  return {
    // at the push-off (runs under the caller's scale: 1 for you, 0.6 for anyone else). true: handled
    start(e, color) {
      if (!e) return false;
      const s = styleOf(e), sx = e.x, sy = e.y;
      e._dashStyle = s; e._dashStep = 0; e._dashA = null; e._dashP = null;
      START[s.kind](e, s, sx, sy);
      later(0.19, () => { if (ARRIVE[s.kind]) ARRIVE[s.kind](e, s); });
      return true;
    },
    // while moving (FX.dashTrail; not dimmed by the caller, so it picks the intensity itself). true: handled
    trail(e, color) {
      const s = e._dashStyle || styleOf(e), fn = TRAIL[s.kind];
      if (!fn) return false;
      const a = e._dashA != null && e._dashP ? Math.atan2(e.y - e._dashP.y, e.x - e._dashP.x) : e.angle || 0;
      e._dashP = { x: e.x, y: e.y }; e._dashA = a;
      const prev = V.scale; V.setScale(!FX.me || e === FX.me ? 1 : 0.6);
      try { fn(e, s, a); } finally { V.setScale(prev); }
      return true;
    },
  };
})();

// ======================================================================= Alembist (classes-b)
// Glassware and liquids after the painted sheets: a small wind-up (a puff at the still, a flick of the wrist), a bold
// climax (the vial arcs over and shatters: glass, a coloured splash shaped by the recipe), and a slow aftermath (steam,
// salt glitter, a ward circle that lingers as long as it works). Each reagent puffs its colour out of the copper still.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => vfxShake(s);
  // the still on the hero's back (local -x), where brewing shows
  const still = e => ({ x: e.x - Math.cos(e.angle || 0) * 16, y: e.y - Math.sin(e.angle || 0) * 16 });
  const puff = (e, color, n = 3, big = 1) => {
    const s = still(e);
    for (let i = 0; i < n; i++) V.spawn({ x: s.x + rand(-4, 4), y: s.y + rand(-3, 3), z: 30, vx: rand(-15, 15), vy: rand(-10, 10), vz: rand(30, 60), drag: 0.04, life: rand(0.7, 1.1) * big,
      size: rand(10, 15) * big, size1: 26 * big, color: i > 1 ? '#e8e4dc' : color, kind: 'smoke', add: false, a: i > 1 ? 0.45 : 0.7, fadeIn: 0.05 });
    // (QA) the reagent's colour has to read at a glance (Ember orange, Dew blue, Salt white): a coloured flash at the
    // still, a small ring of it on the floor and two drops of it; most of the smoke is now tinted, not grey
    V.spawn({ x: s.x, y: s.y, z: 26, life: 0.3, size: 26 * big, size1: 4, color });
    V.shock(s.x, s.y, { r: 44 * big, color, dur: 0.35, w: 3 });   // (wider than the hero, or it hides under the sprite)
    V.flash(s.x, s.y - 30, 26 * big, color, 0.28);
    for (let i = 0; i < 2; i++) V.spawn({ x: s.x, y: s.y, z: 30, vx: rand(-40, 40), vy: rand(-20, 20), vz: rand(80, 130), g: 500, life: 0.45, size: 6, color, kind: 'drop', add: false, rot: Math.PI / 2 });
  };
  // (online-refs pass, docs/art/vfx-online-refs/alembist.md) a reagent press is the most-pressed button, so it is a
  // light Eukrasia-style beat on the caster only, about 0.4s: a bead of the reagent's colour drips into the still
  // (wind-up, 0.12s), plops (a crown of droplets, a tight ring, the peak), and one tinted wisp rises and is gone
  const ALEM_DRIP = 0.12;
  function plop(e, color, o = {}) {
    V.fx({ dur: ALEM_DRIP, layer: 'air', draw: (c, p, t, f) => { const s = still(e), z = 78 - 46 * p * p, y = s.y - z;
      V.glowAt(c, s.x, y, 9, color, 0.9 * f.a); V.glowAt(c, s.x, y + 1, 3.2, '#ffffff', f.a);
      V.neonPath(c, color, 2, 0.5 * f.a, () => { c.moveTo(s.x, y - 4); c.lineTo(s.x, y - 16 * (1 - p * 0.5)); }); } });
    OLD_PAINT.later(ALEM_DRIP, () => { const s = still(e), big = o.big ?? 1;
      V.spawn({ x: s.x, y: s.y, z: 30, life: 0.22, size: 26 * big, size1: 6, color });
      V.spawn({ x: s.x, y: s.y, z: 30, life: 0.14, size: 12 * big, size1: 2, color: '#ffffff' });
      V.shock(s.x, s.y - 30, { r: 26 * big, color, dur: 0.24, w: 3, layer: 'air' });
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.42; V.spawn({ x: s.x, y: s.y, z: 32, vx: Math.cos(a) * rand(40, 70), vy: rand(-12, 12), vz: rand(110, 160), g: 620, life: rand(0.3, 0.38), size: rand(5, 7), color, kind: 'drop', add: false, rot: Math.PI / 2 }); }
      V.spawn({ x: s.x, y: s.y, z: 34, vx: rand(-8, 8), vz: rand(40, 60), drag: 0.05, life: 0.42, size: 9, size1: 20 * big, color, kind: 'smoke', add: false, a: 0.5, fadeIn: 0.04 }); });
  }
  // ---- Alembist painted-sheet pieces (docs/art/vfx-reference/alembist.png): green cure, red bomb, blue shield.
  // Floor marks flare for a moment, then settle low (boss telegraphs must stay readable through them).
  const ALEM_BLUE = '#4fa8ff', ALEM_KILN = '#ff7a1a', ALEM_TAU = Math.PI * 2;
  // a floor mark's strength: fades in, flares at `peak` for its first ~0.6s, settles to `settle`, fades out at the end
  const alemMarkK = (p, t, dur, peak, settle) => Math.min(1, t / 0.15) * Math.min(1, (1 - p) * dur / 0.6) * (settle + (peak - settle) * Math.max(0, 1 - t / 0.7));
  // cure: thin shafts of light rising out of the splash
  function alemRays(x, y, col, n, R) {
    const rays = Array.from({ length: n }, () => { const a = rand(0, ALEM_TAU), d = Math.sqrt(Math.random()) * R; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, h: rand(55, 105), w: rand(2, 4), dl: rand(0, 0.12) }; });
    V.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
      for (const r of rays) { const q = Math.max(0, Math.min(1, (t - r.dl) / 0.18)), k = e.a * (1 - p) * q; if (k < 0.02) continue;
        V.neonPath(c, col, r.w, k, () => { c.moveTo(r.x, r.y); c.lineTo(r.x, r.y - r.h * q); }); }
    } });
  }
  // cure aftermath: a ring with a healing plus in the middle and small pluses round it
  function alemCureMark(x, y, R, col, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.9, 0.35), g = easeOut(Math.min(1, t / 0.2)), RR = R * (0.7 + 0.3 * g);
      if (k < 0.02) return;
      V.neonRing(c, x, y, RR, col, 3, k, 0.78); V.neonRing(c, x, y, RR * 0.72, col, 1.4, k * 0.6, 0.78);
      const pl = (px, py, s, w) => V.neonPath(c, col, w, k, () => { c.moveTo(px - s, py); c.lineTo(px + s, py); c.moveTo(px, py - s * 0.78); c.lineTo(px, py + s * 0.78); });
      V.glowAt(c, x, y, RR * 0.35, col, 0.35 * k); pl(x, y, RR * 0.24, 4);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; pl(x + Math.cos(a) * RR * 0.86, y + Math.sin(a) * RR * 0.86 * 0.78, 7, 1.9); }
    } });
  }
  // shield aftermath: a ring of ticks with a shield emblem in the middle (its size and life are the ward's)
  function alemShieldSeal(x, y, R, col, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.85, 0.3), g = easeOut(Math.min(1, t / 0.25)), RR = R * (0.75 + 0.25 * g);
      if (k < 0.02) return;
      V.neonRing(c, x, y, RR, col, 3, k, 0.78); V.neonRing(c, x, y, RR * 0.84, col, 1.4, k * 0.6, 0.78);
      c.save(); c.translate(x, y); c.scale(1, 0.78); c.rotate(t * 0.2);
      for (let i = 0; i < 12; i++) { const a = i * ALEM_TAU / 12; V.neonPath(c, col, 1.6, k * 0.7, () => { c.moveTo(Math.cos(a) * RR * 0.86, Math.sin(a) * RR * 0.86); c.lineTo(Math.cos(a) * RR * 0.96, Math.sin(a) * RR * 0.96); }); }
      c.restore();
      const s = Math.min(34, RR * 0.28);
      V.glowAt(c, x, y, s * 1.6, col, 0.35 * k);
      V.neonPath(c, col, 3.2, k, () => { c.moveTo(x - s, y - s * 0.7); c.lineTo(x + s, y - s * 0.7); c.lineTo(x + s * 0.9, y + s * 0.05); c.quadraticCurveTo(x + s * 0.5, y + s * 0.6, x, y + s * 0.85); c.quadraticCurveTo(x - s * 0.5, y + s * 0.6, x - s * 0.9, y + s * 0.05); c.closePath(); });
    } });
  }
  // Reaction: a rune circle in the two reagents' colours, segments alternating, turning slowly
  function alemReactRune(x, y, R, colA, colB, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.9, 0.3), g = easeOut(Math.min(1, t / 0.2)), RR = R * (0.6 + 0.4 * g);
      if (k < 0.02) return;
      c.save(); c.translate(x, y); c.scale(1, 0.78); c.rotate(t * 0.6);
      for (let i = 0; i < 6; i++) { const a = i * ALEM_TAU / 6; V.neonPath(c, i % 2 ? colB : colA, 3, k, () => c.arc(0, 0, RR, a + 0.06, a + ALEM_TAU / 6 - 0.06)); }
      for (let i = 0; i < 6; i++) { const a = i * ALEM_TAU / 6 + 0.5, px = Math.cos(a) * RR * 0.68, py = Math.sin(a) * RR * 0.68, s = RR * 0.09;
        V.neonPath(c, i % 2 ? colA : colB, 1.9, k * 0.8, () => { c.moveTo(px - s, py + s); c.lineTo(px, py - s); c.lineTo(px + s, py + s); c.moveTo(px - s * 0.5, py); c.lineTo(px + s * 0.5, py); }); }
      V.neonPath(c, colA, 1.6, k * 0.8, () => c.arc(0, 0, RR * 0.32, 0, ALEM_TAU));
      V.neonPath(c, colB, 1.2, k * 0.7, () => { c.ellipse(0, 0, RR * 0.32, RR * 0.14, t * 1.4, 0, ALEM_TAU); });
      c.restore();
    } });
  }
  // Steam: faint white spiral arms turning in the cloud for its whole life (follows an ally under Cling)
  function alemSteamSwirl(x, y, R, dur, follow) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.6, 0.22), cx = follow ? follow.x : x, cy = follow ? follow.y : y;
      if (k < 0.02) return;
      for (let i = 0; i < 3; i++) V.neonPath(c, '#e8f4f4', 2.2, k, () => {
        for (let s = 0; s <= 16; s++) { const q = s / 16, a = t * 0.9 + i * ALEM_TAU / 3 + q * 3, rr = R * (0.2 + q * 0.75); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.6; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
    } });
  }
  // Kiln Bomb wind-up: the coals under the still flare orange and spit sparks
  function alemKilnGlow(e) {
    V.fx({ dur: ALEMBIC.FLIGHT + 0.1, layer: 'air', draw: (c, p, t, f) => { const s = still(e), k = f.a * Math.sin(Math.PI * p);
      V.glowAt(c, s.x, s.y - 10, 42, ALEM_KILN, 0.85 * k); V.glowAt(c, s.x, s.y - 10, 14, '#fff0b0', k); },
    tick: () => { if (Math.random() < 0.4) { const s = still(e); V.spawn({ x: s.x + rand(-6, 6), y: s.y, z: 14, vx: rand(-20, 20), vz: rand(60, 140), g: 120, life: rand(0.3, 0.6), size: rand(3, 5), size1: 0, color: '#ffb040' }); } } });
  }
  // Kiln Bomb: a big orange kiln blast, hot shards, and a cracked crater glowing as it cools
  function alemKilnBlast(x, y) {
    V.flash(x, y - 14, 90, ALEM_KILN, 0.16);
    V.spikeburst(x, y, { r: 96, n: 20, color: '#ff6a1a', core: '#fff0b0', ink: '#3a1006', dur: 0.45 });
    V.spikeburst(x, y, { r: 54, n: 12, color: '#ffb040', core: '#ffffff', ink: '#3a1006', dur: 0.36, z: 18 });
    V.flare(x, y, { n: 18, r: 30, color: '#ff5a1a' });
    V.debris(x, y, { n: 10, hot: true, color: '#5a3a2a' });
    V.shock(x, y, { r: 140, color: '#ff9a3a', dur: 0.5, w: 7 });
    V.crater(x, y, { r: 80, color: ALEM_KILN, dur: 3, flames: 5, a: 0.65, cracks: 12 });
    V.smoke(x, y, { n: 6, color: '#3a2a2a', size: 40, a: 0.5, speed: 60, life: 1.5 });
    shake(5);
  }
  ABILITY_VFX.alembist = {
    // (online-refs pass) a drip and a plop of the reagent's colour into the still, not a long smoke puff
    ember: c => plop(c.ent, ALEMBIC.reagents.E.color),
    dew: c => plop(c.ent, ALEMBIC.reagents.D.color),
    salt: c => plop(c.ent, ALEMBIC.reagents.S.color),
    // (polish) a plop of its colour, then beads of mercury spin out of the still in a quick silver ring, run back
    // together into one bright drop and wink out
    quicksilver: c => { const qc = ALEMBIC.reagents.Q.color, e = c.ent; plop(e, qc, { big: 1.1 });
      V.fx({ dur: 0.6, layer: 'air', draw: (cc, p, t, f) => { const s = still(e), k = f.a * Math.min(1, (1 - p) / 0.25), R = 22 * Math.sin(Math.min(1, p / 0.8) * Math.PI);
        for (let i = 0; i < 6; i++) { const a = t * 9 + i * Math.PI / 3, x = s.x + Math.cos(a) * R, y = s.y - 30 + Math.sin(a) * R * 0.45; V.glowAt(cc, x, y, 7, qc, 0.8 * k); V.glowAt(cc, x, y, 2.5, '#ffffff', k); }
        V.neonPath(cc, '#e8eef4', 1, k * 0.5, () => cc.ellipse(s.x, s.y - 30, Math.max(1, R), Math.max(1, R * 0.45), 0, 0, Math.PI * 2)); } });
      c.later(0.5, () => { const s = still(e); V.glint(s.x, s.y, { color: '#ffffff', size: 22, z: 30 }); V.spawn({ x: s.x, y: s.y, z: 30, life: 0.25, size: 16, size1: 4, color: qc }); }); },
    throw: () => {},   // the vial itself is KIT_VFX.vial (it knows what it carries)
    // (online-refs pass: an Aetherflow-style refill, all on the caster) the still boils (bubbles rising off it), a white
    // jet shoots up the chimney, and one bright condensed drop falls back into it; a little glass rune at the feet
    distill: c => { const e = c.ent; puff(e, '#dff4f4', 3, 1.2); V.sigil(c.x, c.y, { r: 34, style: 'hex', color: '#cfeff0', dur: 0.6, spin: 3, follow: e });
      for (let i = 0; i < 6; i++) c.later(i * 0.04, () => { const s = still(e); V.spawn({ x: s.x + rand(-7, 7), y: s.y, z: 28, vx: rand(-10, 10), vz: rand(70, 120), life: rand(0.3, 0.45), size: rand(4, 7), size1: 1, color: '#e8fbff' }); });
      V.fx({ dur: 0.34, layer: 'air', draw: (cc, p, t, f) => { const s = still(e), q = easeOut(Math.min(1, p / 0.45)), k = f.a * Math.min(1, (1 - p) / 0.4), y0 = s.y - 34, y1 = y0 - 56 * q;
        V.neonPath(cc, '#dff4f4', 4 * (1 - p * 0.6), 0.6 * k, () => { cc.moveTo(s.x, y0); cc.lineTo(s.x, y1); });
        V.neonPath(cc, '#ffffff', 1.6, k, () => { cc.moveTo(s.x, y0 - 4); cc.lineTo(s.x, y1); }); V.glowAt(cc, s.x, y1, 10, '#e8fbff', 0.8 * k); } });
      c.later(0.3, () => plop(e, '#bff6ff', { big: 1.1 })); },
    catalyst: c => { puff(c.ent, '#ff8a3a', 4, 1.2); const s = still(c.ent); for (let i = 0; i < 3; i++) c.later(i * 0.06, () => { const a = Math.random() * Math.PI * 2; V.lightning(s.x, s.y, s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 20, { color: '#ffb070', jag: 6, dur: 0.18 }); }); },
    // (QA) Grand Batch read as nothing at all: now the still bubbles over in each reagent's colour in turn (a pop per
    // vial brewed) over a small brass hex seal, and gold bubbles rise as it finishes
    batch: c => { const cols = ['#ff7a2a', '#4fc8ff', '#efe6cf', '#ffd27a'];
      V.sigil(c.x, c.y, { r: 46, style: 'hex', color: '#ffd27a', dur: 0.75, spin: 2.5, follow: c.ent });
      for (let i = 0; i < 4; i++) c.later(i * 0.12, () => puff(c.ent, cols[i], 2, 1));
      c.later(0.45, () => { const s = still(c.ent); V.shock(c.x, c.y, { r: 70, color: '#ffd27a', dur: 0.4, w: 3.5 }); V.motes(s.x, s.y, { color: '#ffd27a', n: 6, r: 18, kind: 'star' }); }); },
    // (online-refs pass) Grand Blend: two streams, gold and white, spiral in from either side into the still and pop
    // together there (a ring and one tinted wisp); the swirl at the feet kept, smaller
    blend: c => { const e = c.ent; V.swirl(c.x, c.y, { r: 30, color: '#ffe0a8', dur: 0.5, follow: e, inward: true });
      V.fx({ dur: 0.32, layer: 'air', draw: (cc, p, t, f) => { const s = still(e), k = f.a;
        for (const [sg, col] of [[1, '#ffe0a8'], [-1, '#ffffff']]) V.neonPath(cc, col, 2.4, k, () => { for (let i = 0; i <= 10; i++) { const q = Math.min(1, p + i * 0.04), R = 46 * (1 - q), a = sg * (q * 5) + (sg > 0 ? 0 : Math.PI), px = s.x + Math.cos(a) * R, py = s.y - 30 + Math.sin(a) * R * 0.5; i ? cc.lineTo(px, py) : cc.moveTo(px, py); } }); } });
      c.later(0.3, () => { plop(e, '#ffe0a8', { big: 1.3 }); const s = still(e); V.shock(s.x, s.y, { r: 48, color: '#ffe0a8', dur: 0.3, w: 3 }); }); },
  };

  // the vial in the air: a little glass bottle in the recipe's colour, spinning end over end, dripping as it goes
  // (the painted sheet's long glowing arc: a comet trail in the vial's colour follows it; o.arc scales the height)
  function lob(sx, sy, tx, ty, cols, onHit, o = {}) {
    const d = Math.hypot(tx - sx, ty - sy), dur = ALEMBIC.FLIGHT, arc = (36 + d * 0.18) * (o.arc ?? 1);
    const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p, z: 22 + Math.sin(p * Math.PI) * arc - p * 14 });
    let last = 0, apex = false;
    V.fx({ dur, layer: 'air', tick: () => {
      if (Math.random() < 0.4) { const q = pos(last); V.spawn({ x: q.x, y: q.y, z: q.z, vz: -40, g: 300, life: 0.35, size: 6, color: cols[0], kind: 'drop', add: false }); }
      // (online-refs pass) a glint as it tops its arc: the eye catches the vial at the apex and follows it down
      if (!apex && last >= 0.5) { apex = true; const q = pos(0.5); V.glint(q.x, q.y, { color: '#ffffff', size: 20, z: q.z, life: 0.18 }); }
    }, draw: (c, p, t, e) => {
      const q = pos(p), y = q.y - q.z; last = p;
      // (online-refs pass) the comet trail tapers: thin and faint at its tail, thick and bright at the vial, a white
      // core on the leading stretch (moving things are brightest at their tip)
      const seg = (f0, f1, w, col, a) => V.neonPath(c, col, w, a * e.a, () => { const pa = Math.max(0, p - 0.38 * f0), pb = Math.max(0, p - 0.38 * f1); for (let i = 0; i <= 4; i++) { const r = pos(pa + (pb - pa) * i / 4); i ? c.lineTo(r.x, r.y - r.z) : c.moveTo(r.x, r.y - r.z); } });
      seg(1, 0.5, 1.6, cols[0], 0.35); seg(0.55, 0, 3.6, cols[0], 0.7); seg(0.2, 0, 1.4, '#ffffff', 0.8);
      V.glowAt(c, q.x, y, 22, cols[0], 0.6 * e.a);
      c.save(); c.globalAlpha = e.a; c.translate(q.x, y); c.scale(1.45, 1.45); c.rotate(t * 16);
      c.fillStyle = cols[0]; c.strokeStyle = OUT; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(0, 2, 5, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      if (cols.length > 1) { c.fillStyle = cols[1]; c.beginPath(); c.ellipse(1.5, 2, 2.5, 5, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(220,240,250,0.8)'; c.fillRect(-2, -7, 4, 5); c.fillStyle = '#9a6a3a'; c.fillRect(-2.2, -9, 4.4, 2.6);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-3, -1, 1.5, 4);
      c.restore();
    }, done: () => onHit(tx, ty) });
  }
  // (online-refs pass) a crown of liquid leaping up round whoever the potion broke on (the heal reads on the body, then
  // the floor mark takes over): eight curling petals of the potion's colour with white tips, 0.38s, following them
  function alemCrown(w, col, s = 1) {
    const pet = Array.from({ length: 8 }, (_, i) => ({ a: i * ALEM_TAU / 8 + rand(-0.2, 0.2), h: rand(34, 50) * s }));
    V.fx({ dur: 0.38, layer: 'air', draw: (c, p, t, e) => {
      const x = w.x, y = w.y, q = easeOut(Math.min(1, p / 0.4)), k = e.a * Math.min(1, (1 - p) / 0.45), R = 16 * s + 10 * s * q;
      for (const pt of pet) { const ca = Math.cos(pt.a), sa = Math.sin(pt.a) * 0.6, bx = x + ca * R * 0.7, by = y + sa * R * 0.7, tx = x + ca * R * 1.35, ty = y + sa * R * 1.35 - pt.h * q;
        V.neonPath(c, col, 3 * (1 - p * 0.5), k, () => { c.moveTo(bx, by); c.quadraticCurveTo(x + ca * R * 0.9, y + sa * R * 0.9 - pt.h * q * 0.8, tx, ty); });
        V.glowAt(c, tx, ty, 4, '#ffffff', k); }
    } });
  }
  // glass: shards that skitter and glint, a white flash
  function glass(x, y) {
    V.flash(x, y - 10, 30, '#ffffff', 0.12);
    for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2, sp = rand(80, 220);
      V.spawn({ x, y, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 200), g: 600, bounce: true, life: rand(0.5, 0.9), size: rand(6, 9), color: '#e8f6ff', kind: 'shard', add: false, vr: rand(-14, 14), fadePow: 3 }); }
  }
  // the splash of one recipe where it broke. m: strength (bigger, longer); tent: the ally it landed on (clouds follow them)
  function burst(r, x, y, m, tent, fol) {
    const info = alemInfo(r), col = info.color, kind = info.kind, big = r.length === 3;
    V.splash(x, y, { n: big ? 16 : 10, color: col, size: 1.1, speed: 1.1 });
    if (r === 'DES') {   // Philosopher's Draught: a lilac star that rings out across the whole room
      V.spikeburst(x, y, { r: 50, n: 14, color: col, core: '#ffffff', ink: '#2a1840', dur: 0.4 });
      for (let i = 0; i < 3; i++) V.shock(x, y, { r: 260 + i * 90, color: col, dur: 0.8, w: 5 - i, delay: i * 0.12 });
      V.burst(x, y, { color: col, color2: '#ffffff', n: 22, speed: 300, kind: 'star', flashR: 90 }); V.plus(x, y, { color: '#e6c8ff', n: 8 });
      return;
    }
    switch (kind) {
      case 'heal': {
        const R = big ? 150 : 110;
        if (r === 'DE') {   // Steam: a white cloud billows up with swirls, and turns on the floor for the cloud's life
          const dur = 9 * m, f = fol ? tent : null;
          V.smoke(x, y, { n: 9, r: 38, color: '#eef6f6', size: 50, a: 0.5, speed: 100, life: 1.5 });
          V.swirl(x, y, { r: 115, color: '#e8f4f4', dur: 1, arms: 3 });
          alemSteamSwirl(x, y, 114, dur, f);   // the cloud's own 120 radius
          V.plus(x, y, { color: '#9affd8', n: 4 });
          steam(x, y, 120, dur, '#d8f2f2', f);
          break;
        }
        // a cure: shafts of light rise out of the splash, a ring with a healing plus settles on the floor
        // (online-refs pass) and the potion reads on the ally's body first: a crown of green liquid leaps up round them
        alemCrown(tent || { x, y }, col, big ? 1.25 : 1);
        V.shock(x, y, { r: R, color: col, dur: 0.5, w: 5 });
        alemRays(x, y, col, big ? 9 : 6, R * 0.7);
        alemCureMark(x, y, R * 0.92, col, big ? 1.8 : 1.4);
        V.plus(x, y, { color: shade(col, 0.3), n: big ? 8 : 5 }); V.motes(x, y, { color: col, n: 8, r: R * 0.6, rise: 0.8 });
        if (r === 'DDD') steam(x, y, 150, 6, '#d8f2f2', fol ? tent : null);
        break;
      }
      case 'bomb': {
        // red arc, a fiery blast with hot rubble, and a scorched crater whose cracks glow as it cools
        const s = (big ? 1.5 : 1) * 1.25;
        V.flash(x, y - 12, 44 * s, '#ff5a2a', 0.14);
        V.spikeburst(x, y, { r: 50 * s, n: 16, color: '#ff4a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.36 });
        V.flare(x, y, { n: big ? 18 : 12, r: 20 * s, color: col === '#fff070' ? '#ffd23a' : '#ff5a1a' });
        V.debris(x, y, { n: big ? 7 : 5, hot: true, color: '#5a3a2a' });
        V.smoke(x, y, { n: 5, color: '#3a2a2a', size: 30 * s, a: 0.5, speed: 50, life: 1.4 });
        V.crater(x, y, { r: big ? 68 : 46, color: '#ff4a1a', dur: big ? 3 : 2, flames: big ? 4 : 3, a: 0.5, cracks: big ? 10 : 8 });
        if (r === 'EQ') V.lightning(x - 30, y - 10, x + 30, y + 6, { color: '#fff4c0', jag: 10 });
        if (r === 'EES') { V.burst(x, y, { color: '#fff070', n: 14, speed: 260, kind: 'star' }); }
        shake(big ? 5 : 3);
        break;
      }
      case 'ward': {
        // a blue dome closes over the splash, then a shield seal stays (low) on the floor as long as the ward works
        const R = r === 'SSS' ? 160 : 120, dur = (r === 'SSS' ? 8 : 6) * m, blue = r === 'QQ' ? '#a8c8ff' : ALEM_BLUE;
        V.dome({ x, y }, { color: blue, r: R * 0.62, dur: 1.2 });
        alemShieldSeal(x, y, R, blue, dur);
        V.burst(x, y - 20, { color: '#cfe4ff', color2: '#ffffff', n: 10, speed: 160, kind: 'star', flash: false });
        // salt glitter hanging in the circle for its whole life
        V.fx({ dur, layer: 'ground', tick: () => { if (Math.random() < 0.35) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: rand(0, 20), vz: rand(10, 30), life: 0.9, size: rand(4, 7), color: '#ffffff', kind: 'star' }); } }, draw: () => {} });
        break;
      }
      case 'salve': {
        const R = big ? 130 : 110;
        // a shield too: a small dome over the ally it lands on (blue-rimmed), rings of the salve's colour
        alemCrown(tent || { x, y }, col, 0.9);   // (online-refs pass) the splash on the ally's body
        for (let i = 0; i < 2; i++) V.shock(x, y, { r: R * (0.6 + i * 0.3), color: i ? ALEM_BLUE : col, dur: 0.6, w: 4, delay: i * 0.08 });
        V.dome(tent || { x, y }, { color: col, r: 40, dur: 1.2 });
        V.burst(x, y - 10, { color: col, color2: '#cfe4ff', n: 10, speed: 180, kind: 'star', flash: false });
        break;
      }
      case 'quick': {
        V.burst(x, y, { color: '#ffd23a', color2: '#ffffff', n: 18, speed: 300, kind: 'star' });
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rand(-0.4, 0.4); V.lightning(x, y, x + Math.cos(a) * 90, y + Math.sin(a) * 60, { color: '#fff0a0', jag: 12, dur: 0.22 }); }
        V.shock(x, y, { r: 120, color: '#ffd23a', dur: 0.4, w: 4 }); V.motes(x, y, { color: '#ffe680', n: 12, r: 80, rise: 1.4 });
        break;
      }
    }
  }
  // a lingering healing cloud: soft puffs that billow and drift for its whole life (it can follow an ally)
  function steam(x, y, R, dur, col, follow) {
    V.fx({ dur, layer: 'air', tick: () => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y;
      if (Math.random() < 0.45) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R * 0.85;
        V.spawn({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7, z: rand(0, 14), vx: rand(-12, 12), vz: rand(8, 22), drag: 0.03, life: rand(1.2, 1.8), size: rand(26, 40), size1: 56, color: col, kind: 'smoke', add: false, a: 0.32, fadeIn: 0.25, fadePow: 2 }); }
      if (Math.random() < 0.12) V.plus(cx + rand(-R, R) * 0.5, cy + rand(-R, R) * 0.35, { color: '#9affd8', n: 1 });
    }, draw: () => {} });
  }

  Object.assign(KIT_VFX, {
    // a vial thrown (data: { r, p (a Blend's parts), to, en, self, m, fol }): it arcs to target and shatters there.
    // self: its fuse ran out (or it spoiled into a spill) in the bandolier, so it bursts right on the hero.
    vial: (e, target, d) => {
      if (!d) return;
      const parts = d.p || [d.r], cols = parts.map(r => alemInfo(r).color), m = d.m || 1;
      // a Reaction (three reagents) or a Grand Blend: two vials fly on their own arcs and collide where they land,
      // a two-coloured burst and a rune circle in both colours (alemReactRune) under the recipe's own splash
      const rk = typeof d.r === 'string' ? d.r : '';
      const react = parts.length > 1 || !!(ALEMBIC.reactions && ALEMBIC.reactions[rk]);
      let pair = null;
      if (react) {
        const ls = [...new Set(rk.split(''))].map(L => ALEMBIC.reagents[L] && ALEMBIC.reagents[L].color).filter(Boolean);
        pair = parts.length > 1 ? [cols[0], cols[1]] : ls.length > 1 ? [ls[0], ls[1]] : [cols[0], shade(cols[0], 0.45)];
      }
      const kiln = !!d.kiln;
      const go = (x, y) => {
        glass(x, y);
        if (kiln) { alemKilnBlast(x, y); return; }
        if (pair) { V.spikeburst(x, y, { r: 76, n: 14, color: pair[0], core: '#ffffff', ink: '#1a1020', dur: 0.36 }); V.spikeburst(x, y, { r: 52, n: 12, color: pair[1], core: '#ffffff', ink: '#1a1020', dur: 0.32, z: 18 });
          alemReactRune(x, y, 104, pair[0], pair[1], 1.8); }
        for (const r of parts) burst(r, x, y, m, target && target !== e ? target : null, d.fol);
      };
      if (d.self) { V.spawn({ x: e.x, y: e.y, z: 20, life: 0.3, size: 50, size1: 10, color: '#ffb040' }); go(e.x, e.y); return; }
      const ca = Math.cos(e.angle || 0), sa = Math.sin(e.angle || 0), hx = e.x + ca * 12, hy = e.y + sa * 12;
      const t = target || { x: e.x + ca * 140, y: e.y + sa * 140 };
      if (e.st) e.st.action = { type: 'cast', t0: FX.now, dur: 0.4 };
      // (online-refs pass) the wind-up of a lob: a quick flick of the wrist, a short arc of the vial's colour swept up
      // past the hand toward the throw, 0.16s
      { const a0 = Math.atan2(t.y - e.y, t.x - e.x), fc = kiln ? ALEM_KILN : cols[0];
        V.fx({ dur: 0.16, layer: 'air', draw: (cc, p, tt, f) => { const k = f.a * (1 - p), sw = -1.3 + 1.6 * easeOut(p);
          V.neonPath(cc, fc, 3 * (1 - p * 0.5), k, () => cc.arc(e.x, e.y - 18, 20, a0 + sw - 0.9, a0 + sw)); } }); }
      const land = (x, y) => go(target ? target.x : x, target ? target.y : y);
      if (kiln) { alemKilnGlow(e); lob(hx, hy, t.x, t.y, [ALEM_KILN, '#ffd08a'], land, { arc: 1.2 }); return; }
      if (pair) {   // the two vials leave from either hand
        lob(hx - sa * 10, hy + ca * 10, t.x, t.y, [pair[0]], land, { arc: 1.35 });
        lob(hx + sa * 10, hy - ca * 10, t.x, t.y, [pair[1]], () => {}, { arc: 0.6 });
        return;
      }
      lob(hx, hy, t.x, t.y, cols, land);
    },
    // a vial finished brewing: the still pops, a ring and a jet of coloured steam out of the chimney
    brew: (e, target, d) => {
      const col = d ? alemInfo(d.r).color : '#ffffff', s = still(e);
      puff(e, col, 4, 1.15);
      V.shock(s.x, s.y, { r: 30, color: col, dur: 0.3, w: 3, layer: 'air' });
      for (let i = 0; i < 6; i++) V.spawn({ x: s.x, y: s.y, z: 30, vx: rand(-60, 60), vy: rand(-40, 40), vz: rand(80, 160), g: 260, life: 0.5, size: rand(4, 6), color: col, kind: 'glow' });
    },
    // a Reaction found for the first time: a gold starburst over the still and its name, once
    discover: (e, target, d) => {
      const s = still(e), info = d ? alemInfo(d.r) : null;
      V.burst(s.x, s.y, { color: '#ffd27a', color2: '#ffffff', n: 20, speed: 240, kind: 'star', flashR: 60 });
      V.sigil(e.x, e.y, { r: 44, style: 'star5', color: '#ffd27a', dur: 1.2, spin: 2 });
      if (info) FX.text(e.x, e.y - 70, info.name, '#ffe2a0', 16, 1.6);
    },
    fizzle: e => { const s = still(e); V.smoke(s.x, s.y, { n: 4, color: '#8a8478', size: 16, a: 0.6, speed: 30 }); },
    spoil: (e, target, d) => { const s = still(e); V.smoke(s.x, s.y, { n: 3, color: '#6a5a3a', size: 14, a: 0.5, speed: 20 }); V.splash(s.x, s.y, { n: 4, color: '#6a5a3a', size: 0.7, speed: 0.5 }); },
    kindle: e => { const s = still(e); V.sparks(s.x, s.y, { color: '#ffb040', n: 5, angle: e.angle || 0, spread: 0.5, speed: 240 }); },
    ricochet: (e, target) => { if (target) { V.hit(target.x, target.y, '#ffb050', 0.8); V.flare(target.x, target.y, { n: 6, r: 12 }); } },
    // (online-refs pass: Renewing Mist's jump) a bead of the cure drops onto the next ally and splashes small and green
    leap: (e, target) => { if (!target) return; const w = target;
      V.fx({ dur: 0.16, layer: 'air', draw: (cc, p, t, f) => { const z = 90 * (1 - p * p), y = w.y - 20 - z; V.glowAt(cc, w.x, y, 9, '#4fe0c0', f.a); V.glowAt(cc, w.x, y, 3, '#ffffff', f.a);
        V.neonPath(cc, '#4fe0c0', 2, 0.5 * f.a, () => { cc.moveTo(w.x, y - 4); cc.lineTo(w.x, y - 20); }); },
        done: () => { V.splash(w.x, w.y, { n: 8, color: '#4fe0c0', speed: 1.4 }); alemCrown(w, '#4fe0c0', 0.7); V.plus(w.x, w.y, { color: '#9affd8', n: 2 }); } }); },
  });
})();

// Auto-attacks: small, quick and frequent, so they stay well below the abilities visually.
// c: { ent, tx, ty, ang, alt (alternates swing direction), color (class accent) }
const AUTO_VFX = (() => {
  const V = VFX;
  // where a melee swing connects: toward the target, but no further than the weapon reaches
  const reach = (c, d) => { const dist = Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y), r = Math.min(dist, d); return { x: c.ent.x + Math.cos(c.ang) * r, y: c.ent.y + Math.sin(c.ang) * r }; };
  return {
    slash: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 52, span: 1.4, color: '#dfe8ff', dur: 0.22, w: 0.32, flip: c.alt, sparks: 3 }); c.later(0.08, () => { const p = reach(c, 70); V.hit(p.x, p.y, '#e8f0ff', 0.45); }); },
    chop: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 60, span: 1.7, color: '#ff8a7a', dur: 0.26, w: 0.42, flip: c.alt, sparks: 4 }); c.later(0.1, () => { const p = reach(c, 76); V.hit(p.x, p.y, '#ffb0a0', 0.55); V.splash(p.x, p.y, { n: 3, size: 0.6 }); }); },
    stab: c => { const p = reach(c, 62); V.slash(c.ent.x, c.ent.y, c.ang + (c.alt ? 0.35 : -0.35), { r: 40, span: 0.8, color: '#e0b0ff', dur: 0.18, w: 0.3, flip: c.alt, sparks: 2 }); c.later(0.06, () => V.sparks(p.x, p.y, { color: '#f0d8ff', n: 4, angle: c.ang, spread: 0.6, speed: 260 })); },
    rune: c => V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'orb', color: '#8a90ff', speed: 900, size: 0.55, onHit: (x, y) => V.hit(x, y, '#b4bcff', 0.45) }),
    shot: c => V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'arrow', color: '#e8e0c0', speed: 1500, size: 0.8, onHit: (x, y) => V.hit(x, y, '#fff2c0', 0.4) }),
    // ---- (shared-fx polish) the casters' autos each look like their class (dispatched by class, so the kits keep
    // the 'spark' kind and its cast pose); anyone else's spark is the plain orb
    spark: c => { const f = SPARK[c.ent && c.ent.cls && c.ent.cls.id]; if (f) return f(c);
      V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'orb', color: c.color, speed: 950, size: 0.5, onHit: (x, y) => V.hit(x, y, c.color, 0.35) }); },
    // Runeguard: a gauntleted rune-shield bash (a melee tank: no missile). A shove of indigo light off the shield face,
    // a little rune flashing where it lands, a few sparks
    runebash: c => {
      const p = reach(c, 58), a = c.ang;
      V.fx({ dur: 0.16, layer: 'air', draw: (cx, q, t, e) => { const k = e.a * (1 - q), R = 16 + 10 * easeOut(q), hx = c.ent.x + Math.cos(a) * (20 + 18 * q), hy = c.ent.y - 16 + Math.sin(a) * (20 + 18 * q);
        V.neonPath(cx, RG_AUTO, 3 * (1 - q * 0.5), k, () => cx.arc(hx - Math.cos(a) * R, hy - Math.sin(a) * R, R, a - 0.8, a + 0.8)); } });
      c.later(0.07, () => { V.spikeburst(p.x, p.y, { r: 20, n: 8, color: RG_AUTO, core: '#eef0ff', ink: '#0e1238', dur: 0.2 }); V.sparks(p.x, p.y, { color: '#d0d6ff', n: 3, angle: a, spread: 0.7, speed: 240 });
        V.glint(p.x, p.y, { color: '#b4bcff', size: 22, z: 18, life: 0.22 }); });
    },
  };
})();

// ---- (shared-fx polish) the casters' own auto bolts: small, quick and cheap (one effect, at most one trail particle a
// tick). Pyromancer a flame bolt shedding embers; Cleric a gold light mote with a tiny halo; Grovekeeper a seed wrapped
// in leaves; Chronomancer a violet clock-shard; Alembist a little glass vial lobbed over, bursting into coloured fizz.
const RG_AUTO = '#8a90ff';
const SPARK = (() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a);
  // one small projectile: o = { speed, arc, z, head(c, x, y, ang, t, k, p), trail(x, y, z, ang, p), tail: [col, w], hit(x, y, ang) }
  function bolt(c, o) {
    const sx = c.ent.x, sy = c.ent.y, tx = c.tx, ty = c.ty, d = Math.hypot(tx - sx, ty - sy), dur = Math.max(0.08, d / (o.speed || 950)), ang = Math.atan2(ty - sy, tx - sx), arc = o.arc || 0, z0 = o.z ?? 20;
    const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p, z: z0 * (1 - p * 0.4) + Math.sin(p * Math.PI) * arc });
    V.fx({ dur, layer: 'air', tick: o.trail ? (p) => { const q = pos(p); o.trail(q.x, q.y, q.z, ang, p); } : undefined,
      draw: (cx, p, t, e) => { const q = pos(p), y = q.y - q.z;
        if (o.tail) { const b = pos(Math.max(0, p - 0.14)); V.streakTo(cx, b.x, b.y - b.z, q.x, y, o.tail[1], o.tail[0], 0.85 * e.a); }
        o.head(cx, q.x, y, arc ? Math.atan2((pos(Math.min(1, p + 0.02)).y - pos(Math.min(1, p + 0.02)).z) - y, pos(Math.min(1, p + 0.02)).x - q.x) : ang, t, e.a, p); },
      done: () => { if (o.hit) o.hit(tx, ty, ang); } });
  }
  return {
    pyromancer: c => bolt(c, { speed: 900, tail: ['#ff6a1a', 4],
      head: (x, px, py, a, t, k) => { V.glowAt(x, px, py, 16, '#ff7a1a', 0.85 * k);
        const fl = 1 + Math.sin(t * 40) * 0.15; x.save(); x.translate(px, py); x.rotate(a); x.globalCompositeOperation = 'lighter';
        for (const [col, L, W, al] of [['#ff5a1a', 15, 5, 0.8], ['#ffb040', 11, 3.6, 0.9], ['#fff2c0', 6, 2.2, 1]]) { x.globalAlpha = al * k; x.fillStyle = col; x.beginPath();
          x.moveTo(W, 0); x.quadraticCurveTo(W * 0.9, W, -L * 0.45 * fl, W * 0.35); x.lineTo(-L * fl, 0); x.lineTo(-L * 0.45 * fl, -W * 0.35); x.quadraticCurveTo(W * 0.9, -W, W, 0); x.fill(); }
        x.restore(); },
      trail: (x, y, z, a) => { if (Math.random() < 0.5) V.spawn({ x, y, z, vx: -Math.cos(a) * rand(40, 110) + rand(-30, 30), vy: -Math.sin(a) * rand(40, 110) + rand(-30, 30), vz: rand(10, 60), drag: 0.06, g: 140, life: rand(0.25, 0.45), size: rand(2.5, 4), size1: 0, color: Math.random() < 0.5 ? '#ffd070' : '#ff8a2a', stretch: 2 }); },
      hit: (x, y, a) => { V.hit(x, y, '#ffb060', 0.35); V.sparks(x, y, { color: '#ffc060', n: 3, angle: a + Math.PI, spread: 1, speed: 200 }); } }),
    cleric: c => bolt(c, { speed: 820, tail: ['#ffe9a0', 3],
      head: (x, px, py, a, t, k) => { V.glowAt(x, px, py, 15, '#fff0b8', 0.8 * k); V.glowAt(x, px, py, 5, '#ffffff', k);
        V.neonRing(x, px, py, 8 + Math.sin(t * 18) * 0.8, '#ffe9a0', 1.1, 0.8 * k, 0.45); },
      trail: (x, y, z) => { if (Math.random() < 0.3) V.spawn({ x: x + rand(-3, 3), y, z: z + rand(-3, 3), vz: rand(-10, 15), life: rand(0.25, 0.4), size: rand(5, 8), size1: 0, color: '#fff6d8', kind: 'star', vr: 4 }); },
      hit: (x, y) => { V.spawn({ x, y, z: 16, life: 0.22, size: 30, size1: 10, color: '#fff0b8', kind: 'star', vr: 4 }); V.shock(x, y, { r: 24, color: '#fff0b8', dur: 0.25, w: 2 }); V.motes(x, y, { color: '#fff6d8', n: 2, r: 10, size: 6, life: 0.6 }); } }),
    grovekeeper: c => bolt(c, { speed: 780, arc: 10, tail: ['#8fff7a', 2.5],
      head: (x, px, py, a, t, k) => { V.glowAt(x, px, py, 13, '#8fff7a', 0.5 * k);
        x.save(); x.translate(px, py); x.rotate(t * 14); x.globalAlpha = k;
        x.fillStyle = '#6a4a22'; x.strokeStyle = '#1e140a'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, 0, 3.4, 2.4, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        const lf = V.sprite('leaf', '#7ee06a'); x.drawImage(lf, -1, -9, 12, 9); x.rotate(Math.PI); x.drawImage(lf, -1, -9, 12, 9);
        x.restore(); },
      trail: (x, y, z) => { if (Math.random() < 0.2) V.spawn({ x, y, z, vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(0, 30), g: 60, life: 0.6, size: 7, color: Math.random() < 0.5 ? '#8fff7a' : '#5fbf4a', kind: 'leaf', add: false, vr: rand(-8, 8), flutter: 6 }); },
      hit: (x, y) => { V.hit(x, y, '#b8ff9a', 0.3); V.motes(x, y, { kind: 'leaf', color: '#7ee06a', n: 3, r: 12, size: 8, life: 0.7 }); } }),
    chronomancer: c => bolt(c, { speed: 1000, tail: ['#b48cff', 3],
      head: (x, px, py, a, t, k) => { V.glowAt(x, px, py, 15, '#b48cff', 0.75 * k);
        x.save(); x.translate(px, py); x.rotate(t * 10); x.globalAlpha = k; x.drawImage(V.sprite('shard', '#c8a8ff'), -8, -8, 16, 16); x.restore();
        V.glowAt(x, px, py, 4, '#ffffff', k); },
      trail: (x, y, z) => { if (Math.random() < 0.35) V.spawn({ x, y, z, life: 0.3, size: rand(4, 7), size1: 0, color: Math.random() < 0.5 ? '#b48cff' : '#7aa0ff' }); },
      // a tiny clock face ticks once where it lands
      hit: (x, y) => { V.hit(x, y, '#d8c4ff', 0.3);
        V.fx({ dur: 0.3, layer: 'air', draw: (cx, p, t, e) => { const k = e.a * (1 - p), R = 11 + 4 * p, cy = y - 18;
          V.neonRing(cx, x, cy, R, '#b48cff', 1.4, k, 1); V.neonPath(cx, '#e0d4ff', 1.4, k, () => { cx.moveTo(x, cy); cx.lineTo(x, cy - R * 0.75); cx.moveTo(x, cy); const ha = -Math.PI / 2 + p * Math.PI * 1.2; cx.lineTo(x + Math.cos(ha) * R * 0.5, cy + Math.sin(ha) * R * 0.5); }); } }); } }),
    alembist: c => { const liq = ['#5ff08a', '#ff6a4a', '#4fa8ff'][(Math.random() * 3) | 0];
      bolt(c, { speed: 620, arc: 34, z: 22,
        head: (x, px, py, a, t, k) => { x.save(); x.translate(px, py); x.rotate(t * 13); x.scale(1.5, 1.5); x.globalAlpha = k;
          x.fillStyle = 'rgba(210,235,255,0.45)'; x.strokeStyle = '#1a1622'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(0, 1.5, 4, 4.5, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.fillStyle = liq; x.beginPath(); x.ellipse(0, 2.6, 3.2, 3, 0, 0, Math.PI); x.fill();
          x.fillStyle = '#c8b8a0'; x.fillRect(-1.6, -5.5, 3.2, 3); x.strokeRect(-1.6, -5.5, 3.2, 3);
          x.fillStyle = '#7a5a3a'; x.fillRect(-1.3, -7.5, 2.6, 2.2);
          x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(-2.6, -0.5, 1, 2.4);
          x.restore(); V.glowAt(x, px, py, 10, liq, 0.35 * k); },
        trail: (x, y, z) => { if (Math.random() < 0.3) V.spawn({ x: x + rand(-2, 2), y, z, vz: rand(10, 30), life: 0.35, size: rand(3, 5), size1: 0, color: liq }); },
        hit: (x, y) => { V.spawn({ x, y, z: 12, life: 0.18, size: 26, size1: 8, color: liq, kind: 'star', vr: 5 });
          for (let i = 0; i < 3; i++) V.spawn({ x, y, z: 12, vx: rand(-110, 110), vy: rand(-60, 60), vz: rand(60, 150), g: 500, life: 0.4, size: 6, color: '#dff0ff', kind: 'shard', add: false, vr: rand(-12, 12) });
          V.splash(x, y, { color: liq, n: 4, size: 0.55, speed: 0.6, z: 12 });
          for (let i = 0; i < 4; i++) V.spawn({ x: x + rand(-10, 10), y: y + rand(-5, 5), z: rand(4, 14), vz: rand(20, 50), life: rand(0.4, 0.7), size: rand(3, 5), size1: 0, color: i % 2 ? liq : '#ffffff' }); } }); },
  };
})();

// ======================================================================= CAST_VFX (shared-fx polish)
// The gathering while a long cast (over 1s) charges: fire gathering in the Pyromancer's hand, light motes drawn into the
// Cleric's staff, an arrow-draw glow on the Ranger's bow, leaves spiralling to the Grovekeeper, a clock ring forming
// under the Chronomancer, fizz rising off the Alembist's flask, a rune ring forming for anyone else. It grows with the
// cast's progress. main.js starts it at castStart (CAST_VFX.start); after that it watches the hero's castBar itself:
// the cast running out (or the bar going) is the release (a small flash into the hand; the ability's recipe takes
// over), and castBar.stop (an interrupt or a stop) or a new cast is the cancel (it fizzles out in 0.15s).
// handle.cancel() / handle.release() end it by hand. Someone else's plays at 0.6 (the caller's scale).
const CAST_VFX = (() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2, MIN = 1.0;
  // where the light gathers: the casting hand (or a staff's tip, a bow's string), as ground x/y and a height z
  const handOf = (e, z, fwd = 14) => ({ x: e.x + Math.cos(e.angle || 0) * fwd, y: e.y + Math.sin(e.angle || 0) * fwd * 0.6, z: z + (e.lift || 0) });
  // one mote pulled in on a spiral to a moving point (h: { x, y } updated each tick)
  const inward = (h, z, r, col, o = {}) => { const a = Math.random() * TAU, life = o.life ?? 0.45;
    V.spawn({ x: h.x, y: h.y, z, life, size: o.size ?? rand(4, 7), size1: o.size1 ?? 2, color: col, kind: o.kind, add: o.add, vr: o.vr, flutter: o.flutter,
      orbit: { follow: h, x: h.x, y: h.y, a, r, w: (Math.random() < 0.5 ? 1 : -1) * rand(5, 8), dr: -r / life * 0.95, flat: o.flat ?? 0.6 } }); };
  const R = {
    pyromancer: { col: '#ff7a1a', z: 30,
      tick(s, q) { if (Math.random() < 0.25 + 0.5 * q) inward(s.h, s.h.z, 36 - 10 * q, Math.random() < 0.5 ? '#ffb040' : '#ff6a1a', { life: 0.4 }); },
      draw(c, s, q, k, t) { const { x, y } = s.p, sz = 5 + 9 * q, fl = 1 + Math.sin(t * 30) * 0.12;
        V.glowAt(c, x, y, 14 + 22 * q, '#ff7a1a', 0.7 * k);
        c.save(); c.translate(x, y); c.globalCompositeOperation = 'lighter';
        for (const [col, h, w, al] of [['#ff5a1a', 2.2, 1, 0.75], ['#ffb040', 1.6, 0.72, 0.85], ['#fff2c0', 0.9, 0.42, 1]]) { c.globalAlpha = al * k; c.fillStyle = col; c.beginPath();
          c.moveTo(-sz * w, 0); c.quadraticCurveTo(-sz * w, -sz * h * 0.6 * fl, Math.sin(t * 9) * sz * 0.2, -sz * h * fl); c.quadraticCurveTo(sz * w, -sz * h * 0.6 * fl, sz * w, 0); c.arc(0, 0, sz * w, 0, Math.PI); c.fill(); }
        c.restore(); } },
    cleric: { col: '#fff0b8', z: 54, fwd: 12,
      tick(s, q) { if (Math.random() < 0.3 + 0.4 * q) inward(s.h, s.h.z + rand(-6, 10), 48 - 14 * q, Math.random() < 0.6 ? '#fff0b8' : '#ffffff', { kind: Math.random() < 0.4 ? 'star' : undefined, life: 0.5, vr: 4 }); },
      draw(c, s, q, k, t) { const { x, y } = s.p;
        V.glowAt(c, x, y, 12 + 20 * q, '#fff0b8', 0.75 * k); V.glowAt(c, x, y, 4 + 5 * q, '#ffffff', k);
        V.neonRing(c, x, y, 8 + 6 * q, '#ffe9a0', 1.2, k * q, 0.4);
        c.save(); c.translate(x, y); c.rotate(t * 1.5); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 * k * q; c.fillStyle = '#fff6d8';
        for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -2); c.lineTo(14 + 8 * q, 0); c.lineTo(0, 2); c.fill(); }
        c.restore(); } },
    ranger: { col: '#fff2c0', z: 28, fwd: 16,
      tick(s, q) { if (Math.random() < 0.15 + 0.35 * q) inward(s.tip, s.h.z, 22, '#fff2c0', { life: 0.3, size: 4 }); },
      draw(c, s, q, k, t) { const a = s.e.angle || 0, ca = Math.cos(a), sa = Math.sin(a) * 0.6, { x, y } = s.p, L = 10 + 16 * q;
        // the drawn arrow: a line of light from the string to the head, brightening as the string comes back
        V.neonPath(c, '#ffe9a0', 1.6 + 1.4 * q, k * (0.4 + 0.6 * q), () => { c.moveTo(x - ca * 10, y - sa * 10); c.lineTo(x + ca * L, y + sa * L); });
        V.glowAt(c, x + ca * L, y + sa * L, 8 + 14 * q, '#fff2c0', 0.9 * k); V.glowAt(c, x + ca * L, y + sa * L, 3 + 3 * q, '#ffffff', k);
        if (q > 0.85) V.glowAt(c, x + ca * L, y + sa * L, 26, '#ffffff', k * (0.4 + 0.4 * Math.sin(t * 30))); } },
    grovekeeper: { col: '#8fff7a', z: 30,
      tick(s, q) { if (Math.random() < 0.2 + 0.35 * q) inward(s.h, s.h.z - rand(0, 18), 40 - 10 * q, Math.random() < 0.5 ? '#8fff7a' : '#5fbf4a', { kind: 'leaf', add: false, size: 8, size1: 4, life: 0.6, vr: 6, flutter: 5 });
        if (Math.random() < 0.15) inward(s.h, s.h.z, 30, '#ffd0e8', { kind: 'petal', add: false, size: 6, size1: 3, life: 0.5, flutter: 5 }); },
      draw(c, s, q, k, t) { const { x, y } = s.p, e = s.e;
        V.glowAt(c, x, y, 12 + 16 * q, '#8fff7a', 0.6 * k); V.glowAt(c, x, y, 3 + 3 * q, '#ffffff', 0.9 * k);
        V.neonRing(c, e.x, e.y + 2, 18 + 12 * q, '#7ee06a', 1.6, k * 0.8 * q, 0.5); } },
    chronomancer: { col: '#b48cff', z: 32,
      tick(s, q) { if (Math.random() < 0.2 + 0.3 * q) inward(s.h, s.h.z, 30, Math.random() < 0.5 ? '#b48cff' : '#7aa0ff', { life: 0.4 }); },
      draw(c, s, q, k, t) { const { x, y } = s.p, e = s.e, R0 = 30, fl = 0.5, n = Math.floor(12 * Math.min(1, q * 1.1));
        V.glowAt(c, x, y, 10 + 14 * q, '#b48cff', 0.65 * k);
        // the clock face under the feet: its rim, an hour tick appearing for each twelfth of the cast, a hand sweeping
        V.neonRing(c, e.x, e.y + 2, R0, '#b48cff', 1.6, k * Math.min(1, q * 3), fl);
        V.neonPath(c, '#e0d4ff', 1.3, k, () => { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * TAU / 12; c.moveTo(e.x + Math.cos(a) * R0 * 0.78, e.y + 2 + Math.sin(a) * R0 * 0.78 * fl); c.lineTo(e.x + Math.cos(a) * R0 * 0.94, e.y + 2 + Math.sin(a) * R0 * 0.94 * fl); }
          const ha = -Math.PI / 2 + q * TAU; c.moveTo(e.x, e.y + 2); c.lineTo(e.x + Math.cos(ha) * R0 * 0.7, e.y + 2 + Math.sin(ha) * R0 * 0.7 * fl); }); } },
    alembist: { col: '#5ff08a', z: 28,
      tick(s, q) { if (Math.random() < 0.3 + 0.4 * q) V.spawn({ x: s.h.x + rand(-4, 4), y: s.h.y, z: s.h.z, vz: rand(25, 60), vx: rand(-8, 8), life: rand(0.35, 0.6), size: rand(3, 5.5), size1: 0, color: s.liq(), kind: Math.random() < 0.3 ? 'star' : undefined }); },
      draw(c, s, q, k, t) { const { x, y } = s.p, col = s.liq();
        V.glowAt(c, x, y, 10 + 14 * q, col, 0.6 * k); V.glowAt(c, x, y, 3 + 3 * q, '#ffffff', 0.9 * k);
        V.neonPath(c, col, 1.2, k * q, () => c.ellipse(x, y, 8 + 4 * q, 3 + 1.5 * q, 0, t * 8, t * 8 + 4.2)); },
      init(s) { const cols = ['#5ff08a', '#ff6a4a', '#4fa8ff']; s.liq = () => cols[Math.floor(s.t * 2.5) % 3]; } },
    thermist: { col: '#ff8a3a', z: 30,
      tick(s, q) { if (Math.random() < 0.25 + 0.45 * q) inward(s.h, s.h.z, 34 - 8 * q, Math.random() < 0.5 ? '#ff8a3a' : '#8fd0ff', { life: 0.42 }); },
      draw(c, s, q, k, t) { const { x, y } = s.p; V.glowAt(c, x - 4, y, 10 + 12 * q, '#ff8a3a', 0.55 * k); V.glowAt(c, x + 4, y, 10 + 12 * q, '#6fb2f0', 0.55 * k); V.glowAt(c, x, y, 3 + 3 * q, '#ffffff', 0.9 * k); } },
  };
  // anyone else: a rune ring forming at the feet, closing as the cast fills, and a light gathering in the hand
  const DEF = { z: 30,
    tick(s, q) { if (Math.random() < 0.15 + 0.3 * q) inward(s.h, s.h.z, 30, s.col, { life: 0.4 }); },
    draw(c, s, q, k, t) { const { x, y } = s.p, e = s.e, R0 = 28, a0 = -Math.PI / 2;
      V.glowAt(c, x, y, 10 + 12 * q, s.col, 0.6 * k);
      V.neonPath(c, s.col, 1.8, k, () => c.ellipse(e.x, e.y + 2, R0, R0 * 0.5, 0, a0, a0 + TAU * Math.max(0.02, q))); } };

  function start(e, dur, ab) {
    if (!e || !(dur > MIN)) return null;
    if (e._castFx) e._castFx.cancel(true);
    const id = e.cls && e.cls.id, r = R[id] || DEF;
    const bar = e.castBar || null;
    const s = { e, dur, ab, bar, t: 0, end: null, released: false, col: r.col || (e.cls && e.cls.accent) || '#ffffff', h: handOf(e, r.z, r.fwd), tip: { x: e.x, y: e.y }, p: { x: e.x, y: e.y } };
    if (r.init) r.init(s);
    const place = () => { const h = handOf(e, r.z, r.fwd); s.h.x = h.x; s.h.y = h.y; s.h.z = h.z; s.p.x = h.x; s.p.y = h.y - h.z;
      s.tip.x = h.x + Math.cos(e.angle || 0) * 22; s.tip.y = h.y + Math.sin(e.angle || 0) * 13; };
    const handle = {
      // fade it out quickly, with a little fizzle (quiet: no fizzle, for a cast replaced by another)
      cancel(quiet) { if (s.end) return; s.end = s.t; if (!quiet && s.t > 0.15) { place(); for (let i = 0; i < 2; i++) V.spawn({ x: s.h.x + rand(-4, 4), y: s.h.y, z: s.h.z, vx: rand(-15, 15), vz: rand(15, 35), drag: 0.05, life: 0.5, size: 10, size1: 20, color: '#8a8090', kind: 'smoke', add: false, a: 0.35 }); } if (e._castFx === handle) e._castFx = null; },
      // the cast went off: a quick flash into the hand; the ability's own recipe takes it from here
      release() { if (s.end) return; s.end = s.t; s.released = true; place();
        V.flash(s.p.x, s.p.y, 26, s.col, 0.16);
        for (let i = 0; i < 4; i++) { const a = Math.random() * TAU; V.spawn({ x: s.h.x, y: s.h.y, z: s.h.z, vx: Math.cos(a) * 90, vy: Math.sin(a) * 50, vz: rand(-20, 40), drag: 0.08, life: 0.3, size: 5, size1: 0, color: s.col }); }
        if (e._castFx === handle) e._castFx = null; },
    };
    e._castFx = handle;
    V.fx({ dur: dur + 0.6, layer: 'air', tick: (p, dt, fx) => {
      s.t = p * fx.dur;
      if (!s.end) {
        // the hero's cast bar says how it went: cut short (stop) or replaced is a cancel; run out or gone is the release
        const cb = e.castBar;
        if (bar && (cb !== bar || cb.stop != null)) { if (cb === bar || !cb) { if (cb && cb.stop != null) handle.cancel(); else handle.release(); } else handle.cancel(true); }
        else if (s.t >= dur) handle.release();
      }
      if (s.end) { if (s.t - s.end > 0.16) fx.dur = 0; return; }
      place(); r.tick(s, Math.min(1, s.t / dur));
    }, draw: (c, p, t, fx) => {
      if (!s.end) place();
      const q = Math.min(1, t / dur), fade = s.end != null ? Math.max(0, 1 - (t - s.end) / 0.15) : 1, k = fx.a * Math.min(1, t / 0.15) * fade;
      if (k > 0.01) r.draw(c, s, s.released ? 1 : q, k, t);
    } });
    return handle;
  }
  return { start, stop(e, released) { if (e && e._castFx) e._castFx[released ? 'release' : 'cancel'](); }, recipes: R };
})();

// DPS specialization moves (kept in their own block; the class recipes above stay as they were).
(() => {
  const V = VFX;
  Object.assign(ABILITY_VFX.ranger, {
    // Sharpshooter: a glint on the string, then a golden spiralling shot and a puff of dust where it lands
    // (online-refs pass: WoW Aimed Shot) the draw flares on the string, a thick gold lance of light runs out ahead of the
    // arrow and through the target, a white-gold pop and a little dust
    aimed: c => { const a = Math.atan2(c.ty - c.y, c.tx - c.x), hx = c.x + Math.cos(a) * 18, hy = c.y + Math.sin(a) * 18, ex = c.tx + Math.cos(a) * 60, ey = c.ty + Math.sin(a) * 60;
      V.spawn({ x: hx, y: hy, z: 20, life: 0.25, size: 34, size1: 8, color: '#fff2c0', kind: 'star', vr: 6 });
      OLD_PAINT.thrust(hx, hy, ex, ey, { w: 11, color: '#f2d27a', core: '#fffbe8', ink: '#2a1c04', head: true, dur: 0.32, z: 18 });
      V.missile(c.x, c.y, c.tx, c.ty, { style: 'helix', color: '#f2d27a', speed: 1700, size: 1.3, onHit: (x, y) => { V.hit(x, y, '#fff2c0', 1.2); V.spikeburst(x, y, { r: 44, n: 10, color: '#ffd65a', core: '#ffffff', ink: '#2a1c04', dur: 0.28, z: 20 }); V.shock(x, y, { r: 70, color: '#ffe9a0', dur: 0.35, w: 4 }); V.smoke(x, y, { n: 3, color: '#d8ccb0', size: 22, a: 0.5, speed: 50 }); vfxShake(3); } }); },
    // Venomstrike: a dripping green arrow that splashes acid, which bubbles for a moment
    caustic: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'arrow', color: '#9aff4a', speed: 1400, size: 1.2, onHit: (x, y) => {
      V.splash(x, y, { color: '#7adf3a', n: 12, speed: 1.2 }); V.puddle(x, y, { r: 40, color: '#9aff4a', dark: '#1e3a0a', dur: 3 }); V.hit(x, y, '#c8ff8a', 1); V.shock(x, y, { r: 60, color: '#9aff4a', dur: 0.35, w: 4 });
      for (let i = 0; i < 10; i++) V.spawn({ x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 24, z: 4, vz: 20 + Math.random() * 40, life: 0.8 + Math.random() * 0.6, size: 7, size1: 12, color: '#9adf3a', kind: 'soft' }); } }),
  });
  Object.assign(ABILITY_VFX.shadowblade, {
    // Bladedancer: three silver-violet cuts all the way around, a whirl of steel, sparks flung out
    fury: c => { for (let i = 0; i < 3; i++) c.later(i * 0.06, () => V.slash(c.x, c.y, c.ang + i * 2.1, { r: 64, span: 2.4, color: i % 2 ? '#c58aff' : '#e8ecff', w: 0.5, dur: 0.26, flip: i % 2 === 1, sparks: 4 }));
      V.swirl(c.x, c.y, { r: 66, color: '#d8c0ff', dur: 0.5, arms: 4, layer: 'air' }); },
    // Nightstalker: a deep crimson thrust from behind, a red flash and a spray at the wound
    // (polish, rogue sheet's Backstab) a red arrowhead streak drives through the target with two thinner streaks beside it
    backstab: c => { V.slash(c.x, c.y, c.ang, { r: 56, span: 0.9, color: '#ff3a5a', w: 0.7, dur: 0.22 });
      const a = Math.atan2(c.ty - c.y, c.tx - c.x), nx = -Math.sin(a), ny = Math.cos(a), sx = c.x - Math.cos(a) * 16, sy = c.y - Math.sin(a) * 16, ex = c.tx + Math.cos(a) * 34, ey = c.ty + Math.sin(a) * 34;
      OLD_PAINT.thrust(sx, sy, ex, ey, { w: 14, color: '#d01a3a', core: '#ffe0e8', ink: '#2a0410', head: true, dur: 0.28, z: 20 });
      for (const s of [-1, 1]) c.later(0.03, () => OLD_PAINT.thrust(sx + nx * s * 14, sy + ny * s * 10, ex - Math.cos(a) * 26 + nx * s * 14, ey - Math.sin(a) * 26 + ny * s * 10, { w: 5, color: '#ff3a5a', core: '#ffd0d8', ink: '#2a0410', dur: 0.22, z: 20 }));
      c.later(0.07, () => { V.spawn({ x: c.tx, y: c.ty, z: 18, life: 0.3, size: 70, size1: 24, color: '#ff3a5a', kind: 'star', vr: 5 }); V.splash(c.tx, c.ty, { n: 12, speed: 1.3 }); V.hit(c.tx, c.ty, '#ff8a9a', 1.2);
        V.spikeburst(c.tx, c.ty, { r: 48, n: 12, color: '#c01a3a', core: '#ffe0ec', ink: '#2a0410', dur: 0.32, z: 18 }); vfxShake(3); }); },
  });
  Object.assign(ABILITY_VFX.pyromancer, {
    // Cataclysm: a big rune circle marks the spot, a meteor falls onto it 1.5s later (when the damage lands) and leaves a crater that burns for the 9s burn
    // (online-refs pass: WoW Meteor) the rune ring is amber, never telegraph red, and the burning crater is a fainter
    // scorch with fewer flames so a boss telegraph under it still reads
    meteor: c => V.meteor(c.tx, c.ty, { r: 88, color: '#ffa040', wind: 1.15, fall: 0.35, from: 220, onHit: (x, y) => { V.crater(x, y, { r: 62, dur: 9, color: '#ff8a2a', a: 0.5, flames: 3 }); vfxShake(9); } }),
    // Sigilmancer: a ring of ember glyphs on the floor for the circle's whole life, embers rising off its rim
    circle: c => {
      const x = c.x, y = c.y, r = 95;
      vfxLingerSettle(V.sigil(x, y, { r, style: 'runes', color: '#ffb347', dur: 20, spin: 0.25 }), 0.3, 1.2);   // (QA) settles faint for its 20s
      V.shock(x, y, { r: r + 20, color: '#ffcf7a', dur: 0.5, w: 6 }); V.flare(x, y, { n: 14, r: 20, color: '#ff9a3a' });
      V.fx({ dur: 20, layer: 'ground', draw: (ctx, p, t, e) => {
        const k = Math.min(1, p / 0.05, (1 - p) / 0.05) * e.a;
        ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = 'rgba(40,16,4,1)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(x, y, r + 3, (r + 3) * 0.78, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }, tick: () => { if (Math.random() < 0.4) { const a = Math.random() * Math.PI * 2; V.spawn({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.78, z: 0, vz: 40 + Math.random() * 60, life: 0.9, size: 7, size1: 0, color: Math.random() < 0.5 ? '#ffb347' : '#ffe08a' }); } } });
    },
  });
})();

// ======================================================================= Talents
// The moves a talent grants (combat/talents.js `grants`, kits.js TALENT_ABILITIES) and the moments talents add
// (k.fx names). Capstone moves (row V) leave a signature shape on the field for as long as they last: wings, a blood
// moon, a standing rune, a falcon, a phoenix, a treant, a great clock.
(() => {
  // the talent moments that land on the enemy: flagged atTarget, so main.js hands them the boss / the target dummy
  const AIMED = ['sunlit', 'edgeShard', 'edgeReturn', 'dawnPillar', 'moonburst', 'bloodlust', 'hemorrhage', 'glyphEcho', 'binding', 'runeBolt',
  'mirrorShards', 'runeOverflow', 'wardNova', 'whirl', 'explode', 'falconDive', 'ricochetArrow', 'stormArc', 'volley', 'deathmark', 'toxicBurst', 'shadowClone',
  'garrote', 'ambush', 'blossomEnd', 'twinFlame', 'chainReact', 'bomb', 'bombPlant', 'flashpoint', 'petalfall', 'sunfall', 'natureWrath', 'treantSlam',
  'clockStrike', 'futureMark', 'futureBurst'];
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
  const shake = s => vfxShake(s);
  const fade = (p, i = 0.1, o = 0.2) => Math.min(1, p / i, (1 - p) / o);
  // a moment aimed at the enemy, with a spot ahead of the hero when there's no enemy to hand
  const at = (e, t) => t || { x: e.x + Math.cos(e.angle || 0) * 160, y: e.y + Math.sin(e.angle || 0) * 160 };
  const longFor = (ent, spec, a, b) => (ent && ent.spec === spec ? b : a);

  // ---- shapes the capstones leave on the field
  // a pair of feathered wings behind a hero (drawn on the floor layer, so they sit behind the sprite)
  function wings(ent, dur, color) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      // (QA: they hid behind the sprite) spread wide from the shoulders, out past the hero's sides, so the wings read
      const k = Math.min(1, t / 0.25, (dur - t) / 0.6) * e.a * (0.75 + 0.25 * Math.max(0, 1 - t / 1.2)), open = easeOut(Math.min(1, t / 0.4)), bx = ent.x, by = ent.y - 24 - (ent.lift || 0), flap = Math.sin(t * 2.4) * 0.1;
      V.glowAt(c, bx, by - 8, 56, color, 0.22 * k);
      for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + sd * (0.5 + i * 0.19 * open + flap), L = (54 - i * 4) * (0.45 + 0.55 * open), w = 5 + i * 0.4;
        c.save(); c.translate(bx + sd * 8, by); c.rotate(a);
        c.globalAlpha = 0.55 * k; c.fillStyle = i % 2 ? '#fff6d8' : color; c.beginPath(); c.ellipse(L / 2, 0, L / 2, w, 0, 0, TAU); c.fill();
        c.globalAlpha = 0.5 * k; c.lineWidth = 1.2; c.strokeStyle = '#4a3408'; c.stroke();
        V.neonPath(c, color, 1.3, k * 0.8, () => c.ellipse(L / 2, 0, L / 2, w, 0, 0, TAU));
        c.restore();
      }
      c.globalAlpha = 1;
    }, tick: () => { if (Math.random() < 0.15) V.spawn({ x: ent.x + rand(-40, 40), y: ent.y + rand(-4, 4), z: rand(30, 60), vz: rand(-40, -20), vx: rand(-15, 15), life: 1.3, size: 11, color: '#fff8e6', kind: 'feather', add: false, vr: rand(-2, 2), flutter: 3, fadeIn: 0.1 }); } });
  }
  // a bird seen from above: s scale, flap phase, facing ang
  function bird(c, x, y, s, flap, ang, body, edge, a) {
    const span = 0.55 + 0.45 * Math.cos(flap);
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s); c.globalAlpha = a;
    c.fillStyle = body; c.strokeStyle = OUT; c.lineWidth = 1.2 / s;
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(3, sd * 14 * span, -7, sd * 21 * span); c.lineTo(-3, sd * 5); c.closePath(); c.fill(); c.stroke(); }
    c.beginPath(); c.moveTo(-8, 0); c.lineTo(-16, -5); c.lineTo(-14, 0); c.lineTo(-16, 5); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 10, 3.6, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = edge; c.beginPath(); c.moveTo(10, 0); c.lineTo(13, -1.5); c.lineTo(13, 1.5); c.closePath(); c.fill();
    c.restore(); c.globalAlpha = 1;
  }
  // a rune standing up in the air: a tall diamond with strokes inside
  function standingRune(c, x, y, h, color, k, t) {
    const w = h * 0.42;
    V.glowAt(c, x, y, h * 0.9, color, 0.45 * k);
    V.neonPath(c, color, 2.4, k, () => { c.moveTo(x, y - h / 2); c.lineTo(x + w, y); c.lineTo(x, y + h / 2); c.lineTo(x - w, y); c.closePath(); });
    V.neonPath(c, color, 1.6, k * 0.85, () => { c.moveTo(x, y - h * 0.32); c.lineTo(x, y + h * 0.32); c.moveTo(x - w * 0.45, y - h * 0.08); c.lineTo(x + w * 0.45, y + h * 0.1); c.moveTo(x - w * 0.3, y + h * 0.2); c.lineTo(x + w * 0.3, y - h * 0.22); });
    V.glowAt(c, x, y, 8 + Math.sin(t * 6) * 2, '#ffffff', k);
  }

  Object.assign(ABILITY_VFX.bastion, {
    // Hallowed Ground: light falls on the spot and the floor is consecrated for 10s, embers rising off it, a pulse every 2s
    hallowed: c => { const x = c.x, y = c.y, r = 110;
      V.lightfall(x, y, { color: '#ffe08a', r: 34, h: 260, dur: 0.9, feathers: 3 });
      // (QA) the consecrated star is bright as it lands, then holds faint for the 10s (a boss telegraph under it reads)
      vfxLingerSettle(V.ink(x, y, { r, dur: 10 }), 0.6, 1); vfxLingerSettle(V.sigil(x, y, { r, style: 'star5', color: '#f2c84b', dur: 10, spin: 0.3 }), 0.3, 1.1);
      c.later(0.15, () => { V.spikeburst(x, y, { r: 70, n: 16, hole: 0.6, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', layer: 'ground', z: 0, flat: 0.6, dur: 0.5 }); V.debris(x, y, { n: 5, color: '#8a7a68' }); shake(3); });
      V.fx({ dur: 10, layer: 'ground', draw: () => {}, tick: (p, dt, e) => {
        if (Math.random() < 0.45) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.95; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: 0, vz: rand(40, 90), life: rand(0.7, 1.1), size: rand(6, 10), size1: 0, color: Math.random() < 0.6 ? '#ffd65a' : '#fff6d0', kind: Math.random() < 0.3 ? 'star' : 'glow' }); }
        e.n = e.n || 0; if (p * 10 >= (e.n + 1) * 2) { e.n++; V.shock(x, y, { r: r * 0.95, r0: 20, color: '#ffe08a', dur: 0.6, w: 4 }); }
      } }); },
    // Avatar of Dawn: a shaft of dawn, then wings of light on the back for the whole burst
    avatar: c => { const dur = longFor(c.ent, 'crusader', 15, 20);
      V.lightfall(c.x, c.y, { color: '#ffe08a', r: 28, h: 300, dur: 1.1, feathers: 8 });
      c.later(0.2, () => { wings(c.ent, dur, '#ffd65a'); V.aura(c.ent, { color: '#ffd65a', dur, r: 32, rate: 0.15 });
        // (QA) no flash of its own: the shaft of dawn is the bright beat, not a white-out over the hero
        V.burst(c.ent.x, c.ent.y - 30, { color: '#ffe9a0', color2: '#ffffff', n: 24, speed: 300, kind: 'star', flash: false }); V.shock(c.ent.x, c.ent.y, { r: 160, color: '#ffe08a', dur: 0.6, w: 7 }); shake(5); }); },
  });

  Object.assign(ABILITY_VFX.bloodreaver, {
    // Scab: blood drawn back in and hardening into dark red plates over a crusted shield
    scab: c => { V.swirl(c.x, c.y, { r: 60, color: '#c01a2a', dur: 0.5, follow: c.ent, inward: true }); V.charge(c.x, c.y, { color: '#ff3a4a', r: 60, n: 10, dur: 0.35, follow: c.ent });
      c.later(0.3, () => { V.shield(c.ent, { shape: 'hex', color: '#b01a2a', dur: 8, r: 40 }); V.crystals(c.ent.x, c.ent.y, { color: '#8a1020', n: 6, r: 26, h: 26, dur: 0.8 }); V.spikeburst(c.ent.x, c.ent.y, { r: 44, n: 10, color: '#a01028', core: '#ffb0b0', ink: '#2a0408', dur: 0.3, z: 18 }); }); },
    // Blood Moon: a red moon hangs over the reaver for 10s; blood rises off the floor into it
    moon: c => { const ent = c.ent;
      vfxLingerSettle(V.ink(c.x, c.y, { r: 70, dur: 10, follow: ent, a: 0.3 }), 0.5, 1); vfxLingerSettle(V.sigil(c.x, c.y, { r: 70, style: 'runes', color: '#c01a2a', dur: 10, spin: -0.6, follow: ent }), 0.28, 1.2);   // (QA) settles faint
      V.aura(ent, { color: '#8a0010', style: 'shadow', dur: 10, r: 30, rate: 0.25 });
      V.fx({ dur: 10, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.08, 0.1) * e.a, rise = Math.min(1, p * 10 / 0.6), mx = ent.x, my = ent.y - 70 - 40 * rise, R = 22;
        V.glowAt(c2, mx, my, 70, '#ff1a2a', 0.45 * k);
        c2.globalAlpha = 0.9 * k; c2.fillStyle = '#9a1020'; c2.beginPath(); c2.arc(mx, my, R, 0, TAU); c2.fill();
        c2.fillStyle = '#c8303a'; c2.beginPath(); c2.arc(mx - 4, my - 4, R * 0.8, 0, TAU); c2.fill();
        c2.fillStyle = '#6a0810'; for (const [dx, dy, rr] of [[6, 5, 5], [-8, 2, 3.5], [2, -9, 3]]) { c2.beginPath(); c2.arc(mx + dx, my + dy, rr, 0, TAU); c2.fill(); }
        c2.globalAlpha = 1; V.neonRing(c2, mx, my, R + 2, '#ff4a5a', 2, k);
      }, tick: () => { if (Math.random() < 0.35) { const a = Math.random() * TAU; V.spawn({ x: ent.x + Math.cos(a) * 40, y: ent.y + Math.sin(a) * 22, z: 0, vz: rand(90, 140), vx: -Math.cos(a) * 20, life: 0.9, size: rand(5, 8), size1: 0, color: '#ff2a3a' }); } } });
      V.shock(c.x, c.y, { r: 140, color: '#ff2a3a', dur: 0.6, w: 6 }); shake(4); },
  });

  Object.assign(ABILITY_VFX.runeguard, {
    // Whirling Runes: the held runes tear loose in a burst of violet (the blades themselves are KIT_VFX.whirl)
    // (QA colour pass: indigo, like the rest of the Runeguard)
    whirl: c => { V.sigil(c.x, c.y, { r: 60, style: 'runes', color: '#7c84ff', dur: 0.8, spin: 6, follow: c.ent }); V.crystals(c.x, c.y, { color: '#b8c0ff', n: 6, r: 34, h: 34, dur: 0.5 });
      V.burst(c.x, c.y - 20, { color: '#d8deff', color2: '#ffffff', n: 16, speed: 260, kind: 'star' }); },
    // Living Rune: a great rune rises behind the warder and stands there, pulsing, for 15s
    living: c => { const ent = c.ent;
      V.pillar(c.x, c.y, { r: 34, h: 200, color: '#8e98ff', dur: 1 }); V.ink(c.x, c.y, { r: 80, dur: 1.4 }); V.sigil(c.x, c.y, { r: 80, style: 'runes', color: '#7c84ff', dur: 1.4, spin: 2 });
      V.fx({ dur: 15, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.05, 0.08) * e.a * (0.7 + 0.3 * Math.max(0, 1 - t / 1.2)), rise = Math.min(1, p * 15 / 0.5), a = ent.angle || 0;
        standingRune(c2, ent.x - Math.cos(a) * 22, ent.y - 40 - 30 * rise + Math.sin(t * 2) * 3, 46, '#9aa4ff', k, t);
      }, tick: () => { if (Math.random() < 0.2) { const a = ent.angle || 0; V.spawn({ x: ent.x - Math.cos(a) * 22 + rand(-10, 10), y: ent.y, z: 60, vz: rand(-20, 20), life: 0.8, size: 6, size1: 0, color: '#d8deff', kind: 'star' }); } } });
      c.later(0.3, () => { V.spikeburst(ent.x, ent.y, { r: 66, n: 12, hole: 0.5, color: '#7c84ff', core: '#eef1ff', ink: '#0c1236', fill: '#2a3070', dur: 0.4, layer: 'ground', z: 0, flat: 0.6 }); shake(4); }); },
  });

  Object.assign(ABILITY_VFX.ranger, {
    // Explosive Shot: an arrow that sticks in the boss with a charge blinking faster and faster (the blast is KIT_VFX.explode)
    explosive: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'arrow', color: '#ff8a3a', speed: 1400, onHit: (x, y) => {
      V.hit(x, y, '#ffb060', 0.6);
      V.fx({ dur: 2.4, layer: 'air', draw: (c2, p, t, e) => { const blink = Math.sin(t * (6 + p * 20)) > 0 ? 1 : 0.35; V.glowAt(c2, x, y - 24, 14 + p * 10, '#ff5a1a', blink * e.a); V.glowAt(c2, x, y - 24, 5, '#ffffff', blink * e.a); } });
    } }),
    // Falcon: the falcon dives from the bow to the boss and circles over it for 10s, swooping low every 2s
    falcon: c => { const tx = c.tx, ty = c.ty;
      V.glint(c.x, c.y, { color: '#ffe27a', size: 26, z: 30 });
      V.fx({ dur: 10.5, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.02, 0.05) * e.a;
        let x, y, ang;
        if (t < 0.5) { const q = t / 0.5; x = c.x + (tx - c.x) * q; y = c.y + (ty - c.y) * q - 60 - Math.sin(q * Math.PI) * 30; ang = Math.atan2(ty - c.y, tx - c.x); }
        else { const s = t - 0.5, sw = Math.max(0, Math.sin(((s % 2) / 2) * Math.PI)) ** 6, a = s * 2.2, R = 70 - 40 * sw;
          x = tx + Math.cos(a) * R; y = ty + Math.sin(a) * R * 0.5 - 90 + 60 * sw; ang = a + Math.PI / 2; }
        V.glowAt(c2, x, y, 22, '#ffe27a', 0.35 * k);
        bird(c2, x, y, 1.1, t * 11, ang, '#8a5a32', '#ffd27a', k);
      } });
      c.later(0.5, () => { V.hit(tx, ty, '#ffe27a', 1); V.sparks(tx, ty, { color: '#fff2c0', n: 8 }); for (let i = 0; i < 4; i++) V.spawn({ x: tx, y: ty, z: 30, vx: rand(-60, 60), vy: rand(-30, 30), vz: rand(20, 80), g: 80, life: 1.2, size: 11, color: '#c8a070', kind: 'feather', add: false, vr: rand(-3, 3), flutter: 3 }); }); },
  });

  Object.assign(ABILITY_VFX.shadowblade, {
    // Rupture: a deep opening cut, then the wound keeps bleeding onto the floor
    rupture: c => { V.slash(c.x, c.y, c.ang, { r: 62, span: 1.2, color: '#ff2a4a', w: 0.7, dur: 0.26 });
      c.later(0.08, () => { const tx = c.tx, ty = c.ty; V.spikeburst(tx, ty, { r: 46, n: 12, color: '#c01a3a', core: '#ffe0ec', ink: '#2a0410', dur: 0.32 }); V.splash(tx, ty, { n: 10, speed: 1.2 });
        V.puddle(tx + (c.x - tx) * 0.35, ty + (c.y - ty) * 0.35, { r: 18, color: '#4a1430', dark: '#1a0612', dur: 6, bubbles: false, fumes: false });   // (online refs: a dark wine stain, not a red pool)
        V.fx({ dur: 6, layer: 'air', draw: () => {}, tick: () => { if (Math.random() < 0.3) V.spawn({ x: tx + rand(-12, 12), y: ty, z: rand(20, 40), vz: -20, g: 500, life: 0.5, size: 7, color: '#c01a2a', kind: 'drop', add: false, rot: Math.PI / 2 }); } }); }); },
    // Death Blossom: gone in a puff of smoke, then six cuts flash round the boss from every side and a red flower of steel opens
    blossom: c => { const tx = c.tx, ty = c.ty;
      V.smokebomb(c.x, c.y, { r: 60, dur: 1.4, toss: 0 });
      V.vortex(tx, ty, { r: 70, color: '#c01a5a', steel: '#ffe0ec', dur: 1.6, n: 6 });
      for (let i = 0; i < 6; i++) c.later(i * 0.25, () => { const a = rand(0, TAU); V.slash(tx - Math.cos(a) * 30, ty - Math.sin(a) * 30, a, { r: 60, span: 1.4, color: i % 2 ? '#ff4d9a' : '#e8e0ff', dur: 0.22, w: 0.5, flip: i % 2 === 1, sparks: 3 }); V.splash(tx, ty, { n: 3, size: 0.7 }); }); },
  });

  Object.assign(ABILITY_VFX.pyromancer, {
    // Firestep: the pyromancer bursts into flame and blinks forward, a line of fire left burning along the way
    firestep: c => { const ent = c.ent, a = c.ang, ex = ent.x, ey = ent.y, sx = ex - Math.cos(a) * 150, sy = ey - Math.sin(a) * 150;
      V.flare(sx, sy, { n: 14, r: 16, color: '#ff6a1a' }); V.flare(ex, ey, { n: 18, r: 18, color: '#ff8a2a' }); V.shock(ex, ey, { r: 70, color: '#ffb040', dur: 0.35, w: 5 });
      V.blaze(ent, { r: 36, dur: 0.8 });
      V.fx({ dur: 1.6, layer: 'ground', draw: (c2, p, t, e) => { const k = (1 - p) * e.a; c2.globalAlpha = 0.4 * k; c2.strokeStyle = '#2a0e04'; c2.lineWidth = 12; c2.lineCap = 'round'; c2.beginPath(); c2.moveTo(sx, sy); c2.lineTo(ex, ey); c2.stroke(); c2.globalAlpha = 1;
        V.neonPath(c2, '#ff7a1a', 3, k, () => { c2.moveTo(sx, sy); c2.lineTo(ex, ey); }); },
        tick: () => { for (let i = 0; i < 2; i++) { const q = Math.random(); V.spawn({ x: sx + (ex - sx) * q + rand(-6, 6), y: sy + (ey - sy) * q + rand(-4, 4), z: 0, vz: rand(60, 140), life: rand(0.3, 0.6), size: rand(10, 16), size1: 2, color: Math.random() < 0.5 ? '#ff6a1a' : '#ffd070' }); } } }); },
    // Phoenix Flight: a great bird of fire sweeps out through the boss and wheels back for a second pass
    phoenix: c => { const sx = c.x, sy = c.y, tx = c.tx, ty = c.ty, ang = Math.atan2(ty - sy, tx - sx), L = Math.hypot(tx - sx, ty - sy) + 80, nx = -Math.sin(ang), ny = Math.cos(ang);
      // the path: out past the boss, a wide turn, back through it to the caster
      const path = q => { const s = q < 0.5 ? q / 0.5 : 1 - (q - 0.5) / 0.5, side = Math.sin(q * TAU) * 70; return { x: sx + Math.cos(ang) * L * s + nx * side, y: sy + Math.sin(ang) * L * s + ny * side - 40 }; };
      V.charge(sx, sy, { color: '#ffb040', r: 50, n: 10, dur: 0.25 });
      V.fx({ dur: 1.5, layer: 'air', draw: (c2, p, t, e) => {
        const q = path(p), b = path(Math.min(1, p + 0.01)), k = fade(p, 0.05, 0.1) * e.a, fa = Math.atan2(b.y - q.y, b.x - q.x);
        V.glowAt(c2, q.x, q.y, 70, '#ff6a1a', 0.55 * k); V.glowAt(c2, q.x, q.y, 30, '#ffe08a', 0.7 * k);
        bird(c2, q.x, q.y, 2.2, t * 9, fa, '#ff8a2a', '#fff2b0', k);
      }, tick: p => { const q = path(p); for (let i = 0; i < 3; i++) V.spawn({ x: q.x + rand(-14, 14), y: q.y + 40 + rand(-8, 8), z: 40, vx: rand(-30, 30), vz: rand(10, 60), life: rand(0.4, 0.8), size: rand(12, 22), size1: 2, color: Math.random() < 0.5 ? '#ff6a1a' : '#ffc040' }); } });
      for (const d of [0.38, 1.12]) c.later(d, () => { V.spikeburst(tx, ty, { r: 80, n: 14, color: '#ff6a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.38, layer: 'ground', z: 0, flat: 0.6 }); /* (QA) at its feet */ V.flare(tx, ty, { n: 16, r: 20 }); shake(4); }); },
  });

  Object.assign(ABILITY_VFX.cleric, {
    // Bloom of Dawn: light falls on the ally and a flower of petals opens round them
    dawnbloom: c => { const w = c.tent || c.ent;
      V.lightfall(w.x, w.y, { color: '#ffe680', r: 32, h: 260, dur: 0.9, feathers: 4 });
      c.later(0.2, () => { V.ink(w.x, w.y, { r: 90, dur: 1.4 }); V.sigil(w.x, w.y, { r: 90, style: 'petals', color: '#ffb8d8', dur: 1.4, spin: 1.5 });
        V.burst(w.x, w.y - 20, { color: '#ffd0e4', color2: '#ffffff', n: 14, speed: 220, kind: 'petal', flashR: 90 }); V.plus(w.x, w.y, { color: '#fff2a0', n: 8 });
        V.motes(w.x, w.y, { kind: 'petal', color: '#ffc0dc', n: 10, r: 60, rise: 0.6 }); }); },
    // Dawn Sanctum: a great circle of dawn at the cleric's feet for 12s, petals and light drifting up out of it
    dawnsanctum: c => { const x = c.x, y = c.y, r = 130;
      // (QA: two full-strength circles for 12s hid telegraphs; the pillar whited out the cleric) both settle faint
      V.pillar(x, y, { r: 30, h: 220, color: '#ffe680', dur: 1 });
      vfxLingerSettle(V.ink(x, y, { r, dur: 12 }), 0.5, 1); vfxLingerSettle(V.sigil(x, y, { r, style: 'star4', color: '#ffd65a', dur: 12, spin: 0.25 }), 0.26, 1.2); vfxLingerSettle(V.sigil(x, y, { r: r * 0.6, style: 'petals', color: '#ffc0dc', dur: 12, spin: -0.4 }), 0.22, 1.2);
      V.shock(x, y, { r: r + 30, color: '#ffe680', dur: 0.6, w: 7 });
      V.fx({ dur: 12, layer: 'ground', draw: () => {}, tick: (p, dt, e) => {
        if (Math.random() < 0.4) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.9, pet = Math.random() < 0.35;
          V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: 0, vz: rand(25, 60), vx: rand(-10, 10), life: rand(1, 1.6), size: pet ? 10 : rand(5, 8), size1: pet ? 10 : 0, color: pet ? '#ffc0dc' : '#fff2a0', kind: pet ? 'petal' : 'glow', add: pet ? false : undefined, flutter: pet ? 5 : 0 }); }
        e.n = e.n || 0; if (p * 12 >= (e.n + 1) * 1.5) { e.n++; V.shock(x, y, { r: r * 0.9, r0: 30, color: '#fff2a0', dur: 0.5, w: 3 }); }
      } }); },
  });

  Object.assign(ABILITY_VFX.grovekeeper, {
    // Seed of Renewal: a glowing seed sinks into the ally and a sprout grows at their feet while it lasts
    seed: c => { const w = c.tent || c.ent;
      V.missile(c.x, c.y, w.x, w.y, { style: 'leaf', color: '#9aff7a', speed: 700, arc: 40 });
      c.later(0.2, () => { V.sigil(w.x, w.y, { r: 50, style: 'petals', color: '#8aff6a', dur: 1, spin: 2, follow: w }); V.burst(w.x, w.y - 10, { color: '#b0ff9a', n: 10, speed: 160, kind: 'leaf', flash: false }); });
      V.fx({ dur: 20, layer: 'ground', draw: (c2, p, t, e) => {
        const k = fade(p, 0.03, 0.05) * e.a, g = Math.min(1, p * 20 / 2), x = w.x + 14, y = w.y + 6, h = 6 + 12 * g;
        V.glowAt(c2, x, y - h * 0.5, 16, '#8aff6a', 0.4 * k);
        V.neonPath(c2, '#7ee06a', 1.6, k, () => { c2.moveTo(x, y); c2.quadraticCurveTo(x - 3, y - h * 0.5, x, y - h); });
        for (const sd of [-1, 1]) V.neonPath(c2, '#b0ff8a', 1.4, k, () => c2.ellipse(x + sd * 4, y - h * 0.8, 4.5 * g + 1, 2, sd * 0.5, 0, TAU));
      } }); },
    // Treant: roots burst up beside the boss and a treant stands there for 15s, raising its arms to slam every 3s
    treant: c => { const x = c.tx + 56, y = c.ty + 14;
      V.grove(x, y, { r: 50, dur: 1.4, flowers: 4 }); V.debris(x, y, { n: 6, color: '#6a5034' }); V.crystals(x, y, { color: '#6abf4a', n: 6, r: 30, h: 40, dur: 0.6 });
      V.fx({ dur: 15.2, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.03, 0.04) * e.a, rise = Math.min(1, t / 0.6), q = (t % 3) / 3, lift = q > 0.6 ? (q - 0.6) / 0.4 : 0, sway = Math.sin(t * 1.5) * 2;
        const H = 54 * rise, top = y - H;
        c2.globalAlpha = 0.35 * k; c2.fillStyle = '#000'; c2.beginPath(); c2.ellipse(x, y, 22, 7, 0, 0, TAU); c2.fill();
        c2.globalAlpha = k; c2.fillStyle = '#6a4a2a'; c2.strokeStyle = OUT; c2.lineWidth = 2;
        c2.beginPath(); c2.moveTo(x - 12, y); c2.lineTo(x - 7 + sway, top + 6); c2.lineTo(x + 7 + sway, top + 6); c2.lineTo(x + 12, y); c2.closePath(); c2.fill(); c2.stroke();
        for (const sd of [-1, 1]) { const ax = x + sd * 8 + sway, ay = top + 16, th = 1 - lift * 2.3, hx = ax + sd * Math.cos(th) * 24, hy = ay + Math.sin(th) * 24;
          c2.lineWidth = 6; c2.strokeStyle = OUT; c2.beginPath(); c2.moveTo(ax, ay); c2.lineTo(hx, hy); c2.stroke();
          c2.lineWidth = 3.5; c2.strokeStyle = '#7a5a34'; c2.beginPath(); c2.moveTo(ax, ay); c2.lineTo(hx, hy); c2.stroke(); }
        c2.fillStyle = '#3f8a34'; for (const [dx, dy, rr] of [[-12, 4, 12], [12, 4, 12], [0, -6, 15], [0, 8, 11]]) { c2.beginPath(); c2.arc(x + dx + sway, top + dy - 4, rr * rise, 0, TAU); c2.fill(); c2.lineWidth = 1.5; c2.stroke(); }
        c2.fillStyle = '#5fbf4a'; c2.beginPath(); c2.arc(x - 4 + sway, top - 10, 7 * rise, 0, TAU); c2.fill(); c2.globalAlpha = 1;
        for (const sd of [-1, 1]) V.glowAt(c2, x + sd * 4 + sway, top + 16, 5, '#d8ff7a', k);
      }, tick: () => { if (Math.random() < 0.08) V.spawn({ x: x + rand(-14, 14), y, z: rand(40, 60), vz: rand(-30, -10), vx: rand(-15, 15), life: 1.4, size: 10, color: '#6fbf5a', kind: 'leaf', add: false, vr: rand(-3, 3), flutter: 5 }); } });
      shake(3); },
  });

  Object.assign(ABILITY_VFX.chronomancer, {
    // Time Bubble: a big pale bubble of slowed time round the ally, a clock turning slowly under it, for 6s
    bubble: c => { const w = c.tent || c.ent;
      V.shield(w, { shape: 'bubble', color: '#9fe8ff', dur: 6, r: 62 }); V.ink(w.x, w.y, { r: 70, dur: 6, follow: w, a: 0.25 }); V.sigil(w.x, w.y, { r: 70, style: 'clock', color: '#9fe8ff', dur: 6, spin: 0.3, follow: w });
      V.ribbons(w.x, w.y, { r: 60, dur: 1, dir: -1, follow: w, colors: ['#9fe8ff', '#e0d4ff', '#ffffff'] }); V.shock(w.x, w.y, { r: 90, color: '#bff0ff', dur: 0.5, w: 4 }); },
    // Time Warp: a great golden clock hangs over the party, its hands racing, for the whole burst
    warp: c => { const ent = c.ent, dur = longFor(ent, 'accelerant', 15, 20);
      V.ink(c.x, c.y, { r: 150, dur: 1.6 }); V.sigil(c.x, c.y, { r: 150, style: 'clock', color: '#ffd27a', dur: 1.6, spin: 2 });
      for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 200 + i * 60, color: '#9fe8ff', dur: 0.7, w: 5 - i, delay: i * 0.12 });
      V.fx({ dur, layer: 'air', draw: (c2, p, t, e) => {
        // (QA) bright as it's declared, then settled to half for the long burst (it hangs over whatever is north of
        // the party, often a telegraph); its dark face kept faint
        const settle = 1 - 0.5 * Math.min(1, Math.max(0, (t - 1) / 0.6));
        const k = fade(p, 0.04, 0.06) * e.a * settle, x = ent.x, y = ent.y - 120 + Math.sin(t * 1.5) * 4, R = 40 * Math.min(1, t / 0.4);
        V.glowAt(c2, x, y, R * 2, '#ffd27a', 0.35 * k);
        c2.globalAlpha = 0.25 * k; c2.fillStyle = '#1a1a34'; c2.beginPath(); c2.arc(x, y, R, 0, TAU); c2.fill(); c2.globalAlpha = 1;
        V.neonRing(c2, x, y, R, '#ffd27a', 3, k); V.neonRing(c2, x, y, R * 0.84, '#9fe8ff', 1.2, k * 0.8);
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12; V.neonPath(c2, '#ffe6a8', i % 3 ? 1 : 2, k, () => { c2.moveTo(x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7); c2.lineTo(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8); }); }
        V.neonPath(c2, '#ffffff', 2, k, () => { c2.moveTo(x, y); c2.lineTo(x + Math.cos(t * 8) * R * 0.66, y + Math.sin(t * 8) * R * 0.66); });
        V.neonPath(c2, '#ffd27a', 3, k, () => { c2.moveTo(x, y); c2.lineTo(x + Math.cos(t * 1.4) * R * 0.42, y + Math.sin(t * 1.4) * R * 0.42); });
      }, tick: () => { if (Math.random() < 0.2) V.spawn({ x: ent.x + rand(-40, 40), y: ent.y, z: 120 + rand(-30, 30), vz: rand(-30, -10), life: 1, size: 7, size1: 0, color: Math.random() < 0.5 ? '#ffd27a' : '#9fe8ff', kind: 'star' }); } });
      shake(4); },
  });

  // ---- the moments talents add (k.fx). target: the enemy for AIMED names, the ally for data.to, else null.
  Object.assign(KIT_VFX, {
    // Bastion
    sunlit: (e, t) => { const T = at(e, t); V.beam(e.x, e.y, T.x, T.y, { color: '#ffe9a0', w: 8, dur: 0.35 }); V.spawn({ x: T.x, y: T.y, z: 16, life: 0.3, size: 50, size1: 16, color: '#ffe27a', kind: 'star', vr: 5 }); },
    edgeShard: (e, t) => { const T = at(e, t); V.missile(e.x, e.y, T.x, T.y, { style: 'blade', color: '#ffe08a', speed: 1000, size: 0.6, onHit: (x, y) => V.hit(x, y, '#ffe9a0', 0.5) }); },
    edgeReturn: (e, t) => { const T = at(e, t); V.missile(T.x, T.y, e.x, e.y, { style: 'blade', color: '#ffe08a', speed: 900, size: 0.8, arc: 30, onHit: () => V.glint(e.x, e.y, { color: '#ffe08a', size: 24 }) }); V.hit(T.x, T.y, '#ffd65a', 0.7); },
    dawnPillar: (e, t) => { const T = at(e, t); V.lightfall(T.x, T.y, { color: '#ffe08a', r: 38, h: 320, dur: 0.8, feathers: 2 });
      FX.later(0.18, () => { V.spikeburst(T.x, T.y, { r: 56, n: 14, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', dur: 0.36 }); V.shock(T.x, T.y, { r: 90, color: '#ffe08a', dur: 0.4, w: 5 }); shake(3); }); },
    readSwing: e => { const a = e.angle || 0, fx = e.x + Math.cos(a) * 30, fy = e.y + Math.sin(a) * 30; V.glint(fx, fy, { color: '#ffffff', size: 30 }); V.shock(e.x, e.y, { r: 70, color: '#9fc4ff', dur: 0.35, w: 4 }); V.sparks(fx, fy, { color: '#dbe9ff', n: 8, angle: a, spread: 0.6, speed: 340 }); },
    // (QA) the burst is a ring of spikes on the floor round the bastion, not a solid star over the sprite
    lastStand: e => { V.dome(e, { color: '#ffb84a', r: 46, dur: 1.6 }); V.spikeburst(e.x, e.y, { r: 72, n: 16, hole: 0.55, color: '#ff9a3a', core: '#fff2c0', ink: '#3a1a06', fill: '#8a4a10', dur: 0.42, layer: 'ground', z: 0, flat: 0.6 }); shake(4); },
    faith: e => { V.motes(e.x, e.y, { color: '#ffe08a', n: 10, r: 30, kind: 'star' }); V.sigil(e.x, e.y, { r: 40, style: 'star4', color: '#ffd65a', dur: 0.6, spin: 4, follow: e }); },
    // Bloodreaver
    secondHelping: e => { V.swirl(e.x, e.y, { r: 46, color: '#ff2a4a', dur: 0.5, follow: e, inward: true }); V.plus(e.x, e.y, { color: '#ff8a8a', n: 4 }); },
    hemorrhage: (e, t) => { const T = at(e, t); V.splash(T.x, T.y, { n: 12, speed: 1.2 }); V.puddle(T.x, T.y + 10, { r: 26, color: '#a01028', dark: '#3a0610', dur: 3, bubbles: false, fumes: false }); V.hit(T.x, T.y, '#ff4a5a', 0.7); },
    cauterize: e => { V.flare(e.x, e.y, { n: 10, r: 14, color: '#ff7a1a' }); V.shock(e.x, e.y, { r: 50, color: '#ffb040', dur: 0.3, w: 3 }); V.plus(e.x, e.y, { color: '#ffd070', n: 3 }); },
    bloodlust: (e, t) => { const T = at(e, t); V.aura(e, { color: '#ff2a1a', style: 'flame', dur: 1.2, r: 30, rate: 0.6 }); V.stream(T.x, T.y, e, { color: '#ff2a4a', n: 8 }); V.spikeburst(T.x, T.y, { r: 40, n: 10, color: '#d0203a', core: '#ffd0d0', ink: '#2a0408', dur: 0.3 }); },
    // the blood moon sets: a tide of blood rolls into the boss and runs back to the reaver
    moonburst: (e, t) => { const T = at(e, t), ang = Math.atan2(T.y - e.y, T.x - e.x), L = Math.hypot(T.x - e.x, T.y - e.y);
      V.flash(e.x, e.y - 90, 80, '#ff2a3a', 0.3);
      for (let i = 0; i < 26; i++) { const sp = rand(500, 800), s = rand(-0.35, 0.35); V.spawn({ x: e.x, y: e.y, z: rand(10, 30), vx: Math.cos(ang + s) * sp, vy: Math.sin(ang + s) * sp, vz: rand(20, 80), g: 200, life: Math.min(1, L / sp + 0.1), size: rand(8, 14), color: '#c01a2a', kind: 'drop', add: false, rot: ang + Math.PI / 2 }); }
      // (QA: a solid white-cored star the size of the boss's head) the tide breaks round its feet on the floor instead
      FX.later(Math.min(0.6, L / 650), () => { V.spikeburst(T.x, T.y, { r: 100, n: 18, color: '#c01a2a', core: '#ff8a9a', ink: '#2a0408', dur: 0.45, layer: 'ground', z: 0, flat: 0.6 }); V.hit(T.x, T.y, '#ff6a7a', 0.8); V.splash(T.x, T.y, { n: 18, speed: 1.4 }); V.shock(T.x, T.y, { r: 130, color: '#ff2a3a', dur: 0.5, w: 7 }); V.stream(T.x, T.y, e, { color: '#ff3a4a', n: 12 }); shake(6); }); },
    // Runeguard
    // (QA colour pass: the Runeguard's moments on its indigo palette, not the Shadowblade's violet)
    runeOverflow: (e, t) => { const T = at(e, t); V.missile(e.x, e.y, T.x, T.y, { style: 'orb', color: '#b8c0ff', speed: 850, size: 0.8, onHit: (x, y) => { V.hit(x, y, '#d8deff', 0.6); V.sigil(x, y, { r: 26, style: 'runes', color: '#b8c0ff', dur: 0.4, spin: 6 }); } }); },
    runeBolt: (e, t) => { const T = at(e, t), a = e.angle || 0, sx = e.x - Math.cos(a) * 22, sy = e.y - 30;
      V.missile(sx, sy, T.x, T.y, { style: 'helix', color: '#9aa4ff', speed: 1000, size: 0.8, onHit: (x, y) => V.hit(x, y, '#d8deff', 0.7) }); },
    emergency: e => { V.shield(e, { shape: 'hex', color: '#b8c0ff', dur: 0.8, r: 44 }); V.shock(e.x, e.y, { r: 80, color: '#9aa4ff', dur: 0.4, w: 5 }); V.burst(e.x, e.y - 20, { color: '#d8deff', n: 10, speed: 200, kind: 'star' }); },
    glyphEcho: (e, t) => { const T = at(e, t); V.sigil(T.x, T.y, { r: 40, style: 'runes', color: '#6c74f2', dur: 0.4, spin: 8 }); FX.later(0.3, () => V.crystals(T.x, T.y, { color: '#9aa4ff', n: 4, r: 28, h: 36, dur: 0.6 })); },
    shatter: e => { for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, sp = rand(120, 260); V.spawn({ x: e.x, y: e.y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 180), g: 500, bounce: true, life: rand(0.5, 0.9), size: rand(7, 11), color: '#e4e8ff', kind: 'shard', add: false, vr: rand(-12, 12) }); }
      V.flash(e.x, e.y - 20, 50, '#d8deff', 0.2); V.shock(e.x, e.y, { r: 90, color: '#d8deff', dur: 0.4, w: 5 }); },
    wardLeap: e => { V.sigil(e.x, e.y, { r: 46, style: 'hex', color: '#9aa4ff', dur: 0.6, spin: 4, follow: e }); V.shock(e.x, e.y, { r: 70, color: '#b8c0ff', dur: 0.35, w: 4 }); },
    wardNova: (e, t) => { const T = at(e, t); for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 120 + i * 40, color: '#9aa4ff', dur: 0.5, w: 6 - i * 2, delay: i * 0.08 }); V.lightning(e.x, e.y, T.x, T.y, { color: '#d8deff', jag: 12, dur: 0.3 }); FX.later(0.05, () => V.hit(T.x, T.y, '#b8c0ff', 0.9)); },
    binding: (e, t) => { const T = at(e, t); V.ink(T.x, T.y, { r: 56, dur: 1 }); V.sigil(T.x, T.y, { r: 56, style: 'runes', color: '#9aa4ff', dur: 1, spin: -3 }); V.lightning(e.x, e.y, T.x, T.y, { color: '#b8c0ff', jag: 8, dur: 0.25 }); },
    mirrorShards: (e, t) => { const T = at(e, t); for (let i = 0; i < 5; i++) FX.later(i * 0.05, () => V.missile(e.x + rand(-16, 16), e.y + rand(-10, 10), T.x + rand(-14, 14), T.y + rand(-8, 8), { style: 'blade', color: '#e4e8ff', speed: 1100, size: 0.5, onHit: (x, y) => V.sparks(x, y, { color: '#ffffff', n: 3 }) })); },
    // Whirling Runes: n rune blades spinning round the warder for 12s, one flashing out at the boss every 2s
    whirl: (e, t, d) => { const n = Math.max(1, Math.min(8, (d && d.n) || 1)), T = t;
      V.fx({ dur: 12, layer: 'air', draw: (c, p, tt, fx) => {
        const k = fade(p, 0.03, 0.05) * fx.a;
        for (let i = 0; i < n; i++) { const a = tt * 3 + i * TAU / n, x = e.x + Math.cos(a) * 46, y = e.y - 18 + Math.sin(a) * 22;
          c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
          V.glowAt(c, 0, 0, 14, '#7c84ff', 0.5 * k);
          V.neonPath(c, '#b8c0ff', 1.8, k, () => { c.moveTo(0, -10); c.lineTo(4, 0); c.lineTo(0, 10); c.lineTo(-4, 0); c.closePath(); });
          c.restore(); }
      }, tick: (p, dt, fx) => { fx.s = fx.s || 0; if (T && p * 12 >= (fx.s + 1) * 2) { fx.s++; V.lightning(e.x, e.y, T.x, T.y, { color: '#c8ceff', jag: 10, dur: 0.22 }); V.hit(T.x, T.y, '#b8c0ff', 0.6); }
        if (Math.random() < 0.2) { const a = Math.random() * TAU; V.spawn({ x: e.x + Math.cos(a) * 46, y: e.y + Math.sin(a) * 22, z: 18, vz: 20, life: 0.5, size: 5, size1: 0, color: '#d8deff', kind: 'star' }); } } }); },
    // Ranger
    explode: (e, t, d) => { const T = at(e, t), s = 1 + 0.3 * ((d && d.n) || 0);
      V.spikeburst(T.x, T.y, { r: 56 * s, n: 16, color: '#ff6a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.4 }); V.flare(T.x, T.y, { n: Math.round(14 * s), r: 20 * s });
      V.shock(T.x, T.y, { r: 100 * s, color: '#ffb040', dur: 0.45, w: 6 }); V.debris(T.x, T.y, { n: 6, hot: true, color: '#5a3a2a' }); V.smoke(T.x, T.y, { n: 6, color: '#3a2a2a', size: 30 * s, a: 0.5, speed: 50, life: 1.3 }); shake(3 + 2 * s); },
    falconDive: (e, t) => { const T = at(e, t);
      V.fx({ dur: 0.35, layer: 'air', draw: (c, p, tt, fx) => { const x = T.x - 60 * (1 - p), y = T.y - 30 - 150 * (1 - p); V.glowAt(c, x, y, 24, '#ffe27a', 0.5 * fx.a); bird(c, x, y, 1.5, 0, Math.atan2(150, 60), '#8a5a32', '#ffd27a', fx.a); },
        // (QA: it barely read) a bigger falcon, and its talons rake the boss as it strikes, feathers flying
        done: () => { V.hit(T.x, T.y, '#ffe27a', 0.9); for (const s of [-1, 1]) OLD_PAINT.thrust(T.x - 26 + s * 8, T.y - 22, T.x + 22 + s * 8, T.y + 14, { w: 5, color: '#ffd27a', core: '#fff6d8', ink: '#3a2408', dur: 0.2, z: 22 });
          for (let i = 0; i < 3; i++) V.spawn({ x: T.x, y: T.y, z: 30, vx: rand(-60, 60), vz: rand(30, 80), g: 80, life: 1.1, size: 11, color: '#c8a070', kind: 'feather', add: false, vr: 2, flutter: 3 }); } }); },
    // (QA: a tiny arrow off into nowhere read as nothing) the crit glances off the boss in a spark and the arrow arcs back
    // to the ranger's quiver (the charge it refunds), a green glint when it lands
    ricochetArrow: (e, t) => { const T = at(e, t); V.sparks(T.x, T.y, { color: '#e8ffd0', n: 6, speed: 300 }); V.spawn({ x: T.x, y: T.y, z: 20, life: 0.2, size: 34, size1: 10, color: '#d8ffc0', kind: 'star', vr: 6 });
      V.missile(T.x, T.y, e.x, e.y, { style: 'arrow', color: '#bfff9a', speed: 900, size: 1.2, arc: 60, onHit: () => V.glint(e.x, e.y, { color: '#d8ffb0', size: 26, z: 30 }) }); },
    stormArc: (e, t) => { const T = at(e, t); V.lightning(e.x, e.y, T.x, T.y, { color: '#c8ffb0', jag: 14, dur: 0.25 }); V.hit(T.x, T.y, '#e0ffd0', 0.6); },
    // (QA: the stuck arrows stood on the boss's sprite) the volley drops on the floor in front of it, toward the ranger
    volley: (e, t) => { const T = at(e, t), d = Math.hypot(e.x - T.x, e.y - T.y) || 1, s = Math.min(50, d * 0.4); V.volley(T.x + (e.x - T.x) / d * s, T.y + (e.y - T.y) / d * s, { n: 8, r: 46, color: '#bfff9a', wind: 0.12, stay: 1.2 }); },
    // (online-refs pass: no red floor star under the boss) the Mark's brackets crunch inward in amber and it bursts on the body
    deathmark: (e, t) => { const T = at(e, t), by = T.y - 40;
      V.fx({ dur: 0.3, layer: 'air', draw: (c, p, tt, fx) => { const R = 44 - 30 * easeOut(Math.min(1, p / 0.45)), k = fx.a * (1 - Math.max(0, (p - 0.5) / 0.5)), L = 11;
        for (let i = 0; i < 4; i++) { const sx = i % 2 ? 1 : -1, sy = i < 2 ? -1 : 1, x = T.x + sx * R, y = by + sy * R * 0.8; V.neonPath(c, '#ffb040', 2.6, k, () => { c.moveTo(x - sx * L, y); c.lineTo(x, y); c.lineTo(x, y - sy * L); }); } } });
      FX.later(0.12, () => { V.spikeburst(T.x, T.y, { r: 46, n: 12, color: '#ffa030', core: '#fff6d0', ink: '#3a2004', dur: 0.32, z: 40 }); V.hit(T.x, T.y, '#ffd27a', 0.8); shake(2); }); },
    secondWind: e => { V.swirl(e.x, e.y, { r: 50, color: '#8fdf7a', dur: 0.6, follow: e }); V.plus(e.x, e.y, { color: '#9aff8a', n: 5 }); V.motes(e.x, e.y, { kind: 'leaf', color: '#6fbf5a', n: 6, r: 36 }); },
    // Shadowblade
    feint: e => { const a = (e.angle || 0) + Math.PI / 2; V.shadowdash(e.x - Math.cos(a) * 30, e.y - Math.sin(a) * 30, e.x, e.y, { dur: 0.3 }); },
    // (QA: it hid under the boss sprite) a green pop on the body, the acid pooling in front of it, toward the rogue
    toxicBurst: (e, t) => { const T = at(e, t), d = Math.hypot(e.x - T.x, e.y - T.y) || 1, s = Math.min(36, d * 0.4); V.spawn({ x: T.x, y: T.y, z: 20, life: 0.25, size: 50, size1: 18, color: '#9aff4a', kind: 'star', vr: 5 });
      V.splash(T.x, T.y, { color: '#7adf3a', n: 12, speed: 1.2 }); V.puddle(T.x + (e.x - T.x) / d * s, T.y + (e.y - T.y) / d * s + 6, { r: 34, color: '#9aff4a', dark: '#1e3a0a', dur: 2.4 }); V.shock(T.x, T.y, { r: 70, color: '#9aff4a', dur: 0.35, w: 4 }); },
    shadowClone: (e, t) => { const T = at(e, t); V.shadowdash(e.x, e.y, T.x, T.y, { color: '#6a3dcf', dur: 0.4 }); FX.later(0.15, () => { V.slash(T.x, T.y, Math.random() * TAU, { r: 50, span: 1.6, color: '#8a5dff', dur: 0.24 }); V.smoke(T.x, T.y, { n: 4, color: '#4a3060', size: 22, a: 0.5, speed: 40 }); }); },
    ambush: (e, t) => { const T = at(e, t); V.spawn({ x: T.x, y: T.y, z: 18, life: 0.3, size: 64, size1: 22, color: '#ff3a5a', kind: 'star', vr: 5 }); V.splash(T.x, T.y, { n: 6 }); },
    dodge: e => { V.smoke(e.x, e.y, { n: 5, color: '#4a3060', size: 22, a: 0.55, speed: 50 }); V.shock(e.x, e.y, { r: 46, color: '#c58aff', dur: 0.3, w: 3 }); },
    garrote: (e, t) => { const T = at(e, t);
      V.fx({ dur: 0.6, layer: 'air', draw: (c, p, tt, fx) => { const k = (1 - p) * fx.a, R = 34 * (1 - p * 0.5); V.neonPath(c, '#ff3a5a', 1.6, k, () => c.ellipse(T.x, T.y - 30, R, R * 0.4, 0, 0, TAU)); } });
      FX.later(0.3, () => { V.splash(T.x, T.y, { n: 8 }); V.hit(T.x, T.y, '#ff6a7a', 0.6); }); },
    // (QA: a solid star hid the boss) the steel flower opens on the floor round it, a small hit on the body
    blossomEnd: (e, t) => { const T = at(e, t); V.spikeburst(T.x, T.y, { r: 105, n: 18, color: '#d0204a', core: '#ffe0ec', ink: '#2a0410', dur: 0.45, layer: 'ground', z: 0, flat: 0.6 }); V.hit(T.x, T.y, '#ff8aa8', 0.8); V.splash(T.x, T.y, { n: 16, speed: 1.4 });
      V.burst(T.x, T.y - 20, { color: '#ff7ab0', color2: '#ffffff', n: 16, speed: 260, kind: 'petal' }); V.shock(T.x, T.y, { r: 120, color: '#ff4d9a', dur: 0.5, w: 6 }); shake(6); },
    // Pyromancer
    // (QA: a few faint puffs read as nothing) heat ripples rise off the mage in wavy orange lines, a warm glow, the puffs
    haze: e => { for (let i = 0; i < 6; i++) V.spawn({ x: e.x + rand(-20, 20), y: e.y + rand(-6, 6), z: rand(0, 20), vz: rand(20, 50), life: 1, size: 20, size1: 36, color: '#ffb070', kind: 'smoke', add: false, a: 0.25 });
      V.fx({ dur: 0.9, layer: 'air', draw: (c, p, tt, fx) => { const k = fx.a * Math.sin(p * Math.PI); V.glowAt(c, e.x, e.y - 20, 30, '#ff8a3a', 0.3 * k);
        for (let j = -1; j <= 1; j++) { const bx = e.x + j * 12, by = e.y - 10 - p * 40 - Math.abs(j) * 6; V.neonPath(c, '#ffb060', 1.4, k * 0.8, () => { for (let s = 0; s <= 8; s++) { const q = s / 8; c.lineTo(bx + Math.sin(q * 9 + tt * 12 + j) * 3, by - q * 22); } }); } } }); },
    hurry: e => { V.shock(e.x, e.y, { r: 56, color: '#ffb040', dur: 0.32, w: 4 }); V.sparks(e.x, e.y, { color: '#ffd070', n: 8, speed: 280 }); V.glint(e.x + Math.cos(e.angle || 0) * 14, e.y, { color: '#ffd070', size: 22, z: 30 }); },
    flashpoint: (e, t) => { const T = at(e, t); V.spikeburst(T.x, T.y, { r: 60, n: 14, color: '#ff5a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.36 }); V.flare(T.x, T.y, { n: 14, r: 18 }); shake(4); },
    chainReact: (e, t) => { const T = at(e, t); for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; V.lightning(T.x, T.y, T.x + Math.cos(a) * 70, T.y + Math.sin(a) * 45, { color: '#ffb070', jag: 8, dur: 0.2 }); } V.flare(T.x, T.y, { n: 8, r: 14 }); },
    twinFlame: (e, t) => { const T = at(e, t); for (const s of [-1, 1]) V.missile(e.x, e.y, T.x, T.y, { style: 'fire', color: '#ff7a1a', speed: 800, arc: 30 * s, onHit: (x, y) => V.flare(x, y, { n: 8, r: 14 }) }); },
    // (QA: the sigil hid under the boss sprite, so it read as nothing) a fire charge sticks on the boss's body, its glow
    // blinking faster and faster for the 3s fuse (the blast is KIT_VFX.bomb), a small rune ring in front of it
    bombPlant: (e, t) => { const T = at(e, t), d = Math.hypot(e.x - T.x, e.y - T.y) || 1, s = Math.min(40, d * 0.4);
      V.sigil(T.x + (e.x - T.x) / d * s, T.y + (e.y - T.y) / d * s, { r: 30, style: 'runes', color: '#ff8a2a', dur: 0.8, spin: 4 }); V.glint(T.x, T.y, { color: '#ffb040', size: 30, z: 30 });
      V.fx({ dur: 3, layer: 'air', draw: (c, p, tt, fx) => { const blink = Math.sin(tt * (5 + p * 22)) > 0 ? 1 : 0.35, x = T.x + 6, y = T.y - 30;
        c.globalAlpha = fx.a; c.fillStyle = '#3a1a0c'; c.strokeStyle = '#1a0804'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fill(); c.stroke(); c.globalAlpha = 1;
        V.glowAt(c, x, y, 13 + p * 8, '#ff5a1a', blink * fx.a * 0.8); V.glowAt(c, x + 3, y - 5, 4, '#fff2c0', blink * fx.a); } }); },
    bomb: (e, t) => { const T = at(e, t); V.spikeburst(T.x, T.y, { r: 70, n: 16, color: '#ff5a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.4 }); V.crater(T.x, T.y, { r: 50, color: '#ff4a1a', dur: 2.2, flames: 3, a: 0.5 }); V.flare(T.x, T.y, { n: 18, r: 22 }); shake(5); },
    // Cleric
    // (a Petal that grew past three blooms by itself onto whoever was hurt most: a pink starburst and a rising plus, so it reads as a rescue)
    petalBloom: e => { V.motes(e.x, e.y, { kind: 'petal', color: '#ffc0dc', n: 8, r: 34, rise: 0.6 }); V.shock(e.x, e.y, { r: 56, color: '#ffc0dc', dur: 0.38, w: 3 }); V.flash(e.x, e.y - 18, 46, '#ffe9a8', 0.22); V.spikeburst(e.x, e.y, { r: 38, n: 10, color: '#ff9cc0', core: '#fff4e8', ink: '#5a1c3a', dur: 0.3, z: 16 }); V.plus(e.x, e.y, { color: '#ffe680', n: 3 }); },
    sunfall: (e, t) => { const T = at(e, t); V.lightfall(T.x, T.y, { color: '#ffe680', r: 30, h: 280, dur: 0.6, feathers: 0 }); FX.later(0.15, () => V.burst(T.x, T.y, { color: '#ffe680', color2: '#ffffff', n: 12, speed: 220, kind: 'star' })); },
    petalfall: (e, t) => { const T = at(e, t); for (let i = 0; i < 12; i++) V.spawn({ x: T.x + rand(-40, 40), y: T.y + rand(-12, 12), z: rand(80, 140), vz: rand(-90, -60), vx: rand(-20, 20), life: 1.2, size: 11, color: i % 2 ? '#ffc0dc' : '#fff2a0', kind: 'petal', add: false, vr: rand(-3, 3), flutter: 5 }); FX.later(0.5, () => V.hit(T.x, T.y, '#ffd0e4', 0.6)); },
    purify: (e, t) => { const w = t || e; V.sigil(w.x, w.y, { r: 40, style: 'star4', color: '#ffffff', dur: 0.6, spin: 4, follow: w }); V.burst(w.x, w.y - 20, { color: '#ffffff', color2: '#fff2a0', n: 10, speed: 180, kind: 'star' }); },
    chorus: e => { V.ribbons(e.x, e.y, { r: 60, dur: 1.2, follow: e, colors: ['#ffe680', '#ffffff', '#ffc0dc'] }); V.shock(e.x, e.y, { r: 160, color: '#ffe680', dur: 0.6, w: 5 }); },
    twinBless: (e, t) => { if (t && t !== e) V.beam(e.x, e.y, t.x, t.y, { color: '#fff2b0', w: 6, dur: 0.35 }); const w = t || e; V.plus(w.x, w.y, { color: '#fff2a0', n: 5 }); V.burst(w.x, w.y - 20, { color: '#ffe680', n: 8, speed: 160, kind: 'star', flash: false }); },
    // Grovekeeper
    lastBlossom: (e, t) => { const w = t || e; V.burst(w.x, w.y - 10, { color: '#ffb8e0', color2: '#ffffff', n: 10, speed: 160, kind: 'petal', flash: false }); V.plus(w.x, w.y, { color: '#9aff8a', n: 4 }); V.spikeburst(w.x, w.y, { r: 36, n: 10, color: '#ff9cc0', core: '#fff4e8', ink: '#5a1c3a', dur: 0.28, z: 16 }); V.shock(w.x, w.y, { r: 54, color: '#ffc0dc', dur: 0.35, w: 3 }); },
    spill: e => { V.splash(e.x, e.y, { color: '#8aff6a', n: 10, speed: 0.8 }); V.shock(e.x, e.y, { r: 110, color: '#8aff6a', dur: 0.5, w: 4 }); V.motes(e.x, e.y, { kind: 'leaf', color: '#6fbf5a', n: 8, r: 80 }); },
    ironbark: (e, t) => { const w = t || e; V.shield(w, { shape: 'hex', color: '#b08a5a', dur: 5, r: 38 }); V.crystals(w.x, w.y, { color: '#8a6a3a', n: 5, r: 24, h: 30, dur: 0.6 }); },
    pulse: e => { for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 140 + i * 40, color: '#8aff6a', dur: 0.55, w: 5 - i * 2, delay: i * 0.1 }); V.plus(e.x, e.y, { color: '#9aff8a', n: 4 }); },
    natureWrath: (e, t) => { const T = at(e, t); V.crystals(T.x, T.y, { color: '#5fbf4a', n: 8, r: 40, h: 56, dur: 0.8 }); V.spikeburst(T.x, T.y, { r: 46, n: 12, color: '#4fa03a', core: '#e8ffc0', ink: '#0e2a08', dur: 0.32 }); shake(3); },
    thickBark: e => { V.shield(e, { shape: 'hex', color: '#b08a5a', dur: 1.2, r: 40 }); V.debris(e.x, e.y, { n: 4, color: '#6a5034' }); },
    seedBurst: (e, t) => { const w = t || e; V.lightfall(w.x, w.y, { color: '#b0ff8a', r: 30, h: 220, dur: 0.8, feathers: 0 }); V.grove(w.x, w.y, { r: 70, dur: 1.6, flowers: 6, follow: w }); V.plus(w.x, w.y, { color: '#9aff8a', n: 8 }); },
    treantSlam: (e, t) => { const T = at(e, t), x = T.x + 30, y = T.y + 10; V.shock(x, y, { r: 80, color: '#8aff6a', dur: 0.4, w: 5 }); V.decal(x, y, { style: 'crack', r: 44, dur: 2, a: 0.55, seed: Math.random() * 6 });
      V.debris(x, y, { n: 5, color: '#6a5034' }); V.motes(x, y, { kind: 'leaf', color: '#6fbf5a', n: 5, r: 30 }); shake(3); },
    // Chronomancer
    dejavu: e => { V.ribbons(e.x, e.y, { r: 46, dur: 0.9, dir: -1, follow: e, colors: ['#9fe8ff', '#e0d4ff', '#ffd27a'] }); },
    futureMark: (e, t) => { const T = at(e, t); V.ink(T.x, T.y, { r: 50, dur: 6 }); V.sigil(T.x, T.y, { r: 50, style: 'clock', color: '#9fe8ff', dur: 6, spin: 0.6 }); },
    futureBurst: (e, t) => { const T = at(e, t); V.burst(T.x, T.y, { color: '#9fe8ff', color2: '#ffffff', n: 16, speed: 240, kind: 'star' }); V.shock(T.x, T.y, { r: 80, color: '#9fe8ff', dur: 0.4, w: 5 }); },
    clockStrike: (e, t) => { const T = at(e, t); V.lightning(e.x, e.y - 104, T.x, T.y, { color: '#ffe6a8', jag: 12, dur: 0.3 }); V.hit(T.x, T.y, '#ffd27a', 0.8); V.plus(e.x, e.y, { color: '#ffe6a8', n: 3 }); },
    secondChance: (e, t) => { const w = t || e; V.sigil(w.x, w.y, { r: 60, style: 'clock', color: '#9fe8ff', dur: 1, spin: -4, follow: w }); V.lightfall(w.x, w.y, { color: '#bff0ff', r: 30, h: 240, dur: 0.7, feathers: 0 }); },
  });
  for (const n of AIMED) KIT_VFX[n].atTarget = true;
})();

// ======================================================================= painted pass: Marionettist, Thermist, Driftblade
// Building blocks for these three classes' moves and Ultimates, after their reference sheets in docs/art/vfx-reference
// (marionettist.png, thermist.png, driftblade.png: WINDUP, IMPACT, AFTERMATH). Floor marks that linger stay faint, so a
// boss telegraph under them still reads; the bright shapes are short. Particle counts are capped per call.
// MARI_PAINT: red velvet, rose petals, footlights, a spotlight, gold strings, little ivory dolls, a rose sigil.
const MARI_PAINT = (() => {
  const V = VFX, TAU2 = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const C = { CRIM: '#e0203c', ROSE: '#ff5a7a', PINK: '#ffb0c4', GOLD: '#ffd27a', AMBER: '#ffcf6a', VEL: '#8a1028', VEL2: '#c0203a', INK: '#2a0410', CORE: '#fff0e6', IVORY: '#f4e4d2' };
  const PET = [C.CRIM, C.ROSE, C.VEL2, '#ff7a94'];
  // rose petals: 'burst' flings them out of (x, y) to settle round it; 'fall' lets them drift down over a radius r
  function petals(x, y, o = {}) {
    const n = Math.min(24, o.n ?? 10), fall = o.mode === 'fall', r = o.r ?? 0;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU2, sp = rand(0.4, 1) * (o.speed ?? 200), d = Math.sqrt(Math.random()) * r;
      V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.62, z: fall ? rand(50, 110) : (o.z ?? 20), vx: fall ? rand(-20, 20) : Math.cos(a) * sp, vy: fall ? rand(-6, 6) : Math.sin(a) * sp * 0.62,
        vz: fall ? rand(-30, -10) : rand(60, 200), g: fall ? 40 : 320, drag: fall ? 0.03 : 0.05, life: rand(0.75, 1) * (o.life ?? 1.7), size: rand(8, 12) * (o.size ?? 1),
        color: PET[i % PET.length], kind: 'petal', add: false, a: o.a ?? 0.9, vr: rand(-5, 5), flutter: rand(4, 9), fadeIn: 0.04, fadePow: 4 });
    }
  }
  // a little marionette (ivory, crimson skirt) standing at (x, y): s scales it, lean tips it into a lunge
  function doll(c, x, y, s, a, lean = 0, body = C.IVORY) {
    if (a <= 0.02) return;
    V.glowAt(c, x, y - 14 * s, 15 * s, C.ROSE, 0.3 * a);
    c.save(); c.translate(x, y); c.rotate(lean); c.scale(s, s); c.globalAlpha = Math.min(1, a);
    const limbs = () => { c.beginPath(); c.moveTo(-3, 0); c.lineTo(-1, -10); c.moveTo(3, 0); c.lineTo(1, -10); c.moveTo(0, -12); c.lineTo(0, -19);
      c.moveTo(-8, -26); c.lineTo(0, -18); c.lineTo(8, -26); c.stroke(); };
    // (scale-up pass) a dark ink outline under the limbs, skirt and head so the doll reads on any floor
    c.lineCap = 'round'; c.strokeStyle = C.INK; c.lineWidth = 4.2; limbs();
    c.fillStyle = C.INK; c.beginPath(); c.ellipse(0, -11, 8.4, 4.2, 0, 0, TAU2); c.fill(); c.beginPath(); c.arc(0, -23.4, 4.8, 0, TAU2); c.fill();
    c.strokeStyle = body; c.lineWidth = 2.2; limbs();
    c.fillStyle = C.VEL2; c.beginPath(); c.ellipse(0, -11, 7, 3, 0, 0, TAU2); c.fill();
    c.fillStyle = C.GOLD; c.fillRect(-6, -11.6, 12, 1.2);
    c.fillStyle = body; c.beginPath(); c.arc(0, -23, 3.4, 0, TAU2); c.fill();
    c.fillStyle = C.CRIM; c.beginPath(); c.arc(0, -24.5, 3.6, Math.PI * 1.05, Math.PI * 1.95); c.fill();
    c.restore(); c.globalAlpha = 1;
  }
  // a bright crimson X: two blades flash out from the middle, white at the heart, ink under; o.scar leaves faint cuts on the floor
  function xcut(x, y, o = {}) {
    const r = o.r ?? 60, a = o.a ?? 0.6, w = o.w ?? 7, dur = o.dur ?? 0.36, z = o.z ?? 12, col = o.color || C.CRIM, angs = [a, Math.PI - a];
    const lens = (c, L, ww) => { c.beginPath(); c.moveTo(-L, 0); c.quadraticCurveTo(0, -ww, L, 0); c.quadraticCurveTo(0, ww, -L, 0); c.fill(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.18)), k = e.a * (1 - Math.max(0, (p - 0.3) / 0.7)), L = r * q;
      c.save(); c.translate(x, y - z);
      for (const an of angs) {
        c.save(); c.rotate(an);
        c.globalAlpha = 0.3 * k; c.fillStyle = C.INK; lens(c, L * 1.04, w * 1.5);
        c.globalCompositeOperation = 'lighter';
        for (const [cl, ww, al] of [[col, w * 2.2, 0.35], [col, w, 0.9], ['#ffffff', w * 0.35, 0.95]]) { c.globalAlpha = al * k; c.fillStyle = cl; lens(c, L, ww); }
        c.restore();
      }
      c.restore();
      V.glowAt(c, x, y - z, r * 0.45, col, 0.6 * k);
    } });
    if (o.scar) V.fx({ dur: o.scar, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1, (1 - p) / 0.5) * (o.scarA ?? 0.55);
      for (const an of angs) { const dx = Math.cos(an) * r * 0.9, dy = Math.sin(an) * r * 0.9 * 0.62; V.neonPath(c, col, 1.7, k, () => { c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); }); }
    } });
  }
  // the stage: a gold ring with a compass on its floor and footlights round its front, velvet drapes framing it at the
  // back (they swing open over the first 0.35s), the valance across the top
  function stage(x, y, o = {}) {
    const R = o.r ?? 110, dur = o.dur ?? 1.1, F = 0.62, sk = R / 110, adur = o.airDur ?? dur;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = Math.min(1, t / 0.15, (dur - t) / 0.3) * e.a, open = easeOut(Math.min(1, t / 0.3)), RR = R * (0.7 + 0.3 * open);
      c.globalAlpha = 0.18 * k; c.fillStyle = '#1a0408'; c.beginPath(); c.ellipse(x, y, RR, RR * F, 0, 0, TAU2); c.fill(); c.globalAlpha = 1;
      V.neonRing(c, x, y, RR, C.GOLD, 1.8 * sk, 0.85 * k, F);
      V.neonRing(c, x, y, RR * 0.88, C.GOLD, 0.8 * sk, 0.5 * k, F);
      V.neonRing(c, x, y, RR * 0.34, C.GOLD, 0.8 * sk, 0.4 * k, F);
      c.save(); c.translate(x, y); c.scale(1, F);
      V.neonPath(c, C.GOLD, 0.9 * sk, 0.42 * k, () => { for (let i = 0; i < 8; i++) { const a = i * TAU2 / 8 + t * 0.3, r1 = RR * (i % 2 ? 0.45 : 0.8); c.moveTo(Math.cos(a) * RR * 0.12, Math.sin(a) * RR * 0.12); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } });
      c.restore();
      // footlights: little dark lamp housings with a warm flame in each, round the front of the ring
      for (let i = 0; i < 13; i++) {
        const a = -0.15 * Math.PI + i * 1.3 * Math.PI / 12, px = x + Math.cos(a) * RR * 1.04, py = y + Math.sin(a) * RR * F * 1.04, fl = 0.7 + 0.15 * Math.sin(t * 13 + i * 1.7);
        c.globalAlpha = 0.8 * k * open; c.fillStyle = C.INK; c.fillRect(px - 4 * sk, py - 2 * sk, 8 * sk, 5 * sk); c.globalAlpha = 1;
        V.glowAt(c, px, py - 3 * sk, 15 * sk, C.AMBER, k * fl * open); V.glowAt(c, px, py - 3 * sk, 4.5 * sk, '#ffffff', k * open);
      }
    } });
    V.fx({ dur: adur, layer: 'air', draw: (c, p, t, e) => {
      const k = Math.min(1, t / 0.12, (adur - t) / 0.3) * e.a, open = 0.35 + 0.65 * easeOut(Math.min(1, t / 0.35));
      const H = R * 1.05, top = y - R * F - H + 20, bot = top + H, W = R + 24, io = (W - R * 0.42) * open;
      c.save();
      for (const s of [-1, 1]) {
        const xo = x + s * W, xi = x + s * io, g = c.createLinearGradient(xi, 0, xo, 0);
        g.addColorStop(0, C.VEL2); g.addColorStop(1, '#4a0614');
        c.globalAlpha = 0.85 * k; c.fillStyle = g;
        c.beginPath(); c.moveTo(xo, top); c.lineTo(xi, top); c.quadraticCurveTo(xi + s * 8, top + H * 0.55, xi - s * 4 + Math.sin(t * 3) * 2, bot); c.lineTo(xo, bot + 6); c.closePath(); c.fill();
        c.globalAlpha = 0.5 * k; c.strokeStyle = '#ff6a7e'; c.lineWidth = 1.2 * sk;
        for (let i = 1; i < 5; i++) { const fx = xi + (xo - xi) * i / 5; c.beginPath(); c.moveTo(fx, top + 6); c.quadraticCurveTo(fx + s * 3 * sk, top + H * 0.5, fx - s * 2 * sk, bot); c.stroke(); }
        c.globalAlpha = 0.6 * k; c.strokeStyle = '#2a0410'; c.lineWidth = 1.6 * sk;
        for (let i = 1; i < 5; i++) { const fx = xi + (xo - xi) * (i - 0.5) / 5; c.beginPath(); c.moveTo(fx, top + 6); c.quadraticCurveTo(fx + s * 3 * sk, top + H * 0.5, fx - s * 2 * sk, bot); c.stroke(); }
        c.globalAlpha = 0.9 * k; c.strokeStyle = C.GOLD; c.lineWidth = 2 * sk; c.beginPath(); c.moveTo(xi - s * 4, bot); c.lineTo(xo, bot + 6); c.stroke();
        V.glowAt(c, xi - s * 4, bot - H * 0.35, 6 * sk, C.GOLD, 0.8 * k);   // a gold tie-back on each drape
      }
      const x0 = x - W - 6, x1 = x + W + 6, step = (x1 - x0) / 8, vh = 14 * sk;
      c.globalAlpha = 0.9 * k; c.fillStyle = C.VEL;
      c.beginPath(); c.moveTo(x0, top - vh); c.lineTo(x1, top - vh); c.lineTo(x1, top + 2);
      for (let i = 1; i <= 8; i++) { const fx = x1 - step * i; c.quadraticCurveTo(fx + step / 2, top + vh, fx, top + 2); }
      c.closePath(); c.fill();
      c.strokeStyle = C.GOLD; c.lineWidth = 1.5 * sk; c.stroke();
      c.restore();
    } });
  }
  // phantom dolls let down on gold strings round a ring; at `hit` they lunge across the middle in pairs (an X of cuts)
  function troupe(x, y, o = {}) {
    const R = o.r ?? 90, n = o.n ?? 4, hit = o.hit ?? 0.45, F = 0.62, dur = hit + 0.22, ds = o.ds ?? 1.15;
    const pos = Array.from({ length: n }, (_, i) => { const a = Math.PI / 4 + i * TAU2 / n; return [x + Math.cos(a) * R, y + Math.sin(a) * R * F]; });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      for (let i = 0; i < n; i++) {
        const [px, py] = pos[i], [qx, qy] = pos[(i + Math.floor(n / 2)) % n];
        if (t < hit) {
          // let down on gold strings from a little wooden control bar (the cross of a marionette) that sways above it
          const q = easeOut(Math.min(1, t / (hit * 0.75))), z = 60 * ds * (1 - q), k = e.a * Math.min(1, t / 0.12), sw = Math.sin(t * 9 + i) * 0.12;
          const hy = py - z - 26 * ds, by = hy - 70 * ds, bx = px + sw * 30 * ds, bw = 11 * ds;
          V.neonPath(c, C.GOLD, 0.7 * ds, 0.7 * k, () => { c.moveTo(px, by - 160); c.lineTo(bx, by); c.moveTo(bx - bw, by); c.lineTo(px - 8 * ds, hy); c.moveTo(bx + bw, by); c.lineTo(px + 8 * ds, hy); c.moveTo(bx, by); c.lineTo(px, hy + 2 * ds); });
          c.globalAlpha = 0.95 * k; c.strokeStyle = '#7a4a22'; c.lineWidth = 2.6 * ds; c.lineCap = 'round';
          c.beginPath(); c.moveTo(bx - bw, by); c.lineTo(bx + bw, by); c.moveTo(bx, by - bw * 0.6); c.lineTo(bx, by + bw * 0.6); c.stroke(); c.globalAlpha = 1;
          V.glowAt(c, bx, by, 6 * ds, C.GOLD, 0.6 * k);
          doll(c, px, py - z, ds, 0.95 * k, sw);
        } else {
          const u = Math.min(1, (t - hit) / 0.2), m = easeOut(u), dx = px + (qx - px) * m, dy = py + (qy - py) * m, k = e.a * (1 - u);
          V.neonPath(c, i % 2 ? C.ROSE : C.GOLD, 3 * ds / 1.15, 0.75 * k, () => { c.moveTo(px, py - 14 * ds); c.lineTo(dx, dy - 14 * ds); });
          doll(c, dx, dy, ds, k, (qx > px ? 1 : -1) * 0.35);
        }
      }
    } });
  }
  // a spotlight from above: a soft warm cone and a pool of light on the floor (lighter, faint: it lingers)
  function spotlight(x, y, o = {}) {
    const r = o.r ?? 60, h = o.h ?? 300, dur = o.dur ?? 2.2, al = o.a ?? 0.18;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = Math.min(1, t / 0.25, (dur - t) / 0.8) * e.a * al;
      if (k < 0.01) return;
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, rgba(C.AMBER, 0)); g.addColorStop(1, rgba(C.AMBER, Math.min(1, k)));
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 10, y - h); c.lineTo(x + 10, y - h); c.lineTo(x + r, y); c.lineTo(x - r, y); c.closePath(); c.fill();
      c.globalAlpha = Math.min(1, 0.8 * k); c.fillStyle = C.AMBER; c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, TAU2); c.fill();
      c.globalAlpha = 1;
    } });
  }
  // the rose sigil: a gold ring and a crimson one, four spokes, and a rose of three whorls in the middle
  function roseSigil(x, y, o = {}) {
    const r = o.r ?? 90, dur = o.dur ?? 2.6, al = o.a ?? 0.5, F = 0.62, spin = rand(0, TAU2), sk = Math.max(1, r / 90), posts = o.posts ?? 0;
    V.fx({ dur, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
      const cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y, k = Math.min(1, t / 0.3, (dur - t) / 0.9) * e.a * al, R = r * (0.85 + 0.15 * easeOut(Math.min(1, t / 0.4)));
      if (k < 0.01) return;
      V.neonRing(c, cx, cy, R, C.GOLD, 1.4 * sk, k, F);
      V.neonRing(c, cx, cy, R * 0.8, C.CRIM, 0.9 * sk, 0.7 * k, F);
      // (scale-up pass) o.posts: little gold stanchions round the rim with velvet-gold ropes drooping between them
      if (posts) {
        const pp = Array.from({ length: posts }, (_, i) => { const a = spin + (i + 0.5) * TAU2 / posts; return [cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * 1.12 * F]; });
        V.neonPath(c, C.GOLD, 0.9 * sk, 0.75 * k, () => { for (let i = 0; i < posts; i++) { const [ax, ay] = pp[i], [bx, by] = pp[(i + 1) % posts]; c.moveTo(ax, ay - 22 * sk); c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 8 * sk, bx, by - 22 * sk); } });
        for (const [px, py] of pp) { V.neonPath(c, C.GOLD, 1.3 * sk, k, () => { c.moveTo(px, py); c.lineTo(px, py - 26 * sk); }); V.glowAt(c, px, py - 27 * sk, 6 * sk, C.AMBER, k); }
      }
      c.save(); c.translate(cx, cy); c.scale(1, F);
      V.neonPath(c, C.GOLD, 0.8 * sk, 0.6 * k, () => { for (let i = 0; i < 4; i++) { const a = spin + i * TAU2 / 4 + t * 0.15; c.moveTo(Math.cos(a) * R * 0.32, Math.sin(a) * R * 0.32); c.lineTo(Math.cos(a) * R * 1.08, Math.sin(a) * R * 1.08); } });
      const rr = R * 0.28;
      for (let j = 0; j < 3; j++) {
        const rad = rr * (1 - j * 0.3); c.fillStyle = [C.VEL, C.VEL2, C.ROSE][j]; c.globalAlpha = Math.min(0.62, 1.1 * k);
        for (let i = 0; i < 5; i++) { const a = spin + i * TAU2 / 5 + j * 0.63; c.beginPath(); c.ellipse(Math.cos(a) * rad * 0.42, Math.sin(a) * rad * 0.42, rad * 0.55, rad * 0.36, a, 0, TAU2); c.fill(); }
      }
      c.globalAlpha = 1; c.restore();
      V.glowAt(c, cx, cy, rr * 1.6, C.ROSE, 0.6 * k);
    } });
  }
  // Pirouette: tilted rings of light spinning round a Doll, rose, gold and crimson
  function spinRings(x, y, o = {}) {
    const r = o.r ?? 56, dur = o.dur ?? 0.7;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.4), grow = easeOut(Math.min(1, p / 0.35));
      const sk = Math.max(1, r / 56);
      for (let i = 0; i < 4; i++) {
        const R = r * (0.6 + 0.2 * i) * (0.6 + 0.4 * grow), tilt = [-0.25, 0.15, 0, -0.08][i], a0 = t * (14 - i * 3) * (i % 2 ? -1 : 1) + i * 2, zz = 12 + i * 6;
        V.neonPath(c, [C.ROSE, C.GOLD, C.CRIM, C.PINK][i], (2.8 - i * 0.5) * sk, k * 0.9, () => c.ellipse(x, y - zz, R, R * 0.36, tilt, a0, a0 + 2.6));
      }
      V.neonRing(c, x, y, r * 0.95 * (0.6 + 0.4 * grow), C.ROSE, 1.2 * sk, 0.5 * k, 0.62);
      V.glowAt(c, x, y - 16, r * 0.6, C.ROSE, 0.35 * k);
    } });
  }
  // Swap: pale afterimages strung along the way from a to b, with a thin rose string through them
  function ghostTrail(ax, ay, bx, by, o = {}) {
    const dur = o.dur ?? 0.45, n = 4, mx = (ax + bx) / 2, my = (ay + by) / 2 - 30, s = o.s ?? 1.5;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p);
      V.neonPath(c, C.ROSE, 1.4, 0.6 * k, () => { c.moveTo(ax, ay - 16); c.quadraticCurveTo(mx, my - 16, bx, by - 16); });
      for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, u = 1 - q, gx = u * u * ax + 2 * u * q * mx + q * q * bx, gy = u * u * ay + 2 * u * q * my + q * q * by;
        doll(c, gx, gy + 6, s, k * (0.15 + 0.35 * q), 0, C.PINK); }
    } });
  }
  // Doll Summon: three gold strings let down onto a Doll and a crimson ribbon spiralling down round it as it lands
  function dollDrop(x, y, o = {}) {
    const dur = o.dur ?? 0.55, s1 = o.s ?? 1.3;   // (scale-up pass) s1: overall size, 1.3 by default
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.4), drop = easeOut(Math.min(1, p / 0.5));
      V.neonPath(c, C.GOLD, 1.1, 0.75 * k, () => { for (const dx of [-7, 0, 7]) { c.moveTo(x + dx * 1.6 * s1, y - 240); c.lineTo(x + dx * s1, y - 26 * s1); } });
      for (const [col, w, ph] of [[C.CRIM, 2.4, 0], [C.ROSE, 1.2, Math.PI]]) V.neonPath(c, col, w * s1, k, () => { for (let s = 0; s <= 20; s++) { const q = s / 20, a = q * 9 + t * 10 + ph, rr = (14 + 8 * q) * s1, px = x + Math.cos(a) * rr, py = y - 6 - 84 * s1 * (1 - q) * (1.2 - drop) + Math.sin(a) * rr * 0.35; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      V.glowAt(c, x, y - 20 * s1, 22 * s1, C.ROSE, 0.35 * k);
    } });
    V.fx({ dur: 0.55, delay: 0.12, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - p); V.neonRing(c, x, y, (26 + 18 * easeOut(p)) * s1, C.ROSE, 1.8, k, 0.62); V.neonRing(c, x, y, (18 + 10 * easeOut(p)) * s1, C.GOLD, 1.2, 0.8 * k, 0.62); } });
  }
  // (online-refs pass, docs/art/vfx-online-refs/marionettist.md) one crimson blade drawn through (x, y) at ang: it runs
  // from one end to the other in o.go s (a white-hot core only while it draws), then thins and fades. Cross-Cut's X is
  // two of these, the first along the string, the second across it a beat later; o.scar leaves a faint line on the floor
  function stroke(x, y, ang, o = {}) {
    const r = o.r ?? 60, w = o.w ?? 7, dur = o.dur ?? 0.34, z = o.z ?? 12, col = o.color || C.CRIM, go = o.go ?? 0.07, fade = Math.max(0.05, dur - go - 0.04);
    const lens = (c, a0, a1, hw) => { c.beginPath(); c.moveTo(a0, 0); c.quadraticCurveTo((a0 + a1) / 2, -hw, a1, 0); c.quadraticCurveTo((a0 + a1) / 2, hw, a0, 0); c.fill(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, t / go)), k = e.a * (1 - Math.min(1, Math.max(0, (t - go - 0.04) / fade))), ww = w * (1 - 0.45 * Math.max(0, p - 0.3)), L1 = -r + 2 * r * q;
      if (k < 0.02) return;
      c.save(); c.translate(x, y - z); c.rotate(ang);
      c.globalAlpha = 0.3 * k; c.fillStyle = C.INK; lens(c, -r * 1.04, L1 * 1.04, ww * 1.5);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.35 * k; c.fillStyle = col; lens(c, -r, L1, ww * 2.2);
      c.globalAlpha = 0.9 * k; lens(c, -r, L1, ww);
      if (t < go + 0.08) { c.globalAlpha = 0.95 * k; c.fillStyle = '#ffffff'; lens(c, -r * 0.9, L1 * 0.9, ww * 0.35); }
      c.restore();
      if (q < 1) V.glowAt(c, x + Math.cos(ang) * L1, y - z + Math.sin(ang) * L1, 10 + w, '#ffffff', 0.7 * k);
    } });
    if (o.scar) V.fx({ dur: o.scar, delay: go, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1, (1 - p) / 0.5) * (o.scarA ?? 0.5), dx = Math.cos(ang) * r * 0.9, dy = Math.sin(ang) * r * 0.9;
      V.neonPath(c, col, 1.5, k, () => { c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); });
    } });
  }
  // (online-refs pass) Pirouette, after the Dancer's spin step: two ribbons, crimson and gold, wind up round a Doll as it
  // turns and then open out as they let go; a light shape for a GCD (the painted spinRings stay for bigger moments)
  function ribbons(x, y, o = {}) {
    const r = o.r ?? 34, dur = o.dur ?? 0.45, H = o.h ?? 42;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.05, (1 - p) / 0.35), wind = easeOut(Math.min(1, p / 0.55)), open = Math.max(0, (p - 0.5) / 0.5);
      for (const [col, w, ph] of [[C.CRIM, 3, 0], [C.GOLD, 1.6, Math.PI]]) V.neonPath(c, col, w, k, () => {
        for (let s = 0; s <= 16; s++) { const q = s / 16, a = ph + q * 7 + t * 18, rr = r * (0.7 + 0.3 * q) * (1 + 0.9 * open), px = x + Math.cos(a) * rr, py = y - 6 - H * q * wind + Math.sin(a) * rr * 0.36; s ? c.lineTo(px, py) : c.moveTo(px, py); }
      });
      V.glowAt(c, x, y - 16, r * 0.8, C.ROSE, 0.3 * k * (1 - open));
    } });
  }
  return { C, petals, doll, xcut, stage, troupe, spotlight, roseSigil, spinRings, ghostTrail, dollDrop, stroke, ribbons };
})();

// THERM_PAINT: frost blue against orange fire: a clock dial, a crown of rising ice, shards, steam, lava cracks, a frost rim
const THERM_PAINT = (() => {
  const V = VFX, TAU2 = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a), F = 0.62;
  const FIRE = '#ff8a3a', ICE = '#6fb2f0';
  // ice shards flung out of (x, y) (o.angle aims them in a cone); they tumble, fall and break
  function shards(x, y, o = {}) {
    const n = Math.min(18, o.n ?? 10), aim = o.angle;
    for (let i = 0; i < n; i++) {
      const a = aim != null ? aim + rand(-1, 1) * (o.spread ?? 0.6) : Math.random() * TAU2, sp = rand(0.4, 1) * (o.speed ?? 300);
      V.spawn({ x, y, z: o.z ?? 16, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.62, vz: rand(80, 260), g: 600, drag: 0.03, life: rand(0.5, 0.9) * (o.life ?? 1), size: rand(9, 15) * (o.size ?? 1),
        color: i % 3 ? (o.color || '#9fd8ff') : '#e8f8ff', kind: 'shard', add: false, vr: rand(-10, 10), fadePow: 3 });
    }
  }
  const steam = (x, y, o = {}) => V.smoke(x, y, { n: Math.min(8, o.n ?? 4), r: o.r ?? 30, color: '#e8eef4', size: o.size ?? 26, a: o.a ?? 0.3, speed: 25, life: o.life ?? 1.8 });
  // glowing cracks in the floor that cool (Flare's aftermath): ink first, the heat inside them fading out
  function lavaCracks(x, y, o = {}) {
    const r = o.r ?? 40, dur = o.dur ?? 2, n = o.n ?? 7;
    const cr = Array.from({ length: n }, (_, i) => { const a = i / n * TAU2 + rand(-0.3, 0.3); let px = 0, py = 0; const pts = [[0, 0]]; for (let s = 0; s < 3; s++) { const aa = a + rand(-0.6, 0.6), L = r * rand(0.25, 0.4); px += Math.cos(aa) * L; py += Math.sin(aa) * L * F; pts.push([px, py]); } return pts; });
    const trace = c => { for (const pts of cr) { c.moveTo(x + pts[0][0], y + pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(x + pts[i][0], y + pts[i][1]); } };
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1, (1 - p) / 0.5) * (o.a ?? 0.6), heat = Math.max(0, 1 - p * 1.2);
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.globalAlpha = k * 0.7; c.strokeStyle = '#1a0a04'; c.lineWidth = 3; c.beginPath(); trace(c); c.stroke();
      if (heat > 0.02) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * heat; c.strokeStyle = o.color || '#ff6a1a'; c.lineWidth = 1.8; c.beginPath(); trace(c); c.stroke();
        c.strokeStyle = '#ffd070'; c.lineWidth = 0.7; c.beginPath(); trace(c); c.stroke();
        c.globalCompositeOperation = 'source-over';
      }
      c.globalAlpha = 1;
      V.glowAt(c, x, y, r * 0.5, '#ff6a1a', 0.3 * k * heat);
    } });
  }
  // a frosted rim round a crater: a pale band and a ring of little ice spikes pointing out
  function frostRim(x, y, o = {}) {
    const r = o.r ?? 80, dur = o.dur ?? 3, n = o.n ?? 18;
    const sp = Array.from({ length: n }, (_, i) => ({ a: i / n * TAU2 + rand(-0.12, 0.12), l: rand(0.12, 0.3), w: rand(0.05, 0.09) }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.2, (1 - p) / 0.5) * (o.a ?? 0.45);
      if (k < 0.01) return;
      c.save(); c.translate(x, y); c.scale(1, F);
      c.globalAlpha = k * 0.35; c.fillStyle = '#cfeeff'; c.beginPath(); c.arc(0, 0, r * 1.12, 0, TAU2); c.arc(0, 0, r * 0.9, 0, TAU2, true); c.fill();
      c.globalAlpha = k; c.fillStyle = '#e8f8ff'; c.strokeStyle = 'rgba(40,80,120,0.6)'; c.lineWidth = 1;
      for (const s of sp) { const r0 = r * 0.95, r1 = r * (1 + s.l); c.beginPath(); c.moveTo(Math.cos(s.a - s.w) * r0, Math.sin(s.a - s.w) * r0); c.lineTo(Math.cos(s.a) * r1, Math.sin(s.a) * r1); c.lineTo(Math.cos(s.a + s.w) * r0, Math.sin(s.a + s.w) * r0); c.closePath(); c.fill(); c.stroke(); }
      c.restore(); c.globalAlpha = 1;
      V.neonRing(c, x, y, r, '#8fd0ff', 1.2 * Math.max(1, r / 80), 0.6 * k, F);
    } });
  }
  // the dial: a frost clock face, its hands racing, an orange and a blue arc whirling round its rim
  function dialSeal(x, y, o = {}) {
    const r = o.r ?? 100, dur = o.dur ?? 0.75, follow = o.follow, sk = Math.max(1, r / 100);
    V.ink(x, y, { r: r * 1.05, dur, flat: F, a: 0.4, follow });
    V.fx({ dur, layer: 'ground', follow, draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, t / 0.12, (1 - p) / 0.2), R = r * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.3)));
      V.neonRing(c, cx, cy, R, '#8fd0ff', 2.2 * sk, k, F); V.neonRing(c, cx, cy, R * 0.72, '#bfe6ff', 1 * sk, 0.7 * k, F);
      c.save(); c.translate(cx, cy); c.scale(1, F);
      V.neonPath(c, '#cfeeff', 1.2 * sk, 0.8 * k, () => { for (let i = 0; i < 12; i++) { const a = i * TAU2 / 12, r1 = R * (i % 3 ? 0.84 : 0.76); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); } });
      V.neonPath(c, '#ffffff', 2 * sk, k, () => { c.moveTo(0, 0); c.lineTo(Math.cos(t * 9) * R * 0.62, Math.sin(t * 9) * R * 0.62); c.moveTo(0, 0); c.lineTo(Math.cos(t * 2) * R * 0.4, Math.sin(t * 2) * R * 0.4); });
      const a = t * (o.spin ?? 8);
      V.neonPath(c, FIRE, 4 * sk, k, () => c.arc(0, 0, R * 1.15, a, a + 1.4));
      V.neonPath(c, ICE, 4 * sk, k, () => c.arc(0, 0, R * 1.15, a + Math.PI, a + Math.PI + 1.4));
      // (scale-up pass) a big seal gets a second, wider pair of arcs whirling the other way
      if (sk > 1.2) { const b = -t * (o.spin ?? 8) * 0.7 + 1; V.neonPath(c, FIRE, 2.6 * sk, 0.8 * k, () => c.arc(0, 0, R * 1.34, b, b + 1.1)); V.neonPath(c, ICE, 2.6 * sk, 0.8 * k, () => c.arc(0, 0, R * 1.34, b + Math.PI, b + Math.PI + 1.1)); }
      c.restore();
    } });
  }
  // a crown of frost crystals rising round a ring, leaning out; they shatter into shards when it ends
  function crystalCrown(x, y, o = {}) {
    const r = o.r ?? 80, n = Math.min(20, o.n ?? 10), dur = o.dur ?? 0.72, h = o.h ?? 70, ws = o.ws ?? 1, lean = o.lean ?? 0.45;
    const cs = Array.from({ length: n }, (_, i) => { const a = i / n * TAU2 + rand(-0.15, 0.15); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * F, a, h: h * rand(0.7, 1.25), w: rand(7, 11) * ws, d: rand(0, 0.25) }; }).sort((u, v) => u.y - v.y);
    V.fx({ dur, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1);
      for (const s of cs) {
        const g = easeOut(Math.max(0, Math.min(1, (t - s.d) / 0.4))); if (g <= 0) continue;
        const hh = s.h * g, tx = s.x + Math.cos(s.a) * lean * hh, ty = s.y - hh;
        c.globalAlpha = k * 0.9; c.fillStyle = '#5fb4f0'; c.beginPath(); c.moveTo(s.x - s.w, s.y); c.lineTo(tx, ty); c.lineTo(s.x + s.w, s.y); c.lineTo(s.x, s.y + s.w * 0.4); c.closePath(); c.fill();
        c.fillStyle = 'rgba(240,250,255,0.75)'; c.beginPath(); c.moveTo(s.x - s.w * 0.15, s.y); c.lineTo(tx, ty); c.lineTo(s.x + s.w * 0.55, s.y); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(8,32,58,0.75)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s.x - s.w, s.y); c.lineTo(tx, ty); c.lineTo(s.x + s.w, s.y); c.stroke();
        c.globalAlpha = 1;
        V.glowAt(c, tx, ty, 8 * ws, '#e8f8ff', 0.6 * k * g);
      }
      c.globalAlpha = 1;
    }, done: () => { for (let i = 0; i < cs.length; i += 2) shards(cs[i].x, cs[i].y, { n: 2, z: cs[i].h * 0.5, speed: 220 }); } });
  }
  // fire and frost wound together: two orange and two blue arms spiralling in on (x, y)
  function swirl2(x, y, o = {}) {
    const r = o.r ?? 70, dur = o.dur ?? 0.2, z = o.z ?? 14;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.05), R = r * (1 - p * 0.55);
      for (let i = 0; i < 4; i++) V.neonPath(c, i % 2 ? ICE : FIRE, 3 * Math.sqrt(Math.max(1, r / 70)), k, () => { for (let s = 0; s <= 16; s++) { const q = s / 16, a = t * 12 + i * TAU2 / 4 + q * 2.6, rr = R * (0.2 + q * 0.8), px = x + Math.cos(a) * rr, py = y - z + Math.sin(a) * rr * F; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
    } });
  }
  // two flame crescents (or frost ones) whirling round the mage's hand: the wind-up of a spell
  function handArcs(ent, o = {}) {
    const r = o.r ?? 30, dur = o.dur ?? 0.3, col = o.color || FIRE, col2 = o.color2 || col;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.06, (1 - p) / 0.4), x = ent.x, y = ent.y - 20 - (ent.lift || 0), a = t * 16, R = r * (1 - 0.3 * p);
      V.neonPath(c, col, 2.6, k, () => c.ellipse(x, y, R, R * 0.7, 0, a, a + 1.6));
      V.neonPath(c, col2, 2.6, k, () => c.ellipse(x, y, R, R * 0.7, 0, a + Math.PI, a + Math.PI + 1.6));
    } });
  }
  // a four-point star cross, long on the vertical
  function crossStar(c, x, y, s, col, a) {
    if (a <= 0.01) return;
    V.neonPath(c, col, 1.6, a, () => { c.moveTo(x, y - s * 1.5); c.lineTo(x, y + s * 1.5); c.moveTo(x - s, y); c.lineTo(x + s, y); });
    V.glowAt(c, x, y, s * 1.2, col, 0.7 * a);
  }
  // Equilibrium: a frost half (left) and a fire half (right) swing together into one ring at the feet, star crosses where
  // they meet and at either side; it settles to a faint ring before it goes
  function dualRing(ent, o = {}) {
    const r = o.r ?? 56, dur = o.dur ?? 1.3;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const x = ent.x, y = ent.y, close = easeOut(Math.min(1, t / 0.25)), R = r * (1.25 - 0.25 * close), g = (1 - close) * 16;
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.45) * (1 - 0.55 * Math.min(1, Math.max(0, (t - 0.45) / 0.3)));
      c.save(); c.translate(x, y); c.scale(1, F);
      const sk = Math.max(1, r / 56);
      V.neonPath(c, ICE, 3 * sk, k, () => c.arc(-g, 0, R, Math.PI / 2 + 0.12, Math.PI * 1.5 - 0.12));
      V.neonPath(c, FIRE, 3 * sk, k, () => c.arc(g, 0, R, -Math.PI / 2 + 0.12, Math.PI / 2 - 0.12));
      // (scale-up pass) a thinner inner pair of arcs, the other way round, like the sheet's double crescents
      V.neonPath(c, ICE, 1.4 * sk, 0.7 * k, () => c.arc(-g * 1.5, 0, R * 0.8, Math.PI / 2 + 0.4, Math.PI * 1.5 - 0.4));
      V.neonPath(c, FIRE, 1.4 * sk, 0.7 * k, () => c.arc(g * 1.5, 0, R * 0.8, -Math.PI / 2 + 0.4, Math.PI / 2 - 0.4));
      c.restore();
      const s = (6 + 5 * close) * sk;
      crossStar(c, x, y - R * F, s, '#ffffff', k); crossStar(c, x, y + R * F, s, '#ffffff', k);
      crossStar(c, x - R - g, y, s * 0.8, '#8fd0ff', k); crossStar(c, x + R + g, y, s * 0.8, '#ffb070', k);
    } });
  }
  // a spear of ice flying from s to t with a frost trail; onHit(x, y) where it lands; a faint frost streak stays on the floor
  function iceSpear(sx, sy, tx, ty, o = {}) {
    const d = Math.hypot(tx - sx, ty - sy), dur = Math.max(0.08, d / (o.speed ?? 1300)), a = Math.atan2(ty - sy, tx - sx), L = o.len ?? 64, W = o.w ?? 8, z = 18;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const x = sx + (tx - sx) * p, y = sy + (ty - sy) * p - z, k = e.a, bx = x - Math.cos(a) * L, by = y - Math.sin(a) * L;
      V.neonPath(c, '#8fd0ff', 3, 0.5 * k, () => { c.moveTo(sx + (bx - sx) * 0.4, sy - z + (by - sy + z) * 0.4); c.lineTo(bx, by); });
      c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = k;
      c.fillStyle = '#5fb4f0'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-L * 0.35, -W); c.lineTo(-L, 0); c.lineTo(-L * 0.35, W); c.closePath(); c.fill();
      c.fillStyle = 'rgba(240,250,255,0.85)'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-L * 0.35, -W * 0.4); c.lineTo(-L * 0.8, 0); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(8,32,58,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(12, 0); c.lineTo(-L * 0.35, -W); c.lineTo(-L, 0); c.lineTo(-L * 0.35, W); c.closePath(); c.stroke();
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, y, 18, '#cfeeff', 0.6 * k);
    }, tick: (p) => { if (Math.random() < 0.7) { const x = sx + (tx - sx) * p, y = sy + (ty - sy) * p; V.spawn({ x: x + rand(-6, 6), y: y + rand(-4, 4), z: z + rand(-6, 6), vx: rand(-20, 20), vz: rand(-20, 20), life: rand(0.3, 0.6), size: rand(4, 8), size1: 0, color: Math.random() < 0.4 ? '#ffffff' : '#9fd8ff', kind: Math.random() < 0.3 ? 'star' : 'glow' }); } },
    done: () => { if (o.onHit) o.onHit(tx, ty); } });
    if (o.trail !== false) V.fx({ dur: o.trail ?? 1.6, delay: dur * 0.5, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1, (1 - p) / 0.5) * 0.35, ax = sx + (tx - sx) * 0.25, ay = sy + (ty - sy) * 0.25;
      V.neonPath(c, '#9fd8ff', 1.4, k, () => { c.moveTo(ax, ay); c.lineTo(tx, ty); });
      for (let i = 1; i < 6; i++) { const q = 0.25 + i * 0.13; V.glowAt(c, sx + (tx - sx) * q + Math.sin(i * 7) * 6, sy + (ty - sy) * q + Math.cos(i * 5) * 4, 5, '#e8f8ff', k * 1.4); }
    } });
  }
  return { FIRE, ICE, shards, steam, lavaCracks, frostRim, dialSeal, crystalCrown, swirl2, handArcs, crossStar, dualRing, iceSpear };
})();

// DRIFT_PAINT: jade and white wind: tapered ribbons, a cyclone, a twister with debris, leaves, a spiral scar on the floor
const DRIFT_PAINT = (() => {
  const V = VFX, TAU2 = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a), F = 0.62;
  const WHITE = '#e8fff8', INK = '#0a2a24', LEAF = ['#8fe0b0', '#5fc890', '#b8f0c8'];
  // leaves: flung out of (x, y) (o.angle aims them), or (o.orbit) whirling round it
  function leaves(x, y, o = {}) {
    const n = Math.min(12, o.n ?? 6);
    for (let i = 0; i < n; i++) {
      const base = { z: rand(8, 50), life: rand(0.6, 1) * (o.life ?? 1.1), size: rand(7, 10), color: LEAF[i % 3], kind: 'leaf', add: false, vr: rand(-8, 8), flutter: rand(5, 9), fadePow: 3 };
      if (o.orbit) V.spawn(Object.assign(base, { x, y, orbit: { x, y, a: rand(0, TAU2), r: rand(0.4, 1) * o.orbit, w: rand(4, 7), dr: o.dr ?? 20, flat: F, follow: o.follow } }));
      else { const a = o.angle != null ? o.angle + rand(-0.7, 0.7) : rand(0, TAU2), sp = rand(0.4, 1) * (o.speed ?? 200); V.spawn(Object.assign(base, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(-20, 60), drag: 0.04 })); }
    }
  }
  // a point a fraction q of the way along a polyline
  const along = (pts, q) => { const f = Math.max(0, Math.min(1, q)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; };
  // a filled band along pts, w half-wide, tapering at both ends ('mid') or thickest near its leading end ('head')
  function strip(c, pts, w, taper) {
    const n = pts.length; if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, q = i / (n - 1);
      const ww = w * (taper === 'head' ? Math.pow(q, 1.2) * Math.min(1, (1 - q) * 6 + 0.15) : Math.sin(Math.PI * q));
      L.push([pts[i][0] - dy / d * ww, pts[i][1] + dx / d * ww]); R.push([pts[i][0] + dy / d * ww, pts[i][1] - dx / d * ww]);
    }
    c.beginPath(); c.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) c.lineTo(L[i][0], L[i][1]); for (let i = n - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); c.fill();
  }
  // a painted wind ribbon: ink under, a jade body, a white-hot core
  function paint(c, pts, w, col, k, taper, ink = true) {
    if (ink) { c.globalAlpha = 0.22 * k; c.fillStyle = INK; strip(c, pts, w * 1.3, taper); }
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.55 * k; c.fillStyle = col; strip(c, pts, w, taper);
    c.globalAlpha = 0.85 * k; c.fillStyle = '#ffffff'; strip(c, pts, w * 0.32, taper);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  // a ribbon racing along pts (world, lifted by z): the head runs out over the first 35%, the tail follows it in
  function windStrip(pts, o = {}) {
    const dur = o.dur ?? 0.4, z = o.z ?? 14, w = o.w ?? 6, col = o.color || '#8ff0d8', N = 14;
    V.fx({ dur, layer: o.layer || 'air', draw: (c, p, t, e) => {
      const s1 = easeOut(Math.min(1, p / 0.35)), s0 = Math.pow(Math.max(0, (p - 0.3) / 0.7), 1.2), k = e.a * (1 - Math.max(0, (p - 0.6) / 0.4));
      if (s1 - s0 < 0.02) return;
      const sub = Array.from({ length: N + 1 }, (_, i) => { const [x, y] = along(pts, s0 + (s1 - s0) * i / N); return [x, y - z]; });
      paint(c, sub, w, col, k, 'head');
    } });
  }
  const straight = (ax, ay, bx, by, n = 10, bow = 0) => Array.from({ length: n + 1 }, (_, i) => { const q = i / n, nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1, b = Math.sin(q * Math.PI) * bow; return [ax + (bx - ax) * q + nx / L * b, ay + (by - ay) * q + ny / L * b]; });
  const arcPts = (x, y, r, a0, span, n = 16, flat = F) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + span * i / n; return [x + Math.cos(a) * r, y + Math.sin(a) * r * flat]; });
  // a faint mark left on the floor along pts (low alpha: it lingers over telegraphs)
  function scuff(pts, o = {}) {
    const dur = o.dur ?? 1, col = o.color || '#8ff0d8';
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.5) * (o.a ?? 0.3);
      V.neonPath(c, col, o.w ?? 1.4, k, () => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))));
    } });
  }
  // long wind streaks through (x, y) along angle a: a few parallel blades racing past, leaves flung ahead, faint scuffs left
  function streaks(x, y, a, o = {}) {
    const back = o.back ?? 90, on = o.on ?? 110, n = Math.min(5, o.n ?? 3), col = o.color || '#8ff0d8', w = o.w ?? 6, ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * (o.gap ?? 10) + rand(-3, 3), b0 = back + rand(-14, 14), b1 = on + rand(-14, 14);
      const pts = straight(x - ca * b0 - sa * off, y - sa * b0 + ca * off, x + ca * b1 - sa * off, y + sa * b1 + ca * off, 10, rand(-6, 6));
      windStrip(pts, { w: i === Math.floor(n / 2) ? w : w * 0.6, color: i % 2 ? WHITE : col, dur: (o.dur ?? 0.38) * rand(0.9, 1.1), z: 14 + off * 0.2 });
      if (o.scuff !== false && i === Math.floor(n / 2)) scuff(pts, { color: col, dur: o.stay ?? 0.9, a: 0.25 });
    }
    leaves(x, y, { n: o.leaves ?? 3, angle: a, speed: 260 });
  }
  // a jade cyclone wound round someone: tilted ribbons at several heights spinning up the body, leaves caught in it
  function cyclone(ent, o = {}) {
    const r = o.r ?? 46, h = o.h ?? 90, dur = o.dur ?? 0.5, col = o.color || '#8ff0d8', x0 = ent.x, y0 = ent.y;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const x = o.follow === false ? x0 : ent.x, y = o.follow === false ? y0 : ent.y, k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.35), g = easeOut(Math.min(1, p / 0.4));
      const sk = Math.max(1, r / 46), nb = sk > 1.2 ? 6 : 4;
      for (let i = 0; i < nb; i++) {
        const q = i / (nb - 1), R = r * (0.65 + 0.5 * q) * (0.7 + 0.3 * g), a0 = t * (10 - i) + i * 1.3, zz = 6 + q * h * g;
        const pts = Array.from({ length: 13 }, (_, j) => { const a = a0 + 2.6 * j / 12; return [x + Math.cos(a) * R, y - zz + Math.sin(a) * R * 0.32 + Math.cos(a) * 6 * sk * (i % 2 ? 1 : -1)]; });
        paint(c, pts, (6 - q * 2) * Math.sqrt(sk), i % 2 ? WHITE : col, k * (0.6 + 0.4 * (1 - q)), 'head');
      }
    } });
    leaves(x0, y0, { n: o.leaves ?? 6, orbit: r, dr: 30, follow: o.follow === false ? null : ent });
  }
  // a twister: stacked spinning bands widening as they climb, a swirl of ribbons round its foot, rocks whirling in it
  function twister(x, y, o = {}) {
    const r = o.r ?? 70, h = o.h ?? 170, dur = o.dur ?? 1, col = o.color || '#8ff0d8', sk = Math.max(1, r / 70), sw = Math.pow(sk, 0.75);
    const nb = sk > 1.3 ? 9 : 6, nf = sk > 1.3 ? 4 : 3;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.35), g = easeOut(Math.min(1, p / 0.25));
      // (scale-up pass) a big twister gets a faint funnel body behind its bands, so it reads as one column of wind
      if (sk > 1.3) {
        const H = h * g, w0 = r * 0.2, w1 = r * 0.85 * (0.6 + 0.4 * g), sway = Math.sin(t * 3 + 3) * 6;
        const fg = c.createLinearGradient(0, y - H * 1.05, 0, y);
        fg.addColorStop(0, rgba(col, 0)); fg.addColorStop(0.45, rgba(col, 0.2)); fg.addColorStop(1, rgba(col, 0.08));
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, k); c.fillStyle = fg;
        c.beginPath(); c.moveTo(x - w0, y - 4); c.quadraticCurveTo(x - w0 * 1.6, y - H * 0.55, x - w1 + sway, y - H); c.quadraticCurveTo(x + sway, y - H * 1.12, x + w1 + sway, y - H); c.quadraticCurveTo(x + w0 * 1.6, y - H * 0.55, x + w0, y - 4); c.closePath(); c.fill();
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      for (let i = 0; i < nf; i++) { const a0 = t * 7 + i * TAU2 / nf, R = r * (1.1 + 0.25 * Math.sin(t * 3 + i)) * g; paint(c, arcPts(x, y - 6, R, a0, 2.2, 14, 0.5), 7 * sw, i % 2 ? WHITE : col, k * 0.85, 'head'); }
      for (let i = 0; i < nb; i++) {
        const q = i / (nb - 1), R = r * (0.22 + q * (sk > 1.3 ? 0.68 : 0.55)) * (0.6 + 0.4 * g), a0 = t * (12 - q * 4) + i * 0.8, yy = y - q * h * g;
        paint(c, arcPts(x + Math.sin(t * 3 + q * 3) * 6 * q, yy, R, a0, 4.4, 14, 0.28), (5 - q * 1.5) * sw, i % 2 ? WHITE : col, k * (0.55 + 0.45 * (1 - q)), 'head', i < 2);
      }
      V.glowAt(c, x, y - h * 0.3, r * 0.5, WHITE, 0.3 * k);
    } });
    const nr = Math.min(12, o.rocks ?? 8);
    for (let i = 0; i < nr; i++) V.spawn({ x, y, z: rand(10, h * 0.5), life: dur * rand(0.6, 0.9), size: rand(6, 10) * sw, color: i % 2 ? '#3a4440' : '#56605a', kind: 'shard', add: false, vr: rand(-10, 10), fadePow: 3,
      orbit: { x, y, a: rand(0, TAU2), r: rand(0.6, 1.1) * r, w: rand(5, 8), dr: 30, flat: F } });
    leaves(x, y, { n: o.leaves ?? 8, orbit: r * 0.9, dr: 50 });
  }
  // the scar it leaves: a faint spiral of wind cut into the floor, turning slowly as it fades
  function spiralScar(x, y, o = {}) {
    const r = o.r ?? 80, dur = o.dur ?? 2.4, col = o.color || '#8ff0d8', arms = o.arms ?? 3, a0 = rand(0, TAU2);
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.2, (1 - p) / 0.6) * (o.a ?? 0.4), rot = a0 + t * 0.4;
      if (k < 0.01) return;
      const trace = i => () => { for (let s = 0; s <= 22; s++) { const q = s / 22, a = rot + i * TAU2 / arms + q * 4, rr = r * (0.08 + q * 0.92), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * F; s ? c.lineTo(px, py) : c.moveTo(px, py); } };
      c.lineCap = 'round';
      const sk = Math.max(1, r / 80);
      for (let i = 0; i < arms; i++) { c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.lineWidth = 5 * sk; c.beginPath(); trace(i)(); c.stroke(); c.globalAlpha = 1; V.neonPath(c, col, 1.4 * sk, k, trace(i)); }
    } });
  }
  // a curved sickle of wind round (x, y) from a0 through span: thick at the leading end, a faint arc left on the floor
  function hookArc(x, y, r, a0, span, o = {}) {
    const col = o.color || '#8ff0d8', pts = arcPts(x, y, r, a0, span, 18);
    windStrip(pts, { w: o.w ?? 10, color: col, dur: o.dur ?? 0.5, z: 12 });
    windStrip(arcPts(x, y, r * 0.86, a0 + 0.2, span * 0.9, 16), { w: (o.w ?? 10) * 0.5, color: WHITE, dur: (o.dur ?? 0.5) * 0.9, z: 14 });
    scuff(pts, { color: col, dur: o.stay ?? 1.1, a: 0.28 });
    const [ex, ey] = pts[pts.length - 1];
    leaves(ex, ey, { n: 4, angle: a0 + span + Math.PI / 2 * Math.sign(span), speed: 180 });
  }
  // four small whirls round someone and a ring seal binding them (Stillpoint): it holds for dur, faint after the first beat
  function stillSeal(ent, o = {}) {
    const r = o.r ?? 54, dur = o.dur ?? 2, col = o.color || '#8ff0d8';
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const x = ent.x, y = ent.y, k = e.a * Math.min(1, t / 0.12, (1 - p) / 0.3) * (1 - 0.5 * Math.min(1, Math.max(0, (t - 0.5) / 0.4))), g = easeOut(Math.min(1, t / 0.3)), R = r * (0.8 + 0.2 * g), sk = Math.max(1, r / 54);
      V.neonRing(c, x, y, R, col, 1.4 * sk, 0.8 * k, F); V.neonRing(c, x, y, R * 0.55, WHITE, 0.8 * sk, 0.5 * k, F);
      // (scale-up pass) a slow spiral in the middle of the seal, as on the sheet's aftermath
      V.neonPath(c, col, 1 * sk, 0.6 * k, () => { for (let s = 0; s <= 16; s++) { const q = s / 16, aa = t * 1.5 + q * 5, rr = R * 0.08 + q * R * 0.36; const px = x + Math.cos(aa) * rr, py = y + Math.sin(aa) * rr * F; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2, vx = x + Math.cos(a) * R, vy = y + Math.sin(a) * R * F;
        for (let j = 0; j < 2; j++) V.neonPath(c, j ? WHITE : col, 1.4 * sk, k, () => { for (let s = 0; s <= 10; s++) { const q = s / 10, aa = -t * 9 + j * Math.PI + q * 4, rr = (3 + q * 11) * sk; const px = vx + Math.cos(aa) * rr, py = vy + Math.sin(aa) * rr * 0.6; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
        V.glowAt(c, vx, vy, 10 * sk, col, 0.5 * k);
      }
    } });
  }
  return { WHITE, INK, leaves, strip, paint, windStrip, straight, arcPts, scuff, streaks, cyclone, twister, spiralScar, hookArc, stillSeal };
})();

// ---------------------------------------------------------------- the advanced DPS: Thermist and Driftblade
// Three beats on every big move, like the painted reference sheets: a wind-up glyph, a bold main shape (hot core, saturated
// middle, dark ink edge), then a slow aftermath. Thermist fire is orange, frost is blue, and the Shock mixes both.
// Driftblade wind is pale jade (Orbit mint, Comet gold); its dashes leave lanes and ribbons that hang in the air.
const WIND_LANES = [];   // live Slipstream lanes: { ax, ay, bx, by, end } (anyone moving along one runs faster)
// speed factor for something at (x, y) moving along (vx, vy): 1.3 on a lane and roughly following it, else 1
function windLaneBoost(x, y, vx, vy, now) {
  for (let i = WIND_LANES.length - 1; i >= 0; i--) if (WIND_LANES[i].end < now) WIND_LANES.splice(i, 1);
  const sp = Math.hypot(vx, vy);
  if (!sp) return 1;
  for (const l of WIND_LANES) {
    const dx = l.bx - l.ax, dy = l.by - l.ay, L = Math.hypot(dx, dy) || 1;
    if (Math.abs((vx * dx + vy * dy) / (sp * L)) < 0.6) continue;   // crossing it, not running along it
    if (kitSegDist(x, y, l.ax, l.ay, l.bx, l.by) < 34) return 1.3;
  }
  return 1;
}
(() => {
  const V = VFX;
  const FIRE = { color: '#ff7a2a', core: '#fff0b0', ink: '#3a1004' }, ICE = { color: '#5fb4f0', core: '#f0faff', ink: '#08203a' };
  const shake = s => vfxShake(s);
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  const windCol = ent => (ent && ent.spec === 'comet' ? '#ffd08a' : ent && ent.spec === 'orbit' ? '#a8f0c8' : '#8ff0d8');
  // a ribbon of wind drawn along a path (pts in world space), flowing toward its end and fading out over dur
  const ribbon = (pts, o = {}) => V.fx({ dur: o.dur ?? 0.7, layer: o.layer || 'air', draw: (c, p, t, e) => {
    const k = (1 - p) * e.a, col = o.color || '#8ff0d8';
    V.neonPath(c, col, (o.w ?? 3) * (1 - p * 0.5), k, () => { pts.forEach(([x, y], i) => { const wob = Math.sin(i * 0.9 + t * 14) * (o.wob ?? 3); i ? c.lineTo(x, y - (o.z ?? 14) + wob) : c.moveTo(x, y - (o.z ?? 14) + wob); }); });
  } });
  const line2 = (ax, ay, bx, by, n = 10, bow = 0) => Array.from({ length: n + 1 }, (_, i) => { const q = i / n, nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1, b = Math.sin(q * Math.PI) * bow; return [ax + (bx - ax) * q + nx / L * b, ay + (by - ay) * q + ny / L * b]; });
  const loop = (x, y, r, a0, span, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + span * i / n; return [x + Math.cos(a) * r, y + Math.sin(a) * r * 0.62]; });

  // (online-refs pass, docs/art/vfx-online-refs/thermist.md) was this big spell cast at its own edge (instant, a sure
  // crit, On the Brink just set)? Your own hero only: the kit says so; anyone else's plays the plain cast
  const thermEdgeHit = c => { const g = typeof window !== 'undefined' && window.__game, k = c.mine && g && g.actor && g.actor.kit;
    const fresh = (id, d) => k.has(id) && (typeof k.remaining !== 'function' || k.remaining(id) >= d);
    return !!(k && typeof k.has === 'function' && (fresh('brink', 5.7) || fresh('corona', 11.7))); };   // (a Zenith's edge cast lights a Corona instead)
  // the edge cast's crit beat: a white-hot four-point star (long on the vertical) flashing over the hit, a sharp ring
  // in the element's colour; gone in a third of a second
  function thermCritStar(x, y, col) {
    V.fx({ dur: 0.34, layer: 'air', draw: (c, p, t, e) => { const q = easeOut(Math.min(1, p / 0.25)), k = e.a * (1 - Math.max(0, (p - 0.35) / 0.65)), s = 14 + 18 * q, cy = y - 34;
      if (k < 0.02) return;
      V.neonPath(c, '#ffffff', 2.4, k, () => { c.moveTo(x, cy - s * 1.6); c.lineTo(x, cy + s * 1.6); c.moveTo(x - s, cy); c.lineTo(x + s, cy); });
      V.neonPath(c, col, 1.4, k * 0.8, () => { const d = s * 0.5; c.moveTo(x - d, cy - d); c.lineTo(x + d, cy + d); c.moveTo(x + d, cy - d); c.lineTo(x - d, cy + d); });
      V.glowAt(c, x, cy, s, col, 0.6 * k); V.glowAt(c, x, cy, 6, '#ffffff', k); } });
    V.shock(x, y, { r: 70, r0: 20, color: col, dur: 0.28, w: 3 });
  }

  ABILITY_VFX.thermist = {
    // a spark in the right hand, a small fire bolt, a little burst
    // (online-refs pass: FF14 Fire / WoW Fire Blast as the mover) a quick flame crescent flicks round the hand first
    cinder: c => { const h = ahead(c, 16); THERM_PAINT.handArcs(c.ent, { r: 22, dur: 0.16 }); V.glint(h.x, h.y, { color: '#ffb050', size: 16 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ff8a3a', speed: 900, size: 0.8, onHit: (x, y) => { V.spikeburst(x, y, { r: 26, n: 9, ...FIRE, dur: 0.24 }); V.hit(x, y, '#ffc080', 0.35); } }); },
    // frost on the left hand, a shard of ice, a few chips where it breaks
    // (online-refs pass: WoW Ice Lance as the mover) a quick frost crescent flicks round the hand first
    rime: c => { const h = ahead(c, 16); THERM_PAINT.handArcs(c.ent, { r: 22, dur: 0.16, color: '#6fb2f0', color2: '#cfeeff' }); V.glint(h.x, h.y, { color: '#cfeeff', size: 16 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: '#8fd0ff', speed: 1000, size: 0.75, onHit: (x, y) => { V.spikeburst(x, y, { r: 24, n: 8, ...ICE, dur: 0.24 }); V.crystals(x, y, { color: '#bfe6ff', n: 3, r: 14, h: 20, dur: 0.5 }); } }); },
    // (painted pass, thermist.png) Flare: flame crescents whirl round the hand and a fire glyph opens on the boss; a bold
    // orange starburst with flame tongues leaping out of it; then cracks glowing in the floor that cool, and a little smoke
    // (online-refs pass: FF14 Fire IV) at the edge (instant, a sure crit) a white-hot crit star flashes over the burst
    flare: c => { const TP = THERM_PAINT, edge = thermEdgeHit(c); TP.handArcs(c.ent, { r: 36, dur: 0.3 }); if (edge) c.later(0.14, () => thermCritStar(c.tx, c.ty, '#ffb050')); V.sigil(c.tx, c.ty, { r: 52, style: 'star5', color: '#ff9a3a', dur: 0.35, spin: 5 });
      c.later(0.12, () => { V.spikeburst(c.tx, c.ty, { r: 82, n: 18, ...FIRE, dur: 0.38 }); V.spikeburst(c.tx, c.ty, { r: 44, n: 10, color: '#ffb050', core: '#fff6d0', ink: '#3a1004', dur: 0.28, z: 26 }); V.flare(c.tx, c.ty, { n: 16, r: 28, color: '#ff6a1a', h: 1.4, size: 1.2 }); V.burst(c.tx, c.ty, { color: '#ffd070', n: 10, speed: 280, flashR: 70 }); V.shock(c.tx, c.ty, { r: 96, color: '#ff9a5a', dur: 0.35, w: 4 }); shake(2); });
      c.later(0.4, () => { TP.lavaCracks(c.tx, c.ty, { r: 62, dur: 2.4, n: 9, a: 0.7 }); V.smoke(c.tx, c.ty, { n: 4, r: 30, color: '#5a4a48', size: 28, a: 0.35, speed: 30, life: 1.7 }); }); },
    // Glacier Lance: frost crescents at the hand, then a long faceted spear of ice with a frost trail; ice bursts
    // out ahead of it where it lands, shards flung on, and a faint frost streak and mist stay along its path
    // (online-refs pass: FF14 Blizzard IV / WoW Glacial Spike) at the edge a pale-blue crit star flashes where it lands
    lance: c => { const TP = THERM_PAINT, a = Math.atan2(c.ty - c.y, c.tx - c.x), edge = thermEdgeHit(c), dl = Math.hypot(c.tx - c.x, c.ty - c.y) / 1300; TP.handArcs(c.ent, { r: 34, dur: 0.27, color: '#6fb2f0', color2: '#cfeeff' }); if (edge) c.later(dl, () => thermCritStar(c.tx, c.ty, '#9fd8ff'));
      TP.iceSpear(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 16, c.tx, c.ty, { speed: 1300, len: 84, w: 10, onHit: (x, y) => { V.spikeburst(x, y, { r: 68, n: 14, ...ICE, dur: 0.36 }); V.crystals(x, y, { color: '#9fd8ff', n: 6, r: 38, h: 58, dur: 0.9 });
        TP.shards(x, y, { n: 11, angle: a, spread: 0.7, speed: 360, size: 1.15 }); V.shock(x, y, { r: 100, color: '#bfe6ff', dur: 0.42, w: 4.5 }); shake(2); FX.later(0.4, () => TP.steam(x, y, { n: 4, r: 32, size: 26, life: 1.7 })); } }); },
    // Equilibrium: a frost half and a fire half swing together into one ring at the feet, star crosses where they meet,
    // the shield closing over; the ring settles faint and steam rises off it
    equil: c => { const TP = THERM_PAINT; TP.dualRing(c.ent, { r: 70, dur: 1.4 });
      c.later(0.15, () => { V.shield(c.ent, { color: '#e8d8ff', dur: 1.4, r: 40 }); V.shock(c.ent.x, c.ent.y, { r: 110, color: '#f2e6c8', dur: 0.42, w: 3.5 }); });
      c.later(0.55, () => TP.steam(c.ent.x, c.ent.y, { n: 4, r: 30, size: 22, life: 1.5, a: 0.25 })); },
    // the dial turns over: two coloured arcs wheel round the mage and swap sides, then a ring in both colours
    invert: c => { V.charge(c.x, c.y, { color: '#e8d8ff', r: 56, n: 10, dur: 0.25, follow: c.ent });
      V.fx({ dur: 0.7, layer: 'ground', follow: c.ent, draw: (ctx, p, t, e) => { const x = e.follow.x, y = e.follow.y, k = Math.min(1, (1 - p) / 0.4) * e.a, a = easeOut(Math.min(1, p / 0.6)) * Math.PI;
        ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62);
        V.neonPath(ctx, '#ff8a3a', 5, k, () => ctx.arc(0, 0, 52, a - 1.2, a + 1.2));
        V.neonPath(ctx, '#6fb2f0', 5, k, () => ctx.arc(0, 0, 52, a + Math.PI - 1.2, a + Math.PI + 1.2));
        ctx.restore(); } });
      c.later(0.35, () => { V.shock(c.ent.x, c.ent.y, { r: 110, color: '#ff9a5a', dur: 0.5, w: 5 }); V.shock(c.ent.x, c.ent.y, { r: 90, color: '#7ac0f0', dur: 0.5, w: 5, delay: 0.06 }); V.aura(c.ent, { color: '#e8d8ff', dur: 10, r: 28, rate: 0.15 }); }); },
    // Thermocline (talent): a bolt that changes colour in flight, from the side it left to the side it swings toward
    thermocline: c => { V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#ffb08a', speed: 1100, size: 0.9, onHit: (x, y) => { V.spikeburst(x, y, { r: 30, n: 10, ...ICE, dur: 0.26 }); V.flare(x, y, { n: 4, r: 8, color: '#ff8a3a', size: 0.6 }); } });
      V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#7ac0f0', speed: 1050, size: 0.6, arc: 10 }); },
    // Absolute Zero (talent): a frost glyph opens under the boss, a pillar of cold drops, a ring of ice and a hanging mist
    zero: c => { V.ink(c.tx, c.ty, { r: 70, dur: 0.6 }); V.sigil(c.tx, c.ty, { r: 70, style: 'hex', color: '#cfeeff', dur: 0.6, spin: 6 });
      c.later(0.25, () => { V.pillar(c.tx, c.ty, { r: 40, h: 240, color: '#bfe6ff', dur: 0.9 }); V.crystals(c.tx, c.ty, { color: '#d8f2ff', n: 10, r: 60, h: 64, dur: 1.4 }); V.spikeburst(c.tx, c.ty, { r: 70, n: 16, ...ICE, dur: 0.4 }); V.shock(c.tx, c.ty, { r: 140, color: '#cfeeff', dur: 0.6, w: 7 }); shake(4); });
      c.later(0.7, () => V.smoke(c.tx, c.ty, { n: 7, r: 60, color: '#d8e8f0', size: 32, a: 0.3, speed: 20, life: 2.2 })); },
    // Zenith's Sunset (in Equilibrium's place): a low gold sun sinks behind the mage into the dual ring, the shield
    // closing over in sunset colours (the stars it drops on the boss are the kit's 'sunset' moment)
    sunset: c => { const TP = THERM_PAINT; TP.dualRing(c.ent, { r: 66, dur: 1.2 });
      V.fx({ dur: 0.9, layer: 'air', follow: c.ent, draw: (ctx, p, t, e) => { const x = e.follow.x, y = e.follow.y - 34 + easeOut(p) * 30, k = e.a * (1 - p);
        V.glowAt(ctx, x, y, 34, '#ff9a4a', 0.5 * k); V.glowAt(ctx, x, y, 14, '#fff0b0', k); } });
      c.later(0.15, () => { V.shield(c.ent, { color: '#ffd8a8', dur: 1.3, r: 40 }); V.shock(c.ent.x, c.ent.y, { r: 96, color: '#ffb05a', dur: 0.4, w: 3.5 }); }); },
    // Red Giant (Zenith talent): the mage swells with a deep red glow, a slow pulsing halo for as long as it lasts
    redgiant: c => { V.charge(c.x, c.y, { color: '#ff5a3a', r: 60, n: 12, dur: 0.3, follow: c.ent });
      c.later(0.3, () => { V.shock(c.ent.x, c.ent.y, { r: 120, color: '#ff6a3a', dur: 0.55, w: 6 }); V.flash(c.ent.x, c.ent.y - 20, 70, '#ff8a5a', 0.3); V.aura(c.ent, { color: '#ff5a3a', dur: 8, r: 34, rate: 0.12 }); shake(2); }); },
  };

  // (online refs, docs/art/vfx-online-refs/driftblade.md) Driftblade: the cut shows on the body as a thin bright slit that
  // flares across the target and closes (Samurai's Iaijutsu read), not as a ball of light
  const dbSlit = (x, y, a, L, col, o = {}) => V.fx({ dur: o.dur ?? 0.24, delay: o.delay, layer: 'air', draw: (ctx, p, t, e) => {
    const g = Math.min(1, p / 0.18), th = (o.w ?? 4) * (1 - p) * (0.6 + 0.4 * g), k = e.a * (1 - p * p), hl = L * (0.4 + 0.6 * (1 - Math.pow(1 - g, 3)));
    if (k < 0.02 || th < 0.2) return;
    ctx.save(); ctx.translate(x, y - (o.z ?? 24)); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-hl, 0); ctx.quadraticCurveTo(0, -th * 2.2, hl, 0); ctx.quadraticCurveTo(0, th * 2.2, -hl, 0); ctx.fill();
    ctx.globalAlpha = k; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-hl * 0.9, 0); ctx.quadraticCurveTo(0, -th * 0.7, hl * 0.9, 0); ctx.quadraticCurveTo(0, th * 0.7, -hl * 0.9, 0); ctx.fill();
    ctx.restore(); } });
  // the Drift the duellist carries (0-100): your own read off the kit, kept on the entity so the spender (which runs once
  // it is spent) knows what went into it; another hero's falls back to a middling 50
  const dbDrift = (c, spend) => { const g = typeof window !== 'undefined' && window.__game, kit = c.mine && g && g.actor && g.actor.kit, e = c.ent;
    const d = kit && kit.g && typeof kit.g.drift === 'number' ? kit.g.drift : null;
    if (d != null && !(spend && d === 0)) e._dbDrift = d;
    return Math.max(0, Math.min(100, e._dbDrift ?? 50)); };

  ABILITY_VFX.driftblade = {
    // a crescent sabre cut in jade, a sharp white edge, a few sparks
    // (polish) Carve: a glint on the sabre, a crescent of jade wind with a white edge, leaves torn off its tip, a cut star
    // (online refs: Viper's twin fangs, Samurai's Hakaze) pressed over and over, so forehand and backhand alternate; the
    // cut flashes as a slit across the target; the wind grows with your Drift (more leaves, a wider smear) and from 50 a
    // pale ghost arc follows through at the moment the kit's second cut lands
    carve: c => { const e = c.ent, col = windCol(e), f = (e._dbN = ((e._dbN | 0) + 1) % 2) === 1, h = ahead(c, 16), dr = dbDrift(c), w = dr / 100, sd = f ? -1 : 1;
      V.glint(h.x, h.y, { color: '#ffffff', size: 22, z: 24 });
      OLD_PAINT.smear(c.x, c.y, c.ang, { r: 68, span: 2.1, w: 12 + 6 * w, color: col, core: '#ffffff', ink: DRIFT_PAINT.INK, dur: 0.24, flip: f, lines: w >= 0.5 ? 3 : 2 });
      c.later(0.08, () => { V.hit(c.tx, c.ty, '#e8fff8', 0.5); dbSlit(c.tx, c.ty, c.ang + Math.PI / 2 + sd * 0.55, 34 + 10 * w, col, { w: 3.5 + 1.5 * w });
        V.spikeburst(c.tx, c.ty, { r: 22, n: 6, color: col, core: '#ffffff', ink: DRIFT_PAINT.INK, dur: 0.2, z: 18 }); V.sparks(c.tx, c.ty, { color: '#e8fff8', n: 3, angle: c.ang + sd * Math.PI / 2, spread: 0.5, speed: 240 });
        DRIFT_PAINT.leaves(c.tx, c.ty, { n: 1 + Math.round(3 * w), angle: c.ang + sd * Math.PI / 2, speed: 160 }); });
      if (dr >= 50) c.later(0.15, () => { OLD_PAINT.smear(c.x, c.y, c.ang + sd * 0.25, { r: 84, span: 1.8, w: 6, color: '#e8fff8', core: '#ffffff', ink: DRIFT_PAINT.INK, dur: 0.2, flip: !f, lines: 1 });
        dbSlit(c.tx, c.ty, c.ang + Math.PI / 2 - sd * 0.55, 30, '#e8fff8', { w: 2.5, dur: 0.2, delay: 0.05 }); }); },
    // a burst of wind at the start, a ribbon along the dash, and the lane left glowing on the floor for 6s
    // (polish) the push-off: a kick of wind streaks and leaves thrown back the way you left, a scuff of dust, a ring
    slip: c => { const col = windCol(c.ent), sx = c.x, sy = c.y; V.smoke(sx, sy, { n: 4, color: '#d8e8e0', size: 18, a: 0.5, speed: 60 }); V.shock(sx, sy, { r: 44, color: col, dur: 0.3, w: 3.5 });
      DRIFT_PAINT.streaks(sx, sy, c.ang, { n: 3, back: 70, on: 20, w: 6, gap: 10, color: col, dur: 0.3, stay: 0.4, leaves: 2 }); DRIFT_PAINT.leaves(sx, sy, { n: 4, angle: c.ang + Math.PI, speed: 140 });
      c.later(0.22, () => {
        const ex = c.ent.x, ey = c.ent.y;
        if (Math.hypot(ex - sx, ey - sy) < 20) return;
        const lane = { ax: sx, ay: sy, bx: ex, by: ey, end: FX.now + 6 };
        WIND_LANES.push(lane);
        ribbon(line2(sx, sy, ex, ey, 12, 10), { color: col, w: 3, dur: 0.6 }); ribbon(line2(sx, sy, ex, ey, 12, -10), { color: '#ffffff', w: 1.5, dur: 0.5 });
        const dx = ex - sx, dy = ey - sy, L = Math.hypot(dx, dy);
        V.fx({ dur: 6, layer: 'ground', draw: (ctx, p, t, e) => {
          const k = Math.min(1, p / 0.04, (1 - p) / 0.15) * e.a;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(dy, dx));
          ctx.globalAlpha = 0.12 * k; ctx.fillStyle = col; ctx.fillRect(0, -16, L, 32); ctx.globalAlpha = 1;
          for (let i = 0; i < 6; i++) { const q = ((t * 0.9 + i / 6) % 1), x = q * L, y = (i % 3 - 1) * 9;
            V.neonPath(ctx, col, 1.6, k * Math.sin(q * Math.PI) * 0.8, () => { ctx.moveTo(x, y); ctx.lineTo(Math.min(L, x + 26), y); }); }
          ctx.restore();
        } });
      }); },
    // a swing round the target: a curved ribbon from where you were to its far side, a cut as you pass
    // (painted pass, driftblade.png) Hook Turn: a curl of wind gathers on the blade, then a great sickle of wind swings
    // round the target from where you were to its far side (thick at its leading edge), a cut as you pass, a faint arc stays
    hook: c => { const DP = DRIFT_PAINT, col = windCol(c.ent), a0 = Math.atan2(c.y - c.ty, c.x - c.tx), r = Math.max(40, Math.hypot(c.x - c.tx, c.y - c.ty));
      DP.windStrip(DP.arcPts(c.x, c.y, 34, c.ang + 2.2, -2.6, 10, 0.7), { w: 6.5, color: col, dur: 0.26, z: 20 });
      DP.windStrip(DP.arcPts(c.x, c.y, 26, c.ang + 1.6, -2.2, 10, 0.7), { w: 3.5, color: DP.WHITE, dur: 0.22, z: 24 });
      DP.hookArc(c.tx, c.ty, r, a0, Math.PI, { color: col, w: 13, dur: 0.52, stay: 1.3 });
      c.later(0.1, () => { V.slash(c.tx, c.ty + 10, a0 + Math.PI / 2, { r: 68, span: 2, color: '#e8fff8', w: 0.45, dur: 0.26 }); V.hit(c.tx, c.ty, col, 0.95); }); },
    // Crosswind: two loops of wind cross round the blade, the crescent flies, and on the target it opens into an X of
    // long wind blades through it, leaves and grit flung off; the X stays a moment, faint, on the floor
    // (online refs: Midare Setsugekka, Wind Cut) the spender grows with what it spent: the X's reach, its streaks, the
    // burst and the shake scale with the Drift (yours as last read; another hero's a middling 50), and two slits cross on the body
    cross: c => { const DP = DRIFT_PAINT, col = windCol(c.ent), aim = Math.atan2(c.ty - c.y, c.tx - c.x), sp = dbDrift(c, true), q = 0.55 + 0.45 * sp / 100;
      for (const s of [-1, 1]) DP.windStrip(Array.from({ length: 17 }, (_, i) => { const a = c.ang + i / 16 * 5.4; return [c.x + Math.cos(a) * 44 * Math.cos(s * 0.7) - Math.sin(a) * 18 * Math.sin(s * 0.7), c.y + Math.cos(a) * 44 * Math.sin(s * 0.7) * 0.62 + Math.sin(a) * 18 * Math.cos(s * 0.7)]; }), { w: 5, color: s > 0 ? col : '#e8fff8', dur: 0.34, z: 20 });
      c.later(0.08, () => V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: col, speed: 1300, size: 1.6, onHit: (x, y) => {
        for (const s of [-1, 1]) { DP.streaks(x, y, aim + s * 0.7, { n: sp >= 70 ? 3 : 2, back: 130 * q, on: 130 * q, w: 9.5 * q, gap: 9, color: col, dur: 0.44, stay: 1.4, leaves: sp >= 50 ? 2 : 1 }); dbSlit(x, y, aim + s * 0.7, 46 * q, col, { w: 5 * q, dur: 0.3 }); }
        V.spikeburst(x, y, { r: 64 * q, n: Math.round(14 * q), color: col, core: '#ffffff', ink: '#0a2a24', dur: 0.32 }); shake(1 + 3 * q * q);
        FX.later(0.3, () => V.smoke(x, y, { n: 3, r: 30, color: '#c8d0c0', size: 22, a: 0.3, speed: 40, life: 1.3 })); } })); },
    // Stillpoint: the blade held flat across (a glint and the parry face), four little whirls round you bound by a ring seal,
    // a shaft of pale light down the middle; the seal goes faint and holds while it lasts
    still: c => { const DP = DRIFT_PAINT, col = windCol(c.ent), fx = c.x + Math.cos(c.ang) * 26, fy = c.y + Math.sin(c.ang) * 26; V.glint(fx, fy, { color: '#ffffff', size: 26 }); V.shield(c.ent, { shape: 'front', color: '#e8fff8', dur: 2, r: 38 });
      DP.stillSeal(c.ent, { r: 70, dur: 2, color: col });
      c.later(0.12, () => { V.pillar(c.ent.x, c.ent.y, { r: 16, h: 185, color: '#d8fff0', dur: 0.5 }); V.shock(c.ent.x, c.ent.y, { r: 96, color: col, dur: 0.38, w: 3.5 }); DP.leaves(c.ent.x, c.ent.y, { n: 6, orbit: 64, dr: 10, follow: c.ent }); }); },
    // a gust spirals up round the duellist, streaks shoot out, and the wind aura stays on
    gale: c => { const col = windCol(c.ent); V.charge(c.x, c.y, { color: col, r: 60, n: 10, dur: 0.25, follow: c.ent }); V.tornado(c.x, c.y, { color: '#e8fff8', h: 120, r: 36, dur: 0.9 });
      c.later(0.2, () => { V.shock(c.x, c.y, { r: 140, color: col, dur: 0.5, w: 6 }); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; ribbon(line2(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 12, c.x + Math.cos(a) * 120, c.y + Math.sin(a) * 74, 6, 12), { color: col, w: 2, dur: 0.6 }); } });
      V.aura(c.ent, { color: col, dur: 12, r: 28, rate: 0.25 }); },
    // Comet's Impact: a gold glyph, a straight streak through the target, a burst, sparks thrown forward
    impact: c => { const a = Math.atan2(c.ty - c.y, c.tx - c.x), ex = c.tx + Math.cos(a) * 120, ey = c.ty + Math.sin(a) * 120; V.sigil(c.x, c.y, { r: 30, style: 'star4', color: '#ffd08a', dur: 0.3, spin: 6 });
      V.beam(c.x, c.y, ex, ey, { color: '#ffd08a', w: 12, dur: 0.4 }); c.later(0.06, () => { V.spikeburst(c.tx, c.ty, { r: 64, n: 14, color: '#ffb84a', core: '#fff6d0', ink: '#3a2404', dur: 0.36 }); V.sparks(c.tx, c.ty, { color: '#ffe0a0', n: 14, angle: a, spread: 0.6, speed: 520 }); shake(4); });
      c.later(0.3, () => ribbon(line2(c.x, c.y, ex, ey, 10, 0), { color: '#ffd08a', w: 2, dur: 1, wob: 5 })); },
    // Gyre (talent): a full loop of ribbon round the target, a cut at each quarter
    // (polish) the loop itself and a gust off the blade; the cuts are KIT_VFX.gyre (the kit sends how many: 1-4)
    gyre: c => { const col = windCol(c.ent), r = 70; ribbon(loop(c.tx, c.ty, r, 0, Math.PI * 2, 28), { color: col, w: 3, dur: 0.8 });
      DRIFT_PAINT.windStrip(DRIFT_PAINT.arcPts(c.x, c.y, 30, c.ang + 2, -2.4, 10, 0.7), { w: 5, color: col, dur: 0.24, z: 20 }); DRIFT_PAINT.leaves(c.tx, c.ty, { n: 4, orbit: r, dr: 20 }); },
    // Tailspin (talent): three blade arcs whirling in place, a wind ring, then the spring away leaves a ribbon
    tailspin: c => { const col = windCol(c.ent); for (let i = 0; i < 3; i++) c.later(i * 0.2, () => V.slash(c.ent.x, c.ent.y, c.ang + i * 2.1, { r: 60, span: 2.6, color: i % 2 ? '#e8fff8' : col, w: 0.45, dur: 0.24 }));
      V.swirl(c.x, c.y, { r: 56, color: col, dur: 0.8, arms: 3, follow: c.ent }); },
  };

  // class moments sent from the kits (k.fx): Thermal Shock and its cousins, Passing Strikes and the wind's tricks
  Object.assign(KIT_VFX, {
    // the payoff: both colours collapse onto the target, then a burst in the colour it swung to, sized by the swing,
    // with a ring of the other colour shattering round it, and steam and a crack left behind
    shock: Object.assign((e, target, d) => {
      const t = target || { x: e.x + Math.cos(e.angle || 0) * 120, y: e.y + Math.sin(e.angle || 0) * 120 };
      const s = Math.max(3, Math.min(12, (d && d.s) || 5)), to = d && d.c < 0 ? ICE : FIRE, other = to === ICE ? FIRE : ICE, echo = d && d.echo;
      const R = ((echo ? 24 : 34) + s * (echo ? 3 : 8)) * (echo ? 1.1 : 1.2), TP = THERM_PAINT;   // (scale-up pass) x1.2
      // (painted pass) wind-up: fire and frost spiral in together with a breath of steam
      TP.swirl2(t.x, t.y, { r: R * 1.4, dur: 0.17 });
      // (online-refs pass: the crossing is the signature beat, FF14 Paradox) a fire crescent and a frost crescent slam
      // together over the target, the side it swung to arriving on top, the instant before the burst
      V.fx({ dur: 0.2, layer: 'air', draw: (c, p, tt, fx) => { const q = Math.min(1, p / 0.75), sl = 1 - q * q, k = fx.a * Math.min(1, p / 0.15) * (1 - Math.max(0, (p - 0.8) / 0.2)), cy = t.y - 34, rr = 18 + R * 0.35, off = rr * 0.3 + R * 1.3 * sl;
        const arcs = [[FIRE, -1], [ICE, 1]].sort(a => (a[0] === to ? 1 : -1));
        for (const [el, sd] of arcs) { const cx = t.x + sd * off, a0 = sd < 0 ? Math.PI : 0;
          V.neonPath(c, el.color, 5 + s * 0.3, k, () => c.arc(cx, cy, rr, a0 - 1.15, a0 + 1.15));
          V.neonPath(c, el.core, 1.6, k, () => c.arc(cx, cy, rr * 0.86, a0 - 0.9, a0 + 0.9)); }
        if (q >= 1) V.glowAt(c, t.x, cy, rr, '#ffffff', 0.7 * k); } });
      V.fx({ dur: 0.16, layer: 'ground', draw: (c, p, tt, fx) => { V.neonRing(c, t.x, t.y, R * 1.3 * (1 - p), to.color, 3, fx.a * p, 0.7); V.neonRing(c, t.x, t.y, R * 1.1 * (1 - p), other.color, 3, fx.a * p, 0.7); } });
      if (!echo) TP.steam(t.x, t.y, { n: 3, r: R * 0.8, size: 20, life: 0.8, a: 0.3 });
      FX.later(0.15, () => {
        V.spikeburst(t.x, t.y, { r: R, n: 12 + Math.round(s), ...to, core: to === ICE ? '#bfe8ff' : '#ffd890', dur: 0.34 + s * 0.02 });
        V.spikeburst(t.x, t.y, { r: R * 1.35, n: 16, hole: 0.7, ...other, dur: 0.4, layer: 'ground', z: 0, flat: 0.7 });
        // (QA) the flash kept small and in the element's colour: with the starburst's white core a big white flash
        // whited out the boss on a large Shock
        V.burst(t.x, t.y, { color: to.core, color2: other.color, n: 6 + s, speed: 160 + s * 25, flash: false });
        V.flash(t.x, t.y - 10, R * 0.55, to.color, 0.18);
        V.shock(t.x, t.y, { r: R * 2, color: to.color, dur: 0.5, w: 4 + s * 0.5 });
        if (to === ICE) V.crystals(t.x, t.y, { color: '#bfe6ff', n: 4 + Math.round(s / 2), r: R * 0.7, h: 30 + s * 4, dur: 1 }); else V.flare(t.x, t.y, { n: 6 + s, r: 14 + s, color: '#ff6a1a' });
        // both elements break out of it whichever way it swung: shards of ice and embers, rocks for a big one
        TP.shards(t.x, t.y, { n: Math.min(12, 3 + Math.round(s / 2)), speed: 180 + s * 15 });
        if (to === ICE) V.flare(t.x, t.y, { n: 3 + Math.round(s / 3), r: 10 + s, color: '#ff8a3a', size: 0.7 });
        if (!echo && s >= 6) V.debris(t.x, t.y, { n: Math.min(8, s - 2), hot: to === FIRE, color: '#4a3a32', speed: 0.8 });
        if (!echo) { shake(2 + s * 0.5); FX.text(t.x, t.y - 70, s >= 8 ? 'Thermal Shock!' : 'Shock', to.core, 11 + Math.min(8, s), 0.9); }
      });
      // aftermath: steam rolling off, frost at the rim and the heat cooling in cracks
      if (!echo) FX.later(0.5, () => { V.smoke(t.x, t.y, { n: 3 + Math.round(s / 2), r: R * 0.6, color: '#e0e4e8', size: 22 + s * 2, a: 0.3, speed: 25, life: 2 });
        if (s >= 6) { TP.lavaCracks(t.x, t.y, { r: R * 0.8, dur: 2.2, a: 0.5, color: to === FIRE ? '#ff6a1a' : '#ff8a4a' }); TP.frostRim(t.x, t.y, { r: R * 0.9, dur: 2.2, a: 0.3, n: 12 }); } });
    }, { atTarget: true }),
    // Ember Store (talent): banked embers fly from the mage into the target after a Shock
    embers: Object.assign((e, target, d) => { if (!target) return; for (let i = 0; i < ((d && d.n) || 1); i++) FX.later(i * 0.08, () => V.missile(e.x, e.y, target.x, target.y, { style: 'fire', color: '#ff8a3a', speed: 800, size: 0.6, arc: 30 + i * 12, onHit: (x, y) => V.hit(x, y, '#ffb050', 0.5) })); }, { atTarget: true }),
    // Zenith's Corona: a spark lights over the mage's brow in the element's colour, one more for each held (a full three ring out)
    corona: (e, target, d) => { const n = Math.max(1, Math.min(5, (d && d.n) || 1)), ice = d && d.el < 0, col = ice ? '#cfeeff' : n >= 4 ? '#ff7a4a' : '#ffd27a';
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5; V.glint(e.x + Math.cos(a) * 16, e.y - 30 + Math.sin(a) * 10, { color: col, size: i === n - 1 ? 18 : 10 }); }
      if (n >= 3) V.shock(e.x, e.y, { r: 60, color: col, dur: 0.3, w: 2.5 }); },
    // Sunset: every Corona falls on the boss as a star, one after another (kits.js thermSunset deals them 0.2s on, 0.12s apart)
    sunset: Object.assign((e, target, d) => { if (!target) return; const n = Math.max(1, Math.min(5, (d && d.n) || 1));
      for (let i = 0; i < n; i++) FX.later(0.08 + 0.12 * i, () => { const x = target.x + (i - (n - 1) / 2) * 16, y = target.y + (i % 2 ? 6 : -4);
        V.lightfall(x, y, { color: i >= 3 ? '#ff7a4a' : '#ffd27a', r: 22, h: 260, dur: 0.5, feathers: 0 });
        FX.later(0.12, () => { V.spikeburst(x, y, { r: 34, n: 9, ...FIRE, dur: 0.26 }); V.hit(x, y, '#ffe0a0', 0.6); if (i === n - 1) shake(1 + n * 0.5); }); });
    }, { atTarget: true }),
    // Latent Charge (talent): an overload banked instead of burned: a pale bead sinking into the mage
    latent: e => { V.swirl(e.x, e.y, { r: 36, color: '#e8d8ff', dur: 0.5, inward: true, follow: e }); V.flash(e.x, e.y - 20, 30, '#e8d8ff', 0.3); },
    frostbite: e => { V.crystals(e.x, e.y, { color: '#bfe6ff', n: 6, r: 24, h: 30, dur: 1 }); V.shock(e.x, e.y, { r: 70, color: '#9ad8ff', dur: 0.4 }); },
    // (online-refs pass) Overheat, sent only by the Thermist and the Pyromancer kits: the mage boils over in an orange
    // flare and grey smoke with a small amber ring, instead of a red ring at its feet that could pass for a telegraph
    overheat: e => { V.flare(e.x, e.y, { n: 16, color: '#ff7a1a', r: 16 }); V.smoke(e.x, e.y, { n: 3, r: 14, color: '#5a5050', size: 24, a: 0.45, speed: 50, life: 1.1 }); V.shock(e.x, e.y, { r: 56, color: '#ffa040', dur: 0.35, w: 3 }); V.glint(e.x, e.y, { color: '#ffd070', size: 26, z: 30 }); },
    // Twin Spell (talent): a smaller copy of the edge spell follows the first
    twin: Object.assign((e, target, d) => { if (!target) return; const ice = d && d.el < 0; V.missile(e.x, e.y, target.x, target.y, { style: ice ? 'helix' : 'fire', color: ice ? '#9fd8ff' : '#ff9a3a', speed: 1000, size: 0.7, onHit: (x, y) => V.spikeburst(x, y, { r: 30, n: 9, ...(ice ? ICE : FIRE), dur: 0.26 }) }); }, { atTarget: true }),
    invert: e => { V.shock(e.x, e.y, { r: 80, color: '#ff9a5a', dur: 0.4, w: 4 }); V.shock(e.x, e.y, { r: 64, color: '#7ac0f0', dur: 0.4, w: 4, delay: 0.05 }); },
    // a Passing Strike: a straight white cut through the body of the enemy, along the way you were running
    pass: Object.assign((e, target, d) => {
      // (painted pass) long streaks of wind through the body along the way you ran, leaves flung ahead, faint scuffs left
      const col = windCol(e), a = e.angle || 0, t = target || e, gale = d && d.g;
      DRIFT_PAINT.streaks(t.x, t.y, a, { n: gale ? 4 : 3, back: 105, on: 130, w: gale ? 8.5 : 6.5, gap: 11, color: gale ? '#ffffff' : col, dur: 0.36, stay: 0.9, leaves: gale ? 3 : 2 });
      V.hit(t.x, t.y, col, gale ? 1 : 0.6); if (gale) shake(2);
    }, { atTarget: true }),
    lane: e => { V.shock(e.x, e.y, { r: 30, color: windCol(e), dur: 0.25, w: 2 }); },
    // Gyre (kits.js k.fx('gyre', { n })): one cut round the target for every 25 Drift, 0.12s apart as the kit deals
    // them, each from a quarter further round the loop; the more cuts, the bigger the last one and the burst after it
    gyre: Object.assign((e, target, d) => { const t = target || e, n = Math.max(1, Math.min(4, (d && d.n) | 0 || 1)), col = windCol(e), a0 = Math.atan2(e.y - t.y, e.x - t.x);
      for (let i = 0; i < n; i++) OLD_PAINT.later(0.12 * i, () => { const a = a0 + (i + 1) * Math.PI / 2, last = i === n - 1;
        V.slash(t.x - Math.cos(a) * 26, t.y - Math.sin(a) * 18 + 10, a + Math.PI / 2, { r: last ? 62 : 50, span: 1.5, color: i % 2 ? '#e8fff8' : col, w: 0.4, dur: 0.22, sparks: 3 });
        OLD_PAINT.smear(t.x - Math.cos(a) * 26, t.y - Math.sin(a) * 18 + 10, a + Math.PI / 2, { r: last ? 70 : 56, span: 1.6, w: last ? 14 : 10, color: col, core: '#ffffff', ink: DRIFT_PAINT.INK, dur: 0.22, lines: 2 });
        V.hit(t.x, t.y, col, 0.45 + 0.15 * i);
        if (last) { V.spikeburst(t.x, t.y, { r: 30 + 12 * n, n: 8 + 2 * n, color: col, core: '#ffffff', ink: DRIFT_PAINT.INK, dur: 0.3, z: 18 }); DRIFT_PAINT.leaves(t.x, t.y, { n: 2 + n, speed: 180 }); if (n >= 3) shake(2 + n * 0.5); } }); }, { atTarget: true }),
    orbitcut: Object.assign((e, target) => { const t = target || e; V.slash(t.x, t.y + 10, Math.random() * 6.28, { r: 46, span: 1.6, color: '#a8f0c8', w: 0.35, dur: 0.2 }); }, { atTarget: true }),
    // (online refs: a Kaeshi echo) a wide pale smear swung the other way and a slit across the body
    crescent: Object.assign((e, target) => { const t = target || e, a = Math.atan2(t.y - e.y, t.x - e.x); V.slash(e.x, e.y, a, { r: 80, span: 2.8, color: windCol(e), w: 0.55, dur: 0.3, sparks: 5 });
      OLD_PAINT.smear(e.x, e.y, a, { r: 88, span: 2.6, w: 10, color: windCol(e), core: '#ffffff', ink: DRIFT_PAINT.INK, dur: 0.26, flip: true, lines: 2 }); OLD_PAINT.later(0.08, () => dbSlit(t.x, t.y, a + Math.PI / 2, 44, windCol(e), { w: 4 })); }, { atTarget: true }),
    afterimage: Object.assign((e, target) => { const t = target || e; V.slash(t.x, t.y + 10, (e.angle || 0) + Math.PI, { r: 54, span: 1.8, color: '#d8e8e0', w: 0.4, dur: 0.3 }); V.smoke(t.x, t.y, { n: 2, color: '#c8d8d0', size: 18, a: 0.35, speed: 20 }); }, { atTarget: true }),
    riposte: Object.assign((e, target) => { const t = target || e; V.glint(e.x + Math.cos(e.angle || 0) * 26, e.y + Math.sin(e.angle || 0) * 26, { color: '#ffffff', size: 30 }); FX.later(0.06, () => { V.slash(t.x, t.y + 10, (e.angle || 0), { r: 60, span: 1.2, color: '#ffffff', w: 0.5, dur: 0.24, sparks: 8 }); V.hit(t.x, t.y, '#e8fff8', 1); shake(3); }); }, { atTarget: true }),
    galeforce: Object.assign((e, target) => { if (target) V.missile(e.x, e.y, target.x, target.y, { style: 'blade', color: windCol(e), speed: 1200, size: 1.2, onHit: (x, y) => V.tornado(x, y, { color: '#e8fff8', h: 60, r: 20, dur: 0.6 }) }); }, { atTarget: true }),
  });

  // autos: the Thermist's alternate fire and frost sparks; the Driftblade's quick sabre flick
  Object.assign(AUTO_VFX, {
    thermo: c => { const ice = c.alt; V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'orb', color: ice ? '#8fd0ff' : '#ff9a4a', speed: 950, size: 0.5, onHit: (x, y) => V.hit(x, y, ice ? '#cfeeff' : '#ffc080', 0.35) }); },
    // (shared-fx polish: an impact where the flick connects, a small glint and a breath of wind)
    sabre: c => { const col = windCol(c.ent); V.slash(c.ent.x, c.ent.y, c.ang, { r: 50, span: 1.5, color: col, dur: 0.2, w: 0.3, flip: c.alt, sparks: 2 });
      c.later(0.07, () => { const d = Math.min(62, Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y)), x = c.ent.x + Math.cos(c.ang) * d, y = c.ent.y + Math.sin(c.ang) * d;
        V.hit(x, y, '#e8fff8', 0.38); V.spawn({ x, y, z: 16, vx: Math.cos(c.ang) * 220, vy: Math.sin(c.ang) * 150, drag: 0.12, life: 0.2, size: 9, size1: 2, color: col, kind: 'soft', stretch: 6, a: 0.8 }); }); },
  });
})();
// ======================================================================= Gorgemaw, Oathbroker (tanks-2)
// Gorgemaw: eating is the show. A telegraph that lands in an open jaw doesn't go off: the whole shape is sucked into
// the mouth (shrinking toward it, its colour streaming in), the jaw snaps shut on it with a chomp of teeth and crumbs,
// and the morsel's colour glows in the belly. Spat back, each shape keeps its look (Ring a lobbed glob that lands as a
// ring, Lance a straight bolt, Fang a cone of teeth, Spike a great yellow spike); a Glutton's Fusion is twice the size.
// Oathbroker: grey vellum and lilac seal-wax. Its hits are stamps; a bill coming due is a red seal pressed at its feet,
// Settle a gold one, Default the book torn and the pages flung out.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const MCOL = m => (MAW.COLOR[m] || '#ff9a3a');
  const mouth = e => ({ x: e.x + Math.cos(e.angle || 0) * 12, y: e.y + Math.sin(e.angle || 0) * 6, z: 30 });
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  // the jaw: two rows of teeth snapping together at (x, y - z), size s
  const chomp = (x, y, z, s, col, dur = 0.28) => V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
    const close = p < 0.45 ? 1 - p / 0.45 : 0, k = (p < 0.7 ? 1 : (1 - p) / 0.3) * e.a, gap = 4 + close * 16 * s, yy = y - z;
    c.save(); c.translate(x, yy);
    for (const dir of [-1, 1]) {
      c.globalAlpha = k; c.fillStyle = '#fff4e0'; c.strokeStyle = '#2a1408'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-14 * s, dir * gap);
      for (let i = 0; i <= 6; i++) { const tx = -14 * s + i * 28 * s / 6; c.lineTo(tx, dir * gap); if (i < 6) c.lineTo(tx + 14 * s / 6, dir * (gap - 7 * s)); }
      c.lineTo(14 * s, dir * (gap + 4 * s)); c.lineTo(-14 * s, dir * (gap + 4 * s)); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
    if (p > 0.4 && p < 0.6) V.glowAt(c, x, yy, 26 * s, col, 0.6 * e.a);
  } });
  const crumbs = (x, y, z, col, n = 8) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(60, 180);
    V.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(40, 160), g: 500, bounce: true, life: rand(0.4, 0.8), size: rand(4, 7), color: i % 3 ? col : '#ffe8c8', kind: 'shard', add: false, vr: rand(-12, 12) }); } };
  // a telegraph's shape pulled into the mouth: it shrinks toward the mouth, stretching, its colour pouring in
  const swallowShape = (shape, e, col, dur = 0.38) => {
    if (!shape) return;
    const s = Object.assign({}, shape);
    V.fx({ dur, layer: 'ground', draw: (c, p, t, fx) => {
      const m = mouth(e), q = p * p, k = (1 - p * 0.6) * fx.a;
      c.save(); c.translate(m.x, m.y); c.scale(1 - q, 1 - q); c.translate(-m.x, -m.y);
      SHAPES.trace(c, s); c.globalAlpha = 0.35 * k; c.fillStyle = col; c.fill();
      c.globalAlpha = k; c.strokeStyle = col; c.lineWidth = 3 / Math.max(0.2, 1 - q); c.stroke();
      c.restore();
    } });
    // streams of its colour flowing into the jaw from round the shape's edge
    const cx = s.x, cy = s.y, R = Math.min(260, s.r || s.len || 120);
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, d = R * rand(0.4, 1);
      FX.later(rand(0, 0.18), () => { const m = mouth(e), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
        V.spawn({ x, y, z: 4, vx: (m.x - x) * 3.2, vy: (m.y - y) * 3.2, vz: m.z * 1.5, life: 0.3, size: rand(5, 8), size1: 2, color: i % 2 ? col : '#ffffff', stretch: i % 3 ? 2 : 0 }); }); }
  };
  const gulp = (e, m, big) => {
    const col = MCOL(m);
    FX.later(0.3, () => { const q = mouth(e); chomp(q.x, q.y, q.z, big ? 1.5 : 1.1, col); FX.later(0.12, () => { crumbs(q.x, q.y, q.z, col, big ? 12 : 7); V.shock(e.x, e.y, { r: big ? 70 : 46, color: col, dur: 0.3, w: 4 });
      V.flash(e.x, e.y - 24, 30, col, 0.25); if (big) shake(3); }); });
    // the belly glows with what went down
    FX.later(0.5, () => V.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, fx) => V.glowAt(c, e.x, e.y - 14, 22, col, (1 - p) * 0.7 * fx.a) }));
  };

  ABILITY_VFX.gorgemaw = {
    // (Gnash, Open Wide, and KIT_VFX.spit / digest: VFX PASS · GORGEMAW, after the Ultimates)
    spit: () => {},          // the morsel flying is KIT_VFX.spit (it knows the shape)
    // (polish) the gut heaves (a swell of orange at the belly), the jaw gapes and a spew of bile, crumbs and steam goes
    // up at the boss in a cone, a ring off the feet; each Morsel itself is KIT_VFX.spit
    regurgitate: c => { const e = c.ent, a = Math.atan2(c.ty - c.y, c.tx - c.x); if (e.st) e.st.jawUntil = FX.now + 0.9;
      V.fx({ dur: 0.3, layer: 'air', draw: (cc, p, t, fx) => { V.glowAt(cc, e.x, e.y - 14, 16 + 16 * p, '#ffb070', Math.sin(p * Math.PI) * 0.85 * fx.a); } });
      c.later(0.18, () => { const q = mouth(e), L = Math.min(150, Math.max(90, Math.hypot(c.tx - c.x, c.ty - c.y) * 0.8));
        V.fx({ dur: 0.38, layer: 'air', draw: (cc, p, t, fx) => { const k = fx.a * (1 - p), len = L * easeOut(Math.min(1, p / 0.35)), y0 = q.y - q.z;
          cc.save(); cc.translate(q.x, y0); cc.rotate(a); cc.globalCompositeOperation = 'lighter';
          const g = cc.createLinearGradient(0, 0, len, 0); g.addColorStop(0, `rgba(255,230,170,${0.95 * k})`); g.addColorStop(0.6, `rgba(255,150,70,${0.7 * k})`); g.addColorStop(1, 'rgba(216,224,96,0)');
          cc.fillStyle = g; cc.beginPath(); cc.moveTo(0, -5); cc.quadraticCurveTo(len * 0.6, -len * 0.32, len, -len * 0.22); cc.quadraticCurveTo(len * 1.05, 0, len, len * 0.22); cc.quadraticCurveTo(len * 0.6, len * 0.32, 0, 5); cc.closePath(); cc.fill();
          cc.restore(); } });
        for (let i = 0; i < 18; i++) { const s = rand(-0.32, 0.32), sp = rand(300, 520); V.spawn({ x: q.x, y: q.y, z: q.z, vx: Math.cos(a + s) * sp, vy: Math.sin(a + s) * sp * 0.7, vz: rand(40, 140), g: 600, drag: 0.03, life: rand(0.35, 0.6), size: rand(6, 11), color: i % 3 ? '#ffb070' : '#d8e060', kind: 'drop', add: false, rot: a }); }
        crumbs(q.x, q.y, q.z, '#ffb070', 8); V.smoke(q.x + Math.cos(a) * 40, q.y + Math.sin(a) * 30, { n: 4, color: '#c8b080', size: 22, a: 0.4, speed: 60, life: 1 });
        V.shock(c.x, c.y, { r: 80, color: '#ffb070', dur: 0.35, w: 5 }); shake(3); }); },
    digest: () => {},        // KIT_VFX.digest (it knows what was eaten)
    // bronze plates over the gut: a hex shield, sparks, a heavy stamp of dust
    // (polish) and for the Clench's 8s a faint ring of bronze plates stays round the gut, riveted, a glint running round
    // (vfx2, after Fortifying Brew: armour closing in) the gut clenches (a quick inward squeeze), the bronze plates fly in from
    // outside and stop with a clank at 0.18s (the hex shield, sparks, dust), then stay as the faint ring
    iron: c => { const e = c.ent; V.swirl(c.x, c.y, { r: 60, color: '#d89a5a', dur: 0.2, inward: true, follow: e });
      FX.later(0.18, () => { V.shield(e, { shape: 'hex', color: '#d89a5a', dur: 0.9, r: 42 }); V.sparks(e.x, e.y - 10, { color: '#ffd090', n: 10, speed: 260 }); V.smoke(e.x, e.y, { n: 4, color: '#a08a70', size: 22, a: 0.5, speed: 50 }); shake(3);
        V.shock(e.x, e.y, { r: 80, color: '#d89a5a', dur: 0.4, w: 5 }); });
      OLD_PAINT.linger(8, 'air', (cc, k, t) => { const x = e.x, y = e.y - 16, R = 30 + 36 * (1 - easeOut(Math.min(1, t / 0.18)));
        for (let i = 0; i < 8; i++) { const a0 = i * Math.PI / 4 + 0.08, a1 = a0 + Math.PI / 4 - 0.16, front = Math.sin((a0 + a1) / 2) > -0.2;
          V.neonPath(cc, front ? '#d89a5a' : '#8a5a30', 2.6, k * (front ? 1 : 0.5), () => cc.ellipse(x, y, R, R * 0.42, 0, a0, a1)); }
        const g = t * 1.8; V.glowAt(cc, x + Math.cos(g) * R, y + Math.sin(g) * R * 0.42, 7, '#ffe0b0', 0.8 * k); }, { peak: 1, settle: 0.5, hold: 0.6 }); },
    // Stone Belly: grey stone crusts over it, chips falling
    stonebelly: c => { V.crystals(c.x, c.y, { color: '#b8b0a4', n: 8, r: 34, h: 40, dur: 1.2 }); V.shield(c.ent, { shape: 'hex', color: '#c8c0b0', dur: 2, r: 44 }); V.debris(c.x, c.y, { n: 6, color: '#8a8278' }); shake(3); },
    // Bottomless: the room is pulled toward the jaw: a great inward vortex, the floor's dust streaming in
    bottomless: c => { const e = c.ent; if (e.st) { e.st.jawUntil = FX.now + 4; e.st.jawAll = FX.now + 4; } V.ink(c.x, c.y, { r: 170, dur: 4, follow: e, a: 0.25 }); V.vortex(c.x, c.y, { r: 170, color: '#ff8a3a', dur: 4, follow: e });
      V.fx({ dur: 4, layer: 'ground', tick: () => { for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, d = rand(150, 320), x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.7;
        V.spawn({ x, y, z: 2, vx: (e.x - x) * 2.2, vy: (e.y - y) * 2.2, vz: 30, life: 0.45, size: rand(8, 12), size1: 2, color: i ? '#ffd0a0' : '#c87a4a', stretch: 3 }); } }, draw: () => {} });
      V.shock(c.x, c.y, { r: 200, color: '#ffb070', dur: 0.6, w: 7 }); shake(5); },
  };

  // Oathbroker: ink, vellum, seal-wax
  const INK = '#2a2034', WAX = '#c04a5a', LIL = '#b8a8e0', GOLD = '#ffd27a';
  // a seal pressed into the floor: a disc of wax, the stamp's rim and a cross in it
  const seal = (x, y, r, col, dur = 1.2) => V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
    const k = Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.4) * e.a, s = p < 0.08 ? 1.4 - p * 5 : 1, wax = col === WAX;
    c.save(); c.translate(x, y); c.scale(s, s * 0.7);
    // (vfx2, readability) red wax on the floor is a faint dark wine carried by a gold rim, never a bright red disc that reads as a telegraph
    c.globalAlpha = (wax ? 0.45 : 0.75) * k; c.fillStyle = wax ? '#4a0e1c' : col; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7, rr = r * (i % 2 ? 0.92 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill();
    c.globalAlpha = k; c.strokeStyle = wax ? '#d8a038' : INK; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.moveTo(-r * 0.4, 0); c.lineTo(r * 0.4, 0); c.moveTo(0, -r * 0.4); c.lineTo(0, r * 0.4); c.stroke();
    c.restore();
  } });
  const pages = (x, y, n, col = '#f0e8d8') => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(80, 220);
    V.spawn({ x, y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 180), g: 140, drag: 0.04, life: rand(0.9, 1.5), size: rand(9, 13), color: col, kind: 'petal', add: false, vr: rand(-6, 6), flutter: 5 }); } };
  // (vfx2) a seal stamped onto a body, stood up in the air at (x, y - z): it pops on (squashed big, then set), a gold flash
  // behind it. A blow's mark goes on the target, not on the floor, so it never reads as a telegraph
  const sealUp = (x, y, z, r, col, dur = 0.5) => V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
    const k = e.a * Math.min(1, p / 0.05) * Math.min(1, (1 - p) / 0.45), s = t < 0.07 ? 1.5 - t / 0.07 * 0.5 : 1, wax = col === WAX;
    c.save(); c.translate(x, y - z); c.scale(s, s);
    V.glowAt(c, 0, 0, r * 1.9, wax ? GOLD : col, 0.4 * k * Math.max(0, 1 - t / 0.25));
    c.globalAlpha = 0.92 * k; c.fillStyle = wax ? '#7a1a2a' : col; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7, rr = r * (i % 2 ? 0.9 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill();
    c.strokeStyle = wax ? GOLD : INK; c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.6, 0, Math.PI * 2); c.moveTo(-r * 0.38, 0); c.lineTo(r * 0.38, 0); c.moveTo(0, -r * 0.38); c.lineTo(0, r * 0.38); c.stroke();
    c.restore();
  } });
  // (vfx2) the VOID: a contract held up over the knight, VOID stamped across it in wax at 0.18s, then torn in two and flung apart
  const voidSheet = (e, s = 1) => {
    const jag = Array.from({ length: 7 }, (_, i) => [(i % 2 ? 3 : -3) * s, (-15 + i * 5) * s]);
    V.fx({ dur: 1, layer: 'air', draw: (c, p, t, fx) => {
      const W = 44 * s, H = 30 * s, x = e.x, y = e.y - 72 * s - (e.lift || 0), pop = easeOut(Math.min(1, t / 0.12)), ST = 0.18, tear = Math.max(0, (t - 0.45) / 0.55), k = fx.a * Math.min(1, (1 - p) / 0.3);
      if (k < 0.02) return;
      for (const side of [-1, 1]) {
        c.save(); c.translate(x + side * tear * 40 * s, y + tear * tear * 46 * s); c.rotate(side * tear * 0.7); c.scale(pop, pop);
        c.beginPath(); c.moveTo(side * (W / 2 + 3), -H / 2 - 3); for (const [jx, jy] of jag) c.lineTo(jx, jy); c.lineTo(side * (W / 2 + 3), H / 2 + 3); c.closePath(); c.clip();
        c.globalAlpha = k; c.fillStyle = '#efe4cc'; c.fillRect(-W / 2, -H / 2, W, H); c.strokeStyle = INK; c.lineWidth = 1.2; c.strokeRect(-W / 2, -H / 2, W, H);
        c.globalAlpha = 0.5 * k; c.fillStyle = INK; for (let i = 0; i < 3; i++) c.fillRect(-W / 2 + 5 * s, -H / 2 + (6 + i * 7) * s, W * (i === 2 ? 0.4 : 0.7), 1.2);
        if (t > ST) { const ss = t < ST + 0.06 ? 1.6 - (t - ST) / 0.06 * 0.6 : 1;
          c.rotate(-0.18); c.scale(ss, ss); c.globalAlpha = 0.95 * k; c.strokeStyle = '#9a1a2a'; c.lineWidth = 2; c.strokeRect(-W * 0.38, -H * 0.26, W * 0.76, H * 0.52);
          c.fillStyle = '#9a1a2a'; c.font = 'bold ' + Math.round(13 * s) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VOID', 0, 1); }
        c.restore();
      }
    } });
  };
  // the mace's stamp head coming down on (x, y)
  const stamp = (x, y, col, big) => { V.spikeburst(x, y, { r: big ? 46 : 28, n: 10, color: col, core: '#ffffff', ink: INK, dur: 0.28 }); seal(x, y, big ? 30 : 18, col, big ? 1.4 : 0.8); if (big) shake(3); };
  ABILITY_VFX.oathbroker = {
    // (Collect, Settle, Lien, Co-Sign, Writ: VFX PASS · OATHBROKER, after the Ultimates)
    // Renegotiate: pages riffle forward round the knight, a lilac clock face turns back
    // (vfx2, after Living Dead's deferral) and three slips of the Ledger slide back behind the knight, each marked » (pushed back)
    reneg: c => { const e = c.ent; V.sigil(c.x, c.y, { r: 46, style: 'clock', color: LIL, dur: 0.9, spin: -4, follow: e }); pages(c.x, c.y, 3);
      for (let i = 0; i < 3; i++) V.fx({ dur: 0.7, delay: i * 0.07, layer: 'air', draw: (cc, p, t, fx) => {
        const a = (e.angle || 0) + Math.PI + (i - 1) * 0.55, q = easeOut(Math.min(1, p / 0.6)), d = 12 + 34 * q, x = e.x + Math.cos(a) * d, y = e.y - 30 - i * 5 + Math.sin(a) * d * 0.6, k = fx.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.35);
        cc.save(); cc.translate(x, y); cc.rotate((i - 1) * 0.2); cc.globalAlpha = 0.9 * k; cc.fillStyle = '#efe4cc'; cc.fillRect(-9, -6, 18, 12); cc.strokeStyle = INK; cc.lineWidth = 1; cc.strokeRect(-9, -6, 18, 12);
        cc.fillStyle = '#6a4ab0'; cc.font = 'bold 11px serif'; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText('»', 0, 0.5); cc.restore();
        V.glowAt(cc, x, y, 12, LIL, 0.3 * k); } }); },
    // Audit (polish): the books riffle open (pages flung up), a gold hand sweeps a full turn over the ledger ring
    // marking the old entries, then the gold seal stamps down: paid
    audit: c => { const x = c.x, y = c.y, R = 62; pages(x, y, 8, '#f0e8d8'); V.glint(x, y - 30, { color: GOLD, size: 28, z: 10 });
      V.fx({ dur: 0.6, layer: 'ground', draw: (cc, p, t, e) => { const k = e.a * Math.min(1, p / 0.1, (1 - p) / 0.25), sw = easeOut(Math.min(1, p / 0.7)) * Math.PI * 2;
        V.neonRing(cc, x, y, R, GOLD, 2, k, 0.7);
        cc.save(); cc.translate(x, y); cc.scale(1, 0.7);
        V.neonPath(cc, GOLD, 2.4, k, () => { cc.moveTo(0, 0); cc.lineTo(Math.cos(sw - Math.PI / 2) * R, Math.sin(sw - Math.PI / 2) * R); });
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2; if (a + Math.PI / 2 > sw) break; V.neonPath(cc, LIL, 1.6, k, () => { const px = Math.cos(a) * R * 0.8, py = Math.sin(a) * R * 0.8; cc.moveTo(px - 4, py); cc.lineTo(px - 1, py + 4); cc.lineTo(px + 5, py - 5); }); }
        cc.restore(); } });
      c.later(0.45, () => { seal(x, y, 34, GOLD, 1.4); V.sigil(x, y, { r: 40, style: 'hex', color: GOLD, dur: 0.6, spin: 3 }); V.shock(x, y, { r: 90, color: GOLD, dur: 0.4, w: 5 }); V.burst(x, y - 20, { color: GOLD, color2: '#ffffff', n: 10, speed: 200, kind: 'star', flash: false }); shake(3); }); },
    // Default: the book torn open, pages flung everywhere, smoke
    // (QA) it read as a faint ring: now the seal on the book cracks (a burst of dark-red wax spikes and lilac light at
    // the knight's chest), torn pages flung high, then the ring and the smoke
    // (vfx2) and over it the contract itself: VOID stamped across it, torn in two
    default: c => { voidSheet(c.ent); V.spikeburst(c.x, c.y, { r: 54, n: 12, color: '#c0485a', core: '#f0d8ff', ink: INK, dur: 0.32, z: 22 }); V.flash(c.x, c.y - 22, 46, LIL, 0.2);
      pages(c.x, c.y, 14); V.shock(c.x, c.y, { r: 120, color: LIL, dur: 0.5, w: 6 }); V.smoke(c.x, c.y, { n: 6, color: '#6a6070', size: 26, a: 0.45, speed: 50 }); shake(4); },
    // Foreclose: a great seal slams down onto the boss
    foreclose: c => { V.lightfall(c.tx, c.ty, { color: WAX, r: 34, h: 220, dur: 0.5, feathers: 0 }); c.later(0.2, () => { stamp(c.tx, c.ty, WAX, true); seal(c.tx, c.ty, 60, WAX, 1.8); pages(c.tx, c.ty, 10); shake(5); }); },
    // Moratorium: an hourglass seal, the Ledger held
    // (polish) a stopped clock face under the knight and a lilac hourglass over its head, both holding the 5s the
    // Ledger stands still (faint after the first moment); the dome flares as it's declared
    // (QA) the clock lilac, not parchment-white: with the dome over it the knight whited out
    moratorium: c => { const e = c.ent; V.sigil(c.x, c.y, { r: 56, style: 'clock', color: LIL, dur: 0.8, spin: 0, follow: e }); V.dome(e, { color: LIL, r: 46, dur: 0.9 }); V.shock(c.x, c.y, { r: 90, color: LIL, dur: 0.45, w: 5 });
      OLD_PAINT.rim(e.x, e.y, 50, '#e8dcc0', 5, { follow: e, ticks: 12, spin: 0, settle: 0.35 });
      OLD_PAINT.linger(5, 'air', (cc, k, t) => { const x = e.x, y = e.y - 74 + Math.sin(t * 2) * 2, s = 9, sand = Math.min(1, t / 5);
        V.glowAt(cc, x, y, 18, LIL, 0.35 * k);
        V.neonPath(cc, LIL, 1.6, k, () => { cc.moveTo(x - s, y - s * 1.3); cc.lineTo(x + s, y - s * 1.3); cc.lineTo(x - s, y + s * 1.3); cc.lineTo(x + s, y + s * 1.3); cc.closePath(); });
        cc.globalAlpha = 0.8 * k; cc.fillStyle = '#e8dcc0'; cc.beginPath(); cc.moveTo(x - s * 0.6 * (1 - sand), y - s * 1.1 * (1 - sand) - 1); cc.lineTo(x + s * 0.6 * (1 - sand), y - s * 1.1 * (1 - sand) - 1); cc.lineTo(x, y); cc.closePath(); cc.fill();
        cc.beginPath(); cc.moveTo(x - s * 0.7 * sand, y + s * 1.2); cc.lineTo(x + s * 0.7 * sand, y + s * 1.2); cc.lineTo(x, y + s * 1.2 * (1 - sand * 0.6)); cc.closePath(); cc.fill(); cc.globalAlpha = 1; }, { peak: 1, settle: 0.6, hold: 0.6 }); },
  };

  // (KIT_VFX.spit and KIT_VFX.digest: VFX PASS · GORGEMAW, after the Ultimates)

  // the tanks' taunts: Gorgemaw's Bellow (a roar that rolls out of the jaw), Oathbroker's Summons (a seal on the foe)
  const baseTaunt = KIT_VFX.taunt;
  KIT_VFX.taunt = (e, target) => {
    const id = e.cls && e.cls.id;
    if (id === 'gorgemaw') {
      if (e.st) e.st.jawUntil = FX.now + 1;
      const q = mouth(e); chomp(q.x, q.y, q.z, 1.3, '#ff9a3a', 0.4);
      for (let i = 0; i < 3; i++) V.shock(e.x, e.y, { r: 70 + i * 40, color: '#ffb070', w: 5 - i, dur: 0.45, delay: i * 0.08 });
      if (target) FX.later(0.15, () => V.hit(target.x, target.y, '#ffb070', 0.8));
      return;
    }
    if (id === 'oathbroker') {
      V.shock(e.x, e.y, { r: 60, color: LIL, w: 3, dur: 0.3 });
      if (target) { V.beam(e.x, e.y - 4, target.x, target.y - 10, { color: LIL, w: 4, dur: 0.35 }); FX.later(0.12, () => { sealUp(target.x, target.y, 46, 18, WAX, 0.9); V.sigil(target.x, target.y - 60, { r: 20, style: 'runes', color: LIL, dur: 1, spin: -2, flat: 1, layer: 'air' }); }); }
      return;
    }
    baseTaunt(e, target);
  };

  Object.assign(AUTO_VFX, {
    // a gauntleted cuff with the jaw-plate snapping
    // (shared-fx polish: the jaw-plate's bite lands: two fang arcs snapping shut on the target, a hit and a fleck of drool)
    maw: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 54, span: 1.5, color: '#e8c8a0', dur: 0.22, w: 0.4, flip: c.alt, sparks: 2 });
      c.later(0.09, () => { const d = Math.min(64, Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y)), x = c.ent.x + Math.cos(c.ang) * d, y = c.ent.y + Math.sin(c.ang) * d;
        V.fx({ dur: 0.18, layer: 'air', draw: (cx, p, t, e) => { const k = e.a * (1 - Math.max(0, (p - 0.5) / 0.5)), g = 9 * (1 - easeOut(Math.min(1, p / 0.45))) + 2, cy = y - 18;
          V.neonPath(cx, '#ffd8b0', 2.2, k, () => { cx.moveTo(x - 10, cy - g); cx.quadraticCurveTo(x, cy - g - 6, x + 10, cy - g); cx.moveTo(x - 10, cy + g); cx.quadraticCurveTo(x, cy + g + 6, x + 10, cy + g); }); } });
        V.hit(x, y, '#ffd0a0', 0.42); V.splash(x, y, { color: '#c8e070', n: 2, size: 0.5, speed: 0.5 }); }); },
    // a tap of the stamp-mace: a small lilac seal
    stamp: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 50, span: 1.2, color: '#d8d0e8', dur: 0.22, w: 0.35, flip: c.alt }); c.later(0.08, () => { const d = Math.min(64, Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y)); seal(c.ent.x + Math.cos(c.ang) * d, c.ent.y + Math.sin(c.ang) * d, 10, LIL, 0.5); }); },
  });

  // ---------------------------------------------------------------- host moments (fev, main.js) and the training yard
  // eat: { id, m: shape, mid: telegraph, w: whole (a teammate's circle, gone for everyone), r: a raidwide (Bottomless), f: whose it was }
  // bill: { id, a: amount, s: Settle }  default: { id, b: what the boss paid (Foreclose) }
  globalThis.CLASS_FEV = {
    eat(msg, e, o) {
      const tg = o.tgs && msg.mid != null ? o.tgs.get(msg.mid) : null, col = MCOL(msg.m);
      if (tg && msg.w) tg.gone = o.now;   // swallowed whole: it never goes off (tgx skips its impact)
      if (msg.r) {   // a raidwide: the whole room's air pulled into the jaw
        V.shock(e.x, e.y, { r: 260, color: col, dur: 0.4, w: 6 });
        V.swirl(e.x, e.y, { r: 120, color: col, dur: 0.5, inward: true, follow: e });
      } else if (tg) swallowShape(tg.live || tg.shape, e, col);
      else V.swirl(e.x, e.y, { r: 60, color: col, dur: 0.35, inward: true, follow: e });
      gulp(e, msg.m, msg.m === 'spike' || msg.w);
      if (e.st) FX.later(0.3, () => { e.st.chompAt = FX.now; });
      if (o.mine) shake(2);
    },
    bill(msg, e) { const big = msg.s; seal(e.x, e.y + 4, big ? 30 : 16 + Math.min(14, (msg.a || 0) / 8), big ? GOLD : WAX, 0.9); if (!big) V.flash(e.x, e.y - 10, 20, WAX, 0.15); },
    default(msg, e, o) { if (msg.b > 0 && o.boss && FX.text) FX.text(o.boss.x, o.boss.y - 70, String(Math.round(msg.b)), '#ff9a7a', 14 + Math.min(10, msg.b / 400)); pages(e.x, e.y, 14); V.shock(e.x, e.y, { r: 110, color: LIL, dur: 0.45, w: 5 }); if (msg.b > 0 && o.boss) { stamp(o.boss.x, o.boss.y, WAX, true); pages(o.boss.x, o.boss.y, 8); } },
  };

  // the sparring dummy: the yard plays the host's part for the jaw and the Ledger
  globalThis.CLASS_TOWN = {
    cls: actor => actor && actor.cls && actor.cls.id,
    send(town, actor, now, bill) { const L = town.led; if (L) actor.notify('ledger', Object.assign(OATH.pack(L, now), bill ? { bill } : {})); },
    event(town, ev, now, actor) {
      const id = this.cls(actor);
      if (ev.type === 'maw' && id === 'gorgemaw') { town.maw = { until: now + Math.min(4.2, ev.dur || 0), all: !!ev.all }; return; }
      if (ev.type !== 'ledger' || id !== 'oathbroker') return;
      const L = town.led || (town.led = OATH.make()), maxHp = actor.kit.env.maxHp() || 1;
      if (ev.op === 'terms') { OATH.terms(L, ev, maxHp); return; }
      if (ev.op === 'cosign') return;   // nobody here to co-sign for
      const r = OATH.op(L, ev, now, maxHp), e = actor.ent;
      if (r.self > 0) { FX.text(e.x, e.y - 46, '-' + Math.round(r.self), '#ff7a6a', 14); CLASS_FEV.bill({ a: r.self, s: 1 }, e); }
      if (ev.op === 'default' || ev.op === 'foreclose') CLASS_FEV.default({ b: r.boss }, e, {});
      this.send(town, actor, now, r.self > 0 ? Math.round(r.self) : 0);
    },
    hit(town, amt, now, actor, player) {
      const id = this.cls(actor);
      if (id === 'gorgemaw' && town.maw && town.maw.until > now && amt > 0) {
        amt *= 0.25;
        actor.notify('eat', { m: 'ring' });
        CLASS_FEV.eat({ m: 'ring' }, player, { mine: true });
      }
      if (id === 'oathbroker' && amt > 0) { const L = town.led || (town.led = OATH.make()); amt -= OATH.write(L, amt, now); this.send(town, actor, now); }
      return amt;
    },
    tick(town, now, actor, player) {
      const L = town.led; if (!L || this.cls(actor) !== 'oathbroker') return;
      const dt = Math.max(0, Math.min(0.5, now - (town.ledT ?? now))); town.ledT = now;
      const bills = OATH.bills(L, now, dt);
      if (!bills.length) return;
      let self = 0; for (const b of bills) self += b.self;
      if (self > 0) { FX.text(player.x, player.y - 46, '-' + Math.round(self), '#ff7a6a', 13); CLASS_FEV.bill({ a: self }, player); }
      this.send(town, actor, now, Math.round(self));
    },
  };
  // the pieces the tanks' Ultimates reuse (the Ultimates block at the bottom of this file)
  globalThis.GORGEMAW_VFX = { MCOL, mouth, chomp, crumbs };
  globalThis.OATHBROKER_VFX = { INK, WAX, LIL, GOLD, seal, pages, stamp, sealUp };
})();

// ======================================================================= Ironpalm (tank)
// Barehanded impact, after the painted sheets: no wind-up glyphs on the small hits (they come several a second), just a
// knuckle flash and a ring where they land, and a hit-stop that freezes the swing for a beat (hitStop, draw-util.js).
// The named moves get the show: a launch and a column of dust for Rising Gate, a cracked crater for Heaven's Drop, a
// storm of palm prints for Thousand Palms. Saffron by default; Still Water is pale water-blue, Avalanche Fist is earth.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => vfxShake(s);
  const col = e => (e && e.spec === 'stillwater' ? '#9fd8f0' : e && e.spec === 'avalanche' ? '#e09a5a' : '#ffb84a');
  const hot = e => (e && e.spec === 'stillwater' ? '#e8fbff' : '#fff0c8');
  // where a blow lands: toward the target, no further than an arm (or a leg) reaches past the boss's edge
  const at = (c, d = 52) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x), dist = Math.hypot(c.tx - c.x, c.ty - c.y), r = Math.min(dist, d); return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, a }; };
  const stop = (c, s) => { if (c.ent && c.ent.st) hitStop(c.ent.st, s, FX.now); };
  // one blow connecting: a white-hot flash, a ring, a few sparks thrown back along the line of the strike
  function impact(c, size, o = {}) {
    const p = at(c, o.reach), k = col(c.ent);
    V.spawn({ x: p.x, y: p.y, z: 16, life: 0.16 + size * 0.06, size: 30 + size * 30, size1: 8, color: hot(c.ent), kind: 'star', vr: 6 });
    V.shock(p.x, p.y, { r: 26 + size * 26, color: k, dur: 0.22 + size * 0.08, w: 2 + size * 2 });
    V.sparks(p.x, p.y, { color: k, n: 3 + Math.round(size * 5), angle: p.a, spread: 0.7, speed: 220 + size * 160 });
    stop(c, 0.04 + size * 0.05);
    if (size >= 1) shake(1.5 + size * 1.5);
    return p;
  }
  // an open palm: a five-fingered print of light pressed into the air where it lands
  function print(x, y, a, color, size = 1, dur = 0.35) {
    V.fx({ dur, layer: 'air', draw: (ctx, p, t, e) => {
      const k = (1 - p) * e.a, s = size * (1 + p * 0.4);
      ctx.save(); ctx.translate(x, y - 18); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
      V.neonPath(ctx, color, 2.2, k, () => {
        ctx.moveTo(6 * s, 0); ctx.ellipse(0, 0, 6 * s, 7 * s, 0, 0, Math.PI * 2);
        for (let i = 0; i < 4; i++) { const fy = (-4.5 + i * 3) * s; ctx.moveTo(6 * s, fy); ctx.lineTo((12 - Math.abs(i - 1.5) * 1.5) * s, fy); }
        ctx.moveTo(2 * s, -6 * s); ctx.lineTo(6 * s, -10 * s);   // the thumb
      });
      ctx.restore();
    } });
  }
  // (online refs, docs/art/vfx-online-refs/ironpalm.md) Lost Ark's hand-to-hand hits: a flat ring standing across the line
  // of the blow (squashed along it, so it reads as force arriving from one side, never as an area on the floor)
  function crossRing(x, y, a, r, color, o = {}) {
    const dur = o.dur ?? 0.2, z = o.z ?? 18, w = o.w ?? 2.5, thin = o.thin ?? 0.34;
    V.fx({ dur, delay: o.delay, layer: 'air', draw: (ctx, p, t, e) => {
      const q = 1 - Math.pow(1 - p, 3), R = r * (0.3 + 0.7 * q), k = e.a * (1 - p);
      ctx.save(); ctx.translate(x, y - z); ctx.rotate(a);
      V.neonPath(ctx, color, w * (1 - p * 0.6), k, () => ctx.ellipse(0, 0, R * thin, R, 0, 0, Math.PI * 2));
      ctx.restore();
    } });
  }
  // short speed lines along the blow: 'in' they converge on the point of contact (the jab arriving), 'out' they burst
  // through and out the far side (a heavy blow's punch-through, Fists of Fury's cone)
  function rush(x, y, a, o = {}) {
    const n = o.n ?? 3, out = !!o.out, D = o.dist ?? 40, z = o.z ?? 18, cone = o.cone ?? 0.45;
    const ls = Array.from({ length: n }, (_, i) => ({ s: (i - (n - 1) / 2) * (o.spread ?? 9) + rand(-2, 2), l: (o.len ?? 22) * rand(0.75, 1.2), d: rand(0.8, 1.15), g: out ? (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2) * cone + rand(-0.08, 0.08) : 0 }));
    V.fx({ dur: o.dur ?? 0.14, delay: o.delay, layer: 'air', draw: (ctx, p, t, e) => {
      const q = 1 - Math.pow(1 - p, 2), k = e.a * (out ? 1 - p : Math.min(1, p * 4) * (1 - p * 0.6));
      ctx.save(); ctx.translate(x, y - z); ctx.rotate(a);
      V.neonPath(ctx, o.color || '#fff0c8', (o.w ?? 2) * (1 - p * 0.4), k, () => { for (const l of ls) {
        if (out) { const cg = Math.cos(l.g), sg = Math.sin(l.g), r0 = 6 + D * q * l.d, r1 = r0 + l.l * (1 - p * 0.5); ctx.moveTo(cg * r0, sg * r0 + l.s * 0.3); ctx.lineTo(cg * r1, sg * r1 + l.s * 0.3); }
        else { const h = -D * (1 - q) * l.d, y0 = l.s * (1 - q * 0.7); ctx.moveTo(h - l.l * (1 - q * 0.5), y0); ctx.lineTo(h, y0); } } });
      ctx.restore();
    } });
  }

  ABILITY_VFX.ironpalm = {
    // the three inputs: tiny and quick (they come several a second)
    // (online refs) three silhouettes for three inputs, no wind-up (an impulse every half second): the palm a short jab
    // with speed lines converging on the hand and a flat ring across the blow; the fist a fat straight streak that punches
    // through (a double ring, a cone of lines out the far side, dust); the kick a low crescent swept near the floor
    palm: c => { const p0 = at(c); rush(p0.x, p0.y, p0.a, { n: 3, dist: 34, len: 18, dur: 0.1, spread: 8, color: hot(c.ent), w: 1.6 });
      c.later(0.08, () => { const p = impact(c, 0.25), k = col(c.ent); crossRing(p.x, p.y, p.a, 22, k, { dur: 0.18, w: 2 }); print(p.x, p.y, p.a, k, 0.8, 0.25); }); },
    fist: c => { const p0 = at(c), k = col(c.ent), ca = Math.cos(p0.a), sa = Math.sin(p0.a);
      OLD_PAINT.thrust(c.x + ca * 6, c.y + sa * 6, p0.x + ca * 8, p0.y + sa * 8, { w: 9, color: k, core: hot(c.ent), ink: '#2a1408', dur: 0.2, z: 20 });
      c.later(0.12, () => { const p = impact(c, 0.55);
        crossRing(p.x, p.y, p.a, 26, hot(c.ent), { dur: 0.16, w: 2.4 }); crossRing(p.x, p.y, p.a, 40, k, { dur: 0.26, w: 2.6, delay: 0.03 });
        rush(p.x, p.y, p.a, { out: true, n: 4, dist: 46, len: 22, dur: 0.2, cone: 0.5, color: k, w: 2 });
        V.smoke(p.x, p.y, { n: 1, color: '#d8ccb8', size: 14, a: 0.4, speed: 30, life: 0.5 }); shake(1); }); },
    kick: c => { const k = col(c.ent);
      OLD_PAINT.smear(c.x, c.y, c.ang, { r: 50, span: 1.7, w: 9, color: k, core: hot(c.ent), ink: '#2a1408', dur: 0.2, flip: true, z: 8, flat: 0.6, lines: 2 });
      c.later(0.1, () => { const p = impact(c, 0.4, { reach: 58 }); crossRing(p.x, p.y + 8, p.a, 30, k, { dur: 0.2, w: 2.2, z: 10, thin: 0.5 });
        V.smoke(p.x, p.y, { n: 1, color: '#c8b8a0', size: 12, a: 0.35, speed: 50, life: 0.4 }); }); },
    // (Crane Step, Rising Gate, Thousand Palms, Read: VFX PASS · IRONPALM, after the Ultimates)
    // Flowing Palms: three prints in a row, the last one pushed through
    flow: c => { for (let i = 0; i < 3; i++) c.later(0.03 + i * 0.05, () => { const p = at(c), o = (i - 1) * 9; print(p.x + Math.sin(p.a) * o, p.y - Math.cos(p.a) * o, p.a, col(c.ent), 0.8 + i * 0.15, 0.3); });
      c.later(0.14, () => { const p = impact(c, 0.7); crossRing(p.x, p.y, p.a, 34, col(c.ent), { dur: 0.22, w: 2.4 }); rush(p.x, p.y, p.a, { out: true, n: 3, dist: 40, len: 20, dur: 0.18, cone: 0.35, color: hot(c.ent) }); }); },   // (online refs: the push-through punches out the far side)
    // Heaven's Drop: an axe kick down onto the airborne boss: a slash from above, a crater, the floor cracks, a big stop
    // (online refs) the heel comes down as a stamp from above: a streak dropping onto the boss, a flat ring where it lands
    drop: c => { V.slash(c.x, c.y, c.ang, { r: 70, span: 2.2, color: hot(c.ent), w: 0.6, dur: 0.24 });
      c.later(0.06, () => OLD_PAINT.thrust(c.tx, c.ty - 130, c.tx, c.ty - 14, { w: 13, color: col(c.ent), core: hot(c.ent), ink: '#2a1408', dur: 0.2, z: 16 }));
      c.later(0.18, () => {
        const k = col(c.ent); impact(c, 1.6, { reach: 60 }); stop(c, 0.14); crossRing(c.tx, c.ty, -Math.PI / 2, 80, hot(c.ent), { dur: 0.26, w: 3, z: 14, thin: 0.42 });
        V.spikeburst(c.tx, c.ty, { r: 64, n: 14, color: k, core: hot(c.ent), ink: '#2a1408', dur: 0.36 });
        V.decal(c.tx, c.ty, { style: 'crack', r: 60, dur: 2.4, a: 0.6, seed: Math.random() * 6 });
        V.shock(c.tx, c.ty, { r: 120, color: k, dur: 0.45, w: 7 });
        V.debris(c.tx, c.ty, { n: 8, color: '#7a6a58' }); V.smoke(c.tx, c.ty, { n: 6, r: 30, color: '#a89880', size: 30, a: 0.45, speed: 60, life: 1.4 });
        shake(6);
      }); },
    // Tiger Wall: a low stance; a shield of striped light across the front, dust swept out to the sides
    wall: c => { c.later(0.12, () => impact(c, 0.5)); V.shield(c.ent, { shape: 'front', color: col(c.ent), dur: 5, r: 40 });
      V.smoke(c.x, c.y, { n: 4, color: '#d8ccb8', size: 18, a: 0.45, speed: 50 }); V.glint(c.x + Math.cos(c.ang) * 30, c.y + Math.sin(c.ang) * 30, { color: hot(c.ent), size: 24 }); },
    // Stone Breaker: a crushing low kick; stone shards and a dark bruise ring on the boss
    // (online refs: a red rune ring round the boss's feet read like a telegraph) the bruise is earth and amber: a low
    // crescent swept into the knee, a flat ring at shin height, a small crack and a faint amber rim that fades quickly
    breaker: c => { OLD_PAINT.smear(c.x, c.y, c.ang, { r: 56, span: 1.9, w: 12, color: col(c.ent), core: hot(c.ent), ink: '#2a1408', dur: 0.22, z: 8, flat: 0.6, lines: 2 }); c.later(0.12, () => {
      const p = impact(c, 0.9, { reach: 58 });
      crossRing(p.x, p.y + 8, p.a, 46, col(c.ent), { dur: 0.26, w: 3, z: 10, thin: 0.45 });
      V.crystals(c.tx, c.ty, { color: '#a89480', n: 5, r: 26, h: 28, dur: 0.6 });
      V.decal(c.tx, c.ty, { style: 'crack', r: 34, dur: 1.4, a: 0.45, seed: Math.random() * 6 });
      V.shock(c.tx, c.ty, { r: 44, r0: 30, color: '#c8904a', dur: 0.7, w: 2.5 });
      V.debris(p.x, p.y, { n: 4, color: '#6a5a48', speed: 0.6 });
    }); },
    // Iron Ox: a heavy straight with the whole body: a fat ring, a dust cone thrown out behind the boss
    // (online refs, Six-sided Star / Phantom Rush) the whole body behind it: a fat streak from the shoulder, a big ring across
    // the blow, white then saffron, and a long cone of punch-through lines out the far side with the dust
    ox: c => { const p0 = at(c), ca = Math.cos(p0.a), sa = Math.sin(p0.a);
      OLD_PAINT.thrust(c.x - ca * 10, c.y - sa * 10, p0.x + ca * 14, p0.y + sa * 14, { w: 15, color: col(c.ent), core: hot(c.ent), ink: '#2a1408', dur: 0.26, z: 20, head: false });
      c.later(0.16, () => {
      const p = impact(c, 1.3), k = col(c.ent);
      crossRing(p.x, p.y, p.a, 44, hot(c.ent), { dur: 0.2, w: 3 }); crossRing(p.x, p.y, p.a, 74, k, { dur: 0.32, w: 3.4, delay: 0.04 });
      rush(c.tx, c.ty, p.a, { out: true, n: 5, dist: 70, len: 34, dur: 0.26, cone: 0.55, spread: 12, color: k, w: 2.6 });
      V.shock(c.tx, c.ty, { r: 90, color: k, dur: 0.4, w: 6, delay: 0.04 });
      for (let i = 0; i < 6; i++) { const a = p.a + rand(-0.6, 0.6), sp = rand(120, 240); V.spawn({ x: c.tx, y: c.ty, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(20, 60), drag: 0.06, life: 0.8, size: 18, size1: 34, color: '#c8b8a0', kind: 'smoke', add: false, a: 0.4 }); }
    }); },
    // Iron Skin: the skin goes dark iron: a metal sheen ring, rivet sparks, a grey aura that stays the 10s
    skin: c => { V.glint(c.x, c.y, { color: '#e8eef6', size: 30, z: 30 }); V.aura(c.ent, { color: '#9aa8b8', dur: 10, r: 28, rate: 0.15 });
      V.shock(c.x, c.y, { r: 70, color: '#c8d4e2', dur: 0.4, w: 5 }); V.sparks(c.x, c.y - 16, { color: '#ffffff', n: 8, speed: 220 }); shake(2); },
    // Temple Bell: the chest struck like a bell: three gold rings of sound roll out over the party
    bell: c => { V.glint(c.x, c.y, { color: '#ffe08a', size: 32, z: 34 });
      for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 150 + i * 40, color: '#ffd27a', dur: 0.7, w: 6 - i * 1.5, delay: i * 0.18 });
      V.sigil(c.x, c.y, { r: 120, style: 'star5', color: '#ffd27a', dur: 1.6, spin: 0.6 }); V.aura(c.ent, { color: '#ffd27a', dur: 15, r: 28, rate: 0.12 }); shake(2); },
    // Still Pond: the floor goes still as water: a pale pool spreads, rings on it, the monk calm in the middle
    // (QA: a near-white hex circle at full strength for 8s sat over telegraphs) it settles faint after the first second
    pond: c => { vfxLingerSettle(V.ink(c.x, c.y, { r: 90, dur: 8, follow: c.ent, a: 0.25 }), 0.5, 1); vfxLingerSettle(V.sigil(c.x, c.y, { r: 90, style: 'hex', color: '#7fc0e0', dur: 8, spin: 0.2, follow: c.ent }), 0.25, 1.2);
      for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 60 + i * 30, color: '#cfeeff', dur: 0.9, w: 3, delay: i * 0.25 }); },
    // Landslide: the floor heaves; boulders, a rolling dust wall over the party, the earth aura
    slide: c => { V.crater(c.x, c.y, { r: 70, color: '#c07a3a', dur: 2.4, flames: 0, a: 0.4 }); V.debris(c.x, c.y, { n: 10, color: '#7a6a58' });
      V.shock(c.x, c.y, { r: 170, color: '#e09a5a', dur: 0.6, w: 7 }); V.smoke(c.x, c.y, { n: 8, r: 80, color: '#a89070', size: 34, a: 0.4, speed: 60, life: 1.6 });
      V.aura(c.ent, { color: '#e09a5a', dur: 15, r: 30, rate: 0.2 }); shake(6); },
    // Bellows Stance (talent): a great breath in, heat rising off the monk, an orange aura
    // (polish) the forge breath: air pulled in round the monk (an inward swirl, motes streaming to the chest), the
    // chest flares like a stoked coal, a hot gust out of it and a ring; then for the 10s a coal glow at the chest pulses
    // with each slow breath (bright on the inhale) over a faint heat ring, embers lifting off
    bellows: c => { const e = c.ent; V.swirl(c.x, c.y, { r: 56, color: '#ffb070', dur: 0.6, inward: true, follow: e }); V.aura(e, { color: '#ff9a4a', style: 'flame', dur: 10, r: 28, rate: 0.2 });
      for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, d = rand(60, 90); V.spawn({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.6, z: 20, vx: -Math.cos(a) * d * 1.8, vy: -Math.sin(a) * d * 1.1, life: 0.45, size: rand(5, 8), size1: 1, color: '#ffd8a0', stretch: 2 }); }
      c.later(0.45, () => { V.flash(e.x, e.y - 22, 50, '#ff9a4a', 0.25); V.shock(e.x, e.y, { r: 90, color: '#ffb070', dur: 0.45, w: 5 }); V.smoke(e.x + Math.cos(e.angle || 0) * 20, e.y - 6, { n: 5, r: 10, color: '#e8d8c8', size: 22, a: 0.4, speed: 80, life: 0.9 }); V.flare(e.x, e.y, { n: 8, r: 14, color: '#ff8a3a', size: 0.8 }); shake(2); });
      OLD_PAINT.linger(10, 'ground', (cc, k, t) => { const br = 0.5 + 0.5 * Math.sin(t * 2.2); V.neonRing(cc, e.x, e.y + 2, 30 + br * 4, '#ff9a4a', 1.4, k * (0.5 + 0.5 * br), 0.55); },
        { peak: 0.9, settle: 0.5, hold: 0.8, tick: () => { if (Math.random() < 0.08) V.spawn({ x: e.x + rand(-12, 12), y: e.y, z: 24, vz: rand(40, 80), life: 0.7, size: rand(4, 6), size1: 0, color: Math.random() < 0.5 ? '#ff8a3a' : '#ffd070' }); } });
      OLD_PAINT.linger(10, 'air', (cc, k, t) => { const br = 0.5 + 0.5 * Math.sin(t * 2.2); V.glowAt(cc, e.x, e.y - 22 - (e.lift || 0), 14 + 8 * br, '#ff7a2a', (0.35 + 0.4 * br) * k); V.glowAt(cc, e.x, e.y - 22 - (e.lift || 0), 5, '#ffe0a0', k * br); }, { peak: 1, settle: 0.6, hold: 0.8 }); },
    // Dragon Ascends (talent): a leap, a coiling streak of gold up and over, and a great blow on the target
    dragon: c => { V.smoke(c.x, c.y, { n: 4, color: '#d8ccb8', size: 20, a: 0.5, speed: 50 }); V.tornado(c.x, c.y, { color: '#ffd27a', h: 120, r: 18, dur: 0.5 });
      c.later(0.3, () => { V.lightfall(c.tx, c.ty, { color: '#ffd27a', r: 30, h: 260, dur: 0.6, feathers: 0 }); V.spikeburst(c.tx, c.ty, { r: 70, n: 16, color: '#ffb84a', core: '#fff6d0', ink: '#3a2408', dur: 0.4 });
        V.shock(c.tx, c.ty, { r: 140, color: '#ffd27a', dur: 0.5, w: 7 }); V.debris(c.tx, c.ty, { n: 6, color: '#7a6a58' }); stop(c, 0.12); shake(6); }); },
  };

  Object.assign(KIT_VFX, {
    // a Crisp press (only you see it): a thin bright ring snapping shut on the hand
    crisp: e => { const x = e.x + Math.cos(e.angle || 0) * 22, y = e.y + Math.sin(e.angle || 0) * 22; V.shock(x, y, { r: 22, color: '#fff6d8', dur: 0.16, w: 2 }); V.spawn({ x, y, z: 18, life: 0.12, size: 22, size1: 4, color: '#ffffff', kind: 'star' }); },
    // Read: the blow is caught. A white flash in front, a still ring, and on a tankbuster a gold star and a long stop
    read: (e, target, d) => {
      const b = d && d.b, x = e.x + Math.cos(e.angle || 0) * 24, y = e.y + Math.sin(e.angle || 0) * 24;
      V.spawn({ x, y, z: 20, life: 0.25, size: b ? 90 : 60, size1: 20, color: '#ffffff', kind: 'star', vr: 5 });
      V.shock(e.x, e.y, { r: b ? 110 : 70, color: b ? '#ffd27a' : '#e8f4ff', dur: 0.4, w: b ? 7 : 4 });
      V.sparks(x, y, { color: '#fff2c8', n: b ? 14 : 8, angle: e.angle || 0, spread: 1, speed: 360 });
      if (e.st) hitStop(e.st, b ? 0.18 : 0.08, FX.now);
      if (b) { V.sigil(e.x, e.y, { r: 70, style: 'star4', color: '#ffd27a', dur: 0.8, spin: 3 }); vfxShake(4); }
    },
    // Avalanche Fist: a dropped string staggers you: grit and a dull ring
    stagger: e => { V.smoke(e.x, e.y, { n: 4, color: '#8a7a68', size: 18, a: 0.5, speed: 30 }); V.shock(e.x, e.y, { r: 40, color: '#8a6a50', dur: 0.3, w: 3 }); },
    // Heaven's Drop (Mountain Falls talent): the ground under the boss gives a second later
    aftershock: Object.assign((e, target) => { const t = target || e; V.shock(t.x, t.y, { r: 110, color: '#c8a070', dur: 0.5, w: 6 }); V.debris(t.x, t.y, { n: 6, color: '#7a6a58' }); V.decal(t.x, t.y, { style: 'crack', r: 50, dur: 1.8, a: 0.5, seed: Math.random() * 6 }); shake(3); }, { atTarget: true }),
    // Thousand Palms (Echoing Palm talent): three faint palm prints, half a second behind
    'echo-palm': Object.assign((e, target) => { const t = target || e; for (let i = 0; i < 3; i++) FX.later(i * 0.08, () => print(t.x + rand(-16, 16), t.y + rand(-10, 10), Math.atan2(t.y - e.y, t.x - e.x), '#ffe0b0', 0.9, 0.35)); }, { atTarget: true }),
    // Temple Bell (Resounding Gong talent): the bell rings again 8s later
    gong: e => { for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 140 + i * 40, color: '#ffd27a', dur: 0.6, w: 5 - i * 2, delay: i * 0.15 }); },
  });

  // the taunt: Beckoning Palm. A palm print held out toward the target, a line of breath to it, the print pressed on it
  const baseTaunt = KIT_VFX.taunt;
  KIT_VFX.taunt = (e, target) => {
    if (!(e.cls && e.cls.id === 'ironpalm')) return baseTaunt(e, target);
    const a = target ? Math.atan2(target.y - e.y, target.x - e.x) : (e.angle || 0);
    print(e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, a, '#ffd9a0', 1.3, 0.6);
    V.shock(e.x, e.y, { r: 70, color: '#ffb84a', w: 3, dur: 0.35 });
    if (!target) return;
    V.beam(e.x, e.y - 4, target.x, target.y - 12, { color: '#ffe0b0', w: 4, dur: 0.3 });
    FX.later(0.12, () => { print(target.x, target.y, a, '#ffb84a', 2, 0.7); V.shock(target.x, target.y, { r: 60, color: '#ffb84a', w: 3, dur: 0.35 }); });
  };

  // autos: a quick knuckle flash where the jab lands
  AUTO_VFX.fist = c => { const d = Math.min(Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y), 50), x = c.ent.x + Math.cos(c.ang) * d, y = c.ent.y + Math.sin(c.ang) * d;
    V.hit(x, y, '#ffe0b0', 0.4); if (c.ent.st) hitStop(c.ent.st, 0.03, FX.now); };
  // (Hundred Palms, the Ultimates block at the bottom of this file, reuses these)
  globalThis.IRONPALM_VFX = { col, hot, print, impact, at };
})();
// ======================================================================= Threadweaver and Marionettist (classes-c)
// Threads are lilac light with a running bead, like a needle drawing a seam; a snap flicks the two halves apart. The
// Doll's moves play on the Doll (stagecraft.js keeps where each one is and plays its pose); the strings flash as blades
// for Cross-Cut. Big moves keep the three beats: a glyph, a bold shape, a slow aftermath.
(() => {
  const V = VFX, TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => vfxShake(s);
  const idOf = ent => (ent && ent.kind === 'player' ? (typeof Net !== 'undefined' ? Net.id : 0) : ent && ent.id);
  const dollsOf = ent => (typeof Stagecraft !== 'undefined' ? Stagecraft.dollsOf(idOf(ent), typeof Net !== 'undefined' ? Net.id : 0) : []);
  const act = (ent, kind) => { if (typeof Stagecraft !== 'undefined') Stagecraft.act(idOf(ent), kind, FX.now || 0); };
  // a thread drawn out from a to b over `grow` s, then fading
  const threadOut = (a, b, o = {}) => V.fx({ dur: o.dur ?? 0.7, layer: 'air', draw: (c, p, t, e) => {
    const q = Math.min(1, t / (o.grow ?? 0.22)), k = Math.min(1, (1 - p) / 0.4) * e.a, ax = a.x, ay = a.y - 14, bx = ax + (b.x - ax) * q, by = ay + (b.y - 14 - ay) * q;
    V.neonPath(c, o.color || '#cbb8ff', o.w ?? 2, k, () => { c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 16 * (1 - q), bx, by); });
    V.glowAt(c, bx, by, 8, '#f2e6ff', 0.8 * k);
  } });
  // a bead of light running along every thread on this ally, out to whoever is on the far end
  const runDown = (who, col) => {
    if (typeof Stagecraft === 'undefined' || !who) return;
    const id = idOf(who);
    for (const [a, b] of Stagecraft.S.threads) {
      if (a !== id && b !== id) continue;
      const env = Stagecraft.S.env, other = env ? env.entById(a === id ? b : a) : null;
      if (!other) continue;
      V.fx({ dur: 0.45, layer: 'air', draw: (c, p, t, e) => { const x = who.x + (other.x - who.x) * p, y = who.y - 12 + (other.y - who.y) * p; V.glowAt(c, x, y, 10, col, e.a); V.glowAt(c, x, y, 4, '#ffffff', e.a); },
        done: () => V.plus(other.x, other.y, { color: col, n: 3 }) });
    }
  };

  // ---- Threadweaver painted-sheet pieces (docs/art/vfx-reference/threadweaver.png): crimson and gold threads.
  // Floor marks flare, then settle low so boss telegraphs read through them. Grand Loom (the Ultimates block at the
  // bottom of this file) reuses them through THREADWEAVER_VFX.
  const TW_CRIM = '#e8203a', TW_ROSE = '#ff5a6a', TW_GOLD = '#ffcf7a', TW_HOT = '#fff0ea';
  // the woven diamond seal: a gold diamond round a crimson one, lens-shaped petals woven through it, spikes past its
  // points (Tapestry, Snap's aftermath, Grand Loom's aftermath)
  function weaveDiamond(x, y, R, dur, o = {}) {
    const peak = o.peak ?? 0.85, settle = o.settle ?? 0.28, W = o.w ?? 1;   // o.w: line weight
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.12) * Math.min(1, (1 - p) * dur / 0.6) * (settle + (peak - settle) * Math.max(0, 1 - t / 0.7));
      if (k < 0.02) return;
      const RR = R * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.25)));
      const dia = r => { c.moveTo(0, -r); c.lineTo(r, 0); c.lineTo(0, r); c.lineTo(-r, 0); c.closePath(); };
      const lens = (a, L, wd, col, w) => V.neonPath(c, col, w * W, k, () => { const ca = Math.cos(a), sa = Math.sin(a), px = -sa * wd, py = ca * wd; c.moveTo(0, 0); c.quadraticCurveTo(ca * L / 2 + px, sa * L / 2 + py, ca * L, sa * L); c.quadraticCurveTo(ca * L / 2 - px, sa * L / 2 - py, 0, 0); });
      c.save(); c.translate(x, y); c.scale(1, 0.78);
      // (online-refs pass) a faint warm-gold tint, not a wine-red fill: a big red floor shape reads as a boss telegraph
      c.globalAlpha = 0.07 * k; c.fillStyle = '#ffcf7a'; c.beginPath(); dia(RR); c.fill(); c.globalAlpha = 1;
      V.neonPath(c, TW_GOLD, 2 * W, k, () => dia(RR));
      V.neonPath(c, TW_CRIM, 1 * W, k * 0.7, () => dia(RR * 0.92));
      V.neonPath(c, TW_CRIM, 1.6 * W, k, () => dia(RR * 0.74));
      for (let i = 0; i < 4; i++) lens(i * Math.PI / 2, RR * 0.95, RR * 0.16, TW_CRIM, 1.6);
      for (let i = 0; i < 4; i++) lens(Math.PI / 4 + i * Math.PI / 2, RR * 0.5, RR * 0.12, TW_GOLD, 1.3);
      V.neonPath(c, TW_GOLD, 1.4 * W, k, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.moveTo(Math.cos(a) * RR, Math.sin(a) * RR); c.lineTo(Math.cos(a) * RR * 1.2, Math.sin(a) * RR * 1.2); } });
      V.neonPath(c, TW_GOLD, 1.4 * W, k, () => dia(RR * 0.14));
      c.restore();
      V.glowAt(c, x, y, RR * 0.3, TW_CRIM, 0.5 * k);
    } });
  }
  // a thread snapping: thin crimson rays shooting out of a point, white-hot in the middle
  function weaveSnapBurst(x, y, o = {}) {
    const R = o.r ?? 60, n = o.n ?? 12, rays = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.15, 0.15), l: rand(0.55, 1) }));
    V.fx({ dur: 0.4, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.35)), k = e.a * (1 - Math.max(0, (p - 0.3) / 0.7));
      for (const r of rays) { const ca = Math.cos(r.a), sa = Math.sin(r.a) * 0.8, L = R * r.l * q;
        V.neonPath(c, r.l > 0.8 ? TW_ROSE : TW_CRIM, r.l > 0.8 ? 2.8 : 2.2, k, () => { c.moveTo(x + ca * L * 0.3, y + sa * L * 0.3); c.lineTo(x + ca * L, y + sa * L); }); }
      V.glowAt(c, x, y, R * 0.6, TW_CRIM, 0.6 * k); V.glowAt(c, x, y, R * 0.35, TW_ROSE, 0.8 * k); V.glowAt(c, x, y, R * 0.2, '#ffffff', k);
    } });
  }
  // two bright lances crossing through a point (Grand Loom on the boss): each shoots through end to end, then fades
  function weaveCross(x, y, o = {}) {
    const L = o.L ?? 150, a0 = rand(-0.15, 0.15), cy = y - 24, W = o.w ?? 1;   // o.w: the lances' thickness
    V.fx({ dur: o.dur ?? 0.45, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.7);
      for (let i = 0; i < 2; i++) {
        const q = easeOut(Math.max(0, Math.min(1, (t - i * 0.05) / 0.1))); if (q <= 0) continue;
        const a = a0 + (i ? 0.7 : -0.7), ca = Math.cos(a), sa = Math.sin(a) * 0.78;
        const x0 = x - ca * L, y0 = cy - sa * L, x1 = x0 + ca * 2 * L * q, y1 = y0 + sa * 2 * L * q, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const [col, w, al] of [[TW_CRIM, 12 * W, 0.35], [TW_CRIM, 7 * W, 0.7], [TW_GOLD, 3.6 * W, 0.6], [TW_HOT, 2.2 * W, 1]]) { c.globalAlpha = al * k; c.fillStyle = col; c.beginPath(); c.moveTo(x0, y0); c.lineTo(mx - sa * w, my + ca * w); c.lineTo(x1, y1); c.lineTo(mx + sa * w, my - ca * w); c.closePath(); c.fill(); }
        c.restore();
        V.glowAt(c, x1, y1, 16 * W, TW_HOT, k);
      }
      V.glowAt(c, x, cy, 44 * W, TW_CRIM, 0.8 * k);
    } });
  }
  // Tie: a loop of thread flies from her hand to the ally, its line trailing back to her
  function weaveLoopFly(a, b, o = {}) {
    const fly = o.fly ?? 0.24, dur = fly + 0.3;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, t / fly)), k = e.a * Math.min(1, (dur - t) / 0.3);
      const ax = a.x, ay = a.y - 18, bx = b.x, by = b.y - 18, hx = ax + (bx - ax) * q, hy = ay + (by - ay) * q - Math.sin(q * Math.PI) * 30;
      V.neonPath(c, TW_CRIM, 2.2, k, () => { c.moveTo(ax, ay); c.quadraticCurveTo((ax + hx) / 2, Math.min(ay, hy) - 24 * (1 - q * 0.5), hx, hy); });
      V.neonPath(c, TW_ROSE, 1, k * 0.7, () => { c.moveTo(ax, ay - 3); c.quadraticCurveTo((ax + hx) / 2, Math.min(ay, hy) - 34 * (1 - q * 0.5), hx, hy); });
      if (q < 1) { V.neonPath(c, TW_ROSE, 2.6, k, () => c.ellipse(hx, hy, 13, 7, t * 10, 0, TAU)); V.neonPath(c, TW_CRIM, 1.4, k, () => c.ellipse(hx, hy, 8, 12, -t * 8, 0, TAU)); }
      V.glowAt(c, hx, hy, 16, TW_GOLD, 0.7 * k);
    } });
  }
  // a thread coiled round an ally: a helix from their feet to their shoulders that pulls tight, then fades slowly
  function weaveCoil(w, o = {}) {
    const dur = o.dur ?? 1;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      // (online-refs pass) wraps the body (feet to shoulders) and cinches tighter, like a tether locking on
      const tight = easeOut(Math.min(1, t / 0.2)), rx = 28 - 13 * tight, k = e.a * Math.min(1, t / 0.06) * Math.min(1, (1 - p) / 0.5), x = w.x, y = w.y - (w.lift || 0);
      const helix = (ph, col, wd, kk) => V.neonPath(c, col, wd, kk, () => { for (let s = 0; s <= 32; s++) { const q = s / 32, a = q * TAU * 3 + t * 6 + ph, px = x + Math.cos(a) * rx, py = y - 2 - q * 40 + Math.sin(a) * rx * 0.3; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      V.glowAt(c, x, y - 28, 30, TW_CRIM, 0.35 * k);
      helix(0, TW_CRIM, 2.2, k); helix(Math.PI, TW_ROSE, 1.2, k * 0.7);
      V.glowAt(c, x + rx, y - 28, 12, TW_GOLD, 0.8 * k);
    } });
  }
  // (online-refs pass) a thread going taut between two people: a straight line that twangs (a wobble damping out over
  // 0.25s) and fades by 0.4s, a gold knot at each end. Lines only: never a floor shape
  function weaveTaut(a, b) {
    V.fx({ dur: 0.4, layer: 'air', draw: (c, p, t, e) => {
      const ax = a.x, ay = a.y - 16, bx = b.x, by = b.y - 16, L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L;
      const k = e.a * Math.min(1, (1 - p) / 0.5), amp = 9 * Math.exp(-t * 14) * Math.sin(t * 70);
      for (const [col, w, kk] of [[TW_CRIM, 2.6, k], [TW_HOT, 1, k * 0.9]]) V.neonPath(c, col, w, kk, () => { for (let s = 0; s <= 12; s++) { const f = s / 12, o = amp * Math.sin(f * Math.PI); const px = ax + (bx - ax) * f + nx * o, py = ay + (by - ay) * f + ny * o; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      for (const [x, y] of [[ax, ay], [bx, by]]) { V.glowAt(c, x, y, 12, TW_GOLD, 0.8 * k); V.glowAt(c, x, y, 4, '#ffffff', k); }
    } });
  }
  // Needle: a sharp lance of thread shoots at the target, a crimson spiral thread trailing behind it; onHit where it bites
  function weaveLance(sx, sy, tx, ty, onHit) {
    const d = Math.hypot(tx - sx, ty - sy), fly = Math.max(0.08, d / 1500), dur = fly + 0.25, ang = Math.atan2(ty - sy, tx - sx), ca = Math.cos(ang), sa = Math.sin(ang);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = Math.min(1, t / fly), k = e.a * (t < fly ? 1 : Math.max(0, 1 - (t - fly) / 0.25)), hx = sx + (tx - sx) * q, hy = sy - 16 + (ty - sy) * q;
      V.neonPath(c, TW_CRIM, 2.3, k * 0.9, () => { for (let s = 0; s <= 20; s++) { const f = s / 20, L = d * q * f, w = 7 * Math.sin(f * Math.PI) * Math.sin(f * 18 - t * 30); const px = sx + ca * L - sa * w, py = sy - 16 + sa * L + ca * w; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      if (t >= fly) return;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [col, len, w, al] of [[TW_CRIM, 56, 6, 0.45], [TW_ROSE, 44, 3.4, 0.9], ['#ffffff', 28, 1.3, 1]]) { c.globalAlpha = al * k; c.fillStyle = col; c.beginPath(); c.moveTo(hx + ca * 13, hy + sa * 13); c.lineTo(hx - sa * w, hy + ca * w); c.lineTo(hx - ca * len, hy - sa * len); c.lineTo(hx + sa * w, hy - ca * w); c.closePath(); c.fill(); }
      c.restore();
      V.glowAt(c, hx, hy, 18, TW_ROSE, 0.85 * k);
    } });
    V.fx({ dur: fly, layer: 'air', draw: () => {}, done: () => onHit(tx, ty) });
  }
  // where a Needle bites: a small crimson star, and a faint eight-point star etched on the floor for a moment
  function weaveStar(x, y) {
    V.spikeburst(x, y, { r: 40, n: 10, color: TW_CRIM, core: TW_HOT, ink: '#2a0410', dur: 0.3 });
    V.sparks(x, y, { color: TW_ROSE, n: 5, speed: 260 });
    V.fx({ dur: 0.6, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * 0.6 * (1 - p); V.neonPath(c, TW_CRIM, 1.7, k, () => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, L = i % 2 ? 18 : 36; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L * 0.78); } }); } });
  }
  // Shuttle: two threads loop over each other in a chain of figure-eights from her to the target, the gold shuttle at
  // their head; onHit where it strikes
  function weaveShuttleLoops(sx, sy, tx, ty, onHit) {
    const d = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx), ca = Math.cos(ang), sa = Math.sin(ang), fly = 0.3, dur = fly + 0.35, A = Math.min(44, 13 + d * 0.1);
    const pt = (f, s) => { const al = d * (f - 0.1 * Math.sin(f * TAU * 2)), lat = s * A * Math.sin(f * TAU * 1.5); return [sx + ca * al - sa * lat, sy - 16 + sa * al + ca * lat]; };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, t / fly)), k = e.a * Math.min(1, (dur - t) / 0.3);
      for (const s of [1, -1]) V.neonPath(c, s > 0 ? TW_CRIM : TW_ROSE, 2.8, k, () => { for (let i = 0; i <= 30; i++) { const [px, py] = pt(q * i / 30, s); i ? c.lineTo(px, py) : c.moveTo(px, py); } });
      if (t < fly) { const [hx, hy] = pt(q, 0); V.glowAt(c, hx, hy, 26, TW_CRIM, 0.6 * k); V.glowAt(c, hx, hy, 16, TW_GOLD, k); V.glowAt(c, hx, hy, 6, '#ffffff', k); }
    } });
    V.fx({ dur: fly, layer: 'air', draw: () => {}, done: () => onHit(tx, ty) });
  }
  // crossed threads left lying on the floor a moment (Shuttle's aftermath): faint, short
  function weaveFloorThreads(x, y, n, dur) {
    const ls = Array.from({ length: n }, () => ({ a: rand(0, Math.PI), L: rand(75, 125), o: rand(-18, 18) }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1) * (1 - p) * 0.62; if (k < 0.02) return;
      for (const l of ls) { const ca = Math.cos(l.a), sa = Math.sin(l.a) * 0.78, ox = -sa * l.o, oy = ca * l.o; V.neonPath(c, TW_CRIM, 2.2, k, () => { c.moveTo(x + ox - ca * l.L, y + oy - sa * l.L); c.lineTo(x + ox + ca * l.L, y + oy + sa * l.L); }); }
    } });
  }
  globalThis.THREADWEAVER_VFX = { diamond: weaveDiamond, snapBurst: weaveSnapBurst, cross: weaveCross, CRIM: TW_CRIM, ROSE: TW_ROSE, GOLD: TW_GOLD, HOT: TW_HOT };

  ABILITY_VFX.threadweaver = {
    // Needle (painted sheet): a sharp crimson lance with a spiral thread trailing it, a small star where it bites
    // (online-refs pass: Kardia / Atonement) a glint at her hand as the needle leaves; once it bites, the tug: a bead
    // runs down each of her threads to whoever is on the far end, a small heal pop there
    needle: c => { const hx = c.x + Math.cos(c.ang || 0) * 12, hy = c.y + Math.sin(c.ang || 0) * 12, e = c.ent;
      V.glint(hx, hy, { color: TW_HOT, size: 18, z: 16, life: 0.16 });
      weaveLance(hx, hy, c.tx, c.ty, (x, y) => { weaveStar(x, y); runDown(e, TW_ROSE); }); },
    // Tie (painted sheet): a loop of thread flies to the ally and coils round them, pulling tight, then fades
    // (online-refs pass: Fey Union locking on) as it lands the thread snaps taut with a damped twang, a gold knot
    // flashing at both ends; the coil cinches round the body
    tie: c => { const w = c.tent || c.ent, e = c.ent; weaveLoopFly(e, w);
      c.later(0.24, () => { weaveCoil(w, { dur: 0.9 }); if (w !== e) weaveTaut(e, w); V.glint(w.x, w.y, { color: TW_GOLD, size: 28, z: 24 }); V.sparks(w.x, w.y, { color: TW_ROSE, n: 5, speed: 190, z: 22 }); }); },
    // a running stitch of light closes over the ally, then beads run down each of their threads
    mend: c => { const w = c.tent || c.ent;
      V.sigil(w.x, w.y, { r: 42, style: 'runes', color: '#e4d8ff', dur: 0.7, spin: 2, follow: w }); V.plus(w.x, w.y, { color: '#e4d8ff', n: 5 });
      V.fx({ dur: 0.6, layer: 'air', draw: (cc, p, t, e) => { const k = (1 - p) * e.a; cc.save(); cc.setLineDash([5, 4]); cc.lineDashOffset = -t * 40; V.neonPath(cc, '#f2e6ff', 1.6, k, () => cc.ellipse(w.x, w.y - 20, 22, 26, 0, 0, TAU)); cc.restore(); } });
      c.later(0.15, () => runDown(w, '#e4d8ff')); },
    // the shears close over the threads: a flash of silver, and the cut threads let go their heal (thrs plays the snaps)
    snip: c => { const w = c.tent || c.ent;
      V.fx({ dur: 0.4, layer: 'air', draw: (cc, p, t, e) => { const k = (1 - p) * e.a, o = 0.7 * (1 - Math.min(1, p * 2.5)); for (const s of [-1, 1]) V.neonPath(cc, s > 0 ? TW_HOT : TW_ROSE, 3.2, k, () => { const a = -Math.PI / 4 + s * o; cc.moveTo(w.x - Math.cos(a) * 28, w.y - 30 - Math.sin(a) * 28); cc.lineTo(w.x + Math.cos(a) * 28, w.y - 30 + Math.sin(a) * 28); }); } });
      V.glint(w.x, w.y, { color: '#ffffff', size: 38, z: 30 });
      // (painted sheet) the threads snap in a crimson starburst, then a small woven diamond under the ally
      c.later(0.12, () => { weaveSnapBurst(w.x, w.y - 24, { r: 84, n: 16 }); V.sparks(w.x, w.y, { color: TW_ROSE, n: 7, speed: 280, z: 24 }); weaveDiamond(w.x, w.y, 72, 1.4, { peak: 0.8, settle: 0.32, w: 1.3 }); }); },
    // Shuttle (painted sheet): two threads loop over each other in figure-eights out to the boss with the gold shuttle
    // at their head; beads run down her threads (one strike per thread); crossed threads lie a moment where it strikes
    shuttle: c => { runDown(c.ent, TW_ROSE); weaveShuttleLoops(c.x, c.y, c.tx, c.ty, (x, y) => { V.hit(x, y, TW_ROSE, 0.85); weaveSnapBurst(x, y - 20, { r: 50, n: 10 }); V.glint(x, y, { color: TW_GOLD, size: 30, z: 20 }); weaveFloorThreads(x, y, 4, 1.2); }); },
    // Tapestry (painted sheet): a snapping starburst of thread, then a great woven diamond seal under her, ribbons of
    // crimson and gold wheeling out to the party (stagecraft.js draws the web itself while it lasts)
    tapestry: c => { weaveSnapBurst(c.x, c.y - 24, { r: 118, n: 18 }); weaveDiamond(c.x, c.y, 175, 2.4, { peak: 0.9, settle: 0.36, w: 1.4 });
      V.ribbons(c.x, c.y, { r: 112, dur: 1.3, follow: c.ent, colors: [TW_GOLD, TW_CRIM, '#ffffff'] }); V.shock(c.x, c.y, { r: 240, color: TW_GOLD, dur: 0.6, w: 6 }); shake(3); },
    // Embroider: a flower of stitches blooms over the ally and every thread on them lights up
    embroider: c => { const w = c.tent || c.ent; V.sigil(w.x, w.y, { r: 56, style: 'petals', color: '#f0d8ff', dur: 0.9, spin: 3, follow: w }); V.burst(w.x, w.y - 20, { color: '#f0d8ff', color2: '#ffffff', n: 12, speed: 180, kind: 'star', flash: false }); V.plus(w.x, w.y, { color: '#f0d8ff', n: 6 }); c.later(0.1, () => runDown(w, '#f0d8ff')); },
    // Cat's Cradle: a web strung at her feet for 9s, glinting where its strands cross
    cradle: c => { const x = c.x, y = c.y, r = 150;
      V.shock(x, y, { r: r + 20, color: '#cbb8ff', dur: 0.5, w: 5 });
      V.fx({ dur: 9, layer: 'ground', draw: (cc, p, t, e) => {
        // (QA) strung bright, then settled low for the 9s: the white star crossed red telegraphs at full strength
        const k = Math.min(1, p / 0.04, (1 - p) / 0.06) * e.a * (1 - 0.55 * Math.min(1, Math.max(0, (t - 0.7) / 0.5))), pts = [];
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + Math.sin(t * 0.5) * 0.04; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.78]); }
        for (let i = 0; i < 8; i++) for (const j of [3, 5]) { const A = pts[i], B = pts[(i + j) % 8]; V.neonPath(cc, '#cbb8ff', 1.2, k * 0.6, () => { cc.moveTo(A[0], A[1]); cc.lineTo(B[0], B[1]); }); }
        V.neonRing(cc, x, y, r, '#e8deff', 1.4, k * 0.5);
        for (const [px, py] of pts) V.glowAt(cc, px, py, 6, '#f2e6ff', k * 0.7);
      } }); },
  };

  // ---- (rework: passive Jab, Cue, Pull Strings restrings, the Finale as a small omnislash) Marionettist helpers
  // the puppeteer's hand on the control bar, where stagecraft.js draws it, and her three strings out to a Doll
  const mariHs = () => (typeof FX !== 'undefined' && FX.heroScale) || 1.5;
  const mariBar = ent => { const hs = mariHs(), a = ent.angle || 0; return { x: ent.x + Math.cos(a) * 13 * hs, y: ent.y - (ent.lift || 0) + Math.sin(a) * 13 * hs }; };
  const mariStrings = (ent, d, fn) => { const b = mariBar(ent), hs = mariHs(), a = ent.angle || 0;
    for (let s = 0; s < 3; s++) { const off = (s - 1) * 4.5 * hs, nx = -Math.sin(a) * off, ny = Math.cos(a) * off; fn(s, b.x + nx, b.y + ny, d.x + nx * 0.5, d.y + ny * 0.5 - 6 * hs); } };
  // the strings twitch taut: drawn straight and bright, ringing like plucked wire, the ring dying away over dur
  const mariTwang = (ent, d, o = {}) => { const dur = o.dur ?? 0.36, amp = o.amp ?? 7;
    V.fx({ dur, layer: 'air', draw: (cc, p, t, e) => { const k = e.a * (1 - p * p), A = amp * (1 - p) * (1 - p);
      V.neonPath(cc, o.color || '#ffd27a', o.w ?? 1.5, k, () => mariStrings(ent, d, (s, ax, ay, bx, by) => {
        const L = Math.hypot(bx - ax, by - ay) || 1, px = -(by - ay) / L, py = (bx - ax) / L, ph = Math.sin(t * 72 + s * 2.1);
        cc.moveTo(ax, ay); for (let j = 1; j <= 8; j++) { const q = j / 8, w = Math.sin(q * Math.PI) * A * ph; cc.lineTo(ax + (bx - ax) * q + px * w, ay + (by - ay) * q + py * w); } }));
    } }); };
  // a finger snap at (x, y): a white pop with six short ink-tipped ticks flying off it, like a comic-book snap mark
  const mariSnap = (x, y) => V.fx({ dur: 0.2, layer: 'air', draw: (cc, p, t, e) => { const k = e.a * (1 - p), r0 = 4 + 10 * easeOut(p), r1 = r0 + 7 * (1 - p) + 3;
    V.glowAt(cc, x, y, 16 * (1 - p) + 4, '#fff4dc', k);
    V.neonPath(cc, '#ffe6a8', 1.6, k, () => { for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.5 + (i > 2 ? Math.PI : 0); cc.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); cc.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); } });
  } });
  // the passive Jab's sound (k.fx('mari-jab') has no button press to carry one): your own a little under a pressed
  // move, anyone else's soft and placed where they stand; a Cue'd jab a step higher
  const mariJabSnd = (e, fast) => { try {
    if (typeof Sound === 'undefined' || !Sound.play) return;
    const g = typeof window !== 'undefined' && window.__game, mine = !!g && e === g.player, rate = fast ? 1.14 : 1;
    Sound.play('ab-marionettist-jab', mine ? { vol: 0.5, rate, key: 'mari-jab', minGap: 0.12 } : { vol: 0.18, rate, remote: true, at: e, key: 'mari-jab:' + (e.id || ''), minGap: 0.3 });
  } catch (err) { /* sound never stops a frame */ } };
  // Grand Finale, a small omnislash: the Doll blinks between five points round the target, each blink one crimson
  // streak through it (a pentagram, chord by chord; the fifth gold and back onto its mark). The kit's
  // k.fx('finale-beat', { i, n }) times the beats when it sends them; otherwise the cast recipe counts them itself
  const MARI_FIN = { GAP: 0.3, R0: 64, R1: 112, F: 0.62 };
  const finSt = new Map();
  const finKitBeats = () => { if (finKitBeats.v == null) { try { const ab = KITS.marionettist.abilities.find(a => a.id === 'finale'); finKitBeats.v = /finale-beat/.test(String(ab && ab.effect)); } catch (err) { finKitBeats.v = false; } } return finKitBeats.v; };
  function finSetup(ent, tx, ty, n, ext) {
    const id = idOf(ent), now = FX.now || 0, old = finSt.get(id);
    if (old && old.ext && !old.finAt && now >= old.t0 && now - old.t0 < 0.3) return old;   // (the kit's first beat got here before the cast)
    n = Math.max(1, Math.min(8, n | 0 || 5));
    const F = MARI_FIN.F, d0 = dollsOf(ent)[0], ea = Math.atan2(ent.y - ty, ent.x - tx);
    const home = d0 ? { x: d0.x, y: d0.y } : { x: tx + Math.cos(ea) * MARI_FIN.R0, y: ty + Math.sin(ea) * MARI_FIN.R0 * F };
    const R = Math.max(MARI_FIN.R0, Math.min(MARI_FIN.R1, Math.hypot(home.x - tx, (home.y - ty) / F))), a0 = Math.atan2((home.y - ty) / F, home.x - tx);
    const th = n % 2 ? TAU * Math.floor((n - 1) / 2) / n : Math.PI - Math.PI / n;   // (five: 144 degrees, a pentagram that closes on the mark)
    const pts = []; for (let j = 0; j <= n; j++) pts.push(j === 0 || j === n ? home : { x: tx + Math.cos(a0 + j * th) * R, y: ty + Math.sin(a0 + j * th) * R * F });
    const st = { t0: now, last: now, tx, ty, n, pts, home, done: 0, seen: new Set(), ext: !!ext, gap: MARI_FIN.GAP, finAt: 0 };
    finSt.set(id, st);
    act(ent, 'away');   // the real Doll steps off its mark for the show; the last beat's 'spin' brings it home
    // the star drawn so far: a thin gold line in the air for every chord cut, the newest brightest, gone after the bow
    const dur = 0.3 + n * (ext ? 0.5 : MARI_FIN.GAP) + 0.6;
    V.fx({ dur, layer: 'air', draw: (cc, p, t, e) => {
      const fin = st.finAt ? (FX.now || 0) - st.finAt : 0, k = e.a * Math.min(1, (dur - t) / 0.3) * (st.finAt ? Math.max(0, 1 - fin / 0.5) : 1);
      if (k < 0.02 || !st.done) return;
      V.neonPath(cc, '#ffd27a', 1, 0.3 * k, () => { for (let j = 0; j < st.done - 1; j++) { cc.moveTo(pts[j].x, pts[j].y - 14); cc.lineTo(pts[j + 1].x, pts[j + 1].y - 14); } });
      const j = st.done - 1; V.neonPath(cc, '#ffe6a8', 1.4, 0.6 * k, () => { cc.moveTo(pts[j].x, pts[j].y - 14); cc.lineTo(pts[j + 1].x, pts[j + 1].y - 14); });
    } });
    return st;
  }
  function finBeat(ent, st, i, cam) {
    i = Math.max(0, Math.min(st.n - 1, i | 0));
    if (st.seen.has(i)) return;
    st.seen.add(i);
    const now = FX.now || 0, MP = MARI_PAINT, C = MP.C;
    if (st.ext && i > 0) st.gap = Math.max(0.15, Math.min(0.6, (now - st.last) / Math.max(1, i - (st.done - 1))));
    st.last = now; st.done = Math.max(st.done, i + 1);
    const A = st.pts[i], B = st.pts[i + 1], last = i === st.n - 1, ang = Math.atan2(B.y - A.y, B.x - A.x), L = Math.hypot(B.x - A.x, B.y - A.y), g = 1 + 0.12 * i;
    const col = last ? C.GOLD : i % 2 ? '#ff3a5c' : C.CRIM, hold = last ? 0.3 : st.gap + 0.06, lean = (B.x >= A.x ? 1 : -1) * 0.5;
    // the streak, chord by chord a little wider and brighter
    MP.stroke((A.x + B.x) / 2, (A.y + B.y) / 2, ang, { r: L / 2 + 6, w: (5 + i) * (last ? 1.2 : 1), dur: 0.3, go: 0.06, z: 16, color: col });
    // the Doll: three fading afterimages strung along the chord, then itself, held where it lands until the next blink
    V.fx({ dur: hold, layer: 'air', draw: (cc, p, t, e) => {
      if (t < 0.12) for (let s = 1; s <= 3; s++) { const q = s / 4; MP.doll(cc, A.x + (B.x - A.x) * q, A.y + (B.y - A.y) * q, 1.15, e.a * (0.12 + 0.12 * s) * (1 - t / 0.12), lean, C.PINK); }
      const k = e.a * Math.min(1, t / 0.03, (hold - t) / 0.07);
      MP.doll(cc, B.x, B.y, 1.25, k, last ? 0 : lean * (1 - Math.min(1, t / 0.15)));
    } });
    // where the streak passes the target: a pin-prick hit and a few sparks thrown across the cut
    V.hit(st.tx, st.ty, last ? '#ffe6a8' : '#ff9ab0', 0.45 + 0.1 * i);
    V.sparks(st.tx, st.ty - 16, { color: last ? '#ffe6a8' : '#ff9ab0', n: 2 + (i >> 1), angle: ang + Math.PI / 2, spread: 0.6, speed: 260 * g });
    if (!last) return;
    // the fifth: gold, a short hit-stop, two gold rings open on the target, petals; the Doll lands back on its mark
    st.finAt = now;
    if (cam) { shake(3); cam.stop(0.045); }   // (your own Finale only: four Marionettists don't shake each other's screens)
    V.glint(st.tx, st.ty, { color: '#ffffff', size: 34, z: 20 });
    V.shock(st.tx, st.ty, { r: 96, color: C.GOLD, dur: 0.45, w: 4 }); V.shock(st.tx, st.ty, { r: 64, color: '#ffe6a8', dur: 0.4, w: 2.5, delay: 0.06 });
    MP.petals(st.tx, st.ty, { n: 9, speed: 240, life: 1.3 });
    OLD_PAINT.later(0.12, () => { act(ent, 'spin'); V.glint(B.x, B.y, { color: '#ffe6a8', size: 26, z: 30 }); MP.petals(B.x, B.y, { n: 5, speed: 150, life: 1.1 }); });
  }

  ABILITY_VFX.marionettist = {
    // (painted pass, marionettist.png: crimson velvet, rose petals, gold strings and footlights)
    // the Doll stabs: a quick crimson cut from where it stands
    // (polish) the Doll lunges: a crimson stab of light with an arrowhead from the Doll into the enemy, a small crimson
    // X where it lands, a few petals
    // (online-refs pass, after FF14's Automaton Queen: the owner only cues, the summoned body hits) a gold twitch runs down
    // the string, then the Doll lunges in a straight crimson stab; a pin-prick star and two petals where it lands. Jab is a
    // point and never the X (the X is Cross-Cut's), and it is over in about 0.3s
    jab: c => { act(c.ent, 'jab'); const ox = c.ent.x, oy = c.ent.y - 12; for (const d of dollsOf(c.ent)) { const a = Math.atan2(c.ty - d.y, c.tx - d.x), L = Math.min(110, Math.max(40, Math.hypot(c.tx - d.x, c.ty - d.y))), dx = d.x, dy = d.y, px = dx + Math.cos(a) * L, py = dy + Math.sin(a) * L;
      V.fx({ dur: 0.1, layer: 'air', draw: (cc, p, t, e) => { const q = easeOut(p); V.glowAt(cc, ox + (dx - ox) * q, oy + (dy - 12 - oy) * q, 8, '#ffd27a', 0.9 * e.a); } });
      c.later(0.05, () => OLD_PAINT.thrust(dx, dy, px, py, { w: 6, color: '#e0203c', core: '#ffe6ec', ink: '#2a0410', head: true, dur: 0.2, z: 16 }));
      c.later(0.11, () => { V.hit(px, py, '#ffb0c4', 0.55); V.glint(px, py, { color: '#ffffff', size: 22, z: 18 }); MARI_PAINT.petals(px, py, { n: 2, speed: 140, life: 0.9 }); }); } },
    // (rework) Cue: she snaps her fingers (a white pop and snap ticks at the control bar), the strings twitch taut and
    // ring, and the Doll lunges: a longer, heavier crimson stab than a Jab with a gold rim, a bigger four-point star and
    // a few petals where it lands; three gold beads circle the Doll's head a moment for the three quick Jabs to come.
    // Still a point (the X is Cross-Cut's), over in about 0.4s
    cue: c => { const ent = c.ent, b = mariBar(ent), MP = MARI_PAINT;
      mariSnap(b.x, b.y - 22); V.sparks(b.x, b.y - 22, { color: '#ffe6a8', n: 3, speed: 160 });
      const ds = dollsOf(ent);
      c.later(0.04, () => { for (const d of ds) mariTwang(ent, d, { dur: 0.34, amp: 8, w: 1.7 }); });
      c.later(0.09, () => act(ent, 'jab'));
      for (const d of ds) { const a = Math.atan2(c.ty - d.y, c.tx - d.x), L = Math.min(130, Math.max(48, Math.hypot(c.tx - d.x, c.ty - d.y))), dx = d.x, dy = d.y, px = dx + Math.cos(a) * L, py = dy + Math.sin(a) * L;
        c.later(0.1, () => { OLD_PAINT.thrust(dx - Math.cos(a) * 16, dy - Math.sin(a) * 16, px, py, { w: 11, color: '#ffd27a', core: '#ffffff', ink: '#2a0410', head: true, dur: 0.22, z: 16 });
          OLD_PAINT.thrust(dx - Math.cos(a) * 12, dy - Math.sin(a) * 12, px, py, { w: 8, color: '#e0203c', core: '#ffe6ec', ink: '#2a0410', head: true, dur: 0.24, z: 16 }); });
        c.later(0.16, () => { V.hit(px, py, '#ff9ab0', 0.85); V.spikeburst(px, py, { r: 26, n: 4, color: '#e0203c', core: '#ffe6ec', ink: '#2a0410', dur: 0.2, z: 18 }); V.glint(px, py, { color: '#ffffff', size: 30, z: 18 }); MP.petals(px, py, { n: 4, speed: 180, life: 1 }); });
        V.fx({ dur: 0.9, delay: 0.2, layer: 'air', draw: (cc, p, t, e) => { const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.4);
          for (let i = 0; i < 3; i++) { const an = t * 7 + i * TAU / 3; V.glowAt(cc, dx + Math.cos(an) * 12, dy - 40 + Math.sin(an) * 4, 5, '#ffd27a', k); } } }); } },
    // Pull Strings (the Doll Summon panel): the string from the bar draws taut in gold, then the Doll is let down on three
    // gold strings with a crimson ribbon spiralling round it, rings where it lands and a few petals settling
    pull: c => { act(c.ent, 'pull'); const MP = MARI_PAINT; c.later(0.03, () => { for (const d of dollsOf(c.ent)) { threadOut(c.ent, d, { color: '#ffd27a', w: 1.4, grow: 0.12, dur: 0.4 }); MP.dollDrop(d.x, d.y, { dur: 0.5 });
      V.smoke(d.x, d.y, { n: 3, color: '#f0d8e8', size: 20, a: 0.3, speed: 50 }); MP.petals(d.x, d.y, { n: 9, speed: 150, life: 1.3 }); V.glint(d.x, d.y, { color: '#ffffff', size: 26, z: 34 }); } }); },
    // Cross-Cut: every string goes rigid and bright crimson for a moment, a blade from the bar to the Doll; where the line
    // crosses the enemy a bright crimson X flashes, rose petals burst off it and a faint X stays scored on the floor
    // (online-refs pass) anticipation, then the cut. For T s the strings draw taut (they sag, straighten and brighten in gold
    // while a white bead runs out to the Doll); then they flash crimson as blades and the X is cut in two strokes, the first
    // along the string's own line, the second across it a beat later (a two-stroke cross, like FF14's Cross Reaping). A
    // landed cut gets a short cosmetic hit-stop; a miss stays smaller
    cross: c => { act(c.ent, 'cut'); const MP = MARI_PAINT, ds = dollsOf(c.ent).map(d => ({ x: d.x, y: d.y })), ox = c.ent.x, oy = c.ent.y, T = 0.11;
      V.fx({ dur: T + 0.36, layer: 'air', draw: (cc, p, t, e) => { for (const d of ds) { const sx = ox, sy = oy - 12, dx = d.x, dy = d.y - 12;
        if (t < T) { const q = easeOut(t / T), mx = (sx + dx) / 2, my = (sy + dy) / 2 + 18 * (1 - q), u = q;
          V.neonPath(cc, '#ffd27a', 1 + 0.8 * q, e.a * (0.4 + 0.6 * q), () => { cc.moveTo(sx, sy); cc.quadraticCurveTo(mx, my, dx, dy); });
          V.glowAt(cc, (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * dx, (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * dy, 9, '#ffffff', 0.9 * e.a);
        } else { const u = (t - T) / 0.36, k = (1 - u) * e.a, w = 5.5 * (1 - u) + 1.2; V.neonPath(cc, '#e0203c', w, k, () => { cc.moveTo(sx, sy); cc.lineTo(dx, dy); }); V.neonPath(cc, '#ffd27a', 1.3, k, () => { cc.moveTo(sx, sy); cc.lineTo(dx, dy); }); } } } });
      c.later(T, () => { for (const d of ds) V.sparks((ox + d.x) / 2, (oy + d.y) / 2, { color: '#ff9ab0', n: 4, angle: Math.atan2(d.y - oy, d.x - ox) + Math.PI / 2, spread: 0.6, speed: 240 }); });
      // the X goes on the enemy when it stands on a string's line, otherwise halfway along the longest string; its first
      // stroke follows that string
      let at = null, best = null, la = null;
      for (const d of ds) { const sa = Math.atan2(d.y - oy, d.x - ox); if (kitSegDist(c.tx, c.ty, ox, oy, d.x, d.y) < 70) { at = { x: c.tx, y: c.ty }; la = sa; } const L = Math.hypot(d.x - ox, d.y - oy); if (!best || L > best.L) best = { L, x: (ox + d.x) / 2, y: (oy + d.y) / 2, a: sa }; }
      const hit = at || best || { x: c.tx, y: c.ty }, big = !!at || !ds.length, a1 = la != null ? la : best ? best.a : Math.atan2(c.ty - oy, c.tx - ox) + 0.7;
      c.later(T, () => { MP.stroke(hit.x, hit.y, a1, { r: big ? 84 : 52, w: big ? 10 : 6, dur: 0.4, scar: big ? 1.3 : 0.7 });
        if (big) { if (c.cam) c.cam.stop(0.04); shake(2); V.hit(hit.x, hit.y, '#ff5a7a', 0.9); } });
      c.later(T + 0.06, () => { MP.stroke(hit.x, hit.y, a1 + 1.45, { r: big ? 74 : 46, w: big ? 8 : 5, dur: 0.38, color: '#ff5a7a', scar: big ? 1.3 : 0.7 }); MP.petals(hit.x, hit.y, { n: big ? 12 : 5, speed: 260, life: 1.3 });
        if (big) V.sparks(hit.x, hit.y - 12, { color: '#ffd27a', n: 6, speed: 360 }); }); },
    // Pirouette: tilted rings of rose and gold light spin round the Doll, two cuts sweep it, petals fly; a small rose
    // sigil is left a moment under where it spun
    // (online-refs pass, after the Dancer's Pirouette step) the spin is read as two ribbons winding up round the Doll, then
    // let go as one ring flung outward with the petals; the rose sigil after it is small and faint. Lighter than the old
    // four rings and two slashes, since it is a GCD
    pirouette: c => { act(c.ent, 'spin'); const MP = MARI_PAINT; for (const d of dollsOf(c.ent)) { const x = d.x, y = d.y;
      MP.ribbons(x, y, { r: 36, dur: 0.45 });
      c.later(0.22, () => { V.shock(x, y, { r: 82, color: '#ff5a7a', dur: 0.32, w: 3 }); V.shock(x, y, { r: 60, color: '#ffd27a', dur: 0.3, w: 2, delay: 0.04 }); MP.petals(x, y, { n: 8, speed: 230, life: 1.2 }); });
      c.later(0.32, () => MP.roseSigil(x, y, { r: 48, dur: 1.0, a: 0.35 })); } },
    // Swap: pale afterimages strung along both ways, a pillar of rose light where each of them reappears, and a gold
    // string left between them a moment
    swap: c => { act(c.ent, 'swap'); const MP = MARI_PAINT; c.later(0.03, () => { const ex = c.ent.x, ey = c.ent.y;
      for (const d of dollsOf(c.ent)) { MP.ghostTrail(ex, ey, d.x, d.y, { s: 1.4 }); MP.ghostTrail(d.x, d.y, ex, ey, { s: 1.9 }); V.pillar(d.x, d.y, { r: 18, h: 140, color: '#ff7a94', dur: 0.5 }); V.shock(d.x, d.y, { r: 54, color: '#ffd27a', dur: 0.35, w: 3 }); threadOut(c.ent, d, { color: '#ffd27a', w: 1.4, grow: 0.15, dur: 0.8 }); MP.petals(d.x, d.y, { n: 6, speed: 140, life: 1.2 }); }
      V.pillar(ex, ey, { r: 20, h: 160, color: '#ff7a94', dur: 0.5, follow: c.ent }); V.shock(ex, ey, { r: 60, color: '#e0203c', dur: 0.38, w: 3.5 }); MP.petals(ex, ey, { n: 7, speed: 160, life: 1.2 }); }); },
    // Grand Finale (rework: a small omnislash, finSetup / finBeat above): the strings twitch gold, the Doll vanishes off
    // its mark in a puff of petals and blinks round the target, one streak per hit, the fifth gold and home again with a
    // spin. About 1.5s, inside a ring about the target's size. The beats follow the kit's 'finale-beat' when it sends them
    finale: c => { const ent = c.ent, ds = dollsOf(ent), MP = MARI_PAINT, n = 5, ext = finKitBeats();
      for (const d of ds) { mariTwang(ent, d, { dur: 0.3, amp: 6 }); V.glint(d.x, d.y, { color: '#ffffff', size: 24, z: 26 }); V.smoke(d.x, d.y, { n: 2, color: '#f0c8d8', size: 18, a: 0.3, speed: 50 }); MP.petals(d.x, d.y, { n: 4, speed: 140, life: 0.9 }); }
      const st = finSetup(ent, c.tx, c.ty, n, ext);
      for (let i = 0; i < n; i++) c.later(0.06 + MARI_FIN.GAP * i, () => { if (!st.ext) finBeat(ent, st, i, c.cam); }); },
    // Tangle: the Doll lunges and its strings wind round the enemy in rose and gold loops that tighten
    tangle: c => { act(c.ent, 'jab'); const tx = c.tx, ty = c.ty;
      V.fx({ dur: 0.9, layer: 'air', draw: (cc, p, t, e) => { const k = Math.min(1, (1 - p) / 0.3) * e.a; for (let i = 0; i < 4; i++) { const R = 44 * (1 - p * 0.45); V.neonPath(cc, i % 2 ? '#ffd27a' : '#ff5a7a', 1.4, k, () => cc.ellipse(tx, ty - 30, R, R * 0.35, i * Math.PI / 4 + t * 2, 0, TAU)); } } });
      c.later(0.3, () => { V.hit(tx, ty, '#ff9ab0', 0.8); V.spikeburst(tx, ty, { r: 36, n: 10, color: '#e0203c', core: '#ffe6ec', ink: '#2a0410', dur: 0.28, z: 24 }); MARI_PAINT.petals(tx, ty, { n: 5, speed: 160, life: 1.2 }); });
      // (polish) the strings stay wound round it, faint, for the bleed's 10s, a drop of crimson falling now and then
      OLD_PAINT.linger(10, 'air', (cc, k, t) => { if (t < 0.85) return; const kk = k * Math.min(1, (t - 0.85) / 0.3);
        for (let i = 0; i < 2; i++) V.neonPath(cc, i ? '#ffd27a' : '#ff5a7a', 1.1, kk, () => cc.ellipse(tx, ty - 30 + i * 8, 26, 9, i * 0.5 + Math.sin(t * 1.5) * 0.08, 0, TAU)); },
        { peak: 0.7, settle: 0.5, hold: 1.5, tick: () => { if (Math.random() < 0.05) V.spawn({ x: tx + (Math.random() - 0.5) * 30, y: ty, z: 26, vz: -10, g: 500, life: 0.5, size: 6, color: '#c01a2a', kind: 'drop', add: false, rot: Math.PI / 2 }); } }); },
    // Red Curtain: velvet drops in a ring round the puppeteer, gold fringe glinting, for 8s
    // (polish) velvet drapes drop from above round the back of the ring and pool on the floor, then the curtain's ring
    // holds for the 8s: pleats round its edge, a gold fringe, footlights glowing along its front (bright as it drops,
    // then low, so telegraphs read through it)
    redcurtain: c => { const ent = c.ent, r = 140;
      V.fx({ dur: 0.7, layer: 'air', draw: (cc, p, t, e) => { const x = ent.x, y = ent.y, k = e.a * Math.min(1, (1 - p) / 0.35), fall = easeOut(Math.min(1, p / 0.5));
        for (let i = 0; i < 9; i++) { const a = Math.PI + 0.15 + i * (Math.PI - 0.3) / 8, bx = x + Math.cos(a) * r, by = y + Math.sin(a) * r * 0.78, top = by - 120, bot = top + (by - top) * fall, w = 12;
          // (QA) velvet, not flat red slabs: shaded across its folds (dark at the edges, lit down the middle), a dark
          // ink edge, two pleat lines, and kept a little see-through (it drops over the party for a moment)
          const vg = cc.createLinearGradient(bx - w, 0, bx + w, 0); vg.addColorStop(0, '#4a0818'); vg.addColorStop(0.45, i % 2 ? '#b8203e' : '#d83656'); vg.addColorStop(1, '#5a0a1e');
          cc.globalAlpha = 0.72 * k; cc.fillStyle = vg; cc.beginPath(); cc.moveTo(bx - w, top); cc.lineTo(bx + w, top); cc.quadraticCurveTo(bx + w * 1.2, (top + bot) / 2, bx + w * 0.8, bot); cc.lineTo(bx - w * 0.8, bot); cc.quadraticCurveTo(bx - w * 1.2, (top + bot) / 2, bx - w, top); cc.fill();
          cc.strokeStyle = '#2a0410'; cc.lineWidth = 1.2; cc.stroke();
          cc.globalAlpha = 0.5 * k; cc.strokeStyle = '#ff8aa0'; cc.lineWidth = 1; cc.beginPath(); for (const f of [-0.35, 0.3]) { cc.moveTo(bx + w * f, top + 4); cc.quadraticCurveTo(bx + w * f * 1.3, (top + bot) / 2, bx + w * f * 0.9, bot - 4); } cc.stroke();
          cc.globalAlpha = k; cc.fillStyle = '#ffd27a'; cc.fillRect(bx - w * 0.8, bot - 3, w * 1.6, 3); }
        cc.globalAlpha = 1; } });
      OLD_PAINT.linger(8, 'ground', (cc, k, t) => { const x = ent.x, y = ent.y;
        // (QA) a red-filled 140px circle for 8s read as a boss telegraph: the fill is now a bare warm tint and the
        // pleats a darker wine, so the ring reads by its gold rim and footlights
        cc.globalAlpha = 0.05 * k; cc.fillStyle = '#ffcf6a'; cc.beginPath(); cc.ellipse(x, y, r, r * 0.78, 0, 0, TAU); cc.fill(); cc.globalAlpha = 1;
        for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + Math.sin(t + i) * 0.03; V.neonPath(cc, i % 2 ? '#8a1830' : '#5a0a1e', 5, k * 0.6, () => { cc.moveTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.67); cc.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.78); }); }
        V.neonRing(cc, x, y, r, '#ffd27a', 1.4, k * 0.8);
        for (let i = 0; i < 7; i++) { const a = 0.35 + i * (Math.PI - 0.7) / 6; V.glowAt(cc, x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.73, 12, '#ffcf6a', k * (0.7 + 0.15 * Math.sin(t * 6 + i))); } },
        { peak: 1, settle: 0.45, hold: 0.8 });
      c.later(0.35, () => { MARI_PAINT.petals(ent.x, ent.y, { n: 14, r, mode: 'fall', life: 1.6 }); V.smoke(ent.x, ent.y - 10, { n: 5, r: 90, color: '#c07080', size: 26, a: 0.25, speed: 30 }); });
      V.shock(ent.x, ent.y, { r: 160, color: '#d03050', dur: 0.5, w: 6 }); },
  };

  Object.assign(KIT_VFX, {
    // a thread snapping: the two halves recoil toward their ends; a cut one lets go a little shower of light (its heal)
    threadSnap: (a, b, kind) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 14, col = kind === 1 ? TW_ROSE : kind === 2 ? '#cbb8ff' : '#f2e6ff';
      if (kind === 1) weaveSnapBurst(mx, my, { r: 44, n: 10 });   // cut by Snap: the painted sheet's crimson starburst
      if (kind === 2) { V.fx({ dur: 0.35, layer: 'air', draw: (c, p, t, e) => { const x = a.x + (b.x - a.x) * p, y = a.y - 12 + (b.y - a.y) * p; V.glowAt(c, x, y, 12, '#cbb8ff', e.a); } }); return; }
      V.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => {
        const k = (1 - p) * e.a;
        for (const [ex, ey] of [[a.x, a.y - 14], [b.x, b.y - 14]]) { const q = 0.5 + p * 0.5, sx = mx + (ex - mx) * q, sy = my + (ey - my) * q + Math.sin(p * 20) * 6 * (1 - p); V.neonPath(c, col, 1.6, k, () => { c.moveTo(ex, ey); c.quadraticCurveTo((ex + sx) / 2, (ey + sy) / 2 + 8 * p, sx, sy); }); }
      } });
      V.glint(mx, my + 14, { color: '#ffffff', size: kind === 1 ? 30 : 18, z: 14 });
      V.sparks(mx, my + 14, { color: col, n: kind === 1 ? 10 : 5, speed: 200 });
      for (const w of [a, b]) V.plus(w.x, w.y, { color: col, n: kind === 1 ? 4 : 2 });
    },
    tapestryEnd: e => { V.shock(e.x, e.y, { r: 250, color: TW_GOLD, dur: 0.6, w: 6 }); weaveDiamond(e.x, e.y, 140, 1.2, { peak: 0.7, settle: 0.34, w: 1.3 }); V.motes(e.x, e.y, { color: TW_GOLD, n: 10, r: 120, kind: 'star' }); },
    // a String tears: a spark at the bar and the frayed end whipping loose
    strtear: (e, t, d) => { const a = e.angle || 0, x = e.x + Math.cos(a) * 24, y = e.y + Math.sin(a) * 24; V.sparks(x, y, { color: d && d.w ? '#ff8a9a' : '#f6e6f0', n: 6, speed: 220 }); V.glint(x, y, { color: '#ff9ab0', size: 18, z: 16 }); },
    limp: e => { for (const dl of dollsOf(e)) { V.smoke(dl.x, dl.y, { n: 5, color: '#8a7a78', size: 20, a: 0.45, speed: 30 }); V.debris(dl.x, dl.y, { n: 3, color: '#c89a64', speed: 0.5 }); } },
    // (painted pass) the Doll comes back to life: let down again on gold strings (the Doll Summon panel)
    unlimp: e => { for (const dl of dollsOf(e)) { V.glint(dl.x, dl.y, { color: '#ffffff', size: 22, z: 30 }); threadOut(e, dl, { color: '#ffd27a', w: 1.2, grow: 0.2, dur: 0.5 }); MARI_PAINT.dollDrop(dl.x, dl.y, { dur: 0.5 }); MARI_PAINT.petals(dl.x, dl.y, { n: 5, speed: 110, life: 1.1 }); } },
    flourish: (e, t) => { for (const dl of dollsOf(e)) V.slash(dl.x, dl.y, (t ? Math.atan2(t.y - dl.y, t.x - dl.x) : 0) + 0.6, { r: 42, span: 1, color: '#ff9ab0', w: 0.35, dur: 0.18, flip: true }); },
    // (QA) bubble, not the hex shield (~450 canvas calls a Doll for a half-second flicker), and a petal ring to sell it
    standin: e => { for (const dl of dollsOf(e)) { V.shield(dl, { color: '#f0a8cc', dur: 0.5, r: 30 }); V.shock(dl.x, dl.y, { r: 40, color: '#ff9ab0', dur: 0.3, w: 2.5 }); } },
    // (polish) the kit's verdict on a Cross-Cut (data.n: how many strings caught the enemy): a hit gets a gold encore
    // flourish on the enemy (stars, two gold rings, rose petals, bigger for each string); a miss lets every string go
    // slack, drooping grey-rose to the floor, with a dull puff where it sags
    cut: Object.assign((e, t, d) => { const n = (d && d.n) | 0;
      if (n > 0 && t) { OLD_PAINT.later(0.12, () => { for (let i = 0; i < Math.min(3, n); i++) V.shock(t.x, t.y, { r: 70 + i * 30, color: '#ffd27a', dur: 0.45, w: 4 - i, delay: i * 0.07 });
        V.burst(t.x, t.y - 30, { color: '#ffd27a', color2: '#ffffff', n: 6 + 4 * n, speed: 220, kind: 'star', flashR: 50 }); MARI_PAINT.petals(t.x, t.y, { n: 6 + 3 * n, speed: 220, life: 1.4 }); }); return; }
      for (const dl of dollsOf(e)) { const ox = e.x, oy = e.y - 12, dx = dl.x, dy = dl.y - 12, mx = (ox + dx) / 2, my = (oy + dy) / 2;
        V.fx({ dur: 0.7, layer: 'air', draw: (cc, p, tt, fx) => { const k = fx.a * (1 - p), sag = 10 + 34 * easeOut(Math.min(1, p / 0.5));
          V.neonPath(cc, '#c8a0a8', 1.2, k * 0.8, () => { cc.moveTo(ox, oy); cc.quadraticCurveTo(mx, my + sag * 2, dx, dy); }); } });
        OLD_PAINT.later(0.25, () => { V.smoke(mx, my + 30, { n: 3, color: '#8a7a78', size: 18, a: 0.35, speed: 25 }); MARI_PAINT.petals(mx, my + 20, { n: 3, mode: 'fall', r: 20, life: 1, a: 0.6 }); }); } }, { atTarget: true }),
    // a pull goes taut: a gold snap at the Doll pulled (data.i)
    pull: (e, t, d) => { const dl = dollsOf(e)[(d && d.i) | 0]; if (!dl) return; OLD_PAINT.later(0.05, () => { V.shock(dl.x, dl.y, { r: 46, color: '#ffd27a', dur: 0.3, w: 3 }); V.sparks(dl.x, dl.y - 16, { color: '#ffe6a8', n: 5, speed: 180 }); }); },
    // a swap lands: a flutter of silk at both ends of the trade
    swap: (e, t, d) => { const dl = dollsOf(e)[(d && d.i) | 0]; for (const w of dl ? [e, dl] : [e]) { V.glint(w.x, w.y, { color: '#ffffff', size: 24, z: 30 }); MARI_PAINT.petals(w.x, w.y, { n: 4, speed: 120, life: 1 }); } },
    // Grand Finale spends the Encore (data.e): that many gold stars burst up off the puppeteer and stream to the Doll
    finale: (e, t, d) => { const n = Math.max(1, Math.min(10, (d && d.e) | 0 || 5)), ds = dollsOf(e);
      for (let i = 0; i < n; i++) { const to = ds.length ? ds[i % ds.length] : (t || e); OLD_PAINT.later(i * 0.05, () => V.missile(e.x, e.y - 20, to.x, to.y - 20, { style: 'orb', color: '#ffd27a', speed: 520, size: 0.5, arc: 50 + (i % 3) * 20, onHit: (x, y) => V.glint(x, y, { color: '#ffe6a8', size: 18, z: 20 }) })); }
      V.burst(e.x, e.y - 30, { color: '#ffd27a', color2: '#ffffff', n: 8 + n, speed: 200, kind: 'star', flash: false }); },
    mend: e => { for (const dl of dollsOf(e)) V.glint(dl.x, dl.y, { color: '#ffffff', size: 18, z: 26 }); },
    // (rework) the passive Jab, every couple of seconds: Jab's look without the puppeteer's gold twitch (the Doll jabs on
    // its own now): a straight crimson lunge, a pin-prick star and two petals. data.fast (the three quick Jabs after a
    // Cue): quicker and brighter, a white-cored rose lunge with a gold glint and two gold sparks, no petals
    'mari-jab': (e, t, d) => { const fast = !!(d && d.fast); act(e, 'jab'); mariJabSnd(e, fast);
      if (!t) return;
      for (const dl of dollsOf(e)) { const a = Math.atan2(t.y - dl.y, t.x - dl.x), L = Math.min(110, Math.max(40, Math.hypot(t.x - dl.x, t.y - dl.y))), dx = dl.x, dy = dl.y, px = dx + Math.cos(a) * L, py = dy + Math.sin(a) * L;
        if (fast) { OLD_PAINT.thrust(dx, dy, px, py, { w: 6, color: '#ff3a5c', core: '#ffffff', ink: '#2a0410', head: true, dur: 0.14, z: 16 });
          OLD_PAINT.later(0.04, () => { V.hit(px, py, '#ffd0dc', 0.5); V.glint(px, py, { color: '#ffe6a8', size: 22, z: 18 }); V.sparks(px, py - 14, { color: '#ffd27a', n: 2, angle: a, spread: 0.5, speed: 220 }); });
        } else { OLD_PAINT.later(0.03, () => OLD_PAINT.thrust(dx, dy, px, py, { w: 6, color: '#e0203c', core: '#ffe6ec', ink: '#2a0410', head: true, dur: 0.2, z: 16 }));
          OLD_PAINT.later(0.09, () => { V.hit(px, py, '#ffb0c4', 0.55); V.glint(px, py, { color: '#ffffff', size: 20, z: 18 }); MARI_PAINT.petals(px, py, { n: 2, speed: 140, life: 0.9 }); }); } } },
    // (rework) Pull Strings restores the Strings (data.n: how many came back): the three strings re-knit in gold from her
    // hand to the Doll one after another, a bead of light at each growing tip, and a gold knot glints at the Doll for each
    // one restored. data.revived: the limp Doll is jerked upright (its lean pose), a gold ring at its feet, a short
    // crimson-and-gold ribbon flourish round it and a few petals
    restring: (e, t, d) => { const n = Math.max(0, Math.min(3, (d && d.n) | 0)), rev = !!(d && d.revived), hs = mariHs();
      if (rev) act(e, 'pull');
      for (const dl of dollsOf(e)) { const x = dl.x, y = dl.y, D = { x, y };
        V.fx({ dur: 0.62, layer: 'air', draw: (cc, p, tt, fx) => { const k = fx.a * Math.min(1, (0.62 - tt) / 0.25);
          mariStrings(e, D, (s, ax, ay, bx, by) => { const q = easeOut(Math.max(0, Math.min(1, (tt - s * 0.07) / 0.2))); if (q <= 0) return;
            const ex = ax + (bx - ax) * q, ey = ay + (by - ay) * q, sag = 16 * (1 - q);
            V.neonPath(cc, '#ffd27a', 1.3, k, () => { cc.moveTo(ax, ay); cc.quadraticCurveTo((ax + ex) / 2, (ay + ey) / 2 + sag, ex, ey); });
            if (q < 1) V.glowAt(cc, ex, ey, 7, '#ffffff', 0.9 * k); });
        } });
        OLD_PAINT.later(0.3, () => { V.glint(x, y - 6 * hs, { color: '#ffe6a8', size: 16 + 4 * n, z: 26 }); if (n) V.sparks(x, y - 18, { color: '#ffe6a8', n: 1 + n, speed: 150 }); });
        if (rev) OLD_PAINT.later(0.3, () => { V.shock(x, y, { r: 50, color: '#ffd27a', dur: 0.35, w: 3 }); MARI_PAINT.ribbons(x, y, { r: 24, dur: 0.4, h: 34 }); MARI_PAINT.petals(x, y, { n: 6, speed: 150, life: 1.1 }); V.glint(x, y, { color: '#ffffff', size: 28, z: 30 }); });
      } },
    // (rework) one beat of the Grand Finale's omnislash (data.i of data.n), when the kit times them (finBeat above)
    'finale-beat': (e, t, d) => { const n = (d && d.n) | 0 || 5, i = (d && d.i) | 0, id = idOf(e), now = FX.now || 0;
      let st = finSt.get(id);
      if (st && (st.finAt || now < st.t0 || now - st.t0 > 0.6 + st.n * 0.7 || (st.n !== n && !st.done))) { finSt.delete(id); st = null; }
      if (!st) st = finSetup(e, t ? t.x : e.x, t ? t.y : e.y, n, true);
      st.ext = true;
      finBeat(e, st, i, FX.camFor ? FX.camFor(e) : null); },
  });
  KIT_VFX.flourish.atTarget = true;
  KIT_VFX['mari-jab'].atTarget = true;
  KIT_VFX['finale-beat'].atTarget = true;

  // autos: a needle-glint flicked at the enemy; the Doll's idle slap
  Object.assign(AUTO_VFX, {
    needle: c => V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'blade', color: '#d8c8ff', speed: 1300, size: 0.4, onHit: (x, y) => V.hit(x, y, '#e8ddff', 0.3) }),
    // (shared-fx polish: each slap lands with a small pink hit where the Doll's reach meets the target)
    doll: c => { for (const d of dollsOf(c.ent)) { const a = Math.atan2(c.ty - d.y, c.tx - d.x); V.slash(d.x, d.y, a, { r: 40, span: 1.1, color: '#ff7a94', dur: 0.18, w: 0.28, flip: c.alt, sparks: 0 });
      c.later(0.06, () => { const r = Math.min(46, Math.hypot(c.tx - d.x, c.ty - d.y)); V.hit(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, '#ffb0c4', 0.28); }); } },
  });
})();

// ======================================================================= ULTIMATES (kits.js ULTIMATES)
// Recipe conventions for an Ultimate (ABILITY_VFX[class][ult id]; a window's empowered moves under their fxId):
//  - a short wind-up (0.3-0.5s, timed by the recipe: FX.cast doesn't delay an Ultimate), then ONE impact;
//  - the screen moments go through c.cam, which is set only for your own hero (FX.camFor): c.cam.dim(a, dur) under
//    the effects, c.cam.stop(dur) a cosmetic hit-stop at the impact, c.cam.punch(amount, dur) a small push in, and
//    c.cam.flash(color, a, dur). Everyone else's Ultimate plays dimmed (FX.cast's 0.6) with no camera at all;
//  - a mark on the floor that lingers (a sigil, a crater) for as long as the moment lasts.
// The parts that land later are KIT_VFX moments (k.fx(name), atTarget when they land on the enemy); they find the
// camera with FX.camFor(ent) the same way.
(() => {
  const V = VFX, shake = s => vfxShake(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  const GOLD = '#ffd65a', DAWN = '#ffe9a8', FIRE = '#ff6a1a', EMBER = '#ffb040', ASH = '#ffe0a0';
  const feathers = (x, y, n, col) => { for (let i = 0; i < n; i++) V.spawn({ x, y, z: 30, vx: rand(-160, 160), vy: rand(-70, 70), vz: rand(60, 200), g: 220, drag: 0.03, life: rand(1, 1.6), size: rand(10, 15), color: col, kind: 'feather', vr: rand(-4, 4), flutter: 4 }); };

  // Bastion · Last Bastion: light gathers on the blade, it's driven into the floor, and a dome of dawn rises over a
  // great star that stays on the floor for the dome's 8s. When the dome falls it slams down on the enemy (bastion-slam).
  ABILITY_VFX.bastion.lastbastion = c => {
    const at = { x: c.x, y: c.y };   // (the dome stays where it was raised)
    if (c.cam) c.cam.dim(0.32, 1.3);
    V.charge(c.x, c.y, { color: DAWN, r: 70, n: 12, dur: 0.35, follow: c.ent });
    V.glint(c.x, c.y - 60, { color: '#ffffff', size: 40, z: 40 });
    V.lightfall(c.x, c.y, { color: DAWN, r: 22, h: 300, dur: 0.44, feathers: 0 });
    c.later(0.38, () => {
      if (c.cam) { c.cam.stop(0.09); c.cam.punch(0.07, 0.6); c.cam.flash('#fff0c8', 0.22, 0.35); }
      shake(7);
      V.spikeburst(at.x, at.y, { r: 80, n: 18, color: GOLD, core: '#fffbe0', ink: '#4a3408', dur: 0.42, z: 4 });
      for (let i = 0; i < 3; i++) V.shock(at.x, at.y, { r: 150 + i * 60, color: i ? DAWN : '#ffffff', dur: 0.6 + i * 0.1, w: 8 - i * 2, delay: i * 0.08 });
      V.debris(at.x, at.y, { n: 10, color: '#8a7a68' });
      V.decal(at.x, at.y, { style: 'crack', r: 60, dur: 8, a: 0.55, seed: Math.random() * 6 });
      // (QA) the star and the dome flare for the raise, then hold at a third for the 8s, so telegraphs under them read
      vfxLingerSettle(V.ink(at.x, at.y, { r: 160, dur: 8, a: 0.25 }), 0.5, 1.2);
      vfxLingerSettle(V.sigil(at.x, at.y, { r: 160, style: 'star5', color: GOLD, dur: 8, spin: 0.25 }), 0.28, 1.4);
      for (const d of V.dome(at, { color: DAWN, r: 130, dur: 8 }) || []) vfxLingerSettle(d, 0.3, 1.4);
      V.burst(at.x, at.y - 30, { color: DAWN, color2: '#ffffff', n: 24, speed: 300, kind: 'star', flash: false });
    });
  };
  KIT_VFX['bastion-slam'] = Object.assign((e, target) => {
    const t = target || e, cam = FX.camFor(e);
    if (cam) { cam.stop(0.08); cam.punch(0.05, 0.45); cam.flash('#fff2c8', 0.18, 0.3); }
    shake(6);
    V.lightfall(t.x, t.y, { color: DAWN, r: 44, h: 340, dur: 0.6, feathers: 6 });
    // (QA) the starburst sits at the boss's feet and the seal settles low, so the boss and its next telegraph still read
    V.spikeburst(t.x, t.y, { r: 105, n: 18, color: GOLD, core: '#fffbe0', ink: '#4a3408', dur: 0.42, z: 0, layer: 'ground', flat: 0.6 });
    V.shock(t.x, t.y, { r: 170, color: DAWN, dur: 0.55, w: 8 });
    vfxLingerSettle(V.sigil(t.x, t.y, { r: 90, style: 'star4', color: GOLD, dur: 2.4, spin: 1.2 }), 0.3, 0.7);
    V.decal(t.x, t.y, { style: 'crack', r: 56, dur: 3, a: 0.55, seed: Math.random() * 6 });
    V.debris(t.x, t.y, { n: 8, color: '#8a7a68' });
  }, { atTarget: true });

  // Pyromancer · Phoenix Dive: heat spirals up the mage, flame wings open on its back (they stay for the window), a
  // phoenix climbs off it and dives through the enemy: a fire burst, a ring of feathers, a burning crater left behind.
  ABILITY_VFX.pyromancer.phoenixdive = c => {
    if (c.cam) c.cam.dim(0.38, 1.4);
    V.charge(c.x, c.y, { color: EMBER, r: 60, n: 12, dur: 0.4, follow: c.ent });
    V.blaze(c.ent, { r: 56, dur: 0.9 });
    V.sigil(c.x, c.y, { r: 70, style: 'star5', color: FIRE, dur: 1, spin: 3 });
    V.emberWings(c.ent, { dur: 8 });
    V.aura(c.ent, { color: '#ff8a2a', style: 'flame', dur: 8, r: 30, rate: 0.35 });
    c.later(0.4, () => V.phoenix(c.x, c.y, c.tx, c.ty, { s: 1.3, dur: 0.55, onHit: (x, y) => {
      // (QA: the impact whited out the whole screen) a softer camera flash, a smaller flash, the starburst on the floor
      if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.08, 0.55); c.cam.flash('#ff9a40', 0.16, 0.3); }
      shake(8);
      V.flash(x, y - 20, 80, '#ff9a40', 0.24);
      V.spikeburst(x, y, { r: 120, n: 18, color: FIRE, core: ASH, dur: 0.48, layer: 'ground', z: 0, flat: 0.6 });
      V.shock(x, y, { r: 200, color: '#ffa040', dur: 0.6, w: 9 });
      V.shock(x, y, { r: 130, color: ASH, dur: 0.45, w: 5, delay: 0.06 });
      V.flare(x, y, { n: 20, r: 30, size: 1.3, h: 1.3 });
      V.crater(x, y, { r: 70, color: '#ff4a1a', dur: 6, flames: 5, a: 0.55 });
      V.debris(x, y, { n: 10, hot: true, color: '#4a3226' });
      feathers(x, y, 12, ASH);
    } }));
  };
  // the window's moves: Phoenix Flame (a lance of gold fire shedding feathers), Phoenix Blast (a smaller phoenix)
  ABILITY_VFX.pyromancer.phoenixflame = c => {
    const h = ahead(c, 16);
    V.glint(h.x, h.y, { color: ASH, size: 24, z: 24 });
    V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: EMBER, speed: 1100, size: 1.3, arc: 10, onHit: (x, y) => {
      V.spikeburst(x, y, { r: 42, n: 12, color: '#ffa030', core: '#fff2c0', dur: 0.28 });
      V.shock(x, y, { r: 60, color: ASH, dur: 0.3, w: 3 });
      feathers(x, y, 3, ASH);
    } });
  };
  ABILITY_VFX.pyromancer.phoenixblast = c => V.phoenix(c.x, c.y, c.tx, c.ty, { s: 0.6, dur: 0.42, onHit: (x, y) => {
    V.spikeburst(x, y, { r: 80, n: 14, color: FIRE, core: ASH, dur: 0.38, layer: 'ground', z: 0, flat: 0.6 });   // (QA) at its feet
    V.shock(x, y, { r: 110, color: '#ffa040', dur: 0.45, w: 6 });
    V.flare(x, y, { n: 12, r: 18, size: 1 });
    V.decal(x, y, { r: 40, embers: true, dur: 2.5 });
    shake(4);
  } });
  // the window ends: the mage bursts from the ashes (a pillar of flame, feathers), and the fire runs to the enemy
  KIT_VFX['phoenix-rebirth'] = Object.assign((e, target) => {
    const cam = FX.camFor(e);
    if (cam) { cam.punch(0.04, 0.4); cam.flash('#ffb060', 0.15, 0.3); }
    shake(4);
    V.pillar(e.x, e.y, { r: 46, h: 220, color: '#ff8a2a', dur: 0.9 });
    V.blaze(e, { r: 60, dur: 1 });
    V.burst(e.x, e.y - 30, { color: ASH, color2: FIRE, n: 22, speed: 280 });
    feathers(e.x, e.y, 10, ASH);
    if (target) V.missile(e.x, e.y, target.x, target.y, { style: 'fire', color: '#ff9a3a', speed: 900, size: 1.4, arc: 40, onHit: (x, y) => {
      V.spikeburst(x, y, { r: 60, n: 14, color: FIRE, core: ASH, dur: 0.34 });
      V.shock(x, y, { r: 100, color: EMBER, dur: 0.4, w: 6 });
    } });
  }, { atTarget: true });
})();

// ======================================================================= ULTIMATES · damage classes (Driftblade, Shadowblade, Ranger, Marionettist, Thermist)
// Same three beats as the block above: a 0.3-0.5s wind-up, one impact (the only hit-stop, through c.cam / FX.camFor),
// and a mark on the floor that lasts as long as the moment. Each keeps its class's colours: Driftblade jade wind,
// Shadowblade violet and rose steel, Ranger gold starlight, Marionettist velvet, rose and gold, Thermist orange and
// blue. The moments that land later (KIT_VFX) replay their delayed parts at the caster's intensity (dmgUltLater).
(() => {
  const V = VFX, TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => vfxShake(s);
  // a delayed part of a KIT_VFX moment, at the caster's intensity (your own: full; anyone else's: 0.6)
  const dmgUltLater = (e, d, fn) => { const s = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(s); try { fn(); } finally { V.setScale(1); } }); };
  const dmgUltLine = (ax, ay, bx, by, n = 10, bow = 0) => Array.from({ length: n + 1 }, (_, i) => { const q = i / n, nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1, b = Math.sin(q * Math.PI) * bow; return [ax + (bx - ax) * q + nx / L * b, ay + (by - ay) * q + ny / L * b]; });

  // ---- Driftblade · Eye of the Gale: a cyclone gathers on the duellist, it blows clean through the target (a long
  // jade line and a twister there), and for the 8s a ring of gusts wheels round the duellist: the eye. Gale lines
  // during the window are long double ribbons through the body; it ends in a tempest on the target sized by Drift.
  const driftUltCol = ent => (ent && ent.spec === 'comet' ? '#ffd08a' : ent && ent.spec === 'orbit' ? '#a8f0c8' : '#8ff0d8');
  const driftUltRibbon = (pts, o = {}) => V.fx({ dur: o.dur ?? 0.7, layer: 'air', draw: (c, p, t, e) => {
    const k = (1 - p) * e.a;
    V.neonPath(c, o.color || '#8ff0d8', (o.w ?? 3) * (1 - p * 0.5), k, () => { pts.forEach(([x, y], i) => { const wob = Math.sin(i * 0.9 + t * 14) * (o.wob ?? 3); i ? c.lineTo(x, y - (o.z ?? 14) + wob) : c.moveTo(x, y - (o.z ?? 14) + wob); }); });
  } });
  // a gale line: from 140 px before the body to 160 px past it along a, with a pale streak left on the floor
  const driftUltGaleLine = (x, y, a, col, o = {}) => {
    const L0 = o.back ?? 140, L1 = o.on ?? 160, ax = x - Math.cos(a) * L0, ay = y - Math.sin(a) * L0, bx = x + Math.cos(a) * L1, by = y + Math.sin(a) * L1;
    driftUltRibbon(dmgUltLine(ax, ay, bx, by, 12, 8), { color: col, w: o.w ?? 4, dur: 0.5, wob: 2 });
    driftUltRibbon(dmgUltLine(ax, ay, bx, by, 12, -8), { color: '#ffffff', w: (o.w ?? 4) * 0.45, dur: 0.42, wob: 2 });
    V.fx({ dur: o.stay ?? 1.4, layer: 'ground', draw: (c, p, t, e) => { const k = Math.min(1, p / 0.05, (1 - p) / 0.5) * e.a; c.save(); c.translate(ax, ay); c.rotate(a); c.globalAlpha = 0.14 * k; c.fillStyle = col; c.fillRect(0, -7, L0 + L1, 14); c.globalAlpha = 1; V.neonPath(c, col, 1.2, k * 0.7, () => { c.moveTo(0, 0); c.lineTo(L0 + L1, 0); }); c.restore(); } });
    V.hit(x, y, '#e8fff8', o.hit ?? 0.8);
    V.sparks(x, y, { color: col, n: 6, angle: a, spread: 0.5, speed: 380 });
  };
  // (scale-up pass) DRIFT_ULT_SCALE sizes Eye of the Gale's twister, scar and the closing tempest; DRIFT_ULT_HIT is the impact
  const DRIFT_ULT_SCALE = 1.8, DRIFT_ULT_HIT = 0.45;
  Object.assign(ABILITY_VFX.driftblade, {
    // (painted pass, driftblade.png) WINDUP: a jade cyclone of wind ribbons winds up round the duellist and the blade,
    // leaves caught in it, and a gust runs out to the target. IMPACT (0.3s): a twister stands on the target with rocks
    // and leaves whirling in it, long slashing streaks cut through it from every side. AFTERMATH: a spiral wind scar on
    // the floor (faint), turning slowly as it fades. The eye stays as a quiet ring of gusts for the window.
    eyeofthegale: c => {
      const DP = DRIFT_PAINT, col = driftUltCol(c.ent), sx = c.x, sy = c.y, a = Math.atan2(c.ty - sy, c.tx - sx), tx = c.tx, ty = c.ty, SC = DRIFT_ULT_SCALE, HIT = DRIFT_ULT_HIT;
      if (c.cam) c.cam.dim(0.3, 1.3);
      // WINDUP: a tall cyclone winds up round the duellist; on the target the wind starts to turn in on itself
      V.charge(sx, sy, { color: col, r: 90, n: 10, dur: 0.35, follow: c.ent });
      DP.cyclone(c.ent, { r: 50 * 1.35, h: 130, dur: HIT + 0.2, color: col, leaves: 8 });
      V.swirl(tx, ty, { r: 75 * SC, color: col, dur: HIT, arms: 3, inward: true });
      c.later(HIT - 0.16, () => DP.windStrip(dmgUltLine(sx, sy, tx + Math.cos(a) * 60, ty + Math.sin(a) * 60, 14, 16), { w: 10, color: col, dur: 0.4, z: 18 }));
      // IMPACT: a great twister on the target, a bright eye at its foot, slashing streaks through it, rocks and leaves flung
      c.later(HIT, () => {
        if (c.cam) { c.cam.stop(0.09); c.cam.punch(0.07, 0.5); c.cam.flash('#e8fff8', 0.16, 0.28); }
        shake(6);
        DP.twister(tx, ty, { r: 78 * SC, h: 190 * (1 + (SC - 1) * 0.6), dur: 1.25, color: col, rocks: 12, leaves: 10 });
        for (let i = 0; i < 4; i++) c.later(0.04 + i * 0.07, () => DP.streaks(tx, ty, a + i * 0.8 + rand(-0.2, 0.2), { n: 2, back: 120 * SC * 0.85, on: 120 * SC * 0.85, w: 9, gap: 16, color: i % 2 ? '#e8fff8' : col, dur: 0.4, scuff: false, leaves: 1 }));
        V.flash(tx, ty - 24, 44 * SC, '#ffffff', 0.18);
        V.spikeburst(tx, ty, { r: 70 * SC * 0.85, n: 16, color: col, core: '#ffffff', ink: '#0a2a24', dur: 0.38 });
        V.shock(tx, ty, { r: 180 * SC * 0.85, color: col, dur: 0.6, w: 9 });
        V.shock(tx, ty, { r: 120 * SC * 0.85, color: '#ffffff', dur: 0.45, w: 4, delay: 0.06 });
        V.debris(tx, ty, { n: 10, color: '#4a524c', speed: 1.1 * SC * 0.8, size: 1.3 });
        V.smoke(tx, ty, { n: 6, r: 50 * SC, color: '#c8d8d0', size: 34, a: 0.3, speed: 80, life: 1.4 });
      });
      // AFTERMATH: a spiral wind scar on the floor (ink and jade lines, no fill), turning slowly as it fades
      c.later(HIT + 0.6, () => DP.spiralScar(tx, ty, { r: 90 * SC, dur: 3, color: col, a: 0.56, arms: 4 }));
      // the eye: a few gusts wheeling round the duellist for the window, kept quiet (the floor stays readable)
      V.aura(c.ent, { color: col, dur: 8, r: 30, rate: 0.15 });
      V.fx({ dur: 8, layer: 'ground', follow: c.ent, draw: (cc, p, t, e) => {
        const x = e.follow.x, y = e.follow.y, k = Math.min(1, p / 0.04, (1 - p) / 0.08) * e.a, R = 70;
        for (let i = 0; i < 4; i++) { const a0 = t * 3.2 + i * TAU / 4; V.neonPath(cc, i % 2 ? '#e8fff8' : col, 1.5, k * 0.45, () => cc.ellipse(x, y, R, R * 0.62, 0, a0, a0 + 0.5)); }
      } });
    },
    // Gale Line: a wind blade that cuts a long straight line through the target and well past it
    galeline: c => { const col = driftUltCol(c.ent), a = Math.atan2(c.ty - c.y, c.tx - c.x);
      V.sigil(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 20, { r: 22, style: 'star4', color: col, dur: 0.25, spin: 8 });
      c.later(0.06, () => { driftUltGaleLine(c.tx, c.ty, a, col, { back: Math.min(260, Math.hypot(c.tx - c.x, c.ty - c.y)), on: 220, w: 5, hit: 1 }); V.slash(c.tx, c.ty + 10, a, { r: 66, span: 2.4, color: col, w: 0.5, dur: 0.28 }); shake(3); }); },
    // Eye Step: a glint, a straight blink-ribbon through the body, a puff of wind where it lands
    eyestep: c => { const col = driftUltCol(c.ent), sx = c.x, sy = c.y;
      V.glint(sx, sy, { color: '#ffffff', size: 26, z: 20 }); V.shock(sx, sy, { r: 40, color: col, dur: 0.25, w: 3 });
      c.later(0.08, () => { const ex = c.ent.x, ey = c.ent.y; driftUltRibbon(dmgUltLine(sx, sy, ex, ey, 10, 0), { color: '#ffffff', w: 4, dur: 0.4, wob: 1 }); driftUltRibbon(dmgUltLine(sx, sy, ex, ey, 10, 10), { color: col, w: 3, dur: 0.5 }); V.smoke(ex, ey, { n: 3, color: '#d8e8e0', size: 16, a: 0.45, speed: 50 }); }); },
  });
  Object.assign(KIT_VFX, {
    // a Passing Strike inside the eye: a long gale line along the way you were running (Gale Run makes it white-hot)
    'drift-gale': Object.assign((e, target, d) => { const t = target || e, col = d && d.g ? '#ffffff' : driftUltCol(e); driftUltGaleLine(t.x, t.y, e.angle || 0, col, { w: d && d.g ? 6 : 4 });
      DRIFT_PAINT.streaks(t.x, t.y, e.angle || 0, { n: 3, back: 145, on: 180, w: 7, gap: 14, color: col, dur: 0.42, scuff: false, leaves: 2 }); if (d && d.g) shake(2); }, { atTarget: true }),
    // the tempest that ends the window: a great twister on the target, gusts flung out, sized by the Drift you kept
    'drift-tempest': Object.assign((e, target, d) => {
      const t = target || e, col = driftUltCol(e), q0 = 0.6 + 0.4 * Math.min(1, ((d && d.d) || 0) / 100), q = q0 * DRIFT_ULT_SCALE * 0.9, cam = FX.camFor(e);
      // (painted pass) a great twister on the target with rocks and leaves in it, gusts flung out in ribbons, a spiral scar after
      if (cam) { cam.punch(0.05, 0.45); cam.flash('#e8fff8', 0.14, 0.28); }
      shake(5);
      DRIFT_PAINT.twister(t.x, t.y, { r: 80 * q, h: 210 * q0 * 1.35, dur: 1.3, color: col, rocks: 12, leaves: 10 });
      V.flash(t.x, t.y - 24, 40 * q, '#ffffff', 0.16);
      V.shock(t.x, t.y, { r: 210 * q * 0.66, color: col, dur: 0.6, w: 9 });
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + rand(-0.2, 0.2); DRIFT_PAINT.windStrip(dmgUltLine(t.x + Math.cos(a) * 30, t.y + Math.sin(a) * 18, t.x + Math.cos(a) * 160 * q, t.y + Math.sin(a) * 100 * q, 8, 18), { color: i % 2 ? '#ffffff' : col, w: 7, dur: 0.6, z: 16 }); }
      V.debris(t.x, t.y, { n: 8, color: '#4a524c', speed: 1.3, size: 1.2 });
      dmgUltLater(e, 0.4, () => { V.smoke(t.x, t.y, { n: 6, r: 60 * q, color: '#c8d0c0', size: 32, a: 0.3, speed: 50, life: 1.8 }); DRIFT_PAINT.spiralScar(t.x, t.y, { r: 85 * q, dur: 3, color: col, a: 0.54, arms: 4 }); });
    }, { atTarget: true }),
  });

  // ---- Shadowblade · Thousand Cuts: a smoke bomb bursts at the rogue's feet, a violet smear streaks to the target's
  // back, and a rune of shadow opens under it for the window. Each Shadow Cut blinks round the target in a slash
  // trail; the finisher leaves an echo; at the end every cut comes due at once in a storm of rose and steel.
  const BL = { VIO: '#b04dff', ROSE: '#ff4d8a', STEEL: '#e8e0ff', INK: '#1e0e3a' };
  Object.assign(ABILITY_VFX.shadowblade, {
    thousandcuts: c => {
      const sx = c.x, sy = c.y, tx = c.tx, ty = c.ty;
      if (c.cam) c.cam.dim(0.4, 1.3);
      // (QA: the full-strength cloud hid the boss and the party for 2s, and its pop whited out) thinner, a small pop
      V.smokebomb(sx, sy, { r: 130, dur: 2.2, toss: 0.2, color: '#6a5a7a', ring: BL.VIO, a: 0.6, flashR: 40 });
      V.charge(sx, sy, { color: BL.VIO, r: 56, n: 10, dur: 0.3 });
      c.later(0.35, () => {
        V.shadowdash(sx, sy, c.ent.x, c.ent.y, { color: '#8a4dff', dur: 0.4 });
        if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.07, 0.5); c.cam.flash('#d8b8ff', 0.22, 0.3); }
        shake(6);
        for (let i = 0; i < 3; i++) c.later(i * 0.05, () => V.slash(tx, ty + 6, rand(0, TAU), { r: 70, span: 2.2, color: i % 2 ? BL.STEEL : BL.ROSE, w: 0.5, dur: 0.26, flip: i % 2 === 1, sparks: 4 }));
        V.spikeburst(tx, ty, { r: 100, n: 16, color: BL.VIO, core: '#f0e8ff', ink: BL.INK, dur: 0.42, layer: 'ground', z: 0, flat: 0.6 });   // (QA) round its feet, not over it
        V.shock(tx, ty, { r: 170, color: BL.VIO, dur: 0.55, w: 7 });
        vfxLingerSettle(V.ink(tx, ty, { r: 100, dur: 7, a: 0.3 }), 0.5, 1);
        vfxLingerSettle(V.sigil(tx, ty, { r: 100, style: 'runes', color: BL.VIO, dur: 7, spin: -0.7 }), 0.26, 1.2);   // (QA) settles faint for the window
        V.aura(c.ent, { color: '#8a00c0', style: 'shadow', dur: 7, r: 28, rate: 0.3 });
      });
    },
    // Shadow Cut: a violet smear to the target's back and a cut that curls round it
    shadowcut: c => { const sx = c.x, sy = c.y, tx = c.tx, ty = c.ty;
      c.later(0.05, () => { const ex = c.ent.x, ey = c.ent.y; if (Math.hypot(ex - sx, ey - sy) > 20) V.shadowdash(sx, sy, ex, ey, { color: '#8a4dff', dur: 0.32 });
        const a = Math.atan2(ty - ey, tx - ex);
        V.slash(tx, ty + 6, a + Math.PI / 2, { r: 58, span: 3, color: BL.STEEL, w: 0.45, dur: 0.26, sparks: 4 });
        c.later(0.06, () => V.hit(tx, ty, BL.ROSE, 0.7)); }); },
    // the finisher inside the window: two crossing rose cuts and a pale echo of them a moment later
    shadowedge: c => { const tx = c.tx, ty = c.ty, a = c.ang || 0;
      V.slash(c.x, c.y, a + 0.4, { r: 62, span: 1.6, color: BL.ROSE, w: 0.6, dur: 0.24, sparks: 4 });
      c.later(0.06, () => V.slash(c.x, c.y, a - 0.4, { r: 62, span: 1.6, color: BL.ROSE, w: 0.6, dur: 0.24, flip: true }));
      c.later(0.1, () => { V.spikeburst(tx, ty, { r: 48, n: 12, color: BL.ROSE, core: '#ffe0ec', ink: '#2a0410', dur: 0.3 }); shake(3); });
      c.later(0.28, () => { V.slash(tx, ty + 6, a + Math.PI / 2, { r: 54, span: 2, color: '#d8c8ff', w: 0.35, dur: 0.3 }); V.smoke(tx, ty, { n: 2, color: '#4a3060', size: 18, a: 0.4, speed: 30 }); }); },
  });
  // Thousand Cuts comes due: a flurry of cuts from every side (one per cut you made), then one great X and a burst
  KIT_VFX['blade-thousand'] = Object.assign((e, target, d) => {
    const t = target || e, n = Math.max(4, Math.min(12, (d && d.n) || 6)), cam = FX.camFor(e);
    V.vortex(t.x, t.y, { r: 80, color: '#c01a5a', steel: BL.STEEL, dur: 0.9, n: 6 });
    for (let i = 0; i < n; i++) dmgUltLater(e, i * 0.035, () => { const a = rand(0, TAU); V.slash(t.x - Math.cos(a) * 26, t.y - Math.sin(a) * 26, a, { r: 64, span: 1.3, color: i % 3 ? BL.STEEL : BL.ROSE, w: 0.45, dur: 0.2, flip: i % 2 === 1, sparks: 2 }); });
    dmgUltLater(e, n * 0.035 + 0.08, () => {
      if (cam) { cam.punch(0.06, 0.45); cam.flash('#ffd0e8', 0.18, 0.3); }
      shake(6);
      for (const s of [-1, 1]) V.slash(t.x, t.y + 6, Math.PI / 4 * s, { r: 96, span: 1.2, color: BL.ROSE, w: 0.7, dur: 0.32, flip: s > 0, sparks: 6 });
      V.spikeburst(t.x, t.y, { r: 118, n: 18, color: BL.ROSE, core: '#ffe0ec', ink: '#2a0410', dur: 0.45, layer: 'ground', z: 0, flat: 0.6 });   // (QA) round its feet, the X cuts carry the hit
      V.shock(t.x, t.y, { r: 190, color: BL.VIO, dur: 0.55, w: 8 });
      V.splash(t.x, t.y, { n: 12, speed: 1.3 });
      V.decal(t.x, t.y, { style: 'crack', r: 60, dur: 3, a: 0.5, seed: Math.random() * 6 });
    });
  }, { atTarget: true });

  // ---- Ranger · Starfall Volley: the ranger draws and looses straight up (a shaft of light), a first star drops onto
  // the target, then a ring of gold opens on the floor there, as wide as the Focus spent, and six volleys of
  // starlit arrows fall into it over 3s. Loosed under Hunter's Cloak, green motes rise off the party with each one.
  const RG = { GOLD: '#ffe27a', STAR: '#fff6d0', DEEP: '#ffb84a' };
  ABILITY_VFX.ranger.starfall = c => {
    if (c.cam) c.cam.dim(0.36, 3.6);
    V.glint(c.x, c.y, { color: RG.STAR, size: 34, z: 50 });
    V.charge(c.x, c.y, { color: RG.GOLD, r: 56, n: 10, dur: 0.3, follow: c.ent });
    c.later(0.12, () => V.pillar(c.x, c.y, { r: 14, h: 300, color: RG.STAR, dur: 0.45 }));
    c.later(0.4, () => {
      if (c.cam) { c.cam.stop(0.09); c.cam.punch(0.06, 0.5); c.cam.flash('#fff6d0', 0.2, 0.3); }
      shake(6);
      // (QA: the impact whited out the boss) a slimmer shaft, the starburst on the floor round its feet, a gold flash
      V.lightfall(c.tx, c.ty, { color: RG.STAR, r: 28, h: 380, dur: 0.5, feathers: 0 });
      V.spikeburst(c.tx, c.ty, { r: 110, n: 18, color: RG.GOLD, core: '#fff6d0', ink: '#3a2404', dur: 0.45, layer: 'ground', z: 0, flat: 0.6 });
      V.shock(c.tx, c.ty, { r: 180, color: RG.GOLD, dur: 0.55, w: 7 });
      V.flash(c.tx, c.ty - 20, 60, RG.GOLD, 0.2); V.burst(c.tx, c.ty - 20, { color: RG.STAR, color2: RG.GOLD, n: 20, speed: 280, kind: 'star', flash: false });
    });
  };
  KIT_VFX['ranger-stars'] = Object.assign((e, target, d) => {
    const t = target || e, x = t.x, y = t.y, f = Math.max(0, Math.min(100, (d && d.f) || 0)), r = 70 + 0.6 * f, heal = d && d.c;
    vfxLingerSettle(V.ink(x, y, { r, dur: 3.6, a: 0.3 }), 0.5, 0.8);
    vfxLingerSettle(V.sigil(x, y, { r, style: 'star5', color: RG.GOLD, dur: 3.6, spin: 0.4 }), 0.35, 0.8);   // (QA) settles under the arrows
    V.fx({ dur: 3.6, layer: 'ground', draw: (cc, p, tt, fx) => { const k = Math.min(1, p / 0.05, (1 - p) / 0.15) * fx.a; for (let i = 0; i < 9; i++) { const a = i * 2.4 + tt * 0.3, q = ((i * 0.37) % 1) * 0.85; V.glowAt(cc, x + Math.cos(a) * r * q, y + Math.sin(a) * r * q * 0.62, 8, RG.STAR, k * (0.4 + 0.4 * Math.sin(tt * 5 + i))); } } });
    for (let i = 1; i <= 6; i++) dmgUltLater(e, 0.4 + 0.5 * i - 0.2, () => {
      V.volley(x, y, { n: 8 + Math.round(f / 12), r: r * 0.85, color: RG.GOLD, wind: 0.02, gap: 0.02, stay: 1.1, ring: false });
      V.missile(x + rand(-70, 70), y - 320, x + rand(-r * 0.4, r * 0.4), y + rand(-r * 0.2, r * 0.2), { style: 'comet', color: RG.STAR, speed: 1500, size: 0.9, onHit: (hx, hy) => V.hit(hx, hy, RG.STAR, 0.6) });
      FX.later(0.2, () => V.shock(x, y, { r: r * 1.1, color: RG.DEEP, dur: 0.35, w: 3 }));
      if (heal) V.motes(e.x, e.y, { color: '#9fdc8a', n: 4, r: 60, kind: 'star' });
    });
  }, { atTarget: true });

  // ---- Marionettist · Curtain Call: velvet drapes part over the target, the footlights come up, every Doll leaps to
  // its mark and the whole troupe strikes at once while the Strings flash as blades; the drapes fall closed again
  // and a gold spotlight stays on the floor. The bow (the next Swap) snaps the Strings across the target.
  const MU = { ROSE: '#ffd8ec', GOLD: '#ffd27a', VEL: '#a01838', VEL2: '#d03050', CRIM: '#e0203c', ROSE2: '#ff5a7a' };
  const mariUltId = ent => (ent && ent.kind === 'player' ? (typeof Net !== 'undefined' ? Net.id : 0) : ent && ent.id);
  const mariUltDolls = ent => (typeof Stagecraft !== 'undefined' ? Stagecraft.dollsOf(mariUltId(ent), typeof Net !== 'undefined' ? Net.id : 0) : []);
  const mariUltAct = (ent, kind) => { if (typeof Stagecraft !== 'undefined') Stagecraft.act(mariUltId(ent), kind, FX.now || 0); };
  // (painted pass, marionettist.png) WINDUP: a stage opens on the target, a gold ring with a compass on its floor, the
  // footlights round its front, red velvet drapes swinging open behind it, and four phantom dolls let down on gold
  // strings round the ring. IMPACT (0.45s): the dolls lunge across in an X of cuts with the real Dolls, two crimson Xs
  // flash, rose petals explode. AFTERMATH: a rose sigil under a lingering spotlight, petals drifting down (all faint).
  // (scale-up pass) MARI_ULT_SCALE sizes the whole Curtain Call (stage, troupe, cuts, sigil); MARI_ULT_HIT is the impact
  const MARI_ULT_SCALE = 1.65, MARI_ULT_HIT = 0.5;
  ABILITY_VFX.marionettist.curtaincall = c => {
    const tx = c.tx, ty = c.ty, MP = MARI_PAINT, SC = MARI_ULT_SCALE, R = 108 * SC, HIT = MARI_ULT_HIT;
    if (c.cam) c.cam.dim(0.45, 1.6);
    mariUltAct(c.ent, 'finale');
    // WINDUP: the stage (ring, compass, footlights) and the drapes, which fall away just after the strike
    MP.stage(tx, ty, { r: R, dur: HIT + 0.75, airDur: HIT + 0.38 });
    MP.troupe(tx, ty, { r: R * 0.8, n: 4, hit: HIT, ds: 1.15 * SC * 1.05 });
    MP.spotlight(tx, ty, { r: 56 * SC, h: 340, dur: HIT + 0.2, a: 0.3 });
    MP.petals(tx, ty, { mode: 'fall', n: 8, r: R * 0.9, life: 1.2 });
    c.later(0.1, () => { for (const d of mariUltDolls(c.ent)) { V.smoke(d.x, d.y, { n: 2, color: '#f0d8e8', size: 18, a: 0.35, speed: 40 }); V.glint(d.x, d.y, { color: '#ffffff', size: 24, z: 30 }); } });
    // IMPACT: the troupe lunges through, two great crimson Xs, a brief white-hot heart, petals everywhere
    c.later(HIT, () => {
      if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.07, 0.5); c.cam.flash('#ffd8c8', 0.18, 0.28); }
      shake(7);
      for (const d of mariUltDolls(c.ent)) { const a = Math.atan2(ty - d.y, tx - d.x); V.slash(d.x, d.y, a, { r: 74 * 1.3, span: 1.8, color: MU.CRIM, w: 0.6, dur: 0.3, sparks: 5 }); }
      MP.xcut(tx, ty, { r: R * 1.05, a: 0.62, w: 10 * SC, dur: 0.44, z: 14 });
      c.later(0.06, () => MP.xcut(tx, ty, { r: R * 0.85, a: 0.62 + Math.PI / 4, w: 7 * SC, dur: 0.38, z: 14, color: MU.ROSE2 }));
      V.flash(tx, ty - 20, 46 * SC, '#fff0e6', 0.18);
      V.spikeburst(tx, ty, { r: 72 * SC, n: 18, color: MU.CRIM, core: '#fff0e6', ink: '#2a0410', dur: 0.4, z: 12 });
      V.shock(tx, ty, { r: 175 * SC, color: MU.ROSE2, dur: 0.55, w: 7 });
      V.shock(tx, ty, { r: 130 * SC, color: MU.GOLD, dur: 0.5, w: 4, delay: 0.06 });
      V.burst(tx, ty, { color: MU.GOLD, color2: '#ffffff', n: 12, speed: 320, kind: 'star', flash: false });
      MP.petals(tx, ty, { n: 24, speed: 300 * SC, life: 1.8, size: 1.3 });
      MP.petals(tx, ty, { n: 14, speed: 170 * SC, life: 2, size: 1.1 });
    });
    // AFTERMATH: a rose sigil with gold stanchions round it under a warm spotlight, petals drifting down (rims, not fills)
    c.later(HIT + 0.35, () => { MP.roseSigil(tx, ty, { r: 92 * SC, dur: 3, a: 0.65, posts: 6 }); MP.spotlight(tx, ty, { r: 64 * SC, h: 340, dur: 2.8, a: 0.19 }); MP.petals(tx, ty, { mode: 'fall', n: 16, r: 90 * SC, life: 2.4 }); });
  };
  Object.assign(KIT_VFX, {
    // the Strings go rigid and bright crimson as the troupe strikes: one blade per taut String to every Doll
    'mari-curtain': (e, target, d) => {
      const s = Math.max(0, Math.min(3, (d && d.s) || 0));
      dmgUltLater(e, MARI_ULT_HIT, () => {
        const ds = mariUltDolls(e), ox = e.x, oy = e.y;
        V.fx({ dur: 0.5, layer: 'air', draw: (cc, p, t, fx) => { const k = (1 - p) * fx.a; for (const dl of ds) for (let i = 0; i < s; i++) { const off = (i - (s - 1) / 2) * 5; V.neonPath(cc, i === 1 ? MU.GOLD : MU.CRIM, 3 * (1 - p) + 1, k, () => { cc.moveTo(ox, oy - 12 + off); cc.lineTo(dl.x, dl.y - 12 + off); }); } } });
        for (const dl of ds) V.sparks((ox + dl.x) / 2, (oy + dl.y) / 2, { color: MU.ROSE2, n: 4 + 2 * s, angle: Math.atan2(dl.y - oy, dl.x - ox) + Math.PI / 2, spread: 0.7, speed: 260 });
      });
    },
    // the bow: a Swap after the curtain snaps every String across the target in crimson, a crimson X and a shower of petals
    'mari-bow': Object.assign((e, target) => {
      const t = target || e;
      V.fx({ dur: 0.45, layer: 'air', draw: (cc, p, tt, fx) => { const k = (1 - p) * fx.a; V.neonPath(cc, MU.CRIM, 4 * (1 - p) + 1, k, () => { cc.moveTo(e.x, e.y - 12); cc.lineTo(t.x, t.y - 12); }); } });
      V.hit(t.x, t.y, MU.ROSE2, 1.2);
      MARI_PAINT.xcut(t.x, t.y, { r: 76, w: 9, dur: 0.36, scar: 1 });
      MARI_PAINT.petals(t.x, t.y, { n: 16, speed: 260, life: 1.6, size: 1.15 });
      shake(3);
    }, { atTarget: true }),
  });

  // ---- Thermist · Supernova: both coloured arcs of the dial wheel round the mage at once, a frost seal opens on the
  // target and shatters into a crown of ice, then fire bursts up through the shards; a scorched, steaming crater
  // stays. The size of every shape follows the stored swing (d.s, 0-5).
  const TH = { FIRE: { color: '#ff7a2a', core: '#fff0b0', ink: '#3a1004' }, ICE: { color: '#5fb4f0', core: '#f0faff', ink: '#08203a' } };
  // (painted pass, thermist.png) WINDUP: the orange and blue arcs whirl round the mage over a small dial; on the target a
  // frost clock-seal opens with its own arcs racing round it and a crown of ice crystals rises from its rim. IMPACT
  // (0.7s): the crown shatters in a fire-and-ice explosion: a fire starburst, a ring of ice spikes, shards, burning rocks,
  // smoke. AFTERMATH: a scorched crater with frost at its edge (faint) and steam rising off it.
  // (scale-up pass) THERM_ULT_SCALE sizes Supernova's seal, crown, explosion and crater; THERM_ULT_HIT is the impact
  const THERM_ULT_SCALE = 1.7, THERM_ULT_HIT = 0.7;
  ABILITY_VFX.thermist.supernova = c => {
    if (c.cam) c.cam.dim(0.42, 1.6);
    V.charge(c.x, c.y, { color: '#e8d8ff', r: 80, n: 12, dur: 0.4, follow: c.ent });
    THERM_PAINT.dialSeal(c.x, c.y, { r: 60, dur: THERM_ULT_HIT + 0.05, follow: c.ent, spin: 11 });
    THERM_PAINT.handArcs(c.ent, { r: 40, dur: THERM_ULT_HIT, color: '#ff8a3a', color2: '#6fb2f0' });
    V.aura(c.ent, { color: '#e8d8ff', dur: 6, r: 28, rate: 0.15 });
    c.later(THERM_ULT_HIT, () => { if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.08, 0.55); c.cam.flash('#ffc890', 0.2, 0.32); } shake(8); });
  };
  KIT_VFX['therm-nova'] = Object.assign((e, target, d) => {
    const t = target || e, x = t.x, y = t.y, s = Math.max(0, Math.min(5, (d && d.s) || 0)), SC = THERM_ULT_SCALE, HIT = THERM_ULT_HIT, TP = THERM_PAINT;
    const q = (0.75 + 0.05 * s) * SC, qr = (0.75 + 0.05 * s) * (1 + (SC - 1) * 0.6);   // shapes grow by the full scale, the outer rings by less
    // WINDUP: a big frost clock-seal, a spiky crown of ice round its rim and a ring of tall spears rising inside it
    TP.dialSeal(x, y, { r: 96 * q, dur: HIT + 0.05 });
    TP.crystalCrown(x, y, { r: 82 * q, n: 12 + 2 * s, h: 66 * q, dur: HIT + 0.02, ws: 1.5 });
    TP.crystalCrown(x, y, { r: 44 * q, n: 7, h: 100 * q, dur: HIT - 0.26, delay: 0.28, ws: 1.8, lean: 0.25 });
    TP.swirl2(x, y, { r: 120 * q, dur: 0.3, z: 20 });
    dmgUltLater(e, 0.35, () => V.shock(x, y, { r: 120 * q, color: '#bfe6ff', dur: 0.35, w: 5 }));
    dmgUltLater(e, HIT - 0.3, () => TP.swirl2(x, y, { r: 110 * q, dur: 0.3, z: 24 }));
    // IMPACT: a fire-and-ice explosion: a white-hot heart, a fire starburst and a column of flame through a ring of ice
    // spikes, shards and burning rocks flung out, smoke rolling
    dmgUltLater(e, HIT, () => {
      V.flash(x, y - 30, 70 * q, '#ffffff', 0.16);
      V.flash(x, y - 20, 110 * q, '#ffc060', 0.24);
      V.spikeburst(x, y, { r: 115 * q, n: 22, ...TH.FIRE, dur: 0.48 });
      V.spikeburst(x, y, { r: 140 * q, n: 20, hole: 0.68, ...TH.ICE, dur: 0.48, layer: 'ground', z: 0, flat: 0.7 });
      V.spikeburst(x, y, { r: 70 * q, n: 12, ...TH.ICE, dur: 0.32, z: 30 });
      V.pillar(x, y, { r: 34 * q, h: 300, color: '#ffb060', dur: 0.45 });
      V.flare(x, y, { n: 16 + 2 * s, r: 40 * q, color: '#ff6a1a', size: 1.5, h: 1.6 });
      TP.shards(x, y, { n: 18, speed: 360 * SC * 0.8, size: 1.5, z: 24 });
      TP.shards(x, y, { n: 10, speed: 200 * SC * 0.8, size: 1.1, z: 40, color: '#cfeeff' });
      V.shock(x, y, { r: 210 * qr, color: '#ff9a5a', dur: 0.6, w: 10 });
      V.shock(x, y, { r: 175 * qr, color: '#7ac0f0', dur: 0.6, w: 7, delay: 0.07 });
      V.burst(x, y, { color: '#fff0b0', color2: '#8fd0ff', n: 16, speed: 320 * SC * 0.8, flash: false });
      V.debris(x, y, { n: 12, hot: true, color: '#3a2a22', speed: 1.2 * SC * 0.8, size: 1.4 });
      V.smoke(x, y, { n: 8, r: 50 * q, color: '#b8b4b0', size: 34 * SC * 0.8, a: 0.42, speed: 90 * SC * 0.8, life: 1.4 });
    });
    // AFTERMATH: a scorched crater ringed with frost spikes, the heat cooling in its cracks, steam rising (kept to rims)
    dmgUltLater(e, HIT + 0.15, () => { V.crater(x, y, { r: 70 * q, color: '#ff5a1a', dur: 4.5, flames: 6, a: 0.48, cracks: 10 }); TP.frostRim(x, y, { r: 78 * q, dur: 4.5, a: 0.6, n: 26 }); });
    dmgUltLater(e, HIT + 0.4, () => TP.steam(x, y, { n: 7, r: 60 * q, size: 36, life: 2.4, a: 0.32 }));
    dmgUltLater(e, HIT + 1.3, () => TP.steam(x, y, { n: 5, r: 70 * q, size: 30, life: 2.2, a: 0.24 }));
  }, { atTarget: true });
})();

// ======================================================================= ULTIMATES · TANKS (Bloodreaver, Runeguard, Ironpalm, Gorgemaw, Oathbroker)
// Same conventions as the block above: a 0.3-0.5s wind-up, one impact (c.cam: stop + punch + flash, your own hero only),
// a mark on the floor for as long as the moment lasts. The kit's later beats are KIT_VFX moments (k.fx in kits.js).
// Each keeps its class's own palette and shapes: blood and a red moon, violet rune stones, saffron palm prints, the
// Maw's morsel colours, ink, wax and gold seals.
(() => {
  const V = VFX, shake = s => vfxShake(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };

  // ---- Bloodreaver · Crimson Eclipse: blood spirals in, a red moon closes over the sun above the reaver (it hangs
  // there the eclipse's 10s), the roar throws a ring of red spikes over the party; the bank erupts later on the enemy.
  const BLOOD = '#e81c40', GORE = '#8a0c2a', CLOT = '#3a0610';   // (shared-fx colour pass: a deeper, bluer crimson than the Pyromancer's orange)
  const reaverMoon = (ent, dur) => V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
    const k = Math.min(1, t / 0.4) * Math.min(1, (1 - p) / 0.06) * e.a * (t < 1.2 ? 1 : 0.55), x = ent.x, y = ent.y - 112 - (ent.lift || 0), pulse = 1 + 0.06 * Math.sin(t * 3);
    V.glowAt(c, x, y, 54 * pulse, BLOOD, 0.55 * k);
    V.neonRing(c, x, y, 22 * pulse, '#ff6a6a', 2.5, k, 1);
    c.save(); c.globalAlpha = 0.92 * k; c.fillStyle = '#12020a'; c.beginPath(); c.arc(x + 3 * Math.min(1, t), y, 20, 0, Math.PI * 2); c.fill(); c.restore();
  }, tick: p => { if (Math.random() < 0.25 * (1 - p)) V.spawn({ x: ent.x + rand(-14, 14), y: ent.y, z: 100, vz: rand(-90, -50), life: 0.8, size: rand(4, 7), color: BLOOD, kind: 'drop', add: false }); } });
  ABILITY_VFX.bloodreaver.crimsoneclipse = c => {
    const e = c.ent;
    if (c.cam) c.cam.dim(0.42, 1.4);
    V.charge(c.x, c.y, { color: BLOOD, r: 80, n: 14, dur: 0.38, follow: e });
    V.swirl(c.x, c.y, { r: 70, color: BLOOD, dur: 0.45, inward: true, follow: e });
    reaverMoon(e, 10);
    c.later(0.4, () => {
      camHit(c.cam, '#ffc8c0', 0.6);   // (online-refs pass: a pale flash, not a screen washed red: red reads as danger)
      shake(7);
      // (QA: a full-strength red circle for 10s read as a boss danger zone) the rune circle flares, then holds faint
      vfxLingerSettle(V.ink(e.x, e.y, { r: 120, dur: 10, follow: e, a: 0.3 }), 0.5, 1.2);
      vfxLingerSettle(V.sigil(e.x, e.y, { r: 120, style: 'runes', color: BLOOD, dur: 10, spin: -0.5, follow: e }), 0.22, 1.3);
      V.spikeburst(e.x, e.y, { r: 150, n: 24, hole: 0.62, color: '#ff3a2a', core: '#ffb0a0', ink: CLOT, fill: GORE, dur: 0.6, layer: 'ground', z: 0, flat: 0.6 });
      for (let i = 0; i < 3; i++) V.shock(e.x, e.y, { r: 170 + i * 50, color: i ? '#ff8a7a' : '#ffffff', dur: 0.6 + i * 0.1, w: 8 - i * 2, delay: i * 0.08 });
      V.splash(e.x, e.y, { n: 14, speed: 1.4 });
      V.aura(e, { color: '#8a0010', style: 'shadow', dur: 10, r: 32, rate: 0.25 });
      V.flash(e.x, e.y - 30, 60, BLOOD, 0.22); V.burst(e.x, e.y - 30, { color: BLOOD, color2: '#ffd0d0', n: 20, speed: 280, flash: false });   // (QA) no white-out
    });
  };
  // the eclipse ends: the bank comes up out of the floor under the enemy as a geyser of blood, and flows back
  KIT_VFX['reaver-eclipse'] = Object.assign((e, target) => {
    const t = target || e, cam = FX.camFor(e);
    camHit(cam, '#ffc8c0', 0.5);
    shake(6);
    V.ink(t.x, t.y, { r: 90, dur: 4, a: 0.35 });
    V.pillar(t.x, t.y, { r: 32, h: 260, color: BLOOD, dur: 0.6 });   // (QA) slimmer, so the boss isn't whited out
    V.spikeburst(t.x, t.y, { r: 120, n: 20, color: '#d0203a', core: '#ff9aa8', ink: CLOT, dur: 0.5, layer: 'ground', z: 0, flat: 0.6 });   // (QA) on the floor round the boss, not a solid star over it
    V.shock(t.x, t.y, { r: 170, color: '#ff5a6a', dur: 0.55, w: 8 });
    V.splash(t.x, t.y, { n: 18, speed: 1.6, size: 1.3 });
    V.puddle(t.x, t.y, { r: 60, color: GORE, dark: CLOT, dur: 4, bubbles: true, fumes: false });
    V.stream(t.x, t.y, e, { color: BLOOD, n: 16 });
    FX.later(0.45, () => V.plus(e.x, e.y, { color: '#ff8a8a', n: 6 }));
  }, { atTarget: true });

  // ---- Runeguard · Runic Cataclysm: the held rune stones tear free off the guard and climb, a great rune circle
  // spins up under the enemy, and the runes come down on it as a violet starfall of crystal; a Sanctum of shattered
  // runes settles round the guard for the party's Wards' 8s.
  const RUNE = '#6c74f2', RUNE2 = '#aab4ff', RCORE = '#eef1ff', RINK = '#0c1236';   // (shared-fx colour pass: Runeguard indigo)
  ABILITY_VFX.runeguard.runecataclysm = c => {
    if (c.cam) c.cam.dim(0.4, 1.4);
    V.charge(c.x, c.y, { color: RUNE2, r: 60, n: 12, dur: 0.35, follow: c.ent });
    V.ink(c.tx, c.ty, { r: 110, dur: 0.6 });
    V.sigil(c.tx, c.ty, { r: 110, style: 'runes', color: RUNE, dur: 0.6, spin: 7 });
    for (let i = 0; i < 4; i++) c.later(0.05 + i * 0.08, () => { const a = Math.random() * Math.PI * 2; V.lightning(c.ent.x, c.ent.y, c.ent.x + Math.cos(a) * 70, c.ent.y + Math.sin(a) * 45, { color: '#c8ceff', jag: 12 }); });
    c.later(0.42, () => {
      camHit(c.cam, '#c8ceff', 1);
      shake(8);
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5, d = rand(20, 60); V.lightning(c.tx + Math.cos(a) * d, c.ty - 260, c.tx + Math.cos(a) * d * 0.4, c.ty + Math.sin(a) * d * 0.3, { color: i % 2 ? RUNE2 : '#ffffff', jag: 16, dur: 0.3 }); }
      // (QA: the starburst sits on the floor round the enemy, not over it; the circles flare then settle faint; all indigo)
      V.crystals(c.tx, c.ty, { color: '#9aa4ff', n: 11, r: 72, h: 96, dur: 1.4 });
      V.spikeburst(c.tx, c.ty, { r: 135, n: 20, color: RUNE, core: RCORE, ink: RINK, dur: 0.5, layer: 'ground', z: 0, flat: 0.6 });
      for (let i = 0; i < 2; i++) V.shock(c.tx, c.ty, { r: 180 + i * 60, color: i ? RUNE2 : '#ffffff', dur: 0.6, w: 8 - i * 3, delay: i * 0.08 });
      V.decal(c.tx, c.ty, { style: 'crack', r: 70, dur: 4, a: 0.6, seed: Math.random() * 6 });
      vfxLingerSettle(V.sigil(c.tx, c.ty, { r: 80, style: 'runes', color: RUNE, dur: 4, spin: 0.4 }), 0.3, 0.8);
      V.debris(c.tx, c.ty, { n: 10, color: '#5a5e88' });
      // the Sanctum the shattered runes settle into, round the guard (the party's Wards)
      vfxLingerSettle(V.ink(c.ent.x, c.ent.y, { r: 150, dur: 8, a: 0.25 }), 0.5, 1);
      vfxLingerSettle(V.sigil(c.ent.x, c.ent.y, { r: 150, style: 'runes', color: '#7c84ff', dur: 8, spin: 0.35 }), 0.24, 1.2);
      V.pillar(c.ent.x, c.ent.y, { r: 34, h: 170, color: '#8e98ff', dur: 1 });
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; V.crystals(c.ent.x + Math.cos(a) * 140, c.ent.y + Math.sin(a) * 109, { color: '#9aa4ff', n: 3, r: 14, h: 44, dur: 2.4 }); }
    });
  };
  // the stones themselves: one rune per Rune held (d.n) flies off the guard to the enemy; a Ward lending its blast (d.w)
  // cracks open on the guard in a hex flash
  KIT_VFX['rune-cataclysm'] = Object.assign((e, target, d) => {
    const n = (d && d.n) || 0, t = target || e;
    for (let i = 0; i < n; i++) FX.later(0.05 * i, () => { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.7, sx = e.x + Math.cos(a) * 30, sy = e.y + Math.sin(a) * 20 - 30;
      V.glint(sx, sy, { color: RCORE, size: 22, z: 30 }); V.missile(sx, sy, t.x, t.y, { style: 'helix', color: RUNE2, speed: 900, arc: 120, size: 1.3 }); });
    if (d && d.w) { V.shield(e, { shape: 'hex', color: '#9aa4ff', dur: 0.5, r: 44 }); V.burst(e.x, e.y - 20, { color: '#d8deff', n: 12, speed: 220, kind: 'star' }); }
  }, { atTarget: true });

  // (Ironpalm · Hundred Palms, Gorgemaw · Maw of Ruin, Oathbroker · Final Reckoning: their own VFX PASS blocks below)
})();

// ======================================================================= VFX PASS · IRONPALM (docs/art/vfx-reference/ironpalm.png)
// Gold and saffron light on dark stone, every move in three beats (wind-up, impact, aftermath). Hundred Palms: a tiger
// spirit coils round the monk, the blows burst out as glowing hands with speed lines and rock, and a giant handprint is
// left cracked into the floor. Crane Step: feather arcs and afterimages. Rising Gate: a torii of light rises, cloud
// scrolls on the floor after. Thousand Palms: hands orbit the monk, then flurry out, leaving small prints. Read Stance:
// concentric rings and eye glyphs. Floor marks stay faint and short so boss telegraphs read through them.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const P = () => globalThis.IRONPALM_VFX || { col: () => '#ffb84a', hot: () => '#fff0c8', print: () => {}, impact: () => ({ x: 0, y: 0, a: 0 }), at: () => ({ x: 0, y: 0, a: 0 }) };
  const IP_INK = '#140a04', IP_ROCK = '#5a4a3a';
  // the size knobs: Hundred Palms' footprint (tiger, burst, the print left), and the supporting moves'
  const IRONPALM_ULT_SCALE = 1.8, IRONPALM_MOVE_SCALE = 1.3;
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };
  const stopE = (e, s) => { if (e && e.st && typeof hitStop === 'function') hitStop(e.st, s, FX.now); };
  const toward = (c, f) => ({ x: c.x + (c.tx - c.x) * f, y: c.y + (c.ty - c.y) * f });

  // ---- primitives
  // an open hand pointing along +x, palm on the origin: the palm filled, fingers and thumb as round strokes
  const IP_FINGERS = [[-4.8, 8.5], [-1.6, 10.5], [1.6, 10], [4.8, 8]];   // [across, length past the palm]
  function ironpalmHandShape(c, s, g = 0) {
    c.beginPath(); c.ellipse(0, 0, 6.5 * s + g, 7 * s + g, 0, 0, Math.PI * 2); c.fill();
    c.lineCap = 'round'; c.lineWidth = 2.8 * s + g * 2; c.beginPath();
    for (const [fy, L] of IP_FINGERS) { c.moveTo(4 * s, fy * s); c.lineTo((4 + L) * s, fy * s * 1.12); }
    c.moveTo(-1 * s, -6 * s); c.lineTo(5 * s, -11.5 * s);   // the thumb
    c.stroke();
  }
  // a glowing hand of light: a soft halo, the saffron body, a white-hot core
  function ironpalmHand(c, x, y, a, s, col, k) {
    if (k <= 0.01 || s <= 0) return;
    c.save(); c.translate(x, y); c.rotate(a); c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, 0.28 * k); c.fillStyle = c.strokeStyle = col; ironpalmHandShape(c, s, 2.2 * s);
    c.globalAlpha = Math.min(1, 0.8 * k); ironpalmHandShape(c, s);
    c.scale(0.55, 0.55); c.globalAlpha = Math.min(1, 0.55 * k); c.fillStyle = c.strokeStyle = '#ffffff'; ironpalmHandShape(c, s);
    c.restore();
  }
  // a hand thrown from (x0, y0) to (x1, y1) at height z, growing as it goes, three speed lines streaming behind it
  function ironpalmHandFly(x0, y0, x1, y1, s, col, dur = 0.3, delay = 0, z = 18) {
    const a = Math.atan2(y1 - y0, x1 - x0), ca = Math.cos(a), sa = Math.sin(a);
    V.fx({ dur, delay, layer: 'air', draw: (c, p, t, e) => {
      const q = 1 - Math.pow(1 - p, 2.2), hx = x0 + (x1 - x0) * q, hy = y0 + (y1 - y0) * q - z, k = e.a * Math.min(1, p / 0.15) * (1 - Math.max(0, (p - 0.6) / 0.4)), S = s * (0.7 + 0.5 * q);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = 1.6; c.globalAlpha = Math.min(1, 0.55 * k); c.beginPath();
      for (let i = -1; i <= 1; i++) { const ox = -sa * i * 5 * S, oy = ca * i * 5 * S, L = (16 + 12 * (1 - Math.abs(i))) * S * (1.2 - p * 0.6);
        c.moveTo(hx + ox - ca * 7 * S, hy + oy - sa * 7 * S); c.lineTo(hx + ox - ca * L, hy + oy - sa * L); }
      c.stroke(); c.restore();
      ironpalmHand(c, hx, hy, a, S, col, k);
    } });
  }
  // a handprint pressed into the floor: a dark dent, gold heat in it that cools, cracks running out of the palm.
  // o.cracks: how many (0 for the small prints)
  function ironpalmFloorPrint(x, y, a, s, col, dur = 4, o = {}) {
    const nc = o.cracks ?? 9;
    const cracks = Array.from({ length: nc }, (_, i) => { const ca = i / nc * Math.PI * 2 + rand(-0.2, 0.2); let px = Math.cos(ca) * 5 * s, py = Math.sin(ca) * 5 * s; const pts = [[px, py]];
      for (let j = 0; j < 3; j++) { const aa = ca + rand(-0.5, 0.5), L = s * rand(3, 5.5); px += Math.cos(aa) * L; py += Math.sin(aa) * L; pts.push([px, py]); } return pts; });
    const inner = nc ? Array.from({ length: 4 }, () => [rand(-5, 3) * s, rand(-5, 5) * s, rand(-5, 3) * s, rand(-5, 5) * s]) : [];
    const trace = c => { for (const pts of cracks) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); } for (const l of inner) { c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); } };
    V.fx({ dur, delay: o.delay, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.04) * Math.min(1, (1 - p) / 0.35), heat = Math.max(0, 1 - t / (o.heatT ?? Math.min(2.6, dur * 0.55)));
      c.save(); c.translate(x, y); c.scale(1, 0.62); c.rotate(a);
      if (o.rim) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, o.rim * k); c.fillStyle = c.strokeStyle = col; ironpalmHandShape(c, s, 1.6 * s); c.globalCompositeOperation = 'source-over'; }   // a warm glow round its edge
      c.globalAlpha = Math.min(1, (o.ink ?? 0.26) * k); c.fillStyle = c.strokeStyle = IP_INK; ironpalmHandShape(c, s, 0.8 * s);   // the dent
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * ((o.warm ?? 0.07) + 0.4 * heat); c.fillStyle = c.strokeStyle = col; ironpalmHandShape(c, s);   // the heat in it
      c.globalCompositeOperation = 'source-over';
      if (nc) {
        c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = Math.min(1, (o.crackA ?? 0.42) * k); c.strokeStyle = IP_INK; c.lineWidth = o.crackW ?? 2.4; c.beginPath(); trace(c); c.stroke();
        const ch = Math.max(heat, o.ember ?? 0);   // (o.ember: the cracks keep a faint glow after the heat's gone)
        if (ch > 0.02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 * k * ch; c.strokeStyle = col; c.lineWidth = 1.1; c.beginPath(); trace(c); c.stroke(); }
      }
      c.restore();
      if (o.ring) V.neonRing(c, x, y, o.ring, col, 1.6, k * 0.3, 0.62);   // the shock's rim cut round it
      if (heat > 0.02) V.glowAt(c, x, y, 12 * s, col, 0.3 * k * heat);
    } });
  }
  // the tiger spirit: striped bands of gold coiling up round the monk, a tiger's mask looming over its shoulder
  function ironpalmTigerMask(c, x, y, s, col, hot, k) {
    if (k <= 0.02) return;
    V.glowAt(c, x, y, 46 * s, col, 0.4 * k);
    c.save(); c.translate(x, y); c.scale(s, s);
    const head = () => {
      c.moveTo(-22, -6); c.quadraticCurveTo(-24, -24, -12, -26); c.lineTo(-17, -38); c.lineTo(-4, -28);   // left ear
      c.quadraticCurveTo(0, -30, 4, -28); c.lineTo(17, -38); c.lineTo(12, -26); c.quadraticCurveTo(24, -24, 22, -6);   // crown, right ear
      c.lineTo(31, -1); c.lineTo(25, 4); c.lineTo(32, 10); c.lineTo(21, 13); c.lineTo(24, 20); c.lineTo(12, 21);   // the right ruff
      c.quadraticCurveTo(0, 33, -12, 21); c.lineTo(-24, 20); c.lineTo(-21, 13); c.lineTo(-32, 10); c.lineTo(-25, 4); c.lineTo(-31, -1); c.closePath();   // jaw, the left ruff
    };
    // the face's light: a saffron body behind the lines, so the head reads as a solid shape and not a doodle
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.3 * k); c.fillStyle = col; c.beginPath(); head(); c.fill(); c.restore();
    c.save(); c.globalAlpha = Math.min(1, 0.55 * k); c.strokeStyle = '#2a1408'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath();   // the dark stripes
    for (const d of [-1, 1]) { c.moveTo(d * 29, 0); c.lineTo(d * 17, 2); c.moveTo(d * 29, 8); c.lineTo(d * 18, 8); c.moveTo(d * 21, 16); c.lineTo(d * 14, 13); c.moveTo(d * 20, -17); c.lineTo(d * 13, -12); }
    c.moveTo(-6, -27); c.lineTo(-3, -19); c.moveTo(6, -27); c.lineTo(3, -19);
    c.stroke(); c.restore();
    V.neonPath(c, col, 2.4, k, head);
    // the open jaw and its fangs
    c.save(); c.globalAlpha = Math.min(1, 0.85 * k); c.fillStyle = '#2a0c04'; c.beginPath(); c.moveTo(-10, 12); c.quadraticCurveTo(0, 9, 10, 12); c.quadraticCurveTo(0, 29, -10, 12); c.fill();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = hot; c.beginPath(); for (const d of [-1, 1]) { c.moveTo(d * 8, 12); c.lineTo(d * 5.5, 21); c.lineTo(d * 3.5, 11.5); c.moveTo(d * 6, 25); c.lineTo(d * 4, 19); c.lineTo(d * 2, 25.5); } c.fill(); c.restore();
    V.neonPath(c, hot, 1.7, k, () => {
      c.moveTo(-15, -10); c.lineTo(-5, -5); c.lineTo(-13, -4); c.moveTo(15, -10); c.lineTo(5, -5); c.lineTo(13, -4);   // the eyes, narrowed and burning
      c.moveTo(-4, 4); c.lineTo(0, 8); c.lineTo(4, 4);   // the nose
      c.moveTo(-3, -25); c.lineTo(0, -17); c.lineTo(3, -25); c.moveTo(-11, -20); c.lineTo(-7, -13); c.moveTo(11, -20); c.lineTo(7, -13);   // brow stripes
      c.moveTo(-11, 7); c.lineTo(-27, 4); c.moveTo(-11, 9); c.lineTo(-26, 11); c.moveTo(11, 7); c.lineTo(27, 4); c.moveTo(11, 9); c.lineTo(26, 11);   // whiskers
    });
    V.glowAt(c, -10, -7, 7, '#ffffff', 0.7 * k); V.glowAt(c, 10, -7, 7, '#ffffff', 0.7 * k);
    c.restore();
  }
  // a tiger's forepaw of light at (x, y), reaching along a: the pad, the toes and three hooked claws
  function ironpalmPaw(c, x, y, a, s, col, hot, k) {
    if (k <= 0.02) return;
    c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.32 * k); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 9, 7.5, 0, 0, Math.PI * 2); for (const t of [-5.5, 0, 5.5]) { c.moveTo(16, t); c.arc(13, t, 3, 0, Math.PI * 2); } c.fill(); c.restore();
    V.neonPath(c, col, 2, k, () => { c.moveTo(9, 0); c.ellipse(0, 0, 9, 7.5, 0, 0, Math.PI * 2); });
    V.neonPath(c, hot, 1.6, k, () => { for (const t of [-5, 0, 5]) { c.moveTo(16, t); c.quadraticCurveTo(24, t * 1.3 - 1, 25, t * 1.5 + 4); } });
    c.restore();
  }
  function ironpalmTiger(ent, dur, col, hot, S = 1) {
    const back = (ent.angle || 0) + Math.PI;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) / 0.25), x = ent.x, y = ent.y, fa = ent.angle || 0;
      // the striped body: three bands of gold coiling up round the monk, the middle one white-hot
      for (let i = 0; i < 3; i++) {
        const a0 = t * 7 + i * 2.1, R = (42 + i * 15 + 6 * Math.sin(t * 5 + i)) * S, z = (6 + i * 16 + t * 12) * S, span = 2.5, W = 11 * S;
        c.save(); c.translate(x, y - z); c.scale(1, 0.55);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.55 * k); c.fillStyle = i === 1 ? hot : col;
        c.beginPath(); c.arc(0, 0, R, a0, a0 + span);
        for (let j = 12; j >= 0; j--) { const q = j / 12, aa = a0 + span * q, rr = R - W * Math.sin(Math.PI * Math.min(1, q * 1.25)); c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
        c.closePath(); c.fill();
        // the tiger's stripes: dark cuts across the band
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.62 * k; c.strokeStyle = '#2a1408'; c.lineWidth = 2.4 * Math.sqrt(S); c.beginPath();
        for (let j = 1; j < 7; j++) { const sa = a0 + j * 0.34; c.moveTo(Math.cos(sa) * (R + 1), Math.sin(sa) * (R + 1)); c.lineTo(Math.cos(sa + 0.12) * (R - W * 0.9), Math.sin(sa + 0.12) * (R - W * 0.9)); }
        c.stroke(); c.restore();
      }
      // the forepaws come down either side of the monk, claws reaching for the enemy
      const pk = k * Math.min(1, Math.max(0, (t - 0.12) / 0.2)), reach = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - 0.12) / 0.3)), 2);
      for (const d of [-1, 1]) { const px = x + Math.cos(fa) * (6 + 16 * reach) * S - Math.sin(fa) * d * 26 * S, py = y + (Math.sin(fa) * (6 + 16 * reach) * S + Math.cos(fa) * d * 26 * S) * 0.6 - 10 * S;
        ironpalmPaw(c, px, py, Math.atan2(Math.sin(fa) * 0.6, Math.cos(fa)) + d * 0.25, 1.1 * S, col, hot, pk * 0.9); }
      // the head looms over the monk's shoulder, growing as it forms
      const form = 1 - Math.pow(1 - Math.min(1, t / 0.35), 2);
      ironpalmTigerMask(c, x + Math.cos(back) * 20 * S, y + Math.sin(back) * 10 * S - (60 + 26 * form) * S - t * 10, (0.8 + 0.25 * form) * S, col, hot, k * Math.min(1, t / 0.25) * 0.9);
    }, tick: p => { if (p < 0.8 && Math.random() < 0.3) { const a = Math.random() * Math.PI * 2, d = rand(60, 90) * S;   // grit swept up into the coil
      V.spawn({ x: ent.x + Math.cos(a) * d, y: ent.y + Math.sin(a) * d * 0.6, z: 4, life: 0.5, size: rand(4, 7), color: IP_ROCK, kind: 'shard', add: false, vr: 8, orbit: { x: ent.x, y: ent.y, a, r: d, w: 7, dr: -60 * S, flat: 0.6, follow: ent } }); } } });
  }
  // a torii of light standing on (x, y), w wide, h tall: it rises out of the floor, holds a beat and fades
  function ironpalmTorii(x, y, w, h, col, hot, dur = 0.6) {
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = 1 - Math.pow(1 - Math.min(1, p / 0.35), 3), hh = h * q, k = e.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.4), L = x - w / 2, Rr = x + w / 2;
      const g = c.createLinearGradient(0, y - hh, 0, y);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.32 * k));
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(L + w * 0.14, y - hh, w * 0.72, hh); c.restore();
      V.neonPath(c, col, 3.2, k, () => { c.moveTo(L + w * 0.14, y); c.lineTo(L + w * 0.16, y - hh); c.moveTo(Rr - w * 0.14, y); c.lineTo(Rr - w * 0.16, y - hh); });   // the posts
      V.neonPath(c, hot, 3, k, () => { c.moveTo(L - w * 0.06, y - hh - 7); c.quadraticCurveTo(x, y - hh + 5, Rr + w * 0.06, y - hh - 7);   // the kasagi, ends upturned
        c.moveTo(L + w * 0.05, y - hh * 0.8); c.lineTo(Rr - w * 0.05, y - hh * 0.8); c.moveTo(x, y - hh * 0.8); c.lineTo(x, y - hh + 2); });   // the nuki and its strut
    } });
  }
  // the gate's shadow left on the floor: two post marks, the beam between, cloud scrolls curling off the posts
  const ironpalmCurl = (c, x, y, s, dir) => { for (let j = 0; j <= 12; j++) { const a = dir * j * 0.5, r = s * (1 + j * 0.45), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.6; j ? c.lineTo(px, py) : c.moveTo(px, py); } c.lineTo(x + dir * s * 12, y + s * 2); };
  function ironpalmToriiMark(x, y, w, col, dur = 2.2, A = 0.5) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.5) * A, L = x - w * 0.36, Rr = x + w * 0.36, s = w / 76;
      V.neonPath(c, col, 1.8, k, () => { c.moveTo(L, y); c.lineTo(L - 4 * s, y - 10 * s); c.moveTo(Rr, y); c.lineTo(Rr + 4 * s, y - 10 * s); c.moveTo(L - 12 * s, y - 12 * s); c.quadraticCurveTo(x, y - 6 * s, Rr + 12 * s, y - 12 * s); c.moveTo(L - 2 * s, y - 6 * s); c.lineTo(Rr + 2 * s, y - 6 * s); });
      V.neonPath(c, col, 1.3, k * 0.85, () => { ironpalmCurl(c, L - 10 * s, y + 4, 3 * s, -1); ironpalmCurl(c, Rr + 10 * s, y + 4, 3 * s, 1); });
    } });
  }
  // an eye glyph (an almond and its pupil)
  const ironpalmEye = (c, x, y, s) => { c.moveTo(x - 7 * s, y); c.quadraticCurveTo(x, y - 6 * s, x + 7 * s, y); c.quadraticCurveTo(x, y + 6 * s, x - 7 * s, y); c.moveTo(x + 2 * s, y); c.arc(x, y, 2 * s, 0, Math.PI * 2); };

  const GRAND = ['Crane Step', 'Flowing Palms', 'Rising Gate', 'Heaven\'s Drop', 'Tiger Wall', 'Stone Breaker', 'Iron Ox', 'Thousand Palms'];

  // ---- Hundred Palms (the Ultimate). Wind-up and the eight named strikes here; the last palm's shockwave is ip-hundred
  ABILITY_VFX.ironpalm.hundredpalms = c => {
    const I = P(), k = I.col(c.ent), h = I.hot(c.ent), e = c.ent;
    const S = IRONPALM_ULT_SCALE;
    if (c.cam) c.cam.dim(0.4, 1.6);
    ironpalmTiger(e, 1.15, k, h, S);
    V.charge(c.x, c.y, { color: h, r: 70 * S, n: 10, dur: 0.4, follow: e });
    V.swirl(e.x, e.y, { r: 60 * S, color: k, dur: 0.5, inward: true, follow: e });
    V.shield(e, { shape: 'front', color: k, dur: 5, r: 40 });   // (Tiger Wall's stance, held)
    GRAND.forEach((name, i) => c.later(0.1 * (i + 1), () => {
      const a = Math.atan2(c.ty - e.y, c.tx - e.x) + rand(-0.6, 0.6), sx = e.x + Math.cos(a) * 12, sy = e.y + Math.sin(a) * 8;
      const x = c.tx - Math.cos(a) * rand(6, 22) + rand(-10, 10), y = c.ty - Math.sin(a) * rand(6, 18) + rand(-8, 8);
      ironpalmHandFly(sx, sy, x, y, rand(1, 1.3), i % 2 ? h : k, 0.13, 0, 20);
      c.later(0.1, () => {
        V.spawn({ x, y, z: 18, life: 0.16, size: 44, size1: 10, color: h, kind: 'star', vr: 6 });
        V.shock(x, y, { r: 44, color: k, dur: 0.22, w: 3 });
        if (i % 2) V.debris(x, y, { n: 2, color: IP_ROCK, speed: 0.6 });
        if (c.cam) c.cam.stop(0.03);
        shake(1.5);
      });
      FX.text(c.tx + (i % 2 ? 26 : -26), c.ty - 70 - (i % 3) * 14, name, i % 2 ? h : k, c.mine ? 13 : 11, 0.7);
    }));
  };
  // the giant palm driven through, hands bursting out of the blow, the handprint left cracked in the floor
  KIT_VFX['ip-hundred'] = Object.assign((e, target) => {
    const I = P(), k = I.col(e), h = I.hot(e), t = target || e, cam = FX.camFor(e), a = Math.atan2(t.y - e.y, t.x - e.x), S = IRONPALM_ULT_SCALE;
    camHit(cam, '#ffd27a', 0.7);   // (QA: the ultimate's landing whited out the screen) a warmer, softer camera flash
    shake(9);
    stopE(e, 0.16);
    ironpalmHandFly(e.x, e.y, t.x, t.y, 3.4 * S * 0.8, h, 0.32, 0, 30);
    V.flash(t.x, t.y - 24, 60 * S, '#fff6e0', 0.16);   // the white-hot core of the blow, brief
    // the giant palm of light stands up out of the blow, fingers to the sky, with light raying out round it
    const rays = Array.from({ length: 18 }, (_, i) => ({ a: i / 18 * Math.PI * 2 + rand(-0.1, 0.1), L: rand(0.6, 1) }));
    V.fx({ dur: 0.5, layer: 'air', draw: (c, p, tt, fx) => {
      const q = 1 - Math.pow(1 - Math.min(1, p / 0.3), 3), kk = fx.a * Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.45);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = k;
      c.globalAlpha = Math.min(1, 0.3 * kk); c.beginPath();   // tapered wedges of light
      for (const r of rays) { const r0 = 16 * S * q, r1 = (36 + 64 * r.L) * S * q, w = 0.07, cy = t.y - 20;
        c.moveTo(t.x + Math.cos(r.a - w) * r0, cy + Math.sin(r.a - w) * r0 * 0.7); c.lineTo(t.x + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1 * 0.7); c.lineTo(t.x + Math.cos(r.a + w) * r0, cy + Math.sin(r.a + w) * r0 * 0.7); c.closePath(); }
      c.fill(); c.restore();
      ironpalmHand(c, t.x, t.y - 10 - 44 * S * q, -Math.PI / 2, 2.6 * S * (0.6 + 0.4 * q), k, kk * 0.75);
    } });
    // (QA: a solid star plus a white flash read as a white-out over the boss) the burst goes on the floor round it
    V.spikeburst(t.x, t.y, { r: 80 * S, n: 18, color: k, core: h, ink: '#2a1408', dur: 0.36, layer: 'ground', z: 0, flat: 0.6 });
    V.shock(t.x, t.y, { r: 120 * S, color: '#ffffff', dur: 0.4, w: 8 });
    V.shock(t.x, t.y, { r: 90 * S, color: k, dur: 0.55, w: 5, delay: 0.06 });
    for (let i = 0; i < 12; i++) { const ra = i / 12 * Math.PI * 2 + rand(-0.15, 0.15), d = rand(110, 150) * S;
      ironpalmHandFly(t.x + Math.cos(ra) * 18 * S, t.y + Math.sin(ra) * 12 * S, t.x + Math.cos(ra) * d, t.y + Math.sin(ra) * d * 0.62, rand(1.5, 1.9) * Math.sqrt(S), i % 2 ? h : k, 0.45, 0.03 + i * 0.01, 28); }
    V.burst(t.x, t.y, { color: k, color2: '#ffffff', n: 16, speed: 280 * S, kind: 'star', flash: false });
    V.debris(t.x, t.y, { n: 16, color: IP_ROCK, speed: 1.4, size: 1.3 });
    V.smoke(t.x, t.y, { n: 6, r: 40 * S, color: '#a89880', size: 30 * S, a: 0.35, speed: 70 * S, life: 1.2 });
    // the aftermath: the giant print in the floor between the monk and the enemy, fingers toward the enemy; its
    // fill stays a faint dent, the glow is round its rim and in the cracks, so telegraphs read through it
    const m = { x: e.x + (t.x - e.x) * 0.3, y: e.y + (t.y - e.y) * 0.3 }, ps = 7 * S * 0.75;
    ironpalmFloorPrint(m.x - Math.cos(a) * 16 * S, m.y - Math.sin(a) * 10 * S, Math.atan2(Math.sin(a) / 0.62, Math.cos(a)), ps, k, 5, { delay: 0.1, rim: 0.12, ink: 0.26, warm: 0.04, crackA: 0.55, crackW: 3, ember: 0.35, ring: 12 * ps, heatT: 1.4 });
    // the bell over the party (Temple Bell's 15% for 8s): two gold rings
    for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 160 + i * 50, color: '#ffd27a', dur: 0.7, w: 6 - i * 2, delay: 0.1 + i * 0.16 });
    FX.text(t.x, t.y - 100 * S, 'Hundred Palms', '#fff0c8', 17, 1.1);
  }, { atTarget: true });

  // ---- the moves on the sheet
  Object.assign(ABILITY_VFX.ironpalm, {
    // Crane Step: feather arcs sweep round the monk, afterimages trail the hop, a flicked palm, feathers drift down
    crane: c => {
      const I = P(), k = I.col(c.ent), e = c.ent, sx = c.x, sy = c.y, M = IRONPALM_MOVE_SCALE;
      V.smoke(sx, sy, { n: 3, color: '#d8ccb8', size: 16 * M, a: 0.45, speed: 40 * M });
      for (let i = 0; i < 3; i++) V.slash(sx, sy, c.ang + Math.PI * (0.7 + i * 0.45), { r: (36 + i * 10) * M, span: 2.4, color: i === 1 ? '#fff0c8' : k, w: 0.16, dur: 0.3 + i * 0.04, flip: i === 1, sparks: 0 });
      V.fx({ dur: 0.4, layer: 'ground', draw: (ctx, p, t, fx) => {   // the feather-edged sweep round the feet: a crane's wing of streaks
        const kk = fx.a * Math.min(1, p / 0.1) * (1 - p), a0 = c.ang + Math.PI * 0.6 + p * 2.2;
        V.neonPath(ctx, k, 1.4, kk * 0.7, () => { for (let j = 0; j < 7; j++) { const a = a0 + j * 0.28, r0 = 30 * M, r1 = (44 + j * 2.5) * M; ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0 * 0.6); ctx.quadraticCurveTo(sx + Math.cos(a + 0.2) * r1, sy + Math.sin(a + 0.2) * r1 * 0.6, sx + Math.cos(a + 0.42) * r1 * 1.05, sy + Math.sin(a + 0.42) * r1 * 0.63); } });
      } });
      V.fx({ dur: 0.45, layer: 'air', draw: (ctx, p, t, fx) => {   // afterimages: pale ghosts of the monk between where it left and where it is
        const dx = e.x - sx, dy = e.y - sy, moved = Math.hypot(dx, dy) > 10, kk = fx.a * (1 - p);
        for (let i = 0; i < 3; i++) { const f = moved ? i / 3 : 0, x = sx + dx * f - (moved ? 0 : Math.cos(c.ang) * (8 + i * 9)), y = sy + dy * f - (moved ? 0 : Math.sin(c.ang) * (5 + i * 6)), a = kk * (0.35 - i * 0.08);
          V.glowAt(ctx, x, y - 22, 18, k, a); ctx.globalAlpha = Math.max(0, a * 0.7); ctx.fillStyle = '#fff0c8'; ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.ellipse(x, y - 16, 7, 12, 0, 0, Math.PI * 2); ctx.moveTo(x + 5, y - 34); ctx.arc(x, y - 34, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      } });
      c.later(0.08, () => { const p = I.impact(c, 0.45); I.print(p.x, p.y, p.a, k, 1, 0.35); });
      c.later(0.16, () => { for (let i = 0; i < 6; i++) V.spawn({ x: e.x + rand(-34, 34), y: e.y + rand(-18, 18), z: rand(26, 50), vx: rand(-36, 36), vy: rand(-12, 12), vz: rand(-10, 20), g: 30, drag: 0.05,
        life: rand(1.1, 1.6), size: rand(18, 24), color: i % 2 ? '#ffe0a0' : k, kind: 'feather', vr: rand(-2, 2), flutter: 4 }); });
    },
    // Rising Gate: the uppercut; a torii of light rises over the boss, rock thrown up, cloud scrolls left on the floor
    gate: c => c.later(0.14, () => {
      const I = P(), k = I.col(c.ent), h = I.hot(c.ent), M = IRONPALM_MOVE_SCALE;
      I.impact(c, 1.1);
      ironpalmTorii(c.tx, c.ty + 6, 76 * M, 104 * M, k, h, 0.65);
      V.pillar(c.tx, c.ty, { r: 22 * M, h: 120 * M, color: k, dur: 0.45 });
      V.shock(c.tx, c.ty, { r: 70 * M, color: k, dur: 0.35, w: 4 });
      V.sparks(c.tx, c.ty, { color: h, n: 8, speed: 300, up: 380, spread: 0.6, angle: -Math.PI / 2 });
      V.debris(c.tx, c.ty, { n: 8, color: IP_ROCK, speed: 0.75, up: 1.4 });
      V.smoke(c.tx, c.ty, { n: 4, color: '#c8b8a0', size: 22 * M, a: 0.4, speed: 60 * M });
      const m = toward(c, 0.72); c.later(0.3, () => ironpalmToriiMark(m.x, m.y + 8, 76 * M, k, 2.4, 0.7));
    }),
    // Thousand Palms: hands circle the monk, then flurry out one by one onto the boss, small prints left on the floor
    palms: c => {
      const I = P(), k = I.col(c.ent), h = I.hot(c.ent), e = c.ent, n = 6, gap = 0.07, a0 = Math.random() * Math.PI * 2, M = IRONPALM_MOVE_SCALE;
      const orbit = (i, t) => { const a = a0 + i * Math.PI * 2 / n + t * 9; return { x: e.x + Math.cos(a) * 34 * M, y: e.y + Math.sin(a) * 20 * M, a }; };
      V.fx({ dur: 0.02 + n * gap, layer: 'air', draw: (ctx, p, t, fx) => { const kk = fx.a * Math.min(1, t / 0.06);
        V.neonRing(ctx, e.x, e.y - 22, 34 * M, k, 1.4, kk * 0.4, 0.59);   // the orbit's trail
        for (let i = 0; i < n; i++) { if (t > 0.02 + i * gap) continue; const o = orbit(i, t); ironpalmHand(ctx, o.x, o.y - 22, o.a + Math.PI / 2, 0.75 * M, i % 2 ? h : k, kk * 0.9); } } });
      for (let i = 0; i < n; i++) c.later(0.02 + i * gap, () => {
        const o = orbit(i, 0.02 + i * gap), a = Math.atan2(c.ty - c.y, c.tx - c.x) + rand(-0.8, 0.8), x = c.tx - Math.cos(a) * rand(10, 26) + rand(-10, 10), y = c.ty - Math.sin(a) * rand(10, 26) + rand(-8, 8);
        ironpalmHandFly(o.x, o.y + 2, x, y, M, i % 2 ? h : k, 0.1, 0, 20);
        c.later(0.09, () => {
          I.print(x, y, a, i % 2 ? h : k, rand(0.9, 1.3), 0.35);
          V.spawn({ x, y, z: 16, life: 0.14, size: 36, size1: 8, color: h, kind: 'star', vr: 6 });
          const f = { x: c.x + (x - c.x) * 0.8, y: c.y + (y - c.y) * 0.8 };   // (short of the boss's feet, so its sprite doesn't hide the print)
          ironpalmFloorPrint(f.x + rand(-18, 18), f.y + rand(-12, 12), a + rand(-0.5, 0.5), 1.15 * M, k, 2.4, { cracks: 0, rim: 0.18, ink: 0.3, warm: 0.1 });
          stopE(c.ent, 0.04); shake(1.5);
        });
      });
      // (QA: a solid gold star covered the boss's face) the finishing burst on the floor round its feet
      c.later(0.12 + n * gap, () => { V.spikeburst(c.tx, c.ty, { r: 80 * M, n: 16, color: k, core: h, ink: '#2a1408', dur: 0.36, layer: 'ground', z: 0, flat: 0.6 }); V.shock(c.tx, c.ty, { r: 100 * M, color: k, dur: 0.4, w: 5 });
        for (let i = 0; i < 5; i++) { const ra = c.ang + (i - 2) * 0.5; ironpalmHandFly(c.tx, c.ty, c.tx + Math.cos(ra) * 70 * M, c.ty + Math.sin(ra) * 44 * M, 0.9 * M, i % 2 ? h : k, 0.3, i * 0.015, 22); }   // the flurry bursting through
        V.debris(c.tx, c.ty, { n: 5, color: IP_ROCK, speed: 0.8 });
        V.burst(c.tx, c.ty, { color: k, color2: '#ffffff', n: 12, speed: 240 * M, kind: 'star', flashR: 50 * M }); stopE(c.ent, 0.1); shake(5); });
    },
    // Read Stance: still rings open round the monk one inside the other, a cross of ticks and an eye at each point
    read: c => {
      const I = P(), k = I.col(c.ent), e = c.ent, M = IRONPALM_MOVE_SCALE;
      V.fx({ dur: 1.2, layer: 'ground', draw: (ctx, p, t, fx) => {
        const kk = fx.a * Math.min(1, (1 - p) / 0.45), x = e.x, y = e.y, F = 0.6;
        V.glowAt(ctx, x, y, 40 * M, k, 0.18 * kk);
        for (let i = 0; i < 4; i++) { const q = Math.min(1, Math.max(0, (t - i * 0.06) / 0.18)); if (q <= 0) continue; V.neonRing(ctx, x, y, (22 + i * 16) * M * (0.8 + 0.2 * q), k, 1.7 - i * 0.3, kk * q * (0.62 - i * 0.11), F); }
        const q = Math.min(1, Math.max(0, (t - 0.18) / 0.15)); if (q <= 0) return;
        V.neonPath(ctx, k, 1.3, kk * q * 0.6, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a) * F; ctx.moveTo(x + cx * 76 * M, y + cy * 76 * M); ctx.lineTo(x + cx * 100 * M, y + cy * 100 * M);
          for (let j = 0; j < 3; j++) { const r = (30 + j * 14) * M; ctx.moveTo(x + cx * r - cy / F * 3, y + cy * r + cx * 3 * F); ctx.lineTo(x + cx * r + cy / F * 3, y + cy * r - cx * 3 * F); } } });   // the cross, ticked along its arms
        V.neonPath(ctx, '#fff0c8', 1.3, kk * q * 0.7, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ironpalmEye(ctx, x + Math.cos(a) * 68 * M, y + Math.sin(a) * 68 * M * F, 0.8 * M); } });
      } });
      V.shock(c.x, c.y, { r: 50 * M, color: '#fff0c8', dur: 0.35, w: 2 });
      V.shock(c.x, c.y, { r: 90 * M, color: k, dur: 0.5, w: 2, delay: 0.1 });
    },
  });
})();

// ======================================================================= VFX PASS · GORGEMAW (docs/art/vfx-reference/gorgemaw.png)
// Purple-magenta flesh, glowing orange teeth, lava in the cracks; Morsels as little spirits in their own colours.
// Maw of Ruin: a huge jaw opens round the Gorgemaw toward the enemy with the debris streaming in, a ring of teeth slams
// shut round the enemy, a ring of tooth marks is left scorched in the floor and the Morsel spirits fly home. Gnash: a
// crescent bite. Spit: a green slime glob with the Morsel glowing in it, splashing into puddles. Digest: the Morsels
// spiral in and a spiral seal glows under the belly. Open Wide: a wind funnel into the jaw, a dark spiral on the floor.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const G = () => globalThis.GORGEMAW_VFX;
  const FLESH = '#5a1648', RIM = '#e0508a', TOOTH = '#ffd8b0', TGLOW = '#ff8a3a', LAVA = '#ff6a2a', GINK = '#1e0618', SLIME = '#8ee03a', SLIME_D = '#3e7a18';
  const LETTER = { r: 'ring', l: 'lance', f: 'fang', s: 'spike' };
  const mcol = m => (G() ? G().MCOL(m) : TGLOW);
  const mouthOf = e => (G() ? G().mouth(e) : { x: e.x, y: e.y, z: 30 });
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };
  // the size knobs: Maw of Ruin's footprint (the jaw, the bite, the scorch left), and the supporting moves'
  const GORGEMAW_ULT_SCALE = 1.8, GORGEMAW_MOVE_SCALE = 1.3;

  // ---- primitives
  // the Maw: a band of purple flesh with dark spines on its back and glowing teeth along its inside, open by `gap`
  // radians toward world angle `ang` (gap 0: a closed ring of teeth). Flattened onto the floor round (x, y - z)
  function gorgemawMaw(c, x, y, R, ang, gap, k, o = {}) {
    if (k <= 0.01 || R <= 1) return;
    const flat = o.flat ?? 0.7, T = R * (o.thick ?? 0.3), n = o.teeth ?? 18, la = Math.atan2(Math.sin(ang) / flat, Math.cos(ang));
    const a1 = la + gap / 2, span = Math.PI * 2 - gap, ns = Math.max(4, Math.round(n * 0.6));
    c.save(); c.translate(x, y - (o.z || 0)); c.scale(1, flat);
    c.globalAlpha = Math.min(1, k); c.fillStyle = GINK; c.beginPath();   // the spines
    for (let i = 0; i < ns; i++) { const a = a1 + span * (i + 0.5) / ns, w = span / ns * 0.3; c.moveTo(Math.cos(a - w) * R, Math.sin(a - w) * R); c.lineTo(Math.cos(a) * (R + T * 0.75), Math.sin(a) * (R + T * 0.75)); c.lineTo(Math.cos(a + w) * R, Math.sin(a + w) * R); }
    c.fill();
    c.fillStyle = FLESH; c.strokeStyle = GINK; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R, a1, a1 + span); c.arc(0, 0, R - T, a1 + span, a1, true); c.closePath(); c.fill(); c.stroke();   // the flesh
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, 0.8 * k); c.strokeStyle = RIM; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 0, R - T * 0.88, a1, a1 + span); c.stroke();   // the hot gum
    c.globalAlpha = Math.min(1, 0.55 * k); c.strokeStyle = LAVA; c.lineWidth = 1.3; c.beginPath();   // lava in the cracks of the flesh
    for (let i = 0; i < ns; i += 2) { const a = a1 + span * (i + 0.2) / ns; c.moveTo(Math.cos(a) * (R - T * 0.15), Math.sin(a) * (R - T * 0.15)); c.lineTo(Math.cos(a + 0.08) * (R - T * 0.55), Math.sin(a + 0.08) * (R - T * 0.55)); c.lineTo(Math.cos(a + 0.02) * (R - T * 0.75), Math.sin(a + 0.02) * (R - T * 0.75)); }
    c.stroke();
    c.globalCompositeOperation = 'source-over'; c.beginPath();   // the teeth, pointing in
    for (let i = 0; i < n; i++) { const a = a1 + span * (i + 0.5) / n, w = span / n * 0.42, L = T * (i % 2 ? 0.85 : 1.25) * (o.bite ?? 1), r0 = R - T * 0.8;
      c.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); c.lineTo(Math.cos(a) * (r0 - L), Math.sin(a) * (r0 - L)); c.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); c.closePath(); }
    c.globalAlpha = Math.min(1, k); c.fillStyle = TOOTH; c.fill(); c.strokeStyle = '#4a1206'; c.lineWidth = 1.1; c.stroke();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.5 * k); c.fillStyle = TGLOW; c.fill();
    c.restore();
  }
  // tooth marks scorched into the floor where the Maw shut: dark fang-shaped burns, their edges still glowing a moment
  function gorgemawScorch(x, y, R, dur, o = {}) {
    const n = o.teeth ?? 18, a0 = o.a0 ?? 0, span = o.span ?? Math.PI * 2, rr = Array.from({ length: n }, () => rand(0.85, 1.15));
    // o.cracks: lava cracks running out from the ring (the Ultimate's); o.glow: the teeth's edges keep a faint glow
    const cracks = Array.from({ length: o.cracks || 0 }, (_, i) => { const ca = a0 + span * (i + rand(0.2, 0.8)) / (o.cracks || 1); let px = Math.cos(ca) * R * 1.02, py = Math.sin(ca) * R * 1.02; const pts = [[px, py]];
      for (let j = 0; j < 3; j++) { const aa = ca + rand(-0.4, 0.4), L = R * rand(0.08, 0.16); px += Math.cos(aa) * L; py += Math.sin(aa) * L; pts.push([px, py]); } return pts; });
    V.fx({ dur, delay: o.delay, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.05) * Math.min(1, (1 - p) / 0.4), heat = Math.max(0, 1 - t / 1.2);
      c.save(); c.translate(x, y); c.scale(1, 0.7);
      c.globalAlpha = 0.16 * k; c.strokeStyle = GINK; c.lineWidth = R * 0.22; c.beginPath(); c.arc(0, 0, R * 0.95, a0, a0 + span); c.stroke();   // the charred band
      if (cracks.length) { c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); for (const pts of cracks) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }
        c.globalAlpha = 0.4 * k; c.strokeStyle = GINK; c.lineWidth = 3; c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * (0.22 + 0.5 * heat); c.strokeStyle = LAVA; c.lineWidth = 1.3; c.stroke(); c.globalCompositeOperation = 'source-over'; }
      c.beginPath();
      for (let i = 0; i < n; i++) { const a = a0 + span * (i + 0.5) / n, w = span / n * 0.32, r0 = R * 1.02, L = R * 0.26 * rr[i];
        c.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); c.lineTo(Math.cos(a) * (r0 - L), Math.sin(a) * (r0 - L)); c.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); c.closePath(); }
      c.globalAlpha = (o.ink ?? 0.34) * k; c.fillStyle = GINK; c.fill();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * ((o.glow ?? 0.08) + 0.45 * heat); c.strokeStyle = TGLOW; c.lineWidth = o.lw ?? 1.4; c.stroke();
      c.restore();
    } });
  }
  // a Morsel spirit: a glowing little ghost with a tail, flying along path(p) -> { x, y, z }
  function gorgemawSpirit(path, col, dur, delay = 0, s = 1) {
    V.fx({ dur, delay, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.15);
      for (let i = 5; i >= 1; i--) { const pt = path(Math.max(0, p - i * 0.035)); V.glowAt(c, pt.x, pt.y - pt.z, (10 - i) * s * 1.3, col, k * 0.5 * (1 - i / 6)); }
      const h = path(p), h2 = path(Math.min(1, p + 0.02)), x = h.x, y = h.y - h.z, a = Math.atan2(h2.y - h2.z - y, h2.x - x || 0.001);
      V.glowAt(c, x, y, 16 * s, col, 0.7 * k);
      c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, k);
      c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 7 * s, 5.5 * s, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = GINK; c.beginPath(); c.arc(2.5 * s, -2 * s, 1.4 * s, 0, Math.PI * 2); c.moveTo(4 * s, 2 * s); c.arc(2.5 * s, 2 * s, 1.4 * s, 0, Math.PI * 2); c.fill();
      c.restore();
    } });
  }
  // a curved path from a to b (either may be a function, read live: a mouth that moves), bent sideways and lifted
  const gorgemawArc = (a, b, bend, lift) => p => {
    const A = typeof a === 'function' ? a() : a, B = typeof b === 'function' ? b() : b, u = 1 - p;
    const mx = (A.x + B.x) / 2 - (B.y - A.y) * bend, my = (A.y + B.y) / 2 + (B.x - A.x) * bend;
    return { x: u * u * A.x + 2 * u * p * mx + p * p * B.x, y: u * u * A.y + 2 * u * p * my + p * p * B.y, z: (A.z || 0) * u + (B.z || 0) * p + Math.sin(p * Math.PI) * lift };
  };
  // a green slime glob with the Morsel glowing inside it, lobbed from q to t, dripping as it goes
  function gorgemawGlob(q, t, col, s, onHit) {
    const d = Math.hypot(t.x - q.x, t.y - q.y), dur = Math.max(0.12, d / 650), arc = 60;
    const pos = p => ({ x: q.x + (t.x - q.x) * p, y: q.y + (t.y - q.y) * p, z: (q.z || 0) * (1 - p) + 10 * p + Math.sin(p * Math.PI) * arc });
    V.fx({ dur, layer: 'air', draw: (c, p, tt, e) => {
      for (let i = 1; i <= 3; i++) { const b = pos(Math.max(0, p - i * 0.07)); V.glowAt(c, b.x, b.y - b.z, (12 - i * 2) * s, SLIME, e.a * 0.45); }
      const h = pos(p), x = h.x, y = h.y - h.z, wob = Math.sin(tt * 30) * 0.15, r = 9 * s;
      V.glowAt(c, x, y, r * 2.4, SLIME, 0.55 * e.a);
      c.save(); c.translate(x, y); c.globalAlpha = Math.min(1, e.a);
      c.fillStyle = SLIME_D; c.beginPath(); c.ellipse(0, 0, r * (1 + wob), r * (1 - wob), 0, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = SLIME; c.globalAlpha = Math.min(1, 0.7 * e.a); c.beginPath(); c.ellipse(-r * 0.15, -r * 0.2, r * 0.75, r * 0.6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(0, r * 0.1, r * 0.42, 0, Math.PI * 2); c.fill();   // the Morsel in it
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.min(1, e.a); c.fillStyle = GINK; c.beginPath(); c.arc(-r * 0.35, -r * 0.35, r * 0.13, 0, Math.PI * 2); c.moveTo(r * 0.5, -r * 0.35); c.arc(r * 0.35, -r * 0.35, r * 0.13, 0, Math.PI * 2); c.fill();
      c.restore();
    }, tick: p => { if (Math.random() < 0.3) { const h = pos(p); V.spawn({ x: h.x, y: h.y, z: h.z, vz: -40, g: 400, life: 0.4, size: 5 * s, size1: 2, color: SLIME, kind: 'drop', add: false }); } }, done: () => onHit(t.x, t.y) });
  }
  // slime splashed over the floor: a few puddles, one with the Morsel's colour glowing in it, bubbling a moment
  function gorgemawPuddles(x, y, col, s = 1, dur = 2) {
    const blobs = Array.from({ length: 4 }, (_, i) => { const a = Math.random() * Math.PI * 2, d = i ? rand(14, 34) * s : 0; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, r: (i ? rand(6, 11) : 13) * s, ph: rand(0, 6) }; });
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.45);
      for (let i = 0; i < blobs.length; i++) { const b = blobs[i];
        c.globalAlpha = 0.42 * k; c.fillStyle = SLIME_D; c.beginPath(); c.ellipse(b.x, b.y, b.r * 1.15, b.r * 0.65, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 0.5 * k; c.strokeStyle = SLIME; c.lineWidth = 1.2; c.stroke();   // a bright wet rim
        V.glowAt(c, b.x, b.y, b.r * 1.3, i ? SLIME : col, (i ? 0.32 : 0.5) * k * (0.8 + 0.2 * Math.sin(t * 6 + b.ph))); }
      c.globalAlpha = 1;
    } });
  }
  // a spiral glyph on the floor: dark arms turning, a glowing line in them (Digest's seal, Open Wide's aftermath)
  function gorgemawSpiral(x, y, R, dur, o = {}) {
    V.fx({ dur, delay: o.delay, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.45), cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y, spin = t * (o.spin ?? 2);
      c.save(); c.translate(cx, cy); c.scale(1, 0.65);
      c.globalAlpha = 0.28 * k; c.fillStyle = o.ink || GINK; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
      if (o.veins) { c.strokeStyle = RIM; c.lineWidth = 1.2; c.globalAlpha = 0.35 * k; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; c.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.lineTo(Math.cos(a + 0.15) * R * 1.25, Math.sin(a + 0.15) * R * 1.25); } c.stroke(); }
      c.rotate(spin); c.lineCap = 'round';
      for (let arm = 0; arm < (o.arms ?? 1); arm++) {
        c.beginPath(); for (let j = 0; j <= 28; j++) { const q = j / 28, a = arm * Math.PI * 2 / (o.arms ?? 1) + q * Math.PI * 3.2, r = R * 0.9 * q; j ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(0, 0); }
        c.globalAlpha = 0.4 * k; c.strokeStyle = GINK; c.lineWidth = 5; c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = (o.glow ?? 0.5) * k; c.strokeStyle = o.color || TGLOW; c.lineWidth = 1.6; c.stroke(); c.globalCompositeOperation = 'source-over';
      }
      c.restore();
    } });
  }

  // ---- Maw of Ruin (the Ultimate). The jaw, the bite and the scorch here; the Morsels themselves are maw-ruin
  ABILITY_VFX.gorgemaw.mawofruin = c => {
    const g = G(), e = c.ent, a = Math.atan2(c.ty - c.y, c.tx - c.x), S = GORGEMAW_ULT_SCALE, R = 80 * S, LAND = 0.48;
    if (c.cam) c.cam.dim(0.42, 1.4);
    if (g) { const q = g.mouth(e); g.chomp(q.x, q.y, q.z, 1.6, TGLOW, 0.42); }
    // wind-up: the jaw unhinges round the Gorgemaw, open on the enemy, the throat glowing, the air torn into it
    V.fx({ dur: LAND + 0.06, layer: 'ground', draw: (ctx, p, t, fx) => {
      const open = 1 - Math.pow(1 - Math.min(1, p / 0.5), 2), shut = p > 0.84 ? (p - 0.84) / 0.16 : 0, k = fx.a * Math.min(1, p / 0.1) * (1 - shut * 0.6);
      const x = e.x - Math.cos(a) * 14 * S, y = e.y - Math.sin(a) * 9 * S, Rj = (44 + 20 * open) * S;
      V.glowAt(ctx, x + Math.cos(a) * 30 * S, y + Math.sin(a) * 20 * S, 60 * S, '#ff3a6a', 0.32 * k);
      V.glowAt(ctx, x, y, Rj * 0.6, '#3a0420', 0.5 * k);   // the dark throat
      // the wind: streaks curving in from in front of it, into the jaw
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 2;
      for (let j = 0; j < 9; j++) { const off = (j - 4) * 0.16, u0 = (t * 2.2 + j * 0.29) % 1; ctx.globalAlpha = Math.min(1, 0.4 * k * Math.sin(u0 * Math.PI)); ctx.beginPath();
        for (let i = 0; i <= 5; i++) { const u = Math.min(1, u0 + i * 0.05), r = (140 * (1 - u) + 30) * S * 0.8, aa = a + off * Math.pow(1 - u, 0.6) * 2.4; const px = x + Math.cos(aa) * r, py = y + Math.sin(aa) * r * 0.7; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); }
      ctx.restore();
      gorgemawMaw(ctx, x, y, Rj, a, (0.5 + 1.4 * open) * (1 - shut), k, { teeth: 20, thick: 0.38 });
    } });
    // everything in front of it streams in: rock and torn air
    for (let i = 0; i < 18; i++) { const s = rand(0.3, 1), aa = a + rand(-0.7, 0.7), d = 40 * S + Math.hypot(c.tx - c.x, c.ty - c.y) * s + rand(0, 60 * S), x = c.x + Math.cos(aa) * d, y = c.y + Math.sin(aa) * d * 0.8, rock = i % 3 === 0;
      V.spawn({ x, y, z: rock ? 8 : rand(6, 30), vx: (c.x - x) * 2.2, vy: (c.y - y) * 2.2, vz: 20, life: 0.42, size: rock ? rand(7, 11) : rand(8, 13), size1: rock ? 4 : 2, color: rock ? '#3a2a30' : '#f0dce8', kind: rock ? 'shard' : undefined, add: rock ? false : undefined, stretch: rock ? 0 : 5, vr: rock ? 10 : 0 }); }
    c.later(LAND, () => {
      camHit(c.cam, '#ffc080', 1.1);
      shake(10);
      // the ring of teeth slams shut round the enemy
      V.fx({ dur: 0.5, layer: 'ground', draw: (ctx, p, t, fx) => {
        const q = Math.min(1, p / 0.22), k = fx.a * Math.min(1, (1 - p) / 0.35);
        V.glowAt(ctx, c.tx, c.ty, R * 1.1, '#ff5a3a', 0.35 * k * (1 - p));
        gorgemawMaw(ctx, c.tx, c.ty, R * (1.35 - 0.35 * q), a + Math.PI, 1.6 * (1 - q), k, { teeth: 24, thick: 0.32, bite: 0.8 + 0.4 * q });
      } });
      V.flash(c.tx, c.ty - 20, 46 * S, '#ffe0b0', 0.15);   // the bright core of the bite, brief
      if (g) g.crumbs(c.tx, c.ty, 20 * S, '#c8a070', 14);
      V.spikeburst(c.tx, c.ty, { r: 56 * S, n: 18, color: '#d0306a', core: '#ffe0b0', ink: GINK, dur: 0.3 });
      for (let i = 0; i < 2; i++) V.shock(c.tx, c.ty, { r: (110 + i * 40) * S, color: i ? TGLOW : '#ffffff', dur: 0.55, w: 8 - i * 3, delay: 0.08 + i * 0.08 });
      V.debris(c.tx, c.ty, { n: 16, color: '#3a2a30', hot: true, speed: 1.5, size: 1.4 });
      gorgemawScorch(c.tx, c.ty, R * 0.9, 4.5, { teeth: 24, delay: 0.3, cracks: 14, ink: 0.42, glow: 0.2, lw: 2 });
      // the warmth spills over the party: a gold ring off the Gorgemaw
      V.shock(e.x, e.y, { r: 170, color: '#ffd27a', dur: 0.7, w: 5, delay: 0.1 });
      V.plus(e.x, e.y, { color: '#ffd8a0', n: 5 });
    });
    c.later(0.7, () => { if (ABILITY_VFX.gorgemaw.wide) ABILITY_VFX.gorgemaw.wide(Object.assign({}, c, { x: e.x, y: e.y })); });
  };
  // the Morsels (d.m: their shapes' first letters): each flies out of the belly into the bite, and after it the spirits
  // fly home round the teeth (the warmth: the heal and the party's shields)
  KIT_VFX['maw-ruin'] = Object.assign((e, target, d) => {
    const letters = String((d && d.m) || '').slice(0, 6), t = target || e, mouth = () => mouthOf(e);
    const S = GORGEMAW_ULT_SCALE, ss = Math.sqrt(S);
    for (let i = 0; i < letters.length; i++) gorgemawSpirit(gorgemawArc(mouth, { x: t.x, y: t.y, z: 16 }, i % 2 ? 0.25 : -0.25, 30 * ss), mcol(LETTER[letters[i]] || 'ring'), 0.3, 0.06 + i * 0.05, ss);
    const home = letters || 'rr';
    for (let i = 0; i < home.length; i++) { const a = Math.random() * Math.PI * 2;
      gorgemawSpirit(gorgemawArc({ x: t.x + Math.cos(a) * 72 * S, y: t.y + Math.sin(a) * 50 * S, z: 10 }, mouth, i % 2 ? 0.3 : -0.3, 50 * ss), letters ? mcol(LETTER[home[i]] || 'ring') : TGLOW, 0.7, 1 + i * 0.08, ss); }
  }, { atTarget: true });

  // ---- the moves on the sheet
  Object.assign(ABILITY_VFX.gorgemaw, {
    // Gnash > Rend > Gulp (vfx2, after WoW Brewmaster: two light Tiger Palms, then the Keg Smash). Gnash and Rend are quick
    // crescent bites from either side, gone in a quarter second with nothing left on the floor; Gulp rears the whole jaw open
    // over the target, slams it shut round it (a hit-stop, a shake), a mouthful flies home and only it leaves a scorch.
    // (The kit sends no combo step for Gnash yet: c.step if it comes, else counted per hero as the kit counts it)
    gnash: c => {
      const g = G(), M = GORGEMAW_MOVE_SCALE, e = c.ent, a = Math.atan2(c.ty - c.y, c.tx - c.x), dist = Math.hypot(c.tx - c.x, c.ty - c.y), d = Math.min(dist, 48), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
      const st = e.gorgeBite || (e.gorgeBite = { n: -1, at: -99 }); st.n = c.step != null ? c.step % 3 : FX.now - st.at > 15 ? 0 : (st.n + 1) % 3; st.at = FX.now; const n = st.n;
      if (n < 2) {
        const fl = n ? -1 : 1;   // Rend comes from the other side
        V.fx({ dur: 0.26, layer: 'air', draw: (ctx, p, t, fx) => {
          const q = Math.min(1, p / 0.35), k = fx.a * Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.4);
          // the swing: pale streaks trailing the jaw's sweep
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 1.8; ctx.globalAlpha = Math.min(1, 0.45 * k * (1 - q * 0.5)); ctx.beginPath();
          for (let j = 0; j < 3; j++) { const r = (22 + j * 8) * M, a1 = a + fl * (0.5 * (1 - q) + 1.2), a2 = a1 + fl * 1.1; ctx.moveTo(x + Math.cos(a1) * r, y - 14 + Math.sin(a1) * r * 0.75); ctx.quadraticCurveTo(x + Math.cos((a1 + a2) / 2) * r * 1.1, y - 14 + Math.sin((a1 + a2) / 2) * r * 0.8, x + Math.cos(a2) * r, y - 14 + Math.sin(a2) * r * 0.75); }
          ctx.stroke(); ctx.restore();
          gorgemawMaw(ctx, x, y, 30 * M * (1.2 - 0.2 * q), a + fl * 0.5 * (1 - q), 3.2 - 0.9 * q, k, { teeth: 11, thick: 0.4, z: 14, flat: 0.75 });
        } });
        c.later(0.08, () => { V.hit(c.tx, c.ty, '#ffe0b0', 0.55 + 0.15 * n); if (g) g.crumbs(c.tx, c.ty, 16 * M, '#c8a070', 3 + n);
          if (n) V.splash(c.tx, c.ty, { n: 3, color: SLIME, size: 0.6, speed: 0.6 }); shake(0.5 + 0.5 * n); });
        return;
      }
      // Gulp: 0-0.2 the jaw rears wide over the target, 0.2-0.33 it slams shut round it, then it fades
      const R = 34 * M, DUR = 0.42, SHUT = 0.33 * DUR;
      V.fx({ dur: DUR, layer: 'air', draw: (ctx, p, t, fx) => {
        const open = p < 0.2 ? easeOut(p / 0.2) : Math.max(0, 1 - (p - 0.2) / 0.13), k = fx.a * Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.35);
        V.glowAt(ctx, c.tx, c.ty - 16, R * 1.3, '#ff3a6a', 0.3 * k * open);
        gorgemawMaw(ctx, c.tx, c.ty, R * (1.1 + 0.25 * open), a + Math.PI, 0.25 + 2.6 * open, k, { teeth: 14, thick: 0.38, z: 16, flat: 0.75, bite: 0.8 + 0.4 * (1 - open) });
      } });
      c.later(SHUT, () => {
        V.hit(c.tx, c.ty, '#ffe0b0', 1); if (g) g.crumbs(c.tx, c.ty, 18 * M, '#c8a070', 7);
        V.shock(c.tx, c.ty, { r: 56 * M, color: TGLOW, dur: 0.3, w: 4 }); V.debris(c.tx, c.ty, { n: 3, color: '#3a2a30', speed: 0.6 });
        gorgemawScorch(c.tx, c.ty, R * 0.85, 0.9, { teeth: 12, glow: 0.14, ink: 0.26, lw: 1.5 });
        // the mouthful flies home to the Gorgemaw's own jaw
        gorgemawSpirit(gorgemawArc({ x: c.tx, y: c.ty, z: 18 }, () => mouthOf(e), 0.3, 26), TGLOW, 0.3, 0.04, 0.9);
        shake(3); if (e.st && typeof hitStop === 'function') hitStop(e.st, 0.06, FX.now);
      });
    },
    // Open Wide: the jaw opens on the front, a funnel of wind pours into it, a dark spiral is left on the floor
    wide: c => { const e = c.ent, dur = 1.6, M = GORGEMAW_MOVE_SCALE; if (e.st) e.st.jawUntil = FX.now + 1.5;
      V.fx({ dur, layer: 'ground', draw: (ctx, p, t, fx) => {   // the funnel: streaks of air running in along a cone
        const m = mouthOf(e), a = e.angle || 0, k = fx.a * Math.min(1, t / 0.12) * Math.min(1, (1 - p) / 0.2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 2;
        for (let j = 0; j < 9; j++) { const off = (j - 4) * 0.16, sw = j % 2 ? 1 : -1;
          for (let s = 0; s < 2; s++) { const u0 = (t * 1.6 + j * 0.37 + s * 0.5) % 1; ctx.globalAlpha = Math.min(1, 0.5 * k * Math.sin(u0 * Math.PI)); ctx.beginPath();
            for (let i = 0; i <= 4; i++) { const u = Math.min(1, u0 + i * 0.04), r = 150 * M * (1 - u) + 10, aa = a + off * Math.pow(1 - u, 0.7) + sw * 0.4 * u; const px = m.x + Math.cos(aa) * r, py = m.y + Math.sin(aa) * r * 0.7; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
            ctx.stroke(); } }
        ctx.restore();
      } });
      V.fx({ dur, layer: 'air', draw: (ctx, p, t, fx) => {   // the jaw itself, open toward the front
        const m = mouthOf(e), open = Math.min(1, t / 0.12) * (p > 0.85 ? (1 - p) / 0.15 : 1), k = fx.a * Math.min(1, t / 0.08) * (p > 0.85 ? (1 - p) / 0.15 : 1), a = e.angle || 0;
        V.glowAt(ctx, m.x + Math.cos(a) * 10, m.y - m.z + Math.sin(a) * 6, 22 * M, '#ff3a6a', 0.35 * k);
        gorgemawMaw(ctx, m.x - Math.cos(a) * 4, m.y, (16 + 6 * open) * M, a, 0.4 + 1.5 * open, k, { teeth: 12, thick: 0.42, z: m.z, flat: 0.8 });
      }, tick: () => { if (Math.random() < 0.55) { const m = mouthOf(e), a = (e.angle || 0) + rand(-0.7, 0.7), d = rand(70, 140) * M, x = m.x + Math.cos(a) * d, y = m.y + Math.sin(a) * d * 0.7, rock = Math.random() < 0.3;
        V.spawn({ x, y, z: rock ? 6 : rand(10, 34), vx: (m.x - x) * 3.5, vy: (m.y - y) * 3.5, vz: rock ? 30 : 0, life: 0.28, size: rock ? 7 : 7, size1: rock ? 3 : 1, color: rock ? '#3a2a30' : '#ffe8d8', kind: rock ? 'shard' : undefined, add: rock ? false : undefined, stretch: rock ? 0 : 4, vr: rock ? 10 : 0 }); } } });
      V.swirl(e.x, e.y, { r: 44 * M, color: '#ffb070', dur: 0.45, inward: true, follow: e });
      c.later(dur * 0.75, () => { const a = e.angle || 0; gorgemawSpiral(e.x + Math.cos(a) * 44 * M, e.y + Math.sin(a) * 28 * M, 34 * M, 1.8, { arms: 4, color: '#a04a9a', glow: 0.48, spin: -1.5 }); });
    },
  });

  // Spit: the Morsel goes back out in its shape (d: { m: shape, f: fused, n: order in a Regurgitate volley }). A Ring is a
  // green slime glob with the Morsel glowing in it, splashing into puddles; a Lance a straight bolt, a Fang a cone of
  // teeth (slime spattered where it bites), a Spike a great yellow spike
  KIT_VFX.spit = Object.assign((e, target, d) => {
    const g = G(); if (!g) return;
    const m = (d && d.m) || 'ring', f = d && d.f, s = (f ? 1.7 : 1) * GORGEMAW_MOVE_SCALE, col = g.MCOL(m), t = target || { x: e.x + Math.cos(e.angle || 0) * 200, y: e.y + Math.sin(e.angle || 0) * 200 };
    const go = () => {
      const q = g.mouth(e), sa = Math.atan2(t.y - q.y, t.x - q.x);
      g.chomp(q.x, q.y, q.z, 0.8 * s, col, 0.2);
      // (vfx2) the recoil: the head kicks back (a puff of dust off the heels) and slime sprays out of the mouth ahead of the shot
      V.smoke(e.x - Math.cos(sa) * 12, e.y - Math.sin(sa) * 8, { n: 2, color: '#c8b080', size: 16, a: 0.4, speed: 50, life: 0.5 });
      for (let i = 0; i < 4; i++) { const da = rand(-0.35, 0.35), sp = rand(160, 260); V.spawn({ x: q.x, y: q.y, z: q.z, vx: Math.cos(sa + da) * sp, vy: Math.sin(sa + da) * sp * 0.7, vz: rand(20, 80), g: 500, life: rand(0.25, 0.4), size: rand(4, 6), color: SLIME, kind: 'drop', add: false }); }
      for (let i = 0; i < 3; i++) V.spawn({ x: q.x + rand(-6, 6), y: q.y, z: q.z, vx: rand(-20, 20), vz: rand(-20, 30), g: 400, life: 0.45, size: rand(4, 6), color: SLIME, kind: 'drop', add: false });   // drool
      if (m === 'ring') gorgemawGlob(q, t, col, 1.2 * s, (x, y) => { for (let i = 0; i < (f ? 3 : 2); i++) V.shock(x, y, { r: (60 + i * 30) * s, color: col, dur: 0.45, w: 6, delay: i * 0.08 });
        V.spikeburst(x, y, { r: 38 * s, n: 14, color: SLIME, core: '#f0ffb0', ink: '#14300a', dur: 0.3 }); V.splash(x, y, { n: 10, color: SLIME }); V.flash(x, y - 12, 26 * s, '#f0ffb0', 0.14); gorgemawPuddles(x, y, col, s * 1.35, 2.4); shake(2 * s); });
      else if (m === 'lance') V.missile(q.x, q.y, t.x, t.y, { style: 'blade', color: col, speed: 1500, size: 1.4 * s, onHit: (x, y) => { V.spikeburst(x, y, { r: 36 * s, n: 10, color: col, core: '#ffffff', ink: '#0a2030', dur: 0.3 }); V.beam(q.x, q.y, x, y, { color: col, w: 6 * s, dur: 0.25 }); shake(2 * s); } });
      else if (m === 'fang') { V.breath(q.x, q.y, Math.atan2(t.y - q.y, t.x - q.x), { len: Math.min(220, Math.hypot(t.x - q.x, t.y - q.y) + 20) * s, span: 0.6 * s, color: col });
        FX.later(0.15, () => { g.chomp(t.x, t.y, 20, 1.2 * s, col, 0.3); V.splash(t.x, t.y, { n: 6, color: SLIME }); gorgemawPuddles((q.x + t.x) / 2, (q.y + t.y) / 2, col, 0.7 * s, 1.6); }); }
      else V.missile(q.x, q.y, t.x, t.y, { style: 'meteor', color: col, speed: 900, arc: 30, size: 1.2 * s, onHit: (x, y) => { V.spikeburst(x, y, { r: 64 * s, n: 16, color: '#ffd23a', core: '#fffbe0', ink: '#3a2a08', dur: 0.4 }); V.crystals(x, y, { color: col, n: 6, r: 40 * s, h: 60 * s, dur: 0.9 }); V.shock(x, y, { r: 120 * s, color: col, dur: 0.5, w: 7 }); shake(5 * s); } });
      if (f) FX.later(0.3, () => FX.text(t.x, t.y - 80, MAW.FUSION[m], '#fff0c8', 15, 0.9));
    };
    const n = (d && d.n) || 0; if (n) FX.later(n * 0.14, go); else go();
  }, { atTarget: true });
  // Digest (d: { n eaten, m: their shapes' first letters }): the Morsels spiral into the belly, a spiral seal glows under it
  KIT_VFX.digest = (e, target, d) => {
    const n = Math.min(6, (d && d.n) || 0), letters = String((d && d.m) || ''), M = GORGEMAW_MOVE_SCALE;
    V.swirl(e.x, e.y, { r: 46 * M, color: '#ffc070', dur: 0.6, inward: true, follow: e });
    V.fx({ dur: 0.6, layer: 'ground', follow: e, draw: (ctx, p, t, fx) => {   // the eddy: pale streaks spiralling in round the belly
      const kk = fx.a * Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 1.8; ctx.globalAlpha = Math.min(1, 0.35 * kk); ctx.beginPath();
      for (let j = 0; j < 5; j++) { const b = j * Math.PI * 2 / 5 + t * 5; for (let i = 0; i <= 8; i++) { const q = i / 8, aa = b + q * 1.6, r = (90 - 50 * q) * M; const px = e.x + Math.cos(aa) * r, py = e.y + Math.sin(aa) * r * 0.6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } }
      ctx.stroke(); ctx.restore();
    } });
    for (let i = 0; i < n; i++) { const a0 = i * Math.PI * 2 / Math.max(1, n), col = mcol(LETTER[letters[i]] || 'ring');
      gorgemawSpirit(p => { const a = a0 + p * 4.5, r = 80 * M * (1 - p) + 4; return { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.6, z: 22 + 10 * (1 - p) }; }, col, 0.6, i * 0.06, 1.15); }
    gorgemawSpiral(e.x, e.y, 40 * M, 1.7, { follow: e, veins: true, ink: '#3a0a34', delay: 0.45, spin: 2.5, glow: 0.62 });
    FX.later(0.5, () => { V.plus(e.x, e.y, { color: '#ffd8a0', n: 3 + n }); if (e.spec === 'gizzard' && n) V.shock(e.x, e.y, { r: 160, color: '#ffc070', dur: 0.6, w: 5 });
      // (vfx2, after Purifying Brew) the purge: sour dark puffs blown off the body, then warm gold motes rising off it
      V.smoke(e.x, e.y, { n: 3 + Math.min(3, n), r: 12, color: '#4a4a24', size: 18, a: 0.45, speed: 90, life: 0.6 });
      V.motes(e.x, e.y, { color: '#ffd27a', n: 4 + Math.min(4, n), r: 22, kind: 'star' }); });
  };
})();

// ======================================================================= VFX PASS · OATHBROKER (docs/art/vfx-reference/oathbroker.png)
// Lilac light, gold coins, parchment pages, a dark red wax seal bearing the scales. Final Reckoning: a clock dial with a
// vortex of pages round the knight, a great wax-seal stamp let down on a golden chain slams onto the enemy, and a big
// seal is left on the floor with coins and pages scattered round it. Collect: coins arcing back. Lien: golden chains
// wrap the target round a seal. Settle: a stamp comes down, coins fly. Writ: a glowing contract is written out on the
// floor. Co-Sign: two seals linked by a line. The wax on the floor is kept dark and faint (red telegraphs must read).
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const O = () => globalThis.OATHBROKER_VFX;
  const LIL = '#b8a8e0', GOLD = '#ffd27a', GOLD2 = '#d8a038', WAX = '#7a1a2a', WAXL = '#c0485a', WAXD = '#3e0a14', PAPER = '#efe4cc', INK = '#2a2034';
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };
  // the size knobs: Final Reckoning's footprint (the clock, the stamp, the seal left), and the supporting moves'
  const OATHBROKER_ULT_SCALE = 1.8, OATHBROKER_MOVE_SCALE = 1.3;

  // ---- primitives
  // the scales (a sword for the post): traced at the origin, s per unit
  function oathScales(c, s) {
    c.moveTo(0, -10 * s); c.lineTo(0, 9 * s); c.moveTo(-4 * s, 9 * s); c.lineTo(4 * s, 9 * s); c.moveTo(-3 * s, -6.5 * s); c.lineTo(3 * s, -6.5 * s);
    c.moveTo(-9 * s, -3 * s); c.lineTo(9 * s, -3 * s);
    for (const d of [-1, 1]) { c.moveTo(d * 9 * s, -3 * s); c.lineTo(d * 5.5 * s, 3 * s); c.moveTo(d * 9 * s, -3 * s); c.lineTo(d * 12.5 * s, 3 * s); c.moveTo(d * 5 * s, 3 * s); c.quadraticCurveTo(d * 9 * s, 7.5 * s, d * 13 * s, 3 * s); }
  }
  // gold coins: flipping discs thrown from (x, y) (vx, vy: a push toward somewhere; else all round)
  function oathCoins(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(60, 200) * (o.speed ?? 1);
      V.spawn({ x: x + rand(-6, 6), y, z: o.z ?? 20, vx: (o.vx ?? 0) * rand(0.8, 1.2) + Math.cos(a) * sp * (o.vx != null ? 0.3 : 1), vy: (o.vy ?? 0) * rand(0.8, 1.2) + Math.sin(a) * sp * 0.6 * (o.vx != null ? 0.3 : 1), vz: rand(140, 260), g: 600, bounce: true,
        life: rand(0.7, 1.1) * (o.life ?? 1), size: rand(7, 9) * (o.size ?? 1), color: i % 3 ? GOLD : '#fff2c0', kind: 'petal', add: false, vr: rand(-4, 4), flutter: 11 }); }
  }
  // a chain of gold links from (x1, y1) to (x2, y2): flat links and edge-on links in turn, a faint glow along it
  function oathChain(c, x1, y1, x2, y2, k, L = 9) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.min(48, Math.floor(d / L)), a = Math.atan2(y2 - y1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a);
    if (n < 1 || k <= 0.01) return;
    c.save(); c.lineCap = 'round';
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.22 * k); c.strokeStyle = GOLD; c.lineWidth = 8; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.min(1, k);
    c.beginPath(); for (let i = 0; i < n; i += 2) { const cx = x1 + ca * (i + 0.5) * L, cy = y1 + sa * (i + 0.5) * L; c.moveTo(cx + ca * L * 0.62, cy + sa * L * 0.62); c.ellipse(cx, cy, L * 0.62, L * 0.32, a, 0, Math.PI * 2); }
    c.strokeStyle = GOLD2; c.lineWidth = 2.2; c.stroke();
    c.beginPath(); for (let i = 1; i < n; i += 2) { const cx = x1 + ca * (i + 0.5) * L, cy = y1 + sa * (i + 0.5) * L; c.moveTo(cx - ca * L * 0.6, cy - sa * L * 0.6); c.lineTo(cx + ca * L * 0.6, cy + sa * L * 0.6); }
    c.lineWidth = 3; c.stroke();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.6 * k); c.strokeStyle = '#fff2c0'; c.lineWidth = 1; c.stroke();
    c.restore();
  }
  // a loop of chain round (x, y - z): rx by ry, its back half dimmer (behind the target)
  function oathChainLoop(c, x, y, rx, ry, k, rot = 0) {
    const n = 18; c.save(); c.lineCap = 'round';
    for (const back of [true, false]) {
      c.beginPath();
      for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2, s = Math.sin(a); if ((s < 0) !== back) continue;
        const px = x + Math.cos(a) * rx, py = y + s * ry, ta = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
        if (i % 2) { c.moveTo(px + Math.cos(ta) * 5, py + Math.sin(ta) * 5); c.ellipse(px, py, 5, 2.6, ta, 0, Math.PI * 2); } else { c.moveTo(px - Math.cos(ta) * 5, py - Math.sin(ta) * 5); c.lineTo(px + Math.cos(ta) * 5, py + Math.sin(ta) * 5); } }
      c.globalAlpha = Math.min(1, k * (back ? 0.45 : 1)); c.strokeStyle = GOLD2; c.lineWidth = 2.2; c.stroke();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, k * (back ? 0.3 : 0.7)); c.strokeStyle = '#fff2c0'; c.lineWidth = 0.9; c.stroke(); c.globalCompositeOperation = 'source-over';
    }
    c.restore();
  }
  // a wax seal on the floor: a lumpy dark-red round with drips, a raised rim, the scales pressed in it, gold while it's
  // hot; o.coins / o.pages scatter a few round it. o.a: how strong (kept low: red marks must not read as telegraphs)
  function oathWaxSeal(x, y, R, o = {}) {
    const dur = o.dur ?? 3, A = o.a ?? 0.45, nb = 22, bumps = Array.from({ length: nb }, () => rand(0.94, 1.1));
    const drips = Array.from({ length: 5 }, () => ({ a: rand(0, Math.PI * 2), L: rand(0.1, 0.22) }));
    const litter = Array.from({ length: (o.coins || 0) + (o.pages || 0) }, (_, i) => { const a = rand(0, Math.PI * 2), d = R * rand(0.95, 1.5); return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: rand(0, 3), coin: i < (o.coins || 0) }; });
    // o.fill: the wax body's share of the strength (the rims, the scales and the litter keep all of it); o.gold: the
    // gold of the rim and scales stays this strong after the heat has gone (the mark reads by its outline, not its red)
    const ls = Math.max(1, R / 60);
    V.fx({ dur, delay: o.delay, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.03) * Math.min(1, (1 - p) / 0.35) * A, sq = t < 0.1 ? 1.2 - t * 2 : 1, heat = Math.max(0, 1 - t / 0.9), cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y;
      c.save(); c.translate(cx, cy); c.scale(sq, sq * 0.7);
      for (const l of litter) { c.save(); c.translate(l.x, l.y); c.rotate(l.r); c.scale(ls, ls);
        if (l.coin) { c.globalAlpha = Math.min(1, k * 1.6); c.fillStyle = GOLD2; c.beginPath(); c.ellipse(0, 0, 4.5, 3.2, 0, 0, Math.PI * 2); c.fill(); }
        else { c.globalAlpha = Math.min(1, k * 1.1); c.fillStyle = PAPER; c.fillRect(-7, -5, 14, 10); c.fillStyle = INK; c.globalAlpha *= 0.5; c.fillRect(-5, -2, 9, 1); c.fillRect(-5, 1, 7, 1); }
        c.restore(); }
      c.globalAlpha = Math.min(1, k * (o.fill ?? 1)); c.fillStyle = WAX; c.beginPath();
      for (let i = 0; i < nb; i++) { const a = i / nb * Math.PI * 2, r = R * bumps[i]; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); for (const d of drips) { const dx = Math.cos(d.a) * R * (1 + d.L * 0.5), dy = Math.sin(d.a) * R * (1 + d.L * 0.5); c.moveTo(dx + R * d.L * 0.5, dy); c.arc(dx, dy, R * d.L * 0.5, 0, Math.PI * 2); } c.fill();
      c.globalAlpha = Math.min(1, k); c.lineWidth = Math.max(1.5, R * 0.06); c.strokeStyle = WAXD; c.beginPath(); c.arc(0, 0, R * 0.78, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 1.2; c.strokeStyle = WAXL; c.beginPath(); c.arc(0, 0, R * 0.66, 0, Math.PI * 2); c.stroke();
      c.lineWidth = Math.max(1.2, R * 0.04); c.strokeStyle = WAXD; c.beginPath(); oathScales(c, R / 24); c.stroke();
      const gk = Math.max(heat * 1.4, o.gold ?? 0);
      if (gk > 0.02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, k * gk); c.strokeStyle = GOLD; c.lineWidth = Math.max(1.4, R * 0.018); c.beginPath(); c.arc(0, 0, R * 0.78, 0, Math.PI * 2); oathScales(c, R / 24); c.stroke();
        if (o.gold) { c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R * 1.04, 0, Math.PI * 2); c.stroke(); } }
      c.restore();
    } });
  }
  // the stamp: a red-handled seal with a gold face let down onto (x, y) (on a gold chain from `from`, if given),
  // slamming at `fall` seconds, then lifting off and fading
  function oathStamp(x, y, R, o = {}) {
    const fall = o.fall ?? 0.3, dur = fall + (o.hold ?? 0.25), H = o.h ?? 220, from = o.from;
    V.fx({ dur, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const q = Math.min(1, t / fall), after = Math.max(0, t - fall), z = H * (1 - q * q) + after * 60, k = e.a * Math.min(1, t / 0.08) * (after > 0 ? 1 - after / (dur - fall) : 1), sy = y - z;
      c.save(); c.globalAlpha = Math.min(1, 0.35 * k * q); c.fillStyle = '#000000'; c.beginPath(); c.ellipse(x, y, R * (0.5 + 0.5 * q), R * 0.35 * (0.5 + 0.5 * q), 0, 0, Math.PI * 2); c.fill(); c.restore();   // its shadow
      if (from) oathChain(c, from.x, from.y - 24, x, sy - R * 1.9, k * Math.min(1, t / 0.15), o.link ?? 9);
      c.save(); c.globalAlpha = Math.min(1, k);
      const hw = R * 0.3, g = c.createLinearGradient(x - hw, 0, x + hw, 0); g.addColorStop(0, WAXD); g.addColorStop(0.4, WAXL); g.addColorStop(1, WAXD);
      c.fillStyle = g; c.fillRect(x - hw, sy - R * 1.85, hw * 2, R * 1.5);   // the handle
      c.beginPath(); c.ellipse(x, sy - R * 1.85, hw * 1.25, hw * 0.55, 0, 0, Math.PI * 2); c.fill();   // its knob
      c.fillStyle = GOLD2; c.beginPath(); c.ellipse(x, sy - R * 0.32, hw * 1.5, hw * 0.5, 0, 0, Math.PI * 2); c.fill();   // the collar
      c.fillStyle = '#6a4410'; c.beginPath(); c.ellipse(x, sy + 4, R, R * 0.4, 0, 0, Math.PI * 2); c.fill();   // the face's edge
      c.fillStyle = GOLD; c.beginPath(); c.ellipse(x, sy, R, R * 0.4, 0, 0, Math.PI * 2); c.fill();   // the gold face
      c.strokeStyle = '#6a4410'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, sy, R * 0.72, R * 0.29, 0, 0, Math.PI * 2); c.stroke();
      c.restore();
      if (q >= 1 && after < 0.12) V.glowAt(c, x, y, R * 1.6, GOLD, k * (1 - after / 0.12));
    } });
  }
  // a parchment of light lying on the floor, written out line by line, a little seal in its corner
  function oathParchment(x, y, ang, w, h, dur, s = 1) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) / 0.4), write = Math.min(1, t / 0.55);
      V.glowAt(c, x, y, w * 0.7 * s, LIL, 0.25 * k);
      c.save(); c.translate(x, y); c.scale(s, 0.7 * s); c.rotate(ang);
      c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.quadraticCurveTo(w / 2 + 6, 0, w / 2, h / 2); c.lineTo(-w / 2, h / 2); c.quadraticCurveTo(-w / 2 - 6, 0, -w / 2, -h / 2); c.closePath();
      c.globalAlpha = Math.min(1, 0.45 * k); c.fillStyle = PAPER; c.fill();
      V.neonPath(c, LIL, 1.4, k * 0.8, () => { c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.quadraticCurveTo(w / 2 + 6, 0, w / 2, h / 2); c.lineTo(-w / 2, h / 2); c.quadraticCurveTo(-w / 2 - 6, 0, -w / 2, -h / 2); });
      c.globalAlpha = Math.min(1, 0.7 * k); c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath();
      for (let i = 0; i < 4; i++) { const q = Math.min(1, Math.max(0, write * 4 - i)), x0 = -w / 2 + 6, L = (w * (i === 3 ? 0.4 : 0.62)) * q, yy = -h / 2 + 8 + i * 7;
        for (let s = 0; s <= 10; s++) { const xx = x0 + L * s / 10; s ? c.lineTo(xx, yy + Math.sin(s * 2.1 + i) * 1.4) : c.moveTo(xx, yy); } }
      c.stroke();
      if (write >= 1) V.neonPath(c, LIL, 1.2, k, () => { c.moveTo(w / 2 - 4, h / 2 - 11); c.arc(w / 2 - 12, h / 2 - 11, 8, 0, Math.PI * 2); oathScalesAt(c, w / 2 - 12, h / 2 - 11, 0.35); });
      c.restore();
    } });
  }
  const oathScalesAt = (c, x, y, s) => { c.save(); c.translate(x, y); oathScales(c, s); c.restore(); };
  // the dial of a clock on the floor round `ent`: Roman ticks, its hands spinning back, pages whirled round it
  function oathClock(ent, R0, dur, nPages = 10) {
    const u = Math.max(1, R0 / 72), NUM = ['XII', 'III', 'VI', 'IX'];
    V.fx({ dur, layer: 'ground', follow: ent, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1) * Math.min(1, (1 - p) / 0.3), x = ent.x, y = ent.y, F = 0.62, R = R0 * (0.7 + 0.3 * (1 - Math.pow(1 - Math.min(1, t / 0.22), 2)));
      V.glowAt(c, x, y, R * 1.1, '#8a5ad8', 0.38 * k);
      V.neonRing(c, x, y, R, '#9a6ad8', 2.6 * Math.sqrt(u), k, F); V.neonRing(c, x, y, R * 1.08, LIL, 1.2, k * 0.5, F); V.neonRing(c, x, y, R * 0.8, LIL, 1.2, k * 0.6, F);
      V.neonPath(c, LIL, 1.3, k * 0.85, () => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, m = i % 3 === 0 ? 3 : 1, ca = Math.cos(a), sa = Math.sin(a);
        if (i % 3 === 0) continue;   // (the quarters carry numerals)
        for (let j = 0; j < m; j++) { const off = (j - (m - 1) / 2) * 3.2 * u, px = x + ca * R * 0.9 - sa * off, py = y + (sa * R * 0.9 + ca * off) * F; c.moveTo(px - ca * 4 * u, py - sa * 4 * u * F); c.lineTo(px + ca * 4 * u, py + sa * 4 * u * F); } } });
      // the Roman numerals at the quarters, laid flat on the floor
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.85 * k); c.fillStyle = '#e6dcff'; c.font = 'bold ' + Math.round(10 * u) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + i * Math.PI / 2, px = x + Math.cos(a) * R * 0.9, py = y + Math.sin(a) * R * 0.9 * F; c.save(); c.translate(px, py); c.scale(1, F); c.fillText(NUM[i], 0, 0); c.restore(); }
      c.restore();
      V.neonPath(c, '#efe4ff', 2.6 * Math.sqrt(u), k, () => { const a1 = -t * 14, a2 = -t * 3.5; c.moveTo(x, y); c.lineTo(x + Math.cos(a1) * R * 0.7, y + Math.sin(a1) * R * 0.7 * F); c.moveTo(x, y); c.lineTo(x + Math.cos(a2) * R * 0.45, y + Math.sin(a2) * R * 0.45 * F); });
    } });
    for (let i = 0; i < nPages; i++) { const a = Math.random() * Math.PI * 2, r = R0 * rand(0.8, 1.3);
      V.spawn({ x: ent.x, y: ent.y, z: rand(10, 50 * u), life: dur * rand(0.8, 1.1), size: rand(13, 17) * Math.sqrt(u), color: i % 3 ? PAPER : '#e6dcff', kind: 'petal', add: false, flutter: 6, vr: rand(-5, 5), orbit: { x: ent.x, y: ent.y, a, r, w: -rand(5, 8), dr: -r * 0.6 / dur, flat: 0.6, follow: ent } }); }
  }

  // ---- Final Reckoning (the Ultimate). The clock, the chain, the stamp and the seal here; oath-reckoning is the
  // settled account going out to the party as shields
  ABILITY_VFX.oathbroker.reckoning = c => {
    const e = c.ent, S = OATHBROKER_ULT_SCALE, R = 44 * S * 0.8, LAND = 0.5;
    if (c.cam) c.cam.dim(0.4, 1.4);
    oathClock(e, 72 * S * 0.85, LAND + 0.15, 20);
    oathStamp(c.tx, c.ty, R, { fall: LAND, hold: 0.32, h: 210 * S * 0.8, from: e, link: 12 });
    c.later(LAND, () => {
      const g = O();
      camHit(c.cam, '#ffd27a', 1.1);
      shake(9);
      V.flash(c.tx, c.ty - 20, 60 * S, '#fff6e0', 0.16);   // the white-hot core of the stamp's blow, brief
      V.spikeburst(c.tx, c.ty, { r: 96 * S * 0.85, n: 20, color: WAXL, core: '#fff0d0', ink: INK, dur: 0.4 });
      for (let i = 0; i < 2; i++) V.shock(c.tx, c.ty, { r: (120 + i * 45) * S, color: i ? GOLD : '#ffffff', dur: 0.6, w: 8 - i * 3, delay: i * 0.08 });
      oathCoins(c.tx, c.ty, 18, { speed: 1.2 * S, size: 1.3 });
      if (g) g.pages(c.tx, c.ty, 16);
      V.debris(c.tx, c.ty, { n: 12, color: '#4a4050', speed: 1.4, size: 1.3 });
      // the seal left: its wax kept faint, its gold rim and scales carrying it (red marks must not read as telegraphs)
      oathWaxSeal(c.tx, c.ty, 84 * S * 0.8, { dur: 4.5, a: 0.5, fill: 0.42, gold: 0.7, coins: 12, pages: 8 });
    });
  };
  KIT_VFX['oath-reckoning'] = (e) => {
    const g = O();
    FX.later(0.5, () => {
      oathWaxSeal(e.x, e.y, 30, { dur: 1.8, a: 0.4, coins: 4 });
      V.shock(e.x, e.y, { r: 170, color: GOLD, dur: 0.7, w: 6 });
      oathCoins(e.x, e.y, 8);
      if (g) g.pages(e.x, e.y, 8, '#ffe6a0');
    });
  };

  // ---- the moves on the sheet
  Object.assign(ABILITY_VFX.oathbroker, {
    // Dun, Levy, Collect: the mace sweeps, coins arc back off the target to the knight; the third stamps a seal
    // (vfx2) a filler stays light, and nothing of it goes on the floor (red marks there read as telegraphs): Dun a swing and a
    // small lilac seal on the target's body; Levy the backhand, a couple of coins drawn home; Collect a small stamp pressed
    // onto the target, a gold-rimmed wax seal, a ring and a beat of hit-stop. (The kit sends no combo step for Collect yet:
    // c.step if it comes, else counted per hero as the kit counts it)
    collect: c => { const g = O(), e = c.ent, M = OATHBROKER_MOVE_SCALE;
      const st = e.oathBlow || (e.oathBlow = { n: -1, at: -99 }); st.n = c.step != null ? c.step % 3 : FX.now - st.at > 15 ? 0 : (st.n + 1) % 3; st.at = FX.now; const n = st.n, third = n === 2;
      V.slash(c.x, c.y, c.ang, { r: (50 + 6 * n) * M, span: 1.4 + 0.2 * n, color: '#e8d8b0', w: 0.4 + 0.05 * n, dur: 0.22, flip: n === 1 });
      if (third) oathStamp(c.tx, c.ty - 28, 14 * M, { fall: 0.12, hold: 0.14, h: 90 * M });
      c.later(third ? 0.12 : 0.08, () => {
        if (g && g.sealUp) g.sealUp(c.tx, c.ty, 28, third ? 15 : 9, third ? g.WAX : LIL, third ? 0.55 : 0.32);
        V.hit(c.tx, c.ty, third ? GOLD : '#e8dcff', third ? 0.8 : 0.5);
        if (third) { V.glint(c.tx, c.ty, { color: GOLD, size: 26 * M }); V.shock(c.tx, c.ty, { r: 60 * M, color: GOLD, dur: 0.3, w: 4 }); shake(2); if (e.st && typeof hitStop === 'function') hitStop(e.st, 0.05, FX.now); }
        if (!n) return;
        oathCoins(c.tx, c.ty, third ? 5 : 2, { vx: (c.x - c.tx) * 1.4, vy: (c.y - c.ty) * 1.4, life: 0.6, size: 1.1 });
        // the debt drawn home: a lilac ribbon curling from the target back to the knight
        const bend = Math.random() < 0.5 ? 1 : -1;
        V.fx({ dur: 0.32, layer: 'air', draw: (ctx, p, t, fx) => { const q = Math.min(1, p / 0.5), k = fx.a * Math.min(1, (1 - p) / 0.4), nx = -(c.ty - c.y), ny = c.tx - c.x;
          V.neonPath(ctx, third ? GOLD : LIL, 2, k * 0.75, () => { for (let i = 0; i <= 14; i++) { const s = i / 14 * q, x = c.tx + (c.x - c.tx) * s + nx * 0.35 * bend * Math.sin(s * Math.PI), y = c.ty - 22 + (c.y - c.ty) * s + ny * 0.35 * bend * Math.sin(s * Math.PI) * 0.6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }); } });
      }); },
    // Settle: coins whirl in a lilac eddy, the stamp comes down beside the knight, a seal with coins and pages is left
    settle: c => { const g = O(), M = OATHBROKER_MOVE_SCALE, x = c.x + Math.cos(c.ang) * 34 * M, y = c.y + Math.sin(c.ang) * 22 * M;
      V.swirl(x, y, { r: 46 * M, color: LIL, dur: 0.32, inward: true });
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; V.spawn({ x, y, z: 26, life: 0.32, size: 9, color: GOLD, kind: 'petal', add: false, flutter: 11, orbit: { x, y, a, r: 44 * M, w: 9, dr: -100 * M, flat: 0.6 } }); }
      oathStamp(x, y, 24 * M, { fall: 0.28, hold: 0.2, h: 140 * M });
      c.later(0.28, () => {
        V.spikeburst(x, y, { r: 44 * M, n: 14, color: WAXL, core: '#fff0d0', ink: INK, dur: 0.3 });
        V.shock(x, y, { r: 90 * M, color: GOLD, dur: 0.4, w: 5 });
        oathCoins(x, y, 10, { size: 1.15 }); if (g) g.pages(x, y, 6);
        oathWaxSeal(x, y, 30 * M, { dur: 2.6, a: 0.5, fill: 0.7, gold: 0.6, coins: 5, pages: 3 });
        shake(2);
      }); },
    // Lien: a golden chain is thrown to the boss and wraps it round a seal; a ring of runes is left under it
    lien: c => { const g = O(), tx = c.tx, ty = c.ty, M = OATHBROKER_MOVE_SCALE;
      if (g) g.pages(c.x, c.y, 5);
      V.fx({ dur: 0.22, layer: 'air', draw: (ctx, p, t, fx) => { const x = c.x + (tx - c.x) * p, y = c.y - 24 + (ty - 30 - c.y + 24) * p; oathChain(ctx, c.x, c.y - 24, x, y, fx.a, 11); V.glowAt(ctx, x, y, 18 * M, GOLD, fx.a); } });
      c.later(0.2, () => {
        V.fx({ dur: 1.4, layer: 'air', draw: (ctx, p, t, fx) => {
          const q = Math.min(1, p / 0.15), k = fx.a * Math.min(1, (1 - p) / 0.35), r = (48 - 14 * q) * M;
          for (let i = 0; i < 3; i++) oathChainLoop(ctx, tx, ty - 16 - i * 20 * M, r * (1 - i * 0.08), r * 0.36, k, t * (i % 2 ? 1.5 : -1.5) + i);
          ctx.save(); ctx.translate(tx, ty - 36 * M); ctx.globalAlpha = Math.min(1, k * 0.9); ctx.fillStyle = WAXL; ctx.beginPath(); ctx.arc(0, 0, 10 * M, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.beginPath(); oathScales(ctx, 0.5 * M); ctx.stroke(); ctx.restore();
        } });
        V.spikeburst(tx, ty - 30, { r: 34 * M, n: 12, color: GOLD, core: '#fff6d0', ink: INK, dur: 0.26 });
        oathCoins(tx, ty, 3);
        V.fx({ dur: 1.8, layer: 'ground', draw: (ctx, p, t, fx) => {   // a faint ring of runes under it, the seal's mark
          const k = fx.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.4) * 0.65, R = 50 * M;
          V.neonRing(ctx, tx, ty, R, WAXL, 1.8, k, 0.62); V.neonRing(ctx, tx, ty, R * 0.8, WAXL, 1, k * 0.7, 0.62); V.neonRing(ctx, tx, ty, R * 1.12, GOLD, 1, k * 0.5, 0.62);
          V.neonPath(ctx, WAXL, 1.1, k * 0.85, () => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * 0.6, x = tx + Math.cos(a) * R * 0.9, y = ty + Math.sin(a) * R * 0.9 * 0.62; ctx.moveTo(x - 3, y + 2.4); ctx.lineTo(x, y - 3); ctx.lineTo(x + 3, y + 2.4); } });
        } });
      }); },
    // Co-Sign: a ribbon of lilac ink runs to the ally, a seal under each of you, linked by a gold line a moment
    cosign: c => { const w = c.tent || c.ent, e = c.ent, M = OATHBROKER_MOVE_SCALE, Rs = 22 * M;
      V.fx({ dur: 0.3, layer: 'air', draw: (ctx, p, t, fx) => { const q = Math.min(1, p / 0.7), kk = fx.a * Math.min(1, (1 - p) / 0.3);
        for (const [col, wd, ph] of [[LIL, 2.6, 0], ['#efe4ff', 1.4, 1.3]]) V.neonPath(ctx, col, wd, kk * (ph ? 0.6 : 1), () => { for (let i = 0; i <= 16; i++) { const s = i / 16 * q, x = e.x + (w.x - e.x) * s, y = e.y - 20 + (w.y - e.y) * s + Math.sin(s * Math.PI * 3 + t * 20 + ph) * 9 * M * Math.sin(s * Math.PI); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }); } });
      c.later(0.22, () => {
        V.fx({ dur: 1.6, layer: 'ground', draw: (ctx, p, t, fx) => { const k = fx.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.45);
          V.neonRing(ctx, e.x, e.y, Rs, LIL, 1.8, k * 0.85, 0.62); V.neonRing(ctx, w.x, w.y, Rs, WAXL, 1.8, k * 0.85, 0.62);
          V.neonRing(ctx, e.x, e.y, Rs * 0.75, LIL, 1, k * 0.5, 0.62); V.neonRing(ctx, w.x, w.y, Rs * 0.75, GOLD, 1, k * 0.5, 0.62);
          V.neonPath(ctx, GOLD, 1.5, k * 0.75, () => { const a = Math.atan2(w.y - e.y, w.x - e.x); ctx.moveTo(e.x + Math.cos(a) * Rs, e.y + Math.sin(a) * Rs * 0.62); ctx.lineTo(w.x - Math.cos(a) * Rs, w.y - Math.sin(a) * Rs * 0.62); oathScalesAt(ctx, w.x, w.y, 0.6 * M); oathScalesAt(ctx, e.x, e.y, 0.6 * M); });
        } });
        V.shield(w, { color: LIL, dur: 1.2, r: 36 });
      }); },
    // Writ of Protection: a lilac scribble runs from the knight's hand to the floor, where a contract writes itself out
    writ: c => { const g = O(), M = OATHBROKER_MOVE_SCALE, a = (c.ang || 0) - 1.1, x = c.x + Math.cos(a) * 58 * M, y = c.y + Math.sin(a) * 40 * M;
      V.shield(c.ent, { shape: 'front', color: PAPER, dur: 2, r: 44 });
      V.lightning(c.x + Math.cos(a) * 14, c.y - 20, x, y, { color: LIL, jag: 8 });
      V.glint(x, y, { color: LIL, size: 26 });
      oathParchment(x, y, a * 0.3, 64, 42, 2.1, M);
      if (g) g.pages(c.x, c.y, 4);
    },
    // (QA) Foreclose: was a borrowed holy light-shaft (it read lime-gold, a paladin's move). Now the class's own: the
    // great stamp let down on its gold chain onto the boss, red wax spikes, coins and pages, a faint seal left
    foreclose: c => { const g = O(), M = OATHBROKER_MOVE_SCALE, tx = c.tx, ty = c.ty;
      oathStamp(tx, ty, 30 * M, { fall: 0.24, hold: 0.24, h: 170 * M, from: c.ent, link: 11 });
      c.later(0.24, () => {
        V.spikeburst(tx, ty, { r: 60 * M, n: 16, color: WAXL, core: '#fff0d0', ink: INK, dur: 0.34 });
        V.shock(tx, ty, { r: 120 * M, color: GOLD, dur: 0.45, w: 5 });
        oathCoins(tx, ty, 8, { size: 1.1 }); if (g) g.pages(tx, ty, 8);
        oathWaxSeal(tx, ty, 40 * M, { dur: 2.2, a: 0.45, fill: 0.5, gold: 0.6, coins: 4, pages: 2 });
        shake(5);
      }); },
  });
})();

// ======================================================================= ULTIMATES · healers (kits.js HEALER ULTIMATES)
// Cleric · Dawn Breaks, Grovekeeper · World Tree, Chronomancer · Time Reversal, Alembist · Magnum Opus, Threadweaver ·
// Grand Loom. Each: a 0.4s wind-up on the caster, ONE impact at HEAL_ULT_LAND (the hit-stop, the camera push and the
// flash: your own hero only, c.cam), a mark on the floor that lingers as long as the moment does, and a KIT_VFX
// moment (atTarget) for the blow on the boss, sent by the kit as it lands (k.fx). Everyone else's plays at 0.6.
// The primitives here are local to this block and prefixed with their class.
(() => {
  const V = VFX, TAU = Math.PI * 2, shake = s => vfxShake(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const LAND = 0.4;
  const impact = (cam, col, a = 0.2, stop = 0.08) => { if (cam) { cam.stop(stop); cam.punch(0.06, 0.5); cam.flash(col, a, 0.32); } };

  // ---------------------------------------------------------------- Cleric · Dawn Breaks (gold and white, the sun)
  const SUN = '#ffe9a0', DAWN = '#fff4d0', PETAL = '#ffd0e0';   // (shared-fx colour pass: Cleric white-gold)
  // a sun climbing over the cleric: a white core, slow-turning rays, a wide halo
  function clericSunrise(x, y, o = {}) {
    const dur = o.dur ?? 1.1, H = o.h ?? 150;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const rise = 1 - Math.pow(1 - Math.min(1, p / 0.38), 3), k = e.a * Math.min(1, (1 - p) / 0.4), sy = y - 40 - H * rise, R = 22 + 18 * rise;
      // (QA: the sun washed out the whole frame at the landing) a smaller halo, softer rays
      V.glowAt(c, x, sy, R * 2.4, SUN, 0.32 * k);
      c.save(); c.translate(x, sy); c.rotate(t * 0.7); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12, L = R * (i % 2 ? 1.8 : 2.6);
        c.globalAlpha = 0.36 * k; c.fillStyle = DAWN; c.beginPath();
        c.moveTo(Math.cos(a - 0.1) * R, Math.sin(a - 0.1) * R); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + 0.1) * R, Math.sin(a + 0.1) * R); c.closePath(); c.fill();
      }
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, sy, R, '#fff6d8', k); V.glowAt(c, x, sy, R * 0.5, '#ffffff', k);
    } });
  }
  const clericPetals = (x, y, n, sp) => { for (let i = 0; i < n; i++) { const a = i * TAU / n + rand(-0.2, 0.2), s = rand(0.6, 1) * sp; V.spawn({ x, y, z: 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(80, 200), g: 150, drag: 0.04, life: rand(1.2, 1.8), size: rand(10, 14), color: i % 3 ? PETAL : DAWN, kind: 'petal', add: false, vr: rand(-6, 6), flutter: 6, fadeIn: 0.02 }); } };
  // a sun rises over the cleric, then a great pillar of dawn falls on the party: a five-point star on the floor for the
  // 12s of regen, petals thrown wide. The smite on the boss is KIT_VFX['cleric-dawn'].
  ABILITY_VFX.cleric.dawnbreaks = c => {
    const at = { x: c.x, y: c.y };
    if (c.cam) c.cam.dim(0.3, 1.4);
    V.charge(c.x, c.y, { color: DAWN, r: 80, n: 14, dur: LAND, follow: c.ent });
    clericSunrise(c.x, c.y, { dur: 1.2 });
    V.glint(c.x, c.y - 50, { color: '#ffffff', size: 34, z: 40 });
    c.later(LAND, () => {
      impact(c.cam, '#fff2c8', 0.24);
      shake(6);
      // (QA: the pillar whited out the party for a second and the two circles held full strength over telegraphs for
      // 12s) a slimmer pillar, no extra flash, and the star and petal circles settle faint after the landing
      V.lightfall(at.x, at.y, { color: DAWN, r: 50, h: 420, dur: 1.1, feathers: 10 });
      V.pillar(at.x, at.y, { r: 34, h: 380, color: SUN, dur: 0.8 });
      for (let i = 0; i < 3; i++) V.shock(at.x, at.y, { r: 170 + i * 50, color: i ? DAWN : '#ffffff', dur: 0.6 + i * 0.1, w: 8 - i * 2, delay: i * 0.08 });
      vfxLingerSettle(V.ink(at.x, at.y, { r: 170, dur: 12, a: 0.22 }), 0.5, 1.2);
      vfxLingerSettle(V.sigil(at.x, at.y, { r: 170, style: 'star5', color: SUN, dur: 12, spin: 0.2 }), 0.26, 1.4);
      vfxLingerSettle(V.sigil(at.x, at.y, { r: 110, style: 'petals', color: DAWN, dur: 12, spin: -0.35 }), 0.2, 1.4);
      V.burst(at.x, at.y - 40, { color: DAWN, color2: '#ffffff', n: 26, speed: 320, kind: 'star', flash: false });
      clericPetals(at.x, at.y, 16, 260);
    });
  };
  // the dawn smites the boss: a broad beam from the sky, a gold starburst, a seal; a Dawnstar that rose with it (d.s)
  // lands as a second, whiter star. The Petals growing back glint round the cleric.
  KIT_VFX['cleric-dawn'] = Object.assign((e, target, d) => {
    const t = target || e, star = d && d.s;
    V.beam(t.x, t.y - 360, t.x, t.y, { color: SUN, w: star ? 18 : 13, dur: 0.5 });
    // (QA) the starburst round the boss's feet, not over it; the seal settles
    V.spikeburst(t.x, t.y, { r: star ? 130 : 110, n: 18, color: SUN, core: '#fffbe0', ink: '#4a3408', dur: 0.45, layer: 'ground', z: 0, flat: 0.6 });
    V.shock(t.x, t.y, { r: 180, color: DAWN, dur: 0.55, w: 8 });
    vfxLingerSettle(V.sigil(t.x, t.y, { r: 90, style: 'star4', color: SUN, dur: 2.4, spin: 1.4 }), 0.3, 0.7);
    V.decal(t.x, t.y, { style: 'crack', r: 56, dur: 3, a: 0.5, seed: Math.random() * 6 });
    if (star) V.burst(t.x, t.y - 30, { color: '#ffffff', color2: DAWN, n: 22, speed: 300, kind: 'star', flashR: 50 });
    shake(star ? 6 : 4);
    for (let i = 0; i < 3; i++) V.spawn({ x: e.x, y: e.y, z: 26, life: 1.1, size: 13, color: i % 2 ? PETAL : DAWN, kind: 'petal', add: false, vr: 4, flutter: 4, orbit: { x: e.x, y: e.y, a: i * TAU / 3, r: 34, w: 3, dr: -10, flat: 0.55, follow: e } });
  }, { atTarget: true });

  // ---------------------------------------------------------------- Grovekeeper (greens, bark, golden fruit, a teal moon pool)
  // After the painted sheet (docs/art/vfx-reference/grovekeeper.png), each move in three beats (wind-up, impact,
  // aftermath). World Tree: leaves spiral in and roots crack the floor; the tree rises and sways, golden fruit hanging
  // from its crown and light pouring through it (thinning after 1.6s so the floor stays readable); a faint canopy grove
  // with a teal pool among the roots stays for the 12s. Its moves (Rejuvenate, Bloom, Wild Growth, Moonwell, Wrath) are
  // in this block too, below the Ultimate. Everything left on the floor draws over the telegraphs: it stays faint.
  const LEAF = '#8fff7a', MOSS = '#2f6a22', BARK = '#3a2a18';
  const GROVE_GOLD = '#ffd66a', GROVE_TEAL = '#5ff0d0', GROVE_SHADE = '#06140a', GROVE_CREAM = '#fff6c8';
  // leaves (and a few gold motes) spiralling in to a point, with three swept streaks turning with them: a wind-up
  function groveLeafSpiral(x, y, o = {}) {
    const R = o.r ?? 150, dur = o.dur ?? 0.5, n = Math.min(o.n ?? 16, 20), follow = o.follow;
    for (let i = 0; i < n; i++) {
      const r0 = R * rand(0.75, 1.05), star = i % 5 === 4;
      V.spawn({ x, y, z: rand(6, 40), life: dur + 0.05, size: star ? 9 : rand(10, 14), color: star ? GROVE_GOLD : i % 3 ? LEAF : '#c8ff8a', kind: star ? 'star' : 'leaf', add: star ? undefined : false, vr: rand(4, 8), fadeIn: 0.15,
        orbit: { x, y, a: i * TAU / n + rand(-0.2, 0.2), r: r0, w: rand(3.5, 5), dr: -r0 * 0.9 / dur, flat: 0.55, follow } });
    }
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, p / 0.2, (1 - p) / 0.25);
      for (let j = 0; j < 3; j++) {
        const a0 = j * TAU / 3 + t * 5;
        V.neonPath(c, j === 1 ? GROVE_TEAL : LEAF, 2.4, k * 0.7, () => { for (let s = 0; s <= 16; s++) { const q = s / 16, a = a0 + q * 2.6, rr = R * (1 - p * 0.75) * (1 - q * 0.75), px = cx + Math.cos(a) * rr, py = cy - 20 + Math.sin(a) * rr * 0.55; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      }
    } });
  }
  // roots tearing outward through the floor: dark bark ridges with gold light in them. They grow in `grow` seconds, glow
  // for `glow` more, then lie at strength o.a (faint) for the rest of `dur`
  function groveRoots(x, y, o = {}) {
    const R = o.r ?? 120, n = Math.min(o.n ?? 7, 10), dur = o.dur ?? 3, grow = o.grow ?? 0.35, glowFor = o.glow ?? 0.9, rest = o.a ?? 0.3, flat = 0.6;
    const roots = Array.from({ length: n }, (_, i) => {
      const a0 = i * TAU / n + rand(-0.25, 0.25), L = R * rand(0.6, 1), pts = [[0, 0]];
      let a = a0, px = 0, py = 0;
      for (let s = 1; s <= 5; s++) { a += rand(-0.35, 0.35); px += Math.cos(a) * L / 5; py += Math.sin(a) * L / 5; pts.push([px, py]); }
      const b = pts[2 + (Math.random() * 2 | 0)], ba = a0 + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 0.9);
      return { pts, br: [b, [b[0] + Math.cos(ba) * L * 0.25, b[1] + Math.sin(ba) * L * 0.25]], w: rand(3.5, 6) };
    });
    const trace = (c, pts, f) => { const m = Math.max(1, Math.ceil((pts.length - 1) * f)); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= m && i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); };
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, g = Math.min(1, T / grow), hot = Math.max(0, 1 - Math.max(0, T - grow) / glowFor), k = e.a * Math.min(1, (dur - T) / 0.6) * (rest + (1 - rest) * hot);
      if (k <= 0.01) return;
      c.save(); c.translate(x, y); c.scale(1, flat); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const r of roots) {
        c.globalAlpha = k; c.strokeStyle = '#140c06'; c.lineWidth = r.w + 3; trace(c, r.pts, g); c.stroke();
        c.strokeStyle = '#5a3c20'; c.lineWidth = r.w; trace(c, r.pts, g); c.stroke();
        if (g >= 1) { c.strokeStyle = '#140c06'; c.lineWidth = r.w * 0.7 + 2; trace(c, r.br, 1); c.stroke(); c.strokeStyle = '#5a3c20'; c.lineWidth = r.w * 0.7; trace(c, r.br, 1); c.stroke(); }
      }
      if (hot > 0) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = GROVE_GOLD; c.lineWidth = 1.6; for (const r of roots) { c.globalAlpha = k * hot * 0.9; trace(c, r.pts, g); c.stroke(); } }
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // a little five-petal flower lying on the floor (s: petal size)
  function groveFlower(c, x, y, s, rot, a, col = GROVE_GOLD) {
    if (a <= 0.01) return;
    c.save(); c.translate(x, y); c.scale(1, 0.6); c.rotate(rot); c.globalAlpha = Math.min(1, a); c.fillStyle = col;
    for (let i = 0; i < 5; i++) { const pa = i * TAU / 5; c.beginPath(); c.ellipse(Math.cos(pa) * s, Math.sin(pa) * s, s * 0.9, s * 0.5, pa, 0, TAU); c.fill(); }
    c.restore(); c.globalAlpha = 1;
    V.glowAt(c, x, y, s * 1.6, GROVE_CREAM, a * 0.8);
  }
  // thorned roots bursting up out of the floor: curved bark spikes lit gold along one edge, a barb on each, hot tips
  function groveThorns(x, y, o = {}) {
    const n = Math.min(o.n ?? 6, 12), r = o.r ?? 40, h = o.h ?? 50, dur = o.dur ?? 0.8;
    const sp = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.3, 0.3), d = rand(0.25, 1) * r;
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, h: h * rand(0.6, 1.15), w: rand(4, 8), lean: Math.cos(a) * rand(0.3, 0.6) + rand(-0.15, 0.15), at: rand(0, 0.08) }; }).sort((a, b) => a.y - b.y);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.35);
      V.glowAt(c, x, y - 10, r * 1.2, GROVE_GOLD, 0.3 * k * (1 - p));
      c.lineJoin = 'round';
      for (const s of sp) {
        const g = easeOut(Math.min(1, Math.max(0, t - s.at) / 0.14)); if (g <= 0) continue;
        const hh = s.h * g, tx = s.x + s.lean * hh, ty = s.y - hh, mx = s.x + s.lean * hh * 0.2, my = s.y - hh * 0.55;
        c.globalAlpha = k; c.fillStyle = '#5a3c1c'; c.strokeStyle = '#140c06'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(s.x - s.w, s.y); c.quadraticCurveTo(mx - s.w * 0.6, my, tx, ty); c.quadraticCurveTo(mx + s.w * 0.6, my, s.x + s.w, s.y); c.closePath(); c.fill(); c.stroke();
        const bx = s.x + (tx - s.x) * 0.45, by = s.y + (ty - s.y) * 0.45, sd = s.lean > 0 ? -1 : 1;
        c.fillStyle = '#4a6a22'; c.beginPath(); c.moveTo(bx, by - 3); c.lineTo(bx + sd * s.w * 1.3, by - 9); c.lineTo(bx, by + 3); c.closePath(); c.fill();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.75; c.strokeStyle = GROVE_GOLD; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(s.x - s.w * 0.4, s.y - 2); c.quadraticCurveTo(mx - s.w * 0.3, my, tx, ty); c.stroke(); c.globalCompositeOperation = 'source-over';
        V.glowAt(c, tx, ty, 8, '#fff2b0', k * 0.8);
      }
      c.globalAlpha = 1;
    } });
  }
  // GROVE_ULT_SCALE sizes the World Tree (trunk, crown, roots, wind-up and burst). The heal's 180 canopy ring is fixed.
  const GROVE_ULT_SCALE = 1.8;
  // the World Tree, painted once into a sprite (the same tree every cast, so a frame only blits it): roots clawing out
  // from a thick gnarled trunk with bark ridges and a knot, branches up into a crown of many overlapping leaf clusters,
  // each with an ink edge, a dark underside, a mid green and a lit top, a shadow under the crown and warm light on it.
  let groveTreeArt = null;
  function groveTreeSprite(H, R) {
    if (groveTreeArt && groveTreeArt.H === H && groveTreeArt.R === R) return groveTreeArt;
    const W = Math.ceil(R * 2.6 + 40), SH = Math.ceil(H + R * 0.95 + 40), fx = W / 2, fy = SH - 30, cy = fy - H, ry = R * 0.7;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = SH;
    const c = cv.getContext('2d'); c.lineJoin = 'round'; c.lineCap = 'round';
    const tw = R * 0.21, quad = (a, b, d, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * b + q * q * d;
    // a tapering limb along a quadratic curve: ink, bark, a lit line on its upper edge
    const limb = (x0, y0, x1, y1, x2, y2, w0, w1) => {
      for (const [col, add, off] of [['#0e0804', 3, 0], ['#4a3220', 0, 0], ['#8a6a3e', -w0 * 0.65, -1]]) {
        c.strokeStyle = col;
        for (let s = 0; s < 7; s++) { const q0 = s / 7, q1 = (s + 1) / 7, lw = w0 + (w1 - w0) * q0 + add; if (lw <= 0.5) continue; c.lineWidth = lw;
          c.beginPath(); c.moveTo(quad(x0, x1, x2, q0), quad(y0, y1, y2, q0) + off); c.lineTo(quad(x0, x1, x2, q1), quad(y0, y1, y2, q1) + off); c.stroke(); }
      }
    };
    // roots clawing out across the floor, a smaller one off each
    for (const s of [-1, -0.7, -0.35, 0.3, 0.68, 1]) {
      const L = R * rand(0.8, 1.15), ex = fx + s * L, ey = fy + rand(-4, 14) + (1 - Math.abs(s)) * 16;
      limb(fx + s * tw * 0.7, fy - tw, fx + s * L * 0.45, fy - 4, ex, ey, tw * 0.9, 2);
      const q = 0.55, bx = quad(fx + s * tw * 0.7, fx + s * L * 0.45, ex, q), by = quad(fy - tw, fy - 4, ey, q);
      limb(bx, by, bx + s * L * 0.15, by + 10, bx + s * L * rand(0.2, 0.35), by + rand(12, 22), tw * 0.35, 1);
    }
    // the trunk: gnarled edges narrowing up, shaded dark on its right, bark ridges and a knot
    const top = fy - H * 0.8, edge = (side, q) => fx + side * tw * (1.25 - 0.6 * q) + Math.sin(q * 7 + side) * tw * 0.12 + (q > 0.85 ? side * (q - 0.85) * tw * 4 : 0);
    c.beginPath(); for (let i = 0; i <= 12; i++) { const q = i / 12; c.lineTo(edge(-1, q), fy - (fy - top) * q); } for (let i = 12; i >= 0; i--) { const q = i / 12; c.lineTo(edge(1, q), fy - (fy - top) * q); } c.closePath();
    const bark = c.createLinearGradient(fx - tw * 1.3, 0, fx + tw * 1.3, 0); bark.addColorStop(0, '#7a5a34'); bark.addColorStop(0.35, '#4a3220'); bark.addColorStop(1, '#1a1008');
    c.fillStyle = bark; c.fill(); c.strokeStyle = '#0e0804'; c.lineWidth = 3; c.stroke();
    c.save(); c.clip();
    for (let j = 0; j < 7; j++) { const f = -0.85 + j * 0.28, ph = rand(0, 6);
      c.strokeStyle = '#1a1008'; c.lineWidth = 1.8; c.beginPath(); for (let i = 0; i <= 12; i++) { const q = i / 12, ex = edge(-1, q) + (edge(1, q) - edge(-1, q)) * (f + 1) / 2; c.lineTo(ex + Math.sin(q * 9 + ph) * 3, fy - (fy - top) * q); } c.stroke();
      c.strokeStyle = 'rgba(160,124,74,0.5)'; c.lineWidth = 1; c.stroke(); }
    c.fillStyle = '#140c06'; c.beginPath(); c.ellipse(fx - tw * 0.2, fy - H * 0.42, tw * 0.28, tw * 0.4, 0.2, 0, TAU); c.fill(); c.strokeStyle = '#7a5a34'; c.lineWidth = 1.4; c.stroke();
    c.restore();
    // branches up into the crown
    for (const [dx, dy] of [[-0.75, 0.05], [-0.4, -0.35], [0.05, -0.55], [0.45, -0.3], [0.8, 0.08]]) limb(fx + dx * tw, top + tw, fx + dx * R * 0.35, cy + R * 0.2, fx + dx * R * 0.8, cy + dy * ry, tw * 0.75, 3);
    // the crown: loose leaves peeking out at its edge, then clusters back to front
    const greens = ['#0f280c', '#173a12', '#21521a', '#2c6a20', '#3a8428', '#4f9e32', '#6cba40', '#94d85a'];
    for (let i = 0; i < 46; i++) { const a = rand(0, TAU), lx = fx + Math.cos(a) * R * 1.04, ly = cy + Math.sin(a) * ry * 1.06;
      c.save(); c.translate(lx, ly); c.rotate(a + rand(-0.6, 0.6)); c.fillStyle = '#081406'; c.beginPath(); c.ellipse(0, 0, 9, 4.5, 0, 0, TAU); c.fill(); c.fillStyle = greens[2 + (Math.random() * 4 | 0)]; c.beginPath(); c.ellipse(0, 0, 7.5, 3.2, 0, 0, TAU); c.fill(); c.restore(); }
    const cl = [];
    for (let i = 0; i < 48; i++) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * 0.82; cl.push({ x: fx + Math.cos(a) * d * R, y: cy + Math.sin(a) * d * ry, s: R * rand(0.2, 0.3) * (1.1 - d * 0.25) }); }
    for (let i = 0; i < 10; i++) { const a = Math.PI * (0.1 + i * 0.09); cl.push({ x: fx + Math.cos(a) * R * 0.86, y: cy + Math.sin(a) * ry * 0.82, s: R * rand(0.18, 0.24) }); }   // (a full lower rim)
    cl.sort((a, b) => a.y - b.y);
    const blob = (x, y, s, grow) => { c.beginPath(); c.arc(x, y, s * 0.6 + grow, 0, TAU); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + s; c.moveTo(x + Math.cos(a) * s * 0.55 + s * 0.48 + grow, y + Math.sin(a) * s * 0.55); c.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.48 + grow, 0, TAU); } c.fill(); };
    for (const b of cl) {
      const tone = 0.55 - (b.y - cy) / ry * 0.38 - (b.x - fx) / R * 0.16 + rand(-0.12, 0.12), gi = Math.max(1, Math.min(5, Math.round(tone * 7)));
      c.fillStyle = '#061004'; blob(b.x, b.y, b.s, 2.5);
      c.fillStyle = greens[gi - 1]; blob(b.x, b.y, b.s, 0);
      c.fillStyle = greens[gi]; blob(b.x - b.s * 0.1, b.y - b.s * 0.14, b.s * 0.82, 0);
      c.fillStyle = greens[gi + 2]; blob(b.x - b.s * 0.24, b.y - b.s * 0.3, b.s * 0.42, 0);
      c.fillStyle = 'rgba(200,250,140,0.55)';
      for (let j = 0; j < 3; j++) { c.save(); c.translate(b.x - b.s * rand(0.1, 0.5), b.y - b.s * rand(0.25, 0.6)); c.rotate(rand(-1, 1)); c.beginPath(); c.ellipse(0, 0, b.s * 0.16, b.s * 0.07, 0, 0, TAU); c.fill(); c.restore(); }
    }
    // a shadow under the crown, and warm light falling on its top
    c.globalCompositeOperation = 'source-atop';
    const sh = c.createLinearGradient(0, cy, 0, cy + ry * 1.15); sh.addColorStop(0, 'rgba(2,10,2,0)'); sh.addColorStop(1, 'rgba(2,10,2,0.55)'); c.fillStyle = sh; c.fillRect(0, cy, W, ry * 1.15);
    const lit = c.createRadialGradient(fx - R * 0.35, cy - ry * 0.7, 0, fx - R * 0.35, cy - ry * 0.7, R * 1.1); lit.addColorStop(0, 'rgba(255,236,150,0.32)'); lit.addColorStop(1, 'rgba(255,236,150,0)'); c.fillStyle = lit; c.fillRect(0, 0, W, fy);
    c.globalCompositeOperation = 'source-over';
    return (groveTreeArt = { cv, H, R, fx, fy });
  }
  // the World Tree standing over the druid: it shoots up out of its roots in half a second (a little overshoot) and
  // sways, golden lanterns hanging from its crown on threads, light pouring down through it; it fades out entirely by
  // `dur` (from `fade`) so nothing leafy hangs over the party or the boss for the heal's 12s.
  function groveWorldTree(x, y, o = {}) {
    const dur = o.dur ?? 2.7, fade = o.fade ?? 1.9, H = o.h ?? 150, R = o.r ?? 78, art = groveTreeSprite(H, R);
    const fruit = Array.from({ length: 11 }, (_, i) => { const u = -0.84 + i * 0.168 + rand(-0.05, 0.05); return { x: u * R, y: R * 0.7 * rand(0.35, 0.9) * (1 - Math.abs(u) * 0.35), len: rand(12, 34), ph: rand(0, 6) }; });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const T = p * dur, q = Math.min(1, T / 0.5), g = (1 - Math.pow(1 - q, 3)) * (1 + 0.08 * Math.sin(q * Math.PI)), gx = 0.55 + 0.45 * g;
      const k = e.a * Math.min(1, T / 0.06) * Math.max(0, Math.min(1, (dur - T) / (dur - fade)));
      if (k <= 0.01) return;
      const sway = Math.sin(t * 1.3) * R * 0.04 * g;
      V.glowAt(c, x, y - 10, R * 1.1, GROVE_GOLD, k * 0.3 * Math.max(0.3, 1 - T / 1.5));
      c.save(); c.globalAlpha = k; c.translate(x, y); c.transform(gx, 0, -sway / H, g, 0, 0); c.drawImage(art.cv, -art.fx, -art.fy); c.restore();
      // golden light pouring down through the crown, the first moments
      const shaft = e.a * Math.min(1, T / 0.25) * Math.max(0, 1 - T / 1.7);
      if (shaft > 0.01) {
        const top = y - (H - R * 0.25) * g;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = -2; i <= 2; i++) { const sx = x + sway + i * R * 0.3, w = R * (0.1 + 0.04 * Math.abs(i)), gr = c.createLinearGradient(0, top, 0, y + 10);
          gr.addColorStop(0, rgba(GROVE_GOLD, 0)); gr.addColorStop(0.3, rgba(GROVE_GOLD, 0.24 * shaft)); gr.addColorStop(1, rgba(GROVE_GOLD, 0));
          c.fillStyle = gr; c.beginPath(); c.moveTo(sx - w * 0.5, top); c.lineTo(sx + w * 0.5, top); c.lineTo(sx + w * 1.2 + i * 6, y + 10); c.lineTo(sx - w * 1.2 + i * 6, y + 10); c.closePath(); c.fill(); }
        c.restore();
      }
      // golden lanterns on threads under the crown
      const fk = k * Math.min(1, Math.max(0, T - 0.3) / 0.25); if (fk <= 0.01) return;
      c.strokeStyle = '#d8b060'; c.lineWidth = 1; c.globalAlpha = fk * 0.8;
      const ls = fruit.map(f => { const bx = x + f.x * gx + sway, by = y + (-H + f.y) * g, lx = bx + Math.sin(t * 1.6 + f.ph) * 2, ly = by + f.len * g; c.beginPath(); c.moveTo(bx, by); c.lineTo(lx, ly); c.stroke(); return [lx, ly, 0.7 + 0.3 * Math.sin(t * 2.4 + f.ph)]; });
      c.globalAlpha = 1;
      for (const [lx, ly, pulse] of ls) { V.glowAt(c, lx, ly + 3, 18, GROVE_GOLD, fk * 0.7 * pulse); c.globalAlpha = fk; c.fillStyle = '#ffcf4a'; c.beginPath(); c.ellipse(lx, ly + 3, 3.4, 4.4, 0, 0, TAU); c.fill(); c.globalAlpha = 1; V.glowAt(c, lx, ly + 3, 5, GROVE_CREAM, fk * pulse); }
    }, tick: p => {
      const T = p * dur; if (T < 0.45 || T > fade + 0.3) return;
      if (Math.random() < 0.3) V.spawn({ x: x + rand(-R, R), y: y + rand(-R * 0.3, R * 0.2), z: H * rand(0.55, 1.05), vz: rand(-55, -25), vx: rand(-25, 25), life: rand(1.4, 2.2), size: rand(9, 13), color: Math.random() < 0.7 ? (Math.random() < 0.5 ? LEAF : '#5fb03a') : '#ffe0a0', kind: 'leaf', add: false, vr: rand(-3, 3), flutter: 5, fadeIn: 0.1 });
      if (Math.random() < 0.2) V.spawn({ x: x + rand(-R, R) * 0.8, y: y + rand(-10, 10), z: H * rand(0.4, 0.9), vz: rand(-20, 10), life: rand(0.8, 1.4), size: rand(5, 8), size1: 0, color: Math.random() < 0.6 ? GROVE_GOLD : GROVE_CREAM, kind: 'star' });
    } });
  }
  // the grove the tree leaves: the ring of its reach (r: the heal's 180) with a dashed inner leaf ring and flowers on
  // it, and a teal pool among the roots at its foot (rim-led, its middle barely tinted), ripples running out across it.
  // No fill over the party: everything here is a rim or a glow, so the telegraphs under it read.
  function groveCanopy(x, y, o = {}) {
    const R = o.r ?? 180, dur = o.dur ?? 12, pool = o.pool ?? R * 0.42, flat = 0.55;
    const flowers = Array.from({ length: 12 }, (_, i) => ({ a: i * TAU / 12 + rand(-0.15, 0.15), d: rand(0.86, 0.98), s: rand(3, 4.5) }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, g = easeOut(Math.min(1, T / 0.5)), k = e.a * Math.min(1, T / 0.3, (dur - T) / 0.8);
      V.neonRing(c, x, y, R * g, LEAF, 2, k * 0.5, flat);
      c.save(); c.translate(x, y); c.scale(1, flat); c.rotate(t * 0.08); c.setLineDash([10, 14]); V.neonPath(c, '#5fb03a', 1, k * 0.35, () => c.arc(0, 0, R * g * 0.9, 0, TAU)); c.setLineDash([]); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(x, y, 0, x, y, pool); gr.addColorStop(0, rgba(GROVE_TEAL, 0.05 * k)); gr.addColorStop(0.75, rgba(GROVE_TEAL, 0.1 * k)); gr.addColorStop(1, rgba(GROVE_TEAL, 0.2 * k));
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, pool * g, pool * g * flat, 0, 0, TAU); c.fill(); c.restore();
      for (let i = 0; i < 2; i++) { const q = (t * 0.35 + i * 0.5) % 1; V.neonRing(c, x, y, pool * (0.3 + 0.7 * q), GROVE_TEAL, 1.2, k * 0.35 * (1 - q), flat); }
      V.neonRing(c, x, y, pool * g, GROVE_TEAL, 2, k * 0.55, flat);
      for (const f of flowers) groveFlower(c, x + Math.cos(f.a) * R * f.d * g, y + Math.sin(f.a) * R * f.d * flat * g, f.s, f.a + t * 0.3, k * 0.65);
    }, tick: () => { if (Math.random() < 0.1) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * pool; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * flat, z: 2, vz: rand(15, 35), life: rand(1, 1.6), size: rand(5, 8), size1: 0, color: Math.random() < 0.6 ? GROVE_TEAL : GROVE_GOLD }); } } });
  }
  // leaves spiral in and roots tear through the floor at the druid's feet; the World Tree shoots up out of them, stands
  // for about two seconds and fades away, leaving only the canopy ring, the teal pool and the roots (rims, low) for the
  // 12s of healing, gold and teal motes rising off them. Its thorns on the boss: KIT_VFX['grove-tree'].
  ABILITY_VFX.grovekeeper.worldtree = c => {
    const at = { x: c.x, y: c.y }, S = GROVE_ULT_SCALE;
    if (c.cam) c.cam.dim(0.28, 1.3);
    groveLeafSpiral(at.x, at.y, { r: 110 * S, dur: LAND + 0.05, n: 20 });
    groveRoots(at.x, at.y, { r: 130 * S, n: 10, dur: 12 + LAND, grow: LAND + 0.25, glow: 1.4, a: 0.28 });
    V.fx({ dur: LAND, layer: 'ground', draw: (cx, p, t, e) => { V.glowAt(cx, at.x, at.y, 30 + 60 * S * p, GROVE_GOLD, e.a * 0.5 * p); V.neonRing(cx, at.x, at.y, 90 * S * (1 - 0.7 * p), LEAF, 2, e.a * p, 0.55); } });
    c.later(LAND, () => {
      impact(c.cam, '#e8ffc0', 0.18);
      shake(7);
      groveWorldTree(at.x, at.y, { h: 112 * S, r: 78 * S, dur: 2.3, fade: 1.55 });
      groveCanopy(at.x, at.y, { r: 180, dur: 12, pool: 42 * S });
      V.shock(at.x, at.y, { r: 120 * S, color: '#fff2b0', dur: 0.55, w: 7 });
      V.shock(at.x, at.y, { r: 150 * S, color: LEAF, dur: 0.75, w: 5, delay: 0.08 });
      V.debris(at.x, at.y, { n: 10, color: '#5a4a32' });
      V.burst(at.x, at.y - 90 * S, { color: GROVE_GOLD, color2: GROVE_CREAM, n: 16, speed: 260, kind: 'star', flashR: 70 * S });
      for (let i = 0; i < 14; i++) { const a = i * TAU / 14, s = rand(160, 300); V.spawn({ x: at.x, y: at.y, z: 60 * S, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(40, 140), g: 140, drag: 0.04, life: rand(1.1, 1.6), size: rand(11, 15), color: i % 3 ? (i % 2 ? LEAF : '#5fb03a') : GROVE_GOLD, kind: 'leaf', add: false, vr: rand(-6, 6), flutter: 5 }); }
    });
  };
  // thorned roots burst out of the floor under the boss with a spray of earth; with Thornlash on it (d.s) more and taller
  KIT_VFX['grove-tree'] = Object.assign((e, target, d) => {
    const t = target || e, thorn = d && d.s;
    groveThorns(t.x, t.y, { n: thorn ? 10 : 7, r: 66, h: thorn ? 76 : 58, dur: 1.1 });
    groveRoots(t.x, t.y, { r: 90, n: 6, dur: 2.6, grow: 0.18, glow: 0.6, a: 0.25 });
    // (QA) a ring of thorn-spikes on the floor (hole), not a solid green-white blob that buried the boss sprite
    if (thorn) V.spikeburst(t.x, t.y, { r: 84, n: 16, hole: 0.55, color: '#8adf4a', core: '#d8f0a0', ink: '#0e2208', dur: 0.36, z: 0, layer: 'ground', flat: 0.62 });
    V.debris(t.x, t.y, { n: 6, color: '#5a4a32' });
    V.shock(t.x, t.y, { r: 140, color: GROVE_GOLD, dur: 0.5, w: 5 });
    V.motes(t.x, t.y, { kind: 'leaf', color: '#6fbf4a', n: 6, r: 50, rise: 0.6 });
    shake(4);
  }, { atTarget: true });

  // ---- Grovekeeper's moves (the sheet's rows under the Ultimate)
  // a stream of leaves blown along a curve from the druid to the ally, its head a soft green light
  function groveLeafStream(sx, sy, w, o = {}) {
    const dur = o.dur ?? 0.32, side = Math.random() < 0.5 ? -1 : 1;
    const at = q => { const tx = w.x, ty = w.y, L = Math.hypot(tx - sx, ty - sy), nx = -(ty - sy) / (L || 1), ny = (tx - sx) / (L || 1), b = Math.sin(q * Math.PI) * Math.min(80, L * 0.3) * side;
      return { x: sx + (tx - sx) * q + nx * b, y: sy + (ty - sy) * q + ny * b - 24 }; };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.2 + 0.3), q0 = Math.max(0, p - 0.4);
      V.neonPath(c, LEAF, 3.2, k * 0.7, () => { for (let s = 0; s <= 10; s++) { const P = at(q0 + (p - q0) * s / 10); s ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); } });
      V.neonPath(c, GROVE_GOLD, 1.4, k * 0.6, () => { for (let s = 0; s <= 10; s++) { const P = at(q0 + (p - q0) * s / 10), wv = Math.sin(s * 1.3 + t * 20) * 7; s ? c.lineTo(P.x, P.y + wv) : c.moveTo(P.x, P.y + wv); } });
      const h = at(p); V.glowAt(c, h.x, h.y, 30, LEAF, k * 0.8); V.glowAt(c, h.x, h.y, 9, GROVE_CREAM, k);
    }, tick: p => { if (Math.random() < 0.6) { const h = at(p); V.spawn({ x: h.x, y: h.y + 24, z: 24, vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(-10, 30), life: rand(0.4, 0.6), size: rand(9, 12), color: Math.random() < 0.3 ? GROVE_GOLD : LEAF, kind: 'leaf', add: false, vr: rand(-8, 8), flutter: 6 }); } } });
  }
  // a ring of small flowers and a vine circle opening round the ally's feet (follows them)
  function groveFlowerRing(x, y, o = {}) {
    const r = o.r ?? 34, dur = o.dur ?? 1.6, n = o.n ?? 6, follow = o.follow, col = o.color || GROVE_GOLD;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, p / 0.1, (1 - p) / 0.35), g = easeOut(Math.min(1, p / 0.2));
      V.neonRing(c, cx, cy, r * g, LEAF, 1.6, k * 0.7, 0.55);
      for (let i = 0; i < n; i++) { const a = i * TAU / n + t * 0.5; groveFlower(c, cx + Math.cos(a) * r * g, cy + Math.sin(a) * r * g * 0.55, 3.2 * g + 0.5, a, k, col); }
    } });
  }
  // thin shafts of light rising round a point: the heal landing
  function groveRays(x, y, o = {}) {
    const n = o.n ?? 6, r = o.r ?? 26, h = o.h ?? 70, col = o.color || LEAF, dur = o.dur ?? 0.55;
    const rays = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.3, 0.3), h: h * rand(0.6, 1), d: rand(0.4, 1) }));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12, (1 - p) / 0.5), g = easeOut(Math.min(1, p / 0.3));
      V.glowAt(c, x, y - 16, 30, col, 0.5 * k);
      for (const ry of rays) { const rx = x + Math.cos(ry.a) * r * ry.d, rb = y + Math.sin(ry.a) * r * ry.d * 0.55; V.neonPath(c, col, 2, k * 0.8, () => { c.moveTo(rx, rb); c.lineTo(rx, rb - ry.h * g); }); }
    } });
  }
  // a small golden cross glyph rising over the ally's head, two sparkles beside it
  function groveCross(w, o = {}) {
    const dur = o.dur ?? 1.1;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15, (1 - p) / 0.4), x = w.x, y = w.y - 84 - 16 * p;
      V.glowAt(c, x, y, 26, GROVE_GOLD, 0.55 * k);
      V.neonPath(c, GROVE_GOLD, 2.8, k, () => { c.moveTo(x, y - 12); c.lineTo(x, y + 12); c.moveTo(x - 8, y - 4); c.lineTo(x + 8, y - 4); });
      for (const s of [-1, 1]) { const sx = x + s * 19, sy = y + 5 - s * 8, tw = k * (0.6 + 0.4 * Math.sin(t * 9 + s)); V.glowAt(c, sx, sy, 6, GROVE_CREAM, tw); V.neonPath(c, GROVE_CREAM, 1.2, tw * 0.8, () => { c.moveTo(sx - 4, sy); c.lineTo(sx + 4, sy); c.moveTo(sx, sy - 4); c.lineTo(sx, sy + 4); }); }
    } });
  }
  // a ring of light climbing an ally from the feet to over the head: the heal going in
  function groveRiseRing(w, o = {}) {
    const dur = o.dur ?? 0.45, R = o.r ?? 22, H = o.h ?? 70, col = o.color || LEAF;
    V.fx({ dur, layer: 'air', delay: o.delay, draw: (c, p, t, e) => {
      const q = easeOut(p), k = e.a * (1 - p), y = w.y - H * q, rx = R * (1 - 0.25 * q), ry = rx * 0.42;
      V.neonPath(c, col, 3.2 * (1 - p * 0.5), k, () => c.ellipse(w.x, y, rx, ry, 0, 0, TAU)); V.neonPath(c, '#ffffff', 1, k * 0.7, () => c.ellipse(w.x, y, rx, ry, 0, 0, TAU));
    } });
  }
  // Rejuvenate: leaves spiral along to the ally, then it lands like a rescue: a flash and a bold green-gold starburst, two
  // rings of light climbing the body, a flower ring bursting open and a cross glyph. Over the 15s a leaf-green ring
  // climbs them and a plus shows at each tick of the mend
  ABILITY_VFX.grovekeeper.rejuv = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, follow = c.tent || null;
    const land = () => {
      // (online-refs pass: a HoT pressed all fight lands quiet, like WoW's Rejuvenation; the loud moment is Bloom. No
      // inked starburst, which reads as a hit, and no lightfall: the rings climb and the flowers open)
      groveFlowerRing(w.x, w.y, { r: 40, dur: 1.2, n: 6, follow });
      groveRays(w.x, w.y, { n: 5, r: 26, h: 70 });
      V.flash(w.x, w.y - 22, 44, '#d8ff9a', 0.2);
      groveRiseRing(w, { r: 24, h: 76, dur: 0.45 }); groveRiseRing(w, { r: 20, h: 76, dur: 0.45, delay: 0.14, color: GROVE_GOLD });
      groveCross(w);
      let ticks = 0;
      V.fx({ dur: 15, layer: 'air', draw: () => {}, tick: p => { if (p * 15 >= (ticks + 1) * 3 && ticks < 4) { ticks++; groveRiseRing(w, { r: 16, h: 44, dur: 0.35 }); V.plus(w.x, w.y, { color: '#9aff8a', n: 2 }); } } });
      for (let i = 0; i < 5; i++) V.spawn({ x: w.x, y: w.y, z: 6 + i * 6, vz: 18, life: 1.1, size: 11, color: i % 3 ? (i % 2 ? LEAF : '#c8ff8a') : GROVE_GOLD, kind: 'leaf', add: false, vr: 5, orbit: { x: w.x, y: w.y, a: i * 1.25, r: 30, w: 4.5, dr: 4, flat: 0.55, follow: follow || undefined } });
    };
    if (Math.hypot(w.x - c.x, w.y - c.y) < 30) land(); else { groveLeafStream(c.x, c.y, w, { dur: 0.26 }); c.later(0.26, land); }
  };
  // a golden lotus lying open on the floor: green leaves under gold petals under cream ones, a bud for its first moment
  function groveLotus(x, y, o = {}) {
    const r = o.r ?? 48, dur = o.dur ?? 1.1, flat = 0.62;
    const petal = (c, L, W) => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -W, L, 0); c.quadraticCurveTo(L * 0.5, W, 0, 0); };
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, open = easeOut(Math.min(1, Math.max(0, T - 0.12) / 0.3)), k = e.a * Math.min(1, T / 0.08, (dur - T) / 0.35);
      V.glowAt(c, x, y, r * (0.8 + open), GROVE_GOLD, 0.45 * k);
      c.save(); c.translate(x, y); c.scale(1, flat); c.globalAlpha = k; c.lineJoin = 'round';
      const layer = (n, L, W, off, fill, edge) => { for (let i = 0; i < n; i++) { c.save(); c.rotate(off + i * TAU / n); petal(c, L, W); c.fillStyle = fill; c.fill(); if (edge) { c.strokeStyle = edge; c.lineWidth = 1.4; c.stroke(); } c.restore(); } };
      layer(10, r * (0.5 + 0.6 * open), r * 0.22, 0.2, '#2f7a22', '#0e2208');
      layer(10, r * (0.4 + 0.42 * open), r * 0.12, 0.2, '#6cba40');
      layer(8, r * (0.35 + 0.5 * open), r * 0.2, 0.2 + TAU / 16, GROVE_GOLD, '#6a4a10');
      layer(8, r * (0.25 + 0.36 * open), r * 0.17, 0.2, '#ffe9a0', '#8a6a20');
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.6;
      layer(6, r * (0.2 + 0.28 * open), r * 0.14, 0.5, GROVE_CREAM);
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, y, r * 0.3, '#ffffff', k * 0.8);
    } });
  }
  // a mandala seal left on the floor where the lotus was: gold rings, eight petals, eight leaves, a flower at its heart
  function groveMandala(x, y, o = {}) {
    const r = o.r ?? 90, dur = o.dur ?? 1.6, cap = o.a ?? 0.55, flat = 0.6;
    V.fx({ dur, layer: 'ground', delay: o.delay, draw: (c, p, t, e) => {
      const k = e.a * cap * Math.min(1, p / 0.15, (1 - p) / 0.45), R = r * (0.85 + 0.15 * easeOut(Math.min(1, p / 0.3)));
      V.neonRing(c, x, y, R, GROVE_GOLD, 2, k, flat); V.neonRing(c, x, y, R * 0.86, LEAF, 1, k * 0.7, flat);
      c.save(); c.translate(x, y); c.scale(1, flat); c.rotate(t * 0.4);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8;
        V.neonPath(c, GROVE_GOLD, 1.4, k, () => c.ellipse(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, R * 0.3, R * 0.12, a, 0, TAU));
        V.neonPath(c, LEAF, 1.2, k * 0.8, () => c.ellipse(Math.cos(a + TAU / 16) * R * 0.7, Math.sin(a + TAU / 16) * R * 0.7, R * 0.12, R * 0.05, a + TAU / 16, 0, TAU)); }
      c.restore();
      groveFlower(c, x, y, R * 0.08, t, k);
    } });
  }
  // Bloom: a golden lotus bursts open at the druid's feet, petals thrown out, and a mandala seal stays behind
  ABILITY_VFX.grovekeeper.bloom = c => {
    const x = c.x, y = c.y;
    groveLotus(x, y, { r: 66, dur: 1.15 });
    V.shock(x, y, { r: 190, color: GROVE_GOLD, dur: 0.5, w: 5, delay: 0.14 });
    c.later(0.14, () => {
      V.flash(x, y - 20, 70, GROVE_GOLD, 0.2);
      V.spikeburst(x, y, { r: 84, n: 14, hole: 0.45, color: GROVE_GOLD, core: GROVE_CREAM, ink: '#3a2a08', dur: 0.36, layer: 'ground', z: 0, flat: 0.6 }); shake(3);
      groveRays(x, y, { n: 8, r: 40, h: 110, color: GROVE_GOLD, dur: 0.6 });
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16, sp = rand(140, 260); V.spawn({ x, y, z: 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(80, 200), g: 160, drag: 0.05, life: 1.3, size: 13, color: i % 3 ? GROVE_GOLD : (i % 2 ? GROVE_CREAM : LEAF), kind: i % 4 === 3 ? 'leaf' : 'petal', add: false, vr: 6, flutter: 6, fadeIn: 0.02 }); }
    });
    groveMandala(x, y, { r: 122, dur: 1.7, delay: 0.7 });
  };
  // vines surging up out of the floor round a point: each a curling green tendril with a leaf or two
  function groveVines(x, y, o = {}) {
    const n = Math.min(o.n ?? 8, 12), r = o.r ?? 120, h = o.h ?? 50, dur = o.dur ?? 1.1, s = Math.max(1, h / 50);
    const vs = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.2, 0.2); return { x: x + Math.cos(a) * r * rand(0.75, 1), y: y + Math.sin(a) * r * 0.55 * rand(0.75, 1), h: h * rand(0.7, 1.2), curl: Math.random() < 0.5 ? -1 : 1, at: rand(0, 0.15) }; }).sort((a, b) => a.y - b.y);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.35);
      // (online-refs pass, cost: every vine goes into one path per layer, ink, body, highlight, two leaf colours, so a
      // ring of eleven is five strokes and fills instead of fifty-five; the look is the same)
      const live = []; for (const v of vs) { const g = easeOut(Math.min(1, Math.max(0, t - v.at) / 0.3)); if (g > 0) live.push([v, g]); }
      if (!live.length) return;
      const vine = (v, g) => { const tx = v.x + v.curl * 10 * s * g, ty = v.y - v.h * g; c.moveTo(v.x, v.y); c.quadraticCurveTo(v.x - v.curl * 12 * s, v.y - v.h * 0.5 * g, tx, ty); c.arc(tx - v.curl * 5 * s, ty, 5 * s * g, v.curl > 0 ? 0 : Math.PI, v.curl > 0 ? -Math.PI * 1.2 : Math.PI * 2.2, v.curl > 0); };
      const leaf = (lx, ly, rx, ry, rot) => { c.moveTo(lx + Math.cos(rot) * rx, ly + Math.sin(rot) * rx); c.ellipse(lx, ly, rx, ry, rot, 0, TAU); };
      c.lineCap = 'round'; c.globalAlpha = k;
      c.strokeStyle = '#0e2208'; c.lineWidth = 5 * s; c.beginPath(); for (const [v, g] of live) vine(v, g); c.stroke();
      c.strokeStyle = '#5fbf3a'; c.lineWidth = 2.6 * s; c.beginPath(); for (const [v, g] of live) vine(v, g); c.stroke();
      c.strokeStyle = '#a8f070'; c.lineWidth = 0.9 * s; c.globalAlpha = k * 0.7; c.beginPath(); for (const [v, g] of live) vine(v, g); c.stroke(); c.globalAlpha = k;
      c.fillStyle = LEAF; c.beginPath(); for (const [v, g] of live) leaf(v.x - v.curl * 6 * s, v.y - v.h * 0.4 * g, 5 * s * g, 2.5 * s * g, v.curl * 0.6); c.fill();
      c.fillStyle = '#4f9e32'; c.beginPath(); for (const [v, g] of live) leaf(v.x - v.curl * 2 * s, v.y - v.h * 0.7 * g, 4 * s * g, 2 * s * g, -v.curl * 0.6); c.fill();
      c.globalAlpha = 1;
    } });
  }
  // Wild Growth: vines surge up in a ring round the druid, a leafy circle of the party's heal grows, leaves flung outward
  ABILITY_VFX.grovekeeper.growth = c => {
    groveVines(c.x, c.y, { r: 160, n: 11, h: 70, dur: 1.3 });
    groveRoots(c.x, c.y, { r: 150, n: 7, dur: 1.6, grow: 0.25, glow: 0.6, a: 0.25 });
    groveFlowerRing(c.x, c.y, { r: 64, dur: 1.4, n: 8 });
    // (online-refs pass: WoW's Wild Growth is spirals rising through the party, not a carpet; the 3s grove disc under
    // the whole party, the heaviest piece, is gone) two rings run out over the party and green wisps spiral up the ring
    V.shock(c.x, c.y, { r: 200, color: LEAF, dur: 0.55, w: 6 });
    V.shock(c.x, c.y, { r: 175, r0: 30, color: GROVE_GOLD, dur: 0.6, w: 3, delay: 0.12 });
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + rand(-0.2, 0.2), d = rand(110, 160); V.spawn({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.6, z: 4, vz: rand(70, 110), life: rand(0.9, 1.3), size: rand(7, 10), size1: 0, color: i % 2 ? '#c8ff8a' : GROVE_CREAM, orbit: { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.6, a: rand(0, TAU), r: 12, w: 6, dr: 0, flat: 0.55 } }); }
    for (let i = 0; i < 14; i++) V.spawn({ x: c.x, y: c.y, z: 10 + Math.random() * 24, life: 1.4, size: 14, color: i % 3 ? (i % 2 ? LEAF : '#5fb03a') : GROVE_GOLD, kind: 'leaf', add: false, vr: 6, orbit: { x: c.x, y: c.y, a: i * 0.45, r: 10, w: 3, dr: 150, flat: 0.6 } });
    V.plus(c.x, c.y, { n: 5 });
  };
  // a crescent moon hanging over a point, pale teal light falling from it onto the floor
  function groveMoon(x, y, o = {}) {
    const dur = o.dur ?? 1.3, H = o.h ?? 150, M = o.r ?? 20;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.2, (1 - p) / 0.4), my = y - H - 10 * p;
      const gr = c.createLinearGradient(0, my, 0, y); gr.addColorStop(0, rgba(GROVE_TEAL, 0.3 * k)); gr.addColorStop(0.7, rgba(GROVE_TEAL, 0.14 * k)); gr.addColorStop(1, rgba(GROVE_TEAL, 0));
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.beginPath(); c.moveTo(x - M * 1.1, my); c.lineTo(x + M * 1.1, my); c.lineTo(x + M * 2.2, y); c.lineTo(x - M * 2.2, y); c.closePath(); c.fill();
      for (const s of [-1, 1]) V.neonPath(c, '#bfffee', 1, k * 0.4, () => { c.moveTo(x + s * M * 0.6, my + M); c.lineTo(x + s * M * 1.6, y - 6); });
      c.restore();
      V.glowAt(c, x, my, M * 2.8, GROVE_TEAL, 0.55 * k); V.glowAt(c, x, y, M * 2.4, GROVE_TEAL, 0.35 * k);
      c.save(); c.translate(x, my); c.rotate(-0.6); c.globalAlpha = k; c.fillStyle = '#dffff6';
      c.beginPath(); c.arc(0, 0, M, 0.7, TAU - 0.7); c.arc(M * 0.45, 0, M * 0.8, TAU - 1.15, 1.15, true); c.closePath(); c.fill();
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // the moon pool: a teal pool ringed with stones and small flowers, ripples running across it and a crescent shining
  // in it, inside a faint ring of its reach (r)
  function groveMoonPool(x, y, o = {}) {
    const r = o.r ?? 150, dur = o.dur ?? 12, pr = r * 0.5, flat = 0.55;
    const stones = Array.from({ length: 9 }, (_, i) => ({ a: i * TAU / 9 + rand(-0.15, 0.15), s: rand(5, 8), at: 0.1 + i * 0.03, pts: [rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1)] }));
    const blooms = Array.from({ length: 6 }, (_, i) => ({ a: i * TAU / 6 + 0.35, col: i % 2 ? '#ffc0dc' : GROVE_CREAM }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, g = easeOut(Math.min(1, T / 0.5)), k = e.a * Math.min(1, T / 0.2, (dur - T) / 0.8);
      V.neonRing(c, x, y, r * g, GROVE_TEAL, 1.6, k * 0.35, flat);
      c.save(); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(x, y, 0, x, y, pr); gr.addColorStop(0, rgba(GROVE_TEAL, 0.22 * k)); gr.addColorStop(1, rgba(GROVE_TEAL, 0.06 * k));
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, pr * g, pr * g * flat, 0, 0, TAU); c.fill(); c.restore();
      for (let i = 0; i < 2; i++) { const q = (t * 0.4 + i * 0.5) % 1; V.neonRing(c, x, y, pr * (0.2 + 0.75 * q), GROVE_TEAL, 1, k * 0.35 * (1 - q), flat); }
      V.neonRing(c, x, y, pr * g, GROVE_TEAL, 1.8, k * 0.55, flat);
      // the crescent shining in the water
      c.save(); c.translate(x, y); c.scale(1, flat); c.rotate(-0.6); c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * (0.3 + 0.08 * Math.sin(t * 2)); c.fillStyle = '#bfffee';
      c.beginPath(); c.arc(0, 0, pr * 0.3, 0.7, TAU - 0.7); c.arc(pr * 0.135, 0, pr * 0.24, TAU - 1.15, 1.15, true); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1;
      // stones round the rim, flowers between them
      for (const s of stones) { if (T < s.at) continue; const sg = easeOut(Math.min(1, (T - s.at) / 0.15)), sx = x + Math.cos(s.a) * pr * 1.06, sy = y + Math.sin(s.a) * pr * 1.06 * flat, sz = s.s * sg;
        c.globalAlpha = k * 0.6; c.fillStyle = '#7a8088'; c.strokeStyle = '#1a1622'; c.lineWidth = 1.2; c.beginPath();
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.lineTo(sx + Math.cos(a) * sz * s.pts[i], sy + Math.sin(a) * sz * s.pts[i] * 0.7); }
        c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(200,255,240,0.5)'; c.fillRect(sx - sz * 0.4, sy - sz * 0.45, sz * 0.5, sz * 0.25); }
      c.globalAlpha = 1;
      for (const b of blooms) groveFlower(c, x + Math.cos(b.a) * pr * 1.2 * g, y + Math.sin(b.a) * pr * 1.2 * flat * g, 3, b.a + t * 0.2, k * 0.7, b.col);
    }, tick: () => { if (Math.random() < 0.15) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * pr; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * flat, z: 2, vz: rand(18, 40), life: rand(1, 1.6), size: rand(5, 8), size1: 0, color: Math.random() < 0.7 ? GROVE_TEAL : '#eaffff', kind: Math.random() < 0.4 ? 'star' : 'glow' }); } } });
  }
  // Moonwell: plants surge up round the ally's spot, a crescent moon pours its light down, and the moon pool stays
  // for its whole 12s
  ABILITY_VFX.grovekeeper.moonwell = c => {
    const x = c.tx, y = c.ty;
    groveVines(x, y, { r: 120, n: 10, h: 64, dur: 1.2 });
    groveMoon(x, y, { dur: 1.4, h: 180, r: 27 });
    c.later(0.25, () => {
      groveMoonPool(x, y, { r: 150, dur: 11.75 });
      V.shock(x, y, { r: 160, color: GROVE_TEAL, dur: 0.5, w: 5 });
      V.burst(x, y - 20, { color: GROVE_TEAL, color2: '#eaffff', n: 10, speed: 160, kind: 'star', flash: false });
    });
  };
  // Wrath is the filler between heals, so it takes three turns: a thorn-seed lance that bursts into brambles, a golden
  // seed lobbed in an arc that sprouts vines, and a single great spear of root. Each flies from the druid and lands with
  // a bold thorn starburst; everything it leaves is gone inside a second
  let groveWrathN = 0;
  ABILITY_VFX.grovekeeper.wrath = c => {
    const n = groveWrathN++ % 3, a = Math.atan2(c.ty - c.y, c.tx - c.x);
    V.glint(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 16, { color: '#e8ffb0', size: 22, z: 30 });
    const land = (x, y) => {
      V.flash(x, y - 16, 56, LEAF, 0.22);
      V.spikeburst(x, y, { r: n === 2 ? 58 : 46, n: 12, color: '#4f9f3f', core: '#d8ff9a', ink: '#0e2008', dur: 0.3, z: 12 });
      V.shock(x, y, { r: n === 2 ? 84 : 66, color: n === 1 ? GROVE_GOLD : '#8fdf5a', dur: 0.3, w: 4 });
      if (n === 0) groveThorns(x, y, { n: 7, r: 36, h: 54, dur: 0.6 });
      else if (n === 1) { groveVines(x, y, { r: 34, n: 6, h: 46, dur: 0.6 }); V.burst(x, y - 10, { color: GROVE_GOLD, color2: GROVE_CREAM, n: 8, speed: 200, kind: 'star', flash: false }); }
      else { groveThorns(x, y, { n: 3, r: 12, h: 92, dur: 0.6 }); V.shock(x, y, { r: 48, color: GROVE_GOLD, dur: 0.24, w: 3, delay: 0.06 }); }
      groveRoots(x, y, { r: 56, n: 5, dur: 0.9, grow: 0.1, glow: 0.3, a: 0.2 });
      V.debris(x, y, { n: 4, color: '#5a4a32', up: 0.7 });
      V.motes(x, y, { kind: 'leaf', color: LEAF, n: 3, r: 24, rise: 0.5 });
      shake(n === 2 ? 3 : 2);
    };
    V.missile(c.x, c.y, c.tx, c.ty, { style: 'leaf', color: n === 1 ? GROVE_GOLD : LEAF, speed: 1500, size: n === 2 ? 1.4 : 1.1, arc: n === 1 ? 44 : 0, onHit: land });
  };
  // a vine whip lashing out from the druid to a point: a bark-brown rope with a green core snaking along a wave, its
  // tip flaring where it cracks
  function groveWhip(sx, sy, tx, ty, o = {}) {
    const dur = o.dur ?? 0.22, L = Math.hypot(tx - sx, ty - sy) || 1, nx = -(ty - sy) / L, ny = (tx - sx) / L, side = Math.random() < 0.5 ? -1 : 1;
    const at = (q, p) => { const w = Math.sin(q * Math.PI * 2.2 + p * 9) * 18 * Math.sin(q * Math.PI) * (1 - p * 0.7) * side; return { x: sx + (tx - sx) * q + nx * w, y: sy + (ty - sy) * q + ny * w }; };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const head = easeOut(Math.min(1, p / 0.6)), k = e.a * Math.min(1, (1 - p) / 0.35), tail = Math.max(0, (p - 0.45) / 0.55) * 0.9;
      const path = () => { for (let s = 0; s <= 14; s++) { const q = tail + (head - tail) * s / 14, P = at(q, p); s ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); } };
      V.neonPath(c, '#2a1a0a', 6, k * 0.9, path); V.neonPath(c, '#6fbf3a', 3.4, k, path); V.neonPath(c, '#d8ff9a', 1.2, k * 0.8, path);
      const h = at(head, p); V.glowAt(c, h.x, h.y, 22, LEAF, k * 0.8); V.glowAt(c, h.x, h.y, 7, '#ffffff', k);
    } });
  }
  // a ring of bark thorns snapping shut round the target: the teeth slide in from wide and close with a crack, tips lit
  // gold, then sink away
  function groveClamp(x, y, o = {}) {
    const R = o.r ?? 42, dur = o.dur ?? 0.55, n = o.n ?? 8, flat = 0.6;
    const teeth = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.12, 0.12), h: rand(22, 32), w: rand(5, 7) })).sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const close = easeOut(Math.min(1, p / 0.28)), r = R * (2.3 - 1.3 * close), k = e.a * Math.min(1, (1 - p) / 0.35), sink = p > 0.6 ? (p - 0.6) / 0.4 : 0;
      c.lineJoin = 'round';
      for (const s of teeth) {
        const px = x + Math.cos(s.a) * r, py = y + Math.sin(s.a) * r * flat, h = s.h * (1 - sink) * (0.5 + 0.5 * close), lean = -Math.cos(s.a) * 12 * close;
        c.globalAlpha = k; c.fillStyle = '#5a3c1c'; c.strokeStyle = '#140c06'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(px - s.w, py); c.quadraticCurveTo(px - s.w * 0.4 + lean * 0.3, py - h * 0.5, px + lean, py - h); c.quadraticCurveTo(px + s.w * 0.4 + lean * 0.3, py - h * 0.5, px + s.w, py); c.closePath(); c.fill(); c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.7; c.strokeStyle = GROVE_GOLD; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px - s.w * 0.4, py - 2); c.quadraticCurveTo(px - s.w * 0.2 + lean * 0.3, py - h * 0.5, px + lean, py - h); c.stroke(); c.globalCompositeOperation = 'source-over';
        V.glowAt(c, px + lean, py - h, 7, '#fff2b0', k * 0.8 * (1 - sink));
      }
      c.globalAlpha = 1;
    } });
  }
  // Thornlash: a vine whip cracks out to the boss and a ring of thorns snaps shut round it (a leaf or two, sap, a
  // starburst); then a faint ring of thorny vine stays round its feet for the 30s the thorns bite, a leaf dropping now
  // and then
  ABILITY_VFX.grovekeeper.thorn = c => {
    groveWhip(c.x, c.y - 16, c.tx, c.ty - 10, { dur: 0.22 });
    V.glint(c.tx, c.ty, { color: '#c8ff8a', size: 20, z: 10 });
    c.later(0.1, () => {
      const tx = c.tx, ty = c.ty, R = 44, spikes = Array.from({ length: 12 }, (_, i) => ({ a: i * TAU / 12 + rand(-0.15, 0.15), l: rand(6, 10) }));
      groveClamp(tx, ty, { r: 42, dur: 0.55 });
      V.flash(tx, ty - 16, 60, LEAF, 0.22);
      V.spikeburst(tx, ty, { r: 50, n: 12, color: '#4f9f3f', core: '#d8ff9a', ink: '#0e2008', dur: 0.32, z: 10 }); V.shock(tx, ty, { r: 70, color: '#8fdf5a', dur: 0.4, w: 4 });
      V.splash(tx, ty, { color: '#4a7a2a', n: 4, size: 0.8 }); V.motes(tx, ty, { kind: 'leaf', color: '#6fbf4a', n: 4, r: 30, rise: 0.5 }); shake(2);
      OLD_PAINT.linger(30, 'ground', (cc, k, t) => { V.neonRing(cc, tx, ty, R, '#4f9f3f', 1.8, k, 0.6);
        V.neonPath(cc, '#8fdf5a', 1.3, k * 0.8, () => { for (const s of spikes) { const x = tx + Math.cos(s.a) * R, y = ty + Math.sin(s.a) * R * 0.6; cc.moveTo(x, y); cc.lineTo(x + Math.cos(s.a + 0.6) * s.l, y + Math.sin(s.a + 0.6) * s.l * 0.6 - 3); } }); },
        { peak: 0.9, settle: 0.32, hold: 1, tick: () => { if (Math.random() < 0.02) V.spawn({ x: tx + rand(-30, 30), y: ty, z: rand(30, 50), vz: -15, vx: rand(-10, 10), life: 1.2, size: 9, color: '#6fbf4a', kind: 'leaf', add: false, vr: rand(-3, 3), flutter: 5 }); } });
    });
  };

  // ---------------------------------------------------------------- Chronomancer (violet, deep blue, gold)
  // After the painted sheet (docs/art/vfx-reference/chronomancer.png), each move in three beats. Time Reversal: a great
  // dial spins backwards with ribbon arrows round the caster; crystals and debris implode and burst with ring arrows; a
  // large faint clock face stays on the floor. Its moves (Shift's Slow / Haste rings, Rewind, Paradox, Stasis) are in this
  // block too, below the Ultimate; the boss's Time Stop is BOSS_VFX.timeStop (boss-vfx.js).
  const CHRONO_VIO = '#b48cff', CHRONO_BLUE = '#7aa0ff', CHRONO_GOLD = '#ffd27a', CHRONO_PALE = '#e0d4ff', CHRONO_INK = '#120c28', CHRONO_HASTE = '#ffa63a', CHRONO_DARK = '#2a2050';
  const CHRONO_NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  // CHRONO_ULT_SCALE sizes Time Reversal: its wind-up dial and ribbon arrows, the implosion and burst, the clock left
  // on the floor (the boss's Time Stop face has its own TS_SCALE in boss-vfx.js)
  const CHRONO_ULT_SCALE = 1.6;
  // the twelve numerals painted once per colour, so a dial blits them rather than setting text every frame
  const chronoNumArt = {};
  function chronoNumerals(col) {
    if (chronoNumArt[col]) return chronoNumArt[col];
    const fs = 40;
    return (chronoNumArt[col] = CHRONO_NUM.map(s => {
      const cv = document.createElement('canvas'); let g = cv.getContext('2d'); g.font = `600 ${fs}px Georgia, serif`;
      const w = Math.ceil((g.measureText(s).width || fs) + 14), h = fs + 14; cv.width = w; cv.height = h; g = cv.getContext('2d');
      g.font = `600 ${fs}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = 8; g.fillStyle = col; g.fillText(s, w / 2, h / 2); g.shadowBlur = 0; g.globalAlpha = 0.55; g.fillStyle = '#fffbe8'; g.fillText(s, w / 2, h / 2 - 1);
      return { cv, w, h, fs };
    }));
  }
  // a clock face on the floor: a gold rim, violet and blue inner rings, roman numerals, two hands turning at `spin`
  // (negative: backwards). o.a caps its strength: a face left lying on the floor stays faint over the telegraphs, and
  // its dark middle is only a tint (it is led by its rims). o.form: the rings sweep round into being (alternating ways)
  // and the numerals stamp in one by one over that many seconds. o.rich adds an outer band, minute ticks, a counter-
  // turning gear ring and a small inner ring.
  function chronoDial(x, y, o = {}) {
    const r = o.r ?? 150, dur = o.dur ?? 1, spin = o.spin ?? -1, cap = o.a ?? 1, flat = o.flat ?? 0.62, fin = o.fadeIn ?? 0.12, fout = o.fadeOut ?? 0.4, follow = o.follow, form = o.form || 0, rich = o.rich;
    const nums = o.numerals !== false ? chronoNumerals(o.numCol || CHRONO_GOLD) : null;
    return V.fx({ dur, layer: 'ground', delay: o.delay, draw: (c, p, t, e) => {
      const T = p * dur, cx = follow ? follow.x : x, cy = follow ? follow.y : y;
      const k = e.a * cap * Math.min(1, T / fin, (dur - T) / fout), R = r * (form ? 0.9 + 0.1 * easeOut(Math.min(1, T / form)) : 0.8 + 0.2 * easeOut(Math.min(1, T / 0.3)));
      if (k <= 0.01) return;
      const sweep = i => (form ? Math.max(0, Math.min(1, (T - i * form * 0.12) / (form * 0.55))) : 1);
      const ring = (i, rr, col, w, a) => { const f = sweep(i); if (f <= 0) return; if (f >= 1) { V.neonRing(c, cx, cy, rr, col, w, a, flat); return; }
        const a0 = -Math.PI / 2, dir = i % 2 ? -1 : 1; V.neonPath(c, col, w, a, () => c.ellipse(cx, cy, rr, rr * flat, 0, a0, a0 + dir * TAU * f, dir < 0)); };
      c.save(); c.translate(cx, cy); c.scale(1, flat); c.globalAlpha = 0.16 * k * sweep(0); c.fillStyle = '#1a1648'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.restore();
      ring(0, R, CHRONO_GOLD, 2.6, k);
      if (rich) ring(1, R * 1.07, CHRONO_VIO, 1, k * 0.7);
      ring(2, R * 0.9, CHRONO_VIO, 1.2, k * 0.8);
      if (rich) ring(3, R * 0.62, CHRONO_BLUE, 1.2, k * 0.7);
      ring(4, R * 0.45, CHRONO_BLUE, 1, k * 0.6);
      if (rich) ring(5, R * 0.18, CHRONO_GOLD, 1.2, k * 0.8);
      c.save(); c.translate(cx, cy); c.scale(1, flat); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      c.strokeStyle = CHRONO_GOLD; c.globalAlpha = 0.8 * k * sweep(1);
      c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i < 12; i += 3) { const a = i * TAU / 12 - Math.PI / 2; c.moveTo(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88); c.lineTo(Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.99); } c.stroke();
      c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 12; i++) { if (i % 3 === 0) continue; const a = i * TAU / 12 - Math.PI / 2; c.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.lineTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97); } c.stroke();
      if (rich) {
        c.globalAlpha = 0.55 * k * sweep(2); c.lineWidth = 0.8; c.beginPath(); for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const a = i * TAU / 60; c.moveTo(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93); c.lineTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); } c.stroke();
        c.strokeStyle = CHRONO_BLUE; c.globalAlpha = 0.6 * k * sweep(3); c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 24; i++) { const a = i * TAU / 24 - t * spin * 0.6; c.moveTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55); c.lineTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62); } c.stroke();
      }
      if (nums) {
        const sz = Math.max(10, R * 0.12);
        for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12 - Math.PI / 2, at0 = form ? form * (0.15 + 0.6 * ((12 - i) % 12) / 12) : 0, q = form ? Math.min(1, Math.max(0, (T - at0) / 0.08)) : 1; if (q <= 0) continue;
          const n = nums[i], sc = sz / n.fs * (1 + 0.6 * (1 - q));
          c.save(); c.translate(Math.cos(a) * R * 0.77, Math.sin(a) * R * 0.77); c.rotate(a + Math.PI / 2); c.globalAlpha = 0.9 * k * q; c.drawImage(n.cv, -n.w * sc / 2, -n.h * sc / 2, n.w * sc, n.h * sc); c.restore();
        }
      }
      const hand = (a, len, w, col) => { c.globalAlpha = k; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.stroke(); };
      hand(-Math.PI / 2 + t * spin * 6, R * 0.7, rich ? 2.6 : 2, '#ffffff'); hand(-Math.PI / 2 + 2 + t * spin, R * 0.45, rich ? 5 : 4, CHRONO_GOLD);
      c.restore();
      V.glowAt(c, cx, cy, rich ? 16 : 10, '#ffffff', k);
    } });
  }
  // a band along an arc, thin at its tail (a1) and full at its head (a2); with dir it ends in an arrowhead
  function chronoBand(c, R, a1, a2, w, dir) {
    c.beginPath();
    for (let i = 0; i <= 10; i++) { const q = i / 10, a = a1 + (a2 - a1) * q, rr = R + w * 0.5 * q; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    if (dir) { const s = Math.sign(a2 - a1) || 1, hw = w * 1.1; c.lineTo(Math.cos(a2) * (R + hw), Math.sin(a2) * (R + hw)); c.lineTo(Math.cos(a2 + s * 0.22) * R, Math.sin(a2 + s * 0.22) * R); c.lineTo(Math.cos(a2) * (R - hw), Math.sin(a2) * (R - hw)); }
    for (let i = 10; i >= 0; i--) { const q = i / 10, a = a1 + (a2 - a1) * q, rr = R - w * 0.5 * q; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  // ribbon arrows sweeping round a point (dir -1: backwards), gold, violet, blue; o.inward draws them in to the centre
  function chronoArrows(x, y, o = {}) {
    const r = o.r ?? 120, dur = o.dur ?? 1, dir = o.dir ?? -1, n = Math.min(o.n ?? 4, 6), sp = o.speed ?? 6, follow = o.follow, inward = o.inward, ws = o.w ?? 1;
    const cols = o.cols || [CHRONO_GOLD, CHRONO_VIO, CHRONO_BLUE, CHRONO_PALE];
    const arr = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.2, 0.2), rr: rand(0.8, 1.12), h: rand(6, 30) * ws, w: rand(8, 12) * ws, col: cols[i % cols.length], span: rand(1.4, 2) }));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, p / 0.15, (1 - p) / 0.3);
      const shrink = inward ? 1 - 0.6 * easeOut(p) : 0.85 + 0.15 * easeOut(Math.min(1, p / 0.3));
      for (const b of arr) {
        const R = r * b.rr * shrink, a2 = b.a + dir * t * sp, a1 = a2 - dir * b.span;
        c.save(); c.translate(cx, cy - b.h); c.scale(1, 0.5);
        c.globalAlpha = 0.35 * k; c.fillStyle = CHRONO_INK; chronoBand(c, R, a1, a2, b.w + 4, dir);
        c.globalAlpha = 0.85 * k; c.fillStyle = b.col; chronoBand(c, R, a1, a2, b.w, dir);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7 * k; c.fillStyle = '#ffffff'; chronoBand(c, R, a1 + (a2 - a1) * 0.3, a2, b.w * 0.25, 0);
        c.restore();
      }
      c.globalAlpha = 1;
    } });
  }
  // big faceted crystal shards flung out from a point along the floor, turning and falling: a violet or blue body, a
  // white lit facet and edge (o.n at most 14)
  function chronoCrystals(x, y, o = {}) {
    const n = Math.min(o.n ?? 10, 14), sp = o.speed ?? 320, sz = o.size ?? 16, dur = o.dur ?? 0.75, cols = o.cols || [CHRONO_VIO, CHRONO_BLUE, CHRONO_PALE, CHRONO_DARK];
    const sh = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.25, 0.25), s = sp * rand(0.6, 1.1); return { vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(120, 260), r0: rand(0, TAU), vr: rand(-9, 9), L: sz * rand(0.8, 1.4), W: sz * rand(0.35, 0.5), col: cols[i % cols.length] }; });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.35), dr = (1 - Math.exp(-2.2 * t)) / 2.2;
      c.lineJoin = 'round';
      for (const s of sh) {
        const z = Math.max(0, s.vz * t - 420 * t * t), px = x + s.vx * dr, py = y + s.vy * dr - 24 - z;
        c.save(); c.translate(px, py); c.rotate(s.r0 + s.vr * t);
        c.globalAlpha = k * 0.85; c.fillStyle = s.col; c.beginPath(); c.moveTo(0, -s.L); c.lineTo(s.W, 0); c.lineTo(0, s.L * 0.6); c.lineTo(-s.W, 0); c.closePath(); c.fill();
        c.globalAlpha = k * 0.6; c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, -s.L); c.lineTo(s.W * 0.5, -s.L * 0.1); c.lineTo(0, 0); c.closePath(); c.fill();
        c.globalAlpha = k; c.strokeStyle = s.col === CHRONO_DARK ? CHRONO_VIO : '#f4eeff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -s.L); c.lineTo(s.W, 0); c.lineTo(0, s.L * 0.6); c.lineTo(-s.W, 0); c.closePath(); c.stroke();
        c.restore();
      }
      c.globalAlpha = 1;
    } });
  }
  // crystals and dark debris pulled in to a point, then flung back out with a white-gold pop (o.s scales the shards)
  function chronoImplode(x, y, o = {}) {
    const r = o.r ?? 160, n = Math.min(o.n ?? 14, 20), T = o.t ?? 0.28, s0 = o.s ?? 1, cols = [CHRONO_VIO, CHRONO_BLUE, CHRONO_DARK, CHRONO_GOLD];
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), d = r * rand(0.6, 1), col = cols[i % 4];
      V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: rand(10, 50), vx: -Math.cos(a) * d / T, vy: -Math.sin(a) * d * 0.6 / T, life: T, size: rand(9, 15) * s0, color: col, kind: 'shard', add: col === CHRONO_DARK ? false : undefined, vr: rand(-10, 10), fadeIn: 0.3 }); }
    V.fx({ dur: T, layer: 'air', draw: (c, p, t, e) => V.glowAt(c, x, y - 30, (30 + 50 * p) * s0, CHRONO_PALE, e.a * p * 0.8), done: () => {
      V.flash(x, y - 30, 90 * s0, '#fff2c8', 0.22);
      for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(180, 380) * s0, col = cols[i % 4];
        V.spawn({ x, y, z: 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(60, 200), g: 500, drag: 0.03, life: rand(0.5, 0.8), size: rand(8, 13) * s0, color: col, kind: 'shard', add: col === CHRONO_DARK ? false : undefined, vr: rand(-12, 12) }); }
      V.debris(x, y, { n: 6, color: '#2e2a4a' });
    } });
  }
  // which stance a chronomancer is in isn't sent with the cast: each client keeps a guess on the hero, flipped by each
  // Shift and set by Paradox (back to Slow), Time Lag (Slow) and Time Reversal (Haste). A wrong guess only shows the other colour.
  function chronoStanceFlip(ent) { let h = !ent._chronoHaste; if (FX.now - (ent._chronoSlowAt ?? -9) < 0.6) h = false; ent._chronoHaste = h; return h; }
  // Haste held: a faint orange ring at the feet and speed streaks now and then, until the guess says Slow (30s at most)
  function chronoHasteAura(ent) {
    const id = (ent._chronoAura = (ent._chronoAura || 0) + 1);
    V.fx({ dur: 30, layer: 'ground', draw: (c, p, t, e) => {
      if (ent._chronoAura !== id || !ent._chronoHaste) { e.dur = 0; return; }
      const k = e.a * Math.min(1, t / 0.3, (30 - t) / 1);
      V.neonRing(c, ent.x, ent.y, 30, CHRONO_HASTE, 1.4, k * 0.4, 0.55);
      c.save(); c.translate(ent.x, ent.y); c.scale(1, 0.55); c.rotate(t * 3); c.globalCompositeOperation = 'lighter'; c.strokeStyle = CHRONO_HASTE; c.lineWidth = 1.5; c.globalAlpha = k * 0.5;
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4; c.beginPath(); c.moveTo(Math.cos(a) * 25, Math.sin(a) * 25); c.lineTo(Math.cos(a) * 35, Math.sin(a) * 35); c.stroke(); }
      c.restore();
    }, tick: (p, dt, e) => { if (ent._chronoAura === id && ent._chronoHaste && Math.random() < 0.05) V.spawn({ x: ent.x + rand(-20, 20), y: ent.y + rand(-6, 6), z: 4, vz: rand(90, 140), life: 0.45, size: 7, color: CHRONO_HASTE, stretch: 4 }); } });
  }
  // an hourglass (two triangles meeting at the waist), s tall
  function chronoHourglass(c, s) { c.beginPath(); c.moveTo(-s * 0.4, -s * 0.5); c.lineTo(s * 0.4, -s * 0.5); c.lineTo(0, 0); c.closePath(); c.moveTo(-s * 0.4, s * 0.5); c.lineTo(s * 0.4, s * 0.5); c.lineTo(0, 0); c.closePath(); }
  // a translucent figure of light the shape of a hero: an afterimage of a moment ago
  function chronoGhost(c, x, y, s, col, a) {
    if (a <= 0.01) return;
    c.save(); c.translate(x, y); c.scale(s, s); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
    c.globalAlpha = Math.min(1, a * 0.35); c.fillStyle = col;
    c.beginPath(); c.arc(0, -36, 6, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-9, -28); c.lineTo(9, -28); c.lineTo(7, -10); c.lineTo(9, 0); c.lineTo(3, 0); c.lineTo(0, -10); c.lineTo(-3, 0); c.lineTo(-9, 0); c.lineTo(-7, -10); c.closePath(); c.fill();
    c.globalAlpha = Math.min(1, a * 0.8); c.strokeStyle = col; c.lineWidth = 1.2 / s; c.stroke();
    c.restore(); c.globalAlpha = 1;
  }
  // the stance taken: a ring under the chronomancer (violet ticking slowly for Slow, orange spinning for Haste), its
  // glyph over the head (an hourglass, or two up arrows), then slow motes hanging or speed streaks shooting up
  function chronoStance(ent, haste) {
    const col = haste ? CHRONO_HASTE : CHRONO_VIO, dur = 1.5, gx = ent.x, gy = ent.y;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12, (1 - p) / 0.35), x = ent.x, y = ent.y, R = 58 * (0.8 + 0.2 * easeOut(Math.min(1, p / 0.2)));
      V.neonRing(c, x, y, R, col, 2.4, k, 0.55); V.neonRing(c, x, y, R * 0.78, col, 1, k * 0.6, 0.55); V.neonRing(c, x, y, R * 1.12, haste ? '#ffe0a0' : CHRONO_PALE, 0.8, k * 0.45, 0.55);
      c.save(); c.translate(x, y); c.scale(1, 0.55); c.rotate((haste ? 4 : -0.5) * t); c.globalCompositeOperation = 'lighter'; c.strokeStyle = col; c.globalAlpha = k * 0.8;
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.lineWidth = i % 3 ? 1 : 2.4; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); c.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95); c.stroke(); }
      // a short arrow riding the rim the way the stance turns time (Haste forwards, fast; Slow backwards)
      c.fillStyle = col; c.globalAlpha = k * 0.9; chronoBand(c, R * 1.12, haste ? -1.2 : 1.2, 0, 5, haste ? 1 : -1);
      c.restore();
    } });
    V.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15, (1 - p) / 0.4), x = ent.x, y = ent.y - 84 - (haste ? 18 : 4) * p;
      V.glowAt(c, x, y, 24, col, 0.55 * k);
      c.save(); c.translate(x, y); c.scale(1.35, 1.35);
      if (haste) for (const dx of [-7, 7]) V.neonPath(c, col, 2, k, () => { c.moveTo(dx - 6, 3); c.lineTo(dx, -4); c.lineTo(dx + 6, 3); });
      else V.neonPath(c, col, 1.8, k, () => chronoHourglass(c, 18));
      c.restore();
    } });
    if (haste) for (let i = 0; i < 10; i++) V.spawn({ x: ent.x + rand(-30, 30), y: ent.y + rand(-10, 10), z: rand(4, 34), vx: rand(-40, 40), vz: rand(200, 300), life: 0.42, size: 11, color: i % 2 ? CHRONO_HASTE : '#ffe0a0', stretch: 5 });
    else {
      for (let i = 0; i < 7; i++) V.spawn({ x: ent.x + rand(-32, 32), y: ent.y + rand(-10, 10), z: rand(20, 64), vz: -rand(8, 16), life: 1.2, size: rand(6, 10), size1: 0, color: i % 2 ? CHRONO_VIO : CHRONO_PALE });
      V.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => { chronoGhost(c, gx - 10, gy, 1.3, CHRONO_VIO, e.a * (1 - p) * 0.8); chronoGhost(c, gx - 22, gy, 1.3, CHRONO_BLUE, e.a * (1 - p) * 0.45); } });   // (afterimages left where it stood)
    }
  }
  // the dial spins backwards round the party with ribbon arrows; at the impact the moment freezes (the longest hit-stop
  // of the healers), crystals implode and burst with ring arrows drawn in, and a large faint clock face stays on the floor
  // for the 6s it reached back through. The boss's stutter is KIT_VFX['chrono-undo']; its Time Stop is BOSS_VFX.timeStop.
  ABILITY_VFX.chronomancer.timereversal = c => {
    const at = { x: c.x, y: c.y }, S = CHRONO_ULT_SCALE;
    if (c.cam) c.cam.dim(0.36, 1.4);
    // wind-up: the great dial forms round the caster (rings sweeping round, numerals stamping in), hands racing back;
    // two layers of ribbon arrows counter-turn over it, light gathering in the middle
    chronoDial(at.x, at.y, { r: 150 * S, dur: LAND + 0.25, spin: -9, a: 0.95, fadeOut: 0.25, form: LAND * 0.85, rich: true });
    chronoArrows(at.x, at.y, { r: 135 * S, n: 4, dur: LAND + 0.15, dir: -1, speed: 6, follow: c.ent, w: 1.4 });
    chronoArrows(at.x, at.y, { r: 85 * S, n: 3, dur: LAND + 0.1, dir: 1, speed: 8, follow: c.ent, w: 1.1, cols: [CHRONO_VIO, CHRONO_PALE, CHRONO_BLUE] });
    V.charge(c.x, c.y, { color: CHRONO_PALE, r: 80 * S, n: 12, dur: LAND, follow: c.ent });
    c.later(LAND, () => {
      impact(c.cam, '#e0d4ff', 0.2, 0.12);
      shake(6);
      // impact: everything pulled in, then a white-gold pop, crystal shards and ring arrows thrown back out
      chronoImplode(at.x, at.y, { r: 170 * S, n: 20, s: 1.25 });
      chronoArrows(at.x, at.y, { r: 120 * S, n: 4, dur: 0.6, dir: -1, speed: 10, inward: true, w: 1.3 });
      V.shock(at.x, at.y, { r0: 150 * S, r: 20, color: CHRONO_PALE, dur: 0.3, w: 8 });
      V.fx({ dur: 0.3, layer: 'air', done: () => {
        chronoCrystals(at.x, at.y, { n: 12, speed: 330 * S, size: 20, dur: 0.85 });
        V.shock(at.x, at.y, { r: 140 * S, color: '#fff2c8', dur: 0.45, w: 6 });
        V.shock(at.x, at.y, { r: 175 * S, color: CHRONO_VIO, dur: 0.65, w: 5, delay: 0.06 });
        V.burst(at.x, at.y - 30, { color: '#fff2c8', color2: CHRONO_VIO, n: 16, speed: 320, kind: 'star', flashR: 110 });
      }, draw() {} });
      // aftermath: the clock lies on the floor, rim-led, its hands creeping back, for the 6s it reached through
      chronoDial(at.x, at.y, { r: 170 * S, dur: 6, spin: -0.5, a: 0.4, fadeIn: 0.4, fadeOut: 1, rich: true });
      V.decal(at.x, at.y, { style: 'crack', r: 70 * S, dur: 3, a: 0.3, seed: Math.random() * 6 });
      c.ent._chronoHaste = true; chronoHasteAura(c.ent);   // (it slips the chronomancer into Haste)
    });
  };
  // the boss stutters: a small dial spinning back on it, ring arrows drawn in, glitching streaks, a violet starburst
  KIT_VFX['chrono-undo'] = Object.assign((e, target) => {
    const t = target || e;
    chronoDial(t.x, t.y, { r: 115, dur: 1.3, spin: -8, a: 0.75, numerals: false, rich: true });
    chronoArrows(t.x, t.y, { r: 100, n: 3, dur: 0.8, dir: -1, speed: 9, inward: true, w: 1.2 });
    for (let i = 0; i < 4; i++) { const a = rand(0, TAU), L = rand(50, 90); V.lightning(t.x + Math.cos(a) * L, t.y + Math.sin(a) * L * 0.6, t.x, t.y, { color: i % 2 ? CHRONO_GOLD : CHRONO_VIO, jag: 12, dur: 0.3 }); }
    V.spikeburst(t.x, t.y, { r: 80, n: 14, color: CHRONO_VIO, core: '#ffffff', ink: CHRONO_INK, dur: 0.4, z: 10 });
    V.shock(t.x, t.y, { r: 130, color: CHRONO_PALE, dur: 0.5, w: 6 });
    shake(4);
  }, { atTarget: true });

  // ---- Chronomancer's moves (the sheet's rows under the Ultimate)
  // Shift: the stance's ring and glyph (chronoStance), and Haste's faint ring kept while it lasts
  ABILITY_VFX.chronomancer.shift = c => { const haste = chronoStanceFlip(c.ent); chronoStance(c.ent, haste); if (haste) chronoHasteAura(c.ent); };
  // (online-refs pass, docs/art/vfx-online-refs/chronomancer.md) a small clock-tick ring hanging at a hit: a rim and
  // four ticks turning, gone in a third of a second (in the air at the body, never a floor mark)
  function chronoTickRing(x, y, o = {}) {
    const r = o.r ?? 24, dur = o.dur ?? 0.32, col = o.color || CHRONO_VIO, sp = o.spin ?? -4;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), R = r * (0.55 + 0.45 * easeOut(Math.min(1, p / 0.3)));
      V.neonRing(c, x, y, R, col, 2, k, 0.55);
      c.save(); c.translate(x, y); c.scale(1, 0.55); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffffff'; c.globalAlpha = k * 0.85; c.lineWidth = 1.6; c.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + t * sp; c.moveTo(Math.cos(a) * R * 0.68, Math.sin(a) * R * 0.68); c.lineTo(Math.cos(a) * R * 1.08, Math.sin(a) * R * 1.08); }
      c.stroke(); c.restore();
    } });
  }
  // a thread of time-light running from a point to an ally (follows them), its head a soft light; done() when it arrives
  function chronoThread(sx, sy, w, o = {}) {
    const dur = o.dur ?? 0.36, col = o.color || CHRONO_PALE, side = Math.random() < 0.5 ? -1 : 1;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const tx = w.x, ty = w.y - 22, L = Math.hypot(tx - sx, ty - sy) || 1, nx = -(ty - sy) / L, ny = (tx - sx) / L, bow = Math.min(60, L * 0.22) * side;
      const at = q => { const s = Math.sin(q * Math.PI); return { x: sx + (tx - sx) * q + nx * s * bow, y: sy + (ty - sy) * q + ny * s * bow - s * 26 }; };
      const head = easeOut(Math.min(1, p / 0.7)), tail = Math.max(0, (p - 0.3) / 0.7), k = e.a * Math.min(1, (1 - p) / 0.25 + 0.35);
      V.neonPath(c, col, 1.8, k * 0.8, () => { for (let s = 0; s <= 10; s++) { const P = at(tail + (head - tail) * s / 10); s ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); } });
      const h = at(head); V.glowAt(c, h.x, h.y, 13, col, k); V.glowAt(c, h.x, h.y, 5, '#ffffff', k);
    }, done: o.done });
  }
  // Temporal Bolt, the filler that both hurts and heals, says which stance threw it (like a Living Flame): Slow, a
  // violet time-shard landing as a little tick-ring, then a lilac thread runs from the boss to the linked ally (Rewind's
  // target, once there has been a Rewind) and blooms into a plus; Haste, a quicker orange-gold streak with two
  // afterimages, a gold pop, and a soft gold ring rippling out from the chronomancer for the party's heal
  ABILITY_VFX.chronomancer.bolt = c => {
    const ent = c.ent, haste = !!ent._chronoHaste, a = Math.atan2(c.ty - c.y, c.tx - c.x), hx = c.x + Math.cos(a) * 16, hy = c.y + Math.sin(a) * 16;
    const link = ent._chronoLink && ent._chronoLink !== ent ? ent._chronoLink : null;
    V.glint(hx, hy, { color: haste ? '#ffe0a0' : CHRONO_PALE, size: 20, z: 30 });
    const land = (x, y) => {
      V.flash(x, y - 18, 40, haste ? '#ffe0a0' : CHRONO_PALE, 0.16);
      V.spikeburst(x, y, { r: 34, n: 10, color: haste ? CHRONO_HASTE : CHRONO_VIO, core: '#ffffff', ink: CHRONO_INK, dur: 0.26, z: 16 });
      chronoTickRing(x, y - 18, { r: 26, color: haste ? CHRONO_GOLD : CHRONO_VIO, spin: haste ? 8 : -3 });
      for (let i = 0; i < 5; i++) { const b = rand(0, TAU), s = rand(140, 260); V.spawn({ x, y, z: 18, vx: Math.cos(b) * s, vy: Math.sin(b) * s * 0.6, vz: rand(40, 140), g: 400, drag: 0.04, life: rand(0.25, 0.4), size: rand(6, 9), color: i % 2 ? CHRONO_PALE : (haste ? CHRONO_HASTE : CHRONO_BLUE), kind: 'shard', vr: rand(-10, 10) }); }
      if (haste) {
        V.shock(ent.x, ent.y, { r: 110, r0: 20, color: CHRONO_GOLD, dur: 0.42, w: 3 });
        V.plus(ent.x, ent.y, { color: '#ffe0a0', n: 2 });
      } else if (link) chronoThread(x, y - 22, link, { done: () => { V.flash(link.x, link.y - 22, 30, CHRONO_PALE, 0.16); V.plus(link.x, link.y, { color: CHRONO_PALE, n: 2 }); } });
      shake(1.5);
    };
    if (haste) {
      V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: CHRONO_HASTE, speed: 1400, size: 0.9, onHit: land });
      for (let i = 1; i <= 2; i++) c.later(i * 0.035, () => V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: i === 1 ? '#ffd27a' : '#fff0c8', speed: 1400, size: 0.55 - i * 0.12 }));
    } else V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: CHRONO_VIO, speed: 1050, size: 0.95, onHit: land });
  };
  // two gold up-arrows over an ally's head, rising, a ring of speed climbing them: Quickened
  function chronoQuickMark(w) {
    V.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12, (1 - p) / 0.4), x = w.x, y = w.y - 86 - 20 * easeOut(p);
      V.glowAt(c, x, y, 24, CHRONO_HASTE, 0.5 * k);
      c.save(); c.translate(x, y); c.scale(1.35, 1.35);
      for (const dy of [4, -4]) V.neonPath(c, dy > 0 ? CHRONO_HASTE : '#ffe0a0', 2, k, () => { c.moveTo(-7, dy + 4); c.lineTo(0, dy - 3); c.lineTo(7, dy + 4); });
      c.restore();
      const q = easeOut(Math.min(1, p / 0.5)), ry = w.y - 70 * q, rx = 24 * (1 - 0.3 * q);
      V.neonPath(c, CHRONO_GOLD, 2.6 * (1 - q * 0.5), k * (1 - q), () => c.ellipse(x, ry, rx, rx * 0.42, 0, 0, TAU));
    } });
    for (let i = 0; i < 6; i++) V.spawn({ x: w.x + rand(-18, 18), y: w.y + rand(-6, 6), z: rand(4, 30), vz: rand(220, 300), life: 0.4, size: 10, color: i % 2 ? CHRONO_HASTE : '#ffe0a0', stretch: 5 });
  }
  // Accelerando (a party haste, like a Temporal Anomaly sweeping the group): a gold dial forms round the chronomancer and
  // races forwards for a second (faint on the floor: no dark disc, no teal), gold ribbon arrows sweep out with it, speed
  // streaks shoot up through the party, and the ally it was aimed at is marked Quickened
  ABILITY_VFX.chronomancer.accel = c => {
    const ent = c.ent;
    V.glint(c.x, c.y - 40, { color: '#ffe0a0', size: 30, z: 30 });
    chronoDial(c.x, c.y, { r: 150, dur: 1.0, spin: 7, a: 0.42, fadeOut: 0.45, form: 0.3, numerals: false, follow: ent });
    chronoArrows(c.x, c.y, { r: 120, n: 4, dur: 0.9, dir: 1, speed: 7, follow: ent, w: 1.2, cols: [CHRONO_GOLD, CHRONO_HASTE, '#ffe0a0', CHRONO_GOLD] });
    V.shock(c.x, c.y, { r: 190, r0: 40, color: CHRONO_GOLD, dur: 0.5, w: 4, delay: 0.1 });
    for (let i = 0; i < 10; i++) { const a = rand(0, TAU), d = rand(30, 150); V.spawn({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.6, z: 0, vz: rand(260, 380), life: 0.5, size: 9, color: i % 3 ? '#ffe0a0' : CHRONO_HASTE, stretch: 5 }); }
    const w = c.tent; if (w && w !== ent) c.later(0.15, () => chronoQuickMark(w)); else chronoQuickMark(ent);
  };
  // Recall (2.5s cast: raise, or a big heal): time runs back on the ally. A small dial spins backwards under them,
  // ring arrows close in, a shaft of time-light falls and their afterimage snaps back into them with a white burst
  ABILITY_VFX.chronomancer.recall = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, follow = c.tent || null;
    chronoDial(w.x, w.y, { r: 70, dur: 1.2, spin: -8, a: 0.6, numerals: false, follow, rich: true });
    chronoArrows(w.x, w.y, { r: 90, n: 3, dur: 0.5, dir: -1, speed: 9, inward: true, follow: follow || undefined, w: 1 });
    V.lightfall(w.x, w.y, { color: CHRONO_PALE, r: 30, h: 260, dur: 1.1, feathers: 0 });
    V.fx({ dur: 0.45, layer: 'air', draw: (cc, p, t, e) => { const q = easeOut(p); chronoGhost(cc, w.x, w.y, 2.3 - 0.95 * q, CHRONO_PALE, e.a * (0.4 + 0.6 * p)); } });
    c.later(0.45, () => {
      V.flash(w.x, w.y - 24, 46, CHRONO_PALE, 0.22);
      V.burst(w.x, w.y - 24, { color: CHRONO_PALE, color2: CHRONO_GOLD, n: 12, speed: 220, kind: 'star', flash: false });
      chronoTickRing(w.x, w.y - 30, { r: 34, color: CHRONO_GOLD, spin: -6, dur: 0.4 });
      V.shock(w.x, w.y, { r: 90, color: CHRONO_GOLD, dur: 0.45, w: 4 });
      V.plus(w.x, w.y, { color: CHRONO_PALE, n: 4 });
    });
  };
  // Rewind: afterimages of light along the path back to the ally, small rings marking each step, a clock turning back
  // under them and a burst as their moment snaps back
  function chronoTrail(sx, sy, w, o = {}) {
    const n = Math.min(o.n ?? 4, 6), dur = o.dur ?? 1.1, tx = w.x, ty = w.y;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.1, (1 - p) / 0.4);
      V.neonPath(c, CHRONO_BLUE, 1.6, k * 0.65, () => { c.moveTo(sx, sy); c.lineTo(tx, ty); });
      for (let i = 1; i <= n; i++) { const q = i / (n + 1), px = sx + (tx - sx) * q, py = sy + (ty - sy) * q; V.neonRing(c, px, py, 8, CHRONO_PALE, 1.2, k * 0.75, 0.6); V.glowAt(c, px, py, 4, '#ffffff', k * 0.8); }
    } });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      for (let i = 0; i < n; i++) {
        const T = p * dur - i * 0.07; if (T <= 0) continue;
        const q = 1 - (i + 1) / (n + 1), a = e.a * Math.min(1, T / 0.12) * Math.min(1, (1 - p) / 0.45) * (1 - i * 0.15);
        chronoGhost(c, sx + (tx - sx) * q, sy + (ty - sy) * q, 1.35, i % 2 ? CHRONO_VIO : CHRONO_BLUE, a);
      }
    } });
  }
  ABILITY_VFX.chronomancer.rewind = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, follow = c.tent || null;
    if (c.tent) c.ent._chronoLink = c.tent;   // (Rewind's target becomes the link: the Slow Bolt's thread runs to them)
    if (Math.hypot(w.x - c.x, w.y - c.y) > 40) chronoTrail(c.x, c.y, w, { n: 4, dur: 1.1 });
    chronoDial(w.x, w.y, { r: 62, dur: 1.05, spin: -6, a: 0.85, numerals: false, follow, rich: true });
    chronoArrows(w.x, w.y, { r: 52, n: 2, dur: 0.6, dir: -1, speed: 9, follow: follow || undefined, w: 0.8 });
    c.later(0.45, () => { V.burst(w.x, w.y - 16, { color: CHRONO_PALE, color2: CHRONO_GOLD, n: 12, speed: 190, flashR: 60 }); V.shock(w.x, w.y, { r: 80, color: CHRONO_VIO, dur: 0.38, w: 4 }); V.fx({ dur: 0.35, layer: 'air', draw: (c, p, t, e) => chronoGhost(c, w.x, w.y, 1.35 + 0.4 * p, '#ffffff', e.a * (1 - p)) }); });
  };
  // thin rays of light flung out from a point, violet, gold and white
  function chronoRays(x, y, o = {}) {
    const n = Math.min(o.n ?? 10, 16), r = o.r ?? 100, dur = o.dur ?? 0.35, cols = [CHRONO_VIO, CHRONO_GOLD, '#ffffff', CHRONO_BLUE];
    const rays = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.15, 0.15), L: r * rand(0.6, 1.1), col: cols[i % 4] }));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), g = easeOut(Math.min(1, p / 0.4));
      for (const ry of rays) V.neonPath(c, ry.col, 2, k, () => { c.moveTo(x + Math.cos(ry.a) * ry.L * 0.2 * g, y + Math.sin(ry.a) * ry.L * 0.12 * g); c.lineTo(x + Math.cos(ry.a) * ry.L * g, y + Math.sin(ry.a) * ry.L * 0.6 * g); });
    } });
  }
  // two orbits crossing on the floor, small nodes riding them
  function chronoOrbits(x, y, o = {}) {
    const R = o.r ?? 100, dur = o.dur ?? 1.6, cap = o.a ?? 0.5;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * cap * Math.min(1, p / 0.15, (1 - p) / 0.45);
      for (let j = 0; j < 2; j++) {
        const rot = j ? 0.45 : -0.45, col = j ? CHRONO_GOLD : CHRONO_VIO;
        c.save(); c.translate(x, y); c.scale(1, 0.6); c.rotate(rot); V.neonPath(c, col, 1.6, k, () => c.ellipse(0, 0, R, R * 0.45, 0, 0, TAU)); c.restore();
        for (let i = 0; i < 2; i++) { const th = t * (j ? 1.8 : -1.8) + i * Math.PI, ex = Math.cos(th) * R, ey = Math.sin(th) * R * 0.45;
          V.glowAt(c, x + ex * Math.cos(rot) - ey * Math.sin(rot), y + (ex * Math.sin(rot) + ey * Math.cos(rot)) * 0.6, 7, col, k); }
      }
    } });
  }
  // Paradox: four afterimages (violet and blue) on a diamond of light close in on the boss, it bursts in a starburst of
  // rays, and two crossing orbits are left on the floor; bigger for more Flux spent. The shift back to Slow.
  KIT_VFX.paradox = Object.assign((e, target, d) => {
    const t = target || e, big = Math.min(1.5, 0.7 + ((d && d.n) || 0) / 120);
    e._chronoHaste = false; e._chronoSlowAt = FX.now;
    const corners = [[-1, 0], [0, -1], [1, 0], [0, 1]].map(([dx, dy], i) => ({ x: t.x + dx * 150 * big, y: t.y + dy * 88 * big, col: i % 2 ? CHRONO_BLUE : CHRONO_VIO }));
    V.shock(e.x, e.y, { r: 85, color: CHRONO_PALE, w: 3, dur: 0.35 });
    V.fx({ dur: 0.3, layer: 'air', draw: (c, p, tt, ef) => {
      const q = easeOut(p) * 0.85, k = ef.a * Math.min(1, p / 0.2), at = g => ({ x: g.x + (t.x - g.x) * q, y: g.y + (t.y - g.y) * q });
      c.setLineDash([8, 6]); V.neonPath(c, CHRONO_PALE, 1.4, k * 0.6, () => { corners.forEach((g, i) => { const P = at(g); i ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); }); c.closePath(); }); c.setLineDash([]);
      for (const g of corners) { const P = at(g); V.glowAt(c, P.x, P.y - 20, 22, g.col, k * 0.5); chronoGhost(c, P.x, P.y, 1.35, g.col, k * (1 - p * 0.4)); }
    }, done: () => {
      V.spikeburst(t.x, t.y, { r: 90 * big, n: 18, color: CHRONO_VIO, core: '#ffffff', ink: CHRONO_INK, dur: 0.4, z: 14 });
      chronoRays(t.x, t.y - 14, { n: 14, r: 145 * big, dur: 0.38 });
      V.burst(t.x, t.y - 14, { color: CHRONO_PALE, color2: CHRONO_GOLD, n: 14, speed: 300, kind: 'star', flash: false });
      chronoCrystals(t.x, t.y, { n: 6, speed: 240, size: 12, dur: 0.6 });
      chronoOrbits(t.x, t.y, { r: 130 * big, dur: 1.7, a: 0.5 });
      V.debris(t.x, t.y, { n: 4, color: '#2e2a4a' });
      shake(3);
    } });
  }, { atTarget: true });
  // the Time Lag (Haste run dry): the guess goes back to Slow
  const chronoLag0 = KIT_VFX.lag;
  KIT_VFX.lag = e => { e._chronoHaste = false; if (chronoLag0) chronoLag0(e); };
  // Stasis: the press itself is a glint; holding is a bubble of slowed time round the chronomancer, two orbits riding
  // it, for as long as it holds (KIT_VFX['stasis-hold']); the release bursts it and leaves an hourglass seal on the
  // floor (KIT_VFX['stasis-release'])
  ABILITY_VFX.chronomancer.stasis = c => { V.glint(c.x, c.y - 30, { color: CHRONO_PALE, size: 24, z: 30 }); };
  function chronoShell(ent, dur) {
    const id = (ent._chronoShell = (ent._chronoShell || 0) + 1);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      if (ent._chronoShell !== id) { e.dur = 0; return; }
      const k = e.a * Math.min(1, t / 0.25) * (t < 0.6 ? 1 : 0.6) * Math.min(1, (dur - t) / 0.3), x = ent.x, y = ent.y - 30, R = 68 * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.3)));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, R * 0.5, x, y, R); g.addColorStop(0, rgba(CHRONO_VIO, 0)); g.addColorStop(1, rgba(CHRONO_VIO, 0.22 * k));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); c.restore();
      V.neonRing(c, x, y, R, CHRONO_VIO, 1.6, k * 0.8, 1);
      V.neonRing(c, x, y, R, CHRONO_PALE, 1, k * 0.45, 0.25);
      const mer = Math.cos(t * 1.1);   // (a meridian turning round the bubble, so it reads as a sphere)
      c.save(); c.translate(x, y); V.neonPath(c, CHRONO_PALE, 1, k * 0.4, () => c.ellipse(0, 0, Math.max(1, R * Math.abs(mer)), R, 0, 0, TAU)); c.restore();
      V.neonRing(c, ent.x, ent.y, R * 0.9, CHRONO_VIO, 1.2, k * 0.5, 0.5);
      for (let j = 0; j < 2; j++) {
        const rot = j ? 0.5 : -0.5, col = j ? CHRONO_GOLD : CHRONO_BLUE;
        c.save(); c.translate(x, y); c.rotate(rot); V.neonPath(c, col, 1.4, k * 0.8, () => c.ellipse(0, 0, R * 1.18, R * 0.32, 0, 0, TAU)); c.restore();
        for (let i = 0; i < 2; i++) { const th = t * (j ? 1.6 : -1.3) + i * Math.PI, ex = Math.cos(th) * R * 1.18, ey = Math.sin(th) * R * 0.32;
          const nx = x + ex * Math.cos(rot) - ey * Math.sin(rot), ny = y + ex * Math.sin(rot) + ey * Math.cos(rot);
          V.glowAt(c, nx, ny, 8, col, k); V.neonRing(c, nx, ny, 4, '#ffffff', 1, k * 0.8, 1); }
      }
    } });
  }
  // an hourglass seal on the floor: gold and violet rings, ticks, an hourglass with sand glowing at its foot
  function chronoSeal(x, y, o = {}) {
    const r = o.r ?? 90, dur = o.dur ?? 1.8, cap = o.a ?? 0.6, flat = 0.6;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * cap * Math.min(1, p / 0.12, (1 - p) / 0.45), R = r * (0.85 + 0.15 * easeOut(Math.min(1, p / 0.25)));
      V.neonRing(c, x, y, R, CHRONO_GOLD, 2.2, k, flat); V.neonRing(c, x, y, R * 0.84, CHRONO_VIO, 1.2, k * 0.8, flat);
      c.save(); c.translate(x, y); c.scale(1, flat);
      c.save(); c.rotate(t * 0.5); c.globalCompositeOperation = 'lighter'; c.strokeStyle = CHRONO_GOLD; c.globalAlpha = k * 0.8;
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.lineWidth = i % 3 ? 1 : 2; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86); c.lineTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); c.stroke(); }
      c.restore();
      V.neonPath(c, CHRONO_GOLD, 1.8, k, () => chronoHourglass(c, R * 0.9));
      c.restore();
      V.glowAt(c, x, y + R * 0.3 * flat, R * 0.2, CHRONO_GOLD, k * 0.7);
    } });
  }
  KIT_VFX['stasis-hold'] = e => {
    chronoShell(e, 8);
    V.shock(e.x, e.y, { r: 80, color: CHRONO_VIO, dur: 0.4, w: 3 });
    V.motes(e.x, e.y, { color: CHRONO_PALE, n: 8, r: 34 });
  };
  KIT_VFX['stasis-release'] = e => {
    e._chronoShell = (e._chronoShell || 0) + 1;   // (ends the bubble)
    V.flash(e.x, e.y - 28, 60, CHRONO_PALE, 0.2);
    V.burst(e.x, e.y - 28, { color: CHRONO_PALE, color2: CHRONO_GOLD, n: 14, speed: 260, kind: 'star', flash: false });
    V.shock(e.x, e.y, { r: 190, color: CHRONO_PALE, w: 6, dur: 0.6 });
    chronoCrystals(e.x, e.y, { n: 8, speed: 260, size: 12, dur: 0.6, cols: [CHRONO_VIO, CHRONO_PALE, CHRONO_GOLD] });
    chronoSeal(e.x, e.y, { r: 118, dur: 1.9 });
    V.motes(e.x, e.y, { color: '#fff2c8', n: 10, r: 70 });
  };

  // ---------------------------------------------------------------- Alembist · Magnum Opus (brass and glass, every reagent)
  // After the painted sheet (docs/art/vfx-reference/alembist.png): a great brass-and-glass flask hovers over the party
  // in a turning hex circle, ribbons of green, red and blue round it (wind-up); beams and vials of every colour rain
  // down onto the party while the flask hurls its orb at the boss (impact); a wide multicolour hex seal stays on the
  // floor, low, for the shield's 10s (aftermath).
  // ALEM_ULT_SCALE: the whole Ultimate's size (flask, circle, beams, seal, orb burst). 1 = the first painted pass.
  const ALEM_ULT_SCALE = 1.4;
  const AMBER = '#ffd27a', BRASS = '#d9a54a', TEAL = '#4fe0cc', OPUS3 = ['#5ff08a', '#ff4a32', '#4fa8ff'];
  // OPUS_H: the flask's height over the party's feet; OPUS_FS: the flask drawing's scale; OPUS_TIP: its spout's tip
  const OPUS_FS = 1.6 * ALEM_ULT_SCALE, OPUS_H = 120 + 45 * ALEM_ULT_SCALE, OPUS_TIP = OPUS_H - 30 * OPUS_FS;
  // the party as live entities (Stagecraft's view of the raid; capped), else just the alembist
  function alemOpusParty(ent) {
    const sc = typeof Stagecraft !== 'undefined' && Stagecraft.S ? Stagecraft.S.env : null, out = [];
    if (sc && !sc.town && Array.isArray(sc.units) && sc.entById) for (const u of sc.units) { const w = sc.entById(u.id) || u; if (w && Number.isFinite(w.x)) out.push(w); if (out.length >= 8) break; }
    return out.length ? out : [ent];
  }
  // where the flask hangs: over the middle of the party, never more than 200 px from the alembist
  function alemOpusCentre(ent) {
    const ps = alemOpusParty(ent); let x = 0, y = 0;
    for (const w of ps) { x += w.x; y += w.y; }
    x /= ps.length; y /= ps.length;
    const dx = x - ent.x, dy = y - ent.y, d = Math.hypot(dx, dy), m = d > 200 ? 200 / d : 1;
    return { x: ent.x + dx * m, y: ent.y + dy * m };
  }
  // the great flask at (at.x, at.y - OPUS_H), drawn OPUS_FS times its sketch size: a teal glass bulb with green, red and
  // blue liquid swirling inside, a dark rim and brass cage, collar, cap and a long brass spout (the beams leave from its
  // tip, OPUS_TIP over the floor), glints running over the glass, two brass armillary rings turning round it (their back
  // halves behind the glass) and ribbons of green, red and blue circling. After o.hold s it fades back to half so the
  // boss and the party read through it
  function alemOpusFlask(at, o = {}) {
    const dur = o.dur ?? 1, hold = o.hold ?? dur, F = OPUS_FS, RX = 44 * F * 0.62, RY = 13 * F * 0.62;
    const ring = (x, y, i, t, k, back) => {
      c0.save(); c0.translate(x, y); c0.rotate(i ? 0.5 + t * 0.8 : -0.4 - t * 0.6); c0.globalAlpha = k * (back ? 0.55 : 1);
      const a0 = back ? Math.PI : 0;
      c0.strokeStyle = '#4a3010'; c0.lineWidth = 5.5; c0.beginPath(); c0.ellipse(0, 0, RX, RY, 0, a0, a0 + Math.PI); c0.stroke();
      c0.strokeStyle = BRASS; c0.lineWidth = 3.6; c0.stroke(); c0.strokeStyle = '#fff0c0'; c0.lineWidth = 1.1; c0.stroke();
      if (!back) for (let j = 0; j < 4; j++) { const a = 0.4 + j * 0.75; c0.fillStyle = '#ffe9a8'; c0.beginPath(); c0.arc(Math.cos(a) * RX, Math.sin(a) * RY, 2.4, 0, TAU); c0.fill(); }
      c0.restore(); c0.globalAlpha = 1;
    };
    let c0 = null;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      c0 = c;
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) * dur / 0.3) * (t > hold ? Math.max(0.5, 1 - (t - hold) / 0.4) : 1), rise = easeOut(Math.min(1, t / 0.35));
      const x = at.x, y = at.y - OPUS_H * (0.8 + 0.2 * rise) + Math.sin(t * 3) * 3;
      V.glowAt(c, x, y, 70 * F, TEAL, 0.45 * k); V.glowAt(c, x, y, 26 * F, '#ffffff', 0.3 * k);
      for (let i = 0; i < 2; i++) ring(x, y, i, t, k, true);
      c.save(); c.translate(x, y); c.scale(F, F); c.globalAlpha = k;
      // the spout: a long brass cone, its tip glowing
      c.fillStyle = '#8a5e22'; c.strokeStyle = '#2a1a08'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-7, 12); c.lineTo(7, 12); c.lineTo(0, 30); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = BRASS; c.fillRect(-8, 11, 16, 3);
      const g = c.createRadialGradient(-5, -5, 2, 0, 0, 17);
      g.addColorStop(0, '#e8fffa'); g.addColorStop(0.4, '#4fd4c2'); g.addColorStop(1, '#0a3236');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill();
      // the liquid: three colours swirling in the lower half, a bright surface line
      c.save(); c.beginPath(); c.arc(0, 0, 14.5, 0, TAU); c.clip(); c.globalCompositeOperation = 'lighter';
      OPUS3.forEach((col, i) => { c.globalAlpha = 0.85 * k; c.fillStyle = col; c.beginPath(); c.ellipse(Math.cos(t * 5 + i * 2.1) * 6, 5 + Math.sin(t * 4 + i) * 4, 10, 4.5, t * 3 + i, 0, TAU); c.fill(); });
      c.globalAlpha = 0.7 * k; c.strokeStyle = '#ffffff'; c.lineWidth = 0.9; c.beginPath();
      for (let j = 0; j <= 12; j++) { const px = -15 + j * 2.5, py = -1 + Math.sin(j * 0.9 + t * 7) * 1.2; j ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
      c.restore(); c.globalAlpha = k;
      c.strokeStyle = '#1a2a24'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.stroke();
      // the brass cage: an equator band and two meridians
      c.strokeStyle = BRASS; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 2, 16, 4.5, 0, 0, Math.PI); c.stroke();
      c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, 6, 16, 0, -Math.PI / 2, Math.PI / 2); c.stroke(); c.beginPath(); c.ellipse(0, 0, 6, 16, 0, Math.PI / 2, Math.PI * 1.5); c.stroke();
      c.fillStyle = 'rgba(200,240,240,0.8)'; c.fillRect(-4, -27, 8, 13); c.strokeStyle = '#1a2a24'; c.lineWidth = 1; c.strokeRect(-4, -27, 8, 13);
      c.fillStyle = BRASS; c.fillRect(-7, -17, 14, 3.5); c.fillRect(-5.5, -30, 11, 4.5); c.beginPath(); c.arc(0, -32, 2.8, 0, TAU); c.fill();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-7, -6, 3, 6.5, -0.5, 0, TAU); c.fill();
      c.restore(); c.globalAlpha = 1;
      for (let i = 0; i < 2; i++) ring(x, y, i, t, k, false);
      // glints sliding over the glass and the spout's tip burning
      for (let i = 0; i < 2; i++) { const a = t * 2.2 + i * 2.8, gx = x + Math.cos(a) * 11 * F, gy = y + Math.sin(a) * 9 * F, s = (7 + 3 * Math.sin(t * 9 + i)) * F * 0.5;
        V.neonPath(c, '#ffffff', 1.4, k * 0.9, () => { c.moveTo(gx - s, gy); c.lineTo(gx + s, gy); c.moveTo(gx, gy - s); c.lineTo(gx, gy + s); }); }
      V.glowAt(c, x, y + 30 * F, 9 * F, TEAL, k); V.glowAt(c, x, y + 30 * F, 4 * F, '#ffffff', k);
      OPUS3.forEach((col, i) => { const a0 = t * 4.5 + i * 2.09; V.neonPath(c, col, 5, 0.9 * k, () => { for (let j = 0; j <= 14; j++) { const a = a0 - 2.1 + 2.1 * j / 14, px = x + Math.cos(a) * 34 * F, py = y + 8 * F - j * 1.6 + Math.sin(a) * 11 * F; j ? c.lineTo(px, py) : c.moveTo(px, py); } }); });
    }, tick: () => { if (Math.random() < 0.35) V.spawn({ x: at.x + rand(-1, 1) * 22 * F, y: at.y, z: OPUS_H + rand(-14, 14) * F, vz: rand(-20, 20), life: 0.6, size: rand(6, 10), size1: 0, color: OPUS3[Math.floor(Math.random() * 3)], kind: 'star' }); } });
  }
  // the hex seal: brass rings, a hexagram of a green and a red triangle, a blue inner hexagon, little reagent circles at
  // its points. o.mono: all brass (the wind-up circle). It flares, then settles to o.settle (floor-low)
  // (o.w: a line-weight multiplier)
  function alemOpusSeal(x, y, R, dur, o = {}) {
    const peak = o.peak ?? 0.8, settle = o.settle ?? 0.26, W = o.w ?? 1;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) * dur / 0.8) * (settle + (peak - settle) * Math.max(0, 1 - t / 0.8));
      if (k < 0.02) return;
      const RR = R * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.3))), cs = o.mono ? [BRASS, BRASS, BRASS] : OPUS3;
      V.neonRing(c, x, y, RR, BRASS, 2.6 * W, k, 0.78); V.neonRing(c, x, y, RR * 0.9, AMBER, 1.2 * W, k * 0.7, 0.78);
      c.save(); c.translate(x, y); c.scale(1, 0.78); c.rotate(t * (o.spin ?? 0.15));
      const poly = (n, off, r, col, w) => V.neonPath(c, col, w * W, k, () => { for (let i = 0; i < n; i++) { const a = off + i * TAU / n; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); });
      poly(3, -Math.PI / 2, RR * 0.78, cs[0], 2); poly(3, Math.PI / 2, RR * 0.78, cs[1], 2); poly(6, 0, RR * 0.45, cs[2], 1.6);
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; V.neonPath(c, cs[i % 3], 1.4 * W, k, () => c.arc(Math.cos(a) * RR * 0.78, Math.sin(a) * RR * 0.78, RR * 0.09, 0, TAU)); }
      V.neonPath(c, AMBER, 1.2 * W, k * 0.8, () => c.arc(0, 0, RR * 0.16, 0, TAU));
      // tick marks round the rim (the sheet's dial), and a small hex at the heart
      V.neonPath(c, BRASS, 0.9 * W, k * 0.6, () => { for (let i = 0; i < 24; i++) { const a = i * TAU / 24, r0 = RR * (i % 2 ? 0.93 : 0.9); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * RR * 0.98, Math.sin(a) * RR * 0.98); } });
      poly(6, Math.PI / 6, RR * 0.2, AMBER, 1);
      c.restore();
    } });
  }
  // a beam of one reagent from the flask's spout down onto an ally
  // a beam of one reagent from the flask's spout down onto an ally: a thick tapered shaft of the colour with a white
  // core, a pool of its light round their feet
  function alemOpusBeam(tip, w, col, delay) {
    const AS = ALEM_ULT_SCALE, d0 = Math.hypot(w.x - tip.x, w.y - tip.y) || 1, from = { x: tip.x + (w.x - tip.x) / d0 * 10 * AS, y: tip.y + (w.y - tip.y) / d0 * 10 * AS };   // fanned out off the spout
    V.fx({ dur: 0.7, delay, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.6) * Math.min(1, t / 0.05), tx = w.x, ty = w.y - 6, q = Math.min(1, t / 0.08);
      const ex = from.x + (tx - from.x) * q, ey = from.y + (ty - from.y) * q, L = Math.hypot(ex - from.x, ey - from.y) || 1, nx = -(ey - from.y) / L, ny = (ex - from.x) / L;
      const W0 = 3 * AS * (1 - p * 0.5), W1 = 12 * AS * (1 - p * 0.5);
      // the colour body is painted over (not added) so green, red and blue crossing stay their own colours, not white
      c.save();
      for (const [cc, f, al, add] of [[col, 1.8, 0.3, 1], [col, 1, 0.85, 0], ['#ffffff', 0.2, 0.75, 1]]) { c.globalCompositeOperation = add ? 'lighter' : 'source-over'; c.globalAlpha = al * k; c.fillStyle = cc; c.beginPath();
        c.moveTo(from.x + nx * W0 * f, from.y + ny * W0 * f); c.lineTo(ex + nx * W1 * f, ey + ny * W1 * f); c.lineTo(ex - nx * W1 * f, ey - ny * W1 * f); c.lineTo(from.x - nx * W0 * f, from.y - ny * W0 * f); c.closePath(); c.fill(); }
      c.restore(); c.globalAlpha = 1;
      if (q >= 1) { V.glowAt(c, tx, ty, 34 * AS, col, 0.8 * k); V.glowAt(c, tx, ty, 12 * AS, '#ffffff', 0.7 * k); }
    } });
  }
  // a vial of one colour streaking down out of the flask's light and popping on the floor
  function alemOpusDrop(x, y, col, delay) {
    const AS = ALEM_ULT_SCALE;
    V.fx({ dur: 0.3, delay, layer: 'air', draw: (c, p, t, e) => { const z = 240 * AS * (1 - p * p); V.neonPath(c, col, 3 * AS, e.a, () => { c.moveTo(x, y - z - 40 * AS); c.lineTo(x, y - z); });
      c.save(); c.globalAlpha = e.a; c.fillStyle = col; c.strokeStyle = '#1a1a1a'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - z, 3.5 * AS, 4.5 * AS, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, y - z, 10 * AS, '#ffffff', e.a); },
      done: () => { V.spawn({ x, y, z: 4, life: 0.35, size: 30 * AS, size1: 6, color: col }); V.sparks(x, y, { color: col, n: 3, speed: 160, z: 2 }); } });
  }
  // wind-up: the flask hovers in over the party in a brass hex circle; impact: beams of green, red and blue onto every
  // ally and vials raining across the circle; aftermath: the multicolour seal. Its orb on the boss is KIT_VFX['alem-opus'].
  ABILITY_VFX.alembist.magnumopus = c => {
    const at = alemOpusCentre(c.ent);
    if (c.cam) c.cam.dim(0.3, 1.3);
    const AS = ALEM_ULT_SCALE;
    alemOpusFlask(at, { dur: LAND + 1.1, hold: LAND + 0.45 });
    alemOpusSeal(at.x, at.y, 120 * AS, LAND + 0.2, { mono: true, peak: 0.95, settle: 0.95, spin: 1.2, w: 1.3 });
    OPUS3.forEach(col => V.charge(at.x, at.y, { color: col, r: 80 * AS, n: 4, dur: LAND, z: OPUS_H }));
    V.ribbons(at.x, at.y, { r: 70 * AS, dur: LAND + 0.3, colors: OPUS3 });
    V.swirl(c.x, c.y, { r: 46, color: AMBER, dur: LAND, follow: c.ent, inward: true, arms: 3 });
    c.later(LAND, () => {
      impact(c.cam, '#eafff4', 0.2);
      shake(5);
      const tip = { x: at.x, y: at.y - OPUS_TIP };
      V.flash(tip.x, tip.y - 20 * AS, 70 * AS, TEAL, 0.2);
      // every ally gets a thick beam of one colour and a thinner one of the next (green, red, blue round the party)
      alemOpusParty(c.ent).forEach((w, i) => {
        const col = OPUS3[i % 3];
        alemOpusBeam(tip, w, col, i * 0.05);
        alemOpusBeam({ x: tip.x + (i % 2 ? 8 : -8) * AS, y: tip.y }, { x: w.x + (i % 2 ? -10 : 10), y: w.y + 4 }, OPUS3[(i + 1) % 3], i * 0.05 + 0.1);
        c.later(i * 0.05 + 0.08, () => { V.plus(w.x, w.y, { color: col, n: 3 }); V.shock(w.x, w.y, { r: 46 * AS, color: col, dur: 0.4, w: 4 }); });
      });
      for (let i = 0; i < 12; i++) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * 140 * AS; alemOpusDrop(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.7, OPUS3[i % 3], 0.04 + i * 0.035); }
      V.shock(at.x, at.y, { r: 170 * AS, color: BRASS, dur: 0.6, w: 7 });
      c.later(0.5, () => V.burst(at.x, at.y, { color: TEAL, color2: '#ffffff', n: 10, speed: 160, z: OPUS_TIP, kind: 'star', flash: false }));
      alemOpusSeal(at.x, at.y, 150 * AS, 10, { peak: 0.95, settle: 0.22, w: 1.2 });   // (QA) settled lower: its lines crossed telegraphs for 10s
    });
  };
  // the flask hurls its orb at the boss: it bursts in red, green and blue (layered spikebursts), sparks of every vial
  // poured in (d.p: their recipes), three coloured rings and a small scorch that cools quickly
  KIT_VFX['alem-opus'] = Object.assign((e, target, d) => {
    const t = target || e, ps = d && Array.isArray(d.p) ? d.p.slice(0, 5) : [], at = alemOpusCentre(e);
    const cols = ps.length ? ps.map(r => (typeof alemInfo !== 'undefined' ? alemInfo(r).color : AMBER)) : OPUS3;
    const AS = ALEM_ULT_SCALE;
    V.missile(at.x, at.y - OPUS_TIP, t.x, t.y, { style: 'orb', color: TEAL, speed: 1500, size: 1.6 * AS, arc: 30, onHit: (x, y) => {
      V.flash(x, y - 20, 90 * AS, '#ffffff', 0.16);
      V.spikeburst(x, y, { r: 92 * AS, n: 18, color: OPUS3[1], core: '#fff6d8', ink: '#3a0a08', dur: 0.5 });
      V.spikeburst(x, y, { r: 62 * AS, n: 14, color: OPUS3[0], core: '#ffffff', ink: '#0a2a10', dur: 0.45, z: 20 });
      V.spikeburst(x, y, { r: 38 * AS, n: 12, color: OPUS3[2], core: '#ffffff', ink: '#0a1a3a', dur: 0.4, z: 26 });
      V.fx({ dur: 0.45, layer: 'air', draw: (c, p, tt, ee) => { const k = ee.a * (1 - p); OPUS3.forEach((col, i) => V.glowAt(c, x + Math.cos(i * 2.1 + p * 3) * 18 * AS, y - 30 + Math.sin(i * 2.1 + p * 3) * 10 * AS, 46 * AS, col, 0.7 * k)); } });
      cols.forEach(col => V.burst(x, y, { color: col, n: 5, speed: 340, flash: false }));
      OPUS3.forEach((col, i) => V.shock(x, y, { r: (120 + i * 30) * AS, color: col, dur: 0.55, w: 7 - i, delay: i * 0.06 }));
      V.crater(x, y, { r: 50 * AS, color: '#ff8a3a', dur: 2.5, flames: 2, a: 0.35 });
      V.smoke(x, y, { n: 5, r: 40, color: '#5a4a3a', size: 30, a: 0.4, speed: 50, life: 1.4 });
      shake(5);
    } });
  }, { atTarget: true });

  // ---------------------------------------------------------------- Threadweaver · Grand Loom (crimson and gold threads)
  // After the painted sheet (docs/art/vfx-reference/threadweaver.png): five spear-tip anchors stab up round the party
  // and crimson threads draw a taut pentagram between them, tied to every ally (wind-up); the web flares white and two
  // bright lances cross through the boss (impact, KIT_VFX['weave-loom']); a woven diamond sigil of crimson and gold
  // stays on the floor, low, for the Tapestry's 6s (aftermath; THREADWEAVER_VFX, from the class block).
  const CRIM = '#e8203a', ROSE = '#ff5a6a', SEAM = '#ffcf7a', HOT = '#fff0ea', SILK = '#ffe0e4';
  // WEAVE_ULT_SCALE: the whole Ultimate's size (web, anchors, lances, seal). 1 = the first painted pass.
  const WEAVE_ULT_SCALE = 1.3;
  // the party as live entities (Stagecraft's view of the raid; capped), else just the weaver
  function weaveParty(ent) {
    const sc = typeof Stagecraft !== 'undefined' && Stagecraft.S ? Stagecraft.S.env : null, out = [];
    if (sc && !sc.town && Array.isArray(sc.units) && sc.entById) for (const u of sc.units) { const w = sc.entById(u.id) || u; if (w && Number.isFinite(w.x)) out.push(w); if (out.length >= 8) break; }
    return out.length ? out : [ent];
  }
  // the web's frame: the party's middle (near the weaver) and five anchors round it, wide enough to take everyone in
  function weaveLoomFrame(ent) {
    const ps = weaveParty(ent); let x = 0, y = 0;
    for (const w of ps) { x += w.x; y += w.y; }
    x /= ps.length; y /= ps.length;
    const dx = x - ent.x, dy = y - ent.y, dd = Math.hypot(dx, dy), m = dd > 200 ? 200 / dd : 1;
    x = ent.x + dx * m; y = ent.y + dy * m;
    const WS = WEAVE_ULT_SCALE;
    let R = 120 * WS; for (const w of ps) R = Math.max(R, Math.hypot(w.x - x, (w.y - y) / 0.78) + 50 * WS);
    R = Math.min(R, 200 * WS);
    const anchors = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + i * TAU / 5; return { x: x + Math.cos(a) * R, y: y + Math.sin(a) * R * 0.78 }; });
    return { x, y, R, ps, anchors };
  }
  // the web on the floor: a pentagram between the anchors, a gold pentagon round them and a thread from every ally to
  // the two anchors nearest them; drawn out through the wind-up, growing tauter, flaring white at the impact
  // (painted sheet: bold doubled crimson threads with a gold core, slack at first and pulled taut through the wind-up,
  // spokes from the middle, a dark red ground under the star for the wind-up only; at the impact every line flares
  // white-hot and wide for a moment, glowing at the anchors, then cools)
  function weaveLoomWeb(F, dur) {
    const A = F.anchors, WS = WEAVE_ULT_SCALE, C = { x: F.x, y: F.y };
    const star = A.map((a, i) => [a, A[(i + 2) % 5]]), rim = A.map((a, i) => [a, A[(i + 1) % 5]]), spokes = A.map(a => [C, a]);
    const links = [];
    for (const u of F.ps) { const near = A.map(a => [Math.hypot(a.x - u.x, a.y - u.y), a]).sort((m, n) => m[0] - n[0]); links.push([u, near[0][1]], [u, near[1][1]]); }
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const grow = easeOut(Math.min(1, t / (LAND * 0.6))), tight = easeOut(Math.max(0, Math.min(1, (t - 0.1) / (LAND - 0.12))));
      const hot = Math.max(0, Math.min(1, (t - LAND + 0.06) / 0.08)), flare = hot * (1 - Math.max(0, Math.min(1, (t - LAND) / 0.35)));
      const k = e.a * Math.min(1, t / 0.08) * Math.min(1, (dur - t) / 0.3);
      const sag = 18 * WS * (1 - tight) + Math.sin(t * 50) * 1.2 * tight * (1 - hot);   // slack, then trembling taut
      const trace = (segs, off) => () => { for (const [a, b] of segs) {
        const bx = a.x + (b.x - a.x) * grow, by = a.y + (b.y - a.y) * grow, L = Math.hypot(bx - a.x, by - a.y) || 1, nx = -(by - a.y) / L, ny = (bx - a.x) / L;
        c.moveTo(a.x + nx * off, a.y + ny * off); c.quadraticCurveTo((a.x + bx) / 2 + nx * (off + 2 * sag), (a.y + by) / 2 + ny * (off + 2 * sag), bx + nx * off, by + ny * off); } };
      // (QA) the web flares rose-hot, not white: a white star the size of the room whited the whole frame out
      const w = (2.2 + 1.4 * tight) * WS, col = hot > 0.5 ? '#ff9aac' : CRIM;
      if (t < LAND + 0.25) { c.save(); c.globalAlpha = 0.16 * k * grow * Math.min(1, (LAND + 0.25 - t) / 0.2); c.fillStyle = '#5a0a18'; c.beginPath(); A.forEach((a, i) => (i ? c.lineTo(a.x, a.y) : c.moveTo(a.x, a.y))); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1; }
      V.neonPath(c, ROSE, w * 0.35, k * 0.55, trace(spokes, 0));
      V.neonPath(c, SEAM, w * 0.6 + 2 * WS * flare, k * 0.85, trace(rim, 0));
      V.neonPath(c, CRIM, w * 0.4, k * 0.6, trace(rim, -4 * WS));
      V.neonPath(c, col, w + 2 * WS * flare, k, trace(star, 0));   // (QA) flare halved: the web whited out the frame
      V.neonPath(c, CRIM, w * 0.45, k * 0.8, trace(star, 4.5 * WS));
      V.neonPath(c, SEAM, 1.1 * WS, k * (1 - hot * 0.5), trace(star, 0));
      V.neonPath(c, col, w * 0.5, k * 0.8, trace(links, 0));
      if (flare > 0.01) for (const a of A) { V.glowAt(c, a.x, a.y, 28 * WS, HOT, 0.8 * flare * k); V.glowAt(c, a.x, a.y, 50 * WS, CRIM, 0.6 * flare * k); }
    } });
  }
  // the anchors: a crimson spear tip on a thread shaft standing at each point of the web
  function weaveLoomSpears(F, dur) {
    const WS = WEAVE_ULT_SCALE;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      // each spear stabs down out of the air into its anchor point (staggered), then stands glowing
      const k = e.a * Math.min(1, (dur - t) / 0.25), hot = t > LAND - 0.05, H = 46 * WS, TL = 24 * WS, TW = 7 * WS;
      F.anchors.forEach((a, i) => {
        const q = easeOut(Math.max(0, Math.min(1, (t - i * 0.03) / 0.14))); if (q <= 0) return;
        const drop = (1 - q) * 60 * WS, top = a.y - H - drop, base = a.y - drop * 0.3;
        V.neonRing(c, a.x, a.y, 15 * WS * q, CRIM, 1.6, k * 0.8, 0.5); V.neonRing(c, a.x, a.y, 9 * WS * q, SEAM, 1, k * 0.6, 0.5);
        V.glowAt(c, a.x, top - TL * 0.4, 28 * WS, CRIM, 0.8 * k); V.glowAt(c, a.x, a.y, 20 * WS, ROSE, 0.5 * k * q);
        V.neonPath(c, CRIM, 2.4 * WS, k, () => { c.moveTo(a.x, base); c.lineTo(a.x, top); });
        c.save(); c.globalAlpha = k; c.fillStyle = hot ? HOT : ROSE; c.strokeStyle = '#3a0610'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(a.x, top - TL); c.lineTo(a.x + TW, top - TL * 0.2); c.lineTo(a.x + TW * 0.35, top - TL * 0.1); c.lineTo(a.x, top + 4); c.lineTo(a.x - TW * 0.35, top - TL * 0.1); c.lineTo(a.x - TW, top - TL * 0.2); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = SEAM; c.lineWidth = 1.2; c.beginPath(); c.moveTo(a.x, top - TL + 3); c.lineTo(a.x, top); c.stroke(); c.restore();
        V.glowAt(c, a.x, top - TL * 0.5, 12 * WS, hot ? '#ffffff' : HOT, 0.8 * k);
      });
    } });
  }
  const weaveMe = ent => (ent && ent.kind === 'player' ? (typeof Net !== 'undefined' ? Net.id : 0) : ent && ent.id);
  // this weaver's threads as pairs of entities (the host's list, drawn by stagecraft.js); none outside a raid
  function weaveMine(ent) {
    if (typeof Stagecraft === 'undefined' || !Stagecraft.S || !Stagecraft.S.env) return [];
    const id = weaveMe(ent), env = Stagecraft.S.env, out = [];
    for (const th of Stagecraft.S.threads || []) {
      if (th[2] !== id) continue;
      const A = env.entById(th[0]), B = env.entById(th[1]);
      if (A && B) out.push([A, B]);
    }
    return out;
  }
  // every thread pulled taut and burning: a bright line growing hotter through the wind-up, flaring white at the end
  function weaveTaut(pairs, o = {}) {
    const dur = o.dur ?? LAND;
    for (const [A, B] of pairs) V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (0.4 + 0.6 * p), w = 1.5 + 2.5 * p * p;
      V.neonPath(c, p > 0.85 ? HOT : SILK, w, k, () => { c.moveTo(A.x, A.y - 16); c.lineTo(B.x, B.y - 16); });
      const q = (t * 3) % 1; V.glowAt(c, A.x + (B.x - A.x) * q, A.y - 16 + (B.y - A.y) * q, 8, SEAM, k);
    } });
  }
  // wind-up: the anchors and the web drawn out round the party, her own threads (the host's list) pulled taut; impact:
  // the web and her threads flare white, sparks off the anchors; aftermath: the woven diamond seal. The lances through
  // the boss are KIT_VFX['weave-loom'].
  ABILITY_VFX.threadweaver.grandloom = c => {
    const F = weaveLoomFrame(c.ent), W = globalThis.THREADWEAVER_VFX;
    if (c.cam) c.cam.dim(0.3, 1.3);
    const WS = WEAVE_ULT_SCALE;
    V.charge(c.x, c.y, { color: ROSE, r: 60 * WS, n: 10, dur: LAND, follow: c.ent });
    weaveLoomWeb(F, LAND + 0.55);
    weaveLoomSpears(F, LAND + 0.5);
    weaveTaut(weaveMine(c.ent), { dur: LAND });
    c.later(LAND, () => {
      impact(c.cam, '#ffd0d8', 0.13);   // (QA) softer flash: the web already flares
      shake(5);
      for (const [A, B] of weaveMine(c.ent)) {
        V.fx({ dur: 0.45, layer: 'air', draw: (cc, p, t, e) => { const k = (1 - p) * e.a; V.neonPath(cc, '#ff9aac', 4 * WS * (1 - p * 0.6), k, () => { cc.moveTo(A.x, A.y - 16); cc.lineTo(B.x, B.y - 16); }); } });
        for (const w of [A, B]) V.burst(w.x, w.y - 16, { color: ROSE, color2: SEAM, n: 6, speed: 200, kind: 'star', flash: false });
      }
      F.anchors.forEach((a, i) => { V.sparks(a.x, a.y, { color: i % 2 ? SEAM : ROSE, n: 7, speed: 300, z: 30 });
        V.spikeburst(a.x, a.y - 30 * WS, { r: 30 * WS, n: 8, color: CRIM, core: HOT, ink: '#2a0410', dur: 0.3 }); });
      for (const w of F.ps) V.plus(w.x, w.y, { color: '#ffb0bc', n: 2 });
      V.shock(F.x, F.y, { r: F.R + 40 * WS, color: CRIM, dur: 0.55, w: 7 });
      if (W) W.diamond(F.x, F.y, F.R * 0.95, 6, { peak: 0.95, settle: 0.26, w: 1.5 });
    });
  };
  // one strike per thread (d.n, at least one) runs from her to the boss on its own arc, then two bright lances cross
  // through the boss with a crimson star where they meet
  KIT_VFX['weave-loom'] = Object.assign((e, target, d) => {
    const t = target || e, n = Math.max(1, Math.min(5, Number(d && d.n) || 1)), W = globalThis.THREADWEAVER_VFX;
    for (let i = 0; i < n; i++) weaveLater(e, i * 0.05, () => V.missile(e.x, e.y, t.x, t.y, { style: 'blade', color: i % 2 ? SEAM : ROSE, speed: 1300, size: 0.9, arc: 20 + i * 28, onHit: (x, y) => V.hit(x, y, ROSE, 0.6) }));
    weaveLater(e, 0.3, () => {
      const WS = WEAVE_ULT_SCALE;
      if (W) W.cross(t.x, t.y, { L: (150 + n * 20) * WS, w: 1.4 * WS, dur: 0.6 });
      V.spikeburst(t.x, t.y, { r: (60 + n * 6) * WS, n: 14, color: CRIM, core: HOT, ink: '#2a0410', dur: 0.4, z: 16 });
      V.shock(t.x, t.y, { r: 140 * WS, color: SEAM, dur: 0.5, w: 6 });
      shake(4);
    });
  }, { atTarget: true });
  // (a KIT_VFX moment has no c.later: FX.later keeps it on the effects clock, at the strength main.js plays it at:
  // your own at full, anyone else's at 0.6)
  function weaveLater(e, d, fn) { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); }
})();

// (Chronomancer's Paradox and Stasis hold / release moments are in its block of 'ULTIMATES · healers')
// Tanks (round 2): the moments one button leaves for another. A tankbuster turned aside (Bastion), War Cry's Drain
// spilling to the party (Bloodreaver), a reflected buster carving a Rune and a sanctified Ward (Runeguard), Crisp
// Flowing Palms breathing and Iron Ox throwing the boss off balance (Ironpalm)
Object.assign(KIT_VFX, {
  // (QA: it read as nothing) the blade flares gold along its edge, a ring of gold at the feet, then the motes
  turnedEdge: e => { const a = e.angle || 0, bx = e.x + Math.cos(a) * 20, by = e.y + Math.sin(a) * 12;
    VFX.glint(bx, by, { color: '#fff3c0', size: 40, z: 30 }); VFX.flash(bx, by - 30, 30, '#ffd65a', 0.2); VFX.shock(e.x, e.y, { r: 56, color: '#ffd65a', dur: 0.4, w: 4 });
    VFX.sparks(bx, by, { color: '#ffe9a0', n: 6, angle: a, spread: 0.9, speed: 240 }); VFX.motes(e.x, e.y, { color: '#ffe08a', n: 8, r: 26, kind: 'star' }); },
  warcryDrain: e => { VFX.shock(e.x, e.y, { r: 150, color: '#ff6a6a', w: 4, dur: 0.5 }); VFX.plus(e.x, e.y, { color: '#ff9a9a', n: 5 }); },
  mirrorRune: e => { VFX.sigil(e.x, e.y, { r: 34, style: 'runes', color: '#d8deff', dur: 0.6, spin: 6, follow: e }); VFX.motes(e.x, e.y, { color: '#b8c0ff', n: 6, r: 22 }); },
  sanctWard: e => { VFX.sigil(e.x, e.y, { r: 44, style: 'clock', color: '#7c84ff', dur: 0.7, spin: 2, follow: e }); },
  sanctBlast: e => { VFX.shock(e.x, e.y, { r: 160, color: '#b8c0ff', w: 5, dur: 0.6 }); VFX.plus(e.x, e.y, { color: '#d8deff', n: 5 }); },
  // (QA: the pale swirl was invisible on sand) a gold breath drawn in, a soft ring and a glint at the chest
  flowBreath: e => { VFX.swirl(e.x, e.y, { r: 36, color: '#ffd27a', dur: 0.45, follow: e, inward: true }); VFX.shock(e.x, e.y, { r: 44, r0: 10, color: '#ffe08a', dur: 0.35, w: 3 }); VFX.glint(e.x, e.y, { color: '#fff2c0', size: 24, z: 24 }); },
  oxStagger: Object.assign((e, target) => { const t = target || e; VFX.shock(t.x, t.y, { r: 80, color: '#e0b070', w: 5, dur: 0.4 }); VFX.sparks(t.x, t.y, { color: '#ffe0a0', n: 8 }); }, { atTarget: true }),
});

// ======================================================================= Gloomsworn (tank, class 18): the Undying Vigil
// A black greatsword (the duskblade) and a cold teal-white light kept inside a body of cracked shadow. Colours: ink-black
// and bruised violet for the dark, a pale ghost-teal for the light that leaks out of it. The three Rend swings grow (a
// short cut, a backhand, a wide heavy sweep that leaves a long dark trail and a floor-crack); Gloom Strike is an overhead
// smash with a ghost blade left in the air behind it; Shade Step leaves a ghost standing where the knight was; Black Pall
// a bell of shadow rising over the party; Black Mantle a flowing cloak of dark; Last Rite a ring that collapses into the
// knight and a barrier that shimmers; Eclipse of the Vigil a black sun over the knight and shells bursting on the party.
// Hollow (CLASS_FEV.hollow, for everyone): cracks of light in the body, a ghostly double, a crown of shards and a ring on
// the floor that counts the seconds (the Hollow, then the grace: amber). Floor marks stay faint so a telegraph reads.
(() => {
  const V = VFX, TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s), OP = OLD_PAINT;
  const INK = '#0a0612', DEEP = '#2a1450', VIO = '#6a3aba', BRU = '#8a5ad8', LIL = '#c4a4ff', GHO = '#bff8ee', GHD = '#5fd8c8', WARN = '#ffb06a';
  const hs = (i, j, s = 0) => { const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return x - Math.floor(x); };
  // where a blow lands: toward the target, no further than d
  const reach = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x), r = Math.min(d, Math.hypot(c.tx - c.x, c.ty - c.y)); return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, a }; };
  // FX.later that keeps the strength the moment was played at (your own 1, anyone else's 0.6)
  const later = (e, d, fn) => { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); };
  const party = () => (typeof FX.party === 'function' ? FX.party() : [FX.me]).filter(w => w && w.x != null);
  const bodyY = e => e.y - 14 - (e.lift || 0);

  // ---- pieces
  // a heavy crescent swing round (x, y) facing ang: an ink-black body, a violet core and a pale rim on its leading edge. `tail`
  // (0-1) is how late its trailing end lets go: the bigger it is, the longer the dark trail hangs behind the blade
  function duskSwing(x, y, ang, o = {}) {
    const r = o.r ?? 64, span = o.span ?? 2, W = o.w ?? 16, dur = o.dur ?? 0.32, fl = o.flip ? -1 : 1, z = o.z ?? 14, tail = o.tail ?? 0.2, rim = o.rim || GHO;
    const shape = (c, a0, a1, R, Wd) => { c.beginPath();
      for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; c.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
      for (let i = 16; i >= 0; i--) { const q = i / 16, a = a0 + (a1 - a0) * q, th = Wd * Math.pow(q, 0.7) * Math.min(1, (1 - q) * 6 + 0.35); c.lineTo(Math.cos(a) * (R - th), Math.sin(a) * (R - th)); }
      c.closePath(); c.fill(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const sw = easeOut(Math.min(1, p / 0.36)), k = e.a * (1 - Math.max(0, (p - 0.45) / 0.55));
      const lead = -span / 2 + span * sw, back = -span / 2 + span * Math.max(0, (p - tail) / (1 - tail)) * 0.92;
      if (lead - back < 0.03 || k < 0.02) return;
      c.save(); c.translate(x, y - z); c.scale(1, 0.8); c.rotate(ang); c.scale(1, fl);
      c.globalAlpha = 0.82 * k; c.fillStyle = INK; shape(c, back, lead, r * 1.04, W * 1.25);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.5 * k; c.fillStyle = BRU; shape(c, back + (lead - back) * 0.35, lead, r, W * 0.55);
      c.globalAlpha = 0.95 * k; c.fillStyle = rim; shape(c, back + (lead - back) * 0.72, lead, r * 0.995, W * 0.16);
      c.restore();
      if (sw < 1) { const a = ang + fl * lead; V.glowAt(c, x + Math.cos(a) * r, y - z + Math.sin(a) * r * 0.8, 9 + W * 0.5, rim, 0.75 * k); }
    } });
  }
  // a quick diagonal cut mark on the target: a black lens with a pale core, gone in a third of a second
  function cutMark(x, y, ang, len, o = {}) {
    const dur = o.dur ?? 0.34, col = o.color || GHO;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const go = easeOut(Math.min(1, p / 0.22)), k = e.a * (1 - Math.max(0, (p - 0.3) / 0.7)), L = len * go, w = (o.w ?? 7) * (1 - p * 0.4);
      if (L < 3 || k < 0.02) return;
      c.save(); c.translate(x, y - 16); c.rotate(ang);
      const lens = (l0, l1, ww) => { c.beginPath(); c.moveTo(l0, 0); c.quadraticCurveTo((l0 + l1) / 2, -ww, l1, 0); c.quadraticCurveTo((l0 + l1) / 2, ww, l0, 0); c.fill(); };
      c.globalAlpha = 0.85 * k; c.fillStyle = INK; lens(-L / 2, L / 2, w * 1.3);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k; c.fillStyle = col; lens(-L / 2 * 0.9, L / 2 * 0.9, w * 0.45);
      c.restore();
    } });
  }
  // the duskblade seen from the side: pivot (px, py), pointing th, L long. ghost = a pale afterimage of it, not the iron
  function duskblade(c, px, py, th, L, k, ghost) {
    c.save(); c.translate(px, py); c.rotate(th);
    c.beginPath(); c.moveTo(11, -5); c.lineTo(L - 14, -6.5); c.lineTo(L, 0); c.lineTo(L - 14, 6.5); c.lineTo(11, 5); c.closePath();
    if (ghost) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.28 * k; c.fillStyle = GHD; c.fill(); c.globalAlpha = 0.9 * k; c.strokeStyle = GHO; c.lineWidth = 1.6; c.stroke(); }
    else {
      c.globalAlpha = k; c.fillStyle = '#171126'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#0a0612'; c.stroke();
      c.fillStyle = '#0a0612'; c.fillRect(-9, -2, 18, 4); c.fillStyle = DEEP; c.fillRect(6, -9, 5, 18);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8 * k; c.strokeStyle = BRU; c.lineWidth = 1.2; c.beginPath(); c.moveTo(13, -5); c.lineTo(L - 14, -6.5); c.lineTo(L - 2, 0); c.stroke();
      c.globalAlpha = k; c.strokeStyle = GHO; c.lineWidth = 1.6; c.beginPath(); c.moveTo(15, 0); c.lineTo(L - 8, 0); c.stroke();
    }
    c.restore();
  }
  // a hooded top-down figure (facing +x) with a ragged tail and a greatsword: the knight's ghost
  function ghostFigure(c, x, y, ang, a, col = GHD, t = 0, s = 1) {
    if (a < 0.02) return;
    c.save(); c.translate(x, y); c.scale(s, s * 0.8); c.rotate(ang); c.globalCompositeOperation = 'lighter';
    c.fillStyle = col; c.globalAlpha = 0.34 * a;
    c.beginPath(); c.moveTo(-2, -11);
    for (const [px, py] of [[-14, -9], [-22, -12], [-26, -5], [-33, -2], [-27, 1], [-34, 5], [-26, 8], [-21, 12], [-12, 10], [-2, 11]]) c.lineTo(px + Math.sin(t * 4 + py) * 1.5, py);
    c.closePath(); c.fill();
    c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill();
    c.globalAlpha = 0.75 * a; c.strokeStyle = GHO; c.lineWidth = 1.4; c.beginPath(); c.arc(1, 0, 7, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(6, 11); c.lineTo(40, 9); c.stroke();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.9 * a; c.beginPath(); c.arc(6.5, -1.8, 1.1, 0, TAU); c.arc(6.5, 1.8, 1.1, 0, TAU); c.fill();
    c.restore();
  }
  // cracks of pale light across the body at (cx, cy): `grow` (0-1) how far they have opened, seed picks the pattern
  function cracks(c, cx, cy, k, grow, seed = 0, size = 1) {
    if (k < 0.02 || grow <= 0) return;
    for (let i = 0; i < 6; i++) {
      const a0 = i * TAU / 6 + hs(i, 1, seed) * 0.6, r0 = 3 + hs(i, 2, seed) * 5, len = (12 + hs(i, 3, seed) * 14) * size * grow;
      V.neonPath(c, GHO, 1.3, k, () => {
        let x = cx + Math.cos(a0) * r0, y = cy + Math.sin(a0) * r0 * 0.8; c.moveTo(x, y);
        for (let j = 1; j <= 3; j++) { const aa = a0 + (hs(i, 4 + j, seed) - 0.5) * 1.2; x += Math.cos(aa) * len / 3; y += Math.sin(aa) * len / 3 * 0.8; c.lineTo(x, y); }
      });
    }
  }
  // a shell of pale light round an ally: the barrier (Eclipse of the Vigil, Last Rite)
  function shell(w, dur, r = 26) {
    OP.linger(dur, 'air', (c, k, t) => {
      const x = w.x, y = bodyY(w), pop = easeOut(Math.min(1, t / 0.2)), R = r * (0.7 + 0.3 * pop), sh = 0.55 + 0.45 * Math.sin(t * 2.4);
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, R * 0.3, x, y, R); g.addColorStop(0, 'rgba(95,216,200,0)'); g.addColorStop(1, `rgba(191,248,238,${0.2 * k})`);
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, R, R * 1.15, 0, 0, TAU); c.fill(); c.restore();
      V.neonPath(c, GHO, 1.4, k * 0.8, () => c.ellipse(x, y, R, R * 1.15, 0, 0, TAU));
      const a = t * 1.4; V.glowAt(c, x + Math.cos(a) * R, y + Math.sin(a) * R * 1.15, 6, '#ffffff', 0.7 * k * sh);
      V.neonPath(c, GHD, 1, k * 0.6 * sh, () => { c.ellipse(x, y, R * 0.86, R, 0, 3.6 + t, 4.6 + t); });
    }, { peak: 1, settle: 0.34, hold: 0.5 });
  }
  const darkSmoke = (x, y, n = 3, r = 20) => V.smoke(x, y, { n, r, color: '#1c1230', size: 22, a: 0.55, speed: 45, life: 0.9 });
  const gloomStep = c => { const e = c.ent, s = e.gloomBlade || (e.gloomBlade = { n: -1, at: -99 }); s.n = c.step != null ? c.step % 3 : FX.now - s.at > 15 ? 0 : (s.n + 1) % 3; s.at = FX.now; return s.n; };
  // the Gloom you hold (your own hero only: the kit's gauge); 0 for anyone else's
  const gloomHeld = c => { const g = typeof window !== 'undefined' && window.__game, k = c.mine && g && g.actor && g.actor.kit; return k && k.g ? k.g.gloom || 0 : 0; };
  const stop = (e, s) => { if (e && e.st && typeof hitStop === 'function') hitStop(e.st, s, FX.now); };
  // a ring of ink spikes on the floor with pale light in the cracks: the dark breaking up out of the ground under a blow
  const gloomQuake = (x, y, r, n = 14, dur = 0.38) => V.spikeburst(x, y, { r, n, hole: 0.45, color: VIO, core: GHO, ink: INK, fill: '#1c1230', dur, layer: 'ground', z: 0, flat: 0.6 });

  ABILITY_VFX.gloomsworn = {
    // Rend / Sunder / Gloaming: three distinct swings, each heavier and with a longer trail of dark
    rend: c => {
      const n = gloomStep(c), a = Math.atan2(c.ty - c.y, c.tx - c.x), p = reach(c, 52 + n * 10), e = c.ent;
      const S = [{ r: 58, span: 1.9, w: 14, tail: 0.16, dur: 0.28 }, { r: 66, span: 2.4, w: 20, tail: 0.3, dur: 0.34, flip: true }, { r: 82, span: 2.8, w: 32, tail: 0.52, dur: 0.62 }][n];
      duskSwing(c.x, c.y, a, S);
      if (n === 1) c.later(0.02, () => duskSwing(c.x, c.y, a + 0.25, { r: 52, span: 1.6, w: 9, tail: 0.3, dur: 0.3, rim: BRU }));
      c.later(0.08 + n * 0.02, () => {
        V.hit(p.x, p.y, n === 2 ? LIL : BRU, 0.5 + n * 0.3);
        V.sparks(p.x, p.y, { color: n === 2 ? GHO : LIL, n: 3 + n * 3, angle: p.a, spread: 0.8, speed: 220 + n * 90 });
        cutMark(p.x, p.y, a + (n === 1 ? -0.9 : 0.9), 34 + n * 14, { w: 5 + n * 2 });
        if (n >= 1) darkSmoke(p.x, p.y, 2 + n, 16);
        // the dark the blow shakes loose runs back into the knight: it is the Gloom filling, so it goes pale once a Strike is ready
        V.stream(p.x, p.y, e, { color: gloomHeld(c) >= 40 ? GHO : BRU, n: 2 + n });
        if (n === 2) {
          // Gloaming: the third cut crosses the second, an X of dark, and the ground breaks under it
          cutMark(p.x, p.y, a - 0.9, 62, { w: 8, color: LIL });
          V.spikeburst(p.x, p.y, { r: 50, n: 14, color: VIO, core: GHO, ink: INK, dur: 0.34 });
          gloomQuake(p.x, p.y, 78, 12, 0.34);
          V.shock(p.x, p.y, { r: 90, color: BRU, dur: 0.4, w: 5 });
          V.decal(p.x, p.y, { style: 'crack', r: 44, dur: 2.2, a: 0.4, seed: Math.random() * 6 });
          shake(4); stop(e, 0.08);
        } else { shake(n + 0.5); stop(e, 0.03 + 0.02 * n); }
      });
    },
    // Gloom Strike: the blade rises behind the shoulder and comes down on the target; a ghost of it hangs in the air after
    strike: c => {
      const e = c.ent, p = reach(c, 58), a = p.a, face = Math.cos(a) >= 0 ? 1 : -1, hx = c.x, hy = c.y - 30, tx = p.x, ty = p.y - 8;
      const thEnd = Math.atan2(ty - hy, (tx - hx) * face), thStart = -Math.PI / 2 - 0.6, LEN = 74, DUR = 0.75;
      V.glint(c.x, c.y - 44, { color: GHO, size: 24, z: 40 });
      // the spent Gloom drawn up into the blade as it rises (it is what the blow is made of)
      V.charge(c.x, c.y - 30, { color: LIL, r: 48, n: 8, dur: 0.18, follow: e });
      V.fx({ dur: DUR, layer: 'air', draw: (cx, pr, t, fx) => {
        const up = easeOut(Math.min(1, pr / 0.22)), sw = pr < 0.22 ? 0 : Math.pow(Math.min(1, (pr - 0.22) / 0.16), 2), th = thStart - 0.18 * up * (1 - sw) + (thEnd - thStart + 0.18) * sw;
        const k = fx.a * Math.min(1, pr / 0.06) * (pr < 0.55 ? 1 : Math.max(0, 1 - (pr - 0.55) / 0.2)), ghost = fx.a * (pr < 0.38 ? 0 : Math.max(0, 1 - (pr - 0.38) / 0.62));
        cx.save(); cx.translate(hx, hy); cx.scale(face, 1);
        if (k > 0.02) {
          if (pr > 0.22 && pr < 0.4) for (let i = 1; i <= 4; i++) { const tq = Math.max(0, sw - i * 0.17), tt = thStart - 0.18 * (1 - tq) + (thEnd - thStart + 0.18) * tq; cx.save(); cx.globalCompositeOperation = 'lighter'; duskblade(cx, 0, 0, tt, LEN, k * 0.25 * (1 - i / 5), true); cx.restore(); }
          duskblade(cx, 0, 0, th, LEN, k, false);
        }
        if (ghost > 0.02) duskblade(cx, 0, 0, thEnd, LEN, ghost, true);   // the shadow echo: a pale blade left hanging
        cx.restore();
      } });
      c.later(0.22 * DUR + 0.16 * DUR, () => {
        V.flash(tx, ty - 12, 46, '#ffffff', 0.12);
        V.spikeburst(tx, ty, { r: 62, n: 16, color: VIO, core: GHO, ink: INK, dur: 0.38 });
        V.shock(tx, ty, { r: 120, color: BRU, dur: 0.5, w: 7 }); V.shock(tx, ty, { r: 80, color: GHO, dur: 0.4, w: 3, delay: 0.06 });
        V.decal(tx, ty, { style: 'crack', r: 60, dur: 3, a: 0.45, seed: Math.random() * 6 });
        V.debris(tx, ty, { n: 8, color: '#2a2036', speed: 1 });
        darkSmoke(tx, ty, 4, 24);
        // the blow cuts a black X into the target, a ring of ink spikes breaks out of the floor and a thin column of dark goes up
        cutMark(tx, ty, -0.7, 78, { w: 9, dur: 0.4 }); cutMark(tx, ty, 0.7, 78, { w: 9, dur: 0.4, color: LIL });
        gloomQuake(tx, ty, 112, 16, 0.4);
        V.pillar(tx, ty, { r: 20, h: 150, color: BRU, dur: 0.4 });
        if (c.cam) c.cam.punch(0.04, 0.35);
        shake(7); stop(e, 0.11);
      });
      // a faint shield of pale light settles round the knight (the barrier Gloom Strike gives)
      c.later(0.4, () => V.shield(e, { color: GHD, dur: 0.9, r: 30 }));
    },
    // Shade Step: smoke where it left, a ghost standing in the place it left, a quick cut where it arrived; for 4s a pale double
    // trails the knight (the echoes it is holding)
    shade: c => {
      const e = c.ent, p = reach(c, 40), a = p.a, gx = c.x, gy = c.y, ga = e.angle || 0;
      V.smoke(gx, gy, { n: 6, color: '#120a22', size: 26, a: 0.7, speed: 60, life: 0.8 });
      V.fx({ dur: 2.4, layer: 'air', draw: (cx, pr, t, fx) => { const k = fx.a * Math.min(1, t / 0.08) * Math.max(0, 1 - Math.max(0, t - 0.5) / 1.9); ghostFigure(cx, gx, gy - 12, ga, k * 0.85, GHD, t, 1 + 0.12 * t); } });
      // the step itself: a black streak from where the knight stood to where it lands, three pale after-images left along it
      if (Math.hypot(p.x - gx, p.y - gy) > 24) {
        OP.thrust(gx, gy, p.x, p.y, { w: 13, color: VIO, core: GHO, ink: INK, dur: 0.24, z: 16 });
        for (let i = 1; i <= 3; i++) {
          const q = i / 4, fx0 = gx + (p.x - gx) * q, fy0 = gy + (p.y - gy) * q;
          c.later(0.04 * i, () => V.fx({ dur: 0.34, layer: 'air', draw: (cx, pr, t, fx) => ghostFigure(cx, fx0, fy0 - 12, ga, fx.a * (1 - pr) * 0.8, GHD, t) }));
        }
      }
      c.later(0.06, () => {
        // the cut is a pair of crossing strokes: the knight's, and a pale one a breath behind it (the echo that is now held)
        cutMark(p.x, p.y, a + 0.8, 52, { w: 7 }); cutMark(p.x, p.y, a - 0.8, 44, { w: 5, color: LIL });
        V.hit(p.x, p.y, LIL, 0.7); darkSmoke(p.x, p.y, 3, 18); V.shock(p.x, p.y, { r: 56, color: BRU, dur: 0.3, w: 4 });
        V.sparks(p.x, p.y, { color: GHO, n: 5, angle: a, spread: 0.9, speed: 260 }); stop(e, 0.04);
      });
      OP.linger(4, 'air', (cx, k, t) => {
        const ang = e.angle || 0, off = 15 + Math.sin(t * 5) * 2;
        ghostFigure(cx, e.x - Math.cos(ang) * off, e.y - 12 - (e.lift || 0) - Math.sin(ang) * off * 0.6, ang, k * 0.55, GHD, t);
      }, { peak: 1, settle: 0.7, hold: 0.3 });
    },
    // Black Pall: a bell of shadow rises from the floor over the knight and the party near it, tolls, and stands faint
    pall: c => {
      const e = c.ent, R = 150;
      V.shock(c.x, c.y, { r: R, color: BRU, dur: 0.6, w: 8 }); V.shock(c.x, c.y, { r: R * 0.7, color: GHO, dur: 0.5, w: 3, delay: 0.1 });
      V.charge(c.x, c.y, { color: LIL, r: 70, n: 8, dur: 0.3, follow: e });
      // the bell is struck as it rises: a ring of ink spikes through the floor and a second ring a beat behind
      gloomQuake(c.x, c.y, 110, 16, 0.4); V.shock(c.x, c.y, { r: R * 1.1, color: GHD, dur: 0.6, w: 3, delay: 0.3 }); shake(3);
      OP.linger(6, 'air', (cx, k, t) => {
        const x = e.x, y = e.y + 4, rise = easeOut(Math.min(1, t / 0.55)), H = 96 * rise, toll = Math.max(0, 1 - (t % 3) / 0.5) * (t < 9 ? 1 : 0);
        // (ordinary compositing: the bell is dark, not a glow; a violet rim and a pale ring at its foot)
        cx.save();
        const g = cx.createLinearGradient(x, y - H, x, y); g.addColorStop(0, `rgba(30,14,60,${0.16 * k})`); g.addColorStop(1, `rgba(14,6,30,${0.42 * k})`);
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(x - R, y); cx.bezierCurveTo(x - R * 0.9, y - H * 0.3, x - R * 0.55, y - H, x, y - H); cx.bezierCurveTo(x + R * 0.55, y - H, x + R * 0.9, y - H * 0.3, x + R, y); cx.ellipse(x, y, R, R * 0.4, 0, 0, Math.PI, true); cx.fill();
        const rim = () => { cx.beginPath(); cx.moveTo(x - R, y); cx.bezierCurveTo(x - R * 0.9, y - H * 0.3, x - R * 0.55, y - H, x, y - H); cx.bezierCurveTo(x + R * 0.55, y - H, x + R * 0.9, y - H * 0.3, x + R, y); };
        cx.lineCap = 'round'; rim(); cx.globalAlpha = 0.7 * k; cx.strokeStyle = INK; cx.lineWidth = 5; cx.stroke(); rim(); cx.globalAlpha = 0.95 * k; cx.strokeStyle = BRU; cx.lineWidth = 2; cx.stroke();
        for (let i = -2; i <= 2; i++) { cx.beginPath(); cx.moveTo(x + i * R * 0.34, y + R * 0.4 * Math.sqrt(Math.max(0, 1 - (i * 0.34) ** 2))); cx.quadraticCurveTo(x + i * R * 0.22, y - H * 0.7, x + i * R * 0.05, y - H); cx.globalAlpha = 0.4 * k; cx.strokeStyle = VIO; cx.lineWidth = 1.2; cx.stroke(); }
        cx.beginPath(); cx.ellipse(x, y, R, R * 0.4, 0, 0, TAU); cx.globalAlpha = 0.55 * k; cx.strokeStyle = INK; cx.lineWidth = 4; cx.stroke(); cx.globalAlpha = 0.8 * k; cx.strokeStyle = GHD; cx.lineWidth = 1.4; cx.stroke();
        cx.restore();
        V.glowAt(cx, x, y - H, 12 + 18 * toll, GHO, 0.5 * k + 0.5 * toll * k);
        if (toll > 0.05) V.neonRing(cx, x, y, R * (1 - toll * 0.12), GHO, 2, toll * k * 0.6, 0.4);
      }, { peak: 1, settle: 0.32, hold: 0.8, tick: () => { if (Math.random() < 0.18) V.spawn({ x: e.x + rnd(-110, 110), y: e.y + rnd(-30, 40), z: 4, vz: rnd(18, 40), life: 1.1, size: rnd(4, 7), size1: 0, color: rnd(0, 1) < 0.5 ? LIL : GHD, kind: 'star' }); } });
    },
    // Vigil Ward (replaces Pall): a pale lantern of watch stands up at the knight and threads of its light run out to the party
    vigil: c => {
      const e = c.ent; e.gloomVigilAt = FX.now;
      V.lightfall(c.x, c.y, { color: GHO, r: 18, h: 220, dur: 0.6, feathers: 0 });
      V.shock(c.x, c.y, { r: 90, color: GHO, dur: 0.5, w: 5 });
      for (const w of party()) if (w !== e) { const wy = bodyY(w), xy = bodyY(e); V.fx({ dur: 0.7, layer: 'air', draw: (cx, p, t, fx) => { const k = fx.a * (1 - p) * Math.min(1, p / 0.1); V.neonPath(cx, GHD, 1.6, k * 0.7, () => { cx.moveTo(e.x, xy); cx.quadraticCurveTo((e.x + w.x) / 2, Math.min(xy, wy) - 30, w.x, wy); }); } }); }
      OP.linger(5, 'air', (cx, k, t) => {
        const x = e.x, y = e.y - (e.lift || 0), pop = easeOut(Math.min(1, t / 0.25)), fl = 0.7 + 0.3 * Math.sin(t * 6);
        V.neonRing(cx, x, y + 2, 34 * pop, GHO, 2, k * 0.7, 0.55);
        cx.save(); cx.strokeStyle = '#0a0612'; cx.lineWidth = 3; cx.lineCap = 'round'; cx.globalAlpha = k; cx.beginPath(); cx.moveTo(x + 26, y + 2); cx.lineTo(x + 26, y - 40 * pop); cx.stroke();
        cx.strokeStyle = DEEP; cx.lineWidth = 1.4; cx.stroke(); cx.restore();
        V.glowAt(cx, x + 26, y - 44 * pop, 16, GHO, 0.55 * k * fl); V.glowAt(cx, x + 26, y - 44 * pop, 5, '#ffffff', 0.9 * k * fl);
      }, { peak: 1, settle: 0.6, hold: 0.4 });
    },
    // Black Mantle: the dark is pulled about the knight in long flowing ribbons that stream back from the shoulders for the 8s
    mantle: c => {
      const e = c.ent;
      V.swirl(c.x, c.y, { r: 60, color: BRU, dur: 0.45, inward: true, follow: e });
      V.shock(c.x, c.y, { r: 56, color: VIO, dur: 0.4, w: 5 });
      OP.linger(8, 'air', (cx, k, t) => {
        const ang = e.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang), x = e.x, y = bodyY(e), flow = (e.st && e.st.moving) ? 1.4 : 1;
        cx.save(); cx.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const side = (i - 3) / 3, len = 36 + hs(i, 1) * 22, ph = hs(i, 2) * 6;
          const pts = []; for (let j = 0; j <= 8; j++) { const q = j / 8, back = q * len, sway = Math.sin(t * 3.2 * flow + ph + q * 3.2) * (4 + q * 9), up = -q * q * 12 - Math.sin(t * 2 + ph) * q * 3;
            const lx = -back - 4, ly = side * (10 + q * 5) + sway; pts.push([x + lx * ca - ly * sa, y + (lx * sa + ly * ca) * 0.8 + up]); }
          const path = () => { pts.forEach(([px, py], j) => (j ? cx.lineTo(px, py) : cx.moveTo(px, py))); };
          // (vfx2: an 8s aura beside three other players' effects stays cheap: the ink body and one lit core per ribbon)
          cx.globalAlpha = 0.7 * k; cx.strokeStyle = INK; cx.lineWidth = 6; cx.beginPath(); path(); cx.stroke();
          cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.55 * k; cx.strokeStyle = i % 2 ? BRU : GHD; cx.lineWidth = 1.4; cx.beginPath(); path(); cx.stroke(); cx.globalCompositeOperation = 'source-over';
        }
        cx.restore();
        V.glowAt(cx, x, y, 30, VIO, 0.18 * k);
      }, { peak: 1, settle: 0.62, hold: 0.5, tick: () => { if (Math.random() < 0.1) { const a = rnd(0, TAU); V.spawn({ x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 10, z: 16, vz: rnd(15, 35), life: 0.9, size: rnd(4, 7), size1: 0, color: GHD, kind: 'star' }); } } });
    },
    // Last Rite: the knight kneels to the vessel (the moment itself is KIT_VFX['last-rite'])
    rite: c => { V.glint(c.x, c.y - 30, { color: GHO, size: 30, z: 34 }); V.lightfall(c.x, c.y, { color: GHO, r: 16, h: 160, dur: 0.5, feathers: 0 }); },
    // Black Pyre (replaces Rite): the vessel breaks over the target in black fire, ghost-lit at the heart
    pyre: c => {
      const p = reach(c, 280), x = p.x, y = p.y, e = c.ent;
      V.glint(c.x, c.y - 30, { color: GHO, size: 26, z: 34 });
      V.missile(c.x, c.y, x, y, { style: 'orb', color: VIO, speed: 1100, size: 1.1, onHit: () => {} });
      c.later(Math.min(0.4, Math.hypot(x - c.x, y - c.y) / 1100) + 0.05, () => {
        V.flash(x, y - 20, 70, GHO, 0.18);
        V.spikeburst(x, y, { r: 78, n: 18, color: VIO, core: GHO, ink: INK, dur: 0.45 });
        V.pillar(x, y, { r: 30, h: 240, color: BRU, dur: 0.6 });
        V.flare(x, y, { n: 14, r: 34, color: '#5a2aa0', size: 1.5, h: 1.5 });
        V.shock(x, y, { r: 130, color: BRU, dur: 0.55, w: 7 }); V.shock(x, y, { r: 90, color: GHO, dur: 0.45, w: 3, delay: 0.06 });
        V.decal(x, y, { style: 'crack', r: 64, dur: 4, a: 0.45, seed: Math.random() * 6 });
        darkSmoke(x, y, 6, 36); shake(5);
        if (e.st && typeof hitStop === 'function') hitStop(e.st, 0.08, FX.now);
      });
    },
    // Eclipse of the Vigil: the sky darkens and a black sun forms over the knight, its corona cracking with the pale light.
    // The burst (the sun flaring, the blow, the shells on the party) is KIT_VFX['gloom-eclipse']
    eclipsevigil: c => {
      const e = c.ent, WIND = 0.5;
      if (c.cam) c.cam.dim(0.6, 3);
      V.charge(c.x, c.y, { color: LIL, r: 100, n: 16, dur: WIND, follow: e });
      V.sigil(c.x, c.y, { r: 70, style: 'runes', color: BRU, dur: WIND + 1.8, spin: 1.2, flat: 0.62, layer: 'ground' });
      V.fx({ dur: WIND + 2.6, layer: 'air', draw: (cx, p, t, fx) => {
        const form = easeOut(Math.min(1, t / WIND)), out = Math.max(0, Math.min(1, (WIND + 2.6 - t) / 0.7)), flare = t > WIND ? Math.max(0, 1 - (t - WIND) / 0.5) : 0, k = fx.a * out * Math.min(1, t / 0.08);
        const x = e.x, y = e.y - (e.lift || 0) - 92 - 14 * form, R = (8 + 30 * form) * (1 + 0.25 * flare);
        if (k < 0.02) return;
        V.glowAt(cx, x, y, R * 3.4, GHD, 0.22 * k * (0.6 + flare));
        // the corona: long pale rays and cracks round the disc
        cx.save(); cx.translate(x, y); cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round';
        for (let i = 0; i < 22; i++) { const a = i * TAU / 22 + t * 0.25 * (i % 2 ? 1 : -1), l0 = R * 1.05, l1 = R * (1.4 + hs(i, 1) * 0.9 + 0.8 * flare); cx.globalAlpha = (0.35 + 0.35 * hs(i, 2)) * k; cx.strokeStyle = i % 3 ? GHO : LIL; cx.lineWidth = 1 + hs(i, 3) * 1.4; cx.beginPath(); cx.moveTo(Math.cos(a) * l0, Math.sin(a) * l0 * 0.9); cx.lineTo(Math.cos(a + 0.03) * l1, Math.sin(a + 0.03) * l1 * 0.9); cx.stroke(); }
        cx.restore();
        V.neonRing(cx, x, y, R * 1.06, GHO, 2.2, k * 0.95, 0.92);
        cx.save(); cx.globalAlpha = k; cx.fillStyle = INK; cx.beginPath(); cx.ellipse(x, y, R, R * 0.92, 0, 0, TAU); cx.fill(); cx.restore();
        cracks(cx, x, y, k * 0.8, form, 5, R / 24);
        // a black beam drops from the sun to the knight while it forms
        if (t < WIND + 0.2) V.neonPath(cx, VIO, 3, k * 0.5 * (1 - t / (WIND + 0.2)), () => { cx.moveTo(x, y + R * 0.9); cx.lineTo(e.x, bodyY(e)); });
      } });
      c.later(WIND, () => { if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.08, 0.6); c.cam.flash('#e8fffa', 0.26, 0.4); } shake(8); });
    },
  };

  // Shade Step's echo: the knight's ghost steps out of the air beside the target, a beat behind the real blow, and brings its
  // own pale blade down on the same spot, so the second hit reads as a second hit (a bright figure, then a teal X cut)
  KIT_VFX['shade-echo'] = Object.assign((e, target) => {
    const t = target || { x: e.x + Math.cos(e.angle || 0) * 60, y: e.y + Math.sin(e.angle || 0) * 60 }, tx = t.x, ty = t.y;
    const ang = Math.atan2(ty - e.y, tx - e.x), ca = Math.cos(ang), sa = Math.sin(ang), IMP = 0.58;
    later(e, 0.2, () => {
      V.smoke(tx - ca * 84, ty - sa * 84, { n: 3, color: '#120a22', size: 20, a: 0.55, speed: 40, life: 0.6 });
      V.fx({ dur: 0.62, layer: 'air', draw: (cx, p, tt, fx) => {
        const k = fx.a * Math.min(1, p / 0.12) * Math.max(0, 1 - Math.max(0, p - 0.72) / 0.28), lunge = easeOut(Math.max(0, Math.min(1, (p - 0.2) / 0.4)));
        const gx = tx - ca * (84 - 44 * lunge), gy = ty - sa * (84 - 44 * lunge) * 0.8, drop = Math.pow(Math.max(0, Math.min(1, (p - 0.38) / 0.22)), 2);
        ghostFigure(cx, gx, gy - 10, ang, k, GHO, tt, 1.3); ghostFigure(cx, gx, gy - 10, ang, k * 0.6, GHD, tt, 1.3);
        if (p > 0.15) { cx.save(); duskblade(cx, tx - 8 * (1 - drop), ty - 124 + 110 * drop, Math.PI / 2 - 0.1, 78, k, true); duskblade(cx, tx - 8 * (1 - drop), ty - 124 + 110 * drop, Math.PI / 2 - 0.1, 78, k * 0.6, true); cx.restore(); }
      } });
    });
    later(e, 0.2 + IMP * 0.62, () => {
      V.flash(tx, ty - 12, 40, GHO, 0.16);
      cutMark(tx, ty, -0.7, 66, { w: 7, color: GHO, dur: 0.4 }); cutMark(tx, ty, 0.7, 66, { w: 7, color: '#ffffff', dur: 0.4 });
      V.spikeburst(tx, ty, { r: 66, n: 14, color: GHD, core: '#ffffff', ink: INK, dur: 0.3 });
      V.shock(tx, ty, { r: 96, color: GHO, dur: 0.45, w: 5 }); V.shock(tx, ty, { r: 60, color: GHD, dur: 0.35, w: 3, delay: 0.05 });
      V.sparks(tx, ty, { color: GHO, n: 8, speed: 260 }); V.hit(tx, ty, GHO, 0.8);
      shake(3); stop(e, 0.05);
    });
  }, { atTarget: true });

  // Black Pall: a small bell of shadow over every other living member of the party (the knight's own is the recipe's). The
  // Vigil Ward fires this too, but dresses only itself, so the party's bells are skipped when it was the Ward
  KIT_VFX['black-pall'] = (e) => {
    later(e, 0.28, () => {
      if (e.gloomVigilAt && FX.now - e.gloomVigilAt < 0.8) return;
      for (const w of party()) {
        if (w === e) continue;
        V.fx({ dur: 1.3, layer: 'air', draw: (cx, p, t, fx) => {
          const k = fx.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.5), x = w.x, y = w.y + 4, H = 46 * easeOut(Math.min(1, p / 0.3));
          cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.22 * k; cx.fillStyle = DEEP; cx.beginPath(); cx.ellipse(x, y, 26, H, 0, Math.PI, 0); cx.fill(); cx.restore();
          V.neonPath(cx, BRU, 1.4, k * 0.8, () => cx.ellipse(x, y, 26, H, 0, Math.PI, 0)); V.neonPath(cx, GHO, 1, k * 0.5, () => cx.ellipse(x, y, 26, 10, 0, 0, TAU));
        } });
      }
    });
  };

  // Last Rite (and Black Pyre): the dark rushes in from a wide ring, collapses into the knight and is gone in a white flash;
  // then a barrier of pale light shimmers round the knight for its 8s. d.g: the Gloom spent (more of it, a heavier collapse)
  KIT_VFX['last-rite'] = (e, target, d) => {
    const g = Math.max(0, Math.min(100, (d && d.g) || 40)) / 100, R0 = 90 + 50 * g, DUR = 0.55;
    V.fx({ dur: DUR, layer: 'ground', follow: e, draw: (cx, p, t, fx) => {
      const q = Math.pow(Math.min(1, p / 0.9), 2), R = R0 * (1 - q) + 10, k = fx.a * Math.min(1, p / 0.08) * (p > 0.9 ? Math.max(0, (1 - p) / 0.1) : 1);
      cx.save(); cx.translate(e.x, e.y + 2); cx.scale(1, 0.62);
      cx.globalAlpha = 0.5 * k; cx.strokeStyle = INK; cx.lineWidth = 12 + 10 * g; cx.beginPath(); cx.arc(0, 0, R, 0, TAU); cx.stroke();
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.85 * k; cx.strokeStyle = BRU; cx.lineWidth = 3; cx.stroke();
      cx.globalAlpha = k; cx.strokeStyle = GHO; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(0, 0, R * 0.94, 0, TAU); cx.stroke();
      cx.lineWidth = 1.6; cx.beginPath(); const nn = 14; for (let i = 0; i < nn; i++) { const a = i * TAU / nn + t * 2; cx.moveTo(Math.cos(a) * R, Math.sin(a) * R); cx.lineTo(Math.cos(a) * (R - 12 - 10 * g), Math.sin(a) * (R - 12 - 10 * g)); } cx.stroke();
      cx.restore();
    } });
    V.swirl(e.x, e.y, { r: R0, color: VIO, dur: DUR, follow: e, inward: true });
    later(e, DUR * 0.9, () => {
      V.flash(e.x, e.y - 14, 46 + 30 * g, '#ffffff', 0.2);
      V.shock(e.x, e.y, { r: 70 + 30 * g, color: GHO, dur: 0.45, w: 5 });
      V.spikeburst(e.x, e.y, { r: 44 + 20 * g, n: 12, color: GHD, core: '#ffffff', ink: INK, dur: 0.3, z: 10 });
      V.plus(e.x, e.y, { color: GHO, n: 4 });
      shake(2 + 3 * g);
      shell(e, 8, 28);
    });
  };

  // Eclipse of the Vigil, the burst: the sun flares (the recipe held it), a black column strikes the target, a ring of pale
  // light goes out over the floor and a shell bursts on every member of the party and stays faint for the 8s
  KIT_VFX['gloom-eclipse'] = Object.assign((e, target, d) => {
    const g = Math.max(0, Math.min(100, (d && d.g) || 0)) / 100, s = 0.75 + 0.35 * g, t = target || { x: e.x + Math.cos(e.angle || 0) * 90, y: e.y + Math.sin(e.angle || 0) * 90 }, WIND = 0.5;
    later(e, WIND, () => {
      V.flash(e.x, e.y - 90, 120 * s, '#ffffff', 0.2);
      V.shock(e.x, e.y, { r: 260 * s, color: GHO, dur: 0.7, w: 9 }); V.shock(e.x, e.y, { r: 190 * s, color: BRU, dur: 0.6, w: 6, delay: 0.07 });
      V.beam(e.x, e.y - 100, t.x, t.y, { color: VIO, w: 18 * s, dur: 0.4 });
      V.pillar(t.x, t.y, { r: 36 * s, h: 320, color: BRU, dur: 0.6 });
      V.spikeburst(t.x, t.y, { r: 96 * s, n: 22, color: VIO, core: GHO, ink: INK, dur: 0.5 });
      V.shock(t.x, t.y, { r: 150 * s, color: GHO, dur: 0.6, w: 7, delay: 0.05 });
      V.decal(t.x, t.y, { style: 'crack', r: 80 * s, dur: 5, a: 0.5, seed: Math.random() * 6 });
      darkSmoke(t.x, t.y, 7, 46);
      for (const w of party()) {
        V.flash(w.x, bodyY(w), 34, '#ffffff', 0.15); V.shock(w.x, w.y, { r: 54, color: GHO, dur: 0.45, w: 4 });
        V.spikeburst(w.x, w.y, { r: 36, n: 9, color: GHD, core: '#ffffff', ink: INK, dur: 0.3, z: 12 });
        shell(w, 8, 26);
      }
    });
  }, { atTarget: true });

  // ---- Hollow. The knight's body goes hollow: cracks of light run over it, a ghostly double steps out, a ring of shards
  // stands up; and it ends in a white seal (stood up) or a shatter (fell). startMoment/endMoment each run once however many
  // of the kit's moment and the host's message reach this client
  function startMoment(e, d, g) {
    if (e.gloomStartAt && FX.now - e.gloomStartAt < 0.6) return; e.gloomStartAt = FX.now;
    const x = e.x, y = bodyY(e), ang = e.angle || 0;
    V.flash(x, y, 70, GHO, 0.2); V.shock(e.x, e.y, { r: 110, color: GHO, dur: 0.55, w: 6 }); V.shock(e.x, e.y, { r: 70, color: INK, dur: 0.4, w: 9, delay: 0.04 });
    V.burst(x, y, { color: GHO, color2: LIL, n: 14, speed: 240, kind: 'star', flash: false });
    darkSmoke(e.x, e.y, 5, 24);
    V.fx({ dur: 0.9, layer: 'air', draw: (cx, p, t, fx) => {
      const k = fx.a * Math.min(1, p / 0.06) * Math.max(0, 1 - Math.max(0, p - 0.35) / 0.65), q = easeOut(Math.min(1, p / 0.5));
      cracks(cx, e.x, bodyY(e), k, 0.4 + 0.6 * q, 3, 1.4);
      ghostFigure(cx, e.x - Math.cos(ang) * 30 * q, bodyY(e) - Math.sin(ang) * 18 * q - 8 * q, ang, k * 0.9, GHO, t, 1 + 0.2 * q);
    } });
    // the event: a wide black ring runs out over the floor, the ground splits in a crown of ink spikes, a pillar of pale light
    // stands up through the knight and shards of the old shell fly off. Your own screen flashes and kicks
    V.shock(e.x, e.y, { r: 250, color: INK, dur: 0.6, w: 14, delay: 0.05 }); V.shock(e.x, e.y, { r: 230, color: GHO, dur: 0.6, w: 4, delay: 0.07 });
    V.spikeburst(e.x, e.y, { r: 120, n: 18, hole: 0.45, color: VIO, core: GHO, ink: INK, fill: '#1c1230', dur: 0.5, layer: 'ground', z: 0, flat: 0.6 });
    V.pillar(e.x, e.y, { r: 24, h: 250, color: GHO, dur: 0.7 });
    V.decal(e.x, e.y, { style: 'crack', r: 70, dur: 1.6, a: 0.4, seed: Math.random() * 6 });
    for (let i = 0; i < 8; i++) { const a = rnd(0, TAU), sp = rnd(90, 220); V.spawn({ x: e.x, y: e.y, z: 20, vx: Math.cos(a) * sp * 0.5, vy: Math.sin(a) * sp * 0.3, vz: rnd(120, 260), g: 420, drag: 0.04, life: rnd(0.6, 1), size: rnd(6, 10), color: i % 2 ? '#1c1230' : GHO, kind: 'shard', add: false, vr: rnd(-8, 8) }); }
    const cam = FX.camFor(e);
    if (cam) { cam.flash('#e8fffa', 0.2, 0.3); cam.punch(0.05, 0.5); }
    shake(7);
  }
  function endMoment(e, ok) {
    if (e.gloomEndAt && FX.now - e.gloomEndAt < 0.6) return; e.gloomEndAt = FX.now;
    const x = e.x, y = bodyY(e);
    if (ok) {
      // the cracks seal: they close inward in a white flash, a ring and motes rising
      V.fx({ dur: 0.7, layer: 'air', draw: (cx, p, t, fx) => { const k = fx.a * Math.min(1, p / 0.05) * Math.max(0, 1 - Math.max(0, p - 0.3) / 0.7); cracks(cx, e.x, bodyY(e), k, 1 - easeOut(Math.min(1, p / 0.5)), 3, 1.4); } });
      V.flash(x, y, 90, '#ffffff', 0.28); V.shock(e.x, e.y, { r: 130, color: '#ffffff', dur: 0.5, w: 6 }); V.shock(e.x, e.y, { r: 90, color: GHO, dur: 0.6, w: 4, delay: 0.08 });
      V.motes(e.x, e.y, { color: GHO, n: 12, r: 28, kind: 'star' }); V.plus(e.x, e.y, { color: GHO, n: 4 });
      shake(3);
    } else {
      // the shell breaks: dark shards and a pale burst thrown outward, smoke
      V.flash(x, y, 60, GHO, 0.2);
      V.spikeburst(e.x, e.y, { r: 90, n: 16, color: BRU, core: GHO, ink: INK, dur: 0.4, z: 10 });
      for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), sp = rnd(120, 320); V.spawn({ x: e.x, y: e.y, z: 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rnd(40, 160), g: 500, drag: 0.03, life: rnd(0.5, 0.9), size: rnd(6, 11), color: i % 3 ? '#1c1230' : GHO, kind: 'shard', add: false, vr: rnd(-8, 8) }); }
      V.shock(e.x, e.y, { r: 150, color: BRU, dur: 0.6, w: 8 });
      darkSmoke(e.x, e.y, 7, 30); shake(5);
    }
  }
  KIT_VFX['hollow-on'] = (e, target, d) => startMoment(e, (d && d.d) || 8, (d && d.g) || 4);
  KIT_VFX['hollow-end'] = (e, target, d) => endMoment(e, !!(d && d.ok));

  // the state itself, for everyone: while Hollow the knight carries cracks of light, a ghostly double, a crown of shards, and on
  // the floor a ring that counts the seconds (pale for the Hollow, amber for the grace after it; ticks mark the seconds).
  // msg: { id, on, d, g, ok }
  const hollowOff = e => { if (e.gloomHollowFx) for (const f of e.gloomHollowFx) f.cut = true; e.gloomHollowFx = null; };
  CLASS_FEV.hollow = function (msg, e, o) {
    if (!e) return;
    if (typeof SoundHooks !== 'undefined' && SoundHooks.hollow) SoundHooks.hollow(msg, !!(o && o.mine), e);
    if (!msg.on) { hollowOff(e); endMoment(e, !!msg.ok); return; }
    hollowOff(e); startMoment(e, msg.d, msg.g);
    const d = +msg.d || 8, g = +msg.g || 4, T = d + g;
    const ring = OP.linger(T + 1, 'ground', (cx, k, t) => {
      const grace = t > d, left = Math.max(0, grace ? T - t : d - t), frac = grace ? left / g : left / d, R = 42, pulse = grace ? 0.6 + 0.4 * Math.sin(t * 9) : 1, col = grace ? WARN : GHO;
      cx.save(); cx.translate(e.x, e.y + 3); cx.scale(1, 0.62);
      cx.globalAlpha = 0.34 * k; cx.strokeStyle = INK; cx.lineWidth = 9; cx.beginPath(); cx.arc(0, 0, R, 0, TAU); cx.stroke();
      cx.restore();
      cx.save(); cx.lineCap = 'round'; cx.beginPath(); cx.ellipse(e.x, e.y + 3, R, R * 0.62, 0, -Math.PI / 2, -Math.PI / 2 + TAU * frac); cx.globalAlpha = 0.55 * k; cx.strokeStyle = INK; cx.lineWidth = 7; cx.stroke();
      cx.globalAlpha = Math.min(1, k * pulse); cx.strokeStyle = col; cx.lineWidth = 3.4; cx.stroke(); cx.restore();
      for (let i = 0; i < Math.ceil(T); i++) { const a = -Math.PI / 2 + TAU * (i / T), lit = i + 1 > t; const px = e.x + Math.cos(a) * (R + 6), py = e.y + 3 + Math.sin(a) * (R + 6) * 0.62;
        V.glowAt(cx, px, py, lit ? 4 : 2.2, i < d ? GHO : WARN, (lit ? 0.8 : 0.2) * k); }
    }, { peak: 1, settle: 0.9, hold: 0.4 });
    const aura = OP.linger(T + 1, 'air', (cx, k, t) => {
      const ang = e.angle || 0, grace = t > d, x = e.x, y = bodyY(e), fl = 0.7 + 0.3 * Math.sin(t * 5.5), hot = grace ? 0.6 + 0.4 * Math.sin(t * 9) : 1;
      ghostFigure(cx, x - Math.cos(ang) * 11 + Math.sin(t * 2.1) * 3, y - 6 - Math.sin(t * 1.7) * 3 - Math.sin(ang) * 6, ang, k * 0.7 * hot, grace ? WARN : GHD, t);
      cracks(cx, x, y, k * (0.6 + 0.4 * fl), 1, 3, 1.3);
      V.glowAt(cx, x, y, 34, grace ? WARN : GHD, 0.16 * k * fl);
      // the crown of cracked shadow: shards standing round the head, a pale light in their cracks
      cx.save(); cx.translate(x, y - 8); cx.scale(1, 0.8);
      for (let i = 0; i < 7; i++) { const a = ang + Math.PI + (i - 3) * 0.42, tip = 24 + (i % 2) * 6 + Math.sin(t * 2.4 + i * 1.7) * 1.5, w = 0.14;
        cx.globalAlpha = 0.85 * k; cx.fillStyle = INK; cx.beginPath(); cx.moveTo(Math.cos(a - w) * 12, Math.sin(a - w) * 12); cx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip); cx.lineTo(Math.cos(a + w) * 12, Math.sin(a + w) * 12); cx.closePath(); cx.fill();
        cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.8 * k * fl; cx.strokeStyle = grace ? WARN : GHO; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); cx.lineTo(Math.cos(a) * (tip - 3), Math.sin(a) * (tip - 3)); cx.stroke(); cx.globalCompositeOperation = 'source-over'; }
      cx.restore();
    }, { peak: 1, settle: 0.8, hold: 0.4, tick: () => {
      if (Math.random() < 0.22) V.spawn({ x: e.x + rnd(-8, 8), y: e.y + rnd(-6, 6), z: rnd(10, 26), vz: rnd(20, 50), life: 0.9, size: rnd(3, 6), size1: 0, color: GHO, kind: 'star' });
      // pale wisps of the shell burning off it, rising: the knight is visibly alight for as long as it is Hollow
      if (Math.random() < 0.18) V.spawn({ x: e.x + rnd(-10, 10), y: e.y + rnd(-4, 4), z: rnd(14, 30), vz: rnd(50, 90), vx: rnd(-10, 10), life: 0.7, size: rnd(7, 11), size1: 0, color: GHD, kind: 'star' });
    } });
    e.gloomHollowFx = [ring, aura];
  };
})();

// ======================================================================= Reaper (class id thresher; damage, class 19): the Toll
// A long scythe and a pale soul-fire on its edge. Colours: void black and deep violet for the body of a swing, a violet vein
// through the middle, a pale teal soul rim on the cutting edge. The four AFFLICTIONS come due on the boss and are drawn there
// as small floating sigils (mark: a rune; drain: a drop; bind: a knot; thread: a chain): faint, they are pale teal, gold when
// due (a warm glow and a pulse), and lapsed they go a dull grey-violet and droop. Reap's colour and burst follow what it
// collects: gold is warm and big, faint a pale teal flutter, lapsed a heavy grey-violet thud. The Wisp is a small blue-white
// flame spirit that orbits the hero; the Gate turns the hero to mist (heroes.js reads st.thMist).
// The sigil state is each hero's own (e._thAff, from the kit's moments) except for your own hero, which reads the kit.
(() => {
  const V = VFX, TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s), OP = OLD_PAINT;
  const INK = '#0c0a14', DEEP = '#2a1840', UMBRA = '#5a3a8a', SOUL = '#8fd8e8', SOUL2 = '#e0f6ff', VIO = '#a77ae8', VIOD = '#2a1840', BONE = '#e8e4dc';
  const GOLD = '#ffd65a', GOLD2 = '#fff1a8', GOLDD = '#6a4a12', ROT = '#8a82a0', ROTD = '#1a1624', ROTHI = '#b8b0cc', WISP = '#d4f4ff', WISP2 = '#7ed0e8';
  const IDS = ['mark', 'drain', 'bind', 'thread'];
  const AFC = { mark: '#ff6a6a', drain: '#ff8fd0', bind: '#b88cff', thread: '#dff2f0' };   // an affliction's own colour (its strikes and pulses; the sigil itself wears the stage's colour)
  const hs = (i, j, s = 0) => { const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return x - Math.floor(x); };
  const reach = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x), r = Math.min(d, Math.hypot(c.tx - c.x, c.ty - c.y)); return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, a }; };
  const later = (e, d, fn) => { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); };
  const bodyY = e => e.y - 14 - (e.lift || 0);
  const G = () => (typeof window !== 'undefined' && window.__game) || null;
  const isMe = e => { const g = G(); return !!g && e === g.player; };
  // the small sound cues of the class (sound-hooks.js SoundHooks.thresher): yours full, anyone else's soft and placed
  const snd = (e, ev, d) => { try { if (typeof SoundHooks !== 'undefined' && SoundHooks.thresher) SoundHooks.thresher(ev, d, isMe(e), e, e.id); } catch (err) { /* sound never stops a frame */ } };

  // ---- the toll on the boss: what stage each affliction is at, and where the boss is
  const TIMES = { sower: [2, 6.5], grim: [4, 11] }, LIFE = 6;
  const times = e => TIMES[e.spec] || [3, 8];
  const aff = e => e._thAff || (e._thAff = {});
  // 0 not up, 1 faint, 2 due (gold), 3 lapsed (+ its age and the stretches). Your own hero reads the kit; the rest, what the moments told
  function info(e, id) {
    const g = G(), kit = g && isMe(e) && g.actor && g.actor.kit && g.actor.kit.g && g.actor.kit.g.aff && e.cls && e.cls.id === 'thresher' ? g.actor.kit : null;
    let Y, R, at, now;
    if (kit) { Y = typeof thY === 'function' ? thY(kit) : 3; R = typeof thR === 'function' ? thR(kit) : 8; at = kit.g.aff[id]; now = kit.now; }
    else { [Y, R] = times(e); at = aff(e)[id]; now = FX.now; }
    if (at == null) return { st: 0, age: 0, Y, R };
    const age = now - at;
    return { st: age < Y ? 1 : age < R ? 2 : age < R + LIFE ? 3 : 0, age, Y, R };
  }
  const counts = e => { const n = { 1: 0, 2: 0, 3: 0, n: 0 }; for (const id of IDS) { const s = info(e, id).st; if (s) { n[s]++; n.n++; } } return n; };
  const foe = e => {
    const g = G(), r = g && g.raid;
    if (r && r.state === 'live' && r.bossDraw && !(r.boss && r.boss.u)) return { x: r.bossDraw.x, y: r.bossDraw.y, r: (typeof FIGHT !== 'undefined' && FIGHT.BOSS_R) || 70 };
    return e._thFoe || null;
  };
  const noteFoe = (e, t) => { if (t && isFinite(t.x)) e._thFoe = { x: t.x, y: t.y, r: (typeof FIGHT !== 'undefined' && FIGHT.BOSS_R) || 70 }; };
  // where glyph i hovers: in a row above the boss
  const slot = (f, i) => ({ x: f.x + (i - 1.5) * 30, y: f.y - f.r * 0.6 - 52 + Math.sin(FX.now * 2 + i * 1.7) * 2 });

  // ---- pieces
  // a wide scythe crescent round (x, y) facing ang: widest in the middle and pointed at both ends, an ink body, a coloured vein
  // and a pale soul rim on its leading edge. `tail` (0-1) is how late its trailing end lets go
  function crescent(x, y, ang, o = {}) {
    const r = o.r ?? 64, span = o.span ?? 2.2, W = o.w ?? 18, dur = o.dur ?? 0.3, fl = o.flip ? -1 : 1, z = o.z ?? 14, tail = o.tail ?? 0.25, flat = o.flat ?? 0.8;
    const body = o.body || INK, mid = o.mid || UMBRA, rim = o.rim || SOUL;
    const shape = (c, a0, a1, R, Wd) => { c.beginPath();
      for (let i = 0; i <= 18; i++) { const a = a0 + (a1 - a0) * i / 18; c.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
      for (let i = 18; i >= 0; i--) { const q = i / 18, a = a0 + (a1 - a0) * q, th = Wd * Math.pow(Math.sin(Math.PI * q), 0.8); c.lineTo(Math.cos(a) * (R - th), Math.sin(a) * (R - th)); }
      c.closePath(); c.fill(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const sw = easeOut(Math.min(1, p / 0.36)), k = e.a * (1 - Math.max(0, (p - 0.45) / 0.55));
      const lead = -span / 2 + span * sw, back = -span / 2 + span * Math.max(0, (p - tail) / (1 - tail)) * 0.94;
      if (lead - back < 0.03 || k < 0.02) return;
      c.save(); c.translate(x, y - z); c.scale(1, flat); c.rotate(ang); c.scale(1, fl);
      c.globalAlpha = 0.8 * k; c.fillStyle = body; shape(c, back, lead, r * 1.03, W * 1.2);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.55 * k; c.fillStyle = mid; shape(c, back + (lead - back) * 0.25, lead, r, W * 0.6);
      c.globalAlpha = 0.95 * k; c.fillStyle = rim; shape(c, back + (lead - back) * 0.6, lead, r * 0.995, W * 0.17);
      c.restore();
      if (sw < 1) { const a = ang + fl * lead; V.glowAt(c, x + Math.cos(a) * r, y - z + Math.sin(a) * r * flat, 9 + W * 0.5, rim, 0.75 * k); }
    } });
  }
  // a quick diagonal cut on the target: a dark lens with a pale core
  function cutMark(x, y, ang, len, o = {}) {
    const dur = o.dur ?? 0.34, col = o.color || SOUL;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const go = easeOut(Math.min(1, p / 0.22)), k = e.a * (1 - Math.max(0, (p - 0.3) / 0.7)), L = len * go, w = (o.w ?? 7) * (1 - p * 0.4);
      if (L < 3 || k < 0.02) return;
      c.save(); c.translate(x, y - 16); c.rotate(ang);
      const lens = (l0, l1, ww) => { c.beginPath(); c.moveTo(l0, 0); c.quadraticCurveTo((l0 + l1) / 2, -ww, l1, 0); c.quadraticCurveTo((l0 + l1) / 2, ww, l0, 0); c.fill(); };
      c.globalAlpha = 0.8 * k; c.fillStyle = INK; lens(-L / 2, L / 2, w * 1.3);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k; c.fillStyle = col; lens(-L / 2 * 0.9, L / 2 * 0.9, w * 0.45);
      c.restore();
    } });
  }
  // the scythe lying along th from (x, y): a thin snath and a crescent blade, pale. A fading afterimage of it, not the iron
  function scytheGhost(c, x, y, th, k, col = SOUL, L = 54) {
    if (k < 0.02) return;
    c.save(); c.translate(x, y); c.rotate(th); c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.5 * k; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 0); c.lineTo(L, 0); c.stroke();
    c.beginPath(); c.moveTo(L - 2, 1); c.quadraticCurveTo(L + 12, -3, L + 22, -14); c.quadraticCurveTo(L + 10, -8, L - 6, 5); c.closePath();
    c.globalAlpha = 0.3 * k; c.fillStyle = col; c.fill(); c.globalAlpha = 0.9 * k; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  // (online-refs pass, docs/art/vfx-online-refs/thresher.md) the ghost scythe of a payoff, after FF14's Gibbet/Gallows and
  // Communio: a great blade far bigger than the weapon is raised above the target on the hero's side (o.flip: the other
  // side), held a breath (o.hold), brought down through it in o.swing s with a smear along its path, then fades. All in
  // the air, nothing on the floor. o.s scales it; body/mid/rim colour it. It crosses the target at about hold + swing/2
  function phantom(x, y, o = {}) {
    const s = o.s ?? 1, hold = Math.max(0.01, o.hold ?? 0.12), sw = o.swing ?? 0.16, fade = o.fade ?? 0.36, dur = hold + sw + fade, fl = o.flip ? -1 : 1;
    const body = o.body || INK, mid = o.mid || VIO, rim = o.rim || SOUL2, L = 95 * s, B = 66 * s, px = x - fl * L * 0.85, py = y - 30 - L * 0.45;
    const th0 = -Math.PI / 2 - 0.3, th1 = Math.PI * 0.42;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const rise = easeOut(Math.min(1, t / hold)), q = t < hold ? 0 : easeOut(Math.min(1, (t - hold) / sw)), k = e.a * Math.min(1, t / 0.06) * (1 - Math.max(0, (t - hold - sw) / fade));
      if (k < 0.02) return;
      const th = th0 + (th1 - th0) * q;
      c.save(); c.translate(px, py + 16 * s * (1 - rise)); c.scale(fl, 1); c.lineCap = 'round';
      // the smear: a band along the tip's path, thick at the blade and thinning back to where the swing began
      if (q > 0.02) {
        const a0 = th0 + (th1 - th0) * Math.max(0, q - 0.6), R1 = L + B * 0.45, n = 14;
        c.beginPath();
        for (let i = 0; i <= n; i++) { const a = a0 + (th - a0) * i / n; c.lineTo(Math.cos(a) * R1, Math.sin(a) * R1); }
        for (let i = n; i >= 0; i--) { const a = a0 + (th - a0) * i / n, R0 = R1 - B * 0.7 * Math.pow(i / n, 1.4); c.lineTo(Math.cos(a) * R0, Math.sin(a) * R0); }
        c.closePath(); c.globalAlpha = 0.5 * k; c.fillStyle = body; c.fill();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45 * k; c.fillStyle = mid; c.fill();
        c.globalAlpha = 0.9 * k; c.strokeStyle = rim; c.lineWidth = 2 * s; c.beginPath(); for (let i = 0; i <= n; i++) { const a = a0 + (th - a0) * i / n; c.lineTo(Math.cos(a) * R1, Math.sin(a) * R1); } c.stroke();
        c.globalCompositeOperation = 'source-over';
      }
      // the scythe itself: the snath out from the pivot and the blade hooked at its end, an ink body, a coloured vein, a pale edge
      c.rotate(th);
      c.globalAlpha = 0.75 * k; c.strokeStyle = body; c.lineWidth = 6 * s; c.beginPath(); c.moveTo(L * 0.15, 0); c.lineTo(L + 4 * s, 0); c.stroke();
      const blade = () => { c.beginPath(); c.moveTo(L, -7 * s); c.quadraticCurveTo(L + B * 0.6, B * 0.3, L - B * 0.15, B); c.quadraticCurveTo(L + B * 0.18, B * 0.38, L - 2 * s, 8 * s); c.closePath(); };
      c.globalAlpha = 0.85 * k; c.fillStyle = body; blade(); c.fill();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.5 * k; c.strokeStyle = mid; c.lineWidth = 2.4 * s; c.beginPath(); c.moveTo(L * 0.15, 0); c.lineTo(L, 0); c.stroke();
      c.globalAlpha = 0.6 * k; c.fillStyle = mid; blade(); c.fill();
      c.globalAlpha = k; c.strokeStyle = rim; c.lineWidth = 1.8 * s; c.beginPath(); c.moveTo(L - B * 0.15, B); c.quadraticCurveTo(L + B * 0.18, B * 0.38, L - 2 * s, 8 * s); c.stroke();
      c.restore();
      if (t < hold + sw) V.glowAt(c, px + fl * Math.cos(th) * (L + B * 0.3), py + Math.sin(th) * (L + B * 0.3), 16 * s, rim, 0.6 * k);
    } });
  }
  // soul motes drifting up off a point
  const souls = (x, y, n = 6, col = SOUL, r = 24) => V.motes(x, y, { color: col, n, r, kind: 'star', size: 8 });
  const dust = (x, y, col, n = 3, r = 16) => V.smoke(x, y, { n, r, color: col, size: 22, a: 0.5, speed: 40, life: 0.9 });

  // ---- the sigils (screen space, one size)
  function glyph(c, id, x, y, st, t, size) {
    const S = size, gold = st === 2, rot = st === 3, col = rot ? ROT : gold ? GOLD : SOUL;   // faint pale teal, due gold, lapsed grey-violet
    c.save(); c.translate(x, y + (rot ? 3 + Math.sin(t * 2) * 0.6 : 0)); c.lineCap = 'round'; c.lineJoin = 'round';
    const trace = () => {
      c.beginPath();
      if (id === 'mark') { c.moveTo(0, -S); c.lineTo(S * 0.68, 0); c.lineTo(0, S); c.lineTo(-S * 0.68, 0); c.closePath(); c.moveTo(0, -S * 0.55); c.lineTo(0, S * 0.55); c.moveTo(-S * 0.3, -S * 0.05); c.lineTo(S * 0.3, -S * 0.05); }
      else if (id === 'drain') { c.moveTo(0, -S * 1.05); c.bezierCurveTo(S * 0.9, -S * 0.1, S * 0.8, S * 0.8, 0, S * 0.8); c.bezierCurveTo(-S * 0.8, S * 0.8, -S * 0.9, -S * 0.1, 0, -S * 1.05); }
      else if (id === 'bind') { for (let i = 0; i < 3; i++) { const a = i * TAU / 3 - Math.PI / 2; c.save(); c.rotate(a); c.moveTo(S * 1.04, 0); c.ellipse(S * 0.42, 0, S * 0.62, S * 0.34, 0, 0, TAU); c.restore(); } }
      else { for (let i = 0; i < 3; i++) { const lx = (i - 1) * S * 0.62, ly = (i - 1) * S * 0.62, rx = S * (i % 2 ? 0.42 : 0.3), ry = S * (i % 2 ? 0.3 : 0.42); c.moveTo(lx + rx, ly); c.ellipse(lx, ly, rx, ry, 0.6, 0, TAU); } }
    };
    c.strokeStyle = INK; c.globalAlpha = 0.8; c.lineWidth = 4.2; trace(); c.stroke();
    if (rot) { c.globalAlpha = 0.85; c.fillStyle = ROTD; trace(); c.fill(); c.globalAlpha = 0.9; c.strokeStyle = col; c.lineWidth = 1.4; trace(); c.stroke(); }
    else {
      c.globalCompositeOperation = 'lighter'; c.fillStyle = col; c.globalAlpha = 0.28; trace(); c.fill();
      c.globalAlpha = gold ? 1 : 0.9; c.strokeStyle = col; c.lineWidth = 1.7; trace(); c.stroke();
      if (gold) { c.globalAlpha = 0.9; c.strokeStyle = GOLD2; c.lineWidth = 0.8; trace(); c.stroke(); }
    }
    if (id === 'drain' && !rot) { c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 2; i++) { const q = (t * 0.9 + i * 0.5) % 1; c.globalAlpha = (1 - q) * 0.9; c.fillStyle = col; c.beginPath(); c.arc((i ? 0.4 : -0.4) * S, S * 1.0 + q * S * 1.2, 1.5, 0, TAU); c.fill(); } }
    c.restore();
  }
  // the row of glyphs over the boss: one effect per hero, drawn from its state, alive while any affliction is up
  function glyphs(e) {
    if (e._thGl && e._thGl.alive && FX.now - e._thGl.last < 1) return;   // (a pull or a scene change clears every effect: one that has stopped drawing is made again)
    const me = { alive: true, last: FX.now, idle: 0, was: [0, 0, 0, 0], born: [-9, -9, -9, -9] };
    e._thGl = me;
    V.fx({ dur: 60, layer: 'air', draw: (c, p, t, fx) => {
      if (e._thGl !== me) { fx.dur = 0; return; }
      me.last = FX.now;
      const f = foe(e); if (!f) return;
      let any = 0;
      IDS.forEach((id, i) => {
        const q = info(e, id);
        if (q.st !== me.was[i]) { if (q.st === 2 && me.was[i] === 1 && isMe(e)) snd(e, 'ripe'); me.was[i] = q.st; if (q.st) me.born[i] = t; }
        if (!q.st) return;
        any = 1;
        const pos = slot(f, i), pop = easeOut(Math.min(1, (t - me.born[i]) / 0.22)), END = q.R + LIFE, k = fx.a * pop;
        const sz = 8 * (0.7 + 0.3 * pop) * (q.st === 2 ? 1 + 0.08 * Math.sin(t * 8 + i) : 1);
        if (q.st === 2) V.glowAt(c, pos.x, pos.y, 22 + 4 * Math.sin(t * 8 + i), GOLD, 0.5 * k);
        // the age ring: a faint track with the gold (due) stretch marked, the age drawn over it
        c.save(); c.translate(pos.x, pos.y); c.rotate(-Math.PI / 2); c.lineCap = 'round';
        const a0 = TAU * (q.Y / END), a1 = TAU * (q.R / END);
        c.globalAlpha = 0.4 * k; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.stroke();
        c.globalAlpha = 0.9 * k; c.strokeStyle = 'rgba(255,214,90,0.5)'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 14, a0, a1); c.stroke();
        c.globalAlpha = 0.95 * k; c.strokeStyle = q.st === 3 ? ROT : q.st === 2 ? GOLD2 : SOUL; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 14, 0, Math.min(TAU, TAU * q.age / END)); c.stroke();
        c.restore();
        c.save(); c.globalAlpha = k; glyph(c, id, pos.x, pos.y, q.st, t, sz); c.restore();
      });
      me.idle = any ? 0 : me.idle + 1 / 60;
      if (me.idle > 3) { me.alive = false; if (e._thGl === me) e._thGl = null; fx.dur = 0; }
    } });
  }
  // the glyph's place now, for a burst that should come from it
  const glyphAt = (e, id) => { const f = foe(e); return f ? slot(f, IDS.indexOf(id)) : null; };

  ABILITY_VFX.thresher = {
    // Slash / Cleave: a crescent out, a thinner one back along the same arc. Cleave is the wide one, the other way round
    slash: c => {
      const e = c.ent, a = Math.atan2(c.ty - c.y, c.tx - c.x), p = reach(c, 52);
      const n = c.step != null ? c.step % 2 : (e.thSlash = (FX.now - (e.thSlashAt || -99) > 15 ? 0 : 1 - (e.thSlash | 0)));
      e.thSlashAt = FX.now;
      // (melee pass) the pair has a beat: Slash is a quick, tight cut with a bright snap at the tip; Cleave is the heavy half, a wider
      // crescent that throws a ground scuff and a spiked burst and holds the swing for a breath
      const S = n === 0 ? { r: 60, span: 2.2, w: 18, tail: 0.2, dur: 0.3 } : { r: 76, span: 3.1, w: 27, tail: 0.32, dur: 0.4, flip: true };
      crescent(c.x, c.y, a, S);
      c.later(0.15 + n * 0.04, () => crescent(c.x, c.y, a, { r: S.r * 0.86, span: S.span * 0.82, w: S.w * 0.42, tail: 0.3, dur: 0.28, flip: !S.flip, body: DEEP, mid: VIO, rim: SOUL2 }));
      c.later(0.07 + n * 0.03, () => {
        V.hit(p.x, p.y, n ? SOUL2 : SOUL, 0.5 + n * 0.35);
        V.sparks(p.x, p.y, { color: SOUL, n: 3 + n * 4, angle: a, spread: 0.9, speed: 230 + n * 80 });
        cutMark(p.x, p.y, a + (n ? -0.9 : 0.9), 36 + n * 16, { w: 5 + n * 2 });
        if (!n) V.glint(p.x, p.y, { color: SOUL2, size: 22, z: 20 });
        if (n) {
          cutMark(p.x, p.y, a + 0.5, 28, { w: 4, color: VIO, dur: 0.3 }); souls(p.x, p.y, 4); shake(1.5);
          V.spikeburst(p.x, p.y, { r: 36, n: 9, color: UMBRA, core: SOUL2, ink: DEEP, dur: 0.24, z: 16 });
          V.debris(c.x + Math.cos(a) * 30, c.y + Math.sin(a) * 22, { n: 3, color: '#2a2438', speed: 0.5 });
          if (isMe(e) && e.st && typeof hitStop === 'function') hitStop(e.st, 0.035, FX.now);
        }
      });
    },
    // Hook: the chain-scythe flies out, bites, and the hero is dragged along the chain it is still holding
    hook: c => {
      const e = c.ent, p = reach(c, 320), tx = p.x, ty = p.y, LEN0 = Math.hypot(tx - c.x, ty - c.y), DUR = 0.55;
      V.fx({ dur: DUR, layer: 'air', draw: (cx, pr, t, fx) => {
        const out = easeOut(Math.min(1, pr / 0.2)), k = fx.a * Math.min(1, pr / 0.05) * (pr < 0.6 ? 1 : Math.max(0, 1 - (pr - 0.6) / 0.4));
        if (k < 0.02) return;
        const hx = e.x + Math.cos(e.angle || p.a) * 10, hy = bodyY(e) + 6, ex = hx + (tx - hx) * out, ey = hy + (ty - 16 - hy) * out;
        const L = Math.hypot(ex - hx, ey - hy), n = Math.max(2, Math.round(L / 11)), sag = (1 - out) * 14;
        cx.save(); cx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const q = (i + 0.5) / n, lx = hx + (ex - hx) * q, ly = hy + (ey - hy) * q - Math.sin(q * Math.PI) * sag, a = Math.atan2(ey - hy, ex - hx) + (i % 2 ? Math.PI / 2 : 0);
          cx.save(); cx.translate(lx, ly); cx.rotate(a);
          cx.globalAlpha = 0.85 * k; cx.strokeStyle = INK; cx.lineWidth = 3.6; cx.beginPath(); cx.ellipse(0, 0, 4.2, 2.2, 0, 0, TAU); cx.stroke();
          cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.95 * k; cx.strokeStyle = i % 2 ? SOUL : '#dff2f0'; cx.lineWidth = 1.3; cx.beginPath(); cx.ellipse(0, 0, 4.2, 2.2, 0, 0, TAU); cx.stroke();
          cx.restore();
        }
        // the hooked blade at the tip, and a soul glow on it
        const ang = Math.atan2(ey - hy, ex - hx);
        cx.save(); cx.translate(ex, ey); cx.rotate(ang);
        cx.globalAlpha = 0.9 * k; cx.fillStyle = INK; cx.beginPath(); cx.moveTo(-3, 3); cx.quadraticCurveTo(10, 2, 14, -12); cx.quadraticCurveTo(6, -4, -4, -3); cx.closePath(); cx.fill();
        cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = k; cx.strokeStyle = SOUL; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(-2, 2); cx.quadraticCurveTo(10, 1, 14, -12); cx.stroke();
        cx.restore();
        cx.restore();
        V.glowAt(cx, ex, ey, 12, SOUL, 0.6 * k);
        // (melee pass) the bite: a bright knot of light runs back down the chain to the hand as the pull begins
        if (pr > 0.18 && pr < 0.5) { const q = (pr - 0.18) / 0.32; V.glowAt(cx, ex + (hx - ex) * q, ey + (hy - ey) * q, 15 * (1 - 0.4 * q), '#ffffff', 0.85 * k); V.glowAt(cx, ex + (hx - ex) * q, ey + (hy - ey) * q, 26, SOUL, 0.35 * k); }
        // the drag: speed lines streaming back along the chain while the hero is pulled in
        if (pr > 0.2 && pr < 0.55 && LEN0 > 90) { cx.save(); cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { const off = i * 7, nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off, q = (pr - 0.2) / 0.35; cx.globalAlpha = 0.45 * k * (1 - q); cx.strokeStyle = SOUL2; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(e.x + nx - Math.cos(ang) * 4, bodyY(e) + ny); cx.lineTo(e.x + nx - Math.cos(ang) * (26 + q * 26), bodyY(e) + ny - Math.sin(ang) * (26 + q * 26)); cx.stroke(); } cx.restore(); }
      } });
      c.later(0.1, () => {
        V.hit(tx, ty, SOUL, 0.8); V.shock(tx, ty, { r: 66, color: SOUL, dur: 0.4, w: 4 });
        V.sparks(tx, ty, { color: '#dff2f0', n: 6, angle: p.a + Math.PI, spread: 1, speed: 260 });
        cutMark(tx, ty, p.a + 1.1, 40, { w: 5, color: '#dff2f0' }); shake(2);
        // (melee pass) four pale brackets snap shut on the boss: it is hooked, and the hero is coming
        V.fx({ dur: 0.45, layer: 'air', draw: (cx, pr, t, fx) => {
          const k = fx.a * (1 - Math.max(0, (pr - 0.5) / 0.5)), g = 34 + 26 * (1 - easeOut(Math.min(1, pr / 0.25))); if (k < 0.02) return;
          cx.save(); cx.translate(tx, ty - 18); cx.lineCap = 'round'; cx.lineJoin = 'round';
          for (let i = 0; i < 4; i++) { cx.save(); cx.rotate(Math.PI / 4 + i * Math.PI / 2); cx.translate(g, 0);
            cx.beginPath(); cx.moveTo(-7, -9); cx.lineTo(0, 0); cx.lineTo(-7, 9); cx.globalAlpha = 0.85 * k; cx.strokeStyle = INK; cx.lineWidth = 5.5; cx.stroke();
            cx.globalAlpha = k; cx.strokeStyle = i % 2 ? SOUL : '#dff2f0'; cx.lineWidth = 2; cx.stroke(); cx.restore(); }
          cx.restore();
        } });
      });
    },
    // Reap: the great sweeping cut. Its colour follows what is due on the boss at that moment: warm for gold, pale teal for faint,
    // a heavy grey-violet for lapsed (the payout itself is KIT_VFX.reap)
    reap: c => {
      // (melee pass) what it cashes is read from the payout the kit just sent (KIT_VFX.reap: e._thReap), since your own afflictions are
      // already spent; the sweep grows with the count and carries one thin arc per affliction, in the colour of its stage
      const e = c.ent, a = Math.atan2(c.ty - c.y, c.tx - c.x), R = e._thReap && FX.now - e._thReap.at < 0.6 ? e._thReap : null;
      const n = R ? { 1: R.n - R.gold - R.rot, 2: R.gold, 3: R.rot, n: R.n } : counts(e), kind = n[3] > n[2] ? 'rot' : n[2] ? 'gold' : 'young';
      const P = { gold: { body: GOLDD, mid: GOLD, rim: GOLD2 }, young: { body: DEEP, mid: UMBRA, rim: SOUL2 }, rot: { body: ROTD, mid: ROT, rim: ROTHI } }[kind];
      const big = 1 + 0.16 * Math.min(4, n.n);
      crescent(c.x, c.y, a, { r: 88 * big, span: 3.5, w: 36, tail: 0.5, dur: 0.55, z: 14, ...P });
      if (R) R.st.filter(Boolean).forEach((s, i) => c.later(0.04 + i * 0.05, () => crescent(c.x, c.y, a, { r: (74 + i * 9) * big, span: 3.0 + i * 0.12, w: 9, tail: 0.3, dur: 0.34, flip: i % 2 === 0, z: 18 + i * 2, body: INK, mid: s === 2 ? GOLD : s === 3 ? ROT : UMBRA, rim: s === 2 ? GOLD2 : s === 3 ? ROTHI : SOUL2 })));
      c.later(0.1, () => crescent(c.x, c.y, a, { r: 70 * big, span: 2.8, w: 18, tail: 0.35, dur: 0.4, flip: true, body: INK, mid: VIO, rim: P.rim }));
      c.later(0.3, () => crescent(c.x, c.y, a, { r: 100 * big, span: 2.4, w: 12, tail: 0.3, dur: 0.35, body: INK, mid: P.mid, rim: P.rim, flip: true }));
      V.glint(c.x + Math.cos(a) * 40, c.y + Math.sin(a) * 30 - 40, { color: P.rim, size: 28, z: 40 });
      if (kind === 'rot') dust(c.x + Math.cos(a) * 30, c.y + Math.sin(a) * 20, '#1c1828', 3, 20); else souls(c.x + Math.cos(a) * 30, c.y + Math.sin(a) * 20, 5, P.rim);
    },
    // Beckon (was Gather): the hero crooks a finger, a ring of soul-light closing in on the hands (the threads themselves: KIT_VFX.gather)
    gather: c => {
      V.charge(c.x, c.y, { color: SOUL, r: 56, n: 10, dur: 0.4, follow: c.ent });
      V.glint(c.x, c.y - 34, { color: SOUL2, size: 26, z: 36 });
      V.shock(c.x, c.y, { r: 64, r0: 8, color: SOUL, dur: 0.4, w: 3 });
    },
    // Gloam Blink: a flicker cut. The hero is gone from where they stood, a pale scythe afterimage stays and fades, and two cuts cross on the boss
    blink: c => {
      // (melee pass) the gap-closer is drawn as a gap closed: a dark violet streak runs from where the hero stood (the move's own
      // start, while it is still on its way) to where they land, so the cut on the boss reads as the end of a jump
      const e = c.ent, p = reach(c, 60), a = p.a, dm = e.dashMove && Math.hypot(e.dashMove.tx - e.x, e.dashMove.ty - e.y) < 80 ? e.dashMove : null;
      const gx = dm ? dm.sx : c.x, gy = (dm ? dm.sy : c.y) - 18, ga = e.angle || a;
      if (dm && Math.hypot(dm.tx - dm.sx, dm.ty - dm.sy) > 50) V.shadowdash(dm.sx, dm.sy, dm.tx, dm.ty, { color: '#5a3a8a', smoke: '#1a0f2a', dur: 0.34 });
      dust(gx, gy + 18, '#1a0f2a', 4, 14);
      // spectral after-images: three pale hooded silhouettes left along the jump, fading one after another
      if (dm) V.fx({ dur: 0.6, layer: 'air', draw: (cx, pr, t, fx) => { for (let i = 0; i < 3; i++) { const q = (i + 1) / 4, k = fx.a * Math.max(0, 1 - Math.max(0, t - 0.04 - i * 0.05) / 0.4) * (0.5 - i * 0.12); if (k < 0.02) continue; const ix = dm.sx + (dm.tx - dm.sx) * q, iy = dm.sy + (dm.ty - dm.sy) * q - 16; cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = k; cx.fillStyle = i % 2 ? VIO : SOUL; cx.beginPath(); cx.ellipse(ix, iy, 7, 11, 0, 0, TAU); cx.fill(); cx.beginPath(); cx.moveTo(ix - 4, iy + 6); cx.lineTo(ix - 18 - i * 3, iy + 14); cx.lineTo(ix - 3, iy + 12); cx.closePath(); cx.fill(); cx.restore(); } } });
      V.fx({ dur: 0.7, layer: 'air', draw: (cx, pr, t, fx) => { const k = fx.a * Math.min(1, t / 0.04) * Math.max(0, 1 - Math.max(0, t - 0.08) / 0.6), j = (Math.sin(t * 70) > 0.3 ? 1 : 0.55); scytheGhost(cx, gx, gy, ga - 0.5 + t * 0.4, k * j, SOUL); scytheGhost(cx, gx + 8, gy + 3, ga - 0.2 + t * 0.4, k * 0.5, VIO); } });
      c.later(0.05, () => {
        cutMark(p.x, p.y, a + 0.8, 52, { w: 6 }); cutMark(p.x, p.y, a - 0.8, 44, { w: 5, color: VIO });
        V.hit(p.x, p.y, SOUL, 0.7); V.shock(p.x, p.y, { r: 56, color: VIO, dur: 0.3, w: 3 }); dust(p.x, p.y, '#1a0f2a', 2, 14);
      });
    },
    // Spirit Wisp: the hero beckons; the spirit itself rises (KIT_VFX['wisp-summon']) and orbits for its seconds
    wisp: c => { V.glint(c.x, c.y - 30, { color: WISP, size: 22, z: 34 }); V.motes(c.x, c.y, { color: WISP, n: 5, r: 18, kind: 'star', size: 8 }); },
    // Shroud (replaces Beckon): the hero sweeps a hand out and a cloud of dark mist is flung over the boss
    sowing: c => {
      const p = reach(c, 300), a = p.a;
      V.glint(c.x, c.y - 30, { color: SOUL, size: 22, z: 34 });
      for (let i = 0; i < 9; i++) c.later(i * 0.025, () => V.missile(c.x, c.y, p.x + rnd(-24, 24), p.y + rnd(-14, 14), { style: 'orb', color: i % 2 ? SOUL : VIO, speed: 800 + rnd(-100, 100), size: 0.3, arc: 40 + rnd(-10, 20), onHit: () => {} }));
      dust(c.x + Math.cos(a) * 24, c.y + Math.sin(a) * 18, '#1a0f2a', 4, 18);
      crescent(c.x, c.y, a, { r: 54, span: 1.8, w: 10, tail: 0.3, dur: 0.3, mid: UMBRA, rim: SOUL });
    },
    // Cull (replaces the Wisp): the scythe brought down in a great X on the boss
    cull: c => {
      const p = reach(c, 70), a = p.a;
      crescent(c.x, c.y, a, { r: 86, span: 3.2, w: 34, tail: 0.45, dur: 0.5, body: ROTD, mid: GOLD, rim: GOLD2 });
      c.later(0.14, () => crescent(c.x, c.y, a, { r: 80, span: 3.0, w: 26, tail: 0.4, dur: 0.45, flip: true, body: INK, mid: VIO, rim: SOUL2 }));
      c.later(0.14, () => { cutMark(p.x, p.y, a + 0.7, 78, { w: 9, color: GOLD2 }); cutMark(p.x, p.y, a - 0.7, 78, { w: 9, color: SOUL2 }); V.hit(p.x, p.y, GOLD, 1.1); shake(3); });
    },
    // Reaper's Gate: the hero opens a tall arch of pale soul-light, steps into it, and goes. (The mist, the strikes and the close are KIT_VFX)
    reapersgate: c => {
      const e = c.ent, x = c.x, y = c.y, a = Math.atan2(c.ty - c.y, c.tx - c.x);
      if (c.cam) c.cam.dim(0.4, 1.4);
      V.charge(x, y, { color: SOUL, r: 90, n: 14, dur: 0.45, follow: e });
      V.sigil(x, y, { r: 62, style: 'runes', color: SOUL, dur: 1.4, spin: 1.2, flat: 0.62, layer: 'ground' });
      V.fx({ dur: 1.1, layer: 'air', draw: (cx, p, t, fx) => {
        const open = easeOut(Math.min(1, t / 0.4)), out = Math.max(0, Math.min(1, (1.1 - t) / 0.4)), k = fx.a * out;
        if (k < 0.02) return;
        const ax = x + Math.cos(a) * 26, ay = y + 4, H = 92 * open, W = 30 * open;
        cx.save(); cx.globalCompositeOperation = 'lighter';
        const gr = cx.createLinearGradient(0, ay - H, 0, ay); gr.addColorStop(0, 'rgba(143,216,232,0)'); gr.addColorStop(1, `rgba(143,216,232,${0.38 * k})`);
        cx.fillStyle = gr; cx.beginPath(); cx.moveTo(ax - W, ay); cx.lineTo(ax - W, ay - H * 0.65); cx.quadraticCurveTo(ax - W, ay - H, ax, ay - H); cx.quadraticCurveTo(ax + W, ay - H, ax + W, ay - H * 0.65); cx.lineTo(ax + W, ay); cx.closePath(); cx.fill();
        cx.restore();
        V.neonPath(cx, SOUL, 2.2, k, () => { cx.moveTo(ax - W, ay); cx.lineTo(ax - W, ay - H * 0.65); cx.quadraticCurveTo(ax - W, ay - H, ax, ay - H); cx.quadraticCurveTo(ax + W, ay - H, ax + W, ay - H * 0.65); cx.lineTo(ax + W, ay); });
        for (let i = 0; i < 5; i++) V.glowAt(cx, ax - W + (i * 2 * W) / 4, ay - H * (0.15 + 0.6 * Math.abs(Math.sin(i * 1.3))) - 4, 4 + 2 * Math.sin(t * 6 + i), i === 4 ? GOLD : VIO, 0.7 * k);
      } });
      c.later(0.45, () => { if (c.cam) { c.cam.stop(0.08); c.cam.flash('#e0f6ff', 0.22, 0.4); } shake(5); });
    },
    // the Gate's strikes: a pale, quick crescent each time (KIT_VFX['gate-strike'] adds the numbered, growing light on the boss)
    gatestrike: c => {
      const a = Math.atan2(c.ty - c.y, c.tx - c.x), e = c.ent, n = Math.min(4, e._thGate | 0), p = reach(c, 54);
      crescent(c.x, c.y, a, { r: 66 + n * 6, span: 2.4 + n * 0.15, w: 20 + n * 3, tail: 0.3, dur: 0.3 + n * 0.02, flip: n % 2 === 1, body: DEEP, mid: n === 4 ? GOLD : VIO, rim: n === 4 ? GOLD2 : SOUL2 });
      c.later(0.06, () => { cutMark(p.x, p.y, a + (n % 2 ? -0.8 : 0.8), 40 + n * 10, { w: 5 + n, color: n === 4 ? GOLD2 : SOUL2 }); V.hit(p.x, p.y, n === 4 ? GOLD : SOUL, 0.6 + n * 0.12); });
    },
  };

  // ---- little shared things for the moments below
  const T = f => Object.assign(f, { atTarget: true });
  // a soft mote flying from one point to another along a low arc, with a short tail
  function fly(x0, y0, x1, y1, col, dur = 0.3, arc = 24, size = 7) {
    V.fx({ dur, layer: 'air', draw: (c, p, t, fx) => {
      const k = fx.a * (1 - Math.max(0, (p - 0.8) / 0.2));
      for (let i = 0; i < 4; i++) { const q = easeOut(Math.max(0, p - i * 0.06)); V.glowAt(c, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q - Math.sin(q * Math.PI) * arc, size * (1 - i * 0.2), col, 0.55 * k * (1 - i * 0.2)); }
      const q = easeOut(p); V.glowAt(c, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q - Math.sin(q * Math.PI) * arc, size * 0.7, '#ffffff', 0.6 * k);
    } });
  }
  // a teardrop of flame, head at (x, y) heading ang, tail behind it
  function flameDrop(c, x, y, ang, len, w, col, a) {
    if (a < 0.02) return;
    c.save(); c.translate(x, y); c.rotate(ang); c.globalCompositeOperation = 'lighter';
    const path = (s) => { c.beginPath(); c.moveTo(-len * s, 0); c.quadraticCurveTo(-len * 0.4 * s, -w * 0.95 * s, 0, -w * s); c.arc(0, 0, w * s, -Math.PI / 2, Math.PI / 2); c.quadraticCurveTo(-len * 0.4 * s, w * 0.95 * s, -len * s, 0); c.closePath(); c.fill(); };
    c.fillStyle = col; c.globalAlpha = 0.5 * a; path(1); c.fillStyle = '#ffffff'; c.globalAlpha = 0.85 * a; path(0.5);
    c.restore();
  }

  // ---- afflictions: laid, popped, and the pulses that run while they last
  KIT_VFX.afflict = T((e, target, d) => {
    const id = d && d.id; if (!id) return;
    noteFoe(e, target); aff(e)[id] = FX.now; glyphs(e);
    const f = foe(e) || target; if (!f) return;
    const col = AFC[id], s = glyphAt(e, id);
    V.shock(f.x, f.y, { r: 50, color: col, dur: 0.35, w: 3 });
    V.motes(f.x, f.y, { color: col, n: 3, r: 18, kind: 'star', size: 7 });
    if (s) fly(f.x, f.y - 24, s.x, s.y, col, 0.32, 18, 7);
  });
  KIT_VFX['afflict-pop'] = T((e, target, d) => {
    const id = d && d.id, s = (d && d.s) || 2; if (!id) return;
    noteFoe(e, target);
    if (!(e._thKeep > FX.now)) aff(e)[id] = null;
    const f = foe(e) || target; if (!f) return;
    // (melee pass) the pops of one Reap are a run of strokes: each is a little bigger than the one before (idx), with its own snick
    // across the boss in the colour of its stage
    const R = e._thReap, idx = R && FX.now - R.at < 1.4 ? ++R.pops : 1, up = 1 + 0.12 * (idx - 1);
    const gp = glyphAt(e, id) || { x: f.x, y: f.y - 80 }, m = (id === 'thread' ? 1.25 : 1) * up, sc = s === 2 ? GOLD2 : s === 3 ? ROTHI : AFC[id];
    fly(gp.x, gp.y, f.x, f.y - 20, s === 2 ? GOLD : s === 3 ? ROT : AFC[id], 0.16, 10, 8);
    later(e, 0.14, () => {
      cutMark(f.x, f.y, Math.atan2(f.y - e.y, f.x - e.x) + (idx % 2 ? 0.9 : -0.9), (34 + 8 * idx) * (s === 2 ? 1.2 : 1), { w: 4 + idx, color: sc, dur: 0.28 });
      V.hit(f.x, f.y, sc, 0.35 + 0.1 * idx);
      snd(e, 'pop', d);
      if (s === 2) {
        V.flash(f.x, f.y - 20, 54 * m, GOLD, 0.2);
        V.spikeburst(f.x, f.y, { r: 46 * m, n: 12, color: GOLD, core: GOLD2, ink: GOLDD, dur: 0.3, z: 14 });
        V.shock(f.x, f.y, { r: 84 * m, color: GOLD, dur: 0.4, w: 4 });
        V.motes(f.x, f.y, { color: GOLD2, n: 5, r: 22, kind: 'star', size: 9 });
        V.burst(gp.x, gp.y, { color: GOLD, color2: GOLD2, n: 8, speed: 140, kind: 'star', flash: false, size: 10 });
        shake(1 + m);
      } else if (s === 3) {
        V.shock(f.x, f.y, { r: 60 * m, color: ROT, dur: 0.4, w: 5 });
        dust(f.x, f.y, '#1c1828', 3, 18); V.debris(f.x, f.y, { n: 4, color: '#2a2438', speed: 0.7 });
        V.burst(gp.x, gp.y, { color: ROT, n: 5, speed: 90, kind: 'glow', flash: false, size: 9 });
        shake(1);
      } else {
        V.shock(f.x, f.y, { r: 56 * m, color: AFC[id], dur: 0.35, w: 3 });
        V.motes(f.x, f.y, { color: SOUL, n: 4, r: 20, kind: 'star', size: 10 });
      }
    });
  });
  // (melee pass) Reap's payout reads as a toll collected: the sweep (the recipe) and the base cut open it, each affliction then pops in turn
  // (afflict-pop, a little bigger each time, in its own stage's colour), and the burst on the boss comes last and is sized by what was
  // collected: how many (m), how many due/gold (taller light, more rings, a hit-stop), how many lapsed (a heavier, greyer thud). The count
  // is kept on the hero (e._thReap) for the pops and for the recipe, which runs just after this
  KIT_VFX.reap = T((e, target, d) => {
    noteFoe(e, target);
    const f = foe(e) || target; if (!f) return;
    d = d || {};
    const gold = d.gold | 0, rot = d.rot | 0, n = d.n | 0, young = Math.max(0, n - gold - rot);
    // which stage each affliction was at: the glyphs' last drawn state (your own kit has already let them go), else counted off
    let st = e._thGl && e._thGl.was ? e._thGl.was.slice() : null;
    if (!st || st.filter(Boolean).length !== n) { st = [0, 0, 0, 0]; let g = gold, r = rot, y = young; for (let i = 0; i < 4 && g + r + y > 0; i++) { if (g > 0) { st[i] = 2; g--; } else if (y > 0) { st[i] = 1; y--; } else { st[i] = 3; r--; } } }
    e._thReap = { at: FX.now, n, gold, rot, st, pops: 0 };
    const a = Math.atan2(f.y - e.y, f.x - e.x), kind = rot > gold ? 'rot' : gold ? 'gold' : 'young';
    // the base cut
    later(e, 0.08, () => {
      V.spikeburst(f.x, f.y, { r: 36, n: 8, color: kind === 'gold' ? GOLD : kind === 'rot' ? ROT : UMBRA, core: kind === 'rot' ? ROTHI : SOUL2, ink: kind === 'gold' ? GOLDD : kind === 'rot' ? ROTD : DEEP, dur: 0.24 });
      cutMark(f.x, f.y, a + 0.8, 52, { w: 6, color: kind === 'gold' ? GOLD2 : kind === 'rot' ? ROTHI : SOUL });
      V.glint(f.x, f.y, { color: kind === 'gold' ? GOLD2 : SOUL2, size: 26, z: 24 });
      shake(1.5);
    });
    // (online-refs pass) a toll of two or more brings the ghost scythe down through the boss as the closing burst lands
    // (Gibbet/Gallows' spectral blade, Malefic Rapture's single close): sized by the count and the gold, coloured by the kind
    if (n >= 2) later(e, 0.14 * n + 0.02, () => phantom(f.x, f.y, { s: 0.7 + 0.1 * n + 0.06 * gold, flip: e.x > f.x, ...({ gold: { body: GOLDD, mid: GOLD, rim: GOLD2 }, rot: { body: ROTD, mid: ROT, rim: ROTHI }, young: { body: DEEP, mid: UMBRA, rim: SOUL2 } })[kind] }));
    later(e, 0.14 * n + 0.22, () => {
      const m = 0.7 + 0.18 * n;
      if (kind === 'gold') {
        V.flash(f.x, f.y - 20, 80 * m, GOLD2, 0.24);
        V.spikeburst(f.x, f.y, { r: 70 * m, n: 12 + 2 * gold, color: GOLD, core: GOLD2, ink: GOLDD, dur: 0.38 });
        V.shock(f.x, f.y, { r: 130 * m, color: GOLD, dur: 0.5, w: 7 }); V.shock(f.x, f.y, { r: 90 * m, color: GOLD2, dur: 0.4, w: 3, delay: 0.06 });
        V.pillar(f.x, f.y, { r: 24 * m, h: 130 + 30 * gold, color: GOLD, dur: 0.5 });
        V.motes(f.x, f.y, { color: GOLD2, n: 6 + gold * 2, r: 30, kind: 'star', size: 11 });
        cutMark(f.x, f.y, a + 0.8, 70 * m, { w: 8, color: GOLD2 }); cutMark(f.x, f.y, a - 0.8, 60 * m, { w: 6, color: SOUL2 });
        if (gold >= 3) V.shock(f.x, f.y, { r: 175 * m, color: GOLD2, dur: 0.6, w: 3, delay: 0.12 });
        shake(3 + gold);
      } else if (kind === 'rot') {
        V.spikeburst(f.x, f.y, { r: 58 * m, n: 14, color: ROT, core: ROTHI, ink: ROTD, dur: 0.4 });
        V.shock(f.x, f.y, { r: 100 * m, color: ROT, dur: 0.5, w: 8 }); V.shock(f.x, f.y, { r: 60 * m, color: ROTD, dur: 0.4, w: 9, delay: 0.04 });
        dust(f.x, f.y, '#1c1828', 5, 26); V.debris(f.x, f.y, { n: 8, color: '#2a2438' });
        V.decal(f.x, f.y, { style: 'crack', r: 46 * m, dur: 2.4, a: 0.4, seed: Math.random() * 6 });
        cutMark(f.x, f.y, a + 0.8, 56 * m, { w: 8, color: ROTHI });
        shake(4);
      } else {
        V.spikeburst(f.x, f.y, { r: 52 * m, n: 12, color: UMBRA, core: SOUL2, ink: DEEP, dur: 0.34 });
        V.shock(f.x, f.y, { r: 96 * m, color: SOUL, dur: 0.45, w: 5 });
        V.motes(f.x, f.y, { color: SOUL, n: 8, r: 30, kind: 'star', size: 11 });
        cutMark(f.x, f.y, a + 0.8, 56 * m, { w: 6 });
        shake(2);
      }
      // a mixed toll carries the other colours too
      if (young && kind !== 'young') V.shock(f.x, f.y, { r: 70, color: SOUL, dur: 0.4, w: 3, delay: 0.05 });
      if (rot && kind !== 'rot') dust(f.x, f.y, '#1c1828', 2, 16);
      if (gold && kind !== 'gold') V.motes(f.x, f.y, { color: GOLD, n: 3, r: 20, kind: 'star', size: 9 });
      // one pip per affliction cashed, flung out of the burst in the colour of its stage
      V.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, fx) => {
        const k = fx.a * (1 - Math.max(0, (p - 0.5) / 0.5)), q = easeOut(Math.min(1, p / 0.6)); if (k < 0.02) return;
        let j = 0;
        st.forEach((s, i) => { if (!s) return; const ang = -Math.PI / 2 + (j++ - (n - 1) / 2) * 0.55, R = 20 + 56 * q, px = f.x + Math.cos(ang) * R * 0.8, py = f.y - 26 + Math.sin(ang) * R * 0.8 - 20 * q;
          glyph(c, IDS[i], px, py, s, t, 5 + 3 * (1 - p)); });
      } });
      if (e.st && typeof hitStop === 'function') hitStop(e.st, 0.05 + 0.015 * n + 0.01 * gold, FX.now);
    });
  });
  // Backswing: the scythe comes back round the other way, a violet-tinged crescent
  KIT_VFX.backswing = T((e, target) => {
    noteFoe(e, target);
    const t = target || foe(e) || { x: e.x + Math.cos(e.angle || 0) * 60, y: e.y + Math.sin(e.angle || 0) * 60 };
    later(e, 0.18, () => {
      const a = Math.atan2(t.y - e.y, t.x - e.x);
      // (melee pass) the third beat of the combo is the snap back: a violet crescent with a bright edge, a violet spiked pop and a
      // glint where it lands, so the rhythm reads slash, cleave, snap
      crescent(e.x, e.y, a, { r: 70, span: 2.7, w: 17, tail: 0.4, dur: 0.32, flip: true, body: DEEP, mid: VIO, rim: SOUL2 });
      V.hit(t.x, t.y, VIO, 0.6); cutMark(t.x, t.y, a - 0.8, 44, { w: 5, color: VIO });
      V.spikeburst(t.x, t.y, { r: 30, n: 8, color: VIO, core: SOUL2, ink: VIOD, dur: 0.22, z: 16 });
      V.glint(t.x, t.y, { color: '#ffffff', size: 20, z: 20 }); V.sparks(t.x, t.y, { color: VIO, n: 4, angle: a + Math.PI, spread: 1, speed: 220 }); shake(1);
    });
  });
  // Reap and Cleave on an add caught in the arc: a pale cut across it and a small burst (the boss's own hit is the move's)
  KIT_VFX['reap-add'] = (e, target, d) => {
    if (!d || !isFinite(d.x)) return;
    const a = Math.atan2(d.y - e.y, d.x - e.x);
    later(e, 0.1, () => { cutMark(d.x, d.y, a + 0.9, 40, { w: 5 }); cutMark(d.x, d.y, a - 0.7, 28, { w: 3, color: VIO, dur: 0.28 }); V.hit(d.x, d.y, SOUL, 0.5); V.sparks(d.x, d.y, { color: SOUL, n: 4, angle: a, spread: 1, speed: 220 }); });
  };
  // Beckon (was Gather): soul-threads run from each sigil down to the hero and are drawn in, the sigils flashing gold as they come due
  KIT_VFX.gather = T((e, target) => {
    noteFoe(e, target);
    const [Y] = times(e); for (const id of IDS) if (aff(e)[id] != null) aff(e)[id] = FX.now - Y;
    const f = foe(e); if (!f) return;
    IDS.forEach((id, i) => {
      if (!info(e, id).st && !isMe(e)) return;
      const s = slot(f, i);
      V.fx({ dur: 0.7, layer: 'air', delay: i * 0.05, draw: (c, p, t, fx) => {
        const k = fx.a * Math.min(1, p / 0.1) * (1 - Math.max(0, (p - 0.75) / 0.25)), hx = e.x, hy = bodyY(e), q = easeOut(Math.min(1, p / 0.8));
        const sag = (1 - q) * 46 + 4, mx = (s.x + hx) / 2 + Math.sin(i * 2 + t * 6) * 6 * (1 - q), my = (s.y + hy) / 2 + sag;
        V.neonPath(c, i % 2 ? SOUL : '#dff2f0', 1.1, k * 0.75, () => { c.moveTo(s.x, s.y); c.quadraticCurveTo(mx, my, hx, hy); });
        const u = q, px = (1 - u) * (1 - u) * s.x + 2 * (1 - u) * u * mx + u * u * hx, py = (1 - u) * (1 - u) * s.y + 2 * (1 - u) * u * my + u * u * hy;
        V.glowAt(c, px, py, 9, SOUL2, 0.8 * k); V.glowAt(c, px, py, 18, SOUL, 0.3 * k);
        if (p < 0.3) V.glowAt(c, s.x, s.y, 24 * (1 - p / 0.3), GOLD, 0.7 * k);
      } });
    });
    V.shock(e.x, e.y, { r: 50, r0: 10, color: SOUL, dur: 0.4, w: 3, delay: 0.4 });
  });
  // Shroud (was Sowing): a shroud of dark mist falls over the boss like a drawn veil, and four sigils are pressed onto the floor under it
  KIT_VFX.sowing = T((e, target) => {
    noteFoe(e, target);
    const f = foe(e) || target; if (!f) return;
    V.sigil(f.x, f.y, { r: 84, style: 'runes', color: VIO, dur: 1.4, spin: 0.8, flat: 0.62, layer: 'ground' });
    V.shock(f.x, f.y, { r: 100, color: UMBRA, dur: 0.5, w: 4 });
    // the shroud: a tall translucent cloth with a wavering hem drops from above the boss to the floor, ripples, and thins away
    V.fx({ dur: 1.3, layer: 'air', draw: (c, p, t, fx) => {
      const fall = easeOut(Math.min(1, p / 0.3)), k = fx.a * Math.min(1, p / 0.08) * (1 - Math.max(0, (p - 0.55) / 0.45)), W = f.r * 1.15, top = f.y - f.r * 1.5 - 30, bot = top + (f.y + f.r * 0.25 - top) * fall;
      if (k < 0.02) return;
      const hem = q => bot + Math.sin(q * 9 + t * 5) * 5 + ((q * 12) % 2 < 1 ? 4 : 0);
      c.save();
      const gr = c.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, 'rgba(12,10,20,0)'); gr.addColorStop(0.5, 'rgba(42,24,64,0.55)'); gr.addColorStop(1, 'rgba(12,10,20,0.78)');
      c.globalAlpha = k; c.fillStyle = gr; c.beginPath(); c.moveTo(f.x - W * 0.35, top);
      c.lineTo(f.x - W, bot); for (let i = 0; i <= 12; i++) { const q = i / 12; c.lineTo(f.x - W + 2 * W * q, hem(q)); }
      c.lineTo(f.x + W * 0.35, top); c.closePath(); c.fill();
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = SOUL; c.lineWidth = 1.2; c.globalAlpha = 0.45 * k; c.beginPath(); for (let i = 0; i <= 12; i++) { const q = i / 12; c.lineTo(f.x - W + 2 * W * q, hem(q)); } c.stroke();
      c.restore();
    } });
    dust(f.x, f.y, '#1a0f2a', 6, 34); dust(f.x, f.y + 8, '#4a2a6a', 3, 28);
    IDS.forEach((id, i) => later(e, 0.12 + i * 0.07, () => {
      const sx = f.x + (i - 1.5) * 34, sy = f.y + 10 + (i % 2) * 8;
      V.motes(sx, sy, { color: SOUL, n: 3, r: 8, kind: 'star', size: 9 });
      // the sigil of the affliction, pressed flat into the floor under the shroud, glowing and then sinking
      V.fx({ dur: 0.9, layer: 'ground', draw: (c, p, t, fx) => {
        const grow = easeOut(Math.min(1, p / 0.3)), k = fx.a * (1 - Math.max(0, (p - 0.6) / 0.4));
        c.save(); c.translate(sx, sy); c.scale(1, 0.62); c.globalAlpha = k; glyph(c, id, 0, 0, 1, t, 9 * grow); c.restore();
      } });
    }));
    shake(2);
  });
  // Cull: what is owed, taken at once. Scythe-light falls in a pillar and the boss is cut through
  KIT_VFX.cull = T((e, target, d) => {
    noteFoe(e, target); e._thKeep = FX.now + 1.6;
    const f = foe(e) || target; if (!f) return;
    const n = (d && d.n) || 3;
    // (online-refs pass, after Plentiful Harvest) the ghost scythe in gold falls with the pillar
    later(e, 0.02, () => phantom(f.x, f.y, { s: 1.1 + 0.05 * n, hold: 0.02, swing: 0.13, flip: e.x > f.x, body: ROTD, mid: GOLD, rim: GOLD2 }));
    later(e, 0.12, () => {
      V.flash(f.x, f.y - 20, 90, GOLD2, 0.24);
      V.pillar(f.x, f.y, { r: 30, h: 260, color: GOLD, dur: 0.55 });
      V.spikeburst(f.x, f.y, { r: 62 + 8 * n, n: 16, color: GOLD, core: GOLD2, ink: GOLDD, dur: 0.4 });
      V.shock(f.x, f.y, { r: 130, color: GOLD, dur: 0.5, w: 7 }); V.shock(f.x, f.y, { r: 90, color: SOUL, dur: 0.45, w: 3, delay: 0.06 });
      V.decal(f.x, f.y, { style: 'crack', r: 52, dur: 3, a: 0.45, seed: Math.random() * 6 });
      shake(5); if (e.st && typeof hitStop === 'function') hitStop(e.st, 0.09, FX.now);
    });
  });
  // Omen: the boss darkens and the whole toll comes due in a breath, a gold pulse running along the sigils
  KIT_VFX.omen = T((e, target) => {
    noteFoe(e, target);
    const [Y] = times(e); for (const id of IDS) if (aff(e)[id] != null && FX.now - aff(e)[id] < Y) aff(e)[id] = FX.now - Y;
    const f = foe(e) || target; if (!f) return;
    V.shock(f.x, f.y, { r: 110, color: GOLD, dur: 0.6, w: 4 });
    IDS.forEach((id, i) => { const s = slot(f, i); V.fx({ dur: 0.5, layer: 'air', delay: i * 0.06, draw: (c, p, t, fx) => V.glowAt(c, s.x, s.y, 18 + 22 * p, GOLD2, 0.7 * (1 - p) * fx.a) }); });
  });
  // Bind: the knot tightens on the boss (a violet pulse)
  KIT_VFX['bind-pulse'] = T((e, target) => {
    noteFoe(e, target);
    const f = foe(e) || target; if (!f) return;
    V.shock(f.x, f.y, { r: 70, r0: 20, color: VIO, dur: 0.4, w: 4 });
    V.fx({ dur: 0.45, layer: 'air', draw: (c, p, t, fx) => { const k = fx.a * (1 - p); c.save(); c.translate(f.x, f.y - 24); c.rotate(p * 1.2); V.neonRing(c, 0, 0, 12 * (1.4 - 0.5 * easeOut(p)), VIO, 1.6, k, 0.6); c.restore(); } });
  });
  // Drain: three rose drops run from the boss to the hero
  KIT_VFX['drain-tick'] = T((e, target) => {
    noteFoe(e, target);
    const f = foe(e) || target; if (!f) return;
    for (let i = 0; i < 3; i++) FX.later(i * 0.08, () => fly(f.x + rnd(-14, 14), f.y - 20, e.x, bodyY(e), AFC.drain, 0.4, 20, 6));
    later(e, 0.4, () => V.plus(e.x, e.y, { color: '#bff0f8', n: 2 }));
  });

  // ---- the Wisp: a small blue-white flame spirit that orbits the hero, darts out to the boss when it strikes
  function wispOff(e) { if (e._thWisp) e._thWisp.cut = true; e._thWisp = null; }
  KIT_VFX['wisp-summon'] = e => {
    wispOff(e);
    V.shock(e.x, e.y, { r: 60, color: WISP2, dur: 0.45, w: 4 });
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; V.spawn({ x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 9, z: 8, vx: Math.cos(a) * 30, vy: Math.sin(a) * 20, vz: rnd(60, 110), life: 0.7, size: 9, size1: 0, color: i % 2 ? WISP : WISP2, kind: 'star' }); }
    const trail = [], phase = rnd(0, TAU), born = FX.now;
    e._thWisp = OP.linger(20, 'air', (c, k, t, fx) => {
      const g = G(), kit = g && isMe(e) && g.actor && g.actor.kit;
      if (kit && kit.has && t > 0.6 && !kit.has('wisp')) { fx.cut = true; return; }
      const rise = easeOut(Math.min(1, t / 0.5)), ang = phase + t * 2.1, rr = 30 + 4 * Math.sin(t * 2.3);
      let x = e.x + Math.cos(ang) * rr, y = bodyY(e) - 14 + Math.sin(ang) * rr * 0.5 - 8 * Math.sin(t * 3.1) - 16 * (1 - rise);
      const st = e._thStrike;
      if (st && FX.now - st.at < 0.45) { const q = Math.sin(Math.PI * (FX.now - st.at) / 0.45); x += (st.x - x) * 0.92 * q; y += (st.y - y) * 0.92 * q; }
      trail.push({ x, y }); if (trail.length > 9) trail.shift();
      e._thWispPos = { x, y };
      const hd = trail.length > 1 ? Math.atan2(y - trail[trail.length - 2].y, x - trail[trail.length - 2].x) : ang;
      for (let i = 0; i < trail.length - 1; i++) { const q = i / trail.length; V.glowAt(c, trail[i].x, trail[i].y, 3 + 5 * q, WISP2, 0.3 * q * k); }
      V.glowAt(c, x, y, 20, WISP2, 0.4 * k);
      flameDrop(c, x, y, hd, 15 + 3 * Math.sin(t * 17), 5.6, WISP2, k);
      c.save(); c.fillStyle = '#0d2238'; c.globalAlpha = 0.8 * k; c.beginPath(); c.arc(x + Math.cos(hd) * 2.4 - Math.sin(hd) * 1.7, y + Math.sin(hd) * 2.4 + Math.cos(hd) * 1.7, 0.9, 0, TAU); c.arc(x + Math.cos(hd) * 2.4 + Math.sin(hd) * 1.7, y + Math.sin(hd) * 2.4 - Math.cos(hd) * 1.7, 0.9, 0, TAU); c.fill(); c.restore();
    }, { peak: 1, settle: 1, hold: 0.1, tick: () => { const p = e._thWispPos; if (p && Math.random() < 0.35) V.spawn({ x: p.x, y: p.y + 10, z: 0, vz: rnd(10, 30), life: 0.6, size: rnd(3, 5), size1: 0, color: WISP, kind: 'star' }); } });
  };
  KIT_VFX['wisp-strike'] = T((e, target) => {
    noteFoe(e, target);
    const f = foe(e) || target; if (!f) return;
    e._thStrike = { at: FX.now, x: f.x, y: f.y - 24 };
    later(e, 0.2, () => { V.hit(f.x, f.y, WISP2, 0.4); V.motes(f.x, f.y, { color: WISP, n: 3, r: 14, kind: 'star', size: 7 }); });
  });
  // Sacrifice: the wisp pops into a ring of soul-fire, a bolt of it goes to the boss and bursts there, and a flicker of the same
  // stays about the hero for the seconds of the gift
  KIT_VFX['wisp-sacrifice'] = T((e, target) => {
    noteFoe(e, target);
    const f = foe(e) || target, wp = e._thWispPos || { x: e.x + 24, y: bodyY(e) - 12 };
    wispOff(e);
    const ring = (x, y, R, dur, delay) => V.fx({ dur, layer: 'air', delay, draw: (c, p, t, fx) => {
      const q = easeOut(p), k = fx.a * (1 - Math.max(0, (p - 0.5) / 0.5));
      V.glowAt(c, x, y, R * 0.8 * (1 - p), '#ffffff', 0.7 * k);
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + p * 0.6; flameDrop(c, x + Math.cos(a) * R * q, y + Math.sin(a) * R * q * 0.62, a, 12 + R * 0.12, 4.4 + R * 0.04, i % 2 ? WISP : WISP2, k); }
      V.neonRing(c, x, y, R * q, WISP2, 1.6, k * 0.7, 0.62);
    } });
    ring(wp.x, wp.y, 52, 0.6, 0);
    V.flash(wp.x, wp.y, 60, WISP, 0.2);
    if (f) {
      fly(wp.x, wp.y, f.x, f.y - 22, WISP, 0.28, 30, 11);
      later(e, 0.28, () => { ring(f.x, f.y, 92, 0.7, 0); V.flash(f.x, f.y - 20, 80, WISP, 0.24); V.spikeburst(f.x, f.y, { r: 66, n: 14, color: WISP2, core: '#ffffff', ink: '#0d2238', dur: 0.36 }); V.shock(f.x, f.y, { r: 120, color: WISP2, dur: 0.5, w: 6 }); shake(3); });
    }
    // the gift: a few flames circling the hero while it lasts
    OP.linger(8, 'air', (c, k, t) => {
      for (let i = 0; i < 3; i++) { const a = t * 2.6 + i * TAU / 3, x = e.x + Math.cos(a) * 20, y = bodyY(e) + Math.sin(a) * 11 - 6; flameDrop(c, x, y, a + Math.PI / 2, 9, 3.2, WISP2, 0.8 * k); }
    }, { peak: 1, settle: 0.6, hold: 0.6 });
  });

  // ---- the Gate: the hero goes to mist (heroes.js draws them thin while st.thMist), five pips on the floor count the strikes
  KIT_VFX['gate-open'] = e => {
    e._thGate = 0;
    if (e.st) e.st.thMist = FX.now + 8.6;
    if (e._thGateFx) e._thGateFx.cut = true;
    V.flash(e.x, bodyY(e), 70, SOUL2, 0.26);
    V.shock(e.x, e.y, { r: 120, color: SOUL, dur: 0.6, w: 6 }); V.shock(e.x, e.y, { r: 80, color: INK, dur: 0.45, w: 9, delay: 0.04 });
    V.swirl(e.x, e.y, { r: 50, color: SOUL, dur: 0.5, follow: e });
    dust(e.x, e.y, '#c8bce0', 8, 22); dust(e.x, e.y, '#1a0f2a', 4, 18);
    souls(e.x, e.y, 10, SOUL, 26);
    e._thGateFx = OP.linger(8.6, 'air', (c, k, t) => {
      const x = e.x, y = e.y + 3, n = Math.min(5, (e._thGate | 0));
      // the ring of five notches on the floor, lit as the strikes land (the fifth gold)
      c.save(); c.translate(x, y); c.scale(1, 0.62);
      c.globalAlpha = 0.3 * k; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.stroke();
      c.globalAlpha = 0.6 * k; c.strokeStyle = SOUL; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.stroke();
      c.restore();
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5, lit = i < n; V.glowAt(c, x + Math.cos(a) * 36, y + Math.sin(a) * 36 * 0.62, lit ? 8 : 4, i === 4 ? GOLD : SOUL, (lit ? 0.9 : 0.35) * k); }
      // mist curling up round the body
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const ph = t * 1.3 + i * 1.26, a = i * TAU / 5 + t * 0.7; c.globalAlpha = (0.16 + 0.1 * Math.sin(ph)) * k; c.strokeStyle = '#b8a8d8'; c.lineWidth = 6; c.beginPath(); c.moveTo(x + Math.cos(a) * 14, bodyY(e) + 10 + Math.sin(a) * 6); c.quadraticCurveTo(x + Math.cos(a + 0.6) * 24, bodyY(e) - 4 + Math.sin(ph) * 5, x + Math.cos(a + 0.2) * 12, bodyY(e) - 24 - 6 * Math.sin(ph)); c.stroke(); }
      c.restore();
    }, { peak: 1, settle: 0.7, hold: 0.5, tick: () => { if (Math.random() < 0.2) V.spawn({ x: e.x + rnd(-14, 14), y: e.y + rnd(-8, 8), z: rnd(6, 24), vz: rnd(20, 50), life: 0.9, size: rnd(4, 8), size1: 0, color: SOUL, kind: 'star' }); } });
  };
  // a strike of the Gate: the light of the scythe on the boss grows with each (n 0-3), a number rising from the cut, in the colour of the affliction it laid
  const GATE_COL = [AFC.mark, AFC.drain, AFC.bind, AFC.thread];
  KIT_VFX['gate-strike'] = T((e, target, d) => {
    noteFoe(e, target);
    const n = Math.max(0, Math.min(3, (d && d.n) | 0)); e._thGate = n + 1;
    const f = foe(e) || target; if (!f) return;
    const col = GATE_COL[n], a = Math.atan2(f.y - e.y, f.x - e.x);
    later(e, 0.1, () => {
      snd(e, 'gate-strike', d);
      V.flash(f.x, f.y - 20, 40 + n * 14, col, 0.18);
      cutMark(f.x, f.y, a + 0.9, 60 + n * 20, { w: 7 + n * 3, color: col }); cutMark(f.x, f.y, a - 0.7, 40 + n * 14, { w: 4 + n * 2, color: SOUL2 });
      V.shock(f.x, f.y, { r: 64 + n * 20, color: col, dur: 0.4, w: 4 + n });
      V.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, fx) => {
        const k = fx.a * Math.min(1, p / 0.1) * (1 - Math.max(0, (p - 0.55) / 0.45)), y = f.y - f.r * 0.7 - 30 - 28 * easeOut(p), sz = 18 + n * 5;
        c.save(); c.font = `800 ${sz}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 4;
        c.globalAlpha = k; c.strokeStyle = 'rgba(12,10,20,0.9)'; c.strokeText(String(n + 1), f.x, y); c.fillStyle = col; c.fillText(String(n + 1), f.x, y);
        c.restore(); V.glowAt(c, f.x, y, sz * 1.3, col, 0.3 * k);
      } });
      shake(n);
    });
  });
  // the fifth: all four afflictions released at once, a bloom of four-coloured light over the boss
  KIT_VFX['gate-release'] = T((e, target, d) => {
    noteFoe(e, target); e._thGate = 5;
    const f = foe(e) || target; if (!f) return;
    const cam = FX.camFor(e);
    // (online-refs pass, after Communio closing Enshroud) the ghost scythe at its largest, in gold, comes straight down
    // through the boss as the bloom opens
    later(e, 0, () => phantom(f.x, f.y, { s: 1.45, hold: 0.02, swing: 0.14, fade: 0.45, flip: e.x > f.x, body: GOLDD, mid: GOLD, rim: GOLD2 }));
    later(e, 0.1, () => {
      if (cam) { cam.stop(0.1); cam.punch(0.07, 0.6); cam.flash('#fff4c8', 0.24, 0.4); }
      snd(e, 'gate-release');
      V.flash(f.x, f.y - 20, 140, GOLD2, 0.3);
      V.pillar(f.x, f.y, { r: 36, h: 320, color: GOLD, dur: 0.65 });
      V.shock(f.x, f.y, { r: 170, color: GOLD, dur: 0.6, w: 9 }); V.shock(f.x, f.y, { r: 120, color: SOUL, dur: 0.5, w: 5, delay: 0.06 }); V.shock(f.x, f.y, { r: 200, color: VIO, dur: 0.7, w: 4, delay: 0.1 });
      V.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, fx) => {
        const q = easeOut(Math.min(1, p / 0.45)), k = fx.a * (1 - Math.max(0, (p - 0.5) / 0.5)), cy = f.y - 26;
        c.save(); c.translate(f.x, cy); c.scale(1, 0.8); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 16; i++) {
          const a = i * TAU / 16 + p * 0.9, R = (30 + 70 * q) * (1 + 0.2 * (i % 2)), col = GATE_COL[i % 4];
          c.save(); c.rotate(a); c.translate(R * 0.5, 0); c.globalAlpha = 0.7 * k; c.fillStyle = col;
          c.beginPath(); c.ellipse(0, 0, R * 0.5, 7 + 5 * q, 0, 0, TAU); c.fill(); c.restore();
        }
        c.restore();
        const sz = 34 + 18 * q; c.save(); c.font = `900 ${sz}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 6;
        c.globalAlpha = k; c.strokeStyle = 'rgba(40,24,4,0.9)'; c.strokeText('5', f.x, cy - 6 - 24 * q); c.fillStyle = GOLD2; c.fillText('5', f.x, cy - 6 - 24 * q); c.restore();
      } });
      V.spikeburst(f.x, f.y, { r: 100, n: 22, color: GOLD, core: '#ffffff', ink: GOLDD, dur: 0.5 });
      V.motes(f.x, f.y, { color: GOLD2, n: 12, r: 44, kind: 'star', size: 12 });
      V.decal(f.x, f.y, { style: 'crack', r: 70, dur: 4, a: 0.5, seed: Math.random() * 6 });
      shake(8);
    });
  });
  KIT_VFX['gate-close'] = e => {
    if (e.st) e.st.thMist = 0;
    e._thGate = 0;
    if (e._thGateFx) e._thGateFx.cut = true; e._thGateFx = null;
    V.flash(e.x, bodyY(e), 60, SOUL2, 0.22);
    V.shock(e.x, e.y, { r: 90, color: SOUL, dur: 0.5, w: 5 });
    dust(e.x, e.y, '#c8bce0', 5, 20); souls(e.x, e.y, 8, SOUL, 22);
    V.glint(e.x, e.y - 34, { color: SOUL2, size: 28, z: 36 });
  };
})();

// ======================================================================= Tidecaller (healer, class 20): the Tide
// Sea water, foam and moonlight. Colours: a deep teal body, sea-green and pale teal in the light, foam white on every crest,
// a pearl for the glints, moon-gold only under Spring Flood, dark ink edges on the bold shapes, wet slate for stone. Heals rise
// (columns of water strands with bubbles and droplets climbing, a foam crown at the crest), damage breaks outward (a foam
// starburst), and a wave that rolls across the floor is only ever a thin wavy ring of foam and teal (never a filled disc, so
// it can't read as a soak); the standing walls of water are airy bands with a foam lip. The kit's moments (k.fx) land here as
// KIT_VFX: crest, slack, riptide, riptidePop, sip, swell, surge, undertow, current, breakwater, ebbShield, flood, floodEnd,
// leviathan, maelstrom, tidalBore, deepBell, brine, spindrift, moonPull. Each hero's picture reads the tide from them too
// (e.st.tm: heroes.js tidecallerLevel), and the sound cues of the class go through SoundHooks.tidecaller.
(() => {
  const V = VFX, TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const TEAL = '#3fb8a8', TEAL2 = '#8fe8d8', DEEP = '#17606c', DEEPER = '#0f3f4c', FOAM = '#eaf8f5', PEARL = '#d7f2ee', MOON = '#fff0b8', INK = '#0c1c26', SLATE = '#6b7e8a', UNDER = '#2c8fa6';
  const later = (e, d, fn) => { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); };
  const bodyY = e => e.y - 14 - (e.lift || 0);
  const G = () => (typeof window !== 'undefined' && window.__game) || null;
  const isMe = e => { const g = G(); return !!g && e === g.player; };
  const party = () => { const l = typeof FX.party === 'function' ? FX.party() : [FX.me]; return (l || []).filter(w => w && w.x != null); };
  const snd = (e, ev, d) => { try { if (typeof SoundHooks !== 'undefined' && SoundHooks.tidecaller) SoundHooks.tidecaller(ev, d, isMe(e), e, e.id); } catch (err) { /* sound never stops a frame */ } };
  const tm = (e, o) => { if (e && e.st) e.st.tm = Object.assign(e.st.tm || {}, o); };
  const aimAng = (e, target, d) => {
    const a = d && d.aim;
    if (a && typeof a === 'object' && isFinite(a.x) && isFinite(a.y)) return Math.atan2(a.y - e.y, a.x - e.x);
    if (typeof a === 'number' && isFinite(a)) return a;
    if (target && isFinite(target.x)) return Math.atan2(target.y - e.y, target.x - e.x);
    return e.angle || 0;
  };

  // ---- pieces
  // droplets thrown up and falling back (they stay as water: no additive glow)
  function drops(x, y, o = {}) {
    const n = o.n ?? 8, sp = o.speed ?? 110, up = o.up ?? 200;
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + rnd(-(o.spread ?? 0.6), o.spread ?? 0.6) : Math.random() * TAU, s = rnd(0.4, 1) * sp;
      V.spawn({ x, y, z: o.z ?? 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, vz: rnd(0.4, 1) * up, g: 520, drag: 0.03, life: rnd(0.55, 0.9), size: rnd(8, 13) * (o.size ?? 1), color: i % 3 ? (o.color || TEAL2) : FOAM, kind: 'drop', add: false, rot: 0 });
    }
  }
  // a wavy ring path on the floor
  function wavyRing(c, x, y, r, amp, n, ph, flat) {
    c.beginPath();
    for (let i = 0; i <= 56; i++) { const a = i / 56 * TAU, d = r + Math.sin(a * n + ph) * amp; const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * flat; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.closePath();
  }
  // a ring of water rolling out across the floor: a dark ink edge, a teal band and a foam crest riding it, beads of foam on it.
  // Thin on purpose: the floor under it stays clear
  function rollRing(x, y, o = {}) {
    const r0 = o.r0 ?? 10, r1 = o.r ?? 120, dur = o.dur ?? 0.8, col = o.color || TEAL, w = o.w ?? 6, flat = o.flat ?? 0.78, n = o.n ?? 9;
    V.fx({ dur, delay: o.delay, layer: 'ground', draw: (c, p, t, e) => {
      const q = easeOut(p), R = r0 + (r1 - r0) * q, k = e.a * Math.min(1, p / 0.08) * (1 - Math.pow(p, 1.6)), amp = 1.2 + 3.2 * (1 - p), ph = t * (o.spin ?? 6);
      if (k < 0.02) return;
      const ww = w * (1 - p * 0.5);
      c.save(); c.lineJoin = 'round';
      wavyRing(c, x, y, R, amp, n, ph, flat); c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.lineWidth = ww + 3; c.stroke();
      c.globalAlpha = 0.85 * k; c.strokeStyle = col; c.lineWidth = ww; c.stroke();
      c.globalCompositeOperation = 'lighter'; wavyRing(c, x, y, R + 1, amp, n, ph + 0.6, flat); c.globalAlpha = 0.95 * k; c.strokeStyle = FOAM; c.lineWidth = Math.max(1, ww * 0.38); c.stroke();
      c.restore();
      if (o.beads !== false) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 0.7, d = R + Math.sin(a * n + ph) * amp; V.glowAt(c, x + Math.cos(a) * d, y + Math.sin(a) * d * flat, 3 + ww * 0.3, FOAM, 0.7 * k); }
    } });
  }
  // a wall of water standing round a point: the near half of a ring with height h, a deep body, a bright foam lip that heaves, a thin
  // ink line along the foot. `fade` runs it out over its last stretch
  function waveWall(x, y, o = {}) {
    const R0 = o.r0 ?? 20, R1 = o.r ?? 150, h0 = o.h ?? 46, dur = o.dur ?? 0.9, flat = o.flat ?? 0.62, span = o.span ?? Math.PI, a0 = o.a0 ?? 0, grow = o.grow ?? 0.5, col = o.color || TEAL;
    return V.fx({ dur, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / grow)), R = R0 + (R1 - R0) * q, h = h0 * (0.35 + 0.65 * Math.sin(Math.min(1, p / grow) * Math.PI * 0.5)) * (1 - 0.25 * Math.max(0, (p - grow) / (1 - grow)));
      const k = e.a * Math.min(1, p / 0.1, (1 - p) / (o.out ?? 0.35)) * (o.alpha ?? 1);
      if (k < 0.02) return;
      const N = 30, pt = i => { const a = a0 + span * i / N; return [x + Math.cos(a) * R, y + Math.sin(a) * R * flat, a]; };
      const lip = (i, a) => -h - Math.sin(a * (o.waves ?? 10) - t * 7) * 2.6 - Math.sin(a * 4 + t * 3) * 2;
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // the body: foot to lip
      c.beginPath();
      for (let i = 0; i <= N; i++) { const [px, py] = pt(i); i ? c.lineTo(px, py) : c.moveTo(px, py); }
      for (let i = N; i >= 0; i--) { const [px, py, a] = pt(i); c.lineTo(px, py + lip(i, a)); }
      c.closePath();
      const gr = c.createLinearGradient(0, y - h, 0, y + R * flat); gr.addColorStop(0, rgba(PEARL, 0.78)); gr.addColorStop(0.35, rgba(col, 0.62)); gr.addColorStop(1, rgba(DEEP, 0.55));
      c.globalAlpha = k; c.fillStyle = gr; c.fill();
      // strands of current running through the body
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = FOAM; c.lineWidth = 1.2; c.globalAlpha = 0.28 * k;
      for (let s = 1; s <= 2; s++) { c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py, a] = pt(i); const yy = py + lip(i, a) * (0.35 + 0.22 * s) + Math.sin(a * 7 + t * 4 + s) * 2; i ? c.lineTo(px, yy) : c.moveTo(px, yy); } c.stroke(); }
      c.globalCompositeOperation = 'source-over';
      // the foot line and the foam lip
      c.globalAlpha = 0.8 * k; c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = pt(i); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
      c.globalAlpha = k; c.strokeStyle = FOAM; c.lineWidth = 3.2; c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py, a] = pt(i); const yy = py + lip(i, a); i ? c.lineTo(px, yy) : c.moveTo(px, yy); } c.stroke();
      c.strokeStyle = TEAL2; c.lineWidth = 1.4; c.globalAlpha = 0.8 * k; c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py, a] = pt(i); const yy = py + lip(i, a) + 3; i ? c.lineTo(px, yy) : c.moveTo(px, yy); } c.stroke();
      c.restore();
      if (p < grow) for (let i = 0; i < 6; i++) { const [px, py, a] = pt(Math.round(i / 5 * N)); V.glowAt(c, px, py + lip(0, a) , 5, FOAM, 0.6 * k); }
    } });
  }
  // a column of rising water strands over a point (a heal): sine strands climbing, bubbles and droplets going up with them,
  // a foam crown at the top that opens, a pearl glint. h and r scale with how big the heal is
  function column(x, y, o = {}) {
    const r = o.r ?? 24, h = o.h ?? 110, dur = o.dur ?? 0.9, col = o.color || TEAL2, follow = o.follow || null, n = o.n ?? 5;
    V.fx({ dur, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y;
      const up = easeOut(Math.min(1, p / 0.32)), k = e.a * Math.min(1, p / 0.06) * (1 - Math.max(0, (p - 0.5) / 0.5)), hh = h * up;
      if (k < 0.02) return;
      c.save(); c.lineCap = 'round';
      V.glowAt(c, cx, cy - hh * 0.4, r * 1.8 + hh * 0.2, col, 0.22 * k);
      for (let i = 0; i < n; i++) {
        const xo = (i - (n - 1) / 2) / ((n - 1) / 2 || 1) * r * 0.85, hi = hh * (0.7 + 0.3 * Math.sin(i * 2.3));
        const path = () => { c.beginPath(); for (let s = 0; s <= 12; s++) { const q = s / 12, yy = cy - hi * q, sw = Math.sin(t * 6 + i * 1.4 - q * 5) * 3.4 * (0.4 + q) + xo * (1 + q * 0.12); s ? c.lineTo(cx + sw, yy) : c.moveTo(cx + sw, yy); } };
        c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.lineWidth = 5.2; path(); c.stroke();
        c.globalAlpha = 0.8 * k; c.strokeStyle = col; c.lineWidth = 3.2; path(); c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7 * k; c.strokeStyle = FOAM; c.lineWidth = 1; path(); c.stroke(); c.globalCompositeOperation = 'source-over';
      }
      // the crown: foam leaves opening off the top of the column
      if (up > 0.6) { const o2 = (up - 0.6) / 0.4, ty = cy - hh; c.globalAlpha = 0.85 * k; c.fillStyle = FOAM; c.strokeStyle = INK; c.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; c.save(); c.translate(cx, ty + 4); c.rotate(a + Math.PI / 2); c.beginPath(); c.ellipse(0, -7 * o2, 2.6 * o2, 8 * o2, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
      }
      c.restore();
    }, tick: (p, dt, e) => { if (p < 0.6 && Math.random() < 0.45) V.spawn({ x: (follow ? follow.x : x) + rnd(-r, r), y: (follow ? follow.y : y) + rnd(-6, 6), z: rnd(2, 14), vz: rnd(60, 130), vx: rnd(-8, 8), life: rnd(0.5, 0.9), size: rnd(4, 8), size1: 0, color: Math.random() < 0.5 ? FOAM : col, kind: Math.random() < 0.5 ? 'glow' : 'star' }); } });
  }
  // a whirl of water: spiral arms and a foam eye. On the floor (flat) or standing in the air; follow keeps it on a moving entity
  function whirl(x, y, o = {}) {
    const r = o.r ?? 30, dur = o.dur ?? 1, flat = o.flat ?? 1, col = o.color || TEAL2, spin = o.spin ?? 2.4, arms = o.arms ?? 2, layer = o.layer || 'air', follow = o.follow || null, dy = o.dy ?? 0, cap = o.a ?? 1;
    return V.fx({ dur, delay: o.delay, layer, draw: (c, p, t, e) => {
      const cx = follow ? follow.x + (o.dx || 0) : x, cy = follow ? follow.y - (follow.lift || 0) + dy : y;
      const k = e.a * cap * Math.min(1, p / (o.inT ?? 0.12), (1 - p) / (o.outT ?? 0.3)), g = easeOut(Math.min(1, p / 0.2));
      if (k < 0.02) return;
      c.save(); c.translate(cx, cy); c.scale(1, flat); c.lineCap = 'round';
      for (let a = 0; a < arms; a++) {
        const path = () => { c.beginPath(); for (let i = 0; i <= 26; i++) { const q = i / 26, an = a * TAU / arms + t * spin * (o.dir ?? 1) + q * 3.2 * (o.dir ?? 1), rr = (2 + q * r) * g; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } };
        c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.lineWidth = (o.w ?? 3.6) + 2.4; path(); c.stroke();
        c.globalAlpha = 0.9 * k; c.strokeStyle = a % 2 ? col : TEAL; c.lineWidth = o.w ?? 3.6; path(); c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8 * k; c.strokeStyle = FOAM; c.lineWidth = Math.max(1, (o.w ?? 3.6) * 0.32); path(); c.stroke(); c.globalCompositeOperation = 'source-over';
      }
      c.restore();
      V.glowAt(c, cx, cy, r * 0.4, FOAM, 0.5 * k); V.glowAt(c, cx, cy, r * 0.9, col, 0.2 * k);
    } });
  }
  // a quick lash of water from a to b on a curve: three strands, the head running ahead and the tail catching up, droplets shed.
  // onHit runs as the head lands
  function lash(ax, ay, bx, by, o = {}) {
    const dur = o.dur ?? 0.24, bow = o.bow ?? 24, col = o.color || TEAL2, d = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / d, ny = (bx - ax) / d, z0 = o.z ?? 26;
    const at = (q, s) => { const w = Math.sin(q * Math.PI) * bow * s; return [ax + (bx - ax) * q + nx * w, ay + (by - ay) * q + ny * w - Math.sin(q * Math.PI) * 14 - z0 * (1 - q) - 8 * q]; };
    V.fx({ dur: dur + 0.14, layer: 'air', draw: (c, p, t, e) => {
      const head = Math.min(1, t / dur), tail = Math.max(0, (t - 0.06) / dur - 0.2), k = e.a * (1 - Math.max(0, (t - dur) / 0.14));
      if (head <= tail || k < 0.02) return;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [s, w, cl, a] of [[1, 8, INK, 0.5], [1, 5.5, TEAL, 0.9], [0.55, 3, col, 0.95], [1.4, 1.6, FOAM, 0.9]]) {
        c.globalAlpha = a * k; c.strokeStyle = cl; c.lineWidth = w; c.beginPath();
        for (let i = 0; i <= 14; i++) { const q = tail + (head - tail) * i / 14, [px, py] = at(q, s); i ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke();
      }
      c.restore();
      const [hx, hy] = at(head, 1); V.glowAt(c, hx, hy, 12, FOAM, 0.6 * k);
    }, tick: () => { const q = Math.random(), [px, py] = at(q, 1); V.spawn({ x: px, y: py + z0 * 0.3, z: z0 * 0.4, vx: rnd(-30, 30), vy: rnd(-10, 20), vz: rnd(10, 60), g: 400, life: 0.4, size: rnd(5, 8), color: Math.random() < 0.5 ? FOAM : TEAL2, kind: 'drop', add: false, rot: 0 }); }, done: () => { if (o.onHit) o.onHit(bx, by); } });
  }
  // a foam burst on a target: bold, spiky and inked (damage goes outward), pale teal over white
  function foamBurst(x, y, o = {}) {
    const s = o.s ?? 1;
    V.spikeburst(x, y, { r: 52 * s, n: 12, color: TEAL, core: FOAM, ink: DEEPER, dur: 0.32 });
    V.flash(x, y - 16, 40 * s, FOAM, 0.2);
    V.shock(x, y, { r: 52 * s, color: FOAM, dur: 0.36, w: 3.4 });
    drops(x, y, { n: Math.round(10 * s), speed: 140 * s, up: 220 * s, size: s });
  }
  // a small glyph hovering over an ally's shoulder: the Riptide Mark's whirl in a ring, for as long as it lasts
  function markGlyph(ent, o = {}) {
    const dur = o.dur ?? 20;
    return V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const x = ent.x + 15, y = ent.y - 40 - (ent.lift || 0) + Math.sin(t * 2.2) * 2.4, k = e.a * Math.min(1, t / 0.2) * (0.75 + 0.2 * Math.sin(t * 4)), R = 9;
      V.glowAt(c, x, y, 20, TEAL2, 0.35 * k);
      c.save(); c.translate(x, y); c.globalAlpha = k; c.fillStyle = 'rgba(12,28,38,0.85)'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
      c.strokeStyle = TEAL; c.lineWidth = 1.8; c.stroke(); c.lineCap = 'round'; c.strokeStyle = FOAM; c.lineWidth = 1.5; c.rotate(t * 1.8); c.beginPath();
      for (let i = 0; i <= 18; i++) { const q = i / 18, an = q * 5.2, rr = 1 + q * (R - 3); i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      c.stroke(); c.restore();
    } });
  }
  // a plus climbing off an ally: the heal reads as a heal (small; the water carries the rest)
  const healMark = (x, y, n = 3) => V.plus(x, y, { color: PEARL, n });
  // ring of foam and pearl on an ally for a small heal
  function allyLand(w, o = {}) {
    const s = o.s ?? 1, strong = !!o.strong;
    rollRing(w.x, w.y, { r0: 6, r: 34 * s + (strong ? 10 : 0), dur: 0.55, w: 4, n: 6 });
    column(w.x, w.y, { r: 14 * s, h: 62 * s + (strong ? 24 : 0), dur: 0.8, n: 4, follow: w });
    V.flash(w.x, bodyY(w), 28 * s, PEARL, 0.2);
    healMark(w.x, w.y, strong ? 4 : 2);
    drops(w.x, w.y, { n: strong ? 8 : 5, speed: 40, up: 150, size: 0.8 });
  }

  // ---- the abilities (the cast itself: the hand, the conch, what flies; what comes of it is the moments below)
  ABILITY_VFX.tidecaller = {
    // Salt Spray: a lash of salt water to the boss that breaks into a foam starburst, a wet splash and a few shed droplets
    spray: c => {
      const e = c.ent, a = Math.atan2(c.ty - c.y, c.tx - c.x), sx = c.x + Math.cos(a) * 20 - Math.sin(a) * 9, sy = c.y + Math.sin(a) * 14 + Math.cos(a) * 3;
      V.sparks(sx, sy - 24, { color: FOAM, n: 3, speed: 120, life: 0.6 });
      lash(sx, sy, c.tx, c.ty, { dur: Math.max(0.16, Math.min(0.3, Math.hypot(c.tx - c.x, c.ty - c.y) / 1100)), bow: 22, onHit: (x, y) => {
        foamBurst(x, y, { s: 0.8 });
        V.puddle(x, y + 8, { r: 22, color: TEAL, dark: DEEPER, dur: 1.6, bubbles: false, fumes: false });
        snd(e, 'spray', null);
      } });
    },
    // Sip: a small drop leaves the sphere over the hand and arcs to the ally (the landing is the 'sip' moment)
    sip: c => { const w = c.tent || { x: c.tx, y: c.ty }; lash(c.x + 10, c.y - 6, w.x, w.y, { dur: 0.2, bow: 14, z: 30 }); },
    swell: c => { const w = c.tent || { x: c.tx, y: c.ty }; lash(c.x + 10, c.y - 6, w.x, w.y, { dur: 0.22, bow: 18, z: 30, color: PEARL }); },
    // Riptide Mark: a spinning orb of water goes out to the ally's shoulder (the mark itself is the 'riptide' moment)
    riptide: c => {
      const w = c.tent || { x: c.tx, y: c.ty }, e = c.ent;
      lash(c.x + 10, c.y - 6, w.x + 14, w.y - 20, { dur: 0.28, bow: 26, z: 34, color: TEAL });
      whirl(c.x + 12, c.y - 30, { r: 12, dur: 0.3, flat: 0.8, w: 2.4 });
    },
    // Surge: the conch is sounded, arcs of sound going out ahead (the wave is the 'surge' moment, which carries how high the water was)
    surge: c => {
      const a = Math.atan2(c.ty - c.y, c.tx - c.x), e = c.ent;
      for (let i = 0; i < 3; i++) V.fx({ dur: 0.5, delay: i * 0.07, layer: 'air', draw: (cx, p, t, f) => {
        const R = 16 + 44 * easeOut(p), k = f.a * (1 - p) * 0.8; if (k < 0.02) return;
        cx.save(); cx.translate(c.x + Math.cos(a) * 14, c.y - 24); cx.lineCap = 'round'; cx.strokeStyle = INK; cx.globalAlpha = 0.4 * k; cx.lineWidth = 5; cx.beginPath(); cx.arc(0, 0, R, a - 0.7, a + 0.7); cx.stroke();
        cx.strokeStyle = i % 2 ? TEAL2 : FOAM; cx.globalAlpha = k; cx.lineWidth = 2.6 - i * 0.5; cx.beginPath(); cx.arc(0, 0, R, a - 0.7, a + 0.7); cx.stroke(); cx.restore();
      } });
    },
    undertow: c => ABILITY_VFX.tidecaller.surge(c),
    // Current: a turn of the hand; the water answers (the 'current' moment)
    current: c => { V.glint(c.x + 11, c.y - 36, { color: PEARL, size: 22, z: 30 }); },
    // Breakwater: the conch struck down, a rumble of foam at the feet (the wall is the 'breakwater' moment)
    breakwater: c => { rollRing(c.x, c.y, { r0: 8, r: 70, dur: 0.5, w: 5 }); drops(c.x, c.y, { n: 6, speed: 80, up: 160 }); },
    // Maelstrom: the whirl opens at the feet (its body is the 'maelstrom' moment)
    maelstrom: c => { V.glint(c.x + 11, c.y - 34, { color: TEAL2, size: 22, z: 30 }); },
    bore: c => ABILITY_VFX.tidecaller.surge(c),
    // Spring Flood: the conch blown long and high, three rings of sound, a pearl flash (the flood is the 'flood' moment)
    springflood: c => {
      const e = c.ent, cam = c.cam;
      if (cam) { cam.flash('#d7f2ee', 0.2, 0.5); cam.punch(0.04, 0.5); }
      for (let i = 0; i < 4; i++) V.fx({ dur: 0.9, delay: i * 0.1, layer: 'air', draw: (cx, p, t, f) => {
        const R = 20 + 70 * easeOut(p), k = f.a * (1 - p); if (k < 0.02) return;
        cx.save(); cx.translate(c.x, c.y - 26); cx.scale(1, 0.55); cx.strokeStyle = i % 2 ? TEAL2 : PEARL; cx.globalAlpha = k * 0.9; cx.lineWidth = 3 - i * 0.4; cx.beginPath(); cx.arc(0, 0, R, 0, TAU); cx.stroke(); cx.restore();
      } });
      V.glint(c.x, c.y - 40, { color: MOON, size: 36, z: 40 });
    },
  };

  // ---- the moments
  // the crest: the water tops out. A pearl glints at the hero's head, a ring of foam stands up round their feet and lets go;
  // a long (Spring) crest is brighter and goes gold
  KIT_VFX.crest = (e, target, d) => {
    const spring = d && d.spring, col = spring ? MOON : FOAM;
    tm(e, { ph: 'hold', t0: FX.now, f0: 1, hold: spring ? 3.5 : 2 });
    V.glint(e.x, e.y - 44, { color: spring ? MOON : PEARL, size: spring ? 30 : 22, z: 40 });
    rollRing(e.x, e.y, { r0: 14, r: spring ? 74 : 56, dur: 0.7, w: 4, color: spring ? '#d8c880' : TEAL, n: 7 });
    for (let i = 0; i < (spring ? 10 : 6); i++) { const a = i / (spring ? 10 : 6) * TAU; V.spawn({ x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 15, z: 6, vz: rnd(50, 100), life: 0.8, size: 8, size1: 0, color: col, kind: 'star', vr: 2 }); }
    snd(e, 'crest', d);
  };
  // slack water: the ebb gives out at the floor: the ring settles in on itself, a few bubbles
  KIT_VFX.slack = (e) => {
    tm(e, { ph: 'rise', t0: FX.now, f0: 0 });
    V.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, f) => { const R = 34 - 22 * easeOut(p), k = f.a * (1 - p) * 0.6; if (k < 0.02) return; V.neonRing(c, e.x, e.y + 3, R, TEAL, 2, k, 0.78); } });
    for (let i = 0; i < 4; i++) V.spawn({ x: e.x + rnd(-14, 14), y: e.y + rnd(-6, 8), z: 2, vz: rnd(25, 55), life: rnd(0.7, 1), size: rnd(5, 8), size1: 0, color: PEARL, kind: 'glow' });
    snd(e, 'slack', null);
  };
  // the Riptide Mark: a whirl in a ring over the ally's shoulder for as long as the mark lasts, a small whirlpool opening under their feet
  KIT_VFX.riptide = (e, target, d) => {
    const w = target || e;
    if (e._tcMark) e._tcMark.dur = 0;
    later(e, 0.22, () => {
      V.flash(w.x, bodyY(w), 34, TEAL2, 0.2);
      whirl(w.x, w.y, { r: 26, dur: 0.8, flat: 0.55, layer: 'ground', spin: 4, w: 3 });
      rollRing(w.x, w.y, { r0: 8, r: 36, dur: 0.5, w: 3.4, n: 6 });
      e._tcMark = markGlyph(w);
      snd(e, 'riptide', d);
    });
  };
  // the mark pops at the crest: the whirl bursts, a column of water goes up the ally's side, foam and pearl, a ring runs out
  KIT_VFX.riptidePop = (e, target, d) => {
    const w = target || e;
    if (e._tcMark) { e._tcMark.dur = 0; e._tcMark = null; }
    V.flash(w.x, bodyY(w), 56, FOAM, 0.26);
    column(w.x, w.y, { r: 22, h: 120, dur: 1, n: 5, follow: w });
    rollRing(w.x, w.y, { r0: 8, r: 70, dur: 0.7, w: 5 });
    whirl(w.x, w.y, { r: 30, dur: 0.5, flat: 0.55, layer: 'ground', spin: -6, w: 3 });
    V.shock(w.x, w.y, { r: 60, color: FOAM, dur: 0.4, w: 3 });
    healMark(w.x, w.y, 5); drops(w.x, w.y, { n: 10, speed: 70, up: 200 });
    V.glint(w.x, w.y - 40, { color: PEARL, size: 28, z: 40 });
    snd(e, 'pop', d);
  };
  // Sip and Swell land: a drop on the ally, ripples, a short column. At low water (the heal is 30% stronger) it is bigger and a
  // second ring follows; a free Sip (Low Water) has a pearl glint
  KIT_VFX.sip = (e, target, d) => {
    const w = target || e, low = d && d.low, free = d && d.free;
    later(e, 0.2, () => V.spawn({ x: w.x, y: w.y, z: 70, vz: -240, life: 0.2, size: 12, size1: 8, color: TEAL2, kind: 'drop', add: false, rot: 0 }));
    later(e, 0.37, () => {
      allyLand(w, { s: low ? 1.2 : 1, strong: low });
      if (low) rollRing(w.x, w.y, { r0: 6, r: 52, dur: 0.6, w: 3, delay: 0.1, color: TEAL2 });
      if (free) V.glint(w.x, w.y - 38, { color: PEARL, size: 24, z: 38 });
    });
  };
  KIT_VFX.swell = (e, target, d) => {
    const w = target || e;
    later(e, 0.22, () => {
      allyLand(w, { s: 0.9 });
      // the tide climbs: three chevrons of pearl rise off the ring at the caster's feet
      for (let i = 0; i < 3; i++) V.fx({ dur: 0.7, delay: i * 0.1, layer: 'air', draw: (c, p, t, f) => {
        const k = f.a * Math.sin(p * Math.PI) * 0.9, y = e.y - 4 - 34 * easeOut(p) - i * 5; if (k < 0.02) return;
        c.save(); c.strokeStyle = PEARL; c.globalAlpha = k; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(e.x - 8, y + 5); c.lineTo(e.x, y - 2); c.lineTo(e.x + 8, y + 5); c.stroke(); c.restore();
      } });
    });
  };
  // Surge: a wave of water goes out from the caster in a ring, and everyone it touches is lifted by a column of water. It is
  // as high as the water was (f): at low water a gentle swell, at the crest a great wall with a foam crown over every ally;
  // under Spring Flood it runs gold-white and carries more
  KIT_VFX.surge = (e, target, d) => {
    const f = (d && d.f) ?? 0.5, full = d && d.full, flood = d && d.flood, col = flood ? MOON : TEAL, R = 120 + 90 * f, h = 28 + 46 * f;
    const cam = FX.camFor(e);
    later(e, 0.05, () => {
      V.flash(e.x, bodyY(e), 50 + 50 * f, flood ? MOON : FOAM, 0.28);
      waveWall(e.x, e.y, { r0: 18, r: R, h, dur: 1.0, color: col, grow: 0.55, out: 0.4, waves: 9 });
      rollRing(e.x, e.y, { r0: 16, r: R + 10, dur: 0.95, w: 3 + 5 * f, color: col });
      rollRing(e.x, e.y, { r0: 10, r: R * 0.7, dur: 0.8, w: 3, delay: 0.1, color: TEAL2, beads: false });
      drops(e.x, e.y, { n: 8 + Math.round(10 * f), speed: 120 + 110 * f, up: 200 + 100 * f });
      if (cam && f > 0.4) { cam.punch(0.02 + 0.03 * f, 0.4); if (full || flood) cam.flash(flood ? '#fff4c8' : '#d7f2ee', 0.12, 0.4); }
      if (f > 0.5) shake(2 + 3 * f);
      for (const w of party()) {
        const dist = Math.hypot(w.x - e.x, w.y - e.y), dl = 0.12 + dist / (R + 10) * 0.55;
        FX.later(dl, () => {
          V.setScale(FX.camFor(e) ? 1 : 0.6);
          try {
            column(w.x, w.y, { r: 14 + 8 * f, h: 56 + 90 * f, dur: 0.9, n: 4 + Math.round(f * 2), follow: w, color: flood ? '#fff6d8' : TEAL2 });
            V.flash(w.x, bodyY(w), 30 + 24 * f, flood ? MOON : PEARL, 0.22);
            rollRing(w.x, w.y, { r0: 6, r: 30 + 24 * f, dur: 0.6, w: 3.4, n: 6 });
            healMark(w.x, w.y, 2 + Math.round(2 * f));
            if (full || flood) { V.glint(w.x, w.y - 52, { color: flood ? MOON : PEARL, size: 26, z: 52 }); drops(w.x, w.y, { n: 6, speed: 60, up: 200 }); }
          } finally { V.setScale(1); }
        });
      }
    });
    snd(e, 'surge', d);
  };
  // Undertow: the party's hurt is pulled down into dark water: a dark ring of water draws in round each ally, ribbons of dark
  // teal run from them to the caster, who is wrapped in a Deep Shield (a dome over a ring of runes, dark teal, for its 8s) while
  // the water gives it back to everyone in a slow pulse of rising droplets
  KIT_VFX.undertow = (e, target, d) => {
    const f = (d && d.f) ?? 0.5, cam = FX.camFor(e);
    tm(e, { deep: FX.now + 8 });
    later(e, 0.05, () => {
      V.flash(e.x, bodyY(e), 44 + 40 * f, UNDER, 0.3);
      for (const w of party()) {
        if (w === e) continue;
        V.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, fx) => { const R = 44 * (1 - easeOut(p)) + 8, k = fx.a * Math.min(1, p / 0.1) * (1 - p) * 0.9; if (k < 0.02) return;
          c.save(); c.lineJoin = 'round'; wavyRing(c, w.x, w.y, R, 2.4, 6, -t * 7, 0.78); c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); c.globalAlpha = k; c.strokeStyle = UNDER; c.lineWidth = 3.6; c.stroke(); c.restore(); } });
        // a ribbon of dark water from the ally to the caster
        const ax = w.x, ay = w.y - 10, bx = e.x, by = e.y - 10, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, bow = 26;
        V.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, fx) => {
          const head = easeOut(Math.min(1, p / 0.55)), tail = Math.max(0, (p - 0.2) / 0.8), k = fx.a * (1 - Math.max(0, (p - 0.6) / 0.4)); if (head <= tail) return;
          c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
          for (const [w2, cl, a] of [[8, INK, 0.5], [5, DEEP, 0.9], [2.4, UNDER, 1]]) { c.globalAlpha = a * k; c.strokeStyle = cl; c.lineWidth = w2; c.beginPath();
            for (let i = 0; i <= 14; i++) { const q = tail + (head - tail) * i / 14, wv = Math.sin(q * Math.PI) * bow + Math.sin(q * 12 - t * 10) * 2.4; const px = ax + dx * q + nx * wv, py = ay + dy * q + ny * wv - Math.sin(q * Math.PI) * 14; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
          c.restore();
        } });
        FX.later(0.45, () => { V.setScale(FX.camFor(e) ? 1 : 0.6); try { V.motes(w.x, w.y, { color: UNDER, n: 3, r: 14, rise: 0.5 }); } finally { V.setScale(1); } });
      }
      // the Deep Shield: a dark teal dome over a rune ring, for as long as it lasts
      FX.later(0.35, () => {
        V.setScale(FX.camFor(e) ? 1 : 0.6);
        try {
          V.shield(e, { color: UNDER, dur: 8, r: 36, shape: 'bubble' });
          vfxLingerSettle(V.sigil(e.x, e.y, { r: 46, style: 'runes', color: TEAL, dur: 8, spin: -0.6, follow: e }), 0.3, 1);
          V.shock(e.x, e.y, { r: 90, color: UNDER, dur: 0.5, w: 6 }); V.shock(e.x, e.y, { r: 60, color: TEAL2, dur: 0.45, w: 3, delay: 0.05 });
          if (cam) cam.punch(0.02, 0.4);
        } finally { V.setScale(1); }
      });
      // the water gives back: a slow pulse of droplets rising off everyone, four times over the shield's life
      for (let n = 1; n <= 4; n++) FX.later(n * 2, () => { V.setScale(FX.camFor(e) ? 1 : 0.6); try { for (const w of party()) { V.motes(w.x, w.y, { color: TEAL2, n: 3, r: 14, rise: 0.7 }); healMark(w.x, w.y, 1); } } finally { V.setScale(1); } });
    });
    snd(e, 'undertow', d);
  };
  // Current: the tide is bent. Rising: a shove, three chevrons of teal climb round the feet; turned: the water folds back on
  // itself in a circling arrow; held at the crest: the pearl ring stands and flares
  KIT_VFX.current = (e, target, d) => {
    const dir = (d && d.dir) || 'up';
    if (dir === 'up') {
      tm(e, { f0: Math.min(1, ((e.st && e.st.tm && e.st.tm.f0) || 0.3) + 0.25) });
      for (let i = 0; i < 3; i++) V.fx({ dur: 0.8, delay: i * 0.1, layer: 'air', draw: (c, p, t, f) => {
        const k = f.a * Math.sin(p * Math.PI), y = e.y - 4 - 46 * easeOut(p); if (k < 0.02) return;
        c.save(); c.strokeStyle = TEAL2; c.globalAlpha = k; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(e.x - 14, y + 7); c.lineTo(e.x, y - 4); c.lineTo(e.x + 14, y + 7); c.stroke(); c.restore();
      } });
      rollRing(e.x, e.y, { r0: 10, r: 54, dur: 0.6, w: 4 });
    } else if (dir === 'turn') {
      V.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, f) => {
        const k = f.a * Math.sin(p * Math.PI), a0 = -Math.PI / 2 + p * TAU * 1.1; if (k < 0.02) return;
        c.save(); c.translate(e.x, e.y - 14); c.scale(1, 0.62); c.lineCap = 'round'; c.lineWidth = 4.4; c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.beginPath(); c.arc(0, 0, 30, a0 - 2.4, a0); c.stroke();
        c.globalAlpha = k; c.strokeStyle = TEAL2; c.lineWidth = 2.8; c.beginPath(); c.arc(0, 0, 30, a0 - 2.4, a0); c.stroke();
        const hx = Math.cos(a0) * 30, hy = Math.sin(a0) * 30; c.fillStyle = FOAM; c.beginPath(); c.moveTo(hx + Math.cos(a0 + 1.57) * 6, hy + Math.sin(a0 + 1.57) * 6); c.lineTo(hx + Math.cos(a0) * 8, hy + Math.sin(a0) * 8); c.lineTo(hx - Math.cos(a0 + 1.57) * 6, hy - Math.sin(a0 + 1.57) * 6); c.closePath(); c.fill(); c.restore();
      } });
      rollRing(e.x, e.y, { r0: 54, r: 14, dur: 0.6, w: 3.4 });
    } else {
      if (e.st && e.st.tm) e.st.tm.hold = (e.st.tm.hold || 2) + 2;
      V.glint(e.x, e.y - 44, { color: PEARL, size: 26, z: 40 }); V.shock(e.x, e.y, { r: 62, color: PEARL, dur: 0.5, w: 4 });
    }
    snd(e, 'current', d);
  };
  // Breakwater: a wall of water stands up round the party, a ring of rising sea that holds for its 8s. It flares as it lands and
  // then settles to a faint, airy band with a foam lip (nothing painted on the floor to hide a telegraph)
  KIT_VFX.breakwater = (e, target, d) => {
    tm(e, { wall: FX.now + 8 });
    const cam = FX.camFor(e);
    later(e, 0.05, () => {
      V.flash(e.x, bodyY(e), 70, FOAM, 0.3);
      rollRing(e.x, e.y, { r0: 14, r: 170, dur: 0.9, w: 7 });
      V.shock(e.x, e.y, { r: 160, color: TEAL2, dur: 0.6, w: 4, delay: 0.08 });
      vfxLingerSettle(waveWall(e.x, e.y, { r0: 150, r: 156, h: 62, dur: 8, color: TEAL, grow: 0.04, out: 0.06, waves: 12, alpha: 0.9 }), 0.2, 0.9);
      V.fx({ dur: 8, layer: 'ground', draw: (c, p, t, f) => {
        const k = f.a * 0.5 * Math.min(1, p / 0.05, (1 - p) / 0.06) * (0.5 + 0.2 * Math.sin(t * 3)); if (k < 0.02) return;
        c.save(); wavyRing(c, e.x, e.y, 156, 2.2, 12, t * 2, 0.62); c.strokeStyle = FOAM; c.globalAlpha = k; c.lineWidth = 1.6; c.stroke(); c.restore();
      }, tick: p => { if (Math.random() < 0.2) { const a = Math.random() * TAU; V.spawn({ x: e.x + Math.cos(a) * 156, y: e.y + Math.sin(a) * 156 * 0.62, z: rnd(20, 50), vz: rnd(8, 24), life: 0.8, size: rnd(4, 7), size1: 0, color: FOAM, kind: 'glow' }); } } });
      drops(e.x, e.y, { n: 12, speed: 150, up: 240 });
      if (cam) cam.punch(0.03, 0.5);
      shake(4);
    });
    snd(e, 'breakwater', d);
  };
  // Ebb Shield: the held water drains out of the wall into a shield on everyone: a ring pulled in to the feet and a faint dome on each
  KIT_VFX.ebbShield = (e) => {
    tm(e, { wall: 0 });
    rollRing(e.x, e.y, { r0: 150, r: 20, dur: 0.7, w: 5 });
    for (const w of party()) { V.shield(w, { color: TEAL2, dur: 0.9, r: 34 }); V.sparks(w.x, w.y - 10, { color: FOAM, n: 4, speed: 130 }); }
  };
  // Spring Flood: the tide goes to the crest and stays there. A great ring of foam runs out, the whole party is washed with water
  // and light, and for its 6s the hero stands in moonlight with slow rings of water going out and droplets drifting up; then the
  // water drops away ('floodEnd')
  KIT_VFX.flood = (e, target, d) => {
    const cam = FX.camFor(e);
    tm(e, { ph: 'hold', t0: FX.now, f0: 1, hold: 6, flood: FX.now + 6 });
    if (e._tcFlood) e._tcFlood.dur = 0;
    later(e, 0.2, () => {
      if (cam) { cam.flash('#e8fbf6', 0.26, 0.5); cam.punch(0.06, 0.6); }
      V.flash(e.x, bodyY(e), 150, MOON, 0.34);
      waveWall(e.x, e.y, { r0: 18, r: 260, h: 70, dur: 1.2, color: TEAL, grow: 0.6, out: 0.4, waves: 12, span: TAU, a0: 0 });
      rollRing(e.x, e.y, { r0: 16, r: 280, dur: 1.2, w: 10, color: TEAL });
      rollRing(e.x, e.y, { r0: 10, r: 200, dur: 1.0, w: 5, delay: 0.12, color: MOON, beads: false });
      rollRing(e.x, e.y, { r0: 10, r: 130, dur: 0.8, w: 4, delay: 0.24, color: TEAL2 });
      V.pillar(e.x, e.y, { r: 36, h: 360, color: PEARL, dur: 0.9 });
      drops(e.x, e.y, { n: 18, speed: 220, up: 320 });
      shake(7);
      for (const w of party()) FX.later(0.15 + Math.hypot(w.x - e.x, w.y - e.y) / 600, () => { V.setScale(FX.camFor(e) ? 1 : 0.6); try { column(w.x, w.y, { r: 20, h: 150, dur: 1.0, n: 5, follow: w, color: '#dff8f0' }); V.flash(w.x, bodyY(w), 44, MOON, 0.26); healMark(w.x, w.y, 5); V.glint(w.x, w.y - 54, { color: MOON, size: 30, z: 54 }); } finally { V.setScale(1); } });
      // the six seconds: moon-glints on the water, a slow ring every second and a half, droplets drifting up round the hero
      const sc = FX.camFor(e) ? 1 : 0.6, DUR = 6;
      e._tcFlood = V.fx({ dur: DUR, layer: 'ground', draw: (c, p, t, f) => {
        const k = f.a * Math.min(1, p / 0.08, (1 - p) / 0.12); if (k < 0.02) return;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 2; i++) { wavyRing(c, e.x, e.y, 34 + i * 10 + Math.sin(t * 2 + i) * 2, 2.4, 8, t * 2 + i, 0.78); c.strokeStyle = i ? TEAL2 : MOON; c.globalAlpha = (0.55 - i * 0.2) * k; c.lineWidth = 2.4; c.stroke(); }
        c.restore(); V.glowAt(c, e.x, e.y, 60, MOON, 0.16 * k);
      }, tick: p => {
        if (Math.random() < 0.3) { const a = Math.random() * TAU, r = rnd(14, 44); V.spawn({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.7, z: 4, vz: rnd(30, 70), life: rnd(0.8, 1.3), size: rnd(5, 9), size1: 0, color: Math.random() < 0.5 ? MOON : FOAM, kind: Math.random() < 0.4 ? 'star' : 'glow' }); }
      } });
      for (let i = 1; i <= 3; i++) FX.later(i * 1.5, () => { V.setScale(sc); try { rollRing(e.x, e.y, { r0: 20, r: 110, dur: 0.9, w: 3.4, color: i % 2 ? TEAL2 : MOON, beads: false }); } finally { V.setScale(1); } });
    });
    snd(e, 'flood', d);
  };
  // the flood drops away: a last ring drawn in and a breath of mist
  KIT_VFX.floodEnd = (e) => {
    if (e._tcFlood) { e._tcFlood.dur = 0; e._tcFlood = null; }
    tm(e, { flood: 0, ph: 'ebb', t0: FX.now, f0: 1, hold: 0 });
    rollRing(e.x, e.y, { r0: 120, r: 20, dur: 0.8, w: 5, color: TEAL });
    V.smoke(e.x, e.y, { n: 5, color: PEARL, size: 22, a: 0.35, speed: 36 });
    snd(e, 'floodEnd', null);
  };
  // Leviathan: the last surge of the flood summons a great wave that breaks on the boss. A wall of water stands up behind it, curls
  // over and crashes down: a huge foam starburst, a wide ring, droplets thrown high and a heavy shake
  KIT_VFX.leviathan = (e, target, d) => {
    const g = G(), r = g && g.raid, f = r && r.state === 'live' && r.bossDraw ? { x: r.bossDraw.x, y: r.bossDraw.y } : target || { x: e.x + 200 * Math.cos(e.angle || 0), y: e.y + 200 * Math.sin(e.angle || 0) };
    const cam = FX.camFor(e), a = Math.atan2(f.y - e.y, f.x - e.x);
    V.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, fx) => {
      const rise = easeOut(Math.min(1, p / 0.5)), fall = p > 0.55 ? easeOut((p - 0.55) / 0.3) : 0, k = fx.a * Math.min(1, p / 0.1) * (1 - Math.max(0, (p - 0.85) / 0.15)); if (k < 0.02) return;
      const hh = 190 * rise * (1 - 0.8 * fall), ww = 150;
      c.save(); c.translate(f.x, f.y + 18); c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-ww, 0); c.bezierCurveTo(-ww * 0.7, -hh * 0.5, -ww * 0.3, -hh, ww * 0.25 * (1 - fall), -hh * 1.02); c.bezierCurveTo(ww * 0.9, -hh * 0.95, ww * 1.05, -hh * 0.3, ww, 0); c.closePath();
      const gr = c.createLinearGradient(0, -hh, 0, 0); gr.addColorStop(0, rgba(FOAM, 0.95)); gr.addColorStop(0.3, rgba(TEAL, 0.85)); gr.addColorStop(1, rgba(DEEP, 0.8));
      c.globalAlpha = k; c.fillStyle = gr; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.globalAlpha = 0.8 * k; c.stroke();
      c.globalAlpha = k; c.strokeStyle = FOAM; c.lineWidth = 4; c.beginPath(); c.moveTo(-ww * 0.8, -hh * 0.45); c.bezierCurveTo(-ww * 0.4, -hh * 0.9, ww * 0.1, -hh * 1.0, ww * 0.4, -hh * 0.96); c.stroke();
      c.restore();
    } });
    FX.later(0.52, () => { V.setScale(cam ? 1 : 0.6); try {
      if (cam) { cam.flash('#e8fbf6', 0.2, 0.4); cam.punch(0.07, 0.5); }
      V.spikeburst(f.x, f.y, { r: 130, n: 18, color: TEAL, core: FOAM, ink: DEEPER, dur: 0.5 });
      V.flash(f.x, f.y - 20, 150, FOAM, 0.3);
      rollRing(f.x, f.y, { r0: 20, r: 230, dur: 0.9, w: 9 });
      V.shock(f.x, f.y, { r: 190, color: TEAL2, dur: 0.6, w: 5, delay: 0.05 });
      drops(f.x, f.y, { n: 28, speed: 260, up: 420 });
      V.decal(f.x, f.y, { style: 'crack', r: 70, dur: 3, a: 0.4, seed: Math.random() * 6 });
      shake(10);
    } finally { V.setScale(1); } });
    snd(e, 'leviathan', d);
  };
  // Maelstrom: a whirlpool opens on the floor where the caster stands and turns for its 9s: spiral arms of teal and foam round a dark
  // eye, a thin foam ring at its edge, droplets spinning up. How high the water was (f) sets how bright
  KIT_VFX.maelstrom = (e, target, d) => {
    const f = (d && d.f) ?? 0.4, x = e.x, y = e.y, R = 130, DUR = 9, cam = FX.camFor(e);
    later(e, 0.05, () => {
      V.flash(x, y - 10, 60, TEAL2, 0.25);
      rollRing(x, y, { r0: 10, r: R, dur: 0.7, w: 5 });
      const arms = V.fx({ dur: DUR, layer: 'ground', draw: (c, p, t, fx) => {
        const k = fx.a * Math.min(1, p / 0.08, (1 - p) / 0.12) * (0.55 + 0.3 * f), g = easeOut(Math.min(1, p / 0.12)); if (k < 0.02) return;
        // the dark eye
        const gr = c.createRadialGradient(x, y, 2, x, y, R * 0.5 * g); gr.addColorStop(0, rgba(DEEPER, 0.7)); gr.addColorStop(1, rgba(DEEPER, 0));
        c.save(); c.translate(x, y); c.scale(1, 0.62); c.translate(-x, -y); c.globalAlpha = k; c.fillStyle = gr; c.beginPath(); c.arc(x, y, R * 0.5 * g, 0, TAU); c.fill(); c.restore();
        c.save(); c.translate(x, y); c.scale(1, 0.62); c.lineCap = 'round';
        for (let a = 0; a < 3; a++) {
          const path = () => { c.beginPath(); for (let i = 0; i <= 30; i++) { const q = i / 30, an = a * TAU / 3 + t * 2.2 + q * 3.6, rr = (4 + q * (R - 8)) * g; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } };
          c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.lineWidth = 7; path(); c.stroke();
          c.globalAlpha = 0.85 * k; c.strokeStyle = a % 2 ? TEAL2 : TEAL; c.lineWidth = 4.4; path(); c.stroke();
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8 * k; c.strokeStyle = FOAM; c.lineWidth = 1.5; path(); c.stroke(); c.globalCompositeOperation = 'source-over';
        }
        c.restore();
        c.save(); wavyRing(c, x, y, R * g, 2.4, 14, t * 3, 0.62); c.strokeStyle = FOAM; c.globalAlpha = 0.5 * k; c.lineWidth = 2; c.stroke(); c.restore();
      }, tick: p => { if (Math.random() < 0.3) { const a = Math.random() * TAU, r = rnd(10, R * 0.9); V.spawn({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.62, z: 2, vz: rnd(30, 80), life: rnd(0.6, 1), size: rnd(5, 8), size1: 0, color: Math.random() < 0.5 ? FOAM : TEAL2, kind: 'glow', orbit: { x, y, a, r, w: 2.4, dr: -r * 0.5, flat: 0.62 } }); } } });
      vfxLingerSettle(arms, 0.55, 1.2);
      if (cam) cam.punch(0.02, 0.4);
    });
    snd(e, 'maelstrom', d);
  };
  // Tidal Bore: a long wave front rolled out ahead, a foam crest riding its face, heaving forward to the far end where it breaks;
  // higher water (f) rolls it taller and farther
  KIT_VFX.tidalBore = (e, target, d) => {
    const f = (d && d.f) ?? 0.5, a = aimAng(e, target, d), len = 200 + 60 * f, wid = 130 + 30 * f, h = 30 + 36 * f, cam = FX.camFor(e);
    later(e, 0.04, () => {
      V.flash(e.x + Math.cos(a) * 20, bodyY(e), 50, FOAM, 0.24);
      V.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, fx) => {
        const q = easeOut(Math.min(1, p / 0.8)), k = fx.a * Math.min(1, p / 0.08) * (1 - Math.max(0, (p - 0.72) / 0.28)); if (k < 0.02) return;
        const D = 26 + (len - 26) * q, cx = e.x + Math.cos(a) * D, cy = e.y + Math.sin(a) * D, hh = h * (0.5 + 0.5 * Math.sin(Math.min(1, q) * Math.PI * 0.8));
        c.save(); c.translate(cx, cy); c.rotate(a); c.lineJoin = 'round'; c.lineCap = 'round';
        // the front: a long curved crest across the way it travels (x is the way it goes, y across)
        const N = 22, pts = i => { const s = (i / N - 0.5) * wid * (0.6 + 0.4 * q), bend = -Math.pow(s / wid, 2) * 70; return [bend, s]; };
        c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = pts(i); i ? c.lineTo(px, py) : c.moveTo(px, py); } for (let i = N; i >= 0; i--) { const [px, py] = pts(i); c.lineTo(px - 28 * (0.5 + 0.5 * Math.sin(i / N * Math.PI)), py); } c.closePath();
        const gr = c.createLinearGradient(0, 0, -28, 0); gr.addColorStop(0, rgba(FOAM, 0.85)); gr.addColorStop(1, rgba(TEAL, 0.5)); c.globalAlpha = k; c.fillStyle = gr; c.fill();
        c.globalAlpha = 0.7 * k; c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = pts(i); i ? c.lineTo(px - 28 * (0.5 + 0.5 * Math.sin(i / N * Math.PI)), py) : c.moveTo(px - 28 * (0.5 + 0.5 * Math.sin(i / N * Math.PI)), py); } c.stroke();
        c.globalAlpha = k; c.strokeStyle = FOAM; c.lineWidth = 4.2; c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = pts(i); const wob = Math.sin(i * 1.9 - t * 10) * 2.6; i ? c.lineTo(px + wob, py) : c.moveTo(px + wob, py); } c.stroke();
        c.restore(); void hh;
      }, tick: p => { if (p < 0.8 && Math.random() < 0.7) { const D = 26 + (len - 26) * easeOut(p / 0.8), s = rnd(-0.5, 0.5) * wid * 0.7; V.spawn({ x: e.x + Math.cos(a) * D - Math.sin(a) * s, y: e.y + Math.sin(a) * D + Math.cos(a) * s, z: rnd(4, 18), vz: rnd(20, 70), vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.5, size: rnd(5, 9), size1: 0, color: Math.random() < 0.5 ? FOAM : TEAL2, kind: 'drop', add: false, rot: 0 }); } } });
      FX.later(0.7, () => { V.setScale(cam ? 1 : 0.6); try { const bx = e.x + Math.cos(a) * len, by = e.y + Math.sin(a) * len; V.hit(bx, by, TEAL2, 0.8); rollRing(bx, by, { r0: 10, r: 60, dur: 0.5, w: 4 }); drops(bx, by, { n: 10, speed: 140, up: 220 }); } finally { V.setScale(1); } });
      for (const w of party()) { const rel = Math.atan2(w.y - e.y, w.x - e.x), dist = Math.hypot(w.x - e.x, w.y - e.y); if (w !== e && Math.abs(Math.atan2(Math.sin(rel - a), Math.cos(rel - a))) < 0.7 && dist < len + 40) FX.later(0.1 + dist / 320, () => { V.setScale(cam ? 1 : 0.6); try { allyLand(w, { s: 1, strong: true }); } finally { V.setScale(1); } }); }
      if (cam) cam.punch(0.03, 0.4);
    });
    snd(e, 'bore', d);
  };
  // Drowned Bell: the Deep Shield breaks and rings: a bell of dark teal water hangs over the hero, tolls once and bursts into a ring and
  // a fall of bubbles that heals the party
  KIT_VFX.deepBell = (e) => {
    const cam = FX.camFor(e);
    V.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, fx) => {
      const up = easeOut(Math.min(1, p / 0.25)), k = fx.a * Math.min(1, p / 0.1) * (1 - Math.max(0, (p - 0.55) / 0.45)), sw = Math.sin(p * 30) * 0.12 * (1 - p), R = 15 * up; if (k < 0.02) return;
      c.save(); c.translate(e.x, e.y - 62); c.rotate(sw); c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-R, 10); c.bezierCurveTo(-R, -4, -R * 0.5, -16, 0, -16); c.bezierCurveTo(R * 0.5, -16, R, -4, R, 10); c.lineTo(R * 1.2, 14); c.lineTo(-R * 1.2, 14); c.closePath();
      c.globalAlpha = k; c.fillStyle = UNDER; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      c.fillStyle = rgba(FOAM, 0.6); c.beginPath(); c.ellipse(-R * 0.4, -4, 2.4, 7, 0.2, 0, TAU); c.fill(); c.fillStyle = PEARL; c.beginPath(); c.arc(0, 17, 3, 0, TAU); c.fill(); c.stroke();
      c.restore();
    } });
    FX.later(0.45, () => { V.setScale(cam ? 1 : 0.6); try {
      V.shock(e.x, e.y, { r: 150, color: UNDER, dur: 0.6, w: 6 }); V.shock(e.x, e.y, { r: 100, color: FOAM, dur: 0.5, w: 3, delay: 0.06 });
      for (const w of party()) { V.motes(w.x, w.y, { color: TEAL2, n: 6, r: 18, rise: 0.8 }); healMark(w.x, w.y, 3); V.flash(w.x, bodyY(w), 28, PEARL, 0.2); }
      if (cam) cam.punch(0.02, 0.4);
    } finally { V.setScale(1); } });
    snd(e, 'bell', null);
  };
  // Brine Lash: a Surge's salt flung at the boss: a salt-white starburst, crystals thrown off; bigger with the water
  KIT_VFX.brine = (e, target, d) => {
    const f = (d && d.f) ?? 0.5, t = target || { x: e.x + Math.cos(e.angle || 0) * 200, y: e.y + Math.sin(e.angle || 0) * 200 }, g = G(), r = g && g.raid, p = r && r.state === 'live' && r.bossDraw ? { x: r.bossDraw.x, y: r.bossDraw.y } : t;
    later(e, 0.3, () => { lash(e.x, e.y, p.x, p.y, { dur: 0.24, bow: 30, color: FOAM, onHit: (x, y) => { foamBurst(x, y, { s: 0.8 + 0.5 * f }); for (let i = 0; i < 8; i++) V.spawn({ x, y, z: 14, vx: rnd(-120, 120), vy: rnd(-80, 80), vz: rnd(60, 200), g: 460, life: 0.7, size: rnd(5, 8), color: '#ffffff', kind: 'shard', add: false }); } }); });
  };
  // Spindrift: a second, smaller lash of spray after the first, high water thrown after it
  KIT_VFX.spindrift = (e, target) => {
    const g = G(), r = g && g.raid, p = r && r.state === 'live' && r.bossDraw ? { x: r.bossDraw.x, y: r.bossDraw.y } : target;
    if (!p) return;
    lash(e.x + 10, e.y - 6, p.x, p.y, { dur: 0.22, bow: 16, color: FOAM, onHit: (x, y) => foamBurst(x, y, { s: 0.55 }) });
  };
  // Moon Pull: a raidwide heals through and the moon draws the tide up a little: a pearl crescent rises off the ring at the feet
  KIT_VFX.moonPull = (e) => {
    tm(e, { f0: Math.min(1, ((e.st && e.st.tm && e.st.tm.f0) || 0.3) + 0.1) });
    V.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, fx) => {
      const k = fx.a * Math.sin(p * Math.PI), y = e.y - 18 - 38 * easeOut(p); if (k < 0.02) return;
      c.save(); c.translate(e.x, y); c.globalAlpha = k; c.fillStyle = PEARL; c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 9, 0.9, TAU - 0.9); c.arc(4, 0, 7, TAU - 1.1, 1.1, true); c.closePath(); c.fill(); c.stroke(); c.restore();
      V.glowAt(c, e.x, y, 18, PEARL, 0.3 * k);
    } });
    rollRing(e.x, e.y, { r0: 14, r: 44, dur: 0.6, w: 3, color: PEARL, beads: false });
  };
})();

// ======================================================================= Kenseier (tank, class 22): the Beat
// Ash and ember. Colours: ash grey and charcoal for the cloak and the dull blows, ember orange (#ff8a3d) for the blade's fire, white-gold
// for the clean ones. A Perfect deflect is a bright white-orange spark and a short ring; a Good one a duller grey spark; a miss a thin
// whiff of ash. A Break cracks across the boss in gold and holds for as long as it lasts; the Deathblow is one long slash with an ember
// trail that fades behind it (and a brief hush of the screen, never a shake); Thousand Cuts a ring of a thousand thin cuts. Nothing here
// is painted on the floor beyond a thin ring, and nothing is red or blue (those are telegraphs). The kit's moments (every name starts
// with ken-) land here as KIT_VFX: ken-perfect, ken-good, ken-miss, ken-pass, ken-break, ken-off, ken-deathblow, ken-pommel, ken-redirect,
// ken-iai, ken-iai-stance, ken-mantle, ken-blaze, ken-guard, ken-duel, ken-step, ken-spin, ken-thousand. The class's cues go through
// SoundHooks.kenseier.
(() => {
  const V = VFX, TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const ASH = '#8a8478', GREY = '#b8b2a8', DUST = '#d8d0c4', CHAR = '#2b2926', SOOT = '#14110f', EMB = '#ff8a3d', EMB2 = '#ffb070', GOLD = '#ffd27a', WGOLD = '#fff0c0', HOT = '#ffe2a0';
  const later = (e, d, fn) => { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); };
  const G = () => (typeof window !== 'undefined' && window.__game) || null;
  const isMe = e => { const g = G(); return !!g && e === g.player; };
  const snd = (e, ev, d) => { try { if (typeof SoundHooks !== 'undefined' && SoundHooks.kenseier) SoundHooks.kenseier(ev, d, isMe(e), e, e.id); } catch (err) { /* sound never stops a frame */ } };
  const ok = Number.isFinite;
  const bodyY = e => e.y - 14 - (e.lift || 0);
  const bossPos = () => { const g = G(), r = g && g.raid; return r && r.state === 'live' && r.bossDraw ? { x: r.bossDraw.x, y: r.bossDraw.y } : null; };
  const foe = t => (t && ok(t.x) && ok(t.y) ? { x: t.x, y: t.y } : bossPos());
  const front = (e, d) => { const a = e.angle || 0; return { x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.8 }; };
  const BR = () => (typeof FIGHT !== 'undefined' && FIGHT.BOSS_R) || 70;

  // ---- pieces
  // metal on metal where a blow is met: a star, a flash, a spray of sparks and a short ring standing at the point of contact (x, y on the floor, z up)
  function clash(x, y, o = {}) {
    const s = o.s ?? 1, col = o.color || EMB, core = o.core || WGOLD, z = o.z ?? 26;
    V.spawn({ x, y, z, life: 0.2, size: 50 * s, size1: 12 * s, color: core, kind: 'star', vr: 3 });
    V.flash(x, y - z, 32 * s, col, 0.14);
    V.sparks(x, y, { color: o.spark || col, n: Math.round((o.n ?? 9) * s), speed: 330 * s, z, up: 150, life: 0.9, size: 8 });
    V.shock(x, y - z, { r0: 4, r: 36 * s, color: o.ring || col, dur: o.dur ?? 0.24, w: 2.6, layer: 'air', flat: 1 });
  }
  // a thin slash from a to b (screen points): the head runs ahead in `run`s, the stroke is thickest in the middle, an ink under it, an ember body and a
  // white-gold edge, and the older end fades first so an ember trail is left behind it, shedding embers. onHit runs as the head lands
  function streak(ax, ay, bx, by, o = {}) {
    const dur = o.dur ?? 0.9, run = o.run ?? 0.12, W = o.w ?? 5, bow = o.bow ?? 8, col = o.color || EMB, core = o.core || WGOLD, N = o.n ?? 16, embers = o.embers ?? 0.5;
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const at = q => [ax + dx * q + nx * Math.sin(q * Math.PI) * bow, ay + dy * q + ny * Math.sin(q * Math.PI) * bow];
    return V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const head = Math.min(1, t / run), fade = Math.max(0, 1 - Math.max(0, t - run) / (dur - run)), hq = Math.floor(head * N);
      if (e.a * fade < 0.02) return;
      c.save(); c.lineCap = 'round';
      for (const [cl, wm, al, add] of [[SOOT, 2.2, 0.3, false], [col, 1.25, 0.75, true], [core, 0.5, 0.95, true]]) {
        c.strokeStyle = cl; c.globalCompositeOperation = add ? 'lighter' : 'source-over';
        for (let i = 0; i < hq; i++) {
          const q0 = i / N, q1 = (i + 1) / N, qm = (q0 + q1) / 2, kk = e.a * Math.pow(fade, 1.6 - qm * 0.9);
          c.globalAlpha = Math.min(1, al * kk); c.lineWidth = W * wm * Math.pow(Math.sin(Math.PI * Math.min(0.98, Math.max(0.02, qm))), 0.6) + 0.4;
          const [x0, y0] = at(q0), [x1, y1] = at(q1); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        }
      }
      c.restore();
      if (t < run + 0.12) { const [hx, hy] = at(head), k = e.a * fade; V.glowAt(c, hx, hy, 14 + W * 2, col, 0.7 * k); V.glowAt(c, hx, hy, 6 + W, '#ffffff', 0.8 * k); }
    }, tick: p => {
      const t = p * dur;
      if (embers > 0 && t > run * 0.3 && t < run + 0.6 && Math.random() < embers) { const [px, py] = at(Math.random() * Math.min(1, t / run)); V.spawn({ x: px, y: py + 20, z: 20, vx: rnd(-20, 20), vz: rnd(10, 50), g: 60, life: rnd(0.5, 0.9), size: rnd(3, 6), size1: 0, color: Math.random() < 0.5 ? col : GOLD, kind: 'glow' }); }
    }, done: () => { if (o.onHit) o.onHit(bx, by); } });
  }
  // a lingering effect that follows the same rules everywhere: in over a moment, out over the last stretch, `cut = true` fades it at once (a stance
  // spent, a Break ended early). draw(c, k, t, fx) every frame
  function lingerFx(dur, layer, draw, o = {}) {
    return V.fx({ dur, layer, tick: o.tick, draw: (c, p, t, f) => {
      if (f.cut && f.cutT == null) f.cutT = t;
      const k = f.a * Math.min(1, t / (o.inT ?? 0.15), Math.max(0, (f.dur - t) / (o.outT ?? 0.5))) * (f.cutT != null ? Math.max(0, 1 - (t - f.cutT) / 0.25) : 1);
      if (k > 0.015) draw(c, k, t, f);
    } });
  }
  // the gold crack of a Break: one jagged line across the boss from shoulder to hip with two branches, drawn in over a moment, then held
  // pulsing with light leaking out of it and gold motes falling from it, until the Break ends (or a Deathblow ends it)
  function crackShape(R) {
    const a = [-0.7 * R, -0.95 * R], b = [0.65 * R, 0.9 * R], n = 8, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const main = [a];
    for (let i = 1; i < n; i++) { const q = i / n, j = rnd(-0.12, 0.12) * R; main.push([a[0] + dx * q + nx * j, a[1] + dy * q + ny * j]); }
    main.push(b);
    const out = [main];
    for (const i of [2, 5]) {
      const s = Math.random() < 0.5 ? -1 : 1, pts = [main[i]]; let [x, y] = main[i], ang = Math.atan2(dy, dx) + s * rnd(0.6, 1.1);
      for (let m = 0; m < 3; m++) { ang += rnd(-0.35, 0.35); const l = rnd(0.12, 0.22) * R; x += Math.cos(ang) * l; y += Math.sin(ang) * l; pts.push([x, y]); }
      out.push(pts);
    }
    return out;
  }
  function partial(c, pts, f) {
    const n = pts.length - 1, upto = Math.max(0, Math.min(1, f)) * n;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= n; i++) { if (i <= upto) c.lineTo(pts[i][0], pts[i][1]); else { const q = upto - (i - 1); if (q > 0) c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * q, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * q); break; } }
  }
  function breakCrack(secs) {
    const R = BR(), shape = crackShape(R);
    let last = bossPos() || { x: 0, y: 0 };
    return V.fx({ dur: secs + 0.4, layer: 'air', draw: (c, p, t, f) => {
      if (f.cut && f.cutT == null) f.cutT = t;
      const bp = bossPos() || last; last = bp;
      const k = f.a * Math.min(1, t / 0.05) * Math.max(0, Math.min(1, (f.dur - t) / 0.4)) * (f.cutT != null ? Math.max(0, 1 - (t - f.cutT) / 0.25) : 1);
      if (k < 0.02) return;
      const grow = easeOut(Math.min(1, t / 0.22)), pulse = 0.78 + 0.22 * Math.sin(t * 6), cx = bp.x, cy = bp.y - 34;
      c.save(); c.translate(cx, cy); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [cl, w, al, add] of [[SOOT, 6.5, 0.45, false], [GOLD, 3.4, 0.85, true], [WGOLD, 1.3, 0.95, true]]) {
        c.strokeStyle = cl; c.lineWidth = w; c.globalAlpha = al * k * (add ? pulse : 1); c.globalCompositeOperation = add ? 'lighter' : 'source-over';
        shape.forEach((pts, i) => { partial(c, pts, i ? (grow - 0.35) / 0.65 : grow); c.stroke(); });
      }
      c.restore();
      V.glowAt(c, cx, cy, R * 0.9, GOLD, 0.14 * k * pulse);
    }, tick: () => { const bp = bossPos(); if (bp && Math.random() < 0.25) V.spawn({ x: bp.x + rnd(-0.5, 0.5) * BR(), y: bp.y + rnd(-0.1, 0.5) * BR(), z: rnd(20, 70), vz: rnd(-10, 14), vx: rnd(-6, 6), life: rnd(0.6, 1), size: rnd(3, 6), size1: 0, color: Math.random() < 0.5 ? GOLD : WGOLD, kind: Math.random() < 0.4 ? 'star' : 'glow' }); } });
  }
  // a four-pointed star (the dazed ones circling an Off-balance head)
  function star4(c, x, y, r, fill) {
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, d = i % 2 ? r * 0.38 : r; i ? c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = CHAR; c.lineWidth = 1; c.stroke();
  }
  // a ring of thin cuts through a point: n chords at every angle, staggered over `span`s, each drawn in at once and gone in a moment
  function flurry(x, y, o = {}) {
    const n = o.n ?? 30, R = o.r ?? 100, span = o.span ?? 0.5, ln = Array.from({ length: n }, (_, i) => {
      const th = rnd(0, Math.PI), hl = rnd(0.55, 1) * R, ox = rnd(-0.35, 0.35) * R, oy = rnd(-0.35, 0.35) * R;
      return { dx: Math.cos(th) * hl, dy: Math.sin(th) * hl * 0.8, ox, oy, s: i / n * span + rnd(0, 0.03), w: rnd(1.6, 3) };
    });
    return V.fx({ dur: span + 0.5, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      c.save(); c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
      for (let pass = 0; pass < 2; pass++) {
        c.strokeStyle = pass ? WGOLD : EMB;
        for (const l of ln) {
          const u = t - l.s; if (u < 0 || u > 0.4) continue;
          const g = Math.min(1, u / 0.05), fade = 1 - Math.max(0, (u - 0.05) / 0.35), x0 = x + l.ox - l.dx, y0 = y + l.oy - l.dy;
          c.globalAlpha = (pass ? 0.95 : 0.7) * e.a * fade; c.lineWidth = pass ? l.w * 0.4 : l.w;
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + l.dx * 2 * g, y0 + l.dy * 2 * g); c.stroke();
        }
      }
      c.restore();
    } });
  }

  // ---- the abilities (the cast itself; what comes of it is the moments below)
  const aim = c => Math.atan2(c.ty - c.y, c.tx - c.x);
  const reach = (c, d) => { const a = aim(c), dist = Math.hypot(c.tx - c.x, c.ty - c.y), r = Math.min(d, dist); return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }; };
  ABILITY_VFX.kenseier = {
    // Cut, Rising Cut, Ember Cut: an ember slash each, the second the other way up, the third wider with a white-gold core and a heavier hit
    cut: c => {
      const a = aim(c), s = c.step | 0;
      V.slash(c.x, c.y, a, { r: 52 + s * 8, span: 1.5 + s * 0.4, color: EMB, core: WGOLD, dur: 0.24, w: 0.34 + s * 0.08, flip: s === 1, sparks: 2 + s * 2 });
      c.later(0.08, () => { const p = reach(c, 70); V.hit(p.x, p.y, s === 2 ? EMB2 : EMB, 0.4 + s * 0.2); if (s === 2) V.sparks(p.x, p.y, { color: GOLD, n: 5, speed: 260, up: 160 }); });
    },
    // Deflect: the blade lifted to meet the blow (what it meets is ken-perfect / ken-good / ken-miss)
    deflect: c => { const p = front(c.ent, 24); V.glint(p.x, p.y, { color: WGOLD, size: 16, z: 30 }); V.shock(c.x, c.y, { r0: 8, r: 34, color: GREY, dur: 0.24, w: 2 }); },
    // Mikiri Step: a puff of dust at the boots (the streaks behind are ken-step)
    mikiri: c => { V.smoke(c.x, c.y, { n: 2, r: 8, color: ASH, size: 16, a: 0.4, speed: 40 }); V.shock(c.x, c.y, { r0: 6, r: 40, color: GREY, dur: 0.3, w: 2.4 }); },
    // Deathblow, Pommel and Redirect (one button): the blade drawn in a wide arc (the blow itself is ken-deathblow / ken-pommel / ken-redirect)
    deathblow: c => { V.slash(c.x, c.y, aim(c), { r: 70, span: 2.2, color: WGOLD, core: '#ffffff', dur: 0.28, w: 0.3, sparks: 3 }); },
    // Ash Mantle: a burst of ash round the hero (the cloak is ken-mantle)
    mantle: c => { V.smoke(c.x, c.y, { n: 6, r: 12, color: ASH, size: 22, a: 0.45, speed: 60 }); V.shock(c.x, c.y, { r0: 8, r: 70, color: GREY, dur: 0.5, w: 3 }); },
    // Guard Stance: the blade planted point down, a ring of white-gold from it (the shield plate is ken-guard)
    guard: c => { const p = front(c.ent, 22); V.sparks(p.x, p.y, { color: GOLD, n: 7, speed: 200, z: 2, up: 220 }); V.shock(c.x, c.y, { r0: 8, r: 56, color: GOLD, dur: 0.4, w: 3.4 }); },
    // Iai Stance: the blade sheathed, a thin glint at the hip (the held breath is ken-iai-stance)
    iai: c => { const a = c.ent.angle || 0; V.glint(c.x + Math.sin(a) * 12, c.y - Math.cos(a) * 12, { color: HOT, size: 18, z: 22 }); },
    // Whirlwind Slash: the hero crouches into the spin (the spin is ken-spin)
    whirlwind: c => { V.glint(c.x, c.y, { color: EMB2, size: 20, z: 24 }); V.smoke(c.x, c.y, { n: 2, r: 8, color: ASH, size: 14, a: 0.35, speed: 40 }); },
    // Ember Duel: a spark struck off the blade (the link to the boss is ken-duel)
    duel: c => { const p = front(c.ent, 26); V.glint(p.x, p.y, { color: EMB, size: 20, z: 28 }); V.sparks(p.x, p.y, { color: EMB, n: 5, speed: 220, z: 28, up: 120 }); },
    // Thousand Cuts: the breath drawn, embers pulled to the blade, a white-gold light at the heart (the cuts are ken-thousand, a beat later)
    thousandcuts: c => {
      if (c.cam) { c.cam.dim(0.26, 1.2); c.cam.punch(0.035, 0.4); }
      V.charge(c.x, c.y, { color: EMB2, r: 56, n: 12, dur: 0.3, follow: c.ent });
      V.glint(c.x, c.y, { color: WGOLD, size: 32, z: 40 });
      V.flash(c.x, bodyY(c.ent), 56, EMB, 0.3);
      V.shock(c.x, c.y, { r0: 10, r: 80, color: HOT, dur: 0.45, w: 3 });
    },
  };

  // ---- the moments
  // a Perfect: a bright white-orange spark and a short ring where the blow was met (bigger on a tankbuster, with a ring along the floor); stepping in front
  // of an ally draws a thin ember line from them to you
  KIT_VFX['ken-perfect'] = (e, target, d) => {
    const bust = d && d.b, s = bust ? 1.45 : 1.15, p = front(e, 26);
    clash(p.x, p.y, { s, color: HOT, core: '#ffffff', spark: WGOLD, ring: WGOLD, n: 12 });
    V.shock(p.x, p.y - 26, { r0: 6, r: 56 * s, color: EMB, dur: 0.34, w: 2.2, layer: 'air', flat: 1, delay: 0.03 });
    V.glint(p.x, p.y, { color: '#ffffff', size: 26 * s, z: 26 });
    V.sparks(p.x, p.y, { color: EMB, n: 6, speed: 260, z: 26, up: 120, size: 7 });
    if (bust) { V.shock(e.x, e.y, { r0: 8, r: 76, color: EMB, dur: 0.4, w: 3.4 }); shake(3); } else shake(1.2);
    if (d && d.to != null && target && ok(target.x) && target !== e) {
      streak(target.x, target.y - 14, e.x, e.y - 14, { dur: 0.4, run: 0.1, w: 2.4, bow: 6, color: EMB, core: WGOLD, n: 8, embers: 0.2 });
      V.shock(target.x, target.y, { r0: 6, r: 38, color: GOLD, dur: 0.3, w: 2.2 });
    }
    if (d && d.up) { V.glint(e.x, e.y - 44, { color: WGOLD, size: 24, z: 40 }); V.shock(e.x, e.y, { r0: 10, r: 60, color: GOLD, dur: 0.4, w: 2.4 }); }
    snd(e, 'perfect', d);
  };
  // a Good: a duller grey spark, smaller, ash on the air
  KIT_VFX['ken-good'] = (e, target, d) => {
    const s = d && d.b ? 1.05 : 0.8, p = front(e, 26);
    clash(p.x, p.y, { s, color: GREY, core: DUST, spark: GREY, ring: ASH, n: 6, dur: 0.2 });
    V.smoke(p.x, p.y, { n: 2, r: 4, color: ASH, size: 12, a: 0.35, speed: 28 });
    if (d && d.to != null && target && ok(target.x) && target !== e) streak(target.x, target.y - 14, e.x, e.y - 14, { dur: 0.36, run: 0.1, w: 2, bow: 6, color: GREY, core: DUST, n: 8, embers: 0 });
    snd(e, 'good', d);
  };
  // a press with nothing to meet: a thin grey whiff of the blade and a few flecks of ash falling
  KIT_VFX['ken-miss'] = (e) => {
    const a = e.angle || 0;
    V.slash(e.x, e.y, a, { r: 34, span: 1.1, color: GREY, core: DUST, dur: 0.16, w: 0.2, sparks: 0, ink: 0.4 });
    V.smoke(e.x, e.y, { n: 1, r: 6, color: ASH, size: 12, a: 0.3, speed: 22 });
    for (let i = 0; i < 3; i++) V.spawn({ x: e.x + Math.cos(a) * 26 + rnd(-8, 8), y: e.y + Math.sin(a) * 20 + rnd(-4, 4), z: 26, vz: rnd(-30, 10), vx: rnd(-10, 10), life: 0.5, size: rnd(2, 4), size1: 0, color: DUST, kind: 'glow', add: false });
    snd(e, 'miss', null);
  };
  // Mikiri Step landing: the blow goes through the hero. Thin pale streaks cross the body front to back, a ring and a glint, a few embers
  KIT_VFX['ken-pass'] = (e) => {
    const a = e.angle || 0, ca = Math.cos(a), sa = Math.sin(a), y = bodyY(e);
    for (let i = 0; i < 3; i++) streak(e.x + ca * 42 - sa * (i - 1) * 7, y + sa * 30 + (i - 1) * 7, e.x - ca * 36 - sa * (i - 1) * 7, y - sa * 24 + (i - 1) * 7, { dur: 0.4, run: 0.09, w: 3.4 - i * 0.7, bow: 0, color: DUST, core: '#ffffff', n: 8, embers: 0 });
    V.shock(e.x, e.y, { r0: 8, r: 52, color: EMB2, dur: 0.35, w: 3 });
    V.glint(e.x, e.y, { color: HOT, size: 22, z: 28 });
    V.sparks(e.x, e.y, { color: EMB, n: 6, speed: 220, z: 26, up: 100 });
    snd(e, 'pass', null);
  };
  // Mikiri Step pressed: grey streaks of the step behind the hero and a puff of dust
  KIT_VFX['ken-step'] = (e) => {
    later(e, 0.05, () => {
      const a = (e.angle || 0) + Math.PI, y = bodyY(e);
      for (let i = 0; i < 3; i++) { const o = (i - 1) * 9, L = 54 + i * 10; streak(e.x + Math.cos(a) * 8 - Math.sin(a) * o, y + Math.sin(a) * 6 + Math.cos(a) * o * 0.6, e.x + Math.cos(a) * L - Math.sin(a) * o, y + Math.sin(a) * L * 0.8 + Math.cos(a) * o * 0.6, { dur: 0.34, run: 0.08, w: 2.6, bow: 0, color: GREY, core: DUST, n: 8, embers: 0 }); }
      V.smoke(e.x, e.y, { n: 3, r: 8, color: ASH, size: 16, a: 0.4, speed: 45 });
    });
  };
  // a Break: the boss is cracked across in gold (it holds for as long as the Break lasts), a gold flash and ring and a spray of sparks
  KIT_VFX['ken-break'] = Object.assign((e, target, d) => {
    const b = foe(target), cam = FX.camFor(e), secs = (d && d.s) || 4;
    snd(e, 'break', d);
    if (!b) return;
    if (e._kenCrack) e._kenCrack.cut = true;
    V.flash(b.x, b.y - 34, 90, GOLD, 0.2);
    V.shock(b.x, b.y, { r: 120, color: GOLD, dur: 0.45, w: 5 }); V.shock(b.x, b.y, { r: 80, color: WGOLD, dur: 0.35, w: 2.4, delay: 0.05 });
    V.sparks(b.x, b.y, { color: GOLD, n: 14, speed: 380, z: 34, up: 140 });
    V.glint(b.x, b.y, { color: WGOLD, size: 34, z: 34 });
    e._kenCrack = breakCrack(secs);
    if (cam) { cam.punch(0.025, 0.3); cam.flash('#fff0c0', 0.1, 0.25); }
    shake(2.5);
  }, { atTarget: true });
  // Off-balance: a dull ring of ash, a puff, and three dazed stars circling the head until it passes
  KIT_VFX['ken-off'] = (e) => {
    const DUR = 1.9;
    V.smoke(e.x, e.y, { n: 4, r: 10, color: ASH, size: 20, a: 0.5, speed: 50 });
    V.shock(e.x, e.y, { r0: 8, r: 56, color: ASH, dur: 0.4, w: 3.5 });
    V.flash(e.x, bodyY(e), 36, GREY, 0.16);
    V.fx({ dur: DUR, layer: 'air', draw: (c, p, t, f) => {
      const k = f.a * Math.min(1, t / 0.1, (DUR - t) / 0.35); if (k < 0.02) return;
      c.save(); c.globalAlpha = k;
      for (let i = 0; i < 3; i++) { const an = t * 4.2 + i * TAU / 3; star4(c, e.x + Math.cos(an) * 16, e.y - 46 - (e.lift || 0) + Math.sin(an) * 5, 4.6, i % 2 ? GREY : DUST); }
      c.restore();
    } });
    snd(e, 'off', null);
  };
  // the Deathblow: one long slash across the boss with an ember trail that fades behind it, a soft bloom where it passes the middle, a brief hush of the
  // screen (your own hero only) and no shake. The crack of the Break splits at the same moment (unless it is Thousand Cuts' free one: that Break goes on)
  KIT_VFX['ken-deathblow'] = Object.assign((e, target, d) => {
    const b = foe(target), cam = FX.camFor(e), u = d && d.u;
    snd(e, 'deathblow', d);
    if (!b) return;
    if (!u && e._kenCrack) { e._kenCrack.cut = true; e._kenCrack = null; }
    const R = BR(), cy = b.y - 34, ax = b.x - R * 1.35, ay = cy - R * 0.9, bx = b.x + R * 1.35, by = cy + R * 0.9;
    if (cam) cam.dim(0.16, 0.55);
    streak(ax, ay, bx, by, { dur: 1.1, run: 0.13, w: u ? 8 : 6, bow: 12, color: EMB, core: WGOLD, n: 22, embers: 0.7 });
    later(e, 0.07, () => {
      V.flash(b.x, cy, 64, HOT, 0.26);
      V.sparks(b.x, b.y, { color: GOLD, n: 8, speed: 300, z: 34, up: 160, life: 1.1 });
      V.motes(b.x, b.y, { color: EMB2, n: 6, r: 30, rise: 0.7 });
      if (u) V.shock(b.x, b.y, { r: 110, color: WGOLD, dur: 0.5, w: 3.4 });
    });
  }, { atTarget: true });
  // Pommel: a dull blunt knock at the edge of the boss nearest the hero: a small grey burst, a ring, a little ash
  KIT_VFX['ken-pommel'] = Object.assign((e, target) => {
    const b = foe(target);
    snd(e, 'pommel', null);
    if (!b) return;
    const a = Math.atan2(b.y - e.y, b.x - e.x), r = BR() * 0.7, hx = b.x - Math.cos(a) * r, hy = b.y - Math.sin(a) * r * 0.8;
    V.spikeburst(hx, hy, { r: 34, n: 9, color: GREY, core: WGOLD, ink: CHAR, dur: 0.24, z: 22 });
    V.shock(hx, hy - 22, { r0: 4, r: 30, color: DUST, dur: 0.26, w: 2.4, layer: 'air', flat: 1 });
    V.sparks(hx, hy, { color: DUST, n: 5, speed: 220, z: 22, up: 100 });
    V.smoke(hx, hy, { n: 2, r: 4, color: ASH, size: 14, a: 0.4, speed: 30 });
  }, { atTarget: true });
  // Redirect: the blow turned aside goes back at the boss as an ember streak from the hero's blade, landing in a burst (bigger for a tankbuster)
  KIT_VFX['ken-redirect'] = Object.assign((e, target, d) => {
    const b = foe(target), bust = d && d.b;
    snd(e, 'redirect', d);
    if (!b) return;
    const p = front(e, 22);
    V.glint(p.x, p.y, { color: HOT, size: 22, z: 26 });
    streak(p.x, p.y - 26, b.x, b.y - 30, { dur: 0.6, run: 0.2, w: bust ? 6 : 4.5, bow: -22, color: EMB, core: WGOLD, n: 14, embers: 0.6, onHit: () => {
      V.hit(b.x, b.y - 16, bust ? EMB2 : EMB, bust ? 0.8 : 0.55);
      if (bust) V.spikeburst(b.x, b.y, { r: 62, n: 12, color: EMB, core: WGOLD, ink: CHAR, dur: 0.3, z: 30 });
    } });
  }, { atTarget: true });
  // Iai: the counter-cut after a Perfect, one clean white-gold stroke across the boss and a small hit
  KIT_VFX['ken-iai'] = Object.assign((e, target) => {
    const b = foe(target);
    if (e._kenIai) { e._kenIai.cut = true; e._kenIai = null; }
    snd(e, 'iai', null);
    if (!b) return;
    const a = Math.atan2(b.y - e.y, b.x - e.x), nx = -Math.sin(a), ny = Math.cos(a), cy = b.y - 30, L = BR() * 1.1;
    streak(b.x + nx * L, cy + ny * L * 0.6, b.x - nx * L, cy - ny * L * 0.6, { dur: 0.6, run: 0.08, w: 5, bow: 6, color: HOT, core: '#ffffff', n: 16, embers: 0.4 });
    later(e, 0.05, () => { V.hit(b.x, b.y - 16, HOT, 0.6); V.sparks(b.x, b.y, { color: GOLD, n: 6, speed: 280, z: 30, up: 140 }); });
  }, { atTarget: true });
  // Iai Stance: a ring of held breath draws in round the feet, a glint at the hip, then a thin quiet ring stays until the counter is spent
  KIT_VFX['ken-iai-stance'] = (e) => {
    if (e._kenIai) e._kenIai.cut = true;
    later(e, 0.08, () => {
      V.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, f) => { const R = 70 - 44 * easeOut(p), k = f.a * Math.min(1, p / 0.1) * (1 - p * 0.4); V.neonRing(c, e.x, e.y + 3, R, HOT, 2.4, k, 0.78); } });
      V.glint(e.x, e.y, { color: HOT, size: 24, z: 26 });
      V.motes(e.x, e.y, { color: HOT, n: 6, r: 16, rise: 0.8 });
      e._kenIai = lingerFx(6, 'ground', (c, k, t) => { V.neonRing(c, e.x, e.y + 3, 26 + Math.sin(t * 5) * 1.2, HOT, 1.8, 0.5 * k, 0.78); });
    });
  };
  // Ash Mantle: the cloak is pulled round: ash and a ring, then a soft ash-grey shape holds about the hero with embers running along its hem and flakes of ash
  // lifting off it for as long as the Mantle lasts
  KIT_VFX['ken-mantle'] = (e, target, d) => {
    if (e._kenMantle) e._kenMantle.cut = true;
    later(e, 0.1, () => {
      V.smoke(e.x, e.y, { n: 7, r: 14, color: ASH, size: 24, a: 0.5, speed: 55 });
      V.shock(e.x, e.y, { r0: 8, r: 64, color: GREY, dur: 0.5, w: 3 });
      V.flash(e.x, bodyY(e), 44, DUST, 0.2);
      V.motes(e.x, e.y, { color: DUST, n: 10, r: 24, rise: 0.9, kind: 'glow' });
      e._kenMantle = lingerFx((d && d.dur) || 8, 'air', (c, k, t) => {
        const x = e.x, y = bodyY(e) + 4, sw = Math.sin(t * 2.2);
        c.save(); c.translate(x, y);
        const g = c.createRadialGradient(0, 0, 4, 0, 0, 30); g.addColorStop(0, rgba(ASH, 0)); g.addColorStop(0.7, rgba(ASH, 0.2)); g.addColorStop(1, rgba(GREY, 0.32));
        c.globalAlpha = k; c.fillStyle = g; c.beginPath(); c.ellipse(0, 2, 26, 30 + sw * 1.5, 0, 0, TAU); c.fill();
        c.strokeStyle = rgba(GREY, 0.5); c.lineWidth = 1.4; c.stroke();
        c.restore();
        for (let i = 0; i < 3; i++) { const a = t * 1.3 + i * TAU / 3; V.glowAt(c, x + Math.cos(a) * 26, y + 2 + Math.sin(a) * 30, 6, EMB, 0.55 * k); }
      }, { tick: () => { if (Math.random() < 0.35) V.spawn({ x: e.x + rnd(-20, 20), y: e.y + rnd(-8, 8), z: rnd(6, 40), vz: rnd(10, 40), vx: rnd(-8, 8), life: rnd(0.7, 1.2), size: rnd(3, 6), size1: 0, color: Math.random() < 0.8 ? DUST : EMB, kind: 'glow', add: false }); } });
    });
  };
  // Blazing Mantle: the cloak catches as it ends: a ring of ember and a burst at the hero, and (when you turned blows in it) fire thrown at the boss, bigger for each
  KIT_VFX['ken-blaze'] = Object.assign((e, target, d) => {
    const n = Math.min(5, (d && d.n) || 0), b = foe(target), s = 0.8 + 0.12 * n;
    V.flash(e.x, bodyY(e), 60 * s, EMB, 0.26);
    V.spikeburst(e.x, e.y, { r: 60 * s, n: 12, color: EMB, core: WGOLD, ink: CHAR, dur: 0.34, z: 14 });
    V.shock(e.x, e.y, { r0: 10, r: 96 * s, color: EMB2, dur: 0.5, w: 4 });
    V.motes(e.x, e.y, { color: EMB, n: 8, r: 28, rise: 1.1 });
    if (n > 0 && b) V.missile(e.x, e.y, b.x, b.y, { style: 'fire', color: EMB, speed: 800, size: 0.6 + 0.1 * n, arc: 30, onHit: (x, y) => V.hit(x, y, EMB2, 0.45 + 0.1 * n) });
    snd(e, 'blaze', d);
  }, { atTarget: true });
  // Guard Stance: the blade planted, a ring of gold and a front plate of light held before the hero for the stance's 6s
  KIT_VFX['ken-guard'] = (e) => {
    later(e, 0.08, () => {
      V.flash(e.x, bodyY(e), 50, GOLD, 0.22);
      V.shock(e.x, e.y, { r0: 10, r: 72, color: GOLD, dur: 0.5, w: 4 }); V.shock(e.x, e.y, { r0: 6, r: 46, color: WGOLD, dur: 0.4, w: 2.4, delay: 0.06 });
      V.glint(e.x, e.y, { color: WGOLD, size: 28, z: 40 });
      V.shield(e, { color: GOLD, dur: 6, r: 42, shape: 'front' });
    });
  };
  // Ember Duel: a ring of ember at the hero's feet and a thin dashed line of it running to the boss, drifting toward it, for the duel's 10s
  KIT_VFX['ken-duel'] = (e) => {
    if (e._kenDuel) e._kenDuel.cut = true;
    later(e, 0.05, () => {
      V.flash(e.x, bodyY(e), 50, EMB, 0.22);
      V.shock(e.x, e.y, { r0: 10, r: 90, color: EMB, dur: 0.5, w: 4 });
      e._kenDuel = lingerFx(10, 'ground', (c, k, t) => {
        V.neonRing(c, e.x, e.y + 3, 44 + Math.sin(t * 3) * 1.5, EMB, 1.8, 0.45 * k, 0.78);
        const bp = bossPos();
        if (bp) { c.save(); c.setLineDash([4, 9]); c.lineDashOffset = -t * 18; c.strokeStyle = EMB; c.globalAlpha = 0.28 * k; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(e.x, e.y + 2); c.lineTo(bp.x, bp.y + 2); c.stroke(); c.restore(); }
      });
    });
  };
  // Whirlwind Slash: three crescents of ember turn through a full circle, a ring runs out
  KIT_VFX['ken-spin'] = (e, target, d) => {
    const n = Math.max(1, (d && d.n) || 1);
    for (let i = 0; i < 3; i++) later(e, i * 0.05, () => V.slash(e.x, e.y, (e.angle || 0) + i * TAU / 3, { r: 78, span: 2.0, color: EMB, core: WGOLD, dur: 0.24, sparks: 2 }));
    V.shock(e.x, e.y, { r0: 14, r: 112, color: EMB2, dur: 0.4, w: 3 });
    V.sparks(e.x, e.y, { color: GOLD, n: 5 + Math.min(n, 6) * 2, speed: 300, z: 20, up: 120 });
  };
  // Thousand Cuts: a ring of a thousand thin cuts through the boss, over half a second, ending in a ring of ember and white-gold (the Deathblow that follows is
  // ken-deathblow). Yours is a soft flash and a small push, not a shake
  KIT_VFX['ken-thousand'] = Object.assign((e, target) => {
    const b = foe(target), cam = FX.camFor(e);
    if (!b) return;
    const R = BR(), cy = b.y - 30;
    later(e, 0.15, () => {
      flurry(b.x, cy, { n: 30, r: R * 1.35, span: 0.5 });
      V.shock(b.x, b.y, { r0: 20, r: R * 1.6, color: EMB, dur: 0.6, w: 4, delay: 0.5 }); V.shock(b.x, b.y, { r0: 10, r: R * 1.2, color: WGOLD, dur: 0.5, w: 2.4, delay: 0.55 });
      V.flash(b.x, cy, 90, WGOLD, 0.3);
      if (cam) cam.flash('#fff0c0', 0.12, 0.4);
    });
  }, { atTarget: true });
})();

// ======================================================================= Lanternkeeper (healer, class 21): the Last Light
// Lantern light: warm gold and amber on soot and iron, a white-hot heart in every flame, embers thrown off as sparks, a thin
// ring of light that shows how far a glow reaches (once, when it is lit, and never a filled disc: the floor stays clear so a
// telegraph under it reads, and nothing here is red or blue), rays for a burst, a pale tall beam for the Lighthouse. Wayfarer's
// lights are ember-orange. The lanterns themselves are drawn by arena/lanterns.js (Lamps); this file is the moments. The kit's
// events (every name starts with lk-) land here as KIT_VFX: lk-place, lk-hang, lk-flare, lk-carry, lk-relight, lk-trim,
// lk-ember, lk-snuff, lk-lighthouse, lk-lighthouseEnd, lk-stride, lk-drop, lk-trail, lk-festival, lk-wisp, lk-eternal,
// lk-sparks, lk-pillar, lk-pilgrim. The hero's picture reads Lighthouse and Stride from them (e.st.lk: heroes.js
// lanternkeeperLevel), and the class's cues go through SoundHooks.lanternkeeper.
(() => {
  const V = VFX, TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const AMBER = '#ffc46b', GOLD = '#ffd27a', EMB = '#ff9a3a', PALE = '#fff0c8', IRON = '#2b2620', BRASS = '#b98f45', ROAD = '#ff9f5a', SMOKE = '#8a8078';
  const later = (e, d, fn) => { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); };
  const G = () => (typeof window !== 'undefined' && window.__game) || null;
  const isMe = e => { const g = G(); return !!g && e === g.player; };
  const party = () => { const l = typeof FX.party === 'function' ? FX.party() : [FX.me]; return (l || []).filter(w => w && w.x != null); };
  const snd = (e, ev, d) => { try { if (typeof SoundHooks !== 'undefined' && SoundHooks.lanternkeeper) SoundHooks.lanternkeeper(ev, d, isMe(e), e, e.id); } catch (err) { /* sound never stops a frame */ } };
  const lk = (e, o) => { if (e && e.st) e.st.lk = Object.assign(e.st.lk || {}, o); };
  const ok = v => Number.isFinite(v);
  // where the staff's lantern hangs (heroes.js: the crook at about 22 ahead and 11.5 to the right of the hero), and the lantern at the left hip
  const staff = e => { const a = e.angle || 0, c = Math.cos(a), s = Math.sin(a); return { x: e.x + c * 22 - s * 11.5, y: e.y + s * 22 + c * 11.5 }; };
  const hip = e => { const a = e.angle || 0; return { x: e.x + Math.sin(a) * 13.4, y: e.y - Math.cos(a) * 13.4 }; };
  const bossPos = () => { const g = G(), r = g && g.raid; return r && r.state === 'live' && r.bossDraw ? { x: r.bossDraw.x, y: r.bossDraw.y } : null; };
  const hpf = w => (w.hp != null && w.maxHp ? w.hp / w.maxHp : 1);
  // the caster's lanterns where they stand now: yours from the kit's own list, anyone else's from the host's (arena/lanterns.js)
  function spotsOf(e) {
    const L = typeof Lamps !== 'undefined' ? Lamps : null;
    if (!L || !L.S) return [];
    const raw = isMe(e) ? (L.S.mine || []) : (L.S.others && L.S.others.get(e.id)) || [], us = party(), out = [];
    for (const l of raw) {
      let x = l.x, y = l.y, hung = false;
      if (l.on === 'c') { if (us.length) { x = us.reduce((s, u) => s + u.x, 0) / us.length + (l.ox || 0); y = us.reduce((s, u) => s + u.y, 0) / us.length + (l.oy || 0); } }
      else if (l.on != null) { const w = l.on === 'self' ? e : us.find(u => u.id === l.on); if (!w) continue; x = w.x; y = w.y; hung = true; }
      if (ok(x) && ok(y)) out.push({ x, y, r: l.r || 80, w: (l.w ?? 100) / 100, k: l.k, hung });
    }
    return out;
  }

  // ---- pieces
  // a thin ring of light on the floor, going out: how far a glow reaches
  const ringOut = (x, y, r, o = {}) => V.shock(x, y, { r0: o.r0 ?? 8, r, color: o.color || AMBER, dur: o.dur ?? 0.6, w: o.w ?? 2.2, delay: o.delay, layer: o.layer });
  // thin tapered rays going out from a point, turning slowly, and gone
  function rays(x, y, o = {}) {
    const n = o.n ?? 8, L = o.r ?? 40, col = o.color || PALE, spin = o.spin ?? 0.6, w = o.w ?? 3, z = o.z ?? 0;
    V.fx({ dur: o.dur ?? 0.5, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * (1 - p) * (o.alpha ?? 0.9), len = L * easeOut(Math.min(1, p / 0.5));
      if (k < 0.02) return;
      c.save(); c.translate(x, y - z); c.globalCompositeOperation = 'lighter'; c.fillStyle = col; c.globalAlpha = Math.min(1, k);
      for (let i = 0; i < n; i++) { c.save(); c.rotate(i / n * TAU + t * spin + (o.a0 || 0)); c.beginPath(); c.moveTo(len * 0.12, -w * 0.5); c.lineTo(len, 0); c.lineTo(len * 0.12, w * 0.5); c.closePath(); c.fill(); c.restore(); }
      c.restore();
      V.glowAt(c, x, y - z, L * 0.6, col, 0.3 * k);
    } });
  }
  // a flame that grows, flickers and dies back, standing at a point
  function flameLick(x, y, o = {}) {
    const h0 = o.h ?? 26, w0 = o.w ?? 6, col = o.color || AMBER;
    V.fx({ dur: o.dur ?? 0.6, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const g = Math.pow(Math.sin(Math.min(1, p) * Math.PI), 0.7), h = h0 * g, w = w0 * (0.5 + 0.5 * g);
      if (h < 1) return;
      const sw = Math.sin(t * 20) * w * 0.25;
      c.save(); c.translate(x, y - (o.z ?? 4));
      V.glowAt(c, 0, -h * 0.5, h * 1.1 + 8, col, 0.5 * e.a);
      for (const [s, cl, a] of [[1, col, 0.9], [0.62, PALE, 0.95], [0.3, '#ffffff', 1]]) {
        c.globalAlpha = Math.min(1, a * e.a); c.fillStyle = cl; c.beginPath(); c.moveTo(sw * s, -h * s); c.quadraticCurveTo(w * s, -h * 0.4 * s, 0, 0); c.quadraticCurveTo(-w * s, -h * 0.4 * s, sw * s, -h * s); c.fill();
      }
      c.restore();
    } });
  }
  // a glowing ember flying from a to b on a curve, shedding sparks; onHit runs as it lands
  function orb(ax, ay, bx, by, o = {}) {
    const dur = o.dur ?? 0.3, arc = o.arc ?? 24, col = o.color || AMBER, sz = o.size ?? 1;
    const at = q => [ax + (bx - ax) * q, ay + (by - ay) * q - Math.sin(q * Math.PI) * arc];
    V.fx({ dur, delay: o.delay, layer: 'air', tick: p => { if (Math.random() < 0.7) { const [px, py] = at(p); V.spawn({ x: px, y: py + 10, z: 10, vx: rnd(-20, 20), vy: rnd(-10, 10), vz: rnd(10, 50), life: rnd(0.25, 0.5), size: rnd(4, 8) * sz, size1: 0, color: Math.random() < 0.4 ? PALE : col, kind: 'glow' }); } },
      draw: (c, p, t, e) => { const [px, py] = at(p), [qx, qy] = at(Math.max(0, p - 0.18)); V.streakTo(c, qx, qy, px, py, 4 * sz, col, 0.8 * e.a); V.glowAt(c, px, py, 12 * sz, col, 0.9 * e.a); V.glowAt(c, px, py, 5 * sz, '#ffffff', 0.9 * e.a); },
      done: () => { if (o.onHit) o.onHit(bx, by); } });
  }
  // a jet of flame running from a to b (wavy strands, the head running ahead), a hit where it lands
  function jet(ax, ay, bx, by, o = {}) {
    const dur = o.dur ?? 0.4, d = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / d, ny = (bx - ax) / d;
    V.fx({ dur: dur + 0.16, layer: 'air', draw: (c, p, t, e) => {
      const head = Math.min(1, t / dur), tail = Math.max(0, (t - 0.1) / dur - 0.2), k = e.a * (1 - Math.max(0, (t - dur) / 0.16));
      if (head <= tail || k < 0.02) return;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalCompositeOperation = 'lighter';
      for (const [w, cl, a, amp] of [[6, EMB, 0.5, 6], [3.4, AMBER, 0.85, 4], [1.6, PALE, 1, 2]]) {
        c.globalAlpha = Math.min(1, a * k); c.strokeStyle = cl; c.lineWidth = w; c.beginPath();
        for (let i = 0; i <= 14; i++) { const q = tail + (head - tail) * i / 14, wv = Math.sin(q * 11 - t * 24) * amp; const px = ax + (bx - ax) * q + nx * wv, py = ay + (by - ay) * q + ny * wv; i ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke();
      }
      c.restore();
    }, done: () => { if (o.onHit) o.onHit(bx, by); } });
  }
  // two blades of light closing on a point: the snip of the shears
  function snip(x, y, z = 10) {
    V.fx({ dur: 0.2, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), gap = 9 * (1 - easeOut(Math.min(1, p / 0.6)));
      c.save(); c.translate(x, y - z); c.globalCompositeOperation = 'lighter'; c.strokeStyle = PALE; c.lineCap = 'round'; c.lineWidth = 1.8; c.globalAlpha = Math.min(1, k);
      c.beginPath(); c.moveTo(-9, -gap - 3); c.lineTo(9, gap * 0.3); c.moveTo(-9, gap + 3); c.lineTo(9, -gap * 0.3); c.stroke(); c.restore();
    } });
  }

  // ---- the abilities (the cast itself: the staff, the spark, what flies; what comes of it is the moments below)
  ABILITY_VFX.lanternkeeper = {
    // Trim the Wick: a bolt of ember from the staff's lantern, the shears snipping where it lands
    trim: c => {
      const s = staff(c.ent), d = Math.hypot(c.tx - s.x, c.ty - s.y);
      V.sparks(s.x, s.y - 10, { color: GOLD, n: 3, speed: 140, life: 0.6 });
      orb(s.x, s.y - 12, c.tx, c.ty - 6, { dur: Math.max(0.14, Math.min(0.3, d / 1100)), arc: 10, onHit: (x, y) => { V.hit(x, y, AMBER, 0.8); snip(x, y - 4, 12); } });
    },
    // Set Lantern: the staff swings low, a ring of light opens at the feet (the lantern itself is the 'lk-place' moment)
    set: c => { const s = staff(c.ent); V.glint(s.x, s.y - 14, { color: PALE, size: 20, z: 14 }); ringOut(c.x, c.y, 36, { r0: 6, dur: 0.4, w: 2 }); V.sparks(c.x, c.y, { color: GOLD, n: 4, speed: 150, up: 120 }); },
    // Great Beacon: heavier, a dust ring and a thump of the post going in
    beacon: c => {
      const s = staff(c.ent);
      V.glint(s.x, s.y - 14, { color: PALE, size: 26, z: 14 }); ringOut(c.x, c.y, 54, { r0: 6, dur: 0.45, w: 2.6 });
      V.smoke(c.x, c.y, { n: 3, color: '#8a8478', size: 16, a: 0.35, speed: 30 }); V.sparks(c.x, c.y, { color: GOLD, n: 6, speed: 190, up: 140 });
    },
    // Hand Lantern: a hook of light thrown from the staff to the ally (the lantern hanging is the 'lk-hang' moment)
    hand: c => {
      const s = staff(c.ent), w = c.tent || { x: c.tx, y: c.ty };
      V.sparks(s.x, s.y - 10, { color: GOLD, n: 3, speed: 140, life: 0.6 });
      orb(s.x, s.y - 12, w.x + 14, w.y - 34, { dur: 0.22, arc: 16, color: GOLD, size: 0.8 });
    },
    // Flare: the staff thrown up, rays off its lantern (every lantern bursts in 'lk-flare')
    flare: c => { const s = staff(c.ent); rays(s.x, s.y, { z: 14, r: 40, n: 6, dur: 0.45 }); V.flash(s.x, s.y - 14, 34, PALE, 0.18); },
    // Carry the Flame: a scoop of the staff and a gust of sparks at the feet
    carry: c => { const s = staff(c.ent); V.sparks(s.x, s.y - 8, { color: GOLD, n: 4, speed: 180, up: 100 }); V.glint(s.x, s.y - 14, { color: AMBER, size: 18, z: 14 }); },
    // Trailblaze: an ember-orange streak at the feet as the dash begins
    trail: c => { V.sparks(c.x, c.y, { color: ROAD, n: 8, speed: 220, up: 90, angle: (c.ent.angle || 0) + Math.PI, spread: 0.7 }); ringOut(c.x, c.y, 30, { r0: 6, dur: 0.35, w: 2, color: ROAD }); },
    // Lamplighter's Stride: a stamp of the boot, ember-orange sparks
    stride: c => { V.sparks(c.x, c.y, { color: ROAD, n: 6, speed: 170, up: 110 }); V.glint(c.x, c.y - 24, { color: ROAD, size: 20, z: 24 }); },
    // Relight: a match struck on the staff's lantern, the flame jumping (the lanterns relighting is the 'lk-relight' moment)
    relight: c => { const s = staff(c.ent); V.sparks(s.x, s.y - 12, { color: '#ffe9b0', n: 6, speed: 220, up: 140 }); V.flash(s.x, s.y - 14, 30, PALE, 0.18); },
    // Will-o'-the-Wisp: a pale spark lifts off the lantern (the wisp is the 'lk-wisp' moment)
    wisp: c => { const s = staff(c.ent); V.glint(s.x, s.y - 18, { color: PALE, size: 22, z: 18 }); V.motes(s.x, s.y, { color: PALE, n: 4, r: 8, rise: 0.9 }); },
    // Lantern Festival: the staff raised, a fan of sparks thrown up
    festival: c => { const s = staff(c.ent); rays(s.x, s.y, { z: 14, r: 36, n: 5, dur: 0.5, color: AMBER }); V.sparks(s.x, s.y - 12, { color: GOLD, n: 8, speed: 150, up: 260, spread: 0.6, angle: -Math.PI / 2 }); },
    // Lighthouse: the staff raised high, a flare of white-gold, three rings of light going out across the room (thin and in the air, so no telegraph is hidden)
    lighthouse: c => {
      const s = staff(c.ent), cam = c.cam;
      if (cam) { cam.flash('#fff2cf', 0.2, 0.5); cam.punch(0.05, 0.5); }
      V.flash(s.x, s.y - 16, 90, PALE, 0.3); rays(s.x, s.y, { z: 16, r: 70, n: 10, dur: 0.7, w: 4 });
      for (let i = 0; i < 3; i++) V.shock(c.x, c.y - 20, { r0: 14, r: 150 + i * 70, color: i % 2 ? AMBER : PALE, dur: 0.8, w: 2.4, delay: i * 0.1, layer: 'air' });
      V.glint(s.x, s.y - 22, { color: PALE, size: 36, z: 22 });
    },
    // Lighthouse Flare (the Lighthouse's own Flare): the same burst, bigger rays at the staff
    beaconflare: c => { const s = staff(c.ent); rays(s.x, s.y, { z: 14, r: 64, n: 10, dur: 0.55, w: 4 }); V.flash(s.x, s.y - 14, 60, PALE, 0.24); },
  };
  // the auto-attack: a small ember bolt off the staff
  SPARK.lanternkeeper = c => {
    const s = staff(c.ent), d = Math.hypot(c.tx - s.x, c.ty - s.y);
    orb(s.x, s.y - 12, c.tx, c.ty - 6, { dur: Math.max(0.1, Math.min(0.26, d / 1300)), arc: 6, size: 0.55, onHit: (x, y) => V.hit(x, y, AMBER, 0.4) });
  };

  // ---- the moments
  // a lantern set on the floor: the flame takes, sparks fly, and a thin ring shows how far its glow reaches (once). A Great Beacon is
  // a column of light with a thump of dust
  KIT_VFX['lk-place'] = (e, target, d) => {
    const x = d && ok(d.x) ? d.x : e.x, y = d && ok(d.y) ? d.y : e.y, beacon = !!(d && d.kind === 'beacon'), R = beacon ? 150 : 110;
    later(e, 0.05, () => {
      V.flash(x, y - 10, beacon ? 60 : 38, AMBER, 0.24);
      V.sparks(x, y, { color: GOLD, n: beacon ? 12 : 7, speed: 210, up: 170, z: 8 });
      flameLick(x, y, { h: beacon ? 38 : 22, w: beacon ? 8 : 5, z: beacon ? 40 : 14 });
      ringOut(x, y, R, { dur: 0.7, w: 2.2, r0: 10 });
      V.motes(x, y, { color: AMBER, n: 4, r: 10, rise: 0.8 });
      if (beacon) {
        V.pillar(x, y, { r: 16, h: 150, color: GOLD, dur: 0.9 });
        ringOut(x, y, R * 0.6, { dur: 0.55, w: 2, r0: 8, delay: 0.08, color: PALE });
        V.smoke(x, y, { n: 4, color: '#8a8478', size: 18, a: 0.38, speed: 40 });
        shake(2);
      }
    });
  };
  // a Hand Lantern hung on an ally: a hook of light settles on their shoulder, a warm ring opens round them
  KIT_VFX['lk-hang'] = (e, target, d) => {
    const w = target || e;
    later(e, 0.2, () => {
      V.flash(w.x + 14, w.y - 34, 30, GOLD, 0.22); V.glint(w.x + 14, w.y - 38, { color: PALE, size: 22, z: 36 });
      ringOut(w.x, w.y, 90, { dur: 0.6, w: 2.2, r0: 10 });
      V.sparks(w.x + 14, w.y - 34, { color: GOLD, n: 5, speed: 130, up: 90 }); V.plus(w.x, w.y, { color: PALE, n: 2 });
    });
  };
  // Flare: every lantern bursts at once. Rays off each, a ring showing its reach, sparks and a flame; everyone it heals gets a plus and a
  // wash of gold, more for every glow they stand in; with the Lighthouse up it reaches the whole room
  KIT_VFX['lk-flare'] = (e, target, d) => {
    const all = !!(d && d.all), twin = !!(d && d.twin), kk = twin ? 0.6 : 1, spots = spotsOf(e), us = party(), s = staff(e), cam = FX.camFor(e);
    later(e, 0.05, () => {
      rays(s.x, s.y, { z: 14, r: 46 * kk, n: 8, dur: 0.5 }); V.flash(s.x, s.y - 14, 40 * kk, PALE, 0.2);
      for (const l of spots.slice(0, 12)) {
        V.flash(l.x, l.y - 14, 30 + l.r * 0.22, AMBER, 0.28);
        ringOut(l.x, l.y, l.r, { dur: 0.55, w: 2.4 });
        rays(l.x, l.y, { z: 16, r: 26 + l.r * 0.15, n: 7, dur: 0.5, color: GOLD, alpha: 0.8 });
        V.sparks(l.x, l.y, { color: GOLD, n: Math.round(8 * kk), speed: 250, up: 210 });
        flameLick(l.x, l.y, { h: 30 * kk, w: 7, z: l.hung ? 30 : 14 });
      }
      if (!spots.length) ringOut(e.x, e.y, 90, { dur: 0.5 });
      for (const w of us) {
        let n = 0; for (const l of spots) if (all || Math.hypot(w.x - l.x, w.y - l.y) <= l.r) n++;
        if (!n) continue;
        FX.later(0.16, () => { V.setScale(FX.camFor(e) ? 1 : 0.6); try { V.plus(w.x, w.y, { color: PALE, n: Math.min(5, 1 + n) }); V.motes(w.x, w.y, { color: GOLD, n: 2 + n * 2, r: 14, rise: 0.8 }); V.flash(w.x, w.y - 14, 22 + n * 5, GOLD, 0.2); } finally { V.setScale(1); } });
      }
      if (cam && (all || spots.length > 1)) cam.punch(0.015 + 0.01 * Math.min(3, spots.length), 0.3);
      if (all && cam) cam.flash('#fff2cf', 0.1, 0.3);
    });
  };
  // Carry the Flame: a lantern's light is lifted off one spot and thrown to another on a high curve, shedding sparks
  KIT_VFX['lk-carry'] = (e, target, d) => {
    if (!d || !ok(d.fx) || !ok(d.x)) return;
    V.flash(d.fx, d.fy - 12, 30, AMBER, 0.2); V.sparks(d.fx, d.fy, { color: GOLD, n: 5, speed: 170, up: 150 });
    orb(d.fx, d.fy - 18, d.x, d.y - 18, { dur: 0.34, arc: 46, color: GOLD, size: 1.1, onHit: (x, y) => {
      V.flash(x, y - 12, 34, AMBER, 0.22); V.sparks(x, y, { color: GOLD, n: 6, speed: 190, up: 160 }); ringOut(x, y, 60, { dur: 0.45, w: 2 }); flameLick(x, y, { h: 20, w: 5, z: 14 });
    } });
  };
  // Relight: a match is struck, the staff's flame jumps, and every wick is lit again in turn, a flame leaping up each with a glint
  KIT_VFX['lk-relight'] = (e, target, d) => {
    const spots = spotsOf(e), s = staff(e);
    V.sparks(s.x, s.y - 12, { color: '#ffe9b0', n: 5, speed: 180, up: 130 });
    later(e, 0.15, () => {
      flameLick(s.x, s.y, { h: 36, w: 8, z: 14 }); V.flash(s.x, s.y - 14, 46, PALE, 0.22); V.plus(e.x, e.y, { color: PALE, n: 3 });
      spots.slice(0, 10).forEach((l, i) => FX.later(0.05 + i * 0.06, () => {
        V.setScale(FX.camFor(e) ? 1 : 0.6);
        try {
          flameLick(l.x, l.y, { h: 34, w: 7, color: GOLD, z: l.hung ? 30 : 14 }); V.motes(l.x, l.y, { color: GOLD, n: 5, r: 10, rise: 1 });
          ringOut(l.x, l.y, 34, { dur: 0.4, w: 2, r0: 6 }); V.glint(l.x, l.y - 24, { color: PALE, size: 20, z: 24 });
        } finally { V.setScale(1); }
      }));
    });
  };
  // Trim the Wick relit a lantern: a bright pinch of light, a small flame jumping and a glint
  KIT_VFX['lk-trim'] = (e, target, d) => {
    if (!d || !ok(d.x)) return;
    V.flash(d.x, d.y - 12, 22, GOLD, 0.18); V.glint(d.x, d.y - 24, { color: PALE, size: 18, z: 24 });
    V.sparks(d.x, d.y, { color: GOLD, n: 4, speed: 140 }); flameLick(d.x, d.y, { h: 18, w: 4, z: 14, dur: 0.45 });
  };
  // an Ember gained: a spark pops off the lantern at the hip
  KIT_VFX['lk-ember'] = (e) => {
    const h = hip(e);
    V.spawn({ x: h.x, y: h.y, z: 10, vz: 40, life: 0.5, size: 12, size1: 0, color: EMB, kind: 'glow' });
    V.sparks(h.x, h.y, { color: GOLD, n: 3, speed: 110, up: 110, z: 10, life: 0.8 });
    snd(e, 'ember', null);
  };
  // a lantern gone out: its flame shrinks to a red spark and a thread of smoke goes up
  KIT_VFX['lk-snuff'] = (e, target, d) => {
    if (!d || !ok(d.x)) return;
    V.smoke(d.x, d.y, { n: 3, color: '#6a625a', size: 15, a: 0.45, speed: 18 });
    V.motes(d.x, d.y, { color: EMB, n: 2, r: 4, rise: 0.4, size: 6 });
    V.spawn({ x: d.x, y: d.y, z: 12, life: 0.35, size: 12, size1: 0, color: '#c8452a', kind: 'glow' });
    snd(e, 'snuff', d);
  };
  // Lighthouse: a tall pale beam stands up from the staff's lantern for its 8s with a soft glow round it, a ring of light at the
  // feet and motes climbing the beam; the whole party is washed with gold once a second. (Faint on the floor: the beam is a column in
  // the air, nothing sweeps the ground)
  KIT_VFX['lk-lighthouse'] = (e, target, d) => {
    const DUR = 8, cam = FX.camFor(e), sc = cam ? 1 : 0.6;
    lk(e, { light: FX.now + DUR });
    if (e._lkLight) e._lkLight.dur = 0;
    const s0 = staff(e);
    if (cam) cam.flash('#fff2cf', 0.14, 0.4);
    V.flash(s0.x, s0.y - 20, 110, PALE, 0.3);
    e._lkLight = V.fx({ dur: DUR, layer: 'air', draw: (c, p, t, f) => {
      const k = f.a * Math.min(1, p / 0.08, (1 - p) / 0.1); if (k < 0.02) return;
      const s = staff(e), up = easeOut(Math.min(1, t / 0.5)), h = 360 * up, w = 18 + Math.sin(t * 6) * 1.5;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.min(1, 0.5 * k); c.drawImage(V.sprite('column', GOLD), s.x - w, s.y - 8 - h, w * 2, h);
      c.globalAlpha = Math.min(1, 0.55 * k); c.drawImage(V.sprite('column', '#ffffff'), s.x - w * 0.22, s.y - 8 - h * 0.95, w * 0.44, h * 0.95);
      c.restore();
      V.glowAt(c, s.x, s.y - 14, 60, PALE, 0.26 * k);
      V.neonRing(c, e.x, e.y + 3, 26 + Math.sin(t * 3) * 1.5, GOLD, 1.4, 0.5 * k, 0.78);
    }, tick: (p) => {
      if (Math.random() < 0.4) { const s = staff(e); V.spawn({ x: s.x + rnd(-8, 8), y: s.y, z: rnd(10, 120), vz: rnd(30, 70), vx: rnd(-6, 6), life: rnd(0.7, 1.2), size: rnd(4, 8), size1: 0, color: Math.random() < 0.5 ? PALE : GOLD, kind: Math.random() < 0.4 ? 'star' : 'glow' }); }
    } });
    for (let i = 1; i <= 8; i++) FX.later(i, () => { V.setScale(sc); try { for (const w of party()) { V.motes(w.x, w.y, { color: GOLD, n: 2, r: 14, rise: 0.7 }); if (i % 2 === 0) V.plus(w.x, w.y, { color: PALE, n: 1 }); } } finally { V.setScale(1); } });
  };
  // the Lighthouse goes dark: the beam folds down into the lantern, a ring drawn in and a last glint
  KIT_VFX['lk-lighthouseEnd'] = (e) => {
    if (e._lkLight) { e._lkLight.dur = 0; e._lkLight = null; }
    lk(e, { light: 0 });
    const s = staff(e);
    V.glint(s.x, s.y - 20, { color: PALE, size: 26, z: 20 }); V.motes(s.x, s.y, { color: GOLD, n: 6, r: 10, rise: 1.2 });
    V.fx({ dur: 0.6, layer: 'ground', draw: (c, p, t, f) => { const R = 70 - 50 * easeOut(p), k = f.a * (1 - p) * 0.5; if (k < 0.02) return; V.neonRing(c, e.x, e.y + 3, R, GOLD, 1.6, k, 0.78); } });
    snd(e, 'end', null);
  };
  // Lamplighter's Stride begins: ember-orange sparks at the boots and a ring of light, for the 10s the lights fall behind you
  KIT_VFX['lk-stride'] = (e) => {
    lk(e, { stride: FX.now + 10 });
    V.flash(e.x, e.y - 8, 34, ROAD, 0.2); ringOut(e.x, e.y, 38, { r0: 8, dur: 0.45, w: 2.2, color: ROAD });
    V.sparks(e.x, e.y, { color: ROAD, n: 7, speed: 180, up: 110 }); V.motes(e.x, e.y, { color: ROAD, n: 4, r: 10, rise: 0.8 });
  };
  // a small light dropped behind a walker: a little flame catching, quick and cheap
  KIT_VFX['lk-drop'] = (e, target, d) => {
    if (!d || !ok(d.x)) return;
    V.flash(d.x, d.y - 8, 16, ROAD, 0.15); flameLick(d.x, d.y, { h: 12, w: 3.5, dur: 0.4, z: 6, color: ROAD });
    V.motes(d.x, d.y, { color: AMBER, n: 2, r: 5, rise: 0.5, size: 6 });
    snd(e, 'drop', null);
  };
  // Trailblaze dragged the small lights along: a streak of ember-orange from where each stood to where it stands, and a glint at each end
  KIT_VFX['lk-trail'] = (e, target, d) => {
    const dx = d && ok(d.dx) ? d.dx : 0, dy = d && ok(d.dy) ? d.dy : 0;
    V.sparks(e.x, e.y, { color: ROAD, n: 8, speed: 220, up: 90, angle: Math.atan2(-dy, -dx), spread: 0.6 });
    for (const l of spotsOf(e).filter(l => l.k === 3).slice(0, 8)) {
      V.fx({ dur: 0.45, layer: 'air', draw: (c, p, t, f) => { const k = f.a * (1 - p) * 0.8; if (k < 0.02) return; V.streakTo(c, l.x - dx * (1 - easeOut(p)), l.y - dy * (1 - easeOut(p)) - 10, l.x, l.y - 10, 3, ROAD, k); } });
      V.glint(l.x, l.y - 14, { color: ROAD, size: 16, z: 14 });
    }
  };
  // Lantern Festival: five paper lanterns released: a flare at the staff and a glint of light at each as it lifts
  KIT_VFX['lk-festival'] = (e) => {
    const s = staff(e), cam = FX.camFor(e);
    V.flash(s.x, s.y - 14, 60, AMBER, 0.28); rays(s.x, s.y, { z: 14, r: 48, n: 6, dur: 0.5, color: AMBER });
    later(e, 0.1, () => {
      for (const l of spotsOf(e).filter(l => l.k === 4).slice(0, 5)) { V.flash(l.x, l.y - 30, 26, AMBER, 0.22); V.glint(l.x, l.y - 34, { color: PALE, size: 18, z: 34 }); V.sparks(l.x, l.y - 24, { color: GOLD, n: 3, speed: 90, up: 80 }); }
      V.motes(e.x, e.y, { color: AMBER, n: 8, r: 40, rise: 1 });
      if (cam) cam.punch(0.02, 0.3);
    });
  };
  // Will-o'-the-Wisp: a pale flame lifts off the lantern and drifts to the most hurt ally, then rides over their shoulder for its 6s
  // giving a small pulse of light each second
  KIT_VFX['lk-wisp'] = (e) => {
    const us = party().filter(w => w !== e), w = us.length ? us.reduce((a, b) => (hpf(b) < hpf(a) ? b : a)) : e, s = staff(e), FLY = 0.7, DUR = 6.7;
    const sc = FX.camFor(e) ? 1 : 0.6;
    V.fx({ dur: DUR, layer: 'air', tick: () => { if (Math.random() < 0.5) { V.spawn({ x: w.x, y: w.y - 40, z: 6, vz: rnd(10, 40), life: rnd(0.4, 0.7), size: rnd(3, 6), size1: 0, color: PALE, kind: 'glow' }); } },
      draw: (c, p, t, f) => {
        const k = f.a * Math.min(1, t / 0.1, (DUR - t) / 0.4); if (k < 0.02) return;
        const q = Math.min(1, t / FLY), hx = w.x + Math.cos(t * 2.2) * 14, hy = w.y - 40 + Math.sin(t * 3) * 3 - (w.lift || 0);
        const x = q < 1 ? s.x + (hx - s.x) * easeOut(q) : hx, y = q < 1 ? s.y - 14 + (hy - s.y + 14) * easeOut(q) - Math.sin(q * Math.PI) * 26 : hy;
        V.glowAt(c, x, y, 17, PALE, 0.55 * k); V.glowAt(c, x, y, 7, '#ffffff', 0.8 * k);
        c.save(); c.globalAlpha = Math.min(1, 0.9 * k); c.fillStyle = '#fffbea'; c.beginPath(); c.moveTo(x + Math.sin(t * 12) * 0.8, y - 7); c.quadraticCurveTo(x + 3.4, y - 1, x, y + 3); c.quadraticCurveTo(x - 3.4, y - 1, x + Math.sin(t * 12) * 0.8, y - 7); c.fill(); c.restore();
      } });
    for (let i = 1; i <= 6; i++) FX.later(FLY + i * 0.9, () => { V.setScale(sc); try { V.plus(w.x, w.y, { color: PALE, n: 1 }); V.motes(w.x, w.y, { color: PALE, n: 3, r: 10, rise: 0.8 }); ringOut(w.x, w.y, 28, { dur: 0.4, w: 1.8, r0: 6, color: PALE }); } finally { V.setScale(1); } });
  };
  // the Eternal Lamp is lit: a column of white-gold, rings of light, a long glint; the lamp stays for the rest of the pull
  KIT_VFX['lk-eternal'] = (e, target, d) => {
    const x = d && ok(d.x) ? d.x : e.x, y = d && ok(d.y) ? d.y : e.y;
    later(e, 0.2, () => {
      V.pillar(x, y, { r: 20, h: 220, color: PALE, dur: 1.2 }); V.flash(x, y - 14, 80, PALE, 0.3);
      ringOut(x, y, 110, { dur: 0.8, w: 2.4, color: PALE }); ringOut(x, y, 60, { dur: 0.6, w: 2, delay: 0.1, color: GOLD });
      V.glint(x, y - 36, { color: PALE, size: 34, z: 36 }); V.motes(x, y, { color: PALE, n: 8, r: 14, rise: 1 });
    });
    snd(e, 'eternal', null);
  };
  // Trailing Sparks: a small light you walked back through flares and throws sparks, one flying to the boss
  KIT_VFX['lk-sparks'] = (e, target, d) => {
    if (!d || !ok(d.x)) return;
    V.sparks(d.x, d.y, { color: GOLD, n: 10, speed: 300, up: 250 }); V.hit(d.x, d.y - 6, AMBER, 0.5);
    const b = bossPos();
    if (b) orb(d.x, d.y - 14, b.x, b.y, { dur: 0.3, arc: 30, size: 0.7, onHit: (x, y) => V.hit(x, y, AMBER, 0.45) });
    snd(e, 'sparks', null);
  };
  // Pillar of Flame: a jet of fire from a Great Beacon's head to the boss in its glow, a hit and embers where it lands
  KIT_VFX['lk-pillar'] = (e, target, d) => {
    if (!d || !ok(d.x)) return;
    const b = bossPos(), hx = d.x, hy = d.y - 50;
    V.flash(hx, hy, 34, EMB, 0.2);
    if (b) jet(hx, hy, b.x, b.y - 8, { dur: 0.36, onHit: (x, y) => { V.hit(x, y, '#ffb050', 0.55); V.sparks(x, y, { color: GOLD, n: 5, speed: 200, up: 180 }); } });
    else flameLick(d.x, d.y, { h: 44, w: 8, z: 44 });
    snd(e, 'pillar', null);
  };
  // Pilgrim's Pace: five seconds on the move and the next Flare is stronger: a glint over the head and a ring at the boots
  KIT_VFX['lk-pilgrim'] = (e) => {
    V.glint(e.x, e.y - 44, { color: PALE, size: 22, z: 40 }); ringOut(e.x, e.y, 32, { r0: 6, dur: 0.45, w: 2, color: ROAD });
    V.motes(e.x, e.y, { color: ROAD, n: 4, r: 10, rise: 0.9 });
    snd(e, 'pilgrim', null);
  };
})();

// ======================================================================= Houndmaster (melee DPS, class 23): the Pack
// Moss and leather, bone and rust. A whistle is two thin curved lines of notes running from the Houndmaster to the hound it calls (cream for
// Flank, moss green for Hold, rust for Pounce, ash for Call Off). The finisher is read from the pair: Rend two bundles of claw lines
// crossing on the boss in gold, Hamstring a low green cut at its feet with dust kicked up as it stumbles, Bring Down both hounds leaping and
// a dust ring in lilac and bone, Snap a single clean bite. The hounds themselves are drawn by arena/kennel.js (Kennel.act poses them: a
// bite, a leap, a bark, a howl); everything here is the light, dust and lines around them. Nothing is painted red or blue on the floor (those
// are telegraphs); the pair colours are gold, green and lilac. The kit's moments (k.fx names) land as KIT_VFX: whistle, bite, finisher,
// pounce, calloff, relay, houndDown, houndUp, quarry, wildhunt, mount, ridedown, howl, longchase. The class's cues go through
// SoundHooks.houndmaster (whistles, barks, bites, the horn).
(() => {
  const V = VFX, TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), shake = s => vfxShake(s);
  const LEAF = '#9ad46a', MOSSL = '#b8d49a', BONE = '#f2e6c8', ASH = '#b8b2a8', RUST = '#c46a3a', RUST2 = '#e8905a', GOLD = '#f0c050', LILAC = '#c8a8ff', SPECT = '#bfe9ff', DUST = '#cfc4ae', SOOT = '#14100c', TANL = '#d8b684';
  const PAIRC = { rend: GOLD, hamstring: LEAF, bringdown: LILAC, snap: BONE };
  const NOTEC = { flank: [BONE, ASH], hold: [MOSSL, LEAF], pounce: [RUST2, RUST], call: [ASH, DUST] };
  const later = (e, d, fn) => { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); };
  const G = () => (typeof window !== 'undefined' && window.__game) || null;
  const isMe = e => { const g = G(); return !!g && e === g.player; };
  const ownerOf = e => (e && e.kind === 'player' ? (typeof Net !== 'undefined' ? Net.id : 0) : e && e.id);
  const snd = (e, ev, d) => { try { if (typeof SoundHooks !== 'undefined' && SoundHooks.houndmaster) SoundHooks.houndmaster(ev, d, isMe(e), e, e.id); } catch (err) { /* sound never stops a frame */ } };
  const ok = Number.isFinite;
  const BR = () => (typeof FIGHT !== 'undefined' && FIGHT.BOSS_R) || 70;
  const bossPos = () => { const g = G(), r = g && g.raid; return r && r.state === 'live' && r.bossDraw ? { x: r.bossDraw.x, y: r.bossDraw.y } : null; };
  const foe = (t, e) => (t && ok(t.x) && ok(t.y) ? { x: t.x, y: t.y } : bossPos() || { x: e.x + Math.cos(e.angle || 0) * 90, y: e.y + Math.sin(e.angle || 0) * 90 });
  const hounds = e => (typeof Kennel !== 'undefined' ? Kennel.houndsOf(ownerOf(e), typeof Net !== 'undefined' ? Net.id : 0) : []);
  const houndAt = (e, id) => hounds(e).find(h => h.id === id) || null;
  const pose = (e, id, kind) => { if (typeof Kennel !== 'undefined') Kennel.act(ownerOf(e), id, kind, FX.now || 0); };
  const bodyY = e => e.y - 14 - (e.lift || 0);
  const aim = c => Math.atan2(c.ty - c.y, c.tx - c.x);
  const reach = (c, d) => { const a = aim(c), dist = Math.hypot(c.tx - c.x, c.ty - c.y), r = Math.min(d, dist); return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }; };

  // ---- pieces
  // the notes of a whistle: two thin curved lines from a to b (a floor point each), a few note-heads riding along them, a small ring where it lands
  function notes(a, b, kind, o = {}) {
    const [c1, c2] = NOTEC[kind] || NOTEC.flank, dur = o.dur ?? 0.8, bow = o.bow ?? 30, sgn = o.dir || (Math.random() < 0.5 ? 1 : -1);
    const ax = a.x, ay = a.y - 24, bx = b.x, by = b.y - 12, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const mx = (ax + bx) / 2 + nx * bow * sgn, my = (ay + by) / 2 + ny * bow * sgn - 12;
    const pt = (u, off) => [(1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx + nx * off, (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by + ny * off];
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = Math.min(1, t / 0.3), k = e.a * Math.min(1, (1 - p) / 0.5);
      if (k < 0.02) return;
      c.save(); c.lineCap = 'round';
      for (const [cl, off, w] of [[c1, -2, 1.8], [c2, 2.4, 1.4]]) {
        c.strokeStyle = SOOT; c.globalAlpha = 0.3 * k; c.lineWidth = w + 2;
        c.beginPath(); for (let i = 0; i <= 16; i++) { const [x, y] = pt(q * i / 16, off); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
        c.strokeStyle = cl; c.globalAlpha = 0.85 * k; c.lineWidth = w; c.setLineDash([9, 5]); c.lineDashOffset = -t * 40;
        c.beginPath(); for (let i = 0; i <= 16; i++) { const [x, y] = pt(q * i / 16, off); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.setLineDash([]);
      }
      // note-heads: a round head with a stem and a flag, riding the curve
      for (let i = 0; i < 3; i++) {
        const u = Math.min(q, ((t * 1.4 + i / 3) % 1) * q);
        if (u < 0.04) continue;
        const [x, y] = pt(u, 0), bob = Math.sin(t * 14 + i * 2) * 2;
        c.globalAlpha = k * Math.sin(Math.min(1, u / q) * Math.PI) * 0.95; c.fillStyle = i % 2 ? c1 : c2; c.strokeStyle = SOOT; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(x, y + bob, 3, 2.3, -0.4, 0, TAU); c.fill(); c.stroke();
        c.strokeStyle = i % 2 ? c1 : c2; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 2.6, y + bob - 1); c.lineTo(x + 2.6, y + bob - 9); c.quadraticCurveTo(x + 6.5, y + bob - 8, x + 5.5, y + bob - 4); c.stroke();
      }
      c.restore();
    } });
    const sc = typeof V.scale === 'number' ? V.scale : 1;
    FX.later(0.3, () => { V.setScale(sc); try { V.shock(bx, b.y, { r0: 4, r: 24, color: c1, dur: 0.3, w: 2 }); V.glint(bx, b.y, { color: c1, size: 14, z: 20 }); } finally { V.setScale(1); } });
  }
  // a lens of light from (x0, y0) to (x1, y1), thickest in the middle: one claw line
  function lens(c, x0, y0, x1, y1, w) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx + nx / L * w, my + ny / L * w, x1, y1); c.quadraticCurveTo(mx - nx / L * w * 0.2, my - ny / L * w * 0.2, x0, y0); c.fill(); }
  // claw lines through a point: `n` parallel strokes along each of the given angles, drawn in over 0.1s, then fading. col is the main colour
  function claws(x, y, angs, o = {}) {
    const n = o.n ?? 3, len = o.len ?? 70, gap = o.gap ?? 11, col = o.color || GOLD, core = o.core || '#ffffff', dur = o.dur ?? 0.55, delay = o.delay;
    V.fx({ dur, delay, layer: 'air', draw: (c, p, t, e) => {
      const g = Math.min(1, t / 0.1), k = e.a * (1 - Math.max(0, (p - 0.35) / 0.65));
      if (k < 0.02) return;
      c.save(); c.translate(x, y);
      angs.forEach((a, ai) => {
        const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, st = ai * 0.06;
        const gg = Math.max(0, Math.min(1, (t - st) / 0.1));
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * gap, x0 = nx * off - ca * len / 2, y0 = ny * off - sa * len / 2, x1 = x0 + ca * len * gg, y1 = y0 + sa * len * gg;
          c.globalAlpha = 0.45 * k; c.fillStyle = SOOT; lens(c, x0, y0, x1, y1, 7);
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.9 * k; c.fillStyle = col; lens(c, x0, y0, x1, y1, 5);
          c.globalAlpha = k; c.fillStyle = core; lens(c, x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.3, x1, y1, 1.8); c.globalCompositeOperation = 'source-over';
        }
      });
      c.restore();
    } });
  }
  // a dust ring and a cloud, kicked up where something heavy lands
  function thump(x, y, s = 1, col = DUST) {
    V.shock(x, y, { r0: 6, r: 52 * s, color: col, dur: 0.4, w: 3.4 });
    V.smoke(x, y, { n: Math.round(6 * s), r: 8 * s, color: col, size: 18 * s, a: 0.5, speed: 70 * s });
  }
  // a pair of fangs closing on a point (the bite mark): two curved teeth meeting, a spark between them
  function fangs(x, y, ang, s = 1, col = BONE) {
    V.fx({ dur: 0.36, layer: 'air', draw: (c, p, t, e) => {
      const g = Math.min(1, t / 0.08), k = e.a * (1 - Math.max(0, (p - 0.4) / 0.6)), gap = (1 - g) * 12 * s + 1.5 * s;
      if (k < 0.02) return;
      c.save(); c.translate(x, y); c.rotate(ang); c.lineJoin = 'round';
      for (const sd of [-1, 1]) {
        c.beginPath(); c.moveTo(-9 * s, sd * (gap + 9 * s)); c.quadraticCurveTo(-1 * s, sd * (gap + 7 * s), 8 * s, sd * gap); c.quadraticCurveTo(0, sd * (gap + 2 * s), -9 * s, sd * (gap + 9 * s)); c.closePath();
        c.globalAlpha = 0.5 * k; c.strokeStyle = SOOT; c.lineWidth = 3.2; c.stroke(); c.globalAlpha = k; c.fillStyle = col; c.fill();
      }
      c.restore();
    } });
  }

  // ---- the abilities (the cast itself; what comes of it is the moments below)
  ABILITY_VFX.houndmaster = {
    // Hunting Knife: three cuts of a broad blade, steel and tan, the third heavier
    knife: c => {
      const a = aim(c), s = c.step | 0;
      V.slash(c.x, c.y, a, { r: 48 + s * 8, span: 1.5 + s * 0.35, color: s === 2 ? TANL : '#e8ecee', core: '#ffffff', dur: 0.22, w: 0.3 + s * 0.06, flip: s === 1, sparks: 1 + s });
      c.later(0.07, () => { const p = reach(c, 62); V.hit(p.x, p.y, s === 2 ? TANL : '#dfe4e8', 0.34 + s * 0.16); });
    },
    // Whistle: Flank: a glint at the lips (the notes to the hound are the 'whistle' moment)
    flank: c => { const a = c.ent.angle || 0; V.glint(c.x + Math.cos(a) * 12, bodyY(c.ent) + Math.sin(a) * 6, { color: BONE, size: 16, z: 6 }); },
    // Pack Finisher: a lunge of the knife; the pair's strike is the 'finisher' moment
    finisher: c => { V.slash(c.x, c.y, aim(c), { r: 56, span: 1.7, color: BONE, core: '#ffffff', dur: 0.24, w: 0.32, sparks: 3 }); },
    // Whistle: Hold / Pounce: a sharp glint at the lips, a rust spark
    pounce: c => { const a = c.ent.angle || 0; V.glint(c.x + Math.cos(a) * 12, bodyY(c.ent) + Math.sin(a) * 6, { color: RUST2, size: 18, z: 6 }); V.sparks(c.x, c.y, { color: RUST2, n: 4, speed: 180, z: 22, up: 120 }); },
    // Call Off: a ring of ash at his boots where they will stand guard
    calloff: c => { V.shock(c.x, c.y, { r0: 8, r: 50, color: ASH, dur: 0.4, w: 3 }); V.smoke(c.x, c.y, { n: 2, r: 8, color: DUST, size: 14, a: 0.35, speed: 40 }); },
    // Mark the Quarry: a strip of rust cloth snapped out toward the boss
    quarry: c => { const p = reach(c, 40); V.glint(p.x, p.y, { color: RUST2, size: 24, z: 28 }); V.flash(c.x, bodyY(c.ent), 30, RUST, 0.2); },
    // Wild Hunt: the horn lifted (the blast and the pack are the 'wildhunt' moment, a beat later)
    wildhunt: c => {
      if (c.cam) { c.cam.dim(0.2, 1.2); c.cam.punch(0.03, 0.4); }
      V.charge(c.x, c.y, { color: GOLD, r: 50, n: 10, dur: 0.3, follow: c.ent });
      V.glint(c.x, bodyY(c.ent), { color: '#fff4d0', size: 30, z: 6 });
    },
    // Relay: the whistle twice, quick (the swap is the 'relay' moment)
    relay: c => { V.glint(c.x, bodyY(c.ent), { color: BONE, size: 18, z: 6 }); c.later(0.1, () => V.glint(c.x, bodyY(c.ent), { color: ASH, size: 14, z: 6 })); },
    // Mount: a hop up and a swirl of dust (the mounted run is the 'mount' moment)
    mount: c => { V.smoke(c.x, c.y, { n: 4, r: 10, color: DUST, size: 18, a: 0.45, speed: 60 }); V.shock(c.x, c.y, { r0: 6, r: 44, color: ASH, dur: 0.3, w: 2.6 }); },
    // Ride Down: the knife swung down from the saddle
    ridedown: c => { V.slash(c.x, c.y, aim(c), { r: 66, span: 2.2, color: TANL, core: '#ffffff', dur: 0.28, w: 0.34, sparks: 4 }); },
    // Howl: a glint as he throws his head back
    howl: c => { V.glint(c.x, bodyY(c.ent), { color: '#fff4d0', size: 22, z: 8 }); },
    // The Long Chase: a sharp whistle and a spray of dust
    longchase: c => { V.glint(c.x, bodyY(c.ent), { color: MOSSL, size: 20, z: 6 }); V.smoke(c.x, c.y, { n: 3, r: 8, color: DUST, size: 14, a: 0.4, speed: 50 }); },
  };

  // ---- the moments
  // a whistle: notes from the Houndmaster to the hound it calls (d.hound; none: to each of them), in the colour of the command
  KIT_VFX.whistle = (e, target, d) => {
    const kind = d && NOTEC[d.kind] ? d.kind : 'flank', ids = d && d.hound && d.hound !== 'all' ? [d.hound] : hounds(e).filter(h => !h.spectral && !h.down).map(h => h.id);
    const me = { x: e.x, y: e.y };
    ids.forEach((id, i) => {
      const h = houndAt(e, id); if (!h) return;
      later(e, i * 0.05, () => { const h2 = houndAt(e, id) || h; notes(me, { x: h2.x, y: h2.y }, kind, { dir: i ? -1 : 1 }); });
      // the hound answers: a short bark a beat later (not for a Hold: it just stills)
      if (kind !== 'hold') later(e, 0.22 + i * 0.07, () => { pose(e, id, 'bark'); snd(e, 'bark', { hound: id }); });
      else pose(e, id, 'bark');
    });
    snd(e, 'whistle', { kind });
  };
  // a bite: the hound snaps at the boss's edge (a set of fangs, a crumb of sparks); a big one (a finisher's) adds a ring
  KIT_VFX.bite = (e, target, d) => {
    const b = foe(target, e), h = d && d.hound ? houndAt(e, d.hound) : null, big = !!(d && d.big), R = BR();
    const ang = h ? Math.atan2(b.y - h.y, b.x - h.x) : e.angle || 0, sx = h ? h.x : b.x - Math.cos(ang) * R, sy = h ? h.y : b.y - Math.sin(ang) * R;
    const px = b.x - Math.cos(ang) * R * 0.78, py = b.y - Math.sin(ang) * R * 0.78;
    pose(e, h ? h.id : null, 'bite');
    fangs(px, py - 16, ang, big ? 1.35 : 0.9, big ? BONE : '#e8e0d0');
    V.sparks(px, py, { color: big ? GOLD : TANL, n: big ? 7 : 3, speed: 240, z: 16, up: 90 });
    if (big) { V.shock(px, py, { r0: 4, r: 34, color: BONE, dur: 0.28, w: 2.4 }); shake(1.2); }
    snd(e, 'bite', { big: big ? 1 : 0, hound: d && d.hound });
  };
  // the finisher, by the pair
  KIT_VFX.finisher = (e, target, d) => {
    const b = foe(target, e), pair = d && PAIRC[d.pair] ? d.pair : 'snap', col = PAIRC[pair], R = BR(), a = Math.atan2(b.y - e.y, b.x - e.x), cy = b.y - 34;
    for (const h of hounds(e)) if (!h.spectral && !h.down) pose(e, h.id, 'bite');
    if (pair === 'rend') {
      // two bundles of claw lines crossing on the boss, bright gold, and a spray of gold with a few rust drops
      claws(b.x, cy, [a + 0.75, a - 0.75], { color: GOLD, core: '#fff8dc', len: R * 1.5, gap: 12 });
      later(e, 0.05, () => { V.hit(b.x, cy + 10, GOLD, 0.8); V.sparks(b.x, cy, { color: GOLD, n: 9, speed: 320, z: 30, up: 150 }); V.sparks(b.x, cy, { color: RUST, n: 4, speed: 200, z: 30, up: 60 }); shake(2.2); });
    } else if (pair === 'hamstring') {
      // a low cut across the boss's feet, then a stumble: dust kicked up and a short green ring that settles
      const fy = b.y + R * 0.55, ang = a + Math.PI / 2;
      V.slash(b.x, fy, ang, { r: R * 0.95, span: 1.7, color: LEAF, core: '#f0ffd8', dur: 0.3, w: 0.26, flat: 0.4, sparks: 3 });
      claws(b.x, fy - 8, [a + Math.PI / 2 + 0.25], { n: 2, color: LEAF, core: '#f0ffd8', len: R * 1.3, gap: 9, dur: 0.45 });
      later(e, 0.1, () => { V.smoke(b.x - R * 0.4, fy, { n: 3, r: 10, color: DUST, size: 18, a: 0.5, speed: 70 }); V.smoke(b.x + R * 0.4, fy, { n: 3, r: 10, color: DUST, size: 18, a: 0.5, speed: 70 }); V.shock(b.x, fy, { r0: 10, r: R * 0.95, color: LEAF, dur: 0.5, w: 2.6 }); V.hit(b.x, fy - 6, LEAF, 0.6); shake(1.6); });
    } else if (pair === 'bringdown') {
      // both hounds leap together at the boss, then the ring of dust and the weight of it coming down
      for (const h of hounds(e)) if (!h.spectral) pose(e, h.id, 'leap');
      later(e, 0.28, () => {
        thump(b.x, b.y + R * 0.2, 1.6, DUST); V.shock(b.x, b.y + R * 0.2, { r0: 14, r: R * 1.8, color: LILAC, dur: 0.55, w: 3.4 });
        V.hit(b.x, cy + 12, LILAC, 1); V.sparks(b.x, cy, { color: BONE, n: 10, speed: 360, z: 30, up: 160 }); shake(4);
      });
      V.glint(b.x, cy, { color: LILAC, size: 38, z: 30 });
    } else {
      // Snap: one clean bite
      fangs(b.x - Math.cos(a) * R * 0.7, b.y - Math.sin(a) * R * 0.7 - 14, a, 1, BONE);
      V.hit(b.x - Math.cos(a) * R * 0.7, b.y - Math.sin(a) * R * 0.7, BONE, 0.5);
    }
    snd(e, 'finisher', { pair });
  };
  KIT_VFX.finisher.atTarget = true;
  KIT_VFX.bite.atTarget = true;
  // a pounce: both hounds leap, a sharp whistle's notes in rust, a dust ring where each lands
  KIT_VFX.pounce = (e, target, d) => {
    const ids = d && Array.isArray(d.hounds) ? d.hounds : hounds(e).filter(h => !h.spectral).map(h => h.id), me = { x: e.x, y: e.y };
    ids.forEach((id, i) => {
      pose(e, id, 'leap');
      const h = houndAt(e, id);
      if (h) { notes(me, { x: h.x, y: h.y }, 'pounce', { dir: i ? -1 : 1, dur: 0.6, bow: 22 }); V.smoke(h.x, h.y, { n: 2, r: 6, color: DUST, size: 12, a: 0.4, speed: 40 }); }
      later(e, 0.5, () => { const h2 = houndAt(e, id); if (h2) { thump(h2.x, h2.y, 0.8, DUST); V.hit(h2.x, h2.y - 10, RUST2, 0.4); } });
      later(e, 0.05 + i * 0.04, () => { snd(e, 'bark', { hound: id, bold: 1 }); });
    });
    snd(e, 'pounce', null);
    shake(0.8);
  };
  KIT_VFX.pounce.atTarget = true;
  // Call Off: both hounds sprint home, the notes in ash, speed streaks behind them and a ring where they stand guard
  KIT_VFX.calloff = (e) => {
    const me = { x: e.x, y: e.y };
    hounds(e).filter(h => !h.spectral).forEach((h, i) => {
      notes(me, { x: h.x, y: h.y }, 'call', { dir: i ? -1 : 1, dur: 0.6, bow: 18 });
      V.sparks(h.x, h.y, { color: DUST, n: 4, speed: 140, z: 6, up: 30 });
      pose(e, h.id, 'bark');
    });
    later(e, 0.3, () => { V.shock(e.x, e.y, { r0: 10, r: 58, color: ASH, dur: 0.5, w: 3 }); V.shock(e.x, e.y, { r0: 14, r: 40, color: BONE, dur: 0.4, w: 1.6 }); });
    snd(e, 'calloff', null);
  };
  // Relay: the two hounds change places along crossing curves, a puff at each end
  KIT_VFX.relay = (e) => {
    const hs = hounds(e).filter(h => !h.spectral);
    if (hs.length >= 2) {
      notes(hs[0], hs[1], 'flank', { dir: 1, bow: 24, dur: 0.7 }); notes(hs[1], hs[0], 'call', { dir: 1, bow: 24, dur: 0.7 });
      for (const h of hs) { V.smoke(h.x, h.y, { n: 3, r: 8, color: DUST, size: 14, a: 0.4, speed: 50 }); V.glint(h.x, h.y, { color: h.id === 'rust' ? RUST2 : ASH, size: 18, z: 18 }); pose(e, h.id, 'bark'); }
    }
    snd(e, 'relay', null);
  };
  // a hound caught by a telegraph: a puff of grey and a pale wisp lifting off it; it comes back with a bright ring
  KIT_VFX.houndDown = (e, target, d) => {
    const h = d && d.hound ? houndAt(e, d.hound) : null; if (!h) return;
    V.smoke(h.x, h.y, { n: 5, r: 8, color: '#a9a49a', size: 16, a: 0.5, speed: 50 });
    V.glint(h.x, h.y, { color: '#d8d2c6', size: 20, z: 24 }); V.shock(h.x, h.y, { r0: 4, r: 30, color: '#8f8a84', dur: 0.4, w: 2 });
    snd(e, 'houndDown', { hound: d.hound });
  };
  KIT_VFX.houndUp = (e, target, d) => {
    const h = d && d.hound ? houndAt(e, d.hound) : null; if (!h) return;
    V.shock(h.x, h.y, { r0: 6, r: 44, color: MOSSL, dur: 0.45, w: 2.6 }); V.glint(h.x, h.y, { color: BONE, size: 22, z: 24 });
    V.sparks(h.x, h.y, { color: MOSSL, n: 5, speed: 200, z: 20, up: 120 });
    pose(e, d.hound, 'bark'); snd(e, 'houndUp', { hound: d.hound });
  };
  // Mark the Quarry: a strip of rust cloth knotted in the air over the boss, fluttering, with rust-orange motes drawn from the boss to the hounds
  KIT_VFX.quarry = (e, target) => {
    const b = foe(target, e), R = BR();
    V.fx({ dur: 1.5, layer: 'air', draw: (c, p, t, f) => {
      const k = f.a * Math.min(1, t / 0.12) * Math.min(1, (1 - p) / 0.35); if (k < 0.02) return;
      const x = b.x, y = b.y - R * 1.15 - 10 + Math.sin(t * 3) * 2, fl = Math.sin(t * 9) * 3;
      c.save(); c.globalAlpha = k;
      c.strokeStyle = SOOT; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 11, y + 7); c.lineTo(x + 5, y - 5); c.stroke();   // the branch
      c.fillStyle = RUST; c.strokeStyle = SOOT; c.lineWidth = 1.4; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(x - 3, y - 2); c.quadraticCurveTo(x + 6, y - 9 + fl * 0.3, x + 16, y - 4 + fl); c.lineTo(x + 20 + fl, y + 2); c.quadraticCurveTo(x + 12, y + 1 - fl * 0.4, x + 4, y + 5); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 3, y - 1); c.quadraticCurveTo(x - 4, y + 9 + fl * 0.4, x + 1, y + 16 + fl); c.lineTo(x + 5, y + 10); c.quadraticCurveTo(x + 2, y + 5, x + 3, y + 1); c.closePath(); c.fill(); c.stroke();
      c.restore();
      V.glowAt(c, x, y, 18, RUST2, 0.4 * k);
    } });
    V.shock(b.x, b.y - 6, { r0: R * 0.9, r: R * 1.15, color: RUST2, dur: 0.5, w: 2, layer: 'ground' });
    V.charge(b.x, b.y - 30, { color: RUST2, r: R * 1.1, n: 10, dur: 0.5 });
    for (const h of hounds(e)) if (!h.spectral) { V.flash(h.x, h.y - 14, 26, RUST2, 0.3); pose(e, h.id, 'bark'); }
    snd(e, 'quarry', null);
  };
  KIT_VFX.quarry.atTarget = true;
  // Wild Hunt: the horn. A golden ring rolls out from him, a pale light passes over the ground, and four ghosts break from the air round the boss
  KIT_VFX.wildhunt = (e, target) => {
    const b = foe(target, e);
    V.shock(e.x, e.y, { r0: 10, r: 190, color: GOLD, dur: 0.7, w: 4 }); V.shock(e.x, e.y, { r0: 10, r: 130, color: '#fff4d0', dur: 0.55, w: 2, delay: 0.06 });
    V.flash(e.x, bodyY(e), 70, GOLD, 0.35);
    shake(2);
    later(e, 0.18, () => {
      for (const h of hounds(e)) if (h.spectral) {
        V.shock(h.x, h.y, { r0: 4, r: 38, color: SPECT, dur: 0.5, w: 2.6 }); V.flash(h.x, h.y - 16, 40, SPECT, 0.45);
        V.smoke(h.x, h.y, { n: 4, r: 8, color: '#cfe8f6', size: 18, a: 0.4, speed: 40 }); V.glint(h.x, h.y, { color: '#eaf7ff', size: 26, z: 26 });
        pose(e, h.id, 'howl');
      }
      V.charge(b.x, b.y - 30, { color: SPECT, r: BR() * 1.6, n: 14, dur: 0.5 });
    });
    snd(e, 'wildhunt', null);
  };
  KIT_VFX.wildhunt.atTarget = true;
  // Mount: he swings onto Greyfang; dust and grey streaks. Ride Down: the hop off, a ring where he lands
  KIT_VFX.mount = (e) => {
    const g = hounds(e).find(h => h.id === 'greyfang') || { x: e.x, y: e.y };
    V.smoke(g.x, g.y, { n: 5, r: 10, color: DUST, size: 18, a: 0.45, speed: 70 }); V.shock(g.x, g.y, { r0: 8, r: 50, color: '#a9acb0', dur: 0.4, w: 3 });
    V.glint(e.x, bodyY(e), { color: '#e4e6e8', size: 22, z: 12 }); pose(e, 'greyfang', 'bark');
    snd(e, 'mount', null);
  };
  KIT_VFX.ridedown = (e, target) => {
    const b = foe(target, e), R = BR(), a = Math.atan2(b.y - e.y, b.x - e.x);
    thump(e.x, e.y, 1.2, DUST);
    claws(b.x, b.y - 30, [a + 1.2], { n: 3, color: TANL, core: '#ffffff', len: R * 1.4, gap: 12 });
    later(e, 0.05, () => { V.hit(b.x, b.y - 24, TANL, 0.9); V.sparks(b.x, b.y - 24, { color: TANL, n: 8, speed: 300, z: 28, up: 140 }); shake(3); });
    pose(e, 'greyfang', 'bite');
    snd(e, 'ridedown', null);
  };
  KIT_VFX.ridedown.atTarget = true;
  // Howl: both hounds throw their heads back; pale curved lines rise from each and a gold ring spreads out round the party
  KIT_VFX.howl = (e) => {
    for (const h of hounds(e)) {
      pose(e, h.id, 'howl');
      V.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, f) => {
        const k = f.a * Math.sin(Math.min(1, p) * Math.PI) * 0.9; if (k < 0.02) return;
        c.save(); c.strokeStyle = '#fff4d0'; c.lineCap = 'round'; c.lineWidth = 1.8;
        for (let i = 0; i < 3; i++) { const r = 14 + i * 9 + p * 22; c.globalAlpha = k * (1 - i * 0.28); c.beginPath(); c.arc(h.x + 8, h.y - 34, r, -1.9, -0.9); c.stroke(); }
        c.restore();
      } });
      V.glint(h.x, h.y - 30, { color: '#fff4d0', size: 18, z: 4 });
    }
    V.shock(e.x, e.y, { r0: 10, r: 150, color: GOLD, dur: 0.8, w: 2.6 });
    for (let i = 0; i < 6; i++) V.spawn({ x: e.x + rnd(-40, 40), y: e.y + rnd(-20, 20), z: 10, vz: rnd(30, 60), life: rnd(0.8, 1.3), size: rnd(3, 5), size1: 0, color: GOLD, kind: 'glow' });
    snd(e, 'howl', null);
  };
  // The Long Chase: the pack runs a lap round the boss; a dotted dust trail follows the ring, each quarter it passes lands a hit
  KIT_VFX.longchase = (e, target) => {
    const b = foe(target, e), R = BR() + 12, a0 = Math.atan2(e.y - b.y, e.x - b.x);
    V.fx({ dur: 1.7, layer: 'ground', draw: (c, p, t, f) => {
      const run = Math.min(1, t / 1.25), k = f.a * Math.min(1, (1 - p) / 0.3) * 0.5;
      if (k < 0.02) return;
      c.save(); c.strokeStyle = DUST; c.lineWidth = 3; c.lineCap = 'round'; c.setLineDash([2, 9]); c.lineDashOffset = -t * 30; c.globalAlpha = k;
      c.beginPath(); c.arc(b.x, b.y, R, a0, a0 + TAU * run); c.stroke(); c.restore();
    } });
    for (let q = 1; q <= 4; q++) later(e, q * 0.31, () => { const a = a0 + q * Math.PI / 2, x = b.x + Math.cos(a) * R, y = b.y + Math.sin(a) * R; V.hit(x, y - 10, TANL, 0.5); thump(x, y, 0.6, DUST); fangs(b.x + Math.cos(a) * (R - 18), b.y + Math.sin(a) * (R - 18) - 14, a + Math.PI, 0.8, BONE); });
    for (const h of hounds(e)) if (!h.spectral) pose(e, h.id, 'bite');
    snd(e, 'longchase', null);
  };
  KIT_VFX.longchase.atTarget = true;
})();
