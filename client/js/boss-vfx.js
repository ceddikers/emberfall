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

  // how far the floor runs from (x, y) along angle a, to the wall
  const reach = (x, y, a, max = 2000) => {
    let d = 0;
    while (d < max && ARENA.sd(x + Math.cos(a) * (d + 10), y + Math.sin(a) * (d + 10)) < -12) d += 10;
    return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, d };
  };
  // a bold painted burst: ink edge, saturated body, white-hot heart (Grubnak's colours unless told otherwise)
  const bang = (x, y, r, o = {}) => VFX.spikeburst(x, y, Object.assign({ r, n: 12, color: '#ff9a2a', core: '#fff2c0', ink: '#3a1408', dur: 0.42 }, o));
  // a flame tongue standing on (x, y), for effects drawn here
  const flameTongue = (c, x, y, h, w, sway, color) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(x - w, y);
    c.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h); c.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
    c.quadraticCurveTo(x, y + w * 0.4, x - w, y); c.fill();
  };
  // Grubnak's ghost cleaver coming down flat on the floor exactly where the hit lands: the same blade the Chop Chop
  // warning hangs in the air (edge along (ex, ey) from the point o, body off to the side (nx, ny)), slammed down,
  // biting in with a white-hot edge, held a moment, then gone. u runs along the edge (-L..L), v into the blade (0..W).
  function flatCleaver(ox, oy, ex, ey, nx, ny, L, W, o = {}) {
    const off = o.off ?? 16, P = (u, v, z = 0) => [ox + ex * u + nx * v, oy + ey * u + ny * v - z];
    VFX.fx({ dur: o.dur ?? 0.85, layer: 'air', draw: (c, p, t, e) => {
      const slam = Math.min(1, p / 0.1), z = (1 - slam) * (o.from ?? 40), k = e.a * Math.min(1, (1 - p) / 0.4), bite = Math.max(0, 1 - Math.max(0, p - 0.1) / 0.5);
      c.save(); c.globalAlpha = k * 0.92;
      const e1 = P(-L, off, z), e2 = P(L, off, z), b2 = P(L, off + W, z), b1 = P(-L + W * 0.27, off + W, z), c1 = P(-L, off + W * 0.73, z);
      c.beginPath(); c.moveTo(...e1); c.lineTo(...e2); c.lineTo(...b2); c.lineTo(...b1); c.lineTo(...c1); c.closePath();
      const g = c.createLinearGradient(e1[0], e1[1], P(-L, off + W, z)[0], P(-L, off + W, z)[1]);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, '#e6eaee'); g.addColorStop(1, '#8a939e');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#1a1410'; c.lineWidth = 4; c.stroke();
      const h1 = P(L, off + W * 0.35, z), h2 = P(L + W * 1.13, off + W * 0.35, z);
      c.lineCap = 'round'; c.strokeStyle = '#1a1410'; c.lineWidth = W * 0.23; c.beginPath(); c.moveTo(...h1); c.lineTo(...h2); c.stroke();
      c.strokeStyle = '#7a4e2a'; c.lineWidth = W * 0.18; c.stroke();
      const hole = P(-L * 0.62, off + W * 0.62, z); circle(c, hole[0], hole[1], W * 0.1, '#2a2622', '#1a1410', 2);
      // the edge biting into the floor: white-hot, cooling to orange
      if (slam >= 1) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = k * bite; c.strokeStyle = '#ffb040'; c.lineWidth = 10; c.beginPath(); c.moveTo(...P(-L, off)); c.lineTo(...P(L, off)); c.stroke();
        c.strokeStyle = '#fff6d8'; c.lineWidth = 3.5; c.stroke();
        c.globalCompositeOperation = 'source-over';
      }
      c.restore(); c.globalAlpha = 1;
    } });
    return { P, off };
  }
  // a silver cloche popping off a plate and tumbling away
  function clocheLift(x, y) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.4), z = 90 * Math.sin(Math.min(1, p * 1.3) * Math.PI * 0.6) + p * 40;
      c.save(); c.translate(x + dir * p * 70, y - 10 - z); c.rotate(dir * p * 2.2); c.globalAlpha = k;
      c.beginPath(); c.ellipse(0, 0, 30, 24, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#d8dde2'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1a1c20'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-10, -12, 8, 5, -0.5, 0, Math.PI * 2); c.fill();
      rrect(c, -34, -2, 68, 6, 3, '#b8bec4', '#1a1c20', 2);
      circle(c, 0, -26, 5, '#c8ced4', '#1a1c20', 2);
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // the shadows behind every cover prop, seen from (sx, sy), and a clip to everything outside them
  const coverShadows = (sx, sy, props) => { const out = []; for (const pr of props || []) if (pr.cover) { const sh = PROPS.shadowPoly(sx, sy, pr); if (sh) out.push(sh); } return out; };
  const clipOut = (c, shadows) => { for (const sh of shadows) { c.beginPath(); c.rect(-4000, -4000, 8000, 8000); sh.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip('evenodd'); } };

  // ---------------------------------------------------------------- telegraph impacts by tag
  const IMPACT = {
    // Grubnak
    // Chop Chop: the ghost cleaver comes down beside him and the cut runs along his line, wall to wall: a burst of
    // sparks racing out both ways, tiles jumping, and a gouge left glowing in the floor
    mince(tg) {
      const s = tg.live, la = s.angle + Math.PI / 2, a = reach(s.x, s.y, la), b = reach(s.x, s.y, la + Math.PI);
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      // the blade the warning hung over the doomed half comes down right there, edge on his line, and the blow
      // sweeps across the whole half it hits
      flatCleaver(s.x, s.y, -sa, ca, ca, sa, 300, 150, { from: 10 });
      shapeFlash(s, '#ff7a3a', { a: 0.26, dur: 0.55 });
      sweep(s, '#ffe0b8', 0.4);
      for (const q of scatter(s, 9)) after(rand(0.05, 0.3), () => VFX.smoke(q.x, q.y, { n: 2, color: '#e8dccb', size: 30, a: 0.45, speed: 60 }));
      after(0.06, () => {
        VFX.gouge(a.x, a.y, b.x, b.y, { w: 26, dur: 11 });
        for (const [end, dir] of [[a, la], [b, la + Math.PI]]) for (let d = 0; d < end.d; d += 120) {
          const x = s.x + Math.cos(dir) * d, y = s.y + Math.sin(dir) * d;
          after(d / 2600, () => {
            bang(x, y, Math.max(34, 70 - d * 0.03), { n: 10, dur: 0.36 });
            VFX.sparks(x, y, { color: '#ffe0a0', n: 4, angle: s.angle, spread: 0.9, speed: 320 });
            if (Math.random() < 0.6) VFX.debris(x, y, { color: '#e2d6c0', n: 3, speed: 0.9, size: 1.2 });
          });
        }
        shake(11);
      });
    },
    ladle(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffb050', { a: 0.38 });
      VFX.shock(s.x, s.y, { r: s.r * 1.05, color: '#ffd08a', w: 8, dur: 0.45, flat: 1 });
      VFX.swirl(s.x, s.y, { r: s.r * 0.8, color: '#ffcf7a', dur: 0.55, arms: 3 });
      for (const q of ringPts(s.x, s.y, s.r * 0.8, 10)) VFX.splash(q.x, q.y, { color: '#d8902a', n: 4, speed: 1.2 });
      shake(6);
    },
    lidSlam(tg) {
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
    // Order Up! / Service!: the cloche flies off the plate and a column of heat and steam goes up; a ring of steam hangs
    plate(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffcf7a', { a: 0.3 });
      clocheLift(s.x, s.y);
      VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 250, color: '#ffc870', dur: 0.8 });
      VFX.flare(s.x, s.y, { color: '#ff8a2a', n: 14, r: s.r * 0.3, h: 1.6 });
      for (const q of ringPts(s.x, s.y, s.r * 0.85, 10)) VFX.smoke(q.x, q.y, { color: '#f6f0ea', n: 1, size: 30, a: 0.55, speed: 30 });
      steam(s.x, s.y, 6, 120);
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
    // Boil Over: the broth erupts out of him, slops across the floor in steaming puddles and chunks
    boil(tg) {
      const s = tg.live;
      bang(s.x, s.y - 10, 120, { color: '#e0702a', core: '#ffe0a0', ink: '#3a1606', n: 14, dur: 0.5 });
      VFX.flare(s.x, s.y, { color: '#ff7a2a', n: 26, r: 60, h: 1.6, size: 1.4 });
      VFX.splash(s.x, s.y, { color: '#b8561c', n: 34, speed: 2.2, size: 1.4 });
      steam(s.x, s.y, 16, 480);
      for (let i = 0; i < 8; i++) {
        const a = rand(0, TAU), d = rand(90, 340), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d * 0.75;
        if (ARENA.sd(x, y) > -40) continue;
        after(rand(0.15, 0.45), () => VFX.puddle(x, y, { r: rand(20, 36), color: '#d8702a', dark: '#5a1e08', dur: 5 }));
      }
      VFX.shock(s.x, s.y, { r: AR(), color: '#ffb070', w: 8, dur: 0.7, flat: 1 });
      roomTint('#ff6a2a', 0.18);
      shake(9);
    },
    // the Hollow King: a lid grinding to a stop, the Decree washing down the hall, the vault coming down, his eyes in the dark
    lid(tg, ctx) {
      if (ctx && ctx.boss === 'grubnak') return IMPACT.lidSlam(tg);   // Grubnak's Lid Slam shares the tag
      const s = tg.live;
      sweep(s, '#c8ffd8', 0.4);
      for (let d = 30; d < s.len; d += 60) VFX.smoke(s.x + Math.cos(s.angle) * d, s.y, { color: '#a8b0ac', n: 1, size: 28, a: 0.5, speed: 50 });
      shake(5);
    },
    // Royal Decree: a wall of grave-light rolls down the hall from the throne, churning, and leaves the floor glowing
    // green a while; every solid thing's shadow stays clean
    decree(tg, ctx) {
      const src = tg.cover || [0, -2600], sh = coverShadows(src[0], src[1], ctx && ctx.props), top = -ARENA.hh - 20, H = ARENA.hh * 2 + 40, W = ARENA.hw + 20;
      roomTint('#3aff7a', 0.14, 0.5);
      VFX.fx({ dur: 0.6, layer: 'ground', draw: (c, p, t, e) => {
        const y = top + H * easeOut(p), k = e.a * (1 - Math.max(0, p - 0.7) / 0.3);
        c.save(); clipArena(c); if (sh.length) clipOut(c, sh);
        const g = c.createLinearGradient(0, y - 160, 0, y + 20);
        g.addColorStop(0, 'rgba(58,255,122,0)'); g.addColorStop(0.75, `rgba(90,255,150,${0.5 * k})`); g.addColorStop(1, `rgba(220,255,230,${0.8 * k})`);
        c.fillStyle = g; c.fillRect(-W, y - 160, W * 2, 180);
        c.restore();
      } });
      VFX.fx({ dur: 4, layer: 'ground', draw: (c, p, t, e) => {
        const k = e.a * Math.min(1, p * 4 / 0.5) * (1 - p);
        c.save(); clipArena(c); if (sh.length) clipOut(c, sh);
        c.fillStyle = `rgba(58,255,122,${0.12 * k})`; c.fillRect(-W, top, W * 2, H);
        for (let i = 0; i < 30; i++) { const x = -ARENA.hw + ((i * 0.618) % 1) * ARENA.hw * 2, y0 = top + ((i * 0.377) % 1) * H, q = (t * 0.4 + i * 0.13) % 1; VFX.glowAt(c, x, y0 - q * 30, 12, '#7affa8', 0.5 * k * (1 - q)); }
        c.restore();
      } });
      const lit = (x, y) => !(ctx && ctx.props) || !PROPS.shadowing(src[0], src[1], x, y, ctx.props.filter(pr => pr.cover));
      for (let i = 0; i < 16; i++) { const x = -ARENA.hw + (i + 0.5) / 16 * ARENA.hw * 2, y = -ARENA.hh + 40 + Math.random() * ARENA.hh * 1.6; if (lit(x, y)) after(0.1 + (y + ARENA.hh) / (ARENA.hh * 2) * 0.45, () => VFX.pillar(x, y, { r: 14, h: 110, color: '#7affa8', dur: 0.45 })); }
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
    // Acid Deluge: the last of the rain drives down on every lit spot and bursts there; the floor is left pitted and
    // smoking, the pillars' shadows clean
    deluge(tg, ctx) {
      const s = tg.live, src = tg.cover || [s.x, s.y], props = ((ctx && ctx.props) || []).filter(pr => pr.cover);
      const lit = scatter({ kind: 'circle', x: 0, y: 0, r: AR() }, 100).filter(q => !PROPS.shadowing(src[0], src[1], q.x, q.y, props));
      roomTint('#7ad83a', 0.16, 0.6);
      lit.forEach((q, i) => after(rand(0, 0.3), () => acidDrop(q.x, q.y, i % 3 === 0)));
      acidPits(lit.slice(0, 45), 6);
      shake(7);
    },
    strand(tg) {
      const s = tg.live;
      shapeFlash(s, '#f4f0ff', { a: 0.3, dur: 0.4 });
      streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 8, dur: 0.35 });
      shake(4);
    },
    // From the Dark / Ceiling Ambush: she lands in a burst of silk and dust, rock thrown out, a web torn into the floor
    ambush(tg) {
      const s = tg.live;
      bang(s.x, s.y, s.r * 0.8, { n: 16, color: '#d8c8ff', core: '#ffffff', ink: '#2a1a3a', dur: 0.5 });
      VFX.shock(s.x, s.y, { r: s.r * 1.4, color: '#e8dcff', w: 12, dur: 0.5, flat: 1 });
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + rand(-0.15, 0.15), sp = rand(260, 420); VFX.spawn({ x: s.x, y: s.y, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(30, 120), g: 300, drag: 0.03, life: 0.6, size: 14, color: '#ffffff', stretch: 5, rot: a }); }
      VFX.debris(s.x, s.y, { color: '#4a4156', n: 16, speed: 1.5 });
      VFX.smoke(s.x, s.y, { color: '#8a8098', n: 12, size: 42, a: 0.6, speed: 160 });
      webDecal(s.x, s.y, s.r * 1.05, 8);
      VFX.decal(s.x, s.y, { style: 'crack', r: s.r * 0.8, dur: 6, a: 0.6, seed: Math.random() * 6 });
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
    // Gut Blast: a wall of flame rolls out of him to every wall, broken behind each cask and the pot; it leaves the
    // floor scorched everywhere but in their shadows (the clean silhouettes say where you should have stood)
    gut(tg, ctx) {
      const s = tg.live, src = tg.cover ? { x: tg.cover[0], y: tg.cover[1] } : { x: s.x, y: s.y };
      const shadows = coverShadows(src.x, src.y, ctx && ctx.props);
      const n = 44, ph = Array.from({ length: n }, () => rand(0, 6));
      VFX.fx({ dur: 0.95, layer: 'air', draw: (c, p, t, e) => {
        const R = 70 + easeOut(p) * AR() * 1.3, k = e.a * Math.min(1, (1 - p) / 0.5), band = 110 + 70 * p;
        c.save(); clipArena(c); clipOut(c, shadows);
        const g = c.createRadialGradient(src.x, src.y, Math.max(0, R - band), src.x, src.y, R);
        g.addColorStop(0, 'rgba(255,110,30,0)'); g.addColorStop(0.5, `rgba(255,110,30,${0.5 * k})`); g.addColorStop(0.86, `rgba(255,214,120,${0.8 * k})`); g.addColorStop(1, `rgba(80,22,6,${0.75 * k})`);
        c.fillStyle = g; c.beginPath(); c.arc(src.x, src.y, R, 0, TAU); c.fill();
        // the flame front: tongues standing along the edge of the wave
        for (let i = 0; i < n; i++) {
          const a = i * TAU / n, x = src.x + Math.cos(a) * R, y = src.y + Math.sin(a) * R;
          if (ARENA.sd(x, y) > 10) continue;
          const h = 38 + 16 * Math.sin(t * 13 + ph[i]), sw = Math.sin(t * 9 + ph[i]) * 6;
          c.globalAlpha = k * 0.9; flameTongue(c, x, y, h * 1.08, 15, sw, '#4a1206');
          c.globalAlpha = k; flameTongue(c, x, y - 1, h, 12, sw, '#ff6a14'); flameTongue(c, x, y - 1, h * 0.6, 7, sw * 0.7, '#ffc040');
        }
        c.restore(); c.globalAlpha = 1;
      } });
      // the scorch, laid as the wave passes
      const blots = scatter({ kind: 'circle', x: 0, y: 0, r: AR() }, 26).map(q => ({ x: q.x, y: q.y, r: rand(60, 130) }));
      after(0.3, () => VFX.fx({ dur: 8, layer: 'ground', draw: (c, p, t, e) => {
        const life = p * 8, k = e.a * Math.min(1, life / 0.3) * Math.min(1, (8 - life) / 2);
        c.save(); clipArena(c); clipOut(c, shadows);
        c.globalAlpha = k * 0.28; c.fillStyle = '#1c100a'; c.fillRect(-AR() - 10, -AR() - 10, AR() * 2 + 20, AR() * 2 + 20);
        for (const b of blots) {
          const gg = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          gg.addColorStop(0, `rgba(14,8,4,${0.55 * k})`); gg.addColorStop(1, 'rgba(14,8,4,0)');
          c.globalAlpha = 1; c.fillStyle = gg; c.beginPath(); c.ellipse(b.x, b.y, b.r, b.r * 0.7, 0, 0, TAU); c.fill();
        }
        c.restore(); c.globalAlpha = 1;
      }, tick: (p) => { if (Math.random() < 0.3 * (1 - p)) { const b = blots[Math.floor(Math.random() * blots.length)]; VFX.spawn({ x: b.x, y: b.y, z: 4, vx: rand(-6, 6), vz: rand(14, 30), drag: 0.02, life: rand(1.4, 2.2), size: rand(10, 16), size1: 34, color: '#5a4c48', kind: 'smoke', add: false, a: 0.25, fadeIn: 0.25 }); } } }));
      steam(s.x, s.y, 10, 380, '#4a3a34');
      roomTint('#ff7a2a', 0.16, 0.6);
      shake(10);
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
    // Grease Fire (and the Flare-Up's heat, Last Orders): every grease puddle on the floor whooshes up; the kitchen flushes
    grease(tg, ctx) {
      roomTint('#ff7a1a', 0.26);
      const pools = ((ctx && ctx.room && ctx.room.floor) || []).filter(fl => fl.kind === 'grease');
      const spots = pools.length ? pools.map(fl => ({ x: fl.x, y: fl.y, r: fl.r })) : scatter({ kind: 'circle', x: 0, y: 0, r: AR() - 60 }, 7).map(q => ({ x: q.x, y: q.y, r: 50 }));
      for (const q of spots) after(rand(0, 0.3), () => {
        VFX.flameWall(q.x - q.r * 0.6, q.y, q.x + q.r * 0.6, q.y, { w: q.r * 0.9, h: 80, dur: 1.1, step: 34, size: 1.1 });
        VFX.smoke(q.x, q.y - 30, { color: '#3a2a24', n: 3, size: 34, a: 0.45, speed: 50 });
      });
      shake(7);
    },
    // Gorge lands: a gulp, a blast of heat out of him, and a scorched spiral on the floor
    gorge(tg, ctx) {
      const b = ctx && ctx.bossDraw || tg.live;
      bang(b.x, b.y - 20, 130, { n: 16, dur: 0.5 });
      VFX.shock(b.x, b.y, { r: AR(), color: '#ffb070', w: 10, dur: 0.6, flat: 1 });
      VFX.scorch(b.x, b.y, b.x, b.y, { w: 300, dur: 8, smokeRate: 0.3 });
      roomTint('#ff6a2a', 0.2, 0.6);
      shake(10);
    },
    // Grubnak, Hard: the belly landing, the cleaver flying out and back, the brandy going up
    // Belly Flop: a ring of flame spikes bursting out from under him, tiles and pans thrown up, a cracked crater left
    flop(tg) {
      const s = tg.live;
      shapeFlash(s, '#ffcf9a', { a: 0.22, dur: 0.45 });
      bang(s.x, s.y, s.r * 1.15, { hole: 0.62, n: 18, color: '#ff8a2a', core: '#ffe9a8', fill: '#ffcf8a', dur: 0.55, z: 4 });
      VFX.shock(s.x, s.y, { r: AR() * 0.9, color: '#e8d8c0', w: 5, dur: 0.8, flat: 1, delay: 0.1 });
      for (const q of ringPts(s.x, s.y, s.r * 0.95, 12)) VFX.smoke(q.x, q.y, { n: 1, color: '#e0d4c0', size: 34, a: 0.55, speed: 140 });
      VFX.debris(s.x, s.y, { color: '#e2d6c0', n: 12, speed: 1.4, up: 1.3, size: 1.7 });
      VFX.debris(s.x, s.y, { color: '#3a3a42', n: 3, speed: 1.2, up: 1.5, size: 2.2 });
      VFX.crater(s.x, s.y + 10, { r: s.r * 0.75, dur: 9, cracks: 12, flames: 6 });
      shake(13);
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
    // Flambé: the brandy goes up along the whole stripe in a wall of flame (a lick of blue in it), and burns it black
    flambe(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, AR() * 2);
      const x1 = s.x + ca * 24, y1 = s.y + sa * 24, x2 = s.x + ca * (L - 24), y2 = s.y + sa * (L - 24);
      shapeFlash(s, '#ff9a3a', { a: 0.24, dur: 0.5 });
      VFX.flameWall(x1, y1, x2, y2, { w: s.w * 0.7, h: 86, dur: 1.5, travel: 0.35, step: 54 });
      VFX.flameWall(x1, y1, x2, y2, { w: s.w * 0.2, h: 24, dur: 0.7, travel: 0.3, step: 170, color: '#3a7aff', mid: '#9ad0ff', ink: '#0a1a4a', size: 0.45 });
      after(0.3, () => VFX.scorch(s.x, s.y, s.x + ca * L, s.y + sa * L, { w: s.w * 0.55, dur: 9 }));
      shake(4);
    },
    // Skitterra
    // Venom Mist: the fog front breaks over everyone: green clouds roll in and fill the cave, then thin to a haze
    mist(tg) {
      roomTint('#7ae03a', 0.12, 0.6);
      venomFog();
      shake(5);
    },
    // Eightfold Lunge: the leg rakes down the cone and drives in: a pink claw burst where its tip lands, rock thrown up
    // along it, and a trench torn in the floor that glows pink while it cools
    lunge(tg) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      shapeFlash(s, '#ff7ac0', { a: 0.2, dur: 0.35 });
      streak(s.x, s.y, s.angle, '#ffb0dc', { w: 8, dur: 0.24 });
      const end = reach(s.x, s.y, s.angle).d - 30, d1 = Math.min(600, end), d0 = Math.max(110, Math.min(320, d1 - 120));
      if (d1 > d0 + 40) {
        VFX.gouge(s.x + ca * d0, s.y + sa * d0, s.x + ca * d1, s.y + sa * d1, { w: 30, dur: 8, heat: '#ff3aa8', lip: '#3a1030', ember: '#ff9ad8', heatT: 6.5 });
        const tip = Math.min(500, d1 - 30), tx = s.x + ca * tip, ty = s.y + sa * tip;
        bang(tx, ty, 82, { n: 11, color: '#ff5ab4', core: '#ffe4f4', ink: '#2a0a20' });
        VFX.sparks(tx, ty, { color: '#ffd0ec', n: 8, angle: s.angle, spread: 0.9, speed: 320 });
        for (const q of [0.15, 0.5, 0.85]) { const d = d0 + (d1 - d0) * q; VFX.debris(s.x + ca * d, s.y + sa * d, { color: '#4a4156', n: 4, speed: 0.9 }); }
      }
      shake(4);
    },
    // Venom Spit: a glob lobbed from her fangs bursts in an acid splash where the pool will be
    venom(tg, ctx) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), e = tg.aim != null ? ctx.entById(tg.aim) : null;
      shapeFlash(s, '#9adf3a', { a: 0.18, dur: 0.35 });
      const L = Math.max(200, e ? Math.hypot(e.x - s.x, e.y - s.y) : 380);
      const { x, y } = ARENA.clamp({ x: s.x + ca * L, y: s.y + sa * L }, 60), ox = s.x + ca * 70, oy = s.y + sa * 70;
      VFX.fx({ dur: 0.18, layer: 'air', draw: (c, p, t, ef) => {
        const gx = ox + (x - ox) * p, gy = oy + (y - oy) * p - 30 * (1 - p) - Math.sin(p * Math.PI) * 60;
        VFX.glowAt(c, gx, gy, 24, '#8aff4a', ef.a * 0.6);
        circle(c, gx, gy, 10, '#8adf2a', '#14300a', 2); circle(c, gx - 3, gy - 3.5, 3.5, '#f0ffd0');
      }, done: () => {
        bang(x, y, 95, { n: 16, color: '#8adf2a', core: '#f4ffc8', ink: '#123008', dur: 0.45 });
        VFX.splash(x, y, { color: '#8ad82a', n: 16, speed: 1.2 });
        VFX.smoke(x, y, { color: '#8ad84a', n: 5, size: 30, a: 0.45, speed: 50, life: 1.2 });
        shake(4);
      } });
    },
    // Snare Weave (Hard): each snare springs shut in a flick of silk (light: there are dozens at once); the pockets go
    // quietly; an Egg-Laden clutch splits and its venom spills out
    snare(tg) { const s = tg.live; shapeFlash(s, '#f4f0ff', { a: 0.16, dur: 0.35 }); VFX.shock(s.x, s.y, { r: s.r, color: '#f4f0ff', w: 3, dur: 0.3, flat: 1 }); shake(3); },
    snaregap() {},
    eggdrop(tg) {
      const s = tg.live;
      VFX.burst(s.x, s.y - 30, { color: '#e8ff9a', color2: '#ffffff', n: 12, speed: 180 });
      VFX.splash(s.x, s.y, { color: '#8ad82a', n: 12 });
    },
    // Burial Rites and the Writ (the Hollow King, Hard): the grave closes in its owner's colour; a writ's line of
    // grave-light runs out from him; a torn writ goes nowhere
    grave(tg) { const s = tg.live; shapeFlash(s, tg.color || '#ffffff', { a: 0.3, dur: 0.5 }); VFX.pillar(s.x, s.y, { r: 40, h: 160, color: tg.color || '#ffffff', dur: 0.6 }); },
    writ(tg) { const s = tg.live; streak(s.x, s.y, s.angle, '#9affc0', { len: s.len, w: 14, dur: 0.4 }); sweep(s, '#7affa8', 0.3); shake(5); },
    pardon() {},
    // Skitterra, Hard: a sac bursting, the charge, a glob of silk landing
    eggsac(tg) {
      const s = tg.live;
      VFX.burst(s.x, s.y - 6, { color: '#e8ff9a', color2: '#ffffff', n: 16, speed: 220 });
      VFX.splash(s.x, s.y, { color: '#8ad82a', n: 10 });
      VFX.shock(s.x, s.y, { r: s.r * 1.3, color: '#d8ff7a', w: 5, flat: 1 });
      shake(3);
    },
    // Fang Rush: a pink smear down the lane behind her as she charges, claw bursts and rock kicked up where she passes,
    // and a heavier burst where she stops (the silk she drags is the trail zone)
    fang(tg, ctx) {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), b = ctx.bossDraw;
      shapeFlash(s, '#ff7ac0', { a: 0.26, dur: 0.4 });
      let last = 0, stillFor = 0, prev = 0, done = false;
      const along = () => b ? Math.max(0, (b.x - s.x) * ca + (b.y - s.y) * sa) : 0;
      VFX.fx({ dur: 2.2, layer: 'ground', tick: (p, dt) => {
        if (done) return;
        const d = along();
        if (d - last > 100) { last = d; const x = s.x + ca * d, y = s.y + sa * d; bang(x, y, 46, { n: 9, color: '#ff5ab4', core: '#ffe4f4', ink: '#2a0a20', dur: 0.3 }); VFX.debris(x, y, { color: '#4a4156', n: 3, speed: 1 }); }
        stillFor = d - prev < 1 && d > 60 ? stillFor + dt : 0; prev = d;
        if (stillFor > 0.08) {
          done = true; const x = s.x + ca * d, y = s.y + sa * d;
          bang(x, y, 90, { n: 13, color: '#ff5ab4', core: '#ffe4f4', ink: '#2a0a20' }); VFX.debris(x, y, { color: '#4a4156', n: 8, speed: 1.2 }); shake(7);
        }
      }, draw: (c, p, t, e) => {
        const d = Math.max(prev, 1), k = e.a * Math.min(1, (1 - p) / 0.5), hw = 70;
        c.save(); clipArena(c);
        const g = c.createLinearGradient(s.x, s.y, s.x + ca * d, s.y + sa * d);
        g.addColorStop(0, 'rgba(255,90,180,0)'); g.addColorStop(0.6, `rgba(255,90,180,${0.5 * k})`); g.addColorStop(1, `rgba(255,220,240,${0.7 * k})`);
        c.beginPath(); c.moveTo(s.x - sa * 12, s.y + ca * 12); c.lineTo(s.x + ca * d - sa * hw, s.y + sa * d + ca * hw);
        c.lineTo(s.x + ca * d + sa * hw, s.y + sa * d - ca * hw); c.lineTo(s.x + sa * 12, s.y - ca * 12); c.closePath();
        c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fill();
        c.restore();
      } });
      shake(4);
    },
    glob(tg) {
      const s = tg.live;
      VFX.smoke(s.x, s.y, { color: '#f4f0ff', n: 6, size: 26, a: 0.65, speed: 70 });
      VFX.burst(s.x, s.y, { color: '#f4f0ff', n: 10, speed: 180, size: 10 });
      VFX.shock(s.x, s.y, { r: s.r, color: '#ffffff', w: 4, dur: 0.35, flat: 1 });
    },
    // Volkar
    // Thunderclap: the clap breaks round him in a ring of lightning, bolts strike out across the summit, and the rock
    // round him is left cracked and smoking, the cracks still crackling blue
    clap(tg, ctx) {
      const b = ctx && ctx.bossDraw;
      if (b) {
        bang(b.x, b.y, 420, { hole: 0.74, n: 30, color: '#5ab8ff', core: '#ffffff', ink: '#0a1a3a', dur: 0.55, layer: 'ground' });
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + rand(-0.15, 0.15), L = rand(260, 400); VFX.lightning(b.x, b.y - 20, b.x + Math.cos(a) * L, b.y + Math.sin(a) * L * 0.9, { color: i % 2 ? '#ffffff' : '#9fe0ff', jag: 22, dur: 0.4 }); }
        VFX.crater(b.x, b.y, { r: 230, color: '#4fc8ff', core: '#dff6ff', cracks: 14, flames: 0, dur: 7, a: 0.7 });
      }
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
    // Thunder Crash: the bolt comes down and splits between everyone standing under it, scorching where each stood
    crash(tg, ctx) {
      const s = tg.live, us = ((ctx && ctx.units) || []).filter(u => Math.hypot(u.x - s.x, u.y - s.y) <= s.r + 10), mx = s.x, my = s.y - 130;
      VFX.lightning(s.x + rand(-20, 20), s.y - 380, mx, my, { color: '#fff2b0', jag: 26, dur: 0.45 });
      for (const u of us.length ? us : [s]) {
        VFX.lightning(mx, my, u.x, u.y - 10, { color: '#ffffff', jag: 16, dur: 0.42 });
        VFX.scorch(u.x, u.y, u.x, u.y, { w: 60, dur: 6, ember: '#ffe27a', smokeRate: 0.1 });
      }
      if (us.length > 1) crackle(us.map(u => [u.x, u.y]), '#ffe27a', 3);
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
      bang(s.x, s.y, 70, { n: 12, color: '#5ab8ff', core: '#ffffff', ink: '#0a1a3a', layer: 'ground' });
      VFX.debris(s.x, s.y, { color: '#5a6270', n: 6, speed: 0.9 });
      VFX.decal(s.x, s.y, { style: 'crack', r: 70, dur: 6, a: 0.6, seed: Math.random() * 6 });
      roomTint('#bfe8ff', 0.12, 0.3);
      shake(7);
    },
    // Heavens Fall: the column of sky comes down on them, rock flung out of the ring, and a crater left round them
    heavens(tg) {
      const s = tg.live;
      VFX.pillar(s.x, s.y, { r: s.r * 0.9, h: 520, color: '#dff4ff', dur: 0.9 });
      for (let i = 0; i < 5; i++) VFX.lightning(s.x + rand(-60, 60), s.y - 480, s.x + rand(-s.r * 0.6, s.r * 0.6), s.y + rand(-20, 20), { color: i % 2 ? '#ffffff' : '#9fe0ff', jag: 28, dur: 0.5 });
      bang(s.x, s.y, s.r * 1.6, { hole: 0.6, n: 22, color: '#9fe0ff', core: '#ffffff', ink: '#0a1a3a', dur: 0.5, layer: 'ground' });
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10, r = s.r * 1.2; VFX.debris(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.8, { color: '#5a6270', n: 3, speed: 1.2 }); }
      VFX.crater(s.x, s.y, { r: s.r * 1.5, color: '#4fc8ff', core: '#dff6ff', cracks: 12, flames: 0, dur: 7, a: 0.6 });
      roomTint('#dff4ff', 0.25, 0.5);
      shake(11);
    },
    gale(tg) {
      const s = tg.live;
      VFX.shock(s.x, s.y, { r: AR() * 1.1, color: '#e8f4ff', w: 14, dur: 0.6, flat: 1 });
      VFX.shock(s.x, s.y, { r: AR() * 0.9, color: '#bfe0ff', w: 6, dur: 0.75, flat: 1, delay: 0.08 });
      for (let i = 0; i < 16; i++) streak(s.x, s.y, i * TAU / 16 + rand(-0.1, 0.1), '#eaf4ff', { w: 6, dur: 0.4, len: AR() });
      for (let i = 0; i < 14; i++) { const a = rand(0, TAU), d = rand(140, AR() * 0.8); VFX.smoke(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, { color: '#c8d0dc', n: 1, size: 30, a: 0.4, speed: 160 }); }
      sweptFloor(s.x, s.y, 4);
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
    // Barrow Knell: the bell tolls: rings of grave-light and violet roll out across the hall from him, grit jumping
    knell(tg, ctx) {
      const b = (ctx && ctx.bossDraw) || { x: 0, y: 0 };
      roomTint('#c8ffdc', 0.2, 0.7);
      VFX.flash(b.x + 110, b.y - 120, 120, '#c8ffdc', 0.3);
      for (let i = 0; i < 4; i++) VFX.shock(b.x, b.y, { r: AR() * 1.2, color: i % 2 ? '#b46aff' : '#c8ffdc', w: 9 - i, dur: 0.85, flat: 1, delay: i * 0.14 });
      for (const q of scatter({ kind: 'circle', x: 0, y: 0, r: AR() }, 10)) after(rand(0.05, 0.4), () => VFX.debris(q.x, q.y, { color: '#4a5054', n: 2, speed: 0.6, up: 0.6 }));
      shake(7);
    },
    gaze() { roomTint('#e8fff0', 0.16, 0.4); },
    // his three swings, each in its own colour (boss-tells.js SWING): the Sweep a gold scythe-arc that leaves a
    // scorched crescent, the Stomp a teal shockwave and a cracked crater, the Crown hands of violet light bursting up
    sweep(tg) { swingSweep(tg.live, '#e8c15a', '#fff2c0'); shake(7); },
    stomp(tg) { swingStomp(tg.live, '#4fe0d0', '#dffff8'); shake(9); },
    ring(tg) { swingRing(tg.live, '#a070ff', '#e8d8ff'); shake(8); },
    esweep(tg) { swingSweep(tg.live, '#9fd0ff', '#eaf6ff', 0.7); shake(5); },
    estomp(tg) { swingStomp(tg.live, '#9fd0ff', '#eaf6ff', 0.7); shake(6); },
    ering(tg) { swingRing(tg.live, '#9fd0ff', '#eaf6ff', 0.7); shake(6); },
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
  // the Sceptre Sweep: a scythe-arc of light swept through the cone, then a scorched crescent where it passed
  function swingSweep(s, color, core, a = 1) {
    graveBurst(s, color);
    for (const r of [180, 300]) VFX.slash(s.x, s.y, s.angle, { r, span: Math.min(s.arc, 2.4), color: core, dur: 0.4, w: 0.55, sparks: 6 });
    if (a < 1) return;
    for (let i = 0; i <= 8; i++) { const ang = s.angle - s.arc / 2 + s.arc * i / 8, d = 240 + Math.sin(i) * 20, x = s.x + Math.cos(ang) * d, y = s.y + Math.sin(ang) * d; if (ARENA.sd(x, y) < -20) VFX.scorch(x, y, x, y, { w: 46, dur: 6, ember: color, smokeRate: 0.06 }); }
  }
  // the Barrow Stomp: a shockwave out through the flagstones and a crater left cracked and glowing
  function swingStomp(s, color, core, a = 1) {
    graveBurst(s, color);
    VFX.shock(s.x, s.y, { r: s.r * 1.1, color, w: 10, dur: 0.5, flat: 1 });
    bang(s.x, s.y, s.r * 0.55, { n: 14, color, core, ink: '#0a1a18', layer: 'ground' });
    VFX.debris(s.x, s.y, { color: '#4a5054', n: 10, speed: 1.2 });
    if (a < 1) return;
    VFX.crater(s.x, s.y, { r: s.r * 0.6, color, core, cracks: 12, flames: 0, dur: 6, a: 0.7 });
  }
  // the Crown of Graves: hands of light bursting up out of the floor all round him, and the safe ring flashing
  function swingRing(s, color, core, a = 1) {
    graveBurst(s, color);
    VFX.shock(s.x, s.y, { r0: AR(), r: s.r2, color, w: 10, dur: 0.5, flat: 1 });
    for (const q of scatter(s, 22)) after(rand(0, 0.2), () => {
      for (let i = 0; i < 3; i++) VFX.spawn({ x: q.x + rand(-6, 6), y: q.y, z: 4, vx: rand(-10, 10), vz: rand(120, 220) * a, drag: 0.02, life: 0.7, size: rand(4, 6), size1: 0, color: i ? color : core });
      VFX.flash(q.x, q.y - 12, 20, core, 0.25);
    });
  }
  // Court of Bones: a coffin bursting open: lid shards, grave-light and bone, and a skeleton climbing out of it
  function coffinBurst(x, y) {
    bang(x, y - 10, 70, { n: 12, color: '#7affa8', core: '#eafff0', ink: '#0a1a10' });
    VFX.burst(x, y - 20, { color: '#b46aff', color2: '#c8ffd8', n: 14, speed: 240, size: 11 });
    for (let i = 0; i < 8; i++) { const a = rand(0, TAU), sp = rand(100, 240); VFX.spawn({ x, y, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 240), g: 600, life: 0.7, size: 11, color: i % 2 ? '#565d61' : '#e8e4d8', kind: 'shard', add: false, vr: rand(-10, 10) }); }
    VFX.debris(x, y, { color: '#565d61', n: 8, speed: 1.1 });
    VFX.smoke(x, y, { color: '#8a9890', n: 6, size: 30, a: 0.5, speed: 70 });
    shake(5);
  }
  // Lights Out: every brazier snuffed in a gust of black smoke, its last embers dying
  function snuff(room) {
    for (const pr of (room && room.props) || []) {
      if (pr.kind !== 'brazier') continue;
      VFX.smoke(pr.x, pr.y - 30, { color: '#141a18', n: 6, size: 30, a: 0.8, speed: 50, life: 1.6 });
      VFX.sparks(pr.x, pr.y - 30, { color: '#7affa8', n: 5, speed: 120 });
    }
  }
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
      // Titan Fist: a stone fist wrapped in lightning comes down: shards of rock spike up round the tank, and the floor
      // is smashed along the cone, the cracks glowing blue while they cool
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), r = s.r || 320;
      for (let i = 0; i < 3; i++) VFX.lightning(s.x, s.y - 20, x + rand(-16, 16), y + rand(-12, 12), { color: '#9ff4ff', jag: 12, dur: 0.4 });
      VFX.hit(x, y, '#bff6ff', 2.3);
      bang(x, y, 100, { n: 12, color: '#5a7a9a', core: '#dff6ff', ink: '#0a1222' });
      VFX.crystals(x, y, { r: 56, n: 9, h: 66, color: '#6a86a8', dur: 1.1 });
      VFX.shock(x, y, { r: 90, color: '#9ff4ff', w: 6, flat: 1 });
      VFX.gouge(s.x + ca * 70, s.y + sa * 70, s.x + ca * r, s.y + sa * r, { w: 34, dur: 8, heat: '#3ab8ff', lip: '#1a2230', ember: '#bff6ff', heatT: 5 });
      VFX.debris(x, y, { color: '#5a6270', n: 10, speed: 1.2 });
      VFX.decal(x, y, { style: 'crack', r: 70, dur: 6, a: 0.6, seed: Math.random() * 6 });
    } else if (ctx.boss === 'hollowking') {
      // Grave Cleave: the greatsword comes down in grave-light and violet, splits the floor along the cone (the rift
      // glows a while) and the wound keeps bleeding
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), r = s.r || 320;
      VFX.slash(x, y, s.angle + Math.PI / 2, { r: 90, span: 2.4, color: '#c8ffd8', dur: 0.4, w: 0.55, sparks: 8 });
      VFX.hit(x, y, '#ff4a3a', 2.3);
      bang(x, y, 90, { n: 13, color: '#7affa8', core: '#eafff0', ink: '#1a0a2a' });
      VFX.gouge(s.x + ca * 60, s.y + sa * 60, s.x + ca * r, s.y + sa * r, { w: 28, dur: 8, heat: '#a050ff', lip: '#14101c', ember: '#9affc0', heatT: 5 });
      VFX.debris(x, y, { color: '#4a5054', n: 8, speed: 1.1 });
      VFX.splash(x, y, { color: '#a01a1a', n: 10 });
    } else if (ctx.boss === 'skitterra') {
      // Silk Wrap: the cage snaps shut, strands whipping in round the tank, and a web left stuck to the floor (the
      // cocoon itself is drawn while they're rooted)
      silkWhip(x, y);
      VFX.hit(x, y, '#e8dcff', 2);
      VFX.burst(x, y - 20, { color: '#f4f0ff', n: 14, speed: 220, size: 9 });
      webDecal(x, y, 120, 7);
    } else {
      // Tenderize: the ghost cleaver comes down flat along the cone, out from him through the tank, and cuts the floor
      // the length of it
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), r = s.r || 320, mid = (60 + r) / 2;
      flatCleaver(s.x + ca * mid, s.y + sa * mid, ca, sa, -sa, ca, (r - 60) / 2, 90, { off: -45, from: 60 });
      after(0.06, () => {
        bang(x, y, 95, { n: 14 });
        VFX.hit(x, y, '#ff5a3a', 2.2);
        VFX.gouge(s.x + ca * 60, s.y + sa * 60, s.x + ca * r, s.y + sa * r, { w: 20, dur: 9 });
        for (let d = 90; d < r; d += 80) bang(s.x + ca * d, s.y + sa * d, 40, { n: 9, dur: 0.32 });
        VFX.sparks(x, y, { color: '#fff0c8', n: 12, speed: 340 });
        VFX.debris(x, y, { color: '#e2d6c0', n: 7, speed: 1.1, size: 1.3 });
        shake(9);
      });
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
  // Gorge: the whole kitchen is sucked into him: arms of fire and food spiralling in, tightening as he swallows
  function gorgeVortex(b, dur) {
    const arms = 4, ph = rand(0, TAU);
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.2) * Math.min(1, (1 - p) / 0.15), R = 460 - 300 * easeOut(p), spin = ph + t * (4 + p * 6);
      c.save(); c.translate(b.x, b.y - 20); c.scale(1, 0.62); c.lineCap = 'round'; c.lineJoin = 'round';
      // each arm a broad band of fire that thins as it winds in: ink edge, orange body, a hot yellow heart
      const arm = (i, scale) => {
        const pts = [];
        for (let q = 0; q <= 1.0001; q += 0.05) { const a = spin + i * TAU / arms + q * 3.4, r = R * (1 - q * 0.85), w = (46 * (1 - q) + 6) * scale; pts.push([Math.cos(a) * r, Math.sin(a) * r, a, w]); }
        c.beginPath();
        for (const [x, y, a, w] of pts) c.lineTo(x + Math.cos(a) * w * 0.5, y + Math.sin(a) * w * 0.5);
        for (let j = pts.length - 1; j >= 0; j--) { const [x, y, a, w] = pts[j]; c.lineTo(x - Math.cos(a) * w * 0.5, y - Math.sin(a) * w * 0.5); }
        c.closePath(); c.fill();
      };
      for (let i = 0; i < arms; i++) {
        c.globalAlpha = k * 0.8; c.fillStyle = '#2a0e04'; arm(i, 1.25);
        c.globalAlpha = k; c.fillStyle = '#ff6a14'; arm(i, 1);
        c.fillStyle = '#ffb428'; arm(i, 0.55);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.8; c.fillStyle = '#fff0c0'; arm(i, 0.22); c.globalCompositeOperation = 'source-over';
      }
      c.restore(); c.globalAlpha = 1;
      VFX.glowAt(c, b.x, b.y - 20, 120 + 80 * p, '#ffb040', k * (0.3 + 0.4 * p));
    }, tick: (p) => {
      // chunks of food flying in
      if (Math.random() < 0.7) { const a = rand(0, TAU), r = 420 - 200 * p, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r * 0.62;
        VFX.spawn({ x, y, z: 20, vx: (b.x - x) * 2.2, vy: (b.y - y) * 2.2, vz: rand(0, 30), drag: 0.01, life: 0.45, size: rand(5, 9), size1: 2, color: Math.random() < 0.5 ? '#7a4620' : '#c0401a', kind: 'drop', add: false }); }
    } });
  }
  // the Chrysalis: silk winds up round her from the floor as the cast runs, thickening into a cocoon. If the party tears
  // enough off her first it bursts open (cocoonEnd); if not, it closes and the enrage follows.
  let cocoon = null;
  function chrysalis(b, dur) {
    const bands = Array.from({ length: 16 }, (_, i) => ({ ph: rand(0, 6), tilt: rand(-0.25, 0.25), w: 1.5 + (i % 3) }));
    cocoon = VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      if (e.gone) return;
      const k = e.a * Math.min(1, p / 0.05), R = 92, cy = b.y - 34, H = R * 1.2;
      c.save();
      c.fillStyle = `rgba(236,230,250,${(0.06 + 0.3 * p) * k})`;
      c.beginPath(); c.ellipse(b.x, cy, R * (1 - 0.18 * p), H, 0, 0, TAU); c.fill();
      c.lineCap = 'round';
      const n = Math.min(bands.length, 2 + Math.floor(p * 15));
      for (let i = 0; i < n; i++) {
        const q = bands[i], y = cy + H * 0.85 - i * (H * 1.7 / bands.length), u = (y - cy) / H, w = R * (1 - 0.18 * p) * Math.sqrt(Math.max(0, 1 - u * u));
        c.strokeStyle = `rgba(250,246,255,${(0.35 + 0.5 * p) * k})`; c.lineWidth = q.w;
        c.beginPath(); c.moveTo(b.x - w, y + w * q.tilt); c.quadraticCurveTo(b.x, y + 9 + 3 * Math.sin(t * 2 + q.ph), b.x + w, y - w * q.tilt); c.stroke();
      }
      // the last few seconds: it pulses, nearly shut
      if (p > 0.8) VFX.neonRing(c, b.x, cy, R * 0.9, '#f4f0ff', 2, k * (p - 0.8) * 3 * (0.6 + 0.4 * Math.sin(t * 14)), 0.5);
      c.restore();
    } });
  }
  function cocoonEnd(b, torn) {
    if (cocoon) { cocoon.gone = true; cocoon = null; }
    if (!torn) return;
    VFX.burst(b.x, b.y - 34, { color: '#f4f0ff', n: 26, speed: 300, size: 12 });
    for (let i = 0; i < 16; i++) VFX.spawn({ x: b.x + rand(-60, 60), y: b.y - 34 + rand(-70, 50), z: 30, vx: rand(-260, 260), vy: rand(-160, 160), vz: rand(60, 220), g: 320,
      life: 0.9, size: 14, color: '#ffffff', stretch: 4, vr: rand(-8, 8) });
    VFX.shock(b.x, b.y, { r: 200, color: '#f4f0ff', w: 5, dur: 0.5, flat: 1 });
    shake(6);
  }
  function castStart(bossKind, anim, dur, bossDraw) {
    if (bossKind === 'grubnak' && anim === 'gorge') gorgeVortex(bossDraw, dur);
    if (bossKind === 'skitterra' && anim === 'chrysalis') chrysalis(bossDraw, dur);
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
  function addSpawn(x, y, kind) {
    if (kind === 'skeleton') return coffinBurst(x + Math.sign(x) * 40, y);
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
    bang(a.x, a.y - 6, 54, { n: 11, color: '#ff3a5a', core: '#ffd0d8', ink: '#2a0810', dur: 0.4 });
    VFX.shock(a.x, a.y, { r: 90, color: '#ff4a6a', w: 5, dur: 0.4, flat: 1 });
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
    bang(x, y, 46, { color: '#c0401a', core: '#ffd8a0', ink: '#2a0c04', n: 10, dur: 0.32 });
    VFX.smoke(x, y, { color: '#d8c4a4', n: 5, size: 26, a: 0.55, speed: 60 });
    VFX.splash(x, y, { color: '#b02a14', n: 8 });
    VFX.smear(x, y, x, y, { w: 46, splat: true, dur: 6, color: '#8a321a', hi: '#d0704a' });
    shake(3);
  }
  // ...and when it reaches the far wall: it bursts against the bricks, and its gravy trail runs all the way back
  function meatballWall(x, y, a, sx, sy) {
    bang(x, y, 86, { color: '#c0401a', core: '#ffd8a0', ink: '#2a0c04', n: 14, dur: 0.45 });
    VFX.splash(x, y, { color: '#a8281a', n: 22, speed: 1.6, size: 1.3 });
    VFX.debris(x, y, { color: '#6a3a1a', n: 8, speed: 1.2 });
    VFX.smoke(x, y, { color: '#d8c4a4', n: 6, size: 30, a: 0.5, speed: 80 });
    VFX.smear(sx, sy, x - Math.cos(a) * 20, y - Math.sin(a) * 20, { w: 36, splat: true, dur: 10, color: '#8a321a', hi: '#d0704a' });
    shake(5);
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
  // a crackle of lightning left jumping between points on the floor for a few seconds, fading
  function crackle(pts, color, dur) {
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      if (Math.floor(t * 14) % 3 === 0) return;
      c.save(); c.globalAlpha = e.a * (1 - p) * 0.9;
      for (let i = 1; i < pts.length; i++) jagged(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], Math.floor(t * 14) * 3 + i, color, 1.5);
      c.restore();
    } });
  }
  // Gale Slam's aftermath: the floor swept clean in long streaks running out from him
  function sweptFloor(x, y, dur) {
    const st = Array.from({ length: 46 }, () => ({ a: rand(0, TAU), d: rand(120, AR() * 0.95), l: rand(30, 80) }));
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p * dur / 0.2) * (1 - p);
      c.save(); clipArena(c); c.lineCap = 'round'; c.strokeStyle = `rgba(220,232,248,${0.3 * k})`; c.lineWidth = 2; c.beginPath();
      for (const q of st) { c.moveTo(x + Math.cos(q.a) * q.d, y + Math.sin(q.a) * q.d); c.lineTo(x + Math.cos(q.a) * (q.d + q.l), y + Math.sin(q.a) * (q.d + q.l)); }
      c.stroke(); c.restore();
    } });
  }
  // Acid Deluge: one drop driving down at a slant and bursting where it lands
  function acidDrop(x, y, splash) {
    VFX.fx({ dur: 0.12, layer: 'air', draw: (c, p, t, e) => {
      const f = (1 - p) * 90; c.save(); c.globalAlpha = e.a; c.lineCap = 'round';
      c.strokeStyle = '#c8ff7a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + f * 0.45 + 14, y - f - 30); c.lineTo(x + f * 0.45, y - f); c.stroke();
      c.restore();
    }, done: () => {
      bang(x, y, rand(22, 36), { n: 9, color: '#8adf2a', core: '#f4ffc8', ink: '#123008', dur: 0.32, layer: 'ground' });
      if (splash) VFX.splash(x, y, { color: '#8ad82a', n: 4 });
    } });
  }
  // the floor the acid fell on, pitted and smoking for a while: little dark pocks rimmed in green, bubbling
  function acidPits(pts, dur) {
    const pits = pts.map(q => ({ x: q.x + rand(-20, 20), y: q.y + rand(-14, 14), r: rand(7, 15), ph: rand(0, 6), n: 1 + Math.floor(rand(0, 3)) }));
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * dur, k = e.a * Math.min(1, life / 0.3) * Math.min(1, (dur - life) / 1.5);
      c.save(); clipArena(c);
      for (const q of pits) for (let j = 0; j < q.n; j++) {
        const x = q.x + j * q.r * 1.3, y = q.y + (j % 2) * q.r * 0.5, r = q.r * (1 - j * 0.25);
        c.globalAlpha = k * 0.85; c.fillStyle = '#10200a'; c.beginPath(); c.ellipse(x, y, r, r * 0.65, 0, 0, TAU); c.fill();
        c.globalAlpha = k * (0.55 + 0.25 * Math.sin(t * 3 + q.ph + j)); c.strokeStyle = '#9adf3a'; c.lineWidth = 2; c.stroke();
        c.globalAlpha = k * 0.6; c.fillStyle = '#5aae22'; c.beginPath(); c.ellipse(x, y + r * 0.1, r * 0.55, r * 0.3, 0, 0, TAU); c.fill();
      }
      c.restore(); c.globalAlpha = 1;
    }, tick: (p) => {
      if (Math.random() < 0.35 * (1 - p)) { const q = pits[Math.floor(Math.random() * pits.length)]; if (q) VFX.spawn({ x: q.x, y: q.y, z: 4, vx: rand(-6, 6), vz: rand(18, 36), drag: 0.02, life: rand(1.2, 1.8), size: rand(8, 12), size1: 26, color: '#8ac85a', kind: 'smoke', add: false, a: 0.3, fadeIn: 0.2 }); }
    } });
  }
  // The Brood: a clutch splitting open: green goo, a burst, shell flying, and broken shell left lying in the web
  function hatch(x, y) {
    bang(x, y - 6, 62, { n: 12, color: '#9adf3a', core: '#f4ffc8', ink: '#14300a' });
    VFX.splash(x, y, { color: '#8ad82a', n: 14 });
    for (let i = 0; i < 12; i++) { const a = rand(0, TAU), sp = rand(80, 220); VFX.spawn({ x, y, z: 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(80, 220), g: 600, life: 0.6, size: 9, color: '#efeadb', kind: 'shard', add: false, vr: rand(-10, 10) }); }
    const bits = Array.from({ length: 11 }, () => { const a = rand(0, TAU), d = rand(14, 60); return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, s: rand(5, 10), r: rand(0, TAU), goo: Math.random() < 0.35 }; });
    VFX.fx({ dur: 8, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * 8, k = e.a * Math.min(1, life / 0.2) * Math.min(1, (8 - life) / 1.5);
      c.save(); c.globalAlpha = k;
      for (const b of bits) {
        if (b.goo) { c.fillStyle = 'rgba(120,200,50,0.75)'; c.beginPath(); c.ellipse(b.x, b.y, b.s * 0.9, b.s * 0.5, 0, 0, TAU); c.fill(); continue; }
        c.save(); c.translate(b.x, b.y); c.rotate(b.r);
        c.beginPath(); c.arc(0, 0, b.s, 0.25, Math.PI - 0.25); c.closePath();
        c.fillStyle = '#ece6d6'; c.fill(); c.strokeStyle = '#1a1622'; c.lineWidth = 1.3; c.stroke();
        c.restore();
      }
      c.restore();
    } });
    shake(4);
  }
  // Spin: a thread shot pillar to pillar, a puff of silk where it catches
  function threadShoot(fl) {
    const { x1, y1, x2, y2 } = fl;
    VFX.fx({ dur: 0.3, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.7)), k = e.a * (1 - Math.max(0, p - 0.7) / 0.3);
      c.save(); c.lineCap = 'round';
      VFX.neonPath(c, '#f4f0ff', 6, k, () => { c.moveTo(x1, y1 - 8); c.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q - 8); });
      c.restore();
    }, done: () => { for (const [x, y] of [[x1, y1], [x2, y2]]) VFX.burst(x, y - 8, { color: '#f4f0ff', n: 8, speed: 130, size: 7 }); } });
  }
  // a thread's knot broken (or its pillar gone): it snaps at the knot, the long end whips away curling, a fibre
  // burst where it broke, and the slack thread left lying on the floor for a while
  function threadSnap(fl) {
    const { x1, y1, x2, y2 } = fl, L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    const kx = x1 + ux * 40, ky = y1 + uy * 40, side = Math.random() < 0.5 ? -1 : 1;
    bang(kx, ky - 6, 40, { n: 10, color: '#e8e4f4', core: '#ffffff', ink: '#2a2438', dur: 0.3 });
    for (let i = 0; i < 10; i++) { const a = rand(0, TAU), sp = rand(120, 260); VFX.spawn({ x: kx, y: ky, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(40, 140), g: 300, life: 0.55, size: 11, color: '#ffffff', stretch: 4, rot: a, vr: rand(-8, 8) }); }
    // the slack end: from the far pillar back toward the break, curling into an S and settling
    const curl = (c, reach, amp, ph) => {
      c.beginPath(); c.moveTo(x2, y2);
      for (let i = 1; i <= 24; i++) { const q = i / 24, d = L * reach * q, w = Math.sin(q * Math.PI * 2.2 + ph) * amp * q; c.lineTo(x2 - ux * d + nx * w * side, y2 - uy * d + ny * w * side); }
    };
    VFX.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(p);
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = e.a;
      curl(c, 0.96 - 0.44 * q, 40 * q, p * 3); c.strokeStyle = 'rgba(250,248,255,0.9)'; c.lineWidth = 3; c.stroke();
      c.restore(); c.globalAlpha = 1;
    } });
    VFX.fx({ dur: 7, delay: 0.55, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * 7, k = e.a * Math.min(1, life / 0.15) * Math.min(1, (7 - life) / 1.5);
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = k;
      curl(c, 0.52, 40, 1.8); c.strokeStyle = 'rgba(20,14,30,0.45)'; c.lineWidth = 6; c.stroke(); c.strokeStyle = 'rgba(236,232,250,0.8)'; c.lineWidth = 2.5; c.stroke();
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // The Collapse: the ring gives way: slabs of floor sink into the dark and vanish, dust bursts off the new edge, the
  // break line flashes pink
  function floorFalls(fl) {
    const onSilk = (x, y) => (fl.paths || []).some(([a, b, c2, d, w]) => PROPS.segDist(x, y, a, b, c2, d) < w / 2 + 12);
    const slabs = [];
    for (let i = 0; i < 90 && slabs.length < 46; i++) {
      const a = rand(0, TAU), d = fl.r2 + 20 + rand(0, Math.min(260, fl.r - fl.r2 - 20)), x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (ARENA.sd(x, y) > -14 || onSilk(x, y)) continue;
      const s = rand(16, 30), pts = Array.from({ length: 6 }, (_, j) => { const q = j * TAU / 6 + rand(-0.3, 0.3), m = s * rand(0.7, 1.1); return [Math.cos(q) * m, Math.sin(q) * m * 0.75]; });
      slabs.push({ x, y, pts, at: rand(0, 0.35), sp: rand(0.9, 1.3), r: rand(-1, 1) });
    }
    VFX.fx({ dur: 1.6, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * 1.6;
      c.save(); clipArena(c);
      for (const sl of slabs) {
        const q = Math.max(0, Math.min(1, (life - sl.at) / (0.9 * sl.sp))); if (q >= 1) continue;
        const sc = 1 - 0.75 * q, drop = q * q * 60;
        c.save(); c.translate(sl.x, sl.y + drop); c.rotate(sl.r * q); c.scale(sc, sc);
        c.globalAlpha = e.a * (1 - q * q);
        c.beginPath(); sl.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
        c.fillStyle = q < 0.3 ? '#4a4258' : '#2a2434'; c.fill(); c.strokeStyle = '#120c18'; c.lineWidth = 2.5; c.stroke();
        c.restore();
      }
      c.globalAlpha = e.a * Math.max(0, 1 - p * 1.6); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = '#ff4ab0'; c.lineWidth = 10 * (1 - p) + 2; c.beginPath(); c.arc(0, 0, fl.r2, 0, TAU); c.stroke();
      c.restore(); c.globalAlpha = 1;
    } });
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + rand(-0.1, 0.1), x = Math.cos(a) * (fl.r2 + 10), y = Math.sin(a) * (fl.r2 + 10);
      if (onSilk(x, y)) continue;
      after(rand(0, 0.25), () => { VFX.smoke(x, y, { color: '#6a6078', n: 2, size: 36, a: 0.5, speed: 70 }); VFX.debris(x, y, { color: '#4a4156', n: 2, speed: 0.8 }); });
    }
    roomTint('#05030a', 0.3, 0.8);
    shake(14);
  }
  // a cocoon letting go: shreds of silk flying off
  function silkFree(e) {
    VFX.burst(e.x, e.y - 20, { color: '#f4f0ff', n: 8, speed: 150, size: 8 });
    for (let i = 0; i < 6; i++) VFX.spawn({ x: e.x + rand(-14, 14), y: e.y + rand(-6, 6), z: rand(10, 40), vx: rand(-110, 110), vy: rand(-60, 60), vz: rand(40, 120), g: 300,
      life: 0.5, size: 10, color: '#ffffff', stretch: 4, vr: rand(-8, 8) });
  }
  // Silk Wrap landing: strands whipping in from all round and cinching on the tank
  function silkWhip(x, y) {
    const st = Array.from({ length: 9 }, (_, i) => ({ a: i * TAU / 9 + rand(-0.2, 0.2), r: rand(110, 150), bend: rand(-0.9, 0.9) }));
    VFX.fx({ dur: 0.35, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.6)), k = e.a * (1 - Math.max(0, p - 0.5) / 0.5);
      c.save(); c.lineCap = 'round';
      for (const s of st) {
        const r0 = s.r * (1 - q) + 18, r1 = r0 + 60 * (1 - q) + 20, a0 = s.a + s.bend * (1 - q), cy = y - 24;
        c.beginPath(); c.moveTo(x + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1 * 0.8);
        c.quadraticCurveTo(x + Math.cos(a0 + 0.5) * (r0 + r1) / 2, cy + Math.sin(a0 + 0.5) * (r0 + r1) / 2 * 0.8, x + Math.cos(a0) * r0, cy + Math.sin(a0) * r0 * 0.8);
        c.globalAlpha = k * 0.35; c.strokeStyle = '#f4f0ff'; c.lineWidth = 6; c.stroke();
        c.globalAlpha = k; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
      }
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // a web stuck to the floor where the wrap landed: crooked spokes and sagging rings, fading out
  function webDecal(x, y, r, dur) {
    const n = 11, spokes = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.15, 0.15), l: r * rand(0.75, 1.1) }));
    const P = (s, f) => [x + Math.cos(s.a) * s.l * f, y + Math.sin(s.a) * s.l * f * 0.75];
    VFX.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const life = p * dur, k = e.a * Math.min(1, life / 0.2) * Math.min(1, (dur - life) / 1.5);
      c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(240,238,255,${0.5 * k})`; c.lineWidth = 1.5;
      c.beginPath();
      for (const s of spokes) { c.moveTo(x, y); c.lineTo(...P(s, 1)); }
      for (const f of [0.3, 0.55, 0.8]) for (let i = 0; i < n; i++) {
        const a = spokes[i], b = spokes[(i + 1) % n], [ax, ay] = P(a, f), [bx, by] = P(b, f);
        c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2 * 0.92 + x * 0.08, (ay + by) / 2 * 0.92 + y * 0.08, bx, by);
      }
      c.stroke();
      c.restore();
    } });
  }
  // Venom Mist breaking: clouds rolling in from the walls to fill the cave, then a thin haze with motes drifting up
  function venomFog() {
    const R = AR(), puffs = [];
    for (let i = 0; i < 48; i++) { const a = rand(0, TAU), wall = ARENA.edge(a); puffs.push({ a, wall, d: Math.sqrt(rand(0.02, 1)) * (wall - 40), r: rand(60, 100) }); }
    puffs.sort((p, q) => Math.sin(p.a) * p.d - Math.sin(q.a) * q.d);
    VFX.fx({ dur: 1.8, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.55), q = easeOut(Math.min(1, p / 0.4));
      c.save(); clipArena(c);
      for (const f of puffs) {
        const d = f.wall + (f.d - f.wall) * q, x = Math.cos(f.a) * d, y = Math.sin(f.a) * d, r = f.r * (0.8 + 0.35 * q + 0.2 * p);
        // a soft puff: lit pale green on top, deep green underneath, thinning out to nothing at its edge
        const g = c.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.05, x, y, r * 1.1);
        g.addColorStop(0, 'rgba(196,255,120,0.55)'); g.addColorStop(0.45, 'rgba(98,184,40,0.45)'); g.addColorStop(0.8, 'rgba(36,90,16,0.28)'); g.addColorStop(1, 'rgba(36,90,16,0)');
        c.globalAlpha = k; c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * 1.1, r * 0.78, 0, 0, TAU); c.fill();
      }
      c.restore(); c.globalAlpha = 1;
    } });
    VFX.fx({ dur: 5, delay: 0.9, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.1) * (1 - p);
      c.save(); clipArena(c); c.globalAlpha = 0.14 * k; c.fillStyle = '#6ac82a'; c.fillRect(-R - 10, -R - 10, R * 2 + 20, R * 2 + 20); c.restore(); c.globalAlpha = 1;
    }, tick: (p) => {
      if (Math.random() < 0.8 * (1 - p)) { const q = scatter({ kind: 'circle', x: 0, y: 0, r: R - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(0, 30), vz: rand(10, 30), vx: rand(-8, 8), life: rand(1.2, 2), size: rand(3, 5), size1: 0, color: '#c8ff7a' }); }
    } });
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
        VFX.scorch(e.x, e.y, e.x, e.y, { w: 50, dur: 5, ember: '#7fe8ff', smokeRate: 0.08 });
      });
    });
    shake(ents.length > 1 ? 7 : 4);
  }

  // the Hollow King: caught by his gaze (grey stone creeps over them), the sentence passed, a cure, a knight
  // remembering a swing, the knights rising, the night falling
  function gazed(e, b) {
    // a beam of his gaze from the eye over him down onto them, and grey stone creeping over them
    if (b) {
      const x0 = b.x, y0 = b.y - 175;
      VFX.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, ef) => { const k = ef.a * (1 - p); VFX.neonPath(c, '#9affc0', 16 * (1 - p * 0.5), k, () => { c.moveTo(x0, y0); c.lineTo(e.x, e.y - 24); }); } });
    }
    VFX.debris(e.x, e.y, { color: '#8a9490', n: 6, speed: 0.6 });
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
    VFX.shock(e.x, e.y, { r: 90, color: '#ffe2a0', w: 5, dur: 0.5, flat: 1 });
    for (let i = 0; i < 10; i++) VFX.spawn({ x: e.x + rand(-20, 20), y: e.y - 60, z: 0, vx: rand(-90, 90), vy: rand(-40, 40), vz: rand(60, 160), g: 200, life: 0.9, size: 8, color: '#c890ff', kind: 'shard', add: false, vr: rand(-8, 8) });
    VFX.burst(e.x, e.y - 60, { color: '#d8b0ff', color2: '#ffffff', n: 14, speed: 200, size: 10 });
    VFX.motes(e.x, e.y, { color: '#fff0c0', n: 12, r: 30 });
  }
  function knightMemory(k) {
    VFX.shock(k.x, k.y, { r0: 20, r: 90, color: '#9fd0ff', w: 4, dur: 0.5, flat: 1 });
    VFX.flash(k.x, k.y - 30, 50, '#cfe8ff', 0.3);
    VFX.motes(k.x, k.y, { color: '#9fd0ff', n: 10, r: 36 });
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
  function propFx(msg, room, entById, bossKind) {
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
      if (msg.kind !== 'stone') { VFX.scorch(x, y, x, y, { w: 70, dur: 6, ember: '#7fe8ff', smokeRate: 0.12 }); VFX.decal(x, y, { style: 'crack', r: 50, dur: 6, a: 0.6, seed: Math.random() * 6 }); }
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
      if (e) { for (let n = 0; n < 2; n++) VFX.lightning(msg.x, msg.y - 60, e.x, e.y - 16, { color: n ? '#ffffff' : '#ff9a7a', jag: 18, dur: 0.45 }); VFX.hit(e.x, e.y, '#ffb09a', 1.8); VFX.scorch(e.x, e.y, e.x, e.y, { w: 56, dur: 5, ember: '#ffb09a', smokeRate: 0.1 }); }
      shake(5);
    } else if (msg.k === 'fall' && bossKind === 'skitterra') {
      // into the pit (the Collapse): dust where they went over, and a thread let down from the dark to haul them back
      const e = msg.pid != null && entById ? entById(msg.pid) : null, x = e ? e.x : msg.x, y = e ? e.y : msg.y;
      VFX.smoke(x, y, { color: '#5a5068', n: 10, size: 36, a: 0.6, speed: 120 });
      VFX.debris(x, y, { color: '#4a4156', n: 8, speed: 1.1 });
      if (e) VFX.fx({ dur: 2.2, layer: 'air', draw: (c, p, t, ef) => { const k = ef.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.2); c.save(); c.lineCap = 'round'; c.globalAlpha = k; c.strokeStyle = 'rgba(250,248,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x, e.y - 700); c.lineTo(e.x, e.y - 30); c.stroke(); c.restore(); c.globalAlpha = 1; } });
      shake(7);
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
      const r = msg.r || 60;
      VFX.flameWall(msg.x - r * 0.6, msg.y, msg.x + r * 0.6, msg.y, { w: r * 0.9, h: 90, dur: 1.2, step: 32, size: 1.1 });
      VFX.smoke(msg.x, msg.y - 30, { color: '#3a2a20', n: 5, size: 32, a: 0.5, speed: 60 });
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

  // a grease puddle that has burnt off leaves a charred blot, still smoking
  function scorchPool(x, y, r) { VFX.scorch(x, y, x, y, { w: r * 2, dur: 8 }); }

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

  return { failed, propFx, stoveBurst, gazed, doomed, cure, knightMemory, knightRise, nightFall, polarityFlip, edgeClose, pulse, orbForm, orbHit, chain, meatballLand, meatballWall, meatballHit, scorchPool, silkSnap, silkFree, reelBite, snuff, hatch, threadShoot, threadSnap, floorFalls, impact, castStart, cocoonEnd, auto, leap, roar, addSpawn, addDeath, addEnrage, fury, spit, husk, tetherSnap, playerDeath, playerRaised, partyBuff, victory, wipe };
})();
