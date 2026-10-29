// The Cinder Sovereign (the Ultimate): its body, halo and poses, drawn in code.
// Contract: docs/plans/2026-10-ultimate-build.md. Built after the user's approved concept (the top-down view, "that's it 100%"): the Crowned
// Ember's body and blade, the Kindler's halo, smoke and extra arms. Seen from above, facing +x like every boss: a robe rounded at the front,
// trailing back into a drifting smoke column with a burning, jagged rim; a high collar, shoulder plates, a dark head with two ember eyes;
// the molten blade in one hand (the side it is held on swaps smoothly) and an ember cupped in the other; four folded smoke arms; a heat-glow
// at the core. Round it all, in the world's frame (it never turns with the heading), the halo: twelve sigils at about melee range, turning
// slowly, each its own glyph with a flame when lit, dark when spent, the calling one pulsing and a thread of fire from the core to it; in the
// second form it opens into a wider wheel of twelve blade-sigils. A pose for each cast, with the user's three beats: a small wind-up, a bold
// shape with a hot white core and dark ink edges, a slow aftermath. Poses only: the moves' ground effects are the fight's, not drawn here.
// Look: ember orange, gold, deep red, soot black and smoke violet. Loaded after grubnak-fx.js; it adds to BOSS_ART itself.
//
// st.props (main.js, boss-vfx.js CAST_POSE):
//   svLit            12-bit mask, bit i = sigil i still lit (all lit when absent)      svCall   the sigil being called now, or -1
//   svWheel          1 once the halo has opened into the wheel of blades               svBladeSide   1 right, -1 left (the Ashen Sweep's tell)
//   svForm           hall | forge | crater | square: the figure grows through the acts, easing over about 2 s when it changes
//                    hall: held back (short blade, small halo, the hem only smoulders) · forge: slag plates over shoulders and collar with glowing seams,
//                    a longer hotter blade, thicker smoke · crater: the robe burnt to a molten core, the eyes one slit of white fire, star-glints in the
//                    smoke (the halo opens to the wheel with svWheel) · square: white-gold, tatters, the longest blade, the core bare and bright
//   svGutter         0..1, the kill: the fire drains, the core gutters out, the flames sink low and drop motes, the blade cools
//   held while the move runs: svKindling, svBrand, svSweep, svEmber, svScatter, svHaloturn, svCallPose (the call: svCall is the sigil), svRebirth,
//                    svDance, svCrescent, svLance, svPyre, svEnrage   (st.props.svPose = '<name>' does the same, for previews)
// A cast's swing comes from st.action ({type:'attack', t0, dur}) as for Caelum; a move held longer (halo turn, call, dance, rebirth, enrage)
// ramps in over a second or so from when its prop first shows. Echoes and the fight read the halo through SV_ART.sigilPos(st, i).
// window.__svArtPreview(canvas, opts) draws it onto any canvas (tools/preview/sovereign-art.html).

