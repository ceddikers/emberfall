// Maelis Orne, the Pale Regent: the room she is fought in, drawn in code. The face of the moon: a round floor of radius 560 centred on
// (0, 0) (ARENA_DEFS.maelis, a circle) of pale dust, calm and nearly flat, with craters so faint they could be a trick of the light, a
// bright lip and a dark drop all round it so that its edge is never in doubt; and beyond it a black sky. The world hangs in that sky,
// large, over the room's north-east corner, mostly in shadow: a thin lit limb along the side that faces the moon and, on the night side,
// one small cluster of lit windows (the only warm colour in the room, and in the set's palette: silver, black, frost blue and that).
// Loaded after arena-view.js. It adds buildMoon / moonLife to ArenaView (arena-view.js: buildFloor picks it by boss id 'maelis',
// drawAmbient by amb.kind 'moon'). Preview: tools/preview/moon-room.html.
//
// The dust is kept quiet on purpose (everything on the floor is under about 0.12 alpha, in a narrow range of pale silver-blue grey) so that
// a red or a blue telegraph, even one that covers most of the room, reads instantly. The floor layer holds only what never changes; footprints
// are a later lane's and are drawn over it (a plain canvas layer under the units: nothing here is drawn above the floor except the dimming
// and the red cast, and those are drawn in the ambient pass, which lies under every telegraph).
//
// THE ROOM STATE. Read from the live room (ArenaView.liveRoom.ev, room events stored as { ...msg, start, end, dur }); the latest event
// of a kind is the state, its dur is ignored, and every value eases (about 0.4 s for the dark, 1.5 s for the red), none snaps:
//   mlroom   { dark: 0..1, red: 0..1, form: 1 | 2 }   the one event that carries all three (send it each time one changes)
//   mlnight  { on: 0 | 1 }                             (what maelis.js sends for the wall: New Moon) on = dark 1, off = dark 0
//   mldark   { v | dark: 0..1 }                        (or just this) the wall: the floor dims toward black and the world's light with it, but the
//                                                      dust stays readable (at 1 it is about a third as bright); nothing a telegraph is
//                                                      drawn with is dimmed, the dimming lies under it
//   mlform   { n: 1 | 2 }                              (the art's event too) 2 is the Wild Hunt: a thin cold wind of pale dust drifts over the
//                                                      floor and a slow veil of frost crosses the sky
//   mlcrown  { red: 0..1, ... }                        (the crown's event: if `red` is not in mlroom, the sky follows the eclipse on the crown)
//   red      0..1  the last act's blood moon: the sky goes a deep dark red (never bright), the stars blot out, the dust takes a faint
//            dark-red cast and the world's lit limb turns copper
// (A harness may instead set liveRoom.moon = { dark, red, form }.) With nothing at all: dark 0, red 0, form 1.
//
// GEOMETRY (a contract with the fight script): R = 560, centre (0, 0). The world is drawn at (WORLD.x, WORLD.y) = (590, -520), radius 215,
// outside the floor. The floor's own colours (for tuning telegraphs against it): dust #aab2c1 at the middle, #929bab near the lip,
// craters at most 0.12 alpha, the lip #e9eff9.

