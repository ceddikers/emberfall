// Garrow, the Moon's Hound (set 4, Boss XIII): everything he looks like, drawn in code. A wolf the size of a house made of frost-mist over a
// silver skeleton that shows through at the ribs and the jaw, two small moons for eyes, a broken silver chain trailing from a collar. He
// does not snarl: he lowers his head and looks at one of you. A pose for each move; the lesser hounds of mist (add kind `misthound`), a
// pale shade of himself for Extreme (add kind `gwshade`) and the ridge of ice his runs throw up (prop kind `ridge`). Loaded after
// arena-view.js; it adds to BOSS_ART / ADD_ART / ArenaView itself. The room (garrow-room.js) and every telegraph and impact (garrow-fx.js)
// are not drawn here.
// Look: silver, black water and frost blue; nothing warm on him at all.
//
// Facing +x like the others (drawBoss turns the canvas by `angle`); the body is about 100 px nose to tail root at scale 1 (drawn at 1.3), his
// head's height, the airborne lift and the rising mist are laid out on the screen's axes (up is up) so they read whichever way he faces.
//
// Poses (st.props, held while the move runs: boss-vfx.js CAST_POSE for casts, main.js 'banim' for the rest):
//   gaScent  gaRun  gaPounce  gaSnap  gaHowl  gaRime  gaPack  gaCircle  gaDrift  gaEnrage        (the newest one that is on wins; none: idle)
//   st.action { type: 'attack' } is the plain bite ('auto'). st.action.type may also be one of the pose names above (a harness can drive him so).
//   Sequenced poses (pounce, snap, howl, rime) run on the time since the pose turned on, so they need no duration from the script.
//   `gaSide` (1 / -1) is the side his head turns to in Circle the Prey; without it the side is read off which way he is turning.
//
// ridge (PROPS rect: x, y centre, w length, h ~36 thickness, a angle): rises out of the snow when it appears (it is born with the prop);
//   pr.state === 1 shows it crumbling. The prop pipeline has no removal animation: a ridge deleted from the list is simply gone, so the
//   script should set state 1 about 1.2 s before it removes one.

