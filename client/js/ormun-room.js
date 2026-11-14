// Ormun, the Tide-Weigher: the room he is fought in, drawn in code. The Scales: two round pans of silver hanging side by side over a
// night sea, joined by a short bridge, under a beam that runs from the colossus's hand out over both of them. Everything else is open
// black water far below, with a slow swell, and one small spark of warm light deep under it (the only warm colour in the room).
// Loaded after arena-view.js. It adds buildScales / scalesLife to ArenaView (arena-view.js: buildFloor picks it by boss id 'ormun',
// drawAmbient by amb.kind 'scales').
//
// The geometry is a contract with the fight script (ormun.js): two pans of radius 300 at (-380, 60) and (380, 60); a bridge x -110..110,
// y 10..110; Ormun at the fulcrum (0, -170). The floor layer holds only what never moves: the night sea, the pier he stands on. The pans,
// the bridge, the chains, the beam and the spark are drawn every frame in scalesLife (they tilt, glow, break), from pre-drawn pictures.
//
// LIVE STATE it reads: ArenaView.liveRoom.ev.orscales (the room event k: 'orscales', which the host sends each time any of this changes;
// the event's own dur / end is ignored, the latest one is simply the state). Every field is optional:
//   tilt     -1 .. 1   the beam: -1 left pan fully down, +1 right pan fully down. If absent it is read from nL / nR below.
//   nL, nR   counts    what weighs on each pan (the script's count per pan); used only when `tilt` is absent: tilt = (nR - nL) / 4
//   glowL    0 | 1     the left pan glows from underneath (a judgement is going to fall on it); it eases in and out
//   glowR    0 | 1     the same for the right pan (both on: the judgement falls on both)
//   bridge   true | false   whether the bridge stands (default true). A true -> false change plays the breaking.
//   cradles  [[x, y] x 6]    where the six cradles are, in the room; the first three belong to the left pan (x < 0), the others to the
//            right. Default: the script's (-216, -135) (-159, -67) (-131, 7) and their mirror (OR_ROOM.CRADLES).
// What the low pan looks like: a few px smaller and 3 px lower, a darker rim, the sea lapping in over its outer rim; the high pan a few
// px larger with a paler rim. Nothing on a pan's floor moves or changes colour except the rim ring, so telegraphs read on it.
//
// The pans' floor colours (for tuning telegraphs against it): dish #6a7789 centre .. #4a5565 at the rim, the lip #d5dfea; sea #07111d.

