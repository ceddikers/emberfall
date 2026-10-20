// Boss "tells": each mechanic shows up as something in the world instead of a colored shape on the floor.
// Grubnak's kitchen throws meat, drops cloches, shakes spice jars, heats the stove coils and swings a ghost
// cleaver; Skitterra's web strikes with legs, creeps in as fog and reels you in on silk.
// A dashed outline and a sweeping wash always mark the exact area, on every difficulty: telegraphs are never hidden.
// The art is the extra clue, never the only one.
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
  // One colour language for every boss: the rim says what the mechanic wants of you, the art inside says whose it is.
  // Orange-red: get out. Red: a tankbuster. Yellow: stack in. Purple: spread out. Cyan: soak it.
  // (raidwides have no rim: the whole room is the warning)
  const ROLE_RIM = { aoe: '#ff6a3a', proximity: '#ff6a3a', knockback: '#ff6a3a', buster: '#ff2a3a', stack: '#ffd84a', spread: '#c070ff', chain: '#c070ff', tower: '#4ff0e8' };
  const roleColor = (tg, tell) => ROLE_RIM[tg.type] || (tell && tell.color) || '#ffffff';
  // The fair-play outline: a solid rim in the role colour and a faint wash sweeping out from the origin as the cast
  // runs, with a bright leading edge. In the last 0.6s the rim pulses; a shape that follows someone flashes white the
  // moment it locks in place. The same on every difficulty.
  function outline(ctx, tg, s, p, k, t, env, tell) {
    const col = roleColor(tg, tell), left = (1 - p) * tg.dur;
    const late = clamp(1 - left / 0.6, 0, 1), landed = tg.gone != null;
    ctx.save();
    if (!landed && p < 0.995) {
      const g = ArenaView.grown(s, p);
      if (g) {
        SHAPES.trace(ctx, g); ctx.fillStyle = rgba(col, 0.1 * k); ctx.fill();
        ctx.strokeStyle = rgba(col, 0.5 * k * (1 - late)); ctx.lineWidth = 2; ctx.stroke();
      }
    }
    SHAPES.trace(ctx, s);
    if (s.kind === 'donut') {
      // the safe circle reads as safe: a soft lift inside it and a clean bright edge
      ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, s.r2, 0, TAU);
      ctx.fillStyle = rgba('#fff6e0', 0.05 * k); ctx.fill();
      ctx.strokeStyle = rgba('#fff6e0', (0.45 + 0.35 * late) * k); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
      SHAPES.trace(ctx, s);
    }
    ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 24; ctx.strokeStyle = rgba(col, 0.28 * k); ctx.lineWidth = 6; ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = rgba(col, (0.55 + 0.4 * late) * k); ctx.lineWidth = 2 + late * 1.5; ctx.stroke();
    if (late > 0 && !landed) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(col, late * (0.3 + 0.3 * Math.sin(t * 26)) * k); ctx.lineWidth = 9; ctx.stroke();
    }
    if (tg.lockAt && (tg.follow != null || tg.aim != null || tg.aimFromBoss != null) && left < tg.lockAt && left > tg.lockAt - 0.3) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#ffffff', (1 - (tg.lockAt - left) / 0.3) * 0.9 * k); ctx.lineWidth = 5; ctx.stroke();
    }
    ctx.restore();
  }
  // The rims again, over the floor VFX (lingering fire, smoke, auras), so a shape is never lost under them.
  function rims(ctx, tgs, t, env) {
    ctx.save();
    ARENA.trace(ctx, 4); ctx.clip();
    for (const tg of tgs.values()) {
      if (tg.hidden || tg.type === 'raidwide' || tg.gone != null) continue;
      const tell = get(tg, env);
      if (tell && tell.outline === false) continue;
      const k = fade(tg, t) * ghost(tg, env);
      if (k <= 0) continue;
      const p = clamp((t - tg.start) / tg.dur, 0, 1), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1);
      SHAPES.trace(ctx, tg.live);
      ctx.strokeStyle = rgba(roleColor(tg, tell), (0.35 + 0.35 * late) * k); ctx.lineWidth = 1.5; ctx.stroke();
    }
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

  // a thrown cleaver, spinning (Cleaver Toss)
  function flyingCleaver(ctx, x, y, rot, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
    rrect(ctx, -26, -5, 18, 10, 3, '#5a3d22', OUT, 2);
    rrect(ctx, -10, -16, 38, 30, [2, 8, 8, 2], '#d8dde4', OUT, 2.5);
    line(ctx, -8, 12, 26, 12, '#ffffff', 2);
    circle(ctx, 20, -8, 3, '#5d636c');
    ctx.restore();
  }
  // how far a line from (x, y) along angle runs before it meets the wall
  function toWall(x, y, ang, max) {
    const c = Math.cos(ang), s = Math.sin(ang);
    let d = 0;
    while (d < max && ARENA.sd(x + c * d, y + s * d) < -24) d += 16;
    return d;
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
    // Belly Flop (Hard): his shadow swells under him as he gathers himself, and the tiles at its rim start to rattle
    flop: {
      color: '#ffd8b0',
      ground(ctx, tg, s, p, k, t) {
        shadow(ctx, s.x, s.y, s.r * (0.5 + 0.5 * easeIn(p)), (0.3 + 0.35 * p) * k);
        for (let i = 0; i < 18; i++) {
          const a = i * TAU / 18 + hash(i, tg.id) * 0.3, j = Math.sin(t * (14 + p * 24) + i * 2) * 3 * p;
          rrect(ctx, s.x + Math.cos(a) * (s.r - 10) - 5 + j, s.y + Math.sin(a) * (s.r - 10) - 4, 10, 8, 1.5, rgba('#e8dcc8', (0.25 + 0.5 * p) * k));
        }
        ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = t * 30;
        circle(ctx, s.x, s.y, s.r - 2, null, rgba('#ffe6c8', (0.35 + 0.45 * p) * k), 3);
        ctx.restore();
      },
    },
    // Cleaver Toss (Hard): a score mark runs out along the floor where the cleaver will fly, sharpening once it's aimed
    cleaver: {
      color: '#ffe0c8',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = toWall(s.x, s.y, s.angle, s.len), hw = s.w / 2;
        const locked = p > 1 - (tg.lockAt || 1) / tg.dur;
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#2a0e06', (0.1 + 0.2 * p) * k); ctx.fill(); ctx.restore();
        for (const side of [-1, 1]) {
          const ox = -sa * hw * side, oy = ca * hw * side;
          line(ctx, s.x + ox, s.y + oy, s.x + ox + ca * L, s.y + oy + sa * L, rgba(locked ? '#ffffff' : '#ffd8c0', (locked ? 0.75 : 0.35) * k), locked ? 2.5 : 1.5);
        }
        for (let i = 0; i < 7; i++) {
          const q = (t * (0.8 + p) + i / 7) % 1, d = 90 + q * (L - 90);
          ctx.save(); ctx.translate(s.x + ca * d, s.y + sa * d); ctx.rotate(s.angle);
          poly(ctx, [-8, -12, 8, 0, -8, 12, -3, 0], rgba('#ffe6d0', (0.25 + 0.4 * p) * (1 - q) * k), null);
          ctx.restore();
        }
      },
      // the cleaver itself, spinning in his hand until it flies
      air(ctx, tg, s, p, k, t) { flyingCleaver(ctx, s.x + Math.cos(s.angle) * 70, s.y + Math.sin(s.angle) * 70 - 60, t * (6 + p * 14), k * (0.5 + 0.5 * p)); },
    },
    // ... and on its way back: it hangs, spinning, in the wall at the far end, and the score mark points home
    cleaverback: {
      color: '#ffffff',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = toWall(s.x, s.y, s.angle, s.len);
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#2a0e06', (0.15 + 0.2 * p) * k); ctx.fill(); ctx.restore();
        for (let i = 0; i < 9; i++) {
          const q = (t * 1.6 + i / 9) % 1, d = L - q * (L - 60);
          ctx.save(); ctx.translate(s.x + ca * d, s.y + sa * d); ctx.rotate(s.angle + Math.PI);
          poly(ctx, [-8, -12, 8, 0, -8, 12, -3, 0], rgba('#ffffff', (0.3 + 0.5 * p) * (1 - q) * k), null);
          ctx.restore();
        }
      },
      air(ctx, tg, s, p, k, t) {
        const L = toWall(s.x, s.y, s.angle, s.len), wob = Math.sin(t * 30) * 4 * p;
        flyingCleaver(ctx, s.x + Math.cos(s.angle) * (L - 30) + wob, s.y + Math.sin(s.angle) * (L - 30) - 30, s.angle + Math.PI + t * 4 * p, k);
      },
    },
    // Butcher's Charge: skid marks score the tiles from his feet to whatever he'll hit first (a wall or a cask), and
    // dust kicks up at that end once he's set
    charge: {
      color: '#ffcf9a',
      ground(ctx, tg, s, p, k, t, env) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), hw = s.w / 2;
        let L = toWall(s.x, s.y, s.angle, s.len) + 30;
        const hit = PROPS.ray(s.x, s.y, s.x + ca * L, s.y + sa * L, env.props, FIGHT.BOSS_R * 0.7);
        if (hit) L *= hit.t;
        const locked = p > 1 - (tg.lockAt || 1) / tg.dur;
        const shape = Object.assign({}, s, { len: L + FIGHT.BOSS_R });
        ctx.save(); SHAPES.trace(ctx, shape); ctx.fillStyle = rgba('#3a1a08', (0.12 + 0.2 * p) * k); ctx.fill(); ctx.restore();
        for (const side of [-0.55, -0.2, 0.2, 0.55]) {
          const ox = -sa * hw * side, oy = ca * hw * side, q = Math.min(1, p * 1.4);
          line(ctx, s.x + ox + ca * 60, s.y + oy + sa * 60, s.x + ox + ca * (60 + (L - 40) * q), s.y + oy + sa * (60 + (L - 40) * q), rgba('#1a0a04', (0.35 + 0.3 * p) * k), 4);
        }
        // the wall (or cask) he'll hit: it trembles, then dust shakes off it
        const ex = s.x + ca * (L + FIGHT.BOSS_R * 0.7), ey = s.y + sa * (L + FIGHT.BOSS_R * 0.7);
        if (locked) for (let i = 0; i < 6; i++) { const a = s.angle + Math.PI + (hash(i, tg.id) - 0.5) * 2, q = (t * 1.5 + hash(i, 3)) % 1; circle(ctx, ex + Math.cos(a) * q * 50, ey + Math.sin(a) * q * 50, 6 + q * 12, rgba('#e8dcc8', 0.35 * (1 - q) * k)); }
        for (let i = 0; i < 6; i++) {
          const q = (t * (1 + p * 2) + i / 6) % 1, d = 70 + q * (L - 70);
          ctx.save(); ctx.translate(s.x + ca * d, s.y + sa * d); ctx.rotate(s.angle);
          poly(ctx, [-9, -14, 9, 0, -9, 14, -3, 0], rgba(locked ? '#ffffff' : '#ffd8b0', (0.25 + 0.45 * p) * (1 - q) * k), null);
          ctx.restore();
        }
      },
    },
    // Larder Toss: a cask's shadow grows where it'll land, and the cask itself sails over from the shelves
    cask: {
      color: '#ffd8a0',
      ground(ctx, tg, s, p, k) {
        shadow(ctx, s.x, s.y, s.r * (0.4 + 0.6 * p), (0.25 + 0.35 * p) * k);
        ctx.save(); ctx.setLineDash([12, 9]); circle(ctx, s.x, s.y, s.r, null, rgba('#ffe2b8', (0.3 + 0.4 * p) * k), 2.5); ctx.restore();
      },
      air(ctx, tg, s, p, k, t, env) {
        if (p < 0.55) return;   // still on the shelf
        const q = (p - 0.55) / 0.45, sx = s.x < 0 ? -ARENA.hw - 30 : ARENA.hw + 30, sy = clamp(s.y, -ARENA.hh + 60, ARENA.hh - 60);
        const to = ARENA.clamp({ x: s.x, y: s.y }, 120);   // where it'll come to rest (off the wall, as the host puts it)
        const x = sx + (to.x - sx) * q, y = sy + (to.y - sy) * q - Math.sin(q * Math.PI) * 160;
        ctx.save(); ctx.globalAlpha = k; ctx.translate(x, y); ctx.rotate(q * 9);
        rrect(ctx, -22, -16, 44, 32, 9, '#9a6a36', OUT, 2.5);
        line(ctx, -12, -16, -12, 16, '#3a3a42', 3); line(ctx, 12, -16, 12, 16, '#3a3a42', 3);
        ctx.restore();
        void env;
      },
    },
    // Gut Blast: a gust of foul breath rolls out of him across the whole kitchen. The shadow behind every cask is cut out
    gut: {
      color: '#d8e89a', outline: false,
      ground(ctx, tg, s, p, k, t) {
        const R = AR() * 2.2, rr = 80 + R * easeOut(p);
        const g = ctx.createRadialGradient(s.x, s.y, 40, s.x, s.y, rr);
        g.addColorStop(0, rgba('#8a9a3a', (0.34 + 0.2 * p) * k)); g.addColorStop(0.75, rgba('#6a7a2a', (0.22 + 0.16 * p) * k)); g.addColorStop(1, rgba('#c8d87a', 0.05 * k));
        ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
        for (let i = 0; i < 4; i++) { const q = (t * 0.7 + i / 4) % 1; circle(ctx, s.x, s.y, 60 + q * R * 0.5, null, rgba('#e8f0b0', 0.28 * (1 - q) * k), 3); }
        if (p > 0.7) for (let i = 0; i < 18; i++) { const a = hash(i, tg.id) * TAU, d = 120 + hash(i + 2, tg.id) * 600; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 3 + hash(i, 5) * 4, rgba('#f0f8c0', 0.5 * (p - 0.7) / 0.3 * k)); }
      },
    },
    // Meat Hook (Hard): a chain swings down off the ceiling rail and the drag path toward the stove scrapes into the tiles
    hook: {
      color: '#d8dee4',
      ground(ctx, tg, s, p, k, t, env) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#20140c', (0.1 + 0.2 * p) * k); ctx.fill(); ctx.restore();
        for (let i = 0; i < 5; i++) {
          const q = (t * (0.8 + p * 1.6) + i / 5) % 1, d = q * s.len;
          ctx.save(); ctx.translate(s.x + ca * d, s.y + sa * d); ctx.rotate(s.angle);
          poly(ctx, [-8, -12, 8, 0, -8, 12, -3, 0], rgba('#e8eef4', (0.3 + 0.5 * p) * (1 - q) * k), null);
          ctx.restore();
        }
        const e = tg.follow != null ? env.entById(tg.follow) : null;
        if (!e) return;
        // the chain from the rail above, swinging in
        const top = -ARENA.hh - 40, sw = Math.sin(t * 3) * 30 * (1 - p), hx = e.x + sw, hy = e.y - 30;
        for (let i = 0; i < 9; i++) { const q = i / 8, x = e.x + sw * q * q, y = top + (hy - top) * q; ellipse(ctx, x, y, 3.5, 6, 0, null, rgba('#8a939e', k), 2); }
        ctx.save(); ctx.translate(hx, hy); ctx.beginPath(); ctx.arc(0, 8, 9, -Math.PI * 0.9, Math.PI * 0.6); ctx.strokeStyle = rgba('#d8dee4', k); ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
      },
    },
    // Flambé (Hard): brandy glistens in stripes across the tiles, and blue flame starts to lick along it just before
    // it goes up
    flambe: {
      color: '#ffc070',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba('#b8661a', (0.14 + 0.16 * p) * k); ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
        // a wet sheen sliding along the stripe
        for (let i = 0; i < 12; i++) {
          const q = (t * 0.35 + hash(i, tg.id)) % 1, d = q * s.len, off = (hash(i + 3, tg.id) - 0.5) * s.w * 0.8;
          ellipse(ctx, s.x + ca * d - sa * off, s.y + sa * d + ca * off, 26, 6, s.angle, rgba('#ffe2a8', 0.22 * Math.sin(q * Math.PI) * k));
        }
        if (p > 0.6) for (let i = 0; i < 18; i++) {
          const d = hash(i, tg.id + 1) * s.len, off = (hash(i, tg.id + 2) - 0.5) * s.w * 0.85, f = (p - 0.6) / 0.4;
          const fl = 0.6 + 0.4 * Math.sin(t * 16 + i * 3);
          glow(ctx, s.x + ca * d - sa * off, s.y + sa * d + ca * off, 10 + f * 22 * fl, '#5aa8ff', 0.55 * f * k);
        }
        ctx.restore();
      },
    },
  };

  // ------------------------------------------------------------------ Skitterra
  const S = {
    // Venom Mist (raidwide): green fog rolls in from the cave walls
    mist: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t) {
        // creeps in from every wall: a wavy bright front closing in on the centre, fog behind it, arrows pointing in
        const fill = 1 - 0.75 * easeOut(p), N = 72, front = [];
        for (let i = 0; i < N; i++) {
          const a = i * TAU / N, d = ARENA.edge(a) * fill + Math.sin(a * 9 + t * 2.2) * 9 + Math.sin(a * 4 - t * 1.3) * 6;
          front.push([Math.cos(a) * d, Math.sin(a) * d]);
        }
        const trace = () => { ctx.beginPath(); front.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
        ctx.save();
        ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 8000); front.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
        ctx.fillStyle = rgba('#3f8a16', (0.12 + 0.14 * p) * k); ctx.fill('evenodd');
        ctx.restore();
        for (let i = 0; i < 46; i++) {
          const a = i * TAU / 46 + Math.sin(t * 0.4 + i) * 0.05, wall = ARENA.edge(a), inner = wall * fill;
          const d = inner + 20 + hash(i, 2) * Math.max(0, wall - inner - 20);
          glow(ctx, Math.cos(a) * d, Math.sin(a) * d, 40 + hash(i, 4) * 40, '#7ae03a', 0.18 * k);
        }
        ctx.save(); ctx.lineJoin = 'round';
        trace(); ctx.strokeStyle = rgba('#14300a', 0.6 * k); ctx.lineWidth = 10; ctx.stroke();
        ctx.strokeStyle = rgba('#7aff3a', 0.6 * k); ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = rgba('#eaffb8', 0.9 * k); ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        for (let i = 0; i < 8; i++) {
          const a = (i + 0.5) * TAU / 8, d = ARENA.edge(a) * fill - 50 - (t * 30) % 24, ux = -Math.cos(a), uy = -Math.sin(a);
          const x = -ux * d, y = -uy * d, P = (u, v) => [x + ux * u - uy * v, y + uy * u + ux * v];
          poly(ctx, [...P(14, 0), ...P(-8, 13), ...P(-2, 0), ...P(-8, -13)], rgba('#a8ff5a', 0.85 * k), rgba('#14300a', 0.8 * k), 2);
        }
      },
    },
    // Eightfold Lunge: a leg rises over the strike line and its shadow darkens the floor where it will land
    lunge: {
      color: '#ffb0dc',
      ground(ctx, tg, s, p, k) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = AR() * 2;
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        // (a pink-lit shadow: the old near-black one vanished on her dark floor)
        const g = ctx.createLinearGradient(s.x, s.y, s.x + ca * L, s.y + sa * L);
        g.addColorStop(0, `rgba(20,6,24,${(0.3 + 0.25 * p) * k})`); g.addColorStop(1, `rgba(20,6,24,${0.12 * k})`);
        ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = rgba('#ff7ac0', (0.08 + 0.1 * p) * k); ctx.fill();
        // a jagged pink tear down the middle: the line the leg rakes
        const R0 = 90, R1 = Math.min(AR(), 900), n = 10, Lt = [], Rt = [];
        for (let i = 0; i <= n; i++) {
          const r = R0 + (R1 - R0) * i / n, z = i % 2 ? 1 : 0.3, w = s.arc * (0.05 + 0.13 * i / n);
          const al = s.angle - w * z - s.arc * 0.02, ar = s.angle + w * (1.3 - z) + s.arc * 0.02;
          Lt.push([s.x + Math.cos(al) * r, s.y + Math.sin(al) * r]); Rt.push([s.x + Math.cos(ar) * r, s.y + Math.sin(ar) * r]);
        }
        const band = [...Lt, ...Rt.reverse()].flat();
        poly(ctx, band, rgba('#ff5ab4', (0.22 + 0.4 * p) * k), rgba('#3a0a2a', 0.6 * k), 2);
        ctx.beginPath(); ctx.moveTo(s.x + ca * R0, s.y + sa * R0); ctx.lineTo(s.x + ca * R1, s.y + sa * R1);
        ctx.strokeStyle = rgba('#ffe0f2', (0.2 + 0.5 * p) * k); ctx.lineWidth = 1.5; ctx.stroke();
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
      ground(ctx, tg, s, p, k, t, env) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), locked = p > 1 - (tg.lockAt || 1.2) / tg.dur;
        // beads swelling along the line out to the target's distance, where the glob will land
        const e = tg.aim != null ? env.entById(tg.aim) : null;
        const L = Math.max(200, e ? Math.hypot(e.x - s.x, e.y - s.y) : 380), n = Math.max(6, Math.round((L - 90) / 40));
        for (let i = 0; i < n; i++) {
          const q = i / (n - 1); if (q > p * 1.25) continue;
          const d = 90 + q * (L - 130), wob = Math.sin(t * 6 + i) * 3 * (1 - q), x = s.x + ca * d - sa * wob, y = s.y + sa * d + ca * wob;
          const r = (2.5 + q * 4.5) * (locked ? 1.25 : 1);
          glow(ctx, x, y, r * 3.2, '#8aff4a', (locked ? 0.6 : 0.35) * k);
          circle(ctx, x, y, r, rgba('#8adf2a', k), rgba('#14300a', 0.8 * k), 1.5);
          circle(ctx, x - r * 0.3, y - r * 0.35, r * 0.35, rgba('#f0ffd0', 0.9 * k));
        }
        const x = s.x + ca * L, y = s.y + sa * L, R = 50 - 10 * p, spin = locked ? 0.4 : t * 1.6;
        circle(ctx, x, y, R, rgba('#8adf2a', (0.08 + 0.1 * p) * k), rgba('#c8ff6a', 0.85 * k), 2);
        ctx.save(); ctx.lineCap = 'round';
        for (let j = 0; j < 4; j++) {
          const a = spin + j * TAU / 4;
          ctx.beginPath(); ctx.arc(x, y, R + 9, a - 0.42, a + 0.42); ctx.strokeStyle = rgba('#14300a', 0.7 * k); ctx.lineWidth = 6; ctx.stroke();
          ctx.strokeStyle = rgba('#b8ff5a', k); ctx.lineWidth = 3; ctx.stroke();
          const b = a + TAU / 8;
          line(ctx, x + Math.cos(b) * (R - 2), y + Math.sin(b) * (R - 2), x + Math.cos(b) * (R - 12), y + Math.sin(b) * (R - 12), rgba('#eaffb8', 0.9 * k), 2.5);
        }
        ctx.restore();
      },
    },
    // Egg Sacs (Hard): a pale sac bound in silk sits in each circle, twitching faster as it ripens; one pip, one foot
    eggsac: {
      color: '#e8ff9a', outline: false,
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.4, '#c8ff6a', 0.18 * k);
        circle(ctx, s.x, s.y, s.r, rgba('#e8ff9a', 0.06 * k), rgba('#f0ffc8', (0.45 + 0.4 * p) * k), 2);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.7 * k); ctx.lineWidth = 2; ctx.stroke();
        const wob = Math.sin(t * (4 + p * 16) + tg.id) * (1 + p * 3);
        ctx.save(); ctx.globalAlpha = k;
        ellipse(ctx, s.x + 3, s.y + 8, 30, 12, 0, 'rgba(0,0,0,0.3)');
        ellipse(ctx, s.x + wob * 0.4, s.y - 6, 24 + wob * 0.5, 28 - wob * 0.3, 0, '#efeedc', OUT, 2.5);
        for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6; line(ctx, s.x - 24 * Math.cos(a), s.y - 6 - 26 * Math.sin(a), s.x + 24 * Math.cos(a), s.y - 6 + 26 * Math.sin(a), 'rgba(200,200,220,0.6)', 1.2); }
        glow(ctx, s.x, s.y - 6, 18, '#d8ff7a', (0.2 + 0.4 * p) * (0.7 + 0.3 * Math.sin(t * 9)));
        ctx.restore();
        circle(ctx, s.x, s.y + s.r + 14, 4.5, rgba('#f0ffc8', 0.9 * k), OUT, 1.5);
      },
    },
    // Fang Rush (Hard): pink chevrons running down her lane, a thread shot to her mark, slack while she aims and
    // pulled taut down the lane once she's set
    fang: {
      color: '#ffb0dc',
      ground(ctx, tg, s, p, k, t, env) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = toWall(s.x, s.y, s.angle, s.len);
        const locked = p > 1 - (tg.lockAt || 0.8) / tg.dur;
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#24082a', (0.18 + 0.25 * p) * k); ctx.fill(); ctx.clip();
        const gap = 120, hw = s.w * 0.4, h = hw * 0.75, th = 26, run = (t * (locked ? 280 : 90)) % gap;
        for (let d = 40 + run; d < L + h; d += gap) {
          const x = s.x + ca * d, y = s.y + sa * d, P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v];
          const a = (0.5 + 0.5 * Math.min(1, d / 200)) * (locked ? 0.85 : 0.45) * k;
          poly(ctx, [...P(0, 0), ...P(-h, hw), ...P(-h - th, hw), ...P(-th, 0), ...P(-h - th, -hw), ...P(-h, -hw)], rgba('#ff5ab4', a), rgba('#2a0820', 0.8 * k), 2.5);
          line(ctx, ...P(-h, hw), ...P(0, 0), rgba('#ffe0f2', a), 1.5); line(ctx, ...P(0, 0), ...P(-h, -hw), rgba('#ffe0f2', a), 1.5);
        }
        ctx.restore();
        const e = tg.aim != null ? env.entById(tg.aim) : null, mx = s.x + ca * 70, my = s.y + sa * 70 - 24;
        const ex = locked || !e ? s.x + ca * L : e.x, ey = locked || !e ? s.y + sa * L : e.y - 18;
        const sag = locked ? 0 : 22 + Math.sin(t * 4) * 6, nx = -(ey - my), ny = ex - mx, nd = Math.hypot(nx, ny) || 1;
        ctx.save(); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo((mx + ex) / 2 + nx / nd * sag, (my + ey) / 2 + ny / nd * sag, ex, ey);
        ctx.strokeStyle = rgba('#f4f0ff', 0.25 * k); ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', (locked ? 0.9 : 0.6) * k); ctx.lineWidth = 1.8; ctx.stroke();
        ctx.restore();
        if (e && !locked) {
          circle(ctx, e.x, e.y, 28, null, rgba('#ffffff', 0.75 * k), 2);
          circle(ctx, e.x, e.y, 36 + Math.sin(t * 5) * 3, null, rgba('#ff7ac0', 0.6 * k), 1.5);
        }
      },
    },
    // Spinneret Volley (Hard): a glob of silk drops on its target on a thread; its shadow tightens as it falls
    glob: {
      color: '#f4f0ff',
      ground(ctx, tg, s, p, k) {
        shadow(ctx, s.x, s.y, s.r * (0.4 + 0.6 * p), (0.25 + 0.35 * p) * k);
        circle(ctx, s.x, s.y, s.r, null, rgba('#f4f0ff', (0.3 + 0.5 * p) * k), 2);
      },
      air(ctx, tg, s, p, k, t) {
        const h = 220 * (1 - easeIn(p)) + 20;
        ctx.save(); ctx.globalAlpha = k;
        line(ctx, s.x, s.y - h - 260, s.x, s.y - h - 12, 'rgba(240,240,255,0.55)', 1.2);
        const wob = Math.sin(t * 9 + tg.id) * 1.5;
        ellipse(ctx, s.x, s.y - h, 15 + wob, 13 - wob, 0, '#f4f2fa', OUT, 2);
        ellipse(ctx, s.x - 4, s.y - h - 4, 5, 3, -0.5, 'rgba(255,255,255,0.8)');
        ctx.restore();
      },
    },
    // Acid Deluge: acid rains out over the whole cave from her raised abdomen, beading and hissing on the stone. Every
    // pillar's shadow is cut out of it
    deluge: {
      color: '#c8ff8a', outline: false,
      ground(ctx, tg, s, p, k, t) {
        const R = AR() * 1.4;
        ctx.fillStyle = rgba('#5ab82a', (0.16 + 0.18 * p) * k); ctx.fillRect(-R, -R, R * 2, R * 2);
        // acid coming down at a slant: streaked drops falling onto the lit floor, a ring where each lands
        const n = 70 + Math.round(60 * p), sp = 0.9 + 1.4 * p;
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const a = hash(i, tg.id) * TAU, d = Math.sqrt(hash(i + 7, tg.id)) * AR(), q = (t * sp + hash(i, 3)) % 1;
          const gx = s.x + Math.cos(a) * d, gy = s.y + Math.sin(a) * d, fall = (1 - q) * 70, x = gx + fall * 0.45, y = gy - fall;
          if (q < 0.82) {
            ctx.beginPath(); ctx.moveTo(x + 13, y - 28); ctx.lineTo(x, y);
            ctx.strokeStyle = rgba('#b8ff6a', (0.3 + 0.4 * p) * k); ctx.lineWidth = 2.5; ctx.stroke();
            ellipse(ctx, x, y, 4.2, 5.6, -0.45, rgba('#9aef4a', (0.6 + 0.3 * p) * k), rgba('#1e4a0e', 0.7 * k), 1);
          } else {
            const u = (q - 0.82) / 0.18;
            ellipse(ctx, gx, gy, 3 + u * 9, (3 + u * 9) * 0.6, 0, null, rgba('#d8ff9a', (0.7 - 0.7 * u) * k), 1.4);
          }
        }
        ctx.restore();
      },
    },
    // From the Dark / Ceiling Ambush: a thorny ring of silk where she'll land, and a thread let down from the dark
    // into its middle, shortening as she comes down it
    ambush: {
      color: '#e8dcff',
      ground(ctx, tg, s, p, k, t) {
        const R = s.r, n = 28, spin = t * 0.15;
        glow(ctx, s.x, s.y, R * 0.9, '#b8a0ff', (0.06 + 0.12 * p) * k);
        ctx.save(); ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i <= n * 2; i++) {
          const a = spin + i * Math.PI / n, spike = i % 2 ? 1 : 0, r = R + (spike ? (i % 4 === 1 ? 16 : -12) * (0.6 + 0.4 * p) : 0);
          i ? ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r) : ctx.moveTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.strokeStyle = rgba('#1a1028', 0.6 * k); ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = rgba('#d8c8ff', (0.5 + 0.4 * p) * k); ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', (0.6 + 0.4 * p) * k); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
        // the big spike at the front, where her shadow comes in from
        for (let j = 0; j < 4; j++) {
          const a = spin + j * TAU / 4 + Math.PI / 4, x = s.x + Math.cos(a) * R, y = s.y + Math.sin(a) * R, ux = Math.cos(a), uy = Math.sin(a);
          poly(ctx, [x - uy * 7, y + ux * 7, x + ux * 26, y + uy * 26, x + uy * 7, y - ux * 7, x - ux * 10, y - uy * 10], rgba('#f0e8ff', 0.85 * k), rgba('#1a1028', 0.7 * k), 1.5);
        }
      },
      air(ctx, tg, s, p, k, t) {
        const top = s.y - 700, bot = s.y - 40 - (1 - p) * 300, sw = Math.sin(t * 2) * 6 * (1 - p);
        ctx.save(); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x, top); ctx.quadraticCurveTo(s.x + sw, (top + bot) / 2, s.x, bot);
        ctx.strokeStyle = rgba('#f4f0ff', 0.25 * k); ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        glow(ctx, s.x, bot, 10, '#ffffff', 0.6 * k);
      },
    },
    // Strand Reel: a strand shot to a pillar; it goes taut and the floor along it is churned with webbing
    strand: {
      color: '#f4f0ff',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#e8e4f4', (0.08 + 0.14 * p) * k); ctx.fill(); ctx.restore();
        const sag = (1 - p) * 26 * Math.sin(t * 5);
        for (const off of [-8, 0, 8]) {
          ctx.beginPath(); ctx.moveTo(s.x - sa * off, s.y + ca * off - 30);
          ctx.quadraticCurveTo(s.x + ca * s.len / 2 - sa * (off + sag), s.y + sa * s.len / 2 + ca * (off + sag) - 40, s.x + ca * s.len - sa * off * 0.3, s.y + sa * s.len + ca * off * 0.3 - 40);
          ctx.strokeStyle = rgba('#f4f0ff', (0.4 + 0.5 * p) * k); ctx.lineWidth = 1.6; ctx.stroke();
        }
        for (let i = 0; i < 5; i++) { const q = (t * (1 + 2 * p) + i / 5) % 1; glow(ctx, s.x + ca * q * s.len, s.y + sa * q * s.len - 36, 10, '#ffffff', 0.5 * p * k); }
      },
    },
  };

  // ------------------------------------------------------------------ Volkar
  // a lightning rod: an iron pole with a crown of spikes, guy-wires pegged into the rock. charge 0..1 lights it up.
  function rodPole(ctx, x, y, t, a = 1, charge = 0) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    ellipse(ctx, x + 7, y + 4, 18, 8, 0, 'rgba(0,0,0,0.35)');
    for (const [dx, dy] of [[-24, 10], [24, 10], [0, -14]]) { line(ctx, x, y - 58, x + dx, y + dy, 'rgba(24,28,34,0.85)', 1.3); circle(ctx, x + dx, y + dy, 2, '#5a626e', OUT, 1); }
    rrect(ctx, x - 4, y - 70, 8, 72, 2, '#4a525c', OUT, 2);
    line(ctx, x - 1.5, y - 67, x - 1.5, y - 2, 'rgba(220,230,240,0.35)', 1.5);
    for (const dx of [-7, 0, 7]) poly(ctx, [x + dx - 2.5, y - 70, x + dx, y - 84 - (dx ? 0 : 6), x + dx + 2.5, y - 70], '#6a7480', OUT, 1.2);
    rrect(ctx, x - 9, y - 73, 18, 5, 2, '#5a626e', OUT, 1.5);
    if (charge > 0) {
      glow(ctx, x, y - 84, 18 + charge * 26, '#7fe8ff', 0.35 + 0.5 * charge);
      if (Math.floor(t * 14 + x) % 3 !== 0) jagged(ctx, x, y - 86, x + (hash(Math.floor(t * 14), x) - 0.5) * 50, y - 86 - 20 - charge * 30, Math.floor(t * 14) + x, '#9ff4ff', 1 + charge);
    }
    ctx.restore();
  }
  function stormCloud(ctx, x, y, s, a, t, seed) {
    for (let i = 0; i < 6; i++) {
      const ox = Math.cos(i * 1.7 + seed) * s * 0.55, oy = Math.sin(i * 2.3 + seed) * s * 0.22;
      glow(ctx, x + ox + Math.sin(t * 0.8 + i) * 4, y + oy, s * (0.45 + hash(i, seed) * 0.3), '#1a2230', a);
    }
    if (Math.floor(t * 9 + seed) % 7 === 0) glow(ctx, x, y, s * 0.5, '#9ccfff', a * 0.6);
  }

  const V = {
    // Thunderclap (raidwide): storm clouds roll in over the summit and it goes dark, flickering, before the clap
    clap: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t) {
        const R = AR();
        ctx.save();
        ctx.fillStyle = `rgba(6,10,20,${(0.1 + 0.32 * easeIn(p)) * k})`; ctx.fillRect(-R - 60, -R - 60, R * 2 + 120, R * 2 + 120);
        for (let i = 0; i < 14; i++) {
          const a = i * TAU / 14 + t * 0.15, d = R * (0.25 + hash(i, 3) * 0.7) * (1.2 - 0.3 * p);
          glow(ctx, Math.cos(a) * d, Math.sin(a) * d, 90 + hash(i, 5) * 80, '#05070d', 0.35 * k);
        }
        // lightning crawling over the rock: branching veins flickering on and off, more of them as it builds
        const nv = Math.round(4 + 12 * p), fr = Math.floor(t * 10);
        ctx.globalAlpha = k * (0.35 + 0.55 * p);
        for (let i = 0; i < nv; i++) {
          if ((fr + i * 3) % 4 === 0) continue;
          const a = hash(i, 11) * TAU, d = Math.sqrt(hash(i, 13)) * (R - 80), x = Math.cos(a) * d, y = Math.sin(a) * d, b = hash(i, fr % 7 + 17) * TAU, L = 60 + hash(i, 19) * 90;
          jagged(ctx, x, y, x + Math.cos(b) * L, y + Math.sin(b) * L, fr * 13 + i, '#7fd8ff', 1.5);
          jagged(ctx, x + Math.cos(b) * L * 0.5, y + Math.sin(b) * L * 0.5, x + Math.cos(b + 0.7) * L, y + Math.sin(b + 0.7) * L, fr * 17 + i, '#bff0ff', 1);
        }
        ctx.globalAlpha = 1;
        if (p > 0.7 && Math.floor(t * 18) % 4 === 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(160,210,255,${0.06 * k})`; ctx.fillRect(-R - 60, -R - 60, R * 2 + 120, R * 2 + 120); }
        ctx.restore();
      },
    },
    // Polarity Surge: everyone's charge flares. Two of the same charge standing close crackle at each other;
    // opposite charges close together are joined by a calm, steady bond.
    surge: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) {
        const us = env.units || [], pol = env.pol;
        if (!pol) return;
        for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
          const a = us[i], b = us[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > s.r + 30) continue;
          const sa = pol.get(a.id), sb = pol.get(b.id);
          if (!sa || !sb) continue;
          if (sa === sb) {
            const col = sa > 0 ? '#ffc24a' : '#4ad8ff';
            ctx.save(); ctx.globalAlpha = (0.4 + 0.6 * p) * k;
            for (let n = 0; n < 2; n++) jagged(ctx, a.x, a.y - 16, b.x, b.y - 16, Math.floor(t * 16) * 3 + n + a.id, col, 1.4 + p * 1.5);
            ctx.restore();
            glow(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 16, 30, '#ff6a5a', 0.3 * p * k);
          } else {
            ctx.save(); ctx.lineCap = 'round';
            const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, rgba(sa > 0 ? '#ffc24a' : '#4ad8ff', 0.6 * k)); g.addColorStop(1, rgba(sb > 0 ? '#ffc24a' : '#4ad8ff', 0.6 * k));
            ctx.strokeStyle = g; ctx.lineWidth = 3 + 2 * Math.sin(t * 4); ctx.beginPath(); ctx.moveTo(a.x, a.y - 14); ctx.lineTo(b.x, b.y - 14); ctx.stroke();
            ctx.restore();
          }
        }
        // the auras swell as it nears
        for (const u of us) {
          const sg = pol.get(u.id); if (!sg) continue;
          const col = sg > 0 ? '#ffc24a' : '#4ad8ff';
          ellipse(ctx, u.x, u.y + 4, 30 + 26 * p, 22 + 19 * p, 0, null, rgba(col, (0.25 + 0.5 * p) * k), 1.5 + p * 2);
        }
      },
    },
    // Thunder Crash: a storm cloud gathers over each + player, and its shadow is where the pair stands together
    crash: {
      color: '#ffd84a', outline: false,
      ground(ctx, tg, s, p, k, t) { shadow(ctx, s.x, s.y, s.r * 0.9, (0.2 + 0.25 * p) * k); ArenaView.stackMarker(ctx, s, p, k, t); },
      air(ctx, tg, s, p, k, t) {
        stormCloud(ctx, s.x, s.y - 170 + p * 40, 70 + p * 20, (0.5 + 0.4 * p) * k, t, tg.id);
        // it starts to spit lightning at the ring below as it nears
        if (p > 0.55 && Math.floor(t * 14 + tg.id) % 3 === 0) {
          ctx.save(); ctx.globalAlpha = k * Math.min(1, (p - 0.45) * 2);
          jagged(ctx, s.x, s.y - 150 + p * 40, s.x + (hash(Math.floor(t * 14), tg.id) - 0.5) * s.r * 1.2, s.y, Math.floor(t * 14) * 5 + tg.id, '#fff2b0', 1.8);
          ctx.restore();
        }
      },
    },
    // Static Field: everyone's own crackling ring; stay out of each other's
    static: {
      color: '#c070ff', outline: false,
      ground(ctx, tg, s, p, k, t) {
        ArenaView.spreadMarker(ctx, s, p, k, t);
        if (Math.floor(t * 12 + tg.id) % 2) {
          const a = hash(Math.floor(t * 12), tg.id) * TAU;
          ctx.save(); ctx.globalAlpha = k * 0.8;
          jagged(ctx, s.x + Math.cos(a) * s.r * 0.3, s.y + Math.sin(a) * s.r * 0.3, s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r, Math.floor(t * 12) + tg.id, '#d79bff', 1.2);
          ctx.restore();
        }
      },
    },
    // Lightning Rods: an iron rod is driven into the rock; a cloud gathers over it and the rod charges up
    rod: {
      color: '#9ff4ff',
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.4, '#4fa8e0', 0.22 * k);
        circle(ctx, s.x, s.y, s.r, rgba('#9ff4ff', 0.08 * k), rgba('#bff6ff', (0.45 + 0.4 * p) * k), 2);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.7 * k); ctx.lineWidth = 2; ctx.stroke();
        // a rune ring round it: ticks turning slowly, and four arrowheads pointing in at the rod
        const R2 = s.r + 22, spin = t * 0.4;
        circle(ctx, s.x, s.y, R2, null, rgba('#7fd8ff', (0.35 + 0.35 * p) * k), 1.5);
        for (let i = 0; i < 16; i++) { const a = spin + i * TAU / 16, l = i % 4 ? 6 : 12; line(ctx, s.x + Math.cos(a) * R2, s.y + Math.sin(a) * R2, s.x + Math.cos(a) * (R2 + l), s.y + Math.sin(a) * (R2 + l), rgba('#bff6ff', (0.4 + 0.4 * p) * k), 1.5); }
        for (let i = 0; i < 4; i++) {
          const a = -spin + i * TAU / 4 + Math.PI / 4, x = s.x + Math.cos(a) * (R2 + 24), y = s.y + Math.sin(a) * (R2 + 24), ux = -Math.cos(a), uy = -Math.sin(a);
          poly(ctx, [x + ux * 12, y + uy * 12, x - uy * 9, y + ux * 9, x + uy * 9, y - ux * 9], rgba('#bff6ff', (0.5 + 0.4 * p) * k), rgba('#0a1a2a', 0.7 * k), 1.5);
        }
      },
      air(ctx, tg, s, p, k, t) {
        const drop = Math.min(1, (t - tg.start) / 0.35);   // driven in from above
        rodPole(ctx, s.x, s.y - (1 - drop) * 160, t, k, p);
        stormCloud(ctx, s.x, s.y - 190, 60 + p * 30, (0.3 + 0.5 * p) * k, t, tg.id);
      },
    },
    // Gale Slam: the wind pours in toward him (he's drawing breath). On Normal the still air behind each rod
    // shows faintly, a pale calm strip running out to the wall.
    gale: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) {
        const R = AR(), b = env.boss;
        // air pouring in to him in curling streams, each with its head pointing the way it's going
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 0; i < 32; i++) {
          const q = (t * (0.7 + 0.6 * p) + hash(i, 7)) % 1, a = i * TAU / 32 + q * 0.9, r1 = R - (R - 120) * q, r0 = r1 + 90, a0 = a - 0.25;
          const x0 = b.x + Math.cos(a0) * r0, y0 = b.y + Math.sin(a0) * r0, x1 = b.x + Math.cos(a) * r1, y1 = b.y + Math.sin(a) * r1;
          const cx = b.x + Math.cos(a0 + 0.06) * (r0 + r1) / 2, cy = b.y + Math.sin(a0 + 0.06) * (r0 + r1) / 2, al = (0.2 + 0.45 * p) * k * Math.sin(q * Math.PI);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
          ctx.strokeStyle = rgba('#e8f4ff', al); ctx.lineWidth = 2.5; ctx.stroke();
          const d = Math.hypot(x1 - cx, y1 - cy) || 1, ux = (x1 - cx) / d, uy = (y1 - cy) / d;
          ctx.beginPath(); ctx.moveTo(x1 - ux * 9 - uy * 6, y1 - uy * 9 + ux * 6); ctx.lineTo(x1, y1); ctx.lineTo(x1 - ux * 9 + uy * 6, y1 - uy * 9 - ux * 6); ctx.stroke();
        }
        ctx.restore();
        for (const c of env.covers || []) {
          const cx = c.x - b.x, cy = c.y - b.y, cd = Math.hypot(cx, cy);
          if (cd < 1) continue;
          const ang = Math.atan2(cy, cx);
          const strip = { kind: 'rect', x: c.x - Math.cos(ang) * 20, y: c.y - Math.sin(ang) * 20, angle: ang, len: R * 2, w: 92 };
          ctx.save(); SHAPES.trace(ctx, strip);
          ctx.fillStyle = rgba('#bfe6ff', 0.1 * k); ctx.fill();
          ctx.setLineDash([10, 10]); ctx.lineDashOffset = t * 12; ctx.strokeStyle = rgba('#d8f0ff', 0.3 * k); ctx.lineWidth = 1.5; ctx.stroke();
          ctx.restore();
        }
      },
    },
    // Rod Strike: a thread of charge runs from each marked player to the stone nearest them, and that stone's runes
    // wake; within reach the thread holds steady, out of reach it frays. A stone still holding a charge glows red.
    rodstrike: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) {
        let st = null, sd = Infinity;
        for (const pr of env.props || []) if (pr.kind === 'stone') { const d = PROPS.sd(pr, s.x, s.y); if (d < sd) { sd = d; st = pr; } }
        if (!st) return;
        const near = sd <= 70, hot = st.state > 0, col = hot ? '#ff8a6a' : '#9ff4ff';
        glow(ctx, st.x, st.y, st.r + 70, hot ? '#ff5a3a' : '#4fa8e0', (0.12 + 0.2 * p) * k);
        ctx.save(); ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 30;
        circle(ctx, st.x, st.y, st.r + 70, null, rgba(col, (0.3 + 0.4 * p) * k), 2);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = (near ? 0.55 + 0.4 * p : 0.25 + 0.2 * p) * k;
        if (near || Math.floor(t * 10 + tg.id) % 2) jagged(ctx, s.x, s.y - 16, st.x, st.y - 70, Math.floor(t * (near ? 8 : 16)) + tg.id, col, near ? 1.6 + p : 1);
        ctx.restore();
      },
      air(ctx, tg, s, p, k, t, env) {
        let st = null, sd = Infinity;
        for (const pr of env.props || []) if (pr.kind === 'stone') { const d = PROPS.sd(pr, s.x, s.y); if (d < sd) { sd = d; st = pr; } }
        const x = st && sd <= 70 ? st.x : s.x, y = st && sd <= 70 ? st.y : s.y;
        stormCloud(ctx, x, y - 200, 55 + p * 30, (0.3 + 0.5 * p) * k, t, tg.id);
      },
    },
    // Avalanche: the lane rumbles, grit jumping along it, and the boulder comes rolling in from the edge to where it stops
    avalanche: {
      color: '#d8c8a8',
      ground(ctx, tg, s, p, k, t) {
        const c = Math.cos(s.angle), sn = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#5a4a3a', (0.12 + 0.18 * p) * k); ctx.fill(); ctx.clip();
        for (let i = 0; i < 18; i++) {
          const q = (t * (0.8 + 1.6 * p) + hash(i, tg.id)) % 1, along = q * s.len, off = (hash(i, tg.id + 3) - 0.5) * s.w * 0.8;
          const x = s.x + c * along - sn * off, y = s.y + sn * along + c * off, hop = Math.abs(Math.sin(t * 14 + i)) * 6 * p;
          circle(ctx, x, y - hop, 2 + hash(i, 5) * 2.5, rgba('#a89880', 0.7 * k));
        }
        // ruts where it will run
        for (const side of [-0.28, 0.28]) line(ctx, s.x - sn * s.w * side, s.y + c * s.w * side, s.x + c * s.len - sn * s.w * side, s.y + sn * s.len + c * s.w * side, rgba('#2a2018', 0.35 * p * k), 3);
        ctx.restore();
        // lightning running along the lane's edges, and the outline of the boulder where it will come to rest
        const fr = Math.floor(t * 12);
        ctx.save(); ctx.globalAlpha = (0.3 + 0.5 * p) * k;
        for (const side of [-0.5, 0.5]) for (let j = 0; j < 4; j++) {
          if ((fr + j + (side > 0 ? 2 : 0)) % 3 === 0) continue;
          const d0 = j * s.len / 4, d1 = d0 + s.len / 4, ox = -sn * s.w * side, oy = c * s.w * side;
          jagged(ctx, s.x + ox + c * d0, s.y + oy + sn * d0, s.x + ox + c * d1, s.y + oy + sn * d1, fr * 7 + j + tg.id, '#9fd8ff', 1.3);
        }
        ctx.restore();
        const ex = s.x + c * (s.len - 40), ey = s.y + sn * (s.len - 40), rock = [];
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2, m = 38 * (0.85 + 0.2 * hash(i, tg.id)); rock.push(ex + Math.cos(a) * m, ey + Math.sin(a) * m * 0.85); }
        ctx.save(); ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 20;
        poly(ctx, rock, rgba('#9fd0ff', (0.08 + 0.12 * p) * k), rgba('#cfe8ff', (0.45 + 0.4 * p) * k), 2);
        ctx.restore();
      },
      air(ctx, tg, s, p, k, t) {
        const q = clamp((p - 0.72) / 0.28, 0, 1);
        if (q <= 0) return;
        const c = Math.cos(s.angle), sn = Math.sin(s.angle), d = (s.len - 40) * easeIn(q);
        const x = s.x + c * d, y = s.y + sn * d - Math.abs(Math.sin(q * 9)) * 14 * (1 - q);
        ArenaView.boulder(ctx, { x, y, r: 40, id: tg.id });
        void t; void k;
      },
    },
    // Chain Lightning (Hard): a storm cell gathers over its target, and the air crackles out to as far as the bolt can
    // leap; sparks already jump to anyone else inside that ring
    chain: {
      color: '#9ff4ff', outline: false,
      ground(ctx, tg, s, p, k, t, env) {
        glow(ctx, s.x, s.y, s.r, '#4fa8e0', (0.06 + 0.1 * p) * k);
        ctx.save(); ctx.setLineDash([6, 10]); ctx.lineDashOffset = -t * 40;
        circle(ctx, s.x, s.y, s.r, null, rgba('#bff6ff', (0.3 + 0.45 * p) * k), 2);
        ctx.restore();
        for (let i = 0; i < 3; i++) {
          if ((Math.floor(t * 12) + i) % 3 === 0) continue;
          const a = hash(Math.floor(t * 12), i + tg.id) * TAU, r = s.r * (0.3 + 0.6 * hash(i, Math.floor(t * 12)));
          ctx.save(); ctx.globalAlpha = (0.4 + 0.5 * p) * k;
          jagged(ctx, s.x, s.y - 16, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, Math.floor(t * 12) * 7 + i, '#9ff4ff', 1.2);
          ctx.restore();
        }
        for (const u of env.units || []) {
          const d = Math.hypot(u.x - s.x, u.y - s.y);
          if (d < 12 || d > s.r + 14 || Math.floor(t * 14 + u.id) % 2) continue;
          ctx.save(); ctx.globalAlpha = (0.5 + 0.5 * p) * k;
          jagged(ctx, s.x, s.y - 16, u.x, u.y - 16, Math.floor(t * 14) * 3 + u.id, '#ff8a7a', 1.4 + p);
          ctx.restore();
        }
      },
      air(ctx, tg, s, p, k, t) { stormCloud(ctx, s.x, s.y - 170 + p * 30, 60 + p * 25, (0.5 + 0.4 * p) * k, t, tg.id); },
    },
    // Heavens Fall: a rune circle for the column of sky, four great arrowheads pointing in, and the clouds over it
    // opening as it comes down
    heavens: {
      color: '#ffd84a', outline: false,
      ground(ctx, tg, s, p, k, t) {
        ArenaView.stackMarker(ctx, s, p, k, t);
        const R = s.r + 36, spin = t * 0.3;
        glow(ctx, s.x, s.y, R * 1.2, '#7fd8ff', (0.1 + 0.2 * p) * k);
        circle(ctx, s.x, s.y, R, null, rgba('#9fe4ff', (0.45 + 0.4 * p) * k), 2.5);
        circle(ctx, s.x, s.y, R + 14, null, rgba('#9fe4ff', (0.25 + 0.3 * p) * k), 1.2);
        for (let i = 0; i < 24; i++) { const a = spin + i * TAU / 24, l = i % 6 ? 5 : 14; line(ctx, s.x + Math.cos(a) * R, s.y + Math.sin(a) * R, s.x + Math.cos(a) * (R + l), s.y + Math.sin(a) * (R + l), rgba('#cff2ff', (0.45 + 0.4 * p) * k), 1.5); }
        for (let i = 0; i < 4; i++) {
          const a = -spin + i * TAU / 4, x = s.x + Math.cos(a) * (R + 30), y = s.y + Math.sin(a) * (R + 30), ux = -Math.cos(a), uy = -Math.sin(a);
          poly(ctx, [x + ux * 20, y + uy * 20, x - uy * 14, y + ux * 14, x - ux * 2, y - uy * 2, x + uy * 14, y - ux * 14], rgba('#dff6ff', (0.55 + 0.4 * p) * k), rgba('#0a1a2a', 0.7 * k), 1.5);
        }
      },
      air(ctx, tg, s, p, k, t) {
        stormCloud(ctx, s.x, s.y - 250, 110 + 40 * p, (0.4 + 0.5 * p) * k, t, tg.id);
        if (p > 0.45) {
          const w = s.r * 0.7 * (p - 0.45) / 0.55, g = ctx.createLinearGradient(0, s.y - 240, 0, s.y);
          g.addColorStop(0, rgba('#dff4ff', 0)); g.addColorStop(1, rgba('#dff4ff', 0.35 * (p - 0.45) / 0.55 * k));
          ctx.fillStyle = g; ctx.fillRect(s.x - w, s.y - 240, w * 2, 240);
        }
      },
    },
    // Skyfall (Hard): the clouds open over one spot; the light thickens there and rings of falling air close in on it.
    // The fainter the floor, the safer.
    skyfall: {
      outline: false,
      ground(ctx, tg, s, p, k, t) {
        const R = 520;   // its falloff (volkar.js)
        const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, R);
        g.addColorStop(0, rgba('#cfeaff', (0.25 + 0.35 * p) * k)); g.addColorStop(0.35, rgba('#7fb8e8', (0.1 + 0.12 * p) * k)); g.addColorStop(1, 'rgba(60,110,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.fill();
        for (let i = 0; i < 4; i++) {
          const q = 1 - ((t * (0.5 + p) + i / 4) % 1);
          circle(ctx, s.x, s.y, 30 + q * R * 0.8, null, rgba('#e8f6ff', 0.3 * (1 - q) * k), 2 + 2 * p);
        }
        circle(ctx, s.x, s.y, 40 + 30 * p, null, rgba('#ffffff', (0.4 + 0.5 * p) * k), 3);
      },
      air(ctx, tg, s, p, k, t) {
        stormCloud(ctx, s.x, s.y - 230, 110 + p * 50, (0.45 + 0.45 * p) * k, t, tg.id);
        if (p > 0.6) glow(ctx, s.x, s.y - 120, 40 + (p - 0.6) * 160, '#e8f6ff', (p - 0.6) * 1.4 * k);
      },
    },
  };

  // ------------------------------------------------------------------ the Hollow King
  // grave-light rising out of the floor across an area (his swings, and the knights' replays in brighter green)
  function graveLight(ctx, s, p, k, t, col, seed) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ctx.fillStyle = `rgba(4,10,8,${(0.25 + 0.3 * p) * k})`; ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
    for (let i = 0; i < 26; i++) {
      const q = (t * 0.7 + hash(i, seed)) % 1;
      let x, y;
      if (s.kind === 'cone') { const a = s.angle + (hash(i, seed + 1) - 0.5) * s.arc, d = 60 + hash(i, seed + 2) * Math.min(s.r, AR() * 1.3); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      else if (s.kind === 'donut') { const a = hash(i, seed + 1) * TAU, d = s.r2 + 20 + hash(i, seed + 2) * (AR() - s.r2); x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      else if (s.kind === 'rect') { const d = hash(i, seed + 1) * Math.min(s.len, AR() * 2), o = (hash(i, seed + 2) - 0.5) * s.w; x = s.x + Math.cos(s.angle) * d - Math.sin(s.angle) * o; y = s.y + Math.sin(s.angle) * d + Math.cos(s.angle) * o; }
      else { const a = hash(i, seed + 1) * TAU, d = Math.sqrt(hash(i, seed + 2)) * s.r; x = s.x + Math.cos(a) * d; y = s.y + Math.sin(a) * d; }
      glow(ctx, x, y - q * 26, 16 + p * 12, col, (0.2 + 0.4 * p) * (1 - q) * k);
    }
    ctx.restore();
  }
  // a ghostly hand reaching up out of the floor (Crown of Graves)
  function graveHand(ctx, x, y, h, a, col = '#aaf0c8') {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    glow(ctx, x, y - h * 0.5, 16, col, 0.35);
    limb(ctx, [x, y, x + 2, y - h * 0.6], rgba(col, 0.8), 5);
    for (let f = -2; f <= 2; f++) line(ctx, x + 2, y - h * 0.6, x + 2 + f * 3, y - h * 0.6 - 8 - (2 - Math.abs(f)) * 3, rgba(col, 0.9), 2);
    ctx.restore();
  }
  // his three swings each have a colour of their own, so they can be told apart at a glance: the Sceptre Sweep gold,
  // the Barrow Stomp cold teal, the Crown of Graves violet. The knights' replays are the pale blue of a memory.
  const SWING = { sweep: '#e8c15a', stomp: '#4fe0d0', ring: '#a070ff' }, ECHO = '#9fd0ff';
  const swingCol = tg => tg.tag[0] === 'e' ? ECHO : SWING[tg.tag] || '#5adf8a';
  // under every hero, a cone the way they face; red if they're caught: facing him (the Gaze), or not (the Audience)
  function facingArcs(ctx, p, k, env, caughtFacing) {
    const b = env.boss;
    for (const u of env.units || []) {
      if (u.a == null) continue;
      let d = Math.atan2(b.y - u.y, b.x - u.x) - u.a;
      while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      const caught = (Math.abs(d) < 1.2) === caughtFacing, col = caught ? '#ff5a4a' : '#d8ffe4';
      const R = 95, kk = k * (0.55 + 0.45 * p);
      ctx.save(); ctx.translate(u.x, u.y);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, u.a - 1.2, u.a + 1.2); ctx.closePath();
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, R);
      g.addColorStop(0, rgba(col, (caught ? 0.6 : 0.34) * kk)); g.addColorStop(1, rgba(col, (caught ? 0.12 : 0.04) * kk));
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, R, u.a - 1.2, u.a + 1.2);
      ctx.strokeStyle = rgba(col, (caught ? 0.9 : 0.5) * kk); ctx.lineWidth = caught ? 3 : 2; ctx.stroke();
      ctx.restore();
    }
  }
  const K = {
    // Barrow Knell: the hall darkens and the toll rolls out from him in rings
    knell: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        const R = AR(), b = env.boss;
        ctx.save(); ctx.fillStyle = `rgba(4,8,10,${(0.1 + 0.3 * easeIn(p)) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore();
        for (let i = 0; i < 3; i++) {
          const q = (t * 0.6 + i / 3) % 1;
          ellipse(ctx, b.x, b.y, 80 + q * R, (80 + q * R) * 0.9, 0, null, rgba('#c8ffdc', 0.22 * (1 - q) * k * (0.4 + 0.6 * p)), 3);
        }
      },
      // a ghost bell of grave-light over him, swinging harder as the toll nears
      air(ctx, tg, s, p, k, t, env) {
        const b = env.boss, sw = Math.sin(t * (2 + p * 5)) * (0.12 + 0.35 * p);
        ctx.save(); ctx.globalAlpha = k * (0.4 + 0.5 * p); ctx.translate(b.x + 110, b.y - 150); ctx.rotate(sw);
        glow(ctx, 0, 40, 70, '#5adf8a', 0.35 + 0.3 * p);
        poly(ctx, [-10, 0, 10, 0, 24, 48, 34, 64, -34, 64, -24, 48], 'rgba(120,255,170,0.35)', 'rgba(200,255,220,0.9)', 2.5);
        poly(ctx, [-6, 6, 2, 6, 7, 48, -12, 48], 'rgba(230,255,240,0.3)');
        ellipse(ctx, 0, 64, 34, 8, 0, null, 'rgba(220,255,230,0.8)', 2);
        circle(ctx, 0, 72, 7, 'rgba(160,255,200,0.6)', 'rgba(220,255,230,0.9)', 1.5);
        ctx.restore();
      },
    },
    // Royal Gaze: an eye opens over him; under every hero, the way they're facing, red if they'd meet his eyes
    gaze: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) { facingArcs(ctx, p, k, env, true); },
      air(ctx, tg, s, p, k, t, env) {
        const b = env.boss, y = b.y - 175, open = easeOut(Math.min(1, p * 1.3));
        ctx.save(); ctx.globalAlpha = k;
        glow(ctx, b.x, y, 90 + 40 * p, '#e8fff0', 0.3 + 0.4 * p);
        ctx.beginPath(); ctx.ellipse(b.x, y, 52, 24 * open + 0.5, 0, 0, TAU);
        ctx.fillStyle = 'rgba(10,20,14,0.9)'; ctx.fill(); ctx.strokeStyle = rgba('#e8fff0', 0.95); ctx.lineWidth = 3.5; ctx.stroke();
        if (open > 0.15) { circle(ctx, b.x, y, 14 * open, '#6dff9a'); circle(ctx, b.x, y, 6 * open, '#ffffff'); }
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t * 0.4; line(ctx, b.x + Math.cos(a) * 64, y + Math.sin(a) * 34, b.x + Math.cos(a) * (76 + 14 * p), y + Math.sin(a) * (42 + 8 * p), rgba('#e8fff0', 0.6), 2.5); }
        ctx.restore();
      },
    },
    // Royal Audience (Hard): his crown blazes gold over him; the same cones under every hero, red now if their back
    // is turned on the king
    audience: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) { facingArcs(ctx, p, k, env, false); },
      air(ctx, tg, s, p, k, t, env) {
        const b = env.boss, y = b.y - 175, rise = easeOut(Math.min(1, p * 1.3));
        ctx.save(); ctx.globalAlpha = k;
        glow(ctx, b.x, y, 90 + 50 * p, '#ffe6a0', 0.3 + 0.45 * p);
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + (i / 8) * Math.PI, rx = 58, ry = 26, x0 = b.x + Math.cos(a) * rx, y0 = y + 10 + Math.sin(a) * ry * 0.4;
          const h = (18 + (i % 2 ? 10 : 22)) * rise;
          poly(ctx, [x0 - 7, y0, x0, y0 - h, x0 + 7, y0], rgba('#e8c15a', 0.95), OUT, 2);
        }
        rrect(ctx, b.x - 62, y + 8, 124, 12, 4, '#b89a4a', OUT, 2.5);
        for (let i = 0; i < 5; i++) circle(ctx, b.x - 44 + i * 22, y + 14, 3.5, i % 2 ? '#6dff9a' : '#ff6a5a', OUT, 1);
        ctx.restore();
      },
    },
    // Funeral March (Hard): a rank of his dead, spears levelled, tramps across the hall; grave-light pools where it treads
    march: {
      color: '#c8ffd8',
      ground(ctx, tg, s, p, k, t) {
        graveLight(ctx, s, p, k, t, '#5adf8a', tg.id);
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), n = Math.max(1, Math.floor(s.w / 46));
        const front = s.len * (0.3 + 0.4 * easeIn(p));
        // pale chevrons marching down the lane the way the rank will tramp
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        for (let d = (t * 120) % 110, row = 0; d < s.len; d += 110, row++) for (let j = 0; j < Math.max(1, Math.floor(s.w / 80)); j++) {
          const off = -s.w / 2 + (j + 0.5) * s.w / Math.max(1, Math.floor(s.w / 80)), x = s.x + ca * d - sa * off, y = s.y + sa * d + ca * off;
          const P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v];
          poly(ctx, [...P(14, 0), ...P(-6, 16), ...P(-2, 0), ...P(-6, -16)], rgba('#9affd8', (0.2 + 0.4 * p) * k), rgba('#0a1a14', 0.5 * k), 1.2);
        }
        ctx.restore();
        ctx.save(); ctx.globalAlpha = (0.3 + 0.55 * p) * k;
        for (let i = 0; i < n; i++) {
          const off = -s.w / 2 + (i + 0.5) * s.w / n, bob = Math.sin(t * 8 + i * 1.3) * 2;
          const x = s.x + ca * front - sa * off, y = s.y + sa * front + ca * off + bob;
          ellipse(ctx, x, y, 12, 15, s.angle, 'rgba(120,200,160,0.55)', 'rgba(200,255,220,0.8)', 1.5);
          circle(ctx, x + ca * 4, y + sa * 4 - 10, 7, 'rgba(170,240,200,0.6)', 'rgba(220,255,230,0.9)', 1.2);
          line(ctx, x - ca * 10, y - sa * 10 - 4, x + ca * 34, y + sa * 34 - 4, 'rgba(220,255,230,0.85)', 1.8);
        }
        ctx.restore();
      },
    },
    // Sceptre Sweep: the floor in front of him goes dark, gold light streams along it and arcs of it sweep across
    sweep: {
      color: '#c8ffd8',
      ground(ctx, tg, s, p, k, t) {
        const col = swingCol(tg);
        graveLight(ctx, s, p, k, t, col, tg.id);
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const q = (t * 0.5 + i / 4) % 1, r = 90 + q * Math.min(s.r, AR());
          ctx.beginPath(); ctx.arc(s.x, s.y, r, s.angle - s.arc / 2, s.angle + s.arc / 2);
          ctx.strokeStyle = rgba(col, (0.15 + 0.4 * p) * Math.sin(q * Math.PI) * k); ctx.lineWidth = 3; ctx.stroke();
        }
        ctx.restore();
      },
    },
    // Barrow Stomp: the stone around him cracks and green fire licks at the rim
    stomp: {
      color: '#c8ffd8',
      ground(ctx, tg, s, p, k, t) {
        const col = swingCol(tg);
        graveLight(ctx, s, p, k, t, col, tg.id);
        // cracks spreading out through the flagstones
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < 10; i++) {
          const len = s.r * Math.min(1, p * 1.4);
          let a = i * TAU / 10 + hash(i, tg.id), x = s.x, y = s.y;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let n = 1; n <= 5; n++) { a += (hash(i * 7 + n, tg.id) - 0.5) * 0.7; x += Math.cos(a) * len / 5; y += Math.sin(a) * len / 5; ctx.lineTo(x, y); }
          ctx.strokeStyle = `rgba(6,14,10,${0.75 * k})`; ctx.lineWidth = 4; ctx.stroke();
          ctx.strokeStyle = rgba(col, 0.55 * k * p); ctx.lineWidth = 1.8; ctx.stroke();
        }
        ctx.restore();
      },
    },
    // Crown of Graves: hands reach up out of the floor everywhere except close around him
    ring: {
      color: '#c8ffd8',
      ground(ctx, tg, s, p, k, t) {
        const col = swingCol(tg);
        graveLight(ctx, s, p, k, t, col, tg.id);
        for (let i = 0; i < 18; i++) {
          const a = hash(i, tg.id + 3) * TAU, d = s.r2 + 40 + hash(i, tg.id + 4) * (AR() - s.r2 - 40);
          const x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
          if (ARENA.sd(x, y) > -20) continue;
          graveHand(ctx, x, y, 16 + 22 * easeIn(p), k * Math.min(1, p * 2), tg.tag[0] === 'e' ? '#cfe8ff' : '#d0b0ff');
        }
        // the safe ring round him, its edge lit
        circle(ctx, s.x, s.y, s.r2, null, rgba(col, (0.35 + 0.4 * p) * k), 2.5);
      },
    },
    // Grave Marks: a rune burns under each hero; keep out of each other's
    marks: {
      color: '#c8ffd8', outline: false,
      ground(ctx, tg, s, p, k, t) {
        ArenaView.spreadMarker(ctx, s, p, k, t);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(t * 0.6);
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4; line(ctx, Math.cos(a) * s.r * 0.35, Math.sin(a) * s.r * 0.35, Math.cos(a) * s.r * 0.75, Math.sin(a) * s.r * 0.75, rgba('#c8ffd8', 0.6 * k), 2); }
        ctx.restore();
      },
    },
    // Barrow Bells: a bronze bell hangs over each circle and starts to swing; the pips show how many it wants
    bell: {
      color: '#ffd88a',
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.4, '#c89a4a', 0.2 * k);
        circle(ctx, s.x, s.y, s.r, rgba('#ffd88a', 0.07 * k), rgba('#ffe2a0', (0.45 + 0.4 * p) * k), 2);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.7 * k); ctx.lineWidth = 2; ctx.stroke();
        const n = tg.need || 1;
        for (let i = 0; i < n; i++) circle(ctx, s.x + (i - (n - 1) / 2) * 16, s.y + s.r + 16, 4.5, rgba('#ffe2a0', 0.9 * k), OUT, 1.5);
      },
      air(ctx, tg, s, p, k, t) {
        const sw = Math.sin(t * (2 + p * 6)) * (0.1 + 0.35 * p), hy = s.y - 150;
        ctx.save(); ctx.globalAlpha = k; ctx.translate(s.x, hy); ctx.rotate(sw);
        line(ctx, 0, -80, 0, 0, 'rgba(40,32,24,0.9)', 2.5);
        poly(ctx, [-8, 0, 8, 0, 18, 40, 26, 52, -26, 52, -18, 40], '#a87a3a', OUT, 2.5);
        poly(ctx, [-5, 4, 2, 4, 6, 40, -10, 40], 'rgba(255,230,170,0.35)');
        rrect(ctx, -28, 50, 56, 6, 3, '#8a6230', OUT, 1.5);
        circle(ctx, 0, 60, 6, '#5a4024', OUT, 1.5);
        ctx.restore();
      },
    },
    // Coffin Lids: a groove scored across the flagstones where the lid will skid, grit jumping along it, and the lid
    // itself shaking loose on its coffin by the wall
    lid: {
      color: '#c8ffd8',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#0c1412', (0.15 + 0.25 * p) * k); ctx.fill(); ctx.restore();
        for (const side of [-0.3, 0.3]) line(ctx, s.x - sa * s.w * side, s.y + ca * s.w * side, s.x + ca * s.len * Math.min(1, p * 1.3) - sa * s.w * side, s.y + sa * s.len * Math.min(1, p * 1.3) + ca * s.w * side, rgba('#0a0e0c', 0.6 * k), 3);
        for (let i = 0; i < 6; i++) { const q = (t * (0.8 + p * 2) + i / 6) % 1; ctx.save(); ctx.translate(s.x + ca * q * s.len, s.y + sa * q * s.len); ctx.rotate(s.angle); poly(ctx, [-8, -12, 8, 0, -8, 12, -3, 0], rgba('#c8ffd8', (0.25 + 0.45 * p) * (1 - q) * k), null); ctx.restore(); }
        // the lid on its coffin, juddering loose (and where it'll stop)
        const j = Math.sin(t * 40) * 2 * p, end = s.len - 65;
        ctx.save(); ctx.globalAlpha = k * (0.5 + 0.5 * p); ctx.translate(s.x + ca * 70 + j, s.y + sa * 70); ctx.rotate(s.angle + Math.PI / 2);
        rrect(ctx, -23, -60, 46, 120, 6, '#525a5e', OUT, 2.5); line(ctx, 0, -40, 0, 30, 'rgba(10,12,12,0.6)', 3); line(ctx, -12, -22, 12, -22, 'rgba(10,12,12,0.6)', 3);
        ctx.restore();
        ctx.save(); ctx.setLineDash([8, 7]); rrect(ctx, s.x + ca * end - 65, s.y - 23, 130, 46, 6, null, rgba('#c8ffd8', (0.25 + 0.4 * p) * k), 1.5); ctx.restore();
      },
    },
    // Royal Decree: grave-light rolls down the hall from the throne in a wall, and every solid thing's shadow is cut
    // out of it (they run straight down the hall)
    decree: {
      color: '#9affc0', outline: false,
      ground(ctx, tg, s, p, k, t) {
        const top = -ARENA.hh - 20, front = top + (ARENA.hh * 2 + 40) * easeOut(p);
        const g = ctx.createLinearGradient(0, top, 0, ARENA.hh);
        g.addColorStop(0, rgba('#3aff7a', (0.3 + 0.15 * p) * k)); g.addColorStop(1, rgba('#3aff7a', (0.1 + 0.12 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(-ARENA.hw - 20, top, ARENA.hw * 2 + 40, ARENA.hh * 2 + 40);
        // the front of the wave, reaching further as the cast goes on
        ctx.fillStyle = rgba('#c8ffd8', 0.12 * k); ctx.fillRect(-ARENA.hw - 20, top, ARENA.hw * 2 + 40, front - top);
        line(ctx, -ARENA.hw - 20, front, ARENA.hw + 20, front, rgba('#e8fff0', (0.4 + 0.4 * p) * k), 3);
        for (let i = 0; i < 16; i++) { const x = -ARENA.hw + (i + 0.5) / 16 * ARENA.hw * 2, q = (t * 0.8 + hash(i, 4)) % 1; glow(ctx, x, top + q * (front - top), 18, '#7affa8', 0.4 * (1 - q) * k); }
      },
    },
    // Falling Masonry (Hard): dust and grit sift down where a chunk of the vault is about to fall, its shadow tightening
    masonry: {
      color: '#d8e0dc',
      ground(ctx, tg, s, p, k, t) {
        shadow(ctx, s.x, s.y, s.r * (0.5 + 0.5 * p), (0.3 + 0.35 * p) * k);
        for (let i = 0; i < 8; i++) { const q = (t * 1.4 + hash(i, tg.id)) % 1, a = hash(i + 3, tg.id) * TAU, d = hash(i + 6, tg.id) * s.r; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - (1 - q) * 120, 1.5, rgba('#d8e0dc', 0.7 * q * k)); }
      },
      air(ctx, tg, s, p, k) {
        if (p < 0.7) return;
        const h = (1 - (p - 0.7) / 0.3) * 320;
        ctx.save(); ctx.globalAlpha = k; ctx.translate(s.x, s.y - h - 20); ctx.rotate(p * 3);
        poly(ctx, [-30, -14, -6, -28, 26, -18, 32, 10, 4, 26, -26, 16], '#4a5054', OUT, 2.5);
        ctx.restore();
      },
    },
  };
  for (const kind of ['sweep', 'stomp', 'ring']) {
    // the knights' replays: the same thing in the brighter green of the dead
    const base = K[kind];
    K['e' + kind] = { color: '#9fd0ff', ground(ctx, tg, s, p, k, t, env) {
      base.ground(ctx, tg, s, p, k, t, env);
      ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#6ab8ff', (0.05 + 0.1 * p) * k); ctx.fill(); ctx.restore();
    } };
  }

  // Titan Fist's mark: the outline of a great stone fist on the floor, knuckles toward where it's headed
  function fistMark(ctx, x, y, ang, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const trace = () => {
      ctx.beginPath(); ctx.moveTo(-26, -20); ctx.lineTo(14, -22);
      for (let i = 0; i < 4; i++) { const y0 = -22 + i * 11; ctx.quadraticCurveTo(28, y0, 26, y0 + 5.5); ctx.quadraticCurveTo(28, y0 + 11, 14, y0 + 11); }
      ctx.lineTo(-26, 22); ctx.closePath();
      ctx.moveTo(-6, 22); ctx.quadraticCurveTo(-2, 30, 8, 26);   // the thumb
      for (let i = 1; i < 4; i++) { ctx.moveTo(14, -22 + i * 11); ctx.lineTo(2, -22 + i * 11); }
    };
    trace(); ctx.strokeStyle = rgba('#0a1a2a', 0.6 * a); ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = rgba('#7fe8ff', a); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();
  }
  // tankbusters: Grubnak's chop lines, or Skitterra's silk gathering on the tank
  const buster = {
    color: '#ff6a5a',
    ground(ctx, tg, s, p, k, t, env) {
      const tgt = tg.target != null ? env.entById(tg.target) : null;
      ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#ff4a3a', (0.06 + 0.1 * p) * k); ctx.fill(); ctx.restore();
      if (env.bossId === 'volkar') {
        // Titan Fist: lightning gathers along the cone and runs to the tank
        for (let i = 0; i < 5; i++) {
          const a = s.angle - s.arc / 2 + ((i + 0.5) / 5) * s.arc, q = (t * 1.6 + i * 0.29) % 1, d0 = 70 + q * (s.r - 110);
          if (Math.floor(t * 12 + i) % 3) jagged(ctx, s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0, s.x + Math.cos(a) * (d0 + 50), s.y + Math.sin(a) * (d0 + 50), Math.floor(t * 12) + i, '#7fe8ff', 1.2);
        }
        if (tgt && p > 0.6) glow(ctx, tgt.x, tgt.y - 10, 30, '#7fe8ff', (p - 0.6) * 1.5 * k);
        // lightning running down both edges of the cone, and the fist's outline on the floor under the tank
        const fr = Math.floor(t * 12);
        ctx.save(); ctx.globalAlpha = (0.35 + 0.5 * p) * k;
        for (const side of [-1, 1]) {
          const a = s.angle + side * s.arc / 2;
          for (let j = 0; j < 3; j++) {
            if ((fr + j + side) % 3 === 0) continue;
            const d0 = 60 + j * (s.r - 60) / 3, d1 = d0 + (s.r - 60) / 3;
            jagged(ctx, s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0, s.x + Math.cos(a) * d1, s.y + Math.sin(a) * d1, fr * 5 + j + side, '#7fe8ff', 1.6);
          }
        }
        ctx.restore();
        if (tgt) fistMark(ctx, tgt.x, tgt.y, s.angle, (0.35 + 0.55 * p) * k);
        return;
      }
      if (env.bossId === 'hollowking') {
        // Grave Cleave: grave-light gathers along the greatsword's path and pools under the tank
        for (let i = 0; i < 6; i++) {
          const a = s.angle - s.arc / 2 + ((i + 0.5) / 6) * s.arc, q = (t * 1.2 + i * 0.31) % 1, d = 70 + q * (s.r - 100);
          glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 16, '#5adf8a', 0.5 * (1 - q) * k);
        }
        if (tgt && p > 0.5) glow(ctx, tgt.x, tgt.y, 40, '#ff5a4a', (p - 0.5) * k);
        // the cone's edges traced in violet, runes burning along its middle
        ctx.save(); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x + Math.cos(s.angle - s.arc / 2) * 60, s.y + Math.sin(s.angle - s.arc / 2) * 60); ctx.lineTo(s.x + Math.cos(s.angle - s.arc / 2) * s.r, s.y + Math.sin(s.angle - s.arc / 2) * s.r);
        ctx.moveTo(s.x + Math.cos(s.angle + s.arc / 2) * 60, s.y + Math.sin(s.angle + s.arc / 2) * 60); ctx.lineTo(s.x + Math.cos(s.angle + s.arc / 2) * s.r, s.y + Math.sin(s.angle + s.arc / 2) * s.r);
        ctx.strokeStyle = rgba('#b46aff', (0.4 + 0.5 * p) * k); ctx.lineWidth = 3; ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const d = 80 + i * (s.r - 110) / 5, x = s.x + Math.cos(s.angle) * d, y = s.y + Math.sin(s.angle) * d, on = (p * 8 - i) > 0;
          if (!on) continue;
          ctx.save(); ctx.translate(x, y); ctx.rotate(s.angle + i);
          ctx.strokeStyle = rgba('#d8b0ff', (0.5 + 0.4 * p) * k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(0, 8); ctx.lineTo(8, -8); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        return;
      }
      if (env.bossId === 'skitterra') {
        if (!tgt) return;
        // Silk Wrap: a cage of silk spun round the tank on two threads from her fangs, tightening as the cast runs out
        const b = env.boss, cx = tgt.x, cy = tgt.y - 24, R = 74 - 28 * easeOut(p), RY = R * 1.25, spin = t * (1.2 + p * 3);
        const mx = b.x + Math.cos(b.f) * 70, my = b.y + Math.sin(b.f) * 70 - 30;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(mx, my);
          ctx.quadraticCurveTo((mx + cx) / 2 + side * 16 * Math.sin(t * 3), (my + cy - RY) / 2 - 20, cx, cy - RY);
          ctx.strokeStyle = rgba('#f4f0ff', (0.4 + 0.4 * p) * k); ctx.lineWidth = 1.6; ctx.stroke();
        }
        glow(ctx, cx, cy, R * 1.3, '#f4f0ff', (0.08 + 0.2 * p) * k);
        for (const dir of [1, -1]) for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          for (let j = 0; j <= 16; j++) {
            const u = j / 16, ph = spin * dir + i * TAU / 6 + dir * u * 2.4, w = R * Math.sin(Math.PI * u);
            const x = cx + w * Math.sin(ph), y = cy - RY + 2 * RY * u + w * 0.22 * Math.cos(ph);
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = rgba('#f4f0ff', (0.3 + 0.55 * p) * k); ctx.lineWidth = 1.6; ctx.stroke();
        }
        ctx.restore();
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
    if (env.bossId === 'volkar') return V[tg.tag] || null;
    if (env.bossId === 'hollowking') return K[tg.tag] || null;
    return G[tg.tag] || null;
  }
  // under everyone (called inside the arena clip)
  function ground(ctx, tg, s, p, k, t, env) {
    const tell = get(tg, env);
    if (!tell) return false;
    k *= ghost(tg, env);
    // a blast you can hide from: drawn with every cover prop's shadow cut out of it, so the safe floor shows as the
    // room's own lit tiles behind each prop
    const shadows = tg.cover ? coverShadows(tg, env) : null;
    if (shadows) { ctx.save(); clipOut(ctx, shadows); }
    if (tg.type === 'raidwide') { if (tell.ground) tell.ground(ctx, tg, s, p, k, t, env); }
    else {
      if (tell.ground) tell.ground(ctx, tg, s, p, k, t, env);
      if (tell.outline !== false) outline(ctx, tg, s, p, k, t, env, tell);
    }
    if (shadows) { ctx.restore(); shadowRims(ctx, shadows, p, k, t, tell.color || '#ffffff'); }
    return true;
  }
  // the shadows behind every cover prop, seen from the blast's source
  function coverShadows(tg, env) {
    const [sx, sy] = tg.cover, out = [];
    for (const pr of env.props || []) if (pr.cover) { const poly = PROPS.shadowPoly(sx, sy, pr); if (poly) out.push(poly); }
    return out;
  }
  // clip to everything outside the shadows: one even-odd clip per shadow, so overlapping shadows stay cut out
  function clipOut(ctx, shadows) {
    for (const sh of shadows) {
      ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 8000);
      sh.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.clip('evenodd');
    }
  }
  // A chain of the same move (Eightfold Lunge's legs, Whisk's crosses, Simmer's waves): the one landing next is drawn
  // full strength, the one after it as a ghost, anything later fainter still.
  function ghost(tg, env) {
    if (!env.tgs) return 1;
    const at = tg.start + tg.dur;
    let ahead = 0;
    for (const o of env.tgs.values()) if (o !== tg && o.tag === tg.tag && o.gone == null && o.start + o.dur < at - 0.05) ahead++;
    return ahead === 0 ? 1 : ahead === 1 ? 0.45 : 0.22;
  }
  // the safe patch behind each prop: a faint warm lift on the floor and bright edges along the shadow's sides
  function shadowRims(ctx, shadows, p, k, t, color) {
    ctx.save();
    for (const sh of shadows) {
      ctx.beginPath(); sh.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = rgba('#fff2d0', (0.05 + 0.05 * p) * k); ctx.fill();
      for (const [a, b] of [[0, 1], [3, 2]]) {
        ctx.beginPath(); ctx.moveTo(sh[a][0], sh[a][1]); ctx.lineTo(sh[b][0], sh[b][1]);
        ctx.strokeStyle = rgba(color, (0.35 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
      }
    }
    ctx.restore();
    void t;
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
      const p = clamp((t - tg.start) / tg.dur, 0, 1), k = fade(tg, t) * ghost(tg, env);
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
  // Ball Lightning (Volkar, Hard): a knot of crackling light with a white core
  function orb(ctx, x, y, r, t, seed, a = 1) {
    shadow(ctx, x + 4, y + r * 0.6, r * 0.9, 0.3 * a);
    const cy = y - r * 0.7 + Math.sin(t * 3 + seed) * 4;
    glow(ctx, x, cy, r * 2.2, '#4fa8e0', 0.35 * a);
    glow(ctx, x, cy, r * 1.2, '#9ff4ff', 0.6 * a);
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < 4; i++) {
      if ((Math.floor(t * 16) + i) % 3 === 0) continue;
      const ang = hash(Math.floor(t * 16), i + seed) * TAU;
      jagged(ctx, x, cy, x + Math.cos(ang) * r * 1.4, cy + Math.sin(ang) * r * 1.4, Math.floor(t * 16) * 5 + i + seed, '#dffbff', 1.3);
    }
    circle(ctx, x, cy, r * 0.42, '#ffffff');
    ctx.restore();
  }
  // r: { x, y, a, sp, r, delay, start, tag } (client clock)
  function drawRollers(ctx, rollers, t, env) {
    for (const [id, m] of rollers) {
      const rollAt = m.start + m.delay, end = rollAt + (2 * AR() + 300) / m.sp;
      if (t > end) { rollers.delete(id); continue; }
      const ca = Math.cos(m.a), sa = Math.sin(m.a);
      if (m.tag === 'orb') {
        // it gathers out of the air at the cliff edge, crackles in place (chevrons show its heading), then drifts
        const d = Math.max(0, t - rollAt) * m.sp, x = m.x + ca * d, y = m.y + sa * d;
        if (ARENA.sd(x, y) > m.r + 40) continue;
        const form = clamp((t - m.start) / 0.6, 0, 1);
        if (t < rollAt) {
          const q = (t - m.start) / Math.max(0.1, m.delay);
          {
            ctx.save(); ARENA.trace(ctx); ctx.clip();
            ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 30;
            for (const side of [-1, 1]) line(ctx, m.x - sa * m.r * side, m.y + ca * m.r * side, m.x - sa * m.r * side + ca * AR() * 2, m.y + ca * m.r * side + sa * AR() * 2, rgba('#9ff4ff', 0.28), 2);
            ctx.restore();
          }
          for (let i = 0; i < 3; i++) {
            const dd = m.r + 24 + i * 26 + ((t * 40) % 26);
            ctx.save(); ctx.translate(m.x + ca * dd, m.y + sa * dd); ctx.rotate(m.a);
            poly(ctx, [-7, -12, 7, 0, -7, 12, -3, 0], rgba('#bff6ff', (0.3 + 0.5 * q) * (1 - i * 0.25)), null);
            ctx.restore();
          }
        }
        orb(ctx, x, y, m.r * (0.4 + 0.6 * easeOut(form)), t, id, form);
        continue;
      }
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
        // which way it'll roll: a grease streak in front and a faint lane across the room
        {
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
      // it reaches the far wall: it bursts there and leaves its gravy trail (once)
      if (!m.walled && d > 120 && ARENA.sd(x, y) > -m.r * 0.8) { m.walled = true; if (typeof BOSS_VFX !== 'undefined') BOSS_VFX.meatballWall(x, y, m.a, m.x, m.y); }
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
        // the hook landing: a white ring snapping out from them
        const hk = (t - rl.start - 0.35) / 0.3;
        if (hk < 1) { glow(ctx, e.x, e.y - 18, 34, '#ffffff', 0.6 * (1 - hk)); circle(ctx, e.x, e.y - 10, 16 + hk * 34, null, `rgba(255,255,255,${0.85 * (1 - hk)})`, 2.5); }
        // silk bundling around the hooked player's feet
        for (let i = 0; i < 3; i++) ellipse(ctx, e.x, e.y + 2 - i * 5, 20 - i * 3, 8 - i, Math.sin(t * 3 + i) * 0.3, null, `rgba(240,240,255,${pulling ? 0.75 : 0.4})`, 2);
      }
    }
  }

  // ------------------------------------------------------------------ Storm Walls (Volkar)
  // Walls of wind turning around him: a pale band full of streaks blowing outward, brightest on the side it's turning
  // toward. They form while he casts, then turn; Normal also draws the wall's exact edge.
  function drawSweeps(ctx, sweeps, t, env) {
    if (!sweeps.size) return;
    const L = AR() * 2 + 100;
    ctx.save(); ARENA.trace(ctx, 4); ctx.clip();
    for (const sw of sweeps.values()) {
      const form = clamp((t - sw.start) / Math.max(0.2, sw.at - sw.start), 0, 1);
      const k = Math.min(form, Math.max(0, (sw.end - t) / 0.5));
      if (k <= 0) continue;
      const live = t >= sw.at, a0 = sw.a0 + Math.max(0, t - sw.at) * sw.spin, dir = Math.sign(sw.spin) || 1;
      // still air behind the boulders (Avalanche): the walls are drawn with each one's shadow cut out
      const shadows = [];
      if (sw.cover) for (const pr of env.props || []) if (pr.kind === sw.cover) { const sh = PROPS.shadowPoly(sw.x, sw.y, pr); if (sh) shadows.push(sh); }
      ctx.save();
      if (shadows.length) clipOut(ctx, shadows);
      for (let n = 0; n < sw.arms; n++) {
        const a = a0 + n * TAU / sw.arms, c = Math.cos(a), s = Math.sin(a), hw = sw.w / 2;
        const shape = { kind: 'rect', x: sw.x - c * 10, y: sw.y - s * 10, angle: a, len: L, w: sw.w };
        ctx.save();
        SHAPES.trace(ctx, shape);
        ctx.fillStyle = rgba('#cfe6ff', (live ? 0.13 : 0.06) * k); ctx.fill();
        ctx.clip();
        // streaks of wind blowing outward along the wall
        for (let i = 0; i < 22; i++) {
          const q = (t * (live ? 1.3 : 0.6) + hash(i, n + 3)) % 1, along = 80 + q * (L - 80), off = (hash(i, n + 9) - 0.5) * sw.w * 0.9;
          const x = sw.x + c * along - s * off, y = sw.y + s * along + c * off;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c * 46, y + s * 46);
          ctx.strokeStyle = rgba('#f0f8ff', (live ? 0.45 : 0.2) * k * Math.sin(q * Math.PI)); ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
        // the leading edge, where it hits
        const ex = -s * hw * dir, ey = c * hw * dir;
        ctx.beginPath(); ctx.moveTo(sw.x + ex, sw.y + ey); ctx.lineTo(sw.x + ex + c * L, sw.y + ey + s * L);
        ctx.strokeStyle = rgba('#e8f4ff', (live ? 0.7 : 0.3) * k); ctx.lineWidth = live ? 3 : 1.5; ctx.stroke();
        { ctx.save(); ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 30; SHAPES.trace(ctx, shape); ctx.strokeStyle = rgba('#cfe6ff', 0.35 * k); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
        // the wall's body: storm cloud boiling along it, and lightning curtains standing up off its leading edge
        if (live) {
          for (let i = 0; i < 10; i++) { const along = 90 + (i + 0.5) / 10 * (AR() - 90), wob = Math.sin(t * 3 + i * 1.7) * hw * 0.3; glow(ctx, sw.x + c * along - s * wob, sw.y + s * along + c * wob, hw * 0.95, '#6a7894', 0.32 * k); }
          const fr = Math.floor(t * 14);
          for (let i = 0; i < 8; i++) {
            if ((fr + i) % 3 === 0) continue;
            const along = 100 + hash(i, Math.floor(t * 7) + n) * (AR() - 120), x = sw.x + ex + c * along, y = sw.y + ey + s * along;
            jagged(ctx, x, y, x + (hash(i, 3) - 0.5) * 16, y - 60 - hash(i, 5) * 50, fr * 11 + i + n, '#9fe8ff', 1.6);
          }
        }
        // grit tumbling in it
        if (live) for (let i = 0; i < 6; i++) {
          const q = (t * 0.9 + hash(i, n + 20)) % 1, along = 120 + q * (AR() - 140), off = Math.sin(t * 5 + i) * hw * 0.6;
          circle(ctx, sw.x + c * along - s * off, sw.y + s * along + c * off, 2.5, rgba('#8a96a8', 0.8 * k));
        }
      }
      ctx.restore();
      if (shadows.length) shadowRims(ctx, shadows, live ? 1 : 0.4, k, t, '#e8f4ff');
    }
    ctx.restore();
  }

  return { get, ground, air, fade, rims, roleColor, drawRollers, drawReels, drawSweeps, rodPost: (ctx, x, y, t, a) => rodPole(ctx, x, y, t, a, 0.15) };
})();
