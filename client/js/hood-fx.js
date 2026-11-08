// The Hollow Hood and the Six-Winged Seraph (boss ids hood, seraph): the two frozen courts, the telegraph tells, the frost shell on a frozen
// hero, the coffin's block of ice, the pillar's rise and shatter, the shards in flight, the light columns, the copies, the two openings and
// the frost on a hit that takes a share. Everything hooks in from this file (arena-view.js is not edited):
//   buildFloor     the two floors (ids `hood`, `seraph`): frost over dark stone, worn letters lying in the frost (scattered, broken: they never read as
//                  words), a ring of columns and wall, four silver chains hanging into the dark at the quarters. The second court has no roof: an ash
//                  sky beyond a broken wall, the gold of a broken halo on the floor.
//   drawAmbient    each court's own life: glints on the frost, drifting cold, the chains (they swing and ring on a toll), the second court's snow
//                  drifting upward and its halo light, the signs of the two halves (roomev hdhalves)
//   drawRoomOver   (over the units) the copies, the frost shells and coffins, the light columns, the glow on a hero, the shards in flight, the openings
//   drawProp       the `pillar` prop: a tall shard of frost with a gold core, standing up as it is born
//   drawZones / drawPuddles   the frost patch (tag hdPatch)
//   BOSS_VFX.propFx   a pillar breaking shatters (installed on the first props() call: boss-vfx.js loads after this file)
// main.js calls HD_FX.props(raid, now) every frame for these two raids (it sets the props hood-art.js reads) and HD_FX.frostHit(x, y) for a
// hit that took a share. boss-tells.js asks HD_FX.tell(tag) for every telegraph tag.
// Room moments read (room.ev.<key>, all by ArenaView.roomEvent):
//   hdhand { blade, light } · hdclones { c: [[x, y, face, eyes, blade], ...], dur } · hdfreeze { id, dur } / hdthaw { id } · hdshard { x, y, land } ·
//   hdgaps { n } · hdwing { n, dur } · hdopen { gate } · hdkneel · hdlie · hdbell { n } · hdcolumn { id, dur } · hdhalves { blade: -1|1|0, dur } ·
//   hdeyes { shut } · hdglow { id, dur }
// (hdhalves: blade -1 puts the blade sign on the half whose telegraph (tag hdBladeHalf) is drawn; with none up, the left half (x < 0))
// Colours: frost #8fd3ff, ink #05040a, gold #d8b86a. Red is damage and blue a stack or a guard, as everywhere (boss-tells.js): the tells paint
// frost only inside the fill of a share of health, a hot red wash inside a fixed hit, and nothing to say where it is safe.

