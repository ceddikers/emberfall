// Garrow, the Moon's Hound: the room he is fought in, drawn in code. The Long Mere: a frozen lake at night, a rectangle of fresh,
// unbroken snow over black ice. The floor is kept a clean, pale page on purpose: the whole fight is about the footprints the heroes
// leave on it (garrow-fx.js draws them on top), so the playable floor holds only soft drifts, the faintest blue shadowing and a few
// places where the wind has scoured the snow thin and the black ice shows through. All the scenery is round the edge: snow banks and
// frozen reeds, the black ice beyond them, and to the north the far shore with the town of Emberfall's small lit windows (the only
// warm colour in the room) and their long reflections laid on the ice. One straight line of moonlight lies on the ice from the south
// edge toward the middle, and does not move.
// Loaded after arena-view.js. It adds buildMere / mereLife to ArenaView (arena-view.js: buildFloor picks it by boss id 'garrow',
// drawAmbient by amb.kind 'mere').
//
// Room events it answers (the fight script emits them; arena-view.js stores them in liveRoom.ev[k] = { start, end, dur }):
//   gwdrift   a heavy flurry sweeps the lake: streaks of snow, a veil of white, the reeds bent over
//   gwlast    the last act: the snowfall stops, the mist goes, the reeds hang still, the far windows burn a little brighter
//
// The floor's own colours (for tuning footprints against it): snow K.snow mid #adbcd3 (north #9fb0ca, south #b6c4da), highlights up to
// #dbe5f3, blue shadow #6479a6 at low alpha; scoured black ice #0b1424 at up to ~0.6 alpha in six soft patches.

