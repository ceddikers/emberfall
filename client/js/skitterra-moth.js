// Queen Skitterra's second form, the Moth Queen (Hard, after the Chrysalis: skitterra.js, raid.form 'moth'): her body, and the dust she sheds.
// Drawn in code like every boss: facing +x, wings out to either side, seen from above. The body is drawn from bosses.js (BOSS_ART.skitterra, when
// props.moth is set); everything else here is called from boss-vfx.js (the cocoon, the burst, the casts), skitterra-fx.js (the moves' landings),
// boss-tells.js (the floor under the moves) and main.js (the form moment).
//   props read by body(): moth (this form), mothU 0..1 (the wings unfurling after the burst; absent: fully open), mothFury (the +100% pull:
//     the glow, the eyespots and the dust turn red), wingbeat (Scale Wave: huge slow beats), flight (Flutter: swept back, fast, a trail of dust),
//     moonlight (wings spread flat and pale), rear/venom/silk (the spider's old poses: wings lift a little, nothing more).
// Nothing here paints floor: the telegraphs are the engine's.

const SK_MOTH = (() => {
  const PI = Math.PI, TAU = Math.PI * 2;
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const COL = { cream: '#f2e6cc', plum: '#2a1740', violet: '#5b2f8c', lilac: '#a86be0', gold: '#e8c15a', rose: '#d6304a', fur: '#8f7dab', furHi: '#cbbde0', dark: '#241430' };

  // a scalloped edge from (x0, y0) to (x1, y1): n round bumps bulging to the side the normal points to
  function scallops(ctx, x0, y0, x1, y1, n, bulge) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L;
    for (let i = 0; i < n; i++) {
      const ax = x0 + dx * (i + 1) / n, ay = y0 + dy * (i + 1) / n, mx = x0 + dx * (i + 0.5) / n, my = y0 + dy * (i + 0.5) / n;
      ctx.quadraticCurveTo(mx + nx * bulge, my + ny * bulge, ax, ay);
    }
  }
  // one wing's outline, a right wing: x along the body, y outward
  function wingPath(ctx, kind) {
    ctx.beginPath();
    if (kind === 'fore') {
      ctx.moveTo(3, 4);
      ctx.bezierCurveTo(30, 22, 38, 70, 22, 112);
      ctx.bezierCurveTo(16, 128, -2, 132, -16, 118);
      scallops(ctx, -16, 118, -44, 38, 5, 8);
      ctx.bezierCurveTo(-40, 20, -24, 8, -6, 4);
    } else {
      ctx.moveTo(-8, 8);
      ctx.bezierCurveTo(10, 22, 14, 64, -2, 92);
      ctx.bezierCurveTo(-8, 104, -22, 108, -34, 100);
      ctx.bezierCurveTo(-52, 104, -78, 118, -106, 134);   // the tail: a long streamer off the hindwing, curving out, a paddle at its end
      ctx.bezierCurveTo(-104, 120, -92, 108, -74, 98);
      scallops(ctx, -74, 98, -80, 38, 4, 8);
      ctx.bezierCurveTo(-64, 20, -40, 10, -16, 8);
    }
    ctx.closePath();
  }
  function eyespot(ctx, x, y, r, o) {
    const fury = o.fury, k = o.glow;
    glow(ctx, x, y, r * 2.4, fury ? '#ff5a2a' : '#ffd070', (0.25 + 0.3 * k) * (0.85 + 0.15 * Math.sin(o.t * 5 + x)));
    circle(ctx, x, y, r, COL.cream, OUT, 2);
    circle(ctx, x, y, r * 0.74, COL.dark);
    circle(ctx, x, y, r * 0.58, fury ? '#ff8a2a' : COL.gold);
    circle(ctx, x, y, r * 0.34, fury ? '#ff2a1a' : COL.rose);
    circle(ctx, x - r * 0.16, y - r * 0.16, r * 0.12, 'rgba(255,255,255,0.9)');
  }
  // a wing, drawn for the right side and mirrored. o: { m: how much of its span shows (a beat foreshortens it), sweep: swept back (rad), t, glow, fury, pale }
  function wing(ctx, side, kind, o) {
    const fore = kind === 'fore';
    ctx.save();
    ctx.translate(fore ? 3 : -3, side * (fore ? 6 : 7));
    ctx.scale(1, side);
    ctx.rotate(o.sweep * (fore ? 1 : 1.25));
    ctx.scale(1, Math.max(0.06, o.m));
    wingPath(ctx, kind);
    const span = fore ? 130 : 112;
    const g = ctx.createLinearGradient(0, 0, 0, span);
    const edge = o.fury ? (fore ? '#c0408a' : '#ff9a7a') : o.pale ? (fore ? '#cfd8ff' : '#e8e0ff') : (fore ? COL.lilac : '#e07ac0'), mid = o.fury ? (fore ? '#7a2468' : '#a02a50') : o.pale ? (fore ? '#8d86e0' : '#a690e0') : (fore ? COL.violet : '#8a2f88');
    g.addColorStop(0, COL.plum); g.addColorStop(0.45, mid); g.addColorStop(1, edge);
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    // veins: fanning out from the root to the scallops
    ctx.lineCap = 'round';
    const tips = fore ? [[22, 112], [4, 128], [-14, 118], [-30, 88], [-40, 62], [-44, 38]] : [[-6, 96], [-30, 108], [-60, 112], [-70, 90], [-78, 56], [-72, 34]];
    ctx.strokeStyle = 'rgba(240,226,255,0.32)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); for (const [x, y] of tips) { ctx.moveTo(fore ? 2 : -4, 4); ctx.quadraticCurveTo(x * 0.5, y * 0.45, x, y); } ctx.stroke();
    // dust on the wing: pale specks that twinkle
    for (let i = 0; i < (fore ? 26 : 18); i++) {
      const px = lerp(fore ? -42 : -70, fore ? 18 : 6, rnd(i + (fore ? 0 : 40))), py = lerp(14, span - 8, rnd(i + 7 + (fore ? 0 : 40)));
      const tw = 0.35 + 0.65 * Math.max(0, Math.sin(o.t * (1.5 + rnd(i) * 2.5) + i * 2.3));
      ctx.globalAlpha = 0.5 * tw * (0.4 + 0.6 * o.glow); ctx.fillStyle = o.fury ? '#ffd0b0' : '#fff6e0';
      ctx.beginPath(); ctx.arc(px, py, 0.8 + rnd(i + 3) * 1.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the pale band along the whole edge, and a darker line inside it
    wingPath(ctx, kind);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.fury ? '#ffd9c0' : COL.cream; ctx.lineWidth = o.ghost ? 5 : 12; ctx.stroke();
    ctx.strokeStyle = 'rgba(36,20,48,0.75)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // a fringe of fine barbs along the trailing edge
    if (!o.ghost) {
      const e = fore ? [-16, 118, -44, 38] : [-74, 98, -80, 38], dx = e[2] - e[0], dy = e[3] - e[1], L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const k = i / 16, x = e[0] + dx * k, y = e[1] + dy * k, len = 7 + 6 * rnd(i + 70) + (i % 4 === 2 ? 5 : 0), sw = (rnd(i + 90) - 0.5) * 0.5;
        ctx.moveTo(x, y); ctx.lineTo(x + (nx + ny * sw) * len, y + (ny - nx * sw) * len);
      }
      ctx.strokeStyle = o.fury ? 'rgba(255,214,190,0.75)' : 'rgba(242,230,204,0.75)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.stroke();
    }
    // the eyespot (kept out of the clip so its glow can spill)
    if (!o.ghost) { if (fore) eyespot(ctx, -4, 80, 17, o); else eyespot(ctx, -44, 66, 12, o); }
    wingPath(ctx, kind); ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // a feathery (plumose) antenna: a curved stem and pale barbs down both sides, swaying
  function antenna(ctx, side, t, fury) {
    const sw = Math.sin(t * 2.2 + side) * 3;
    const P = [[26, side * 3], [44, side * (14 + sw * 0.4)], [60, side * (34 + sw)], [68, side * (54 + sw * 1.4)]];
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]);
    ctx.strokeStyle = OUT; ctx.lineWidth = 3.6; ctx.stroke(); ctx.strokeStyle = '#d8c8f0'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = fury ? 'rgba(255,200,170,0.85)' : 'rgba(236,224,255,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i <= 11; i++) {
      const u = i / 12, a = 1 - u, x = a * a * a * P[0][0] + 3 * a * a * u * P[1][0] + 3 * a * u * u * P[2][0] + u * u * u * P[3][0], y = a * a * a * P[0][1] + 3 * a * a * u * P[1][1] + 3 * a * u * u * P[2][1] + u * u * u * P[3][1];
      const L = 9 * (1 - u * 0.55);
      ctx.moveTo(x - L * 0.5, y - side * L * 0.45); ctx.lineTo(x, y); ctx.lineTo(x + L * 0.55, y - side * L * 0.1);
      ctx.moveTo(x, y); ctx.lineTo(x + L * 0.1, y + side * L);
    }
    ctx.stroke(); ctx.restore();
  }
  // fur: short tufts radiating from a point, over an ellipse
  function fur(ctx, cx, cy, rx, ry, n, len, col, seed) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rnd(seed + i) * TAU, d = Math.sqrt(rnd(seed + i + 50)) * 0.9, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * (ry / rx));
    }
    ctx.stroke(); ctx.restore();
  }

  // the Moth Queen, in the art's own frame (facing +x)
  function body(ctx, st) {
    const props = st.props || {}, t = st.t || 0;
    const fury = !!props.mothFury, u = props.mothU == null ? 1 : cl(props.mothU, 0, 1);
    const wingbeat = !!props.wingbeat, flight = !!props.flight, moon = !!props.moonlight;
    const lift = props.rear || props.venom || props.silk || props.haul ? 0.1 : 0;
    // how the wings are held: m is what shows of their span (a beat foreshortens them), sweep how far they are thrown back
    let freq = 2.4, amp = 0.2, sweep = 0.12, base = 0.8;
    if (wingbeat) { freq = 1.15; amp = 0.5; base = 0.55; sweep = 0.05; }
    else if (flight) { freq = 6.5; amp = 0.3; base = 0.66; sweep = 0.5; }
    else if (moon) { freq = 1.1; amp = 0.04; base = 1; sweep = 0.0; }
    else if (st.moving) { freq = 3.6; amp = 0.26; base = 0.72; sweep = 0.2; }
    const ph = t * freq * TAU;
    const m = cl((base + amp * Math.cos(ph) + lift) * (0.12 + 0.88 * eo(u)), 0.05, 1.05);
    const sw = sweep + (1 - eo(u)) * 1.15;   // (just out of the cocoon the wings are crumpled back along her)
    const glowK = moon ? 1 : wingbeat ? 0.8 : 0.35 + 0.15 * Math.sin(t * 2);
    const o = { m, sweep: sw, t, glow: glowK, fury, pale: moon };
    const o2 = Object.assign({}, o, { m: cl((base + amp * Math.cos(ph - 0.9) + lift) * (0.12 + 0.88 * eo(u)), 0.05, 1.05) });   // (the hindwings a beat behind)
    ctx.scale(1.12, 1.12);   // (a moth-queen is bigger than the spider was: the wings carry her to about 340 px across in the raid)
    // her shadow on the web beneath: she hangs over it
    ellipse(ctx, 8, 14, 74, 34, 0, 'rgba(0,0,0,0.22)');
    // the light she carries
    glow(ctx, 0, 0, moon ? 190 : 150, fury ? '#ff4a2a' : moon ? '#d8e4ff' : '#b070ff', (moon ? 0.34 : 0.16) + (wingbeat ? 0.12 : 0) + (fury ? 0.1 : 0));
    // flying: a trail of dust and a smear of light streaming back
    if (flight) {
      for (let i = 0; i < 9; i++) {
        const q = (t * 1.9 + i / 9) % 1, y = (rnd(i + 11) - 0.5) * 120, x = -60 - q * 190;
        line(ctx, x, y, x - 34 - 30 * q, y * (1 + q * 0.3), `rgba(${fury ? '255,190,150' : '236,220,255'},${0.6 * (1 - q)})`, 2 + 2 * (1 - q));
      }
      glow(ctx, -70, 0, 120, fury ? '#ff6a3a' : '#c8a0ff', 0.28);
    }
    // two ghosts of the beat while she flies
    const ghosts = flight ? [[1.0, 0.28], [-1.0, 0.2]] : [];
    for (const [dp, a] of ghosts) {
      ctx.save(); ctx.globalAlpha = a;
      const og = Object.assign({}, o, { ghost: true, m: cl(base + amp * Math.cos(ph + dp * 3), 0.05, 1.05) });
      for (const s of [-1, 1]) wing(ctx, s, 'fore', og);
      ctx.restore();
    }
    // legs, tucked: two forelegs reaching, the rest under the wings
    for (const s of [-1, 1]) { limb(ctx, [14, s * 6, 24, s * 12, 32, s * 11], '#4a3358', 3); limb(ctx, [2, s * 8, 6, s * 20, 2, s * 28], '#4a3358', 3); }
    // the hindwings, then the forewings over them
    for (const s of [-1, 1]) wing(ctx, s, 'hind', o2);
    // the abdomen: banded, furred, a tuft at the tip
    ellipse(ctx, -34, 0, 31, 15.5, 0, '#6b5880', OUT, 3);
    for (let i = 0; i < 5; i++) { const x = -48 + i * 8, h = 13 - Math.abs(i - 2) * 1.6; ctx.beginPath(); ctx.ellipse(x, 0, 3, h, 0, 0, TAU); ctx.strokeStyle = 'rgba(40,24,56,0.55)'; ctx.lineWidth = 1.6; ctx.stroke(); }
    ellipse(ctx, -36, -4, 22, 6, 0, 'rgba(220,206,240,0.28)');
    fur(ctx, -34, 0, 30, 14, 26, 5, 'rgba(210,196,232,0.55)', 100);
    for (let i = -1; i <= 1; i++) line(ctx, -62, i * 4, -73, i * 7, '#a896c4', 3);
    for (const s of [-1, 1]) wing(ctx, s, 'fore', o);
    // thorax: a plush ball of fur with a pale collar
    ellipse(ctx, -2, 0, 18, 16, 0, COL.fur, OUT, 3);
    ellipse(ctx, -4, -4, 11, 8, 0, 'rgba(236,226,250,0.3)');
    fur(ctx, -2, 0, 17, 15, 34, 5, COL.furHi, 200);
    fur(ctx, 12, 0, 8, 12, 16, 4, '#efe6fa', 300);
    // head: dark, two great eyes catching the light, the feathered antennae
    for (const s of [-1, 1]) antenna(ctx, s, t, fury);
    circle(ctx, 22, 0, 9.5, COL.dark, OUT, 2.5);
    for (const s of [-1, 1]) {
      ellipse(ctx, 25, s * 6, 5.6, 4.6, s * 0.3, fury ? '#ff5a2a' : '#ff3a5a', OUT, 1.4);
      ellipse(ctx, 23.6, s * 7, 2, 1.3, s * 0.3, 'rgba(255,255,255,0.8)');
    }
    glow(ctx, 25, 0, 14, fury ? '#ff6a2a' : '#ff3a5a', 0.4);
    // the dust she sheds as she goes: a few motes drifting off the wing edges
    const n = wingbeat ? 14 : 6;
    for (let i = 0; i < n; i++) {
      const q = (t * (wingbeat ? 1.1 : 0.5) + i / n) % 1, s = i % 2 ? 1 : -1, bx = lerp(-40, 6, rnd(i + 5)), by = s * (30 + rnd(i + 9) * 90);
      ctx.globalAlpha = Math.sin(q * PI) * (wingbeat ? 0.85 : 0.55); ctx.fillStyle = fury ? '#ffc09a' : '#fff0d8';
      ctx.beginPath(); ctx.arc(bx + Math.sin(q * 6 + i) * 6, by + s * q * 26, 1.2 + rnd(i) * 1.6, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const eo = k => 1 - (1 - k) * (1 - k) * (1 - k);


  // ---------------------------------------------------------------- the Metamorphosis (called from boss-vfx.js chrysalis / cocoonEnd)
  // The cocoon's cracks: p 0..1 over the Chrysalis cast (they creep out one after another), cr 0..1 once the check has been decided (they split open
  // and light pours out: pale gold if she was torn out, red if the cocoon closed on her). (x, cy): the cocoon's middle, R its radius, H its height.
  const CRACKS = Array.from({ length: 9 }, (_, i) => ({ a: -PI / 2 + (i - 4) * 0.55 + (rnd(i + 400) - 0.5) * 0.3, off: rnd(i + 410), j: rnd(i + 420) }));
  function cocoonCracks(c, x, cy, R, H, p, cr, t, ok) {
    const warm = ok === false ? '#ff6a3a' : '#fff0c8', hot = ok === false ? '#ff2a1a' : '#ffffff';
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    CRACKS.forEach((k, i) => {
      const grow = cl((p - 0.12 - i * 0.07) * 2.4 + cr * 1.6, 0, 1);
      if (grow <= 0) return;
      const pts = [], n = 7;
      for (let s = 0; s <= n; s++) {
        const u = s / n * grow, d = 0.15 + u * 0.95, a = k.a + Math.sin(s * 2.1 + i) * 0.16 * (1 + k.j);
        pts.push([x + Math.cos(a) * R * d * 0.9, cy + Math.sin(a) * H * d * 0.95]);
      }
      const path = () => { c.beginPath(); pts.forEach(([px, py], s) => (s ? c.lineTo(px, py) : c.moveTo(px, py))); };
      path(); c.strokeStyle = 'rgba(24,12,32,0.9)'; c.lineWidth = 3 + 4 * cr; c.stroke();
      const pul = 0.55 + 0.45 * Math.sin(t * (4 + 10 * p) + i * 1.7);
      path(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = warm; c.globalAlpha = Math.min(1, (0.25 + 0.55 * p) * pul + cr); c.lineWidth = 1.4 + 3.4 * cr; c.stroke();
      c.strokeStyle = hot; c.globalAlpha = Math.min(1, cr * 0.9); c.lineWidth = 1 + 1.4 * cr; c.stroke();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      if (cr > 0.15) { const [px, py] = pts[pts.length - 1]; VFX.glowAt(c, px, py, 30 + 50 * cr, warm, 0.6 * cr); }
    });
    c.restore();
    // what is inside is pressing out: light through the silk
    VFX.glowAt(c, x, cy, R * (0.9 + 0.9 * cr), warm, Math.min(1, 0.12 + 0.2 * p + 0.7 * cr) * (0.8 + 0.2 * Math.sin(t * 9)));
  }
  // motes of scale-dust: n flung from (x, y), the way they fly set by o { cols, speed, z, life, size }
  function dustSpray(x, y, n, o = {}) {
    const cols = o.cols || ['#fff6e0', '#e8d8ff', '#ffd890'];
    for (let i = 0; i < n; i++) {
      const a = o.a0 != null ? o.a0 + (Math.random() - 0.5) * (o.spread ?? TAU) : Math.random() * TAU, sp = (o.speed || 240) * (0.3 + Math.random() * 0.9);
      VFX.spawn({ x: x + (Math.random() - 0.5) * (o.r || 0), y: y + (Math.random() - 0.5) * (o.r || 0) * 0.7, z: o.z ?? 30 + Math.random() * 60, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, vz: (o.vz ?? 90) * (0.4 + Math.random()),
        g: o.g ?? 140, drag: 0.4, life: (o.life || 1.2) * (0.6 + Math.random() * 0.7), size: (o.size || 9) * (0.5 + Math.random()), size1: 1, kind: Math.random() < 0.55 ? 'star' : 'soft', color: cols[(Math.random() * cols.length) | 0], vr: (Math.random() - 0.5) * 6 });
    }
  }
  // the burst: the cocoon splits and she comes out. ok: she was torn out (pale gold, white); not ok: the cocoon closed on her and she tears out
  // of it herself (red, a harder shake). H: boss-vfx.js's { shockAt, shake, roomTint, cam }.
  function burst(b, ok, H) {
    const x = b.x, y = b.y - 34, fury = !ok;
    const cols = fury ? ['#ffb08a', '#ff6a3a', '#ffd0a0', '#ff3a2a', '#fff0e0'] : ['#fff6e0', '#e8d8ff', '#ffd890', '#ffffff', '#d8b8ff'];
    VFX.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = (1 - p) * (1 - p) * e.a;
      VFX.glowAt(c, x, y, 360 * (0.4 + 0.8 * easeOut(p)), fury ? '#ff6a3a' : '#f4e6ff', Math.min(1, 0.7 * k));
      VFX.glowAt(c, x, y, 150 * (0.6 + 0.6 * p), fury ? '#ffe0c0' : '#ffffff', Math.min(1, k * 0.85));
      // wing-shaped rays: the light throws out in the shape of what is coming out
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 * k; c.fillStyle = fury ? '#ff8a4a' : '#fff2d0';
      for (let i = 0; i < 4; i++) { const a = (i < 2 ? -1 : 1) * (PI / 2 + (i % 2 ? 0.5 : -0.5)) + PI / 2 * 0; c.save(); c.translate(x, y); c.rotate(a + PI / 2 * 0); c.beginPath(); c.moveTo(0, 0); c.lineTo(-18, -380 * easeOut(p)); c.lineTo(18, -380 * easeOut(p)); c.closePath(); c.fill(); c.restore(); }
      c.restore();
    } });
    H.shockAt(b.x, b.y, { r: 560, color: fury ? '#ff7a4a' : '#fff0d0', w: 9, dur: 0.9, flat: 1 });
    H.shockAt(b.x, b.y, { r: 340, color: fury ? '#ffb08a' : '#e8d8ff', w: 6, dur: 0.7, flat: 1, delay: 0.1 });
    if (fury) H.shockAt(b.x, b.y, { r: 460, color: '#a01020', w: 7, dur: 0.9, flat: 1, delay: 0.22 });
    H.shockAt(b.x, b.y, { r: 150, color: '#ffffff', w: 4, dur: 0.45, flat: 1, delay: 0.04 });
    dustSpray(x, y, fury ? 110 : 80, { cols, speed: fury ? 420 : 340, vz: 160, life: 1.7, size: 11, r: 60 });
    dustSpray(x, y - 20, 24, { cols, speed: 140, vz: 260, life: 2.2, size: 8, g: 60 });
    for (let i = 0; i < 18; i++) VFX.spawn({ x: x + (Math.random() - 0.5) * 120, y: y + (Math.random() - 0.5) * 90, z: 40, vx: (Math.random() - 0.5) * 360, vy: (Math.random() - 0.5) * 220, vz: 40 + Math.random() * 200, g: 320, life: 1, size: 14, color: '#ffffff', kind: 'feather', stretch: 1, vr: (Math.random() - 0.5) * 8 });
    H.shake(fury ? 17 : 11);
    H.roomTint(fury ? '#ff5a3a' : '#fff4e0', fury ? 0.34 : 0.26, 0.9);
    H.cam(0.09, 0.05, 0.6);
  }

  // ---------------------------------------------------------------- the moves' floor (called from boss-tells.js, over the engine's own red / blue)
  // Scale Wave. 'scalewave' is the ring outside the hub (dust rolls outward over it); 'scalewave2' the hub itself (dust runs back in over it).
  // Only ever drawn inside the danger area itself, never over the floor that is safe.
  function waveTell(ctx, tg, s, p, k, t) {
    const out = tg.tag === 'scalewave', R0 = out ? s.r2 : 0, R1 = out ? Math.min(s.r, 640) : s.r;
    ctx.save();
    ctx.beginPath(); ctx.arc(s.x, s.y, out ? 1600 : s.r, 0, TAU); if (out) ctx.arc(s.x, s.y, s.r2, 0, TAU, true);
    ctx.clip(out ? 'evenodd' : 'nonzero');
    ctx.globalCompositeOperation = 'lighter';
    const n = out ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const u = ((t * (out ? 0.34 : 0.5) + i / n) % 1), rr = out ? R0 + (R1 - R0) * u : R1 * (1 - u), a = k * Math.sin(u * PI) * (0.2 + 0.4 * p);
      ctx.globalAlpha = a; ctx.strokeStyle = '#f0e0ff'; ctx.lineWidth = 8 + 6 * (1 - u); ctx.setLineDash([2, 11]); ctx.lineDashOffset = -t * 30 * (out ? 1 : -1);
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, rr), 0, TAU); ctx.stroke();
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#ffd890'; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, rr), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  // Flutter: dust streaming down the lane, the way she will fly it
  function laneTell(ctx, tg, s, p, k, t) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), len = Math.min(s.len, 1300), hw = s.w / 2;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const u = (t * (0.5 + 0.4 * rnd(i)) + rnd(i + 5)) % 1, along = u * len, off = (rnd(i + 20) - 0.5) * 2 * hw * 0.85;
      const x = s.x + ca * along - sa * off, y = s.y + sa * along + ca * off, L = 26 + 30 * rnd(i + 9);
      ctx.globalAlpha = k * Math.sin(u * PI) * (0.2 + 0.35 * p); ctx.strokeStyle = i % 3 ? '#efe0ff' : '#ffd890'; ctx.lineWidth = 1.6 + rnd(i + 2) * 1.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ca * L, y + sa * L); ctx.stroke();
    }
    ctx.restore();
  }
  // Moonlight: a pale moon-glow on the circle everyone stands in (the blue rim is the engine's), motes drifting up through it, and the beam from above
  function moonTell(ctx, tg, s, p, k, t) {
    glow(ctx, s.x, s.y, s.r * 1.25, '#dfe8ff', (0.16 + 0.2 * p) * k);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const a = rnd(i + 60) * TAU + t * 0.25, d = Math.sqrt(rnd(i + 80)) * s.r * 0.9, q = (t * 0.5 + rnd(i + 3)) % 1;
      ctx.globalAlpha = k * Math.sin(q * PI) * 0.7; ctx.fillStyle = '#f4f8ff';
      ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9 - q * 26, 1.4 + rnd(i) * 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // a crescent, faint, in the middle
    ctx.save(); ctx.globalAlpha = (0.2 + 0.25 * p) * k; ctx.fillStyle = '#eef3ff';
    const R = Math.min(30, s.r * 0.3); ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.arc(s.x + R * 0.45, s.y - R * 0.1, R * 0.88, 0, TAU, true); ctx.fill('evenodd');
    ctx.restore();
  }
  function moonAir(ctx, tg, s, p, k, t) {
    const top = s.y - 760, bot = s.y - 10;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(223,232,255,0)'); g.addColorStop(1, `rgba(223,232,255,${0.2 * k * (0.5 + 0.5 * p)})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(s.x - s.r * 0.78, top, s.r * 1.56, bot - top); ctx.restore();
  }
  // the dust Moonlight leaves on the floor (puddle tag 'scales', a hazard that ticks): a pale pool, glitter turning slowly in it, a rose rim
  function puddle(ctx, pd, r, k, t) {
    glow(ctx, pd.x, pd.y, r * 1.3, '#d8b8ff', 0.18 * k);
    ctx.save(); ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(pd.x, pd.y, r * 0.1, pd.x, pd.y, r);
    g.addColorStop(0, 'rgba(228,216,255,0.34)'); g.addColorStop(0.7, 'rgba(176,130,230,0.3)'); g.addColorStop(1, 'rgba(214,100,170,0.38)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pd.x, pd.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,210,0.8)'; ctx.lineWidth = 2.5; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 14; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = rnd(i + pd.id) * TAU + t * 0.15 * (i % 2 ? 1 : -1), d = Math.sqrt(rnd(i + 40 + pd.id)) * r * 0.92, tw = Math.max(0, Math.sin(t * (2 + rnd(i) * 3) + i * 1.9));
      ctx.globalAlpha = k * (0.15 + 0.85 * tw); ctx.fillStyle = i % 4 ? '#fff4e0' : '#ffd0f0';
      const x = pd.x + Math.cos(a) * d, y = pd.y + Math.sin(a) * d, z = 1 + 2.4 * tw;
      ctx.fillRect(x - z * 0.3, y - z, z * 0.6, z * 2); ctx.fillRect(x - z, y - z * 0.3, z * 2, z * 0.6);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the moves' landings (called from skitterra-fx.js impact(); H: its helpers)
  function waveFx(tg, H) {
    const s = tg.live || tg.shape, out = tg.tag === 'scalewave';
    const x = s.x, y = s.y, R0 = out ? s.r2 : 0, R1 = out ? 640 : s.r;
    VFX.fx({ dur: 0.9, layer: 'ground', draw: (c, p, t, e) => {
      const q = easeOut(p), rr = out ? R0 + (R1 - R0) * q : R1 * (1 - q * 0.96), k = e.a * (1 - p) * (1 - p) * 1.4;
      c.save(); ARENA.trace(c, 2); c.clip(); c.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 3; j++) {
        const rj = out ? rr - j * 22 : rr + j * 22; if (rj < 2) continue;
        c.globalAlpha = Math.min(1, k) * (1 - j * 0.3); c.strokeStyle = j ? '#e8d8ff' : '#fff6e0'; c.lineWidth = 10 - j * 3; c.setLineDash([2, 9]); c.lineDashOffset = -t * 60;
        c.beginPath(); c.arc(x, y, rj, 0, TAU); c.stroke();
      }
      c.setLineDash([]); c.globalAlpha = Math.min(1, k * 0.6); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, Math.max(1, rr), 0, TAU); c.stroke();
      c.restore();
    } });
    if (out) {
      for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, d = R0 + 20 + Math.random() * 200; dustSpray(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.75, 1, { a0: a, spread: 0.4, speed: 300, vz: 70, life: 1.1, size: 9 }); }
      H.shake(5);
    } else {
      for (let i = 0; i < 36; i++) { const a = Math.random() * TAU, d = Math.random() * R1; dustSpray(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.75, 1, { a0: a + PI, spread: 0.4, speed: 200, vz: 120, life: 0.9, size: 9 }); }
      H.after(0.3, () => { VFX.glint(x, y, { z: 20, size: 80, color: '#fff6e0' }); H.shockAt(x, y, { r: 120, color: '#fff0d0', w: 5, dur: 0.4, flat: 1 }); });
      H.shake(7);
    }
  }
  function flutterFx(tg, H) {
    const s = tg.live || tg.shape, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    let L = 0; while (L < 1300 && ARENA.sd(s.x + ca * L, s.y + sa * L) < -20) L += 20;
    if (L < 120) return;
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p), head = Math.min(L, L * easeOut(Math.min(1, p / 0.45)));
      c.save(); ARENA.trace(c, 2); c.clip();
      VFX.neonPath(c, '#fff0d8', 14 * (1 - p) + 2, Math.min(1, k * 0.9), () => { c.moveTo(s.x, s.y); c.lineTo(s.x + ca * head, s.y + sa * head); });
      c.restore();
    } });
    for (let i = 0; i < 46; i++) {
      const d = Math.random() * L, off = (Math.random() - 0.5) * s.w * 0.9;
      dustSpray(s.x + ca * d - sa * off, s.y + sa * d + ca * off, 1, { a0: s.angle, spread: 0.7, speed: 160 + d * 0.3, vz: 60, life: 1.0, size: 8, cols: ['#fff6e0', '#e8d8ff', '#ffd890'] });
    }
    H.shake(4);
  }
  function moonFx(tg, H) {
    const s = tg.live || tg.shape;
    VFX.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => { const k = (1 - p) * (1 - p) * e.a; VFX.glowAt(c, s.x, s.y, s.r * (1.2 + p), '#e8f0ff', Math.min(1, 0.9 * k)); VFX.glowAt(c, s.x, s.y, s.r * 0.5, '#ffffff', Math.min(1, k)); } });
    H.shockAt(s.x, s.y, { r: s.r + 50, color: '#dfe8ff', w: 6, dur: 0.6, flat: 1 });
    dustSpray(s.x, s.y, 40, { cols: ['#f4f8ff', '#dfe8ff', '#ffffff'], speed: 120, vz: 200, life: 1.6, size: 8, r: s.r });
    H.shake(4);
  }

  return { body, wing, COL, cocoonCracks, burst, dustSpray, waveTell, laneTell, moonTell, moonAir, puddle, waveFx, flutterFx, moonFx };
})();

if (typeof module !== 'undefined') module.exports = { SK_MOTH };