const HD_FX = (() => {
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const sm01 = q => q * q * (3 - 2 * q);
  const C = { frost: '#8fd3ff', frostH: '#dff3ff', frostD: '#3c6f98', ink: '#05040a', gold: '#d8b86a', goldH: '#fff0c0', goldD: '#7a6130', red: '#ff3b2f', blue: '#3d8bff', ash: '#2a2733' };
  const add = (ctx, f) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; f(); ctx.restore(); };
  const isHd = id => id === 'hood' || id === 'seraph';
  const BODY_SCALE = 1.3;   // (main.js RAID_BOSS_SCALE: the copies are drawn the size the boss is)
  const rnow = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);

  // ------------------------------------------------------------------------------------------------------------------ state
  // one fight at a time, keyed on the room object (a new pull builds a new room: its moments start clean)
  const fresh = () => ({ room: null, raid: null, now: 0, last: null, hand: { blade: 0, light: 0 }, shards: [], bits: [], shell: new Map(), coffins: new Map(), clones: [], bells: [], lieAt: null, seen: new Set() });
  let S = fresh();
  const bind = room => { if (room && S.room !== room) { S = fresh(); S.room = room; } };

  // ------------------------------------------------------------------------------------------------------------------ small parts
  // a six-armed flake
  function flakes(ctx, list, col, a, lw = 1.2) {
    ctx.save(); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
    for (const [x, y, r, rot] of list) for (let i = 0; i < 6; i++) {
      const an = rot + i * Math.PI / 3, cx = Math.cos(an), cy = Math.sin(an);
      ctx.moveTo(x, y); ctx.lineTo(x + cx * r, y + cy * r);
      ctx.moveTo(x + cx * r * 0.55, y + cy * r * 0.55); ctx.lineTo(x + Math.cos(an + 0.7) * r * 0.9, y + Math.sin(an + 0.7) * r * 0.9);
      ctx.moveTo(x + cx * r * 0.55, y + cy * r * 0.55); ctx.lineTo(x + Math.cos(an - 0.7) * r * 0.9, y + Math.sin(an - 0.7) * r * 0.9);
    }
    ctx.stroke(); ctx.restore();
  }
  // a fern of frost: a stem and branches, grown from (x, y) heading a
  function fern(c, x, y, a, len, r, col, al, lw = 1) {
    c.save(); c.lineCap = 'round'; c.strokeStyle = rgba(col, al); c.lineWidth = lw; c.beginPath();
    c.moveTo(x, y); const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; c.lineTo(ex, ey);
    for (let i = 1; i <= 5; i++) {
      const q = i / 6, px = x + (ex - x) * q, py = y + (ey - y) * q, bl = len * 0.34 * (1 - q * 0.7) * (0.7 + r() * 0.5);
      for (const sd of [-1, 1]) { c.moveTo(px, py); c.lineTo(px + Math.cos(a + sd * 0.8) * bl, py + Math.sin(a + sd * 0.8) * bl); }
    }
    c.stroke(); c.restore();
  }
  const walk = (r, x, y, a, n, st, wob) => { const p = [x, y]; for (let i = 0; i < n; i++) { a += (r() - 0.5) * wob; const s = st * (0.6 + r() * 0.8); x += Math.cos(a) * s; y += Math.sin(a) * s; p.push(x, y); } return p; };
  const trace = (c, p) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) c.lineTo(p[k], p[k + 1]); };
  function stones(c, R, r, cell, base, vary) {
    for (let gy = -R; gy < R; gy += cell) for (let gx = -R + (Math.round((gy + R) / cell) % 2) * cell / 2; gx < R; gx += cell) {
      if (Math.hypot(gx + cell / 2, gy + cell / 2) > R + cell) continue;
      rrect(c, gx + 1.5 + r() * 1.5, gy + 1.5 + r() * 1.5, cell - 4, cell - 4, 4, shade(base, (r() - 0.5) * vary), 'rgba(2,5,9,0.6)', 1);
    }
  }

  // ------------------------------------------------------------------------------------------------------------------ the worn letters
  // pieces of strokes in an invented hand, each lying where it fell: scattered round the floor, each turned its own way, each worn through in
  // places, so nothing here reads as a word or as a letter. A groove cut in the frost: a dark channel with a pale chipped edge.
  const STROKES = [[[0, -1, 0, 1]], [[-0.7, -1, 0.7, -1], [0, -1, 0, 1]], [[-0.7, 1, 0, -1], [0, -1, 0.7, 1]], [[-0.7, -1, -0.7, 1], [-0.7, 0, 0.7, 0.2]], [[0.7, -1, -0.7, -0.2], [-0.7, -0.2, 0.7, 1]], [[-0.7, -1, 0.7, 1], [0.7, -1, -0.7, 1]], [[-0.7, -0.5, 0.7, -0.5], [-0.7, 0.5, 0.7, 0.5], [0, -1, 0, 1]], [[-0.7, 1, -0.7, -0.4], [-0.7, -0.4, 0, -1], [0, -1, 0.7, -0.4], [0.7, -0.4, 0.7, 1]]];
  function letters(c, r, R, n) {
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = R * (0.22 + 0.7 * Math.sqrt(r())), x = Math.cos(a) * d, y = Math.sin(a) * d, sz = 24 + r() * 22, rot = r() * TAU;
      const set = STROKES[Math.floor(r() * STROKES.length)];
      c.save(); c.translate(x, y); c.rotate(rot); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [x0, y0, x1, y1] of set) {
        const wear = [];   // the stroke is cut into pieces and some pieces are gone
        for (let k = 0; k < 4; k++) if (r() > 0.34) wear.push([k / 4 + 0.02, (k + 1) / 4 - 0.02 - r() * 0.05]);
        if (!wear.length) wear.push([0, 0.4]);
        for (const [q0, q1] of wear) {
          const ax = lerp(x0, x1, q0) * sz, ay = lerp(y0, y1, q0) * sz, bx = lerp(x0, x1, q1) * sz, by = lerp(y0, y1, q1) * sz;
          c.beginPath(); c.moveTo(ax + 1.2, ay + 1.4); c.lineTo(bx + 1.2, by + 1.4); c.strokeStyle = 'rgba(220,240,255,0.2)'; c.lineWidth = 7; c.stroke();   // the chipped lip
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.strokeStyle = 'rgba(3,6,12,0.82)'; c.lineWidth = 5; c.stroke();   // the groove
          c.beginPath(); c.moveTo(ax - 0.6, ay - 0.6); c.lineTo(bx - 0.6, by - 0.6); c.strokeStyle = 'rgba(2,3,6,0.9)'; c.lineWidth = 2.2; c.stroke();
        }
      }
      c.restore();
      // frost drifted back over it
      glow(c, x, y, sz * 1.1, '#cfe9ff', 0.1 + r() * 0.08);
    }
  }

  // ------------------------------------------------------------------------------------------------------------------ the courts
  const FAR = { hood: '#04060a', seraph: '#0a0b0f' };
  function buildCourt(c, bx, by, R, gate) {
    const r = rng(gate === 1 ? 7101 : 7202), roofless = gate === 2;
    c.fillStyle = roofless ? FAR.seraph : FAR.hood; c.fillRect(-bx, -by, bx * 2, by * 2);
    if (roofless) {   // the sky beyond: ash, lighter toward the room, the gold of the halo bleeding into it
      const g = c.createRadialGradient(0, 0, R * 0.6, 0, 0, bx); g.addColorStop(0, '#262831'); g.addColorStop(0.45, '#15161c'); g.addColorStop(1, '#0a0b0f');
      c.fillStyle = g; c.fillRect(-bx, -by, bx * 2, by * 2);
      for (let i = 0; i < 70; i++) { const a = r() * TAU, d = R * (1 + r() * 0.5); glow(c, Math.cos(a) * d, Math.sin(a) * d, 70 + r() * 130, r() < 0.3 ? '#4a4540' : '#3a3d4a', 0.07 + r() * 0.08); }
      glow(c, 0, 0, R * 1.5, '#c8a860', 0.07);
    } else {
      for (let i = 0; i < 60; i++) glow(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 60 + r() * 120, r() < 0.5 ? '#0a1824' : '#06101a', 0.12 + r() * 0.1);
    }
    // the wall: dark frosted blocks (the second court's is broken down in places, ash behind the gaps)
    const blocks = 56;
    for (let i = 0; i < blocks; i++) {
      const a0 = i * TAU / blocks + 0.004, a1 = (i + 1) * TAU / blocks - 0.004, v = r(), broken = roofless && (i % 7 === 3 || i % 11 === 5);
      const ro = R + (broken ? 18 + r() * 14 : 74 + r() * 10);
      c.beginPath(); c.arc(0, 0, ro, a0, a1); c.arc(0, 0, R + 4, a1, a0, true); c.closePath();
      c.fillStyle = `rgb(${16 + v * 10 | 0},${22 + v * 12 | 0},${30 + v * 14 | 0})`; c.fill(); c.strokeStyle = 'rgba(1,3,6,0.95)'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, R + 6, a0 + 0.006, a1 - 0.006); c.strokeStyle = rgba('#8fd3ff', 0.07 + 0.1 * v); c.lineWidth = 2; c.stroke();
      if (r() < 0.5) { c.beginPath(); c.arc(0, 0, ro - 2, a0 + 0.01, a1 - 0.01); c.strokeStyle = 'rgba(230,246,255,0.22)'; c.lineWidth = 2.4; c.stroke(); }   // frost on the top of the block
    }
    // columns in the wall, seen from above: a round top with frost on it, a long shadow; the second court's are stumps
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + Math.PI / 12, d = R + 46, x = Math.cos(a) * d, y = Math.sin(a) * d, stump = roofless && i % 3 === 1;
      ellipse(c, x + 8, y + 10, 24, 20, 0, 'rgba(0,0,0,0.5)'); circle(c, x, y, stump ? 15 : 19, '#18212c', OUT, 2.5); circle(c, x, y, stump ? 10 : 13, '#202b38'); circle(c, x - 4, y - 5, 6, 'rgba(200,235,255,0.14)');
      if (stump) for (let k = 0; k < 4; k++) circle(c, x + (r() - 0.5) * 30, y + (r() - 0.5) * 24, 2 + r() * 3, '#141c26');
    }
    // the floor: dark stone under frost
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    const g = c.createRadialGradient(0, 0, 30, 0, 0, R); g.addColorStop(0, '#222c3a'); g.addColorStop(0.6, '#18212d'); g.addColorStop(1, '#0e141c');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    stones(c, R, r, 36, '#1d2733', 0.2);
    for (let i = 0; i < 70; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; glow(c, Math.cos(a) * d, Math.sin(a) * d, 40 + r() * 80, r() < 0.5 ? '#040910' : '#30485e', 0.1 + r() * 0.1); }
    for (let i = 0; i < 40; i++) {   // cracks in the stone, a pale lip where the frost has crept in
      const a0 = r() * TAU, d0 = Math.sqrt(r()) * R * 0.92, p = walk(r, Math.cos(a0) * d0, Math.sin(a0) * d0, r() * TAU, 5 + (r() * 5 | 0), 16, 1.1);
      c.lineJoin = c.lineCap = 'round'; trace(c, p); c.strokeStyle = 'rgba(2,4,8,0.72)'; c.lineWidth = 2.6; c.stroke(); c.strokeStyle = 'rgba(190,225,250,0.12)'; c.lineWidth = 0.9; c.stroke();
    }
    // the frost: thick at the edge and in drifts, sheets of it on the stones, ferns grown across them
    for (let i = 0; i < 160; i++) { const a = r() * TAU, d = R * (0.35 + 0.7 * Math.sqrt(r())), rr = 30 + r() * 90; glow(c, Math.cos(a) * d, Math.sin(a) * d, rr, '#bfe3f8', 0.05 + r() * 0.07); }
    for (let i = 0; i < 26; i++) { const a = r() * TAU, d = R * (0.2 + 0.78 * r()), x = Math.cos(a) * d, y = Math.sin(a) * d, p = walk(r, x, y, r() * TAU, 5, 26, 1.8); poly(c, p, 'rgba(206,235,252,0.07)', 'rgba(220,242,255,0.12)', 1); }
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = R * (0.12 + 0.86 * Math.sqrt(r())), x = Math.cos(a) * d, y = Math.sin(a) * d; fern(c, x, y, r() * TAU, 24 + r() * 46, r, '#e4f5ff', 0.1 + r() * 0.16, 1); }
    for (let i = 0; i < 2600; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.0, r() < 0.55 ? `rgba(2,5,9,${0.15 + r() * 0.25})` : `rgba(225,243,255,${0.05 + r() * 0.12})`); }
    letters(c, r, R, gate === 1 ? 17 : 14);
    circle(c, 0, 0, R * 0.46, null, 'rgba(180,215,240,0.18)', 3); circle(c, 0, 0, R * 0.46 - 8, null, 'rgba(180,215,240,0.07)', 1);   // a worn ring
    if (roofless) {   // the broken halo's gold on the floor: six pieces of a ring, the gaps between them dark
      const SEG = TAU / 6, Rh = R * 0.64;
      for (let i = 0; i < 6; i++) {
        const a0 = i * SEG + 0.2 - Math.PI / 2, a1 = (i + 1) * SEG - 0.2 - Math.PI / 2;
        c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, Rh, a0, a1); c.strokeStyle = 'rgba(216,184,106,0.10)'; c.lineWidth = 34; c.stroke();
        c.beginPath(); c.arc(0, 0, Rh, a0, a1); c.strokeStyle = 'rgba(216,184,106,0.2)'; c.lineWidth = 10; c.stroke();
        c.beginPath(); c.arc(0, 0, Rh, a0 + 0.03, a1 - 0.03); c.strokeStyle = 'rgba(255,240,192,0.22)'; c.lineWidth = 2; c.stroke();
      }
      glow(c, 0, 0, R * 0.9, '#d8b86a', 0.07);
    }
    const v = c.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(2,4,8,0)'); v.addColorStop(1, 'rgba(2,4,8,0.5)'); c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    // the lip, and the dark edge
    c.beginPath(); c.arc(0, 0, R + 8, 0, TAU); c.strokeStyle = '#161e28'; c.lineWidth = 16; c.stroke();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = 'rgba(2,4,8,0.95)'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.arc(0, 0, R + 15.5, 0, TAU); c.strokeStyle = 'rgba(190,226,252,0.22)'; c.lineWidth = 1.4; c.stroke();
    // four chains' anchors: a dark ring on the floor where each ends, a drift of frost round it
    const chains = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, d = R - 34, x = Math.cos(a) * d, y = Math.sin(a) * d;
      ellipse(c, x + 3, y + 5, 17, 8, 0, 'rgba(0,0,0,0.5)'); ellipse(c, x, y + 2, 12, 5.5, 0, '#0b1018', 'rgba(190,226,252,0.3)', 1.2);
      glow(c, x, y, 36, '#cfe9ff', 0.1);
      chains.push({ x, y, ph: r() * 9 });
    }
    // glints on the frost (they twinkle in the life layer)
    const glints = [];
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.97; glints.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * 9, f: 0.5 + r() * 1.3, s: 2 + r() * 3.5 }); }
    const mist = [];
    for (let i = 0; i < 14; i++) mist.push({ a: r() * TAU, d: R * (0.7 + r() * 0.35), s: 0.01 + r() * 0.02, r: 60 + r() * 90, ph: r() });
    return { gate, far: roofless ? FAR.seraph : FAR.hood, bx, by, R, chains, glints, mist };
  }

  // ------------------------------------------------------------------------------------------------------------------ the courts' life
  function chainDraw(ctx, a, t) {
    const toll = S.bells.length ? S.bells[S.bells.length - 1] : null, age = toll ? t - toll.t0 : 99;
    for (const ch of a.chains) {
      const amp = 2.2 + (age < 4 ? 16 * Math.exp(-age * 1.1) : 0), sw = (u) => Math.sin(t * (age < 4 ? 3.1 : 0.9) + ch.ph) * amp * u * u;
      const top = -250, n = 16, bot = -8;
      let px = ch.x, py = ch.y + top;
      for (let i = 1; i <= n; i++) {
        const u = i / n, x = ch.x + sw(u), y = ch.y + top + (bot - top) * u, al = clamp(u * 1.8, 0, 1);
        ctx.save(); ctx.globalAlpha = al;
        const lx = (px + x) / 2, ly = (py + y) / 2, la = Math.atan2(y - py, x - px);   // (links alternate: one seen flat, the next on its edge)
        ctx.beginPath(); ctx.ellipse(lx, ly, 9.4, i % 2 ? 4.6 : 1.9, la, 0, TAU); ctx.strokeStyle = '#03060a'; ctx.lineWidth = 4.4; ctx.stroke();
        ctx.strokeStyle = i % 2 ? '#d3dce8' : '#8794a6'; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.restore();
        px = x; py = y;
      }
      // the weight at the foot: a heavy ring just above the floor
      ellipse(ctx, px + 2, ch.y + 4, 11, 5, 0, 'rgba(0,0,0,0.4)');
      circle(ctx, px, py + 5, 9, '#10151d', '#03060a', 2.4); circle(ctx, px, py + 5, 6, '#4a5566', '#03060a', 1.6); circle(ctx, px - 1.5, py + 3, 1.8, 'rgba(255,255,255,0.55)');
      add(ctx, () => {
        glow(ctx, px, py + 4, 22, C.frostH, 0.1);
        if (toll && age < 1.6) {   // the ring: a flash running down the chain, a ring of sound going out over the floor
          const q = clamp(age / 0.5, 0, 1), fy = ch.y + top + (bot - top) * q;
          glow(ctx, ch.x + sw(q), fy, 26, C.frostH, 0.5 * (1 - q) * (1 - age / 1.6));
          const rr = 20 + age * 240; ctx.save(); ctx.translate(ch.x, ch.y + 2); ctx.scale(1, 0.4); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.strokeStyle = rgba(C.frostH, 0.5 * (1 - age / 1.6)); ctx.lineWidth = 4 * (1 - age / 1.6) + 1; ctx.stroke(); ctx.restore();
        }
      });
    }
  }
  function snowUp(ctx, a, t, k) {   // snow falling upward (the second court): flakes rise, sway, and fade in and out over their run
    const R = a.R * 1.12, n = 170;
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R + 80, 0, TAU); ctx.clip();
    for (let i = 0; i < n; i++) {
      const sp = 14 + hs(i, 1) * 26, q = ((hs(i, 2) * 2 * R - t * sp) % (2 * R) + 2 * R) % (2 * R), y = q - R, x = (hs(i, 3) * 2 - 1) * R + Math.sin(t * 0.6 + i) * 14;
      if (x * x + y * y > (R + 60) ** 2) continue;
      const u = q / (2 * R), al = Math.sin(u * Math.PI) * 0.55 * k, sz = 0.8 + hs(i, 4) * 1.7;
      circle(ctx, x, y, sz, rgba(hs(i, 5) < 0.2 ? '#bdb6a8' : '#e6f4ff', al));
      if (sz > 2.1) flakes(ctx, [[x, y, sz * 2.2, t * 0.4 + i]], C.frostH, al * 0.6, 0.8);
    }
    ctx.restore();
  }
  function haloLight(ctx, a, t, k) {   // the broken halo's light on the floor, a slow shimmer along its pieces
    const Rh = a.R * 0.64, SEG = TAU / 6;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a0 = i * SEG + 0.2 - Math.PI / 2, a1 = (i + 1) * SEG - 0.2 - Math.PI / 2, f = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.1);
      ctx.beginPath(); ctx.arc(0, 0, Rh, a0, a1); ctx.strokeStyle = rgba(C.gold, (0.05 + 0.07 * f) * k); ctx.lineWidth = 26; ctx.stroke();
      const q = ((t * 0.12 + i * 0.17) % 1), am = lerp(a0, a1, q); glow(ctx, Math.cos(am) * Rh, Math.sin(am) * Rh, 40, C.goldH, 0.16 * k);
    }
    ctx.restore();
  }
  // the signs of the two halves (the Scales): a blade on one half, a light on the other; the halves are the telegraphs' rectangles when they are up
  function halvesSigns(ctx, a, t) {
    const ev = S.room && S.room.ev && S.room.ev.hdhalves; if (!ev || !ev.blade) return;
    const raid = S.raid; let bc = null, lc = null;
    if (raid && raid.tgs) for (const tg of raid.tgs.values()) {
      if (tg.gone != null || !tg.live || tg.live.kind !== 'rect') continue;
      const s = tg.live, cx = s.x + Math.cos(s.angle) * s.len / 2, cy = s.y + Math.sin(s.angle) * s.len / 2;
      if (tg.tag === 'hdBladeHalf') bc = [cx, cy]; else if (tg.tag === 'hdLightHalf') lc = [cx, cy];
    }
    const d = ev.blade < 0 ? 1 : -1, dflt = [[-a.R * 0.5 * d, 0], [a.R * 0.5 * d, 0]];
    if (!bc) bc = dflt[0]; if (!lc) lc = dflt[1];
    const k = clamp((t - ev.start) / 0.6, 0, 1) * (ev.dur > 0 ? clamp((ev.end - t) / 0.6, 0, 1) : 1) * (0.85 + 0.15 * Math.sin(t * 2));
    // the blade sign: a long thin sword, point up, with its guard; frost round it
    ctx.save(); ctx.translate(bc[0], bc[1]); ctx.globalAlpha = 0.55 * k;
    add(ctx, () => glow(ctx, 0, 0, 120, C.frost, 0.16));
    ctx.lineCap = 'round';
    poly(ctx, [-5, 60, -4, -70, 0, -108, 4, -70, 5, 60], rgba('#04080e', 0.55), rgba(C.frostH, 0.75), 2.2);
    line(ctx, -26, 52, 26, 52, rgba(C.frostH, 0.75), 3); line(ctx, 0, 52, 0, 84, rgba(C.frostH, 0.7), 4); line(ctx, 0, -90, 0, 46, rgba('#ffffff', 0.6), 1.2);
    ctx.restore();
    // the light sign: a disc with twelve rays
    ctx.save(); ctx.translate(lc[0], lc[1]); ctx.globalAlpha = 0.55 * k;
    add(ctx, () => glow(ctx, 0, 0, 130, '#fff6d8', 0.16));
    circle(ctx, 0, 0, 30, rgba('#04080e', 0.4), rgba('#fff0c0', 0.8), 2.4); circle(ctx, 0, 0, 14, rgba('#fff6d8', 0.7));
    for (let i = 0; i < 12; i++) { const an = i * TAU / 12 + t * 0.1; line(ctx, Math.cos(an) * 40, Math.sin(an) * 40, Math.cos(an) * (i % 2 ? 62 : 82), Math.sin(an) * (i % 2 ? 62 : 82), rgba('#fff0c0', 0.75), 2.4); }
    ctx.restore();
  }
  function life(ctx, a, t) {
    ctx.save(); ctx.fillStyle = a.far; ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000); ctx.rect(-a.bx, -a.by, a.bx * 2, a.by * 2); ctx.fill('evenodd'); ctx.restore();   // (flat colour beyond the floor's own canvas)
    const lie = S.room && S.room.ev && S.room.ev.hdlie, calm = lie ? 1 - sm01(clamp((t - lie.start) / 5, 0, 1)) : 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const g of a.glints) {   // glints on the frost, each a small cross of light that swells and goes
      const q = Math.pow(Math.max(0, Math.sin(t * g.f + g.ph)), 10); if (q < 0.04) continue;
      ctx.strokeStyle = rgba('#e6f6ff', 0.75 * q); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x - g.s * q * 2, g.y); ctx.lineTo(g.x + g.s * q * 2, g.y); ctx.moveTo(g.x, g.y - g.s * q * 2); ctx.lineTo(g.x, g.y + g.s * q * 2); ctx.stroke();
      glow(ctx, g.x, g.y, 8 * q + 2, '#ffffff', 0.5 * q);
    }
    for (const m of a.mist) {   // cold drifting low along the rim
      const an = m.a + t * m.s; glow(ctx, Math.cos(an) * m.d, Math.sin(an) * m.d, m.r, a.gate === 2 ? '#8a8478' : '#9ac8e4', 0.045);
    }
    ctx.restore();
    if (a.gate === 2) { haloLight(ctx, a, t, calm); snowUp(ctx, a, t, calm); }
    halvesSigns(ctx, a, t);
    chainDraw(ctx, a, t);
  }

  // ------------------------------------------------------------------------------------------------------------------ the hooks into ArenaView
  const baseBuild = ArenaView.buildFloor, baseAmb = ArenaView.drawAmbient, baseEvent = ArenaView.roomEvent, baseOver = ArenaView.drawRoomOver, baseProp = ArenaView.drawProp;
  const baseZones = ArenaView.drawZones, basePuddles = ArenaView.drawPuddles;
  ArenaView.buildFloor = function (bossId, scale) {
    const gate = bossId === 'hood' ? 1 : bossId === 'seraph' ? 2 : 0;
    if (!gate) return baseBuild.call(this, bossId, scale);
    const R = ARENA.kind === 'circle' ? ARENA.full : 520, bx = Math.ceil(R + 300), by = bx;
    const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(bx * 2 * scale);
    const c = cv.getContext('2d'); c.scale(scale, scale); c.translate(bx, by);
    const amb = buildCourt(c, bx, by, R, gate); amb.kind = 'hdcourt';
    this.floor = cv; this.floorFor = bossId + '@' + scale; this.floorBox = { bx, by }; this.amb = amb;
  };
  ArenaView.drawAmbient = function (ctx, t) {
    const a = this.amb;
    if (a && a.kind === 'hdcourt') return life(ctx, a, t);
    return baseAmb.call(this, ctx, t);
  };
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    bind(room);
    if (msg && typeof msg.k === 'string' && msg.k.startsWith('hd')) onEvent(msg, now);
    return baseEvent.call(this, room, msg, now, ...rest);
  };
  ArenaView.drawRoomOver = function (ctx, room, t, env) {
    baseOver.call(this, ctx, room, t, env);
    if (env && isHd(env.bossId)) { try { over(ctx, room, t, env); } catch (e) { /* a broken effect never stops the fight drawing */ } }
  };
  ArenaView.drawProp = function (ctx, pr, t, room) {
    if (pr.kind === 'pillar' && this.amb && this.amb.kind === 'hdcourt') {
      ctx.save(); ctx.globalAlpha = Math.min(1, (t - (pr.born == null ? t - 1 : pr.born)) / 0.2);
      HD_ART.pillar(ctx, pr, t, (t - (pr.born == null ? t - 1 : pr.born)) / 0.55); ctx.restore(); return;
    }
    return baseProp.call(this, ctx, pr, t, room);
  };
  // the frost patch (a lasting zone or puddle, tag hdPatch): drawn here, everything else goes on to the shared drawing
  function patch(ctx, s, start, end, id, t) {
    const k = Math.min(1, (t - start) / 0.5, Math.max(0, (end - t) / 0.8)); if (k <= 0) return;
    const { x, y, r } = s, rr = r * (0.8 + 0.2 * Math.min(1, (t - start) / 0.5));
    ctx.save(); ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(x, y, rr * 0.1, x, y, rr); g.addColorStop(0, 'rgba(230,246,255,0.62)'); g.addColorStop(0.7, 'rgba(160,210,240,0.42)'); g.addColorStop(1, 'rgba(110,170,215,0.3)');
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) { const a = i * TAU / 22, w = 1 + Math.sin(a * 4 + id) * 0.05 + (i % 2 ? 0.05 : 0), px = x + Math.cos(a) * rr * w, py = y + Math.sin(a) * rr * w; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    const rg = rng((id | 0) * 13 + 5);
    for (let i = 0; i < 7; i++) fern(ctx, x, y, i * TAU / 7 + rg(), rr * (0.7 + rg() * 0.3), rg, '#ffffff', 0.55, 1.3);
    ctx.restore();
    ctx.strokeStyle = rgba(BossTells.COL.danger, 0.85); ctx.lineWidth = 2.4; ctx.stroke();   // it hurts: a red rim
    ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 1; ctx.stroke();
    add(ctx, () => { glow(ctx, x, y, rr * 1.05, C.frost, 0.14); for (let i = 0; i < 5; i++) { const q = (t * 0.5 + i / 5 + id * 0.13) % 1, a = i * 2.4 + id; circle(ctx, x + Math.cos(a) * rr * 0.6 * q, y + Math.sin(a) * rr * 0.6 * q - q * 16, 1.4 * (1 - q), rgba('#ffffff', 0.8 * (1 - q))); } });
    ctx.restore();
  }
  ArenaView.drawZones = function (ctx, zones, t) {
    if (!(this.amb && this.amb.kind === 'hdcourt') || !zones) return baseZones.call(this, ctx, zones, t);
    const rest = new Map(), mine = [];
    for (const [id, z] of zones) { if (z.tag === 'hdPatch') mine.push(z); else rest.set(id, z); }
    baseZones.call(this, ctx, rest, t);
    for (const z of mine) if (z.shape) patch(ctx, z.shape, z.start, z.end, z.id || 0, t);
  };
  ArenaView.drawPuddles = function (ctx, puddles, t) {
    if (!(this.amb && this.amb.kind === 'hdcourt') || !puddles) return basePuddles.call(this, ctx, puddles, t);
    const rest = new Map(), mine = [];
    for (const [id, p] of puddles) (p.tag === 'hdPatch' ? mine.push(p) : rest.set(id, p));
    basePuddles.call(this, ctx, rest, t);
    for (const p of mine) patch(ctx, { x: p.x, y: p.y, r: p.r }, p.start, p.end, p.id || 0, t);
  };

  // ------------------------------------------------------------------------------------------------------------------ moments
  function onEvent(msg, now) {
    const raid = S.raid, bd = raid && raid.bossDraw;
    if (msg.k === 'hdshard') S.shards.push({ t0: now, x0: bd ? bd.x : 0, y0: bd ? bd.y : 0, x1: +msg.x || 0, y1: +msg.y || 0, land: Math.max(0.3, +msg.land || 2), done: false });
    else if (msg.k === 'hdbell') { S.bells.push({ t0: now, n: msg.n | 0 }); if (S.bells.length > 8) S.bells.shift(); }
    else if (msg.k === 'hdlie') S.lieAt = now;
    if (S.shards.length > 12) S.shards.shift();
  }
  // main.js, every frame, for a hood / seraph raid: the props the body reads (hood-art.js), eased where the contract asks
  function props(raid, now) {
    if (!raid || !raid.room) return;
    bind(raid.room); S.raid = raid; S.now = now;
    hook();
    const dt = S.last == null ? 0.016 : clamp(now - S.last, 0, 0.1); S.last = now;
    const ev = raid.room.ev || {}, p = raid.props, b = raid.boss;
    const h = ev.hdhand, k = 1 - Math.exp(-dt / 0.12);
    S.hand.blade += ((h && h.blade ? 1 : 0) - S.hand.blade) * k; S.hand.light += ((h && h.light ? 1 : 0) - S.hand.light) * k;
    p.hdBlade = S.hand.blade < 0.01 ? 0 : S.hand.blade; p.hdLight = S.hand.light < 0.01 ? 0 : S.hand.light;
    p.hdHover = b && b.hv ? 1 : 0;
    const w = ev.hdwing; p.hdWing = w && now < w.end + 0.15 ? w.n | 0 : 0;
    p.hdGaps = ev.hdgaps ? ev.hdgaps.n | 0 : 0;
    const o = ev.hdopen; p.hdOpen = o && now - o.start < 6 ? now - o.start : -1;
    const kn = ev.hdkneel; p.hdKneel = kn ? sm01(clamp((now - kn.start) / 2.2, 0, 1)) : 0;
    const li = ev.hdlie; p.hdLie = li ? sm01(clamp((now - li.start) / 3.2, 0, 1)) : 0;
    p.hdShut = ev.hdeyes && ev.hdeyes.shut ? 1 : 0;
    const cl = ev.hdclones; p.hdHidden = cl && cl.c && cl.c.length && (!(cl.dur > 0) || now < cl.end) ? 1 : 0;
    for (const a of raid.adds.values()) if (a.kind === 'coffin' && a.st) a.st.hpFrac = a.mx > 0 ? clamp(a.hp / a.mx, 0, 1) : 1;
  }
  // a pillar breaking shatters (boss-vfx.js loads after this file: the first props() call puts the hook in)
  function hook() {
    if (typeof BOSS_VFX === 'undefined' || BOSS_VFX.__hd || !BOSS_VFX.propFx) return;
    const f = BOSS_VFX.propFx;
    BOSS_VFX.propFx = function (msg, room, entById, bossKind) {
      if (isHd(bossKind) && msg && msg.kind === 'pillar' && msg.k === 'break') { shatterPillar(msg.x, msg.y, S.now || rnow()); return; }
      return f.apply(this, arguments);
    };
    BOSS_VFX.__hd = 1;
  }
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };

  // ------------------------------------------------------------------------------------------------------------------ particles
  // a bit: a shard, a ring on the floor or a soft puff, laid by a start time and a launch so it needs no stepping
  function bit(o) { if (S.bits.length > 320) S.bits.shift(); S.bits.push(Object.assign({ t0: S.now || rnow(), vx: 0, vy: 0, g: 0, rot: 0, vr: 0, life: 0.8, kind: 'shard' }, o)); }
  function shatter(x, y, t, o = {}) {
    const n = o.n || 18, h = o.h == null ? 40 : o.h;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (o.sp || 150) * (0.4 + Math.random() * 0.9);
      bit({ t0: t, x, y: y - h * Math.random(), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.45 - (60 + Math.random() * 190), g: 620, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, len: (o.len || 10) * (0.6 + Math.random()), wid: 3 + Math.random() * 3, life: 0.7 + Math.random() * 0.6, col: Math.random() < (o.gold || 0) ? C.goldH : Math.random() < 0.6 ? C.frostH : C.frost, floor: y });
    }
    bit({ t0: t, x, y: y + 2, kind: 'ring', r0: o.r0 || 10, r1: o.r1 || 90, life: 0.55, col: C.frostH });
    bit({ t0: t, x, y: y - h * 0.5, kind: 'puff', r0: 20, r1: (o.r1 || 90) * 0.7, life: 0.7, col: '#cfe9ff' });
  }
  function shatterPillar(x, y, t) {
    shatter(x, y, t, { n: 30, h: 90, sp: 230, len: 15, gold: 0.35, r1: 150 });
    bit({ t0: t, x, y: y - 50, kind: 'puff', r0: 30, r1: 90, life: 0.5, col: C.goldH });
    shakeNow(6);
  }
  function frostHit(x, y) {
    const t = S.now || rnow();
    shatter(x, y + 36, t, { n: 12, h: 36, sp: 160, len: 8, r1: 56 });
    bit({ t0: t, x, y: y, kind: 'puff', r0: 10, r1: 40, life: 0.35, col: '#ffffff' });
  }
  function bitsDraw(ctx, t) {
    S.bits = S.bits.filter(b => t - b.t0 < b.life);
    for (const b of S.bits) {
      const age = t - b.t0, q = age / b.life; if (age < 0) continue;
      if (b.kind === 'ring') {
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(1, 0.4); ctx.beginPath(); ctx.arc(0, 0, lerp(b.r0, b.r1, easeOut(q)), 0, TAU); ctx.strokeStyle = rgba(b.col, 0.8 * (1 - q)); ctx.lineWidth = 4 * (1 - q) + 1; ctx.stroke(); ctx.restore();
      } else if (b.kind === 'puff') add(ctx, () => glow(ctx, b.x, b.y, lerp(b.r0, b.r1, easeOut(q)), b.col, 0.5 * (1 - q) * (1 - q)));
      else {
        let x = b.x + b.vx * age, y = b.y + b.vy * age + 0.5 * b.g * age * age; if (b.floor != null && y > b.floor + 6) y = b.floor + 6;
        ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot + b.vr * age); ctx.globalAlpha = Math.min(1, (1 - q) * 2.2);
        poly(ctx, [b.len, 0, 0, b.wid, -b.len * 0.4, 0, 0, -b.wid], rgba(b.col, 0.85), rgba('#07131f', 0.8), 1);
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------------------------------------------------------------------ the frost shell and the coffin
  // a column of ice round a hero's whole height, pale blue with a dark edge, held steady; it grows from the floor and shatters when it lets go
  function shellDraw(ctx, x, y, k, t, seed) {
    const H = 100 * k, W = 25 + 3 * (1 - k);
    ctx.save(); ctx.translate(x, y);
    ellipse(ctx, 0, 4, 31, 12, 0, rgba('#bfe8ff', 0.22 * k), rgba('#eaf8ff', 0.55 * k), 1.4);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + seed, l = 6 + hs(i, seed) * 9; line(ctx, Math.cos(a) * 28, 4 + Math.sin(a) * 11, Math.cos(a) * (28 + l), 4 + Math.sin(a) * (11 + l * 0.4), rgba('#eaf8ff', 0.6 * k), 1.6); }
    const pts = [-W, 3, -W * 1.08, -H * 0.3, -W * 0.86, -H * 0.88, -W * 0.34, -H, W * 0.3, -H * 0.97, W * 0.88, -H * 0.86, W * 1.08, -H * 0.3, W, 3, 0, 9];
    const g = ctx.createLinearGradient(-W, 0, W, 0); g.addColorStop(0, 'rgba(205,238,255,0.4)'); g.addColorStop(0.5, 'rgba(150,205,240,0.2)'); g.addColorStop(1, 'rgba(80,140,195,0.3)');
    poly(ctx, pts, g, 'rgba(6,16,30,0.85)', 2.6);
    ctx.save(); ctx.scale(0.93, 1); ctx.translate(0, 0);
    tracePath(ctx, pts); ctx.closePath(); ctx.strokeStyle = rgba(C.frostH, 0.55 * k); ctx.lineWidth = 1.1; ctx.stroke(); ctx.restore();
    // facets, a streak of light, and the frost grown inside at its foot
    line(ctx, -W * 0.38, -H * 0.05, -W * 0.34, -H * 0.94, rgba('#ffffff', 0.4 * k), 1.2); line(ctx, W * 0.34, -H * 0.05, W * 0.3, -H * 0.92, rgba('#ffffff', 0.18 * k), 1);
    poly(ctx, [-W * 0.86, -H * 0.88, -W * 0.34, -H, W * 0.3, -H * 0.97, 0, -H * 0.84], rgba('#ffffff', 0.32 * k));
    ctx.save(); ctx.globalAlpha = k; for (let i = 0; i < 5; i++) { const rr = rng(seed * 100 + i); fern(ctx, (i - 2) * W * 0.4, -2, -Math.PI / 2 + (i - 2) * 0.32, 26 + hs(i, seed) * 18, rr, '#ffffff', 0.4, 1); } ctx.restore();
    add(ctx, () => { glow(ctx, 0, -H * 0.5, 44, C.frost, 0.12 * k); for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3 + seed) % 1; glow(ctx, (hs(i, seed + 2) - 0.5) * W * 1.4, -H * q, 5, '#ffffff', 0.5 * Math.sin(q * Math.PI) * k); } });
    ctx.restore();
  }
  // the coffin: a block of ice with a flat lid round the sealed hero, whiter and more solid than the shell, cracking as its health goes
  function coffinDraw(ctx, x, y, hp, t, seed) {
    const W = 33, H = 104, dmg = 1 - hp;
    ctx.save(); ctx.translate(x, y);
    ellipse(ctx, 6, 8, 44, 16, 0, 'rgba(0,0,0,0.35)');
    const body = [-W, 4, -W, -H * 0.82, -W * 0.7, -H, W * 0.7, -H, W, -H * 0.82, W, 4, 0, 10];
    const g = ctx.createLinearGradient(-W, 0, W, 0); g.addColorStop(0, 'rgba(225,244,255,0.62)'); g.addColorStop(0.5, 'rgba(180,222,248,0.46)'); g.addColorStop(1, 'rgba(120,170,215,0.54)');
    poly(ctx, body, g, 'rgba(5,14,26,0.9)', 3);
    poly(ctx, [-W * 0.7, -H, W * 0.7, -H, W * 0.55, -H * 0.9, -W * 0.55, -H * 0.9], rgba('#ffffff', 0.55));   // the lid
    line(ctx, -W + 5, -H * 0.1, -W + 5, -H * 0.8, rgba('#ffffff', 0.5), 1.5); line(ctx, 0, -H * 0.9, 0, -4, rgba('#ffffff', 0.15), 1);
    // the cracks come in as it takes damage
    const nCr = Math.floor(dmg * 8) + (dmg > 0.02 ? 1 : 0);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < nCr; i++) {
      const rr = rng(seed * 17 + i * 5), p = walk(rr, (rr() - 0.5) * W * 1.4, -H * (0.2 + rr() * 0.6), rr() * TAU, 3 + (rr() * 3 | 0), 11, 1.6);
      trace(ctx, p); ctx.strokeStyle = 'rgba(8,20,36,0.85)'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.restore();
    add(ctx, () => { glow(ctx, 0, -H * 0.5, 54, C.frost, 0.14 + 0.2 * dmg); });
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------------------------ over the units
  const cloneSt = i => (S.clones[i] || (S.clones[i] = { t: 0, props: {} }));
  function over(ctx, room, t, env) {
    S.now = t;
    const ev = room.ev || {}, ent = env.entById, party = env.party || (S.raid && S.raid.party);
    // the Hood's own pull: a ring of frost goes out from where it stands; the second court's roof falls away upward
    const op = ev.hdopen;
    if (op && env.boss) {
      const u = t - op.start;
      if (op.gate !== 2 && u >= 0 && u < 3.2) add(ctx, () => { const q = u / 3.2, R = ARENA.R || 520; ctx.beginPath(); ctx.arc(env.boss.x, env.boss.y, 60 + q * R * 1.15, 0, TAU); ctx.strokeStyle = rgba(C.frost, 0.5 * (1 - q)); ctx.lineWidth = 10 * (1 - q) + 2; ctx.stroke(); });
      if (op.gate === 2 && u >= 0 && u < 3.4) roofFall(ctx, u);
    }
    // the copies of the Procession
    const cl = ev.hdclones;
    if (cl && cl.c && cl.c.length && (!(cl.dur > 0) || t < cl.end)) {
      const fin = clamp((t - cl.start) / 0.45, 0, 1), fout = cl.dur > 0 ? clamp((cl.end - t) / 0.3, 0, 1) : 1;
      cl.c.forEach(([x, y, face, eyes, blade], i) => {
        const st = cloneSt(i); st.t = t; st.props = { hdBlade: blade ? 1 : 0, hdEyes: eyes ? 1 : 0 }; st.moving = false;
        ctx.save(); ctx.globalAlpha = fin * fout; ctx.translate(x, y); ctx.scale(BODY_SCALE, BODY_SCALE); ellipse(ctx, 4, 10, 50, 40, 0, 'rgba(0,0,0,0.3)'); ctx.rotate(face || 0);
        HD_ART.body(ctx, st, face || 0, false); ctx.restore();
        if (fin < 1) add(ctx, () => glow(ctx, x, y - 50, 90 * (1 - fin) + 30, C.frost, 0.4 * (1 - fin)));
      });
    }
    // frost shells: every hero whose party debuffs hold frozen; forming from the floor up, shattering when it lets go
    if (party) {
      for (const [id, st] of party) {
        const on = st.alive && st.debuffs && st.debuffs.some(d => d[0] === 'frozen'), e = ent(id), rec = S.shell.get(id);
        const coffin = e && S.raid && [...S.raid.adds.values()].some(a => a.kind === 'coffin' && Math.hypot(a.x - e.x, a.y - e.y) < 50);
        if (on && !rec) { S.shell.set(id, { t0: t, x: e ? e.x : 0, y: e ? e.y : 0 }); }
        if (on && e) { const r2 = S.shell.get(id); r2.x = e.x; r2.y = e.y - (e.lift || 0); r2.coffin = coffin; if (!coffin) shellDraw(ctx, r2.x, r2.y, sm01(clamp((t - r2.t0) / 0.35, 0, 1)), t, id * 3.1); }
        if (!on && rec) { S.shell.delete(id); if (st.alive && !rec.coffin && t - rec.t0 > 0.1) { shatter(rec.x, rec.y, t, { n: 22, h: 70, sp: 190, len: 12, r1: 80 }); } }
      }
    }
    // coffins (adds of kind coffin): the block, and when one is gone it bursts where it stood
    if (S.raid) {
      const seen = new Set();
      for (const a of S.raid.adds.values()) if (a.kind === 'coffin') { seen.add(a.id); S.coffins.set(a.id, { x: a.x, y: a.y }); coffinDraw(ctx, a.x, a.y, a.mx > 0 ? clamp(a.hp / a.mx, 0, 1) : 1, t, a.id); }
      for (const [id, c] of S.coffins) if (!seen.has(id)) { S.coffins.delete(id); shatter(c.x, c.y, t, { n: 30, h: 80, sp: 240, len: 15, r1: 120 }); }
    }
    // light columns (Communion, Benediction) and the glow on the healer (Radiance)
    for (const k of ['hdcolumn', 'hdglow']) {
      const m = ev[k]; if (!m || t > m.end + 0.4 || !(m.dur > 0)) continue;
      const e = ent(m.id); if (!e) continue;
      const u = clamp((t - m.start) / m.dur, 0, 1), fo = clamp((m.end + 0.4 - t) / 0.4, 0, 1), x = e.x, y = e.y - (e.lift || 0);
      if (k === 'hdcolumn') column(ctx, x, y, u, fo, t); else glowAura(ctx, x, y, u, fo, t);
    }
    // shards in flight, from where the boss stood to where they land
    for (const s of S.shards) {
      const p = (t - s.t0) / s.land; if (p < 0 || p > 1.02) continue;
      shardFly(ctx, s, clamp(p, 0, 1), t);
      if (p >= 1 && !s.done) { s.done = true; shatter(s.x1, s.y1, t, { n: 14, h: 30, sp: 130, len: 8, gold: 0.5, r1: 100 }); shakeNow(4); }
    }
    bitsDraw(ctx, t);
  }
  function roofFall(ctx, u) {   // dark slabs rising out of the picture and a wash of frost: the roof leaving, never dark enough to hide anything
    const q = clamp(u / 3.4, 0, 1), a = 0.5 * (1 - sm01(clamp(u / 2.6, 0, 1))), R = ARENA.R || 520, cell = 300;
    ctx.save();
    for (let gy = -R * 1.3, j = 0; gy < R * 1.3; gy += cell, j++) for (let gx = -R * 1.3, i = 0; gx < R * 1.3; gx += cell, i++) {
      const h = hs(i * 7 + j, 3), dy = -(q * q * 700 + h * 120 * q), rot = (h - 0.5) * 0.25 * q, x = gx + cell / 2, y = gy + cell / 2 + dy;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a * (0.65 + 0.35 * h);
      poly(ctx, [-cell / 2 + 4, -cell / 2 + 4, cell / 2 - 4, -cell / 2 + 6, cell / 2 - 6, cell / 2 - 4, -cell / 2 + 8, cell / 2 - 6], '#070a10', 'rgba(150,200,230,0.5)', 2);
      ctx.restore();
      if (h > 0.45) add(ctx, () => { for (let k = 0; k < 4; k++) circle(ctx, x + (hs(k, i + j) - 0.5) * cell * 0.9, y + (hs(k, j + 5) - 0.5) * cell * 0.9 + q * 60, 1.8, rgba(C.frostH, 0.7 * a * 2 * (1 - q))); });
    }
    add(ctx, () => glow(ctx, 0, 0, R * 1.2, C.frost, 0.12 * Math.sin(q * Math.PI)));
    ctx.restore();
  }
  function column(ctx, x, y, u, fo, t) {
    const a = (0.25 + 0.75 * u * u) * fo, top = y - 760;
    add(ctx, () => {
      const g = ctx.createLinearGradient(0, top, 0, y); g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(0.5, rgba(C.frostH, 0.18 * a)); g.addColorStop(1, rgba('#ffffff', 0.5 * a));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 20, top); ctx.lineTo(x + 20, top); ctx.lineTo(x + 34, y); ctx.lineTo(x - 34, y); ctx.closePath(); ctx.fill();
      glow(ctx, x, y, 70, C.frostH, 0.5 * a); glow(ctx, x, y - 30, 40, '#ffffff', 0.4 * a);
      ctx.save(); ctx.translate(x, y + 2); ctx.scale(1, 0.4); ctx.beginPath(); ctx.arc(0, 0, 44 - 14 * u, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.7 * a); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      for (let i = 0; i < 9; i++) { const q = (t * 0.9 + i / 9) % 1, ox = (hs(i, 3) - 0.5) * 50; circle(ctx, x + ox * (1 - q * 0.3), y - 14 - (1 - q) * 520 * 0 - q * 0 - (1 - q) * 330, 1.4, rgba('#ffffff', 0.6 * a * Math.sin(q * Math.PI))); }
    });
  }
  function glowAura(ctx, x, y, u, fo, t) {
    const a = fo * (0.4 + 0.6 * Math.min(1, u * 3)), fl = 0.85 + 0.15 * Math.sin(t * 4);
    add(ctx, () => {
      glow(ctx, x, y - 44, 96, '#fff3cf', 0.28 * a * fl); glow(ctx, x, y - 44, 44, '#ffffff', 0.35 * a);
      for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + t * 0.6; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * 26, y - 44 + Math.sin(an) * 26); ctx.lineTo(x + Math.cos(an) * 70, y - 44 + Math.sin(an) * 70); ctx.strokeStyle = rgba('#fff0c0', 0.35 * a); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); }
      ctx.save(); ctx.translate(x, y + 2); ctx.scale(1, 0.4); ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.strokeStyle = rgba('#fff0c0', 0.5 * a); ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
    });
  }
  function shardFly(ctx, s, p, t) {
    const q = easeOut(p), x = lerp(s.x0, s.x1, q), gy = lerp(s.y0, s.y1, q), z = Math.sin(p * Math.PI) * 150 + 40 * (1 - p), y = gy - z;
    const ang = Math.atan2(s.y1 - s.y0, s.x1 - s.x0) + (1 - p) * 2.4 + t * 6;
    // the trail: frost motes where it was
    add(ctx, () => { for (let i = 1; i <= 7; i++) { const pq = clamp(p - i * 0.018, 0, 1), qq = easeOut(pq), tx = lerp(s.x0, s.x1, qq), ty = lerp(s.y0, s.y1, qq) - (Math.sin(pq * Math.PI) * 150 + 40 * (1 - pq)); glow(ctx, tx, ty, 12 - i, C.frostH, 0.28 * (1 - i / 8)); } glow(ctx, x, y, 34, C.gold, 0.3); });
    ellipse(ctx, x, gy + 4, 14 * (1 - z / 260), 5 * (1 - z / 260), 0, 'rgba(0,0,0,0.3)');   // its shadow on the floor
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    poly(ctx, [40, 0, 6, 12, -22, 0, 6, -12], '#cfeaff', C.gold, 2.4); poly(ctx, [40, 0, 6, 4.5, -10, 0, 6, -4.5], rgba('#ffffff', 0.85));
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------------------------ the telegraph tells
  // boss-tells.js get() asks HD_FX.tell(tag). Each tell paints inside the outline the shared code draws (red for damage, blue for a stack or a guard):
  // a share of health gets a frost fill, a fixed hit a hot red one, and nothing is painted to say where it is safe.
  const T = {};
  const R_ = () => ARENA.R || 520;
  function sample(s, u, v) {   // a point inside a shape (roughly), u and v 0..1
    switch (s.kind) {
      case 'circle': { const a = u * TAU, r = Math.sqrt(v) * s.r * 0.94; return [s.x + Math.cos(a) * r, s.y + Math.sin(a) * r]; }
      case 'donut': { const a = u * TAU, r = s.r2 + (s.r - s.r2) * v; return [s.x + Math.cos(a) * r, s.y + Math.sin(a) * r]; }
      case 'cone': { const a = s.angle + (u - 0.5) * s.arc * 0.9, r = s.r * (0.1 + 0.88 * v); return [s.x + Math.cos(a) * r, s.y + Math.sin(a) * r]; }
      case 'rect': { const c = Math.cos(s.angle), sn = Math.sin(s.angle), l = Math.min(s.len, R_() * 2.2) * v, w = (u - 0.5) * s.w * 0.9; return [s.x + c * l - sn * w, s.y + sn * l + c * w]; }
      default: { const a = u * TAU, r = Math.sqrt(v) * R_() * 0.92; return [Math.cos(a) * r, Math.sin(a) * r]; }
    }
  }
  const lateOf = (tg, p) => clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1);
  const lane = (ctx, s, fn) => { ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.translate(s.x, s.y); ctx.rotate(s.angle); fn(Math.min(s.len, R_() * 2.3), s.w / 2); ctx.restore(); };
  // frost inside a share-of-health hit: a pale wash, flakes drifting in it, brighter as it lands
  function pctFill(ctx, tg, s, p, k, t, n = 14) {
    const late = lateOf(tg, p);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ctx.fillStyle = rgba(C.frost, (0.06 + 0.1 * p + 0.1 * late) * k); ctx.fillRect(-3000, -3000, 6000, 6000);
    const list = [];
    for (let i = 0; i < n; i++) { const [x, y] = sample(s, hs(i, tg.id), hs(i, tg.id + 3)); list.push([x + Math.sin(t * 0.8 + i) * 4, y + ((t * 9 + i * 7) % 14) - 7, 4 + hs(i, 5) * 5, t * 0.3 + i]); }
    flakes(ctx, list, C.frostH, (0.3 + 0.4 * p) * k);
    ctx.restore();
  }
  // a hot red wash for a fixed hit: a red tint, a hatch across it, a rim of heat where it lands
  function hotFill(ctx, tg, s, p, k, t) {
    const late = lateOf(tg, p);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ctx.fillStyle = rgba('#ff2a1a', (0.07 + 0.12 * p + 0.12 * late) * k); ctx.fillRect(-3000, -3000, 6000, 6000);
    ctx.strokeStyle = rgba('#ff7a5a', (0.1 + 0.18 * p) * k); ctx.lineWidth = 1.4; ctx.beginPath();
    const R = R_(); for (let d = -R * 2; d < R * 2; d += 22) { ctx.moveTo(d - t * 8 % 22, -R * 1.2); ctx.lineTo(d - t * 8 % 22 + R * 1.2, R * 1.2); }
    ctx.stroke();
    ctx.restore();
  }
  const pct = extra => ({ ground(ctx, tg, s, p, k, t, env) { pctFill(ctx, tg, s, p, k, t); if (extra) extra(ctx, tg, s, p, k, t, env); } });
  const fixed = extra => ({ ground(ctx, tg, s, p, k, t, env) { hotFill(ctx, tg, s, p, k, t); if (extra) extra(ctx, tg, s, p, k, t, env); } });
  const rim = (ctx, s, col, a, lw = 1.4) => { SHAPES.trace(ctx, s); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.stroke(); };
  // the whole room as the warning (a raidwide): a wash from the walls, rings from the middle
  function roomWash(ctx, p, k, t, col, hi, ringFrom) {
    const R = R_(), g = ctx.createRadialGradient(0, 0, R * 0.25, 0, 0, R * 1.02); g.addColorStop(0, rgba(col, 0.02 * k)); g.addColorStop(1, rgba(col, (0.14 + 0.2 * p) * k));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.05, 0, TAU); ctx.fill();
    for (let i = 0; i < 3; i++) { const q = (p * 1.4 + i / 3 + t * 0.05) % 1; ctx.beginPath(); ctx.arc(ringFrom ? ringFrom.x : 0, ringFrom ? ringFrom.y : 0, R * (0.15 + q * 0.95), 0, TAU); ctx.strokeStyle = rgba(hi, 0.3 * (1 - q) * k * (0.4 + p)); ctx.lineWidth = 2; ctx.stroke(); }
  }
  const bossAt = env => (env && env.boss ? { x: env.boss.x, y: env.boss.y } : null);

  // ---- share-of-health tells (frost inside)
  T.hdCone = pct((ctx, tg, s, p, k, t) => {   // Pale Waltz's cones: lines of cold fanning from the hand
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const grow = easeOut(clamp(p / 0.55, 0, 1));
    for (let i = 0; i <= 8; i++) { const a = s.angle + (i / 8 - 0.5) * s.arc * 0.96; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * s.r * grow, s.y + Math.sin(a) * s.r * grow); ctx.strokeStyle = rgba(C.frostH, (i % 4 === 0 ? 0.5 : 0.22) * k); ctx.lineWidth = i % 4 === 0 ? 1.8 : 1; ctx.stroke(); }
    glow(ctx, s.x + Math.cos(s.angle) * s.r * grow, s.y + Math.sin(s.angle) * s.r * grow, 40, C.frostH, 0.2 * k);
    ctx.restore();
  });
  T.hdBreath = pct((ctx, tg, s, p, k, t) => {   // Cold Breath: mist drifting out along the cone
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    for (let i = 0; i < 9; i++) { const q = ((t * 0.5 + i / 9) % 1), a = s.angle + (hs(i, tg.id) - 0.5) * s.arc * 0.8; glow(ctx, s.x + Math.cos(a) * s.r * (0.1 + 0.9 * q), s.y + Math.sin(a) * s.r * (0.1 + 0.9 * q), 24 + 30 * q, '#cfe9ff', 0.18 * k * Math.sin(q * Math.PI)); }
    ctx.restore();
  });
  T.hdCircle = pct((ctx, tg, s, p, k, t) => {   // the Waltz's circle on a hero: a ring closing, motes of light turning in it
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - 0.7 * easeOut(p)), 0, TAU); ctx.strokeStyle = rgba(C.frostH, 0.55 * k); ctx.lineWidth = 1.6; ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = t * 1.2 + i * TAU / 6; circle(ctx, s.x + Math.cos(a) * s.r * 0.55, s.y + Math.sin(a) * s.r * 0.55, 1.8, rgba('#ffffff', 0.7 * k)); }
    glow(ctx, s.x, s.y, s.r * 0.8, C.frostH, 0.12 * k);
    ctx.restore();
  });
  T.hdHunt = pct((ctx, tg, s, p, k, t) => {   // Pursuit: chevrons closing on the mark, a cross-hair
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 0.3, q = (1 - ((t * 0.9 + i / 8) % 1)), r0 = s.r * (0.25 + 0.7 * q); const x = s.x + Math.cos(a) * r0, y = s.y + Math.sin(a) * r0; ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI); ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(1, 0); ctx.lineTo(-5, 4); ctx.strokeStyle = rgba(C.frostH, 0.55 * k * q); ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = rgba('#ffffff', (0.3 + 0.4 * p) * k); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s.x - s.r * 0.35, s.y); ctx.lineTo(s.x + s.r * 0.35, s.y); ctx.moveTo(s.x, s.y - s.r * 0.35); ctx.lineTo(s.x, s.y + s.r * 0.35); ctx.stroke();
    ctx.restore();
  });
  const blade = (gold) => (ctx, tg, s, p, k, t) => lane(ctx, s, (L, hw) => {   // a blade line: a hair of light down the lane and chevrons running down it
    const X = L * easeOut(clamp(p / 0.4, 0, 1)), col = gold ? C.goldH : C.frostH;
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(X, 0); ctx.strokeStyle = rgba('#04080e', 0.45 * k); ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = rgba(gold ? C.gold : C.frost, (0.4 + 0.4 * p) * k); ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', (0.6 + 0.4 * p) * k); ctx.lineWidth = 1.2; ctx.stroke();
    for (let i = 0, n = Math.max(2, Math.round(L / 100)); i < n; i++) { const x = ((i / n) * L + t * (150 + 420 * p)) % L; if (x < X) { ctx.beginPath(); ctx.moveTo(x - 11, -hw * 0.32); ctx.lineTo(x, 0); ctx.lineTo(x - 11, hw * 0.32); ctx.strokeStyle = rgba(col, (0.3 + 0.5 * p) * k); ctx.lineWidth = 2; ctx.stroke(); } }
    glow(ctx, X, 0, 26 + 14 * p, col, (0.25 + 0.4 * p) * k); glow(ctx, 30, 0, 36, col, 0.14 * k);
  });
  T.hdLine = pct(blade(false));
  T.hdDive = pct(blade(true));
  T.hdBeam = pct((ctx, tg, s, p, k, t) => lane(ctx, s, (L, hw) => {   // the beam from the open palm: a long soft bar of white light
    const f = 0.8 + 0.2 * Math.sin(t * 9);
    const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba('#ffffff', 0.34 * k * f)); g.addColorStop(1, rgba(C.frostH, 0.12 * k)); ctx.fillStyle = g; ctx.fillRect(0, -hw * 0.5, L, hw);
    ctx.strokeStyle = rgba('#ffffff', 0.85 * k); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
    for (let i = 0; i < 5; i++) glow(ctx, ((t * 0.7 + i / 5) % 1) * L, 0, 22, '#ffffff', 0.35 * k);
  }));
  T.hdRay = pct((ctx, tg, s, p, k, t) => lane(ctx, s, (L, hw) => {   // a ray out of the glowing hero: white-gold
    const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba('#fff6d8', 0.4 * k)); g.addColorStop(1, rgba(C.gold, 0.1 * k)); ctx.fillStyle = g; ctx.fillRect(0, -hw * 0.55, L, hw * 1.1);
    ctx.strokeStyle = rgba('#fff6d8', 0.9 * k); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
    for (let i = 0; i < 4; i++) glow(ctx, ((t * 0.9 + i / 4) % 1) * L, 0, 18, '#fff0c0', 0.4 * k);
  }));
  T.hdFlare = pct((ctx, tg, s, p, k, t) => {   // the Following Light's flare: rays out of a white heart
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + t * 0.4; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * s.r * 0.15, s.y + Math.sin(a) * s.r * 0.15); ctx.lineTo(s.x + Math.cos(a) * s.r * (i % 2 ? 0.7 : 1), s.y + Math.sin(a) * s.r * (i % 2 ? 0.7 : 1)); ctx.strokeStyle = rgba('#fff6d8', 0.5 * k); ctx.lineWidth = 1.6; ctx.stroke(); }
    glow(ctx, s.x, s.y, s.r * 0.8, '#fff6d8', (0.2 + 0.4 * p) * k); ctx.restore();
  });
  T.hdSermon = pct((ctx, tg, s, p, k, t) => lane(ctx, s, (L, hw) => {   // a cold shadow thrown away from a pillar
    ctx.fillStyle = rgba('#050c18', (0.2 + 0.2 * p) * k); ctx.fillRect(0, -hw, L, hw * 2);
    for (let i = 0; i < 6; i++) fern(ctx, (i / 6) * L * 0.9, (hs(i, tg.id) - 0.5) * hw, (hs(i, 2) - 0.5) * 1.2, 40, rng(i + tg.id), '#cfe9ff', 0.35 * k, 1);
    ctx.strokeStyle = rgba(C.frostH, 0.5 * k); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
  }));
  T.hdBladeHalf = pct((ctx, tg, s, p, k, t) => {   // the blade half: slashes across it
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.strokeStyle = rgba(C.frostH, (0.18 + 0.2 * p) * k); ctx.lineWidth = 1.6; ctx.beginPath();
    const R = R_(); for (let d = -R * 2; d < R * 2; d += 46) { ctx.moveTo(d + (t * 12 % 46), -R); ctx.lineTo(d + R * 0.7 + (t * 12 % 46), R); } ctx.stroke(); ctx.restore();
  });
  T.hdLightHalf = pct((ctx, tg, s, p, k, t) => {   // the light half: soft rays and motes
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const c = sample(s, 0.5, 0.5); for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + t * 0.06; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.cos(a) * R_() * 1.3, c[1] + Math.sin(a) * R_() * 1.3); ctx.strokeStyle = rgba('#fff6d8', 0.1 * k); ctx.lineWidth = 3; ctx.stroke(); }
    glow(ctx, c[0], c[1], R_() * 0.6, '#fff6d8', (0.08 + 0.1 * p) * k); ctx.restore();
  });
  // raidwide shares: frost creeping in from the walls
  T.hdHollow = { raidwide: true, ground(ctx, tg, s, p, k, t, env) { roomWash(ctx, p, k, t, C.frost, C.frostH, bossAt(env)); } };
  T.hdBenediction = T.hdBenedict = { raidwide: true, ground(ctx, tg, s, p, k, t, env) {   // a column of light from the halo: the whole floor lit, the pillars' shadows cut out by the shared code
    const R = R_(), f = 0.85 + 0.15 * Math.sin(t * 3); ctx.fillStyle = rgba('#fff6d8', (0.08 + 0.12 * p) * k * f); ctx.beginPath(); ctx.arc(0, 0, R * 1.05, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(C.frostH, 0.05 * k); ctx.fill();
    if (tg.cover) glow(ctx, tg.cover[0], tg.cover[1], 90, '#fff6d8', 0.35 * k);
  } };

  // ---- fixed-hit tells (red inside)
  T.hdRing = fixed((ctx, tg, s, p, k, t) => {   // the ring round the boss: rings of heat going out
    for (let i = 0; i < 3; i++) { const q = (p * 1.5 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, lerp(s.r2, s.r, q), 0, TAU); ctx.strokeStyle = rgba('#ff9a7a', 0.4 * (1 - q) * k); ctx.lineWidth = 2; ctx.stroke(); }
  });
  T.hdEcho = fixed((ctx, tg, s, p, k, t) => lane(ctx, s, (L, hw) => {   // the echo down the line: streaks of the blade running back toward its start
    for (let i = 0; i < 5; i++) { const q = (1 - ((t * 0.9 + i / 5) % 1)); ctx.strokeStyle = rgba('#ffb09a', 0.5 * k * (1 - q)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(L * q, -hw * 0.5); ctx.lineTo(L * q - 24, 0); ctx.lineTo(L * q, hw * 0.5); ctx.stroke(); }
    ctx.strokeStyle = rgba('#ffe0d6', 0.5 * k); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
  }));
  T.hdSermonEcho = T.hdEcho;
  T.hdShatter = fixed((ctx, tg, s, p, k, t) => {   // cracks running out of the frozen hero
    const rr = rng(tg.id * 7 + 1); ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const pts = walk(rr, s.x, s.y, i * TAU / 9 + rr() * 0.4, 4, s.r * 0.26 * easeOut(clamp(p * 1.6, 0, 1)), 1.3); trace(ctx, pts); ctx.strokeStyle = rgba('#ffe6dc', 0.7 * k); ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.restore();
  });
  T.hdToll = fixed((ctx, tg, s, p, k, t) => {   // the last toll: ripples going out from a bell
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * q, 0, TAU); ctx.strokeStyle = rgba('#ffb09a', 0.5 * (1 - q) * k); ctx.lineWidth = 2; ctx.stroke(); }
    circle(ctx, s.x, s.y, 5, rgba('#ffe0d6', 0.6 * k));
  });
  T.hdBurial = fixed((ctx, tg, s, p, k, t) => {   // a lid closing over the sealed hero
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.1, s.x, s.y, s.r); g.addColorStop(0, rgba('#02060c', 0.55 * p * k)); g.addColorStop(1, rgba('#02060c', 0)); ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); ctx.restore();
  });
  T.hdCalmBreak = T.hdShatter;   // (the cut hero's fixed hit: the same cracks)
  T.hdFall = fixed((ctx, tg, s, p, k, t) => {   // frostfall: icicles falling in
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    for (let i = 0; i < 10; i++) { const [x, y] = sample(s, hs(i, tg.id), hs(i, tg.id + 2)), q = (t * 1.1 + i * 0.37) % 1; line(ctx, x, y - 24 * (1 - q) - 8, x, y - 24 * (1 - q) + 4, rgba('#ffd6c8', 0.7 * k * q), 1.8); }
    ctx.restore();
  });
  T.hdShard = fixed((ctx, tg, s, p, k, t) => {   // a shard coming down: its shadow growing on the floor
    const q = easeOut(p); ellipse(ctx, s.x, s.y, s.r * (0.2 + 0.5 * q), s.r * (0.2 + 0.5 * q), 0, rgba('#02060c', 0.4 * k)); glow(ctx, s.x, s.y, s.r * 0.6, C.gold, 0.14 * k);
    poly(ctx, [s.x, s.y - 20, s.x + 6, s.y, s.x, s.y + 20, s.x - 6, s.y], rgba(C.goldH, 0.35 * k * q), rgba(C.gold, 0.7 * k), 1);
  });
  T.hdReturn = fixed((ctx, tg, s, p, k, t) => {   // the way back: gold running along it
    glow(ctx, s.x, s.y, s.r * 0.9, C.gold, 0.14 * k); for (let i = 0; i < 4; i++) { const a = t * 2 + i * TAU / 4; circle(ctx, s.x + Math.cos(a) * s.r * 0.5, s.y + Math.sin(a) * s.r * 0.5, 1.6, rgba(C.goldH, 0.7 * k)); }
  });
  T.hdAfterglow = fixed((ctx, tg, s, p, k, t) => { for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - q), 0, TAU); ctx.strokeStyle = rgba('#fff0c0', 0.6 * q * k); ctx.lineWidth = 2.4; ctx.stroke(); } glow(ctx, s.x, s.y, s.r * 0.7, '#fff6d8', 0.25 * k * p); });
  T.hdAsh = fixed((ctx, tg, s, p, k, t) => {   // Ash Landing: ash falling, the middle going dark
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r); g.addColorStop(0, rgba('#0a0a0e', 0.4 * p * k)); g.addColorStop(1, rgba('#0a0a0e', 0)); ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    for (let i = 0; i < 16; i++) { const [x, y] = sample(s, hs(i, tg.id), hs(i, 6)), q = (t * 0.6 + i * 0.19) % 1; circle(ctx, x + Math.sin(t + i) * 6, y - 30 * (1 - q), 1.6, rgba('#d6d0c8', 0.6 * k * q)); } ctx.restore();
  });
  T.hdPillarBurst = fixed((ctx, tg, s, p, k, t) => { for (let i = 0; i < 2; i++) { const q = (p * 1.6 + i / 2) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * q, 0, TAU); ctx.strokeStyle = rgba('#ffb09a', 0.5 * (1 - q) * k); ctx.lineWidth = 2; ctx.stroke(); } });
  // raidwide fixed hits: heat in from the walls, rings from the middle (the heavier the hit, the heavier the wash)
  const wide = (w) => ({ raidwide: true, ground(ctx, tg, s, p, k, t, env) { roomWash(ctx, p, k * w, t, '#ff2a1a', '#ff9a7a', bossAt(env)); } });
  T.hdWaltzEnd = wide(0.9); T.hdBurst = wide(1); T.hdHollowEcho = wide(1); T.hdWeigh = wide(1);
  T.hdVerdict = { raidwide: true, ground(ctx, tg, s, p, k, t, env) { roomWash(ctx, p, k * 1.25, t, '#ff2a1a', '#ffd0c0', bossAt(env)); const late = lateOf(tg, p); if (late > 0) { ctx.fillStyle = rgba('#ffffff', 0.18 * late * k * (0.5 + 0.5 * Math.sin(t * 24))); ctx.beginPath(); ctx.arc(0, 0, R_() * 1.05, 0, TAU); ctx.fill(); } } };
  T.hdAbsolve = { raidwide: true, ground(ctx, tg, s, p, k, t) {   // Absolution: the lit floor going red as it lands
    const R = R_(); ctx.fillStyle = rgba('#fff0c0', 0.08 * k); ctx.beginPath(); ctx.arc(0, 0, R * 1.05, 0, TAU); ctx.fill(); ctx.fillStyle = rgba('#ff2a1a', (0.06 + 0.16 * p) * k); ctx.fill();
  } };
  T.hdWingbeat = { raidwide: true, ground(ctx, tg, s, p, k, t, env) {   // Wingbeat: wind going out from the boss to the walls, in arcs
    const b = bossAt(env) || { x: 0, y: 0 }, R = R_();
    for (let i = 0; i < 3; i++) { const q = (p * 1.3 + i / 3) % 1; ctx.beginPath(); ctx.arc(b.x, b.y, 60 + q * R * 1.2, 0, TAU); ctx.setLineDash([46, 30]); ctx.lineDashOffset = -t * 90; ctx.strokeStyle = rgba('#e6f4ff', 0.34 * (1 - q) * k); ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
  } };

  // ---- rings and marks that hit nobody (a lantern, a calm) and the blue ones (a guard, a stack)
  T.hdLantern = { ground(ctx, tg, s, p, k, t) {   // a lantern hung over the hero: a warm light and its swinging shadow
    const f = 0.85 + 0.15 * Math.sin(t * 7), sw = Math.sin(t * 1.4) * 5;
    glow(ctx, s.x, s.y, s.r * 1.1, '#fff0c0', 0.22 * k * f); glow(ctx, s.x, s.y, s.r * 0.45, '#ffffff', 0.3 * k);
    ctx.save(); ctx.globalAlpha = k; line(ctx, s.x + sw, s.y - 60, s.x + sw, s.y - 20, '#05040a', 2.4); rrect(ctx, s.x + sw - 6, s.y - 20, 12, 15, 3, '#2a2530', '#05040a', 1.6); rrect(ctx, s.x + sw - 3.5, s.y - 17, 7, 9, 2, rgba('#fff0c0', 0.95)); ctx.restore();
  } };
  T.hdGuard = { color: C.blue, ground(ctx, tg, s, p, k, t) {   // a guard ring: three brackets turning round it, a blue shimmer inside
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.fillStyle = rgba('#3d8bff', (0.08 + 0.08 * p) * k); ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); ctx.restore();
    ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = t * 0.9 + i * TAU / 3; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.72, a, a + 0.9); ctx.strokeStyle = rgba('#b4d4ff', 0.75 * k); ctx.lineWidth = 3; ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const q = (t * 0.6 + i / 6) % 1, a = i * TAU / 6; circle(ctx, s.x + Math.cos(a) * s.r * (1 - q) * 0.9, s.y + Math.sin(a) * s.r * (1 - q) * 0.9, 1.6, rgba('#d8e8ff', 0.7 * q * k)); }
  } };
  T.hdCalm = { ground(ctx, tg, s, p, k, t) {   // dead calm: a ring of frost settling toward the hero, everything still
    const q = easeOut(p); ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - 0.72 * q), 0, TAU); ctx.strokeStyle = rgba(C.frostH, 0.75 * k); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - 0.72 * q) * 0.82, 0, TAU); ctx.strokeStyle = rgba(C.frost, 0.3 * k); ctx.lineWidth = 1.2; ctx.stroke();
    glow(ctx, s.x, s.y, s.r, C.frost, 0.1 * k); ctx.restore();
  } };
  T.hdFollow = { ground(ctx, tg, s, p, k, t) {   // the slow light: a white heart in a soft halo
    const f = 0.85 + 0.15 * Math.sin(t * 5); glow(ctx, s.x, s.y, s.r * 1.5, '#fff6d8', 0.28 * k * f); glow(ctx, s.x, s.y, s.r * 0.6, '#ffffff', 0.5 * k);
    for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * TAU / 6; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * s.r * 0.6, s.y + Math.sin(a) * s.r * 0.6); ctx.lineTo(s.x + Math.cos(a) * s.r * 1.05, s.y + Math.sin(a) * s.r * 1.05); ctx.strokeStyle = rgba('#fff0c0', 0.5 * k); ctx.lineWidth = 1.6; ctx.stroke(); }
  } };
  T.hdCommune = { ground(ctx, tg, s, p, k, t) {   // the ring of light round the healer (a stack: blue from the shared code): a soft column rising in it
    glow(ctx, s.x, s.y, s.r * 0.9, C.frostH, (0.1 + 0.14 * p) * k);
    for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - q) * 0.95, 0, TAU); ctx.strokeStyle = rgba('#d8ecff', 0.4 * q * k); ctx.lineWidth = 2; ctx.stroke(); }
    for (let i = 0; i < 10; i++) { const q = (t * 0.45 + i / 10) % 1, a = hs(i, tg.id) * TAU, d = hs(i, 4) * s.r * 0.8; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 40, 1.5 * (1 - q), rgba('#ffffff', 0.7 * (1 - q) * k)); }
  } };

  return { tell: tag => T[tag] || null, props, frostHit, shatter, shatterPillar, draw: { shell: shellDraw, coffin: coffinDraw, shard: shardFly, column, aura: glowAura, bits: bitsDraw }, setNow: t => { S.now = t; } };
})();
