// Ormun, the Tide-Weigher: how every move of his looks on the floor and when it lands. His body is ormun-art.js, the Scales are ormun-room.js, and ormun-view.js
// is the camera, his poses, the weights, the beam's pips, the red on a judged pan and the water; this file is everything that makes a move his own. Loaded after
// ormun-view.js; the shared files reach it through OR_FX (every call is guarded by `typeof OR_FX !== 'undefined'`).
//
// THE TELLS (boss-tells.js get() -> OR_FX.tell(tag): a tell of his is laid over the exact shape, which keeps its red (damage) or blue (a soak) and is never
// hidden or dimmed): a judgement is his palm held over the pan, its shadow settling onto the floor as the bar runs (the pan's red is still ONE telegraph per
// pan, drawn by ormun-view.js, and these are laid over it); the flood is water welling up through the pan's seams, a foam front creeping in over the rim; the
// Heavy Hand is the shadow of his arm and fist, laid down the cone to the tank; a Counterweight a weight's shadow settling over the hero, a dial of marks turning
// round it; Scatter the Silver a fist over the cradle, the stone crazing from under it; the Bridge Breaks the planks crazing, water coming up through them.
// THE LANDINGS (boss-vfx.js impact(), before the shared ones): his are heavy, slow and few: the palm that comes down on a pan (a wet print the hand leaves, three
// slow rings crossing the pan, spray thrown up all round the rim, and the whole scale dipping with it), the flood sweeping in over the rim, the fist, the weight
// thudding into its cradle, a cracked one splitting, a silver one breaking into ones that roll home. Nothing fills the screen; no warm colour in any of it.
// THE VERDICT (roomev ormread, half a second before the strike): the beam stops dead: a thin line of light runs along it to the lit pan's side, the three
// chains of that pan draw taut and its lip catches the light. The strike then has its weight (the landings above and ormfall's dip).
// EXACT MEASURE: the lit pan (orscales.exact) has its lip drawn out in white notches and a plaque with its number hangs from the beam above it.
// THE TIDE THAT WEIGHS TOO (Extreme, orscales.waterL / waterR): the water a pan carries is a band of water along its rim, wider for each point it adds.
// Palette: silver, black water, frost blue, pale sea-stone. Red is damage and blue is a soak and nothing else is either.

