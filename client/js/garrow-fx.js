// Garrow, the Moon's Hound: how every move of his looks on the floor and when it lands. His body, his lesser hounds and the ridge of ice are
// in garrow-art.js and the Long Mere itself (floor, far shore, snowfall, the flurry's veil) is garrow-room.js; this file is the moves and the
// heart of the fight, the footprints. Loaded after boss-tells / arena-view; the other files reach it through GW_FX (every call is guarded
// by `typeof GW_FX !== 'undefined'`).
//
// THE FOOTPRINTS. The host sends none: every client keeps each hero's recent positions itself (drawRoomUnder, wrapped from here) and lays
// boot prints on the snow from them: about 8 s of steps, fading; wiped on `gwwipe`; about 14 s, hardly fading, from `gwlast`. Every hero's
// prints are faint; a scented hero's (head mark `gwprey` / `gwprey2`, read from the hmark messages) last six seconds are lit, cold silver
// with a blue glow; a hero carrying `gwblood` leaves red ones. Nothing here is ever louder than a quiet texture.
// THE LIT TRAIL (`gwpath:<n>`, one per laid run, sent at the lock): the red corridor (tell tags gwRun / gwBack / gwShade / gwStill) is drawn
// here as ONE shape from the event's line, exactly the union of the host's rect and corner pieces (a stroke of the polyline, butt ends,
// round corners, one pass of wash, one rim), and it shrinks from behind as each piece lands; the walked prints inside it light from the
// oldest step to the newest; he runs it (a ribbon of mist and thrown snow behind him); the ploughed furrow he leaves fades after.
// Colour language as everywhere: red is damage and nothing else is red but a hero's own blood prints, blue would be a soak (he has none),
// safe ground is never painted. Palette: silver, black water, frost blue. Never anything warm.
// Room moments: gwdrift (a white-out front crossing the lake), gwwipe (a soft white sweep and every print gone), gwfrost (frost creeping
// in from the edges), gwlast (one slow clear ring); gwring (his own paw prints round the ring ahead of him). propfx: gwmist, gwcancel.

