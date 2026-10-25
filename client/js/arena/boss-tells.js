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
  // One colour language for every boss: the rim and wash say what the floor means, the art inside (its edges, textures
  // and motion) says whose it is. Red: danger (keep out, or keep it off the others: a spread, a line on you, a pool
  // you carry); a deeper red for a tankbuster. Blue: share it (stand in together: a stack, a tower, a soak).
  // Nothing is painted to say "stand here": safe floor is simply the floor the red doesn't cover, and the players work
  // it out. A circle in a player's own colour (FIGHT.SLOTS) is theirs.
  // (raidwides have no rim: the whole room is the warning; 'safe' mechs are sim data only and draw nothing)
  const COL = { danger: '#ff3b2f', dangerHi: '#ffb4a8', buster: '#ff1f48', share: '#3d8bff', shareHi: '#b4d4ff' };
  const ROLE_RIM = { aoe: COL.danger, proximity: COL.danger, knockback: COL.danger, hook: COL.danger, spread: COL.danger, chain: COL.danger, bait: COL.danger, drop: COL.danger,
    buster: COL.buster, stack: COL.share, tower: COL.share };
  // (a drop can name its own rim: the Dinner Rush's plates are blue, since each will be a plate to share)
  // A room can ask for its own red: on Grubnak's warm orange tiles plain red sinks into the floor, so there the danger
  // turns crimson and every rim gets a dark band under it (COL.casing). Set by ArenaView when the floor is built.
  const DANGER_KEYS = Object.keys(ROLE_RIM).filter(k => ROLE_RIM[k] === COL.danger);
  function setRoom(bossId) {
    const warm = bossId === 'grubnak';
    COL.danger = warm ? '#ff1f5c' : '#ff3b2f'; COL.dangerHi = warm ? '#ffc2d4' : '#ffb4a8';
    COL.casing = warm ? '#1a0408' : null;
    for (const k of DANGER_KEYS) ROLE_RIM[k] = COL.danger;
  }
  const roleColor = (tg, tell) => ((tg.type === 'own' || tg.type === 'drop') && tg.color) || ROLE_RIM[tg.type] || (tell && tell.color) || '#ffffff';
  // The fair-play outline: a solid rim in the role colour and a faint wash sweeping out from the origin as the cast
  // runs, with a bright leading edge. In the last 0.6s the rim pulses; a shape that follows someone flashes white the
  // moment it locks in place. The same on every difficulty.
  function outline(ctx, tg, s, p, k, t, env, tell) {
    if (tg.type === 'safe') return;   // safe floor is never outlined
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
    SHAPES.trace(ctx, s);   // (a donut's hole is left unpainted: only its red ring is drawn)
    if (COL.casing) { ctx.strokeStyle = rgba(COL.casing, 0.7 * k); ctx.lineWidth = 8; ctx.stroke(); }   // (the dark band, on a bright floor)
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
      if (tg.hidden || tg.type === 'raidwide' || tg.type === 'safe' || tg.gone != null) continue;
      const tell = get(tg, env);
      if (tell && tell.outline === false) continue;
      const k = fade(tg, t) * ghost(tg, env);
      if (k <= 0) continue;
      const p = clamp((t - tg.start) / tg.dur, 0, 1), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1);
      SHAPES.trace(ctx, tg.live);
      if (COL.casing) { ctx.strokeStyle = rgba(COL.casing, 0.45 * k); ctx.lineWidth = 4.5; ctx.stroke(); }
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
  // Larder Toss: where a cask comes to rest, the same steps as the host (grubnak.js larderToss): off the wall, out of
  // the stove fire once the Flare-Up has lit it for good, and shoved off any prop it would land on
  function caskRest(s, env) {
    const at = ARENA.clamp({ x: s.x, y: s.y }, 120);
    const st = env.room && env.room.ev && env.room.ev.stove;
    if (st && st.end - st.start > 1000) at.y = Math.max(at.y, -60);   // (the Flare-Up's fire never goes out: 'hot')
    const props = env.props || [];
    for (let i = 0; i < 3; i++) for (const o of props) {
      const dd = Math.hypot(o.x - at.x, o.y - at.y), min = (o.r || 40) + 30 + 26;
      if (dd >= min) continue;
      if (dd < 1) at.x += min; else { const q = (min - dd) / dd; at.x += (at.x - o.x) * q; at.y += (at.y - o.y) * q; }
      ARENA.clamp(at, 120);
    }
    return at;
  }
  // how far a line from (x, y) along angle runs before it meets the wall
  function toWall(x, y, ang, max) {
    const c = Math.cos(ang), s = Math.sin(ang);
    let d = 0;
    while (d < max && ARENA.sd(x + c * d, y + s * d) < -24) d += 16;
    return d;
  }

  // Flare-Up: the burners catch along the stove line and a wall of heat rolls down the kitchen from the top wall: the
  // air shimmers in wavy bands, embers ride it, and the floor behind its front flushes orange (the whole room: a raidwide)
  function heatWave(ctx, tg, p, k, t) {
    const hw = ARENA.hw + 40, top = -ARENA.hh - 40, H = ARENA.hh * 2 + 80, front = top + H * easeOut(Math.min(1, p * 1.15));
    ctx.save();
    const g = ctx.createLinearGradient(0, top, 0, front + 60);
    g.addColorStop(0, rgba('#ff6a1a', (0.22 + 0.16 * p) * k)); g.addColorStop(0.85, rgba('#ff8a2a', (0.1 + 0.1 * p) * k)); g.addColorStop(1, 'rgba(255,138,42,0)');
    ctx.fillStyle = g; ctx.fillRect(-hw, top, hw * 2, front - top + 60);
    // the haze: wavy shimmer lines drifting up through the heat
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y0 = top + ((i / 9 + t * 0.12) % 1) * (front - top);
      ctx.beginPath();
      for (let x = -hw; x <= hw; x += 24) { const y = y0 + Math.sin(x * 0.03 + t * 3 + i) * 6; x === -hw ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = rgba('#ffe0b0', 0.12 * k); ctx.stroke();
    }
    // the front: a bright rolling edge
    ctx.beginPath();
    for (let x = -hw; x <= hw; x += 16) { const y = front + Math.sin(x * 0.02 + t * 4) * 10 + Math.sin(x * 0.05 - t * 2) * 5; x === -hw ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = rgba('#ffd08a', (0.35 + 0.4 * p) * k); ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    // embers riding the wave up and along
    for (let i = 0; i < 40; i++) {
      const x = -ARENA.hw + hash(i, tg.id) * ARENA.hw * 2, q = (t * (0.5 + hash(i, 3)) + hash(i, 5)) % 1, y = front - q * Math.max(60, front - top);
      if (y < top) continue;
      circle(ctx, x + Math.sin(t * 2 + i) * 8, y, 1.6 + hash(i, 7) * 1.8, rgba(i % 3 ? '#ffb040' : '#fff0b0', 0.8 * (1 - q) * k));
    }
  }
  // Last Orders: the bell on the pass rings for last orders: a brass service bell over him, its ring rolling out across
  // the kitchen in gold waves that come faster and harder as it nears (a raidwide: the whole room)
  function orderBell(ctx, tg, p, k, t, env) {
    const b = env.boss, R = AR() * 1.1, rate = 0.5 + 1.6 * easeIn(p);
    ctx.save(); ctx.fillStyle = rgba('#2a1406', (0.08 + 0.2 * easeIn(p)) * k); ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
    for (let i = 0; i < 4; i++) {
      const q = (t * rate + i / 4) % 1, r = 60 + q * R;
      ellipse(ctx, b.x, b.y, r, r * 0.9, 0, null, rgba('#ffd27a', (0.18 + 0.4 * p) * (1 - q) * k), 3 + 5 * p * (1 - q));
      ellipse(ctx, b.x, b.y, r - 6, (r - 6) * 0.9, 0, null, rgba('#fff4d0', 0.2 * (1 - q) * k), 1.2);
    }
  }
  // ... and the bell itself, up beside him: a brass dome on a base, the striker bouncing faster and faster
  function orderBellAir(ctx, tg, p, k, t, env) {
    const b = env.boss, rate = 0.5 + 1.6 * easeIn(p);
    const x = b.x - 120, y = b.y - 150, hit = Math.abs(Math.sin(t * Math.PI * rate)), j = hit > 0.9 ? 2 : 0;
    ctx.save(); ctx.globalAlpha = k * (0.6 + 0.4 * p); ctx.translate(x + Math.sin(t * 70) * j * p, y);
    glow(ctx, 0, -6, 60, '#ffd27a', 0.25 + 0.35 * p * hit);
    rrect(ctx, -30, 6, 60, 9, 3, '#6a4a22', OUT, 2.5);
    ctx.beginPath(); ctx.ellipse(0, 6, 24, 24, 0, Math.PI, TAU); ctx.closePath();
    const gg = ctx.createLinearGradient(-24, -18, 24, 6); gg.addColorStop(0, '#fff0b0'); gg.addColorStop(0.5, '#d8a84a'); gg.addColorStop(1, '#8a6224');
    ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    ellipse(ctx, -9, -8, 4, 7, -0.5, 'rgba(255,255,255,0.6)');
    rrect(ctx, -3, -30 + 6 * hit, 6, 12, 2, '#3a3a42', OUT, 1.5);
    circle(ctx, 0, -32 + 6 * hit, 5, '#5a5a62', OUT, 1.5);
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
    // Lid Slam: outside the hole the tiles shiver and the floor reads red; the hole itself is left unpainted (no
    // shadow, no glints: the floor it spares is just the floor)
    lid: {
      color: '#cfe0ff',
      ground(ctx, tg, s, p, k, t) {
        const r2 = s.r2;
        for (let i = 0; i < 5; i++) {
          const q = (t * (0.5 + p) + i / 5) % 1, rr = r2 + 10 + q * (AR() * 1.1 - r2);
          circle(ctx, s.x, s.y, rr, null, rgba(COL.dangerHi, 0.28 * (1 - q) * k), 2 + 2 * p);
        }
        // the red edge of the hit, stroked on the outside of the hole so not a pixel of it lands inside
        circle(ctx, s.x, s.y, r2 + 1.5, null, rgba(COL.danger, (0.45 + 0.45 * p) * k), 3);
        // glints running round the lip, on the hit side
        for (let i = 0; i < 3; i++) { const a = t * 0.8 + i * 2.1; glow(ctx, s.x + Math.cos(a) * (r2 + 16), s.y + Math.sin(a) * (r2 + 16), 14, '#ffffff', 0.6 * k); }
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
      color: '#3d8bff',
      ground(ctx, tg, s, p, k, t) {
        shadow(ctx, s.x, s.y, s.r * (0.5 + 0.5 * p), (0.25 + 0.3 * p) * k);
        ctx.save(); ctx.setLineDash([8, 8]); ctx.lineDashOffset = t * 20;
        circle(ctx, s.x, s.y, s.r, null, rgba(COL.share, (0.5 + 0.4 * p) * k), 2.5);
        ctx.restore();
        const need = Math.max(1, tg.need || 1);
        for (let i = 0; i < need; i++) { const a = -Math.PI / 2 + (i - (need - 1) / 2) * 0.42; circle(ctx, s.x + Math.cos(a) * (s.r + 14), s.y + Math.sin(a) * (s.r + 14), 6, rgba(COL.shareHi, k), OUT, 1.5); }
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
        ctx.setLineDash([6, 7]); circle(ctx, s.x, s.y, s.r * 0.88, null, COL.share, 3); ctx.setLineDash([]);
        circle(ctx, s.x, s.y, s.r + 1, null, rgba(COL.share, 0.85), 2.5);   // (a soak: the blue rim)
        // the rim fills in as the order comes up
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.strokeStyle = COL.shareHi; ctx.lineWidth = 4; ctx.stroke();
        const need = Math.max(1, tg.need || 1);
        for (let i = 0; i < need; i++) circle(ctx, s.x + (i - (need - 1) / 2) * 14, s.y - s.r - 14, 5, '#e8fffa', OUT, 1.5);
        ctx.restore();
      },
      air(ctx, tg, s, p, k, t) {
        for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3 + tg.id * 0.1) % 1; circle(ctx, s.x + (i - 1) * 14 + Math.sin(t * 2 + i) * 5, s.y - 30 - q * 60, 6 + q * 8, `rgba(240,240,240,${0.35 * (1 - q) * k})`); }
        cloche(ctx, s.x, s.y - 4, s.r * 0.78, 0.9 * k, true);
      },
    },
    // Dinner Rush (Hard): a hot plate held up over the hero, a cloche on it, steaming harder as it nears; under them,
    // the ring where it will be set down (blue: it will be a plate someone serves), a dish shadow growing in it
    platedrop: {
      color: '#3d8bff',
      ground(ctx, tg, s, p, k, t) {
        shadow(ctx, s.x, s.y, s.r * (0.35 + 0.55 * p), (0.2 + 0.3 * p) * k);
        ctx.save(); ctx.setLineDash([6, 7]); ctx.lineDashOffset = -t * 18;
        circle(ctx, s.x, s.y, s.r * 0.72, null, rgba('#efe6cf', (0.3 + 0.4 * p) * k), 2);
        ctx.restore();
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 2.5; ctx.stroke();
      },
      air(ctx, tg, s, p, k, t) {
        const lift = 74 + Math.sin(t * 3 + tg.id) * 3 - 34 * easeIn(p), x = s.x, y = s.y - lift;
        ctx.save(); ctx.globalAlpha = k;
        ellipse(ctx, x, y + 6, 30, 9, 0, '#f6f3ea', OUT, 2.5);
        ellipse(ctx, x, y + 6, 20, 5, 0, '#d8d2c2');
        ctx.restore();
        cloche(ctx, x, y + 4, 22, k, false);
        for (let i = 0; i < 2; i++) { const q = (t * (0.8 + p) + i / 2 + tg.id * 0.2) % 1; circle(ctx, x + (i ? 8 : -8) + Math.sin(t * 2 + i) * 4, y - 22 - q * 34, 4 + q * 6, `rgba(245,245,240,${0.4 * (1 - q) * k})`); }
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
        g.addColorStop(0, rgba(COL.danger, (0.22 + 0.25 * p) * k)); g.addColorStop(0.5, rgba(COL.danger, 0.08 * k)); g.addColorStop(1, 'rgba(255,59,47,0)');
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
        // the exact edges in red and a faint red wash over the coils (they're the art); the cool middle is left unpainted
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); if (r2) ctx.arc(s.x, s.y, r2, 0, TAU, true);
        ctx.fillStyle = rgba(COL.danger, (0.05 + 0.07 * p) * k); ctx.fill();
        circle(ctx, s.x, s.y, s.r - 2, null, rgba(COL.danger, (0.45 + 0.4 * p) * k), 2.5);
        if (r2) circle(ctx, s.x, s.y, r2, null, rgba(COL.danger, (0.4 + 0.4 * p) * k), 2);
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
    // (the Flare-Up's heat and Last Orders share the tag; shape.look says which: grubnak.js)
    grease: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        if (s.look === 'heat') return heatWave(ctx, tg, p, k, t);
        if (s.look === 'orders') return orderBell(ctx, tg, p, k, t, env);
        const b = env.boss, rr = 60 + (AR() - 40) * easeOut(p);
        ctx.save();
        ctx.beginPath();
        // (enough points that the spill's edge stays a smooth wobble even when it's the size of the room, no facets)
        for (let i = 0; i <= 72; i++) { const a = i * TAU / 72, w = 1 + Math.sin(a * 5 + tg.id) * 0.08 + Math.sin(a * 3 + t) * 0.04; i ? ctx.lineTo(b.x + Math.cos(a) * rr * w, b.y + Math.sin(a) * rr * w) : ctx.moveTo(b.x + Math.cos(a) * rr * w, b.y + Math.sin(a) * rr * w); }
        ctx.closePath();
        const g = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, rr * 1.1);
        g.addColorStop(0, `rgba(120,80,20,${0.3 * k})`); g.addColorStop(0.72, `rgba(150,100,30,${0.22 * k})`); g.addColorStop(0.9, `rgba(230,170,70,${0.26 * k})`); g.addColorStop(1, `rgba(255,200,90,${0.12 * k})`);
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
        if (p > 0.75) for (let i = 0; i < 14; i++) { const a = hash(i, tg.id) * TAU, d = Math.sqrt(hash(i + 5, tg.id)) * rr * 0.95; flame(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 4 + (p - 0.75) * 30, t + i); }
      },
      air(ctx, tg, s, p, k, t, env) { if (s.look === 'orders') orderBellAir(ctx, tg, p, k, t, env); },
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
    // Butcher's Charge: skid marks score the tiles the whole length of the hit (it runs wall to wall: the rush carries
    // through a cask, so the tiles past it are scored too), and dust kicks up at whatever he'll hit first once he's set
    charge: {
      color: '#ffcf9a',
      ground(ctx, tg, s, p, k, t, env) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), hw = s.w / 2;
        // (the hit is the full rect, wall to wall: the art covers all of it, and only the dust marks where he stops)
        const L = toWall(s.x, s.y, s.angle, s.len) + 30;
        const hit = PROPS.ray(s.x, s.y, s.x + ca * L, s.y + sa * L, env.props, FIGHT.BOSS_R * 0.7), stop = hit ? L * hit.t : L;
        const locked = p > 1 - (tg.lockAt || 1) / tg.dur;
        ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#3a1a08', (0.12 + 0.2 * p) * k); ctx.fill(); ctx.restore();
        for (const side of [-0.55, -0.2, 0.2, 0.55]) {
          const ox = -sa * hw * side, oy = ca * hw * side, q = Math.min(1, p * 1.4);
          line(ctx, s.x + ox + ca * 60, s.y + oy + sa * 60, s.x + ox + ca * (60 + (L - 40) * q), s.y + oy + sa * (60 + (L - 40) * q), rgba('#1a0a04', (0.35 + 0.3 * p) * k), 4);
        }
        // the wall (or cask) he'll hit: it trembles, then dust shakes off it
        const ex = s.x + ca * (stop + FIGHT.BOSS_R * 0.7), ey = s.y + sa * (stop + FIGHT.BOSS_R * 0.7);
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
        const to = caskRest(s, env);   // where it'll come to rest, worked out exactly as the host does
        const x = sx + (to.x - sx) * q, y = sy + (to.y - sy) * q - Math.sin(q * Math.PI) * 160;
        ctx.save(); ctx.globalAlpha = k; ctx.translate(x, y); ctx.rotate(q * 9);
        rrect(ctx, -22, -16, 44, 32, 9, '#9a6a36', OUT, 2.5);
        line(ctx, -12, -16, -12, 16, '#3a3a42', 3); line(ctx, 12, -16, 12, 16, '#3a3a42', 3);
        ctx.restore();
      },
    },
    // Gut Blast: a gust of foul breath rolls out of him across the whole kitchen. The shadow behind every cask is cut out
    gut: {
      color: '#d8e89a', outline: false,
      ground(ctx, tg, s, p, k, t) {
        const R = AR() * 2.2, rr = 80 + R * easeOut(p);
        const g = ctx.createRadialGradient(s.x, s.y, 40, s.x, s.y, rr);
        g.addColorStop(0, rgba('#8a9a3a', (0.2 + 0.14 * p) * k)); g.addColorStop(0.75, rgba('#6a7a2a', (0.1 + 0.1 * p) * k)); g.addColorStop(1, rgba('#c8d87a', 0.04 * k));
        ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
        ctx.fillStyle = rgba(COL.danger, (0.16 + 0.12 * p) * k); ctx.fillRect(-R, -R, R * 2, R * 2);   // damage (red) everywhere but the shadows
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
    // Flambé: brandy glistens in stripes across the tiles, and white-gold flame starts to lick along it just before it
    // goes up (not blue: blue on the floor means "share it"). The stripe is darkened and washed in the danger red, not
    // brandy orange, which vanished on the orange tiles; the next stripe to go darkens and reddens most.
    flambe: {
      color: '#ffc070',
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba('#1a0408', (0.18 + 0.22 * p) * k); ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
        ctx.fillStyle = rgba(COL.danger, (0.12 + 0.2 * p) * k); ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
        // a wet sheen sliding along the stripe
        for (let i = 0; i < 12; i++) {
          const q = (t * 0.35 + hash(i, tg.id)) % 1, d = q * s.len, off = (hash(i + 3, tg.id) - 0.5) * s.w * 0.8;
          ellipse(ctx, s.x + ca * d - sa * off, s.y + sa * d + ca * off, 26, 6, s.angle, rgba('#ffe2a8', 0.22 * Math.sin(q * Math.PI) * k));
        }
        if (p > 0.6) for (let i = 0; i < 18; i++) {
          const d = hash(i, tg.id + 1) * s.len, off = (hash(i, tg.id + 2) - 0.5) * s.w * 0.85, f = (p - 0.6) / 0.4;
          const fl = 0.6 + 0.4 * Math.sin(t * 16 + i * 3);
          glow(ctx, s.x + ca * d - sa * off, s.y + sa * d + ca * off, 10 + f * 22 * fl, '#ffe6a0', 0.55 * f * k);
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
        circle(ctx, s.x, s.y, s.r, rgba(COL.share, 0.08 * k), rgba(COL.share, (0.55 + 0.4 * p) * k), 2.5);
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
        ctx.fillStyle = rgba('#5ab82a', (0.05 + 0.06 * p) * k); ctx.fillRect(-R, -R, R * 2, R * 2);
        ctx.fillStyle = rgba(COL.danger, (0.16 + 0.12 * p) * k); ctx.fillRect(-R, -R, R * 2, R * 2);   // damage (red) everywhere but the shadows
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
        ctx.strokeStyle = rgba(COL.danger, (0.5 + 0.4 * p) * k); ctx.lineWidth = 3; ctx.stroke();
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
    // Snare Weave (Hard): a spring-snare of silk, a little web wound tight in its circle, pale chevrons on its rim
    // pointing out (it flings you out when it springs). The rim and wash are red (the outline); the silk is hers.
    snare: {
      color: '#f4f0ff',
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.clip();
        const spin = (tg.id % 2 ? 1 : -1) * t * (0.2 + 0.8 * p), a = (0.22 + 0.35 * p) * k;
        for (let i = 0; i < 8; i++) { const ang = spin + i * TAU / 8; line(ctx, s.x, s.y, s.x + Math.cos(ang) * s.r, s.y + Math.sin(ang) * s.r, rgba('#f4f0ff', a), 1.2); }
        // the spiral winds in tighter as it's set
        ctx.beginPath();
        for (let q = 0; q <= 1; q += 0.02) { const ang = spin * 1.5 + q * TAU * 3, rr = s.r * (0.92 - q * 0.8) * (1 - 0.15 * p); const x = s.x + Math.cos(ang) * rr, y = s.y + Math.sin(ang) * rr; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = rgba('#e8e4f4', a * 0.9); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
        // the spring: chevrons on the rim, pointing out, twitching harder near the end
        const n = Math.max(4, Math.round(s.r / 30)), kick = Math.sin(t * (6 + p * 18)) * 3 * p;
        for (let i = 0; i < n; i++) {
          const ang = i * TAU / n + tg.id * 0.37, x = s.x + Math.cos(ang) * (s.r - 14 + kick), y = s.y + Math.sin(ang) * (s.r - 14 + kick);
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
          poly(ctx, [-5, -7, 6, 0, -5, 7, -2, 0], rgba(COL.dangerHi, (0.35 + 0.45 * p) * k), null);
          ctx.restore();
        }
      },
    },
    // Venom Drip: venom gathers on a thread over each hero and drips; the red circle (the outline) is where it will
    // splash, so keep it off the others. A venom-green drop glyph sits in it, swelling, with drips already spotting the
    // floor, and a white ring counts down to the splash.
    spread: {
      color: '#ff3b2f',
      ground(ctx, tg, s, p, k, t) {
        // spatters already landing in the circle
        for (let i = 0; i < 12; i++) {
          if (hash(tg.id, i + 20) > p * 1.15) continue;
          const a = hash(i, tg.id + 4) * TAU, d = Math.sqrt(hash(i + 9, tg.id)) * s.r * 0.85, x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
          ellipse(ctx, x, y, 3 + hash(i, 6) * 3, 2 + hash(i, 7) * 2, a, rgba('#8adf2a', 0.7 * k), rgba('#14300a', 0.6 * k), 1);
        }
        // the drop glyph: a fat venom drop, its highlight, swelling as it nears
        const sw = 0.8 + 0.35 * easeIn(p) + Math.sin(t * (4 + 10 * p) + tg.id) * 0.04 * p, gx = s.x, gy = s.y + 4;
        glow(ctx, gx, gy - 8, 34 * sw, '#8aff4a', (0.18 + 0.3 * p) * k);
        ctx.save(); ctx.globalAlpha = k * (0.55 + 0.45 * p); ctx.translate(gx, gy); ctx.scale(sw, sw);
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.bezierCurveTo(10, -10, 16, -2, 16, 6); ctx.arc(0, 6, 16, 0, Math.PI); ctx.bezierCurveTo(-16, -2, -10, -10, 0, -26); ctx.closePath();
        ctx.fillStyle = '#7ad22a'; ctx.fill(); ctx.strokeStyle = '#14300a'; ctx.lineWidth = 2.5; ctx.stroke();
        ellipse(ctx, -5, 2, 4, 7, 0.4, 'rgba(240,255,210,0.85)');
        ctx.restore();
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 2.5; ctx.stroke();
      },
      // a thread of venom let down from the dark over them, a bead swelling at its end and falling as it lands
      air(ctx, tg, s, p, k, t) {
        const top = s.y - 520, end = s.y - 150 + 40 * easeIn(p), sw = Math.sin(t * 2 + tg.id) * 5 * (1 - p);
        ctx.save(); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x, top); ctx.quadraticCurveTo(s.x + sw, (top + end) / 2, s.x, end);
        ctx.strokeStyle = rgba('#b8ff6a', 0.35 * k); ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        const br = 4 + 6 * p;
        glow(ctx, s.x, end + br, br * 3, '#8aff4a', 0.4 * k);
        circle(ctx, s.x, end + br, br, rgba('#8adf2a', k), rgba('#14300a', 0.8 * k), 1.5);
        if (p > 0.6) { const q = (t * 1.8 + tg.id * 0.3) % 1; circle(ctx, s.x, end + br + q * (s.y - end - br), 2.5, rgba('#b8ff6a', 0.8 * (1 - q) * k)); }
      },
    },
    // (the pockets she leaves clear, 'snaregap', are sim data only: nothing is drawn there, the red snares round them
    // show the way)
    // Egg-Laden: a pale clutch hangs on the carrier's back, swelling; the circle under them is where its pool will lie,
    // venom beading in it as it nears, and a ring counts down to the drop
    eggdrop: {
      color: '#ff3b2f',
      ground(ctx, tg, s, p, k, t) {
        for (let i = 0; i < 14; i++) {
          if (hash(tg.id, i) > p * 1.1) continue;
          const a = hash(i, tg.id) * TAU, d = Math.sqrt(hash(i + 5, tg.id)) * s.r * 0.9, x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
          circle(ctx, x, y, 2.5 + hash(i, 2) * 3, rgba('#8adf2a', 0.75 * k), rgba('#14300a', 0.7 * k), 1);
        }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.85 * k); ctx.lineWidth = 3; ctx.stroke();
      },
      air(ctx, tg, s, p, k, t) {
        const sw = 1 + 0.25 * p + Math.sin(t * (4 + p * 10)) * 0.04 * p, x = s.x - 10, y = s.y - 46;
        ctx.save(); ctx.globalAlpha = k;
        glow(ctx, x, y, 22 * sw, '#c8ff6a', 0.25 + 0.4 * p);
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3, d = i ? 8 * sw : 0; ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 7 * sw, 6 * sw, a, '#efeedc', OUT, 1.5); }
        for (let i = 0; i < 3; i++) line(ctx, x - 14, y - 10 + i * 8, x + 14, y - 6 + i * 8, 'rgba(220,220,235,0.7)', 1);
        if (p > 0.7) { const q = (t * 2) % 1; circle(ctx, x, y + 12 + q * 30, 2.5, rgba('#8adf2a', (1 - q) * k)); }
        ctx.restore();
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

  // Still Air's stone: its charge comes in its colour (volkar.js: gold '#ffd84a' is +, blue is −)
  const stillSign = tg => (String(tg.color || '').toLowerCase() === '#ffd84a' ? 1 : -1);
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
      color: '#3d8bff', outline: false,
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
        circle(ctx, s.x, s.y, s.r, rgba(COL.share, 0.08 * k), rgba(COL.share, (0.5 + 0.4 * p) * k), 2.5);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.7 * k); ctx.lineWidth = 2; ctx.stroke();
        // a rune ring round it: ticks turning slowly, and four arrowheads pointing in at the rod
        const R2 = s.r + 22, spin = t * 0.4;
        circle(ctx, s.x, s.y, R2, null, rgba(COL.shareHi, (0.3 + 0.3 * p) * k), 1.5);
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
    // Gale Slam: the blast of air he's about to let go: streams rushing out from him to the walls, each with its head
    // pointing the way it will throw you (out). Where the still air lies behind the rods is not painted: that's for
    // the players to work out.
    gale: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) {
        const R = AR(), b = env.boss;
        // a pressure ring swelling round him, and air streaming outward in curling gusts
        for (let i = 0; i < 2; i++) { const q = (t * 0.9 + i / 2) % 1; circle(ctx, b.x, b.y, 110 + q * (R - 110), null, rgba('#e8f4ff', (0.12 + 0.2 * p) * (1 - q) * k), 2 + 3 * p); }
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 0; i < 32; i++) {
          const q = (t * (0.7 + 0.6 * p) + hash(i, 7)) % 1, a = i * TAU / 32 + q * 0.9, r0 = 120 + (R - 210) * q, r1 = r0 + 90, a0 = a - 0.25;
          const x0 = b.x + Math.cos(a0) * r0, y0 = b.y + Math.sin(a0) * r0, x1 = b.x + Math.cos(a) * r1, y1 = b.y + Math.sin(a) * r1;
          const cx = b.x + Math.cos(a0 + 0.06) * (r0 + r1) / 2, cy = b.y + Math.sin(a0 + 0.06) * (r0 + r1) / 2, al = (0.2 + 0.45 * p) * k * Math.sin(q * Math.PI);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
          ctx.strokeStyle = rgba('#e8f4ff', al); ctx.lineWidth = 2.5; ctx.stroke();
          const d = Math.hypot(x1 - cx, y1 - cy) || 1, ux = (x1 - cx) / d, uy = (y1 - cy) / d;
          ctx.beginPath(); ctx.moveTo(x1 - ux * 9 - uy * 6, y1 - uy * 9 + ux * 6); ctx.lineTo(x1, y1); ctx.lineTo(x1 - ux * 9 + uy * 6, y1 - uy * 9 - ux * 6); ctx.stroke();
        }
        ctx.restore();
      },
    },
    // Grounding Rods (Hard): an iron rod hangs point-down over the hero, swaying, sparks running down it; under them a
    // red ring (keep it off the others) where it will be driven in
    groundrod: {
      color: '#ff3b2f',
      ground(ctx, tg, s, p, k, t) {
        shadow(ctx, s.x, s.y, 16 + 14 * p, (0.25 + 0.3 * p) * k);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 2.5; ctx.stroke();
      },
      air(ctx, tg, s, p, k, t) {
        const sway = Math.sin(t * 2.2 + tg.id) * 0.08 * (1 - p), y = s.y - 130 + 70 * easeIn(p);
        ctx.save(); ctx.translate(s.x, y); ctx.rotate(sway);
        rodPole(ctx, 0, 0, t, k, 0.3 + 0.7 * p);
        ctx.restore();
        if (Math.floor(t * 12 + tg.id) % 3 !== 0) { ctx.save(); ctx.globalAlpha = k * (0.3 + 0.6 * p); jagged(ctx, s.x, y - 86, s.x + (hash(Math.floor(t * 12), tg.id) - 0.5) * 40, y - 150, Math.floor(t * 12) + tg.id, '#9ff4ff', 1.4); ctx.restore(); }
      },
    },
    // Supercell (Hard): a cell of a squall front: a dark sheet of rain driving across it, lightning flickering in it as
    // it lands (the red rim is the outline; the step landing next is drawn full, the ones after it faint)
    squallcell: {
      color: '#ff3b2f',
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba('#0a1220', (0.18 + 0.3 * p) * k); ctx.fill();
        const len = s.len, w = s.w, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.strokeStyle = rgba('#bcd6ee', (0.12 + 0.3 * p) * k); ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < Math.round(len / 22); i++) {
          const d = hash(i, tg.id) * len, o = (hash(i + 3, tg.id) - 0.5) * w, q = (t * 1.6 + hash(i, 9)) % 1;
          const x = s.x + ca * d - sa * o, y = s.y + sa * d + ca * o + q * 24;
          ctx.moveTo(x - 4, y - 12); ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (p > 0.7 && Math.floor(t * 14 + tg.id) % 3 === 0) {
          const d = hash(Math.floor(t * 14), tg.id) * len;
          jagged(ctx, s.x + ca * d, s.y + sa * d - 40, s.x + ca * d + (hash(tg.id, 4) - 0.5) * 30, s.y + sa * d + 10, Math.floor(t * 14) + tg.id, '#dffbff', 1.6);
        }
        ctx.restore();
      },
    },
    // Still Air (the Eye): a lit stone wants one hero of its own charge. Its ring is a soak (the blue rim, the outline);
    // round it, carved stone sigils of its sign (+ gold, − blue) turn slowly, and the charge reaches out: a calm arc to
    // anyone of the right charge standing in it, a red crackle at anyone of the wrong one (they'll be struck)
    still: {
      ground(ctx, tg, s, p, k, t, env) {
        const sign = stillSign(tg), col = sign > 0 ? '#ffd84a' : '#6ab8ff';
        glow(ctx, s.x, s.y, s.r * 1.25, col, (0.12 + 0.12 * p) * k);
        circle(ctx, s.x, s.y, s.r * 0.8, null, rgba(col, (0.35 + 0.3 * p) * k), 2);
        // the sigils: little slate tiles with the sign cut into them, turning round the ring
        const n = 6, spin = t * 0.25 * sign;
        for (let i = 0; i < n; i++) {
          const a = spin + i * TAU / n, x = s.x + Math.cos(a) * (s.r + 22), y = s.y + Math.sin(a) * (s.r + 22);
          ctx.save(); ctx.globalAlpha = k * (0.7 + 0.3 * p); ctx.translate(x, y);
          rrect(ctx, -9, -9, 18, 18, 4, '#3a4250', OUT, 2);
          line(ctx, -5, 0, 5, 0, col, 3);
          if (sign > 0) line(ctx, 0, -5, 0, 5, col, 3);
          ctx.restore();
        }
        // one pip: it wants one
        circle(ctx, s.x, s.y - s.r - 44, 5, rgba(COL.shareHi, k), OUT, 1.5);
        // the countdown
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.75 * k); ctx.lineWidth = 2; ctx.stroke();
        // the charge reaching for whoever stands in it
        const pol = env.pol, top = [s.x, s.y - 80];
        for (const u of env.units || []) {
          if (Math.hypot(u.x - s.x, u.y - s.y) > s.r) continue;
          const us = pol && pol.get(u.id);
          if (!us) continue;
          ctx.save();
          if (us === sign) {
            ctx.globalAlpha = (0.45 + 0.4 * p) * k; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(...top); ctx.quadraticCurveTo((top[0] + u.x) / 2, Math.min(top[1], u.y - 20) - 30, u.x, u.y - 18);
            ctx.strokeStyle = col; ctx.lineWidth = 3 + Math.sin(t * 4) * 1; ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
          } else if (Math.floor(t * 14 + u.id) % 2) {
            ctx.globalAlpha = (0.5 + 0.5 * p) * k;
            jagged(ctx, top[0], top[1], u.x, u.y - 16, Math.floor(t * 14) * 3 + u.id, '#ff8a7a', 1.4 + p);
          }
          ctx.restore();
        }
      },
      // a column of its charge's light standing up off the stone as the Eye nears its close
      air(ctx, tg, s, p, k, t) {
        const col = stillSign(tg) > 0 ? '#ffd84a' : '#6ab8ff', h = 120 + 140 * p, w = 16 + 10 * p;
        const g = ctx.createLinearGradient(0, s.y - 100 - h, 0, s.y - 100);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, (0.12 + 0.3 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(s.x - w / 2, s.y - 100 - h, w, h);
        if (p > 0.8 && Math.floor(t * 12 + tg.id) % 3 === 0) { ctx.save(); ctx.globalAlpha = k; jagged(ctx, s.x, s.y - 110, s.x + (hash(Math.floor(t * 12), tg.id) - 0.5) * 30, s.y - 100 - h, Math.floor(t * 12) + tg.id, col, 1.4); ctx.restore(); }
      },
    },
    // (the still air past a rod while its front passes, 'stilllane', is sim data only: the red cells show the gap)
    // Rod Strike: a thread of charge runs from each marked player to the stone nearest them, and that stone's runes
    // wake; within reach the thread holds steady, out of reach it frays. A stone still holding a charge glows red.
    rodstrike: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) {
        let st = null, sd = Infinity;
        for (const pr of env.props || []) if (pr.kind === 'stone') { const d = PROPS.sd(pr, s.x, s.y); if (d < sd) { sd = d; st = pr; } }
        if (!st) return;
        const near = sd <= 70, hot = st.state > 0, col = hot ? COL.danger : COL.share;
        glow(ctx, st.x, st.y, st.r + 70, hot ? COL.danger : COL.share, (0.12 + 0.2 * p) * k);
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
        poly(ctx, rock, rgba('#e8dcc8', (0.08 + 0.12 * p) * k), rgba('#f2ead8', (0.45 + 0.4 * p) * k), 2);
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
        glow(ctx, s.x, s.y, s.r, COL.danger, (0.05 + 0.08 * p) * k);
        ctx.save(); ctx.setLineDash([6, 10]); ctx.lineDashOffset = -t * 40;
        circle(ctx, s.x, s.y, s.r, null, rgba(COL.danger, (0.4 + 0.45 * p) * k), 2.5);
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
      color: '#3d8bff', outline: false,
      ground(ctx, tg, s, p, k, t) {
        ArenaView.stackMarker(ctx, s, p, k, t);
        const R = s.r + 36, spin = t * 0.3;
        glow(ctx, s.x, s.y, R * 1.2, COL.share, (0.1 + 0.2 * p) * k);
        circle(ctx, s.x, s.y, R, null, rgba(COL.share, (0.45 + 0.4 * p) * k), 2.5);
        circle(ctx, s.x, s.y, R + 14, null, rgba(COL.shareHi, (0.25 + 0.3 * p) * k), 1.2);
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
        g.addColorStop(0, rgba(COL.danger, (0.28 + 0.35 * p) * k)); g.addColorStop(0.35, rgba(COL.danger, (0.1 + 0.12 * p) * k)); g.addColorStop(1, 'rgba(255,59,47,0)');
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
      // (not caught: a plain pale cone, only showing the way they face; it says nothing about where to stand)
      const caught = (Math.abs(d) < 1.2) === caughtFacing, col = caught ? COL.danger : '#d8d4cc';
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
        // rings drawing in toward him, quickening: the stomp lands as they meet (a count for the beat, inside the red)
        for (let i = 0; i < 3; i++) {
          const q = (p * (1.6 + 0.9 * p) + i / 3) % 1;
          ellipse(ctx, s.x, s.y, s.r * (1 - q), s.r * (1 - q) * 0.92, 0, null, rgba(col, (0.1 + 0.4 * p) * Math.sin(q * Math.PI) * k), 2.5);
        }
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
        // the inner edge of the hit, in red (the ring round him it spares is left unpainted)
        circle(ctx, s.x, s.y, s.r2, null, rgba(COL.danger, (0.4 + 0.4 * p) * k), 2.5);
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
    // Sceptre Throw: the lane the sceptre will fly down. It follows its hero (a pale guide, a faint red under it) and sets for the last
    // moment before it is hurled: then it is the red lane of the blow, fixed (the same lane as the Writ's, boss-tells.js writLane)
    throw: {
      outline: false,
      ground(ctx, tg, s, p, k, t, env) {
        const left = (1 - p) * tg.dur, set = left <= (tg.lockAt || 0);
        if (!set) { ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba(COL.danger, (0.06 + 0.06 * p) * k); ctx.fill(); ctx.restore(); }
        writLane(ctx, tg, s, p, k, t, env, false);
        // the sceptre gathering gold at his hand, and the chevrons that will carry it
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = toWall(s.x, s.y, s.angle, s.len);
        glow(ctx, s.x + ca * 64, s.y + sa * 64 - 26, 22 + 22 * p, '#ffe08a', (0.25 + 0.5 * p) * k);
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        for (let d = 90 + ((t * (80 + 260 * p)) % 120); d < L; d += 120) {
          const x = s.x + ca * d, y = s.y + sa * d;
          ctx.save(); ctx.translate(x, y); ctx.rotate(s.angle);
          poly(ctx, [10, 0, -8, -14, -3, 0, -8, 14], rgba('#ffe08a', (0.12 + 0.35 * p) * k), null);
          ctx.restore();
        }
        ctx.restore();
      },
    },
    // Barrow Bells: a bronze bell hangs over each circle and starts to swing; the pips show how many it wants
    bell: {
      color: '#ffd88a',
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.4, '#c89a4a', 0.2 * k);
        circle(ctx, s.x, s.y, s.r, rgba(COL.share, 0.08 * k), rgba(COL.share, (0.5 + 0.4 * p) * k), 2.5);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.7 * k); ctx.lineWidth = 2; ctx.stroke();
        const n = tg.need || 1;
        for (let i = 0; i < n; i++) circle(ctx, s.x + (i - (n - 1) / 2) * 16, s.y + s.r + 16, 4.5, rgba(COL.shareHi, 0.9 * k), OUT, 1.5);
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
        ctx.fillStyle = rgba(COL.danger, (0.12 + 0.1 * p) * k); ctx.fillRect(-ARENA.hw - 20, top, ARENA.hw * 2 + 40, ARENA.hh * 2 + 40);   // damage (red) but the shadows
        // the front of the wave, reaching further as the cast goes on
        ctx.fillStyle = rgba('#c8ffd8', 0.12 * k); ctx.fillRect(-ARENA.hw - 20, top, ARENA.hw * 2 + 40, front - top);
        line(ctx, -ARENA.hw - 20, front, ARENA.hw + 20, front, rgba(COL.danger, (0.5 + 0.4 * p) * k), 3);
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
    // Burial Rites (Hard): an open grave for each hero, in their own colour (the rim is theirs too: outline), a
    // headstone at its head with their place in the party in pips, earth heaped round it, a countdown ring, and the
    // same colour in a ring under their feet so they can find it at a glance
    grave: {
      ground(ctx, tg, s, p, k, t, env) {
        const col = tg.color || '#ffffff', n = Math.max(1, tg.slot || 1);
        glow(ctx, s.x, s.y, s.r * 1.25, col, (0.1 + 0.12 * p) * k);
        circle(ctx, s.x, s.y, s.r, rgba(col, 0.1 * k), null);
        // the pit, and the heaped earth round it
        ctx.save(); ctx.globalAlpha = k;
        for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + 0.2; ellipse(ctx, s.x + Math.cos(a) * 34, s.y + 10 + Math.sin(a) * 26, 9, 6, a, '#2e2a24', 'rgba(10,8,6,0.7)', 1); }
        rrect(ctx, s.x - 22, s.y - 6, 44, 34, 5, '#060807', rgba(col, 0.8), 2);
        // the headstone, its pips
        rrect(ctx, s.x - 17, s.y - 46, 34, 38, [12, 12, 3, 3], '#4a5054', OUT, 2.5);
        for (let i = 0; i < n; i++) circle(ctx, s.x + (i - (n - 1) / 2) * 9, s.y - 30, 3.2, col, OUT, 1);
        ctx.restore();
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
        ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 2.5; ctx.stroke();
        const e = tg.target != null ? env.entById(tg.target) : null;
        if (e) {
          ellipse(ctx, e.x, e.y + 4, 30, 20, 0, null, rgba(col, 0.9 * k), 3);
          ellipse(ctx, e.x, e.y + 4, 36, 25, 0, null, rgba(col, 0.35 * k), 1.5);
        }
      },
    },
    // Writ of Execution (Hard): a grave-chain from him to the hero it names, and the lane the writ's grave-light will
    // run down, out through them. While it's still being aimed (it follows them) the lane is only a pale guide; when it
    // sets (tg.lockAt before it's read) it flashes white and turns the red lane of the blow, fixed: out of the red is
    // out of the hit. The Pardoned's lane isn't painted at all, only its chain hanging broken. (The pardon is a 'safe'
    // mech: sim data, with no rim.)
    writ: {
      outline: false,   // (its own rim: pale while aimed, red once set; writLane)
      ground(ctx, tg, s, p, k, t, env) { writLane(ctx, tg, s, p, k, t, env, false); },
    },
    pardon: {
      ground(ctx, tg, s, p, k, t, env) { writLane(ctx, tg, s, p, k, t, env, true); },
    },
  };
  function writLane(ctx, tg, s, p, k, t, env, free) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = toWall(s.x, s.y, s.angle, s.len);
    // set: the last tg.lockAt seconds, when the lane no longer follows anyone
    const left = (1 - p) * tg.dur, lock = tg.lockAt || 0, set = left <= lock, landed = tg.gone != null;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    if (!free && set) {
      const q = lock > 0 ? clamp(1 - left / lock, 0, 1) : 1;
      ctx.fillStyle = `rgba(4,10,8,${(0.35 + 0.15 * q) * k})`; ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
      ctx.fillStyle = rgba(COL.danger, (0.12 + 0.12 * q) * k); ctx.fillRect(-AR() * 2, -AR() * 2, AR() * 4, AR() * 4);
    }
    // runes of the sentence running down it (none on a torn writ); pale while it's still being aimed
    if (!free) for (let d = 120 + (t * 90) % 90; d < L; d += 90) {
      const x = s.x + ca * d, y = s.y + sa * d;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.angle);
      ctx.strokeStyle = rgba('#9affc0', (set ? 0.5 + 0.3 * p : 0.18 + 0.2 * p) * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(6, 0); ctx.lineTo(-6, 10); ctx.moveTo(-2, -5); ctx.lineTo(-2, 5); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // the rim: a pale dashed guide while it follows them, then the red edge of the blow once it's set (with a white
    // flash as it sets), exactly the lane it will hit
    if (!free) {
      ctx.save(); SHAPES.trace(ctx, s);
      if (!set) {
        ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 20;
        ctx.strokeStyle = rgba('#d8f0e4', 0.35 * k); ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        const late = clamp(1 - left / 0.6, 0, 1);
        ctx.strokeStyle = rgba(COL.danger, (0.7 + 0.3 * late) * k); ctx.lineWidth = 2.5 + late * 1.5; ctx.stroke();
        if (!landed && lock - left < 0.35) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ffffff', (1 - (lock - left) / 0.35) * 0.9 * k); ctx.lineWidth = 6; ctx.stroke(); }
      }
      ctx.restore();
    }
    // the chain from his hand to them: taut and green-lit, or broken and slack
    const e = tg.target != null ? env.entById(tg.target) : null;
    if (!e) return;
    const bx = s.x + ca * 60, by = s.y + sa * 60 - 30, ex = e.x, ey = e.y - 20, d = Math.hypot(ex - bx, ey - by), n = Math.max(4, Math.floor(d / 18));
    for (let i = 0; i < n; i++) {
      const q = (i + 0.5) / n;
      if (free && q > 0.4 && q < 0.62) continue;   // the break
      const sag = free ? Math.sin(q * Math.PI) * 26 : 0, x = bx + (ex - bx) * q, y = by + (ey - by) * q + sag;
      ellipse(ctx, x, y, 7, i % 2 ? 2 : 4, Math.atan2(ey - by, ex - bx), null, rgba(i % 2 ? '#4a5258' : '#6a747c', k), 2.2);
    }
    if (!free) glow(ctx, bx + (ex - bx) * ((t * (0.6 + 2 * p)) % 1), by + (ey - by) * ((t * (0.6 + 2 * p)) % 1), 10, '#6dff9a', 0.7 * k);
    else glow(ctx, ex, ey, 18, '#e8e4dc', 0.4 * k);
  }
  for (const kind of ['sweep', 'stomp', 'ring']) {
    // the knights' replays: the same red, with the pale grey of a memory over it (blue is for stacks)
    const base = K[kind];
    K['e' + kind] = { color: '#d8d4cc', ground(ctx, tg, s, p, k, t, env) {
      base.ground(ctx, tg, s, p, k, t, env);
      ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#d8d4cc', (0.05 + 0.1 * p) * k); ctx.fill(); ctx.restore();
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
      if (env.bossId === 'archmage' && typeof AZ_ART !== 'undefined') { AZ_ART.lance(ctx, tg, s, p, k, t, env); return; }   // Azerath's Arcane Lance (archmage-art.js)
      const tgt = tg.target != null ? env.entById(tg.target) : null;
      ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba('#ff4a3a', (0.06 + 0.1 * p) * k); ctx.fill(); ctx.restore();
      if (env.bossId === 'hydra' && typeof HY_TELLS !== 'undefined' && HY_TELLS.buster) { HY_TELLS.buster.ground(ctx, tg, s, p, k, t, env); return; }   // (Rending Maul: hydra-view.js)
      if (env.bossId === 'corvane' && typeof CV_FX !== 'undefined') { CV_FX.buster(ctx, tg, s, p, k, t, env); return; }   // Corvane's Sundering Cut and Cracked Guard (corvane-fx.js)
      if (env.bossId === 'brannoc' && typeof BR_FX !== 'undefined') { BR_FX.buster(ctx, tg, s, p, k, t, env); return; }   // Brannoc's Hammer Heel and Fist Slam (brannoc-fx.js)
      if (env.bossId === 'morrowoak' && typeof MG_FX !== 'undefined') { MG_FX.buster(ctx, tg, s, p, k, t, env); return; }   // Morrow-Oak's Root Lash (morrowoak-fx.js)
      if (env.bossId === 'caelum' && typeof CL_FX !== 'undefined') { CL_FX.buster(ctx, tg, s, p, k, t, env); return; }   // Caelum's Cinder Crown and Pinning Thrust (caelum-fx.js)
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

  // ------------------------------------------------------------------ Vhalgrath
  // His tells, impacts and aftermath live in wyrm-art.js (WYRM_ART); get() and track() ask it.

  // ------------------------------------------------------------------ Hrimgar
  // The rule here as everywhere: the red (or blue) outline and the sweeping wash mark the exact area; the frost, cracks and
  // snow inside are the extra clue, never the only one. Sheets (rect cells) are drawn as ice: cracking, breaking, sinking.
  // frost crystals growing outward from a point: six arms, each with side branches
  function frostStar(ctx, x, y, r, p, k, seed, col = '#eaf6ff') {
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + hash(i, seed) * 0.12, L = r * (0.35 + 0.65 * p);
      line(ctx, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, rgba(col, (0.35 + 0.5 * p) * k), 2.2);
      for (const f of [0.45, 0.72]) {
        const bx = x + Math.cos(a) * L * f, by = y + Math.sin(a) * L * f;
        for (const sd of [-1, 1]) line(ctx, bx, by, bx + Math.cos(a + sd * 0.9) * L * 0.22, by + Math.sin(a + sd * 0.9) * L * 0.22, rgba(col, (0.3 + 0.4 * p) * k), 1.5);
      }
    }
    ctx.restore();
  }
  // dark cracks spreading over a rect cell
  function cellCracks(ctx, s, p, k, seed, glowCol) {
    const cx = s.x + s.len / 2, cy = s.y;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ctx.fillStyle = rgba(glowCol || '#0a2a4a', (0.1 + 0.3 * p) * k); ctx.fillRect(s.x - 4, s.y - s.w / 2 - 4, s.len + 8, s.w + 8);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + hash(i, seed) * 0.5, L = s.len * (0.25 + 0.55 * p) * (0.7 + 0.5 * hash(i, seed + 1));
      let px = cx, py = cy;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let j = 1; j <= 4; j++) { const q = j / 4, aa = a + (hash(i * 7 + j, seed + 2) - 0.5) * 0.8; px = cx + Math.cos(aa) * L * q; py = cy + Math.sin(aa) * L * q; ctx.lineTo(px, py); }
      ctx.strokeStyle = rgba('#020a18', (0.55 + 0.4 * p) * k); ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = rgba('#eaf6ff', (0.45 + 0.4 * p) * k); ctx.lineWidth = 1.3; ctx.stroke();
    }
    ctx.restore();
  }
  const HR = {
    // Winter's Howl / the Long Night: the room dims and goes cold, frost rolling out of him in rings
    tihowl: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        const R = AR() * 1.4, b = env.boss;
        ctx.save(); ctx.fillStyle = `rgba(8,24,48,${(0.06 + 0.24 * easeIn(p)) * k})`; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
        for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ellipse(ctx, b.x, b.y, 70 + q * R, (70 + q * R) * 0.9, 0, null, rgba('#cfeaff', 0.3 * (1 - q) * k * (0.4 + 0.6 * p)), 3); }
        for (let i = 0; i < 24; i++) { const a = hash(i, 3) * TAU, u = (t * 0.6 + hash(i, 4)) % 1, d = 60 + u * R * 0.9; circle(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 1.8, rgba('#ffffff', 0.6 * (1 - u) * k)); }
      },
    },
    tinight: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t, env) {
        const R = AR() * 1.4;
        ctx.save(); ctx.fillStyle = `rgba(2,6,18,${(0.08 + 0.3 * easeIn(p)) * k})`; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
        for (let i = 0; i < 5; i++) glow(ctx, -R * 0.6 + i * R * 0.3, -AR() * 0.8 + Math.sin(t * 0.8 + i) * 20, 130, i % 2 ? '#8a6aff' : '#3affb0', 0.12 * p * k);
      },
    },
    // Whiteout: a white blindness coming up from the edges, snow streaming across
    tiwhite: {
      raidwide: true,
      ground(ctx, tg, s, p, k, t) {
        const R = AR() * 1.4;
        ctx.save(); ctx.fillStyle = `rgba(225,242,255,${(0.04 + 0.3 * easeIn(p)) * k})`; ctx.fillRect(-R, -R, R * 2, R * 2);
        for (let i = 0; i < 40; i++) {
          const u = (t * 0.9 + hash(i, 5)) % 1, y = (hash(i, 6) * 2 - 1) * R, x = -R + u * R * 2;
          line(ctx, x, y, x - 34, y + 8, rgba('#ffffff', 0.5 * k * (0.3 + p)), 2);
        }
        ctx.restore();
      },
    },
    // Rime Slam: a fist's shadow over the ring, frost and cracks spreading from its centre
    tislam: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        glow(ctx, s.x, s.y, s.r, '#9fe8ff', (0.1 + 0.3 * p) * k);
        ctx.restore();
        frostStar(ctx, s.x, s.y, s.r * 0.95, p, k, tg.id);
        circle(ctx, s.x, s.y, s.r * (0.1 + 0.2 * p), rgba('#0a1a30', 0.35 * k));
      },
      air(ctx, tg, s, p, k) {
        const q = easeIn(p);
        ellipse(ctx, s.x, s.y, s.r * (0.25 + 0.7 * q), s.r * (0.25 + 0.7 * q) * 0.6, 0, rgba('#000000', 0.12 + 0.35 * q), null);
      },
    },
    // a sheet marked to sink: cracks spreading over it, white at their lips, a cold glow coming up through them
    tisink: { ground(ctx, tg, s, p, k, t, env) { cellCracks(ctx, s, p, k, tg.id); } },
    // the sheet breaks (Breath of Winter): white frost over it, then the same cracks, a brighter light under
    tiburst: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.fillStyle = rgba('#eaf6ff', (0.25 + 0.2 * p) * k); ctx.fillRect(s.x - 4, s.y - s.w / 2 - 4, s.len + 8, s.w + 8); ctx.restore();
        cellCracks(ctx, s, p, k, tg.id, '#3a9ad8');
      },
    },
    // Fault Line: a fissure opening along the line, shards leaning up out of it
    tifault: {
      ground(ctx, tg, s, p, k, t) {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba('#0a2a4a', (0.1 + 0.22 * p) * k); ctx.fillRect(s.x - s.len, s.y - s.len, s.len * 2 + 2000, s.len * 2 + 2000);
        ctx.restore();
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const L = s.len * (0.2 + 0.8 * easeOut(p));
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        for (let i = 1; i <= 16; i++) { const u = i / 16, off = (hash(i, tg.id) - 0.5) * 34 * (i % 2 ? 1 : -1); ctx.lineTo(s.x + ca * L * u - sa * off, s.y + sa * L * u + ca * off); }
        ctx.strokeStyle = rgba('#020a18', 0.85 * k); ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = rgba('#eaf6ff', (0.5 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke();
        for (let i = 0; i < 14; i++) {
          const u = (0.08 + 0.9 * hash(i, tg.id + 3)) * (0.2 + 0.8 * easeOut(p)), x = s.x + ca * s.len * u, y = s.y + sa * s.len * u, off = (hash(i, tg.id + 4) - 0.5) * s.w * 0.6;
          poly(ctx, [x - sa * off - 5, y + ca * off, x - sa * off, y + ca * off - 16 - 12 * p, x - sa * off + 5, y + ca * off], rgba('#d8f0ff', 0.6 * k), OUT, 1);
        }
        ctx.restore();
      },
    },
    // Icefall: a glint on the ice, the shard itself falling out of the dark
    ticicle: {
      ground(ctx, tg, s, p, k, t) { glow(ctx, s.x, s.y, s.r * 1.1, '#9fe8ff', (0.15 + 0.4 * p) * k); frostStar(ctx, s.x, s.y, s.r * 0.8, p, k, tg.id); },
      air(ctx, tg, s, p, k) { const h = (1 - easeIn(p)) * 340; poly(ctx, [s.x - 6, s.y - h - 26, s.x + 6, s.y - h - 26, s.x, s.y - h + 6], '#dff4ff', OUT, 1.5); glow(ctx, s.x, s.y - h, 16, '#ffffff', 0.7 * k); },
    },
    // Titan's Sweep: the shadow of a great arm, frost blown along the arc
    tisweep: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        const g = ctx.createRadialGradient(s.x, s.y, 40, s.x, s.y, s.r);
        g.addColorStop(0, rgba('#0a1a30', (0.28 + 0.2 * p) * k)); g.addColorStop(1, rgba('#9fe8ff', (0.05 + 0.18 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        for (let i = 0; i < 26; i++) {
          const a = s.angle + (hash(i, tg.id) - 0.5) * s.arc * 0.92, d = 80 + hash(i, tg.id + 1) * (s.r - 100), u = (t * 0.8 + hash(i, tg.id + 2)) % 1, x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
          line(ctx, x, y, x + Math.cos(a + 1.57) * 22 * u, y + Math.sin(a + 1.57) * 22 * u, rgba('#ffffff', 0.5 * (1 - u) * k * (0.4 + p)), 2);
        }
        ctx.restore();
      },
    },
    // Winter's Grasp (a marker, not damage): frost spreading from the feet of the chosen
    tigrasp: {
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.2, '#bff0ff', (0.12 + 0.32 * p) * k);
        circle(ctx, s.x, s.y, s.r * (0.3 + 0.6 * p), rgba('#eaf6ff', (0.1 + 0.25 * p) * k));
        frostStar(ctx, s.x, s.y, s.r * 1.05, p, k, tg.id);
      },
    },
    // Frostbite's shared hit (blue): a snowflake in the ring, cold mist
    tifrost: {
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.1, '#9fd0ff', (0.12 + 0.3 * p) * k);
        frostStar(ctx, s.x, s.y, s.r * 0.9, 0.5 + 0.5 * p, k, tg.id, '#dff0ff');
        for (let i = 0; i < 10; i++) { const a = hash(i, tg.id) * TAU + t * 0.4, d = hash(i, tg.id + 1) * s.r * 0.9; glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - ((t * 20) % 14), 14, '#e8f6ff', 0.14 * k); }
      },
    },
    // the Avalanche: snow and rock streaming down the lane toward the south
    tislide: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba('#dff0ff', (0.08 + 0.16 * p) * k); ctx.fillRect(s.x - s.w, s.y - 10, s.w * 2, s.len + 20);
        for (let i = 0; i < 36; i++) {
          const x = s.x + (hash(i, tg.id) - 0.5) * s.w * 0.9, u = (t * (0.5 + 0.5 * p) + hash(i, tg.id + 1)) % 1, y = s.y + u * s.len;
          if (i % 3 === 0) poly(ctx, [x - 7, y, x - 2, y - 7, x + 6, y - 4, x + 7, y + 4, x, y + 7], rgba('#7a8ea4', 0.55 * k * (0.3 + p)), OUT, 1.2);
          else line(ctx, x, y - 16, x, y, rgba('#ffffff', 0.5 * k * (0.3 + p)), 2.5);
        }
        const g = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.len);
        g.addColorStop(0, rgba('#ffffff', (0.05 + 0.1 * p) * k)); g.addColorStop(1, rgba('#9fb6cc', (0.1 + 0.2 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(s.x - s.w, s.y, s.w * 2, s.len);
        ctx.restore();
      },
    },
    // Glacial Stomp: the shock of his foot, then rings of shards leaning out of the ice
    tistomp: {
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r, '#9fe8ff', (0.1 + 0.3 * p) * k);
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + 0.1; line(ctx, s.x + Math.cos(a) * s.r * 0.2, s.y + Math.sin(a) * s.r * 0.2, s.x + Math.cos(a) * s.r * (0.3 + 0.6 * p), s.y + Math.sin(a) * s.r * (0.3 + 0.6 * p), rgba('#020a18', 0.7 * k), 4); }
      },
    },
    tiring: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        ctx.fillStyle = rgba('#9fe8ff', (0.06 + 0.14 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        ctx.restore();
        const n = 26;
        for (let i = 0; i < n; i++) { const a = i * TAU / n + hash(i, tg.id) * 0.1, d = (s.r2 + s.r) / 2 + (hash(i, tg.id + 1) - 0.5) * (s.r - s.r2) * 0.5; poly(ctx, [s.x + Math.cos(a - 0.03) * d, s.y + Math.sin(a - 0.03) * d, s.x + Math.cos(a) * (d + 22 + 12 * p), s.y + Math.sin(a) * (d + 22 + 12 * p), s.x + Math.cos(a + 0.03) * d, s.y + Math.sin(a + 0.03) * d], rgba('#dff4ff', (0.35 + 0.4 * p) * k), OUT, 1); }
      },
    },
    // Breath of Winter: a cloud of frost swirling down the cone
    tibreath: {
      ground(ctx, tg, s, p, k, t) {
        ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
        const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
        g.addColorStop(0, rgba('#ffffff', (0.2 + 0.35 * p) * k)); g.addColorStop(1, rgba('#7fc8ff', (0.04 + 0.16 * p) * k));
        ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        for (let i = 0; i < 20; i++) {
          const a = s.angle + (hash(i, tg.id) - 0.5) * s.arc * 0.9, u = (t * 0.5 + hash(i, tg.id + 1)) % 1, d = 70 + u * (s.r - 90);
          glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 20 + 14 * u, '#eaf6ff', (0.15 + 0.3 * p) * k * (1 - u * 0.5));
        }
        ctx.restore();
      },
    },
    // Titan's Grip: the shadow of a hand over the ring, its fingers closing
    tigrip: {
      ground(ctx, tg, s, p, k, t) {
        glow(ctx, s.x, s.y, s.r * 1.1, '#0a1a30', (0.2 + 0.3 * p) * k);
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.6, d = s.r * (1.1 - 0.55 * easeIn(p)); poly(ctx, [s.x + Math.cos(a - 0.12) * d, s.y + Math.sin(a - 0.12) * d, s.x + Math.cos(a) * (d + 38), s.y + Math.sin(a) * (d + 38), s.x + Math.cos(a + 0.12) * d, s.y + Math.sin(a + 0.12) * d], rgba('#0a1a30', 0.55 * k), null); }
      },
    },
    tigripstack: {
      ground(ctx, tg, s, p, k, t) { glow(ctx, s.x, s.y, s.r * 1.1, '#9fd0ff', (0.12 + 0.3 * p) * k); frostStar(ctx, s.x, s.y, s.r * 0.9, 0.4 + 0.6 * p, k, tg.id, '#dff0ff'); },
    },
  };

  // ------------------------------------------------------------------ aftermath
  // The faint marks a landed mechanic leaves on the floor: a soup splash, scorched rings, spilt spice, a dented ring.
  // One standard for every lingering decal (boss-vfx.js decals should use it too): a duration tier, one cap on how
  // strong it gets, the same quick fade in and slow fade out, and always drawn under every telegraph (ArenaView.drawZones
  // calls drawAftermath before the puddles and telegraphs), so a decal never hides a warning.
  const AFTER = {
    tier: { brief: 2.5, short: 4.5, long: 8 },   // seconds a decal lasts
    maxA: 0.6,                                    // the most opaque any decal gets (each part scales it by 1 or less)
    fadeIn: 0.15, fadeOut: 1.5,                   // seconds
  };
  // how strong a decal is (0..1 of its own colours; AFTER.maxA is applied here) at `age` seconds into `dur`
  const afterK = (age, dur) => (age < 0 || age >= dur ? 0 : Math.min(1, age / AFTER.fadeIn) * Math.min(1, (dur - age) / AFTER.fadeOut) * AFTER.maxA);
  const marks = [];
  const mark = (dur, s, draw, seed = 0) => { if (marks.length < 40) marks.push({ at: aftNow, dur, s: Object.assign({}, s), draw, seed }); };
  let aftNow = 0;
  // a ragged blob, the same every frame for a seed
  function blob(ctx, x, y, r, seed, n = 14, flat = 0.85) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = i * TAU / n, w = r * (0.78 + 0.32 * hash(i % n, seed)); i ? ctx.lineTo(x + Math.cos(a) * w, y + Math.sin(a) * w * flat) : ctx.moveTo(x + Math.cos(a) * w, y + Math.sin(a) * w * flat); }
    ctx.closePath();
  }
  // by boss, by tag: what each landed mechanic leaves (tg, env) => mark(...)
  const AFTERMATH = {
    grubnak: {
      // Ladle Spin: soup slopped in a ring where the ladle swept, a few splashes thrown past it
      ladle(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          for (let i = 0; i < 16; i++) {
            const a = i * TAU / 16 + hash(i, seed) * 0.3, d = s.r * (0.72 + 0.32 * hash(i + 4, seed)), r = 14 + 16 * hash(i + 8, seed);
            blob(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, seed + i, 10);
            ctx.fillStyle = rgba('#b8742a', k * 0.7); ctx.fill();
          }
          for (let i = 0; i < 22; i++) { const a = hash(i, seed + 2) * TAU, d = s.r * (0.9 + 0.35 * hash(i, seed + 3)); circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 2 + 3 * hash(i, seed + 5), rgba('#d89a4a', k)); }
        }, tg.id);
      },
      // Simmer: the coils it heated leave their rings scorched into the tiles, an ember or two still glowing
      simmer(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          const r2 = s.r2 || 0;
          for (let rr = r2 + 12; rr < s.r - 6; rr += 18) for (let seg = 0; seg < 4; seg++) {
            const a0 = seg * TAU / 4 + rr * 0.01 + 0.12;
            ctx.beginPath(); ctx.arc(s.x, s.y, rr, a0, a0 + TAU / 4 - 0.24); ctx.strokeStyle = rgba('#140804', k); ctx.lineWidth = 6; ctx.stroke();
          }
          const glowK = Math.max(0, 1 - age / 1.5);
          if (glowK > 0) for (let i = 0; i < 8; i++) { const a = hash(i, seed) * TAU, d = r2 + 12 + hash(i, seed + 1) * Math.max(10, s.r - r2 - 24); circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 2.5, rgba('#ff7a2a', k * glowK)); }
        }, tg.id);
      },
      // Spice Rack: the jar lies smashed where it fell, its spice scattered round it
      spice(tg) {
        const kind = tg.id % 3, j = JARS[kind];
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          for (let i = 0; i < 46; i++) { const a = hash(i, seed + 1) * TAU, d = Math.sqrt(hash(i + 3, seed)) * s.r * 0.95; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 2.5 + hash(i, 9) * 3, rgba(j.dust, k)); }
          blob(ctx, s.x, s.y, s.r * 0.32, seed); ctx.fillStyle = rgba(j.dust, k * 0.6); ctx.fill();
          // the broken jar, on its side, and a shard of it
          ctx.save(); ctx.globalAlpha = k; ctx.translate(s.x + 6, s.y - 4); ctx.rotate(1.2 + hash(seed, 2));
          rrect(ctx, -11, -14, 22, 26, 5, j.body, OUT, 2); rrect(ctx, -12, -20, 24, 8, 3, j.lid, OUT, 1.5);
          poly(ctx, [-11, 12, -2, 6, 4, 14, 11, 8, 11, 12, -11, 12], '#1a1210');
          ctx.restore();
          ctx.save(); ctx.globalAlpha = k; poly(ctx, [s.x - 26, s.y + 14, s.x - 16, s.y + 8, s.x - 18, s.y + 20], j.body, OUT, 1.2); ctx.restore();
        }, tg.id);
      },
      // Whisk: its wires score fine grooves along each arm
      whisk(tg) {
        mark(AFTER.tier.brief, tg.live, (ctx, s, k, age, seed) => {
          const L = Math.min(s.len, AR() + 40);
          for (let arm = 0; arm < 4; arm++) {
            const a = s.angle + arm * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
            for (const f of [-0.3, 0, 0.3]) { const ox = -sa * s.w * f, oy = ca * s.w * f; line(ctx, s.x + ox + ca * 50, s.y + oy + sa * 50, s.x + ox + ca * L, s.y + oy + sa * L, rgba('#1a0e06', k * 0.9), 2); line(ctx, s.x + ox + ca * 50, s.y + oy + sa * 50 + 1.5, s.x + ox + ca * L, s.y + oy + sa * L + 1.5, rgba('#fff2cf', k * 0.5), 1); }
          }
        }, tg.id);
      },
      // Lid Slam: the lid came down round the hole and left the floor dented: a sunken ring, cracked tiles along it
      lid(tg) {
        mark(AFTER.tier.short, tg.live, (ctx, s, k, age, seed) => {
          const r = s.r2 + 34;
          // (the dent soft-edged: a wide faint band with a slightly darker heart, not one hard dark ring)
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.strokeStyle = rgba('#140a06', k * 0.22); ctx.lineWidth = 32; ctx.stroke();
          ctx.strokeStyle = rgba('#140a06', k * 0.22); ctx.lineWidth = 16; ctx.stroke();
          ctx.beginPath(); ctx.arc(s.x, s.y, r - 12, 0, TAU); ctx.strokeStyle = rgba('#e8eef4', k * 0.5); ctx.lineWidth = 1.5; ctx.stroke();
          ctx.lineCap = 'round';
          for (let i = 0; i < 18; i++) {
            const a = i * TAU / 18 + hash(i, seed) * 0.2, d0 = r - 10, d1 = r + 22 + 30 * hash(i + 2, seed);
            ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0);
            ctx.lineTo(s.x + Math.cos(a + 0.05) * (d0 + d1) / 2, s.y + Math.sin(a + 0.05) * (d0 + d1) / 2); ctx.lineTo(s.x + Math.cos(a - 0.03) * d1, s.y + Math.sin(a - 0.03) * d1);
            ctx.strokeStyle = rgba('#0c0604', k); ctx.lineWidth = 2; ctx.stroke();
          }
        }, tg.id);
      },
      // Gorge: he sucks the whole kitchen in and blasts it back out: a scorched spiral wound round where he stood
      gorge(tg, env) {
        const at = env.boss ? { x: env.boss.x, y: env.boss.y } : tg.live;
        mark(AFTER.tier.long, { kind: 'circle', x: at.x, y: at.y, r: 0 }, (ctx, s, k, age, seed) => {
          ctx.lineCap = 'round';
          for (let arm = 0; arm < 3; arm++) {
            ctx.beginPath();
            for (let i = 0; i <= 40; i++) { const q = i / 40, a = arm * TAU / 3 + q * TAU * 1.1 + seed, d = 40 + q * 320; i ? ctx.lineTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9) : ctx.moveTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9); }
            ctx.strokeStyle = rgba('#120804', k * 0.5); ctx.lineWidth = 22; ctx.stroke();
            ctx.strokeStyle = rgba('#5a2a10', k * 0.45); ctx.lineWidth = 6; ctx.stroke();
          }
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 90); g.addColorStop(0, rgba('#0c0604', k * 0.6)); g.addColorStop(1, 'rgba(12,6,4,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, 90, 0, TAU); ctx.fill();
        }, tg.id * 0.7);
      },
    },
    volkar: {
      // Still Air: the stone lets its charge go: a ring of its colour cracks out across the stone's reach and fades,
      // leaving its sign scorched into the rock
      still(tg) {
        const sign = stillSign(tg), col = sign > 0 ? '#ffd84a' : '#6ab8ff';
        mark(AFTER.tier.brief, tg.live, (ctx, s, k, age, seed) => {
          const flash = Math.max(0, 1 - age / 0.5);
          if (flash > 0) {
            circle(ctx, s.x, s.y, s.r * (0.6 + 0.6 * (1 - flash)), null, rgba(col, 0.9 * flash), 4 + 6 * flash);
            glow(ctx, s.x, s.y, s.r * 1.2, col, 0.45 * flash);
            for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + seed, d = s.r * (1.1 - 0.5 * flash); jagged(ctx, s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 30, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, i + Math.floor(age * 20), col, 1.6 * flash + 0.4); }
          }
          ctx.save(); ctx.translate(s.x, s.y + s.r * 0.55); ctx.strokeStyle = rgba('#0a0e18', k); ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); if (sign > 0) { ctx.moveTo(0, -14); ctx.lineTo(0, 14); } ctx.stroke();
          ctx.strokeStyle = rgba(col, k); ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        }, tg.id);
      },
    },
  };
  // note the mechanics that just landed (once each; a telegraph cleared early, on a wipe or a phase change, leaves
  // nothing), from drawTelegraphs
  function track(tgs, t, env) {
    aftNow = t;
    if (marks.length && t < marks[marks.length - 1].at - 1) marks.length = 0;   // the clock went back: a new pull
    const set = env.bossId === 'wyrm' ? (typeof WYRM_ART !== 'undefined' ? WYRM_ART.aftermath(mark, AFTER) : null) : AFTERMATH[env.bossId];
    for (const tg of tgs.values()) {
      if (tg.gone == null || tg._aft) continue;
      tg._aft = true;
      if (env.bossId === 'archmage' && typeof AZ_ART !== 'undefined' && Math.abs(tg.gone - (tg.start + tg.dur)) <= 0.5) { try { AZ_ART.aftermath(tg, env, { mark, AFTER }); } catch (e) { /* a broken decal never stops the fight drawing */ } continue; }   // Azerath: archmage-art.js
      if (env.bossId === 'corvane' && typeof CV_FX !== 'undefined' && Math.abs(tg.gone - (tg.start + tg.dur)) <= 0.5) { try { CV_FX.aftermath(tg, env, { mark, AFTER }); } catch (e) { /* a broken decal never stops the fight drawing */ } continue; }   // Corvane: corvane-fx.js
      if (env.bossId === 'brannoc' && typeof BR_FX !== 'undefined' && Math.abs(tg.gone - (tg.start + tg.dur)) <= 0.5) { try { BR_FX.aftermath(tg, env, { mark, AFTER }); } catch (e) { /* a broken decal never stops the fight drawing */ } continue; }   // Brannoc: brannoc-fx.js
      if (env.bossId === 'morrowoak' && typeof MG_FX !== 'undefined' && Math.abs(tg.gone - (tg.start + tg.dur)) <= 0.5) { try { MG_FX.aftermath(tg, env, { mark, AFTER }); } catch (e) { /* a broken decal never stops the fight drawing */ } continue; }   // Morrow-Oak: morrowoak-fx.js
      if (env.bossId === 'caelum' && typeof CL_FX !== 'undefined' && Math.abs(tg.gone - (tg.start + tg.dur)) <= 0.5) { try { CL_FX.aftermath(tg, env, { mark, AFTER }); } catch (e) { /* a broken decal never stops the fight drawing */ } continue; }   // Caelum: caelum-fx.js
      if (!set || !set[tg.tag] || Math.abs(tg.gone - (tg.start + tg.dur)) > 0.5) continue;
      try { set[tg.tag](tg, env); } catch (e) { /* a broken decal never stops the fight drawing */ }
    }
  }
  // the decals, under everything the fight draws on the floor (ArenaView.drawZones)
  function drawAftermath(ctx, t) {
    if (!marks.length) return;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    for (let i = marks.length - 1; i >= 0; i--) {
      const m = marks[i], age = t - m.at;
      if (age >= m.dur || age < -1) { marks.splice(i, 1); continue; }
      const k = afterK(age, m.dur);
      if (k <= 0) continue;
      ctx.save(); m.draw(ctx, m.s, k, age, m.seed); ctx.restore();
    }
    ctx.restore();
  }

  function get(tg, env) {
    if (env.bossId === 'wyrm') return (typeof WYRM_ART !== 'undefined' && WYRM_ART.tell(tg.tag, tg.type)) || null;
    if (tg.type === 'buster') return (env.bossId === 'titan' && typeof TI_ART !== 'undefined' && TI_ART.tell(tg.tag)) || buster;
    if (env.bossId === 'skitterra') return S[tg.tag] || null;
    if (env.bossId === 'volkar') return V[tg.tag] || null;
    if (env.bossId === 'hollowking') return K[tg.tag] || null;
    if (env.bossId === 'hydra') return (typeof HY_TELLS !== 'undefined' && HY_TELLS[tg.tag]) || null;
    if (env.bossId === 'titan') return (typeof TI_ART !== 'undefined' && TI_ART.tell(tg.tag)) || HR[tg.tag] || null;   // (titan-art.js; HR is the older drawing)
    if (env.bossId === 'archmage') return (typeof AZ_ART !== 'undefined' && AZ_ART.tell(tg.tag)) || null;
    if (env.bossId === 'corvane') return (typeof CV_FX !== 'undefined' && CV_FX.tell(tg.tag)) || null;   // (corvane-fx.js)
    if (env.bossId === 'brannoc') return (typeof BR_FX !== 'undefined' && BR_FX.tell(tg.tag)) || null;   // (brannoc-fx.js)
    if (env.bossId === 'morrowoak') return (typeof MG_FX !== 'undefined' && MG_FX.tell(tg.tag)) || null;   // (morrowoak-fx.js)
    if (env.bossId === 'caelum') return (typeof CL_FX !== 'undefined' && CL_FX.tell(tg.tag)) || null;   // (caelum-fx.js)
    return G[tg.tag] || null;
  }
  // under everyone (called inside the arena clip)
  function ground(ctx, tg, s, p, k, t, env) {
    const tell = get(tg, env);
    if (!tell) return false;
    k *= ghost(tg, env);
    // a blast you can hide from: drawn with every cover prop's shadow cut out of it, so the floor behind each prop is
    // simply left unpainted (no colour of its own: the players read it from the red around it)
    const shadows = tg.cover ? coverShadows(tg, env) : null;
    if (shadows) { ctx.save(); clipOut(ctx, shadows); }
    if (tg.type === 'raidwide') { if (tell.ground) tell.ground(ctx, tg, s, p, k, t, env); }
    else {
      if (tell.ground) tell.ground(ctx, tg, s, p, k, t, env);
      if (tell.outline !== false) outline(ctx, tg, s, p, k, t, env, tell);
    }
    if (shadows) ctx.restore();
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
    if (!env.tgs || env.bossId === 'brannoc' || env.bossId === 'morrowoak' || env.bossId === 'caelum') return 1;   // (Brannoc's path pieces, waves and heel blows, Morrow-Oak's petals, strands and rods, Caelum's Wake cuts are read together, never ghosted)
    const at = tg.start + tg.dur;
    // (steps, not telegraphs: a layer of many circles landing together counts once)
    const ahead = new Set();
    for (const o of env.tgs.values()) if (o !== tg && o.tag === tg.tag && o.gone == null && o.start + o.dur < at - 0.05) ahead.add(Math.round((o.start + o.dur) * 10));
    return ghostK(ahead.size);
  }
  function ghostK(ahead) {
    return ahead === 0 ? 1 : ahead === 1 ? 0.45 : 0.22;
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
  // the lane a roller will run down, exactly as wide as what it hits (r + 16 either side of its line): a faint red wash
  // and dashed red edges out to the far wall
  const ROLL_PAD = 16;   // fight.js updateRollers: hit within r + 16
  function rollLane(ctx, m, ca, sa, t, a) {
    const hw = m.r + ROLL_PAD, L = AR() * 2;
    ctx.save(); ARENA.trace(ctx); ctx.clip();
    const shape = { kind: 'rect', x: m.x - ca * hw, y: m.y - sa * hw, angle: m.a, len: L + hw, w: hw * 2 };
    SHAPES.trace(ctx, shape); ctx.fillStyle = rgba(COL.danger, 0.17 * a); ctx.fill();
    // bold edges (a glow under a crisp dashed line) and chevrons marching down the whole lane to the far wall,
    // so the path reads as clearly as the gravy trail it leaves behind
    for (const side of [-1, 1]) line(ctx, m.x - sa * hw * side, m.y + ca * hw * side, m.x - sa * hw * side + ca * L, m.y + ca * hw * side + sa * L, rgba(COL.danger, 0.22 * a), 8);
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 40;
    for (const side of [-1, 1]) line(ctx, m.x - sa * hw * side, m.y + ca * hw * side, m.x - sa * hw * side + ca * L, m.y + ca * hw * side + sa * L, rgba(COL.danger, Math.min(1, a * 1.15)), 3);
    ctx.setLineDash([]);
    const step = 110, off = (t * 130) % step, ch = Math.min(hw * 0.55, 30);
    for (let d = m.r + 30 + off; d < L; d += step) {
      ctx.save(); ctx.translate(m.x + ca * d, m.y + sa * d); ctx.rotate(m.a);
      poly(ctx, [-ch * 0.5, -ch, ch * 0.5, 0, -ch * 0.5, ch, -ch * 0.15, 0], rgba(COL.danger, 0.34 * a * Math.max(0.25, 1 - d / L)), null);
      ctx.restore();
    }
    ctx.restore();
  }
  // r: { x, y, a, sp, r, delay, start, tag } (client clock)
  function drawRollers(ctx, rollers, t, env) {
    for (const [id, m] of rollers) {
      const rollAt = m.start + m.delay, end = rollAt + (2 * AR() + 300) / m.sp;
      if (t > end) { rollers.delete(id); continue; }
      const ca = Math.cos(m.a), sa = Math.sin(m.a);
      if (m.pre) {   // the lane shown ahead of the lob: it fades in over the cast, and the real roller takes over at rollAt
        if (t >= rollAt) { rollers.delete(id); continue; }
        // the real roller for this lane is drawing its own lane now (a meatball once it has landed): it takes over from
        // here, so the lane never doubles up and never blinks out
        let real = false;
        for (const o of rollers.values()) if (!o.pre && o.tag === m.tag && t - o.start >= (o.tag === 'orb' ? 0 : 0.5) && Math.abs(o.x - m.x) < 2 && Math.abs(o.y - m.y) < 2 && Math.abs(o.a - m.a) < 0.01) { real = true; break; }
        if (real) { rollers.delete(id); continue; }
        rollLane(ctx, m, ca, sa, t, 0.3 + 0.4 * clamp((t - m.start) / Math.max(0.5, m.delay), 0, 1));
        continue;
      }
      if (m.tag === 'orb') {
        // it gathers out of the air at the cliff edge, crackles in place (chevrons show its heading), then drifts
        const d = Math.max(0, t - rollAt) * m.sp, x = m.x + ca * d, y = m.y + sa * d;
        if (ARENA.sd(x, y) > m.r + 40) continue;
        const form = clamp((t - m.start) / 0.6, 0, 1);
        if (t < rollAt) {
          const q = (t - m.start) / Math.max(0.1, m.delay);
          rollLane(ctx, m, ca, sa, t, 0.45 + 0.35 * clamp(q, 0, 1));
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
        // (the lane is as wide as the hit: anyone within r + 16 of its middle is run over, fight.js updateRollers)
        rollLane(ctx, m, ca, sa, t, 0.45 + 0.35 * q);
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
      // the line she will drag you along, drawn on the floor from the first moment: pale chevrons running in toward her, and where the
      // Collapse has taken the floor, the silk stops dead at the brink (an anchor bar and a taut, shuddering thread; dash to snap it).
      // It is only the path of the drag; where it is safe to be is never painted.
      const held = !!rl.held && pulling;
      if (typeof SK_FX !== 'undefined' && shoot >= 1) {
        const pp = SK_FX.pullPath(env.room, e.x, e.y, b.x, b.y), run = (t * (pulling ? 150 : 60)) % 46, ca = pp.ux, sa = pp.uy;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const fade = Math.min(1, (t - rl.start - 0.35) / 0.3) * 0.75;
        for (let d = 14 + run; d < pp.len - 12; d += 46) {
          const x = e.x + ca * d, y = e.y + sa * d + 2, a = fade * Math.min(1, d / 40) * Math.min(1, (pp.len - d) / 40);
          ctx.beginPath(); ctx.moveTo(x - ca * 11 - sa * 12, y - sa * 11 + ca * 12); ctx.lineTo(x + ca * 10, y + sa * 10); ctx.lineTo(x - ca * 11 + sa * 12, y - sa * 11 - ca * 12);
          ctx.strokeStyle = `rgba(20,10,30,${0.7 * a})`; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = `rgba(244,240,255,${a})`; ctx.lineWidth = 3.4; ctx.stroke();
        }
        if (pp.held) {
          // the brink: the bar where the silk catches, and a short dashed run on past it in red (the drag would go on over the fallen floor)
          const ax = pp.x + ca * 22, ay = pp.y + sa * 22 + 2, pulse = 0.6 + 0.4 * Math.sin(t * (held ? 18 : 6));
          ctx.beginPath(); ctx.moveTo(ax - sa * 48, ay + ca * 48); ctx.lineTo(ax + sa * 48, ay - ca * 48);
          ctx.strokeStyle = `rgba(20,10,30,${0.75 * fade})`; ctx.lineWidth = 11; ctx.stroke(); ctx.strokeStyle = rgba(COL.danger, (held ? 1 : 0.85 * pulse) * fade); ctx.lineWidth = 6; ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.9 * fade})`; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.setLineDash([9, 9]); ctx.beginPath(); ctx.moveTo(ax + ca * 8, ay + sa * 8); ctx.lineTo(ax + ca * 120, ay + sa * 120);
          ctx.strokeStyle = rgba(COL.dangerHi, 0.55 * fade); ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]);
          if (held) glow(ctx, ax, ay, 30 + Math.sin(t * 30) * 5, '#ff8a7a', 0.45);
        }
        ctx.restore();
      }
      const vib = pulling ? Math.sin(t * 40) * (held ? 8 : 3) : 0;
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
        ctx.fillStyle = rgba(COL.danger, (live ? 0.12 : 0.06) * k); ctx.fill();
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
        ctx.strokeStyle = rgba(COL.danger, (live ? 0.85 : 0.45) * k); ctx.lineWidth = live ? 3 : 2; ctx.stroke();
        { ctx.save(); ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 30; SHAPES.trace(ctx, shape); ctx.strokeStyle = rgba(COL.danger, 0.5 * k); ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore(); }
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
      ctx.restore();   // (the still air behind each boulder is left unpainted)
    }
    ctx.restore();
  }

  window.HY_BT = { AFTERMATH, mark, AFTER };   // (the Hydra's floor marks are set up in hydra-view.js)
  return { COL, setRoom, AFTER, afterK, get, ground, air, fade, rims, roleColor, track, drawAftermath, drawRollers, drawReels, drawSweeps, rodPost: (ctx, x, y, t, a) => rodPole(ctx, x, y, t, a, 0.15) };
})();
