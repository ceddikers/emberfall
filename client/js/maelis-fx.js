// Maelis Orne, the Pale Regent: how every move of hers looks on the floor and when it lands. Her body is maelis-art.js, the moon's floor is maelis-room.js, and the
// crown read on the dust, the dust's prints, the dark of the wall, the silver lines of the dash, the corridors of a ride and the moonlets are maelis-view.js; this file is
// the moves. Loaded after maelis-view.js; the other files reach it through ML_FX (every call is guarded by `typeof ML_FX !== 'undefined'`).
//
// THE TELLS (boss-tells.js get() reads TELLS[tag]; Earthshine, which is a buster, is ML_FX.buster). Each is a thing of hers and of the moon laid over the EXACT shape, which keeps
// its red (damage) or blue (a soak) and is never hidden:
//   a cut            moonlight falling across the dust: a pale veil and fine streaks of light drifting through the lit part, and a crisp terminator, the line where light meets dark,
//                    drawn as a thin silver edge with an ink casing. The interior stays calm: the edge is what is loud. (An umbral cut is the dark falling: a cold shade, the same
//                    terminator, and the crown's own deep red on its limb.) A dance's cuts read their number from the dance (maelis.js mlcut n / of): each is faster and heavier
//                    than the last, the edge dragged out into trailing copies of itself.
//   Annular          a halo: two lit edges, rays running between them
//   Earthshine       the earthlight: a crescent blade of pale light laid along the cone, point at the tank; the second hit is its afterimage, drawn pale and dashed
//   Moonwell         a shaft of light falling on the dust (blue), bands of it running down the column
//   Moonlets         a small moon hanging over the hero it will fall on, lowering as the cast runs
//   a burst          light coming through the cracks of the moon where it lies
//   a dash           the blade drawn taut: two edges of light along the lane and a glint racing down it (the thin silver line of the dash is maelis-view.js)
//   the last light   a pool of light gathering, motes drawn in to its middle (blue)
//   a pounce         the hound and rider's shadow coming down, the dust drawn in, her blade a crescent of light across it
//   an act's opener  a band of light crossing the floor; Full Moon a hush: slow rings of light going out from her
// THE LANDINGS (boss-vfx.js impact(), before the shared ones): a cut's light sweeps the lit ground to the terminator and the dust lifts along it; a moonlet bursts; Earthshine's
// pale second hit follows the first; a pounce throws dust; the pieces of a ride kick it up as the rider passes. What a landing leaves is a faint scar of light or dust on the
// floor, kept here and drawn under the units by under().
// The body: cast() is the gathering for each pose (boss-vfx.js castStart). The showpieces (the wall, the hound's return, the eclipse, Totality, the kill, the entrance) are the staging
// lane's: nothing here draws a white-out or a wash over the room, and nothing hides or dims a live telegraph.
// Palette: silver, black, frost blue. Nothing warm, except Act V's deep red on the crown's limb on an umbral cut.

