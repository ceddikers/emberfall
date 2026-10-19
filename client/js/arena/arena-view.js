// Drawing for the raid arena: the floor, telegraphs, ground hazards and the boss's hitbox ring.
// Telegraphs show WHERE something will land. They never say what to do about it.

const ArenaView = {
  floor: null, floorFor: null,

  // ------------------------------------------------------------------ floor (cached)
  // Drawn once per fight into a canvas that covers the room plus a margin of scenery around it. The room's shape
  // comes from ARENA (shapes.js): Grubnak cooks in a long rectangular kitchen, Skitterra waits in an octagon of web.
  buildFloor(bossId, scale) {
    const M = 120, bx = Math.ceil((ARENA.kind === 'poly' ? ARENA.R : ARENA.hw) + M), by = Math.ceil((ARENA.kind === 'poly' ? ARENA.R : ARENA.hh) + M);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(bx * 2 * scale); cv.height = Math.ceil(by * 2 * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    c.translate(bx, by);
    if (bossId === 'skitterra') this.buildWebCave(c, bx, by);
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
    // the eight pillars the web hangs from, with anchor threads running off them into the dark
    for (const [cx, cy] of ARENA.corners(20)) {
      const a = Math.atan2(cy, cx);
      for (const da of [-0.35, 0, 0.35]) line(c, cx, cy, cx + Math.cos(a + da) * 110, cy + Math.sin(a + da) * 110, 'rgba(225,225,240,0.2)', 1.2);
      ellipse(c, cx + 6, cy + 10, 40, 22, 0, 'rgba(0,0,0,0.45)');
      circle(c, cx, cy, 34, '#3b3344', OUT, 3);
      circle(c, cx - 4, cy - 6, 25, '#4a4156');
      circle(c, cx - 10, cy - 13, 10, 'rgba(255,255,255,0.09)');
      for (let k = 0; k < 3; k++) { const q = a + Math.PI + (k - 1) * 0.5; line(c, cx + Math.cos(q) * 12, cy + Math.sin(q) * 12, cx + Math.cos(q) * 30, cy + Math.sin(q) * 30, 'rgba(14,11,18,0.55)', 2); }
      // silk wound around the pillar where the web is tied off
      for (let k = 0; k < 3; k++) ellipse(c, cx, cy + 2 - k * 6, 30 - k * 2, 9, 0.15 * (k - 1), null, 'rgba(235,235,250,0.4)', 1.6);
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

  // a tether between two players: a silk thread. Long ones (green on Hard) want stretching, short ones (red, thick) want
  // keeping close. The thread goes taut and bright once the distance is right.
  tether(ctx, a, b, th, t, hard) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ok = th.kind === 'long' ? d >= th.len : d <= th.len;
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
        case 'aoe': case 'buster': this.areaWarning(ctx, s, p, fadeIn, tg.type === 'buster' ? '#ff4a3a' : '#ff8a2a'); break;
        case 'stack': this.stackMarker(ctx, s, p, fadeIn, t); break;
        case 'spread': this.spreadMarker(ctx, s, p, fadeIn, t); break;
        case 'tower': this.tower(ctx, s, p, fadeIn, t, tg.need); break;
        case 'proximity': this.proximity(ctx, s, p, fadeIn, t); break;
        case 'knockback': this.knockback(ctx, s, p, fadeIn, t); break;
      }
    }
  },

  // FF14-style: tinted area + bright rim, with a fill that grows from the origin as the cast completes
  // The rim glows, an inner edge marches, and the last quarter pulses faster and brighter
  // (anticipation: the closer it is to landing, the louder it gets).
  areaWarning(ctx, s, p, k, color) {
    const t = performance.now() / 1000;
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

  tower(ctx, s, p, k, t, need) {
    const { x, y, r } = s;
    glow(ctx, x, y, r * 1.6, '#4fe0d0', 0.35 * k);
    circle(ctx, x, y, r, rgba('#4fe0d0', 0.18 * k), rgba('#9ffff4', 0.95 * k), 3);
    circle(ctx, x, y, r * 0.78, null, rgba('#9ffff4', 0.4 * k), 1.5);
    // light column
    const g = ctx.createLinearGradient(0, y - 150, 0, y);
    g.addColorStop(0, rgba('#9ffff4', 0)); g.addColorStop(1, rgba('#9ffff4', 0.35 * k));
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
