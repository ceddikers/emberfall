// Brannoc the Undefeated: how every move of his looks on the floor and when it lands. His body, rooms and props live in brannoc-art.js
// and arena-view.js; this file is the moves: the bank shot (every thrown path painted bounce by bounce, the Sunwheel itself and
// Breaker's wave travelling along it: ArenaView.drawZones / drawRoomOver hand over), the warnings painted inside the red and blue
// outlines (boss-tells.js get() / buster), the Sand Furrow's churned zone (ArenaView.drawZones), what each move does when it lands
// and what it leaves behind (boss-vfx.js impact(), boss-tells.js track()), the leap and the crush (propfx), the Tide Rises (the
// colosseum flooding and breaking apart: drawRoomOver), and the enrage, entrance and fall. Loaded after brannoc-art.js; the other
// files reach it through BR_FX and every call is guarded by `typeof BR_FX !== 'undefined'`.
// The rule as everywhere: the red (or blue) outline marks the exact area and is drawn by boss-tells.js; what is painted inside is the
// clue, and safe floor is never painted. The look follows the painted sheets (docs/art/vfx-reference/brannoc-*.png): wet sand and
// sea teal, bronze and blazing gold for the Sunwheel, pale ghost-green for the crowd, red banner cloth, gold-orange bounce paths with
// a bright star at each bounce, blue catch rings.
// The beat on top (all cosmetic, nothing here changes who is hit): the wheel winds up in his hand and leaves it with a burst; a bounce
// off a stone rings differently from one off the rim; the ghost crowd gasps at each bounce and roars at a catch.

