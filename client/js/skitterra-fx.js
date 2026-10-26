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

  function impact(tg, msg, ctx, H) {
    const tag = tg.tag;
    try {
      if (tag === 'lunge') { legStab(tg, H); cam(0.035, 0.018, 0.3, 1.6); }
      else if (tag === 'strand') strandTwang(tg);
      else if (tag === 'ambush') ambushStar(tg);
      else if (tag === 'deluge') cam(0.05, 0.022, 0.5, 4);
      else if (tag === 'fang') cam(0.05, 0.026, 0.4, 2);
      else if (tag === 'buster') cam(0.07, 0.03, 0.45, 2.5);
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
  // (main.js updateArena) and sets raid.skPose { alpha, oy, sx, sy } (null: drawn as ever) and the body's props.crouch / props.haul
  // (bosses.js). Her body is drawn at the host's position, which is already the landing point.
  const DROPT = 0.2, SQUASH = 0.28, CLIMBT = 0.65;
  const fall = s => { const u = Math.min(1, s / DROPT); return -(1 - u * u) * 360; };   // (a heavy drop: it speeds up as it falls)
  function pose(raid, now) {
    const ev = raid.room.ev, lo = ev.lightsout, gr = ev.grounded, P = raid.props;
    P.crouch = 0; P.haul = false;
    raid.skPose = null;
    if (!lo || now < lo.start || now >= lo.end + 0.5) return;
    let out = { alpha: 0, oy: 0, sx: 1, sy: 1 };
    const up = (s) => { const u = Math.min(1, s / CLIMBT); out = { alpha: 1 - u * u, oy: -u * u * 400, sx: 1, sy: 1 }; P.haul = true; P.crouch = 1 - u; };
    const down = (s, hold) => {
      out = { alpha: Math.min(1, s / 0.07), oy: fall(s), sx: 1, sy: 1 };
      P.crouch = 1;   // (legs splayed as she comes down)
      if (s > DROPT) { const k = Math.max(0, 1 - (s - DROPT) / SQUASH); out.sx = 1 + 0.14 * k; out.sy = 1 - 0.17 * k; P.crouch = hold ? 1 : k; }
    };
    if (now < lo.start + CLIMBT) up(now - lo.start);                      // into the dark: up the silk
    else if (now >= lo.end - DROPT) down(now - (lo.end - DROPT), false);   // back out of it: she drops to the hub as the light returns
    else if (gr && now >= gr.start && now < gr.end + CLIMBT) {
      const s = now - gr.start, left = gr.end - now;
      if (left > 0) { down(s, true); if (left < 0.45) out.oy -= (0.45 - left) * 18; }   // (she gathers herself, then goes)
      else up(-left);
    }
    raid.skPose = out;
  }
  // the silk she hangs by, drawn from the top of the cave down to her while she falls or is hauled
  function thread(ctx, bd, pose) {
    if (!pose || pose.alpha < 0.03 || pose.oy > -10) return;
    const x = bd.x, y = bd.y + pose.oy;
    ctx.save(); ctx.globalAlpha = Math.min(1, pose.alpha + 0.4) * 0.8; ctx.strokeStyle = '#f4f0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + Math.sin(y * 0.01) * 4, y - 1400); ctx.stroke(); ctx.restore();
  }

  return { impact, gap, pullPath, pullStep, pose, thread };
})();

