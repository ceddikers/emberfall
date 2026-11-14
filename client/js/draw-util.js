// Small canvas helpers shared by all the code-drawn art.

const TAU = Math.PI * 2;
const OUT = '#1a1622'; // outline color used by every sprite

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function easeOut(t) { return 1 - (1 - t) * (1 - t); }

// (colour helpers run thousands of times a frame: parsed colours and shades are remembered, a few hundred at most)
const _rgbCache = new Map(), _shadeCache = new Map();
function hexToRgb(hex) {
  let v = _rgbCache.get(hex);
  if (v) return v;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  if (_rgbCache.size > 512) _rgbCache.clear();
  _rgbCache.set(hex, v);
  return v;
}
function rgba(hex, a) {
  const v = hexToRgb(hex);
  return `rgba(${v[0]},${v[1]},${v[2]},${a < 0 ? 0 : a > 1 ? 1 : a})`;
}
// amt > 0 lightens toward white, amt < 0 darkens toward black
function shade(hex, amt) {
  const key = hex + amt;
  let s = _shadeCache.get(key);
  if (s) return s;
  let [r, g, b] = hexToRgb(hex);
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  s = `rgb(${r | 0},${g | 0},${b | 0})`;
  if (_shadeCache.size > 512) _shadeCache.clear();
  _shadeCache.set(key, s);
  return s;
}

function fillStroke(ctx, fill, stroke, lw) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function circle(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); fillStroke(ctx, fill, stroke, lw);
}
function ellipse(ctx, x, y, rx, ry, rot, fill, stroke, lw) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU);
  fillStroke(ctx, fill, stroke, lw);
}
function tracePath(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
}
// pts is a flat [x0, y0, x1, y1, ...] array
function poly(ctx, pts, fill, stroke, lw) {
  tracePath(ctx, pts); ctx.closePath(); ctx.lineJoin = 'round'; fillStroke(ctx, fill, stroke, lw);
}
function rrect(ctx, x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); fillStroke(ctx, fill, stroke, lw);
}
function line(ctx, x1, y1, x2, y2, color, lw) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke();
}
// Thick outlined stroke, used for limbs, staffs, scarves, antlers.
function limb(ctx, pts, color, w) {
  tracePath(ctx, pts);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = w + 3; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke();
}
function hexagon(ctx, x, y, r, fill, stroke, lw, rot = 0) {
  const pts = [];
  for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  poly(ctx, pts, fill, stroke, lw);
}
// A soft radial light: the colour at the centre fading to nothing at r. Drawn from one cached sprite per colour (a
// gradient built per call was the arena's biggest per-frame cost: ~100 glows a frame in the Hollow King's barrow).
const _glowCache = new Map();
function glowSprite(color) {
  let c = _glowCache.get(color);
  if (c || typeof document === 'undefined') return c || null;
  c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(color, 1)); g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  if (_glowCache.size > 256) _glowCache.clear();
  _glowCache.set(color, c);
  return c;
}
// hot (optional, 0..1): a white-hot core on top, the same look as VFX.glowAt's lights (ability and boss effects),
// so a light drawn here and one drawn there read as one style
function glow(ctx, x, y, r, color, a, hot) {
  if (a <= 0 || r <= 0) return;
  if (hot > 0) { glow(ctx, x, y, r, color, a); glow(ctx, x, y, r * 0.32, '#ffffff', a * (hot > 1 ? 1 : hot)); return; }
  const s = glowSprite(color);
  if (!s) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    return;
  }
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * (a > 1 ? 1 : a);
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = ga;
}

// Deterministic random numbers (mulberry32) so the town looks the same every load.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jagged(ctx, x1, y1, x2, y2, seed, color, lw) {
  const r = rng(seed), n = 6;
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const pts = [x1, y1];
  for (let i = 1; i < n; i++) {
    const t = i / n, o = (r() - 0.5) * len * 0.3;
    pts.push(x1 + dx * t + nx * o, y1 + dy * t + ny * o);
  }
  pts.push(x2, y2);
  tracePath(ctx, pts);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = lw * 4; ctx.strokeStyle = rgba(color, 0.3); ctx.stroke();
  ctx.lineWidth = lw; ctx.strokeStyle = '#ffffff'; ctx.stroke();
}

// --- Animation helpers -------------------------------------------------------
// An entity's anim state looks like { t, moving, action: { type, t0, dur } }.