const SV_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const wrapA = a => a - TAU * Math.round(a / TAU);
  const lerpA = (a, b, q) => a + wrapA(b - a) * q;
  const K = {
    void: '#0b0a0e', robe: '#14101a', robeM: '#24151a', deep: '#5a1a0e', red: '#c2361a', ember: '#ff8a3d', gold: '#ffd27a', white: '#fff4dc',
    smoke: '#6d6678', haze: '#3a3542', soot: '#1e1b24', violet: '#4a3d63', violetH: '#8d7fb0', ink: '#120f16', plate: '#1a1620',
  };
  const N = 12, S = 150 / 118, R0 = 118, R1 = 172;   // twelve sigils; design units (the concept's 400 px plate) to game px; halo and wheel radii
  const POSES = ['kindling', 'brand', 'sweep', 'ember', 'scatter', 'haloturn', 'call', 'rebirth', 'dance', 'crescent', 'lance', 'pyre', 'enrage'];
  const propOf = k => k === 'call' ? 'svCallPose' : 'sv' + k[0].toUpperCase() + k.slice(1);
  const SUSTAIN = { haloturn: 1.0, call: 0.8, dance: 1.0, rebirth: 3.4, enrage: 1.2 };   // moves held, not swung: seconds to come fully in
  const bump = (x, a, b) => x <= a || x >= b ? 0 : Math.sin((x - a) / (b - a) * Math.PI);
  const mix = (a, b, q) => { const pa = hexToRgb(a), pb = hexToRgb(b); return `rgb(${Math.round(lerp(pa[0], pb[0], q))},${Math.round(lerp(pa[1], pb[1], q))},${Math.round(lerp(pa[2], pb[2], q))})`; };
  const H = { e: K.ember, g: K.gold, r: K.red };   // the live fire colours: white-gold in the last act, going dark at the kill (set each frame in body)
  const E = { bladeK: 1, bladeHeat: 0, hk: 1, rimK: 1, tat: 0, molten: 0, slag: 0, trailK: 1, starK: 0, slit: 0, wg: 0, gut: 0, tail: 1 };   // what the act has done to the figure (body)
  const hexMix = (a, b, q) => { const pa = hexToRgb(a), pb = hexToRgb(b); return '#' + [0, 1, 2].map(i => Math.round(lerp(pa[i], pb[i], q)).toString(16).padStart(2, '0')).join(''); };
  const FORMS = { hall: 0, forge: 1, crater: 2, square: 3 };
  const smv = (st, key, target, rate) => { const v = st[key]; if (!v) return (st[key] = target.slice()); for (let i = 0; i < v.length; i++) v[i] += (target[i] - v[i]) * rate; return v; };
  const sm = (st, key, target, rate = 0.1) => { const v = st[key]; return (st[key] = v == null ? target : v + (target - v) * rate); };
  const smA = (st, key, target, rate) => { const v = st[key]; return (st[key] = v == null ? target : v + wrapA(target - v) * rate); };
  const G = {};   // gradients, built once (a gradient belongs to no canvas)
  const add = (ctx, f) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; f(); ctx.restore(); };

  // where a cast is in its swing: p 0..1 over the action; g the wind-up, k the blow, r the way back, kS the pose held at the blow, fade the
  // aftermath (bold at the blow, slow to go), flash the hot moment of it. Held moves have no swing: they ramp in from when they began.
  function phase(st, pose, t) {
    if (pose === 'idle') { st.svPo = null; return { p: -1, g: 0, k: 0, r: 0, kS: 0, fade: 0, flash: 0, age: 0, u: 0 }; }
    if (st.svPo !== pose) { st.svPo = pose; st.svP0 = t; }
    const age = t - st.svP0, ramp = SUSTAIN[pose];
    if (ramp) {
      const u = clamp(age / ramp, 0, 1), k = easeOut(u);
      return { p: u, g: clamp(u * 2, 0, 1) * (1 - k), k, r: 0, kS: k, fade: 1, flash: bump(u, 0.35, 0.65), age, u };
    }
    const a = st.action, p = a && a.type === 'attack' ? (actT(st) - a.t0) / a.dur : age / 1.2;
    const k = p < 0.3 ? 0 : p < 0.55 ? easeOut((p - 0.3) / 0.25) : 1, r = p >= 1 ? 1 : p < 0.55 ? 0 : easeOut((p - 0.55) / 0.45);
    return { p, g: easeOut(clamp(p / 0.3, 0, 1)) * (1 - r), k, r, kS: k * (1 - r), fade: p < 0.3 ? 0 : Math.max(0, 1 - (p - 0.3) / 0.7), flash: bump(p, 0.3, 0.5), age, u: clamp(p, 0, 1) };
  }

  // ---------------------------------------------------------------------------------------------------------- small parts
  // a flame from its base (x, y), h tall, w wide, pointing ang (0 up): red, ember, gold and a white heart, with a dark ink edge
  function flame(ctx, x, y, h, w, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    const layers = [[1, H.r], [0.74, H.e], [0.48, H.g], [0.24, K.white]];
    for (let i = 0; i < 4; i++) {
      const hh = h * layers[i][0], ww = w * (layers[i][0] * 0.7 + 0.3);
      ctx.beginPath(); ctx.moveTo(0, -hh); ctx.quadraticCurveTo(ww, -hh * 0.35, 0, 0); ctx.quadraticCurveTo(-ww, -hh * 0.35, 0, -hh);
      ctx.fillStyle = layers[i][1]; ctx.fill();
      if (i === 0) { ctx.strokeStyle = rgba(K.ink, 0.65); ctx.lineWidth = 0.9; ctx.stroke(); }
    }
    ctx.restore();
  }
  // twelve sigils, one glyph each for the twelve fallen, stroked on the unit r at (x, y): a cauldron, a moth, a bolt, a crown, a talon, a snowflake,
  // an eye, three necks, a blade, a shield, a tree, a star
  const GLYPH = [
    (c, x, y, r) => { c.moveTo(x - r, y - 0.1 * r); c.lineTo(x + r, y - 0.1 * r); c.arc(x, y - 0.1 * r, r, 0, Math.PI); c.moveTo(x - 0.3 * r, y - 0.4 * r); c.quadraticCurveTo(x + 0.1 * r, y - 0.7 * r, x - 0.1 * r, y - r); },
    (c, x, y, r) => { c.moveTo(x - r, y - 0.8 * r); c.lineTo(x, y); c.lineTo(x + r, y - 0.8 * r); c.moveTo(x - r, y + 0.8 * r); c.lineTo(x, y); c.lineTo(x + r, y + 0.8 * r); },
    (c, x, y, r) => { c.moveTo(x + 0.3 * r, y - r); c.lineTo(x - 0.5 * r, y + 0.1 * r); c.lineTo(x + 0.1 * r, y + 0.1 * r); c.lineTo(x - 0.3 * r, y + r); },
    (c, x, y, r) => { c.moveTo(x - r, y + 0.7 * r); c.lineTo(x - r, y - 0.5 * r); c.lineTo(x - 0.5 * r, y + 0.1 * r); c.lineTo(x, y - 0.8 * r); c.lineTo(x + 0.5 * r, y + 0.1 * r); c.lineTo(x + r, y - 0.5 * r); c.lineTo(x + r, y + 0.7 * r); c.closePath(); },
    (c, x, y, r) => { for (let k = -1; k <= 1; k++) { c.moveTo(x + k * 0.7 * r, y + r); c.quadraticCurveTo(x + k * 0.9 * r, y - 0.1 * r, x + k * 0.25 * r, y - r); } },
    (c, x, y, r) => { for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + Math.PI / 2; c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r); } },
    (c, x, y, r) => { c.moveTo(x - r, y); c.quadraticCurveTo(x, y - 1.15 * r, x + r, y); c.quadraticCurveTo(x, y + 1.15 * r, x - r, y); c.moveTo(x + 0.32 * r, y); c.arc(x, y, 0.32 * r, 0, TAU); },
    (c, x, y, r) => { c.moveTo(x, y + r); c.quadraticCurveTo(x - 0.9 * r, y + 0.1 * r, x - 0.9 * r, y - 0.8 * r); c.moveTo(x, y + r); c.lineTo(x, y - r); c.moveTo(x, y + r); c.quadraticCurveTo(x + 0.9 * r, y + 0.1 * r, x + 0.9 * r, y - 0.8 * r); },
    (c, x, y, r) => { c.moveTo(x, y - r); c.lineTo(x, y + r); c.moveTo(x - 0.65 * r, y + 0.25 * r); c.lineTo(x + 0.65 * r, y + 0.25 * r); c.moveTo(x - 0.3 * r, y - 0.55 * r); c.lineTo(x, y - r); c.lineTo(x + 0.3 * r, y - 0.55 * r); },
    (c, x, y, r) => { c.moveTo(x - 0.8 * r, y - 0.8 * r); c.lineTo(x + 0.8 * r, y - 0.8 * r); c.lineTo(x + 0.8 * r, y + 0.1 * r); c.quadraticCurveTo(x + 0.6 * r, y + 0.8 * r, x, y + r); c.quadraticCurveTo(x - 0.6 * r, y + 0.8 * r, x - 0.8 * r, y + 0.1 * r); c.closePath(); c.moveTo(x, y - 0.8 * r); c.lineTo(x, y + r); },
    (c, x, y, r) => { c.moveTo(x, y + r); c.lineTo(x, y - 0.2 * r); c.moveTo(x, y + 0.3 * r); c.lineTo(x - 0.75 * r, y - 0.4 * r); c.moveTo(x, y); c.lineTo(x + 0.75 * r, y - 0.6 * r); c.moveTo(x, y - 0.2 * r); c.lineTo(x, y - r); },
    (c, x, y, r) => { c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); },
  ];
  // a gauntleted hand; open: palm spread, fingers fanned toward a
  function hand(ctx, x, y, open, a) {
    if (open > 0.3) for (let i = -2; i <= 2; i++) { const fa = a + i * 0.32, fx = x + Math.cos(fa) * 8, fy = y + Math.sin(fa) * 8; line(ctx, x, y, fx, fy, OUT, 3.4); line(ctx, x, y, fx, fy, K.void, 2); circle(ctx, fx, fy, 0.9, rgba(H.e, 0.8 * open)); }
    circle(ctx, x, y, 4.6, K.void, OUT, 1.8);
    circle(ctx, x, y, 4.6, null, rgba(H.e, 0.45), 0.9);
  }
  // a sleeve from the shoulder to the hand, bent out, a glowing cuff at the wrist
  function sleeve(ctx, sx, sy, hx, hy, bend) {
    const mx = (sx + hx) / 2, my = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1;
    limb(ctx, [sx, sy, mx - dy / L * bend, my + dx / L * bend, hx, hy], K.plate, 7);
    line(ctx, sx, sy, mx - dy / L * bend, my + dx / L * bend, rgba(H.e, 0.18), 1.2);
    circle(ctx, hx, hy, 6, null, rgba(H.e, 0.55), 1.2);
  }
  // the ember in a cupped hand (vis 1) or an open, empty one (vis 0): a white-hot heart, flame tongues, motes lifting
  function emberHand(ctx, x, y, eb, vis, t, face) {
    const r = 5.6 * eb;
    if (vis > 0.08) {
      add(ctx, () => { glow(ctx, x, y - 1, r * 3.4, H.e, 0.7 * vis + 0.08 * Math.sin(t * 6)); glow(ctx, x, y - 1, r * 1.5, H.g, 0.6 * vis); });
      ctx.save(); ctx.globalAlpha = vis;
      for (let i = 0; i < 3; i++) flame(ctx, x + (i - 1) * r * 0.55, y, r * (1.3 + 0.35 * Math.sin(t * 7 + i * 2.1)) * (i === 1 ? 1.3 : 0.9), r * 0.5, (i - 1) * 0.35);
      ctx.restore();
      circle(ctx, x, y, r * 0.62, H.g, rgba(K.ink, 0.7), 1);
      add(ctx, () => { glow(ctx, x, y, r * 1.1, K.white, 0.95 * vis); for (let i = 0; i < 4; i++) { const q = (t * 0.9 + i / 4) % 1; circle(ctx, x + Math.sin(i * 3 + t) * r * 0.9, y - q * r * 3, 0.6 + (1 - q), rgba(i % 2 ? H.g : H.e, 0.8 * (1 - q) * vis)); } });
    }
    hand(ctx, x, y + (vis > 0.08 ? 3.2 : 0), vis > 0.08 ? 0 : 1 - vis, face);
    if (vis > 0.08) { ctx.save(); ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = Math.PI * (0.25 + i * 0.25); ctx.beginPath(); ctx.arc(x, y + 1.5, r * 1.05, a - 0.15, a + 0.15); ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = K.void; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore(); }
  }

  // ---------------------------------------------------------------------------------------------------------- the blade
  // a thin molten blade from the hand (hx, hy) along ang, len long: dark ink edge, red body, gold heart, white core; hot all along it
  function blade(ctx, hx, hy, ang, len, o) {
    const t = o.t, heat = o.heat == null ? 1 : o.heat, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, fl = 0.88 + 0.12 * Math.sin(t * 9) + 0.05 * Math.sin(t * 21);
    const gx = hx + ux * 5, gy = hy + uy * 5, tx = gx + ux * len, ty = gy + uy * len, w = 2.7 * (o.wide || 1);
    line(ctx, hx - ux * 8, hy - uy * 8, gx, gy, OUT, 5.4); line(ctx, hx - ux * 8, hy - uy * 8, gx, gy, '#3a2428', 3.2);   // the grip
    circle(ctx, hx - ux * 9, hy - uy * 9, 2.4, H.g, OUT, 1.2);
    line(ctx, gx - nx * 6.5, gy - ny * 6.5, gx + nx * 6.5, gy + ny * 6.5, OUT, 4.6); line(ctx, gx - nx * 6.5, gy - ny * 6.5, gx + nx * 6.5, gy + ny * 6.5, '#b8893a', 2.4);   // the guard
    add(ctx, () => {
      for (let i = 0; i < 4; i++) glow(ctx, lerp(gx, tx, 0.15 + i * 0.26), lerp(gy, ty, 0.15 + i * 0.26), 14 + 7 * heat, H.e, (0.16 + 0.2 * heat) * fl);
      glow(ctx, tx, ty, 14 + 16 * heat, H.g, (0.28 + 0.4 * heat) * fl); glow(ctx, tx, ty, 7, K.white, 0.5 * heat * fl);
    });
    const body = (ww, sh) => [gx + ux * 2 * sh + nx * ww, gy + uy * 2 * sh + ny * ww, gx + ux * len * 0.9 + nx * ww * 0.55, gy + uy * len * 0.9 + ny * ww * 0.55, tx, ty, gx + ux * len * 0.9 - nx * ww * 0.55, gy + uy * len * 0.9 - ny * ww * 0.55, gx + ux * 2 * sh - nx * ww, gy + uy * 2 * sh - ny * ww];
    poly(ctx, body(w, 1), H.r, OUT, 2.4);
    poly(ctx, body(w * 0.58, 3), mix(H.e, H.g, 0.5 * heat), null);
    add(ctx, () => {
      line(ctx, gx + ux * 6, gy + uy * 6, tx - ux * 3, ty - uy * 3, rgba(K.white, 0.55 + 0.4 * heat), 1.2);
      for (let i = 0; i < 5; i++) { const q = (t * 0.7 + i / 5) % 1, along = (0.12 + 0.82 * hash(i, 2)) * len, off = (hash(i, 3) - 0.5) * 7 + q * 9 * (i % 2 ? 1 : -1); circle(ctx, gx + ux * along + nx * off, gy + uy * along + ny * off, 0.6 + (1 - q) * 1.1, rgba(i % 2 ? H.g : H.e, 0.85 * (1 - q) * heat)); }
    });
    return [tx, ty];
  }

  // ---------------------------------------------------------------------------------------------------------- the figure
  const RIM = new Float32Array(2 * 61);
  // the robe from above: a rounded front and a back that trails away into tattered points (the burning rim); fl: how far it flares
  function robe(ctx, t, fl, mv, heat, rage) {
    const M = 60, rf = 30 * (0.86 + 0.14 * fl);
    for (let j = 0; j <= M; j++) {
      const a = j / M * TAU - Math.PI / 2, sn = Math.sin(a), cs = Math.cos(a), back = Math.max(0, sn);
      let ry = rf + back * (24 + 10 * mv) * fl * E.tail;
      if (back > 0.2) ry += ((j % 2 ? -5 : 2.2) + Math.sin(t * 3 + j) * 1.8) * back * (0.8 + 0.4 * fl) * (1 + 1.6 * E.tat);
      RIM[2 * j] = cs * rf * (1 - 0.24 * back); RIM[2 * j + 1] = sn * ry;
    }
    const trace = () => { ctx.beginPath(); ctx.moveTo(RIM[0], RIM[1]); for (let j = 1; j <= M; j++) ctx.lineTo(RIM[2 * j], RIM[2 * j + 1]); ctx.closePath(); };
    // an under-skirt, deep red, drifting a little behind the robe
    ctx.save(); ctx.translate(Math.sin(t * 0.9) * 2, 5); ctx.scale(1.08, 1.06); trace(); ctx.fillStyle = rgba(K.deep, 0.55 * clamp(E.rimK, 0.4, 1)); ctx.fill(); ctx.restore();
    trace(); G.robe = G.robe || (() => { const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 52); g.addColorStop(0, '#2a171c'); g.addColorStop(0.62, K.robe); g.addColorStop(1, K.deep); return g; })();
    ctx.globalAlpha = 1 - 0.22 * E.tat; ctx.fillStyle = G.robe; ctx.fill(); ctx.globalAlpha = 1; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(K.ink, 0.95); ctx.lineWidth = 2.6; ctx.stroke();
    // folds: a dark ink groove and an ember glint beside it
    ctx.save(); ctx.lineCap = 'round';
    for (const dx of [-17, -8, 0, 8, 17]) {
      const ex = dx * (1.15 + 0.3 * fl), ey = 38 + (24 * fl + 4) * (1 - Math.abs(dx) / 30);
      ctx.beginPath(); ctx.moveTo(dx * 0.5, 8); ctx.quadraticCurveTo(dx * 1.1 + 2, 26, ex, ey); ctx.strokeStyle = rgba(K.ink, 0.55); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx * 0.5 + 1.2, 8); ctx.quadraticCurveTo(dx * 1.1 + 3.2, 26, ex + 1.2, ey); ctx.strokeStyle = rgba(H.e, 0.1 + 0.12 * heat); ctx.lineWidth = 0.9; ctx.stroke();
    }
    ctx.restore();
    // the burning rim over the back half, a second thinner line of white-gold, and flame at every point
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); for (let j = 8; j <= 52; j++) j === 8 ? ctx.moveTo(RIM[2 * j], RIM[2 * j + 1]) : ctx.lineTo(RIM[2 * j], RIM[2 * j + 1]);
    ctx.strokeStyle = rgba(H.e, (0.5 + 0.35 * heat + 0.15 * rage) * clamp(E.rimK, 0.3, 1.2)); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = rgba(H.g, (0.25 + 0.3 * heat) * clamp(E.rimK, 0.3, 1.2)); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.restore();
    add(ctx, () => {
      for (let j = 10; j <= 50; j += 2) { const x = RIM[2 * j], y = RIM[2 * j + 1], f = 0.7 + 0.3 * Math.sin(t * 6 + j * 1.7); glow(ctx, x, y, 7 + 3 * f, H.e, (0.28 + 0.25 * heat) * f * E.rimK); if (j % 4 === 0) circle(ctx, x, y - 1, 0.9, rgba(H.g, 0.9 * f)); }
    });
    ctx.save(); ctx.globalAlpha = clamp((0.5 + 0.4 * heat) * E.rimK - 0.15, 0, 1);
    for (let j = 12; j <= 48; j += 4) flame(ctx, RIM[2 * j], RIM[2 * j + 1], 4 + 3 * Math.sin(t * 7 + j), 1.7, 0.4 * Math.sin(t * 2 + j) + (RIM[2 * j] > 0 ? 0.5 : -0.5));
    ctx.restore();
  }
  // Act III on: the robe burnt away to the knee, torn back from a molten core (white at the heart, a lava skin cracked with dark)
  function moltenCore(ctx, t, heat) {
    const m = E.molten; if (m < 0.03) return;
    const r = 13 + 11 * m, pts = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = r * (i % 2 ? 1.0 : 1.32) * (1 + 0.06 * Math.sin(t * 3 + i)); pts.push(Math.cos(a) * rr, 2 + Math.sin(a) * rr); }
    ctx.save(); ctx.globalAlpha = Math.min(1, m * 1.4);
    poly(ctx, pts, '#1a0d10', rgba(K.ink, 0.95), 2);   // the scorched cloth edge
    ctx.beginPath(); for (let i = 0; i < 16; i += 1) i ? ctx.lineTo(pts[2 * i], pts[2 * i + 1]) : ctx.moveTo(pts[0], pts[1]); ctx.closePath(); ctx.strokeStyle = rgba(H.e, 0.7); ctx.lineWidth = 1; ctx.stroke();
    G.lava = G.lava || (() => { const g = ctx.createRadialGradient(0, 2, 1, 0, 2, 24); g.addColorStop(0, '#fff8e8'); g.addColorStop(0.3, '#ffd27a'); g.addColorStop(0.62, '#ff7a2a'); g.addColorStop(1, '#5a1a0e'); return g; })();
    ctx.save(); ctx.translate(0, 2); ctx.scale(r / 24 * 0.86, r / 24 * 0.86); ctx.translate(0, -2); ctx.beginPath(); ctx.arc(0, 2, 24, 0, TAU); ctx.fillStyle = G.lava; ctx.fill(); ctx.restore();
    ctx.lineCap = 'round'; ctx.strokeStyle = rgba(K.ink, 0.65); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.4 + hash(i, 21) * 0.4, r0 = r * 0.25, r1 = r * (0.7 + 0.2 * hash(i, 22)); ctx.moveTo(Math.cos(a) * r0, 2 + Math.sin(a) * r0); ctx.lineTo(Math.cos(a + 0.2) * r1 * 0.6, 2 + Math.sin(a + 0.2) * r1 * 0.6); ctx.lineTo(Math.cos(a) * r1, 2 + Math.sin(a) * r1); }
    ctx.stroke(); ctx.restore();
    add(ctx, () => glow(ctx, 0, 2, r * 2.2, H.e, 0.35 * m * heat));
  }
  // four smoke arms folded across the front; out 0 folded .. 1 unfurled wide
  function smokeArms(ctx, t, out) {
    ctx.save(); ctx.lineCap = 'round';
    for (const [dy, w, ph] of [[2, 4.4, 0], [13, 3.4, 1.7]]) for (const sd of [-1, 1]) {
      const sx = sd * 23, ex = lerp(sd * 7, sd * (66 + 10 * ph), out), ey = lerp(dy + 22, dy - 26 - 10 * ph, out), cx = sd * (42 + 22 * out + Math.sin(t * 0.9 + dy + sd) * 2.6), cy = dy + 14 - 16 * out;
      ctx.beginPath(); ctx.moveTo(sx, dy); ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.strokeStyle = rgba(K.ink, 0.5); ctx.lineWidth = w + 2.6; ctx.stroke();
      ctx.strokeStyle = rgba(K.violet, 0.55); ctx.lineWidth = w; ctx.stroke();
      ctx.strokeStyle = rgba(K.violetH, 0.12); ctx.lineWidth = w * 0.3; ctx.stroke();
      for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3 + ph) % 1; circle(ctx, ex + sd * Math.sin(i * 2 + t) * 3, ey - q * 10 * (1 + out), w * 0.55 * (1 - q), rgba(K.haze, 0.55 * (1 - q))); }
      circle(ctx, ex, ey, w * 0.75, rgba(K.violet, 0.5), null);
    }
    ctx.restore();
  }
  // shoulder plates: dark, ember-edged, a ridge, a spike swept back
  function shoulders(ctx, heat, t) {
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 20, -8); ctx.rotate(sd * 0.25);
      poly(ctx, [sd * 8, 1, sd * 14, 4, sd * 22, 9, sd * 11, 6], K.plate, OUT, 1.4);   // the spike
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, TAU); ctx.fillStyle = K.plate; ctx.fill(); ctx.strokeStyle = rgba(K.ink, 0.95); ctx.lineWidth = 2.2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, TAU); ctx.strokeStyle = rgba(H.e, 0.45 + 0.35 * heat); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(8, 2); ctx.moveTo(-6, -3); ctx.lineTo(6, -3); ctx.strokeStyle = rgba(H.e, 0.4); ctx.lineWidth = 0.8; ctx.stroke();
      circle(ctx, sd * 7, -1, 1.2, rgba(H.g, 0.8));
      ctx.restore();
      if (E.slag > 0.02) {   // Act II: slag-iron plates grown over the shoulder, their seams glowing
        const k = E.slag, f = 0.75 + 0.25 * Math.sin(t * 4 + sd);
        ctx.save(); ctx.translate(sd * 22, -9); ctx.scale(k, k);
        poly(ctx, [sd * -4, -9, sd * 12, -17, sd * 25, -9, sd * 27, 5, sd * 14, 12, sd * -2, 7], '#2b2326', rgba(K.ink, 0.95), 2);
        poly(ctx, [sd * 2, -6, sd * 12, -11, sd * 20, -6, sd * 18, 3, sd * 8, 5], '#3a2f31', null);
        ctx.beginPath(); ctx.moveTo(sd * -2, 1); ctx.lineTo(sd * 8, -4); ctx.lineTo(sd * 14, 4); ctx.moveTo(sd * 12, -17); ctx.lineTo(sd * 10, -2); ctx.lineTo(sd * 20, 6);
        ctx.strokeStyle = rgba(H.e, 0.8 * f * Math.min(1, heat + 0.3)); ctx.lineWidth = 1.2; ctx.stroke(); ctx.strokeStyle = rgba(H.g, 0.5 * f); ctx.lineWidth = 0.5; ctx.stroke();
        ctx.restore();
      }
    }
  }
  // the head and its high collar from above: collar points swept up behind, a crown of small points, a dark head, two ember eyes looking ahead
  function head(ctx, t, eye, heat, look) {
    ctx.save(); ctx.translate(0, look);
    poly(ctx, [-16, -2, -22, 10, -14, 8, -9, 14, 0, 12, 9, 14, 14, 8, 22, 10, 16, -2, 8, -12, -8, -12], K.robe, OUT, 2);   // the collar, two high points
    if (E.slag > 0.02) {   // slag horns grown up the collar, seamed with fire
      const k = E.slag; ctx.save(); ctx.scale(k, k);
      for (const sd of [-1, 1]) { poly(ctx, [sd * 12, -6, sd * 24, -2, sd * 30, 13, sd * 20, 9, sd * 16, 17, sd * 9, 8], '#2b2326', rgba(K.ink, 0.95), 1.8); ctx.beginPath(); ctx.moveTo(sd * 13, -3); ctx.lineTo(sd * 24, 4); ctx.lineTo(sd * 29, 12); ctx.strokeStyle = rgba(H.e, 0.85); ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(-22, 10); ctx.moveTo(16, -2); ctx.lineTo(22, 10); ctx.strokeStyle = rgba(H.e, 0.6); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -8, 14, Math.PI * 0.82, Math.PI * 2.18); ctx.strokeStyle = rgba(K.deep, 0.9); ctx.lineWidth = 1.6; ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = Math.PI * 0.65 + i * Math.PI * 1.7 / 6 + Math.PI, r0 = 10, L = i % 2 ? 4 : 6; poly(ctx, [Math.cos(a - 0.14) * r0, -8 + Math.sin(a - 0.14) * r0, Math.cos(a) * (r0 + L), -8 + Math.sin(a) * (r0 + L), Math.cos(a + 0.14) * r0, -8 + Math.sin(a + 0.14) * r0], K.plate, OUT, 1); }
    circle(ctx, 0, -8, 10, K.void, OUT, 1.8);
    ctx.beginPath(); ctx.arc(0, -8, 9, Math.PI * 0.18, Math.PI * 0.82); ctx.strokeStyle = rgba(H.e, 0.22 + 0.2 * heat); ctx.lineWidth = 1; ctx.stroke();   // heat on the back of the head
    ctx.restore();
    ctx.save(); ctx.translate(0, look);
    const sl = E.slit, ey = 1 - sl;
    add(ctx, () => { glow(ctx, 0, -16, 9 + 5 * sl, eye > 0.95 || sl > 0.5 ? K.white : H.e, 0.4 * eye); for (const sd of [-1, 1]) glow(ctx, sd * 3.6, -16.4, 4.6, eye > 0.95 ? K.white : H.g, 0.5 * eye * ey); });
    if (sl > 0.02) {   // Act III on: the two eyes run together into one slit of white fire
      ctx.save(); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8.5 * sl, -16.4); ctx.lineTo(8.5 * sl, -16.4);
      ctx.strokeStyle = rgba(K.ink, 0.9 * eye); ctx.lineWidth = 3.8; ctx.stroke(); ctx.strokeStyle = rgba(H.g, eye); ctx.lineWidth = 2.4; ctx.stroke(); add(ctx, () => { ctx.strokeStyle = rgba(K.white, eye); ctx.lineWidth = 1.2; ctx.stroke(); glow(ctx, 0, -16.4, 14, K.white, 0.35 * eye * sl); });
      ctx.restore();
    }
    ctx.globalAlpha = ey;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 1.6, -15.4); ctx.lineTo(sd * 6, -17.6); ctx.lineTo(sd * 5.6, -15.8); ctx.closePath(); ctx.fillStyle = mix(H.e, K.white, clamp(eye - 0.7, 0, 1)); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the halo and the wheel
  // where sigil i is, relative to the boss, in game px and the world's frame (not its heading): E3 flies an echo's flame from here
  // `k` is the scale the body is drawn at: the raid draws the Sovereign at RAID_BOSS_SCALE (main.js), so the halo a player sees is that much wider than the art's own px;
  // callers that place something on the drawn halo take the default (DRAW), the preview says its own zoom
  const DRAW = 1.3;
  function sigilPos(st, i, k) {
    const w = st.svWh == null ? 0 : st.svWh, a = (st.svSpin || 0) + i * TAU / N - Math.PI / 2, R = lerp(R0 * (st.svHk || 1), R1, w) * S * (k > 0 ? k : DRAW);
    return { x: Math.cos(a) * R, y: Math.sin(a) * R, a, r: R };
  }
  // the ring, its inner ring, its marks and its floor shadow (drawn first, under the figure)
  function haloBack(ctx, st, o) {
    const { t, w, R, spin, turn } = o;
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 6 + 6 * w; ctx.beginPath(); ctx.arc(5, 9, R, 0, TAU); ctx.stroke(); ctx.restore();   // the floor shadow
    ctx.save(); ctx.strokeStyle = rgba(H.e, 0.42); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.arc(0, 0, R - 9, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.34; ctx.beginPath();
    for (let j = 0; j < 72; j++) { const a = j / 72 * TAU + spin, l = j % 6 ? 3 : 6; ctx.moveTo(Math.cos(a) * (R - 9), Math.sin(a) * (R - 9)); ctx.lineTo(Math.cos(a) * (R - 9 + l), Math.sin(a) * (R - 9 + l)); }
    ctx.stroke();
    if (w > 0.05) {   // the wheel's rim: a second ring where the blades end, in arcs, turning the other way
      ctx.globalAlpha = 0.4 * w; ctx.lineWidth = 1.1; ctx.beginPath();
      for (let k = 0; k < 12; k++) { const a0 = -spin * 0.7 + k * TAU / 12; ctx.moveTo(Math.cos(a0) * (R + 46 * w), Math.sin(a0) * (R + 46 * w)); ctx.arc(0, 0, R + 46 * w, a0, a0 + 0.38); }
      ctx.stroke();
    }
    if (turn > 0.05) {   // the halo turning: streaks of light running round it
      ctx.globalAlpha = 0.5 * turn; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(H.g, 0.8);
      for (let k = 0; k < 6; k++) { const a0 = spin * 1.2 + k * TAU / 6; ctx.beginPath(); ctx.arc(0, 0, R + 4 + (k % 2) * 6, a0, a0 + 0.5 + 0.3 * turn); ctx.stroke(); }
    }
    ctx.restore();
  }
  // the sigils, in front of the figure: a glyph in a disc (or on a blade, in the wheel), a flame when lit, a thread to the one calling
  function haloFront(ctx, st, o) {
    const { t, w, R, spin, call, callK } = o, lv = st.svLv, fl = st.svFl;
    if (call >= 0 && call < N) {   // the thread: from the core out to the sigil being called
      const a = spin + call * TAU / N - Math.PI / 2, x = Math.cos(a) * R, y = Math.sin(a) * R;
      add(ctx, () => {
        ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(x, y); ctx.strokeStyle = rgba(H.e, 0.16 * callK); ctx.lineWidth = 7; ctx.stroke();
        ctx.strokeStyle = rgba(H.g, 0.5 * callK); ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 6; i++) { const q = (t * 0.9 + i / 6) % 1, d = 22 + q * (R - 22); circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 2.2 * (1 - q * 0.5), rgba(K.white, 0.8 * callK * Math.min(1, q * 4))); }
      });
    }
    for (let i = 0; i < N; i++) {
      const a = spin + i * TAU / N - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), x = ca * R, y = sa * R, l = lv[i], calling = i === call, pul = calling ? 1 + 0.55 * Math.sin(t * 12) : 1;
      const edge = calling ? H.g : mix(K.smoke, '#ffaa64', l), edA = calling ? 1 : 0.55 + 0.35 * l;
      ctx.save();
      if (w < 0.98) {   // a disc on the ring
        ctx.globalAlpha = 1 - w; circle(ctx, x, y, 10, '#121016', rgba(edge, edA), 1.5);
        ctx.globalAlpha = 1 - w * 0.6; ctx.strokeStyle = calling ? H.g : mix(K.smoke, H.g, l * 0.85); ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); GLYPH[i](ctx, x, y, 5); ctx.stroke();
      }
      if (w > 0.02) {   // a blade of the wheel: out from the glyph's disc, point out
        const len = 8 + 36 * w, bx = ca * (R + 8), by = sa * (R + 8), nx = -sa, ny = ca;
        ctx.globalAlpha = w;
        poly(ctx, [x - ca * 4 + nx * 3.6, y - sa * 4 + ny * 3.6, bx + ca * len * 0.3 + nx * 4.4, by + sa * len * 0.3 + ny * 4.4, bx + ca * len, by + sa * len, bx + ca * len * 0.3 - nx * 4.4, by + sa * len * 0.3 - ny * 4.4, x - ca * 4 - nx * 3.6, y - sa * 4 - ny * 3.6], mix('#17131a', K.deep, l * 0.75), OUT, 2);
        ctx.beginPath(); ctx.moveTo(bx + ca * len * 0.3 + nx * 4.4, by + sa * len * 0.3 + ny * 4.4); ctx.lineTo(bx + ca * len, by + sa * len); ctx.lineTo(bx + ca * len * 0.3 - nx * 4.4, by + sa * len * 0.3 - ny * 4.4); ctx.strokeStyle = rgba(edge, Math.max(edA, 0.8)); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + ca * 6, y + sa * 6); ctx.lineTo(bx + ca * len * 0.9, by + sa * len * 0.9); ctx.strokeStyle = rgba(mix(K.smoke, H.g, l), 0.35 + 0.5 * l); ctx.lineWidth = 0.9; ctx.stroke();
        circle(ctx, x, y, 8, '#121016', rgba(edge, edA), 1.4);
        ctx.strokeStyle = mix(K.smoke, H.g, l); ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); GLYPH[i](ctx, x, y, 4.4); ctx.stroke();
      }
      ctx.restore();
      if (l > 0.03) {
        const gu = E.gut, fx = x + ca * 38 * w * 0.9 - ca * gu * 14, fy = y + sa * 38 * w * 0.9 - sa * gu * 14, big = (9 + 2 * Math.sin(t * 5 + i * 1.7) + 4 * w) * pul * (1 - 0.8 * gu) * (1 - gu * 0.3 * Math.sin(t * 17 + i));
        ctx.save(); ctx.globalAlpha = l; flame(ctx, fx, fy, big, 3.2 + w, a + Math.PI / 2); ctx.restore();
        add(ctx, () => { glow(ctx, fx, fy, 16 * pul + 6 * w, calling ? H.g : H.e, (calling ? 0.8 : 0.4) * l * (1 - 0.85 * gu)); if (gu > 0.05) for (let m = 0; m < 3; m++) { const q = (t * 0.8 + m / 3 + i * 0.13) % 1; circle(ctx, fx - ca * q * 10 * gu, fy - sa * q * 10 * gu + q * 8 * gu, 1.3 * (1 - q), rgba(H.g, 0.8 * (1 - q) * gu * l)); } });   // a flame low and spent: a mote falling off it
      }
      if (calling) add(ctx, () => {   // the call: a ring of light going out from the sigil, and a bright one at the glyph
        for (let k = 0; k < 2; k++) { const q = (t * 0.9 + k / 2) % 1; ctx.beginPath(); ctx.arc(x, y, 12 + q * 24, 0, TAU); ctx.strokeStyle = rgba(H.g, 0.6 * (1 - q) * callK); ctx.lineWidth = 1.6 - q; ctx.stroke(); }
        glow(ctx, x, y, 22, H.g, 0.5 * callK); glow(ctx, x, y, 7, K.white, 0.7 * callK);
      });
      if (fl[i] > 0.02) add(ctx, () => {   // a flame just spent: a burst, going out
        const f = fl[i], q = 1 - f; ctx.beginPath(); ctx.arc(x, y, 8 + q * 30, 0, TAU); ctx.strokeStyle = rgba(H.e, 0.7 * f); ctx.lineWidth = 2 * f + 0.4; ctx.stroke();
        glow(ctx, x, y, 18 + 14 * q, H.g, 0.6 * f);
        for (let k = 0; k < 6; k++) { const aa = k * TAU / 6 + i; circle(ctx, x + Math.cos(aa) * q * 26, y + Math.sin(aa) * q * 26 - q * 8, 1.4 * f + 0.4, rgba(H.g, 0.9 * f)); }
      });
    }
  }

  // ---------------------------------------------------------------------------------------------------------- pose effects
  // under the figure: the smoke trail, the heat on the floor, what the move leaves behind it
  function trail(ctx, t, mv, fl, heat) {
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const tk = E.trailK, p = (t * 0.08 + i / 24) % 1, x = Math.sin(i * 2.1 + t * 0.5) * (6 + p * 32) * (0.8 + 0.2 * tk), y = 40 + p * (118 + 40 * mv) * (0.85 + 0.15 * fl) * (0.9 + 0.1 * tk), r = (10 + p * 26) * tk;
      ctx.globalAlpha = (1 - p) * 0.3 * clamp(tk, 0.5, 1.3) * (1 - 0.6 * E.gut); ctx.fillStyle = i % 4 === 0 ? '#2e2640' : i % 2 ? K.haze : '#2a2630';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (p < 0.3) { ctx.globalAlpha = 1; add(ctx, () => glow(ctx, x, y - r * 0.2, r * 1.3, K.deep, (0.3 - p) * 0.7 * (0.5 + heat))); }
      if (E.starK > 0.03 && i % 3 === 0) {   // star-glints in the smoke
        const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.9), sz = (2.2 + 2.4 * tw) * E.starK;
        add(ctx, () => { ctx.beginPath(); ctx.moveTo(x - sz, y); ctx.lineTo(x + sz, y); ctx.moveTo(x, y - sz); ctx.lineTo(x, y + sz); ctx.strokeStyle = rgba(i % 2 ? K.white : K.violetH, 0.85 * (1 - p) * tw * E.starK); ctx.lineWidth = 0.9; ctx.stroke(); });
      }
    }
    ctx.restore();
  }
  function poseBack(ctx, pose, o) {
    const { t, s, ph, P, tip } = o, c0 = [0, -8];
    switch (pose) {
      case 'kindling': {   // the sparks drawn in to the core; then a ring of fire thrown out of the robe
        add(ctx, () => {
          for (let i = 0; i < 22; i++) { const q = (t * 0.8 * (1 + ph.g) + hash(i, 1)) % 1, a = hash(i, 2) * TAU, d = (1 - q) * (110 - 20 * ph.k) + 10; if (ph.g < 0.05 && ph.k > 0.6) break; circle(ctx, Math.cos(a) * d, c0[1] + Math.sin(a) * d, 1 + 1.4 * q, rgba(i % 3 ? H.e : H.g, 0.8 * q * Math.max(ph.g, 0.2))); }
          glow(ctx, 0, -4, 30 + 30 * ph.g, H.e, 0.3 * ph.g + 0.5 * ph.flash);
          if (ph.k > 0) for (let k = 0; k < 2; k++) { const q = clamp((ph.p - 0.3) / 0.55 - k * 0.14, 0, 1), r = 34 + q * 96; ctx.beginPath(); ctx.arc(0, -4, r, 0, TAU); ctx.strokeStyle = rgba(k ? H.r : H.g, 0.8 * (1 - q) * ph.fade); ctx.lineWidth = 4 * (1 - q) + 0.8; ctx.stroke(); }
        });
        break;
      }
      case 'sweep': {   // the ash the blade leaves: a dark, hot crescent behind its path, slow to fade
        if (ph.k > 0.02) {
          const th0 = s > 0 ? 0.245 : Math.PI - 0.245, th1 = s > 0 ? lerp(0.245, -2.94, ph.k) : Math.PI - lerp(0.245, -2.94, ph.k), ccw = s > 0;
          ctx.save(); ctx.globalAlpha = 0.2 + 0.7 * ph.fade;
          ctx.beginPath(); ctx.arc(c0[0], c0[1], 96, th0, th1, ccw); ctx.arc(c0[0], c0[1], 36, th1, th0, !ccw); ctx.closePath();
          ctx.fillStyle = rgba(K.deep, 0.5); ctx.fill();
          ctx.beginPath(); ctx.arc(c0[0], c0[1], 96, th0, th1, ccw); ctx.strokeStyle = rgba(K.ink, 0.8); ctx.lineWidth = 5; ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(H.g, 0.85); ctx.lineWidth = 1.6; ctx.stroke();
          ctx.beginPath(); ctx.arc(c0[0], c0[1], 70, th0, th1, ccw); ctx.strokeStyle = rgba(H.e, 0.3); ctx.lineWidth = 8; ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 'dance': {   // afterimages of the blade, a hot disc swept under them
        const w = ph.k;
        add(ctx, () => {
          ctx.beginPath(); ctx.arc(0, -8, 78, 0, TAU); ctx.strokeStyle = rgba(H.e, 0.18 * w); ctx.lineWidth = 12; ctx.stroke();
          for (let j = 1; j <= 9; j++) { const a = o.bFin - j * 0.2 * Math.sign(o.spinV || 1), x0 = Math.cos(a) * 28, y0 = Math.sin(a) * 22 - 8; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a) * 94, y0 + Math.sin(a) * 94); ctx.strokeStyle = rgba(j < 4 ? H.g : H.e, 0.34 * (1 - j / 10) * w); ctx.lineWidth = 3 - j * 0.2; ctx.stroke(); }
        });
        break;
      }
      case 'rebirth': {   // wings of fire opening from the shoulders at the burst, cinders lifting off the whole of it
        const b = ph.u > 0.38 ? easeOut(clamp((ph.u - 0.38) / 0.22, 0, 1)) : 0;
        if (b > 0.02) {
          ctx.save(); ctx.globalAlpha = b;
          for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) {
            const len = (64 + 26 * (k === 2 ? 1 : 0.6)) * b * (0.9 + 0.1 * Math.sin(t * 4 + k + sd));
            flame(ctx, sd * 16, -6, len, 11, sd * (Math.PI / 2 - 0.35 + k * 0.34 + 0.06 * Math.sin(t * 3 + k)));
          }
          ctx.restore();
        }
        add(ctx, () => {
          glow(ctx, 0, -6, 70 + 80 * ph.flash, K.white, 0.5 * ph.flash + 0.12 * b);
          for (let k = 0; k < 2; k++) { const q = clamp((ph.u - 0.4) / 0.3 - k * 0.15, 0, 1); if (q > 0 && q < 1) { ctx.beginPath(); ctx.arc(0, -6, 30 + q * 150, 0, TAU); ctx.strokeStyle = rgba(k ? H.e : K.white, 0.9 * (1 - q)); ctx.lineWidth = 5 * (1 - q) + 1; ctx.stroke(); } }
          for (let i = 0; i < 26; i++) { const q = (t * 0.4 + hash(i, 3)) % 1, a = hash(i, 4) * TAU, d = 20 + hash(i, 5) * 80; circle(ctx, Math.cos(a) * d, -6 + Math.sin(a) * d - q * 40, 1 + 1.2 * (1 - q), rgba(i % 3 ? H.e : H.g, 0.8 * (1 - q) * (0.3 + b))); }
        });
        break;
      }
      case 'pyre': {   // cracks run out of where the blade went in; the floor takes the heat
        const k = ph.k, tx = tip[0], ty = tip[1];
        add(ctx, () => {
          glow(ctx, tx, ty, 30 + 70 * k, H.e, 0.5 * k * (0.5 + 0.5 * ph.fade) + 0.5 * ph.flash);
          ctx.lineCap = 'round';
          for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + hash(i, 6) * 0.5, len = (40 + hash(i, 7) * 50) * k; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a) * len * 0.5 + (hash(i, 8) - 0.5) * 8, ty + Math.sin(a) * len * 0.5); ctx.lineTo(tx + Math.cos(a) * len, ty + Math.sin(a) * len); ctx.strokeStyle = rgba(i % 2 ? H.e : H.g, 0.7 * (0.4 + 0.6 * ph.fade) * k); ctx.lineWidth = 1.6; ctx.stroke(); }
          for (let j = 0; j < 2; j++) { const q = clamp((ph.p - 0.3) / 0.5 - j * 0.16, 0, 1); if (q > 0 && q < 1) { ctx.beginPath(); ctx.arc(tx, ty, 10 + q * 90, 0, TAU); ctx.strokeStyle = rgba(j ? H.r : H.g, 0.8 * (1 - q)); ctx.lineWidth = 4 * (1 - q) + 0.6; ctx.stroke(); } }
        });
        break;
      }
      case 'enrage': {   // a red wash, rings of fire running out of it, the heat on everything
        add(ctx, () => {
          glow(ctx, 0, -6, 130 + 20 * Math.sin(t * 9), H.r, 0.4 * ph.k); glow(ctx, 0, -6, 60, H.g, 0.4 * ph.k);
          for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; ctx.beginPath(); ctx.arc(0, -6, 40 + q * 150, 0, TAU); ctx.strokeStyle = rgba(k % 2 ? H.e : K.white, 0.55 * (1 - q) * ph.k); ctx.lineWidth = 4 * (1 - q) + 0.8; ctx.stroke(); }
          for (let i = 0; i < 30; i++) { const q = (t * 0.55 + hash(i, 9)) % 1, a = hash(i, 10) * TAU + q * 0.8, d = 30 + q * 130; circle(ctx, Math.cos(a) * d, -6 + Math.sin(a) * d, 1 + 1.4 * (1 - q), rgba(i % 3 ? H.e : K.white, 0.8 * (1 - q) * ph.k)); }
        });
        break;
      }
    }
  }
  // over the figure: what the hand sends out
  function poseFront(ctx, pose, o) {
    const { t, s, ph, tip, eHand } = o;
    switch (pose) {
      case 'brand': {   // the iron's tip goes white; at the blow a ring of glyph-marks is set where it points
        const hot = ph.g * 0.5 + ph.k * 0.5;
        add(ctx, () => {
          glow(ctx, tip[0], tip[1], 12 + 30 * hot, K.white, 0.4 * hot + 0.6 * ph.flash);
          if (ph.k > 0) { const q = easeOut(clamp((ph.p - 0.3) / 0.3, 0, 1)), r = 10 + 20 * q, ax = tip[0] + 0, ay = tip[1] - 8 * q; ctx.beginPath(); ctx.arc(ax, ay, r, 0, TAU); ctx.strokeStyle = rgba(H.g, 0.9 * ph.fade); ctx.lineWidth = 2.2; ctx.stroke(); ctx.beginPath(); ctx.arc(ax, ay, r * 0.55, 0, TAU); ctx.strokeStyle = rgba(H.e, 0.8 * ph.fade); ctx.lineWidth = 1.2; ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * r * 0.55, ay + Math.sin(a) * r * 0.55); ctx.lineTo(ax + Math.cos(a) * (r + 6), ay + Math.sin(a) * (r + 6)); ctx.stroke(); } }
        });
        break;
      }
      case 'ember': {   // the ember, let go: it leaves the hand and goes on ahead, trailing
        if (ph.p > 0.5) {
          const q = clamp((ph.p - 0.5) / 0.5, 0, 1), x = eHand[0] * (1 - q) + 0, y = eHand[1] - 20 - 160 * q * q, a = 1 - q * q;
          add(ctx, () => { for (let j = 1; j <= 7; j++) { const qq = Math.max(0, q - j * 0.035); circle(ctx, x * 1, eHand[1] - 20 - 160 * qq * qq, 5 - j * 0.5, rgba(H.e, 0.55 * a * (1 - j / 8))); } glow(ctx, x, y, 22, H.g, 0.8 * a); glow(ctx, x, y, 8, K.white, 0.95 * a); });
        }
        break;
      }
      case 'scatter': {   // the ember thrown open: a fan of sparks across the front
        if (ph.k > 0) add(ctx, () => {
          const q = clamp((ph.p - 0.35) / 0.65, 0, 1);
          for (let i = 0; i < 30; i++) { const a = -Math.PI / 2 + (hash(i, 11) - 0.5) * 2.5 - s * 0.2, d = (28 + hash(i, 12) * 110) * easeOut(q), x = eHand[0] + Math.cos(a) * d, y = eHand[1] + Math.sin(a) * d + q * q * 14; circle(ctx, x, y, 1 + 1.6 * hash(i, 13) * (1 - q * 0.6), rgba(i % 3 ? H.e : H.g, 0.9 * (1 - q))); }
          glow(ctx, eHand[0], eHand[1], 30, H.g, 0.7 * ph.flash);
        });
        break;
      }
      case 'crescent': {   // a crescent of fire thrown ahead, hot white at the edge, ink behind it, going on and out
        if (ph.k > 0.02) {
          const q = clamp((ph.p - 0.35) / 0.65, 0, 1), cy = -54 - 130 * easeOut(q), Rr = 54 + 26 * q, a0 = -Math.PI / 2 - 1.15, a1 = -Math.PI / 2 + 1.15, al = q < 0.1 ? q * 10 : 1 - clamp((q - 0.55) / 0.45, 0, 1);
          ctx.save(); ctx.globalAlpha = Math.max(0, al);
          const cr = () => { ctx.beginPath(); ctx.arc(0, cy + Rr * 0.9, Rr, a0, a1); ctx.quadraticCurveTo(0, cy - Rr * 0.12, Math.cos(a0) * Rr, cy + Rr * 0.9 + Math.sin(a0) * Rr); ctx.closePath(); };
          cr(); ctx.fillStyle = rgba(H.r, 0.85); ctx.fill(); ctx.strokeStyle = rgba(K.ink, 0.9); ctx.lineWidth = 2.4; ctx.stroke();
          ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(0, cy + Rr * 0.9, Rr, a0 + 0.1, a1 - 0.1); ctx.strokeStyle = rgba(K.white, 0.95); ctx.lineWidth = 2.2; ctx.stroke(); ctx.strokeStyle = rgba(H.g, 0.6); ctx.lineWidth = 7; ctx.stroke();
          glow(ctx, 0, cy, 50, H.e, 0.3);
          ctx.restore();
        }
        break;
      }
      case 'lance': {   // the lance of light: the blade's own point carried on ahead of it, a thin white needle with a hot head
        const k = ph.kS, f = ph.fade;
        if (ph.k > 0.02) add(ctx, () => {
          const len = 60 + 130 * ph.k, ux = Math.cos(o.bFin), uy = Math.sin(o.bFin);
          ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + ux * len, tip[1] + uy * len); ctx.strokeStyle = rgba(H.e, 0.35 * f); ctx.lineWidth = 9; ctx.stroke();
          ctx.strokeStyle = rgba(H.g, 0.8 * f); ctx.lineWidth = 3.2; ctx.stroke(); ctx.strokeStyle = rgba(K.white, f); ctx.lineWidth = 1.3; ctx.stroke();
          glow(ctx, tip[0] + ux * len, tip[1] + uy * len, 18, K.white, 0.8 * f); glow(ctx, tip[0], tip[1], 20, H.g, 0.5 * (k + ph.flash));
        });
        break;
      }
      case 'pyre': {   // the flames standing round the blade, taller as it burns on
        const k = ph.k, tx = tip[0], ty = tip[1], n = 11;
        for (let i = 0; i < n; i++) { const a = i * TAU / n + t * 0.4, r = (14 + 12 * k) * (0.7 + 0.3 * hash(i, 14)); ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5 + 0.1); flame(ctx, tx + Math.cos(a) * r, ty + Math.sin(a) * r * 0.8, (12 + 24 * k * (0.6 + 0.4 * hash(i, 15))) * (0.8 + 0.2 * Math.sin(t * 8 + i)), 5 + 2 * k, Math.cos(a) * 0.35); ctx.restore(); }
        add(ctx, () => glow(ctx, tx, ty - 6, 14 + 10 * k, K.white, 0.5 * k + 0.5 * ph.flash));
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------------------------------------- the whole
  function body(ctx, st, angle = 0) {
    const pr = st.props || {}, t = st.t || 0;
    let pose = pr.svPose && POSES.includes(pr.svPose) ? pr.svPose : 'idle';
    if (pose === 'idle') for (const k of POSES) if (pr[propOf(k)]) { pose = k; break; }
    // which hand holds the blade (a swap is a slow turn of it, not a jump)
    const sTarget = pr.svBladeSide === -1 ? -1 : 1, s = sm(st, 'svSd', sTarget, 0.1), sg = s >= 0 ? 1 : -1, ph = phase(st, pose, t);
    const dt = clamp(t - (st.svTl == null ? t : st.svTl), 0, 0.1); st.svTl = t;
    const wheel = sm(st, 'svWh', pr.svWheel ? 1 : 0, 0.035), call = pr.svCall == null ? -1 : pr.svCall, lit = pr.svLit == null ? 0xfff : pr.svLit;
    const mv = st.moving ? 1 : 0, form = pr.svForm;
    // the act: the figure grows through hall, forge, crater, square, easing over about two seconds whenever svForm changes
    const evT = FORMS[form] == null ? 0 : FORMS[form];
    if (st.svEv == null) st.svEv = evT; st.svEv += (evT - st.svEv) * (1 - Math.exp(-dt * 2.2));
    const ev = st.svEv, at = (a, b, c, d) => { const i = clamp(Math.floor(ev), 0, 2), q = clamp(ev - i, 0, 1), v = [a, b, c, d]; return lerp(v[i], v[i + 1], q); };
    st.svGut = sm(st, 'svGutV', clamp(pr.svGutter || 0, 0, 1), 1 - Math.exp(-dt * 1.6));   // the kill: the fire drains out of it
    const gut = st.svGut, flick = 1 - gut * 0.5 * (1 + Math.sin(t * 23) * Math.sin(t * 6.1));
    E.bladeK = at(0.78, 1.05, 1.18, 1.38); E.bladeHeat = at(-0.15, 0.15, 0.3, 0.6); E.rimK = at(0.35, 0.75, 1, 1.4); E.tat = at(0, 0.15, 0.55, 1); E.molten = at(0, 0, 0.85, 1);
    E.slag = at(0, 1, 1, 0.85); E.trailK = at(0.8, 1.4, 1.05, 0.72); E.starK = at(0, 0, 1, 0.6); E.slit = at(0, 0, 0.9, 1); E.wg = at(0, 0, 0.12, 1); E.tail = at(1, 1.05, 0.62, 0.8); E.gut = gut;
    const wq = Math.round(E.wg * 8) / 8, gq = Math.round(gut * 8) / 8;
    H.e = hexMix(hexMix(K.ember, '#ffc860', wq * 0.7), K.red, gq * 0.6); H.g = hexMix(hexMix(K.gold, '#fff0c0', wq), K.ember, gq * 0.7); H.r = hexMix(hexMix(K.red, '#ff9a3a', wq * 0.8), K.deep, gq * 0.6);
    st.svHk = at(0.88, 1, 1, 1.04);
    // the sigils' own lights: eased toward lit or dark, a burst when one goes out
    if (!st.svLv) { st.svLv = new Array(N).fill(0).map((_, i) => (lit >> i) & 1); st.svFl = new Array(N).fill(0); st.svLb = lit; }
    for (let i = 0; i < N; i++) { const on = (lit >> i) & 1; if (((st.svLb >> i) & 1) && !on) st.svFl[i] = 1; st.svLv[i] += (on - st.svLv[i]) * 0.07; st.svFl[i] *= 0.95; }
    st.svLb = lit;

    // what each pose asks of the body (authored for the blade in the right hand; the angles and hands mirror for the left)
    const base = Math.atan2(-0.85, 0.52), mir = a => sg > 0 ? a : Math.PI - a, X = v => sg * v;
    const T = { hx: X(30), hy: -16, ba: mir(base), L: 1, ox: -X(30), oy: -14, eb: 1, fwd: 0, fl: 1, arms: 0, core: 0.5 + 0.12 * wheel, halB: 0.6, eye: 0.7, up: 0, spinV: 0.12, turn: 0, orbit: 0, crumple: 0 };
    const { g, k, kS, u } = ph;
    switch (pose) {
      case 'kindling': {   // the ember brought to the heart, both hands closing on it; then thrown wide in front and the robe flares
        T.ox = lerp(lerp(-X(30), -X(8), g), -X(3), k); T.oy = lerp(lerp(-14, -8, g), -62, k); T.eb = 1 + 0.5 * g + 0.9 * k;
        T.hx = X(lerp(30, 13, g)); T.hy = lerp(-16, -5, g); T.ba = mir(-1.45); T.L = 0.6; T.core = 0.6 + 0.5 * g + 0.4 * k; T.fl = 1 - 0.12 * g + 0.12 * k; T.halB = 0.8 + 0.4 * k; T.eye = 0.9; T.fwd = -2 * g + 5 * k; break;
      }
      case 'brand': {   // the blade brought up across the chest, point to the far side; then driven straight out at what it marks
        const a = lerpA(mir(base), mir(-2.25), g); T.hx = X(lerp(30, 11, g) - 3 * k); T.hy = lerp(lerp(-16, -26, g), -54, k); T.ba = lerpA(a, -Math.PI / 2, k); T.L = lerp(1, 0.82, g) + 0.5 * k; T.ox = -X(30); T.oy = -8; T.eb = 0.8;
        T.fwd = 8 * k - 3 * g; T.core = 0.7 + 0.4 * k; T.halB = 0.85; T.eye = 0.9; break;
      }
      case 'sweep': {   // the blade out wide on its own side, point back, held; then swung through the front to the far side
        const th = lerp(lerpA(base, 0.245, g), -2.94, k), a = sg > 0 ? th : Math.PI - th;
        T.ba = a; T.orbit = g > 0.05 || k > 0 ? 1 : 0; T.L = 1.12 + 0.2 * kS; T.ox = -X(lerp(30, 34, g)); T.oy = lerp(-14, 4, g); T.fwd = 2 * k; T.fl = 1 + 0.12 * kS; T.halB = 0.8; T.core = 0.7 + 0.3 * kS; T.eye = 0.9; T.arms = 0.25 * g; break;
      }
      case 'ember': {   // the ember lifted from the side and held out in a cupped hand, swelling; thrust at arm's length, then let go
        T.ox = lerp(lerp(-X(30), -X(11), g), -X(5), k); T.oy = lerp(lerp(-14, -34, g), -74, k); T.eb = 1 + 0.4 * g + 1.1 * k * (ph.p < 0.5 ? 1 : 0.35); T.L = 0.8; T.hy = -10; T.ba = mir(-0.9);
        T.core = 0.7 + 0.5 * kS; T.halB = 0.8; T.eye = 0.95; T.fwd = 2 * k; break;
      }
      case 'scatter': {   // the ember closed in a fist at the chest; then the hand thrown open and out, the fingers spread
        T.ox = lerp(lerp(-X(30), -X(8), g), -X(48), k); T.oy = lerp(lerp(-14, -10, g), -44, k); T.eb = lerp(1 + 0.3 * g, 0.2, k); T.hx = X(26); T.hy = 2; T.ba = mir(-0.25); T.L = 0.8; T.arms = 0.5 * k;
        T.core = 0.7 + 0.5 * k; T.halB = 0.9; T.eye = 0.95; T.fl = 1 + 0.08 * k; break;
      }
      case 'haloturn': {   // both hands out low to the sides, palms open, the blade down: the halo spun up round it
        T.hx = X(lerp(30, 46, kS)); T.hy = lerp(-16, 4, kS); T.ba = lerpA(mir(base), mir(-0.2), kS); T.L = 0.8; T.ox = -X(lerp(30, 46, kS)); T.oy = lerp(-14, 4, kS); T.eb = lerp(1, 0.1, kS); T.arms = 0.45 * kS;
        T.halB = 0.7 + 0.7 * kS; T.turn = kS; T.spinV = 0.12 + 2.3 * kS; T.core = 0.6 + 0.4 * kS; T.eye = 1; T.fl = 1.06; break;
      }
      case 'call': {   // the blade raised (small from above, its point to the sky), the other hand out with the ember held up, palm open: the name said
        T.hx = X(lerp(30, 40, kS)); T.hy = lerp(-16, -14, kS); T.ba = mir(-1.3); T.up = kS; T.L = 1 - 0.62 * kS; T.ox = -X(lerp(30, 12, kS)); T.oy = lerp(-14, -56, kS); T.eb = 1 + 0.6 * kS; T.arms = 0.2 * kS;
        T.halB = 0.8 + 0.5 * kS; T.core = 0.7 + 0.5 * kS; T.eye = 1; T.fwd = 3 * kS; T.fl = 1.05; break;
      }
      case 'rebirth': {   // crouched in on itself, folded tight; then a burst, the arms thrown up and wings of fire spread behind
        const c = u < 0.4 ? Math.sin(u / 0.4 * Math.PI / 2) : u < 0.55 ? 1 - (u - 0.4) / 0.15 : 0, b = u > 0.4 ? easeOut(clamp((u - 0.4) / 0.2, 0, 1)) : 0;
        T.fl = (1 - 0.45 * c) * (1 - b) + 1.35 * b; T.arms = b; T.hx = X(lerp(lerp(30, 14, c), 28, b)); T.hy = lerp(lerp(-16, -4, c), -30, b); T.ba = mir(-1.2); T.up = 0.9 * b; T.L = lerp(1, 0.45, b); T.ox = -T.hx; T.oy = T.hy; T.eb = 1 + 1.2 * b + 0.3 * c;
        T.core = 0.5 + 0.5 * c + 1.1 * b; T.halB = 0.6 + 1.0 * b; T.eye = 0.8 + 0.2 * b; T.spinV = 0.12 + 1.2 * b; T.fwd = -3 * c; T.crumple = c; break;
      }
      case 'dance': {   // the blade out in a long reach, the other hand back; then the whole of it turning, the blade carrying it round
        T.ba = mir(base); T.L = 1.2; T.orbit = kS > 0.1 ? 1 : 0; T.ox = -X(34); T.oy = lerp(-14, 8, kS); T.fl = 1 + 0.08 * kS; T.halB = 0.8 + 0.4 * kS; T.core = 0.7 + 0.4 * kS; T.eye = 0.95; T.arms = 0.5 * kS; T.spinV = 0.12 + 0.6 * kS; break;
      }
      case 'crescent': {   // the blade raised high behind the shoulder, seen from above; then chopped down and out ahead, the crescent leaving it
        const a = lerpA(mir(base), mir(1.2), g);
        T.hx = X(lerp(lerp(30, 18, g), 14, k)); T.hy = lerp(lerp(-16, -2, g), -42, k); T.ba = lerpA(a, mir(-1.45), k); T.up = 0.7 * g * (1 - k); T.L = lerp(1, 0.55, g * (1 - k)) + 0.4 * k;
        T.ox = -X(30); T.oy = -12; T.fwd = 10 * k - 2 * g; T.halB = 0.85; T.core = 0.7 + 0.4 * k; T.eye = 0.95; T.fl = 1 + 0.1 * k; break;
      }
      case 'lance': {   // the blade drawn back low at the hip, the body sunk behind it; then a lunge, the blade driven out long
        T.hx = X(lerp(lerp(30, 18, g), 10, k)); T.hy = lerp(lerp(-16, 12, g), -50, k); T.ba = lerpA(mir(base), -Math.PI / 2 + sg * 0.02, Math.max(g * 0.8, k)); T.L = lerp(1, 0.9, g) + 0.7 * k;
        T.ox = -X(lerp(30, 24, g)); T.oy = lerp(-14, 16, g); T.fwd = -5 * g + 22 * k; T.fl = 1 + 0.15 * k; T.halB = 0.85; T.core = 0.7 + 0.5 * k; T.eye = 0.95; T.arms = 0.3 * k; break;
      }
      case 'pyre': {   // the blade lifted point down, then planted in the floor ahead; the free hand pressed flat to the ground beside it
        T.hx = X(lerp(lerp(30, 14, g), 10, k)); T.hy = lerp(lerp(-16, -34, g), -46, k); T.ba = -Math.PI / 2 + sg * 0.1; T.up = 0.95 * (g * 0.6 + k * 0.4); T.L = lerp(1, 0.35, Math.max(g, k));
        T.ox = -X(lerp(30, 16, k)); T.oy = lerp(-14, -34, k); T.eb = 1 - 0.8 * k; T.fwd = 4 * k - 2 * g; T.core = 0.7 + 0.5 * k; T.halB = 0.9; T.eye = 0.95; T.fl = 1 - 0.05 * g + 0.1 * k; break;
      }
      case 'enrage': {   // both arms thrown up, the blade held high, the ember swollen: everything alight
        T.hx = X(26); T.hy = -32; T.ba = mir(-1.3); T.up = 0.85 * kS; T.L = lerp(1, 0.5, kS); T.ox = -X(26); T.oy = -32; T.eb = 1 + 1.5 * kS; T.fl = 1 + 0.35 * kS; T.arms = kS; T.core = 0.6 + 0.9 * kS; T.halB = 0.8 + 0.8 * kS; T.eye = 1; T.spinV = 0.12 + 0.9 * kS; T.turn = 0.4 * kS; break;
      }
    }
    const rate = pose !== 'idle' && !SUSTAIN[pose] && ph.p >= 0.25 && ph.p < 0.62 ? 0.34 : 0.12;
    const P = smv(st, 'svP', [T.hx, T.hy, T.L, T.ox, T.oy, T.eb, T.fwd, T.fl, T.arms, T.core, T.up, T.halB, T.eye, T.turn, T.crumple], rate);
    const bA = smA(st, 'svBa', T.ba, rate), orbit = sm(st, 'svOb', T.orbit, 0.18);
    // the halo's turning (one clock, so the echoes can find a sigil); the dance's spin settles to the nearest whole turn when it stops
    st.svSpinV = sm(st, 'svSpinV', T.spinV, 0.05); st.svSpin = (st.svSpin || 0) + st.svSpinV * dt;
    const dv = pose === 'dance' ? 8.5 * ph.k : 0; st.svDv = sm(st, 'svDv', dv, 0.08);
    st.svDa = (st.svDa || 0) + st.svDv * dt; if (st.svDv < 0.4) st.svDa += (Math.round(st.svDa / TAU) * TAU - st.svDa) * 0.08;
    const bFin = bA + st.svDa, L = P[2] * 80 * E.bladeK * (1 - 0.12 * gut), heat = clamp(P[9] + 0.15 * E.wg + 0.1 * E.molten, 0.1, 1.7) * (1 - 0.9 * gut) * flick, halB = P[11] * (1 - 0.7 * gut), eye = P[12] * Math.max(0, 1 - gut * 1.1) * flick;
    // the hand: where the pose puts it, or on an orbit about the body when the blade carries it (sweep, dance)
    const ox = Math.cos(bFin) * 28, oy = Math.sin(bFin) * 22 - 8;
    const hx = lerp(P[0], ox, orbit), hy = lerp(P[1], oy, orbit), eHand = [P[3], P[4]];
    const R = lerp(R0 * st.svHk, R1, wheel), warm = form === 'crater' || form === 'square' ? 1 : 0;

    ctx.save(); ctx.scale(S, S);
    // ---- on the floor, in the world's frame: the scorched ring, the heat under it
    ctx.save(); ctx.rotate(-angle);
    G.scorch = G.scorch || (() => { const gr = ctx.createRadialGradient(0, 0, 30, 0, 0, 98); gr.addColorStop(0, 'rgba(70,20,10,0.45)'); gr.addColorStop(0.42, 'rgba(10,8,12,0.55)'); gr.addColorStop(0.72, 'rgba(10,8,12,0.32)'); gr.addColorStop(1, 'rgba(10,8,12,0)'); return gr; })();
    ctx.fillStyle = G.scorch; ctx.beginPath(); ctx.arc(0, 0, 98, 0, TAU); ctx.fill();
    add(ctx, () => {
      glow(ctx, 0, 0, 120 + 30 * halB, K.deep, 0.5 + 0.2 * heat);
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + hash(i, 1) * 0.3, r0 = 48 + hash(i, 2) * 8, r1 = 66 + hash(i, 3) * 26, jx = (hash(i, 4) - 0.5) * 10; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * (r0 + r1) / 2 + jx, Math.sin(a) * (r0 + r1) / 2 + jx * 0.5); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.strokeStyle = rgba(H.e, (0.2 + 0.22 * heat) * (0.7 + 0.3 * Math.sin(t * 2 + i))); ctx.lineWidth = 1.3; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.strokeStyle = rgba(H.e, 0.16); ctx.lineWidth = 1.4; ctx.stroke();
    });
    haloBack(ctx, st, { t, w: wheel, R, spin: st.svSpin, turn: P[13] });
    ctx.restore();

    // ---- the figure, in its own frame: forward is up in the concept's plate, so turn it a quarter to face +x
    ctx.save(); ctx.rotate(Math.PI / 2);
    trail(ctx, t, mv, P[7], heat);
    ctx.save(); ctx.translate(0, -P[6] - 4 * gut);
    const tip0 = [hx + Math.cos(bFin) * (5 + L), hy + Math.sin(bFin) * (5 + L)];
    const fx = { t, s: sg, ph, P, tip: tip0, bFin, eHand, spinV: st.svDv };
    poseBack(ctx, pose, fx);
    // the hitbox ring: bright at the front, dim at the sides, faint behind
    ctx.save(); ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(H.g, 0.7); ctx.beginPath(); ctx.arc(0, 0, 56, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke();
    ctx.strokeStyle = rgba(H.e, 0.3); ctx.beginPath(); ctx.arc(0, 0, 56, -Math.PI * 0.25, Math.PI * 0.25); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 56, Math.PI * 0.75, Math.PI * 1.25); ctx.stroke();
    ctx.strokeStyle = rgba(K.smoke, 0.3); ctx.beginPath(); ctx.arc(0, 0, 56, Math.PI * 0.25, Math.PI * 0.75); ctx.stroke();
    ctx.restore();
    robe(ctx, t, P[7], mv, heat * (1 + 0.15 * warm), pose === 'enrage' ? ph.k : 0);
    moltenCore(ctx, t, heat);
    smokeArms(ctx, t, P[8]);
    shoulders(ctx, heat, t);
    // the off hand (the ember) and its sleeve, then the blade arm, the head, the blade over them
    const bs = sg;
    sleeve(ctx, -bs * 20, -8, eHand[0], eHand[1], -bs * 5);
    add(ctx, () => { glow(ctx, 0, 2, 22 + 10 * heat + 14 * E.wg, H.e, (0.28 + 0.25 * heat) * (0.88 + 0.12 * Math.sin(t * 2))); glow(ctx, 0, 2, 6 + 3 * heat + 6 * E.wg, K.white, (0.7 + 0.2 * heat) * (1 - 0.8 * gut) * flick); if (E.wg > 0.05) glow(ctx, 0, 2, 40, H.g, 0.3 * E.wg * (1 - gut)); });   // the heat at the core
    emberHand(ctx, eHand[0], eHand[1], P[5], clamp(P[5] * 1.1 - 0.1, 0, 1), t, eHand[0] < 0 ? 0 : Math.PI);
    sleeve(ctx, bs * 20, -8, hx, hy, bs * 5);
    head(ctx, t, eye, heat, 0);
    const tip = blade(ctx, hx, hy, bFin, L, { t, heat: clamp(heat * 0.9 + 0.2 + E.bladeHeat * (1 - gut), 0, 1.5), wide: (pose === 'enrage' ? 1.4 : 1) * (1 + 0.1 * E.wg) });
    if (P[10] > 0.4) add(ctx, () => { glow(ctx, tip[0], tip[1], 18 + 24 * P[10], H.g, 0.4 * P[10]); for (let i = 0; i < 5; i++) { const q = (t * 0.7 + i / 5) % 1; circle(ctx, tip[0] + (hash(i, 17) - 0.5) * 12, tip[1] - q * 28, 0.8 + (1 - q) * 1.2, rgba(H.g, 0.8 * (1 - q) * P[10])); } });
    hand(ctx, hx, hy, 0, 0);
    fx.tip = tip; fx.eHand = eHand;
    poseFront(ctx, pose, fx);
    ctx.restore();
    ctx.restore();

    // ---- over it all, in the world's frame: the sigils, then embers drifting out in a slow spiral
    ctx.save(); ctx.rotate(-angle);
    haloFront(ctx, st, { t, w: wheel, R, spin: st.svSpin, call, callK: pose === 'call' ? 1 : 0.6 });
    add(ctx, () => {
      for (let i = 0; i < 40; i++) { const p = (t * 0.12 + i * 0.1379) % 1, a = i * 2.399 + p * 1.6, r = 26 + p * (R + 40 - 26); ctx.globalAlpha = (1 - p) * 0.75 * (1 - 0.9 * E.gut) * (1 + 0.4 * E.wg); ctx.fillStyle = i % 3 ? H.e : H.g; ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.8, 1.8); }
    });
    ctx.restore();
    ctx.restore();
  }

  return { body, sigilPos, POSES, propOf, DRAW };
})();