const OR_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, q) => a + (b - a) * q;
  const easeIn = q => q * q;
  const C = { hi: '#f6fbff', silver: '#d9e3ee', stone: '#bfcad5', stoneD: '#7d8ea0', frost: '#9fd0ff', frostH: '#e6f4ff', water: '#8fbbe0', waterD: '#3d6c9a', deep: '#17304a', ink: '#070b12', sea: '#07111d', shade: '#030a14' };
  const PANS = [{ x: -380, y: 60 }, { x: 380, y: 60 }], HIM = { x: 0, y: -170 }, PR = 280, TAU2 = Math.PI * 2;
  const danger = () => (typeof BossTells !== 'undefined' && BossTells.COL ? BossTells.COL.danger : '#ff3b2f');
  const flashK = () => (typeof FX !== 'undefined' && FX.flashK != null ? FX.flashK : 1);
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };
  const camFx = (stop = 0.06, punch = 0.025, dur = 0.5) => { try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ } };
  const isMe = id => typeof Net !== 'undefined' && Net && id === Net.id;
  const failed = {};
  const fail = (what, e) => { if (!failed[what]) { failed[what] = 1; if (typeof console !== 'undefined') console.warn('ormun-fx: ' + what + ' failed once (logged once)', e); } };
  const S = { room: null, t: 0, marks: [], later: [], kick: null, read: null, pieces: [], pos: new Map(), seen: new Map(), plate: 0, flare: [] };
  const isScales = () => typeof ArenaView !== 'undefined' && ArenaView.amb && ArenaView.amb.kind === 'scales';
  const evs = () => (typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.ev) || {};
  const panIdx = x => (x < 0 ? 0 : 1);
  const panKey = x => (x < 0 ? 'L' : 'R');
  const pose = (i, t) => {   // where pan i is drawn just now (the room's own numbers)
    try { if (typeof OR_ROOM !== 'undefined' && OR_ROOM.panPose && ArenaView.amb) { const q = OR_ROOM.panPose(ArenaView.amb, i, t); return { x: q.cx, y: q.cy, k: q.k }; } } catch (e) { /* cosmetic */ }
    return { x: PANS[i].x, y: PANS[i].y, k: 1 };
  };
  const real = s => !!s && Math.abs(s.y) < 1500 && Math.abs(s.x) < 1500 && !(s.kind === 'circle' && s.r < 8);

  // ---------------------------------------------------------------- a hand, an arm, a fist: seen from above, fingers along +x, wrist at -x
  // every part is wound the same way, so the whole is one path and one fill
  function capsule(c, x0, y0, x1, y1, r) {
    const a = Math.atan2(y1 - y0, x1 - x0), n = a - Math.PI / 2, m = a + Math.PI / 2;
    c.moveTo(x0 + Math.cos(n) * r, y0 + Math.sin(n) * r); c.lineTo(x1 + Math.cos(n) * r, y1 + Math.sin(n) * r);
    c.arc(x1, y1, r, n, m, false); c.lineTo(x0 + Math.cos(m) * r, y0 + Math.sin(m) * r); c.arc(x0, y0, r, m, m + Math.PI, false); c.closePath();
  }
  const FING = [[-44, -0.2, 78, 11.5], [-15, -0.07, 102, 13], [15, 0.07, 96, 13], [44, 0.2, 72, 11.5]];
  function handPath(c, o = {}) {
    c.beginPath();
    c.moveTo(70, 0); c.ellipse(0, 0, 70, 60, 0, 0, TAU2);
    for (const [y, a, L, r] of FING) capsule(c, 40, y, 40 + Math.cos(a) * L, y + Math.sin(a) * L, r);
    capsule(c, -6, -48, 34, -106, 14.5);
    if (o.arm) capsule(c, -240, 0, -40, 0, 50);
  }
  function fistPath(c, o = {}) {
    c.beginPath();
    c.moveTo(60, 0); c.ellipse(0, 0, 60, 54, 0, 0, TAU2);
    for (const y of [-36, -12, 12, 36]) { c.moveTo(52 + 17, y); c.arc(52, y, 17, 0, TAU2, false); }
    capsule(c, 6, -50, 40, -64, 15);
    if (o.arm) capsule(c, -260, 0, -30, 0, 50);
  }
  // a shadow of a hand: dark, with a cold edge, the way it falls on a pan (a is its strength; edge its outline)
  function shade(c, path, a, edge, o = {}) {
    c.save(); path();
    c.fillStyle = rgba(C.shade, a); c.fill();
    if (edge > 0.01) { c.lineJoin = 'round'; c.strokeStyle = rgba(C.ink, edge * 0.8); c.lineWidth = 4; c.stroke(); c.strokeStyle = rgba(o.edge || C.frost, edge); c.lineWidth = 1.5; c.stroke(); }
    c.restore();
  }
  // a hand laid at (x, y), turned to `ang` (its fingers' way), at scale sc; a left-hand pan sees it flipped so the thumb stays up the screen
  function handAt(c, x, y, ang, sc, a, edge, o = {}) {
    if (a <= 0.005) return;
    c.save(); c.translate(x, y); c.rotate(ang); if (Math.cos(ang) < 0) c.scale(1, -1); c.scale(sc, sc);
    shade(c, () => (o.fist ? fistPath(c, o) : handPath(c, o)), a, edge, o);
    c.restore();
  }
  const waveRing = (c, cx, cy, r, amp, t, seed) => {
    c.beginPath(); const N = 96;
    for (let i = 0; i <= N; i++) { const th = i / N * TAU2, rr = r + Math.sin(th * 13 + t * 1.6 + seed) * amp + Math.sin(th * 29 - t * 2.3 + seed * 2) * amp * 0.5, x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.closePath();
  };
  // rings spreading on a still surface: where a drop fell (the sea dripping from his hand)
  function ripples(c, cx, cy, R, n, rate, a, t, seed, big = 1) {
    for (let i = 0; i < n; i++) {
      const hx = hash(i, seed), hy = hash(i, seed + 7), q = (t * rate * (0.7 + 0.6 * hash(i, seed + 3)) + hash(i, seed + 5)) % 1, d = Math.sqrt(hx) * R * 0.78, th = hy * TAU2;
      const x = cx + Math.cos(th) * d, y = cy + Math.sin(th) * d * 0.9, rr = (6 + q * 30) * big;
      c.beginPath(); c.ellipse(x, y, rr, rr * 0.7, 0, 0, TAU2); c.strokeStyle = rgba(C.frostH, Math.sin(q * Math.PI) * 0.32 * a); c.lineWidth = 1.4; c.stroke();
    }
  }
  // a crack in stone: a dark edge and a pale body
  function crack(c, x1, y1, x2, y2, seed, k, o = {}) {
    if (k <= 0.01) return;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / (o.seg || 22))), nx = -dy / L, ny = dx / L, jag = o.jag ?? 6;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n, j = (hash(i, seed) - 0.5) * 2 * jag; c.lineTo(x1 + dx * u + nx * j, y1 + dy * u + ny * j); }
    c.lineTo(x2, y2);
    c.strokeStyle = rgba(C.ink, 0.5 * k); c.lineWidth = (o.w || 1.6) + 2.2; c.stroke(); c.strokeStyle = rgba(o.col || C.frostH, Math.min(1, 0.85 * k)); c.lineWidth = o.w || 1.6; c.stroke();
    c.restore();
  }
  function crackStar(c, x, y, r, n, seed, k, o = {}) {
    for (let i = 0; i < n; i++) { const a = i * TAU2 / n + hash(i, seed) * 0.7, d = r * (0.5 + 0.5 * hash(i, seed + 1)), fl = o.flat ?? 0.85; crack(c, x + Math.cos(a) * 6, y + Math.sin(a) * 6 * fl, x + Math.cos(a) * d, y + Math.sin(a) * d * fl, seed + i, k, { w: o.w || 1.4, jag: o.jag ?? 5, seg: 18, col: o.col }); }
  }
  // the red under every damaging area of his, at the strength of the shared tell (boss-tells.js outline() draws the rim over it)
  function wash(c, s, p, k, t, a0 = 0.16) {
    const late = Math.max(0, (p - 0.75) / 0.25), pulse = late > 0 ? 0.5 + 0.5 * Math.sin(t * (10 + late * 22)) : 0;
    c.save(); SHAPES.trace(c, s); c.fillStyle = rgba(danger(), (a0 + 0.1 * late + 0.06 * pulse) * k); c.fill('evenodd'); c.restore();
  }
  const inCone = (c, s, fn) => { c.save(); c.translate(s.x, s.y); c.rotate(s.angle); fn(s.r, s.arc / 2); c.restore(); };
  const inLane = (c, s, fn) => { c.save(); c.translate(s.x, s.y); c.rotate(s.angle); fn(s.len, s.w / 2); c.restore(); };

  // ---------------------------------------------------------------- the warnings
  const TELLS = {};
  // A judgement: his palm held over the pan. It looms, large and soft, and settles onto the floor as the bar runs out; at the lock it is sharp and still. A light
  // strike (both pans, level) is the same palm held lower and fainter. The sea drips from it. It is laid over the pan's red, which is untouched.
  TELLS.ormJudge = { outline: false, ground(ctx, tg, s0, p, k, t, env) {
    const O = env.room && env.room.orv; if (!O || !tg._orPan || O.owner[tg._orPan] !== tg) return;
    const pan = tg._orPan, a = (O.panA[pan] || 0) * k; if (a < 0.03) return;
    const s = tg._orShape || s0, left = Math.max(0, tg.start + tg.dur - t), u = clamp(1 - left / Math.max(2, tg.dur), 0, 1), lock = left < 0.5;
    const sc = env.room.ev && env.room.ev.orscales, light = !!(sc && sc['strike' + pan] === 2), settle = easeOut(u);
    if (pan === 'B') {
      // the bridge: the sea sheeting over the planks, a long swell of foam running down it
      ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
      inLane(ctx, s, (L, hw) => {
        for (let i = 0; i < 7; i++) { const x = ((t * (26 + 30 * u) + i * L / 7) % L), y = (hash(i, 5) * 2 - 1) * hw * 0.8; const g = ctx.createLinearGradient(x - 50, 0, x + 18, 0); g.addColorStop(0, rgba(C.frostH, 0)); g.addColorStop(1, rgba(C.frostH, (0.12 + 0.2 * u) * a)); ctx.fillStyle = g; ctx.fillRect(x - 50, y - 3, 68, 6); }
        ripples(ctx, L / 2, 0, hw * 1.3, 5, 0.5, a, t, 31, 0.8);
      });
      ctx.restore(); return;
    }
    const cx = s.x, cy = s.y, ang = Math.atan2(cy - HIM.y, cx - HIM.x), sz = (light ? 0.9 : 1.22) * (1 + 0.5 * (1 - settle) * (lock ? 0 : 1));
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, s.r - 1, 0, TAU2); ctx.clip();
    ripples(ctx, cx, cy, s.r, light ? 4 : 7, 0.45 + 0.5 * u, a, t, pan === 'L' ? 11 : 12);
    const fa = (0.07 + 0.15 * settle + (lock ? 0.05 : 0)) * a * (light ? 0.7 : 1), edge = (0.1 + 0.3 * settle + (lock ? 0.3 : 0)) * a;
    handAt(ctx, cx - Math.cos(ang) * 28, cy - Math.sin(ang) * 28, ang, sz, fa, edge, { edge: lock ? C.hi : C.frost });
    // a shiver of light on the water the palm is holding back: it grows with the bar
    glow(ctx, cx, cy, s.r * 0.8, C.frost, 0.05 * a * (0.5 + settle));
    ctx.restore();
  } };
  // The flood: water welling up through the pan's seams before it comes, beads of it at each seam's head, and a foam front creeping in from the rim. The red band
  // is the exact edge; this lies inside it.
  function floodTell(ctx, tg, s0, p, k, t, env) {
    const O = env.room && env.room.orv; if (!O || !tg._orPan || O.owner[tg._orPan] !== tg) return;
    const pan = tg._orPan, a = (O.panA[pan] || 0) * k; if (a < 0.03) return;
    const s = Object.assign({}, tg._orShape || s0); if (s.kind !== 'donut') return;
    if (O.r2[pan] != null) s.r2 = O.r2[pan];
    const u = clamp(1 - Math.max(0, tg.start + tg.dur - t) / Math.max(2, tg.dur), 0, 1), cx = s.x, cy = s.y, rO = s.r, rI = s.r2, w = rO - rI, seed = pan === 'L' ? 3 : 9, lock = (tg.start + tg.dur - t) < 0.5;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip('evenodd');
    ctx.fillStyle = rgba(C.deep, (0.1 + 0.16 * u) * a); ctx.fillRect(cx - rO - 4, cy - rO - 4, 2 * rO + 8, 2 * rO + 8);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const N = 18;
    for (let i = 0; i < N; i++) {
      const th = (i + hash(i, seed) * 0.7) * TAU2 / N, g = clamp((u * 1.5 - hash(i, seed + 2) * 0.4) / 0.7, 0, 1) * (0.8 + 0.2 * Math.sin(t * 1.7 + i)); if (g <= 0.02) continue;
      const rStop = rO - 6 - g * (w - 20), pts = [];
      for (let j = 0; j <= 7; j++) { const rr = rO - 6 - (rO - 6 - rStop) * j / 7, off = (hash(j, seed + i) - 0.5) * 0.045; pts.push([cx + Math.cos(th + off) * rr, cy + Math.sin(th + off) * rr]); }
      ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = rgba(C.ink, 0.5 * a); ctx.lineWidth = 4.4; ctx.stroke(); ctx.strokeStyle = rgba(C.frost, (0.3 + 0.4 * g) * a); ctx.lineWidth = 1.6; ctx.stroke();
      const hd = pts[pts.length - 1], pu = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
      ctx.beginPath(); ctx.arc(hd[0], hd[1], 3.4 + 2 * pu * g, 0, TAU2); ctx.fillStyle = rgba(C.frostH, 0.85 * a); ctx.fill(); ctx.strokeStyle = rgba(C.ink, 0.5 * a); ctx.lineWidth = 1; ctx.stroke();
      glow(ctx, hd[0], hd[1], 14 + 8 * pu, C.frost, 0.28 * a * g);
    }
    // the foam front along the inner edge: it breathes and it creeps in a little as the bar runs out
    const rf = rI + 4 - (lock ? 4 : 0) * 0;
    waveRing(ctx, cx, cy, rf + 3 * u, 3.4, t, seed); ctx.strokeStyle = rgba(C.ink, 0.35 * a); ctx.lineWidth = 6.5; ctx.stroke();
    waveRing(ctx, cx, cy, rf + 3 * u, 3.4, t, seed); ctx.setLineDash([26, 14]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = rgba(C.frostH, (0.5 + 0.3 * u) * a); ctx.lineWidth = 3.4; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  TELLS.ormUnder = { outline: false, ground: floodTell };
  TELLS.ormTwin = { outline: false, ground: floodTell };

  // Heavy Hand: the shadow of his arm laid down the cone, ending in his fist over the tank; water flung along it from the sleeve; the floor crazing where it falls
  function handTell(ctx, tg, s, p, k, t, env) {
    const tgt = tg.target != null && env.entById ? env.entById(tg.target) : null, u = easeOut(p), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1);
    wash(ctx, s, p, k, t, 0.13);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    inCone(ctx, s, (r, h) => {
      const d = clamp((tgt ? Math.hypot(tgt.x - s.x, tgt.y - s.y) : r * 0.6) + 60, 240, r * 0.92), hov = 1 + 0.55 * (1 - u) * (1 - late);
      // the arm: a long shade down the axis, the sleeve's weight on it
      const g = ctx.createLinearGradient(0, 0, d, 0); g.addColorStop(0, rgba(C.shade, 0)); g.addColorStop(0.5, rgba(C.shade, (0.08 + 0.12 * u) * k)); g.addColorStop(1, rgba(C.shade, (0.16 + 0.2 * u) * k));
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(d, -62 * hov); ctx.lineTo(d, 62 * hov); ctx.lineTo(0, 40); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.translate(d, 0); ctx.scale(hov * 1.3, hov * 1.3);
      shade(ctx, () => fistPath(ctx, { arm: false }), (0.1 + 0.24 * u + 0.06 * late) * k, (0.15 + 0.35 * u + 0.35 * late) * k, { edge: late > 0.3 ? C.hi : C.frost });
      ctx.restore();
      // water thrown along it from his sleeve
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) { const q = (t * (0.9 + 0.6 * u) + hash(i, 4)) % 1, x = 70 + q * (d - 60), y = (hash(i, 6) - 0.5) * 78 * (0.5 + q * 0.6); ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x, y); ctx.strokeStyle = rgba(C.frostH, Math.sin(q * Math.PI) * (0.28 + 0.3 * u) * k); ctx.lineWidth = 1.8; ctx.stroke(); }
      // the floor under the fist crazing as the blow comes
      crackStar(ctx, d, 0, 34 + 90 * u * u, 9, tg.id, (0.08 + 0.5 * u * u) * k, { flat: 1, w: 1.3 });
    });
    ctx.restore();
  }

  // Counterweight / Hollow Weight: a weight's shadow settling over the hero it will fall on, a dial of marks turning round the ring, ripples inside
  function dropTell(ctx, tg, s, p, k, t, env) {
    const crack = tg.tag === 'ormHollow', u = easeOut(p), cx = s.x, cy = s.y, r = s.r;
    wash(ctx, s, p, k, t, 0.15);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    // the shadow: a drum seen from above, larger and paler while it is high, small, dark and sharp as it comes down
    const hov = 1 + 0.6 * (1 - u), sh = (crack ? 0.74 : 0.82) * r * hov * 0.62;
    ctx.beginPath(); ctx.ellipse(cx, cy + 4, sh, sh * 0.74, 0, 0, TAU2); ctx.fillStyle = rgba(C.shade, (0.16 + 0.28 * u) * k); ctx.fill();
    ctx.strokeStyle = rgba(C.ink, (0.3 + 0.4 * u) * k); ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = rgba(crack ? '#b5c4d6' : C.frostH, (0.35 + 0.5 * u) * k); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy + 4, sh * 0.62, sh * 0.62 * 0.74, 0, 0, TAU2); ctx.strokeStyle = rgba(C.frostH, 0.3 * u * k); ctx.lineWidth = 1.2; ctx.stroke();
    if (crack) { ctx.beginPath(); ctx.moveTo(cx - sh * 0.6, cy - sh * 0.3); ctx.lineTo(cx - sh * 0.1, cy + 2); ctx.lineTo(cx - sh * 0.25, cy + sh * 0.25); ctx.lineTo(cx + sh * 0.4, cy + sh * 0.5); ctx.strokeStyle = rgba(C.hi, 0.7 * k); ctx.lineWidth = 1.4; ctx.stroke(); }
    // a weighing dial: tick marks round the ring, turning slowly, quickening
    for (let i = 0; i < 20; i++) { const a = i * TAU2 / 20 + t * (0.3 + 0.9 * u), l = i % 5 ? 7 : 13; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); ctx.lineTo(cx + Math.cos(a) * (r - 4 - l * 1.3), cy + Math.sin(a) * (r - 4 - l * 1.3)); ctx.strokeStyle = rgba(C.hi, (i % 5 ? 0.5 : 0.85) * (0.5 + 0.5 * u) * k); ctx.lineWidth = i % 5 ? 1.8 : 2.8; ctx.stroke(); }
    ripples(ctx, cx, cy, r * 0.9, 4, 0.5 + u, k, t, tg.id % 17, 0.8);
    ctx.restore();
  }
  TELLS.ormCW = { ground: dropTell }; TELLS.ormHollow = { ground: dropTell };

  // Scatter the Silver: his fist over the cradle, the floor under it crazing, specks of silver lifting off the weight as it is about to break
  TELLS.ormScatter = { ground(ctx, tg, s, p, k, t) {
    const u = easeOut(p), cx = s.x, cy = s.y, r = s.r, late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), ang = Math.atan2(cy - HIM.y, cx - HIM.x);
    wash(ctx, s, p, k, t, 0.17);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    crackStar(ctx, cx, cy, r * (0.3 + 0.65 * u), 10, tg.id, (0.12 + 0.55 * u) * k, { flat: 0.9, w: 1.5 });
    handAt(ctx, cx - Math.cos(ang) * 16, cy - Math.sin(ang) * 16, ang, 0.98 * (1 + 0.5 * (1 - u)), (0.12 + 0.26 * u + 0.06 * late) * k, (0.15 + 0.4 * u + 0.3 * late) * k, { fist: true, edge: late > 0.3 ? C.hi : C.frost });
    for (let i = 0; i < 7; i++) { const q = (t * 0.6 + hash(i, 2)) % 1, a = hash(i, 3) * TAU2, d = 14 + q * 44; glow(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 8, C.hi, Math.sin(q * Math.PI) * 0.5 * u * k); }
    ctx.restore();
  } };

  // The Bridge Breaks: the planks crazing along their length, the sea coming up through the cracks, a fist's shadow over each end
  TELLS.ormBreak = { ground(ctx, tg, s, p, k, t) {
    const u = easeOut(p), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1);
    wash(ctx, s, p, k, t, 0.15);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    inLane(ctx, s, (L, hw) => {
      for (let i = 0; i < 7; i++) { const x0 = L * (0.08 + 0.84 * (i + hash(i, 4)) / 7), y0 = (hash(i, 8) - 0.5) * hw * 1.2, ln = hw * (0.5 + 0.9 * u) * (0.5 + hash(i, 9)); crack(ctx, x0, y0, x0 + (hash(i, 11) - 0.5) * 30, y0 + (i % 2 ? 1 : -1) * ln, i + 5, (0.12 + 0.6 * u) * k, { w: 1.5, jag: 5, seg: 16 }); }
      for (let i = 0; i < 6; i++) { const x = L * (0.1 + 0.8 * hash(i, 14)), y = (hash(i, 15) - 0.5) * hw * 1.1, q = (t * 0.6 + hash(i, 16)) % 1; glow(ctx, x, y, 10 + 8 * q, C.frostH, Math.sin(q * Math.PI) * 0.4 * u * k); }
      for (const sx of [0.22, 0.78]) { ctx.save(); ctx.translate(L * sx, 0); ctx.scale(0.64 * (1 + 0.5 * (1 - u)), 0.64 * (1 + 0.5 * (1 - u))); ctx.rotate(-s.angle - Math.PI / 2 + Math.PI); shade(ctx, () => fistPath(ctx, {}), (0.07 + 0.17 * u + 0.05 * late) * k, (0.1 + 0.3 * u) * k); ctx.restore(); }
    });
    ctx.restore();
  } };

  // the act's light raidwide: a swell going out across the water from where he stands, slow, three rings
  TELLS.ormBeat = { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
    const b = (env && env.boss) || HIM;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const q = (t * (0.28 + 0.3 * p) + i / 3) % 1, r = 150 + q * 620; ctx.beginPath(); ctx.ellipse(b.x, b.y + 40, r, r * 0.55, 0, 0, TAU2); ctx.strokeStyle = rgba(C.frostH, Math.sin(q * Math.PI) * (0.05 + 0.18 * p) * k); ctx.lineWidth = 8 * (1 - q * 0.6); ctx.stroke(); }
    ctx.restore();
  } };

  // ---------------------------------------------------------------- what stays on the floor
  const later = (t, fn) => S.later.push({ at: t, fn });
  function mark(dur, draw, x, y) { S.marks.push({ t0: S.t, dur, draw, x, y }); if (S.marks.length > 36) S.marks.shift(); }
  function drawMarks(ctx, t) {
    for (let i = S.marks.length - 1; i >= 0; i--) {
      const m = S.marks[i], age = t - m.t0;
      if (age >= m.dur || age < -1) { if (age >= m.dur) S.marks.splice(i, 1); continue; }
      const f = clamp(1 - (age - m.dur * 0.35) / (m.dur * 0.65), 0, 1) * clamp(age / 0.1, 0, 1);
      ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
      try { m.draw(ctx, f * 0.7, age, Math.floor(m.x * 7 + m.y * 3) & 1023); } finally { ctx.restore(); }
    }
  }

  // ---------------------------------------------------------------- weight: what an ordinary blow does to the Scales, and how they settle
  // The struck pan dips and rings on its chains (a damped swing: down at once, back up past level, settling over about three seconds), the other pan answers a beat
  // later and smaller, the chains rattle with it (they follow the pan's lugs: ormun-room.js), and the water along the struck rim wobbles in a band and stills. It is the
  // room's own amb.heave at a fraction of walls/ormun.js's staged swings (added in the scalesLife wrapper below, so a staged swing underneath still plays whole); nothing here
  // moves a telegraph, a hero or the landing; no shake, flash or sound is added. mag: 0.4 a light judgement .. 1.1 Heavy Hand (the heaviest ordinary thing he does).
  const WJ = [], WR = [];
  function weightHit(x, y, mag, o = {}) {
    const d0 = Math.hypot(x - PANS[0].x, y - PANS[0].y), d1 = Math.hypot(x - PANS[1].x, y - PANS[1].y), near = d0 < d1 ? 0 : 1, on = Math.min(d0, d1) < PR + 30;
    const add = (i, a, delay) => { WJ.push({ i, t0: S.t + delay, a }); WR.push({ i, t0: S.t + delay, a }); };
    if (o.both || !on) { const m = mag * (o.both ? 0.8 : 0.5); add(0, m, 0); add(1, m, 0.06); } else { add(near, mag, 0); add(1 - near, mag * 0.45, 0.24); }
    while (WJ.length > 10) WJ.shift(); while (WR.length > 10) WR.shift();
    if (o.rim && on) for (const q of rimPts(near, o.rim, 290)) later(S.t + 0.05 + hash(q.th, 5) * 0.2, () => spray(q.x, q.y, 1, { angle: q.th, spread: 0.6, size: 0.75, up: 0.7, mist: false }));
  }
  function joltAt(a, t) {
    let h = a.heave;
    if (!WJ.length) { if (h && h._ours) for (const o of h) { o.k = 0; o.x = 0; o.y = 0; } return; }
    if (!Array.isArray(h)) { h = a.heave = [{ k: 0, x: 0, y: 0 }, { k: 0, x: 0, y: 0 }]; h._ours = 1; } else if (h._ours) for (const o of h) { o.k = 0; o.x = 0; o.y = 0; }
    for (let j = WJ.length - 1; j >= 0; j--) {
      const w = WJ[j], age = t - w.t0;
      if (age > 4.8) { WJ.splice(j, 1); continue; }
      if (age < 0) continue;
      const env = (age < 0.1 ? age / 0.1 : 1) * Math.exp(-age / 1.35), osc = Math.cos(TAU2 * 0.45 * age), o = h[w.i];
      o.y += w.a * 17 * env * osc; o.k -= w.a * 0.03 * env * osc; o.x += w.a * 2.6 * env * Math.sin(age * 31);
    }
  }
  function drawRims(ctx, t) {
    for (let j = WR.length - 1; j >= 0; j--) {
      const w = WR[j], age = t - w.t0;
      if (age > 4.6) { WR.splice(j, 1); continue; }
      if (age < 0) continue;
      const env = (age < 0.12 ? age / 0.12 : 1) * Math.exp(-age / 1.4) * Math.min(1, w.a), q = pose(w.i, t);
      if (env < 0.02) continue;
      ctx.save(); ARENA.trace(ctx, 2); ctx.clip(); ctx.lineJoin = 'round';
      {   // the pan's face dulls under the blow (the sea in it shaken dark) and clears from the rim in toward the middle
        const rr = 292 * q.k * (0.35 + 0.65 * Math.min(1, env * 1.4)), gr = ctx.createRadialGradient(q.x, q.y, rr * 0.4, q.x, q.y, rr);
        gr.addColorStop(0, rgba(C.ink, 0.34 * env)); gr.addColorStop(0.75, rgba(C.ink, 0.28 * env)); gr.addColorStop(1, rgba(C.ink, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU2); ctx.fill();
      }
      for (let r = 0; r < 2; r++) {
        waveRing(ctx, q.x, q.y, (r ? 262 : 286) * q.k + Math.sin(age * 7 - r) * 5 * env, 0.8 + 5.2 * env, age * 2, w.i * 5 + r * 3);
        ctx.strokeStyle = rgba(C.ink, 0.4 * env); ctx.lineWidth = 11; ctx.stroke();
        ctx.strokeStyle = rgba(C.frostH, (r ? 0.5 : 0.8) * env); ctx.lineWidth = 3.2; ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- the landings
  const IMP = {};
  const struck = (ctx, tg, pad = 6) => {
    const hits = ctx.hitIds, out = [];
    for (const u of ctx.units || []) { if (hits && !hits.has(u.id)) continue; if (SHAPES.contains(tg.live, u.x, u.y, pad)) out.push(u); }
    return out;
  };
  const hurt = (ctx, tg, size = 1.5) => { for (const u of struck(ctx, tg)) { VFX.hit(u.x, u.y, C.frost, size); spray(u.x, u.y - 4, 5, { size: 0.7, speed: 0.7 }); } };
  // water thrown up off a point: heavy and slow, it goes up a long way and comes back a long while after
  function spray(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || 1.2) : rand(0, TAU2), sp = rand(30, 130) * (o.speed || 1);
      VFX.spawn({ x, y, z: rand(2, 12), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(150, 310) * (o.up || 1), g: 430, drag: 0.012, life: rand(0.9, 1.5), size: rand(8, 15) * (o.size || 1), size1: 4, color: i % 3 ? C.frostH : C.water, kind: 'drop', add: false, a: 1, vr: rand(-2, 2) });
    }
    if (o.mist !== false) VFX.smoke(x, y, { n: 2, color: '#a9c4d8', size: 26 * (o.size || 1), a: 0.3, speed: 40, r: 10, life: 1.3 });
  }
  const fxG = (dur, draw, o = {}) => VFX.fx({ dur, layer: o.layer || 'ground', delay: o.delay, draw: (c, p, t, e) => { c.save(); ARENA.trace(c, 4); c.clip(); try { draw(c, p, t, e); } finally { c.restore(); } } });
  // a ring along the floor, slow and wide
  const ringAt = (x, y, o = {}) => fxG(o.dur || 0.9, (c, p, t, e) => { VFX.neonRing(c, x, y, (o.r0 || 0) + ((o.r || 120) - (o.r0 || 0)) * easeOut(p), o.color || C.frost, (o.w || 5) * (1 - p * 0.7), e.a * (1 - p) * (o.a ?? 1), o.flat ?? 0.8); }, { delay: o.delay });
  // the whole shape lights, then lets go
  function flashShape(s, dur, a, col) {
    return fxG(dur, (c, p, t, e) => { const k = (1 - p) * (1 - p) * e.a * flashK(); SHAPES.trace(c, s); c.globalCompositeOperation = 'screen'; c.globalAlpha = a * k; c.fillStyle = col || C.frostH; c.fill('evenodd'); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.7 * k); c.strokeStyle = col || C.frost; c.lineWidth = 6 * (1 - p) + 2; c.stroke(); });
  }
  const rimPts = (pan, n, r = 292) => { const q = pose(pan, S.t), out = []; for (let i = 0; i < n; i++) { const th = i / n * TAU2 + hash(i, 4) * 0.2; out.push({ x: q.x + Math.cos(th) * r, y: q.y + Math.sin(th) * r, th }); } return out; };

  // A judgement lands: the palm comes down on the pan. A print of it, wet, stays and dries; three slow rings cross the pan; spray goes up all round the rim.
  IMP.ormJudge = (tg, msg, ctx) => {
    const s = tg.live; if (!real(s)) return;
    const ev = evs(), sc = ev.orscales, pan = s.kind === 'rect' ? 'B' : panKey(s.x), light = !!(sc && sc['strike' + pan] === 2);
    if (pan === 'B') { bridgeSurge(s, 1); hurt(ctx, tg, 1.4); shakeNow(5); return; }
    const cx = s.x, cy = s.y, ang = Math.atan2(cy - HIM.y, cx - HIM.x), idx = pan === 'L' ? 0 : 1;
    flashShape(s, light ? 0.5 : 0.7, light ? 0.18 : 0.26);
    // the slam: the palm drops the last of its height in a few frames, then stays as a print
    fxG(0.34, (c, p, t, e) => { const q = easeOut(clamp(p / 0.4, 0, 1)), sz = (light ? 0.9 : 1.22) * (1 + 0.28 * (1 - q)); handAt(c, cx - Math.cos(ang) * 28, cy - Math.sin(ang) * 28, ang, sz, (0.1 + 0.3 * q) * e.a * (1 - clamp((p - 0.7) / 0.3, 0, 1)), (0.5 + 0.4 * (1 - p)) * e.a, { edge: C.hi }); });
    mark(light ? 3 : 5, (c, a) => handAt(c, cx - Math.cos(ang) * 28, cy - Math.sin(ang) * 28, ang, light ? 0.9 : 1.22, 0.2 * a, 0.35 * a, { edge: C.frostH }), cx, cy);
    for (let i = 0; i < (light ? 1 : 3); i++) ringAt(cx, cy, { r: 90 + i * 40 + (light ? 0 : 100), r0: 12, w: 8 - i * 2, dur: 1.0 + i * 0.28, delay: i * 0.14, color: i % 2 ? C.frostH : C.frost, a: light ? 0.7 : 1 });
    for (const q of rimPts(idx, light ? 8 : 20)) later(S.t + hash(q.th, 3) * 0.14, () => spray(q.x, q.y, light ? 1 : 2, { angle: q.th, spread: 0.7, size: light ? 0.8 : 1.15, up: light ? 0.7 : 1 }));
    VFX.motes(cx, cy, { n: light ? 6 : 12, color: C.frostH, r: 160, rise: 1.2 });
    hurt(ctx, tg, light ? 1.3 : 1.9);
    shakeNow(light ? 4 : 9); if (!light) camFx(0.07, 0.03, 0.5);
  };
  // the bridge struck: a sheet of water thrown across it
  function bridgeSurge(s, k) {
    inLaneFx(s, (L, hw) => { for (let i = 0; i < 7; i++) { const d = L * (i + 0.5) / 7; later(S.t + i * 0.03, () => { const ca = Math.cos(s.angle), sa = Math.sin(s.angle); spray(s.x + ca * d, s.y + sa * d, 2, { angle: -Math.PI / 2, spread: 1.4, size: 0.9 * k }); }); } });
    flashShape(s, 0.5, 0.2);
  }
  const inLaneFx = (s, fn) => fn(s.len, s.w / 2);

  // The flood: it sweeps in over the rim to its edge, a ring running back out, the spray standing up all along the rim
  function floodLand(tg, msg, ctx) {
    const s = tg.live; if (!real(s) || s.kind !== 'donut') return;
    const idx = panIdx(s.x), cx = s.x, cy = s.y, rO = s.r, rI = s.r2;
    flashShape(s, 0.6, 0.2, C.water);
    fxG(0.8, (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.4, 0, 1)), r = rO - (rO - rI) * q, k = e.a * (1 - clamp((p - 0.25) / 0.75, 0, 1));
      c.save(); c.beginPath(); c.arc(cx, cy, rO + 2, 0, TAU2); c.arc(cx, cy, rI, 0, TAU2, true); c.clip('evenodd');
      waveRing(c, cx, cy, r, 4, t * 2, 3); c.strokeStyle = rgba(C.frostH, 0.9 * k); c.lineWidth = 8 * (1 - p * 0.5); c.stroke();
      waveRing(c, cx, cy, r + 10, 5, t * 2, 5); c.strokeStyle = rgba(C.water, 0.5 * k); c.lineWidth = 16 * (1 - p * 0.5); c.stroke();
      c.restore();
    });
    ringAt(cx, cy, { r: rI, r0: rO, w: 6, dur: 0.9, color: C.frost });
    for (const q of rimPts(idx, 18, 288)) later(S.t + hash(q.th, 6) * 0.2, () => spray(q.x, q.y, 2, { angle: q.th + Math.PI, spread: 0.9, size: 1.05 }));
    mark(4, (c, a) => { c.beginPath(); c.arc(cx, cy, rO, 0, TAU2); c.arc(cx, cy, rI, 0, TAU2, true); c.fillStyle = rgba(C.deep, 0.22 * a); c.fill('evenodd'); waveRing(c, cx, cy, rI + 3, 3, 0, 4); c.strokeStyle = rgba(C.frostH, 0.4 * a); c.lineWidth = 2.4; c.stroke(); }, cx, cy);
    hurt(ctx, tg, 1.6);
    shakeNow(6);
  }
  IMP.ormUnder = floodLand; IMP.ormTwin = floodLand;

  // Heavy Hand: his fist comes down at the end of the arm: the floor splits, a ring, the arm's shadow flashing through the cone, the stone flying
  function handLand(tg, msg, ctx) {
    const s = tg.live, e = tg.target != null && ctx.entById ? ctx.entById(tg.target) : null, d = clamp((e ? Math.hypot(e.x - s.x, e.y - s.y) : s.r * 0.6) + 60, 240, s.r * 0.92);
    const x = s.x + Math.cos(s.angle) * d, y = s.y + Math.sin(s.angle) * d;
    flashShape(s, 0.5, 0.2);
    fxG(0.7, (c, p, t, e2) => {
      const q = easeOut(clamp(p / 0.3, 0, 1)), k = e2.a * (1 - clamp((p - 0.2) / 0.8, 0, 1));
      c.save(); c.translate(s.x, s.y); c.rotate(s.angle);
      const g = c.createLinearGradient(0, 0, d, 0); g.addColorStop(0, rgba(C.frostH, 0)); g.addColorStop(1, rgba(C.frostH, 0.34 * k)); c.fillStyle = g; c.beginPath(); c.moveTo(0, -36); c.lineTo(d, -52); c.lineTo(d, 52); c.lineTo(0, 36); c.closePath(); c.fill();
      c.translate(d, 0); c.scale(1.3 * (1 + 0.3 * (1 - q)), 1.3 * (1 + 0.3 * (1 - q))); shade(c, () => fistPath(c, {}), 0.38 * k, 0.9 * k, { edge: C.hi });
      c.restore();
    });
    ringAt(x, y, { r: 170, r0: 20, w: 9, dur: 0.9 }); ringAt(x, y, { r: 100, r0: 10, w: 5, dur: 0.7, delay: 0.06, color: C.frostH });
    spray(x, y, 14, { size: 1.15, speed: 1.2 });
    VFX.debris(x, y - 6, { color: C.stone, n: 9, speed: 1.1 });
    mark(5, (c, a, age, seed) => { crackStar(c, x, y, 120, 10, seed, a, { flat: 0.85, w: 1.8 }); crack(c, s.x + Math.cos(s.angle) * 80, s.y + Math.sin(s.angle) * 80, x, y, seed + 3, a * 0.7, { w: 1.4, jag: 4, seg: 30 }); }, x, y);
    hurt(ctx, tg, 1.9);
    shakeNow(10); camFx(0.08, 0.035, 0.5);
  }

  // Counterweight: the weight meets the hero's place: a ring, a splash standing up all round it, stone chips; the cradle gets its own thud when it comes to rest
  function dropLand(tg, msg, ctx) {
    const s = tg.live, x = s.x, y = s.y, crack = tg.tag === 'ormHollow';
    flashShape(s, 0.45, 0.16);
    ringAt(x, y, { r: 120, r0: 10, w: 7, dur: 0.75 }); ringAt(x, y, { r: 62, r0: 6, w: 4, dur: 0.55, delay: 0.05, color: C.frostH });
    for (let i = 0; i < 9; i++) { const a = i * TAU2 / 9; later(S.t + 0.02 * i, () => spray(x + Math.cos(a) * 40, y + Math.sin(a) * 30, 1, { angle: a, spread: 0.5, size: 0.9 })); }
    VFX.debris(x, y - 6, { color: crack ? '#9fb0c6' : C.stone, n: crack ? 12 : 7, speed: 1 });
    hurt(ctx, tg, 1.5);
    shakeNow(5);
  }
  IMP.ormCW = dropLand; IMP.ormHollow = dropLand;

  // Scatter the Silver: the fist on the cradle: a ring, the floor splitting in a star that holds, silver specks up
  IMP.ormScatter = (tg, msg, ctx) => {
    const s = tg.live, x = s.x, y = s.y;
    flashShape(s, 0.5, 0.2);
    ringAt(x, y, { r: 150, r0: 16, w: 8, dur: 0.8 }); ringAt(x, y, { r: 84, r0: 8, w: 5, dur: 0.6, delay: 0.05, color: C.frostH });
    spray(x, y, 12, { size: 1.05 });
    for (let i = 0; i < 10; i++) { const a = rand(0, TAU2); VFX.spawn({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 14, z: 10, vx: Math.cos(a) * rand(60, 190), vy: Math.sin(a) * rand(40, 120), vz: rand(140, 280), g: 520, life: rand(0.6, 1), size: rand(5, 9), size1: 1, color: i % 2 ? C.hi : C.silver, kind: 'shard', add: false, vr: rand(-12, 12) }); }
    VFX.sparks(x, y, { color: C.hi, n: 7, speed: 260, up: 70, g: 400 });
    mark(5, (c, a, age, seed) => crackStar(c, x, y, s.r * 0.95, 10, seed, a, { flat: 0.9, w: 1.7 }), x, y);
    hurt(ctx, tg, 1.7);
    shakeNow(8); camFx(0.05, 0.02, 0.4);
  };

  // The Bridge Breaks (the damage under the span's own showpiece): water standing up through the planks all along it
  IMP.ormBreak = (tg, msg, ctx) => {
    const s = tg.live;
    flashShape(s, 0.55, 0.2);
    bridgeSurge(s, 1.2);
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    for (let i = 0; i < 6; i++) { const d = s.len * (i + 0.5) / 6; mark(5, (c, a, age, seed) => crack(c, s.x + ca * d, s.y + sa * d - 40, s.x + ca * d + 8, s.y + sa * d + 40, seed + i, a, { w: 1.6, jag: 5 }), s.x + ca * d, s.y); }
    VFX.debris(s.x + ca * s.len / 2, s.y + sa * s.len / 2, { color: C.stone, n: 10, speed: 1.1 });
    hurt(ctx, tg, 1.6);
    shakeNow(7);
  };

  // The Tide Comes In: the water the view brought over both rims draws back in a breath: foam running in off each rim, spray, the sea's weight in the shake
  function tideWash(k) {
    for (let i = 0; i < 2; i++) {
      const q = pose(i, S.t), cx = q.x, cy = q.y;
      fxG(1.0, (c, p, t, e) => { const r = 296 - 110 * easeOut(clamp(p / 0.6, 0, 1)), kk = e.a * k * (1 - clamp((p - 0.3) / 0.7, 0, 1)); waveRing(c, cx, cy, r, 4, t * 2, i * 4 + 1); c.strokeStyle = rgba(C.frostH, 0.8 * kk); c.lineWidth = 7 * (1 - p * 0.6); c.stroke(); waveRing(c, cx, cy, r + 9, 5, t * 2, i * 4 + 3); c.strokeStyle = rgba(C.water, 0.4 * kk); c.lineWidth = 14 * (1 - p * 0.5); c.stroke(); });
      for (const p of rimPts(i, Math.round(11 * k), 290)) later(S.t + hash(p.th, 8) * 0.25, () => spray(p.x, p.y, 1, { angle: p.th + Math.PI, spread: 0.8, size: 0.95 }));
    }
  }
  IMP.ormTide = () => { tideWash(1); shakeNow(7); };
  IMP.ormBeat = () => { shakeNow(3); };

  // Tip the Scale: a surge goes across each pan toward the far side, the rim throwing water up where it gathers; the lurch itself is the beam's (roomEvent)
  IMP.ormTip = (tg, msg, ctx) => {
    const s = tg.live; if (!real(s)) return;
    const idx = panIdx(s.x), toward = idx === 0 ? Math.PI : 0;
    ringAt(s.x, s.y, { r: s.r * 0.95, r0: 20, w: 7, dur: 0.9, color: C.frostH });
    for (const q of rimPts(idx, 10, 290)) later(S.t + hash(q.th, 9) * 0.2, () => spray(q.x, q.y, 1, { angle: q.th, spread: 0.6, size: 0.95 }));
    void toward;
    shakeNow(4);
  };

  // ---------------------------------------------------------------- the room's own beats (roomev), through ArenaView.roomEvent
  function thud(x, y, n, crack) {
    ringAt(x, y, { r: 46 + 10 * n, r0: 8, w: 4, dur: 0.55 });
    VFX.debris(x, y - 4, { color: crack ? '#9fb0c6' : C.stone, n: 3 + n * 2, speed: 0.7 });
    if (n >= 2) spray(x, y, 3 + n, { size: 0.7, speed: 0.7, mist: false });
    shakeNow(2 + n);
  }
  function roomEvent(room, msg, now, entById) {
    const k = msg.k;
    S.t = Math.max(S.t, now - 0.01);
    if (k === 'ormread') {
      S.read = { t0: now, pans: Array.isArray(msg.pans) ? msg.pans.slice() : [], light: !!msg.light, level: !!msg.level };
    } else if (k === 'ormfall') {
      // the strike lands and the whole scale dips with the pan that is struck
      const amp = msg.light ? 0.18 : 0.42, dir = msg.pan === 'L' ? -1 : msg.pan === 'R' ? 1 : 0;
      if (dir) S.kick = { t0: now, amp: amp * dir };
    } else if (k === 'ormtip') {
      const sc = (room.ev && room.ev.orscales) || {}, dir = sc.tilt < 0 ? -1 : 1;
      S.kick = { t0: now, amp: 0.55 * dir };
    } else if (k === 'ormweight') {
      if (msg.a === 'lift') ringAt(msg.x, msg.y, { r: 40, r0: 6, w: 3, dur: 0.5, color: C.frostH, a: 0.8 });
      else if (msg.a === 'set') later(now + 0.32, () => thud(msg.x, msg.y, msg.n || 1, false));
      else if (msg.a === 'land') {
        later(now + 0.7, () => {
          thud(msg.x, msg.y, msg.n || 1, !!msg.crack);
          if (msg.crack) {   // a cracked weight comes to rest and splits: halves part, silver dust lifts off it
            fxG(1.0, (c, p, t, e) => { const q = easeOut(p), kk = e.a * (1 - clamp((p - 0.3) / 0.7, 0, 1)); for (const sg of [-1, 1]) { c.save(); c.translate(msg.x + sg * 14 * q, msg.y - 3); OR_VIEW.weight(c, 0, 0, msg.n || 1, { s: 0.5, a: 0.8 * kk }); c.restore(); } crack2(c, msg.x, msg.y, kk); });
            VFX.motes(msg.x, msg.y - 6, { n: 8, color: C.hi, r: 24, rise: 1.4 });
          }
        });
      }
    } else if (k === 'ormscatter' && msg.a === 'break') {
      const cr = (typeof OR_ROOM !== 'undefined' && OR_ROOM.CRADLES) || [], to = (msg.to || []).map(i => cr[i]).filter(Boolean);
      S.pieces.push({ t0: now, from: { x: msg.x, y: msg.y }, to, dur: 0.9, n: msg.n || 2 });
      VFX.sparks(msg.x, msg.y - 8, { color: C.hi, n: 9, speed: 300, up: 90, g: 420 });
      ringAt(msg.x, msg.y, { r: 84, r0: 8, w: 6, dur: 0.6, color: C.hi });
      shakeNow(5);
    } else if (k === 'ormwater' && msg.a === 'on') {
      later(now, () => tideWash(0.7));   // (The Tide Weighs Too begins to count: the water settles on both pans)
    } else if (k === 'ormcross' && entById) {
      const e = entById(msg.who); if (e) { spray(e.x, e.y, 5, { size: 0.8 }); VFX.shock(e.x, e.y, { r: 70, color: C.frost, w: 4, dur: 0.5, flat: 0.8 }); }
    }
  }
  const crack2 = (c, x, y, k) => { crack(c, x - 4, y - 18, x + 3, y + 14, 3, k, { w: 1.4, jag: 3, seg: 8 }); };

  // ---------------------------------------------------------------- under the units, over the units, and the beam's lurch
  // a mark of the scale being struck: the beam lets the struck pan dip (a bump on the tilt the room reads, the room's own easing softens it)
  function kickTilt(room, t) {
    const K = S.kick, st = room && room.ev && room.ev.orscales; if (!K || !st || typeof st.tilt !== 'number') { if (K && t - K.t0 > 3) S.kick = null; return null; }
    const age = t - K.t0; if (age > 3) { S.kick = null; return null; }
    const off = K.amp * (age < 0.1 ? age / 0.1 : Math.exp(-(age - 0.1) * 2.5)), keep = st.tilt;
    st.tilt = clamp(keep + off, -1, 1);
    return keep;
  }
  function under(ctx, room, t, v) {
    if (!isScales()) return;
    if (room !== S.room || t < S.t - 1) { S.room = room; WJ.length = 0; WR.length = 0; S.marks.length = 0; S.later.length = 0; S.pieces.length = 0; S.kick = null; S.read = null; S.pos.clear(); S.seen.clear(); }
    S.t = t;
    for (const u of (v && v.units) || []) S.pos.set(u.id, u);
    for (let i = S.later.length - 1; i >= 0; i--) { const q = S.later[i]; if (t >= q.at) { S.later.splice(i, 1); try { q.fn(); } catch (e) { fail('later', e); } } }
    drawMarks(ctx, t);
    drawRims(ctx, t);
    waterBand(ctx, room, t);
    heldDown(ctx, t);
  }
  // Extreme, The Tide Weighs Too: the water a pan carries lies along its rim as a band, a little wider for each point it adds
  function waterBand(ctx, room, t) {
    const sc = room.ev && room.ev.orscales; if (!sc || !(sc.waterL > 0 || sc.waterR > 0)) return;
    for (let i = 0; i < 2; i++) {
      const n = i ? sc.waterR : sc.waterL; if (!(n > 0)) continue;
      const q = pose(i, t), w = 12 + 11 * n, R = 292;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(q.k, q.k);
      ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, TAU2); ctx.arc(0, 0, R - w, 0, TAU2, true); ctx.clip('evenodd');
      const g = ctx.createRadialGradient(0, 0, R - w, 0, 0, R + 4); g.addColorStop(0, rgba(C.waterD, 0)); g.addColorStop(0.5, rgba(C.waterD, 0.22)); g.addColorStop(1, rgba(C.water, 0.4));
      ctx.fillStyle = g; ctx.fillRect(-R - 8, -R - 8, 2 * R + 16, 2 * R + 16);
      waveRing(ctx, 0, 0, R - w + 3, 3, t, i * 4 + 2); ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = rgba(C.frostH, 0.5); ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]);
      // one drop in a notch at the rim for each point it adds
      for (let j = 0; j < 4; j++) { const a = -Math.PI / 2 + (j - 1.5) * 0.18 + (i ? 0.0 : 0), on = j < n; ctx.beginPath(); ctx.arc(Math.cos(a) * (R - w - 10), Math.sin(a) * (R - w - 10), 4.2, 0, TAU2); ctx.fillStyle = on ? rgba(C.frostH, 0.9) : rgba(C.ink, 0.35); ctx.fill(); }
      ctx.restore();
    }
  }
  // Burden and Buoy and Buoyed: the weight a hero carries in their own count shows at their feet (the marks over their heads are the script's; this is the floor)
  function heldDown(ctx, t) {
    for (const [pid, m] of S.seen) {
      if (t - m.t > 0.25) { S.seen.delete(pid); continue; }
      const u = S.pos.get(pid); if (!u) continue;
      ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
      if (m.key === 'ormburden') {
        // the floor under them sagging: dark rings, heavy and slow, and the wet creeping out
        for (let i = 0; i < 2; i++) { const q = (t * 0.45 + i / 2) % 1; ctx.beginPath(); ctx.ellipse(u.x, u.y + 6, 14 + q * 30 * (m.n || 2) * 0.5, (14 + q * 30 * (m.n || 2) * 0.5) * 0.6, 0, 0, TAU2); ctx.strokeStyle = rgba(C.shade, (1 - q) * 0.4); ctx.lineWidth = 3; ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(u.x, u.y + 6, 20, 12, 0, 0, TAU2); ctx.fillStyle = rgba(C.shade, 0.22); ctx.fill();
      } else if (m.key === 'ormbuoy' || m.key === 'ormbuoyed') {
        // lifted: pale rings going up off the floor, small bubbles rising
        for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(u.x, u.y + 6 - q * 6, 12 + q * 18, (12 + q * 18) * 0.55, 0, 0, TAU2); ctx.strokeStyle = rgba(C.frostH, (1 - q) * 0.45); ctx.lineWidth = 1.6; ctx.stroke(); }
        for (let i = 0; i < 4; i++) { const q = (t * 0.6 + hash(i, 2)) % 1; ctx.beginPath(); ctx.arc(u.x + (hash(i, 3) - 0.5) * 22, u.y - q * 50, 2 + hash(i, 4) * 2, 0, TAU2); ctx.strokeStyle = rgba(C.frostH, Math.sin(q * Math.PI) * 0.6); ctx.lineWidth = 1.2; ctx.stroke(); }
      }
      ctx.restore();
    }
  }
  // the three chains of a pan, drawn taut: the same lugs and lean the room's chains have, lit (ink under so they show on the silver)
  const LUG = [Math.PI, Math.PI * 125 / 180, Math.PI * 235 / 180];
  function chainFlash(ctx, i, a, t) {
    const q = pose(i, t); ctx.save(); ctx.lineCap = 'round';
    for (const lg of LUG) {
      const ang = i ? Math.PI - lg : lg, lx = q.x + Math.cos(ang) * 314 * q.k, ly = q.y + Math.sin(ang) * 314 * q.k, dx = lx - 0, dy = ly - 60, x1 = lx + dx * 0.95, y1 = ly + dy * 0.95;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x1, y1); ctx.strokeStyle = rgba(C.ink, 0.45 * a); ctx.lineWidth = 7; ctx.stroke();
      const g = ctx.createLinearGradient(lx, ly, x1, y1); g.addColorStop(0, rgba(C.frostH, 1 * a)); g.addColorStop(1, rgba(C.frost, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(C.frost, 0.3 * a * flashK()); ctx.lineWidth = 12; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  // the verdict beat: the count is read and the beam stops dead (roomev ormread, half a second before the strike). It lights at once, holds until the strike
  // lands (that is the verdict), and lets go as the pan takes it.
  function verdict(ctx, t) {
    const R = S.read; if (!R) return;
    const age = t - R.t0; if (age < 0 || age > 1.2) { if (age > 1.2) S.read = null; return; }
    const a0 = amb(), tl = a0 ? a0.tilt : 0;
    const at = u => { const h = -tl * u * 0.16, kk = 1 + h; return { x: u * 860 * kk, y: 60 + (-290 - 60) * (1 + 0.4 * h) }; };
    const pivot = at(0), pans = R.level ? ['L', 'R'] : R.pans.filter(p => p === 'L' || p === 'R'), pv = (age < 0.5 ? clamp(age / 0.08, 0, 1) : clamp(1 - (age - 0.5) / 0.5, 0, 1)) * (R.light ? 0.7 : 1);
    ctx.save(); ctx.lineCap = 'round';
    // the stop: the pivot's housing lit, a ring going out of it once, short strokes standing out of it like a catch set
    const sA = (1 - clamp(age / 0.6, 0, 1)) * flashK();
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, pivot.x, pivot.y, 120, C.frost, 0.5 * sA); ctx.globalCompositeOperation = 'source-over';
    rrect(ctx, pivot.x - 46, pivot.y - 24, 92, 48, 11, null, rgba(C.hi, 0.9 * pv), 3);
    ctx.beginPath(); ctx.ellipse(pivot.x, pivot.y, 40 + age * 220, (40 + age * 220) * 0.5, 0, 0, TAU2); ctx.strokeStyle = rgba(C.ink, 0.4 * (1 - clamp(age / 0.7, 0, 1))); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = rgba(C.hi, 0.9 * (1 - clamp(age / 0.7, 0, 1))); ctx.lineWidth = 2.4; ctx.stroke();
    for (let j = 0; j < 8; j++) { const a = j * TAU2 / 8 + 0.2, r0 = 52, r1 = 52 + 16 * pv; ctx.beginPath(); ctx.moveTo(pivot.x + Math.cos(a) * r0, pivot.y + Math.sin(a) * r0 * 0.6); ctx.lineTo(pivot.x + Math.cos(a) * r1, pivot.y + Math.sin(a) * r1 * 0.6); ctx.strokeStyle = rgba(C.hi, 0.85 * pv); ctx.lineWidth = 2.2; ctx.stroke(); }
    for (const pn of pans) {
      const sg = pn === 'L' ? -1 : 1, i = sg < 0 ? 0 : 1, q = easeOut(clamp(age / 0.16, 0, 1)), e = at(sg * 0.95);
      // the beam's length to that pan's side lit, ink under it so it shows on the silver
      const x1 = pivot.x + (e.x - pivot.x) * q, y1 = pivot.y + (e.y - pivot.y) * q;
      ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y); ctx.lineTo(x1, y1); ctx.strokeStyle = rgba(C.ink, 0.5 * pv); ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = rgba(C.frostH, 0.95 * pv); ctx.lineWidth = 5; ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(C.frost, 0.3 * pv * flashK()); ctx.lineWidth = 16; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      chainFlash(ctx, i, pv, t);
      // the pan's lip catches the light
      const pp = pose(i, t); ctx.beginPath(); ctx.arc(pp.x, pp.y, 306 * pp.k, 0, TAU2); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(C.frost, 0.4 * pv * flashK()); ctx.lineWidth = 14; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = rgba(C.hi, 0.95 * pv); ctx.lineWidth = 3.4; ctx.stroke();
    }
    ctx.restore();
  }
  const amb = () => (typeof ArenaView !== 'undefined' && ArenaView.amb && ArenaView.amb.kind === 'scales' ? ArenaView.amb : null);
  // Exact Measure: the lit pan's lip drawn out in notches, and a plaque with its number hung from the beam over it
  function exact(ctx, room, t) {
    const sc = room.ev && room.ev.orscales, ex = sc && sc.exact; if (!ex || !ex.pan) return;
    const i = ex.pan === 'L' ? 0 : 1, q = pose(i, t), pu = 0.7 + 0.3 * Math.sin(t * 3.2), a0 = amb(), tl = a0 ? a0.tilt : 0, u = (i ? 1 : -1) * 380 / 860, h = -tl * u * 0.16, kk = 1 + h, bx = u * 860 * kk, by = 60 + (-290 - 60) * (1 + 0.4 * h);
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(q.x, q.y, 306 * q.k, 0, TAU2); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(C.frostH, 0.22 * pu * flashK()); ctx.lineWidth = 9; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    for (let j = 0; j < 36; j++) { const a = j * TAU2 / 36; ctx.beginPath(); ctx.moveTo(q.x + Math.cos(a) * 297 * q.k, q.y + Math.sin(a) * 297 * q.k); ctx.lineTo(q.x + Math.cos(a) * (j % 3 ? 309 : 316) * q.k, q.y + Math.sin(a) * (j % 3 ? 309 : 316) * q.k); ctx.strokeStyle = rgba(C.hi, (j % 3 ? 0.4 : 0.8) * pu); ctx.lineWidth = j % 3 ? 1.6 : 2.4; ctx.stroke(); }
    // the plaque: two short threads from the beam, a silver tag, the number
    const px = bx, py = by + 44 * kk;
    ctx.beginPath(); ctx.moveTo(px - 16, by + 8); ctx.lineTo(px - 16, py - 14); ctx.moveTo(px + 16, by + 8); ctx.lineTo(px + 16, py - 14); ctx.strokeStyle = rgba(C.silver, 0.8); ctx.lineWidth = 1.6; ctx.stroke();
    rrect(ctx, px - 30, py - 16, 60, 38, 7, '#b9c6d6', C.ink, 2.4); rrect(ctx, px - 27, py - 13, 54, 8, 4, 'rgba(255,255,255,0.4)');
    ctx.font = '800 25px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('+' + ex.n, px + 1, py + 6); ctx.fillStyle = '#121b28'; ctx.fillText('+' + ex.n, px, py + 5);
    ctx.restore();
  }
  // a weight broken by the fist: the pieces roll out to their cradles
  function pieces(ctx, t) {
    for (let i = S.pieces.length - 1; i >= 0; i--) {
      const P = S.pieces[i], u = (t - P.t0) / P.dur; if (u >= 1.12) { S.pieces.splice(i, 1); continue; } if (u < 0) continue;
      P.to.forEach((d, j) => {
        const e = easeOut(clamp(u, 0, 1)), x = lerp(P.from.x, d[0], e), y = lerp(P.from.y, d[1], e), hop = Math.sin(clamp(u, 0, 1) * Math.PI) * 26;
        ctx.save(); OR_VIEW.weight(ctx, x, y, 1, { z: hop, s: 0.85, t }); ctx.restore();
        if (u > 0.96 && !P['d' + j]) { P['d' + j] = 1; thud(d[0], d[1], 1, false); }
      });
    }
  }
  function over(ctx, room, t, env) {
    if (!isScales()) return;
    verdict(ctx, t); exact(ctx, room, t); pieces(ctx, t);
    void env;
  }

  // ---------------------------------------------------------------- the body: what gathers on him for each pose (boss-vfx.js castStart)
  // H: { drawIn, emit, beat, soon, own }. He stands at (b.x, b.y) = the fulcrum; his free hand is on the screen's right, about (b.x + 150, b.y + 70) at rest
  function cast(sh, b, dur, anim, name, H) {
    const hx = () => b.x + 148, hy = () => b.y + 50;
    const drip = (x, y, n = 1) => { for (let i = 0; i < n; i++) VFX.spawn({ x: x + rand(-14, 14), y: y + rand(-6, 6), z: rand(50, 90), vx: rand(-6, 6), vz: -rand(60, 120), g: 120, life: 0.75, size: rand(4, 7), size1: 3, color: C.water, kind: 'drop', add: false, a: 0.85 }); };
    if (anim === 'weigh') {
      // the palm raised: the sea drips off it, a cold gather of light under it
      H.emit(sh, dur, 0.12, () => drip(hx(), hy(), 1));
      H.drawIn(sh, dur, () => ({ x: hx(), y: hy() }), { color: C.frostH, r: 60, z: 30, rate: 0.3, glow: false });
    } else if (anim === 'hand') {
      // the fist wound up: water thrown off the sleeve, the arm's weight gathering
      H.emit(sh, dur * 0.9, 0.2, () => { const a = rand(0, TAU2); VFX.spawn({ x: hx(), y: hy() + 10, z: 60, vx: Math.cos(a) * rand(20, 60), vy: Math.sin(a) * 30, vz: rand(40, 110), g: 380, life: 0.8, size: rand(4, 7), size1: 2, color: C.water, kind: 'drop', add: false, a: 0.85 }); });
      H.drawIn(sh, dur, () => ({ x: hx(), y: hy() }), { color: C.frostH, r: 70, z: 40, rate: 0.35 });
    } else if (anim === 'tide') {
      // both sleeves pouring harder: streams down from the shoulders, rings spreading at his base
      H.emit(sh, dur, 0.28, () => drip(b.x + (Math.random() < 0.5 ? -1 : 1) * 120, b.y + 40, 1));
      H.beat(sh, dur, 0.7, () => { VFX.shock(b.x, b.y + 70, { r: 220, color: C.frost, w: 3, dur: 0.9, flat: 0.55 }); });
    } else if (anim === 'drop') {
      // a weight in the hand over a pan: a glint on its silver, small rings under it
      H.emit(sh, dur, 0.08, () => { VFX.motes(hx(), hy() - 10, { n: 1, color: C.hi, r: 20, rise: 0.6 }); });
      H.drawIn(sh, dur, () => ({ x: hx(), y: hy() }), { color: C.hi, r: 40, z: 40, rate: 0.25, glow: false });
    } else if (anim === 'under') {
      H.beat(sh, dur, 0.8, () => { for (const x of [-380, 380]) VFX.shock(x, 60, { r: 300, color: C.water, w: 3, dur: 0.9, flat: 0.8 }); });
    } else if (anim === 'break') {
      // both fists up: dust shaken off the span
      H.emit(sh, dur, 0.18, () => { VFX.smoke(rand(-90, 90), rand(30, 90), { n: 1, color: '#9fb0c2', size: 18, a: 0.3, speed: 25, r: 6, life: 1.0 }); });
      H.beat(sh, dur, 0.6, () => { VFX.shock(0, 60, { r: 140, color: C.frostH, w: 3, dur: 0.6, flat: 0.7 }); });
    } else if (anim === 'tip') {
      H.emit(sh, dur, 0.2, () => drip(b.x + (Math.random() < 0.5 ? -1 : 1) * rand(90, 250), -270, 1));
    }
  }

  // ---------------------------------------------------------------- the enrage, the entrance, the fall (plain: the showpieces are the staging lane's)
  // The Scale Falls: the sea standing higher round both pans, rings of cold light drawing in over the rims, pale and thin, never a wash of the room
  function enrage(sh, b, dur, H) {
    H.own(sh, VFX.fx({ dur: dur + 2, layer: 'ground', draw: (c, p, t, e) => {
      const q = clamp(t / dur, 0, 1), k = e.a * easeOut(clamp(t / 2, 0, 1)) * (1 - clamp((t - dur) / 1.8, 0, 1));
      c.save(); ARENA.trace(c, 8); c.clip();
      for (let i = 0; i < 2; i++) { const pp = pose(i, S.t); for (let j = 0; j < 3; j++) { const r = ((t * (0.3 + 0.35 * q) + j / 3) % 1); waveRing(c, pp.x, pp.y, 298 - r * 150, 4 + 2 * q, t * 2, i * 3 + j); c.strokeStyle = rgba(C.frostH, Math.sin(r * Math.PI) * (0.1 + 0.3 * q) * k); c.lineWidth = 5 - r * 3; c.stroke(); } }
      c.restore();
    } }));
    [0.35, 0.6, 0.8, 0.94].forEach((f, i) => H.soon(sh, f * dur, () => { for (const x of [-380, 380]) H.shockAt(x, 60, { r: 310, color: i % 2 ? C.hi : C.frost, w: 7 + i * 2, dur: 1.0, flat: 0.8 }); H.shake(4 + i * 2); }));
    H.emit(sh, dur + 1, 0.12, () => { const i = Math.random() < 0.5 ? 0 : 1, th = rand(0, TAU2); spray(PANS[i].x + Math.cos(th) * 292, PANS[i].y + Math.sin(th) * 292, 1, { angle: th, spread: 0.6, size: 0.9, mist: false }); });
  }
  function enrageLand(b, H) {
    for (const x of [-380, 380]) for (let i = 0; i < 2; i++) H.shockAt(x, 60, { r: 330 - i * 70, color: i % 2 ? C.hi : C.frost, w: 7 - i * 2, dur: 1.0 + i * 0.1, flat: 0.8, delay: i * 0.1 });
    H.roomTint('#9fc4ff', 0.1, 0.7);
    for (let i = 0; i < 2; i++) for (const q of rimPts(i, 16, 290)) spray(q.x, q.y, 2, { angle: q.th, spread: 0.6, size: 1.1 });
    H.shake(16);
  }
  function intro(sh, b, H) {
    H.soon(sh, 0.3, () => { H.shockAt(b.x, b.y + 60, { r: 280, color: C.frost, w: 6, dur: 1.0, flat: 0.5 }); });
    H.emit(sh, 2.6, 0.2, () => { const a = rand(0, TAU2), d = rand(30, 120); spray(b.x + Math.cos(a) * d, b.y + 80 + Math.sin(a) * 20, 1, { size: 0.9, mist: false, up: 0.8 }); });
    H.soon(sh, 1.8, () => { H.shockAt(b.x, b.y + 60, { r: 180, color: C.hi, w: 4, dur: 0.8, flat: 0.5 }); H.shake(4); });
  }
  function death(sh, b, H) {
    H.soon(sh, 0.4, () => { H.shockAt(b.x, b.y + 60, { r: 320, color: C.frost, w: 8, dur: 1.0, flat: 0.5 }); H.shake(6); });
    H.emit(sh, 3.4, 0.14, () => { spray(b.x + rand(-80, 80), b.y + rand(40, 100), 1, { size: 0.9, up: 0.7, mist: false }); });
    H.soon(sh, 2.2, () => { H.shockAt(b.x, b.y + 60, { r: 420, color: C.hi, w: 10, dur: 1.2, flat: 0.5 }); H.shake(7); });
  }

  // ---------------------------------------------------------------- the drowned things
  // one climbing out of a pan: the water parts and closes behind it
  function addSpawn(kind, x, y, H) {
    if (kind !== 'drowned') return false;
    ringAt(x, y, { r: 66, r0: 6, w: 4, dur: 0.8 }); ringAt(x, y, { r: 38, r0: 4, w: 3, dur: 0.6, delay: 0.1, color: C.frostH });
    spray(x, y, 5, { size: 0.8, speed: 0.8 });
    if (H && H.shake) H.shake(1.5);
    return true;
  }
  // one going under: it sinks where it stands, rings, bubbles, a last cold light
  function addDeath(kind, x, y, H) {
    if (kind !== 'drowned') return false;
    fxG(1.1, (c, p, t, e) => { const k = e.a * (1 - p); for (let i = 0; i < 3; i++) { const q = clamp(p * 1.3 - i * 0.14, 0, 1); c.beginPath(); c.ellipse(x, y + 2, 8 + q * 44, (8 + q * 44) * 0.6, 0, 0, TAU2); c.strokeStyle = rgba(C.frostH, (1 - q) * 0.55 * k); c.lineWidth = 2; c.stroke(); } glow(c, x, y, 26 * (1 - p), C.frost, 0.4 * k); });
    for (let i = 0; i < 6; i++) VFX.spawn({ x: x + rand(-10, 10), y: y + rand(-6, 6), z: 2, vz: rand(30, 80), vx: rand(-10, 10), drag: 0.02, life: rand(0.7, 1.2), size: rand(3, 6), size1: 1, color: C.frostH, kind: 'glow', add: true, a: 0.8 });
    VFX.smoke(x, y, { n: 2, color: '#9db6c8', size: 22, a: 0.3, speed: 25, r: 8, life: 1.1 });
    return true;
  }
  const prop = msg => msg.k === 'ormrise';   // (the add's own spawn draws the rise)

  // the head marks that say what a hero weighs: drawn over their head by ArenaView.headMark, noted here so the floor can show it too (wrapped below)
  function noteMark(m, t) { if (m && (m.key === 'ormburden' || m.key === 'ormbuoy' || m.key === 'ormbuoyed') && m.pid != null) S.seen.set(m.pid, { key: m.key, n: m.n, t }); }

  // a tell of his over the view's: the view draws the pan's red (one telegraph per pan), his goes on top of it
  const composed = {};
  function tell(tag) {
    if (tag in composed) return composed[tag];
    const base = typeof OR_VIEW !== 'undefined' ? OR_VIEW.tell(tag) : null, mine = TELLS[tag];
    let out;
    if (!mine) out = base;
    else if (!base) out = mine;
    else out = { outline: mine.outline !== undefined ? mine.outline : base.outline, raidwide: mine.raidwide, ground(ctx, tg, s, p, k, t, env) { if (base.ground) base.ground(ctx, tg, s, p, k, t, env); mine.ground(ctx, tg, s, p, k, t, env); } };
    composed[tag] = out || null;
    return out || null;
  }

  return {
    tell, buster: handTell, cast, enrage, enrageLand, intro, death, under, over, roomEvent, addSpawn, addDeath, prop, kickTilt, noteMark,
    // (boss-vfx.js impact(): his moves land here; a tag it does not know falls through to the shared ones)
    impact(tg, msg, ctx) {
      const f = tg.type === 'buster' ? handLand : IMP[tg.tag]; if (!f) return false;
      ctx = Object.assign({}, ctx, { hitIds: Array.isArray(msg && msg.hits) ? new Set(msg.hits) : null });
      try { f(tg, msg || {}, ctx); } catch (e) { fail('impact ' + tg.tag, e); }
      try {   // (the Scales take the blow and settle: weightHit above)
        const s = tg.live;
        if (tg.type === 'buster' && s) {
          const e = tg.target != null && ctx.entById ? ctx.entById(tg.target) : null, d = clamp((e ? Math.hypot(e.x - s.x, e.y - s.y) : s.r * 0.6) + 60, 240, s.r * 0.92);
          weightHit(s.x + Math.cos(s.angle) * d, s.y + Math.sin(s.angle) * d, 1.5, { rim: 7 });
        } else if (tg.tag === 'ormJudge' && real(s)) {
          const sc = evs().orscales, bridge = s.kind === 'rect', light = !!(sc && sc['strike' + (bridge ? 'B' : panKey(s.x))] === 2);
          if (bridge) weightHit(s.x, s.y, 0.6, { both: true }); else weightHit(s.x, s.y, light ? 0.45 : 0.85, { rim: light ? 0 : 5 });
        } else if (tg.tag === 'ormScatter' && real(s)) weightHit(s.x, s.y, 0.7, { rim: 3 });
        else if ((tg.tag === 'ormCW' || tg.tag === 'ormHollow') && real(s)) weightHit(s.x, s.y, 0.5);
        else if (tg.tag === 'ormBreak' && real(s)) weightHit(s.x, s.y, 0.7, { both: true });
        else if ((tg.tag === 'ormTwin' || tg.tag === 'ormUnder') && real(s)) weightHit(s.x, s.y, tg.tag === 'ormTwin' ? 0.75 : 0.6, { rim: 4 });
      } catch (e) { fail('weight', e); }
      return true;
    },
    S,
  };
})();

