// Grubnak: what his blows feel like when they land, and what gathers on him before they fall.
// The floor tells (crimson damage, blue shares) are in boss-tells.js block G; the older landings and the casting poses are in
// boss-vfx.js; this file is the beat on top of them, reached from boss-vfx.js through GR_FX (every call guarded by
// `typeof GR_FX !== 'undefined'`, and it only ever adds to the older landing, so the older one still plays):
//   - a hit-stop and a push of the camera when one of his big blows lands (never more than once in a few seconds);
//   - kitchen-flavoured landings on top: the cut line of a Mince throwing carrot, onion and tomato, the Ladle Spin flinging broth,
//     the Lid Slam ringing and rattling, the Belly Flop's second bounce, casks bursting into staves and a hoop, the charge's wind;
//   - the windups of the moves that had none (Mince, Ladle Spin, Lid Slam, Belly Flop, Larder Toss, Flambé): the ladle's broth
//     spinning outwards, the lid's tin glints drawn in, the brandy dripping.
// Nothing here changes who is hit.

const GR_FX = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const S = { camAt: -99 };
  // [hit-stop, camera push] of the blows that earn a held breath
  const CAMP = { mince: [0.05, 0.028], ladle: [0.05, 0.026], lid: [0.06, 0.03], flop: [0.07, 0.034], charge: [0.04, 0.02], buster: [0.05, 0.024], burp: [0.05, 0.026], spit: [0.04, 0.02], helping: [0.07, 0.034] };

  // the camera holds for a beat when something big lands (main.js FX.cam); never more than once in a few seconds
  function cam(stop = 0.06, punch = 0.03, dur = 0.45, gap = 2.5) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }

  // ---------------------------------------------------------------- what each blow adds when it lands
  // Mince: the cut line flashes white along the whole kitchen and throws what was on the board: carrot, onion, tomato
  function minceAfter(tg, H) {
    const s = tg.live, la = s.angle + Math.PI / 2, ca = Math.cos(la), sa = Math.sin(la);
    VFX.fx({ dur: 0.36, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p);
      c.save(); ARENA.trace(c, 4); c.clip();
      VFX.neonPath(c, '#ffd8a0', 9 * (1 - p * 0.5), k * 0.8, () => { c.moveTo(s.x - ca * 1400, s.y - sa * 1400); c.lineTo(s.x + ca * 1400, s.y + sa * 1400); });
      VFX.neonPath(c, '#ffffff', 3.5, k, () => { c.moveTo(s.x - ca * 1400, s.y - sa * 1400); c.lineTo(s.x + ca * 1400, s.y + sa * 1400); });
      c.restore();
    } });
    const bits = ['#e8903a', '#f0e6c0', '#c8382a', '#8ab04a'];
    for (let i = 0; i < 12; i++) {
      const d = rand(-ARENA.R, ARENA.R) * 0.9, x = s.x + ca * d, y = s.y + sa * d;
      if (ARENA.sd(x, y) > -20) continue;
      H.after(Math.abs(d) / 3000, () => VFX.debris(x, y, { color: bits[i % bits.length], n: 3, speed: 1.1, up: 1.4, size: 1.1 }));
    }
  }
  // Ladle Spin: broth flung out in a ring and falling in spots; a second ring following the first
  function ladleAfter(tg, H) {
    const s = tg.live;
    for (let i = 0; i < 20; i++) {
      const a = i * TAU / 20 + rand(-0.08, 0.08), sp = rand(150, 260);
      VFX.spawn({ x: s.x + Math.cos(a) * s.r * 0.5, y: s.y + Math.sin(a) * s.r * 0.5 * 0.7, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(80, 170), g: 520, life: rand(0.55, 0.85), size: rand(6, 10), color: i % 3 ? '#d8902a' : '#f0c060', kind: 'drop', add: false, rot: a + Math.PI / 2 });
    }
    H.shockAt(s.x, s.y, { r: s.r * 1.4, color: '#ffe8b0', w: 5, dur: 0.6, flat: 1, delay: 0.1 });
    H.after(0.14, () => H.shake(3));
  }
  // Lid Slam: tin ringing out of the red, glints skittering, and the lid rattling to rest a heartbeat later
  function lidAfter(tg, H) {
    const s = tg.live;
    for (const q of H.scatter(s, 9)) H.after(rand(0, 0.25), () => { VFX.glint(q.x, q.y - 4, { z: 6, size: 22, color: '#eef6ff' }); VFX.sparks(q.x, q.y, { color: '#ffffff', n: 3, speed: 320 }); });
    H.shockAt(s.x, s.y, { r0: s.r2, r: H.AR * 0.8, color: '#ffffff', w: 4, dur: 0.5, flat: 1, delay: 0.2 });
    H.after(0.16, () => H.shake(4));
    H.after(0.32, () => H.shake(2));
  }
  // Belly Flop: the second bounce, and pans clattering out of the shelves
  function flopAfter(tg, H) {
    const s = tg.live;
    H.shockAt(s.x, s.y, { r: s.r * 1.6, color: '#fff0d8', w: 6, dur: 0.55, flat: 1, delay: 0.22 });
    H.after(0.22, () => H.shake(5));
    VFX.debris(s.x, s.y, { color: '#cfd6dc', n: 8, speed: 1.5, up: 1.6, size: 1.3 });
  }
  // Butcher's Charge: the wind of it tearing down both sides of the lane
  function chargeAfter(tg, H) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), nx = -sa, ny = ca, L = Math.min(s.len, H.AR * 2.2);
    VFX.fx({ dur: 0.42, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p), head = L * easeOut(Math.min(1, p / 0.7)), tail = Math.max(0, head - 360);
      c.save(); ARENA.trace(c, 4); c.clip();
      for (const o of [-1, 1]) for (const w of [0.62, 0.95]) {
        const off = o * s.w * w;
        VFX.neonPath(c, '#f4e6cc', 3 * (1 - p * 0.5), k * 0.7, () => { c.moveTo(s.x + ca * tail + nx * off, s.y + sa * tail + ny * off - 8); c.lineTo(s.x + ca * head + nx * off, s.y + sa * head + ny * off - 8); });
      }
      c.restore();
    } });
  }
  // a cask bursting: staves flung, the iron hoop ringing off across the floor
  function caskAfter(tg, H) {
    const s = tg.live;
    VFX.debris(s.x, s.y, { color: '#a0703a', n: 12, speed: 1.4, up: 1.5, size: 1.3 });
    const a = rand(0, TAU);
    H.shockAt(s.x + Math.cos(a) * 40, s.y + Math.sin(a) * 28, { r: 38, color: '#b8bec4', w: 3, dur: 0.5, flat: 1, delay: 0.12 });
    H.shockAt(s.x + Math.cos(a) * 80, s.y + Math.sin(a) * 56, { r: 30, color: '#b8bec4', w: 2, dur: 0.4, flat: 1, delay: 0.3 });
  }
  // Flambé: the ignition runs the length of the stripe, white-gold
  function flambeAfter(tg, H) {
    const s = tg.live;
    H.streak(s.x, s.y, s.angle, '#fff2c0', { len: Math.min(s.len, H.AR * 2), w: Math.max(18, s.w * 0.3), dur: 0.3 });
  }
  // a plate coming up: a ding, a star glint on the cloche
  function plateAfter(tg, H) {
    const s = tg.live;
    VFX.glint(s.x, s.y - 10, { z: 58, size: 30, color: '#fff2c0' });
    H.shockAt(s.x, s.y, { r: s.r * 1.4, color: '#ffe08a', w: 3, dur: 0.4, flat: 1 });
  }

  // ---------------------------------------------------------------- the Gorged form (Hard, Dessert)
  // Clean Plate: the room goes into his mouth (roomev 'inhale': a vortex of air and crumbs, the casks and the pot trembling and leaning
  // toward him, then each thing gulped down: propfx 'eaten' for a prop, the list in the event for grease, puddles and rubble), and the
  // swell (roomev 'form' with form 'gorged': a shake, a burst, buttons flying). Second Helping reuses the vortex (the same event with
  // again: 1). Spit Up is a lump flying out of his mouth (boss-tells.js spit) with a thud at the landing and a puff of dust where the cask
  // settles (propfx 'spat'); Sour Burp is a green fog down its cone and acid on the floor (the 'sour' puddles, puddle() below).
  // S.bd / S.h: the boss's draw state and boss-vfx.js's helpers, kept from the last 'inhale' or 'form' event for the prop events
  const lerp = (a, b, q) => a + (b - a) * q;
  const mouthOf = (bd, h) => h.onBody(bd, 'grubnak', 40, 0);
  // props near him lean toward his mouth and tremble as the breath builds (arena-view.js drawProp calls this)
  function lean(pr, ev, t) {
    const q = clamp((t - ev.start) / Math.max(0.1, ev.dur), 0, 1), amp = q * q, D = Math.hypot(ev.x - pr.x, ev.y - pr.y) || 1, pull = Math.min(34, D * 0.07) * amp, id = pr.id || 1;
    return { dx: (ev.x - pr.x) / D * pull + Math.sin(t * 41 + id) * 2.4 * amp, dy: (ev.y - pr.y) / D * pull + Math.cos(t * 37 + id) * 1.6 * amp, rot: Math.sin(t * 23 + id * 2) * 0.14 * amp };
  }
  // a thing flying into his mouth: it arcs up, spins, shrinks and is gulped (kind: cask, pot, grease, puddle, rubble)
  function fly(h, bd, o) {
    const sx = o.x, sy = o.y, dur = 0.55, r = o.r || 40, spin = rand(6, 11) * (Math.random() < 0.5 ? -1 : 1);
    VFX.fx({ dur, delay: o.delay || 0, layer: 'air', draw: (c, p, t, e) => {
      const m = mouthOf(bd, h), pos = q => { const u = Math.pow(q, 1.7); return { x: lerp(sx, m.x, u), y: lerp(sy, m.y - 24, u) - Math.sin(u * Math.PI) * 60, u }; };
      const a = pos(p), b = pos(Math.max(0, p - 0.2)), sc = 1 - 0.6 * a.u, k = e.a;
      c.save(); c.globalAlpha = k; c.lineCap = 'round';
      c.strokeStyle = o.kind === 'grease' || o.kind === 'puddle' ? 'rgba(120,76,24,0.55)' : 'rgba(255,246,224,0.5)'; c.lineWidth = Math.max(2, r * 0.4 * sc);
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(a.x, a.y); c.stroke();
      c.translate(a.x, a.y); c.rotate(p * spin); c.scale(sc, sc);
      if (o.kind === 'cask') { rrect(c, -22, -16, 44, 32, 9, '#9a6a36', OUT, 2.5); line(c, -12, -16, -12, 16, '#3a3a42', 3); line(c, 12, -16, 12, 16, '#3a3a42', 3); }
      else if (o.kind === 'pot') { circle(c, 0, 0, 34, '#9aa2ab', OUT, 3); circle(c, 0, 0, 26, '#5a3a20', OUT, 1.5); for (const sy of [-1, 1]) rrect(c, -6, sy * 36 - 3, 12, 6, 3, '#4a4e54', OUT, 2); }
      else if (o.kind === 'rubble') { for (const [x, y, s] of [[-8, -4, 8], [7, 5, 6], [2, -9, 5]]) poly(c, [x - s, y, x, y - s, x + s, y + s * 0.4, x - s * 0.3, y + s], '#8a8078', OUT, 1.5); }
      else { const w = Math.min(r, 70); ellipse(c, 0, 0, w * 0.8, w * 0.5, 0, '#6a4416', OUT, 2); ellipse(c, -w * 0.2, -w * 0.12, w * 0.4, w * 0.12, -0.3, 'rgba(255,232,170,0.5)'); }
      c.restore();
    }, done: () => gulp(h, bd, o.kind) });
  }
  // a thing goes down: a ring at the mouth, crumbs, his belly gives a heave (bd.st.gulp, read by bosses.js)
  function gulp(h, bd, kind) {
    const m = mouthOf(bd, h);
    h.shockAt(m.x, m.y, { r: 46, color: '#ffe8c0', w: 3, dur: 0.3, flat: 0.6 });
    VFX.spawn({ x: m.x, y: m.y, z: 24, size: 30, size1: 4, life: 0.24, color: '#fff2d0', kind: 'glow' });
    if (bd.st) bd.st.gulp = bd.st.t;
    if (kind === 'cask' || kind === 'pot') h.shake(2);
  }
  // the vortex: pale arms of dust winding in over the floor, crumbs and wind-streaks racing for his mouth, thickening to the end
  function vortex(bd, dur, h) {
    const arms = 5, ph = rand(0, TAU), R0 = 540;
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.16) * Math.min(1, (1 - p) / 0.08), m = mouthOf(bd, h), spin = ph - t * (2.4 + p * 5), R = R0 - 300 * easeOut(p);
      c.save(); c.translate(m.x, m.y + 22); c.scale(1, 0.6); c.lineCap = 'round'; c.lineJoin = 'round';
      const g = c.createRadialGradient(0, 0, 8, 0, 0, R * 0.7); g.addColorStop(0, rgba('#1a0c06', 0.55 * k * p)); g.addColorStop(1, rgba('#1a0c06', 0));
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 0.7, 0, TAU); c.fill();
      for (let i = 0; i < arms; i++) for (const [off, w, col, al] of [[0, 26, '#4a3420', 0.3], [0.03, 15, '#a88c5a', 0.4], [0.07, 7, '#e8d8b0', 0.65], [0.1, 2.5, '#ffffff', 0.9]]) {
        c.beginPath();
        for (let q = 0; q <= 1.0001; q += 0.05) { const a = spin + i * TAU / arms + q * 3.2 + off, r = R * (1 - q * 0.88); q ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.strokeStyle = rgba(col, al * k); c.lineWidth = w; c.stroke();
      }
      c.restore();
      VFX.glowAt(c, m.x, m.y - 20, 70 + 70 * p, '#ffe8b8', k * (0.16 + 0.3 * p));
    }, tick: (p) => {
      const m = mouthOf(bd, h);
      for (let n = 0; n < 1 + Math.floor(p * 2); n++) {
        const a = rand(0, TAU), r = rand(240, 520), x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r * 0.6, life = rand(0.5, 0.8) * (1.1 - p * 0.3), tang = 0.9;
        VFX.spawn({ x, y, z: rand(6, 34), vx: ((m.x - x) - Math.sin(a) * r * tang * 0.5) / life, vy: ((m.y - y) + Math.cos(a) * r * 0.6 * tang * 0.5) / life, vz: rand(-10, 30), life, size: rand(4, 8), size1: 2,
          color: ['#d8b070', '#fff0c8', '#b07a28', '#8aa83a', '#b83a2a', '#f4ead0'][Math.floor(Math.random() * 6)], kind: Math.random() < 0.5 ? 'shard' : 'drop', add: false, rot: a, vr: rand(-9, 9), drag: 0.01 });
      }
      if (Math.random() < 0.55) { const a = rand(0, TAU), r = rand(260, 560), x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r * 0.6; VFX.spawn({ x, y, z: 12, vx: (m.x - x) * 2.6, vy: (m.y - y) * 2.6, vz: 0, life: 0.38, size: 22, color: '#fff6e0', stretch: 5, add: false, a: 0.5 }); }
    } });
    let n = 0;
    const beat = VFX.fx({ dur, layer: 'ground', draw() {}, tick: (p) => { const k = Math.floor(p * dur / 0.45); if (k > n) { n = k; h.shake(1 + 3.5 * p); } } });
    void beat;
  }
  function inhale(msg, bd, h) {
    S.bd = bd; S.h = h; S.inh = { x: msg.x, y: msg.y, start: nowS(), dur: msg.dur };
    vortex(bd, msg.dur, h);
    let i = 0;   // (grease, puddles and rubble have no event of their own: they go in as the props do, 0.6 s before the cast ends)
    for (const [kind, x, y, r] of msg.things || []) if (kind === 'grease' || kind === 'puddle' || kind === 'rubble') fly(h, bd, { kind, x, y, r, delay: Math.max(0, msg.dur - 0.6) + (i++ % 6) * 0.04 });
  }
  // the swell: past the size he'll be, then settled; the room shakes, a ring of dust goes out, buttons fly, crumbs drop off him
  function swell(bd, h) {
    S.bd = bd;
    cam(0.09, 0.05, 0.6, 0);
    h.shake(15);
    for (let i = 0; i < 3; i++) h.shockAt(bd.x, bd.y, { r: 300 + i * 170, color: i ? '#ffe8c0' : '#ffffff', w: 8 - i * 2, dur: 0.75, flat: 1, delay: i * 0.1 });
    VFX.burst(bd.x, bd.y - 44, { color: '#ffe0a0', color2: '#ffffff', n: 30, speed: 420, size: 13 });
    VFX.debris(bd.x, bd.y, { color: '#e0b070', n: 18, speed: 2.2, up: 1.9, size: 1.5 });
    VFX.smoke(bd.x, bd.y, { color: '#e8dcc0', n: 8, size: 46, a: 0.6, speed: 110 });
    for (let i = 0; i < 6; i++) { const a = rand(0, TAU), sp = rand(150, 300); VFX.spawn({ x: bd.x, y: bd.y, z: 50, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(180, 340), g: 640, life: 1, size: 9, color: '#b33a2a', kind: 'shard', add: false, vr: rand(-14, 14), rot: a }); }
    if (h.flash) h.flash('#fff2d8', 0.3, 0.5);
  }
  // acid on the floor (Sour Burp's pools, pud tag 'sour'): a yellow-green slick, bubbling, a red rim, a fume rising off it
  function puddle(ctx, p, r, k, t) {
    glow(ctx, p.x, p.y, r * 1.3, '#c8e030', 0.17 * k);
    ctx.save(); ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, '#dcec54'); g.addColorStop(0.55, '#8aa81e'); g.addColorStop(1, '#3a5210');
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const a = i * TAU / 20, w = 1 + Math.sin(a * 3 + p.id) * 0.07 + Math.sin(a * 6 + t * 2) * 0.035, x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba((typeof BossTells !== 'undefined' && BossTells.COL.danger) || '#ff1f5c', 0.85); ctx.lineWidth = 2.5; ctx.stroke();
    for (let i = 0; i < 5; i++) { const q = (t * 0.8 + i / 5 + p.id * 0.17) % 1, a = i * 1.7 + p.id; circle(ctx, p.x + Math.cos(a) * r * 0.55, p.y + Math.sin(a) * r * 0.5, 2 + q * 7, null, `rgba(250,255,170,${0.75 * (1 - q)})`, 1.6); }
    for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3 + p.id * 0.11) % 1; circle(ctx, p.x + Math.sin(i * 2 + p.id) * r * 0.4, p.y - q * 34, 6 + q * 12, `rgba(225,245,150,${0.22 * (1 - q)})`); }
    ellipse(ctx, p.x - r * 0.3, p.y - r * 0.3, r * 0.3, r * 0.07, -0.3, 'rgba(255,255,220,0.4)');
    ctx.restore();
  }
  // Sour Burp landing: a gust down the cone and a splash of acid at each pool
  function burpAfter(tg, H) {
    const s = tg.live;
    H.streak(s.x, s.y, s.angle, '#e8f4a0', { len: Math.min(s.r, H.AR * 2), w: 90, dur: 0.4 });
    for (const d of [300, 520, 740]) { const x = s.x + Math.cos(s.angle) * d, y = s.y + Math.sin(s.angle) * d; if (ARENA.sd(x, y) > -10) continue; H.after(d / 2400, () => { VFX.debris(x, y, { color: '#c8e040', n: 6, speed: 1.1, up: 1.3, size: 1 }); H.shockAt(x, y, { r: 70, color: '#f0f8a0', w: 3, dur: 0.4, flat: 0.8 }); }); }
  }
  // Spit Up landing: the lump hits the floor with a wet thud, gravy flung out of it
  function spitAfter(tg, H) {
    const s = tg.live;
    H.shockAt(s.x, s.y, { r: 120, color: '#eef0a8', w: 5, dur: 0.45, flat: 1 });
    VFX.debris(s.x, s.y, { color: '#7a5a2c', n: 9, speed: 1.3, up: 1.4, size: 1.2 });
    for (let i = 0; i < 10; i++) { const a = rand(0, TAU), sp = rand(80, 220); VFX.spawn({ x: s.x, y: s.y, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(60, 160), g: 520, life: rand(0.4, 0.7), size: rand(5, 9), color: i % 2 ? '#a8b860' : '#7a6a30', kind: 'drop', add: false, rot: a }); }
    H.shake(3);
  }
  // Second Helping landing: the belly-blast, a heavy ring and the dust of everything the breath had gathered flung back out
  function helpingAfter(tg, H) {
    const s = tg.live;
    for (let i = 0; i < 2; i++) H.shockAt(s.x, s.y, { r: s.r * (1.1 + i * 0.35), color: i ? '#ffe8c0' : '#ffffff', w: 9 - i * 3, dur: 0.65, flat: 1, delay: i * 0.1 });
    VFX.debris(s.x, s.y, { color: '#e0b070', n: 14, speed: 2, up: 1.8, size: 1.4 });
    VFX.smoke(s.x, s.y, { color: '#e8dcc0', n: 6, size: 44, a: 0.55, speed: 100 });
    H.after(0.1, () => H.shake(9));
  }

  function impact(tg, msg, ctx, H) {
    const tag = tg.tag;
    try {
      const c = CAMP[tag]; if (c) cam(c[0], c[1]);
      if (tag === 'burp') burpAfter(tg, H);
      else if (tag === 'spit') spitAfter(tg, H);
      else if (tag === 'helping') helpingAfter(tg, H);
      if (tag === 'mince') minceAfter(tg, H);
      else if (tag === 'ladle') ladleAfter(tg, H);
      else if (tag === 'lid') lidAfter(tg, H);
      else if (tag === 'flop') flopAfter(tg, H);
      else if (tag === 'charge') chargeAfter(tg, H);
      else if (tag === 'cask') caskAfter(tg, H);
      else if (tag === 'flambe') flambeAfter(tg, H);
      else if (tag === 'plate') plateAfter(tg, H);
    } catch (e) { /* cosmetic */ }
    return false;
  }

  // the charge ending against a wall, the pot or a cask: a harder hold than the run itself
  function prop(msg, H) {
    try {
      // the Gorged form: a prop gulped down (flies in from where it stood), a cask settling where a lump landed
      if (msg.k === 'eaten' && S.bd && S.h) {
        const t = nowS(); if (t - (S.eatT || -9) > 0.3) S.eatN = 0; S.eatT = t;
        const o = S.inh ? lean(msg, S.inh, t) : { dx: 0, dy: 0 };
        fly(S.h, S.bd, { kind: msg.kind, x: msg.x + o.dx, y: msg.y + o.dy, r: msg.r, delay: (S.eatN++) * 0.06 });
        return false;
      }
      if (msg.k === 'spat') { H.shockAt(msg.x, msg.y, { r: 60, color: '#e8dcc0', w: 3, dur: 0.4, flat: 0.8 }); VFX.smoke(msg.x, msg.y, { color: '#d8c4a4', n: 3, size: 26, a: 0.5, speed: 40 }); VFX.glint(msg.x, msg.y - 30, { z: 0, size: 18, color: '#f4ffc8' }); return false; }
    } catch (e) { /* cosmetic */ }
    try { if (msg.k === 'slam' && msg.boss) { cam(0.07, 0.036, 0.5, 1.2); H.shockAt(msg.x, msg.y, { r: 120, color: '#fff0d8', w: 5, dur: 0.5, flat: 1, delay: 0.1 }); } } catch (e) { /* cosmetic */ }
    return false;
  }

  // ---------------------------------------------------------------- windups of the moves that had none
  // h: boss-vfx.js's drawIn, emit, beat, P (a point on his body), own, soon, shockAt and his existing CAST_FX table
  function cast(sh, b, dur, anim, name, h) {
    const { drawIn, emit, beat, P, own, soon, shockAt, CAST_FX } = h;
    if (anim === 'mince' || anim === 'throw') { if (CAST_FX.cleaver) CAST_FX.cleaver(sh, b, dur); return; }
    if (anim === 'meatballs') { if (CAST_FX.hunk) CAST_FX.hunk(sh, b, dur); return; }
    if (anim === 'ladle') {
      // the broth stirred round him faster and wider, droplets slung off the spoon
      own(sh, VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.15) * 0.8, spin = t * (3 + p * 11);
        c.save();
        for (let i = 0; i < 3; i++) {
          const a0 = spin + i * TAU / 3, r = 54 + 120 * easeOut(p) + i * 6;
          VFX.neonPath(c, '#ffc070', 2.5 + p * 2, k * (0.45 + 0.4 * p), () => { c.ellipse(b.x, b.y - 10, r, r * 0.55, 0, a0, a0 + 1.1 + p); });
        }
        c.restore();
      } }));
      const pt = P(b, 'grubnak', 39, -50);
      emit(sh, dur, 0.5, (p) => { const q = pt(), a = rand(0, TAU); VFX.spawn({ x: q.x, y: q.y, z: 14, vx: Math.cos(a) * rand(80, 170), vy: Math.sin(a) * rand(60, 120), vz: rand(30, 90), g: 360, life: 0.5, size: rand(4, 7), color: '#e0a040', kind: 'drop', add: false, rot: a }); });
      return;
    }
    if (anim === 'lid') {
      // the opposite pull: tin glints drawn in toward him from the rim of the room, faster as it nears
      drawIn(sh, dur, () => ({ x: b.x, y: b.y - 10 }), { color: '#cfe0ff', color2: '#ffffff', r: 230, rate: 0.55, gr: 44, size: 0.9 });
      beat(sh, dur, 0.5, () => { VFX.glint(b.x + rand(-40, 40), b.y - 70, { z: 10, size: 20, color: '#eef6ff' }); });
      return;
    }
    if (anim === 'flop') {
      // he sinks to gather himself: dust pushed out under his feet, a little heavier each beat
      drawIn(sh, dur, () => ({ x: b.x, y: b.y + 10 }), { color: '#d8c4a4', color2: '#ffffff', r: 150, rate: 0.4, gr: 50, glow: false });
      let n = 0;
      beat(sh, dur, 0.45, (p) => { n++; shockAt(b.x, b.y + 10, { r: 70 + 50 * p, color: '#e8d8c0', w: 3 + n, dur: 0.35, flat: 0.6 }); VFX.debris(b.x, b.y, { color: '#c9b48e', n: 2 + n, speed: 0.6, size: 0.7 }); });
      return;
    }
    if (anim === 'larder') {
      // casks ripped off the side shelves: a thump and a puff of dust at each wall on every beat
      beat(sh, dur, 0.7, () => {
        for (const sg of [-1, 1]) { const x = sg * (ARENA.hw - 50), y = rand(-ARENA.hh * 0.6, ARENA.hh * 0.6); shockAt(x, y, { r: 50, color: '#d8c4a4', w: 3, dur: 0.3, flat: 0.6 }); VFX.smoke(x, y, { color: '#c8a878', n: 3, size: 28, a: 0.5, speed: 50 }); VFX.debris(x, y - 20, { color: '#8a5a2e', n: 2, speed: 0.7, size: 0.8 }); }
      });
      return;
    }
    if (anim === 'inhale') return;   // (the vortex comes with the room's 'inhale' event: room())
    if (anim === 'spitup') {
      // the lumps chewed round in his cheeks: bits drawn in to his mouth, a drool of gravy, a heave on every beat
      const pt = P(b, 'grubnak', 40, 0);
      drawIn(sh, dur, pt, { color: '#a88a50', color2: '#e8d8a0', r: 90, rate: 0.5, gr: 34, size: 0.9 });
      emit(sh, dur, 0.3, () => { const q = pt(); VFX.spawn({ x: q.x, y: q.y, z: 20, vx: rand(-6, 6), vy: rand(10, 30), vz: 0, g: 300, life: 0.5, size: rand(4, 7), color: '#8a7a3a', kind: 'drop', add: false, rot: Math.PI / 2 }); });
      beat(sh, dur, 0.5, () => { const q = pt(); shockAt(q.x, q.y, { r: 50, color: '#d8c890', w: 3, dur: 0.3, flat: 0.6 }); });
      return;
    }
    if (anim === 'burp') {
      // a rumble in the gut and a green fog gathering at his mouth, bubbles rising off it
      const pt = P(b, 'grubnak', 40, 0);
      drawIn(sh, dur, pt, { color: '#b8d83a', color2: '#f0f8a0', r: 110, rate: 0.5, gr: 40, size: 1 });
      emit(sh, dur, 0.4, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-8, 8), y: q.y + rand(-4, 4), z: 24, vx: rand(-10, 10), vy: rand(-10, 10), vz: rand(20, 50), drag: 0.03, life: rand(0.6, 0.9), size: rand(9, 15), size1: 26, color: '#b8d040', kind: 'smoke', add: false, a: 0.4 }); });
      beat(sh, dur, 0.45, (p) => { const q = pt(); shockAt(q.x, q.y, { r: 40 + 30 * p, color: '#d8ec70', w: 3, dur: 0.3, flat: 0.6 }); });
      return;
    }
    if (anim === 'flambe') {
      // brandy slopped out of the bottle in amber drops, a blue-white lick flickering at its neck
      const pt = P(b, 'grubnak', 45, -46);
      emit(sh, dur, 0.35, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-5, 5), y: q.y, z: 12, g: 360, life: 0.35, size: rand(5, 8), color: '#e0902a', kind: 'drop', add: false, rot: Math.PI / 2 }); });
      beat(sh, dur, 0.45, (p) => { const q = pt(); VFX.glint(q.x, q.y - 4, { z: 0, size: 14 + 14 * p, color: '#d8f0ff' }); });
    }
  }

  // roomev from the host (main.js): the Gorged form's inhale and swell; h is boss-vfx.js's onBody, shockAt, shake and flash
  function room(msg, bd, h) { try { if (msg.k === 'inhale') inhale(msg, bd, h); else if (msg.k === 'form' && msg.form === 'gorged') swell(bd, h); } catch (e) { /* cosmetic */ } }

  return { impact, prop, cast, room, lean, puddle };
})();
