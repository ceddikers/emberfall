// Telegraph shapes for boss mechanics. The host uses contains() to decide who got hit;
// every client uses the same data to draw the warning on the floor.
//
// shape: { kind: 'circle'|'donut'|'cone'|'rect'|'cross', x, y, r, r2, angle, arc, len, w }
//  circle: radius r around (x, y)
//  donut:  between r2 (inner, safe) and r (outer)
//  cone:   radius r, centered on angle, total width arc (radians)
//  rect:   starts at (x, y), goes len along angle, w wide (a line AoE / half-room cleave)
//  cross:  two rects through (x, y), len each way, w wide, rotated by angle

const SHAPES = {
  contains(s, px, py, pad = 0) {
    const dx = px - s.x, dy = py - s.y;
    switch (s.kind) {
      case 'circle': return dx * dx + dy * dy <= (s.r + pad) * (s.r + pad);
      case 'donut': {
        const d = Math.hypot(dx, dy);
        return d <= s.r + pad && d >= s.r2 - pad;
      }
      case 'cone': {
        const d = Math.hypot(dx, dy);
        if (d > s.r + pad) return false;
        if (d < 1) return true;
        let a = Math.atan2(dy, dx) - s.angle;
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return Math.abs(a) <= s.arc / 2 + pad / Math.max(d, 1);
      }
      case 'rect': {
        const c = Math.cos(s.angle), sn = Math.sin(s.angle);
        const along = dx * c + dy * sn, across = -dx * sn + dy * c;
        return along >= -pad && along <= s.len + pad && Math.abs(across) <= s.w / 2 + pad;
      }
      case 'cross': {
        const c = Math.cos(s.angle), sn = Math.sin(s.angle);
        const a1 = dx * c + dy * sn, b1 = -dx * sn + dy * c;
        return (Math.abs(a1) <= s.len + pad && Math.abs(b1) <= s.w / 2 + pad) ||
               (Math.abs(b1) <= s.len + pad && Math.abs(a1) <= s.w / 2 + pad);
      }
    }
    return false;
  },

  // Path the outline of a shape (for drawing).
  trace(ctx, s) {
    ctx.beginPath();
    switch (s.kind) {
      case 'circle': ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); break;
      case 'donut':
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.moveTo(s.x + s.r2, s.y);
        ctx.arc(s.x, s.y, s.r2, 0, Math.PI * 2, true);
        break;
      case 'cone':
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, s.r, s.angle - s.arc / 2, s.angle + s.arc / 2);
        ctx.closePath();
        break;
      case 'rect': {
        const c = Math.cos(s.angle), sn = Math.sin(s.angle), hw = s.w / 2;
        ctx.moveTo(s.x - sn * hw, s.y + c * hw);
        ctx.lineTo(s.x + c * s.len - sn * hw, s.y + sn * s.len + c * hw);
        ctx.lineTo(s.x + c * s.len + sn * hw, s.y + sn * s.len - c * hw);
        ctx.lineTo(s.x + sn * hw, s.y - c * hw);
        ctx.closePath();
        break;
      }
      case 'cross': {
        for (const rot of [0, Math.PI / 2]) {
          const a = s.angle + rot, c = Math.cos(a), sn = Math.sin(a), hw = s.w / 2;
          ctx.moveTo(s.x - c * s.len - sn * hw, s.y - sn * s.len + c * hw);
          ctx.lineTo(s.x + c * s.len - sn * hw, s.y + sn * s.len + c * hw);
          ctx.lineTo(s.x + c * s.len + sn * hw, s.y + sn * s.len - c * hw);
          ctx.lineTo(s.x - c * s.len + sn * hw, s.y - sn * s.len - c * hw);
          ctx.closePath();
        }
        break;
      }
    }
  },
};