// the room hooks: ArenaView's drawRoomUnder (floor marks, the water a pan carries, what a hero's weight does to the floor), drawRoomOver (the verdict, Exact Measure's
// lit pan), scalesLife (the beam's dip when a pan is struck) and roomEvent, wrapped from here the way vesper-fx.js and ormun-view.js do
if (typeof ArenaView !== 'undefined') {
  const baseUnder = ArenaView.drawRoomUnder, baseOver = ArenaView.drawRoomOver, baseLife = ArenaView.scalesLife, baseEvent = ArenaView.roomEvent, baseMark = ArenaView.headMark;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    baseUnder.call(this, ctx, room, t, v);
    if (!room || !room.ev) return;
    try { OR_FX.under(ctx, room, t, v); } catch (e) { try { ctx.restore(); } catch (e2) { /* cosmetic */ } }
  };
  ArenaView.drawRoomOver = function (ctx, room, t, env) {
    baseOver.call(this, ctx, room, t, env);
    if (!room || !room.ev) return;
    ctx.save();
    try { OR_FX.over(ctx, room, t, env); } catch (e) { /* cosmetic */ } finally { ctx.restore(); }
  };
  ArenaView.scalesLife = function (ctx, a, t) {
    let keep = null, st = null;
    try { const room = ArenaView.liveRoom; st = room && room.ev && room.ev.orscales; keep = OR_FX.kickTilt(room, t); } catch (e) { /* cosmetic */ }
    try { joltAt(a, t); } catch (e) { /* cosmetic */ }
    try { baseLife.call(this, ctx, a, t); } finally { if (keep != null && st) st.tilt = keep; }
  };
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = baseEvent.call(this, room, msg, now, ...rest);
    try { if (msg && typeof msg.k === 'string' && msg.k.indexOf('orm') === 0) OR_FX.roomEvent(room, msg, now, rest[0]); } catch (e) { /* cosmetic */ }
    return r;
  };
  if (baseMark) ArenaView.headMark = function (ctx, x, y, m, k, t) {
    try { OR_FX.noteMark(m, t); } catch (e) { /* cosmetic */ }
    return baseMark.apply(this, arguments);
  };
}
