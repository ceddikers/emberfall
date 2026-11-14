// Maelis Orne, the Pale Regent: her fight made real in the running game. Loaded after maelis-room.js and arena-view.js.
// maelis.js (the script) sends room events and telegraphs (the CONTRACT block at the top of that file); maelis-art.js draws her and her crown, maelis-room.js the
// moon's floor and the dark of the wall. This file reads the events and the client's own positions and draws what lies between them:
//   the cuts      a `lune` telegraph is the same outline and wash as every other shape (ArenaView.grown knows it, SHAPES.trace draws it); in a dance the cut landing next is the
//                 full telegraph and the one laid after it only a thin outline, so the turn reads without a second red wash
//   the crown     her crown is the tell; it is small at game zoom, so the same state is shown a second time, larger, on the dust at her feet (the crown's light cast on the
//                 floor: lit part silver, the same phase, the same turn). Never red, never a label or an arrow, never a painted safe spot
//   the dust      every hero's steps are kept here (the host sends none) and laid as faint prints; a scented hero's last six seconds (head mark mlprey / mlfresh) are lit, and a
//                 locked ride (`mlpath:<n>`, Garrow's trail rule) is drawn once as one red corridor with the walked prints lighting inside it, shrinking from behind as each
//                 piece lands; the host's pieces of it (tags mlRun / mlRide) draw nothing of their own while the corridor is up
//   the wall      the room's dimming is in maelis-room.js, under everything; the silver lines of the sword dance (`mlstep`) are drawn here, over it, as bright as ever
//   moonlets      the prop kind 'moonlet' is a small moon lying on the dust; it brightens as its burst nears
//   her swings    banim / mldance times set her swings (the cast's own swing is main.js); the Hound's road turns her head (mlLook)
//   the cast bar  the big cast box (#boss-cast) sits mid-screen, which is over her crown; in this fight, and only while the player has not put it somewhere themselves, it is
//                 docked clear of her and of the HUD, and released when the raid ends
// Everything is read from room events (stored in room.ev, replayed with their age on a rejoin), room props, head marks and the heroes' positions, so a rejoiner sees the crown,
// the form, the dark, the moonlets and a ride in progress. Hooks (one line each): main.js (banim, frame, release), arena-view.js (grown), index.html.
// Not sent that this wanted: the moonlets' list comes from the props (the room event mlmoonlet is long, so a snapshot replays only the latest); the Hound's body on the road
// (it is the corridor's bright head only: there is no add to draw).