const GW_ROOM = (() => {
  const wrap = (v, n) => ((v % n) + n) % n;
  const K = {
    snowN: '#9fb0ca', snowM: '#adbcd3', snowS: '#b6c4da', snowHi: '#dbe5f3', shade: '#6479a6',
    ice: '#0b1424', iceHi: '#7f9ed0', warm: '#ffb865', warmHi: '#ffe3ae',
    reed: '#2b3649', reedHi: '#8fa3bd', rime: '#e6eef9',
  };
  // a soft ellipse of light or shade (the radial glow sprite, squashed)
  function soft(c, x, y, rx, ry, rot, col, a) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(1, ry / rx); glow(c, 0, 0, rx, col, a); c.restore();
  }
  // a mound of snow with a lit top and a dark underside (snow banks and the heaps the reeds grow from)
  function mound(c, x, y, rx, ry, seed, a = 1) {
    const r = rng(seed), n = 11, pts = [], top = [];
    for (let i = 0; i < n; i++) {
      const q = i * TAU / n, k = 0.78 + r() * 0.3;
      pts.push(x + Math.cos(q) * rx * k, y + Math.sin(q) * ry * k);
      top.push(x + Math.cos(q) * rx * k * 0.84 - rx * 0.06, y + Math.sin(q) * ry * k * 0.76 - ry * 0.16);
    }
    soft(c, x + rx * 0.04, y + ry * 0.55, rx * 1.15, ry * 1.1, 0, '#02060f', 0.34 * a);
    poly(c, pts, rgba('#8c9fc2', a));
    poly(c, pts.map((v, i) => (i % 2 ? v - ry * 0.12 : v)), rgba('#b0c0da', a));
    poly(c, top, rgba('#cdd9ec', 0.8 * a));
  }
  // a point on the wall's outline (the rect's four straight sides), with the outward normal
  function perim(r, hw, hh, wN = 1, wE = 1, wS = 1, wW = 1) {
    const lens = [2 * hw * wN, 2 * hh * wE, 2 * hw * wS, 2 * hh * wW], tot = lens[0] + lens[1] + lens[2] + lens[3];
    let u = r() * tot, k = 0;
    while (k < 3 && u > lens[k]) { u -= lens[k]; k++; }
    const f = u / lens[k];
    if (k === 0) return { x: -hw + f * 2 * hw, y: -hh, nx: 0, ny: -1, side: 'N' };
    if (k === 1) return { x: hw, y: -hh + f * 2 * hh, nx: 1, ny: 0, side: 'E' };
    if (k === 2) return { x: hw - f * 2 * hw, y: hh, nx: 0, ny: 1, side: 'S' };
    return { x: -hw, y: hh - f * 2 * hh, nx: -1, ny: 0, side: 'W' };
  }

  // a vertical streak of window light, broken into dashes toward the foot (drawn stretched in the room's life)
  function reflSprite(r) {
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 192;
    const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, 'rgba(255,190,100,0.95)'); g.addColorStop(0.3, 'rgba(255,172,84,0.5)'); g.addColorStop(1, 'rgba(255,160,70,0)');
    x.fillStyle = g; x.fillRect(0, 0, 16, 192);
    x.globalCompositeOperation = 'destination-in';
    const h = x.createLinearGradient(0, 0, 16, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = h; x.fillRect(0, 0, 16, 192);
    x.globalCompositeOperation = 'destination-out';
    for (let y = 8; y < 192;) { const gap = 1 + r() * 3; x.fillStyle = `rgba(0,0,0,${0.35 + 0.45 * r()})`; x.fillRect(0, y, 16, gap); y += gap + 5 + r() * 13; }
    return cv;
  }

  // a flake and a streak of snow, each with a cool shadow under it so it shows on the pale floor as well as on the dark ice
  // (drawn as sprites: a path of many scattered specks is slow to fill)
  function flakeSprite(al) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 16; const x = cv.getContext('2d');
    circle(x, 8, 8.9, 5.3, 'rgba(66,92,150,0.15)'); circle(x, 8, 8, 4, 'rgba(244,249,255,' + al + ')');
    return cv;
  }
  function streakSprite(wd, al) {
    const cv = document.createElement('canvas'); cv.width = 68; cv.height = 28; const x = cv.getContext('2d');
    line(x, 4, 4, 64, 25.6, 'rgba(66,92,150,0.2)', wd + 2); line(x, 4, 4, 64, 25.6, 'rgba(244,249,255,' + al + ')', wd);
    return cv;
  }

  // a small house on the far shore (its ground line at y); returns its lit windows
  function house(c, x, y, w, h, r, kind) {
    const wins = [];
    if (kind === 'tower') {
      c.fillStyle = '#0c1329'; c.fillRect(x - w / 2, y - h, w, h);
      poly(c, [x - w / 2 - 1.5, y - h, x, y - h - 24, x + w / 2 + 1.5, y - h], '#5a6e98');
      poly(c, [x - w / 2 - 1.5, y - h, x, y - h - 24, x + w / 2 + 1.5, y - h], null, 'rgba(8,12,28,0.7)', 1);
      c.fillStyle = '#060a15'; c.fillRect(x - 2.2, y - h + 2, 4.4, 9);   // the belfry gap
      wins.push({ x, y: y - h * 0.78, w: 2.8, h: 5.6 }, { x, y: y - h * 0.38, w: 2.8, h: 5 });
      return wins;
    }
    const rh = w * 0.4 + 3;
    c.fillStyle = '#0c1329'; c.fillRect(x - w / 2, y - h, w, h);
    c.fillStyle = '#10193a'; c.fillRect(x - w / 2, y - 2.5, w, 2.5);
    if (r() < 0.55) { c.fillStyle = '#0a1024'; c.fillRect(x + w * (r() < 0.5 ? 0.18 : -0.3), y - h - rh - 1.5, 3.2, rh * 0.9); }   // a chimney
    poly(c, [x - w / 2 - 2, y - h, x, y - h - rh, x + w / 2 + 2, y - h], '#566a94');
    poly(c, [x - w / 2 - 2, y - h, x, y - h - rh, x + w / 2 + 2, y - h], null, 'rgba(8,12,28,0.65)', 1);
    line(c, x - w / 2 - 1.5, y - h - 0.4, x + w / 2 + 1.5, y - h - 0.4, 'rgba(8,12,28,0.7)', 1.2);
    const n = kind === 'inn' ? 4 : 1 + (r() < 0.55) + (r() < 0.25);
    for (let i = 0; i < n; i++) if (kind === 'inn' || r() < 0.78) wins.push({ x: x - w / 2 + w * (i + 0.5) / n, y: y - h * 0.55, w: 3.8, h: 5 });
    return wins;
  }

  // ------------------------------------------------------------------------------------------------------------ the floor
  function buildMere(c, bx, by) {
    const hw = ARENA.hw, hh = ARENA.hh, shoreY = -hh - 130;
    const r = rng(1301), rb = rng(77), rr = rng(311);
    const shoreAt = x => shoreY + 7 * Math.sin(x * 0.011 + 1.3) + 4 * Math.sin(x * 0.037) + 2.5 * Math.sin(x * 0.09 + 2);
    const crestBack = x => shoreY - 66 - 26 * (0.5 + 0.5 * Math.sin(x * 0.0064 + 0.5)) - 14 * Math.sin(x * 0.019 + 2) - 6 * Math.sin(x * 0.05);
    const crestFront = x => shoreY - 24 - 10 * Math.sin(x * 0.017 + 1) - 4 * Math.sin(x * 0.06);

    // ---- the black ice all round, the night sky beyond the far shore
    const ig = c.createRadialGradient(0, 0, 200, 0, 0, Math.hypot(bx, by));
    ig.addColorStop(0, '#101d35'); ig.addColorStop(0.35, '#0b1527'); ig.addColorStop(1, '#04070e');
    c.fillStyle = ig; c.fillRect(-bx, -by, bx * 2, by * 2);
    soft(c, 0, 0, hw + 330, hh + 300, 0, '#2a467a', 0.3);   // the snow's own paleness lighting the ice about it
    const sg = c.createLinearGradient(0, -by, 0, shoreY);
    sg.addColorStop(0, '#0d1a3a'); sg.addColorStop(0.55, '#0e1c3c'); sg.addColorStop(1, '#16294f');
    c.beginPath(); c.moveTo(-bx, -by); c.lineTo(bx, -by); for (let x = bx; x >= -bx; x -= 12) c.lineTo(x, shoreAt(x)); c.lineTo(-bx, shoreAt(-bx)); c.closePath(); c.fillStyle = sg; c.fill();
    soft(c, -bx * 0.35, -by * 0.95, 520, 120, 0, '#1d3866', 0.35); soft(c, bx * 0.5, -by * 0.9, 460, 100, 0, '#18305c', 0.3);
    const stars = [];
    for (let i = 0; i < 120; i++) {
      const x = (r() * 2 - 1) * bx, y = -by + 6 + Math.pow(r(), 1.15) * (by + shoreY - 110), a = 0.25 + r() * 0.6;
      circle(c, x, y, 0.5 + r() * 1.0, rgba(r() < 0.2 ? '#bfd8ff' : '#ffffff', a));
      if (r() < 0.12) stars.push({ x, y, r: 0.9 + r() * 0.8, ph: r() * 9, a: 0.5 + r() * 0.4 });
    }
    // ---- the far shore: a hazy back ridge, the low shore with pines, and the town on it
    c.beginPath(); c.moveTo(-bx - 10, shoreY + 20);
    for (let x = -bx - 10; x <= bx + 10; x += 14) c.lineTo(x, crestBack(x));
    c.lineTo(bx + 10, shoreY + 20); c.closePath(); c.fillStyle = '#0a1228'; c.fill();
    c.beginPath(); for (let x = -bx - 10; x <= bx + 10; x += 14) x < -bx ? c.moveTo(x, crestBack(x)) : c.lineTo(x, crestBack(x));
    c.strokeStyle = 'rgba(120,150,214,0.16)'; c.lineWidth = 1.2; c.stroke();
    for (let i = 0; i < 26; i++) { const x = (r() * 2 - 1) * bx; soft(c, x, crestBack(x) + 16, 60 + r() * 90, 12 + r() * 10, 0, '#1b2c54', 0.35); }
    c.beginPath(); c.moveTo(-bx - 10, shoreY + 30);
    for (let x = -bx - 10; x <= bx + 10; x += 12) c.lineTo(x, crestFront(x));
    for (let x = bx + 10; x >= -bx - 10; x -= 12) c.lineTo(x, shoreAt(x));
    c.closePath(); c.fillStyle = '#070c19'; c.fill();
    c.beginPath(); for (let x = -bx - 10; x <= bx + 10; x += 12) x < -bx ? c.moveTo(x, crestFront(x)) : c.lineTo(x, crestFront(x));
    c.strokeStyle = 'rgba(110,140,205,0.2)'; c.lineWidth = 1.2; c.stroke();
    // pines along the shore, in clumps
    for (let i = 0; i < 150; i++) {
      const x = (r() * 2 - 1) * (bx - 6), dens = 0.5 + 0.5 * Math.sin(x * 0.017 + 0.9) * Math.sin(x * 0.0043);
      if (r() > 0.35 + 0.65 * dens) continue;
      const base = shoreAt(x) - 2 - r() * 11, h = 11 + r() * 16, w = 3.2 + h * 0.2;
      for (let k = 0; k < 3; k++) { const hy = base - h * (k * 0.28), ww = w * (1 - k * 0.22); poly(c, [x - ww, hy, x, hy - h * 0.55, x + ww, hy], '#04080f'); }
      line(c, x, base, x, base + 2, '#04080f', 1.4);
    }
    // the town (the windows are lit in mereLife, every frame)
    const HOUSES = [[-430, 16, 11], [-400, 20, 13], [-368, 15, 10], [-335, 18, 12], [-306, 14, 10],
      [-110, 18, 12], [-80, 22, 13], [-46, 40, 14, 'inn'], [-4, 16, 11], [30, 12, 40, 'tower'], [66, 18, 12], [96, 15, 10], [126, 20, 13],
      [250, 16, 11], [282, 20, 12], [312, 15, 10], [344, 18, 13],
      [-620, 14, 10], [-560, 16, 11], [470, 16, 11], [560, 14, 10], [640, 16, 11]];
    const windows = [];
    for (const [x, w, h, kind] of HOUSES) {
      const gy = Math.min(shoreAt(x) - 3, crestFront(x) + 16 + rb() * 6);
      for (const wn of house(c, x, gy, w, h, rb, kind)) windows.push(Object.assign(wn, { ph: rb() * 9, rw: 5 + rb() * 5, v: windows.length % 3 }));
    }
    // the water's edge: a thin frost line, and the shore's pale mirrored in the ice
    c.beginPath(); for (let x = -bx - 10; x <= bx + 10; x += 12) x < -bx ? c.moveTo(x, shoreAt(x)) : c.lineTo(x, shoreAt(x));
    c.strokeStyle = 'rgba(170,195,235,0.3)'; c.lineWidth = 1.6; c.stroke();
    const wg = c.createLinearGradient(0, shoreY, 0, shoreY + 80); wg.addColorStop(0, 'rgba(34,60,110,0.4)'); wg.addColorStop(1, 'rgba(34,60,110,0)');
    c.beginPath(); c.moveTo(-bx, shoreY + 80); for (let x = -bx; x <= bx; x += 12) c.lineTo(x, shoreAt(x)); c.lineTo(bx, shoreY + 80); c.closePath(); c.fillStyle = wg; c.fill();

    // ---- the black ice: glints, long scratches from the wind, a few pale pressure cracks
    for (let i = 0; i < 150; i++) { const x = (r() * 2 - 1) * bx, y = shoreY + 40 + r() * (by - shoreY - 40); circle(c, x, y, 0.5 + r() * 0.7, rgba(K.iceHi, 0.06 + r() * 0.18)); }
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * bx, y = shoreY + 50 + r() * (by - shoreY - 50), len = 60 + r() * 190, a = (r() - 0.5) * 0.14;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y + len * 0.04 * (r() - 0.5) + a * len * 0.5, x + len, y + a * len);
      c.strokeStyle = rgba(K.iceHi, 0.04 + r() * 0.07); c.lineWidth = 1; c.stroke();
    }
    for (let i = 0; i < 9; i++) {
      let x = (r() * 2 - 1) * bx * 0.9, y = shoreY + 80 + r() * (by - shoreY - 120), a = r() * TAU;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 7 + r() * 6; k++) { a += (r() - 0.5) * 1.0; x += Math.cos(a) * (14 + r() * 22); y += Math.sin(a) * (14 + r() * 22); c.lineTo(x, y); }
      c.strokeStyle = 'rgba(2,5,12,0.6)'; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = 'rgba(150,185,235,0.16)'; c.lineWidth = 1; c.stroke();
    }
    soft(c, 78, by - 30, 460, 120, 0, '#6f93cf', 0.2);   // the moon, low in the south and out of sight, on the ice

    // ---- snow banks round the clear floor, and the heaps the reeds stand in (drawn first: the floor is laid over their inner halves)
    for (const [g, w, col] of [[24, 40, 'rgba(2,6,16,0.32)'], [14, 26, '#8a9dc0'], [9, 16, '#b4c3dd'], [6, 6, 'rgba(214,225,241,0.7)']]) { ARENA.trace(c, g); c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); }
    for (let i = 0; i < 46; i++) {
      const p = perim(rb, hw, hh), horiz = p.side === 'N' || p.side === 'S', ry = 6 + rb() * 9, rx = 40 + rb() * 70, out = 8 + rb() * 10;
      mound(c, p.x + p.nx * out, p.y + p.ny * out, horiz ? rx : ry * 1.2, horiz ? ry : rx, 2000 + i, 0.85);
    }
    // reeds: clumps standing out of heaps of snow beyond the bank (swayed in mereLife)
    const reeds = [];
    for (let i = 0; i < 34; i++) {
      const p = perim(rr, hw, hh, 0.7, 1.1, 1.5, 1.1), out = 20 + Math.pow(rr(), 1.5) * 120, x = p.x + p.nx * out, y =p.y + p.ny * out;
      if (Math.abs(x) > bx - 30 || Math.abs(y) > by - 30) continue;
      const stems = [], n = 5 + (rr() * 5 | 0);
      for (let k = 0; k < n; k++) stems.push({ dx: (rr() - 0.5) * 26, h: 24 + rr() * 38, lean: (rr() - 0.5) * 0.3, ph: rr() * 9, head: rr() < 0.55, cap: rr() < 0.4 });
      mound(c, x, y + 3, 11 + rr() * 12, 3 + rr() * 3, 2500 + i, 0.8);
      reeds.push({ x, y, stems });
    }

    // ---- the clear floor: a pale page of snow
    c.save(); ARENA.trace(c, 0); c.clip();
    const fg = c.createLinearGradient(0, -hh, 0, hh); fg.addColorStop(0, K.snowN); fg.addColorStop(0.5, K.snowM); fg.addColorStop(1, K.snowS);
    c.fillStyle = fg; c.fillRect(-hw, -hh, hw * 2, hh * 2);
    // long, low drifts lying with the wind (to the east): a lit crest and the faintest blue lee
    for (let i = 0; i < 24; i++) {
      const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh, rx = 90 + r() * 150, ry = 12 + r() * 20, rot = 0.1 + (r() - 0.5) * 0.12;
      soft(c, x + 10, y + ry * 1.1, rx, ry * 1.2, rot, K.shade, 0.1 + r() * 0.07);
      soft(c, x, y, rx, ry, rot, K.snowHi, 0.2 + r() * 0.12);
    }
    for (let i = 0; i < 6; i++) soft(c, (r() * 2 - 1) * hw, (r() * 2 - 1) * hh, 160 + r() * 140, 90 + r() * 60, 0, K.shade, 0.07);   // broad, cold shadowing
    // wind ripples: faint pairs of lines
    for (let i = 0; i < 46; i++) {
      const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh, len = 50 + r() * 100, s1 = 3 + r() * 3, s2 = 3 + r() * 3;
      for (const [dy, col] of [[0, 'rgba(255,255,255,0.15)'], [2.4, 'rgba(86,106,155,0.1)']]) {
        c.beginPath(); c.moveTo(x, y + dy); c.bezierCurveTo(x + len * 0.3, y + dy - s1, x + len * 0.65, y + dy + s2, x + len, y + dy + (s1 - s2) * 0.5);
        c.strokeStyle = col; c.lineWidth = 1.2; c.stroke();
      }
    }
    // places where the wind has scoured the snow thin: black ice, glossy, its edge feathered away into the snow
    for (const [x, y, rx, ry, rot] of [[-395, -185, 120, 40, 0.08], [345, -235, 100, 34, -0.06], [-150, 255, 150, 46, 0.05], [430, 160, 105, 38, 0.1], [-470, 215, 80, 28, 0], [70, -300, 86, 26, 0.04]]) {
      c.save(); c.translate(x, y); c.rotate(rot);
      soft(c, 0, 0, rx * 1.35, ry * 1.5, 0, K.shade, 0.26);
      for (let k = 0; k < 6; k++) soft(c, (r() - 0.5) * rx * 0.9, (r() - 0.5) * ry * 0.7, rx * (0.4 + r() * 0.35), ry * (0.45 + r() * 0.35), 0, '#131f38', 0.42);
      soft(c, -rx * 0.15, -ry * 0.3, rx * 0.55, ry * 0.3, 0, '#a9c8f4', 0.2);
      for (let k = 0; k < 4; k++) {   // the sheen: pale streaks along the wind, a hairline crack or two
        const sx = (r() - 0.5) * rx * 1.1, sy = (r() - 0.5) * ry * 0.8, l = 24 + r() * 50;
        line(c, sx - l / 2, sy, sx + l / 2, sy + (r() - 0.5) * 4, 'rgba(160,196,245,0.2)', 1.4);
      }
      c.restore();
    }
    // frost glitter, very sparse
    for (let i = 0; i < 420; i++) { const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh; circle(c, x, y, 0.4 + r() * 0.5, r() < 0.8 ? `rgba(255,255,255,${0.12 + r() * 0.2})` : `rgba(40,60,110,${0.05 + r() * 0.07})`); }
    // the floor dips toward the bank all round, in the faintest blue
    for (const [w, a] of [[70, 0.06], [42, 0.07], [20, 0.08]]) { ARENA.trace(c, 0); c.strokeStyle = rgba(K.shade, a); c.lineWidth = w * 2; c.stroke(); }
    c.restore();
    // the rim of the cleared floor: a lit lip, and a thin dark line where it meets the bank
    ARENA.trace(c, 2.5); c.strokeStyle = 'rgba(30,46,86,0.5)'; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke();
    ARENA.trace(c, -1); c.strokeStyle = 'rgba(238,245,255,0.55)'; c.lineWidth = 2.2; c.stroke();
    ARENA.trace(c, -4.5); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 3; c.stroke();

    // ---- the line of moonlight: lies on the ice from the south edge toward the middle, perfectly straight, perfectly still
    {
      const x0 = 78, y0 = by + 4, x1 = -6, y1 = -70, L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(215,232,255,1)'); g.addColorStop(0.62, 'rgba(215,232,255,0.8)'); g.addColorStop(0.9, 'rgba(215,232,255,0.3)'); g.addColorStop(1, 'rgba(215,232,255,0)');
      c.save();
      for (const [w0, w1, a] of [[40, 16, 0.07], [15, 6, 0.12], [4.2, 1.5, 0.4]]) {
        c.globalAlpha = a; c.fillStyle = g;
        c.beginPath(); c.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); c.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); c.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); c.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 46; i++) {   // glints along it, thinning toward the middle
        const u = Math.pow(r(), 1.3), px = x0 + (x1 - x0) * u + nx * (r() - 0.5) * 12 * (1 - u * 0.6), py = y0 + (y1 - y0) * u + ny * (r() - 0.5) * 12 * (1 - u * 0.6);
        circle(c, px, py, 0.6 + r() * 0.9, `rgba(240,246,255,${(0.5 - u * 0.35) * (0.4 + r() * 0.6)})`);
      }
      c.restore();
    }

    ArenaView.amb = {
      kind: 'mere', bx, by, windows, stars, reeds, t0: null, ox: 0, oy: 0, sx: 0, sy: 0,
      refl: [0, 1, 2].map(i => reflSprite(rng(40 + i))),
      flakeSp: [flakeSprite(0.6), flakeSprite(0.8)], streakSp: [streakSprite(1.2, 0.55), streakSprite(2, 0.75)],
      flakes: Array.from({ length: 110 }, (_, i) => ({ x: r(), y: r(), k: 0.6 + r() * 0.8, s: 0.8 + r() * 1.3, dr: 6 + r() * 14, ph: r() * 9, big: i % 3 === 0 })),
      storm: Array.from({ length: 260 }, () => ({ x: r(), y: r(), k: 0.7 + r() * 0.7, l: 14 + r() * 24, big: r() < 0.3 })),
      mist: Array.from({ length: 6 }, (_, i) => ({ y: -hh * 0.8 + r() * hh * 1.9, x0: r() * bx * 2, sp: 7 + r() * 9, P: 48 + r() * 40, ph: i / 6 + r() * 0.1, w: 300 + r() * 220, h: 46 + r() * 34 })),
    };
  }

  // ------------------------------------------------------------------------------------------------------------ the life
  // snow falling slowly, mist drifting low now and then, the reeds stirring, the far windows flickering. gwdrift: a flurry over the whole
  // lake. gwlast: still, clear air, the windows a little brighter.
  // the reeds shaken by a heavy landing on the ice (garrow-fx.js weightLand): a shiver that dies away in a few seconds. jolt(t0, amp): the ground was struck at t0.
  const JOLTS = [];
  function jolt(t0, amp) { JOLTS.push({ t0, a: amp }); if (JOLTS.length > 6) JOLTS.shift(); }
  function mereLife(ctx, a, t) {
    const hh = ARENA.hh, bx = a.bx, by = a.by, W = bx * 2, H = by * 2;
    const room = ArenaView.liveRoom, ev = (room && room.ev) || {};
    const env = (e, rise, fall) => (e ? Math.max(0, Math.min((t - e.start) / rise, (e.end - t) / fall, 1)) : 0);
    // (the Whiteout's flurry, gwdrift { wo: 1 }, climbs over the whole cast and is cut dead by the wipe a second before the event ends; the others fade as they did)
    const WO = ev.gwdrift && ev.gwdrift.wo ? ev.gwdrift : null, sm01 = q => { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); };
    const drift = WO ? sm01((t - WO.start) / Math.max(0.5, WO.end - 1 - WO.start)) * Math.max(0, Math.min(1, (WO.end - 1 + 0.12 - t) / 0.12)) : env(ev.gwdrift, 1.2, 2.4), still = env(ev.gwlast, 3, 1), calm = 1 - still;
    // (and its windows: the far town goes out one light at a time while the sight closes in, and comes back one at a time when he is back: gwchaseend)
    const WE = WO && ev.gwchaseend ? ev.gwchaseend : null;
    const winK = w => {
      if (!WO || t < WO.start) return 1;
      const r = (w.ph % 9) / 9, off = WO.start + 0.3 + r * Math.max(0.5, WO.end - 1 - WO.start) * 0.85;
      let k = 1 - sm01((t - off) / 0.35);
      if (WE) k = Math.max(k, sm01((t - (WE.start + 0.2 + (1 - r) * 1.3)) / 0.5));
      return k;
    };
    const dt = a.t0 == null ? 0 : clamp(t - a.t0, 0, 0.1); a.t0 = t;
    a.ox += dt * (9 + 170 * drift) * calm; a.oy += dt * (20 + 70 * drift) * calm; a.sx += dt * 640; a.sy += dt * 230;
    const lift = 1 + 0.3 * still;   // the last act: the far lights burn a little brighter

    // ---- the far windows and their reflections on the ice
    const wallY = -hh - 34;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const w of a.windows) {
      const dip = (t + w.ph * 7) % 17 < 0.35 ? 0.72 : 1;   // now and then one gutters
      const inten = (0.8 + 0.1 * Math.sin(t * (0.8 + (w.ph % 1)) + w.ph) + 0.05 * Math.sin(t * 2.7 + w.ph * 3)) * dip * lift * winK(w);
      if (inten < 0.01) continue;
      const top = w.y + w.h / 2 + 2, len = wallY - top;
      if (len > 8) { ctx.globalAlpha = Math.min(1, 0.34 * inten); ctx.drawImage(a.refl[w.v], w.x - w.rw / 2, top, w.rw, len); }
      ctx.globalAlpha = 1;
      glow(ctx, w.x, w.y, 13 * lift, K.warm, 0.2 * inten);
      ctx.fillStyle = rgba(K.warm, Math.min(1, 0.9 * inten)); ctx.fillRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
      ctx.fillStyle = rgba(K.warmHi, Math.min(1, 0.7 * inten)); ctx.fillRect(w.x - w.w / 2 + 0.7, w.y - w.h / 2 + 0.7, w.w - 1.4, w.h - 1.4);
    }
    ctx.restore();
    // a few stars twinkle (steadier and brighter when the air is clear)
    for (const s of a.stars) {
      const al = s.a * (0.65 + 0.35 * Math.sin(t * (0.9 + s.ph * 0.13) + s.ph * 5) * (1 - 0.7 * still)) * (1 + 0.35 * still);
      circle(ctx, s.x, s.y, s.r, rgba('#f2f8ff', Math.min(1, al)));
      glow(ctx, s.x, s.y, 7, '#bcd6ff', 0.3 * al);
    }

    // ---- mist drifting low across the floor, now and then
    const mk = calm * (1 - 0.6 * drift);
    if (mk > 0.02) for (const m of a.mist) {
      const q = wrap(t / m.P + m.ph, 1), e = q < 0.5 ? Math.pow(Math.sin(q / 0.5 * Math.PI), 2) : 0;
      if (e < 0.02) continue;
      const x = -bx - m.w + wrap(m.x0 + t * m.sp, W + m.w * 2);
      soft(ctx, x, m.y, m.w, m.h, 0, '#dfe9f8', 0.12 * e * mk);
      soft(ctx, x - m.w * 0.45, m.y + m.h * 0.25, m.w * 0.7, m.h * 0.7, 0, '#dfe9f8', 0.08 * e * mk);
    }

    // ---- the reeds, stirring (bent over in the flurry, hanging still in the last act)
    const wind = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.31 + Math.sin(t * 0.13) * 2)) + 2.4 * drift;
    let kk = 0;
    for (let i = JOLTS.length - 1; i >= 0; i--) { const age = t - JOLTS[i].t0; if (age > 4) { JOLTS.splice(i, 1); continue; } if (age > 0) kk += JOLTS[i].a * Math.min(1, age / 0.06) * Math.exp(-age / 0.9); }
    ctx.save(); ctx.lineCap = 'round';
    for (const cl of a.reeds) {   // (one small path per clump: a path spread over the whole room is slow to stroke)
      const stem = new Path2D(), heads = new Path2D(), caps = new Path2D();
      for (const s of cl.stems) {
        const bend = s.lean + calm * (wind * 0.07 * (0.6 + s.h / 60) + 0.035 * Math.sin(t * (0.9 + s.h / 80) + s.ph) + 0.02 * Math.sin(t * 2.3 + s.ph * 2)) + kk * 0.05 * Math.sin(t * 11 + s.ph * 2);
        const bxs = cl.x + s.dx, bys = cl.y, tx = bxs + Math.sin(bend) * s.h, ty = bys - Math.cos(bend) * s.h;
        stem.moveTo(bxs, bys); stem.quadraticCurveTo(bxs + Math.sin(bend * 0.4) * s.h * 0.5, bys - s.h * 0.55, tx, ty);
        if (s.head) { heads.moveTo(tx, ty); heads.lineTo(tx + Math.sin(bend + 0.1) * 9, ty - Math.cos(bend + 0.1) * 9); }
        if (s.cap) { caps.moveTo(tx + 2.4, ty - 4); caps.arc(tx, ty - 4, 2.4, 0, TAU); }
      }
      ctx.strokeStyle = K.reed; ctx.lineWidth = 2; ctx.stroke(stem);
      ctx.lineWidth = 4.4; ctx.stroke(heads);
      ctx.save(); ctx.translate(-0.7, 0); ctx.strokeStyle = rgba(K.reedHi, 0.8); ctx.lineWidth = 0.9; ctx.stroke(stem); ctx.restore();
      ctx.fillStyle = rgba(K.rime, 0.9); ctx.fill(caps);
    }
    ctx.restore();

    // ---- the snow, falling slowly and sparse
    if (calm > 0.02) {
      ctx.save(); ctx.globalAlpha = calm;
      for (const f of a.flakes) {
        const x = wrap(f.x * W + a.ox * f.k + Math.sin(t * 0.5 + f.ph) * f.dr, W) - bx, y = wrap(f.y * H + a.oy * f.k, H) - by, d = f.s * 4;
        ctx.drawImage(a.flakeSp[f.big ? 1 : 0], x - d / 2, y - d / 2, d, d);
      }
      ctx.restore();
    }
    // ---- the flurry: a veil of white, wind bands and long streaks of snow across the whole lake
    if (drift > 0.01) {
      ctx.save();
      ctx.fillStyle = rgba('#d0e0f6', 0.09 * drift); ctx.fillRect(-bx, -by, W, H);
      for (let i = 0; i < 3; i++) soft(ctx, -bx + wrap(a.sx * 0.9 + i * W / 3, W), -hh * 0.6 + i * hh * 0.6, 520, 130, -0.18, '#e4edf9', 0.13 * drift);
      ctx.globalAlpha = drift;
      for (const st of a.storm) {
        const x = wrap(st.x * W + a.sx * st.k, W) - bx, y = wrap(st.y * H + a.sy * st.k, H) - by, sc = st.l / 60;
        ctx.drawImage(a.streakSp[st.big ? 1 : 0], x - 64 * sc, y - 25.6 * sc, 68 * sc, 28 * sc);
      }
      ctx.restore();
    }
  }

  return { buildMere, mereLife, jolt };
})();

ArenaView.buildMere = GW_ROOM.buildMere;
ArenaView.mereLife = GW_ROOM.mereLife;
