// Brannoc the Undefeated: everything he looks like and the two rooms he stands in, drawn in code. His body (a huge laughing pit-fighter,
// bare arms covered in old victory brands, a gilded half-helm, a red loincloth, the Sunwheel on his back), a pose for each of his casts;
// the Tidewrought (the same function draws the second form: a colossal sea-titan rising out of the water at the ring's north edge,
// a barnacled bronze shell, a bearded helm-face and one great fist made of the Sunwheel); the tide-hand add; the debris prop; the
// drowned colosseum (half-flooded sand, ghost crowd, banners, torches, the Fallen Star) and the broken ring in the open sea, and
// both rooms' ambient life. Loaded after arena-view.js and set3-sky.js; it adds to BOSS_ART / ADD_ART / ArenaView itself.
// Look: the user's painted sheets (docs/art/vfx-reference/brannoc-1.png, -2.png): wet sand and sea teal, bronze and blazing gold for the
// Sunwheel, pale ghost-green for the crowd, red banner cloth.
//
// st.props (main.js, boss-vfx.js CAST_POSE):
//   titan                                   the second form (the room's form is 'sea'): the Tidewrought
//   wheelOut                                a wheel is in flight: the Sunwheel is gone from his back / from the titan's fist (main.js, from the brpath moments)
//   first form, held while the move runs:   throw (the wheel drawn back, then the arm swung through), kick (Riposte), leap (in the air),
//                                           pose (4 s after the landing: arms up for the crowd), heel, roar, furrow, rise
//   the Tidewrought:                        slam (fist raised, then down), grip (the hand reaching, then closing), unbound (the wheel-fist
//                                           blazing, then thrown), call / risen (arms wide), bell (the enrage: a gold glow)
//
// BR_ART.wheel(ctx, x, y, r, o) draws the Sunwheel itself (o: rot, blaze 0..1, tilt, dim, t) for the tells and impacts to reuse.