if (typeof BOSS_ART !== 'undefined') BOSS_ART.sovereign = SV_ART.body;

// A preview hook: draws the boss onto any canvas. opts: t (seconds), pose (a name or none), lit (12-bit mask), call (sigil or -1), wheel (0 or 1),
// side (1 right, -1 left), angle (facing; default up the canvas), action ({t0, dur} for a swing), zoom (canvas px per game px), form, clear (false to keep what is there).
// The canvas keeps its own smoothing state between calls, so a run of frames animates as in the game.
window.__svArtPreview = function (canvas, opts = {}) {
  const ctx = canvas.getContext('2d'), st = canvas.__svSt || (canvas.__svSt = { t: 0 });
  st.t = opts.t || 0;
  st.props = { svLit: opts.lit == null ? 0xfff : opts.lit, svCall: opts.call == null ? -1 : opts.call, svWheel: opts.wheel ? 1 : 0, svGutter: opts.gutter || 0, svBladeSide: opts.side || 1, svForm: opts.form || 'hall', svPose: opts.pose || '' };
  st.action = opts.action ? { type: 'attack', t0: opts.action.t0, dur: opts.action.dur } : null;
  const angle = opts.angle == null ? -Math.PI / 2 : opts.angle, zoom = opts.zoom || canvas.width / 560;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (opts.clear !== false) { ctx.fillStyle = opts.bg || '#121016'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(zoom, zoom); ctx.rotate(angle);
  SV_ART.body(ctx, st, angle);
  ctx.restore();
  return st;
};
