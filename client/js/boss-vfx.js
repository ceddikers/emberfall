// Boss-side VFX: what happens when a telegraph lands, the wind-up while the boss casts, auto-attack
// hits, adds popping in and out, the victory burst. All of it is driven by messages the host
// broadcasts (tg / tgx / bcast / banim / addev / fight...), so every player sees the same moments.

const BOSS_VFX = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const AR = () => ARENA.R;   // far enough to reach every wall of the room
  const shake = n => { FX.shake = Math.max(FX.shake, n); };
  const after = (sec, fn) => VFX.fx({ dur: sec, layer: 'ground', draw() {}, done: fn });
  const clipArena = c => { ARENA.trace(c, 4); c.clip(); };

  // random points inside a shape (and inside the arena)
  function scatter(s, n) {
    const out = [], small = s.kind === 'circle' && s.r < ARENA.inner;
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * (small ? s.r : AR());
        const x = (small ? s.x : 0) + Math.cos(a) * d, y = (small ? s.y : 0) + Math.sin(a) * d;
        if (ARENA.sd(x, y) > -20) continue;
        if (small || SHAPES.contains(s, x, y)) { out.push({ x, y }); break; }
      }
    }
    return out;
  }
  const ringPts = (x, y, r, n) => Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.1, 0.1); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, a }; });

  // the whole shape flashes and its rim burns white, then fades (replaces the old flat flash).
  // The fill is screened, not added: on a pale floor (Grubnak's cream tiles) an additive fill clips to flat white and
  // washes the floor out for a moment; screen lifts dark floors about as much and leaves light ones readable. The
  // punch comes from the rim, which stays additive.
  function shapeFlash(s, color, o = {}) {
    const dur = o.dur ?? 0.5, a = o.a ?? 0.45;
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = (1 - p) * (1 - p) * e.a;
      c.save(); clipArena(c);
      SHAPES.trace(c, s);
      c.globalCompositeOperation = 'screen';
      c.globalAlpha = a * k; c.fillStyle = color; c.fill();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.min(1, 0.8 * k); c.strokeStyle = color; c.lineWidth = 10 * (1 - p) + 2; c.stroke();
      c.globalAlpha = Math.min(1, 1.2 * k); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.stroke();
      c.restore();
    } });
  }
  // a bright band wiping across a rect from its base line to the far end
  function sweep(s, color, dur = 0.32) {
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(p), along = Math.min(s.len, AR() * 2) * q, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      const cx = s.x + ca * along, cy = s.y + sa * along, hw = Math.min(s.w / 2, AR() * 2);
      c.save(); clipArena(c);
      VFX.neonPath(c, color, 16 * (1 - p * 0.5), e.a * (1 - p * p), () => { c.moveTo(cx - sa * hw, cy + ca * hw); c.lineTo(cx + sa * hw, cy - ca * hw); });
      c.restore();
    } });
  }
  // a beam shot along a direction to the arena wall
  function streak(x, y, ang, color, o = {}) {
    const len = o.len ?? AR() * 2.2, w = o.w ?? 10;
    VFX.fx({ dur: o.dur ?? 0.3, layer: 'air', draw: (c, p, t, e) => {
      const grow = easeOut(Math.min(1, p / 0.35)), k = e.a * (1 - Math.max(0, p - 0.35) / 0.65);
      c.save(); clipArena(c);
      VFX.neonPath(c, color, w * (1 - p * 0.6), k, () => { c.moveTo(x, y - 6); c.lineTo(x + Math.cos(ang) * len * grow, y - 6 + Math.sin(ang) * len * grow); });
      c.restore();
    } });
  }
  // a whole-room tint (raidwides). Bright colours are screened (see shapeFlash: never a white-out on the pale floors);
  // dark ones (nightfall, a wipe) are laid over normally so they actually darken the room
  const isDark = col => { const [r, g, b] = hexToRgb(col); return r * 0.3 + g * 0.59 + b * 0.11 < 60; };
  function roomTint(color, a = 0.28, dur = 0.7) {
    const mode = isDark(color) ? 'source-over' : 'screen';
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      c.save(); clipArena(c); c.globalCompositeOperation = mode;
      c.globalAlpha = a * (1 - p) * e.a; c.fillStyle = color; c.fillRect(-AR() - 10, -AR() - 10, AR() * 2 + 20, AR() * 2 + 20);
      c.restore();
    } });
  }
  const steam = (x, y, n, speed, color = '#f6f2ee') => {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + rand(-0.2, 0.2), sp = rand(0.6, 1) * speed;
      VFX.spawn({ x, y, z: rand(0, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(20, 60), drag: 0.035, life: rand(0.9, 1.4), size: rand(26, 40), size1: 90,
        color, kind: 'smoke', add: false, a: 0.7, fadeIn: 0.05, fadePow: 2 });
    }
  };

  // ---------------------------------------------------------------- telegraph impacts by tag
  const IMPACT = {
    // Grubnak
    mince(tg) {
      const s = tg.live;
      shapeFlash(s, '#ff6a4a', { a: 0.3, dur: 0.55 });
      sweep(s, '#ffd8b0');
      // the cleaver line along the boss
      const ca = Math.cos(s.angle + Math.PI / 2), sa = Math.sin(s.angle + Math.PI / 2);
      for (let i = 0; i < 9; i++) { const d = rand(-AR(), AR()); VFX.sparks(s.x + ca * d, s.y + sa * d, { color: '#ffe6c0', n: 4, angle: s.angle, spread: 0.6, speed: 380 }); }
      for (const q of scatter(s, 7)) VFX.smoke(q.x, q.y, { n: 2, color: '#e8dccb', size: 26, a: 0.55, speed: 50 });
      for (const q of scatter(s, 3)) VFX.decal(q.x, q.y, { style: 'crack', r: 50, dur: 2.2, a: 0.5, seed: Math.random() * 6 });
      shake(9);
    },
    ladle(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffb050', { a: 0.38 });
      VFX.shock(s.x, s.y, { r: s.r * 1.05, color: '#ffd08a', w: 8, dur: 0.45, flat: 1 });
      VFX.swirl(s.x, s.y, { r: s.r * 0.8, color: '#ffcf7a', dur: 0.55, arms: 3 });
      for (const q of ringPts(s.x, s.y, s.r * 0.8, 10)) VFX.splash(q.x, q.y, { color: '#d8902a', n: 4, speed: 1.2 });
      shake(6);
    },
    lid(tg) {
      const s = tg.live;
      shapeFlash(s, '#b8cfff', { a: 0.26 });
      VFX.shock(s.x, s.y, { r0: s.r2, r: AR() * 1.15, color: '#eaf3ff', w: 12, dur: 0.55, flat: 1 });
      VFX.shock(s.x, s.y, { r0: s.r2, r: AR(), color: '#9ec2ff', w: 6, dur: 0.75, flat: 1, delay: 0.08 });
      for (const q of ringPts(s.x, s.y, s.r2, 14)) VFX.sparks(q.x, q.y, { color: '#ffffff', n: 2, angle: q.a, spread: 0.3, speed: 520 });
      shake(8);
    },
    spread(tg) {
      const s = tg.live;
      shapeFlash(s, '#c070ff', { a: 0.4, dur: 0.4 });
      VFX.burst(s.x, s.y, { color: '#e0b0ff', color2: '#ffffff', n: 16, speed: 260 });
      VFX.splash(s.x, s.y, { color: '#8a4a2a', n: 8 });
      VFX.shock(s.x, s.y, { r: s.r, color: '#d79bff', flat: 1 });
    },
    stack(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffd84a', { a: 0.45 });
      VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 240, color: '#ffe27a', dur: 0.75 });
      VFX.burst(s.x, s.y, { color: '#ffe27a', color2: '#ffffff', n: 22, speed: 300, size: 16 });
      VFX.shock(s.x, s.y, { r: s.r * 1.25, color: '#ffd84a', w: 6, flat: 1 });
      shake(5);
    },
    plate(tg) {
      const s = tg.live;
      shapeFlash(s, '#6ff0e0', { a: 0.4 });
      VFX.pillar(s.x, s.y, { r: s.r * 0.6, h: 260, color: '#9ffff4', dur: 0.8 });
      VFX.crystals(s.x, s.y, { r: s.r * 0.8, color: '#e8fffc', n: 8, h: 40, dur: 0.7 });
      VFX.burst(s.x, s.y, { color: '#9ffff4', n: 14, speed: 240 });
    },
    spice(tg) {
      const s = tg.live;
      shapeFlash(s, '#ff5a2a', { a: 0.38 });
      VFX.flare(s.x, s.y, { color: '#ff4a1a', n: 14, r: s.r * 0.4 });
      VFX.smoke(s.x, s.y, { color: '#c86a40', n: 6, size: 30, a: 0.5, speed: 90, r: s.r * 0.4 });
      VFX.sparks(s.x, s.y, { color: '#ffb040', n: 10 });
      VFX.shock(s.x, s.y, { r: s.r, color: '#ff8a3a', flat: 1 });
    },
    whisk(tg) {
      const s = tg.live;
      shapeFlash(s, '#fff0c8', { a: 0.28, dur: 0.4 });
      for (const rot of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) streak(s.x, s.y, s.angle + rot, '#fff2cf', { w: 14, dur: 0.35 });
      for (const q of scatter(s, 14)) VFX.spawn({ x: q.x, y: q.y, z: 8, vz: rand(40, 120), life: rand(0.4, 0.7), size: rand(8, 14), size1: 0, color: '#fff6dc', kind: 'star', vr: rand(-5, 5) });
      VFX.swirl(s.x, s.y, { r: 90, color: '#ffe9b0', dur: 0.5 });
      shake(4);
    },
    boil(tg) {
      const s = tg.live;
      VFX.flare(s.x, s.y, { color: '#ff7a2a', n: 30, r: 60, h: 1.6, size: 1.4 });
      steam(s.x, s.y, 18, 520);
      VFX.shock(s.x, s.y, { r: AR(), color: '#ffb070', w: 10, dur: 0.7, flat: 1 });
      roomTint('#ff6a2a', 0.22);
    },
    // the Hollow King: a lid grinding to a stop, the Decree washing down the hall, the vault coming down, his eyes in the dark
    lid(tg) {
      const s = tg.live;
      sweep(s, '#c8ffd8', 0.4);
      for (let d = 30; d < s.len; d += 60) VFX.smoke(s.x + Math.cos(s.angle) * d, s.y, { color: '#a8b0ac', n: 1, size: 28, a: 0.5, speed: 50 });
      shake(5);
    },
    decree() {
      roomTint('#3aff7a', 0.2, 0.6);
      for (let i = 0; i < 12; i++) { const x = -ARENA.hw + (i + 0.5) / 12 * ARENA.hw * 2; after(i * 0.02, () => VFX.pillar(x, -ARENA.hh + 40 + Math.random() * ARENA.hh * 1.6, { r: 14, h: 110, color: '#7affa8', dur: 0.45 })); }
      shake(8);
    },
    masonry(tg) {
      const s = tg.live;
      VFX.debris(s.x, s.y - 10, { color: '#4a5054', n: 14, speed: 1.3, up: 1.1 });
      VFX.smoke(s.x, s.y, { color: '#a8b0ac', n: 8, size: 36, a: 0.6, speed: 120 });
      VFX.shock(s.x, s.y, { r: s.r * 1.6, color: '#d8e0dc', w: 6, dur: 0.4, flat: 1 });
      shake(7);
    },
    dark() { roomTint('#e8fff0', 0.12, 0.35); shake(4); },
    // Skitterra: the acid comes down everywhere the shadows don't reach; a strand snaps taut
    deluge(tg) {
      roomTint('#7ad83a', 0.22, 0.7);
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() }, 16)) VFX.splash(q.x, q.y, { color: '#9adf3a', n: 5, speed: 1.1 });
      VFX.shock(tg.live.x, tg.live.y, { r: AR(), color: '#c8ff8a', w: 10, dur: 0.6, flat: 1 });
      shake(7);
    },
    strand(tg) {
      const s = tg.live;
      shapeFlash(s, '#f4f0ff', { a: 0.3, dur: 0.4 });
      streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 8, dur: 0.35 });
      shake(4);
    },
    ambush(tg) {
      const s = tg.live;
      VFX.shock(s.x, s.y, { r: s.r * 1.4, color: '#d8c8ff', w: 12, dur: 0.5, flat: 1 });
      VFX.debris(s.x, s.y, { color: '#4a4156', n: 14, speed: 1.4 });
      VFX.smoke(s.x, s.y, { color: '#8a8098', n: 10, size: 40, a: 0.6, speed: 140 });
      VFX.decal(s.x, s.y, { style: 'crack', r: s.r * 0.8, dur: 3, a: 0.6, seed: Math.random() * 6 });
      shake(12);
    },
    // Butcher's Charge: a trail of dust and broken grout along his path (the impact at the end comes as a 'slam')
    charge(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      shapeFlash(s, '#ff9a5a', { a: 0.28, dur: 0.4 });
      for (let d = 40; d < s.len; d += 60) {
        const x = s.x + ca * d, y = s.y + sa * d;
        if (ARENA.sd(x, y) > -20) break;
        after(d / 1150, () => { VFX.smoke(x, y, { color: '#d8c4a4', n: 2, size: 30, a: 0.55, speed: 70 }); VFX.debris(x, y, { color: '#c9b48e', n: 2, speed: 0.6, size: 0.7 }); });
      }
      shake(5);
    },
    cask(tg) {
      const s = tg.live;
      VFX.shock(s.x, s.y, { r: s.r * 1.2, color: '#ffd8a0', w: 6, dur: 0.4, flat: 1 });
      VFX.smoke(s.x, s.y, { color: '#d8c4a4', n: 6, size: 30, a: 0.6, speed: 90 });
      VFX.debris(s.x, s.y, { color: '#c9b48e', n: 6, speed: 0.9 });
      shake(5);
    },
    gut(tg) {
      const s = tg.live;
      for (let i = 0; i < 3; i++) VFX.shock(s.x, s.y, { r: AR() * 1.6, color: '#d8e89a', w: 14, dur: 0.7, flat: 1, delay: i * 0.1 });
      roomTint('#a8b84a', 0.22, 0.7);
      steam(s.x, s.y, 12, 420, '#c8d08a');
      shake(9);
    },
    hook(tg) {
      const s = tg.live;
      VFX.sparks(s.x, s.y - 20, { color: '#e8eef4', n: 10, angle: s.angle, spread: 0.5, speed: 380 });
      streak(s.x, s.y, s.angle, '#e8eef4', { len: s.len, w: 8, dur: 0.3 });
    },
    rush(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), len = Math.min(s.len, AR() * 2);
      shapeFlash(s, '#ff8a3a', { a: 0.34 });
      for (let d = 30; d < len; d += 70) {
        const x = s.x + ca * d, y = s.y + sa * d;
        if (ARENA.sd(x, y) > 0) break;
        VFX.smoke(x, y, { color: '#d8c4a4', n: 2, size: 34, a: 0.6, speed: 60 });
      }
      shake(7);
    },
    simmer(tg) {
      const s = tg.live;
      shapeFlash(s, '#ff7a3a', { a: 0.32, dur: 0.45 });
      for (const q of scatter(s, 16)) {
        VFX.spawn({ x: q.x, y: q.y, z: 0, vz: rand(50, 130), life: rand(0.4, 0.8), size: rand(8, 16), size1: 2, color: Math.random() < 0.5 ? '#ff9a3a' : '#ffd070' });
        if (Math.random() < 0.3) VFX.shock(q.x, q.y, { r: 22, color: '#ffc080', w: 2, dur: 0.3, flat: 1 });
      }
    },
    grease(tg) {
      roomTint('#ff7a1a', 0.3);
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 30 }, 12)) after(rand(0, 0.3), () => VFX.flare(q.x, q.y, { color: '#ff6a1a', n: 12, h: 1.2 }));
      shake(7);
    },
    // Grubnak, Hard: the belly landing, the cleaver flying out and back, the brandy going up
    flop(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffcf9a', { a: 0.3, dur: 0.45 });
      VFX.shock(s.x, s.y, { r: s.r * 1.6, color: '#f0e0c8', w: 12, dur: 0.55, flat: 1 });
      VFX.shock(s.x, s.y, { r: AR() * 0.9, color: '#e8d8c0', w: 5, dur: 0.8, flat: 1, delay: 0.1 });
      for (const q of ringPts(s.x, s.y, s.r * 0.9, 12)) VFX.smoke(q.x, q.y, { n: 1, color: '#e0d4c0', size: 34, a: 0.6, speed: 140 });
      for (const q of ringPts(s.x, s.y, s.r * 0.55, 6)) VFX.debris(q.x, q.y, { color: '#8a6a4a', n: 3, speed: 1.1, up: 1.2 });
      VFX.decal(s.x, s.y, { style: 'crack', r: s.r * 0.7, dur: 2.5, a: 0.55, seed: Math.random() * 6 });
      shake(11);
    },
    cleaver(tg) {
      const s = tg.live;
      streak(s.x, s.y, s.angle, '#ffe6d0', { w: 14, dur: 0.3 });
      for (let i = 0; i < 4; i++) { const d = rand(100, AR() * 1.2); VFX.sparks(s.x + Math.cos(s.angle) * d, s.y + Math.sin(s.angle) * d, { color: '#ffffff', n: 4, angle: s.angle, spread: 0.4, speed: 360 }); }
      shake(5);
    },
    cleaverback(tg) {
      const s = tg.live, L = Math.min(s.len, AR() * 2);
      streak(s.x + Math.cos(s.angle) * L, s.y + Math.sin(s.angle) * L, s.angle + Math.PI, '#ffffff', { w: 12, dur: 0.3, len: L });
      VFX.sparks(s.x, s.y, { color: '#ffe6d0', n: 10, speed: 260 });
      shake(5);
    },
    flambe(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      shapeFlash(s, '#ff9a3a', { a: 0.4, dur: 0.55 });
      for (let d = 30; d < s.len; d += 90) {
        const off = rand(-0.3, 0.3) * s.w, x = s.x + ca * d - sa * off, y = s.y + sa * d + ca * off;
        if (ARENA.sd(x, y) > -10) continue;
        after(rand(0, 0.2), () => VFX.flare(x, y, { color: Math.random() < 0.3 ? '#6ab0ff' : '#ff7a1a', n: 8, h: 1.3 }));
      }
      shake(4);
    },
    // Skitterra
    mist(tg) {
      roomTint('#7ae03a', 0.22, 0.9);
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 30 }, 18)) VFX.smoke(q.x, q.y, { color: '#8ad84a', n: 2, size: 40, a: 0.45, speed: 40, life: 1.4 });
      shake(5);
    },
    lunge(tg) {
      const s = tg.live;
      shapeFlash(s, '#ff7ac0', { a: 0.22, dur: 0.35 });
      streak(s.x, s.y, s.angle, '#ffb0dc', { w: 12, dur: 0.28 });
      for (let i = 0; i < 3; i++) { const d = rand(120, AR() * 1.2); VFX.sparks(s.x + Math.cos(s.angle) * d, s.y + Math.sin(s.angle) * d, { color: '#ffd0ec', n: 3, angle: s.angle, spread: 0.5, speed: 300 }); }
      // where the leg's tip drives into the floor: a burst of chitin spikes and broken stone
      const tip = Math.min(500, s.len || 500), tx = s.x + Math.cos(s.angle) * tip, ty = s.y + Math.sin(s.angle) * tip;
      if (ARENA.sd(tx, ty) < -20) {
        VFX.spikeburst(tx, ty, { r: 46, n: 9, color: '#ff7ac0', core: '#ffe0f0', ink: '#2a0a20', layer: 'ground' });
        VFX.debris(tx, ty, { color: '#4a4156', n: 6, speed: 0.9 });
      }
      shake(4);
    },
    venom(tg) {
      const s = tg.live;
      shapeFlash(s, '#9adf3a', { a: 0.3, dur: 0.4 });
      streak(s.x, s.y, s.angle, '#b8ff5a', { w: 9, dur: 0.35 });
      for (let i = 1; i <= 4; i++) { const d = i * 110; VFX.splash(s.x + Math.cos(s.angle) * d, s.y + Math.sin(s.angle) * d, { color: '#8ad82a', n: 4 }); }
    },
    // Skitterra, Hard: a sac bursting, the charge, a glob of silk landing
    eggsac(tg) {
      const s = tg.live;
      VFX.burst(s.x, s.y - 6, { color: '#e8ff9a', color2: '#ffffff', n: 16, speed: 220 });
      VFX.splash(s.x, s.y, { color: '#8ad82a', n: 10 });
      VFX.shock(s.x, s.y, { r: s.r * 1.3, color: '#d8ff7a', w: 5, flat: 1 });
      shake(3);
    },
    fang(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      shapeFlash(s, '#ff7ac0', { a: 0.3, dur: 0.4 });
      streak(s.x, s.y, s.angle, '#ffb0dc', { w: 16, dur: 0.3 });
      for (let d = 40; d < AR() * 2; d += 80) {
        const x = s.x + ca * d, y = s.y + sa * d;
        if (ARENA.sd(x, y) > 0) break;
        VFX.smoke(x, y, { color: '#e8e0f0', n: 2, size: 30, a: 0.5, speed: 60 });
      }
      shake(7);
    },
    glob(tg) {
      const s = tg.live;
      VFX.smoke(s.x, s.y, { color: '#f4f0ff', n: 6, size: 26, a: 0.65, speed: 70 });
      VFX.burst(s.x, s.y, { color: '#f4f0ff', n: 10, speed: 180, size: 10 });
      VFX.shock(s.x, s.y, { r: s.r, color: '#ffffff', w: 4, dur: 0.35, flat: 1 });
    },
    // Volkar
    clap() {
      roomTint('#bfe0ff', 0.32, 0.6);
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 40 }, 6)) after(rand(0, 0.25), () => {
        VFX.lightning(q.x + rand(-40, 40), q.y - 320, q.x, q.y, { color: '#bfe8ff', jag: 22, dur: 0.35 });
        VFX.shock(q.x, q.y, { r: 60, color: '#bfe8ff', w: 4, dur: 0.35, flat: 1 });
      });
      shake(8);
    },
    surge(tg, ctx) {
      const us = (ctx && ctx.units) || [], pol = ctx && ctx.pol;
      if (!pol) return;
      for (const u of us) {
        const s = pol.get(u.id); if (!s) continue;
        const col = s > 0 ? '#ffc24a' : '#4ad8ff';
        VFX.shock(u.x, u.y, { r: 70, color: col, w: 4, dur: 0.4, flat: 1 });
        VFX.sparks(u.x, u.y - 14, { color: col, n: 6, speed: 220 });
      }
      for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
        const a = us[i], b = us[j];
        if (pol.get(a.id) !== pol.get(b.id) || Math.hypot(a.x - b.x, a.y - b.y) > tg.live.r) continue;
        for (let n = 0; n < 3; n++) VFX.lightning(a.x, a.y - 16, b.x, b.y - 16, { color: '#ff7a6a', jag: 14, dur: 0.45 });
        shake(6);
      }
    },
    crash(tg) {
      const s = tg.live;
      VFX.lightning(s.x + rand(-20, 20), s.y - 360, s.x, s.y, { color: '#fff2b0', jag: 26, dur: 0.4 });
      VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 260, color: '#fff0a0', dur: 0.6 });
      VFX.shock(s.x, s.y, { r: s.r * 1.3, color: '#ffe27a', w: 6, flat: 1 });
      VFX.decal(s.x, s.y, { style: 'crack', r: 50, dur: 2.2, a: 0.5, seed: Math.random() * 6 });
      shake(6);
    },
    static(tg) {
      const s = tg.live;
      shapeFlash(s, '#c070ff', { a: 0.35, dur: 0.35 });
      for (let i = 0; i < 4; i++) { const a = rand(0, TAU); VFX.lightning(s.x, s.y - 10, s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r, { color: '#e0b8ff', jag: 10, dur: 0.3 }); }
    },
    rod(tg) {
      const s = tg.live;
      VFX.lightning(s.x + rand(-30, 30), s.y - 420, s.x, s.y - 84, { color: '#bff6ff', jag: 30, dur: 0.45 });
      VFX.lightning(s.x + rand(-30, 30), s.y - 420, s.x, s.y - 84, { color: '#ffffff', jag: 24, dur: 0.3 });
      VFX.shock(s.x, s.y, { r: s.r * 1.2, color: '#9ff4ff', w: 6, dur: 0.45, flat: 1 });
      VFX.sparks(s.x, s.y - 80, { color: '#dffbff', n: 14, speed: 300 });
      roomTint('#bfe8ff', 0.12, 0.3);
      shake(7);
    },
    gale(tg) {
      const s = tg.live;
      VFX.shock(s.x, s.y, { r: AR() * 1.1, color: '#e8f4ff', w: 14, dur: 0.6, flat: 1 });
      VFX.shock(s.x, s.y, { r: AR() * 0.9, color: '#bfe0ff', w: 6, dur: 0.75, flat: 1, delay: 0.08 });
      for (let i = 0; i < 16; i++) streak(s.x, s.y, i * TAU / 16 + rand(-0.1, 0.1), '#eaf4ff', { w: 6, dur: 0.4, len: AR() });
      shake(10);
    },
    // Volkar, Hard: the storm cell over Chain Lightning's target breaks (the leaps come in their own message), and
    // the sky falling
    chain(tg) { const s = tg.live; VFX.shock(s.x, s.y, { r: s.r, color: '#9ff4ff', w: 4, dur: 0.4, flat: 1 }); roomTint('#bfe8ff', 0.1, 0.3); },
    skyfall(tg) {
      const s = tg.live;
      for (let i = 0; i < 4; i++) VFX.lightning(s.x + rand(-50, 50), s.y - 460, s.x + rand(-20, 20), s.y, { color: i % 2 ? '#ffffff' : '#bfe8ff', jag: 30, dur: 0.5 });
      VFX.pillar(s.x, s.y, { r: 90, h: 420, color: '#dff4ff', dur: 0.8 });
      for (let i = 0; i < 3; i++) VFX.shock(s.x, s.y, { r: 640, color: '#cfeaff', w: 12 - i * 3, dur: 0.7, flat: 1, delay: i * 0.12 });
      VFX.decal(s.x, s.y, { style: 'crack', r: 110, dur: 3, a: 0.6, seed: Math.random() * 6 });
      roomTint('#dff4ff', 0.3, 0.6);
      shake(12);
    },
    // Rod Strike: the bolts come in their own message (propfx 'bolt'); Avalanche: the boulder thuds down where it stops
    rodstrike() {},
    avalanche(tg) {
      const s = tg.live, d = s.len - 40, x = s.x + Math.cos(s.angle) * d, y = s.y + Math.sin(s.angle) * d;
      VFX.smoke(x, y, { color: '#c8c0b0', n: 10, size: 40, a: 0.6, speed: 120 });
      VFX.debris(x, y - 10, { color: '#6a6460', n: 10, speed: 1.1 });
      VFX.shock(x, y, { r: 120, color: '#e0d6c4', w: 6, dur: 0.45, flat: 1 });
      VFX.decal(x, y, { style: 'crack', r: 60, dur: 3, a: 0.5, seed: Math.random() * 6 });
      for (let i = 0; i < 6; i++) { const q = i / 6; VFX.smoke(s.x + Math.cos(s.angle) * d * q, s.y + Math.sin(s.angle) * d * q, { color: '#b8ae9c', n: 2, size: 30, a: 0.4, speed: 50 }); }
      shake(6);
    },
    // the Hollow King
    knell(tg) {
      roomTint('#c8ffdc', 0.2, 0.7);
      for (let i = 0; i < 3; i++) VFX.shock(0, 0, { r: AR() * 1.2, color: '#c8ffdc', w: 8, dur: 0.8, flat: 1, delay: i * 0.15 });
      shake(7);
    },
    gaze() { roomTint('#e8fff0', 0.16, 0.4); },
    sweep(tg) { graveBurst(tg.live, '#7affa8'); shake(7); },
    stomp(tg) {
      const s = tg.live;
      graveBurst(s, '#7affa8');
      VFX.shock(s.x, s.y, { r: s.r * 1.1, color: '#9affc0', w: 10, dur: 0.5, flat: 1 });
      VFX.decal(s.x, s.y, { style: 'crack', r: s.r * 0.6, dur: 2.5, a: 0.5, seed: Math.random() * 6 });
      shake(9);
    },
    ring(tg) { graveBurst(tg.live, '#7affa8'); VFX.shock(tg.live.x, tg.live.y, { r0: AR(), r: tg.live.r2, color: '#9affc0', w: 10, dur: 0.5, flat: 1 }); shake(8); },
    esweep(tg) { graveBurst(tg.live, '#b8ffd0'); shake(5); },
    estomp(tg) { const s = tg.live; graveBurst(s, '#b8ffd0'); VFX.shock(s.x, s.y, { r: s.r * 1.1, color: '#b8ffd0', w: 8, dur: 0.5, flat: 1 }); shake(6); },
    ering(tg) { graveBurst(tg.live, '#b8ffd0'); shake(6); },
    marks(tg) { const s = tg.live; shapeFlash(s, '#9affc0', { a: 0.35, dur: 0.4 }); VFX.sparks(s.x, s.y, { color: '#c8ffd8', n: 6, speed: 220 }); },
    bell(tg) {
      const s = tg.live;
      for (let i = 0; i < 3; i++) VFX.shock(s.x, s.y, { r: s.r * (1.4 + i * 0.6), color: '#ffe2a0', w: 5, dur: 0.6, flat: 1, delay: i * 0.12 });
      VFX.sparks(s.x, s.y - 100, { color: '#ffe8b0', n: 10, speed: 200 });
      shake(4);
    },
    // the Hollow King, Hard: the crown's flash, and a rank of the dead tramping through
    audience() { roomTint('#ffe6a0', 0.18, 0.45); },
    march(tg) { graveBurst(tg.live, '#7affa8'); sweep(tg.live, '#c8ffd8', 0.4); shake(5); },
  };
  // grave-light bursting up out of an area
  function graveBurst(s, color) {
    shapeFlash(s, color, { a: 0.32, dur: 0.45 });
    for (const q of scatter(s, 10)) after(rand(0, 0.15), () => VFX.pillar(q.x, q.y, { r: 16, h: 90 + rand(0, 60), color, dur: 0.45 }));
  }

  function impact(tg, msg, ctx) {
    if (tg.type === 'raidwide') { (IMPACT[tg.tag] || (() => { roomTint('#ffffff', 0.18); shake(6); }))(tg, ctx); return; }
    if (tg.type === 'proximity') { (IMPACT[tg.tag] || IMPACT.boil)(tg); shake(10); return; }
    if (tg.type === 'knockback') { const s = tg.live; VFX.shock(s.x, s.y, { r: 380, color: '#bfe6ff', w: 8, dur: 0.6, flat: 1 }); VFX.tornado(s.x, s.y, { r: 50, h: 160, dur: 0.7 }); return; }
    if (tg.type === 'buster') { buster(tg, ctx); return; }
    if (IMPACT[tg.tag]) { IMPACT[tg.tag](tg, ctx); return; }
    const color = { stack: '#ffe27a', spread: '#e0b0ff', tower: '#b0fff4' }[tg.type] || '#ffb070';
    shapeFlash(tg.live, color, { a: 0.38 });
    for (const q of scatter(tg.live, 6)) VFX.sparks(q.x, q.y, { color, n: 3, speed: 260 });
  }

  // tankbusters: a heavy hit on whoever it was aimed at, shaped by the boss's weapon
  function buster(tg, ctx) {
    const s = tg.live, e = tg.target != null ? ctx.entById(tg.target) : null;
    const x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
    shapeFlash(s, '#ff4a3a', { a: 0.28 });
    if (ctx.boss === 'volkar') {
      // Titan Fist: a stone fist and the lightning riding it
      for (let i = 0; i < 3; i++) VFX.lightning(s.x, s.y - 20, x + rand(-16, 16), y + rand(-12, 12), { color: '#9ff4ff', jag: 12, dur: 0.4 });
      VFX.hit(x, y, '#bff6ff', 2.3);
      VFX.shock(x, y, { r: 90, color: '#9ff4ff', w: 6, flat: 1 });
      VFX.decal(x, y, { style: 'crack', r: 64, dur: 2.5, a: 0.6, seed: Math.random() * 6 });
    } else if (ctx.boss === 'hollowking') {
      // Grave Cleave: the greatsword comes down and the wound keeps bleeding
      VFX.slash(x, y, s.angle + Math.PI / 2, { r: 90, span: 2.4, color: '#c8ffd8', dur: 0.4, w: 0.55, sparks: 8 });
      VFX.hit(x, y, '#ff4a3a', 2.3);
      VFX.splash(x, y, { color: '#a01a1a', n: 10 });
    } else if (ctx.boss === 'skitterra') {
      for (let i = 0; i < 4; i++) VFX.lightning(s.x, s.y, x + rand(-14, 14), y + rand(-10, 10), { color: '#f4f0ff', jag: 10, dur: 0.5 });
      VFX.smoke(x, y, { color: '#f4f0ff', n: 8, size: 26, a: 0.7, speed: 50 });
      VFX.hit(x, y, '#e8dcff', 2);
    } else {
      VFX.slash(x, y, s.angle + Math.PI / 2, { r: 80, span: 2.2, color: '#ffd0b0', dur: 0.35, w: 0.5, sparks: 10 });
      VFX.hit(x, y, '#ff5a3a', 2.2);
      VFX.decal(x, y, { style: 'crack', r: 60, dur: 2.5, a: 0.6, seed: Math.random() * 6 });
    }
    shake(8);
  }

  // ---------------------------------------------------------------- casts, autos, adds, moments
  const CAST_COLOR = {
    grubnak: { def: '#ffb050', boil: '#ff6a2a', bell: '#9ffff4', whisk: '#fff0c8', raise: '#ff7a1a', flop: '#f0e0c8', throw: '#ffe6d0', flambe: '#6ab0ff',
      charge: '#ff8a4a', larder: '#ffd8a0', gut: '#c8d87a', hook: '#e8eef4', drains: '#b89a5a' },
    skitterra: { def: '#d08aff', mist: '#9adf3a', spit: '#9adf3a', wrap: '#f4f0ff', silk: '#f4f0ff', web: '#f4f0ff', lunge: '#ff7ac0', eggs: '#e8ff9a', fang: '#ff7ac0', volley: '#f4f0ff',
      deluge: '#9adf3a', strand: '#f4f0ff', ambush: '#b090ff', cocoon: '#f4f0ff' },
    volkar: { def: '#7fe8ff', surge: '#ffe08a', crash: '#ffe27a', field: '#d79bff', gale: '#e8f4ff', walls: '#e8f4ff', fist: '#9ff4ff', skyfall: '#dff4ff', avalanche: '#d8c8a8' },
    hollowking: { def: '#6dff9a', gaze: '#f0fff4', doom: '#b46aff', bells: '#ffd88a', cleave: '#ff8a7a', night: '#8aa0ff', audience: '#ffe6a0',
      lightsout: '#f0fff4', lids: '#c8ffd8', decree: '#7affa8' },
  };
  // the wind-up while the boss casts: motes spiral in, a ring tightens, everything brightens near the end
  function castStart(bossKind, anim, dur, bossDraw) {
    const pal = CAST_COLOR[bossKind] || {}, color = pal[anim] || pal.def || '#ffffff';
    VFX.fx({ dur, layer: 'ground', tick: (p) => {
      if (Math.random() < 0.25 + p * 0.6) VFX.charge(bossDraw.x, bossDraw.y - 30, { color, n: 1, r: 120 - p * 40, dur: 0.5, z: 30 });
    }, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15);
      VFX.neonRing(c, bossDraw.x, bossDraw.y, 150 - 70 * easeOut(p), color, 2 + p * 3, k * (0.25 + 0.6 * p), 0.6);
      VFX.glowAt(c, bossDraw.x, bossDraw.y - 30, 60 + 60 * p, color, k * (0.15 + 0.35 * p) * (0.85 + 0.15 * Math.sin(t * (6 + p * 18))));
    } });
  }
  function auto(boss, target) {
    if (!target) return;
    const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
    VFX.hit(target.x, target.y, '#ffe0c0', 1.1);
    VFX.slash(target.x, target.y, ang, { r: 44, span: 1.6, color: '#ffffff', dur: 0.25, sparks: 4 });
  }
  function leap(x, y) {
    VFX.shock(x, y, { r: 180, color: '#f0e0c8', w: 8, dur: 0.6, flat: 1 });
    for (const q of ringPts(x, y, 60, 10)) VFX.smoke(q.x, q.y, { n: 1, color: '#e0d4c0', size: 34, a: 0.6, speed: 120 });
    VFX.decal(x, y, { style: 'crack', r: 80, dur: 3, a: 0.55, seed: Math.random() * 6 });
    shake(8);
  }
  function roar(x, y, bossKind) {
    const color = bossKind === 'skitterra' ? '#d08aff' : bossKind === 'volkar' ? '#7fe8ff' : '#ffb050';
    for (let i = 0; i < 3; i++) VFX.shock(x, y, { r: 260, color, w: 6, dur: 0.6, flat: 1, delay: i * 0.12 });
    shake(5);
  }
  function addSpawn(x, y) {
    VFX.swirl(x, y, { r: 60, color: '#c8ff6a', dur: 0.7, arms: 3 });
    VFX.burst(x, y, { color: '#e8ff9a', color2: '#ffffff', n: 14, speed: 200 });
    VFX.smoke(x, y, { color: '#d8e8b0', n: 6, size: 26, a: 0.6, speed: 70 });
  }
  function addDeath(x, y) {
    VFX.charge(x, y - 10, { color: '#c070ff', n: 10, r: 60, dur: 0.3 });
    after(0.28, () => {
      VFX.burst(x, y, { color: '#c070ff', color2: '#ffffff', n: 18, speed: 260, size: 15 });
      VFX.splash(x, y, { color: '#5a8a2a', n: 8 });
      VFX.smoke(x, y, { color: '#6a5a7a', n: 5, size: 28, a: 0.55, speed: 60 });
    });
  }
  function addEnrage(a) {
    VFX.flare(a.x, a.y, { color: '#ff3a2a', n: 18 });
    VFX.aura(a, { style: 'flame', color: '#ff4a2a', r: 32, dur: 4, rate: 0.7 });
    shake(6);
  }
  function fury(x, y) { VFX.shock(x, y, { r: 700, color: '#ff5a3a', w: 10, dur: 0.7, flat: 1 }); roomTint('#ff3a2a', 0.16, 0.5); shake(5); }
  function spit(from, to) {
    VFX.missile(from.x, from.y, to.x, to.y, { color: '#9adf3a', style: 'orb', speed: 650, size: 0.8, arc: 30, onHit: (x, y) => VFX.splash(x, y, { color: '#8ad82a', n: 6 }) });
  }
  function husk(x, y) {
    VFX.smoke(x, y, { color: '#d8ccb8', n: 10, size: 36, a: 0.6, speed: 90 });
    for (let i = 0; i < 10; i++) VFX.spawn({ x, y, z: 30, vx: rand(-160, 160), vy: rand(-120, 120), vz: rand(60, 200), g: 500, life: 0.7, size: 11, color: '#e8dcc8', kind: 'shard', add: false, vr: rand(-10, 10) });
  }
  function tetherSnap(e, ok) {
    if (ok) { VFX.burst(e.x, e.y, { color: '#f4f0ff', n: 10, speed: 160, size: 10 }); return; }
    VFX.hit(e.x, e.y, '#ff5a4a', 1.4);
    VFX.shock(e.x, e.y, { r: 80, color: '#ff5a4a', flat: 1 });
  }
  function playerDeath(e) {
    VFX.smoke(e.x, e.y, { color: '#8a8a9a', n: 8, size: 26, a: 0.6, speed: 50 });
    VFX.shock(e.x, e.y, { r0: 60, r: 0, color: '#b0b0c0', w: 3, dur: 0.6, flat: 0.6 });
  }
  function playerRaised(e) {
    VFX.sigil(e.x, e.y, { r: 60, style: 'star5', color: '#fff2b0', dur: 1.6 });
    VFX.pillar(e.x, e.y, { r: 34, h: 260, color: '#fff6c8', dur: 1.4 });
    VFX.motes(e.x, e.y, { color: '#fff2b0', n: 14, r: 30 });
  }
  function partyBuff(e) {
    VFX.shock(e.x, e.y, { r: 130, color: '#ffe9a0', w: 5, dur: 0.6 });
    VFX.motes(e.x, e.y, { color: '#ffe9a0', n: 10, r: 40 });
  }
  // Rolling Meatballs: the thud when one lands against the wall, and the splat when it runs someone over
  function meatballLand(x, y) {
    VFX.shock(x, y, { r: 70, color: '#e8c8a0', w: 4, dur: 0.4, flat: 1 });
    VFX.smoke(x, y, { color: '#d8c4a4', n: 5, size: 26, a: 0.55, speed: 60 });
    VFX.splash(x, y, { color: '#c0301a', n: 6 });
    shake(3);
  }
  function meatballHit(e) {
    VFX.splash(e.x, e.y, { color: '#a02a14', n: 10, speed: 1.2 });
    VFX.hit(e.x, e.y, '#ffb070', 1.3);
    VFX.smoke(e.x, e.y, { color: '#d8c4a4', n: 4, size: 22, a: 0.5 });
    shake(5);
  }
  // Silk Reel: the thread snapping (white fibres flying), or the bite when she reels you all the way in
  function silkSnap(e, boss) {
    const mx = (e.x + boss.x) / 2, my = (e.y + boss.y) / 2;
    VFX.burst(e.x, e.y, { color: '#f4f0ff', n: 12, speed: 200, size: 10 });
    for (let i = 0; i < 6; i++) VFX.spawn({ x: mx + rand(-40, 40), y: my + rand(-40, 40), z: 20, vx: rand(-120, 120), vy: rand(-90, 90), vz: rand(40, 140), g: 300,
      life: 0.6, size: 12, color: '#ffffff', stretch: 4, vr: rand(-8, 8) });
    VFX.shock(e.x, e.y, { r: 50, color: '#ffffff', w: 3, dur: 0.3 });
  }
  function reelBite(e) {
    VFX.hit(e.x, e.y, '#9adf3a', 1.8);
    VFX.splash(e.x, e.y, { color: '#8ad82a', n: 12 });
    shake(7);
  }
  // Volkar: a charge turning over (Hard, at 50%), the wall jumping in, and the storm's constant pulse
  function polarityFlip(e, s) {
    const col = s > 0 ? '#ffc24a' : '#4ad8ff';
    VFX.shock(e.x, e.y, { r0: 80, r: 10, color: col, w: 5, dur: 0.5, flat: 1 });
    VFX.motes(e.x, e.y, { color: col, n: 12, r: 36 });
  }
  function edgeClose(from, to) {
    VFX.shock(0, 0, { r0: from, r: to, color: '#9ff4ff', w: 16, dur: 0.45, flat: 1 });
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + rand(-0.1, 0.1); after(rand(0, 0.3), () => VFX.lightning(Math.cos(a) * (to + 60), Math.sin(a) * (to + 60) - 260, Math.cos(a) * to, Math.sin(a) * to, { color: '#9ff4ff', jag: 20, dur: 0.35 })); }
    roomTint('#9ccfff', 0.14, 0.5);
    shake(9);
  }
  function pulse(units) {
    for (const u of units) VFX.lightning(u.x + rand(-30, 30), u.y - 150, u.x, u.y - 20, { color: '#9ccfff', jag: 8, dur: 0.2 });
  }
  // Hard: Ball Lightning gathering at the edge and bursting on whoever touches it; Chain Lightning leaping player to player
  function orbForm(x, y) {
    VFX.charge(x, y - 28, { color: '#9ff4ff', n: 10, r: 60, dur: 0.6 });
    VFX.lightning(x + rand(-40, 40), y - 300, x, y - 28, { color: '#bff6ff', jag: 18, dur: 0.3 });
  }
  function orbHit(e) {
    VFX.burst(e.x, e.y - 16, { color: '#9ff4ff', color2: '#ffffff', n: 16, speed: 260 });
    for (let i = 0; i < 4; i++) { const a = rand(0, TAU); VFX.lightning(e.x, e.y - 16, e.x + Math.cos(a) * 70, e.y - 16 + Math.sin(a) * 70, { color: '#dffbff', jag: 10, dur: 0.3 }); }
    VFX.hit(e.x, e.y, '#bff6ff', 1.4);
    shake(5);
  }
  function chain(ents) {
    if (!ents.length) return;
    const a = ents[0];
    VFX.lightning(a.x + rand(-30, 30), a.y - 380, a.x, a.y - 16, { color: '#ffffff', jag: 26, dur: 0.45 });
    ents.forEach((e, i) => {
      after(i * 0.08, () => {
        if (i) for (let n = 0; n < 2; n++) VFX.lightning(ents[i - 1].x, ents[i - 1].y - 16, e.x, e.y - 16, { color: n ? '#ffffff' : '#9ff4ff', jag: 16, dur: 0.4 });
        VFX.hit(e.x, e.y, '#bff6ff', 1.3);
        VFX.shock(e.x, e.y, { r: 60, color: '#9ff4ff', w: 4, dur: 0.35, flat: 1 });
      });
    });
    shake(ents.length > 1 ? 7 : 4);
  }

  // the Hollow King: caught by his gaze (grey stone creeps over them), the sentence passed, a cure, a knight
  // remembering a swing, the knights rising, the night falling
  function gazed(e) {
    VFX.shock(e.x, e.y, { r0: 70, r: 14, color: '#d8e0dc', w: 6, dur: 0.45, flat: 1 });
    VFX.smoke(e.x, e.y, { color: '#a8b0ac', n: 6, size: 22, a: 0.55, speed: 30 });
    VFX.aura(e, { style: 'ring', color: '#c8d0cc', r: 30, dur: 2, rate: 0.5 });
    shake(4);
  }
  function doomed(e) {
    VFX.sigil(e.x, e.y, { r: 50, style: 'star5', color: '#b46aff', dur: 1.2 });
    VFX.charge(e.x, e.y - 60, { color: '#d8b0ff', n: 10, r: 50, dur: 0.5 });
  }
  function cure(e) {
    VFX.pillar(e.x, e.y, { r: 30, h: 220, color: '#ffe2a0', dur: 0.8 });
    VFX.burst(e.x, e.y - 60, { color: '#d8b0ff', color2: '#ffffff', n: 14, speed: 200, size: 10 });
    VFX.motes(e.x, e.y, { color: '#fff0c0', n: 12, r: 30 });
  }
  function knightMemory(k) {
    VFX.shock(k.x, k.y, { r0: 20, r: 90, color: '#9affc0', w: 4, dur: 0.5, flat: 1 });
    VFX.motes(k.x, k.y, { color: '#9affc0', n: 10, r: 36 });
  }
  function knightRise(k) {
    VFX.swirl(k.x, k.y, { r: 60, color: '#6dff9a', dur: 0.8, arms: 3 });
    VFX.pillar(k.x, k.y, { r: 30, h: 200, color: '#6dff9a', dur: 0.9 });
    VFX.smoke(k.x, k.y, { color: '#9ab8a8', n: 6, size: 30, a: 0.5, speed: 50 });
  }
  function nightFall() { roomTint('#05060c', 0.6, 1.2); shake(6); }

  // ---------------------------------------------------------------- the room's props
  // propFx: a prop chipped, a prop broken (debris by what it's made of), someone (or the boss) slammed into a wall or
  // prop, grease catching fire
  const PROP_STUFF = {
    cask: { color: '#8a5a2e', dust: '#c8a878', size: 1.1 }, pillar: { color: '#4a4156', dust: '#8a8098', size: 1.3 },
    lid: { color: '#565d61', dust: '#a8b0ac', size: 1.2 }, stone: { color: '#5a6270', dust: '#b8c4d4', size: 1.3 },
    boulder: { color: '#6a6460', dust: '#c8c0b0', size: 1.4 }, brazier: { color: '#2f3337', dust: '#7a8a80', size: 0.9 },
  };
  function propFx(msg, room, entById) {
    const st = PROP_STUFF[msg.kind] || { color: '#6a6a72', dust: '#b0b0b8', size: 1 };
    if (msg.k === 'chip') {
      VFX.debris(msg.x, msg.y - 20, { color: st.color, n: 5, speed: 0.8, size: st.size * 0.8 });
      VFX.smoke(msg.x, msg.y - 10, { color: st.dust, n: 3, size: 22, a: 0.5, speed: 50 });
      shake(2);
    } else if (msg.k === 'break') {
      const r = msg.r || 30;
      VFX.debris(msg.x, msg.y - 18, { color: st.color, n: 16, speed: 1.3, size: st.size * 1.2, up: 1.2 });
      VFX.smoke(msg.x, msg.y, { color: st.dust, n: 10, size: 34, a: 0.6, speed: 110, r: r * 0.6 });
      VFX.shock(msg.x, msg.y, { r: r * 2.4, color: st.dust, w: 6, dur: 0.45, flat: 1 });
      if (msg.kind === 'cask') VFX.splash(msg.x, msg.y, { color: '#6a1018', n: 14, speed: 1.3 });
      if (msg.kind === 'boulder' || msg.how === 'storm') VFX.sparks(msg.x, msg.y - 20, { color: '#dff4ff', n: 10, speed: 320 });
      shake(5);
    } else if (msg.k === 'slam') {
      // dust bursting off the wall (or the prop) where they hit, and a ring of grit
      const back = (msg.a || 0) + Math.PI, boss = msg.boss;
      VFX.smoke(msg.x, msg.y, { color: '#cfc4b0', n: boss ? 14 : 7, size: boss ? 44 : 30, a: 0.65, speed: boss ? 160 : 100 });
      VFX.debris(msg.x, msg.y - 10, { color: '#7a6a5a', n: boss ? 14 : 6, speed: boss ? 1.4 : 1 });
      VFX.shock(msg.x, msg.y, { r: boss ? 220 : 90, color: '#f0e0c8', w: boss ? 10 : 5, dur: 0.45, flat: 1 });
      VFX.sparks(msg.x, msg.y - 14, { color: '#fff0d0', n: boss ? 14 : 6, angle: back, spread: 1.4, speed: 300 });
      if (boss) VFX.decal(msg.x, msg.y, { style: 'crack', r: 90, dur: 4, a: 0.6, seed: Math.random() * 6 });
      const e = msg.pid != null && entById ? entById(msg.pid) : null;
      if (e) { VFX.hit(e.x, e.y, '#ffe0c0', 1.5); VFX.aura(e, { style: 'ring', color: '#f0e8d8', r: 26, dur: 0.6, rate: 0.6 }); }
      shake(boss ? 12 : 5);
    } else if (msg.k === 'flare') {
      // braziers flaring back up after Lights Out
      for (const id of msg.ids || []) {
        const pr = room && room.props.find(p => p.id === id);
        if (!pr) continue;
        VFX.flare(pr.x, pr.y - 24, { color: '#3aff7a', n: 18, r: 18, h: 1.6 });
        VFX.shock(pr.x, pr.y, { r: 160, color: '#7affa8', w: 5, dur: 0.5, flat: 1 });
      }
    } else if (msg.k === 'bolt') {
      // Rod Strike: the bolt comes down on a standing stone (its runes take it), or on someone caught in the open
      const top = msg.kind === 'stone' ? 92 : 16, e = msg.pid != null && entById ? entById(msg.pid) : null;
      const x = e ? e.x : msg.x, y = e ? e.y : msg.y;
      VFX.lightning(x + rand(-30, 30), y - 460, x, y - top, { color: '#ffffff', jag: 28, dur: 0.4 });
      VFX.lightning(x + rand(-30, 30), y - 460, x, y - top, { color: '#9ff4ff', jag: 24, dur: 0.5 });
      VFX.shock(x, y, { r: msg.kind === 'stone' ? 110 : 80, color: '#9ff4ff', w: 6, dur: 0.4, flat: 1 });
      VFX.sparks(x, y - top, { color: '#dffbff', n: 12, speed: 300 });
      if (e) VFX.hit(e.x, e.y, '#bff6ff', 2);
      roomTint('#bfe8ff', 0.1, 0.25);
      shake(msg.kind === 'stone' ? 5 : 8);
    } else if (msg.k === 'discharge') {
      // a stone that was still charged lets it all go into everyone near it
      const r = msg.r || 180;
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + rand(-0.2, 0.2); VFX.lightning(msg.x, msg.y - 50, msg.x + Math.cos(a) * r, msg.y + Math.sin(a) * r * 0.9, { color: i % 2 ? '#ffffff' : '#ff9a7a', jag: 16, dur: 0.45 }); }
      VFX.shock(msg.x, msg.y, { r, color: '#ffb09a', w: 8, dur: 0.5, flat: 1 });
      VFX.burst(msg.x, msg.y - 40, { color: '#ffd0c0', color2: '#9ff4ff', n: 18, speed: 300 });
      roomTint('#ffd0c0', 0.16, 0.35);
      shake(9);
    } else if (msg.k === 'arc') {
      // Grounded (Hard): the discharge leaps on to the nearest player
      const e = msg.pid != null && entById ? entById(msg.pid) : null;
      if (e) { for (let n = 0; n < 2; n++) VFX.lightning(msg.x, msg.y - 60, e.x, e.y - 16, { color: n ? '#ffffff' : '#ff9a7a', jag: 18, dur: 0.45 }); VFX.hit(e.x, e.y, '#ffb09a', 1.8); }
      shake(5);
    } else if (msg.k === 'fall') {
      // off the broken edge (Hard): a gust of grit where they went over, and the wind hauling them back up
      const e = msg.pid != null && entById ? entById(msg.pid) : null, x = e ? e.x : msg.x, y = e ? e.y : msg.y;
      VFX.smoke(x, y, { color: '#c8d0dc', n: 12, size: 36, a: 0.6, speed: 140 });
      VFX.debris(x, y, { color: '#5a6270', n: 10, speed: 1.2 });
      if (e) { VFX.tornado(e.x, e.y, { r: 30, h: 120, dur: 1.2 }); VFX.aura(e, { style: 'ring', color: '#e8f4ff', r: 30, dur: 5, rate: 0.5 }); }
      shake(7);
    } else if (msg.k === 'crumble') {
      // a wedge of the summit breaks away: rock and dust spill off the new lip
      for (let i = 0; i < 12; i++) {
        const a = msg.a0 + (msg.a1 - msg.a0) * (i + 0.5) / 12, x = Math.cos(a) * msg.r, y = Math.sin(a) * msg.r;
        after(i * 0.04, () => { VFX.debris(x, y, { color: '#5a6270', n: 6, speed: 1.3, up: 1.1 }); VFX.smoke(x, y, { color: '#b8c4d4', n: 3, size: 44, a: 0.55, speed: 90 }); });
      }
      roomTint('#1a2230', 0.25, 0.8);
      shake(14);
    } else if (msg.k === 'ignite') {
      VFX.flare(msg.x, msg.y, { color: '#ff7a1a', n: 16, r: (msg.r || 60) * 0.6 });
      VFX.smoke(msg.x, msg.y, { color: '#3a2a20', n: 5, size: 30, a: 0.5, speed: 60 });
    }
    void room;
  }

  // the stove line erupting along the top wall: every burner throws up fire and sparks, smoke rolls off it
  function stoveBurst(hitX) {
    const y = -ARENA.hh - 30;
    for (let i = 0; i < 6; i++) {
      const x = -ARENA.hw + 130 + i * (ARENA.hw * 2 - 260) / 5;
      after(0.08 * Math.abs(x - hitX) / 160, () => {
        VFX.flare(x, y + 30, { color: '#ff6a1a', n: 22, r: 40, h: 1.8, size: 1.5 });
        VFX.sparks(x, y + 20, { color: '#ffd080', n: 10, angle: Math.PI / 2, spread: 1.2, speed: 420 });
        VFX.smoke(x, y + 10, { color: '#3a2a20', n: 4, size: 40, a: 0.5, speed: 70 });
      });
    }
    roomTint('#ff6a1a', 0.12, 0.6);
    shake(8);
  }

  function victory(ents) {
    for (const e of ents) { VFX.confetti(e.x, e.y, { n: 50 }); VFX.burst(e.x, e.y, { color: '#ffe27a', color2: '#ffffff', n: 16, speed: 260 }); }
    roomTint('#fff2b0', 0.2, 1);
  }
  function wipe() { roomTint('#200810', 0.4, 1.4); }

  // a stack or soak that wasn't answered (the host flags it): it must never look like a success. The shape burns red,
  // the room flushes red, and the screen jolts. A missed Barrow Bell tolls purple through the whole barrow.
  function failed(tg) {
    const s = tg.live, bell = tg.tag === 'bell';
    const col = bell ? '#b04aff' : '#ff3a2a';
    shapeFlash(s, col, { a: 0.4, dur: 0.7 });
    VFX.shock(s.x, s.y, { r: (s.r || 120) * 1.6, color: col, w: 9, dur: 0.6, flat: 1 });
    VFX.sparks(s.x, s.y - 10, { color: bell ? '#e0b0ff' : '#ff8a6a', n: 14, speed: 340 });
    if (bell) { VFX.pillar(s.x, s.y, { r: 50, h: 360, color: '#c88aff', dur: 0.9 }); for (let i = 0; i < 3; i++) VFX.shock(s.x, s.y, { r: AR() * 1.3, color: '#b04aff', w: 8, dur: 0.9, flat: 1, delay: i * 0.15 }); }
    roomTint(col, 0.16, 0.6);
    shake(8);
  }

  return { failed, propFx, stoveBurst, gazed, doomed, cure, knightMemory, knightRise, nightFall, polarityFlip, edgeClose, pulse, orbForm, orbHit, chain, meatballLand, meatballHit, silkSnap, reelBite, impact, castStart, auto, leap, roar, addSpawn, addDeath, addEnrage, fury, spit, husk, tetherSnap, playerDeath, playerRaised, partyBuff, victory, wipe };
})();
