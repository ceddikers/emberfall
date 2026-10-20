// Drawing for the raid arena: the floor, telegraphs, ground hazards and the boss's hitbox ring.
// Telegraphs show WHERE something will land. They never say what to do about it.

const hash01 = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const ArenaView = {
  floor: null, floorFor: null,

  // ------------------------------------------------------------------ floor (cached)
  // Drawn once per fight into a canvas that covers the room plus a margin of scenery around it. The room's shape
  // comes from ARENA (shapes.js): Grubnak cooks in a long rectangular kitchen, Skitterra waits in an octagon of web.
  buildFloor(bossId, scale) {
    // a round room is drawn at its full size (Volkar's closes in later; the dead ground is drawn over it)
    const ex = ARENA.kind === 'poly' ? ARENA.R : ARENA.kind === 'circle' ? ARENA.full : ARENA.hw;
    const ey = ARENA.kind === 'poly' ? ARENA.R : ARENA.kind === 'circle' ? ARENA.full : ARENA.hh;
    const M = bossId === 'volkar' ? 260 : bossId === 'hollowking' ? 160 : 120, bx = Math.ceil(ex + M), by = Math.ceil(ey + M);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(bx * 2 * scale); cv.height = Math.ceil(by * 2 * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    c.translate(bx, by);
    if (bossId === 'skitterra') this.buildWebCave(c, bx, by);
    else if (bossId === 'volkar') this.buildPeak(c, bx, by);
    else if (bossId === 'hollowking') this.buildBarrow(c, bx, by);
    else this.buildKitchen(c, bx, by);
    this.floor = cv; this.floorFor = bossId + '@' + scale; this.floorBox = { bx, by };
  },

  // Skitterra: a cave floor of dark stone under a huge web strung between eight rock pillars, bones scattered about,
  // stalagmites in the dark beyond
  buildWebCave(c, bx, by) {
    const r = rng(91), R = ARENA.R, inner = ARENA.inner;
    c.fillStyle = '#0b0910'; c.fillRect(-bx, -by, bx * 2, by * 2);
    c.save();
    ARENA.trace(c); c.clip();
    const g = c.createRadialGradient(0, 0, 40, 0, 0, R);
    g.addColorStop(0, '#3a3242'); g.addColorStop(0.7, '#27212e'); g.addColorStop(1, '#17131c');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    // flagstones worn into the cave floor
    for (let i = 0; i < 150; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R, s = 16 + r() * 34, pts = [];
      for (let k = 0; k < 6; k++) { const q = k * TAU / 6 + r() * 0.5; pts.push(Math.cos(a) * d + Math.cos(q) * s, Math.sin(a) * d + Math.sin(q) * s * 0.8); }
      poly(c, pts, `rgba(${60 + r() * 20},${52 + r() * 16},${70 + r() * 20},${0.25 + r() * 0.25})`, 'rgba(10,8,14,0.35)', 1.5);
    }
    // grit and pitting all over the stone, and cracks running through it
    for (let i = 0; i < 2600; i++) {
      const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R;
      circle(c, x, y, 0.5 + r() * 1.3, r() < 0.6 ? `rgba(8,6,12,${0.2 + r() * 0.3})` : `rgba(150,140,170,${0.06 + r() * 0.1})`);
    }
    for (let i = 0; i < 26; i++) {
      let x = (r() * 2 - 1) * R * 0.9, y = (r() * 2 - 1) * R * 0.9, a = r() * TAU;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 6 + r() * 6; k++) {
        a += (r() - 0.5) * 1.1; x += Math.cos(a) * (10 + r() * 16); y += Math.sin(a) * (10 + r() * 16); c.lineTo(x, y);
        if (r() < 0.2) { c.moveTo(x, y); c.lineTo(x + Math.cos(a + 1.2) * 14, y + Math.sin(a + 1.2) * 14); c.moveTo(x, y); }
      }
      c.strokeStyle = 'rgba(6,4,10,0.55)'; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = 'rgba(120,110,140,0.08)'; c.lineWidth = 1; c.stroke();
    }
    // pale cave moss creeping in from the walls
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU, d = ARENA.edge(a) - 10 - Math.pow(r(), 2) * 120;
      glow(c, Math.cos(a) * d, Math.sin(a) * d, 14 + r() * 26, r() < 0.5 ? '#5a7a4a' : '#4a6a5a', 0.18 + r() * 0.14);
    }
    // standing water: dark, still pools that catch the drips from the ceiling
    const pools = [];
    for (let i = 0; i < 5; i++) {
      const a = r() * TAU, d = 180 + r() * (inner - 260), x = Math.cos(a) * d, y = Math.sin(a) * d, w = 34 + r() * 26;
      pools.push({ x, y, w, h: w * 0.6, ph: r() * 9, every: 2 + r() * 2.5 });
      ellipse(c, x, y, w, w * 0.6, 0, 'rgba(12,16,26,0.75)', 'rgba(70,80,100,0.4)', 1.5);
      ellipse(c, x - w * 0.25, y - w * 0.18, w * 0.4, w * 0.1, -0.2, 'rgba(140,160,200,0.14)');
    }
    // bones and old egg sacs
    for (let i = 0; i < 30; i++) {
      const a = r() * TAU, d = 120 + r() * (R - 120), x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (ARENA.sd(x, y) > -30) continue;
      if (r() < 0.5) { const ang = r() * TAU; line(c, x - Math.cos(ang) * 12, y - Math.sin(ang) * 12, x + Math.cos(ang) * 12, y + Math.sin(ang) * 12, '#c8bca8', 3); circle(c, x + Math.cos(ang) * 13, y + Math.sin(ang) * 13, 3, '#d8ccb8'); circle(c, x - Math.cos(ang) * 13, y - Math.sin(ang) * 13, 3, '#d8ccb8'); }
      else { ellipse(c, x, y, 9, 7, r() * TAU, 'rgba(220,214,190,0.35)', 'rgba(120,110,90,0.5)', 1.2); }
    }
    // the web: a spoke to every pillar and to the middle of every wall, joined by sagging rings
    const corners = ARENA.corners(), n = corners.length, spokes = [];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = corners[i], [x1, y1] = corners[(i + 1) % n];
      spokes.push([x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2]);
    }
    c.strokeStyle = 'rgba(225,225,240,0.24)'; c.lineWidth = 1.8;
    for (const [x, y] of spokes) line(c, 0, 0, x, y, 'rgba(225,225,240,0.24)', 1.8);
    for (let f = 0.12; f < 1; f += 0.085) {
      c.beginPath();
      for (let i = 0; i <= spokes.length; i++) {
        const [x, y] = spokes[i % spokes.length];
        if (!i) { c.moveTo(x * f, y * f); continue; }
        const [px, py] = spokes[i - 1];
        c.quadraticCurveTo((px + x) / 2 * f * 0.93, (py + y) / 2 * f * 0.93, x * f, y * f);
      }
      c.strokeStyle = `rgba(225,225,240,${0.1 + 0.08 * f})`; c.lineWidth = 1.2; c.stroke();
    }
    // a soft vignette toward the walls
    const v = c.createRadialGradient(0, 0, inner * 0.55, 0, 0, R);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(6,4,10,0.45)');
    c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    // a lip of rock along the walls
    c.lineJoin = 'round';
    ARENA.trace(c, 12); c.lineWidth = 24; c.strokeStyle = '#2a2430'; c.stroke();
    ARENA.trace(c, 0); c.lineWidth = 3; c.strokeStyle = '#0e0b12'; c.stroke();
    ARENA.trace(c, 24); c.lineWidth = 3; c.stroke();
    for (let i = 0; i < 70; i++) {
      // pebbles on the lip
      const a = r() * TAU, e = ARENA.edge(a) + 6 + r() * 14;
      circle(c, Math.cos(a) * e, Math.sin(a) * e, 2 + r() * 3, '#3e3646');
    }
    // stalagmites out in the dark
    for (let i = 0; i < 46; i++) {
      const a = i * TAU / 46 + r() * 0.08, d = ARENA.edge(a) + 44 + r() * 50, s = 10 + r() * 16;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (Math.abs(x) > bx - 12 || Math.abs(y) > by - 12) continue;
      poly(c, [x - s, y + s * 0.5, x, y - s * 1.4, x + s, y + s * 0.5], '#3a3240', OUT, 2);
      line(c, x - s * 0.2, y - s * 0.8, x + s * 0.1, y + s * 0.2, 'rgba(255,255,255,0.12)', 2);
    }
    // the web's anchors: rock spurs in the corners, silk tied off round them and running into the dark (the eight
    // pillars themselves stand inside the web as props: they're solid, they're cover, and they break)
    for (const [cx, cy] of ARENA.corners(20)) {
      const a = Math.atan2(cy, cx);
      for (const da of [-0.35, 0, 0.35]) line(c, cx, cy, cx + Math.cos(a + da) * 110, cy + Math.sin(a + da) * 110, 'rgba(225,225,240,0.2)', 1.2);
      ellipse(c, cx + 4, cy + 7, 24, 13, 0, 'rgba(0,0,0,0.45)');
      circle(c, cx, cy, 19, '#3b3344', OUT, 2.5);
      circle(c, cx - 3, cy - 4, 13, '#4a4156');
      for (let k = 0; k < 2; k++) ellipse(c, cx, cy + 1 - k * 5, 17 - k * 2, 6, 0.15 * (k - 0.5), null, 'rgba(235,235,250,0.4)', 1.4);
    }
    // where the live details go (drawAmbient): dew on the threads, drips into the pools, spiders on the spokes, spores
    const dew = [];
    for (let i = 0; i < 70; i++) { const [sx, sy] = spokes[Math.floor(r() * spokes.length)], f = 0.15 + r() * 0.85; dew.push({ x: sx * f, y: sy * f, ph: r() * TAU, sp: 0.6 + r() * 1.2 }); }
    this.amb = {
      kind: 'cave', dew, pools,
      spiders: Array.from({ length: 4 }, (_, i) => ({ spoke: spokes[(i * 5 + 2) % spokes.length], ph: r() * TAU, sp: 0.05 + r() * 0.05 })),
      spores: Array.from({ length: 30 }, () => ({ x: (r() * 2 - 1) * inner, y: (r() * 2 - 1) * inner, ph: r() * 9, sp: 8 + r() * 10 })),
      fog: Array.from({ length: 10 }, () => ({ a: r() * TAU, sp: (r() < 0.5 ? -1 : 1) * (0.015 + r() * 0.02), s: 70 + r() * 60 })),
    };
  },

  // Volkar: the summit of a mountain above the storm. A round shelf of slate and granite, scarred by lightning, with
  // wind-flattened grass at the rim; beyond the cliff edge, clouds and the tips of other peaks far below
  buildPeak(c, bx, by) {
    const r = rng(53), R = ARENA.full;
    // the sky and the cloud sea below the summit
    const sky = c.createRadialGradient(0, 0, R * 0.8, 0, 0, Math.hypot(bx, by));
    sky.addColorStop(0, '#1c2636'); sky.addColorStop(0.5, '#121a26'); sky.addColorStop(1, '#080b11');
    c.fillStyle = sky; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU, d = R + 60 + r() * Math.max(bx, by), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9;
      glow(c, x, y, 70 + r() * 120, r() < 0.5 ? '#3a4658' : '#2a3444', 0.35 + r() * 0.3);
    }
    // other peaks poking up through the clouds
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + r() * 0.4, d = R + 150 + r() * 120, x = Math.cos(a) * d, y = Math.sin(a) * d, s = 40 + r() * 50;
      if (Math.abs(x) > bx - 20 || Math.abs(y) > by - 20) continue;
      poly(c, [x - s, y + s * 0.4, x - s * 0.15, y - s * 1.1, x + s * 0.2, y - s * 0.7, x + s, y + s * 0.4], '#222a36', 'rgba(10,12,18,0.6)', 2);
      poly(c, [x - s * 0.15, y - s * 1.1, x + s * 0.05, y - s * 0.55, x - s * 0.4, y - s * 0.3], 'rgba(200,215,235,0.16)');
      glow(c, x, y + s * 0.5, s * 1.4, '#2e3848', 0.6);   // cloud wrapping its foot
    }
    // the cliff below the rim, seen from above: a dark drop, deeper on the south side
    c.save(); c.translate(0, 26);
    c.beginPath(); c.arc(0, 0, R + 26, 0, TAU); c.fillStyle = '#141820'; c.fill();
    c.restore();
    // the summit shelf
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    const g = c.createRadialGradient(-R * 0.2, -R * 0.25, 30, 0, 0, R);
    g.addColorStop(0, '#59616e'); g.addColorStop(0.6, '#454c58'); g.addColorStop(1, '#30353f');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    // broad plates of slate, split along their grain
    for (let i = 0; i < 110; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R, cx = Math.cos(a) * d, cy = Math.sin(a) * d, s = 26 + r() * 50, rot = r() * TAU, pts = [];
      for (let k = 0; k < 5; k++) { const q = rot + k * TAU / 5 + (r() - 0.5) * 0.5, rr = s * (0.6 + r() * 0.5); pts.push(cx + Math.cos(q) * rr, cy + Math.sin(q) * rr * 0.85); }
      const v = 70 + r() * 30;
      poly(c, pts, `rgba(${v},${v + 6},${v + 16},${0.22 + r() * 0.22})`, 'rgba(18,20,26,0.4)', 1.5);
      if (r() < 0.5) line(c, pts[0], pts[1], pts[4], pts[5], 'rgba(220,228,240,0.07)', 1.5);   // a lit edge
    }
    // grit, and cracks running through the rock
    for (let i = 0; i < 2200; i++) {
      const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R;
      circle(c, x, y, 0.5 + r() * 1.2, r() < 0.6 ? `rgba(14,16,22,${0.2 + r() * 0.3})` : `rgba(200,210,226,${0.05 + r() * 0.08})`);
    }
    for (let i = 0; i < 24; i++) {
      let x = (r() * 2 - 1) * R * 0.85, y = (r() * 2 - 1) * R * 0.85, a = r() * TAU;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 6 + r() * 6; k++) {
        a += (r() - 0.5) * 1.0; x += Math.cos(a) * (12 + r() * 18); y += Math.sin(a) * (12 + r() * 18); c.lineTo(x, y);
        if (r() < 0.2) { c.moveTo(x, y); c.lineTo(x + Math.cos(a + 1.3) * 16, y + Math.sin(a + 1.3) * 16); c.moveTo(x, y); }
      }
      c.strokeStyle = 'rgba(10,12,16,0.6)'; c.lineWidth = 1.8; c.stroke();
      c.strokeStyle = 'rgba(200,210,230,0.07)'; c.lineWidth = 1; c.stroke();
    }
    // old lightning scars: a scorched star with a pale fern of fused rock
    for (let i = 0; i < 7; i++) {
      const a = r() * TAU, d = 120 + r() * (R - 200), x = Math.cos(a) * d, y = Math.sin(a) * d;
      glow(c, x, y, 46 + r() * 30, '#0c0e14', 0.55);
      for (let k = 0; k < 7; k++) {
        let px = x, py = y, q = k * TAU / 7 + r() * 0.5;
        c.beginPath(); c.moveTo(px, py);
        for (let s = 0; s < 4; s++) { q += (r() - 0.5) * 0.9; px += Math.cos(q) * (8 + r() * 10); py += Math.sin(q) * (8 + r() * 10); c.lineTo(px, py); }
        c.strokeStyle = 'rgba(170,210,240,0.22)'; c.lineWidth = 1.4; c.stroke();
      }
    }
    // the summit stone: a weathered ring carved around the middle, where he stands
    c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.strokeStyle = 'rgba(14,16,22,0.55)'; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.strokeStyle = 'rgba(190,205,225,0.12)'; c.lineWidth = 2; c.stroke();
    for (let k = 0; k < 16; k++) {
      const a = k * TAU / 16, x0 = Math.cos(a) * 138, y0 = Math.sin(a) * 138;
      line(c, x0, y0, Math.cos(a) * 162, Math.sin(a) * 162, 'rgba(14,16,22,0.5)', 4);
      if (k % 2 === 0) poly(c, [x0 + Math.cos(a) * 28, y0 + Math.sin(a) * 28, Math.cos(a + 0.05) * 176, Math.sin(a + 0.05) * 176, Math.cos(a - 0.05) * 176, Math.sin(a - 0.05) * 176], 'rgba(190,205,225,0.08)');
    }
    // rainwater pooled in hollows
    const pools = [];
    for (let i = 0; i < 6; i++) {
      const a = r() * TAU, d = 200 + r() * (R - 300), x = Math.cos(a) * d, y = Math.sin(a) * d, w = 26 + r() * 30;
      pools.push({ x, y, w, h: w * 0.6, ph: r() * 9 });
      ellipse(c, x, y, w, w * 0.6, r() * 0.6, 'rgba(16,24,36,0.7)', 'rgba(120,140,170,0.35)', 1.5);
      ellipse(c, x - w * 0.25, y - w * 0.15, w * 0.4, w * 0.1, -0.2, 'rgba(170,190,220,0.16)');
    }
    // loose stones, and grass flattened by the wind near the rim
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU, d = 170 + r() * (R - 190), x = Math.cos(a) * d, y = Math.sin(a) * d, s = 4 + r() * 8;
      ellipse(c, x + 2, y + 3, s, s * 0.6, 0, 'rgba(0,0,0,0.3)');
      poly(c, [x - s, y, x - s * 0.3, y - s * 0.8, x + s * 0.8, y - s * 0.4, x + s, y + s * 0.3, x, y + s * 0.6], '#5a626e', OUT, 1.2);
    }
    for (let i = 0; i < 90; i++) {
      const a = r() * TAU, d = R - 20 - Math.pow(r(), 1.6) * 140;
      glow(c, Math.cos(a) * d, Math.sin(a) * d, 16 + r() * 22, r() < 0.5 ? '#4a5a44' : '#3e4e3e', 0.28 + r() * 0.2);
    }
    // the cold light from above: brighter in the middle, the rim falling into shadow
    const v = c.createRadialGradient(0, 0, R * 0.45, 0, 0, R);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(6,8,14,0.5)');
    c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    // the rim: a broken lip of rock at the cliff edge
    c.lineJoin = 'round';
    c.beginPath(); c.arc(0, 0, R + 8, 0, TAU); c.lineWidth = 18; c.strokeStyle = '#3a414c'; c.stroke();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.lineWidth = 3; c.strokeStyle = '#151820'; c.stroke();
    for (let i = 0; i < 120; i++) {
      const a = i * TAU / 120 + r() * 0.03, d = R + 4 + r() * 12, s = 5 + r() * 8;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      poly(c, [x - s, y + s * 0.3, x - s * 0.2, y - s * 0.7, x + s * 0.7, y - s * 0.3, x + s * 0.6, y + s * 0.5], r() < 0.5 ? '#46505c' : '#3c4450', 'rgba(14,16,22,0.7)', 1.2);
    }
    // where the live details go (drawAmbient)
    const tufts = [];
    for (let i = 0; i < 70; i++) { const a = r() * TAU, d = R - 16 - Math.pow(r(), 1.5) * 130; tufts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * TAU, s: 6 + r() * 6 }); }
    this.amb = {
      kind: 'peak', pools, tufts, bx, by,
      clouds: Array.from({ length: 14 }, () => ({ a: r() * TAU, d: R + 70 + r() * 180, sp: (0.008 + r() * 0.012), s: 90 + r() * 90 })),
      leaves: Array.from({ length: 16 }, () => ({ ph: r() * 9, y: (r() * 2 - 1) * R * 0.9, sp: 120 + r() * 120, w: r() * TAU })),
      bolts: Array.from({ length: 3 }, (_, i) => ({ every: 5 + r() * 5, ph: r() * 9 + i * 3 })),
    };
  },

  // The Hollow King: a long burial hall. Worn flagstones and grave slabs, a faded runner up to the dais, his empty
  // throne against the top wall under a tall window (the moon sets in it), pillars and sarcophagi down the sides,
  // candles along the walls and grave-light braziers in the corners
  buildBarrow(c, bx, by) {
    const r = rng(117), hw = ARENA.hw, hh = ARENA.hh;
    // the hall's stone beyond the floor
    c.fillStyle = '#0a0c0e'; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 260; i++) {
      const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by;
      if (Math.abs(x) < hw + 20 && Math.abs(y) < hh + 20) continue;
      rrect(c, x, y, 40 + r() * 50, 22 + r() * 14, 3, `rgba(${34 + r() * 14},${38 + r() * 14},${40 + r() * 14},0.55)`, 'rgba(4,5,6,0.6)', 1.5);
    }
    // the tall window above the throne: night sky behind tracery (the moon is drawn live, drawMoon)
    const wy = -hh - 62;
    c.save();
    c.beginPath(); c.moveTo(-70, wy + 70); c.lineTo(-70, wy - 20); c.arc(0, wy - 20, 70, Math.PI, 0); c.lineTo(70, wy + 70); c.closePath();
    const sky = c.createLinearGradient(0, wy - 90, 0, wy + 70);
    sky.addColorStop(0, '#16233a'); sky.addColorStop(1, '#0c1322');
    c.fillStyle = sky; c.fill();
    c.clip();
    for (let i = 0; i < 40; i++) circle(c, (r() * 2 - 1) * 70, wy - 90 + r() * 160, 0.6 + r() * 0.9, `rgba(220,230,255,${0.3 + r() * 0.5})`);
    c.restore();
    this.window = { x: 0, y: wy, w: 70 };
    // the floor
    c.save();
    ARENA.trace(c); c.clip();
    const g = c.createRadialGradient(0, -hh * 0.3, 60, 0, 0, Math.hypot(hw, hh));
    g.addColorStop(0, '#3a403d'); g.addColorStop(0.7, '#2b302e'); g.addColorStop(1, '#1d2120');
    c.fillStyle = g; c.fillRect(-hw, -hh, hw * 2, hh * 2);
    // big worn flagstones in staggered rows
    const tw = 92, th = 64;
    for (let row = 0, y = -hh; y < hh; row++, y += th) {
      for (let x = -hw - (row % 2) * tw / 2; x < hw; x += tw) {
        const v = 52 + r() * 18, ix = x + 3 + r() * 2, iy = y + 3 + r() * 2;
        rrect(c, ix, iy, tw - 6, th - 6, 5, `rgba(${v},${v + 6},${v + 3},${0.35 + r() * 0.25})`, 'rgba(8,10,9,0.55)', 2);
        if (r() < 0.35) line(c, ix + 6, iy + 4, ix + tw - 14, iy + 4, 'rgba(210,225,215,0.06)', 1.5);   // a lit edge
        if (r() < 0.12) circle(c, ix + r() * tw, iy + r() * th, 2 + r() * 3, 'rgba(8,10,9,0.5)');
      }
    }
    // the faded runner from the doors to the dais
    c.fillStyle = 'rgba(70,22,30,0.55)'; c.fillRect(-70, -hh, 140, hh * 2);
    c.fillStyle = 'rgba(30,8,12,0.4)'; c.fillRect(-70, -hh, 10, hh * 2); c.fillRect(60, -hh, 10, hh * 2);
    for (let y = -hh + 30; y < hh; y += 70) { poly(c, [0, y - 14, 14, y, 0, y + 14, -14, y], 'rgba(184,154,74,0.18)'); }
    for (let i = 0; i < 14; i++) { const y = -hh + r() * hh * 2; c.fillStyle = 'rgba(20,24,22,0.35)'; c.fillRect(-70 + r() * 120, y, 20 + r() * 30, 4 + r() * 6); }   // worn through
    // grave slabs set into the floor, carved with names nobody remembers
    for (let i = 0; i < 9; i++) {
      const x = (r() < 0.5 ? -1 : 1) * (150 + r() * (hw - 250)), y = (r() * 2 - 1) * (hh - 110), rot = (r() - 0.5) * 0.1;
      c.save(); c.translate(x, y); c.rotate(rot);
      rrect(c, -34, -54, 68, 108, 8, '#43494a', OUT, 2.5);
      rrect(c, -26, -46, 52, 92, 6, null, 'rgba(10,12,12,0.5)', 1.5);
      line(c, 0, -34, 0, -6, 'rgba(10,12,12,0.6)', 3); line(c, -10, -24, 10, -24, 'rgba(10,12,12,0.6)', 3);
      for (let k = 0; k < 3; k++) line(c, -16, 8 + k * 9, 16 - r() * 10, 8 + k * 9, 'rgba(10,12,12,0.45)', 2);
      c.restore();
    }
    // grit and cracks
    for (let i = 0; i < 2400; i++) {
      const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh;
      circle(c, x, y, 0.5 + r() * 1.2, r() < 0.6 ? `rgba(6,8,7,${0.2 + r() * 0.3})` : `rgba(190,210,200,${0.04 + r() * 0.07})`);
    }
    for (let i = 0; i < 22; i++) {
      let x = (r() * 2 - 1) * hw * 0.9, y = (r() * 2 - 1) * hh * 0.9, a = r() * TAU;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5 + r() * 6; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (10 + r() * 16); y += Math.sin(a) * (10 + r() * 16); c.lineTo(x, y); }
      c.strokeStyle = 'rgba(6,8,7,0.6)'; c.lineWidth = 1.6; c.stroke();
    }
    // pale grave-moss creeping out from the walls
    for (let i = 0; i < 80; i++) {
      const side = r(), x = side < 0.5 ? (r() < 0.5 ? -1 : 1) * (hw - r() * 60) : (r() * 2 - 1) * hw, y = side < 0.5 ? (r() * 2 - 1) * hh : (r() < 0.5 ? -1 : 1) * (hh - r() * 50);
      glow(c, x, y, 14 + r() * 26, r() < 0.5 ? '#3a6a4a' : '#2e5a48', 0.2 + r() * 0.15);
    }
    // the light falls off toward the walls
    const v = c.createRadialGradient(0, 0, Math.min(hw, hh) * 0.6, 0, 0, Math.hypot(hw, hh));
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(4,6,8,0.55)');
    c.fillStyle = v; c.fillRect(-hw, -hh, hw * 2, hh * 2);
    c.restore();
    // the walls: a stone kerb and a dark line where the floor meets them
    c.lineJoin = 'round';
    ARENA.trace(c, 12); c.lineWidth = 24; c.strokeStyle = '#2b2f33'; c.stroke();
    ARENA.trace(c, 0); c.lineWidth = 3; c.strokeStyle = '#08090a'; c.stroke();
    ARENA.trace(c, 24); c.lineWidth = 3; c.stroke();
    // the dais steps (a low platform at the top of the floor) and the empty throne against the wall
    c.save(); ARENA.trace(c); c.clip();
    rrect(c, -200, -hh - 20, 400, 76, 10, 'rgba(58,64,70,0.75)', 'rgba(8,9,10,0.7)', 2.5);
    rrect(c, -170, -hh - 20, 340, 50, 8, 'rgba(66,72,78,0.7)', 'rgba(8,9,10,0.6)', 2);
    c.restore();
    rrect(c, -46, -hh - 78, 92, 82, 10, '#23262b', OUT, 3);                         // throne back
    for (let k = 0; k < 7; k++) { const x = -36 + k * 12; poly(c, [x - 5, -hh - 78, x, -hh - 96 - (k % 2) * 8, x + 5, -hh - 78], '#b89a4a', OUT, 1.5); }   // its crown of spikes
    rrect(c, -40, -hh - 30, 80, 36, 6, '#2e3238', OUT, 2.5);                          // seat
    rrect(c, -54, -hh - 34, 16, 44, 4, '#2a2d33', OUT, 2); rrect(c, 38, -hh - 34, 16, 44, 4, '#2a2d33', OUT, 2);
    glow(c, 0, -hh - 40, 70, '#3aff7a', 0.12);
    // pillars down both sides, and a sarcophagus in every bay between them
    const candles = [], braziers = [];
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const y = -hh + 60 + k * ((hh * 2 - 120) / 4), x = sx * (hw + 56);
        ellipse(c, x + 6, y + 10, 34, 18, 0, 'rgba(0,0,0,0.45)');
        circle(c, x, y, 30, '#30353a', OUT, 3);
        circle(c, x - 4, y - 5, 22, '#3c4248');
        circle(c, x - 9, y - 11, 8, 'rgba(255,255,255,0.07)');
        if (k < 4) {
          const yy = y + (hh * 2 - 120) / 8, xx = sx * (hw + 64);
          rrect(c, xx - 22, yy - 46, 44, 92, 8, '#363b3f', OUT, 2.5);
          rrect(c, xx - 16, yy - 40, 32, 80, 6, '#40464b', 'rgba(8,9,10,0.6)', 1.5);
          ellipse(c, xx, yy - 24, 9, 7, 0, '#4a5156', OUT, 1.5);   // the effigy's head
          line(c, xx, yy - 14, xx, yy + 30, 'rgba(8,9,10,0.5)', 3);
          candles.push({ x: sx * (hw + 30), y: yy - 30, ph: r() * 9 }, { x: sx * (hw + 30), y: yy + 26, ph: r() * 9 });
        }
      }
    }
    // candles along the bottom wall (the grave-light braziers stand in the hall itself, as props he snuffs and relights)
    for (let i = 0; i < 9; i++) candles.push({ x: -hw + 80 + i * ((hw * 2 - 160) / 8), y: hh + 26, ph: r() * 9 });
    for (const cd of candles) {
      for (let k = 0; k < 3; k++) {
        const x = cd.x + (k - 1) * 8, h = 8 + ((cd.ph * 7 + k * 3) % 6);
        rrect(c, x - 2.5, cd.y - h, 5, h, 1.5, '#d8d0b8', OUT, 1);
        cd['h' + k] = h;
      }
      ellipse(c, cd.x, cd.y + 1, 14, 4, 0, 'rgba(216,208,184,0.35)');   // old wax pooled under them
    }
    this.amb = {
      kind: 'barrow', candles, braziers, bx, by,
      motes: Array.from({ length: 36 }, () => ({ x: (r() * 2 - 1) * hw, y: (r() * 2 - 1) * hh, ph: r() * 9, sp: 4 + r() * 8 })),
      mist: Array.from({ length: 16 }, () => ({ s: r(), side: Math.floor(r() * 4), sp: 0.01 + r() * 0.015, r: 60 + r() * 60 })),
    };
  },

  // Grubnak: a long kitchen of warm checker tiles inside a brick wall, the stove line along the top wall,
  // shelves down the sides and prep counters along the bottom
  buildKitchen(c, bx, by) {
    const r = rng(77), hw = ARENA.hw, hh = ARENA.hh, rim = 26;
    c.fillStyle = '#120d0a'; c.fillRect(-bx, -by, bx * 2, by * 2);
    c.save();
    ARENA.trace(c); c.clip();
    // glazed tiles set in dark grout: each one bevelled (lit from the top left), speckled, and a few cracked or chipped
    const T = 52;
    c.fillStyle = '#2e1c12'; c.fillRect(-hw, -hh, hw * 2, hh * 2);
    for (let x = -Math.ceil(hw / T) * T; x < hw; x += T) for (let y = -Math.ceil(hh / T) * T; y < hh; y += T) {
      const odd = ((x + y) / T) & 1, v = r() * 0.07, hex = odd ? '#c9b48e' : '#8f5f3c', amt = odd ? -0.05 - v : -v;
      const g = c.createLinearGradient(x, y, x + T, y + T);
      g.addColorStop(0, shade(hex, amt + 0.07)); g.addColorStop(0.55, shade(hex, amt)); g.addColorStop(1, shade(hex, amt - 0.1));
      c.fillStyle = g; c.fillRect(x + 1.5, y + 1.5, T - 3, T - 3);
      line(c, x + 3, y + 2.5, x + T - 4, y + 2.5, 'rgba(255,248,230,0.16)', 1.5);
      line(c, x + 2.5, y + 3, x + 2.5, y + T - 4, 'rgba(255,248,230,0.1)', 1.5);
      line(c, x + 3, y + T - 2.5, x + T - 3, y + T - 2.5, 'rgba(20,8,2,0.22)', 1.5);
      for (let k = 0; k < 7; k++) circle(c, x + 4 + r() * (T - 8), y + 4 + r() * (T - 8), 0.6 + r() * 1.1, r() < 0.5 ? 'rgba(30,14,4,0.22)' : 'rgba(255,245,225,0.14)');
      // a glint of glaze on some tiles
      if (r() < 0.3) { c.save(); c.globalAlpha = 0.1; ellipse(c, x + T * 0.32, y + T * 0.3, T * 0.22, T * 0.08, -0.6, '#fffaf0'); c.restore(); }
      if (r() < 0.07) {   // a crack
        c.beginPath(); let cx = x + 6 + r() * (T - 12), cy = y + 4; c.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) { cx += (r() - 0.5) * 16; cy += 8 + r() * 6; c.lineTo(Math.max(x + 3, Math.min(x + T - 3, cx)), Math.min(y + T - 3, cy)); }
        c.strokeStyle = 'rgba(30,14,6,0.5)'; c.lineWidth = 1.2; c.stroke();
      }
      if (r() < 0.05) poly(c, [x + T - 2, y + 2, x + T - 2, y + 12, x + T - 12, y + 2], '#3a2416');   // a chipped corner
    }
    // the floor is worn duller where the cooks walk: a ring around the middle and a strip along the stoves
    c.save(); c.globalCompositeOperation = 'multiply';
    const wear = c.createRadialGradient(0, 0, 120, 0, 0, 380);
    wear.addColorStop(0, 'rgba(255,255,255,0)'); wear.addColorStop(0.6, 'rgba(225,215,200,0.55)'); wear.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = wear; c.fillRect(-hw, -hh, hw * 2, hh * 2);
    c.restore();
    // grime, scorch marks and spills (scorched most under the stove line)
    for (let i = 0; i < 110; i++) {
      const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh, s = 6 + r() * 26;
      c.fillStyle = `rgba(40,22,10,${0.05 + r() * 0.12})`;
      c.beginPath(); c.ellipse(x, y, s, s * (0.5 + r() * 0.5), r() * TAU, 0, TAU); c.fill();
    }
    // grease rings and a few dropped things near the stoves; flour dusted by the prep counters
    for (let i = 0; i < 9; i++) { const x = (r() * 2 - 1) * (hw - 80), y = -hh + 40 + r() * 120; ellipse(c, x, y, 14 + r() * 16, 9 + r() * 8, r(), null, `rgba(70,40,10,${0.22 + r() * 0.15})`, 2.5); }
    for (let i = 0; i < 260; i++) { const x = (r() * 2 - 1) * (hw - 60), y = hh - 20 - Math.pow(r(), 2) * 160; circle(c, x, y, 0.8 + r() * 2.2, `rgba(255,252,240,${0.12 + r() * 0.3})`); }
    for (let i = 0; i < 6; i++) {
      const x = (r() * 2 - 1) * (hw - 100), y = (r() * 2 - 1) * (hh - 100), k = r();
      if (k < 0.33) { ellipse(c, x, y, 7, 4, r() * 3, '#5a8a2a', OUT, 1); }                       // a pea pod
      else if (k < 0.66) { circle(c, x, y, 5, '#e8c15a', OUT, 1); circle(c, x + 7, y + 2, 4, '#e8c15a', OUT, 1); }   // dropped potatoes
      else { ellipse(c, x, y, 9, 3, r() * 3, '#d06a3a', OUT, 1); }                               // a carrot end
    }
    // water pooled round the drains, catching the light
    for (const [gx, gy, gr] of [[0, 0, 70], [-hw * 0.55, hh * 0.35, 46], [hw * 0.55, hh * 0.35, 46]]) {
      const pg = c.createRadialGradient(gx, gy, gr * 0.3, gx, gy, gr);
      pg.addColorStop(0, 'rgba(60,70,80,0.28)'); pg.addColorStop(1, 'rgba(60,70,80,0)');
      c.fillStyle = pg; c.beginPath(); c.ellipse(gx, gy, gr, gr * 0.8, 0, 0, TAU); c.fill();
      ellipse(c, gx - gr * 0.35, gy - gr * 0.3, gr * 0.3, gr * 0.08, -0.4, 'rgba(255,255,255,0.12)');
    }
    const soot = c.createLinearGradient(0, -hh, 0, -hh + 130);
    soot.addColorStop(0, 'rgba(30,14,6,0.35)'); soot.addColorStop(1, 'rgba(30,14,6,0)');
    c.fillStyle = soot; c.fillRect(-hw, -hh, hw * 2, 130);
    // a big drain grate in the middle, and two smaller ones
    for (const [gx, gy, gr] of [[0, 0, 34], [-hw * 0.55, hh * 0.35, 20], [hw * 0.55, hh * 0.35, 20]]) {
      circle(c, gx, gy, gr, '#3a3530', '#1a1612', 3);
      const n = gr > 30 ? 2 : 1;
      for (let i = -n; i <= n; i++) line(c, gx + i * gr * 0.32, gy - gr * 0.82, gx + i * gr * 0.32, gy + gr * 0.82, '#14100c', 3);
    }
    // soft shadow where the floor meets the wall
    c.lineWidth = 30; c.strokeStyle = 'rgba(20,8,2,0.28)'; ARENA.trace(c, 6); c.stroke();
    c.restore();
    // brick wall all the way round
    c.save();
    const ring = new Path2D();
    this._tracePath(ring, rim); this._tracePath(ring, 0);
    c.fillStyle = '#6b3424'; c.fill(ring, 'evenodd');
    c.clip(ring, 'evenodd');
    for (let y = -by, row = 0; y < by; y += 13, row++) {
      line(c, -bx, y, bx, y, '#2a120a', 2);
      for (let x = -bx + (row % 2) * 13; x < bx; x += 26) line(c, x, y, x, y + 13, '#2a120a', 2);
    }
    c.restore();
    c.lineJoin = 'round';
    ARENA.trace(c, 0); c.lineWidth = 3; c.strokeStyle = '#1a0c06'; c.stroke();
    ARENA.trace(c, rim); c.stroke();
    const out = rim + 8;   // furniture starts just past the wall
    // top: the stove line, burners glowing under stockpots, an oven at each end
    rrect(c, -hw + 40, -hh - out - 74, hw * 2 - 80, 74, 8, '#3d2a22', OUT, 3);
    rrect(c, -hw + 46, -hh - out - 68, hw * 2 - 92, 20, 5, '#5a4034');
    for (let i = 0; i < 6; i++) {
      const x = -hw + 150 + i * (hw * 2 - 300) / 5, y = -hh - out - 30;
      circle(c, x, y, 24, '#1c1210', OUT, 2);
      glow(c, x, y, 30, '#ff7a1a', 0.55);
      circle(c, x, y, 17, null, '#ff8a3a', 2.5);
      if (i % 2 === 0) { circle(c, x, y - 4, 20, '#8a8f96', OUT, 2.5); ellipse(c, x, y - 8, 16, 9, 0, '#5a3a22'); ellipse(c, x - 5, y - 10, 5, 3, 0, 'rgba(255,240,220,0.45)'); }
    }
    for (const sx of [-1, 1]) {
      const x = sx * (hw - 10) - (sx > 0 ? 60 : 0);
      rrect(c, x, -hh - out - 80, 60, 80, 6, '#2e201a', OUT, 3);
      rrect(c, x + 9, -hh - out - 58, 42, 34, 8, '#140b08', OUT, 2);
      glow(c, x + 30, -hh - out - 40, 26, '#ff6a1a', 0.6);
    }
    // sides: shelves of jars and hanging copper pans
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? hw + out : -hw - out - 54;
      rrect(c, x0, -hh + 30, 54, hh * 2 - 60, 6, '#4a3020', OUT, 3);
      for (let y = -hh + 46; y < hh - 50; y += 38) {
        line(c, x0 + 4, y + 26, x0 + 50, y + 26, '#2a180e', 3);
        for (let k = 0; k < 3; k++) {
          const jx = x0 + 10 + k * 15, col = ['#d0482a', '#e8d8a8', '#3a6a3a', '#c89a3a'][(Math.abs(y) / 38 + k) & 3];
          rrect(c, jx - 5, y + 8, 10, 17, 3, col, OUT, 1.5);
          rrect(c, jx - 6, y + 5, 12, 5, 2, '#8a7a6a', OUT, 1);
        }
      }
      // the larder casks he throws, racked on their sides along the shelf
      for (const yy of [-hh * 0.5, -hh * 0.1, hh * 0.3]) {
        ellipse(c, x0 + 27, yy, 22, 15, 0, '#9a6a36', OUT, 2.5);
        ellipse(c, x0 + 27, yy, 13, 8, 0, '#b8844a', '#3a3a42', 2);
        line(c, x0 + 12, yy - 13, x0 + 12, yy + 13, '#3a3a42', 2.5); line(c, x0 + 42, yy - 13, x0 + 42, yy + 13, '#3a3a42', 2.5);
      }
      for (let k = 0; k < 4; k++) {
        const y = -hh + 90 + k * (hh * 2 - 180) / 3, px = sx > 0 ? x0 + 74 : x0 - 20;
        line(c, px, y - 34, px, y - 16, '#2a1a10', 2);
        circle(c, px, y, 16, '#c8743a', OUT, 2.5); circle(c, px - 4, y - 4, 7, 'rgba(255,220,180,0.35)');
      }
    }
    // bottom: prep counters with cutting boards, sacks of flour and crates
    rrect(c, -hw + 60, hh + out, hw * 2 - 120, 62, 8, '#4a3020', OUT, 3);
    for (let i = 0; i < 5; i++) {
      const x = -hw + 140 + i * (hw * 2 - 280) / 4, y = hh + out + 30;
      if (i % 2) { rrect(c, x - 34, y - 18, 68, 36, 6, '#c89a5a', OUT, 2); line(c, x - 10, y - 8, x + 18, y + 6, '#d8dee4', 3); }
      else { ellipse(c, x, y, 26, 20, 0, '#e8dcc0', OUT, 2.5); line(c, x - 12, y - 12, x + 12, y - 12, '#8a6a4a', 2); }
    }
    // where the live details go (drawAmbient): burners, the pots on them, the ovens, lamp light on the floor
    const burners = [];
    for (let i = 0; i < 6; i++) burners.push({ x: -hw + 150 + i * (hw * 2 - 300) / 5, y: -hh - out - 30, pot: i % 2 === 0, ph: r() * 9 });
    this.amb = {
      kind: 'kitchen', burners,
      ovens: [-1, 1].map(sx => ({ x: sx * (hw - 10) - (sx > 0 ? 60 : 0) + 30, y: -hh - out - 40, ph: r() * 9 })),
      lamps: [[-hw * 0.5, -hh * 0.25], [hw * 0.5, -hh * 0.25], [0, hh * 0.45]].map(([x, y]) => ({ x, y, ph: r() * 9 })),
      motes: Array.from({ length: 34 }, () => ({ x: (r() * 2 - 1) * hw, y: (r() * 2 - 1) * hh, sp: 6 + r() * 10, ph: r() * 9, s: 0.8 + r() * 1.4 })),
      rat: { every: 16 + r() * 6, ph: r() * 10 },
    };
  },
  // same outline as ARENA.trace, as a Path2D (for even-odd fills)
  _tracePath(p, grow) {
    if (ARENA.kind === 'rect') {
      const w = ARENA.hw + grow, h = ARENA.hh + grow, c = Math.max(0, ARENA.corner + grow);
      p.moveTo(-w + c, -h); p.arcTo(w, -h, w, h, c); p.arcTo(w, h, -w, h, c); p.arcTo(-w, h, -w, -h, c); p.arcTo(-w, -h, w, -h, c); p.closePath();
    } else if (ARENA.kind === 'poly') {
      ARENA.corners(grow).forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath();
    } else { p.moveTo(ARENA.r + grow, 0); p.arc(0, 0, ARENA.r + grow, 0, TAU); }
  },

  drawFloor(ctx, bossId, scale) {
    // (the scale is rounded up to quarter steps: a window being resized or the zoom settling doesn't rebuild the floor,
    // and the room layer keyed on it, every frame)
    scale = Math.ceil(scale * 4 - 1e-6) / 4;
    if (this.floorFor !== bossId + '@' + scale) this.buildFloor(bossId, scale);
    const { bx, by } = this.floorBox;
    ctx.drawImage(this.floor, -bx, -by, bx * 2, by * 2);
  },

  // ------------------------------------------------------------------ the room's life (every frame, under everything else)
  drawAmbient(ctx, t) {
    const a = this.amb;
    if (!a) return;
    if (a.kind === 'kitchen') this.kitchenLife(ctx, a, t);
    else if (a.kind === 'cave') this.caveLife(ctx, a, t);
    else if (a.kind === 'peak') this.peakLife(ctx, a, t);
    else if (a.kind === 'barrow') this.barrowLife(ctx, a, t);
  },

  // candles gutter, the braziers burn grave-green, dust hangs in the air and mist creeps in along the walls.
  // In the Long Night (this.night 0..1) the candles and braziers die down.
  barrowLife(ctx, a, t) {
    const lit = 1 - (this.night || 0) * 0.85, hw = ARENA.hw, hh = ARENA.hh;
    for (const m of a.mist) {
      const q = (m.s + t * m.sp) % 1, along = (q * 2 - 1);
      const x = m.side < 2 ? along * hw : (m.side === 2 ? -1 : 1) * (hw - 30), y = m.side < 2 ? (m.side ? 1 : -1) * (hh - 30) : along * hh;
      glow(ctx, x, y, m.r, '#9ab8a8', 0.07);
    }
    if (lit > 0.05) {
      for (const cd of a.candles) for (let k = 0; k < 3; k++) {
        const x = cd.x + (k - 1) * 8, y = cd.y - cd['h' + k], fl = 0.75 + Math.sin(t * 9 + cd.ph + k * 2) * 0.15 + Math.sin(t * 23 + k) * 0.08;
        glow(ctx, x, y - 3, 16, '#ffb860', 0.35 * fl * lit);
        ctx.save(); ctx.globalAlpha = lit;
        ellipse(ctx, x, y - 3, 2.2, 4.5 * fl, Math.sin(t * 5 + k) * 0.15, '#ffe2a0');
        ctx.restore();
      }
      for (const b of a.braziers) {
        glow(ctx, b.x, b.y - 10, 70, '#3aff7a', 0.22 * lit);
        for (let i = 0; i < 5; i++) {
          const q = (t * 1.3 + i / 5 + b.ph) % 1;
          ctx.save(); ctx.globalAlpha = lit * (1 - q);
          ellipse(ctx, b.x + Math.sin(t * 3 + i * 2) * 6, b.y - 8 - q * 34, 7 * (1 - q * 0.6), 11 * (1 - q * 0.5), 0, i % 2 ? '#7affa8' : '#3adf7a');
          ctx.restore();
        }
      }
    }
    for (const m of a.motes) {
      const x = m.x + Math.sin(t * 0.3 + m.ph) * 30, y = m.y + ((t * m.sp + m.ph * 40) % 80) - 40;
      circle(ctx, x, y, 1.3, `rgba(220,235,225,${0.18 + Math.sin(t + m.ph) * 0.08})`);
    }
  },

  // the moon in the tall window: it sinks through the fight (p 0..1) and is gone at Moonset
  drawMoon(ctx, p, t) {
    const w = this.window;
    if (!w) return;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(w.x - w.w, w.y + 70); ctx.lineTo(w.x - w.w, w.y - 20); ctx.arc(w.x, w.y - 20, w.w, Math.PI, 0); ctx.lineTo(w.x + w.w, w.y + 70); ctx.closePath();
    ctx.clip();
    const my = w.y - 50 + clamp(p, 0, 1) * 150, mx = w.x + 18 - p * 30;
    glow(ctx, mx, my, 80, '#cfe0ff', 0.35);
    circle(ctx, mx, my, 26, '#e8eef8');
    circle(ctx, mx - 8, my - 5, 6, 'rgba(160,175,200,0.5)'); circle(ctx, mx + 9, my + 8, 4, 'rgba(160,175,200,0.45)');
    ctx.restore();
    // tracery over the glass
    ctx.save(); ctx.strokeStyle = '#15181c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(w.x - w.w, w.y + 70); ctx.lineTo(w.x - w.w, w.y - 20); ctx.arc(w.x, w.y - 20, w.w, Math.PI, 0); ctx.lineTo(w.x + w.w, w.y + 70); ctx.stroke();
    ctx.lineWidth = 4; line(ctx, w.x, w.y - 90, w.x, w.y + 70, '#15181c', 4); line(ctx, w.x - w.w, w.y + 10, w.x + w.w, w.y + 10, '#15181c', 4);
    ctx.restore();
    void t;
  },

  // The Long Night: everything goes dark except soft pools of light (each hero, the last lantern). Drawn into a
  // screen-sized layer with the lights cut out of it. v = { W, H, DPR, zoom, cam }
  drawNight(ctx, lights, k, v) {
    if (k <= 0) return;
    const cw = Math.max(1, Math.ceil(v.W * v.DPR)), ch = Math.max(1, Math.ceil(v.H * v.DPR));
    let c = this.nightCv;
    if (!c || c.width !== cw || c.height !== ch) { c = this.nightCv = document.createElement('canvas'); c.width = cw; c.height = ch; }
    const n = c.getContext('2d');
    n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over';
    n.clearRect(0, 0, cw, ch);
    n.fillStyle = `rgba(3,5,10,${0.88 * k})`; n.fillRect(0, 0, cw, ch);
    const s = v.DPR * v.zoom;
    n.setTransform(s, 0, 0, s, -v.cam.x * s, -v.cam.y * s);
    n.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const g = n.createRadialGradient(L.x, L.y, L.r * 0.3, L.x, L.y, L.r);
      g.addColorStop(0, `rgba(0,0,0,${L.a ?? 1})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      n.fillStyle = g; n.beginPath(); n.arc(L.x, L.y, L.r, 0, TAU); n.fill();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore();
  },

  // a lantern: an iron cage around a warm flame. On the floor it sits in a pool of light; carried, it's held up.
  lantern(ctx, x, y, t, carried, last) {
    const s = last ? 1.8 : 1.45, lift = carried ? 46 : 0, fl = 0.85 + Math.sin(t * 8 + x) * 0.1 + Math.sin(t * 19) * 0.05;
    if (!carried) {
      glow(ctx, x, y, 85 * s, '#ffcf70', 0.3 * fl);
      ellipse(ctx, x, y, 60 * s, 44 * s, 0, null, rgba('#ffd88a', 0.25 * fl), 1.5);   // how far its light reaches
      ellipse(ctx, x + 3, y + 3, 12 * s, 5 * s, 0, 'rgba(0,0,0,0.4)');
    }
    ctx.save(); ctx.translate(x, y - lift - 14 * s); ctx.scale(s, s);
    glow(ctx, 0, 0, 34, '#ffd27a', 0.55 * fl);
    if (carried) line(ctx, 0, -14, 0, -22, '#2a2420', 1.5);
    rrect(ctx, -8, -12, 16, 22, 3, 'rgba(255,214,140,0.25)', '#2a2420', 2);
    ellipse(ctx, 0, 0, 3.2, 6 * fl, 0, '#fff0c0');
    glow(ctx, 0, 0, 10, '#ffffff', 0.5 * fl);
    for (const dx of [-4, 4]) line(ctx, dx, -12, dx, 10, '#2a2420', 1.3);
    rrect(ctx, -10, -15, 20, 4, 1.5, '#3a322a', OUT, 1.2);
    rrect(ctx, -9, 9, 18, 4, 1.5, '#3a322a', OUT, 1.2);
    ctx.beginPath(); ctx.arc(0, -16, 4, Math.PI, 0); ctx.strokeStyle = '#3a322a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  },

  // Royal Doom: a violet sigil turns over the doomed player's head, its ring burning down as the time runs out
  doomMark(ctx, x, y, frac, t) {
    const hot = frac < 0.3, k = hot ? 0.75 + Math.sin(t * 14) * 0.25 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4);
    glow(ctx, 0, 0, 30, '#b46aff', 0.4 * k);
    circle(ctx, 0, 0, 15, 'rgba(30,10,46,0.75)', rgba('#7a3ac0', 0.6), 2);
    ctx.beginPath(); ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1));
    ctx.strokeStyle = rgba(hot ? '#ff8ad0' : '#e0b8ff', k); ctx.lineWidth = 3; ctx.stroke();
    // a little skull
    ellipse(ctx, 0, -1.5, 6.5, 6, 0, '#efe2ff');
    rrect(ctx, -3.5, 3, 7, 4, 1, '#efe2ff');
    circle(ctx, -2.4, -2, 1.7, '#2a1040'); circle(ctx, 2.4, -2, 1.7, '#2a1040');
    ctx.rotate(t * 0.8);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; circle(ctx, Math.cos(a) * 21, Math.sin(a) * 21, 1.6, rgba('#d8b0ff', 0.8 * k)); }
    ctx.restore();
  },

  // clouds drift past below the summit, rain slants across it, grass shivers in the wind, leaves blow over,
  // and now and then lightning splits the clouds far below
  peakLife(ctx, a, t) {
    const R = ARENA.full;
    for (const cl of a.clouds) {
      const an = cl.a + t * cl.sp, x = Math.cos(an) * cl.d, y = Math.sin(an) * cl.d * 0.9;
      glow(ctx, x, y, cl.s, '#4a5668', 0.22);
    }
    // distant lightning in the cloud sea, lighting the whole summit for a moment
    for (const b of a.bolts) {
      const q = ((t + b.ph) % b.every) / b.every, n = Math.floor((t + b.ph) / b.every);
      if (q > 0.04) continue;
      const k = 1 - q / 0.04, an = (n * 2.39 + b.ph) % TAU, d = R + 130 + (n * 37 % 120);
      const x = Math.cos(an) * d, y = Math.sin(an) * d;
      ctx.save(); ctx.globalAlpha = k;
      jagged(ctx, x + 30, y - 220, x, y, n * 17 + 3, '#a8d8ff', 2.4);
      ctx.restore();
      glow(ctx, x, y, 160, '#9ccfff', 0.4 * k);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07 * k;
      ctx.fillStyle = '#b8dcff'; ctx.fillRect(-a.bx, -a.by, a.bx * 2, a.by * 2);
      ctx.restore();
    }
    // grass at the rim bends with the gusts
    const gust = 0.5 + 0.5 * Math.sin(t * 0.7) * Math.sin(t * 1.9);
    for (const g of a.tufts) {
      const bend = 0.4 + 0.5 * gust + Math.sin(t * 5 + g.ph) * 0.15;
      for (let k = -1; k <= 1; k++) {
        const bx = g.x + k * 3, tipX = bx + bend * g.s * 1.1, tipY = g.y - g.s * (1.1 - bend * 0.4);
        ctx.beginPath(); ctx.moveTo(bx, g.y); ctx.quadraticCurveTo(bx + bend * g.s * 0.3, g.y - g.s * 0.7, tipX, tipY);
        ctx.strokeStyle = k ? 'rgba(110,130,100,0.7)' : 'rgba(140,160,120,0.8)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    // rain ringing in the pools, and splashing on the stone
    for (const p of a.pools) for (let k = 0; k < 2; k++) {
      const q = ((t * 0.9 + p.ph + k * 0.5) % 1);
      ellipse(ctx, p.x + Math.sin(p.ph + k * 3 + Math.floor(t * 0.9 + p.ph + k * 0.5)) * p.w * 0.4, p.y, p.w * 0.5 * q, p.h * 0.5 * q, 0, null, `rgba(170,190,220,${0.4 * (1 - q)})`, 1.2);
    }
    for (let i = 0; i < 18; i++) {
      const cyc = Math.floor(t * 2 + i * 0.37), q = (t * 2 + i * 0.37) % 1;
      const an = (cyc * 7.13 + i * 2.1) % TAU, d = ((cyc * 131 + i * 53) % 1000) / 1000 * R * 0.95;
      if (q > 0.3) continue;
      ellipse(ctx, Math.cos(an) * d, Math.sin(an) * d, 2 + q * 18, 1 + q * 9, 0, null, `rgba(190,205,230,${0.4 * (1 - q / 0.3)})`, 1);
    }
    // leaves and grit blown across
    for (const l of a.leaves) {
      const span = R * 2 + 200, x = ((t * l.sp + l.ph * 100) % span) - span / 2, y = l.y + Math.sin(t * 2 + l.ph) * 14;
      if (ARENA.sd(x, y) > -6) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6 + l.w);
      ellipse(ctx, 0, 0, 4, 2, 0, 'rgba(120,130,90,0.75)');
      ctx.restore();
    }
    // slanting rain over everything
    ctx.strokeStyle = 'rgba(190,210,240,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath();
    const span = (R + 160) * 2;
    for (let i = 0; i < 140; i++) {
      const x = ((i * 0.6180339 * span + t * 160) % span) - span / 2, y = ((i * 0.4142136 * span + t * 620) % span) - span / 2;
      ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 22);   // slanted the way it falls
    }
    ctx.stroke();
  },

  // Volkar's phase 2: outside the wall the summit is dead, electrified ground. Before each step, sparks crawl along
  // the line the wall is about to jump to and the doomed band darkens.
  drawEdge(ctx, t, warn) {
    if (ARENA.kind !== 'circle' || (ARENA.r >= ARENA.full - 1 && !warn)) return;
    const r = ARENA.r, outer = ARENA.full + 40;
    const band = (r0, r1) => { ctx.beginPath(); ctx.arc(0, 0, r1, 0, TAU); ctx.arc(0, 0, r0, 0, TAU, true); };
    if (r < ARENA.full - 1) {
      ctx.save();
      band(r, outer); ctx.fillStyle = 'rgba(8,16,34,0.62)'; ctx.fill(); ctx.clip();
      // arcs flickering over the dead ground
      for (let i = 0; i < 16; i++) {
        const seed = Math.floor(t * 7) * 31 + i * 13, h = n => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        if (h(1) < 0.45) continue;
        const a = h(2) * TAU, d0 = r + 10 + h(3) * (outer - r - 20), a2 = a + (h(4) - 0.5) * 0.25, d1 = d0 + (h(5) - 0.5) * 60;
        ctx.globalAlpha = 0.5 + h(6) * 0.5;
        jagged(ctx, Math.cos(a) * d0, Math.sin(a) * d0, Math.cos(a2) * d1, Math.sin(a2) * d1, seed, '#6fd8ff', 1.2);
      }
      ctx.restore();
      // the wall itself: a ring of live lightning
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
      ctx.strokeStyle = rgba('#5ac8ff', 0.25); ctx.lineWidth = 14; ctx.stroke();
      ctx.strokeStyle = rgba('#bff0ff', 0.75 + Math.sin(t * 13) * 0.15); ctx.lineWidth = 2.5; ctx.stroke();
      const n = 22;
      for (let i = 0; i < n; i++) {
        if ((Math.floor(t * 9) + i * 7) % 3 === 0) continue;
        const a0 = i * TAU / n + Math.floor(t * 9) * 0.07, a1 = a0 + TAU / n;
        jagged(ctx, Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r, Math.floor(t * 12) * 7 + i, '#7fe8ff', 1.4);
      }
      ctx.restore();
    }
    if (warn) {
      const p = clamp((t - warn.start) / Math.max(0.1, warn.end - warn.start), 0, 1);
      const pulseA = 0.5 + 0.5 * Math.sin(t * (6 + p * 16));
      ctx.save();
      band(warn.r, r); ctx.fillStyle = rgba('#3a8cff', (0.06 + 0.2 * p) * (0.7 + 0.3 * pulseA)); ctx.fill();
      ctx.restore();
      // sparks crawling along the new line, thicker as the step nears
      const n = Math.round(24 + p * 40);
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + t * (i % 2 ? 0.5 : -0.4), len = 0.05 + 0.04 * p;
        ctx.save(); ctx.globalAlpha = 0.45 + 0.5 * p;
        ctx.beginPath(); ctx.arc(0, 0, warn.r, a, a + len);
        ctx.strokeStyle = '#bff0ff'; ctx.lineWidth = 2 + p * 2; ctx.stroke();
        ctx.restore();
        if ((i + Math.floor(t * 10)) % 5 === 0) glow(ctx, Math.cos(a) * warn.r, Math.sin(a) * warn.r, 10 + p * 10, '#7fe8ff', 0.6 * p + 0.2);
      }
    }
  },

  // Polarity: a ring at everyone's feet in their charge's colour, + warm gold and − cold blue, with small marks
  // turning around it (a cross for +, a bar for −)
  polarityAuras(ctx, units, pol, t) {
    for (const u of units) {
      const s = pol.get(u.id);
      if (!s) continue;
      // sits outside the hero's own ring, so the two never read as one
      const col = s > 0 ? '#ffb31f' : '#38c4ff', spin = t * (s > 0 ? 1.2 : -1.2), rx = 42, ry = 31;
      glow(ctx, u.x, u.y + 4, 52, col, 0.22);
      ellipse(ctx, u.x, u.y + 4, rx, ry, 0, rgba(col, 0.12), rgba(col, 0.9), 3);
      ellipse(ctx, u.x, u.y + 4, rx + 6, ry + 5, 0, null, rgba(col, 0.3 + 0.2 * Math.sin(t * 4 + u.id)), 1.5);
      for (let k = 0; k < 4; k++) {
        const a = spin + k * TAU / 4, x = u.x + Math.cos(a) * rx, y = u.y + 4 + Math.sin(a) * ry;
        circle(ctx, x, y, 7, rgba('#10141c', 0.85), rgba(col, 0.95), 1.5);
        line(ctx, x - 4, y, x + 4, y, '#ffffff', 2);
        if (s > 0) line(ctx, x, y - 4, x, y + 4, '#ffffff', 2);
      }
    }
  },

  // burners flicker, pots steam, the lamps' light breathes on the tiles, flour dust drifts, and now and then a rat
  // makes a run for it along the bottom wall
  kitchenLife(ctx, a, t) {
    const flick = (ph, s = 1) => 0.5 + 0.25 * Math.sin(t * 7 * s + ph) + 0.15 * Math.sin(t * 13.7 * s + ph * 2) + 0.1 * Math.sin(t * 23 * s + ph * 3);
    const hw = ARENA.hw, hh = ARENA.hh;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of a.lamps) glow(ctx, l.x, l.y, 270, '#ffb060', 0.045 + 0.015 * flick(l.ph, 0.25));
    for (const b of a.burners) {
      const f = flick(b.ph);
      glow(ctx, b.x, b.y, 36, '#ff7a1a', 0.2 + 0.25 * f);
      if (!b.pot) for (let k = 0; k < 8; k++) {
        const an = k * TAU / 8 + t * 0.4, h = 3 + 3 * flick(b.ph + k, 1.6);
        circle(ctx, b.x + Math.cos(an) * 16, b.y + Math.sin(an) * 16 - h * 0.5, 2 + h * 0.4, 'rgba(120,170,255,0.55)');
      }
    }
    for (const o of a.ovens) glow(ctx, o.x, o.y, 36, '#ff6a1a', 0.22 + 0.2 * flick(o.ph, 0.5));
    ctx.restore();
    for (const b of a.burners) if (b.pot) for (let i = 0; i < 4; i++) {
      const q = (t * 0.4 + i / 4 + b.ph) % 1;
      circle(ctx, b.x + Math.sin(t * 1.3 + i * 2 + b.ph) * 9 * q, b.y - 14 - q * 85, 7 + q * 17, `rgba(245,240,235,${0.24 * (1 - q) * Math.min(1, q * 4)})`);
    }
    // flour dust hanging in the air
    for (const m of a.motes) {
      const x = ((m.x + t * m.sp + hw) % (hw * 2) + hw * 2) % (hw * 2) - hw + Math.sin(t * 0.3 + m.ph) * 20;
      const y = m.y + Math.sin(t * 0.5 + m.ph) * 16;
      circle(ctx, x, y, m.s, `rgba(255,250,235,${0.16 + 0.12 * Math.sin(t * 1.7 + m.ph)})`);
    }
    // the rat: scurries halfway, stops to sniff, then bolts for the other corner
    const cyc = Math.floor((t + a.rat.ph) / a.rat.every), p = ((t + a.rat.ph) % a.rat.every) / 4;
    if (p < 1) {
      const u = p < 0.4 ? p / 0.4 * 0.5 : p < 0.62 ? 0.5 : 0.5 + (p - 0.62) / 0.38 * 0.5, dir = cyc % 2 ? 1 : -1;
      const x = dir * (-hw + 60 + u * (hw * 2 - 120)), y = hh - 18, run = p < 0.4 || p >= 0.62;
      const bob = run ? Math.sin(t * 40) * 1.2 : 0;
      ctx.save(); ctx.translate(x, y + bob); ctx.scale(dir, 1);
      ctx.beginPath(); ctx.moveTo(-9, 1); ctx.quadraticCurveTo(-20, 4 + Math.sin(t * 12) * 3, -28, -1 + Math.sin(t * 9) * 3);
      ctx.strokeStyle = '#c89a8a'; ctx.lineWidth = 1.6; ctx.stroke();
      ellipse(ctx, 0, 0, 10, 5.5, 0, '#6a625e', OUT, 1.5);
      ellipse(ctx, 9, -0.5, 5, 4, 0, '#7a726e', OUT, 1.2);
      circle(ctx, 6, -4.5, 2.2, '#c89a8a'); circle(ctx, 13, -1, 1, '#1a1210');
      if (!run) line(ctx, 14, 0, 18, -1 + Math.sin(t * 30) * 1.5, '#d8c8c0', 0.8);   // whiskers twitching
      ctx.restore();
    }
  },

  // dew twinkles on the web, drips fall into the pools and ripple, spiders creep along the spokes, spores drift up
  // and a cold fog slides along the walls
  caveLife(ctx, a, t) {
    for (const f of a.fog) {
      const an = f.a + t * f.sp, d = ARENA.edge(an) - 40;
      glow(ctx, Math.cos(an) * d, Math.sin(an) * d, f.s, '#8aa0b8', 0.07);
    }
    for (const p of a.pools) {
      const q = ((t + p.ph) % p.every) / p.every;
      if (q < 0.12) { const f = q / 0.12; line(ctx, p.x, p.y - 70 * (1 - f) - 6, p.x, p.y - 70 * (1 - f), 'rgba(190,210,240,0.7)', 2); }
      else for (let k = 0; k < 2; k++) {
        const e = (q - 0.12) / 0.88 - k * 0.18;
        if (e <= 0 || e >= 1) continue;
        ellipse(ctx, p.x, p.y, p.w * 0.9 * e, p.h * 0.9 * e, 0, null, `rgba(170,190,230,${0.45 * (1 - e)})`, 1.4);
      }
    }
    for (const d of a.dew) {
      const s = Math.max(0, Math.sin(t * d.sp + d.ph)), k = s ** 14;
      if (k < 0.03) continue;
      glow(ctx, d.x, d.y, 9, '#e8f0ff', 0.7 * k);
      circle(ctx, d.x, d.y, 1.3, `rgba(255,255,255,${k})`);
    }
    const inner = ARENA.inner;
    for (const m of a.spores) {
      const y = ((m.y - t * m.sp + inner) % (inner * 2) + inner * 2) % (inner * 2) - inner, x = m.x + Math.sin(t * 0.6 + m.ph) * 18;
      if (ARENA.sd(x, y) > -10) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + m.ph);
      glow(ctx, x, y, 8, '#b8ff9a', 0.18 + 0.2 * tw);
      circle(ctx, x, y, 1.2, `rgba(220,255,200,${0.4 + 0.4 * tw})`);
    }
    for (const sp of a.spiders) {
      const w = Math.sin(t * sp.sp * TAU + sp.ph), f = 0.3 + 0.55 * (0.5 + 0.5 * w);
      const [sx, sy] = sp.spoke, x = sx * f, y = sy * f, ang = Math.atan2(sy, sx) + (Math.cos(t * sp.sp * TAU + sp.ph) > 0 ? 0 : Math.PI);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      for (let k = 0; k < 4; k++) for (const side of [-1, 1]) {
        const lx = -3 + k * 2.4, wig = Math.sin(t * 22 + k + (side > 0 ? 1.5 : 0)) * 1.5;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + (k - 1.5) * 2 + wig, side * 5); ctx.lineTo(lx + (k - 1.5) * 3.5 + wig, side * 8);
        ctx.strokeStyle = '#120e16'; ctx.lineWidth = 1; ctx.stroke();
      }
      ellipse(ctx, -2, 0, 4.5, 3.5, 0, '#1a141e'); circle(ctx, 3, 0, 2.4, '#1a141e'); circle(ctx, 4, -0.8, 0.6, '#ff4a6a');
      ctx.restore();
    }
  },

  // ------------------------------------------------------------------ boss hitbox ring
  // Front, flanks and rear are marked so positionals can be read at a glance.
  drawBossRing(ctx, boss) {
    const r = FIGHT.BOSS_R + 8, f = boss.f;
    circle(ctx, boss.x, boss.y, r, null, 'rgba(255,255,255,0.25)', 1.5);
    const arc = (a0, a1, color, w) => { ctx.beginPath(); ctx.arc(boss.x, boss.y, r, a0, a1); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.stroke(); };
    arc(f - Math.PI / 4, f + Math.PI / 4, 'rgba(255,96,70,0.75)', 4);
    arc(f + Math.PI * 3 / 4, f + Math.PI * 5 / 4, 'rgba(176,130,255,0.7)', 4);
    arc(f + Math.PI / 4 + 0.08, f + Math.PI * 3 / 4 - 0.08, 'rgba(255,255,255,0.35)', 3);
    arc(f - Math.PI * 3 / 4 + 0.08, f - Math.PI / 4 - 0.08, 'rgba(255,255,255,0.35)', 3);
    // facing pip
    const px = boss.x + Math.cos(f) * (r + 9), py = boss.y + Math.sin(f) * (r + 9);
    ctx.save(); ctx.translate(px, py); ctx.rotate(f);
    poly(ctx, [7, 0, -4, -6, -4, 6], 'rgba(255,110,80,0.9)', OUT, 1.5);
    ctx.restore();
  },

  // ------------------------------------------------------------------ hazards on the floor
  drawPuddles(ctx, puddles, t) {
    for (const p of puddles.values()) {
      const life = Math.min(1, (t - p.start) / 0.4), left = p.end - t;
      const k = life * Math.min(1, left / 1.2);
      if (k <= 0) continue;
      const r = p.r * (0.7 + 0.3 * life);
      if (p.tag === 'venom') { this.venomPool(ctx, p, r, k, t); continue; }
      glow(ctx, p.x, p.y, r * 1.25, '#ff9a2a', 0.18 * k);
      ctx.save(); ctx.globalAlpha = k;
      const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
      g.addColorStop(0, '#d89a3a'); g.addColorStop(0.6, '#8a4e14'); g.addColorStop(1, '#4a2408');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const a = i * TAU / 18, w = 1 + Math.sin(a * 3 + p.id) * 0.06 + Math.sin(a * 5 + t * 1.5) * 0.03;
        const x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,90,0.7)'; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.7 + i / 4 + p.id * 0.13) % 1, a = i * 1.9 + p.id;
        circle(ctx, p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.5, 2 + q * 5, null, `rgba(255,220,150,${0.6 * (1 - q)})`, 1.5);
      }
      for (let i = 0; i < 3; i++) flame(ctx, p.x + Math.cos(i * 2.1 + p.id) * r * 0.35, p.y + Math.sin(i * 2.1 + p.id) * r * 0.35, 5, t + i);
      ctx.restore();
    }
  },

  // green, bubbling and sticky
  venomPool(ctx, p, r, k, t) {
    glow(ctx, p.x, p.y, r * 1.3, '#7aff3a', 0.16 * k);
    ctx.save(); ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, '#9adf3a'); g.addColorStop(0.65, '#3f7a1a'); g.addColorStop(1, '#1e3a0c');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = i * TAU / 20, w = 1 + Math.sin(a * 4 + p.id) * 0.07 + Math.sin(a * 7 + t) * 0.03;
      const x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(190,255,120,0.75)'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const q = (t * 0.6 + i / 6 + p.id * 0.17) % 1, a = i * 2.3 + p.id, d = r * (0.2 + (i % 3) * 0.22);
      circle(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 2 + q * 6, `rgba(210,255,150,${0.5 * (1 - q)})`, `rgba(230,255,190,${0.7 * (1 - q)})`, 1);
    }
    ctx.restore();
  },

  // lasting zones: the sticky outer web in Skitterra's phase 2
  drawZones(ctx, zones, t) {
    const R = ARENA.R;
    for (const z of zones.values()) {
      // fades in as the web spreads, and out over its last second
      const k = Math.min(1, (t - z.start) / 1.2, Math.max(0, (z.end - t) / 1));
      if (k <= 0) continue;
      const s = z.shape;
      if (z.tag === 'trail') { this.silkTrail(ctx, s, k, t); continue; }
      if (z.tag === 'stovefire') { this.stoveFire(ctx, z, t); continue; }
      if (z.tag === 'acid') { this.acidFloor(ctx, z, k, t); continue; }
      ctx.save();
      ARENA.trace(ctx, 2); ctx.clip();   // the web stops at the walls, whatever shape they are
      SHAPES.trace(ctx, s);
      ctx.fillStyle = `rgba(230,230,245,${0.13 * k})`; ctx.fill('evenodd');
      // thick, glistening strands across the ring
      ctx.globalAlpha = k;
      for (let i = 0; i < 48; i++) {
        const a = i * TAU / 48, a2 = a + 0.09 * (i % 2 ? 1 : -1);
        line(ctx, Math.cos(a) * s.r2, Math.sin(a) * s.r2, Math.cos(a2) * R, Math.sin(a2) * R, 'rgba(240,240,255,0.32)', 2);
      }
      for (let rr = s.r2 + 22; rr < R; rr += 26) circle(ctx, 0, 0, rr, null, 'rgba(240,240,255,0.22)', 1.5);
      circle(ctx, 0, 0, s.r2, null, `rgba(255,255,255,${0.45 + Math.sin(t * 2) * 0.1})`, 2.5);
      for (let i = 0; i < 10; i++) { const a = i * 0.63 + t * 0.05, d = s.r2 + 30 + (i * 37) % Math.max(1, ARENA.inner - s.r2 - 40); circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 2, `rgba(255,255,255,${0.4 + Math.sin(t * 3 + i) * 0.3})`); }
      ctx.restore();
    }
  },

  // the silk Skitterra drags behind her on a Fang Rush (Hard): a sticky strip of tangled threads along her path
  silkTrail(ctx, s, k, t) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), hw = s.w / 2;
    ctx.save();
    ARENA.trace(ctx, 2); ctx.clip();
    SHAPES.trace(ctx, s);
    ctx.fillStyle = `rgba(230,230,245,${0.14 * k})`; ctx.fill();
    ctx.globalAlpha = k;
    for (let i = 0; i < 9; i++) {
      const off = -hw + (i + 0.5) * s.w / 9, wob = Math.sin(i * 2.7) * 10;
      ctx.beginPath(); ctx.moveTo(s.x - sa * off, s.y + ca * off);
      ctx.quadraticCurveTo(s.x + ca * s.len / 2 - sa * (off + wob), s.y + sa * s.len / 2 + ca * (off + wob), s.x + ca * s.len - sa * off, s.y + sa * s.len + ca * off);
      ctx.strokeStyle = 'rgba(240,240,255,0.32)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (let d = 20; d < s.len; d += 34) line(ctx, s.x + ca * d - sa * hw, s.y + sa * d + ca * hw, s.x + ca * (d + 14) + sa * hw, s.y + sa * (d + 14) - ca * hw, 'rgba(240,240,255,0.2)', 1.2);
    for (let i = 0; i < 6; i++) { const d = ((i * 97) % 100) / 100 * s.len, off = (((i * 53) % 100) / 100 - 0.5) * s.w * 0.8; circle(ctx, s.x + ca * d - sa * off, s.y + sa * d + ca * off, 2, `rgba(255,255,255,${0.4 + Math.sin(t * 3 + i) * 0.3})`); }
    ctx.restore();
  },

  // the stove line erupting (Grubnak's charge into it): first the burners flare and heat shimmers over the top of the
  // room, then it's a wall of fire until it dies down
  stoveFire(ctx, z, t) {
    const s = z.shape, x0 = s.x, x1 = s.x + s.len, y0 = s.y - s.w / 2, y1 = s.y + s.w / 2;
    const warm = clamp((t - z.start) / Math.max(0.1, z.at - z.start), 0, 1), on = t >= z.at, k = Math.min(1, Math.max(0, (z.end - t) / 1.2));
    ctx.save();
    ARENA.trace(ctx, 2); ctx.clip();
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba('#ff5a1a', (on ? 0.5 : 0.25 * warm) * k)); g.addColorStop(1, rgba('#ff8a2a', (on ? 0.14 : 0.04 * warm) * k));
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (!on) {
      for (let i = 0; i < 14; i++) { const x = x0 + (i + 0.5) / 14 * (x1 - x0), q = (t * 1.3 + hash01(i)) % 1; ctx.beginPath(); ctx.moveTo(x, y1 - q * (y1 - y0)); ctx.quadraticCurveTo(x + 6, y1 - q * (y1 - y0) - 10, x, y1 - q * (y1 - y0) - 20); ctx.strokeStyle = rgba('#ffd0a0', 0.4 * warm * (1 - q)); ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 30; line(ctx, x0, y1, x1, y1, rgba('#ffb070', 0.4 + 0.5 * warm), 3);
    } else {
      // rows of fire tongues, the back rows taller (the stove line behind them is the hottest)
      for (let row = 0; row < 3; row++) for (let i = 0; i < 18; i++) {
        const x = x0 + (i + 0.5 + (row % 2) * 0.5) / 18 * (x1 - x0), y = y0 + (y1 - y0) * (0.3 + row * 0.3), h = 0.6 + 0.4 * Math.sin(t * 6 + i * 1.7 + row);
        this.fireTongue(ctx, x + Math.sin(t * 3 + i) * 4, y, (46 - row * 10) * h * k, 13 - row * 2, t + i * 0.37 + row);
      }
      glow(ctx, (x0 + x1) / 2, y0 + 40, (x1 - x0) * 0.4, '#ff7a1a', 0.18 * k);
      line(ctx, x0, y1, x1, y1, rgba('#ffe0a0', 0.55 * k), 2.5);
    }
    ctx.restore();
  },
  // one licking tongue of fire standing on (x, y): dark red outside, orange, a yellow core
  fireTongue(ctx, x, y, h, w, t) {
    if (h <= 1) return;
    const sw = Math.sin(t * 7) * w * 0.5;
    const tongue = (hh, ww, col) => {
      ctx.beginPath(); ctx.moveTo(x - ww, y);
      ctx.quadraticCurveTo(x - ww * 1.1, y - hh * 0.5, x + sw, y - hh);
      ctx.quadraticCurveTo(x + ww * 1.1, y - hh * 0.5, x + ww, y);
      ctx.quadraticCurveTo(x, y + ww * 0.5, x - ww, y); ctx.fillStyle = col; ctx.fill();
    };
    tongue(h, w, 'rgba(170,40,10,0.75)'); tongue(h * 0.78, w * 0.72, 'rgba(255,120,30,0.9)'); tongue(h * 0.45, w * 0.4, 'rgba(255,225,120,0.95)');
  },
  // Acid Deluge (Skitterra, Hard): the floor the acid fell on stays sticky for a while; the shadows it missed stay clean
  acidFloor(ctx, z, k, t) {
    const s = z.shape;
    ctx.save();
    ARENA.trace(ctx, 2); ctx.clip();
    for (const [cx, cy, r] of s.covers || []) {
      const sh = PROPS.shadowPoly(s.x, s.y, { shape: 'circle', x: cx, y: cy, r });
      if (!sh) continue;
      ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 8000); sh.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip('evenodd');
    }
    ctx.fillStyle = rgba('#7ad83a', 0.13 * k); ctx.fillRect(-ARENA.R - 20, -ARENA.R - 20, ARENA.R * 2 + 40, ARENA.R * 2 + 40);
    for (let i = 0; i < 40; i++) { const a = hash01(i) * TAU, d = Math.sqrt(hash01(i + 40)) * ARENA.R, q = (t * 0.5 + hash01(i + 80)) % 1; circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 3 + q * 7, null, rgba('#c8ff8a', 0.35 * (1 - q) * k), 1.2); }
    ctx.restore();
  },

  // a tether between two players: a silk thread. Long ones (green on Hard) want stretching, short ones (red, thick) want
  // keeping close. The thread goes taut and bright once the distance is right.
  tether(ctx, a, b, th, t, hard) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ok = th.kind === 'long' ? d >= th.len : d <= th.len;
    if (th.tag === 'bind') return this.graveChain(ctx, a, b, th, t, d, ok);
    const color = !hard ? '#f0eaff' : th.kind === 'long' ? '#6dff7a' : '#ff4a4a';
    const w = th.kind === 'short' ? 6 : 3;
    const left = Math.max(0, th.end - t), p = 1 - left / Math.max(0.1, th.end - th.start);
    // slack threads sag and wobble; satisfied ones run straight
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const nx = -(b.y - a.y) / (d || 1), ny = (b.x - a.x) / (d || 1);
    const sag = ok ? 0 : 26 + Math.sin(t * 6) * 6;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y - 20); ctx.quadraticCurveTo(mx + nx * sag, my + ny * sag - 20, b.x, b.y - 20);
    ctx.strokeStyle = rgba(color, ok ? 0.35 : 0.18); ctx.lineWidth = w + 6; ctx.stroke();
    ctx.strokeStyle = rgba(color, ok ? 1 : 0.6 + 0.3 * Math.sin(t * 10)); ctx.lineWidth = w; ctx.stroke();
    // a bead of light runs along it faster as it nears resolving
    const q = (t * (0.6 + p * 2.5)) % 1, s = 1 - q;
    const bx = s * s * a.x + 2 * s * q * (mx + nx * sag) + q * q * b.x, by = s * s * (a.y - 20) + 2 * s * q * (my + ny * sag - 20) + q * q * (b.y - 20);
    glow(ctx, bx, by, 12, color, 0.8);
    for (const e of [a, b]) circle(ctx, e.x, e.y - 20, 5, rgba(color, 0.9), OUT, 1.5);
    ctx.restore();
  },

  // Gravebind (the Hollow King, Hard): an iron grave-chain between two heroes, drawn tight and burning green when it's
  // stretched too far, hanging slack once they're close
  graveChain(ctx, a, b, th, t, d, ok) {
    const left = Math.max(0, th.end - t), p = 1 - left / Math.max(0.1, th.end - th.start);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 20, nx = -(b.y - a.y) / (d || 1), ny = (b.x - a.x) / (d || 1);
    const sag = ok ? 18 : 0, n = Math.max(4, Math.floor(d / 16));
    const at = q => { const s = 1 - q, cx = mx + nx * sag, cy = my + ny * sag + sag; return [s * s * a.x + 2 * s * q * cx + q * q * b.x, s * s * (a.y - 20) + 2 * s * q * cy + q * q * (b.y - 20)]; };
    if (!ok) { ctx.save(); ctx.lineCap = 'round'; line(ctx, a.x, a.y - 20, b.x, b.y - 20, rgba('#5adf8a', 0.25 + 0.15 * Math.sin(t * 10)), 12); ctx.restore(); }
    for (let i = 0; i < n; i++) {
      const [x, y] = at((i + 0.5) / n), [x2, y2] = at((i + 1) / n), ang = Math.atan2(y2 - y, x2 - x);
      ellipse(ctx, x, y, 9, i % 2 ? 2.5 : 5, ang, null, i % 2 ? '#4a5258' : '#6a747c', 2.5);
      if (!ok) ellipse(ctx, x, y, 9, i % 2 ? 2.5 : 5, ang, null, rgba('#9affc0', 0.6), 1);
    }
    const q = (t * (0.6 + p * 2.5)) % 1, [gx, gy] = at(q);
    glow(ctx, gx, gy, 14, '#6dff9a', 0.7);
    for (const e of [a, b]) { circle(ctx, e.x, e.y - 20, 7, null, '#6a747c', 3); glow(ctx, e.x, e.y - 20, 12, '#6dff9a', 0.5); }
  },

  // the burning beam between a linked pair of adds (Hard brood)
  addBeam(ctx, a, b, t) {
    ctx.save(); ctx.lineCap = 'round';
    line(ctx, a.x, a.y, b.x, b.y, 'rgba(255,90,200,0.25)', 26);
    line(ctx, a.x, a.y, b.x, b.y, `rgba(255,140,230,${0.75 + Math.sin(t * 14) * 0.2})`, 6);
    line(ctx, a.x, a.y, b.x, b.y, 'rgba(255,240,255,0.9)', 2);
    ctx.restore();
  },

  // Eightfold Lunge: the legs that will strike light up around her, brightest = next. They show the whole order.
  lungeLegs(ctx, x, y, lg, t) {
    let first = -1;
    for (let k = 0; k < lg.n; k++) {
      const at = lg.start + lg.delay + k * lg.step;
      if (t > at + 0.15) continue;
      if (first < 0) first = k;
      const order = k - first;  // 0 = next to strike
      const a0 = lg.a0 + lg.dir * k * Math.PI / 4;
      const bright = order === 0 ? 0.95 : Math.max(0.18, 0.6 - order * 0.12);
      for (const a of [a0, a0 + Math.PI]) {
        const c = Math.cos(a), s = Math.sin(a);
        const r0 = 70, r1 = order === 0 ? 150 + Math.sin(t * 12) * 6 : 125;
        ctx.save(); ctx.lineCap = 'round';
        line(ctx, x + c * r0, y + s * r0, x + c * r1, y + s * r1, rgba('#ff4a8a', bright * 0.35), 14);
        line(ctx, x + c * r0, y + s * r0, x + c * r1, y + s * r1, rgba('#ffd0f0', bright), 4);
        glow(ctx, x + c * r1, y + s * r1, 16, '#ff6ab0', bright * 0.8);
        ctx.restore();
      }
    }
  },

  // eggs on the floor just before Brood hatches
  eggs(ctx, pts, p, t) {
    for (const [x, y] of pts) {
      glow(ctx, x, y, 40, '#e8ff9a', 0.3 + p * 0.4);
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5, d = i ? 14 : 0;
        const wob = Math.sin(t * (6 + p * 14) + i) * (1 + p * 2);
        ellipse(ctx, x + Math.cos(a) * d + wob, y + Math.sin(a) * d, 9, 7, a, '#f2f0dc', OUT, 1.5);
      }
    }
  },

  // ------------------------------------------------------------------ telegraphs
  // tg: { shape, start, dur, type, hidden, follow, target, aim, lockAt, need, tag }
  // live(): the current shape (follow/aim applied by the caller)
  drawTelegraphs(ctx, tgs, t, env) {
    ctx.save();
    ARENA.trace(ctx, 4); ctx.clip();
    this.drawTelegraphsInner(ctx, tgs, t, env);
    ctx.restore();
  },
  drawTelegraphsInner(ctx, tgs, t, env) {
    for (const tg of tgs.values()) {
      const p = clamp((t - tg.start) / tg.dur, 0, 1);
      const s = tg.live;
      const fadeIn = BossTells.fade(tg, t);
      if (fadeIn <= 0) continue;
      // most mechanics have their own art (boss-tells.js); raidwides only show if they do
      if (tg.type === 'raidwide') { if (env) BossTells.ground(ctx, tg, s, p, fadeIn, t, env); continue; }
      if (tg.hidden) continue;
      if (env && BossTells.ground(ctx, tg, s, p, fadeIn, t, env)) continue;
      switch (tg.type) {
        case 'aoe': case 'buster': this.areaWarning(ctx, s, p, fadeIn, tg.type === 'buster' ? '#ff2a3a' : '#ff6a3a', t); break;
        case 'stack': this.stackMarker(ctx, s, p, fadeIn, t); break;
        case 'spread': this.spreadMarker(ctx, s, p, fadeIn, t); break;
        case 'tower': this.tower(ctx, s, p, fadeIn, t, tg.need, tg.color); break;
        case 'proximity': this.proximity(ctx, s, p, fadeIn, t); break;
        case 'knockback': this.knockback(ctx, s, p, fadeIn, t); break;
      }
    }
  },

  // FF14-style: tinted area + bright rim, with a fill that grows from the origin as the cast completes
  // The rim glows, an inner edge marches, and the last quarter pulses faster and brighter
  // (anticipation: the closer it is to landing, the louder it gets).
  areaWarning(ctx, s, p, k, color, t = performance.now() / 1000) {
    const late = Math.max(0, (p - 0.75) / 0.25);
    const pulse = late > 0 ? 0.5 + 0.5 * Math.sin(t * (10 + late * 22)) : 0;
    ctx.save();
    SHAPES.trace(ctx, s);
    ctx.fillStyle = rgba(color, (0.16 + 0.1 * late + 0.08 * pulse) * k); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.setLineDash([18, 14]); ctx.lineDashOffset = -t * 40;
    ctx.strokeStyle = rgba(color, 0.35 * k); ctx.lineWidth = 10; ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(color, (0.25 + 0.25 * pulse) * k); ctx.lineWidth = 9; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba(color, 0.9 * k); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', (0.35 + 0.5 * late) * k); ctx.lineWidth = 1; ctx.stroke();
    const g = this.grown(s, p);
    if (g) {
      SHAPES.trace(ctx, g); ctx.fillStyle = rgba(color, 0.2 * k); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(color, 0.45 * k); ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  },
  grown(s, p) {
    const e = easeOut(p);
    switch (s.kind) {
      case 'circle': return Object.assign({}, s, { r: s.r * e });
      case 'cone': return Object.assign({}, s, { r: s.r * e });
      case 'rect': return Object.assign({}, s, { len: Math.min(s.len, 900) * e });
      case 'cross': return Object.assign({}, s, { len: Math.min(s.len, 700) * e });
      case 'donut': { const r = Math.min(s.r, ARENA.R + 20); return Object.assign({}, s, { r, r2: r - (r - s.r2) * e }); }
    }
    return null;
  },

  stackMarker(ctx, s, p, k, t) {
    const { x, y, r } = s;
    circle(ctx, x, y, r, rgba('#ffd84a', 0.12 * k), rgba('#ffd84a', 0.7 * k), 2);
    // chevrons closing in on the target
    const pull = (t * 0.9) % 1;
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + Math.PI / 4, d = r * (1.15 - pull * 0.45);
      ctx.save(); ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.rotate(a + Math.PI);
      ctx.globalAlpha = k * (0.35 + 0.65 * (1 - pull));
      poly(ctx, [-6, -12, 8, 0, -6, 12, -1, 0], '#ffd84a', OUT, 1.5);
      ctx.restore();
    }
    // closing ring shows when it lands
    circle(ctx, x, y, r * (1 - p) + 6, null, rgba('#fff2b0', 0.8 * k), 2);
  },

  spreadMarker(ctx, s, p, k, t) {
    const { x, y, r } = s;
    circle(ctx, x, y, r, rgba('#c070ff', 0.16 * k), rgba('#d79bff', 0.85 * k), 2.5);
    const push = (t * 0.9) % 1;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + t * 0.5, d = r * (0.35 + push * 0.5);
      ctx.save(); ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.rotate(a);
      ctx.globalAlpha = k * (1 - push);
      poly(ctx, [-5, -8, 7, 0, -5, 8], '#e6c2ff', OUT, 1);
      ctx.restore();
    }
    circle(ctx, x, y, r * (1 - p) + 4, null, rgba('#f2dcff', 0.7 * k), 1.5);
  },

  tower(ctx, s, p, k, t, need, color) {
    const { x, y, r } = s, base = color || '#4fe0d0', hi = color || '#9ffff4';
    glow(ctx, x, y, r * 1.6, base, 0.35 * k);
    circle(ctx, x, y, r, rgba(base, 0.18 * k), rgba(hi, 0.95 * k), 3);
    circle(ctx, x, y, r * 0.78, null, rgba(hi, 0.4 * k), 1.5);
    // light column
    const g = ctx.createLinearGradient(0, y - 150, 0, y);
    g.addColorStop(0, rgba(hi, 0)); g.addColorStop(1, rgba(hi, 0.35 * k));
    ctx.fillStyle = g; ctx.fillRect(x - r * 0.5, y - 150, r, 150);
    // one pip per person it wants
    for (let i = 0; i < Math.max(1, need); i++) {
      const a = -Math.PI / 2 + (i - (need - 1) / 2) * 0.45;
      circle(ctx, x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12), 4.5, rgba('#d8fffa', k), OUT, 1.5);
    }
    // countdown ring
    ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
    ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 2; ctx.stroke();
  },

  proximity(ctx, s, p, k, t) {
    // heat waves rolling out from the source: hottest close in
    const max = ARENA.R * 1.1;
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, max);
    g.addColorStop(0, rgba('#ff3a1a', 0.42 * k)); g.addColorStop(0.45, rgba('#ff7a1a', 0.16 * k)); g.addColorStop(1, rgba('#ff7a1a', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, max, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.5 + i / 4) % 1;
      circle(ctx, s.x, s.y, 40 + q * max, null, rgba('#ffb070', 0.5 * (1 - q) * k), 2);
    }
  },

  knockback(ctx, s, p, k, t) {
    circle(ctx, s.x, s.y, 60, rgba('#a0d8ff', 0.2 * k), rgba('#d0f0ff', 0.8 * k), 2);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, q = (t * 1.2 + (i % 2) * 0.5) % 1, d = 80 + q * 260;
      ctx.save(); ctx.translate(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d); ctx.rotate(a);
      ctx.globalAlpha = k * (1 - q);
      poly(ctx, [-8, -10, 10, 0, -8, 10, -3, 0], '#d0f0ff', OUT, 1);
      ctx.restore();
    }
  },

  // ------------------------------------------------------------------ the room's props and floor state
  // The host owns them (fight.js): a 'props' message carries every prop, the floor changes and the burning grease.
  // Floor changes are drawn once into their own cached layer; props are drawn with the units, sorted by depth.
  newRoom() { return { props: [], floor: [], fv: -1, lit: new Map(), layer: null, layerFor: '', born: new Map(), ev: {} }; },
  roomProps(room, msg, now) {
    const seen = new Set();
    room.props = (msg.p || []).map(a => {
      const pr = PROPS.unpack(a);
      seen.add(pr.id);
      if (!room.born.has(pr.id)) room.born.set(pr.id, now);
      pr.born = room.born.get(pr.id);
      return pr;
    });
    for (const id of [...room.born.keys()]) if (!seen.has(id)) room.born.delete(id);
    if (msg.fv !== room.fv && Array.isArray(msg.f)) {
      room.fv = msg.fv; room.floor = msg.f; room.layerFor = '';
      // a round room's broken-off wedges move its wall (Volkar, Hard)
      if (ARENA.kind === 'circle') ARENA.cuts = room.floor.filter(f => f.kind === 'wedge').map(f => ({ a0: f.a0, a1: f.a1, r: f.r }));
    }
    room.lit = new Map((msg.lit || []).map(([id, s]) => [id, now + s]));
  },
  // moments the room shows that aren't props: { k: 'lightsout' | 'ambush' | ... } (see each boss)
  roomEvent(room, msg, now) {
    room.ev[msg.k] = Object.assign({}, msg, { start: now, end: now + (msg.dur || 0) });
    if (msg.k === 'stove' && typeof BOSS_VFX !== 'undefined') BOSS_VFX.stoveBurst(msg.x || 0);
  },

  // the floor layer: rubble, grease, broken ground. Same size and scale as the floor, rebuilt only when it changes
  drawRoomFloor(ctx, room) {
    if (!room.floor.length || !this.floor) return;
    const key = room.fv + '@' + this.floorFor;
    if (room.layerFor !== key) {
      const cv = room.layer && room.layer.width === this.floor.width && room.layer.height === this.floor.height ? room.layer : document.createElement('canvas');
      cv.width = this.floor.width; cv.height = this.floor.height;
      const c = cv.getContext('2d'), { bx, by } = this.floorBox;
      c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(cv.width / (bx * 2), 0, 0, cv.height / (by * 2), 0, 0); c.translate(bx, by);
      for (const fl of room.floor) this.floorMark(c, fl);
      room.layer = cv; room.layerFor = key;
    }
    const { bx, by } = this.floorBox;
    ctx.drawImage(room.layer, -bx, -by, bx * 2, by * 2);
  },
  floorMark(c, fl) {
    const r = rng(fl.id * 7 + 3);
    if (fl.kind === 'grease') {
      // dark, glossy grease backed up out of the drains
      c.save();
      c.beginPath();
      for (let i = 0; i <= 22; i++) { const a = i * TAU / 22, w = fl.r * (0.85 + 0.15 * Math.sin(a * 3 + fl.id) + 0.05 * Math.sin(a * 7)); i ? c.lineTo(fl.x + Math.cos(a) * w, fl.y + Math.sin(a) * w * 0.86) : c.moveTo(fl.x + Math.cos(a) * w, fl.y + Math.sin(a) * w * 0.86); }
      c.closePath();
      const g = c.createRadialGradient(fl.x - fl.r * 0.2, fl.y - fl.r * 0.25, fl.r * 0.1, fl.x, fl.y, fl.r);
      g.addColorStop(0, 'rgba(92,70,30,0.9)'); g.addColorStop(0.7, 'rgba(48,34,12,0.88)'); g.addColorStop(1, 'rgba(30,20,6,0.8)');
      c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(150,120,60,0.55)'; c.lineWidth = 2; c.stroke();
      for (let i = 0; i < 4; i++) ellipse(c, fl.x + (r() - 0.6) * fl.r * 0.9, fl.y + (r() - 0.6) * fl.r * 0.7, fl.r * (0.12 + r() * 0.14), fl.r * 0.04, -0.3, 'rgba(255,240,200,0.18)');
      c.restore();
    } else if (fl.kind === 'rubble') this.rubble(c, fl, r);
    else if (fl.kind === 'wedge') this.brokenWedge(c, fl, r);
    else if (fl.kind === 'scorch') { glow(c, fl.x, fl.y, fl.r, '#140a04', 0.6); }
    else if (fl.kind === 'thread') this.webThread(c, fl);
    else if (fl.kind === 'pit') this.webPit(c, fl);
  },
  // Skitterra's Spin: a thick strand of silk strung pillar to pillar, low across the floor (crossing it stings)
  webThread(c, fl) {
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(fl.x1, fl.y1); c.lineTo(fl.x2, fl.y2);
    c.strokeStyle = 'rgba(10,8,14,0.5)'; c.lineWidth = 10; c.stroke();
    c.strokeStyle = 'rgba(232,230,248,0.85)'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.2; c.stroke();
    const n = Math.max(2, Math.round(Math.hypot(fl.x2 - fl.x1, fl.y2 - fl.y1) / 40));
    for (let i = 1; i < n; i++) { const q = i / n; circle(c, fl.x1 + (fl.x2 - fl.x1) * q, fl.y1 + (fl.y2 - fl.y1) * q, 2.2, 'rgba(255,255,255,0.85)'); }
    c.restore();
  },
  // Skitterra's collapse: the floor between r2 and r has fallen into the dark; the silk paths across it stay
  webPit(c, fl) {
    c.save();
    ARENA.trace(c, 0); c.clip();   // the dark stops at the cave's walls
    c.beginPath(); c.arc(0, 0, fl.r, 0, TAU); c.arc(0, 0, fl.r2, 0, TAU, true);
    const g = c.createRadialGradient(0, 0, fl.r2, 0, 0, Math.min(fl.r, fl.r2 + 160));
    g.addColorStop(0, '#05030a'); g.addColorStop(1, '#0b0814');
    c.fillStyle = g; c.fill('evenodd');
    c.strokeStyle = 'rgba(120,110,150,0.45)'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, fl.r2, 0, TAU); c.stroke();
    c.beginPath(); c.arc(0, 0, fl.r, 0, TAU); c.arc(0, 0, fl.r2, 0, TAU, true);
    c.clip('evenodd');
    for (const [x1, y1, x2, y2, w] of fl.paths || []) this.silkPath(c, x1, y1, x2, y2, w);
    c.restore();
  },
  // a strip of web you can still walk on, over the dark
  silkPath(c, x1, y1, x2, y2, w) {
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    c.save();
    c.beginPath(); c.moveTo(x1 + nx * w / 2, y1 + ny * w / 2); c.lineTo(x2 + nx * w / 2, y2 + ny * w / 2); c.lineTo(x2 - nx * w / 2, y2 - ny * w / 2); c.lineTo(x1 - nx * w / 2, y1 - ny * w / 2); c.closePath();
    c.fillStyle = 'rgba(70,64,86,0.92)'; c.fill();
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x1 + nx * k * w / 5, y1 + ny * k * w / 5); c.lineTo(x2 + nx * k * w / 5, y2 + ny * k * w / 5); c.strokeStyle = 'rgba(232,230,248,0.55)'; c.lineWidth = k ? 1.2 : 2.2; c.stroke(); }
    for (let d = 20; d < L; d += 34) { c.beginPath(); c.moveTo(x1 + ux * d + nx * w / 2, y1 + uy * d + ny * w / 2); c.lineTo(x1 + ux * (d + 12) - nx * w / 2, y1 + uy * (d + 12) - ny * w / 2); c.strokeStyle = 'rgba(232,230,248,0.3)'; c.lineWidth = 1; c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x1 + nx * w / 2, y1 + ny * w / 2); c.lineTo(x2 + nx * w / 2, y2 + ny * w / 2); c.moveTo(x1 - nx * w / 2, y1 - ny * w / 2); c.lineTo(x2 - nx * w / 2, y2 - ny * w / 2); c.stroke();
    c.restore();
  },
  // The brood clock: a sickly glow under each egg clutch that swells and quickens as it nears hatching
  broodClock(ctx, b, t) {
    for (const [x, y, at] of b.l || []) {
      const left = at > 0 ? at - (t - b.start) : Infinity;
      const q = left === Infinity ? 0.15 : clamp(1 - left / 60, 0.15, 1);
      const beat = 0.5 + 0.5 * Math.sin(t * (2 + q * 10));
      glow(ctx, x, y, 34 + q * 30, '#c8ff8a', (0.12 + 0.3 * q) * (0.6 + 0.4 * beat));
      if (left < 60) { ctx.beginPath(); ctx.arc(x, y, 40, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, Math.min(1, 1 - left / 60))); ctx.strokeStyle = rgba('#d8ff9a', 0.55); ctx.lineWidth = 3; ctx.stroke(); }
    }
  },
  // The Web Gives Way: the ring about to fall shudders and darkens, the silk across it bright, for 6 s
  collapseWarn(ctx, cv, t) {
    const p = clamp((t - cv.start) / Math.max(0.1, cv.end - cv.start), 0, 1);
    const jx = p > 0.6 ? Math.sin(t * 60) * 2 * (p - 0.6) * 2.5 : 0;
    ctx.save(); ctx.translate(jx, 0);
    ARENA.trace(ctx, 2); ctx.clip();
    ctx.beginPath(); ctx.arc(0, 0, Math.min(cv.r, 3000), 0, TAU); ctx.arc(0, 0, cv.r2, 0, TAU, true);
    for (const [x1, y1, x2, y2, w] of cv.paths || []) {   // the silk is safe: cut it out of the warning
      const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L * w / 2, ny = (x2 - x1) / L * w / 2;
      ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.closePath();
    }
    ctx.fillStyle = `rgba(6,4,12,${0.25 + 0.4 * p + 0.06 * Math.sin(t * 9)})`; ctx.fill('evenodd');
    ctx.strokeStyle = rgba('#ff6a3a', 0.5 + 0.4 * p); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, cv.r2, 0, TAU); ctx.stroke();
    const r = rng(Math.round(cv.r2));
    for (let i = 0; i < 18; i++) { const a = r() * TAU, d = cv.r2 + r() * Math.min(200, cv.r - cv.r2); line(ctx, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a + 0.05) * (d + 30), Math.sin(a + 0.05) * (d + 30), rgba('#1a1222', 0.5 + 0.4 * p), 2); }
    ctx.restore();
  },
  // what a broken prop leaves on the floor
  rubble(c, fl, r) {
    const wood = fl.of === 'cask', silk = fl.of === 'pillar', green = fl.of === 'lid';
    glow(c, fl.x, fl.y, fl.r * 1.2, wood ? '#3a1e08' : '#0a0a0c', 0.45);
    if (wood) {   // staves, a hoop and a wine-dark stain
      ellipse(c, fl.x, fl.y + 4, fl.r * 1.1, fl.r * 0.7, 0, 'rgba(70,14,20,0.45)');
      for (let i = 0; i < 7; i++) { const a = r() * TAU, d = r() * fl.r; c.save(); c.translate(fl.x + Math.cos(a) * d, fl.y + Math.sin(a) * d * 0.7); c.rotate(r() * TAU); rrect(c, -12, -3, 24, 6, 2, '#8a5a2e', OUT, 1.5); line(c, -9, 0, 9, 0, 'rgba(40,20,6,0.5)', 1); c.restore(); }
      ellipse(c, fl.x + (r() - 0.5) * 10, fl.y + 6, fl.r * 0.55, fl.r * 0.3, r(), null, '#4a4a52', 3);
      return;
    }
    const col = silk ? '#4a4156' : green ? '#4a5156' : fl.of === 'stone' ? '#5a6270' : fl.of === 'boulder' ? '#6a6460' : '#4a4652';
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * fl.r * 0.9, x = fl.x + Math.cos(a) * d, y = fl.y + Math.sin(a) * d * 0.75, s = 5 + r() * fl.r * 0.28, pts = [];
      for (let k = 0; k < 5; k++) { const q = k * TAU / 5 + r() * 0.5; pts.push(x + Math.cos(q) * s, y + Math.sin(q) * s * 0.8); }
      poly(c, pts, shade(col, (r() - 0.5) * 0.3), OUT, 1.5);
      line(c, pts[0], pts[1], pts[2], pts[3], 'rgba(255,255,255,0.14)', 1.2);
    }
    if (silk) for (let i = 0; i < 4; i++) { const a = r() * TAU; line(c, fl.x, fl.y, fl.x + Math.cos(a) * fl.r * 1.3, fl.y + Math.sin(a) * fl.r, 'rgba(235,235,250,0.3)', 1.2); }
  },
  // Volkar (Hard): a wedge of the summit has broken away: cloud and empty air below a jagged lip
  brokenWedge(c, fl, r) {
    const R = ARENA.full + 60, steps = 28;
    c.save();
    c.beginPath(); c.moveTo(Math.cos(fl.a0) * fl.r, Math.sin(fl.a0) * fl.r);
    const lip = [];
    for (let i = 0; i <= steps; i++) { const a = fl.a0 + (fl.a1 - fl.a0) * i / steps, rr = fl.r + (i && i < steps ? (r() - 0.5) * 14 : 0); lip.push([a, rr]); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.arc(0, 0, R, fl.a1, fl.a0, true); c.closePath();
    const g = c.createRadialGradient(0, 0, fl.r, 0, 0, R);
    g.addColorStop(0, '#0c1018'); g.addColorStop(0.3, '#18202c'); g.addColorStop(1, '#202a38');
    c.fillStyle = g; c.fill();
    c.clip();
    for (let i = 0; i < 10; i++) { const a = fl.a0 + r() * (fl.a1 - fl.a0), d = fl.r + 60 + r() * (R - fl.r); glow(c, Math.cos(a) * d, Math.sin(a) * d, 50 + r() * 50, '#3a4658', 0.4); }
    c.restore();
    // the cliff face under the lip, where it faces us (the south-facing stretch), going down into the cloud
    for (let i = 0; i < lip.length - 1; i++) {
      const [a0, r0] = lip[i], [a1, r1] = lip[i + 1], s = Math.sin((a0 + a1) / 2);
      if (s <= 0.05) continue;
      const x0 = Math.cos(a0) * r0, y0 = Math.sin(a0) * r0, x1 = Math.cos(a1) * r1, y1 = Math.sin(a1) * r1, h = 34 * s;
      const g2 = c.createLinearGradient(0, Math.min(y0, y1), 0, Math.max(y0, y1) + h);
      g2.addColorStop(0, '#3a424e'); g2.addColorStop(1, 'rgba(20,26,34,0)');
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x1, y1 + h); c.lineTo(x0, y0 + h); c.closePath();
      c.fillStyle = g2; c.fill();
    }
    // the broken lip: dark rock face and a lit edge
    c.beginPath(); lip.forEach(([a, rr], i) => (i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)));
    c.strokeStyle = '#151a22'; c.lineWidth = 9; c.stroke();
    c.strokeStyle = 'rgba(200,215,235,0.35)'; c.lineWidth = 1.6; c.stroke();
  },

  // under everything that stands: the floor layer, burning grease, and the darkness of Lights Out
  drawRoomUnder(ctx, room, t, v) {
    this.drawRoomFloor(ctx, room);
    if (this.amb && this.amb.kind === 'barrow') this.chargeBanners(ctx, room, t);
    for (const fl of room.floor) {
      const until = room.lit.get(fl.id);
      if (fl.kind !== 'grease' || !(until > t)) continue;
      const k = Math.min(1, (until - t) / 0.6);
      glow(ctx, fl.x, fl.y, fl.r * 1.5, '#ff7a1a', 0.35 * k);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.39 + fl.id, d = fl.r * (0.2 + (i % 3) * 0.28);
        this.fireTongue(ctx, fl.x + Math.cos(a) * d, fl.y + Math.sin(a) * d * 0.8, (22 + (i % 4) * 7) * k * (0.75 + 0.25 * Math.sin(t * 8 + i)), 9, t + i * 0.7);
      }
    }
    const lo = room.ev.lightsout;
    if (lo && t < lo.end + 0.6) this.drawLightsOut(ctx, room, lo, t, v);
    const sq = room.ev.squall;
    if (sq && t < sq.end + 0.5) this.squallDraw(ctx, sq, t);
    const ey = room.ev.eye;
    if (ey && t < ey.end) this.eyeCalm(ctx, ey, t);
    const brd = room.ev.brood;
    if (brd && t < brd.end) this.broodClock(ctx, brd, t);
    const col = room.ev.collapse;
    if (col && t < col.end + 0.2) this.collapseWarn(ctx, col, t);
    const mise = room.ev.mise;
    if (mise && t < mise.end) this.misePass(ctx, mise, t);
    const amb = room.ev.ambush;
    if (amb && t < amb.end + 0.3) this.ambushShadow(ctx, amb, t);
    const cr = room.ev.crumble;
    if (cr && t < cr.end + 0.1) this.crumbleWarn(ctx, cr, t);
  },
  // Crumbling Summit (Volkar, Hard): the wedge about to go shudders and darkens, and a crack runs along where it'll break
  crumbleWarn(ctx, cr, t) {
    const p = clamp((t - cr.start) / Math.max(0.1, cr.end - cr.start), 0, 1), R = ARENA.full + 10, r = rng(Math.round(cr.a0 * 1000));
    const jx = p > 0.75 ? Math.sin(t * 60) * 2 * (p - 0.75) * 4 : 0;
    ctx.save(); ctx.translate(jx, 0);
    ctx.beginPath(); ctx.arc(0, 0, R, cr.a0, cr.a1); ctx.arc(0, 0, cr.r, cr.a1, cr.a0, true); ctx.closePath();
    ctx.fillStyle = `rgba(8,10,18,${0.2 + 0.35 * p + 0.07 * Math.sin(t * 8)})`; ctx.fill();
    ctx.strokeStyle = rgba('#cfe0f4', 0.12 + 0.2 * p); ctx.lineWidth = 2; ctx.stroke();
    // the crack along the new lip, running out from the middle of the wedge as the time runs down
    const steps = 30, pts = [];
    for (let i = 0; i <= steps; i++) { const a = cr.a0 + (cr.a1 - cr.a0) * i / steps; pts.push([a, cr.r + (i && i < steps ? (r() - 0.5) * 14 : 0)]); }
    const show = Math.min(1, p * 1.6), mid = steps / 2, half = Math.ceil(mid * show);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, col] of [[7, 'rgba(10,12,18,0.9)'], [2, rgba('#dfeeff', 0.55 + 0.45 * p)]]) {
      ctx.beginPath();
      for (let i = Math.max(0, mid - half); i <= Math.min(steps, mid + half); i++) { const [a, rr] = pts[i]; i === Math.max(0, mid - half) ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    }
    // and up each side toward the cliff
    if (p > 0.35) for (const a of [cr.a0, cr.a1]) {
      const q = clamp((p - 0.35) / 0.5, 0, 1);
      let x = Math.cos(a) * cr.r, y = Math.sin(a) * cr.r;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 1; i <= 6; i++) { const d = cr.r + (R - cr.r) * q * i / 6; x = Math.cos(a + (r() - 0.5) * 0.03) * d; y = Math.sin(a + (r() - 0.5) * 0.03) * d; ctx.lineTo(x, y); }
      ctx.strokeStyle = 'rgba(10,12,18,0.8)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = rgba('#cfe0f4', 0.4); ctx.lineWidth = 1.2; ctx.stroke();
    }
    // grit jumping on it
    for (let i = 0; i < 14; i++) {
      const a = cr.a0 + (cr.a1 - cr.a0) * hash01(i * 3 + 1), d = cr.r + 20 + (R - cr.r - 30) * hash01(i * 3 + 2), hop = Math.abs(Math.sin(t * (9 + i) + i)) * 8 * p;
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d - hop, 2 + hash01(i * 3 + 3) * 2, 'rgba(150,160,175,0.7)');
    }
    ctx.restore();
  },
  // over the units: marks that belong over heads (Volkar's rod strike) and the like
  drawRoomOver(ctx, room, t, env) {
    // Grubnak stuck in the wall after a charge: stars turning round his head
    const st = room.ev.stuck;
    if (st && t < st.end && env.boss) {
      const b = env.boss, k = Math.min(1, (st.end - t) / 0.4);
      for (let i = 0; i < 5; i++) {
        const a = t * 3 + i * TAU / 5, x = b.x + Math.cos(a) * 46, y = b.y - 150 + Math.sin(a) * 14;
        ctx.save(); ctx.globalAlpha = k * (0.6 + 0.4 * Math.sin(a)); ctx.translate(x, y); ctx.rotate(t * 4 + i);
        poly(ctx, [0, -8, 2.5, -2.5, 8, 0, 2.5, 2.5, 0, 8, -2.5, 2.5, -8, 0, -2.5, -2.5], '#ffe27a', OUT, 1.2);
        ctx.restore();
      }
    }
    // Court of Bones: grave-light leaks from each waiting coffin, brighter as it's about to open, with its time burning down
    const court = room.ev.court;
    if (court && t < court.end) for (const [x, y, secs] of court.l || []) {
      const at = court.start + secs, left = at - t;
      if (left < 0) continue;
      const hot = clamp(1 - left / 4, 0, 1);
      glow(ctx, x, y, 34 + 30 * hot, '#6dff9a', 0.15 + 0.45 * hot);
      ctx.beginPath(); ctx.arc(x, y, 46, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(left / secs, 0, 1));
      ctx.strokeStyle = rgba('#9affc0', 0.5 + 0.5 * hot); ctx.lineWidth = 2.5; ctx.stroke();
    }
    // the Long Night: the next doomed's sigil fading in over their head before Doom passes to them
    const cs = room.ev.charges;
    if (cs && t < cs.end && env.boss) cs.l.forEach((kind, i) => {
      const k = this.chargeLit(cs, i, t);
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; this.sigil(ctx, kind, env.boss.x, env.boss.y - 250 - (1 - k) * 14, '#fff2c8', 1.9); ctx.restore(); }
    });
    const dn = room.ev.doomnext;
    if (dn && t < dn.end && env.entById) for (const id of dn.ids || []) {
      const e = env.entById(id); if (!e) continue;
      const k = clamp((t - dn.start) / 1.5, 0, 1) * (0.45 + 0.25 * Math.sin(t * 6));
      ctx.save(); ctx.globalAlpha = k; this.doomMark(ctx, e.x, e.y - (e.lift || 0) - 92, 1, t); ctx.restore();
    }
    const rs = room.ev.rodmark;
    if (rs && t < rs.end) for (const id of rs.ids || []) {
      const e = env.entById(id); if (!e) continue;
      const p = clamp((t - rs.start) / Math.max(0.1, rs.end - rs.start), 0, 1);
      ctx.save(); ctx.translate(e.x, e.y - 96);
      glow(ctx, 0, 0, 36, '#9ff4ff', 0.45 + 0.4 * p);
      circle(ctx, 0, 0, 17, 'rgba(10,20,30,0.55)');
      ctx.beginPath(); ctx.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p)); ctx.strokeStyle = rgba('#dffbff', 0.95); ctx.lineWidth = 3; ctx.stroke();
      jagged(ctx, -5, -11, 4, 11, Math.floor(t * 10), '#bff6ff', 2.2);
      ctx.restore();
    }
  },

  // one prop, in the room's style. Every prop: a contact shadow and a clean outline. On its last hit it shows cracks.
  drawProp(ctx, pr, t, room) {
    const k = Math.min(1, (t - (pr.born ?? t - 1)) / 0.25), last = pr.maxHp > 1 && pr.hp <= 1, worn = pr.maxHp > 2 && pr.hp === pr.maxHp - 1;
    ctx.save(); ctx.globalAlpha = k;
    switch (pr.kind) {
      case 'cask': this.cask(ctx, pr, last, t); break;
      case 'pillar': this.rockPillar(ctx, pr, last, worn, t); break;
      case 'brazier': this.brazier(ctx, pr, t, room); break;
      case 'lid': this.coffinLid(ctx, pr, last); break;
      case 'masonry': this.masonry(ctx, pr); break;
      case 'stone': this.standingStone(ctx, pr, t); break;
      case 'boulder': this.boulder(ctx, pr, t); break;
      case 'pot': this.stockpot(ctx, pr, t); break;
      default: ellipse(ctx, pr.x + 4, pr.y + 6, pr.r * 1.1, pr.r * 0.6, 0, 'rgba(0,0,0,0.4)'); circle(ctx, pr.x, pr.y, pr.r, '#6a6a72', OUT, 2.5);
    }
    ctx.restore();
  },
  // cracks running over a prop that's about to give (drawn in the prop's own coordinates)
  cracks(ctx, x, y, s, seed, color = 'rgba(12,8,6,0.85)') {
    const r = rng(seed);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      let px = x + (r() - 0.5) * s * 0.6, py = y + (r() - 0.5) * s * 0.6, a = r() * TAU;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let j = 0; j < 4; j++) { a += (r() - 0.5) * 1.3; px += Math.cos(a) * s * 0.22; py += Math.sin(a) * s * 0.22; ctx.lineTo(px, py); }
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,220,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.restore();
  },
  // Grubnak's larder casks: an oak barrel standing on end, iron hoops, a bung
  cask(ctx, pr, last, t) {
    const { x, y, r } = pr, h = r * 1.15;
    ellipse(ctx, x + 5, y + 6, r * 1.15, r * 0.62, 0, 'rgba(10,4,0,0.45)');
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI); ctx.lineTo(x - r, y - h); ctx.ellipse(x, y - h, r, r * 0.55, 0, Math.PI, 0, true); ctx.closePath();
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, '#5a3418'); g.addColorStop(0.35, '#a4703c'); g.addColorStop(0.7, '#8a5a2c'); g.addColorStop(1, '#4a2a12');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    for (let i = 1; i < 5; i++) { const sx = x - r + i * r * 0.4; line(ctx, sx, y - h + r * 0.5 * Math.sin(Math.acos((sx - x) / r)) * 0.9, sx, y + r * 0.5 * Math.sin(Math.acos((sx - x) / r)), 'rgba(40,20,6,0.45)', 1.2); }
    for (const q of [0.22, 0.78]) { ctx.beginPath(); ctx.ellipse(x, y - h * q, r * 1.02, r * 0.55, 0, 0, Math.PI); ctx.strokeStyle = '#3a3a42'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = 'rgba(200,200,210,0.35)'; ctx.lineWidth = 1; ctx.stroke(); }
    ellipse(ctx, x, y - h, r, r * 0.55, 0, '#b8844a', OUT, 2.5);
    for (let i = -2; i <= 2; i++) line(ctx, x + i * r * 0.36, y - h - r * 0.5 * Math.sqrt(Math.max(0, 1 - (i * 0.36) ** 2)) * 0.95, x + i * r * 0.36, y - h + r * 0.5 * Math.sqrt(Math.max(0, 1 - (i * 0.36) ** 2)) * 0.95, 'rgba(60,32,10,0.35)', 1);
    ellipse(ctx, x, y - h, r * 0.86, r * 0.46, 0, null, '#3a3a42', 2.5);
    circle(ctx, x + r * 0.25, y - h, 4, '#5a3418', OUT, 1.2);
    if (last) { this.cracks(ctx, x, y - h * 0.5, r * 1.6, pr.id); poly(ctx, [x + r * 0.2, y - h - 2, x + r * 0.62, y - h + 3, x + r * 0.45, y - h * 0.55], '#2a1408', OUT, 1.5); }
  },
  // Skitterra's pillars: a rough column of cave rock with her silk wound round it
  rockPillar(ctx, pr, last, worn, t) {
    const { x, y, r } = pr, h = 64, rr = rng(pr.id * 31 + 7);
    ellipse(ctx, x + 6, y + 8, r * 1.3, r * 0.66, 0, 'rgba(0,0,0,0.5)');
    // a rough column of cave rock, wider at the foot, with a broken top that runs up out of sight
    const L = [], R = [];
    for (let i = 0; i <= 6; i++) { const q = i / 6, w = r * (1.05 - q * 0.25); L.push([x - w + (rr() - 0.5) * 7, y - q * h]); R.push([x + w + (rr() - 0.5) * 7, y - q * h]); }
    ctx.beginPath(); ctx.moveTo(...L[0]); for (const p of L) ctx.lineTo(...p);
    ctx.lineTo(x - r * 0.3, y - h - 10); ctx.lineTo(x + r * 0.15, y - h - 4); ctx.lineTo(x + r * 0.5, y - h - 12);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(...R[i]);
    ctx.quadraticCurveTo(x, y + r * 0.5, L[0][0], L[0][1]); ctx.closePath();
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, '#2a2232'); g.addColorStop(0.35, '#54485e'); g.addColorStop(0.7, '#3a3144'); g.addColorStop(1, '#1e1824');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    // strata and a lit edge
    for (let k = 1; k < 5; k++) { const yy = y - h * k / 5 + (rr() - 0.5) * 6; line(ctx, x - r * 0.8, yy, x + r * (0.3 + rr() * 0.5), yy + (rr() - 0.5) * 8, 'rgba(14,11,18,0.5)', 1.8); }
    line(ctx, L[1][0] + 5, L[1][1], L[5][0] + 5, L[5][1], 'rgba(220,210,240,0.16)', 2);
    for (let i = 0; i < 3; i++) glow(ctx, x + (rr() - 0.5) * r, y - rr() * h * 0.4, 10, '#5a7a4a', 0.35);   // cave moss at the foot
    // silk wound round it where the web is tied off, and threads running up into the dark
    for (let k = 0; k < 2; k++) { const yy = y - h * (0.45 + k * 0.25); ctx.beginPath(); ctx.moveTo(x - r * 0.95, yy - 4); ctx.quadraticCurveTo(x, yy + 8, x + r * 0.95, yy - 6 + k * 3); ctx.strokeStyle = 'rgba(235,235,250,0.55)'; ctx.lineWidth = 1.4; ctx.stroke(); }
    for (const d of [-0.3, 0.25]) line(ctx, x + r * d, y - h - 6, x + r * d + Math.sign(x || 1) * 40, y - h - 120, 'rgba(235,235,250,0.18)', 1.1);
    if (worn) this.cracks(ctx, x, y - h * 0.5, r * 0.9, pr.id, 'rgba(10,8,12,0.6)');
    if (last) { this.cracks(ctx, x, y - h * 0.5, r * 1.9, pr.id + 1); poly(ctx, [x - r * 0.9, y - h * 0.8, x - r * 0.45, y - h * 0.6, x - r * 0.88, y - h * 0.35], '#141018', OUT, 1.5); }
  },
  // the Hollow King's braziers: an iron bowl on three legs. Lit, grave-green fire; snuffed, cold embers and smoke
  brazier(ctx, pr, t, room) {
    const { x, y, r } = pr, lit = pr.state === 1;
    if (lit) glow(ctx, x, y - 10, 90, '#3aff7a', 0.28);
    ellipse(ctx, x + 5, y + 8, r * 1.1, r * 0.5, 0, 'rgba(0,0,0,0.5)');
    for (const dx of [-0.6, 0, 0.6]) line(ctx, x + dx * r * 0.6, y - 10, x + dx * r, y + 8, '#1c1f22', 4);
    poly(ctx, [x - r, y - 22, x + r, y - 22, x + r * 0.62, y - 6, x - r * 0.62, y - 6], '#2f3337', OUT, 2.5);
    ellipse(ctx, x, y - 22, r, r * 0.34, 0, '#202326', OUT, 2);
    for (let i = -2; i <= 2; i++) circle(ctx, x + i * r * 0.36, y - 14, 2, '#4a5056');
    if (lit) {
      for (let i = 0; i < 6; i++) {
        const q = (t * 1.4 + i / 6 + pr.id * 0.1) % 1;
        ctx.save(); ctx.globalAlpha *= (1 - q);
        ellipse(ctx, x + Math.sin(t * 3 + i * 2) * 7, y - 26 - q * 40, 8 * (1 - q * 0.6), 13 * (1 - q * 0.5), 0, i % 2 ? '#7affa8' : '#3adf7a');
        ctx.restore();
      }
      ellipse(ctx, x, y - 24, r * 0.6, 4, 0, '#d8ffe0');
    } else {
      for (let i = 0; i < 5; i++) circle(ctx, x + (i - 2) * 6, y - 23, 2.2, i % 2 ? '#5a2a1a' : '#8a3a1a');
      for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3 + pr.id * 0.2) % 1; circle(ctx, x + Math.sin(t + i) * 6, y - 30 - q * 46, 5 + q * 10, `rgba(150,160,155,${0.25 * (1 - q)})`); }
    }
    void room;
  },
  // a coffin lid torn off and skidded across the hall: a carved stone slab
  coffinLid(ctx, pr, last) {
    const cs = PROPS.corners(pr), cs2 = PROPS.corners(pr, -7);
    ctx.save(); ctx.translate(5, 7); poly(ctx, cs.flat(), 'rgba(0,0,0,0.45)'); ctx.restore();
    poly(ctx, cs.flat(), '#4a5054', OUT, 3);
    poly(ctx, cs2.flat(), '#565d61', 'rgba(10,12,12,0.5)', 1.5);
    ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.a || 0);
    line(ctx, -pr.w * 0.3, 0, pr.w * 0.3, 0, 'rgba(10,12,12,0.55)', 3); line(ctx, -pr.w * 0.12, -pr.h * 0.3, -pr.w * 0.12, pr.h * 0.3, 'rgba(10,12,12,0.55)', 3);
    line(ctx, -pr.w * 0.45, -pr.h * 0.42, pr.w * 0.45, -pr.h * 0.42, 'rgba(220,235,225,0.12)', 1.5);
    if (last) this.cracks(ctx, 0, 0, pr.h * 1.6, pr.id);
    ctx.restore();
  },
  // a chunk of the ceiling that came down (the Hollow King, Hard): it stays where it fell
  masonry(ctx, pr) {
    const r = rng(pr.id * 13), pts = [];
    for (let k = 0; k < 7; k++) { const q = k * TAU / 7 + r() * 0.4, d = pr.r * (0.8 + r() * 0.3); pts.push(pr.x + Math.cos(q) * d, pr.y + Math.sin(q) * d * 0.8 - 10); }
    ellipse(ctx, pr.x + 6, pr.y + 6, pr.r * 1.15, pr.r * 0.6, 0, 'rgba(0,0,0,0.5)');
    ctx.save(); ctx.translate(0, 10); poly(ctx, pts, '#2c3134', OUT, 2.5); ctx.restore();
    poly(ctx, pts, '#4a5054', OUT, 2.5);
    line(ctx, pts[0], pts[1], pts[2], pts[3], 'rgba(230,240,235,0.16)', 2);
    rrect(ctx, pr.x - pr.r * 0.4, pr.y - pr.r * 0.4 - 10, pr.r * 0.8, pr.r * 0.3, 3, null, 'rgba(10,12,12,0.4)', 1.5);   // a carved course of the old vault
  },
  // Volkar's standing stones: tall grey menhirs; their runes take the charge of every bolt they catch
  standingStone(ctx, pr, t) {
    const { x, y, r } = pr, h = 92, charged = pr.state > 0;
    ellipse(ctx, x + 8, y + 6, r * 1.3, r * 0.6, 0, 'rgba(0,0,0,0.45)');
    const pts = [x - r, y + 2, x - r * 0.9, y - h * 0.7, x - r * 0.45, y - h, x + r * 0.5, y - h * 0.95, x + r * 0.95, y - h * 0.6, x + r, y + 2];
    poly(ctx, pts, '#5a6270', OUT, 3);
    poly(ctx, [x - r * 0.9, y - h * 0.7, x - r * 0.45, y - h, x - r * 0.1, y - h * 0.96, x - r * 0.4, y - h * 0.62, x - r * 0.55, y], 'rgba(255,255,255,0.08)');
    line(ctx, x + r * 0.3, y - h * 0.8, x + r * 0.5, y - h * 0.3, 'rgba(14,16,22,0.5)', 2);
    // state 1: holding a bolt (cyan). Still Air (the Eye): 2 lit + (gold), 3 lit − (blue), with the sign on its face
    const col = pr.state === 2 ? '#ffd84a' : pr.state === 3 ? '#6ab8ff' : '#9ff4ff';
    const glowA = charged ? 0.6 + 0.4 * Math.sin(t * (pr.state > 1 ? 4 : 14)) : 0.15;
    for (let i = 0; i < 3; i++) { const yy = y - h * (0.3 + i * 0.18); line(ctx, x - 6, yy, x + 6, yy - 6, rgba(col, glowA), 2); line(ctx, x, yy - 8, x, yy + 4, rgba(col, glowA), 2); }
    if (charged) { glow(ctx, x, y - h * 0.5, pr.state > 1 ? 70 : 50, col, 0.35); if (pr.state === 1 && Math.floor(t * 10) % 3 === 0) jagged(ctx, x, y - h, x + Math.sin(t * 7) * 20, y - h - 30, Math.floor(t * 12), '#bff6ff', 1.2); }
    if (pr.state > 1) {
      const sy = y - h - 22;
      circle(ctx, x, sy, 12, rgba('#0a0e18', 0.7), rgba(col, 0.95), 2.5);
      line(ctx, x - 6, sy, x + 6, sy, col, 3);
      if (pr.state === 2) line(ctx, x, sy - 6, x, sy + 6, col, 3);
    }
  },
  // Grubnak's stockpot, dragged to the middle after the Flare-Up: a squat copper pot on its own fire, slopping and
  // steaming. Solid, and cover from Gut Blast.
  stockpot(ctx, pr, t) {
    const { x, y, r } = pr, h = r * 1.05;
    ellipse(ctx, x + 6, y + 8, r * 1.3, r * 0.6, 0, 'rgba(10,4,0,0.5)');
    glow(ctx, x, y + 4, r * 1.4, '#ff7a1a', 0.3 + 0.08 * Math.sin(t * 9));
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI); ctx.lineTo(x - r, y - h); ctx.ellipse(x, y - h, r, r * 0.5, 0, Math.PI, 0, true); ctx.closePath();
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, '#5a2a12'); g.addColorStop(0.35, '#c4743a'); g.addColorStop(0.6, '#a85a28'); g.addColorStop(1, '#3e1a0a');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    for (const q of [0.25, 0.7]) { ctx.beginPath(); ctx.ellipse(x, y - h * q, r * 1.01, r * 0.5, 0, 0, Math.PI); ctx.strokeStyle = 'rgba(40,16,4,0.6)'; ctx.lineWidth = 3; ctx.stroke(); }
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sd * (r + 6), y - h * 0.7, 8, 0, TAU); ctx.strokeStyle = '#3a3a42'; ctx.lineWidth = 3.5; ctx.stroke(); }
    // the broth, bubbling
    ellipse(ctx, x, y - h, r, r * 0.5, 0, '#3e1a0a', OUT, 2.5);
    ellipse(ctx, x, y - h + 2, r * 0.86, r * 0.4, 0, '#c8803a');
    for (let i = 0; i < 5; i++) {
      const q = (t * 1.4 + hash01(i + pr.id)) % 1, a = i * 1.3, bx = x + Math.cos(a) * r * 0.5, by = y - h + Math.sin(a) * r * 0.2;
      circle(ctx, bx, by, 2 + q * 4, `rgba(255,220,160,${0.7 * (1 - q)})`);
    }
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.6 + hash01(i * 3 + pr.id)) % 1, sx = x + (hash01(i) - 0.5) * r, sy = y - h - 10 - q * 60;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 10, sy - 12, sx, sy - 24);
      ctx.strokeStyle = `rgba(240,235,225,${0.35 * (1 - q)})`; ctx.lineWidth = 4; ctx.stroke();
    }
  },
  // Squall Line (Volkar): the safe circle drifts round him. Outside it the storm is live (dark, crackling); a dashed
  // ghost shows where the circle will be in a moment. During the cast it pulses where it will start.
  squallDraw(ctx, q, t) {
    const begin = q.start + q.at, p = clamp((t - begin) / Math.max(0.1, q.sdur), 0, 1);
    const at = u => { const a = q.a0 + q.dir * TAU * clamp(u, 0, 1); return { x: Math.cos(a) * q.D, y: Math.sin(a) * q.D }; };
    const c = at(p), g = at((t + 1.5 - begin) / q.sdur), warm = t < begin;
    const k = clamp((t - q.start) / 0.4, 0, 1) * clamp((q.end - t) / 0.5, 0, 1);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    ARENA.trace(ctx, 2); ctx.clip();
    ctx.beginPath(); ctx.rect(-3000, -3000, 6000, 6000); ctx.arc(c.x, c.y, q.R, 0, TAU, true);
    ctx.fillStyle = `rgba(8,16,34,${warm ? 0.25 + 0.15 * Math.sin(t * 6) : 0.55})`; ctx.fill('evenodd');
    ctx.beginPath(); ctx.arc(c.x, c.y, q.R, 0, TAU);
    ctx.strokeStyle = rgba('#5ac8ff', 0.3); ctx.lineWidth = 14; ctx.stroke();
    ctx.strokeStyle = rgba('#bff0ff', 0.8 + Math.sin(t * 13) * 0.15); ctx.lineWidth = 2.5; ctx.stroke();
    if (!warm) {
      const n = 22;
      for (let i = 0; i < n; i++) {
        if ((Math.floor(t * 9) + i * 7) % 3 === 0) continue;
        const a0 = i * TAU / n + Math.floor(t * 9) * 0.07, a1 = a0 + TAU / n;
        jagged(ctx, c.x + Math.cos(a0) * q.R, c.y + Math.sin(a0) * q.R, c.x + Math.cos(a1) * q.R, c.y + Math.sin(a1) * q.R, Math.floor(t * 12) * 7 + i, '#7fe8ff', 1.4);
      }
    }
    if (p < 1) { ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.arc(g.x, g.y, q.R, 0, TAU); ctx.strokeStyle = rgba('#dff6ff', 0.45); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  },
  // the Eye of the Storm: the clouds part over the summit and a pale, still light falls on it
  eyeCalm(ctx, e, t) {
    const k = clamp((t - e.start) / 2, 0, 1) * clamp((e.end - t) / 2, 0, 1);
    if (k <= 0) return;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    glow(ctx, 0, 0, ARENA.r * 1.1, '#dff0ff', 0.16 * k);
    ctx.restore();
  },
  // the Hollow King's banners, standards planted either side of the dais below the throne, four of them (the Charge Sheet uses the
  // first three, or all four on Hard). The Charge Sheet lights them in turn, each showing a swing's sigil (and the same
  // sigil over his head as he reads it out), then they go dark; at Judgement each one blazes grave-green as its swing
  // comes, with no sigil: that's for you to remember.
  chargeLit(cs, i, t) {
    if (!cs || i >= cs.l.length) return 0;
    const a = cs.start + (cs.lead || 0) + i * cs.step, b = a + cs.step * 0.9;
    return clamp((t - a) / 0.25, 0, 1) * clamp((b - t) / 0.35, 0, 1);
  },
  chargeBanners(ctx, room, t) {
    const hh = ARENA.hh, y0 = -hh + 14, cs = room.ev.charges, jd = room.ev.judgement;
    [-330, -245, 245, 330].forEach((x, i) => {
      const lit = this.chargeLit(cs, i, t), sig = lit > 0 ? cs.l[i] : null;
      let blaze = 0;
      if (jd && i < jd.l.length && t < jd.end) {
        const land = jd.start + jd.at + i * jd.step;
        blaze = Math.max(0.25 * clamp((t - jd.start) / 1, 0, 1), clamp((t - (land - jd.warn)) / 0.15, 0, 1) * clamp((land + 0.5 - t) / 0.5, 0, 1));
      }
      // the pole, its foot, the crossbar and the cloth
      ellipse(ctx, x, y0 + 112, 14, 5, 0, 'rgba(0,0,0,0.35)');
      line(ctx, x, y0 - 14, x, y0 + 112, '#4a3b22', 4);
      line(ctx, x - 34, y0, x + 34, y0, '#4a3b22', 4);
      circle(ctx, x - 36, y0, 4, '#b89a4a', OUT, 1.5); circle(ctx, x + 36, y0, 4, '#b89a4a', OUT, 1.5);
      const sway = Math.sin(t * 0.9 + i * 1.7) * 2;
      const cloth = [x - 26, y0 + 4, x + 26, y0 + 4, x + 26 + sway, y0 + 82, x + sway, y0 + 98, x - 26 + sway, y0 + 82];
      if (lit > 0) glow(ctx, x, y0 + 50, 90, '#ffd88a', 0.4 * lit);
      if (blaze > 0) glow(ctx, x, y0 + 50, 100, '#6dff9a', 0.55 * blaze);
      poly(ctx, cloth, i === 3 && !(cs && cs.l.length > 3) && !(jd && jd.l.length > 3) ? '#1e171a' : '#2c1d24', OUT, 2.5);
      poly(ctx, [x - 20, y0 + 10, x + 20, y0 + 10, x + 20 + sway, y0 + 78, x + sway, y0 + 91, x - 20 + sway, y0 + 78], null, rgba('#b89a4a', 0.45 + 0.5 * lit), 1.5);
      if (lit > 0) poly(ctx, cloth, rgba('#ffcf70', 0.22 * lit));
      if (blaze > 0) {
        poly(ctx, cloth, rgba('#4dff8a', 0.25 * blaze));
        // grave-fire licking up the cloth
        for (let k = 0; k < 4; k++) glow(ctx, x - 18 + k * 12 + sway, y0 + 96 - ((t * 60 + k * 23) % 40), 9, '#8dffb0', 0.5 * blaze);
      }
      if (sig) { ctx.save(); ctx.globalAlpha = lit; this.sigil(ctx, sig, x + sway * 0.5, y0 + 48, '#fff2c8'); ctx.restore(); }
    });
  },
  // a swing's sigil: sceptre (Sceptre Sweep), boot (Barrow Stomp), crown (Crown of Graves), open eye (Royal Audience)
  sigil(ctx, kind, x, y, col, size = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
    glow(ctx, 0, 0, 34, col, 0.4);
    if (size > 1) circle(ctx, 0, 0, 22, 'rgba(20,12,18,0.8)', rgba('#b89a4a', 0.9), 2);
    if (kind === 'sweep') {
      line(ctx, -11, 15, 9, -9, col, 4);
      circle(ctx, 11, -11, 6, col, OUT, 1.5);
      poly(ctx, [-6, 6, 0, 12, -3, 9], col);
    } else if (kind === 'stomp') {
      poly(ctx, [-7, -16, 5, -16, 5, 2, 15, 6, 15, 14, -9, 14, -9, 4], col, OUT, 1.5);
    } else if (kind === 'ring') {
      poly(ctx, [-15, 10, -15, -6, -8, 2, 0, -14, 8, 2, 15, -6, 15, 10], col, OUT, 1.5);
      line(ctx, -15, 13, 15, 13, col, 3);
    } else {
      ellipse(ctx, 0, 0, 16, 9, 0, col, OUT, 1.5);
      circle(ctx, 0, 0, 5.5, '#2a1830');
      circle(ctx, 1.5, -1.5, 1.6, col);
    }
    ctx.restore();
  },
  // Mise en Place (Grubnak, Hard): three tools laid out on the pass along the bottom wall, left to right in the order
  // he'll serve them. The cleaver lies on the side of its board that gets chopped. Once Service! is called, each one
  // lights as it comes out and goes dark once it has.
  misePass(ctx, m, t) {
    const k = clamp((t - m.start) / 0.4, 0, 1) * clamp((m.end - t) / 0.4, 0, 1);
    if (k <= 0) return;
    const y = ARENA.hh - 38, gap = 92;
    ctx.save(); ctx.globalAlpha = k;
    rrect(ctx, -gap * 1.5 - 10, y - 26, gap * 3 + 20, 52, 8, '#5a3a22', OUT, 2.5);
    line(ctx, -gap * 1.5 - 4, y - 20, gap * 1.5 + 4, y - 20, 'rgba(255,230,190,0.18)', 2);
    m.tools.forEach((tool, i) => {
      const x = (i - 1) * gap, at = m.serve != null ? m.start + m.serve + i * m.beat : null;
      const live = at != null && t > at - m.beat && t < at + 0.3, done = at != null && t >= at + 0.3;
      if (live) glow(ctx, x, y, 46, '#ffd27a', 0.55 + 0.3 * Math.sin(t * 14));
      ctx.globalAlpha = k * (done ? 0.3 : 1);
      if (tool === 'cleaver') {
        rrect(ctx, x - 34, y - 18, 68, 36, 5, '#b48a5a', OUT, 2);
        line(ctx, x, y - 14, x, y + 14, 'rgba(60,32,10,0.45)', 1.5);
        const sx = x + (m.side === 'left' ? -17 : 17);
        rrect(ctx, sx - 13, y - 12, 26, 18, 2, '#d8dde6', OUT, 2);
        rrect(ctx, sx - 4, y + 5, 8, 12, 2, '#4a2a12', OUT, 1.5);
      } else if (tool === 'ladle') {
        circle(ctx, x - 8, y + 4, 14, '#9aa2ae', OUT, 2); circle(ctx, x - 8, y + 4, 9, '#c8803a');
        line(ctx, x + 2, y - 4, x + 26, y - 18, OUT, 6); line(ctx, x + 2, y - 4, x + 26, y - 18, '#b8c0cc', 3);
      } else {
        ellipse(ctx, x, y + 2, 26, 15, 0, '#a8b0bc', OUT, 2.5); ellipse(ctx, x, y, 18, 9, 0, null, 'rgba(255,255,255,0.35)', 1.5);
        circle(ctx, x, y - 4, 5, '#3a3a42', OUT, 1.5);
      }
      ctx.globalAlpha = k;
    });
    ctx.restore();
  },
  // Avalanche boulders that came to rest on the summit
  boulder(ctx, pr) {
    const { x, y, r } = pr, rr = rng(pr.id * 5), pts = [];
    for (let k = 0; k < 9; k++) { const q = k * TAU / 9, d = r * (0.88 + rr() * 0.18); pts.push(x + Math.cos(q) * d, y - r * 0.6 + Math.sin(q) * d * 0.85); }
    ellipse(ctx, x + 6, y + 6, r * 1.2, r * 0.58, 0, 'rgba(0,0,0,0.5)');
    poly(ctx, pts, '#6a6460', OUT, 3);
    ellipse(ctx, x - r * 0.3, y - r * 0.95, r * 0.4, r * 0.22, -0.4, 'rgba(255,255,255,0.14)');
    line(ctx, x - r * 0.2, y - r * 0.2, x + r * 0.4, y - r * 0.7, 'rgba(14,12,10,0.45)', 2);
    for (let i = 0; i < 4; i++) circle(ctx, x + (rr() - 0.5) * r, y - r * 0.6 + (rr() - 0.5) * r * 0.8, 2, 'rgba(120,150,100,0.5)');
  },
  // Lights Out (the Hollow King): the hall goes black but for a ring of light round each lit brazier (and, in the
  // Long Night, the last lantern). The ring is the rule: inside it, the Gaze can't find you.
  drawLightsOut(ctx, room, lo, t, v) {
    const k = clamp((t - lo.start) / 0.5, 0, 1) * clamp((lo.end + 0.6 - t) / 0.6, 0, 1);
    if (k <= 0) return;
    const lights = [];
    for (const pr of room.props) if (pr.kind === 'brazier' && pr.state === 1) lights.push({ x: pr.x, y: pr.y, r: lo.r + 30 });
    for (const L of lo.extra || []) { const e = L.id != null && v.entById ? v.entById(L.id) : null; lights.push({ x: e ? e.x : L.x, y: e ? e.y : L.y, r: lo.r + 30 }); }
    // the dark, with a soft edge just outside each ring
    const cw = Math.max(1, Math.ceil(v.W * v.DPR)), ch = Math.max(1, Math.ceil(v.H * v.DPR));
    let c = this.loCv;
    if (!c || c.width !== cw || c.height !== ch) { c = this.loCv = document.createElement('canvas'); c.width = cw; c.height = ch; }
    const n = c.getContext('2d');
    n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, cw, ch);
    n.fillStyle = `rgba(2,4,8,${0.86 * k})`; n.fillRect(0, 0, cw, ch);
    const s = v.DPR * v.zoom;
    n.setTransform(s, 0, 0, s, -v.cam.x * s, -v.cam.y * s);
    n.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const g = n.createRadialGradient(L.x, L.y, lo.r * 0.75, L.x, L.y, L.r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      n.fillStyle = g; n.beginPath(); n.arc(L.x, L.y, L.r, 0, TAU); n.fill();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore();
    // the edge of each light, so it reads exactly
    for (const L of lights) {
      ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 20;
      circle(ctx, L.x, L.y, lo.r, null, rgba('#9affc0', 0.55 * k), 2);
      ctx.restore();
      glow(ctx, L.x, L.y, lo.r, '#3aff7a', 0.12 * k);
    }
  },
  // Ceiling Ambush (Skitterra, Hard): only her shadow crosses the floor, gathering speed, until it stops and she drops
  ambushShadow(ctx, amb, t) {
    const pts = amb.pts || [];
    if (pts.length < 2) return;
    const p = clamp((t - amb.start) / Math.max(0.1, amb.end - amb.start), 0, 1), u = Math.pow(p, amb.ease || 1.7);
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let want = u * total, i = 0;
    while (i < seg.length - 1 && want > seg[i]) { want -= seg[i]; i++; }
    const q = seg[i] ? Math.min(1, want / seg[i]) : 1, x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q;
    const r = 120 + 40 * p, fade = clamp((amb.end + 0.3 - t) / 0.3, 0, 1);
    ctx.save(); ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(4,2,8,${0.55 + 0.25 * p})`); g.addColorStop(0.7, `rgba(4,2,8,${0.35 + 0.2 * p})`); g.addColorStop(1, 'rgba(4,2,8,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, TAU); ctx.fill();
    // her legs' shadows, splayed
    for (let k = 0; k < 8; k++) {
      const a = k * TAU / 8 + Math.sin(t * 9 + k) * 0.08, l = r * 0.95;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l * 0.5 - 10, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8);
      ctx.strokeStyle = `rgba(4,2,8,${0.4 + 0.3 * p})`; ctx.lineWidth = 7; ctx.stroke();
    }
    ctx.restore();
  },

  // overhead icon on whoever a tankbuster is aimed at
  busterIcon(ctx, x, y, t) {
    const b = Math.sin(t * 8) * 2;
    ctx.save(); ctx.translate(x, y - 66 + b);
    glow(ctx, 0, 0, 22, '#ff3a2a', 0.6);
    rrect(ctx, -11, -9, 22, 15, 3, '#d8dde4', OUT, 2);
    rrect(ctx, -3, 6, 6, 10, 2, '#6a4422', OUT, 1.5);
    line(ctx, -9, 3, 9, 3, '#ffffff', 1.5);
    ctx.restore();
  },
};

if (typeof module !== 'undefined') module.exports = { ArenaView };
