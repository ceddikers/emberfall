// Ormun, the Tide-Weigher: the Scales made real in the running game. Loaded after ormun-room.js, ormun-art.js, arena-view.js and bosses.js.
// The fight script (arena/bosses/ormun.js, its CONTRACT block) says what is on each pan and what is happening; the room (ormun-room.js) draws the pans,
// the bridge, the chains and the beam from the `orscales` state; the body (ormun-art.js) takes a pose. This file is everything between them:
//   the camera        a fixed framing of both pans, the bridge, the beam and him (no leaning), glided never: the room never moves
//   his poses         the script's casts and moments turned into the art's props (orSide, orAtX / orAtY, orDur, orDeath) every frame: props()
//   the weights       a silver weight resting in its cradle (prop kind 'ormweight'), lifted into a hero's hands (the head mark 'ormcarry' says who holds one),
//                     set down, dropped by a Counterweight and sliding home, lifted away on the chains when an act ends; the cradles' prop draws nothing of its
//                     own (the room draws the empty cradle), the fallen bridge's prop ('ormgap') nothing either (the room draws the gap)
//   the readout       small pips on the beam over each pan, one lit per unit of weight on it, exactly what the script will judge (orscales nL / nR): a half-filled pip for a
//                     half (Hard's cracked weight), sea-green pips for what the water adds (Extreme), a hollow socket with a dash for each Buoyed hero, and for Exact Measure a gold
//                     notch with the empty sockets up to it ringed in gold; two lamps on the pivot for a Double Judgement (the first lit, spent, then the second)
//   the red           a judgement's (and the Undertow's) red on a pan is ONE telegraph per pan however the script lays it: the old one handing over to the new
//                     is invisible, a count that changes moves it (the colour eases out of one pan and into the other); Tip the Scale's blue on both pans
//   the water         the Undertow's flood (both rims for Twin Undertow) and The Tide Comes In over both rims, under the red; the water that stands on the low pan in Extreme,
//                     widening smoothly with its level
//   Hard's weights    a cracked weight is a drum split in two halves; Scatter the Silver's struck weight trembles, bursts, and a piece rolls (or arcs, across the gap) to each cradle
//   the drowned things  add kind 'drowned': a sodden figure crawling on a pan, weighed while it lives
// Everything is read from room events (room.orv is rebuilt from them, a snapshot replays them with their age), props and head marks. Nothing here exists
// only because the client saw an event live, except the short animations that finish within a second of their event.
// Hooks: main.js (camera, props() every frame, the backdrop), boss-tells.js (get(): the red), boss-vfx.js (CAST_POSE), arena-view.js (drawProp, _tracePath);
// the room's drawing methods are wrapped below (drawRoomUnder / drawRoomOver / scalesLife / roomEvent) so that arena-view.js needs nothing more.

