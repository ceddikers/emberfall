// Vesper, the Mirror Knight: how every move of hers looks on the floor and when it lands. Her body is vesper-art.js, her hall and its glass are
// vesper-room.js and the two-room view (camera, twins, which room a danger is painted in) is vesper-view.js; this file is the moves. Loaded after
// vesper-room.js; the other files reach it through VS_FX (every call is guarded by `typeof VS_FX !== 'undefined'`).
//
// THE TELLS (boss-tells.js get() reads TELLS[tag]; her buster is VS_FX.buster). Each is an object of hers laid over the exact shape, which keeps its
// red wash (damage) or blue (a soak) and is never hidden: a blade's edge of light for every cut, glass falling for Lay Glass, a taut thread of silver
// for Silver Thread, a struck bell's ripples for Ring True. A danger of the glass is the same drawing in the glass: vesper-view.js hands it a copy of
// the telegraph with its shape mirrored (tg._vsm) and clips it to the glass hall, so these draw in plain world coordinates and only choose their
// look by tg._vsm: cooler, with a pale sheen drifting over it, and a reflection turns a sweep the other way round.
// THE LANDINGS (boss-vfx.js impact(), after the room routing): both copies of a danger of both rooms play their own, each clipped to its own room
// (the shared helpers clip to the hall and would lose everything in the glass, so the landings are drawn here). What a landing leaves is a scar on
// the floor of the room it landed in (S.marks, drawn under the units by under()), and a struck twin leaves Fracture on its hero (roomev vsfracture).
// THE SWORD DANCE: a cut is solid only while it is the next to land; the one behind it is the outline the shared rim gives every danger. Each cut
// reads its own number from its shape (the script grows arc and width with the cut) and is faster, heavier and louder than the last; the sixth,
// the double cut, is the biggest thing she does.
// The body: cast() (the gathering for each pose) and the enrage, the entrance and the fall are plain ones here; the showpieces are other files.
// Palette: silver, black water, frost blue. Nothing warm. Red is damage and blue a soak and nothing else is either.