// The room a fight happens in. Each boss has its own: Grubnak's kitchen is a long rectangle, Skitterra's web
// an octagon strung between eight rock pillars; a boss without one fights in a circle. The room is always
// centred on (0, 0). The host clamps and checks positions with it, bots plan inside it and clients draw it.
//   kind 'circle': r
//   kind 'rect':   hw, hh (half width / height), corner (rounding)
//   kind 'poly':   n sides, r (centre to corner); one flat side always faces down
const ARENA_DEFS = {
  grubnak: { kind: 'rect', hw: 620, hh: 420, corner: 46 },
  skitterra: { kind: 'poly', n: 8, r: 560 },
};
const ARENA = {
  kind: 'circle', r: 520, hw: 520, hh: 520, corner: 0, n: 0,
  R: 520,       // farthest point of the room from the centre (for "big enough" sizes)
  inner: 520,   // nearest wall to the centre (for "always inside" sizes)
  use(id) {
    const d = ARENA_DEFS[id] || { kind: 'circle', r: 520 };
    Object.assign(this, { kind: d.kind, r: d.r || 0, hw: d.hw || 0, hh: d.hh || 0, corner: d.corner || 0, n: d.n || 0 });
    if (d.kind === 'circle') { this.hw = this.hh = this.R = this.inner = d.r; }
    else if (d.kind === 'rect') { this.R = Math.hypot(d.hw, d.hh); this.inner = Math.min(d.hw, d.hh); }
    else { this.inner = d.r * Math.cos(Math.PI / d.n); this.R = d.r; this.hw = this.hh = this.inner; }
    return this;
  },
  // signed distance to the wall: negative inside, positive outside
  sd(x, y) {
    if (this.kind === 'rect') {
      const c = this.corner, qx = Math.abs(x) - (this.hw - c), qy = Math.abs(y) - (this.hh - c);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - c;
    }
    if (this.kind === 'poly') {
      let m = -Infinity;
      for (let i = 0; i < this.n; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / this.n; m = Math.max(m, x * Math.cos(a) + y * Math.sin(a)); }
      return m - this.inner;
    }
    return Math.hypot(x, y) - this.r;
  },
  contains(x, y, pad = 0) { return this.sd(x, y) <= -pad; },
  // pull p ({x, y}, changed in place) back inside, at least pad from the wall
  clamp(p, pad = 0) {
    if (this.sd(p.x, p.y) <= -pad) return p;
    if (this.kind === 'rect') {
      const lx = Math.max(0, this.hw - pad), ly = Math.max(0, this.hh - pad), c = Math.max(0, this.corner - pad);
      p.x = Math.max(-lx, Math.min(lx, p.x)); p.y = Math.max(-ly, Math.min(ly, p.y));
      const cx = Math.sign(p.x) * (lx - c), cy = Math.sign(p.y) * (ly - c);
      if (c > 0 && Math.abs(p.x) > lx - c && Math.abs(p.y) > ly - c) {
        const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
        if (d > c) { p.x = cx + dx / d * c; p.y = cy + dy / d * c; }
      }
    } else if (this.kind === 'poly') {
      for (let pass = 0; pass < 3; pass++) for (let i = 0; i < this.n; i++) {
        const a = Math.PI / 2 + i * Math.PI * 2 / this.n, nx = Math.cos(a), ny = Math.sin(a);
        const over = p.x * nx + p.y * ny - (this.inner - pad);
        if (over > 0) { p.x -= nx * over; p.y -= ny * over; }
      }
    } else {
      const d = Math.hypot(p.x, p.y), lim = Math.max(0, this.r - pad);
      if (d > lim) { p.x *= lim / d; p.y *= lim / d; }
    }
    return p;
  },
  // distance from the centre to the wall going out along angle a
  edge(a) {
    const c = Math.cos(a), s = Math.sin(a);
    let lo = 0, hi = this.R + 2;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (this.sd(c * m, s * m) > 0) hi = m; else lo = m; }
    return lo;
  },
  // the room's outline, pushed out by grow (for clipping and drawing the rim)
  trace(ctx, grow = 0) {
    ctx.beginPath();
    if (this.kind === 'rect') {
      const w = this.hw + grow, h = this.hh + grow, c = Math.max(0, this.corner + grow);
      ctx.moveTo(-w + c, -h); ctx.arcTo(w, -h, w, h, c); ctx.arcTo(w, h, -w, h, c); ctx.arcTo(-w, h, -w, -h, c); ctx.arcTo(-w, -h, w, -h, c);
      ctx.closePath();
    } else if (this.kind === 'poly') {
      for (const [x, y] of this.corners(grow)) ctx.lineTo(x, y);
      ctx.closePath();
    } else ctx.arc(0, 0, this.r + grow, 0, Math.PI * 2);
  },
  // corners of a 'poly' room (grown outward by grow)
  corners(grow = 0) {
    const out = [], rr = this.r + grow / Math.cos(Math.PI / this.n);
    for (let i = 0; i < this.n; i++) { const a = Math.PI / 2 + Math.PI / this.n + i * Math.PI * 2 / this.n; out.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    return out;
  },
};

if (typeof module !== 'undefined') module.exports = { SHAPES, ARENA, ARENA_DEFS };
