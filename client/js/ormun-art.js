// Ormun, the Tide-Weigher (set 6, Season 2, Boss XV): everything he looks like, drawn in code. A colossus of pale drowned stone, robed
// and faceless, standing on his pier at the fulcrum of the Scales with water running out of both sleeves without end. One hand is on
// the beam of the scales; the other does the work. He never leaves the fulcrum and never hurries: his hands and his head do the acting.
// Loaded after arena-view.js; it adds to BOSS_ART itself. The room (ormun-room.js: pans, bridge, chains, beam, sea) and every
// telegraph and impact (a later file) are not drawn here.
// Look: silver, black water, frost blue; nothing warm on him at all.
//
// He is drawn on the screen's axes (the canvas is turned back by `angle`): always facing the bottom of the screen, the party's side. The
// boss angle only turns his head a little (up to about 18 degrees). His centre is the fulcrum, (0, -170) in the room, and he is drawn at
// 1.3 like every raid boss (and a further 1.12 of his own: GS): shoulders about 300 px across, the free hand about 75 px (a hero is about 25), the beam hand
// and the room's beam fixed to each other at art (-42, -82) which is (-61, -290) in the room (OR_ROOM.BEAM_Y in ormun-room.js).
// His left (the free) hand is the one on the screen's right at rest; his right hand holds the beam, on the screen's left.
//
// Poses (st.props, held while the move runs: boss-vfx.js CAST_POSE for casts, main.js 'banim' for the rest; the newest one on wins; none: rest):
//   orJudge  the free hand raised slowly and held (a pale light gathers under the palm), then brought down toward the left pan, the right pan
//            or both. The fall comes on props.orFall (set for the last beat of the cast), or props.orDur - 0.3 s if the script gives the cast's
//            length as props.orDur, or at 5.9 s into the pose if neither is given.
//   orBlow   the heavy overhand blow onto one pan (Heavy Hand): the fist wound up high, slammed down. Falls on orFall / orDur - 0.3 / 2.0 s.
//   orTide   the raidwide (The Tide Comes In): both sleeves pour hard, the arms lift and spread, the water gushes after a breath in.
//   orDrop   a weight in the free hand held out over a pan, then let go (Counterweight): on orFall / orDur - 0.3 / 1.2 s.
//   orCradle a fist raised and brought down on a cradle (Scatter the Silver): on orFall / orDur - 0.3 / 1.6 s.
//   orBridge both fists up (the beam hand leaves the beam) and down together on the bridge (The Bridge Breaks): on orFall / orDur - 0.3 / 2.4 s.
//            The beam hand goes back to the beam when the pose ends.
//   orTip    the beam hand slides out along the beam toward the side being shoved down, lifts, and bears down (Tip the Scale): 1.5 s.
//   orIntro  he rises out of the water and the sleeves begin to pour (3 s); orDeath: the water stops, the stone cracks and lights, he sinks (4.5 s)
//   orEnrage (The Scale Falls) both arms raised, the sleeves in spate, light in every crack, the whole body shaking.
//   Sequenced poses run on the time since the pose turned on, so they need no duration from the script.
//   props.orSide  -1 left pan, 1 right pan, 0 (or missing) both: where judge / drop / cradle / blow / tip are aimed. blow, drop, cradle and tip
//            take a missing side as the right. props.orAtX / orAtY (room coordinates), if given, aim the hand at that spot instead
//            (limited to what an arm can reach).
//   st.action { type: 'attack' }: the plain swing is not used by him; nothing is drawn for it. st.action.type may also be a pose name above.