const BR_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeIn = q => q * q;
  const easeIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q));
  const C = {
    gold: '#ffc23a', goldHi: '#fff0a8', amber: '#ff9a2a', bronze: '#b07a2a', bronzeDk: '#5a3a12', ink: '#0a1a1e',
    sea: '#2aa6b0', seaDeep: '#06303a', foam: '#e8fbff', spray: '#9fe8f0', sand: '#cdb283', wet: '#5a4a30', wetDk: '#2a2014',
    ghost: '#8ff5c8', ghostHi: '#d8fff0', banner: '#c4222a', bannerDk: '#6a0f16', catch: '#4a9bff', catchHi: '#bcd8ff', silver: '#e8f4ff',
  };
  const AR = () => ARENA.R;
  const clipRoom = c => { ARENA.trace(c, 4); c.clip(); };
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  // what the moves remember between frames: when the camera last held, the bounces a wheel has already struck, the tide's one-shots
  const S = { camAt: -99, fired: new Set(), spray: {}, tide: null, bell: null };
  const evs = () => (typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.ev) || {};
  // the camera holds for a beat when something big lands (the existing hook: main.js FX.cam); never more than once in a few seconds
  function cam(stop = 0.1, punch = 0.035, dur = 0.5, gap = 3) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };
  const isMe = u => typeof Net !== 'undefined' && Net && u.id === Net.id;
  // a flash at the screen's edge and a small flinch of the camera, for the one at the keyboard only
  function flinch(col, a = 0.1, dur = 0.18, punch = 0.018) {
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.flash(col, a, dur); FX.cam.punch(punch, 0.32); } } catch (e) { /* cosmetic */ }
  }

  // ---------------------------------------------------------------- small painted pieces
  // a rect telegraph drawn in its own frame: x runs down the lane, y across it (full: the whole length, however long)
  function lane(ctx, s, fn, full) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    fn(full ? s.len : Math.min(s.len, AR() * 2.3), s.w / 2); ctx.restore();
  }
  // a four-pointed star (the bounce star): a glow, the long thin star, a short fat one over it
  function star4(c, x, y, r, rot, col, hi, k) {
    glow(c, x, y, r * 2.8, col, 0.5 * k);
    c.save(); c.translate(x, y); c.rotate(rot);
    for (const [R, w, f, a] of [[r * 1.7, 0.16, col, 0.85], [r, 0.3, hi, 1]]) {
      c.beginPath();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? R * w : R, an = i * Math.PI / 4; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(rr, 0); }
      c.closePath(); c.fillStyle = rgba(f, a * k); c.fill();
    }
    c.restore();
  }
  // a jagged path (added to the current one) from (x1, y1) to (x2, y2)
  function zigPath(ctx, x1, y1, x2, y2, seed, jag = 8, seg = 26) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / seg)), nx = -dy / L, ny = dx / L;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n, o = (hash(i, seed) - 0.5) * 2 * jag; ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
    ctx.lineTo(x2, y2);
  }
  // a crack in dry sand or stone: a dark edge, a pale body
  function crackLine(ctx, x1, y1, x2, y2, seed, k, o = {}) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); zigPath(ctx, x1, y1, x2, y2, seed, o.jag ?? 8, o.seg ?? 24);
    ctx.strokeStyle = rgba(o.ink || C.wetDk, 0.55 * k); ctx.lineWidth = (o.w || 2) + 2.4; ctx.stroke();
    ctx.strokeStyle = rgba(o.col || '#e8d8b0', k); ctx.lineWidth = o.w || 2; ctx.stroke();
    ctx.restore();
  }
  function crackStar(ctx, x, y, r, n, seed, k, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, seed) * 0.6, d = r * (0.55 + 0.45 * hash(i, seed + 1));
      crackLine(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * d, y + Math.sin(a) * d * (o.flat ?? 0.8), seed + i, k, { w: o.w || 1.8, jag: o.jag ?? 7, seg: 20, col: o.col });
    }
  }
  // water thrown up off a point
  function spray(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(60, o.speed || 220);
      VFX.spawn({ x, y, z: rand(4, 24), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(90, 260) * (o.up || 1), g: 560, drag: 0.02, life: rand(0.6, 1.1),
        size: rand(6, 12) * (o.size || 1), size1: 0, color: i % 3 ? C.foam : C.spray, kind: i % 2 ? 'drop' : 'glow', add: false, rot: a + Math.PI / 2 });
    }
  }
  // wet sand and grit thrown up off a point
  function sandUp(x, y, n, o = {}) {
    VFX.smoke(x, y, { n: Math.max(1, Math.round(n / 3)), color: C.sand, size: 34 * (o.size || 1), a: 0.55, speed: 120 * (o.speed || 1), r: o.r });
    VFX.debris(x, y, { color: '#9a7e50', n, speed: 1.1 * (o.speed || 1), size: o.size || 1 });
  }
  // the points of a path as a polyline with the length run so far, and a point a given distance along it
  function pathInfo(ev) {
    if (ev._br) return ev._br;
    const l = ev.l || [], cum = [0];
    for (let i = 1; i < l.length; i++) cum.push(cum[i - 1] + Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]));
    return (ev._br = { l, cum, L: cum[cum.length - 1] || 0 });
  }
  function atDist(P, d) {
    const l = P.l; if (l.length < 2) return { x: l[0] ? l[0][0] : 0, y: l[0] ? l[0][1] : 0, a: 0, i: 1 };
    d = clamp(d, 0, P.L); let i = 1; while (i < l.length - 1 && P.cum[i] < d) i++;
    const a = l[i - 1], b = l[i], seg = (P.cum[i] - P.cum[i - 1]) || 1, u = (d - P.cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, a: Math.atan2(b[1] - a[1], b[0] - a[0]), i };
  }
  // adds the stretch of the path between two distances to the current canvas path
  function tracePart(c, P, d0, d1) {
    d0 = clamp(d0, 0, P.L); d1 = clamp(d1, 0, P.L); if (d1 - d0 < 0.5) return;
    const p0 = atDist(P, d0); c.moveTo(p0.x, p0.y);
    for (let i = p0.i; i < P.l.length; i++) { if (P.cum[i] >= d1) break; if (P.cum[i] > d0) c.lineTo(P.l[i][0], P.l[i][1]); }
    const p1 = atDist(P, d1); c.lineTo(p1.x, p1.y);
  }
  // the speed a wheel (or wave) of this width is travelling at, read from the path that is up (the pieces of it land as it passes)
  function spFor(w, wave, t) {
    const e = evs();
    for (const k in e) if (k.startsWith('brpath:')) { const v = e[k]; if (t < v.end + 1 && Math.abs((v.w || 0) - w) < 3 && !!v.wave === !!wave) return v.sp || 900; }
    return wave ? 650 : 950;
  }
  const fadeOf = (ev, t) => clamp((t - ev.start) / 0.35, 0, 1) * clamp((ev.end - t) / 0.4, 0, 1);

  // ---------------------------------------------------------------- the Sunwheel
  // a bronze disc with a blazing gold rim, flung low over the sand; spin turns the sun-rays on its face
  function wheelDisc(c, x, y, r, spin, k, o = {}) {
    if (k <= 0.01) return;
    const lift = o.lift ?? r * 0.42;
    ellipse(c, x + r * 0.1, y + r * 0.5, r * 1.02, r * 0.34, 0, rgba('#000000', 0.3 * k));
    c.save(); c.translate(x, y - lift); c.scale(1, 0.88); c.globalAlpha = k;
    glow(c, 0, 0, r * 2.3, C.gold, 0.5);
    const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r);
    g.addColorStop(0, '#ffe9a0'); g.addColorStop(0.4, '#d9a23a'); g.addColorStop(1, '#6a3e0e');
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
    c.strokeStyle = '#2a1606'; c.lineWidth = Math.max(2, r * 0.07); c.stroke();
    // engraved rings and the sun-rays turning on its face
    c.strokeStyle = rgba('#3a2208', 0.7); c.lineWidth = Math.max(1.2, r * 0.03);
    for (const q of [0.78, 0.5]) { c.beginPath(); c.arc(0, 0, r * q, 0, TAU); c.stroke(); }
    c.save(); c.rotate(spin);
    const nr = 12;
    for (let i = 0; i < nr; i++) {
      const a = i * TAU / nr, w = TAU / nr * 0.22, r0 = r * 0.3, r1 = r * (i % 2 ? 0.62 : 0.76);
      c.beginPath(); c.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); c.closePath();
      c.fillStyle = rgba(i % 2 ? '#ffd36a' : '#fff0a8', 0.85); c.fill(); c.strokeStyle = rgba('#3a2208', 0.6); c.lineWidth = 1; c.stroke();
    }
    c.restore();
    // the boss at its heart
    const gc = c.createRadialGradient(-r * 0.06, -r * 0.08, 1, 0, 0, r * 0.26);
    gc.addColorStop(0, '#fff6c8'); gc.addColorStop(1, '#a8741c');
    c.beginPath(); c.arc(0, 0, r * 0.24, 0, TAU); c.fillStyle = gc; c.fill(); c.strokeStyle = '#2a1606'; c.lineWidth = Math.max(1.5, r * 0.04); c.stroke();
    // the blazing rim: a gold line burning over the dark edge
    c.globalCompositeOperation = 'lighter';
    c.beginPath(); c.arc(0, 0, r * 0.97, 0, TAU);
    c.strokeStyle = rgba(C.gold, 0.7); c.lineWidth = r * 0.16; c.stroke();
    c.strokeStyle = rgba(C.goldHi, 0.95); c.lineWidth = r * 0.05; c.stroke();
    c.restore();
  }
  // Breaker's wave: a rolling crest of water, a curved wall of foam with the sea heaped up behind it
  function crest(c, x, y, ang, w, t, k) {
    if (k <= 0.01) return;
    c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha = k;
    const hw = w / 2, back = 150;
    // the heaped water behind the crest
    const g = c.createLinearGradient(0, 0, -back, 0);
    g.addColorStop(0, rgba(C.foam, 0.65)); g.addColorStop(0.35, rgba(C.spray, 0.5)); g.addColorStop(1, rgba(C.sea, 0));
    c.beginPath(); c.moveTo(0, -hw);
    c.quadraticCurveTo(hw * 0.42, 0, 0, hw); c.lineTo(-back, hw * 0.85); c.lineTo(-back, -hw * 0.85); c.closePath();
    c.fillStyle = g; c.fill();
    // foam lines streaming back off it
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9 * 2 - 1, y0 = u * hw * 0.92, bow = (1 - u * u) * hw * 0.2, L = 50 + hash(i, 4) * 90;
      c.beginPath(); c.moveTo(bow - 6, y0); c.lineTo(bow - L, y0 + Math.sin(t * 6 + i) * 4);
      c.strokeStyle = rgba(C.foam, 0.45 + 0.3 * hash(i, 6)); c.lineWidth = 2 + hash(i, 7) * 2.4; c.stroke();
    }
    // the crest itself
    c.beginPath(); c.moveTo(0, -hw); c.quadraticCurveTo(hw * 0.42, 0, 0, hw);
    c.strokeStyle = rgba(C.seaDeep, 0.5); c.lineWidth = 14; c.stroke();
    c.strokeStyle = rgba(C.foam, 0.95); c.lineWidth = 7; c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2.4; c.stroke();
    for (let i = 0; i < 12; i++) { const u = (i + 0.5) / 12 * 2 - 1, cx = (1 - u * u) * hw * 0.2 + 2, cy = u * hw * 0.95; glow(c, cx, cy - 4 - hash(i, 9) * 8 * (0.5 + 0.5 * Math.sin(t * 9 + i)), 10 + hash(i, 8) * 8, '#ffffff', 0.6); }
    c.restore();
  }

  // ---------------------------------------------------------------- the bank shot (ArenaView.drawZones and drawRoomOver hand over)
  // The whole path, painted the moment it is sent: a dashed gold line with chevrons running the way it will go, a star at every bounce.
  // Ahead of the wheel it burns bright; behind it, it cools.
  function pathFloor(c, key, ev, t) {
    const P = pathInfo(ev); if (P.l.length < 2) return;
    const k = fadeOf(ev, t); if (k <= 0.01) return;
    const begin = ev.start + (ev.at || 0), d = clamp((t - begin) * (ev.sp || 900), 0, P.L), big = !!ev.big, wave = !!ev.wave;
    const col = wave ? C.spray : C.amber, hi = wave ? '#ffffff' : C.goldHi, glowc = wave ? C.sea : C.gold;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    // a broad faint ribbon under it, so the lane the wheel will plough reads as a whole
    c.beginPath(); tracePart(c, P, 0, P.L); c.strokeStyle = rgba(glowc, 0.06 * k); c.lineWidth = ev.w * (wave ? 0.7 : 0.5); c.stroke();
    c.beginPath(); tracePart(c, P, d, P.L); c.strokeStyle = rgba(glowc, 0.09 * k); c.lineWidth = ev.w * (wave ? 0.45 : 0.3); c.stroke();
    // the line: an ink edge, the dashes marching along it, a hot hair at the middle
    c.beginPath(); tracePart(c, P, 0, P.L); c.strokeStyle = rgba(C.ink, 0.38 * k); c.lineWidth = big ? 10 : 7; c.stroke();
    c.setLineDash(big ? [22, 14] : [16, 12]); c.lineDashOffset = -t * (wave ? 80 : 56);
    c.beginPath(); tracePart(c, P, 0, d); c.strokeStyle = rgba(col, 0.28 * k); c.lineWidth = 2.2; c.stroke();
    c.beginPath(); tracePart(c, P, d, P.L); c.strokeStyle = rgba(col, 0.95 * k); c.lineWidth = big ? 5.4 : 3.6; c.stroke();
    c.strokeStyle = rgba(hi, 0.85 * k); c.lineWidth = big ? 2.2 : 1.4; c.stroke();
    c.setLineDash([]);
    // chevrons running ahead of the wheel the way it goes
    const off = (t * 70) % 110;
    for (let s = off; s < P.L; s += 110) {
      if (s < d) continue;
      const q = atDist(P, s); if (q.a == null) continue;
      c.save(); c.translate(q.x, q.y); c.rotate(q.a);
      c.beginPath(); c.moveTo(-9, -8); c.lineTo(3, 0); c.lineTo(-9, 8); c.strokeStyle = rgba(hi, 0.8 * k); c.lineWidth = 2.2; c.stroke(); c.restore();
    }
    // a star at every bounce (not the start, not where it comes to rest)
    for (let i = 1; i < P.l.length - 1; i++) {
      const [x, y] = P.l[i], near = clamp(1 - (P.cum[i] - d) / 260, 0, 1), after = clamp(1 - (d - P.cum[i]) / ((ev.sp || 900) * 0.5), 0, 1) * (d > P.cum[i] ? 1 : 0);
      const pulse = 0.85 + 0.15 * Math.sin(t * 5 + i * 1.7), r = (big ? 17 : 13) * pulse * (1 + 0.5 * near + 0.9 * after);
      if (wave) {
        ellipse(c, x, y, 26 + 10 * after, 15 + 5 * after, 0, null, rgba(C.foam, 0.7 * k), 2.4);
        for (let j = 0; j < 8; j++) { const a = j * TAU / 8 + 0.3; c.beginPath(); c.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 7); c.lineTo(x + Math.cos(a) * (28 + 8 * after), y + Math.sin(a) * (16 + 5 * after)); c.strokeStyle = rgba('#ffffff', 0.8 * k); c.lineWidth = 2; c.stroke(); }
        glow(c, x, y, 38, C.spray, (0.3 + 0.4 * near + 0.4 * after) * k);
      } else if ((ev.st || []).includes(i)) {
        // a stone turned it: a cool white-blue star with a ring round it
        star4(c, x, y, r * 1.1, t * 0.8 + i, '#9fd0ff', '#ffffff', k * (d > P.cum[i] ? Math.max(0.35, after) : 1));
        ellipse(c, x, y, 24 + 8 * after, 15 + 5 * after, 0, null, rgba('#e8f4ff', 0.6 * k), 2);
      } else star4(c, x, y, r, t * 0.8 + i, C.gold, C.goldHi, k * (d > P.cum[i] ? Math.max(0.35, after) : 1));
    }
    // Twin Wheels: a badge of one or two pips at the foot of each road says which leaves first
    if (ev.ord && d <= 0) {
      const q = atDist(P, Math.min(P.L, 150)), off = ev.ord === 1 ? 0 : 1;
      c.save(); c.translate(q.x, q.y - 34);
      ellipse(c, 0, 0, 22, 14, 0, rgba(C.ink, 0.55 * k), rgba(ev.ord === 1 ? C.gold : C.silver, 0.9 * k), 2);
      for (let j = 0; j <= off; j++) circle(c, (j - off / 2) * 12, 0, 3.4, rgba(ev.ord === 1 ? C.goldHi : '#ffffff', 0.95 * k));
      c.restore();
    }
    // where it comes to rest (a blue catch ring is painted there by the catch's own tell; with none, a small gold ring)
    if (!(ev.c && ev.c.length)) { const [x, y] = P.l[P.l.length - 1]; ellipse(c, x, y, 17, 10, 0, null, rgba(col, 0.8 * k), 2.4); glow(c, x, y, 26, glowc, 0.35 * k); }
    c.restore();
  }
  // the thing itself, over the units: the wheel (or the wave's crest) running along its painted path from `at`, stopping at the last point
  function pathOver(c, key, ev, t) {
    const P = pathInfo(ev); if (P.l.length < 2) return;
    const begin = ev.start + (ev.at || 0), big0 = !!ev.big;
    if (t < begin - 0.02) {
      // the wind-up: the wheel gathering in his hand: a ghost of the disc spinning up, light drawn in from all round it
      if (!ev.wave && begin - t < 2.6) {
        const ch = clamp(1 - (begin - t) / 2.6, 0, 1), [x0, y0] = P.l[0], rr = (big0 ? 70 : 44) * (0.6 + 0.4 * ch);
        c.save();
        glow(c, x0, y0 - 30, rr * 2.6, C.gold, 0.2 * ch * ch);
        for (let i = 0; i < 9; i++) {
          const a = i * TAU / 9 + t * 0.5, qq = (t * 1.4 + hash(i, 2)) % 1, d0 = rr * (4.2 - 3.0 * qq * (0.5 + ch)), al = Math.sin(qq * Math.PI) * 0.7 * ch;
          c.beginPath(); c.moveTo(x0 + Math.cos(a) * d0, y0 - 30 + Math.sin(a) * d0 * 0.7); c.lineTo(x0 + Math.cos(a) * (d0 - 22), y0 - 30 + Math.sin(a) * (d0 - 22) * 0.7);
          c.strokeStyle = rgba(i % 2 ? C.goldHi : C.gold, al); c.lineWidth = 2.4; c.lineCap = 'round'; c.stroke();
        }
        wheelDisc(c, x0, y0 - 30, rr, t * (4 + 22 * ch * ch), 0.5 * ch, { lift: 0 });
        c.restore();
      }
      return;
    }
    const sp = ev.sp || 900, d = clamp((t - begin) * sp, 0, P.L), k = clamp((ev.end - t) / 0.35, 0, 1), big = !!ev.big, wave = !!ev.wave;
    const q = atDist(P, d), r = big ? clamp(ev.w * 0.42, 60, 90) : clamp(ev.w * 0.36, 34, 56);
    // it leaves his hand: a burst of light and sand at the start of the road, and a push along it
    const goId = key + ':' + ev.start + ':go';
    if (!wave && !S.fired.has(goId)) {
      S.fired.add(goId);
      if (t - begin < 0.5) {
        const [x0, y0] = P.l[0], a0 = atDist(P, 4).a;
        VFX.shock(x0, y0, { r: big ? 260 : 180, color: C.gold, w: 8, dur: 0.5, flat: 0.75 }); VFX.shock(x0, y0, { r: big ? 160 : 110, color: C.goldHi, w: 4, dur: 0.4, flat: 0.75 });
        VFX.sparks(x0, y0, { color: C.goldHi, n: big ? 26 : 16, speed: 520, angle: a0, spread: 0.8, z: 14 });
        sandUp(x0, y0, big ? 9 : 5, { size: 0.9 }); shakeNow(big ? 6 : 3.5);
        if (big) cam(0.05, 0.03, 0.4, 2);
      }
    }
    // what it does at each bounce it reaches (once): a flash on the wall, sparks, a ring
    for (let i = 1; i < P.l.length - 1; i++) {
      if (d < P.cum[i]) break;
      const id = key + ':' + ev.start + ':' + i; if (S.fired.has(id)) continue;
      S.fired.add(id); if (S.fired.size > 600) S.fired.clear();
      if (t - begin - P.cum[i] / sp > 0.6) continue;   // (joined late: nothing to see)
      const [x, y] = P.l[i], stone = (ev.st || []).includes(i);
      if (!wave) VFX.motes(x, y, { n: 3, color: C.ghost, r: 22, rise: 1 });   // (the ghost crowd gasps at every bounce)
      if (stone) {
        // a stone turned it: pale sparks, chips of rock, a white ring; the road has just changed under their feet
        VFX.sparks(x, y, { color: '#ffffff', n: big ? 22 : 14, speed: 420 }); VFX.debris(x, y, { color: '#6a6a60', n: big ? 12 : 7, speed: 1.4, size: 1.2 });
        VFX.shock(x, y, { r: big ? 150 : 105, color: '#e8f4ff', w: 6, dur: 0.5, flat: 0.75 }); VFX.hit(x, y, '#ffffff', big ? 1.9 : 1.3);
        shakeNow(big ? 6 : 4); if (big) cam(0.06, 0.03, 0.4, 2.5);
        continue;
      }
      if (wave) { spray(x, y, 14, { size: 1.3, up: 1.3 }); VFX.shock(x, y, { r: 90, color: C.foam, w: 5, dur: 0.5, flat: 0.7 }); VFX.flash(x, y - 10, 70, C.spray, 0.3); }
      else {
        VFX.sparks(x, y, { color: C.gold, n: big ? 20 : 12, speed: 380 }); VFX.hit(x, y, C.goldHi, big ? 1.7 : 1.15);
        VFX.shock(x, y, { r: big ? 130 : 90, color: C.gold, w: 5, dur: 0.45, flat: 0.75 }); sandUp(x, y, big ? 8 : 4, { size: 0.8 });
      }
      shakeNow(big ? 4 : 2.5);
    }
    // its wake: a streak behind it
    if (!wave && d > 2) {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; const P2 = P;
      for (const [w, col, a] of [[r * 1.1, C.amber, 0.18], [r * 0.6, C.gold, 0.4], [r * 0.2, C.goldHi, 0.8]]) { c.beginPath(); tracePart(c, P2, d - (big ? 260 : 180), d); c.strokeStyle = rgba(col, a * k); c.lineWidth = w; c.stroke(); }
      c.restore();
    }
    // spray thrown off it as it runs
    const sk = key + ':' + ev.start;
    if (d < P.L && t - (S.spray[sk] || 0) > 0.035) {
      S.spray[sk] = t;
      if (wave) { VFX.spawn({ x: q.x + rand(-60, 60) * Math.cos(q.a + 1.57), y: q.y + rand(-60, 60) * Math.sin(q.a + 1.57), z: rand(8, 30), vx: Math.cos(q.a) * rand(40, 120), vy: Math.sin(q.a) * rand(40, 120) * 0.6, vz: rand(60, 160), g: 400, life: rand(0.4, 0.8), size: rand(7, 12), size1: 0, color: C.foam, kind: 'glow' }); }
      else { VFX.sparks(q.x, q.y, { color: Math.random() < 0.5 ? C.gold : C.goldHi, n: 2, speed: 220, angle: q.a + Math.PI, spread: 0.7, z: 10 }); if (Math.random() < 0.5) VFX.smoke(q.x, q.y, { n: 1, color: C.sand, size: 22, a: 0.4, speed: 50 }); }
    }
    if (wave) { crest(c, q.x, q.y, q.a, ev.w, t, k); return; }
    const pop = d >= P.L ? clamp((ev.end - t) / 0.35, 0, 1) : 1;
    wheelDisc(c, q.x, q.y, r * (0.7 + 0.3 * pop), t * (big ? 11 : 16), k, { lift: r * (big ? 0.5 : 0.42) });
  }
  function floor(ctx, room, t) {
    const ev = room && room.ev; if (!ev) return;
    for (const key in ev) if (key.startsWith('brpath:') && t < ev[key].end) pathFloor(ctx, key, ev[key], t);
  }

  // ---------------------------------------------------------------- the warnings (boss-tells.js get() reads TELLS[tag])
  // Each paints only the danger, inside the outline the shared code draws. Nothing marks a safe place.
  const TELLS = {};

  // a lane the wheel will run down: pressed sand across it, a gold rail, chevrons, and the glow of the wheel as it comes
  function wheelTell(second) {
    return { ground(ctx, tg, s, p, k, t) {
      const sp = spFor(s.w, false, t), land = tg.start + tg.dur, enter = land - s.len / sp;
      const near = clamp(1 - (enter - t) / 0.9, 0, 1), head = clamp((t - enter) * sp, 0, s.len);
      const hot = second ? C.silver : C.gold, mid = second ? '#9fd0ff' : C.amber;
      lane(ctx, s, (L, hw) => {
        // sand pressed in ripples across the lane
        for (let i = 0, n = Math.floor(L / 28); i < n; i++) {
          const x = (i + 0.5) * 28, h = hw * (0.45 + 0.4 * hash(i, tg.id));
          ctx.beginPath(); ctx.moveTo(x, -h); ctx.quadraticCurveTo(x + 7, 0, x, h);
          ctx.strokeStyle = rgba(C.wetDk, (0.1 + 0.1 * near) * k); ctx.lineWidth = 3.4; ctx.stroke();
          ctx.strokeStyle = rgba('#ffe7a8', (0.06 + 0.12 * near) * k); ctx.lineWidth = 1; ctx.stroke();
        }
        const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(hot, 0)); g.addColorStop(0.5, rgba(hot, (0.06 + 0.12 * near) * k)); g.addColorStop(1, rgba(hot, 0));
        ctx.fillStyle = g; ctx.fillRect(0, -hw, L, hw * 2);
        // hairlines along both edges and the rail down the middle
        ctx.lineCap = 'round'; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 50;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, sd * hw * 0.86); ctx.lineTo(L, sd * hw * 0.86); ctx.strokeStyle = rgba(mid, (0.2 + 0.25 * near) * k); ctx.lineWidth = 1.6; ctx.stroke(); }
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.strokeStyle = rgba(C.ink, 0.3 * k); ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = rgba(mid, (0.35 + 0.45 * near) * k); ctx.lineWidth = 2.4; ctx.stroke();
        // chevrons running down it
        for (let i = 0, n = Math.max(1, Math.round(L / 70)); i < n; i++) {
          const x = ((i / n) * L + t * (120 + 260 * near)) % L;
          ctx.beginPath(); ctx.moveTo(x - 11, -hw * 0.3); ctx.lineTo(x, 0); ctx.lineTo(x - 11, hw * 0.3);
          ctx.strokeStyle = rgba(second ? '#ffffff' : C.goldHi, (0.3 + 0.5 * near) * k); ctx.lineWidth = 2; ctx.stroke();
          if (second) { ctx.beginPath(); ctx.moveTo(x - 20, -hw * 0.3); ctx.lineTo(x - 9, 0); ctx.lineTo(x - 20, hw * 0.3); ctx.stroke(); }
        }
        // the wheel's own light, running ahead of it
        if (near > 0) glow(ctx, clamp(head, 0, L), 0, hw * (1.4 + 0.5 * near), hot, 0.5 * near * k);
        if (near > 0 && head < L - 4) glow(ctx, clamp(head + 60, 0, L), 0, hw, C.goldHi, 0.28 * near * k);
      }, true);
    } };
  }
  TELLS.brWheel = wheelTell(false);
  TELLS.brRiposte = wheelTell(true);

  // the catch: a blue ring that reads as "stand here and catch": rings drawing in, arrows pointing in, the disc's outline waiting
  TELLS.brCatch = { ground(ctx, tg, s, p, k, t) {
    const r = s.r;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 8, s.x, s.y, r);
    g.addColorStop(0, rgba(C.catchHi, (0.16 + 0.18 * p) * k)); g.addColorStop(0.7, rgba(C.catch, (0.1 + 0.1 * p) * k)); g.addColorStop(1, rgba(C.catch, (0.04 + 0.06 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    ctx.lineCap = 'round';
    // rings drawing in toward the middle
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, r * (1 - q * 0.8), 0, TAU); ctx.strokeStyle = rgba(C.catchHi, (0.55 * Math.sin(q * Math.PI) + 0.1) * k); ctx.lineWidth = 2.2; ctx.stroke(); }
    // arrows pointing in
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + 0.2, q = (t * 0.9 + i * 0.125) % 1, d = r * (0.92 - 0.56 * q), al = Math.sin(q * Math.PI) * (0.55 + 0.4 * p) * k;
      ctx.save(); ctx.translate(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d); ctx.rotate(a + Math.PI);
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(3, 0); ctx.lineTo(-9, 8); ctx.strokeStyle = rgba('#ffffff', al); ctx.lineWidth = 2.6; ctx.stroke(); ctx.restore();
    }
    // the outline of the wheel, waiting to be caught: its rim and rays, spinning slowly, filling as it nears
    const dr = r * 0.34, sp = t * 1.2;
    ctx.beginPath(); ctx.arc(s.x, s.y, dr, 0, TAU); ctx.fillStyle = rgba(C.catchHi, (0.04 + 0.2 * p * p) * k); ctx.fill();
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20; ctx.strokeStyle = rgba('#ffffff', (0.55 + 0.35 * p) * k); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + sp; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * dr * 0.45, s.y + Math.sin(a) * dr * 0.45); ctx.lineTo(s.x + Math.cos(a) * dr * (i % 2 ? 0.75 : 0.92), s.y + Math.sin(a) * dr * (i % 2 ? 0.75 : 0.92)); ctx.strokeStyle = rgba(C.catchHi, (0.4 + 0.4 * p) * k); ctx.lineWidth = 1.6; ctx.stroke(); }
    glow(ctx, s.x, s.y, r * 0.5, C.catchHi, (0.15 + 0.4 * p * p) * k);
    ctx.restore();
  } };

  // Banner Fall: the banner that was hung on the wall, hanging in the air above its place, coming down onto it
  function bannerCloth(c, w, h, k, lean = 0) {
    // a hanging red banner, long edge along x: a swallow-tail at the far end, a gold fringe and a sun in the middle
    c.save(); c.transform(1, 0, lean, 1, 0, 0);
    c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.lineTo(w / 2 - w * 0.12, 0); c.lineTo(w / 2, h / 2); c.lineTo(-w / 2, h / 2); c.closePath();
    const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, rgba(C.banner, 0.95 * k)); g.addColorStop(1, rgba(C.bannerDk, 0.95 * k));
    c.fillStyle = g; c.fill(); c.strokeStyle = rgba('#2a0608', 0.9 * k); c.lineWidth = 2.4; c.stroke();
    c.strokeStyle = rgba(C.gold, 0.85 * k); c.lineWidth = 3; c.beginPath(); c.moveTo(-w / 2 + 2, -h / 2 + 3); c.lineTo(w / 2 - 2, -h / 2 + 3); c.moveTo(-w / 2 + 2, h / 2 - 3); c.lineTo(w / 2 - 2, h / 2 - 3); c.stroke();
    // the sun
    c.fillStyle = rgba(C.gold, 0.92 * k); c.beginPath(); c.arc(-w * 0.04, 0, h * 0.2, 0, TAU); c.fill();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(-w * 0.04 + Math.cos(a - 0.12) * h * 0.24, Math.sin(a - 0.12) * h * 0.24); c.lineTo(-w * 0.04 + Math.cos(a) * h * 0.38, Math.sin(a) * h * 0.38); c.lineTo(-w * 0.04 + Math.cos(a + 0.12) * h * 0.24, Math.sin(a + 0.12) * h * 0.24); c.closePath(); c.fill(); }
    c.restore();
  }
  TELLS.brBanner = { ground(ctx, tg, s, p, k, t) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), cx = s.x + ca * s.len * 0.5, cy = s.y + sa * s.len * 0.5;
    // the shadow it will make on the sand, darkening as it falls
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(s.angle);
    const g = ctx.createLinearGradient(0, -s.w / 2, 0, s.w / 2); g.addColorStop(0, rgba(C.bannerDk, 0)); g.addColorStop(0.5, rgba('#5a0a10', (0.12 + 0.3 * p) * k)); g.addColorStop(1, rgba(C.bannerDk, 0));
    ctx.fillStyle = g; ctx.fillRect(-s.len / 2, -s.w / 2, s.len, s.w);
    ctx.restore();
    // the cloth itself, hanging high over its place and coming down (not clipped: it hangs above the lane)
    const lift = (1 - easeIn(p)) * 160 + 10 * Math.sin(t * 5);
    ctx.save(); ctx.translate(cx, cy - lift); ctx.rotate(s.angle);
    bannerCloth(ctx, s.len * 0.84, s.w * 0.66, (0.4 + 0.45 * p) * k, Math.sin(t * 6) * 0.08 * (1 - p));
    ctx.restore();
    // glints of the sun on the cloth
    glow(ctx, cx, cy - lift * 0.6, 70, C.gold, (0.1 + 0.25 * p) * k);
  } };

  // Victory Leap: his shadow growing over the ring, with the war-shield's rays in it, and the air rushing in
  TELLS.brLeap = { ground(ctx, tg, s, p, k, t) {
    const r = s.r, g = 0.35 + 0.65 * easeOut(p);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    // the shadow on the sand: a black pool that deepens as he comes down
    const gr = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, r);
    gr.addColorStop(0, rgba('#02080a', (0.3 + 0.45 * p) * k)); gr.addColorStop(0.65, rgba('#02080a', (0.16 + 0.3 * p) * k)); gr.addColorStop(1, rgba('#02080a', (0.05 + 0.1 * p) * k));
    ctx.fillStyle = gr; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    // the shape of him: a bulk with limbs flung wide, the shield out to one side with its rays
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(g, g * 0.92);
    ctx.fillStyle = rgba('#000000', (0.28 + 0.4 * p) * k);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.34, r * 0.26, 0, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineWidth = r * 0.12; ctx.strokeStyle = rgba('#000000', (0.28 + 0.4 * p) * k);
    for (const [ax, ay] of [[-0.72, -0.34], [0.7, -0.4], [-0.5, 0.52], [0.48, 0.55]]) { ctx.beginPath(); ctx.moveTo(ax * r * 0.2, ay * r * 0.2); ctx.lineTo(ax * r * 0.62, ay * r * 0.62); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(-r * 0.36, -r * 0.1, r * 0.3, 0, TAU); ctx.fillStyle = rgba('#000000', (0.2 + 0.35 * p) * k); ctx.fill();
    ctx.strokeStyle = rgba(C.gold, (0.15 + 0.4 * p) * k); ctx.lineWidth = 1.4;
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t * 0.6; ctx.beginPath(); ctx.moveTo(-r * 0.36 + Math.cos(a) * r * 0.1, -r * 0.1 + Math.sin(a) * r * 0.1); ctx.lineTo(-r * 0.36 + Math.cos(a) * r * 0.28, -r * 0.1 + Math.sin(a) * r * 0.28); ctx.stroke(); }
    ctx.restore();
    // air rushing in toward the point he'll land
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + hash(i, tg.id) * 0.3, q = (t * (0.8 + 1.6 * p) + hash(i, 3)) % 1, d0 = r * (1 - q * 0.75), d1 = d0 - 22 - 40 * p;
      ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * d0, s.y + Math.sin(a) * d0); ctx.lineTo(s.x + Math.cos(a) * d1, s.y + Math.sin(a) * d1);
      ctx.strokeStyle = rgba(C.foam, 0.5 * Math.sin(q * Math.PI) * (0.4 + 0.6 * p) * k); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  } };

  // Roar of the Stands: the ghost crowd roaring: pale green rings rolling in off the wall, quicker as it nears, the rim glowing
  TELLS.brRoar = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const R = AR();
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    // the stands' glow along the wall
    ARENA.trace(ctx, -4); ctx.lineJoin = 'round';
    for (const [w, a] of [[80, 0.04], [46, 0.07], [22, 0.12], [7, 0.3]]) { ctx.strokeStyle = rgba(C.ghost, a * (0.3 + p) * k); ctx.lineWidth = w * (0.4 + 0.8 * p); ctx.stroke(); }
    // rings rolling in from the rim, thicker and faster as the roar builds
    const sp = 0.35 + 0.9 * p;
    for (let i = 0; i < 5; i++) {
      const q = (t * sp + i / 5) % 1, r = R * (1 - q * 0.95), al = Math.sin(q * Math.PI) * (0.15 + 0.5 * p) * k;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = rgba(C.ghost, al * 0.5); ctx.lineWidth = 12 * (1 - q * 0.5); ctx.stroke();
      ctx.strokeStyle = rgba(C.ghostHi, al); ctx.lineWidth = 2.2; ctx.stroke();
    }
    // wisps of ghost-light thrown inward off the wall
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + hash(i, 5), q = (t * 0.6 * sp + hash(i, 6)) % 1, d = R * (1 - q * 0.45); glow(ctx, Math.cos(a) * d, Math.sin(a) * d, 12 + 14 * hash(i, 7), C.ghost, 0.35 * Math.sin(q * Math.PI) * (0.4 + p) * k); }
    ctx.restore();
  } };

  // Sand Furrow: his heel dug in, a furrow ploughed out from his feet both ways; the sand heaves up in lips along it
  TELLS.brFurrow = { ground(ctx, tg, s, p, k, t) {
    lane(ctx, s, (L, hw) => {
      const mid = L / 2, X = (L / 2) * easeOut(clamp(p / 0.7, 0, 1));
      // the trench darkening from his feet outward
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.wetDk, 0)); g.addColorStop(0.5, rgba(C.wetDk, (0.22 + 0.3 * p) * k)); g.addColorStop(1, rgba(C.wetDk, 0));
      ctx.fillStyle = g; ctx.fillRect(mid - X, -hw, X * 2, hw * 2);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // the lips of sand thrown up on both sides, wavering
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        for (let x = mid - X; x <= mid + X; x += 18) { const y = sd * hw * (0.82 + 0.1 * Math.sin(x * 0.07 + sd) + 0.05 * hash(x | 0, tg.id)); x === mid - X ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.strokeStyle = rgba(C.wetDk, 0.5 * k); ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = rgba(C.sand, (0.45 + 0.35 * p) * k); ctx.lineWidth = 3; ctx.stroke();
      }
      // the heat of it: seams of orange in the churn, steam coming off
      ctx.beginPath(); ctx.moveTo(mid - X, 0); ctx.lineTo(mid + X, 0); ctx.strokeStyle = rgba(C.amber, (0.18 + 0.4 * p) * k); ctx.lineWidth = 3.4; ctx.stroke();
      ctx.strokeStyle = rgba(C.goldHi, (0.2 + 0.4 * p) * k); ctx.lineWidth = 1.2; ctx.stroke();
      for (let i = 0; i < 26; i++) {
        const x = mid + (hash(i, tg.id) * 2 - 1) * X, q = (t * 0.7 + hash(i, 2)) % 1, y = (hash(i, 3) - 0.5) * hw * 1.2 - q * 26;
        glow(ctx, x, y, 10 + 8 * q, i % 3 ? C.sand : C.foam, 0.22 * (1 - q) * (0.4 + p) * k);
      }
      // chevrons running both ways from the middle
      for (let i = 0; i < 12; i++) {
        const q = (t * 0.5 + i / 12) % 1, d = q * X, sd = i % 2 ? 1 : -1;
        ctx.save(); ctx.translate(mid + sd * d, 0); ctx.scale(sd, 1);
        ctx.beginPath(); ctx.moveTo(-12, -hw * 0.3); ctx.lineTo(0, 0); ctx.lineTo(-12, hw * 0.3); ctx.strokeStyle = rgba(C.goldHi, 0.5 * (1 - q) * (0.3 + p) * k); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      glow(ctx, mid, 0, hw * 1.5, C.amber, (0.12 + 0.3 * p) * k);
    }, true);
  } };

  // The Tide Rises: arrows of water pointing up, rings of foam closing in on the middle
  TELLS.brRise = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const R = AR();
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    ARENA.trace(ctx, -4); ctx.lineJoin = 'round';
    for (const [w, a] of [[90, 0.06], [50, 0.1], [20, 0.16], [6, 0.4]]) { ctx.strokeStyle = rgba(C.foam, a * (0.3 + p) * k); ctx.lineWidth = w * (0.4 + 0.9 * p); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { const q = (t * 0.45 + i / 3) % 1; ctx.beginPath(); ctx.arc(0, 0, R * (1 - q * 0.9), 0, TAU); ctx.strokeStyle = rgba(C.spray, 0.4 * Math.sin(q * Math.PI) * (0.3 + p) * k); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const a = i * TAU / 14 + 0.2, d = R * (0.3 + 0.55 * hash(i, 4)), x = Math.cos(a) * d, y = Math.sin(a) * d, q = (t * 0.8 + hash(i, 5)) % 1, up = q * 46, al = Math.sin(q * Math.PI) * (0.25 + 0.6 * p) * k;
      ctx.beginPath(); ctx.moveTo(x, y - up + 18); ctx.lineTo(x, y - up - 18); ctx.moveTo(x - 10, y - up - 8); ctx.lineTo(x, y - up - 20); ctx.lineTo(x + 10, y - up - 8);
      ctx.strokeStyle = rgba('#bfeaff', al); ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  } };

  // a sandal's sole seen from under: toe at +x
  function solePath(c, Ls) {
    const n = 26;
    c.beginPath();
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i <= n; i++) {
      const u = side < 0 ? i / n : 1 - i / n, x = (u - 0.5) * Ls;
      const hw = Ls * 0.2 * (0.5 + 0.5 * Math.pow(Math.sin(Math.PI * clamp(u * 0.96 + 0.02, 0, 1)), 0.55)) * (1 + 0.2 * Math.exp(-Math.pow((u - 0.72) / 0.14, 2))) * (1 - 0.22 * Math.exp(-Math.pow((u - 0.42) / 0.12, 2)));
      const y = side * hw; (side < 0 && i === 0) ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath();
  }
  function sole(c, x, y, ang, Ls, k, lift) {
    c.save(); c.translate(x, y - lift); c.rotate(ang);
    solePath(c, Ls); c.fillStyle = rgba('#1a0f06', 0.92 * k); c.fill(); c.strokeStyle = rgba(C.gold, 0.9 * k); c.lineWidth = 3; c.stroke();
    // the straps across it and the bronze nails round the heel
    c.strokeStyle = rgba(C.bronze, 0.9 * k); c.lineWidth = 5;
    for (const u of [0.58, 0.76]) { c.beginPath(); c.moveTo((u - 0.5) * Ls, -Ls * 0.16); c.lineTo((u - 0.5) * Ls, Ls * 0.16); c.stroke(); }
    for (let i = 0; i < 9; i++) { const a = Math.PI * 0.55 + i * Math.PI * 0.11; circle(c, -Ls * 0.3 + Math.cos(a) * Ls * 0.15, Math.sin(a) * Ls * 0.15, Ls * 0.018, rgba(C.goldHi, 0.9 * k)); }
    for (let i = 0; i < 5; i++) circle(c, (0.2 + i * 0.1 - 0.5) * Ls * 1.0 + Ls * 0.18, Math.sin(i * 2.3) * Ls * 0.05, Ls * 0.016, rgba(C.goldHi, 0.8 * k));
    c.restore();
  }
  // the great fist: the Sunwheel grown huge, closed round, seen from above
  function fistShape(c, x, y, R, k, lift, t) {
    c.save(); c.translate(x, y - lift);
    ellipse(c, 0, 0, R, R * 0.9, 0, rgba('#1a1006', 0.88 * k), rgba(C.gold, 0.9 * k), 3.2);
    c.save(); c.rotate(t * 0.3);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(Math.cos(a - 0.1) * R * 0.28, Math.sin(a - 0.1) * R * 0.25); c.lineTo(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.77); c.lineTo(Math.cos(a + 0.1) * R * 0.28, Math.sin(a + 0.1) * R * 0.25); c.closePath(); c.fillStyle = rgba(i % 2 ? C.bronze : C.gold, 0.55 * k); c.fill(); }
    c.restore();
    for (let i = 0; i < 4; i++) { const a = -0.4 + i * 0.27; ellipse(c, Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.66 + R * 0.12, R * 0.2, R * 0.17, 0, rgba('#3a2208', 0.9 * k), rgba(C.goldHi, 0.8 * k), 2); }
    circle(c, 0, 0, R * 0.2, rgba('#c8902a', 0.9 * k), rgba('#2a1606', 0.9 * k), 2.4);
    c.restore();
  }
  // the shared tankbuster draws its red wash and hands over: Hammer Heel's sole coming down, Fist Slam's fist coming down
  function buster(ctx, tg, s, p, k, t, env) {
    const isFist = tg.tag === 'brFist', r = s.r;
    const b = env && env.boss, ang = b ? Math.atan2(s.y - b.y, s.x - b.x) : 0;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    // a shadow gathering on the sand, and the cracks it will leave running ahead of it
    const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, r);
    g.addColorStop(0, rgba('#02080a', (0.2 + 0.4 * p) * k)); g.addColorStop(1, rgba('#02080a', (0.04 + 0.12 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    ctx.restore();
    const lift = (1 - easeIn(p)) * (isFist ? 170 : 130), a = (0.35 + 0.55 * p) * k;
    if (isFist) fistShape(ctx, s.x, s.y, r * 0.82 * (1.12 - 0.12 * p), a, lift, t);
    else sole(ctx, s.x, s.y, ang, r * 1.6 * (1.1 - 0.1 * p), a, lift);
    if (p > 0.55) { const q = (p - 0.55) / 0.45; for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + hash(i, tg.id); crackLine(ctx, s.x + Math.cos(an) * r * 0.3, s.y + Math.sin(an) * r * 0.3, s.x + Math.cos(an) * r * (0.3 + 0.55 * q), s.y + Math.sin(an) * r * (0.3 + 0.55 * q) * 0.9, tg.id + i, 0.6 * q * k, { w: 1.4, jag: 5 }); } }
  }

  // Breaker's wave: water rushing down the lane: the front of it runs the way the wave goes, white water behind
  function waveTell(back) {
    return { ground(ctx, tg, s, p, k, t) {
      const sp = spFor(s.w, true, t), land = tg.start + tg.dur, fl = s.len * 0.6, enter = land - fl / sp, front = (t - enter) * sp;
      lane(ctx, s, (L, hw) => {
        const f = clamp(front, 0, L), near = clamp(1 - (enter - t) / 1.2, 0, 1);
        const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.sea, (0.1 + 0.1 * near) * k)); g.addColorStop(0.5, rgba(C.spray, (0.2 + 0.22 * near) * k)); g.addColorStop(1, rgba(C.sea, (0.1 + 0.1 * near) * k));
        ctx.fillStyle = g; ctx.fillRect(0, -hw, L, hw * 2);
        ctx.lineCap = 'round';
        // swell lines in the water, running the way it goes
        for (let i = 0; i < 9; i++) {
          const y = (i / 8 * 2 - 1) * hw * 0.85, x0 = ((t * (60 + 180 * near) + hash(i, tg.id) * L) % L), len = 40 + 60 * hash(i, 5);
          ctx.beginPath(); ctx.moveTo(x0 - len, y); ctx.lineTo(x0, y); ctx.strokeStyle = rgba(C.foam, (0.18 + 0.3 * near) * k); ctx.lineWidth = 2 + hash(i, 6) * 2; ctx.stroke();
        }
        // arrows pointing the way it runs
        for (let i = 0, n = Math.max(1, Math.round(L / 90)); i < n; i++) {
          const x = ((i / n) * L + t * (90 + 200 * near)) % L;
          ctx.beginPath(); ctx.moveTo(x - 14, -hw * 0.34); ctx.lineTo(x, 0); ctx.lineTo(x - 14, hw * 0.34); ctx.strokeStyle = rgba(back ? '#ffffff' : '#bfeaff', (0.3 + 0.5 * near) * k); ctx.lineWidth = 2.4; ctx.stroke();
        }
        // white water churning behind the front
        if (front > 0) for (let i = 0; i < 14; i++) { const x = f - hash(i, 7) * 120, y = (hash(i, 8) - 0.5) * hw * 1.7; if (x > 0) glow(ctx, x, y + Math.sin(t * 8 + i) * 4, 16 + 10 * hash(i, 9), C.foam, 0.4 * k); }
        // the front itself
        if (front > -40 && front < L) {
          ctx.beginPath(); ctx.moveTo(f, -hw); ctx.quadraticCurveTo(f + hw * 0.4, 0, f, hw); ctx.strokeStyle = rgba(C.foam, 0.85 * k); ctx.lineWidth = 6; ctx.stroke();
          glow(ctx, f, 0, hw * 1.1, C.spray, 0.3 * k);
        }
      }, true);
    } };
  }
  TELLS.brWave = waveTell(false);
  TELLS.brWaveBack = waveTell(true);

  // Undertow Grip: the hand's shadow falling over the hero: a great black hand, fingers curling closed as it comes, water dripping
  TELLS.brGrip = { ground(ctx, tg, s, p, k, t) {
    const r = s.r, a = (0.2 + 0.42 * p) * k, curl = 1 - 0.42 * easeIn(p), sc = 0.72 + 0.28 * easeOut(p);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 8, s.x, s.y, r);
    g.addColorStop(0, rgba('#02080a', (0.3 + 0.4 * p) * k)); g.addColorStop(1, rgba('#02080a', (0.06 + 0.1 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    ctx.restore();
    ctx.save(); ctx.translate(s.x, s.y - r * 0.5); ctx.scale(sc, sc * 0.92);
    ctx.fillStyle = rgba('#000000', a); ctx.strokeStyle = rgba('#000000', a); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.46, r * 0.4, 0, 0, TAU); ctx.fill();
    // four fingers reaching down the screen from the titan, and the thumb out to the side
    for (const [fx, fl] of [[-0.36, 0.78], [-0.12, 0.95], [0.12, 0.9], [0.34, 0.7]]) { ctx.lineWidth = r * 0.17; ctx.beginPath(); ctx.moveTo(fx * r, -r * 0.1); ctx.quadraticCurveTo(fx * r * 1.1, r * fl * 0.5 * curl, fx * r * (1 - 0.5 * (1 - curl)), r * fl * curl); ctx.stroke(); }
    ctx.lineWidth = r * 0.2; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.1); ctx.quadraticCurveTo(-r * 0.75, r * 0.1, -r * 0.62 + r * 0.3 * (1 - curl), r * 0.42); ctx.stroke();
    ctx.restore();
    // water running off it
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    for (let i = 0; i < 10; i++) { const q = (t * 0.8 + hash(i, tg.id)) % 1, x = s.x + (hash(i, 5) - 0.5) * r * 1.5, y = s.y - r * 0.6 + q * r * 1.4; circle(ctx, x, y, 2.4 + hash(i, 6) * 2, rgba(C.spray, 0.55 * Math.sin(q * Math.PI) * (0.4 + p) * k)); }
    ctx.restore();
  } };

  // Deep Call: the sea drawing back and dragging the room in: swells closing on the middle and arrows pointing in at it, the water
  // sucked off the wall (the pull stops a step or two short of the middle: nothing is painted where anyone ends up)
  TELLS.brDeep = { raidwide: true, ground(ctx, tg, s, p, k, t) {
    const R = AR(), sp = 0.4 + 0.9 * p;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, R); g.addColorStop(0, rgba(C.seaDeep, (0.1 + 0.16 * p) * k)); g.addColorStop(1, rgba(C.sea, (0.03 + 0.1 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
    for (let i = 0; i < 5; i++) { const q = (t * sp + i / 5) % 1, r = 30 + (1 - q) * R; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = rgba(C.foam, 0.12 * q * (0.4 + p) * k); ctx.lineWidth = 16 * (0.5 + q * 0.5); ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.55 * q * (0.3 + p) * k); ctx.lineWidth = 2.4; ctx.stroke(); }
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + 0.1, q = (t * sp * 0.9 + (i % 2) * 0.5 + hash(i, 3) * 0.2) % 1, d = (R - 40) - q * (R - 150), al = Math.sin(q * Math.PI) * (0.3 + 0.55 * p) * k;
      ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a + Math.PI);
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(8, 0); ctx.moveTo(-6, -11); ctx.lineTo(10, 0); ctx.lineTo(-6, 11); ctx.strokeStyle = rgba('#bfeaff', al); ctx.lineWidth = 3.4; ctx.stroke(); ctx.restore();
    }
    // the water falling away from the wall, foam streaming off it
    ARENA.trace(ctx, -6); ctx.lineJoin = 'round';
    for (const [w, a] of [[40, 0.05], [16, 0.1], [5, 0.25]]) { ctx.strokeStyle = rgba(C.foam, a * (0.3 + p) * k); ctx.lineWidth = w * (0.4 + 0.9 * p); ctx.stroke(); }
    ctx.restore();
  } };

  // ---------------------------------------------------------------- Sand Furrow's floor (ArenaView.drawZones hands it over)
  // Churned, waterlogged sand along the line, glowing in its seams (the heel struck sparks out of it) and steaming. Only once it is set.
  function zone(ctx, z, k, t) {
    const s = z.shape, at = z.at != null ? z.at : z.start; if (t < at - 0.05) return;
    const set = clamp((t - at) / 0.6, 0, 1), ending = clamp(1 - (z.end - t) / 1.0, 0, 1), kk = k * set;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    lane(ctx, s, (L, hw) => {
      const x0 = Math.max(0, L / 2 - AR() * 1.3), x1 = Math.min(L, L / 2 + AR() * 1.3);
      // the trench: dark wet sand, a darker line down its middle
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, rgba(C.wet, 0.2 * kk)); g.addColorStop(0.5, rgba(C.wetDk, 0.58 * kk)); g.addColorStop(1, rgba(C.wet, 0.2 * kk));
      ctx.fillStyle = g; ctx.fillRect(x0, -hw, x1 - x0, hw * 2);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // sand heaped along both edges, in lumps
      for (const sd of [-1, 1]) for (let x = x0; x < x1; x += 22) {
        const h = 5 + 6 * hash(x | 0, 3 + sd), y = sd * hw * (0.84 + 0.1 * hash(x | 0, 5));
        ellipse(ctx, x + 6, y, 13 + 6 * hash(x | 0, 6), h, 0, rgba('#8a7048', 0.72 * kk), rgba(C.wetDk, 0.5 * kk), 1);
        ellipse(ctx, x + 4, y - 2, 7, 2.6, 0, rgba('#e0cd9a', 0.5 * kk));
      }
      // standing water in the churn catching the light
      for (let i = 0, n = Math.floor((x1 - x0) / 60); i < n; i++) {
        const x = x0 + (i + hash(i, 8)) * 60, y = (hash(i, 9) - 0.5) * hw * 0.9, gl = 0.5 + 0.5 * Math.sin(t * 1.5 + i * 1.3);
        ellipse(ctx, x, y, 14 + 8 * hash(i, 10), 5 + 3 * hash(i, 11), 0, rgba(C.sea, (0.28 + 0.2 * gl) * kk), rgba(C.foam, 0.4 * kk), 1);
      }
      // seams burning in it, and the steam off them
      const flick = 0.7 + 0.3 * Math.sin(t * 6 + 1);
      ctx.beginPath(); for (let x = x0; x <= x1; x += 24) { const y = Math.sin(x * 0.05) * hw * 0.2 + (hash(x | 0, 4) - 0.5) * 6; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = rgba('#3a0a02', 0.5 * kk); ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = rgba(C.amber, 0.6 * flick * kk); ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = rgba(C.goldHi, 0.55 * flick * kk); ctx.lineWidth = 1.2; ctx.stroke();
      for (let i = 0, n = Math.floor((x1 - x0) / 55); i < n; i++) { const q = (t * 0.5 + hash(i, 12)) % 1, x = x0 + (i + 0.5) * 55, y = Math.sin(x * 0.05) * hw * 0.2 - q * 40; glow(ctx, x, y, 12 + 12 * q, C.foam, 0.28 * (1 - q) * kk * (1 - ending)); }
    }, true);
    ctx.restore();
    // the outline, red: solid once the sand is set (the same as the warning's, drawn again so it never goes dim)
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip(); SHAPES.trace(ctx, s); ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#05101c', 0.6 * kk); ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = rgba(BossTells.COL.danger, 0.8 * kk * (1 - ending * 0.5)); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- what stays on the floor (boss-tells.js track() asks once per landed move)
  // quiet decals, cooling: never louder than the warning was
  function aftermath(tg, env, A) {
    const { mark, AFTER } = A, T = AFTER.tier, s = tg.live, id = tg.id;
    if (tg.type === 'buster') {
      const e = tg.target != null && env.entById ? env.entById(tg.target) : null; if (!e) return;
      const x = e.x, y = e.y, big = tg.tag === 'brFist', R = s.r;
      mark(big || R > 160 ? T.long : T.short, { x, y }, (ctx, q, k, age, seed) => {
        // the print of it pressed into the sand: a dent, a ring of thrown sand, cracks running out
        ellipse(ctx, x, y + 6, R * 0.9, R * 0.72, 0, rgba(C.wetDk, 0.5 * k), rgba('#e0cd9a', 0.45 * k), 2);
        ellipse(ctx, x, y + 6, R * 0.62, R * 0.48, 0, rgba('#000000', 0.2 * k));
        crackStar(ctx, x, y + 6, R * 1.05, big ? 12 : 9, seed, k, { w: 2, flat: 0.72, col: '#f0e0b8' });
        for (let i = 0; i < 12; i++) { const a = hash(i, seed) * TAU, r = R * (0.7 + 0.35 * hash(i, seed + 1)), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.75; poly(ctx, [px - 6, py + 3, px - 1, py - 8, px + 7, py + 2], rgba('#8a7048', 0.8 * k), rgba(C.wetDk, 0.5 * k), 1); }
        if (big) for (let i = 0; i < 4; i++) ellipse(ctx, x + (hash(i, seed + 5) - 0.5) * R, y + (hash(i, seed + 6) - 0.5) * R * 0.7, 20 + 14 * hash(i, seed + 7), 7, 0, rgba(C.sea, 0.32 * k), rgba(C.foam, 0.4 * k), 1);
      }, id);
      return;
    }
    switch (tg.tag) {
      case 'brWheel': case 'brRiposte': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, x0 = s.x, y0 = s.y, riposte = tg.tag === 'brRiposte';
        mark(T.brief, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          // a groove the wheel ploughed: lips of sand either side, flecks of gold, a gleam of water in it
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [off, col, w, al] of [[0, '#1a1208', 12, 0.7], [-9, '#cdb283', 2.2, 0.5], [9, '#cdb283', 2.2, 0.5], [0, riposte ? '#b8d0f0' : '#ffd36a', 1.4, 0.45]]) {
            ctx.beginPath(); zigPath(ctx, x0 - sa * off, y0 + ca * off, x0 + ca * L - sa * off, y0 + sa * L + ca * off, seed + off, 2.2, 34);
            ctx.strokeStyle = rgba(col, al * k); ctx.lineWidth = w; ctx.stroke();
          }
          for (let i = 0, n = Math.floor(L / 50); i < n; i++) { const d = i * 50 + hash(i, seed) * 30, sd = i % 2 ? 1 : -1; glow(ctx, x0 + ca * d - sa * sd * 6, y0 + sa * d + ca * sd * 6, 6, riposte ? C.silver : C.gold, 0.5 * k); }
          ctx.restore();
        }, id);
        break;
      }
      case 'brCatch': {
        const cx = s.x, cy = s.y, R = s.r;
        mark(T.short, { x: cx, y: cy, r: R }, (ctx, q, k, age, seed) => {
          // water flung out in a ring where it struck, a scorch at the heart
          glow(ctx, cx, cy, R * 0.8, '#1a0e04', 0.4 * k);
          for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + hash(i, seed) * 0.4, r = R * (0.55 + 0.5 * hash(i, seed + 1)); ellipse(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 12 + 10 * hash(i, seed + 2), 5 + 3 * hash(i, seed + 3), a, rgba(C.sea, 0.3 * k), rgba(C.foam, 0.45 * k), 1); }
          crackStar(ctx, cx, cy, R * 0.6, 7, seed, k * 0.8, { w: 1.5 });
        }, id);
        break;
      }
      case 'brBanner': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), cx = s.x + ca * s.len * 0.5, cy = s.y + sa * s.len * 0.5, ang = s.angle, w = s.len * 0.84, h = s.w * 0.66;
        mark(T.long, { x: cx, y: cy }, (ctx, q, k, age, seed) => {
          // the banner lying where it fell: red cloth, creased, its gold sun face up, the torn end trailing
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang + (hash(0, seed) - 0.5) * 0.12);
          ctx.fillStyle = rgba('#000000', 0.25 * k); ctx.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);
          bannerCloth(ctx, w, h, 0.95 * k, 0.1);
          ctx.strokeStyle = rgba('#2a0608', 0.5 * k); ctx.lineWidth = 1.4;
          for (let i = 0; i < 5; i++) { const x = -w * 0.4 + i * w * 0.2 + hash(i, seed) * 10; ctx.beginPath(); ctx.moveTo(x, -h * 0.5); ctx.quadraticCurveTo(x + 6, 0, x - 2, h * 0.5); ctx.stroke(); }
          ctx.restore();
        }, id);
        break;
      }
      case 'brLeap': {
        const cx = s.x, cy = s.y, R = s.r;
        mark(T.long, { x: cx, y: cy, r: R }, (ctx, q, k, age, seed) => {
          // the sand blown out of the place he landed: a pit, a ring of heaped sand, rocks thrown, the sea running in
          ellipse(ctx, cx, cy + 4, R * 0.5, R * 0.38, 0, rgba(C.wetDk, 0.55 * k), rgba('#e0cd9a', 0.4 * k), 2);
          ellipse(ctx, cx, cy + 4, R * 0.28, R * 0.2, 0, rgba(C.sea, 0.35 * k), rgba(C.foam, 0.4 * k), 1);
          crackStar(ctx, cx, cy + 4, R * 0.95, 12, seed, k, { w: 2, flat: 0.74, col: '#f0e0b8' });
          for (let i = 0; i < 16; i++) { const a = hash(i, seed) * TAU, r = R * (0.45 + 0.5 * hash(i, seed + 1)), px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.78; poly(ctx, [px - 7, py + 3, px - 1, py - 9, px + 8, py + 2], rgba('#8a7048', 0.85 * k), rgba(C.wetDk, 0.55 * k), 1); }
        }, id);
        break;
      }
      case 'brWave': case 'brWaveBack': {
        const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = s.len, x0 = s.x, y0 = s.y, hw = s.w / 2;
        mark(T.short, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => {
          // foam left in lines where the water ran, and a wet shine on the stone
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 9; i++) {
            const v = (i / 8 * 2 - 1) * hw * 0.85, d0 = hash(i, seed) * L * 0.3, d1 = L * (0.55 + 0.4 * hash(i, seed + 1));
            ctx.beginPath(); ctx.moveTo(x0 + ca * d0 - sa * v, y0 + sa * d0 + ca * v); ctx.lineTo(x0 + ca * d1 - sa * v, y0 + sa * d1 + ca * v);
            ctx.strokeStyle = rgba(C.foam, 0.3 * k); ctx.lineWidth = 2 + 3 * hash(i, seed + 2); ctx.stroke();
          }
          ctx.restore();
        }, id);
        break;
      }
      case 'brDeep': case 'brRise':
        mark(T.short, {}, (ctx, q, k, age, seed) => {
          ARENA.trace(ctx, -10); ctx.lineJoin = 'round';
          ctx.strokeStyle = rgba(C.foam, 0.3 * k); ctx.lineWidth = 18; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.4 * k); ctx.lineWidth = 3; ctx.stroke();
        }, id);
        break;
      case 'brGrip':
        mark(T.brief, { x: s.x, y: s.y }, (ctx, q, k, age, seed) => { for (let i = 0; i < 3; i++) ellipse(ctx, s.x, s.y + 6, 30 + i * 28, 14 + i * 12, 0, null, rgba(C.foam, (0.4 - i * 0.1) * k), 2); }, id);
        break;
    }
  }

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // H: the shared helpers boss-vfx.js owns (shapeFlash, shockAt, scatter, after, shake, roomTint, sweep, streak, bang, AFT, coverShadows, clipOut, AR)
  const IMP = {};

  const inside = (ctx, s, pad = 0) => (ctx.units || []).filter(u => SHAPES.contains(s, u.x, u.y, pad));

  // a piece of a wheel's path lands as the wheel passes: gold flare along it, sand and sparks thrown up, a hit on anyone it touches
  function wheelImp(col, hot) {
    return (tg, msg, ctx, H) => {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), big = s.w > 150;
      H.shapeFlash(s, col, { a: 0.18, dur: 0.4 });
      H.streak(s.x, s.y, s.angle, col, { len: s.len, w: big ? 24 : 15, dur: 0.3 });
      H.streak(s.x, s.y, s.angle, hot, { len: s.len, w: big ? 8 : 5, dur: 0.24 });
      for (let d = 30, i = 0; d < s.len; d += 62, i++) {
        const x = s.x + ca * d, y = s.y + sa * d;
        H.after(d / s.len * 0.1, () => { VFX.sparks(x, y, { color: i % 2 ? col : hot, n: 3, speed: 260 }); if (i % 2) sandUp(x + (Math.random() - 0.5) * s.w * 0.5, y, 2, { size: 0.7 }); else spray(x, y, 3, { size: 0.8, speed: 160 }); });
      }
      const hurt = inside(ctx, s, 6);
      for (const u of hurt) { VFX.hit(u.x, u.y, hot, big ? 2.2 : 1.7); spray(u.x, u.y, 8, { size: 1, speed: 200 }); }
      H.shake(hurt.length ? (big ? 8 : 5) : 2);
      if (hurt.length && big) cam(0.07, 0.03, 0.45, 2);   // (the giant wheel through a hero: the camera holds a beat)
    };
  }
  IMP.brWheel = wheelImp(C.gold, C.goldHi);
  IMP.brRiposte = wheelImp('#9fd0ff', '#ffffff');

  // the catch: caught, the wheel slams into whoever stood there; missed, it bursts and the whole room takes it
  IMP.brCatch = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y, missed = !!(msg && msg.fail);
    if (!missed) {
      const who = inside(ctx, s)[0], hx = who ? who.x : x, hy = who ? who.y : y;
      H.shapeFlash(s, C.catchHi, { a: 0.3, dur: 0.5 });
      VFX.hit(hx, hy, C.goldHi, 2.8);
      H.bang(hx, hy, 120, { n: 14, color: C.gold, core: '#ffffff', ink: '#3a1e04' });
      H.shockAt(hx, hy, { r: 170, color: C.gold, w: 8, dur: 0.5, flat: 0.8 });
      H.shockAt(hx, hy, { r: 120, color: C.catchHi, w: 5, dur: 0.6, flat: 0.8, delay: 0.06 });
      VFX.sparks(hx, hy, { color: C.goldHi, n: 22, speed: 440 });
      spray(hx, hy, 18, { size: 1.3, up: 1.2 }); sandUp(hx, hy, 8);
      // the ghost crowd roars for the catch: pale rings out across the sand and light thrown up off the wall
      for (let i = 0; i < 2; i++) H.shockAt(hx, hy, { r: 300 + i * 120, color: i ? C.ghostHi : C.ghost, w: 6 - i * 2, dur: 0.8 + i * 0.15, flat: 0.8, delay: 0.1 + i * 0.1 });
      VFX.motes(hx, hy - 20, { n: 14, color: C.ghostHi, r: 40, rise: 1.8 });
      if (who && isMe(who)) flinch(C.gold, 0.12, 0.25, 0.022);
      H.shake(11); cam(0.12, 0.04, 0.5, 1.5);
    } else {
      // nobody caught it: the wheel slams into the sand and bursts
      H.roomTint(C.gold, 0.32, 0.9);
      H.shapeFlash(s, C.gold, { a: 0.4, dur: 0.6 });
      VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p), q = easeOut(clamp(p / 0.4, 0, 1)); wheelDisc(c, x, y, 60 * (1 + 2.4 * q), t * 20, k * 0.7, { lift: 30 * (1 - q) }); } });
      H.bang(x, y, 260, { n: 20, color: C.gold, core: '#ffffff', ink: '#3a1e04', dur: 0.55 });
      for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: H.AR * 1.1, color: i ? C.goldHi : C.gold, w: 12 - i * 3, dur: 0.7 + i * 0.12, flat: 0.8, delay: i * 0.09 });
      for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 10)) H.after(Math.random() * 0.3, () => { VFX.sparks(q.x, q.y, { color: C.goldHi, n: 5, speed: 300 }); sandUp(q.x, q.y, 2, { size: 0.7 }); });
      VFX.sparks(x, y, { color: C.goldHi, n: 30, speed: 560 }); sandUp(x, y, 12);
      H.shake(13); cam(0.14, 0.05, 0.6, 1.5);
    }
  };

  // Banner Fall: the banner comes down hard, thrown cloth and dust, and the sun on it flashes
  IMP.brBanner = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), cx = s.x + ca * s.len * 0.5, cy = s.y + sa * s.len * 0.5;
    H.shapeFlash(s, '#ff5a3a', { a: 0.22, dur: 0.45 });
    VFX.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p); c.save(); c.translate(cx, cy - 8 * (1 - p)); c.rotate(s.angle); bannerCloth(c, s.len * 0.84 * (1 + 0.1 * p), s.w * 0.66 * (1 + 0.14 * p), 0.8 * k, 0); c.restore(); } });
    for (const q of H.scatter(s, 12)) H.after(Math.random() * 0.15, () => { VFX.spawn({ x: q.x, y: q.y, z: 14, vx: rand(-60, 60), vy: rand(-40, 40), vz: rand(80, 200), g: 300, drag: 0.04, life: rand(0.7, 1.2), size: rand(8, 14), size1: 3, color: Math.random() < 0.7 ? C.banner : C.gold, kind: 'shard', add: false, vr: rand(-8, 8) }); });
    VFX.smoke(cx, cy, { n: 6, color: C.sand, size: 40, a: 0.5, speed: 130, r: s.w * 0.4 });
    VFX.sparks(cx, cy, { color: C.gold, n: 12, speed: 300 });
    for (const u of inside(ctx, s, 6)) VFX.hit(u.x, u.y, '#ff8a6a', 1.8);
    H.shockAt(cx, cy, { r: 150, color: '#ff8a6a', w: 6, dur: 0.45, flat: 0.8 });
    H.shake(7);
  };

  // Victory Leap: the damage's flash and rings; the landing itself (sand and spray) is propfx brland
  IMP.brLeap = (tg, msg, ctx, H) => {
    const s = tg.live;
    H.shapeFlash(s, '#ffd890', { a: 0.34, dur: 0.6 });
    H.shockAt(s.x, s.y, { r: s.r * 1.2, color: C.sand, w: 10, dur: 0.6, flat: 0.8 });
    H.shockAt(s.x, s.y, { r: s.r * 0.8, color: C.foam, w: 6, dur: 0.55, flat: 0.8, delay: 0.07 });
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, '#ffd890', 2.2); spray(u.x, u.y, 8); }
    H.shake(10);
  };

  // Hammer Heel and Fist Slam: the heel, the fist, coming down on the tank
  IMP.buster = (tg, msg, ctx, H) => {
    const s = tg.live, e = tg.target != null ? ctx.entById(tg.target) : null, x = e ? e.x : s.x, y = e ? e.y : s.y, big = tg.tag === 'brFist', second = !big && s.r > 160;
    if (big) {
      // the fist drops out of the air and the sea leaps up round it
      VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e2) => { const q = clamp(p / 0.28, 0, 1), k = e2.a * (1 - clamp((p - 0.5) / 0.5, 0, 1)); fistShape(c, x, y, s.r * 0.82, 0.9 * k, (1 - easeIn(q)) * 520, t); } });
    } else {
      const b = ctx.bossDraw, ang = b ? Math.atan2(y - b.y, x - b.x) : 0;
      VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e2) => { const q = clamp(p / 0.25, 0, 1), k = e2.a * (1 - clamp((p - 0.45) / 0.55, 0, 1)); sole(c, x, y, ang, s.r * 1.55, 0.9 * k, (1 - easeIn(q)) * 360); } });
    }
    H.shapeFlash(s, '#ffe0a0', { a: 0.3, dur: 0.5 });
    H.bang(x, y, big ? 190 : second ? 170 : 140, { n: 14, color: C.gold, core: '#ffffff', ink: '#3a1e04', dur: 0.5 });
    VFX.hit(x, y, C.goldHi, big ? 3 : 2.4);
    H.shockAt(x, y, { r: s.r * 1.4, color: C.sand, w: 10, dur: 0.6, flat: 0.8 });
    H.shockAt(x, y, { r: s.r * 1.0, color: C.goldHi, w: 5, dur: 0.5, flat: 0.8, delay: 0.05 });
    VFX.sparks(x, y, { color: C.goldHi, n: big || second ? 24 : 16, speed: 420 });
    VFX.debris(x, y, { color: '#9a7e50', n: big ? 16 : 12, speed: 1.5, size: 1.4 });
    sandUp(x, y, 8, { size: 1.2, speed: 1.4 });
    if (big) { spray(x, y, 22, { size: 1.5, up: 1.4, speed: 300 }); VFX.crater(x, y, { r: s.r * 0.55, dur: 3, color: '#ffb040' }); }
    H.shake(big ? 13 : second ? 12 : 9);
    if (big || second) cam(0.1, 0.035, 0.5, 2);
  };

  // Roar of the Stands: the ghost crowd's voice goes through the room; green light rolls in and breaks
  IMP.brRoar = (tg, msg, ctx, H) => {
    H.roomTint(C.ghost, 0.24, 0.9);
    for (let i = 0; i < 4; i++) H.shockAt(0, 0, { r: H.AR * (1.15 - i * 0.18), color: i % 2 ? C.ghostHi : C.ghost, w: 11 - i * 2, dur: 0.7 + i * 0.1, flat: 0.8, delay: i * 0.1 });
    VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * Math.min(1, p / 0.1);
      c.save(); clipRoom(c); c.lineJoin = 'round'; ARENA.trace(c, -4);
      for (const [w, col, a] of [[70, C.ghost, 0.22], [24, C.ghostHi, 0.5], [6, '#ffffff', 0.8]]) { c.strokeStyle = rgba(col, a * k); c.lineWidth = w; c.stroke(); }
      c.restore();
    } });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 30 }, 8)) H.after(Math.random() * 0.3, () => glowSpark(q.x, q.y, C.ghost));
    H.shake(6);
  };
  function glowSpark(x, y, col) { VFX.flash(x, y - 10, 46, col, 0.3); VFX.motes(x, y, { n: 4, color: col, r: 18, rise: 1 }); }

  // Sand Furrow: the line breaks open along its whole length: sand thrown up in a wall, the furrow smoking
  IMP.brFurrow = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    H.shapeFlash(s, '#ffb06a', { a: 0.26, dur: 0.5 });
    H.streak(s.x, s.y, s.angle, C.amber, { len: s.len, w: 22, dur: 0.45 });
    H.streak(s.x, s.y, s.angle, C.goldHi, { len: s.len, w: 6, dur: 0.35 });
    const mid = s.len / 2, R = H.AR * 1.1;
    for (let d = -R, i = 0; d < R; d += 70, i++) {
      const x = s.x + ca * (mid + d), y = s.y + sa * (mid + d); if (ARENA.sd(x, y) > -10) continue;
      H.after(Math.abs(d) / R * 0.28, () => { sandUp(x, y, 2, { size: 0.9 }); VFX.sparks(x, y, { color: C.amber, n: 3, speed: 240 }); if (i % 2) spray(x, y, 2, { size: 0.8 }); });
    }
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, C.amber, 1.8); sandUp(u.x, u.y, 4); }
    H.shake(9);
  };

  // The Tide Rises' raidwide lands as the colosseum goes under: the biggest hit of the pull; the camera holds
  IMP.brRise = (tg, msg, ctx, H) => {
    H.roomTint('#bfeaff', 0.42, 1.2);
    for (let i = 0; i < 4; i++) H.shockAt(0, 0, { r: H.AR * (1.3 - i * 0.2), color: i % 2 ? '#ffffff' : C.spray, w: 14 - i * 3, dur: 0.8 + i * 0.1, flat: 0.8, delay: i * 0.08 });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 14)) H.after(Math.random() * 0.4, () => { spray(q.x, q.y, 10, { size: 1.5, up: 1.6 }); VFX.pillar(q.x, q.y, { r: 20, h: 120 + rand(0, 80), color: C.foam, dur: 0.5 }); });
    H.shake(16); cam(0.16, 0.06, 0.9, 0.5);
  };

  // Breaker's wave: the water's crest crashes over each stretch, foam and spray thrown high
  function waveImp(tg, msg, ctx, H) {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    H.shapeFlash(s, C.spray, { a: 0.2, dur: 0.5 });
    H.streak(s.x, s.y, s.angle, C.foam, { len: s.len, w: 30, dur: 0.4 });
    for (let d = 40, i = 0; d < s.len; d += 70, i++) { const x = s.x + ca * d, y = s.y + sa * d; H.after(d / s.len * 0.12, () => { spray(x + (Math.random() - 0.5) * s.w * 0.6, y, 4, { size: 1.2, up: 1.3 }); if (i % 3 === 0) VFX.shock(x, y, { r: 70, color: C.foam, w: 4, dur: 0.4, flat: 0.8 }); }); }
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, C.spray, 1.8); spray(u.x, u.y, 12, { size: 1.3, up: 1.3 }); }
    H.shake(7);
  }
  IMP.brWave = waveImp; IMP.brWaveBack = waveImp;

  // Undertow Grip: the hand closes: a burst of dark water and a ring; the hand itself is the add that spawns
  IMP.brGrip = (tg, msg, ctx, H) => {
    const s = tg.live;
    H.shapeFlash(s, '#2aa6b0', { a: 0.25, dur: 0.5 });
    VFX.fx({ dur: 0.5, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - p); glow(c, s.x, s.y, s.r * 1.3, '#02080a', 0.55 * k); } });
    H.shockAt(s.x, s.y, { r: s.r * 1.4, color: C.sea, w: 9, dur: 0.55, flat: 0.8 });
    H.shockAt(s.x, s.y, { r: s.r * 0.9, color: C.foam, w: 5, dur: 0.5, flat: 0.8, delay: 0.06 });
    spray(s.x, s.y, 16, { size: 1.3, up: 1.3 });
    H.shake(8);
  };

  // Deep Call: the sea heaves and goes through the room inward, closing on the middle in rings of foam
  IMP.brDeep = (tg, msg, ctx, H) => {
    H.roomTint(C.sea, 0.3, 1.0);
    VFX.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * (1 - clamp((p - 0.5) / 0.5, 0, 1));
      c.save(); clipRoom(c); c.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        const q = clamp(p * 1.25 - i * 0.12, 0, 1); if (q <= 0 || q >= 1) continue;
        c.beginPath(); c.arc(0, 0, 70 + (1 - easeOut(q)) * (H.AR * 1.1), 0, TAU);
        for (const [w, col, a] of [[44 - i * 8, C.sea, 0.22], [16 - i * 3, i % 2 ? C.foam : C.spray, 0.55], [4, '#ffffff', 0.8]]) { c.strokeStyle = rgba(col, a * k * (1 - q * 0.5)); c.lineWidth = w; c.stroke(); }
      }
      glow(c, 0, 0, 260 * (0.5 + p), C.spray, 0.35 * k);
      c.restore();
    } });
    VFX.shock(0, 0, { r: 220, color: C.foam, w: 10, dur: 0.6, flat: 0.8 });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 12)) H.after(Math.random() * 0.4, () => spray(q.x, q.y, 6, { size: 1.2, up: 1.2 }));
    // everyone is dragged in: a streak behind each hero, back the way they came
    for (const u of ctx.units || []) {
      const r = Math.hypot(u.x, u.y), pull = Math.min(170, Math.max(0, r - 70)); if (pull < 20) continue;
      const ang = Math.atan2(-u.y, -u.x);
      H.streak(u.x, u.y - 12, ang, C.foam, { len: pull, w: 12, dur: 0.35 });
      VFX.sparks(u.x, u.y - 10, { color: '#ffffff', n: 5, speed: 200, angle: ang + Math.PI, spread: 0.6 });
    }
    H.shake(11); cam(0.1, 0.045, 0.7, 2);
  };

  // ---------------------------------------------------------------- propfx (boss-vfx.js propFx() asks first when it is his)
  // Victory Leap lands: the sand blown out in a great ring, the spray over it, rocks thrown, the ring shuddering
  function leapLand(msg, H) {
    const x = msg.x, y = msg.y;
    VFX.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - p) * (1 - p); glow(c, x, y, 210 * (0.4 + 0.8 * easeOut(p)), '#ffe0a0', 0.5 * k); } });
    VFX.hit(x, y, '#fff0c8', 3);
    VFX.spikeburst(x, y, { r: 200, n: 14, color: C.sand, core: '#fff6d8', ink: '#3a2a10', dur: 0.5 });
    for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: 320 - i * 70, color: i ? C.foam : C.sand, w: 12 - i * 3, dur: 0.65 + i * 0.1, flat: 0.8, delay: i * 0.07 });
    sandUp(x, y, 16, { size: 1.4, speed: 1.5 }); spray(x, y, 26, { size: 1.6, up: 1.5, speed: 320 });
    VFX.debris(x, y, { color: '#8a7048', n: 14, speed: 1.6, size: 1.5 });
    VFX.crater(x, y, { r: 80, dur: 3.5, color: '#ffb040', cracks: 9, flames: 2 });
    H.shake(14); cam(0.12, 0.04, 0.55, 2);
  }
  // Undertow Grip held too long: the titan slams the held hero: his fist falls out of the sky onto them
  function crush(msg, H) {
    const x = msg.x, y = msg.y;
    VFX.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => { const q = clamp(p / 0.3, 0, 1), k = e.a * (1 - clamp((p - 0.5) / 0.5, 0, 1)); fistShape(c, x, y, 120, 0.92 * k, (1 - easeIn(q)) * 640, t); } });
    VFX.hit(x, y, C.goldHi, 3.4);
    VFX.spikeburst(x, y, { r: 200, n: 14, color: C.spray, core: '#ffffff', ink: '#06303a', dur: 0.5 });
    for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: 300 - i * 70, color: i % 2 ? C.goldHi : C.foam, w: 12 - i * 3, dur: 0.65 + i * 0.1, flat: 0.8, delay: i * 0.07 });
    spray(x, y, 28, { size: 1.6, up: 1.5, speed: 320 }); VFX.debris(x, y, { color: '#6a6a60', n: 14, speed: 1.6, size: 1.5 });
    VFX.crater(x, y, { r: 70, dur: 3.5, color: '#ffb040', cracks: 8, flames: 2 });
    H.shake(15); cam(0.14, 0.05, 0.6, 1.5);
  }
  function prop(msg, H) {
    if (msg.k === 'brland') { leapLand(msg, H); return true; }
    if (msg.k === 'brcrush') { crush(msg, H); return true; }
    return false;
  }
  // the hand closing on a hero rises out of the sea, and breaks back into it
  function handSpawn(x, y, H) {
    spray(x, y, 14, { size: 1.3, up: 1.3 });
    H.shockAt(x, y, { r: 110, color: C.sea, w: 7, dur: 0.5, flat: 0.8 });
    VFX.flash(x, y - 20, 60, C.spray, 0.25); H.shake(5);
  }
  function handDeath(x, y, H) {
    spray(x, y, 26, { size: 1.5, up: 1.5, speed: 280 });
    VFX.debris(x, y, { color: '#b07a2a', n: 8, speed: 1.2 });
    H.shockAt(x, y, { r: 150, color: C.foam, w: 8, dur: 0.55, flat: 0.8 }); H.shockAt(x, y, { r: 90, color: C.goldHi, w: 4, dur: 0.4, flat: 0.8, delay: 0.05 });
    VFX.motes(x, y - 20, { n: 12, color: C.ghostHi, r: 36, rise: 1.6 });   // (the held hero is let go: the crowd cheers)
    H.shake(6); cam(0.07, 0.03, 0.45, 1.5);
  }

  // ---------------------------------------------------------------- the Tide Rises (ArenaView.drawRoomOver hands it over, from roomev 'tide')
  // The colosseum flooding and breaking apart in ten seconds: the sea climbs in off the wall; pillars of water burst up through the sand;
  // the stands tear loose and fly; the ghosts go up as light; at six seconds everything is under (the raidwide) and the floor changes;
  // the water runs off the new ring; and where he stands a column of sea heaves up, and he stands inside it, and it falls away.
  const TIDE = { rim: 560, ring: 478 };
  function tideOver(c, ev, t) {
    const u = t - ev.start; if (u < 0) return;
    if (!S.tide || S.tide.start !== ev.start) S.tide = { start: ev.start, geys: 0, ghost: 0, shake: 0, bolt: 0, base: 0, crown: 0, risen: 0 };
    const T = S.tide, R = TIDE.rim, out = clamp((ev.end - t) / 0.8, 0, 1);
    const cover = u < 6 ? easeIO(clamp(u / 5.9, 0, 1)) : 1;                   // how far the water has climbed in from the wall
    const drain = u < 6 ? 0 : easeOut(clamp((u - 6) / 2.8, 0, 1));              // and how far it has gone out again
    const rIn = u < 6 ? R * (1 - 0.95 * cover) : 28 + (TIDE.ring - 28) * drain; // the water's edge
    const al = u < 6 ? 0.3 + 0.36 * cover : (1 - clamp((u - 8.6) / 1.2, 0, 1)) * 0.46;
    // rumbles through the floor, building
    if (u < 6.4 && u - T.shake > 0.45) { T.shake = u; shakeNow(2 + 4 * clamp(u / 6, 0, 1)); }
    // pillars of water bursting up through the sand
    while (u < 5.6 && u > 0.5 && u > 0.5 + T.geys * 0.27) {
      const i = T.geys++, a = hash(i, 11) * TAU, d = R * (0.2 + 0.72 * hash(i, 12)), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.96;
      VFX.pillar(x, y, { r: 24 + 10 * hash(i, 13), h: 140 + 90 * hash(i, 14), color: C.foam, dur: 0.75 }); spray(x, y, 10, { size: 1.3, up: 1.4 }); VFX.shock(x, y, { r: 80, color: C.foam, w: 4, dur: 0.45, flat: 0.8 });
    }
    // the ghosts of the stands going up as light
    if (u < 3.4 && u > 0.2 && u - T.ghost > 0.06) { T.ghost = u; const a = rand(0, TAU); VFX.spawn({ x: Math.cos(a) * (R - 20), y: Math.sin(a) * (R - 20), z: rand(20, 80), vx: -Math.cos(a) * rand(10, 40), vy: -Math.sin(a) * rand(10, 40), vz: rand(50, 130), life: rand(1.2, 2.2), size: rand(12, 22), size1: 2, color: Math.random() < 0.7 ? C.ghost : C.ghostHi, kind: 'glow' }); }

    // lightning in the storm that comes down with it
    const BOLTS = [3.9, 5.0, 5.75];
    while (T.bolt < BOLTS.length && u >= BOLTS[T.bolt]) { const i = T.bolt++, a = hash(i, 51) * TAU, d = 120 + 300 * hash(i, 52), tx = Math.cos(a) * d, ty = Math.sin(a) * d * 0.9; if (u - BOLTS[i] < 0.5) { VFX.lightning(tx + rand(-120, 120), ty - 760, tx, ty, { color: '#e8fbff', jag: 28, dur: 0.4 }); VFX.hit(tx, ty, C.foam, 1.4); } }
    // the sea heaving up round the place he will stand
    while (T.base < 3 && u >= [4.3, 5.1, 5.9][T.base]) { const i = T.base++; if (u - [4.3, 5.1, 5.9][i] < 0.6) { VFX.shock(0, -380, { r: 330 + 60 * i, color: C.foam, w: 10, dur: 0.9, flat: 0.55 }); spray(0, -380, 16, { size: 1.6, up: 1.6, speed: 300 }); } }
    // and at the last he stands up out of it: the column falls away in a ring of white water, the camera holds
    if (!T.risen && u >= 8.0) {
      T.risen = 1;
      if (u - 8.0 < 0.6) {
        for (let i = 0; i < 3; i++) VFX.shock(0, -380, { r: 420 - i * 90, color: i % 2 ? '#ffffff' : C.spray, w: 12 - i * 3, dur: 0.9 + i * 0.12, flat: 0.55 });
        spray(0, -400, 30, { size: 1.8, up: 1.8, speed: 380 }); VFX.flash(0, -430, 220, C.foam, 0.4);
        shakeNow(10); cam(0.14, 0.05, 0.8, 0);
      }
    }
    // spray flung off the crown of the column
    if (u > 5.0 && u < 8.2 && u - T.crown > 0.05) { T.crown = u; for (let i = 0; i < 2; i++) { const a = rand(0, TAU), d = rand(30, 150); VFX.spawn({ x: Math.cos(a) * d, y: -400 + Math.sin(a) * d * 0.5, z: rand(220, 520), vx: Math.cos(a) * rand(30, 90), vy: Math.sin(a) * 40, vz: rand(-30, 60), g: 300, life: rand(0.8, 1.4), size: rand(10, 18), size1: 2, color: Math.random() < 0.5 ? C.foam : C.spray, kind: 'glow' }); } }

    c.save();
    // --- the storm darkening the room as the water climbs
    const storm = (u < 6.2 ? clamp((u - 1.2) / 4.2, 0, 1) : 1 - clamp((u - 6.2) / 1.6, 0, 1)) * 0.34;
    if (storm > 0.01) { c.fillStyle = rgba('#031a24', storm * out); c.fillRect(-2600, -2600, 5200, 5200); }
    // --- the water
    if (al > 0.01) {
      c.save();
      const outer = u < 6 ? R + 18 : 900, g = c.createRadialGradient(0, 0, Math.max(1, rIn), 0, 0, outer);
      g.addColorStop(0, rgba(C.spray, al * 0.9 * out)); g.addColorStop(0.1, rgba(C.sea, al * out)); g.addColorStop(1, rgba(C.seaDeep, al * 0.9 * out));
      c.beginPath(); c.arc(0, 0, outer, 0, TAU); c.arc(0, 0, Math.max(1, rIn), 0, TAU, true); c.fillStyle = g; c.fill('evenodd');
      // the edge of it, foaming, and a second wave line behind
      for (const [dr, w, a] of [[26, 6, 0.4], [0, 9, 0.9]]) {
        c.beginPath();
        for (let i = 0; i <= 90; i++) { const an = i * TAU / 90, rr = Math.max(2, rIn + dr + 9 * Math.sin(an * 7 + t * 2.2) + 6 * Math.sin(an * 13 - t * 3.1)); i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        c.closePath(); c.strokeStyle = rgba(C.foam, a * Math.min(1, al * 3) * out); c.lineWidth = w; c.stroke();
        if (!dr) { c.strokeStyle = rgba('#ffffff', 0.9 * Math.min(1, al * 3) * out); c.lineWidth = 2.4; c.stroke(); }
      }
      // swells rolling in behind the edge
      if (u < 6) for (let j = 0; j < 4; j++) {
        const off = ((u * 80 + j * 75) % 300), rr0 = rIn + 30 + off, fa = Math.sin(off / 300 * Math.PI) * 0.7;
        if (rr0 > R + 10) continue;
        c.beginPath(); for (let i = 0; i <= 90; i++) { const an = i * TAU / 90, rr = rr0 + 8 * Math.sin(an * 9 - t * 2 + j) + 5 * Math.sin(an * 17 + t * 2.7); i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        c.closePath(); c.strokeStyle = rgba(C.foam, 0.5 * fa * out); c.lineWidth = 5; c.stroke();
      }
      // white water churning across it
      for (let i = 0; i < 40; i++) {
        const an = hash(i, 21) * TAU + Math.sin(t * 0.4 + i) * 0.08, rr = rIn + 20 + hash(i, 22) * Math.max(0, outer - rIn - 40), q = (t * 0.5 + hash(i, 23)) % 1;
        if (rr > outer - 4) continue;
        glow(c, Math.cos(an) * rr, Math.sin(an) * rr, 14 + 18 * hash(i, 24), C.foam, 0.18 * al * 4 * Math.sin(q * Math.PI) * out);
      }
      c.restore();
    }
    // --- the stands and the colonnade tearing loose: stone slabs thrown up off the rim and falling in
    for (let i = 0; i < 16; i++) {
      const born = 1.0 + hash(i, 31) * 4.4, q = (u - born) / 2.5; if (q < 0 || q > 1) continue;
      const a = i * TAU / 16 + hash(i, 32) * 0.3, r0 = R - 24, inw = 150 * q, z = 420 * Math.sin(Math.PI * Math.pow(q, 0.75)), x = Math.cos(a) * (r0 - inw), y = Math.sin(a) * (r0 - inw) * 0.96;
      const w = 34 + 34 * hash(i, 33), h = 18 + 18 * hash(i, 34), rot = a + q * (6 + 5 * hash(i, 35)) * (i % 2 ? 1 : -1);
      ellipse(c, x, y + 4, w * 0.7 * (1 - 0.4 * z / 420), h * 0.6, 0, rgba('#000000', 0.28 * (1 - z / 520) * out));
      c.save(); c.translate(x, y - z); c.rotate(rot); c.globalAlpha = out;
      rrect(c, -w / 2, -h / 2, w, h, 4, i % 3 ? '#6e6a5e' : '#8a7a58', '#1a1612', 2.2);
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(-w / 2 + 3, -h / 2 + 3, w * 0.5, 3);
      c.restore();
      if (q < 0.25) glow(c, Math.cos(a) * r0, Math.sin(a) * r0, 40 * (1 - q * 4), C.foam, 0.5 * out);
    }
    // --- the surge: at six seconds everything goes under
    const fl = Math.max(0, 1 - Math.abs(u - 6.05) / 0.55), lf = BOLTS.reduce((m, b) => Math.max(m, 1 - Math.abs(u - b) / 0.14), 0);
    if (lf > 0.01) { c.fillStyle = rgba('#e8fbff', 0.32 * lf * out); c.fillRect(-2600, -2600, 5200, 5200); }
    if (fl > 0.01) { c.globalCompositeOperation = 'screen'; c.fillStyle = rgba('#bfeaff', 0.5 * fl * fl * out); c.fillRect(-2600, -2600, 5200, 5200); c.globalCompositeOperation = 'source-over'; }
    // --- him, rising in a column of the sea where the ring's north edge will be
    const X = 0, Y = -400, cq = clamp((u - 4.3) / 2.6, 0, 1), hold = u < 7.4 ? 1 : 1 - clamp((u - 7.4) / 2.4, 0, 1);
    if (cq > 0 && hold > 0.01) {
      const hgt = 720 * easeOut(cq), k = hold * out, rx0 = 150 + 40 * Math.sin(u * 1.3);
      c.save();
      // the base: rings of foam spreading across the water
      for (let i = 0; i < 3; i++) { const q = (u * 0.7 + i / 3) % 1; ellipse(c, X, Y + 20, 70 + q * 230, 22 + q * 70, 0, null, rgba(C.foam, 0.6 * (1 - q) * k), 4); }
      // the column
      const gg = c.createLinearGradient(X - rx0, 0, X + rx0, 0); gg.addColorStop(0, rgba('#0c5a68', 0.78 * k)); gg.addColorStop(0.3, rgba(C.sea, 0.72 * k)); gg.addColorStop(0.62, rgba(C.foam, 0.8 * k)); gg.addColorStop(1, rgba('#0c5a68', 0.78 * k));
      c.beginPath();
      for (let h = 0; h <= hgt; h += 16) { const rx = rx0 * (0.78 + 0.22 * Math.sin(h * 0.03 - u * 5)) * (1 - 0.22 * (h / Math.max(1, hgt))); h ? c.lineTo(X - rx, Y + 20 - h) : c.moveTo(X - rx, Y + 20); }
      for (let h = hgt; h >= 0; h -= 16) { const rx = rx0 * (0.78 + 0.22 * Math.sin(h * 0.03 - u * 5 + 1.2)) * (1 - 0.22 * (h / Math.max(1, hgt))); c.lineTo(X + rx, Y + 20 - h); }
      c.closePath(); c.fillStyle = gg; c.fill(); c.strokeStyle = rgba('#ffffff', 0.6 * k); c.lineWidth = 3; c.stroke();
      // the water spiralling up it
      c.lineCap = 'round';
      for (let s = 0; s < 8; s++) {
        c.beginPath();
        for (let h = 0; h <= hgt; h += 14) { const rx = rx0 * 0.8 * (1 - 0.22 * (h / Math.max(1, hgt))), px = X + Math.sin(h * 0.022 - u * 6 + s * 1.05) * rx; h ? c.lineTo(px, Y + 20 - h) : c.moveTo(px, Y + 20); }
        c.strokeStyle = rgba(s % 2 ? '#ffffff' : C.spray, 0.7 * k); c.lineWidth = 4.5; c.stroke();
      }
      // the crown, breaking
      glow(c, X, Y + 20 - hgt, 160, C.foam, 0.4 * k);
      for (let i = 0; i < 14; i++) { const an = hash(i, 41) * TAU + u * 2, d = 80 * hash(i, 42) * (0.5 + cq); glow(c, X + Math.cos(an) * d, Y + 20 - hgt + Math.sin(an) * d * 0.4 - 10, 18 + 14 * hash(i, 43), '#ffffff', 0.5 * k); }
      c.restore();
    }
    c.restore();
  }

  // The Last Round begins: the ghost crowd rises to its feet and the sea answers the bell; three rings of pale light go out through the
  // sand and the room shakes once (a one-shot beat, nothing on the floor)
  function lastRoundOver(ev, t) {
    const u = t - ev.start; if (u < 0 || ev.done) return;
    ev.done = 1;
    if (u > 1.2) return;
    for (let i = 0; i < 3; i++) VFX.shock(0, 0, { r: AR() * (1.1 - i * 0.22), color: i % 2 ? C.ghostHi : C.ghost, w: 11 - i * 3, dur: 0.8 + i * 0.12, flat: 0.8, delay: i * 0.12 });
    for (let i = 0; i < 10; i++) { const a = rand(0, TAU); VFX.spawn({ x: Math.cos(a) * (AR() - 30), y: Math.sin(a) * (AR() - 30), z: rand(10, 60), vx: -Math.cos(a) * rand(20, 60), vy: -Math.sin(a) * rand(20, 60), vz: rand(60, 150), life: rand(1.2, 2.0), size: rand(12, 20), size1: 2, color: i % 2 ? C.ghost : C.ghostHi, kind: 'glow' }); }
    shakeNow(8); cam(0.08, 0.04, 0.6, 0);
  }

  // ---------------------------------------------------------------- the room over the units (ArenaView.drawRoomOver hands it over)
  function roomOver(ctx, room, t, env) {
    const ev = room && room.ev; if (!ev) return;
    for (const key in ev) if (key.startsWith('brpath:') && t < ev[key].end) pathOver(ctx, key, ev[key], t);
    if (ev.tide && t < ev.tide.end) tideOver(ctx, ev.tide, t, env); else if (S.tide) S.tide = null;
    if (ev.lastround && t < ev.lastround.end) lastRoundOver(ev.lastround, t);
  }

  // ---------------------------------------------------------------- the enrage, the entrance, the fall
  // The Final Bell: a huge bronze bell tolling under the sea, the whole ring swamped; each toll a gold ring through the water
  function bellShape(c, cx, cy, sc, k) {
    c.save(); c.translate(cx, cy); c.scale(sc, sc);
    const rx = 410, ry = 150, top = -330;
    // the lip, and the dark inside it
    ellipse(c, 0, 0, rx, ry, 0, rgba('#03181c', 0.85 * k), rgba('#2a1606', 0.9 * k), 5);
    // the body: dome rising from the lip to the crown, bands round it
    const g = c.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, rgba('#2a1a08', 0.92 * k)); g.addColorStop(0.28, rgba('#8a5e1c', 0.95 * k)); g.addColorStop(0.5, rgba('#d8a840', 0.95 * k)); g.addColorStop(0.62, rgba('#7a5218', 0.95 * k)); g.addColorStop(1, rgba('#24140a', 0.92 * k));
    c.beginPath(); c.moveTo(-rx, 0); c.bezierCurveTo(-rx * 0.96, top * 0.35, -rx * 0.55, top * 0.95, -60, top); c.lineTo(60, top); c.bezierCurveTo(rx * 0.55, top * 0.95, rx * 0.96, top * 0.35, rx, 0); c.bezierCurveTo(rx * 0.7, ry * 0.95, -rx * 0.7, ry * 0.95, -rx, 0); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = rgba('#2a1606', 0.95 * k); c.lineWidth = 6; c.stroke();
    c.strokeStyle = rgba('#3a2208', 0.75 * k); c.lineWidth = 5;
    for (const q of [0.28, 0.55, 0.8]) { c.beginPath(); c.ellipse(0, top * q * 0.9 + ry * 0.1 * (1 - q), rx * (1 - q * 0.75), ry * (1 - q * 0.65) * 0.6, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.stroke(); }
    // the sun cast on its shoulder
    glow(c, -70, top * 0.55, 90, C.gold, 0.2 * k);
    circle(c, 0, top * 0.5 + 20, 52, rgba('#c8902a', 0.8 * k), rgba('#2a1606', 0.8 * k), 4);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(Math.cos(a) * 58, top * 0.5 + 20 + Math.sin(a) * 58); c.lineTo(Math.cos(a) * 82, top * 0.5 + 20 + Math.sin(a) * 82); c.strokeStyle = rgba(C.goldHi, 0.8 * k); c.lineWidth = 5; c.stroke(); }
    // the chains going up into the dark
    c.strokeStyle = rgba('#1a1006', 0.9 * k); c.lineWidth = 16; c.beginPath(); c.moveTo(-22, top); c.lineTo(-30, top - 360); c.moveTo(22, top); c.lineTo(30, top - 360); c.stroke();
    c.restore();
  }
  function enrage(sh, b, dur, H) {
    const tolls = [0.22, 0.5, 0.76, 0.95].map(f => f * dur);
    // the sea thickening over everything, then the bell coming up out of the dark beneath it
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => H.wash(c, '#2a8e9a', e.a * 0.4 * Math.min(1, t / dur), 'multiply') }));
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => {
      const q = clamp(t / dur, 0, 1), k = e.a * easeOut(clamp(t / 2.5, 0, 1)) * (1 - clamp((t - dur) / 2.5, 0, 1));
      c.save();
      glow(c, 0, 40, 620, '#04303a', 0.6 * k);
      c.globalAlpha = 0.55 * k; bellShape(c, 0, 90 - 20 * q, 0.74 + 0.26 * easeOut(q), 1); c.globalAlpha = 1;
      // the tolls: rings of gold going out through the water from its lip
      for (const ts of tolls) {
        const age = t - ts; if (age < 0 || age > 2.2) continue;
        for (let i = 0; i < 3; i++) { const a2 = age - i * 0.22; if (a2 < 0) continue; const rr = 60 + a2 * 560, fa = Math.max(0, 1 - a2 / 1.9); ellipse(c, 0, 90, rr, rr * 0.4, 0, null, rgba(C.gold, 0.85 * fa * k), 10 * (1 - a2 / 2.2) + 2); ellipse(c, 0, 90, rr, rr * 0.4, 0, null, rgba('#ffffff', 0.7 * fa * k), 2.4); }
      }
      // waves sloshing up over the ring's edge, heavier as it goes
      c.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        const a = i * TAU / 18 + t * 0.15, rr = 470 - (10 + 40 * q) * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1)), len = 0.12 + 0.12 * hash(i, 5);
        c.beginPath(); c.arc(0, 0, rr, a, a + len); c.strokeStyle = rgba(C.foam, 0.6 * k * (0.4 + q)); c.lineWidth = 10; c.stroke(); c.strokeStyle = rgba('#ffffff', 0.8 * k * (0.4 + q)); c.lineWidth = 2.4; c.stroke();
      }
      c.restore();
    } }));
    tolls.forEach((ts, i) => H.soon(sh, ts, () => {
      H.shockAt(0, 40, { r: H.AR * 1.2, color: C.gold, w: 10, dur: 0.9, flat: 0.8 }); H.shockAt(0, 40, { r: H.AR * 0.8, color: '#ffffff', w: 5, dur: 0.8, flat: 0.8, delay: 0.1 });
      H.roomTint(C.gold, 0.1 + 0.04 * i, 0.7); H.shake(5 + i * 2);
    }));
    H.emit(sh, dur + 2, 0.6, () => { const q = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(10, 40), vz: rand(30, 90), vx: rand(-15, 15), life: rand(1.2, 2), size: rand(4, 8), size1: 1, color: Math.random() < 0.5 ? C.foam : C.gold, kind: 'glow' }); });
  }
  function enrageLand(b, H) {
    VFX.fx({ dur: 1.8, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - clamp((p - 0.3) / 0.7, 0, 1)); bellShape(c, 0, 70, 1.05 + 0.2 * easeOut(clamp(p / 0.4, 0, 1)), k * 0.85); } });
    for (let i = 0; i < 4; i++) H.shockAt(0, 40, { r: H.AR * (1.5 - i * 0.2), color: i % 2 ? '#ffffff' : C.gold, w: 16 - i * 3, dur: 0.9 + i * 0.1, flat: 0.8, delay: i * 0.1 });
    H.roomTint('#fff0a8', 0.45, 1.2);
    spray(0, 0, 40, { size: 2, up: 2, speed: 460 });
    H.shake(16);
  }
  // the entrance: the crowd roars him in, the sand ring leaps up round his feet
  function intro(sh, b, H) {
    H.soon(sh, 0.15, () => { for (let i = 0; i < 3; i++) H.shockAt(0, 0, { r: AR() * (1.1 - i * 0.2), color: i % 2 ? C.ghostHi : C.ghost, w: 9 - i * 2, dur: 0.7 + i * 0.1, flat: 0.8, delay: i * 0.1 }); });
    H.soon(sh, 0.9, () => { H.shockAt(b.x, b.y, { r: 280, color: C.sand, w: 9, dur: 0.8, flat: 0.8 }); H.shockAt(b.x, b.y, { r: 170, color: C.goldHi, w: 5, dur: 0.6, flat: 0.8, delay: 0.1 }); sandUp(b.x, b.y, 8, { size: 1.2 }); spray(b.x, b.y, 12, { size: 1.2 }); });
    H.soon(sh, 1.6, () => { VFX.flash(b.x, b.y - 40, 100, C.gold, 0.3); H.shake(5); });
  }
  // his fall: the Tidewrought sinks back under the sea, the water closing over him, and his shield is left turning slowly on the swell
  function death(sh, b, H) {
    H.soon(sh, 0.3, () => { H.shockAt(b.x, b.y + 60, { r: 320, color: C.foam, w: 10, dur: 0.8, flat: 0.8 }); H.shake(9); });
    H.soon(sh, 1.2, () => { spray(b.x, b.y + 80, 34, { size: 1.8, up: 1.8, speed: 340 }); H.shockAt(b.x, b.y + 80, { r: 460, color: C.spray, w: 12, dur: 1.0, flat: 0.8 }); VFX.smoke(b.x, b.y + 40, { n: 8, color: C.foam, size: 54, a: 0.5, speed: 140 }); H.shake(12); });
    H.emit(sh, 2.6, 0.45, (p) => { const a = rand(0, TAU), d = rand(0, 150); VFX.spawn({ x: b.x + Math.cos(a) * d, y: b.y + 60 + Math.sin(a) * d * 0.5, z: rand(0, 30), vx: rand(-20, 20), vz: rand(30, 120), g: 120, life: rand(0.8, 1.6), size: rand(8, 16), size1: 1, color: p < 0.5 ? C.foam : C.spray, kind: 'glow' }); });
    // the shield: his Sunwheel, left behind, drifting on the swell with rings spreading from it
    const sx = b.x + 90, sy = b.y - 170;   // (out in the sea beyond the ring's north edge, where he stood)
    VFX.fx({ dur: 18, delay: 1.7, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.9) * Math.min(1, (18 - t) / 3), bob = Math.sin(t * 1.4) * 5;
      c.save();
      for (let i = 0; i < 3; i++) { const q = (t * 0.45 + i / 3) % 1; ellipse(c, sx, sy + 14, 60 + q * 150, 20 + q * 50, 0, null, rgba(C.foam, 0.5 * (1 - q) * k), 3); }
      wheelDisc(c, sx + Math.sin(t * 0.7) * 6, sy + bob, 74, t * 0.35, k, { lift: 22 });
      c.restore();
    } });
  }

  return {
    tell: tag => TELLS[tag] || null, buster, zone, floor, roomOver, aftermath, prop, enrage, enrageLand, intro, death, handSpawn, handDeath,
    // (boss-vfx.js impact(): his moves land here; a tag it does not know falls through to the shared ones)
    impact(tg, msg, ctx, H) {
      const f = tg.type === 'buster' ? IMP.buster : IMP[tg.tag]; if (!f) return false;
      f(tg, msg, ctx, H); return true;
    },
    wheelDisc, spray,
  };
})();
