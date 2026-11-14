// Vesper, the Mirror Knight (set 6, Season 2, Boss XIV): everything she looks like, drawn in code, and the Glass Knight, her reflection.
// A tall knight in mirror-bright plate with no face: a smooth egg of a helm whose visor is a clean bright oval that shows the room round
// her (a horizon, a pale window, a few pillars). Black-water cloth at the joints and in the long tabard, frost-blue etching, nothing warm.
// A long two-handed blade, Evenfall, carried point-down at rest. She is still, upright and unhurried: even her wind-ups are slow ones.
// The Glass Knight is the same figure drawn dimmer, silver-blue and see-through, with a faint sheen sliding over her; it is a second body in
// the same style (same poses, same props), not a reflection image: the script gives it its own state and a mirrored angle.
// Loaded after arena-view.js; it adds to BOSS_ART / ADD_ART itself. The room (vesper-room.js) and every telegraph and impact are not drawn here.
//
// Drawn like Caelum: upright on the screen's axes (drawBoss turns the canvas by `angle`, the body turns it back), about 170 px tall at scale 1
// (hitbox 70 stays inside her). Facing is read from the shoulders (the leading one comes forward), the visor (a clear oval to the camera, a
// sliver in profile, a plain seamed helm from behind), the blade and the way she leans into a cut. She is drawn at the game's RAID_BOSS_SCALE.
//
// Poses (st.props, held while the move runs: boss-vfx.js CAST_POSE for casts, main.js 'banim' for the rest). Key = 'vs' + Name:
//   vsRest      blade point-down, hands on the pommel (the default: no prop needed)
//   vsCone      the wide cone cut (Evenfall): the blade raised back over the shoulder, then a long forward cut along her facing
//   vsClose     the close circular cut: the blade held low behind her, then once round her, close
//   vsFar       the far ring cut: the arm and blade stretched out to the full, once round, her body leaning back from it
//   vsCrossL    half-hall cross-cut to the screen's LEFT: drawn across to the right, then cut through the front to the left
//   vsCrossR    half-hall cross-cut to the screen's RIGHT
//   vsRing      striking the blade on the wall (the raidwide): drawn back, then driven out at the wall she faces and held there
//   vsBuster    the two-room overhead buster: the blade straight up in both hands, then chopped down at what she faces
//   vsKneel     kneeling on one knee, both hands on the pommel, the point in the floor, the head bowed (during the wall)
//   vsPlant     planting the blade in the floor (the last act): raised point-down, driven in, then she stands behind it with both hands on it
//   vsDash      the dash-cut of the sword dance: low, leaning hard along her facing with the blade trailing, a streak behind; the cut itself
//               is the strike of the cast
//   vsEnrage    Last Reflection: the blade up in both hands, the visor blazing
//   vsIntro     coming into the hall: she thickens out of the glass from the head down, head bowed over the planted blade, then lifts it
//   vsDeath     going down on both knees, the blade falling from her hands, cracks running through the plate, the shine going out of it and
//               the whole figure fading to nothing over about four seconds
// The newest prop that is on wins. With no pose prop: st.action { type: 'attack' } is a short plain chop (her auto-attack), st.moving a slow walk.
// A pose may also be named through st.props.vs = 'cone' or st.action.type = 'cone' (a harness can drive her so). With no other pose she kneels
// while the room moment 'vskneel' runs (vesper.js: the wall) until 'vsturn' begins, so the script needs no pose prop for the wall.
// Cuts run on the cast machinery the others use: while the pose is held and the cast bar fills she stays in the wind-up; the swing is
// st.action { type: 'attack', t0, dur } (main.js sets it with t0 = cast end - 0.45), so the blow lands as the bar empties. The poses that are
// not casts (kneel, plant, intro, death, dash's stance) run on the time since the prop turned on.
//
// The Glass Knight: VS_ART.glass (BOSS_ART.vesperglass, ADD_ART.glassknight). Draw it with the mirrored angle (north mirror: -angle; east
// mirror: Math.PI - angle). It takes the same poses and props, plus:
//   st.props.vsStep  half a pace out of line (-1 .. 1; the smooth step takes about 0.4 s): she slides sideways on the screen's x (or y when
//                    st.props.vsStepY is set), leaning a little into it, and a faint pale echo stays where she should have been standing.
// VS_ART.POSES / VS_ART.KEYS list the names.

