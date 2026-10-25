// Caelum Vey, the Starborn (set 3, Boss XII, the finale): everything he looks like and the two rooms he stands in, drawn in code.
// His body (a tall, still figure in armour of black glass veined with white light, a smooth silver mask, a halo of broken star-shards
// turning slowly behind his back, a blade that is a narrow sliver of starlight), a pose for each of his casts and the second form (the
// halo opened into a wheel of floating blades, he hovering above the cloud); the half-buried star and its shards (props `starcore`,
// `starshard`) and the rubble a broken shard leaves; the crater floor under the huge burning meteor and the circle of cloud over the
// falling one, and both rooms' ambient life. Loaded after arena-view.js and set3-sky.js; it adds to BOSS_ART / ArenaView itself.
// Look: the user's painted sheets (docs/art/vfx-reference/caelum-1.png, -2.png): black glass and white-silver light, star-dust, the
// orange-red burning meteor, deep night violet; in the cloud, pale gold-etched stone lit orange from below.
// (The meteor's shadow on the floor, the afterimages, the serpent and the dances' impacts are caelum-fx.js's, not drawn here.)
//
// st.props (main.js, boss-vfx.js CAST_POSE):
//   sky                                       the second form (raid.form === 'sky')
//   clBlade                                   the shadow's radius (150 first act .. 390 last): the blade is longer each act
//   held while the move runs:                 clGlint, clWake, clCrown, clThrust, clGrace, clNight, clSummon (The Starwyrm, Starfall, Embers
//                                             of Heaven, Constellation Fall), clEmber (Dark Ember), clAscend, clAscendant (the banim after it),
//                                             clHorizon (Horizon Cut, Second Coil), clRage (the enrage)