const MN_ROOM = (() => {
  const R = 560;
  const WORLD = { x: 590, y: -520, r: 215 };
  const WARM = '#ffb865', WARMH = '#ffe3ae';
  const lerp = (a, b, q) => a + (b - a) * q;
  const sstep = (a, b, x) => { const q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h); return cv; };
  function soft(c, x, y, rx, ry, rot, col, a) { c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(1, ry / rx); glow(c, 0, 0, rx, col, a); c.restore(); }

  // ------------------------------------------------------------------------------------------------------------ the world
  // The sprite is centred, a little bigger than the disc (the haze round it). cop: the last act's colour for its lit limb.
  const LIGHT = Math.atan2(0.5, -0.86);   // the lit limb is on the side that faces the moon (lower left)
  function worldSprite(sc, cop) {
    const r = WORLD.r, half = r + 70, cv = mk(half * 2 * sc, half * 2 * sc), c = cv.getContext('2d');
    c.scale(sc, sc); c.translate(half, half);
    const ux = Math.cos(LIGHT), uy = Math.sin(LIGHT);
    const P = cop
      ? { rim: '#e4a074', mid: '#b2552a', lo: '#6c2813', haze: '#9c3d1c', hazeO: '#5a1a0c' }
      : { rim: '#f2f8ff', mid: '#8fbdf0', lo: '#3c6aa8', haze: '#7fb4f0', hazeO: '#3a64a8' };
    // the haze round it: thin air lit on the moon's side
    soft(c, ux * r * 0.3, uy * r * 0.3, r * 0.95, r * 0.95, 0, P.haze, cop ? 0.16 : 0.14);
    const hg = c.createRadialGradient(0, 0, r - 2, 0, 0, r + 26); hg.addColorStop(0, rgba(P.haze, 0.16)); hg.addColorStop(1, rgba(P.haze, 0));
    c.fillStyle = hg; c.beginPath(); c.arc(0, 0, r + 26, 0, TAU); c.fill();
    // the night side: a near-black blue ball, a little paler toward the middle, its edge hardly there
    const ng = c.createRadialGradient(-ux * r * 0.25, -uy * r * 0.25, r * 0.1, 0, 0, r);
    ng.addColorStop(0, '#0a1327'); ng.addColorStop(0.7, '#060c19'); ng.addColorStop(1, '#03060e');
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = ng; c.fill();
    // faint continents on the dark: slightly paler blots, only just
    const rr = rng(3301);
    c.save(); c.beginPath(); c.arc(0, 0, r - 1, 0, TAU); c.clip();
    for (let i = 0; i < 9; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * r * 0.8; soft(c, Math.cos(a) * d, Math.sin(a) * d, 34 + rr() * 60, 22 + rr() * 40, rr() * 3, '#16253f', 0.14 + rr() * 0.1); }
    c.restore();
    // the lit limb: the disc less a copy of itself shifted away from the light, so a crescent that is thickest toward the moon and runs
    // out to nothing at both horns; a band of cloud streaks in it; and a rim of light on the very edge
    c.save();
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
    const lg = c.createRadialGradient(ux * r, uy * r, 0, ux * r, uy * r, r * 0.5);
    lg.addColorStop(0, P.rim); lg.addColorStop(0.35, P.mid); lg.addColorStop(1, P.lo);
    c.beginPath(); c.arc(0, 0, r + 2, 0, TAU); c.arc(-ux * r * 0.1, -uy * r * 0.1, r, 0, TAU, true);   // (the outside of the shifted disc, inside the real one)
    c.fillStyle = lg; c.fill('evenodd');
    // a soft falloff on the dark side of the terminator
    const fg = c.createRadialGradient(-ux * r * 0.1, -uy * r * 0.1, r * 0.8, -ux * r * 0.1, -uy * r * 0.1, r * 1.06); fg.addColorStop(0, rgba(P.mid, 0)); fg.addColorStop(0.62, rgba(P.mid, 0.2)); fg.addColorStop(1, rgba(P.mid, 0));
    c.fillStyle = fg; c.beginPath(); c.arc(-ux * r * 0.1, -uy * r * 0.1, r * 1.06, 0, TAU); c.fill();
    // clouds streaking across the limb
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = LIGHT + (rr() - 0.5) * 1.5, d = r * (0.9 + rr() * 0.07), l = 14 + rr() * 38, x = Math.cos(a) * d, y = Math.sin(a) * d;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.sin(a) * l, y + Math.cos(a) * l); c.strokeStyle = rgba(P.rim, 0.14 + rr() * 0.16); c.lineWidth = 1.5 + rr() * 2.4; c.stroke();
    }
    c.restore();
    c.beginPath(); c.arc(0, 0, r - 0.5, LIGHT - 1.25, LIGHT + 1.25); c.strokeStyle = rgba(P.rim, 0.85); c.lineWidth = 1.4; c.stroke();
    return { cv, half };
  }
  // the windows: one small cluster on the night side, toward the far limb. Positions on the world's disc.
  const TOWN = (() => {
    const r = rng(8812), a0 = LIGHT + Math.PI + 0.35, d0 = WORLD.r * 0.5, cx = Math.cos(a0) * d0, cy = Math.sin(a0) * d0, w = [];
    for (let i = 0; i < 17; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 26; w.push({ x: cx + Math.cos(a) * d * 1.2, y: cy + Math.sin(a) * d * 0.8, big: i < 3, ph: r() * 9, k: 0.6 + r() * 0.9 }); }
    w.push({ x: cx, y: cy, big: true, ph: 1.3, k: 0.7 });
    return { cx, cy, w };
  })();

  // ------------------------------------------------------------------------------------------------------------ the dust
  // one crater: a shallow dish. The light comes from the world (upper right): the dish is a touch darker on the far (lower left) side,
  // and its rim catches it on the upper right.
  function crater(c, x, y, r, a) {
    c.save(); c.translate(x, y);
    circle(c, 0, 0, r, rgba('#3a4660', 0.06 * a));
    circle(c, r * 0.12, -r * 0.12, r * 0.86, rgba('#c7cfdd', 0.06 * a));
    c.beginPath(); c.arc(0, 0, r, -Math.PI * 0.95, -Math.PI * 0.05); c.strokeStyle = rgba('#ffffff', 0.09 * a); c.lineWidth = Math.max(0.8, r * 0.045); c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.arc(0, 0, r, Math.PI * 0.1, Math.PI * 0.95); c.strokeStyle = rgba('#2c3650', 0.08 * a); c.lineWidth = Math.max(0.8, r * 0.04); c.stroke();
    c.restore();
  }
  function floorDisc(c) {
    const r = rng(5871);
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    // the base: pale silver-blue grey, a touch darker toward the lip (the ground curves away), a wash of the world's light from the upper right
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, '#adb5c3'); g.addColorStop(0.7, '#a2abbb'); g.addColorStop(1, '#8c95a7');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    const lw = c.createLinearGradient(R * 0.6, -R * 0.6, -R * 0.6, R * 0.6); lw.addColorStop(0, 'rgba(236,244,255,0.1)'); lw.addColorStop(0.5, 'rgba(236,244,255,0)'); lw.addColorStop(1, 'rgba(8,14,34,0.1)');
    c.fillStyle = lw; c.fillRect(-R, -R, R * 2, R * 2);
    // the big flat basins: very wide, very soft, a shade off the base
    for (let i = 0; i < 6; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.78; soft(c, Math.cos(a) * d, Math.sin(a) * d, 90 + r() * 120, 70 + r() * 90, r() * 3, r() < 0.5 ? '#c4ccda' : '#7d8799', 0.07 + r() * 0.05); }
    // craters, from big and old to small and sharp
    const big = [];
    for (let i = 0, tries = 0; i < 11 && tries < 200; tries++) { const a = r() * TAU, d = Math.sqrt(r()) * (R - 90), x = Math.cos(a) * d, y = Math.sin(a) * d, rr = 38 + r() * 56; if (big.some(b => Math.hypot(b.x - x, b.y - y) < b.r + rr + 12)) continue; big.push({ x, y, r: rr }); crater(c, x, y, rr, 0.8 + r() * 0.2); i++; }
    for (let i = 0; i < 46; i++) { const a = r() * TAU, d = Math.sqrt(r()) * (R - 24); crater(c, Math.cos(a) * d, Math.sin(a) * d, 8 + r() * 26, 0.7 + r() * 0.3); }
    for (let i = 0; i < 150; i++) { const a = r() * TAU, d = Math.sqrt(r()) * (R - 14), s = 2 + r() * 5.5; circle(c, Math.cos(a) * d, Math.sin(a) * d, s, rgba('#2e3852', 0.06 + r() * 0.05)); circle(c, Math.cos(a) * d + s * 0.25, Math.sin(a) * d - s * 0.25, s * 0.55, rgba('#e8eef8', 0.07)); }
    // a few long, faint rays thrown out from the biggest craters
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = r() * TAU, d0 = 60 + r() * 220, l = 80 + r() * 160, aa = r() * TAU; c.beginPath(); c.moveTo(Math.cos(a) * d0, Math.sin(a) * d0); c.lineTo(Math.cos(a) * d0 + Math.cos(aa) * l, Math.sin(a) * d0 + Math.sin(aa) * l); c.strokeStyle = rgba('#e8eef8', 0.035); c.lineWidth = 5 + r() * 9; c.stroke(); }
    // fine grain
    for (let i = 0; i < 1100; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; circle(c, Math.cos(a) * d, Math.sin(a) * d, 0.4 + r() * 0.8, r() < 0.55 ? 'rgba(255,255,255,0.1)' : 'rgba(20,30,56,0.1)'); }
    // the lip: the ground rolls away toward the edge, a darker band
    const vg = c.createRadialGradient(0, 0, R - 70, 0, 0, R); vg.addColorStop(0, 'rgba(14,22,44,0)'); vg.addColorStop(1, 'rgba(14,22,44,0.26)');
    c.fillStyle = vg; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    // the edge: a bright lip with a dark line outside it and the drop beyond, a thin halo of frost on the void
    c.beginPath(); c.arc(0, 0, R - 3, 0, TAU); c.strokeStyle = 'rgba(233,239,249,0.95)'; c.lineWidth = 5; c.stroke();
    c.beginPath(); c.arc(0, 0, R - 8.5, 0, TAU); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, 0, R + 1.5, 0, TAU); c.strokeStyle = '#02040a'; c.lineWidth = 3.4; c.stroke();
    const dg = c.createRadialGradient(0, 0, R + 3, 0, 0, R + 46); dg.addColorStop(0, 'rgba(1,2,6,0.85)'); dg.addColorStop(0.35, 'rgba(1,2,6,0.5)'); dg.addColorStop(1, 'rgba(1,2,6,0)');
    c.fillStyle = dg; c.beginPath(); c.arc(0, 0, R + 46, 0, TAU); c.arc(0, 0, R + 3, 0, TAU, true); c.fill('evenodd');
    const hg = c.createRadialGradient(0, 0, R + 3, 0, 0, R + 30); hg.addColorStop(0, 'rgba(170,205,255,0.2)'); hg.addColorStop(1, 'rgba(170,205,255,0)');
    c.fillStyle = hg; c.beginPath(); c.arc(0, 0, R + 30, 0, TAU); c.arc(0, 0, R + 3, 0, TAU, true); c.fill('evenodd');
  }

  // ------------------------------------------------------------------------------------------------------------ the sky
  function sky(c, bx, by) {
    const r = rng(2203);
    c.fillStyle = '#02040a'; c.fillRect(-bx, -by, bx * 2, by * 2);
    const g = c.createRadialGradient(0, 0, R * 0.8, 0, 0, Math.hypot(bx, by)); g.addColorStop(0, '#070c19'); g.addColorStop(0.5, '#04070f'); g.addColorStop(1, '#02030a');
    c.fillStyle = g; c.fillRect(-bx, -by, bx * 2, by * 2);
    // a faint band of the galaxy across the margin, and a few soft clouds of far light
    c.save(); c.rotate(-0.55);
    const bg = c.createLinearGradient(0, -170, 0, 170); bg.addColorStop(0, 'rgba(120,160,230,0)'); bg.addColorStop(0.5, 'rgba(120,160,230,0.07)'); bg.addColorStop(1, 'rgba(120,160,230,0)');
    c.fillStyle = bg; c.fillRect(-bx * 1.6, -170, bx * 3.2, 340);
    for (let i = 0; i < 40; i++) { const x = (r() * 2 - 1) * bx * 1.2, y = (r() - 0.5) * 220; soft(c, x, y, 40 + r() * 70, 22 + r() * 40, 0, '#9cb8ea', 0.04 + r() * 0.04); }
    c.restore();
    // the stars: mostly small and pale, a few brighter and blue-white
    for (let i = 0; i < 360; i++) {
      const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by, k = r(), s = k < 0.86 ? 0.5 + r() * 0.5 : 0.9 + r() * 0.9;
      circle(c, x, y, s, rgba(k < 0.7 ? '#cfdcf2' : k < 0.9 ? '#e8f0ff' : '#a8c6ff', 0.25 + r() * 0.6));
      if (k > 0.95) glow(c, x, y, 7, '#a8c6ff', 0.25);
    }
    // the edge of the picture goes to the plain black the screen is filled with
    for (const [x0, y0, x1, y1] of [[-bx, 0, -bx + 220, 0], [bx, 0, bx - 220, 0], [0, -by, 0, -by + 220], [0, by, 0, by - 220]]) {
      const eg = c.createLinearGradient(x0, y0, x1, y1); eg.addColorStop(0, 'rgba(2,4,10,1)'); eg.addColorStop(1, 'rgba(2,4,10,0)'); c.fillStyle = eg;
      if (y0 === 0 && x0 < 0) c.fillRect(-bx, -by, 220, by * 2); else if (y0 === 0) c.fillRect(bx - 220, -by, 220, by * 2); else if (y0 < 0) c.fillRect(-bx, -by, bx * 2, 220); else c.fillRect(-bx, by - 220, bx * 2, 220);
    }
  }

  // ------------------------------------------------------------------------------------------------------------ the floor
  function buildMoon(c, bx, by) {
    const m = typeof c.getTransform === 'function' ? c.getTransform() : null, sc = m ? clamp(Math.hypot(m.a, m.b), 1, 1.5) : 1;
    sky(c, bx, by);
    floorDisc(c);
    const r = rng(7741);
    // the stars that twinkle (in the life), outside the floor
    const tw = [];
    while (tw.length < 26) { const x = (r() * 2 - 1) * (bx - 40), y = (r() * 2 - 1) * (by - 40); if (Math.hypot(x, y) > R + 40 && Math.hypot(x - WORLD.x, y - WORLD.y) > WORLD.r + 40) tw.push({ x, y, ph: r() * 9, k: 0.5 + r() * 1.1, big: r() < 0.3 }); }
    ArenaView.amb = {
      kind: 'moon', bx, by, sc, tw,
      world: { frost: worldSprite(sc, false), cop: worldSprite(sc, true) },
      cur: { dark: 0, red: 0, form: 1 }, last: NaN, shoot: { t0: -99, seed: 0 },
      dust: Array.from({ length: 22 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 0.8, ph: r() * 9, a: 0.1 + r() * 0.1 })),
      glints: Array.from({ length: 14 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * (R - 30); return { x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * 20, P: 5 + r() * 7 }; }),
    };
  }

  // ------------------------------------------------------------------------------------------------------------ the life
  function target(room) {
    const ev = (room && room.ev) || {}, T = { dark: 0, red: 0, form: 1 }, h = room && room.moon;
    const rm = ev.mlroom, dk = ev.mldark, fm = ev.mlform, cr = ev.mlcrown;
    if (h) { T.dark = +h.dark || 0; T.red = +h.red || 0; T.form = h.form === 2 ? 2 : 1; }
    if (rm) { if (rm.dark != null) T.dark = +rm.dark; if (rm.red != null) T.red = +rm.red; if (rm.form != null) T.form = rm.form === 2 ? 2 : 1; }
    if (ev.mlnight && ev.mlnight.on != null) T.dark = ev.mlnight.on ? 1 : 0;
    if (dk) { const v = dk.v != null ? dk.v : dk.dark; if (v != null) T.dark = +v; }
    if (fm && fm.n != null) T.form = fm.n === 2 ? 2 : 1;
    if (!(rm && rm.red != null) && !(h && h.red != null) && cr && cr.red != null) T.red = +cr.red;
    T.dark = clamp(T.dark, 0, 1); T.red = clamp(T.red, 0, 1);
    return T;
  }
  function moonLife(ctx, a, t) {
    const room = ArenaView.liveRoom, T = target(room);
    let dt = a.last === a.last ? t - a.last : 0; if (dt < 0 || dt > 0.25) dt = dt < 0 ? 0 : 0.25; a.last = t;
    const cur = a.cur, k = r => 1 - Math.exp(-r * dt);
    cur.dark += (T.dark - cur.dark) * k(5); cur.red += (T.red - cur.red) * k(2.2); cur.form += (T.form - cur.form) * k(2.5);
    if (dt === 0 && a.cur.first == null) { cur.dark = T.dark; cur.red = T.red; cur.form = T.form; cur.first = 1; }
    const dark = cur.dark, red = cur.red, hunt = clamp(cur.form - 1, 0, 1), bx = a.bx, by = a.by;
    // ---- the world, with its limb frost-blue or copper
    const w = a.world, half = w.frost.half, sz = half * 2;
    ctx.save();
    ctx.globalAlpha = 1 - dark * 0.45;
    if (red < 0.995) { ctx.globalAlpha = (1 - red) * (1 - dark * 0.45); ctx.drawImage(w.frost.cv, WORLD.x - half, WORLD.y - half, sz, sz); }
    if (red > 0.005) { ctx.globalAlpha = red * (1 - dark * 0.45); ctx.drawImage(w.cop.cv, WORLD.x - half, WORLD.y - half, sz, sz); }
    ctx.restore();
    // the windows of the town on its night side: a few small lights, now and then one dips
    ctx.save(); ctx.translate(WORLD.x, WORLD.y); ctx.globalCompositeOperation = 'lighter';
    TOWN.w.forEach((p, i) => {
      const tw = 0.85 + 0.1 * Math.sin(t * (0.7 + (i % 4) * 0.23) + p.ph) + 0.05 * Math.sin(t * 2.9 + i), dip = (t * 0.6 + i * 3.7) % 17 < 0.22 ? 0.55 : 1, v = tw * dip * (1 - dark * 0.25);
      if (p.big) glow(ctx, p.x, p.y, 13, WARM, 0.45 * v); else glow(ctx, p.x, p.y, 7, WARM, 0.28 * v);
      ctx.fillStyle = rgba(p.big ? WARMH : WARM, Math.min(1, (p.big ? 1 : 0.85) * v)); const s = p.big ? 3.2 : 2.2; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    });
    glow(ctx, TOWN.cx, TOWN.cy, 46, WARM, 0.1);
    ctx.restore();
    // ---- the twinkling stars (they blot out as the sky reddens), and now and then a falling one, over the margin only
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of a.tw) {
      const q = 0.5 + 0.5 * Math.sin(t * s.k + s.ph), al = (0.25 + 0.55 * q) * (1 - red * 0.8) * (1 - dark * 0.3);
      glow(ctx, s.x, s.y, s.big ? 10 : 6, '#cfe0ff', 0.3 * al);
      ctx.fillStyle = rgba('#ffffff', 0.9 * al); ctx.fillRect(s.x - 0.8, s.y - 0.8, 1.6, 1.6);
      if (s.big && q > 0.6) { const L = 3 + 5 * (q - 0.6) / 0.4; ctx.strokeStyle = rgba('#ffffff', 0.5 * al); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y); ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L); ctx.stroke(); }
    }
    const sh = a.shoot;
    if (t - sh.t0 > 16 + (sh.seed % 7)) { sh.t0 = t; sh.seed = Math.floor(t * 7.3) + 1; }
    const sq = (t - sh.t0) / 1.1;
    if (sq >= 0 && sq < 1) {
      const hs = x => { const v = Math.sin(x * 127.1 + sh.seed * 311.7) * 43758.5453; return v - Math.floor(v); };
      const sx = -bx * 0.8 + hs(1) * bx * 0.5, sy = -by * 0.7 + hs(2) * by * 0.3, ex = sx + 280, ey = sy + 110;
      if (Math.hypot(sx + 140, sy + 55) > R + 30) {
        const x = lerp(sx, ex, sq), y = lerp(sy, ey, sq), al = Math.sin(sq * Math.PI) * (1 - red * 0.8);
        const lg = ctx.createLinearGradient(x - 70, y - 28, x, y); lg.addColorStop(0, 'rgba(200,225,255,0)'); lg.addColorStop(1, rgba('#ffffff', 0.8 * al));
        ctx.strokeStyle = lg; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 70, y - 28); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    ctx.restore();
    // ---- the Hunt: a slow veil of frost crossing the sky, and over the floor a thin wind of pale dust
    if (hunt > 0.01) {
      ctx.save(); ctx.globalAlpha = hunt * (1 - red * 0.5);
      for (let i = 0; i < 6; i++) { const q = ((t * 0.012 + i / 6) % 1), x = -bx + q * bx * 2, y = ((i * 211) % 400) - 200 + Math.sin(t * 0.1 + i) * 30; soft(ctx, x, y * 2.2, 220, 38, -0.25, '#9cb8ea', 0.05); }
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R - 2, 0, TAU); ctx.clip(); ctx.globalAlpha = hunt;
      for (const d of a.dust) {
        const x = (((d.x + t * 0.03 * d.s + Math.sin(t * 0.2 + d.ph) * 0.01) % 1) + 1) % 1 * R * 2 - R, y = (d.y * 2 - 1) * R + Math.sin(t * 0.5 * d.s + d.ph) * 6;
        ctx.fillStyle = rgba('#eef4ff', d.a * 0.8); ctx.fillRect(x - 1.1, y - 0.5, 2.8 * d.s + 1, 1);
      }
      ctx.restore();
    }
    // ---- glints on the dust: a few grains catching the world's light, one at a time
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const g of a.glints) {
      const q = ((t + g.ph) % g.P) / g.P; if (q > 0.12) continue;
      const al = Math.sin(q / 0.12 * Math.PI) * (1 - dark * 0.7) * (1 - red * 0.6);
      glow(ctx, g.x, g.y, 6, '#ffffff', 0.4 * al); ctx.strokeStyle = rgba('#ffffff', 0.7 * al); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(g.x - 3, g.y); ctx.lineTo(g.x + 3, g.y); ctx.moveTo(g.x, g.y - 3); ctx.lineTo(g.x, g.y + 3); ctx.stroke();
    }
    ctx.restore();
    // ---- the wall: the floor dims toward black (and the sky a little), the dust staying readable (a telegraph is drawn over all of this)
    if (dark > 0.004) {
      ctx.fillStyle = rgba('#02040a', 0.64 * dark); ctx.beginPath(); ctx.arc(0, 0, R + 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#02040a', 0.3 * dark); ctx.beginPath(); ctx.arc(0, 0, Math.min(bx, by), 0, TAU); ctx.arc(0, 0, R + 4, 0, TAU, true); ctx.fill();
    }
    // ---- the last act: a deep dark red over the sky and a faint cast over the dust
    if (red > 0.004) {
      const r2 = Math.min(bx, by) - 6, rg = ctx.createRadialGradient(0, 0, R, 0, 0, r2); rg.addColorStop(0, rgba('#5a0a12', 0.5 * red)); rg.addColorStop(0.45, rgba('#2a0409', 0.62 * red)); rg.addColorStop(0.9, rgba('#2a0409', 0.5 * red)); rg.addColorStop(1, rgba('#2a0409', 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.arc(0, 0, R + 4, 0, TAU, true); ctx.fill();
      ctx.fillStyle = rgba('#5c0a14', 0.15 * red); ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, TAU); ctx.fill();
      // the lip of the floor goes dull with it
      ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, TAU); ctx.strokeStyle = rgba('#3a0710', 0.4 * red); ctx.lineWidth = 5; ctx.stroke();
    }
  }

  return { buildMoon, moonLife, R, WORLD, TOWN };
})();

ArenaView.buildMoon = MN_ROOM.buildMoon;
ArenaView.moonLife = MN_ROOM.moonLife;