// Progress 0..1 of the current action if it matches `type` (or any type when omitted), else -1.
function actP(st, type) {
  const a = st.action;
  if (!a || (type && a.type !== type)) return -1;
  const p = (actT(st) - a.t0) / a.dur;
  return p >= 0 && p <= 1 ? p : -1;
}
// the clock the current action runs on: frozen during a hit-stop, then carrying on from the same pose
function actT(st) {
  const h = st.hold;
  if (!h || h.a !== st.action) return st.t;
  return st.t < h.until ? h.at - h.base : st.t - (h.until - h.at) - h.base;
}
// Hit-stop: freeze the hero's current swing for a beat where it connects (cosmetic; several stack up on one swing)
function hitStop(st, secs, now) {
  if (!st || !st.action) return;
  const h = st.hold, base = h && h.a === st.action ? h.base + (Math.min(now, h.until) - h.at) : 0;
  st.hold = { a: st.action, at: now, until: now + secs, base };
}
// Weapon swing curve: wind up (0 -> 1), strike (1 -> -1.2), recover (-> 0).
function swing(p) {
  if (p < 0) return 0;
  if (p < 0.3) return easeOut(p / 0.3);
  if (p < 0.55) return 1 - 2.2 * easeOut((p - 0.3) / 0.25);
  return -1.2 * (1 - easeOut((p - 0.55) / 0.45));
}
function pulse(p) { return p < 0 ? 0 : Math.sin(p * Math.PI); }
// The long gather of a heavy cast (cosmetic, boss-weight.js decides which casts are heavy). main.js 'bcast' stamps the action with w0 (when the cast bar began) and
// wk (how heavy the move is: 0 = an ordinary cast, which gathers only in the last 0.30 s as before), and the body then loads slowly across the whole bar: load
// climbs from 0 at the start of the cast to peak (1 for a light move, up to about 1.6 for a giant's: a deeper coil, so the swing out of it is longer) by the time the old
// gather would begin (0.45 s before the blow lands), and stays there through a held beat (longer on a long cast) before the strike, which is exactly the old one and lands on the same frame. on: true from the first moment of the cast; hold: 0..1 once
// the coil is full (a tremor of strain); left: seconds to the landing; q: seconds since it. Pure: it reads the clock and the action and changes nothing.
function windUp(st) {
  const a = st.action, z = { on: false, load: 0, coil: 0, peak: 1, hold: 0, wk: 0, left: 0, q: -1, D: 0 };
  if (!a || a.type !== 'attack' || !(a.wk > 0) || a.w0 == null) return z;
  const T = actT(st), land = a.t0 + 0.45, D = land - a.w0, c = T - a.w0;
  if (c < 0 || D < 0.9) return z;
  z.wk = a.wk; z.D = D; z.left = land - T; z.q = T - land; z.peak = 1 + 0.45 * Math.min(a.wk, 1.4);
  if (T < land) {
    const full = Math.max(0.3, D - 0.45 - Math.min(0.5, 0.12 * D)), x = Math.min(1, c / full), w = a.wk > 1 ? a.wk : 1;
    const e = x * x * (3 - 2 * x), p = Math.pow(x, 0.9 + 0.5 * w * (a.wk > 0.7 ? 1 : 0.3));   // (a heavy body is slow to start and comes on harder; a light one is quicker to draw)
    z.coil = x >= 1 ? 1 : 0.4 * x + 0.6 * (p * p * (3 - 2 * p) * 0.55 + e * 0.45); z.load = z.coil * z.peak;
    z.hold = x >= 1 ? Math.min(1, (c - full) / 0.25) : 0;
    z.on = true;
  }
  return z;
}
// A boss's blow in beats (cosmetic: it reads the clock and nothing else). A cast gives the body one 'attack' action whose t0 is 0.45 s before the blow
// lands (main.js 'bcast'; a boss auto lands there too), so the beats are fixed in seconds from t0 and not in the action's progress (casts run 1.2 s,
// autos 1.0 s): gather 0 -> 0.30 (load), a held beat to 0.34, the strike 0.34 -> 0.45 (hit reaches 1 the moment the cast ends: the landing does not
// move), the follow-through to about 0.62 (ovr: the overshoot, then the recoil), the settle to the action's end (rest). land / shud: the weight of the
// landing (a decaying dip and a shudder), trail: how far cloth and hair that hang off him are still swinging through. All 0 when there is no swing.
function strikeBeats(st) {
  const a = st.action, z = { u: -1, on: false, load: 0, hit: 0, ovr: 0, rest: 0, land: 0, shud: 0, trail: 0, cloth: 0, p: -1, wind: false, hold: 0, coil: 0, peak: 1 };
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); };
  const D = a && a.dur > 1.21 ? 1.2 : a ? a.dur : 0, u = a && a.type === 'attack' ? (actT(st) - a.t0) * D / a.dur : -1;   // (a longer action, a roar or a demo, plays the same beats slower)
  const W = windUp(st);
  if (u >= 0 && u <= D) {
    const q = u - 0.45, end = Math.min(D, 1.12);
    z.u = u; z.on = true; z.p = u / D;
    const heavy = a.wk > 0 && a.w0 != null, pk = 1 + 0.45 * Math.min(a.wk, 1.4);
    z.load = heavy ? pk : sm(u / 0.30);   // (a heavy cast has gathered the whole way by now: windUp)
    z.hit = u < 0.34 ? 0 : Math.pow(c01((u - 0.34) / 0.11), 2);
    z.ovr = q <= 0 ? 0 : q < 0.08 ? easeOut(q / 0.08) : Math.exp(-(q - 0.08) / 0.16);
    z.rest = sm((u - 0.60) / Math.max(0.1, end - 0.60));
    z.land = q < 0 ? 0 : Math.exp(-q / 0.13);
    z.shud = q < 0 ? 0 : Math.sin(q * 48) * Math.exp(-q / 0.10);
    z.trail = sm((u - 0.40) / 0.20) * Math.exp(-Math.max(0, u - 0.62) / 0.30);
    z.hold = W.hold; if (heavy) { z.coil = 1; z.peak = pk; }   // (coil: how far the long gather of a heavy cast has got, 0..1, and peak: how deep it goes, which load reaches; 0 / 1 when the cast is an ordinary one)
  } else if (W.on && u < 0) { z.on = true; z.wind = true; z.u = u; z.p = 0; z.load = W.load; z.hold = W.hold; z.coil = W.coil; z.peak = W.peak; }   // (the long gather of a heavy cast, before the action itself begins)
  // cloth: a spring that follows the body's lunge (hit while it is out, back to 0 as it settles) a little late and rings past it, so what hangs off him
  // lags behind the blow (positive), then swings through (negative) and settles. Stepped once per frame (st._bk keeps it); the clock may stop or jump.
  const bk = st._bk || (st._bk = { t: st.t, x: 0, v: 0 }), tgt = z.hit * (1 - z.rest);
  let dt = st.t - bk.t;
  if (dt > 0.25 || dt < 0) { bk.x = tgt; bk.v = 0; dt = 0; }
  for (; dt > 1e-6; dt -= 1 / 120) { const h = Math.min(dt, 1 / 120); bk.v += (150 * (tgt - bk.x) - 9 * bk.v) * h; bk.x += bk.v * h; }
  bk.t = st.t; z.cloth = tgt - bk.x;
  return z;
}

