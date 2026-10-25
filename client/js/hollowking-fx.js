// The Hollow King: what his blows feel like when they land. The floor tells (red
// damage, blue shares, grave-light inside the outline) are in boss-tells.js block K; the casting wind-ups and the other landings are
// in boss-vfx.js; this file is the beat on top of them, reached from boss-vfx.js impact() through HK_FX (every call guarded by
// `typeof HK_FX !== 'undefined'`, and it returns false for anything it only adds to, so the older landing still plays):
//   - a hit-stop and a push of the camera when one of his big swings lands (never more than once in a few seconds);
//   - the Sceptre Throw: the sceptre itself flies down the line, spinning, and bites into the far wall;
//   - the Barrow Stomp's second ring and the Sceptre Sweep's lingering crescent.

const HK_FX = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const S = { camAt: -99 };
  const base = tag => String(tag).replace(/^e(?=sweep|stomp|ring)/, '');

  // the camera holds for a beat when something big lands (main.js FX.cam); never more than once in a few seconds
  function cam(stop = 0.06, punch = 0.03, dur = 0.45, gap = 2.5) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }
  // the sceptre hurled: it spins down the line from his hand and sinks into the wall, the lane burning where it flew
  function throwFx(tg, H) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    let L = 0; while (L < s.len && ARENA.sd(s.x + ca * L, s.y + sa * L) < -6) L += 14;
    H.shapeFlash(s, '#ffe08a', { a: 0.3, dur: 0.45 });
    VFX.fx({ dur: 0.34, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(p), d = 40 + (L - 40) * q, x = s.x + ca * d, y = s.y + sa * d - 14, k = e.a * (1 - Math.max(0, p - 0.8) / 0.2);
      c.save();
      VFX.neonPath(c, '#ffe08a', 6 * (1 - p * 0.5), k * 0.8, () => { c.moveTo(s.x + ca * 30, s.y + sa * 30 - 14); c.lineTo(x, y); });
      c.translate(x, y); c.rotate(t * 22);
      c.globalAlpha = k; c.fillStyle = '#7a6a3a'; c.strokeStyle = '#1a1208'; c.lineWidth = 2.5;
      c.fillRect(-30, -4, 60, 8); c.strokeRect(-30, -4, 60, 8);
      c.fillStyle = '#ffd86a'; c.beginPath(); c.arc(28, 0, 10, 0, TAU); c.fill(); c.stroke();
      c.restore();
      VFX.glowAt(c, x, y, 40, '#ffe08a', 0.6 * k);
    } });
    const ex = s.x + ca * (L - 20), ey = s.y + sa * (L - 20);
    H.after(0.3, () => {
      VFX.hit(ex, ey, '#ffe08a', 1.6);
      H.shockAt(ex, ey, { r: 110, color: '#ffe08a', w: 6, dur: 0.45, flat: 1 });
      VFX.debris(ex, ey, { color: '#4a5054', n: 10, speed: 1.1 });
    });
    // the lane burns for a moment where it flew
    H.sweep(s, '#ffe08a', 0.3);
    try { H.AFT.gouge(s.x + ca * 70, s.y + sa * 70, s.x + ca * (L - 30), s.y + sa * (L - 30), { w: 20, dur: 5, heat: '#ffb83a', lip: '#14101c', ember: '#ffe08a', heatT: 3 }); } catch (e) { /* cosmetic */ }
    H.shake(7);
  }

  // the Sweep's crescent lingers a heartbeat after the blade, and the Stomp rings twice
  function sweepAfter(tg, H) {
    const s = tg.live;
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p);
      c.save(); ARENA.trace(c, 4); c.clip();
      for (const [r, w] of [[250, 7], [380, 5], [520, 3]]) {
        VFX.neonPath(c, '#fff2c0', w * (1 - p * 0.5), k * 0.7, () => { c.arc(s.x, s.y, r + p * 60, s.angle - s.arc / 2 * (1 - 0.1 * p), s.angle + s.arc / 2 * (1 - 0.1 * p)); });
      }
      c.restore();
    } });
  }
  function stompAfter(tg, H) {
    const s = tg.live;
    H.shockAt(s.x, s.y, { r: s.r * 1.5, color: '#4fe0d0', w: 6, dur: 0.7, flat: 1, delay: 0.14 });
    for (const q of H.scatter({ kind: 'circle', x: s.x, y: s.y, r: s.r }, 8)) H.after(rand(0, 0.25), () => VFX.pillar(q.x, q.y, { r: 12, h: 70 + rand(0, 40), color: '#4fe0d0', dur: 0.4 }));
  }

  function impact(tg, msg, ctx, H) {
    const tag = base(tg.tag), echo = tg.tag !== tag;
    if (tag === 'throw') { throwFx(tg, H); return true; }
    if (!echo) {
      if (tag === 'sweep') { sweepAfter(tg, H); cam(0.05, 0.026); }
      else if (tag === 'stomp') { stompAfter(tg, H); cam(0.07, 0.034); }
      else if (tag === 'ring') cam(0.05, 0.026);
      else if (tg.tag === 'knell') cam(0.08, 0.03, 0.5, 4);
    }
    return false;
  }

  return { impact };
})();
