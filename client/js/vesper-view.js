// Vesper, the Mirror Knight: the two rooms made real in the running game. Loaded after vesper-room.js and arena-view.js.
// vesper.js (the script) stores every danger in HALL coordinates and names the room it is painted in by its tag (the CONTRACT block at the top of that
// file); the room events say where the mirror is. This file reads them and draws:
//   the camera      the hall, opened toward the glass only as far as something live there reaches (north: up to 960 x 1040, east: up to 1920 x 520; the line: the hall alone), easing as it opens and closes
//   the twins       every living hero a second time in the glass (silver, dim, mirrored); on the line they stand in the hall itself as ghosts;
//                   in the wall the heroes pulled through are drawn in the glass and their twins in the hall; your own twin has a small quiet mark
//   the dangers     'vh' tags are painted in the hall, 'vg' tags at mirror(shape) in the glass only, 'vb' tags in both (the shared drawing is unchanged:
//                   a copy of the telegraph with its shape mirrored is handed to it, and the landing flash is routed the same way)
//   the Glass Knight  stands at twin(Vesper) plus the script's step (vsstep, vscut), mirrors her facing, takes the opposite pose where the cast is
//                   asymmetric (Counterpoint, Cross-Cut), swings on her own dance cuts
//   the line (Act V) a bright standing line through the hall and the glass tint
// Everything is read from room events (room.vs is rebuilt from them, also when a snapshot replays them with their age) and from the boss update the
// client already has. Hooks (one line each): main.js (camera, entities, flip restore, mouseWorld), boss-vfx.js (impact routing).
// Not sent that this wanted: the heroes pulled through by the wall (vsflip carries no dur, so a rejoin mid-wall does not replay it).