const ML_VIEW = (() => {
  const TAU = Math.PI * 2;
  const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = q => { q = clampv(q, 0, 1); return q * q * (3 - 2 * q); };
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const danger = () => (typeof BossTells !== 'undefined' && BossTells.COL ? BossTells.COL.danger : '#ff3b2f');
  const isMoon = () => typeof ArenaView !== 'undefined' && ArenaView.amb && ArenaView.amb.kind === 'moon';

  const S = {
    room: null, lastT: -1, raid: null, heroes: new Map(), pos: new Map(), cuts: [], steps: new Map(), paths: [], swings: [], moons: new Map(), bursts: new Map(),
    cprev: null, ccur: null, cKey: '', c2: null, lib: null, touch: [], rideAt: -99, lookAt: 0, look: 0, units: [],
  };
  function bind(room, t) {
    if (room === S.room && t >= S.lastT - 1) return;
    S.room = room; S.heroes.clear(); S.pos.clear(); S.cuts.length = 0; S.steps.clear(); S.paths.length = 0; S.swings.length = 0; S.moons.clear(); S.bursts.clear();
    S.cprev = S.ccur = null; S.cKey = ''; S.c2 = null; S.lib = null; S.touch.length = 0; S.rideAt = -99; S.lookAt = 0; S.lastT = t;
    if (room && room.ev) for (const k in room.ev) if (k.startsWith('mlpath:')) S.paths.push(room.ev[k]);
  }

  // ------------------------------------------------------------------------------------------------ room events
  function onRoom(room, msg, now) {
    if (typeof msg.k !== 'string' || !msg.k.startsWith('ml')) return;
    bind(room, now);
    switch (msg.k) {
      case 'mlcut':
        S.cuts.push({ ph: msg.ph, turn: msg.turn || 0, umb: msg.umb ? 1 : 0, wax: msg.wax, kd: msg.kd, n: msg.n, of: msg.of, who: msg.who, t0: now, land: now + (msg.at || 0) });
        while (S.cuts.length > 12) S.cuts.shift();
        break;
      case 'mldance': {
        // her swings: one at every landing time (a swing's blow is at the middle of its action, so each starts half its length before the cut lands)
        const L = (msg.lands || []).map(l => now + l);
        L.forEach((land, i) => { const gap = i ? land - L[i - 1] : 1.6, dur = clampv(gap * 0.95, 0.7, 1.3); S.swings.push({ t0: land - 0.5 * dur, dur }); });
        S.swings.sort((a, b) => a.t0 - b.t0);
        break;
      }
      case 'mlstep': S.steps.set(msg.i, { i: msg.i, who: msg.who, x1: msg.x1, y1: msg.y1, x2: msg.x2, y2: msg.y2, t0: now, lock: now + (msg.lock || 1.4), land: now + (msg.at || 3), end: now + (msg.dur || 4), fin: null });
        if (S.steps.size > 8) S.steps.delete(S.steps.keys().next().value);
        break;
      case 'mlstepl': { const st = S.steps.get(msg.i); if (st) st.fin = { x1: msg.x1, y1: msg.y1, x2: msg.x2, y2: msg.y2, t0: now, landD: now + (msg.at || 0) }; break; }
      case 'mlmoonlet': S.moons.set(msg.id, { x: msg.x, y: msg.y, t0: now }); break;
      case 'mlmoonx': S.moons.delete(msg.id); S.bursts.delete(msg.id); break;
      case 'mlburst': S.bursts.set(msg.id, { at: now + (msg.at || 0), r: msg.r || 150, twice: msg.twice ? 1 : 0 }); break;
      case 'mllibrate': S.lib = { from: msg.from || 0, to: msg.to || 0, dir: msg.dir < 0 ? -1 : 1, t0: now, dur: 0.8 }; break;   // (Libration: the crown rocks a quarter-turn and stops; the reading on the dust turns with it)
      case 'mltouch': S.touch.push({ ids: msg.ids || [], from: now + (msg.at || 0), end: now + (msg.at || 0) + (msg.life || 20) }); while (S.touch.length > 4) S.touch.shift(); break;
      default:
        if (msg.k.startsWith('mlpath:') && room.ev[msg.k]) {
          S.paths.push(room.ev[msg.k]);
          if (msg.kd === 'return' && msg.l && msg.l.length) { S.look = { x: msg.l[0][0], y: msg.l[0][1] }; S.lookAt = now + (msg.at || 0) + 1.5; }   // (she looks down the road he comes by)
        }
    }
  }

  // ------------------------------------------------------------------------------------------------ banim and the per-frame set
  const cap = n => n[0].toUpperCase() + n.slice(1);
  // the poses that are not casts (the casts take theirs from boss-vfx.js CAST_POSE) and the swing each takes
  function banim(raid, msg, now, st) {
    const n = msg.name;
    if (typeof ML_ART === 'undefined' || !ML_ART.POSES.includes(n) || n === 'rest') return;
    if (n === 'cut') return;   // (a single cut's swing is the cast's own; a dance's swings are set from mldance; a pass's from 'ride')
    const hold = { intro: 1.6, death: 6, mount: 0.4, dash: 0.3 }[n] ?? 0.3;
    const k = 'ml' + cap(n); raid.props[k] = true; raid.propsUntil[k] = now + (msg.dur || 0.5) + hold;
    if (n === 'dash') st.action = { type: 'attack', t0: now, dur: 0.9 };   // (the dash lands about 0.3 s after the message)
    else if (n === 'ride') {
      if (now - S.rideAt > 4) { S.rideAt = now; st.action = { type: 'attack', t0: now - 0.1, dur: 0.9 }; }   // (the cut at the middle of a pass lands half a second in)
      else st.action = { type: 'attack', t0: now - 0.3, dur: 1.0 };   // (the pounce that ends it)
    }
  }
  // once a frame (main.js): the dance's swings come due, the head turns down the Hound's road, and the dust is read
  function frame(raid, now, entById) {
    S.raid = raid;
    const st = raid.bossDraw && raid.bossDraw.st; if (!st) return;
    while (S.swings.length && now >= S.swings[0].t0) { const sw = S.swings.shift(); if (now < sw.t0 + sw.dur) st.action = { type: 'attack', t0: sw.t0, dur: sw.dur }; }
    if (S.lookAt > now && S.look && raid.props) { const b = raid.bossDraw; raid.props.mlLook = Math.atan2(S.look.y - b.y, S.look.x - b.x); raid.propsUntil.mlLook = now + 0.2; }
  }

  // ------------------------------------------------------------------------------------------------ the dust: every hero's steps, kept here
  const PS = 3, CAPN = 140, STRIDE = 34, F = 8;   // sprite pixels to a world unit; a print per 34 px of walking, 140 to a hero, each: x y angle t _ side
  const SPR = {};
  const mkc = (w, h, draw) => { if (typeof document === 'undefined') return null; const cv = document.createElement('canvas'); cv.width = w * PS; cv.height = h * PS; draw(cv.getContext('2d'), cv.width / 2, cv.height / 2); return cv; };
  function bootPath(c, cx, cy) {
    c.beginPath(); c.ellipse(cx + 3.6 * PS, cy, 5.4 * PS, 3.7 * PS, 0, 0, TAU);
    c.moveTo(cx - 5.2 * PS + 3.4 * PS, cy); c.ellipse(cx - 5.2 * PS, cy, 3.4 * PS, 2.8 * PS, 0, 0, TAU);
  }
  function sprite(name) {
    if (SPR[name] !== undefined) return SPR[name];
    SPR[name] = mkc(24, 14, (c, cx, cy) => {
      if (name === 'dent') {   // a step in fine dust: a soft dark dish with a pale lip on the side the world's light comes from
        c.save(); c.translate(0.9 * PS, 1.1 * PS); bootPath(c, cx, cy); c.fillStyle = 'rgba(244,248,255,0.55)'; c.fill(); c.restore();
        bootPath(c, cx, cy); c.fillStyle = 'rgba(46,56,86,0.9)'; c.fill();
        c.save(); c.translate(cx, cy); c.scale(0.7, 0.7); c.translate(-cx - 0.5 * PS, -cy - 0.6 * PS); bootPath(c, cx, cy); c.fillStyle = 'rgba(22,30,58,0.5)'; c.fill(); c.restore();
      } else {         // lit: the same step lit from inside, cold silver with a frost blue glow
        c.save(); c.shadowColor = 'rgba(150,200,255,0.95)'; c.shadowBlur = 2.6 * PS; bootPath(c, cx, cy); c.fillStyle = '#f6fbff'; c.fill(); c.restore();
        bootPath(c, cx, cy); c.lineWidth = 1.0 * PS; c.strokeStyle = 'rgba(56,96,168,0.9)'; c.stroke();
        c.save(); c.translate(cx, cy); c.scale(0.7, 0.7); c.translate(-cx + 0.5 * PS, -cy + 0.6 * PS); bootPath(c, cx, cy); c.fillStyle = 'rgba(255,255,255,0.95)'; c.fill(); c.restore();
      }
    });
    return SPR[name];
  }
  function blit(c, cv, x, y, ang, a, sc = 1) {
    if (!cv || a <= 0.01) return;
    c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(ang); if (sc !== 1) c.scale(sc, sc); c.drawImage(cv, -cv.width / 2 / PS, -cv.height / 2 / PS, cv.width / PS, cv.height / PS); c.restore();
  }
  const newTrail = () => ({ buf: new Float32Array(CAPN * F), n: 0, head: 0, lx: 0, ly: 0, has: false, side: 1 });
  function addPrint(h, x, y, ang, t) {
    const o = h.head * F, b = h.buf;
    b[o] = x - Math.sin(ang) * h.side * 5.4; b[o + 1] = y + Math.cos(ang) * h.side * 5.4; b[o + 2] = ang; b[o + 3] = t; b[o + 5] = h.side;
    h.head = (h.head + 1) % CAPN; if (h.n < CAPN) h.n++; h.side = -h.side;
  }
  function trackUnits(units, t) {
    for (const u of units || []) {
      S.pos.set(u.id, u);
      let h = S.heroes.get(u.id); if (!h) S.heroes.set(u.id, h = newTrail());
      if (!h.has) { h.lx = u.x; h.ly = u.y; h.has = true; continue; }
      const dx = u.x - h.lx, dy = u.y - h.ly, d = Math.hypot(dx, dy);
      if (d > 360) { h.lx = u.x; h.ly = u.y; continue; }   // (thrown or dashed across the room: no steps in between)
      if (d < STRIDE) continue;
      const ang = Math.atan2(dy, dx), steps = Math.min(8, Math.floor(d / STRIDE));
      for (let i = 1; i <= steps; i++) addPrint(h, h.lx + dx * (i * STRIDE) / d, h.ly + dy * (i * STRIDE) / d, ang, t - (steps - i) * 0.04);
      h.lx += dx * (steps * STRIDE) / d; h.ly += dy * (steps * STRIDE) / d;
    }
  }
  const slot = (h, k) => ((h.head - h.n + k) % CAPN + CAPN) % CAPN * F;
  // the hero a mark names: the Hunt's Pass prey (mlprey) and the Hound's road (mlfresh); read from the raid's head marks
  function scented(t) {
    const out = new Set(), r = S.raid; if (!r || !r.hmarks) return out;
    for (const m of r.hmarks.values()) if ((m.key === 'mlprey' || m.key === 'mlfresh') && t < m.end) out.add(m.pid);
    return out;
  }
  // prints: every hero's faint (a few seconds, fading); a scented hero's last six seconds lit
  function drawPrints(c, t) {
    const dent = sprite('dent'), lit = sprite('lit'), prey = scented(t), LIFE = 9, FADE = 3.5, SPAN = 6;
    for (const [id, h] of S.heroes) {
      const isPrey = prey.has(id);
      for (let k = 0; k < h.n; k++) {
        const o = slot(h, k), b = h.buf, age = t - b[o + 3];
        if (age > LIFE || age < -0.5) continue;
        const f = 1 - clampv((age - FADE) / (LIFE - FADE), 0, 1);
        if (isPrey && age < SPAN) { blit(c, dent, b[o], b[o + 1], b[o + 2], 0.4 * f); blit(c, lit, b[o], b[o + 1], b[o + 2], 0.95 * clampv((SPAN - age) / 0.8, 0, 1) + 0.0); }
        else blit(c, dent, b[o], b[o + 1], b[o + 2], 0.34 * f);
      }
    }
  }

  // ------------------------------------------------------------------------------------------------ the crown on the dust
  const PHASES = ['new', 'crescent', 'half', 'gibbous', 'full'];
  const wrapA = a => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
  const crownOf = e => (e ? { ph: PHASES.includes(e.phase) ? e.phase : 'new', turn: +e.turn || 0, wax: e.wax < 0 ? -1 : 1, um: e.umbral ? 1 : 0, red: clampv(+e.red || 0, 0, 1), ring: e.ring ? 1 : 0, on: e.on == null ? 1 : e.on ? 1 : 0 } : null);
  // the crown as the room sends it (mlcrown), cross-faded when its phase changes; a Libration turn (the same cut, a quarter further round) is not cross-faded but turned, see turnOf
  function crownNow(room, t) {
    const e = room && room.ev && room.ev.mlcrown, c = crownOf(e) || { ph: 'new', turn: 0, wax: 1, um: 0, red: 0, ring: 0, on: 1 };
    const key = [c.ph, c.um, c.ring].join(), cur = S.ccur;
    if (!cur || key !== S.cKey) { S.cKey = key; S.cprev = cur; S.ccur = Object.assign(c, { t0: e && cur ? t : -99 }); }
    else { cur.turn = c.turn; cur.red = c.red; cur.wax = c.wax; }
    return S.ccur;
  }
  // the turn shown: the crown's own, except for the second after Libration has turned it (then it swings round the way the event says, as the crown on her does)
  function turnOf(c, t) {
    const L = S.lib;
    if (!L || t < L.t0 || t >= L.t0 + L.dur || c.ph === 'new') return c.turn;
    let d = wrapA(L.to - L.from); if (L.dir > 0 && d < 0) d += TAU; else if (L.dir < 0 && d > 0) d -= TAU;
    return L.from + d * smooth((t - L.t0) / L.dur);
  }
  // one reading of the crown, drawn at (x, y) with radius r: the same lune the floor will paint, lit part silver (the dark side a faint pool)
  function litDisc(ctx, c, x, y, r, a, t, o = {}) {
    if (a < 0.01) return;
    const red = c.red > 0.02;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = rgba('#0a1226', 0.26 * a); ctx.fill();
    if (o.ghost) ctx.setLineDash([5, 6]);
    ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(red ? '#8a3a48' : '#dfe9f5', 0.34 * a); ctx.stroke(); ctx.setLineDash([]);
    const turn = turnOf(c, t);
    if (c.ph !== 'new') {
      const s = c.ring ? { kind: 'donut', x, y, r: r * 440 / 560, r2: r * 200 / 560 } : { kind: 'lune', x, y, r, ph: c.ph, angle: turn };
      SHAPES.trace(ctx, s);
      ctx.fillStyle = rgba('#eef5ff', 0.58 * a); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#bcd8ff', 0.14 * a); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#ffffff', 0.9 * a); ctx.lineWidth = 1.6; ctx.stroke();
      if (c.um && !c.ring) {   // the dark of the crown is what strikes: its limb is laid in the crown's own dark red
        ctx.beginPath(); ctx.arc(x, y, r, turn + Math.PI - 1.15, turn + Math.PI + 1.15); ctx.strokeStyle = rgba('#8a1e2c', 0.75 * a); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      }
    }
    if (red) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = rgba('#5a0a14', 0.3 * c.red * a); ctx.fill(); }
    ctx.restore();
  }
  function crownLight(ctx, room, bd, t) {
    const c = crownNow(room, t); if (!c) return;
    const form2 = room.ev && room.ev.mlform && room.ev.mlform.n === 2, k = form2 ? 1.2 : 1;
    const c2 = crownOf(room.ev && room.ev.mlcrown2), two = !!(c2 && c2.on);   // (Hard, Two Crowns: her reflection in the dust shows a second crown; both are drawn, side by side before her)
    const y = bd.y + 128 * k, r = (two ? 66 : 86) * k, dx = two ? 80 * k : 0;
    const q = c.t0 < 0 ? 1 : smooth((t - c.t0) / 0.25);
    const rest = c.ph === 'new' && c.red < 0.02 ? 0.5 : 1;   // (at rest only a quiet ring)
    if (S.cprev && q < 1) litDisc(ctx, S.cprev, bd.x - dx, y, r, (1 - q) * rest, t);
    litDisc(ctx, c, bd.x - dx, y, r, q * rest, t);
    if (two) litDisc(ctx, c2, bd.x + dx, y, r, 1, t, { ghost: true });
  }
  // Moon-Touched (Extreme): the heroes whose marks invert the cuts wear a quiet pale ring at their feet for as long as it holds (the head mark itself is the shared one)
  function touchedRings(ctx, t) {
    for (let i = S.touch.length - 1; i >= 0; i--) if (t > S.touch[i].end + 1) S.touch.splice(i, 1);
    for (const T of S.touch) {
      if (t < T.from || t > T.end + 1) continue;
      const k = smooth((t - T.from) / 0.4) * (1 - smooth((t - T.end) / 0.8)), pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      for (const id of T.ids) {
        const u = S.pos.get(id); if (!u) continue;
        ctx.save(); ctx.beginPath(); ctx.ellipse(u.x, u.y + 10, 56, 35, 0, 0, TAU);
        ctx.strokeStyle = rgba('#05070d', 0.35 * k); ctx.lineWidth = 5; ctx.stroke();
        ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = rgba('#f2c9a0', (0.7 + 0.25 * pulse) * k); ctx.lineWidth = 2.2; ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------------------------------------------------ the corridor of a ride (Garrow's trail rule)
  const KD = { return: ['mlRun'], pass: ['mlRun'], ride: ['mlRide'], shade: ['mlShade'] };
  function prep(ev) {
    if (ev._ml) return ev._ml;
    const l = ev.l || [], cum = [0];
    for (let i = 1; i < l.length; i++) cum.push(cum[i - 1] + Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]));
    const B = [];
    for (let i = 1; i < l.length; i++) {
      const sl = cum[i] - cum[i - 1]; if (sl < 6) continue;
      for (let u0 = 0; u0 < sl - 1;) { const u = Math.min(sl, u0 + 280); B.push(cum[i - 1] + u); u0 = u; }
      if (i < l.length - 1) B.push(cum[i]);
    }
    B.sort((a, b) => a - b);
    return (ev._ml = { l, cum, L: cum[cum.length - 1] || 0, w: ev.w || 110, sp: ev.sp || 820, begin: ev.start + (ev.at || 0), B, lit: null, kd: ev.kd || 'pass' });
  }
  function atDist(P, d) {
    const l = P.l; if (l.length < 2) return { x: l[0] ? l[0][0] : 0, y: l[0] ? l[0][1] : 0, a: 0, i: 1 };
    d = clampv(d, 0, P.L); let i = 1; while (i < l.length - 1 && P.cum[i] < d) i++;
    const a = l[i - 1], b = l[i], seg = (P.cum[i] - P.cum[i - 1]) || 1, u = (d - P.cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, a: Math.atan2(b[1] - a[1], b[0] - a[0]), i };
  }
  const SX = new Float64Array(64), SY = new Float64Array(64), UX = new Float64Array(64), UY = new Float64Array(64);
  function sub(P, d0, d1) {
    let n = 0; const l = P.l;
    d0 = clampv(d0, 0, P.L); d1 = clampv(d1, 0, P.L);
    if (d1 - d0 < 0.5 || l.length < 2) return 0;
    const q0 = atDist(P, d0); SX[n] = q0.x; SY[n++] = q0.y;
    for (let i = 1; i < l.length - 1 && n < 62; i++) if (P.cum[i] > d0 + 0.5 && P.cum[i] < d1 - 0.5) { SX[n] = l[i][0]; SY[n++] = l[i][1]; }
    const q1 = atDist(P, d1); SX[n] = q1.x; SY[n++] = q1.y;
    return n;
  }
  function traceSub(c, P, d0, d1) { const n = sub(P, d0, d1); if (n < 2) return 0; c.moveTo(SX[0], SY[0]); for (let i = 1; i < n; i++) c.lineTo(SX[i], SY[i]); return n; }
  // the outline of the corridor round a line as ONE shape (both long edges, a round corner outside each turn, inside edges trimmed where they cross, a line across each end)
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
      const a0 = Math.atan2(-T.inner * ux[i - 1], T.inner * uy[i - 1]), th = Math.atan2(T.cr, T.dt);
      c.moveTo(SX[i] + Math.cos(a0) * h, SY[i] + Math.sin(a0) * h); c.arc(SX[i], SY[i], h, a0, a0 + th, th < 0);
    }
    if (caps) {
      c.moveTo(SX[0] + uy[0] * h, SY[0] - ux[0] * h); c.lineTo(SX[0] - uy[0] * h, SY[0] + ux[0] * h);
      c.moveTo(SX[n - 1] + uy[m - 1] * h, SY[n - 1] - ux[m - 1] * h); c.lineTo(SX[n - 1] - uy[m - 1] * h, SY[n - 1] + ux[m - 1] * h);
    }
  }
  // the prints of the walked line that light, oldest step to newest: found once, from what this client kept (a rejoiner kept none: the line is lit with a trail of its own)
  function initLit(ev, P) {
    const xs = [], ys = [], as = [], us = [], ds = [], l = P.l;
    const near = (x, y) => {
      let best = 1e9, bd = 0;
      for (let i = 1; i < l.length; i++) {
        const ax = l[i - 1][0], ay = l[i - 1][1], dx = l[i][0] - ax, dy = l[i][1] - ay, l2 = dx * dx + dy * dy, u = l2 ? clampv(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0, d = Math.hypot(x - ax - dx * u, y - ay - dy * u);
        if (d < best) { best = d; bd = P.cum[i - 1] + Math.sqrt(l2) * u; }
      }
      return { d: best, along: bd };
    };
    if (l.length > 1) for (const [id, h] of S.heroes) {
      if (ev.who != null && id !== ev.who) continue;
      for (let k = 0; k < h.n; k++) {
        const o = slot(h, k), b = h.buf; if (b[o + 3] > ev.start + 0.1) continue;
        const q = near(b[o], b[o + 1]); if (q.d > 30) continue;
        xs.push(b[o]); ys.push(b[o + 1]); as.push(b[o + 2]); ds.push(q.along); us.push(q.along / (P.L || 1));
      }
    }
    if (xs.length < Math.max(2, P.L / 90)) {
      xs.length = ys.length = as.length = us.length = ds.length = 0;
      for (let d = 12, s = 1; d < P.L - 6; d += STRIDE, s = -s) { const q = atDist(P, d); xs.push(q.x - Math.sin(q.a) * s * 5.4); ys.push(q.y + Math.cos(q.a) * s * 5.4); as.push(q.a); ds.push(d); us.push(d / (P.L || 1)); }
    }
    return (P.lit = { xs, ys, as, us, ds });
  }
  function litPrints(c, ev, t) {
    const P = prep(ev); if (t < ev.start || t > ev.end + 1.2) return;
    const lit = P.lit || initLit(ev, P), spr = sprite('lit');
    for (let j = 0; j < lit.xs.length; j++) {
      const tl = ev.start + lit.us[j] * 0.55, pass = P.begin + lit.ds[j] / P.sp, a = clampv((t - tl) / 0.14, 0, 1) * (1 - clampv((t - pass) / 1.1, 0, 1));
      if (a > 0.02) blit(c, spr, lit.xs[j], lit.ys[j], lit.as[j], 0.97 * a);
    }
  }
  const KC = { return: { hi: '#f4faff', glow: '#9fd0ff' }, pass: { hi: '#f4faff', glow: '#9fd0ff' }, ride: { hi: '#e6f2ff', glow: '#a8c8ec' }, shade: { hi: '#f1edff', glow: '#b9a8e8' } };   // (the shade is Garrow's: his own lilac)
  // the red corridor: one wash, one rim, what the rider has landed on cut away behind the front; inside it the walked line lit
  function corridor(c, ev, t) {
    const P = prep(ev); if (P.L < 8 || t < ev.start) return;
    const head = (t - P.begin) * P.sp;
    let Sd = 0, nb = P.L; for (const b of P.B) { if (b <= head + 0.01) Sd = b; else { nb = b; break; } }
    const tail = clampv(1 - (t - (P.begin + P.L / P.sp)) / 0.25, 0, 1);
    if (Sd >= P.L - 0.5 && tail <= 0) return;
    const kIn = clampv((t - ev.start) / 0.25, 0, 1), k = kIn * (Sd >= P.L - 0.5 ? tail : 1), col = danger(), hw = P.w / 2;
    const left = head < 0 ? 9 : (nb - head) / P.sp, late = clampv(1 - left / 0.6, 0, 1), kd = P.kd, cc = KC[kd] || KC.pass, d0 = Sd >= P.L - 0.5 ? P.L - 8 : Sd;
    c.save(); c.lineCap = 'butt'; c.lineJoin = 'round';
    c.beginPath(); traceSub(c, P, d0, P.L); c.strokeStyle = rgba(col, (kd === 'ride' ? 0.2 : 0.23) * k); c.lineWidth = P.w; c.stroke();
    if (late > 0.02) { c.globalCompositeOperation = 'lighter'; c.beginPath(); traceSub(c, P, d0, Math.min(P.L, nb)); c.strokeStyle = rgba(col, 0.16 * late * k); c.lineWidth = P.w; c.stroke(); c.globalCompositeOperation = 'source-over'; }
    c.beginPath(); corridorEdges(c, P, hw, d0, P.L);
    c.setLineDash([12, 10]); c.lineDashOffset = -t * 24; c.strokeStyle = rgba(col, 0.28 * k); c.lineWidth = 6; c.stroke(); c.setLineDash([]);
    c.strokeStyle = rgba(col, (0.55 + 0.4 * late) * k); c.lineWidth = 2 + late * 1.5; c.stroke();
    // inside it: the line of steps (lit from the oldest to the newest) and chevrons running the way she goes
    const lit = clampv((t - ev.start) / 0.55, 0, 1) * P.L;
    if (lit > d0 + 1) {
      c.lineCap = 'round';
      c.beginPath(); traceSub(c, P, d0, lit); c.strokeStyle = rgba('#0b1626', 0.22 * k); c.lineWidth = 6.5; c.stroke();
      c.strokeStyle = rgba(cc.glow, 0.2 * k); c.lineWidth = 13; c.stroke();
      if (kd === 'ride') c.setLineDash([14, 10]);
      c.strokeStyle = rgba(cc.hi, 0.9 * k); c.lineWidth = 2.6; c.stroke(); c.setLineDash([]);
      const off = (t * (kd === 'ride' ? 200 : 150)) % 90;
      c.beginPath();
      for (let d = Math.max(d0, 0) + off; d < lit; d += 90) { const q = atDist(P, d), ca = Math.cos(q.a), sa = Math.sin(q.a); c.moveTo(q.x - ca * 9 - sa * 8, q.y - sa * 9 + ca * 8); c.lineTo(q.x + ca * 3, q.y + sa * 3); c.lineTo(q.x - ca * 9 + sa * 8, q.y - sa * 9 - ca * 8); }
      c.strokeStyle = rgba(cc.hi, 0.6 * k); c.lineWidth = 2.2; c.stroke();
    }
    c.restore();
  }
  // the dust she leaves: a pale disturbed band along the line behind the rider, fading over some seconds
  function furrow(c, ev, t) {
    const P = prep(ev); if (P.L < 8 || P.kd === 'ride') return;
    const runEnd = P.begin + P.L / P.sp, head = Math.min(P.L, (t - P.begin) * P.sp);
    if (head < 8) return;
    const k = 1 - clampv((t - runEnd - 1.2) / 4.5, 0, 1); if (k <= 0.01) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); traceSub(c, P, 0, head);
    c.strokeStyle = rgba('#e8f0ff', 0.09 * k); c.lineWidth = 48; c.stroke();
    c.strokeStyle = rgba('#3a4666', 0.16 * k); c.lineWidth = 20; c.stroke();
    c.beginPath(); corridorEdges(c, P, 24, 0, head, false); c.strokeStyle = rgba('#f4f8ff', 0.4 * k); c.lineWidth = 3; c.stroke();
    c.restore();
  }
  // the rider on the run: a ribbon of pale dust and light behind the head of the corridor
  function runHead(c, ev, t) {
    const P = prep(ev); if (P.L < 8) return;
    const head = (t - P.begin) * P.sp; if (head < 0 || head > P.L + 40) return;
    const hd = Math.min(P.L, head), q = atDist(P, hd), big = P.kd === 'return' ? 1 : 0.7;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 6; i++) {
      const d1 = hd - i * 40, d0 = d1 - 44; if (d1 < 2) break;
      const f = 1 - i / 6; c.beginPath(); traceSub(c, P, Math.max(0, d0), d1);
      c.strokeStyle = rgba('#dfeaff', 0.1 * f * big); c.lineWidth = 70 * (0.5 + 0.5 * f) * big; c.stroke();
      c.strokeStyle = rgba('#ffffff', 0.2 * f * big); c.lineWidth = 26 * (0.4 + 0.6 * f) * big; c.stroke();
    }
    c.restore();
    if (head < P.L) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, q.x, q.y, 70 * big, '#bcd8ff', 0.3); glow(c, q.x, q.y, 26 * big, '#ffffff', 0.5); c.restore(); }
  }
  // does this client hold the line a piece of a ride belongs to? Then the corridor is drawn once, from the line
  function pathFor(tg) {
    const tags = tg.tag === 'mlRun' ? ['return', 'pass'] : tg.tag === 'mlRide' ? ['ride'] : tg.tag === 'mlShade' ? ['shade'] : null; if (!tags) return null;
    for (let i = S.paths.length - 1; i >= 0; i--) { const e = S.paths[i]; if (Math.abs(e.start - tg.start) < 0.45 && tags.includes(e.kd || 'pass')) return e; }
    return null;
  }

  // ------------------------------------------------------------------------------------------------ the sword dance of the wall: the silver lines
  function silverLines(c, t, v) {
    for (const st of S.steps.values()) {
      if (t < st.t0 || t > st.end + 0.4) continue;
      let x1 = st.x1, y1 = st.y1, x2 = st.x2, y2 = st.y2, locked = false;
      const u = S.pos.get(st.who);
      if (t < st.lock && u) { x2 = u.x; y2 = u.y; }   // (it follows its hero until it locks)
      else if (st.fin) { x1 = st.fin.x1; y1 = st.fin.y1; x2 = st.fin.x2; y2 = st.fin.y2; locked = true; }
      else locked = t >= st.lock;
      const kIn = smooth((t - st.t0) / 0.3), kOut = 1 - smooth((t - st.land) / 0.35), k = kIn * kOut; if (k < 0.01) continue;
      const flash = locked ? Math.max(0, 1 - (t - st.lock) / 0.4) : 0;
      c.save(); c.lineCap = 'round';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
      c.strokeStyle = rgba('#7fb4ff', 0.28 * k); c.lineWidth = 12; c.stroke();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba('#cfe4ff', (0.5 + 0.4 * flash) * k); c.lineWidth = 6; c.stroke();
      c.globalCompositeOperation = 'source-over';
      if (!locked) { c.setLineDash([16, 9]); c.lineDashOffset = -t * 60; }
      c.strokeStyle = rgba('#ffffff', k); c.lineWidth = 3; c.stroke(); c.setLineDash([]);
      // the end on the hero: a small ring that closes as it locks
      const rr = locked ? 22 : 22 + 16 * clampv((st.lock - t) / Math.max(0.2, st.lock - st.t0), 0, 1);
      c.beginPath(); c.arc(x2, y2, rr, 0, TAU); c.strokeStyle = rgba('#05070d', 0.5 * k); c.lineWidth = 5; c.stroke(); c.strokeStyle = rgba('#f4f9ff', 0.95 * k); c.lineWidth = 2.6; c.stroke();
      c.globalCompositeOperation = 'lighter'; glow(c, x1, y1, 26, '#cfe4ff', 0.3 * k); glow(c, x2, y2, 22 + 14 * flash, '#e8f2ff', (0.3 + 0.4 * flash) * k);
      c.restore();
    }
  }

  // ------------------------------------------------------------------------------------------------ the moonlets (the prop kind 'moonlet': a small moon lying on the dust)
  function drawMoonlet(ctx, pr, t) {
    const r = 27, bob = Math.sin(t * 1.4 + (pr.id || 0)) * 2, x = pr.x, y = pr.y - 20 + bob;
    const b = S.bursts.get(pr.id), left = b ? b.at - t : 9, soon = b ? clampv(1 - left / 1.6, 0, 1) : 0;
    const born = clampv((t - (pr.born == null ? t - 1 : pr.born)) / 0.5, 0, 1);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(pr.x + 2, pr.y + 8, r * 1.0, r * 0.42, 0, 0, TAU); ctx.fillStyle = 'rgba(2,4,10,0.45)'; ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, r * (2.4 + 0.5 * soon), '#9cc8ff', (0.22 + 0.2 * Math.sin(t * 2.2 + (pr.id || 0)) * 0.5 + 0.35 * soon) * born);
    ctx.globalCompositeOperation = 'source-over';
    // the sphere: lit from the upper right (the world in the sky), the far side nearly black
    const g = ctx.createRadialGradient(x + r * 0.35, y - r * 0.38, r * 0.08, x, y, r * 1.05);
    g.addColorStop(0, '#fbfdff'); g.addColorStop(0.45, '#bccae2'); g.addColorStop(0.85, '#53648a'); g.addColorStop(1, '#2a3552');
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.globalAlpha = born; ctx.fill();
    ctx.save(); ctx.clip();
    for (const [cx, cy, cr] of [[-0.35, -0.2, 0.26], [0.2, 0.3, 0.2], [0.38, -0.34, 0.14], [-0.1, 0.55, 0.12]]) { ctx.beginPath(); ctx.arc(x + cx * r, y + cy * r, cr * r, 0, TAU); ctx.fillStyle = 'rgba(48,62,98,0.22)'; ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = '#05070d'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r - 1.5, -1.4, 0.2); ctx.strokeStyle = rgba('#ffffff', 0.6); ctx.lineWidth = 1.4; ctx.stroke();
    if (b && b.twice) {   // (Harvest: a moonlet lit twice bursts wider; a second ring stands round it)
      ctx.globalAlpha = born; ctx.beginPath(); ctx.arc(x, y, r + 13 + 3 * Math.sin(t * 4), 0, TAU); ctx.strokeStyle = rgba('#05070d', 0.35); ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = rgba('#e6f2ff', 0.85); ctx.lineWidth = 2; ctx.stroke();
    }
    if (soon > 0.02) { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r + 6 + 8 * Math.sin(t * 18) * soon, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.5 * soon); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------ the telegraphs
  const CUT = /^ml(U|Twin|Lib)?(Crescent|Half|Gibbous)$/;
  const landing = tg => tg.start + tg.dur;
  // the cuts still to land, the one landing next first (two cuts of a dance are on the floor together for a beat)
  function ranks(tgs) {
    const cuts = [];
    for (const tg of tgs.values()) if (CUT.test(tg.tag || '') && tg.gone == null && !tg.hidden) cuts.push(tg);
    cuts.sort((a, b) => landing(a) - landing(b));
    return cuts;
  }
  const since = new WeakMap();
  function drawNext(ctx, tg, t) {
    if (!since.has(tg)) since.set(tg, t);
    const k = BossTells.fade(tg, t) * clampv((t - since.get(tg)) / 0.4, 0, 1); if (k <= 0) return;
    ctx.save(); SHAPES.trace(ctx, tg.live);
    ctx.fillStyle = rgba(danger(), 0.04 * k); ctx.fill();
    ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#2a0608', 0.3 * k); ctx.lineWidth = 5.5; ctx.stroke();   // (a dark casing, so a thin line reads on the pale dust)
    ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 20;
    ctx.strokeStyle = rgba(danger(), 0.95 * k); ctx.lineWidth = 2.8; ctx.stroke();
    ctx.restore();
  }
  // what the shared drawing is handed: without the cuts that are only outlines yet, and without the pieces of a ride whose corridor is drawn from its line
  function split(tgs) {
    const cuts = ranks(tgs), skip = new Set(), outline = [];
    cuts.forEach((tg, i) => { if (i > 0 && landing(tg) > landing(cuts[0]) + 0.08) { skip.add(tg); outline.push(tg); } });
    const rest = new Map();
    for (const [id, tg] of tgs) {
      if (skip.has(tg)) continue;
      if ((tg.tag === 'mlRun' || tg.tag === 'mlRide' || tg.tag === 'mlShade') && pathFor(tg)) { skip.add(tg); continue; }
      rest.set(id, tg);
    }
    return { rest, outline, skip };
  }
  function drawTelegraphs(ctx, tgs, t, env) {
    this.tetherWatch(t, env && env.hard);
    BossTells.track(tgs, t, env);
    const sp = split(tgs);
    ctx.save(); ARENA.trace(ctx, 4); ctx.clip();
    this.drawTelegraphsInner(ctx, sp.rest, t, env);
    for (const tg of sp.outline) drawNext(ctx, tg, t);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------ one frame of the room under the units and the warnings
  function under(ctx, room, t, v) {
    if (!isMoon()) return;
    bind(room, t);
    S.lastT = t;
    const units = (v && v.units) || [];
    trackUnits(units, t);
    for (let i = S.paths.length - 1; i >= 0; i--) if (t > S.paths[i].end + 9) S.paths.splice(i, 1);
    const bd = v && v.boss;
    ctx.save(); ARENA.trace(ctx, 0); ctx.clip();
    if (bd && room.ev) crownLight(ctx, room, bd, t);
    drawPrints(ctx, t);
    touchedRings(ctx, t);
    for (const ev of S.paths) furrow(ctx, ev, t);
    for (const ev of S.paths) { corridor(ctx, ev, t); litPrints(ctx, ev, t); runHead(ctx, ev, t); }
    silverLines(ctx, t, v);
    ctx.restore();
    if (bd && v.cam) dockCast(bd, v);
  }

  // ------------------------------------------------------------------------------------------------ the boss's cast bar
  // The big cast box (#boss-cast, raid-ui.js) sits mid-screen by default, and that is where her crown stands. In this fight, and only while the player has not put it somewhere
  // themselves (localStorage 'emberfall.castFrame', its drag), it is moved to a spot that covers neither her (and her crown) nor a HUD panel, nearest its normal one, and put
  // back when the default spot is clear again. release() gives the normal position back when the raid ends.
  const CAST_KEY = 'emberfall.castFrame', CAST_W = 330, CAST_H = 70;
  const HUD_SEL = ['#raid-left', '#party-strip', '#boss-bar', '#waymarks', '#raid-leave', '#live-meter', '#combat-hud', '#menu-chip', '#bag-btn'];
  let docked = null, castAt = 0, castOwn = false, castPos = null, castMoved = -9, hudRects = [], hudAt = -9;
  function placed() { try { return localStorage.getItem(CAST_KEY) != null; } catch (e) { return false; } }
  function hud(W, H) {
    const t = nowS();
    if (t - hudAt < 0.4) return hudRects;
    hudAt = t;
    const out = [];
    if (typeof document !== 'undefined') for (const sel of HUD_SEL) {
      const e = document.querySelector(sel); if (!e) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || getComputedStyle(e).display === 'none') continue;
      out.push({ l: Math.max(0, r.left), t: Math.max(0, r.top), r: Math.min(W, r.right), b: Math.min(H, r.bottom) });
    }
    return (hudRects = out);
  }
  const overlap = (A, B) => { const w = Math.min(A.r, B.r) - Math.max(A.l, B.l), h = Math.min(A.b, B.b) - Math.max(A.t, B.t); return w > 0 && h > 0 ? w * h : 0; };
  function dockCast(bd, v) {
    const el = typeof document !== 'undefined' ? document.getElementById('boss-cast') : null; if (!el) return;
    const t = nowS();
    if (t - castAt < 0.3) return;
    castAt = t; castOwn = placed();
    if (castOwn || el.classList.contains('dragging')) return;   // (theirs: left where they put it)
    const W = v.W, H = v.H, z = v.zoom, rects = hud(W, H);
    const bx = (bd.x - v.cam.x) * z, by = (bd.y - v.cam.y) * z;
    const body = { l: bx - 130 * z, r: bx + 130 * z, t: by - 330 * z, b: by + 250 * z };   // (her, her crown over her, and the reading of it on the dust before her)
    const box = (x, y) => ({ l: x - CAST_W / 2, r: x + CAST_W / 2, t: y - CAST_H / 2, b: y + CAST_H / 2 });
    const plate = document.getElementById('boss-bar'), pb = plate ? plate.getBoundingClientRect().bottom : 0, hx = W / 2, hy = Math.max(H * 0.26, pb + 6 + CAST_H / 2 + 14);
    const px = W / 2, py = H * 0.26, bad = B => overlap(B, body) * 3 + rects.reduce((s, o) => s + overlap(B, o), 0);
    const home = bad(box(px, py)) === 0;
    let want = castPos;   // null: the normal spot
    if (home) want = null;
    else if (!castPos || bad(box(castPos.x, castPos.y)) > 0) {
      let best = null;
      for (let y = CAST_H / 2 + 4; y <= H - CAST_H / 2 - 4; y += 14) for (let x = CAST_W / 2 + 4; x <= W - CAST_W / 2 - 4; x += 14) {
        const sc = bad(box(x, y)) + 0.02 * Math.hypot(x - hx, y - hy);
        if (!best || sc < best.sc) best = { sc, x, y };
      }
      want = best;
    }
    const same = (!want && !castPos) || (want && castPos && want.x === castPos.x && want.y === castPos.y);
    if (same || t - castMoved < 1.2) return;
    castMoved = t; castPos = want;
    if (want && !docked) { docked = { left: el.style.left, top: el.style.top, transition: el.style.transition }; el.style.transition = 'opacity .2s, border-color .15s, left .6s ease, top .6s ease'; }
    if (want) { el.style.left = want.x + 'px'; el.style.top = want.y + 'px'; }
    else if (docked) { el.style.left = docked.left; el.style.top = docked.top; }
  }
  // the raid is over (or another one is on): the cast bar goes back where it was
  function release() {
    if (!docked) return;
    const el = document.getElementById('boss-cast');
    if (el) { el.style.transition = docked.transition; if (!placed()) { el.style.left = docked.left; el.style.top = docked.top; } }
    docked = null; castPos = null; castMoved = -9;
  }

  return { onRoom, banim, frame, under, drawTelegraphs, split, drawMoonlet, release, S, litDisc, crownNow, err: null };
})();

