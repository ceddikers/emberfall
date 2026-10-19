// Boss "tells": each mechanic shows up as something in the world instead of a colored shape on the floor.
// Grubnak's kitchen throws meat, drops cloches, shakes spice jars, heats the stove coils and swings a ghost
// cleaver; Skitterra's web strikes with legs, creeps in as fog and reels you in on silk.
// On Normal a faint dashed outline still marks the exact area, so it's fair; Hard hides some mechanics
// entirely (they only show on the boss), same as before.
//
// Every tell gets (ctx, tg, s, p, k, t, env): s = the live shape, p = 0..1 progress to impact,
// k = fade-in, env = { boss: the boss's drawn position/facing, bossId, entById, hard }.

const BossTells = (() => {
  const AR = () => ARENA.R;   // far enough to reach every wall of the room
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const easeIn = p => p * p;
  const lerpColor = (a, b, q) => {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join('');
  };
  // soft dark shadow on the floor (for things about to land)
  function shadow(ctx, x, y, r, a) {
    if (r <= 0 || a <= 0) return;
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(10,5,2,${a})`); g.addColorStop(0.75, `rgba(10,5,2,${a * 0.7})`); g.addColorStop(1, 'rgba(10,5,2,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.92, 0, 0, TAU); ctx.fill();
  }
  // the fair-play outline (Normal only draws it; Hard keeps the art and drops the outline on hidden mechs)
  function outline(ctx, s, p, k, t, color) {
    const late = Math.max(0, (p - 0.8) / 0.2);
    ctx.save();
    SHAPES.trace(ctx, s);
    ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 24;
    ctx.strokeStyle = rgba(color, (0.3 + 0.55 * late) * k); ctx.lineWidth = 2 + late * 1.5; ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ Grubnak
  // a slab of meat on a hook (Meat Toss)
  function steak(ctx, x, y, rot, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ellipse(ctx, 0, 0, 22, 15, 0.2, '#9a3a2a', OUT, 2.5);
    ellipse(ctx, -4, -3, 14, 8, 0.2, '#c25a44');
    for (const [fx, fy] of [[-8, 2], [3, -5], [8, 4]]) ellipse(ctx, fx, fy, 4, 1.6, 0.6, '#f0d8c0');
    rrect(ctx, 16, -3, 14, 6, 3, '#efe6cf', OUT, 1.5); circle(ctx, 31, -3, 3.5, '#efe6cf', OUT, 1.2); circle(ctx, 31, 3, 3.5, '#efe6cf', OUT, 1.2);
    ctx.restore();
  }
  // silver cloche (Family Meal / Order Up!)
  function cloche(ctx, x, y, r, a, glass) {
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y);
    g.addColorStop(0, glass ? 'rgba(230,240,250,0.35)' : '#f4f7fa'); g.addColorStop(0.5, glass ? 'rgba(200,215,230,0.2)' : '#b8c2cc'); g.addColorStop(1, glass ? 'rgba(160,175,190,0.3)' : '#7e8a96');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.18, r * 0.32, -0.5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    rrect(ctx, x - r * 1.08, y - 3, r * 2.16, 7, 3, '#d8b45a', OUT, 2);
    circle(ctx, x, y - r * 0.8 - 6, 6, '#d8dee4', OUT, 2);
    ctx.restore();
  }
  // spice jar: salt, pepper or paprika by mech id
  const JARS = [{ body: '#f4f2ea', dust: '#ffffff', lid: '#b8c0c8' }, { body: '#3a3230', dust: '#5a4e48', lid: '#8a7a6a' }, { body: '#d0482a', dust: '#ff6a3a', lid: '#e8c15a' }];
  function jar(ctx, x, y, kind, rot) {
    const j = JARS[kind];
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    rrect(ctx, -11, -14, 22, 30, 5, j.body, OUT, 2.5);
    rrect(ctx, -12, -20, 24, 8, 3, j.lid, OUT, 2);
    for (let i = -1; i <= 1; i++) circle(ctx, i * 6, -16, 1.5, OUT);
    rrect(ctx, -11, -3, 22, 9, 1, 'rgba(240,226,190,0.9)');
    ctx.restore();
  }

  const G = {
    // Mince: a ghostly cleaver the size of the room hangs over the doomed half and its shadow deepens
    mince: {
      color: '#ffb08a',
      ground(ctx, tg, s, p, k) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        const g = ctx.createLinearGradient(s.x, s.y, s.x + ca * 760, s.y + sa * 760);
        g.addColorStop(0, `rgba(25,8,4,${(0.32 + 0.32 * p) * k})`); g.addColorStop(0.55, `rgba(25,8,4,${(0.12 + 0.22 * p) * k})`); g.addColorStop(1, 'rgba(25,8,4,0.02)');
        ctx.fillStyle = g; ctx.fillRect(-AR() - 80, -AR() - 80, AR() * 2 + 160, AR() * 2 + 160);
        ctx.restore();
      },
      air(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), px = -sa, py = ca;
        const lift = (1 - easeIn(p)) * 150 + 10, L = 300, W = 150;
        const off = 16 + (1 - p) * 50;   // hangs over the doomed side, edge toward the boss line
        const P = (u, v) => [s.x + px * u + ca * v, s.y + py * u + sa * v - lift];
        const a = (0.3 + 0.5 * p) * k;
        ctx.save(); ctx.globalAlpha = a;
        // a cleaver: a big slab with a rounded back corner, a hanging hole, and a wooden handle off one end
        const e1 = P(-L, off), e2 = P(L, off), b2 = P(L, off + W), b1 = P(-L + 40, off + W), c1 = P(-L, off + W - 40);
        ctx.beginPath(); ctx.moveTo(...e1); ctx.lineTo(...e2); ctx.lineTo(...b2); ctx.lineTo(...b1); ctx.lineTo(...c1); ctx.closePath();
        const g = ctx.createLinearGradient(e1[0], e1[1], P(-L, off + W)[0], P(-L, off + W)[1]);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, '#e6eaee'); g.addColorStop(1, '#8a939e');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.stroke();
        const h1 = P(L, off + W * 0.35), h2 = P(L + 170, off + W * 0.35);
        ctx.lineCap = 'round';
        ctx.strokeStyle = OUT; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(...h1); ctx.lineTo(...h2); ctx.stroke();
        ctx.strokeStyle = '#7a4e2a'; ctx.lineWidth = 27; ctx.stroke();
        for (const u of [0.3, 0.7]) { const r = P(L + 170 * u, off + W * 0.35); circle(ctx, r[0], r[1], 5, '#d8dee4', OUT, 1.5); }
        const hole = P(-L * 0.62, off + W * 0.62); circle(ctx, hole[0], hole[1], 16, '#2a2622', OUT, 2);
        ctx.globalAlpha = 1;
        // a glint racing along the edge, faster near the chop
        const q = (t * (0.8 + p * 2.5)) % 1, gp = P(-L + q * 2 * L, off);
        glow(ctx, gp[0], gp[1], 26, '#ffffff', a * 1.2);
        ctx.restore();
      },
    },
    // Ladle Spin: the soup in the pot swirls in a ring around him
    ladle: {
      color: '#ffc070',
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.clip();
        ctx.fillStyle = rgba('#b8742a', (0.12 + 0.16 * p) * k); ctx.fill();
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          for (let q = 0; q <= 1; q += 0.05) { const a = t * (2 + p * 5) + i * TAU / 5 + q * 3, rr = s.r * (0.2 + q * 0.8); const x = s.x + Math.cos(a) * rr, y = s.y + Math.sin(a) * rr; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.strokeStyle = rgba('#f0b060', 0.4 * k); ctx.lineWidth = 6; ctx.stroke();
        }
        for (let i = 0; i < 12; i++) { const a = t * 3 + i * TAU / 12; circle(ctx, s.x + Math.cos(a) * s.r * 0.88, s.y + Math.sin(a) * s.r * 0.88, 3 + hash(i) * 3, rgba('#ffe0b0', 0.7 * k)); }
        ctx.restore();
        ctx.save(); ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 60;
        circle(ctx, s.x, s.y, s.r - 3, null, rgba('#fff2d8', (0.45 + 0.4 * p) * k), 4);
        ctx.restore();
      },
    },
    // Lid Slam: the lid's shadow is the only safe floor; outside it, the tiles shiver
    lid: {
      color: '#cfe0ff',
      ground(ctx, tg, s, p, k, t) {
        const r2 = s.r2;
        for (let i = 0; i < 5; i++) {
          const q = (t * (0.5 + p) + i / 5) % 1, rr = r2 + 10 + q * (AR() * 1.1 - r2);
          circle(ctx, s.x, s.y, rr, null, rgba('#dbe6f4', 0.28 * (1 - q) * k), 2 + 2 * p);
        }
        shadow(ctx, s.x, s.y, r2 * (0.75 + 0.25 * easeIn(p)), (0.3 + 0.25 * p) * k);
        circle(ctx, s.x, s.y, r2, null, rgba('#e8eef6', (0.45 + 0.45 * p) * k), 3);
        for (let i = 0; i < 3; i++) { const a = t * 0.8 + i * 2.1; glow(ctx, s.x + Math.cos(a) * r2, s.y + Math.sin(a) * r2, 14, '#ffffff', 0.6 * k); }
      },
    },
    // Meat Toss: a slab of meat hangs over each target; its shadow grows until it drops
    spread: {
      color: '#e0a0ff',
      ground(ctx, tg, s, p, k) { shadow(ctx, s.x, s.y, s.r * (0.35 + 0.65 * p), (0.25 + 0.35 * p) * k); },
      air(ctx, tg, s, p, k, t) {
        const h = 160 * (1 - easeIn(p)) + 30;
        ctx.save(); ctx.globalAlpha = k;
        line(ctx, s.x, s.y - h - 200, s.x, s.y - h - 14, 'rgba(200,190,170,0.5)', 1.5);   // the hook's chain from above
        steak(ctx, s.x, s.y - h, Math.sin(t * 2 + tg.id) * 0.3 + p * 3, 1.2);
        ctx.restore();
      },
    },
    // Family Meal: a huge silver cloche comes down over the target; get under it together
    stack: {
      color: '#ffe27a',
      ground(ctx, tg, s, p, k, t) {
        shadow(ctx, s.x, s.y, s.r * (0.5 + 0.5 * p), (0.25 + 0.3 * p) * k);
        ctx.save(); ctx.setLineDash([8, 8]); ctx.lineDashOffset = t * 20;
        circle(ctx, s.x, s.y, s.r, null, rgba('#ffd84a', (0.5 + 0.4 * p) * k), 2.5);
        ctx.restore();
        const need = Math.max(1, tg.need || 1);
        for (let i = 0; i < need; i++) { const a = -Math.PI / 2 + (i - (need - 1) / 2) * 0.42; circle(ctx, s.x + Math.cos(a) * (s.r + 14), s.y + Math.sin(a) * (s.r + 14), 6, rgba('#fff6d8', k), OUT, 1.5); }
      },
      air(ctx, tg, s, p, k) { cloche(ctx, s.x, s.y - 230 * (1 - easeIn(p)), s.r * 0.8, k * (0.55 + 0.45 * p), false); },
    },
    // Order Up!: a plate on the floor for each guest, under a glass cloche that lifts when it's served
    plate: {
      color: '#a8fff2',
      outline: false,
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); ctx.globalAlpha = k;
        circle(ctx, s.x, s.y, s.r, '#f6f3ea', OUT, 3);
        circle(ctx, s.x, s.y, s.r * 0.72, null, '#d8d2c2', 2);
        ctx.setLineDash([6, 7]); circle(ctx, s.x, s.y, s.r * 0.88, null, '#5a7ac8', 3); ctx.setLineDash([]);
        // the rim fills with gold as the order comes up
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.strokeStyle = '#e8c15a'; ctx.lineWidth = 4; ctx.stroke();
        const need = Math.max(1, tg.need || 1);
        for (let i = 0; i < need; i++) circle(ctx, s.x + (i - (need - 1) / 2) * 14, s.y - s.r - 14, 5, '#e8fffa', OUT, 1.5);
        ctx.restore();
      },
      air(ctx, tg, s, p, k, t) {
        for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3 + tg.id * 0.1) % 1; circle(ctx, s.x + (i - 1) * 14 + Math.sin(t * 2 + i) * 5, s.y - 30 - q * 60, 6 + q * 8, `rgba(240,240,240,${0.35 * (1 - q) * k})`); }
        cloche(ctx, s.x, s.y - 4, s.r * 0.78, 0.9 * k, true);
      },
    },
    // Spice Rack: jars spin overhead, shake out spice and drop
    spice: {
      color: '#ff9a6a',
      ground(ctx, tg, s, p, k) {
        const kind = tg.id % 3, j = JARS[kind];
        shadow(ctx, s.x, s.y, s.r * (0.3 + 0.7 * p), (0.22 + 0.3 * p) * k);
        for (let i = 0; i < 40; i++) {
          if (hash(tg.id, i) > p) continue;
          const a = hash(i, tg.id) * TAU, d = Math.sqrt(hash(i + 7, tg.id)) * s.r;
          circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 1.6 + hash(i, 3) * 1.6, rgba(j.dust, 0.75 * k));
        }
      },
      air(ctx, tg, s, p, k, t) {
        const kind = tg.id % 3, h = 170 * (1 - easeIn(p)) + 26;
        ctx.save(); ctx.globalAlpha = k;
        for (let i = 0; i < 6; i++) { const q = (t * 2 + i / 6) % 1; circle(ctx, s.x + Math.sin(i * 3 + t * 4) * 8, s.y - h + 20 + q * (h - 20), 1.8, rgba(JARS[kind].dust, 0.8 * (1 - q))); }
        jar(ctx, s.x, s.y - h, kind, Math.PI + Math.sin(t * 18) * 0.25 * (0.3 + p));
        ctx.restore();
      },
    },
    // Whisk: a giant whisk turns over the kitchen; its wires are the danger
    whisk: {
      color: '#fff2cf',
      ground(ctx, tg, s, p, k) { ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#fff2cf', 0.05 * k); ctx.fill(); ctx.restore(); },
      air(ctx, tg, s, p, k, t) {
        const L = Math.min(s.len, AR() + 40), a = (0.2 + 0.6 * p) * k;
        ctx.save(); ARENA.trace(ctx, 10); ctx.clip();   // the wires stop at the walls
        for (let arm = 0; arm < 4; arm++) {
          const ang = s.angle + arm * Math.PI / 2;
          ctx.save(); ctx.translate(s.x, s.y - 14); ctx.rotate(ang);
          for (const f of [0.18, 0.32, 0.46]) {
            ctx.beginPath(); ctx.ellipse(L / 2, 0, L / 2, s.w * f, 0, 0, TAU);
            ctx.strokeStyle = rgba('#0a0806', a * 0.6); ctx.lineWidth = 5; ctx.stroke();
            ctx.strokeStyle = rgba('#e8eef4', a); ctx.lineWidth = 2.5; ctx.stroke();
          }
          const q = (t * 1.5 + arm * 0.25) % 1;
          glow(ctx, q * L, Math.sin(q * Math.PI) * s.w * 0.32, 18, '#ffffff', a);
          ctx.restore();
        }
        ctx.restore();
        circle(ctx, s.x, s.y - 14, 14, rgba('#c8ced6', k), OUT, 2.5);
      },
    },
    // Boil Over: the floor bubbles, hottest close to the pot
    boil: {
      color: '#ff9a5a',
      outline: false,
      ground(ctx, tg, s, p, k, t) {
        const max = 760;
        const g = ctx.createRadialGradient(s.x, s.y, 30, s.x, s.y, max);
        g.addColorStop(0, rgba('#ff5a1a', (0.2 + 0.25 * p) * k)); g.addColorStop(0.5, rgba('#ff8a3a', 0.08 * k)); g.addColorStop(1, 'rgba(255,138,58,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, max, 0, TAU); ctx.fill();
        for (let i = 0; i < 70; i++) {
          const a = hash(i, 1) * TAU, d = 40 + Math.sqrt(hash(i, 2)) * 680, f = Math.max(0, 1 - d / max);
          const q = (t * (0.8 + f * 1.6) + hash(i, 3)) % 1;
          circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, (2 + f * 9) * (0.4 + p) * q, null, `rgba(255,225,190,${(0.25 + 0.6 * f) * (1 - q) * k})`, 1.5);
        }
      },
      air(ctx, tg, s, p, k, t) {
        for (let i = 0; i < 6; i++) { const q = (t * 0.5 + i / 6) % 1; circle(ctx, s.x + Math.sin(i * 2.3 + t) * 30, s.y - 40 - q * 140, 18 + q * 30 * (0.5 + p), `rgba(245,240,235,${0.3 * (1 - q) * k})`); }
      },
    },
    // Kitchen Rush: skid marks gouge out ahead of him and dust kicks up as he scrapes his feet
    rush: {
      color: '#ffb070',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), hw = s.w / 2 - 12, len = Math.min(s.len, AR() * 2) * Math.min(1, 0.25 + p);
        for (const side of [-1, 1]) {
          ctx.save(); ctx.setLineDash([22, 12]);
          line(ctx, s.x - sa * hw * side, s.y + ca * hw * side, s.x - sa * hw * side + ca * len, s.y + ca * hw * side + sa * len, rgba('#3a1e0e', 0.55 * k), 7);
          ctx.restore();
        }
        for (let i = 0; i < 6; i++) {
          const q = (t * 0.9 + i / 6) % 1, d = q * len;
          ctx.save(); ctx.translate(s.x + ca * d, s.y + sa * d); ctx.rotate(s.angle);
          poly(ctx, [-10, -22, 10, 0, -10, 22, -4, 0], rgba('#ffb070', 0.35 * (1 - q) * k), null);
          ctx.restore();
        }
      },
    },
    // Simmer: the stove coils built into the floor glow from dull red to white-hot, ring by ring
    simmer: {
      color: '#ff7a3a',
      outline: false,
      ground(ctx, tg, s, p, k, t) {
        const r2 = s.r2 || 0, heat = easeIn(p);
        const col = heat < 0.5 ? lerpColor('#3a1a10', '#ff4a1a', heat * 2) : lerpColor('#ff4a1a', '#ffe6a8', (heat - 0.5) * 2);
        for (let rr = r2 + 12; rr < s.r - 6; rr += 18) {
          for (let seg = 0; seg < 4; seg++) {
            const a0 = seg * TAU / 4 + rr * 0.01 + 0.12, a1 = a0 + TAU / 4 - 0.24;
            ctx.beginPath(); ctx.arc(s.x, s.y, rr, a0, a1);
            ctx.strokeStyle = '#140a06'; ctx.lineWidth = 9; ctx.stroke();
            ctx.strokeStyle = rgba(col, k); ctx.lineWidth = 5; ctx.stroke();
          }
        }
        if (heat > 0.35) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); if (r2) ctx.arc(s.x, s.y, r2, 0, TAU, true);
          ctx.fillStyle = rgba('#ff5a1a', (heat - 0.35) * 0.35 * k); ctx.fill();
          ctx.restore();
          // heat shimmer rising off the coils
          for (let i = 0; i < 10; i++) {
            const a = hash(i, tg.id) * TAU, rr = r2 + 10 + hash(i + 3, tg.id) * (s.r - r2 - 20), q = (t * 1.2 + hash(i, 9)) % 1;
            const x = s.x + Math.cos(a) * rr, y = s.y + Math.sin(a) * rr - q * 26;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 6, x, y - 12);
            ctx.strokeStyle = `rgba(255,220,180,${0.4 * (1 - q) * heat * k})`; ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
      },
    },
    // Grease Fire (raidwide): grease spills out across the floor, and the last moment it catches
    grease: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        const b = env.boss, rr = 60 + (AR() - 40) * easeOut(p);
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= 28; i++) { const a = i * TAU / 28, w = 1 + Math.sin(a * 5 + tg.id) * 0.08 + Math.sin(a * 3 + t) * 0.04; i ? ctx.lineTo(b.x + Math.cos(a) * rr * w, b.y + Math.sin(a) * rr * w) : ctx.moveTo(b.x + Math.cos(a) * rr * w, b.y + Math.sin(a) * rr * w); }
        ctx.closePath();
        const g = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, rr);
        g.addColorStop(0, `rgba(120,80,20,${0.3 * k})`); g.addColorStop(0.8, `rgba(150,100,30,${0.22 * k})`); g.addColorStop(1, `rgba(255,200,90,${0.3 * k})`);
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
        if (p > 0.75) for (let i = 0; i < 14; i++) { const a = hash(i, tg.id) * TAU, d = Math.sqrt(hash(i + 5, tg.id)) * rr * 0.95; flame(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 4 + (p - 0.75) * 30, t + i); }
      },
    },
  };

  // ------------------------------------------------------------------ Skitterra
  const S = {
    // Venom Mist (raidwide): green fog rolls in from the cave walls
    mist: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t) {
        // creeps in from every wall: each puff sits between the wall and a line closing in on the centre
        const fill = 1 - 0.75 * easeOut(p);
        for (let i = 0; i < 46; i++) {
          const a = i * TAU / 46 + Math.sin(t * 0.4 + i) * 0.05, wall = ARENA.edge(a), inner = wall * fill;
          const d = inner + hash(i, 2) * (wall - inner);
          glow(ctx, Math.cos(a) * d, Math.sin(a) * d, 40 + hash(i, 4) * 40, '#7ae03a', 0.16 * k);
        }
      },
    },
    // Eightfold Lunge: a leg rises over the strike line and its shadow darkens the floor where it will land
    lunge: {
      color: '#ffb0dc',
      ground(ctx, tg, s, p, k) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = AR() * 2;
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        const g = ctx.createLinearGradient(s.x, s.y, s.x + ca * L, s.y + sa * L);
        g.addColorStop(0, `rgba(20,6,24,${(0.35 + 0.3 * p) * k})`); g.addColorStop(1, `rgba(20,6,24,${0.1 * k})`);
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
      },
      air(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), lift = (1 - easeIn(p)) * 90;
        const pts = [70, 210, 360, 500].map((d, i) => [s.x + ca * d, s.y + sa * d - lift * Math.sin((i + 0.5) / 4 * Math.PI) - (i === 1 ? 40 : 0)]);
        ctx.save(); ctx.globalAlpha = (0.35 + 0.5 * p) * k;
        limb(ctx, pts.flat(), '#3a2448', 12);
        for (const [x, y] of pts.slice(1, 3)) circle(ctx, x, y, 7, '#24152e', OUT, 2);
        const tip = pts[3];
        poly(ctx, [tip[0] - sa * 8, tip[1] + ca * 8, tip[0] + ca * 30, tip[1] + sa * 30, tip[0] + sa * 8, tip[1] - ca * 8], '#d6304a', OUT, 2);
        ctx.restore();
      },
    },
    // Venom Spit: venom beads string out along the line it will travel, brightening once it's locked
    venom: {
      color: '#b8ff5a',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), locked = p > 1 - (tg.lockAt || 1.2) / tg.dur;
        for (let i = 0; i < 16; i++) {
          if (i / 16 > p * 1.2) continue;
          const d = 90 + i * 34, wob = Math.sin(t * 6 + i) * 3;
          glow(ctx, s.x + ca * d - sa * wob, s.y + sa * d + ca * wob, locked ? 16 : 11, '#8aff4a', (locked ? 0.7 : 0.4) * k);
          circle(ctx, s.x + ca * d - sa * wob, s.y + sa * d + ca * wob, locked ? 4.5 : 3, rgba('#d8ffb0', k));
        }
      },
    },
  };

  // tankbusters: Grubnak's chop lines, or Skitterra's silk gathering on the tank
  const buster = {
    color: '#ff6a5a',
    ground(ctx, tg, s, p, k, t, env) {
      const tgt = tg.target != null ? env.entById(tg.target) : null;
      ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#ff4a3a', (0.06 + 0.1 * p) * k); ctx.fill(); ctx.restore();
      if (env.bossId === 'skitterra') {
        if (!tgt) return;
        for (let i = 0; i < 9; i++) {
          const a = s.angle - s.arc / 2 + (i / 8) * s.arc, x0 = s.x + Math.cos(a) * s.r, y0 = s.y + Math.sin(a) * s.r;
          const q = Math.min(1, p * 1.4);
          line(ctx, x0 + (tgt.x - x0) * (1 - q), y0 + (tgt.y - y0) * (1 - q), tgt.x, tgt.y - 14, rgba('#f4f0ff', 0.5 * k), 1.5);
        }
        return;
      }
      for (let i = 0; i < 7; i++) {
        const a = s.angle - s.arc / 2 + ((i + 0.5) / 7) * s.arc, q = (t * 1.4 + i * 0.37) % 1;
        const d0 = 80 + q * (s.r - 120), d1 = d0 + 40;
        line(ctx, s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0, s.x + Math.cos(a) * d1, s.y + Math.sin(a) * d1, rgba('#ffd8d0', 0.6 * (1 - q) * k), 3);
      }
    },
  };

  function get(tg, env) {
    if (tg.type === 'buster') return buster;
    if (env.bossId === 'skitterra') return S[tg.tag] || null;
    return G[tg.tag] || null;
  }
  // under everyone (called inside the arena clip)
  function ground(ctx, tg, s, p, k, t, env) {
    const tell = get(tg, env);
    if (!tell) return false;
    if (tg.type === 'raidwide') { if (tell.ground) tell.ground(ctx, tg, s, p, k, t, env); return true; }
    if (tell.ground) tell.ground(ctx, tg, s, p, k, t, env);
    if (tell.outline !== false && !env.hard) outline(ctx, s, p, k, t, tell.color || '#ffffff');
    return true;
  }
  // how visible a telegraph is: fades in over its first quarter second, and out over a quarter second once it has
  // landed (tg.gone is set when the host resolves it)
  function fade(tg, t) {
    const k = Math.min(1, (t - tg.start) / 0.25);
    return tg.gone != null ? k * Math.max(0, 1 - (t - tg.gone) / 0.25) : k;
  }
  // the props above the floor (falling things, the cleaver, legs); drawn after ground() but still under every unit
  function air(ctx, tgs, t, env) {
    for (const tg of tgs.values()) {
      if (tg.hidden && tg.type !== 'raidwide') continue;
      const tell = get(tg, env);
      if (!tell || !tell.air) continue;
      const p = clamp((t - tg.start) / tg.dur, 0, 1), k = fade(tg, t);
      if (k > 0) tell.air(ctx, tg, tg.live, p, k, t, env);
    }
  }

  // ------------------------------------------------------------------ Rolling Meatballs
  function meatball(ctx, x, y, r, spin) {
    shadow(ctx, x + 4, y + r * 0.55, r * 1.05, 0.45);
    ctx.save(); ctx.translate(x, y - r * 0.55);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#b8653a'); g.addColorStop(0.7, '#7a3a1e'); g.addColorStop(1, '#4a200e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, TAU); ctx.clip();
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4 + spin, d = r * (0.25 + (i % 3) * 0.25);
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.9, r * 0.16, r * 0.11, a, i % 3 ? 'rgba(60,24,10,0.55)' : 'rgba(110,190,70,0.8)');
    }
    ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.55, r * 0.6, r * 0.28, 0, 0, TAU); ctx.fillStyle = 'rgba(200,40,20,0.75)'; ctx.fill();   // sauce on top
    ctx.restore();
    ellipse(ctx, -r * 0.35, -r * 0.45, r * 0.22, r * 0.12, -0.6, 'rgba(255,240,220,0.55)');
    ctx.restore();
  }
  // r: { x, y, a, sp, r, delay, start } (client clock)
  function drawRollers(ctx, rollers, t, env) {
    for (const [id, m] of rollers) {
      const rollAt = m.start + m.delay, end = rollAt + (2 * AR() + 300) / m.sp;
      if (t > end) { rollers.delete(id); continue; }
      const ca = Math.cos(m.a), sa = Math.sin(m.a);
      if (t < rollAt) {
        const fly = clamp((t - m.start) / 0.5, 0, 1);
        if (fly < 1) {
          // lobbed from his hands to the wall
          const b = env.boss, x = b.x + (m.x - b.x) * fly, y = b.y + (m.y - b.y) * fly - Math.sin(fly * Math.PI) * 160;
          shadow(ctx, b.x + (m.x - b.x) * fly, b.y + (m.y - b.y) * fly, m.r * 0.8, 0.3);
          meatball(ctx, x, y + m.r * 0.55, m.r * 0.9, fly * 8);
          continue;
        }
        const q = (t - m.start - 0.5) / Math.max(0.1, m.delay - 0.5);
        // which way it'll roll: a grease streak in front; Normal also gets a faint lane across the room
        if (!env.hard) {
          ctx.save(); ARENA.trace(ctx); ctx.clip();
          ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 40;
          line(ctx, m.x - sa * m.r, m.y + ca * m.r, m.x - sa * m.r + ca * AR() * 2, m.y + ca * m.r + sa * AR() * 2, rgba('#ffb070', 0.3), 2);
          line(ctx, m.x + sa * m.r, m.y - ca * m.r, m.x + sa * m.r + ca * AR() * 2, m.y - ca * m.r + sa * AR() * 2, rgba('#ffb070', 0.3), 2);
          ctx.restore();
        }
        for (let i = 0; i < 3; i++) {
          const d = m.r + 26 + i * 28 + ((t * 60) % 28);
          ctx.save(); ctx.translate(m.x + ca * d, m.y + sa * d); ctx.rotate(m.a);
          poly(ctx, [-8, -14, 8, 0, -8, 14, -3, 0], rgba('#ffcf90', (0.35 + 0.5 * q) * (1 - i * 0.25)), null);
          ctx.restore();
        }
        const wob = Math.sin(t * (8 + q * 18)) * (2 + q * 4);
        meatball(ctx, m.x + ca * wob, m.y + sa * wob, m.r, Math.sin(t * 6) * 0.2);
        continue;
      }
      const d = (t - rollAt) * m.sp, x = m.x + ca * d, y = m.y + sa * d;
      if (ARENA.sd(x, y) > m.r + 40) continue;
      // a greasy streak behind it
      ctx.save(); ARENA.trace(ctx); ctx.clip(); ctx.lineCap = 'round';
      line(ctx, m.x + ca * Math.max(0, d - 260), m.y + sa * Math.max(0, d - 260), x, y, 'rgba(90,50,20,0.25)', m.r * 1.3);
      ctx.restore();
      meatball(ctx, x, y, m.r, d / m.r);
    }
  }

  // ------------------------------------------------------------------ Silk Reel
  // rl: { pid, start, pullAt, end } (client clock)
  function drawReels(ctx, reels, t, env) {
    const b = env.boss;
    for (const rl of reels.values()) {
      const e = env.entById(rl.pid);
      if (!e) continue;
      // from her spinnerets (behind her) to the target
      const sx = b.x - Math.cos(b.f) * 60, sy = b.y - Math.sin(b.f) * 60 - 10;
      const ex = e.x, ey = e.y - 18;
      const shoot = clamp((t - rl.start) / 0.35, 0, 1);
      const tx = sx + (ex - sx) * shoot, ty = sy + (ey - sy) * shoot;
      const pulling = t >= rl.pullAt;
      const d = Math.hypot(tx - sx, ty - sy) || 1, nx = -(ty - sy) / d, ny = (tx - sx) / d;
      const vib = pulling ? Math.sin(t * 40) * 3 : 0;
      ctx.save(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + tx) / 2 + nx * (pulling ? vib : 18), (sy + ty) / 2 + ny * (pulling ? vib : 18), tx, ty);
      ctx.strokeStyle = 'rgba(240,240,255,0.3)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = 'rgba(250,250,255,0.95)'; ctx.lineWidth = 2.5; ctx.stroke();
      if (pulling) for (let i = 0; i < 4; i++) {
        const q = 1 - ((t * 1.6 + i / 4) % 1);
        glow(ctx, sx + (tx - sx) * q, sy + (ty - sy) * q, 9, '#ffffff', 0.7);
      }
      ctx.restore();
      if (shoot >= 1) {
        // silk bundling around the hooked player's feet
        for (let i = 0; i < 3; i++) ellipse(ctx, e.x, e.y + 2 - i * 5, 20 - i * 3, 8 - i, Math.sin(t * 3 + i) * 0.3, null, `rgba(240,240,255,${pulling ? 0.75 : 0.4})`, 2);
      }
    }
  }

  return { get, ground, air, fade, drawRollers, drawReels };
})();