const OR_VIEW = (() => {
  const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
  const sm = q => { q = clampv(q, 0, 1); return q * q * (3 - 2 * q); };
  const ease = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
  const PANS = [{ x: -380, y: 60 }, { x: 380, y: 60 }], PAN_R = 300;
  const PANKEY = ['L', 'R'];
  const failed = {};
  const fail = (what, e) => { if (!failed[what]) { failed[what] = 1; if (typeof console !== 'undefined') console.warn('ormun-view: ' + what + ' failed once (logged once)', e); } };   // (cosmetic: a drawing that throws never stops the fight drawing)
  const K = { ink: '#0a1019', silver: '#d9e3ee', silverH: '#f6fbff', silverM: '#a7b5c6', silverD: '#5d6b7e', frost: '#9fd0ff', frostH: '#e6f4ff', water: '#8fbbe0', waterD: '#3d6c9a' };
  const orv = room => room.orv || (room.orv = { anims: [], hide: [], pip: { t: -1, a: { L: [], R: [] }, h: { L: [], R: [] }, tq: { L: -1, R: -1 } }, buoyed: { L: 0, R: 0 }, aura: [], pair: null, jStart: -1, jDec: true, scatter: null, sb: null, wlev: { L: 0, R: 0, t: -1 }, panA: { L: 0, R: 0, B: 0, t: -1, frame: -1 }, owner: {}, r2: { L: null, R: null, B: null }, drop: null, under: { L: { w: 0, a: 0 }, R: { w: 0, a: 0 }, t: -1 }, aim: null, carry: [] });

  // ------------------------------------------------------------------------------------------------------------------ the camera
  // A fixed framing of the room: no leaning, and nothing a player must read under the HUD. The HUD is arrangeable, so its panels are measured (their rectangles,
  // read from the DOM about twice a second) and the zoom and place are searched for: the largest zoom (at most 1.1) at which every point that matters (the
  // pans' floors, the cradles, the beam's pips, his body and both hands, the bridge) lies on the screen and clear of every panel. The chains and the far sea
  // are scenery and may go under a panel.
  const CY = 30;   // (the world row the framing is centred on)
  const KEEP_PTS = (() => {
    const out = [];
    for (const px of [-380, 380]) { for (let a = 0; a < 40; a++) out.push([px + Math.cos(a / 40 * TAU) * 296, 60 + Math.sin(a / 40 * TAU) * 296]); out.push([px, 60]); }
    for (const sx of [-1, 1]) for (const dx of [-70, 0, 70]) out.push([sx * 380 + dx, -290]);   // (the beam over each pan, where the pips are)
    for (const p of [[0, 60], [-100, 60], [100, 60], [0, 10], [-61, -290], [150, -100], [130, -190], [-165, -170], [165, -170], [0, -330], [0, -5]]) out.push(p);   // (bridge, his hands, his shoulders and head)
    return out;
  })();
  // shapes the cast box must not cover (room coordinates): the pans, the bridge, his body, the two pip rows
  const KEEP_SHAPES = [{ c: [-380, 60, 304] }, { c: [380, 60, 304] }, { r: [-110, 10, 110, 112] }, { r: [-170, -332, 170, -2] }, { r: [-480, -304, -290, -276] }, { r: [290, -304, 480, -276] }];
  const HUD_SEL = ['#raid-left', '#party-strip', '#boss-bar', '#waymarks', '#raid-leave', '#live-meter', '#combat-hud', '#menu-chip', '#bag-btn'];
  let hudRects = [], hudKey = '', hudAt = -9, hudW = 0, hudH = 0, fitKey = '', fit = null, cam = null;
  function hud(W, H) {
    const t = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
    if (t - hudAt < 0.4 && hudW === W && hudH === H) return hudRects;
    hudAt = t; hudW = W; hudH = H;
    const out = [];
    if (typeof document !== 'undefined') for (const sel of HUD_SEL) {
      const e = document.querySelector(sel); if (!e) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || getComputedStyle(e).display === 'none') continue;
      out.push({ l: Math.max(0, r.left), t: Math.max(0, r.top), r: Math.min(W, r.right), b: Math.min(H, r.bottom) });
    }
    hudKey = out.map(r => [r.l, r.t, r.r, r.b].map(Math.round).join(',')).join(';');
    hudRects = out;
    return out;
  }
  const inRect = (x, y, r, pad) => x > r.l - pad && x < r.r + pad && y > r.t - pad && y < r.b + pad;
  // the largest zoom (and the place nearest the middle of the screen) at which every point that matters is on the screen and clear of the HUD
  function search(W, H, rects) {
    const ok = (z, sx, sy) => {
      for (const [wx, wy] of KEEP_PTS) {
        const x = sx + wx * z, y = sy + (wy - CY) * z;
        if (x < 6 || x > W - 6 || y < 6 || y > H - 6) return false;
        for (const r of rects) if (inRect(x, y, r, 4)) return false;
      }
      return true;
    };
    for (let z = 1.1; z >= 0.45; z -= 0.01) {
      let best = null;
      for (let sx = W / 2 - 360; sx <= W / 2 + 360; sx += 12) for (let sy = H / 2 - 260; sy <= H / 2 + 260; sy += 12) {
        if (!ok(z, sx, sy)) continue;
        const d = Math.hypot(sx - W / 2, (sy - H * 0.52) * 1.4);
        if (!best || d < best.d) best = { d, z, sx, sy };
      }
      if (best) return best;
    }
    return { z: 0.5, sx: W / 2, sy: H / 2 };
  }
  let wideTgt = 0, wideCur = 0;
  const WIDE_MAX = 0.3, WIDE_FLOOR = 0.46;   // (at most 30% further back; the zoom is never taken below 0.46 unless the fit itself is lower)
  function setWide(k) { wideTgt = clampv(+k || 0, 0, 1); }
  // returns { zoom, x, y } (x, y the screen's top-left in the world); also where the cast bar goes (dockCast)
  function camera(raid, now, W, H, plate, dt, snap, out = 1) {
    const rects = hud(W, H), key = W + 'x' + H + '|' + hudKey;
    if (key !== fitKey || !fit) { fitKey = key; fit = search(W, H, rects); }
    if (!cam || snap || cam.raid !== raid) cam = { raid, z: fit.z, sx: fit.sx, sy: fit.sy };
    else { const k = 1 - Math.exp(-6 * Math.min(dt || 0, 0.1)); cam.z += (fit.z - cam.z) * k; cam.sx += (fit.sx - cam.sx) * k; cam.sy += (fit.sy - cam.sy) * k; }
    // a moment may ask for a wider framing (walls/ormun.js: the Tide wall): pulled back about the room's middle, eased, never below what is still legible
    const wk = 1 - Math.exp(-2.2 * Math.min(dt || 0, 0.1)); wideCur += (wideTgt - wideCur) * wk; if (snap) wideCur = wideTgt;
    const z = Math.max(cam.z * out * (1 - WIDE_MAX * wideCur), Math.min(cam.z * out, WIDE_FLOOR));
    try { dockCast(fit, out, W, H, rects); } catch (e) { fail('dock', e); }
    return { zoom: z, x: -cam.sx / z, y: CY - cam.sy / z };
  }

  // ------------------------------------------------------------------------------------------------------------------ the boss's cast bar
  // The big cast box (#boss-cast, raid-ui.js) sits mid-screen by default, which is over his head and the hand that is the tell of every judgement. In this fight,
  // and only while the player has not put it somewhere themselves (localStorage 'emberfall.castFrame', its drag), it is docked where it covers no HUD panel and as
  // little as possible of the pans, the bridge, him and the pips (open water below the bridge, as a rule). release() puts it back when the raid ends
  // (main.js render()). The same approach as vesper-view.js, kept in this file so that Vesper's own is untouched.
  const CAST_KEY = 'emberfall.castFrame', CAST_W = 330, CAST_H = 70;
  let docked = null, castKey = '', castAt = 0, castOwn = false, castPos = null;
  function placed() { try { return localStorage.getItem(CAST_KEY) != null; } catch (e) { return false; } }
  function dockCast(f, out, W, H, rects) {
    const el = typeof document !== 'undefined' ? document.getElementById('boss-cast') : null; if (!el) return;
    const t = performance.now() / 1000;
    if (t - castAt > 0.4) { castAt = t; castOwn = placed(); }
    if (castOwn || el.classList.contains('dragging')) return;   // (theirs: left where they put it)
    const key = [f.z, f.sx, f.sy, out].map(v => Math.round(v * 100)).join(',') + '|' + hudKey + '|' + W + 'x' + H;
    if (key !== castKey) {
      castKey = key;
      const z = f.z * out, px = W / 2, py = H * 0.86;
      const cover = (x, y) => {   // is this screen point over something that must stay clear?
        for (const r of rects) if (inRect(x, y, r, 0)) return 3;
        const wx = (x - f.sx) / z, wy = (y - f.sy) / z + CY;
        for (const q of KEEP_SHAPES) {
          if (q.c ? Math.hypot(wx - q.c[0], wy - q.c[1]) < q.c[2] : (wx > q.r[0] && wx < q.r[2] && wy > q.r[1] && wy < q.r[3])) return 1;
        }
        return 0;
      };
      let best = null;
      for (let y = CAST_H / 2 + 4; y <= H - CAST_H / 2 - 4; y += 14) for (let x = CAST_W / 2 + 4; x <= W - CAST_W / 2 - 4; x += 14) {
        let over = 0;
        for (let i = 0; i <= 8; i++) for (let j = 0; j <= 3; j++) over += cover(x - CAST_W / 2 + CAST_W * i / 8, y - CAST_H / 2 + CAST_H * j / 3);
        const sc = over * 100 + Math.hypot(x - px, y - py) * 0.05;
        if (!best || sc < best.sc) best = { sc, x, y };
      }
      castPos = best;
    }
    if (!castPos) return;
    if (!docked) { docked = { left: el.style.left, top: el.style.top, transition: el.style.transition }; el.style.transition = 'opacity .2s, border-color .15s, left .6s ease, top .6s ease'; }
    const l = castPos.x + 'px', tp = castPos.y + 'px';
    if (el.style.left !== l) el.style.left = l;
    if (el.style.top !== tp) el.style.top = tp;
  }
  // the raid is over (or another one is on): the cast bar goes back where it was
  function release() {
    if (!docked) return;
    const el = document.getElementById('boss-cast');
    if (el) { el.style.transition = docked.transition; if (!placed()) { el.style.left = docked.left; el.style.top = docked.top; } }
    docked = null; castKey = ''; cam = null; wideTgt = 0; wideCur = 0;
  }

  // ------------------------------------------------------------------------------------------------------------------ the silver weight
  // A short silver drum with the number engraved on its top plate, seen from above and in front like every prop. n is 1..3: the bigger it is the more
  // bands it carries. o: { s scale, z height above the floor (px), t time, a alpha }. About 40 px across at scale 1, the numeral about 15 px tall.
  function weight(ctx, x, y, n, o = {}) {
    n = clampv(n | 0, 1, 3);
    const s = o.s || 1, z = o.z || 0, r = (n === 1 ? 17 : n === 2 ? 20 : 23) * s, ry = r * 0.7, h = (8 + 3 * n) * s;
    ctx.save();
    if (o.a != null && o.a < 1) ctx.globalAlpha *= o.a;
    // what it sits on: a cold sheen, and a contact shadow that stays on the floor (smaller and softer the higher it is)
    const lift = clampv(z / 160, 0, 1);
    if (!o.held) glow(ctx, x, y + 2, r * 2.0, K.frost, 0.1 * (1 - lift));
    ellipse(ctx, x + 3 * s, y + 5 * s, r * (1.1 - 0.2 * lift), ry * (0.95 - 0.15 * lift), 0, 'rgba(3,8,16,' + (0.5 * (1 - 0.6 * lift)).toFixed(3) + ')');
    ctx.translate(x, y - z);
    const body = () => {
      // the bail: a small ring standing at the back of the top
      ctx.beginPath(); ctx.ellipse(0, -h - ry * 0.78, r * 0.3, r * 0.26, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.lineCap = 'round';
      ctx.strokeStyle = K.ink; ctx.lineWidth = 5 * s; ctx.stroke(); ctx.strokeStyle = K.silverM; ctx.lineWidth = 2.6 * s; ctx.stroke();
      // the drum's side, shaded across (a cracked one is greyer and duller)
      const g = ctx.createLinearGradient(-r, 0, r, 0);
      if (o.crack) { g.addColorStop(0, '#5f6c7e'); g.addColorStop(0.28, '#c3cdd9'); g.addColorStop(0.55, '#96a3b3'); g.addColorStop(1, '#4b5766'); }
      else { g.addColorStop(0, '#6c7a8d'); g.addColorStop(0.28, '#e8f0f8'); g.addColorStop(0.55, '#b3c0d0'); g.addColorStop(1, '#566476'); }
      ctx.beginPath(); ctx.moveTo(-r, -h); ctx.lineTo(-r, 0); ctx.ellipse(0, 0, r, ry, 0, Math.PI, 0, true); ctx.lineTo(r, -h); ctx.ellipse(0, -h, r, ry, 0, 0, Math.PI, false); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = K.ink; ctx.lineWidth = 2.4 * s; ctx.stroke();
      // bands round it: one more for each step of weight past the first
      ctx.lineWidth = 2.2 * s;
      for (let i = 1; i < n; i++) {
        const by = -h * (i / n);
        ctx.beginPath(); ctx.ellipse(0, by, r * 0.998, ry * 0.998, 0, 0.02 * Math.PI, 0.98 * Math.PI, false); ctx.strokeStyle = 'rgba(8,14,24,0.55)'; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, by - 1.6 * s, r * 0.998, ry * 0.998, 0, 0.06 * Math.PI, 0.94 * Math.PI, false); ctx.strokeStyle = rgba(K.frost, o.crack ? 0.5 : 0.85); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-r * 0.74, -h + 1 * s); ctx.lineTo(-r * 0.74, -2 * s); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2 * s; ctx.stroke();   // a bright edge down the lit side
      // the top plate: a bevelled rim, a darker groove, the engraved face
      ctx.beginPath(); ctx.ellipse(0, -h, r, ry, 0, 0, TAU);
      const tg = ctx.createRadialGradient(-r * 0.3, -h - ry * 0.3, 2, 0, -h, r);
      if (o.crack) { tg.addColorStop(0, '#e2e9f1'); tg.addColorStop(0.6, '#b4c0cd'); tg.addColorStop(1, '#8794a5'); } else { tg.addColorStop(0, '#f7fbff'); tg.addColorStop(0.6, '#d3deea'); tg.addColorStop(1, '#a1afc1'); }
      ctx.fillStyle = tg; ctx.fill(); ctx.strokeStyle = K.ink; ctx.lineWidth = 2.4 * s; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -h, r * 0.84, ry * 0.84, 0, 0, TAU); ctx.strokeStyle = 'rgba(30,44,62,0.55)'; ctx.lineWidth = 1.6 * s; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -h, r * 0.72, ry * 0.72, 0, 0, TAU); ctx.fillStyle = 'rgba(190,206,224,0.7)'; ctx.fill();
      // the number: engraved dark with a pale lip under it, drawn a little flattened to lie on the plate
      ctx.save(); ctx.translate(0, -h + ry * 0.02); ctx.scale(1, 0.86);
      ctx.font = '800 ' + Math.round(r * 1.32) + 'px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText(String(n), 1.0 * s, 1.6 * s + 1);
      ctx.fillStyle = '#121b28'; ctx.fillText(String(n), 0, 1);
      ctx.restore();
    };
    if (!o.crack) body();
    else {
      // A cracked weight (Hard's Hollow Weight: it counts half) is split in two by a jagged fissure from the top to the foot, the halves a little apart and out of true,
      // a dark gap between them and chips lying beside it: it cannot be taken for a whole one at any distance.
      const ln = [[-r * 0.04, -h - ry * 1.15], [r * 0.24, -h - ry * 0.5], [-r * 0.12, -h - ry * 0.05], [r * 0.2, -h + ry * 0.55], [-r * 0.02, ry * 0.15], [r * 0.14, ry * 1.2]];
      const half = side => { const far = side * r * 2.2; ctx.beginPath(); ctx.moveTo(far, -h - ry * 2.2); for (const [px, py] of ln) ctx.lineTo(px, py); ctx.lineTo(far, ry * 2.2); ctx.closePath(); };
      ctx.save(); half(-1); ctx.clip(); ctx.translate(-3.8 * s, 0.8 * s); ctx.rotate(-0.08); body(); ctx.restore();
      ctx.save(); half(1); ctx.clip(); ctx.translate(4.4 * s, 3.4 * s); ctx.rotate(0.1); body(); ctx.restore();
      ctx.beginPath(); ln.forEach(([px, py], i) => (i ? ctx.lineTo(px + 0.4 * s, py) : ctx.moveTo(px + 0.4 * s, py)));
      ctx.lineJoin = 'miter'; ctx.strokeStyle = 'rgba(2,5,10,0.95)'; ctx.lineWidth = 7 * s; ctx.stroke(); ctx.strokeStyle = 'rgba(170,190,214,0.7)'; ctx.lineWidth = 1.2 * s; ctx.stroke();
      for (const [cx2, cy2, cr] of [[r * 0.5, ry * 0.9, 2.2], [-r * 0.45, ry * 1.05, 1.6], [r * 0.7, ry * 0.4, 1.4]]) circle(ctx, cx2 * 1, cy2, cr * s, '#aab6c6', K.ink, 1);
    }
    ctx.restore();
  }

  // where a pan's own picture has the point (px, py) of the room just now: the pans hang a little lower or higher and a little smaller or larger as they
  // tilt, and bob (ormun-room.js panPose), so a weight in a cradle is moved the same way
  function onPan(pr, t) {
    const a = ArenaView.amb;
    if (!a || a.kind !== 'scales' || typeof OR_ROOM === 'undefined' || !OR_ROOM.panPose) return { x: pr.x, y: pr.y };
    const i = pr.x < 0 ? 0 : 1, pp = OR_ROOM.panPose(a, i, t);
    return { x: pp.cx + (pr.x - PANS[i].x) * pp.k, y: pp.cy + (pr.y - PANS[i].y) * pp.k };
  }
  const hiddenAt = (S, x, y, t) => S.hide.some(h => h.until > t && Math.abs(h.x - x) < 6 && Math.abs(h.y - y) < 6);

  // ------------------------------------------------------------------------------------------------------------------ props (ArenaView.drawProp)
  function prop(ctx, pr, t, room) {
    if (pr.kind !== 'ormweight') return;   // (ormcradle and ormgap: the room draws both)
    const S = orv(room);
    if (hiddenAt(S, pr.x, pr.y, t)) return;
    const p = onPan(pr, t);
    // a weight that has just been put down settles: a small drop onto the cradle
    const age = t - (pr.born == null ? t - 9 : pr.born), z = age < 0.22 ? 7 * (1 - age / 0.22) * (1 - age / 0.22) : 0;
    let crack = pr.maxHp > 0 && pr.hp <= 1, jx = 0;
    const sc = S.scatter;
    if (sc && t < sc.end + 0.1 && Math.abs(sc.x - pr.x) < 6 && Math.abs(sc.y - pr.y) < 6) {   // (Scatter the Silver is coming down on it: it trembles, harder and harder, and splits)
      const u = clampv((t - sc.start) / Math.max(0.5, sc.end - sc.start), 0, 1);
      jx = Math.sin(t * 46) * 1.8 * u * u; if (u > 0.55) crack = true;
    }
    weight(ctx, p.x + jx, p.y, pr.state || 1, { t, z, crack });
  }

  // ------------------------------------------------------------------------------------------------------------------ room events
  // the room events that are only drawn for a moment are kept in room.orv as animations: { k, t0, dur, ... }, finished ones dropped as they are met
  function event(room, msg, now, entById) {
    const S = orv(room), k = msg.k;
    const heroAt = id => { const e = id != null && entById ? entById(id) : null; return e ? { x: e.x, y: e.y } : null; };
    if (k === 'ormweight') {
      if (msg.a === 'lift') S.anims.push({ k: 'lift', n: msg.n, t0: now, dur: 0.3, from: { x: msg.x, y: msg.y }, who: msg.who });
      else if (msg.a === 'set') {
        const from = heroAt(msg.who) || { x: msg.x, y: msg.y };
        S.anims.push({ k: 'set', n: msg.n, t0: now, dur: 0.32, from, to: { x: msg.x, y: msg.y } });
        S.hide.push({ x: msg.x, y: msg.y, until: now + 0.32 });
      } else if (msg.a === 'land' && S.sb && now < S.sb.until && msg.who == null && S.sb.to.includes(msg.cradle)) {
        // (a piece of a scattered weight: its roll brings it home, see 'ormscatter')
      } else if (msg.a === 'land') {
        const dr = S.drop, from = (dr && dr.pos) || heroAt(msg.who) || { x: msg.x, y: msg.y };
        S.anims.push({ k: 'land', n: msg.n, crack: !!msg.crack, t0: now, dur: 0.7, rest: 0.18, from: { x: from.x, y: from.y }, to: { x: msg.x, y: msg.y } });
        S.hide.push({ x: msg.x, y: msg.y, until: now + 0.7 });
      } else if (msg.a === 'clear') {
        // every weight is lifted away on its chain: the ones resting now rise and fade
        for (const pr of room.props || []) if (pr.kind === 'ormweight') S.anims.push({ k: 'away', n: pr.state || 1, t0: now, dur: 1.0, at: { x: pr.x, y: pr.y } });
      }
    } else if (k === 'ormscatter') {
      if (msg.a === 'strike') S.scatter = { x: msg.x, y: msg.y, n: msg.n, start: now, end: now + (msg.dur || 4) };
      else if (msg.a === 'break') {
        // the struck weight bursts, and a piece rolls from the cradle to each cradle it names (an arc when it must cross to the other pan)
        const cr = (room.ev.orscales && room.ev.orscales.cradles) || (typeof OR_ROOM !== 'undefined' ? OR_ROOM.CRADLES : []);
        S.scatter = null;
        S.anims.push({ k: 'shatter', t0: now, dur: 0.7, at: { x: msg.x, y: msg.y }, n: msg.n });
        (msg.to || []).forEach((idx, i) => { const c = cr[idx]; if (c) S.anims.push({ k: 'roll', t0: now + 0.05 * i, dur: 0.82, from: { x: msg.x, y: msg.y }, to: { x: c[0], y: c[1] }, seed: i }); });
        S.sb = { until: now + 1.7, to: msg.to || [] };
      }
    } else if (k === 'ormdrop') {
      S.drop = { n: msg.n, crack: !!msg.crack, who: msg.who, start: now, end: now + (msg.dur || 4.6), pos: heroAt(msg.who) || { x: msg.hx, y: msg.hy } };
    }
    if (S.anims.length > 24) S.anims.splice(0, S.anims.length - 24);
  }

  // ------------------------------------------------------------------------------------------------------------------ his poses, every frame
  const JNAMES = { 'Let It Be Level': 1, 'The Heavier Falls': 1, 'The Lighter Rises': 1, 'Exact Measure': 1, 'Double Judgement': 1 };
  const JUDGE = { 'Let It Be Level': 1, 'The Heavier Falls': 1, 'The Lighter Rises': 1, 'Exact Measure': 1 };
  const sideOf = x => (x < 0 ? -1 : 1);
  // the pans a verdict names -> the side his hand goes to (-1 left, 1 right, 0 both or the bridge)
  const sideOfPans = pans => { const l = pans.includes('L'), r = pans.includes('R'); return l && !r ? -1 : r && !l ? 1 : 0; };
  // props(raid, now): sets the art's own props on raid.props for the move he is casting: orSide, orAtX / orAtY, orDur, orDeath
  function props(raid, now) {
    const P = raid.props, room = raid.room, ev = room.ev, S = orv(room), c = raid.cast;
    const live = c && now < c.start + c.dur + 0.4 ? c : null, name = live ? live.name : '';
    const set = (k, v) => { if (v == null) delete P[k]; else P[k] = v; };
    let side = null, ax = null, ay = null, dur = null;
    if (live) {
      dur = live.dur;
      if (JUDGE[name]) {
        const rd = ev.ormlock && ev.ormlock.start >= live.start - 0.05 ? ev.ormlock : ev.ormread && ev.ormread.start >= live.start - 0.05 ? ev.ormread : null;
        side = rd && Array.isArray(rd.pans) ? sideOfPans(rd.pans) : 0;
      } else if (name === 'Heavy Hand') {
        const tg = raid.boss && raid.boss.tg != null ? S.entById && S.entById(raid.boss.tg) : null;
        if (tg && now < live.start + live.dur - 0.6) S.aim = { x: tg.x, y: tg.y };
        if (S.aim) { ax = S.aim.x; ay = S.aim.y; side = sideOf(ax); }
      } else if (name === 'Scatter the Silver') {   // (Hard: he strikes a cradle: the blow lands on it)
        const sc = ev.ormscatter && ev.ormscatter.a === 'strike' && ev.ormscatter.start >= live.start - 0.1 ? ev.ormscatter : null;
        if (sc) { ax = sc.x; ay = sc.y; side = sideOf(ax); }
      } else if (name === 'Counterweight' || name === 'Hollow Weight') {
        const d = ev.ormdrop && ev.ormdrop.start >= live.start - 0.1 ? S.drop : null;
        if (d) { if (d.pos) { ax = d.pos.x; ay = d.pos.y; side = sideOf(ax); } }
      } else if (name === 'Burden') {
        let who = null;
        for (const m of raid.hmarks.values()) if (m.key === 'ormburden' && m.start >= live.start - 0.2) who = m.pid;
        const e = who != null && S.entById ? S.entById(who) : null;
        if (e) side = sideOf(e.x);
      } else if (name === 'Tip the Scale') {
        const sc = ev.orscales; side = sc && sc.tilt < 0 ? -1 : 1;
      }
    } else S.aim = null;
    set('orSide', side); set('orAtX', ax == null ? null : Math.round(ax)); set('orAtY', ay == null ? null : Math.round(ay)); set('orDur', dur);
    // the kill: he sinks (the art's own 4.5 s)
    const kf = ev['orm-kill-fall'];
    if (kf && now - kf.start < 9) P.orDeath = true; else delete P.orDeath;
  }

  // ------------------------------------------------------------------------------------------------------------------ the beam's pips
  // One pip per unit of weight on each pan, exactly what the script will judge (orscales nL / nR: heroes, weights, drowned things, the tide and the water, a half where a
  // cracked weight counts half, less one for each Buoyed hero). A whole pip is lit; a half is a pip filled on its left half only; what the water adds is lit in sea green
  // (the last pips of the row); a hero who weighs minus one leaves a hollow socket with a dash in it at the end of the lit pips. Exact Measure's notch: on the lit
  // pan, a gold tick at the count the pan must reach (the other pan's count and the number asked), the empty sockets up to it ringed in gold. Every pip fades in and
  // out; nothing snaps.
  const GOLD = '#ffd36a', SEA = '#7ff0dc';
  function pipDraw(ctx, x, y, r, kind, a, half) {
    // kind: 'w' a whole weight, 'sea' water, 'gap' (empty, ringed in gold)
    const col = kind === 'sea' ? SEA : K.frostH;
    circle(ctx, x, y, r + 1.2, 'rgba(6,10,18,' + (0.7 * Math.max(a, kind === 'gap' ? 0.9 : 0)).toFixed(3) + ')', kind === 'gap' ? rgba(GOLD, 0.95) : null, 1.3);
    if (a < 0.02) return;
    ctx.save(); ctx.globalAlpha = a;
    if (half) { ctx.beginPath(); ctx.rect(x - r - 2, y - r - 2, r + 2, 2 * r + 4); ctx.clip(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 3.4, kind === 'sea' ? SEA : K.frost, half ? 0.18 : 0.3); ctx.restore();
    circle(ctx, x, y, r, col, 'rgba(8,16,28,0.8)', 1); circle(ctx, x - r * 0.28, y - r * 0.3, r * 0.34, 'rgba(255,255,255,0.9)');
    ctx.restore();
    if (half) { ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = 'rgba(190,210,235,0.45)'; ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore(); }
  }
  function pips(ctx, a, t) {
    const room = ArenaView.liveRoom, S = room && orv(room), ev = room && room.ev && room.ev.orscales;
    if (!S || !ev || typeof ev.nL !== 'number') return;
    const P = S.pip, dt = P.t < 0 ? 0 : clampv(t - P.t, 0, 0.1); P.t = t;
    const tl = a.tilt, PERSP_Y = 60, BEAM_Y = -290, ex = ev.exact && typeof ev.exact.n === 'number' ? ev.exact : null;
    for (let i = 0; i < 2; i++) {
      const pan = i ? 'R' : 'L', mine = Math.max(0, i ? ev.nR : ev.nL), theirs = Math.max(0, i ? ev.nL : ev.nR);
      const F = Math.floor(mine + 1e-6), hasHalf = mine - F > 0.25 ? 1 : 0, wat = clampv((i ? ev.waterR : ev.waterL) || 0, 0, 4), nb = S.buoyed[pan] || 0;
      const target = ex && ex.pan === pan ? theirs + ex.n : -1;
      P.tq[pan] = target < 0 ? -1 : (P.tq[pan] < 0 ? target : ease(P.tq[pan], target, 8, dt));
      const need = Math.max(F + hasHalf, target > 0 ? Math.ceil(P.tq[pan] - 0.01) : 0, 1) + nb, per = need > 16 ? 10 : 8, slots = Math.min(per * 2, need);
      const u = (i ? 1 : -1) * 380 / 860, h = -tl * u * 0.16, k = 1 + h, cx = u * 860 * k, cy = PERSP_Y + (BEAM_Y - PERSP_Y) * (1 + 0.4 * h);
      const sp = (per > 8 ? 9 : 11) * k, r = (per > 8 ? 2.9 : 3.3) * k, rows = slots > per ? 2 : 1;
      const at0 = q => { const row = q < per ? 0 : 1, col = row ? q - per : q, inRow = row ? slots - per : Math.min(per, slots); return [cx + (col - (inRow - 1) / 2) * sp, cy + (rows > 1 ? (row ? 5.2 : -5.2) : 0) * k]; };
      const at = q => at0(q + nb);   // (the hollow sockets of a pan's Buoyed heroes come first, then the pips: they never take a place the notch asks for)
      const A = P.a[pan], Hh = P.h[pan];
      for (let q = 0; q < 20; q++) {
        A[q] = ease(A[q] || 0, q < F ? 1 : 0, 10, dt); Hh[q] = ease(Hh[q] || 0, q === F && hasHalf ? 1 : 0, 10, dt);
      }
      // the gap an Exact Measure asks to be filled: empty sockets ringed in gold from the last lit pip up to the notch
      if (target > 0) for (let q = F + hasHalf; q < Math.min(slots - nb, Math.ceil(P.tq[pan] - 0.01)); q++) { const [x, y] = at(q); pipDraw(ctx, x, y, r, 'gap', 0, false); }
      for (let q = 0; q < slots - nb; q++) {
        if (A[q] < 0.02 && Hh[q] < 0.02) continue;
        const [x, y] = at(q), sea = q < F && q >= F - Math.round(wat);
        pipDraw(ctx, x, y, r, sea ? 'sea' : 'w', Math.max(A[q], Hh[q]), Hh[q] > A[q]);
      }
      // minus one: a hollow socket with a dash in it, after the lit pips, for each Buoyed hero standing on this pan
      for (let j = 0; j < nb; j++) {
        if (j >= slots) break;
        const [x, y] = at0(j);
        circle(ctx, x, y, r + 1.2, 'rgba(6,10,18,0.75)', rgba('#d6f4ff', 0.9), 1.2); line(ctx, x - r * 0.6, y, x + r * 0.6, y, '#d6f4ff', 1.6);
      }
      // the notch: a gold tick on the beam where the count must come to, with a small gold cap
      if (target > 0) {
        const qf = Math.max(0, P.tq[pan] - 1), q0 = clampv(Math.floor(qf), 0, slots - nb - 1), [bx, by] = at(q0);
        const x = bx + (qf - q0) * sp + sp * 0.5, y0 = by - 7 * k, y1 = by + 7 * k;
        // a gold bracket under the gap between the lit pips and the notch: that many more are asked
        if (P.tq[pan] - (F + hasHalf) > 0.5) { const [lx] = at(clampv(F + hasHalf, 0, slots - nb - 1)); const xa = lx - sp * 0.5 + 1, yb = by + 8.5 * k; line(ctx, xa, yb, x, yb, rgba(GOLD, 0.85), 1.6); line(ctx, xa, yb - 3 * k, xa, yb, rgba(GOLD, 0.85), 1.6); line(ctx, x, yb - 3 * k, x, yb, rgba(GOLD, 0.85), 1.6); }
        line(ctx, x, y0, x, y1, rgba(GOLD, 0.95), 2.2); line(ctx, x, y0, x, y1, '#ffffff', 0.8);
        poly(ctx, [x - 3.4 * k, y0 - 4 * k, x + 3.4 * k, y0 - 4 * k, x, y0], GOLD, K.ink, 0.8);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, by, 14 * k, GOLD, 0.35); ctx.restore();
      }
    }
    lamps(ctx, a, t, S);
  }

  // ------------------------------------------------------------------------------------------------------------------ the pair lamps (Double Judgement)
  // Two small lamps on the beam's pivot: the first is lit while the first judgement's bar runs and goes dark (spent) when it lands; the second waits, breathing, in the
  // gap, and is lit while the second runs. A single judgement lights nothing. The pair is read from the room: the next judgement in the feed (raid.bnext) falls 2.6 s after this
  // one's bar ends (see frameUpdate), and a judgement that begins within 5 s of a first one's end is its second.
  function lamps(ctx, a, t, S) {
    const pr = S.pair; if (!pr) return;
    const y = -290 - 31;
    const l1 = pr.e1 != null && t < pr.e1 ? 1 : 0, spent = pr.e1 != null && t >= pr.e1 ? 1 : 0;
    const l2 = pr.s2 != null && t >= pr.s2 && t < pr.e2 ? 1 : pr.s2 == null && pr.e1 != null && t >= pr.e1 ? 0.35 + 0.35 * Math.sin(t * 5) : 0;
    for (const [i, lit, dead] of [[0, l1, spent], [1, l2, 0]]) {
      const x = (i ? 1 : -1) * 21;
      rrect(ctx, x - 11, y - 10, 22, 20, 5, '#46546a', K.ink, 1.8);
      circle(ctx, x, y - 1, 6.4, lit > 0.02 ? rgba('#ff6a4a', 0.35 + 0.6 * lit) : 'rgba(8,12,20,0.85)', K.ink, 1.2);
      for (let d = 0; d <= i; d++) circle(ctx, x + (i ? (d - 0.5) * 5 : 0), y + 7, 1.2, 'rgba(214,226,240,0.8)');   // (one dot under the first lamp, two under the second)
      if (lit > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 22, '#ff6a4a', 0.55 * lit); ctx.restore(); circle(ctx, x - 1.6, y - 2.6, 1.7, 'rgba(255,255,255,0.8)'); }
      else if (dead) { ctx.beginPath(); ctx.arc(x, y - 1, 6.4, 0, TAU); ctx.strokeStyle = 'rgba(160,176,198,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }

  // ------------------------------------------------------------------------------------------------------------------ the red (boss-tells.js get() -> OR_VIEW.tell)
  // The script keeps ONE telegraph per place a judgement (or the flood) can fall (left pan, right pan, bridge) for the whole cast, laid when the cast begins and only
  // moved on or off with tgmod (the shape swapped for a speck far out at sea; orscales strikeL / strikeR / strikeB say which place is lit). The red is drawn by pan
  // here: its strength eases in and out, so a count that changes moves the colour from one pan to the other instead of blinking it.
  const danger = () => (typeof BossTells !== 'undefined' && BossTells.COL ? BossTells.COL.danger : '#ff3b2f');
  const centreOf = s => (s.kind === 'rect' ? { x: s.x + Math.cos(s.angle || 0) * (s.len || 0) / 2, y: s.y + Math.sin(s.angle || 0) * (s.len || 0) / 2 } : { x: s.x, y: s.y });
  const panOfShape = s => { const c = centreOf(s); return Math.abs(c.x) < 150 ? 'B' : c.x < 0 ? 'L' : 'R'; };
  // the speck far out at sea a telegraph is parked on while it is not on anything
  const isReal = s => !!s && Math.abs(s.y) < 1500 && Math.abs(s.x) < 1500 && !(s.kind === 'circle' && s.r < 8);
  const FAMILY = { ormJudge: 1, ormUnder: 1, ormTwin: 1 };
  // once a frame: each pan's owner (the newest telegraph of the family that has been on it) and the eased strength of the red there
  function frame(env, t) {
    const room = env.room, S = orv(room), A = S.panA;
    if (A.frame === t) return S;
    A.frame = t;
    const dt = A.t < 0 ? 0 : clampv(t - A.t, 0, 0.1); A.t = t;
    const own = { L: null, R: null, B: null }, on = { L: false, R: false, B: false };
    if (env.tgs) for (const tg of env.tgs.values()) {
      if (!FAMILY[tg.tag] || tg.hidden) continue;
      const s = tg.live || tg.shape;
      if (isReal(s)) { tg._orPan = panOfShape(s); tg._orShape = Object.assign({}, s); }
      const pan = tg._orPan; if (!pan) continue;
      if (!own[pan] || tg.start >= own[pan].start) own[pan] = tg;
      if (tg.gone == null && isReal(s)) on[pan] = true;
    }
    S.owner = own;
    for (const pan of ['L', 'R', 'B']) {
      A[pan] = ease(A[pan], on[pan] ? 1 : 0, on[pan] ? 11 : 12, dt);
      // a flood's inner edge moves with the count: eased, not snapped
      const sh = own[pan] && own[pan]._orShape;
      if (sh && sh.kind === 'donut') S.r2[pan] = S.r2[pan] == null || A[pan] < 0.05 ? sh.r2 : ease(S.r2[pan], sh.r2, 9, dt); else S.r2[pan] = null;
    }
    return S;
  }
  const smooth = {
    outline: false,
    ground(ctx, tg, s0, p, k, t, env) {
      const S = frame(env, t), pan = tg._orPan;
      if (!pan || S.owner[pan] !== tg) return;
      const a = S.panA[pan]; if (a < 0.02) return;
      const s = Object.assign({}, tg._orShape || s0); if (s.kind === 'donut' && S.r2[pan] != null) s.r2 = S.r2[pan];
      const ev = env.room.ev, jd = ev.ormjudge, sc = ev.orscales;
      const left = Math.max(0, tg.start + tg.dur - t), total = tg.tag === 'ormJudge' ? (jd && jd.dur ? jd.dur : 6.5) : 5.2;
      const pj = clampv(1 - left / total, 0.35, 1);
      // a strike on both pans at once, when the pans are level, is the lighter one
      const sk = sc && sc['strike' + pan], light = tg.tag === 'ormJudge' && (sk != null ? sk === 2 : jd && jd.rule !== 'level' && jd.rule !== 'exact' && sc && sc.nL === sc.nR && sc.nL != null);   // (orscales strikeL / strikeR: 1 struck, 2 struck lightly)
      ArenaView.areaWarning(ctx, s, pj, a * (light ? 0.72 : 1), danger(), t);
    },
  };
  // Tip the Scale: both pans take the blue of what is going to be thrown across, no damage: a pale cold wash and a pressure ring pressing in
  const tip = {
    ground(ctx, tg, s, p, k, t) {
      const col = tg.color || '#7ab8ff';
      ctx.save(); SHAPES.trace(ctx, s); ctx.fillStyle = rgba(col, (0.1 + 0.1 * p) * k); ctx.fill(); ctx.clip();
      for (let i = 0; i < 3; i++) { const q = (t * 0.45 + i / 3) % 1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - q * 0.8), 0, TAU); ctx.strokeStyle = rgba(K.frostH, Math.sin(q * Math.PI) * (0.1 + 0.3 * p) * k); ctx.lineWidth = 2.4; ctx.stroke(); }
      ctx.restore();
    },
  };
  const TELLS = { ormJudge: smooth, ormUnder: smooth, ormTwin: smooth, ormTip: tip };

  // ------------------------------------------------------------------------------------------------------------------ the water (under the red)
  // the rim flooding in: a donut of sea at the pan's edge, w wide (eased), with white-capped lines marching in
  function flood(ctx, cx, cy, w, a, t, seed) {
    if (a < 0.02 || w < 4) return;
    const R = PAN_R - 4, r0 = R - w;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, TAU); ctx.arc(cx, cy, r0, 0, TAU, true); ctx.clip('evenodd');
    const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, R + 4);
    g.addColorStop(0, rgba(K.waterD, 0)); g.addColorStop(0.45, rgba(K.waterD, 0.34 * a)); g.addColorStop(1, rgba('#7fb4ea', 0.5 * a));
    ctx.fillStyle = g; ctx.fillRect(cx - R - 8, cy - R - 8, 2 * R + 16, 2 * R + 16);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.33 + i / 4 + seed) % 1, rr = R - q * w * 0.95;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.strokeStyle = rgba(K.frostH, (1 - q) * 0.32 * a); ctx.lineWidth = 2.2 * (1 - q * 0.5); ctx.setLineDash([46, 30]); ctx.lineDashOffset = -t * 20 * (i % 2 ? 1 : -1); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
  // water standing on a pan: a lens of sea along its rim, wider with its level (0..4); sea green, with a lit edge and slow ripples
  function standing(ctx, cx, cy, lev, t, seed) {
    const R = PAN_R - 4, w = 30 + 36 * lev, r0 = R - w, a = Math.min(1, lev * 2);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, TAU); ctx.arc(cx, cy, r0, 0, TAU, true); ctx.clip('evenodd');
    const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, R + 4);
    g.addColorStop(0, rgba('#1d6f78', 0.12 * a)); g.addColorStop(0.5, rgba('#1d7d84', (0.2 + 0.04 * lev) * a)); g.addColorStop(1, rgba('#59c9bd', (0.4 + 0.05 * lev) * a));
    ctx.fillStyle = g; ctx.fillRect(cx - R - 8, cy - R - 8, 2 * R + 16, 2 * R + 16);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const q = (t * 0.18 + i / 5 + seed) % 1, rr = r0 + 6 + q * (w - 8); ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.strokeStyle = rgba('#c9fff3', Math.sin(q * Math.PI) * 0.3 * a); ctx.lineWidth = 1.8; ctx.setLineDash([34, 26]); ctx.lineDashOffset = t * 14 * (i % 2 ? 1 : -1); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r0, 0, TAU); ctx.strokeStyle = rgba('#aef5e6', 0.55 * a); ctx.lineWidth = 2.2; ctx.stroke();   // (the water's edge)
  }
  function water(ctx, room, t) {
    const S = orv(room), ev = room.ev, u = ev.ormundertow, ti = ev.ormtidein, U = S.under;
    // Undertow: each pan's width eases to what the script last said (u.pans [[pan, w]] when it names both rims, else u.pan and u.w), so a count that changes
    // moves the water rather than snapping it
    const dt = U.t < 0 ? 0 : clampv(t - U.t, 0, 0.1); U.t = t;
    const want = { L: 0, R: 0 };
    if (u && t < u.end) { if (Array.isArray(u.pans)) { for (const q of u.pans) if (want[q[0]] != null) want[q[0]] = q[1] || 0; } else if (u.pan && want[u.pan] != null) want[u.pan] = u.w || 0; }
    for (const pan of ['L', 'R']) {
      const q = U[pan]; q.w = ease(q.w, want[pan], 6, dt); q.a = ease(q.a, want[pan] > 0 ? 1 : 0, 5, dt);
      if (q.a > 0.02 && q.w > 3) { const pp = onPanAt(pan === 'L' ? 0 : 1, t); flood(ctx, pp.cx, pp.cy, q.w * clampv((t - u.start) / 0.9, 0.2, 1), q.a * 0.9, t, pan === 'L' ? 0.3 : 0.8); }
    }
    // The Tide Weighs Too (Extreme): water stands on the low pan, deeper the longer it has been there (orscales waterL / waterR, 0 to 4): the lens of sea at the rim widens
    // smoothly with the level, and the pips of the count it adds are lit in sea green. While it is being cast both rims take a little.
    const W = S.wlev, sc = ev.orscales, wdt = W.t < 0 ? 0 : clampv(t - W.t, 0, 0.1); W.t = t;
    for (const pan of ['L', 'R']) {
      W[pan] = ease(W[pan], sc ? clampv(pan === 'L' ? sc.waterL : sc.waterR, 0, 4) || 0 : 0, 2.2, wdt);
      if (W[pan] > 0.03) { const pp = onPanAt(pan === 'L' ? 0 : 1, t); standing(ctx, pp.cx, pp.cy, W[pan], t, pan === 'L' ? 0.2 : 0.7); }
    }
    const wb = ev.ormwater;
    if (wb && wb.a === 'begin' && t < wb.end) {
      const age = t - wb.start, k = Math.min(1, age / 1.0) * clampv((wb.end - t) / 0.8, 0, 1);
      for (let i = 0; i < 2; i++) { const pp = onPanAt(i, t); flood(ctx, pp.cx, pp.cy, 34 * sm(age / Math.max(1, wb.dur - 1)), k * 0.7, t, i * 0.4); }
    }
    // The Tide Comes In: both rims, as the cast runs: the water comes up over them (wider the further from level the pans were)
    if (ti && t < ti.end) {
      const age = t - ti.start, k = Math.min(1, age / 1.0) * clampv((ti.end - t) / 1.0, 0, 1), w = 56 + 16 * Math.min(4, ti.n || 0);
      for (let i = 0; i < 2; i++) { const pp = onPanAt(i, t); flood(ctx, pp.cx, pp.cy, w * sm(age / 3.4), k * 0.85, t, i * 0.5); }
    }
  }
  function onPanAt(i, t) {
    const a = ArenaView.amb;
    if (a && a.kind === 'scales' && typeof OR_ROOM !== 'undefined' && OR_ROOM.panPose) return OR_ROOM.panPose(a, i, t);
    return { cx: PANS[i].x, cy: PANS[i].y, k: 1 };
  }

  // ------------------------------------------------------------------------------------------------------------------ over the units
  // the weights in the air: a Counterweight falling onto its hero and sliding home, a weight flying into a hand or back into a cradle, lifted away
  const handOf = e => ({ x: e.x + 38, y: e.y - 2 - (e.lift || 0) });
  function over(ctx, room, t, env) {
    const S = orv(room), ev = room.ev, byId = env && env.entById;
    S.entById = byId;
    // a Counterweight on its way: a shadow growing under the marked hero, the weight falling in the last third of a second
    const d = S.drop;
    if (d && t < d.end + 0.02) {
      const e = byId && d.who != null ? byId(d.who) : null; if (e) d.pos = { x: e.x, y: e.y };
      const left = d.end - t, p = clampv(1 - left / 1.6, 0, 1);
      if (p > 0.02) {
        ctx.save(); ellipse(ctx, d.pos.x, d.pos.y + 4, 8 + 20 * p, 5 + 12 * p, 0, 'rgba(2,6,12,' + (0.1 + 0.34 * p).toFixed(3) + ')'); ctx.restore();
      }
      if (left < 0.34) { const u = 1 - left / 0.34; weight(ctx, d.pos.x, d.pos.y, d.n, { z: 300 * (1 - u) * (1 - u), t, s: 1, crack: d.crack }); }
    }
    for (let i = S.anims.length - 1; i >= 0; i--) {
      const an = S.anims[i], u = (t - an.t0) / an.dur;
      if (u >= 1) { S.anims.splice(i, 1); continue; }
      if (u < 0) continue;
      if (an.k === 'lift') {
        const e = byId && an.who != null ? byId(an.who) : null, to = e ? handOf(e) : an.from, q = easeOut(u);
        weight(ctx, an.from.x + (to.x - an.from.x) * q, an.from.y + (to.y - an.from.y) * q, an.n, { z: Math.sin(q * Math.PI) * 20 + (e ? 10 * q : 0), s: 1 - 0.05 * q, held: true, t });
      } else if (an.k === 'set') {
        const q = easeOut(u), from = an.from;
        weight(ctx, from.x + (an.to.x - from.x) * q, from.y + (an.to.y - from.y) * q, an.n, { z: Math.sin(q * Math.PI) * 22 + 10 * (1 - q), s: 0.95 + 0.05 * q, held: true, t });
      } else if (an.k === 'land') {
        const el = t - an.t0, slide = clampv((el - an.rest) / (an.dur - an.rest), 0, 1), q = sm(slide), from = an.from;
        const x = from.x + (an.to.x - from.x) * q, y = from.y + (an.to.y - from.y) * q;
        if (el < 0.35) { const r = el / 0.35; ctx.save(); ctx.beginPath(); ctx.ellipse(from.x, from.y + 6, 24 + 52 * r, 14 + 30 * r, 0, 0, TAU); ctx.strokeStyle = rgba(K.frostH, 0.55 * (1 - r)); ctx.lineWidth = 2.4 * (1 - r) + 0.6; ctx.stroke(); ctx.restore(); }
        weight(ctx, x, y, an.n, { z: 0, t, crack: an.crack });
      } else if (an.k === 'roll') {
        // a piece of a scattered weight rolls to its cradle: along the floor, or in a high arc when it has to cross to the other pan; a faint trail behind it shows the path
        const q = sm(u), cross = (an.from.x < 0) !== (an.to.x < 0), x = an.from.x + (an.to.x - an.from.x) * q, y = an.from.y + (an.to.y - an.from.y) * q;
        const hop = cross ? Math.sin(q * Math.PI) * 70 : Math.abs(Math.sin(q * Math.PI * 3 + an.seed)) * 10 * (1 - q);
        ctx.save(); ctx.beginPath(); ctx.moveTo(an.from.x, an.from.y); ctx.lineTo(x, y); ctx.strokeStyle = rgba(K.frostH, 0.55 * (1 - u)); ctx.lineWidth = 3.6; ctx.setLineDash([7, 8]); ctx.stroke(); ctx.restore();
        weight(ctx, x, y, 1, { z: hop, s: 0.9, t });
      } else if (an.k === 'shatter') {
        // the struck weight bursts: a ring, and chips of silver thrown out and falling
        const e = easeOut(u);
        ctx.save(); ctx.beginPath(); ctx.ellipse(an.at.x, an.at.y + 4, 20 + 70 * e, 12 + 40 * e, 0, 0, TAU); ctx.strokeStyle = rgba(K.frostH, 0.7 * (1 - u)); ctx.lineWidth = 3 * (1 - u) + 0.6; ctx.stroke();
        for (let c = 0; c < 9; c++) { const ang = c * 2.4 + 0.5, d = (22 + 44 * hash01(c + 3)) * e; circle(ctx, an.at.x + Math.cos(ang) * d, an.at.y + Math.sin(ang) * d * 0.7 - Math.sin(e * Math.PI) * 26 * hash01(c + 8) + 14 * e * e, 2.6 - 1.2 * u, rgba('#cfd9e6', 1 - u), K.ink, 0.8); }
        ctx.restore();
      } else if (an.k === 'away') {
        const q = easeOut(u);
        weight(ctx, an.at.x, an.at.y, an.n, { z: 190 * q, s: 1 - 0.3 * q, a: 1 - sm(u), t });
      }
    }
    // the weights in hand: each hero a head mark 'ormcarry' is on holds one up at their side
    for (const m of S.carry) {
      const e = byId && byId(m.pid); if (!e || (env.party && env.party.get(m.pid) && !env.party.get(m.pid).alive)) continue;
      const hp = handOf(e);
      weight(ctx, hp.x, hp.y, m.n || 1, { z: 10, s: 0.95, held: true, t, crack: m.crack });
    }
    // what a hero carries on them: Buoyed lifts (rising bubbles and a pale halo at the feet), a Burden presses (a dark orange ring at the feet that breathes slowly)
    for (const m of S.aura) {
      const e = byId && byId(m.pid); if (!e || (env.party && env.party.get(m.pid) && !env.party.get(m.pid).alive)) continue;
      if (m.key === 'ormburden') {
        ctx.save(); ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, 30 + 1.5 * Math.sin(t * 1.6), 19, 0, 0, TAU); ctx.strokeStyle = rgba('#ffb066', 0.35 + 0.1 * Math.sin(t * 1.6)); ctx.lineWidth = 2 + (m.n || 2) * 0.6; ctx.stroke(); ctx.restore();
      } else {
        const k = m.key === 'ormbuoyed' ? 1 : 0.65;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, e.x, e.y, 54, '#bfe6ff', 0.34 * k); ctx.restore();
        ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, 33, 21, 0, 0, TAU); ctx.fillStyle = rgba('#cfeeff', 0.14 * k); ctx.fill(); ctx.strokeStyle = rgba('#e8f8ff', 0.85 * k); ctx.lineWidth = 2.6; ctx.stroke();
        const col = ctx.createLinearGradient(0, e.y + 6, 0, e.y - 80); col.addColorStop(0, rgba('#d6f4ff', 0.28 * k)); col.addColorStop(1, rgba('#d6f4ff', 0));
        ctx.fillStyle = col; ctx.fillRect(e.x - 24, e.y - 80, 48, 86);   // (a pale column of light: lifted)
        for (let b = 0; b < 9; b++) { const q = (t * 0.6 + b / 9) % 1, bx = e.x + Math.sin(b * 2.3 + t * 1.3) * 20, by = e.y + 4 - q * 84, br = 2.6 + 2.4 * hash01(b + 2); circle(ctx, bx, by, br, rgba('#e8f8ff', 0.12 * k), rgba('#f4fcff', Math.sin(q * Math.PI) * 0.95 * k), 1.4); }
      }
    }
  }

  // ------------------------------------------------------------------------------------------------------------------ the drowned things (add kind 'drowned')
  // A sodden figure crawling on its hands, a weed-hung hood for a head with two cold lights in it, water running off it, a pale stone-grey like him. Faces +x.
  // st: { t, moving, action }. About 17 units across at scale 1 (the game draws adds at 1.5).
  function drowned(ctx, st, enraged) {
    const t = st.t || 0, mv = st.moving ? 1 : 0, b = typeof actP === 'function' ? actP(st, 'attack') : -1, lunge = b >= 0 ? Math.sin(Math.min(1, b) * Math.PI) : 0;
    const sp = 3 + mv * 5, crawl = Math.sin(t * sp), bob = Math.sin(t * (4 + mv * 4)) * (0.6 + mv * 0.5);
    const cloth = '#34495f', clothL = '#56758f', stone = '#b4c4d3', stoneD = '#7d8ea0', weed = '#1d4a3d', weedL = '#3b8f76';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 24, K.frost, 0.2); ctx.restore();   // (a cold sheen: wet, and pale on the dark water)
    // the wet it stands in: rings that spread, and a dark pool
    ellipse(ctx, -1, 1, 17, 12, 0, 'rgba(4,14,26,0.45)');
    for (let i = 0; i < 2; i++) { const q = (t * 0.5 + i / 2) % 1; ctx.beginPath(); ctx.ellipse(-1, 1, 10 + q * 12, 7 + q * 8, 0, 0, TAU); ctx.strokeStyle = rgba(K.frostH, 0.28 * (1 - q)); ctx.lineWidth = 1.2; ctx.stroke(); }
    // the legs trailing, the weed dragging after it
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const sy of [-1, 1]) {
      const sw = Math.sin(t * sp + (sy > 0 ? Math.PI : 0)) * (1 + mv * 1.8);
      ctx.beginPath(); ctx.moveTo(-6, sy * 3.5); ctx.quadraticCurveTo(-12, sy * (5 + sw * 0.5), -17 - sw, sy * (7 + sw * 0.4)); ctx.strokeStyle = K.ink; ctx.lineWidth = 5.4; ctx.stroke(); ctx.strokeStyle = cloth; ctx.lineWidth = 3.4; ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const y0 = (i - 1.5) * 2.6, w = Math.sin(t * 2.2 + i * 1.7) * 2;
      ctx.beginPath(); ctx.moveTo(-8, y0); ctx.bezierCurveTo(-14, y0 + w, -19, y0 - w, -25 - i * 2, y0 + w * 1.5); ctx.strokeStyle = i % 2 ? weed : weedL; ctx.lineWidth = 2.2; ctx.stroke();
    }
    // the arms: reaching, one then the other, hands of the same drowned stone
    for (const sy of [-1, 1]) {
      const ph = Math.sin(t * sp + (sy > 0 ? 0 : Math.PI)), reach = 14 + ph * (1.5 + mv * 3) + lunge * 8, hy = sy * (8.5 + ph * 0.5);
      ctx.beginPath(); ctx.moveTo(3, sy * 6); ctx.quadraticCurveTo(8, sy * 11, reach, hy); ctx.strokeStyle = K.ink; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = clothL; ctx.lineWidth = 3.8; ctx.stroke();
      circle(ctx, reach + 1.5, hy, 3.4, stone, K.ink, 1.3);
      for (let f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(reach + 3, hy + f * 1.4); ctx.lineTo(reach + 6.6, hy + f * 2.4); ctx.strokeStyle = stoneD; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    // the body: a sodden bundle of cloth with the stone showing through the rents
    ctx.save(); ctx.translate(0, bob * 0.3);
    ellipse(ctx, 0, 0, 11, 8.6, 0, cloth, K.ink, 2);
    ellipse(ctx, -1.5, -2, 7.6, 3.6, -0.1, rgba(clothL, 0.8));
    for (const [x, y, r] of [[-3, 3, 1.5], [2, 4, 1.1], [-6, -2, 1.2]]) circle(ctx, x, y, r, stone);
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.quadraticCurveTo(0, 2 + crawl * 0.6, 7, -3); ctx.strokeStyle = 'rgba(8,16,28,0.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    // weed laid over its back
    for (let i = 0; i < 3; i++) { const a0 = -4 + i * 4, w = Math.sin(t * 1.8 + i * 2.3) * 1.6; ctx.beginPath(); ctx.moveTo(a0, -6); ctx.quadraticCurveTo(a0 - 3, 2 + w, a0 - 9, 6 + w); ctx.strokeStyle = weedL; ctx.lineWidth = 1.8; ctx.stroke(); }
    ctx.restore();
    // the head: a bowed hood of weed, two cold lights, the bite a dark mouth thrust forward
    const hx = 11 + lunge * 6, hy = Math.sin(t * 3.1) * 0.5 + bob * 0.4;
    ctx.save(); ctx.translate(hx, hy);
    circle(ctx, 0, 0, 6.2, stoneD, K.ink, 1.8);
    ellipse(ctx, -1, 0, 5.4, 5.8, 0, rgba(weed, 0.95));
    for (let i = 0; i < 5; i++) { const a = -2.4 + i * 1.2, w = Math.sin(t * 2.6 + i) * 1.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); ctx.quadraticCurveTo(Math.cos(a) * 8 - 3, Math.sin(a) * 8 + w, Math.cos(a) * 11 - 6, Math.sin(a) * 11 + w * 1.6); ctx.strokeStyle = i % 2 ? weed : weedL; ctx.lineWidth = 1.6; ctx.stroke(); }
    if (lunge > 0.2) ellipse(ctx, 4.4, 0, 2.6, 2.1 + lunge, 0, '#02060c');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 3.2, -2, 4.4, K.frostH, 0.6); glow(ctx, 3.2, 2, 4.4, K.frostH, 0.6); ctx.restore();
    circle(ctx, 3.2, -2, 1.1, '#f4fbff'); circle(ctx, 3.2, 2, 1.1, '#f4fbff');
    ctx.restore();
    // water running off it
    for (let i = 0; i < 5; i++) { const q = (t * (0.7 + 0.2 * hash01(i + 3)) + hash01(i)) % 1, x = -8 + i * 4.5, y = (hash01(i + 9) - 0.5) * 12; ctx.beginPath(); ctx.moveTo(x, y + q * 3); ctx.lineTo(x - 1, y + q * 3 + 4 * q); ctx.strokeStyle = rgba(K.frostH, 0.5 * (1 - q)); ctx.lineWidth = 1.2; ctx.stroke(); }
  }

  // ------------------------------------------------------------------------------------------------------------------ wiring
  // the room's own drawing methods: this file adds to them rather than asking arena-view.js to know about him
  const isScales = () => ArenaView.amb && ArenaView.amb.kind === 'scales';
  const baseUnder = ArenaView.drawRoomUnder, baseOver = ArenaView.drawRoomOver, baseLife = ArenaView.scalesLife, baseEvent = ArenaView.roomEvent;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    baseUnder.call(this, ctx, room, t, v);
    if (isScales()) { try { water(ctx, room, t); } catch (e) { fail('water', e); } }
  };
  ArenaView.drawRoomOver = function (ctx, room, t, env) {
    baseOver.call(this, ctx, room, t, env);
    if (isScales()) { try { over(ctx, room, t, env); } catch (e) { fail('over', e); } }
  };
  ArenaView.scalesLife = function (ctx, a, t) {
    baseLife.call(this, ctx, a, t);
    try { pips(ctx, a, t); } catch (e) { fail('pips', e); }
  };
  ArenaView.roomEvent = function (room, msg, now, entById) {
    baseEvent.apply(this, arguments);
    if (typeof msg.k === 'string' && msg.k.startsWith('orm')) { try { event(room, msg, now, entById); } catch (e) { fail('event', e); } }
  };
  ArenaView.ormProp = prop;
  if (typeof ADD_ART !== 'undefined') ADD_ART.drowned = drowned;

  // main.js calls this once a frame (updateArena) with what only it has: how to find a hero, and the head marks (who holds which weight)
  function frameUpdate(raid, now, entById) {
    const S = orv(raid.room); S.entById = entById; S.carry = [];
    // the floor is only the pans once the bridge is down (read from the state event, so a rejoining client has it too): hero clamping, dashes and the clip of every telegraph
    // follow ARENA; it is put back whole by the next fight's ARENA.use
    const st = raid.room.ev.orscales;
    if (st && typeof ARENA !== 'undefined' && ARENA.kind === 'union' && ARENA.parts) {
      const gone = st.bridge === false;
      if (gone && !S.cut) { ARENA.parts = ARENA.parts.filter(q => q.kind !== 'rect'); S.cut = true; }
      else if (!gone && S.cut) { ARENA.use('ormun'); S.cut = false; }
    }
    for (const m of raid.hmarks.values()) if (m.key === 'ormcarry') S.carry.push({ pid: m.pid, n: m.n, crack: m.col === '#9fb0c6' });
    // heroes who weigh less or more than one (head marks), and on which pan the lighter ones stand (the pips keep a hollow socket for each)
    S.aura = []; S.buoyed.L = S.buoyed.R = 0;
    for (const m of raid.hmarks.values()) {
      if (m.key !== 'ormbuoyed' && m.key !== 'ormbuoy' && m.key !== 'ormburden') continue;
      S.aura.push({ pid: m.pid, key: m.key, n: m.n });
      if (m.key === 'ormbuoyed') { const e = entById(m.pid); if (e) { const l = Math.hypot(e.x + 380, e.y - 60) <= 300, r = Math.hypot(e.x - 380, e.y - 60) <= 300; if (l) S.buoyed.L++; else if (r) S.buoyed.R++; } }
    }
    // Double Judgement: is the judgement that has just begun the first of a pair (the next one in the feed falls 2.6 s after this bar ends), or the second of one?
    const jd = raid.room.ev.ormjudge;
    if (jd && jd.start !== S.jStart) { S.jStart = jd.start; S.jDec = false; }
    if (jd && !S.jDec) {
      const pr = S.pair, age = now - jd.start;
      if (pr && pr.e1 != null && pr.s2 == null && jd.start >= pr.e1 - 0.3 && jd.start - pr.e1 < 5) { pr.s2 = jd.start; pr.e2 = jd.start + jd.dur; S.jDec = true; }
      else if (age < 1.5) {
        const l = raid.bnext && raid.bnext.l && raid.bnext.l[0];
        if (l && JNAMES[l[0]]) { const d = raid.bnext.at + l[1] - (jd.start + jd.dur); if (d > 1.2 && d < 4.2) { S.pair = { e1: jd.start + jd.dur, s2: null, e2: null }; S.jDec = true; } }
      } else S.jDec = true;
    }
    if (S.pair && ((S.pair.e2 != null && now > S.pair.e2 + 1.5) || (S.pair.s2 == null && now > S.pair.e1 + 6))) S.pair = null;
    // (a rejoining client is not sent head marks: if the script's state event names who carries what (orscales.carry: [[pid, n]]) that is read too)
    const sc = raid.room.ev.orscales;
    if (sc && Array.isArray(sc.carry)) for (const q of sc.carry) if (!S.carry.some(m => m.pid === q[0])) S.carry.push({ pid: q[0], n: q[1] });
    props(raid, now);
  }

  return { camera, setWide, wide: () => wideCur, release, frame: frameUpdate, tell: tag => TELLS[tag] || null, weight, drowned };
})();