// patching ArenaView / BossTells the way vesper-view.js does
if (typeof ArenaView !== 'undefined') {
  const roomEvent0 = ArenaView.roomEvent;
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = roomEvent0.call(this, room, msg, now, ...rest);
    try { ML_VIEW.onRoom(room, msg, now); } catch (e) { /* cosmetic */ }
    return r;
  };
  const drawTelegraphs0 = ArenaView.drawTelegraphs;
  ArenaView.drawTelegraphs = function (ctx, tgs, t, env) {
    if (env && env.bossId === 'maelis') return ML_VIEW.drawTelegraphs.call(this, ctx, tgs, t, env);
    return drawTelegraphs0.call(this, ctx, tgs, t, env);
  };
  const drawProp0 = ArenaView.drawProp;
  ArenaView.drawProp = function (ctx, pr, t, room) {
    if (pr && pr.kind === 'moonlet') { ML_VIEW.drawMoonlet(ctx, pr, t); return; }   // (a small moon lying on the dust: maelis-view.js)
    return drawProp0.call(this, ctx, pr, t, room);
  };
  const roomUnder0 = ArenaView.drawRoomUnder;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    roomUnder0.call(this, ctx, room, t, v);
    if (room && this.amb && this.amb.kind === 'moon') { try { ML_VIEW.under(ctx, room, t, v); } catch (e) { ML_VIEW.err = e; try { ctx.restore(); } catch (e2) { /* cosmetic */ } } }
  };
}
if (typeof BossTells !== 'undefined') {
  const rims0 = BossTells.rims;
  BossTells.rims = function (ctx, tgs, t, env) {
    if (!env || env.bossId !== 'maelis') return rims0.call(this, ctx, tgs, t, env);
    return rims0.call(this, ctx, ML_VIEW.split(tgs).rest, t, env);   // (a cut that is only an outline yet, and the pieces of a drawn corridor, have no rim of their own)
  };
}