const BR_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const K = {
    skin: '#c4825a', skinD: '#85502f', skinH: '#ecb68a', brand: '#ffb347', brandH: '#ffe3a0',
    bronze: '#a2702c', bronzeD: '#4f3411', bronzeM: '#7a5220', bronzeH: '#e2ac55', gold: '#f2c744', goldH: '#fff0a8',
    red: '#b3281f', redD: '#6a1411', redH: '#e2503f', hair: '#6a2f14',
    sea: '#2a8a8c', seaD: '#0b3a44', seaL: '#7fe0d8', foam: '#eafcff', ghost: '#9dffd0',
    stone: '#78828a', stoneD: '#46515a', stoneH: '#aeb8bd', sand: '#9a835a', sandD: '#6e5b3c', sandH: '#c4ad7c', verd: '#3f9d8a',
  };
  // where a cast is in its swing: strike 0 (gathering) .. 1 (the blow has landed), then rest 0 .. 1 (back to standing). Before the cast's own
  // swing begins, and with no swing at all, it is the gathering.
  function atk(st) {
    const a = st.action;
    if (!a || a.type !== 'attack') return { strike: 0, rest: 0, p: -1 };
    const p = (actT(st) - a.t0) / a.dur;
    if (p < 0.3) return { strike: 0, rest: 0, p };
    if (p < 0.55) return { strike: easeOut((p - 0.3) / 0.25), rest: 0, p };
    return { strike: 1, rest: p >= 1 ? 1 : easeOut((p - 0.55) / 0.45), p };
  }

  // ---------------------------------------------------------------------------------------------------------- small parts
  // barnacles: a cluster of pale limpet cones with a dark mouth
  function barnacles(ctx, x, y, n, spread, seed, s = 1) {
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed) * TAU, d = Math.sqrt(hash(i, seed + 3)) * spread, r = (2.2 + hash(i, seed + 5) * 2.6) * s, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8;
      circle(ctx, px, py, r, '#d9d3bd', OUT, 1);
      circle(ctx, px - r * 0.2, py - r * 0.25, r * 0.5, '#f4f0df');
      circle(ctx, px, py, r * 0.32, '#2a2218');
    }
  }
  // a strand of kelp hanging from (x, y)
  function kelp(ctx, x, y, len, t, seed, col = '#2f7a4a') {
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      ctx.beginPath(); ctx.moveTo(x + k * 3, y);
      for (let j = 1; j <= 5; j++) ctx.lineTo(x + k * 3 + Math.sin(t * 1.4 + seed + j * 0.9 + k) * (2 + j * 1.2), y + len * j / 5);
      ctx.strokeStyle = OUT; ctx.lineWidth = 4.4 - k * 1.2; ctx.stroke();
      ctx.strokeStyle = k ? '#3f9a5c' : col; ctx.lineWidth = 2.6 - k * 0.8; ctx.stroke();
    }
    ctx.restore();
  }
  // the Sunwheel: a round war-shield, a blazing gold rim of rays, bronze face with spokes and a red boss. o: { rot, blaze, tilt, dim, t }
  function wheel(ctx, x, y, r, o = {}) {
    const blaze = o.blaze || 0, dim = !!o.dim, t = o.t || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(1, o.tilt || 1);
    if (dim) ctx.globalAlpha *= 0.3;
    if (blaze > 0 && !dim) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, r * 2.3, K.gold, 0.34 * blaze); glow(ctx, 0, 0, r * 1.35, '#fff0b0', 0.3 * blaze); ctx.restore(); }
    const n = 16, rim = [];
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * 0.98 : r * 1.2; rim.push(Math.cos(a) * rr, Math.sin(a) * rr); }
    poly(ctx, rim, '#e49a24', OUT, Math.max(1.5, r * 0.07));
    circle(ctx, 0, 0, r * 0.95, K.gold, OUT, Math.max(1.4, r * 0.06));
    circle(ctx, 0, 0, r * 0.78, '#8a5a22', OUT, Math.max(1, r * 0.045));
    for (let i = 0; i < 8; i++) {   // spokes, and a red lozenge between each pair
      const a = i * Math.PI / 4 + Math.PI / 8, a2 = i * Math.PI / 4;
      line(ctx, Math.cos(a2) * r * 0.2, Math.sin(a2) * r * 0.2, Math.cos(a2) * r * 0.74, Math.sin(a2) * r * 0.74, K.bronzeH, Math.max(1.2, r * 0.1));
      poly(ctx, [Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, Math.cos(a - 0.2) * r * 0.58, Math.sin(a - 0.2) * r * 0.58, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, Math.cos(a + 0.2) * r * 0.58, Math.sin(a + 0.2) * r * 0.58], '#b8321f');
    }
    circle(ctx, 0, 0, r * 0.46, null, K.goldH, Math.max(1, r * 0.04));
    circle(ctx, 0, 0, r * 0.27, '#d6402a', OUT, Math.max(1, r * 0.05));
    circle(ctx, -r * 0.06, -r * 0.07, r * 0.1, '#ffd9a0');
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; circle(ctx, Math.cos(a) * r * 0.87, Math.sin(a) * r * 0.87, Math.max(0.8, r * 0.035), K.goldH); }
    if (blaze > 0 && !dim) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.5 * blaze * (0.8 + 0.2 * Math.sin(t * 14)); circle(ctx, 0, 0, r * 0.95, null, '#ffffff', Math.max(1.5, r * 0.07)); }
    ctx.restore();
  }
  // a bronze plate with rivets (the titan's armour)
  function plate(ctx, x, y, w, h, rad, rot, col = K.bronze) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    rrect(ctx, -w / 2, -h / 2, w, h, rad, col, OUT, 3);
    rrect(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h * 0.34, rad * 0.6, rgba(K.bronzeH, 0.65));
    rrect(ctx, -w / 2 + 3, h / 2 - h * 0.22, w - 6, h * 0.17, rad * 0.5, rgba(K.bronzeD, 0.55));
    for (const sx of [-1, 1]) circle(ctx, sx * (w / 2 - 6), 0, 1.9, K.goldH, OUT, 0.8);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- Brannoc, the first form
  // a tally of victories branded into the skin: groups of four slashes with one across them (drawn in the figure's own frame)
  function brandMark(ctx, x, y, a, hot, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    for (let i = 0; i < 4; i++) line(ctx, -4.5 * s + i * 3 * s, -4 * s, -4.5 * s + i * 3 * s, 4 * s, rgba(K.brand, 0.7 + 0.25 * hot), 1.3);
    line(ctx, -7 * s, 3.4 * s, 7 * s, -3.4 * s, rgba(K.brandH, 0.8 + 0.2 * hot), 1.3);
    if (hot > 0) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 9 * s, K.brand, 0.4 * hot); }
    ctx.restore();
  }
  function loincloth(ctx, t, sway, wide) {
    const N = 6, pts = [3, -9 * wide, -3, -12 * wide];
    for (let i = 0; i <= N; i++) { const u = i / N, y = (-12 + u * 24) * wide; pts.push(-24 - (i % 2 ? 6 : 0) + Math.sin(t * 2.2 + i * 0.9) * sway, y + Math.sin(t * 1.6 + i) * sway * 0.3); }
    pts.push(-3, 12 * wide, 3, 9 * wide);
    poly(ctx, pts, K.red, OUT, 2.4);
    for (let i = 1; i < N; i += 2) line(ctx, -3, (-12 + i / N * 24) * wide, pts[4 + i * 2] + 3, pts[5 + i * 2], rgba(K.redD, 0.75), 2.2);
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = pts[4 + i * 2], y = pts[5 + i * 2]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = K.gold; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.stroke();
    for (let i = 0; i <= N; i += 2) circle(ctx, pts[4 + i * 2], pts[5 + i * 2], 1.4, K.goldH);
  }
  function sandal(ctx, x, y, rot, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ellipse(ctx, 0, 0, 10, 5.6, 0, '#6f4421', OUT, 2);
    for (const q of [-3, 1.5, 6]) line(ctx, q, -4.6, q, 4.6, K.bronzeH, 1.4);
    circle(ctx, 9, 0, 1.6, '#e8c8a0');
    ctx.restore();
  }
  function torso(ctx, hot, t) {
    ellipse(ctx, -1, 0, 17, 26, 0, K.skin, OUT, 2.8);
    ellipse(ctx, 1, -2, 11, 15, 0, rgba(K.skinH, 0.4));
    for (const sy of [-1, 1]) { ellipse(ctx, -5, sy * 9, 7, 6, 0.3 * sy, rgba(K.skinD, 0.4)); circle(ctx, 0, sy * 21, 8.4, K.skin, OUT, 2); circle(ctx, -1.5, sy * 20, 4.6, rgba(K.skinH, 0.55)); }   // blades and shoulders
    line(ctx, -13, 0, 11, 0, rgba(K.skinD, 0.75), 1.8);
    for (let i = -5; i <= 5; i += 2) circle(ctx, i * 2.1, 0, 1.1, rgba(K.skinD, 0.9));
    brandMark(ctx, -5, -12, 0.5, hot, 0.9); brandMark(ctx, -8, 11, -0.4, hot, 0.85); brandMark(ctx, 4, 12, 0.9, hot, 0.7); brandMark(ctx, 6, -10, -0.2, hot, 0.7);
    // the strap that carries the Sunwheel across his back
    line(ctx, 10, -22, -16, 18, OUT, 6); line(ctx, 10, -22, -16, 18, K.bronze, 3.6);
    for (const q of [0.25, 0.55, 0.8]) circle(ctx, lerp(10, -16, q), lerp(-22, 18, q), 1.3, K.goldH);
  }
  // a bare arm from the shoulder to the hand, an elbow out to one side, the victory brands along it, a bronze bracer by the wrist, a fist
  function arm(ctx, sx, sy, hx, hy, bend, hot, seed, o = {}) {
    const mx = (sx + hx) / 2, my = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ex = mx + nx * bend, ey = my + ny * bend;
    limb(ctx, [sx, sy, ex, ey, hx, hy], K.skin, 11.5);
    line(ctx, sx + nx * -2, sy + ny * -2, ex - nx * 2, ey - ny * 2, rgba(K.skinH, 0.5), 2);
    for (let i = 0; i < 4; i++) { const q = 0.14 + i * 0.13, px = lerp(sx, ex, q * 1.6), py = lerp(sy, ey, q * 1.6); line(ctx, px - ny * 4.5, py + nx * 4.5, px + ny * 4.5, py - nx * 4.5, rgba(K.brand, 0.7 + 0.25 * hot), 1.3); }
    const bx = lerp(ex, hx, 0.45), by = lerp(ey, hy, 0.45), cx = lerp(ex, hx, 0.8), cy = lerp(ey, hy, 0.8);
    line(ctx, bx, by, cx, cy, OUT, 12.5); line(ctx, bx, by, cx, cy, K.bronze, 9.5); line(ctx, bx + nx, by + ny, cx + nx, cy + ny, rgba(K.bronzeH, 0.85), 2);
    if (o.open) { const ux = dx / L, uy = dy / L; for (let i = -2; i <= 2; i++) { const fx = hx + ux * 9 - uy * i * 4.2, fy = hy + uy * 9 + ux * i * 4.2; line(ctx, hx, hy, fx, fy, OUT, 4.4); line(ctx, hx, hy, fx, fy, K.skin, 2.6); } circle(ctx, hx, hy, 5.6, K.skin, OUT, 2); }
    else { circle(ctx, hx, hy, 6.8, K.skin, OUT, 2); circle(ctx, hx - 1.4, hy - 1.6, 3.4, rgba(K.skinH, 0.55)); for (const q of [-3, 0, 3]) line(ctx, hx + 2.4, hy + q, hx + 5.4, hy + q * 1.2, rgba(K.skinD, 0.85), 1); }
  }
  // the head: a gilded half-helm with a red crest streaming back, the face open below the brim, a red-brown beard, a laughing mouth
  function head(ctx, t, laugh, hot, up) {
    ctx.save(); ctx.translate(6, 0); ctx.scale(0.92, 0.92);
    // the crest, streaming back
    const sw = Math.sin(t * 3) * 1.6;
    poly(ctx, [2, -3.5, -10, -3 + sw * 0.3, -22, -2.5 + sw, -26, sw * 1.4, -22, 2.5 + sw, -10, 3 + sw * 0.3, 2, 3.5], K.red, OUT, 1.9);
    line(ctx, 0, 0, -22, sw, K.redH, 1.4);
    ellipse(ctx, -8, 0, 6.5, 9, 0, '#a97a2e', OUT, 2.2);                                               // the neck guard behind the helm
    for (const sy of [-1, 1]) { ellipse(ctx, 0.5, sy * 8.6, 4.6, 3.6, 0.4 * sy, '#c8962c', OUT, 1.6); }    // cheek plates
    circle(ctx, 0, 0, 9.4, '#e0b040', OUT, 2.4);                                                       // the crown
    for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(0, 0, 6.6, sy * 0.4, sy * 2.5, sy < 0); ctx.strokeStyle = rgba(K.goldH, 0.85); ctx.lineWidth = 1.5; ctx.stroke(); }
    line(ctx, -8, 0, 8.4, 0, '#8a5a1a', 1.8);                                                           // the ridge
    // the face below the brim: skin, brow, the laugh, the beard
    ellipse(ctx, 9, 0, 3.8, 6.6, 0, K.skin, OUT, 1.6);
    ellipse(ctx, 12.6, 0, 4.8, 6.4, 0, K.hair, OUT, 1.6);
    line(ctx, 7.6, -5.4, 7.6, 5.4, rgba('#5a3018', 0.8), 1.6);
    const mo = laugh ? 2.8 : 1.7;
    ellipse(ctx, 11.4, 0, 2, mo, 0, '#220a08', OUT, 0.8);
    line(ctx, 10.4, -mo * 0.6, 10.4, mo * 0.6, '#fff4e0', 1);
    for (const sy of [-1, 1]) { circle(ctx, 8.2, sy * 3, 1.05, '#ffffff'); circle(ctx, 8.6, sy * 3, 0.55, '#2a1608'); }
    line(ctx, 8.6, -5.4, 10.5, -3.6, '#5a3018', 1.3); line(ctx, 8.6, 5.4, 10.5, 3.6, '#5a3018', 1.3);
    // the nose guard of the helm
    poly(ctx, [8, -1.1, 14, -0.8, 14.5, 0, 14, 0.8, 8, 1.1], '#e0b040', OUT, 1);
    ctx.restore();
    if (hot > 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 6, 0, 20, K.gold, 0.28); ctx.restore(); }
  }

  // the body. Facing +x like the others; the hands, the Sunwheel and the lifts are laid out on the screen's axes (up is up) so a raised fist
  // reads the same whichever way he faces; his feet and his cloth lie in the floor's plane.
  function brannoc(ctx, st, angle = 0) {
    const pr = st.props || {};
    if (pr.titan) return titan(ctx, st, angle);
    const t = st.t || 0, ca = Math.cos(angle), sa = Math.sin(angle), S = (x, y) => [x * ca - y * sa, x * sa + y * ca];
    const A = atk(st);
    let pose = 'idle';
    if (pr.leap) pose = 'air'; else if (pr.rise) pose = 'rise'; else if (pr.pose) pose = 'pose'; else if (pr.heel) pose = 'heel'; else if (pr.kick) pose = 'kick';
    else if (pr.roar) pose = 'roar'; else if (pr.furrow) pose = 'furrow'; else if (pr.throw) pose = 'throw';
    const breathe = Math.sin(t * 1.7) * 0.8, moving = st.moving ? 1 : 0, step = Math.sin(t * 9) * 3 * moving;
    const up = pose === 'air' || pose === 'pose' || pose === 'rise', hot = up ? 1 : pose === 'roar' ? 0.6 : pose === 'throw' ? 0.35 * (1 - A.strike) : 0;
    const wheelOut = !!pr.wheelOut || (pose === 'throw' && A.strike > 0.35);
    const wheelHand = pose === 'throw' && !wheelOut;

    // the light that follows his glory: the brands and the rim of his shield catch it
    glow(ctx, 0, 0, 70, K.gold, 0.05 + 0.18 * hot);
    if (pose === 'air') { ctx.save(); ctx.rotate(-angle); ellipse(ctx, 5, 24, 30, 19, 0, 'rgba(0,0,0,0.4)'); ellipse(ctx, 5, 24, 20, 12, 0, 'rgba(0,0,0,0.25)'); ctx.restore(); }
    if (pose === 'rise') {   // the star takes him: rays of white-gold turning about him
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) { const a = t * 0.6 + i * TAU / 10, L = 90 + 26 * Math.sin(t * 5 + i * 2); poly(ctx, [Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a - 0.09) * L, Math.sin(a - 0.09) * L, Math.cos(a + 0.09) * L, Math.sin(a + 0.09) * L], rgba('#fff4c0', 0.2)); }
      glow(ctx, 0, 0, 90, '#fff0b0', 0.4); ctx.restore();
    }
    if (pose === 'roar') {   // the sound, pushed out before him
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const q = (t * 1.3 + i / 3) % 1; ctx.beginPath(); ctx.arc(10, 0, 24 + q * 70, -0.9, 0.9); ctx.strokeStyle = rgba(K.goldH, 0.55 * (1 - q)); ctx.lineWidth = 3 - q * 1.5; ctx.stroke(); }
      ctx.restore();
    }
    if (pose === 'furrow') for (let i = 0; i < 9; i++) {   // sand thrown up behind the dragging hand
      const q = (t * 1.5 + i / 9) % 1, [px, py] = S(30 - q * 46, 22 + (hash(i, 2) - 0.5) * 14 * (0.4 + q));
      ctx.save(); ctx.rotate(-angle); circle(ctx, px, py - q * 8, 1.6 + (1 - q) * 2, rgba('#c8ad78', 0.7 * (1 - q))); ctx.restore();
    }

    // ---- what lies in the floor's plane: the loincloth, the feet
    ctx.save(); if (pose === 'furrow') ctx.translate(5, 0);
    loincloth(ctx, t, 1.2 + moving * 2.2 + (pose === 'air' ? 2.5 : 0), pose === 'air' || pose === 'pose' ? 1.15 : 1);
    ctx.restore();
    if (pose !== 'air') {
      const fx = pose === 'furrow' ? 8 : 4;
      if (pose === 'heel' || pose === 'kick') sandal(ctx, fx - 7, -12, 0.1);
      else { sandal(ctx, fx + step, -12, 0.1); sandal(ctx, fx - step, 12, -0.1); }
      if (pose !== 'heel' && pose !== 'kick') {/* both feet down */} else sandal(ctx, fx - 9, 12, -0.2);
    }
    ctx.save(); if (pose === 'furrow') { ctx.translate(6, 2); ctx.scale(0.95, 1.04); } if (pose === 'roar') ctx.translate(-1.5, 0);
    ctx.save(); if (pose === 'air') { ctx.rotate(-angle); ctx.translate(0, -26); ctx.rotate(angle); ctx.scale(1.18, 1.18); }
    if (!wheelOut && !wheelHand) wheel(ctx, -18, 1, 21, { rot: t * 0.04 + 0.4, blaze: 0.35 + hot * 0.5, t });   // slung across his back: its blazing rim shows round him
    torso(ctx, hot, t);

    // ---- hands, wheel and fists, on the screen's axes
    ctx.save(); ctx.rotate(-angle);
    const shL = S(0, -21), shR = S(0, 21);
    const fistRest = (side) => { const p = S(14, side * 31 + side * breathe * 0.4); return [p[0], p[1] + breathe * 0.3]; };
    let hL = fistRest(-1), hR = fistRest(1), bendL = 5, bendR = -5, openL = false, openR = false;
    if (pose === 'throw') {
      const back = S(-12, 35), fwd = S(46, 9), rest = fistRest(1);
      const sw = A.rest > 0 ? [lerp(fwd[0], rest[0], A.rest), lerp(fwd[1], rest[1], A.rest)] : [lerp(back[0], fwd[0], A.strike), lerp(back[1], fwd[1], A.strike)];
      hR = sw; bendR = lerp(-6, -2, A.strike); openR = A.strike > 0.4;
      const bk = S(8, -30); hL = [lerp(hL[0], bk[0], 0.7), lerp(hL[1], bk[1], 0.7)];
    } else if (pose === 'kick') { const b = S(10, 27); hR = b; hL = S(10, -27); }
    else if (pose === 'furrow') { hR = S(34, 21); hL = S(2, -26); bendR = -2; }
    else if (pose === 'heel') { hR = S(9, 30); hL = S(9, -30); bendR = -8; bendL = 8; }
    else if (pose === 'roar') { hR = S(-6, 41); hL = S(-6, -41); bendR = -2; bendL = 2; openR = openL = true; }
    else if (up) { const w = pose === 'air' ? 1.15 : 1; hR = [shR[0] + 8 * w, shR[1] - 34 + 2 * Math.sin(t * 6)]; hL = [shL[0] - 8 * w, shL[1] - 34 + 2 * Math.sin(t * 6 + 1)]; bendR = -9; bendL = 9; }
    arm(ctx, shL[0], shL[1], hL[0], hL[1], bendL, hot, 1, { open: openL }); arm(ctx, shR[0], shR[1], hR[0], hR[1], bendR, hot, 2, { open: openR });
    ctx.restore();

    // the Sunwheel: slung across his back (drawn flat to the floor so it reads from above), or in his hand for the throw, or gone
    if (wheelHand) {
      ctx.save(); ctx.rotate(-angle);
      const back = S(-12, 35), wx = back[0] - 8 * Math.cos(angle), wy = back[1] - 8 * Math.sin(angle);
      wheel(ctx, wx, wy - 4, 22, { rot: t * 1.2, blaze: 0.6 + 0.4 * Math.min(1, (t * 3) % 1), tilt: 0.88, t });
      ctx.restore();
    }

    // ---- the raised foot of Hammer Heel, over everything
    if (pose === 'heel' || pose === 'kick') {
      ctx.save(); ctx.rotate(-angle);
      const hip = S(2, 11), kp = pose === 'heel' ? S(18, 4) : S(32, 4), ft = [kp[0], kp[1] - (pose === 'heel' ? 22 : 8)];
      ellipse(ctx, kp[0] + 3, kp[1] + 14, 18, 10, 0, 'rgba(0,0,0,0.28)');
      limb(ctx, [hip[0], hip[1], (hip[0] + ft[0]) / 2 - 3, (hip[1] + ft[1]) / 2 + 4, ft[0], ft[1]], K.skin, 12);
      line(ctx, lerp(hip[0], ft[0], 0.45), lerp(hip[1], ft[1], 0.45), ft[0], ft[1], OUT, 13); line(ctx, lerp(hip[0], ft[0], 0.45), lerp(hip[1], ft[1], 0.45), ft[0], ft[1], K.bronze, 9.5);   // the greave
      ctx.translate(ft[0], ft[1]); ctx.rotate(0.15); ctx.scale(1.55, 1.55);
      ellipse(ctx, 3, 0, 11, 7, 0, '#6f4421', OUT, 2); for (const q of [-2, 3, 8]) line(ctx, q, -6, q, 6, K.bronzeH, 1.5);
      for (const [px, py] of [[-4, -3], [-4, 3], [2, -3.5], [2, 3.5], [8, -2.5], [8, 2.5]]) circle(ctx, px + 0.5, py, 0.9, K.goldH);
      ctx.restore();
    }
    ctx.restore();   // (the airborne lift)

    // ---- the head over it all
    ctx.save(); if (pose === 'air') { ctx.rotate(-angle); ctx.translate(0, -26); ctx.rotate(angle); ctx.scale(1.18, 1.18); }
    if (pose === 'roar') ctx.translate(3, 0);
    head(ctx, t, pose === 'roar' || up || pose === 'idle' || pose === 'heel', hot, up);
    ctx.restore();
    ctx.restore();
    if (up) {   // sparks of gold off the brands
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const q = (t * 0.9 + i / 7) % 1, a = hash(i, 8) * TAU; circle(ctx, Math.cos(a) * (14 + q * 40), Math.sin(a) * (14 + q * 40) - q * 18, 1.4 + (1 - q) * 1.2, rgba(K.goldH, 0.9 * (1 - q))); }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------------------------------------- the Tidewrought
  // Drawn on the screen's axes with the origin on his waterline's centre line; his body rises north of it and the sea covers all below. He is
  // about three times a normal boss: most of him stands beyond the ring's north rim, and only his hands come over it.
  function arm3(ctx, sx, sy, hx, hy, bend, w) {
    const mx = (sx + hx) / 2, my = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ex = mx + nx * bend, ey = my + ny * bend;
    limb(ctx, [sx, sy, ex, ey, hx, hy], '#6b4a1e', w);
    limb(ctx, [sx, sy - 3, ex, ey - 3, hx, hy - 3], '#8d6228', w * 0.55);
    for (const [px, py, ax, ay] of [[lerp(sx, ex, 0.5), lerp(sy, ey, 0.5), ex - sx, ey - sy], [lerp(ex, hx, 0.35), lerp(ey, hy, 0.35), hx - ex, hy - ey], [lerp(ex, hx, 0.7), lerp(ey, hy, 0.7), hx - ex, hy - ey]]) {
      const l = Math.hypot(ax, ay) || 1, qx = -ay / l, qy = ax / l;
      line(ctx, px - qx * w * 0.58, py - qy * w * 0.58, px + qx * w * 0.58, py + qy * w * 0.58, OUT, 9); line(ctx, px - qx * w * 0.58, py - qy * w * 0.58, px + qx * w * 0.58, py + qy * w * 0.58, K.bronze, 6);
      line(ctx, px - qx * w * 0.5, py - qy * w * 0.5 - 1, px + qx * w * 0.5, py + qy * w * 0.5 - 1, rgba(K.bronzeH, 0.8), 1.6);
      circle(ctx, px - qx * w * 0.42, py - qy * w * 0.42, 2, K.goldH, OUT, 0.8); circle(ctx, px + qx * w * 0.42, py + qy * w * 0.42, 2, K.goldH, OUT, 0.8);
    }
    barnacles(ctx, ex, ey - 2, 7, w * 0.4, sx | 0, 1.4);
  }
  // an open hand: a palm with five fingers fanned about direction dir, curling shut as curl goes 0 -> 1
  function hand3(ctx, x, y, s, dir, curl, side) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ellipse(ctx, 0, 0, 44, 38, 0, '#7a5522', OUT, 4); ellipse(ctx, -4, -6, 30, 22, 0, rgba(K.bronzeH, 0.5));
    for (let i = 0; i < 4; i++) {
      const a = dir + (i - 1.5) * 0.42, len = 78 * (1 - curl * 0.38), k = curl * 1.2, ax = Math.cos(a), ay = Math.sin(a);
      const p0 = [ax * 28, ay * 28], p1 = [ax * (28 + len * 0.55), ay * (28 + len * 0.55)], bend = a + k * side * 0.9, p2 = [p1[0] + Math.cos(bend) * len * 0.5, p1[1] + Math.sin(bend) * len * 0.5];
      limb(ctx, [p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]], '#7a5522', 21);
      for (const [px, py] of [p1, p2]) { line(ctx, px - ay * 11, py + ax * 11, px + ay * 11, py - ax * 11, rgba(K.bronzeH, 0.8), 2); }
      circle(ctx, p1[0], p1[1], 3, K.goldH, OUT, 1); barnacles(ctx, p1[0], p1[1], 3, 7, i + 20);
    }
    const ta = dir - 1.3 * side - curl * 0.5 * side; limb(ctx, [Math.cos(ta) * 14, Math.sin(ta) * 14, Math.cos(ta) * 54, Math.sin(ta) * 54], '#7a5522', 22);
    barnacles(ctx, 0, 6, 9, 24, 33, 1.3);
    ctx.restore();
  }
  // the great fist: the Sunwheel grown huge on the back of a clenched gauntlet. o: { blaze, out (the wheel has been thrown), t }
  function fist3(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    wheel(ctx, 34, -6, 98, { rot: (o.t || 0) * 0.05, blaze: o.out ? 0 : o.blaze || 0.5, dim: !!o.out, t: o.t });
    for (let i = 0; i < 4; i++) {   // the four fingers, curled down in front of the disc
      const fy = -62 + i * 38;
      rrect(ctx, -70, fy, 76, 38, 14, '#8a5c22', OUT, 4);
      rrect(ctx, -66, fy + 3, 68, 11, 6, rgba(K.bronzeH, 0.7));
      rrect(ctx, -66, fy + 28, 64, 7, 4, rgba(K.bronzeD, 0.6));
      for (const px of [-55, -30, -8]) circle(ctx, px, fy + 19, 2.4, K.goldH, OUT, 0.9);
      barnacles(ctx, -60 + (i % 2) * 22, fy + 12, 3, 10, 40 + i, 1.2);
    }
    rrect(ctx, -52, 88, 70, 40, 16, '#7a5222', OUT, 4); rrect(ctx, -48, 91, 60, 10, 6, rgba(K.bronzeH, 0.65));   // the thumb
    ctx.restore();
  }
  // the face: a weathered stone-grey old king under a crowned bronze helm, glowing sea-teal eyes, a beard of foam and weed
  function face3(ctx, t, call) {
    ctx.save();
    // the beard first: it falls over the chest
    const sw = Math.sin(t * 1.3) * 3;
    poly(ctx, [-52, 20, -66, 56 + sw, -52, 108, -30, 150 + sw, -10, 182, 0, 196, 10, 182, 30, 150 - sw, 52, 108, 66, 56 - sw, 52, 20], '#d9e8e4', OUT, 4);
    for (let i = -4; i <= 4; i++) line(ctx, i * 12, 30, i * 9 + sw * (i > 0 ? -0.5 : 0.5), 120 + Math.abs(i) * -6 + 70 - Math.abs(i) * 10, rgba('#8fb0aa', 0.75), 2.2);
    for (const [px, py, r] of [[-30, 60, 6], [24, 90, 5], [-12, 130, 5], [40, 50, 5], [0, 160, 4]]) { circle(ctx, px, py, r, '#d9d3bd', OUT, 1.4); circle(ctx, px, py, r * 0.4, '#2a2218'); }
    kelp(ctx, -34, 70, 70, t, 1); kelp(ctx, 28, 100, 60, t, 4); kelp(ctx, -6, 150, 40, t, 7, '#2f8a56');
    // ears and cheek plates
    for (const sx of [-1, 1]) {
      poly(ctx, [sx * 46, -30, sx * 84, -22, sx * 78, 20, sx * 52, 34], '#8a5c22', OUT, 4);
      poly(ctx, [sx * 74, -20, sx * 108, -50, sx * 100, -4, sx * 78, 12], '#c58a38', OUT, 3);   // a fin sweeping out
      for (let i = 0; i < 3; i++) line(ctx, sx * (60 + i * 6), -14 + i * 9, sx * (92 + i * 3), -22 + i * 8, rgba(K.bronzeD, 0.7), 1.8);
    }
    // the face
    ellipse(ctx, 0, 0, 52, 62, 0, '#8c9a8d', OUT, 4.5);
    ellipse(ctx, -8, -10, 36, 40, 0, rgba('#b4c2b2', 0.4));
    for (const sx of [-1, 1]) { ellipse(ctx, sx * 30, 22, 14, 10, 0, rgba('#6c7c70', 0.55)); line(ctx, sx * 40, -8, sx * 36, 14, rgba('#4a574c', 0.7), 1.8); }
    for (const [px, py] of [[-20, 30], [36, 26], [-38, 6]]) barnacles(ctx, px, py, 3, 6, px | 0, 1.1);
    // the eyes, deep under a heavy brow
    poly(ctx, [-50, -22, -10, -12, -8, -26, -50, -42], '#4a5a4e', OUT, 3); poly(ctx, [50, -22, 10, -12, 8, -26, 50, -42], '#4a5a4e', OUT, 3);
    for (const sx of [-1, 1]) {
      ellipse(ctx, sx * 27, -12, 14, 8, sx * 0.12, '#06222a', OUT, 2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx * 27, -12, 34, '#5ff0e8', 0.7 + 0.2 * Math.sin(t * 3 + sx)); ctx.restore();
      ellipse(ctx, sx * 27, -12, 10, 4.5, sx * 0.12, '#b8fff8'); ellipse(ctx, sx * 27, -12, 5, 3.2, 0, '#ffffff');
    }
    poly(ctx, [-6, -8, 6, -8, 11, 24, 0, 30, -11, 24], '#7a8a7c', OUT, 3);   // the nose
    // the moustache over the mouth
    poly(ctx, [-44, 26, -22, 18, 0, 26, 22, 18, 44, 26, 38, 44, 14, 42, 0, 50, -14, 42, -38, 44], '#e4f0ec', OUT, 3.5);
    if (call) ellipse(ctx, 0, 52, 17, 11, 0, '#04141a', OUT, 3);
    // the helm: a crowned dome of bronze, a heavy brow band with the sun upon it, spires
    poly(ctx, [-60, -38, -66, -92, -44, -150, 0, -176, 44, -150, 66, -92, 60, -38, 40, -50, 0, -58, -40, -50], '#8a5c22', OUT, 5);
    poly(ctx, [-44, -150, 0, -176, 44, -150, 30, -120, 0, -134, -30, -120], rgba(K.bronzeH, 0.7));
    rrect(ctx, -62, -52, 124, 22, 8, '#a97a2e', OUT, 4); rrect(ctx, -58, -50, 116, 7, 4, rgba(K.bronzeH, 0.75));
    for (let i = -5; i <= 5; i++) circle(ctx, i * 11, -41, 2.2, K.goldH, OUT, 0.9);
    wheel(ctx, 0, -100, 22, { blaze: 0.6, t });
    for (let i = -3; i <= 3; i++) {   // the spires of the crown
      const a = -Math.PI / 2 + i * 0.3, bx = Math.cos(a) * 62, by = -92 + Math.sin(a) * 78, L = 40 + (i === 0 ? 24 : 0) - Math.abs(i) * 4;
      poly(ctx, [bx - 8, by + 6, bx + Math.cos(a) * L, by + Math.sin(a) * L, bx + 8, by + 6], '#c58a38', OUT, 3);
    }
    barnacles(ctx, -36, -96, 5, 14, 61, 1.4); barnacles(ctx, 40, -78, 4, 12, 66, 1.3);
    ctx.restore();
  }
  // the shell: a vault of barnacled bronze plate behind his head and shoulders
  function shell3(ctx, t) {
    const R = 7;
    ctx.save();
    for (let i = -R; i <= R; i++) {   // the spines of the back, fanned
      const a = -Math.PI / 2 + i * 0.205, L = 120 + 30 * hash(i, 4), bx = Math.cos(a) * 270, by = -60 + Math.sin(a) * 250;
      poly(ctx, [bx - 15, by + 10, bx + Math.cos(a) * L, by + Math.sin(a) * L, bx + 15, by + 10], '#5c3d16', OUT, 3.5);
    }
    ctx.beginPath(); ctx.moveTo(-345, 6); ctx.bezierCurveTo(-355, -150, -180, -300, 0, -308); ctx.bezierCurveTo(180, -300, 355, -150, 345, 6); ctx.closePath();
    ctx.fillStyle = '#6b4a1e'; ctx.fill(); ctx.lineWidth = 5.5; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.save(); ctx.clip();
    const c0 = [0, 20];
    for (let i = 1; i <= 6; i++) {   // rows of scutes, each a ring of overlapping arcs
      const rr = i * 56, n = 5 + i * 3;
      for (let j = 0; j < n; j++) {
        const a = Math.PI + (j + 0.5) * Math.PI / n, px = c0[0] + Math.cos(a) * rr * 1.18, py = c0[1] + Math.sin(a) * rr * 0.98, w = Math.PI * rr * 1.18 / n * 0.95;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2);
        rrect(ctx, -w / 2, -17, w, 34, 9, (i + j) % 3 ? '#8a5c22' : '#7a5220', OUT, 3);
        rrect(ctx, -w / 2 + 3, -14, w - 6, 9, 5, rgba(K.bronzeH, 0.55));
        circle(ctx, 0, 6, 1.8, K.goldH, OUT, 0.8);
        ctx.restore();
      }
    }
    for (let i = 0; i < 18; i++) { const a = hash(i, 40) * Math.PI + Math.PI, d = 60 + hash(i, 41) * 240; ellipse(ctx, Math.cos(a) * d, -10 + Math.sin(a) * d * 0.85, 22 + hash(i, 42) * 30, 10 + hash(i, 43) * 14, hash(i, 44) * 3, rgba(K.verd, 0.28)); }
    for (let i = 0; i < 11; i++) { const a = hash(i, 50) * Math.PI + Math.PI, d = 90 + hash(i, 51) * 220; barnacles(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.85, 6 + (i % 3) * 3, 22, i + 60, 1.5); }
    ctx.restore();
    ctx.restore();
  }

  const TS = 0.66, WL = -52;   // the Tidewrought's size on screen: wide enough to fill the north, small enough that his face is over the rim and in view
  function titan(ctx, st, angle) {
    const pr = st.props || {}, t = st.t || 0, A = atk(st);
    const pose = pr.slam ? 'slam' : pr.grip ? 'grip' : pr.unbound ? 'unbound' : (pr.call || pr.risen || pr.rise || pr.bell) ? 'call' : 'idle';
    const bob = Math.sin(t * 0.8) * 3, br = Math.sin(t * 1.1) * 2.5, out = !!pr.wheelOut;
    ctx.save(); ctx.rotate(-angle); ctx.translate(0, WL + bob * 0.3); ctx.scale(TS, TS);
    // the sea round him, and the storm's light on his shell
    glow(ctx, 0, -150, 460, '#2fb3b0', 0.1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -130, 300, '#9ff0e8', 0.07 + (pose === 'call' ? 0.08 : 0)); ctx.restore();
    if (pr.bell) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const q = (t * 0.9 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, -90, 150 + q * 300, 90 + q * 190, 0, 0, TAU); ctx.strokeStyle = rgba(K.gold, 0.6 * (1 - q)); ctx.lineWidth = 5 - q * 3; ctx.stroke(); } glow(ctx, 0, -90, 380, K.gold, 0.14); ctx.restore(); }

    // ---- the arms' reach
    const rest = { R: [275, -8], L: [-275, -8], sR: [200, -78], sL: [-200, -78] };
    let hR = rest.R, hL = rest.L, curl = 0, dirL = Math.PI / 2, blaze = 0.5, fs = 1;
    const mix = (a, b, q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
    if (pose === 'slam') {
      const raised = [320, -300], down = [95, 175], base = mix(raised, down, A.strike);
      hR = mix(base, rest.R, A.rest); fs = lerp(1.05, 1.3, A.strike) * (1 - A.rest) + A.rest;
    } else if (pose === 'unbound') {
      const raised = [300, -330], fwd = [210, -120]; blaze = lerp(0.9, 1.4, 1 - A.strike);
      hR = mix(mix(raised, fwd, A.strike), rest.R, A.rest); fs = 1.12;
    } else if (pose === 'grip') {
      const lo = [-250, -40], hi = [-60, 150];
      hL = mix(mix(lo, hi, 0.55 + 0.45 * A.strike), rest.L, A.rest); curl = A.strike * (1 - A.rest);
    } else if (pose === 'call') { hR = [385, -190 + Math.sin(t * 2) * 6]; hL = [-385, -190 + Math.sin(t * 2 + 1) * 6]; dirL = -Math.PI / 2; blaze = 0.9; }

    // ---- his body: the sea hides all of him below the waterline
    ctx.save(); ctx.beginPath(); ctx.rect(-1200, -1200, 2400, 1200 + 8); ctx.clip();
    shell3(ctx, t);
    ellipse(ctx, 0, -42 + br, 205, 72, 0, '#7a5220', OUT, 5);   // the chest plates under his chin
    for (let i = -4; i <= 4; i++) plate(ctx, i * 40, -48 + br + Math.abs(i) * 5, 46, 54, 9, i * 0.07);
    wheel(ctx, 0, -46 + br, 26, { blaze: 0.5, t, rot: t * 0.1 });
    ctx.save(); ctx.translate(0, -128 + br * 0.6 + (pose === 'call' ? 8 : 0)); ctx.scale(1.22, 1.22); face3(ctx, t, pose === 'call'); ctx.restore();
    ctx.restore();
    // ---- the sea over his lower body: a dark waterline with foam running along it
    ellipse(ctx, 0, 6, 410, 20, 0, rgba('#0a4a56', 0.8));
    ellipse(ctx, 0, 3, 390, 12, 0, rgba('#1a7078', 0.45));
    for (let i = 0; i < 16; i++) { const x = (i - 7.5) * 52 + Math.sin(t * 1.2 + i) * 8, y = -2 + Math.sin(t * 1.7 + i * 1.3) * 3; ellipse(ctx, x, y, 28, 5, Math.sin(i) * 0.1, rgba(K.foam, 0.55 + 0.2 * Math.sin(t * 2 + i))); }
    for (let i = 0; i < 22; i++) { const x = (hash(i, 9) - 0.5) * 760, q = (t * 0.5 + hash(i, 10)) % 1; circle(ctx, x, -4 - q * 12, 2 + (1 - q) * 3, rgba(K.foam, 0.6 * (1 - q))); }
    if (pose === 'call' || pr.risen) for (let i = 0; i < 14; i++) { const x = (hash(i, 14) - 0.5) * 520, q = (t * 0.9 + hash(i, 15)) % 1; line(ctx, x, -150 + q * 150, x, -120 + q * 150, rgba('#cfefff', 0.5 * (1 - q)), 2.4); }   // water pouring off him
    // ---- the arms and the wheel-fist, over the water: they are what reaches the ring
    if (pose === 'slam' && A.strike > 0.7 && A.rest < 0.4) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 95, 175, 220, '#d8fbff', 0.35 * (1 - A.rest * 2)); ctx.restore(); }
    arm3(ctx, rest.sL[0], rest.sL[1], hL[0], hL[1], -30, 76);
    hand3(ctx, hL[0], hL[1], 1, dirL, curl, -1);
    arm3(ctx, rest.sR[0], rest.sR[1], hR[0], hR[1], 30, 80);
    fist3(ctx, hR[0], hR[1], fs, { blaze, out, t });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the tide-hand add
  // a giant barnacled bronze hand closed round someone: four fingers curled over them, the thumb across, the wrist coming from the north
  function tidehand(ctx, st) {
    const t = st.t || 0, sq = Math.sin(t * 2.4) * 0.5 + 0.5, sg = sq * 2;
    ctx.save(); ctx.rotate(-(st.f || 0)); ctx.translate(0, 8);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 6, 64, '#ff7a3a', 0.1 + 0.1 * sq); ctx.restore();
    // the forearm, coming down out of the north, ringed with plate
    poly(ctx, [-17, -76, 17, -76, 20, -22, -20, -22], '#6b4a1e', OUT, 3);
    for (const y of [-68, -52, -36]) { line(ctx, -19, y, 19, y, OUT, 9); line(ctx, -19, y, 19, y, K.bronze, 6); line(ctx, -17, y - 1.5, 17, y - 1.5, rgba(K.bronzeH, 0.85), 1.6); circle(ctx, -14, y, 1.8, K.goldH, OUT, 0.7); circle(ctx, 14, y, 1.8, K.goldH, OUT, 0.7); }
    // the back of the hand
    rrect(ctx, -35, -26, 70, 46, 15, '#85591f', OUT, 3.4);
    rrect(ctx, -31, -23, 62, 13, 8, rgba(K.bronzeH, 0.6)); rrect(ctx, -31, 10, 62, 6, 4, rgba(K.bronzeD, 0.5));
    for (const x of [-22, 0, 22]) circle(ctx, x, -2, 2.2, K.goldH, OUT, 0.9);
    // the four fingers curled down over whoever is held, the thumb crossing them
    for (let i = 0; i < 4; i++) {
      const x = -26 + i * 17.3, y = 14 - sg * 0.6, h = 29 + (i === 1 || i === 2 ? 5 : 0);
      rrect(ctx, x - 8.4, y, 16.8, h, 8, i % 2 ? '#8f6122' : '#7d561e', OUT, 3);
      rrect(ctx, x - 5.4, y + 2, 4.4, h - 9, 2.2, rgba(K.bronzeH, 0.6));
      line(ctx, x - 8, y + h * 0.5, x + 8, y + h * 0.5, rgba(K.bronzeD, 0.75), 1.8);
      circle(ctx, x, y + 6, 1.6, K.goldH, OUT, 0.6);
    }
    ctx.save(); ctx.translate(-30 + sg * 0.5, 22); ctx.rotate(0.62);
    rrect(ctx, -9, -8, 18, 38, 9, '#8a5c22', OUT, 3); rrect(ctx, -6, -5, 5, 28, 2.5, rgba(K.bronzeH, 0.6)); line(ctx, -9, 12, 9, 12, rgba(K.bronzeD, 0.75), 1.8);
    ctx.restore();
    barnacles(ctx, -24, -14, 4, 8, 3, 1.1); barnacles(ctx, 22, -18, 4, 8, 9, 1.1); barnacles(ctx, 6, 30, 3, 7, 14, 1);
    kelp(ctx, -34, 4, 22, t, 2); kelp(ctx, 34, 0, 18, t, 5);
    for (let i = 0; i < 4; i++) { const q = (t * 0.8 + i / 4) % 1; line(ctx, -22 + i * 15, 36 + q * 14, -22 + i * 15, 42 + q * 16, rgba('#cfefff', 0.6 * (1 - q)), 1.8); }   // water running off it
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- debris
  // broken colosseum columns and blocks lying on the stone ring: a fluted stump with a jagged top, a fallen block, chips, wet at the foot
  function debris(ctx, pr, t) {
    const { x, y, r } = pr, sd = (pr.id || 1) * 3.7;
    ellipse(ctx, x + 4, y + 10, r * 1.2, r * 0.62, 0, 'rgba(2,10,14,0.5)');
    ellipse(ctx, x, y + 7, r * 1.1, r * 0.55, 0, rgba(K.foam, 0.12 + 0.05 * Math.sin(t * 2 + sd)));
    const stoneCol = ['#7d878d', '#6c767c', '#8a949a'];
    // the fallen block, in front and to the right
    const bx = x + 18, by = y + 12;
    poly(ctx, [bx - 22, by - 6, bx + 20, by - 8, bx + 24, by + 10, bx - 18, by + 12], '#4a545a', OUT, 2.4);
    poly(ctx, [bx - 22, by - 6, bx + 20, by - 8, bx + 18, by - 16, bx - 22, by - 14], '#a9b3b8', OUT, 2);
    poly(ctx, [bx + 20, by - 8, bx + 24, by + 10, bx + 30, by + 2, bx + 26, by - 13], '#363f45', OUT, 1.8);
    line(ctx, bx - 16, by - 2, bx + 14, by - 3, rgba('#1c2428', 0.55), 1.4);
    // the column's stump: a fluted drum with a jagged, broken top
    const cx = x - 8, cy = y + 6, cr = 24, h = 36;
    ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.5, 0, 0, Math.PI); ctx.lineTo(cx - cr, cy - h); ctx.ellipse(cx, cy - h, cr, cr * 0.5, 0, Math.PI, 0, true); ctx.closePath();
    ctx.fillStyle = stoneCol[(sd | 0) % 3]; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.save(); ctx.clip();
    for (let i = -4; i <= 4; i++) line(ctx, cx + i * cr * 0.22, cy - h - 12, cx + i * cr * 0.22, cy + 14, rgba('#1c2428', 0.32), 1.6);
    ctx.fillStyle = 'rgba(210,230,238,0.25)'; ctx.fillRect(cx - cr, cy - h, cr * 0.5, h + 14);
    ctx.fillStyle = 'rgba(8,40,48,0.5)'; ctx.fillRect(cx - cr - 2, cy - 7, cr * 2 + 4, 20);   // the wet foot
    ctx.restore();
    ellipse(ctx, cx, cy - h, cr, cr * 0.5, 0, '#b4bec3', OUT, 2.2);                                    // the broken top
    poly(ctx, [cx + 4, cy - h - 11, cx + 17, cy - h - 6, cx + 9, cy - h + 1, cx - 2, cy - h - 4], '#7a868c', OUT, 1.6);   // a chunk gone from it
    line(ctx, cx - 14, cy - h + 2, cx - 4, cy - h + 7, rgba('#1c2428', 0.55), 1.4); line(ctx, cx + 10, cy - h + 6, cx + 18, cy - h + 3, rgba('#1c2428', 0.5), 1.2);
    ellipse(ctx, cx - 4, cy - h - 2, cr * 0.6, cr * 0.25, 0, rgba('#e8f4f8', 0.4));
    barnacles(ctx, cx - 10, cy - 4, 4, 8, sd | 0, 1.1); barnacles(ctx, bx + 8, by + 5, 3, 6, (sd | 0) + 4, 1);
    circle(ctx, x - 26, y + 18, 4, '#5c666c', OUT, 1.6); circle(ctx, x + 30, y - 2, 3, '#6c767c', OUT, 1.4);
    kelp(ctx, cx + 14, cy + 4, 14, t, sd, '#2f7a4a');
  }

  // ---------------------------------------------------------------------------------------------------------- the drowned colosseum
  // a polygon blob (water, sand islands), the points returned so a second layer can be built on the same shape
  const blob = (x, y, rx, ry, seed, n = 12, jit = 0.28) => {
    const r = rng(seed), pts = [];
    for (let i = 0; i < n; i++) { const q = i * TAU / n, k = 1 - jit + r() * jit * 2; pts.push(x + Math.cos(q) * rx * k, y + Math.sin(q) * ry * k); }
    return pts;
  };
  // the same points, drawn as a smooth closed curve (water and sand have no corners)
  function smooth(c, pts, fill, stroke, lw) {
    const n = pts.length / 2, mx = i => (pts[(i % n) * 2] + pts[((i + 1) % n) * 2]) / 2, my = i => (pts[(i % n) * 2 + 1] + pts[((i + 1) % n) * 2 + 1]) / 2;
    c.beginPath(); c.moveTo(mx(n - 1), my(n - 1));
    for (let i = 0; i < n; i++) c.quadraticCurveTo(pts[i * 2], pts[i * 2 + 1], mx(i), my(i));
    c.closePath(); c.lineJoin = 'round'; if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  // a ghost spectator seen from above, facing the sand: broad shoulders, a pale head, sometimes arms raised
  function spectator(c, x, y, a, s, arms, al) {
    c.save(); c.translate(x, y); c.rotate(a);
    ellipse(c, 0, 0, 3.4 * s, 7.4 * s, 0, rgba(K.ghost, 0.34 * al), rgba('#d8fff0', 0.22 * al), 0.8);
    if (arms) { line(c, 1 * s, -6 * s, 6 * s, -9 * s, rgba('#d8fff0', 0.5 * al), 1.5 * s); line(c, 1 * s, 6 * s, 6 * s, 9 * s, rgba('#d8fff0', 0.5 * al), 1.5 * s); }
    circle(c, 1.4 * s, 0, 3.5 * s, rgba('#e4fff2', 0.8 * al), rgba('#9dffd0', 0.35 * al), 0.8);
    c.restore();
  }
  // a short broken column in the sand
  function stump(c, x, y, rr, h, seed) {
    ellipse(c, x + 4, y + 5, rr * 1.2, rr * 0.55, 0, 'rgba(2,10,14,0.5)');
    c.beginPath(); c.ellipse(x, y, rr, rr * 0.5, 0, 0, Math.PI); c.lineTo(x - rr, y - h); c.ellipse(x, y - h, rr, rr * 0.5, 0, Math.PI, 0, true); c.closePath();
    c.fillStyle = '#6f7a80'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke();
    for (let i = -3; i <= 3; i++) line(c, x + i * rr * 0.28, y - h + 2, x + i * rr * 0.28, y + 2, 'rgba(14,24,28,0.3)', 1.4);
    line(c, x - rr * 0.8, y - h + 3, x - rr * 0.8, y, 'rgba(210,230,238,0.3)', 3);
    const top = []; for (let i = 0; i <= 8; i++) { const a = i * TAU / 9; top.push(x + Math.cos(a) * rr, y - h + Math.sin(a) * rr * 0.5 - hash(i, seed) * 4); }
    poly(c, top, '#a3aeb3', OUT, 2);
  }

  function buildColosseum(c, bx, by) {
    const r = rng(1201), R = ARENA.r;
    // ---- the night beyond: a stormy teal sky in the corners, the far wall of the stands
    const g0 = c.createRadialGradient(0, 0, R * 0.8, 0, 0, Math.hypot(bx, by)); g0.addColorStop(0, '#0b2a33'); g0.addColorStop(0.55, '#07181f'); g0.addColorStop(1, '#030c11');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 26; i++) { const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by; glow(c, x, y, 120 + r() * 220, r() < 0.5 ? '#12404a' : '#0a2630', 0.3 + r() * 0.3); }
    for (let i = 0; i < 70; i++) { const x = (r() * 2 - 1) * bx, y = -by + r() * by * 0.45; circle(c, x, y, 0.5 + r() * 1.0, rgba('#d8f4ff', 0.18 + r() * 0.5)); }
    // ---- the stands: tiers of stone rising away from the sand, the ghosts of a crowd long gone sitting on them
    const T = 6, t0 = R + 24, tw = 32;
    for (let k = T; k >= 0; k--) {
      const r1 = t0 + (k + 1) * tw, r0 = k === 0 ? R : t0 + k * tw;
      c.beginPath(); c.arc(0, 0, r1, 0, TAU); c.arc(0, 0, r0, 0, TAU, true);
      c.fillStyle = k % 2 ? '#2b3b40' : '#33454b'; c.fill();
      c.beginPath(); c.arc(0, 0, r1 - 2, 0, TAU); c.strokeStyle = 'rgba(150,190,196,0.35)'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, r0 + 2, 0, TAU); c.strokeStyle = 'rgba(2,10,14,0.65)'; c.lineWidth = 4; c.stroke();
    }
    // the stairways between the blocks of seats
    const AIS = 16;
    for (let i = 0; i < AIS; i++) {
      const a = i * TAU / AIS + 0.1, a0 = a - 0.028, a1 = a + 0.028, rin = R + 8, rout = t0 + (T + 1) * tw;
      c.beginPath(); c.arc(0, 0, rout, a0, a1); c.arc(0, 0, rin, a1, a0, true); c.closePath(); c.fillStyle = '#18242a'; c.fill();
      for (let k = 0; k < T * 2; k++) { const rr = rin + 12 + k * ((rout - rin - 12) / (T * 2)); c.beginPath(); c.arc(0, 0, rr, a0 + 0.004, a1 - 0.004); c.strokeStyle = 'rgba(160,200,206,0.2)'; c.lineWidth = 1.6; c.stroke(); }
    }
    for (let k = 0; k < T; k++) {   // the spectators
      const rr = t0 + k * tw + tw * 0.55, n = Math.floor(TAU * rr / 17);
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + (k % 2) * 0.01 + (r() - 0.5) * 0.004, nearAisle = Math.abs((((a - 0.1) / (TAU / AIS)) % 1 + 1) % 1 - 0.5) > 0.44;
        if (nearAisle || r() < 0.1) continue;
        spectator(c, Math.cos(a) * rr, Math.sin(a) * rr, a + Math.PI, 0.95 + r() * 0.25, r() < 0.18, 0.6 + r() * 0.5);
      }
      c.save(); c.globalCompositeOperation = 'lighter'; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.strokeStyle = 'rgba(120,255,200,0.07)'; c.lineWidth = 16; c.stroke(); c.restore();
    }
    // the outer arcade: dark arches round the top of the stands, torches on the posts between
    const ro = t0 + (T + 1) * tw;
    c.beginPath(); c.arc(0, 0, ro + 40, 0, TAU); c.arc(0, 0, ro, 0, TAU, true); c.fillStyle = '#0d1a20'; c.fill();
    c.beginPath(); c.arc(0, 0, ro + 1, 0, TAU); c.strokeStyle = 'rgba(160,200,206,0.4)'; c.lineWidth = 3; c.stroke();
    const NA = 40;
    for (let i = 0; i < NA; i++) {
      const a = i * TAU / NA, ax = Math.cos(a), ay = Math.sin(a);
      c.save(); c.translate(ax * (ro + 22), ay * (ro + 22)); c.rotate(a + Math.PI / 2);
      rrect(c, -13, -14, 26, 28, 3, '#050e12', OUT, 1.6); ellipse(c, 0, -10, 13, 8, 0, '#050e12');
      line(c, -17, 0, -17, -12, 'rgba(60,84,90,0.7)', 6);
      c.restore();
    }
    // ---- the Fallen Star, high over the stands (its place in the set: about a third of the way)
    const mx = -bx * 0.5, my = -by + 64;
    SET3_SKY.draw(c, mx, my, 0.33, { dir: -2.6 });

    // ---- the sand
    c.save(); ARENA.trace(c, 0); c.clip();
    const sg = c.createRadialGradient(0, 0, 30, 0, 0, R); sg.addColorStop(0, '#a58c60'); sg.addColorStop(0.6, '#8b7650'); sg.addColorStop(1, '#5f5038');
    c.fillStyle = sg; c.fillRect(-R, -R, R * 2, R * 2);
    for (const rr of [150, 300, 440]) {   // the old paving rings
      c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.strokeStyle = 'rgba(216,197,144,0.2)'; c.lineWidth = 16; c.stroke();
      c.beginPath(); c.arc(0, 0, rr - 9, 0, TAU); c.strokeStyle = 'rgba(40,30,16,0.3)'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, rr + 9, 0, TAU); c.strokeStyle = 'rgba(40,30,16,0.3)'; c.lineWidth = 2; c.stroke();
    }
    {   // the sun of the pit, laid in the sand at the centre
      const rays = []; for (let i = 0; i < 32; i++) { const a = i * TAU / 32, rr = i % 2 ? 84 : 128; rays.push(Math.cos(a) * rr, Math.sin(a) * rr); }
      poly(c, rays, 'rgba(226,172,70,0.22)', 'rgba(40,30,16,0.3)', 2);
      c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.strokeStyle = 'rgba(255,232,150,0.28)'; c.lineWidth = 5; c.stroke();
      circle(c, 0, 0, 36, 'rgba(170,60,40,0.2)');
    }
    for (let i = 0; i < 22; i++) {   // wet sand: the water, in pools
      const a = r() * TAU, d = Math.sqrt(r()) * R * 0.88, x = Math.cos(a) * d, y = Math.sin(a) * d, rx = 80 + r() * 140, ry = rx * (0.5 + r() * 0.4), sd = 700 + i;
      const pts = blob(x, y, rx, ry, sd, 14, 0.32);
      smooth(c, blob(x, y, rx * 1.08, ry * 1.08, sd, 14, 0.32), rgba('#173f3c', 0.5));                        // a dark wet halo
      smooth(c, blob(x, y, rx * 0.97, ry * 0.97, sd, 14, 0.32), 'rgba(30,110,118,0.62)', 'rgba(10,44,52,0.55)', 2.4);
      smooth(c, blob(x - rx * 0.05, y - ry * 0.08, rx * 0.74, ry * 0.7, sd + 1, 12, 0.3), 'rgba(60,170,170,0.4)');
      smooth(c, blob(x - rx * 0.1, y - ry * 0.15, rx * 0.4, ry * 0.36, sd + 2, 10, 0.3), 'rgba(160,240,224,0.17)');
      smooth(c, blob(x, y, rx * 0.97, ry * 0.97, sd, 14, 0.32), null, 'rgba(220,255,248,0.3)', 1.6);
      for (let k = 0; k < 5; k++) { const gx = x + (r() - 0.5) * rx * 1.2, gy = y + (r() - 0.5) * ry * 1.1; line(c, gx - 10, gy, gx + 10 + r() * 12, gy + (r() - 0.5) * 3, 'rgba(235,255,250,0.35)', 1.3); }
      for (let k = 0; k < 3; k++) ellipse(c, x + (r() - 0.5) * rx, y + (r() - 0.5) * ry, 14 + r() * 20, 6 + r() * 8, 0, null, 'rgba(200,250,244,0.26)', 1.2);
    }
    for (let i = 0; i < 1800; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.0, r() < 0.55 ? `rgba(40,28,12,${0.12 + r() * 0.2})` : `rgba(235,214,160,${0.08 + r() * 0.22})`); }
    for (let i = 0; i < 36; i++) {   // the marks of the old bouts: drag lines and prints
      const x = (r() * 2 - 1) * R * 0.8, y = (r() * 2 - 1) * R * 0.8, a = r() * TAU;
      for (let k = 0; k < 5; k++) ellipse(c, x + Math.cos(a) * k * 14 + (k % 2) * 4, y + Math.sin(a) * k * 14 + (k % 2) * 5, 3.4, 1.9, a, 'rgba(50,38,18,0.3)');
    }
    glow(c, -R * 0.3, -R * 0.4, 460, '#9fe8e0', 0.1);                              // the storm's light from the upper left
    const v = c.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(2,12,16,0)'); v.addColorStop(1, 'rgba(2,12,16,0.5)');
    c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    // ---- the wall: a lip of dressed stone with a shadow falling inside it
    c.save(); ARENA.trace(c, 0); c.clip(); ARENA.trace(c, 0); c.strokeStyle = 'rgba(2,10,14,0.5)'; c.lineWidth = 40; c.stroke(); ARENA.trace(c, 0); c.strokeStyle = 'rgba(2,10,14,0.35)'; c.lineWidth = 18; c.stroke(); c.restore();
    c.beginPath(); c.arc(0, 0, R + 12, 0, TAU); c.arc(0, 0, R, 0, TAU, true); c.fillStyle = '#566268'; c.fill();
    for (let i = 0; i < 70; i++) { const a = i * TAU / 70; line(c, Math.cos(a) * R, Math.sin(a) * R, Math.cos(a) * (R + 12), Math.sin(a) * (R + 12), 'rgba(8,20,24,0.55)', 1.6); }
    c.beginPath(); c.arc(0, 0, R + 1, 0, TAU); c.strokeStyle = 'rgba(2,8,12,0.95)'; c.lineWidth = 3.4; c.stroke();
    c.beginPath(); c.arc(0, 0, R + 11, 0, TAU); c.strokeStyle = 'rgba(190,220,226,0.55)'; c.lineWidth = 2; c.stroke();
    // broken columns standing along the foot of the wall, and the drums that fell from them
    for (const [a, h, rr] of [[0.35, 44, 17], [1.2, 30, 15], [2.1, 52, 18], [2.9, 26, 14], [3.7, 40, 17], [4.45, 34, 15], [5.3, 48, 18], [5.9, 28, 14]]) stump(c, Math.cos(a) * (R - 26), Math.sin(a) * (R - 26) + h * 0.3, rr, h, a * 10);
    // the banners: red sun-cloth hung from the rail above the wall, each with the sun worked in gold
    const banners = [];
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) * TAU / 8 + 0.06; banners.push(a);
      const ax = Math.cos(a), ay = Math.sin(a);
      c.save(); c.translate(ax * (R + 22), ay * (R + 22)); c.rotate(a - Math.PI / 2);   // local y runs inward from the wall, x along it
      ellipse(c, 3, -30, 20, 44, 0, 'rgba(2,10,14,0.35)');
      line(c, -24, -10, 24, -10, OUT, 6); line(c, -24, -10, 24, -10, '#c8962c', 3.2);
      poly(c, [-20, -8, 20, -8, 20, -78, 0, -66, -20, -78], K.red, OUT, 2.4);
      poly(c, [-20, -8, -10, -8, -10, -72, -20, -78], rgba(K.redD, 0.5));
      for (const gx of [-1, 1]) line(c, gx * 20, -10, gx * 20, -76, K.gold, 1.5);
      for (const q of [-2, -1, 0, 1, 2]) line(c, q * 7, -68 + Math.abs(q) * 2, q * 7, -74 + Math.abs(q), K.gold, 1.4);
      const sun = []; for (let k = 0; k < 16; k++) { const aa = k * TAU / 16, rr = k % 2 ? 7 : 12; sun.push(Math.cos(aa) * rr, -38 + Math.sin(aa) * rr); }
      poly(c, sun, K.gold, '#7a4a10', 1.2); circle(c, 0, -38, 5, '#b8321f', '#7a4a10', 1);
      for (const gx of [-1, 1]) { line(c, gx * 14, -8, gx * 14, 2, K.gold, 1.3); circle(c, gx * 14, 3, 1.8, K.goldH); }
      c.restore();
    }
    // the torches: iron bowls on the rail, between the banners
    const torches = [];
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) * TAU / 12 + 0.3, x = Math.cos(a) * (R + 16), y = Math.sin(a) * (R + 16); torches.push({ x, y, ph: i * 1.7 });
      line(c, x, y + 2, x, y - 16, OUT, 5); line(c, x, y + 2, x, y - 16, '#3a4a50', 3);
      poly(c, [x - 7, y - 16, x + 7, y - 16, x + 4, y - 9, x - 4, y - 9], '#2a3438', OUT, 1.6);
      ellipse(c, x, y - 20, 4, 7, 0, '#ffa84a'); ellipse(c, x, y - 21, 2, 4.5, 0, '#fff0b0');
      glow(c, x, y - 20, 40, '#ff9a3a', 0.25);
    }
    // ---- the room's life
    const crowd = [];
    for (let i = 0; i < 150; i++) { const k = Math.floor(r() * T), rr = t0 + k * tw + tw * 0.55, a = r() * TAU; crowd.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, a: a + Math.PI, ph: r() * 9, sp: 1.2 + r() * 1.6 }); }
    ArenaView.amb = {
      kind: 'colosseum', star: [mx, my], torches, crowd,
      ripples: Array.from({ length: 26 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.85; return { x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * 9, sp: 0.25 + r() * 0.3, rr: 16 + r() * 24 }; }),
      glints: Array.from({ length: 34 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.88; return { x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * 9, sp: 0.4 + r() * 0.6, w: 8 + r() * 16 }; }),
      mist: Array.from({ length: 10 }, () => ({ ph: r() * 9, sp: 0.02 + r() * 0.03, r: R - 20 + r() * 20, w: 90 + r() * 100 })),
    };
  }

  function colosseumLife(ctx, a, t) {
    const R = ARENA.r;
    ctx.save(); ctx.beginPath(); ARENA.trace(ctx, 0); ctx.clip();
    for (const g of a.glints) {   // light sliding over the water
      const q = 0.5 + 0.5 * Math.sin(t * g.sp * 2 + g.ph); if (q < 0.45) continue;
      line(ctx, g.x - g.w * 0.5 + Math.sin(t * 0.4 + g.ph) * 6, g.y, g.x + g.w * 0.5 + Math.sin(t * 0.4 + g.ph) * 6, g.y + Math.sin(g.ph) * 2, rgba('#eafffa', 0.5 * (q - 0.45) * 1.8), 1.5);
    }
    for (const rp of a.ripples) {   // rings spreading on the pools
      const q = (t * rp.sp + rp.ph) % 1;
      ctx.beginPath(); ctx.ellipse(rp.x, rp.y, 4 + q * rp.rr, (4 + q * rp.rr) * 0.8, 0, 0, TAU); ctx.strokeStyle = rgba('#d8fff8', 0.4 * (1 - q)); ctx.lineWidth = 1.4; ctx.stroke();
    }
    for (const m of a.mist) { const an = t * m.sp + m.ph; glow(ctx, Math.cos(an) * m.r, Math.sin(an) * m.r, m.w, '#9fd8d4', 0.05); }   // a low mist walking the wall
    ctx.restore();
    // the crowd swaying: arms that rise and fall, a ghost light over the stands
    for (const c of a.crowd) {
      const s = Math.sin(t * c.sp + c.ph), ca = Math.cos(c.a), sa = Math.sin(c.a), up = 4 + 5 * (0.5 + 0.5 * s);
      for (const sd of [-1, 1]) { const px = c.x + (-sa * sd) * 6, py = c.y + (ca * sd) * 6; line(ctx, px, py, px + ca * up - sa * sd * 1.5, py + sa * up + ca * sd * 1.5, rgba('#d8fff0', 0.5), 1.6); }
    }
    for (let i = 0; i < 6; i++) { const an = t * 0.05 + i * TAU / 6; glow(ctx, Math.cos(an) * (R + 120), Math.sin(an) * (R + 120), 190, '#7fffc8', 0.05 + 0.025 * Math.sin(t * 0.8 + i * 2)); }
    for (const tc of a.torches) {
      const fl = 0.8 + 0.12 * Math.sin(t * 9 + tc.ph) + 0.08 * Math.sin(t * 23 + tc.ph * 2);
      glow(ctx, tc.x, tc.y - 20, 70, '#ff9a3a', 0.2 * fl); glow(ctx, tc.x, tc.y - 20, 26, '#ffd070', 0.3 * fl);
      ellipse(ctx, tc.x + Math.sin(t * 7 + tc.ph) * 1.5, tc.y - 21, 3.4, 6 * fl, 0, '#ffb04a'); ellipse(ctx, tc.x, tc.y - 21, 1.8, 3.6 * fl, 0, '#fff4c0');
    }
    SET3_SKY.life(ctx, a.star[0], a.star[1], 0.33, t);
  }

  // ---------------------------------------------------------------------------------------------------------- the broken ring in the sea
  function buildSeaRing(c, bx, by) {
    const r = rng(1301), R = ARENA.r;
    // ---- the open sea, a storm over it
    const g0 = c.createRadialGradient(0, 0, R * 0.9, 0, 0, Math.hypot(bx, by)); g0.addColorStop(0, '#0f4954'); g0.addColorStop(0.45, '#0a3340'); g0.addColorStop(1, '#041820');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 60; i++) { const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by; glow(c, x, y, 70 + r() * 150, r() < 0.5 ? '#1c6a74' : '#062a34', 0.25 + r() * 0.3); }
    for (let i = 0; i < 18; i++) { const x = (r() * 2 - 1) * bx, y = -by + r() * by * 0.5; glow(c, x, y, 130 + r() * 220, '#030e14', 0.45); }   // the thunderheads piling up in the north
    for (let i = 0; i < 9; i++) { const x = (r() * 2 - 1) * bx, y = -by + r() * by * 0.35; glow(c, x, y, 90 + r() * 120, '#2a7a88', 0.12); }
    // the whitecaps and the lines of the swell
    for (let i = 0; i < 330; i++) {
      const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by, d = Math.hypot(x, y), len = 22 + r() * 60, a = (r() - 0.5) * 0.3;
      if (d < R + 6) continue;
      const near = clamp(1 - (d - R) / 260, 0.15, 1);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y + 7 * (r() - 0.5) + a * 20, x + len, y + a * 30); c.strokeStyle = r() < 0.5 ? `rgba(200,244,244,${0.14 + 0.3 * near * r()})` : `rgba(2,16,22,${0.2 + 0.25 * r()})`; c.lineWidth = 1.2 + r() * 2.4; c.stroke();
    }
    // swell wrapping the ring: broken arcs of crest and trough, foam torn off the tops
    for (let i = 0; i < 260; i++) {
      const d = R + 14 + Math.pow(r(), 0.8) * 360, a = r() * TAU, span = (30 + r() * 120) / d, near = clamp(1 - (d - R) / 320, 0.2, 1);
      c.beginPath(); c.arc(0, 0, d, a, a + span); c.strokeStyle = r() < 0.4 ? `rgba(2,14,20,${0.25 + 0.3 * r()})` : `rgba(214,248,250,${(0.14 + 0.4 * r()) * near})`; c.lineWidth = 1.5 + r() * 4.5; c.lineCap = 'round'; c.stroke();
    }
    for (let i = 0; i < 70; i++) {
      const d = R + 20 + Math.pow(r(), 1.3) * 330, a = r() * TAU, near = clamp(1 - (d - R) / 340, 0.25, 1);
      smooth(c, blob(Math.cos(a) * d, Math.sin(a) * d, 14 + r() * 30, 5 + r() * 9, 1500 + i, 8, 0.4), `rgba(236,252,255,${0.12 + 0.3 * near * r()})`);
    }
    // ---- the pieces of the old arena in the water: blocks and broken columns with foam round them
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, d = R + 36 + r() * 260, x = Math.cos(a) * d, y = Math.sin(a) * d, s = 14 + r() * 26;
      if (Math.abs(x) > bx - 40 || Math.abs(y) > by - 40) continue;
      ellipse(c, x, y + 4, s * 2, s * 1.1, 0, 'rgba(230,252,255,0.28)'); ellipse(c, x, y + 4, s * 1.5, s * 0.8, 0, 'rgba(4,24,30,0.5)');
      if (i % 3 === 0) stump(c, x, y, s * 0.7, s * (0.6 + r()), i); else { const rot = r() * 1.4 - 0.7; c.save(); c.translate(x, y); c.rotate(rot); poly(c, [-s, -s * 0.5, s, -s * 0.55, s * 1.1, s * 0.5, -s * 0.9, s * 0.55], '#56646a', OUT, 2); poly(c, [-s, -s * 0.5, s, -s * 0.55, s * 0.9, -s * 0.2, -s * 0.9, -s * 0.15], 'rgba(214,236,242,0.5)'); c.restore(); }
    }
    // ---- the foam where the sea breaks on the ring
    for (const [w, al] of [[34, 0.14], [20, 0.22], [10, 0.4], [4, 0.6]]) { c.beginPath(); c.arc(0, 0, R + w * 0.4, 0, TAU); c.strokeStyle = `rgba(232,252,255,${al})`; c.lineWidth = w; c.stroke(); }
    // ---- the ring itself: flags of dark wet stone in rings, the sun of the pit worn into the middle
    const edge = a => R - 1 + 4 * Math.sin(a * 9 + 1) + 3 * Math.sin(a * 23);
    c.save(); c.beginPath(); for (let i = 0; i <= 120; i++) { const a = i * TAU / 120; i ? c.lineTo(Math.cos(a) * edge(a), Math.sin(a) * edge(a)) : c.moveTo(Math.cos(a) * edge(a), Math.sin(a) * edge(a)); } c.closePath(); c.clip();
    c.fillStyle = '#34464c'; c.fillRect(-R - 10, -R - 10, R * 2 + 20, R * 2 + 20);
    const radii = [0, 80, 165, 250, 335, 410];
    for (let k = 0; k < radii.length - 1; k++) {
      const r0 = radii[k], r1 = radii[k + 1], n = k === 0 ? 1 : Math.round(TAU * (r0 + r1) / 2 / (78 + k * 6)), off = r() * TAU;
      for (let j = 0; j < n; j++) {
        const a0 = off + j * TAU / n, a1 = a0 + TAU / n, v = r(), ja = k === 0 ? 0 : 0.012 * (r() - 0.5);
        c.beginPath(); if (k === 0) c.arc(0, 0, r1, 0, TAU); else { c.arc(0, 0, r1 + 1, a0 + ja, a1 + ja); c.arc(0, 0, r0 - 1, a1 + ja, a0 + ja, true); } c.closePath();
        c.fillStyle = `rgb(${54 + v * 26 | 0},${72 + v * 26 | 0},${80 + v * 24 | 0})`; c.fill(); c.strokeStyle = 'rgba(4,16,20,0.75)'; c.lineWidth = 2.4; c.stroke();
        if (k > 0) { c.beginPath(); c.arc(0, 0, r1 - 3, a0 + 0.01, a1 - 0.01); c.strokeStyle = 'rgba(160,200,208,0.14)'; c.lineWidth = 1.6; c.stroke(); }
        if (r() < 0.25) { const aa = (a0 + a1) / 2, rr = (r0 + r1) / 2; c.save(); c.translate(Math.cos(aa) * rr, Math.sin(aa) * rr); c.rotate(r() * TAU); jagged(c, -10, 0, 12 + r() * 14, (r() - 0.5) * 12, k * 100 + j, 'rgba(4,14,18,0.6)', 1.4); c.restore(); }
      }
    }
    {   // the sun of the pit, nearly worn away
      const rays = []; for (let i = 0; i < 32; i++) { const a = i * TAU / 32, rr = i % 2 ? 62 : 108; rays.push(Math.cos(a) * rr, Math.sin(a) * rr); }
      poly(c, rays, 'rgba(210,170,90,0.2)', 'rgba(4,16,20,0.35)', 2); c.beginPath(); c.arc(0, 0, 56, 0, TAU); c.strokeStyle = 'rgba(240,210,130,0.26)'; c.lineWidth = 4; c.stroke();
    }
    for (let i = 0; i < 40; i++) {   // standing water, weed, grit
      const a = r() * TAU, d = Math.sqrt(r()) * R * 0.92, x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (i < 16) { smooth(c, blob(x, y, 20 + r() * 40, 8 + r() * 16, 900 + i, 10, 0.3), 'rgba(40,130,140,0.35)', 'rgba(210,250,250,0.2)', 1.2); line(c, x - 10, y - 1, x + 12, y, 'rgba(235,255,255,0.35)', 1.2); }
      else ellipse(c, x, y, 10 + r() * 24, 5 + r() * 9, r() * TAU, rgba(K.verd, 0.18 + r() * 0.12));
    }
    for (let i = 0; i < 1100; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 0.9, r() < 0.6 ? `rgba(2,12,16,${0.12 + r() * 0.2})` : `rgba(200,230,236,${0.06 + r() * 0.16})`); }
    glow(c, -R * 0.3, -R * 0.4, 420, '#9fe8e0', 0.1);
    c.restore();
    // the rim: a ring of big wedge blocks round the edge, some gone, the broken ends dark with water
    const NB = 44;
    for (let i = 0; i < NB; i++) {
      const a0 = i * TAU / NB + 0.004, a1 = (i + 1) * TAU / NB - 0.004, gone = r() < 0.1, ro = edge((a0 + a1) / 2) + 3, ri = R - 52 - r() * 8, lift = 5;
      if (gone) {   // a block fallen out of the ring: a notch of dark water
        c.beginPath(); c.arc(0, 0, ro, a0, a1); c.arc(0, 0, ri + 26, a1, a0, true); c.closePath(); c.fillStyle = 'rgba(6,34,42,0.85)'; c.fill();
        c.beginPath(); c.arc(0, 0, ri + 26, a0, a1); c.strokeStyle = 'rgba(220,250,255,0.5)'; c.lineWidth = 2.4; c.stroke();
        continue;
      }
      c.beginPath(); c.arc(0, 0, ro + lift, a0, a1); c.arc(0, 0, ro, a1, a0, true); c.closePath(); c.fillStyle = '#1c2a2f'; c.fill();       // the outer face
      c.beginPath(); c.arc(0, 0, ro, a0, a1); c.arc(0, 0, ri, a1, a0, true); c.closePath();
      const v = r(); c.fillStyle = `rgb(${96 + v * 28 | 0},${108 + v * 28 | 0},${112 + v * 26 | 0})`; c.fill(); c.strokeStyle = 'rgba(4,14,18,0.9)'; c.lineWidth = 2.6; c.stroke();
      c.beginPath(); c.arc(0, 0, ro - 3, a0 + 0.006, a1 - 0.006); c.strokeStyle = 'rgba(214,238,244,0.35)'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, ri + 4, a0 + 0.006, a1 - 0.006); c.strokeStyle = 'rgba(2,10,14,0.4)'; c.lineWidth = 3; c.stroke();
      if (r() < 0.45) barnacles(c, Math.cos((a0 + a1) / 2) * (ro - 12), Math.sin((a0 + a1) / 2) * (ro - 12), 3, 8, i, 1);
      if (r() < 0.18) { c.save(); c.translate(Math.cos((a0 + a1) / 2) * (ro - 20), Math.sin((a0 + a1) / 2) * (ro - 20)); c.rotate(r() * TAU); jagged(c, -8, 0, 14, (r() - 0.5) * 10, i + 800, 'rgba(2,10,14,0.65)', 1.5); c.restore(); }
    }
    // ---- the Fallen Star, big over the sea (it has grown: about a third of the way)
    const mx = -bx * 0.5, my = -by + 64;
    SET3_SKY.draw(c, mx, my, 0.33, { dir: -2.6 });
    ArenaView.amb = {
      kind: 'sea', star: [mx, my],
      rings: [0, 1, 2].map(i => ({ ph: i / 3 })),
      spray: Array.from({ length: 56 }, () => { const a = r() * TAU; return { a, ph: r(), sp: 0.4 + r() * 0.5, h: 18 + r() * 34, s: 1.4 + r() * 2.2 }; }),
      swell: Array.from({ length: 34 }, () => { const a = r() * TAU, d = R + 20 + r() * 340; return { x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * 9, w: 30 + r() * 60 }; }),
      rain: Array.from({ length: 70 }, () => ({ x: r(), y: r(), sp: 0.7 + r() * 0.6, l: 14 + r() * 18 })),
    };
  }

  function seaLife(ctx, a, t) {
    const R = ARENA.r, bx = ArenaView.floorBox ? ArenaView.floorBox.bx : 800, by = ArenaView.floorBox ? ArenaView.floorBox.by : 800;
    for (const s of a.swell) { const q = 0.5 + 0.5 * Math.sin(t * 0.7 + s.ph); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w, s.w * 0.22, Math.atan2(s.y, s.x) + Math.PI / 2, 0, TAU); ctx.strokeStyle = rgba('#d8fcff', 0.1 + 0.18 * q); ctx.lineWidth = 2; ctx.stroke(); }
    for (const rg of a.rings) {   // the sea breaking outward off the ring in slow broken lines of foam
      const q = (t * 0.22 + rg.ph) % 1;
      ctx.save(); ctx.setLineDash([26, 22, 8, 30]); ctx.lineDashOffset = -t * 14 * (1 + rg.ph); ctx.beginPath(); ctx.arc(0, 0, R + 6 + q * 130, 0, TAU); ctx.strokeStyle = rgba('#eafcff', 0.5 * (1 - q) * Math.min(1, q * 6)); ctx.lineWidth = 6 * (1 - q) + 1.5; ctx.stroke(); ctx.restore();
    }
    // spray thrown up where the waves hit the rim
    for (const s of a.spray) {
      const q = (t * s.sp + s.ph) % 1, rr = R + 2 + q * 18, ca = Math.cos(s.a), sa = Math.sin(s.a), lift = Math.sin(q * Math.PI) * s.h;
      circle(ctx, ca * rr, sa * rr - lift, s.s * (1 - q * 0.4), rgba('#f2fdff', 0.7 * (1 - q)));
      if (q < 0.5) circle(ctx, ca * (rr - 3), sa * (rr - 3) - lift * 0.55, s.s * 0.6, rgba('#f2fdff', 0.4 * (1 - q)));
    }
    ctx.save(); ctx.lineCap = 'round';   // the rain
    for (const d of a.rain) {
      const q = (t * 0.55 * d.sp + d.y) % 1, x = -bx + ((d.x + q * 0.12) % 1) * bx * 2, y = -by + q * by * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + d.l); ctx.strokeStyle = 'rgba(200,236,244,0.22)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
    const lt = (t % 11.3); if (lt < 0.14) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,220,230,${0.11 * (1 - lt / 0.14)})`; ctx.fillRect(-bx, -by, bx * 2, by * 2); ctx.restore(); }   // lightning
    SET3_SKY.life(ctx, a.star[0], a.star[1], 0.33, t);
  }

  return { brannoc, tidehand, wheel, debris, buildColosseum, colosseumLife, buildSeaRing, seaLife, barnacles, kelp, K };
})();

BOSS_ART.brannoc = BR_ART.brannoc;
ADD_ART.tidehand = BR_ART.tidehand;
ArenaView.buildColosseum = BR_ART.buildColosseum;
ArenaView.colosseumLife = BR_ART.colosseumLife;
ArenaView.buildSeaRing = BR_ART.buildSeaRing;
ArenaView.seaLife = BR_ART.seaLife;
ArenaView.debrisProp = (ctx, pr, t) => BR_ART.debris(ctx, pr, t);