const VS_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const nrm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const EDGE = '#070d1b';
  // the real knight's colours, and the glass one's (dimmer, bluer, a little greyer)
  const REAL = {
    hi: '#f8fcff', hi2: '#d9e5f2', mid: '#aebdd3', mid2: '#7d8fab', lo: '#46557a', dk: '#26304c',
    water: '#08111f', waterM: '#112038', waterH: '#223a5e', frost: '#9fd2ff', frostH: '#e3f4ff', visorT: '#2a4a88', visorB: '#cfe0f4',
  };
  const GLASS = {
    hi: '#cfe1f3', hi2: '#a9c0d9', mid: '#8199b8', mid2: '#5c7699', lo: '#344c70', dk: '#1a2a44',
    water: '#09152a', waterM: '#12264a', waterH: '#223e68', frost: '#86bdf4', frostH: '#d4eaff', visorT: '#233f78', visorB: '#9db8d8',
  };
  const C = Object.assign({}, REAL);

  // ---------------------------------------------------------------------------------------------------------- poses
  const POSES = ['rest', 'cone', 'close', 'far', 'crossL', 'crossR', 'ring', 'buster', 'kneel', 'plant', 'dash', 'enrage', 'intro', 'death'];
  const KEYS = POSES.map(n => 'vs' + n[0].toUpperCase() + n.slice(1));
  const IDX = {}; POSES.forEach((n, i) => { IDX[n] = i; });
  const PK = ['px', 'py', 'dx', 'dy', 'L', 'lean', 'drop', 'bow', 'lit', 'crack', 'dim', 'lift'];
  // px py: the pommel; dx dy: where the blade points; L: the blade's length on the screen; lean: how far the head leans from the feet; drop:
  // how far the body has sunk (a kneel); bow: the head bowed; lit: how bright the blade and the visor are; crack: cracks through the plate;
  // dim: the shine going out; lift: the shoulders lifted (arms up)
  const GRIP = 24;
  const restT = (fx, fy) => { const d = nrm(fx * 0.14, 1); return { px: fx * 6, py: -79 + fy * 3, dx: d[0], dy: d[1], L: 100 + fy * 6, lean: 0, drop: 0, bow: 0, lit: 0.5, crack: 0, dim: 0, lift: 0 }; };

  function newState() {
    return { p: Object.assign({ px: 0, py: -79, dx: 0, dy: 1, L: 100, lean: 0, drop: 0, bow: 0, lit: 0.5, crack: 0, dim: 0, lift: 0 }, {}), on: new Array(POSES.length).fill(-1), pose: -1, t0: 0, last: NaN, dt: 0, ph: 0, mv: 0, vis: 1, reveal: 1, tr: [], step: 0, fx: 0, fy: 1, name: '' };
  }
  // where a swing is, in the beats of draw-util.js strikeBeats. A cast gives the body its action at the cast's START (main.js 'bcast': t0 = the cast's end - 0.45), so the
  // gather can run across the whole cast: w 0 .. 1 is how far she has loaded (slowly, by degrees; full coil 0.33 s before the blow lands, then a held beat), wl the same
  // but sooner (the weight sinks before the blade comes up), strike 0 .. 1 the committed cut (0.11 s, ending on the landing frame: u = 0.45), S that with the overshoot,
  // rest 0 .. 1 back to standing, land the dip of the landing, cloth how far what hangs off her lags. has: there is a swing at all. u: seconds since the action began.
  function atk(g, st, t, pose) {
    const a = st.action, z0 = { strike: 0, S: 0, rest: 0, w: 1, wl: 1, p: -1, u: -9, has: false, ovr: 0, land: 0, cloth: 0, fast: false };
    if (!a || a.type !== 'attack') { g.actK = null; return z0; }
    if (g.actK !== a.t0) { g.actK = a.t0; g.actSeen = t; }
    const Z = strikeBeats(st), u = t - a.t0, end = Math.min(a.dur, 1.2, 1.12);
    const cs = pose > 0 && g.t0 >= g.actSeen - 0.05 && g.t0 < a.t0 ? g.t0 : g.actSeen;   // (when the gather began: the cast's start)
    const x = clamp((t - cs) / Math.max(0.25, a.t0 + 0.12 - cs), 0, 1);
    let strike = 0, rest = 0;
    if (u > end) { strike = 1; rest = 1; } else if (u >= 0) { strike = Z.hit; rest = Z.rest; }
    const w = x * 0.55 + 0.45 * x * x * (3 - 2 * x);
    return { strike, S: strike >= 1 ? 1 + 0.08 * Z.ovr : strike, rest, w, wl: 1 - (1 - w) * (1 - w), p: u / a.dur, u, has: true, ovr: Z.ovr, land: Z.land, cloth: Z.cloth, fast: u > 0.1 && u < 0.5 };
  }
  // a sweep that takes its time (a circle, a long cross-cut): 0 .. 1 from u0 to the landing, eased at both ends, a little faster in the middle
  const sweepS = (A, u0) => { const q = clamp((A.u - u0) / (0.45 - u0), 0, 1); return q * 0.62 + 0.38 * q * q * (3 - 2 * q); };
  // vesper.js: the room moment 'vskneel' (both knights kneel through the wall) holds until The Mirror Turns ('vsturn') begins. Returns when it began, or null.
  function roomKneel(t) {
    const room = typeof ArenaView !== 'undefined' ? ArenaView.liveRoom : null, ev = room && room.ev, k = ev && ev.vskneel;
    if (!k || t < k.start - 0.05 || t >= k.end) return null;
    if (ev.vsturn && ev.vsturn.start >= k.start) return null;
    return k.start;
  }
  // vesper.js 'The Line': the blade is held raised through the build-up and the held beat and driven in at the climax (the room event vsline, which walls/vesper.js stages);
  // returns when the build-up began and when the blade went in (null until it does), or null when no Line is running
  function roomLine(t) {
    const room = typeof ArenaView !== 'undefined' ? ArenaView.liveRoom : null, ev = room && room.ev, a = ev && ev.vsline0;
    if (!a || t < a.start - 0.05) return null;
    const b = ev.vsline && ev.vsline.start >= a.start ? ev.vsline : null;
    if (!b && t > a.start + 9) return null;
    return { t0: a.start, plant: b ? b.start : null };
  }
  function pickPose(g, st, t) {
    const pr = st.props, a = st.action;
    let best = -1, bt = -1e18;
    if (pr) for (let i = 1; i < KEYS.length; i++) {
      if (pr[KEYS[i]]) { if (g.on[i] < 0 || g.on[i] > t) g.on[i] = t; if (g.on[i] > bt) { bt = g.on[i]; best = i; } } else g.on[i] = -1;
    }
    if (best < 0 && pr && typeof pr.vs === 'string' && IDX[pr.vs] > 0) { best = IDX[pr.vs]; bt = g.pose === best ? g.t0 : t; }
    if (best < 0 && a && typeof a.type === 'string' && IDX[a.type] > 0 && t - a.t0 < (a.dur || 3) + 0.4) { best = IDX[a.type]; bt = a.t0; }
    if (best < 0) { const k = roomKneel(t); if (k != null) { best = IDX.kneel; bt = k; } }   // (the wall: both knights kneel until The Mirror Turns)
    if (best !== g.pose) { g.pose = best; g.t0 = bt; }
    return best;
  }
  // blend a wind-up and a strike target by the swing, then back toward rest as she recovers
  function swingT(T, W, X, A) {
    for (const k of PK) {
      if (W[k] == null && X[k] == null) continue;
      const a = W[k] != null ? lerp(T[k], W[k], k === 'drop' || k === 'lean' ? A.wl : A.w) : T[k], b = X[k] != null ? X[k] : T[k];
      T[k] = lerp(lerp(a, b, A.S), T[k], A.rest);
    }
  }
  const ang = a => [Math.cos(a), Math.sin(a)];
  // the targets for this frame
  function aim(g, st, pose, A, tp, t, fx, fy) {
    const T = restT(fx, fy), p = g.p, name = pose >= 0 ? POSES[pose] : '';
    let rate = 8;
    const striking = A.has && A.strike > 0 && A.strike < 1 && A.rest === 0;
    const S = A.strike, R = A.rest;
    const sgn = fx >= 0 ? 1 : -1;
    if (name === 'cone') {
      const d0 = nrm(-fx * 0.8, -1), d1 = nrm(fx * 0.95, 0.35 + 0.3 * fy);
      swingT(T, { px: -fx * 14, py: -108, dx: d0[0], dy: d0[1], L: 126, lean: -fx * 9, drop: 0.1, lit: 0.9, lift: 0.9 }, { px: fx * 16, py: -66 + fy * 4, dx: d1[0], dy: d1[1], L: 134, lean: fx * 12, lit: 1.1, lift: 0.2, drop: 0.12 }, A);
    } else if (name === 'close' || name === 'far') {
      const far = name === 'far', R0 = far ? 178 : 88, h = far ? 66 : 60, dir = far ? -1 : 1;
      const phi0 = Math.atan2(fy, fx) + (far ? -Math.PI * 0.6 : Math.PI * 0.75);
      const sw = A.has ? sweepS(A, far ? 0.12 : 0.16) : 0, sw1 = Math.min(sw, 1), Sx = sw1 + (sw >= 1 ? 0.08 * A.ovr : 0);
      const phi = phi0 + dir * (TAU * Sx - 0.55 * A.w * (1 - sw1)), rr = R0 * (1 - 0.3 * R);   // (she draws the blade back before the circle: the cut starts from behind the start)
      const tipx = Math.cos(phi) * rr, tipy = 38 + Math.sin(phi) * rr - h;
      const hr = far ? 26 : 20, hx = Math.cos(phi) * hr, hy = -64 + Math.sin(phi) * hr * 0.8;
      const d = nrm(tipx - hx, tipy - hy);
      const tgt = { px: hx, py: hy, dx: d[0], dy: d[1], L: Math.max(46, Math.hypot(tipx - hx, tipy - hy) - GRIP), lean: (far ? -Math.cos(phi) * 11 : Math.cos(phi) * 6) * (1 - R), lit: far ? 1.2 : 1.05, lift: far ? 1 : 0.3, drop: (far ? 0.06 : 0.14) * (1 - R) };
      for (const k in tgt) T[k] = lerp(lerp(T[k], tgt[k], k === 'drop' || k === 'lean' ? A.wl : A.w), T[k], R * R);
    } else if (name === 'crossL' || name === 'crossR') {
      const L_ = name === 'crossL', a0 = L_ ? -0.26 : Math.PI + 0.26, a1 = L_ ? 2.9 : 0.24, dA = a1 > a0 ? 1 : -1;
      const sw = A.has ? sweepS(A, 0.2) : 0, sw1 = Math.min(sw, 1), S2 = sw1 + (sw >= 1 ? 0.06 * A.ovr : 0), back = A.w * (1 - sw1);
      const a = lerp(a0, a1, S2) - dA * 0.4 * back, d = ang(a), s = L_ ? 1 : -1;
      const tgt = { px: lerp(s * 18, -s * 14, S2), py: lerp(-74, -70, S2), dx: d[0], dy: d[1], L: lerp(114, 140, S2), lean: lerp(s * 6, -s * 12, S2) - s * 5 * back, lit: 1.05, lift: 0.4, drop: 0.08 * S2 + 0.1 * A.wl * (1 - sw1) };
      for (const k in tgt) T[k] = lerp(lerp(T[k], tgt[k], k === 'drop' || k === 'lean' ? A.wl : A.w), T[k], R);
    } else if (name === 'ring') {
      const d0 = nrm(-fx, -fy * 0.8 + 0.5), d1 = nrm(fx * 0.95, fy * 0.8 - 0.05);
      swingT(T, { px: -fx * 16, py: -74, dx: d0[0], dy: d0[1], L: 112, lean: -fx * 10, drop: 0.08, lit: 0.9, lift: 0.6 }, { px: fx * 16, py: -72, dx: d1[0], dy: d1[1], L: 140, lean: fx * 9, lit: 1.35, lift: 0.3, drop: 0.1 }, A);
    } else if (name === 'buster') {
      const d1 = nrm(fx * 0.9, fy * 0.7 + 0.28);
      swingT(T, { px: 0, py: -124, dx: -fx * 0.3, dy: -1, L: 138, lean: -fx * 8, drop: 0.1, lit: 1.0, lift: 1 }, { px: fx * 14, py: -62, dx: d1[0], dy: d1[1], L: 134, lean: fx * 10, lit: 1.3, lift: 0.2, drop: 0.15 }, A);
    } else if (name === 'kneel') {
      Object.assign(T, { px: fx * 6, py: -50, dx: fx * 0.08, dy: 1, L: 66 + fy * 10, drop: 1, bow: 1, lit: 0.35, lean: fx * 2 });
    } else if (name === 'plant' && roomLine(t) && (!(roomLine(t).plant != null && t - roomLine(t).plant > 1.2))) {
      const LN = roomLine(t), up = clamp((t - LN.t0) / 3.3, 0, 1);
      if (LN.plant == null) Object.assign(T, { px: fx * 5, py: -118 - 7 * easeOut(up), dx: 0, dy: 1, L: 96, lean: -fx * (3 + 4 * up), lit: 0.9 + 0.5 * up, lift: 1, drop: -0.04 * up, bow: 0 });   // (drawn up and held, the weight gathered under it)
      else { const u = clamp((t - LN.plant) / 0.7, 0, 1); rate = 32; Object.assign(T, { px: fx * 5, py: -76, dx: 0, dy: 1, L: 90 + fy * 8, lean: fx * 2, bow: 0.5 + 0.5 * (1 - u), lit: 1.0 + 0.5 * (1 - u), drop: 0.06 + 0.2 * (1 - u) * (1 - u) }); }   // (driven in: she drops onto it and settles)
    } else if (name === 'plant') {
      if (tp < 0.9) Object.assign(T, { px: fx * 5, py: -118, dx: 0, dy: 1, L: 96, lean: -fx * 3, lit: 0.9, lift: 1 });
      else { Object.assign(T, { px: fx * 5, py: -76, dx: 0, dy: 1, L: 90 + fy * 8, lean: fx * 2, bow: 0.5, lit: 1.0, drop: 0.06 }); if (tp < 1.4) rate = 30; }
    } else if (name === 'dash') {
      const d0 = nrm(-fx, 0.25 - fy * 0.2), d1 = nrm(fx, fy * 0.5 + 0.15), moving = st.moving ? 1 : 0;
      const stance = { px: -fx * 4, py: -62, dx: d0[0], dy: d0[1], L: 120, lean: fx * (14 + 8 * moving), drop: 0.22, lit: 0.95, lift: 0.4 };
      if (A.has) { const c = A.w * (1 - A.strike); stance.px -= fx * 9 * c; stance.py -= 6 * c; stance.drop += 0.07 * c; stance.lift += 0.3 * c; }   // (each cut is gathered: the blade drawn further back, the weight down)
      if (A.has) swingT(T, stance, { px: fx * 20, py: -62, dx: d1[0], dy: d1[1], L: 134, lean: fx * 16, drop: 0.2, lit: 1.3, lift: 0.3 }, A);
      else Object.assign(T, stance);
    } else if (name === 'enrage') {
      Object.assign(T, { px: Math.sin(t * 43) * 0.6, py: -124 + Math.sin(t * 37) * 0.5, dx: 0, dy: -1, L: 138, lit: 1.55, lift: 1, lean: Math.sin(t * 29) * 0.8 });
    } else if (name === 'intro') {
      Object.assign(T, { px: fx * 5, py: -78, dx: 0, dy: 1, L: 92 + fy * 8, bow: lerp(1, 0, clamp((tp - 1.7) / 1.2, 0, 1)), lit: lerp(0.15, 0.55, clamp(tp / 2.4, 0, 1)), drop: 0.04 * (1 - clamp(tp / 2.4, 0, 1)) });
      if (tp > 2.4) { const u = clamp((tp - 2.4) / 1.4, 0, 1); T.py = lerp(-78, -79 + fy * 3, u); T.L = lerp(92 + fy * 8, 100 + fy * 6, u); }
    } else if (name === 'death') {
      const sink = easeOut(clamp(tp / 1.3, 0, 1)), fall = easeOut(clamp((tp - 1.0) / 0.9, 0, 1));
      const d1 = nrm(sgn * 0.95, 0.22);
      T.drop = 1.18 * sink; T.bow = 1.5 * sink; T.lean = fx * 3 * sink; T.lit = 0.4 * (1 - fall); T.crack = clamp((tp - 0.9) / 1.6, 0, 1); T.dim = clamp((tp - 1.3) / 2.0, 0, 1); T.lift = 0;
      T.px = lerp(fx * 6, sgn * 34, fall); T.py = lerp(-50, 22, fall); T.dx = lerp(fx * 0.08, d1[0], fall); T.dy = lerp(1, d1[1], fall); T.L = lerp(66 + fy * 10, 108, fall);
      rate = 14;
    } else if (pose < 0 && A.has && A.p >= 0 && A.rest < 1) {   // the plain chop
      const d1 = nrm(fx * 0.9, fy * 0.6 + 0.4);
      swingT(T, { px: -fx * 4, py: -92, dx: -fx * 0.3, dy: -1, L: 112, lean: -fx * 2, lift: 0.4 }, { px: fx * 12, py: -68, dx: d1[0], dy: d1[1], L: 122, lean: fx * 7, lit: 0.9, drop: 0.08 }, A);
    }
    if (pose < 0 || name === 'rest') {
      if (st.moving) { T.lean = fx * 3; T.py -= 1; T.L -= 6; }
    }
    // (the beats of a blow, whatever the pose: the landing's dip, and a breath on the slow gather; the blow itself is followed closely so it ends on the landing frame)
    if (A.has && (pose < 0 || name === 'cone' || name === 'close' || name === 'far' || name === 'crossL' || name === 'crossR' || name === 'ring' || name === 'buster' || name === 'dash')) {
      if (A.land > 0.01) T.drop += 0.09 * A.land;
      if (A.strike < 1) T.lift += 0.08 * Math.sin(t * 1.7) * A.w;
    }
    if (A.has && A.fast) rate = 90;
    else if (A.has && A.strike >= 1 && A.rest < 0.5 && pose > 0) rate = 16;
    const a = 1 - Math.exp(-rate * g.dt);
    for (let i = 0; i < PK.length; i++) { const k = PK[i]; p[k] += (T[k] - p[k]) * a; }
  }
  function update(g, st, angle, t) {
    let dt = g.last === g.last ? t - g.last : 0;
    if (dt < 0) dt = 0; else if (dt > 0.1) dt = 0.1;
    g.last = t; g.dt = dt;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    g.fx = fx; g.fy = fy;
    const pose = pickPose(g, st, t), A = g.A = atk(g, st, t, pose), tp = t - g.t0;
    g.name = pose >= 0 ? POSES[pose] : '';
    aim(g, st, pose, A, tp, t, fx, fy);
    g.mv += ((st.moving && pose < 0 ? 1 : 0) - g.mv) * (1 - Math.exp(-5 * dt));
    g.ph += dt * (2.2 * g.mv);
    // how much of her is there (intro: thickening out of the glass from the head down; death: fading at the end)
    let vis = 1, reveal = 1;
    if (g.name === 'intro') { reveal = clamp(tp / 2.1, 0, 1); vis = 0.35 + 0.65 * clamp(tp / 2.6, 0, 1); }
    else if (g.name === 'death') vis = 1 - clamp((tp - 2.6) / 1.5, 0, 1);
    g.vis = vis; g.reveal = reveal;
    // the glass knight's step out of line
    const pr = st.props || {}, tgtStep = pr.vsStep ? clamp(+pr.vsStep || 0, -1, 1) : 0;
    g.step += (tgtStep - g.step) * (1 - Math.exp(-7 * dt));
    return pose;
  }

  // ---------------------------------------------------------------------------------------------------------- plate and cloth
  // a mirror ramp: bright sky, a hard dark horizon, the paler ground under it
  // (a gradient is the same object on any canvas, so the ones for a part that does not move are made once per palette)
  const GRAD = new Map();
  function chrome(ctx, x0, y0, x1, y1, k = 0) {
    const key = C.hi + C.mid2 + (x0 * 2 | 0) + ',' + (y0 * 2 | 0) + ',' + (x1 * 2 | 0) + ',' + (y1 * 2 | 0) + ',' + k;
    let g = GRAD.get(key);
    if (g) return g;
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, C.hi); g.addColorStop(0.26 + k, C.hi2); g.addColorStop(0.46 + k, C.mid); g.addColorStop(0.53 + k, C.lo); g.addColorStop(0.6 + k, C.mid2); g.addColorStop(1, C.hi2);
    if (GRAD.size > 400) GRAD.clear();
    GRAD.set(key, g);
    return g;
  }
  function lim(ctx, pts, col, w) {
    tracePath(ctx, pts); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = w + 2.6; ctx.strokeStyle = EDGE; ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  }
  // a bright etched line (frost-blue light in a groove)
  function etch(ctx, pts, a = 0.6, w = 0.9) {
    tracePath(ctx, pts); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(C.frost, a); ctx.lineWidth = w; ctx.stroke();
  }
  function plateP(ctx, pts, g, lw = 1.8) { poly(ctx, pts, g, EDGE, lw); }

  // a vertical cylinder's shading across a limb: dark on the shaded (left) side, a bright core, a clean rim on the right (made once per palette and place)
  function cyl(ctx, xl, xr, k = 0) {
    const key = 'c' + C.hi + C.mid2 + (xl | 0) + ',' + (xr | 0) + ',' + k;
    let g = GRAD.get(key);
    if (g) return g;
    g = ctx.createLinearGradient(xl, 0, xr, 0);
    g.addColorStop(0, C.lo); g.addColorStop(0.16, C.mid2); g.addColorStop(0.42, C.hi2); g.addColorStop(0.62 + k, C.hi); g.addColorStop(0.86, C.mid); g.addColorStop(1, C.hi2);
    if (GRAD.size > 400) GRAD.clear();
    GRAD.set(key, g);
    return g;
  }
  // a fixed horizontal light-and-shade over a part (dark left edge, rim light on the right), laid over a plate that is already drawn
  function shadeOver(ctx, pts, xl, xr, dark = 0.34, rim = 0.3) {
    const key = 'sh' + (xl | 0) + ',' + (xr | 0) + ',' + dark + ',' + rim;
    let g = GRAD.get(key);
    if (!g) {
      g = ctx.createLinearGradient(xl, 0, xr, 0);
      g.addColorStop(0, 'rgba(7,13,27,' + dark + ')'); g.addColorStop(0.4, 'rgba(7,13,27,0)'); g.addColorStop(0.84, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,' + rim + ')');
      if (GRAD.size > 400) GRAD.clear();
      GRAD.set(key, g);
    }
    tracePath(ctx, pts); ctx.closePath(); ctx.fillStyle = g; ctx.fill();   // (the same outline again, with the light and shade over it: no clip needed)
  }
  // a tapered armour limb from (x0, y0) to (x1, y1) with half-widths w0, wm (the swell in the middle) and w1; filled with the cylinder shading
  function plateLimb(ctx, x0, y0, x1, y1, w0, wm, w1, fill, rim = 0.7) {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    poly(ctx, [x0 + nx * w0, y0 + ny * w0, mx + nx * wm, my + ny * wm, x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1, mx - nx * wm, my - ny * wm, x0 - nx * w0, y0 - ny * w0], fill, EDGE, 1.8);
    const s = nx >= 0 ? 1 : -1;   // the lit edge is the one that faces the screen's right
    ctx.beginPath(); ctx.moveTo(x0 + s * nx * w0 * 0.74, y0 + s * ny * w0 * 0.74 + 1); ctx.lineTo(mx + s * nx * wm * 0.76, my + s * ny * wm * 0.76); ctx.lineTo(x1 + s * nx * w1 * 0.7, y1 + s * ny * w1 * 0.7 - 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.3; ctx.strokeStyle = rgba(C.hi, rim); ctx.stroke();
    return [nx, ny];
  }
  // one leg: the cuisse (thigh plate) to the knee cop, the greave, the sabaton. (hx, hy) the hip, (kx, ky) the knee, (ax, ay) the ankle
  function leg(ctx, hx, hy, kx, ky, ax, ay, flip) {
    const s = hx < 0 ? -1 : 1, xm = Math.min(hx, kx), xM = Math.max(hx, kx);
    plateLimb(ctx, hx, hy, kx, ky, 9.4, 9.2, 7.2, cyl(ctx, xm - 9.4, xM + 9.4), 0.6);
    plateLimb(ctx, kx, ky + 3, ax, ay - 3, 7.2, 7.8, 5.2, cyl(ctx, Math.min(kx, ax) - 8, Math.max(kx, ax) + 8), 0.8);
    // the knee cop: a plate with a point and a lit crown
    poly(ctx, [kx - 7.4, ky - 3.4, kx, ky - 8.4, kx + 7.4, ky - 3.4, kx + 6.2, ky + 4.6, kx, ky + 7.4, kx - 6.2, ky + 4.6], chrome(ctx, kx - 7, ky - 8, kx + 7, ky + 7), EDGE, 1.6);
    line(ctx, kx - 3, ky - 3.4, kx + 3.4, ky - 3.4, rgba(C.hi, 0.85), 1.2);
    // the sabaton: a long, heavy boot with a lame over the instep, pointed toward the camera
    const bx = ax, by = ay;
    poly(ctx, [bx - 6.8, by - 5, bx + 6.8, by - 5, bx + 8, by + 1.2, bx + (flip ? 11 : 7), by + 4.8, bx - (flip ? 7 : 11), by + 4.8, bx - 8, by + 1.2], cyl(ctx, bx - 9, bx + 9), EDGE, 1.7);
    line(ctx, bx - 6.2, by - 1.4, bx + 6.2, by - 1.4, rgba(C.hi, 0.7), 1);
    line(ctx, bx - 7, by + 1.6, bx + 7, by + 1.6, rgba(EDGE, 0.55), 1);
  }
  // the long tabard of black-water cloth: it hangs from the belt to the knee and sways a little
  function tabard(ctx, t, mv, sway, spread, back, hem) {
    const N = 6, w0 = 8.6, w1 = 10.6 + spread, top = -50, pts = [-w0, top, w0, top];
    for (let i = 0; i <= N; i++) { const u = i / N, x = w1 - u * 2 * w1, y = hem + (i % 2 ? 3.4 : -1) + Math.sin(t * 1.3 + i * 1.1) * sway; pts.push(x + Math.sin(t * 0.9 + i) * sway * 0.4, y); }
    const g = ctx.createLinearGradient(0, top, 0, hem + 4); g.addColorStop(0, C.waterH); g.addColorStop(0.35, C.waterM); g.addColorStop(1, C.water);
    poly(ctx, pts, g, EDGE, 2);
    // frost-blue edges and a silver line down the middle: a long narrow blade etched in the cloth
    etch(ctx, [-w0 + 1.6, top + 3, -w1 + 3.4, hem - 3], 0.42, 1); etch(ctx, [w0 - 1.6, top + 3, w1 - 3.4, hem - 3], 0.42, 1);
    if (!back) { line(ctx, 0, top + 6, 0, hem - 8, rgba(C.hi2, 0.6), 1.2); poly(ctx, [0, top + 5, 2.3, top + 9, 0, top + 18, -2.3, top + 9], rgba(C.hi, 0.75), EDGE, 0.8); }
    else line(ctx, 0, top + 3, 0, hem - 4, rgba(C.lo, 0.7), 1);
    // a silver band at the hem
    ctx.beginPath(); ctx.moveTo(-w1 + 1.4, hem - 6); for (let i = 0; i <= N; i++) { const u = i / N; ctx.lineTo(-w1 + u * 2 * w1, hem + (i % 2 ? 0.6 : -3.4) + Math.sin(t * 1.3 + (N - i) * 1.1) * sway * 0.8); }
    ctx.strokeStyle = rgba(C.hi2, 0.75); ctx.lineWidth = 1.5; ctx.stroke();
  }
  // the tassets: three lames either side of the belt, flaring over the hip (the upper one over the lower), and the belt
  function tassets(ctx, fx, wh) {
    for (const s of [-1, 1]) for (let i = 2; i >= 0; i--) {
      const y = -49 + i * 8.2, x0 = s * 4 * wh, x1 = s * (21 + i * 3) * wh, yy = y + 12.8;
      const pts = [x0, y, x1, y + 1.5, x1 + s * 2.2 * wh, yy - 1, x0 + s * 1.2, yy];
      plateP(ctx, pts, chrome(ctx, x0, y, x1 + s * 2, yy), 1.7);
      line(ctx, x0 + s * 2, y + 2.6, x1 - s * 0.8, y + 3.4, rgba(C.hi, 0.8), 1.2);
    }
    poly(ctx, [-19 * wh, -54, 19 * wh, -54, 18 * wh, -46.4, -18 * wh, -46.4], cyl(ctx, -19 * wh, 19 * wh), EDGE, 1.7);   // the belt
    poly(ctx, [0, -55, 5.6, -50.2, 0, -45.4, -5.6, -50.2], chrome(ctx, -5, -55, 5, -45), EDGE, 1.3);
    line(ctx, -16 * wh, -52.6, 16 * wh, -52.6, rgba(C.hi, 0.7), 1);
  }
  // the cuirass, the gorget: a keel down the front that tells which way she is turned. back: the back plate, a spine and no keel
  // A broad chest tapering to a real waist; the plate is shaded dark on the left and rim-lit on the right.
  function cuirass(ctx, fx, back, lit, t, crack) {
    const wsc = (1 - 0.3 * Math.abs(fx)) * 0.93, kx = fx * 4.6;
    // the neck: a short column of black-water mail under the helm, rings of plate round it
    const nx = fx * 3;
    poly(ctx, [nx - 7, -108, nx + 7, -108, nx + 8.4, -98, nx - 8.4, -98], C.waterM, EDGE, 1.6);
    line(ctx, nx - 5.6, -102.6, nx + 5.6, -102.6, rgba(C.frost, 0.3), 0.9);
    ctx.save(); ctx.translate(fx * 2.4, 0); ctx.scale(wsc, 1);
    const pts = [-13, -97.5, 13, -97.5, 22, -93.5, 26.4, -85, 25.8, -75, 22, -65, 18.6, -56, 17.6, -50.5, -17.6, -50.5, -18.6, -56, -22, -65, -25.8, -75, -26.4, -85, -22, -93.5];
    plateP(ctx, pts, chrome(ctx, -26, -97, 26, -50), 2.2);
    shadeOver(ctx, pts, -27, 27, 0.36, 0.34);
    // the plate's own lames: a curve under the breast and one at the waist
    ctx.beginPath(); ctx.moveTo(-22.6, -67); ctx.quadraticCurveTo(0, -61, 22.6, -67); ctx.strokeStyle = rgba(EDGE, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-19.2, -58.2); ctx.quadraticCurveTo(0, -54.4, 19.2, -58.2); ctx.strokeStyle = rgba(EDGE, 0.6); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22.4, -66); ctx.quadraticCurveTo(0, -60, 22.4, -66); ctx.strokeStyle = rgba(C.hi, 0.5); ctx.lineWidth = 0.9; ctx.stroke();
    if (!back) {
      // the keel, and the two bright curves of the breast catching the room
      ctx.beginPath(); ctx.moveTo(kx, -96.5); ctx.quadraticCurveTo(kx * 1.1, -77, kx * 0.6, -52); ctx.strokeStyle = rgba(C.hi, 0.95); ctx.lineWidth = 1.7; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(kx + 1.4, -95.5); ctx.quadraticCurveTo(kx * 1.1 + 1.6, -77, kx * 0.6 + 1.2, -53); ctx.strokeStyle = rgba(C.lo, 0.7); ctx.lineWidth = 1; ctx.stroke();
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 22, -87); ctx.quadraticCurveTo(s * 17, -77.4, s * 8.6, -72.4); ctx.strokeStyle = rgba(C.hi, 0.75); ctx.lineWidth = 1.7; ctx.stroke(); }
      etch(ctx, [-11, -91.4, -5, -87, -5, -73], 0.4, 0.8); etch(ctx, [11, -91.4, 5, -87, 5, -73], 0.4, 0.8);
      // a small mark at the breastbone: a vertical blade in a lozenge
      poly(ctx, [kx, -83, kx + 2.8, -77, kx, -69, kx - 2.8, -77], rgba(C.waterM, 0.9), rgba(C.frost, 0.7), 0.9);
      line(ctx, kx, -81, kx, -70.4, rgba(C.frostH, 0.9), 0.9);
    } else {
      line(ctx, 0, -96.5, 0, -52, rgba(C.lo, 0.9), 1.6); line(ctx, 1.6, -95.5, 1.6, -53, rgba(C.hi, 0.7), 1);
      for (let i = 0; i < 4; i++) line(ctx, -1.2, -89 + i * 9.4, -14, -85 + i * 9.4, rgba(C.lo, 0.5), 1);
    }
    if (lit > 1.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -74, 30, C.frost, 0.16 * (lit - 1)); ctx.restore(); }
    if (crack > 0.01) cracks(ctx, crack, 0, -74, 1);
    ctx.restore();
    // the gorget: a collar of rings round the neck, flaring to the shoulders
    ellipse(ctx, fx * 3, -98.4, 15.2, 5, 0, chrome(ctx, -14, -103, 14, -94), EDGE, 1.8);
    ellipse(ctx, fx * 3, -102.4, 10, 3.2, 0, chrome(ctx, -9, -105, 9, -99), EDGE, 1.5);
    ellipse(ctx, fx * 3 - 1, -99.6, 11.4, 2.2, 0, rgba(C.hi, 0.75));
  }
  // cracks of light through the plate: from (x, y) outward, k how far they have run
  function cracks(ctx, k, x, y, sc) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = hash(i, 71) * TAU, len = (14 + 20 * hash(i, 72)) * sc * clamp(k * 1.4 - hash(i, 73) * 0.4, 0, 1);
      if (len < 2) continue;
      let px = x + (hash(i, 74) - 0.5) * 10, py = y + (hash(i, 75) - 0.5) * 12, an = a;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let s = 0; s < 4; s++) { an += (hash(i, 76 + s) - 0.5) * 1.3; px += Math.cos(an) * len / 4; py += Math.sin(an) * len / 4; ctx.lineTo(px, py); }
      ctx.strokeStyle = 'rgba(2,6,14,0.75)'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(C.frostH, 0.85 * k); ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  // a pauldron: a big dome over two lames, tilted away from the neck. (x, y) the shoulder's middle, s the side, k size
  function pauldron(ctx, x, y, s, k, lit, tilt = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    for (const [dx, dy, rx, ry, rot] of [[s * 4.6, 14.6, 12.8, 6.8, s * 0.42], [s * 3.4, 9.4, 14.6, 8, s * 0.38], [s * 2.4, 4.4, 15.6, 9.2, s * 0.34]]) {
      ctx.save(); ctx.translate(dx, dy); ctx.rotate(rot + tilt);
      ellipse(ctx, 0, 0, rx, ry, 0, chrome(ctx, -rx, -ry, rx, ry), EDGE, 1.7);
      ellipse(ctx, -1, -ry * 0.45, rx * 0.8, ry * 0.2, 0, rgba(C.hi, 0.6));
      ctx.restore();
    }
    ctx.save(); ctx.rotate(s * 0.3 + tilt);
    ellipse(ctx, 0, -2.4, 14.4, 11.2, 0, chrome(ctx, -14, -13, 14, 9, 0.02), EDGE, 2);
    ctx.beginPath(); ctx.ellipse(0, -2.4, 11.4, 8.4, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.strokeStyle = rgba(C.hi, 0.95); ctx.lineWidth = 1.7; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -2.4, 11.4, 8.4, 0, Math.PI * 0.12, Math.PI * 0.85); ctx.strokeStyle = rgba(C.lo, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -2.4, 13.6, 10.6, 0, Math.PI * 0.06, Math.PI * 0.94); ctx.strokeStyle = rgba(C.frost, 0.38 + 0.2 * Math.min(1, lit)); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  // an arm from the pauldron to the hand: a thick undersleeve of black water with a plate rerebrace, a swelling vambrace, a big elbow cop, the elbow turned out
  function arm(ctx, sx, sy, hx, hy, side) {
    const mx = (sx + hx) / 2, my = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    let ox = side, oy = 0.45; const dp = ox * ux + oy * uy; ox -= ux * dp; oy -= uy * dp; const ol = Math.hypot(ox, oy) || 1;
    const bend = Math.max(4, Math.min(15, 26 - L * 0.28)), ex = mx + ox / ol * bend, ey = my + oy / ol * bend;
    plateLimb(ctx, sx, sy, ex, ey, 7.2, 7, 6, C.waterM, 0.28);
    line(ctx, sx + 0.6, sy + 1, ex + 0.6, ey, rgba(C.frost, 0.3), 1);
    const [nx, ny] = plateLimb(ctx, ex, ey, hx, hy, 6.3, 6.6, 4.9, cyl(ctx, Math.min(ex, hx) - 8, Math.max(ex, hx) + 8), 0.9);
    // the cuff of the gauntlet: a flared band at the wrist
    const wx = hx - ux * 3.6, wy = hy - uy * 3.6;
    poly(ctx, [wx + nx * 6.6, wy + ny * 6.6, hx + nx * 5.4, hy + ny * 5.4, hx - nx * 5.4, hy - ny * 5.4, wx - nx * 6.6, wy - ny * 6.6], chrome(ctx, wx - 6, wy - 6, wx + 6, wy + 6), EDGE, 1.4);
    poly(ctx, [ex - 6.4, ey - 3, ex, ey - 7.4, ex + 6.4, ey - 3, ex + 5.4, ey + 4.2, ex, ey + 6.6, ex - 5.4, ey + 4.2], chrome(ctx, ex - 6, ey - 7, ex + 6, ey + 6), EDGE, 1.5);
    line(ctx, ex - 2.6, ey - 2.8, ex + 3, ey - 2.8, rgba(C.hi, 0.85), 1.1);
  }
  function hand(ctx, x, y, rot, big) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const w = big ? 7.2 : 6.4, h = big ? 5.6 : 5.2;
    rrect(ctx, -w, -h, w * 2, h * 2, 2.6, chrome(ctx, -w, -h, w, h), EDGE, 1.6);
    for (const q of [-0.5, 0.5]) line(ctx, w * q, -h + 0.8, w * q, h - 0.8, rgba(EDGE, 0.65), 0.9);
    line(ctx, -w + 1.4, -h + 1.2, w - 1.4, -h + 1.2, rgba('#ffffff', 0.8), 0.9);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the helm
  // a smooth egg of mirror, no face at all. The visor is a clean bright oval that shows the room round her: a horizon, a pale window and a few
  // pillars standing on it; the oval narrows to a sliver in profile and is gone from behind (where the helm has only a seam and a crest).
  function visor(ctx, cx, cy, rx, ry, fx, t, lit, bow) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
    const hz = cy + ry * (-0.22 + 0.34 * bow), g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
    const h = clamp((hz - (cy - ry)) / (2 * ry), 0.05, 0.95);
    g.addColorStop(0, C.visorT); g.addColorStop(Math.max(0, h - 0.06), '#4468a6'); g.addColorStop(h, C.hi); g.addColorStop(Math.min(1, h + 0.05), C.visorB); g.addColorStop(1, C.hi2);
    ctx.fillStyle = g; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    // pillars standing on the horizon, a pale window above them
    const sh = -fx * rx * 0.5;
    ctx.strokeStyle = 'rgba(24,40,78,0.42)'; ctx.lineWidth = Math.max(0.8, rx * 0.14);
    for (let i = -1; i <= 1; i++) { const px = cx + sh + i * rx * 0.6; ctx.beginPath(); ctx.moveTo(px, hz); ctx.lineTo(px, hz - ry * 0.5); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(cx + sh * 1.3, cy - ry * 0.5, rx * 0.34, ry * 0.2, 0, 0, TAU); ctx.fillStyle = rgba(C.frostH, 0.55); ctx.fill();
    // a bright streak that drifts across now and then
    const q = (t * 0.17) % 1, sx = cx - rx * 1.6 + q * rx * 3.2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#ffffff', 0.34 + 0.2 * Math.min(1, lit));
    ctx.beginPath(); ctx.moveTo(sx, cy - ry); ctx.lineTo(sx + rx * 0.42, cy - ry); ctx.lineTo(sx + rx * 0.1, cy + ry); ctx.lineTo(sx - rx * 0.32, cy + ry); ctx.closePath(); ctx.fill();
    if (lit > 1.1) { ctx.fillStyle = rgba(C.frostH, 0.6 * Math.min(1, lit - 1)); ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2); }
    ctx.restore();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.7; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 0.9, ry + 0.9, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.strokeStyle = rgba('#ffffff', 0.75); ctx.lineWidth = 0.9; ctx.stroke();
  }
  function helm(ctx, hx, hy, fx, fy, t, lit, bow, crack) {
    const side = Math.abs(fx), vis = clamp((fy + 0.6) / 0.6, 0, 1);
    // the crest: a thin fin on top, along the way she faces
    poly(ctx, [hx - 2.6 + fx * 2, hy - 11.6, hx + fx * 4, hy - 20.6, hx + 2.8 + fx * 2, hy - 11.8], chrome(ctx, hx, hy - 21, hx, hy - 10), EDGE, 1.3);
    // the egg
    ellipse(ctx, hx, hy, 10.8, 13.2, 0, chrome(ctx, hx - 10, hy - 13, hx + 10, hy + 13, 0.03), EDGE, 2.1);
    ellipse(ctx, hx - 3, hy - 7.6, 5.2, 2.2, -0.3, rgba('#ffffff', 0.6));
    // a clean rim of light down the right of the helm, a little shade on the left
    ctx.beginPath(); ctx.ellipse(hx, hy, 9.6, 12, 0, -1.0, 0.9); ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx, hy, 9.8, 12.2, 0, 2.2, 3.9); ctx.strokeStyle = rgba(C.lo, 0.55); ctx.lineWidth = 1.4; ctx.stroke();
    if (vis < 0.99) { line(ctx, hx + fx * 1.4, hy - 12, hx + fx * 1.4, hy + 10, rgba(C.lo, 0.8 * (1 - vis)), 1.1); }   // the seam of the back of the helm
    if (vis > 0.02) {
      const rx = vis * (2.9 + 4.8 * Math.max(0, fy) * (1 - 0.3 * side)), ry = 10.8, cx = hx + fx * (6.8 - rx * 0.4), cy = hy + 0.7 + fy * 1.2 + bow * 2.8;
      visor(ctx, cx, cy, Math.max(1.5, rx), ry, fx, t, lit, bow);
    }
    if (crack > 0.01) cracks(ctx, crack * 0.8, hx, hy, 0.6);
  }

  // ---------------------------------------------------------------------------------------------------------- Evenfall
  // the blade from the pommel (px, py) pointing (dx, dy): a wrapped grip, a swept cross-guard, a long mirror blade with a fuller etched in frost-blue
  function sword(ctx, px, py, dx, dy, L, lit, t) {
    const nx = -dy, ny = dx, gx = px + dx * GRIP, gy = py + dy * GRIP, tx = gx + dx * L, ty = gy + dy * L;
    // the glow of it
    if (lit > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const q = 0.2 + i * 0.3; glow(ctx, lerp(gx, tx, q), lerp(gy, ty, q), 18 + 10 * lit, C.frost, 0.05 + 0.06 * Math.min(1.4, lit)); } ctx.restore(); }
    // the grip
    line(ctx, px - dx * 2, py - dy * 2, gx, gy, EDGE, 7.4); line(ctx, px - dx * 2, py - dy * 2, gx, gy, C.waterM, 4.8);
    for (let i = 1; i < 6; i++) { const q = i / 6, x = lerp(px, gx, q), y = lerp(py, gy, q); line(ctx, x - nx * 2.4 - dx * 1.2, y - ny * 2.4 - dy * 1.2, x + nx * 2.4 + dx * 1.2, y + ny * 2.4 + dy * 1.2, rgba(C.mid, 0.7), 0.9); }
    circle(ctx, px - dx * 3.4, py - dy * 3.4, 4.2, C.hi2, EDGE, 1.4); circle(ctx, px - dx * 3.4 - 1, py - dy * 3.4 - 1, 1.4, rgba('#ffffff', 0.9));
    // the blade: two faces, one bright and one in shade, so it turns like a mirror
    const w0 = 5.6, w1 = 1.5, n1 = 0.93;
    const ax = gx + dx * 2, ay = gy + dy * 2, bx = gx + dx * L * n1, by = gy + dy * L * n1;
    poly(ctx, [ax + nx * w0, ay + ny * w0, bx + nx * w1, by + ny * w1, tx, ty, bx - nx * w1, by - ny * w1, ax - nx * w0, ay - ny * w0], EDGE, EDGE, 3.2);
    poly(ctx, [ax, ay, ax + nx * w0, ay + ny * w0, bx + nx * w1, by + ny * w1, tx, ty], C.hi);
    poly(ctx, [ax, ay, ax - nx * w0, ay - ny * w0, bx - nx * w1, by - ny * w1, tx, ty], C.mid2);
    line(ctx, ax + dx * 5, ay + dy * 5, gx + dx * L * 0.82, gy + dy * L * 0.82, rgba(C.frost, 0.85), 1.5);   // the fuller
    line(ctx, ax + dx * 8, ay + dy * 8, gx + dx * L * 0.8, gy + dy * L * 0.8, rgba('#ffffff', 0.9), 0.7);
    line(ctx, ax + nx * w0 * 0.9, ay + ny * w0 * 0.9, tx, ty, rgba('#ffffff', 0.75), 0.9);   // the lit edge
    // runes of the name: small dashes down the fuller
    for (let i = 0; i < 7; i++) { const q = 0.16 + i * 0.1, x = gx + dx * L * q, y = gy + dy * L * q; line(ctx, x - nx * 1.4, y - ny * 1.4, x + nx * 1.4, y + ny * 1.4, rgba(C.lo, 0.7), 0.8); }
    // the cross-guard: wide, thin, swept toward the point
    const gw = 19;
    poly(ctx, [gx + nx * gw + dx * 3.4, gy + ny * gw + dy * 3.4, gx + nx * 4 - dx * 2.4, gy + ny * 4 - dy * 2.4, gx - nx * 4 - dx * 2.4, gy - ny * 4 - dy * 2.4, gx - nx * gw + dx * 3.4, gy - ny * gw + dy * 3.4, gx - nx * (gw - 3) + dx * 0.6, gy - ny * (gw - 3) + dy * 0.6, gx - nx * 3 + dx * 1.4, gy - ny * 3 + dy * 1.4, gx + nx * 3 + dx * 1.4, gy + ny * 3 + dy * 1.4, gx + nx * (gw - 3) + dx * 0.6, gy + ny * (gw - 3) + dy * 0.6], C.hi2, EDGE, 1.6);
    line(ctx, gx - nx * (gw - 2) + dx * 2.6, gy - ny * (gw - 2) + dy * 2.6, gx + nx * (gw - 2) + dx * 2.6, gy + ny * (gw - 2) + dy * 2.6, rgba('#ffffff', 0.85), 1);
    circle(ctx, gx + dx * 1.4, gy + dy * 1.4, 2.6, C.waterM, EDGE, 1); circle(ctx, gx + dx * 1.4, gy + dy * 1.4, 1.2, C.frostH);
    // a glint runs down it now and then
    const q = (t * 0.19) % 1;
    if (q < 0.6) { const u = q / 0.6, gxx = gx + dx * L * u, gyy = gy + dy * L * u, a = Math.sin(u * Math.PI); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, gxx, gyy, 9, '#ffffff', 0.7 * a); line(ctx, gxx - 4.4, gyy, gxx + 4.4, gyy, rgba('#ffffff', 0.9 * a), 0.8); line(ctx, gxx, gyy - 4.4, gxx, gyy + 4.4, rgba('#ffffff', 0.9 * a), 0.8); ctx.restore(); }
    return [tx, ty, gx, gy];
  }
  // the swept path of the blade: pale quads between where it was on the last few frames
  function trail(ctx, g, t, tx, ty, gx, gy) {
    const tr = g.tr, last = tr[tr.length - 1];
    if (!last || last.t > t || t - last.t > 0.3) { tr.length = 0; }
    const l2 = tr[tr.length - 1];
    if (!l2 || t - l2.t > 1 / 90) tr.push({ t, x: tx, y: ty, gx: lerp(gx, tx, 0.35), gy: lerp(gy, ty, 0.35) });
    while (tr.length && t - tr[0].t > 0.24) tr.shift();
    if (tr.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i], age = clamp(1 - (t - b.t) / 0.24, 0, 1), sp = Math.hypot(b.x - a.x, b.y - a.y);
      if (sp < 2.2 || sp > 90) continue;
      ctx.fillStyle = rgba(C.frostH, 0.24 * age * age);
      ctx.beginPath(); ctx.moveTo(a.gx, a.gy); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.gx, b.gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.5 * age * age); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  // the half-cape: black-water cloth hung from the pauldron on the screen's left, a silver hem and a thin etched edge; it hangs behind her
  // (away from the way she faces) so the plate still tells her facing; from behind it lies over the back plate's left edge only (a strip from the shoulder), so the spine and lames stay in view
  function cape(ctx, t, sx0, fx, drop, sway, kn, over) {
    const top = -93 + drop, x0 = -sx0 - 9.4 - fx * 3, x1 = (over ? -15 : 4 - fx * 4) - x0, hy = 12 + Math.min(14, kn * 20) + drop * 0.4 - top, N = 4;
    ctx.save(); ctx.translate(x0, top);   // (drawn in its own frame, so that its gradient is the same one every frame)
    const wob = i => Math.sin(t * 1.15 + i * 1.3) * sway * 0.9, xe = -9 - kn * 3;
    const pts = [0, 4, 5, -1, x1, 0, x1 + 3, hy * 0.55];
    const hem = i => { const u = i / N; return [lerp(x1 + 2, xe, u) + wob(i) * 0.5, hy + (i % 2 ? 4.4 : -1.4) + wob(i + 2) * 0.8]; };
    for (let i = 0; i <= N; i++) pts.push(...hem(i));
    pts.push(xe + 2 + wob(1) * 0.4, hy * 0.55);
    let g = GRAD.get('cape' + C.waterH + C.water);
    if (!g) { g = ctx.createLinearGradient(0, 0, 30, 30); g.addColorStop(0, C.waterH); g.addColorStop(0.5, C.waterM); g.addColorStop(1, C.water); if (GRAD.size > 400) GRAD.clear(); GRAD.set('cape' + C.waterH + C.water, g); }
    poly(ctx, pts, g, EDGE, 2);
    // two folds, an etched left edge and a silver hem
    line(ctx, x1 * 0.35, 8, x1 * 0.4 + 2, hy - 2, rgba(C.waterH, 0.7), 1.1); line(ctx, x1 * 0.7, 6, x1 * 0.85 + wob(2) * 0.4, hy - 2, rgba(C.waterH, 0.6), 1.1);
    etch(ctx, [2.6, 6, xe + 4, hy * 0.55, xe + 1, hy - 3], 0.5, 1);
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const h = hem(i); if (i) ctx.lineTo(h[0], h[1] - 3); else ctx.moveTo(h[0], h[1] - 3); }
    ctx.strokeStyle = rgba(C.hi2, 0.8); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the figure
  function figure(ctx, g, st, t, glass) {
    const P = g.p, fx = g.fx, fy = g.fy, name = g.name, mv = g.mv, side = Math.abs(fx), back = fy < -0.3;
    const [dx, dy] = nrm(P.dx, P.dy), drop = clamp(P.drop, 0, 1.3) * 26, bow = P.bow;
    const bob = Math.sin(t * 0.9) * 0.7 + mv * Math.abs(Math.sin(g.ph)) * 1.6;
    const A = g.A, sway = (0.9 + mv * 1.6 + (name === 'dash' ? 2.4 : 0)) * (A && A.has ? 1 - 0.65 * A.w * (1 - A.strike) : 1) + (A && A.has ? 4.5 * Math.abs(A.cloth) + 2.5 * A.ovr : 0);   // (still while she gathers, then the cape and tabard whip through the blow)
    // her shadow and the pool of cool light she stands in on the polished floor
    ellipse(ctx, 0, 40, 40 * (1 + 0.1 * P.drop), 9.6, 0, rgba('#020510', glass ? 0.22 : 0.36));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 38, 62, C.frost, (glass ? 0.05 : 0.08) + 0.05 * Math.min(1.5, P.lit)); ctx.restore();
    if (name === 'dash') {   // the streaks she leaves behind her
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const y = -90 + i * 22 + hash(i, 1) * 8, L = 40 + 40 * hash(i, 2); line(ctx, -fx * 18, y, -fx * (18 + L), y + fy * 6, rgba(C.frostH, 0.22), 1.6); }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(0, bob * 0.5);
    ctx.transform(1, 0, -P.lean / 135, 1, 0, 0);
    // the body's footing: standing, or down on one knee
    const kn = clamp(P.drop, 0, 1.3);
    const stp = mv > 0.05 ? Math.sin(g.ph * 1.6) * 5 * mv : 0;
    const blade = () => sword(ctx, P.px, P.py, dx, dy, P.L, P.lit, t);
    let tip;
    const behind = dy < -0.28 && P.py > -110;
    if (behind) tip = blade();
    // the half-cape of black water behind her, from the shoulder that is on the screen's left
    const wh = 1 - 0.3 * side, sx0 = 23 * (1 - 0.28 * side);
    cape(ctx, t, sx0, fx, drop, sway, kn, false);
    // legs: the thighs show either side of the tabard, the tassets over their tops
    if (kn < 0.55) {
      leg(ctx, -8.4 * wh, -46 + drop, (-9.6 - stp * 0.4) * wh, -4 + drop * 0.7, (-10 - stp * 0.3) * wh, 34, false);
      leg(ctx, 8.4 * wh, -46 + drop, (9.6 + stp * 0.4) * wh, -4 + drop * 0.7, (10 + stp * 0.3) * wh, 34, true);
    } else {   // kneeling: the leading knee up, the other shin along the floor
      leg(ctx, 8, -8 + drop, 20, 12 + drop * 0.35, 11, 34, true);
      plateLimb(ctx, -8, 8 + drop * 0.1, -12, 31, 9, 8.6, 7.2, cyl(ctx, -22, 0), 0.6);
      plateLimb(ctx, -12, 32, -29, 35.4, 7.2, 7.4, 5.2, cyl(ctx, -36, -6), 0.7);
      poly(ctx, [-12 - 6.6, 29.8, -12, 26, -12 + 6.6, 29.8, -12 + 5.4, 36, -12 - 5.4, 36], chrome(ctx, -18, 26, -6, 36), EDGE, 1.5);
      line(ctx, -15, 28.6, -9, 28.6, rgba(C.hi, 0.85), 1.1);
      poly(ctx, [-27, 31.6, -35, 35.4, -27, 40.2, -22, 36.4], cyl(ctx, -36, -22), EDGE, 1.5);
    }
    tabard(ctx, t, mv, sway, kn * 8, back, 13 + Math.min(14, drop * 0.6));
    // the upper body sinks and bows with the kneel
    ctx.save(); ctx.translate(0, drop);
    ctx.save(); ctx.translate(0, 0);
    tassets(ctx, fx, wh);
    const lift = P.lift * 3.6;
    const lead = fx >= 0 ? 1 : -1;
    // the trailing pauldron first (it sits behind the chest when she is turned), then the chest, the head
    if (side > 0.35) pauldron(ctx, -lead * sx0 * 0.9 + fx * 2, -89 - lift, -lead, 0.84, P.lit);
    cuirass(ctx, fx, back, P.lit, t, P.crack);
    if (back) cape(ctx, t, sx0, fx, 0, sway, kn, true);   // from behind it hangs over the back plate
    ctx.save(); ctx.translate(0, bow * 5.5); if (bow > 0.05) ctx.rotate(0);
    helm(ctx, fx * 3.4, -119 + fy * 1.2, fx, fy, t, P.lit, bow, P.crack);
    ctx.restore();
    ctx.restore();
    ctx.restore();
    // the blade over the body (unless it was drawn behind her), then the arms on it
    if (!behind) tip = blade();
    // hands: the main one up the grip near the guard, the off hand near the pommel
    const h1x = P.px + dx * 17, h1y = P.py + dy * 17, h2x = P.px + dx * 5, h2y = P.py + dy * 5;
    const sxL = -sx0 + fx * 2.4, sxR = sx0 + fx * 2.4, sy = -88 - P.lift * 3.6 + drop;
    const mainR = dx >= 0;
    // (the arm that would cross the body goes behind the sword hand's arm: the order only matters a little)
    const sxM = mainR ? sxR : sxL, sxO = mainR ? sxL : sxR;
    const clampArm = (sx, hx, hy) => { const d = Math.hypot(hx - sx, hy - sy), m = 70; return d > m ? [sx + (hx - sx) * m / d, sy + (hy - sy) * m / d] : [hx, hy]; };
    const [o1, o2] = clampArm(sxO, h2x, h2y), [m1, m2] = clampArm(sxM, h1x, h1y);
    arm(ctx, sxO, sy, o1, o2, mainR ? -1 : 1); arm(ctx, sxM, sy, m1, m2, mainR ? 1 : -1);
    hand(ctx, o1, o2, Math.atan2(dy, dx) + Math.PI / 2, false); hand(ctx, m1, m2, Math.atan2(dy, dx) + Math.PI / 2, true);
    ctx.save(); ctx.translate(0, 0);
    // the leading pauldron over the arm's top; both when she faces the camera or away
    if (side > 0.35) pauldron(ctx, lead * sx0 * 1.05 + fx * 3, -89 - lift + drop, lead, 1.0, P.lit);
    else { pauldron(ctx, sxL - 2, -89 - lift + drop, -1, 0.98, P.lit); pauldron(ctx, sxR + 2, -89 - lift + drop, 1, 0.98, P.lit); }
    ctx.restore();
    ctx.restore();
    // a path of light along the cut
    if (tip) trail(ctx, g, t, tip[0], tip[1], tip[2], tip[3]);
    // Last Reflection: the whole of her alight
    if (name === 'enrage') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, -70, 120, C.frostH, 0.1 + 0.05 * Math.sin(t * 9));
      for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, 40, 36 + q * 140, (36 + q * 140) * 0.3, 0, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.5 * (1 - q)); ctx.lineWidth = 2.6 - q * 1.6; ctx.stroke(); }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------------------------------------- Vesper
  // the palette for this frame; a dying knight's goes dull (dim 0..1)
  const mix = (a, b, k) => { const x = hexToRgb(a), y = hexToRgb(b); return 'rgb(' + ((x[0] + (y[0] - x[0]) * k) | 0) + ',' + ((x[1] + (y[1] - x[1]) * k) | 0) + ',' + ((x[2] + (y[2] - x[2]) * k) | 0) + ')'; };
  function setPal(glass, dim) {
    const src = glass ? GLASS : REAL;
    if (!(dim > 0.01)) { Object.assign(C, src); return; }
    for (const k in src) C[k] = mix(src[k], '#3a4456', dim * 0.8);
  }
  const prep = (ctx, st, angle, glass) => {
    const g = st.vs || (st.vs = newState());
    const t = st.t || 0;
    update(g, st, angle, t);
    setPal(glass, g.p.dim);
    return { g, t };
  };
  function body(ctx, st, angle = 0) {
    const { g, t } = prep(ctx, st, angle, false);
    ctx.save(); ctx.rotate(-angle);
    const base = ctx.globalAlpha;
    if (g.vis < 0.995 || g.reveal < 0.999) ctx.globalAlpha = base * g.vis;
    if (g.reveal < 0.999) {   // thickening out of the glass from the head down: a bright edge sweeping down her
      const yy = -140 + g.reveal * 190;
      ctx.save(); ctx.beginPath(); ctx.rect(-260, -300, 520, yy + 300); ctx.clip();
      figure(ctx, g, st, t, false);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = base * Math.sin(g.reveal * Math.PI);
      ctx.fillStyle = rgba(C.frostH, 0.5); ctx.fillRect(-34, yy - 1.2, 68, 2.4); glow(ctx, 0, yy, 46, C.frost, 0.3); ctx.restore();
    } else figure(ctx, g, st, t, false);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the Glass Knight
  // the same figure, drawn into its own layer so the see-through body shows no overlapping parts, then tinted: dimmer, silver-blue, with a sheen
  const BW = 440, BH = 400, OX = 220, OY = 300;
  function glassBody(ctx, st, angle = 0) {
    const { g, t } = prep(ctx, st, angle, true);
    const base = ctx.globalAlpha;
    const stepX = g.step * 26, stepOn = Math.abs(g.step) > 0.01, axisY = !!(st.props && st.props.vsStepY);
    ctx.save(); ctx.rotate(-angle);
    if (stepOn) {   // the echo of where she should be standing: a faint pale column
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = base * 0.5 * clamp(Math.abs(g.step) * 1.4, 0, 1);
      ellipse(ctx, 0, 40, 36, 8, 0, rgba(C.frost, 0.22)); glow(ctx, 0, -50, 70, C.frost, 0.1);
      for (const y of [-130, -88, -46, -4]) line(ctx, -9, y, 9, y, rgba(C.frostH, 0.3), 1);
      ctx.restore();
    }
    ctx.translate(axisY ? 0 : stepX, axisY ? stepX : 0);
    if (typeof document === 'undefined') { figure(ctx, g, st, t, true); ctx.restore(); return; }
    const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null, s = m ? clamp(Math.hypot(m.a, m.b), 1, 2.4) : 1.5;
    let cv = st.vsCv;
    if (!cv || cv.s !== s) { cv = st.vsCv = document.createElement('canvas'); cv.s = s; cv.width = Math.ceil(BW * s); cv.height = Math.ceil(BH * s); cv.cx = cv.getContext('2d'); }
    const c2 = cv.cx;
    c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cv.width, cv.height);
    c2.setTransform(s, 0, 0, s, OX * s, OY * s);
    c2.globalAlpha = 1;
    if (g.reveal < 0.999) { c2.save(); c2.beginPath(); c2.rect(-260, -320, 520, -140 + g.reveal * 190 + 320); c2.clip(); figure(c2, g, st, t, true); c2.restore(); }
    else figure(c2, g, st, t, true);
    // the glass sheen: a slow pale band sliding across her, and a cool tint over all of it
    c2.globalCompositeOperation = 'source-atop';
    c2.fillStyle = 'rgba(96,142,206,0.16)'; c2.fillRect(-OX, -OY, BW, BH);
    const q = (t * 0.16 + 0.35) % 1, bx = -150 + q * 300, gr = c2.createLinearGradient(bx - 30, -150, bx + 30, 50);
    gr.addColorStop(0, 'rgba(220,240,255,0)'); gr.addColorStop(0.5, 'rgba(220,240,255,0.3)'); gr.addColorStop(1, 'rgba(220,240,255,0)');
    c2.fillStyle = gr; c2.fillRect(-OX, -OY, BW, BH);
    c2.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = base * 0.8 * g.vis;
    ctx.drawImage(cv, -OX, -OY, BW, BH);
    ctx.globalAlpha = base;
    ctx.restore();
  }
  // as an add (ADD_ART signature): the angle is read off the transform drawAdd set, as Garrow's shade does; drawn at 1.3 like her
  function glassAdd(ctx, st, enraged) {
    const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null, ang = m ? Math.atan2(m.b, m.a) : 0, k = 1.3 / 1.5 / (enraged ? 1.2 : 1);
    ctx.save(); ctx.scale(k, k);
    glassBody(ctx, st, ang);
    ctx.restore();
  }

  return { body, glass: glassBody, glassAdd, POSES, KEYS, K: REAL };
})();

if (typeof BOSS_ART !== 'undefined') { BOSS_ART.vesper = VS_ART.body; BOSS_ART.vesperglass = VS_ART.glass; }
if (typeof ADD_ART !== 'undefined') ADD_ART.glassknight = VS_ART.glassAdd;
