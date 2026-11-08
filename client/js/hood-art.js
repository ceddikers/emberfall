// The Hollow Hood and the Six-Winged Seraph (boss ids hood, seraph): the bodies, the frost pillar and the coffin's base, drawn in code.
// Both are one figure in the set 3 style of caelum-art.js (an upright figure seen from above, facing handled by the ground rings): a long
// black coat trailing as smoke-dark tails, an empty hood (a dark oval with two frost-blue slits), silver chains at the collar, the hands
// low and dark at rest. The hands are the read: a thin pale blade slides out of the left sleeve pointing the way it faces, and the right
// palm opens on a soft white-blue disc. A frost ring on the floor under it and its hitbox ring, bright at the front. The Seraph adds three
// pairs of ash-black wings edged in pale gold (folded behind as a dark six-pointed shape; the one about to move lifts and brightens), a
// broken halo on the floor under it with six gaps that fill with frost, and a hover. Loaded after bosses.js and draw-util.js.
//
// st.props (hood-fx.js HD_FX.props sets them from the room's moments each frame; boss-vfx.js CAST_POSE sets hdStrike):
//   hdBlade 0..1      the blade out of the left sleeve          hdLight 0..1   the right palm opened
//   hdEyes 0..1       the slits' light (1 when absent; 0 on a copy)   hdShut 1   the eyes closed
//   hdHidden 1        the body is not drawn (copies stand in its place)
//   hdWing 0..6       wing n lifted and bright (1..6; pair n/2 rounded up); hdGaps 0..6 gaps of the halo filled with frost
//   hdHover 0..1      lifted off the floor                      hdOpen sec   seconds since the pull (-1 none): the hood lowers / the wings unfold
//   hdKneel 0..1      the kill: kneeling                        hdLie 0..1     the kill: lying down, the wings folded
//   hdStrike          held while Hollow Step swings (a swing also comes from st.action {type:'attack', t0, dur})
// window.__hdArtPreview(canvas, opts) draws a body onto any canvas (tools/preview/hood-art.html).

