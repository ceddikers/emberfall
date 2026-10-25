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
  const CAMP = { mince: [0.05, 0.028], ladle: [0.05, 0.026], lid: [0.06, 0.03], flop: [0.07, 0.034], charge: [0.04, 0.02], buster: [0.05, 0.024] };

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

  function impact(tg, msg, ctx, H) {
    const tag = tg.tag;
    try {
      const c = CAMP[tag]; if (c) cam(c[0], c[1]);
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
    if (anim === 'flambe') {
      // brandy slopped out of the bottle in amber drops, a blue-white lick flickering at its neck
      const pt = P(b, 'grubnak', 45, -46);
      emit(sh, dur, 0.35, () => { const q = pt(); VFX.spawn({ x: q.x + rand(-5, 5), y: q.y, z: 12, g: 360, life: 0.35, size: rand(5, 8), color: '#e0902a', kind: 'drop', add: false, rot: Math.PI / 2 }); });
      beat(sh, dur, 0.45, (p) => { const q = pt(); VFX.glint(q.x, q.y - 4, { z: 0, size: 14 + 14 * p, color: '#d8f0ff' }); });
    }
  }

  return { impact, prop, cast };
})();
