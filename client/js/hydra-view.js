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
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85); ctx.lineWidth = 2.5; ctx.stroke();
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
        g.addColorStop(0, rgba('#3ac8b0', 0.28 * k)); g.addColorStop(1, rgba('#0a5a58', 0.4 * k));
        ctx.fillStyle = g; ctx.fillRect(-R - 40, -R - 40, R * 2 + 80, R * 2 + 80);
        for (let i = 0; i < 26; i++) {
          const a = hy(i, 3) * TAU, d = Math.sqrt(hy(i, 4)) * R, q = (t * 0.35 + hy(i, 5)) % 1, x = Math.cos(a) * d, y = Math.sin(a) * d;
          ellipse(ctx, x, y, 14 + q * 40, (14 + q * 40) * 0.5, 0, null, rgba('#d8fff4', 0.4 * (1 - q) * k), 1.6);
        }
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

  // ---------------------------------------------------------------------- how her telegraphs are dressed (boss-tells.js get())
  window.HY_TELLS = {
    // Acid Spray: lime spray thickening toward the cone's edge, bubbling
    acid: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      const fr = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
      fr.addColorStop(0, rgba('#e8ffb0', (0.2 + 0.35 * p) * k)); fr.addColorStop(1, rgba('#7ab020', (0.05 + 0.2 * p) * k));
      ctx.fillStyle = fr; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 20; i++) { const a = s.angle + (hy(i, tg.id) - 0.5) * s.arc * 0.9, d = 80 + hy(i, tg.id + 1) * (s.r - 100), q = (t * 0.7 + hy(i, 2)) % 1; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 12, 3 + 4 * q, null, rgba('#d8ff70', 0.7 * (1 - q) * k * (0.3 + p)), 1.6); }
      ctx.restore();
    } },
    // Tidal Line: waves running down the lane
    tide: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      ctx.fillStyle = rgba('#0f6a66', (0.14 + 0.22 * p) * k); ctx.fillRect(s.x - s.len, s.y - s.len, s.len * 2, s.len * 2);
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      for (let i = 0; i < 18; i++) {
        const d = ((i / 18) * s.len + t * (140 + 160 * p)) % s.len;
        ctx.beginPath();
        for (let j = -4; j <= 4; j++) { const off = j * s.w / 9, x = s.x + ca * d - sa * off, y = s.y + sa * d + ca * off + 0; const dd = d + Math.sin(j * 1.3 + t * 5 + i) * 7; const px = s.x + ca * dd - sa * off, py = s.y + sa * dd + ca * off; j === -4 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); void x; void y; }
        ctx.strokeStyle = rgba('#b8fff6', (0.5 * (1 - d / s.len) + 0.1) * k * (0.3 + p)); ctx.lineWidth = 2.4; ctx.stroke();
      }
      ctx.restore();
    } },
    // Rime Crown: frost crawling across the ring
    rime: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip('evenodd');
      ctx.fillStyle = rgba('#bfe8ff', (0.1 + 0.2 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      for (let i = 0; i < 40; i++) { const a = hy(i, 7) * TAU, d = s.r2 + (hy(i, 8)) * (s.r - s.r2), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d; const L = 8 + 10 * p; for (let b = 0; b < 3; b++) line(ctx, x, y, x + Math.cos(a + b * 2.09 + 0.4) * L, y + Math.sin(a + b * 2.09 + 0.4) * L, rgba('#f0fbff', 0.5 * k * (0.3 + p)), 1.6); }
      ctx.restore();
    } },
    // Stormcall: crackling lanes
    storm: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      ctx.fillStyle = rgba('#3a3410', (0.14 + 0.2 * p) * k); ctx.fillRect(s.x - s.len, s.y - s.len, s.len * 2, s.len * 2);
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      for (let b = 0; b < 2; b++) {
        ctx.beginPath();
        for (let d = 0; d <= s.len; d += 36) { const off = (hy(Math.floor(d / 36) + Math.floor(t * 9), b + tg.id) - 0.5) * s.w * 0.7; const x = s.x + ca * d - sa * off, y = s.y + sa * d + ca * off; d ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = rgba('#fff6a0', (0.25 + 0.5 * p) * k); ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    } },
    // Stonegaze: a pale veil over everything the head can see, rays running out from its eye
    gaze: { ground(ctx, tg, s, p, k, t) {
      const R = ARENA.R, [sx, sy] = tg.cover || [s.x, s.y];
      ctx.save(); ctx.fillStyle = rgba('#d8d4e4', (0.06 + 0.16 * p) * k); ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160);
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + t * 0.15, d0 = 60 + 40 * p; line(ctx, sx + Math.cos(a) * d0, sy + Math.sin(a) * d0, sx + Math.cos(a) * R * 2, sy + Math.sin(a) * R * 2, rgba('#ffffff', (0.05 + 0.14 * p) * k), 6); }
      glow(ctx, sx, sy, 90 + 60 * p, '#ffffff', (0.2 + 0.4 * p) * k);
      ctx.restore();
    } },
    // Hydra's Gaze (Hard): the whole inside of the temple under one pale eye
    hgaze: { ground(ctx, tg, s, p, k, t) {
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      ctx.fillStyle = rgba('#d8d4e4', (0.12 + 0.2 * p) * k); ctx.fillRect(-ARENA.R * 2, -ARENA.R * 2, ARENA.R * 4, ARENA.R * 4);
      for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * q, null, rgba('#ffffff', 0.4 * (1 - q) * k * (0.4 + p)), 3); }
      glow(ctx, s.x, s.y, 130, '#ffffff', (0.15 + 0.4 * p) * k);
      ctx.restore();
    } },
    // a head coming up out of the water
    rise: { ground(ctx, tg, s, p, k, t) {
      glow(ctx, s.x, s.y, s.r * 1.2, '#4fd8cc', (0.14 + 0.4 * p) * k);
      for (let i = 0; i < 3; i++) { const q = (t * 1.2 + i / 3) % 1; ellipse(ctx, s.x, s.y, s.r * q, s.r * q * 0.6, 0, null, rgba('#d8fff4', 0.5 * (1 - q) * k * (0.3 + p)), 2); }
    } },
    // Mother's Cry: the temple rings; the water shivers
    cry: { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
      const R = ARENA.R, b = env.boss;
      ctx.save(); ctx.fillStyle = `rgba(30,24,4,${(0.06 + 0.2 * p * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
      for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ellipse(ctx, b.x, b.y, 70 + q * R, (70 + q * R) * 0.9, 0, null, rgba('#ffe9a8', 0.28 * (1 - q) * k * (0.4 + 0.6 * p)), 3); }
    } },
    // Submerge: the water rises
    surge: { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
      const R = ARENA.R;
      ctx.save(); ctx.fillStyle = `rgba(10,80,76,${(0.06 + 0.22 * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
      for (let i = 0; i < 4; i++) { const q = (t * 0.5 + i / 4) % 1; circle(ctx, 0, 0, R * (1 - q), null, rgba('#b8fff6', 0.3 * q * k * (0.4 + p)), 3); }
    } },
    // the Heart beating
    heartbeat: { raidwide: true, ground(ctx, tg, s, p, k, t) {
      const R = ARENA.R;
      ctx.save(); ctx.fillStyle = `rgba(60,40,0,${(0.06 + 0.22 * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
      glow(ctx, 0, 0, 120 + 200 * p, '#ffd870', (0.2 + 0.3 * p) * k * (0.7 + 0.3 * Math.sin(t * 9)));
    } },
  };
})();