const ML_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeIn = q => q * q;
  const easeIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q));
  const PI = Math.PI;
  const C = {
    white: '#ffffff', hi: '#f7fbff', silver: '#e2ecf8', ice: '#cfe6ff', pane: '#bcd8ff', frost: '#9fd2ff', frostDk: '#4f7fc0', deep: '#27406e', ink: '#0a1226',
    black: '#05070d', blue: '#3d8bff', limb: '#8a1e2c', limbHi: '#c4343c', shade: '#cfc6f4', dust: '#dfe9f8', dustDk: '#3a4666',
  };
  const danger = () => (typeof BossTells !== 'undefined' && BossTells.COL ? BossTells.COL.danger : '#ff3b2f');
  const COLS = () => (typeof BossTells !== 'undefined' && BossTells.COL) || { danger: '#ff3b2f', buster: '#ff1f48', share: '#3d8bff', shareHi: '#b4d4ff' };
  const flashK = () => (typeof FX !== 'undefined' && FX.flashK != null ? FX.flashK : 1);
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };
  const camFx = (stop = 0.08, punch = 0.03, dur = 0.4) => { try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ } };
  const isMe = u => typeof Net !== 'undefined' && Net && u.id === Net.id;
  const S = { room: null, lastT: -1, marks: [], cuts: [], peak: -99, pos: new Map() };
  const bossOf = env => (env && env.boss) || { x: 0, y: -60, f: 0 };

  // ---------------------------------------------------------------- the cuts the room has announced: which one of a dance a telegraph is
  function cutInfo(tg) {
    const land = tg.start + tg.dur; let best = null, bd = 0.7;
    for (const c of S.cuts) { const d = Math.abs(c.land - land); if (d < bd) { bd = d; best = c; } }
    return best || { n: 1, of: 1, kd: 'single' };
  }
  // how far up a dance this cut is: 0 (the first) .. 1 (the last); a single is a little way up, a pass a little more
  const climb = ci => (ci.kd === 'dance' ? clamp((ci.n - 1) / Math.max(1, ci.of - 1), 0, 1) : ci.kd === 'pass' ? 0.4 : 0.25);

  // ---------------------------------------------------------------- small painted pieces
  // a blade's edge of light: ink under, frost over, a white core
  function blade(c, x1, y1, x2, y2, k, w = 2.4, o = {}) {
    if (k <= 0.01) return;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(o.mid || C.frost, 0.18 * k * flashK()); c.lineWidth = w * 4.2; c.stroke(); c.globalCompositeOperation = 'source-over';
    c.strokeStyle = rgba(C.ink, 0.4 * k); c.lineWidth = w + 3.2; c.stroke();
    c.strokeStyle = rgba(o.mid || C.frost, 0.5 * k); c.lineWidth = w * 1.6; c.stroke();
    c.strokeStyle = rgba(o.hi || C.white, Math.min(1, 0.95 * k)); c.lineWidth = Math.max(1, w * 0.55); c.stroke();
    c.restore();
  }
  // a glint: a soft light with a thin cross of white
  function glint(c, x, y, r, a, ang = 0) {
    if (a <= 0.01) return;
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r, C.ice, a * 0.7); c.restore();
    c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = 'round'; c.strokeStyle = rgba(C.white, Math.min(1, a)); c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-r * 0.7, 0); c.lineTo(r * 0.7, 0); c.moveTo(0, -r * 0.34); c.lineTo(0, r * 0.34); c.stroke(); c.restore();
  }
  const inCone = (c, s, fn) => { c.save(); c.translate(s.x, s.y); c.rotate(s.angle); fn(s.r, s.arc / 2); c.restore(); };
  const inLane = (c, s, fn) => { c.save(); c.translate(s.x, s.y); c.rotate(s.angle); fn(s.len, s.w / 2); c.restore(); };
  // the red under a damaging area, light: the shared outline adds its own fill, rim and late pulse over it
  function wash(c, s, p, k, t, a0 = 0.07, col) {
    const late = Math.max(0, (p - 0.75) / 0.25), pulse = late > 0 ? 0.5 + 0.5 * Math.sin(t * (10 + late * 22)) : 0;
    c.save(); SHAPES.trace(c, s); c.fillStyle = rgba(col || danger(), (a0 + 0.07 * late + 0.04 * pulse) * k); c.fill('evenodd'); c.restore();
  }
  // a crescent blade of light along +x from x0 to x1, bowing toward -y by `bow`: edge ink, silver body, white spine
  function crescentBlade(c, x0, x1, bow, wd, a, k, o = {}) {
    if (k * a <= 0.01) return;
    const mid = (x0 + x1) / 2;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, 0); c.quadraticCurveTo(mid, -bow - wd, x1, 0); c.quadraticCurveTo(mid, -bow + wd * 0.25, x0, 0); c.closePath();
    const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, rgba(o.col || C.hi, 0.14 * a * k)); g.addColorStop(1, rgba(o.col || C.hi, 0.7 * a * k));
    c.fillStyle = g; c.fill();
    c.strokeStyle = rgba(C.ink, 0.5 * a * k); c.lineWidth = 4; c.stroke();
    if (o.dash) c.setLineDash(o.dash);
    c.strokeStyle = rgba(C.white, 0.88 * a * k); c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(x0 + 10, -1); c.quadraticCurveTo(mid, -bow - wd * 0.35, x1 - 14, -1); c.strokeStyle = rgba(C.frost, 0.6 * a * k); c.lineWidth = 1.6; c.stroke();
    c.restore();
  }

  // ---------------------------------------------------------------- the terminator: the line where light meets dark on a `lune`
  const AL = Math.acos(0.275), AR_ = PI - AL;
  // where the terminator runs, as a path (and its two ends); a full moon has none
  function termPath(c, s) {
    const r = s.r, a0 = s.angle, k = 0.55 * r;
    c.beginPath();
    if (s.ph === 'full') return false;
    if (s.ph === 'half') { c.moveTo(s.x + Math.cos(a0 - PI / 2) * r, s.y + Math.sin(a0 - PI / 2) * r); c.lineTo(s.x + Math.cos(a0 + PI / 2) * r, s.y + Math.sin(a0 + PI / 2) * r); return true; }
    if (s.ph === 'crescent') { c.arc(s.x - Math.cos(a0) * k, s.y - Math.sin(a0) * k, r, a0 - AL, a0 + AL); return true; }
    c.arc(s.x + Math.cos(a0) * k, s.y + Math.sin(a0) * k, r, a0 + AR_, a0 + 2 * PI - AR_); return true;
  }
  // a point (and the direction) a fraction u of the way along the terminator
  function termPt(s, u) {
    const r = s.r, a0 = s.angle, k = 0.55 * r;
    if (s.ph === 'half') { const x1 = s.x + Math.cos(a0 - PI / 2) * r, y1 = s.y + Math.sin(a0 - PI / 2) * r, x2 = s.x + Math.cos(a0 + PI / 2) * r, y2 = s.y + Math.sin(a0 + PI / 2) * r; return { x: x1 + (x2 - x1) * u, y: y1 + (y2 - y1) * u, a: a0 + PI / 2 }; }
    if (s.ph === 'crescent') { const th = a0 - AL + u * 2 * AL; return { x: s.x - Math.cos(a0) * k + Math.cos(th) * r, y: s.y - Math.sin(a0) * k + Math.sin(th) * r, a: th + PI / 2 }; }
    const th = a0 + AR_ + u * 2 * AL; return { x: s.x + Math.cos(a0) * k + Math.cos(th) * r, y: s.y + Math.sin(a0) * k + Math.sin(th) * r, a: th + PI / 2 };
  }
  // how far along the lit axis the terminator lies at the middle (the light sweeps from the far limb, u = r, to here)
  const termU = s => s.r * (s.ph === 'crescent' ? 0.45 : s.ph === 'half' ? 0 : s.ph === 'gibbous' ? -0.45 : -1);
  const inShape = (s, x, y) => SHAPES.contains(s, x, y, 0);
  // a light swept across the shape, from the lit limb toward the terminator (clipped to the shape): the cut itself
  function swept(c, s, q, a, wd, col, dark) {
    if (a <= 0.01) return;
    const u1 = s.r * 1.02, u0 = termU(s), u = u1 + (u0 - u1) * q;
    c.save(); SHAPES.trace(c, s); c.clip();
    c.translate(s.x, s.y); c.rotate(s.angle);
    if (dark) {   // (an umbral cut: the dark comes down in a band, the leading edge a thin line of silver)
      const g = c.createLinearGradient(u - wd, 0, u + wd * 0.35, 0); g.addColorStop(0, 'rgba(2,3,12,0)'); g.addColorStop(1, rgba('#02030c', 0.6 * a));
      c.fillStyle = g; c.fillRect(u - wd, -s.r - 4, wd * 1.35, s.r * 2 + 8);
      c.fillStyle = rgba(C.silver, 0.8 * a); c.fillRect(u + wd * 0.33, -s.r - 4, 2.4, s.r * 2 + 8);
    } else {
      const g = c.createLinearGradient(u - wd, 0, u + wd * 0.35, 0); g.addColorStop(0, rgba(col || C.ice, 0)); g.addColorStop(0.7, rgba(col || C.ice, 0.55 * a)); g.addColorStop(1, rgba(C.white, 0.95 * a));
      c.fillStyle = g; c.fillRect(u - wd, -s.r - 4, wd * 1.35, s.r * 2 + 8);
    }
    c.restore();
  }

  // ---------------------------------------------------------------- the warnings
  const TELLS = {};
  // moonlight falling across the dust: the floor of a phase cut. `o` = { hv (how far up a dance), umb, twin, small }
  function luneTell(ctx, tg, s, p, k, t, env, o = {}) {
    const hv = o.hv || 0, umb = !!o.umb, twin = !!o.twin, small = !!o.small, r = s.r, a0 = s.angle;
    const late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), age = t - tg.start, fk = flashK(), seed = (tg.id | 0) + 3;
    wash(ctx, s, p, k, t, small ? 0.05 : 0.06 + 0.02 * hv);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    if (umb) {
      // the dark of the crown is what strikes: a cold shade, black air settling on the dust, thin streaks of it falling
      ctx.fillStyle = rgba('#050818', (0.16 + 0.2 * p) * k); ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = rgba(twin ? C.pane : C.ice, (0.05 + 0.06 * p + 0.03 * hv) * k * fk); ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    }
    // the terminator's light on both sides of it, soft: a few wide strokes, the lit side keeping it
    const has = termPath(ctx, s);
    if (has && !umb) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const [w, a] of [[110, 0.02], [64, 0.035], [32, 0.06], [14, 0.09]]) { ctx.lineWidth = w * (small ? 0.6 : 1); ctx.strokeStyle = rgba(twin ? C.frost : C.ice, (a + 0.03 * p + 0.02 * hv) * k * fk); ctx.stroke(); }
      ctx.restore();
    }
    // the fine streaks of the light itself, parallel to the lit axis, drifting from the lit limb toward the dark (calm: low, slow)
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a0); ctx.lineCap = 'butt';
    const nL = small ? 7 : 13, sp = (r * 2) / nL, drift = 22 + 26 * p + 40 * hv;
    for (let i = 0; i < nL; i++) {
      const v = -r + (i + 0.5) * sp + (hash(i, seed) - 0.5) * sp * 0.6, dl = 30 + 70 * hash(i, seed + 1), gp = 90 + 150 * hash(i, seed + 2);
      ctx.setLineDash([dl, gp]); ctx.lineDashOffset = t * drift * (0.6 + hash(i, seed + 3)) + hash(i, seed + 4) * 400;
      ctx.beginPath(); ctx.moveTo(-r, v); ctx.lineTo(r, v);
      ctx.strokeStyle = umb ? rgba('#0a1030', (0.14 + 0.08 * p) * k) : rgba(i % 2 ? C.white : C.pane, (0.14 + 0.1 * p + 0.06 * hv) * k * fk); ctx.lineWidth = 1.2 + 0.9 * hash(i, seed + 5); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();
    // motes of dust turning over in it
    const nM = (small ? 8 : 16) + Math.round(8 * hv);
    for (let i = 0; i < nM; i++) {
      const a = hash(i, seed + 7) * TAU, d = Math.sqrt(hash(i, seed + 8)) * r * 0.98, q = (t * (0.05 + 0.05 * hash(i, 4)) + hash(i, 6)) % 1;
      const x = s.x + Math.cos(a) * d + Math.sin(t * 0.7 + i) * 5, y = s.y + Math.sin(a) * d - q * 22 * p;
      if (!inShape(s, x, y)) continue;
      glow(ctx, x, y, 5 + 4 * hash(i, 9), umb ? '#6a7aa8' : C.white, (0.22 + 0.24 * Math.sin(q * PI)) * k * fk);
    }
    ctx.restore();
    if (!has) return;
    // the terminator: ink under, a silver edge, a white core; heavier up a dance, brighter as it nears; copies of it dragged out toward the lit side (the edge is moving)
    const w1 = (2.0 + 0.9 * hv + 1.3 * late) * (small ? 0.8 : 1), nTrail = umb ? 0 : Math.round(1 + 2.2 * hv);
    ctx.save(); ARENA.trace(ctx, 3); ctx.clip();
    ctx.lineCap = 'round';
    for (let g = nTrail; g >= 1; g--) {
      ctx.save(); ctx.translate(Math.cos(a0) * g * (13 + 6 * hv) * (0.5 + 0.5 * Math.min(1, age / 0.6)), Math.sin(a0) * g * (13 + 6 * hv) * (0.5 + 0.5 * Math.min(1, age / 0.6)));
      termPath(ctx, s); ctx.strokeStyle = rgba(C.ice, (0.2 / g + 0.1 * late) * k * fk); ctx.lineWidth = 1.6; ctx.setLineDash(twin ? [4, 8] : []); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }
    termPath(ctx, s); ctx.strokeStyle = rgba(C.ink, 0.38 * k); ctx.lineWidth = w1 + 5; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; termPath(ctx, s); ctx.strokeStyle = rgba(umb ? C.pane : C.frost, (0.14 + 0.16 * late) * k * fk); ctx.lineWidth = w1 * 5.5; ctx.stroke(); ctx.restore();
    termPath(ctx, s); if (twin) ctx.setLineDash([14, 7]); ctx.strokeStyle = rgba(umb ? C.silver : C.white, Math.min(1, 0.7 + 0.3 * late) * k); ctx.lineWidth = w1; ctx.stroke(); ctx.setLineDash([]);
    // the edge as it is drawn: a bright glint runs along it when the cut is laid, and again as it nears; glints keep company with it all the while
    const lay = clamp(age / 0.55, 0, 1);
    if (lay < 1) { const q = termPt(s, easeOut(lay)); glint(ctx, q.x, q.y, 24 + 12 * (1 - lay), 0.9 * (1 - lay) * k, q.a); }
    const nG = 2 + Math.round(3 * hv);
    for (let i = 0; i < nG; i++) { const u = (t * (0.18 + 0.4 * p + 0.35 * hv) + i / nG) % 1, q = termPt(s, u); glint(ctx, q.x, q.y, 9 + 5 * hv + 6 * late, Math.sin(u * PI) * (0.4 + 0.4 * late) * k, q.a); }
    // the light about to fall: the front of it coming across the lit part in the last of the cast
    const qf = easeIn(clamp((p - 0.72) / 0.28, 0, 1));
    ctx.restore();
    if (qf > 0.01) swept(ctx, s, qf, (umb ? 0.5 : 0.34) * k * fk, 60 + 40 * hv, twin ? C.pane : C.ice, umb);
    // an umbral cut carries the dark red of the crown on its limb (the floor's danger stays the game's red: this is the crown's own colour, dark, on the rim of the room)
    if (umb && !small) {
      ctx.save(); ARENA.trace(ctx, 3); ctx.clip(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(s.x, s.y, r - 5, a0 - 1.15, a0 + 1.15); ctx.strokeStyle = rgba(C.ink, 0.45 * k); ctx.lineWidth = 11; ctx.stroke();
      ctx.strokeStyle = rgba(C.limb, (0.65 + 0.3 * late) * k); ctx.lineWidth = 6; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#7a1a26', 0.22 * k * fk); ctx.lineWidth = 26; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = rgba(C.limbHi, 0.55 * k); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
  }
  const cutTellFor = tag => {
    const umb = /^mlU/.test(tag), twin = /^mlTwin/.test(tag), small = tag === 'mlStepCut';
    return { ground(ctx, tg, s, p, k, t, env) { luneTell(ctx, tg, s, p, k, t, env, { hv: climb(cutInfo(tg)), umb, twin, small }); } };
  };
  for (const ph of ['Crescent', 'Half', 'Gibbous']) for (const pre of ['ml', 'mlTwin', 'mlLib', 'mlPass']) TELLS[pre + ph] = cutTellFor(pre + ph);
  TELLS.mlUCrescent = cutTellFor('mlUCrescent'); TELLS.mlUHalf = cutTellFor('mlUHalf'); TELLS.mlStepCut = cutTellFor('mlStepCut');

  // Annular: a halo: two lit edges (the ring's inner and outer), light running out along the rays between them, a slow turn of glints round each edge
  TELLS.mlAnnular = { ground(ctx, tg, s, p, k, t) {
    const r1 = s.r, r2 = s.r2, late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), fk = flashK();
    wash(ctx, s, p, k, t, 0.06);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip('evenodd');
    ctx.fillStyle = rgba(C.ice, (0.05 + 0.06 * p) * k * fk); ctx.fillRect(-r1 - 6, -r1 - 6, r1 * 2 + 12, r1 * 2 + 12);
    ctx.lineCap = 'round';
    const nR = 30;
    for (let i = 0; i < nR; i++) {
      const a = i * TAU / nR + hash(i, tg.id | 0) * 0.08, q = (t * (0.12 + 0.3 * p) + hash(i, 4)) % 1, d0 = r2 + (r1 - r2) * q * 0.85, d1 = d0 + 30 + 40 * hash(i, 6);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * d0, Math.sin(a) * d0); ctx.lineTo(Math.cos(a) * d1, Math.sin(a) * d1); ctx.strokeStyle = rgba(C.white, Math.sin(q * PI) * (0.14 + 0.2 * p) * k * fk); ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ARENA.trace(ctx, 3); ctx.clip();
    for (const [rr, dir] of [[r1 - 2, 1], [r2 + 2, -1]]) {
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.strokeStyle = rgba(C.ink, 0.36 * k); ctx.lineWidth = 6; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(C.frost, (0.14 + 0.16 * late) * k * fk); ctx.lineWidth = 13; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = rgba(C.white, (0.7 + 0.3 * late) * k); ctx.lineWidth = 2.2 + 1.2 * late; ctx.stroke();
      for (let i = 0; i < 3; i++) { const a = dir * t * (0.5 + 0.9 * p) + i * TAU / 3; ctx.beginPath(); ctx.arc(0, 0, rr, a, a + 0.5); ctx.strokeStyle = rgba(C.white, (0.55 + 0.35 * p) * k); ctx.lineWidth = 3.4; ctx.stroke(); glint(ctx, Math.cos(a + 0.5) * rr, Math.sin(a + 0.5) * rr, 12 + 8 * p, 0.7 * k * p, a + 0.5 + PI / 2); }
    }
    ctx.restore();
  } };

  // Earthshine: the earthlight. A crescent blade of pale cold light laid along the cone, point at the tank, lowering as the cast runs; the second hit is its afterimage
  function busterTell(ctx, tg, s, p, k, t) {
    const second = tg.tag === 'mlEarthshine2', col = COLS().buster, late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), fk = flashK();
    wash(ctx, s, p, k, t, second ? 0.05 : 0.12, col);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r); g.addColorStop(0, rgba(C.ink, 0.0)); g.addColorStop(1, rgba(C.pane, (second ? 0.05 : 0.1 + 0.08 * p) * k * fk)); ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    ctx.restore();
    inCone(ctx, s, (r, h) => {
      // the edges of the cone: a thin line of light each, a glint walking out along it
      for (const sg of [-1, 1]) {
        const hi = h - 0.014, ca = Math.cos(sg * hi), sa = Math.sin(sg * hi);
        blade(ctx, ca * r * 0.1, sa * r * 0.1, ca * r, sa * r, (second ? 0.35 : 0.6 + 0.3 * p) * k, second ? 1.6 : 2.2);
        if (!second) for (let i = 0; i < 2; i++) { const u = (t * (0.4 + 0.7 * p) + i * 0.5 + (sg > 0 ? 0.2 : 0)) % 1; glint(ctx, ca * r * (0.12 + 0.86 * u), sa * r * (0.12 + 0.86 * u), 11 + 6 * p, Math.sin(u * PI) * (0.5 + 0.3 * p) * k, sg * h); }
      }
      ctx.beginPath(); ctx.arc(0, 0, r - 3, -h, h); ctx.strokeStyle = rgba(C.silver, (second ? 0.22 : 0.3 + 0.35 * p) * k); ctx.lineWidth = 2; if (second) ctx.setLineDash([10, 9]); ctx.stroke(); ctx.setLineDash([]);
      // the blade, lowering: it begins high behind her (drawn short and thin) and ends laid along the axis, the point at the tank
      const e = easeOut(clamp(p / 0.85, 0, 1)), L = r * (0.5 + 0.44 * e), bow = r * (0.1 + 0.035 * p), wd = 9 + 7 * e;
      crescentBlade(ctx, 36, L, bow * (second ? -0.7 : 1), wd, second ? 0.5 : 0.35 + 0.65 * p, k, { dash: second ? [9, 7] : null, col: second ? C.pane : C.hi });
      glint(ctx, L, 0, (second ? 10 : 16) + 20 * p, (second ? 0.3 : 0.3 + 0.6 * p * p) * k, 0);
      if (second) { ctx.beginPath(); ctx.arc(0, 0, r * 0.62, -h * 0.6, h * 0.6); ctx.strokeStyle = rgba(C.pane, 0.3 * k); ctx.lineWidth = 1.4; ctx.setLineDash([3, 9]); ctx.stroke(); ctx.setLineDash([]); }
      else if (late > 0) { ctx.beginPath(); ctx.arc(0, 0, r - 7, -h, h); ctx.strokeStyle = rgba(C.white, 0.5 * late * k); ctx.lineWidth = 4; ctx.stroke(); }
    });
  }

  // Moonwell: a shaft of light falling on the dust (blue): a pale column over the circle, bands of light running down it, motes gathered up into it
  TELLS.mlWell = { ground(ctx, tg, s, p, k, t) {
    const { x, y, r } = s, B = COLS().share, Bh = COLS().shareHi, need = Math.max(1, tg.need || 2), fk = flashK(), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1);
    glow(ctx, x, y, r * 1.9, B, 0.24 * k * fk);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = rgba(B, 0.14 * k); ctx.fill(); ctx.clip();
    // the floor lit: a pool, the light's spot on the dust
    const g = ctx.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, rgba(C.white, (0.3 + 0.26 * p) * k * fk)); g.addColorStop(0.6, rgba(Bh, (0.16 + 0.12 * p) * k * fk)); g.addColorStop(1, rgba(B, 0.04 * k)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    for (let i = 0; i < 3; i++) { const q = (t * (0.45 + 0.7 * p) + i / 3) % 1; ctx.beginPath(); ctx.arc(x, y, r * (1 - q * 0.85), 0, TAU); ctx.strokeStyle = rgba(Bh, Math.sin(q * PI) * (0.3 + 0.4 * p) * k); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    // the shaft: it falls from above the screen's top of the circle, its edges straight, bands of light running down it; widest at the floor
    const H = 330, w0 = r * 0.92, w1 = r * 0.62;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - w1, y - H); ctx.lineTo(x + w1, y - H); ctx.lineTo(x + w0, y); ctx.lineTo(x - w0, y); ctx.closePath(); ctx.clip();
    const sg = ctx.createLinearGradient(0, y - H, 0, y); sg.addColorStop(0, rgba(Bh, 0)); sg.addColorStop(0.7, rgba(Bh, (0.14 + 0.12 * p) * k * fk)); sg.addColorStop(1, rgba(C.white, (0.34 + 0.2 * p) * k * fk)); ctx.fillStyle = sg; ctx.fillRect(x - w0, y - H, w0 * 2, H);
    for (let i = 0; i < 5; i++) { const q = (t * (0.5 + 0.9 * p + 0.2 * i) + i / 5) % 1, yy = y - H + q * H; ctx.fillStyle = rgba(C.white, Math.sin(q * PI) * (0.1 + 0.14 * p) * k * fk); ctx.fillRect(x - w0, yy - 6, w0 * 2, 12); }
    ctx.restore();
    ctx.save(); ctx.lineCap = 'round';
    for (const [sx, a] of [[-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(x + sx * w1, y - H); ctx.lineTo(x + sx * w0, y); const lg = ctx.createLinearGradient(0, y - H, 0, y); lg.addColorStop(0, rgba(C.white, 0)); lg.addColorStop(1, rgba(C.white, (0.55 + 0.35 * late) * k * a)); ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    for (let i = 0; i < 7; i++) { const q = (t * (0.3 + 0.4 * p) + hash(i, 3)) % 1, a = hash(i, 5) * TAU, d = r * 0.9 * (1 - q); glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - q * 40, 6 + 3 * q, C.white, 0.5 * Math.sin(q * PI) * k * fk); }
    ctx.beginPath(); ctx.arc(x, y, r + 4, -PI / 2, -PI / 2 + TAU * (1 - p)); ctx.strokeStyle = rgba('#ffffff', 0.8 * k); ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < need; i++) { const a = -PI / 2 + (i - (need - 1) / 2) * 0.45; circle(ctx, x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12), 4.5, rgba(Bh, k), OUT, 1.5); }
  } };

  // a small moon: a sphere lit from the upper right, craters, a dark far side (the moonlet of the view, drawn to hang)
  function moonBall(c, x, y, r, a, glowK = 1) {
    c.save();
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 2.5, '#9cc8ff', 0.26 * a * glowK * flashK()); c.restore();
    const g = c.createRadialGradient(x + r * 0.35, y - r * 0.38, r * 0.08, x, y, r * 1.05);
    g.addColorStop(0, '#fbfdff'); g.addColorStop(0.45, '#bccae2'); g.addColorStop(0.85, '#53648a'); g.addColorStop(1, '#2a3552');
    c.globalAlpha = a; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = g; c.fill();
    c.save(); c.clip();
    for (const [cx, cy, cr] of [[-0.35, -0.2, 0.26], [0.2, 0.3, 0.2], [0.38, -0.34, 0.14], [-0.1, 0.55, 0.12]]) { c.beginPath(); c.arc(x + cx * r, y + cy * r, cr * r, 0, TAU); c.fillStyle = 'rgba(48,62,98,0.22)'; c.fill(); }
    c.restore();
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.strokeStyle = '#05070d'; c.lineWidth = 2.4; c.stroke();
    c.beginPath(); c.arc(x, y, r - 1.5, -1.4, 0.2); c.strokeStyle = rgba('#ffffff', 0.6); c.lineWidth = 1.4; c.stroke();
    c.restore();
  }
  // Moonlets and Moonfall: a small moon hangs over the hero it will fall on and lowers as the cast runs; its shadow grows on the floor under it
  const moonTell = {
    ground(ctx, tg, s, p, k, t) {
      const x = s.x, y = s.y, r = s.r, e = easeOut(p), fk = flashK();
      wash(ctx, s, p, k, t, 0.06);
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      const g = ctx.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, rgba(C.ink, (0.08 + 0.3 * e) * k)); g.addColorStop(0.7, rgba(C.ink, (0.04 + 0.12 * e) * k)); g.addColorStop(1, rgba(C.ink, 0.01 * k)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      for (let i = 0; i < 2; i++) { const q = (t * (0.5 + 0.9 * p) + i / 2) % 1; ctx.beginPath(); ctx.arc(x, y, r * (1 - q * 0.75), 0, TAU); ctx.strokeStyle = rgba(C.pane, Math.sin(q * PI) * (0.12 + 0.3 * p) * k * fk); ctx.lineWidth = 1.6; ctx.stroke(); }
      ctx.restore();
    },
    air(ctx, tg, s, p, k, t) {
      const z = 200 * (1 - p) * (1 - p) + 4, sc = 0.62 + 0.38 * easeOut(p), r = 27 * sc, x = s.x, y = s.y - 20 - z;
      if (z > 20) { ctx.save(); const g = ctx.createLinearGradient(0, y, 0, s.y - 18); g.addColorStop(0, rgba(C.ice, 0.0)); g.addColorStop(1, rgba(C.ice, 0.16 * k)); ctx.fillStyle = g; ctx.fillRect(x - r * 0.5, y, r, s.y - 18 - y); ctx.restore(); }
      moonBall(ctx, x, y + Math.sin(t * 1.6) * 1.5 * (1 - p), r, k, 0.7 + 0.6 * p);
    },
  };
  TELLS.mlMoonlet = moonTell; TELLS.mlMoonfall = moonTell;

  // a moonlet's burst (and a Harvest's wider): light coming out through the cracks of the moon where it lies, rays reaching out to the rim, the core brightening
  function burstTell(ctx, tg, s, p, k, t, env) {
    const x = s.x, y = s.y, r = s.r, wide = tg.tag === 'mlHarvest', e = easeOut(p), fk = flashK(), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), seed = (tg.id | 0) + 1;
    wash(ctx, s, p, k, t, 0.07);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(x, y, 6, x, y, r); g.addColorStop(0, rgba(C.white, (0.18 + 0.3 * p) * k * fk)); g.addColorStop(0.5, rgba(C.ice, (0.06 + 0.1 * p) * k * fk)); g.addColorStop(1, rgba(C.ice, 0.02 * k)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const n = wide ? 14 : 10; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, seed) * 0.4, d = r * (0.3 + 0.62 * e) * (0.7 + 0.3 * hash(i, 3)), kk = (0.3 + 0.6 * p) * k;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22);
      let px = x + Math.cos(a) * 22, py = y + Math.sin(a) * 22; const N = Math.max(2, Math.round(d / 22));
      for (let j = 1; j <= N; j++) { const u = j / N, aa = a + (hash(j, seed + i) - 0.5) * 0.4; px = x + Math.cos(a) * (22 + (d - 22) * u) + Math.cos(aa + PI / 2) * (hash(j, i) - 0.5) * 9; py = y + Math.sin(a) * (22 + (d - 22) * u) + Math.sin(aa + PI / 2) * (hash(j, i) - 0.5) * 9; ctx.lineTo(px, py); }
      ctx.strokeStyle = rgba(C.ink, 0.3 * kk); ctx.lineWidth = 3.6; ctx.stroke(); ctx.strokeStyle = rgba(C.white, kk); ctx.lineWidth = 1.3; ctx.stroke();
    }
    ctx.restore();
    if (wide) { ctx.beginPath(); ctx.arc(x, y, r * 0.64, 0, TAU); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = rgba(C.white, (0.4 + 0.3 * p) * k); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
    const q = (t * (1.4 + 3 * late)) % 1; ctx.beginPath(); ctx.arc(x, y, 30 + (r - 30) * q, 0, TAU); ctx.strokeStyle = rgba(C.white, (1 - q) * (0.16 + 0.3 * p) * k); ctx.lineWidth = 1.6; ctx.stroke();
    glint(ctx, x, y, 18 + 26 * p, (0.3 + 0.5 * p) * k, t * 0.4);
  }
  TELLS.mlBurst = { ground: burstTell }; TELLS.mlHarvest = { ground: burstTell };

  // a dash: the blade drawn taut along the lane (the thin silver line of the dash is the view's): two edges of light, a glint racing down it toward the hero's far side
  TELLS.mlDash = { ground(ctx, tg, s, p, k, t) {
    const hv = clamp((s.w - 90) / 35, 0, 1), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), fk = flashK();
    wash(ctx, s, p, k, t, 0.07);
    inLane(ctx, s, (L, hw) => {
      ctx.save(); ctx.beginPath(); ctx.rect(0, -hw, L, hw * 2); ctx.clip();
      const gl = ctx.createLinearGradient(0, -hw, 0, hw); gl.addColorStop(0, rgba(C.ice, 0)); gl.addColorStop(0.5, rgba(C.ice, (0.05 + 0.12 * p) * k * fk)); gl.addColorStop(1, rgba(C.ice, 0)); ctx.fillStyle = gl; ctx.fillRect(0, -hw, L, hw * 2);
      ctx.restore();
      for (const sg of [-1, 1]) {
        blade(ctx, 0, sg * (hw - 3), L, sg * (hw - 3), (0.45 + 0.4 * p + 0.15 * late) * k, 1.8 + 0.5 * hv);
        for (let i = 0; i < 3; i++) { const u = (t * (0.5 + 1.2 * p) * (1 + hv) + i / 3 + (sg > 0 ? 0.17 : 0)) % 1; glint(ctx, u * L, sg * hw, 9 + 3 * hv, Math.sin(u * PI) * (0.5 + 0.3 * p) * k, 0); }
      }
      // her end, where the blade is drawn from, and the far end, where it is going
      glint(ctx, 8, 0, 14 + 10 * p, (0.3 + 0.4 * p) * k, PI / 2);
      glint(ctx, L, 0, 14 + 22 * late, (0.3 + 0.5 * p) * k, PI / 2);
    });
  } };

  // the last light (a blue stack): a pool of light gathering: motes drawn in from the rim to the middle, the edge a closing ring of white
  TELLS.mlPool = { ground(ctx, tg, s, p, k, t) {
    const { x, y, r } = s, B = COLS().share, Bh = COLS().shareHi, fk = flashK(), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), seed = (tg.id | 0) + 5;
    glow(ctx, x, y, r * 1.5, B, 0.2 * k * fk);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = rgba(B, 0.1 * k); ctx.fill(); ctx.clip();
    const g = ctx.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, rgba(C.white, (0.26 + 0.3 * p) * k * fk)); g.addColorStop(0.55, rgba(Bh, (0.12 + 0.12 * p) * k * fk)); g.addColorStop(1, rgba(B, 0.04 * k)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed) * TAU + t * 0.15, q = (t * (0.28 + 0.5 * p) + hash(i, seed + 1)) % 1, d = r * (1.02 - 0.96 * q), sz = 4 + 4 * (1 - q);
      glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, sz, i % 3 ? C.white : Bh, Math.sin(q * PI) * (0.5 + 0.3 * p) * k * fk);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.lineTo(x + Math.cos(a) * (d + 14), y + Math.sin(a) * (d + 14)); ctx.strokeStyle = rgba(C.white, Math.sin(q * PI) * 0.22 * k); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r * (1 - p) + 6, 0, TAU); ctx.strokeStyle = rgba(Bh, (0.55 + 0.35 * late) * k); ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(x, y, r * (1 - p) + 6, 0, TAU); ctx.strokeStyle = rgba(C.white, 0.18 * k * fk); ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
  } };

  // a pounce: the hound and his rider coming down: their shadow growing over the dust (her blade a crescent of light across it), the air drawn in toward the middle, cracks of light
  function pounceTell(ctx, tg, s, p, k, t, env) {
    const r = s.r, heavy = clamp((r - 200) / 190, 0, 1), b = bossOf(env), ang = Math.atan2(s.y - b.y, s.x - b.x), shade = tg.tag === 'mlShadePounce', fk = flashK(), late = clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1), seed = (tg.id | 0) + 2;
    wash(ctx, s, p, k, t, 0.09 + 0.03 * heavy);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, r); g.addColorStop(0, rgba(C.ink, (0.1 + 0.26 * p) * (1 + 0.4 * heavy) * k)); g.addColorStop(0.7, rgba(C.ink, (0.05 + 0.14 * p) * (1 + 0.3 * heavy) * k)); g.addColorStop(1, rgba(C.ink, (0.02 + 0.05 * p) * k)); ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    const nr = 3 + Math.round(2 * heavy); ctx.lineCap = 'round';
    for (let i = 0; i < nr; i++) { const q = (t * (0.55 + 1.1 * p) + i / nr) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, r * (1 - q * 0.82), 0, TAU); ctx.strokeStyle = rgba(shade ? C.shade : C.dust, Math.sin(q * PI) * (0.08 + 0.3 * p) * k * fk); ctx.lineWidth = 1.6 + 1.6 * heavy; ctx.stroke(); }
    // the shadow of the two of them: a body with the legs flung out, a rider's thin upright over it, growing as they come down
    const sc = 0.5 + 0.5 * easeOut(p), L = 74 * (0.9 + 0.2 * heavy);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang); ctx.scale(sc, sc * 0.82); ctx.fillStyle = rgba('#000000', (0.2 + 0.32 * p) * k); ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(-4, 0, L * 0.7, L * 0.3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(L * 0.7, 0, L * 0.26, L * 0.19, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 11; for (const [x, y, ex, ey] of [[-L * 0.5, -L * 0.2, -L * 0.95, -L * 0.62], [-L * 0.5, L * 0.2, -L * 0.95, L * 0.62], [L * 0.3, -L * 0.2, L * 0.72, -L * 0.62], [L * 0.3, L * 0.2, L * 0.72, L * 0.62]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(-L * 0.15, 0, L * 0.2, L * 0.12, 0, 0, TAU); ctx.fill();
    // her blade across it: a crescent of light, held out over the hound's head
    if (!shade) crescentBlade(ctx, L * 0.1, L * 1.5, L * 0.38, 5 + 5 * p, 0.45 + 0.5 * p, k * 1.1, { col: C.hi });
    ctx.restore();
    // the cracks of the floor opening under it
    const nc = Math.round(4 + 8 * heavy);
    for (let i = 0; i < nc; i++) { const a = i * TAU / nc + hash(i, seed) * 0.5, d = r * (0.14 + 0.62 * p) * (0.7 + 0.3 * hash(i, 5)); ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * 12, s.y + Math.sin(a) * 12); ctx.lineTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9); ctx.strokeStyle = rgba(C.white, (0.14 + 0.3 * p) * k * fk); ctx.lineWidth = 1.2 + heavy; ctx.stroke(); }
    ctx.restore();
    if (late > 0) { ctx.beginPath(); ctx.arc(s.x, s.y, r - 4, 0, TAU); ctx.strokeStyle = rgba(C.white, 0.35 * late * k); ctx.lineWidth = 3; ctx.stroke(); }
  }
  TELLS.mlPounce = { ground: pounceTell }; TELLS.mlShadePounce = { ground: pounceTell };

  // the raidwides: an act's opener is a band of light crossing the floor from her side to the far wall; Full Moon (hidden: the crown is its tell) a hush: slow rings going out from her
  TELLS.mlOpen = { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
    const b = bossOf(env), R = ARENA.R, ang = Math.atan2(-b.y, -b.x) || PI / 2, e = easeIO(clamp(p, 0, 1)), W = 150, A = (0.05 + 0.1 * Math.sin(PI * e)) * k * flashK(), d = -R - W + (2 * R + 2 * W) * e;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip(); ctx.rotate(ang);
    const g = ctx.createLinearGradient(d - W, 0, d + W, 0); g.addColorStop(0, rgba(C.ice, 0)); g.addColorStop(0.5, rgba(C.white, A)); g.addColorStop(1, rgba(C.ice, 0)); ctx.fillStyle = g; ctx.fillRect(d - W, -R - 20, W * 2, R * 2 + 40);
    ctx.restore();
  } };
  TELLS.mlFull = { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
    const b = bossOf(env), R = ARENA.R, fk = flashK();
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    const nR = 3;
    for (let i = 0; i < nR; i++) {
      const q = (t * (0.16 + 0.26 * p) + i / nR) % 1, r = 60 + q * R * 1.3, a = Math.sin(q * PI) * (0.03 + 0.2 * p) * k * fk;
      ctx.beginPath(); ctx.arc(b.x, b.y + 40, r, 0, TAU); ctx.strokeStyle = rgba(C.pane, a * 0.5); ctx.lineWidth = 12 * (1 - q * 0.5); ctx.stroke(); ctx.strokeStyle = rgba(C.white, a); ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
  } };

  // ---------------------------------------------------------------- what stays on the floor: faint scars of light and dust, kept here, drawn under the units
  function mark(dur, draw, x, y) { S.marks.push({ t0: nowS(), dur, draw, x, y }); if (S.marks.length > 40) S.marks.shift(); }
  function drawMarks(ctx, t) {
    const now = nowS();
    for (let i = S.marks.length - 1; i >= 0; i--) {
      const m = S.marks[i], age = now - m.t0;
      if (age >= m.dur) { S.marks.splice(i, 1); continue; }
      const f = clamp(1 - (age - m.dur * 0.35) / (m.dur * 0.65), 0, 1) * clamp(age / 0.08, 0, 1);
      ctx.save(); ARENA.trace(ctx, 3); ctx.clip();
      try { m.draw(ctx, f * 0.55, age, Math.floor(m.x * 7 + m.y * 3) & 1023); } finally { ctx.restore(); }
    }
  }

  // ---------------------------------------------------------------- weight: what a heavy blow does to the dust, and how the dust settles back
  // The moon's dust is fine and the gravity low. A blow lifts a pale haze along the cut that rises a little, hangs, and sinks back slowly; a low ring of dust runs out along the floor;
  // a groove is cut where the blade went (a dark trough, the dust it threw lying along both lips) and then the dust slumps back in from the lips until it is smooth. Under the units
  // and every warning (under()), faint, gone in about four seconds so the floor is clean before the next move. No shake, flash or sound is added here. mag: 0.4 a dash .. 1 Earthshine.
  const WT = [];
  const lite = () => typeof FX !== 'undefined' && FX.quality && FX.quality !== 'full';
  function weightLand(o, mag) {
    if (WT.length > 8) return;
    WT.push(Object.assign({ t0: nowS(), mag, dur: Math.min(4.8, 3.6 + 1.0 * mag) }, o));
    const n = Math.round((lite() ? 6 : 15) * mag) + 4, pts = o.pts && o.pts.length ? o.pts : [o.ring ? [o.ring[0], o.ring[1]] : [0, 0]];
    for (let i = 0; i < n; i++) {   // the haze: it rises a little, hangs in the low gravity, and sinks back (a long life and a light pull)
      const q = pts[(Math.random() * pts.length) | 0];
      VFX.spawn({ x: q[0] + rand(-10, 10), y: q[1] + rand(-6, 6), z: rand(2, 12), vx: rand(-16, 16), vy: rand(-8, 8), vz: rand(28, 58) * (0.6 + 0.5 * mag), g: 26, drag: 0.03, life: rand(2.4, 3.4), size: rand(18, 32), size1: 40, color: C.dust, kind: 'smoke', add: false, ground: true, a: 0.4, fadeIn: 0.1, fadePow: 2.4 });
    }
  }
  function drawWeight(ctx) {
    if (!WT.length) return;
    const now = nowS();
    ctx.save(); ARENA.trace(ctx, 3); ctx.clip(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = WT.length - 1; i >= 0; i--) {
      const w = WT[i], age = now - w.t0;
      if (age > w.dur) { WT.splice(i, 1); continue; }
      const m = w.mag, fill = clamp((age - 0.6) / (w.dur * 0.78), 0, 1), dent = Math.pow(1 - fill, 1.3), open = Math.min(1, age / 0.1);
      if (w.ring && age < 1.0) {   // the low ring of dust running out along the floor
        const q = clamp(age / 1.3, 0, 1), r = w.ring[2] * easeOut(q), a = Math.pow(1 - q, 1.2) * Math.min(1, 0.55 * m);
        ctx.beginPath(); ctx.ellipse(w.ring[0], w.ring[1], r, r * 0.8, 0, 0, TAU); ctx.strokeStyle = rgba(C.dustDk, a * 0.8); ctx.lineWidth = (16 + 6 * m) * (1 - q) + 3; ctx.stroke();
        ctx.strokeStyle = rgba(C.dust, a); ctx.lineWidth = (7 + 3 * m) * (1 - q) + 1.5; ctx.stroke();
        ctx.strokeStyle = rgba(C.white, a * 0.9); ctx.lineWidth = 1.6; ctx.stroke();
      }
      if (dent > 0.01) {
        const gw = (15 + 13 * m) * dent * open;
        if (w.term && termPath(ctx, w.term)) {   // the groove along the terminator: trough, and the dust thrown to each side
          ctx.strokeStyle = rgba(C.dustDk, 0.52 * dent); ctx.lineWidth = gw; ctx.stroke();
          const off = gw * 0.5 + 3 + 4 * dent, ax = Math.cos(w.term.angle), ay = Math.sin(w.term.angle);
          for (const sg of [-1, 1]) { ctx.save(); ctx.translate(ax * off * sg, ay * off * sg); termPath(ctx, w.term); ctx.strokeStyle = rgba(C.white, 0.6 * dent); ctx.lineWidth = 3 * dent + 0.8; ctx.stroke(); ctx.restore(); }
        }
        if (w.line) {
          const [x1, y1, x2, y2] = w.line, L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L, off = gw * 0.5 + 3 + 4 * dent;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = rgba(C.dustDk, 0.52 * dent); ctx.lineWidth = gw; ctx.stroke();
          ctx.strokeStyle = rgba(C.white, 0.6 * dent); ctx.lineWidth = 3 * dent + 0.8;
          ctx.beginPath(); ctx.moveTo(x1 + nx * off, y1 + ny * off); ctx.lineTo(x2 + nx * off, y2 + ny * off); ctx.moveTo(x1 - nx * off, y1 - ny * off); ctx.lineTo(x2 - nx * off, y2 - ny * off); ctx.stroke();
        }
        if (w.pit) {   // a dent where something heavy fell: the bowl fills from its rim
          const r = w.pit[2] * (0.55 + 0.45 * dent) * open;
          ctx.beginPath(); ctx.arc(w.pit[0], w.pit[1], r, 0, TAU); ctx.fillStyle = rgba(C.dustDk, 0.36 * dent); ctx.fill();
          ctx.strokeStyle = rgba(C.white, 0.6 * dent); ctx.lineWidth = 3.6 * dent + 0.8; ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  const along = (x1, y1, x2, y2, n) => { const o = []; for (let i = 0; i < n; i++) { const q = (i + 0.5) / n; o.push([x1 + (x2 - x1) * q, y1 + (y2 - y1) * q]); } return o; };

  // ---------------------------------------------------------------- the landings
  // the heroes a landing struck: the host's list when it sent one, else those in the shape
  function struck(ctx, tg, pad = 6) {
    const hits = ctx.hitIds, out = [];
    for (const u of ctx.units || []) { if (hits ? hits.has(u.id) : SHAPES.contains(tg.live, u.x, u.y, pad)) out.push(u); }
    return out;
  }
  function hurt(ctx, tg, o = {}) {
    for (const u of struck(ctx, tg, 6)) {
      VFX.hit(u.x, u.y, o.col || C.ice, o.size || 1.7);
      dustUp(u.x, u.y - 4, 4, { size: 0.7, speed: 0.8, col: o.dust });
    }
  }
  // dust thrown up off a point (pale), and a few motes of light in it
  function dustUp(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || 1.4) : rand(0, TAU), sp = rand(60, 190) * (o.speed || 1);
      VFX.spawn({ x, y, z: rand(2, 14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.55, vz: rand(30, 130) * (o.up || 1), drag: 0.035, life: rand(0.8, 1.5), size: rand(22, 34) * (o.size || 1), size1: 70 * (o.size || 1), color: o.col || C.dust, kind: 'smoke', add: false, a: o.a ?? 0.42, fadeIn: 0.05, fadePow: 2 });
    }
    VFX.sparks(x, y, { color: C.white, n: Math.max(2, Math.round(n * 0.6)), speed: 200 * (o.speed || 1), up: 50, g: 400 });
  }
  const after = (sec, fn) => VFX.fx({ dur: Math.max(0.01, sec), layer: 'ground', draw() {}, done: fn });
  const fxIn = (dur, draw, o = {}) => VFX.fx({ dur, layer: o.layer || 'air', delay: o.delay, draw: (c, p, t, e) => { c.save(); ARENA.trace(c, 4); c.clip(); try { draw(c, p, t, e); } finally { c.restore(); } } });
  function ringAt(x, y, o = {}) { fxIn(o.dur || 0.5, (c, p, t, e) => { VFX.neonRing(c, x, y, (o.r0 || 0) + ((o.r || 90) - (o.r0 || 0)) * easeOut(p), o.color || C.ice, (o.w || 5) * (1 - p * 0.7), e.a * (1 - p), 0.8); }, { delay: o.delay, layer: 'ground' }); }
  // a line of light that goes through a place in an instant, then fades
  function slashLine(x1, y1, x2, y2, o = {}) {
    fxIn(o.dur || 0.34, (c, p, t, e) => {
      const q = easeOut(clamp(p / 0.28, 0, 1)), kk = e.a * (1 - clamp((p - 0.2) / 0.8, 0, 1));
      VFX.neonPath(c, o.color || C.ice, (o.w || 12) * (1 - p * 0.5), kk, () => { c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q); });
    }, { delay: o.delay });
  }

  const IMP = {};
  // a cut: the light sweeps the lit ground to the terminator and the dust lifts along it. Every cut of a dance is faster and heavier than the last
  function cutLand(tg, msg, ctx, H) {
    const s = tg.live, ci = cutInfo(tg), hv = climb(ci), tag = tg.tag || '', umb = /^mlU/.test(tag), small = tag === 'mlStepCut', a0 = s.angle, r = s.r;
    const sz = small ? 0.6 : 1, dur = 0.5 + 0.2 * hv, qd = 0.38 - 0.12 * hv;
    if (!umb) H.shapeFlash(s, C.ice, { a: (small ? 0.12 : 0.1 + 0.1 * hv), dur }); else H.shapeFlash(s, '#8ea4c8', { rimOnly: true, dur });
    const sweptFx = (delay, wd, a) => fxIn(0.5, (c, p, t, e) => { const q = easeOut(clamp(p / qd, 0, 1)), kk = e.a * (1 - clamp((p - 0.25) / 0.75, 0, 1)) * flashK(); swept(c, s, q, a * kk * (umb ? 1.3 : 1), wd, C.ice, umb); }, { delay, layer: 'ground' });
    sweptFx(0, 80 + 50 * hv, 0.42 + 0.1 * hv);
    if (hv > 0.25) sweptFx(0.07, 60, 0.28);
    if (hv > 0.7) sweptFx(0.14, 50, 0.24);
    // the terminator itself: the cut's edge burning white, trailing copies of it dragged out toward where the light came from
    if (s.ph !== 'full') {
      fxIn(0.55 + 0.15 * hv, (c, p, t, e) => {
        const kk = e.a * (1 - clamp((p - 0.12) / 0.88, 0, 1)), n = 1 + Math.round(2 * hv);
        for (let g = n; g >= 0; g--) {
          const off = g * (16 + 8 * hv) * easeOut(clamp(p / 0.4, 0, 1)); c.save(); c.translate(Math.cos(a0) * off, Math.sin(a0) * off);
          termPath(c, s); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(umb ? C.pane : C.frost, 0.5 * kk / (1 + g) * flashK()); c.lineWidth = (13 + 8 * hv) * (1 - p * 0.5) * sz; c.lineCap = 'round'; c.stroke(); c.restore();
          termPath(c, s); c.strokeStyle = rgba(C.white, Math.min(1, 1.1 * kk / (1 + g * 0.6))); c.lineWidth = (3.6 + 2.2 * hv) * (1 - g * 0.12) * sz; c.stroke(); c.restore();
        }
      });
      // the dust lifting along it
      const nD = Math.round((8 + 8 * hv) * sz) + (ci.n === ci.of && ci.kd === 'dance' ? 6 : 0);
      for (let i = 0; i < nD; i++) { const u = (i + 0.5) / nD, q = termPt(s, u); after(u * 0.16, () => { if (!inShapeArena(q.x, q.y)) return; dustUp(q.x, q.y, 1, { angle: a0 + PI + (Math.random() - 0.5) * 0.9, spread: 0.6, size: 0.9 + 0.25 * hv, speed: 0.9 + 0.5 * hv, a: umb ? 0.5 : 0.4, col: umb ? C.dustDk : C.dust }); if (i % 3 === 0) VFX.glint(q.x, q.y, { z: 6, size: 18 + 10 * hv, color: C.white }); }); }
    }
    // an umbral cut: the dark red of the crown's limb flares on the rim where it struck
    if (umb && !small) fxIn(0.6, (c, p, t, e) => { const kk = e.a * (1 - p) * (1 - p); c.beginPath(); c.arc(s.x, s.y, r - 5, a0 - 1.15, a0 + 1.15); c.lineCap = 'round'; c.strokeStyle = rgba(C.limb, 0.9 * kk); c.lineWidth = 10 + 8 * hv; c.stroke(); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#7a1a26', 0.3 * kk * flashK()); c.lineWidth = 34; c.stroke(); c.restore(); });
    hurt(ctx, tg, { size: 1.6 + 0.3 * hv, col: umb ? C.pane : C.ice });
    if (small) { const q = termPt(s, 0.5); VFX.flash(q.x, q.y, 80, C.white, 0.18); }
    mark(3.4 + 1.4 * hv, (c, a, age, seed) => { if (s.ph === 'full') return; termPath(c, s); c.lineCap = 'round'; c.strokeStyle = rgba(umb ? C.silver : C.white, 0.55 * a); c.lineWidth = 1.6 + hv; c.stroke(); termPath(c, s); c.strokeStyle = rgba(C.dustDk, 0.25 * a); c.lineWidth = 6; c.stroke(); }, s.x, s.y);
    if (!small && s.ph !== 'full') {   // (the dust takes the blow and settles: weightLand above)
      const pts = []; for (let i = 0; i < 8; i++) { const q = termPt(s, (i + 0.5) / 8); if (inShapeArena(q.x, q.y)) pts.push([q.x, q.y]); }
      const mid = termPt(s, 0.5); weightLand({ term: Object.assign({}, s), pts, ring: [mid.x, mid.y, 80 + 70 * (0.45 + 0.3 * hv)] }, 0.45 + 0.3 * hv);
    }
    shakeNow(small ? 3 : 5 + 4 * hv);
    if (!small && hv >= 0.99) camFx(0.07, 0.03, 0.4); else if (!small && hv > 0.4) camFx(0.03, 0.015, 0.3);
  }
  const inShapeArena = (x, y) => (typeof ARENA !== 'undefined' && ARENA.sd ? ARENA.sd(x, y) < -10 : true);
  for (const ph of ['Crescent', 'Half', 'Gibbous']) for (const pre of ['ml', 'mlTwin', 'mlLib', 'mlPass']) IMP[pre + ph] = cutLand;
  IMP.mlUCrescent = cutLand; IMP.mlUHalf = cutLand; IMP.mlStepCut = cutLand;

  // Annular: both lit edges go off at once: one ring goes out to the rim, the other in to the middle
  IMP.mlAnnular = (tg, msg, ctx, H) => {
    const s = tg.live;
    H.shapeFlash(s, C.ice, { a: 0.18, dur: 0.55 });
    fxIn(0.7, (c, p, t, e) => { const kk = e.a * (1 - p) * (1 - p), q = easeOut(p); VFX.neonRing(c, 0, 0, s.r + (ARENA.R + 30 - s.r) * q, C.white, 10 * (1 - p * 0.6), kk, 1); VFX.neonRing(c, 0, 0, s.r2 * (1 - q * 0.9), C.white, 10 * (1 - p * 0.6), kk, 1); VFX.neonRing(c, 0, 0, s.r - (s.r - s.r2) * q * 0.5, C.frost, 6, kk * 0.8, 1); });
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18; after(i * 0.01, () => { const rr = i % 2 ? s.r - 8 : s.r2 + 8; dustUp(Math.cos(a) * rr, Math.sin(a) * rr, 1, { angle: a + (i % 2 ? 0 : PI), spread: 0.6, size: 0.9, speed: 0.9 }); }); }
    { const mr = (s.r + s.r2) / 2, pts = []; for (let i = 0; i < 12; i++) pts.push([Math.cos(i * TAU / 12) * mr, Math.sin(i * TAU / 12) * mr]); weightLand({ pts, ring: [0, 0, s.r + 40] }, 0.8); }   // (the ring of dust thrown up settles back over the floor it struck)
    hurt(ctx, tg, { size: 1.9 });
    mark(4, (c, a) => { for (const rr of [s.r - 2, s.r2 + 2]) { c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.strokeStyle = rgba(C.white, 0.5 * a); c.lineWidth = 1.6; c.stroke(); } }, 0, 0);
    shakeNow(8);
  };

  // Earthshine: the blade of earthlight goes through the cone in a breath; the second hit is a pale crescent after it, thinner, a beat behind
  function earthLand(tg, msg, ctx, H) {
    const s = tg.live, second = tg.tag === 'mlEarthshine2', e = tg.target != null && ctx.entById ? ctx.entById(tg.target) : null;
    const x = e ? e.x : s.x + Math.cos(s.angle) * s.r * 0.6, y = e ? e.y : s.y + Math.sin(s.angle) * s.r * 0.6;
    const k0 = second ? 0.6 : 1;
    H.shapeFlash(s, second ? C.pane : C.ice, { a: second ? 0.1 : 0.16, dur: second ? 0.45 : 0.55 });
    fxIn(0.55, (c, p, t, e2) => {
      const q = easeOut(clamp(p / 0.3, 0, 1)), kk = e2.a * (1 - clamp((p - 0.22) / 0.78, 0, 1)) * k0, h = s.arc / 2, a1 = s.angle + (-h + 2 * h * q), a0 = s.angle - h;
      c.save(); c.translate(s.x, s.y);
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s.r, Math.min(a0, a1), Math.max(a0, a1)); c.closePath();
      const g = c.createRadialGradient(0, 0, 10, 0, 0, s.r); g.addColorStop(0, rgba(C.ice, 0.04 * kk)); g.addColorStop(1, rgba(second ? C.pane : C.ice, 0.34 * kk * flashK())); c.fillStyle = g; c.fill();
      VFX.neonPath(c, second ? C.pane : C.ice, (second ? 7 : 12) * (1 - p * 0.5), kk, () => { c.moveTo(Math.cos(a1) * s.r * 0.08, Math.sin(a1) * s.r * 0.08); c.lineTo(Math.cos(a1) * s.r, Math.sin(a1) * s.r); });
      // the crescent of the blade itself, the width of the cone, carried through it: a pale arc at the leading edge
      c.beginPath(); c.arc(0, 0, s.r * (0.9 - 0.06 * p), a1 - 0.5 * (second ? 0.7 : 1), a1 + 0.5 * (second ? 0.7 : 1)); c.strokeStyle = rgba(C.white, kk); c.lineWidth = second ? 3 : 5; c.lineCap = 'round'; c.stroke();
      c.restore();
    });
    // the blade itself, thrown the whole length of the cone: with the tank standing at her feet the cut is hidden behind them, so it is drawn out to the far edge, where it can be read
    { const ex = s.x + Math.cos(s.angle) * s.r * 0.97, ey = s.y + Math.sin(s.angle) * s.r * 0.97; slashLine(s.x + Math.cos(s.angle) * 40, s.y + Math.sin(s.angle) * 40, ex, ey, { w: second ? 9 : 15, dur: second ? 0.38 : 0.5, color: second ? C.pane : C.ice }); slashLine(s.x + Math.cos(s.angle) * 40, s.y + Math.sin(s.angle) * 40, ex, ey, { w: second ? 4 : 6, dur: 0.34, color: C.white }); }
    const n = second ? 5 : 8;
    for (let i = 0; i < n; i++) { const a = s.angle + (i / (n - 1) - 0.5) * s.arc * 0.9; after(i * 0.025, () => dustUp(s.x + Math.cos(a) * (s.r - 14), s.y + Math.sin(a) * (s.r - 14), 1, { angle: a, spread: 0.6, size: second ? 0.8 : 1, speed: 1, a: 0.36 })); }
    VFX.hit(x, y, second ? C.pane : C.ice, second ? 1.5 : 2.1);
    if (!second) { ringAt(x, y, { r: 130, w: 8, dur: 0.5 }); ringAt(x, y, { r: 72, w: 5, dur: 0.4, delay: 0.05, color: C.white }); dustUp(x, y, 7, { size: 1.1, speed: 1.1 }); }
    if (!second) {   // the cut is laid the whole length of the cone (the tank is often at her feet: a groove to them alone is a few steps): a groove to the far edge, a bowl under its middle, the dust thrown up all along it
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), fx = s.x + ca * s.r * 0.88, fy = s.y + sa * s.r * 0.88, mx = s.x + ca * s.r * 0.52, my = s.y + sa * s.r * 0.52;
      weightLand({ line: [s.x + ca * 50, s.y + sa * 50, fx, fy], pit: [mx, my, 120], pts: along(s.x + ca * 50, s.y + sa * 50, fx, fy, 10), ring: [mx, my, 290] }, 1.6);
    }
    mark(3.4, (c, a, age, seed) => { for (const sg of [-1, 1]) { const an = s.angle + sg * s.arc * 0.45; c.beginPath(); c.moveTo(s.x + Math.cos(an) * s.r * 0.2, s.y + Math.sin(an) * s.r * 0.2); c.lineTo(s.x + Math.cos(an) * s.r * 0.9, s.y + Math.sin(an) * s.r * 0.9); c.strokeStyle = rgba(C.white, 0.45 * a * (second ? 0.6 : 1)); c.lineWidth = 1.3; c.stroke(); } }, s.x, s.y);
    shakeNow(second ? 4 : 9); if (!second) camFx(0.06, 0.025, 0.35);
  }

  // Moonwell: the shaft of light flares and sinks into the dust; a soak missed is a shaft that gutters out, cold
  IMP.mlWell = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y, ok = !msg.fail;
    H.shapeFlash(s, ok ? '#7fb4ff' : C.frostDk, { a: ok ? 0.34 : 0.16, dur: 0.55 });
    ringAt(x, y, { r: s.r * 1.9, w: 8, dur: 0.7, color: ok ? '#9fc8ff' : C.frostDk }); ringAt(x, y, { r: s.r * 1.1, w: 5, dur: 0.5, delay: 0.06, color: C.white });
    if (ok) fxIn(0.8, (c, p, t, e) => { const kk = e.a * (1 - p) * (1 - p), hgt = 330 * easeOut(clamp(p / 0.35, 0, 1)), w = s.r * (0.92 - 0.5 * p); const g = c.createLinearGradient(0, y, 0, y - hgt); g.addColorStop(0, rgba('#cfe6ff', 0.7 * kk * flashK())); g.addColorStop(1, rgba('#bcd8ff', 0)); c.fillStyle = g; c.fillRect(x - w, y - hgt, w * 2, hgt); });
    else { dustUp(x, y, 7, { size: 1.1, col: C.dustDk }); }
    if (ok) VFX.motes(x, y - 10, { n: 12, color: C.ice, r: 40, rise: 1.8 });
    for (const u of struck(ctx, tg, 4)) if (ok) VFX.hit(u.x, u.y, '#bcd8ff', 1.3);
    shakeNow(ok ? 3 : 6);
  };

  // a moonlet set down (Moonlets, Moonfall): it touches the dust: a ring, a puff of dust, and the dent it leaves (the moon itself is the view's prop)
  const moonDown = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.shapeFlash(s, C.ice, { a: 0.14, dur: 0.45 });
    ringAt(x, y, { r: s.r * 1.1, w: 6, dur: 0.5 }); ringAt(x, y, { r: s.r * 0.6, w: 4, dur: 0.4, delay: 0.05, color: C.white });
    dustUp(x, y, 9, { size: 1.2, speed: 1.1 });
    VFX.hit(x, y, C.ice, 1.5);
    weightLand({ pit: [x, y, s.r * 0.7], pts: [[x, y]], ring: [x, y, s.r * 1.5] }, 0.6);   // (a moonlet set down dents the dust)
    hurt(ctx, tg, { size: 1.5 });
    mark(3.4, (c, a, age, seed) => { c.beginPath(); c.ellipse(x, y + 6, 36, 13, 0, 0, TAU); c.fillStyle = rgba(C.dustDk, 0.35 * a); c.fill(); c.strokeStyle = rgba(C.white, 0.4 * a); c.lineWidth = 1.2; c.stroke(); }, x, y);
    shakeNow(4);
  };
  IMP.mlMoonlet = moonDown; IMP.mlMoonfall = moonDown;

  // a burst (and Harvest's wider): the moon goes off: rays of light to the rim, a ring, shards of moon thrown out, a scar of cracks
  function burstLand(tg, msg, ctx, H) {
    const s = tg.live, x = s.x, y = s.y, r = s.r, wide = tg.tag === 'mlHarvest';
    H.shapeFlash(s, C.ice, { a: wide ? 0.2 : 0.16, dur: 0.55 });   // (cool, not white: the no-white-out rule)
    fxIn(0.6, (c, p, t, e) => {
      const kk = e.a * (1 - p) * (1 - p), n = wide ? 14 : 10; c.lineCap = 'round';
      for (let i = 0; i < n; i++) { const a = i * TAU / n + hash(i, 3) * 0.3, d0 = 20 + 30 * p, d1 = r * (0.5 + 0.6 * easeOut(clamp(p / 0.4, 0, 1))) * (0.8 + 0.3 * hash(i, 4)); VFX.neonPath(c, C.ice, 6 * (1 - p), kk, () => { c.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); c.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); }); }
      glow(c, x, y, r * 0.8, C.ice, 0.26 * kk * flashK());
    });
    ringAt(x, y, { r: r * 1.35, w: 10, dur: 0.6 }); ringAt(x, y, { r: r * 0.8, w: 6, dur: 0.45, delay: 0.05, color: C.white });
    if (wide) ringAt(x, y, { r: r * 1.7, w: 7, dur: 0.75, delay: 0.1, color: C.pane });
    for (let i = 0; i < (wide ? 18 : 12); i++) { const a = rand(0, TAU), sp = rand(120, 330) * (wide ? 1.2 : 1); VFX.spawn({ x, y, z: rand(8, 24), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(120, 300), g: 560, drag: 0.02, life: rand(0.6, 1.1), size: rand(5, 11), size1: 1, color: i % 3 ? C.pane : C.white, kind: 'shard', add: false, vr: rand(-12, 12) }); }
    dustUp(x, y, wide ? 10 : 7, { size: 1.3, speed: 1.3 });
    weightLand({ pit: [x, y, r * 0.8], pts: [[x, y]], ring: [x, y, r * 1.4] }, wide ? 0.9 : 0.7);   // (the moon breaks and the dust settles over the hole)
    hurt(ctx, tg, { size: 2 });
    mark(4.2, (c, a, age, seed) => { for (let i = 0; i < 9; i++) { const an = i * TAU / 9 + hash(i, seed) * 0.4, d = r * (0.5 + 0.4 * hash(i, seed + 1)); c.beginPath(); c.moveTo(x + Math.cos(an) * 24, y + Math.sin(an) * 24); c.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.9); c.strokeStyle = rgba(C.white, 0.5 * a); c.lineWidth = 1.2; c.stroke(); } c.beginPath(); c.ellipse(x, y, 30, 18, 0, 0, TAU); c.fillStyle = rgba(C.dustDk, 0.3 * a); c.fill(); }, x, y);
    shakeNow(wide ? 12 : 8); camFx(wide ? 0.07 : 0.04, 0.02, 0.35);
  }
  IMP.mlBurst = burstLand; IMP.mlHarvest = burstLand;

  // a dash: the blade has gone through the lane: a streak of light down it, dust thrown to both sides
  IMP.mlDash = (tg, msg, ctx, H) => {
    const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), x2 = s.x + ca * s.len, y2 = s.y + sa * s.len, hv = clamp((s.w - 90) / 35, 0, 1);
    H.shapeFlash(s, C.ice, { a: 0.18 + 0.06 * hv, dur: 0.45 });
    slashLine(s.x, s.y, x2, y2, { w: 12 + 6 * hv, dur: 0.4, color: C.ice }); slashLine(s.x, s.y, x2, y2, { w: 5, dur: 0.3, color: C.white });
    fxIn(0.5, (c, p, t, e) => { const kk = e.a * (1 - p) * (1 - p); c.save(); c.translate(s.x, s.y); c.rotate(s.angle); for (const sg of [-1, 1]) blade(c, 0, sg * s.w / 2, s.len, sg * s.w / 2, kk, 2.2 + hv); c.restore(); });
    for (let d = 40; d < s.len; d += 70) { const px = s.x + ca * d, py = s.y + sa * d; after(d / s.len * 0.12, () => dustUp(px, py, 2, { angle: s.angle + PI / 2, spread: PI, size: 0.8, speed: 1.1, a: 0.36 })); }
    VFX.hit(x2, y2, C.ice, 1.4);
    weightLand({ line: [s.x, s.y, x2, y2], pts: along(s.x, s.y, x2, y2, 8) }, 0.4);
    hurt(ctx, tg, { size: 1.8 });
    mark(3, (c, a) => { c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(x2, y2); c.strokeStyle = rgba(C.white, 0.4 * a); c.lineWidth = 1.4; c.stroke(); }, s.x, s.y);
    shakeNow(5 + 2 * hv);
  };

  // the last light: met, it blooms: a column of light and a swell on the dust; missed, it goes dull
  IMP.mlPool = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y, ok = !msg.fail;
    H.shapeFlash(s, ok ? '#7fb4ff' : C.frostDk, { a: ok ? 0.3 : 0.14, dur: 0.55 });
    ringAt(x, y, { r: s.r * 1.4, w: 8, dur: 0.65, color: ok ? '#9fc8ff' : C.frostDk }); ringAt(x, y, { r: s.r * 0.8, w: 5, dur: 0.5, delay: 0.06, color: C.white });
    if (ok) { fxIn(0.8, (c, p, t, e) => { const kk = e.a * (1 - p) * (1 - p), hgt = 260 * easeOut(clamp(p / 0.4, 0, 1)); const g = c.createLinearGradient(0, y, 0, y - hgt); g.addColorStop(0, rgba('#cfe6ff', 0.5 * kk * flashK())); g.addColorStop(1, rgba('#bcd8ff', 0)); c.fillStyle = g; c.fillRect(x - s.r * 0.45, y - hgt, s.r * 0.9, hgt); }); VFX.motes(x, y - 10, { n: 14, color: C.ice, r: s.r * 0.5, rise: 1.6 }); }
    else dustUp(x, y, 6, { size: 1.1, col: C.dustDk });
    for (const u of struck(ctx, tg, 4)) if (ok) VFX.hit(u.x, u.y, '#bcd8ff', 1.3);
    shakeNow(ok ? 3 : 5);
  };

  // a pounce: the hound and his rider come down: dust blown out in a ring, a ring of frost, her blade's crescent thrown across the middle; a wide fall (a still hero fallen on) is a great deal heavier
  function pounceLand(tg, msg, ctx, H) {
    const s = tg.live, x = s.x, y = s.y, R = s.r, heavy = clamp((R - 200) / 190, 0, 1), wide = R > 250, shade = tg.tag === 'mlShadePounce', b = ctx.bossDraw || { x, y }, ang = Math.atan2(y - b.y, x - b.x);
    H.shapeFlash(s, shade ? C.shade : C.ice, { a: 0.16 + 0.08 * heavy, dur: 0.5 });   // (cool, not white: the no-white-out rule)
    fxIn(0.7, (c, p, t, e) => { const q = easeOut(clamp(p / 0.35, 0, 1)), kk = e.a * (1 - p) * (1 - p); glow(c, x, y, R * (0.5 + 0.7 * q), '#02060f', 0.4 * kk); }, { layer: 'ground' });
    ringAt(x, y, { r: R * 1.2, w: 9 + 4 * heavy, dur: 0.6, color: shade ? C.shade : C.dust }); ringAt(x, y, { r: R * 0.78, w: 5, dur: 0.5, delay: 0.06, color: C.frost });
    if (wide) ringAt(x, y, { r: R * 1.6, w: 6, dur: 0.85, delay: 0.1, color: C.dust });
    // her cut as they land: one crescent of light thrown across the fall, along the way they came
    if (!shade) fxIn(0.5, (c, p, t, e) => { const q = easeOut(clamp(p / 0.3, 0, 1)), kk = e.a * (1 - clamp((p - 0.2) / 0.8, 0, 1)); c.save(); c.translate(x, y); c.rotate(ang); VFX.neonPath(c, C.ice, 11 * (1 - p * 0.5), kk, () => { c.arc(-R * 0.15, 0, R * 0.9, -0.9 * q, 0.9 * q); }); c.restore(); });
    const n = Math.round(10 + R / 14);
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), d = R * rand(0.05, 0.45); after(i * 0.004, () => dustUp(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 1, { angle: a, spread: 0.5, size: 1.2 + heavy, speed: 1.4 + heavy, a: 0.42 })); }
    VFX.hit(x, y, shade ? C.shade : C.ice, 2);
    weightLand({ pit: [x, y, R * 0.8], pts: [[x, y]], ring: [x, y, R * 1.4] }, 0.9 + 0.5 * heavy);
    hurt(ctx, tg, { size: 2 });
    mark(4.2, (c, a, age, seed) => { for (let i = 0; i < 9; i++) { const an = i * TAU / 9 + hash(i, seed) * 0.5, d = R * (0.4 + 0.45 * hash(i, seed + 1)); c.beginPath(); c.moveTo(x + Math.cos(an) * 20, y + Math.sin(an) * 20); c.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.9); c.strokeStyle = rgba(C.white, 0.4 * a); c.lineWidth = 1.2; c.stroke(); } c.beginPath(); c.ellipse(x, y, R * 0.34, R * 0.2, 0, 0, TAU); c.fillStyle = rgba(C.dustDk, 0.28 * a); c.fill(); }, x, y);
    shakeNow(wide ? 14 : 8); if (wide) camFx(0.1, 0.04, 0.5); else camFx(0.04, 0.02, 0.4);
  }
  IMP.mlPounce = pounceLand; IMP.mlShadePounce = pounceLand;

  // a piece of a ride landing as the rider passes it: a streak down the piece and the dust thrown off it, a puff at a corner (light: they come every fifth of a second)
  function pieceLand(tg, msg, ctx, H) {
    const s = tg.live, shade = tg.tag === 'mlShade', col = shade ? C.shade : C.dust;
    if (s.kind === 'rect') {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), x2 = s.x + ca * s.len, y2 = s.y + sa * s.len;
      slashLine(s.x, s.y, x2, y2, { w: 9, dur: 0.3, color: shade ? C.shade : C.ice });
      for (let d = 30; d < s.len; d += 90) dustUp(s.x + ca * d, s.y + sa * d, 1, { angle: s.angle + (Math.random() < 0.5 ? 1 : -1) * PI / 2, spread: 0.8, size: 0.8, speed: 0.9, a: 0.34, col });
    } else dustUp(s.x, s.y, 2, { size: 0.9, speed: 0.9, a: 0.36, col });
    hurt(ctx, tg, { size: 1.5, col: shade ? C.shade : C.ice });
    shakeNow(2);
  }
  IMP.mlRun = pieceLand; IMP.mlRide = pieceLand; IMP.mlShade = pieceLand;

  // the raidwides. An act's opener: a soft ring of light going out from her; Full Moon: the whole floor lit in a breath: rings out to the rim, the dust standing up off it in a wave, her light on the crown's reading; the last cut of a dance
  // (the full moon it climbs to) is the biggest thing she does: seven rings, the dust thrown in waves, the camera held
  IMP.mlOpen = (tg, msg, ctx, H) => {
    const b = ctx.bossDraw || { x: 0, y: -60 };
    for (let i = 0; i < 2; i++) ringAt(b.x, b.y + 40, { r: ARENA.R * (1.35 - i * 0.3), w: 8 - 2 * i, dur: 0.9 + i * 0.1, delay: i * 0.1, color: i ? C.white : C.pane });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: ARENA.R - 40 }, 8)) after(Math.random() * 0.3, () => dustUp(q.x, q.y, 1, { size: 1, speed: 0.7, a: 0.3 }));
    shakeNow(4);
  };
  function peakNow(tg) { const land = tg.start + tg.dur; for (const c of S.cuts) if (c.kd === 'dance' && c.n === c.of && Math.abs(c.land - land) < 0.7) return true; return nowS() - S.peak < 0.4; }
  IMP.mlFull = (tg, msg, ctx, H) => {
    const b = ctx.bossDraw || { x: 0, y: -60 }, fin = peakNow(tg), R = ARENA.R;
    // the wall's release (New Moon: walls/maelis.js has the light front and the glints): this lane adds one soft ring and nothing else, so it reads as one breath out
    const N = ArenaView.liveRoom && ArenaView.liveRoom.ev && ArenaView.liveRoom.ev.mlnight, calm = !!(N && !N.on && S.lastT - N.start < 1.8 && S.lastT >= N.start - 0.2), n = calm ? 1 : fin ? 7 : 3;
    for (let i = 0; i < n; i++) ringAt(b.x, b.y + 40, { r: R * (1.5 - i * 0.12), w: (fin ? 13 : 9) - i * 1.2, dur: 0.8 + i * 0.12, delay: i * (fin ? 0.07 : 0.1), color: i % 2 ? C.white : C.pane });
    // the floor lit: a swell of light centred on her, strong at her feet and gone by the rim (never the screen)
    fxIn(fin ? 1.1 : 0.7, (c, p, t, e) => { const kk = e.a * (1 - p) * (1 - p) * flashK(), q = easeOut(clamp(p / 0.4, 0, 1)); glow(c, b.x, b.y + 40, R * (0.5 + 0.9 * q), C.ice, (fin ? 0.2 : calm ? 0.05 : 0.12) * kk); glow(c, b.x, b.y + 40, R * 0.4 * q, C.ice, (fin ? 0.16 : calm ? 0.03 : 0.1) * kk); }, { layer: 'ground' });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: R - 40 }, fin ? 26 : calm ? 5 : 12)) after(Math.hypot(q.x - b.x, q.y - b.y) / (R * 3), () => dustUp(q.x, q.y, 1, { size: 1.1, speed: 0.8, a: 0.34 }));
    if (fin) {
      // the cut to remember: blades of light on the crown's own axes thrown out from her to the rim, the crown's glow on her
      fxIn(0.8, (c, p, t, e) => { const kk = e.a * (1 - p) * (1 - p), q = easeOut(clamp(p / 0.6, 0, 1)); for (let i = 0; i < 24; i++) { const an = i * TAU / 24 + 0.1 + 0.05 * hash(i, 2), d0 = 90 + q * 340 * (0.7 + 0.3 * hash(i, 3)), d1 = d0 + 40 + 90 * hash(i, 4); VFX.neonPath(c, C.ice, 3.4 * (1 - p), kk, () => { c.moveTo(b.x + Math.cos(an) * d0, b.y + 40 + Math.sin(an) * d0 * 0.8); c.lineTo(b.x + Math.cos(an) * d1, b.y + 40 + Math.sin(an) * d1 * 0.8); }); } });
      VFX.flash(b.x, b.y - 90, 150, C.ice, 0.22);
      shakeNow(16); camFx(0.14, 0.05, 0.7);
    } else { shakeNow(8); camFx(0.04, 0.02, 0.4); }
    mark(fin ? 5 : 3, (c, a) => { c.beginPath(); c.arc(0, 0, R - 14, 0, TAU); c.strokeStyle = rgba(C.white, 0.35 * a); c.lineWidth = 2; c.stroke(); }, 0, 0);
  };

  // ---------------------------------------------------------------- the room's own beats (roomev) and a frame of floor
  function roomEvent(room, msg, now) {
    const k = msg.k;
    if (k === 'mlcut') { S.cuts.push({ ph: msg.ph, kd: msg.kd, n: msg.n || 1, of: msg.of || 1, land: now + (msg.at || 0) }); while (S.cuts.length > 14) S.cuts.shift(); }
    else if (k === 'mlpeak') S.peak = nowS();
    // Earthshine's first hit has a chop of its own: the cast bar runs to the second hit, so the cast's own swing is the second one's (main.js); this one is handed to the view's swing list
    else if (k === 'mlearth' && typeof ML_VIEW !== 'undefined' && ML_VIEW.S && ML_VIEW.S.swings) { const sw = ML_VIEW.S.swings; sw.push({ t0: now + (msg.at || 0) - 0.45, dur: 1.2 }); sw.sort((a, b) => a.t0 - b.t0); }
  }
  function under(ctx, room, t, v) {
    if (!ArenaView.amb || ArenaView.amb.kind !== 'moon') return;
    if (room !== S.room || t < S.lastT - 1) { S.room = room; WT.length = 0; S.marks.length = 0; S.cuts.length = 0; S.pos.clear(); }
    S.lastT = t;
    for (const u of (v && v.units) || []) S.pos.set(u.id, u);
    drawMarks(ctx, t);
    drawWeight(ctx);
  }

  // ---------------------------------------------------------------- the body: what gathers on her for each pose (boss-vfx.js castStart)
  // H: { drawIn, emit, beat, soon, own } from boss-vfx.js. She is upright, about 260 px tall at b.x, b.y (the art's origin is a little below her middle); her blade is in her hands
  function cast(sh, b, dur, anim, name, H) {
    const own = e => H.own(sh, e), bx = () => b.x, by = () => b.y, SC = 1.3;
    const hand = () => ({ x: b.x + 10 * SC, y: b.y - 76 * SC });
    const crown = () => ({ x: b.x, y: b.y - 178 * SC });
    const pulse = (t, f = 40) => 0.85 + 0.15 * Math.sin(t * f);
    if (anim === 'cut') {
      // the blade drawn back: a line of silver light gathers up it, glints walking to its tip, the crown's light leaning in
      own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
        const kk = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.95) / 0.05, 0, 1)), h = hand(), L = (70 + 130 * easeOut(p)) * 1.0;
        blade(c, h.x - 10, h.y - 20, h.x - 18 - L * 0.35, h.y - 32 - L, (0.3 + 0.6 * p) * kk, 2.4); glint(c, h.x - 18 - L * 0.35, h.y - 32 - L, 12 + 22 * p, (0.4 + 0.5 * p) * kk * pulse(t), 0.3);
      } }));
      H.drawIn(sh, dur, () => crown(), { color: C.ice, color2: C.white, r: 90, z: 0, rate: 0.5, glow: false });
    } else if (anim === 'buster') {
      // the blade held high in both hands: a lance of earthlight climbs from it
      own(VFX.fx({ dur: dur + 0.2, layer: 'air', draw: (c, p, t, e) => {
        const kk = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.95) / 0.05, 0, 1)), h = 50 + 220 * easeOut(clamp(p / 0.85, 0, 1)), x = bx() - 40, base = by() - 150 * SC, w = 5 + 9 * p;
        const g = c.createLinearGradient(x, base, x, base - h); g.addColorStop(0, rgba(C.white, 0.5 * kk)); g.addColorStop(1, rgba(C.frost, 0)); c.fillStyle = g; c.fillRect(x - w, base - h, w * 2, h);
        blade(c, x, base, x, base - h, (0.45 + 0.5 * p) * kk, 2.4);
        for (let i = 0; i < 4; i++) { const y = base - ((t * (150 + 160 * p) + i * h / 4) % h), f2 = 1 - (base - y) / h; c.beginPath(); c.moveTo(x - 11, y + 11); c.lineTo(x, y); c.lineTo(x + 11, y + 11); c.strokeStyle = rgba(C.ice, 0.6 * f2 * kk); c.lineWidth = 1.8; c.stroke(); }
        glint(c, x, base - h, 22 + 26 * p, (0.3 + 0.6 * p) * kk, 0);
      } }));
    } else if (anim === 'full') {
      // both arms thrown up: light drawn up into her crown from the floor round her, rings at her feet widening
      H.drawIn(sh, dur, () => crown(), { color: C.white, color2: C.ice, r: 120, z: 0, rate: 0.7, glow: false });
      own(VFX.fx({ dur: dur + 0.2, layer: 'ground', draw: (c, p, t, e) => {
        const kk = e.a * Math.min(1, p / 0.2) * (1 - clamp((p - 0.95) / 0.05, 0, 1));
        for (let i = 0; i < 3; i++) { const q = (p * 1.2 + i / 3) % 1; c.beginPath(); c.ellipse(bx(), by() + 56, 40 + q * 200, (40 + q * 200) * 0.3, 0, 0, TAU); c.strokeStyle = rgba(C.pane, (1 - q) * (0.14 + 0.36 * p) * kk * flashK()); c.lineWidth = 2; c.stroke(); }
      } }));
    } else if (anim === 'call') {
      // the off hand raised open: light gathering in the palm, a few motes lifting off the dust before her
      const hp = () => ({ x: b.x + 38 * SC, y: b.y - 146 * SC });
      H.drawIn(sh, dur, hp, { color: C.ice, color2: C.white, r: 70, z: 0, rate: 0.5 });
    } else if (anim === 'dance') {
      // the dance: she is quick: rings of light stepping off her, harder as it climbs
      H.beat(sh, dur, 0.6, (p) => { VFX.shock(bx(), by() + 50, { r: 130 + 90 * p, color: C.ice, w: 3, dur: 0.4, flat: 0.8 }); VFX.sparks(bx(), by() - 40, { color: C.white, n: 5, speed: 260 }); });
      H.drawIn(sh, dur, () => ({ x: bx(), y: by() - 70 }), { color: C.white, color2: C.ice, r: 100, z: 10, rate: 0.5 });
    } else if (anim === 'ride') {
      H.emit(sh, dur, 0.5, () => dustUp(bx() + rand(-70, 70), by() + 56, 1, { size: 0.8, speed: 0.6, a: 0.3 }));
      H.drawIn(sh, dur, () => ({ x: bx(), y: by() - 60 }), { color: C.ice, r: 90, z: 0, rate: 0.35, glow: false });
    } else if (anim === 'dash') {
      // low and quick: streaks of silver stepping off her
      H.beat(sh, dur, 0.5, () => { VFX.shock(bx(), by() + 50, { r: 90, color: C.ice, w: 2.4, dur: 0.3, flat: 0.8 }); });
    }
  }

  return {
    tell: tag => TELLS[tag] || null,
    buster: busterTell,
    cast, under, roomEvent,
    // (boss-vfx.js impact(): her moves land here; a tag it does not know falls through to the shared ones)
    impact(tg, msg, ctx, H) {
      const f = tg.type === 'buster' ? earthLand : IMP[tg.tag]; if (!f) return false;
      ctx = Object.assign({}, ctx, { hitIds: Array.isArray(msg && msg.hits) && msg.hits.length ? new Set(msg.hits) : null });
      f(tg, msg || {}, ctx, H); return true;
    },
    S,
  };
})();

// the room hooks: ArenaView's drawRoomUnder (the scars the landings leave, under the units) and roomEvent (which cut of a dance a telegraph is), wrapped from here the way vesper-fx.js does
if (typeof ArenaView !== 'undefined') {
  const baseUnder = ArenaView.drawRoomUnder, baseEvent = ArenaView.roomEvent;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    baseUnder.call(this, ctx, room, t, v);
    if (!room || !room.ev) return;
    try { ML_FX.under(ctx, room, t, v); } catch (e) { try { ctx.restore(); } catch (e2) { /* cosmetic */ } }
  };
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = baseEvent.call(this, room, msg, now, ...rest);
    try { if (msg && typeof msg.k === 'string' && msg.k.indexOf('ml') === 0) ML_FX.roomEvent(room, msg, now); } catch (e) { /* cosmetic */ }
    return r;
  };
}