const GA_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const K = {
    mist: '#9fbcd8', mistL: '#cfe3f4', mistH: '#eef7ff', mistD: '#5b7b9d', mistDD: '#2b435e',
    void: '#050b16', deep: '#0d1c30', ink: '#0b1626',
    bone: '#cfdae7', boneH: '#f4f9ff', boneD: '#8395aa', boneDD: '#46566b',
    moon: '#f4f9ff', moonG: '#a4d0ff', frost: '#bfe0ff', snow: '#f3f9ff',
    chain: '#bcc8d6', chainD: '#5f6f84',
    iceL: '#e6f5ff', iceM: '#a3cbea', iceD: '#6592bd', iceDD: '#2c4c72', iceO: '#0b1a2e',
  };

  // ---------------------------------------------------------------------------------------------------------- poses
  const POSES = ['scent', 'run', 'pounce', 'snap', 'howl', 'rime', 'pack', 'circle', 'drift', 'enrage'];
  const KEYS = POSES.map(n => 'ga' + n[0].toUpperCase() + n.slice(1));
  const IDX = {}; POSES.forEach((n, i) => { IDX[n] = i; });
  const PK = ['hh', 'hx', 'ht', 'jw', 'ey', 'rb', 'cr', 'st', 'ms', 'sk', 'fd', 'ch', 'gs', 'sl', 'bn', 'ar'];
  // hh head height (0 nose to the snow .. 1 thrown up), hx how far the head reaches, ht head turn (rad), jw jaw open, ey eye light, rb rib light,
  // cr crouch, st stretch, ms mist, sk shake, fd body opacity, ch chest swell, gs gait speed, sl stillness, bn body bend, ar air (a pounce in flight)
  const IDLE = { hh: 0.28, hx: 0, ht: 0, jw: 0, ey: 0.62, rb: 0.22, cr: 0, st: 0, ms: 1, sk: 0, fd: 1, ch: 0, gs: 0, sl: 0, bn: 0, ar: 0 };
  const PRE = {
    scent: { hh: 0.03, hx: 5, cr: 0.4, ey: 1.3, rb: 0.12, ms: 0.55, sl: 1 },
    run: { hh: 0.1, hx: 7, jw: 0.18, ey: 1, rb: 0.3, st: 1, ms: 1.8, gs: 2.4 },
    pounce: { hh: 0.05, hx: 3, ey: 1.4, cr: 1, sl: 0.6 },
    snap: { hh: 0.4, hx: -4, ey: 1.15 },
    howl: { hh: 1, hx: -3, ey: 1.25, ms: 2.1, ch: 1, jw: 0.85 },
    rime: { hh: 0.3, hx: 5, ey: 1.1, ms: 1.4 },
    pack: { hh: 0.2, jw: 0.12, ey: 0.9, ms: 2.6, sk: 1 },
    circle: { hh: 0.22, hx: 2, ey: 1, ms: 1.1, gs: 1.15 },
    drift: { ey: 1, ms: 0.35, fd: 0.06, sl: 0.4, cr: 0.1 },
    enrage: { hh: 0.16, hx: 3, ey: 1.7, rb: 1.5, ms: 2.3, jw: 0.45, cr: 0.22, sk: 0.18 },
  };
  const RATE = { pounce: 12, snap: 16, auto: 14, howl: 6, run: 6, drift: 3.2 };

  function newState() {
    const g = { p: Object.assign({}, IDLE), tg: Object.assign({}, IDLE), on: new Array(POSES.length).fill(-1), pose: -1, t0: 0, last: NaN, ph: 0, gsm: 0, lastA: NaN, om: 0, side: 1, hold: 0 };
    return g;
  }
  // where the plain bite is: p 0..1 over the swing, -1 when there is none (the same swing curve the others use)
  function bite(st) {
    const a = st.action;
    if (!a || a.type !== 'attack') return -1;
    const p = (actT(st) - a.t0) / a.dur;
    return p >= 0 && p <= 1 ? p : -1;
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
    if (best < 0 && pr && typeof pr.ga === 'string' && IDX[pr.ga] != null) { best = IDX[pr.ga]; bt = g.pose === best ? g.t0 : t; }
    if (best < 0 && a && typeof a.type === 'string' && IDX[a.type] != null && t - a.t0 < (a.dur || 3) + 0.4) { best = IDX[a.type]; bt = a.t0; }
    if (best !== g.pose) { g.pose = best; g.t0 = bt; }
    return best;
  }
  // the targets for this frame: the pose's own, then whatever its sequence says at this moment
  function aim(g, st, pose, tp, t) {
    const tg = g.tg, p = g.p;
    Object.assign(tg, IDLE);
    let rate = 7;
    if (pose >= 0) { Object.assign(tg, PRE[POSES[pose]]); rate = RATE[POSES[pose]] || 7; }
    const name = pose >= 0 ? POSES[pose] : '';
    if (name === 'pounce') {
      if (tp < 0.3) { tg.cr = lerp(0.3, 1, Math.min(1, tp / 0.3)); tg.st = 0; }
      else if (tp < 0.58) { tg.ar = 1; tg.st = 1; tg.cr = 0; tg.hh = 0.38; tg.hx = 12; tg.jw = 0.55; tg.sl = 0; }
      else { const u = Math.min(1, (tp - 0.58) / 0.6); tg.ar = 0; tg.cr = 0.6 * (1 - u); tg.hh = 0.22; tg.hx = 3; tg.jw = 0.3 * (1 - u); tg.ms = 2.4 - 1.1 * u; tg.sl = 0; }
    } else if (name === 'snap') {
      if (tp < 0.42) { tg.hh = 0.5; tg.hx = -7; tg.jw = 0.25; }
      else if (tp < 0.64) { tg.hh = 0.54; tg.hx = -5; tg.jw = 1; tg.ey = 1.25; }
      else if (tp < 0.76) { tg.hh = 0.14; tg.hx = 19; tg.jw = 0.7; rate = 22; }
      else if (tp < 0.9) { tg.hh = 0.16; tg.hx = 15; tg.jw = 0; rate = 26; }
      else { tg.hh = 0.26; tg.hx = 3; tg.jw = 0; rate = 5; }
    } else if (name === 'howl') {
      const u = Math.min(1, tp / 0.8), e = easeOut(u);
      tg.hh = lerp(0.3, 1, e); tg.ch = u; tg.hx = lerp(0, -3, e);
      tg.jw = tp < 0.8 ? 0.25 * u : 0.86 + 0.07 * Math.sin(t * 21);
    } else if (name === 'rime') {
      if (tp < 0.35) { tg.ch = 0.7; tg.hh = 0.34; tg.jw = 0; } else tg.jw = 0.5;
    } else if (name === 'enrage') tg.jw = 0.42 + 0.1 * Math.sin(t * 17);
    else if (name === 'circle') { tg.ht = g.side * 0.62; tg.bn = g.side * 0.7; }
    if (pose < 0) {   // no move: the plain bite, or just standing / walking
      const b = bite(st);
      if (b >= 0) {
        rate = 14;
        if (b < 0.3) { tg.hh = 0.4; tg.hx = -3; tg.jw = 0.3; }
        else if (b < 0.55) { tg.hh = 0.15; tg.hx = 15; tg.jw = b < 0.44 ? 0.55 : 0; }
        else { tg.hh = 0.26; tg.hx = 2; rate = 6; }
      }
    }
    if (st.moving && tg.gs < 1 && name !== 'scent' && name !== 'pounce') { tg.gs = 1; tg.hh = Math.min(tg.hh, 0.24); }
    const a = 1 - Math.exp(-rate * g.dt);
    for (let i = 0; i < PK.length; i++) { const k = PK[i]; p[k] += (tg[k] - p[k]) * a; }
    g.gsm += (tg.gs - g.gsm) * (1 - Math.exp(-5 * g.dt));
  }
  function update(g, st, angle, t, shade) {
    let dt = g.last === g.last ? t - g.last : 0;
    if (dt < 0) dt = 0; else if (dt > 0.1) dt = 0.1;
    g.last = t; g.dt = dt;
    if (g.lastA === g.lastA && dt > 1e-4) {
      let dA = angle - g.lastA; while (dA > Math.PI) dA -= TAU; while (dA < -Math.PI) dA += TAU;
      const tgt = clamp(dA / dt, -6, 6);
      g.om += (tgt - g.om) * (1 - Math.exp(-8 * dt));
    }
    g.lastA = angle;
    if (Math.abs(g.om) > 0.35) g.side = g.om > 0 ? 1 : -1;
    if (st.props && st.props.gaSide) g.side = st.props.gaSide < 0 ? -1 : 1;
    const pose = pickPose(g, st, t);
    aim(g, st, pose, t - g.t0, t);
    if (shade && st.moving) g.gsm = Math.max(g.gsm, 1.9);
    g.ph += dt * (2.4 + g.gsm * 4.6);
    return pose;
  }

  // ---------------------------------------------------------------------------------------------------------- the body's line
  // He is the darkest, heaviest thing on the pale lake: a body of night-water mist with the bone, the chain and the moons the bright parts in it.
  // PL is the mist's palette for this frame: his own (deep blue-black), or the shade's (pale, with a cold violet-grey edge).
  const NIGHT = { out: '#060c17', a: '#0b1422', b: '#15233a', c: '#24344f', d: '#3d5880', rim: '#a9c8ee', veil: '#0d1626' };
  const GHOST = { out: '#565c8c', a: '#9a9fc6', b: '#bcc0dd', c: '#d8dbee', d: '#eceef8', rim: '#ffffff', veil: '#c4c8e2' };
  const PL = { out: NIGHT.out, a: NIGHT.a, b: NIGHT.b, c: NIGHT.c, d: NIGHT.d, rim: NIGHT.rim, veil: NIGHT.veil };
  const GS = 1.7;   // how much bigger than the sketch he is drawn: a wolf the size of a house (BOSS_R 70 stays inside his body)
  // W: what bends the body this frame (read by Y). A body is drawn one at a time, so one shared record does.
  const W = { bn: 0, und: 0, ph: 0, sk: 0, t: 0 };
  // the sideways offset of the spine at x: an arc when he circles, a ripple when he trots, a twist when he shakes
  function Y(x) {
    let y = W.bn * (x + 14) * (x + 14) * 0.0036;
    y += W.und * Math.sin(W.ph - x * 0.07);
    y += W.sk * (x + 4) * 0.085 * Math.sin(W.t * 15);
    return y;
  }
  // the torso's half-width along its length (tail root .. neck base): heavy shoulders, a narrow waist, a lighter pelvis
  const PROF = [[-44, 3], [-40, 8], [-33, 13], [-26, 15.5], [-18, 12.4], [-10, 11.4], [-2, 15.5], [6, 21.5], [14, 23.5], [21, 19.5], [27, 13.5]];
  const PLN = PROF.length;
  const hwAt = x => {
    if (x <= PROF[0][0]) return PROF[0][1];
    for (let i = 1; i < PLN; i++) if (x <= PROF[i][0]) { const a = PROF[i - 1], b = PROF[i]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
    return PROF[PLN - 1][1];
  };
  const CP = new Float64Array(PLN * 4 + 8);
  const TP = new Float64Array(64);
  function smoothN(ctx, a, n, fill, stroke, lw) {
    const m = n / 2, mx = i => (a[(i % m) * 2] + a[((i + 1) % m) * 2]) / 2, my = i => (a[(i % m) * 2 + 1] + a[((i + 1) % m) * 2 + 1]) / 2;
    ctx.beginPath(); ctx.moveTo(mx(m - 1), my(m - 1));
    for (let i = 0; i < m; i++) ctx.quadraticCurveTo(a[i * 2], a[i * 2 + 1], mx(i), my(i));
    ctx.closePath(); ctx.lineJoin = 'round';
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  // the mist round the torso: the control points of a smooth outline that billows slowly. grow widens it, swell is the chest drawn full
  function outline(t, grow, ms, swell) {
    let n = 0;
    for (let pass = 0; pass < 2; pass++) {
      const s = pass === 0 ? -1 : 1;
      for (let k = 0; k < PLN; k++) {
        const i = pass === 0 ? k : PLN - 1 - k, x = PROF[i][0], sw = 1 + swell * Math.exp(-((x - 8) * (x - 8)) / 260);
        const wob = (Math.sin(t * 1.6 + i * 2.3 + pass * 1.7) * 0.9 + Math.sin(t * 2.9 + i * 1.1) * 0.5) * (0.5 + 0.3 * ms);
        CP[n++] = x + (i === 0 ? -grow * 0.6 : i === PLN - 1 ? grow * 0.5 : 0);
        CP[n++] = Y(x) + s * (PROF[i][1] * sw + grow + wob);
      }
    }
    return n;
  }
  // the mane: a ragged crest of mist along the neck and spine that streams back (further the faster he goes), and wisps torn off the flanks
  function mane(ctx, t, P, g) {
    const back = 1 + g.gsm * 0.9 + (P.ms - 1) * 0.3;
    ctx.lineCap = 'round';
    const pass = (lw, col, up) => {
      ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const dors = i < 12, x = dors ? 26 - i * 2.4 : -36 + hash(i, 1) * 62, s = hash(i, 2) < 0.5 ? -1 : 1;
        const y = dors ? Y(x) + (hash(i, 3) - 0.5) * hwAt(x) * 0.9 : Y(x) + s * (hwAt(x) + 1), len = (dors ? 10 + 10 * hash(i, 4) : 8 + 8 * hash(i, 5)) * back, sw = Math.sin(t * 2.2 + i * 1.7) * 2.4;
        const side = dors ? (hash(i, 6) < 0.5 ? -1 : 1) : s;
        ctx.moveTo(x, y + up); ctx.quadraticCurveTo(x - len * 0.5, y + side * (3 + sw) + up, x - len, y + side * (1 + sw * 0.7) + up);
      }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    };
    pass(5.6, rgba(PL.a, 0.9), 0); pass(2.4, rgba(PL.c, 0.55), 0); pass(0.8, rgba(PL.rim, 0.3), -1.2);
  }

  // ---------------------------------------------------------------------------------------------------------- his parts
  // one leg: long, reaching forward and back as he moves; a hip under the torso's side, a knee, a long paw. diag: the trot's phase for this leg
  function leg(ctx, hx, s, diag, front, P, g) {
    const hw = hwAt(hx), hipX = hx, hipY = Y(hx) + s * hw * 0.5;
    const mv = Math.min(1, g.gsm), amp = (front ? 15 : 17) * mv * (1 - 0.45 * P.cr) * (1 + 0.35 * clamp(g.gsm - 1, 0, 1));
    const sph = Math.sin(g.ph + diag), lift = Math.max(0, Math.cos(g.ph + diag));
    const ext = P.ar * (front ? 14 : -14) + P.st * (g.gsm > 1 ? 0 : (front ? 7 : -7));
    const px = hipX + amp * sph + ext + (front ? 8 : -5) - P.cr * (front ? 0 : 5), py = hipY + s * (hw * 0.5 + 12 - 2.5 * P.cr + 2.6 * lift * mv + 2 * P.ar);
    const kx = (hipX + px) / 2 + (front ? 2 : -4), ky = (hipY + py) / 2 + s * (front ? 2.4 : 3.8);
    const w = front ? 9 : 11.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kx, ky); ctx.lineTo(px, py);
    ctx.strokeStyle = PL.out; ctx.lineWidth = w + 2.8; ctx.stroke();
    ctx.strokeStyle = PL.b; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = rgba(PL.c, 0.8); ctx.lineWidth = w * 0.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kx, ky); ctx.lineTo(px, py);
    ctx.strokeStyle = rgba(K.bone, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
    // the paw: long and narrow, pointing the way he goes, with pale claws
    ctx.save(); ctx.translate(px + 4, py); ctx.rotate(s * 0.12);
    ellipse(ctx, 0, 0, front ? 9.6 : 10.4, 4, 0, PL.b, PL.out, 1.6);
    ellipse(ctx, -1, -1, 5, 1.8, 0, rgba(PL.c, 0.8));
    for (let i = -1; i <= 1; i++) line(ctx, 9.4, i * 2, 12.4, i * 2.4, K.bone, 1.2);
    ctx.restore();
    if (lift > 0.55 && mv > 0.5) glow(ctx, px - 4, py, 9, K.snow, 0.3 * mv);   // the snow a paw kicks up as it leaves the ground
  }

  // the ribs show through the mist; the rest of the bone is only a hint under it
  function skeleton(ctx, P, t, lit, shade) {
    const breath = Math.sin(t * 1.5) * (1 - P.sl), swell = 1 + 0.05 * breath + 0.12 * P.ch, dk = shade ? 0.4 : 1;
    const cx = 5, cy = Y(5);
    ellipse(ctx, cx, cy, 19, 15.4 * swell, 0, rgba(K.void, 0.3 * dk));
    ellipse(ctx, cx, cy, 16.4, 12.4 * swell, 0, rgba(K.void, 0.65 * dk));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(24, Y(24)); for (let x = 20; x >= -42; x -= 4) ctx.lineTo(x, Y(x));
    ctx.strokeStyle = rgba(K.bone, 0.28); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); for (let x = 23; x > -43; x -= 4.4) { const y = Y(x); ctx.moveTo(x + 1.5, y); ctx.arc(x, y, 1.5, 0, TAU); }
    ctx.fillStyle = rgba(K.bone, 0.3); ctx.fill();
    // the ribs: eight pairs arcing out and back, their length following the body
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const x = 17 - k * 3.9, y0 = Y(x), L = hwAt(x) * 0.8 * swell;
      for (const s of [-1, 1]) { ctx.moveTo(x, y0 + s * 1.6); ctx.quadraticCurveTo(x + 3, y0 + s * L * 0.98, x - 4, y0 + s * L); }
    }
    ctx.strokeStyle = 'rgba(3,6,12,0.85)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = rgba('#d3deeb', 0.98); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = rgba(K.boneH, 0.7); ctx.lineWidth = 0.8; ctx.stroke();
    if (lit > 0.3) {   // every rib lit
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(K.moonG, 0.3 * Math.min(1.4, lit)); ctx.lineWidth = 6.5; ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.6 * Math.min(1, lit)); ctx.lineWidth = 1.7; ctx.stroke();
      for (let k = 0; k < 8; k++) { const x = 17 - k * 3.9, y0 = Y(x), L = hwAt(x) * 0.8; for (const s of [-1, 1]) glow(ctx, x - 4, y0 + s * L, 6.5 + 2 * lit, K.moonG, 0.3 * Math.min(1.2, lit)); }
      glow(ctx, 3, cy, 30, K.moonG, 0.18 * Math.min(1.3, lit));
      ctx.restore();
    }
    // a little mist drawn back over the ends of the ribs, so they come out of the fur and are not laid on top of it
    for (let k = 0; k < 8; k += 2) { const x = 13 - k * 3.9, L = hwAt(x) * 0.8; for (const s of [-1, 1]) glow(ctx, x - 3, Y(x) + s * (L + 1), 7, PL.b, 0.5); }
  }

  // the tail: a thick plume of mist that trails and sways, longer and straighter when he runs
  function tail(ctx, t, P, g) {
    const n = 11, sw = (0.8 + g.gsm * 0.7) * (1 - 0.8 * P.sl), step = 5.6 + g.gsm * 1.2;
    let k = 0;
    const ty = i => Y(-41) + Math.sin(t * 2.4 - i * 0.6 + g.ph * 0.4) * (0.8 + i * 0.85) * sw - g.om * i * 1.6;
    for (let i = 0; i <= n; i++) { const w = 3 + 8.4 * Math.sin(Math.PI * Math.pow(i / n, 0.62)) + 1.2; TP[k++] = -41 - i * step; TP[k++] = ty(i) - w; }
    for (let i = n; i >= 0; i--) { const w = 3 + 8.4 * Math.sin(Math.PI * Math.pow(i / n, 0.62)) + 1.2; TP[k++] = -41 - i * step; TP[k++] = ty(i) + w; }
    smoothN(ctx, TP, k, rgba(PL.a, 0.35));
    k = 0;
    for (let i = 0; i <= n; i++) { const w = 3 + 8.4 * Math.sin(Math.PI * Math.pow(i / n, 0.62)) - 0.6; TP[k++] = -41 - i * step; TP[k++] = ty(i) - w; }
    for (let i = n; i >= 0; i--) { const w = 3 + 8.4 * Math.sin(Math.PI * Math.pow(i / n, 0.62)) - 0.6; TP[k++] = -41 - i * step; TP[k++] = ty(i) + w; }
    smoothN(ctx, TP, k, PL.b, rgba(PL.out, 0.8), 1.6);
    k = 0;
    for (let i = 1; i <= n - 1; i++) { const w = (3 + 8.4 * Math.sin(Math.PI * Math.pow(i / n, 0.62))) * 0.45; TP[k++] = -41 - i * step; TP[k++] = ty(i) - w - 1.4; }
    for (let i = n - 1; i >= 1; i--) { const w = (3 + 8.4 * Math.sin(Math.PI * Math.pow(i / n, 0.62))) * 0.45; TP[k++] = -41 - i * step; TP[k++] = ty(i) + w - 1.4; }
    smoothN(ctx, TP, k, rgba(PL.c, 0.7));
    ctx.lineCap = 'round'; ctx.beginPath();   // flicks off the plume
    for (let i = 2; i <= n; i += 2) { const x = -41 - i * step, y = ty(i), w = 3 + 8.4 * Math.sin(Math.PI * Math.pow(i / n, 0.62)); for (const s of [-1, 1]) { ctx.moveTo(x, y + s * w); ctx.quadraticCurveTo(x - 4, y + s * (w + 3), x - 9, y + s * (w + 1 + Math.sin(t * 3 + i) * 1.5)); } }
    ctx.strokeStyle = rgba(PL.c, 0.8); ctx.lineWidth = 2; ctx.stroke();
  }

  // the broken chain: from the collar under his flank and out behind him along the snow; it swings as he turns and streams when he runs
  const CH = new Float64Array(40);
  const CHN = 18;
  function chain(ctx, t, P, g, shade) {
    const still = 1 - P.sl * 0.85, run = clamp(g.gsm - 1, 0, 1);
    for (let j = 0; j < CHN; j++) {
      let x, y;
      if (j <= 5) { x = 23 - j * 9; y = Y(x) + hwAt(x) * 0.62; }
      else {
        const k = j - 5, c = Math.min(1, k / 9);
        x = -22 - k * 8 - run * k * 1.5;
        y = lerp(Y(-22) + 14, Y(-44) + 3, c) * (1 - run * 0.5)
          + (Math.sin(t * 2.1 - j * 0.5 + g.ph * 0.3) * k * (0.65 + g.gsm * 0.45) * still - g.om * k * 1.6) * (1 - run * 0.55);
      }
      CH[j * 2] = x; CH[j * 2 + 1] = y;
    }
    ctx.lineCap = 'round';
    for (let j = CHN - 1; j >= 0; j--) {
      const x = CH[j * 2], y = CH[j * 2 + 1], j2 = Math.min(CHN - 1, j + 1), j1 = Math.max(0, j - 1), ang = Math.atan2(CH[j2 * 2 + 1] - CH[j1 * 2 + 1], CH[j2 * 2] - CH[j1 * 2]);
      if (j === CHN - 1) {   // the last link is a ring that has been snapped open
        ctx.beginPath(); ctx.arc(x, y, 3.8, ang + 0.7, ang + TAU - 0.7); ctx.strokeStyle = OUT; ctx.lineWidth = 3.8; ctx.stroke(); ctx.strokeStyle = K.chain; ctx.lineWidth = 1.9; ctx.stroke();
      } else if (j % 2 === 0) {
        ctx.beginPath(); ctx.ellipse(x, y, 4.2, 2.5, ang, 0, TAU); ctx.strokeStyle = OUT; ctx.lineWidth = 3.6; ctx.stroke(); ctx.strokeStyle = K.chain; ctx.lineWidth = 1.7; ctx.stroke();
      } else {
        const dx = Math.cos(ang) * 2.7, dy = Math.sin(ang) * 2.7;
        line(ctx, x - dx, y - dy, x + dx, y + dy, OUT, 4); line(ctx, x - dx, y - dy, x + dx, y + dy, K.chain, 2.3); line(ctx, x - dx, y - dy, x + dx, y + dy, rgba(K.boneH, 0.6), 0.9);
      }
    }
    // a glint runs down it now and then
    const q = (t * 0.5) % 1, gj = Math.min(CHN - 1, (q * (CHN - 1)) | 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CH[gj * 2], CH[gj * 2 + 1], 8, K.moonG, 0.55 * Math.sin(((q * (CHN - 1)) % 1) * Math.PI) * (shade ? 0.6 : 1)); ctx.restore();
  }
  // the collar: a silver band round the neck with studs, the chain's first link hanging from the side of it
  function collar(ctx, nx, ny) {
    ctx.beginPath(); ctx.moveTo(nx - 2, ny - 11.5); ctx.quadraticCurveTo(nx + 5.4, ny, nx - 2, ny + 11.5);
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = K.chain; ctx.lineWidth = 3.2; ctx.stroke(); ctx.strokeStyle = rgba(K.boneH, 0.8); ctx.lineWidth = 1.1; ctx.stroke();
    for (const s of [-1, 0, 1]) circle(ctx, nx + 2.2 - Math.abs(s) * 1.9, ny + s * 6.6, 1.2, K.boneH, OUT, 0.6);
    ctx.beginPath(); ctx.ellipse(nx - 1, ny + 13, 3.6, 2.3, 0.5, 0, TAU); ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = K.chain; ctx.lineWidth = 1.6; ctx.stroke();   // where the chain hangs from it
  }

  // a small moon for an eye: a pale disc, a darker crescent on one side, a ring of light
  function moon(ctx, x, y, r, ey) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, r * 3.6 * (0.8 + 0.25 * ey), K.moonG, Math.min(1, 0.28 + 0.34 * ey));
    if (ey > 1) glow(ctx, x, y, r * 7.5, K.frost, 0.12 * (ey - 1));
    ctx.restore();
    circle(ctx, x, y, r + 0.9, '#04080f');
    circle(ctx, x, y, r, K.moon);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    circle(ctx, x - r * 0.55, y + r * 0.4, r * 0.95, rgba('#6f8fb5', 0.7));   // the shadowed limb
    ctx.restore();
    circle(ctx, x + r * 0.32, y - r * 0.3, r * 0.42, '#ffffff');
    if (ey > 0.9) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, x, y, r + 1.5, null, rgba('#ffffff', 0.35 * Math.min(1, ey - 0.8)), 1); ctx.restore(); }
  }

  // the head, in its own frame: +x is where he looks. A broad skull, a long tapering muzzle, two pointed ears swept back. jw: jaw open 0..1.
  // The lower jaw drops on the screen's axes (A is the head's heading on the screen); the bone shows through the mist more the wider it opens.
  function head(ctx, P, t, shade, A, hs, sx, pitch) {
    const jw = P.jw, ey = P.ey, d = jw * 11;
    if (jw > 0.03) {
      ctx.save(); ctx.rotate(-A); ctx.translate(0, d / hs); ctx.rotate(A); ctx.scale(sx, 1);
      poly(ctx, [-2, -6.8, 12, -6, 26, -3.2, 31.8, 0, 26, 3.2, 12, 6, -2, 6.8], K.bone, OUT, 2.2);
      poly(ctx, [0, -4.6, 12, -4.2, 25, -2.2, 28.6, 0, 25, 2.2, 12, 4.2, 0, 4.6], '#050b16');
      glow(ctx, 12, 0, 14, K.moonG, 0.28 * jw);
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const x = 3 + i * 4.6; poly(ctx, [x - 1.3, s * 4.5, x + 1.3, s * 4.5, x, s * (4.5 - 2.8)], K.boneH); }
      line(ctx, -1, -6.4, -1, 6.4, rgba(K.boneDD, 0.8), 1.3);
      ctx.restore();
    }
    ctx.save(); ctx.rotate(-A); ctx.translate(0, -jw * 3.8 / hs); ctx.rotate(A); ctx.scale(sx, 1);
    // the ears, pointed and swept back, and the cheek ruff: mist, behind the skull
    const fl = Math.sin(t * 1.1) * 0.5 + Math.sin(t * 7.3) * 0.12;
    for (const s of [-1, 1]) {
      poly(ctx, [4, s * 8, -8, s * 15, -20, s * 15, -11, s * 8.6, -17, s * 4.2], PL.b, rgba(PL.out, 0.8), 1.4);   // the ruff
      poly(ctx, [7, s * 7, -8, s * 9.4, -25 - s * fl * 2, s * (24 + fl * s * 0.8)], PL.b, PL.out, 1.8);          // the ear
      poly(ctx, [3.4, s * 7.8, -5.6, s * 10, -19.6 - s * fl * 1.6, s * (20.4 + fl * s * 0.6)], rgba(PL.d, 0.85));    // its pale lining
      line(ctx, 6, s * 7.2, -24 - s * fl * 2, s * (23.6 + fl * s * 0.8), rgba(PL.rim, 0.6), 1);
    }
    // the skull: a long muzzle and a broad cranium, silver
    poly(ctx, [6, -8.4, 14, -7.2, 24, -5, 32, -2.8, 34.4, -1, 34.4, 1, 32, 2.8, 24, 5, 14, 7.2, 6, 8.4], '#8fa2bb', OUT, 2.4);
    ellipse(ctx, 0, 0, 13.4, 12, 0, '#9cadc4', OUT, 2.4);
    ellipse(ctx, 1.4, 3, 9.4, 6.4, 0, rgba(K.boneD, 0.4));
    ellipse(ctx, -3, -3, 6.8, 3.4, -0.2, rgba(K.boneH, 0.55));
    line(ctx, -9, 0, 7, 0, rgba(K.boneD, 0.85), 1.2); line(ctx, 7, 0, 31, 0, rgba(K.boneD, 0.6), 1);   // the ridge of the skull
    for (const s of [-1, 1]) { line(ctx, 14, s * 6.2, 30, s * 3, rgba(K.boneDD, 0.5), 1); ellipse(ctx, 9.4, s * 5.8, 5, 4.2, 0, '#050b16'); }   // the sockets the moons sit in
    if (jw > 0.1) for (const s of [-1, 1]) for (const x of [24, 29.5]) poly(ctx, [x - 1.5, s * 3.2, x + 1.5, s * 3.2, x + 0.2, s * (3.2 + 1.4 + 4 * Math.min(1, jw * 1.3))], K.boneH, OUT, 0.8);   // the fangs hang from it as it opens
    ellipse(ctx, 34.2, 0, 2.8, 3, 0, '#04080f'); circle(ctx, 33.4, -1, 0.9, rgba('#ffffff', 0.55));      // the nose
    // the mist over the skull: thinner the wider the mouth, so the bone shows through as the jaw opens
    const mask = (1 - jw * 0.92) * (shade ? 0.35 : 0.62);
    poly(ctx, [-13, -12.4, 2, -13.2, 12, -9, 24, -5.8, 35.6, -1.4, 35.6, 1.4, 24, 5.8, 12, 9, 2, 13.2, -13, 12.4, -16, 0], rgba(PL.b, mask));
    for (const s of [-1, 1]) {
      poly(ctx, [-3, s * 10, -13, s * 14, -9.6, s * 6.6], PL.b, rgba(PL.out, 0.7), 1);
      poly(ctx, [-7, s * 9.6, -18, s * 11.4, -13, s * 5.4], PL.c, rgba(PL.out, 0.6), 1);
    }
    if (!P.nomoon) { const r = 2.4 + 0.45 * (ey - 0.6); moon(ctx, 9.6, -5.6, r, ey); moon(ctx, 9.6, 5.6, r, ey); }
    if (pitch > 0.4) ellipse(ctx, -6, 0, 7, 9, 0, rgba(PL.b, 0.6 * pitch));   // thrown back: the throat shows under the chin
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- Garrow
  const HP = {};
  function draw(ctx, st, angle, shade) {
    const g = st.ga || (st.ga = newState());
    const t = st.t || 0, pose = update(g, st, angle, t, shade), P = g.p, tp = t - g.t0, name = pose >= 0 ? POSES[pose] : '';
    const ca = Math.cos(angle), sa = Math.sin(angle), gsm = g.gsm, pal = shade ? GHOST : NIGHT;
    PL.out = pal.out; PL.a = pal.a; PL.b = pal.b; PL.c = pal.c; PL.d = pal.d; PL.rim = pal.rim; PL.veil = pal.veil;
    W.bn = P.bn; W.und = Math.min(1, gsm) * 1.1 + Math.max(0, gsm - 1) * 1.3; W.ph = g.ph; W.sk = P.sk * (0.9 + 0.1 * Math.sin(t * 5)); W.t = t;
    const base = ctx.globalAlpha, bodyA = base * P.fd * (shade ? 0.62 : 1), keepA = base * (shade ? 0.7 : 1);
    const air = P.ar, breath = Math.sin(t * 1.5) * (1 - P.sl);

    ctx.save(); ctx.scale(GS, GS); ctx.translate(-8, 0);   // (his middle is nearer his shoulders than his tail root)
    // a heavy soft shadow on the snow under him
    ctx.globalAlpha = bodyA * (shade ? 0.5 : 1);
    glow(ctx, 3, 14, 98, '#050a16', shade ? 0.3 : 0.46); glow(ctx, 3, 12, 62, '#03060e', shade ? 0.15 : 0.36);
    if (air > 0.02) ellipse(ctx, 0, 12, 52 * (1 - 0.18 * air), 25 * (1 - 0.18 * air), 0, 'rgba(0,0,0,' + (0.4 * air).toFixed(3) + ')');   // his shadow stays on the snow
    ctx.globalAlpha = bodyA;
    ctx.save();
    if (air > 0.02) { ctx.rotate(-angle); ctx.translate(0, -air * 17); ctx.rotate(angle); ctx.scale(1 + 0.09 * air, 1 + 0.09 * air); }
    ctx.scale(1 + 0.09 * P.st - 0.05 * P.cr, 1 - 0.05 * P.st + 0.07 * P.cr);
    if (name === 'pack') ctx.rotate(Math.sin(t * 15) * 0.05 * P.sk);

    // -- on the snow behind him: his tail, the chain, and on the run streaks of mist torn off his flanks
    tail(ctx, t, P, g);
    ctx.globalAlpha = keepA; chain(ctx, t, P, g, shade); ctx.globalAlpha = bodyA;
    const runK = clamp((gsm - 1.2) / 1.2, 0, 1);
    if (runK > 0.05) for (let i = 0; i < 10; i++) {
      const s = i % 2 ? 1 : -1, x0 = -30 + hash(i, 5) * 54, q = (t * 3.2 + hash(i, 6)) % 1, L = 24 + 26 * hash(i, 7), y0 = Y(x0) + s * (hwAt(x0) * 0.8);
      ctx.globalAlpha = bodyA * runK * 0.5 * (1 - q * 0.5);
      poly(ctx, [x0, y0 - 1.8, x0 - L * (0.5 + q * 0.5), y0 + s * (2 + 4 * q), x0, y0 + 1.8], PL.b);
    }
    ctx.globalAlpha = bodyA;
    // -- his legs, diagonal pairs
    leg(ctx, -24, -1, 0, false, P, g); leg(ctx, -24, 1, Math.PI, false, P, g);
    leg(ctx, 10, -1, Math.PI, true, P, g); leg(ctx, 10, 1, 0, true, P, g);

    // -- the mist body: layers of fog, wider and fainter outside, the body dark, its upper edge catching the moon
    const swl = 0.14 * P.ch + 0.02 * breath;
    let n = outline(t, 8, P.ms, swl); smoothN(ctx, CP, n, rgba(PL.a, shade ? 0.12 : 0.22));
    n = outline(t, 4.5, P.ms, swl); smoothN(ctx, CP, n, rgba(PL.a, shade ? 0.18 : 0.4));
    n = outline(t, 0.5, P.ms, swl);
    if (!shade) { smoothN(ctx, CP, n, rgba(PL.rim, 0.85)); ctx.save(); ctx.translate(sa * 1.5, ca * 1.5); }   // the moon-lit sliver along the upper edge: the dark body drawn a little lower over a pale one
    smoothN(ctx, CP, n, PL.b, rgba(PL.out, 0.9), 2);
    if (!shade) ctx.restore();
    n = outline(t, -4, P.ms, swl); smoothN(ctx, CP, n, rgba(PL.c, 0.7));
    n = outline(t, -10, P.ms, swl * 0.7); smoothN(ctx, CP, n, rgba(PL.d, shade ? 0.4 : 0.3));
    ctx.beginPath(); ctx.ellipse(-4, Y(-4) - 1, 24, 5, 0, 0, TAU); ctx.fillStyle = rgba(PL.d, 0.25); ctx.fill();   // the back
    skeleton(ctx, P, t, P.rb, shade);
    mane(ctx, t, P, g);

    // -- the neck, the collar and the head
    const hLen = 9 + P.hx, hang = P.ht + (1 - P.sl) * 0.07 * Math.sin(t * 0.55) + (name === 'pack' ? 0.5 * P.sk * Math.sin(t * 11) : 0);
    const nx = 22, ny = Y(22), e = P.hh > 0.28 ? (P.hh - 0.28) * 34 : (P.hh - 0.28) * 8, pitch = clamp((P.hh - 0.35) / 0.65, 0, 1);
    const hs = 1.25 + 0.1 * (P.hh - 0.28), sx = 1 - 0.5 * pitch;
    const hox = nx + Math.cos(hang) * hLen - e * sa, hoy = ny + Math.sin(hang) * hLen - e * ca;
    if (e > 3) ellipse(ctx, nx + Math.cos(hang) * hLen, ny + Math.sin(hang) * hLen + 3, 15, 9.5, hang, 'rgba(2,6,14,' + Math.min(0.4, e * 0.016).toFixed(3) + ')');   // the shadow of a raised head
    {
      const dx = hox - nx, dy = hoy - ny, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L, w0 = 17 + 2 * P.ch, w1 = 11;
      CP[0] = nx - 9 + px * w0; CP[1] = ny + py * w0; CP[2] = hox + px * w1; CP[3] = hoy + py * w1; CP[4] = hox - px * w1; CP[5] = hoy - py * w1; CP[6] = nx - 9 - px * w0; CP[7] = ny - py * w0;
      smoothN(ctx, CP, 8, PL.b, rgba(PL.out, 0.9), 1.8);
      smoothN(ctx, CP, 8, rgba(PL.c, 0.5));
      ctx.beginPath();   // the mane: wisps swept back off the neck
      for (let i = 0; i < 9; i++) { const q = 0.02 + i * 0.11, ox = nx + dx * q, oy = ny + dy * q, s = i % 2 ? 1 : -1, lw = lerp(w0, w1, q) + 1, len = (12 + 7 * hash(i, 8)) * (1 + gsm * 0.5), sw = Math.sin(t * 2.4 + i * 1.3) * 2; ctx.moveTo(ox, oy + py * s * lw); ctx.quadraticCurveTo(ox - len * 0.5, oy + py * s * (lw + 3.4 + sw), ox - len, oy + py * s * (lw + 0.5)); }
      ctx.lineCap = 'round'; ctx.strokeStyle = rgba(PL.a, 0.9); ctx.lineWidth = 4.6; ctx.stroke(); ctx.strokeStyle = rgba(PL.c, 0.95); ctx.lineWidth = 2.2; ctx.stroke(); ctx.strokeStyle = rgba(PL.rim, 0.4); ctx.lineWidth = 0.8; ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {   // frost grown on the mane and shoulders: small crystals standing up off the fur
      const q = 0.05 + i * 0.16, cxp = nx - 6 + q * 18 - (i % 2) * 5, cyp = ny + (i % 2 ? 1 : -1) * (14 - i * 0.6), h = 5 + 3 * hash(i, 9), tx = cxp - h * sa * 0.9, ty = cyp - h * ca * 0.9;
      poly(ctx, [cxp - 1.7 * ca, cyp + 1.7 * sa, tx, ty, cxp + 1.7 * ca, cyp - 1.7 * sa], K.iceL, 'rgba(11,26,46,0.7)', 0.9);
    }
    ctx.globalAlpha = keepA; collar(ctx, nx + 1, ny); ctx.globalAlpha = bodyA;
    // the head, in its own frame; the moons never fade (a Drift leaves them and the chain)
    ctx.save(); ctx.translate(hox, hoy); ctx.rotate(hang); ctx.scale(hs, hs);
    if (P.fd < 0.6) {
      head(ctx, Object.assign(HP, P, { nomoon: true }), t, shade, angle + hang, hs, sx, pitch);
      ctx.globalAlpha = keepA;
      const r = 2.4 + 0.45 * (P.ey - 0.6); moon(ctx, 9.6 * sx, -5.6, r, P.ey); moon(ctx, 9.6 * sx, 5.6, r, P.ey);
    } else head(ctx, P, t, shade, angle + hang, hs, sx, pitch);
    ctx.globalAlpha = bodyA;
    { const q = (t * 0.42) % 1, nxp = (35 + q * 14) * sx; ctx.globalAlpha = bodyA * 0.4 * (1 - q) * (1 - P.sl * 0.5); glow(ctx, nxp, Math.sin(q * 6) * 1.5, 4 + q * 7, PL.c, 0.8); ctx.globalAlpha = bodyA; }   // a breath of cold off the nose
    if (name === 'rime' && tp > 0.3) frostBreath(ctx, t, tp, P);
    ctx.restore();
    ctx.restore();   // (the body's own lift and stretch)

    // -- what happens round him, laid out on the screen's axes
    ctx.globalAlpha = bodyA;
    effects(ctx, g, P, t, tp, name, angle, hox, hoy);
    ctx.restore();
  }

  // the breath of frost from his mouth (in the head's frame, +x out of the muzzle): mist and a scatter of shards
  function frostBreath(ctx, t, tp, P) {
    const k = Math.min(1, (tp - 0.3) / 0.25);
    for (let i = 0; i < 16; i++) {
      const q = (t * 1.5 + hash(i, 1)) % 1, d = 38 + q * 66, sp = (hash(i, 2) - 0.5) * q * 34, r = 3 + q * 9;
      glow(ctx, d, sp, r, i % 3 ? '#7fa4d4' : '#dbe9f8', 0.5 * (1 - q) * k);
    }
    for (let i = 0; i < 9; i++) {
      const q = (t * 1.9 + hash(i, 3)) % 1, d = 42 + q * 60, sp = (hash(i, 4) - 0.5) * q * 30, a = hash(i, 5) * TAU + t * 3, s = 2.4 + 1.9 * hash(i, 6);
      ctx.save(); ctx.translate(d, sp); ctx.rotate(a); ctx.globalAlpha *= (1 - q) * k;
      poly(ctx, [s * 1.7, 0, 0, s * 0.6, -s * 1.7, 0, 0, -s * 0.6], K.iceL, 'rgba(11,26,46,0.8)', 0.9);
      ctx.restore();
    }
  }

  // mist rising, snow, the landing, the howl, the shed mist of the Pack, the Drift's flurry: all in the room's plane or on the screen's axes
  function effects(ctx, g, P, t, tp, name, angle, hox, hoy) {
    const gsm = g.gsm, fade = 1 - P.fd, sa = Math.sin(angle), ca = Math.cos(angle);
    // rising mist: dark plumes off his back and shoulders that climb on the screen and trail behind
    for (let i = 0; i < 12; i++) {
      const q = (t * 0.28 * (0.5 + P.ms * 0.5) + hash(i, 3)) % 1, x0 = -34 + hash(i, 4) * 60, y0 = (hash(i, 5) - 0.5) * 30, h = q * (20 + 22 * hash(i, 6)) * (0.6 + 0.4 * P.ms) * (1 - P.sl * 0.6);
      const x = x0 - q * (8 + gsm * 12), al = Math.sin(q * Math.PI) * 0.34 * Math.min(2, P.ms) * (1 - P.sl * 0.55) * Math.max(P.fd, 0.5);
      glow(ctx, x - h * sa, Y(x0) + y0 - h * ca, 8 + q * 14, i % 3 ? PL.c : PL.b, al);
    }
    // glints of frost on the fur
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = Math.sin(t * 1.3 + hash(i, 11) * TAU); if (a < 0.8) continue;
      const k = (a - 0.8) / 0.2, x = -34 + hash(i, 12) * 58, y = Y(x) + (hash(i, 13) - 0.5) * hwAt(x) * 1.5;
      line(ctx, x - 1.8 * k, y, x + 1.8 * k, y, rgba('#ffffff', 0.8 * k * P.fd), 0.8); line(ctx, x, y - 1.8 * k, x, y + 1.8 * k, rgba('#ffffff', 0.8 * k * P.fd), 0.8);
    }
    ctx.restore();
    // snow thrown up behind the paws of a run
    if (gsm > 0.6) for (let i = 0; i < 8; i++) {
      const q = (t * 2.6 + hash(i, 21)) % 1, x = -34 - q * (18 + 10 * gsm) + hash(i, 22) * 10, y = (hash(i, 23) - 0.5) * 38;
      glow(ctx, x - (q * 10) * sa, y - (q * 10) * ca, 4 + q * 6, '#f4f9ff', 0.55 * (1 - q) * Math.min(1, gsm - 0.5));
    }
    if (name === 'pounce' && tp > 0.58 && tp < 1.6) {   // the landing: snow and mist thrown out in a ring
      const u = (tp - 0.58) / 1.0;
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + hash(i, 1) * 0.3, d = 26 + u * (46 + 24 * hash(i, 2)); glow(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.8 - u * 8, 8 + u * 12, i % 2 ? '#f4f9ff' : PL.c, 0.55 * Math.max(0, 1 - u)); }
    }
    if (name === 'pack') {   // mist shaken off his flanks in billows
      for (let i = 0; i < 12; i++) {
        const s = i % 2 ? 1 : -1, q = (t * 1.2 + i / 12 * 3) % 1, x = -22 + 40 * hash(i, 4), d = hwAt(x) * 0.9 + q * (34 + 18 * hash(i, 5));
        glow(ctx, x - 6 * q - (q * 12) * sa, Y(x) + s * d - (q * 12) * ca, 8 + q * 16, i % 3 ? PL.c : PL.b, 0.55 * (1 - q) * Math.min(1, tp * 2));
      }
    }
    if (name === 'howl' && tp > 0.5) {   // the sound, going up from the mouth in crescents
      ctx.save(); ctx.translate(hox, hoy); ctx.rotate(-angle);   // (back to the screen's axes)
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.9 + i / 3) % 1;
        ctx.beginPath(); ctx.arc(0, -6 - q * 10, 14 + q * 52, -Math.PI / 2 - 0.95, -Math.PI / 2 + 0.95); ctx.strokeStyle = rgba('#27406a', 0.6 * (1 - q)); ctx.lineWidth = 4.2 - q * 2; ctx.stroke();
        ctx.strokeStyle = rgba('#e6f2ff', 0.7 * (1 - q)); ctx.lineWidth = 1.4; ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -4, 34, K.moonG, 0.16 + 0.05 * Math.sin(t * 20));
      ctx.restore();
    }
    if (name === 'enrage') {   // a cold aura that breathes, and shards of frost standing off his back
      glow(ctx, 0, 4, 110, '#050a16', 0.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 100, K.moonG, 0.1 + 0.05 * Math.sin(t * 3.4));
      ctx.restore();
      for (let i = 0; i < 9; i++) {
        const x = -30 + i * 6.4, h = (8 + 8 * hash(i, 2)) * (0.8 + 0.2 * Math.sin(t * 6 + i)), by = Y(x), tx = x - (h + 5) * sa, ty = by - (h + 5) * ca;
        poly(ctx, [x - 1.8 * ca, by + 1.8 * sa, tx, ty, x + 1.8 * ca, by - 1.8 * sa], '#f2f8ff', 'rgba(6,14,28,0.8)', 0.8);
      }
    }
    if (fade > 0.05) {   // a Drift: the body is coming apart into falling snow (it falls straight down the screen)
      for (let i = 0; i < 26; i++) {
        const q = (t * (0.18 + 0.12 * hash(i, 1)) + hash(i, 2)) % 1, x = -46 + hash(i, 3) * 100 + Math.sin(t * 0.9 + i) * 6, y = (hash(i, 4) - 0.5) * 60 + Math.sin(t * 0.7 + i * 2) * 5, fall = q * 38;
        circle(ctx, x + fall * sa, y + fall * ca, 1.1 + 1.4 * hash(i, 5), rgba(i % 2 ? '#ffffff' : '#3d5880', Math.sin(q * Math.PI) * 0.85 * Math.min(1, fade * 1.4)));
      }
      glow(ctx, 0, 0, 60, PL.c, 0.14 * fade);
    }
  }

  function body(ctx, st, angle = 0) { draw(ctx, st, angle, false); }
  // a shade of Garrow himself (Extreme): the same body, pale and see-through with a cold violet-grey edge. An add is drawn at 1.5 and he at 1.3, so it is drawn smaller to match.
  function shadeAdd(ctx, st, enraged) {
    const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null, ang = m ? Math.atan2(m.b, m.a) : 0, k = 1.3 / 1.5 / (enraged ? 1.2 : 1);
    ctx.save(); ctx.scale(k, k);
    draw(ctx, st, ang, true);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the lesser hound of mist
  const HC = [[-17, 0], [-12, -5.6], [-4, -8.2], [4, -7.8], [10, -4.8], [13.4, -2], [13.4, 2], [10, 4.8], [4, 7.8], [-4, 8.2], [-12, 5.6]];
  const HB = new Float64Array(HC.length * 2);
  // A low dark shape of mist, nose down on a trail: a clear head with pointed ears, two pale eyes, a hint of spine. About 30 px from nose to tail at scale 1:
  // a lesser cousin of him, dark on the snow like he is.
  function misthound(ctx, st, enraged) {
    const t = (st.t || 0) + (st.phase || 0), mv = st.moving ? 1 : 0, sp = 2.6 + mv * 6.5;
    const b = bite(st), lunge = b >= 0 ? Math.sin(b * Math.PI) : 0, bob = Math.sin(t * (6 + mv * 4)) * (0.7 + mv * 0.5);
    const wy = x => Math.sin(t * sp - x * 0.22) * (0.8 + mv * 1.5);
    const outl = (grow, wobk) => {
      for (let i = 0; i < HC.length; i++) {
        const x = HC[i][0], y = HC[i][1], w = Math.sin(t * 1.9 + i * 2.1) * wobk + Math.sin(t * 3.3 + i) * wobk * 0.5;
        HB[i * 2] = x + (x < -15 ? -grow * 0.7 : x > 12 ? grow * 0.3 : 0); HB[i * 2 + 1] = wy(x) + y + (y < 0 ? -(grow + w) : y > 0 ? grow + w : 0);
      }
      return HC.length * 2;
    };
    // the shadow under it
    glow(ctx, -1, 3, 26, '#050a16', 0.4);
    // the tail of it: a trailing wisp of dark mist
    for (let i = 0; i < 6; i++) { const x = -14 - i * 4, y = wy(x) * (1 + i * 0.5) + Math.sin(t * 3 - i) * i * 0.6; glow(ctx, x, y, 7 - i * 0.8, i % 2 ? NIGHT.c : NIGHT.b, 0.75 - i * 0.1); }
    // the paws: four low puffs that come and go
    for (let i = 0; i < 4; i++) {
      const front = i < 2, s = i % 2 ? 1 : -1, ph = t * sp + (front ? 0 : Math.PI) + (i % 2) * Math.PI, x = (front ? 6 : -9) + Math.sin(ph) * (1.5 + mv * 4.5), y = wy(x) + s * (9.5 + Math.max(0, Math.cos(ph)) * mv * 1.5);
      glow(ctx, x, y, 4.6, NIGHT.b, 0.85);
    }
    // the body: a cloud of night-water mist, ragged, with the upper edge lit
    smoothN(ctx, HB, outl(4, 2.4), rgba(NIGHT.a, 0.3));
    for (let i = 0; i < 10; i++) {
      const x = -15 + i * 3.4 + Math.sin(t * 0.8 + i) * 1.4, y = wy(x) + (hash(i, 7) - 0.5) * 7 + Math.sin(t * 1.1 + i * 2) * 1.5, r = 6.2 + 4.2 * hash(i, 8) - Math.abs(i - 4.5) * 0.35;
      glow(ctx, x, y, r, i % 3 ? NIGHT.b : NIGHT.a, 0.85);
    }
    smoothN(ctx, HB, outl(0.5, 2.6), rgba(NIGHT.b, 0.6));
    for (let i = 0; i < 9; i++) { const s2 = i % 2 ? 1 : -1, x = -14 + i * 2.9, y = wy(x) + s2 * (7.6 * Math.sin((x + 17) / 31 * Math.PI) + 2 + 1.5 * hash(i, 4)); glow(ctx, x - 1, y, 3.4 + 1.8 * hash(i, 5), NIGHT.a, 0.7); }
    for (let i = 0; i < 5; i++) { const x = -9 + i * 5 + Math.sin(t + i * 2.3) * 1.2; glow(ctx, x, wy(x) - 2.4, 4.6, NIGHT.d, 0.45); }   // the moonlit back
    // a hint of spine through it
    for (let i = 0; i < 8; i++) { const x = -12 + i * 2.8, y = wy(x); circle(ctx, x, y, 0.85, rgba(K.bone, 0.2 + i * 0.07)); }
    // the head, nose down: a clear wedge with pointed ears, two pale eyes
    ctx.save(); ctx.translate(13 + lunge * 6 + Math.sin(t * 5) * 0.6, wy(12) + bob * 0.4); ctx.rotate(Math.sin(t * 4.3) * 0.08 + (b >= 0 ? -0.1 * lunge : 0));
    for (const s of [-1, 1]) {   // ears: pointed, swept back
      poly(ctx, [1, s * 3.2, -3, s * 5.2, -8.4, s * 8.4, -5.2, s * 3.6], NIGHT.b, NIGHT.out, 1);
      line(ctx, 0.4, s * 3.4, -8, s * 8, rgba(NIGHT.rim, 0.5), 0.8);
    }
    poly(ctx, [-4, -4.8, 3, -4.6, 10, -2, 12.6, -0.7, 12.6, 0.7, 10, 2, 3, 4.6, -4, 4.8, -5.6, 0], NIGHT.b, NIGHT.out, 1.2);
    poly(ctx, [2, -3.2, 9, -1.2, 9, 1.2, 2, 3.2], rgba(NIGHT.c, 0.8));
    line(ctx, -3, -4.4, 10, -1.7, rgba(NIGHT.rim, 0.55), 0.9);
    if (lunge > 0.25) {   // the bite: a gape with two pale teeth
      poly(ctx, [5, -2.6 * lunge, 12.4, -3.8 * lunge, 12.4, 3.8 * lunge, 5, 2.6 * lunge], '#050b16');
      for (const s of [-1, 1]) poly(ctx, [8, s * 2.8 * lunge, 10.4, s * 3.1 * lunge, 9, s * 0.6 * lunge], K.boneH);
    }
    circle(ctx, 12.6, 0, 1.2, '#04080f');
    const ey = enraged ? 1.3 : 0.9;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) glow(ctx, 3.4, s * 2.7, 4.8 * ey, K.moonG, 0.5 * ey);
    ctx.restore();
    for (const s of [-1, 1]) { circle(ctx, 3.4, s * 2.7, 1.5 * (0.9 + 0.2 * ey), '#04080f'); circle(ctx, 3.4, s * 2.7, 1.1 * (0.9 + 0.2 * ey), K.moon); }
    ctx.restore();
    // a thread of cold off the nose
    const q = (t * 0.7) % 1; glow(ctx, 22 + q * 8 + lunge * 6, wy(20) + 1 - q * 3, 3 + q * 4, NIGHT.c, 0.4 * (1 - q));
  }

  // ---------------------------------------------------------------------------------------------------------- the ridge of ice
  // The shape of a ridge is worked out once per prop (its id, its size): a wall of ice with a tall row of crystals down its middle, a lower row either
  // side, standing in a bank of thrown-up snow. Once it has risen it is drawn from a cached picture; while it rises or crumbles, crystal by crystal.
  const RC = new Map(), CRM = new Map(), RS = new Map();
  function ridgeData(pr) {
    const key = pr.w + ':' + pr.h;
    let d = RC.get(pr.id);
    if (d && d.key === key) return d;
    const L = Math.max(40, pr.w), H = pr.h || 36, r = rng(((pr.id | 0) + 5) * 97), list = [];
    for (let row = -1; row <= 1; row++) {
      const m = Math.max(3, Math.round(L / (row === 0 ? 17 : 21)));
      for (let i = 0; i < m; i++) {
        const u = clamp((i + 0.5 + (r() - 0.5) * 0.7) / m, 0.01, 0.99), ends = 0.45 + 0.55 * Math.pow(Math.sin(Math.PI * u), 0.5), big = r() < 0.3;
        list.push({ u, x: (u - 0.5) * L, y: row * H * (0.28 + 0.08 * r()) + (r() - 0.5) * 5, ht: (row === 0 ? 20 + r() * 26 + (big ? 14 : 0) : 8 + r() * 15) * ends, bw: row === 0 ? 20 + r() * 12 : 14 + r() * 9, lean: (r() - 0.5) * 20, skew: (r() - 0.5) * 0.5, tone: r(), row, chip: r() });
      }
    }
    // the low wall under the crystals: the heights along its length (an array of 0.. x steps)
    const wn = Math.max(6, Math.round(L / 10)), wall = new Float64Array(wn + 1);
    for (let i = 0; i <= wn; i++) wall[i] = (10 + 9 * r() + 5 * Math.sin(i * 1.9)) * (0.5 + 0.5 * Math.pow(Math.sin(Math.PI * (0.03 + 0.94 * i / wn)), 0.5));
    // the snow bank: a ragged stadium of control points
    const bank = [], mm = Math.max(5, Math.round(L / 20));
    for (let i = 0; i <= mm; i++) bank.push((i / mm - 0.5) * L, -H * (0.62 + 0.3 * r()));
    bank.push(L / 2 + 10, -H * 0.2, L / 2 + 12, H * 0.2);
    for (let i = mm; i >= 0; i--) bank.push((i / mm - 0.5) * L, H * (0.62 + 0.3 * r()));
    bank.push(-L / 2 - 12, H * 0.2, -L / 2 - 10, -H * 0.2);
    d = { key, L, H, list, wall, wn, bank: Float64Array.from(bank), order: new Array(list.length) };
    if (RC.size > 200) RC.clear();
    RC.set(pr.id, d);
    return d;
  }
  // one crystal of ice, base on (wx, wy), tip ht above it on the screen, leaning: a lit face to the left, a shaded one to the right, a dark foot, a flat cut near the top
  function blade(ctx, wx, wy, ht, bw, lean, skew, tone) {
    const lx = wx - bw / 2, rx = wx + bw / 2, ax = wx + lean, ay = wy - ht, mx = wx + lean * 0.22 + bw * 0.05, by = wy + bw * 0.14, k = 0.74, sx1 = lx + (ax - lx) * k, sy1 = wy + (ay - wy) * k, sx2 = rx + (ax - rx) * (k + skew * 0.2), sy2 = wy + (ay - wy) * (k + skew * 0.2);
    poly(ctx, [lx - 1.6, wy + 1.2, ax - 0.5, ay - 2.2, rx + 1.6, wy + 1.2, mx, by + 2.2], '#07142a');
    poly(ctx, [lx, wy, ax, ay, mx, by], tone < 0.5 ? '#d2eafc' : '#b4d6f4');
    poly(ctx, [mx, by, ax, ay, rx, wy], tone < 0.5 ? '#4378b0' : '#35669e');
    poly(ctx, [lx, wy, mx, by, rx, wy, rx - bw * 0.14, wy - ht * 0.2, mx, by - ht * 0.22, lx + bw * 0.14, wy - ht * 0.2], rgba('#12294a', 0.5));
    poly(ctx, [mx, by, ax, ay, mx + (rx - mx) * 0.5, wy + 0.6], rgba('#1f4170', 0.5));
    line(ctx, lx + 0.8, wy + 0.2, ax, ay + 0.8, rgba('#ffffff', 0.9), 1.2);
    line(ctx, sx1, sy1, sx2, sy2, rgba(K.iceDD, 0.55), 1);   // where a piece has been sheared off
    if (ht > 16) { const cy = wy - ht * 0.45; line(ctx, lx + bw * 0.3, cy, wx + bw * 0.12, cy - 2.6, rgba('#ffffff', 0.4), 0.9); }   // a flaw in the ice
  }
  // the wall under the crystals: a curtain of ice from the ridge's centre line up to its jagged top
  function wallFace(ctx, d, ox, oy, ca, sa, grow) {
    const n = d.wn;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const x = (i / n - 0.5) * d.L; ctx.lineTo(ox + x * ca, oy + x * sa + 3); }
    for (let i = n; i >= 0; i--) { const x = (i / n - 0.5) * d.L, h = d.wall[i] * grow; ctx.lineTo(ox + x * ca, oy + x * sa + 3 - h); }
    ctx.closePath(); ctx.fillStyle = '#4a7db2'; ctx.fill(); ctx.strokeStyle = '#07142a'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const x = (i / n - 0.5) * d.L, h = d.wall[i] * grow; ctx[i ? 'lineTo' : 'moveTo'](ox + x * ca, oy + x * sa + 3 - h); }
    ctx.strokeStyle = rgba('#e8f6ff', 0.85); ctx.lineWidth = 1.6; ctx.stroke();
    for (let i = 1; i < n; i += 2) { const x = (i / n - 0.5) * d.L, h = d.wall[i] * grow; line(ctx, ox + x * ca, oy + x * sa + 3 - h, ox + x * ca + 1.5, oy + x * sa + 3, rgba(K.iceDD, 0.35), 1); }
  }
  // the ridge as it stands at its full height, drawn about the point (ox, oy)
  function ridgeStand(ctx, d, ox, oy, a) {
    const ca = Math.cos(a), sa = Math.sin(a), list = d.list, order = d.order, m = list.length;
    ctx.save(); ctx.translate(ox + 7, oy + 9); ctx.rotate(a); ctx.scale(1.06, 1.1); smoothN(ctx, d.bank, d.bank.length, 'rgba(8,20,44,0.5)'); ctx.restore();
    ctx.save(); ctx.translate(ox, oy); ctx.rotate(a); smoothN(ctx, d.bank, d.bank.length, rgba('#c3dbf3', 0.92), rgba('#5c88bb', 0.8), 2); ctx.scale(0.8, 0.7); smoothN(ctx, d.bank, d.bank.length, rgba('#e6f2fc', 0.8)); ctx.restore();
    for (let i = 0; i < d.bank.length; i += 6) { const bx = d.bank[i], by = d.bank[i + 1]; glow(ctx, ox + bx * ca - by * sa, oy + bx * sa + by * ca, 9, '#e6f2fc', 0.6); }
    wallFace(ctx, d, ox, oy, ca, sa, 1);
    for (let i = 0; i < m; i++) order[i] = i;
    const wyOf = i => list[i].x * sa + list[i].y * ca;
    for (let i = 1; i < m; i++) { const v = order[i], wv = wyOf(v); let j = i - 1; while (j >= 0 && wyOf(order[j]) > wv) { order[j + 1] = order[j]; j--; } order[j + 1] = v; }
    for (let k = 0; k < m; k++) { const s = list[order[k]], wx = ox + s.x * ca - s.y * sa, wy = oy + s.x * sa + s.y * ca; blade(ctx, wx, wy - (s.row === 0 ? 6 : 0), s.ht, s.bw * (0.6 + 0.4 * Math.abs(ca)), s.lean, s.skew, s.tone); }
  }
  function ridge(ctx, pr, t) {
    const d = ridgeData(pr), a = pr.a || 0, age = t - (pr.born ?? t - 9);
    let crumble = 0;
    if (pr.state === 1) {
      let c0 = CRM.get(pr.id); if (c0 == null || c0 > t) { c0 = t; if (CRM.size > 64) CRM.clear(); CRM.set(pr.id, c0); }
      crumble = clamp((t - c0) / 1.2, 0, 1);
    } else if (CRM.has(pr.id)) CRM.delete(pr.id);
    const ca = Math.cos(a), sa = Math.sin(a), list = d.list, m = list.length;
    if (age > 1.1 && crumble === 0 && typeof document !== 'undefined') {   // standing: one picture
      const key = pr.w + ':' + pr.h + ':' + a.toFixed(3) + ':' + pr.id;
      let c = RS.get(key);
      if (!c) {
        const rx = Math.abs(ca) * d.L / 2 + Math.abs(sa) * d.H / 2 + 30, ry = Math.abs(sa) * d.L / 2 + Math.abs(ca) * d.H / 2 + 30, up = 70, sc = Math.min(1.5, 2400 / Math.max(rx * 2, ry * 2 + up));
        const cv = document.createElement('canvas'); cv.width = Math.ceil(rx * 2 * sc); cv.height = Math.ceil((ry * 2 + up) * sc);
        const cx = cv.getContext('2d'); cx.scale(sc, sc); ridgeStand(cx, d, rx, ry + up, a);
        if (RS.size > 24) RS.clear();
        c = { cv, rx, ry: ry + up, w: rx * 2, h: ry * 2 + up }; RS.set(key, c);
      }
      ctx.drawImage(c.cv, pr.x - c.rx, pr.y - c.ry, c.w, c.h);
      // a cold sparkle at some of the tips
      for (let k = 0; k < m; k += 3) {
        const s = list[k]; if (s.row !== 0 || s.ht < 24) continue;
        const sp = Math.sin(t * 2.2 + s.u * 11); if (sp < 0.86) continue;
        const kk = (sp - 0.86) / 0.14, ax = pr.x + s.x * ca - s.y * sa + s.lean, ay = pr.y + s.x * sa + s.y * ca - s.ht - 6;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; line(ctx, ax - 3.4 * kk, ay, ax + 3.4 * kk, ay, rgba('#ffffff', 0.9 * kk), 1); line(ctx, ax, ay - 3.4 * kk, ax, ay + 3.4 * kk, rgba('#ffffff', 0.9 * kk), 1); ctx.restore();
      }
      return;
    }
    // rising or crumbling: crystal by crystal. The bank and the wall first, then each crystal at its own height.
    const grown = easeOut(clamp(age / 0.35, 0, 1)), fa = 1 - crumble * 0.55, order = d.order, wallK = easeOut(clamp(age / 0.45, 0, 1)) * (1 - crumble);
    ctx.save(); ctx.translate(pr.x + 7, pr.y + 9); ctx.rotate(a); ctx.scale(1.06, 1.1 * grown); smoothN(ctx, d.bank, d.bank.length, 'rgba(8,20,44,' + (0.5 * fa).toFixed(3) + ')'); ctx.restore();
    ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.scale(1, grown); smoothN(ctx, d.bank, d.bank.length, rgba('#c3dbf3', 0.92 * fa), rgba('#5c88bb', 0.8 * fa), 2); ctx.scale(0.8, 0.7); smoothN(ctx, d.bank, d.bank.length, rgba('#e6f2fc', 0.8 * fa)); ctx.restore();
    if (wallK > 0.02) wallFace(ctx, d, pr.x, pr.y, ca, sa, wallK);
    for (let i = 0; i < m; i++) order[i] = i;
    const wyOf = i => list[i].x * sa + list[i].y * ca;
    for (let i = 1; i < m; i++) { const v = order[i], wv = wyOf(v); let j = i - 1; while (j >= 0 && wyOf(order[j]) > wv) { order[j + 1] = order[j]; j--; } order[j + 1] = v; }
    for (let k = 0; k < m; k++) {
      const s = list[order[k]], wx = pr.x + s.x * ca - s.y * sa, wy = pr.y + s.x * sa + s.y * ca;
      const rise = easeOut(clamp((age - s.u * 0.3 - 0.02) / 0.42, 0, 1)), ck = clamp(crumble * 1.5 - s.u * 0.5, 0, 1), ht = s.ht * rise * Math.pow(1 - ck, 1.4);
      if (ht < 0.8) continue;
      blade(ctx, wx, wy - (s.row === 0 ? 6 * rise : 0), ht, s.bw * (0.6 + 0.4 * Math.abs(ca)) * (0.7 + 0.3 * rise), s.lean * rise, s.skew, s.tone);
      if (s.row === 0 && ck > 0.02) {   // a piece coming away
        for (let q = 0; q < 2; q++) {
          const dx = (q ? 1 : -1) * (6 + 12 * s.chip) * ck, cy = wy - ht * 0.5 - s.ht * 0.2 + ck * ck * (s.ht * 0.9 + 12), cxp = wx + s.lean + dx;
          ctx.save(); ctx.globalAlpha *= 1 - ck; poly(ctx, [cxp - 2.8, cy + 0.6, cxp, cy - 3.6, cxp + 2.8, cy + 0.8, cxp - 0.6, cy + 3.4], K.iceL, K.iceO, 0.9); ctx.restore();
        }
      }
    }
    // the snow thrown up as it comes out of the ground, and the dust of it going down
    const spray = age < 0.9 ? 1 - age / 0.9 : 0, dust = crumble > 0 ? Math.sin(Math.min(1, crumble * 1.1) * Math.PI) : 0;
    if (spray > 0 || dust > 0) for (let i = 0; i < 14; i++) {
      const s = list[(i * 3) % m], q = spray > 0 ? 1 - spray : crumble, wx = pr.x + s.x * ca - s.y * sa, wy = pr.y + s.x * sa + s.y * ca, dir = hash(i, 4) < 0.5 ? -1 : 1;
      glow(ctx, wx + dir * (6 + 14 * q * hash(i, 5)), wy - 8 - q * 22 * (spray > 0 ? 1 : 0.4), 5 + 8 * q, K.snow, spray > 0 ? 0.5 * spray : 0.4 * dust);
    }
  }

  return { body, shade: shadeAdd, misthound, ridge, POSES, KEYS, K };
})();

if (typeof BOSS_ART !== 'undefined') BOSS_ART.garrow = GA_ART.body;
if (typeof ADD_ART !== 'undefined') { ADD_ART.misthound = GA_ART.misthound; ADD_ART.gwshade = GA_ART.shade; }
if (typeof ArenaView !== 'undefined') ArenaView.ridgeProp = (ctx, pr, t) => GA_ART.ridge(ctx, pr, t);