const VS_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeIn = q => q * q;
  const easeIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q));
  const C = {
    white: '#ffffff', hi: '#f7fbff', silver: '#e2ecf8', ice: '#cfe6ff', pane: '#bcd8ff', frost: '#9fd2ff', frostDk: '#4f7fc0', deep: '#27406e', ink: '#0a1226',
    black: '#08111f', water: '#112038', glass: '#8fb4ec', blue: '#3d8bff',
  };
  const HW = 480, HH = 260;
  const danger = () => (typeof BossTells !== 'undefined' && BossTells.COL ? BossTells.COL.danger : '#ff3b2f');
  const flashK = () => (typeof FX !== 'undefined' && FX.flashK != null ? FX.flashK : 1);
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };
  const camFx = (stop = 0.08, punch = 0.03, dur = 0.4) => { try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ } };
  const isMe = u => typeof Net !== 'undefined' && Net && u.id === Net.id;
  function flinch(col, a = 0.1, dur = 0.2, punch = 0.016) { try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.flash(col, a, dur); FX.cam.punch(punch, 0.3); } } catch (e) { /* cosmetic */ } }
  const view = () => (typeof VS_VIEW !== 'undefined' ? VS_VIEW : null);
  const mirrorOf = room => { const V = view(); return room && V && V.S ? V.S(room).mirror : { kind: 'n', px: 0, py: 0, nx: 0, ny: 1 }; };
  const twinOf = (room, x, y) => { const V = view(); return V ? V.twinPt(mirrorOf(room), x, y) : [x, -2 * HH - y]; };
  const S = { room: null, lastT: -1, marks: [], pos: new Map(), frac: new Map(), fracPend: [], net: false, cancelSeen: new Set() };

  // ---------------------------------------------------------------- which room a thing is in, and clipping to it
  // a tell is handed the glass copy of a telegraph (tg._vsm); a landing is handed the hall's copy of a both-rooms danger marked _vsm as well, so a
  // landing tells them apart by the tag and, for a danger of both rooms, by whether the shape was moved
  function glassImp(tg) {
    const t = tg.tag || '';
    if (t[1] === 'g') return true;
    if (t[1] === 'h') return false;
    const a = tg.live, b = tg.shape; return !!(tg._vsm && a && b && Math.hypot(a.x - b.x, a.y - b.y) > 2);
  }
  function clipRoom(c, glass, room) {
    c.beginPath();
    if (!glass) { ARENA.trace(c, 4); c.clip(); return; }
    const m = mirrorOf(room);
    if (m.kind === 'n') c.rect(-HW - 4, -3 * HH - 4, 2 * HW + 8, 2 * HH + 4); else if (m.kind === 'e') c.rect(HW, -HH - 4, 2 * HW + 4, 2 * HH + 8); else { ARENA.trace(c, 4); }
    c.clip();
  }
  // an effect drawn in the room it landed in
  function fxIn(glass, room, dur, draw, o = {}) {
    return VFX.fx({ dur, layer: o.layer || 'air', delay: o.delay, draw: (c, p, t, e) => { c.save(); clipRoom(c, glass, room); try { draw(c, p, t, e); } finally { c.restore(); } } });
  }
  const after = (sec, fn) => VFX.fx({ dur: Math.max(0.01, sec), layer: 'ground', draw() {}, done: fn });

  // ---------------------------------------------------------------- small painted pieces
  // a blade's edge of light: ink under, frost over, a white core
  function blade(c, x1, y1, x2, y2, k, w = 2.4, o = {}) {
    if (k <= 0.01) return;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(o.mid || C.frost, 0.2 * k * flashK()); c.lineWidth = w * 4.2; c.stroke(); c.globalCompositeOperation = 'source-over';
    c.strokeStyle = rgba(C.ink, 0.42 * k); c.lineWidth = w + 3.4; c.stroke();
    c.strokeStyle = rgba(o.mid || C.frost, 0.55 * k); c.lineWidth = w * 1.7; c.stroke();
    c.strokeStyle = rgba(o.hi || C.white, Math.min(1, 0.95 * k)); c.lineWidth = Math.max(1, w * 0.55); c.stroke();
    c.restore();
  }
  // a glint: a soft light with a thin cross of white
  function glint(c, x, y, r, a, ang = 0) {
    if (a <= 0.01) return;
    glow(c, x, y, r, C.ice, a * 0.7);
    c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = 'round'; c.strokeStyle = rgba(C.white, Math.min(1, a)); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-r * 0.7, 0); c.lineTo(r * 0.7, 0); c.moveTo(0, -r * 0.34); c.lineTo(0, r * 0.34); c.stroke(); c.restore();
  }
  function zig(c, x1, y1, x2, y2, seed, jag = 7, seg = 24) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / seg)), nx = -dy / L, ny = dx / L;
    c.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n, o = (hash(i, seed) - 0.5) * 2 * jag; c.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
    c.lineTo(x2, y2);
  }
  // a crack in glass: a dark edge and a bright body
  function crack(c, x1, y1, x2, y2, seed, k, o = {}) {
    if (k <= 0.01) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); zig(c, x1, y1, x2, y2, seed, o.jag ?? 6, o.seg ?? 20);
    c.strokeStyle = rgba(o.ink || C.deep, 0.5 * k); c.lineWidth = (o.w || 1.6) + 2.4; c.stroke();
    c.strokeStyle = rgba(o.col || C.white, Math.min(1, k)); c.lineWidth = o.w || 1.6; c.stroke();
    c.restore();
  }
  function crackStar(c, x, y, r, n, seed, k, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, seed) * 0.7, d = r * (0.5 + 0.5 * hash(i, seed + 1));
      crack(c, x + Math.cos(a) * 5, y + Math.sin(a) * 5 * (o.flat ?? 1), x + Math.cos(a) * d, y + Math.sin(a) * d * (o.flat ?? 1), seed + i, k, { w: o.w || 1.5, jag: o.jag ?? 5, seg: 16, col: o.col });
    }
  }
  // a shard of glass (a long kite) pointing along `ang`, centred on (x, y)
  function shardPoly(c, x, y, L, w, ang, fill, edge, lw = 1) {
    const ca = Math.cos(ang), sa = Math.sin(ang), P = [[L, 0], [0, w], [-L * 0.55, 0], [0, -w]];
    c.beginPath(); P.forEach(([u, v], i) => { const px = x + ca * u - sa * v, py = y + sa * u + ca * v; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (edge) { c.strokeStyle = edge; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
  }
  // the pale bands a mirror lets slide across what it shows, clipped to a shape: the sign of the glass
  function sheen(c, s, k, t, a = 0.14) {
    if (k <= 0.01) return;
    c.save(); SHAPES.trace(c, s); c.clip('evenodd');
    c.fillStyle = rgba(C.glass, 0.05 * k); c.fillRect(-1700, -1700, 3400, 3400);
    for (let i = 0; i < 3; i++) {
      const x = -900 + ((t * 38 + i * 540) % 1620), w = 70 + 26 * i;
      const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(226,240,255,0)'); g.addColorStop(0.5, rgba(C.silver, a * k)); g.addColorStop(1, 'rgba(226,240,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x, -1700); c.lineTo(x + w, -1700); c.lineTo(x + w - 1100, 1700); c.lineTo(x - 1100, 1700); c.closePath(); c.fill();
    }
    c.restore();
    // the pane's own edge, a hair inside the rim
    c.save(); SHAPES.trace(c, s); c.setLineDash([2, 7]); c.lineDashOffset = -t * 6; c.strokeStyle = rgba(C.ice, 0.42 * k); c.lineWidth = 1.2; c.stroke(); c.restore();
  }
  // the red under every damaging area of hers, at the strength of the shared tell (boss-tells.js outline() draws the rim over it)
  function wash(c, s, p, k, t, a0 = 0.2) {
    const late = Math.max(0, (p - 0.75) / 0.25), pulse = late > 0 ? 0.5 + 0.5 * Math.sin(t * (10 + late * 22)) : 0;
    c.save(); SHAPES.trace(c, s); c.fillStyle = rgba(danger(), (a0 + 0.1 * late + 0.06 * pulse) * k); c.fill('evenodd'); c.restore();
  }
  const inCone = (c, s, fn) => { c.save(); c.translate(s.x, s.y); c.rotate(s.angle); fn(s.r, s.arc / 2); c.restore(); };
  const inLane = (c, s, fn) => { c.save(); c.translate(s.x, s.y); c.rotate(s.angle); fn(s.len, s.w / 2); c.restore(); };
  const bossOf = env => (env && env.boss) || { x: 0, y: -60, f: 0 };

  // ---------------------------------------------------------------- the warnings
  const TELLS = {};

  // Evenfall: a cut drawn in light: the two edges of the cone are the blade's, a glint runs out along each, and in the last of the cast the cut itself
  // goes through the cone, edge to edge, a swept light behind it (a reflection cuts the other way round)
  function coneCut(c, s, p, k, t, G, o = {}) {
    const hs = G ? -1 : 1, q = easeIn(clamp((p - (o.from ?? 0.4)) / (1 - (o.from ?? 0.4)), 0, 1)), lens = o.lens ?? 1;
    inCone(c, s, (r, h) => {
      // the far edge of the cut, a crescent of light, and the swept light behind the blade
      const a1 = -hs * h + hs * 2 * h * q;
      if (q > 0.01) {
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, Math.min(-hs * h, a1), Math.max(-hs * h, a1)); c.closePath();
        const g = c.createRadialGradient(0, 0, 10, 0, 0, r); g.addColorStop(0, rgba(C.ice, 0.02 * k)); g.addColorStop(1, rgba(C.ice, (0.16 + 0.12 * q) * k)); c.fillStyle = g; c.fill();
      }
      c.beginPath(); c.arc(0, 0, r - 3, -h, h); c.strokeStyle = rgba(C.silver, (0.35 + 0.35 * p) * k); c.lineWidth = 2.2; c.stroke();
      for (const sg of [-1, 1]) {
        const hi = h - 0.014, ca = Math.cos(sg * hi), sa = Math.sin(sg * hi);
        blade(c, ca * r * 0.1, sa * r * 0.1, ca * r, sa * r, (0.6 + 0.4 * p) * k, 2.6 * lens);
        for (let i = 0; i < 3; i++) { const u = ((t * (0.5 + 0.9 * p) * (o.speed ?? 1) + i / 3 + (sg > 0 ? 0.17 : 0)) % 1); glint(c, ca * r * (0.1 + 0.88 * u), sa * r * (0.1 + 0.88 * u), 13 + 7 * p, Math.sin(u * Math.PI) * (0.65 + 0.35 * p) * k, sg * h); }
      }
      // the cut's own edge, the blade line sweeping through
      if (q > 0.01) {
        const ca = Math.cos(a1), sa = Math.sin(a1);
        for (let g = (o.ghosts ?? 1); g >= 0; g--) { const ag = a1 - hs * g * 0.12, cg = Math.cos(ag), sg = Math.sin(ag); blade(c, cg * r * 0.1, sg * r * 0.1, cg * r, sg * r, (g ? 0.35 / g : 1) * (0.5 + 0.5 * q) * k, (3 + 3 * q) * lens * (g ? 0.7 : 1)); }
        glint(c, ca * r, sa * r, 26 + 18 * q, 0.9 * k * q, a1);
      }
    });
  }
  TELLS.vbEvenfall = { ground(ctx, tg, s, p, k, t) {
    const G = !!tg._vsm;
    wash(ctx, s, p, k, t, 0.17);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
    g.addColorStop(0, rgba(danger(), 0.0)); g.addColorStop(1, rgba(danger(), (0.1 + 0.08 * p) * k)); ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    ctx.restore();
    coneCut(ctx, s, p, k, t, G);
    if (G) sheen(ctx, s, k, t);
  } };

  // a shard falling: glass turning end over end, seen from above: it drops down the screen as it nears the floor, its shadow sharpening where it will land
  function fallingGlass(c, s, p, k, t, tgId, G) {
    const r = s.r, n = 8;
    // the floor: a pane of cold under the circle and hairlines opening from the middle
    c.save(); SHAPES.trace(c, s); c.clip();
    const g = c.createRadialGradient(s.x, s.y, 4, s.x, s.y, r); g.addColorStop(0, rgba(C.black, (0.1 + 0.18 * p) * k)); g.addColorStop(1, rgba(C.black, 0.02 * k)); c.fillStyle = g; c.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    crackStar(c, s.x, s.y, r * (0.25 + 0.7 * easeOut(p)), 7, tgId, (0.12 + 0.5 * p) * k, { w: 1.2, jag: 4 });
    for (let i = 0; i < 5; i++) { const q = (t * 0.55 + hash(i, tgId)) % 1, a = i * 2.4 + hash(i, 5) * 3, d = r * 0.8 * hash(i, 9); glow(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 12 + 10 * q, C.ice, 0.26 * Math.sin(q * Math.PI) * k); }
    c.restore();
    for (let i = 0; i < n; i++) {
      const a = hash(i, tgId) * TAU, d = Math.sqrt(hash(i, tgId + 1)) * r * 0.82, tx = s.x + Math.cos(a) * d, ty = s.y + Math.sin(a) * d * 0.9;
      const dl = 0.04 + 0.34 * hash(i, tgId + 2), e = clamp((p - dl) / (1 - dl), 0, 1), z = 250 * (0.55 + 0.45 * hash(i, tgId + 3)) * (1 - e) * (1 - e) + 3;
      const L = 15 + 9 * hash(i, tgId + 4), w = 4.2 + 2.2 * hash(i, tgId + 5), ang = hash(i, tgId + 6) * TAU + t * (2 + 3 * hash(i, 8)) * (1 - e * 0.85);
      shardPoly(c, tx, ty, L, w * 0.9, ang, rgba(C.black, (0.1 + 0.3 * e) * k));   // its shadow, sharpening
      const fade = clamp(e * 6, 0, 1) * 0.35 + 0.65 * clamp(1 - z / 330, 0.25, 1);
      shardPoly(c, tx, ty - z, L, w, ang, rgba(C.pane, 0.7 * fade * k), rgba(C.white, 0.95 * fade * k), 1.2);
      if (z > 14) { c.save(); c.globalAlpha = 0.22 * k * fade; c.beginPath(); c.moveTo(tx, ty - z - L); c.lineTo(tx, ty - z - L - 36 * Math.min(1, z / 120)); c.strokeStyle = C.white; c.lineWidth = 1.2; c.stroke(); c.restore(); }
    }
  }
  TELLS.vgLay = { ground(ctx, tg, s, p, k, t) {
    wash(ctx, s, p, k, t, 0.2);
    fallingGlass(ctx, s, p, k, t, tg.id, true);
    sheen(ctx, s, k, t, 0.11);
  } };
  // Double Glass's row in the hall: the same glass, standing up out of the floor instead (crystals growing, their light coming up through the circle)
  TELLS.vhShard = { ground(ctx, tg, s, p, k, t) {
    const r = s.r;
    wash(ctx, s, p, k, t, 0.2);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, r); g.addColorStop(0, rgba(C.ice, (0.1 + 0.2 * p) * k)); g.addColorStop(1, rgba(C.ice, 0.02 * k)); ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    crackStar(ctx, s.x, s.y, r * (0.3 + 0.65 * easeOut(p)), 8, tg.id, (0.15 + 0.55 * p) * k, { w: 1.3, jag: 4 });
    ctx.restore();
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7 + hash(i, tg.id) * 0.6, d = i ? r * (0.35 + 0.4 * hash(i, tg.id + 1)) : 0, x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d * 0.9;
      const e = easeOut(clamp((p - 0.05 * i) / 0.9, 0, 1)), hgt = (i ? 26 : 44) * (0.7 + 0.5 * hash(i, tg.id + 2)) * e, w = (i ? 6 : 9) * (0.5 + 0.5 * e);
      if (hgt < 2) continue;
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.2, y - hgt); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = rgba(C.pane, 0.8 * k); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - w * 0.2, y - hgt); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = rgba(C.white, 0.55 * k); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.2, y - hgt); ctx.lineTo(x + w, y); ctx.closePath(); ctx.strokeStyle = rgba(C.deep, 0.7 * k); ctx.lineWidth = 1.2; ctx.stroke();
    }
  } };

  // Twin Verdict: a great sword laid along the cone, point at the tank, brightening as it comes down; the glass one is the same sword, cooler, a beat behind
  function sword(c, L, a, k, G) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    const bw = 12, tip = L, base = 40;
    c.beginPath(); c.moveTo(base, -bw); c.lineTo(tip - 30, -bw * 0.55); c.lineTo(tip, 0); c.lineTo(tip - 30, bw * 0.55); c.lineTo(base, bw); c.closePath();
    const g = c.createLinearGradient(base, 0, tip, 0); g.addColorStop(0, rgba(G ? C.pane : C.hi, 0.18 * a * k)); g.addColorStop(1, rgba(G ? C.pane : C.hi, 0.7 * a * k));
    c.fillStyle = g; c.fill(); c.strokeStyle = rgba(C.ink, 0.5 * a * k); c.lineWidth = 4.2; c.stroke(); c.strokeStyle = rgba(C.white, 0.85 * a * k); c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.moveTo(base + 14, 0); c.lineTo(tip - 40, 0); c.strokeStyle = rgba(C.frost, 0.6 * a * k); c.lineWidth = 2; c.stroke();   // the fuller
    c.beginPath(); c.moveTo(base - 6, -30); c.lineTo(base - 6, 30); c.strokeStyle = rgba(C.ink, 0.5 * a * k); c.lineWidth = 8; c.stroke(); c.strokeStyle = rgba(C.silver, 0.9 * a * k); c.lineWidth = 4; c.stroke();   // the guard
    c.beginPath(); c.moveTo(base - 6, 0); c.lineTo(8, 0); c.strokeStyle = rgba(C.silver, 0.8 * a * k); c.lineWidth = 5; c.stroke();
    c.restore();
  }
  function busterTell(ctx, tg, s, p, k, t) {
    const G = !!tg._vsm;
    wash(ctx, s, p, k, t, 0.24);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r); g.addColorStop(0, rgba(C.black, (0.04 + 0.1 * p) * k)); g.addColorStop(1, rgba(C.black, 0.01 * k)); ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    ctx.restore();
    inCone(ctx, s, (r, h) => {
      sword(ctx, r * 0.94, 0.3 + 0.7 * p, k, G);
      for (const sg of [-1, 1]) { const hi = h - 0.016, ca = Math.cos(sg * hi), sa = Math.sin(sg * hi); blade(ctx, ca * r * 0.1, sa * r * 0.1, ca * r, sa * r, (0.5 + 0.5 * p) * k, 2.2); const u = (t * (0.6 + p)) % 1; glint(ctx, ca * r * u, sa * r * u, 9, Math.sin(u * Math.PI) * 0.7 * k, sg * h); }
      ctx.beginPath(); ctx.arc(0, 0, r - 3, -h, h); ctx.strokeStyle = rgba(C.silver, (0.3 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
      // the point where it will come down
      glint(ctx, r * 0.94, 0, 16 + 20 * p, (0.3 + 0.6 * p * p) * k);
    });
    if (G) sheen(ctx, s, k, t);
  }

  // Counterpoint: the close cut is a ring of blade turning round her; the far cut is the glass's own ring, its edge lit and rays running out from it
  TELLS.vhCounter = { ground(ctx, tg, s, p, k, t) {
    const r = s.r;
    wash(ctx, s, p, k, t, 0.2);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    for (let i = 0; i < 2; i++) { const a = t * (1.2 + 2.4 * p) * (i ? -1 : 1) + i * 1.6; ctx.beginPath(); ctx.arc(s.x, s.y, r * (0.9 - 0.34 * i), a, a + 1.5 - 0.5 * i); ctx.strokeStyle = rgba(C.silver, (0.3 + 0.5 * p) * k); ctx.lineWidth = 3.2 - i; ctx.stroke(); }
    ctx.restore();
    for (let i = 0; i < 3; i++) { const a = t * (1.4 + 2.6 * p) + i * TAU / 3; ctx.save(); ctx.translate(s.x + Math.cos(a) * r * 0.9, s.y + Math.sin(a) * r * 0.9); ctx.rotate(a + Math.PI / 2); blade(ctx, 0, -22, 0, 22, (0.5 + 0.5 * p) * k, 2.6); glint(ctx, 0, -22, 12, 0.7 * k * p); ctx.restore(); }
    ctx.beginPath(); ctx.arc(s.x, s.y, r - 2, 0, TAU); ctx.strokeStyle = rgba(C.silver, (0.3 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
  } };
  TELLS.vgCounter = { ground(ctx, tg, s, p, k, t) {
    wash(ctx, s, p, k, t, 0.2);
    // the inner edge of the far ring, the line the glass's cut begins on: a bright edge with a crescent turning along it, and rays running out from it
    const r2 = s.r2;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip('evenodd');
    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const a = i * TAU / 22 + hash(i, tg.id) * 0.2, q = (t * (0.5 + 0.9 * p) + hash(i, 4)) % 1, d0 = r2 + 6 + q * 240, d1 = d0 + 30 + 40 * hash(i, 6);
      ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0); ctx.lineTo(s.x + Math.cos(a) * d1, s.y + Math.sin(a) * d1); ctx.strokeStyle = rgba(C.ice, Math.sin(q * Math.PI) * (0.3 + 0.4 * p) * k); ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(s.x, s.y, r2 + 5, 0, TAU); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(C.frost, 0.22 * k * flashK()); ctx.lineWidth = 16; ctx.stroke(); ctx.restore(); ctx.strokeStyle = rgba(C.ink, 0.4 * k); ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = rgba(C.silver, (0.6 + 0.4 * p) * k); ctx.lineWidth = 3.6; ctx.stroke();
    for (let i = 0; i < 2; i++) { const a = -t * (1.0 + 2.2 * p) + i * Math.PI; ctx.beginPath(); ctx.arc(s.x, s.y, r2 + 5, a, a + 1.0); ctx.strokeStyle = rgba(C.white, (0.55 + 0.4 * p) * k); ctx.lineWidth = 3.4; ctx.stroke(); glint(ctx, s.x + Math.cos(a + 1) * (r2 + 3), s.y + Math.sin(a + 1) * (r2 + 3), 14, 0.8 * k * p, a + 1 + Math.PI / 2); }
    sheen(ctx, s, k, t, 0.1);
  } };

  // Cross-Cut and Backhand: a stroke of the blade across a band of the room: edges of light along both long sides, scoring lines slanting across, and the cut
  // front crossing the band toward the outside as the cast runs
  function crossBand(ctx, tg, s, p, k, t, env, dirSign) {
    const G = !!tg._vsm;
    wash(ctx, s, p, k, t, 0.19);
    // which way the cut goes (across the band): outward from the middle, in the hall; the glass takes the same side
    let sgn = dirSign;
    if (sgn == null) {
      const pa = s.angle + Math.PI / 2, cx = s.x + Math.cos(s.angle) * s.len / 2, cy = s.y + Math.sin(s.angle) * s.len / 2, v = cx * Math.cos(pa) + cy * Math.sin(pa); sgn = v >= 0 ? 1 : -1;
      if (G) sgn = -sgn;
    }
    inLane(ctx, s, (L, hw) => {
      ctx.save(); ctx.beginPath(); ctx.rect(0, -hw, L, hw * 2); ctx.clip();
      const q = easeIn(clamp((p - 0.3) / 0.7, 0, 1)), yq = -sgn * hw + sgn * 2 * hw * q;
      // light swept behind the cut front
      if (q > 0.01) { const y0 = -sgn * hw; const g = ctx.createLinearGradient(0, y0, 0, yq); g.addColorStop(0, rgba(C.ice, 0.03 * k)); g.addColorStop(1, rgba(C.ice, (0.18 + 0.12 * q) * k)); ctx.fillStyle = g; ctx.fillRect(0, Math.min(y0, yq), L, Math.abs(yq - y0)); }
      // slanting scores across the band, running with the cut
      ctx.lineCap = 'round';
      const step = 70, off = (t * (30 + 80 * p)) % step;
      for (let x = -hw * 0.6 + off; x < L + hw * 0.6; x += step) { ctx.beginPath(); ctx.moveTo(x, -hw); ctx.lineTo(x + hw * 0.6, hw); ctx.strokeStyle = rgba(C.ice, (0.1 + 0.16 * p) * k); ctx.lineWidth = 1.4; ctx.stroke(); }
      ctx.restore();
      for (const sg of [-1, 1]) {
        const lead = sg === sgn;   // (the edge the cut leaves from is the quieter one, the far edge the sharper)
        blade(ctx, 0, sg * (hw - 5), L, sg * (hw - 5), (lead ? 0.55 : 0.85) * (0.6 + 0.4 * p) * k, lead ? 2.2 : 3);
        for (let i = 0; i < 3; i++) { const u = (t * (0.28 + 0.6 * p) * (sg > 0 ? 1 : -1) + i / 3 + 0.5) % 1; const x = (u < 0 ? u + 1 : u) * L; glint(ctx, x, sg * hw, 11, Math.sin((x / L) * Math.PI) * (0.5 + 0.4 * p) * k, 0); }
      }
      if (q > 0.01) { blade(ctx, 0, yq, L, yq, (0.6 + 0.4 * q) * k, 3.4 + 4 * q); for (let i = 0; i < 4; i++) glint(ctx, L * ((t * 0.9 + i * 0.27) % 1), yq, 10 + 8 * q, 0.7 * k * q, 0); }
    });
    if (G) sheen(ctx, s, k, t);
  }
  const crossTell = { ground(ctx, tg, s, p, k, t, env) { crossBand(ctx, tg, s, p, k, t, env, null); } };
  TELLS.vhCross = crossTell; TELLS.vgCross = crossTell; TELLS.vhBackhand = crossTell; TELLS.vgBackhand = crossTell;

  // Silver Thread: a taut thread of silver from the tied hero toward the glass, trembling, beads of light running along it, a knot where it is tied;
  // as it locks the thread tightens to a hum and the lane round it is a blade (its edges flare)
  function threadTell(ctx, tg, s, p, k, t) {
    const G = !!tg._vsm;
    wash(ctx, s, p, k, t, 0.17);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const lockP = clamp((p - 0.55) / 0.45, 0, 1);
    inLane(ctx, s, (L, hw) => {
      const gl = ctx.createLinearGradient(0, -hw, 0, hw); gl.addColorStop(0, rgba(C.ice, 0)); gl.addColorStop(0.5, rgba(C.ice, (0.08 + 0.24 * lockP) * k)); gl.addColorStop(1, rgba(C.ice, 0)); ctx.fillStyle = gl; ctx.fillRect(0, -hw, L, hw * 2);
      for (const sg of [-1, 1]) { const a = (0.15 + 0.6 * lockP) * k; blade(ctx, 0, sg * (hw - 5), L, sg * (hw - 5), a, 1.9); }
      // the thread: it sags and trembles while it is slack, and runs true and thin when it is drawn tight
      const amp = (9 * (1 - lockP) + 0.8) * (0.6 + 0.4 * Math.sin(t * 3));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, col, a] of [[6, C.ink, 0.3], [3.4, C.frost, 0.6], [1.9, C.white, 1]]) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 6; x <= L; x += 8) ctx.lineTo(x, Math.sin(x * 0.045 - t * (9 + 30 * lockP)) * amp * Math.sin(Math.PI * x / L) * (0.7 + 0.3 * Math.sin(x * 0.011 + t)));
        ctx.strokeStyle = rgba(col, a * k); ctx.lineWidth = w; ctx.stroke();
      }
      // the knot at the hero's end, and beads running out along the thread
      ctx.beginPath(); ctx.arc(2, 0, 7, 0, TAU); ctx.fillStyle = rgba(C.silver, 0.9 * k); ctx.fill(); ctx.strokeStyle = rgba(C.ink, 0.6 * k); ctx.lineWidth = 1.6; ctx.stroke();
      for (let i = 0; i < 5; i++) { const u = (t * (0.35 + 0.9 * p) + i / 5) % 1; glint(ctx, u * L, 0, 8 + 4 * p, Math.sin(u * Math.PI) * (0.55 + 0.4 * p) * k, 0); }
      glint(ctx, L, 0, 14 + 14 * lockP, 0.5 * k * (0.3 + lockP), Math.PI / 2);
    });
    ctx.restore();
    if (G) sheen(ctx, s, k, t, 0.12);
  }
  TELLS.vbThread = { ground: threadTell }; TELLS.vbTwoThread = { ground: threadTell };

  // the sword dance: how many cuts the dance has made is read from the shape the script gives each (arc 1.0 + 0.07 k, width 130 + 8 k; the last is wide)
  function cutK(s) {
    if (s.kind === 'cone') return s.arc >= 1.5 ? 5 : clamp(Math.round((s.arc - 1.0) / 0.07), 0, 4);
    return s.w >= 190 ? 5 : clamp(Math.round((s.w - 130) / 8), 0, 4);
  }
  // is a cut the next to land? (another cut of the dance on the floor that lands before it makes this one the outline behind it)
  function cutNext(tg, env) {
    if (!env || !env.tgs) return true;
    const me = tg.start + tg.dur;
    for (const o of env.tgs.values()) { if (o === tg || o.gone != null || !/Cut$/.test(o.tag || '') || o.tag.length !== 5) continue; if (o.start + o.dur < me - 0.08) return false; }
    return true;
  }
  const HEAVY = k => 0.4 + 0.12 * k;   // 0.4 .. 1.0
  TELLS.vhCut = { ground: cutTell }; TELLS.vgCut = { ground: cutTell };
  function cutTell(ctx, tg, s, p, k, t, env) {
    const G = !!tg._vsm, ck = cutK(s), fin = ck === 5, hv = HEAVY(ck);
    if (!cutNext(tg, env)) {
      // the one behind: only its edge, thin and pale, the rim the shared drawing adds is all else it has
      ctx.save(); SHAPES.trace(ctx, s); ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 12; ctx.strokeStyle = rgba(C.silver, 0.5 * k); ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
      return;
    }
    wash(ctx, s, p, k, t, 0.18 + 0.05 * hv);
    if (s.kind === 'cone') {
      coneCut(ctx, s, p, k, t, G, { from: 0.28 - 0.04 * ck, speed: 1 + 0.35 * ck, lens: 0.9 + 0.2 * ck + (fin ? 0.6 : 0), ghosts: fin ? 4 : ck >= 3 ? 3 : ck >= 1 ? 2 : 1 });
      if (fin) inCone(ctx, s, (r, h) => { ctx.beginPath(); ctx.arc(0, 0, r - 8, -h, h); ctx.strokeStyle = rgba(C.white, (0.3 + 0.5 * p) * k); ctx.lineWidth = 5; ctx.stroke(); });
    } else {
      // a cut along a line: the blade drawn out from where she stands, a streak growing along the lane, glints racing down it
      inLane(ctx, s, (L, hw) => {
        const grow = easeOut(clamp(p / (0.55 - 0.05 * ck), 0, 1)), X = L * grow, sp = (300 + 230 * ck) * (fin ? 1.5 : 1);
        const gl = ctx.createLinearGradient(0, 0, L, 0); gl.addColorStop(0, rgba(C.ice, (0.1 + 0.16 * p) * k)); gl.addColorStop(1, rgba(C.ice, 0.03 * k));
        ctx.fillStyle = gl; ctx.fillRect(0, -hw * 0.5, X, hw);
        for (const sg of [-1, 1]) blade(ctx, 0, sg * hw * 0.97, X, sg * hw * 0.97, (0.45 + 0.4 * p) * k, 1.6 + 0.35 * ck + (fin ? 1.6 : 0));
        for (let g = (fin ? 3 : ck >= 3 ? 2 : ck >= 1 ? 1 : 0); g >= 0; g--) blade(ctx, 0, 0, Math.max(0, X - g * 38), 0, (g ? 0.3 / g : 0.5 + 0.5 * p) * k, (g ? 2.4 : 3 + 1.1 * ck + (fin ? 3 : 0)));
        for (let i = 0; i < 5; i++) { const x = (t * sp + i * L / 5) % L; if (x < X) glint(ctx, x, 0, 10 + 2 * ck, (0.5 + 0.4 * p) * k, 0); }
        glint(ctx, X, 0, 24 + 10 * ck + 20 * p, (0.5 + 0.5 * p) * k, Math.PI / 2);
      });
    }
    if (G) sheen(ctx, s, k, t, 0.1 + 0.02 * ck);
  }

  // a soak (the wall's): two reflections sharing a note: ripples drawn in to the middle, two crescents (hero and twin) closing into one lens, blue
  TELLS.vbSoak = { ground(ctx, tg, s, p, k, t) {
    const { x, y, r } = s, B = BossTells.COL.share, Bh = BossTells.COL.shareHi, G = !!tg._vsm, need = Math.max(1, tg.need || 2);
    glow(ctx, x, y, r * 1.7, B, 0.28 * k);
    circle(ctx, x, y, r, rgba(B, 0.14 * k), rgba(B, 0.95 * k), 3);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    for (let i = 0; i < 3; i++) { const q = (t * (0.5 + 0.7 * p) + i / 3) % 1; ctx.beginPath(); ctx.arc(x, y, r * (1 - q * 0.85), 0, TAU); ctx.strokeStyle = rgba(Bh, Math.sin(q * Math.PI) * (0.3 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke(); }
    // the two crescents closing
    const gap = (1 - p) * r * 0.5 + 3;
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sg * (gap + r * 0.3), y, r * 0.44, sg > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, sg > 0 ? Math.PI * 1.38 : Math.PI * 0.38, false); ctx.strokeStyle = rgba('#ffffff', (0.55 + 0.4 * p) * k); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.restore();
    // pips for who it wants, and the countdown ring
    for (let i = 0; i < need; i++) { const a = -Math.PI / 2 + (i - (need - 1) / 2) * 0.45; circle(ctx, x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12), 4.5, rgba(Bh, k), OUT, 1.5); }
    ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p)); ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 2; ctx.stroke();
    if (G) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); const sx = x - r + ((t * 40) % (r * 3)); const g = ctx.createLinearGradient(sx, 0, sx + 40, 0); g.addColorStop(0, 'rgba(226,240,255,0)'); g.addColorStop(0.5, rgba(C.silver, 0.18 * k)); g.addColorStop(1, 'rgba(226,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(sx, y - r, 40, r * 2); ctx.restore(); }
  } };

  // the Hand Mirror shattering: the pane crazing from its middle, the light coming through the cracks
  TELLS.vhShatter = { ground(ctx, tg, s, p, k, t) {
    const r = s.r;
    wash(ctx, s, p, k, t, 0.2);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, r); g.addColorStop(0, rgba(C.white, (0.1 + 0.3 * p) * k)); g.addColorStop(1, rgba(C.ice, 0.02 * k)); ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    crackStar(ctx, s.x, s.y, r * (0.35 + 0.65 * easeOut(p)), 11, tg.id, (0.3 + 0.6 * p) * k, { w: 1.6, jag: 6 });
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * 0.3, d = r * (0.3 + 0.6 * ((t * 0.4 + hash(i, 3)) % 1)); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 9, C.white, 0.35 * p * k); }
    ctx.restore();
  } };

  // the raidwides: Ring True is a struck bell: ripples going out from where the blade strikes, quickening toward the blow; Hairline Fracture the glass
  // crazing out from the seam; an act's opener a pale band of light passing across the floor
  const wallPt = (room, bx, by) => twinOf(room, bx, by);
  function ringTell(ctx, tg, s, p, k, t, env) {
    const R = ARENA.R, b = bossOf(env), G = !!tg._vsm;
    const c = G ? wallPt(env.room, b.x, b.y) : [b.x, b.y], x = c[0], y = c[1];
    ctx.save(); ctx.lineCap = 'round';
    const nR = 4;
    for (let i = 0; i < nR; i++) {
      const q = (t * (0.3 + 0.5 * p) + i / nR) % 1, r = 50 + q * R * 1.45, a = Math.sin(q * Math.PI) * (0.06 + 0.3 * p) * k;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = rgba(C.pane, a * 0.45); ctx.lineWidth = 12 * (1 - q * 0.5); ctx.stroke(); ctx.strokeStyle = rgba(C.white, a); ctx.lineWidth = 1.8; ctx.stroke();
    }
    // the bell itself: a tight pair of rings at the strike that gather and brighten
    const q2 = (t * 2.2) % 1; ctx.beginPath(); ctx.arc(x, y, 18 + 40 * q2, 0, TAU); ctx.strokeStyle = rgba(C.white, (0.2 + 0.4 * p) * (1 - q2) * k); ctx.lineWidth = 2.4; ctx.stroke();
    glow(ctx, x, y, 60 + 60 * p, C.ice, (0.1 + 0.3 * p) * k);
    ctx.restore();
  }
  // cracks laid from the seam: points on the seam, hairlines running into the room, forks off them; mirrored into the glass by the copy's own twin
  function seamCracks(ctx, tg, p, k, t, env) {
    const G = !!tg._vsm, room = env.room, m = mirrorOf(room), grow = easeOut(clamp(p / 0.9, 0, 1)), seed = 17;
    const pt = (x, y) => (G ? twinOf(room, x, y) : [x, y]);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const n = 11;
    for (let i = 0; i < n; i++) {
      let x0, y0, dx, dy;
      if (m.kind === 'e') { x0 = HW; y0 = -HH + (i + 0.5) * (2 * HH / n); dx = -1; dy = (hash(i, 3) - 0.5) * 0.5; }
      else if (m.kind === 'n') { x0 = -HW + (i + 0.5) * (2 * HW / n); y0 = -HH; dx = (hash(i, 3) - 0.5) * 0.5; dy = 1; }
      else { x0 = (hash(i, 2) - 0.5) * 2 * HW * 0.8; y0 = (hash(i, 4) - 0.5) * 2 * HH * 0.8; const a = hash(i, 5) * TAU; dx = Math.cos(a); dy = Math.sin(a); }
      const L = (m.kind === 'e' ? 360 : 300) * (0.55 + 0.7 * hash(i, 6)) * grow, d = Math.hypot(dx, dy) || 1;
      let px = x0, py = y0; const pts = [[px, py]], seg = 28, N = Math.max(2, Math.round(L / seg));
      for (let j = 1; j <= N; j++) { const jx = (hash(j, i + seed) - 0.5) * 16, jy = (hash(j, i + seed + 9) - 0.5) * 16; px += dx / d * seg + jx * Math.abs(dy / d); py += dy / d * seg + jy * Math.abs(dx / d); pts.push([px, py]); }
      ctx.beginPath(); pts.forEach(([x, y], j) => { const q = pt(x, y); j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.strokeStyle = rgba(C.deep, 0.4 * k); ctx.lineWidth = 3.6; ctx.stroke(); ctx.strokeStyle = rgba(C.white, (0.4 + 0.5 * p) * k); ctx.lineWidth = 1.4; ctx.stroke();
      // a fork a little way down
      const f = pts[Math.max(1, Math.floor(pts.length * 0.5))], fa = Math.atan2(dy, dx) + (i % 2 ? 0.7 : -0.7), q0 = pt(f[0], f[1]), q1 = pt(f[0] + Math.cos(fa) * 70 * grow, f[1] + Math.sin(fa) * 70 * grow);
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.strokeStyle = rgba(C.white, (0.3 + 0.4 * p) * k); ctx.lineWidth = 1.1; ctx.stroke();
    }
    ctx.restore();
  }
  function hairTell(ctx, tg, s, p, k, t, env) { seamCracks(ctx, tg, p, k, t, env); ringTell(ctx, tg, s, p * 0.6, k * 0.55, t, env); }
  // an act's opener: a band of light crossing the floor from the mirror's side to the far wall
  function openTell(ctx, tg, s, p, k, t, env) {
    const m = mirrorOf(env.room), G = !!tg._vsm, e = easeIO(clamp(p, 0, 1)), W = 170, A = (0.06 + 0.12 * Math.sin(Math.PI * e)) * k;
    if (m.kind === 'e') {
      const x = G ? HW - 150 + (2 * HW + 300) * e : HW + 150 - (2 * HW + 300) * e, g = ctx.createLinearGradient(x - W, 0, x + W, 0);
      g.addColorStop(0, rgba(C.ice, 0)); g.addColorStop(0.5, rgba(C.white, A)); g.addColorStop(1, rgba(C.ice, 0)); ctx.fillStyle = g; ctx.fillRect(x - W, -HH - 40, W * 2, HH * 2 + 80);
    } else {
      const y = G ? -HH + 150 - (2 * HH + 300) * e : -HH - 150 + (2 * HH + 300) * e, g = ctx.createLinearGradient(0, y - W, 0, y + W);
      g.addColorStop(0, rgba(C.ice, 0)); g.addColorStop(0.5, rgba(C.white, A)); g.addColorStop(1, rgba(C.ice, 0)); ctx.fillStyle = g; ctx.fillRect(-HW - 40, y - W, HW * 2 + 80, W * 2);
    }
  }
  for (const tag of ['vbOpen', 'vbRing', 'vbHair']) TELLS[tag] = { raidwide: true, ground: tag === 'vbRing' ? ringTell : tag === 'vbHair' ? hairTell : openTell };

  // ---------------------------------------------------------------- what stays on the floor
  // a scar of a landing: kept here, drawn under the units in the room it landed in (the shared aftermath is clipped to the hall)
  function mark(room, glass, dur, draw, x, y) { S.marks.push({ t0: nowS(), dur, glass, draw, x, y, room }); if (S.marks.length > 40) S.marks.shift(); }
  function drawMarks(ctx, room, t) {
    const now = nowS();
    for (let i = S.marks.length - 1; i >= 0; i--) {
      const m = S.marks[i], age = now - m.t0;
      if (age >= m.dur || m.room !== room) { if (age >= m.dur) S.marks.splice(i, 1); continue; }
      const f = clamp(1 - (age - m.dur * 0.45) / (m.dur * 0.55), 0, 1) * clamp(age / 0.08, 0, 1);
      ctx.save(); clipRoom(ctx, m.glass, room);
      try { m.draw(ctx, f * 0.6, age, Math.floor(m.x * 7 + m.y * 3) & 1023); } finally { ctx.restore(); }
    }
  }

  // ---------------------------------------------------------------- the landings
  // the heroes a landing struck (their points in this copy's shape; a glass copy tests their twins)
  function struck(ctx, tg, G, pad = 6) {
    const room = ctx.room, hits = ctx.hitIds, out = [];
    for (const u of ctx.units || []) {
      if (hits && !hits.has(u.id)) continue;
      const q = G ? twinOf(room, u.x, u.y) : [u.x, u.y];
      if (SHAPES.contains(tg.live, q[0], q[1], pad)) out.push({ u, x: q[0], y: q[1] });
    }
    return out;
  }
  // glass thrown up off a point (the glass copy's are pale blue; the hall's silver)
  function glassUp(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || 1.4) : rand(0, TAU), sp = rand(90, 280) * (o.speed || 1);
      VFX.spawn({ x, y, z: rand(8, 28), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(130, 330) * (o.up || 1), g: 580, drag: 0.02, life: rand(0.5, 1.0), size: rand(5, 11) * (o.size || 1), size1: 1, color: i % 3 ? C.pane : C.white, kind: 'shard', add: false, vr: rand(-12, 12) });
    }
    VFX.sparks(x, y, { color: C.white, n: Math.round(n * 0.6), speed: 260 * (o.speed || 1), up: 60, g: 400 });
  }
  const landCol = G => (G ? C.frost : C.ice);
  // the whole shape lights and its rim burns white, then fades (drawn in its room)
  function flashShape(ctx, s, G, dur, a, col) {
    const room = ctx.room;
    fxIn(G, room, dur, (c, p, t, e) => {
      const k = (1 - p) * (1 - p) * e.a * flashK();
      SHAPES.trace(c, s); c.globalCompositeOperation = 'screen'; c.globalAlpha = a * k; c.fillStyle = col || landCol(G); c.fill('evenodd');
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.8 * k); c.strokeStyle = col || landCol(G); c.lineWidth = 10 * (1 - p) + 2; c.stroke();
      c.globalAlpha = Math.min(1, 1.2 * k); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.stroke();
    });
  }
  // a ring along the floor that stays in its room
  function ringAt(ctx, x, y, G, o = {}) {
    fxIn(G, ctx.room, o.dur || 0.5, (c, p, t, e) => { VFX.neonRing(c, x, y, (o.r0 || 0) + ((o.r || 90) - (o.r0 || 0)) * easeOut(p), o.color || landCol(G), (o.w || 5) * (1 - p * 0.7), e.a * (1 - p), 0.8); }, { delay: o.delay, layer: 'ground' });
  }
  // a blade line that goes through a place in an instant, then fades
  function slashLine(ctx, G, x1, y1, x2, y2, o = {}) {
    fxIn(G, ctx.room, o.dur || 0.34, (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.28, 0, 1)), k = e.a * (1 - clamp((p - 0.2) / 0.8, 0, 1));
      VFX.neonPath(c, o.color || landCol(G), (o.w || 12) * (1 - p * 0.5), k, () => { c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q); });
    }, { delay: o.delay });
  }
  function hurt(ctx, tg, G, o = {}) {
    for (const h of struck(ctx, tg, G, 6)) {
      VFX.hit(h.x, h.y, G ? C.frost : C.ice, o.size || 1.7);
      if (G) { crackFx(h.x, h.y, ctx.room, 0.9, G); glassUp(h.x, h.y - 6, 5, { size: 0.8 }); } else glassUp(h.x, h.y - 6, 3, { size: 0.7, speed: 0.8 });
      if (isMe(h.u)) flinch(C.frost, 0.09, 0.22, 0.016);
    }
  }
  // a pane cracking where a twin was struck: a star of cracks that holds a moment (in the glass, where the twin stands)
  function crackFx(x, y, room, big = 1, glass = true) {
    fxIn(glass, room, 0.9, (c, p, t, e) => { const k = e.a * (1 - clamp((p - 0.35) / 0.65, 0, 1)); crackStar(c, x, y, 34 * big * (0.4 + 0.6 * easeOut(clamp(p / 0.25, 0, 1))), 8, Math.floor(x * 3 + y) & 255, k, { w: 1.3, jag: 4, flat: 0.8 }); });
  }
  const shakeHall = (G, tag, n) => { if (!G || (tag || '')[1] === 'g') shakeNow(n); };
  const scar = (ctx, s, G, drawFn, dur = 4) => mark(ctx.room, G, dur, drawFn, s.x, s.y);

  // ---------------------------------------------------------------- weight: what a heavy blow does to the floor it lands on, and how the floor settles
  // The landings above are bright and quick; this is the room taking the blow and putting itself back. A low ring runs out along the polished floor from the cut,
  // standing ripples follow it and steady, a seam of light opens along the cut and closes again like water settling, and a few motes of glass dust hang a moment
  // and sink. Everything is drawn under the telegraphs and heroes (under(), below), clipped to the room the move landed in, faint, and gone in about three seconds,
  // so the floor is clean before the next warning. No shake, flash or sound is added: this is only the floor. mag: 0.3 a routine cut .. 1 Twin Verdict.
  const WT = { list: [] };
  const lite = () => typeof FX !== 'undefined' && FX.quality && FX.quality !== 'full';
  // where the floor's dent is centred and how far it reaches (the whole shape is dulled; the polish comes back from its edges in toward the cut)
  function padOf(s) {
    if (s.kind === 'cone') return { cx: s.x + Math.cos(s.angle) * s.r * 0.5, cy: s.y + Math.sin(s.angle) * s.r * 0.5, R: s.r * 0.62 };
    if (s.kind === 'circle') return { cx: s.x, cy: s.y, R: s.r * 1.02 };
    if (s.kind === 'donut') return { cx: s.x, cy: s.y, R: s.r * 1.02 };
    if (s.len != null) { const ca = Math.cos(s.angle), sa = Math.sin(s.angle); return { cx: s.x + ca * s.len * 0.5, cy: s.y + sa * s.len * 0.5, R: s.len * 0.56 + (s.w || 100) * 0.3 }; }
    return null;
  }
  function weightFx(tg, ctx, G, mag) {
    const s = tg.live; if (!s || WT.list.length > 14) return;
    const o = { t0: nowS(), room: ctx.room, glass: G, mag, dur: 3.2 + 1.5 * mag, seams: [], rings: null, circ: null, col: G ? C.frost : C.ice, pad: null, shape: Object.assign({}, s) };
    if (s.kind === 'cone') {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), h = s.arc / 2;
      for (const f of [0, -0.6, 0.6]) { const a = s.angle + f * h; o.seams.push([s.x + Math.cos(a) * s.r * 0.1, s.y + Math.sin(a) * s.r * 0.1, s.x + Math.cos(a) * s.r * (f ? 0.8 : 0.95), s.y + Math.sin(a) * s.r * (f ? 0.8 : 0.95)]); }
      o.rings = [s.x + ca * s.r * 0.55, s.y + sa * s.r * 0.55, clamp(s.r * 0.5, 90, 190) * (0.7 + 0.4 * mag)];
    } else if (s.kind === 'circle') {
      o.circ = [s.x, s.y, s.r * 0.94]; o.rings = [s.x, s.y, clamp(s.r * 1.25, 90, 240)];
    } else if (s.kind === 'donut') {
      o.circ = [s.x, s.y, s.r2 + 2]; o.rings = [s.x, s.y, s.r2 + 150 * mag, s.r2];
    } else if (s.len != null) {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      o.seams.push([s.x, s.y, s.x + ca * s.len, s.y + sa * s.len]);
      o.rings = [s.x + ca * s.len * 0.5, s.y + sa * s.len * 0.5, clamp(s.len * 0.25, 80, 170) * (0.7 + 0.4 * mag)];
    } else return;
    o.pad = padOf(s);
    WT.list.push(o);
    // glass dust: a few motes that rise a little off the cut, hang, and sink back
    const n = Math.round((lite() ? 5 : 12) * mag) + 3, src = o.seams[0] || [o.rings[0], o.rings[1], o.rings[0], o.rings[1]];
    for (let i = 0; i < n; i++) {
      const q = rand(0.15, 1), x = src[0] + (src[2] - src[0]) * q + rand(-14, 14), y = src[1] + (src[3] - src[1]) * q + rand(-8, 8);
      VFX.spawn({ x, y, z: rand(0, 8), vx: rand(-14, 14), vy: rand(-6, 6), vz: rand(34, 80) * (0.5 + mag), g: 40, drag: 0.04, life: rand(2.2, 3.6), size: rand(5, 9), size1: 2, color: G ? C.pane : C.white, kind: 'glow', add: false, ground: true, a: 0.7, fadeIn: 0.12 });
    }
  }
  function drawWeight(ctx, room) {
    const now = nowS();
    for (let i = WT.list.length - 1; i >= 0; i--) {
      const o = WT.list[i], age = now - o.t0;
      if (age >= o.dur) { WT.list.splice(i, 1); continue; }
      if (o.room !== room) continue;
      const q = age / o.dur, m = o.mag;
      ctx.save(); clipRoom(ctx, o.glass, room); ctx.lineCap = 'round';
      if (o.pad && o.shape) {   // the dent: the polish dulls under the whole cut at once, holds, and comes back from the edges in toward the seam
        const pd = o.pad, rec = clamp((q - 0.3) / 0.7, 0, 1), rk = pd.R * (1.05 - 1.0 * easeOut(rec)), ka = clamp(age / 0.07, 0, 1) * (1 - 0.3 * rec) * Math.min(1, 0.4 + 0.5 * m);
        if (rk > 6 && ka > 0.01) {
          ctx.save(); SHAPES.trace(ctx, o.shape); ctx.clip('evenodd');
          const gr = ctx.createRadialGradient(pd.cx, pd.cy, rk * 0.5, pd.cx, pd.cy, rk);
          gr.addColorStop(0, 'rgba(6,12,30,' + (0.4 * ka) + ')'); gr.addColorStop(0.7, 'rgba(6,12,30,' + (0.34 * ka) + ')'); gr.addColorStop(1, 'rgba(6,12,30,0)');
          ctx.fillStyle = gr; ctx.fillRect(pd.cx - rk - 2, pd.cy - rk - 2, 2 * rk + 4, 2 * rk + 4);
          ctx.restore();
        }
      }
      if (o.rings) {   // the ring along the floor, and the ripples that follow it and steady
        const [rx, ry, R, R0] = o.rings, base = R0 || 0, qa = clamp(age / 0.6, 0, 1), front = base + (R - base) * easeOut(qa);
        for (let j = 0; j < 4; j++) {
          const r = front - j * (14 + 6 * m) * (0.4 + 0.6 * qa) + Math.sin(age * 6 - j) * 2.4 * (1 - q) * (1 - q);
          if (r <= base + 2) continue;
          const a = (j === 0 ? 1 : 0.8 / (1 + j * 0.4)) * Math.min(1, 1.15 * m) * Math.pow(1 - q, 1.1) * (j === 0 ? 1 - qa * 0.6 : clamp(age / 0.12 - j * 0.3, 0, 1));
          if (a < 0.01) continue;
          ctx.beginPath(); ctx.ellipse(rx, ry, r, r * 0.8, 0, 0, TAU);
          ctx.strokeStyle = 'rgba(8,16,36,' + (a * 0.8) + ')'; ctx.lineWidth = (7 + 3 * m) * (1 - q * 0.5); ctx.stroke();
          ctx.strokeStyle = rgba(j ? o.col : C.white, a * 1.5); ctx.lineWidth = 1.2 + 1.4 * m; ctx.stroke();
        }
      }
      // the seam of light along the cut: its two edges close together and the light goes out of it
      const qs = clamp((age - 0.12) / (o.dur * 0.78), 0, 1), gap = (4 + 13 * m) * (1 - qs) * (1 - qs), sa = 0.8 * Math.pow(1 - qs, 0.7) * clamp(age / 0.06, 0, 1);
      if (sa > 0.01) {
        for (const sg of o.seams) {
          const dx = sg[2] - sg[0], dy = sg[3] - sg[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * gap / 2, ny = dx / L * gap / 2;
          ctx.strokeStyle = rgba('#050b1c', sa * 0.5); ctx.lineWidth = gap * 1.2 + 2; ctx.beginPath(); ctx.moveTo(sg[0], sg[1]); ctx.lineTo(sg[2], sg[3]); ctx.stroke();
          ctx.strokeStyle = rgba(C.white, sa * 0.22); ctx.lineWidth = gap * 1.8 + 3; ctx.beginPath(); ctx.moveTo(sg[0], sg[1]); ctx.lineTo(sg[2], sg[3]); ctx.stroke();
          ctx.strokeStyle = rgba(C.white, sa); ctx.lineWidth = 1.6 + 0.8 * m;
          ctx.beginPath(); ctx.moveTo(sg[0] + nx, sg[1] + ny); ctx.lineTo(sg[2] + nx, sg[3] + ny); ctx.moveTo(sg[0] - nx, sg[1] - ny); ctx.lineTo(sg[2] - nx, sg[3] - ny); ctx.stroke();
        }
        if (o.circ) { const [cx, cy, cr] = o.circ; ctx.strokeStyle = rgba(C.white, sa); ctx.lineWidth = 1.2; for (const d of [gap / 2, -gap / 2]) { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1, cr + d), Math.max(1, cr + d), 0, 0, TAU); ctx.stroke(); } }
      }
      ctx.restore();
    }
  }
  const WEIGHT_MAG = { vgLay: 0.4, vhShard: 0.4, vhShatter: 0.8, vbEvenfall: 0.5, vhCounter: 0.8, vgCounter: 0.8, vhCross: 0.55, vgCross: 0.55, vhBackhand: 0.55, vgBackhand: 0.55, vbThread: 0.4, vbTwoThread: 0.4 };

  const IMP = {};
  // Evenfall: the cut goes through the cone in a breath, a crescent of light thrown off the far edge, glass flying off it
  IMP.vbEvenfall = (tg, msg, ctx, G) => {
    const s = tg.live, hs = G ? -1 : 1;
    flashShape(ctx, s, G, 0.5, 0.26);
    fxIn(G, ctx.room, 0.5, (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.32, 0, 1)), k = e.a * (1 - clamp((p - 0.22) / 0.78, 0, 1)), h = s.arc / 2, a1 = s.angle + hs * (-h + 2 * h * q), a0 = s.angle - hs * h;
      c.save(); c.translate(s.x, s.y);
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s.r, Math.min(a0, a1), Math.max(a0, a1)); c.closePath();
      const g = c.createRadialGradient(0, 0, 10, 0, 0, s.r); g.addColorStop(0, rgba(landCol(G), 0.05 * k)); g.addColorStop(1, rgba(landCol(G), 0.4 * k)); c.fillStyle = g; c.fill();
      VFX.neonPath(c, landCol(G), 12 * (1 - p * 0.5), k, () => { c.moveTo(Math.cos(a1) * s.r * 0.08, Math.sin(a1) * s.r * 0.08); c.lineTo(Math.cos(a1) * s.r, Math.sin(a1) * s.r); });
      VFX.neonPath(c, landCol(G), 7, k * 0.8, () => c.arc(0, 0, s.r - 4, Math.min(a0, a1), Math.max(a0, a1)));
      c.restore();
    });
    for (let i = 0; i < 7; i++) { const a = s.angle + (i / 6 - 0.5) * s.arc * 0.9; after(i * 0.03, () => glassUp(s.x + Math.cos(a) * (s.r - 14), s.y + Math.sin(a) * (s.r - 14), 3, { angle: a, spread: 0.8, size: 0.9 })); }
    hurt(ctx, tg, G, { size: 2 });
    scar(ctx, s, G, (c, a, age, seed) => { for (let i = 0; i < 3; i++) { const an = s.angle + (i / 2 - 0.5) * s.arc * 0.8; crack(c, s.x + Math.cos(an) * s.r * 0.3, s.y + Math.sin(an) * s.r * 0.3, s.x + Math.cos(an) * s.r * (0.82 + 0.1 * hash(i, seed)), s.y + Math.sin(an) * s.r * (0.82 + 0.1 * hash(i, seed)), seed + i, a, { w: 1.1, jag: 3, seg: 36 }); } }, 3.2);
    shakeHall(G, tg.tag, 8);
  };

  // Lay Glass: the shards come down: each circle bursts, a ring, a star of cracks that holds, glass thrown up
  function layLand(tg, ctx, G, rise) {
    const s = tg.live, x = s.x, y = s.y, r = s.r;
    flashShape(ctx, s, G, 0.5, 0.3);
    ringAt(ctx, x, y, G, { r: r * 1.5, w: 7, dur: 0.55 }); ringAt(ctx, x, y, G, { r: r * 0.9, w: 4, dur: 0.45, delay: 0.05, color: C.white });
    fxIn(G, ctx.room, 0.9, (c, p, t, e) => { const k = e.a * (1 - clamp((p - 0.3) / 0.7, 0, 1)); crackStar(c, x, y, r * (0.5 + 0.7 * easeOut(clamp(p / 0.2, 0, 1))), 9, tg.id, k, { w: 1.6, jag: 5, flat: 0.9 }); glow(c, x, y, r * 0.9, C.ice, 0.35 * k); });
    if (rise) VFX.crystals(x, y, { r: r * 0.7, n: 8, h: 54, color: C.ice, dur: 0.8 });
    glassUp(x, y, 13, { size: 1.1 }); VFX.smoke(x, y, { n: 2, color: '#dbe8f6', size: 30, a: 0.4, speed: 80, r: r * 0.5 });
    hurt(ctx, tg, G, { size: 1.9 });
    scar(ctx, s, G, (c, a, age, seed) => { crackStar(c, x, y, r * 0.95, 9, seed, a, { w: 1.4, jag: 4, flat: 0.9 }); for (let i = 0; i < 6; i++) { const an = hash(i, seed) * TAU, d = r * (0.3 + 0.6 * hash(i, seed + 1)); shardPoly(c, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.9, 8, 2.6, hash(i, seed + 2) * TAU, rgba(C.pane, 0.8 * a), rgba(C.white, a), 0.8); } }, 4.2);
    shakeHall(G, tg.tag, 5);
  }
  IMP.vgLay = (tg, msg, ctx, G) => layLand(tg, ctx, G, false);
  IMP.vhShard = (tg, msg, ctx, G) => layLand(tg, ctx, G, true);

  // Twin Verdict: the sword comes down along the cone: a bar of light down its axis, the floor splitting along it, a ring where it bites
  function verdictLand(tg, msg, ctx, G) {
    const s = tg.live, e = tg.target != null && ctx.entById ? ctx.entById(tg.target) : null;
    const ex = G && e ? twinOf(ctx.room, e.x, e.y) : e ? [e.x, e.y] : [s.x + Math.cos(s.angle) * s.r * 0.6, s.y + Math.sin(s.angle) * s.r * 0.6];
    const x = ex[0], y = ex[1], L = Math.hypot(x - s.x, y - s.y);
    flashShape(ctx, s, G, 0.5, 0.22);
    slashLine(ctx, G, s.x, s.y, s.x + Math.cos(s.angle) * s.r * 0.95, s.y + Math.sin(s.angle) * s.r * 0.95, { w: 14, dur: 0.42, color: C.hi });
    slashLine(ctx, G, s.x, s.y, s.x + Math.cos(s.angle) * s.r * 0.95, s.y + Math.sin(s.angle) * s.r * 0.95, { w: 8, dur: 0.3, color: C.white });
    fxIn(G, ctx.room, 0.5, (c, p, t, e2) => { const k = e2.a * (1 - p) * (1 - p); inCone(c, s, (r, h) => { for (const sg of [-1, 1]) { const ca = Math.cos(sg * h), sa = Math.sin(sg * h); blade(c, ca * r * 0.1, sa * r * 0.1, ca * r, sa * r, k, 3); } }); });
    VFX.hit(x, y, landCol(G), 2.0);
    ringAt(ctx, x, y, G, { r: 150, w: 8, dur: 0.55 }); ringAt(ctx, x, y, G, { r: 85, w: 5, dur: 0.4, delay: 0.05, color: C.white });
    glassUp(x, y, 14, { size: 1.2, speed: 1.2 });
    for (let d = 70; d < Math.min(L + 40, s.r); d += 80) { const px = s.x + Math.cos(s.angle) * d, py = s.y + Math.sin(s.angle) * d; after(d / s.r * 0.12, () => glassUp(px, py, 2, { size: 0.8 })); }
    if (G) crackFx(x, y, ctx.room, 1.6, G);
    if (isMe({ id: tg.target })) flinch(C.ice, 0.12, 0.25, 0.022);
    scar(ctx, s, G, (c, a, age, seed) => { crack(c, s.x + Math.cos(s.angle) * 40, s.y + Math.sin(s.angle) * 40, s.x + Math.cos(s.angle) * s.r * 0.9, s.y + Math.sin(s.angle) * s.r * 0.9, seed, a, { w: 2.2, jag: 5, seg: 30 }); crackStar(c, x, y, 52, 8, seed, a, { w: 1.4, flat: 0.8 }); }, 4.5);
    shakeHall(G, tg.tag, 10); if (!G) camFx(0.07, 0.03, 0.4);
  }

  // Counterpoint: the close ring is a ring of blade round her, thrown out; the far one a wall of light going out from the inner edge to the walls of the glass
  IMP.vhCounter = (tg, msg, ctx, G) => {
    const s = tg.live, x = s.x, y = s.y;
    flashShape(ctx, s, G, 0.5, 0.28);
    ringAt(ctx, x, y, G, { r: s.r * 1.25, w: 10, dur: 0.5, color: C.hi }); ringAt(ctx, x, y, G, { r: s.r * 0.7, w: 5, dur: 0.4, delay: 0.04, color: C.white });
    fxIn(G, ctx.room, 0.5, (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p), a = p * 6; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x, y, s.r * (0.9 + 0.3 * p), a + i * 2.1, a + i * 2.1 + 1.3); c.strokeStyle = rgba(C.white, k); c.lineWidth = 6 * (1 - p); c.stroke(); } });
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; glassUp(x + Math.cos(a) * s.r * 0.92, y + Math.sin(a) * s.r * 0.92, 2, { angle: a, spread: 0.4, size: 0.9 }); }
    hurt(ctx, tg, G, { size: 2 });
    scar(ctx, s, G, (c, a, age, seed) => { c.beginPath(); c.arc(x, y, s.r * 0.94, 0, TAU); c.strokeStyle = rgba(C.silver, 0.6 * a); c.lineWidth = 2.4; c.stroke(); crackStar(c, x, y, s.r * 0.9, 10, seed, a, { w: 1.2, jag: 4 }); }, 3.6);
    shakeHall(G, tg.tag, 8);
  };
  IMP.vgCounter = (tg, msg, ctx, G) => {
    const s = tg.live, x = s.x, y = s.y;
    flashShape(ctx, s, G, 0.55, 0.22);
    fxIn(G, ctx.room, 0.7, (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.7, 0, 1)), r = s.r2 + (Math.min(s.r, 700) - s.r2) * q, k = e.a * (1 - p) * (1 - p);
      VFX.neonRing(c, x, y, r, landCol(G), 12 * (1 - p * 0.6), k, 1);
      VFX.neonRing(c, x, y, s.r2 + 4, C.white, 5, k * 1.2, 1);
    });
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + 0.1; glassUp(x + Math.cos(a) * (s.r2 + 10), y + Math.sin(a) * (s.r2 + 10), 2, { angle: a, spread: 0.4, size: 1 }); }
    hurt(ctx, tg, G, { size: 2 });
    scar(ctx, s, G, (c, a, age, seed) => { c.beginPath(); c.arc(x, y, s.r2 + 2, 0, TAU); c.strokeStyle = rgba(C.silver, 0.6 * a); c.lineWidth = 3; c.stroke(); for (let i = 0; i < 18; i++) { const an = i * TAU / 18 + hash(i, seed) * 0.2; crack(c, x + Math.cos(an) * (s.r2 + 4), y + Math.sin(an) * (s.r2 + 4), x + Math.cos(an) * (s.r2 + 60 + 80 * hash(i, seed + 1)), y + Math.sin(an) * (s.r2 + 60 + 80 * hash(i, seed + 1)), seed + i, a * 0.8, { w: 1.1, jag: 4 }); } }, 3.8);
    shakeHall(G, tg.tag, 7);
  };

  // Cross-Cut and Backhand: the blade goes through the band across its width, a streak of light on the far edge, glass thrown off it
  function crossLand(tg, msg, ctx, G) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), pa = s.angle + Math.PI / 2, nx = Math.cos(pa), ny = Math.sin(pa);
    const cx = s.x + ca * s.len / 2, cy = s.y + sa * s.len / 2, v = cx * nx + cy * ny; let sg = v >= 0 ? 1 : -1; if (G) sg = -sg;
    flashShape(ctx, s, G, 0.5, 0.26);
    fxIn(G, ctx.room, 0.5, (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.34, 0, 1)), k = e.a * (1 - clamp((p - 0.22) / 0.78, 0, 1)), hw = s.w / 2, y0 = -sg * hw, y1 = y0 + sg * 2 * hw * q;
      c.save(); c.translate(s.x, s.y); c.rotate(s.angle);
      const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(landCol(G), 0.04 * k)); g.addColorStop(1, rgba(landCol(G), 0.4 * k)); c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), s.len, Math.abs(y1 - y0));
      VFX.neonPath(c, landCol(G), 13 * (1 - p * 0.5), k, () => { c.moveTo(0, y1); c.lineTo(s.len, y1); });
      c.restore();
    });
    const n = Math.round(Math.min(s.len, 1000) / 70);
    for (let i = 0; i <= n; i++) { const d = i / n * s.len, ex = s.x + ca * d + nx * sg * s.w / 2, ey = s.y + sa * d + ny * sg * s.w / 2; after(i / n * 0.14, () => glassUp(ex, ey, 2, { angle: pa * 1 + (sg > 0 ? 0 : Math.PI), spread: 1.2, size: 0.9 })); }
    hurt(ctx, tg, G, { size: 2 });
    scar(ctx, s, G, (c, a, age, seed) => { const ex = s.x + nx * sg * s.w / 2, ey = s.y + ny * sg * s.w / 2; crack(c, ex, ey, ex + ca * s.len, ey + sa * s.len, seed, a, { w: 2, jag: 4, seg: 34 }); }, 3.6);
    shakeHall(G, tg.tag, 8);
  }
  IMP.vhCross = crossLand; IMP.vgCross = crossLand; IMP.vhBackhand = crossLand; IMP.vgBackhand = crossLand;

  // Silver Thread: the thread snaps taut and goes through its length as one blade of white; the knot flares, sparks fly off the end
  function threadLand(tg, msg, ctx, G) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), x2 = s.x + ca * s.len, y2 = s.y + sa * s.len;
    flashShape(ctx, s, G, 0.55, 0.28);
    slashLine(ctx, G, s.x, s.y, x2, y2, { w: 16, dur: 0.46, color: landCol(G) });
    slashLine(ctx, G, s.x, s.y, x2, y2, { w: 6, dur: 0.34, color: C.white });
    fxIn(G, ctx.room, 0.6, (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p);
      c.save(); c.translate(s.x, s.y); c.rotate(s.angle); c.lineCap = 'round';
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); for (let x = 6; x <= s.len; x += 8) c.lineTo(x, sg * Math.sin(x * 0.09 - p * 40) * 12 * p * Math.sin(Math.PI * x / s.len)); c.strokeStyle = rgba(C.white, 0.8 * k); c.lineWidth = 1.6; c.stroke(); }
      c.restore();
    });
    VFX.hit(s.x, s.y, landCol(G), 1.6); VFX.hit(x2, y2, landCol(G), 1.6);
    for (let d = 40; d < s.len; d += 60) { const px = s.x + ca * d, py = s.y + sa * d; after(d / s.len * 0.16, () => VFX.sparks(px, py, { color: C.white, n: 3, speed: 240, angle: s.angle + Math.PI / 2, spread: Math.PI })); }
    hurt(ctx, tg, G, { size: 2 });
    scar(ctx, s, G, (c, a, age, seed) => { crack(c, s.x, s.y, x2, y2, seed, a, { w: 1.8, jag: 3, seg: 40 }); }, 3.4);
    shakeHall(G, tg.tag, 8);
  }
  IMP.vbThread = threadLand; IMP.vbTwoThread = threadLand;

  // the sword dance: each cut lands harder than the last: more light, a longer streak, a heavier shake, and the last one stops the frame
  function cutLand(tg, msg, ctx, G) {
    const s = tg.live, ck = cutK(s), fin = ck === 5, hv = HEAVY(ck), hs = G ? -1 : 1;
    flashShape(ctx, s, G, 0.45 + 0.2 * hv, 0.2 + 0.2 * hv);
    if (s.kind === 'cone') {
      fxIn(G, ctx.room, 0.45 + 0.2 * hv, (c, p, t, e) => {
        const q = easeOut(clamp(p / (0.3 - 0.03 * ck), 0, 1)), k = e.a * (1 - clamp((p - 0.2) / 0.8, 0, 1)), h = s.arc / 2, a1 = s.angle + hs * (-h + 2 * h * q), a0 = s.angle - hs * h;
        c.save(); c.translate(s.x, s.y);
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s.r, Math.min(a0, a1), Math.max(a0, a1)); c.closePath();
        const g = c.createRadialGradient(0, 0, 10, 0, 0, s.r); g.addColorStop(0, rgba(landCol(G), 0.04 * k)); g.addColorStop(1, rgba(landCol(G), (0.28 + 0.22 * hv) * k)); c.fillStyle = g; c.fill();
        for (let g2 = (fin ? 4 : 1 + Math.floor(ck / 2)); g2 >= 0; g2--) { const ag = a1 - hs * g2 * 0.1; VFX.neonPath(c, landCol(G), (9 + 8 * hv) * (1 - p * 0.5) * (g2 ? 0.6 : 1), k * (g2 ? 0.5 / g2 : 1), () => { c.moveTo(Math.cos(ag) * s.r * 0.08, Math.sin(ag) * s.r * 0.08); c.lineTo(Math.cos(ag) * s.r, Math.sin(ag) * s.r); }); }
        VFX.neonPath(c, C.white, 4 + 3 * hv, k * 0.8, () => c.arc(0, 0, s.r - 4, Math.min(a0, a1), Math.max(a0, a1)));
        c.restore();
      });
      const nE = 6 + 2 * ck + (fin ? 8 : 0);
      for (let i = 0; i < nE; i++) { const a = s.angle + (i / (nE - 1) - 0.5) * s.arc * 0.92; after(i * 0.02, () => glassUp(s.x + Math.cos(a) * (s.r - 14), s.y + Math.sin(a) * (s.r - 14), 2 + (fin ? 2 : ck >= 3 ? 1 : 0), { angle: a, spread: 0.7, size: 0.9 + 0.2 * hv, speed: 1 + 0.2 * ck })); }
    } else {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), x2 = s.x + ca * s.len, y2 = s.y + sa * s.len;
      slashLine(ctx, G, s.x, s.y, x2, y2, { w: 14 + 8 * hv + (fin ? 10 : 0), dur: 0.42 + 0.1 * hv, color: landCol(G) });
      slashLine(ctx, G, s.x, s.y, x2, y2, { w: 5 + 2 * hv, dur: 0.32, color: C.white });
      if (ck >= 2) slashLine(ctx, G, s.x - ca * 30, s.y - sa * 30, x2, y2, { w: 8, dur: 0.3, delay: 0.04, color: C.ice });
      fxIn(G, ctx.room, 0.6, (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p); c.save(); c.translate(s.x, s.y); c.rotate(s.angle); for (const sg of [-1, 1]) blade(c, 0, sg * s.w / 2, s.len, sg * s.w / 2, k, 2.4 + hv * 2); c.restore(); });
      const step = fin ? 46 : 70 - 6 * ck;
      for (let d = 30; d < s.len; d += step) { const px = s.x + ca * d, py = s.y + sa * d; after(d / s.len * 0.14, () => VFX.sparks(px, py, { color: C.white, n: 2 + (fin ? 2 : 0), speed: 220 + 30 * ck, angle: s.angle + Math.PI / 2, spread: Math.PI })); }
      VFX.hit(x2, y2, landCol(G), 1.2 + 0.3 * ck);
    }
    hurt(ctx, tg, G, { size: 1.7 + 0.18 * ck + (fin ? 0.8 : 0) });
    if (fin) { ringAt(ctx, s.x, s.y, G, { r: 420, w: 14, dur: 0.8, color: C.hi }); ringAt(ctx, s.x, s.y, G, { r: 260, w: 8, dur: 0.7, delay: 0.08, color: C.white }); }
    scar(ctx, s, G, (c, a, age, seed) => {
      if (s.kind === 'cone') { for (let i = 0; i < 3 + (fin ? 3 : 0); i++) { const an = s.angle + (i / (2 + (fin ? 3 : 0)) - 0.5) * s.arc * 0.85; crack(c, s.x + Math.cos(an) * s.r * 0.25, s.y + Math.sin(an) * s.r * 0.25, s.x + Math.cos(an) * s.r * 0.88, s.y + Math.sin(an) * s.r * 0.88, seed + i, a, { w: 1.2 + 0.2 * ck, jag: 3, seg: 36 }); } }
      else crack(c, s.x, s.y, s.x + Math.cos(s.angle) * s.len, s.y + Math.sin(s.angle) * s.len, seed, a, { w: 1.8 + 0.3 * ck, jag: 3, seg: 40 });
    }, fin ? 5 : 3.6);
    shakeHall(G, tg.tag, 5 + 2.2 * ck + (fin ? 8 : 0));
    if (fin && !G) camFx(0.12, 0.05, 0.6); else if (ck >= 3 && !G) camFx(0.04, 0.02, 0.35);
  }
  IMP.vhCut = cutLand; IMP.vgCut = cutLand;

  // a soak met: the note rings: two rings of light and a column; a soak missed is a pane that does not ring, dull, cracking
  IMP.vbSoak = (tg, msg, ctx, G) => {
    const s = tg.live, x = s.x, y = s.y, ok = !msg.fail, col = ok ? C.blue : C.glass;
    flashShape(ctx, s, G, ok ? 0.5 : 0.35, ok ? 0.3 : 0.18, ok ? '#7fb4ff' : C.glass);
    ringAt(ctx, x, y, G, { r: s.r * 1.9, w: 8, dur: 0.7, color: ok ? '#9fc8ff' : C.glass }); ringAt(ctx, x, y, G, { r: s.r * 1.1, w: 5, dur: 0.5, delay: 0.06, color: C.white });
    if (ok) { fxIn(G, ctx.room, 0.7, (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p), h = 200 * easeOut(clamp(p / 0.4, 0, 1)); const g = c.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, rgba('#bcd8ff', 0.5 * k)); g.addColorStop(1, rgba('#bcd8ff', 0)); c.fillStyle = g; c.fillRect(x - s.r * 0.45, y - h, s.r * 0.9, h); }); VFX.motes(x, y - 10, { n: 10, color: C.ice, r: 34, rise: 1.6 }); }
    else { fxIn(G, ctx.room, 0.9, (c, p, t, e) => crackStar(c, x, y, s.r * 0.95, 9, tg.id, e.a * (1 - clamp((p - 0.3) / 0.7, 0, 1)), { w: 1.6, jag: 5, flat: 0.9 })); glassUp(x, y, 8, { size: 1 }); }
    for (const h of struck(ctx, tg, G, 4)) if (ok) VFX.hit(h.x, h.y, '#bcd8ff', 1.3);
    shakeHall(G, tg.tag, ok ? 3 : 6);
  };

  // Hand Mirror: the pane lets go: a burst of glass, a ring, light through the cracks
  IMP.vhShatter = (tg, msg, ctx, G) => {
    const s = tg.live, x = s.x, y = s.y;
    flashShape(ctx, s, G, 0.6, 0.36, C.white);
    ringAt(ctx, x, y, G, { r: s.r * 1.8, w: 9, dur: 0.6 }); ringAt(ctx, x, y, G, { r: s.r * 1.0, w: 5, dur: 0.45, delay: 0.05, color: C.white });
    fxIn(G, ctx.room, 0.9, (c, p, t, e) => crackStar(c, x, y, s.r * (0.5 + 0.8 * easeOut(clamp(p / 0.2, 0, 1))), 12, tg.id, e.a * (1 - clamp((p - 0.3) / 0.7, 0, 1)), { w: 1.8, jag: 6, flat: 0.9 }));
    glassUp(x, y, 22, { size: 1.3, speed: 1.3 }); VFX.crystals(x, y, { r: s.r * 0.7, n: 8, h: 60, color: C.ice, dur: 0.8 });
    hurt(ctx, tg, G, { size: 2 });
    scar(ctx, s, G, (c, a, age, seed) => { crackStar(c, x, y, s.r, 12, seed, a, { w: 1.4 }); for (let i = 0; i < 12; i++) { const an = hash(i, seed) * TAU, d = s.r * (0.2 + 0.7 * hash(i, seed + 1)); shardPoly(c, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.9, 9, 3, hash(i, seed + 2) * TAU, rgba(C.pane, 0.8 * a), rgba(C.white, a), 0.8); } }, 4.2);
    shakeHall(G, tg.tag, 9);
  };

  // the raidwides: Ring True: the bell is struck: rings out to the walls in both rooms; Hairline Fracture the cracks flash white through both; an opener a soft light
  IMP.vbRing = (tg, msg, ctx, G) => {
    const room = ctx.room, b = ctx.bossDraw || { x: 0, y: -60 }, c0 = G ? twinOf(room, b.x, b.y) : [b.x, b.y], R = ARENA.R;
    for (let i = 0; i < 3; i++) fxIn(G, room, 0.9 + i * 0.1, (c, p, t, e) => VFX.neonRing(c, c0[0], c0[1], 40 + (R * (1.5 - i * 0.2)) * easeOut(p), i % 2 ? C.white : C.pane, (11 - i * 3) * (1 - p * 0.6), e.a * (1 - p), 0.8), { delay: i * 0.1, layer: 'ground' });
    fxIn(G, room, 0.7, (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p) * flashK(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.2 * k; c.fillStyle = G ? C.frost : C.ice; c.fillRect(-1600, -1600, 3200, 3200); });
    VFX.flash(c0[0], c0[1] - 30, 110, C.white, 0.3);
    if (!G) shakeNow(6);
  };
  IMP.vbHair = (tg, msg, ctx, G) => {
    const room = ctx.room;
    fxIn(G, room, 0.8, (c, p, t, e) => { const k = e.a * (1 - clamp((p - 0.15) / 0.85, 0, 1)) * flashK(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.16 * k; c.fillStyle = G ? C.frost : C.ice; c.fillRect(-1600, -1600, 3200, 3200); c.globalCompositeOperation = 'source-over'; seamCracks(c, { _vsm: G }, 1, k * 1.1, t, { room }); });
    if (!G) { shakeNow(5); }
  };
  IMP.vbOpen = (tg, msg, ctx, G) => {
    const room = ctx.room;
    fxIn(G, room, 0.8, (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p) * flashK(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.12 * k; c.fillStyle = G ? C.frost : C.ice; c.fillRect(-1600, -1600, 3200, 3200); });
    if (!G) shakeNow(3);
  };

  // ---------------------------------------------------------------- the room's own beats (roomev), the net, and a frame of floor
  // a thread locking: the knot flares as the blade is set; a Backhand's first cut folded away: a ripple where it was
  function roomEvent(room, msg, now) {
    const k = msg.k;
    if (k === 'vsfracture') S.fracPend.push({ pid: msg.pid, at: nowS(), dur: msg.dur || 6.2 });
    else if (k === 'vsthread') {
      const ends = [[msg.x1, msg.y1, false], [...twinOf(room, msg.x1, msg.y1), true]];
      for (const q of ends) glint2(q[0], q[1], q[2]);
    }
  }
  function glint2(x, y, G) { VFX.flash(x, y - 10, 44, G ? C.frost : C.white, 0.3); VFX.shock(x, y, { r: 54, color: C.ice, w: 3, dur: 0.35, flat: 0.8 }); }

  // a hero's twin was struck: Fracture is on them: a crack mark under their feet and a slow flake of glass off them, pulsing as each tick lands
  function fracture(ctx, t, v) {
    const now = nowS();
    while (S.fracPend.length) {
      const f = S.fracPend.shift(); S.frac.set(f.pid, { t0: f.at, end: f.at + f.dur });
      const u = S.pos.get(f.pid); if (u) { glassUp(u.x, u.y - 10, 7, { size: 0.9, speed: 0.8 }); VFX.flash(u.x, u.y - 20, 44, C.frost, 0.3); }
    }
    for (const [id, f] of S.frac) {
      if (now > f.end + 0.3) { S.frac.delete(id); continue; }
      const u = S.pos.get(id); if (!u) continue;
      const age = now - f.t0, k = clamp(1 - (age - f.end + f.t0 - 0.3) / 0.6, 0, 1) * clamp(age / 0.15, 0, 1), tick = (age - 1.5) % 1.5, pulse = age > 1.5 && tick < 0.3 ? 1 - tick / 0.3 : 0;
      ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
      crackStar(ctx, u.x, u.y + 4, 24 + 6 * pulse, 7, 41 + (id | 0), (0.5 + 0.4 * pulse) * k, { w: 1.2, jag: 3, flat: 0.55, col: C.ice });
      glow(ctx, u.x, u.y + 4, 22 + 10 * pulse, C.frost, (0.14 + 0.3 * pulse) * k);
      ctx.restore();
    }
  }
  function under(ctx, room, t, v) {
    if (!ArenaView.amb || ArenaView.amb.kind !== 'argent') return;
    if (room !== S.room || t < S.lastT - 1) { S.room = room; WT.list.length = 0; S.marks.length = 0; S.pos.clear(); S.frac.clear(); S.fracPend.length = 0; }
    S.lastT = t;
    for (const u of (v && v.units) || []) S.pos.set(u.id, u);
    drawMarks(ctx, room, t);
    drawWeight(ctx, room);
    fracture(ctx, t, v);
  }

  // ---------------------------------------------------------------- the body: what gathers on her for each pose (boss-vfx.js castStart)
  // H: { drawIn, emit, beat, soon, own } from boss-vfx.js. She is upright, about 170 px tall at b.x, b.y; her blade is in her hands (about 30 px to the side of her middle)
  function cast(sh, b, dur, anim, name, H) {
    const own = e => H.own(sh, e), bx = () => b.x, by = () => b.y, hx = () => b.x + 14, hy = () => b.y - 62;
    const pulse = (c, p) => 0.85 + 0.15 * Math.sin(p * 40);
    if (anim === 'evenfall') {
      // the blade goes back over the shoulder: a long line of light gathers along it, the glints running to its tip
      own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.94) / 0.06, 0, 1)), L = 70 + 80 * easeOut(p);
        c.save(); blade(c, hx() - 4, hy() + 26, hx() - 8 - L * 0.4, hy() - L, (0.35 + 0.6 * p) * k, 2.8); glint(c, hx() - 8 - L * 0.4, hy() - L, 14 + 22 * p, (0.4 + 0.5 * p) * k * pulse(c, t), 0.3); c.restore();
      } }));
      H.drawIn(sh, dur, () => ({ x: hx(), y: hy() }), { color: C.ice, color2: C.white, r: 70, z: 20, rate: 0.5 });
    } else if (anim === 'laying') {
      // glass gathering over her head: small panes turning, rising, a chill on the floor round her
      own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.25) * (1 - clamp((p - 0.94) / 0.06, 0, 1));
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * (0.8 + p), R = 30 + 16 * Math.sin(t + i); shardPoly(c, bx() + Math.cos(a) * R, by() - 130 - 30 * p + Math.sin(a) * R * 0.3, 11, 3.6, a + t * 3, rgba(C.pane, 0.7 * k), rgba(C.white, 0.9 * k), 1); }
        glow(c, bx(), by() - 130, 46 + 24 * p, C.ice, (0.1 + 0.3 * p) * k);
      } }));
      H.drawIn(sh, dur, () => ({ x: bx(), y: by() - 120 }), { color: C.pane, color2: C.white, r: 80, z: 0, rate: 0.4, glow: false });
    } else if (anim === 'verdict') {
      // the blade straight up in both hands: a lance of light climbs from it, a chevron running up
      own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.95) / 0.05, 0, 1)), h = 60 + 220 * easeOut(clamp(p / 0.85, 0, 1)), x = hx(), base = hy() - 40, w = 5 + 9 * p;
        const g = c.createLinearGradient(x, base, x, base - h); g.addColorStop(0, rgba(C.white, 0.7 * k)); g.addColorStop(1, rgba(C.frost, 0)); c.fillStyle = g; c.fillRect(x - w, base - h, w * 2, h);
        blade(c, x, base, x, base - h, (0.5 + 0.5 * p) * k, 2.6);
        for (let i = 0; i < 4; i++) { const y = base - ((t * (150 + 160 * p) + i * h / 4) % h), f2 = 1 - (base - y) / h; c.beginPath(); c.moveTo(x - 12, y + 12); c.lineTo(x, y); c.lineTo(x + 12, y + 12); c.strokeStyle = rgba(C.ice, 0.6 * f2 * k); c.lineWidth = 1.8; c.stroke(); }
        glint(c, x, base - h, 24 + 28 * p, (0.3 + 0.6 * p) * k, 0);
      } }));
    } else if (anim === 'ringtrue') {
      // the blade drawn back to strike the wall: a faint ring at the point and rings going slowly out from her, quickening
      H.beat(sh, dur, 0.9, () => { VFX.shock(bx(), by() + 10, { r: 160, color: C.pane, w: 3, dur: 0.9, flat: 0.8 }); });
      H.drawIn(sh, dur, () => ({ x: hx(), y: hy() }), { color: C.white, r: 60, z: 14, rate: 0.35 });
    } else if (anim === 'counter') {
      // the low blade behind her: a ring of light turning round her feet
      own(VFX.fx({ dur: dur + 0.2, layer: 'ground', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.94) / 0.06, 0, 1));
        c.save(); for (let i = 0; i < 2; i++) { const a = t * (1.3 + 2.4 * p) * (i ? -1 : 1), r = (i ? 58 : 84); c.beginPath(); c.ellipse(bx(), by() + 12, r, r * 0.55, 0, a, a + 1.5); c.strokeStyle = rgba(C.silver, (0.3 + 0.5 * p) * k); c.lineWidth = 2.4; c.stroke(); }
        c.restore();
      } }));
    } else if (anim === 'crossL' || anim === 'crossR') {
      // the blade drawn across her body: a long band of light along the line she will cut, gathering
      const sg = anim === 'crossL' ? -1 : 1;
      own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.95) / 0.05, 0, 1)), L = 40 + 110 * easeOut(p), y = hy() + 20;
        blade(c, bx() - sg * L * 0.7, y + 4, bx() + sg * L, y - 6, (0.35 + 0.55 * p) * k, 2.6);
        glint(c, bx() + sg * L, y - 6, 14 + 22 * p, (0.3 + 0.6 * p) * k, 0);
      } }));
    } else if (anim === 'thread') {
      // a thread paid out of her hand: a spiral of silver motes drawn out toward the wall she faces
      H.emit(sh, dur, 0.9, (p) => { const a = rand(-0.5, 0.5) - Math.PI / 2; VFX.spawn({ x: hx(), y: hy() + 10, z: 20, vx: Math.cos(a) * 60 + rand(-20, 20), vy: Math.sin(a) * 40, vz: rand(0, 30), life: rand(0.5, 0.9), size: rand(4, 7), size1: 1, color: C.white, kind: 'glow', add: true }); });
      H.drawIn(sh, dur, () => ({ x: hx(), y: hy() }), { color: C.ice, r: 60, z: 14, rate: 0.3 });
    } else if (anim === 'dance') {
      // the dance: she is quick: after-images of light stepping off her, harder as it climbs
      H.beat(sh, dur, 0.6, (p) => { VFX.shock(bx(), by() + 10, { r: 120 + 80 * p, color: C.ice, w: 3, dur: 0.4, flat: 0.8 }); VFX.sparks(bx(), by() - 40, { color: C.white, n: 5, speed: 260 }); });
      H.drawIn(sh, dur, () => ({ x: bx(), y: by() - 50 }), { color: C.white, color2: C.ice, r: 90, z: 10, rate: 0.5 });
    } else if (anim === 'planted') {
      // the blade driven into the floor: light drawn down to its point, rings running out across the floor
      own(VFX.fx({ dur: dur + 0.2, layer: 'ground', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.15) * (1 - clamp((p - 0.94) / 0.06, 0, 1));
        for (let i = 0; i < 3; i++) { const q = (p * 1.4 + i / 3) % 1; c.beginPath(); c.ellipse(bx() + 12, by() + 8, 30 + q * 170, (30 + q * 170) * 0.6, 0, 0, TAU); c.strokeStyle = rgba(C.pane, (1 - q) * (0.2 + 0.5 * p) * k); c.lineWidth = 2; c.stroke(); }
      } }));
      H.drawIn(sh, dur, () => ({ x: bx() + 12, y: by() + 4 }), { color: C.white, color2: C.ice, r: 70, z: 6, rate: 0.5 });
    } else if (anim === 'kneel') {
      // on one knee, the point in the floor: frost gathering along the seam under her, a long slow breath of cold
      own(VFX.fx({ dur: dur + 0.6, layer: 'ground', draw: (c, p, t, e) => {
        const grow = easeOut(clamp(p / 0.6, 0, 1)), k = e.a * (1 - clamp((p - 0.8) / 0.2, 0, 1)); c.save();
        crackStar(c, bx(), by() + 8, 150 * grow, 9, 77, 0.55 * k, { w: 1.4, jag: 6, flat: 0.75 });
        c.beginPath(); c.ellipse(bx(), by() + 8, 120 * grow, 90 * grow, 0, 0, TAU); c.strokeStyle = rgba(C.pane, 0.35 * k); c.lineWidth = 1.8; c.stroke(); c.restore();
      } }));
    } else if (anim === 'turn') {
      // the mirror turning: a pillar of white standing on her and the air drawn in
      own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p / 0.25) * (1 - clamp((p - 0.95) / 0.05, 0, 1)), h = 60 + 280 * easeOut(p), x = bx(), w = 6 + 16 * p;
        const g = c.createLinearGradient(x, by(), x, by() - h); g.addColorStop(0, rgba(C.white, 0.5 * k)); g.addColorStop(1, rgba(C.frost, 0)); c.fillStyle = g; c.fillRect(x - w, by() - h, w * 2, h);
      } }));
      H.drawIn(sh, dur, () => ({ x: bx(), y: by() - 40 }), { color: C.ice, color2: C.white, r: 110, z: 0, rate: 0.6 });
    }
  }

  // ---------------------------------------------------------------- the enrage, the entrance, the fall (plain ones: the showpieces are the staging lane's)
  // Last Reflection: every pane in the hall crazing, the seam burning brighter to the last second, the floor going cold blue
  function enrage(sh, b, dur, H) {
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => H.wash(c, '#3a5ea8', e.a * 0.2 * Math.min(1, t / dur), 'multiply') }));
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'air', draw: (c, p, t, e) => {
      const q = clamp(t / dur, 0, 1), k = e.a * easeOut(clamp(t / 2, 0, 1)) * (1 - clamp((t - dur) / 2.5, 0, 1));
      c.save(); ARENA.trace(c, 2); c.clip();
      for (let i = 0; i < 16; i++) { const a = hash(i, 5) * TAU, x0 = Math.cos(a) * 60, y0 = Math.sin(a) * 40, L = (200 + 360 * hash(i, 6)) * q; crack(c, x0, y0, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L * 0.75, i + 3, (0.25 + 0.6 * q) * k, { w: 1.4, jag: 8, seg: 28 }); }
      c.restore();
    } }));
    [0.35, 0.6, 0.8, 0.94].forEach((f, i) => H.soon(sh, f * dur, () => { H.shockAt(b.x, b.y, { r: H.AR * 1.3, color: i % 2 ? C.white : C.pane, w: 8 + i * 2, dur: 1.0, flat: 0.8 }); H.shake(4 + i * 2); }));
    H.emit(sh, dur + 2, 0.4, () => { const q = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(10, 40), vz: rand(20, 60), vx: rand(-20, 20), life: rand(1.2, 2), size: rand(4, 8), size1: 1, color: C.white, kind: 'glow', add: false, a: 0.8 }); });
  }
  function enrageLand(b, H) {
    // (thin and few, and only a faint cold tint: the floor is never washed over; walls/vesper.js adds the cracks and the dark that follows)
    for (let i = 0; i < 2; i++) H.shockAt(0, 0, { r: H.AR * (1.4 - i * 0.3), color: i % 2 ? C.white : C.pane, w: 6 - i * 2, dur: 0.9 + i * 0.1, flat: 0.8, delay: i * 0.1 });
    H.roomTint('#9fc4ff', 0.12, 0.7);
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 14)) glassUp(q.x, q.y, 4, { size: 1.2 });
    H.shake(16);
  }
  function intro(sh, b, H) {
    H.soon(sh, 0.3, () => { H.shockAt(b.x, b.y, { r: 260, color: C.pane, w: 7, dur: 0.9, flat: 0.8 }); });
    H.emit(sh, 1.8, 0.7, () => { const a = rand(0, TAU), d = rand(0, 60); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.5, z: rand(0, 60), vz: rand(20, 70), vx: rand(-14, 14), life: rand(1.0, 1.8), size: rand(4, 8), size1: 1, color: C.white, kind: 'glow', add: false, a: 0.8 }); });
    H.soon(sh, 1.6, () => { H.shockAt(b.x, b.y, { r: 150, color: C.white, w: 4, dur: 0.6, flat: 0.8 }); H.shake(3); });
  }
  function death(sh, b, H) {
    H.soon(sh, 0.4, () => { H.shockAt(b.x, b.y, { r: 300, color: C.pane, w: 9, dur: 0.9, flat: 0.8 }); H.shake(7); });
    H.emit(sh, 2.8, 0.5, () => { glassUp(b.x + rand(-40, 40), b.y + rand(-50, 20), 2, { size: 1, up: 0.8, speed: 0.7 }); });
    H.soon(sh, 1.8, () => { H.shockAt(b.x, b.y, { r: 420, color: C.white, w: 11, dur: 1.1, flat: 0.8 }); H.shake(9); });
  }

  return {
    tell: tag => TELLS[tag] || null,
    buster: busterTell,
    cast, enrage, enrageLand, intro, death, under, roomEvent,
    // (boss-vfx.js impact(): her moves land here; a tag it does not know falls through to the shared ones)
    impact(tg, msg, ctx, H) {
      const f = tg.type === 'buster' ? verdictLand : IMP[tg.tag]; if (!f) return false;
      const G = glassImp(tg);
      ctx = Object.assign({}, ctx, { hitIds: Array.isArray(msg && msg.hits) ? new Set(msg.hits) : null });
      f(tg, msg || {}, ctx, G);
      try {   // (the floor takes the blow and settles: weightFx above)
        const ck = tg.tag === 'vhCut' || tg.tag === 'vgCut' ? cutK(tg.live) : -1;
        const mag = tg.type === 'buster' ? 1.6 : ck >= 0 ? 1.35 * (ck === 5 ? 0.6 : 0.3 + 0.06 * ck) : 1.35 * (WEIGHT_MAG[tg.tag] || 0);   // (a buster is the heaviest ordinary thing she does: 1.6; the rest follow)
        if (mag) weightFx(tg, ctx, G, mag);
      } catch (e) { /* cosmetic */ }
      return true;
    },
    S,
  };
})();

// the room hooks: ArenaView's drawRoomUnder (the scars the landings leave and the Fracture on a struck hero, under the units) and roomEvent, wrapped from
// here the way garrow-fx.js does
if (typeof ArenaView !== 'undefined') {
  const baseUnder = ArenaView.drawRoomUnder, baseEvent = ArenaView.roomEvent;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    baseUnder.call(this, ctx, room, t, v);
    if (!room || !room.ev) return;
    try { VS_FX.under(ctx, room, t, v); } catch (e) { try { ctx.restore(); } catch (e2) { /* cosmetic */ } }
  };
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = baseEvent.call(this, room, msg, now, ...rest);
    try { if (msg && typeof msg.k === 'string' && msg.k.indexOf('vs') === 0) VS_FX.roomEvent(room, msg, now); } catch (e) { /* cosmetic */ }
    return r;
  };
}