// A swept band behind a fast blade (cosmetic): remembers the last few places of the grip and the tip (st._sm[key], in the figure's own frame) and, while the
// tip is moving quickly, paints the ground between them, fainter the older it is, so a blow leaves a clean after-image along the weapon's path. active: false
// forgets it. o: { min (px per frame of tip travel before it shows), a (alpha), add (false: plain fill instead of light) }
function bladeSmear(ctx, st, key, active, gx, gy, tx, ty, color, o) {
  const m = st._sm || (st._sm = {}), H = m[key] || (m[key] = []);
  if (!active) { H.length = 0; return; }
  const l = H[H.length - 1];
  if (l && st.t - l[4] > 0.15) H.length = 0;
  if (!l || st.t > l[4] + 1e-4) { H.push([gx, gy, tx, ty, st.t]); if (H.length > 7) H.shift(); }
  const mn = o && o.min != null ? o.min : 5, al = o && o.a != null ? o.a : 0.5, n = H.length;
  if (n < 2) return;
  ctx.save(); if (!o || o.add !== false) ctx.globalCompositeOperation = 'lighter';
  for (let i = n - 1; i >= 1; i--) {
    const p = H[i], q = H[i - 1];
    if (Math.hypot(p[2] - q[2], p[3] - q[3]) < mn) continue;
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[0], p[1]); ctx.closePath();
    ctx.fillStyle = rgba(color, al * Math.pow(i / (n - 1), 1.4)); ctx.fill();
  }
  ctx.restore();
}

// Painted art that may not be in yet (a tank's own taunt icon, say). The server is asked once per file per session
// and the answer kept: ok(path) is true once the file has loaded, false once it's known to be missing, null while
// the one request is out. Callers draw their fallback until it says true, so a missing file is never asked again.
const ArtProbe = (() => {
  const known = new Map();
  function ok(path) {
    if (typeof Image === 'undefined') return false;
    if (!known.has(path)) {
      known.set(path, null);
      const im = new Image();
      im.onload = () => known.set(path, true);
      im.onerror = () => known.set(path, false);
      im.src = path;
    }
    return known.get(path);
  }
  return { ok };
})();

// Text with a dark outline, for name tags and damage numbers.
function label(ctx, text, x, y, color, size = 12, family = 'Cinzel, Georgia, serif', weight = 700) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(10,8,14,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