const OR_ROOM = (() => {
  const wrap = (v, n) => ((v % n) + n) % n;
  const PAN_R = 300, PANS = [{ x: -380, y: 60 }, { x: 380, y: 60 }];
  const BR = { x0: -110, x1: 110, y0: 10, y1: 110 };
  const FUL = { x: 0, y: -170 };
  const BEAM_Y = -290;                  // the beam's line across the room at rest: high above his shoulders, so it shows just behind him
  const SPARK = { x: 0, y: 232 };       // the spark under the water, below the bridge and between the pans
  const PERSP = { x: 0, y: 60 };        // the point the chains and the beam lean away from (things nearer the eye are pushed out from it)
  const CRADLES = [[-216, -135], [-159, -67], [-131, 7], [216, -135], [159, -67], [131, 7]];   // (the script's (ormun.js CRADLES), so that the room is right before the first orscales arrives)
  const K = {
    sea: '#07111d', seaD: '#02050a', swell: '#16324a', frost: '#9fd0ff', frostL: '#dcefff',
    silver: '#b9c6d6', silverH: '#eef6ff', silverD: '#5d6b7e', ink: '#070b12',
    warm: '#ffb865', warmHi: '#ffe3ae',
  };
  function soft(c, x, y, rx, ry, rot, col, a) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(1, ry / rx); glow(c, 0, 0, rx, col, a); c.restore();
  }
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h); return cv; };

  // ---------------------------------------------------------------------------------------------------- the pan (a picture, centred)
  // left-handed: the chains' lugs at 180, 125 and 235 degrees; the right pan is this one mirrored
  const LUG = [Math.PI, Math.PI * 125 / 180, Math.PI * 235 / 180];
  const PH = 360;   // the sprite's half size
  function drawPan(x) {
    const R = PAN_R, r = rng(2711);
    // the cold light the rim gives the water about it
    const hg = x.createRadialGradient(0, 0, R, 0, 0, R + 56); hg.addColorStop(0, 'rgba(120,170,215,0.22)'); hg.addColorStop(1, 'rgba(120,170,215,0)');
    x.fillStyle = hg; x.beginPath(); x.arc(0, 0, R + 56, 0, TAU); x.fill();
    circle(x, 0, 0, R + 7, 'rgba(1,3,8,0.6)');                            // the dark underside showing past the lip
    // the lip: a wide band of bright silver with a dark outer edge: the edge of the pan is never in doubt
    const lg = x.createLinearGradient(-R, -R, R, R); lg.addColorStop(0, '#f2f7fc'); lg.addColorStop(0.45, '#c3cfdc'); lg.addColorStop(1, '#7d8b9d');
    circle(x, 0, 0, R, lg, K.ink, 3.4);
    circle(x, 0, 0, R - 15, '#232c39');                                    // the groove between the lip and the dish
    // the dish: a gently hollow floor, a little darker toward the lip
    const dg = x.createRadialGradient(-34, -44, 20, 0, 0, R - 17);
    dg.addColorStop(0, '#6d7a8c'); dg.addColorStop(0.55, '#5f6c7e'); dg.addColorStop(1, '#4a5565');
    circle(x, 0, 0, R - 18, dg);
    x.save(); x.beginPath(); x.arc(0, 0, R - 18, 0, TAU); x.clip();
    // hammered silver: a fine scatter of dimples, each a pale lip over a dark one
    for (let i = 0; i < 520; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * (R - 24), px = Math.cos(a) * d, py = Math.sin(a) * d, s = 2 + r() * 4;
      x.fillStyle = 'rgba(20,28,40,' + (0.05 + r() * 0.05).toFixed(3) + ')'; x.beginPath(); x.ellipse(px, py, s, s * 0.8, 0.5, 0, TAU); x.fill();
      x.fillStyle = 'rgba(230,242,255,' + (0.05 + r() * 0.05).toFixed(3) + ')'; x.beginPath(); x.ellipse(px - 0.9, py - 0.9, s * 0.8, s * 0.6, 0.5, 0, TAU); x.fill();
    }
    // engraved rings and their graduation, thin and faint (the lines of a scale's face)
    for (const [rr, ticks, big] of [[262, 72, 6], [205, 0, 0], [140, 36, 4], [74, 0, 0]]) {
      x.beginPath(); x.arc(0, 0, rr, 0, TAU); x.strokeStyle = 'rgba(14,22,34,0.34)'; x.lineWidth = 1.5; x.stroke();
      x.beginPath(); x.arc(0, 0, rr + 1.6, 0, TAU); x.strokeStyle = 'rgba(226,238,252,0.1)'; x.lineWidth = 1; x.stroke();
      for (let i = 0; i < ticks; i++) {
        const a = i * TAU / ticks, L = i % big === 0 ? 8 : 4;
        x.beginPath(); x.moveTo(Math.cos(a) * (rr - L), Math.sin(a) * (rr - L)); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        x.strokeStyle = 'rgba(14,22,34,0.3)'; x.lineWidth = 1.2; x.stroke();
      }
    }
    // a few long, soft sweeps of light across the metal (a polished dish) and a cold sheen at the foot
    soft(x, -70, -92, 190, 34, -0.5, '#dcecff', 0.1);
    soft(x, 80, 110, 160, 26, -0.5, '#dcecff', 0.07);
    soft(x, 0, 60, 230, 120, 0, '#0a121c', 0.1);
    x.restore();
    // a thin dark line where the dish meets the groove, and the bright inner edge of the lip
    x.beginPath(); x.arc(0, 0, R - 17.5, 0, TAU); x.strokeStyle = 'rgba(4,8,14,0.7)'; x.lineWidth = 2.4; x.stroke();
    x.beginPath(); x.arc(0, 0, R - 1.5, 0, TAU); x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1.6; x.stroke();
    // the lip's light and shade: lit along the upper left, shaded along the lower right
    x.lineCap = 'round';
    x.beginPath(); x.arc(0, 0, R - 7, Math.PI * 1.02, Math.PI * 1.62); x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 4; x.stroke();
    x.beginPath(); x.arc(0, 0, R - 7, Math.PI * 0.05, Math.PI * 0.6); x.strokeStyle = 'rgba(20,30,46,0.38)'; x.lineWidth = 5; x.stroke();
    // rivets round the lip
    for (let i = 0; i < 40; i++) {
      const a = i * TAU / 40 + 0.04, px = Math.cos(a) * (R - 8), py = Math.sin(a) * (R - 8);
      circle(x, px, py, 2.6, '#8b99ab', 'rgba(8,12,20,0.8)', 1);
      circle(x, px - 0.7, py - 0.7, 1, 'rgba(255,255,255,0.8)');
    }
    // the three lugs the chains hang from: plates riveted over the lip, a ring through each, standing out past the edge
    for (const a of LUG) {
      x.save(); x.rotate(a); x.translate(R - 4, 0);
      rrect(x, -2, -17, 38, 34, 9, 'rgba(1,3,8,0.5)'); rrect(x, -6, -15, 36, 30, 8, '#a9b6c6', K.ink, 2.4);
      rrect(x, -3, -12, 30, 7, 3, 'rgba(255,255,255,0.35)');
      circle(x, 18, 0, 8.2, '#161d29', K.ink, 2); circle(x, 18, 0, 5.2, '#04070c');
      circle(x, -1, -9, 2, '#e7eef6', K.ink, 0.8); circle(x, -1, 9, 2, '#e7eef6', K.ink, 0.8);
      x.restore();
    }
  }
  function panSprite(sc) {
    const cv = mk(PH * 2 * sc, PH * 2 * sc), x = cv.getContext('2d');
    x.scale(sc, sc); x.translate(PH, PH); drawPan(x);
    return cv;
  }

  // ---------------------------------------------------------------------------------------------------- the bridge (a picture)
  const BW = BR.x1 - BR.x0, BH = BR.y1 - BR.y0, BM = 12;
  function bridgeSprite(sc) {
    const cv = mk((BW + BM * 2) * sc, (BH + BM * 2) * sc), x = cv.getContext('2d'), r = rng(88);
    x.scale(sc, sc); x.translate(BM, BM);
    x.fillStyle = 'rgba(1,3,8,0.5)'; x.fillRect(-3, 3, BW + 6, BH + 6);                    // the dark under it
    const g = x.createLinearGradient(0, 0, 0, BH); g.addColorStop(0, '#6f7c8f'); g.addColorStop(0.5, '#5d6a7c'); g.addColorStop(1, '#515d6e');
    x.fillStyle = g; x.fillRect(0, 0, BW, BH);
    x.save(); x.beginPath(); x.rect(0, 0, BW, BH); x.clip();
    for (let i = 0; i < 160; i++) {
      const px = r() * BW, py = r() * BH, s = 1.5 + r() * 3;
      x.fillStyle = 'rgba(18,26,38,' + (0.05 + r() * 0.05).toFixed(3) + ')'; x.beginPath(); x.ellipse(px, py, s, s * 0.8, 0.4, 0, TAU); x.fill();
      x.fillStyle = 'rgba(230,242,255,' + (0.05 + r() * 0.05).toFixed(3) + ')'; x.beginPath(); x.ellipse(px - 0.8, py - 0.8, s * 0.8, s * 0.6, 0.4, 0, TAU); x.fill();
    }
    for (let i = 1; i < 8; i++) {   // the seams between eight slabs, with a bolt at each end
      const px = i * BW / 8;
      line(x, px, 0, px, BH, 'rgba(8,12,20,0.6)', 2); line(x, px + 1.4, 0, px + 1.4, BH, 'rgba(226,238,252,0.14)', 1);
    }
    x.restore();
    for (const [y0, y1] of [[0, 11], [BH - 11, BH]]) {   // the lips along both sides: the same bright band as the pans' rims
      const lg = x.createLinearGradient(0, y0, 0, y1); lg.addColorStop(0, y0 ? '#9aa8ba' : '#e6eef6'); lg.addColorStop(1, y0 ? '#e6eef6' : '#9aa8ba');
      x.fillStyle = lg; x.fillRect(0, y0, BW, y1 - y0);
    }
    x.strokeStyle = K.ink; x.lineWidth = 3; x.strokeRect(0, 0, BW, BH);
    for (const y of [5.5, BH - 5.5]) for (let i = 0; i < 8; i++) {
      const px = (i + 0.5) * BW / 8; circle(x, px, y, 2.2, '#8b99ab', 'rgba(8,12,20,0.8)', 1); circle(x, px - 0.6, y - 0.6, 0.9, 'rgba(255,255,255,0.8)');
    }
    for (let i = 0; i < 8; i++) { if (i === 0 || i === 7) continue; line(x, i * BW / 8, 11, i * BW / 8, 13, 'rgba(255,255,255,0.25)', 1); }
    return cv;
  }

  // ---------------------------------------------------------------------------------------------------- chain links (pictures)
  // a flat ring, long along its length, and a short bar standing edge-on between: laid out along the chain, alternating
  function linkSprites() {
    const ring = mk(48, 30), bar = mk(48, 30);
    let x = ring.getContext('2d'); x.translate(24, 15);
    x.beginPath(); x.ellipse(0, 0, 17, 9.2, 0, 0, TAU); x.strokeStyle = K.ink; x.lineWidth = 7.4; x.stroke();
    x.strokeStyle = K.silver; x.lineWidth = 4.2; x.stroke();
    x.beginPath(); x.ellipse(0, -0.8, 17, 9.2, 0, Math.PI * 1.1, Math.PI * 1.9); x.strokeStyle = K.silverH; x.lineWidth = 1.5; x.stroke();
    x = bar.getContext('2d'); x.translate(24, 15); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-9, 0); x.lineTo(9, 0); x.strokeStyle = K.ink; x.lineWidth = 9; x.stroke();
    x.strokeStyle = '#98a6b8'; x.lineWidth = 5.4; x.stroke();
    x.beginPath(); x.moveTo(-8, -1.4); x.lineTo(8, -1.4); x.strokeStyle = K.silverH; x.lineWidth = 1.4; x.stroke();
    return [ring, bar];
  }

  // ---------------------------------------------------------------------------------------------------- the floor (cached)
  function buildScales(c, bx, by) {
    const r = rng(1501), sc = Math.min(2, Math.max(1, (c.getTransform ? c.getTransform().a : 1) || 1));
    // the night sea, far below: black, a little lighter about the pans
    const sg = c.createRadialGradient(0, 60, 60, 0, 60, Math.hypot(bx, by));
    sg.addColorStop(0, '#0b1826'); sg.addColorStop(0.4, K.sea); sg.addColorStop(1, K.seaD);
    c.fillStyle = sg; c.fillRect(-bx, -by, bx * 2, by * 2);
    soft(c, 0, 80, 760, 360, 0, '#1a3a5c', 0.22);
    // long, slow undulations of the deep water, standing still in the picture (the moving ones are drawn in scalesLife)
    for (let i = 0; i < 46; i++) {
      const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by, rx = 160 + r() * 380, ry = 14 + r() * 36;
      soft(c, x, y, rx, ry, (r() - 0.5) * 0.16, r() < 0.5 ? '#173651' : '#02060b', 0.1 + r() * 0.1);
    }
    // the pier he stands on: a round dais of dark wet stone, rising out of the sea, mostly under his robes
    const fx = FUL.x, fy = FUL.y;
    soft(c, fx, fy + 8, 250, 230, 0, '#010308', 0.55);
    circle(c, fx, fy, 178, '#0c121b', '#02040a', 4);
    circle(c, fx, fy, 170, '#1b2533');
    const pg = c.createRadialGradient(fx - 40, fy - 50, 10, fx, fy, 160); pg.addColorStop(0, '#3a4a5e'); pg.addColorStop(1, '#222d3c');
    circle(c, fx, fy, 160, pg, 'rgba(2,4,8,0.7)', 2);
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + 0.1; line(c, fx + Math.cos(a) * 118, fy + Math.sin(a) * 118, fx + Math.cos(a) * 160, fy + Math.sin(a) * 160, 'rgba(4,8,14,0.5)', 1.6); }
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = 40 + r() * 118; circle(c, fx + Math.cos(a) * d, fy + Math.sin(a) * d, 0.8 + r() * 1.6, r() < 0.5 ? 'rgba(210,228,248,0.1)' : 'rgba(2,4,8,0.2)'); }
    c.beginPath(); c.arc(fx, fy, 175, Math.PI * 1.05, Math.PI * 1.6); c.strokeStyle = 'rgba(220,238,255,0.22)'; c.lineWidth = 2; c.stroke();

    // everything else is drawn in scalesLife
    const sw = [], gl = [], cr = [];
    for (let i = 0; i < 6; i++) sw.push({ y: -by * 0.9 + r() * by * 1.8, x0: r() * bx * 2, sp: 5 + r() * 8, w: 360 + r() * 420, h: 26 + r() * 34, a: 0.07 + r() * 0.07 });
    for (let i = 0; i < 24; i++) gl.push({ x: (r() * 2 - 1) * bx, y: (r() * 2 - 1) * by, ph: r() * 9, k: 0.4 + r() * 0.9, s: 1 + r() * 1.6 });
    for (let i = 0; i < 8; i++) cr.push({ y: -by + (i + 0.5) / 8 * by * 2 + (r() - 0.5) * 40, ph: r() * 9, k: 0.25 + r() * 0.3, a: 0.05 + r() * 0.05 });
    const amb = {
      kind: 'scales', bx, by, t0: null,
      panSp: panSprite(sc), bridgeSp: bridgeSprite(sc), links: linkSprites(), sc,
      sw, gl, cr,
      tilt: 0, tgt: 0, glow: [0, 0], bridge: 1, brkAt: -1e9, wasBridge: true, splash: [],
    };
    chainsStatic(c, amb);   // (the chains out past the pans' rims are part of the picture of the sea)
    ArenaView.amb = amb;
  }

  // ---------------------------------------------------------------------------------------------------- the life
  const ease = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));

  function readState(a, t, dt) {
    const room = ArenaView.liveRoom, ev = room && room.ev && room.ev.orscales;
    let tilt = 0, gl = [0, 0], bridge = true, cradles = CRADLES;
    if (ev) {
      if (typeof ev.tilt === 'number') tilt = clamp(ev.tilt, -1, 1);
      else if (typeof ev.nL === 'number' || typeof ev.nR === 'number') tilt = clamp(((ev.nR || 0) - (ev.nL || 0)) / 4, -1, 1);
      gl = [ev.glowL ? 1 : 0, ev.glowR ? 1 : 0];
      if (ev.bridge === false || ev.bridge === 0) bridge = false;
      if (Array.isArray(ev.cradles) && ev.cradles.length >= 6) cradles = ev.cradles.map(p => (Array.isArray(p) ? p : [p.x, p.y]));
    }
    a.tgt = tilt;
    a.tilt = ease(a.tilt, tilt, 2.4, dt);
    for (let i = 0; i < 2; i++) a.glow[i] = ease(a.glow[i], gl[i], gl[i] ? 3.2 : 2.2, dt);
    if (a.wasBridge && !bridge) a.brkAt = t;
    if (!a.wasBridge && bridge) a.brkAt = -1e9;
    a.wasBridge = bridge; a.bridge = bridge ? 1 : 0;
    return cradles;
  }

  // the deep water: slow swell bands, long crest lines, glints; and the spark under it
  function sea(ctx, a, t) {
    const bx = a.bx, by = a.by, W = bx * 2;
    for (const m of a.sw) {
      const x = -bx - m.w + wrap(m.x0 + t * m.sp, W + m.w * 2);
      soft(ctx, x, m.y + Math.sin(t * 0.3 + m.x0) * 6, m.w, m.h, 0, '#2c5578', m.a * (0.7 + 0.3 * Math.sin(t * 0.21 + m.y)));
    }
    ctx.save(); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (const l of a.cr) {
      ctx.beginPath();
      for (let x = -bx; x <= bx + 90; x += 90) {
        const y = l.y + 5 * Math.sin(x * 0.006 + t * l.k + l.ph) + 3 * Math.sin(x * 0.017 - t * l.k * 1.7 + l.ph * 2);
        x === -bx ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(K.frost, l.a); ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const g of a.gl) {
      const s = Math.sin(t * g.k + g.ph); if (s < 0.72) continue;
      const k = (s - 0.72) / 0.28;
      ctx.fillStyle = rgba(K.frostL, 0.5 * k); ctx.fillRect(g.x - g.s * 1.6, g.y - 0.5, g.s * 3.2, 1);
    }
    ctx.restore();
  }
  // one small spark of warm light, deep under the water below and between the pans: blurred, wobbling, ringed by the water above it
  function spark(ctx, t) {
    const x = SPARK.x + Math.sin(t * 0.7) * 1.6, y = SPARK.y + Math.sin(t * 0.9 + 1) * 1.2, fl = 0.8 + 0.12 * Math.sin(t * 1.3) + 0.06 * Math.sin(t * 3.1) - ((t + 3) % 23 < 0.3 ? 0.18 : 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 46, K.warm, 0.2 * fl);
    glow(ctx, x, y, 20, K.warm, 0.38 * fl);
    glow(ctx, x, y, 7.5, K.warmHi, 0.62 * fl);
    ctx.fillStyle = rgba(K.warmHi, 0.85 * fl); ctx.beginPath(); ctx.arc(x, y, 1.7, 0, TAU); ctx.fill();
    for (let i = 0; i < 3; i++) {   // light through moving water: faint rings that wander and breathe
      const q = (t * 0.16 + i / 3) % 1, rr = 10 + q * 36;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 0.5 + i) * 2, y, rr, rr * 0.62, 0, 0, TAU);
      ctx.strokeStyle = rgba(K.warm, 0.2 * (1 - q) * fl); ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }
  // the foam that rings the pier, and the rings the sleeves' water makes where it lands (those are in the body's own art)
  function pierFoam(ctx, t) {
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.14 + i / 3) % 1, rr = 178 + q * 34;
      ctx.beginPath(); ctx.ellipse(FUL.x, FUL.y, rr, rr * 0.97, 0, 0, TAU);
      ctx.strokeStyle = rgba(K.frostL, 0.22 * (1 - q)); ctx.lineWidth = 2.2 - q; ctx.stroke();
    }
  }

  // ---- one pan: shaded by how low it hangs, the sea over its rim, a light from under it. All in the pan's own frame (centre at 0, 0).
  // d: how low it hangs, -1 (fully up) .. 1 (fully down); lowK: 0..1 the same if it is the low one
  function lap(ctx, side, L, t) {
    const R = PAN_R, out = side < 0 ? Math.PI : 0, span = 0.85 + 1.5 * L, n = 56;
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R + 0.5, 0, TAU); ctx.clip();
    const film = ang => {
      const u = clamp(Math.abs(Math.atan2(Math.sin(ang - out), Math.cos(ang - out))) / span, 0, 1), env = Math.pow(Math.cos(u * Math.PI / 2), 0.8);
      return (4 + 26 * L) * env * (0.72 + 0.28 * Math.sin(ang * 9 + t * 1.4) + 0.14 * Math.sin(ang * 17 - t * 2.1));
    };
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const ang = out - span + 2 * span * i / n; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * (R + 3), Math.sin(ang) * (R + 3)); }
    for (let i = n; i >= 0; i--) { const ang = out - span + 2 * span * i / n, rr = R - film(ang); ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
    ctx.closePath(); ctx.fillStyle = rgba('#8fc0ea', 0.12 + 0.24 * L); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const ang = out - span + 2 * span * i / n, rr = R - film(ang); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr); }
    ctx.strokeStyle = rgba('#e4f2ff', 0.22 + 0.45 * L); ctx.lineWidth = 1.5 + L; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
    if (L > 0.12) {   // spray flung off the rim where the sea breaks over it
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const q = (t * 0.45 + i * 0.37) % 1, ang = out + (hash01(i * 3.7) - 0.5) * span * 1.5, rr = R + 4 + q * 16;
        ctx.strokeStyle = rgba('#e4f2ff', 0.5 * (1 - q) * Math.min(1, L * 1.6)); ctx.lineWidth = 2.2 - q;
        ctx.beginPath(); ctx.arc(0, 0, rr, ang - 0.05, ang + 0.05); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function underGlow(ctx, g, t, inner) {
    const R = PAN_R, pul = 0.78 + 0.22 * Math.sin(t * 3.4);
    if (!inner) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // outside the rim: the light spilling past the pan onto the water
    ctx.beginPath(); ctx.arc(0, 0, R + 130, 0, TAU); ctx.arc(0, 0, R - 1, 0, TAU, true); ctx.clip();
    const og = ctx.createRadialGradient(0, 0, R - 1, 0, 0, R + 130);
    og.addColorStop(0, rgba('#b8dcff', 0.5 * g * pul)); og.addColorStop(0.2, rgba('#7fb4ee', 0.26 * g)); og.addColorStop(1, rgba('#4a86cc', 0));
    ctx.fillStyle = og; ctx.fillRect(-R - 140, -R - 140, 2 * R + 280, 2 * R + 280);
    ctx.restore();
    return;
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // inside: only the lip lit from beneath, and the faintest cool wash at the foot of the dish
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
    const ig = ctx.createRadialGradient(0, 0, R - 34, 0, 0, R);
    ig.addColorStop(0, rgba('#b8dcff', 0)); ig.addColorStop(0.75, rgba('#b8dcff', 0.12 * g)); ig.addColorStop(1, rgba('#d8ecff', 0.4 * g * pul));
    ctx.fillStyle = ig; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    ctx.restore();
  }
  function cradle(ctx, x, y, t, i) {
    circle(ctx, x, y, 26, 'rgba(18,26,38,0.3)');
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, 24.5, Math.PI * 0.02, Math.PI * 1.0); ctx.strokeStyle = 'rgba(236,245,254,0.55)'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 24.5, Math.PI * 1.02, Math.PI * 2.0); ctx.strokeStyle = 'rgba(6,10,18,0.62)'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 21.2, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = 'rgba(6,10,18,0.3)'; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 16.5, 0, TAU); ctx.strokeStyle = 'rgba(214,228,244,0.16)'; ctx.lineWidth = 1.2; ctx.stroke();
    for (let k = 0; k < 3; k++) { const ang = i * 1.1 + k * TAU / 3 + 0.5; line(ctx, x + Math.cos(ang) * 19, y + Math.sin(ang) * 19, x + Math.cos(ang) * 23, y + Math.sin(ang) * 23, 'rgba(214,228,244,0.2)', 1.4); }
  }
  function pan(ctx, a, i, cradles, t) {
    const side = i ? 1 : -1, tl = a.tilt, d = i ? tl : -tl, low = Math.max(0, d), up = Math.max(0, -d), g = a.glow[i];
    const bob = Math.sin(t * 0.8 + i * 2.1) * 1.4 + Math.sin(t * 1.9 + i) * 0.5;
    const hv = a.heave && a.heave[i];   // (walls/ormun.js: a pan the Tide lifts, or a swing: { k, x, y } added to its pose; nothing sets it otherwise)
    const k = 1 - 0.011 * d + (hv ? hv.k : 0), cx = PANS[i].x + (hv ? hv.x : 0), cy = PANS[i].y + 3 * d + bob + (hv ? hv.y : 0);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    if (g > 0.01) underGlow(ctx, g, t, false);
    // what hangs between the pan and the water: a dark crescent that widens with the pan's height
    soft(ctx, 0, 14 + 12 * up, PAN_R + 30, PAN_R + 22, 0, '#010308', 0.22 + 0.12 * up);
    ctx.save(); ctx.scale(side < 0 ? 1 : -1, 1); ctx.drawImage(a.panSp, -PH, -PH, PH * 2, PH * 2); ctx.restore();
    // the dish at a glance: a dimmer, darker-ringed floor for the low pan, a paler lip for the high one
    if (low > 0.02) {
      const dg = ctx.createRadialGradient(0, 0, PAN_R * 0.5, 0, 0, PAN_R);
      dg.addColorStop(0, 'rgba(2,6,14,0)'); dg.addColorStop(0.8, rgba('#02060e', 0.22 * low)); dg.addColorStop(1, rgba('#02060e', 0.5 * low));
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, PAN_R, 0, TAU); ctx.fill();
    }
    if (up > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(0, 0, PAN_R - 6, 0, TAU); ctx.arc(0, 0, PAN_R - 17, 0, TAU, true);
      ctx.fillStyle = rgba('#dcecff', 0.16 * up); ctx.fill('evenodd'); ctx.restore();
    }
    if (g > 0.01) underGlow(ctx, g, t, true);
    for (let c = 0; c < 6; c++) { const p = cradles[c]; if ((p[0] < 0) === (i === 0)) cradle(ctx, p[0] - PANS[i].x, p[1] - PANS[i].y, t, c); }
    lap(ctx, side, low, t);
    ctx.restore();
    return { cx, cy, k };
  }

  // ---- the bridge: standing, or breaking, or gone (two stumps at the pans' rims)
  function bridge(ctx, a, t) {
    const sp = a.bridgeSp, sc = a.sc, age = t - a.brkAt;
    const draw = (sx, sw, dx, dy, k, rot, al) => {   // a vertical slice of the sprite, drawn about its own centre
      if (al <= 0.01) return;
      const cx = BR.x0 + sx + sw / 2, cy = (BR.y0 + BR.y1) / 2;
      ctx.save(); ctx.globalAlpha *= al; ctx.translate(cx + dx, cy + dy); ctx.rotate(rot); ctx.scale(k, k);
      ctx.drawImage(sp, (BM + sx) * sc, 0, sw * sc, sp.height, -sw / 2, -(BH + BM * 2) / 2, sw, BH + BM * 2); ctx.restore();
    };
    if (a.bridge) {   // standing
      ctx.drawImage(sp, BR.x0 - BM, BR.y0 - BM, BW + BM * 2, BH + BM * 2);
      return;
    }
    const SW = BW / 8;
    // the end slabs stay, on the rim of each pan, torn off at a ragged line
    for (const s of [-1, 1]) {
      ctx.save(); ctx.beginPath();
      const inner = s < 0 ? BR.x0 + 2 * SW : BR.x1 - 2 * SW, outer = s < 0 ? BR.x0 - BM : BR.x1 + BM, y0 = BR.y0 - BM, y1 = BR.y1 + BM, nz = 7;
      ctx.moveTo(outer, y0);
      ctx.lineTo(inner + s * 2 * (hash01(1) - 0.5) * 3, y0);
      for (let k = 1; k < nz; k++) ctx.lineTo(inner - s * (2 + 8 * hash01(k * 5 + (s < 0 ? 0 : 40))), y0 + (y1 - y0) * k / nz);
      ctx.lineTo(inner, y1); ctx.lineTo(outer, y1); ctx.closePath(); ctx.clip();
      ctx.drawImage(sp, BR.x0 - BM, BR.y0 - BM, BW + BM * 2, BH + BM * 2);
      ctx.restore();
      // the torn edge: a dark line, a pale chip, a little white where it was struck
      ctx.beginPath(); ctx.moveTo(inner, BR.y0 - 1);
      for (let k = 1; k < nz; k++) ctx.lineTo(inner - s * (2 + 8 * hash01(k * 5 + (s < 0 ? 0 : 40))), BR.y0 - BM + (BH + BM * 2) * k / nz);
      ctx.lineTo(inner, BR.y1 + 1); ctx.strokeStyle = 'rgba(2,5,10,0.85)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(230,242,255,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
    }
    // the four middle slabs fall, the centre first: they shrink and darken as they go down toward the water
    if (age < 1.6) for (let i = 2; i < 6; i++) {
      const cxs = (i + 0.5) * SW - BW / 2, delay = Math.abs(cxs) / BW * 0.7 + 0.02, u = clamp((age - delay) / 0.8, 0, 1);
      if (u <= 0) { draw(i * SW, SW, 0, 0, 1, 0, 1); continue; }
      const jx = (hash01(i * 3.3) - 0.5) * 10 * u, rot = (hash01(i * 7.1) - 0.5) * 0.9 * u;
      draw(i * SW, SW, jx, u * u * 22, 1 - 0.4 * u, rot, 1 - u * u);
      ctx.save(); ctx.globalAlpha *= u * 0.5 * (1 - u * 0.4); ctx.fillStyle = '#02060c';
      ctx.translate(BR.x0 + i * SW + SW / 2 + jx, (BR.y0 + BR.y1) / 2 + u * u * 22); ctx.rotate(rot); ctx.scale(1 - 0.4 * u, 1 - 0.4 * u); ctx.fillRect(-SW / 2, -BH / 2, SW, BH); ctx.restore();
      // where it lands: rings and a burst of white
      const q = (age - delay - 0.55) / 1.0;
      if (q > 0 && q < 1) {
        const x = BR.x0 + i * SW + SW / 2, y = (BR.y0 + BR.y1) / 2 + 12;
        ctx.save(); ctx.lineWidth = 2.4 * (1 - q);
        for (let k = 0; k < 2; k++) { const qq = clamp(q - k * 0.18, 0, 1); ctx.beginPath(); ctx.ellipse(x, y, 10 + qq * 46, 7 + qq * 30, 0, 0, TAU); ctx.strokeStyle = rgba('#e4f2ff', 0.7 * (1 - qq)); ctx.stroke(); }
        glow(ctx, x, y - q * 18, 18 + q * 12, '#e4f2ff', 0.5 * (1 - q));
        ctx.restore();
      }
    }
    // the sea over the gap, white and unsettled for a while
    if (age < 5) {
      const k = Math.max(0, 1 - age / 5);
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.5 + i / 5) % 1;
        ctx.beginPath(); ctx.ellipse(0, 62, 30 + q * 70, 22 + q * 40, 0, 0, TAU);
        ctx.strokeStyle = rgba('#e4f2ff', 0.2 * k * (1 - q)); ctx.lineWidth = 1.6; ctx.stroke();
      }
    }
  }

  // ---- the chains: out of each pan's rim and up into the dark. They climb toward the eye, so on the page they lean away from the middle
  // and their links grow (and fade into the night) as they go. From the sixth link on they are drawn once, into the floor; the first few
  // are drawn every frame and follow the pan's lug (easing back to the still chain), so that the chain never comes off its pan.
  const LIVE_N = 5;
  function chainLinks(a, i, li, p, maxN) {
    let ang = LUG[li]; if (i) ang = Math.PI - ang;
    const lx = p.cx + Math.cos(ang) * (PAN_R + 14) * p.k, ly = p.cy + Math.sin(ang) * (PAN_R + 14) * p.k;
    const dx = lx - PERSP.x, dy = ly - PERSP.y, L = Math.hypot(dx, dy) || 1, ua = Math.atan2(dy, dx), out = [];
    let kk = 1, n = 0;
    while (kk < 3.2 && n < maxN) {
      const px = PERSP.x + dx * kk, py = PERSP.y + dy * kk;
      if (Math.abs(px) > a.bx + 60 || Math.abs(py) > a.by + 60) break;
      const edge = clamp((a.bx - Math.abs(px)) / 260, 0, 1) * clamp((a.by - Math.abs(py)) / 220, 0, 1);
      out.push({ x: px, y: py, ua, s: Math.pow(kk, 1.35) * 0.6, al: clamp(1.12 - (kk - 1) * 0.5, 0, 1) * edge, n });
      kk += (n & 1 ? 8 : 12.5) * Math.pow(kk, 1.35) * 0.8 / L;
      n++;
    }
    return out;
  }
  function putLink(ctx, a, l, x, y) {
    ctx.save(); ctx.globalAlpha *= l.al; ctx.translate(x, y); ctx.rotate(l.ua);
    ctx.drawImage(a.links[l.n & 1], -24 * l.s, -15 * l.s, 48 * l.s, 30 * l.s); ctx.restore();
  }
  function chainsStatic(c, a) {
    a.chainRest = [[], []];
    for (let i = 0; i < 2; i++) for (let li = 0; li < 3; li++) {
      const links = chainLinks(a, i, li, { cx: PANS[i].x, cy: PANS[i].y, k: 1 }, 60);
      a.chainRest[i].push(links.slice(0, LIVE_N));
      for (let n = LIVE_N; n < links.length; n++) putLink(c, a, links[n], links[n].x, links[n].y);
    }
  }
  function chains(ctx, a, p, i) {
    for (let li = 0; li < 3; li++) {
      const live = chainLinks(a, i, li, p, LIVE_N), rest = a.chainRest[i][li];
      for (let n = 0; n < live.length && n < rest.length; n++) { const q = n / LIVE_N; putLink(ctx, a, live[n], live[n].x + (rest[n].x - live[n].x) * q, live[n].y + (rest[n].y - live[n].y) * q); }
    }
  }

  // ---- the beam: from the pivot behind him out over both pans and on into the dark. A raised end is nearer the eye: thicker, pushed
  // out and up; a lowered one thinner and drawn in.
  function beam(ctx, a, t) {
    const tl = a.tilt, N = 16, X = 860;
    const at = u => {   // u -1..1
      const h = -tl * u * 0.16, k = 1 + h;   // right end down (tilt > 0) = farther = smaller
      return { x: u * X * k, y: PERSP.y + (BEAM_Y - PERSP.y) * (1 + 0.4 * h), w: 25 * k };
    };
    const pts = []; for (let i = 0; i <= N; i++) pts.push(at(-1 + 2 * i / N));
    const up = [], dn = [];
    for (const p of pts) { up.push(p.x, p.y - p.w / 2); }
    for (let i = N; i >= 0; i--) dn.push(pts[i].x, pts[i].y + pts[i].w / 2);
    let g = a.beamG;
    if (!g) { g = a.beamG = ctx.createLinearGradient(-X, 0, X, 0); g.addColorStop(0, 'rgba(98,114,134,0)'); g.addColorStop(0.16, '#6f7e92'); g.addColorStop(0.5, '#9aa9bb'); g.addColorStop(0.84, '#6f7e92'); g.addColorStop(1, 'rgba(98,114,134,0)'); }
    ctx.save();
    ctx.lineJoin = 'round';
    const body = up.concat(dn);
    ctx.beginPath(); ctx.moveTo(body[0], body[1]); for (let i = 2; i < body.length; i += 2) ctx.lineTo(body[i], body[i + 1]); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    // light along the top edge, shade along the foot, a seam every so often, fading into the dark at both ends
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const p = pts[i]; ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y - p.w * 0.36); }
    ctx.strokeStyle = 'rgba(240,248,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const p = pts[i]; ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y + p.w * 0.38); }
    ctx.strokeStyle = 'rgba(4,8,14,0.5)'; ctx.lineWidth = 2.4; ctx.stroke();
    for (let i = 2; i < N - 1; i += 2) { const p = pts[i]; if (Math.abs(p.x) < 70) continue; line(ctx, p.x, p.y - p.w / 2, p.x, p.y + p.w / 2, 'rgba(4,8,14,0.4)', 1.6); circle(ctx, p.x, p.y, 2, 'rgba(230,240,252,0.5)'); }
    ctx.restore();
    // the pivot: a heavy block on the beam's middle, behind his shoulders
    const pv = at(0);
    ctx.save(); ctx.translate(pv.x, pv.y);
    rrect(ctx, -44, -22, 88, 44, 10, '#7d8b9d', K.ink, 3);
    rrect(ctx, -40, -19, 80, 10, 5, 'rgba(255,255,255,0.35)');
    circle(ctx, 0, 0, 12, '#232c39', K.ink, 2.5); circle(ctx, 0, 0, 6, '#9aa9bb', K.ink, 1.5);
    for (const sx of [-30, 30]) circle(ctx, sx, 0, 3, '#c3cfdc', K.ink, 1);
    ctx.restore();
  }

  function scalesLife(ctx, a, t) {
    const dt = a.t0 == null ? 0 : clamp(t - a.t0, 0, 0.1); a.t0 = t;
    const cradles = readState(a, t, dt);
    sea(ctx, a, t);
    spark(ctx, t);
    pierFoam(ctx, t);
    const ps = [pan(ctx, a, 0, cradles, t), pan(ctx, a, 1, cradles, t)];
    bridge(ctx, a, t);
    chains(ctx, a, ps[0], 0); chains(ctx, a, ps[1], 1);
    beam(ctx, a, t);
  }

  // where pan i is drawn just now (the same numbers pan() uses): a weight in a cradle is moved with it (ormun-view.js)
  function panPose(a, i, t) {
    const d = i ? a.tilt : -a.tilt, bob = Math.sin(t * 0.8 + i * 2.1) * 1.4 + Math.sin(t * 1.9 + i) * 0.5;
    const hv = a.heave && a.heave[i];
    return { k: 1 - 0.011 * d + (hv ? hv.k : 0), cx: PANS[i].x + (hv ? hv.x : 0), cy: PANS[i].y + 3 * d + bob + (hv ? hv.y : 0) };
  }

  return { buildScales, scalesLife, panPose, PAN_R, PANS, BR, FUL, BEAM_Y, SPARK, CRADLES };
})();

ArenaView.buildScales = OR_ROOM.buildScales;
ArenaView.scalesLife = OR_ROOM.scalesLife;
