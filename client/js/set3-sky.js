// The Fallen Star over every set 3 room. One falling star hangs in the sky of all of set 3's rooms and grows boss by boss:
// a faint spark with a short tail over Corvane's pass (p = 0), bigger over the next rooms, filling the sky over Caelum, and in the
// finale it falls (p = 1). Each room's floor calls SET3_SKY.draw(c, x, y, p) into its static margin layer and SET3_SKY.life(ctx, x, y, p, t)
// from its ambient pass for the slow twinkle. Loaded after draw-util.js, before the room art.

const SET3_SKY = (() => {
  const k01 = p => (p < 0 ? 0 : p > 1 ? 1 : p);
  // how big the head and the tail are for how far through the set we are
  const size = p => { const k = k01(p); return { r: 2.4 + 72 * k * k, tail: 48 + 560 * k * k, glow: 14 + 220 * k * k, warm: k * k }; };
  const mixHex = (a, b, q) => {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join('');
  };
  // the head at (x, y) with its tail trailing off toward angle dir (radians; the tail is where it has been, so it points away
  // from where it is falling). c is a 2d context in the room's own coordinates.
  function draw(c, x, y, p, o = {}) {
    const S = size(p), dir = o.dir ?? -2.55, ux = Math.cos(dir), uy = Math.sin(dir), nx = -uy, ny = ux;
    const hot = mixHex('#e4f1ff', '#ffc27a', S.warm), mid = mixHex('#9ccbff', '#ff8a3a', S.warm);
    c.save();
    // the tail: a tapered streak that fades out
    const ex = x + ux * S.tail, ey = y + uy * S.tail, hw = S.r * 0.85;
    const g = c.createLinearGradient(x, y, ex, ey);
    g.addColorStop(0, rgba(hot, 0.85)); g.addColorStop(0.35, rgba(mid, 0.4)); g.addColorStop(1, rgba(mid, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x + nx * hw, y + ny * hw); c.lineTo(ex, ey); c.lineTo(x - nx * hw, y - ny * hw); c.closePath(); c.fill();
    // a thin second streak, off to one side
    const g2 = c.createLinearGradient(x, y, ex, ey);
    g2.addColorStop(0, rgba('#ffffff', 0.5)); g2.addColorStop(1, rgba('#ffffff', 0));
    c.strokeStyle = g2; c.lineWidth = Math.max(0.8, S.r * 0.3); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + nx * hw * 0.3, y + ny * hw * 0.3); c.lineTo(x + ux * S.tail * 0.7 + nx * hw * 0.5, y + uy * S.tail * 0.7 + ny * hw * 0.5); c.stroke();
    // the head
    glow(c, x, y, S.glow, mid, 0.5);
    glow(c, x, y, S.glow * 0.4, hot, 0.7);
    circle(c, x, y, S.r, hot);
    circle(c, x, y, S.r * 0.45, '#ffffff');
    c.restore();
  }
  // the slow twinkle, drawn every frame
  function life(ctx, x, y, p, t) {
    const S = size(p), q = 0.5 + 0.5 * Math.sin(t * 1.7 + x * 0.01);
    glow(ctx, x, y, S.glow * (0.5 + 0.12 * q), '#cfe6ff', 0.1 + 0.07 * q);
    if (S.r < 6) {   // a small one throws four faint points of light
      ctx.save(); ctx.globalAlpha = 0.25 + 0.3 * q; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9;
      const L = 7 + 5 * q;
      ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
      ctx.restore();
    }
  }
  return { draw, life, size };
})();