const VS_VIEW = (() => {
  const HW = 480, HH = 260, GAP = 2 * HH;   // the hall's half sizes; the shift of a body pulled through on the north mirror (520)
  const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = q => { q = clampv(q, 0, 1); return q * q * (3 - 2 * q); };
  const NORTH = { kind: 'n', px: 0, py: 0, nx: 0, ny: 1 }, EAST = { kind: 'e', px: 0, py: 0, nx: 1, ny: 0 };

  // ------------------------------------------------------------------------------------------------ the mirror
  function twinPt(m, x, y) {
    if (m.kind === 'n') return [x, -2 * HH - y];
    if (m.kind === 'e') return [2 * HW - x, y];
    const k = 2 * ((x - m.px) * m.nx + (y - m.py) * m.ny);
    return [x - k * m.nx, y - k * m.ny];
  }
  function twinAng(m, a) {
    if (m.kind === 'n') return -a;
    if (m.kind === 'e') return Math.PI - a;
    const dx = Math.cos(a), dy = Math.sin(a), k = 2 * (dx * m.nx + dy * m.ny);
    return Math.atan2(dy - k * m.ny, dx - k * m.nx);
  }
  // a shape's mirror image (circles and donuts mirror their centre, cones, rects and crosses their origin and angle)
  function mirrorShape(m, s) {
    if (!s || s.kind === 'lit') return s;
    const [x, y] = twinPt(m, s.x, s.y), o = Object.assign({}, s, { x, y });
    if (s.angle != null) o.angle = twinAng(m, s.angle);
    return o;
  }

  // ------------------------------------------------------------------------------------------------ the room's state (rebuilt from room events)
  const fresh = () => ({
    mirror: Object.assign({ t0: -999 }, NORTH), step: { ox: 0, oy: 0 }, cuts: [], vcuts: [], flip: new Map(), gkStep: null, fall: -1,
    mode: null, modeAt: -999, cur: null, prev: null,   // what is shown (north | east | dark | line), when it began, the mirrors of the two latest states
    off: null, offT: 0, gkSt: { t: 0, moving: false, action: null, props: {}, raid: true }, cam: null, seen: null,   // (seen: where the bodies, twins, Vesper and the Glass Knight were drawn last frame, for the camera)
    hands: [], lag: new Map(), wrong: new Map(), trail: new Map(), trade: null, tradedLand: -1, gkAt: null,   // (Hard's hand mirrors; Extreme's lagging and wrong-handed twins, each hero's last 3 s, the knights' swap)
  });
  const S = room => room.vs || (room.vs = fresh());
  const isVesperRoom = room => !!(room && room.vs) || (typeof ArenaView !== 'undefined' && ArenaView.amb && ArenaView.amb.kind === 'argent');

  function onRoom(room, msg, now) {
    if (typeof msg.k !== 'string' || !msg.k.startsWith('vs')) return;
    const s = S(room);
    switch (msg.k) {
      case 'vsmirror': s.mirror = { kind: msg.kind === 'e' || msg.kind === 'line' ? msg.kind : 'n', px: msg.px || 0, py: msg.py || 0, nx: msg.nx == null ? 0 : msg.nx, ny: msg.ny == null ? 1 : msg.ny, t0: now }; break;
      case 'vsstep': s.step = { ox: msg.ox || 0, oy: msg.oy || 0 }; break;
      case 'vscut':
        if (msg.traded) s.tradedLand = Math.max(s.tradedLand, now + (msg.at || 0));
        if (msg.who === 'v' || msg.who === 'vg') { s.vcuts.push({ land: now + (msg.at || 0), t0: now }); if (s.vcuts.length > 8) s.vcuts.shift(); }   // (her own cuts: her swing is gathered across the time to the landing, vesper-art.js)
        if (msg.who === 'g' || msg.who === 'vg') { s.cuts.push({ land: now + (msg.at || 0), t0: now, ox: msg.ox, oy: msg.oy }); if (s.cuts.length > 8) s.cuts.shift(); }
        break;
      case 'vsflip': {
        const kind = s.mirror.kind === 'e' ? 'e' : 'n';
        for (const id of msg.ids || []) {
          const was = flipK(s, id, now), f = s.flip.get(id);
          if (msg.on) s.flip.set(id, { on: true, t0: now, from: was, kind: was > 0 && f ? f.kind : kind });
          else if (f) s.flip.set(id, { on: false, t0: now, from: was, kind: f.kind });
        }
        break;
      }
      case 'vshand': { s.hands.push({ t0: now, x: msg.x, y: msg.y, a: msg.a, len: msg.len || 300, span: msg.span || 110, land: now + (msg.at || 0), end: now + (msg.at || 0) + (msg.life || 11), brk: -1, from: s.gkAt ? { x: s.gkAt.x, y: s.gkAt.y } : null }); if (s.hands.length > 6) s.hands.shift(); break; }
      case 'vshandbreak': { let b = null, bd = 1e9; for (const h of s.hands) { const d = Math.hypot(h.x - msg.x, h.y - msg.y); if (h.brk < 0 && d < bd) { bd = d; b = h; } } if (b && bd < 8) b.brk = now; break; }
      case 'vslag': for (const id of msg.ids || []) s.lag.set(id, { from: now + (msg.at || 0), end: now + (msg.at || 0) + 12 }); break;
      case 'vswrong': for (const id of msg.ids || []) s.wrong.set(id, { from: now + (msg.at || 0), end: now + (msg.at || 0) + 12 }); break;
      case 'vsdance': s.trade = null; s.tradedLand = -1; break;
      case 'vstrade': s.trade = { t0: now, end: Infinity }; break;
      case 'vsdanceend': if (s.trade) s.trade.end = Math.min(s.trade.end, now); break;
      case 'vsgkstep': s.gkStep = { t0: now, x: msg.x, y: msg.y, dur: msg.dur || 1.2 }; break;
      case 'vsfall': s.fall = now; break;
    }
  }
  // how far a hero is through the glass now (0 in the hall .. 1 in the glass), eased over a little over half a second
  function flipK(s, id, now) {
    const f = s.flip.get(id); if (!f) return 0;
    const q = smooth((now - f.t0) / 0.55);
    if (f.on) return f.from + (1 - f.from) * q;
    const k = f.from * (1 - q);
    if (k <= 0.001) { s.flip.delete(id); return 0; }
    return k;
  }

  // which state is shown: the mirror's own, and dark from the Act V opener until the line is planted (as vesper-room.js decides)
  function modeNow(room) {
    const s = S(room), ev = room.ev || {};
    let m = s.mirror.kind === 'e' ? 'east' : s.mirror.kind === 'line' ? 'line' : 'north';
    if (ev.vsact && ev.vsact.n >= 5 && (m === 'north' || m === 'east')) m = 'dark';
    return m;
  }
  const mirrorFor = (m, s) => (m === 'north' ? NORTH : m === 'east' ? EAST : m === 'line' ? Object.assign({}, s.mirror) : null);
  // call once a frame (the camera and the entities both do; it only acts on a change)
  function track(room, now) {
    const s = S(room), m = modeNow(room);
    if (s.mode == null) { s.mode = m; s.modeAt = -999; s.cur = mirrorFor(m, s); s.prev = null; return s; }
    if (m !== s.mode) { s.prev = s.cur; s.prevMode = s.mode; s.mode = m; s.modeAt = now; s.cur = mirrorFor(m, s); }
    else if (m === 'line' && s.cur) Object.assign(s.cur, s.mirror);   // (the line's numbers arrive a moment after the mode flips)
    return s;
  }
  // the layers things in the glass are drawn in: the current state, and the one fading out as it changes (alpha 0..1 each)
  function layers(s, now) {
    const since = now - s.modeAt, out = [];
    if (s.cur) {
      const a = s.mode === 'line' ? smooth(since / 0.9) : smooth((since - 0.5) / 1.0);
      if (a > 0.01) out.push({ m: s.cur, a, mode: s.mode });
    }
    if (s.prev && since < 0.8) { const a = 1 - smooth(since / 0.7); if (a > 0.01) out.push({ m: s.prev, a, mode: s.prevMode }); }
    return out;
  }

  // ------------------------------------------------------------------------------------------------ the camera
  // What the picture must hold, now (not both rooms whole: on a small window that shrinks every hero and every telegraph to half size):
  //   always      the hall (the bodies, Vesper and every danger painted in the hall stand in it)
  //   in the glass only while it matters: the box round each live danger painted there (never clipped short of its edge), the twins standing within reach of one,
  //               the Glass Knight if she stands near one, and any body the wall has pulled through (drawn in the glass)
  // So a hall with no glass danger on it fills the screen, and the view opens toward the glass exactly as far as the dangers there reach. Nothing live is
  // ever left off the screen; the view only chooses not to show glass floor with nothing in it. The box eases: it opens quickly, and closes slowly after
  // a hold, edge by edge, so a danger that comes and goes does not pump the zoom. The HUD is measured (below) and the box goes into the free space.
  const FRAME = {   // (the states where the glass is the hall's own tint, and the rooms' whole frames: the base, and the extent the cast bar keeps clear of)
    north: { x0: -HW - 14, x1: HW + 14, y0: -3 * HH - 14, y1: HH + 14 },
    east: { x0: -HW - 14, x1: 3 * HW + 14, y0: -HH - 14, y1: HH + 14 },
    hall: { x0: -HW - 40, x1: HW + 40, y0: -HH - 40, y1: HH + 40 },
  };
  const GLASS_N = { x0: -HW - 4, x1: HW + 4, y0: -3 * HH - 4, y1: -HH }, GLASS_E = { x0: HW, x1: 3 * HW + 4, y0: -HH - 4, y1: HH + 4 };
  const NEAR = 150, PADB = 32;   // (how far a twin or the Glass Knight may stand from a glass danger and still be held in the picture; the room round a danger's box)
  const HOLD = 2, K_OPEN = 12, K_CLOSE = 1.3, K_TURN = 4;   // (the box: seconds an edge is held after it was last wanted, and its easing rates out and in, per second)
  // the box round a telegraph shape (null for a shape with no place: the lit blast covers everything)
  function shapeBox(sh) {
    if (!sh) return null;
    const pts = [];
    switch (sh.kind) {
      case 'circle': case 'donut': case 'lune': return { x0: sh.x - sh.r, x1: sh.x + sh.r, y0: sh.y - sh.r, y1: sh.y + sh.r };
      case 'cone': {
        pts.push([sh.x, sh.y]);
        const n = Math.max(2, Math.ceil((sh.arc || 0) / 0.25));
        for (let i = 0; i <= n; i++) { const a = sh.angle - sh.arc / 2 + sh.arc * i / n; pts.push([sh.x + Math.cos(a) * sh.r, sh.y + Math.sin(a) * sh.r]); }
        break;
      }
      case 'rect': {
        const c = Math.cos(sh.angle), sn = Math.sin(sh.angle), hw = sh.w / 2;
        for (const [u, v] of [[0, -hw], [sh.len, -hw], [sh.len, hw], [0, hw]]) pts.push([sh.x + c * u - sn * v, sh.y + sn * u + c * v]);
        break;
      }
      case 'cross': {
        for (const rot of [0, Math.PI / 2]) {
          const a = sh.angle + rot, c = Math.cos(a), sn = Math.sin(a), hw = sh.w / 2;
          for (const [u, v] of [[-sh.len, -hw], [sh.len, -hw], [sh.len, hw], [-sh.len, hw]]) pts.push([sh.x + c * u - sn * v, sh.y + sn * u + c * v]);
        }
        break;
      }
      default: return null;
    }
    const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    for (const [x, y] of pts) { if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
    return b;
  }
  const clipBox = (b, r) => {
    if (!b) return null;
    const o = { x0: Math.max(b.x0, r.x0), x1: Math.min(b.x1, r.x1), y0: Math.max(b.y0, r.y0), y1: Math.min(b.y1, r.y1) };
    return o.x0 < o.x1 && o.y0 < o.y1 ? o : null;
  };
  const grow = (b, p) => ({ x0: b.x0 - p, x1: b.x1 + p, y0: b.y0 - p, y1: b.y1 + p });
  const dist = (b, x, y) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
  const unite = (a, b) => { if (b.x0 < a.x0) a.x0 = b.x0; if (b.x1 > a.x1) a.x1 = b.x1; if (b.y0 < a.y0) a.y0 = b.y0; if (b.y1 > a.y1) a.y1 = b.y1; };
  // the box to be held now: { box, glass } (glass: the picture reaches into the glass for something live)
  function needBox(raid, s, now) {
    const seen = s.seen;
    if (s.mode !== 'north' && s.mode !== 'east') return { box: Object.assign({}, FRAME.hall), glass: false };
    const north = s.mode === 'north', f = FRAME[s.mode], h = FRAME.hall;
    // (the hall alone, with the wall's margin on the side the glass opens from and the glass frame's own on the others, so opening and closing moves one edge)
    const box = north ? { x0: f.x0, x1: f.x1, y0: h.y0, y1: f.y1 } : { x0: f.x0, x1: h.x1, y0: f.y0, y1: f.y1 };
    const mk = north ? NORTH : EAST, G = north ? GLASS_N : GLASS_E, items = [];
    // A danger in both rooms is one danger, painted twice: a body is struck by the hall's and the twin standing at its mirror by the glass's, always together.
    // Its glass painting is held in the picture only when the two can part: a body drawn in the glass (the wall), or a twin that does not stand at the mirror (Extreme's marks).
    const odd = s.flip.size > 0 || [...s.lag.values(), ...s.wrong.values()].some(q => now < q.end + 0.5);
    for (const tg of raid.tgs.values()) {
      const r = roomOf(tg);
      if (tg.hidden || (tg.gone != null && now - tg.gone > 0.8) || r === 'h' || (r === 'b' && !odd)) continue;   // (a resolved one is held for its landing; a hall danger is inside the hall)
      const b = clipBox(shapeBox(mirrorShape(mk, tg.live)), G);
      if (b) items.push(grow(b, PADB));
    }
    if (seen) {
      for (const p of seen.bodies) if (p.x < -HW - 6 || p.x > HW + 6 || p.y < -HH - 6 || p.y > HH + 6) items.push({ x0: p.x - 70, x1: p.x + 70, y0: p.y - 110, y1: p.y + 50 });   // (a body the wall pulled through, drawn in the glass)
      const near = (x, y) => items.some(b => dist(b, x, y) < NEAR);
      if (items.length) {
        const keep = [];
        for (const p of seen.twins) if (near(p.x, p.y)) keep.push({ x0: p.x - 60, x1: p.x + 60, y0: p.y - 100, y1: p.y + 40 });
        if (seen.gk && near(seen.gk.x, seen.gk.y)) keep.push({ x0: seen.gk.x - 100, x1: seen.gk.x + 100, y0: seen.gk.y - 150, y1: seen.gk.y + 40 });
        items.push(...keep);
      }
      if (seen.boss && (seen.boss.x < -HW || seen.boss.x > HW || seen.boss.y < -HH || seen.boss.y > HH)) items.push({ x0: seen.boss.x - 130, x1: seen.boss.x + 130, y0: seen.boss.y - 200, y1: seen.boss.y + 70 });   // (Vesper herself, while the knights have traded rooms)
    }
    for (const b of items) unite(box, b);
    if (items.length) { const full = FRAME[s.mode]; box.x0 = Math.max(box.x0, full.x0); box.x1 = Math.min(box.x1, full.x1); box.y0 = Math.max(box.y0, full.y0); box.y1 = Math.min(box.y1, full.y1); }   // (never past the rooms' whole frame, the widest the picture opens)
    return { box, glass: items.length > 0 };
  }

  // The HUD is arrangeable, so its panels are measured, not assumed: the rectangles of whatever is docked (party frames wherever they sit, the boss
  // plate, the damage meter, the hotbar, the raid buttons), read from the DOM about twice a second. The box goes into the free rectangle that
  // lets it zoom the most, as near the middle of the screen as it can stand there, with a small margin.
  const HUD_SEL = ['#raid-left', '#party-strip', '#boss-bar', '#waymarks', '#raid-leave', '#live-meter', '#combat-hud', '#menu-chip', '#bag-btn'];
  const MARGIN = 10, ZMAX = 1.1;
  let hudRects = [], hudKey = '', hudAt = -9, hudW = 0, hudH = 0;
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
    const key = out.map(r => [r.l, r.t, r.r, r.b].map(Math.round).join(',')).join(';');
    if (key !== hudKey) { hudKey = key; hudRects = out; }
    return hudRects;
  }
  const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  // the free rectangles (edges on the screen's and the panels' edges, none touching a panel, none that cannot grow without touching one), once per HUD layout
  let freeKey = '', freeList = [];
  function freeRects(W, H, rects) {
    const key = hudKey + '|' + W + 'x' + H;
    if (key === freeKey) return freeList;
    const xs = [...new Set([0, W, ...rects.flatMap(r => [r.l, r.r])].map(v => clampv(v, 0, W)))].sort((a, b) => a - b);
    const ys = [...new Set([0, H, ...rects.flatMap(r => [r.t, r.b])].map(v => clampv(v, 0, H)))].sort((a, b) => a - b);
    const free = R => !rects.some(o => hit(R, o)), list = [];
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
      if (xs[j] - xs[i] < 120) continue;
      for (let k = 0; k < ys.length; k++) for (let l = k + 1; l < ys.length; l++) {
        if (ys[l] - ys[k] < 120) continue;
        const R = { l: xs[i], t: ys[k], r: xs[j], b: ys[l] };
        if (!free(R)) continue;
        if ((i > 0 && free({ l: xs[i - 1], t: R.t, r: R.r, b: R.b })) || (j < xs.length - 1 && free({ l: R.l, t: R.t, r: xs[j + 1], b: R.b })) ||
            (k > 0 && free({ l: R.l, t: ys[k - 1], r: R.r, b: R.b })) || (l < ys.length - 1 && free({ l: R.l, t: R.t, r: R.r, b: ys[l + 1] }))) continue;   // (it could be larger)
        list.push(R);
      }
    }
    if (!list.length) list.push({ l: 0, t: 0, r: W, b: H });
    freeKey = key; freeList = list;
    return list;
  }
  // a fw x fh world box at the largest zoom a free rectangle allows; where on the screen: as near the middle as that rectangle lets it stand. `prefer`
  // (the rectangle used last) is kept unless another gives a clearly larger zoom, so the box does not hop between two that are all but equal.
  function place(fw, fh, W, H, rects, prefer) {
    const list = freeRects(W, H, rects);
    const eval1 = R => {
      const z = Math.min((R.r - R.l - 2 * MARGIN) / fw, (R.b - R.t - 2 * MARGIN) / fh, ZMAX), cw = fw * z / 2 + MARGIN, ch = fh * z / 2 + MARGIN;
      const sx = clampv(W / 2, R.l + cw, Math.max(R.l + cw, R.r - cw)), sy = clampv(H / 2, R.t + ch, Math.max(R.t + ch, R.b - ch));
      return { z, sx, sy, d: Math.hypot(sx - W / 2, sy - H / 2), R };
    };
    let best = null;
    for (const R of list) { const c = eval1(R); if (!best || c.z > best.z + 0.004 || (c.z > best.z - 0.004 && c.d < best.d)) best = c; }
    if (prefer && list.includes(prefer)) { const c = eval1(prefer); if (c.z >= best.z - 0.02) return c; }
    return best;
  }
  // returns { zoom, x, y } (x, y the screen's top-left in the world) for the raid's room; also where the cast bar goes (dockCast)
  function camera(raid, now, W, H, plate, dt, snap, out = 1) {
    const room = raid.room, s = track(room, now), rects = hud(W, H);
    const nd = needBox(raid, s, now), tb = nd.box;
    let c = s.cam;
    const fresh1 = !c || snap || c.raid !== raid;
    if (fresh1) c = s.cam = { raid, box: Object.assign({}, tb), hold: { x0: now, x1: now, y0: now, y1: now }, R: null, z: 0, sx: 0, sy: 0 };
    else {
      const d = Math.min(dt || 0, 0.1), turn = now - s.modeAt < 3 && s.modeAt > -900;   // (the glass has just turned from one wall to the other: the old side is let go of at once, not held)
      const kOut = 1 - Math.exp(-K_OPEN * d), kIn = 1 - Math.exp(-(turn ? K_TURN : K_CLOSE) * d);
      for (const q of ['x0', 'x1', 'y0', 'y1']) {
        const wantsOut = q[1] === '0' ? tb[q] <= c.box[q] + 0.5 : tb[q] >= c.box[q] - 0.5;   // (the box is, or has to grow to be, at least this wide)
        if (wantsOut) { c.hold[q] = now; if (tb[q] !== c.box[q]) c.box[q] += (tb[q] - c.box[q]) * kOut; }
        else if (turn || now - c.hold[q] > HOLD) c.box[q] += (tb[q] - c.box[q]) * kIn;
      }
    }
    const b = c.box, f = place(b.x1 - b.x0, b.y1 - b.y0, W, H, rects, c.R);
    c.R = f.R;
    if (fresh1) { c.z = f.z; c.sx = f.sx; c.sy = f.sy; }
    else {
      const d = Math.min(dt || 0, 0.1), k = 1 - Math.exp(-9 * d);
      c.z = Math.min(f.z, c.z + (f.z - c.z) * k);   // (it zooms out at once as the box grows, and in a little behind it: what is live never leaves the picture)
      c.sx += (f.sx - c.sx) * k; c.sy += (f.sy - c.sy) * k;
    }
    // where the rooms will stand on the screen at their widest (the whole hall and glass, and the hall alone at its largest zoom): the cast bar keeps clear of both
    let dock = null;
    for (const fr of s.mode === 'north' || s.mode === 'east' ? [FRAME[s.mode], FRAME.hall] : [FRAME.hall]) {
      const q = place(fr.x1 - fr.x0, fr.y1 - fr.y0, W, H, rects, null), zt = q.z * out, cx = (fr.x0 + fr.x1) / 2, cy = (fr.y0 + fr.y1) / 2;
      const r = { l: q.sx + (fr.x0 - cx) * zt, t: q.sy + (fr.y0 - 130 - cy) * zt, r: q.sx + (fr.x1 - cx) * zt, b: q.sy + (fr.y1 - cy) * zt };   // (130: the north wall's windows stand above the floor)
      dock = dock ? { l: Math.min(dock.l, r.l), t: Math.min(dock.t, r.t), r: Math.max(dock.r, r.r), b: Math.max(dock.b, r.b) } : r;
    }
    dockCast(dock, W, H, rects);
    const zoom = c.z * out, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    return { zoom, x: cx - c.sx / zoom, y: cy - c.sy / zoom };
  }

  // ------------------------------------------------------------------------------------------------ the boss's cast bar
  // The big cast box (#boss-cast, raid-ui.js) sits mid-screen by default, which is over the glass hall or the mirror seam. In this fight, and only while
  // the player has not put it somewhere themselves (localStorage 'emberfall.castFrame', its drag), it is docked in free space: the spot nearest its
  // normal one that overlaps neither a HUD panel nor the rooms. release() gives the normal position back when the raid ends.
  const CAST_KEY = 'emberfall.castFrame', CAST_W = 330, CAST_H = 70;
  let docked = null, castKey = '', castAt = 0, castOwn = false, castPos = null;
  function placed() { try { return localStorage.getItem(CAST_KEY) != null; } catch (e) { return false; } }
  function dockCast(room, W, H, rects) {
    const el = typeof document !== 'undefined' ? document.getElementById('boss-cast') : null; if (!el) return;
    const t = performance.now() / 1000;
    if (t - castAt > 0.4) { castAt = t; castOwn = placed(); }
    if (castOwn || el.classList.contains('dragging')) return;   // (theirs: left where they put it)
    const key = [room.l, room.t, room.r, room.b].map(Math.round).join(',') + '|' + hudKey + '|' + W + 'x' + H;
    if (key !== castKey) {
      castKey = key;
      const R = { l: room.l - 8, t: room.t - 8, r: room.r + 8, b: room.b + 8 }, px = W / 2, py = H * 0.26;
      let best = null;
      for (let y = CAST_H / 2 + 4; y <= H - CAST_H / 2 - 4; y += 12) for (let x = CAST_W / 2 + 4; x <= W - CAST_W / 2 - 4; x += 12) {
        const B = { l: x - CAST_W / 2, t: y - CAST_H / 2, r: x + CAST_W / 2, b: y + CAST_H / 2 };
        let over = 0;
        for (const o of [R, ...rects]) { const w = Math.min(B.r, o.r) - Math.max(B.l, o.l), h = Math.min(B.b, o.b) - Math.max(B.t, o.t); if (w > 0 && h > 0) over += w * h; }
        const sc = over + 0.02 * Math.hypot(x - px, y - py);
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
    docked = null; castKey = '';
  }

  // ------------------------------------------------------------------------------------------------ the heroes' twins
  let moved = [];
  const idOf = (e, api) => (e === api.me || e.id === undefined ? api.meId : e.id);
  function flipEnd() { for (const m of moved) { m.e.x = m.x; m.e.y = m.y; if (m.f != null) m.e.f = m.f; } moved = []; }

  let scratch = null;
  // one twin: the hero's own drawing, into a layer of its own, washed silver and dimmed, then laid down mirrored (handedness flips)
  function drawTwin(ctx, e, tx, ty, ang, a, o) {
    const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 }, px = clampv(Math.hypot(m.a, m.b) || 1, 0.5, 3);
    const box = Math.ceil(HERO_BOX * o.scale * px * 1.02);
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width !== box || scratch.height !== box) { scratch.width = box; scratch.height = box; }
    const c = scratch.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, box, box);
    c.setTransform(px, 0, 0, px, box / 2, box / 2);
    // (drawn facing π - the mirrored angle: the horizontal flip below turns it into the mirrored angle itself)
    try { drawHero(c, e.cls, 0, 0, Math.PI - ang, e.st, o.scale, { spec: e.spec, ring: false, noShadow: true, lift: e.lift }); } catch (err) { /* a hero that will not draw leaves an empty twin */ }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = o.ghost ? 'rgba(184,208,246,0.55)' : 'rgba(150,182,226,0.4)'; c.fillRect(0, 0, box, box);
    c.fillStyle = o.ghost ? 'rgba(20,38,86,0.3)' : 'rgba(12,22,48,0.26)'; c.fillRect(0, 0, box, box);
    c.globalCompositeOperation = 'source-over';
    const t = o.now, sz = box / px, base = a * (o.ghost ? 0.74 + 0.08 * Math.sin(t * 2.3 + e.x * 0.01) : 0.68);
    ctx.save();
    ctx.translate(tx, ty);
    if (o.link) {   // (a faint dashed thread to the place an ordinary twin (or the hero) would stand, and a ring there)
      ctx.save(); ctx.globalAlpha = a * 0.8; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = rgba(o.link.col, 0.8); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.link.x, o.link.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.ellipse(o.link.x, o.link.y + 2, 14, 9, 0, 0, TAU); ctx.strokeStyle = rgba(o.link.col, 0.45); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    // the feet: a pale pool of light and a thin ring in the hero's own colour (so each twin can be told to its hero)
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.ellipse(0, 4, 21 * o.scale / 1.5, 14 * o.scale / 1.5, 0, 0, TAU); ctx.fillStyle = rgba('#a9c4ee', o.ghost ? 0.22 : 0.14); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 2, 19 * o.scale / 1.5, 15 * o.scale / 1.5, 0, 0, TAU);
    ctx.strokeStyle = rgba(o.color || '#dfe9f5', o.me ? 0.7 : 0.38); ctx.lineWidth = o.me ? 2 : 1.4;
    if (o.me) ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 10; ctx.stroke(); ctx.setLineDash([]);
    if (o.ghost) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -26, 46, '#cfe4ff', 0.22 * a); ctx.globalCompositeOperation = 'source-over'; }   // (a ghost carries its own pale light, so it reads on the bright floor too)
    ctx.globalAlpha = base;
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(scratch, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = base * (o.ghost ? 0.22 : 0.12);
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(scratch, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    if (o.ghost) {   // (on the line: a few motes lifting off them, so a ghost is never taken for a hero)
      ctx.globalAlpha = a * 0.7; ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const q = ((t * 0.4 + i / 3 + e.x * 0.003) % 1), x = Math.sin(i * 2.1 + t) * 9; ctx.fillStyle = rgba('#e4f0ff', 0.55 * (1 - q)); ctx.fillRect(x - 1, -q * 70 - 6, 2, 2); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (o.me) {   // your own: a small quiet mark over the head
      const bob = Math.sin(t * 2.4) * 2;
      ctx.globalAlpha = a * 0.75;
      poly(ctx, [-5, -88 + bob, 5, -88 + bob, 0, -80 + bob], rgba('#e8f2ff', 0.85), 'rgba(8,14,34,0.7)', 1);
    }
    ctx.restore();
  }

  // ---- where a hero's twin stands, exactly where the script tests the hit (vesper.js testPts). The twin's point in STORED (hall) space is the hero's own
  // point, except: Lagging Glass (Extreme) the place the hero was 1.5 s ago; Wrong Hand (Extreme) the point (-x, -y). The twin is drawn at the mirror image of
  // that point, so a 'vg' shape that holds the point holds the twin.
  const LAG = 1.5;
  function trailAt(s, id, now, q) {
    const h = s.trail.get(id); if (!h || !h.length) return q;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= now - LAG) return h[i];
    return h[0];
  }
  function twinSpec(s, e, id, now) {
    const lg = s.lag.get(id), wr = s.wrong.get(id);
    if (lg && now >= lg.from && now < lg.end) { const p = trailAt(s, id, now, e); return { kind: 'lag', x: p.x, y: p.y, ang: e.angle || 0 }; }
    if (wr && now >= wr.from && now < wr.end) return { kind: 'wrong', x: -e.x, y: -e.y, ang: (e.angle || 0) + Math.PI };
    return { kind: null, x: e.x, y: e.y, ang: e.angle || 0 };
  }
  // a hero's third body behind a hand mirror (the reflection of their place across the mirror)
  const inSpan = (h, x, y) => { const c = Math.cos(h.a), sn = Math.sin(h.a), dx = x - h.x, dy = y - h.y; return Math.abs(dx * c + dy * sn) <= h.len / 2 && Math.abs(-dx * sn + dy * c) <= h.span; };
  function thirdOf(h, x, y, ang) {
    const c = Math.cos(h.a), sn = Math.sin(h.a), ac = -(x - h.x) * sn + (y - h.y) * c;
    return { x: x + 2 * ac * sn, y: y - 2 * ac * c, ang: 2 * h.a - ang };
  }
  const handK = (h, now) => (now < h.land ? 0 : Math.min(smooth((now - h.land) / 0.5), h.brk >= 0 ? clampv(1 - (now - h.brk) / 0.5, 0, 1) : 1, clampv((h.end + 0.4 - now) / 0.4, 0, 1)));

  // how far the knights have traded rooms (Extreme, Trading Places): 0 in their own rooms .. 1 swapped; they pass each other through the glass in 0.8 s
  function tradeK(s, now) {
    const T = s.trade; if (!T) return 0;
    const end = Math.min(T.end, s.tradedLand > 0 ? s.tradedLand + 0.35 : 1e9), kin = smooth((now - T.t0) / 0.5);
    if (now < end) return kin;
    return smooth((end - T.t0) / 0.5) * (1 - smooth((now - end) / 0.5));
  }

  // everything this fight adds to the depth-sorted entities: the twins, the third bodies and the Glass Knight (kind 'stagecraft': { y, draw(ctx) }). api: { raid,
  // me, meId, scale (the heroes' scale), color (partyColor) }. Also moves the heroes who are pulled through into the glass (and Vesper, while the knights
  // have traded rooms) until flipEnd() puts them back.
  function entities(ents, bd, now, api) {
    const room = api.raid.room, s = track(room, now), out = [], ls = layers(s, now), seen = s.seen = { bodies: [], twins: [], boss: null, gk: null };
    flipEnd();
    vesperCut(bd, s, now);
    // each hero's last 3 s (Lagging Glass reads it), before anyone is moved
    for (const e of ents) {
      const id = idOf(e, api); let h = s.trail.get(id); if (!h) s.trail.set(id, h = []);
      const last = h[h.length - 1];
      if (last && now < last.t) h.length = 0;
      if (!last || now - last.t > 0.04 || now < last.t) h.push({ t: now, x: e.x, y: e.y });
      while (h.length && h[0].t < now - 3.2) h.shift();
    }
    // the wall: the body goes through the glass (it is drawn there, where the hero's name, marks and status follow it)
    for (const e of ents) {
      const id = idOf(e, api), k = flipK(s, id, now); if (k <= 0.001) continue;
      const f = s.flip.get(id);
      moved.push({ e, x: e.x, y: e.y });
      if (f.kind === 'e') e.x += 2 * HW * k; else e.y -= GAP * k;
    }
    for (const e of ents) { const ps = api.raid.party.get(idOf(e, api)); if (!(ps && !ps.alive)) seen.bodies.push({ x: e.x, y: e.y }); }   // (after the wall has moved the ones it pulled through)
    const fall = s.fall >= 0 ? clampv(1 - (now - s.fall) / 2.0, 0, 1) : 1;
    s.hands = s.hands.filter(h => now <= h.end + 2 && !(h.brk >= 0 && now > h.brk + 2));
    for (const e of ents) {
      const id = idOf(e, api), ps = api.raid.party.get(id);
      if (ps && !ps.alive) continue;
      if (typeof heroMotion === 'function' && e.st) heroMotion(e.st, e.x, e.y);   // (the hero's own stride, before a twin is ever drawn from it)
      const me = e === api.me, col = api.color(id), sp = twinSpec(s, e, id, now);
      for (const L of ls) {
        const [tx, ty] = twinPt(L.m, sp.x, sp.y), ang = twinAng(L.m, sp.ang), a = L.a * fall;
        if (a < 0.02) continue;
        if (L.m === s.cur) seen.twins.push({ x: tx, y: ty });
        const o = { scale: api.scale, color: col, me, ghost: L.mode === 'line', now };
        // (a lagging or wrong-handed twin: a faint thread back to where an ordinary twin would stand)
        if (sp.kind) { const [ox, oy] = twinPt(L.m, e.x, e.y); o.link = { x: ox - tx, y: oy - ty, col: sp.kind === 'lag' ? '#9fd8ff' : '#ffcf8a' }; }
        out.push({ kind: 'stagecraft', y: ty, draw: ctx => drawTwin(ctx, e, tx, ty, ang, a, o) });
      }
      // a hand mirror's span: a third body, the reflection across it, a ghost in the hall itself
      if (flipK(s, id, now) <= 0.001) for (const h of s.hands) {
        const k = handK(h, now); if (k < 0.02 || !inSpan(h, e.x, e.y)) continue;
        const th = thirdOf(h, e.x, e.y, e.angle || 0), a = k * fall;
        const o = { scale: api.scale, color: col, me: false, ghost: true, now, link: { x: e.x - th.x, y: e.y - th.y, col: '#dfe9f5' } };
        out.push({ kind: 'stagecraft', y: th.y, draw: ctx => drawTwin(ctx, e, th.x, th.y, th.ang, a, o) });
      }
    }
    // the knights
    const tk = tradeK(s, now);
    if (bd) {
      stepOff(s, bd, now);
      for (const L of ls) { const gk = glassKnight(api.raid, s, bd, L, now, tk); if (gk) out.push(gk); }
      if (tk > 0.001 && s.cur) {   // Vesper passes into the glass while the Glass Knight takes her place in the hall
        const [gx, gy] = twinPt(s.cur, bd.x, bd.y);
        moved.push({ e: bd, x: bd.x, y: bd.y, f: bd.f });
        bd.x += (gx - bd.x) * tk; bd.y += (gy - bd.y) * tk;
        if (tk > 0.5) bd.f = twinAng(s.cur, bd.f);
      }
      seen.boss = { x: bd.x, y: bd.y };
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------------ the Glass Knight
  function gkProps(props) {
    const o = {};
    for (const k in props) if (k.startsWith('vs') && props[k]) o[k] = true;
    if (o.vsClose) { delete o.vsClose; o.vsFar = true; }   // Counterpoint: she cuts close, her reflection far
    if (o.vsCrossL) { delete o.vsCrossL; o.vsCrossR = true; } else if (o.vsCrossR) { delete o.vsCrossR; o.vsCrossL = true; }   // (Cross-Cut and Backhand: the opposite hand)
    return o;
  }
  // her step out of line (and, in the dance, to where her own cut starts) as an offset from Vesper's place, eased; once a frame
  function stepOff(s, bd, now) {
    let tx = s.step.ox, ty = s.step.oy, cut = null;
    for (const c of s.cuts) if (now >= c.t0 - 0.02 && now < c.land + 0.6) cut = c;
    if (cut) { tx = cut.ox - bd.x; ty = cut.oy - bd.y; }
    s.offTo = { x: tx, y: ty };
    const dt = now - s.offT; s.offT = now;
    if (!s.off || dt < 0 || dt > 0.3) s.off = { x: tx, y: ty }; else { const k = 1 - Math.exp(-dt * 7); s.off.x += (tx - s.off.x) * k; s.off.y += (ty - s.off.y) * k; }
  }
  // her own cut of the dance: her swing begins when the cut is drawn and lands on the cut's landing (main.js banim 'cut' keeps it), so the blade is gathered across the time between
  function vesperCut(bd, s, now) {
    const st = bd && bd.st; if (!st) return;
    let c = null;
    for (const k of s.vcuts) if (now >= k.t0 - 0.02 && now < k.land + 0.35) { c = k; break; }
    if (!c) return;
    const a = st.action;
    if (!(a && a.type === 'attack' && Math.abs(a.t0 - (c.land - 0.45)) < 0.01)) st.action = { type: 'attack', t0: c.land - 0.45, dur: 1.0 };
  }
  function glassKnight(raid, s, bd, L, now, tk) {
    const tx = s.offTo.x, ty = s.offTo.y;
    const m = L.m, px = bd.x + s.off.x, py = bd.y + s.off.y;
    let [x, y] = twinPt(m, px, py), a = L.a;
    if (L.mode === 'line') {   // she steps out of the glass and stands opposite her across the line
      const g = s.gkStep, t0 = g ? g.t0 : s.mirror.t0 + 0.2, q = smooth((now - t0) / 1.2);
      const [ex, ey] = twinPt(m, bd.x, bd.y), d = (ex - m.px) * m.nx + (ey - m.py) * m.ny;
      const lx = ex - d * m.nx, ly = ey - d * m.ny;   // where the line is, at her
      x = lx + (x - lx) * q; y = ly + (y - ly) * q; a *= q;
    }
    if (tk > 0.001 && L.a > 0.5) { x += (px - x) * tk; y += (py - y) * tk; }   // (Trading Places: she crosses into the hall, to where Vesper stood)
    a *= s.fall >= 0 ? clampv(1 - (now - s.fall) / 2.0, 0, 1) : 1;
    if (a < 0.02) return null;
    const st = s.gkSt, moving = Math.hypot(s.off.x - tx, s.off.y - ty) > 6 || !!bd.st.moving || (tk > 0.02 && tk < 0.98);
    st.t = now; st.moving = moving; st.props = gkProps(raid.props || {});
    let act = null;
    // (her own cut gathers from when it is drawn and lands on its landing; the one behind it finishes its follow-through first. In every other move her reflection swings with her.)
    for (const c of s.cuts) if (now >= c.t0 - 0.02 && now < c.land + 0.35) { act = { type: 'attack', t0: c.land - 0.45, dur: 1.0 }; break; }
    if (!act) for (const c of s.cuts) if (now >= c.land + 0.35 && now < c.land + 0.9) act = { type: 'attack', t0: c.land - 0.45, dur: 1.0 };
    if (!act && !(raid.props && raid.props.vsDash)) { const ba = bd.st.action; if (ba && ba.type === 'attack') act = ba; }
    st.action = act;
    const ang = tk > 0.5 ? bd.f : twinAng(m, bd.f);
    const off = tk > 0.02 ? 0 : Math.hypot(s.off.x, s.off.y), [hx, hy] = twinPt(m, bd.x, bd.y);
    if (L.a > 0.5) { s.gkAt = { x, y }; if (s.seen) s.seen.gk = { x, y }; }
    return { kind: 'stagecraft', y: y, draw: ctx => drawKnight(ctx, st, x, y, ang, a, off, hx, hy, now) };
  }
  function drawKnight(ctx, st, x, y, ang, a, off, hx, hy, now) {
    if (typeof BOSS_ART === 'undefined' || !BOSS_ART.vesperglass) return;
    ctx.save();
    // where she should be standing: a faint pale column, while she is out of line
    if (off > 6) {
      const k = clampv(off / 40, 0, 1) * a;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.5;
      ctx.beginPath(); ctx.ellipse(hx, hy + 8, 40, 11, 0, 0, TAU); ctx.fillStyle = rgba('#86bdf4', 0.22); ctx.fill();
      glow(ctx, hx, hy - 40, 70, '#86bdf4', 0.12);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = a;
    ctx.translate(x, y); ctx.scale(1.3, 1.3);
    ctx.beginPath(); ctx.ellipse(4, 10, 50, 40, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
    ctx.rotate(ang);
    BOSS_ART.vesperglass(ctx, st, ang);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------ the dangers, by room
  // a copy of a telegraph with its shape mirrored (the shared drawing never knows)
  function mirrored(m, tg) { const q = Object.assign({}, tg); q.live = mirrorShape(m, tg.live); q._vsm = 1; return q; }
  const roomOf = tg => { const t = tg.tag || ''; return t.length > 2 && t[0] === 'v' && (t[1] === 'g' || t[1] === 'b') ? t[1] : 'h'; };
  const glassClip = (ctx, m) => {
    ctx.beginPath();
    if (m.kind === 'n') ctx.rect(-HW - 4, -3 * HH - 4, 2 * HW + 8, 2 * HH + 4);
    else if (m.kind === 'e') ctx.rect(HW, -HH - 4, 2 * HW + 4, 2 * HH + 8);
    else { ARENA.trace(ctx, 4); }
    ctx.clip();
  };
  // Backhand: the first pair is cancelled and the other side laid in the same breath. The cancelled blade is not drawn; the new one is drawn sliding from
  // where the old one stood to where it lands (0.65 s), so the cut reads as one blade that crosses over.
  const isBack = tg => /Backhand$/.test(tg.tag || '');
  const cancelled = tg => tg.gone != null && tg.gone < tg.start + tg.dur - 0.4;
  const lerpShape = (a, b, q) => { const o = Object.assign({}, b); for (const k in b) if (typeof b[k] === 'number' && typeof a[k] === 'number') o[k] = a[k] + (b[k] - a[k]) * q; return o; };
  function backhandMorph(tgs, tg, t) {
    if (tg.gone != null || t - tg.start > 0.7) return tg;
    let old = null;
    for (const o of tgs.values()) if (o !== tg && o.tag === tg.tag && cancelled(o) && Math.abs(tg.start - o.gone) < 0.4) { old = o; break; }
    if (!old) return tg;
    const q = smooth((t - tg.start) / 0.65);
    return Object.assign({}, tg, { live: lerpShape(old.live, tg.live, q), start: tg.start - 0.25, dur: tg.dur + 0.25 });
  }
  function drawTelegraphs(ctx, tgs, t, env) {
    const m = S(env.room).mirror;
    this.tetherWatch(t, env && env.hard);
    BossTells.track(tgs, t, env);
    const hall = new Map(), glass = new Map();
    for (const [id, tg0] of tgs) {
      if (isBack(tg0) && cancelled(tg0)) continue;
      const tg = isBack(tg0) ? backhandMorph(tgs, tg0, t) : tg0;
      const r = roomOf(tg);
      if (r !== 'g') hall.set(id, tg);
      if (r !== 'h') glass.set(id, mirrored(m, tg));
    }
    ctx.save(); ARENA.trace(ctx, 4); ctx.clip(); this.drawTelegraphsInner(ctx, hall, t, env); ctx.restore();
    if (glass.size) { ctx.save(); glassClip(ctx, m); this.drawTelegraphsInner(ctx, glass, t, env); ctx.restore(); }
  }
  // the glass dangers' mirrored copies and the clip of the glass, for the firmer rim pass laid over the hero effects (boss-tells.js rimsTop)
  function glassCopies(tgs, room) {
    const m = S(room).mirror, map = new Map();
    for (const [id, tg0] of tgs) {
      if (isBack(tg0) && cancelled(tg0)) continue;
      if (roomOf(tg0) !== 'h') map.set(id, mirrored(m, tg0));
    }
    return { map, clip: c => glassClip(c, m) };
  }
  // the landing flash goes where the danger is painted (boss-vfx.js impact: the copies play the shared landing again, in the glass)
  function impactTgs(tg, room) {
    const r = roomOf(tg); if (r === 'h') return [tg];
    const q = mirrored(S(room).mirror, tg);
    return r === 'g' ? [q] : [Object.assign({}, tg, { _vsm: 1 }), q];   // (both rooms: the hall's own landing, marked so it is not routed again, and the glass copy)
  }

  // ------------------------------------------------------------------------------------------------ hand mirrors (Hard)
  // the span: where a third body forms. Silver, never red or blue: it marks a place, not a danger. Dashed from the moment the throw is announced, solid once the
  // mirror stands.
  function handVis(h, t) {
    const fo = Math.min(h.brk >= 0 ? clampv(1 - (t - h.brk) / 0.5, 0, 1) : 1, clampv((h.end + 0.4 - t) / 0.4, 0, 1));
    return fo * (t < h.land ? 0.45 * smooth((t - (h.t0 == null ? h.land - 3 : h.t0)) / 0.6) : 0.45 + 0.55 * smooth((t - h.land) / 0.5));
  }
  function drawSpans(ctx, room, t) {
    const hs = S(room).hands; if (!hs.length) return;
    ctx.save(); ctx.beginPath(); ctx.rect(-HW, -HH, 2 * HW, 2 * HH); ctx.clip();
    for (const h of hs) {
      const v = handVis(h, t); if (v < 0.01) continue;
      const up = t >= h.land, L = h.len / 2;
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.a);
      ctx.fillStyle = rgba('#d6e8ff', 0.075 * v); ctx.fillRect(-L, -h.span, h.len, 2 * h.span);
      const g = ctx.createLinearGradient(0, -h.span, 0, h.span); g.addColorStop(0, 'rgba(223,233,245,0.12)'); g.addColorStop(0.5, 'rgba(223,233,245,0)'); g.addColorStop(1, 'rgba(223,233,245,0.12)');
      ctx.globalAlpha = v; ctx.fillStyle = g; ctx.fillRect(-L, -h.span, h.len, 2 * h.span); ctx.globalAlpha = 1;
      ctx.setLineDash(up ? [14, 8] : [6, 9]); ctx.lineDashOffset = -t * (up ? 16 : 8);
      ctx.strokeStyle = rgba('#e6f0ff', (up ? 0.5 : 0.32) * v); ctx.lineWidth = 1.6; ctx.strokeRect(-L, -h.span, h.len, 2 * h.span); ctx.setLineDash([]);
      if (up) {   // (the reflection runs across it: pale lines running to the mirror from either side)
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) { const q = ((t * 0.3 + i / 5) % 1), x = (i / 4 - 0.5) * h.len * 0.9; ctx.strokeStyle = rgba('#dfe9f5', 0.28 * v * (1 - q)); ctx.beginPath(); ctx.moveTo(x, -h.span * (1 - q)); ctx.lineTo(x, -h.span * (1 - q) + 12); ctx.moveTo(x, h.span * (1 - q)); ctx.lineTo(x, h.span * (1 - q) - 12); ctx.stroke(); }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // the standing mirror itself (a prop, kind 'handmirror': x, y its middle, w its length, a its angle): a tall pane of mirror-glass on two feet, seen from the
  // front; it drops in when thrown
  function drawHandMirror(ctx, pr, t) {
    const q = clampv((t - (pr.born == null ? t - 1 : pr.born)) / 0.35, 0, 1), drop = (1 - q * q) * 80, L = (pr.w || 300) / 2, c = Math.cos(pr.a || 0), sn = Math.sin(pr.a || 0), H = 70;
    const x1 = pr.x - c * L, y1 = pr.y - sn * L - drop, x2 = pr.x + c * L, y2 = pr.y + sn * L - drop;
    ctx.save();
    ctx.globalAlpha = 0.45 * q; ctx.beginPath(); ctx.ellipse(pr.x, pr.y + 6, L * 0.98 * Math.max(Math.abs(c), 0.12), 9 + L * 0.98 * Math.abs(sn) * 0.5, 0, 0, TAU); ctx.fillStyle = '#02060f'; ctx.fill(); ctx.globalAlpha = 1;
    // the pane
    const g = ctx.createLinearGradient(0, Math.min(y1, y2) - H, 0, Math.max(y1, y2));
    g.addColorStop(0, 'rgba(226,240,255,0.82)'); g.addColorStop(0.5, 'rgba(132,160,208,0.78)'); g.addColorStop(1, 'rgba(58,84,138,0.82)');
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - H); ctx.lineTo(x1, y1 - H); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    const sx = ((t * 0.35) % 1) * (Math.abs(x2 - x1) + 140) + Math.min(x1, x2) - 70, sg = ctx.createLinearGradient(sx, 0, sx + 50, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.4)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 60, Math.min(y1, y2) - H - 4, 170, H + Math.abs(y2 - y1) + 8); ctx.restore();
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#0a1020'; ctx.lineWidth = 5.5; ctx.stroke(); ctx.strokeStyle = '#cfdcf0'; ctx.lineWidth = 2.4; ctx.stroke();
    // the base bar and the two feet
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = '#0a1020'; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = '#98a8c4'; ctx.lineWidth = 4.4; ctx.stroke();
    for (const [fx, fy] of [[x1, y1], [x2, y2]]) { ctx.fillStyle = '#46557a'; ctx.strokeStyle = '#0a1020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(fx - 6, fy - 4, 12, 12); ctx.fill(); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, pr.x, pr.y - drop - H * 0.5, L * 0.7, '#cfe4ff', 0.08 * q);
    ctx.restore();
  }
  // the throw: a spinning pane crossing from the Glass Knight to where it lands, over the last 0.8 s of the cast
  function roomOver(ctx, room, t) {
    for (const h of S(room).hands) {
      if (!h.from || t < h.land - 0.8 || t >= h.land) continue;
      const p = (t - (h.land - 0.8)) / 0.8, e = p * p * (3 - 2 * p), x = h.from.x + (h.x - h.from.x) * e, y = h.from.y + (h.y - h.from.y) * e - Math.sin(p * Math.PI) * 120;
      const L = h.len * (0.18 + 0.32 * e) * 0.5, a = h.a + (1 - e) * 5;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 60, '#cfe4ff', 0.18);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(214,232,255,0.7)'; ctx.fillRect(-L, -5, 2 * L, 10);
      ctx.strokeStyle = '#0a1020'; ctx.lineWidth = 1.6; ctx.strokeRect(-L, -5, 2 * L, 10); ctx.fillStyle = '#fff'; ctx.fillRect(-L, -5, 2 * L, 2);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------------------------------------ the line (Act V) and the glass tint
  function roomUnder(ctx, room, t) {
    drawSpans(ctx, room, t);
    const s = S(room), m = s.mirror, ev = room.ev || {};
    if (!(ev.vsact && ev.vsact.n >= 5)) return;
    const live = m.kind === 'line', since = live ? t - m.t0 : 0, ta = live ? smooth(since / 1.2) : 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(-HW, -HH, 2 * HW, 2 * HH); ctx.clip();
    // the glass tint over the room: cool, faint, with a pale sheen drifting through it
    if (ta > 0.01) {
      ctx.fillStyle = rgba('#8fb4ec', 0.06 * ta); ctx.fillRect(-HW, -HH, 2 * HW, 2 * HH);
      const sx = -HW - 200 + ((t / 9) % 1) * (2 * HW + 400), g = ctx.createLinearGradient(sx, 0, sx + 120, 0);
      g.addColorStop(0, 'rgba(220,236,255,0)'); g.addColorStop(0.5, 'rgba(220,236,255,' + 0.05 * ta + ')'); g.addColorStop(1, 'rgba(220,236,255,0)');
      ctx.fillStyle = g; ctx.fillRect(sx, -HH, 120, 2 * HH);
    }
    if (live) {
      const grow = smooth(since / 0.7), L = 700 * grow, flash = Math.max(0, 1 - since / 0.9);
      // the standing pane: the light the line holds up, rising on the screen above it
      const dx = -m.ny, dy = m.nx, H = 96 * grow, ax = m.px - dx * L, ay = m.py - dy * L, bx = m.px + dx * L, by = m.py + dy * L;
      const gr = ctx.createLinearGradient(0, Math.min(ay, by) - H, 0, Math.max(ay, by));
      gr.addColorStop(0, 'rgba(200,224,255,0)'); gr.addColorStop(1, 'rgba(214,234,255,' + (0.2 + 0.16 * flash) + ')');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - H); ctx.lineTo(ax, ay - H); ctx.closePath(); ctx.fill();
      // on the floor: a pale band across the line, and the line itself (x along it, y across)
      ctx.save(); ctx.translate(m.px, m.py); ctx.rotate(Math.atan2(dy, dx));
      let g = ctx.createLinearGradient(0, -26, 0, 26); g.addColorStop(0, 'rgba(210,230,255,0)'); g.addColorStop(0.5, 'rgba(226,240,255,' + (0.3 + 0.3 * flash) + ')'); g.addColorStop(1, 'rgba(210,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-L, -26, 2 * L, 52);
      ctx.globalCompositeOperation = 'lighter';
      g = ctx.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-L, -7, 2 * L, 14);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 + 0.15 * Math.sin(t * 7)) + ')'; ctx.fillRect(-L, -1, 2 * L, 2);
      for (let i = 0; i < 6; i++) { const q = ((t * 0.19 + i / 6 + 0.07 * i) % 1), x = (q * 2 - 1) * L, al = Math.sin(q * Math.PI) ** 2; glow(ctx, x, 0, 20, '#ffffff', 0.5 * al); }
      ctx.restore();
    }
    ctx.restore();
  }

  return { onRoom, track, camera, release, isBack, cancelled, roomOver, drawHandMirror, tradeK, twinSpec, twinOf: (room, e, id, now) => twinSpec(S(room), e, id, now), thirdOf, inSpan, entities, flipEnd, drawTelegraphs, glassCopies, impactTgs, roomUnder, twinPt, twinAng, mirrorShape, modeNow, S,
    // the hero's pointer when pulled through: the screen shows the body in the glass, the sim moves it in the hall
    unflip(raid, p, id, now) {
      const s = raid.room && raid.room.vs; if (!s) return p;
      const k = flipK(s, id, now), f = s.flip.get(id); if (k < 0.5 || !f) return p;
      return f.kind === 'e' ? { x: p.x - 2 * HW, y: p.y } : { x: p.x, y: p.y + GAP };
    },
  };
})();

// patching ArenaView / BossTells the way garrow-room.js adds its methods
if (typeof ArenaView !== 'undefined') {
  const roomEvent0 = ArenaView.roomEvent;
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    roomEvent0.call(this, room, msg, now, ...rest);
    VS_VIEW.onRoom(room, msg, now);
  };
  const drawTelegraphs0 = ArenaView.drawTelegraphs;
  ArenaView.drawTelegraphs = function (ctx, tgs, t, env) {
    if (env && env.bossId === 'vesper' && env.room) return VS_VIEW.drawTelegraphs.call(this, ctx, tgs, t, env);
    return drawTelegraphs0.call(this, ctx, tgs, t, env);
  };
  const drawProp0 = ArenaView.drawProp;
  ArenaView.drawProp = function (ctx, pr, t, room) {
    if (pr && pr.kind === 'handmirror') { ctx.save(); ctx.globalAlpha *= Math.min(1, (t - (pr.born == null ? t - 1 : pr.born)) / 0.2); VS_VIEW.drawHandMirror(ctx, pr, t); ctx.restore(); return; }   // (Hard's Hand Mirror: vesper-view.js)
    return drawProp0.call(this, ctx, pr, t, room);
  };
  const roomOver0 = ArenaView.drawRoomOver;
  ArenaView.drawRoomOver = function (ctx, room, t, env) {
    roomOver0.call(this, ctx, room, t, env);
    if (room && room.vs && env && env.bossId === 'vesper') VS_VIEW.roomOver(ctx, room, t);
  };
  const roomUnder0 = ArenaView.drawRoomUnder;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    roomUnder0.call(this, ctx, room, t, v);
    if (room && room.vs && this.amb && this.amb.kind === 'argent') VS_VIEW.roomUnder(ctx, room, t);
  };
}
if (typeof BossTells !== 'undefined') {
  const rims0 = BossTells.rims;
  BossTells.rims = function (ctx, tgs, t, env) {
    if (!env || env.bossId !== 'vesper') return rims0.call(this, ctx, tgs, t, env);
    const hall = new Map();
    for (const [id, tg] of tgs) {
      if (/^vg/.test(tg.tag || '')) continue;   // (a glass danger's rim is in the glass: drawTelegraphs)
      if (VS_VIEW.isBack(tg) && (VS_VIEW.cancelled(tg) || (tg.gone == null && t - tg.start < 0.7 && [...tgs.values()].some(o => o !== tg && o.tag === tg.tag && VS_VIEW.cancelled(o))))) continue;   // (a Backhand blade still crossing over has its rim in the slide)
      hall.set(id, tg);
    }
    rims0.call(this, ctx, hall, t, env);
    if (BossTells.topK && BossTells.topK() > 0 && env.room) { const gl = VS_VIEW.glassCopies(tgs, env.room); if (gl.map.size) rims0.call(this, ctx, gl.map, t, env, gl.clip); }   // (the firmer pass over the effects covers the glass dangers too)
    return;
  };
}