const HD_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const ease = q => q * q * (3 - 2 * q);
  const K = {
    ink: '#05040a', coat: '#0b0a12', coatM: '#161524', coatH: '#2a2d44', rim: '#5a86ad', frost: '#8fd3ff', frostH: '#dff3ff', frostD: '#3c6f98',
    silver: '#dfe6f0', silverM: '#a3adbd', silverD: '#5d6676', gold: '#d8b86a', goldD: '#7a6130', goldH: '#fff0c0', ash: '#15131b', ashM: '#25222d', ashH: '#3a3644',
  };
  const sm = (st, key, target, rate = 0.1) => { const v = st[key]; return (st[key] = v == null ? target : v + (target - v) * rate); };
  const add = (ctx, f) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; f(); ctx.restore(); };
  // where a swing is: strike 0 (gathering) .. 1 (the blow has landed), then rest
  function atk(st) {
    const a = st.action;
    if (!a || a.type !== 'attack') return { strike: 0, rest: 0, p: -1 };
    const p = (actT(st) - a.t0) / a.dur;
    if (p < 0.3) return { strike: 0, rest: 0, p };
    if (p < 0.55) return { strike: easeOut((p - 0.3) / 0.25), rest: 0, p };
    return { strike: 1, rest: p >= 1 ? 1 : easeOut((p - 0.55) / 0.45), p };
  }

  // ---------------------------------------------------------------------------------------------------------- the floor under it
  // the frost ring and the hitbox ring (bright at the front), flat on the ground; ang is the way it faces
  function rings(ctx, t, ang, seraph, lift) {
    const R = 54, cy = 36;
    ctx.save(); ctx.translate(0, cy); ctx.scale(1, 0.32);
    // a frost ring: a pale band with small crystals standing on it
    ctx.beginPath(); ctx.arc(0, 0, R + 9, 0, TAU); ctx.strokeStyle = rgba(K.frost, 0.16); ctx.lineWidth = 14; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R + 15, 0, TAU); ctx.strokeStyle = rgba(K.frostH, 0.2); ctx.lineWidth = 2.4; ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + t * 0.05, l = 6 + hash(i, 3) * 9, r0 = R + 10;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a + 0.03) * (r0 + l), Math.sin(a + 0.03) * (r0 + l));
      ctx.strokeStyle = rgba(K.frostH, 0.32); ctx.lineWidth = 2.2; ctx.stroke();
    }
    // the hitbox ring: faint all round, bright across the front
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.strokeStyle = rgba('#cfe6ff', 0.2); ctx.lineWidth = 3; ctx.stroke();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, R, ang - 0.85, ang + 0.85); ctx.strokeStyle = rgba('#ffffff', 0.5); ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R, ang - 0.5, ang + 0.5); ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = 3.2; ctx.stroke();
    ctx.restore();
    add(ctx, () => glow(ctx, 0, cy, 78, K.frost, 0.1 + 0.03 * Math.sin(t * 1.3)));
  }
  // the broken halo lying on the floor: a dim gold ring with six gaps; a filled gap burns frost
  function halo(ctx, t, gaps, hover) {
    const R = 74, cy = 36 + hover * 4;
    ctx.save(); ctx.translate(0, cy); ctx.scale(1, 0.32);
    const GAP = 0.3, SEG = TAU / 6;
    for (let i = 0; i < 6; i++) {
      const a0 = i * SEG + GAP / 2 - Math.PI / 2, a1 = (i + 1) * SEG - GAP / 2 - Math.PI / 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.strokeStyle = rgba(K.goldD, 0.75); ctx.lineWidth = 9; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R, a0 + 0.02, a1 - 0.02); ctx.strokeStyle = rgba(K.gold, 0.7 + 0.1 * Math.sin(t * 1.4 + i)); ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R, a0 + 0.06, a1 - 0.06); ctx.strokeStyle = rgba(K.goldH, 0.5); ctx.lineWidth = 1.4; ctx.stroke();
      // the gap that follows this piece
      const filled = i < gaps, g0 = a1 + 0.0, g1 = (i + 1) * SEG + GAP / 2 - Math.PI / 2;
      if (filled) {
        const f = 0.75 + 0.25 * Math.sin(t * 3 + i);
        ctx.beginPath(); ctx.arc(0, 0, R, g0 - 0.02, g1 + 0.02); ctx.strokeStyle = rgba(K.frost, 0.9 * f); ctx.lineWidth = 8; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R, g0, g1); ctx.strokeStyle = rgba('#ffffff', 0.85); ctx.lineWidth = 2.4; ctx.stroke();
      } else {   // a gap: the raw broken ends, a faint gold dust
        ctx.beginPath(); ctx.arc(0, 0, R, g0, g1); ctx.strokeStyle = rgba(K.gold, 0.1); ctx.lineWidth = 2; ctx.stroke();
      }
    }
    ctx.restore();
    add(ctx, () => { glow(ctx, 0, cy, 110, K.gold, 0.1); for (let i = 0; i < gaps; i++) { const a = (i + 1) * SEG - Math.PI / 2; glow(ctx, Math.cos(a) * R, cy + Math.sin(a) * R * 0.32, 20, K.frost, 0.4); } });
  }

  // ---------------------------------------------------------------------------------------------------------- the wings
  // three pairs behind the shoulders. Folded they read as a dark six-pointed shape: the first pair up and out, the second out, the third down
  // and out. wing i (0..5): pair i>>1, side i&1 (0 left). lift 0..1 raises one; spread 0..1 opens them all (the pull)
  const FOLD = [[-0.62, 98], [-1.52, 104], [-2.5, 92]];   // angle from straight up (radians), length, for the left wing of each pair
  // a wing is a fan of seven long feathers from the shoulder, the longest on the outer edge, each tipped in pale gold
  function wing(ctx, t, i, lift, spread, goldK) {
    const pair = i >> 1, side = i & 1 ? 1 : -1, [fa, fl] = FOLD[pair];
    const out = Math.abs(fa) + lift * 0.3 + spread * (0.4 + 0.12 * pair), len = (fl + lift * 16) * (1 + spread * 0.36);
    const ox = side * 8, oy = -76 + pair * 8, shiver = Math.sin(t * 1.7 + i * 1.3) * 0.02 * (1 + lift * 3);
    const base = Math.atan2(-Math.cos(side * out), Math.sin(side * out)) + shiver, fan = 0.14 * (1 + spread * 0.3);
    const eg = 0.55 + 0.4 * goldK * 0 + 0.45 * lift;
    for (let k = 0; k < 7; k++) {
      const d = (k - 3) * fan * side, a = base + d, e = Math.abs(k - 3);
      const L = len * (1 - 0.1 * e - (side * (k - 3) > 0 ? 0.06 : 0) * 1), w = 7.5 + (3 - e) * 0.9;
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, tx = ox + ux * L, ty = oy + uy * L;
      const g = ctx.createLinearGradient(ox, oy, tx, ty); g.addColorStop(0, K.ash); g.addColorStop(0.6, k % 2 ? K.ashM : K.ashH); g.addColorStop(1, K.ashM);
      poly(ctx, [ox + nx * 3, oy + ny * 3, ox + ux * L * 0.42 + nx * w, oy + uy * L * 0.42 + ny * w, ox + ux * L * 0.86 + nx * w * 0.55, oy + uy * L * 0.86 + ny * w * 0.55, tx, ty, ox + ux * L * 0.86 - nx * w * 0.55, oy + uy * L * 0.86 - ny * w * 0.55, ox + ux * L * 0.42 - nx * w, oy + uy * L * 0.42 - ny * w, ox - nx * 3, oy - ny * 3], g, K.ink, 1.8);
      line(ctx, ox + ux * L * 0.1, oy + uy * L * 0.1, ox + ux * L * 0.8, oy + uy * L * 0.8, rgba('#000000', 0.35), 1);   // the shaft
      // the gold tip, brightest on the outer feathers and on the wing about to move
      const gk = (0.55 + 0.45 * (e / 3)) * eg;
      ctx.save(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox + ux * L * 0.62 + nx * w * 0.8, oy + uy * L * 0.62 + ny * w * 0.8); ctx.lineTo(ox + ux * L * 0.86 + nx * w * 0.55, oy + uy * L * 0.86 + ny * w * 0.55); ctx.lineTo(tx, ty); ctx.lineTo(ox + ux * L * 0.86 - nx * w * 0.55, oy + uy * L * 0.86 - ny * w * 0.55); ctx.lineTo(ox + ux * L * 0.62 - nx * w * 0.8, oy + uy * L * 0.62 - ny * w * 0.8);
      ctx.strokeStyle = rgba(K.gold, gk); ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
      if (lift > 0.05 || spread > 0.05) add(ctx, () => glow(ctx, tx, ty, 12 + 12 * lift, K.gold, 0.1 + 0.3 * lift + 0.1 * spread));
    }
    const mx = ox + Math.cos(base) * len * 0.55, my = oy + Math.sin(base) * len * 0.55;
    add(ctx, () => { glow(ctx, mx, my, 40, K.gold, 0.04 + 0.2 * lift); if (lift > 0.3) for (let k = 0; k < 5; k++) { const q = (t * 0.7 + k / 5 + i * 0.13) % 1; circle(ctx, ox + Math.cos(base) * len * (0.45 + 0.55 * hash(k, i)) + (hash(k, 9) - 0.5) * 16, oy + Math.sin(base) * len * (0.45 + 0.55 * hash(k, i)) - q * 24, 1.3 * (1 - q), rgba(K.goldH, 0.8 * (1 - q) * lift)); } });
  }

  // ---------------------------------------------------------------------------------------------------------- the figure
  function tails(ctx, t, o) {
    // smoke-dark tails streaming behind: from the hem, trailing away from where it faces (more when it moves)
    const n = 7, HEM = 32;
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x0 = -36 + u * 72, L = (30 + hash(i, 4) * 26 + o.moving * 22) * (layer ? 0.7 : 1.1), sw = Math.sin(t * 1.4 + i * 1.2) * (4 + o.moving * 5);
        const dx = o.tx * (0.5 + 0.5 * hash(i, 6)) * (0.8 + o.moving * 1.2), tipx = x0 + dx + sw, tipy = HEM + L;
        ctx.beginPath(); ctx.moveTo(x0 - 7, HEM - 4);
        ctx.quadraticCurveTo(x0 + dx * 0.3 + sw * 0.4 - 4, HEM + L * 0.5, tipx, tipy);
        ctx.quadraticCurveTo(x0 + dx * 0.3 + sw * 0.4 + 6, HEM + L * 0.45, x0 + 7, HEM - 4); ctx.closePath();
        const g = ctx.createLinearGradient(0, HEM, 0, tipy); g.addColorStop(0, rgba(layer ? K.coatM : K.coat, 0.96)); g.addColorStop(1, rgba(K.coat, 0));
        ctx.fillStyle = g; ctx.fill();
      }
    }
  }
  function coat(ctx, t, o) {
    const sway = o.sway, HEM = 32;
    // the cape behind: wider and darker, its hem torn
    const back = [-12, -92, -26, -86, -33, -40, -42, 10];
    const N = 8;
    for (let i = 0; i <= N; i++) { const u = i / N; back.push(-44 + u * 88 + Math.sin(t * 1.2 + i) * sway * 0.5, HEM + 6 + (i % 2 ? 6 + hash(i, 11) * 8 : -3) + Math.sin(t * 1.5 + i * 0.9) * sway); }
    back.push(42, 10, 33, -40, 26, -86, 12, -92);
    poly(ctx, back, '#07060c', K.ink, 2.4);
    // the front: two panels with a slit between them
    for (const sx of [-1, 1]) {
      const pts = [sx * 3, -90, sx * 15, -92, sx * 24, -84, sx * 27, -50, sx * 31, -8];
      for (let i = 0; i <= 4; i++) { const u = i / 4; pts.push(sx * (37 - u * 33) + Math.sin(t * 1.7 + i * 1.3 + sx) * sway * 0.5, HEM + (i % 2 ? -2 + hash(i + sx, 12) * 4 : 6 + hash(i, 13) * 6) + Math.sin(t * 2 + i + sx * 2) * sway * 0.5); }
      pts.push(sx * 2, -10);
      const g = ctx.createLinearGradient(sx * 28, -80, sx * 3, 30); g.addColorStop(0, K.coatH); g.addColorStop(0.45, K.coatM); g.addColorStop(1, K.coat);
      poly(ctx, pts, g, K.ink, 2.4);
      ctx.save(); ctx.lineCap = 'round';
      line(ctx, sx * 4, -82, sx * 5, HEM - 10, rgba(K.rim, 0.28), 1.3);   // the lit edge of the slit
      line(ctx, sx * 20, -80, sx * 28, -20, rgba(K.rim, sx < 0 ? 0.5 : 0.22), 1.5);   // the rim light on its outer edge
      for (let k = 0; k < 3; k++) line(ctx, sx * (10 + k * 7), -60 + k * 4, sx * (13 + k * 8), HEM - 6 - k * 3, rgba('#000000', 0.35), 2.2);   // folds
      ctx.restore();
    }
    if (o.gold) { ctx.save(); ctx.lineCap = 'round'; for (const sx of [-1, 1]) line(ctx, sx * 4, -82, sx * 5, HEM - 10, rgba(K.gold, 0.3), 1.1); ctx.restore(); }
    // frost on the hem
    add(ctx, () => { for (let i = 0; i <= N; i += 1) circle(ctx, -42 + (i / N) * 84, HEM + 2 - (i % 2 ? 3 : 0), 1.1, rgba(K.frostH, 0.4 + 0.2 * Math.sin(t * 2 + i))); });
  }
  // the silver chains at the collar: two short strands with a ring at the end
  function chains(ctx, t, o) {
    for (const sx of [-1, 1]) {
      const sw = Math.sin(t * 1.6 + sx) * 2 + o.moving * Math.sin(t * 5 + sx) * 2, n = 7;
      let px = sx * 7, py = -88;
      for (let i = 1; i <= n; i++) {
        const u = i / n, x = sx * (7 + u * 6) + sw * u * u, y = -88 + u * 34;
        line(ctx, px, py, x, y, K.ink, 3.4);
        line(ctx, px, py, x, y, i % 2 ? K.silver : K.silverM, 1.8);
        px = x; py = y;
      }
      circle(ctx, px, py + 2, 3.4, null, K.silver, 1.6); circle(ctx, px, py + 2, 4.6, null, K.ink, 0.8);
      add(ctx, () => glow(ctx, px, py, 7, K.frostH, 0.25));
    }
  }
  // the hood: a dark oval with two frost-blue slits and nothing under it
  function head(ctx, t, o) {
    ctx.save(); ctx.translate(o.look * 1.6, o.bow); ctx.rotate(o.tilt);
    // the cowl: a peak, the cloth falling to the shoulders
    poly(ctx, [-17, -86, -15, -108, -9, -122, 1, -128, 10, -121, 16, -108, 18, -86, 8, -90, -8, -90], K.coatM, K.ink, 2.4);
    poly(ctx, [-6, -118, 1, -126, 8, -118, 2, -112], rgba(K.coatH, 0.55));
    line(ctx, -15, -106, -17, -86, rgba(K.rim, 0.45), 1.4);
    if (o.gold) line(ctx, -9, -121, 1, -128, rgba(K.gold, 0.6), 1.4);
    // the opening: nothing in it
    ellipse(ctx, o.look * 0.8, -103, 10.5, 14.5, 0, '#010103', K.ink, 2);
    const g = ctx.createRadialGradient(o.look * 0.8, -103, 2, o.look * 0.8, -103, 15); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,18,32,0.7)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(o.look * 0.8, -103, 10.5, 14.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(o.look * 0.8, -103, 10.5, 14.5, 0, Math.PI * 0.68, Math.PI * 1.45); ctx.strokeStyle = rgba(K.frostH, 0.42); ctx.lineWidth = 1.2; ctx.stroke();
    // the slits
    const lit = o.eyes * (o.shut ? 0 : 1);
    for (const sx of [-1, 1]) {
      const ex = o.look * 1.2 + sx * 4.3, ey = -104.5;
      if (o.shut) { line(ctx, ex - sx * 2.4, ey + 0.6, ex + sx * 2.4, ey + 0.6, rgba(K.frostD, 0.5 * o.eyes), 1); continue; }
      if (lit < 0.03) { line(ctx, ex - sx * 2.6, ey - 0.4, ex + sx * 2.6, ey + 0.6, rgba(K.frostD, 0.22), 1); continue; }
      ctx.beginPath(); ctx.moveTo(ex - sx * 3, ey + 0.8); ctx.lineTo(ex + sx * 3, ey - 1.1); ctx.lineTo(ex + sx * 2.4, ey + 0.9); ctx.closePath(); ctx.fillStyle = rgba(K.frostH, 0.5 + 0.5 * lit); ctx.fill();
      add(ctx, () => { glow(ctx, ex, ey, 5.5 + 3 * lit, K.frost, (0.25 + 0.35 * lit) * (0.88 + 0.12 * Math.sin(t * 2.4 + sx))); circle(ctx, ex, ey, 0.9, rgba('#ffffff', 0.9 * lit)); });
    }
    ctx.restore();
  }
  // a sleeve to the hand; the cuff a dark opening with a rim of frost
  function sleeve(ctx, sx, hx, hy, bend, o) {
    const shx = sx * 20, shy = -82, mx = (shx + hx) / 2 + sx * bend, my = (shy + hy) / 2 + 2;
    limb(ctx, [shx, shy, mx, my, hx, hy], K.coatM, 11);
    line(ctx, shx, shy, mx, my, rgba(K.rim, sx < 0 ? 0.4 : 0.2), 1.2);
    ellipse(ctx, hx, hy, 5.4, 4.2, 0, '#020208', K.ink, 1.6);
    ctx.beginPath(); ctx.ellipse(hx, hy, 5.4, 4.2, 0, Math.PI, TAU); ctx.strokeStyle = rgba(K.frostH, 0.4); ctx.lineWidth = 1; ctx.stroke();
  }
  // the thin pale blade, sliding out of the left sleeve: from (hx, hy) along ang, k out (0..1)
  function blade(ctx, t, hx, hy, ang, k) {
    if (k < 0.02) return;
    const len = 78 * ease(k), ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, fl = 0.86 + 0.14 * Math.sin(t * 6.1) * Math.sin(t * 2.3);
    const tx = hx + ux * len, ty = hy + uy * len;
    add(ctx, () => {
      glow(ctx, (hx + tx) / 2, (hy + ty) / 2, len * 0.62, K.frost, 0.2 * fl); glow(ctx, tx, ty, 18, K.frostH, 0.45 * fl);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.strokeStyle = rgba(K.frost, 0.3 * fl); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
    });
    poly(ctx, [hx + nx * 2.3, hy + ny * 2.3, tx - ux * 6 + nx * 1.2, ty - uy * 6 + ny * 1.2, tx, ty, tx - ux * 6 - nx * 0.8, ty - uy * 6 - ny * 0.8, hx - nx * 2.3, hy - ny * 2.3], '#f2faff', rgba(K.frostD, 0.8), 0.8);
    add(ctx, () => {
      line(ctx, hx, hy, tx, ty, rgba('#ffffff', 0.95), 1.1);
      for (let i = 0; i < 5; i++) { const q = (t * 0.55 + i / 5) % 1, al = (0.1 + 0.85 * hash(i, 2)) * len, off = (hash(i, 3) - 0.5) * 8; circle(ctx, hx + ux * al + nx * off, hy + uy * al + ny * off - q * 9, 0.7 + (1 - q) * 0.9, rgba(K.frostH, 0.8 * (1 - q) * k)); }
    });
  }
  // the right palm, opened: five short dark fingers fanned, a disc of soft white-blue light standing in it
  function palm(ctx, t, hx, hy, k) {
    if (k < 0.02) return;
    const fl = 0.88 + 0.12 * Math.sin(t * 3.1), r = 13 * k;
    for (let i = -2; i <= 2; i++) { const fa = -Math.PI / 2 + i * 0.42, fl2 = 8.5 * Math.min(1, k * 1.5); line(ctx, hx, hy, hx + Math.cos(fa) * fl2, hy + Math.sin(fa) * fl2, K.ink, 3.4); line(ctx, hx, hy, hx + Math.cos(fa) * fl2, hy + Math.sin(fa) * fl2, K.coatM, 1.9); }
    circle(ctx, hx, hy, 4.8, K.coatM, K.ink, 1.5);
    add(ctx, () => {
      glow(ctx, hx, hy - 8, 46 * k, K.frost, 0.3 * fl); glow(ctx, hx, hy - 8, 22 * k, K.frostH, 0.55 * fl);
      ctx.save(); ctx.translate(hx, hy - 8); ctx.scale(1, 0.5);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, rgba('#ffffff', 0.95 * fl)); g.addColorStop(0.6, rgba(K.frostH, 0.55)); g.addColorStop(1, rgba(K.frost, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.5 * k); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 6; i++) { const q = (t * 0.45 + i / 6) % 1, a = hash(i, 7) * TAU; circle(ctx, hx + Math.cos(a) * 9 * q, hy - 10 - q * 30, 1.2 * (1 - q), rgba(K.frostH, 0.8 * (1 - q) * k)); }
    });
  }

  // ---------------------------------------------------------------------------------------------------------- the body
  function body(ctx, st, angle = 0, seraph = false) {
    const pr = st.props || {}, t = st.t || 0, A = atk(st);
    if (pr.hdHidden) return;
    const fx = Math.cos(angle), fy = Math.sin(angle), moving = st.moving ? 1 : 0;
    const kS = A.strike * (1 - A.rest), swingK = pr.hdStrike ? Math.max(kS, 0.5) : kS;
    const open = pr.hdOpen == null ? -1 : pr.hdOpen;
    const kneel = pr.hdKneel || 0, lie = pr.hdLie || 0;
    const hover = sm(st, 'hdHv', pr.hdHover || 0, 0.12);
    const bl = pr.hdBlade || 0, lg = pr.hdLight || 0;
    const eyes = (pr.hdEyes == null ? 1 : pr.hdEyes) * (1 - clamp((kneel - 0.4) / 0.5, 0, 1)) * (1 - lie);
    // the opening: gate 1 the hood bows (the slits dark) and lifts; gate 2 the wings open wide and then fold to rest
    let bow = 0, openEyes = 1, spread = 0;
    if (open >= 0 && !seraph) { const u = clamp(open / 3, 0, 1); bow = u < 0.5 ? 9 * ease(u / 0.5) : 9 * (1 - ease(clamp((u - 0.5) / 0.35, 0, 1))); openEyes = clamp((u - 0.45) / 0.3, 0, 1); }
    if (open >= 0 && seraph) { const u = open; spread = u < 1.8 ? ease(u / 1.8) : u < 2.6 ? 1 : 1 - 0.85 * ease(clamp((u - 2.6) / 1.6, 0, 1)); }
    spread = Math.max(spread, 0) * (1 - lie);
    const eye = eyes * openEyes;
    // the face turns a little toward the way it goes
    if (st.hdLs == null) st.hdLs = 0;
    const look = sm(st, 'hdLs', clamp(fx, -1, 1), 0.1);
    const lean = fx * 9 * swingK + (moving ? fx * 3 : 0) + kneel * 4;
    const lift = -hover * 16 + kneel * 20 + Math.sin(t * 0.9) * (1.2 + hover * 2.4) * (1 - kneel);
    const tx = sm(st, 'hdTx', -fx * (7 + moving * 8), 0.06);
    const sway = 1.3 + moving * 2.2 + hover * 1.2;
    const goldK = seraph ? 1 : 0;
    ctx.save(); ctx.rotate(-angle);
    // ---- on the floor
    const hov = clamp(hover, 0, 1);
    ellipse(ctx, 0, 38, 46 - 14 * hov, 12 - 3 * hov, 0, rgba('#010208', 0.55 - 0.2 * hov));
    if (seraph) halo(ctx, t, pr.hdGaps | 0, hover);
    rings(ctx, t, angle, seraph, lift);
    if (seraph && open >= 0 && open < 2.6) add(ctx, () => { const q = clamp(open / 2.6, 0, 1); ctx.save(); ctx.translate(0, 36); ctx.scale(1, 0.32); ctx.beginPath(); ctx.arc(0, 0, 40 + q * 300, 0, TAU); ctx.strokeStyle = rgba(K.frostH, 0.6 * (1 - q)); ctx.lineWidth = 10 * (1 - q) + 2; ctx.stroke(); ctx.restore(); });
    if (!seraph && open >= 0 && open < 3) add(ctx, () => { const q = clamp(open / 3, 0, 1); ctx.save(); ctx.translate(0, 36); ctx.scale(1, 0.32); ctx.beginPath(); ctx.arc(0, 0, 30 + q * 220, 0, TAU); ctx.strokeStyle = rgba(K.frost, 0.5 * (1 - q)); ctx.lineWidth = 8 * (1 - q) + 2; ctx.stroke(); ctx.restore(); });
    // ---- the figure: leaning from the ground (a shear: the feet stay), lifted, kneeling, lying
    ctx.save();
    if (lie > 0) { ctx.translate(0, 34); ctx.rotate((fx >= 0 ? 1 : -1) * 1.38 * ease(lie)); ctx.translate(0, -34 + 4 * lie); }
    ctx.translate(0, lift);
    ctx.transform(1, 0, -lean / 130, 1 - kneel * 0.12, 0, 0);
    // the wings, behind everything
    if (seraph) {
      const wl = st.hdWl || (st.hdWl = [0, 0, 0, 0, 0, 0]), n = pr.hdWing | 0;
      for (let i = 0; i < 6; i++) { const target = n === i + 1 ? 1 : 0; wl[i] += (target - wl[i]) * (target > wl[i] ? 0.22 : 0.07); }
      const order = [2, 3, 4, 5, 0, 1];
      for (const i of order) wing(ctx, t, i, wl[i], spread, goldK);
    }
    add(ctx, () => glow(ctx, 0, -60, 80, seraph ? K.gold : K.frost, seraph ? 0.07 : 0.05));
    tails(ctx, t, { tx, moving });
    // the strike: a short swing of both sleeves forward and a pale arc through the air
    const hxL = -25 + fx * 15 * swingK, hyL = -37 + fy * 5 * swingK - 4 * swingK, hxR = 25 + fx * 15 * swingK, hyR = -37 + fy * 5 * swingK - 4 * swingK;
    coat(ctx, t, { sway, gold: seraph });
    // the off hand (the light), under the head
    const rx = 25 + fx * 15 * swingK + (lg > 0 ? 3 * lg : 0), ry = hyR - 9 * lg - 3 * kneel * 0;
    sleeve(ctx, 1, rx, ry, 5, {});
    palm(ctx, t, rx, ry, lg);
    chains(ctx, t, { moving });
    head(ctx, t, { look, bow: bow + kneel * 16, tilt: kneel * 0.14 * (fx >= 0 ? 1 : -1) + open * 0, eyes: eye, shut: !!pr.hdShut, gold: seraph });
    // the blade hand
    const bAng = Math.atan2(fy * 0.7 + 0.1, fx), bhx = hxL - 2 + bl * 4, bhy = hyL - 8 * bl;
    sleeve(ctx, -1, bhx, bhy, -5, {});
    blade(ctx, t, bhx + Math.cos(bAng) * 3, bhy + Math.sin(bAng) * 3, bAng, bl);
    if (swingK > 0.05) add(ctx, () => { ctx.beginPath(); ctx.arc(fx * 22, -44 + fy * 8, 44, angle - 0.9, angle + 0.9); ctx.strokeStyle = rgba(K.frostH, 0.6 * swingK); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.stroke(); });
    // the cold it breathes: motes falling off it
    add(ctx, () => { for (let i = 0; i < 8; i++) { const q = (t * 0.2 + hash(i, 20)) % 1, x = (hash(i, 21) - 0.5) * 72 + Math.sin(t + i * 2) * 3, y = -100 + q * 140; circle(ctx, x, y, 0.8 + hash(i, 22) * 0.7, rgba(K.frostH, 0.55 * Math.min(1, q * 4) * (1 - q))); } });
    ctx.restore();
    ctx.restore();
  }
  const hood = (ctx, st, angle = 0) => body(ctx, st, angle, false);
  const seraphBody = (ctx, st, angle = 0) => body(ctx, st, angle, true);

  // ---------------------------------------------------------------------------------------------------------- the frost pillar (prop `pillar`)
  // a tall shard of frost with a gold core, a shadow thrown across the floor. rise 0..1 is how far it has stood up.
  function pillar(ctx, pr, t, rise = 1) {
    const { x, y, r } = pr, k = ease(clamp(rise, 0, 1)), H = 132 * k, W = r * 0.62, seed = (pr.id | 0) * 7 + 3;
    ctx.save(); ctx.translate(x, y);
    ellipse(ctx, 10, 8, r * 1.5, r * 0.62, 0.0, rgba('#000008', 0.5));
    // the shadow it throws, long and thin
    poly(ctx, [-W * 0.5, 2, W * 0.5, 2, W * 0.5 + 66 * k, 24, W * 0.1 + 84 * k, 34], rgba('#000008', 0.3));
    // a skirt of frost round its foot
    ellipse(ctx, 0, 6, r * 1.15, r * 0.52, 0, rgba('#bfe8ff', 0.2), rgba('#eaf8ff', 0.4), 1.4);
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + hash(i, seed) * 0.3, l = 8 + hash(i, seed + 1) * 12; line(ctx, Math.cos(a) * r * 0.9, 6 + Math.sin(a) * r * 0.4, Math.cos(a) * (r * 0.9 + l), 6 + Math.sin(a) * (r * 0.4 + l * 0.4), rgba('#eaf8ff', 0.55), 2); }
    if (k < 0.02) { ctx.restore(); return; }
    // the shard: a six-sided spire seen from the front; a lit face, a shaded face, a cut top
    const tx = 3 * Math.sin(seed), mx = W * 0.82, tw = W * 0.34;
    poly(ctx, [-W, 3, -mx, -H * 0.58, -tw, -H * 0.9, tx, -H, 0, -H * 0.16, 0, 8], mixC('#a9d8f4', '#eaf8ff', 0.4), K.ink, 2);
    poly(ctx, [0, 8, 0, -H * 0.16, tx, -H, tw, -H * 0.9, mx, -H * 0.58, W, 3], mixC('#3e6f92', '#6aa4c8', 0.3), K.ink, 2);
    poly(ctx, [-mx, -H * 0.58, -tw, -H * 0.9, tx, -H, tx * 0.3, -H * 0.66], rgba('#ffffff', 0.5));   // the bevel of the top
    line(ctx, -W * 0.62, -H * 0.06, -W * 0.52, -H * 0.5, rgba('#ffffff', 0.55), 1.6);
    // two small shards leaning against its foot
    poly(ctx, [-W * 1.5, 6, -W * 1.2, -H * 0.2, -W * 0.9, 4], mixC('#8fc4e4', '#d6efff', 0.4), K.ink, 1.6);
    poly(ctx, [W * 0.95, 6, W * 1.25, -H * 0.15, W * 1.6, 6], mixC('#3e6f92', '#8fc4e4', 0.3), K.ink, 1.6);
    // the gold core standing in it, a thin vein of light
    add(ctx, () => {
      const fl = 0.85 + 0.15 * Math.sin(t * 2.4 + seed);
      glow(ctx, 0, -H * 0.5, H * 0.55, K.gold, 0.2 * fl * k); glow(ctx, 0, -H * 0.45, 24, K.goldH, 0.5 * fl * k);
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(1, -H * 0.5); ctx.lineTo(-1, -H * 0.86); ctx.strokeStyle = rgba(K.goldH, 0.85 * fl * k); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.9 * k); ctx.lineWidth = 1; ctx.stroke();
      for (let i = 0; i < 4; i++) { const q = (t * 0.3 + i / 4) % 1; circle(ctx, (hash(i, seed) - 0.5) * W, -H * q * 0.8, 1.3 * (1 - q), rgba(K.goldH, 0.8 * (1 - q) * k)); }
    });
    line(ctx, W * 0.1, -H * 0.08, W * 0.55, -H * 0.4, rgba('#10202e', 0.5), 1.2);   // a crack
    ctx.restore();
  }
  const mixC = (a, b, q) => { const pa = hexToRgb(a), pb = hexToRgb(b); return `rgb(${Math.round(lerp(pa[0], pb[0], q))},${Math.round(lerp(pa[1], pb[1], q))},${Math.round(lerp(pa[2], pb[2], q))})`; };

  // the coffin's base on the floor (ADD_ART.coffin: drawn at the hero's feet, a slab of ice and its frost); the block round the hero is hood-fx.js's
  function coffinBase(ctx, st, enraged) {
    const t = st.t || 0;
    ellipse(ctx, 0, 6, 34, 15, 0, rgba('#bfe8ff', 0.18), rgba('#eaf8ff', 0.5), 1.6);
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10; line(ctx, Math.cos(a) * 26, 6 + Math.sin(a) * 11, Math.cos(a) * (36 + hash(i, 5) * 8), 6 + Math.sin(a) * (15 + hash(i, 6) * 4), rgba('#eaf8ff', 0.5), 1.8); }
    add(ctx, () => glow(ctx, 0, 4, 40, K.frost, 0.12 + 0.04 * Math.sin(t * 2)));
  }

  // ---------------------------------------------------------------------------------------------------------- preview
  // opts: t, props (the st.props above), angle (facing; default right), seraph, moving, action {t0, dur}, zoom, clear, bg
  if (typeof window !== 'undefined') {
    window.__hdArtPreview = function (canvas, opts = {}) {
      const ctx = canvas.getContext('2d'), st = canvas.__hdSt || (canvas.__hdSt = { t: 0 });
      st.t = opts.t || 0; st.moving = !!opts.moving;
      st.props = Object.assign({}, opts.props || {});
      st.action = opts.action ? { type: 'attack', t0: opts.action.t0, dur: opts.action.dur } : null;
      const angle = opts.angle == null ? 0 : opts.angle, zoom = opts.zoom || canvas.width / 360;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (opts.clear !== false) { ctx.fillStyle = opts.bg || '#0a0d14'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.translate(canvas.width / 2, canvas.height * (opts.cy == null ? 0.56 : opts.cy)); ctx.scale(zoom, zoom); ctx.rotate(angle);
      body(ctx, st, angle, !!opts.seraph);
      ctx.restore();
      return st;
    };
  }
  return { body, hood, seraph: seraphBody, pillar, coffinBase, K, wing };
})();
if (typeof BOSS_ART !== 'undefined') { BOSS_ART.hood = HD_ART.hood; BOSS_ART.seraph = HD_ART.seraph; }
if (typeof ADD_ART !== 'undefined') ADD_ART.coffin = HD_ART.coffinBase;
