// Queen Skitterra: what her blows feel like when they land, and the Silk Reel's drag.
// The floor tells (red damage, blue shares, the ghost chain) are in boss-tells.js block S; the casting wind-ups and the other
// landings are in boss-vfx.js; this file is the beat on top of them, reached from boss-vfx.js impact() through SK_FX (every call
// guarded by `typeof SK_FX !== 'undefined'`, and impact() returns false so the older landing still plays):
//   - THE LEG: a Lunge strike is a jointed chitin leg that comes down the cone and drives into the stone, with a claw burst,
//     silk fibres flying and a web of cracks at the tip; Strand Reel's silk twangs like a plucked string; From the Dark lands
//     in a star of snapped threads;
//   - hit-stop and a push of the camera on the big ones (never more than once in a short while);
//   - THE REEL'S LINE: gap() and pullPath() read the floor the Collapse has taken, for main.js's drag, the host's bots and
//     boss-tells.js drawReels: the silk drags you in a straight line but stops dead at the brink of fallen floor, taut, and
//     holds there (dash to snap it).

const SK_FX = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const S = { camAt: -99, legAt: -99 };

  // the camera holds for a beat when something big lands (main.js FX.cam); never more than once in a short while
  function cam(stop = 0.06, punch = 0.03, dur = 0.45, gap = 2.0) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }
  // white fibres flung off a snapped strand
  function fibres(x, y, n, dirx, diry, spread = 140) {
    for (let i = 0; i < n; i++) VFX.spawn({ x: x + rand(-14, 14), y: y + rand(-10, 10), z: rand(10, 40), vx: dirx * rand(60, 200) + rand(-spread, spread) * 0.4, vy: diry * rand(60, 200) + rand(-spread, spread) * 0.4,
      vz: rand(30, 120), g: 260, life: rand(0.45, 0.8), size: rand(9, 14), color: '#ffffff', stretch: 4.5, vr: rand(-8, 8) });
  }

  // a Lunge strike: her leg, jointed, comes down the cone and drives in. The tip is where the old claw burst already is.
  function legStab(tg, H) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    let L = 0; while (L < 640 && ARENA.sd(s.x + ca * L, s.y + sa * L) < -30) L += 16;
    if (L < 160) return;
    const tip = Math.min(L, 520), px = -sa, py = ca;
    VFX.fx({ dur: 0.42, layer: 'air', draw: (c, p, t, e) => {
      const drive = easeOut(Math.min(1, p / 0.22)), k = e.a * (1 - Math.max(0, p - 0.45) / 0.55), lift = (1 - drive) * 150, reach = 70 + (tip - 70) * drive;
      const pts = [0, 0.34, 0.68, 1].map((q, i) => {
        const d = 50 + (reach - 50) * q, up = Math.sin(q * Math.PI) * 78 * (1 - drive * 0.7) + lift * (1 - q * 0.5);
        return [s.x + ca * d + px * (i === 1 ? 6 : 0), s.y + sa * d + py * (i === 1 ? 6 : 0) - up - 14];
      });
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = k;
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = '#14081c'; c.lineWidth = 15; c.stroke();
      c.strokeStyle = '#3a2448'; c.lineWidth = 10; c.stroke();
      c.strokeStyle = 'rgba(255,176,220,0.55)'; c.lineWidth = 2; c.stroke();
      for (const [x, y] of pts.slice(1, 3)) { c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fillStyle = '#24152e'; c.fill(); c.strokeStyle = '#14081c'; c.lineWidth = 2; c.stroke(); }
      // the claw at its end: a hooked red-pink spike
      const [qx, qy] = pts[3], [wx, wy] = pts[2], ang = Math.atan2(qy - wy, qx - wx), ux = Math.cos(ang), uy = Math.sin(ang);
      c.beginPath(); c.moveTo(qx - uy * 8, qy + ux * 8); c.lineTo(qx + ux * 34, qy + uy * 34); c.lineTo(qx + uy * 8, qy - ux * 8); c.closePath();
      c.fillStyle = '#d6304a'; c.fill(); c.strokeStyle = '#14081c'; c.lineWidth = 2; c.stroke();
      c.restore();
      VFX.glowAt(c, qx + ux * 30, qy + uy * 30, 40 * (1 - p * 0.5), '#ff7ac0', 0.5 * k);
    } });
    const tx = s.x + ca * (tip + 24), ty = s.y + sa * (tip + 24);
    H.after(0.09, () => {
      VFX.shock(tx, ty, { r: 120, color: '#ffb0dc', w: 5, dur: 0.4, flat: 0.72 });
      VFX.shock(tx, ty, { r: 70, color: '#ffffff', w: 3, dur: 0.3, flat: 0.72, delay: 0.05 });
      fibres(tx, ty, 6, ca * 0.6, sa * 0.6, 200);
      // a little web of cracks round the puncture
      try { H.AFT.decal(tx, ty, { style: 'crack', r: 60, dur: 7, a: 0.55, seed: tx * 0.013 + ty * 0.007 }); } catch (e) { /* cosmetic */ }
    });
  }

  // Strand Reel: the strand twangs like a plucked string when it goes taut, and the silk at her end whips
  function strandTwang(tg) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), px = -sa, py = ca, L = Math.min(s.len, 900);
    VFX.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), amp = 26 * Math.exp(-p * 6) * Math.sin(p * 40);
      for (const off of [-9, 0, 9]) VFX.neonPath(c, '#f4f0ff', 2.2, k * 0.8, () => {
        for (let i = 0; i <= 18; i++) { const q = i / 18, w = Math.sin(q * Math.PI) * amp; const x = s.x + ca * L * q + px * (off + w), y = s.y + sa * L * q + py * (off + w) - 34; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      });
    } });
    cam(0.04, 0.02, 0.35, 1.5);
  }

  // From the Dark / Ceiling Ambush: a star of snapped threads thrown out from where she landed
  function ambushStar(tg) {
    const s = tg.live;
    VFX.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p), R0 = s.r * 0.7, R1 = s.r * (1.1 + 1.4 * easeOut(p));
      c.save(); ARENA.trace(c, 2); c.clip();
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + 0.2, w = (i % 3 === 0 ? 1.4 : 0.9);
        VFX.neonPath(c, '#e8dcff', 1.6 * w, k * 0.8, () => { c.moveTo(s.x + Math.cos(a) * R0, s.y + Math.sin(a) * R0 * 0.8); c.lineTo(s.x + Math.cos(a) * R1, s.y + Math.sin(a) * R1 * 0.8); });
      }
      c.restore();
    } });
    cam(0.07, 0.04, 0.5, 1.5);
  }

  // ---------------------------------------------------------------- the revamp: Fang Strike, the cocoon prop, the Extreme moves
  // (all drawn from here: the tell and the prop hook are one line each in boss-tells.js get() and boss-vfx.js propFx(); the rest wraps
  // ArenaView's own methods below, so no shared file carries it)
  const easeIn = p => p * p;
  const hash = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  const DANGER = () => (typeof BossTells !== 'undefined' && BossTells.COL && BossTells.COL.danger) || '#ff3b2f';
  const CRADLE_COL = ['#e8c860', '#b48cff'];   // (the chain marks' colours, skitterra.js: pair one gold, pair two violet)

  // segment crossing: the point where a-b meets c-d, or null
  function segPoint(ax, ay, bx, by, cx, cy, dx, dy) {
    const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(d) < 1e-6) return null;
    const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    return u > 0 && u < 1 && v > 0 && v < 1 ? { x: ax + (bx - ax) * u, y: ay + (by - ay) * u } : null;
  }

  // Fang Strike (tag 'fangstrike', the tank's own lane): the lane darkens, a pale fang-line sharpens down its middle, and a dashed strand
  // shows where the silk will be left (its knot ringed); two fangs hang over her mouth and come down as it lands. Red is the lane.
  function fangStrikeTell(ctx, tg, s, p, k, t) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len || 1300, 1300);
    ctx.save(); SHAPES.trace(ctx, s);
    ctx.fillStyle = rgba('#24082a', (0.16 + 0.24 * p) * k); ctx.fill(); ctx.clip();
    // the fang-line: a long tapered wedge, thin at her mouth's end, sharpening as it is set
    const w0 = 3 + 6 * p, R0 = 90;
    const g = ctx.createLinearGradient(s.x + ca * R0, s.y + sa * R0, s.x + ca * 900, s.y + sa * 900);
    g.addColorStop(0, rgba('#ff7ac0', (0.3 + 0.5 * p) * k)); g.addColorStop(1, rgba('#ff7ac0', 0.04 * k));
    ctx.beginPath(); ctx.moveTo(s.x + ca * R0 - sa * w0, s.y + sa * R0 + ca * w0); ctx.lineTo(s.x + ca * L, s.y + sa * L); ctx.lineTo(s.x + ca * R0 + sa * w0, s.y + sa * R0 - ca * w0); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.moveTo(s.x + ca * R0, s.y + sa * R0); ctx.lineTo(s.x + ca * Math.min(L, 900), s.y + sa * Math.min(L, 900));
    ctx.strokeStyle = rgba('#ffe0f2', (0.2 + 0.5 * p) * k); ctx.lineWidth = 1.5; ctx.stroke();
    // where the strand will lie: dashed silk, the knot's ring at its end (the same walk the script makes to the wall)
    let len = 200; while (len < 720 && ARENA.sd(s.x + ca * (len + 30), s.y + sa * (len + 30)) < -90) len += 30;
    if (len >= 260) {
      ctx.save(); ctx.setLineDash([9, 9]); ctx.lineDashOffset = -t * 18; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x + ca * 130, s.y + sa * 130); ctx.lineTo(s.x + ca * len, s.y + sa * len);
      ctx.strokeStyle = rgba('#f4f0ff', (0.22 + 0.4 * p) * k); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      circle(ctx, s.x + ca * (len - 34), s.y + sa * (len - 34), 13 + Math.sin(t * 5) * 1.5, null, rgba('#f4f0ff', (0.3 + 0.4 * p) * k), 2);
    }
    ctx.restore();
  }
  function fangStrikeAir(ctx, tg, s, p, k, t) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), up = (1 - easeIn(p)) * 64 + 10, tilt = -0.5 * (1 - p);
    ctx.save(); ctx.globalAlpha = (0.4 + 0.5 * p) * k;
    for (const off of [-13, 13]) {
      const bx = s.x + ca * 64 - sa * off, by = s.y + sa * 64 + ca * off - 30 - up;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(s.angle + tilt + (off < 0 ? -0.06 : 0.06));
      poly(ctx, [-10, -6, 20, -2.5, 46, 0, 20, 2.5, -10, 6], '#f0e8d4', OUT, 2);
      poly(ctx, [30, -1.8, 46, 0, 30, 1.8], '#d6304a', null);
      ctx.restore();
    }
    ctx.restore();
    glow(ctx, s.x + ca * 64, s.y + sa * 64 - 40 - up, 30, '#ff7ac0', (0.1 + 0.3 * p) * k);
  }
  function fangStrikeHit(tg, H) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = 720;
    VFX.fx({ dur: 0.4, layer: 'air', draw: (c, p, t, e) => {
      const reach = easeOut(Math.min(1, p / 0.25)), k = e.a * Math.pow(1 - p, 1.5);
      VFX.neonPath(c, '#ffb0dc', 5 * (1 - p * 0.5), k, () => { c.moveTo(s.x + ca * 80, s.y + sa * 80 - 14); c.lineTo(s.x + ca * (80 + (L - 80) * reach), s.y + sa * (80 + (L - 80) * reach) - 14); });
      VFX.glowAt(c, s.x + ca * (80 + (L - 80) * reach), s.y + sa * (80 + (L - 80) * reach) - 14, 46 * (1 - p * 0.5), '#ff7ac0', 0.5 * k);
    } });
    fibres(s.x + ca * 140, s.y + sa * 140, 6, ca * 0.7, sa * 0.7, 180);
    VFX.shock(s.x + ca * 110, s.y + sa * 110, { r: 90, color: '#ffb0dc', w: 4, dur: 0.35, flat: 0.72 });
    cam(0.04, 0.02, 0.3, 1.8);
  }

  // the Cocoon Drop's cocoon, left standing as cover (prop kind 'cocoon', r30, two hits, cracked on the second): a pale silk egg bound
  // in bands, guy-strands to the floor and threads up into the dark; cracked, it splits and a sick green light leaks from it
  const SEEN = new Set();
  function cocoonProp(ctx, pr, last, t) {
    const { x, y, r } = pr, h = 72, age = t - (pr.born ?? t - 1), sway = Math.sin(t * 1.1 + pr.id) * 1.4;
    const sq = age < 0.35 ? 1 + 0.16 * Math.sin(age / 0.35 * Math.PI) * (1 - age / 0.35) : 1;   // (settles with a small squash when it lands)
    if (!SEEN.has(pr.id) && age < 0.6) {
      SEEN.add(pr.id);
      try { VFX.burst(x, y - 10, { color: '#f4f0ff', n: 8, speed: 140, size: 8 }); VFX.shock(x, y, { r: 80, color: '#f4f0ff', w: 4, dur: 0.4, flat: 0.72 }); fibres(x, y, 5, 0, -0.3, 160); } catch (e) { /* cosmetic */ }
    }
    ellipse(ctx, x + 6, y + 8, r * 1.35, r * 0.7, 0, 'rgba(0,0,0,0.5)');
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {   // guy-strands pegged to the floor
      const a = i * TAU / 6 + 0.4 + hash(i, pr.id) * 0.3, d = r * (1.7 + hash(i + 9, pr.id) * 0.7);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.6, y - 4 + Math.sin(a) * r * 0.3); ctx.lineTo(x + Math.cos(a) * d, y + 6 + Math.sin(a) * d * 0.5);
      ctx.strokeStyle = 'rgba(236,232,250,0.5)'; ctx.lineWidth = 1.3; ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y + 4); ctx.scale(1 / sq, sq); ctx.translate(-x, -(y + 4));
    const body = () => {
      ctx.beginPath(); ctx.moveTo(x, y + 4);
      ctx.bezierCurveTo(x - r * 1.35, y + 4, x - r * 1.2, y - h * 0.55, x + sway, y - h);
      ctx.bezierCurveTo(x + r * 1.2, y - h * 0.55, x + r * 1.35, y + 4, x, y + 4);
      ctx.closePath();
    };
    body();
    const g = ctx.createLinearGradient(x - r * 1.3, 0, x + r * 1.3, 0);
    g.addColorStop(0, '#6a6480'); g.addColorStop(0.3, '#d6d2e6'); g.addColorStop(0.62, '#a8a2be'); g.addColorStop(1, '#585270');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); body(); ctx.clip();
    // silk wound round it in bands, and long strands drawn over the bands
    for (let i = 0; i < 7; i++) {
      const yy = y - h * (0.1 + i * 0.125), dir = i % 2 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x - r * 1.5, yy + 5 * dir); ctx.quadraticCurveTo(x, yy + 14, x + r * 1.5, yy - 5 * dir);
      ctx.strokeStyle = 'rgba(244,240,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 1.5, yy + 9 * dir); ctx.quadraticCurveTo(x, yy + 19, x + r * 1.5, yy + 1 * dir);
      ctx.strokeStyle = 'rgba(60,52,80,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const d of [-0.5, -0.1, 0.35]) { ctx.beginPath(); ctx.moveTo(x + r * d, y + 4); ctx.quadraticCurveTo(x + r * d * 1.5 + sway, y - h * 0.5, x + sway * 0.6, y - h); ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1; ctx.stroke(); }
    ellipse(ctx, x - r * 0.42, y - h * 0.5, 4.5, 15, 0.12, 'rgba(255,255,255,0.4)');
    if (last) {
      // split down the front: a dark seam with the green light of what is inside, torn silk lifting at the lips
      ctx.beginPath(); ctx.moveTo(x + 2, y - h * 0.86); ctx.lineTo(x - 5, y - h * 0.68); ctx.lineTo(x + 5, y - h * 0.5); ctx.lineTo(x - 4, y - h * 0.32); ctx.lineTo(x + 3, y - h * 0.12);
      ctx.lineJoin = 'round'; ctx.strokeStyle = '#7ad22a'; ctx.lineWidth = 7; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 6); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#141018'; ctx.lineWidth = 3.4; ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; body(); ctx.stroke();
    ctx.restore();
    if (last) {
      glow(ctx, x, y - h * 0.5, 34, '#8aff4a', 0.22 + 0.1 * Math.sin(t * 6));
      for (const [dx, dy, a] of [[-4, -0.82, -2.2], [6, -0.46, -0.9], [-5, -0.3, -2.6]]) poly(ctx, [x + dx, y + dy * h, x + dx + Math.cos(a) * 11, y + dy * h + Math.sin(a) * 11, x + dx + Math.cos(a + 0.5) * 6, y + dy * h + Math.sin(a + 0.5) * 6], 'rgba(240,236,252,0.9)', OUT, 1);
    }
    for (let i = 0; i < 2; i++) { const q = (t * 0.25 + i * 0.5 + pr.id * 0.2) % 1; glow(ctx, x + sway + Math.sin(q * 6 + i) * 4, y - h - q * 40, 6, '#f4f0ff', 0.25 * (1 - q)); }   // (strands lifting into the dark)
  }
  // the cocoon hit and broken: silk shreds and a little ooze (every other prop keeps boss-vfx.js propFx)
  function propFx(msg) {
    if (msg.kind !== 'cocoon') return false;
    const x = msg.x, y = msg.y;
    if (msg.k === 'chip') {
      VFX.burst(x, y - 30, { color: '#f4f0ff', n: 8, speed: 150, size: 8 });
      fibres(x, y - 10, 5, 0, -0.4, 180);
      VFX.splash(x, y, { color: '#b8e070', n: 6, speed: 0.8 });
      cam(0.02, 0.01, 0.2, 0.6);
    } else if (msg.k === 'break') {
      const r = msg.r || 30;
      VFX.burst(x, y - 34, { color: '#f4f0ff', color2: '#ffffff', n: 18, speed: 230, size: 10 });
      fibres(x, y - 14, 12, 0, -0.5, 240);
      VFX.splash(x, y, { color: '#a8d860', n: 12, speed: 1.2 });
      VFX.smoke(x, y - 10, { color: '#e8e4f4', n: 7, size: 32, a: 0.5, speed: 90, r: r * 0.6 });
      VFX.shock(x, y, { r: r * 2.6, color: '#f4f0ff', w: 5, dur: 0.45, flat: 0.72 });
      cam(0.04, 0.02, 0.3, 1);
    } else return false;
    return true;
  }

  // Imprint (Extreme): the hatchling fixed on a hero sits in an amber shell until it is led through an acid pool.
  const IMP = new Map();   // add id -> { x, y }: the ids the host named, with the position the adds message last gave (drawAdd matches by position)
  function impShell(ctx, x, y, sc, t, enr) {
    const R = 24 * sc, cx = x, cy = y - 4 * sc, pulse = 0.5 + 0.5 * Math.sin(t * 3.2 + x * 0.01);
    ctx.save();
    glow(ctx, cx, cy, R * 1.8, '#ff9a3a', 0.16 + 0.1 * pulse);
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(255,214,150,0.14)'); g.addColorStop(0.75, 'rgba(255,170,70,0.2)'); g.addColorStop(1, 'rgba(255,140,40,0.42)');
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.92, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(42,20,8,0.55)'; ctx.lineWidth = 4.5; ctx.stroke();
    ctx.strokeStyle = rgba('#ffb25a', 0.8 + 0.15 * pulse); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, 3.4, 4.5); ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 3; i++) {   // the plates of the shell
      const a = i * TAU / 3 + 0.6;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.25, cy + Math.sin(a) * R * 0.23); ctx.lineTo(cx + Math.cos(a) * R * 0.97, cy + Math.sin(a) * R * 0.9);
      ctx.strokeStyle = 'rgba(120,56,12,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
    void enr;
  }
  function washFx(x, y) {
    // the shell dissolving in the acid: it rings out and goes, amber flakes sink, the pool hisses
    VFX.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p);
      c.save(); c.globalAlpha = k; c.lineWidth = 3 * (1 - p) + 1; c.strokeStyle = '#ffb25a';
      c.beginPath(); c.ellipse(x, y - 8, 26 + 34 * easeOut(p), (26 + 34 * easeOut(p)) * 0.9, 0, 0, TAU); c.stroke();
      c.restore();
      VFX.glowAt(c, x, y - 8, 56 * (1 - p * 0.5), '#ffb25a', 0.3 * k);
    } });
    for (let i = 0; i < 9; i++) { const a = rand(0, TAU), sp = rand(40, 150); VFX.spawn({ x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 10, z: rand(10, 36), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(20, 90), g: 220, life: rand(0.5, 0.9), size: rand(7, 11), color: '#ffb25a', kind: 'shard', add: false, vr: rand(-6, 6) }); }
    for (let i = 0; i < 5; i++) VFX.spawn({ x: x + rand(-22, 22), y: y + rand(-12, 12), z: 4, vx: rand(-8, 8), vz: rand(30, 60), drag: 0.02, life: rand(0.8, 1.2), size: 12, size1: 30, color: '#d8ff9a', kind: 'smoke', add: false, a: 0.35, fadeIn: 0.15 });
    VFX.shock(x, y, { r: 76, color: '#d8ff7a', w: 3, dur: 0.4, flat: 0.72 });
    cam(0.015, 0.008, 0.2, 1);
  }
  // acid pools (Extreme: the venom pool at radius 110 for 50 s): the venom look with a corroding rim, and shell flakes sinking in it
  function acidPool(p) { return p.tag === 'venom' && Math.abs(p.r - 110) < 0.5 && p.end - p.start >= 49; }
  function acidSheen(ctx, p, r, k, t) {
    ctx.save(); ctx.globalAlpha = k;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.02, r * 1.02, 0, 0, TAU); ctx.strokeStyle = 'rgba(236,255,130,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 3; i++) {   // ripples where it eats
      const q = (t * 0.45 + i / 3 + p.id * 0.21) % 1, a = hash(i + Math.floor(t * 0.45 + i / 3 + p.id * 0.21), p.id) * TAU, d = r * 0.55 * hash(i + 3, p.id + Math.floor(t * 0.45));
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.8, 6 + q * 26, (6 + q * 26) * 0.7, 0, 0, TAU);
      ctx.strokeStyle = rgba('#e8ff9a', 0.55 * (1 - q)); ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {   // amber flakes of shell, turning slowly as they go under
      const q = (t * 0.2 + i / 5 + p.id * 0.13) % 1, a = i * 1.7 + p.id + t * 0.1, d = r * (0.2 + 0.55 * hash(i, p.id));
      ctx.save(); ctx.translate(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.8); ctx.rotate(a * 2 + t);
      ctx.globalAlpha = k * 0.7 * Math.sin(q * Math.PI); ctx.scale(1 - q * 0.5, 0.6 - q * 0.3);
      ctx.beginPath(); ctx.arc(0, 0, 6, 0.3, Math.PI - 0.3); ctx.closePath(); ctx.fillStyle = '#ffb25a'; ctx.fill(); ctx.restore();
    }
    ctx.restore();
    for (let i = 0; i < 2; i++) { const q = (t * 0.3 + i / 2 + p.id * 0.17) % 1; glow(ctx, p.x + Math.cos(i * 3 + p.id) * r * 0.4, p.y - q * 70, 22 + q * 16, '#d4ff7a', 0.2 * Math.sin(q * Math.PI) * k); }
  }

  // Lure (Extreme): the drop crushing a clutch, or landing on bare floor and splitting the nearest one early
  function lureCrush(x, y) {
    VFX.shock(x, y, { r: 150, color: '#e8dcff', w: 6, dur: 0.45, flat: 0.72 });
    VFX.shock(x, y, { r: 80, color: '#ffffff', w: 3, dur: 0.3, flat: 0.72, delay: 0.04 });
    fibres(x, y, 8, 0, -0.2, 240);
    for (let i = 0; i < 7; i++) { const a = rand(0, TAU), sp = rand(80, 190); VFX.spawn({ x, y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(60, 160), g: 600, life: 0.55, size: 9, color: '#efeadb', kind: 'shard', add: false, vr: rand(-10, 10) }); }
    // the splat: flattened shell and goo left on the floor
    const bits = Array.from({ length: 12 }, () => { const a = rand(0, TAU), d = rand(8, 54); return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, s: rand(5, 10), r: rand(0, TAU), goo: Math.random() < 0.5 }; });
    VFX.fx({ dur: 7, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * 7, k = e.a * Math.min(1, life / 0.15) * Math.min(1, (7 - life) / 1.5);
      c.save(); c.globalAlpha = k;
      c.beginPath(); c.ellipse(x, y, 50, 36, 0, 0, TAU); c.fillStyle = 'rgba(190,210,110,0.3)'; c.fill();
      for (const b of bits) {
        if (b.goo) { c.fillStyle = 'rgba(150,210,70,0.7)'; c.beginPath(); c.ellipse(b.x, b.y, b.s * 1.1, b.s * 0.55, b.r, 0, TAU); c.fill(); continue; }
        c.save(); c.translate(b.x, b.y); c.rotate(b.r); c.beginPath(); c.arc(0, 0, b.s, 0.25, Math.PI - 0.25); c.closePath(); c.fillStyle = '#ece6d6'; c.fill(); c.strokeStyle = '#1a1622'; c.lineWidth = 1.2; c.stroke(); c.restore();
      }
      c.restore();
    } });
    cam(0.05, 0.03, 0.4, 1.5);
  }
  function lureHatch(x, y) {
    VFX.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), R = 34 + 40 * easeOut(p);
      c.save(); c.globalAlpha = k; c.lineWidth = 3; c.strokeStyle = '#b8ff5a'; c.beginPath(); c.ellipse(x, y - 6, R, R * 0.8, 0, 0, TAU); c.stroke(); c.restore();
      VFX.glowAt(c, x, y - 6, 60 * (1 - p * 0.4), '#8aff4a', 0.3 * k);
    } });
    VFX.splash(x, y, { color: '#8ad82a', n: 8 });
    cam(0.02, 0.012, 0.25, 1.5);
  }

  // Cat's Cradle (Extreme): a silk strand tied between each pair, in the pair's chain colour. It hums tauter as the web nears its tightening;
  // where one pair's strand crosses the other's a red knot burns (red is the damage), and each second it does the party is burnt.
  const CR = { segs: new Map(), t: -1, n: 0 };
  function cradleStrand(ctx, a, b, th, t) {
    if (CR.t !== t) { CR.t = t; CR.n = 0; }
    let rec = CR.segs.get(th); if (!rec) { rec = {}; CR.segs.set(th, rec); }
    const idx = rec.idx = CR.n++ % 2, col = CRADLE_COL[idx];
    const ax = a.x, ay = a.y - 20, bx = b.x, by = b.y - 20;
    rec.ax = ax; rec.ay = ay; rec.bx = bx; rec.by = by; rec.t = t;
    let X = null;
    for (const [o, r] of CR.segs) {
      if (o === th) continue;
      if (t - r.t > 3) { CR.segs.delete(o); continue; }
      if (t - r.t > 0.25) continue;
      X = X || segPoint(ax, ay, bx, by, r.ax, r.ay, r.bx, r.by);
    }
    const span = Math.max(0.1, th.end - th.start), p = clamp((t - th.start) / span, 0, 1), d = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / d, ny = (bx - ax) / d, sag = (1 - p) * 8, hum = Math.sin(t * (14 + p * 30) + idx * 2) * (0.6 + 2.2 * p);
    const mx = (ax + bx) / 2 + nx * (sag + hum), my = (ay + by) / 2 + ny * (sag + hum) + sag * 0.6;
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.strokeStyle = 'rgba(10,8,14,0.5)'; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.28 + 0.2 * p); ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = 4.5; ctx.stroke();
    ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 20; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = rgba('#ffffff', 0.55 + 0.4 * p); ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 2; i++) {   // beads of light running along it, faster as it nears the tightening
      const q = (t * (0.5 + p * 2) + i * 0.5 + idx * 0.25) % 1, s = 1 - q;
      glow(ctx, s * s * ax + 2 * s * q * mx + q * q * bx, s * s * ay + 2 * s * q * my + q * q * by, 11, col, 0.75);
    }
    for (const [ex, ey] of [[ax, ay], [bx, by]]) { circle(ctx, ex, ey, 6, rgba(col, 0.95), OUT, 1.6); circle(ctx, ex - 1.5, ey - 1.8, 1.8, 'rgba(255,255,255,0.8)'); }
    ctx.restore();
    if (X) {
      const live = t - th.start > 2.4, pu = 0.5 + 0.5 * Math.sin(t * 9), R = DANGER();
      glow(ctx, X.x, X.y, 40 + 14 * pu, R, (live ? 0.42 : 0.2) + 0.12 * pu);
      ctx.save(); ctx.globalAlpha = live ? 1 : 0.55;
      poly(ctx, [X.x, X.y - 10, X.x + 10, X.y, X.x, X.y + 10, X.x - 10, X.y], rgba(R, 0.85), OUT, 1.5);
      circle(ctx, X.x, X.y, 17 + 4 * pu, null, rgba('#ffd0c8', 0.8), 1.6);
      ctx.restore();
    }
  }
  // each second the strands cross: a spark at the crossing and both strands flaring red
  function cradleBurn(msg) {
    const [A, B] = msg.pts || [];
    if (!A || !B) return;
    const X = segPoint(A[0], A[1] - 20, A[2], A[3] - 20, B[0], B[1] - 20, B[2], B[3] - 20) || { x: (A[0] + A[2]) / 2, y: (A[1] + A[3]) / 2 - 20 };
    VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.pow(1 - p, 1.4);
      for (const [x1, y1, x2, y2] of [A, B]) VFX.neonPath(c, DANGER(), 3.5, k, () => { c.moveTo(x1, y1 - 20); c.lineTo(x2, y2 - 20); });
      VFX.glowAt(c, X.x, X.y, 70 * (1 - p * 0.4), '#ff6a4a', 0.55 * k);
    } });
    VFX.shock(X.x, X.y + 20, { r: 90, color: '#ff6a4a', w: 4, dur: 0.4, flat: 0.72 });
    VFX.sparks(X.x, X.y, { color: '#ffd0a0', n: 10, speed: 260 });
    for (const [x1, y1] of [[A[0], A[1]], [A[2], A[3]], [B[0], B[1]], [B[2], B[3]]]) VFX.hit(x1, y1, '#ff9a7a', 1);
    cam(0.02, 0.012, 0.25, 0.9);
  }
  // the web tightens: the strands snap taut and thrum, and a ring draws in on the four
  function cradleTighten(now) {
    const segs = [...CR.segs.values()].filter(r => r.t != null && now - r.t < 1.5);
    if (!segs.length) return;
    let cx = 0, cy = 0; for (const r of segs) { cx += (r.ax + r.bx) / 2; cy += (r.ay + r.by) / 2; } cx /= segs.length; cy /= segs.length;
    VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), amp = 18 * Math.exp(-p * 7) * Math.sin(p * 46);
      for (const r of segs) {
        const L = Math.hypot(r.bx - r.ax, r.by - r.ay) || 1, nx = -(r.by - r.ay) / L, ny = (r.bx - r.ax) / L;
        VFX.neonPath(c, CRADLE_COL[segs.indexOf(r) % 2], 4, k, () => { for (let i = 0; i <= 16; i++) { const q = i / 16, w = Math.sin(q * Math.PI) * amp; (i ? c.lineTo : c.moveTo).call(c, r.ax + (r.bx - r.ax) * q + nx * w, r.ay + (r.by - r.ay) * q + ny * w); } });
      }
      VFX.glowAt(c, cx, cy, 120 * (1 - p), '#f4f0ff', 0.3 * k);
    } });
    VFX.shock(cx, cy + 20, { r: 320, color: '#f4f0ff', w: 6, dur: 0.6, flat: 0.72 });
    VFX.shock(cx, cy + 20, { r: 190, color: '#b48cff', w: 4, dur: 0.5, flat: 0.72, delay: 0.08 });
    cam(0.05, 0.03, 0.45, 2);
  }

  // roomev moments from the host (ArenaView.roomEvent hands them over before its own bookkeeping)
  function roomEv(msg, now) {
    switch (msg.k) {
      case 'cradle-burn': cradleBurn(msg); break;
      case 'cradle-tighten': cradleTighten(now); break;
      case 'lure-crush': lureCrush(msg.x, msg.y); break;
      case 'lure-hatch': lureHatch(msg.x, msg.y); break;
      case 'imprint': hookAdds(); for (const id of msg.ids || []) IMP.set(id, { x: null, y: null }); break;
      case 'imprint-wash': IMP.delete(msg.id); washFx(msg.x, msg.y); break;
      default: break;
    }
  }
  // the host's adds message, seen first: where each fixed hatchling stands now (main.js registers one handler per message type, so this wraps it once)
  function hookAdds() {
    if (typeof Net === 'undefined' || !Net.handlers) return;
    const h = Net.handlers.adds;
    if (!h || h.skWrapped) return;
    const w = msg => {
      try {
        if (IMP.size && msg && msg.l) {
          const live = new Set();
          for (const a of msg.l) { live.add(a[0]); const m = IMP.get(a[0]); if (m) { m.x = a[2]; m.y = a[3]; } }
          for (const id of [...IMP.keys()]) if (!live.has(id)) IMP.delete(id);
        }
      } catch (e) { /* cosmetic */ }
      return h(msg);
    };
    w.skWrapped = true; Net.handlers.adds = w;
  }

  // ---------------------------------------------------------------- the hooks into ArenaView and drawAdd (this file loads after both)
  if (typeof ArenaView !== 'undefined') {
    const baseProp = ArenaView.drawProp, baseEvent = ArenaView.roomEvent, baseTether = ArenaView.tether, baseVenom = ArenaView.venomPool, baseNew = ArenaView.newRoom;
    ArenaView.drawProp = function (ctx, pr, t, room) {
      if (pr.kind === 'cocoon') {
        const last = pr.maxHp > 1 && pr.hp <= 1;
        ctx.save(); ctx.globalAlpha = Math.min(1, (t - (pr.born ?? t - 1)) / 0.25);
        try { cocoonProp(ctx, pr, last, t); } catch (e) { ctx.restore(); return baseProp.call(this, ctx, pr, t, room); }
        ctx.restore(); return;
      }
      return baseProp.call(this, ctx, pr, t, room);
    };
    ArenaView.roomEvent = function (room, msg, now, ...rest) {
      if (msg && typeof msg.k === 'string') { try { roomEv(msg, now); } catch (e) { /* cosmetic */ } }
      return baseEvent.call(this, room, msg, now, ...rest);
    };
    ArenaView.tether = function (ctx, a, b, th, t, hard) {
      if (th.tag !== 'cradle') return baseTether.call(this, ctx, a, b, th, t, hard);
      try { cradleStrand(ctx, a, b, th, t); } catch (e) { return baseTether.call(this, ctx, a, b, th, t, hard); }
    };
    ArenaView.venomPool = function (ctx, p, r, k, t) {
      baseVenom.call(this, ctx, p, r, k, t);
      if (acidPool(p)) acidSheen(ctx, p, r, k, t);
    };
    ArenaView.newRoom = function () { IMP.clear(); SEEN.clear(); CR.segs.clear(); return baseNew.call(this); };
  }
  if (typeof drawAdd === 'function') {
    const baseAdd = drawAdd;
    drawAdd = function (ctx, kind, x, y, angle, st, enraged, scale = 1) {
      baseAdd(ctx, kind, x, y, angle, st, enraged, scale);
      if (kind !== 'spiderling' || !IMP.size) return;
      let hit = false;
      for (const m of IMP.values()) if (m.x != null && Math.hypot(m.x - x, m.y - y) < 110) { hit = true; break; }
      if (hit) impShell(ctx, x, y, scale * (enraged ? 1.2 : 1), nowS(), enraged);
    };
  }
  const TELLS = {
    fangstrike: { color: '#ffb0dc', ground: fangStrikeTell, air: fangStrikeAir },
  };
  const tell = tag => TELLS[tag] || null;

  function impact(tg, msg, ctx, H) {
    const tag = tg.tag;
    try {
      if (tag === 'fangstrike') fangStrikeHit(tg, H);
      else if (tag === 'lunge') { legStab(tg, H); cam(0.035, 0.018, 0.3, 1.6); }
      else if (tag === 'strand') strandTwang(tg);
      else if (tag === 'ambush') ambushStar(tg);
      else if (tag === 'deluge') cam(0.05, 0.022, 0.5, 4);
      else if (tag === 'fang') cam(0.05, 0.026, 0.4, 2);
      else if (tag === 'buster') cam(0.07, 0.03, 0.45, 2.5);
      // the Moth Queen's moves (Hard, skitterra-moth.js)
      else if (typeof SK_MOTH !== 'undefined' && (tag === 'scalewave' || tag === 'scalewave2')) SK_MOTH.waveFx(tg, H);
      else if (typeof SK_MOTH !== 'undefined' && tag === 'flutter') SK_MOTH.flutterFx(tg, H);
      else if (typeof SK_MOTH !== 'undefined' && tag === 'moonlight') SK_MOTH.moonFx(tg, H);
    } catch (e) { /* cosmetic */ }
    return false;
  }

  // ---------------------------------------------------------------- the Reel's drag
  // Is this spot fallen floor (a Collapse ring that has gone, off the silk)? room: the live room (raid.room), floor[] with 'pit' entries.
  function gap(room, x, y) {
    if (!room || !room.floor) return false;
    const r = Math.hypot(x, y);
    for (const fl of room.floor) {
      if (fl.kind !== 'pit' || r < fl.r2 || r > fl.r) continue;
      let silk = false;
      for (const [x1, y1, x2, y2, w] of fl.paths || []) if (PROPS.segDist(x, y, x1, y1, x2, y2) < w / 2) { silk = true; break; }
      if (!silk) return true;
    }
    return false;
  }
  const LOOK = 22;   // she stops a stride before the lip, so the hero stands on floor
  // The straight line the silk drags (px, py) toward (bx, by) and where it stops: at the brink of fallen floor, or in front of her.
  function pullPath(room, px, py, bx, by, stop = 80) {
    const dx = bx - px, dy = by - py, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    let end = Math.max(0, d - stop), held = false;
    for (let s = 0; s < end; s += 8) {
      if (gap(room, px + ux * (s + LOOK), py + uy * (s + LOOK))) { end = s; held = true; break; }
    }
    return { x: px + ux * end, y: py + uy * end, held, ux, uy, len: end };
  }
  // main.js: one frame of the drag. Returns the distance to move (0 when the silk is held at the brink).
  function pullStep(room, px, py, bx, by, step) {
    const pp = pullPath(room, px, py, bx, by);
    return Math.max(0, Math.min(step, pp.len));
  }

  // ---------------------------------------------------------------- her body in the Dark Between
  // Up in the dark she is out of sight (only her shadow runs the cave); when a drop lands her body comes down with it, crouches on the
  // stone for the window (the room moment 'grounded': x, y, dur) and hauls itself up the silk again. pose() is called a frame
  // (main.js updateArena) and sets raid.skPose { alpha, oy, sx, sy, x, y } (null: drawn as ever) and the body's props.crouch / props.haul
  // (bosses.js). While she is down (and while she climbs away) she is drawn at the landing the 'grounded' moment names, not at the host's
  // position (x, y: null elsewhere), so she never slides or jumps however the host's updates arrive; coming down to the hub at the end she is drawn there.
  const DROPT = 0.2, SQUASH = 0.28, CLIMBT = 0.5;   // (CLIMBT: skitterra.js CLIMB keeps the host's body where she stands until it is over)
  const fall = s => { const u = Math.min(1, s / DROPT); return -(1 - u * u) * 360; };   // (a heavy drop: it speeds up as it falls)
  function pose(raid, now) {
    const ev = raid.room.ev, lo = ev.lightsout, gr = ev.grounded, P = raid.props, bd = raid.bossDraw;
    P.crouch = 0; P.haul = false;
    raid.skPose = null;
    SK_FX.hard = raid.mode === 'hard' || raid.mode === 'extreme';
    bd.vx = bd.x; bd.vy = bd.y; bd.va = 1;   // (where she is drawn and how much of her: the casts' gathering follows this, boss-vfx.js bx / by / bva)
    if (!lo || now < lo.start || now >= lo.end + 0.5) return;
    let out = { alpha: 0, oy: 0, sx: 1, sy: 1, x: null, y: null };
    const up = (s) => { const u = Math.min(1, s / CLIMBT); out = { alpha: 1 - u * u, oy: -u * u * 400, sx: 1, sy: 1, x: null, y: null }; P.haul = true; P.crouch = 1 - u; };
    const down = (s, hold) => {
      out = { alpha: Math.min(1, s / 0.07), oy: fall(s), sx: 1, sy: 1, x: null, y: null };
      P.crouch = 1;   // (legs splayed as she comes down)
      if (s > DROPT) { const k = Math.max(0, 1 - (s - DROPT) / SQUASH); out.sx = 1 + 0.14 * k; out.sy = 1 - 0.17 * k; P.crouch = hold ? 1 : k; }
    };
    if (now < lo.start + CLIMBT) up(now - lo.start);                      // into the dark: up the silk
    else if (now >= lo.end - DROPT) { down(now - (lo.end - DROPT), false); out.x = 0; out.y = 0; }   // back out of it: she drops to the hub as the light returns
    else if (gr && now >= gr.start && now < gr.end + CLIMBT) {
      const s = now - gr.start, left = gr.end - now;
      if (left > 0) { down(s, true); if (left < 0.45) out.oy -= (0.45 - left) * 18; }   // (she gathers herself, then goes)
      else up(-left);
      out.x = gr.x; out.y = gr.y;   // (on the spot she landed on, whatever the host's body is doing)
    }
    raid.skPose = out;
    bd.va = out.alpha; bd.vx = out.x != null ? out.x : bd.x; bd.vy = (out.y != null ? out.y : bd.y) + out.oy;
  }
  // the silk she hangs by, drawn from the top of the cave down to her while she falls or is hauled
  function thread(ctx, bd, pose) {
    if (!pose || pose.alpha < 0.03 || pose.oy > -10) return;
    const x = pose.x != null ? pose.x : bd.x, y = (pose.y != null ? pose.y : bd.y) + pose.oy;
    ctx.save(); ctx.globalAlpha = Math.min(1, pose.alpha + 0.4) * 0.8; ctx.strokeStyle = '#f4f0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + Math.sin(y * 0.01) * 4, y - 1400); ctx.stroke(); ctx.restore();
  }

  return { impact, tell, prop: propFx, gap, pullPath, pullStep, pose, thread, hard: false };
})();