const OR_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const K = {
    stone: '#bfcad5', stoneH: '#eef4f9', stoneM: '#98a7b6', stoneD: '#66778a', stoneDD: '#34414f', wet: '#2b3b4d',
    out: '#0a1019', void: '#03070d',
    water: '#d6ebf8', waterM: '#8fbbe0', waterD: '#3d6c9a', frost: '#9fd0ff', frostH: '#e6f4ff',
    silver: '#b9c6d6', silverH: '#f2f8ff', silverD: '#5d6b7e',
  };
  const OUT = K.out;

  // ---------------------------------------------------------------------------------------------------------- poses
  const POSES = ['judge', 'blow', 'tide', 'drop', 'cradle', 'bridge', 'tip', 'intro', 'death', 'enrage'];
  const KEYS = POSES.map(n => 'or' + n[0].toUpperCase() + n.slice(1));
  const IDX = {}; POSES.forEach((n, i) => { IDX[n] = i; });
  const PK = ['fx', 'fy', 'fs', 'fo', 'bx', 'by', 'bs', 'bo', 'hl', 'hd', 'hz', 'ht', 'pr', 'sp', 'sw', 'sk', 'cg', 'wt', 'sd', 'fd', 'gl', 'ld'];
  // fx, fy the free hand's place; fs its size (1 on the robe .. 2 raised high); fo how open (0 a fist .. 1 flat). bx, by, bs, bo: the beam hand
  // (at rest it grips the beam at (-46, -92)). hl head lift (y), hd head turn, hz head size, ht head thrown back. pr how hard the water pours,
  // sp how far the sleeves flare, sw the chest swelling, sk shaking, cg light in the cracks, wt the weight in the hand, sd sunk in the water,
  // fd how much of him is there, gl the light under the raised palm, ld how much stone he has gathered to the blow (the free shoulder rolls up and back and he rears a little).
  const GS = 1.12, WS = 1.3 * GS;   // how much bigger than the sketch he is drawn, and art units to room pixels at the raid's 1.3
  const BEAM = [-42, -82], SHOULDER = [[-80, -14], [80, -14]];   // [0] his right (the beam arm), [1] his left (the free arm)
  const IDLE = { fx: 100, fy: 62, fs: 1, fo: 0.55, bx: BEAM[0], by: BEAM[1], bs: 1, bo: 0.12, hl: 0, hd: 0, hz: 1, ht: 0, pr: 1, sp: 0, sw: 0, sk: 0, cg: 0, wt: 0, sd: 0, fd: 1, gl: 0, ld: 0 };
  const FALL = { judge: 5.9, blow: 2.0, drop: 1.2, cradle: 1.6, bridge: 2.4, tip: 1.5 };
  const RATE = { judge: 2.4, blow: 3.4, drop: 4.5, cradle: 3.6, bridge: 3, tide: 3.2, tip: 4, enrage: 3, intro: 3, death: 2.4 };

  function newState() {
    return { p: Object.assign({}, IDLE), tg: Object.assign({}, IDLE), on: new Array(POSES.length).fill(-1), pose: -1, t0: 0, last: NaN, dt: 0, fT: null, fRate: 0 };
  }
  function pickPose(g, st, t) {
    const pr = st.props, a = st.action;
    let best = -1, bt = -1e18;
    if (pr) for (let i = 0; i < KEYS.length; i++) {
      if (pr[KEYS[i]]) {
        if (g.on[i] < 0 || g.on[i] > t) g.on[i] = t;
        if (g.on[i] > bt) { bt = g.on[i]; best = i; }
      } else g.on[i] = -1;
    }
    { const dk = IDX.death; if (pr && pr[KEYS[dk]] && g.on[dk] >= 0) { best = dk; bt = g.on[dk]; } }   // (his fall wins over any cast still running: the script's next act may begin while he goes under)
    if (best < 0 && pr && typeof pr.or === 'string' && IDX[pr.or] != null) { best = IDX[pr.or]; bt = g.pose === best ? g.t0 : t; }
    if (best < 0 && a && typeof a.type === 'string' && IDX[a.type] != null && t - a.t0 < (a.dur || 3) + 0.4) { best = IDX[a.type]; bt = a.t0; }
    if (best !== g.pose) { g.pose = best; g.t0 = bt; g.fT = null; }
    return best;
  }
  // where a hand comes down: a spot over the pan (art units; the room's coordinates are (x * 1.3, -170 + y * 1.3))
  const landing = (s, st, k) => {
    const pr = st.props || {};
    if (typeof pr.orAtX === 'number' && typeof pr.orAtY === 'number') {
      let x = pr.orAtX / WS, y = (pr.orAtY + 170) / WS;
      const sh = SHOULDER[1], dx = x - sh[0], dy = y - sh[1], d = Math.hypot(dx, dy), lim = 178;
      if (d > lim) { x = sh[0] + dx / d * lim; y = sh[1] + dy / d * lim; }
      return [x, y];
    }
    return s < 0 ? [-120 * k, 112] : s > 0 ? [120 * k, 112] : [10, 142];
  };
  function aim(g, st, pose, tp, t) {
    const tg = g.tg, p = g.p, pr = st.props || {};
    Object.assign(tg, IDLE);
    let rate = 6;
    const name = pose >= 0 ? POSES[pose] : '';
    const rawSide = typeof pr.orSide === 'number' ? Math.sign(pr.orSide) : 0, sideOr1 = rawSide || 1;
    const fallAt = typeof pr.orDur === 'number' ? Math.max(0.5, pr.orDur - 0.14) : FALL[name];   // (the fist comes down in the last 0.14 s of the cast and is there as the bar empties)
    const fall = FALL[name] != null && (!!pr.orFall || tp >= fallAt);
    // the gather across the whole cast: 0 .. 1 over the time to the fall, slow at both ends (he never hurries; the great hand keeps climbing to the last)
    const x = clamp(tp / Math.max(0.6, fallAt), 0, 1), e = 0.5 * x + 0.5 * x * x * (3 - 2 * x);
    if (fall) { if (g.fT == null) g.fT = t; } else g.fT = null;
    const since = g.fT == null ? 9 : t - g.fT, hit = since < 0.45 ? 1 - since / 0.45 : 0;   // the shaking just after a blow lands
    if (name) rate = RATE[name] || 6;
    // the beam hand's rest hint: a slow settle, so that the beam never seems to lose it
    if (name === 'judge') {
      if (!fall) { tg.fx = lerp(100, 88, e); tg.fy = lerp(46, -6, e); tg.fs = lerp(1.1, 1.95, e); tg.fo = 1; tg.gl = Math.min(1, e * 1.1); tg.hl = -2 * e; tg.ht = 0.4 * e; tg.pr = 1 + 0.25 * e; tg.sp = 0.3 * e; tg.sw = 0.03 * e; tg.ld = 0.8 * e; tg.fy += Math.sin(t * 1.7) * 1.4 * e; }
      else {
        const [x, y] = landing(rawSide, st, 1); tg.fx = x; tg.fy = y; tg.fs = 0.97; tg.fo = 1; tg.gl = 0.3 * hit; rate = 22; tg.sk = hit * 0.9; tg.hl = 2; tg.pr = 1.2 + 1.2 * hit; tg.sp = 0.4 * hit;
        if (!rawSide) { tg.bs = 0.88; tg.by = BEAM[1] + 6; }
      }
      tg.hd = rawSide * 0.14;
    } else if (name === 'blow') {
      if (!fall) { tg.fx = lerp(100, 112, e); tg.fy = lerp(40, -40, e); tg.fs = lerp(1.15, 2.05, e); tg.fo = lerp(0.4, 0.08, e); tg.hl = -3 * e; tg.ht = 0.5 * e; tg.sp = 0.5 * e; tg.sw = 0.04 * e; tg.ld = e; rate = 3.2; }
      else { const [x, y] = landing(sideOr1, st, 1); tg.fx = x; tg.fy = y; tg.fs = 0.97; tg.fo = 0.08; rate = 30; tg.sk = hit; tg.hl = 3; tg.ly = 0; tg.pr = 1 + 1.8 * hit; tg.sp = 0.6 * hit; }
      tg.hd = sideOr1 * 0.12;
    } else if (name === 'drop') {
      if (!fall) { tg.fx = sideOr1 * lerp(60, 80, e); tg.fy = lerp(104, 86, e); tg.fs = lerp(1.2, 1.55, e); tg.fo = 0.5; tg.wt = 1; tg.ld = 0.5 * e; tg.hd = sideOr1 * 0.15; }
      else { tg.fx = sideOr1 * 90; tg.fy = 96; tg.fs = 1.3; tg.fo = 1; tg.wt = 0; rate = 16; tg.hd = sideOr1 * 0.15; }
    } else if (name === 'cradle') {
      if (!fall) { tg.fx = lerp(92, 100, e); tg.fy = lerp(44, 2, e); tg.fs = lerp(1.2, 1.95, e); tg.fo = 0.05; tg.hl = -2 * e; tg.ld = 0.7 * e; tg.sp = 0.3 * e; rate = 3.4; }
      else { const [x, y] = landing(sideOr1, st, 0.88); tg.fx = x; tg.fy = y; tg.fs = 0.96; tg.fo = 0.05; rate = 30; tg.sk = hit * 0.75; tg.pr = 1 + 1.4 * hit; tg.sp = 0.4 * hit; }
      tg.hd = sideOr1 * 0.12;
    } else if (name === 'bridge') {
      if (!fall) { tg.fx = lerp(88, 62, e); tg.fy = lerp(40, -4, e); tg.fs = lerp(1.2, 1.95, e); tg.fo = 0.05; tg.bx = lerp(-44, -62, e); tg.by = lerp(-70, -6, e); tg.bs = lerp(1.1, 1.95, e); tg.bo = 0.05; tg.hl = -3 * e; tg.ht = 0.45 * e; tg.sp = 0.5 * e; tg.sw = 0.05 * e; tg.ld = e; rate = 3; }
      else { tg.fx = 28; tg.fy = 150; tg.fs = 0.97; tg.fo = 0.05; tg.bx = -28; tg.by = 148; tg.bs = 0.97; tg.bo = 0.05; rate = 28; tg.sk = hit * 1.3; tg.hl = 4; tg.pr = 1 + 2 * hit; tg.sp = 0.7 * hit; }
    } else if (name === 'tip') {
      if (!fall) { tg.bx = sideOr1 * 96; tg.by = BEAM[1] - 2; tg.bs = 1.5; tg.bo = 0.3; tg.fx = 96; tg.fy = 20; tg.fs = 1.25; tg.fo = 0.8; tg.hd = sideOr1 * 0.2; }
      else { tg.bx = sideOr1 * 100; tg.by = BEAM[1] + 8; tg.bs = 0.84; tg.bo = 0.15; tg.fx = 96; tg.fy = 20; tg.fs = 1.25; tg.fo = 0.8; tg.sk = hit * 0.8; rate = 26; tg.hd = sideOr1 * 0.2; }
    } else if (name === 'tide') {
      const u = clamp(tp / 0.9, 0, 1), burst = tp > 0.9 ? 1 : 0;
      tg.fx = lerp(100, 128, u); tg.fy = lerp(62, 22, u); tg.fs = lerp(1, 1.5, u); tg.fo = 0.9; tg.sp = u; tg.sw = lerp(0, 0.06, u) - burst * 0.03; tg.pr = lerp(1, 2.2, u) + burst * 1.2; tg.ht = 0.5 * u; tg.hl = -2 * u; tg.sk = burst * 0.12;
      tg.bs = lerp(1, 1.2, u);
    } else if (name === 'enrage') {
      tg.fx = 84; tg.fy = -6; tg.fs = 1.95; tg.fo = 1; tg.bx = -70; tg.by = -40; tg.bs = 1.9; tg.bo = 1; tg.sp = 1; tg.pr = 2.8; tg.ht = 0.8; tg.hl = -4; tg.cg = 1.1; tg.sk = 0.2 + 0.06 * Math.sin(t * 9); tg.sw = 0.05;
    } else if (name === 'intro') {
      const u = clamp(tp / 3.0, 0, 1);
      tg.sd = 1 - u * u * (3 - 2 * u); tg.fd = clamp(tp / 1.7, 0, 1);   // (he comes up slowly and heavily: the water lets go of him over three seconds) tg.pr = lerp(3, 1, u); tg.sp = 1 - u; tg.fx = 100; tg.fy = 62; tg.sk = 0.12 * (1 - u); tg.ht = 0.3 * (1 - u);
    } else if (name === 'death') {
      const u = clamp(tp / 4.4, 0, 1);
      tg.pr = Math.max(0, 1 - tp / 2.4) * 1.2; tg.cg = tp < 2.2 ? tp / 2.2 * 1.4 : Math.max(0, 1.4 - (tp - 2.2) * 0.8); { const q = clamp((tp - 0.3) / 2.4, 0, 1); tg.sd = q * q * (3 - 2 * q) * 1.7; }   // (he goes under in about two and a half seconds: the results card must find him gone)
      tg.fd = 1 - clamp((tp - 1.7) / 1.4, 0, 1); tg.fx = 94; tg.fy = 80; tg.fs = 0.92; tg.fo = 0.3; tg.bx = BEAM[0] - 8; tg.by = BEAM[1] + 30 * clamp((tp - 0.5) / 1.5, 0, 1); tg.bo = 0.6; tg.hl = 5 * clamp(tp / 2, 0, 1); tg.ht = -0.2; tg.sk = 0.1 * (1 - u);
    }
    tg.hd += clamp(g.face * 0.3, -0.32, 0.32);
    // the shaking of a blow riding on top, and the breath
    const a = 1 - Math.exp(-rate * g.dt);
    for (let i = 0; i < PK.length; i++) { const k = PK[i]; if ((name === 'intro' || name === 'death') && (k === 'sd' || k === 'fd')) p[k] = tg[k]; else p[k] += (tg[k] - p[k]) * a; }   // (the sinking and the fading are already eased)
  }
  function update(g, st, angle, t) {
    let dt = g.last === g.last ? t - g.last : 0;
    if (dt < 0) dt = 0; else if (dt > 0.1) dt = 0.1;
    g.last = t; g.dt = dt;
    let da = angle - Math.PI / 2; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    g.face = da;
    const pose = pickPose(g, st, t);
    aim(g, st, pose, t - g.t0, t);
    return pose;
  }

  // ---------------------------------------------------------------------------------------------------------- helpers
  // a closed smooth shape through the midpoints of the polygon's sides (a flat [x0, y0, ...] array)
  function smooth(ctx, a, fill, stroke, lw) {
    const m = a.length / 2, mx = i => (a[(i % m) * 2] + a[((i + 1) % m) * 2]) / 2, my = i => (a[(i % m) * 2 + 1] + a[((i + 1) % m) * 2 + 1]) / 2;
    ctx.beginPath(); ctx.moveTo(mx(m - 1), my(m - 1));
    for (let i = 0; i < m; i++) ctx.quadraticCurveTo(a[i * 2], a[i * 2 + 1], mx(i), my(i));
    ctx.closePath(); ctx.lineJoin = 'round';
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; };
  const rad = (ctx, x0, y0, r0, x1, y1, r1, stops) => { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); for (const [o, c] of stops) g.addColorStop(o, c); return g; };

  // the cracks in him, laid once (seeded): lines that wander across the mantle, the hood and the sleeves; they light in the last act and at his death
  const CRACKS = (() => {
    const r = rng(4417), out = [];
    const starts = [[-70, -22], [-30, -44], [48, -36], [76, 8], [-84, 14], [22, 36], [-52, 40], [4, -14], [96, -12], [-12, 18]];
    for (const [x0, y0] of starts) {
      const pts = [x0, y0]; let a = r() * TAU, x = x0, y = y0;
      for (let k = 0; k < 4 + (r() * 3 | 0); k++) { a += (r() - 0.5) * 1.5; x += Math.cos(a) * (7 + r() * 10); y += Math.sin(a) * (7 + r() * 10); pts.push(x, y); }
      out.push(pts);
    }
    return out;
  })();
  function cracks(ctx, lit, t, litOnly) {   // the dark lines (once, in the pictures), or the light in them (every frame)
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); for (const c of CRACKS) { ctx.moveTo(c[0], c[1]); for (let i = 2; i < c.length; i += 2) ctx.lineTo(c[i], c[i + 1]); }
    if (!litOnly) { ctx.strokeStyle = 'rgba(8,14,24,0.55)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (litOnly && lit > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(K.frost, Math.min(0.7, 0.3 * lit)); ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = rgba(K.frostH, Math.min(0.95, 0.75 * lit) * (0.85 + 0.15 * Math.sin(t * 7))); ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  // water falling from a sleeve's mouth: strands straight down the screen with bright beads running down them, and rings where they land
  function pour(ctx, x, y, w, len, amt, t, seed) {
    const n = Math.max(3, Math.round(3 + amt * 2)), landed = [];
    ctx.lineCap = 'round';
    // the sheet between the outer strands
    const x0 = x - w * 0.42, x1 = x + w * 0.42;
    ctx.beginPath(); ctx.moveTo(x0, y + 2); ctx.lineTo(x1, y + 2); ctx.lineTo(x1 + 8, y + len * 0.9); ctx.lineTo(x0 - 8, y + len * 0.9); ctx.closePath();
    ctx.fillStyle = rgba(K.waterM, 0.09 + 0.03 * amt); ctx.fill();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n - 0.5, sx = x + u * w * 0.86, sy = y + 3 + hash(i, seed) * 3, L = len * (0.7 + 0.5 * hash(i, seed + 5)), wob = Math.sin(t * 2.3 + i * 1.9 + seed) * 1.4;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + wob + u * 8, sy + L * 0.5, sx + u * 16 + wob * 0.4, sy + L);
      ctx.strokeStyle = rgba(K.waterM, 0.26); ctx.lineWidth = 3.2 + amt * 0.6; ctx.stroke();
      ctx.setLineDash([6, 11]); ctx.lineDashOffset = -t * (62 + 18 * amt) - i * 4;
      ctx.strokeStyle = rgba(K.water, 0.75); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      landed.push(sx + u * 16 + wob * 0.4, sy + L, i);
    }
    for (let k = 0; k < landed.length; k += 3) {   // where each one lands
      const lx = landed[k], ly = landed[k + 1], i = landed[k + 2], q = (t * 1.3 + i * 0.37 + seed) % 1;
      ctx.beginPath(); ctx.ellipse(lx, ly, 3 + q * (10 + amt * 3), 1.6 + q * (5 + amt * 1.4), 0, 0, TAU);
      ctx.strokeStyle = rgba(K.frostH, 0.55 * (1 - q)); ctx.lineWidth = 1.3; ctx.stroke();
      if (amt > 0.8 && q < 0.4) glow(ctx, lx, ly - 2, 6 + amt * 2, K.frostH, 0.35 * (1 - q * 2.5));
    }
  }

  // ---------------------------------------------------------------------------------------------------------- the parts
  // a hand: palm and four fingers and a thumb, in its own frame (+x is where the fingers point). open: 0 a fist .. 1 flat. m: +1 for the free
  // (left) hand, -1 for the beam (right) hand: which side the thumb is on.
  function hand(ctx, x, y, ang, sc, open, m, tone) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
    const base = tone === 1 ? K.stoneM : K.stone;
    const pg = lin(ctx, -10, -12, 10, 12, [[0, K.stoneH], [0.45, base], [1, K.stoneD]]);
    const fl = [8.6, 11.4, 10.6, 8.2];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // the thumb, under the palm's edge
    const tl = 7 + 6 * open, tang = 0.45 + 0.5 * open;
    ctx.beginPath(); ctx.moveTo(1, m * 10); ctx.lineTo(1 + Math.cos(tang) * tl, m * 10 + m * Math.sin(tang) * tl);
    ctx.strokeStyle = OUT; ctx.lineWidth = 9.4; ctx.stroke(); ctx.strokeStyle = base; ctx.lineWidth = 6.4; ctx.stroke();
    // the palm: a wide, squared slab
    poly(ctx, [-14, -10.5, -9, -12.6, 8, -12.6, 12, -11, 12.6, 11, 8, 12.6, -9, 12.6, -14, 10.5], pg, OUT, 2.4);
    line(ctx, -8, -3, 6, -3.4, rgba(K.stoneDD, 0.35), 1.2); line(ctx, -8, 3.6, 6, 3.2, rgba(K.stoneDD, 0.3), 1.2);
    // the fingers
    for (let i = 0; i < 4; i++) {
      const y0 = (i - 1.5) * 6.3, len = lerp(1.2, fl[i] * 1.9, open), sp = (i - 1.5) * 0.09 * open, bx = 11.6, ex = bx + Math.cos(sp) * len, ey = y0 + Math.sin(sp) * len;
      if (len > 2.5) {
        ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(ex, ey); ctx.strokeStyle = OUT; ctx.lineWidth = 8.2; ctx.stroke();
        ctx.strokeStyle = base; ctx.lineWidth = 5.4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + 1, y0 - 1.2); ctx.lineTo(ex - 1, ey - 1.2); ctx.strokeStyle = rgba(K.stoneH, 0.75); ctx.lineWidth = 1.3; ctx.stroke();
        const j = bx + (ex - bx) * 0.55; line(ctx, j, y0 - 2.4, j, y0 + 2.6, rgba(K.stoneDD, 0.5), 1);
      }
      circle(ctx, bx + 1, y0, 3.9, base, OUT, 1.8);   // the knuckle
      circle(ctx, bx, y0 - 1, 1.4, rgba(K.stoneH, 0.8));
    }
    ctx.restore();
  }
  // the sleeve from the shoulder to the wrist: a long, bell-mouthed cloth, wider at the cuff. fs: how near the eye the hand is (a raised hand has
  // a bigger cuff). Returns the cuff's mouth, for the pour.
  function sleeve(ctx, sx, sy, hx, hy, fs, flare, bend, t, seedv) {
    const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, ang = Math.atan2(dy, dx);
    const wx = hx - ux * 15 * fs, wy = hy - uy * 15 * fs, WL = Math.hypot(wx - sx, wy - sy);
    const cx = (sx + wx) / 2 + nx * bend * WL * 0.22, cy = (sy + wy) / 2 + ny * bend * WL * 0.22;
    const w0 = 44, w1 = (38 + 14 * flare) * Math.pow(fs, 0.8);
    const N = 12, up = [], dn = [], mid = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, q = 1 - u, px = q * q * sx + 2 * q * u * cx + u * u * wx, py = q * q * sy + 2 * q * u * cy + u * u * wy;
      const tx = 2 * q * (cx - sx) + 2 * u * (wx - cx), ty = 2 * q * (cy - sy) + 2 * u * (wy - cy), tl = Math.hypot(tx, ty) || 1, px2 = -ty / tl, py2 = tx / tl;
      const w = (lerp(w0, w1, Math.pow(u, 1.8)) - 11 * Math.sin(u * Math.PI) * Math.min(1, WL / 80)) / 2 + Math.sin(u * 7 + t * 0.8 + seedv) * 0.9 * u;
      up.push(px + px2 * w, py + py2 * w); dn.push(px - px2 * w, py - py2 * w); mid.push(px, py, px2, py2, w);
    }
    const pts = up.slice(); for (let i = N; i >= 0; i--) pts.push(dn[i * 2], dn[i * 2 + 1]);
    { const r0 = mid[4]; for (let k = 1; k <= 5; k++) { const ph = k * Math.PI / 6; pts.push(sx - nx * r0 * Math.cos(ph) - ux * r0 * Math.sin(ph), sy - ny * r0 * Math.cos(ph) - uy * r0 * Math.sin(ph)); } }   // (a rounded end at the shoulder)
    ctx.save();
    // its shadow on the robe
    ctx.save(); ctx.translate(3, 7); ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = 'rgba(4,10,18,0.32)'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath();
    ctx.fillStyle = lin(ctx, sx - 20, sy - 40, sx + 30, sy + 60, [[0, '#dfe8ef'], [0.4, '#b4c1ce'], [1, '#7b8da1']]); ctx.fill();
    ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 3.2; ctx.stroke();
    ctx.clip();
    // the cloth's folds along the arm: a dark crease, a lit crease beside it, the wet dark at the cuff
    ctx.lineCap = 'round';
    for (const [f, col, lw] of [[-0.6, rgba(K.stoneDD, 0.4), 3.4], [-0.55, rgba(K.stoneH, 0.5), 1.3], [-0.1, rgba(K.stoneDD, 0.25), 2.4], [0.3, rgba(K.stoneDD, 0.3), 2.6], [0.62, rgba(K.stoneDD, 0.5), 4], [0.57, rgba(K.stoneH, 0.4), 1]]) {
      ctx.beginPath();
      for (let i = 1; i <= N; i++) { const m = mid.slice(i * 5, i * 5 + 5), px = m[0] + m[2] * m[4] * f * 1.8, py = m[1] + m[3] * m[4] * f * 1.8; i === 1 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    }
    const cw = ctx.createLinearGradient(wx - ux * 46, wy - uy * 46, wx, wy); cw.addColorStop(0, 'rgba(24,42,64,0)'); cw.addColorStop(1, 'rgba(24,42,64,0.55)');
    ctx.fillStyle = cw; ctx.fillRect(Math.min(sx, wx) - 60, Math.min(sy, wy) - 60, Math.abs(wx - sx) + 120, Math.abs(wy - sy) + 120);
    ctx.restore();
    // the cuff: a wide, thick mouth, brim-full of water that spills over its lowest edge
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(ang);
    const cwid = w1 / 2 + 2, cd = 9 * Math.max(1, fs * 0.9);
    ellipse(ctx, 1, 0, cd, cwid, 0, K.void, OUT, 3.6);
    ellipse(ctx, 2.5, 0, cd - 3, cwid - 4.5, 0, rad(ctx, 4, 0, 1, 2, 0, cwid, [[0, '#9bc6ea'], [0.6, '#4d80ad'], [1, '#1d3a58']]));
    ctx.save(); ctx.beginPath(); ctx.ellipse(2.5, 0, cd - 3, cwid - 4.5, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3 + seedv * 0.3) % 1; ctx.beginPath(); ctx.ellipse(1 + q * 2, (i - 1) * cwid * 0.35, 2 + q * 6, 1.4 + q * cwid * 0.2, 0, 0, TAU); ctx.strokeStyle = rgba(K.frostH, 0.5 * (1 - q)); ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(1, 0, cd, cwid, 0, -Math.PI * 0.6, Math.PI * 0.6, true); ctx.lineCap = 'round'; ctx.strokeStyle = K.stone; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1, 0, cd, cwid, 0, -Math.PI * 0.45, Math.PI * 0.25, true); ctx.strokeStyle = rgba(K.stoneH, 0.9); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
    return { x: wx, y: wy, w: w1, ang };
  }

  // a silver weight: a thick disc with a rim and a stamp, light off its top
  function weight(ctx, x, y, r) {
    glow(ctx, x, y, r * 2.4, K.frost, 0.25);
    circle(ctx, x, y, r + 1.4, OUT);
    circle(ctx, x, y, r, lin(ctx, x - r, y - r, x + r, y + r, [[0, K.silverH], [0.5, K.silver], [1, K.silverD]]));
    circle(ctx, x, y, r * 0.66, null, rgba(K.silverD, 0.8), 1.4);
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, Math.PI * 1.05, Math.PI * 1.7); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
    line(ctx, x - r * 0.3, y, x + r * 0.3, y, rgba(K.silverD, 0.9), 1.4);
  }

  // ---------------------------------------------------------------------------------------------------------- him
  const ROBE = (() => { const a = []; for (let i = 0; i < 22; i++) { const q = i * TAU / 22; a.push(q, 1 + (hash(i, 3) - 0.5) * 0.1); } return a; })();
  function robe(ctx, P, t, wobK) {
    const pts = [];
    for (let i = 0; i < 22; i++) {
      const q = ROBE[i * 2], j = ROBE[i * 2 + 1], s = Math.sin(q), south = 0.5 + 0.5 * s;   // wider and longer on the party's side
      const rx = (98 + 8 * south + 6 * P.sw * 10) * j, ry = (80 + 10 * south) * j, w = Math.sin(t * 0.9 + i * 1.7) * 1.2 * wobK;
      pts.push(Math.cos(q) * (rx + w), 30 + Math.sin(q) * (ry + w));
    }
    smooth(ctx, pts, rad(ctx, -20, 20, 8, 0, 34, 118, [[0, '#d9e2ea'], [0.55, '#a9b7c5'], [1, '#6a7c91']]), OUT, 3.2);
    // the hem: darker where the sea has been working at it, a thread of light along the lip
    ctx.save(); ctx.translate(0, 30); ctx.scale(0.93, 0.93); ctx.translate(0, -30);
    smooth(ctx, pts, null, 'rgba(26,42,62,0.32)', 9); ctx.restore();
    smooth(ctx, pts, null, rgba(K.stoneH, 0.45), 1.2);
    // folds, falling from the shoulders to the hem
    ctx.save(); smooth(ctx, pts, null, null, 0); ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0; i < 20; i++) {
      const a = i * TAU / 20 + 0.1, c = Math.cos(a), s2 = Math.sin(a), bend = (hash(i, 9) - 0.5) * 0.4;
      ctx.beginPath(); ctx.moveTo(c * 52, 22 + s2 * 48); ctx.quadraticCurveTo(c * 84 + s2 * bend * 40, 30 + s2 * 68 - c * bend * 30, c * 118, 30 + s2 * 92);
      ctx.strokeStyle = rgba(K.stoneDD, 0.3); ctx.lineWidth = 3.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c * 52 - 2, 20 + s2 * 48); ctx.quadraticCurveTo(c * 84 - 2 + s2 * bend * 40, 28 + s2 * 68 - c * bend * 30, c * 118 - 2, 28 + s2 * 92);
      ctx.strokeStyle = rgba(K.stoneH, 0.3); ctx.lineWidth = 1.4; ctx.stroke();
    }
    // wet, dark staining up from the hem and a few small sea-worn chips
    for (let i = 0; i < 30; i++) { const a = hash(i, 11) * TAU, d = 76 + hash(i, 12) * 26; glow(ctx, Math.cos(a) * d, 30 + Math.sin(a) * d * 0.9, 10 + hash(i, 13) * 12, '#1f3047', 0.24); }
    ctx.restore();
  }
  function mantle(ctx, P, t) {
    const sw = 1 + P.sw, base = [-104, 6, -98, -24, -70, -46, -34, -52, 0, -50, 34, -52, 70, -46, 98, -24, 104, 6, 90, 34, 50, 52, 0, 58, -50, 52, -90, 34], pts = [];
    for (let i = 0; i < base.length; i += 2) pts.push(base[i] * sw, base[i + 1] * (1 + P.sw * 0.5) + Math.sin(t * 0.8 + i) * 0.5);
    smooth(ctx, pts, rad(ctx, -46, -30, 6, 0, 0, 132, [[0, '#eaf1f6'], [0.45, '#bac7d3'], [1, '#6f8197']]), OUT, 3.4);
    ctx.save(); smooth(ctx, pts, null, null, 0); ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {   // folds running from the neck out over the shoulders
      const a = -0.45 + i * 0.4, c = Math.cos(a), s2 = Math.sin(a), b = (hash(i, 21) - 0.5) * 16;
      ctx.beginPath(); ctx.moveTo(c * 26, s2 * 24); ctx.quadraticCurveTo(c * 66 + b, s2 * 56 - b, c * 112, s2 * 70);
      ctx.strokeStyle = rgba(K.stoneDD, 0.32); ctx.lineWidth = 3.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c * 26 - 1.4, s2 * 24 - 1.4); ctx.quadraticCurveTo(c * 66 + b - 1.4, s2 * 56 - b - 1.4, c * 112 - 1.4, s2 * 70 - 1.4);
      ctx.strokeStyle = rgba(K.stoneH, 0.34); ctx.lineWidth = 1.3; ctx.stroke();
    }
    // the stone has been under the sea: pale crusts of small shell clustered on the shoulders, and dark wet at the edges
    for (let i = 0; i < 7; i++) { const a = hash(i, 31) * TAU, d = 62 + hash(i, 32) * 34, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.6; for (let k = 0; k < 6; k++) circle(ctx, x + (hash(i * 7 + k, 33) - 0.5) * 12, y + (hash(i * 7 + k, 34) - 0.5) * 9, 1 + hash(i * 7 + k, 35) * 1.8, rgba(K.stoneH, 0.8), rgba(K.stoneDD, 0.7), 0.7); }
    for (let i = 0; i < 10; i++) { const a = hash(i, 41) * TAU; glow(ctx, Math.cos(a) * 100, Math.sin(a) * 54, 16 + hash(i, 42) * 12, '#1f3047', 0.3); }
    cracks(ctx, 0, 0, false);   // (inside the mantle's own outline)
    ctx.restore();
    // a silver clasp at the breast, and the three small weights he wears hanging from a cord
    const cl = 42;
    line(ctx, -26, cl - 6, 26, cl - 6, rgba(K.silverD, 0.9), 2);
    circle(ctx, 0, cl, 7.2, lin(ctx, -7, cl - 7, 7, cl + 7, [[0, K.silverH], [1, K.silverD]]), OUT, 2);
    line(ctx, -5, cl, 5, cl, rgba(K.silverD, 0.9), 1.6); line(ctx, 0, cl - 5, 0, cl + 5, rgba(K.silverD, 0.9), 1.6);
    for (const [wx, wy] of [[-17, 57], [0, 64], [17, 57]]) { line(ctx, 0, cl + 5, wx, wy - 4, rgba(K.silverD, 0.9), 1.1); circle(ctx, wx, wy, 4.8, lin(ctx, wx - 4, wy - 4, wx + 4, wy + 4, [[0, K.silverH], [1, K.silverD]]), OUT, 1.4); }
  }
  // what moves on the mantle: light from the water under him sliding over the stone, and the light in the cracks
  function mantleLive(ctx, P, t) {
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.12 + i / 4) % 1, x = -100 + q * 200, y = -10 + Math.sin(q * 6.3 + i) * 22;
      ctx.beginPath(); ctx.ellipse(x, y, 36, 3.4, -0.5 + i * 0.3, 0, TAU); ctx.fillStyle = rgba(K.frostH, 0.08 * Math.sin(q * Math.PI)); ctx.fill();
    }
    if (P.cg > 0.02) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 4, 102, 54, 0, 0, TAU); ctx.clip(); cracks(ctx, P.cg, t, true); ctx.restore(); }
  }
  // the head: a great cowl seen from above, its mouth toward the party; in the mouth a smooth, blank face of wet stone and nothing else
  function hoodBody(ctx) {
    // the head's shadow on the shoulders: it stands well above them
    ctx.save(); ctx.translate(5, 13); smooth(ctx, [0, 54, 32, 46, 50, 16, 48, -16, 30, -44, 0, -56, -30, -44, -48, -16, -50, 16, -32, 46], 'rgba(4,10,18,0.35)'); ctx.restore();
    const a = [0, 54, 32, 46, 48, 16, 46, -16, 30, -44, 0, -56, -30, -44, -46, -16, -48, 16, -32, 46];
    smooth(ctx, a, rad(ctx, -16, -20, 4, 0, 0, 66, [[0, '#f1f6fa'], [0.5, '#c4cfda'], [1, '#7f90a4']]), OUT, 3.6);
    ctx.save(); smooth(ctx, a, null, null, 0); ctx.clip();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(2, -26, 0, -56); ctx.strokeStyle = rgba(K.stoneDD, 0.28); ctx.lineWidth = 3; ctx.stroke();   // the seam over the crown
    ctx.beginPath(); ctx.moveTo(-1.6, 10); ctx.quadraticCurveTo(0.4, -26, -1.6, -56); ctx.strokeStyle = rgba(K.stoneH, 0.4); ctx.lineWidth = 1.1; ctx.stroke();
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {   // heavy folds sweeping down either side
      const k = 16 + i * 14 + (s > 0 ? 3 : -2);
      ctx.beginPath(); ctx.moveTo(s * k * 0.5, -34 + i * 8 + s * 3); ctx.quadraticCurveTo(s * (k + 18), -10 + i * 4, s * (k + 10), 22 + i * 6);
      ctx.strokeStyle = rgba(K.stoneDD, 0.24); ctx.lineWidth = 3.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * k * 0.5 - 1.5, -35 + i * 8 + s * 3); ctx.quadraticCurveTo(s * (k + 18) - 1.5, -11 + i * 4, s * (k + 10) - 1.5, 21 + i * 6);
      ctx.strokeStyle = rgba(K.stoneH, 0.3); ctx.lineWidth = 1.2; ctx.stroke();
    }
    cracks(ctx, 0, 0, false);   // (inside the hood's own outline)
    ctx.restore();
  }
  function hood(ctx, P, t) {
    const hz = P.hz + 0.05 * P.ht, hy = 4 + P.hl;
    ctx.save(); ctx.translate(0, hy); ctx.rotate(P.hd * 0.8); ctx.scale(hz, hz);
    sprite('hood', ctx);
    // the mouth of the cowl: the dark, a rolled lip, and the face that has no features
    const open = 1 + 0.35 * P.ht, my = 26 - 4 * P.ht;
    ctx.save(); ctx.translate(P.hd * 4, 0);
    ellipse(ctx, 0, my, 30 * open, 20 * open, 0, K.void, OUT, 2.6);
    ellipse(ctx, 0, my + 4, 26 * open, 15 * open, 0, rad(ctx, 0, my + 3, 2, 0, my + 3, 27, [[0, '#5b6c80'], [0.7, '#2b384a'], [1, '#101826']]));
    ellipse(ctx, 0, my + 8, 18 * open, 9.4 * open, 0, rad(ctx, -4, my + 5, 2, 0, my + 8, 18, [[0, '#d3deea'], [0.6, '#94a4b6'], [1, '#5e6e82']]), rgba(K.out, 0.5), 1);
    // the water's light moving on it, and a faint sheen: the only thing that ever happens on his face
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, my + 8, 18 * open, 9.4 * open, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 3; i++) { const q = (t * 0.2 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(-12 + q * 24, my + 8, 6, 2 + 2 * Math.sin(q * 6 + i), 0.3, 0, TAU); ctx.fillStyle = rgba(K.frostH, 0.2 * Math.sin(q * Math.PI)); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, my, 30 * open, 20 * open, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.lineCap = 'round'; ctx.strokeStyle = K.stone; ctx.lineWidth = 4.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, my, 30 * open, 20 * open, 0, Math.PI * 0.2, Math.PI * 0.8); ctx.strokeStyle = rgba(K.stoneH, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    if (P.cg > 0.02) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, -2, 46, 52, 0, 0, TAU); ctx.clip(); cracks(ctx, P.cg * 0.8, t, true); ctx.restore(); }
    ctx.restore();
  }

  // The robe, the mantle and the head's body never change, so each is drawn once into a picture (at twice the size) and stamped.
  const P0 = Object.assign({}, IDLE);
  const SPEC = {
    robe: [260, 220, 130, 80, c => robe(c, P0, 0, 1.2)],
    mantle: [240, 140, 120, 70, c => mantle(c, P0, 0)],
    hood: [130, 140, 65, 72, c => hoodBody(c)],
  };
  const SPR = {};
  function sprite(name, ctx) {
    const sp = SPEC[name];
    let s = SPR[name];
    if (s === undefined) {
      if (typeof document === 'undefined') s = null;
      else {
        const cv = document.createElement('canvas'); cv.width = sp[0] * 2; cv.height = sp[1] * 2;
        const x = cv.getContext('2d'); x.scale(2, 2); x.translate(sp[2], sp[3]); sp[4](x);
        s = { cv, w: sp[0], h: sp[1], ox: sp[2], oy: sp[3] };
      }
      SPR[name] = s;
    }
    if (!s) sp[4](ctx); else ctx.drawImage(s.cv, -s.ox, -s.oy, s.w, s.h);
  }

  // ---------------------------------------------------------------------------------------------------------- Ormun
  const hands = {};
  function draw(ctx, st, angle) {
    const g = st.or || (st.or = newState());
    const t = st.t || 0, pose = update(g, st, angle, t), P = g.p, tp = t - g.t0, name = pose >= 0 ? POSES[pose] : '';
    ctx.save();
    ctx.rotate(-angle);   // (the canvas was turned to face where he looks: he does not turn)
    ctx.scale(GS, GS);
    const base = ctx.globalAlpha, al = base * clamp(P.fd, 0, 1);
    if (al < 0.01) { ctx.restore(); return; }
    ctx.save();
    ctx.globalAlpha = al;
    // a little breath, and the shaking of a blow
    const breath = Math.sin(t * 0.85) * 0.012;
    const shx = P.sk ? Math.sin(t * 61) * 3.2 * P.sk : 0, shy = P.sk ? Math.cos(t * 47) * 3.2 * P.sk : 0;
    ctx.translate(shx, shy + P.sd * 46);
    ctx.scale(1 + breath + P.sw * 0.4 + P.ld * 0.012, 1 + breath * 0.6 + P.sw * 0.3 + P.ld * 0.012);
    if (P.sd > 0.02) {   // sunk in the water: the cloth below the waterline goes dark and the sea closes round him
      glow(ctx, 0, 30, 150, '#04101c', 0.45 * P.sd);
    }
    // water round the foot of the robe
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.2 + i / 3) % 1;
      ctx.beginPath(); ctx.ellipse(0, 32, 112 + q * 34, 92 + q * 28, 0, 0, TAU);
      ctx.strokeStyle = rgba(K.frostH, 0.2 * (1 - q) * Math.min(1.3, 0.6 + P.pr * 0.4)); ctx.lineWidth = 2; ctx.stroke();
    }
    glow(ctx, 0, 34, 150, '#03070d', 0.5);
    sprite('robe', ctx);
    // the hem drips all round: short strands falling off the wet cloth
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.05 + (i / 15) * Math.PI * 0.9, x = Math.cos(a) * 104 * 0.98, y = 30 + Math.sin(a) * 88, q = (t * (0.6 + 0.3 * hash(i, 2)) + hash(i, 3)) % 1, L = (8 + 16 * hash(i, 4)) * (0.6 + 0.4 * P.pr);
      ctx.strokeStyle = rgba(K.water, 0.5 * (1 - q)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + q * 6); ctx.lineTo(x, y + q * 6 + L * q); ctx.stroke();
    }
    ctx.restore();

    // ---- the two arms. A hand nearer the eye (raised) is drawn over his head; one near the robe, under it.
    const fs = P.fs, bs = P.bs, S1 = [SHOULDER[1][0] + 7 * P.ld, SHOULDER[1][1] - 6 * P.ld];   // (the free shoulder rolls up and back as the blow is gathered)
    const freeHigh = fs > 1.3, beamHigh = bs > 1.3;
    // shadows of raised hands on the cloth and the water beneath
    for (const [hx, hy, s, on] of [[P.fx, P.fy, fs, true], [P.bx, P.by, bs, true]]) if (on && s > 1.08) glow(ctx, hx + 4 * (s - 1), hy + 20 * (s - 1) + 6, 30 * s, '#06101c', 0.3 * Math.min(1, (s - 1) * 1.4));
    const fa = Math.atan2(P.fy - S1[1], P.fx - S1[0]), ba = Math.atan2(P.by - SHOULDER[0][1], P.bx - SHOULDER[0][0]);
    // the water from both sleeves, under the arms
    const flare = P.sp;
    const armBeam = () => {
      const cuff = sleeve(ctx, SHOULDER[0][0], SHOULDER[0][1], P.bx, P.by, bs, flare, 0.9, t, 1);
      hand(ctx, P.bx, P.by, ba, bs, P.bo, -1, 0);
      return cuff;
    };
    const armFree = () => {
      const cuff = sleeve(ctx, S1[0], S1[1], P.fx, P.fy, fs, flare, -0.7, t, 2);
      hand(ctx, P.fx, P.fy, fa, fs, P.fo, 1, 0);
      if (P.wt > 0.05) weight(ctx, P.fx + Math.cos(fa) * 18 * fs, P.fy + Math.sin(fa) * 18 * fs, 9 * fs * Math.min(1, P.wt * 1.4));
      if (P.gl > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.fx + Math.cos(fa) * 16 * fs, P.fy + Math.sin(fa) * 16 * fs + 6, 54 * fs, K.frost, 0.38 * P.gl); glow(ctx, P.fx + Math.cos(fa) * 16 * fs, P.fy + Math.sin(fa) * 16 * fs + 6, 24 * fs, K.frostH, 0.4 * P.gl); ctx.restore(); }
      return cuff;
    };
    // pour first (under the arm that makes it): the cuff mouths are worked out from the arms' own geometry
    const pourFor = (sx, sy, hx, hy, h, fl) => {
      const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, wx = hx - dx / L * 15 * h, wy = hy - dy / L * 15 * h, w1 = (32 + 10 * fl) * Math.pow(h, 0.8);
      pour(ctx, wx, wy + w1 * 0.24, w1, Math.min(120, (28 + 24 * P.pr) * (0.75 + 0.4 * h)), P.pr, t, sx > 0 ? 3 : 7);
    };
    if (P.pr > 0.02) { pourFor(SHOULDER[0][0], SHOULDER[0][1], P.bx, P.by, bs, flare); pourFor(S1[0], S1[1], P.fx, P.fy, fs, flare); }
    if (!beamHigh) armBeam();
    sprite('mantle', ctx); mantleLive(ctx, P, t);
    if (!freeHigh) armFree();
    hood(ctx, P, t);
    if (beamHigh) armBeam();
    if (freeHigh) armFree();
    // a cold breath over him in the last act and at his end: light standing off the stone
    if (P.cg > 0.1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 6, 150, K.frost, 0.1 * P.cg); ctx.restore(); }
    if (name === 'tide' && tp > 0.9) {   // the sleeves in spate: a surge of water rings spreading out from under the arms
      for (let i = 0; i < 3; i++) {
        const q = ((tp - 0.9) * 0.7 + i / 3) % 1;
        ctx.beginPath(); ctx.ellipse(0, 30, 130 + q * 180, 104 + q * 130, 0, 0, TAU); ctx.strokeStyle = rgba(K.frostH, 0.4 * (1 - q)); ctx.lineWidth = 3.4 * (1 - q) + 0.8; ctx.stroke();
      }
    }
    ctx.restore();
    ctx.restore();
  }

  function body(ctx, st, angle = 0) { draw(ctx, st, angle); }
  return { body, POSES, KEYS, K, BEAM, SHOULDER };
})();

if (typeof BOSS_ART !== 'undefined') BOSS_ART.ormun = OR_ART.body;
