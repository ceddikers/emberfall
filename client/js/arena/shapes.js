// Telegraph shapes for boss mechanics. The host uses contains() to decide who got hit;
// every client uses the same data to draw the warning on the floor.
//
// shape: { kind: 'circle'|'donut'|'cone'|'rect'|'cross', x, y, r, r2, angle, arc, len, w }
//  circle: radius r around (x, y)
//  donut:  between r2 (inner, safe) and r (outer)
//  cone:   radius r, centered on angle, total width arc (radians)
//  rect:   starts at (x, y), goes len along angle, w wide (a line AoE / half-room cleave)
//  cross:  two rects through (x, y), len each way, w wide, rotated by angle

// Math.hypot(a, b) for two numbers, without the generic builtin's call cost (the bots and the host call it thousands of times a tick).
// It takes the steps V8's own Math.hypot takes: scale both by the larger magnitude, add the squares, root, scale back (V8 also keeps
// a Kahan compensation, which is exactly 0 after the first square). So it returns the same number bit for bit, and that is checked
// on a spread of inputs when this file loads: on an engine that does it differently, hypot2 is just Math.hypot and nothing changes.
function hypotSteps(a, b) {
  const x = Math.abs(a), y = Math.abs(b);
  if (x !== x || y !== y) return x === Infinity || y === Infinity ? Infinity : NaN;
  const max = x > y ? x : y;
  if (max === Infinity) return Infinity;
  if (max === 0) return 0;
  const p = x / max, q = y / max;
  return Math.sqrt(p * p + q * q) * max;
}
const hypot2 = (() => {
  let seed = 12345, ok = true;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const mags = [1, 1, 1, 1e-3, 1e3, 1e6, 1e-9, 1e12];
  for (let i = 0; i < 6000 && ok; i++) {
    const a = (next() - 0.5) * 2 * mags[i & 7], b = (next() - 0.5) * 2 * mags[(i >> 3) & 7];
    if (hypotSteps(a, b) !== Math.hypot(a, b)) ok = false;
  }
  for (const a of [0, -0, 1, -1, 5e-324, 1e300, Infinity, -Infinity, NaN]) for (const b of [0, -0, 1, -1, 5e-324, 1e300, Infinity, -Infinity, NaN]) if (!Object.is(hypotSteps(a, b), Math.hypot(a, b))) ok = false;
  return ok ? hypotSteps : Math.hypot;
})();

