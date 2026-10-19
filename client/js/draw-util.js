// Small canvas helpers shared by all the code-drawn art.

const TAU = Math.PI * 2;
const OUT = '#1a1622'; // outline color used by every sprite

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function easeOut(t) { return 1 - (1 - t) * (1 - t); }

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}
// amt > 0 lightens toward white, amt < 0 darkens toward black
function shade(hex, amt) {
  let [r, g, b] = hexToRgb(hex);
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
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
function glow(ctx, x, y, r, color, a) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
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