const CL_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const K = {
    glass: '#0b0d19', glassM: '#141a30', glassH: '#2a3558', glassE: '#7482b4', glassP: '#1c1e3a',
    vein: '#ffffff', veinG: '#b4c6ff', silver: '#dde2ee', silverM: '#a5adc4', silverD: '#5d6683',
    star: '#fff6dc', ember: '#ff9a4a', emberH: '#ffd890', violet: '#8c70ff', violetH: '#cdbfff',
    // star-glass (the half-buried star)
    sgL: '#f4f2ff', sgM: '#b9b4f2', sgD: '#5a4fb0', sgDD: '#241d62', sgHot: '#fff0c4',
  };
  const POSES = ['glint', 'wake', 'crown', 'thrust', 'grace', 'night', 'summon', 'ember', 'ascend', 'ascendant', 'horizon', 'rage'];
  const smv = (st, key, target, rate) => { const v = st[key]; if (!v) return (st[key] = target.slice()); const r = typeof rate === 'number' ? rate : 0.1; for (let i = 0; i < v.length; i++) v[i] += (target[i] - v[i]) * r; return v; };
  const sm = (st, key, target, rate = 0.1) => { const v = st[key]; return (st[key] = v == null ? target : v + (target - v) * rate); };
  // where a cast is in its swing: strike 0 (gathering) .. 1 (the blow has landed), then rest 0 .. 1 (back to standing)
  function atk(st) {
    const a = st.action;
    if (!a || a.type !== 'attack') return { strike: 0, rest: 0, p: -1 };
    const p = (actT(st) - a.t0) / a.dur;
    if (p < 0.3) return { strike: 0, rest: 0, p };
    if (p < 0.55) return { strike: easeOut((p - 0.3) / 0.25), rest: 0, p };
    return { strike: 1, rest: p >= 1 ? 1 : easeOut((p - 0.55) / 0.45), p };
  }

  // ---------------------------------------------------------------------------------------------------------- small parts
  // a crack of white light in the glass: from (x, y) heading a, a dark groove with the light in it and one small branch
  function crack(ctx, x, y, a, len, seed, al = 1, w = 1) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = [x, y]; let px = x, py = y, an = a;
    for (let i = 0; i < 4; i++) { an += (hash(i, seed) - 0.5) * 1.4; px += Math.cos(an) * len / 4; py += Math.sin(an) * len / 4; pts.push(px, py); }
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); };
    const bx = pts[4], by = pts[5], ba = a + (hash(seed, 9) < 0.5 ? 1 : -1) * 0.8;
    path(); ctx.strokeStyle = rgba('#010208', 0.55 * al); ctx.lineWidth = 2.8 * w; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    path(); ctx.strokeStyle = rgba(K.veinG, 0.4 * al); ctx.lineWidth = 2.2 * w; ctx.stroke();
    path(); ctx.strokeStyle = rgba('#ffffff', 0.92 * al); ctx.lineWidth = 0.85 * w; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ba) * len * 0.35, by + Math.sin(ba) * len * 0.35); ctx.strokeStyle = rgba('#ffffff', 0.75 * al); ctx.lineWidth = 0.65 * w; ctx.stroke();
    ctx.restore();
  }
  // a kite of glass or light: a tail, two shoulders a quarter of the way along, a point. u is the way it points.
  function kite(ctx, cx, cy, ang, len, wid, fill, edge, lw = 1.2) {
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    poly(ctx, [cx - ux * len * 0.18, cy - uy * len * 0.18, cx + ux * len * 0.28 + nx * wid, cy + uy * len * 0.28 + ny * wid, cx + ux * len, cy + uy * len, cx + ux * len * 0.28 - nx * wid, cy + uy * len * 0.28 - ny * wid], fill, edge, lw);
    return [ux, uy];
  }
  // a glass plate: a base, a lit edge down one side
  function plate(ctx, pts, fill, edge, lit = 0.6, lw = 2) {
    poly(ctx, pts, fill, OUT, lw);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.lineTo(pts[2], pts[3]); ctx.strokeStyle = rgba(edge || K.glassE, 0.35 + 0.45 * lit); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  // a sleeve from the shoulder to the hand, the elbow bent out and down
  function arm(ctx, sx, sy, hx, hy, bend, lit) {
    const mx = (sx + hx) / 2, my = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1;
    const ex = mx - dy / L * bend, ey = my + dx / L * bend;
    limb(ctx, [sx, sy, ex, ey, hx, hy], K.glassM, 8);
    line(ctx, sx, sy, ex, ey, rgba(K.glassE, 0.45), 1.3); line(ctx, ex, ey, hx, hy, rgba(K.glassE, 0.3), 1.1);
    circle(ctx, ex, ey, 3.8, K.glassP, OUT, 1.5); circle(ctx, ex - 0.6, ey - 0.6, 1.2, rgba(K.vein, 0.5 * lit));   // the elbow's plate
    return [ex, ey];
  }
  // a gauntleted hand; open: the palm spread flat (fingers fanned toward a)
  function hand(ctx, x, y, open, a, lit) {
    if (open > 0.3) {
      for (let i = -2; i <= 2; i++) { const fa = a + i * 0.3; line(ctx, x, y, x + Math.cos(fa) * 8.5, y + Math.sin(fa) * 8.5, OUT, 3.6); line(ctx, x, y, x + Math.cos(fa) * 8.5, y + Math.sin(fa) * 8.5, K.glassM, 2.2); circle(ctx, x + Math.cos(fa) * 8.5, y + Math.sin(fa) * 8.5, 0.9, rgba(K.vein, 0.7 * lit)); }
      circle(ctx, x, y, 4.4, K.glassP, OUT, 1.6);
    } else circle(ctx, x, y, 4.2, K.glassP, OUT, 1.7);
    circle(ctx, x, y, 4.4, null, rgba(K.silverM, 0.55), 1);
  }

  // ---------------------------------------------------------------------------------------------------------- the blade
  // a narrow sliver of starlight from its guard (gx, gy) along ang, len long; a plain grip and a thin silver crossguard
  function blade(ctx, gx, gy, ang, len, o) {
    const t = o.t || 0, lit = o.lit == null ? 1 : o.lit, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, fl = 0.85 + 0.15 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 13);
    const tx = gx + ux * len, ty = gy + uy * len;
    // the grip, the pommel, the crossguard
    const hx = gx - ux * 17, hy = gy - uy * 17;
    line(ctx, hx, hy, gx, gy, OUT, 6.4); line(ctx, hx, hy, gx, gy, '#10142a', 4); for (let i = 1; i < 4; i++) line(ctx, lerp(hx, gx, i / 4) - nx * 2, lerp(hy, gy, i / 4) - ny * 2, lerp(hx, gx, i / 4) + nx * 2, lerp(hy, gy, i / 4) + ny * 2, rgba(K.silverM, 0.6), 0.9);
    circle(ctx, hx - ux * 1.5, hy - uy * 1.5, 3, K.silverM, OUT, 1.4);
    line(ctx, gx - nx * 8, gy - ny * 8, gx + nx * 8, gy + ny * 8, OUT, 4.4); line(ctx, gx - nx * 8, gy - ny * 8, gx + nx * 8, gy + ny * 8, K.silver, 2.2);
    // the light of it
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const q = 0.18 + i * 0.26; glow(ctx, lerp(gx, tx, q), lerp(gy, ty, q), (20 + 8 * lit) * (o.bright || 1), K.veinG, (0.18 + 0.16 * lit) * fl); }
    glow(ctx, tx, ty, 26 * (o.bright || 1), '#ffffff', 0.5 * fl * (0.4 + 0.6 * lit));
    ctx.beginPath(); ctx.moveTo(gx + ux * 6, gy + uy * 6); ctx.lineTo(tx, ty); ctx.strokeStyle = rgba(K.veinG, 0.3 * fl); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    // the blade itself: a long thin diamond, white at the middle, starlight-blue at the edges
    const w = 3.1 * (o.wide || 1);
    poly(ctx, [gx + ux * 3 + nx * w, gy + uy * 3 + ny * w, gx + ux * len * 0.94 + nx * 1.2, gy + uy * len * 0.94 + ny * 1.2, tx, ty, gx + ux * len * 0.94 - nx * 1.2, gy + uy * len * 0.94 - ny * 1.2, gx + ux * 3 - nx * w, gy + uy * 3 - ny * w], '#f4f8ff');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    line(ctx, gx + ux * 6, gy + uy * 6, tx, ty, rgba('#ffffff', 0.95), 1.3);
    line(ctx, gx + ux * 6 + nx * 1.6, gy + uy * 6 + ny * 1.6, gx + ux * len * 0.85 + nx * 0.4, gy + uy * len * 0.85 + ny * 0.4, rgba(K.veinG, 0.7), 0.8);
    // sparks of starlight blown off it
    for (let i = 0; i < 5; i++) { const q = (t * 0.6 + i / 5) % 1, along = (0.15 + 0.8 * hash(i, 2)) * len, off = (hash(i, 3) - 0.5) * 10 + q * 12 * (i % 2 ? 1 : -1); circle(ctx, gx + ux * along + nx * off, gy + uy * along + ny * off - q * 8, 0.8 + (1 - q), rgba('#ffffff', 0.8 * (1 - q) * lit)); }
    ctx.restore();
    return [tx, ty];
  }

  // ---------------------------------------------------------------------------------------------------------- the halo and the wheel
  // w 0: the halo of broken star-shards, a thin ring of light round his shoulders with the pieces of it turning slowly, some missing;
  // w 1: the pieces have grown into a wheel of floating blades, all there, all pointing out. (cx, cy): its centre.
  function halo(ctx, t, w, bright, cx, cy, warm) {
    ctx.save();
    const spin = t * (0.2 + 0.4 * w), n = 12, R0 = 50;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx, cy, 70 + 60 * w, warm ? '#ffe2b0' : K.veinG, (0.12 + 0.1 * bright) * (0.8 + 0.4 * w));
    if (w < 0.97) {   // the ring, in arcs with gaps
      ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const a0 = -spin * 0.6 + k * TAU / 6 + hash(k, 1) * 0.4, a1 = a0 + 0.55 + hash(k, 2) * 0.5; ctx.beginPath(); ctx.arc(cx, cy, R0 + 2, a0, a1); ctx.strokeStyle = rgba(K.silver, (0.28 + 0.4 * bright) * (1 - w)); ctx.lineWidth = 1.1; ctx.stroke(); }
    }
    ctx.restore();
    for (let i = 0; i < n; i++) {
      const alive = hash(i, 7) > 0.3 ? 1 : w;
      if (alive < 0.05) continue;
      const a = spin + i * TAU / n + (1 - w) * (hash(i, 3) - 0.5) * 0.5;
      const rad = lerp(R0 - 4 + hash(i, 4) * 12, 66, w), len = lerp(8 + hash(i, 5) * 16, 44 + hash(i, 8) * 5, w) * alive, wid = lerp(2.2 + hash(i, 6) * 2, 4.6, w);
      const tilt = a + (1 - w) * (hash(i, 9) - 0.5) * 2.6;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad + Math.sin(t * 1.1 + i) * 1.4 * w;
      ctx.save(); ctx.globalAlpha *= alive;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, px + Math.cos(tilt) * len * 0.5, py + Math.sin(tilt) * len * 0.5, len * 0.8 + 8, warm ? '#ffcf90' : K.veinG, (0.14 + 0.22 * bright) * (0.6 + 0.4 * w)); ctx.restore();
      kite(ctx, px, py, tilt, len, wid, w > 0.5 ? mixHex('#12162a', '#2a3050', bright * 0.5) : mixHex('#8d96b4', '#f2f5ff', bright * 0.7), w > 0.5 ? rgba(warm ? '#ffe2a8' : '#dde4ff', 0.9) : OUT, w > 0.5 ? 1.5 : 1.3);
      const ux = Math.cos(tilt), uy = Math.sin(tilt);
      line(ctx, px + ux * len * 0.15, py + uy * len * 0.15, px + ux * len * 0.92, py + uy * len * 0.92, rgba(w > 0.5 ? '#fff0d0' : '#ffffff', 0.55 + 0.35 * bright), 0.9);
      if (w > 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, px + ux * len, py + uy * len, 1.8, rgba('#ffffff', 0.9 * w)); ctx.restore(); }
      ctx.restore();
    }
  }
  const mixHex = (a, b, q) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], q)).toString(16).padStart(2, '0')).join(''); };

  // ---------------------------------------------------------------------------------------------------------- the figure
  // the long coat of black glass: a cape behind him and two panels in front with a slit between them, the hem in glass tatters
  function coat(ctx, t, sway, lit, hover) {
    const N = 9, HEM = 34;
    // the cape behind: wider, longer, darker
    const back = [-10, -90, -24, -84, -19, -50, -26, -10];
    for (let i = 0; i <= N; i++) { const u = i / N, x = -37 + u * 74, y = HEM + 4 + (i % 2 ? 0 : -9 - hash(i, 11) * 5) + Math.sin(t * 1.6 + i * 0.9) * sway; back.push(x + Math.sin(t * 1.2 + i) * sway * 0.5, y - hover * Math.sin(u * Math.PI) * 4); }
    back.push(26, -10, 19, -50, 24, -84, 10, -90);
    poly(ctx, back, '#080a14', OUT, 2.4);
    for (let i = 1; i < N; i += 2) line(ctx, (-37 + (i / N) * 74) * 0.5, -36, (-37 + (i / N) * 74), HEM - 6, rgba(K.glassH, 0.35), 1.6);
    // the front panels
    for (const sx of [-1, 1]) {
      const pts = [sx * 3, -54, sx * 17, -56, sx * 24, -12];
      for (let i = 0; i <= 4; i++) { const u = i / 4; pts.push(sx * (30 - u * 25) + Math.sin(t * 1.8 + i * 1.3 + sx) * sway * 0.5, HEM + (i % 2 ? -8 - hash(i + sx, 12) * 4 : 1) + Math.sin(t * 2 + i + sx * 2) * sway * 0.6); }
      pts.push(sx * 3, -14);
      const g = ctx.createLinearGradient(sx * 28, -50, sx * 3, 30); g.addColorStop(0, '#222a4c'); g.addColorStop(1, '#0a0c1a');
      poly(ctx, pts, g, OUT, 2.4);
      ctx.save(); ctx.lineCap = 'round';
      line(ctx, sx * 5, -50, sx * 8, HEM - 8, rgba(K.glassE, 0.4), 1.2);   // the lit edge of the slit
      line(ctx, sx * 15, -48, sx * 22, HEM - 10, rgba(K.glassH, 0.55), 1.8);
      ctx.restore();
      crack(ctx, sx * 12, -42, Math.PI / 2 + sx * 0.12, 30, 20 + sx, lit * 0.9, 0.9);
      crack(ctx, sx * 20, -20, Math.PI / 2 + sx * 0.25, 20, 30 + sx, lit * 0.7, 0.8);
    }
    // a seam of light down the slit, and glass fragments along the hem
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    line(ctx, 0, -50, 0, HEM - 6, rgba(K.veinG, 0.18 * lit), 4); line(ctx, 0, -50, 0, HEM - 6, rgba('#ffffff', 0.3 * lit), 1);
    for (let i = 0; i <= N; i += 2) circle(ctx, -37 + (i / N) * 74, HEM + 2 - (i % 4 ? 5 : 0), 1.2, rgba('#ffffff', 0.55 * lit));
    ctx.restore();
  }
  // the helm and the mask: a cowl of glass swept back in spikes, a smooth silver mask with two thin slits
  function head(ctx, t, look, bow, lit, bright) {
    ctx.save(); ctx.translate(look * 2.4, bow);
    // the sunburst of thin rays behind his head, as on the painted sheet
    ctx.save(); ctx.translate(0, -105);
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 40, '#e6ecff', 0.12 + 0.2 * bright); ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 26; i++) { const a = i * TAU / 26 + Math.sin(t * 0.3) * 0.02, L = i % 2 ? 9 : 17 + hash(i, 5) * 4, r0 = 17; poly(ctx, [Math.cos(a - 0.07) * r0, Math.sin(a - 0.07) * r0, Math.cos(a) * (r0 + L), Math.sin(a) * (r0 + L), Math.cos(a + 0.07) * r0, Math.sin(a + 0.07) * r0], mixHex('#9aa3bd', '#f4f6ff', 0.4 + 0.5 * bright)); }
    ctx.beginPath(); ctx.arc(0, 0, 17.5, 0, TAU); ctx.strokeStyle = rgba('#e8ecf8', 0.55 + 0.35 * bright); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // the hood: smooth black glass with a small peak
    kite(ctx, 0, -112, -Math.PI / 2, 14, 6, K.glassM, OUT, 1.6);
    ellipse(ctx, 0, -104, 12, 15, 0, K.glassP, OUT, 2.4);
    ellipse(ctx, -2.8, -108, 6, 9, 0, rgba(K.glassH, 0.4));
    // the mask
    const g = ctx.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, '#f8f9fe'); g.addColorStop(0.55, '#c9cfde'); g.addColorStop(1, '#7a839c');
    ctx.beginPath(); ctx.moveTo(look * 1.6, -118); ctx.bezierCurveTo(10, -116, 9.5, -102, 3.6, -92.5); ctx.quadraticCurveTo(look * 1.6, -89, -3.6, -92.5); ctx.bezierCurveTo(-9.5, -102, -10, -116, look * 1.6, -118); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(look * 1.2 - 5.5, -112); ctx.quadraticCurveTo(look * 1.2 - 8, -101, look * 1.2 - 3, -93.4); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();   // the light along one cheek
    line(ctx, look * 1.6, -115, look * 1.6, -96, rgba('#5d6683', 0.4), 0.9);   // a faint seam
    for (const sx of [-1, 1]) {   // the slits: thin, dark, with light in them
      const ex = look * 2 + sx * 4.2;
      ctx.beginPath(); ctx.moveTo(ex - sx * 2.6, -105.2); ctx.lineTo(ex + sx * 2.6, -106.6); ctx.lineTo(ex + sx * 2.2, -105); ctx.closePath(); ctx.fillStyle = '#0b0d19'; ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, -105.8, 6 + 3 * bright, '#cdd8ff', 0.18 + 0.4 * lit); circle(ctx, ex + sx * 0.6, -105.9, 0.8, rgba('#ffffff', 0.4 + 0.5 * lit)); ctx.restore();
    }
    ctx.restore();
  }
  // the breastplate, the collar, the pauldrons: black glass, white edges, the star-fragment at his chest
  function torso(ctx, t, lit, bright) {
    // the collar standing up behind the head
    poly(ctx, [-9, -90, -13, -104, -6, -97, 0, -99, 6, -97, 13, -104, 9, -90], K.glassM, OUT, 2);
    // breastplate
    const g = ctx.createLinearGradient(-18, -90, 16, -50); g.addColorStop(0, '#2a3358'); g.addColorStop(0.5, '#12172c'); g.addColorStop(1, '#080a14');
    poly(ctx, [-7, -93, 7, -93, 19, -86, 17, -70, 12, -54, 0, -47, -12, -54, -17, -70, -19, -86], g, OUT, 2.6);
    line(ctx, -7, -92, -18, -86, rgba(K.glassE, 0.6), 1.3); line(ctx, -18, -85, -16, -70, rgba(K.glassE, 0.35), 1.1);
    line(ctx, 0, -92, 0, -50, rgba(K.glassH, 0.55), 1.3);
    poly(ctx, [-12, -67, 12, -67, 10, -61, 0, -57, -10, -61], K.glassP, rgba(K.glassE, 0.5), 1.1);   // the lower plate
    // the star-fragment: a small kite of light set in the breast
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, -75, 22 + 10 * bright, K.veinG, (0.18 + 0.35 * lit) * (0.85 + 0.15 * Math.sin(t * 2.2)));
    ctx.restore();
    kite(ctx, 0, -83, Math.PI / 2, 15, 4.2, rgba('#f4f6ff', 0.55 + 0.4 * lit), rgba('#ffffff', 0.8), 0.9);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, 0, -76, 1.8 + 1.2 * lit, rgba('#ffffff', 0.9)); ctx.restore();
    crack(ctx, -3, -72, 2.3, 18, 41, lit, 1); crack(ctx, 3, -70, 0.7, 17, 43, lit, 1); crack(ctx, -2, -64, 1.9, 12, 45, lit * 0.8, 0.9); crack(ctx, 1, -62, 1.2, 12, 46, lit * 0.8, 0.9);
    // the belt
    line(ctx, -13, -53, 13, -51, OUT, 4.4); line(ctx, -13, -53, 13, -51, K.silverD, 2.6);
    poly(ctx, [0, -57, 4, -52, 0, -47, -4, -52], K.silver, OUT, 1.2);
    // pauldrons
    for (const sx of [-1, 1]) {
      plate(ctx, [sx * 13, -92, sx * 25, -102, sx * 40, -95, sx * 36, -83, sx * 27, -75, sx * 13, -80], K.glassM, K.glassE, 0.7, 2.4);
      kite(ctx, sx * 30, -97, -Math.PI / 2 + sx * 0.3, 20, 4.4, K.glass, OUT, 1.8);
      line(ctx, sx * 15, -88, sx * 34, -90, rgba(K.silverM, 0.55), 1);
      crack(ctx, sx * 20, -92, sx > 0 ? 0.1 : Math.PI - 0.1, 17, 50 + sx, lit * 0.9, 0.9);
      crack(ctx, sx * 29, -86, sx > 0 ? 1.0 : Math.PI - 1.0, 11, 53 + sx, lit * 0.8, 0.8);
    }
  }

  function body(ctx, st, angle = 0) {
    const pr = st.props || {}, t = st.t || 0, A = atk(st), sky = !!pr.sky, moving = st.moving ? 1 : 0;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    let pose = 'idle';
    for (const k of POSES) if (pr['cl' + k[0].toUpperCase() + k.slice(1)]) { pose = k; break; }
    // which hand holds the blade: the side he faces (a turn only when he truly turns)
    if (st.clTs == null) st.clTs = 1;
    if (Math.abs(fx) > 0.32) st.clTs = fx > 0 ? 1 : -1;
    const s = sm(st, 'clSw', st.clTs, 0.1);
    const kS = A.strike * (1 - A.rest), gather = A.p < 0.3;
    const bladeK = pr.clBlade ? clamp(0.82 + (pr.clBlade - 150) / 240 * 0.5, 0.82, 1.34) : 1;
    // what each pose asks of his body (the hand, the way the blade points, the off hand, the lean, the lift, how bright)
    const dir = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
    let T = { hx: s * 23, hy: -46, d: dir(s * 0.52, 0.85), L: 1.0, ox: -s * 19, oy: -44, lean: 0, lift: sky ? -13 : 0, crouch: 0, halo: 0.55, lit: sky ? 0.95 : 0.78, wheel: sky ? 1 : 0, bow: 0, open: 0 };
    switch (pose) {
      case 'glint': {   // a low draw: the blade held back along the floor, then thrown forward along the line he faces
        const back = dir(-fx * 0.95, -fy * 0.5 + 0.3), fwd = dir(fx * 0.97, fy * 0.5 + 0.1);
        T.hx = s * 22 + fx * 12 * kS; T.hy = -34 + 4 * kS; T.d = dir(lerp(back[0], fwd[0], kS), lerp(back[1], fwd[1], kS)); T.L = 1.08;
        T.ox = -s * 6 + fx * 16; T.oy = -56; T.lean = -fx * 5 + fx * 24 * kS; T.crouch = 1 - kS * 0.6; T.halo = 0.7 + 0.3 * kS; T.lit = 0.95; break;
      }
      case 'wake': {   // the blade raised and the halo bright; down along the line he faces at the cut
        const up = dir(s * 0.1, -1), dn = dir(fx * 0.8, 0.55 + fy * 0.25);
        T.hx = s * 22 + fx * 8 * kS; T.hy = -118 + 50 * kS; T.d = dir(lerp(up[0], dn[0], kS), lerp(up[1], dn[1], kS)); T.L = 1.12; T.ox = -s * 20; T.oy = -70 + 14 * kS; T.open = 1;
        T.lean = fx * 12 * kS; T.halo = 1; T.lit = 1; break;
      }
      case 'crown': {   // the blade lifted overhead in both hands, embers rising; then brought down on the one he faces
        const up = dir(s * 0.06, -1), dn = dir(fx * 0.6, 0.8);
        T.hx = s * 7 + fx * 6 * kS; T.hy = -136 + 70 * kS; T.d = dir(lerp(up[0], dn[0], kS), lerp(up[1], dn[1], kS)); T.L = 1.15; T.ox = s * 7 + fx * 6 * kS - s * 0; T.oy = -122 + 62 * kS;
        T.lean = fx * 10 * kS; T.halo = 0.85; T.lit = 1; break;
      }
      case 'thrust': {   // a long lunge: the blade drawn back at the hip, then driven out along the line he faces
        const back = dir(-fx * 0.9, 0.2), fwd = dir(fx * 0.98, fy * 0.55);
        T.hx = s * 14 + fx * 36 * kS; T.hy = -52 + fy * 8 * kS; T.d = dir(lerp(back[0], fwd[0], kS), lerp(back[1], fwd[1], kS)); T.L = 1.35;
        T.ox = -s * 18 - fx * 10 * kS; T.oy = -60; T.lean = -fx * 6 + fx * 30 * kS; T.crouch = 1 - kS * 0.2; T.halo = 0.8; T.lit = 0.95; break;
      }
      case 'grace': {   // one hand open, palm down, the light leaving him; the blade lowered and still
        T.hx = s * 17; T.hy = -40; T.d = dir(s * 0.1, 1); T.L = 0.9; T.ox = -s * 38; T.oy = -62; T.open = 1; T.lit = 0.2; T.halo = 0.4; T.bow = 1.5; break;
      }
      case 'night': {   // both hands on the pommel, the point in the floor, the head bowed; everything dim
        T.hx = s * 2; T.hy = -52; T.d = dir(0, 1); T.L = 0.88; T.ox = -s * 3; T.oy = -46; T.lit = 0.28; T.halo = 0.3; T.bow = 3; T.crouch = 0.3; break;
      }
      case 'summon': {   // the blade raised to the sky, one hand open beside it
        T.hx = s * 26; T.hy = -112; T.d = dir(s * 0.1, -1); T.L = 1.25; T.ox = -s * 28; T.oy = -108; T.open = 1; T.halo = 1; T.lit = 1; T.lift = sky ? -13 : -3; break;
      }
      case 'ember': {   // the off hand held out with a black ember in it
        T.ox = -s * 6 + fx * 22; T.oy = -62 + fy * 8; T.open = 0; T.halo = 0.55; T.lit = 0.7; break;
      }
      case 'ascend': {   // rising: both arms out and up, lifted off the ground, the halo opening
        T.hx = s * 38; T.hy = -86; T.d = dir(s * 0.7, -0.7); T.L = 1.1; T.ox = -s * 38; T.oy = -86; T.open = 1; T.lift = -34; T.halo = 1; T.lit = 1; T.wheel = 0.75; T.bow = -1; break;
      }
      case 'ascendant': {   // risen: arms wide, the wheel full
        T.hx = s * 42; T.hy = -80; T.d = dir(s * 0.9, -0.45); T.L = 1.15; T.ox = -s * 42; T.oy = -80; T.open = 1; T.lift = -16; T.halo = 1; T.lit = 1.1; T.wheel = 1; break;
      }
      case 'horizon': {   // the blade drawn wide across the room: out from across his body to the side
        T.hx = lerp(-s * 12, s * 44, kS); T.hy = lerp(-76, -80, kS); T.d = dir(lerp(-s, s, kS), lerp(-0.12, 0.03, kS)); T.L = 1.38;
        T.ox = -s * 24; T.oy = -62; T.open = 1; T.lean = s * 6 * kS; T.halo = 0.95; T.lit = 1; T.lift = sky ? -13 : 0; break;
      }
      case 'rage': {   // both arms up, the blade high, the halo blazing: the sky is coming down
        T.hx = s * 16; T.hy = -134; T.d = dir(s * 0.08, -1); T.L = 1.4; T.ox = -s * 16; T.oy = -132; T.open = 1; T.halo = 1.4; T.lit = 1.3; T.lift = sky ? -20 : -6; T.wheel = sky ? 1 : 0.3; break;
      }
    }
    if (pose === 'idle' && moving) { T.lean = fx * 3; T.hy += 1; }
    const rate = (A.p >= 0.25 && A.p < 0.62) ? 0.34 : 0.12;
    const P = smv(st, 'clP', [T.hx, T.hy, T.d[0], T.d[1], T.L, T.ox, T.oy, T.lean, T.lift, T.crouch, T.halo, T.lit, T.wheel, T.bow, T.open], rate);
    const wheel = sm(st, 'clWh', T.wheel, 0.035), openH = P[14];
    const lit = clamp(P[11], 0.05, 1.3), halB = clamp(P[10], 0.2, 1.4);
    const dl = Math.hypot(P[2], P[3]) || 1, bAng = Math.atan2(P[3] / dl, P[2] / dl), bLen = 106 * P[4] * bladeK;
    const bob = Math.sin(t * 0.8) * 1.4 + moving * Math.sin(t * 3.1) * 1.7 + (sky ? Math.sin(t * 1.3) * 2.4 : 0);
    const lift = P[8], sway = 1.3 + moving * 2.2 + (sky ? 1.8 : 0) + (pose === 'rage' || pose === 'ascend' || pose === 'ascendant' ? 2.5 : 0);

    ctx.save(); ctx.rotate(-angle);
    // ---- on the floor: his shadow (it stays on the ground when he is lifted) and the cold light the glass throws
    const hov = clamp(-lift / 30, 0, 1);
    ellipse(ctx, 0, 38, 46 - 16 * hov, 11 - 3 * hov, 0, rgba('#02030a', 0.5 - 0.2 * hov));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 36, 70 + 20 * halB, K.veinG, (0.07 + 0.08 * lit) * (sky ? 0.6 : 1)); ctx.restore();
    if (pose === 'ascend' || pose === 'ascendant') {   // the ground giving him up: rings of light going out along it
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, 38, 30 + q * 110, (30 + q * 110) * 0.3, 0, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.5 * (1 - q)); ctx.lineWidth = 2.6 - q * 1.6; ctx.stroke(); }
      ctx.restore();
    }
    if (pose === 'grace') {   // the light going out of him along the floor
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) { const q = (t * 0.6 + i / 2) % 1; ctx.beginPath(); ctx.ellipse(0, 38, 20 + q * 150, (20 + q * 150) * 0.32, 0, 0, TAU); ctx.strokeStyle = rgba(K.veinG, 0.55 * (1 - q)); ctx.lineWidth = 2.4; ctx.stroke(); }
      ctx.restore();
    }
    // ---- the figure: leaning from the ground (a shear: the feet stay where they are), lifted, crouched
    ctx.save();
    ctx.translate(0, lift + bob * 0.5 + P[9] * 2);
    ctx.transform(1, 0, -P[7] / 135, 1 - P[9] * 0.025, 0, 0);
    // the wheel or the halo, behind everything
    halo(ctx, t, wheel, halB, 0, -88, sky || wheel > 0.5);
    // the light leaving him (Grace): motes streaming out from the chest, fading
    if (pose === 'grace') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 22; i++) { const q = (t * 0.55 + i / 22 + hash(i, 4) * 0.2) % 1, a = hash(i, 5) * TAU, d = 14 + q * (90 + 60 * hash(i, 6)); circle(ctx, Math.cos(a) * d, -72 + Math.sin(a) * d * 0.8 - q * 22, 1.1 + (1 - q) * 1.5, rgba('#ffffff', 0.85 * (1 - q) * Math.min(1, q * 5))); }
      ctx.restore();
    }
    coat(ctx, t, sway, lit, hov);
    // the boots at the hem
    for (const sx of [-1, 1]) { const step = moving ? Math.max(0, Math.sin(t * 6.2 + (sx > 0 ? 0 : Math.PI))) * 4 : 0; poly(ctx, [sx * 4, 30 - step, sx * 11, 31 - step, sx * 12, 38 - step, sx * 3, 38 - step], '#0a0c18', OUT, 1.8); line(ctx, sx * 4, 38 - step, sx * 12, 38 - step, rgba(K.silverM, 0.6), 1); }
    // the off arm first (behind the blade arm), the body, then the head and the blade arm
    const shOff = [-s * 22, -84], shMain = [s * 22, -84];
    arm(ctx, shOff[0], shOff[1], P[5], P[6], -s * 6, lit);
    torso(ctx, t, lit, halB);
    hand(ctx, P[5], P[6], openH, pose === 'grace' ? Math.PI / 2 : pose === 'summon' || pose === 'rage' ? -Math.PI / 2 : s > 0 ? Math.PI * 0.85 : Math.PI * 0.15, lit);
    if (pose === 'ember') {   // the black ember: a seed of dark with a thin white rim, held out in the open hand
      const ex = P[5], ey = P[6] - 8; ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, ey, 22, K.violetH, 0.28); ctx.restore();
      circle(ctx, ex, ey, 6.4 + Math.sin(t * 9) * 0.5, '#05030a', rgba('#ffffff', 0.9), 1.4); circle(ctx, ex - 1.5, ey - 1.5, 1.6, rgba('#ffffff', 0.55));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const q = (t * 1.2 + i / 4) % 1; circle(ctx, ex + Math.sin(i * 3 + t) * 5, ey - q * 14, 1 + (1 - q), rgba(K.violetH, 0.7 * (1 - q))); } ctx.restore();
    }
    head(ctx, t, clamp(fx, -1, 1), P[13], lit, halB);
    // the blade arm, then the blade over all
    arm(ctx, shMain[0], shMain[1], P[0], P[1], s * 6, lit);
    const tip = blade(ctx, P[0] + Math.cos(bAng) * 6, P[1] + Math.sin(bAng) * 6, bAng, bLen, { t, lit: Math.min(1, lit), bright: halB > 1 ? 1.3 : 1, wide: pose === 'rage' ? 1.5 : 1 });
    if (pose === 'crown' || pose === 'rage') hand(ctx, P[5] + 0, P[6] + 0, 0, 0, lit);   // the second hand on the hilt
    hand(ctx, P[0], P[1], 0, 0, lit);
    // embers rising round the blade for the Crown; the light pouring up it for the call to the sky
    if (pose === 'crown' || pose === 'rage') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) { const q = (t * 0.75 + i / 16) % 1, a0 = hash(i, 14) * TAU + t * 0.8, rr = 18 + 22 * hash(i, 15), x = P[0] + Math.cos(a0) * rr * (1 - q * 0.4), y = P[1] - 20 - q * 80 + Math.sin(a0) * 4; circle(ctx, x, y, 1.1 + 1.2 * (1 - q), rgba(i % 3 ? K.ember : K.emberH, 0.85 * (1 - q))); }
      glow(ctx, P[0], P[1] - 40, 46, K.ember, 0.22 + 0.1 * Math.sin(t * 7)); ctx.restore();
    }
    if (pose === 'summon' || pose === 'rage' || pose === 'ascend' || pose === 'ascendant') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { const q = (t * 0.6 + i / 12) % 1, ux = Math.cos(bAng), uy = Math.sin(bAng); circle(ctx, tip[0] - (tip[0] - P[0]) * (1 - q) * 0 + ux * q * 70 + (hash(i, 16) - 0.5) * 16, tip[1] + uy * q * 70 + (hash(i, 17) - 0.5) * 8, 0.9 + (1 - q) * 1.4, rgba('#ffffff', 0.9 * (1 - q))); }
      glow(ctx, tip[0], tip[1], 40, '#ffffff', 0.24 + 0.1 * Math.sin(t * 6)); ctx.restore();
    }
    if (pose === 'rage') {   // the whole of him alight
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, -70, 120, '#ffffff', 0.12 + 0.06 * Math.sin(t * 9));
      for (let i = 0; i < 3; i++) { const q = (t * 0.9 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, -66, 50 + q * 150, 40 + q * 120, 0, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.45 * (1 - q)); ctx.lineWidth = 3.2 - q * 2; ctx.stroke(); }
      ctx.restore();
    }
    // star-dust falling off him, always
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const q = (t * 0.22 + hash(i, 20)) % 1, x = (hash(i, 21) - 0.5) * 64 + Math.sin(t + i * 2) * 3, y = -118 + q * 150; circle(ctx, x, y, 0.8 + hash(i, 22) * 0.7, rgba('#e8eeff', 0.6 * Math.min(1, q * 5) * (1 - q))); }
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }
  // the image he is drawn as for the journal or a preview: the figure alone (a plain call into body)

  // ---------------------------------------------------------------------------------------------------------- the half-buried star
  // star-glass: faces of white-hot, lavender and deep violet. A spire from its base (bx, by): w half width, h tall, lean the tip's drift.
  function spire(ctx, bx, by, w, h, lean, o = {}) {
    const lt = o.lit == null ? 1 : o.lit, tx = bx + lean, ty = by - h, mx = bx + w * 0.08, my = by + w * 0.42;
    const slx = bx - w * 0.96 + lean * 0.3, sly = by - h * 0.6, srx = bx + w * 0.92 + lean * 0.3, sry = by - h * 0.56;
    poly(ctx, [bx - w, by, slx, sly, tx, ty, mx, my], mixHex(K.sgM, K.sgL, 0.5 * lt), OUT, 1.8);          // the lit face
    poly(ctx, [mx, my, tx, ty, srx, sry, bx + w, by], mixHex(K.sgDD, K.sgD, 0.55 * lt), OUT, 1.8);       // the shaded face
    poly(ctx, [slx, sly, tx, ty, lerp(slx, tx, 0.45) + w * 0.35, lerp(sly, ty, 0.45) + h * 0.1], rgba('#ffffff', 0.5 * lt));   // the bevel at the top of the lit face
    poly(ctx, [bx - w * 0.7, by - h * 0.05, slx + w * 0.1, sly + h * 0.08, bx - w * 0.08, by - h * 0.18, mx - w * 0.1, my - h * 0.05], rgba('#ffffff', 0.2 * lt));   // a long glint
    poly(ctx, [tx, ty, srx, sry, lerp(srx, tx, 0.5), lerp(sry, ty, 0.5) - 1], rgba('#9a8cff', 0.35));
    line(ctx, tx, ty, mx, my, rgba('#ffffff', 0.5), 1);
    line(ctx, slx, sly, srx, sry, rgba('#241d62', 0.35), 0.9);
    if (o.hot) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, bx, by - h * 0.45, h * 0.55, K.sgHot, o.hot * 0.5); ctx.restore(); }
  }
  // a chunk of the crater's rock, jagged, its upper edge lit by the star
  function rock(ctx, x, y, s, seed, lit = 0.5) {
    const pts = []; const n = 5 + (hash(seed, 1) < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) { const a = i * TAU / n + hash(seed, i) * 0.9 - 0.45, rr = s * (0.5 + hash(seed, i + 9) * 0.8); pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62); }
    poly(ctx, pts, `rgb(${20 + hash(seed, 3) * 14 | 0},${17 + hash(seed, 4) * 10 | 0},${38 + hash(seed, 5) * 18 | 0})`, OUT, 1.8);
    const top = [0, 0]; let ti = 0; for (let i = 0; i < n; i++) if (pts[i * 2 + 1] < pts[ti * 2 + 1]) ti = i;
    const a2 = (ti + 1) % n, a0 = (ti + n - 1) % n;
    line(ctx, pts[a0 * 2], pts[a0 * 2 + 1], pts[ti * 2], pts[ti * 2 + 1], rgba('#cdbfff', 0.3 + 0.4 * lit), 1.4);
    line(ctx, pts[ti * 2], pts[ti * 2 + 1], pts[a2 * 2], pts[a2 * 2 + 1], rgba('#cdbfff', 0.15 + 0.3 * lit), 1.2);
    void top;
  }
  // the core (r 72): a great white-hot crystal of star-glass, half sunk in the rock, a ring of broken rock round its foot
  function starCore(ctx, pr, t) {
    const { x, y, r } = pr, pul = 0.5 + 0.5 * Math.sin(t * 1.5), flk = 0.9 + 0.1 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 17);
    ctx.save(); ctx.translate(x, y);
    ellipse(ctx, 0, 12, r * 1.25, r * 0.62, 0, rgba('#05030f', 0.55));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 6, r * 2.5, K.violetH, 0.14 + 0.08 * pul); glow(ctx, 0, 0, r * 1.4, K.sgHot, 0.16 + 0.1 * pul); ctx.restore();
    // the rock behind it, heaped
    for (let i = 0; i < 7; i++) { const a = Math.PI + 0.2 + i * (Math.PI - 0.4) / 6; rock(ctx, Math.cos(a) * r * 0.95, 8 + Math.sin(a) * r * 0.45, 17 + hash(i, 61) * 12, 70 + i, 0.5); }
    // the spires: the tall one in the middle, the others leaning off it
    spire(ctx, -42, 14, 17, 62, -10, { lit: 0.8 });
    spire(ctx, 40, 12, 18, 76, 8, { lit: 0.7 });
    spire(ctx, -22, 20, 22, 94, -6, { lit: 0.95, hot: 0.3 });
    spire(ctx, 22, 20, 21, 86, 7, { lit: 0.9, hot: 0.3 });
    spire(ctx, 0, 24, 30, 124, 2, { lit: 1, hot: 0.6 * flk });
    // the white-hot heart showing through the facets, and the light going out of it
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, -46, 62, K.sgHot, (0.42 + 0.2 * pul) * flk); glow(ctx, 0, -46, 26, '#ffffff', 0.7 * flk);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.42 + Math.sin(t * 0.4 + i) * 0.04; line(ctx, 0, -46, Math.cos(a) * 130, -46 + Math.sin(a) * 130, rgba('#ffffff', 0.05 + 0.04 * pul), 7); }
    ctx.restore();
    // the cracks of it running down into the rock, and rubble in front hiding the foot
    for (let i = 0; i < 6; i++) { const a = 0.15 + i * 0.5; crack(ctx, Math.cos(a) * 30, 22 + Math.sin(a) * 6, a, 40 + hash(i, 62) * 22, 80 + i, 0.8, 1.1); }
    for (let i = 0; i < 8; i++) { const a = 0.05 + i * (Math.PI - 0.1) / 7; rock(ctx, Math.cos(a) * r * 1.0, 22 + Math.sin(a) * r * 0.42, 14 + hash(i, 63) * 11, 90 + i, 0.9 - Math.sin(a) * 0.4); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) { const q = (t * 0.2 + hash(i, 64)) % 1, a = hash(i, 65) * TAU; circle(ctx, Math.cos(a) * (18 + q * 50), -30 + Math.sin(a) * (10 + q * 20) - q * 70, 0.9 + (1 - q) * 1.2, rgba('#ffffff', 0.8 * (1 - q) * Math.min(1, q * 6))); }   // motes lifting off it
    ctx.restore();
    ctx.restore();
  }
  // a shard (r 38): two or three jagged pieces of the same glass standing out of a heap of rock
  function starShard(ctx, pr, t) {
    const { x, y, r } = pr, i0 = pr.i | 0, pul = 0.5 + 0.5 * Math.sin(t * 1.5 + i0 * 1.3), sd = 200 + i0 * 13;
    ctx.save(); ctx.translate(x, y);
    ellipse(ctx, 2, 9, r * 1.25, r * 0.6, 0, rgba('#05030f', 0.5));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -14, r * 2, K.violetH, 0.1 + 0.05 * pul); ctx.restore();
    for (let i = 0; i < 4; i++) { const a = Math.PI + 0.3 + i * 0.8; rock(ctx, Math.cos(a) * r * 0.8, 6 + Math.sin(a) * r * 0.4, 11 + hash(sd, i) * 8, sd + i, 0.5); }
    const lean = (hash(sd, 1) - 0.5) * 16;
    spire(ctx, -14, 10, 12, 44 + hash(sd, 2) * 10, -8 + lean * 0.4, { lit: 0.75 });
    spire(ctx, 15, 11, 12, 38 + hash(sd, 3) * 10, 7 + lean * 0.4, { lit: 0.7 });
    spire(ctx, 0, 14, 17, 66 + hash(sd, 4) * 10, lean, { lit: 0.95, hot: 0.25 * (0.7 + 0.3 * pul) });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -26, 24, K.sgHot, 0.22 + 0.1 * pul); ctx.restore();
    crack(ctx, -4, 16, 1.4, 22, sd + 7, 0.7, 1);
    for (let i = 0; i < 5; i++) { const a = 0.1 + i * 0.7; rock(ctx, Math.cos(a) * r * 0.85, 15 + Math.sin(a) * r * 0.32, 8 + hash(sd, i + 20) * 7, sd + 30 + i, 0.8); }
    ctx.restore();
  }
  // what a broken shard leaves: a scorch, a stump, fragments of star-glass lying about, still giving off a little light
  function shardRubble(c, fl, r) {
    glow(c, fl.x, fl.y, fl.r * 1.5, '#07040f', 0.5);
    glow(c, fl.x, fl.y, fl.r * 1.3, K.violetH, 0.2); glow(c, fl.x, fl.y, fl.r * 0.6, '#ffffff', 0.12);
    for (let i = 0; i < 6; i++) { const a = r() * TAU, d = Math.sqrt(r()) * fl.r * 0.8; rock(c, fl.x + Math.cos(a) * d, fl.y + Math.sin(a) * d * 0.7, 6 + r() * 9, Math.floor(r() * 900), 0.6); }
    spire(c, fl.x + 2, fl.y + 6, 12, 15, 2, { lit: 0.8 });   // the stump of it
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * fl.r * 0.95, x = fl.x + Math.cos(a) * d, y = fl.y + Math.sin(a) * d * 0.75, s = 4 + r() * 8, q = r() * TAU;
      poly(c, [x + Math.cos(q) * s, y + Math.sin(q) * s * 0.8, x + Math.cos(q + 2.3) * s * 0.7, y + Math.sin(q + 2.3) * s * 0.55, x + Math.cos(q + 4.1) * s * 0.9, y + Math.sin(q + 4.1) * s * 0.7], r() < 0.5 ? K.sgM : K.sgL, OUT, 1.2);
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const a = r() * TAU, d = r() * fl.r; circle(c, fl.x + Math.cos(a) * d, fl.y + Math.sin(a) * d * 0.7, 1 + r() * 1.4, rgba('#ffffff', 0.5)); }
    c.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the crater
  // a four-pointed twinkle
  const twinkle = (c, x, y, L, a) => { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ffffff', a); c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - L, y); c.lineTo(x + L, y); c.moveTo(x, y - L); c.lineTo(x, y + L); c.stroke(); circle(c, x, y, 1.2, rgba('#ffffff', a)); c.restore(); };
  // a black glass spike of the rim: base on the circle at a, rising out along it
  function rimSpike(c, a, d, h, wd, lit) {
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, x = ux * d, y = uy * d;
    const tx = x + ux * h + nx * wd * 0.4, ty = y + uy * h + ny * wd * 0.4;
    poly(c, [x - nx * wd, y - ny * wd, tx, ty, x + nx * wd, y + ny * wd], '#0a0a18', OUT, 1.8);
    poly(c, [x - nx * wd, y - ny * wd, tx, ty, x - nx * wd * 0.1, y - ny * wd * 0.1], rgba('#2a3358', 0.8));
    line(c, x - nx * wd, y - ny * wd, tx, ty, rgba('#ffb878', 0.12 + 0.55 * lit), 1.5);
    line(c, x - nx * wd * 0.2, y - ny * wd * 0.2, tx, ty, rgba('#cdd6ff', 0.1 + 0.2 * lit), 0.9);
  }
  function buildStarCrater(c, bx, by) {
    const r = rng(3301), R = ARENA.r, mx = R * 0.2, my = -(R + 150), ma = Math.atan2(my, mx);
    // ---- the night beyond: deep violet, a few stars, the meteor huge and burning over the rim
    const g0 = c.createLinearGradient(0, -by, 0, by); g0.addColorStop(0, '#0d0a24'); g0.addColorStop(0.45, '#090818'); g0.addColorStop(1, '#05040e');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 22; i++) glow(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 120 + r() * 220, r() < 0.5 ? '#2a1c5c' : '#1a1240', 0.22 + r() * 0.2);
    for (let i = 0; i < 160; i++) circle(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 0.4 + r() * 1.1, rgba(r() < 0.8 ? '#e8ecff' : '#ffd8b0', 0.1 + r() * 0.4));
    glow(c, mx, my, 900, '#8a2a14', 0.3); glow(c, mx, my, 520, '#ff6a2a', 0.3);
    // the body of it: a vast dark mass over the rim, its crust molten along the underside, the head of it (the set's star) at the leading edge
    {
      const Rb = 560, bcx = mx, bcy = my - 440, bg = c.createLinearGradient(0, bcy - Rb, 0, bcy + Rb);
      bg.addColorStop(0, '#07050f'); bg.addColorStop(0.55, '#170a14'); bg.addColorStop(0.8, '#4a1a12'); bg.addColorStop(0.93, '#d4561e'); bg.addColorStop(1, '#ffd48a');
      c.save(); c.beginPath(); c.arc(bcx, bcy, Rb, 0, TAU); c.clip(); c.fillStyle = bg; c.fillRect(bcx - Rb, bcy - Rb, Rb * 2, Rb * 2);
      for (let i = 0; i < 60; i++) { const a = r() * TAU, d = Math.sqrt(r()) * Rb, x = bcx + Math.cos(a) * d, y = bcy + Math.sin(a) * d, sz = 24 + r() * 70, pts = [], q0 = r() * TAU; for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.7; pts.push(x + Math.cos(q) * sz, y + Math.sin(q) * sz * 0.8); } const heat = clamp((y - bcy) / Rb, 0, 1); poly(c, pts, rgba('#0a0610', 0.3 + 0.3 * r()), rgba('#ff9a4a', 0.1 + 0.5 * heat * heat), 1.4 + 2 * heat); }
      for (let i = 0; i < 30; i++) glow(c, bcx + (r() * 2 - 1) * Rb, bcy + Rb * (0.3 + r() * 0.7), 60 + r() * 120, r() < 0.5 ? '#ff7a2a' : '#ffc070', 0.15 + r() * 0.25);
      c.restore();
      glow(c, bcx, bcy + Rb * 0.95, Rb * 0.9, '#ff8a3a', 0.34);
      c.beginPath(); c.arc(bcx, bcy, Rb, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = 'rgba(255,214,150,0.5)'; c.lineWidth = 3; c.stroke();
    }
    SET3_SKY.draw(c, mx, my, 1, { dir: -1.42 });
    // ---- the crater's slope and its black glass spikes, lit orange on the side of the meteor
    c.beginPath(); c.arc(0, 0, R + 150, 0, TAU); c.arc(0, 0, R, 0, TAU, true);
    const sl = c.createRadialGradient(0, 0, R, 0, 0, R + 150); sl.addColorStop(0, '#171433'); sl.addColorStop(0.5, '#0e0c22'); sl.addColorStop(1, '#07061a'); c.fillStyle = sl; c.fill('evenodd');
    for (let i = 0; i < 70; i++) { const a = r() * TAU, d = R + 40 + r() * 120, s = 14 + r() * 40, pts = [], q0 = r() * TAU; for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.6; pts.push(Math.cos(a) * d + Math.cos(q) * s, Math.sin(a) * d + Math.sin(q) * s * 0.8); } poly(c, pts, `rgba(${14 + r() * 14 | 0},${12 + r() * 10 | 0},${34 + r() * 20 | 0},0.8)`, 'rgba(2,2,10,0.6)', 1.6); }
    for (let i = 0; i < 90; i++) {
      const a = i * TAU / 90 + r() * 0.05, am = a, lit = clamp(Math.cos(am - ma) * 0.8 + 0.2, 0, 1);
      rimSpike(c, a, R + 4 + r() * 30, 30 + r() * 110 * (0.5 + lit * 0.6), 11 + r() * 16, lit);
    }
    for (let i = 0; i < 18; i++) {   // white crystals scattered in it, as on the painted sheet
      const a = r() * TAU, d = R + 20 + r() * 130, x = Math.cos(a) * d, y = Math.sin(a) * d;
      c.save(); c.translate(x, y); spire(c, 0, 0, 5 + r() * 5, 16 + r() * 26, (r() - 0.5) * 8, { lit: 0.9, hot: 0.4 }); c.restore();
    }
    glow(c, R * 0.55, -R * 0.8, 520, '#ff8a4a', 0.18);   // the meteor's fire on the rim
    // ---- the floor: glassy black-violet rock, cracked with white light
    c.save(); ARENA.trace(c, 0); c.clip();
    const sg = c.createRadialGradient(0, 0, 40, 0, 0, R); sg.addColorStop(0, '#5c5698'); sg.addColorStop(0.45, '#433e7c'); sg.addColorStop(1, '#2a2756');
    c.fillStyle = sg; c.fillRect(-R, -R, R * 2, R * 2);
    for (let i = 0; i < 60; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; glow(c, Math.cos(a) * d, Math.sin(a) * d, 50 + r() * 100, r() < 0.5 ? '#07061a' : '#3a2f78', 0.14 + r() * 0.14); }
    for (let i = 0; i < 190; i++) {   // plates of glass-rock
      const a = r() * TAU, d = Math.sqrt(r()) * R, s = 18 + r() * 40, pts = [], q0 = r() * TAU;
      for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.7; pts.push(Math.cos(a) * d + Math.cos(q) * s, Math.sin(a) * d + Math.sin(q) * s * 0.85); }
      poly(c, pts, `rgba(${34 + r() * 40 | 0},${30 + r() * 32 | 0},${84 + r() * 56 | 0},${0.25 + r() * 0.3})`, 'rgba(6,4,20,0.55)', 1.6);
      line(c, pts[0], pts[1], pts[2], pts[3], 'rgba(200,190,255,0.22)', 1.1);
    }
    // the broken ring round the star: the ground thrown up where it fell, rubble and radial cracks
    for (let k = 0; k < 2; k++) { const rr = 118 + k * 74; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.strokeStyle = 'rgba(3,2,12,0.55)'; c.lineWidth = 7 - k * 2; c.setLineDash([46 + k * 20, 14 + k * 10]); c.stroke(); c.setLineDash([]); c.strokeStyle = rgba(K.violetH, 0.1); c.lineWidth = 1; c.stroke(); }
    const fiss = [];
    for (let i = 0; i < 56; i++) {   // the cracks: long ones run out from the star and branch, the rest are everywhere; light in about a third
      const radial = i < 22, a0 = radial ? i * TAU / 22 + (r() - 0.5) * 0.3 : r() * TAU, d0 = radial ? 70 : Math.sqrt(r()) * R * 0.9;
      let x = Math.cos(a0) * d0, y = Math.sin(a0) * d0, a = radial ? a0 : r() * TAU; const n = radial ? 5 + Math.floor(r() * 6) : 4 + Math.floor(r() * 5), pts = [x, y];
      for (let k = 0; k < n; k++) { a += (r() - 0.5) * 0.9; const st = 12 + r() * 20; x += Math.cos(a) * st; y += Math.sin(a) * st; pts.push(x, y); }
      c.beginPath(); c.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k], pts[k + 1]); c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = 'rgba(2,2,10,0.75)'; c.lineWidth = radial ? 3.8 : 2.8; c.stroke();
      if (radial || i % 3 === 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(K.veinG, radial ? 0.16 : 0.1); c.lineWidth = radial ? 2.6 : 1.8; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 0.8; c.stroke(); c.restore(); fiss.push({ pts, ph: r() * 9, k: radial ? 1 : 0.7 }); }
    }
    for (let i = 0; i < 2800; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.0, r() < 0.55 ? `rgba(4,3,14,${0.15 + r() * 0.25})` : `rgba(200,190,255,${0.05 + r() * 0.16})`); }   // grit and star-dust
    for (let i = 0; i < 70; i++) twinkle(c, (r() * 2 - 1) * R * 0.95, (r() * 2 - 1) * R * 0.95, 2.5 + r() * 3, 0.15 + r() * 0.3);   // glints in the glass
    glow(c, 0, 0, R * 0.7, '#cfc8ff', 0.2); glow(c, 0, 0, 150, '#ffffff', 0.18);              // the star's own light
    glow(c, R * 0.3, -R * 0.55, 520, '#ff8a4a', 0.07);                                          // and the meteor's, faint
    // a faint worn ring near the wall, as in the painted room
    c.beginPath(); c.arc(0, 0, R - 38, 0, TAU); c.strokeStyle = 'rgba(200,180,120,0.1)'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.arc(0, 0, R - 46, 0, TAU); c.strokeStyle = 'rgba(200,180,120,0.06)'; c.lineWidth = 1; c.stroke();
    const v = c.createRadialGradient(0, 0, R * 0.55, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(4,3,12,0)'); v.addColorStop(1, 'rgba(4,3,12,0.42)'); c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    // ---- the lip: a dark ridge of rock, blocks of it, its edge lit on the side of the meteor
    c.save(); ARENA.trace(c, 0); c.clip(); ARENA.trace(c, 0); c.strokeStyle = 'rgba(3,2,10,0.6)'; c.lineWidth = 30; c.stroke(); c.restore();
    const NB = 54;
    for (let i = 0; i < NB; i++) {
      const a0 = i * TAU / NB + 0.003, a1 = (i + 1) * TAU / NB - 0.003, ro = R + 10 + r() * 10, v2 = r(), am = (a0 + a1) / 2, lit = clamp(Math.cos(am - ma) * 0.9 + 0.1, 0, 1);
      c.beginPath(); c.arc(0, 0, ro, a0, a1); c.arc(0, 0, R - 1, a1, a0, true); c.closePath(); c.fillStyle = `rgb(${22 + v2 * 20 | 0},${20 + v2 * 14 | 0},${46 + v2 * 24 | 0})`; c.fill(); c.strokeStyle = 'rgba(2,2,10,0.9)'; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.arc(0, 0, ro - 2, a0 + 0.005, a1 - 0.005); c.strokeStyle = rgba('#ffa868', 0.08 + 0.42 * lit); c.lineWidth = 2; c.stroke();
      if (r() < 0.16) { c.save(); c.translate(Math.cos(am) * (R + 4), Math.sin(am) * (R + 4)); c.rotate(r() * TAU); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(190,180,255,0.4)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-8, 0); c.lineTo(0, (r() - 0.5) * 6); c.lineTo(8, (r() - 0.5) * 8); c.stroke(); c.restore(); }
    }
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = 'rgba(1,1,6,0.9)'; c.lineWidth = 2.6; c.stroke();
    ArenaView.amb = {
      kind: 'starcrater', star: [mx, my], fiss,
      dust: Array.from({ length: 70 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.95; return { x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * 9, sp: 0.05 + r() * 0.1, s: 0.7 + r() * 1.1 }; }),
      sparks: Array.from({ length: 5 }, () => ({ ph: r() * 9, sp: 0.04 + r() * 0.05, a: r() * 0.6 - 0.3 })),
    };
  }
  function starCraterLife(ctx, a, t) {
    const R = ARENA.r;
    ctx.save(); ctx.beginPath(); ARENA.trace(ctx, 0); ctx.clip();
    for (const f of a.fiss) {   // the light in the cracks breathes
      const q = 0.5 + 0.5 * Math.sin(t * (0.8 + 0.4 * f.k) + f.ph); if (q < 0.2) continue;
      ctx.beginPath(); ctx.moveTo(f.pts[0], f.pts[1]); for (let k = 2; k < f.pts.length; k += 2) ctx.lineTo(f.pts[k], f.pts[k + 1]);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = rgba('#d6dcff', (0.04 + 0.2 * q) * f.k); ctx.lineWidth = 2.4; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.12 * q * f.k); ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 0, 320, '#cfc8ff', 0.04 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.5)));   // the star's slow pulse
    for (const d of a.dust) {   // star-dust lifting off the floor and drifting
      const q = (t * d.sp + d.ph) % 1, x = d.x + Math.sin(t * 0.4 + d.ph * 5) * 12 + q * 10, y = d.y - q * 46;
      circle(ctx, x, y, d.s * (1 - q * 0.5), rgba(d.ph % 2 < 1 ? '#e8ecff' : '#b9a8ff', 0.55 * Math.sin(q * Math.PI)));
    }
    ctx.restore();
    ctx.restore();
    // sparks flung down off the meteor, crossing the margin
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of a.sparks) { const q = (t * s.sp + s.ph) % 1, x0 = a.star[0] + 40 + s.a * 600, y0 = a.star[1] + 60; const x = x0 + q * (s.a * 420 - 30), y = y0 + q * 540; line(ctx, x, y, x - (s.a * 420 - 30) * 0.05, y - 30, rgba('#ffb070', 0.5 * (1 - q) * Math.min(1, q * 8)), 2); circle(ctx, x, y, 1.8, rgba('#ffe0b0', 0.8 * (1 - q))); }
    ctx.restore();
    SET3_SKY.life(ctx, a.star[0], a.star[1], 1, t);
  }

  // ---------------------------------------------------------------------------------------------------------- the cloud
  // a heap of cloud: pale on top, shaded lavender underneath, its underside lit orange by the fire below it
  function puff(c, x, y, rd, warm, seed) {
    const r = rng(seed), blobs = [];
    for (let i = 0; i < 7; i++) { const a = r() * TAU, d = r() * rd * 0.7; blobs.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, r: rd * (0.34 + r() * 0.3) }); }
    for (const b of blobs) { ellipse(c, b.x, b.y + b.r * 0.2, b.r * 1.2, b.r * 0.86, 0, rgba('#ff8a46', 0.5 * warm)); }
    for (const b of blobs) {
      const g = c.createLinearGradient(0, b.y - b.r, 0, b.y + b.r); g.addColorStop(0, '#f2f3fc'); g.addColorStop(0.55, '#c9c9e0'); g.addColorStop(1, mixHex('#9d93bb', '#e8a07c', warm * 0.5));
      ellipse(c, b.x, b.y, b.r * 1.2, b.r * 0.86, 0, g);
    }
    for (const b of blobs) glow(c, b.x - b.r * 0.25, b.y - b.r * 0.35, b.r * 0.6, '#ffffff', 0.4);
  }
  function buildSky(c, bx, by) {
    const r = rng(3401), R = ARENA.r;
    // ---- far above: night with stars at the top, the falling meteor's burning surface filling the bottom
    const g0 = c.createLinearGradient(0, -by, 0, by); g0.addColorStop(0, '#05061a'); g0.addColorStop(0.32, '#0c0b26'); g0.addColorStop(0.55, '#3a1424'); g0.addColorStop(0.78, '#a63c1a'); g0.addColorStop(1, '#f07a2a');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 260; i++) { const y = -by + Math.pow(r(), 1.6) * by * 1.1; circle(c, (r() * 2 - 1) * bx, y, 0.4 + r() * 1.1, rgba(r() < 0.8 ? '#f0f2ff' : '#ffe2c0', 0.15 + r() * 0.5)); }
    for (let i = 0; i < 18; i++) twinkle(c, (r() * 2 - 1) * bx, -by + r() * by * 0.8, 3 + r() * 4, 0.3 + r() * 0.4);
    // the crust of the meteor below: dark plates, white-orange fire between them, more of it the lower down
    for (let i = 0; i < 260; i++) {
      const x = (r() * 2 - 1) * bx * 1.1, y = by * (-0.15 + r() * 1.2), s = 22 + r() * 70, heat = clamp((y + by * 0.15) / (by * 1.2), 0, 1), pts = [], q0 = r() * TAU;
      for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.7; pts.push(x + Math.cos(q) * s, y + Math.sin(q) * s * 0.62); }
      poly(c, pts, `rgba(${30 + 30 * (1 - heat) | 0},${10 + 10 * (1 - heat) | 0},${14 + 8 * (1 - heat) | 0},${0.3 + 0.4 * r()})`, rgba('#ffb25a', 0.15 + 0.5 * heat * r()), 1.6 + 1.6 * heat);
    }
    for (let i = 0; i < 70; i++) glow(c, (r() * 2 - 1) * bx, by * (0.1 + r() * 0.95), 90 + r() * 200, r() < 0.5 ? '#ff8a2a' : '#ffd070', 0.12 + r() * 0.18);
    glow(c, 0, by * 0.9, bx * 0.9, '#ffb060', 0.28);
    // ---- the cloud sea round the room: banks of it, thick low round the rim and lit orange from below
    const banks = [];
    for (let i = 0; i < 120; i++) {
      const a = r() * TAU, d = R * (0.99 + Math.pow(r(), 0.9) * 0.7), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.98;
      if (Math.abs(x) > bx + 40 || Math.abs(y) > by + 40) continue;
      banks.push({ x, y, rd: 50 + r() * 90, warm: clamp(0.3 + (y / by) * 0.5 + r() * 0.3, 0.2, 1) });
    }
    banks.sort((p, q) => p.y - q.y);
    banks.forEach((b, i) => puff(c, b.x, b.y, b.rd, b.warm, 500 + i));
    // ---- the room: a disc of pale cloud-stone, gold lines etched in it, lit warm along its underside
    c.save(); ARENA.trace(c, 0); c.clip();
    const sg = c.createRadialGradient(0, -40, 30, 0, 0, R); sg.addColorStop(0, '#c0c4dc'); sg.addColorStop(0.6, '#a0a5c6'); sg.addColorStop(1, '#7c8098');
    c.fillStyle = sg; c.fillRect(-R, -R, R * 2, R * 2);
    for (let i = 0; i < 70; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; glow(c, Math.cos(a) * d, Math.sin(a) * d, 40 + r() * 90, r() < 0.5 ? '#ffffff' : '#7a7fa4', 0.14 + r() * 0.12); }
    for (const [ra, rb, n, off] of [[40, 150, 9, 0], [150, 330, 18, 0.5], [330, R - 30, 30, 0.2], [R - 30, R + 4, 54, 0.6]]) {   // rings of cut stone, the seams staggered from ring to ring
      for (let k = 0; k < n; k++) {
        const a0 = (k + off) * TAU / n, a1 = (k + 1 + off) * TAU / n, v = r();
        c.beginPath(); c.arc(0, 0, rb, a0, a1); c.arc(0, 0, ra, a1, a0, true); c.closePath();
        c.fillStyle = v < 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.08})` : `rgba(40,44,84,${0.04 + r() * 0.1})`; c.fill();
        c.strokeStyle = 'rgba(52,54,96,0.34)'; c.lineWidth = 1.4; c.stroke();
        c.beginPath(); c.arc(0, 0, rb - 1.5, a0 + 0.004, a1 - 0.004); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.stroke();
      }
    }
    for (const rr of [R - 30, 330, 150]) {   // the gold circles of the painted floor
      c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.strokeStyle = 'rgba(150,118,52,0.5)'; c.lineWidth = 3.4; c.stroke(); c.strokeStyle = 'rgba(255,226,150,0.55)'; c.lineWidth = 1.2; c.stroke();
    }
    for (let i = 0; i < 48; i++) { const a = i * TAU / 48, r0 = R - 30; line(c, Math.cos(a) * (r0 - 8), Math.sin(a) * (r0 - 8), Math.cos(a) * (r0 + 8), Math.sin(a) * (r0 + 8), 'rgba(200,160,70,0.5)', 1.4); }
    c.beginPath(); for (let i = 0; i <= 12; i++) { const a = i * TAU / 12 + 0.2; const x = Math.cos(a) * 330, y = Math.sin(a) * 330; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.strokeStyle = 'rgba(200,160,70,0.28)'; c.lineWidth = 1.3; c.stroke();
    for (let i = 0; i < 3000; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.0, r() < 0.5 ? `rgba(70,74,110,${0.08 + r() * 0.14})` : `rgba(255,255,255,${0.08 + r() * 0.2})`); }
    const under = c.createRadialGradient(0, 0, R * 0.55, 0, 0, R); under.addColorStop(0, 'rgba(255,150,70,0)'); under.addColorStop(0.8, 'rgba(255,140,60,0.2)'); under.addColorStop(1, 'rgba(255,120,40,0.5)');
    c.fillStyle = under; c.fillRect(-R, -R, R * 2, R * 2);
    glow(c, 0, R * 0.55, R * 0.9, '#ff9a4a', 0.2);   // the fire under the far, lower side of it
    c.restore();
    // the edge of the stone: a pale lip over the cloud, warm underneath
    c.beginPath(); c.arc(0, 0, R + 4, 0, TAU); c.strokeStyle = 'rgba(44,34,56,0.85)'; c.lineWidth = 12; c.stroke();
    c.beginPath(); c.arc(0, 0, R - 1, 0, TAU); c.strokeStyle = 'rgba(255,236,196,0.8)'; c.lineWidth = 2.4; c.stroke();
    c.beginPath(); c.arc(0, 0, R + 5, 0.1, Math.PI - 0.1); c.strokeStyle = 'rgba(255,140,60,0.55)'; c.lineWidth = 4; c.stroke();
    // cloud spilling over the lip in a few places
    for (let i = 0; i < 12; i++) { const a = r() * TAU; puff(c, Math.cos(a) * (R + 22), Math.sin(a) * (R + 22), 34 + r() * 34, 0.8, 900 + i); }
    ArenaView.amb = {
      kind: 'skyring',
      drift: Array.from({ length: 22 }, () => { const a = r() * TAU, d = R * (1.0 + r() * 0.65); return { a, d, w: 40 + r() * 90, sp: (r() < 0.5 ? -1 : 1) * (0.012 + r() * 0.02), ph: r() * 9 }; }),
      wisps: Array.from({ length: 9 }, () => ({ y: r(), x: r(), w: 160 + r() * 260, sp: 6 + r() * 14, ph: r() * 9 })),
      embers: Array.from({ length: 40 }, () => ({ x: (r() * 2 - 1) * (R + 200), ph: r() * 9, sp: 0.04 + r() * 0.08, s: 0.8 + r() * 1.3 })),
      stars: Array.from({ length: 26 }, () => ({ x: (r() * 2 - 1) * bx, y: -by + r() * by * 0.7, ph: r() * 9, s: 2 + r() * 3 })),
      bx, by,
    };
  }
  function skyLife(ctx, a, t) {
    const R = ARENA.r;
    // stars twinkling far out at the top
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of a.stars) { const q = 0.5 + 0.5 * Math.sin(t * 1.3 + s.ph); if (q > 0.3) { ctx.strokeStyle = rgba('#ffffff', 0.5 * q); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(s.x - s.s * q, s.y); ctx.lineTo(s.x + s.s * q, s.y); ctx.moveTo(s.x, s.y - s.s * q); ctx.lineTo(s.x, s.y + s.s * q); ctx.stroke(); } }
    // the fire below flickering up through the cloud: warm light welling along the rim, brightest on the lower side
    const fl = 0.85 + 0.15 * Math.sin(t * 2.3) + 0.08 * Math.sin(t * 5.1 + 1);
    for (let i = 0; i < 12; i++) { const an = i * TAU / 12 + t * 0.03, lo = 0.5 + 0.5 * Math.sin(an); glow(ctx, Math.cos(an) * (R + 40), Math.sin(an) * (R + 40), 120 + 40 * Math.sin(t * 1.4 + i), '#ff8a3a', (0.05 + 0.1 * lo) * fl * (0.8 + 0.2 * Math.sin(t * 1.9 + i * 2))); }
    glow(ctx, 0, R * 0.7, R * 0.8, '#ff9a4a', 0.05 * fl);
    // embers rising out of the fire, past the rim
    for (const e of a.embers) { const q = (t * e.sp + e.ph) % 1, x = e.x + Math.sin(t * 0.6 + e.ph * 7) * 14, y = a.by * 1.1 - q * a.by * 1.8; if (Math.hypot(x, y) > R + 10) circle(ctx, x, y, e.s * (1 - q * 0.5), rgba(q < 0.5 ? '#ffb060' : '#ffe2b0', 0.7 * Math.sin(q * Math.PI))); }
    ctx.restore();
    // cloud drifting round the rim, and low mist crossing the stone
    for (const d of a.drift) {
      const an = d.a + t * d.sp, x = Math.cos(an) * d.d, y = Math.sin(an) * d.d;
      ctx.save(); ctx.globalAlpha *= 0.55; glow(ctx, x, y + d.w * 0.2, d.w, '#ff9a5a', 0.18); glow(ctx, x, y, d.w, '#dcdff2', 0.4); ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ARENA.trace(ctx, 0); ctx.clip();
    for (const w of a.wisps) { const x = ((w.x * 2 * R + t * w.sp) % (2 * R + w.w * 2) + 2 * R + w.w * 2) % (2 * R + w.w * 2) - R - w.w, y = (w.y * 2 - 1) * R * 0.92 + Math.sin(t * 0.15 + w.ph) * 14; ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22); glow(ctx, 0, 0, w.w, '#ffffff', 0.12); ctx.restore(); }
    ctx.restore();
  }

  return { body, blade, halo, starCore, starShard, shardRubble, buildStarCrater, starCraterLife, buildSky, skyLife };
})();

BOSS_ART.caelum = CL_ART.body;
ArenaView.starCore = CL_ART.starCore;
ArenaView.starShard = CL_ART.starShard;
ArenaView.shardRubble = CL_ART.shardRubble;
ArenaView.buildStarCrater = CL_ART.buildStarCrater;
ArenaView.starCraterLife = CL_ART.starCraterLife;
ArenaView.buildSky = CL_ART.buildSky;
ArenaView.skyLife = CL_ART.skyLife;
