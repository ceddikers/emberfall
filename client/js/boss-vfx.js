// Boss-side VFX: what happens when a telegraph lands, the wind-up while the boss casts, auto-attack
// hits, adds popping in and out, the victory burst. All of it is driven by messages the host
// broadcasts (tg / tgx / bcast / banim / addev / fight...), so every player sees the same moments.

const BOSS_VFX = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const AR = () => ARENA.R;   // far enough to reach every wall of the room
  // (shared-fx polish) routed through the one shake function (ability-vfx.js vfxShake): a boss always shakes everyone
  const shake = n => { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); else FX.shake = Math.max(FX.shake, n); };
  const after = (sec, fn) => VFX.fx({ dur: sec, layer: 'ground', draw() {}, done: fn });
  const clipArena = c => { ARENA.trace(c, 4); c.clip(); };
  // a floor ring: one that would reach a wall stops at it (it runs along the floor, never over the brickwork)
  const shockAt = (x, y, o = {}) => VFX.shock(x, y, ARENA.sd(x, y) + Math.max(o.r ?? 80, o.r0 ?? 0) > -4 ? Object.assign({ clip: 1 }, o) : o);

  // random points inside a shape (and inside the arena)
  function scatter(s, n) {
    const out = [], small = s.kind === 'circle' && s.r < ARENA.inner;
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * (small ? s.r : AR());
        const x = (small ? s.x : 0) + Math.cos(a) * d, y = (small ? s.y : 0) + Math.sin(a) * d;
        if (ARENA.sd(x, y) > -20) continue;
        if (small || SHAPES.contains(s, x, y)) { out.push({ x, y }); break; }
      }
    }
    return out;
  }
  const ringPts = (x, y, r, n) => Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.1, 0.1); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, a }; });

  // the whole shape flashes and its rim burns white, then fades (replaces the old flat flash).
  // The fill is screened, not added: on a pale floor (Grubnak's cream tiles) an additive fill clips to flat white and
  // washes the floor out for a moment; screen lifts dark floors about as much and leaves light ones readable. The
  // punch comes from the rim, which stays additive.
  function shapeFlash(s, color, o = {}) {
    const dur = o.dur ?? 0.5, a = o.a ?? 0.45;
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = (1 - p) * (1 - p) * e.a;
      c.save(); clipArena(c);
      SHAPES.trace(c, s);
      if (!o.rimOnly) { c.globalCompositeOperation = 'screen'; c.globalAlpha = a * k; c.fillStyle = color; c.fill(); }   // ([boss presentation] rimOnly: no screen-blended fill)
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.min(1, 0.8 * k); c.strokeStyle = color; c.lineWidth = 10 * (1 - p) + 2; c.stroke();
      c.globalAlpha = Math.min(1, 1.2 * k); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.stroke();
      c.restore();
    } });
  }
  // a bright band wiping across a rect from its base line to the far end
  function sweep(s, color, dur = 0.32) {
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(p), along = Math.min(s.len, AR() * 2) * q, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      const cx = s.x + ca * along, cy = s.y + sa * along, hw = Math.min(s.w / 2, AR() * 2);
      c.save(); clipArena(c);
      VFX.neonPath(c, color, 16 * (1 - p * 0.5), e.a * (1 - p * p), () => { c.moveTo(cx - sa * hw, cy + ca * hw); c.lineTo(cx + sa * hw, cy - ca * hw); });
      c.restore();
    } });
  }
  // a beam shot along a direction to the arena wall
  function streak(x, y, ang, color, o = {}) {
    const len = o.len ?? AR() * 2.2, w = o.w ?? 10;
    VFX.fx({ dur: o.dur ?? 0.3, layer: 'air', draw: (c, p, t, e) => {
      const grow = easeOut(Math.min(1, p / 0.35)), k = e.a * (1 - Math.max(0, p - 0.35) / 0.65);
      c.save(); clipArena(c);
      VFX.neonPath(c, color, w * (1 - p * 0.6), k, () => { c.moveTo(x, y - 6); c.lineTo(x + Math.cos(ang) * len * grow, y - 6 + Math.sin(ang) * len * grow); });
      c.restore();
    } });
  }
  // a whole-room tint (raidwides). Bright colours are screened (see shapeFlash: never a white-out on the pale floors);
  // dark ones (nightfall, a wipe) are laid over normally so they actually darken the room
  const isDark = col => { const [r, g, b] = hexToRgb(col); return r * 0.3 + g * 0.59 + b * 0.11 < 60; };
  function roomTint(color, a = 0.28, dur = 0.7) {
    const mode = isDark(color) ? 'source-over' : 'screen';
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      c.save(); clipArena(c); c.globalCompositeOperation = mode;
      c.globalAlpha = a * (1 - p) * e.a; c.fillStyle = color; c.fillRect(-AR() - 10, -AR() - 10, AR() * 2 + 20, AR() * 2 + 20);
      c.restore();
    } });
  }
  const steam = (x, y, n, speed, color = '#f6f2ee') => {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + rand(-0.2, 0.2), sp = rand(0.6, 1) * speed;
      VFX.spawn({ x, y, z: rand(0, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(20, 60), drag: 0.035, life: rand(0.9, 1.4), size: rand(26, 40), size1: 90,
        color, kind: 'smoke', add: false, a: 0.7, fadeIn: 0.05, fadePow: 2 });
    }
  };

  // how far the floor runs from (x, y) along angle a, to the wall
  const reach = (x, y, a, max = 2000) => {
    let d = 0;
    while (d < max && ARENA.sd(x + Math.cos(a) * (d + 10), y + Math.sin(a) * (d + 10)) < -12) d += 10;
    return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, d };
  };
  // a bold painted burst: ink edge, saturated body, white-hot heart (Grubnak's colours unless told otherwise)
  // [boss presentation] floor marks left by impacts keep to the telegraph agent's aftermath tiers (BossTells.AFTER:
  // brief 2.5 s / short 4.5 s / long 8 s, at most 0.6 opaque), so nothing lingers long enough to read as a hazard
  const AFTER_T = () => (typeof BossTells !== 'undefined' && BossTells.AFTER) || { tier: { brief: 2.5, short: 4.5, long: 8 }, maxA: 0.6 };
  const tierDur = d => { const T = AFTER_T().tier; return d == null ? T.short : d <= 3 ? T.brief : d <= 6 ? T.short : T.long; };
  const aftO = o => Object.assign({}, o, { dur: tierDur(o.dur), a: Math.min(o.a ?? AFTER_T().maxA, AFTER_T().maxA) });
  const AFT = {
    scorch: (x1, y1, x2, y2, o = {}) => VFX.scorch(x1, y1, x2, y2, aftO(o)),
    gouge: (x1, y1, x2, y2, o = {}) => VFX.gouge(x1, y1, x2, y2, aftO(o)),
    crater: (x, y, o = {}) => VFX.crater(x, y, aftO(o)),
    decal: (x, y, o = {}) => VFX.decal(x, y, aftO(o)),
    smear: (x1, y1, x2, y2, o = {}) => VFX.smear(x1, y1, x2, y2, aftO(o)),
  };
  const bang = (x, y, r, o = {}) => VFX.spikeburst(x, y, Object.assign({ r, n: 12, color: '#ff9a2a', core: '#fff2c0', ink: '#3a1408', dur: 0.42 }, o));
  // a flame tongue standing on (x, y), for effects drawn here
  const flameTongue = (c, x, y, h, w, sway, color) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(x - w, y);
    c.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h); c.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
    c.quadraticCurveTo(x, y + w * 0.4, x - w, y); c.fill();
  };
  // Grubnak's ghost cleaver coming down flat on the floor exactly where the hit lands: the same blade the Chop Chop
  // warning hangs in the air (edge along (ex, ey) from the point o, body off to the side (nx, ny)), slammed down,
  // biting in with a white-hot edge, held a moment, then gone. u runs along the edge (-L..L), v into the blade (0..W).
  function flatCleaver(ox, oy, ex, ey, nx, ny, L, W, o = {}) {
    const off = o.off ?? 16, P = (u, v, z = 0) => [ox + ex * u + nx * v, oy + ey * u + ny * v - z];
    // (flat on the floor: it lies under everyone standing on it, inside the room, so it never hides a player or the boss
    // and never slides over the walls)
    VFX.fx({ dur: o.dur ?? 0.85, layer: 'ground', draw: (c, p, t, e) => {
      const slam = Math.min(1, p / 0.1), z = (1 - slam) * (o.from ?? 40), k = e.a * Math.min(1, (1 - p) / 0.4), bite = Math.max(0, 1 - Math.max(0, p - 0.1) / 0.5);
      c.save(); clipArena(c); c.globalAlpha = k * 0.92;
      const e1 = P(-L, off, z), e2 = P(L, off, z), b2 = P(L, off + W, z), b1 = P(-L + W * 0.27, off + W, z), c1 = P(-L, off + W * 0.73, z);
      // its shadow on the tiles, closing in under it as it lands
      const sh = (1 - slam) * 14 + 5;
      c.beginPath(); for (const [u, v] of [[-L, off], [L, off], [L, off + W], [-L + W * 0.27, off + W], [-L, off + W * 0.73]]) { const q = P(u, v); c.lineTo(q[0] + sh * 0.4, q[1] + sh); } c.closePath();
      c.fillStyle = 'rgba(20,10,4,0.28)'; c.fill();
      c.beginPath(); c.moveTo(...e1); c.lineTo(...e2); c.lineTo(...b2); c.lineTo(...b1); c.lineTo(...c1); c.closePath();
      const g = c.createLinearGradient(e1[0], e1[1], P(-L, off + W, z)[0], P(-L, off + W, z)[1]);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, '#e6eaee'); g.addColorStop(0.55, '#b4bcc6'); g.addColorStop(1, '#8a939e');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#1a1410'; c.lineWidth = 4; c.stroke();
      // the ground bevel along the edge and a long reflection across the flat: steel, not a grey slab
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(90,100,112,0.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(...P(-L + 6, off + W * 0.16, z)); c.lineTo(...P(L - 4, off + W * 0.16, z)); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = W * 0.08; c.beginPath(); c.moveTo(...P(-L * 0.5, off + W * 0.72, z)); c.lineTo(...P(L * 0.1, off + W * 0.3, z)); c.stroke();
      c.lineWidth = W * 0.035; c.beginPath(); c.moveTo(...P(-L * 0.38, off + W * 0.8, z)); c.lineTo(...P(L * 0.2, off + W * 0.4, z)); c.stroke();
      const h1 = P(L, off + W * 0.35, z), h2 = P(L + W * 1.13, off + W * 0.35, z);
      c.lineCap = 'round'; c.strokeStyle = '#1a1410'; c.lineWidth = W * 0.23; c.beginPath(); c.moveTo(...h1); c.lineTo(...h2); c.stroke();
      c.strokeStyle = '#7a4e2a'; c.lineWidth = W * 0.18; c.stroke();
      const hole = P(-L * 0.62, off + W * 0.62, z); circle(c, hole[0], hole[1], W * 0.1, '#2a2622', '#1a1410', 2);
      // the edge biting into the floor: white-hot, cooling to orange
      if (slam >= 1) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = k * bite; c.strokeStyle = '#ffb040'; c.lineWidth = 10; c.beginPath(); c.moveTo(...P(-L, off)); c.lineTo(...P(L, off)); c.stroke();
        c.strokeStyle = '#fff6d8'; c.lineWidth = 3.5; c.stroke();
        c.globalCompositeOperation = 'source-over';
      }
      c.restore(); c.globalAlpha = 1;
    } });
    return { P, off };
  }
  // a silver cloche popping off a plate and tumbling away
  function clocheLift(x, y) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.4), z = 90 * Math.sin(Math.min(1, p * 1.3) * Math.PI * 0.6) + p * 40;
      c.save(); c.translate(x + dir * p * 70, y - 10 - z); c.rotate(dir * p * 2.2); c.globalAlpha = k;
      c.beginPath(); c.ellipse(0, 0, 30, 24, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#d8dde2'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1a1c20'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-10, -12, 8, 5, -0.5, 0, Math.PI * 2); c.fill();
      rrect(c, -34, -2, 68, 6, 3, '#b8bec4', '#1a1c20', 2);
      circle(c, 0, -26, 5, '#c8ced4', '#1a1c20', 2);
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // the shadows behind every cover prop, seen from (sx, sy), and a clip to everything outside them
  const coverShadows = (sx, sy, props) => { const out = []; for (const pr of props || []) if (pr.cover) { const sh = PROPS.shadowPoly(sx, sy, pr); if (sh) out.push(sh); } return out; };
  const clipOut = (c, shadows) => { for (const sh of shadows) { c.beginPath(); c.rect(-4000, -4000, 8000, 8000); sh.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip('evenodd'); } };

  // ---------------------------------------------------------------- telegraph impacts by tag
  let flambeAt = -9, flambeN = 0, squallAt = -9;   // [boss presentation] perf: impacts landing in a burst
  const IMPACT = {
    // Hrimgar
    tislam(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.3, color: '#bff0ff', w: 8, dur: 0.55, flat: 1 }); shapeFlash(s, '#9fe8ff', { a: 0.34, dur: 0.5 }); VFX.sparks(s.x, s.y, { color: '#eaf6ff', n: 12, speed: 320 }); AFT.decal(s.x, s.y, { style: 'crack', r: s.r * 0.7, dur: 6, a: 0.6, seed: s.x * 0.01 + s.y * 0.013 }); shake(13); },
    tifault(tg) { const s = tg.live; shapeFlash(s, '#9fe8ff', { a: 0.34, dur: 0.6 }); sweep(s, '#eaf6ff', 0.5); for (const q of scatter(s, 12)) after(rand(0, 0.3), () => VFX.sparks(q.x, q.y, { color: '#eaf6ff', n: 3, speed: 260 })); shake(12); },
    tisink(tg) { const s = tg.live, x = s.x + s.len / 2, y = s.y; shockAt(x, y, { r: 150, color: '#7fc8ff', w: 7, dur: 0.6, flat: 1 }); VFX.splash(x, y, { color: '#4a8ac8', n: 14 }); VFX.sparks(x, y, { color: '#eaf6ff', n: 10, speed: 260 }); shake(7); },
    tiburst(tg) { const s = tg.live, x = s.x + s.len / 2, y = s.y; shockAt(x, y, { r: 150, color: '#bff0ff', w: 7, dur: 0.5, flat: 1 }); VFX.sparks(x, y, { color: '#eaf6ff', n: 16, speed: 320 }); shake(7); },
    ticicle(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.2, color: '#dff4ff', w: 5, dur: 0.4, flat: 1 }); VFX.sparks(s.x, s.y, { color: '#eaf6ff', n: 8, speed: 260 }); shake(3); },
    tisweep(tg) { const s = tg.live; shapeFlash(s, '#cfeaff', { a: 0.32, dur: 0.6 }); sweep(s, '#ffffff', 0.55); for (const q of scatter(s, 12)) VFX.smoke(q.x, q.y, { n: 1, color: '#dff0ff', size: 36, a: 0.5, speed: 120 }); shake(11); },
    tibreath(tg) { const s = tg.live; shapeFlash(s, '#dff4ff', { a: 0.34, dur: 0.6 }); sweep(s, '#ffffff', 0.5); for (const q of scatter(s, 14)) after(rand(0, 0.3), () => VFX.sparks(q.x, q.y, { color: '#eaf6ff', n: 3, speed: 220 })); shake(5); },
    tistomp(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.4, color: '#bff0ff', w: 10, dur: 0.6, flat: 1 }); VFX.sparks(s.x, s.y, { color: '#eaf6ff', n: 14, speed: 340 }); shake(14); },
    tiring(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r, color: '#dff4ff', w: 7, dur: 0.5, flat: 1 }); shake(6); },
    tislide(tg) { const s = tg.live; shapeFlash(s, '#dff0ff', { a: 0.36, dur: 0.7 }); for (const q of scatter(s, 10)) after(rand(0, 0.25), () => { VFX.smoke(q.x, q.y, { n: 1, color: '#e8f2fa', size: 40, a: 0.6, speed: 100 }); VFX.debris(q.x, q.y, { color: '#8a9ab0', n: 4, speed: 1 }); }); shake(10); },
    tigrip(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.2, color: '#9fb6c9', w: 7, dur: 0.4, flat: 1 }); shake(6); },
    tigripstack(tg, msg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.2, color: '#bfe0ff', w: 6, dur: 0.5, flat: 1 }); shake(4); },
    tifrost(tg, msg) { const s = tg.live; if (msg && msg.cure) { VFX.smoke(s.x, s.y, { n: 4, color: '#ffe8c8', size: 30, a: 0.5, speed: 60 }); VFX.sparks(s.x, s.y, { color: '#ffd890', n: 10, speed: 180 }); return; } shockAt(s.x, s.y, { r: s.r * 1.2, color: '#bfe0ff', w: 6, dur: 0.5, flat: 1 }); shake(4); },
    tigrasp(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.5, color: '#eaf6ff', w: 6, dur: 0.5, flat: 1 }); VFX.sparks(s.x, s.y, { color: '#eaf6ff', n: 12, speed: 220 }); },
    tihowl() { roomTint('#9fd8ff', 0.2, 0.8); shake(9); },
    tiwhite() { roomTint('#f0faff', 0.45, 1.0); shake(8); },
    tinight() { roomTint('#304a80', 0.25, 1.0); shake(8); },
    // Vhalgrath
    // the dive lands: a slam that rolls out from the pit, the floor cracking and throwing up embers and rock
    dragonfall(tg) {
      const s = tg.live;
      shockAt(s.x, s.y, { r: s.r * 1.3, color: '#ffb04a', w: 9, dur: 0.6, flat: 1 });
      shockAt(s.x, s.y, { r: s.r * 0.8, color: '#fff0c0', w: 5, dur: 0.4, flat: 1, delay: 0.05 });
      shapeFlash(s, '#ff7a22', { a: 0.34, dur: 0.6 });
      for (const q of scatter(s, 12)) after(rand(0, 0.25), () => { VFX.sparks(q.x, q.y, { color: '#ffd27a', n: 4, speed: 300 }); VFX.smoke(q.x, q.y, { n: 1, color: '#3a2a26', size: 32, a: 0.5, speed: 80 }); });
      AFT.decal(s.x, s.y, { style: 'crack', r: s.r * 0.7, dur: 6, a: 0.6, seed: s.x * 0.01 + s.y * 0.013 });
      shake(14);
    },
    // the breath goes: fire down the whole cone
    breath(tg) {
      const s = tg.live;
      shapeFlash(s, '#ff8a2a', { a: 0.36, dur: 0.6 });
      sweep(s, '#ffe0a0', 0.5);
      for (const q of scatter(s, 14)) after(rand(0, 0.3), () => VFX.sparks(q.x, q.y, { color: '#ffd27a', n: 3, speed: 240 }));
      shake(7);
    },
    // the tail comes round behind him
    taillash(tg) { const s = tg.live; shapeFlash(s, '#e8c8a0', { a: 0.3, dur: 0.45 }); sweep(s, '#ffffff', 0.35); for (const q of scatter(s, 8)) VFX.smoke(q.x, q.y, { n: 1, color: '#6a4a3a', size: 30, a: 0.5, speed: 120 }); shake(9); },
    // the Roar: the whole crater flares and rocks
    roar() { roomTint('#ff8a3a', 0.22, 0.8); shake(10); },
    heartburn(tg) { roomTint('#ff5a1a', 0.3, 1.0); shake(16); },
    scorch(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.2, color: '#ffb04a', w: 6, dur: 0.45, flat: 1 }); shapeFlash(s, '#ff7a22', { a: 0.4, dur: 0.5 }); VFX.sparks(s.x, s.y, { color: '#ffd27a', n: 8, speed: 280 }); shake(6); },
    // the Hydra (hydra.js)
    acid(tg) { const s = tg.live; shapeFlash(s, '#b8f04a', { a: 0.36, dur: 0.6 }); sweep(s, '#e8ffb0', 0.45); for (const q of scatter(s, 12)) after(rand(0, 0.3), () => VFX.splash(q.x, q.y, { color: '#9ccc2e', n: 5, speed: 0.8 })); shake(6); },
    tide(tg) { const s = tg.live; shapeFlash(s, '#7ffff0', { a: 0.34, dur: 0.55 }); sweep(s, '#d8fffa', 0.4); for (const q of scatter(s, 10)) after(rand(0, 0.25), () => VFX.splash(q.x, q.y, { color: '#4fd8cc', n: 5, speed: 1 })); shake(7); },
    bloom(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.3, color: '#e0a0ff', w: 7, dur: 0.5, flat: 1 }); shapeFlash(s, '#b060f0', { a: 0.36, dur: 0.6 }); VFX.splash(s.x, s.y, { color: '#a050e0', n: 14, speed: 1.3 }); VFX.smoke(s.x, s.y, { n: 4, color: '#5a2a80', size: 34, a: 0.5, speed: 70 }); shake(6); },
    gout(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.2, color: '#ffb060', w: 6, dur: 0.45, flat: 1 }); shapeFlash(s, '#ff8a2a', { a: 0.4, dur: 0.5 }); VFX.sparks(s.x, s.y, { color: '#ffd27a', n: 10, speed: 280 }); shake(5); },
    rime(tg) { const s = tg.live; shapeFlash(s, '#bfe8ff', { a: 0.34, dur: 0.6 }); shockAt(s.x, s.y, { r: s.r, color: '#e8f8ff', w: 8, dur: 0.6, flat: 1 }); for (const q of scatter(s, 12)) after(rand(0, 0.3), () => VFX.sparks(q.x, q.y, { color: '#e8f8ff', n: 3, speed: 200 })); shake(7); },
    storm(tg) { const s = tg.live; shapeFlash(s, '#fff6a0', { a: 0.3, dur: 0.4 }); sweep(s, '#ffffff', 0.3); for (const q of scatter(s, 6)) after(rand(0, 0.2), () => VFX.lightning(q.x + rand(-14, 14), q.y - 280, q.x, q.y, { color: '#fff6a0', jag: 22, dur: 0.35 })); shake(8); },
    gaze(tg) { roomTint('#e8e8f8', 0.22, 0.7); const s = tg.live; if (s) VFX.sparks(s.x, s.y, { color: '#ffffff', n: 8, speed: 260 }); shake(9); },
    mirespit(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.2, color: '#d8b868', w: 6, dur: 0.45, flat: 1 }); VFX.splash(s.x, s.y, { color: '#7a5a2a', n: 12, speed: 1.1 }); shake(4); },
    sear(tg) { const s = tg.live; VFX.pillar(s.x, s.y, { r: 40, h: 150, color: '#ffb060', dur: 0.6 }); shockAt(s.x, s.y, { r: s.r * 1.4, color: '#ffd27a', w: 6, dur: 0.5, flat: 1 }); VFX.sparks(s.x, s.y, { color: '#ffd27a', n: 10, speed: 260 }); },
    rise(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 1.3, color: '#a8f0e8', w: 8, dur: 0.55, flat: 1 }); VFX.splash(s.x, s.y, { color: '#4fd8cc', n: 16, speed: 1.4 }); shake(6); },
    cry() { roomTint('#e8d890', 0.16, 0.7); shake(7); },
    surge() { roomTint('#4fd8cc', 0.22, 0.9); shake(9); },
    heartbeat() { roomTint('#ffd870', 0.3, 1.0); shake(12); },
    hgaze(tg) { roomTint('#e8e8f8', 0.28, 0.9); const s = tg.live; shockAt(s.x, s.y, { r: s.r, color: '#ffffff', w: 8, dur: 0.6, flat: 1 }); shake(12); },
    // Grubnak
    // Chop Chop: the ghost cleaver comes down beside him and the cut runs along his line, wall to wall: a burst of
    // sparks racing out both ways, tiles jumping, and a gouge left glowing in the floor
    mince(tg) {
      const s = tg.live, la = s.angle + Math.PI / 2, a = reach(s.x, s.y, la), b = reach(s.x, s.y, la + Math.PI);
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      // the blade the warning hung over the doomed half comes down right there, edge on his line, and the blow
      // sweeps across the whole half it hits
      flatCleaver(s.x, s.y, -sa, ca, ca, sa, 300, 150, { from: 10 });
      shapeFlash(s, '#ff7a3a', { a: 0.26, dur: 0.55 });
      sweep(s, '#ffe0b8', 0.4);
      for (const q of scatter(s, 9)) after(rand(0.05, 0.3), () => VFX.smoke(q.x, q.y, { n: 2, color: '#e8dccb', size: 30, a: 0.45, speed: 60 }));
      after(0.06, () => {
        AFT.gouge(a.x, a.y, b.x, b.y, { w: 26, dur: 11 });
        for (const [end, dir] of [[a, la], [b, la + Math.PI]]) for (let d = 0; d < end.d; d += 120) {
          const x = s.x + Math.cos(dir) * d, y = s.y + Math.sin(dir) * d;
          after(d / 2600, () => {
            bang(x, y, Math.max(34, 70 - d * 0.03), { n: 10, dur: 0.36 });
            VFX.sparks(x, y, { color: '#ffe0a0', n: 4, angle: s.angle, spread: 0.9, speed: 320 });
            if (Math.random() < 0.6) VFX.debris(x, y, { color: '#e2d6c0', n: 3, speed: 0.9, size: 1.2 });
          });
        }
        shake(11);
      });
    },
    ladle(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffb050', { a: 0.38 });
      shockAt(s.x, s.y, { r: s.r * 1.05, color: '#ffd08a', w: 8, dur: 0.45, flat: 1 });
      VFX.swirl(s.x, s.y, { r: s.r * 0.8, color: '#ffcf7a', dur: 0.55, arms: 3 });
      for (const q of ringPts(s.x, s.y, s.r * 0.8, 10)) VFX.splash(q.x, q.y, { color: '#d8902a', n: 4, speed: 1.2 });
      shake(6);
    },
    lidSlam(tg) {
      const s = tg.live;
      shapeFlash(s, '#b8cfff', { a: 0.26 });
      shockAt(s.x, s.y, { r0: s.r2, r: AR() * 1.15, color: '#eaf3ff', w: 12, dur: 0.55, flat: 1 });
      shockAt(s.x, s.y, { r0: s.r2, r: AR(), color: '#9ec2ff', w: 6, dur: 0.75, flat: 1, delay: 0.08 });
      for (const q of ringPts(s.x, s.y, s.r2, 14)) VFX.sparks(q.x, q.y, { color: '#ffffff', n: 2, angle: q.a, spread: 0.3, speed: 520 });
      shake(8);
    },
    spread(tg, ctx) {
      const s = tg.live;
      if (ctx && ctx.boss === 'skitterra') return IMPACT.venomdrip(tg);   // Skitterra's Venom Drip shares the tag
      // [boss presentation] Meat Toss: a slab of meat slapping down in meat-red and grease-brown (was an off-palette purple)
      shapeFlash(s, '#d8402a', { a: 0.34, dur: 0.4 });
      bang(s.x, s.y, s.r * 0.7, { n: 11, color: '#c0401a', core: '#ffd8a0', ink: '#2a0c04', dur: 0.36 });
      VFX.splash(s.x, s.y, { color: '#8a4a1a', n: 10 });
      VFX.splash(s.x, s.y, { color: '#a8281a', n: 6 });
      shockAt(s.x, s.y, { r: s.r, color: '#e07a4a', flat: 1 });
    },
    // Venom Drip (Skitterra): the drop splashes venom-green across the circle
    venomdrip(tg) {
      const s = tg.live;
      shapeFlash(s, '#8adf2a', { a: 0.3, dur: 0.4 });
      VFX.splash(s.x, s.y, { color: '#7ad22a', n: 12, speed: 1.3 });
      VFX.burst(s.x, s.y, { color: '#b8ff6a', color2: '#eaffb8', n: 12, speed: 220 });
      shockAt(s.x, s.y, { r: s.r, color: '#b8ff5a', flat: 1 });
    },
    stack(tg) {
      const s = tg.live;
      shapeFlash(s, '#3d8bff', { a: 0.45 });   // (a stack lands in its own blue)
      VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 240, color: '#8cc0ff', dur: 0.75 });
      VFX.burst(s.x, s.y, { color: '#8cc0ff', color2: '#ffffff', n: 22, speed: 300, size: 16 });
      shockAt(s.x, s.y, { r: s.r * 1.25, color: '#3d8bff', w: 6, flat: 1 });
      shake(5);
    },
    // Order Up! / Service!: the cloche flies off the plate and a column of heat and steam goes up; a ring of steam hangs
    plate(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffcf7a', { a: 0.3 });
      clocheLift(s.x, s.y);
      VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 250, color: '#ffc870', dur: 0.8 });
      VFX.flare(s.x, s.y, { color: '#ff8a2a', n: 14, r: s.r * 0.3, h: 1.6 });
      for (const q of ringPts(s.x, s.y, s.r * 0.85, 10)) VFX.smoke(q.x, q.y, { color: '#f6f0ea', n: 1, size: 30, a: 0.55, speed: 30 });
      steam(s.x, s.y, 6, 120);
    },
    spice(tg) {
      const s = tg.live;
      shapeFlash(s, '#ff5a2a', { a: 0.38 });
      VFX.flare(s.x, s.y, { color: '#ff4a1a', n: 14, r: s.r * 0.4 });
      VFX.smoke(s.x, s.y, { color: '#c86a40', n: 6, size: 30, a: 0.5, speed: 90, r: s.r * 0.4 });
      VFX.sparks(s.x, s.y, { color: '#ffb040', n: 10 });
      shockAt(s.x, s.y, { r: s.r, color: '#ff8a3a', flat: 1 });
    },
    whisk(tg) {
      const s = tg.live;
      shapeFlash(s, '#fff0c8', { a: 0.28, dur: 0.4 });
      // (warm cream, not white: an additive white bar clips the pale tiles to a flat white-out)
      for (const rot of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) streak(s.x, s.y, s.angle + rot, '#e8b060', { w: 11, dur: 0.35 });
      for (const q of scatter(s, 14)) VFX.spawn({ x: q.x, y: q.y, z: 8, vz: rand(40, 120), life: rand(0.4, 0.7), size: rand(8, 14), size1: 0, color: '#fff6dc', kind: 'star', vr: rand(-5, 5) });
      VFX.swirl(s.x, s.y, { r: 90, color: '#ffe9b0', dur: 0.5 });
      shake(4);
    },
    // Boil Over: the broth erupts out of him, slops across the floor in steaming puddles and chunks
    boil(tg) {
      const s = tg.live;
      bang(s.x, s.y - 10, 120, { color: '#e0702a', core: '#ffe0a0', ink: '#3a1606', n: 14, dur: 0.5 });
      VFX.flare(s.x, s.y, { color: '#ff7a2a', n: 26, r: 60, h: 1.6, size: 1.4 });
      VFX.splash(s.x, s.y, { color: '#b8561c', n: 34, speed: 2.2, size: 1.4 });
      steam(s.x, s.y, 16, 480);
      // [boss presentation] where the broth slopped, only cool steam wisps curl up and thin away (the old hot puddles
      // looked like hazards and did nothing)
      for (let i = 0; i < 8; i++) {
        const a = rand(0, TAU), d = rand(90, 340), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d * 0.75;
        if (ARENA.sd(x, y) > -40) continue;
        after(rand(0.15, 0.45), () => { for (let j = 0; j < 3; j++) VFX.spawn({ x: x + rand(-14, 14), y: y + rand(-8, 8), z: 2, vx: rand(-8, 8), vz: rand(18, 34), drag: 0.02, life: rand(1.1, 1.6), size: rand(12, 18), size1: 40, color: '#eef2f4', kind: 'smoke', add: false, a: 0.32, fadeIn: 0.3 }); });
      }
      shockAt(s.x, s.y, { r: AR(), color: '#ffb070', w: 8, dur: 0.7, flat: 1 });
      roomTint('#ff6a2a', 0.18);
      shake(9);
    },
    // the Hollow King: a lid grinding to a stop, the Decree washing down the hall, the vault coming down, his eyes in the dark
    lid(tg, ctx) {
      if (ctx && ctx.boss === 'grubnak') return IMPACT.lidSlam(tg);   // Grubnak's Lid Slam shares the tag
      const s = tg.live;
      sweep(s, '#c8ffd8', 0.4);
      for (let d = 30; d < s.len; d += 60) VFX.smoke(s.x + Math.cos(s.angle) * d, s.y, { color: '#a8b0ac', n: 1, size: 28, a: 0.5, speed: 50 });
      shake(5);
    },
    // Royal Decree: a wall of grave-light rolls down the hall from the throne, churning, and leaves the floor glowing
    // green a while; every solid thing's shadow stays clean
    decree(tg, ctx) {
      const src = tg.cover || [0, -2600], sh = coverShadows(src[0], src[1], ctx && ctx.props), top = -ARENA.hh - 20, H = ARENA.hh * 2 + 40, W = ARENA.hw + 20;
      roomTint('#3aff7a', 0.14, 0.5);
      VFX.fx({ dur: 0.6, layer: 'ground', draw: (c, p, t, e) => {
        const y = top + H * easeOut(p), k = e.a * (1 - Math.max(0, p - 0.7) / 0.3);
        c.save(); clipArena(c); if (sh.length) clipOut(c, sh);
        const g = c.createLinearGradient(0, y - 160, 0, y + 20);
        g.addColorStop(0, 'rgba(58,255,122,0)'); g.addColorStop(0.75, `rgba(90,255,150,${0.5 * k})`); g.addColorStop(1, `rgba(220,255,230,${0.8 * k})`);
        c.fillStyle = g; c.fillRect(-W, y - 160, W * 2, 180);
        c.restore();
      } });
      VFX.fx({ dur: 4, layer: 'ground', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p * 4 / 0.5) * (1 - p);
        c.save(); clipArena(c); if (sh.length) clipOut(c, sh);
        c.fillStyle = `rgba(58,255,122,${0.12 * k})`; c.fillRect(-W, top, W * 2, H);
        for (let i = 0; i < 30; i++) { const x = -ARENA.hw + ((i * 0.618) % 1) * ARENA.hw * 2, y0 = top + ((i * 0.377) % 1) * H, q = (t * 0.4 + i * 0.13) % 1; VFX.glowAt(c, x, y0 - q * 30, 12, '#7affa8', 0.5 * k * (1 - q)); }
        c.restore();
      } });
      const lit = (x, y) => !(ctx && ctx.props) || !PROPS.shadowing(src[0], src[1], x, y, ctx.props.filter(pr => pr.cover));
      for (let i = 0; i < 16; i++) { const x = -ARENA.hw + (i + 0.5) / 16 * ARENA.hw * 2, y = -ARENA.hh + 40 + Math.random() * ARENA.hh * 1.6; if (lit(x, y)) after(0.1 + (y + ARENA.hh) / (ARENA.hh * 2) * 0.45, () => VFX.pillar(x, y, { r: 14, h: 110, color: '#7affa8', dur: 0.45 })); }
      shake(8);
    },
    masonry(tg) {
      const s = tg.live;
      VFX.debris(s.x, s.y - 10, { color: '#4a5054', n: 14, speed: 1.3, up: 1.1 });
      VFX.smoke(s.x, s.y, { color: '#a8b0ac', n: 8, size: 36, a: 0.6, speed: 120 });
      shockAt(s.x, s.y, { r: s.r * 1.6, color: '#d8e0dc', w: 6, dur: 0.4, flat: 1 });
      shake(7);
    },
    dark() { roomTint('#e8fff0', 0.12, 0.35); shake(4); },
    // Skitterra: the acid comes down everywhere the shadows don't reach; a strand snaps taut
    // Acid Deluge: the last of the rain drives down on every lit spot and bursts there; the floor is left pitted and
    // smoking, the pillars' shadows clean
    deluge(tg, ctx) {
      const s = tg.live, src = tg.cover || [s.x, s.y], props = ((ctx && ctx.props) || []).filter(pr => pr.cover);
      const lit = scatter({ kind: 'circle', x: 0, y: 0, r: AR() }, 100).filter(q => !PROPS.shadowing(src[0], src[1], q.x, q.y, props));
      // the green flush only where the acid fell: the pillars' shadows stay unpainted (never a lit-up "safe" shape)
      const dsh = coverShadows(src[0], src[1], ctx && ctx.props);
      VFX.fx({ dur: 0.6, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipArena(c); if (dsh.length) clipOut(c, dsh); c.globalCompositeOperation = 'screen';
        c.globalAlpha = 0.16 * (1 - p) * e.a; c.fillStyle = '#7ad83a'; c.fillRect(-AR() - 10, -AR() - 10, AR() * 2 + 20, AR() * 2 + 20);
        c.restore();
      } });
      // ([boss presentation] perf: at most 48 drops, staggered over half a second, and 28 pits, instead of ~100 bursts at once)
      lit.slice(0, 48).forEach((q, i) => after(0.45 * (i / 48) + rand(0, 0.06), () => acidDrop(q.x, q.y, i % 4 === 0)));
      acidPits(lit.slice(0, 28), 6);
      shake(7);
    },
    strand(tg) {
      const s = tg.live;
      shapeFlash(s, '#f4f0ff', { a: 0.3, dur: 0.4 });
      streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 8, dur: 0.35 });
      shake(4);
    },
    // From the Dark / Ceiling Ambush: she lands in a burst of silk and dust, rock thrown out, a web torn into the floor
    ambush(tg) {
      const s = tg.live;
      bang(s.x, s.y, s.r * 0.8, { n: 16, color: '#d8c8ff', core: '#ffffff', ink: '#2a1a3a', dur: 0.5 });
      shockAt(s.x, s.y, { r: s.r * 1.4, color: '#e8dcff', w: 12, dur: 0.5, flat: 1 });
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + rand(-0.15, 0.15), sp = rand(260, 420); VFX.spawn({ x: s.x, y: s.y, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(30, 120), g: 300, drag: 0.03, life: 0.6, size: 14, color: '#ffffff', stretch: 5, rot: a }); }
      VFX.debris(s.x, s.y, { color: '#4a4156', n: 16, speed: 1.5 });
      VFX.smoke(s.x, s.y, { color: '#8a8098', n: 12, size: 42, a: 0.6, speed: 160 });
      webDecal(s.x, s.y, s.r * 1.05, 8);
      AFT.decal(s.x, s.y, { style: 'crack', r: s.r * 0.8, dur: 6, a: 0.6, seed: Math.random() * 6 });
      shake(12);
    },
    // Butcher's Charge: a trail of dust and broken grout along his path (the impact at the end comes as a 'slam')
    charge(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      shapeFlash(s, '#ff9a5a', { a: 0.28, dur: 0.4 });
      for (let d = 40; d < s.len; d += 60) {
        const x = s.x + ca * d, y = s.y + sa * d;
        if (ARENA.sd(x, y) > -20) break;
        after(d / 1150, () => { VFX.smoke(x, y, { color: '#d8c4a4', n: 2, size: 30, a: 0.55, speed: 70 }); VFX.debris(x, y, { color: '#c9b48e', n: 2, speed: 0.6, size: 0.7 }); });
      }
      shake(5);
    },
    cask(tg) {
      const s = tg.live;
      shockAt(s.x, s.y, { r: s.r * 1.2, color: '#ffd8a0', w: 6, dur: 0.4, flat: 1 });
      VFX.smoke(s.x, s.y, { color: '#d8c4a4', n: 6, size: 30, a: 0.6, speed: 90 });
      VFX.debris(s.x, s.y, { color: '#c9b48e', n: 6, speed: 0.9 });
      shake(5);
    },
    // Gut Blast: a wall of flame rolls out of him to every wall, broken behind each cask and the pot; it leaves the
    // floor scorched everywhere but in their shadows (the clean silhouettes say where you should have stood)
    gut(tg, ctx) {
      const s = tg.live, src = tg.cover ? { x: tg.cover[0], y: tg.cover[1] } : { x: s.x, y: s.y };
      const shadows = coverShadows(src.x, src.y, ctx && ctx.props);
      const n = 44, ph = Array.from({ length: n }, () => rand(0, 6));
      VFX.fx({ dur: 0.95, layer: 'air', draw: (c, p, t, e) => {
        const R = 70 + easeOut(p) * AR() * 1.3, k = e.a * Math.min(1, (1 - p) / 0.5), band = 110 + 70 * p;
        c.save(); clipArena(c); clipOut(c, shadows);
        const g = c.createRadialGradient(src.x, src.y, Math.max(0, R - band), src.x, src.y, R);
        g.addColorStop(0, 'rgba(255,110,30,0)'); g.addColorStop(0.5, `rgba(255,110,30,${0.5 * k})`); g.addColorStop(0.86, `rgba(255,214,120,${0.8 * k})`); g.addColorStop(1, `rgba(80,22,6,${0.75 * k})`);
        c.fillStyle = g; c.beginPath(); c.arc(src.x, src.y, R, 0, TAU); c.fill();
        // the flame front: tongues standing along the edge of the wave
        for (let i = 0; i < n; i++) {
          const a = i * TAU / n, x = src.x + Math.cos(a) * R, y = src.y + Math.sin(a) * R;
          if (ARENA.sd(x, y) > 10) continue;
          // (broad, uneven licks with a hot heart, not a ring of even teeth)
          const h = (30 + 22 * ((ph[i] * 1.7) % 1)) + 16 * Math.sin(t * 13 + ph[i]), sw = Math.sin(t * 9 + ph[i]) * 8, wd = 17 + 7 * ((ph[i] * 2.3) % 1);
          c.globalAlpha = k * 0.85; flameTongue(c, x, y, h * 1.08, wd + 3, sw, '#4a1206');
          c.globalAlpha = k; flameTongue(c, x, y - 1, h, wd, sw, '#ff6a14'); flameTongue(c, x, y - 1, h * 0.62, wd * 0.6, sw * 0.7, '#ffc040'); flameTongue(c, x, y - 1, h * 0.3, wd * 0.3, sw * 0.5, '#fff0c0');
        }
        c.restore(); c.globalAlpha = 1;
      } });
      // the scorch, laid as the wave passes
      const blots = scatter({ kind: 'circle', x: 0, y: 0, r: AR() }, 26).map(q => ({ x: q.x, y: q.y, r: rand(60, 130) }));
      // ([boss presentation] perf: the scorch is painted once into a half-resolution sprite, the arena and the props'
      // shadows already cut out of it, then each frame only blits it faded: it used to build 26 gradients and clip
      // every shadow every frame for 8 s)
      let sprite = null;
      const bake = () => {
        const R = AR() + 10, D = Math.ceil(R * 2 * 0.5), cv = document.createElement('canvas'); cv.width = cv.height = D;
        const g = cv.getContext('2d'); g.setTransform(0.5, 0, 0, 0.5, D / 2, D / 2);
        g.save(); clipArena(g);
        // (faint, like every aftermath: a light film of soot and softer blots, so the room never reads as a new hazard)
        g.globalAlpha = 0.13; g.fillStyle = '#1c100a'; g.fillRect(-R, -R, R * 2, R * 2);
        g.globalAlpha = 1;
        for (const b of blots) {
          const gg = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          gg.addColorStop(0, 'rgba(14,8,4,0.36)'); gg.addColorStop(1, 'rgba(14,8,4,0)');
          g.fillStyle = gg; g.beginPath(); g.ellipse(b.x, b.y, b.r, b.r * 0.7, 0, 0, TAU); g.fill();
        }
        g.restore();
        g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
        for (const sh of shadows) { g.beginPath(); sh.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
        return { cv, R };
      };
      after(0.3, () => VFX.fx({ dur: 8, layer: 'ground', draw: (c, p, t, e) => {
        const life = p * 8, k = e.a * Math.min(1, life / 0.3) * Math.min(1, (8 - life) / 2);
        if (!sprite) sprite = bake();
        c.globalAlpha = Math.min(1, k); c.drawImage(sprite.cv, -sprite.R, -sprite.R, sprite.R * 2, sprite.R * 2); c.globalAlpha = 1;
      }, tick: (p) => { if (Math.random() < 0.3 * (1 - p)) { const b = blots[Math.floor(Math.random() * blots.length)]; VFX.spawn({ x: b.x, y: b.y, z: 4, vx: rand(-6, 6), vz: rand(14, 30), drag: 0.02, life: rand(1.4, 2.2), size: rand(10, 16), size1: 34, color: '#5a4c48', kind: 'smoke', add: false, a: 0.25, fadeIn: 0.25 }); } } }));
      steam(s.x, s.y, 10, 380, '#4a3a34');
      roomTint('#ff7a2a', 0.16, 0.6);
      shake(10);
    },
    hook(tg) {
      const s = tg.live;
      VFX.sparks(s.x, s.y - 20, { color: '#e8eef4', n: 10, angle: s.angle, spread: 0.5, speed: 380 });
      streak(s.x, s.y, s.angle, '#e8eef4', { len: s.len, w: 8, dur: 0.3 });
    },
    rush(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), len = Math.min(s.len, AR() * 2);
      shapeFlash(s, '#ff8a3a', { a: 0.34 });
      for (let d = 30; d < len; d += 70) {
        const x = s.x + ca * d, y = s.y + sa * d;
        if (ARENA.sd(x, y) > 0) break;
        VFX.smoke(x, y, { color: '#d8c4a4', n: 2, size: 34, a: 0.6, speed: 60 });
      }
      shake(7);
    },
    simmer(tg) {
      const s = tg.live;
      shapeFlash(s, '#ff7a3a', { a: 0.32, dur: 0.45 });
      for (const q of scatter(s, 16)) {
        VFX.spawn({ x: q.x, y: q.y, z: 0, vz: rand(50, 130), life: rand(0.4, 0.8), size: rand(8, 16), size1: 2, color: Math.random() < 0.5 ? '#ff9a3a' : '#ffd070' });
        if (Math.random() < 0.3) shockAt(q.x, q.y, { r: 22, color: '#ffc080', w: 2, dur: 0.3, flat: 1 });
      }
    },
    // Grease Fire (and the Flare-Up's heat, Last Orders): every grease puddle on the floor whooshes up; the kitchen flushes
    grease(tg, ctx) {
      // [boss presentation] the same tag, three moves (shape.look, visual only): the Flare-Up's heat and Last Orders
      // get their own landings
      const look = tg.live && tg.live.look;
      if (look === 'heat') return flareHeat();
      if (look === 'orders') return lastOrdersHit(ctx && ctx.bossDraw);
      roomTint('#ff7a1a', 0.26);
      const pools = ((ctx && ctx.room && ctx.room.floor) || []).filter(fl => fl.kind === 'grease');
      const spots = pools.length ? pools.map(fl => ({ x: fl.x, y: fl.y, r: fl.r })) : scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 60 }, 7).map(q => ({ x: q.x, y: q.y, r: 50 }));
      for (const q of spots) after(rand(0, 0.3), () => {
        VFX.flameWall(q.x - q.r * 0.6, q.y, q.x + q.r * 0.6, q.y, { w: q.r * 0.9, h: 80, dur: 1.1, step: 34, size: 1.1 });
        VFX.smoke(q.x, q.y - 30, { color: '#3a2a24', n: 3, size: 34, a: 0.45, speed: 50 });
      });
      shake(7);
    },
    // Gorge lands: a gulp, a blast of heat out of him, and a scorched spiral on the floor
    gorge(tg, ctx) {
      const b = ctx && ctx.bossDraw || tg.live;
      bang(b.x, b.y - 20, 130, { n: 16, dur: 0.5 });
      shockAt(b.x, b.y, { r: AR(), color: '#ffb070', w: 10, dur: 0.6, flat: 1 });
      // (the scorched spiral is BossTells.drawAftermath's now)
      roomTint('#ff6a2a', 0.2, 0.6);
      shake(10);
    },
    // Grubnak, Hard: the belly landing, the cleaver flying out and back, the brandy going up
    // Belly Flop: a ring of flame spikes bursting out from under him, tiles and pans thrown up, a cracked crater left
    flop(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffcf9a', { a: 0.22, dur: 0.45 });
      bang(s.x, s.y, s.r * 1.15, { hole: 0.62, n: 18, color: '#ff8a2a', core: '#ffe9a8', fill: '#ffcf8a', dur: 0.55, z: 4 });
      shockAt(s.x, s.y, { r: AR() * 0.9, color: '#e8d8c0', w: 5, dur: 0.8, flat: 1, delay: 0.1 });
      for (const q of ringPts(s.x, s.y, s.r * 0.95, 12)) VFX.smoke(q.x, q.y, { n: 1, color: '#e0d4c0', size: 34, a: 0.55, speed: 140 });
      VFX.debris(s.x, s.y, { color: '#e2d6c0', n: 12, speed: 1.4, up: 1.3, size: 1.7 });
      VFX.debris(s.x, s.y, { color: '#3a3a42', n: 3, speed: 1.2, up: 1.5, size: 2.2 });
      AFT.crater(s.x, s.y + 10, { r: s.r * 0.75, dur: 9, cracks: 12, flames: 6 });
      shake(13);
    },
    cleaver(tg) {
      const s = tg.live;
      streak(s.x, s.y, s.angle, '#f0a860', { w: 12, dur: 0.3 });   // (warm steel-glint, not a white bar on the pale tiles)
      for (let i = 0; i < 4; i++) { const d = rand(100, AR() * 1.2); VFX.sparks(s.x + Math.cos(s.angle) * d, s.y + Math.sin(s.angle) * d, { color: '#ffffff', n: 4, angle: s.angle, spread: 0.4, speed: 360 }); }
      shake(5);
    },
    cleaverback(tg) {
      const s = tg.live, L = Math.min(s.len, AR() * 2);
      streak(s.x + Math.cos(s.angle) * L, s.y + Math.sin(s.angle) * L, s.angle + Math.PI, '#f0b878', { w: 11, dur: 0.3, len: L });
      VFX.sparks(s.x, s.y, { color: '#ffe6d0', n: 10, speed: 260 });
      shake(5);
    },
    // Flambé: the brandy goes up along the whole stripe in a wall of flame (a white-gold lick in it), and burns it black
    flambe(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, AR() * 2);
      const x1 = s.x + ca * 24, y1 = s.y + sa * 24, x2 = s.x + ca * (L - 24), y2 = s.y + sa * (L - 24);
      // [boss presentation] the hot heart of it white-gold (was blue); when several stripes go up together (Hard), each
      // wall is sparser and only the first two get the inner lick, so a volley isn't a dozen walls of glows at once
      const tn = clk(), burst = tn - flambeAt < 0.15 ? ++flambeN : (flambeN = 0); flambeAt = tn;
      shapeFlash(s, '#ff9a3a', { a: 0.24, dur: 0.5 });
      VFX.flameWall(x1, y1, x2, y2, { w: s.w * 0.7, h: 86, dur: 1.5, travel: 0.35, step: burst ? 84 : 54 });
      if (burst < 2) VFX.flameWall(x1, y1, x2, y2, { w: s.w * 0.2, h: 24, dur: 0.7, travel: 0.3, step: 220, color: '#ffd870', mid: '#fff6d8', ink: '#5a2a08', size: 0.45 });
      after(0.3, () => AFT.scorch(s.x, s.y, s.x + ca * L, s.y + sa * L, { w: s.w * 0.55, dur: 9 }));
      shake(4);
    },
    // Skitterra
    // Venom Mist: the fog front breaks over everyone: green clouds roll in and fill the cave, then thin to a haze
    mist(tg) {
      roomTint('#7ae03a', 0.12, 0.6);
      venomFog();
      shake(5);
    },
    // Eightfold Lunge: the leg rakes down the cone and drives in: a pink claw burst where its tip lands, rock thrown up
    // along it, and a trench torn in the floor that glows pink while it cools
    lunge(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      shapeFlash(s, '#ff7ac0', { a: 0.2, dur: 0.35 });
      streak(s.x, s.y, s.angle, '#ffb0dc', { w: 8, dur: 0.24 });
      const end = reach(s.x, s.y, s.angle).d - 30, d1 = Math.min(600, end), d0 = Math.max(110, Math.min(320, d1 - 120));
      if (d1 > d0 + 40) {
        AFT.gouge(s.x + ca * d0, s.y + sa * d0, s.x + ca * d1, s.y + sa * d1, { w: 30, dur: 8, heat: '#ff3aa8', lip: '#3a1030', ember: '#ff9ad8', heatT: 6.5 });
        const tip = Math.min(500, d1 - 30), tx = s.x + ca * tip, ty = s.y + sa * tip;
        bang(tx, ty, 82, { n: 11, color: '#ff5ab4', core: '#ffe4f4', ink: '#2a0a20' });
        VFX.sparks(tx, ty, { color: '#ffd0ec', n: 8, angle: s.angle, spread: 0.9, speed: 320 });
        for (const q of [0.15, 0.5, 0.85]) { const d = d0 + (d1 - d0) * q; VFX.debris(s.x + ca * d, s.y + sa * d, { color: '#4a4156', n: 4, speed: 0.9 }); }
      }
      shake(4);
    },
    // Venom Spit: a glob lobbed from her fangs bursts in an acid splash where the pool will be
    venom(tg, ctx) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), e = tg.aim != null ? ctx.entById(tg.aim) : null;
      shapeFlash(s, '#9adf3a', { a: 0.18, dur: 0.35 });
      const L = Math.max(200, e ? Math.hypot(e.x - s.x, e.y - s.y) : 380);
      const { x, y } = ARENA.clamp({ x: s.x + ca * L, y: s.y + sa * L }, 60), ox = s.x + ca * 70, oy = s.y + sa * 70;
      VFX.fx({ dur: 0.18, layer: 'air', draw: (c, p, t, ef) => {
        const gx = ox + (x - ox) * p, gy = oy + (y - oy) * p - 30 * (1 - p) - Math.sin(p * Math.PI) * 60;
        VFX.glowAt(c, gx, gy, 24, '#8aff4a', ef.a * 0.6);
        circle(c, gx, gy, 10, '#8adf2a', '#14300a', 2); circle(c, gx - 3, gy - 3.5, 3.5, '#f0ffd0');
      }, done: () => {
        bang(x, y, 95, { n: 16, color: '#8adf2a', core: '#f4ffc8', ink: '#123008', dur: 0.45 });
        VFX.splash(x, y, { color: '#8ad82a', n: 16, speed: 1.2 });
        VFX.smoke(x, y, { color: '#8ad84a', n: 5, size: 30, a: 0.45, speed: 50, life: 1.2 });
        shake(4);
      } });
    },
    // Snare Weave (Hard): each snare springs shut in a flick of silk (light: there are dozens at once); the pockets go
    // quietly; an Egg-Laden clutch splits and its venom spills out
    snare(tg) { const s = tg.live; shapeFlash(s, '#f4f0ff', { a: 0.16, dur: 0.35 }); shockAt(s.x, s.y, { r: s.r, color: '#f4f0ff', w: 3, dur: 0.3, flat: 1 }); shake(3); },
    snaregap() {},
    eggdrop(tg) {
      const s = tg.live;
      VFX.burst(s.x, s.y - 30, { color: '#e8ff9a', color2: '#ffffff', n: 12, speed: 180 });
      VFX.splash(s.x, s.y, { color: '#8ad82a', n: 12 });
    },
    // Burial Rites and the Writ (the Hollow King, Hard): the grave closes in its owner's colour; a writ's line of
    // grave-light runs out from him; a torn writ goes nowhere
    grave(tg) { const s = tg.live; shapeFlash(s, tg.color || '#ffffff', { a: 0.3, dur: 0.5 }); VFX.pillar(s.x, s.y, { r: 40, h: 160, color: tg.color || '#ffffff', dur: 0.6 }); },
    writ(tg) { const s = tg.live; streak(s.x, s.y, s.angle, '#9affc0', { len: s.len, w: 14, dur: 0.4 }); sweep(s, '#7affa8', 0.3); shake(5); },
    pardon() {},
    // the Dinner Rush (Grubnak, Hard): a hot plate set down with a clink and a puff of steam (it becomes a plate on
    // the rail, which has its own tell)
    platedrop(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r * 0.8, color: '#fff2c8', w: 3, dur: 0.3, flat: 1 }); steam(s.x, s.y, 3, 70); },
    // Supercell (Volkar, Hard): a rod driven into the rock; each cell of a front as it breaks: a bolt and a sheet of
    // rain hitting the floor (light: a whole front lands a strip at a time); the lanes go quietly
    groundrod(tg) {
      const s = tg.live;
      bang(s.x, s.y, 40, { n: 8, color: '#5ab8ff', core: '#ffffff', ink: '#0a1a3a', layer: 'ground' });
      VFX.debris(s.x, s.y, { color: '#5a6270', n: 5, speed: 0.8 });
      AFT.decal(s.x, s.y, { style: 'crack', r: 45, dur: 8, a: 0.6, seed: Math.random() * 6 });
      shake(4);
    },
    squallcell(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), d = s.len * (0.3 + Math.random() * 0.4);
      // ([boss presentation] perf: a front breaks a strip of cells at once; only one screen-blended flash per beat, the rest rims)
      const tn = clk(), lone = tn - squallAt > 0.12; if (lone) squallAt = tn;
      shapeFlash(s, '#cfe6ff', { a: 0.18, dur: 0.3, rimOnly: !lone });
      VFX.lightning(s.x + ca * d + rand(-20, 20), s.y + sa * d - 380, s.x + ca * d, s.y + sa * d, { color: '#dffbff', jag: 22, dur: 0.3 });
      shake(2);
    },
    stilllane() {},
    // [boss presentation] Still Air: a stone's charge going quiet into whoever stood with it (its own colour), not a generic flash
    still(tg) { const s = tg.live, col = tg.color || '#9ff4ff'; shockAt(s.x, s.y, { r: s.r * 0.6, color: col, w: 3, dur: 0.35, flat: 1 }); VFX.sparks(s.x, s.y - 30, { color: col, n: 6, speed: 160 }); },
    // Skitterra, Hard: a sac bursting, the charge, a glob of silk landing
    eggsac(tg) {
      const s = tg.live;
      VFX.burst(s.x, s.y - 6, { color: '#e8ff9a', color2: '#ffffff', n: 16, speed: 220 });
      VFX.splash(s.x, s.y, { color: '#8ad82a', n: 10 });
      shockAt(s.x, s.y, { r: s.r * 1.3, color: '#d8ff7a', w: 5, flat: 1 });
      shake(3);
    },
    // Fang Rush: a pink smear down the lane behind her as she charges, claw bursts and rock kicked up where she passes,
    // and a heavier burst where she stops (the silk she drags is the trail zone)
    fang(tg, ctx) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), b = ctx.bossDraw;
      shapeFlash(s, '#ff7ac0', { a: 0.26, dur: 0.4 });
      let last = 0, stillFor = 0, prev = 0, done = false;
      const along = () => b ? Math.max(0, (b.x - s.x) * ca + (b.y - s.y) * sa) : 0;
      VFX.fx({ dur: 2.2, layer: 'ground', tick: (p, dt) => {
        if (done) return;
        const d = along();
        if (d - last > 100) { last = d; const x = s.x + ca * d, y = s.y + sa * d; bang(x, y, 46, { n: 9, color: '#ff5ab4', core: '#ffe4f4', ink: '#2a0a20', dur: 0.3 }); VFX.debris(x, y, { color: '#4a4156', n: 3, speed: 1 }); }
        stillFor = d - prev < 1 && d > 60 ? stillFor + dt : 0; prev = d;
        if (stillFor > 0.08) {
          done = true; const x = s.x + ca * d, y = s.y + sa * d;
          bang(x, y, 90, { n: 13, color: '#ff5ab4', core: '#ffe4f4', ink: '#2a0a20' }); VFX.debris(x, y, { color: '#4a4156', n: 8, speed: 1.2 }); shake(7);
        }
      }, draw: (c, p, t, e) => {
        const d = Math.max(prev, 1), k = e.a * Math.min(1, (1 - p) / 0.5), hw = 70;
        c.save(); clipArena(c);
        const g = c.createLinearGradient(s.x, s.y, s.x + ca * d, s.y + sa * d);
        g.addColorStop(0, 'rgba(255,90,180,0)'); g.addColorStop(0.6, `rgba(255,90,180,${0.5 * k})`); g.addColorStop(1, `rgba(255,220,240,${0.7 * k})`);
        c.beginPath(); c.moveTo(s.x - sa * 12, s.y + ca * 12); c.lineTo(s.x + ca * d - sa * hw, s.y + sa * d + ca * hw);
        c.lineTo(s.x + ca * d + sa * hw, s.y + sa * d - ca * hw); c.lineTo(s.x + sa * 12, s.y - ca * 12); c.closePath();
        c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fill();
        c.restore();
      } });
      shake(4);
    },
    glob(tg) {
      const s = tg.live;
      VFX.smoke(s.x, s.y, { color: '#f4f0ff', n: 6, size: 26, a: 0.65, speed: 70 });
      VFX.burst(s.x, s.y, { color: '#f4f0ff', n: 10, speed: 180, size: 10 });
      shockAt(s.x, s.y, { r: s.r, color: '#ffffff', w: 4, dur: 0.35, flat: 1 });
    },
    // Volkar
    // Thunderclap: the clap breaks round him in a ring of lightning, bolts strike out across the summit, and the rock
    // round him is left cracked and smoking, the cracks still crackling blue
    clap(tg, ctx) {
      const b = ctx && ctx.bossDraw;
      if (b) {
        bang(b.x, b.y, 420, { hole: 0.74, n: 30, color: '#5ab8ff', core: '#ffffff', ink: '#0a1a3a', dur: 0.55, layer: 'ground' });
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + rand(-0.15, 0.15), L = rand(260, 400); VFX.lightning(b.x, b.y - 20, b.x + Math.cos(a) * L, b.y + Math.sin(a) * L * 0.9, { color: i % 2 ? '#ffffff' : '#9fe0ff', jag: 22, dur: 0.4 }); }
        AFT.crater(b.x, b.y, { r: 230, color: '#4fc8ff', core: '#dff6ff', cracks: 14, flames: 0, dur: 7, a: 0.7 });
      }
      roomTint('#bfe0ff', 0.22, 0.6);
      // stray bolts grounding round the summit: a crackling splash where each lands (not a bare outline ring)
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 40 }, 6)) after(rand(0, 0.25), () => {
        VFX.lightning(q.x + rand(-40, 40), q.y - 320, q.x, q.y, { color: '#bfe8ff', jag: 22, dur: 0.35 });
        bang(q.x, q.y, 34, { n: 9, color: '#5ab8ff', core: '#dff6ff', ink: '#0a1a3a', dur: 0.3, layer: 'ground', z: 2 });
        VFX.sparks(q.x, q.y, { color: '#bfe8ff', n: 5, speed: 220 });
      });
      shake(8);
    },
    surge(tg, ctx) {
      const us = (ctx && ctx.units) || [], pol = ctx && ctx.pol;
      if (!pol) return;
      for (const u of us) {
        const s = pol.get(u.id); if (!s) continue;
        const col = s > 0 ? '#ffc24a' : '#4ad8ff';
        shockAt(u.x, u.y, { r: 70, color: col, w: 4, dur: 0.4, flat: 1 });
        VFX.sparks(u.x, u.y - 14, { color: col, n: 6, speed: 220 });
      }
      for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
        const a = us[i], b = us[j];
        if (pol.get(a.id) !== pol.get(b.id) || Math.hypot(a.x - b.x, a.y - b.y) > tg.live.r) continue;
        for (let n = 0; n < 3; n++) VFX.lightning(a.x, a.y - 16, b.x, b.y - 16, { color: '#ff7a6a', jag: 14, dur: 0.45 });
        shake(6);
      }
    },
    // Thunder Crash: the bolt comes down and splits between everyone standing under it, scorching where each stood
    crash(tg, ctx) {
      const s = tg.live, us = ((ctx && ctx.units) || []).filter(u => Math.hypot(u.x - s.x, u.y - s.y) <= s.r + 10), mx = s.x, my = s.y - 130;
      VFX.lightning(s.x + rand(-20, 20), s.y - 380, mx, my, { color: '#fff2b0', jag: 26, dur: 0.45 });
      for (const u of us.length ? us : [s]) {
        VFX.lightning(mx, my, u.x, u.y - 10, { color: '#ffffff', jag: 16, dur: 0.42 });
        AFT.scorch(u.x, u.y, u.x, u.y, { w: 60, dur: 6, ember: '#ffe27a', smokeRate: 0.1 });
      }
      if (us.length > 1) crackle(us.map(u => [u.x, u.y]), '#ffe27a', 3);
      VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 260, color: '#fff0a0', dur: 0.6 });
      shockAt(s.x, s.y, { r: s.r * 1.3, color: '#ffe27a', w: 6, flat: 1 });
      AFT.decal(s.x, s.y, { style: 'crack', r: 50, dur: 2.2, a: 0.5, seed: Math.random() * 6 });
      shake(6);
    },
    static(tg) {
      const s = tg.live;
      shapeFlash(s, '#c070ff', { a: 0.18, dur: 0.35 });   // (a thinner flash: the full-strength one read as a flat pink disc)
      for (let i = 0; i < 4; i++) { const a = rand(0, TAU); VFX.lightning(s.x, s.y - 10, s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r, { color: '#e0b8ff', jag: 10, dur: 0.3 }); }
    },
    rod(tg) {
      const s = tg.live;
      VFX.lightning(s.x + rand(-30, 30), s.y - 420, s.x, s.y - 84, { color: '#bff6ff', jag: 30, dur: 0.45 });
      VFX.lightning(s.x + rand(-30, 30), s.y - 420, s.x, s.y - 84, { color: '#ffffff', jag: 24, dur: 0.3 });
      shockAt(s.x, s.y, { r: s.r * 1.2, color: '#9ff4ff', w: 6, dur: 0.45, flat: 1 });
      VFX.sparks(s.x, s.y - 80, { color: '#dffbff', n: 14, speed: 300 });
      bang(s.x, s.y, 70, { n: 12, color: '#5ab8ff', core: '#ffffff', ink: '#0a1a3a', layer: 'ground' });
      VFX.debris(s.x, s.y, { color: '#5a6270', n: 6, speed: 0.9 });
      AFT.decal(s.x, s.y, { style: 'crack', r: 70, dur: 6, a: 0.6, seed: Math.random() * 6 });
      roomTint('#bfe8ff', 0.12, 0.3);
      shake(7);
    },
    // Heavens Fall: the column of sky comes down on them, rock flung out of the ring, and a crater left round them
    heavens(tg) {
      const s = tg.live;
      VFX.pillar(s.x, s.y, { r: s.r * 0.9, h: 520, color: '#dff4ff', dur: 0.9 });
      for (let i = 0; i < 5; i++) VFX.lightning(s.x + rand(-60, 60), s.y - 480, s.x + rand(-s.r * 0.6, s.r * 0.6), s.y + rand(-20, 20), { color: i % 2 ? '#ffffff' : '#9fe0ff', jag: 28, dur: 0.5 });
      bang(s.x, s.y, s.r * 1.6, { hole: 0.6, n: 22, color: '#9fe0ff', core: '#ffffff', ink: '#0a1a3a', dur: 0.5, layer: 'ground' });
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10, r = s.r * 1.2; VFX.debris(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.8, { color: '#5a6270', n: 3, speed: 1.2 }); }
      AFT.crater(s.x, s.y, { r: s.r * 1.5, color: '#4fc8ff', core: '#dff6ff', cracks: 12, flames: 0, dur: 7, a: 0.6 });
      roomTint('#dff4ff', 0.25, 0.5);
      shake(11);
    },
    gale(tg) {
      const s = tg.live;
      shockAt(s.x, s.y, { r: AR() * 1.1, color: '#e8f4ff', w: 14, dur: 0.6, flat: 1 });
      shockAt(s.x, s.y, { r: AR() * 0.9, color: '#bfe0ff', w: 6, dur: 0.75, flat: 1, delay: 0.08 });
      // (thin grey-blue gusts, not 16 white bars: they read as wind, and don't paint over the lee behind the posts)
      for (let i = 0; i < 16; i++) streak(s.x, s.y, i * TAU / 16 + rand(-0.1, 0.1), '#7f9cc0', { w: 3, dur: 0.4, len: AR() });
      for (let i = 0; i < 14; i++) { const a = rand(0, TAU), d = rand(140, AR() * 0.8); VFX.smoke(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, { color: '#c8d0dc', n: 1, size: 30, a: 0.4, speed: 160 }); }
      sweptFloor(s.x, s.y, 4);
      shake(10);
    },
    // Volkar, Hard: the storm cell over Chain Lightning's target breaks (the leaps come in their own message), and
    // the sky falling
    chain(tg) { const s = tg.live; shockAt(s.x, s.y, { r: s.r, color: '#9ff4ff', w: 4, dur: 0.4, flat: 1 }); roomTint('#bfe8ff', 0.1, 0.3); },
    skyfall(tg) {
      const s = tg.live;
      for (let i = 0; i < 4; i++) VFX.lightning(s.x + rand(-50, 50), s.y - 460, s.x + rand(-20, 20), s.y, { color: i % 2 ? '#ffffff' : '#bfe8ff', jag: 30, dur: 0.5 });
      VFX.pillar(s.x, s.y, { r: 90, h: 420, color: '#dff4ff', dur: 0.8 });
      for (let i = 0; i < 3; i++) shockAt(s.x, s.y, { r: 640, color: '#cfeaff', w: 12 - i * 3, dur: 0.7, flat: 1, delay: i * 0.12 });
      AFT.decal(s.x, s.y, { style: 'crack', r: 110, dur: 3, a: 0.6, seed: Math.random() * 6 });
      roomTint('#dff4ff', 0.3, 0.6);
      shake(12);
    },
    // Rod Strike: the bolts come in their own message (propfx 'bolt'); Avalanche: the boulder thuds down where it stops
    rodstrike() {},
    avalanche(tg) {
      const s = tg.live, d = s.len - 40, x = s.x + Math.cos(s.angle) * d, y = s.y + Math.sin(s.angle) * d;
      VFX.smoke(x, y, { color: '#c8c0b0', n: 10, size: 40, a: 0.6, speed: 120 });
      VFX.debris(x, y - 10, { color: '#6a6460', n: 10, speed: 1.1 });
      shockAt(x, y, { r: 120, color: '#e0d6c4', w: 6, dur: 0.45, flat: 1 });
      AFT.decal(x, y, { style: 'crack', r: 60, dur: 3, a: 0.5, seed: Math.random() * 6 });
      for (let i = 0; i < 6; i++) { const q = i / 6; VFX.smoke(s.x + Math.cos(s.angle) * d * q, s.y + Math.sin(s.angle) * d * q, { color: '#b8ae9c', n: 2, size: 30, a: 0.4, speed: 50 }); }
      shake(6);
    },
    // the Hollow King
    // Barrow Knell: the bell tolls: rings of grave-light and violet roll out across the hall from him, grit jumping
    knell(tg, ctx) {
      const b = (ctx && ctx.bossDraw) || { x: 0, y: 0 };
      roomTint('#c8ffdc', 0.2, 0.7);
      VFX.flash(b.x + 110, b.y - 120, 120, '#c8ffdc', 0.3);
      for (let i = 0; i < 4; i++) shockAt(b.x, b.y, { r: AR() * 1.2, color: i % 2 ? '#b46aff' : '#c8ffdc', w: 9 - i, dur: 0.85, flat: 1, delay: i * 0.14 });
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() }, 10)) after(rand(0.05, 0.4), () => VFX.debris(q.x, q.y, { color: '#4a5054', n: 2, speed: 0.6, up: 0.6 }));
      shake(7);
    },
    gaze() { roomTint('#e8fff0', 0.16, 0.4); },
    // his three swings, each in its own colour (boss-tells.js SWING): the Sweep a gold scythe-arc that leaves a
    // scorched crescent, the Stomp a teal shockwave and a cracked crater, the Crown hands of violet light bursting up
    sweep(tg) { swingSweep(tg.live, '#e8c15a', '#fff2c0'); shake(7); },
    stomp(tg) { swingStomp(tg.live, '#4fe0d0', '#dffff8'); shake(9); },
    ring(tg) { swingRing(tg.live, '#a070ff', '#e8d8ff'); shake(8); },
    esweep(tg) { swingSweep(tg.live, '#9fd0ff', '#eaf6ff', 0.7); shake(5); },
    estomp(tg) { swingStomp(tg.live, '#9fd0ff', '#eaf6ff', 0.7); shake(6); },
    ering(tg) { swingRing(tg.live, '#9fd0ff', '#eaf6ff', 0.7); shake(6); },
    marks(tg) { const s = tg.live; shapeFlash(s, '#9affc0', { a: 0.35, dur: 0.4 }); VFX.sparks(s.x, s.y, { color: '#c8ffd8', n: 6, speed: 220 }); },
    bell(tg) {
      const s = tg.live;
      for (let i = 0; i < 3; i++) shockAt(s.x, s.y, { r: s.r * (1.4 + i * 0.6), color: '#ffe2a0', w: 5, dur: 0.6, flat: 1, delay: i * 0.12 });
      VFX.sparks(s.x, s.y - 100, { color: '#ffe8b0', n: 10, speed: 200 });
      shake(4);
    },
    // the Hollow King, Hard: the crown's flash, and a rank of the dead tramping through
    audience() { roomTint('#ffe6a0', 0.18, 0.45); },
    march(tg) { graveBurst(tg.live, '#7affa8'); sweep(tg.live, '#c8ffd8', 0.4); shake(5); },
  };
  // the Sceptre Sweep: a scythe-arc of light swept through the cone, then a scorched crescent where it passed
  function swingSweep(s, color, core, a = 1) {
    graveBurst(s, color);
    for (const r of [180, 300]) VFX.slash(s.x, s.y, s.angle, { r, span: Math.min(s.arc, 2.4), color: core, dur: 0.4, w: 0.55, sparks: 6 });
    if (a < 1) return;
    for (let i = 0; i <= 8; i++) { const ang = s.angle - s.arc / 2 + s.arc * i / 8, d = 240 + Math.sin(i) * 20, x = s.x + Math.cos(ang) * d, y = s.y + Math.sin(ang) * d; if (ARENA.sd(x, y) < -20) AFT.scorch(x, y, x, y, { w: 46, dur: 6, ember: color, smokeRate: 0.06 }); }
  }
  // the Barrow Stomp: a shockwave out through the flagstones and a crater left cracked and glowing
  function swingStomp(s, color, core, a = 1) {
    graveBurst(s, color);
    shockAt(s.x, s.y, { r: s.r * 1.1, color, w: 10, dur: 0.5, flat: 1 });
    bang(s.x, s.y, s.r * 0.55, { n: 14, color, core, ink: '#0a1a18', layer: 'ground' });
    VFX.debris(s.x, s.y, { color: '#4a5054', n: 10, speed: 1.2 });
    if (a < 1) return;
    AFT.crater(s.x, s.y, { r: s.r * 0.6, color, core, cracks: 12, flames: 0, dur: 6, a: 0.7 });
  }
  // the Crown of Graves: hands of light bursting up out of the floor all round him, and the safe ring flashing
  function swingRing(s, color, core, a = 1) {
    graveBurst(s, color);
    shockAt(s.x, s.y, { r0: AR(), r: s.r2, color, w: 10, dur: 0.5, flat: 1 });
    for (const q of scatter(s, 22)) after(rand(0, 0.2), () => {
      for (let i = 0; i < 3; i++) VFX.spawn({ x: q.x + rand(-6, 6), y: q.y, z: 4, vx: rand(-10, 10), vz: rand(120, 220) * a, drag: 0.02, life: 0.7, size: rand(4, 6), size1: 0, color: i ? color : core });
      VFX.flash(q.x, q.y - 12, 20, core, 0.25);
    });
  }
  // Court of Bones: a coffin bursting open: lid shards, grave-light and bone, and a skeleton climbing out of it
  function coffinBurst(x, y) {
    bang(x, y - 10, 70, { n: 12, color: '#7affa8', core: '#eafff0', ink: '#0a1a10' });
    VFX.burst(x, y - 20, { color: '#b46aff', color2: '#c8ffd8', n: 14, speed: 240, size: 11 });
    for (let i = 0; i < 8; i++) { const a = rand(0, TAU), sp = rand(100, 240); VFX.spawn({ x, y, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 240), g: 600, life: 0.7, size: 11, color: i % 2 ? '#565d61' : '#e8e4d8', kind: 'shard', add: false, vr: rand(-10, 10) }); }
    VFX.debris(x, y, { color: '#565d61', n: 8, speed: 1.1 });
    VFX.smoke(x, y, { color: '#8a9890', n: 6, size: 30, a: 0.5, speed: 70 });
    shake(5);
  }
  // Lights Out: every brazier snuffed in a gust of black smoke, its last embers dying
  function snuff(room) {
    for (const pr of (room && room.props) || []) {
      if (pr.kind !== 'brazier') continue;
      VFX.smoke(pr.x, pr.y - 30, { color: '#141a18', n: 6, size: 30, a: 0.8, speed: 50, life: 1.6 });
      VFX.sparks(pr.x, pr.y - 30, { color: '#7affa8', n: 5, speed: 120 });
    }
  }
  // grave-light bursting up out of an area
  function graveBurst(s, color) {
    shapeFlash(s, color, { a: 0.32, dur: 0.45 });
    for (const q of scatter(s, 10)) after(rand(0, 0.15), () => VFX.pillar(q.x, q.y, { r: 16, h: 90 + rand(0, 60), color, dur: 0.45 }));
  }

  function impact(tg, msg, ctx) {
    // Azerath: every tag of his lands in archmage-art.js
    if (ctx && ctx.boss === 'archmage' && typeof AZ_ART !== 'undefined') { AZ_ART.impact(tg, ctx, { shapeFlash, shockAt, scatter, after, shake, roomTint, sweep }); return; }
    // (an untagged raidwide washes the room in the boss's own colour, softly, instead of a grey-white veil)
    if (tg.type === 'raidwide') { (IMPACT[tg.tag] || (() => { roomTint({ grubnak: '#ff8a3a', skitterra: '#b070ff', volkar: '#7fc8ff', hollowking: '#6dff9a', wyrm: '#ff8a3a', titan: '#9fd8ff' }[ctx && ctx.boss] || '#ffffff', 0.15); shake(6); }))(tg, ctx); return; }
    if (tg.type === 'proximity') { (IMPACT[tg.tag] || IMPACT.boil)(tg); shake(10); return; }
    if (tg.type === 'knockback') { const s = tg.live; shockAt(s.x, s.y, { r: 380, color: '#bfe6ff', w: 8, dur: 0.6, flat: 1 }); VFX.tornado(s.x, s.y, { r: 50, h: 160, dur: 0.7 }); return; }
    if (tg.type === 'buster') { buster(tg, ctx); return; }
    if (IMPACT[tg.tag]) { IMPACT[tg.tag](tg, ctx); return; }
    const color = { stack: '#ffe27a', spread: '#e0b0ff', tower: '#b0fff4' }[tg.type] || '#ffb070';
    shapeFlash(tg.live, color, { a: 0.38 });
    for (const q of scatter(tg.live, 6)) VFX.sparks(q.x, q.y, { color, n: 3, speed: 260 });
  }

  // tankbusters: a heavy hit on whoever it was aimed at, shaped by the boss's weapon
  function buster(tg, ctx) {
    const s = tg.live, e = tg.target != null ? ctx.entById(tg.target) : null;
    const x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
    shapeFlash(s, '#ff4a3a', { a: 0.28 });
    if (ctx.boss === 'volkar') {
      // Titan Fist: a stone fist and the lightning riding it
      // Titan Fist: a stone fist wrapped in lightning comes down: shards of rock spike up round the tank, and the floor
      // is smashed along the cone, the cracks glowing blue while they cool
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), r = s.r || 320;
      for (let i = 0; i < 3; i++) VFX.lightning(s.x, s.y - 20, x + rand(-16, 16), y + rand(-12, 12), { color: '#9ff4ff', jag: 12, dur: 0.4 });
      VFX.hit(x, y, '#bff6ff', 2.3);
      bang(x, y, 100, { n: 12, color: '#5a7a9a', core: '#dff6ff', ink: '#0a1222' });
      VFX.crystals(x, y, { r: 56, n: 9, h: 66, color: '#6a86a8', dur: 1.1 });
      shockAt(x, y, { r: 90, color: '#9ff4ff', w: 6, flat: 1 });
      AFT.gouge(s.x + ca * 70, s.y + sa * 70, s.x + ca * r, s.y + sa * r, { w: 34, dur: 8, heat: '#3ab8ff', lip: '#1a2230', ember: '#bff6ff', heatT: 5 });
      VFX.debris(x, y, { color: '#5a6270', n: 10, speed: 1.2 });
      AFT.decal(x, y, { style: 'crack', r: 70, dur: 6, a: 0.6, seed: Math.random() * 6 });
    } else if (ctx.boss === 'hollowking') {
      // Grave Cleave: the greatsword comes down in grave-light and violet, splits the floor along the cone (the rift
      // glows a while) and the wound keeps bleeding
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), r = s.r || 320;
      VFX.slash(x, y, s.angle + Math.PI / 2, { r: 90, span: 2.4, color: '#c8ffd8', dur: 0.4, w: 0.55, sparks: 8 });
      VFX.hit(x, y, '#ff4a3a', 2.3);
      bang(x, y, 90, { n: 13, color: '#7affa8', core: '#eafff0', ink: '#1a0a2a' });
      AFT.gouge(s.x + ca * 60, s.y + sa * 60, s.x + ca * r, s.y + sa * r, { w: 28, dur: 8, heat: '#a050ff', lip: '#14101c', ember: '#9affc0', heatT: 5 });
      VFX.debris(x, y, { color: '#4a5054', n: 8, speed: 1.1 });
      VFX.splash(x, y, { color: '#a01a1a', n: 10 });
    } else if (ctx.boss === 'skitterra') {
      // Silk Wrap: the cage snaps shut, strands whipping in round the tank, and a web left stuck to the floor (the
      // cocoon itself is drawn while they're rooted)
      silkWhip(x, y);
      VFX.hit(x, y, '#e8dcff', 2);
      VFX.burst(x, y - 20, { color: '#f4f0ff', n: 14, speed: 220, size: 9 });
      webDecal(x, y, 120, 7);
    } else {
      // Tenderize: the ghost cleaver comes down flat along the cone, out from him through the tank, and cuts the floor
      // the length of it
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), r = s.r || 320, mid = (60 + r) / 2;
      // (the handle at his end, under him: the blade reaches out from his hand to the cone's edge, never past it)
      flatCleaver(s.x + ca * mid, s.y + sa * mid, -ca, -sa, sa, -ca, (r - 60) / 2, 90, { off: -45, from: 60 });
      after(0.06, () => {
        bang(x, y, 95, { n: 14 });
        VFX.hit(x, y, '#ff5a3a', 2.2);
        AFT.gouge(s.x + ca * 60, s.y + sa * 60, s.x + ca * r, s.y + sa * r, { w: 20, dur: 9 });
        for (let d = 90; d < r; d += 80) bang(s.x + ca * d, s.y + sa * d, 40, { n: 9, dur: 0.32 });
        VFX.sparks(x, y, { color: '#fff0c8', n: 12, speed: 340 });
        VFX.debris(x, y, { color: '#e2d6c0', n: 7, speed: 1.1, size: 1.3 });
        shake(9);
      });
    }
    shake(8);
  }

  // ---------------------------------------------------------------- casts, autos, adds, moments
  const CAST_COLOR = {
    grubnak: { def: '#ffb050', boil: '#ff6a2a', bell: '#9ffff4', whisk: '#fff0c8', raise: '#ff7a1a', flop: '#f0e0c8', throw: '#ffe6d0', flambe: '#ffd870',
      charge: '#ff8a4a', larder: '#ffd8a0', gut: '#c8d87a', hook: '#e8eef4', drains: '#b89a5a' },
    skitterra: { def: '#d08aff', mist: '#9adf3a', spit: '#9adf3a', wrap: '#f4f0ff', silk: '#f4f0ff', web: '#f4f0ff', lunge: '#ff7ac0', eggs: '#e8ff9a', fang: '#ff7ac0', volley: '#f4f0ff',
      deluge: '#9adf3a', strand: '#f4f0ff', ambush: '#b090ff', cocoon: '#f4f0ff' },
    volkar: { def: '#7fe8ff', surge: '#ffe08a', crash: '#ffe27a', field: '#d79bff', gale: '#e8f4ff', walls: '#e8f4ff', fist: '#9ff4ff', skyfall: '#dff4ff', avalanche: '#d8c8a8' },
    hollowking: { def: '#6dff9a', gaze: '#f0fff4', doom: '#b46aff', bells: '#ffd88a', cleave: '#ff8a7a', night: '#8aa0ff', audience: '#ffe6a0',
      lightsout: '#f0fff4', lids: '#c8ffd8', decree: '#7affa8' },
    titan: { def: '#9fe8ff', howl: '#cfeaff', fist: '#bfe0ff', slam: '#9fe8ff', sweep: '#dff4ff', breath: '#eaf6ff', avalanche: '#e8f2fa', cast: '#bff0ff' },
    wyrm: { def: '#ff8a2a', breath: '#ffd27a', roar: '#ff5a1a', dive: '#ffb04a', fly: '#ffd2a0', heart: '#ffe08a', roost: '#ff7a3a' },
    archmage: { def: '#7fe8e0', fire: '#ff6a2a', pyre: '#ff6a2a', frost: '#7fd8ff', lances: '#7fd8ff', bolt: '#ffe45a', chain: '#ffe45a', void: '#a05aff', rifts: '#a05aff', rune: '#ffe08a', swap: '#ffe08a', mark: '#ffe08a', conv: '#ffffff', bind: '#3fe0d0', counter: '#c8a0ff', lance: '#9af0ff' },
    hydra: { def: '#7fe0a8', head: '#c8ffd8', cry: '#ffe9a8', maul: '#ffb070', dive: '#7ffff0', heart: '#ffe08a', gaze: '#e8e8f8' },
  };
  // the wind-up while the boss casts: motes spiral in, a ring tightens, everything brightens near the end
  // Gorge: the whole kitchen is sucked into him: arms of fire and food spiralling in, tightening as he swallows
  function gorgeVortex(b, dur) {
    const arms = 4, ph = rand(0, TAU);
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.2) * Math.min(1, (1 - p) / 0.15), R = 460 - 300 * easeOut(p), spin = ph + t * (4 + p * 6);
      c.save(); c.translate(b.x, b.y - 20); c.scale(1, 0.62); c.lineCap = 'round'; c.lineJoin = 'round';
      // each arm a broad band of fire that thins as it winds in: ink edge, orange body, a hot yellow heart
      const arm = (i, scale) => {
        const pts = [];
        for (let q = 0; q <= 1.0001; q += 0.05) { const a = spin + i * TAU / arms + q * 3.4, r = R * (1 - q * 0.85), w = (46 * (1 - q) + 6) * scale; pts.push([Math.cos(a) * r, Math.sin(a) * r, a, w]); }
        c.beginPath();
        for (const [x, y, a, w] of pts) c.lineTo(x + Math.cos(a) * w * 0.5, y + Math.sin(a) * w * 0.5);
        for (let j = pts.length - 1; j >= 0; j--) { const [x, y, a, w] = pts[j]; c.lineTo(x - Math.cos(a) * w * 0.5, y - Math.sin(a) * w * 0.5); }
        c.closePath(); c.fill();
      };
      for (let i = 0; i < arms; i++) {
        c.globalAlpha = k * 0.8; c.fillStyle = '#2a0e04'; arm(i, 1.25);
        c.globalAlpha = k; c.fillStyle = '#ff6a14'; arm(i, 1);
        c.fillStyle = '#ffb428'; arm(i, 0.55);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.8; c.fillStyle = '#fff0c0'; arm(i, 0.22); c.globalCompositeOperation = 'source-over';
      }
      c.restore(); c.globalAlpha = 1;
      VFX.glowAt(c, b.x, b.y - 20, 120 + 80 * p, '#ffb040', k * (0.3 + 0.4 * p));
    }, tick: (p) => {
      // chunks of food flying in
      if (Math.random() < 0.7) { const a = rand(0, TAU), r = 420 - 200 * p, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r * 0.62;
        VFX.spawn({ x, y, z: 20, vx: (b.x - x) * 2.2, vy: (b.y - y) * 2.2, vz: rand(0, 30), drag: 0.01, life: 0.45, size: rand(5, 9), size1: 2, color: Math.random() < 0.5 ? '#7a4620' : '#c0401a', kind: 'drop', add: false }); }
    } });
  }
  // the Chrysalis: silk winds up round her from the floor as the cast runs, thickening into a cocoon. If the party tears
  // enough off her first it bursts open (cocoonEnd); if not, it closes and the enrage follows.
  let cocoon = null;
  function chrysalis(b, dur) {
    const bands = Array.from({ length: 16 }, (_, i) => ({ ph: rand(0, 6), tilt: rand(-0.25, 0.25), w: 1.5 + (i % 3) }));
    cocoon = VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      if (e.gone) return;
      const k = e.a * Math.min(1, p / 0.05), R = 92, cy = b.y - 34, H = R * 1.2;
      c.save();
      c.fillStyle = `rgba(236,230,250,${(0.06 + 0.3 * p) * k})`;
      c.beginPath(); c.ellipse(b.x, cy, R * (1 - 0.18 * p), H, 0, 0, TAU); c.fill();
      c.lineCap = 'round';
      const n = Math.min(bands.length, 2 + Math.floor(p * 15));
      for (let i = 0; i < n; i++) {
        const q = bands[i], y = cy + H * 0.85 - i * (H * 1.7 / bands.length), u = (y - cy) / H, w = R * (1 - 0.18 * p) * Math.sqrt(Math.max(0, 1 - u * u));
        c.strokeStyle = `rgba(250,246,255,${(0.35 + 0.5 * p) * k})`; c.lineWidth = q.w;
        c.beginPath(); c.moveTo(b.x - w, y + w * q.tilt); c.quadraticCurveTo(b.x, y + 9 + 3 * Math.sin(t * 2 + q.ph), b.x + w, y - w * q.tilt); c.stroke();
      }
      // the last few seconds: it pulses, nearly shut
      if (p > 0.8) VFX.neonRing(c, b.x, cy, R * 0.9, '#f4f0ff', 2, k * (p - 0.8) * 3 * (0.6 + 0.4 * Math.sin(t * 14)), 0.5);
      c.restore();
    } });
  }
  function cocoonEnd(b, torn) {
    if (cocoon) { cocoon.gone = true; cocoon = null; }
    if (!torn) return;
    VFX.burst(b.x, b.y - 34, { color: '#f4f0ff', n: 26, speed: 300, size: 12 });
    for (let i = 0; i < 16; i++) VFX.spawn({ x: b.x + rand(-60, 60), y: b.y - 34 + rand(-70, 50), z: 30, vx: rand(-260, 260), vy: rand(-160, 160), vz: rand(60, 220), g: 320,
      life: 0.9, size: 14, color: '#ffffff', stretch: 4, vr: rand(-8, 8) });
    shockAt(b.x, b.y, { r: 200, color: '#f4f0ff', w: 5, dur: 0.5, flat: 1 });
    shake(6);
  }
  // [boss presentation] each move gathers in its own way, in the right place on him (CAST_FX), and his body takes a
  // pose for it (CAST_POSE: returned as [[prop, held for s after the cast]] for main.js to hold on raid.props). Under it
  // all, the old ring, quieter, so "he's casting" reads the same for every move. The cast's timing is untouched.
  function castStart(bossKind, anim, dur, bossDraw, name) {
    if (bossKind === 'grubnak' && anim === 'gorge') gorgeVortex(bossDraw, dur);
    if (bossKind === 'skitterra' && anim === 'chrysalis') chrysalis(bossDraw, dur);
    const key = castKey(bossKind, anim, name), sh = SH(bossDraw);
    if (anim === 'enrage') enrageStart(bossKind, bossDraw, dur);
    else { const fx = CAST_FX[bossKind] && CAST_FX[bossKind][(CAST_USE[bossKind] && CAST_USE[bossKind][key]) || key]; if (fx) fx(sh, bossDraw, dur); }
    const pal = CAST_COLOR[bossKind] || {}, color = anim === 'enrage' ? (ENR[bossKind] || '#ff3a2a') : pal[anim] || pal.def || '#ffffff';
    own(sh, VFX.fx({ dur, layer: 'ground', tick: (p) => {
      if (Math.random() < 0.12 + p * 0.3) VFX.charge(bossDraw.x, bossDraw.y - 30, { color, n: 1, r: 120 - p * 40, dur: 0.5, z: 30 });
    }, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15) * 0.7;
      VFX.neonRing(c, bossDraw.x, bossDraw.y, 150 - 70 * easeOut(p), color, 2 + p * 3, k * (0.25 + 0.6 * p), 0.6);
      VFX.glowAt(c, bossDraw.x, bossDraw.y - 30, 60 + 60 * p, color, k * (0.12 + 0.3 * p) * (0.85 + 0.15 * Math.sin(t * (6 + p * 12))));
    } }));
    return (CAST_POSE[bossKind] && CAST_POSE[bossKind][key]) || null;
  }
  function auto(boss, target) {
    if (!target) return;
    const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
    VFX.hit(target.x, target.y, '#ffe0c0', 1.1);
    VFX.slash(target.x, target.y, ang, { r: 44, span: 1.6, color: '#ffffff', dur: 0.25, sparks: 4 });
  }
  function leap(x, y) {
    shockAt(x, y, { r: 180, color: '#f0e0c8', w: 8, dur: 0.6, flat: 1 });
    for (const q of ringPts(x, y, 60, 10)) VFX.smoke(q.x, q.y, { n: 1, color: '#e0d4c0', size: 34, a: 0.6, speed: 120 });
    AFT.decal(x, y, { style: 'crack', r: 80, dur: 3, a: 0.55, seed: Math.random() * 6 });
    shake(8);
  }
  function roar(x, y, bossKind) {
    const color = bossKind === 'skitterra' ? '#d08aff' : bossKind === 'volkar' ? '#7fe8ff' : '#ffb050';
    for (let i = 0; i < 3; i++) shockAt(x, y, { r: 260, color, w: 6, dur: 0.6, flat: 1, delay: i * 0.12 });
    shake(5);
  }
  function addSpawn(x, y, kind) {
    if (kind === 'skeleton') return coffinBurst(x + Math.sign(x) * 40, y);
    VFX.swirl(x, y, { r: 60, color: '#c8ff6a', dur: 0.7, arms: 3 });
    VFX.burst(x, y, { color: '#e8ff9a', color2: '#ffffff', n: 14, speed: 200 });
    VFX.smoke(x, y, { color: '#d8e8b0', n: 6, size: 26, a: 0.6, speed: 70 });
  }
  function addDeath(x, y) {
    VFX.charge(x, y - 10, { color: '#c070ff', n: 10, r: 60, dur: 0.3 });
    after(0.28, () => {
      VFX.burst(x, y, { color: '#c070ff', color2: '#ffffff', n: 18, speed: 260, size: 15 });
      VFX.splash(x, y, { color: '#5a8a2a', n: 8 });
      VFX.smoke(x, y, { color: '#6a5a7a', n: 5, size: 28, a: 0.55, speed: 60 });
    });
  }
  function addEnrage(a) {
    VFX.flare(a.x, a.y, { color: '#ff3a2a', n: 18 });
    bang(a.x, a.y - 6, 54, { n: 11, color: '#ff3a5a', core: '#ffd0d8', ink: '#2a0810', dur: 0.4 });
    shockAt(a.x, a.y, { r: 90, color: '#ff4a6a', w: 5, dur: 0.4, flat: 1 });
    VFX.aura(a, { style: 'flame', color: '#ff4a2a', r: 32, dur: 4, rate: 0.7 });
    shake(6);
  }
  function fury(x, y) { shockAt(x, y, { r: 700, color: '#ff5a3a', w: 10, dur: 0.7, flat: 1 }); roomTint('#ff3a2a', 0.16, 0.5); shake(5); }
  function spit(from, to) {
    VFX.missile(from.x, from.y, to.x, to.y, { color: '#9adf3a', style: 'orb', speed: 650, size: 0.8, arc: 30, onHit: (x, y) => VFX.splash(x, y, { color: '#8ad82a', n: 6 }) });
  }
  function husk(x, y) {
    VFX.smoke(x, y, { color: '#d8ccb8', n: 10, size: 36, a: 0.6, speed: 90 });
    for (let i = 0; i < 10; i++) VFX.spawn({ x, y, z: 30, vx: rand(-160, 160), vy: rand(-120, 120), vz: rand(60, 200), g: 500, life: 0.7, size: 11, color: '#e8dcc8', kind: 'shard', add: false, vr: rand(-10, 10) });
  }
  function tetherSnap(e, ok) {
    if (ok) { VFX.burst(e.x, e.y, { color: '#f4f0ff', n: 4, speed: 120, size: 7 }); return; }   // ([boss presentation] the snap itself is arena-view.js's now)
    VFX.hit(e.x, e.y, '#ff5a4a', 1.4);
    shockAt(e.x, e.y, { r: 80, color: '#ff5a4a', flat: 1 });
  }
  function playerDeath(e) {
    VFX.smoke(e.x, e.y, { color: '#8a8a9a', n: 8, size: 26, a: 0.6, speed: 50 });
    shockAt(e.x, e.y, { r0: 60, r: 0, color: '#b0b0c0', w: 3, dur: 0.6, flat: 0.6 });
  }
  function playerRaised(e) {
    VFX.sigil(e.x, e.y, { r: 60, style: 'star5', color: '#fff2b0', dur: 1.6 });
    VFX.pillar(e.x, e.y, { r: 34, h: 260, color: '#fff6c8', dur: 1.4 });
    VFX.motes(e.x, e.y, { color: '#fff2b0', n: 14, r: 30 });
  }
  function partyBuff(e) {
    shockAt(e.x, e.y, { r: 130, color: '#ffe9a0', w: 5, dur: 0.6 });
    VFX.motes(e.x, e.y, { color: '#ffe9a0', n: 10, r: 40 });
  }
  // Rolling Meatballs: the thud when one lands against the wall, and the splat when it runs someone over
  function meatballLand(x, y) {
    bang(x, y, 46, { color: '#c0401a', core: '#ffd8a0', ink: '#2a0c04', n: 10, dur: 0.32 });
    VFX.smoke(x, y, { color: '#d8c4a4', n: 5, size: 26, a: 0.55, speed: 60 });
    VFX.splash(x, y, { color: '#b02a14', n: 8 });
    AFT.smear(x, y, x, y, { w: 46, splat: true, dur: 6, color: '#8a321a', hi: '#d0704a' });
    shake(3);
  }
  // ...and when it reaches the far wall: it bursts against the bricks, and its gravy trail runs all the way back
  function meatballWall(x, y, a, sx, sy) {
    bang(x, y, 86, { color: '#c0401a', core: '#ffd8a0', ink: '#2a0c04', n: 14, dur: 0.45 });
    VFX.splash(x, y, { color: '#a8281a', n: 22, speed: 1.6, size: 1.3 });
    VFX.debris(x, y, { color: '#6a3a1a', n: 8, speed: 1.2 });
    VFX.smoke(x, y, { color: '#d8c4a4', n: 6, size: 30, a: 0.5, speed: 80 });
    AFT.smear(sx, sy, x - Math.cos(a) * 20, y - Math.sin(a) * 20, { w: 36, splat: true, dur: 10, color: '#8a321a', hi: '#d0704a' });
    shake(5);
  }
  function meatballHit(e) {
    VFX.splash(e.x, e.y, { color: '#a02a14', n: 10, speed: 1.2 });
    VFX.hit(e.x, e.y, '#ffb070', 1.3);
    VFX.smoke(e.x, e.y, { color: '#d8c4a4', n: 4, size: 22, a: 0.5 });
    shake(5);
  }
  // Silk Reel: the thread snapping (white fibres flying), or the bite when she reels you all the way in
  function silkSnap(e, boss) {
    const mx = (e.x + boss.x) / 2, my = (e.y + boss.y) / 2;
    VFX.burst(e.x, e.y, { color: '#f4f0ff', n: 12, speed: 200, size: 10 });
    for (let i = 0; i < 6; i++) VFX.spawn({ x: mx + rand(-40, 40), y: my + rand(-40, 40), z: 20, vx: rand(-120, 120), vy: rand(-90, 90), vz: rand(40, 140), g: 300,
      life: 0.6, size: 12, color: '#ffffff', stretch: 4, vr: rand(-8, 8) });
    shockAt(e.x, e.y, { r: 50, color: '#ffffff', w: 3, dur: 0.3 });
  }
  // a crackle of lightning left jumping between points on the floor for a few seconds, fading
  function crackle(pts, color, dur) {
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      if (Math.floor(t * 14) % 3 === 0) return;
      c.save(); c.globalAlpha = e.a * (1 - p) * 0.9;
      for (let i = 1; i < pts.length; i++) jagged(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], Math.floor(t * 14) * 3 + i, color, 1.5);
      c.restore();
    } });
  }
  // Gale Slam's aftermath: the floor swept clean in long streaks running out from him
  function sweptFloor(x, y, dur) {
    const st = Array.from({ length: 46 }, () => ({ a: rand(0, TAU), d: rand(120, AR() * 0.95), l: rand(30, 80) }));
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p * dur / 0.2) * (1 - p);
      c.save(); clipArena(c); c.lineCap = 'round'; c.strokeStyle = `rgba(220,232,248,${0.3 * k})`; c.lineWidth = 2; c.beginPath();
      for (const q of st) { c.moveTo(x + Math.cos(q.a) * q.d, y + Math.sin(q.a) * q.d); c.lineTo(x + Math.cos(q.a) * (q.d + q.l), y + Math.sin(q.a) * (q.d + q.l)); }
      c.stroke(); c.restore();
    } });
  }
  // Acid Deluge: one drop driving down at a slant and bursting where it lands
  function acidDrop(x, y, splash) {
    VFX.fx({ dur: 0.12, layer: 'air', draw: (c, p, t, e) => {
      const f = (1 - p) * 90; c.save(); c.globalAlpha = e.a; c.lineCap = 'round';
      c.strokeStyle = '#c8ff7a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + f * 0.45 + 14, y - f - 30); c.lineTo(x + f * 0.45, y - f); c.stroke();
      c.restore();
    }, done: () => {
      bang(x, y, rand(22, 36), { n: 9, color: '#8adf2a', core: '#f4ffc8', ink: '#123008', dur: 0.32, layer: 'ground' });
      if (splash) VFX.splash(x, y, { color: '#8ad82a', n: 4 });
    } });
  }
  // the floor the acid fell on, pitted and smoking for a while: little dark pocks rimmed in green, bubbling
  function acidPits(pts, dur) {
    dur = tierDur(dur);   // [boss presentation] (aftermath tiers)
    const pits = pts.map(q => ({ x: q.x + rand(-20, 20), y: q.y + rand(-14, 14), r: rand(7, 15), ph: rand(0, 6), n: 1 + Math.floor(rand(0, 3)) }));
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * dur, k = e.a * Math.min(1, life / 0.3) * Math.min(1, (dur - life) / 1.5);
      // ([boss presentation] perf: every pit in three batched paths, the rims bubbling in two alternating sets)
      c.save(); clipArena(c);
      const each = (fn) => { for (const q of pits) for (let j = 0; j < q.n; j++) fn(q.x + j * q.r * 1.3, q.y + (j % 2) * q.r * 0.5, q.r * (1 - j * 0.25), q, j); };
      c.beginPath(); each((x, y, r) => { c.moveTo(x + r, y); c.ellipse(x, y, r, r * 0.65, 0, 0, TAU); });
      c.globalAlpha = k * 0.85; c.fillStyle = '#10200a'; c.fill();
      c.strokeStyle = '#9adf3a'; c.lineWidth = 2;
      for (const half of [0, 1]) { c.beginPath(); each((x, y, r, q, j) => { if ((j + (q.ph > 3 ? 1 : 0)) % 2 === half) { c.moveTo(x + r, y); c.ellipse(x, y, r, r * 0.65, 0, 0, TAU); } }); c.globalAlpha = k * (0.55 + 0.25 * Math.sin(t * 3 + half * 2.5)); c.stroke(); }
      c.beginPath(); each((x, y, r) => { c.moveTo(x + r * 0.55, y + r * 0.1); c.ellipse(x, y + r * 0.1, r * 0.55, r * 0.3, 0, 0, TAU); });
      c.globalAlpha = k * 0.6; c.fillStyle = '#5aae22'; c.fill();
      c.restore(); c.globalAlpha = 1;
    }, tick: (p) => {
      if (Math.random() < 0.35 * (1 - p)) { const q = pits[Math.floor(Math.random() * pits.length)]; if (q) VFX.spawn({ x: q.x, y: q.y, z: 4, vx: rand(-6, 6), vz: rand(18, 36), drag: 0.02, life: rand(1.2, 1.8), size: rand(8, 12), size1: 26, color: '#8ac85a', kind: 'smoke', add: false, a: 0.3, fadeIn: 0.2 }); }
    } });
  }
  // The Brood: a clutch splitting open: green goo, a burst, shell flying, and broken shell left lying in the web
  function hatch(x, y) {
    bang(x, y - 6, 62, { n: 12, color: '#9adf3a', core: '#f4ffc8', ink: '#14300a' });
    VFX.splash(x, y, { color: '#8ad82a', n: 14 });
    for (let i = 0; i < 12; i++) { const a = rand(0, TAU), sp = rand(80, 220); VFX.spawn({ x, y, z: 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(80, 220), g: 600, life: 0.6, size: 9, color: '#efeadb', kind: 'shard', add: false, vr: rand(-10, 10) }); }
    const bits = Array.from({ length: 11 }, () => { const a = rand(0, TAU), d = rand(14, 60); return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, s: rand(5, 10), r: rand(0, TAU), goo: Math.random() < 0.35 }; });
    VFX.fx({ dur: 8, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * 8, k = e.a * Math.min(1, life / 0.2) * Math.min(1, (8 - life) / 1.5);
      c.save(); c.globalAlpha = k;
      for (const b of bits) {
        if (b.goo) { c.fillStyle = 'rgba(120,200,50,0.75)'; c.beginPath(); c.ellipse(b.x, b.y, b.s * 0.9, b.s * 0.5, 0, 0, TAU); c.fill(); continue; }
        c.save(); c.translate(b.x, b.y); c.rotate(b.r);
        c.beginPath(); c.arc(0, 0, b.s, 0.25, Math.PI - 0.25); c.closePath();
        c.fillStyle = '#ece6d6'; c.fill(); c.strokeStyle = '#1a1622'; c.lineWidth = 1.3; c.stroke();
        c.restore();
      }
      c.restore();
    } });
    shake(4);
  }
  // Spin: a thread shot pillar to pillar, a puff of silk where it catches
  function threadShoot(fl) {
    const { x1, y1, x2, y2 } = fl;
    VFX.fx({ dur: 0.3, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.7)), k = e.a * (1 - Math.max(0, p - 0.7) / 0.3);
      c.save(); c.lineCap = 'round';
      VFX.neonPath(c, '#f4f0ff', 6, k, () => { c.moveTo(x1, y1 - 8); c.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q - 8); });
      c.restore();
    }, done: () => { for (const [x, y] of [[x1, y1], [x2, y2]]) VFX.burst(x, y - 8, { color: '#f4f0ff', n: 8, speed: 130, size: 7 }); } });
  }
  // a thread's knot broken (or its pillar gone): it snaps at the knot, the long end whips away curling, a fibre
  // burst where it broke, and the slack thread left lying on the floor for a while
  function threadSnap(fl) {
    const { x1, y1, x2, y2 } = fl, L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    const kx = x1 + ux * 40, ky = y1 + uy * 40, side = Math.random() < 0.5 ? -1 : 1;
    bang(kx, ky - 6, 40, { n: 10, color: '#e8e4f4', core: '#ffffff', ink: '#2a2438', dur: 0.3 });
    for (let i = 0; i < 10; i++) { const a = rand(0, TAU), sp = rand(120, 260); VFX.spawn({ x: kx, y: ky, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(40, 140), g: 300, life: 0.55, size: 11, color: '#ffffff', stretch: 4, rot: a, vr: rand(-8, 8) }); }
    // the slack end: from the far pillar back toward the break, curling into an S and settling
    const curl = (c, reach, amp, ph) => {
      c.beginPath(); c.moveTo(x2, y2);
      for (let i = 1; i <= 24; i++) { const q = i / 24, d = L * reach * q, w = Math.sin(q * Math.PI * 2.2 + ph) * amp * q; c.lineTo(x2 - ux * d + nx * w * side, y2 - uy * d + ny * w * side); }
    };
    VFX.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(p);
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = e.a;
      curl(c, 0.96 - 0.44 * q, 40 * q, p * 3); c.strokeStyle = 'rgba(250,248,255,0.9)'; c.lineWidth = 3; c.stroke();
      c.restore(); c.globalAlpha = 1;
    } });
    VFX.fx({ dur: 7, delay: 0.55, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * 7, k = e.a * Math.min(1, life / 0.15) * Math.min(1, (7 - life) / 1.5);
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = k;
      curl(c, 0.52, 40, 1.8); c.strokeStyle = 'rgba(20,14,30,0.45)'; c.lineWidth = 6; c.stroke(); c.strokeStyle = 'rgba(236,232,250,0.8)'; c.lineWidth = 2.5; c.stroke();
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // The Collapse: the ring gives way: slabs of floor sink into the dark and vanish, dust bursts off the new edge, the
  // break line flashes pink
  function floorFalls(fl) {
    const onSilk = (x, y) => (fl.paths || []).some(([a, b, c2, d, w]) => PROPS.segDist(x, y, a, b, c2, d) < w / 2 + 12);
    const slabs = [];
    for (let i = 0; i < 90 && slabs.length < 46; i++) {
      const a = rand(0, TAU), d = fl.r2 + 20 + rand(0, Math.min(260, fl.r - fl.r2 - 20)), x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (ARENA.sd(x, y) > -14 || onSilk(x, y)) continue;
      const s = rand(16, 30), pts = Array.from({ length: 6 }, (_, j) => { const q = j * TAU / 6 + rand(-0.3, 0.3), m = s * rand(0.7, 1.1); return [Math.cos(q) * m, Math.sin(q) * m * 0.75]; });
      slabs.push({ x, y, pts, at: rand(0, 0.35), sp: rand(0.9, 1.3), r: rand(-1, 1) });
    }
    VFX.fx({ dur: 1.6, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * 1.6;
      c.save(); clipArena(c);
      for (const sl of slabs) {
        const q = Math.max(0, Math.min(1, (life - sl.at) / (0.9 * sl.sp))); if (q >= 1) continue;
        const sc = 1 - 0.75 * q, drop = q * q * 60;
        c.save(); c.translate(sl.x, sl.y + drop); c.rotate(sl.r * q); c.scale(sc, sc);
        c.globalAlpha = e.a * (1 - q * q);
        c.beginPath(); sl.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
        c.fillStyle = q < 0.3 ? '#4a4258' : '#2a2434'; c.fill(); c.strokeStyle = '#120c18'; c.lineWidth = 2.5; c.stroke();
        c.restore();
      }
      c.globalAlpha = e.a * Math.max(0, 1 - p * 1.6); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = '#ff4ab0'; c.lineWidth = 10 * (1 - p) + 2; c.beginPath(); c.arc(0, 0, fl.r2, 0, TAU); c.stroke();
      c.restore(); c.globalAlpha = 1;
    } });
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + rand(-0.1, 0.1), x = Math.cos(a) * (fl.r2 + 10), y = Math.sin(a) * (fl.r2 + 10);
      if (onSilk(x, y)) continue;
      after(rand(0, 0.25), () => { VFX.smoke(x, y, { color: '#6a6078', n: 2, size: 36, a: 0.5, speed: 70 }); VFX.debris(x, y, { color: '#4a4156', n: 2, speed: 0.8 }); });
    }
    roomTint('#05030a', 0.3, 0.8);
    shake(14);
  }
  // a cocoon letting go: shreds of silk flying off
  function silkFree(e) {
    VFX.burst(e.x, e.y - 20, { color: '#f4f0ff', n: 8, speed: 150, size: 8 });
    for (let i = 0; i < 6; i++) VFX.spawn({ x: e.x + rand(-14, 14), y: e.y + rand(-6, 6), z: rand(10, 40), vx: rand(-110, 110), vy: rand(-60, 60), vz: rand(40, 120), g: 300,
      life: 0.5, size: 10, color: '#ffffff', stretch: 4, vr: rand(-8, 8) });
  }
  // Silk Wrap landing: strands whipping in from all round and cinching on the tank
  function silkWhip(x, y) {
    const st = Array.from({ length: 9 }, (_, i) => ({ a: i * TAU / 9 + rand(-0.2, 0.2), r: rand(110, 150), bend: rand(-0.9, 0.9) }));
    VFX.fx({ dur: 0.35, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.6)), k = e.a * (1 - Math.max(0, p - 0.5) / 0.5);
      c.save(); c.lineCap = 'round';
      for (const s of st) {
        const r0 = s.r * (1 - q) + 18, r1 = r0 + 60 * (1 - q) + 20, a0 = s.a + s.bend * (1 - q), cy = y - 24;
        c.beginPath(); c.moveTo(x + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1 * 0.8);
        c.quadraticCurveTo(x + Math.cos(a0 + 0.5) * (r0 + r1) / 2, cy + Math.sin(a0 + 0.5) * (r0 + r1) / 2 * 0.8, x + Math.cos(a0) * r0, cy + Math.sin(a0) * r0 * 0.8);
        c.globalAlpha = k * 0.35; c.strokeStyle = '#f4f0ff'; c.lineWidth = 6; c.stroke();
        c.globalAlpha = k; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
      }
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // a web stuck to the floor where the wrap landed: crooked spokes and sagging rings, fading out
  function webDecal(x, y, r, dur) {
    dur = tierDur(dur);   // [boss presentation] (aftermath tiers)
    const n = 11, spokes = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.15, 0.15), l: r * rand(0.75, 1.1) }));
    const P = (s, f) => [x + Math.cos(s.a) * s.l * f, y + Math.sin(s.a) * s.l * f * 0.75];
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * dur, k = e.a * Math.min(1, life / 0.2) * Math.min(1, (dur - life) / 1.5);
      c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(240,238,255,${0.5 * k})`; c.lineWidth = 1.5;
      c.beginPath();
      for (const s of spokes) { c.moveTo(x, y); c.lineTo(...P(s, 1)); }
      for (const f of [0.3, 0.55, 0.8]) for (let i = 0; i < n; i++) {
        const a = spokes[i], b = spokes[(i + 1) % n], [ax, ay] = P(a, f), [bx, by] = P(b, f);
        c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2 * 0.92 + x * 0.08, (ay + by) / 2 * 0.92 + y * 0.08, bx, by);
      }
      c.stroke();
      c.restore();
    } });
  }
  // Venom Mist breaking: clouds rolling in from the walls to fill the cave, then a thin haze with motes drifting up
  function venomFog() {
    const R = AR(), puffs = [];
    for (let i = 0; i < 48; i++) { const a = rand(0, TAU), wall = ARENA.edge(a); puffs.push({ a, wall, d: Math.sqrt(rand(0.02, 1)) * (wall - 40), r: rand(60, 100) }); }
    puffs.sort((p, q) => Math.sin(p.a) * p.d - Math.sin(q.a) * q.d);
    VFX.fx({ dur: 1.8, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.55), q = easeOut(Math.min(1, p / 0.4));
      c.save(); clipArena(c);
      for (const f of puffs) {
        const d = f.wall + (f.d - f.wall) * q, x = Math.cos(f.a) * d, y = Math.sin(f.a) * d, r = f.r * (0.8 + 0.35 * q + 0.2 * p);
        // a soft puff: lit pale green on top, deep green underneath, thinning out to nothing at its edge
        const g = c.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.05, x, y, r * 1.1);
        g.addColorStop(0, 'rgba(196,255,120,0.55)'); g.addColorStop(0.45, 'rgba(98,184,40,0.45)'); g.addColorStop(0.8, 'rgba(36,90,16,0.28)'); g.addColorStop(1, 'rgba(36,90,16,0)');
        c.globalAlpha = k; c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * 1.1, r * 0.78, 0, 0, TAU); c.fill();
      }
      c.restore(); c.globalAlpha = 1;
    } });
    VFX.fx({ dur: 5, delay: 0.9, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.1) * (1 - p);
      c.save(); clipArena(c); c.globalAlpha = 0.14 * k; c.fillStyle = '#6ac82a'; c.fillRect(-R - 10, -R - 10, R * 2 + 20, R * 2 + 20); c.restore(); c.globalAlpha = 1;
    }, tick: (p) => {
      if (Math.random() < 0.8 * (1 - p)) { const q = scatter({ kind: 'circle', x: 0, y: 0, r: R - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(0, 30), vz: rand(10, 30), vx: rand(-8, 8), life: rand(1.2, 2), size: rand(3, 5), size1: 0, color: '#c8ff7a' }); }
    } });
  }
  function reelBite(e) {
    VFX.hit(e.x, e.y, '#9adf3a', 1.8);
    VFX.splash(e.x, e.y, { color: '#8ad82a', n: 12 });
    shake(7);
  }
  // Volkar: a charge turning over (Hard, at 50%), the wall jumping in, and the storm's constant pulse
  function polarityFlip(e, s) {
    const col = s > 0 ? '#ffc24a' : '#4ad8ff';
    shockAt(e.x, e.y, { r0: 80, r: 10, color: col, w: 5, dur: 0.5, flat: 1 });
    VFX.motes(e.x, e.y, { color: col, n: 12, r: 36 });
  }
  function edgeClose(from, to) {
    VFX.shock(0, 0, { r0: from, r: to, color: '#9ff4ff', w: 16, dur: 0.45, flat: 1 });   // (the edge closing in from outside the new room: not clipped to it)
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + rand(-0.1, 0.1); after(rand(0, 0.3), () => VFX.lightning(Math.cos(a) * (to + 60), Math.sin(a) * (to + 60) - 260, Math.cos(a) * to, Math.sin(a) * to, { color: '#9ff4ff', jag: 20, dur: 0.35 })); }
    roomTint('#9ccfff', 0.14, 0.5);
    shake(9);
  }
  function pulse(units) {
    for (const u of units) VFX.lightning(u.x + rand(-30, 30), u.y - 150, u.x, u.y - 20, { color: '#9ccfff', jag: 8, dur: 0.2 });
  }
  // Hard: Ball Lightning gathering at the edge and bursting on whoever touches it; Chain Lightning leaping player to player
  function orbForm(x, y) {
    VFX.charge(x, y - 28, { color: '#9ff4ff', n: 10, r: 60, dur: 0.6 });
    VFX.lightning(x + rand(-40, 40), y - 300, x, y - 28, { color: '#bff6ff', jag: 18, dur: 0.3 });
  }
  function orbHit(e) {
    VFX.burst(e.x, e.y - 16, { color: '#9ff4ff', color2: '#ffffff', n: 16, speed: 260 });
    for (let i = 0; i < 4; i++) { const a = rand(0, TAU); VFX.lightning(e.x, e.y - 16, e.x + Math.cos(a) * 70, e.y - 16 + Math.sin(a) * 70, { color: '#dffbff', jag: 10, dur: 0.3 }); }
    VFX.hit(e.x, e.y, '#bff6ff', 1.4);
    shake(5);
  }
  function chain(ents) {
    if (!ents.length) return;
    const a = ents[0];
    VFX.lightning(a.x + rand(-30, 30), a.y - 380, a.x, a.y - 16, { color: '#ffffff', jag: 26, dur: 0.45 });
    ents.forEach((e, i) => {
      after(i * 0.08, () => {
        if (i) for (let n = 0; n < 2; n++) VFX.lightning(ents[i - 1].x, ents[i - 1].y - 16, e.x, e.y - 16, { color: n ? '#ffffff' : '#9ff4ff', jag: 16, dur: 0.4 });
        VFX.hit(e.x, e.y, '#bff6ff', 1.3);
        shockAt(e.x, e.y, { r: 60, color: '#9ff4ff', w: 4, dur: 0.35, flat: 1 });
        AFT.scorch(e.x, e.y, e.x, e.y, { w: 50, dur: 5, ember: '#7fe8ff', smokeRate: 0.08 });
      });
    });
    shake(ents.length > 1 ? 7 : 4);
  }

  // the Hollow King: caught by his gaze (grey stone creeps over them), the sentence passed, a cure, a knight
  // remembering a swing, the knights rising, the night falling
  function gazed(e, b) {
    // a beam of his gaze from the eye over him down onto them, and grey stone creeping over them
    if (b) {
      const x0 = b.x, y0 = b.y - 175;
      VFX.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, ef) => { const k = ef.a * (1 - p); VFX.neonPath(c, '#9affc0', 16 * (1 - p * 0.5), k, () => { c.moveTo(x0, y0); c.lineTo(e.x, e.y - 24); }); } });
    }
    VFX.debris(e.x, e.y, { color: '#8a9490', n: 6, speed: 0.6 });
    shockAt(e.x, e.y, { r0: 70, r: 14, color: '#d8e0dc', w: 6, dur: 0.45, flat: 1 });
    VFX.smoke(e.x, e.y, { color: '#a8b0ac', n: 6, size: 22, a: 0.55, speed: 30 });
    VFX.aura(e, { style: 'ring', color: '#c8d0cc', r: 30, dur: 2, rate: 0.5 });
    shake(4);
  }
  function doomed(e) {
    VFX.sigil(e.x, e.y, { r: 50, style: 'star5', color: '#b46aff', dur: 1.2 });
    VFX.charge(e.x, e.y - 60, { color: '#d8b0ff', n: 10, r: 50, dur: 0.5 });
  }
  function cure(e) {
    VFX.pillar(e.x, e.y, { r: 30, h: 220, color: '#ffe2a0', dur: 0.8 });
    shockAt(e.x, e.y, { r: 90, color: '#ffe2a0', w: 5, dur: 0.5, flat: 1 });
    for (let i = 0; i < 10; i++) VFX.spawn({ x: e.x + rand(-20, 20), y: e.y - 60, z: 0, vx: rand(-90, 90), vy: rand(-40, 40), vz: rand(60, 160), g: 200, life: 0.9, size: 8, color: '#c890ff', kind: 'shard', add: false, vr: rand(-8, 8) });
    VFX.burst(e.x, e.y - 60, { color: '#d8b0ff', color2: '#ffffff', n: 14, speed: 200, size: 10 });
    VFX.motes(e.x, e.y, { color: '#fff0c0', n: 12, r: 30 });
  }
  function knightMemory(k) {
    shockAt(k.x, k.y, { r0: 20, r: 90, color: '#9fd0ff', w: 4, dur: 0.5, flat: 1 });
    VFX.flash(k.x, k.y - 30, 50, '#cfe8ff', 0.3);
    VFX.motes(k.x, k.y, { color: '#9fd0ff', n: 10, r: 36 });
  }
  function knightRise(k) {
    VFX.swirl(k.x, k.y, { r: 60, color: '#6dff9a', dur: 0.8, arms: 3 });
    VFX.pillar(k.x, k.y, { r: 30, h: 200, color: '#6dff9a', dur: 0.9 });
    VFX.smoke(k.x, k.y, { color: '#9ab8a8', n: 6, size: 30, a: 0.5, speed: 50 });
  }
  function nightFall() { roomTint('#05060c', 0.6, 1.2); shake(6); }

  // ---------------------------------------------------------------- the room's props
  // propFx: a prop chipped, a prop broken (debris by what it's made of), someone (or the boss) slammed into a wall or
  // prop, grease catching fire
  const PROP_STUFF = {
    cask: { color: '#8a5a2e', dust: '#c8a878', size: 1.1 }, pillar: { color: '#4a4156', dust: '#8a8098', size: 1.3 },
    lid: { color: '#565d61', dust: '#a8b0ac', size: 1.2 }, stone: { color: '#5a6270', dust: '#b8c4d4', size: 1.3 },
    boulder: { color: '#6a6460', dust: '#c8c0b0', size: 1.4 }, brazier: { color: '#2f3337', dust: '#7a8a80', size: 0.9 },
  };
  // The Hydra's head moments (hydra.js: propfx k 'hcast' a head winding up, 'stump' a head cut, 'sear' the stump burned,
  // 'regrow' it left to sprout, 'rise' the Mother's heads coming up, 'echo' a cut head's memory striking in the Heart)
  const HY_COL = { acid: '#b8f04a', tide: '#7ffff0', venom: '#e0a0ff', flame: '#ffb060', frost: '#e8f8ff', storm: '#fff6a0', gaze: '#ffffff', mire: '#d8b868' };
  function hydraFx(msg) {
    const col = HY_COL[msg.el] || '#ffffff';
    if (msg.k === 'hcast') {
      const dur = msg.dur || 3, big = msg.s ? 1 : 0.65;
      VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.06) * big;
        c.save(); c.globalAlpha = k;
        VFX.glowAt(c, msg.x, msg.y - 20, 12 + p * 30, col, 0.25 + 0.5 * p);
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 3, d = (1 - p) * 46 + 8; VFX.glowAt(c, msg.x + Math.cos(a) * d, msg.y - 20 + Math.sin(a) * d * 0.7, 6, col, 0.5 * p); }
        c.restore(); c.globalAlpha = 1;
      } });
    } else if (msg.k === 'stump') {
      shockAt(msg.x, msg.y, { r: 90, color: col, w: 6, dur: 0.5, flat: 1 });
      VFX.splash(msg.x, msg.y - 20, { color: '#8a2a1a', n: 14, speed: 1.4 });
      VFX.smoke(msg.x, msg.y - 10, { n: 4, color: '#2a3a2a', size: 30, a: 0.5, speed: 60 });
      AFT.decal(msg.x, msg.y, { style: 'crack', r: 40, dur: 10, a: 0.5, seed: msg.x * 0.01 });
      shake(7);
    } else if (msg.k === 'sear') {
      VFX.pillar(msg.x, msg.y, { r: 36, h: 150, color: '#ffb060', dur: 0.8 });
      VFX.pillar(msg.px, msg.py, { r: 30, h: 120, color: '#ffd27a', dur: 0.7 });
      shockAt(msg.x, msg.y, { r: 110, color: '#ffd27a', w: 7, dur: 0.5, flat: 1 });
      VFX.sparks(msg.x, msg.y - 20, { color: '#ffd27a', n: 14, speed: 300 });
      VFX.smoke(msg.x, msg.y - 20, { n: 5, color: '#4a3a30', size: 34, a: 0.55, speed: 80 });
      shake(5);
    } else if (msg.k === 'regrow') {
      shockAt(msg.x, msg.y, { r: 120, color: col, w: 7, dur: 0.6, flat: 1 });
      VFX.splash(msg.x, msg.y - 20, { color: '#4f9a4a', n: 18, speed: 1.5 });
      roomTint('#4f9a4a', 0.1, 0.5);
      shake(7);
    } else if (msg.k === 'rise') {
      shockAt(0, 0, { r: 160, color: '#a8f0e8', w: 10, dur: 0.7, flat: 1 });
      shockAt(0, 0, { r: 300, color: '#7ffff0', w: 6, dur: 0.9, flat: 1, delay: 0.1 });
      VFX.splash(0, 0, { color: '#4fd8cc', n: 24, speed: 1.6 });
      shake(8);
    } else if (msg.k === 'echo') {
      VFX.fx({ dur: 1.4, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * (1 - p);
        c.save(); c.globalAlpha = k;
        VFX.glowAt(c, msg.x, msg.y - 22, 46 * (0.6 + 0.6 * p), col, 0.7);
        c.restore(); c.globalAlpha = 1;
      } });
      shockAt(msg.x, msg.y, { r: 130, color: col, w: 6, dur: 0.6, flat: 1 });
    } else return false;
    return true;
  }
  function propFx(msg, room, entById, bossKind) {
    if (hydraFx(msg)) return;
    const st = PROP_STUFF[msg.kind] || { color: '#6a6a72', dust: '#b0b0b8', size: 1 };
    if (msg.k === 'chip') {
      VFX.debris(msg.x, msg.y - 20, { color: st.color, n: 5, speed: 0.8, size: st.size * 0.8 });
      VFX.smoke(msg.x, msg.y - 10, { color: st.dust, n: 3, size: 22, a: 0.5, speed: 50 });
      shake(2);
    } else if (msg.k === 'break') {
      const r = msg.r || 30;
      VFX.debris(msg.x, msg.y - 18, { color: st.color, n: 16, speed: 1.3, size: st.size * 1.2, up: 1.2 });
      VFX.smoke(msg.x, msg.y, { color: st.dust, n: 10, size: 34, a: 0.6, speed: 110, r: r * 0.6 });
      shockAt(msg.x, msg.y, { r: r * 2.4, color: st.dust, w: 6, dur: 0.45, flat: 1 });
      if (msg.kind === 'cask') VFX.splash(msg.x, msg.y, { color: '#6a1018', n: 14, speed: 1.3 });
      if (msg.kind === 'boulder' || msg.how === 'storm') VFX.sparks(msg.x, msg.y - 20, { color: '#dff4ff', n: 10, speed: 320 });
      shake(5);
    } else if (msg.k === 'slam') {
      // dust bursting off the wall (or the prop) where they hit, and a ring of grit
      const back = (msg.a || 0) + Math.PI, boss = msg.boss;
      VFX.smoke(msg.x, msg.y, { color: '#cfc4b0', n: boss ? 14 : 7, size: boss ? 44 : 30, a: 0.65, speed: boss ? 160 : 100 });
      VFX.debris(msg.x, msg.y - 10, { color: '#7a6a5a', n: boss ? 14 : 6, speed: boss ? 1.4 : 1 });
      shockAt(msg.x, msg.y, { r: boss ? 220 : 90, color: '#f0e0c8', w: boss ? 10 : 5, dur: 0.45, flat: 1 });
      VFX.sparks(msg.x, msg.y - 14, { color: '#fff0d0', n: boss ? 14 : 6, angle: back, spread: 1.4, speed: 300 });
      if (boss) AFT.decal(msg.x, msg.y, { style: 'crack', r: 90, dur: 4, a: 0.6, seed: Math.random() * 6 });
      const e = msg.pid != null && entById ? entById(msg.pid) : null;
      if (e) { VFX.hit(e.x, e.y, '#ffe0c0', 1.5); VFX.aura(e, { style: 'ring', color: '#f0e8d8', r: 26, dur: 0.6, rate: 0.6 }); }
      shake(boss ? 12 : 5);
    } else if (msg.k === 'flare') {
      // braziers flaring back up after Lights Out
      for (const id of msg.ids || []) {
        const pr = room && room.props.find(p => p.id === id);
        if (!pr) continue;
        VFX.flare(pr.x, pr.y - 24, { color: '#3aff7a', n: 18, r: 18, h: 1.6 });
        shockAt(pr.x, pr.y, { r: 160, color: '#7affa8', w: 5, dur: 0.5, flat: 1 });
      }
    } else if (msg.k === 'bolt') {
      // Rod Strike: the bolt comes down on a standing stone (its runes take it), or on someone caught in the open
      // (Supercell: a front's bolt taking a planted rod: kind 'post')
      const top = msg.kind === 'stone' ? 92 : msg.kind === 'post' ? 84 : 16, e = msg.pid != null && entById ? entById(msg.pid) : null;
      const x = e ? e.x : msg.x, y = e ? e.y : msg.y;
      VFX.lightning(x + rand(-30, 30), y - 460, x, y - top, { color: '#ffffff', jag: 28, dur: 0.4 });
      VFX.lightning(x + rand(-30, 30), y - 460, x, y - top, { color: '#9ff4ff', jag: 24, dur: 0.5 });
      shockAt(x, y, { r: msg.kind === 'stone' ? 110 : 80, color: '#9ff4ff', w: 6, dur: 0.4, flat: 1 });
      VFX.sparks(x, y - top, { color: '#dffbff', n: 12, speed: 300 });
      if (e) VFX.hit(e.x, e.y, '#bff6ff', 2);
      if (msg.kind !== 'stone' && msg.kind !== 'post') { AFT.scorch(x, y, x, y, { w: 70, dur: 6, ember: '#7fe8ff', smokeRate: 0.12 }); AFT.decal(x, y, { style: 'crack', r: 50, dur: 6, a: 0.6, seed: Math.random() * 6 }); }
      roomTint('#bfe8ff', 0.1, 0.25);
      shake(msg.kind === 'stone' ? 5 : 8);
    } else if (msg.k === 'discharge') {
      // a stone that was still charged lets it all go into everyone near it
      const r = msg.r || 180;
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + rand(-0.2, 0.2); VFX.lightning(msg.x, msg.y - 50, msg.x + Math.cos(a) * r, msg.y + Math.sin(a) * r * 0.9, { color: i % 2 ? '#ffffff' : '#ff9a7a', jag: 16, dur: 0.45 }); }
      shockAt(msg.x, msg.y, { r, color: '#ffb09a', w: 8, dur: 0.5, flat: 1 });
      VFX.burst(msg.x, msg.y - 40, { color: '#ffd0c0', color2: '#9ff4ff', n: 18, speed: 300 });
      roomTint('#ffd0c0', 0.16, 0.35);
      shake(9);
    } else if (msg.k === 'arc') {
      // Grounded (Hard): the discharge leaps on to the nearest player
      const e = msg.pid != null && entById ? entById(msg.pid) : null;
      if (e) { for (let n = 0; n < 2; n++) VFX.lightning(msg.x, msg.y - 60, e.x, e.y - 16, { color: n ? '#ffffff' : '#ff9a7a', jag: 18, dur: 0.45 }); VFX.hit(e.x, e.y, '#ffb09a', 1.8); AFT.scorch(e.x, e.y, e.x, e.y, { w: 56, dur: 5, ember: '#ffb09a', smokeRate: 0.1 }); }
      shake(5);
    } else if (msg.k === 'fall' && bossKind === 'skitterra') {
      // into the pit (the Collapse): dust where they went over, and a thread let down from the dark to haul them back
      const e = msg.pid != null && entById ? entById(msg.pid) : null, x = e ? e.x : msg.x, y = e ? e.y : msg.y;
      VFX.smoke(x, y, { color: '#5a5068', n: 10, size: 36, a: 0.6, speed: 120 });
      VFX.debris(x, y, { color: '#4a4156', n: 8, speed: 1.1 });
      if (e) VFX.fx({ dur: 2.2, layer: 'air', draw: (c, p, t, ef) => { const k = ef.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.2); c.save(); c.lineCap = 'round'; c.globalAlpha = k; c.strokeStyle = 'rgba(250,248,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x, e.y - 700); c.lineTo(e.x, e.y - 30); c.stroke(); c.restore(); c.globalAlpha = 1; } });
      shake(7);
    } else if (msg.k === 'fall') {
      // off the broken edge (Hard): a gust of grit where they went over, and the wind hauling them back up
      const e = msg.pid != null && entById ? entById(msg.pid) : null, x = e ? e.x : msg.x, y = e ? e.y : msg.y;
      VFX.smoke(x, y, { color: '#c8d0dc', n: 12, size: 36, a: 0.6, speed: 140 });
      VFX.debris(x, y, { color: '#5a6270', n: 10, speed: 1.2 });
      if (e) { VFX.tornado(e.x, e.y, { r: 30, h: 120, dur: 1.2 }); VFX.aura(e, { style: 'ring', color: '#e8f4ff', r: 30, dur: 5, rate: 0.5 }); }
      shake(7);
    } else if (msg.k === 'crumble') {
      // a wedge of the summit breaks away: rock and dust spill off the new lip
      for (let i = 0; i < 12; i++) {
        const a = msg.a0 + (msg.a1 - msg.a0) * (i + 0.5) / 12, x = Math.cos(a) * msg.r, y = Math.sin(a) * msg.r;
        after(i * 0.04, () => { VFX.debris(x, y, { color: '#5a6270', n: 6, speed: 1.3, up: 1.1 }); VFX.smoke(x, y, { color: '#b8c4d4', n: 3, size: 44, a: 0.55, speed: 90 }); });
      }
      roomTint('#1a2230', 0.25, 0.8);
      shake(14);
    } else if (msg.k === 'ignite') {
      const r = msg.r || 60;
      VFX.flameWall(msg.x - r * 0.6, msg.y, msg.x + r * 0.6, msg.y, { w: r * 0.9, h: 90, dur: 1.2, step: 32, size: 1.1 });
      VFX.smoke(msg.x, msg.y - 30, { color: '#3a2a20', n: 5, size: 32, a: 0.5, speed: 60 });
    }
    void room;
  }

  // the stove line erupting along the top wall: every burner throws up fire and sparks, smoke rolls off it
  function stoveBurst(hitX) {
    const y = -ARENA.hh - 30;
    for (let i = 0; i < 6; i++) {
      const x = -ARENA.hw + 130 + i * (ARENA.hw * 2 - 260) / 5;
      after(0.08 * Math.abs(x - hitX) / 160, () => {
        VFX.flare(x, y + 30, { color: '#ff6a1a', n: 22, r: 40, h: 1.8, size: 1.5 });
        VFX.sparks(x, y + 20, { color: '#ffd080', n: 10, angle: Math.PI / 2, spread: 1.2, speed: 420 });
        VFX.smoke(x, y + 10, { color: '#3a2a20', n: 4, size: 40, a: 0.5, speed: 70 });
      });
    }
    roomTint('#ff6a1a', 0.12, 0.6);
    shake(8);
  }

  // a grease puddle that has burnt off leaves a charred blot, still smoking
  function scorchPool(x, y, r) { AFT.scorch(x, y, x, y, { w: r * 2, dur: 8 }); }

  // [boss presentation] the confetti waits for his fall (bossDeath, about 2.2 s); the wipe has its own scene (wipeShow)
  function victory(ents, delay = 2.2) {
    after(delay, () => {
      for (const e of ents) { VFX.confetti(e.x, e.y, { n: 50 }); VFX.burst(e.x, e.y, { color: '#ffe27a', color2: '#ffffff', n: 16, speed: 260 }); }
      roomTint('#fff2b0', 0.2, 1);
    });
  }
  function wipe(bd, kind) { roomTint('#200810', 0.4, 1.4); wipeShow(bd, kind); }

  // [boss presentation] the Flare-Up catching: a wall of heat rolls down off the stove line across the kitchen
  function flareHeat() {
    const top = -ARENA.hh - 20, H = ARENA.hh * 2 + 40, W = ARENA.hw + 20;
    VFX.fx({ dur: 0.8, layer: 'ground', draw: (c, p, t, e) => {
      const y = top + H * easeOut(p), k = e.a * (1 - Math.max(0, p - 0.6) / 0.4);
      c.save(); clipArena(c);
      const g = c.createLinearGradient(0, y - 180, 0, y + 20);
      g.addColorStop(0, 'rgba(255,110,30,0)'); g.addColorStop(0.7, `rgba(255,140,50,${0.4 * k})`); g.addColorStop(1, `rgba(255,230,160,${0.6 * k})`);
      c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(-W, y - 180, W * 2, 200);
      c.restore();
    } });
    for (let i = 0; i < 10; i++) { const x = -ARENA.hw + (i + 0.5) / 10 * ARENA.hw * 2; VFX.sparks(x, top + 40, { color: '#ffd080', n: 5, angle: Math.PI / 2, spread: 0.9, speed: 380 }); }
    roomTint('#ff6a1a', 0.2, 0.7);
    shake(8);
  }
  // [boss presentation] Last Orders: he bellows the kitchen closed: gold rings out of him and a gust of steam off every wall
  function lastOrdersHit(b) {
    const x = b ? b.x : 0, y = b ? b.y : 0;
    for (let i = 0; i < 3; i++) shockAt(x, y, { r: AR() * 1.2, color: i % 2 ? '#ffe08a' : '#ff9a3a', w: 9 - i * 2, dur: 0.8, flat: 1, delay: i * 0.12 });
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16, d = (ARENA.edge ? ARENA.edge(a) : AR()) - 30; after(0.25 + rand(0, 0.2), () => VFX.smoke(Math.cos(a) * d, Math.sin(a) * d, { color: '#f6f2ee', n: 2, size: 40, a: 0.45, speed: 90 })); }
    roomTint('#ffb050', 0.2, 0.6);
    shake(8);
  }

  // a stack or soak that wasn't answered (the host flags it): it must never look like a success. The shape burns red,
  // the room flushes red, and the screen jolts. A missed Barrow Bell tolls purple through the whole barrow.
  function failed(tg) {
    const s = tg.live, bell = tg.tag === 'bell';
    const col = bell ? '#b04aff' : '#ff3a2a';
    shapeFlash(s, col, { a: 0.4, dur: 0.7 });
    shockAt(s.x, s.y, { r: (s.r || 120) * 1.6, color: col, w: 9, dur: 0.6, flat: 1 });
    VFX.sparks(s.x, s.y - 10, { color: bell ? '#e0b0ff' : '#ff8a6a', n: 14, speed: 340 });
    if (bell) { VFX.pillar(s.x, s.y, { r: 50, h: 360, color: '#c88aff', dur: 0.9 }); for (let i = 0; i < 3; i++) shockAt(s.x, s.y, { r: AR() * 1.3, color: '#b04aff', w: 8, dur: 0.9, flat: 1, delay: i * 0.15 }); }
    roomTint(col, 0.16, 0.6);
    shake(8);
  }

  // Time Stop (a Chronomancer's Time Reversal, fight.js pauseBoss), after the painted sheet (docs/art/vfx-reference/
  // chronomancer.png): a great ice clock face lies still on the floor round the boss (roman numerals, its hands stopped
  // after one jolt back), ice spikes stand up round its rim and a shell of ice grows on the boss's body; as time starts
  // again it all shatters into ice shards and numerals flung off the face. The face lies over the floor's telegraphs, so
  // it stays pale and thin. (The boss's own pose freezes and frosts in main.js; the boss bar shows the stop and the held
  // feed in raid-ui.js.)
  // TS_SCALE sizes the Time Stop face, its rim spikes and its shatter (the timing is the fight's, not this)
  const TS_SCALE = 1.45;
  // the face's ticks, numerals and frost tracery, painted once per Time Stop (a frame blits it, flattened)
  function timeStopFace(R, NUM) {
    const D = Math.ceil(R * 2 + 24), m = D / 2, cv = document.createElement('canvas'); cv.width = D; cv.height = D;
    const c = cv.getContext('2d'); c.translate(m, m); c.lineCap = 'round'; c.shadowColor = '#9fd4ff'; c.shadowBlur = 8;
    c.strokeStyle = c.fillStyle = 'rgba(214,240,255,0.85)';
    for (let i = 0; i < 60; i++) { const a = i * TAU / 60, big = i % 5 === 0; c.lineWidth = big ? (i % 15 === 0 ? 4 : 2) : 1; c.beginPath(); c.moveTo(Math.cos(a) * R * (big ? 0.88 : 0.93), Math.sin(a) * R * (big ? 0.88 : 0.93)); c.lineTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97); c.stroke(); }
    c.font = `600 ${Math.round(R * 0.14)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - Math.PI / 2; c.save(); c.translate(Math.cos(a) * R * 0.76, Math.sin(a) * R * 0.76); c.rotate(a + Math.PI / 2); c.fillText(NUM[i], 0, 0); c.restore(); }
    // a six-armed frost star in the middle, faint
    c.shadowBlur = 4; c.strokeStyle = 'rgba(190,230,255,0.45)'; c.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6, L = R * 0.4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * L, Math.sin(a) * L);
      for (const q of [0.45, 0.75]) { const px = Math.cos(a) * L * q, py = Math.sin(a) * L * q, bl = L * 0.18 * (1.2 - q); for (const s of [-1, 1]) { c.moveTo(px, py); c.lineTo(px + Math.cos(a + s * 0.8) * bl, py + Math.sin(a + s * 0.8) * bl); } } c.stroke(); }
    return { cv, m };
  }
  const numCache = new Map();
  function numeral(s, px, color) {
    const key = s + px + color;
    let cv = numCache.get(key);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = Math.ceil(px * 2.6); cv.height = Math.ceil(px * 1.6);
      const g = cv.getContext('2d'); g.font = `600 ${px}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, cv.width / 2, cv.height / 2);
      numCache.set(key, cv);
    }
    return cv;
  }
  function timeStop(b, dur) {
    const ICE = '#cfeeff', DEEP = '#6fa8e8', S = TS_SCALE, R = 128 * S, FL = 0.55, NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    const face = timeStopFace(R, NUM);
    const spikes = Array.from({ length: 16 }, (_, i) => ({ a: i * TAU / 16 + TAU / 32 + rand(-0.08, 0.08), h: rand(18, 40) * S, w: rand(4, 8) * S, lean: rand(-0.25, 0.25), at: rand(0.05, 0.3) })).sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    const shell = Array.from({ length: 7 }, (_, i) => ({ dx: (i - 3) * 13 + rand(-4, 4), h: rand(44, 96), w: rand(8, 14), lean: (i - 3) * 0.08 + rand(-0.1, 0.1), at: 0.08 + i * 0.03 }));
    const cracks = Array.from({ length: 9 }, (_, i) => { const a0 = i * TAU / 9 + rand(-0.2, 0.2), pts = [[0, 0]]; let a = a0, d = 0; for (let s = 0; s < 4; s++) { a += rand(-0.3, 0.3); d += R * rand(0.2, 0.28); pts.push([Math.cos(a) * d, Math.sin(a) * d]); } return pts; });
    // a standing ice spike: a pale translucent body, a white lit edge, a blue rim
    const ice = (c, x, y, h, w, lean, a, fill) => {
      const tx = x + lean * h;
      c.globalAlpha = a * fill; c.fillStyle = '#dff4ff'; c.beginPath(); c.moveTo(x - w, y); c.lineTo(tx, y - h); c.lineTo(x + w, y); c.closePath(); c.fill();
      c.globalAlpha = a * 0.7; c.strokeStyle = DEEP; c.lineWidth = 1; c.stroke();
      c.globalAlpha = a * 0.9; c.strokeStyle = '#ffffff'; c.beginPath(); c.moveTo(x - w * 0.2, y); c.lineTo(tx, y - h); c.stroke();
    };
    shockAt(b.x, b.y, { r: R * 1.5, color: ICE, w: 7, dur: 0.45, flat: FL });
    shockAt(b.x, b.y, { r0: R * 1.3, r: R, color: '#ffffff', w: 3, dur: 0.3, flat: FL });
    // the face on the floor (rim-led: its middle is only a faint cold tint); cracks race across it just before it breaks
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * dur, k = e.a * Math.min(1, life / 0.12) * Math.min(1, (dur - life) / 0.2), r = R * (0.85 + 0.15 * easeOut(Math.min(1, life / 0.25)));
      c.save(); c.translate(b.x, b.y); c.scale(1, FL); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r); gr.addColorStop(0, `rgba(120,170,255,${(0.04 * k).toFixed(3)})`); gr.addColorStop(1, `rgba(150,200,255,${(0.16 * k).toFixed(3)})`);
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.globalAlpha = Math.min(1, k * 0.9); c.drawImage(face.cv, -face.m * r / R, -face.m * r / R, face.cv.width * r / R, face.cv.height * r / R);
      c.restore(); c.globalAlpha = 1;
      VFX.neonRing(c, b.x, b.y, r, ICE, 3, k * 0.9, FL); VFX.neonRing(c, b.x, b.y, r * 1.05, DEEP, 1.2, k * 0.5, FL); VFX.neonRing(c, b.x, b.y, r * 0.86, ICE, 1.2, k * 0.55, FL); VFX.neonRing(c, b.x, b.y, r * 0.5, DEEP, 1.2, k * 0.45, FL);
      c.save(); c.translate(b.x, b.y); c.scale(1, FL); c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(224,244,255,${(0.85 * k).toFixed(3)})`;
      // two hands that kick back once and then stand still
      const back = Math.min(1, life / 0.3), hand = (a, len, w) => { c.lineWidth = w; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.stroke(); };
      hand(-Math.PI / 2 - 0.9 * easeOut(back), r * 0.66, 3); hand(-Math.PI / 2 + 2.1 - 0.15 * easeOut(back), r * 0.42, 5);
      const cr = Math.max(0, 1 - (dur - life) / 0.35);
      if (cr > 0) { c.strokeStyle = `rgba(255,255,255,${(0.9 * k).toFixed(3)})`; c.lineWidth = 1.6; c.beginPath();
        for (const pts of cracks) { const m = Math.max(1, Math.ceil((pts.length - 1) * cr)); c.moveTo(0, 0); for (let i = 1; i <= m; i++) c.lineTo(pts[i][0] * r / R, pts[i][1] * r / R); } c.stroke(); }
      c.restore();
    } });
    // the ice: spikes round the rim, a shell on the body, a cold glow
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const life = p * dur, k = e.a * Math.min(1, life / 0.12) * Math.min(1, (dur - life) / 0.15);
      VFX.glowAt(c, b.x, b.y - 34, 110, ICE, k * 0.32);
      c.save(); c.lineJoin = 'round';
      for (const s of spikes) { if (life < s.at) continue; const g = easeOut(Math.min(1, (life - s.at) / 0.2)); ice(c, b.x + Math.cos(s.a) * R * 0.98, b.y + Math.sin(s.a) * R * 0.98 * FL, s.h * g, s.w, s.lean, k, 0.45); }
      for (const s of shell) { if (life < s.at) continue; const g = easeOut(Math.min(1, (life - s.at) / 0.25)); ice(c, b.x + s.dx, b.y + 6, s.h * g, s.w, s.lean, k, 0.28); }
      c.restore();
    }, done: () => {
      // time starts again: the face breaks into plates thrown off the floor, the ice shatters, every numeral flung off
      VFX.flash(b.x, b.y - 40, 110, ICE, 0.22);
      shockAt(b.x, b.y, { r: R * 1.35, color: ICE, w: 6, dur: 0.45, flat: FL });
      shockAt(b.x, b.y, { r: R * 1.7, color: '#ffffff', w: 3, dur: 0.6, flat: FL, delay: 0.06 });
      for (let i = 0; i < 24; i++) { const a = rand(0, TAU), s = rand(180, 400); VFX.spawn({ x: b.x + Math.cos(a) * rand(0, 50), y: b.y, z: rand(10, 90), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(60, 240), g: 520, drag: 0.03, life: rand(0.55, 0.9), size: rand(9, 16), color: i % 3 ? ICE : '#ffffff', kind: 'shard', vr: rand(-12, 12) }); }
      const plates = Array.from({ length: 10 }, (_, i) => { const a0 = i * TAU / 10 + rand(-0.1, 0.1), a1 = a0 + TAU / 10 * rand(0.75, 0.95), r0 = R * rand(0.45, 0.65), am = (a0 + a1) / 2, s = rand(120, 220);
        return { pts: [[a0, r0], [a1, r0 * rand(0.9, 1.1)], [a1, R], [am, R * 1.02], [a0, R]], vx: Math.cos(am) * s, vy: Math.sin(am) * s * FL, vz: rand(140, 240), vr: rand(-3, 3), am, rm: (r0 + R) / 2 }; });
      const flying = NUM.map((s, i) => { const a = i * TAU / 12 - Math.PI / 2; return { s, x: b.x + Math.cos(a) * R * 0.76, y: b.y + Math.sin(a) * R * 0.76 * FL, vx: Math.cos(a) * rand(100, 190), vy: Math.sin(a) * rand(60, 110) - 90, vr: rand(-6, 6) }; });
      VFX.fx({ dur: 0.85, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * (1 - p * p);
        c.lineJoin = 'round';
        for (const pl of plates) {
          const ox = pl.vx * t, oy = pl.vy * t - Math.max(0, pl.vz * t - 500 * t * t), cx = b.x + Math.cos(pl.am) * pl.rm, cy = b.y + Math.sin(pl.am) * pl.rm * FL, rot = pl.vr * t;
          c.beginPath(); pl.pts.forEach(([a, rr], j) => { let px = b.x + Math.cos(a) * rr - cx, py = (b.y + Math.sin(a) * rr * FL) - cy; const qx = px * Math.cos(rot) - py * Math.sin(rot), qy = px * Math.sin(rot) + py * Math.cos(rot); j ? c.lineTo(cx + ox + qx, cy + oy + qy) : c.moveTo(cx + ox + qx, cy + oy + qy); }); c.closePath();
          c.globalAlpha = k * 0.3; c.fillStyle = '#dff4ff'; c.fill(); c.globalAlpha = k * 0.9; c.strokeStyle = '#ffffff'; c.lineWidth = 1.4; c.stroke();
        }
        // ([boss presentation] perf: each numeral is a sprite painted once, not 12 fillText calls a frame)
        for (const f of flying) { const g = numeral(f.s, Math.round(R * 0.14), ICE); c.save(); c.translate(f.x + f.vx * t, f.y + f.vy * t + 200 * t * t); c.rotate(f.vr * t); c.globalAlpha = k; c.drawImage(g, -g.width / 2, -g.height / 2); c.restore(); }
        c.globalAlpha = 1;
      } });
      shake(4);
    } });
  }

  // ================================================================ [boss presentation]
  // The boss's body and his big moments: what each cast shows on him, a flinch when he's hit, the enrage, the
  // entrance, the fall and the wipe. All cosmetic, all driven by messages every client gets from the host (bcast,
  // banim, pdmg 'enrage', fev 'behind', fight clear / wipe, the room's own intro beat), so everyone sees the same
  // thing. The state lives on the client's bossDraw (bd.show), which is new for every pull. Nothing here moves a
  // timing, a shape or a number; props stay on his body, and screen effects stay at the edges or are a soft wash.
  let clockFn = () => performance.now() / 1000;
  const clk = () => clockFn();
  const SH = bd => bd.show || (bd.show = { hitAt: -9, hitK: 0, enrAt: -9, enrDur: 8, behind: 0, death: null, intro: null, wipeAt: -9, hp: null, fx: [], alpha: 1, landed: false });
  const BODY_S = { grubnak: 1.3, skitterra: 1.3, volkar: 1.3 * 1.35, hollowking: 1.3 * 1.2 };
  // a point on his body (the art's own frame, facing +x) in the world
  const onBody = (b, kind, x, y) => { const S = BODY_S[kind] || 1.3, c = Math.cos(b.f || 0), s = Math.sin(b.f || 0); return { x: b.x + (x * c - y * s) * S, y: b.y + (x * s + y * c) * S }; };
  // effects owned by his state: his death (or a wipe) cuts them off
  const own = (sh, e) => { sh.fx.push(e); if (sh.fx.length > 60) sh.fx.shift(); return e; };
  const cut = sh => { for (const e of sh.fx) { e.gone = true; e.dur = 0; e.done = null; e.tick = null; } sh.fx.length = 0; };
  const soon = (sh, sec, fn) => own(sh, VFX.fx({ dur: sec, layer: 'ground', draw() {}, done: fn }));
  const easeIn = q => q * q;

  // screen-space helpers (inside an effect's draw): an edge vignette (cached gradient), and a whole-screen wash
  const vigG = new Map();
  function vignette(c, col, a, inner = 0.42) {
    if (!(a > 0.004)) return;
    const w = c.canvas.width, h = c.canvas.height, key = w + 'x' + h + col + inner;
    let g = vigG.get(key);
    if (!g) {
      if (vigG.size > 24) vigG.clear();
      g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * inner, w / 2, h / 2, Math.hypot(w, h) * 0.56);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.55, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 1)); vigG.set(key, g);
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.min(1, a); c.fillStyle = g; c.fillRect(0, 0, w, h); c.restore();
  }
  function wash(c, col, a, op = 'source-over') {
    if (!(a > 0.004)) return;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = op; c.globalAlpha = Math.min(1, a); c.fillStyle = col; c.fillRect(0, 0, c.canvas.width, c.canvas.height); c.restore();
  }
  // one soft flash over the screen (a single fade, never repeated: no strobing)
  const softFlash = (sh, col, a, dur = 0.5) => own(sh, VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => wash(c, col, a * e.a * (1 - p) * (1 - p), 'screen') }));

  // ---- hits: a brief white flinch (stronger for a crit or an Ultimate), throttled so DoT ticks or a flurry don't strobe
  function bossHit(bd, k) {
    if (!bd) return;
    const sh = SH(bd), t = clk(), left = sh.hitK * Math.max(0, 1 - (t - sh.hitAt) / 0.18);
    if (sh.death || (t - sh.hitAt < 0.14 && k <= left + 0.1)) return;
    sh.hitAt = t; sh.hitK = Math.min(1, Math.max(k, left));
  }
  // everyone else's blows: a faint flinch when his health drops by a real bite between two updates
  function bossHp(bd, hp, mx) {
    if (!bd || !(mx > 0)) return;
    const sh = SH(bd), prev = sh.hp; sh.hp = hp;
    if (prev != null && hp < prev && (prev - hp) / mx >= 0.0008 && clk() - sh.hitAt > 0.3) bossHit(bd, 0.28);
  }

  // ---- casts: a pose on his body for each move, and a gathering effect in the right place
  // pose: [prop, held for s after the cast ends]; keyed by boss, then by the cast's anim (castKey remaps a few shared ones)
  const CAST_POSE = {
    grubnak: { raise: [['raise', 0.3]], cleaver: [['windup', 0.1]], hunk: [['hunk', 0.2]], spice: [['spice', 0.2]], serve: [['cloche', 0.3]], bell: [['bell', 0.3]],
      whisk: [['whisk', 0.3]], charge: [['headdown', 0.6]], drains: [['bucket', 0.3]], heave: [['heave', 0.05]], enrage: [['raise', 0.5], ['steam', 0.5]] },
    skitterra: { enrage: [['rear', 0.5], ['venom', 0.5], ['brood', 0.5]] },
    volkar: { enrage: [['sky', 0.5], ['charge', 0.5]] },
    hollowking: { cleave: [['windup', 0.1]], marks: [['marks', 0.3]], judgement: [['gavel', 0.3]], charges: [['scroll', 0.4]], enrage: [['rise', 0.5], ['gaze', 0.5]] },
    archmage: { fire: [['fire', 0.5]], pyre: [['fire', 0.5]], frost: [['frost', 0.5]], lances: [['frost', 0.5]], bolt: [['bolt', 0.5]], chain: [['bolt', 0.5]], void: [['void', 0.5]], rifts: [['void', 0.5]],
      rune: [['rune', 0.6]], swap: [['rune', 0.6]], mark: [['rune', 0.6]], bind: [['bind', 0.8]], conv: [['conv', 0.8]], counter: [['counter', 0.6]], burst: [['burst', 0.4]], lance: [['lance', 0.4]], enrage: [['conv', 0.5], ['burst', 0.5]] },
  };
  const castKey = (kind, anim, name) => {
    if (kind === 'grubnak' && anim === 'boil' && name === 'Flare-Up') return 'heave';
    if (kind === 'grubnak' && anim === 'toss') return name === 'Spice Rack' ? 'spice' : 'hunk';
    return anim;
  };
  // motes drawn in to a point on him (pt(): where it is now), faster as the cast nears its end, and a glow there
  function drawIn(sh, dur, pt, o) {
    own(sh, VFX.fx({ dur, layer: 'air', tick: (p) => {
      if (Math.random() > (o.rate ?? 0.35) * (0.45 + p)) return;
      const q = pt(), a = rand(0, TAU), r = (o.r ?? 70) * rand(0.7, 1.1), life = rand(0.35, 0.55);
      VFX.spawn({ x: q.x + Math.cos(a) * r, y: q.y + Math.sin(a) * r * 0.7, z: o.z ?? 0, vx: -Math.cos(a) * r / life, vy: -Math.sin(a) * r * 0.7 / life, life, size: rand(5, 9) * (o.size ?? 1), size1: 2, color: Math.random() < 0.7 ? o.color : (o.color2 || '#ffffff') });
    }, draw: (c, p, t, e) => {
      if (o.glow === false) return;
      const q = pt(); VFX.glowAt(c, q.x, q.y - (o.z ?? 0), (o.gr ?? 26) * (0.7 + 0.6 * p), o.color, e.a * (0.22 + 0.4 * p) * (0.85 + 0.15 * Math.sin(t * 12)));
    } }));
  }
  // something spawned from a point on him at a steady rate for the length of the cast
  const emit = (sh, dur, rate, fn) => own(sh, VFX.fx({ dur, layer: 'air', draw() {}, tick: (p, dt, e) => { if (Math.random() < rate) fn(p, e); } }));
  // a beat: fn every `every` s through the cast
  const beat = (sh, dur, every, fn) => { let n = 0; own(sh, VFX.fx({ dur, layer: 'air', draw() {}, tick: (p) => { const k = Math.floor(p * dur / every); if (k > n) { n = k; fn(p); } } })); };
  const P = (b, kind, x, y) => () => onBody(b, kind, x, y);
  const CAST_FX = {
    grubnak: {
      // the skillet catching: heat gathering in the pan, embers lifting off the floor round his feet
      raise(sh, b, dur) {
        drawIn(sh, dur, P(b, 'grubnak', 45, -46), { color: '#ff8a2a', color2: '#ffe0a0', r: 60, gr: 34 });
        emit(sh, dur, 0.4, () => { const a = rand(0, TAU), d = rand(30, 90); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: 0, vz: rand(50, 110), vx: rand(-10, 10), life: rand(0.6, 1), size: rand(3, 6), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ff6a1a' }); });
      },
      // the cleaver hauled back: glints running up its edge, the last one the brightest
      cleaver(sh, b, dur) {
        const pt = P(b, 'grubnak', -39, 44);
        drawIn(sh, dur, pt, { color: '#fff2c8', r: 46, gr: 22, rate: 0.25, size: 0.8 });
        beat(sh, dur, 0.55, (p) => { const q = pt(); VFX.glint(q.x, q.y, { z: 0, size: 18 + 22 * p, color: '#fff6d8' }); });
      },
      // Meat Toss: the slab dripping; Spice Rack: chilli shaken out in red puffs
      hunk(sh, b, dur) { const pt = P(b, 'grubnak', 16, -52); emit(sh, dur, 0.18, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-6, 6), y: q.y, z: 10, vz: 0, g: 320, life: 0.35, size: rand(5, 8), color: '#8a2a14', kind: 'drop', add: false, rot: Math.PI / 2 }); }); drawIn(sh, dur, pt, { color: '#c8401a', color2: '#ffb070', r: 50, rate: 0.2, gr: 20 }); },
      spice(sh, b, dur) { const pt = P(b, 'grubnak', 30, -48); emit(sh, dur, 0.3, () => { const q = pt(), a = rand(0, TAU); VFX.spawn({ x: q.x, y: q.y, z: 4, vx: Math.cos(a) * rand(40, 90), vy: Math.sin(a) * rand(30, 70), vz: rand(20, 60), drag: 0.05, life: rand(0.5, 0.8), size: rand(10, 16), size1: 26, color: '#c84a2a', kind: 'smoke', add: false, a: 0.45 }); }); },
      // the platter's steam curling up
      serve(sh, b, dur) { const pt = P(b, 'grubnak', 24, -46); emit(sh, dur, 0.22, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-12, 12), y: q.y, z: 10, vz: rand(30, 60), vx: rand(-8, 8), drag: 0.02, life: rand(0.8, 1.2), size: rand(8, 12), size1: 26, color: '#f6f2ee', kind: 'smoke', add: false, a: 0.45, fadeIn: 0.2 }); }); drawIn(sh, dur, pt, { color: '#ffcf7a', r: 50, rate: 0.15, gr: 24 }); },
      // the bell rung on a beat: a small gold "ding" off it each time
      bell(sh, b, dur) { const pt = P(b, 'grubnak', 26, -44); beat(sh, dur, 0.62, () => { const q = pt(); shockAt(q.x, q.y, { r: 60, color: '#ffe08a', w: 3, dur: 0.35, flat: 0.7 }); VFX.glint(q.x, q.y - 6, { z: 0, size: 16, color: '#fff2c0' }); }); },
      // cream flung off the whisk in a spinning ring
      whisk(sh, b, dur) { const pt = P(b, 'grubnak', 39, -50); emit(sh, dur, 0.5, (p) => { const q = pt(), a = rand(0, TAU), sp = rand(90, 160); VFX.spawn({ x: q.x, y: q.y, z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(10, 40), g: 200, drag: 0.04, life: 0.45, size: rand(3, 5), size1: 1, color: '#fff6dc' }); }); },
      // head down, pawing: dust kicked up behind his heels, a stamp on each beat
      charge(sh, b, dur) {
        emit(sh, dur, 0.3, () => { const q = onBody(b, 'grubnak', -26, rand(-20, 20)), back = (b.f || 0) + Math.PI + rand(-0.5, 0.5); VFX.spawn({ x: q.x, y: q.y, z: 2, vx: Math.cos(back) * rand(60, 120), vy: Math.sin(back) * rand(40, 90), vz: rand(10, 40), drag: 0.06, life: rand(0.5, 0.8), size: rand(12, 18), size1: 34, color: '#d8c4a4', kind: 'smoke', add: false, a: 0.5 }); });
        beat(sh, dur, 0.5, () => { const q = onBody(b, 'grubnak', -6, Math.random() < 0.5 ? -18 : 18); shockAt(q.x, q.y, { r: 40, color: '#e8d8c0', w: 3, dur: 0.3, flat: 0.6 }); VFX.debris(q.x, q.y, { color: '#c9b48e', n: 2, speed: 0.5, size: 0.7 }); });
      },
      // the stockpot overhead, slopping and steaming; at the end it's thrown up onto the stove line
      heave(sh, b, dur) {
        const pt = P(b, 'grubnak', 6, -4);
        emit(sh, dur, 0.3, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-20, 20), y: q.y - 20, z: 30, vz: rand(30, 60), drag: 0.02, life: rand(0.8, 1.2), size: rand(10, 14), size1: 30, color: '#f6f2ee', kind: 'smoke', add: false, a: 0.5, fadeIn: 0.2 }); });
        emit(sh, dur, 0.12, () => { const q = pt(), a = rand(0, TAU); VFX.spawn({ x: q.x + Math.cos(a) * 30, y: q.y + Math.sin(a) * 24, z: 30, vx: Math.cos(a) * 40, vy: Math.sin(a) * 30, vz: 40, g: 400, life: 0.45, size: rand(5, 8), color: '#d8702a', kind: 'drop', add: false }); });
        soon(sh, dur, () => potThrow(pt(), { x: b.x * 0.6, y: -ARENA.hh - 6 }));
      },
      // the grease bucket pouring
      drains(sh, b, dur) { const pt = P(b, 'grubnak', 46, -38); emit(sh, dur, 0.25, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-4, 4), y: q.y, z: 14, g: 360, life: 0.3, size: rand(6, 9), color: '#6a4014', kind: 'drop', add: false, rot: Math.PI / 2 }); }); },
      // the broth coming up to the boil in him: his belly glowing, bubbles popping round him
      boil(sh, b, dur) {
        drawIn(sh, dur, () => b, { color: '#ff7a2a', color2: '#ffd070', r: 90, rate: 0.2, gr: 60 });
        emit(sh, dur, 0.3, () => { const a = rand(0, TAU), d = rand(20, 70); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: 10, vz: rand(20, 50), life: 0.4, size: rand(5, 9), size1: 12, color: '#ffb060', kind: 'soft' }); });
      },
      // Gut Blast: drawing a great breath, the air (and the smoke) pulled into his belly
      gut(sh, b, dur) { drawIn(sh, dur, () => b, { color: '#ffb070', color2: '#c8d87a', r: 140, rate: 0.6, gr: 50 }); },
    },
    skitterra: {
      venom(sh, b, dur) {
        const pt = P(b, 'skitterra', 38, 0);
        drawIn(sh, dur, pt, { color: '#8aff4a', color2: '#e8ffb0', r: 64, gr: 24 });
        emit(sh, dur, 0.2, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-6, 6), y: q.y + rand(-4, 4), z: 6, g: 260, life: 0.35, size: rand(5, 8), color: '#8adf2a', kind: 'drop', add: false, rot: Math.PI / 2 }); });
      },
      // silk: strands drawn in from all round, winding into her spinnerets
      silk(sh, b, dur) {
        const pt = P(b, 'skitterra', -54, 0), st = Array.from({ length: 7 }, (_, i) => ({ a: i * TAU / 7 + rand(-0.3, 0.3), ph: rand(0, 1), bend: rand(-0.8, 0.8) }));
        own(sh, VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
          const q = pt(), k = e.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.1);
          c.save(); c.lineCap = 'round';
          for (const s of st) {
            const u = (t * 0.9 + s.ph) % 1, r0 = 170 * (1 - u) + 10, r1 = r0 + 60, a0 = s.a + s.bend * u;
            c.beginPath(); c.moveTo(q.x + Math.cos(a0) * r1, q.y + Math.sin(a0) * r1 * 0.7);
            c.quadraticCurveTo(q.x + Math.cos(a0 + 0.4) * (r0 + 20), q.y + Math.sin(a0 + 0.4) * (r0 + 20) * 0.7, q.x + Math.cos(a0) * r0 * 0.3, q.y + Math.sin(a0) * r0 * 0.21);
            c.globalAlpha = k * 0.75 * Math.sin(u * Math.PI); c.strokeStyle = '#f4f0ff'; c.lineWidth = 1.6; c.stroke();
          }
          c.restore();
          VFX.glowAt(c, q.x, q.y, 20 + 14 * p, '#f4f0ff', k * (0.3 + 0.3 * p));
        } }));
      },
      // a lunge or a molt: the claws on her front legs catching the light in turn
      claws(sh, b, dur) { let side = 1; beat(sh, dur, 0.4, (p) => { side = -side; const q = onBody(b, 'skitterra', 40, 42 * side); VFX.glint(q.x, q.y, { z: 0, size: 16 + 14 * p, color: '#ffd0ec' }); }); },
      // the brood: the sacs in her glowing, green motes rising off her abdomen
      brood(sh, b, dur) { const pt = P(b, 'skitterra', -28, 0); drawIn(sh, dur, pt, { color: '#c8ff6a', r: 40, rate: 0.15, gr: 40 }); emit(sh, dur, 0.25, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-20, 20), y: q.y + rand(-14, 14), z: 6, vz: rand(30, 60), life: rand(0.6, 0.9), size: rand(3, 5), size1: 0, color: '#e8ff9a' }); }); },
      // up into the dark: grit and silk dust sifting down round her
      ambush(sh, b, dur) { emit(sh, dur, 0.35, () => { const a = rand(0, TAU), d = rand(20, 120); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: rand(160, 260), g: 380, life: 0.8, size: rand(3, 5), color: '#8a8098', kind: 'shard', add: false, vr: rand(-6, 6) }); }); },
    },
    volkar: {
      // the storm gathering over him: dark cloud wheeling overhead, short bolts dropping from it onto him
      sky(sh, b, dur) {
        const blobs = Array.from({ length: 8 }, (_, i) => ({ a: i * TAU / 8, r: rand(40, 70), s: rand(34, 50) }));
        own(sh, VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
          const k = e.a * Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.1), cx = b.x, cy = b.y - 170;
          c.save();
          for (const o of blobs) { const a = o.a + t * 1.2; c.globalAlpha = k * 0.42; c.fillStyle = '#1a2230'; c.beginPath(); c.ellipse(cx + Math.cos(a) * o.r, cy + Math.sin(a) * o.r * 0.45, o.s, o.s * 0.6, 0, 0, TAU); c.fill(); }
          c.restore();
          VFX.glowAt(c, cx, cy, 70, '#7fe8ff', k * (0.15 + 0.3 * p));
        } }));
        beat(sh, dur, 0.5, () => VFX.lightning(b.x + rand(-40, 40), b.y - 170, b.x + rand(-20, 20), b.y - 40, { color: '#bff6ff', jag: 12, dur: 0.18 }));
      },
      // lightning gathering in the striking fist
      fist(sh, b, dur) { const pt = P(b, 'volkar', 18, 36); drawIn(sh, dur, pt, { color: '#9ff4ff', r: 70, gr: 30 }); beat(sh, dur, 0.3, () => { const q = pt(), a = rand(0, TAU); VFX.lightning(q.x + Math.cos(a) * 70, q.y + Math.sin(a) * 50, q.x, q.y, { color: '#dffbff', jag: 10, dur: 0.14 }); }); },
      // Polarity Surge: gold into one hand, blue into the other
      surge(sh, b, dur) { drawIn(sh, dur, P(b, 'volkar', 18, -36), { color: '#ffc24a', r: 60, gr: 26 }); drawIn(sh, dur, P(b, 'volkar', 18, 36), { color: '#4ad8ff', r: 60, gr: 26 }); },
      // charged: arcs crawling over his stone, blue motes pulled into him
      crackle(sh, b, dur) { drawIn(sh, dur, () => b, { color: '#7fe8ff', r: 110, rate: 0.3, gr: 50 }); beat(sh, dur, 0.28, () => { const a = rand(0, TAU), a2 = a + rand(0.6, 1.4); VFX.lightning(b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 45, b.x + Math.cos(a2) * 70, b.y + Math.sin(a2) * 50, { color: '#bff6ff', jag: 10, dur: 0.16 }); }); },
      // Gale Slam: streaks of air pulled in toward him
      gale(sh, b, dur) {
        own(sh, VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
          const k = e.a * Math.min(1, p / 0.15);
          c.save(); c.lineCap = 'round'; c.strokeStyle = '#e8f4ff'; c.lineWidth = 2;
          for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + 0.3 * Math.sin(i), u = (t * 1.3 + i * 0.37) % 1, d = 220 - 160 * u; c.globalAlpha = k * 0.6 * Math.sin(u * Math.PI); c.beginPath(); c.moveTo(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7); c.lineTo(b.x + Math.cos(a) * (d - 40), b.y + Math.sin(a) * (d - 40) * 0.7); c.stroke(); }
          c.restore();
        } }));
      },
    },
    hollowking: {
      // Grave Cleave: violet light running up the raised blade
      cleave(sh, b, dur) { const pt = P(b, 'hollowking', 18, -9); drawIn(sh, dur, pt, { color: '#b46aff', color2: '#f0e0ff', r: 60, gr: 30 }); beat(sh, dur, 0.6, (p) => { const q = pt(); VFX.glint(q.x, q.y, { z: 0, size: 16 + 18 * p, color: '#f0e0ff' }); }); },
      // Grave Marks: sigils turning on the floor round him, grave-light rising
      marks(sh, b, dur) {
        own(sh, VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
          const k = e.a * Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.1);
          VFX.neonRing(c, b.x, b.y, 96, '#6dff9a', 2, k * 0.6, 0.55);
          for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * TAU / 6; VFX.glowAt(c, b.x + Math.cos(a) * 96, b.y + Math.sin(a) * 96 * 0.55, 10, '#c8ffd8', k * 0.7); }
        } }));
        drawIn(sh, dur, P(b, 'hollowking', 24, -30), { color: '#6dff9a', r: 70, gr: 22 });
      },
      // the Writ / Judgement: the sceptre's head drawing gold out of the air
      judgement(sh, b, dur) { drawIn(sh, dur, P(b, 'hollowking', 43, -58), { color: '#ffe08a', color2: '#ffffff', r: 80, gr: 34 }); },
      charges(sh, b, dur) { drawIn(sh, dur, P(b, 'hollowking', 37, -35), { color: '#7affa8', r: 40, rate: 0.15, gr: 22 }); },
      doom(sh, b, dur) { drawIn(sh, dur, P(b, 'hollowking', 16, -24), { color: '#b46aff', color2: '#e8d0ff', r: 70, gr: 30 }); },
      // his gaze: a cold glint in his eyes
      gaze(sh, b, dur) { const pt = P(b, 'hollowking', 11, 0); beat(sh, dur, 0.7, (p) => { const q = pt(); VFX.glint(q.x, q.y, { z: 0, size: 14 + 16 * p, color: '#e8fff0' }); }); },
      // the dead answering: grave-light rising out of the floor round him
      rise(sh, b, dur) { emit(sh, dur, 0.35, () => { const a = rand(0, TAU), d = rand(60, 160); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.6, z: 0, vz: rand(90, 150), life: rand(0.5, 0.8), size: rand(4, 7), size1: 0, color: Math.random() < 0.7 ? '#6dff9a' : '#c8ffd8' }); }); },
      // a swing building: grave-light pooling at his feet
      pool(sh, b, dur) { drawIn(sh, dur, () => b, { color: '#3aff7a', r: 120, rate: 0.25, gr: 60 }); },
      lights(sh, b, dur) { emit(sh, dur, 0.3, () => { const a = rand(0, TAU), d = rand(80, 160), life = 0.6; VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: 20, vx: -Math.cos(a) * d / life, vy: -Math.sin(a) * d * 0.7 / life, life, size: rand(14, 20), size1: 6, color: '#141a18', kind: 'smoke', add: false, a: 0.5 }); }); },
      audience(sh, b, dur) { drawIn(sh, dur, P(b, 'hollowking', 4, 0), { color: '#ffe6a0', r: 70, gr: 36 }); },
    },
  };
  // which gathering effect each anim gets (anims sharing one look share an entry)
  const CAST_USE = {
    skitterra: { mist: 'venom', spit: 'venom', deluge: 'venom', fang: 'venom', wrap: 'silk', silk: 'silk', web: 'silk', strand: 'silk', cocoon: 'silk', volley: 'silk', reel: 'silk',
      lunge: 'claws', molt: 'claws', brood: 'brood', eggs: 'brood', ambush: 'ambush' },
    volkar: { clap: 'sky', storm: 'sky', skyfall: 'sky', fist: 'fist', avalanche: 'fist', surge: 'surge', rods: 'crackle', crash: 'crackle', field: 'crackle', chain: 'crackle', orbs: 'crackle', gale: 'gale' },
    hollowking: { cleave: 'cleave', marks: 'marks', judgement: 'judgement', charges: 'charges', doom: 'doom', gaze: 'gaze', lightsout: 'lights', rise: 'rise', night: 'rise', march: 'rise',
      sweep: 'pool', stomp: 'pool', ring: 'pool', bind: 'pool', lids: 'rise', decree: 'rise', knell: 'pool', bells: 'pool', audience: 'audience' },
  };
  // the Flare-Up's end: the pot flung up onto the stove line in an arc, landing with a clang and a gout of steam
  function potThrow(from, to) {
    VFX.fx({ dur: 0.45, layer: 'air', draw: (c, p, t, e) => {
      const x = from.x + (to.x - from.x) * p, y = from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * 140 - 30 * (1 - p);
      c.save(); c.translate(x, y); c.rotate(p * 3);
      circle(c, 0, 0, 26, '#9aa2ab', '#1a1622', 3); circle(c, 0, 0, 19, '#c8601a');
      c.restore();
    }, done: () => {
      shockAt(to.x, to.y + 30, { r: 150, color: '#f0f4f8', w: 6, dur: 0.4, flat: 0.6 });
      VFX.sparks(to.x, to.y + 10, { color: '#ffe0a0', n: 12, speed: 320 });
      steam(to.x, to.y + 30, 10, 220);
      shake(7);
    } });
  }

  // ---- the enrage: the cast builds to the lethal moment (pdmg 'enrage': fight.js's sentence, untouched)
  const ENR = { grubnak: '#ff2a10', skitterra: '#b02aff', volkar: '#7a8aff', hollowking: '#9ac8ff', wyrm: '#ff5a1a', titan: '#9fe8ff' };
  ENR.archmage = '#3fe0d0';
  ENR.hydra = '#3affb0';
  function enrageStart(kind, b, dur) {
    const sh = SH(b); if (sh.death) return;
    sh.enrAt = clk(); sh.enrDur = dur; sh.landed = false;
    const col = ENR[kind] || '#ff2a10';
    // the screen's edge breathing in the boss's colour: a slow pulse (under once a second) that climbs to the end
    own(sh, VFX.fx({ dur: dur + 3, layer: 'air', draw: (c, p, t, e) => { const q = Math.min(1, t / dur); vignette(c, col, e.a * (0.14 + 0.36 * q) * (0.78 + 0.22 * Math.sin(t * TAU * 0.8))); } }));
    (ENRAGE_SEQ[kind] || (() => {}))(sh, b, dur);
    roar(b.x, b.y, kind);
    shake(5);
  }
  const ENRAGE_SEQ = {
    // Last Call: he kicks the table over, and the whole kitchen goes red, embers lifting off the floor
    grubnak(sh, b, dur) {
      own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => wash(c, '#ff4a2a', e.a * 0.42 * Math.min(1, t / dur), 'multiply') }));
      emit(sh, dur + 2, 0.6, (p) => { const q = scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: 0, vz: rand(40, 100), vx: rand(-12, 12), life: rand(0.8, 1.4), size: rand(3, 6), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ff5a1a' }); });
      soon(sh, 0.6, () => tableFlip(sh, b, dur + 2));
    },
    // Devour: the brood comes pouring out of the walls and rings her while she rears
    skitterra(sh, b, dur) {
      own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => wash(c, '#9a7ab8', e.a * 0.5 * Math.min(1, t / dur), 'multiply') }));
      const brood = Array.from({ length: 28 }, (_, i) => { const a = i * TAU / 28 + rand(-0.1, 0.1), wall = ARENA.edge ? ARENA.edge(a) : AR(), ra = rand(150, 230); return { a, wall, ra, at: rand(0.3, dur * 0.7), sp: rand(1.1, 1.8), st: { t: 0, props: {}, moving: true } }; });
      own(sh, VFX.fx({ dur: dur + 2.5, layer: 'ground', draw: (c, p, t, e) => {
        for (const s of brood) {
          if (t < s.at) continue;
          const q = Math.min(1, (t - s.at) / s.sp), d = s.wall + (s.ra - s.wall) * easeOut(q), jit = q >= 1 ? Math.sin(t * 9 + s.a * 7) * 6 : 0;
          s.st.t = t + s.a; s.st.moving = q < 1 || Math.sin(t * 3 + s.a) > 0.6;
          c.save(); c.globalAlpha = e.a * Math.min(1, (t - s.at) / 0.3);
          drawAdd(c, 'spiderling', b.x + Math.cos(s.a) * (d + jit), b.y + Math.sin(s.a) * (d + jit) * 0.75, s.a + Math.PI, s.st, t > dur * 0.85, 1.1);
          c.restore();
        }
      } }));
    },
    // Skybreak: a crack opens across the sky, rain drives down, bolts fall out of the split
    volkar(sh, b, dur) {
      const pts = Array.from({ length: 14 }, (_, i) => [i / 13, 0.16 + rand(-0.035, 0.035)]);
      own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => wash(c, '#6a7aa8', e.a * 0.45 * Math.min(1, t / dur), 'multiply') }));
      own(sh, VFX.fx({ dur: dur + 3, layer: 'air', draw: (c, p, t, e) => {
        const q = Math.min(1, t / dur), W = c.canvas.width, H = c.canvas.height, w = (3 + 34 * easeIn(q)) * H / 900, k = e.a * Math.min(1, t / 0.4);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
        // rain: long thin streaks, in screen space, thickening with the storm
        c.strokeStyle = '#c8dcff'; c.lineWidth = Math.max(1, H / 700); c.globalAlpha = k * (0.12 + 0.25 * q); c.beginPath();
        for (let i = 0; i < 70; i++) { const x = ((i * 0.618 + t * 0.07) % 1) * W * 1.1 - W * 0.05, y = (((i * 0.377) + t * (1.1 + (i % 3) * 0.2)) % 1) * H * 1.1 - H * 0.05; c.moveTo(x, y); c.lineTo(x - H * 0.012, y + H * 0.05); }
        c.stroke();
        // the split: a jagged seam of white-blue light across the top of the sky, opening
        const path = (s) => { c.beginPath(); pts.forEach(([u, v], i) => { const y = v * H - s * w * (0.4 + 0.6 * Math.sin(u * Math.PI)); i ? c.lineTo(u * W, y) : c.moveTo(u * W, y); }); for (let i = pts.length - 1; i >= 0; i--) { const [u, v] = pts[i]; c.lineTo(u * W, v * H + s * w * (0.4 + 0.6 * Math.sin(u * Math.PI))); } c.closePath(); };
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = k * 0.35; c.fillStyle = '#5a7aff'; path(2.6); c.fill();
        c.globalAlpha = k * 0.8; c.fillStyle = '#bfe8ff'; path(1); c.fill();
        c.globalAlpha = k; c.fillStyle = '#ffffff'; path(0.35); c.fill();
        c.restore();
      } }));
      beat(sh, dur, 0.85, () => { const a = rand(0, TAU), d = rand(120, AR() * 0.8); VFX.lightning(b.x + rand(-200, 200), b.y - 700, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7, { color: '#dff4ff', jag: 26, dur: 0.35 }); });
    },
    // Moonset: the moon climbs over the barrow and the hall freezes, frost closing in from the edges
    hollowking(sh, b, dur) {
      own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => wash(c, '#8ab4e8', e.a * 0.5 * Math.min(1, t / dur), 'multiply') }));
      own(sh, VFX.fx({ dur: dur + 3, layer: 'air', draw: (c, p, t, e) => {
        // (the moon up in the sky at the top of the screen, climbing, never sat over the hall; the frost at the edges only)
        const q = Math.min(1, t / dur), W = c.canvas.width, H = c.canvas.height, R = Math.min(W, H) * 0.05, x = W * 0.5, y = H * (0.16 - 0.1 * easeOut(q)), k = e.a * Math.min(1, t / 0.6);
        vignette(c, '#dff0ff', k * 0.24 * q, 0.5);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.35; c.drawImage(VFX.sprite('glow', '#9ac8ff'), x - R * 4, y - R * 4, R * 8, R * 8);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = k * 0.82; c.fillStyle = '#eef6ff'; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
        c.fillStyle = 'rgba(150,175,210,0.45)'; for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12], [0.35, -0.35, 0.1]]) { c.beginPath(); c.arc(x + dx * R, y + dy * R, r * R, 0, TAU); c.fill(); }
        c.restore();
      } }));
      emit(sh, dur + 2, 0.5, () => { const q = scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(60, 140), vz: -rand(10, 30), vx: rand(-15, 15), life: rand(1.2, 2), size: rand(3, 5), size1: 1, color: '#e8f4ff' }); });
    },
  };
  // Last Call's table: set in front of him, kicked up end over end, landing upside down with a crash of plates
  function tableFlip(sh, b, dur) {
    const f = b.f || 0, ca = Math.cos(f), sa = Math.sin(f), x0 = b.x + ca * 120, y0 = b.y + sa * 120, L = 150, Wd = 70;
    let crashed = false;
    // (on the floor layer: once it lands it lies under whoever stands there, never over the tank in front of him)
    own(sh, VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const q = Math.min(1, t / 0.5), phi = Math.PI * easeOut(q), fwd = 70 * q, z = Math.sin(phi) * 50, k = e.a * Math.min(1, (dur - t) / 0.6);
      if (q >= 1 && !crashed) { crashed = true; const cx = x0 + ca * 70, cy = y0 + sa * 70; bang(cx, cy, 90, { n: 12, color: '#c8803a', core: '#ffe0b0', ink: '#3a1a08' }); VFX.debris(cx, cy, { color: '#7a4a22', n: 12, speed: 1.3 }); for (let i = 0; i < 10; i++) VFX.spawn({ x: cx, y: cy, z: 20, vx: rand(-220, 220), vy: rand(-160, 160), vz: rand(100, 260), g: 600, life: 0.7, size: 10, color: '#f0ece4', kind: 'shard', add: false, vr: rand(-10, 10) }); shake(10); }
      c.save(); c.translate(x0 + ca * fwd, y0 + sa * fwd - z); c.rotate(f); c.scale(Math.cos(phi), 1); c.globalAlpha = k;
      const under = Math.cos(phi) < 0;
      rrect(c, -Wd / 2, -L / 2, Wd, L, 6, under ? '#5a3418' : '#9a6a3a', '#1a1622', 3);
      if (!under) { c.strokeStyle = 'rgba(60,30,10,0.5)'; c.lineWidth = 1.5; c.beginPath(); for (const u of [-0.25, 0, 0.25]) { c.moveTo(u * Wd, -L / 2 + 6); c.lineTo(u * Wd, L / 2 - 6); } c.stroke(); circle(c, 0, -20, 12, '#f0ece4', '#1a1622', 2); circle(c, 4, 26, 10, '#f0ece4', '#1a1622', 2); }
      else for (const [lx, ly] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { rrect(c, lx * (Wd / 2 - 10) - 5, ly * (L / 2 - 12) - 5, 10, 10, 2, '#3a2010', '#1a1622', 2); }
      c.restore(); c.globalAlpha = 1;
    } }));
  }
  // the lethal moment (once): each boss's own end of the world, then the wipe follows
  function enrageLand(kind, b) {
    const sh = SH(b); if (sh.landed || sh.death) return; sh.landed = true;
    shake(14);
    if (kind === 'grubnak') {
      softFlash(sh, '#ff6a2a', 0.35, 0.7);
      bang(b.x, b.y - 20, 240, { n: 20, dur: 0.6, hole: 0.42, fill: '#ff8a2a', core: '#ffd27a' });   // (a ring of flame spikes round him: he stays in sight, no white-out)
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 50 }, 12)) after(rand(0, 0.35), () => VFX.flare(q.x, q.y, { color: '#ff5a1a', n: 16, r: 30, h: 1.8, size: 1.3 }));
    } else if (kind === 'skitterra') {
      softFlash(sh, '#c070ff', 0.3, 0.7);
      shockAt(b.x, b.y, { r: AR() * 1.2, color: '#c070ff', w: 12, dur: 0.6, flat: 1 });
      bang(b.x, b.y, 220, { n: 18, color: '#b04aff', core: '#e8b8ff', ink: '#1a0a2a', dur: 0.55, hole: 0.4, fill: '#9a3aff' });   // (a ring: she stays in sight, no white-out)
    } else if (kind === 'volkar') {
      softFlash(sh, '#dff4ff', 0.4, 0.8);
      VFX.pillar(b.x, b.y, { r: 160, h: 900, color: '#dff4ff', dur: 1.1 });
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 40 }, 7)) after(rand(0, 0.3), () => VFX.lightning(q.x + rand(-40, 40), q.y - 600, q.x, q.y, { color: '#ffffff', jag: 26, dur: 0.4 }));
    } else {
      softFlash(sh, '#cfe8ff', 0.4, 0.9);
      shockAt(b.x, b.y, { r: AR() * 1.3, color: '#dff0ff', w: 14, dur: 0.8, flat: 1 });
      for (let i = 0; i < 24; i++) { const a = rand(0, TAU), s = rand(200, 420); VFX.spawn({ x: b.x, y: b.y, z: rand(10, 60), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(60, 200), g: 500, drag: 0.03, life: 0.8, size: rand(9, 15), color: '#dff4ff', kind: 'shard', vr: rand(-12, 12) }); }
    }
  }
  // the soft enrage (fev 'behind': another pass of a course's last set): he gets heavier and his rim burns red
  function behind(b, n) {
    const sh = SH(b); if (sh.death) return;
    sh.behind = Math.min(0.75, 0.3 + 0.12 * (n || 1));
    shockAt(b.x, b.y, { r: 220, color: '#ff4a2a', w: 6, dur: 0.6, flat: 1 });
    shake(4);
  }

  // ---- the entrance (at the room's title card): short, cosmetic, nothing blocked
  const INTRO_DUR = { grubnak: 1.5, skitterra: 1.6, volkar: 1.2, hollowking: 2.2, wyrm: 2.0, titan: 2.2 };
  INTRO_DUR.archmage = 2.2;
  INTRO_DUR.hydra = 2.0;
  function intro(kind, b) {
    const sh = SH(b); sh.intro = { at: clk(), kind };
    if (kind === 'grubnak') {
      // he slams a stockpot down in front of him: a clang, a ring, a gout of steam
      soon(sh, 0.7, () => {
        const q = onBody(b, 'grubnak', 70, 0);
        VFX.fx({ dur: 1.4, layer: 'air', draw: (c, p, t, e) => { const z = Math.max(0, 1 - t / 0.08) * 50, k = e.a * Math.min(1, (1.4 - t) / 0.5); c.save(); c.globalAlpha = k; c.translate(q.x, q.y - z); ellipse(c, 0, 18, 34, 12, 0, 'rgba(0,0,0,0.3)'); rrect(c, -30, -26, 60, 44, [4, 4, 14, 14], '#9aa2ab', '#1a1622', 3); ellipse(c, 0, -26, 30, 9, 0, '#c8601a', '#1a1622', 2.5); for (const s of [-1, 1]) rrect(c, s * 30 - 5, -18, 10, 6, 3, '#4a4e54', '#1a1622', 2); c.restore(); c.globalAlpha = 1; } });
        shockAt(q.x, q.y, { r: 130, color: '#f4f6f8', w: 6, dur: 0.4, flat: 0.6 });
        shockAt(q.x, q.y, { r: 200, color: '#ffd08a', w: 3, dur: 0.6, flat: 0.6, delay: 0.08 });
        VFX.sparks(q.x, q.y - 10, { color: '#ffe0a0', n: 10, speed: 280 });
        steam(q.x, q.y - 20, 10, 160);
        shake(8);
      });
    } else if (kind === 'skitterra') {
      // she comes down out of the dark on a thread and lands in a burst of dust and silk
      VFX.fx({ dur: 1.9, layer: 'air', draw: (c, p, t, e) => {
        const oy = introDrop(t), k = e.a * Math.min(1, (1.9 - t) / 0.5);
        c.save(); c.globalAlpha = k; c.lineCap = 'round'; c.strokeStyle = 'rgba(250,248,255,0.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(b.x - 40, b.y - 1200); c.lineTo(b.x - 40 * (1 - Math.min(1, t)), b.y + oy - 30); c.stroke(); c.restore(); c.globalAlpha = 1;
      } });
      soon(sh, 0.9, () => {
        shockAt(b.x, b.y, { r: 220, color: '#e8dcff', w: 8, dur: 0.5, flat: 1 });
        VFX.smoke(b.x, b.y, { color: '#8a8098', n: 10, size: 40, a: 0.55, speed: 150 });
        VFX.debris(b.x, b.y, { color: '#4a4156', n: 10, speed: 1.2 });
        webDecal(b.x, b.y, 150, 5);
        shake(9);
      });
    } else if (kind === 'volkar') {
      // the storm crashes in: bolts drive down on the spot and he's standing in them, one soft flash and thunder
      soon(sh, 0.3, () => {
        for (let i = 0; i < 3; i++) VFX.lightning(b.x + rand(-60, 60), b.y - 700, b.x + rand(-20, 20), b.y - 10, { color: i ? '#bff6ff' : '#ffffff', jag: 28, dur: 0.45 });
        VFX.pillar(b.x, b.y, { r: 90, h: 600, color: '#dff4ff', dur: 0.7 });
        shockAt(b.x, b.y, { r: 320, color: '#9ff4ff', w: 10, dur: 0.55, flat: 1 });
        for (const q of ringPts(b.x, b.y, 110, 12)) VFX.spawn({ x: q.x, y: q.y, z: 10, vx: Math.cos(q.a) * 120, vy: Math.sin(q.a) * 90, vz: 20, drag: 0.04, life: rand(1, 1.5), size: rand(30, 44), size1: 80, color: '#2a3240', kind: 'smoke', add: false, a: 0.55 });
        AFT.decal(b.x, b.y, { style: 'crack', r: 110, dur: 4, a: 0.6, seed: Math.random() * 6 });
        softFlash(sh, '#dff4ff', 0.18, 0.45);
        shake(10);
      });
    } else if (kind === 'archmage') {
      // the seven circles flare one after another under him, and he rises out of the water in their light
      for (let i = 0; i < 4; i++) soon(sh, 0.15 + i * 0.28, () => shockAt(b.x, b.y, { r: 130 + i * 90, color: ['#ff6a2a', '#7fd8ff', '#ffe45a', '#a05aff'][i], w: 6, dur: 0.6, flat: 1 }));
      soon(sh, 1.0, () => { VFX.pillar(b.x, b.y, { r: 60, h: 360, color: '#7fe8e0', dur: 0.8 }); VFX.smoke(b.x, b.y, { color: '#2a5a60', n: 8, size: 36, a: 0.5, speed: 120 }); shake(6); });
    } else if (kind === 'hollowking') {
      // the great door behind him swings open on grave-light, fog rolls out over the floor, he walks out of it
      const dy = -ARENA.hh;
      VFX.fx({ dur: 2.3, layer: 'ground', draw: (c, p, t, e) => {
        const open = easeOut(Math.min(1, t / 0.9)), k = e.a * Math.min(1, t / 0.2) * Math.min(1, (2.3 - t) / 0.6), w = 90, h = 150;
        c.save(); c.globalAlpha = k;
        c.fillStyle = '#05080a'; c.fillRect(b.x - w, dy - h, w * 2, h);
        VFX.glowAt(c, b.x, dy - 20, 130 * open, '#6dff9a', k * 0.6 * open);
        c.fillStyle = '#2a2e34'; c.strokeStyle = '#1a1622'; c.lineWidth = 3;
        for (const s of [-1, 1]) { const lw = w * (1 - open * 0.85); c.fillRect(s < 0 ? b.x - w : b.x + w - lw, dy - h, lw, h); c.strokeRect(s < 0 ? b.x - w : b.x + w - lw, dy - h, lw, h); }
        c.restore(); c.globalAlpha = 1;
      } });
      emit(sh, 1.5, 0.7, () => { const a = Math.PI / 2 + rand(-1.3, 1.3), sp = rand(80, 200); VFX.spawn({ x: b.x + rand(-80, 80), y: Math.max(dy + 10, b.y - 60) + rand(0, 40), z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, drag: 0.02, life: rand(1.4, 2.2), size: rand(40, 60), size1: 110, color: '#9ab0a8', kind: 'smoke', add: false, a: 0.22, fadeIn: 0.25 }); });
      soon(sh, 1.6, () => { const q = onBody(b, 'hollowking', 11, 0); VFX.flash(q.x, q.y - 6, 60, '#c8ffd8', 0.3); shockAt(b.x, b.y, { r: 160, color: '#6dff9a', w: 4, dur: 0.5, flat: 0.6 }); shake(5); });
    }
  }
  const introDrop = t => t < 0.9 ? -620 * (1 - easeIn(t / 0.9)) : t < 1.25 ? -16 * Math.sin((t - 0.9) / 0.35 * Math.PI) : 0;

  // ---- his fall (fight clear), 2-3 s; the confetti comes after it (victory)
  const DEATH_DUR = { grubnak: 2.2, skitterra: 2.2, volkar: 2.3, hollowking: 2.4, wyrm: 2.6, titan: 2.8 };
  DEATH_DUR.archmage = 2.8;
  DEATH_DUR.hydra = 2.8;
  function bossDeath(kind, b) {
    const sh = SH(b); if (sh.death) return;
    cut(sh); sh.enrAt = -9; sh.behind = 0; sh.death = { at: clk(), kind };
    if (kind === 'grubnak') {
      // he staggers, then goes down flat on his face; a pot lid clangs away across the tiles, steam everywhere
      emit(sh, 0.8, 0.25, () => VFX.smoke(b.x + rand(-30, 30), b.y - 30, { color: '#f6f2ee', n: 1, size: 24, a: 0.4, speed: 30 }));
      soon(sh, 0.8, () => {
        shockAt(b.x, b.y, { r: 240, color: '#f0e0c8', w: 8, dur: 0.6, flat: 1 });
        VFX.debris(b.x, b.y, { color: '#e2d6c0', n: 12, speed: 1.3 });
        steam(b.x, b.y, 14, 260);
        const dir = Math.random() < 0.5 ? -1 : 1;
        VFX.fx({ dur: 1.3, layer: 'air', draw: (c, p, t, e) => {
          const x = b.x + dir * (40 + 220 * easeOut(p)), z = Math.abs(Math.sin(p * Math.PI * 2.5)) * 70 * (1 - p), k = e.a * Math.min(1, (1 - p) / 0.3);
          c.save(); c.globalAlpha = k; c.translate(x, b.y + 30 - z); c.rotate(dir * p * 9); ellipse(c, 0, 0, 24, 24 * Math.abs(Math.cos(p * 14)) + 3, 0, '#aab2bb', '#1a1622', 2.5); c.restore(); c.globalAlpha = 1;
        } });
        for (const at of [0, 0.45, 0.8]) after(at, () => shockAt(b.x + dir * (40 + 220 * easeOut(at / 1.3)), b.y + 30, { r: 50, color: '#ffffff', w: 3, dur: 0.3, flat: 0.6 }));
        shake(12);
      });
    } else if (kind === 'skitterra') {
      // she rears once, curls up, her legs folding in under her pair by pair, and the silk in her bursts
      soon(sh, 1.1, () => {
        VFX.burst(b.x, b.y - 20, { color: '#f4f0ff', n: 26, speed: 300, size: 12 });
        for (let i = 0; i < 16; i++) VFX.spawn({ x: b.x + rand(-40, 40), y: b.y + rand(-30, 30), z: 20, vx: rand(-260, 260), vy: rand(-160, 160), vz: rand(60, 220), g: 320, life: 0.9, size: 14, color: '#ffffff', stretch: 4, vr: rand(-8, 8) });
        webDecal(b.x, b.y, 170, 12);
        shockAt(b.x, b.y, { r: 200, color: '#f4f0ff', w: 5, dur: 0.5, flat: 1 });
        shake(7);
      });
    } else if (kind === 'volkar') {
      // the storm in him lets go: a column of lightning goes up out of him, he comes apart, rain falls where he stood
      emit(sh, 0.7, 0.4, () => { const a = rand(0, TAU); VFX.lightning(b.x, b.y - 30, b.x + Math.cos(a) * 80, b.y - 30 + Math.sin(a) * 60, { color: '#bff6ff', jag: 10, dur: 0.14 }); });
      soon(sh, 0.7, () => {
        VFX.pillar(b.x, b.y, { r: 70, h: 800, color: '#dff4ff', dur: 1.3 });
        for (let i = 0; i < 4; i++) VFX.lightning(b.x + rand(-20, 20), b.y - 40, b.x + rand(-80, 80), b.y - 760, { color: i % 2 ? '#ffffff' : '#9fe0ff', jag: 30, dur: 0.6 });
        softFlash(sh, '#dff4ff', 0.2, 0.6);
        for (let i = 0; i < 14; i++) { const a = rand(0, TAU), s = rand(80, 200); VFX.spawn({ x: b.x, y: b.y, z: rand(10, 60), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, vz: rand(60, 160), g: 400, life: 0.9, size: rand(10, 16), color: '#5b6a80', kind: 'shard', add: false, vr: rand(-8, 8) }); }
        shake(9);
      });
      own(sh, VFX.fx({ dur: 3.2, delay: 0.8, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, t / 0.4) * Math.min(1, (1 - p) / 0.4);
        c.save(); c.strokeStyle = '#c8dcff'; c.lineWidth = 1.6; c.lineCap = 'round'; c.globalAlpha = k * 0.55; c.beginPath();
        for (let i = 0; i < 46; i++) { const x = b.x + (((i * 0.618) % 1) - 0.5) * 520, y0 = b.y + (((i * 0.377) % 1) - 0.5) * 260, fall = ((t * 1.8 + i * 0.13) % 1); c.moveTo(x + 10 * fall, y0 - 260 * (1 - fall)); c.lineTo(x + 10 * fall - 4, y0 - 260 * (1 - fall) + 26); }
        c.stroke(); c.restore();
      } }));
    } else {
      // he goes to a knee; the crown drops and rolls; the armour crumbles to dust; the bells toll away to nothing
      soon(sh, 0.5, () => crownDrop(onBody(b, 'hollowking', 4, 0), b));
      emit(sh, 2.2, 0.5, (p) => { if (p < 0.25) return; const a = rand(0, TAU), d = rand(0, 40); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.7, z: rand(0, 50), vx: rand(-20, 20), vz: rand(-10, 20), drag: 0.03, life: rand(1, 1.6), size: rand(16, 26), size1: 50, color: '#8a9490', kind: 'smoke', add: false, a: 0.45 }); if (Math.random() < 0.3) VFX.debris(b.x + rand(-20, 20), b.y, { color: '#3a3d48', n: 2, speed: 0.6 }); });
      for (const [at, a] of [[0.6, 1], [1.3, 0.6], [2, 0.3]]) after(at, () => shockAt(b.x, b.y, { r: AR() * 0.9, color: a > 0.5 ? '#c8ffdc' : '#6a8a78', w: 6 * a, dur: 1, flat: 1 }));
    }
  }
  // the Hollow King's crown: falls off as he goes down, bounces, rolls a little and lies there, still faintly lit
  function crownDrop(from, b) {
    const dir = Math.random() < 0.5 ? -1 : 1, x1 = from.x + dir * 90, y1 = b.y + 40;
    VFX.fx({ dur: 14, layer: 'air', draw: (c, p, t, e) => {
      const q = Math.min(1, t / 0.9), x = from.x + (x1 - from.x) * easeOut(q), z = (1 - q) * 60 * Math.abs(Math.cos(q * Math.PI * 1.5)), y = from.y + (y1 - from.y) * q - z, k = e.a * Math.min(1, (14 - t) / 2);
      c.save(); c.globalAlpha = k; c.translate(x, y); c.scale(1.8, 1.8); c.rotate(dir * Math.min(1, t / 0.9) * 2.6);
      ellipse(c, 0, 4, 18, 7, 0, 'rgba(0,0,0,0.3)');
      // (a crown lying on its side seen from above: broad gold points round a heavy band, a gem in it; not a thin ring)
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7; poly(c, [Math.cos(a - 0.42) * 12, Math.sin(a - 0.42) * 12, Math.cos(a) * 24, Math.sin(a) * 24, Math.cos(a + 0.42) * 12, Math.sin(a + 0.42) * 12], '#d8b85a', '#1a1622', 1.5); circle(c, Math.cos(a) * 23, Math.sin(a) * 23, 1.8, '#fff2c0'); }
      circle(c, 0, 0, 11, null, '#1a1622', 7); circle(c, 0, 0, 11, null, '#c8a24a', 4.5); circle(c, 0, 0, 11, null, 'rgba(255,240,190,0.7)', 1.2);
      circle(c, 0, -11, 3, '#6dff9a', '#1a1622', 1.2); circle(c, 9.5, 5.5, 2.4, '#b46aff', '#1a1622', 1); circle(c, -9.5, 5.5, 2.4, '#b46aff', '#1a1622', 1);
      c.restore(); c.globalAlpha = 1;
      if (t > 0.9) VFX.glowAt(c, x, y, 26, '#6dff9a', k * 0.25 * (1 - Math.min(1, (t - 0.9) / 6)));
    }, tick: (p, dt, e) => { if (!e.landed && p * 14 > 0.9) { e.landed = true; shockAt(x1, y1, { r: 40, color: '#ffe2a0', w: 3, dur: 0.3, flat: 0.6 }); } } });
  }

  // ---- the wipe: a heavy vignette, his laugh, and the room draining of colour
  function wipeShow(b, kind) {
    const sh = b && SH(b);
    if (sh && !sh.death) { cut(sh); sh.wipeAt = clk(); if (b.st) b.st.action = { type: 'attack', t0: b.st.t, dur: 1.4 }; roar(b.x, b.y, kind); }
    VFX.fx({ dur: 9, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (9 - t) / 0.5);
      wash(c, '#808080', k * 0.8 * Math.min(1, t / 2.6), 'saturation');
      wash(c, '#000000', k * 0.22 * Math.min(1, t / 2), 'source-over');
      vignette(c, '#0a0204', k * 0.85 * Math.min(1, t / 1.2), 0.3);
    } });
  }

  // ---- drawing him: poses from the moments above, the flinch, the enrage rim, untargetable as a ghost, the
  // Time Stop frost / a trial's memory / the Long Night's dark (these last three replace the old CSS filter layer)
  let layerCv = null, silCv = null;
  const BOX = 640;   // world px round him: room for his widest swing and his props
  function bodyPose(kind, sh, t, o) {
    const q = { alpha: 1, ox: 0, oy: 0, sx: 1, sy: 1, rot: 0, grow: 1, extra: null, ghost: o.ghost || 0, dark: o.dark || 0, rim: null, rimA: 0 };
    const X = (k, v) => { (q.extra || (q.extra = {}))[k] = v; };
    // hit flinch: a squash toward the camera and a white flash
    const hq = t - sh.hitAt, hk = hq < 0.18 && !sh.death ? sh.hitK * (1 - hq / 0.18) : 0;
    q.flash = hk; q.sx *= 1 + 0.05 * hk; q.sy *= 1 - 0.05 * hk; q.oy += 2.5 * hk;
    // the enrage: he swells and shakes harder to the end, his rim pulsing red / violet
    if (sh.enrAt > 0 && !sh.death) {
      const ep = Math.min(1, (t - sh.enrAt) / sh.enrDur), a = 0.6 + 3 * ep;
      q.grow *= 1 + 0.13 * easeOut(ep); q.ox += Math.sin(t * 41) * a + Math.sin(t * 67) * a * 0.5; q.oy += Math.sin(t * 53) * a * 0.6;
      q.rim = Math.sin(t * 3) > 0 ? '#ff3a2a' : '#b04aff'; q.rimA = 0.5 + 0.4 * ep * (0.6 + 0.4 * Math.sin(t * 5));
    } else if (sh.behind > 0 && !sh.death) {
      q.grow *= 1 + 0.025 * sh.behind + 0.012 * Math.sin(t * 2.6); q.rim = '#ff3a2a'; q.rimA = sh.behind * (0.45 + 0.25 * Math.sin(t * 2.6));
    }
    // the wipe: he laughs, shoulders heaving
    const wq = t - sh.wipeAt;
    if (wq >= 0 && wq < 2.6 && !sh.death) q.grow *= 1 + 0.035 * Math.abs(Math.sin(wq * 11)) * (1 - wq / 2.6);
    // the entrance
    if (o.pending && !sh.intro) { if (kind !== 'grubnak') q.alpha = 0; else X('heave', true); }
    if (sh.intro && !sh.intro.done) {
      const s = t - sh.intro.at;
      if (s > (INTRO_DUR[kind] || 2)) sh.intro.done = true;
      else if (kind === 'grubnak') { if (s < 0.7) { X('heave', true); q.oy -= Math.sin(s / 0.7 * Math.PI) * 5; } else if (s < 0.9) { const u = (s - 0.7) / 0.2; q.sy *= 0.9 + 0.1 * u; q.sx *= 1.08 - 0.08 * u; } }
      else if (kind === 'skitterra') { q.oy += introDrop(s); if (s < 1.2) X('rear', true); }
      else if (kind === 'volkar') { if (s < 0.3) q.alpha = 0; else { const u = Math.min(1, (s - 0.3) / 0.45); q.alpha = u; q.grow *= 1.25 - 0.25 * easeOut(u); if (s < 1.1) X('charge', true); } }
      else if (kind === 'hollowking') { if (s < 0.3) q.alpha = 0; else { const u = Math.min(1, (s - 0.3) / 1.3); q.alpha = easeOut(u); q.ghost = Math.max(q.ghost, 1 - u); if (s > 1.6 && s < 2.1) X('gaze', true); } }
      else if (kind === 'titan') { if (s < 0.3) q.alpha = 0; else { const u = Math.min(1, (s - 0.3) / 0.9); q.alpha = easeOut(u); q.grow *= 1.12 - 0.12 * easeOut(u); if (s < 1.6) X('howl', true); } }
      else if (kind === 'wyrm') { if (s < 0.3) q.alpha = 0; else { const u = Math.min(1, (s - 0.3) / 0.6); q.alpha = easeOut(u); q.grow *= 1.2 - 0.2 * easeOut(Math.min(1, (s - 0.3) / 1.2)); if (s < 1.5) X('roar', true); } }
      else if (kind === 'archmage') { if (s < 0.4) q.alpha = 0; else { const u = Math.min(1, (s - 0.4) / 1.0); q.alpha = easeOut(u); q.oy += (1 - easeOut(u)) * 50; q.grow *= 1.1 - 0.1 * easeOut(u); X('conv', s < 1.6); } }
      else if (kind === 'hydra') { if (s < 0.3) q.alpha = 0; else { const u = Math.min(1, (s - 0.3) / 0.9); q.alpha = easeOut(u); q.oy += (1 - easeOut(u)) * 40; if (s < 1.5) X('cry', true); } }
    }
    // the fall
    if (sh.death) {
      const s = t - sh.death.at;
      if (kind === 'grubnak') {
        if (s < 0.8) { q.rot = Math.sin(s * 9) * 0.12 * (s / 0.8); q.ox += Math.sin(s * 23) * 2; X('steam', true); }
        else { X('flat', true); const u = Math.min(1, (s - 0.8) / 0.25); q.sy *= 0.82 + 0.18 * easeOut(u); q.dark = Math.max(q.dark, 0.15 * Math.min(1, (s - 0.8) / 1.5)); }
      } else if (kind === 'skitterra') {
        if (s < 0.5) X('rear', true);
        X('fold', clamp((s - 0.3) / 1.3, 0, 1)); q.grow *= 1 - 0.08 * clamp((s - 0.3) / 1.3, 0, 1); q.dark = Math.max(q.dark, 0.3 * clamp((s - 0.6) / 1.6, 0, 1));
      } else if (kind === 'volkar') {
        if (s < 0.7) { q.ox += Math.sin(s * 47) * 3; X('charge', true); }
        else { const u = Math.min(1, (s - 0.7) / 1.5); X('disperse', u); q.alpha = 1 - easeOut(u); q.grow *= 1 + 0.15 * u; q.oy -= 40 * u; q.ghost = Math.max(q.ghost, u); }
      } else if (kind === 'titan') {
        const u = Math.min(1, s / 2.4);
        if (s < 1.0) { X('howl', true); q.ox += Math.sin(s * 29) * 2; } else q.alpha = 1 - easeOut(Math.min(1, (s - 1.0) / 1.6));
        q.grow *= 1 - 0.05 * u; q.dark = Math.max(q.dark, 0.45 * u);
      } else if (kind === 'wyrm') {
        const u = Math.min(1, s / 2.2);
        if (s < 0.9) { X('roar', true); q.ox += Math.sin(s * 31) * 2.5; } else q.alpha = 1 - easeOut(Math.min(1, (s - 0.9) / 1.5));
        q.grow *= 1 - 0.06 * u; q.dark = Math.max(q.dark, 0.55 * u);
      } else if (kind === 'archmage') {
        // the rings go dark one by one and he comes apart into bubbles, sinking
        const u = Math.min(1, s / 2.4);
        if (s < 1.0) { X('conv', true); q.ox += Math.sin(s * 33) * 2; } else q.alpha = 1 - easeOut(Math.min(1, (s - 1.0) / 1.6));
        q.oy += 26 * easeOut(u); q.grow *= 1 - 0.08 * u; q.dark = Math.max(q.dark, 0.4 * u);
      } else if (kind === 'hydra') {
        // she sinks back into the pool, the brass collar last, and the water goes still
        const u = Math.min(1, s / 2.4);
        X('dive', true); q.oy += 36 * easeOut(u); q.alpha = 1 - easeOut(Math.min(1, (s - 0.5) / 1.9)); q.grow *= 1 - 0.1 * u; q.dark = Math.max(q.dark, 0.35 * u);
      } else {
        const kneel = Math.min(1, s / 0.5); q.grow *= 1 - 0.07 * kneel; q.ox += s < 0.6 ? Math.sin(s * 37) * 1.5 : 0;
        if (s > 0.5) X('crownless', true);
        if (s > 0.6) { const u = Math.min(1, (s - 0.6) / 1.6); q.alpha = 1 - u; q.dark = Math.max(q.dark, 0.5 * u); }
      }
    }
    return q;
  }
  function drawBody(ctx, def, bd, o = {}) {
    const sh = SH(bd), t = clk(), kind = def.id, S = o.scale || 1.3;
    const q = bodyPose(kind, sh, t, o);
    const alpha = (o.alpha ?? 1) * q.alpha;
    sh.alpha = q.alpha;
    if (alpha <= 0.01) return;
    const st = q.extra ? Object.assign({}, bd.st, { props: Object.assign({}, bd.st.props, q.extra) }) : bd.st;
    const tint = o.tint || null, ghost = q.ghost, flash = q.flash, dark = q.dark;
    let rim = q.rim, rimA = q.rimA;
    if (!rim && tint) { rim = tint === 'frost' ? '#bfe8ff' : '#8fa8ff'; rimA = 0.55; }
    if (!rim && ghost > 0.02) { rim = (PAL_GHOST[kind] || '#e8f0ff'); rimA = 0.6 * ghost; }
    const x = bd.x + q.ox, y = bd.y + q.oy, gx = q.sx * q.grow, gy = q.sy * q.grow;
    // the cheap path: nothing to tint, he's drawn straight onto the scene
    if (flash < 0.02 && rimA < 0.02 && !tint && dark < 0.01 && ghost < 0.02) {
      ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); if (q.rot) ctx.rotate(q.rot); if (gx !== 1 || gy !== 1) ctx.scale(gx, gy);
      drawBoss(ctx, def, 0, 0, bd.f, st, S); ctx.restore(); return;
    }
    // otherwise into a small layer of his own, tinted there (source-atop keeps his own shape), then onto the scene
    const m = ctx.getTransform(), px = Math.min(Math.hypot(m.a, m.b) || 1, 1.5), N = Math.ceil(BOX * px);
    if (!layerCv) { layerCv = document.createElement('canvas'); silCv = document.createElement('canvas'); }
    if (layerCv.width !== N) { layerCv.width = layerCv.height = N; silCv.width = silCv.height = N; }
    const c = layerCv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, N, N);
    c.setTransform(px, 0, 0, px, N / 2, N / 2); if (q.rot) c.rotate(q.rot); c.scale(gx, gy);
    drawBoss(c, def, 0, 0, bd.f, st, S);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop';
    const fill = (col, a) => { if (a > 0.004) { c.globalAlpha = Math.min(1, a); c.fillStyle = col; c.fillRect(0, 0, N, N); } };
    if (tint === 'frost') { fill('#d8ecff', 0.45); fill('#6fa8e8', 0.12); }
    else if (tint === 'memory') { fill('#c8d4ff', 0.55); fill('#8fa8ff', 0.15); }
    fill('#000000', dark);
    if (ghost > 0.02) {
      // untargetable: washed pale, and a slow band of light sliding down him (a shimmer, not a blink)
      fill(PAL_GHOST[kind] || '#e8f0ff', 0.3 * ghost);
      const by = ((t * 0.45) % 1) * N * 1.4 - N * 0.2, g = c.createLinearGradient(0, by - N * 0.1, 0, by + N * 0.1);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalAlpha = 0.35 * ghost; c.fillStyle = g; c.fillRect(0, by - N * 0.1, N, N * 0.2);
    }
    fill('#ffffff', 0.55 * flash);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const X0 = x - BOX / 2, Y0 = y - BOX / 2;
    ctx.save();
    if (rim && rimA > 0.02) {
      // his outline: his silhouette in one colour, laid a few px out round him under the body
      const s = silCv.getContext('2d');
      s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1; s.clearRect(0, 0, N, N);
      s.drawImage(layerCv, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = rim; s.fillRect(0, 0, N, N);
      const r = 3;
      ctx.globalAlpha = alpha * Math.min(1, rimA) * 0.6;
      for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r], [-r * 0.7, -r * 0.7], [r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, r * 0.7]]) ctx.drawImage(silCv, X0 + dx, Y0 + dy, BOX, BOX);
    }
    ctx.globalAlpha = alpha * (ghost > 0.02 ? 1 - 0.35 * ghost : 1);
    ctx.drawImage(layerCv, X0, Y0, BOX, BOX);
    ctx.restore();
  }
  const PAL_GHOST = { grubnak: '#ffe8c8', skitterra: '#e8dcff', volkar: '#cfeeff', hollowking: '#c8ffd8', wyrm: '#ffd8b0', titan: '#e8f6ff' };
  PAL_GHOST.archmage = '#bff8f0';
  PAL_GHOST.hydra = '#c8ffd8';
  // how much of him is there (the hitbox ring fades with him: he's gone, falling or not yet come in)
  const presence = bd => (bd && bd.show ? bd.show.alpha : 1) * (bd && bd.show && bd.show.death ? Math.max(0, 1 - (clk() - bd.show.death.at) / 0.5) : 1);
  function setClock(fn) { clockFn = fn; }
  // ================================================================ [/boss presentation]

  return { timeStop, failed,propFx, stoveBurst, gazed, doomed, cure, knightMemory, knightRise, nightFall, polarityFlip, edgeClose, pulse, orbForm, orbHit, chain, meatballLand, meatballWall, meatballHit, scorchPool, silkSnap, silkFree, reelBite, snuff, hatch, threadShoot, threadSnap, floorFalls, impact, castStart, cocoonEnd, auto, leap, roar, addSpawn, addDeath, addEnrage, fury, spit, husk, tetherSnap, playerDeath, playerRaised, partyBuff, victory, wipe,
    // [boss presentation]
    drawBody, presence, bossHit, bossHp, enrageLand, behind, intro, bossDeath, setClock };
})();