const GW_FX = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeIn = q => q * q;
  const easeIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q));
  const C = {
    snow: '#f4faff', silver: '#dbe8f5', ice: '#bfe0ff', frost: '#9fd0ff', frostDk: '#4a78b8', deep: '#2a4a7a', ink: '#0b1626', black: '#05101e',
    mist: '#cfe3f4', mistDk: '#6f8db0', moon: '#f4f9ff', blood: '#b3232d', bloodHi: '#ff6a70', shade: '#cfc6f4', shadeDk: '#7a6cb8', bone: '#cfdae7',
  };
  const AR = () => ARENA.R;
  const danger = () => (typeof BossTells !== 'undefined' && BossTells.COL ? BossTells.COL.danger : '#ff3b2f');
  const flashK = () => (typeof FX !== 'undefined' && FX.flashK != null ? FX.flashK : 1);
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const WIND = Math.atan2(0.34, 0.94), WC = Math.cos(WIND), WS = Math.sin(WIND);   // (the flurry's way across the lake: garrow-room.js)
  const S = {
    room: null, lastT: -1, active: false, camAt: -99, paths: [], heroes: new Map(), pos: new Map(), marks: new Map(), pend: [], wipe: null, wipeSeen: -1,
    ridges: new Map(), net: false, fired: new Set(), cold: null, coldPend: null, sp: {}, unitsAt: -1, wt: [],
  };
  const evs = () => (typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.ev) || {};
  function cam(stop = 0.1, punch = 0.035, dur = 0.5, gap = 3) {
    const t = nowS(); if (t - S.camAt < gap) return; S.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.stop(stop); FX.cam.punch(punch, dur); } } catch (e) { /* cosmetic */ }
  }
  const shakeNow = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); } catch (e) { /* cosmetic */ } };
  const isMe = u => typeof Net !== 'undefined' && Net && u.id === Net.id;
  function flinch(col, a = 0.1, dur = 0.18, punch = 0.018) {
    try { if (typeof FX !== 'undefined' && FX.cam) { FX.cam.flash(col, a, dur); FX.cam.punch(punch, 0.32); } } catch (e) { /* cosmetic */ }
  }
  const inside = (ctx, s, pad = 0) => (ctx.units || []).filter(u => SHAPES.contains(s, u.x, u.y, pad));

  // ---------------------------------------------------------------- small painted pieces
  // a jagged path (added to the current one) from (x1, y1) to (x2, y2)
  function zigPath(ctx, x1, y1, x2, y2, seed, jag = 8, seg = 26) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / seg)), nx = -dy / L, ny = dx / L;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n, o = (hash(i, seed) - 0.5) * 2 * jag; ctx.lineTo(x1 + dx * u + nx * o, y1 + dy * u + ny * o); }
    ctx.lineTo(x2, y2);
  }
  // a crack in the ice under the snow: a dark edge and a pale body
  function crackLine(ctx, x1, y1, x2, y2, seed, k, o = {}) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); zigPath(ctx, x1, y1, x2, y2, seed, o.jag ?? 7, o.seg ?? 22);
    ctx.strokeStyle = rgba(o.ink || C.deep, 0.5 * k); ctx.lineWidth = (o.w || 2) + 2.4; ctx.stroke();
    ctx.strokeStyle = rgba(o.col || C.snow, k); ctx.lineWidth = o.w || 2; ctx.stroke();
    ctx.restore();
  }
  function crackStar(ctx, x, y, r, n, seed, k, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + hash(i, seed) * 0.6, d = r * (0.55 + 0.45 * hash(i, seed + 1));
      crackLine(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * d, y + Math.sin(a) * d * (o.flat ?? 0.8), seed + i, k, { w: o.w || 1.6, jag: o.jag ?? 6, seg: 18, col: o.col });
    }
  }
  // a frost fern: a stem with side branches, added to the current path
  function fernPath(c, x, y, ang, len) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    c.moveTo(x, y); c.lineTo(ex, ey);
    for (let i = 1; i <= 5; i++) {
      const u = i / 6, bx = x + (ex - x) * u, by = y + (ey - y) * u, bl = len * 0.24 * (1 - u * 0.6);
      for (let s = -1; s <= 1; s += 2) { const a2 = ang + s * 0.85; c.moveTo(bx, by); c.lineTo(bx + Math.cos(a2) * bl, by + Math.sin(a2) * bl); }
    }
  }
  // a six-armed snowflake, added to the current path
  function flakePath(c, x, y, r, rot) {
    for (let i = 0; i < 6; i++) {
      const a = rot + i * TAU / 6, ca = Math.cos(a), sa = Math.sin(a);
      c.moveTo(x, y); c.lineTo(x + ca * r, y + sa * r);
      for (const u of [0.45, 0.72]) for (let s = -1; s <= 1; s += 2) { const a2 = a + s * 0.7; c.moveTo(x + ca * r * u, y + sa * r * u); c.lineTo(x + ca * r * u + Math.cos(a2) * r * 0.26, y + sa * r * u + Math.sin(a2) * r * 0.26); }
    }
  }
  // snow thrown up off a point: puffs and a few bright flecks
  function snowUp(x, y, n, o = {}) {
    VFX.smoke(x, y, { n: Math.max(1, Math.round(n / 3)), color: '#e9f2fc', size: 34 * (o.size || 1), a: 0.6, speed: 130 * (o.speed || 1), r: o.r });
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || 1.2) : rand(0, TAU), sp = rand(60, 200) * (o.speed || 1);
      VFX.spawn({ x, y, z: rand(4, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(90, 260) * (o.up || 1), g: 520, drag: 0.03, life: rand(0.6, 1.1), size: rand(5, 10) * (o.size || 1), size1: 1, color: i % 3 ? '#f4faff' : '#cfe3f4', kind: i % 2 ? 'glow' : 'smoke', add: false, a: 0.85 });
    }
  }
  // thin shards of ice thrown up
  function iceUp(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(80, 240) * (o.speed || 1);
      VFX.spawn({ x, y, z: rand(6, 24), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(120, 300), g: 560, drag: 0.02, life: rand(0.5, 0.9), size: rand(5, 9) * (o.size || 1), size1: 1, color: i % 2 ? C.ice : C.snow, kind: 'shard', add: false, vr: rand(-10, 10) });
    }
  }
  function blit(c, cv, x, y, ang, a, sc = 1) {
    if (!cv || a <= 0.01) return;
    c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(ang); if (sc !== 1) c.scale(sc, sc); c.drawImage(cv, -cv.width / 2 / PS, -cv.height / 2 / PS, cv.width / PS, cv.height / PS); c.restore();
  }

  // ---------------------------------------------------------------- the prints (sprites, drawn once)
  const PS = 3;   // sprite pixels to a world unit
  const SPR = {};
  const mk = (w, h, draw) => { if (typeof document === 'undefined') return null; const cv = document.createElement('canvas'); cv.width = w * PS; cv.height = h * PS; draw(cv.getContext('2d'), cv.width / 2, cv.height / 2); return cv; };
  // a boot's print, toe to +x: a pad and a heel with the waist left out
  function bootPath(c, cx, cy) {
    c.beginPath(); c.ellipse(cx + 3.6 * PS, cy, 5.4 * PS, 3.7 * PS, 0, 0, TAU);
    c.moveTo(cx - 5.2 * PS + 3.4 * PS, cy); c.ellipse(cx - 5.2 * PS, cy, 3.4 * PS, 2.8 * PS, 0, 0, TAU);
  }
  function pawPath(c, cx, cy) {
    c.beginPath(); c.ellipse(cx - 4 * PS, cy, 8.2 * PS, 8.8 * PS, 0, 0, TAU);
    for (const [x, y, r] of [[8, -9.6, 3.9], [13.8, -3.5, 3.7], [13.8, 3.5, 3.7], [8, 9.6, 3.9]]) { c.moveTo(cx + x * PS + r * PS, cy + y * PS); c.ellipse(cx + x * PS, cy + y * PS, r * PS, r * PS * 0.9, 0, 0, TAU); }
  }
  function sprite(name) {
    if (SPR[name] !== undefined) return SPR[name];
    const big = name === 'paw' || name === 'pawLit';
    SPR[name] = mk(big ? 34 : 24, big ? 30 : 14, (c, cx, cy) => {
      const path = big ? pawPath : bootPath;
      if (name === 'dent') {
        c.save(); c.translate(0.9 * PS, 1.1 * PS); path(c, cx, cy); c.fillStyle = 'rgba(250,253,255,0.8)'; c.fill(); c.restore();   // the lip of the dent, lit
        path(c, cx, cy); c.fillStyle = 'rgba(44,64,110,0.92)'; c.fill();
        c.save(); c.translate(cx, cy); c.scale(0.7, 0.7); c.translate(-cx - 0.5 * PS, -cy - 0.6 * PS); path(c, cx, cy); c.fillStyle = 'rgba(22,36,74,0.55)'; c.fill(); c.restore();
      } else if (name === 'blood') {
        c.save(); c.translate(0.9 * PS, 1.1 * PS); path(c, cx, cy); c.fillStyle = 'rgba(255,150,152,0.6)'; c.fill(); c.restore();
        path(c, cx, cy); c.fillStyle = 'rgba(138,20,32,0.95)'; c.fill();
        c.save(); c.translate(-0.4 * PS, -0.5 * PS); path(c, cx, cy); c.strokeStyle = 'rgba(70,6,14,0.7)'; c.lineWidth = 0.9 * PS; c.stroke(); c.restore();
      } else if (name === 'lit' || name === 'litShade') {
        const sh = name === 'litShade';
        c.save(); c.shadowColor = sh ? 'rgba(190,170,255,0.95)' : 'rgba(150,210,255,0.95)'; c.shadowBlur = 2.4 * PS;
        path(c, cx, cy); c.fillStyle = sh ? '#f1edff' : '#f6fbff'; c.fill(); c.restore();
        path(c, cx, cy); c.lineWidth = 1.0 * PS; c.strokeStyle = sh ? 'rgba(96,80,170,0.85)' : 'rgba(64,108,176,0.85)'; c.stroke();
        c.save(); c.translate(cx, cy); c.scale(0.7, 0.7); c.translate(-cx + 0.5 * PS, -cy + 0.6 * PS); path(c, cx, cy); c.fillStyle = 'rgba(255,255,255,0.95)'; c.fill(); c.restore();
      } else if (name === 'paw') {
        c.save(); c.shadowColor = 'rgba(160,215,255,0.9)'; c.shadowBlur = 2.6 * PS;
        path(c, cx, cy); c.fillStyle = 'rgba(232,244,255,0.95)'; c.fill(); c.restore();
        path(c, cx, cy); c.lineWidth = 1.1 * PS; c.strokeStyle = 'rgba(62,104,172,0.9)'; c.stroke();
        c.save(); c.translate(0.6 * PS, 0.8 * PS); path(c, cx, cy); c.fillStyle = 'rgba(30,52,96,0.35)'; c.fill(); c.restore();
      }
    });
    return SPR[name];
  }

  // ---------------------------------------------------------------- every hero's steps, kept here
  const CAP = 160, STRIDE = 30, F = 8;   // a print per 30 px of walking, 160 to a hero, each: x y angle t red side litAt litEnd
  const newTrail = () => ({ buf: new Float32Array(CAP * F), n: 0, head: 0, lx: 0, ly: 0, has: false, side: 1 });
  function addPrint(h, x, y, ang, t, red) {
    const o = h.head * F, b = h.buf;
    b[o] = x - Math.sin(ang) * h.side * 5.4; b[o + 1] = y + Math.cos(ang) * h.side * 5.4; b[o + 2] = ang; b[o + 3] = t; b[o + 4] = red ? 1 : 0; b[o + 5] = h.side;
    h.head = (h.head + 1) % CAP; if (h.n < CAP) h.n++; h.side = -h.side;
  }
  function trackUnits(units, t) {
    for (const u of units || []) {
      S.pos.set(u.id, u);
      let h = S.heroes.get(u.id); if (!h) S.heroes.set(u.id, h = newTrail());
      if (!h.has) { h.lx = u.x; h.ly = u.y; h.has = true; continue; }
      const dx = u.x - h.lx, dy = u.y - h.ly, d = Math.hypot(dx, dy);
      if (d > 320) { h.lx = u.x; h.ly = u.y; continue; }   // (thrown across the lake: no steps in between)
      if (d < STRIDE) continue;
      const ang = Math.atan2(dy, dx), m = S.marks.get(u.id), red = !!(m && m.blood > t), steps = Math.min(8, Math.floor(d / STRIDE));
      for (let i = 1; i <= steps; i++) addPrint(h, h.lx + dx * (i * STRIDE) / d, h.ly + dy * (i * STRIDE) / d, ang, t - (steps - i) * 0.04, red);
      h.lx += dx * (steps * STRIDE) / d; h.ly += dy * (steps * STRIDE) / d;
    }
  }
  const slot = (h, k) => ((h.head - h.n + k) % CAP + CAP) % CAP * F;

  // marks (garrow.js: gwprey / gwprey2 while a hero is the scent, gwblood on Extreme): read from the hmark messages, applied on the next frame
  function flushMarks(t) {
    while (S.pend.length) {
      const m = S.pend.shift();
      if (m.t === 'hmarkx') {
        if (m.clear) { for (const v of S.marks.values()) { if (!m.key || m.key === 'gwprey') v.prey = 0; if (!m.key || m.key === 'gwprey2') v.prey2 = 0; if (!m.key || m.key === 'gwblood') v.blood = 0; } continue; }
        const v = S.marks.get(m.pid); if (!v) continue;
        if (m.key === 'gwprey') v.prey = 0; else if (m.key === 'gwprey2') v.prey2 = 0; else if (m.key === 'gwblood') v.blood = 0;
        continue;
      }
      if (m.key !== 'gwprey' && m.key !== 'gwprey2' && m.key !== 'gwblood') continue;
      let v = S.marks.get(m.pid); if (!v) S.marks.set(m.pid, v = { prey: 0, prey2: 0, blood: 0 });
      const end = m.dur ? t + m.dur : t + 60;
      if (m.key === 'gwprey') v.prey = end; else if (m.key === 'gwprey2') v.prey2 = end; else v.blood = end;
    }
  }

  // the net: the hmark / hmarkx messages (marks), banim (his run and pounce poses) and addev bite are read from here, lazily, once main.js has registered
  function hookNet() {
    if (S.net || typeof Net === 'undefined' || !Net || !Net.handlers) return;
    const H = Net.handlers; if (!H.hmark || !H.hmarkx) return;
    S.net = true;
    const wrap = (type, fn) => { const base = H[type]; if (!base) return; H[type] = function (msg) { const r = base.apply(this, arguments); try { fn(msg); } catch (e) { /* cosmetic */ } return r; }; };
    wrap('hmark', m => { if (S.active) S.pend.push(m); });
    wrap('hmarkx', m => { if (S.active) S.pend.push(m); });
    // (the run and the pounce hold a pose on him: main.js has no case for them, so they are held here for garrow-art.js)
    wrap('banim', m => {
      if (!S.active || (m.name !== 'run' && m.name !== 'pounce') || typeof window === 'undefined' || !window.__game) return;
      const raid = window.__game.raid, now = window.__game.now; if (!raid || !raid.props) return;
      const k = m.name === 'run' ? 'gaRun' : 'gaPounce'; raid.props[k] = true; raid.propsUntil[k] = now + (m.dur || 0.7) + 0.1;
      if (m.name === 'pounce') raid.props.gaDur = m.dur || 0.7;   // (garrow-art.js lands the pounce on the banim's own length)
    });
    wrap('addev', m => {
      if (!S.active || m.k !== 'bite') return;
      const u = S.pos.get(m.tg); if (!u) return;
      VFX.motes(u.x, u.y - 10, { n: 6, color: C.ice, r: 24, rise: 1.2 }); VFX.sparks(u.x, u.y - 8, { color: C.snow, n: 6, speed: 200 }); VFX.hit(u.x, u.y - 8, C.ice, 1);
    });
  }

  // ---------------------------------------------------------------- one frame of the room under the units (ArenaView.drawRoomUnder, wrapped at the bottom)
  function under(ctx, room, t, v) {
    if (!ArenaView.amb || ArenaView.amb.kind !== 'mere') { S.active = false; return; }
    S.active = true;
    if (room !== S.room || t < S.lastT - 1) {   // a new pull
      S.room = room; S.paths.length = 0; S.heroes.clear(); S.pos.clear(); S.marks.clear(); S.pend.length = 0; S.wipe = null; S.wipeSeen = -1; S.wt.length = 0; S.ridges.clear(); S.fired.clear(); S.cold = null; S.coldPend = null;
      for (const k in room.ev) if (k.startsWith('gwpath:')) S.paths.push(room.ev[k]);
    }
    S.lastT = t;
    hookNet(); flushMarks(t);
    if (S.coldPend) { S.cold = { start: t, dur: S.coldPend.dur }; S.coldPend = null; }
    const ev = room.ev;
    if (ev.gwwipe && ev.gwwipe.start !== S.wipeSeen) { S.wipeSeen = ev.gwwipe.start; S.wipe = { start: ev.gwwipe.start, dur: 1 }; }
    trackUnits(v && v.units, t);
    ctx.save(); ARENA.trace(ctx, 0); ctx.clip();
    if (ev.gwfrost && t < ev.gwfrost.end + 2) frostEdge(ctx, ev.gwfrost, t);
    if (S.wt.length) drawWeight(ctx, t);
    drawPrints(ctx, t, ev);
    if (S.cold) coldTrails(ctx, t);
    if (ev.gwdrift && t < ev.gwdrift.end + 0.5) driftFront(ctx, ev.gwdrift, t);
    if (S.wipe && t < S.wipe.start + S.wipe.dur + 0.4) wipeVeil(ctx, S.wipe, t);
    if (ev.gwlast && t < ev.gwlast.start + 3.4) clearRing(ctx, ev.gwlast, t, v);
    ctx.restore();
  }

  // ---------------------------------------------------------------- weight: what a heavy landing does to the lake, and how the lake puts itself back
  // A furrow is torn through the snow (a dark trough, the snow it threw aside lying along both lips) and a crack runs out under the snow from the blow, the ice groaning in it;
  // dust of snow hangs a moment low over the floor, and the reeds at the edge shiver. Then it recovers: the snow slumps back and fills the furrow from the lips, the crack
  // frosts over (a white rime grows along it while its dark goes out) and fades, the reeds come to rest. Under the prints and every warning (under()), faint, gone in about
  // four seconds so the floor is clean before the next move; no shake, flash or sound is added here. mag: 0.5 a ring .. 1 Throat Snap.
  const lite = () => typeof FX !== 'undefined' && FX.quality && FX.quality !== 'full';
  function crackPts(x, y, ang, len, seed) {
    const pts = [x, y]; let a = ang, px = x, py = y;
    for (let i = 0; i < 6; i++) { a += (hash(i, seed) - 0.5) * 0.9; px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6; pts.push(px, py); }
    return pts;
  }
  function weightLand(o, mag) {
    if (S.wt.length > 8) return;
    const t0 = S.lastT, seed = (Math.abs((o.x || 0) * 7 + (o.y || 0) * 3) | 0) & 255, w = { t0, dur: Math.min(4.8, 3.6 + 1.0 * mag), mag, line: o.line || null, pit: o.pit || null, ring: o.ring || null, cracks: [] };
    for (const c of o.cracks || []) w.cracks.push(crackPts(c.x, c.y, c.ang, c.len, seed + w.cracks.length * 7));
    S.wt.push(w);
    const n = Math.round((lite() ? 5 : 14) * mag) + 4, src = o.line || (o.pit ? [o.pit[0], o.pit[1], o.pit[0], o.pit[1]] : [o.x, o.y, o.x, o.y]);
    for (let i = 0; i < n; i++) {   // snow dust: lifted, it hangs low and settles
      const q = Math.random(), x = src[0] + (src[2] - src[0]) * q, y = src[1] + (src[3] - src[1]) * q, a = rand(0, TAU), sp = rand(14, 46) * (0.6 + mag);
      VFX.spawn({ x, y, z: rand(2, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(24, 60) * (0.6 + mag), g: 80, drag: 0.05, life: rand(1.5, 2.3), size: rand(18, 32), size1: 44, color: '#e8f1fb', kind: 'smoke', add: false, ground: true, a: 0.4 });
    }
    try { if (typeof GW_ROOM !== 'undefined' && GW_ROOM.jolt) GW_ROOM.jolt(t0 + 0.3, 0.6 + 0.6 * mag); } catch (e) { /* cosmetic */ }
  }
  function drawWeight(c, t) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = S.wt.length - 1; i >= 0; i--) {
      const w = S.wt[i], age = t - w.t0;
      if (age > w.dur || age < -1) { if (age > w.dur) S.wt.splice(i, 1); continue; }
      if (age < 0) continue;
      const fill = clamp((age - 0.5) / (w.dur * 0.8), 0, 1), dent = Math.pow(1 - fill, 1.4), open = Math.min(1, age / 0.08), m = w.mag;
      if (w.line && dent > 0.01) {   // the furrow: the trough narrows from its lips as the snow slumps back; the thrown snow lies along both edges and goes in with it
        const [x1, y1, x2, y2] = w.line, L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L, fw = (28 + 24 * m) * dent * open, off = fw * 0.5 + 2 + 5 * dent;
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = 'rgba(40,64,112,' + (0.5 * dent) + ')'; c.lineWidth = fw; c.stroke();
        c.strokeStyle = 'rgba(244,250,255,' + (0.8 * dent) + ')'; c.lineWidth = 4 * dent + 0.8;
        c.beginPath(); c.moveTo(x1 + nx * off, y1 + ny * off); c.lineTo(x2 + nx * off, y2 + ny * off); c.moveTo(x1 - nx * off, y1 - ny * off); c.lineTo(x2 - nx * off, y2 - ny * off); c.stroke();
      }
      if (w.pit && dent > 0.01) {   // a crater's dent: a dark bowl in the snow that fills from its rim, the heaped rim slumping in
        const [px, py, pr] = w.pit, r = pr * (0.55 + 0.45 * dent) * open;
        c.beginPath(); c.arc(px, py, r, 0, TAU); c.fillStyle = 'rgba(40,64,112,' + (0.34 * dent) + ')'; c.fill();
        c.beginPath(); c.arc(px, py, r, 0, TAU); c.strokeStyle = 'rgba(244,250,255,' + (0.7 * dent) + ')'; c.lineWidth = 4.5 * dent + 0.8; c.stroke();
      }
      if (w.ring && dent > 0.01) {   // a ring of the track that burst: a narrow trough that closes
        const [rx, ry, rr] = w.ring;
        c.beginPath(); c.arc(rx, ry, rr, 0, TAU); c.strokeStyle = 'rgba(40,64,112,' + (0.45 * dent) + ')'; c.lineWidth = (18 + 10 * m) * dent; c.stroke();
        c.beginPath(); c.arc(rx, ry, rr + 8 * dent + 4, 0, TAU); c.arc(rx, ry, Math.max(1, rr - 8 * dent - 4), 0, TAU, true); c.strokeStyle = 'rgba(244,250,255,' + (0.65 * dent) + ')'; c.lineWidth = 2.6; c.stroke();
      }
      // the crack: it runs out quickly under the snow, dark with a pale edge; then frost grows over it and it goes
      const run = easeOut(clamp(age / 0.28, 0, 1)), frost = clamp((age - 0.9) / 1.6, 0, 1), end = 1 - clamp((age - w.dur * 0.62) / (w.dur * 0.38), 0, 1);
      if (end > 0.01) for (const pts of w.cracks) {
        const n = pts.length / 2 - 1, lim = run * n;
        c.beginPath(); c.moveTo(pts[0], pts[1]);
        for (let k = 1; k <= n; k++) { const f = Math.min(1, lim - (k - 1)); if (f <= 0) break; c.lineTo(pts[(k - 1) * 2] + (pts[k * 2] - pts[(k - 1) * 2]) * f, pts[(k - 1) * 2 + 1] + (pts[k * 2 + 1] - pts[(k - 1) * 2 + 1]) * f); }
        c.strokeStyle = 'rgba(8,16,34,' + (0.7 * (1 - frost) * end) + ')'; c.lineWidth = 4; c.stroke();
        c.strokeStyle = 'rgba(207,232,255,' + (0.5 * (1 - 0.5 * frost) * end) + ')'; c.lineWidth = 1; c.stroke();
        if (frost > 0.02) { c.strokeStyle = 'rgba(240,248,255,' + (0.62 * frost * end) + ')'; c.lineWidth = 1.5 + 3.4 * frost; c.stroke(); }
      }
    }
    c.restore();
  }

  // prints: every hero's, faint; a scented hero's last six seconds lit; a hero that carries Blood on the Snow in red
  function drawPrints(c, t, ev) {
    const last = ev.gwlast, life = last ? 14 : 8, fadeAt = last ? 11.5 : 2.6, span = last ? Math.min(14, t - last.start + 0.01) : 6;
    const dent = sprite('dent'), lit = sprite('lit'), blood = sprite('blood'), w = S.wipe;
    const cold = S.cold ? easeOut(clamp((t - S.cold.start) / Math.max(1, S.cold.dur * 0.8), 0, 1)) : 0;
    for (const [id, h] of S.heroes) {
      const m = S.marks.get(id), prey = !!(m && (m.prey > t || m.prey2 > t));
      for (let k = 0; k < h.n; k++) {
        const o = slot(h, k), b = h.buf, age = t - b[o + 3];
        if (age > life || age < -0.5) continue;
        if (w && b[o + 3] < w.start - 0.05) { if (t > w.start + w.dur) continue; const u = b[o] * WC + b[o + 1] * WS; if (u < -780 + 1560 * easeIO(clamp((t - w.start) / w.dur, 0, 1))) continue; }
        const f = 1 - clamp((age - fadeAt) / (life - fadeAt), 0, 1);
        if (b[o + 4] > 0.5) blit(c, blood, b[o], b[o + 1], b[o + 2], 0.8 * f);
        else if (prey && age < span) { blit(c, dent, b[o], b[o + 1], b[o + 2], 0.4 * f); blit(c, lit, b[o], b[o + 1], b[o + 2], 0.95 * f); }
        else { blit(c, dent, b[o], b[o + 1], b[o + 2], (0.3 + 0.12 * cold) * f); if (cold > 0.05) blit(c, lit, b[o], b[o + 1], b[o + 2], cold * 0.9 * f); }
      }
    }
  }

  // ---------------------------------------------------------------- the room's moments, under the units
  // the flurry's white-out: a front of driven snow crossing the lake with the wind, thickest in the middle of it, never anything but a veil under the units and the warnings
  function driftFront(c, e, t) {
    const dur = Math.max(1, e.end - e.start), u = clamp((t - e.start) / dur, 0, 1), env = Math.sin(Math.PI * Math.pow(u, 0.85)) * clamp((e.end + 0.5 - t) / 0.5, 0, 1);
    if (env < 0.02) return;
    const sc = -950 + 1900 * easeIO(u), Wb = 540;
    c.save(); c.rotate(WIND);
    const g = c.createLinearGradient(sc - Wb, 0, sc + Wb, 0);
    g.addColorStop(0, 'rgba(226,238,252,0)'); g.addColorStop(0.5, rgba('#e4eefb', 0.36 * env * flashK())); g.addColorStop(1, 'rgba(226,238,252,0)');
    c.fillStyle = g; c.fillRect(sc - Wb, -1100, Wb * 2, 2200);
    // ground-blown snow racing along the floor inside the front
    c.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      const lane = (hash(i, 3) * 2 - 1) * 760, sp = 520 + 360 * hash(i, 4), x = sc + (((t * sp + hash(i, 5) * 1400) % 1400) - 700) * 0.9, a = Math.max(0, 1 - Math.abs(x - sc) / Wb) * env;
      if (a < 0.03) continue;
      const L = 70 + 120 * hash(i, 6), wv = Math.sin(t * 3 + i) * 5;
      c.beginPath(); c.moveTo(x, lane); c.quadraticCurveTo(x - L * 0.5, lane + wv, x - L, lane + wv * 0.3);
      c.strokeStyle = rgba('#ffffff', 0.34 * a); c.lineWidth = 2 + 2.4 * hash(i, 7); c.stroke();
    }
    c.restore();
  }
  // the page goes clean: a soft white sweep across the lake with the wind, every print gone behind it
  function wipeVeil(c, w, t) {
    const u = clamp((t - w.start) / w.dur, 0, 1), fr = -780 + 1560 * easeIO(u), fade = clamp((w.start + w.dur + 0.4 - t) / 0.4, 0, 1);
    c.save(); c.rotate(WIND);
    const g = c.createLinearGradient(fr - 420, 0, fr + 120, 0);
    g.addColorStop(0, 'rgba(244,250,255,0)'); g.addColorStop(0.8, rgba('#f4faff', 0.34 * fade * flashK())); g.addColorStop(1, 'rgba(244,250,255,0)');
    c.fillStyle = g; c.fillRect(fr - 420, -1100, 540, 2200);
    c.restore();
  }
  // Hard Frost: frost creeping in from the edges of the floor and holding a moment, ferns of ice on the snow
  function frostEdge(c, e, t) {
    const u = (t - e.start) / Math.max(1, e.end - e.start), grow = easeOut(clamp(u / 0.85, 0, 1)), fade = clamp((e.end + 2 - t) / 2, 0, 1), k = grow * fade;
    if (k < 0.01) return;
    const hw = ARENA.hw || 560, hh = ARENA.hh || 400, depth = 26 + 74 * grow;
    c.save(); c.lineJoin = 'round';
    ARENA.trace(c, 0);
    for (const [w, a] of [[2.0, 0.1], [1.35, 0.14], [0.7, 0.2]]) { c.strokeStyle = rgba('#d6ecff', a * k); c.lineWidth = depth * w; c.stroke(); }
    const per = 4 * (hw + hh);
    c.beginPath();
    for (let i = 0; i < 44; i++) {
      let p = hash(i, 11) * per, x, y, ang;
      if (p < 2 * hw) { x = -hw + p; y = -hh; ang = Math.PI / 2; } else if ((p -= 2 * hw) < 2 * hh) { x = hw; y = -hh + p; ang = Math.PI; } else if ((p -= 2 * hh) < 2 * hw) { x = hw - p; y = hh; ang = -Math.PI / 2; } else { p -= 2 * hw; x = -hw; y = hh - p; ang = 0; }
      fernPath(c, x, y, ang + (hash(i, 12) - 0.5) * 0.7, depth * (0.55 + 0.7 * hash(i, 13)));
    }
    c.strokeStyle = rgba(C.frostDk, 0.4 * k); c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
    c.strokeStyle = rgba('#ffffff', 0.9 * k); c.lineWidth = 1.8; c.stroke();
    c.restore();
  }
  // the last act: the snow stops, and one slow ring of clear air goes out from where he stands
  function clearRing(c, e, t, v) {
    const u = (t - e.start) / 3.2; if (u < 0 || u > 1) return;
    const b = v && v.boss, x = b ? b.x : 0, y = b ? b.y : 0, r = 60 + easeOut(u) * 1100, a = Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.5;
    c.save(); c.lineWidth = 16; c.strokeStyle = rgba('#e8f4ff', 0.1 * a); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    c.lineWidth = 3; c.strokeStyle = rgba('#ffffff', 0.45 * a); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    c.restore();
  }
  // Cold Trail (the enrage): every trail on the lake lit end to end, threads of light along each, building to the cast's last second
  function coldTrails(c, t) {
    const q = clamp((t - S.cold.start) / S.cold.dur, 0, 1.2), k = easeIn(Math.min(1, q)) * (0.4 + 0.6 * Math.min(1, q * 1.5)), flash = q > 1 ? Math.max(0, 1 - (q - 1) * 5) : 0;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [id, h] of S.heroes) {
      if (h.n < 2) continue;
      c.beginPath(); let go = false;
      for (let i = 0; i < h.n; i++) {
        const o = slot(h, i), b = h.buf; if (t - b[o + 3] > 8) { go = false; continue; }
        const x = b[o] + Math.sin(b[o + 2]) * b[o + 5] * 5.4, y = b[o + 1] - Math.cos(b[o + 2]) * b[o + 5] * 5.4;   // (back to the line of the steps)
        if (!go) { c.moveTo(x, y); go = true; } else c.lineTo(x, y);
      }
      c.strokeStyle = rgba('#bfe4ff', 0.16 * k); c.lineWidth = 12; c.stroke();
      c.strokeStyle = rgba('#f4faff', (0.4 * k + 0.5 * flash)); c.lineWidth = 2.2; c.stroke();
    }
    c.restore();
  }

  // ---------------------------------------------------------------- the lit trail (room events gwpath:<n>; drawZones hands over: floor())
  const KDS = { gwRun: ['run', 'whole'], gwBack: ['back'], gwShade: ['shade'], gwStill: ['still'] };
  // the polyline of a run, the distance run so far at each corner, and the distances at which the host's pieces land (it cuts every stretch into
  // pieces of at most 280 and puts a corner circle at every corner)
  function prep(ev) {
    if (ev._gw) return ev._gw;
    const l = ev.l || [], cum = [0];
    for (let i = 1; i < l.length; i++) cum.push(cum[i - 1] + Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]));
    const B = [];
    for (let i = 1; i < l.length; i++) {
      const sl = cum[i] - cum[i - 1]; if (sl < 6) continue;
      for (let u0 = 0; u0 < sl - 1;) { const u = Math.min(sl, u0 + 280); B.push(cum[i - 1] + u); u0 = u; }
      if (i < l.length - 1) B.push(cum[i]);
    }
    B.sort((a, b) => a - b);
    return (ev._gw = { l, cum, L: cum[cum.length - 1] || 0, w: ev.w || 120, sp: ev.sp || 820, begin: ev.start + (ev.at || 0), B, lit: null, kd: ev.kd || 'run', seed: Math.floor(hash(ev.start * 7.3, 2) * 999) });
  }
  function atDist(P, d) {
    const l = P.l; if (l.length < 2) return { x: l[0] ? l[0][0] : 0, y: l[0] ? l[0][1] : 0, a: 0, i: 1 };
    d = clamp(d, 0, P.L); let i = 1; while (i < l.length - 1 && P.cum[i] < d) i++;
    const a = l[i - 1], b = l[i], seg = (P.cum[i] - P.cum[i - 1]) || 1, u = (d - P.cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, a: Math.atan2(b[1] - a[1], b[0] - a[0]), i };
  }
  // the points of the stretch of the line between two distances: SX / SY, n of them
  const SX = new Float64Array(64), SY = new Float64Array(64), UX = new Float64Array(64), UY = new Float64Array(64);
  function sub(P, d0, d1) {
    let n = 0; const l = P.l;
    d0 = clamp(d0, 0, P.L); d1 = clamp(d1, 0, P.L);
    if (d1 - d0 < 0.5 || l.length < 2) return 0;
    const q0 = atDist(P, d0); SX[n] = q0.x; SY[n++] = q0.y;
    for (let i = 1; i < l.length - 1 && n < 62; i++) if (P.cum[i] > d0 + 0.5 && P.cum[i] < d1 - 0.5) { SX[n] = l[i][0]; SY[n++] = l[i][1]; }
    const q1 = atDist(P, d1); SX[n] = q1.x; SY[n++] = q1.y;
    return n;
  }
  function traceSub(c, P, d0, d1) { const n = sub(P, d0, d1); if (n < 2) return 0; c.moveTo(SX[0], SY[0]); for (let i = 1; i < n; i++) c.lineTo(SX[i], SY[i]); return n; }
  // the outline of the corridor round a line, as ONE shape: both long edges, a round corner on the outside of each turn, the two inside edges
  // trimmed where they cross, and a line across each end (added to the current path)
  function corridorEdges(c, P, h, d0, d1, caps = true) {
    const n = sub(P, d0, d1); if (n < 2) return;
    const m = n - 1, ux = UX, uy = UY;
    for (let i = 0; i < m; i++) { const dx = SX[i + 1] - SX[i], dy = SY[i + 1] - SY[i], L = Math.hypot(dx, dy) || 1; ux[i] = dx / L; uy[i] = dy / L; }
    const turn = i => { const cr = ux[i - 1] * uy[i] - uy[i - 1] * ux[i], dt = ux[i - 1] * ux[i] + uy[i - 1] * uy[i]; return { cr, dt, inner: cr > 0 ? 1 : -1 }; };
    for (let i = 0; i < m; i++) for (let sg = -1; sg <= 1; sg += 2) {
      let ax = SX[i] + sg * h * -uy[i], ay = SY[i] + sg * h * ux[i], bx = SX[i + 1] + sg * h * -uy[i], by = SY[i + 1] + sg * h * ux[i];
      if (i > 0) { const T = turn(i); if (Math.abs(T.cr) > 1e-3 && T.inner === sg && 1 + T.dt > 0.15) { const k = sg * h / (1 + T.dt); ax = SX[i] + (-uy[i - 1] - uy[i]) * k; ay = SY[i] + (ux[i - 1] + ux[i]) * k; } }
      if (i < m - 1) { const T = turn(i + 1); if (Math.abs(T.cr) > 1e-3 && T.inner === sg && 1 + T.dt > 0.15) { const k = sg * h / (1 + T.dt); bx = SX[i + 1] + (-uy[i] - uy[i + 1]) * k; by = SY[i + 1] + (ux[i] + ux[i + 1]) * k; } }
      c.moveTo(ax, ay); c.lineTo(bx, by);
    }
    for (let i = 1; i < m; i++) {
      const T = turn(i); if (Math.abs(T.cr) < 1e-3) continue;
      const a0 = Math.atan2(-T.inner * ux[i - 1], T.inner * uy[i - 1]), th = Math.atan2(T.cr, T.dt);   // (the outer normal of the stretch before the corner)
      c.moveTo(SX[i] + Math.cos(a0) * h, SY[i] + Math.sin(a0) * h); c.arc(SX[i], SY[i], h, a0, a0 + th, th < 0);
    }
    if (caps) {
      c.moveTo(SX[0] + uy[0] * h, SY[0] - ux[0] * h); c.lineTo(SX[0] - uy[0] * h, SY[0] + ux[0] * h);
      c.moveTo(SX[n - 1] + uy[m - 1] * h, SY[n - 1] - ux[m - 1] * h); c.lineTo(SX[n - 1] - uy[m - 1] * h, SY[n - 1] + ux[m - 1] * h);
    }
  }
  const kindCol = kd => (kd === 'shade' ? { hi: '#f1edff', mid: C.shade, glow: '#b9a8e8' } : kd === 'back' ? { hi: '#e6f2ff', mid: '#9fc4e8', glow: C.frost } : { hi: C.snow, mid: C.ice, glow: C.frost });

  // the prints of the walked line that light, oldest step to newest: found once, when the line first draws, from what this client kept
  function initLit(ev, P) {
    const xs = [], ys = [], as = [], us = [], ds = [], l = P.l;
    const near = (x, y) => {
      let best = 1e9, bd = 0;
      for (let i = 1; i < l.length; i++) {
        const ax = l[i - 1][0], ay = l[i - 1][1], dx = l[i][0] - ax, dy = l[i][1] - ay, l2 = dx * dx + dy * dy, u = l2 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0, d = Math.hypot(x - ax - dx * u, y - ay - dy * u);
        if (d < best) { best = d; bd = P.cum[i - 1] + Math.sqrt(l2) * u; }
      }
      return { d: best, along: bd };
    };
    if (l.length > 1) for (const [id, h] of S.heroes) {
      for (let k = 0; k < h.n; k++) {
        const o = slot(h, k), b = h.buf; if (b[o + 3] > ev.start + 0.1) continue;
        const q = near(b[o], b[o + 1]); if (q.d > (id === ev.who ? 30 : 9)) continue;
        xs.push(b[o]); ys.push(b[o + 1]); as.push(b[o + 2]); ds.push(q.along); us.push(q.along / (P.L || 1));
      }
    }
    // (no steps of this hero kept here: the snow was just cleared, or this client was not looking: the line is lit with a trail of its own)
    if (xs.length < Math.max(2, P.L / 90)) {
      xs.length = ys.length = as.length = us.length = ds.length = 0;
      for (let d = 12, s = 1; d < P.L - 6; d += STRIDE, s = -s) { const q = atDist(P, d); xs.push(q.x - Math.sin(q.a) * s * 5.4); ys.push(q.y + Math.cos(q.a) * s * 5.4); as.push(q.a); ds.push(d); us.push(d / (P.L || 1)); }
    }
    return (P.lit = { xs, ys, as, us, ds });
  }
  function litPrints(c, ev, t) {
    const P = prep(ev); if (t < ev.start || t > ev.end + 1.2) return;
    const lit = P.lit || initLit(ev, P), spr = sprite(P.kd === 'shade' ? 'litShade' : 'lit');
    for (let j = 0; j < lit.xs.length; j++) {
      const tl = ev.start + lit.us[j] * 0.55, pass = P.begin + lit.ds[j] / P.sp, a = clamp((t - tl) / 0.14, 0, 1) * (1 - clamp((t - pass) / 1.1, 0, 1));
      if (a > 0.02) blit(c, spr, lit.xs[j], lit.ys[j], lit.as[j], 0.97 * a);
    }
  }

  // the red corridor of a run: one wash, one rim, what he has already landed on cut away behind the front; inside it the line lights
  function corridor(c, ev, t) {
    const P = prep(ev); if (P.L < 8 || t < ev.start) return;
    const head = (t - P.begin) * P.sp;
    let Sd = 0, nb = P.L; for (const b of P.B) { if (b <= head + 0.01) Sd = b; else { nb = b; break; } }
    const tail = clamp(1 - (t - (P.begin + P.L / P.sp)) / 0.25, 0, 1);
    if (Sd >= P.L - 0.5 && tail <= 0) return;
    const kIn = clamp((t - ev.start) / 0.25, 0, 1), k = kIn * (Sd >= P.L - 0.5 ? tail : 1), col = danger(), hw = P.w / 2;
    const left = head < 0 ? 9 : (nb - head) / P.sp, late = clamp(1 - left / 0.6, 0, 1), kd = P.kd, cc = kindCol(kd), d0 = Sd >= P.L - 0.5 ? P.L - 8 : Sd;
    c.save(); c.lineCap = 'butt'; c.lineJoin = 'round';
    // the wash: one stroke of the whole stretch still to land, then the piece landing next a shade stronger
    c.beginPath(); traceSub(c, P, d0, P.L); c.strokeStyle = rgba(col, (kd === 'back' ? 0.18 : 0.23) * k); c.lineWidth = P.w; c.stroke();
    if (late > 0.02) { c.globalCompositeOperation = 'lighter'; c.beginPath(); traceSub(c, P, d0, Math.min(P.L, nb)); c.strokeStyle = rgba(col, 0.16 * late * k); c.lineWidth = P.w; c.stroke(); c.globalCompositeOperation = 'source-over'; }
    // the rim: dashed under, solid over (the same as every other telegraph's)
    c.beginPath(); corridorEdges(c, P, hw, d0, P.L);
    c.setLineDash([12, 10]); c.lineDashOffset = -t * 24; c.strokeStyle = rgba(col, 0.28 * k); c.lineWidth = 6; c.stroke(); c.setLineDash([]);
    c.strokeStyle = rgba(col, (0.55 + 0.4 * late) * k); c.lineWidth = 2 + late * 1.5; c.stroke();
    // inside it: the lit line (it lights from the oldest step to the newest), and chevrons running the way he will
    const lit = clamp((t - ev.start) / 0.55, 0, 1) * P.L;
    if (lit > d0 + 1) {
      c.lineCap = 'round';
      c.beginPath(); traceSub(c, P, d0, lit); c.strokeStyle = rgba(C.ink, 0.22 * k); c.lineWidth = 6.5; c.stroke();
      c.strokeStyle = rgba(cc.glow, 0.2 * k); c.lineWidth = 13; c.stroke();
      if (kd === 'back') c.setLineDash([14, 10]);
      c.strokeStyle = rgba(cc.hi, 0.9 * k); c.lineWidth = 2.6; c.stroke(); c.setLineDash([]);
      const off = (t * (kd === 'whole' ? 150 : 110)) % 90;
      c.beginPath();
      for (let d = Math.max(d0, 0) + off; d < lit; d += 90) { const q = atDist(P, d), ca = Math.cos(q.a), sa = Math.sin(q.a); c.moveTo(q.x - ca * 9 - sa * 8, q.y - sa * 9 + ca * 8); c.lineTo(q.x + ca * 3, q.y + sa * 3); c.lineTo(q.x - ca * 9 + sa * 8, q.y - sa * 9 - ca * 8); }
      c.strokeStyle = rgba(cc.hi, 0.6 * k); c.lineWidth = 2.2; c.stroke();
    }
    // Stillness: the crack of frost that will burst along the steps, hairline now and woken as it nears
    if (kd === 'still') {
      const p = clamp((t - ev.start) / Math.max(0.3, P.begin - ev.start), 0, 1);
      c.beginPath(); for (let i = 1; i < P.l.length; i++) zigPath(c, P.l[i - 1][0], P.l[i - 1][1], P.l[i][0], P.l[i][1], P.seed + i, 6 + 4 * p, 18);
      c.lineCap = 'round'; c.strokeStyle = rgba(C.ink, (0.2 + 0.3 * p) * k); c.lineWidth = 3.4; c.stroke(); c.strokeStyle = rgba('#ffffff', (0.4 + 0.5 * p) * k); c.lineWidth = 1.2 + p; c.stroke();
    }
    c.restore();
  }

  // the furrow he leaves: ploughed snow along the line behind him, heaped at its lips, fading over some seconds
  function furrow(c, ev, t) {
    const P = prep(ev); if (P.L < 8) return;
    const runEnd = P.begin + P.L / P.sp, head = Math.min(P.L, (t - P.begin) * P.sp);
    if (head < 8) return;
    const k = 1 - clamp((t - runEnd - 1.5) / 5.5, 0, 1); if (k <= 0.01) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (P.kd === 'still') {
      // the frost that burst: a crack with ice-blue shards along it
      c.beginPath(); for (let i = 1; i < P.l.length; i++) zigPath(c, P.l[i - 1][0], P.l[i - 1][1], P.l[i][0], P.l[i][1], P.seed + i, 9, 16);
      c.strokeStyle = rgba(C.deep, 0.4 * k); c.lineWidth = 7; c.stroke(); c.strokeStyle = rgba(C.snow, 0.9 * k); c.lineWidth = 2.6; c.stroke();
      c.strokeStyle = rgba(C.ice, 0.35 * k); c.lineWidth = 12; c.stroke();
      c.restore(); return;
    }
    c.beginPath(); traceSub(c, P, 0, head);
    c.strokeStyle = rgba('#33497a', 0.15 * k); c.lineWidth = 46; c.stroke();
    c.strokeStyle = rgba('#2d4272', 0.26 * k); c.lineWidth = 26; c.stroke();
    c.strokeStyle = rgba('#1c2c52', 0.32 * k); c.lineWidth = 8; c.stroke();
    c.beginPath(); corridorEdges(c, P, 25, 0, head, false); c.strokeStyle = rgba('#f4faff', 0.55 * k); c.lineWidth = 4.2; c.stroke();
    c.beginPath(); corridorEdges(c, P, 29, 0, head, false); c.strokeStyle = rgba('#34507f', 0.28 * k); c.lineWidth = 2.4; c.stroke();
    c.restore();
  }

  // him on the run: a ribbon of mist torn off behind him along the line, snow and mist thrown up, a pale cold trail where he has been
  function runHead(c, ev, t) {
    const P = prep(ev); if (P.L < 8) return;
    const head = (t - P.begin) * P.sp; if (head < 0 || head > P.L + 40) return;
    const hd = Math.min(P.L, head), q = atDist(P, hd);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 7; i++) {
      const d1 = hd - i * 42, d0 = d1 - 46; if (d1 < 2) break;
      const f = 1 - i / 7; c.beginPath(); traceSub(c, P, Math.max(0, d0), d1);
      c.strokeStyle = rgba('#eaf3fd', 0.09 * f); c.lineWidth = 78 * (0.5 + 0.5 * f); c.stroke();
      c.strokeStyle = rgba('#ffffff', 0.16 * f); c.lineWidth = 30 * (0.4 + 0.6 * f); c.stroke();
    }
    c.restore();
    const key = ev.start;
    if (head < P.L && t - (S.sp[key] || 0) > 0.035) {
      S.sp[key] = t;
      const back = q.a + Math.PI, nx = Math.cos(q.a + 1.57), ny = Math.sin(q.a + 1.57);
      for (let i = 0; i < 2; i++) VFX.spawn({ x: q.x + rand(-26, 26) * nx, y: q.y + rand(-26, 26) * ny, z: rand(6, 28), vx: Math.cos(back) * rand(30, 120), vy: Math.sin(back) * rand(30, 120) * 0.6, vz: rand(14, 50), life: rand(0.8, 1.3), size: rand(24, 40), size1: rand(60, 90), color: '#e3eefa', kind: 'smoke', add: false, a: 0.42, fadeIn: 0.08 });
      for (let i = 0; i < 2; i++) { const s = Math.random() < 0.5 ? -1 : 1; VFX.spawn({ x: q.x + nx * s * 40, y: q.y + ny * s * 40, z: rand(4, 20), vx: nx * s * rand(60, 180) + Math.cos(back) * 60, vy: ny * s * rand(60, 180) * 0.6 + Math.sin(back) * 36, vz: rand(100, 240), g: 520, drag: 0.03, life: rand(0.5, 0.9), size: rand(4, 8), size1: 1, color: '#ffffff', kind: 'glow', add: false, a: 0.9 }); }
    }
  }

  // Circle the Prey: his own prints appearing round the ring a little ahead of him as he trots (a dotted track under them), then the band bursts
  function ringTrack(c, e, t) {
    if (!e || t > e.end + 3.2) return;
    const u = t - e.start, d = Math.max(1, e.dur - 0.6), trot = Math.max(0.5, d - 0.5), R = e.r, dir = e.dir || 1, N = Math.round(TAU * R / 46), paw = sprite('paw');
    const burst = t > e.start + d, k = burst ? clamp(1 - (t - e.start - d) / 2.6, 0, 1) : 1;
    if (k <= 0.01) return;
    c.save();
    const lead = clamp((u + 0.7) / trot, 0, 1);
    c.beginPath(); c.arc(e.x, e.y, R, e.a0, e.a0 + dir * TAU * lead, dir < 0); c.setLineDash([2, 11]); c.lineCap = 'round'; c.strokeStyle = rgba(C.ice, 0.55 * k); c.lineWidth = 2.4; c.stroke(); c.setLineDash([]);
    for (let i = 0; i < N; i++) {
      const born = (i / N) * trot - 0.7, a = clamp((u - born) / 0.3, 0, 1) * k; if (a <= 0.02) continue;
      const ang = e.a0 + dir * i * TAU / N, side = i % 2 ? 1 : -1, rr = R + side * 13, x = e.x + Math.cos(ang) * rr, y = e.y + Math.sin(ang) * rr, head = ang + dir * Math.PI / 2;
      blit(c, paw, x, y, head, 0.95 * a, 0.9);
    }
    c.restore();
  }

  // ridges: one that stands and then is gone (it ran out, or the flurry took it) crumbles
  function ridges(room, t) {
    const seen = S.ridges;
    for (const [id, r] of seen) r.live = false;
    for (const p of room.props || []) if (p.kind === 'ridge') { let r = seen.get(p.id); if (!r) seen.set(p.id, r = {}); r.x = p.x; r.y = p.y; r.w = p.w; r.a = p.a || 0; r.live = true; r.t = t; }
    for (const [id, r] of seen) {
      if (r.live) continue;
      seen.delete(id);
      if (t - r.t > 0.5) continue;
      const ca = Math.cos(r.a), sa = Math.sin(r.a), n = Math.max(3, Math.round(r.w / 46));
      for (let i = 0; i < n; i++) { const u = ((i + 0.5) / n - 0.5) * r.w, x = r.x + ca * u, y = r.y + sa * u; snowUp(x, y, 3, { size: 0.9, up: 0.8 }); iceUp(x, y, 2, { size: 1.1 }); }
      shakeNow(2);
    }
  }

  // ---------------------------------------------------------------- the floor hook (ArenaView.drawZones): under the units and every warning
  function floor(ctx, room, t) {
    if (!room || !room.ev) return;
    if (S.room !== room) return;   // (not seen by under() yet)
    try {
      for (let i = S.paths.length - 1; i >= 0; i--) if (t > S.paths[i].end + 9) S.paths.splice(i, 1);
      ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
      for (const ev of S.paths) furrow(ctx, ev, t);
      for (const ev of S.paths) { corridor(ctx, ev, t); litPrints(ctx, ev, t); runHead(ctx, ev, t); }
      ringTrack(ctx, room.ev.gwring, t);
      ctx.restore();
      ridges(room, t);
    } catch (e) { try { ctx.restore(); } catch (e2) { /* cosmetic */ } }
  }

  // ---------------------------------------------------------------- the warnings (boss-tells.js get() reads TELLS[tag])
  const TELLS = {};
  // the red under every damaging area of his, at the strength of the shared tell (boss-tells.js outline() draws the rim over it): frost and weight are accents on top
  function redWash(ctx, s, p, k, t, a0 = 0.2) {
    const late = Math.max(0, (p - 0.75) / 0.25), pulse = late > 0 ? 0.5 + 0.5 * Math.sin(t * (10 + late * 22)) : 0;
    ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba(danger(), (a0 + 0.1 * late + 0.06 * pulse) * k); ctx.fill('evenodd'); ctx.restore();
  }
  // a piece of a run's corridor: the whole corridor is drawn once from the line (floor()), so a piece draws nothing of its own, no rim either;
  // if this client never got the line it draws its own piece in the same red so the danger is never missing
  function pathFor(tg, env) {
    const kds = KDS[tg.tag]; if (!kds) return null;
    for (let i = S.paths.length - 1; i >= 0; i--) { const e = S.paths[i]; if (Math.abs(e.start - tg.start) < 0.4 && kds.includes(e.kd || 'run')) return e; }
    return null;
  }
  function pieceTell() {
    return { outline: false, ground(ctx, tg, s, p, k, t, env) {
      if (pathFor(tg, env)) return;
      const col = danger(); ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba(col, 0.23 * k); ctx.fill();
      ctx.strokeStyle = rgba(col, (0.55 + 0.4 * clamp(1 - (1 - p) * tg.dur / 0.6, 0, 1)) * k); ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
    } };
  }
  TELLS.gwRun = pieceTell(); TELLS.gwBack = pieceTell(); TELLS.gwShade = pieceTell(); TELLS.gwStill = pieceTell();

  // Pounce: weight coming down: his shadow growing over the snow, the air pressed in toward the middle, the ice cracking; wide (a still hero fallen on) it is heavier
  TELLS.gwPounce = { ground(ctx, tg, s, p, k, t, env) {
    const r = s.r, heavy = clamp((r - 200) / 190, 0, 1), b = env && env.boss, ang = b ? Math.atan2(s.y - b.y, s.x - b.x) : 0;
    redWash(ctx, s, p, k, t, 0.22 + 0.04 * heavy);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, r);
    g.addColorStop(0, rgba('#1a0610', (0.1 + 0.26 * p) * (1 + 0.4 * heavy) * k)); g.addColorStop(0.7, rgba('#1a0610', (0.05 + 0.14 * p) * (1 + 0.3 * heavy) * k)); g.addColorStop(1, rgba('#1a0610', (0.02 + 0.05 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    // the air pressed down, drawing in
    ctx.lineCap = 'round';
    const nr = 3 + Math.round(2 * heavy);
    for (let i = 0; i < nr; i++) { const q = (t * (0.55 + 1.1 * p) + i / nr) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, r * (1 - q * 0.82), 0, TAU); ctx.strokeStyle = rgba(C.snow, Math.sin(q * Math.PI) * (0.06 + 0.3 * p) * k); ctx.lineWidth = 1.6 + 1.6 * heavy; ctx.stroke(); }
    // his shadow over it: a body with the legs flung out, growing as he comes down
    const sc = 0.5 + 0.5 * easeOut(p), L = 74 * (0.9 + 0.2 * heavy);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang); ctx.scale(sc, sc * 0.82); ctx.fillStyle = rgba('#000000', (0.22 + 0.34 * p) * k); ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(-4, 0, L * 0.7, L * 0.3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(L * 0.7, 0, L * 0.26, L * 0.19, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 11; for (const [x, y, ex, ey] of [[-L * 0.5, -L * 0.2, -L * 0.95, -L * 0.62], [-L * 0.5, L * 0.2, -L * 0.95, L * 0.62], [L * 0.3, -L * 0.2, L * 0.72, -L * 0.62], [L * 0.3, L * 0.2, L * 0.72, L * 0.62]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); }
    ctx.restore();
    // the ice cracking under it (the wide fall: a lot of it)
    const nc = Math.round(4 + 8 * heavy);
    for (let i = 0; i < nc; i++) { const a = i * TAU / nc + hash(i, tg.id) * 0.5, d = r * (0.14 + 0.62 * p) * (0.7 + 0.3 * hash(i, 5)); crackLine(ctx, s.x + Math.cos(a) * 12, s.y + Math.sin(a) * 12 * 0.9, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9, tg.id + i, k * (0.25 + 0.5 * p) * (0.7 + 0.5 * heavy), { w: 1.2 + heavy, jag: 6, col: C.snow }); }
    // snow at the edge starting to lift
    for (let i = 0; i < 12 + Math.round(10 * heavy); i++) { const a = i * 2.4 + hash(i, tg.id) * 6, q = (t * 0.6 + hash(i, 4)) % 1; glow(ctx, s.x + Math.cos(a) * r * 0.97, s.y + Math.sin(a) * r * 0.97 - q * 16 * p, 8 + 6 * q, '#f4faff', 0.45 * p * (1 - q) * k); }
    ctx.restore();
  } };

  // Howl: the sound made visible across the lake: thin rings of cold light going out from him, slowly, and the edge of the lake catching it
  TELLS.gwHowl = { raidwide: true, ground(ctx, tg, s, p, k, t, env) {
    const R = AR(), b = env && env.boss, x = b ? b.x : 0, y = b ? b.y : 0;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    for (let i = 0; i < 4; i++) {
      const q = (t * (0.28 + 0.4 * p) + i / 4) % 1, r = 70 + q * R * 1.7, a = Math.sin(q * Math.PI) * (0.04 + 0.2 * p) * k;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = rgba('#dcecff', a * 0.45); ctx.lineWidth = 14 * (1 - q * 0.5); ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 2; ctx.stroke();
    }
    ARENA.trace(ctx, -4); ctx.lineJoin = 'round';
    for (const [w, a] of [[40, 0.03], [16, 0.06], [5, 0.14]]) { ctx.strokeStyle = rgba('#dcecff', a * (0.2 + p) * k); ctx.lineWidth = w; ctx.stroke(); }
    ctx.restore();
  } };

  // Rime: a breath of frost gathering on a hero: a snowflake opening inside the circle, needles of ice growing out, mist turning
  TELLS.gwRime = { ground(ctx, tg, s, p, k, t) {
    const r = s.r;
    redWash(ctx, s, p, k, t, 0.22);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, r);
    g.addColorStop(0, rgba('#ffffff', (0.06 + 0.16 * p) * k)); g.addColorStop(1, rgba(C.ice, 0.02 * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const a = t * (0.5 + 0.12 * i) * (i % 2 ? -1 : 1) + i * 1.7, rr = r * (0.3 + 0.17 * i); ctx.beginPath(); ctx.arc(s.x, s.y, rr, a, a + 1.5); ctx.strokeStyle = rgba('#ffffff', (0.2 + 0.3 * p) * k); ctx.lineWidth = 2.6; ctx.stroke(); }
    ctx.beginPath(); flakePath(ctx, s.x, s.y, r * (0.25 + 0.6 * easeOut(p)), t * 0.35);
    ctx.strokeStyle = rgba(C.frostDk, 0.28 * k); ctx.lineWidth = 4.6; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', (0.4 + 0.5 * p) * k); ctx.lineWidth = 1.8; ctx.stroke();
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t * 0.4, q = (t * 0.7 + hash(i, tg.id)) % 1, d = r * (0.25 + 0.65 * q); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - q * 10, 10 + 8 * q, '#eaf4ff', 0.34 * (1 - q) * (0.4 + p) * k); }
    ctx.restore();
  } };

  // Circle the Prey: the band is his track; the frost laid along it runs the way he trots (his prints on it are painted on the floor, ringTrack)
  TELLS.gwRing = { ground(ctx, tg, s, p, k, t, env) {
    const e = env && env.room && env.room.ev && env.room.ev.gwring, dir = e && e.dir ? e.dir : 1, Rm = (s.r + s.r2) / 2, hw = (s.r - s.r2) / 2;
    redWash(ctx, s, p, k, t, 0.2);
    ctx.save(); ctx.lineCap = 'round';
    ctx.setLineDash([3, 14]); ctx.lineDashOffset = -dir * t * 28; ctx.beginPath(); ctx.arc(s.x, s.y, Rm, 0, TAU); ctx.strokeStyle = rgba('#ffffff', (0.4 + 0.4 * p) * k); ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]);
    const n = 14, spin = dir * t * (0.55 + 0.9 * p) / (Rm / 250);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + spin / 3, x = s.x + Math.cos(a) * Rm, y = s.y + Math.sin(a) * Rm, th = a + dir * Math.PI / 2, ca = Math.cos(th), sa = Math.sin(th);
      ctx.beginPath(); ctx.moveTo(x - ca * 8 - sa * 12, y - sa * 8 + ca * 12); ctx.lineTo(x + ca * 5, y + sa * 5); ctx.lineTo(x - ca * 8 + sa * 12, y - sa * 8 - ca * 12);
      ctx.strokeStyle = rgba(C.snow, (0.3 + 0.5 * p) * k); ctx.lineWidth = 2.4; ctx.stroke();
    }
    ctx.restore();
  } };

  // Throat Snap: a cone of jaws: two rows of teeth along its edges, closing as the cast runs (the rest of the closing is the impact); the cold breath along its middle
  function teeth(c, s, close, a) {
    if (a <= 0.01) return;
    const edge = (sg, off) => s.angle + sg * (s.arc / 2) * (1 - close * 0.82) - sg * off;
    c.save(); c.lineJoin = 'round';
    for (const sg of [-1, 1]) for (let d = 54, i = 0; d < s.r - 18; d += 42, i++) {
      const ang = edge(sg, 0.05), bx = s.x + Math.cos(ang) * d, by = s.y + Math.sin(ang) * d, ca = Math.cos(ang), sa = Math.sin(ang), inx = -sg * -sa, iny = -sg * ca, L = 30 * (0.8 + 0.4 * hash(i, sg + 3));
      c.beginPath(); c.moveTo(bx - ca * 13, by - sa * 13); c.lineTo(bx + inx * L, by + iny * L); c.lineTo(bx + ca * 13, by + sa * 13); c.closePath();
      c.fillStyle = rgba('#eef6ff', a); c.fill(); c.strokeStyle = rgba(C.deep, 0.7 * a); c.lineWidth = 1.6; c.stroke();
    }
    c.restore();
  }
  function buster(ctx, tg, s, p, k, t, env) {
    redWash(ctx, s, p, k, t, 0.22);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
    g.addColorStop(0, rgba('#1a0610', (0.06 + 0.12 * p) * k)); g.addColorStop(1, rgba('#1a0610', 0.01 * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    teeth(ctx, s, easeIn(p) * 0.6, (0.25 + 0.6 * p) * k);
    for (let i = 0; i < 10; i++) { const q = (t * 0.55 + hash(i, tg.id)) % 1, a = s.angle + (hash(i, 7) - 0.5) * s.arc * 0.4 * (1 - 0.5 * p), d = 50 + q * (s.r - 80); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 14 + 12 * q, '#eaf4ff', 0.3 * (1 - q) * (0.4 + p) * k); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- what stays on the floor (boss-tells.js track() asks once per landed move)
  function aftermath(tg, env, A) {
    const { mark, AFTER } = A, T = AFTER.tier, s = tg.live, id = tg.id;
    if (tg.type === 'buster') {
      mark(T.short, { x: s.x, y: s.y, r: s.r, angle: s.angle, arc: s.arc }, (ctx, q, k, age, seed) => {
        // the scrape of the snow along the cone, and rime where the jaws closed
        for (let i = 0; i < 9; i++) { const a = q.angle + (i / 8 - 0.5) * q.arc * 0.85, d0 = q.r * 0.22, d1 = q.r * (0.62 + 0.3 * hash(i, seed)); crackLine(ctx, q.x + Math.cos(a) * d0, q.y + Math.sin(a) * d0, q.x + Math.cos(a) * d1, q.y + Math.sin(a) * d1, seed + i, 0.55 * k, { w: 1.6, jag: 3, seg: 40, col: '#eef6ff' }); }
        for (let i = 0; i < 12; i++) { const a = q.angle + (hash(i, seed + 2) - 0.5) * q.arc, d = q.r * (0.3 + 0.65 * hash(i, seed + 3)); glow(ctx, q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, 7, '#ffffff', 0.5 * k); }
      }, id);
      return;
    }
    switch (tg.tag) {
      case 'gwPounce': {
        const x = s.x, y = s.y, R = s.r, wide = R > 250;
        mark(wide ? T.long : T.short, { x, y, r: R }, (ctx, q, k, age, seed) => {
          // the print of the fall: the snow pressed flat and dark, a lip of heaped snow, thrown clods, cracks in the ice under it
          ctx.beginPath(); ctx.ellipse(x, y + 4, R * 0.86, R * 0.7, 0, 0, TAU); ctx.fillStyle = rgba('#2a3f6c', 0.2 * k); ctx.fill();
          ctx.strokeStyle = rgba(C.snow, 0.5 * k); ctx.lineWidth = 3.4; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(x, y + 4, R * 0.52, R * 0.42, 0, 0, TAU); ctx.fillStyle = rgba('#0b1830', 0.22 * k); ctx.fill();
          crackStar(ctx, x, y + 4, R * 0.95, wide ? 14 : 9, seed, k * 0.8, { w: 1.8, flat: 0.78 });
          for (let i = 0; i < (wide ? 26 : 14); i++) { const a = hash(i, seed) * TAU, r = R * (0.65 + 0.4 * hash(i, seed + 1)), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.78; poly(ctx, [px - 6, py + 3, px - 1, py - 8, px + 7, py + 2], rgba('#eaf2fc', 0.9 * k), rgba('#3d5688', 0.45 * k), 1); }
        }, id);
        break;
      }
      case 'gwRime': {
        const x = s.x, y = s.y, R = s.r;
        mark(T.short, { x, y, r: R }, (ctx, q, k, age, seed) => {
          ctx.beginPath(); ctx.arc(x, y, R * 0.9, 0, TAU); ctx.fillStyle = rgba('#e8f3ff', 0.16 * k); ctx.fill();
          ctx.beginPath(); flakePath(ctx, x, y, R * 0.8, seed * 0.01); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(C.frostDk, 0.3 * k); ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.9 * k); ctx.lineWidth = 1.4; ctx.stroke();
        }, id);
        break;
      }
      case 'gwRing': {
        const x = s.x, y = s.y, Rm = (s.r + s.r2) / 2, hw = (s.r - s.r2) / 2;
        mark(T.short, { x, y, r: s.r }, (ctx, q, k, age, seed) => {
          // the track that burst: a churned band with his prints still in it
          ctx.beginPath(); ctx.arc(x, y, Rm, 0, TAU); ctx.strokeStyle = rgba('#34507f', 0.14 * k); ctx.lineWidth = hw * 1.5; ctx.stroke();
          for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(x, y, Rm + sg * hw * 0.78, 0, TAU); ctx.strokeStyle = rgba(C.snow, 0.4 * k); ctx.lineWidth = 3.2; ctx.stroke(); }
          for (let i = 0; i < 20; i++) { const a = hash(i, seed) * TAU, r = Rm + (hash(i, seed + 1) - 0.5) * hw * 1.7; poly(ctx, [x + Math.cos(a) * r - 5, y + Math.sin(a) * r + 3, x + Math.cos(a) * r, y + Math.sin(a) * r - 7, x + Math.cos(a) * r + 6, y + Math.sin(a) * r + 2], rgba('#eaf2fc', 0.8 * k)); }
        }, id);
        break;
      }
    }
  }

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // H: the shared helpers boss-vfx.js owns (shapeFlash, shockAt, scatter, after, shake, roomTint, sweep, streak, bang, AFT, coverShadows, clipOut, AR)
  const IMP = {};
  // a piece of a run lands as he reaches it: a streak of cold light and thrown snow along it, a hit on anyone it touches
  function runImp(shade) {
    return (tg, msg, ctx, H) => {
      const s = tg.live, ca = Math.cos(s.angle), sa = Math.sin(s.angle), hi = shade ? C.shade : C.snow;
      if (s.kind !== 'rect') { H.shockAt(s.x, s.y, { r: s.r * 1.2, color: hi, w: 5, dur: 0.35, flat: 0.8 }); snowUp(s.x, s.y, 3, { size: 0.8 }); return; }
      H.shapeFlash(s, hi, { a: 0.14, dur: 0.35 });
      H.streak(s.x, s.y, s.angle, hi, { len: s.len, w: 20, dur: 0.3 });
      H.streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 6, dur: 0.22 });
      for (let d = 30, i = 0; d < s.len; d += 78, i++) { const x = s.x + ca * d, y = s.y + sa * d; H.after(d / s.len * 0.1, () => snowUp(x + (Math.random() - 0.5) * s.w * 0.6, y + (Math.random() - 0.5) * s.w * 0.6, 3, { size: 0.8, angle: s.angle + Math.PI, spread: 1.6 })); }
      const hurt = inside(ctx, s, 6);
      for (const u of hurt) { VFX.hit(u.x, u.y, hi, 1.6); snowUp(u.x, u.y, 5, { size: 0.9 }); if (isMe(u)) flinch(C.frost, 0.08, 0.2, 0.014); }
      H.shake(hurt.length ? 5 : 1.5);
    };
  }
  IMP.gwRun = runImp(false); IMP.gwBack = runImp(false); IMP.gwShade = runImp(true);
  // Stillness: the crack of frost along the steps goes all at once: shards up along its whole length
  IMP.gwStill = (tg, msg, ctx, H) => {
    const s = tg.live; if (s.kind !== 'rect') return;
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    H.shapeFlash(s, C.ice, { a: 0.24, dur: 0.45 });
    H.streak(s.x, s.y, s.angle, '#ffffff', { len: s.len, w: 12, dur: 0.35 });
    for (let d = 14; d < s.len; d += 40) { const x = s.x + ca * d, y = s.y + sa * d; VFX.shock(x, y, { r: 56, color: C.ice, w: 3, dur: 0.35, flat: 0.8 }); iceUp(x, y, 3, { size: 1 }); }
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, C.ice, 1.8); if (isMe(u)) flinch(C.frost, 0.1, 0.22, 0.016); }
    H.shake(5);
  };

  // Pounce landing: the snow blown out in a ring, a ring of frost, the air thrown; a wide fall (a still hero fallen on) is a great deal heavier
  IMP.gwPounce = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y, R = s.r, heavy = clamp((R - 200) / 190, 0, 1), wide = R > 250;
    H.shapeFlash(s, '#e8f4ff', { a: 0.28 + 0.12 * heavy, dur: 0.5 });
    VFX.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, e) => { const q = easeOut(clamp(p / 0.35, 0, 1)), k = e.a * (1 - p) * (1 - p); glow(c, x, y, R * (0.5 + 0.7 * q), '#02060f', 0.4 * k); } });
    H.shockAt(x, y, { r: R * 1.2, color: '#eaf4ff', w: 9 + 4 * heavy, dur: 0.6, flat: 0.8 });
    H.shockAt(x, y, { r: R * 0.78, color: C.frost, w: 5, dur: 0.5, flat: 0.8, delay: 0.06 });
    if (wide) H.shockAt(x, y, { r: R * 1.6, color: C.snow, w: 6, dur: 0.85, flat: 0.8, delay: 0.1 });
    H.bang(x, y, R * 0.5, { n: 14, color: '#dff0ff', core: '#ffffff', ink: '#1a2c4a', dur: 0.5 });
    const n = Math.round(14 + R / 10);
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(120, 170 + R * 0.9), d = R * rand(0.05, 0.4); VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, z: rand(4, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(140, 300 + 60 * heavy), g: 520, drag: 0.03, life: rand(0.7, 1.3), size: rand(8, 15), size1: 2, color: i % 3 ? '#f4faff' : '#cfe3f4', kind: i % 2 ? 'smoke' : 'glow', add: false, a: 0.9 }); }
    VFX.smoke(x, y, { n: Math.round(5 + 4 * heavy), color: '#e6f0fb', size: 36 * (1 + heavy), a: 0.6, speed: 150, r: R * 0.5 });
    iceUp(x, y, 6 + Math.round(10 * heavy), { size: 1.2, speed: 1 + heavy });
    for (const u of inside(ctx, s, 4)) { VFX.hit(u.x, u.y, '#eaf4ff', 2); snowUp(u.x, u.y, 6, { size: 1 }); if (isMe(u)) flinch(C.ice, 0.12 + 0.06 * heavy, 0.25, 0.022); }
    H.shake(wide ? 14 : 8); if (wide) cam(0.12, 0.04, 0.55, 1.5); else cam(0.05, 0.02, 0.4, 3);
    try {   // (a dent in the snow that fills, and cracks that run out from it and frost over: weightLand above)
      const cr = []; for (let i = 0; i < 6; i++) cr.push({ x: x + Math.cos(i * TAU / 6 + 0.3) * R * 0.2, y: y + Math.sin(i * TAU / 6 + 0.3) * R * 0.2, ang: i * TAU / 6 + 0.3 + (hash(i, 2) - 0.5) * 0.4, len: R * (0.55 + 0.3 * hash(i, 5)) });
      weightLand({ x, y, pit: [x, y, R * 0.85], cracks: cr }, 0.9 + 0.5 * heavy);
    } catch (e) { /* cosmetic */ }
  };

  // Throat Snap: the jaws slam shut along the cone, white teeth meeting, the snow thrown off it
  IMP.buster = (tg, msg, ctx, H) => {
    const s = tg.live, e = tg.target != null && ctx.entById ? ctx.entById(tg.target) : null, x = e ? e.x : s.x + Math.cos(s.angle) * s.r * 0.6, y = e ? e.y : s.y + Math.sin(s.angle) * s.r * 0.6;
    VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e2) => { const q = clamp(p / 0.2, 0, 1), k = e2.a * (1 - clamp((p - 0.35) / 0.65, 0, 1)); c.save(); ARENA.trace(c, 2); c.clip(); teeth(c, s, 0.6 + 0.4 * easeOut(q), 0.95 * k); c.restore(); } });
    H.shapeFlash(s, '#e8f4ff', { a: 0.3, dur: 0.45 });
    H.bang(x, y, 130, { n: 14, color: '#dff0ff', core: '#ffffff', ink: '#1a2c4a', dur: 0.5 });
    VFX.hit(x, y, C.snow, 2.4);
    H.shockAt(x, y, { r: 150, color: '#eaf4ff', w: 8, dur: 0.55, flat: 0.8 });
    snowUp(x, y, 10, { size: 1.2, speed: 1.3 }); iceUp(x, y, 8, { size: 1.1 });
    for (let d = 90; d < s.r; d += 90) { const a = s.angle + (Math.random() - 0.5) * s.arc * 0.7; snowUp(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 2, { size: 0.8 }); }
    H.shake(9); cam(0.07, 0.03, 0.4, 2.5);
    try {   // (the lake takes the blow and recovers: weightLand above)
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), d = Math.hypot(x - s.x, y - s.y);
      weightLand({ x, y, line: [s.x + ca * 60, s.y + sa * 60, s.x + ca * s.r * 0.88, s.y + sa * s.r * 0.88], pit: [s.x + ca * s.r * 0.55, s.y + sa * s.r * 0.55, 105], cracks: [{ x, y, ang: s.angle - 0.5, len: 150 }, { x, y, ang: s.angle + 0.45, len: 170 }, { x, y, ang: s.angle, len: 110 + Math.min(80, d * 0.2) }] }, 1.6);   // (the heaviest ordinary thing he does: the groove runs the whole cone, with a bowl under it)
    } catch (e) { /* cosmetic */ }
  };

  // Howl: the sound goes through the lake: three rings of pale light out from him, the whole floor catching it a moment, snow thrown up at the edge
  IMP.gwHowl = (tg, msg, ctx, H) => {
    const b = ctx.bossDraw, x = b ? b.x : 0, y = b ? b.y : 0;
    H.roomTint('#d8eaff', 0.2, 0.9);
    for (let i = 0; i < 3; i++) H.shockAt(x, y, { r: H.AR * (1.5 - i * 0.2), color: i % 2 ? '#ffffff' : C.ice, w: 11 - i * 3, dur: 0.9 + i * 0.12, flat: 0.8, delay: i * 0.1 });
    VFX.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * Math.min(1, p / 0.1);
      c.save(); ARENA.trace(c, 2); c.clip(); ARENA.trace(c, -4); c.lineJoin = 'round';
      for (const [w, col, a] of [[60, '#dcecff', 0.16], [20, C.snow, 0.34], [5, '#ffffff', 0.6]]) { c.strokeStyle = rgba(col, a * k); c.lineWidth = w; c.stroke(); }
      c.restore();
    } });
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 30 }, 9)) H.after(Math.random() * 0.4, () => { snowUp(q.x, q.y, 3, { size: 0.9 }); VFX.flash(q.x, q.y - 10, 40, C.ice, 0.22); });
    H.shake(6);
  };

  // Rime: the frost lets go on the hero: a burst of needles and mist, rings; the slick patch it leaves is the zone
  IMP.gwRime = (tg, msg, ctx, H) => {
    const s = tg.live, x = s.x, y = s.y;
    H.shapeFlash(s, '#e8f4ff', { a: 0.3, dur: 0.5 });
    VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => { const k = e.a * (1 - p), q = easeOut(clamp(p / 0.5, 0, 1)); c.save(); c.beginPath(); flakePath(c, x, y, s.r * (0.5 + 0.7 * q), t * 0.6); c.lineCap = 'round'; c.strokeStyle = rgba('#ffffff', 0.9 * k); c.lineWidth = 2.4; c.stroke(); c.restore(); } });
    H.bang(x, y, s.r * 0.9, { n: 14, color: '#dff0ff', core: '#ffffff', ink: '#1a2c4a', dur: 0.5 });
    H.shockAt(x, y, { r: s.r * 1.5, color: C.ice, w: 8, dur: 0.55, flat: 0.8 }); H.shockAt(x, y, { r: s.r * 0.9, color: '#ffffff', w: 4, dur: 0.45, flat: 0.8, delay: 0.05 });
    iceUp(x, y, 10, { size: 1.1 }); VFX.smoke(x, y, { n: 5, color: '#e3eefa', size: 40, a: 0.6, speed: 90, r: s.r * 0.5 });
    for (const u of inside(ctx, s, 4)) { VFX.hit(u.x, u.y, C.ice, 1.7); if (isMe(u)) flinch(C.ice, 0.1, 0.22, 0.016); }
    H.shake(6);
  };

  // Circle the Prey: the track bursts all round the ring: frost thrown up along it in a wave, rings in and out
  IMP.gwRing = (tg, msg, ctx, H) => {
    const s = tg.live, Rm = (s.r + s.r2) / 2, hw = (s.r - s.r2) / 2, e = (ctx.room && ctx.room.ev && ctx.room.ev.gwring) || {}, dir = e.dir || 1, a0 = e.a0 || 0;
    H.shapeFlash(s, '#e8f4ff', { a: 0.26, dur: 0.5 });
    H.shockAt(s.x, s.y, { r: s.r * 1.04, color: '#eaf4ff', w: 10, dur: 0.6, flat: 0.8 }); H.shockAt(s.x, s.y, { r: s.r2 * 0.96, color: C.frost, w: 6, dur: 0.55, flat: 0.8, delay: 0.05 });
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = a0 + dir * i * TAU / n, x = s.x + Math.cos(a) * Rm, y = s.y + Math.sin(a) * Rm;
      H.after(i / n * 0.28, () => { snowUp(x, y, 3, { size: 1.1, up: 1.2 }); iceUp(x, y, 2, { size: 1 }); if (i % 3 === 0) VFX.pillar(x, y, { r: 16, h: 100 + rand(0, 50), color: '#eaf4ff', dur: 0.4 }); });
    }
    for (const u of inside(ctx, s, 6)) { VFX.hit(u.x, u.y, '#eaf4ff', 1.9); snowUp(u.x, u.y, 6, { size: 1 }); if (isMe(u)) flinch(C.ice, 0.1, 0.22, 0.018); }
    try { weightLand({ x: s.x, y: s.y, ring: [s.x, s.y, Rm], cracks: [{ x: s.x + Math.cos(a0) * Rm, y: s.y + Math.sin(a0) * Rm, ang: a0 + Math.PI / 2, len: 120 }, { x: s.x + Math.cos(a0 + 2.1) * Rm, y: s.y + Math.sin(a0 + 2.1) * Rm, ang: a0 + 2.1 + Math.PI / 2, len: 120 }] }, 0.5); } catch (e) { /* cosmetic */ }
    H.shake(9);
  };

  // ---------------------------------------------------------------- the slick mist (drawZones: zone tag gwRime): black ice under a turning mist, the edge of the patch ringed pale
  function zone(ctx, z, k, t) {
    const s = z.shape, r = s.r, set = clamp((t - z.start) / 0.7, 0, 1), kk = k * set, seed = Math.abs(Math.floor(s.x * 3 + s.y * 7)) % 997;
    if (kk <= 0.01) return;
    ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
    ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.clip();
    // the slick: dark ice showing through, glossy
    const g = ctx.createRadialGradient(s.x - r * 0.15, s.y - r * 0.2, 4, s.x, s.y, r);
    g.addColorStop(0, rgba('#17284a', 0.56 * kk)); g.addColorStop(0.7, rgba('#1d3258', 0.42 * kk)); g.addColorStop(1, rgba('#2a4574', 0.14 * kk));
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const y = s.y + (hash(i, seed) - 0.5) * r * 1.3, x = s.x + (hash(i, seed + 1) - 0.5) * r * 0.8, l = 26 + 44 * hash(i, seed + 2); ctx.beginPath(); ctx.moveTo(x - l / 2, y); ctx.lineTo(x + l / 2, y - 3); ctx.strokeStyle = rgba('#bcd8ff', (0.3 + 0.2 * Math.sin(t * 1.2 + i)) * kk); ctx.lineWidth = 1.6; ctx.stroke(); }
    // the mist over it, turning slowly
    for (let i = 0; i < 6; i++) { const a = t * (0.22 + 0.06 * i) * (i % 2 ? -1 : 1) + i * 1.9, rr = r * (0.3 + 0.12 * i); ctx.beginPath(); ctx.arc(s.x, s.y, rr, a, a + 1.1); ctx.strokeStyle = rgba('#eaf3fd', 0.28 * kk); ctx.lineWidth = 9 - i; ctx.stroke(); }
    for (let i = 0; i < 9; i++) { const q = (t * 0.2 + hash(i, seed + 3)) % 1, a = i * 2.4 + hash(i, seed + 4) * 3, d = r * (0.15 + 0.7 * hash(i, seed + 5)); glow(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9 - q * 18, 22 + 12 * q, '#e8f2ff', 0.28 * Math.sin(q * Math.PI) * kk); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.setLineDash([9, 8]); ctx.lineDashOffset = -t * 10; ctx.strokeStyle = rgba(C.ink, 0.3 * kk); ctx.lineWidth = 4.4; ctx.stroke();
    ctx.strokeStyle = rgba('#e6f2ff', 0.72 * kk); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------------------------------------------------------------- propfx (boss-vfx.js propFx() asks first when it is his)
  function prop(msg, H) {
    if (msg.k === 'gwmist') {
      const x = msg.x, y = msg.y;
      if (!msg.in) {
        // he goes into the mist: a cloud boiling up where he stood, thrown outward, a ring of frost under it
        VFX.smoke(x, y, { n: 10, color: '#dbe8f6', size: 56, a: 0.7, speed: 150, r: 46 });
        for (let i = 0; i < 12; i++) { const a = rand(0, TAU), sp = rand(60, 200); VFX.spawn({ x, y, z: rand(8, 40), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(20, 80), life: rand(0.9, 1.5), size: rand(30, 50), size1: rand(70, 110), color: '#e3eefa', kind: 'smoke', add: false, a: 0.45 }); }
        H.shockAt(x, y, { r: 190, color: C.ice, w: 6, dur: 0.6, flat: 0.8 });
        VFX.fx({ dur: 0.7, layer: 'ground', draw: (c, p, t, e) => { glow(c, x, y, 120 * (0.6 + 0.8 * easeOut(p)), '#e8f2ff', 0.36 * e.a * (1 - p)); } });
      } else {
        // he comes out of it: the mist drawn in from all round to the place, a held breath, and the ring as he is there
        for (let i = 0; i < 16; i++) { const a = rand(0, TAU), d = rand(120, 240); VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, z: rand(6, 36), vx: -Math.cos(a) * d / 0.6, vy: -Math.sin(a) * d * 0.7 / 0.6, life: 0.6, size: rand(36, 56), size1: 14, color: '#dfeaf8', kind: 'smoke', add: false, a: 0.5, fadeIn: 0.1 }); }
        VFX.fx({ dur: 0.6, layer: 'ground', draw: (c, p, t, e) => { for (let i = 0; i < 2; i++) { const q = clamp(p * 1.2 - i * 0.2, 0, 1), rr = 200 * (1 - q); c.beginPath(); c.arc(x, y, rr, 0, TAU); c.strokeStyle = rgba('#eaf4ff', 0.4 * e.a * Math.sin(q * Math.PI)); c.lineWidth = 3; c.stroke(); } glow(c, x, y, 90 * p, '#e8f2ff', 0.34 * e.a * p); } });
        VFX.fx({ dur: 0.05, delay: 0.6, layer: 'ground', draw() {}, done: () => { H.shockAt(x, y, { r: 150, color: '#eaf4ff', w: 6, dur: 0.5, flat: 0.8 }); VFX.smoke(x, y, { n: 4, color: '#e3eefa', size: 44, a: 0.5, speed: 90, r: 30 }); } });
      }
      return true;
    }
    if (msg.k === 'gwcancel') {
      // two mist-hounds meet: each folds into the other, two arms of mist turning in on themselves, and they are gone
      const x = msg.x, y = msg.y;
      VFX.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => {
        const k = e.a * (1 - clamp((p - 0.55) / 0.45, 0, 1)), rot = p * 7;
        c.save(); c.lineCap = 'round';
        for (let arm = 0; arm < 2; arm++) {
          c.beginPath();
          for (let i = 0; i <= 12; i++) { const s = i / 12, a = rot + arm * Math.PI + s * 3.4, rr = 40 * (1 - p * 0.85) * (1 - s * 0.8) + 3; i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); }
          c.strokeStyle = rgba('#dfeaf8', 0.5 * k); c.lineWidth = 12 * (1 - p * 0.6); c.stroke(); c.strokeStyle = rgba('#ffffff', 0.9 * k); c.lineWidth = 3; c.stroke();
        }
        glow(c, x, y, 40 * (1 - p * 0.6), C.ice, 0.4 * k);
        c.restore();
      }, done: () => { VFX.shock(x, y, { r: 80, color: '#eaf4ff', w: 3, dur: 0.4, flat: 0.8 }); VFX.motes(x, y - 8, { n: 8, color: C.snow, r: 24, rise: 1.6 }); } });
      return true;
    }
    return false;
  }

  // adds: the lesser hounds gather out of the mist and are gone into it; the shade steps out and comes apart
  function addSpawn(kind, x, y, H) {
    if (kind === 'misthound') {
      for (let i = 0; i < 7; i++) { const a = rand(0, TAU), d = rand(50, 100); VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, z: rand(4, 24), vx: -Math.cos(a) * d / 0.5, vy: -Math.sin(a) * d * 0.7 / 0.5, life: 0.5, size: rand(24, 36), size1: 10, color: '#dfeaf8', kind: 'smoke', add: false, a: 0.5, fadeIn: 0.1 }); }
      H.shockAt(x, y, { r: 80, color: C.ice, w: 4, dur: 0.45, flat: 0.8 });
      return true;
    }
    if (kind === 'gwshade') {
      H.shockAt(x, y, { r: 120, color: C.shade, w: 5, dur: 0.5, flat: 0.8 });
      VFX.smoke(x, y, { n: 5, color: '#e8e2fa', size: 40, a: 0.55, speed: 100, r: 28 }); VFX.motes(x, y - 12, { n: 8, color: C.shade, r: 30, rise: 1.6 });
      return true;
    }
    return false;
  }
  function addDeath(kind, x, y, H) {
    if (kind === 'misthound') {
      VFX.smoke(x, y, { n: 3, color: '#dfeaf8', size: 34, a: 0.5, speed: 60, r: 14 }); VFX.motes(x, y - 6, { n: 4, color: C.snow, r: 16, rise: 1.4 });
      return true;
    }
    if (kind === 'gwshade') {
      H.shockAt(x, y, { r: 130, color: C.shade, w: 5, dur: 0.55, flat: 0.8 });
      VFX.smoke(x, y, { n: 6, color: '#e8e2fa', size: 44, a: 0.55, speed: 90, r: 30 }); snowUp(x, y, 6, { size: 1 }); VFX.motes(x, y - 12, { n: 10, color: C.shade, r: 36, rise: 1.8 });
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- the enrage, the entrance, the fall
  // Cold Trail: the cold comes down over the lake and every trail on it lights (coldTrails); a chill grows over the snow and the room goes blue
  function enrage(sh, b, dur, H) {
    S.coldPend = { dur };
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'ground', draw: (c, p, t, e) => H.wash(c, '#3e66a8', e.a * 0.34 * Math.min(1, t / dur), 'multiply') }));
    H.own(sh, VFX.fx({ dur: dur + 3, layer: 'air', draw: (c, p, t, e) => {
      const q = clamp(t / dur, 0, 1), k = e.a * easeOut(clamp(t / 2, 0, 1)) * (1 - clamp((t - dur) / 2.5, 0, 1));
      c.save(); ARENA.trace(c, 2); c.clip(); ARENA.trace(c, -4); c.lineJoin = 'round';
      for (const [w, a] of [[110, 0.05], [50, 0.08], [16, 0.14], [4, 0.34]]) { c.strokeStyle = rgba('#cfe6ff', a * (0.3 + q) * k); c.lineWidth = w * (0.4 + 0.8 * q); c.stroke(); }
      c.restore();
    } }));
    [0.3, 0.55, 0.78, 0.94].forEach((f, i) => H.soon(sh, f * dur, () => { H.shockAt(b.x, b.y, { r: H.AR * 1.3, color: C.ice, w: 8 + i * 2, dur: 1.0, flat: 0.8 }); H.shake(4 + i * 2); }));
    H.emit(sh, dur + 2, 0.4, () => { const q = H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 1)[0]; if (q) VFX.spawn({ x: q.x, y: q.y, z: rand(10, 40), vz: rand(20, 60), vx: rand(-20, 20), life: rand(1.2, 2), size: rand(4, 8), size1: 1, color: '#e8f4ff', kind: 'glow', add: false, a: 0.8 }); });
  }
  function enrageLand(b, H) {
    for (let i = 0; i < 4; i++) H.shockAt(0, 0, { r: H.AR * (1.5 - i * 0.2), color: i % 2 ? '#ffffff' : C.ice, w: 16 - i * 3, dur: 0.9 + i * 0.1, flat: 0.8, delay: i * 0.1 });
    H.roomTint('#c4def8', 0.22, 1.2);   // (a cold tint, not a white-out: the no-white-out rule)
    for (const q of H.scatter({ kind: 'circle', x: 0, y: 0, r: H.AR - 40 }, 14)) VFX.flash(q.x, q.y - 10, 34, '#cfe4ff', 0.15);
    H.shake(16);
  }
  // the entrance: he comes out of the mist across the lake, head low: mist boiling where he will stand, thinning, his eyes the first thing there
  function intro(sh, b, H) {
    const hx = b.x, hy = b.y;
    H.emit(sh, 1.3, 0.55, () => { const a = rand(0, TAU), d = rand(0, 110); VFX.spawn({ x: hx + Math.cos(a) * d, y: hy + Math.sin(a) * d * 0.6, z: rand(8, 60), vx: rand(-30, 30), vy: rand(-10, 10), vz: rand(14, 50), life: rand(1.2, 2), size: rand(60, 90), size1: rand(120, 170), color: '#dfeaf8', kind: 'smoke', add: false, a: 0.5, fadeIn: 0.2 }); });
    H.soon(sh, 1.1, () => { H.shockAt(hx, hy, { r: 300, color: C.ice, w: 8, dur: 0.9, flat: 0.8 }); VFX.smoke(hx, hy, { n: 6, color: '#e3eefa', size: 60, a: 0.5, speed: 150, r: 60 }); });
    H.soon(sh, 1.9, () => { for (const s of [-1, 1]) VFX.flash(hx + 44 + s * 0, hy - 34 + s * 7, 34, '#f4f9ff', 0.4); H.shockAt(hx, hy, { r: 180, color: '#ffffff', w: 4, dur: 0.7, flat: 0.8 }); H.shake(3); });
  }
  // his fall: the mist lets go of him and rises off, the silver skeleton sinks into the snow, a ring spreading; the chain is last, left lying on the snow
  function death(sh, b, H) {
    H.soon(sh, 0.3, () => { H.shockAt(b.x, b.y + 30, { r: 280, color: C.ice, w: 9, dur: 0.9, flat: 0.8 }); H.shake(7); });
    H.emit(sh, 2.4, 0.45, () => { VFX.spawn({ x: b.x + rand(-60, 50), y: b.y + rand(-24, 34), z: rand(10, 50), vx: rand(10, 50), vy: rand(-10, 10), vz: rand(30, 90), life: rand(1.6, 2.6), size: rand(30, 50), size1: rand(80, 120), color: '#dfeaf8', kind: 'smoke', add: false, a: 0.5, fadeIn: 0.1 }); });
    H.soon(sh, 1.4, () => { H.shockAt(b.x, b.y + 40, { r: 400, color: '#eaf4ff', w: 11, dur: 1.1, flat: 0.8 }); snowUp(b.x, b.y + 30, 18, { size: 1.5, up: 1.4, speed: 1.4 }); VFX.smoke(b.x, b.y + 20, { n: 8, color: '#e6f0fb', size: 58, a: 0.5, speed: 140 }); H.shake(10); });
    H.soon(sh, 2.7, () => { for (const s of [-1, 1]) VFX.flash(b.x + 44, b.y + 14 + s * 7, 34, '#f4f9ff', 0.3); });   // (the moons go out last of him)
    const cx = b.x + 36, cy = b.y + 34;
    VFX.fx({ dur: 15, delay: 2.2, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.9) * Math.min(1, (15 - t) / 3.5);
      c.save(); c.translate(cx, cy); c.rotate(0.35);
      for (let i = 0; i < 13; i++) {
        const a = i * 0.46, x = -34 + i * 6 + Math.sin(a) * 4, y = Math.sin(a * 1.3) * 13 + i * 0.6;
        ellipse(c, x + 1.5, y + 2.5, 6.4, 3.4, a, rgba('#0b1830', 0.28 * k));
        ellipse(c, x, y, 6.2, 3.3, a, null, rgba('#dfe8f2', 0.95 * k), 2.2); ellipse(c, x, y, 6.2, 3.3, a, null, rgba('#6f8099', 0.55 * k), 0.8);
      }
      glow(c, 36, 0, 22, C.ice, 0.14 * k);
      c.restore();
    } });
  }

  return {
    tell: tag => TELLS[tag] || null, buster, zone, floor, under, aftermath, prop, addSpawn, addDeath, enrage, enrageLand, intro, death,
    // (boss-vfx.js impact(): his moves land here; a tag it does not know falls through to the shared ones)
    impact(tg, msg, ctx, H) {
      const f = tg.type === 'buster' ? IMP.buster : IMP[tg.tag]; if (!f) return false;
      f(tg, msg, ctx, H); return true;
    },
    // (room events: ArenaView.roomEvent, wrapped below, hands every gwpath over)
    roomEvent(room, msg) {
      if (S.room !== room) return;
      if (typeof msg.k === 'string' && msg.k.startsWith('gwpath:') && room.ev[msg.k]) S.paths.push(room.ev[msg.k]);
    },
    S,
  };
})();

// the room hooks: ArenaView's drawRoomUnder (every hero's prints and the room's moments, under the units and the warnings) and roomEvent (the lines of the runs),
// wrapped from here the way grubnak-fx.js and hydra-view.js do
if (typeof ArenaView !== 'undefined') {
  const baseUnder = ArenaView.drawRoomUnder, baseEvent = ArenaView.roomEvent;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    baseUnder.call(this, ctx, room, t, v);
    if (!room || !room.ev) return;
    try { GW_FX.under(ctx, room, t, v); } catch (e) { try { ctx.restore(); } catch (e2) { /* cosmetic */ } }
  };
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = baseEvent.call(this, room, msg, now, ...rest);
    try { if (msg && typeof msg.k === 'string' && msg.k.indexOf('gwpath:') === 0) GW_FX.roomEvent(room, msg); } catch (e) { /* cosmetic */ }
    return r;
  };
}