const SHAPES = {
  contains(s, px, py, pad = 0) {
    const dx = px - s.x, dy = py - s.y;
    switch (s.kind) {
      case 'circle': return dx * dx + dy * dy <= (s.r + pad) * (s.r + pad);
      case 'donut': {
        const d = hypot2(dx, dy);
        return d <= s.r + pad && d >= s.r2 - pad;
      }
      case 'cone': {
        const d = hypot2(dx, dy);
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
      // everywhere a blast from (x, y) reaches: all but the shadows behind the round props in s.covers ([[x, y, r], ...])
      case 'lit':
        return !(s.covers || []).some(([cx, cy, r]) => PROPS.blocks({ shape: 'circle', x: cx, y: cy, r }, s.x, s.y, px, py, PROPS.COVER_SHRINK - pad));
    }
    return false;
  },

  // Path the outline of a shape (for drawing).
  trace(ctx, s) {
    ctx.beginPath();
    switch (s.kind) {
      case 'lit': ctx.rect(-3000, -3000, 6000, 6000); break;
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
  grubnak: { kind: 'rect', hw: 520, hh: 360, corner: 40 },   // a cramped kitchen: the stove line along the top wall
  skitterra: { kind: 'poly', n: 8, r: 560 },
  volkar: { kind: 'circle', r: 540 },   // a storm-swept peak; in phase 2 its electrified edge closes in (resize)
  'volkar:storm': { kind: 'circle', r: 540 },   // ...Hard's second form: the same summit (its broken wedges kept by the script), a face in the clouds over the Storm Heart
  hollowking: { kind: 'rect', hw: 600, hh: 440, corner: 40 },   // a long burial hall, the throne against the top wall
  wyrm: { kind: 'circle', r: 560 },   // a volcanic crater; three scorched spots where he lands, the rim turns molten mid-fight
  archmage: { kind: 'circle', r: 540 },   // a drowned tower: seven circles of spellwork on the floor, four elemental sigils (archmage.js)
  hydra: { kind: 'circle', r: 540 },   // a flooded temple: nine columns in a ring, the Mother in the pool at its heart (hydra.js)
  titan: { kind: 'rect', hw: 500, hh: 400, corner: 40 },   // a glacier plateau: a 5 x 4 mosaic of ice sheets 200 across (titan.js), four braziers where four sheets meet
  corvane: { kind: 'rect', hw: 560, hh: 400, corner: 40 },   // a snowy mountain pass: the shrine against the top wall, six stone lanterns (corvane.js)
  brannoc: { kind: 'circle', r: 560 },   // a drowned colosseum: half-flooded sand, ghost stands, banners on the wall (brannoc.js)
  'brannoc:sea': { kind: 'circle', r: 480 },   // ...then a broken ring of stone in an open sea, the Tidewrought standing in the water at its north edge
  morrowoak: { kind: 'circle', r: 560 },   // a dead grove on the crater's rim, roots everywhere; the Hunger's holes are kept as f.floor (morrowoak.js)
  'morrowoak:remade': { kind: 'circle', r: 520 },
  'skitterra:moth': { kind: 'poly', n: 8, r: 560 },   // (Hard, after the Chrysalis: the same web cave, the Moth Queen's form; arena-view.js draws it as the cave until the art is painted)
  caelum: { kind: 'circle', r: 560 },   // the crater floor round the half-buried star, under the meteor's shadow (caelum.js)
  'caelum:sky': { kind: 'circle', r: 520 },   // ...then a circle of cloud above the falling meteor   // ...then the floating pieces of the grove over the dark, the holes still in them
};
let POLY_NORMALS = null;   // ARENA.sd's cos/sin of a 'poly' room's side normals, for the current side count
const ARENA = {
  kind: 'circle', r: 520, hw: 520, hh: 520, corner: 0, n: 0,
  R: 520,       // farthest point of the room from the centre (for "big enough" sizes)
  inner: 520,   // nearest wall to the centre (for "always inside" sizes)
  full: 520,    // a round room's radius before any closing in
  cuts: [],     // a round room's broken-off wedges: [{ a0, a1, r }] (Volkar's crumbling summit, Hard): inside a0..a1 the floor ends at r
  use(id) {
    const d = ARENA_DEFS[id] || { kind: 'circle', r: 520 };
    Object.assign(this, { kind: d.kind, r: d.r || 0, hw: d.hw || 0, hh: d.hh || 0, corner: d.corner || 0, n: d.n || 0, cuts: [] });
    if (d.kind === 'circle') { this.hw = this.hh = this.R = this.inner = this.full = d.r; }
    else if (d.kind === 'rect') { this.R = hypot2(d.hw, d.hh); this.inner = Math.min(d.hw, d.hh); }
    else { this.inner = d.r * Math.cos(Math.PI / d.n); this.R = d.r; this.hw = this.hh = this.inner; }
    return this;
  },
  // a round room whose wall moves mid-fight (Volkar's closing storm); use() puts it back to full size
  resize(r) {
    if (this.kind === 'circle') this.r = this.hw = this.hh = this.R = this.inner = r;
    return this;
  },
  // signed distance to the wall: negative inside, positive outside
  sd(x, y) {
    if (this.kind === 'rect') {
      const c = this.corner, qx = Math.abs(x) - (this.hw - c), qy = Math.abs(y) - (this.hh - c);
      return hypot2(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - c;
    }
    if (this.kind === 'poly') {
      // (the side normals' cos and sin, worked out once per side count: the same calls on the same angles as before)
      let tab = POLY_NORMALS;
      if (!tab || tab.n !== this.n) {
        tab = POLY_NORMALS = { n: this.n, c: [], s: [] };
        for (let i = 0; i < this.n; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / this.n; tab.c.push(Math.cos(a)); tab.s.push(Math.sin(a)); }
      }
      let m = -Infinity;
      for (let i = 0; i < this.n; i++) m = Math.max(m, x * tab.c[i] + y * tab.s[i]);
      return m - this.inner;
    }
    return hypot2(x, y) - (this.cuts.length ? this.radiusAt(Math.atan2(y, x)) : this.r);
  },
  // a round room's radius going out along angle a (less where a wedge has broken off)
  radiusAt(a) {
    let r = this.r;
    for (const c of this.cuts) {
      let d = a - c.a0;
      d -= Math.floor(d / (Math.PI * 2)) * Math.PI * 2;
      if (d <= c.a1 - c.a0) r = Math.min(r, c.r);
    }
    return r;
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
        const dx = p.x - cx, dy = p.y - cy, d = hypot2(dx, dy);
        if (d > c) { p.x = cx + dx / d * c; p.y = cy + dy / d * c; }
      }
    } else if (this.kind === 'poly') {
      for (let pass = 0; pass < 3; pass++) for (let i = 0; i < this.n; i++) {
        const a = Math.PI / 2 + i * Math.PI * 2 / this.n, nx = Math.cos(a), ny = Math.sin(a);
        const over = p.x * nx + p.y * ny - (this.inner - pad);
        if (over > 0) { p.x -= nx * over; p.y -= ny * over; }
      }
    } else {
      const d = hypot2(p.x, p.y), lim = Math.max(0, (this.cuts.length ? this.radiusAt(Math.atan2(p.y, p.x)) : this.r) - pad);
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
    } else if (this.cuts.length) {
      for (let i = 0; i < 180; i++) { const a = i * Math.PI / 90, r = this.radiusAt(a) + grow; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
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

// Arena props: things standing in the room that the boss uses and the party reads (Grubnak's casks, Skitterra's
// pillars, the Hollow King's braziers, coffin lids and fallen masonry, Volkar's standing stones and boulders).
//   { id, kind, shape: 'circle' | 'rect', x, y, r (circle) or w, h, a (rect: full width / height, turned by a),
//     hp, maxHp (hits it can take; 0 = never breaks), solid, cover, state }
// The host owns them (fight.js) and sends the whole list whenever one changes. Everyone moves, aims and draws with
// the same math below: the host for bots, adds and the boss, each client for its own hero.
const PROPS = {
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    return hypot2(px - ax - dx * t, py - ay - dy * t);
  },
  // a point in a rect prop's own frame
  local(pr, x, y) { const c = Math.cos(pr.a || 0), s = Math.sin(pr.a || 0), dx = x - pr.x, dy = y - pr.y; return [dx * c + dy * s, -dx * s + dy * c]; },
  // the rect's corners in the room
  corners(pr, grow = 0) {
    const c = Math.cos(pr.a || 0), s = Math.sin(pr.a || 0), hw = pr.w / 2 + grow, hh = pr.h / 2 + grow;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => [pr.x + u * c - v * s, pr.y + u * s + v * c]);
  },
  // signed distance from (x, y) to the prop's edge (negative inside)
  sd(pr, x, y) {
    if (pr.shape === 'rect') {
      const [lx, ly] = this.local(pr, x, y), qx = Math.abs(lx) - pr.w / 2, qy = Math.abs(ly) - pr.h / 2;
      return hypot2(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
    }
    return hypot2(x - pr.x, y - pr.y) - pr.r;
  },
  // the way out of the prop at (x, y)
  normal(pr, x, y) {
    if (pr.shape === 'rect') {
      const [lx, ly] = this.local(pr, x, y), c = Math.cos(pr.a || 0), s = Math.sin(pr.a || 0);
      const qx = Math.abs(lx) - pr.w / 2, qy = Math.abs(ly) - pr.h / 2;
      let u, v;
      if (qx > 0 && qy > 0) { const d = hypot2(qx, qy); u = Math.sign(lx) * qx / d; v = Math.sign(ly) * qy / d; }
      else if (qx > qy) { u = Math.sign(lx) || 1; v = 0; } else { u = 0; v = Math.sign(ly) || 1; }
      return [u * c - v * s, u * s + v * c];
    }
    const dx = x - pr.x, dy = y - pr.y, d = hypot2(dx, dy);
    return d > 0.01 ? [dx / d, dy / d] : [1, 0];
  },
  // push e ({ x, y }, changed in place) out of every solid prop, keeping rad clear of it. True if it moved.
  collide(e, list, rad = 14) {
    if (!list || !list.length) return false;
    let moved = false;
    for (let pass = 0; pass < 2; pass++) for (const pr of list) {
      if (!pr.solid) continue;
      const d = this.sd(pr, e.x, e.y);
      if (d >= rad) continue;
      const [nx, ny] = this.normal(pr, e.x, e.y);
      e.x += nx * (rad - d); e.y += ny * (rad - d); moved = true;
    }
    return moved;
  },
  // the first solid prop a circle of radius rad meets going from a to b: { t (0..1 along the way), prop }, or null
  ray(ax, ay, bx, by, list, rad = 0, filter) {
    let best = null;
    if (hypot2(bx - ax, by - ay) < 0.01) return null;
    for (const pr of list || []) {
      if (!pr.solid || (filter && !filter(pr))) continue;
      let t;
      if (pr.shape === 'rect') {
        const [x0, y0] = this.local(pr, ax, ay), [x1, y1] = this.local(pr, bx, by), hw = pr.w / 2 + rad, hh = pr.h / 2 + rad;
        if (Math.abs(x0) < hw && Math.abs(y0) < hh) continue;   // starting inside: collide() sorts that out
        let t0 = 0, t1 = 1, ok = true;
        for (const [p, d, h] of [[x0, x1 - x0, hw], [y0, y1 - y0, hh]]) {
          if (Math.abs(d) < 1e-9) { if (Math.abs(p) > h) { ok = false; break; } continue; }
          let ta = (-h - p) / d, tb = (h - p) / d;
          if (ta > tb) [ta, tb] = [tb, ta];
          t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
          if (t0 > t1) { ok = false; break; }
        }
        if (!ok) continue;
        t = t0;
      } else {
        const R = pr.r + rad, fx = ax - pr.x, fy = ay - pr.y, dx = bx - ax, dy = by - ay;
        const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - R * R;
        if (C < 0) continue;
        const disc = B * B - 4 * A * C;
        if (disc < 0) continue;
        t = (-B - Math.sqrt(disc)) / (2 * A);
        if (t < 0 || t > 1) continue;
      }
      if (!best || t < best.t) best = { t, prop: pr };
    }
    return best;
  },
  // a move from e toward `to` ({ x, y }, changed in place) stops short at the first solid prop; returns that prop
  clipMove(e, to, list, rad = 14) {
    const hit = this.ray(e.x, e.y, to.x, to.y, list, rad);
    if (!hit) return null;
    const t = Math.max(0, hit.t - 0.01);
    to.x = e.x + (to.x - e.x) * t; to.y = e.y + (to.y - e.y) * t;
    return hit.prop;
  },
  // does the line from a source (sx, sy) to (px, py) pass through the prop, at least `shrink` inside its edge?
  blocks(pr, sx, sy, px, py, shrink = 0) {
    if (pr.shape === 'rect') {
      const [x0, y0] = this.local(pr, sx, sy), [x1, y1] = this.local(pr, px, py), hw = pr.w / 2 - shrink, hh = pr.h / 2 - shrink;
      if (hw <= 0 || hh <= 0) return false;
      let t0 = 0, t1 = 1;
      for (const [p, d, h] of [[x0, x1 - x0, hw], [y0, y1 - y0, hh]]) {
        if (Math.abs(d) < 1e-9) { if (Math.abs(p) > h) return false; continue; }
        let ta = (-h - p) / d, tb = (h - p) / d;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) return false;
      }
      return true;
    }
    return this.segDist(pr.x, pr.y, sx, sy, px, py) <= pr.r - shrink;
  },
  // the cover prop (if any) that hides (px, py) from a blast at (sx, sy). shrink: how far inside the shadow's edge you
  // have to stand (a little, so a hero half in the light isn't counted safe)
  COVER_SHRINK: 6,
  shadowing(sx, sy, px, py, list, filter) {
    for (const pr of list || []) if (pr.cover && (!filter || filter(pr)) && this.blocks(pr, sx, sy, px, py, this.COVER_SHRINK)) return pr;
    return null;
  },
  // the shadow a prop casts away from a source, as a polygon reaching `far` out (for drawing it and for the bots)
  shadowPoly(sx, sy, pr, far = 2600) {
    const shrink = this.COVER_SHRINK, out = [];
    if (pr.shape === 'rect') {
      const cs = this.corners(pr, -shrink), base = Math.atan2(pr.y - sy, pr.x - sx);
      let lo = null, hi = null;
      for (const c of cs) {
        let d = Math.atan2(c[1] - sy, c[0] - sx) - base;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        if (!lo || d < lo.d) lo = { d, c }; if (!hi || d > hi.d) hi = { d, c };
      }
      out.push(lo.c, [sx + Math.cos(base + lo.d) * far, sy + Math.sin(base + lo.d) * far], [sx + Math.cos(base + hi.d) * far, sy + Math.sin(base + hi.d) * far], hi.c);
      return out;
    }
    const r = pr.r - shrink, dx = pr.x - sx, dy = pr.y - sy, d = hypot2(dx, dy);
    if (d <= r + 1) return null;
    const base = Math.atan2(dy, dx), b = Math.asin(r / d), tl = Math.sqrt(d * d - r * r);
    for (const s of [-1, 1]) out.push([sx + Math.cos(base + s * b) * tl, sy + Math.sin(base + s * b) * tl]);
    return [out[0], [sx + Math.cos(base - b) * far, sy + Math.sin(base - b) * far], [sx + Math.cos(base + b) * far, sy + Math.sin(base + b) * far], out[1]];
  },
  // a spot in the prop's shadow, `back` past its far edge, `side` (-1..1) across it (for the bots)
  shadowSpot(sx, sy, pr, back = 30, side = 0) {
    const base = Math.atan2(pr.y - sy, pr.x - sx), ext = pr.shape === 'rect' ? Math.min(pr.w, pr.h) / 2 : pr.r;
    const wide = pr.shape === 'rect' ? Math.max(pr.w, pr.h) / 2 : pr.r;
    const d = ext + back, px = -Math.sin(base), py = Math.cos(base), across = side * Math.max(0, wide - 18);
    return { x: pr.x + Math.cos(base) * d + px * across, y: pr.y + Math.sin(base) * d + py * across };
  },
  // does the walk a -> b (a circle of radius rad) run into this prop? Unlike ray(), a walker standing right at the prop's
  // edge (which is where collide() leaves it) still counts, so it can't be told the way is clear while pressed against it.
  // Returns how far along the walk (0..1) the prop is met, or null.
  walkHit(pr, a, b, rad) {
    const slack = 2;   // (collide() leaves the walker at `rad`; this much inside that still counts as outside)
    if (this.sd(pr, a.x, a.y) < rad - slack) return null;   // already inside: collide() sorts that out
    if (pr.shape === 'rect') {
      const [x0, y0] = this.local(pr, a.x, a.y), [x1, y1] = this.local(pr, b.x, b.y), hw = pr.w / 2 + rad - slack, hh = pr.h / 2 + rad - slack;
      let t0 = 0, t1 = 1;
      for (const [p, d, h] of [[x0, x1 - x0, hw], [y0, y1 - y0, hh]]) {
        if (Math.abs(d) < 1e-9) { if (Math.abs(p) > h) return null; continue; }
        let ta = (-h - p) / d, tb = (h - p) / d;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) return null;
      }
      return t0;
    }
    if (this.segDist(pr.x, pr.y, a.x, a.y, b.x, b.y) > pr.r + rad - slack) return null;
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    return l2 ? Math.max(0, Math.min(1, ((pr.x - a.x) * dx + (pr.y - a.y) * dy) / l2)) : 0;
  },
  // walking from `from` to `to` past solid props: the next point to head for. The first prop in the way gets a ring of
  // waypoints round it (a rect's corners, a circle's twelve points, all a little wider than the walker needs); the next
  // stop is the first one on the shortest way round, and it is worked out afresh each step, so a walker hugging the
  // prop's edge keeps going the same way round instead of stalling against it.
  steer(from, to, list, rad = 14) {
    let pr = null, bt = Infinity;
    for (const q of list || []) {
      if (!q.solid) continue;
      const t = this.walkHit(q, from, to, rad);
      if (t !== null && t < bt) { bt = t; pr = q; }
    }
    if (!pr) return to;
    // props standing close together (a walker needs 2 x rad between two): route round the whole group, not one prop at a time
    const near = this.cluster(pr, list, rad);
    if (near.length > 1) { const w = this.steerGroup(from, to, near, list, rad); if (w) return w; }
    const ring = [], m = rad + 8;
    if (pr.shape === 'rect') for (const c of this.corners(pr, m)) ring.push({ x: c[0], y: c[1] });
    else for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ring.push({ x: pr.x + Math.cos(a) * (pr.r + m) / Math.cos(Math.PI / 12), y: pr.y + Math.sin(a) * (pr.r + m) / Math.cos(Math.PI / 12) }); }
    // waypoints worth using: in the room, clear of every other prop, and not the one the walker is already standing on
    const ok = ring.map(w => ARENA.sd(w.x, w.y) <= -12 && hypot2(w.x - from.x, w.y - from.y) > 10 && !list.some(q => q !== pr && q.solid && this.sd(q, w.x, w.y) < rad));
    const n = ring.length, dist = new Array(n).fill(Infinity), first = new Array(n).fill(-1), done = new Array(n).fill(false);
    const free = (a, b) => this.walkHit(pr, a, b, rad) === null;   // (only this prop: a waypoint on the far side may still need a later re-steer)
    for (let i = 0; i < n; i++) if (ok[i] && free(from, ring[i])) { dist[i] = hypot2(ring[i].x - from.x, ring[i].y - from.y); first[i] = i; }
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      for (let v = 0; v < n; v++) if (!done[v] && ok[v] && free(ring[u], ring[v])) {
        const d = dist[u] + hypot2(ring[v].x - ring[u].x, ring[v].y - ring[u].y);
        if (d < dist[v]) { dist[v] = d; first[v] = first[u]; }
      }
    }
    let best = -1, bs = Infinity;
    for (let i = 0; i < n; i++) if (dist[i] < Infinity && free(ring[i], to)) { const s = dist[i] + hypot2(to.x - ring[i].x, to.y - ring[i].y); if (s < bs) { bs = s; best = i; } }
    if (best >= 0) return ring[first[best]];
    // no way round that the ring offers (walled in by the room's edge or other props): the old sidestep
    const dx = to.x - from.x, dy = to.y - from.y, L = hypot2(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, side = (pr.x - from.x) * nx + (pr.y - from.y) * ny > 0 ? -1 : 1;
    const ext = (pr.shape === 'rect' ? hypot2(pr.w, pr.h) / 2 : pr.r) + rad + 16;
    return { x: pr.x + nx * side * ext + dx / L * ext * 0.3, y: pr.y + ny * side * ext + dy / L * ext * 0.3 };
  },
  // the solid props that crowd in on `pr` (an edge-to-edge gap under a walker's width plus a little, chained)
  cluster(pr, list, rad = 14) {
    const size = q => (q.shape === 'rect' ? hypot2(q.w, q.h) / 2 : q.r), out = [pr];
    for (let grew = true; grew;) {
      grew = false;
      for (const q of list) if (q.solid && !out.includes(q) && out.some(c => hypot2(c.x - q.x, c.y - q.y) - size(c) - size(q) < 2 * rad + 14)) { out.push(q); grew = true; }
    }
    return out;
  },
  // steer() for a group of close props: waypoints round every prop of the group (and in the middle of any gap a walker can
  // squeeze through), joined wherever the walk is clear of ALL solid props; null if there is no way. The waypoint picked is
  // kept (from._wp) while it still leads somewhere, so a walker that has just come within reach of one does not turn back.
  steerGroup(from, to, group, list, rad = 14) {
    const size = q => (q.shape === 'rect' ? hypot2(q.w, q.h) / 2 : q.r), solid = list.filter(q => q.solid), ring = [], m = rad + 8;
    for (const c of group) {
      if (c.shape === 'rect') for (const k of this.corners(c, m)) ring.push({ x: k[0], y: k[1] });
      else for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ring.push({ x: c.x + Math.cos(a) * (c.r + m) / Math.cos(Math.PI / 12), y: c.y + Math.sin(a) * (c.r + m) / Math.cos(Math.PI / 12) }); }
    }
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {   // the middle of each gap a walker fits through
      const A = group[i], B = group[j], d = hypot2(A.x - B.x, A.y - B.y), gap = d - size(A) - size(B);
      if (gap >= 2 * (rad - 2) && gap < 2 * rad + 14) { const t = (size(A) + gap / 2) / d; ring.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, gap: true }); }
    }
    const ok = ring.map(w => ARENA.sd(w.x, w.y) <= -12 && hypot2(w.x - from.x, w.y - from.y) > 10 && !solid.some(q => this.sd(q, w.x, w.y) < (w.gap ? rad - 2.5 : rad)));
    const free = (a, b) => !solid.some(q => this.walkHit(q, a, b, rad) !== null);
    const n = ring.length, dist = new Array(n).fill(Infinity), first = new Array(n).fill(-1), done = new Array(n).fill(false);
    for (let i = 0; i < n; i++) if (ok[i] && free(from, ring[i])) { dist[i] = hypot2(ring[i].x - from.x, ring[i].y - from.y); first[i] = i; }
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      for (let v = 0; v < n; v++) if (!done[v] && ok[v] && free(ring[u], ring[v])) {
        const d = dist[u] + hypot2(ring[v].x - ring[u].x, ring[v].y - ring[u].y);
        if (d < dist[v]) { dist[v] = d; first[v] = first[u]; }
      }
    }
    let best = -1, bs = Infinity;
    for (let i = 0; i < n; i++) if (dist[i] < Infinity && free(ring[i], to)) { const s = dist[i] + hypot2(to.x - ring[i].x, to.y - ring[i].y); if (s < bs) { bs = s; best = i; } }
    if (best < 0) return null;
    let pick = ring[first[best]];
    const keep = from._wp;
    if (keep && keep.exp > (from._wpN || 0) && hypot2(keep.to.x - to.x, keep.to.y - to.y) < 60 && hypot2(keep.x - from.x, keep.y - from.y) > 6 && free(from, keep)) {
      const k = ring.findIndex(w => hypot2(w.x - keep.x, w.y - keep.y) < 1);
      if (k >= 0 && dist[k] < Infinity && dist[k] + hypot2(to.x - keep.x, to.y - keep.y) < bs + 40) pick = ring[k];
    }
    from._wpN = (from._wpN || 0) + 1;
    from._wp = { x: pick.x, y: pick.y, to: { x: to.x, y: to.y }, exp: from._wpN + 60 };
    return pick;
  },
  // compact form for the 'props' message: [id, kind, rect?, x, y, r | w, h, a, hp, maxHp, flags, state]
  pack(pr) {
    return [pr.id, pr.kind, pr.shape === 'rect' ? 1 : 0, Math.round(pr.x), Math.round(pr.y), Math.round(pr.shape === 'rect' ? pr.w : pr.r), Math.round(pr.h || 0),
      +(pr.a || 0).toFixed(3), pr.hp, pr.maxHp, (pr.solid ? 1 : 0) | (pr.cover ? 2 : 0), pr.state ?? 0];
  },
  unpack(a) {
    const rect = a[2] === 1;
    return { id: a[0], kind: a[1], shape: rect ? 'rect' : 'circle', x: a[3], y: a[4], r: rect ? 0 : a[5], w: rect ? a[5] : 0, h: a[6], a: a[7],
      hp: a[8], maxHp: a[9], solid: !!(a[10] & 1), cover: !!(a[10] & 2), state: a[11] };
  },
};

if (typeof module !== 'undefined') module.exports = { SHAPES, ARENA, ARENA_DEFS, PROPS, hypot2 };
