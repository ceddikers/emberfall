// The Hydra's temple (Boss VIII, hydra.js): the flooded floor, the nine columns, the bog pools her heads leave behind, the flood
// and the Heart on the floor, and how her telegraphs are dressed. Loaded after arena-view.js and boss-tells.js, whose objects it
// adds to (ArenaView.buildTemple... and HY_TELLS, which boss-tells.js get() reads for this boss).
// The rule here as everywhere: a telegraph's red outline and wash mark the exact area; the water, ice and sparks inside are an
// extra clue, never the only one.

(function () {
  const hy = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const BRASS = '#b8903a', BRASS_L = '#e8c870';

  Object.assign(ArenaView, {
    // ------------------------------------------------------------------ the floor
    // A round temple floor of old green-grey flagstone sunk to its ankles in black water, a brass-curbed pool of gold-lit water
    // in the middle, brass lines running out to the nine places the heads stand, drowned arches and reeds beyond the wall.
    buildTemple(c, bx, by) {
      const r = rng(88), R = ARENA.full;
      c.fillStyle = '#04100c'; c.fillRect(-bx, -by, bx * 2, by * 2);
      // the black water beyond the rim, algae glowing in it, drowned arches and broken columns standing in it
      for (let i = 0; i < 80; i++) {
        const a = r() * TAU, d = R + 20 + r() * Math.max(bx, by), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.95;
        if (Math.abs(x) > bx - 6 || Math.abs(y) > by - 6) continue;
        glow(c, x, y, 40 + r() * 90, r() < 0.5 ? '#0e3a28' : '#082018', 0.4 + r() * 0.3);
      }
      for (let i = 0; i < 9; i++) {
        const a = i * TAU / 9 + 0.17, d = R + 46 + r() * 36, x = Math.cos(a) * d, y = Math.sin(a) * d, s = 26 + r() * 20;
        ellipse(c, x + 4, y + 8, s * 1.1, s * 0.5, 0, 'rgba(0,0,0,0.5)');
        rrect(c, x - s * 0.45, y - s * 1.5, s * 0.9, s * 1.5, 4, '#2b3a35', 'rgba(0,0,0,0.6)', 2);
        for (let k = 0; k < 3; k++) line(c, x - s * 0.4, y - s * (0.4 + k * 0.4), x + s * 0.4, y - s * (0.4 + k * 0.4), 'rgba(0,0,0,0.35)', 1.4);
        ellipse(c, x, y + 2, s * 0.8, s * 0.3, 0, null, 'rgba(160,230,200,0.3)', 1.5);
      }
      for (let i = 0; i < 60; i++) {   // reeds
        const a = r() * TAU, d = R + 8 + r() * 60, x = Math.cos(a) * d, y = Math.sin(a) * d;
        for (let k = 0; k < 4; k++) line(c, x + k * 3, y, x + k * 3 + (r() - 0.5) * 8, y - 14 - r() * 18, '#1b3a24', 2);
      }
      // the floor
      c.save();
      c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
      const g = c.createRadialGradient(0, 0, 60, 0, 0, R);
      g.addColorStop(0, '#32463d'); g.addColorStop(0.6, '#25352e'); g.addColorStop(1, '#17231f');
      c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
      for (let i = 0; i < 130; i++) {   // flagstones
        const a = r() * TAU, d = Math.sqrt(r()) * R, cx = Math.cos(a) * d, cy = Math.sin(a) * d, s = 24 + r() * 44, rot = r() * TAU, pts = [];
        for (let k = 0; k < 5; k++) { const q = rot + k * TAU / 5 + (r() - 0.5) * 0.5, rr = s * (0.6 + r() * 0.5); pts.push(cx + Math.cos(q) * rr, cy + Math.sin(q) * rr * 0.85); }
        const v = 46 + r() * 22;
        poly(c, pts, `rgba(${v - 6 | 0},${v + 10 | 0},${v | 0},${0.3 + r() * 0.25})`, 'rgba(4,12,9,0.5)', 1.5);
      }
      for (let i = 0; i < 2600; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.5 + r() * 1.3, r() < 0.55 ? `rgba(4,12,9,${0.25 + r() * 0.3})` : `rgba(140,230,180,${0.04 + r() * 0.08})`); }
      // algae and shallow water lying in the low places
      for (let i = 0; i < 26; i++) {
        const a = r() * TAU, d = Math.sqrt(r()) * R * 0.95, x = Math.cos(a) * d, y = Math.sin(a) * d, s = 24 + r() * 50;
        ellipse(c, x, y, s, s * 0.6, r() * 3, r() < 0.5 ? 'rgba(54,110,64,0.35)' : 'rgba(10,36,30,0.55)');
        if (r() < 0.5) ellipse(c, x - s * 0.2, y - s * 0.1, s * 0.5, s * 0.14, 0, 'rgba(180,240,220,0.12)');
      }
      // cracks, with a little water in them
      for (let i = 0; i < 28; i++) {
        let x = (r() * 2 - 1) * R * 0.9, y = (r() * 2 - 1) * R * 0.9, a = r() * TAU;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5 + r() * 6; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (10 + r() * 18); y += Math.sin(a) * (10 + r() * 18); c.lineTo(x, y); }
        c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(3,10,8,0.7)'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(120,220,190,0.14)'; c.lineWidth = 1; c.stroke();
      }
      // brass inlay: a ring round the pool, a wide ring between the heads and the columns, and a line out to every place a head stands
      for (const [rad, w] of [[150, 3], [330, 2]]) { circle(c, 0, 0, rad, null, 'rgba(0,0,0,0.6)', w + 3); circle(c, 0, 0, rad, null, 'rgba(184,144,58,0.55)', w); circle(c, 0, 0, rad, null, 'rgba(232,200,112,0.25)', 1); }
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + k * TAU / 9, c0 = Math.cos(a), s0 = Math.sin(a);
        line(c, c0 * 150, s0 * 150, c0 * 330, s0 * 330, 'rgba(0,0,0,0.5)', 5); line(c, c0 * 150, s0 * 150, c0 * 330, s0 * 330, 'rgba(184,144,58,0.4)', 2);
        // the plinth a head stands on, and the worn ring at the foot of its column
        ellipse(c, c0 * 210, s0 * 210 + 4, 40, 24, 0, 'rgba(0,0,0,0.35)');
        ellipse(c, c0 * 210, s0 * 210, 38, 23, 0, 'rgba(60,84,72,0.7)', 'rgba(0,0,0,0.5)', 2);
        ellipse(c, c0 * 210, s0 * 210, 28, 16, 0, null, 'rgba(184,144,58,0.35)', 1.6);
        ellipse(c, c0 * 470, s0 * 470 + 3, 62, 36, 0, 'rgba(20,34,28,0.55)', 'rgba(0,0,0,0.4)', 2);
        ellipse(c, c0 * 470, s0 * 470, 50, 29, 0, null, 'rgba(184,144,58,0.3)', 1.4);
      }
      c.restore();
      // the pool: black water under a sheen of gold, a curb of brass
      const pg = c.createRadialGradient(0, 0, 10, 0, 0, 128);
      pg.addColorStop(0, '#6a5a1c'); pg.addColorStop(0.35, '#2a3a24'); pg.addColorStop(1, '#06120e');
      c.beginPath(); c.arc(0, 0, 128, 0, TAU); c.fillStyle = pg; c.fill();
      glow(c, 0, 0, 150, '#c8a83a', 0.22);
      for (let i = 0; i < 6; i++) ellipse(c, (r() - 0.5) * 120, (r() - 0.5) * 100, 30 + r() * 30, 7 + r() * 5, r() - 0.5, 'rgba(255,224,130,0.1)');
      circle(c, 0, 0, 128, null, '#0b0a08', 9); circle(c, 0, 0, 128, null, BRASS, 5); circle(c, 0, 0, 125, null, BRASS_L, 1.4);
      c.beginPath(); c.arc(0, 0, R - 5, 0, TAU); c.strokeStyle = 'rgba(120,230,190,0.15)'; c.lineWidth = 10; c.stroke();
      c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 3; c.stroke();
      // where the live details go (drawAmbient): rings spreading on the pool, motes of light, drips from the columns
      this.amb = {
        kind: 'temple',
        motes: Array.from({ length: 34 }, () => ({ x: (r() * 2 - 1) * R * 0.9, y: (r() * 2 - 1) * R * 0.9, ph: r() * 9, sp: 6 + r() * 8 })),
        drips: Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + i * TAU / 9; return { x: Math.cos(a) * 400, y: Math.sin(a) * 400, ph: r() * 5 }; }),
        mist: Array.from({ length: 9 }, () => ({ a: r() * TAU, sp: (r() < 0.5 ? -1 : 1) * (0.012 + r() * 0.015), s: 90 + r() * 70 })),
      };
    },
    templeLife(ctx, a, t) {
      for (let i = 0; i < 3; i++) { const q = (t * 0.22 + i / 3) % 1; ellipse(ctx, 0, 4, 14 + q * 120, (14 + q * 120) * 0.85, 0, null, rgba('#ffe9a8', 0.28 * (1 - q)), 2); }
      for (const m of a.mist) { const an = m.a + t * m.sp; glow(ctx, Math.cos(an) * ARENA.R * 0.82, Math.sin(an) * ARENA.R * 0.82, m.s, '#8ac8a8', 0.05); }
      for (const d of a.drips) { const q = (t * 0.5 + d.ph) % 3; if (q < 1) { circle(ctx, d.x + 14, d.y + 6 + q * 14, 1.8 * (1 - q), rgba('#a8f0e8', 0.6 * (1 - q))); if (q > 0.85) ellipse(ctx, d.x + 14, d.y + 20, 5 * (q - 0.85) * 6, 2, 0, null, rgba('#a8f0e8', 0.4), 1); } }
      for (const m of a.motes) { const x = m.x + Math.sin(t * 0.3 + m.ph) * 30, y = m.y - ((t * m.sp + m.ph * 40) % 90) + 45; circle(ctx, x, y, 1.3, rgba('#c8ffe0', 0.14 + Math.sin(t + m.ph) * 0.07)); }
    },
    // ------------------------------------------------------------------ a column: grey-green stone, a brass band, a brass dish
    // at its foot that burns while a stump waits to be seared (pr.state 1)
    templeColumn(ctx, pr, t) {
      const { x, y, r } = pr, h = 78, lit = pr.state === 1;
      ellipse(ctx, x + 6, y + 8, r * 1.5, r * 0.7, 0, 'rgba(0,0,0,0.5)');
      ellipse(ctx, x, y + 2, r * 1.25, r * 0.62, 0, '#3a4a42', OUT, 2.5);   // the plinth
      const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
      g.addColorStop(0, '#3a4a44'); g.addColorStop(0.4, '#7a8e84'); g.addColorStop(0.75, '#56685f'); g.addColorStop(1, '#2c3a34');
      ctx.beginPath(); ctx.moveTo(x - r * 0.8, y); ctx.lineTo(x - r * 0.72, y - h); ctx.lineTo(x + r * 0.72, y - h); ctx.lineTo(x + r * 0.8, y); ctx.ellipse(x, y, r * 0.8, r * 0.38, 0, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
      for (let k = 1; k < 5; k++) line(ctx, x - r * 0.45 + k * r * 0.2, y - 4, x - r * 0.4 + k * r * 0.2, y - h + 6, 'rgba(10,20,16,0.4)', 1.4);   // fluting
      // green slime climbing from the water, and a broken, capital-less top
      ellipse(ctx, x, y - 6, r * 0.82, 9, 0, 'rgba(70,130,80,0.5)');
      for (let k = 0; k < 4; k++) line(ctx, x - r * 0.5 + k * r * 0.35, y - 8, x - r * 0.5 + k * r * 0.35 + 2, y - 22 - (k % 2) * 14, 'rgba(80,150,90,0.55)', 3);
      ellipse(ctx, x, y - h, r * 0.78, r * 0.3, 0, '#8a9e94', OUT, 2.2);
      poly(ctx, [x - r * 0.5, y - h, x - r * 0.2, y - h - 14, x + r * 0.1, y - h - 5, x + r * 0.45, y - h - 10, x + r * 0.62, y - h], '#6a7e74', OUT, 1.8);
      // a brass band round the shaft
      for (const q of [0.35, 0.82]) { ctx.beginPath(); ctx.ellipse(x, y - h * q, r * 0.78, r * 0.3, 0, 0, Math.PI); ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = BRASS; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = BRASS_L; ctx.lineWidth = 1; ctx.stroke(); }
      // the dish at its foot (outward, away from the middle)
      const a = Math.atan2(y, x), dx = x + Math.cos(a) * (r + 18), dy = y + Math.sin(a) * (r + 18);
      ellipse(ctx, dx, dy + 3, 16, 8, 0, 'rgba(0,0,0,0.4)');
      ellipse(ctx, dx, dy, 15, 8, 0, BRASS, OUT, 2); ellipse(ctx, dx, dy - 1, 11, 5, 0, '#2a1a08');
      if (lit) {
        glow(ctx, dx, dy - 10, 70, '#ff9a3a', 0.35 + 0.1 * Math.sin(t * 7));
        for (let i = 0; i < 5; i++) { const q = (t * 1.5 + i / 5 + pr.id * 0.1) % 1; ctx.save(); ctx.globalAlpha *= (1 - q); ellipse(ctx, dx + Math.sin(t * 4 + i * 2) * 4, dy - 4 - q * 26, 6 * (1 - q * 0.6), 10 * (1 - q * 0.5), 0, i % 2 ? '#ffd27a' : '#ff8a2a'); ctx.restore(); }
      } else for (let i = 0; i < 3; i++) circle(ctx, dx + (i - 1) * 4, dy - 1, 1.6, '#4a2a10');
    },
    // ------------------------------------------------------------------ the bog the heads leave (Venom Bloom: violet; Mire Spit: brown)
    hydraPool(ctx, p, r, k, t) {
      const venom = p.tag === 'bloom', c0 = venom ? '#a050e0' : '#9a7a44', c1 = venom ? '#2a0e40' : '#2a1c0c';
      ctx.save(); ctx.globalAlpha = k;
      glow(ctx, p.x, p.y, r * 1.3, venom ? '#8a3ac8' : '#7a5a2a', 0.22);
      const g = ctx.createRadialGradient(p.x - r * 0.25, p.y - r * 0.25, r * 0.1, p.x, p.y, r);
      g.addColorStop(0, c0); g.addColorStop(0.6, venom ? '#5a2a8a' : '#5a4222'); g.addColorStop(1, c1);
      ctx.fillStyle = g; ctx.beginPath();
      for (let i = 0; i <= 18; i++) { const a = i * TAU / 18, w = 1 + Math.sin(a * 3 + p.id) * 0.07 + Math.sin(a * 5 + t * 1.4) * 0.035, x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w * 0.9; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = venom ? 'rgba(20,6,34,0.85)' : 'rgba(26,16,6,0.85)'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85); ctx.lineWidth = 2.5; ctx.stroke();
      // the print it leaves: a lotus of petals (Venom Bloom), a slow swirl (Mire Spit)
      if (venom) for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2 + t * 0.05, c0 = Math.cos(a), s0 = Math.sin(a), len = r * 0.82, w = len * 0.2; ctx.beginPath(); ctx.moveTo(p.x + c0 * 6, p.y + s0 * 6); ctx.quadraticCurveTo(p.x + c0 * len * 0.5 - s0 * w, p.y + s0 * len * 0.5 + c0 * w, p.x + c0 * len, p.y + s0 * len); ctx.quadraticCurveTo(p.x + c0 * len * 0.5 + s0 * w, p.y + s0 * len * 0.5 - c0 * w, p.x + c0 * 6, p.y + s0 * 6); ctx.strokeStyle = rgba('#d8a0ff', 0.5); ctx.lineWidth = 1.4; ctx.stroke(); }
      else for (let arm = 0; arm < 2; arm++) { ctx.beginPath(); for (let i = 0; i <= 20; i++) { const q = i / 20, a = arm * Math.PI + q * 4.2 + t * 0.6, d = r * (0.1 + 0.8 * q); i ? ctx.lineTo(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.9) : ctx.moveTo(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.9); } ctx.strokeStyle = rgba('#e8c878', 0.45); ctx.lineWidth = 1.6; ctx.stroke(); }
      for (let i = 0; i < 5; i++) { const q = (t * 0.6 + i / 5 + p.id * 0.13) % 1, a = i * 2.2 + p.id; circle(ctx, p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.45, 2 + q * 5, null, rgba(venom ? '#e0a0ff' : '#e8d098', 0.65 * (1 - q)), 1.5); }
      // slow: little arrows pulling down
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + p.id; line(ctx, p.x + Math.cos(a) * r * 0.55, p.y + Math.sin(a) * r * 0.5 - 4, p.x + Math.cos(a) * r * 0.55, p.y + Math.sin(a) * r * 0.5 + 4, rgba('#ffffff', 0.35), 2); }
      ctx.restore();
    },
    // ------------------------------------------------------------------ the flood (the Submerge) and the Heart on the floor
    hydraRoom(ctx, room, t, v) {
      const fl = room.ev.flood;
      if (fl && t < fl.end + 1.2) {
        const age = t - fl.start, k = Math.min(1, age / 1.6) * Math.min(1, Math.max(0, (fl.end + 1.2 - t) / 1.2)), R = ARENA.R;
        ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
        const g = ctx.createRadialGradient(0, 0, 40, 0, 0, R);
        g.addColorStop(0, rgba('#2ec8c0', 0.4 * k)); g.addColorStop(0.6, rgba('#128a90', 0.5 * k)); g.addColorStop(1, rgba('#0a5a68', 0.56 * k));
        ctx.fillStyle = g; ctx.fillRect(-R - 40, -R - 40, R * 2 + 80, R * 2 + 80);
        for (let i = 0; i < 26; i++) {
          const a = hy(i, 3) * TAU, d = Math.sqrt(hy(i, 4)) * R, q = (t * 0.35 + hy(i, 5)) % 1, x = Math.cos(a) * d, y = Math.sin(a) * d;
          ellipse(ctx, x, y, 14 + q * 40, (14 + q * 40) * 0.5, 0, null, rgba('#d8fff4', 0.4 * (1 - q) * k), 1.6);
        }
        // caustics: bright threads of light moving over the water, and rings round the foot of every column
        for (let i = 0; i < 14; i++) { const a = hy(i, 8) * TAU, d = Math.sqrt(hy(i, 9)) * R, x = Math.cos(a) * d + Math.sin(t * 0.7 + i) * 14, y = Math.sin(a) * d; ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.quadraticCurveTo(x, y + Math.sin(t * 1.5 + i) * 9, x + 30, y + 2); ctx.strokeStyle = rgba('#d8fff4', 0.28 * k); ctx.lineWidth = 2; ctx.stroke(); }
        for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + i * TAU / 9, x = Math.cos(a) * 400, y = Math.sin(a) * 400; for (let j = 0; j < 2; j++) { const q = (t * 0.5 + j / 2 + i * 0.13) % 1; ellipse(ctx, x, y + 2, 34 + q * 30, (34 + q * 30) * 0.5, 0, null, rgba('#eafffa', 0.6 * (1 - q) * k), 1.8); } }
        ctx.restore();
      }
      const hh = room.ev.hheart;
      if (hh && t < hh.end) {
        const pu = 0.5 + 0.5 * Math.sin(t * 3.4);
        glow(ctx, 0, 0, 250, '#ffd870', 0.1 + 0.12 * pu);
        for (let i = 0; i < 2; i++) { const q = (t * 0.5 + i / 2) % 1; ellipse(ctx, 0, 0, 90 + q * 360, (90 + q * 360) * 0.9, 0, null, rgba('#ffe9a8', 0.26 * (1 - q)), 2.5); }
      }
    },
  });

  // ---------------------------------------------------------------------- shared drawing helpers
  const INK = '#071410';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mixHex = (a, b, q) => { const pa = hexToRgb(a), pb = hexToRgb(b); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join(''); };
  const clipRoom = c => { ARENA.trace(c, 4); c.clip(); };
  // a flame tongue standing on (x, y)
  function tongue(c, x, y, h, w, sway, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x - w, y);
    c.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h); c.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
    c.quadraticCurveTo(x, y + w * 0.4, x - w, y); c.fill();
  }
  // a jagged bolt: ink edge, a body, a white-hot core
  function bolt(c, x1, y1, x2, y2, seed, col, w, jag, alpha = 1) {
    const n = 8, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, pts = [];
    for (let i = 0; i <= n; i++) { const j = i && i < n ? (hy(i, seed) - 0.5) * 2 * jag : 0; pts.push([x1 + dx * i / n + nx * j, y1 + dy * i / n + ny * j]); }
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [col2, ww, a] of [['#2a2204', w + 4, 0.6], [col, w, 0.95], ['#ffffff', Math.max(1, w * 0.4), 1]]) {
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.globalAlpha = alpha * a; c.strokeStyle = col2; c.lineWidth = ww; c.stroke();
    }
    c.restore();
  }
  // a ring that wobbles like water
  function ripple(c, x, y, r, amp, ph, n = 64) {
    c.beginPath();
    for (let i = 0; i <= n; i++) { const a = i * TAU / n, w = r + Math.sin(a * 6 + ph) * amp + Math.sin(a * 11 - ph * 1.7) * amp * 0.5; i ? c.lineTo(x + Math.cos(a) * w, y + Math.sin(a) * w) : c.moveTo(x + Math.cos(a) * w, y + Math.sin(a) * w); }
  }
  // a standing spike (ice, mud, stone): base centre (x, y), tip h above it
  function spike(c, x, y, h, w, lean, fill, hi, ink) {
    c.beginPath(); c.moveTo(x - w, y); c.lineTo(x + lean * h, y - h); c.lineTo(x + w, y); c.closePath();
    c.fillStyle = fill; c.fill(); c.lineJoin = 'round'; c.lineWidth = 1.6; c.strokeStyle = ink; c.stroke();
    c.beginPath(); c.moveTo(x - w * 0.15, y); c.lineTo(x + lean * h, y - h); c.lineTo(x + w * 0.55, y); c.closePath(); c.fillStyle = hi; c.fill();
  }
  // a lane (a rect telegraph) drawn in its own frame: x runs down the lane, y across it
  function lane(ctx, s, fn) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    fn(Math.min(s.len, ARENA.R * 2.3), s.w / 2); ctx.restore();
  }
  // a skeletal hand coming up out of the water: wrist at (x, y), reaching h above it
  function hand(c, x0, y0, h0, k, seed, t) {
    const S = 1.55, x = 0, y = 0, h = h0 / S;
    c.save(); c.translate(x0, y0); c.scale(S, S); c.globalAlpha *= k; c.lineCap = 'round'; c.lineJoin = 'round';
    const sway = Math.sin(t * 2 + seed * 5) * 3, top = y - h;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + sway * 0.5, top + 8); c.strokeStyle = INK; c.lineWidth = 9; c.stroke();
    c.strokeStyle = '#ece6d2'; c.lineWidth = 5.4; c.stroke();
    ellipse(c, x + sway, top, 9, 7.5, 0, '#ece6d2', INK, 1.8);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.46 + sway * 0.01, L1 = (i === 2 ? 15 : i === 0 || i === 4 ? 10 : 13), curl = (i - 2) * 0.16 + Math.sin(t * 3 + i + seed) * 0.08;
      const bx = x + sway + Math.cos(a) * 7, by = top + Math.sin(a) * 6, mx = bx + Math.cos(a) * L1, my = by + Math.sin(a) * L1, ex = mx + Math.cos(a + curl) * L1 * 0.8, ey = my + Math.sin(a + curl) * L1 * 0.8;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(mx, my); c.lineTo(ex, ey); c.strokeStyle = INK; c.lineWidth = 4.8; c.stroke(); c.strokeStyle = '#ece6d2'; c.lineWidth = 2.6; c.stroke();
      circle(c, mx, my, 1.8, '#ece6d2', INK, 0.8);
    }
    c.restore();
  }

  // ---------------------------------------------------------------------- the puddles and floors her moves leave
  Object.assign(ArenaView, {
    // Acid Spray's pool (the cone's middle, for a few seconds): lime acid with a dark crust, cells of scum floating on it
    hydraAcid(ctx, z, k, t) {
      const s = z.shape, id = z.id || 1;
      ctx.save(); ARENA.trace(ctx, 2); ctx.clip(); SHAPES.trace(ctx, s); ctx.save(); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r + 200);
      g.addColorStop(0, rgba('#c8f03a', 0.52 * k)); g.addColorStop(0.6, rgba('#8ac01c', 0.46 * k)); g.addColorStop(1, rgba('#4a7a10', 0.4 * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r - 220, s.y - s.r - 220, s.r * 2 + 440, s.r * 2 + 440);
      // a honeycomb of scum cells and darker patches where it pools
      for (let i = 0; i < 26; i++) {
        const a = s.angle + (hy(i, id) - 0.5) * s.arc * 0.95, d = 40 + hy(i, id + 1) * (s.r + 160), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d, r = 14 + hy(i, id + 2) * 24;
        ellipse(ctx, x, y, r, r * 0.8, hy(i, 4) * 3, rgba('#3a6a0a', 0.24 * k), rgba('#e6ff70', 0.34 * k), 1.4);
      }
      for (let i = 0; i < 9; i++) {
        const q = (t * 0.6 + i / 9 + id * 0.13) % 1, a = s.angle + (hy(i, id + 5) - 0.5) * s.arc * 0.8, d = 80 + hy(i, id + 6) * (s.r + 120), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
        if (q < 0.8) { const br = 2 + q * 7; circle(ctx, x, y, br, rgba('#d8ff6a', 0.7 * k), rgba('#16300a', 0.8 * k), 1); circle(ctx, x - br * 0.3, y - br * 0.3, br * 0.28, rgba('#ffffff', 0.9 * k)); }
        else circle(ctx, x, y, 8 + (q - 0.8) * 50, null, rgba('#e6ff9a', (1 - q) * 4 * k), 1.2);
      }
      ctx.restore();
      SHAPES.trace(ctx, s); ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#16300a', 0.8 * k); ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85 * k); ctx.lineWidth = 2.6; ctx.stroke();
      ctx.restore();
    },
    // Flame Gout's embers: a scorched ring of black stone with the fire still working in its cracks
    hydraEmber(ctx, p, r, k, t) {
      ctx.save(); ctx.globalAlpha = k;
      glow(ctx, p.x, p.y, r * 1.5, '#ff6a1a', 0.26);
      const g = ctx.createRadialGradient(p.x, p.y, r * 0.1, p.x, p.y, r);
      g.addColorStop(0, '#ffe08a'); g.addColorStop(0.4, '#ff8a22'); g.addColorStop(0.8, '#7a2208'); g.addColorStop(1, '#1c0a06');
      ctx.fillStyle = g; ctx.beginPath();
      for (let i = 0; i <= 18; i++) { const a = i * TAU / 18, w = 1 + Math.sin(a * 3 + p.id) * 0.08 + Math.sin(a * 5 + t * 1.6) * 0.04, x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(14,6,4,0.85)'; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85); ctx.lineWidth = 2.5; ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + p.id, a2 = a + 0.5, d1 = r * 0.2, d2 = r * (0.62 + 0.2 * hy(i, p.id)), heat = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
        ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * d1, p.y + Math.sin(a) * d1); ctx.lineTo(p.x + Math.cos(a2) * (d1 + d2) / 2, p.y + Math.sin(a2) * (d1 + d2) / 2); ctx.lineTo(p.x + Math.cos(a + 0.2) * d2, p.y + Math.sin(a + 0.2) * d2);
        ctx.strokeStyle = 'rgba(20,8,4,0.9)'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = rgba('#ffd27a', 0.5 + 0.4 * heat); ctx.lineWidth = 1.2; ctx.stroke();
      }
      for (let i = 0; i < 5; i++) { const q = (t * 0.8 + i / 5 + p.id * 0.13) % 1, a = i * 1.7 + p.id; circle(ctx, p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.45 - q * 18, 1.8 * (1 - q), rgba('#ffe9a0', 0.9 * (1 - q))); }
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------------- how her telegraphs are dressed (boss-tells.js get())
  // Red is damage and blue is a stack or a soak (boss-tells.js draws those outlines); what is painted inside them is the
  // head's own element. Only the danger is painted: nothing marks a safe place.
  window.HY_TELLS = {
    // Mother's Cry: three rings of old gold on the water round her, lighting one after another as it nears
    cry: { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
      const R = ARENA.R, b = env.boss;
      ctx.save(); ctx.fillStyle = `rgba(30,24,4,${(0.05 + 0.18 * p * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
      for (let i = 0; i < 3; i++) {
        const r = 150 + i * 120, lit = clamp(p * 3.2 - i * 0.7, 0, 1), a = (0.3 + 0.6 * lit) * k;
        ctx.save(); ctx.lineJoin = 'round';
        ripple(ctx, b.x, b.y, r, 2 + 2 * lit, t * 2 + i, 72); ctx.strokeStyle = rgba('#120e02', 0.55 * k); ctx.lineWidth = 8; ctx.stroke();
        ctx.strokeStyle = rgba('#e8c45a', a); ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = rgba('#fff6d0', a * 0.9); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.setLineDash([5, 11]); ctx.lineDashOffset = -t * 18; ctx.beginPath(); ctx.arc(b.x, b.y, r + 15, 0, TAU); ctx.strokeStyle = rgba('#e8c45a', 0.4 * a); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      }
      // a ring drawing in on her, over and over, as the cry gathers
      for (let i = 0; i < 2; i++) { const q = (t * 0.55 + i / 2) % 1, r = 60 + (1 - q) * 380; circle(ctx, b.x, b.y, r, null, rgba('#ffe9a8', 0.22 * q * k * (0.3 + p)), 2); }
      glow(ctx, b.x, b.y, 110 + 60 * p, '#ffd870', (0.08 + 0.2 * p) * k);
    } },
    // The Submerge: the pool begins to turn and everything is drawn toward her, foam on the arms of the whirl
    surge: { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
      const R = ARENA.R, b = env.boss;
      ctx.save(); ctx.fillStyle = `rgba(6,56,58,${(0.05 + 0.22 * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
      ctx.save(); ctx.lineCap = 'round';
      for (let arm = 0; arm < 4; arm++) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const q = i / 40, a = arm * TAU / 4 + q * 3.4 - t * (0.9 + 2.2 * p), d = 70 + q * (R * 0.82); i ? ctx.lineTo(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d) : ctx.moveTo(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d); }
        ctx.strokeStyle = rgba('#031a1c', 0.5 * k); ctx.lineWidth = 12; ctx.stroke();
        ctx.strokeStyle = rgba('#7ff0e0', (0.18 + 0.4 * p) * k); ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = rgba('#eafffa', (0.25 + 0.5 * p) * k); ctx.lineWidth = 1.5; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -t * 40; ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
      for (let i = 0; i < 4; i++) { const q = (t * 0.5 + i / 4) % 1; circle(ctx, b.x, b.y, R * (1 - q) + 40, null, rgba('#b8fff6', 0.34 * q * k * (0.4 + p)), 3); }
      glow(ctx, b.x, b.y, 90 + 80 * p, '#0a2a2c', (0.3 + 0.4 * p) * k);
    } },
    // Acid Spray: a flat cone of lime spray, scummed and bubbling, dashed along its edges
    acid: { ground(ctx, tg, s, p, k, t) {
      const id = tg.id;
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const fr = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
      fr.addColorStop(0, rgba('#f2ffb8', (0.26 + 0.3 * p) * k)); fr.addColorStop(0.4, rgba('#a8e020', (0.16 + 0.2 * p) * k)); fr.addColorStop(1, rgba('#4a7a10', (0.1 + 0.16 * p) * k));
      ctx.fillStyle = fr; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 18; i++) {
        const a = s.angle + (hy(i, id) - 0.5) * s.arc * 0.9, d = 90 + hy(i, id + 1) * (s.r - 130), r = 14 + hy(i, id + 2) * 26;
        ellipse(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, r * 0.75, hy(i, 3) * 3, rgba(i % 2 ? '#2c4a0a' : '#d8ff6a', (i % 2 ? 0.16 : 0.1) * k * (0.5 + p)));
      }
      for (let i = 0; i < 16; i++) { const a = s.angle + (hy(i, id + 7) - 0.5) * s.arc * 0.9, d = 80 + hy(i, id + 1) * (s.r - 100), q = (t * 0.7 + hy(i, 2)) % 1; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 12, 3 + 4 * q, null, rgba('#e6ff8a', 0.7 * (1 - q) * k * (0.3 + p)), 1.6); }
      ctx.restore();
      ctx.save(); ctx.setLineDash([11, 9]); ctx.lineDashOffset = -t * 20; ctx.lineCap = 'butt';
      for (const sd of [-1, 1]) { const a = s.angle + sd * s.arc / 2; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * 36, s.y + Math.sin(a) * 36); ctx.lineTo(s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r); ctx.strokeStyle = rgba('#e6ff6a', (0.4 + 0.45 * p) * k); ctx.lineWidth = 2.4; ctx.stroke(); }
      ctx.restore();
      glow(ctx, s.x + Math.cos(s.angle) * 40, s.y + Math.sin(s.angle) * 40, 60 + 40 * p, '#c8ff4a', (0.2 + 0.4 * p) * k);
    } },
    // Tidal Line: a lane of running water, bright edged, chevrons of foam racing down it
    tide: { ground(ctx, tg, s, p, k, t) {
      lane(ctx, s, (L, hw) => {
        const g = ctx.createLinearGradient(0, 0, L, 0);
        g.addColorStop(0, rgba('#5ff0e0', (0.3 + 0.3 * p) * k)); g.addColorStop(0.5, rgba('#16a0a0', (0.16 + 0.2 * p) * k)); g.addColorStop(1, rgba('#0a5a62', (0.1 + 0.14 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(0, -hw, L, hw * 2);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const sp = 90 + 300 * p;
        for (let i = 0; i < 18; i++) {
          const x = ((i / 18) * L + t * sp) % L, f = (1 - x / L) * 0.8 + 0.2, w = hw * (0.8 + 0.1 * Math.sin(i));
          ctx.beginPath(); ctx.moveTo(x - 26, -w); ctx.lineTo(x, Math.sin(t * 4 + i) * 4); ctx.lineTo(x - 26, w);
          ctx.strokeStyle = rgba('#e0fffb', 0.6 * f * k * (0.3 + p)); ctx.lineWidth = 2.6; ctx.stroke();
        }
        for (const sd of [-1, 1]) { line(ctx, 0, sd * (hw - 1.5), L, sd * (hw - 1.5), rgba('#4fe8ff', (0.3 + 0.45 * p) * k), 3.4); line(ctx, 0, sd * (hw - 1.5), L, sd * (hw - 1.5), rgba('#eafffe', (0.2 + 0.4 * p) * k), 1); }
        glow(ctx, 20, 0, 70 + 40 * p, '#7ffff0', (0.2 + 0.4 * p) * k);
      });
    } },
    // Venom Bloom: a lotus of violet petals opening on the floor under the stack
    bloom: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      g.addColorStop(0, rgba('#c880ff', (0.18 + 0.3 * p) * k)); g.addColorStop(1, rgba('#2a0e40', (0.12 + 0.16 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      const petals = (n, len, w, rot, a) => {
        for (let i = 0; i < n; i++) {
          const an = rot + i * TAU / n, c0 = Math.cos(an), s0 = Math.sin(an), nx = -s0, ny = c0;
          ctx.beginPath(); ctx.moveTo(s.x + c0 * 6, s.y + s0 * 6);
          ctx.quadraticCurveTo(s.x + c0 * len * 0.5 + nx * w, s.y + s0 * len * 0.5 + ny * w, s.x + c0 * len, s.y + s0 * len);
          ctx.quadraticCurveTo(s.x + c0 * len * 0.5 - nx * w, s.y + s0 * len * 0.5 - ny * w, s.x + c0 * 6, s.y + s0 * 6);
          ctx.fillStyle = rgba('#a050e0', (0.07 + 0.1 * p) * k); ctx.fill(); ctx.strokeStyle = rgba('#d8a0ff', a * k); ctx.lineWidth = 1.8; ctx.stroke();
        }
      };
      const open = 0.55 + 0.45 * easeOut(p);
      petals(8, s.r * 0.97 * open, s.r * 0.26, t * 0.12, 0.5 + 0.4 * p);
      petals(8, s.r * 0.6 * open, s.r * 0.16, -t * 0.18 + TAU / 16, 0.4 + 0.4 * p);
      glow(ctx, s.x, s.y, s.r * 0.5, '#e8b8ff', (0.15 + 0.4 * p) * k);
      for (let i = 0; i < 8; i++) { const q = (t * 0.5 + i / 8) % 1, a = i * 2.3 + tg.id; circle(ctx, s.x + Math.cos(a) * s.r * 0.6 * (1 - q * 0.4), s.y + Math.sin(a) * s.r * 0.5 - q * 30, 1.8 * (1 - q), rgba('#e8c0ff', 0.8 * (1 - q) * k)); }
      ctx.restore();
    } },
    // Flame Gout: a disc of heat under each hero, tongues of fire licking up inside it
    gout: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, s.r);
      g.addColorStop(0, rgba('#ffc060', (0.14 + 0.24 * p) * k)); g.addColorStop(1, rgba('#d84a0a', (0.1 + 0.2 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 2; i++) { const q = (t * 0.9 + i / 2) % 1; circle(ctx, s.x, s.y, s.r * (1 - q), null, rgba('#ffd89a', 0.4 * q * k * (0.3 + p)), 2); }
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + tg.id, d = s.r * (0.38 + 0.38 * hy(i, tg.id)), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d * 0.9 + 6, h = (8 + 20 * p) * (0.7 + 0.5 * hy(i, 3)) * (0.8 + 0.2 * Math.sin(t * 9 + i * 2)), w = 4 + 3 * p, sw = Math.sin(t * 6 + i) * 3;
        ctx.globalAlpha = k * (0.35 + 0.6 * p); tongue(ctx, x, y, h, w, sw, '#6a1a08'); tongue(ctx, x, y, h * 0.85, w * 0.75, sw, '#ff7a22'); tongue(ctx, x, y, h * 0.5, w * 0.4, sw * 0.6, '#ffe08a');
      }
      ctx.globalAlpha = 1; ctx.restore();
      glow(ctx, s.x, s.y, s.r * 0.9, '#ff8a2a', (0.14 + 0.3 * p) * k);
    } },
    // Rime Crown: a ring of ice spikes pushing up out of the water, taller as it nears
    rime: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip('evenodd');
      ctx.fillStyle = rgba('#bfe8ff', (0.07 + 0.16 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      ctx.restore();
      const n = 44, grow = 0.18 + 0.82 * easeOut(p), list = [];
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + hy(i, tg.id) * 0.1, band = i % 2 ? 0.7 : 0.38, d = s.r2 + (s.r - s.r2) * (band + (hy(i, 5) - 0.5) * 0.16);
        list.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, h: (10 + 30 * hy(i, 9)) * grow, w: 4 + 3 * hy(i, 11), lean: (hy(i, 13) - 0.5) * 0.4 });
      }
      list.sort((a, b) => a.y - b.y);
      ctx.save(); ctx.globalAlpha = k * (0.4 + 0.5 * p);
      for (const q of list) spike(ctx, q.x, q.y, q.h, q.w, q.lean, '#8cc8ee', '#f0fbff', '#0a2a4a');
      ctx.restore();
    } },
    // Stormcall: a lane of static, a crackling thread down its middle
    storm: { ground(ctx, tg, s, p, k, t) {
      lane(ctx, s, (L, hw) => {
        ctx.fillStyle = rgba('#3a3008', (0.14 + 0.22 * p) * k); ctx.fillRect(0, -hw, L, hw * 2);
        const fr = Math.floor(t * 10);
        for (let b = 0; b < 2; b++) {
          ctx.beginPath();
          for (let d = 0; d <= L; d += 34) { const off = (hy(Math.floor(d / 34) + fr, b + tg.id) - 0.5) * hw * 1.1; d ? ctx.lineTo(d, off) : ctx.moveTo(d, off); }
          ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#2a2204', 0.5 * k); ctx.lineWidth = 6; ctx.stroke();
          ctx.strokeStyle = rgba(b ? '#ffffff' : '#ffe45a', (0.28 + 0.55 * p) * k); ctx.lineWidth = b ? 1.2 : 2.4; ctx.stroke();
        }
        ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 40; line(ctx, 0, 0, L, 0, rgba('#ffd84a', (0.2 + 0.3 * p) * k), 2); ctx.setLineDash([]);
        for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) { const x = ((i / 6) * L + t * 80) % L; circle(ctx, x, sd * (hw - 4), 1.8, rgba('#fff6a0', (0.3 + 0.5 * Math.sin(t * 9 + i)) * k * (0.3 + p))); }
        glow(ctx, 30, 0, 50 + 30 * p, '#ffe45a', (0.18 + 0.4 * p) * k);
      });
    } },
    // Stonegaze: a pale veil over everything the head can see, shafts of grey light from its eye and a stipple of stone
    gaze: { ground(ctx, tg, s, p, k, t) {
      const R = ARENA.R, [sx, sy] = tg.cover || [s.x, s.y];
      ctx.save(); ctx.fillStyle = rgba('#c8c4d4', (0.05 + 0.15 * p) * k); ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160);
      for (let i = 0; i < 14; i++) {
        const a = i * TAU / 14 + t * 0.07, w = 0.07;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - w) * R * 2.2, sy + Math.sin(a - w) * R * 2.2); ctx.lineTo(sx + Math.cos(a + w) * R * 2.2, sy + Math.sin(a + w) * R * 2.2); ctx.closePath();
        ctx.fillStyle = rgba('#ffffff', (0.025 + 0.07 * p) * k); ctx.fill();
      }
      for (let i = 0; i < 70; i++) { const a = hy(i, tg.id) * TAU, d = Math.sqrt(hy(i, 8)) * R; circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.3 + hy(i, 6) * 1.6, rgba('#eeeaf8', (0.1 + 0.3 * p) * k * (0.5 + 0.5 * Math.sin(t * 2 + i)))); }
      glow(ctx, sx, sy, 90 + 70 * p, '#ffffff', (0.2 + 0.4 * p) * k);
      ctx.restore();
    } },
    // Hydra's Gaze (Hard): the whole inside of the temple under one pale eye drawn on the water
    hgaze: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      ctx.fillStyle = rgba('#c8c4d4', (0.1 + 0.2 * p) * k); ctx.fillRect(-ARENA.R * 2, -ARENA.R * 2, ARENA.R * 4, ARENA.R * 4);
      for (let i = 0; i < 18; i++) {
        const a = i * TAU / 18 + t * 0.05, w = 0.05;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a - w) * s.r, s.y + Math.sin(a - w) * s.r); ctx.lineTo(s.x + Math.cos(a + w) * s.r, s.y + Math.sin(a + w) * s.r); ctx.closePath();
        ctx.fillStyle = rgba('#ffffff', (0.03 + 0.08 * p) * k); ctx.fill();
      }
      for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * q, null, rgba('#ffffff', 0.4 * (1 - q) * k * (0.4 + p)), 3); }
      // the eye: a lens of white light, its iris and the slit of a pupil, opening as the cast runs
      const ew = s.r * 0.46, eh = s.r * 0.2 * (0.35 + 0.65 * easeOut(p));
      ctx.beginPath(); ctx.moveTo(s.x - ew, s.y); ctx.quadraticCurveTo(s.x, s.y - eh * 2, s.x + ew, s.y); ctx.quadraticCurveTo(s.x, s.y + eh * 2, s.x - ew, s.y); ctx.closePath();
      ctx.fillStyle = rgba('#ffffff', (0.06 + 0.12 * p) * k); ctx.fill(); ctx.strokeStyle = rgba('#ffffff', (0.4 + 0.5 * p) * k); ctx.lineWidth = 2.4; ctx.stroke();
      circle(ctx, s.x, s.y, eh * 1.1, rgba('#e8e4f8', 0.2 * k), rgba('#ffffff', (0.4 + 0.4 * p) * k), 2);
      ellipse(ctx, s.x, s.y, eh * 0.28, eh * 0.95, 0, rgba('#1a1626', (0.4 + 0.4 * p) * k));
      glow(ctx, s.x, s.y, 130, '#ffffff', (0.12 + 0.34 * p) * k);
      ctx.restore();
    } },
    // Mire Spit: a swirl of brown mud ringed in amber, bubbling up
    mirespit: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      g.addColorStop(0, rgba('#8a6a34', (0.2 + 0.28 * p) * k)); g.addColorStop(1, rgba('#3a2810', (0.14 + 0.2 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      ctx.lineCap = 'round';
      for (let arm = 0; arm < 2; arm++) {
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const q = i / 24, a = arm * Math.PI + q * 4.4 + t * (1 + 2 * p), d = s.r * (0.1 + 0.85 * q); i ? ctx.lineTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d) : ctx.moveTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d); }
        ctx.strokeStyle = rgba('#e8c878', (0.3 + 0.4 * p) * k); ctx.lineWidth = 2.2; ctx.stroke();
      }
      for (let i = 0; i < 6; i++) { const q = (t * 0.7 + i / 6) % 1, a = i * 2.1 + tg.id; circle(ctx, s.x + Math.cos(a) * s.r * 0.55, s.y + Math.sin(a) * s.r * 0.5, 2 + q * 5, null, rgba('#f0d898', 0.7 * (1 - q) * k), 1.5); }
      ctx.restore();
      ctx.save(); ctx.setLineDash([6, 8]); ctx.lineDashOffset = t * 14; circle(ctx, s.x, s.y, s.r * 0.86, null, rgba('#f0b048', (0.35 + 0.4 * p) * k), 2); ctx.restore();
    } },
    // Searing: a ring of brass-coloured light round the foot of the column, coals gathering to its middle
    sear: { ground(ctx, tg, s, p, k, t) {
      glow(ctx, s.x, s.y, s.r * 1.3, '#9fd0ff', (0.1 + 0.2 * p) * k);
      for (let i = 0; i < 2; i++) { const q = (t * 0.7 + i / 2) % 1; circle(ctx, s.x, s.y, s.r * (1 - q * 0.9), null, rgba('#d8ecff', 0.5 * q * k), 2); }
      circle(ctx, s.x, s.y, s.r * 0.78, null, rgba('#e8c870', (0.3 + 0.3 * p) * k), 1.6);
      for (let i = 0; i < 8; i++) { const q = (t * 0.8 + i / 8) % 1, a = i * TAU / 8 + t * 0.4, d = s.r * (1 - q) * 0.9; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 2.2 * (0.4 + q), rgba('#ffb060', 0.85 * q * k)); }
      ctx.save(); ctx.globalAlpha = k * (0.4 + 0.5 * p); for (let i = 0; i < 3; i++) { const x = s.x + (i - 1) * 9; tongue(ctx, x, s.y + 6, 10 + 8 * p + 3 * Math.sin(t * 9 + i), 4, Math.sin(t * 6 + i) * 2, '#ff8a2a'); } ctx.restore();
    } },
    // a head coming up out of the water: the pool turns over, a dark hole at its heart
    rise: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      g.addColorStop(0, rgba('#021412', (0.4 + 0.4 * p) * k)); g.addColorStop(0.6, rgba('#0a5a58', (0.2 + 0.2 * p) * k)); g.addColorStop(1, rgba('#4fd8cc', (0.1 + 0.14 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const q = i / 16, a = arm * TAU / 3 + q * 2.4 - t * (1.2 + 2 * p), d = s.r * (0.15 + 0.8 * q); i ? ctx.lineTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d) : ctx.moveTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d); }
        ctx.strokeStyle = rgba('#d8fff4', (0.3 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
      for (let i = 0; i < 2; i++) { const q = (t * 1.1 + i / 2) % 1; ellipse(ctx, s.x, s.y, s.r * q, s.r * q * 0.8, 0, null, rgba('#d8fff4', 0.5 * (1 - q) * k * (0.3 + p)), 2); }
    } },
    // the Mother's Heart beating
    heartbeat: { raidwide: true, ground(ctx, tg, s, p, k, t) {
      const R = ARENA.R;
      ctx.save(); ctx.fillStyle = `rgba(60,40,0,${(0.06 + 0.22 * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
      glow(ctx, 0, 0, 120 + 200 * p, '#ffd870', (0.2 + 0.3 * p) * k * (0.7 + 0.3 * Math.sin(t * 9)));
      for (let i = 0; i < 2; i++) { const q = (t * 0.9 + i / 2) % 1; circle(ctx, 0, 0, 60 + (1 - q) * 380, null, rgba('#ffe9a8', 0.3 * q * k * (0.3 + p)), 2.4); }
    } },
    // Rending Maul: the jaws of the Mother close in from either side, fangs along each, on the one she holds
    // Tail Thrash: the ring of water at her feet, dark green scale with a pale wedge of tail sweeping round it
    thrash: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      ctx.fillStyle = rgba('#0a2a1c', (0.12 + 0.2 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * (0.3 + 0.7 * q), null, rgba('#9ff0b8', 0.36 * (1 - q) * k * (0.4 + p)), 2.4); }
      const a0 = t * (1.4 + 3.2 * p);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, s.r, a0 - 0.9, a0); ctx.closePath();
      ctx.fillStyle = rgba('#c8ffd8', (0.08 + 0.18 * p) * k); ctx.fill();
      ctx.restore();
    } },
    // Undertow: the ring outside the first, foam running inward across it, lines of pull strengthening as it nears
    undertow: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip('evenodd');
      ctx.fillStyle = rgba('#0a3a40', (0.08 + 0.16 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 4; i++) {
        const q = (t * (0.5 + 0.9 * p) + i / 4) % 1, r = s.r - (s.r - s.r2) * q;
        ripple(ctx, s.x, s.y, r, 2, t * 3 + i, 72); ctx.strokeStyle = rgba('#d8fff4', 0.55 * Math.sin(q * Math.PI) * k * (0.35 + p)); ctx.lineWidth = 2.4; ctx.stroke();
      }
      const mid = (s.r + s.r2) / 2;
      for (let j = 0; j < 16; j++) {
        const a = j * TAU / 16 + t * 0.15, x = s.x + Math.cos(a) * mid, y = s.y + Math.sin(a) * mid, ux = -Math.cos(a), uy = -Math.sin(a), nx = -uy, ny = ux;
        ctx.beginPath(); ctx.moveTo(x - ux * -8 + nx * 9, y - uy * -8 + ny * 9); ctx.lineTo(x + ux * 8, y + uy * 8); ctx.lineTo(x - ux * -8 - nx * 9, y - uy * -8 - ny * 9);
        ctx.strokeStyle = rgba('#e8fffc', (0.16 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      }
      ctx.restore();
    } },
    buster: { ground(ctx, tg, s, p, k, t, env) {
      const tgt = tg.target != null ? env.entById(tg.target) : null;
      const reach = s.r * 0.92, tx = tgt ? tgt.x : s.x + Math.cos(s.angle) * s.r * 0.5, ty = tgt ? tgt.y : s.y + Math.sin(s.angle) * s.r * 0.5, close = easeOut(clamp(p * 1.05, 0, 1));
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const sd of [-1, 1]) {
        const a = s.angle + sd * s.arc / 2, fx = s.x + Math.cos(a) * reach, fy = s.y + Math.sin(a) * reach;
        const ex = fx + (tx - fx) * close, ey = fy + (ty - fy) * close, dx = ex - s.x, dy = ey - s.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        ctx.beginPath(); ctx.moveTo(s.x + ux * 50, s.y + uy * 50); ctx.lineTo(ex, ey); ctx.strokeStyle = rgba('#2a0408', 0.5 * k); ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = rgba('#ff3b52', (0.4 + 0.5 * p) * k); ctx.lineWidth = 3.4; ctx.stroke();
        // the fangs: bone teeth along the inner side of each jaw, pointing at the one it will close on
        const n = 8;
        for (let i = 0; i < n; i++) {
          const u = 0.3 + 0.62 * (i + 0.5) / n, bx = s.x + ux * L * u, by = s.y + uy * L * u, w = 5 + u * 3, len = 12 + u * 14 + 6 * p;
          const nx = -uy * sd * -1, ny = ux * sd * -1;
          poly(ctx, [bx - ux * w, by - uy * w, bx + nx * len, by + ny * len, bx + ux * w, by + uy * w], rgba('#f4eed8', (0.55 + 0.4 * p) * k), rgba('#2a0408', 0.7 * k), 1.2);
        }
      }
      ctx.restore();
      if (tgt) { glow(ctx, tgt.x, tgt.y, 38 + 20 * p, '#ff2a48', (0.12 + 0.5 * p) * k); circle(ctx, tgt.x, tgt.y, 30 * (1 - 0.35 * p), null, rgba('#ff3b52', 0.4 * k), 2); }
    } },
  };

  // ---------------------------------------------------------------------- what her moves do when they land (boss-vfx.js impact / propFx / enrage)
  // Each lands as the sheet paints it: a bold shape, a white-hot core, the head's saturated colour, dark inky edges. H is the
  // helper bag boss-vfx.js hands over (shapeFlash, shockAt, scatter, after, shake, roomTint, streak, AFT ...).
  const stumps = [];   // the stumps of cut heads, standing until they are seared or left to regrow
  function setStump(x, y, state) {
    const st = stumps.find(q => Math.hypot(q.x - x, q.y - y) < 12 && q.state !== 'gone');
    if (st) { st.state = state; st.dirty = true; }
    return st;
  }
  // a cut stump: dark scaled neck, brass collar, the wound ringed in red and bleeding the head's own ichor
  function drawStump(c, st, t) {
    const E = HY_EL[st.el] || HY_EL.acid, age = t - st.stateT;
    let a = 1;
    if (st.state === 'burn' && age > 6.5) { st.state = 'gone'; return; }
    if (st.state === 'regrow' && age > 4) { st.state = 'gone'; return; }
    if (st.state === 'char') a = clamp(1 - age / 6, 0, 1);
    if (st.state === 'burn') a = age < 4.5 ? 1 : clamp(1 - (age - 4.5) / 2, 0, 1);
    if (st.state === 'regrow') a = clamp(1 - age / 4, 0, 1);
    const burnt = st.state === 'burn';
    c.save(); c.globalAlpha *= a; c.translate(st.x, st.y);
    ellipse(c, 0, 5, 24, 9, 0, 'rgba(0,0,0,0.42)');
    c.beginPath(); c.moveTo(-15, 2); c.lineTo(-12, -26); c.lineTo(12, -26); c.lineTo(15, 2); c.ellipse(0, 2, 15, 5, 0, 0, Math.PI); c.closePath();
    c.fillStyle = mixHex('#14271d', E.dark, 0.3); c.fill(); c.lineJoin = 'round'; c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
    for (let i = 0; i < 5; i++) line(c, -10 + i * 5, -24, -9 + i * 5, -4, rgba(E.col, 0.35), 1.4);
    c.beginPath(); c.ellipse(0, -9, 14, 4.6, 0, 0, Math.PI); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); c.strokeStyle = BRASS; c.lineWidth = 3.2; c.stroke(); c.strokeStyle = BRASS_L; c.lineWidth = 0.9; c.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ellipse(c, 0, -26, 13, 5.4, 0, burnt ? '#241410' : '#7a2e2e', INK, 2);
    ellipse(c, 0, -26, 5, 2.2, 0, burnt ? '#3a2a24' : '#e8dcc0');
    if (st.state === 'bleed') {
      glow(c, 0, -26, 30, '#ff3a2a', 0.2 + 0.16 * pulse); glow(c, 0, -22, 22, '#9be83a', 0.22);
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.55 + i / 3) % 1, x = -8 + i * 8;
        line(c, x, -24, x + 1, -24 + q * 24, rgba('#9be83a', 0.7 * (1 - q * 0.5)), 2.6);
        circle(c, x + 1, -24 + q * 24, 2.4 * (1 - q * 0.4), '#c8ff5a', INK, 0.8);
      }
      ellipse(c, 0, -26, 13, 5.4, 0, null, rgba('#ff5a4a', 0.55 + 0.35 * pulse), 1.6);
    } else if (burnt && age < 4.5) {
      const hot = age < 1.6 ? 1 : clamp(1 - (age - 1.6) / 2.9, 0, 1);
      glow(c, 0, -30, 46 * (0.5 + hot), '#ff7a1a', 0.5 * hot);
      for (let i = 0; i < 5; i++) { const h = (26 + 34 * hy(i, 2)) * hot * (0.8 + 0.2 * Math.sin(t * 10 + i)), x = -9 + i * 4.5; tongue(c, x, -26, h, 6, Math.sin(t * 7 + i) * 4, '#5a1a08'); tongue(c, x, -26, h * 0.88, 4.6, Math.sin(t * 7 + i) * 4, '#ff7a22'); tongue(c, x, -26, h * 0.5, 2.6, Math.sin(t * 7 + i) * 2, '#ffe08a'); }
      ellipse(c, 0, -26, 13, 5.4, 0, null, rgba('#ffd27a', 0.85), 1.8);
    } else if (burnt) {
      ellipse(c, 0, -26, 13, 5.4, 0, null, rgba('#ff7a1a', 0.35 + 0.4 * pulse), 2.2); glow(c, 0, -26, 20, '#ff6a1a', 0.2 + 0.2 * pulse);
    } else if (st.state === 'regrow') {
      glow(c, 0, -28, 40, '#9be83a', 0.5 * (1 - age / 4)); ellipse(c, 0, -26, 13, 5.4, 0, null, rgba('#c8ff5a', 0.8), 2);
    }
    c.restore();
  }
  function stumpFx(msg) {
    const old = stumps.find(q => Math.hypot(q.x - msg.x, q.y - msg.y) < 12 && q.state !== 'gone'); if (old) old.state = 'gone';
    const st = { x: msg.x, y: msg.y, el: msg.el, state: 'bleed', stateT: 0, dirty: false };
    stumps.push(st); if (stumps.length > 14) stumps.shift();
    VFX.fx({ dur: 24, layer: 'air', draw: (c, p, t, e) => {
      if (st.state === 'gone') return;
      if (st.dirty) { st.stateT = t; st.dirty = false; }
      c.save(); c.globalAlpha = e.a; drawStump(c, st, t); c.restore();
    } });
  }
  // a head winding up: its element gathering at the mouth, each in its own way
  function headCast(msg) {
    const E = HY_EL[msg.el] || HY_EL.acid, dur = msg.dur || 3, big = msg.s ? 1 : 0.65, el = msg.el, col = E.glow;
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.06) * big;
      if (k <= 0) return;
      const x = msg.x, y = msg.y - 20;
      c.save(); c.globalAlpha = k;
      VFX.glowAt(c, x, y, 12 + p * 30, col, 0.25 + 0.5 * p);
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + t * 3, d = (1 - p) * 46 + 8, mx = x + Math.cos(a) * d, my = y + Math.sin(a) * d * 0.7;
        if (el === 'flame') tongue(c, mx, my + 4, 9 + 4 * p, 3, Math.sin(t * 9 + i) * 2, i % 2 ? '#ff7a22' : '#ffd27a');
        else if (el === 'frost') poly(c, [mx, my - 6, mx + 3, my, mx, my + 6, mx - 3, my], '#e8f8ff', '#0a2a4a', 0.8);
        else if (el === 'storm') { if (Math.sin(t * 17 + i * 3) > -0.2) bolt(c, mx, my, mx + Math.cos(a + 1.2) * 10, my + Math.sin(a + 1.2) * 8, i + Math.floor(t * 12), '#ffe45a', 1.6, 5, k); }
        else if (el === 'gaze') line(c, mx, my, x + Math.cos(a) * (d + 8), y + Math.sin(a) * (d + 8) * 0.7, rgba('#ffffff', 0.8), 1.6);
        else if (el === 'tide') circle(c, mx, my, 3 + 2 * p, null, rgba('#d8fffa', 0.9), 1.5);
        else if (el === 'mire') circle(c, mx, my, 2.6 + 2 * p, rgba('#8a6a34', 0.9), rgba('#f0d898', 0.9), 1);
        else circle(c, mx, my, 2.2 + 1.4 * p, rgba(col, 0.95), INK, 0.8);   // acid and venom: drops
      }
      c.restore();
    },
    // the snap: at the end of the cast the gathered light breaks off the mouth and a ring runs out of the head's foot
    done: () => {
      const bx = msg.x, by = msg.y - 22;
      VFX.burst(bx, by, { color: col, color2: '#ffffff', n: msg.s ? 12 : 6, speed: 230, size: msg.s ? 10 : 7, flash: false });
      VFX.flash(bx, by, msg.s ? 74 : 48, col, 0.18);
      VFX.shock(msg.x, msg.y + 6, { r: msg.s ? 78 : 52, color: col, w: 4, dur: 0.36, flat: 0.6 });
    } });
    // the charge on the water at the head's foot: a ring that tightens and burns brighter as the blow nears
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.05) * big;
      if (k <= 0) return;
      c.save(); clipRoom(c);
      const r = 44 - 14 * p, pu = 0.5 + 0.5 * Math.sin(t * (6 + 16 * p * p));
      ellipse(c, msg.x, msg.y + 8, r, r * 0.55, 0, rgba(col, (0.04 + 0.1 * p) * k), rgba(col, (0.25 + 0.5 * p) * k * (0.7 + 0.3 * pu)), 1.6 + 1.8 * p);
      c.restore();
    } });
  }

  // the Drowning: the water climbs and white hands reach up out of it, more and more of them
  function drownHands(H, hold, big, dur) {
    const hands = [];
    let nextAt = 0.3;
    return VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = clamp(t / hold, 0, 1);
      while (t >= nextAt && nextAt < hold + 1) {
        const at = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 70 }, 1)[0];
        if (at) hands.push({ x: at.x, y: at.y, at: t, life: 2.2 + Math.random() * 0.8, h: (big ? 44 : 32) + Math.random() * 26, seed: Math.random() * 9 });
        nextAt += (big ? 0.05 : 0.9 - 0.7 * q) * (0.6 + Math.random() * 0.8);
      }
      c.save(); clipRoom(c);
      for (let i = hands.length - 1; i >= 0; i--) {
        const hd = hands[i], u = (t - hd.at) / hd.life;
        if (u > 1) { hands.splice(i, 1); continue; }
        const rise = easeOut(Math.min(1, u / 0.22)), sink = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1, k = e.a * Math.min(1, sink * 1.2);
        for (let r = 0; r < 2; r++) { const rq = clamp(u * 1.4 - r * 0.25, 0, 1); ellipse(c, hd.x, hd.y, 8 + rq * 34, (8 + rq * 34) * 0.55, 0, null, rgba('#d8fff4', 0.6 * (1 - rq) * k), 1.8); }
        hand(c, hd.x, hd.y, hd.h * rise * sink, k, hd.seed, t);
        ellipse(c, hd.x, hd.y + 1, 11, 4.5, 0, null, rgba('#eafffa', 0.7 * k), 1.6);
      }
      c.restore();
    } });
  }

  // an ice / mud / stone spike field, popping up and sinking away again
  function spikeField(list, o) {
    VFX.fx({ dur: o.dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a;
      c.save(); clipRoom(c);
      for (const q of list) {
        const u = clamp((t - q.at) / 0.14, 0, 1), sink = clamp((o.dur - t) / o.sink, 0, 1), g = easeOut(u) * (1 + 0.12 * Math.sin(u * 3)) * sink;
        if (g <= 0.02) continue;
        c.globalAlpha = k * Math.min(1, sink * 1.5);
        spike(c, q.x, q.y, q.h * g, q.w, q.lean, o.fill, o.hi, o.ink);
      }
      c.restore();
    } });
  }

  // ---------------------------------------------------------------------- the beat on top of a landing
  // The camera holds for a beat when something big lands (main.js FX.cam).
  const FS = { camAt: -99 };
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  function cam(stop = 0.06, punch = 0.03, dur = 0.45, gap = 2.5) {
    const t = nowS(); if (t - FS.camAt < gap) return; FS.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }
  const CAMS = { cry: [0.05, 0.026], buster: [0.07, 0.034], thrash: [0.07, 0.034], undertow: [0.045, 0.024], bloom: [0.05, 0.026], hgaze: [0.09, 0.04], heartbeat: [0.1, 0.05], surge: [0.06, 0.03], tide: [0.04, 0.02], storm: [0.04, 0.02] };

  // the head whose turn is next rears: a ring closes on its base and its light gathers (for a stump about to answer, a ghost of
  // light stands over the stump instead). It is the read for which head is up, never a mark of where to stand.
  function rearFx(msg) {
    const E = HY_EL[msg.el] || HY_EL.acid, dur = Math.max(0.45, msg.dur || 1), big = msg.s ? 1 : 0.7, x = msg.x, y = msg.y;
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.1) * big;
      if (k <= 0) return;
      c.save(); clipRoom(c);
      for (let i = 0; i < 2; i++) { const q = (p * 1.4 + i * 0.5) % 1, r = (1 - q) * 66 + 26; ellipse(c, x, y + 8, r, r * 0.55, 0, null, rgba(E.glow, 0.5 * q * k), 2); }
      const pu = 0.5 + 0.5 * Math.sin(t * (10 + 14 * p));
      ellipse(c, x, y + 8, 30 - 6 * p, (30 - 6 * p) * 0.55, 0, rgba(E.glow, (0.08 + 0.16 * p) * k), rgba(E.glow, (0.55 + 0.4 * p) * k), 2.2 + 1.6 * p);
      glow(c, x, y - 16, 26 + 22 * p, E.glow, (0.14 + 0.3 * p) * k * (0.8 + 0.2 * pu));
      if (msg.st) {   // (a stump: a ghost of its head, a column of pale light)
        const g = c.createLinearGradient(x, y - 120, x, y); g.addColorStop(0, rgba(E.glow, 0)); g.addColorStop(1, rgba(E.glow, 0.34 * k * p));
        c.fillStyle = g; c.fillRect(x - 14, y - 120, 28, 120);
      }
      c.restore();
    } });
  }
  // a head that falls to the cutting: it tumbles from where it stood, spinning, and slaps down in the water
  function fallingHead(msg) {
    const art = typeof ADD_ART !== 'undefined' && ADD_ART['hy-' + msg.el]; if (!art) return;
    const face = Math.atan2(msg.y, msg.x), dir = Math.random() < 0.5 ? 1 : -1, sp = rnd(1.5, 3) * dir, E = HY_EL[msg.el] || HY_EL.acid;
    VFX.fx({ dur: 0.85, layer: 'air', draw: (c, p, t, e) => {
      const q = p, h = 60 * Math.sin(Math.min(1, q * 1.15) * Math.PI) * (1 - q * 0.3), out = Math.cos(face) * 60 * easeOut(q), outy = Math.sin(face) * 60 * easeOut(q);
      c.save(); c.globalAlpha = e.a * Math.min(1, (1 - q) / 0.3);
      c.translate(msg.x + out, msg.y - 20 + outy - h + q * q * 40); c.rotate(face + sp * q * 1.6);
      art(c, { t, hs: 1.3 }, false);
      c.restore();
    }, done: () => {
      const x = msg.x + Math.cos(face) * 60, y = msg.y + Math.sin(face) * 60;
      VFX.splash(x, y, { color: E.glow, n: 12, speed: 1.4 }); VFX.shock(x, y, { r: 80, color: E.glow, w: 4, dur: 0.4, flat: 0.7 });
    } });
  }
  // a stump answering: the ghost of the head that grew there rises out of it and strikes
  function ghostHead(msg) {
    const art = typeof ADD_ART !== 'undefined' && ADD_ART['hy-' + msg.el]; if (!art) return;
    const face = Math.atan2(msg.y, msg.x), E = HY_EL[msg.el] || HY_EL.acid, dur = 1.25;
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const rise = easeOut(clamp(p / 0.4, 0, 1)), out = clamp((1 - p) / 0.25, 0, 1), lunge = p > 0.55 ? Math.sin(clamp((p - 0.55) / 0.35, 0, 1) * Math.PI) : 0;
      const k = e.a * out * rise;
      if (k <= 0.01) return;
      c.save(); c.translate(msg.x + Math.cos(face) * lunge * 46, msg.y - 20 + Math.sin(face) * lunge * 32 + (1 - rise) * 46);
      glow(c, 0, 0, 70, E.glow, 0.3 * k);
      c.globalAlpha = 0.58 * k; c.rotate(face);
      art(c, { t: t * 1.4, hs: 2.2, action: { type: 'attack', t0: dur * 0.55, dur: dur * 0.3 } }, false);
      c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 2.4, d = 24 + 34 * rise; glow(c, msg.x + Math.cos(a) * d, msg.y - 20 + Math.sin(a) * d * 0.6 - 26 * p, 8, E.glow, 0.7 * k); }
      c.restore();
    } });
  }

  const HY_FX = {
    // returns true when the move is hers and handled here
    impact(tg, ctx, H, msg) {
      const key = tg.type === 'buster' ? 'buster' : tg.tag, f = tg.type === 'buster' ? IMP.buster : IMP[tg.tag];
      if (!f) return false;
      f(tg, ctx, H);
      if (CAMS[key]) cam(CAMS[key][0], CAMS[key][1], 0.45, key === 'heartbeat' ? 0.5 : 2.5);
      return true;
    },
    prop(msg, H) {
      const col = (HY_EL[msg.el] || HY_EL.acid).glow;
      if (msg.k === 'hcast') headCast(msg);
      else if (msg.k === 'stump') {
        H.shockAt(msg.x, msg.y, { r: 90, color: col, w: 6, dur: 0.5, flat: 1 });
        VFX.splash(msg.x, msg.y - 20, { color: '#9be83a', n: 12, speed: 1.3 }); VFX.splash(msg.x, msg.y - 20, { color: '#8a2a1a', n: 8, speed: 1.1 });
        VFX.smoke(msg.x, msg.y - 10, { n: 4, color: '#14271d', size: 30, a: 0.5, speed: 60 });
        stumpFx(msg); H.shake(7);
        fallingHead(msg); cam(0.07, 0.035, 0.5, 1.2);
        VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => {   // a fountain of ichor from the wound
          c.save(); c.globalAlpha = e.a * (1 - p); c.lineCap = 'round';
          for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32, L = (50 + 40 * hy(i, 4)) * easeOut(Math.min(1, p / 0.5)); line(c, msg.x, msg.y - 26, msg.x + Math.cos(a) * L * 0.6, msg.y - 26 + Math.sin(a) * L + p * p * 40, rgba(i % 2 ? '#9be83a' : '#8a2a1a', 0.85), 3.2 - 1.6 * p); }
          c.restore();
        } });
      } else if (msg.k === 'rear') {
        rearFx(msg);
      } else if (msg.k === 'sear') {
        setStump(msg.x, msg.y, 'burn');
        VFX.pillar(msg.x, msg.y, { r: 36, h: 150, color: '#ffb060', dur: 0.8 });
        VFX.pillar(msg.px, msg.py, { r: 30, h: 120, color: '#ffd27a', dur: 0.7 });
        H.shockAt(msg.x, msg.y, { r: 110, color: '#ffd27a', w: 7, dur: 0.5, flat: 1 });
        H.bang(msg.x, msg.y - 10, 70, { n: 12, color: '#ff8a2a', core: '#fff2c0', ink: '#3a1408' });
        VFX.sparks(msg.x, msg.y - 20, { color: '#ffd27a', n: 14, speed: 300 });
        VFX.smoke(msg.x, msg.y - 20, { n: 5, color: '#2a2220', size: 34, a: 0.55, speed: 80 });
        H.shake(5);
        H.shockAt(msg.x, msg.y, { r: 190, color: '#fff2c0', w: 5, dur: 0.7, flat: 1, delay: 0.12 });
        VFX.burst(msg.x, msg.y - 30, { color: '#ffd27a', color2: '#ffffff', n: 12, speed: 210, size: 9 });
        cam(0.05, 0.026, 0.4, 1.5);
      } else if (msg.k === 'regrow') {
        setStump(msg.x, msg.y, 'regrow');
        H.shockAt(msg.x, msg.y, { r: 120, color: '#c8ff5a', w: 7, dur: 0.6, flat: 1 });
        VFX.pillar(msg.x, msg.y, { r: 34, h: 130, color: '#9be83a', dur: 0.8 });
        VFX.splash(msg.x, msg.y - 20, { color: '#9be83a', n: 20, speed: 1.5 });
        VFX.burst(msg.x, msg.y - 24, { color: '#c8ff5a', color2: '#ffffff', n: 12, speed: 200, size: 10 });
        H.roomTint('#4f9a4a', 0.1, 0.5); H.shake(7);
      } else if (msg.k === 'rise') {
        H.shockAt(0, 0, { r: 160, color: '#a8f0e8', w: 10, dur: 0.7, flat: 1 });
        H.shockAt(0, 0, { r: 300, color: '#7ffff0', w: 6, dur: 0.9, flat: 1, delay: 0.1 });
        H.shockAt(0, 0, { r: 440, color: '#d8fff4', w: 4, dur: 1.1, flat: 1, delay: 0.2 });
        VFX.splash(0, 0, { color: '#4fd8cc', n: 24, speed: 1.6 });
        H.shake(8);
      } else if (msg.k === 'echo') {
        ghostHead(msg);
        VFX.fx({ dur: 1.4, layer: 'air', draw: (c, p, t, e) => {
          const k = e.a * (1 - p);
          c.save(); c.globalAlpha = k; VFX.glowAt(c, msg.x, msg.y - 22, 46 * (0.6 + 0.6 * p), col, 0.7);
          for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + t * 2, d = 20 + 30 * p; circle(c, msg.x + Math.cos(a) * d, msg.y - 22 + Math.sin(a) * d * 0.7, 3, rgba(col, 0.9), INK, 0.8); }
          c.restore();
        } });
        H.shockAt(msg.x, msg.y, { r: 130, color: col, w: 6, dur: 0.6, flat: 1 });
      } else return false;
      return true;
    },
    // the Drowning builds
    enrage(sh, b, dur, H) {
      H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => H.wash(c, '#0a6a64', e.a * 0.5 * Math.min(1, t / dur), 'multiply') }));
      H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => {
        const q = Math.min(1, t / dur);
        c.save(); clipRoom(c);
        for (let i = 0; i < 4; i++) { const u = (t * 0.3 + i / 4) % 1; circle(c, 0, 0, H.AR * (1 - u) + 30, null, rgba('#b8fff6', 0.25 * u * e.a * q), 3); }
        c.restore();
      } }));
      H.own(sh, drownHands(H, dur, false, dur + 3));
    },
    enrageLand(b, H) {
      H.shockAt(b.x, b.y, { r: H.AR * 1.3, color: '#7ffff0', w: 14, dur: 0.8, flat: 1 });
      H.shockAt(b.x, b.y, { r: H.AR * 1.0, color: '#d8fff4', w: 8, dur: 0.9, flat: 1, delay: 0.12 });
      H.roomTint('#3affb0', 0.28, 0.9);
      drownHands(H, 1.2, true, 2.6);
      return true;
    },
  };
  window.HY_FX = HY_FX;

  const IMP = {
    // Mother's Cry: rings of thorned gold roll out across the water from her mouth
    cry(tg, ctx, H) {
      const b = (ctx && ctx.bossDraw) || { x: 0, y: 0 }, Rm = H.AR * 1.15;
      H.roomTint('#e8d890', 0.16, 0.7); H.shake(7);
      VFX.flash(b.x + 24, b.y - 24, 120, '#ffe9a8', 0.3);
      VFX.fx({ dur: 1.4, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipRoom(c); c.lineJoin = 'round';
        for (let i = 0; i < 3; i++) {
          const q = clamp((p - i * 0.1) / 0.72, 0, 1); if (q <= 0) continue;
          const r = 60 + easeOut(q) * Rm, k = e.a * (1 - q * q);
          ripple(c, b.x, b.y, r, 3, t * 6 + i);
          c.strokeStyle = rgba('#1a1204', 0.55 * k); c.lineWidth = 11; c.stroke(); c.strokeStyle = rgba('#ffd24a', k); c.lineWidth = 6; c.stroke(); c.strokeStyle = rgba('#fff6d0', k); c.lineWidth = 2; c.stroke();
          for (let j = 0; j < 56; j++) {
            const a = j * TAU / 56 + i * 0.07, len = 8 + 16 * hy(j, i + 3), w = 0.035;
            poly(c, [b.x + Math.cos(a - w) * r, b.y + Math.sin(a - w) * r, b.x + Math.cos(a) * (r + len), b.y + Math.sin(a) * (r + len), b.x + Math.cos(a + w) * r, b.y + Math.sin(a + w) * r], rgba('#ffd24a', 0.9 * k), rgba('#1a1204', 0.6 * k), 1);
          }
        }
        c.restore();
      } });
    },
    // the Submerge: the whirl closes on her and the water heaves up over the floor
    surge(tg, ctx, H) {
      const b = (ctx && ctx.bossDraw) || { x: 0, y: 0 }, Rm = H.AR * 1.1;
      H.roomTint('#4fd8cc', 0.22, 0.9); H.shake(9);
      VFX.fx({ dur: 1.0, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipRoom(c); c.lineJoin = 'round';
        const r = 40 + (1 - easeOut(p)) * Rm, k = e.a * (1 - p * 0.5);
        ripple(c, b.x, b.y, r, 4, t * 8); c.strokeStyle = rgba('#031a1c', 0.55 * k); c.lineWidth = 14; c.stroke(); c.strokeStyle = rgba('#7ff0e0', k); c.lineWidth = 7; c.stroke(); c.strokeStyle = rgba('#ffffff', k); c.lineWidth = 2; c.stroke();
        for (let j = 0; j < 48; j++) { const a = j * TAU / 48, len = 8 + 14 * hy(j, 5), w = 0.04; poly(c, [b.x + Math.cos(a - w) * r, b.y + Math.sin(a - w) * r, b.x + Math.cos(a) * (r - len), b.y + Math.sin(a) * (r - len), b.x + Math.cos(a + w) * r, b.y + Math.sin(a + w) * r], rgba('#eafffa', 0.9 * k), rgba('#031a1c', 0.5 * k), 1); }
        c.restore();
      }, done: () => { VFX.splash(b.x, b.y, { color: '#7ffff0', n: 20, speed: 1.6 }); H.shockAt(b.x, b.y, { r: 200, color: '#d8fff4', w: 8, dur: 0.6, flat: 1 }); } });
    },
    // Acid Spray: the spray tears down the cone in blobs of lime with an ink edge, white-hot at the mouth
    acid(tg, ctx, H) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      H.shapeFlash(s, '#b8f04a', { a: 0.3, dur: 0.5 });
      const blobs = Array.from({ length: 34 }, () => { const d = rnd(70, s.r * 0.97), a = s.angle + rnd(-0.5, 0.5) * s.arc * 0.92; return { x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, r: rnd(14, 30) * (0.6 + 0.8 * d / s.r), at: d / s.r * 0.2, ph: rnd(0, 6) }; });
      VFX.fx({ dur: 1.2, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipRoom(c);
        const k = e.a * Math.min(1, (1 - p) / 0.4), reach = s.r * easeOut(clamp(p / 0.22, 0, 1));
        // the body of the spray, filling the cone out from the mouth, lime thickening to a dark ink edge
        c.save(); SHAPES.trace(c, s); c.clip(); c.beginPath(); c.arc(s.x, s.y, reach, 0, TAU); c.clip();
        const gr = c.createRadialGradient(s.x, s.y, 10, s.x, s.y, s.r);
        gr.addColorStop(0, rgba('#f4ffd0', 0.9 * k)); gr.addColorStop(0.3, rgba('#b8ec2a', 0.78 * k)); gr.addColorStop(1, rgba('#5a9a14', 0.62 * k));
        c.fillStyle = gr; c.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); c.restore();
        c.save(); SHAPES.trace(c, s); c.lineJoin = 'round'; c.strokeStyle = rgba('#10280a', 0.55 * k); c.lineWidth = 7; c.stroke(); c.restore();
        for (const b of blobs) {
          const q = clamp((p - b.at) / 0.1, 0, 1); if (q <= 0) continue;
          const r = b.r * easeOut(q) * (1 + 0.06 * Math.sin(t * 9 + b.ph));
          ellipse(c, b.x, b.y, r * 1.2, r * 0.95, b.ph, rgba('#10280a', 0.8 * k)); ellipse(c, b.x, b.y, r, r * 0.8, b.ph, rgba('#a8e020', k));
          ellipse(c, b.x - r * 0.2, b.y - r * 0.2, r * 0.55, r * 0.4, b.ph, rgba('#e6ff70', 0.9 * k)); ellipse(c, b.x - r * 0.25, b.y - r * 0.25, r * 0.2, r * 0.14, b.ph, rgba('#ffffff', 0.9 * k));
        }
        c.restore();
        c.save(); c.globalCompositeOperation = 'lighter'; VFX.glowAt(c, s.x + ca * 60, s.y + sa * 60 - 16, 70 * (1 - p), '#f4ffc8', e.a * (1 - p) * 0.9); c.restore();
      } });
      for (const q of H.scatter(s, 14)) H.after(rnd(0, 0.35), () => VFX.splash(q.x, q.y, { color: '#a8e020', n: 5, speed: 0.9 }));
      H.shake(6);
    },
    // Tidal Line: a wave with a foam crest runs down the lane and breaks over the floor
    tide(tg, ctx, H) {
      const s = tg.live, L = Math.min(s.len, H.AR * 2.2), hw = s.w / 2;
      H.shapeFlash(s, '#7ffff0', { a: 0.24, dur: 0.5 });
      VFX.fx({ dur: 1.1, layer: 'ground', draw: (c, p, t, e) => {
        const front = easeOut(Math.min(1, p / 0.32)) * L, k = e.a * Math.min(1, (1 - p) / 0.5);
        c.save(); clipRoom(c); c.translate(s.x, s.y); c.rotate(s.angle); c.lineJoin = 'round'; c.lineCap = 'round';
        const g = c.createLinearGradient(0, 0, front, 0); g.addColorStop(0, rgba('#bff8f0', 0.6 * k)); g.addColorStop(1, rgba('#1aa6a0', 0.7 * k));
        c.fillStyle = g; c.fillRect(0, -hw, front, hw * 2);
        for (const sd of [-1, 1]) {
          c.beginPath();
          for (let x = 0; x <= front; x += 12) { const y = sd * (hw - 3 + (Math.floor(x / 12) % 2 ? -8 : 5) + Math.sin(x * 0.05 + t * 14) * 2); x ? c.lineTo(x, y) : c.moveTo(x, y); }
          c.strokeStyle = rgba('#0a3a46', 0.7 * k); c.lineWidth = 7; c.stroke(); c.strokeStyle = rgba('#f4ffff', k); c.lineWidth = 3.4; c.stroke();
        }
        for (let j = 0; j < 7; j++) {
          const x = front - j * 70; if (x < 0) break;
          c.beginPath(); for (let i = -4; i <= 4; i++) { const y = i * hw / 4.2, xx = x - 12 * Math.abs(i / 4) + Math.sin(i * 2 + t * 10 + j) * 4; i === -4 ? c.moveTo(xx, y) : c.lineTo(xx, y); }
          c.strokeStyle = rgba('#0a3a46', 0.6 * k * (1 - j / 8)); c.lineWidth = 8; c.stroke(); c.strokeStyle = rgba('#ffffff', k * (1 - j / 8)); c.lineWidth = j ? 2.4 : 4.4; c.stroke();
        }
        c.restore();
      } });
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      for (let d = 80; d < L; d += 110) H.after(d / L * 0.32, () => { for (const sd of [-1, 1]) VFX.splash(s.x + ca * d - sa * hw * sd, s.y + sa * d + ca * hw * sd, { color: '#e8fffc', n: 4, speed: 0.8 }); });
      H.shake(7);
    },
    // Venom Bloom: a violet lotus bursts open with its white-hot heart on the stack
    bloom(tg, ctx, H) {
      const s = tg.live, n = 11;
      H.shockAt(s.x, s.y, { r: s.r * 1.4, color: '#e0a0ff', w: 7, dur: 0.5, flat: 1 });
      H.shapeFlash(s, '#b060f0', { a: 0.32, dur: 0.6 });
      VFX.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, e) => {
        const grow = easeOut(Math.min(1, p / 0.22)), k = e.a * Math.min(1, (1 - p) / 0.4), L = s.r * 1.25 * grow;
        c.save(); c.lineJoin = 'round';
        const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.sin(a * TAU / n) - Math.sin(b * TAU / n));
        for (const ring of [1, 0.62]) for (const i of order) {
          const a = i * TAU / n + (ring < 1 ? TAU / n / 2 : 0), c0 = Math.cos(a), s0 = Math.sin(a), len = L * ring, w = len * 0.2;
          const tx = s.x + c0 * len * 0.9, ty = s.y + s0 * len * 0.55 - len * 0.5 * (ring < 1 ? 1.1 : 0.8) * grow, bx = s.x + c0 * 8, by = s.y + s0 * 5;
          const nx = -s0, ny = c0;
          c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo((bx + tx) / 2 + nx * w, (by + ty) / 2 + ny * w * 0.5 - 8, tx, ty); c.quadraticCurveTo((bx + tx) / 2 - nx * w, (by + ty) / 2 - ny * w * 0.5 - 8, bx, by); c.closePath();
          c.globalAlpha = k; c.fillStyle = ring < 1 ? '#c070ff' : '#8a30d0'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#1a0630'; c.stroke();
          c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.strokeStyle = rgba('#f0d0ff', 0.7 * k); c.lineWidth = 1.4; c.stroke();
        }
        VFX.glowAt(c, s.x, s.y - 14, s.r * 0.8, '#e8b8ff', 0.7 * k); VFX.glowAt(c, s.x, s.y - 14, s.r * 0.36, '#ffffff', 0.95 * k);
        c.restore();
      } });
      VFX.splash(s.x, s.y, { color: '#a050e0', n: 14, speed: 1.3 });
      VFX.smoke(s.x, s.y, { n: 4, color: '#3a1660', size: 34, a: 0.5, speed: 70 });
      H.shake(6);
    },
    // Flame Gout: a column of fire standing up on each hero
    gout(tg, ctx, H) {
      const s = tg.live, n = 8;
      H.shockAt(s.x, s.y, { r: s.r * 1.25, color: '#ffb060', w: 6, dur: 0.45, flat: 1 });
      H.shapeFlash(s, '#ff8a2a', { a: 0.36, dur: 0.5 });
      VFX.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, e) => {
        const grow = easeOut(Math.min(1, p / 0.2)), k = e.a * Math.min(1, (1 - p) / 0.45);
        c.save(); c.globalAlpha = k;
        for (let i = 0; i < n; i++) {
          const a = i * TAU / n + 0.3, d = s.r * (i ? 0.55 : 0.1), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d * 0.7 + 4, h = (70 + 50 * hy(i, 4)) * grow * (0.85 + 0.15 * Math.sin(t * 11 + i * 2)), w = 15 + 5 * hy(i, 5), sw = Math.sin(t * 8 + i) * 8;
          tongue(c, x, y, h, w * 1.15, sw, '#2a0a06'); tongue(c, x, y, h * 0.95, w, sw, '#ff5a14'); tongue(c, x, y, h * 0.72, w * 0.7, sw * 0.8, '#ff9a2a'); tongue(c, x, y, h * 0.42, w * 0.38, sw * 0.5, '#fff0b0');
        }
        VFX.glowAt(c, s.x, s.y - 20, s.r * 0.9, '#ff8a2a', 0.7 * k);
        c.restore();
      } });
      VFX.sparks(s.x, s.y, { color: '#ffd27a', n: 12, speed: 300 });
      H.shake(5);
    },
    // Rime Crown: the ring of ice goes up all at once, and stands a moment
    rime(tg, ctx, H) {
      const s = tg.live, n = 52, list = [];
      H.shapeFlash(s, '#bfe8ff', { a: 0.3, dur: 0.6 });
      H.shockAt(s.x, s.y, { r: s.r, color: '#e8f8ff', w: 8, dur: 0.6, flat: 1 });
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + rnd(-0.04, 0.04), band = i % 2 ? 0.74 : 0.36, d = s.r2 + (s.r - s.r2) * (band + rnd(-0.08, 0.08));
        list.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, h: rnd(34, 84), w: rnd(6, 11), lean: rnd(-0.22, 0.22), at: rnd(0, 0.12) });
      }
      list.sort((a, b) => a.y - b.y);
      spikeField(list, { dur: 2.6, sink: 0.9, fill: '#8cc8ee', hi: '#f4fcff', ink: '#0a2a4a' });
      for (const q of H.scatter(s, 12)) H.after(rnd(0, 0.3), () => VFX.sparks(q.x, q.y, { color: '#e8f8ff', n: 3, speed: 200 }));
      H.shake(7);
    },
    // Stormcall: bolts walk down every lane out of the dark, ink edged, white at the core, and leave the floor crackling
    storm(tg, ctx, H) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, H.AR * 2);
      H.shapeFlash(s, '#fff6a0', { a: 0.3, dur: 0.4 });
      const strikes = [];
      for (let d = 150; d < L; d += 190) strikes.push({ x: s.x + ca * d + rnd(-14, 14), y: s.y + sa * d + rnd(-14, 14), at: d / L * 0.18, seed: Math.random() * 99 });
      VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => {
        c.save(); clipRoom(c);
        for (const q of strikes) {
          const u = (p * 0.7 - q.at) / 0.22; if (u < 0 || u > 1) continue;
          const k = e.a * (1 - u) * (Math.random() < 0.85 ? 1 : 0.5), fl = Math.floor(t * 18) + q.seed;
          bolt(c, q.x + 24, q.y - 420, q.x, q.y, fl, '#ffe45a', 7, 28, k);
          bolt(c, q.x + 6, q.y - 190, q.x + 56, q.y - 60, fl + 3, '#ffe45a', 3.4, 12, k * 0.8);
          VFX.glowAt(c, q.x, q.y - 6, 70, '#ffe45a', 0.7 * k); VFX.glowAt(c, q.x, q.y - 6, 26, '#ffffff', k);
        }
        c.restore();
      } });
      for (const q of strikes) H.after(q.at, () => { VFX.sparks(q.x, q.y, { color: '#fff6a0', n: 8, speed: 280 }); H.shockAt(q.x, q.y, { r: 60, color: '#ffe45a', w: 4, dur: 0.3, flat: 1 }); });
      H.shake(8);
    },
    // Stonegaze: a grey flash over everything it could see (the shadows behind the columns left alone), shards of stone off its eye
    gaze(tg, ctx, H) {
      const s = tg.live, src = tg.cover || [s.x, s.y], sh = H.coverShadows(src[0], src[1], ctx && ctx.props);
      VFX.fx({ dur: 0.9, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipRoom(c); H.clipOut(c, sh);
        c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.34 * (1 - p) * (1 - p) * e.a; c.fillStyle = '#d8d4e4'; c.fillRect(-H.AR - 10, -H.AR - 10, H.AR * 2 + 20, H.AR * 2 + 20);
        c.globalCompositeOperation = 'source-over';
        c.lineWidth = 6; c.strokeStyle = rgba('#ffffff', (1 - p) * e.a * 0.7); c.beginPath(); c.arc(src[0], src[1], 60 + easeOut(p) * H.AR * 1.4, 0, TAU); c.stroke();
        c.restore();
      } });
      VFX.flash(src[0], src[1] - 24, 120, '#ffffff', 0.35);
      VFX.sparks(src[0], src[1], { color: '#e8e4f4', n: 10, speed: 260 });
      VFX.debris(src[0], src[1], { color: '#8a8898', n: 8, speed: 1.4, up: 1.1 });
      H.shake(9);
    },
    hgaze(tg, ctx, H) {
      const s = tg.live;
      H.roomTint('#d8d4e4', 0.24, 0.9);
      VFX.fx({ dur: 0.9, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipRoom(c); SHAPES.trace(c, s); c.clip();
        c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.3 * (1 - p) * e.a; c.fillStyle = '#e8e4f4'; c.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        c.globalCompositeOperation = 'source-over';
        c.lineWidth = 7; c.strokeStyle = rgba('#ffffff', (1 - p) * e.a * 0.8); c.beginPath(); c.arc(s.x, s.y, s.r * easeOut(p), 0, TAU); c.stroke();
        c.restore();
      } });
      VFX.flash(s.x, s.y - 10, 200, '#ffffff', 0.4);
      H.shockAt(s.x, s.y, { r: s.r, color: '#ffffff', w: 8, dur: 0.6, flat: 1 });
      H.shake(12);
    },
    // Mire Spit: spears of mud burst up under each hero
    mirespit(tg, ctx, H) {
      const s = tg.live, n = 8, list = [];
      H.shockAt(s.x, s.y, { r: s.r * 1.25, color: '#e8c878', w: 6, dur: 0.45, flat: 1 });
      for (let i = 0; i < n; i++) { const a = i * TAU / n + rnd(-0.2, 0.2), d = i ? s.r * rnd(0.45, 0.85) : s.r * 0.1; list.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d * 0.8, h: rnd(48, 96) * (i ? 1 : 1.3), w: rnd(9, 15), lean: rnd(-0.3, 0.3), at: 0 }); }
      list.sort((a, b) => a.y - b.y);
      spikeField(list, { dur: 1.1, sink: 0.6, fill: '#8a6a34', hi: '#c8a468', ink: '#2a1a08' });
      VFX.splash(s.x, s.y, { color: '#7a5a2a', n: 14, speed: 1.2 }); VFX.splash(s.x, s.y, { color: '#c8a468', n: 6, speed: 0.9 });
      H.shake(4);
    },
    // the searing ring at a column's foot: it is lit, whoever stands in it
    sear(tg, ctx, H) {
      const s = tg.live;
      H.shockAt(s.x, s.y, { r: s.r * 1.5, color: '#9fd0ff', w: 6, dur: 0.5, flat: 1 });
      VFX.pillar(s.x, s.y, { r: 30, h: 110, color: '#ffb060', dur: 0.6 });
      VFX.sparks(s.x, s.y, { color: '#ffd27a', n: 8, speed: 240 });
    },
    // a head breaking the surface
    rise(tg, ctx, H) {
      const s = tg.live;
      H.shockAt(s.x, s.y, { r: s.r * 1.3, color: '#a8f0e8', w: 8, dur: 0.55, flat: 1 });
      H.shockAt(s.x, s.y, { r: s.r * 0.8, color: '#ffffff', w: 4, dur: 0.4, flat: 1, delay: 0.08 });
      VFX.splash(s.x, s.y, { color: '#d8fff4', n: 18, speed: 1.4 });
      H.shake(6);
    },
    // the Heart beats twice, lub-dub: the second a little behind and a little smaller, and a gold pulse runs down nine veins to the columns
    heartbeat(tg, ctx, H) {
      H.roomTint('#ffd870', 0.3, 1.0);
      H.shockAt(0, 0, { r: H.AR * 1.1, color: '#ffe9a8', w: 10, dur: 0.8, flat: 1 });
      H.shake(12);
      H.after(0.26, () => { H.shockAt(0, 0, { r: H.AR * 0.9, color: '#fff2c0', w: 7, dur: 0.7, flat: 1 }); H.roomTint('#ffe9a8', 0.18, 0.6); H.shake(8); });
      VFX.fx({ dur: 1.5, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipRoom(c); c.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + i * TAU / 9, wob = Math.sin(i * 2.3) * 0.12, k = e.a * (1 - p * p);
          const reach = 400 * easeOut(clamp(p / 0.4, 0, 1)), q = clamp((p - 0.05) / 0.45, 0, 1);
          c.beginPath(); c.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); c.quadraticCurveTo(Math.cos(a + wob) * reach * 0.5, Math.sin(a + wob) * reach * 0.5, Math.cos(a) * reach, Math.sin(a) * reach);
          c.strokeStyle = rgba('#3a0a0a', 0.55 * k); c.lineWidth = 12; c.stroke(); c.strokeStyle = rgba('#ff5a3a', 0.8 * k); c.lineWidth = 5; c.stroke(); c.strokeStyle = rgba('#ffe9a8', k); c.lineWidth = 1.8; c.stroke();
          if (q < 1) glow(c, Math.cos(a + wob * 0.6) * 400 * q, Math.sin(a + wob * 0.6) * 400 * q, 26, '#fff2c0', 0.9 * k);
        }
        c.restore();
      } });
      VFX.flash(0, 0, 160, '#ffe9a8', 0.4);
    },
    // Tail Thrash: the tail comes round her once, a thick curl of scaled hide with a foam tip, and flings the water out in a ring
    thrash(tg, ctx, H) {
      const s = tg.live, b = { x: s.x, y: s.y }, a0 = Math.random() * TAU, dir = Math.random() < 0.5 ? 1 : -1;
      H.shapeFlash(s, '#9ff0b8', { a: 0.3, dur: 0.5 });
      H.shockAt(b.x, b.y, { r: s.r, color: '#c8ffd8', w: 10, dur: 0.55, flat: 1 });
      H.shockAt(b.x, b.y, { r: s.r * 1.35, color: '#7ffff0', w: 5, dur: 0.7, flat: 1, delay: 0.1 });
      VFX.fx({ dur: 0.62, layer: 'air', draw: (c, p, t, e) => {
        const lead = a0 + dir * easeOut(clamp(p / 0.5, 0, 1)) * TAU * 1.05, k = e.a * Math.min(1, (1 - p) / 0.3);
        c.save(); clipRoom(c); c.lineJoin = 'round';
        const N = 22, pts = [];
        for (let i = 0; i <= N; i++) { const q = i / N, a = lead - dir * q * 1.9, r = s.r * (0.9 - 0.18 * q); pts.push([b.x + Math.cos(a) * r, b.y + Math.sin(a) * r * 0.86, (1 - q) * 20 + 3]); }
        c.beginPath();
        pts.forEach(([x, y, w], i) => { const a = lead - dir * (i / N) * 1.9; (i ? c.lineTo : c.moveTo).call(c, x + Math.cos(a) * w * 0.4, y + Math.sin(a) * w * 0.4 - w * 0.2); });
        for (let i = N; i >= 0; i--) { const [x, y, w] = pts[i], a = lead - dir * (i / N) * 1.9; c.lineTo(x - Math.cos(a) * w * 0.4, y - Math.sin(a) * w * 0.4 + w * 0.2); }
        c.closePath(); c.globalAlpha = k; c.fillStyle = '#2f5a3a'; c.fill(); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
        c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y - 3) : c.moveTo(x, y - 3))); c.strokeStyle = rgba('#c8ffd8', 0.8 * k); c.lineWidth = 2; c.stroke();
        const tip = pts[0];
        VFX.glowAt(c, tip[0], tip[1] - 6, 46, '#e8fffc', 0.7 * k);
        c.restore();
      } });
      for (let j = 0; j < 14; j++) H.after(j * 0.028, () => { const a = a0 + dir * (j / 13) * TAU * 1.05; VFX.splash(b.x + Math.cos(a) * s.r * 0.9, b.y + Math.sin(a) * s.r * 0.8, { color: '#e8fffc', n: 4, speed: 1.1 }); });
      H.shake(9);
    },
    // Undertow: the water she threw out is dragged back in: foam runs inward across the ring and the rim of the first blow draws shut
    undertow(tg, ctx, H) {
      const s = tg.live;
      H.shapeFlash(s, '#7ffff0', { a: 0.3, dur: 0.5 });
      VFX.fx({ dur: 0.95, layer: 'ground', draw: (c, p, t, e) => {
        c.save(); clipRoom(c); SHAPES.trace(c, s); c.clip('evenodd'); c.lineJoin = 'round';
        for (let i = 0; i < 3; i++) {
          const q = clamp((p - i * 0.1) / 0.55, 0, 1); if (q <= 0) continue;
          const r = s.r - (s.r - s.r2) * easeOut(q) + 6, k = e.a * (1 - q * q) * Math.min(1, (1 - p) / 0.3);
          ripple(c, s.x, s.y, r, 3, t * 9 + i);
          c.strokeStyle = rgba('#031a1c', 0.5 * k); c.lineWidth = 11; c.stroke(); c.strokeStyle = rgba('#7ff0e0', k); c.lineWidth = 6; c.stroke(); c.strokeStyle = rgba('#ffffff', k); c.lineWidth = 2; c.stroke();
        }
        for (let j = 0; j < 36; j++) {
          const a = j * TAU / 36 + hy(j, 2) * 0.1, q = clamp((p - hy(j, 4) * 0.2) / 0.55, 0, 1), r = s.r - (s.r - s.r2) * easeOut(q), len = 10 + 16 * hy(j, 6), k = e.a * (1 - q) * Math.min(1, (1 - p) / 0.3);
          if (q <= 0) continue;
          line(c, s.x + Math.cos(a) * (r + len), s.y + Math.sin(a) * (r + len), s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, rgba('#f4ffff', 0.9 * k), 2.4);
        }
        c.restore();
      } });
      for (const q of H.scatter(s, 10)) H.after(rnd(0, 0.3), () => VFX.splash(q.x, q.y, { color: '#d8fff4', n: 4, speed: 0.9 }));
      H.shockAt(s.x, s.y, { r: s.r2 * 0.9, color: '#d8fff4', w: 7, dur: 0.5, flat: 1, delay: 0.25 });
      H.shake(8);
    },
    // Rending Maul: both jaws snap shut on her and the claws rake the stone
    buster(tg, ctx, H) {
      const s = tg.live, e = tg.target != null ? ctx.entById(tg.target) : null;
      const x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
      H.shapeFlash(s, '#ff4a3a', { a: 0.28 });
      VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e2) => {
        const close = easeOut(Math.min(1, p / 0.2)), k = e2.a * Math.min(1, (1 - p) / 0.4);
        c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha = k;
        for (const sd of [-1, 1]) {
          const a = s.angle + sd * 1.0, D = 24 + (1 - close) * 130, cx = x + Math.cos(a) * D, cy = y + Math.sin(a) * D * 0.7 - 10;
          const toward = Math.atan2(y - cy, x - cx), px = Math.cos(toward + Math.PI / 2), py = Math.sin(toward + Math.PI / 2), tx = Math.cos(toward), ty = Math.sin(toward);
          ellipse(c, cx - tx * 8, cy - ty * 8, 18, 58, toward, rgba('#7a1018', 0.85), '#2a0408', 2.4);
          for (let i = -4; i <= 4; i++) {
            const bx = cx + px * i * 13, by = cy + py * i * 13, len = 30 - Math.abs(i) * 2.6;
            poly(c, [bx - px * 6, by - py * 6, bx + tx * len, by + ty * len, bx + px * 6, by + py * 6], '#f4eed8', '#2a0408', 1.6);
          }
        }
        // three claw rakes through her, red with a white edge
        if (p > 0.15) for (let i = -1; i <= 1; i++) {
          const u = clamp((p - 0.15) / 0.2, 0, 1), sx = x + i * 26 - 40, sy = y - 62;
          c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 80 * u, sy + 100 * u);
          c.strokeStyle = rgba('#2a0408', 0.7 * k); c.lineWidth = 9; c.stroke(); c.strokeStyle = rgba('#ff2a3a', k); c.lineWidth = 5; c.stroke(); c.strokeStyle = rgba('#ffffff', k); c.lineWidth = 1.6; c.stroke();
        }
        VFX.glowAt(c, x, y - 12, 60 * (1 - p), '#ff3a4a', 0.7 * k);
        c.restore();
      } });
      VFX.hit(x, y, '#ff4a3a', 2.3);
      VFX.splash(x, y, { color: '#8a1018', n: 12, speed: 1.2 });
      VFX.debris(x, y, { color: '#4a5a52', n: 8, speed: 1.2 });
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      for (let i = -1; i <= 1; i++) H.AFT.gouge(x - sa * i * 22 - ca * 40, y + ca * i * 22 - sa * 40, x - sa * i * 22 + ca * 60, y + ca * i * 22 + sa * 60, { w: 17, dur: 8, heat: '#ff2a2a', lip: '#2a1010', ember: '#ff9a8a', heatT: 3 });
      H.shake(9);
    },
  };

  // ---------------------------------------------------------------------- what stays on the floor for a few seconds (boss-tells.js AFTERMATH)
  if (window.HY_BT) {
    const { AFTERMATH, mark, AFTER } = window.HY_BT;
    AFTERMATH.hydra = {
      // Mother's Cry: the rings she rang fade away across the water, dashed
      cry(tg, env) {
        const b = env.boss || { x: 0, y: 0 };
        mark(AFTER.tier.brief, { x: b.x, y: b.y }, (ctx, s, k, age) => {
          ctx.setLineDash([5, 12]);
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s.x, s.y, 150 + i * 120 + age * 6, 0, TAU); ctx.strokeStyle = rgba('#e8c45a', k * 0.5); ctx.lineWidth = 2; ctx.stroke(); }
          ctx.setLineDash([]);
        }, tg.id);
      },
      surge(tg, env) {
        const b = env.boss || { x: 0, y: 0 };
        mark(AFTER.tier.brief, { x: b.x, y: b.y }, (ctx, s, k, age) => { for (let i = 0; i < 3; i++) { const q = (age * 0.4 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, 80 + q * 420, 0, TAU); ctx.strokeStyle = rgba('#b8fff6', k * 0.6 * (1 - q)); ctx.lineWidth = 3; ctx.stroke(); } }, tg.id);
      },
      // Tidal Line: the wet streaks and scattered foam the wave leaves down its lane
      tide(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          lane(ctx, s, (L, hw) => {
            ctx.fillStyle = rgba('#03242a', k * 0.28); ctx.fillRect(0, -hw, L, hw * 2);
            ctx.lineCap = 'round';
            for (let i = 0; i < 5; i++) {
              const y = (hy(i, seed) - 0.5) * hw * 1.6, x0 = hy(i, seed + 2) * L * 0.3, x1 = x0 + L * (0.4 + 0.4 * hy(i, seed + 3));
              ctx.beginPath(); for (let x = x0; x <= x1; x += 24) { const yy = y + Math.sin(x * 0.04 + i + age) * 5; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
              ctx.strokeStyle = rgba('#e8fffc', k * 0.7); ctx.lineWidth = 2; ctx.stroke();
            }
            for (let i = 0; i < 26; i++) circle(ctx, hy(i, seed + 5) * L, (hy(i, seed + 6) - 0.5) * hw * 1.9, 1.6 + 2 * hy(i, seed + 7), rgba('#f4ffff', k * 0.7));
          });
        }, tg.id);
      },
      // Venom Bloom: the lotus lies printed in dark violet on the floor
      bloom(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          for (let i = 0; i < 8; i++) {
            const a = i * TAU / 8 + 0.2, c0 = Math.cos(a), s0 = Math.sin(a), len = s.r * 1.1, w = len * 0.2;
            ctx.beginPath(); ctx.moveTo(s.x + c0 * 8, s.y + s0 * 8); ctx.quadraticCurveTo(s.x + c0 * len * 0.5 - s0 * w, s.y + s0 * len * 0.5 + c0 * w, s.x + c0 * len, s.y + s0 * len); ctx.quadraticCurveTo(s.x + c0 * len * 0.5 + s0 * w, s.y + s0 * len * 0.5 - c0 * w, s.x + c0 * 8, s.y + s0 * 8);
            ctx.fillStyle = rgba('#2a0e44', k * 0.5); ctx.fill(); ctx.strokeStyle = rgba('#a050e0', k * 0.8); ctx.lineWidth = 1.6; ctx.stroke();
          }
        }, tg.id);
      },
      // Stormcall: the lane is cracked, the cracks glowing yellow while they cool
      storm(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          const heat = Math.max(0, 1 - age / 2.6);
          lane(ctx, s, (L, hw) => {
            ctx.lineJoin = 'round';
            for (let b = 0; b < 3; b++) {
              ctx.beginPath(); for (let d = 0; d <= L; d += 40) { const y = (hy(Math.floor(d / 40), seed + b) - 0.5) * hw * 1.5; d ? ctx.lineTo(d, y) : ctx.moveTo(d, y); }
              ctx.strokeStyle = rgba('#06100c', k * 0.9); ctx.lineWidth = 3.4; ctx.stroke();
              if (heat > 0) { ctx.strokeStyle = rgba('#ffe45a', k * heat); ctx.lineWidth = 1.6; ctx.stroke(); }
            }
          });
        }, tg.id);
      },
      // the ring at a column's foot is scorched where the stump was seared
      sear(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          glow(ctx, s.x, s.y, s.r * 1.1, '#0a0604', 0.4 * k);
          const heat = Math.max(0, 1 - age / 2.5);
          for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + seed, d = s.r * (0.3 + 0.5 * hy(i, seed)); circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 2.4, rgba('#ff7a1a', k * heat * (0.5 + 0.5 * Math.sin(age * 6 + i)))); }
        }, tg.id);
      },
      rise(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age) => {
          ellipse(ctx, s.x, s.y, s.r * 0.5, s.r * 0.4, 0, rgba('#021412', k * 0.6));
          for (let i = 0; i < 2; i++) { const q = (age * 0.5 + i / 2) % 1; ellipse(ctx, s.x, s.y, s.r * (0.5 + q * 0.7), s.r * (0.5 + q * 0.7) * 0.8, 0, null, rgba('#d8fff4', k * (1 - q)), 2); }
        }, tg.id);
      },
    };
  }
})();
