// Maelis Orne, the Pale Regent (set 6, Season 2, Boss XVI, the finale): everything she looks like, drawn in code. The Moon's regent: very
// tall and still, silver-white hair that lies on the ground, a long robe lit on one side (the screen's right, the side the world hangs on)
// and black on the other, a face with its eyes shut, and a crescent blade as long as she is. Behind her head floats her crown: a thin ring
// and, inside it, a small moon whose phase is the fight's tell. In her second form, the Wild Hunt, she rides Garrow (garrow-art.js,
// reused through GA_ART.body), in a wolf-skull helm with his broken chain in her off hand, the crown still behind her head. Palette for the
// set: silver, black, frost blue; nothing warm at all; in the last act the crown and her eyes redden, a deep dark red, never bright.
// Loaded after arena-view.js and garrow-art.js; it adds BOSS_ART.maelis itself (and nothing else). The room (maelis-room.js) and every
// telegraph and impact are not drawn here.
//
// Drawn like Caelum and Vesper: upright on the screen's axes (drawBoss turns the canvas by `angle`, the body turns it back), about 200 px
// tall at scale 1 with the crown over her (drawn at the game's RAID_BOSS_SCALE 1.3; hitbox stays inside her). Facing is read from the face
// (both eyes to the camera, one in profile, a curtain of hair from behind), the shoulders, the way the hair and hem trail, the blade.
//
// THE CROWN. Read from the live room event `mlcrown` (arena-view.js stores room events in ArenaView.liveRoom.ev[k]; the latest one is the
// state, its dur is ignored), or from st.mlCrown (a harness): { phase: 'new'|'crescent'|'half'|'gibbous'|'full', turn (radians, the way the
// lit side faces, in room space: the crown is a small picture of the floor), wax: 1|-1, umbral: 0|1, red: 0..1 }. Every field eases (about
// 0.2 s), none snaps. The lit part is the engine's: crescent = the disc outside a circle of the same radius set back toward the dark side
// (a fat crescent), half = a half-disc, gibbous = all but a crescent on the far side, full = the disc; new = a dark disc with a thin ring.
// The bright horn is the one at turn + wax * 90 degrees (a flare on it, the other horn dimmer): waxing or waning. umbral: the lit part
// is gone from the striking side: a red limb on the dark half of the ring and a red wash in the dark. red: an eclipse closes over the
// crown from its left edge, soft-edged, and at 1 the whole disc is a deep dark red.
// ML_ART.crown(ctx, state, t, R) draws just the crown (origin at its middle) for the previews.
//
// THE FORM. Room event `mlform` { n: 1 | 2 } (or st.props.mlForm = 2 / st.mlForm = 2 for a harness) says which body is drawn. Form 2 is
// the Wild Hunt: Garrow's body (GA_ART.body, given a state of its own, st.mlWolf) with her seated on his shoulders, her robe and hair
// falling over his flanks, the chain from his collar to her off hand. The wolf's pose follows hers (full / eclipse: a howl; enrage: his
// own enrage; ride / dash: a run; the mounted buster: a snap timed to the blow; death: he drifts into snow); st.props.mlWolf =
// 'howl' | 'run' | 'snap' | 'scent' | 'pounce' | 'pack' | 'circle' | 'drift' | 'enrage' | 'rime' forces one of Garrow's poses.
//
// POSES (st.props, held while the move runs: boss-vfx.js CAST_POSE for casts, main.js 'banim' for the rest). Key = 'ml' + Name; the newest
// one that is on wins; both forms take all of them, the saddle changes how they look:
//   mlRest      standing: the blade point-down before her, both hands on the pommel (the default: no prop needed); mounted: the blade carried
//               up and forward across the saddle, the chain in her off hand
//   mlCut       a single cut: the blade drawn slowly back, then swept once over to the front (the cast bar fills in the wind-up; the swing
//               is st.action { type: 'attack', t0, dur } as main.js sets it, t0 = cast end - 0.45, so the blow lands as the bar empties)
//   mlDance     the dance: four cuts in a row on the same machinery, each a fresh st.action { type: 'attack' }; they alternate (over the top
//               and forward, then back up the same way), her stance between them is where the last one ended; the faster the script
//               makes the actions' dur, the faster she cuts
//   mlFull      Full Moon, the raidwide: both arms thrown up and out, the blade raised, she lifts off the ground, the hair and hem flare
//               (the crown is the script's: phase 'full'); mounted, Garrow howls
//   mlBuster    Earthshine: the blade raised high behind her in both hands, chopped down at what she faces (the same action machinery);
//               a pale second blade, a beat later (the afterimage of the cut, p 0.8 .. 1.3), follows it; mounted, Garrow snaps with it
//   mlDash      a dash-cut of the dark sword dance: low and gliding along her facing, hem and hair streaming back, the blade trailing; the cut
//               is the strike of the cast / action
//   mlCall      calling the hound: the off hand raised open, the head turned to look down the road (st.props.mlLook = the angle in radians
//               in room space to look at; none: a turn of about 65 degrees), the blade low in the other hand
//   mlMount     mounting: she hops from the ground beside the wolf (a step out on the screen) onto his shoulders, over about 1.4 s; the robe
//               shortens as she settles; form 2 only (in form 1 it looks like mlCall)
//   mlRide      riding a pass: low in the saddle, the blade held back, the wolf running; the cut at the pass's midpoint is st.action
//   mlEclipse   the eclipse beginning: the blade lifted to the sky, the head thrown back, her free hand to the crown; mounted, Garrow howls
//   mlBow       the wall (New Moon): the head bowed over the planted blade, the light gone out of it, still
//   mlEnrage    Totality: both hands on the blade overhead, trembling, the hair streaming up, the eyes lit; mounted, Garrow's enrage
//   mlIntro     form 1: the crown first, alone, then she lowers out of the light from the head down and lands, the blade planted;
//               form 2: Garrow gathers out of mist and she thickens out of the light on his back
//   mlDeath     form 1: the blade laid down, she sinks to her knees and bows, the hair pooling, the crown wanes to new and goes out and
//               she fades to light (about 4.5 s); form 2: the same on his back while he comes apart into snow
// With no pose prop: st.action { type: 'attack' } is a short plain chop (her auto-attack), st.moving a slow glide.
// A pose may also be named through st.props.ml = 'cut' or st.action.type = 'cut' (a harness can drive her so).
// The blade has a pale path behind it as it sweeps. ML_ART.POSES / ML_ART.KEYS list the names.

const ML_ART = (() => {
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const nrm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const wrapA = a => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
  // the blade's angle part-way from where it rests to where a wind-up ends, by the short way round (back and up behind her, never across the front), on the branch of aT
  const windA = (rest, aT, w) => { const v = rest + wrapA(aT - rest) * w; return aT + wrapA(v - aT); };
  const sstep = (a, b, x) => { const q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
  const EDGE = '#05070d';
  const K = {
    hi: '#fbfdff', sil: '#e6edf8', sil2: '#bdc9dd', sil3: '#8996b0', sil4: '#56637f',
    ink: '#05070d', blk: '#0a0d17', blk2: '#141b2e', blk3: '#222d49',
    frost: '#a8d4ff', frostH: '#e6f4ff',
    skin: '#eff3fb', skinS: '#bac5db', skinD: '#7f8cab', lip: '#8996b4',
    blood: '#6e0f1b', bloodM: '#a8222b', bloodH: '#d4424a',
  };
  const SHADE = new Map();   // (a gradient that never moves is made once)
  const GY = 46;            // the ground, in the figure's own frame (the hip is near -36)
  const HY = -140;          // the head's middle
  const CROWN_Y = -178, CROWN_R = 38;

  // ---------------------------------------------------------------------------------------------------------- poses
  const POSES = ['rest', 'cut', 'dance', 'full', 'buster', 'dash', 'call', 'mount', 'ride', 'eclipse', 'enrage', 'intro', 'death', 'bow'];
  const KEYS = POSES.map(n => 'ml' + n[0].toUpperCase() + n.slice(1));
  const IDX = {}; POSES.forEach((n, i) => { IDX[n] = i; });
  const PK = ['hx', 'hy', 'ba', 'L', 'cv', 'lean', 'drop', 'bow', 'lit', 'two', 'ox', 'oy', 'oh', 'lift', 'fl', 'eyes', 'spr', 'sk'];
  // hx hy: the blade hand; ba: the blade's angle on the screen; L: how long it is drawn (foreshortening); cv: which way it bows (-1 .. 1);
  // lean: how far the head leans from the feet; drop: sunk to the knees 0 .. 1.3; bow: the head bowed (negative: thrown back); lit: how bright
  // the blade and the eyes are; two: the other hand is on the haft (0 .. 1); ox oy: where it is otherwise; oh: that hand open and raised
  // (0 .. 1); lift: the shoulders lifted; fl: how far off the ground; eyes: 0 shut .. 1 open; spr: the hair and hem blown out; sk: shaking
  const BASE = { hx: 0, hy: -78, ba: Math.PI / 2, L: 0.66, cv: 1, lean: 0, drop: 0, bow: 0, lit: 0.5, two: 1, ox: 0, oy: -56, oh: 0, lift: 0, fl: 0, eyes: 0, spr: 0, sk: 0 };
  const HF = 20;   // (how far forward her hands are held at rest, turned to a side: in front of her body, where the blade is seen to be carried)
  const PHM = { new: 1, crescent: 0.45, half: 0, gibbous: -0.45, full: -1 };

  function newState() {
    return { p: Object.assign({}, BASE), on: new Array(POSES.length).fill(-1), pose: -1, t0: 0, last: NaN, dt: 0, ph: 0, mv: 0, vis: 1, reveal: 1, tr: [], fx: 0, fy: 1, sg: 1, name: '', form: 1, mk: 0,
      hfx: 0, hfy: 1, cutN: 0, cutT0: NaN, cutDur: 1, crown: null, wolf: { t: 0, props: {}, action: null, moving: false }, ca: 1, rein: null, wp: 1 };
  }
  // where a swing is, in the beats of a blow (draw-util.js strikeBeats' timings, measured from the landing). A cast gives the body its action at the cast's START (main.js
  // 'bcast': t0 = the cast's end - 0.45, dur 1.2: it lands at t0 + 0.45), so the gather runs across the whole cast; the swings maelis-view.js sets (the dance, a pass, a dash) land
  // at the middle of their action. w 0 .. 1: how far she has loaded (barely moving at first, the blade drawing back more and more, full coil 0.33 s before the blow, then a held beat),
  // wl the weight sinking with it, strike 0 .. 1 the committed cut (0.11 s, ending on the landing frame), S that with the overshoot, rest 0 .. 1 back to standing, land the dip of the
  // landing, p the action's own progress (the Earthshine echo reads it), fast: the cut itself is going through.
  function atk(g, st, t, pose) {
    const a = st.action, z0 = { strike: 0, S: 0, rest: 0, w: 1, wl: 1, p: -1, u: -9, has: false, ovr: 0, land: 0, fast: false };
    if (!a || a.type !== 'attack') { g.actK = null; return z0; }
    if (g.actK !== a.t0) { g.actK = a.t0; g.actSeen = t; }
    const aT = actT(st), p = (aT - a.t0) / a.dur, L = a.t0 + (a.dur === 1.2 ? 0.45 : 0.5 * a.dur), q = aT - L;
    const cs = pose > 0 && g.t0 >= g.actSeen - 0.05 && g.t0 < a.t0 ? g.t0 : g.actSeen;   // (when the gather began: the cast's start)
    const x = clamp((aT - cs) / Math.max(0.25, L - 0.33 - cs), 0, 1), w = 0.3 * x + 0.7 * x * x;
    let strike = 0, rest = 0;
    if (q > 0.67) { strike = 1; rest = 1; } else if (q >= -0.11) { strike = q >= 0 ? 1 : Math.pow((q + 0.11) / 0.11, 2); rest = sstep(0.15, 0.67, q); }
    const ovr = q <= 0 ? 0 : q < 0.08 ? easeOut(q / 0.08) : Math.exp(-(q - 0.08) / 0.16);
    return { strike, S: strike >= 1 ? 1 + 0.08 * ovr : strike, rest, w, wl: w, p, u: q, has: true, ovr, land: q < 0 ? 0 : Math.exp(-q / 0.13), fast: q > -0.3 && q < 0.05 };
  }
  function roomEv(k) {
    const room = typeof ArenaView !== 'undefined' ? ArenaView.liveRoom : null;
    return room && room.ev ? room.ev[k] : null;
  }
  function pickPose(g, st, t) {
    const pr = st.props, a = st.action;
    let best = -1, bt = -1e18;
    if (pr) for (let i = 1; i < KEYS.length; i++) {
      if (pr[KEYS[i]]) { if (g.on[i] < 0 || g.on[i] > t) g.on[i] = t; if (g.on[i] > bt) { bt = g.on[i]; best = i; } } else g.on[i] = -1;
    }
    if (best < 0 && pr && pr.mlRest) { /* the default pose, named */ }
    if (best < 0 && pr && typeof pr.ml === 'string' && IDX[pr.ml] > 0) { best = IDX[pr.ml]; bt = g.pose === best ? g.t0 : t; }
    if (best < 0 && a && typeof a.type === 'string' && IDX[a.type] > 0 && t - a.t0 < (a.dur || 3) + 0.4) { best = IDX[a.type]; bt = a.t0; }
    if (best !== g.pose) { g.pose = best; g.t0 = bt; }
    return best;
  }
  // the blade's two ends of a cut: from up and back, over the top, to forward and low (for a left-facing figure, the mirror)
  function cutAngles(fx, fy, sg) {
    const W = nrm(-fx * 0.7, -1), F = nrm(fx * 0.95, 0.3 + 0.6 * fy);
    let a0 = Math.atan2(W[1], W[0]), a1 = Math.atan2(F[1], F[0]);
    if (sg > 0) { while (a1 < a0) a1 += TAU; while (a1 - a0 > TAU) a1 -= TAU; if (a1 - a0 < 1.1) a1 = a0 + 1.1; }
    else { while (a1 > a0) a1 -= TAU; while (a0 - a1 > TAU) a1 += TAU; if (a0 - a1 < 1.1) a1 = a0 - 1.1; }
    return [a0, a1];
  }
  // blend a wind-up and a strike target by the swing, then back toward rest as she recovers
  function swingT(T, W, X, A) {
    for (const k of PK) {
      if (W[k] == null && X[k] == null) continue;
      const a = W[k] != null ? lerp(T[k], W[k], k === 'drop' || k === 'lean' ? A.wl : A.w) : T[k], b = X[k] != null ? X[k] : T[k];
      T[k] = lerp(lerp(a, b, A.S), T[k], A.rest);
    }
  }
  // the targets for this frame
  function aim(g, st, pose, A, tp, t, fx, fy, mk) {
    const T = Object.assign({}, BASE), p = g.p, name = pose >= 0 ? POSES[pose] : '';
    const sg = g.sg, mounted = mk > 0.5;
    let rate = 8;
    const S = A.S, R = A.rest;
    const [a0, a1] = cutAngles(fx, fy, sg);
    const cvs = sg > 0 ? -1 : 1;     // the convex edge leads the sweep
    // the stance she stands in between moves
    T.hx = fx * HF; T.hy = -78; T.ba = Math.PI / 2 + fx * 0.06; T.L = 0.66; T.cv = -sg; T.two = 1; T.lit = 0.5;
    if (mounted) { const bf = Math.atan2(-0.5, sg * 0.85); Object.assign(T, { hx: sg * 18, hy: -64, ba: bf, L: 0.92, cv: -sg, two: 0, ox: -sg * 20, oy: -54, lit: 0.55, lean: fx * 2 }); }
    const cutPose = (wind, strike) => swingT(T, wind, strike, A);
    if (name === 'cut') {
      const ba = lerp(a0, a1, S), baRest = T.ba;
      cutPose({ hx: -fx * 14, hy: -116, ba: a0, L: 1, cv: cvs, lean: -fx * 8, drop: 0.06, lit: 0.9, lift: 0.9, two: 1, eyes: 0.4 },
        { hx: fx * 18, hy: -60, ba: a1, L: 1.04, cv: cvs, lean: fx * 12, lit: 1.2, lift: 0.2, drop: mounted ? 0 : 0.12, two: 1, eyes: 0.9 });
      if (A.has) { const aw = windA(baRest, a0 - sg * 0.25, A.w); T.ba = lerp(lerp(aw, a1, S), baRest, A.rest); void ba; }   // (the blade comes back a little further than its start as she gathers, then goes through)
    } else if (name === 'dance') {
      const rev = g.cutN & 1, q = rev ? 1 - S : S;
      const ba = lerp(a0, a1, q);
      // her stance between cuts is where the last one ended; each cut runs from there to the other end
      const end = rev ? a0 : a1, start = rev ? a1 : a0;
      const hs = rev ? { hx: fx * 18, hy: -60 } : { hx: -fx * 10, hy: -108 }, he = rev ? { hx: -fx * 10, hy: -108 } : { hx: fx * 18, hy: -60 };
      Object.assign(T, { hx: lerp(hs.hx, he.hx, S), hy: lerp(hs.hy, he.hy, S), ba: ba, L: 1.02, cv: rev ? -cvs : cvs, lean: lerp(rev ? fx * 10 : -fx * 4, rev ? -fx * 4 : fx * 10, S), lit: 1.1, lift: 0.4, two: 1, eyes: 0.85, drop: mounted ? 0 : 0.08 });
      if (!A.has) { T.ba = start; T.hx = hs.hx; T.hy = hs.hy; }
      else if (A.rest > 0) { T.ba = end; T.hx = he.hx; T.hy = he.hy; }
      rate = 9;
    } else if (name === 'full') {
      const u = easeOut(clamp(tp / 0.9, 0, 1));
      Object.assign(T, { hx: sg * 46, hy: lerp(-80, -142, u), ba: lerp(T.ba, -Math.PI / 2 + sg * 0.62, u), L: lerp(0.66, 0.85, u), cv: -sg, two: 0, ox: -sg * 46, oy: lerp(-56, -146, u), oh: u, lift: u, fl: 12 * u, lit: 1.3, eyes: u, spr: u, bow: -0.25 * u });
      rate = 5;
    } else if (name === 'buster') {
      const ba = lerp(a0, a1, S), up = -Math.PI / 2 - sg * 0.55, baRest = T.ba;
      swingT(T, { hx: -sg * 36, hy: -138, ba: up, L: 1, cv: cvs, lean: -fx * 9, drop: 0.08, lit: 1.0, lift: 1, two: 1, eyes: 0.6, spr: 0.3 },
        { hx: fx * 16, hy: -58, ba: a1, L: 1.06, cv: cvs, lean: fx * 14, lit: 1.35, lift: 0.2, drop: mounted ? 0 : 0.18, two: 1, eyes: 1 }, A);
      if (A.has) { const aw = windA(baRest, up - sg * 0.2, A.w); T.ba = lerp(lerp(aw, a1, S), baRest, A.rest); void ba; }
    } else if (name === 'dash') {
      const stance = { hx: -fx * 6, hy: -66, ba: Math.atan2(0.25, -fx * 1 || -0.01), L: 0.95, cv: -sg, lean: fx * (16 + (st.moving ? 8 : 0)), drop: 0.1, lit: 1.0, lift: 0.4, two: 0, ox: fx * 24, oy: -60, fl: 6, spr: 0.8, eyes: 0.7 };
      if (A.has) swingT(T, stance, { hx: fx * 20, hy: -62, ba: Math.atan2(fy * 0.5 + 0.18, fx || 0.01), L: 1.05, cv: cvs, lean: fx * 18, drop: 0.12, lit: 1.35, lift: 0.3, two: 1, fl: 6, spr: 0.9, eyes: 1 }, A);
      else Object.assign(T, stance);
    } else if (name === 'call') {
      const u = easeOut(clamp(tp / 0.8, 0, 1));
      Object.assign(T, { hx: fx * 12, hy: -64, ba: lerp(Math.PI / 2, Math.PI / 2 - sg * 0.18, u), L: 0.7, cv: -sg, two: 0, ox: sg * 38, oy: lerp(-56, -146, u), oh: u, lift: 0.5 * u, lit: 0.7, eyes: 0.5 * u, bow: -0.15 * u });
    } else if (name === 'mount' && g.form === 1) {
      const u = easeOut(clamp(tp / 0.8, 0, 1));
      Object.assign(T, { hx: fx * 12, hy: -64, ba: lerp(Math.PI / 2, Math.PI / 2 - sg * 0.18, u), L: 0.7, cv: -sg, two: 0, ox: sg * 38, oy: lerp(-56, -146, u), oh: u, lift: 0.5 * u, lit: 0.7, eyes: 0.5 * u, bow: -0.15 * u });
    } else if (name === 'mount') {
      const u = clamp(tp / 1.4, 0, 1);
      Object.assign(T, { hx: sg * 18, hy: lerp(-72, -64, u), ba: Math.atan2(-0.5, sg * 0.85), L: lerp(0.7, 0.92, u), cv: -sg, two: 0, ox: -sg * 20, oy: -54, lift: 0.4 * (1 - u), lit: 0.7 });
    } else if (name === 'ride') {
      const stance = { hx: -fx * 14, hy: -58, ba: Math.atan2(0.45, -fx - 0.01), L: 0.95, cv: -sg, lean: fx * 14, drop: 0, lit: 1.0, lift: 0.3, two: 0, ox: fx * 6, oy: -50, spr: 0.7, eyes: 0.8 };
      if (A.has) swingT(T, stance, { hx: fx * 24, hy: -62, ba: Math.atan2(fy * 0.4 + 0.22, fx || 0.01), L: 1.05, cv: cvs, lean: fx * 18, lit: 1.35, lift: 0.3, two: 1, spr: 0.9, eyes: 1 }, A);
      else Object.assign(T, stance);
    } else if (name === 'eclipse') {
      const u = easeOut(clamp(tp / 1.2, 0, 1));
      Object.assign(T, { hx: sg * 40, hy: lerp(-80, -134, u), ba: lerp(T.ba, -Math.PI / 2 + sg * 0.3, u), L: lerp(0.66, 0.9, u), cv: -sg, two: 0, ox: -sg * 22, oy: lerp(-56, -156, u), oh: u, lift: 0.8 * u, fl: 5 * u, lit: 1.1, eyes: u, bow: -0.9 * u, spr: 0.4 * u });
      rate = 4;
    } else if (name === 'bow') {
      const u = easeOut(clamp(tp / 1.2, 0, 1));
      Object.assign(T, { hx: fx * HF, hy: lerp(-78, -70, u), L: 0.66, bow: 0.95 * u, lit: lerp(0.5, 0.12, u), eyes: 0, lift: -0.2 * u });
      rate = 4;
    } else if (name === 'enrage') {
      Object.assign(T, { hx: sg * 26 + Math.sin(t * 43) * 0.6, hy: -146 + Math.sin(t * 37) * 0.7, ba: -Math.PI / 2 + sg * 0.5, L: 0.95, cv: -sg, two: 1, lit: 1.7, lift: 1, fl: 14, eyes: 1, spr: 1.5, sk: 1, bow: -0.5, lean: Math.sin(t * 29) * 0.9 });
    } else if (name === 'intro') {
      const land = sstep(0.9, 2.7, tp);
      Object.assign(T, { hx: fx * HF, hy: -78, L: 0.66, fl: 40 * (1 - land) * (1 - land), lit: lerp(0.15, 0.5, land), bow: lerp(0.7, 0, sstep(2.6, 3.8, tp)), spr: 0.6 * (1 - land), eyes: 0 });
    } else if (name === 'death') {
      const sink = easeOut(clamp(tp / 1.6, 0, 1)), lay = easeOut(clamp((tp - 0.5) / 1.4, 0, 1));
      Object.assign(T, { drop: mounted ? 0.35 * sink : 1.08 * sink, bow: 1.3 * sink, lean: fx * 3 * sink, lit: 0.4 * (1 - lay), hx: lerp(fx * HF, sg * 40, lay), hy: lerp(-78, mounted ? -10 : 8, lay), ba: lerp(Math.PI / 2, Math.PI / 2 - sg * 1.25, lay), L: lerp(0.66, 0.95, lay), two: 1 - lay, ox: sg * 24, oy: lerp(-56, -20, lay), eyes: 0 });
      rate = 7;
    } else if (pose < 0 && A.has && A.p >= 0 && A.rest < 1) {   // the plain chop
      swingT(T, { hx: -fx * 4, hy: -96, ba: a0, L: 0.9, cv: cvs, lean: -fx * 2, lift: 0.4, two: 1 }, { hx: fx * 12, hy: -66, ba: a1, L: 0.95, cv: cvs, lean: fx * 7, lit: 0.9, drop: 0.06, two: 1, eyes: 0.5 }, A);
    }
    if (pose < 0 || name === 'rest') {
      if (st.moving) { T.lean = fx * 3; T.spr = 0.3; }
    }
    // anticipation and follow-through of a blow (the blow itself, where the blade goes and the moment it lands are untouched): in the last quarter second before it a breath is
    // drawn (the weight goes back, the blade hand rises, the hair catches up with a flare), the blow goes through at once, then the hair and the hem arrive late and she is still
    // (the whole gather rides on A.w now: the breath, the weight going back and down and the hair catching up grow with it across the cast; the dip comes on the landing frame)
    if (A.has && (name === 'cut' || name === 'dance' || name === 'buster' || pose < 0)) {
      const kk = mounted ? 0.5 : 1, ww = A.w * (1 - A.strike), ft = A.strike >= 1 ? 1 - A.rest : 0;
      T.lean -= fx * 7 * ww * kk; T.lift += 0.45 * ww; T.hx -= fx * 7 * ww * kk; T.hy -= 7 * ww; T.drop += (0.1 * A.land - 0.05 * ww) * kk + 0.05 * ww * kk;
      T.spr = Math.max(T.spr, 0.22 * ww + 1.15 * ft + 0.4 * A.ovr);
    }
    if (A.has && A.fast) rate = Math.max(rate, 60);
    else if (A.has && A.strike >= 1 && A.rest < 0.5 && pose > 0) rate = 16;
    const a = 1 - Math.exp(-rate * g.dt);
    const ak = 1 - Math.exp(-(T.spr > p.spr ? 4.5 : 3.2) * g.dt);   // (the hair and the hem arrive late, and settle slowly)
    for (let i = 0; i < PK.length; i++) { const k = PK[i]; if (k === 'ba') p.ba += wrapA(T.ba - p.ba) * a; else p[k] += (T[k] - p[k]) * (k === 'spr' ? ak : a); }
    // the head: it looks where she faces, or where she is told to
    let hf = [fx, fy];
    if (name === 'call') { const lk = st.props && typeof st.props.mlLook === 'number' ? st.props.mlLook : Math.atan2(fy, fx) + 1.15 * sg; hf = [Math.cos(lk), Math.sin(lk)]; }
    const ha = 1 - Math.exp(-5 * g.dt);
    g.hfx += (hf[0] - g.hfx) * ha; g.hfy += (hf[1] - g.hfy) * ha;
  }

  // ---------------------------------------------------------------------------------------------------------- the crown's state
  function crownTarget(st) {
    const e = st.mlCrown || roomEv('mlcrown');
    const T = { m: PHM.crescent, turn: 0, wax: 1, um: 0, red: 0 };
    if (e) {
      const m = PHM[e.phase]; if (m != null) T.m = m;
      T.turn = +e.turn || 0; T.wax = e.wax < 0 ? -1 : 1; T.um = e.umbral ? 1 : 0; T.red = clamp(+e.red || 0, 0, 1);
    }
    return T;
  }
  function easeCrown(g, T, dt) {
    let c = g.crown;
    if (!c) { g.crown = Object.assign({}, T); return; }
    const k = r => 1 - Math.exp(-r * dt);
    c.m += (T.m - c.m) * k(6); c.wax += (T.wax - c.wax) * k(7); c.um += (T.um - c.um) * k(7); c.red += (T.red - c.red) * k(3.5);
    c.turn += wrapA(T.turn - c.turn) * k(7);
  }

  function update(g, st, angle, t) {
    let dt = g.last === g.last ? t - g.last : 0;
    if (dt < 0) dt = 0; else if (dt > 0.1) dt = 0.1;
    g.last = t; g.dt = dt;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    g.fx = fx; g.fy = fy; if (Math.abs(fx) > 0.12) g.sg = fx > 0 ? 1 : -1;
    const fe = roomEv('mlform');
    g.form = (st.mlForm === 2 || (st.props && st.props.mlForm === 2) || (fe && fe.n === 2)) ? 2 : 1;
    const pose = pickPose(g, st, t), tp = t - g.t0, name = pose >= 0 ? POSES[pose] : '';
    g.name = name;
    // swing counter for the dance: a fresh action is a fresh cut (once the last one has landed)
    const a = st.action;
    if (a && a.type === 'attack' && a.t0 !== g.cutT0) {
      if (!(g.cutT0 === g.cutT0) || actT(st) >= g.cutT0 + g.cutDur * 0.55) { g.cutN++; g.cutT0 = a.t0; g.cutDur = a.dur || 1; }
    }
    // mounting: she is on the ground for a little, then on his back
    const want = g.form === 2 ? (name === 'mount' ? clamp((tp - 0.5) / 0.9, 0, 1) : 1) : 0;
    g.mk += (want - g.mk) * (1 - Math.exp(-14 * dt)); if (name !== 'mount' || g.form !== 2) g.mk = want;
    const A = atk(g, st, t, pose); g.A = A;
    aim(g, st, pose, A, tp, t, fx, fy, g.mk);
    g.mv += ((st.moving && pose < 0 ? 1 : 0) - g.mv) * (1 - Math.exp(-5 * dt));
    g.ph += dt * (2.2 * g.mv);
    // how much of her is there (intro: out of the light from the head down; death: out of it again)
    let vis = 1, reveal = 1;
    if (name === 'intro') { reveal = sstep(0.4, 2.6, tp); vis = 0.3 + 0.7 * sstep(0.2, 2.2, tp); }
    else if (name === 'death') vis = 1 - sstep(2.6, 4.5, tp);
    g.vis = vis; g.reveal = reveal;
    // the crown
    let T = crownTarget(st);
    if (name === 'death') { T = Object.assign({}, T, { m: 1, um: 0 }); if (tp > 1.2) T.red = Math.max(T.red, 0); }
    if (name === 'intro' && g.crown == null) { /* first state read straight off */ }
    easeCrown(g, T, dt);
    g.ca = name === 'intro' ? sstep(0, 0.9, tp) : name === 'death' ? 1 - sstep(2.4, 4.4, tp) : 1;
    return pose;
  }

  // ---------------------------------------------------------------------------------------------------------- the crown
  // c: { m (1 new .. 0 half .. -1 full), turn, wax, um, red }, R its radius; drawn with the origin at its middle. Upright on the screen.
  function crown(ctx, c, t, R = CROWN_R, alpha = 1) {
    const amt = clamp((1 - c.m) / 2, 0, 1), red = c.red, um = c.um;
    ctx.save();
    ctx.globalAlpha *= alpha;
    // the light it gives: a soft halo, paler the fuller it is
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 0, R * 2.6, K.frost, (0.06 + 0.15 * amt) * (1 - 0.75 * red));
    if (red > 0.02) glow(ctx, 0, 0, R * 2.3, '#8a1822', 0.16 * red);
    ctx.restore();
    // a faint dark aureole so that the lit part reads on pale ground too, and the thin ring of the crown
    ctx.beginPath(); ctx.arc(0, 0, R + 2.4, 0, TAU); ctx.strokeStyle = 'rgba(5,8,16,0.5)'; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(K.sil2, 0.8 - 0.3 * red); ctx.beginPath(); ctx.arc(0, 0, R + 7, 0, TAU); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.strokeStyle = rgba(K.frostH, 0.35); ctx.beginPath(); ctx.arc(0, 0, R + 9.4, 0, TAU); ctx.stroke();
    // the dark of it: a disc of night with the faintest earthshine so that it is a body and not a hole
    const dg = ctx.createRadialGradient(-R * 0.25, -R * 0.25, 2, 0, 0, R);
    dg.addColorStop(0, '#202c4a'); dg.addColorStop(1, '#0a1020');
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = dg; ctx.fill();
    if (um > 0.02) {   // what will strike is the dark: a red wash in it
      const rg = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R); rg.addColorStop(0, rgba(K.bloodM, 0.1 * um)); rg.addColorStop(1, rgba(K.bloodM, 0.42 * um));
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = rg; ctx.fill();
    }
    // the lit part (in a frame whose +x is the way the lit side faces)
    const m = c.m;
    if (m < 0.985) {
      ctx.save(); ctx.rotate(c.turn);
      ctx.beginPath(); ctx.moveTo(0, -R); ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
      if (Math.abs(m) < 0.004) ctx.lineTo(0, -R);
      else if (m > 0) ctx.ellipse(0, 0, m * R, R, 0, Math.PI / 2, -Math.PI / 2, true);
      else ctx.ellipse(0, 0, -m * R, R, 0, Math.PI / 2, Math.PI * 1.5, false);
      ctx.closePath();
      // brighter toward the bright horn (waxing: the horn at turn + 90 degrees)
      const hw = c.wax >= 0 ? 1 : -1, bright = c.wax;   // (the eased wax slides the bright horn across)
      const lg = ctx.createLinearGradient(0, bright * R, 0, -bright * R);
      lg.addColorStop(0, K.hi); lg.addColorStop(0.55, '#dfe8f5'); lg.addColorStop(1, '#a9b8d0');
      ctx.fillStyle = lg; ctx.fill();
      ctx.save(); ctx.clip(); ctx.rotate(-c.turn);   // craters stay where they are on the moon
      for (let i = 0; i < 7; i++) { const a = hash(i, 5) * TAU, d = Math.sqrt(hash(i, 6)) * R * 0.78, r = R * (0.07 + 0.1 * hash(i, 7)); circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r, 'rgba(120,138,170,0.28)'); circle(ctx, Math.cos(a) * d - r * 0.25, Math.sin(a) * d - r * 0.25, r * 0.5, 'rgba(255,255,255,0.22)'); }
      ctx.restore();
      ctx.restore();
      // the limb: a bright line along the lit part of the edge
      ctx.save(); ctx.rotate(c.turn);
      ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false); ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = 1.6; ctx.stroke();
      if (m < -0.01) { ctx.beginPath(); ctx.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5, false); ctx.strokeStyle = rgba('#ffffff', 0.3 * clamp(-m * 2, 0, 1)); ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
      void hw;
    }
    // the dark edge of the disc, so a new moon still has an outline
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.strokeStyle = rgba(K.sil3, 0.55); ctx.lineWidth = 1; ctx.stroke();
    // the bright horn: a flare on the end of the diameter at turn + wax * 90 degrees; the other horn is left plain
    if (m > -0.97 && m < 0.97) {
      const ha = c.turn + c.wax * Math.PI / 2, hx = Math.cos(ha) * R, hy = Math.sin(ha) * R, k = clamp(1 - Math.abs(m) * 0.35, 0.6, 1) * (1 - red);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, hx, hy, R * 0.5, '#ffffff', 0.55 * k);
      ctx.strokeStyle = rgba('#ffffff', 0.85 * k); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      const L = R * 0.36 * (0.9 + 0.1 * Math.sin(t * 2.3));
      ctx.beginPath(); ctx.moveTo(hx - L, hy); ctx.lineTo(hx + L, hy); ctx.moveTo(hx, hy - L); ctx.lineTo(hx, hy + L); ctx.stroke();
      ctx.restore();
    }
    // umbral: a red limb on the dark half of the ring
    if (um > 0.02) {
      ctx.save(); ctx.rotate(c.turn);
      ctx.beginPath(); ctx.arc(0, 0, R + 0.4, Math.PI / 2, Math.PI * 1.5, false);
      ctx.lineCap = 'round'; const dk = clamp((m + 0.95) / 0.5, 0, 1); ctx.strokeStyle = rgba(K.blood, 0.55 * um * dk); ctx.lineWidth = 6.5; ctx.stroke();
      ctx.strokeStyle = rgba('#d8363c', 0.95 * um * dk); ctx.lineWidth = 2.6; ctx.stroke();
      ctx.restore();
    }
    // the eclipse: a shadow closing over it from its left edge, soft at the edge, ending as a deep red moon
    if (red > 0.004) {
      const q = easeOut(red), cx = lerp(-R * 2.45, 0, q), Rs = R * 1.1;
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R + 1, 0, TAU); ctx.clip();
      const sg = ctx.createRadialGradient(cx, 0, Rs * 0.6, cx, 0, Rs * 1.02);
      sg.addColorStop(0, 'rgba(40,5,10,0.96)'); sg.addColorStop(0.75, 'rgba(58,8,14,0.92)'); sg.addColorStop(1, 'rgba(70,10,16,0)');
      ctx.fillStyle = sg; ctx.fillRect(-R - 4, -R - 4, R * 2 + 8, R * 2 + 8);
      if (red > 0.9) { const k = (red - 0.9) / 0.1; ctx.fillStyle = rgba('#4a0a12', 0.35 * k); ctx.fillRect(-R - 4, -R - 4, R * 2 + 8, R * 2 + 8); }
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, R + 0.5, 0, TAU); ctx.strokeStyle = rgba(K.bloodM, 0.4 * red); ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- hair
  // a smooth closed outline through flat [x, y, ...] points (quadratic curves between the midpoints)
  function smoothClosed(ctx, a) {
    const m = a.length / 2, mx = i => (a[(i % m) * 2] + a[((i + 1) % m) * 2]) / 2, my = i => (a[(i % m) * 2 + 1] + a[((i + 1) % m) * 2 + 1]) / 2;
    ctx.beginPath(); ctx.moveTo(mx(m - 1), my(m - 1));
    for (let i = 0; i < m; i++) ctx.quadraticCurveTo(a[i * 2], a[i * 2 + 1], mx(i), my(i));
    ctx.closePath(); ctx.lineJoin = 'round';
  }
  // a long fall of silver-white from the crown of the head: it widens past the shoulders and spills round the robe to the ground,
  // streaming back from the way she faces. Lit on the right.
  const HWT = [[-146, 13], [-128, 15], [-112, 19], [-84, 22], [-52, 24.5], [-14, 29.5], [22, 35], [48, 40]];
  const hairW = (y, k) => { let r = HWT[HWT.length - 1][1]; if (y <= HWT[0][0]) r = HWT[0][1]; else for (let i = 1; i < HWT.length; i++) if (y <= HWT[i][0]) { const a = HWT[i - 1], b = HWT[i]; r = lerp(a[1], b[1], (y - a[0]) / (b[0] - a[0])); break; } return r * (y > -60 ? k : 1); };
  function hairMass(ctx, t, o) {
    const { fx, top, bot, sw } = o, N = 9, spr = o.spr || 0, narrow = o.narrow || 0, fy = o.fy == null ? 1 : o.fy, ew = yawW(fx, fy, 0.6), x0 = o.x0 || 0, kb = o.kb || 12;   // (turned, it narrows with her and falls behind her, away from the way she faces)
    const L = [], Rr = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, y = lerp(top, bot - 6, u);
      const full = (hairW(y, o.w1 / 40) + (o.extra || 0) + (narrow ? 0 : 2.4 * Math.sin(u * 9.4 + 1)) + spr * 9 * u) * ew;
      const cx = (o.cxf ? o.cxf(y) : x0 - fx * kb * Math.pow(u, 0.8) * (1 + 0.5 * spr)) + Math.sin(t * 0.75 + u * 3.1) * sw * u * 3.4;
      L.push(cx - full - Math.sin(u * 7 + 0.7) * 4.4 * u, y); Rr.push(cx + full + Math.sin(u * 6.3 + 2.1) * 4.4 * u, y);
    }
    const pts = L.slice(), bl = L[2 * N], br = Rr[2 * N], yb = bot - 4;
    pts.push(lerp(bl, br, 0.25), yb + 3, lerp(bl, br, 0.5), yb + 5, lerp(bl, br, 0.75), yb + 3);
    for (let i = N; i >= 0; i--) pts.push(Rr[2 * i], Rr[2 * i + 1]);
    const gc = x0 - fx * kb * 0.4, g = ctx.createLinearGradient(gc - 44 * ew, 0, gc + 44 * ew, 0);
    g.addColorStop(0, '#9fabc3'); g.addColorStop(0.45, '#d2dcec'); g.addColorStop(1, '#f7faff');
    ctx.save(); ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
    smoothClosed(ctx, pts); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(EDGE, 0.9); ctx.lineWidth = 1.9; ctx.stroke();
    // the ends: wisps hanging from the bottom edge
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9, x = lerp(bl, br, u), len = 3 + 5 * hash(i, 3);
      poly(ctx, [x - 4.4, yb + 1, x + (hash(i, 4) - 0.5) * 3, yb + 1 + len, x + 4.4, yb + 1], x > 0 ? '#eef3fb' : '#b4c0d6', rgba(EDGE, 0.85), 1.3);
    }
    // strands: long curves from the head to the ends
    ctx.lineCap = 'round';
    for (let k = 0; k < 10; k++) {
      const f = (k + 0.5) / 10;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const u = i / N, x = lerp(L[2 * i], Rr[2 * i], f) + Math.sin(u * 5 + k * 1.7 + t * 0.6) * 1.2 * u, y = L[2 * i + 1];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = k % 3 === 0 ? rgba(K.sil4, 0.3) : rgba('#ffffff', f > 0.4 ? 0.55 : 0.28); ctx.lineWidth = k % 3 === 0 ? 1 : 0.9; ctx.stroke();
    }
    ctx.restore();
  }
  // a lock over the shoulder: a tapered ribbon from (x0, y0) down to (x1, y1)
  function lock(ctx, t, x0, y0, x1, y1, w, sw, side, bend = 0) {
    const N = 9, C = [], dx = x1 - x0, dy = y1 - y0, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      C.push([lerp(x0, x1, u) + Math.sin(Math.PI * u) * bend + Math.sin(u * 6 + side * 1.7 + t * 0.7) * (1.2 + 2.2 * sw) * u * u, lerp(y0, y1, u)]);
    }
    const L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, ww = w * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.12))) * (1 - 0.92 * Math.pow(u, 3.2)) + 0.4;
      L.push(C[i][0] + nx * ww, C[i][1] + ny * ww); R.push(C[i][0] - nx * ww, C[i][1] - ny * ww);
    }
    const pts = L.slice(); pts.push(C[N][0], C[N][1] + 3, C[N][0], C[N][1] + 3);
    for (let i = N; i >= 0; i--) pts.push(R[2 * i], R[2 * i + 1]);
    const g = ctx.createLinearGradient(x0 - w, 0, x0 + w, 0); g.addColorStop(0, '#aebad2'); g.addColorStop(1, '#f6f9ff');
    smoothClosed(ctx, pts); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(EDGE, 0.85); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const f = (k + 1) / 4; ctx.beginPath();
      for (let i = 0; i <= N - 1; i++) { const x = lerp(L[2 * i], R[2 * i], f), y = lerp(L[2 * i + 1], R[2 * i + 1], f); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = rgba(k === 1 ? K.sil4 : '#ffffff', k === 1 ? 0.28 : 0.55); ctx.lineWidth = 0.8; ctx.stroke();
    }
  }

  // ---------------------------------------------------------------------------------------------------------- the robe
  const RT = [[-121, 9], [-116, 16], [-111, 26], [-104, 29], [-92, 27], [-78, 23.4], [-62, 19.6], [-48, 23], [-34, 28], [-14, 32.4], [8, 37], [28, 42], [46, 46]];
  const rw = y => {
    if (y <= RT[0][0]) return RT[0][1];
    for (let i = 1; i < RT.length; i++) if (y <= RT[i][0]) { const a = RT[i - 1], b = RT[i]; return lerp(a[1], b[1], (y - a[0]) / (b[0] - a[0])); }
    return RT[RT.length - 1][1];
  };
  // Which way she is turned, as the figure's drawing needs it (fx east, fy toward the camera): a body seen square on is as wide as it is, seen edge-on a little over half of that (b is its
  // depth against its width). The screen's right half is the lit one (her left side) only while she faces the camera or is in profile; with her back turned the lit half is on the screen's left.
  // spanOf: where the seam of the two halves falls (xs, against a half-width of 1: it runs down the front of her, or down her back when she is turned away) and how much of the body shows
  // either side of it (wl, wr): turned right round to a side, the whole of the near half and none of the far one.
  function yawW(fx, fy, b) { return Math.sqrt(fy * fy + b * b * fx * fx); }
  function spanOf(fx, fy, b) {
    const E = yawW(fx, fy, b), xs = (fy >= 0 ? 1 : -1) * b * fx;
    return { xs, wl: Math.max(0, E + xs), wr: Math.max(0, E - xs), E, litR: fy >= 0 };
  }
  // g: the figure's state; drop: how far the body has sunk; yb: where the hem is (a seated robe stops short); spread: the hem blown out
  function robe(ctx, t, o) {
    const { fx, fy, drop, yb, sw, spr, back } = o, pr = Math.abs(fx), litR = fy >= 0, sf = litR ? 1 : -1;
    const D = drop * 28, sh = y => D * clamp((GY - y) / (GY + 121), 0, 1);
    const xcAt = y => fx * 3 * clamp((y + 112) / 40, 0, 1) - fx * 10 * Math.pow(Math.max(0, (y + 55) / 100), 1.4) * (1 + 0.6 * spr) + Math.sin(t * 1.1 + y * 0.04) * sw * Math.max(0, (y + 60) / 100) * 1.6;
    const ys = []; for (let y = -121; y < yb; y += 5) ys.push(y); ys.push(yb);
    const Lp = [], Cp = [], Rp = [];
    for (const y of ys) {
      const xc = xcAt(y), u = clamp((y + 70) / 70, 0, 1), bs = lerp(0.5, 0.68, u), base = rw(y) + (y > 0 ? drop * 9 * (y / GY) + spr * 5 * (y / GY) : 0);
      const hwv = base * yawW(fx, fy, bs), pk = clamp((y + 55) / 90, 0, 1) * 0.22 * fx;   // (edge-on, the back of the skirt trails wider than its front)
      const hl = hwv * (1 + pk), hr = hwv * (1 - pk), xs = clamp(sf * bs * fx * base, -hl, hr);
      const yy = y + sh(y);
      Lp.push(xc - hl, yy); Cp.push(xc + xs, yy); Rp.push(xc + hr, yy);
    }
    const hem = (x0, x1, yy) => { const r = []; for (let i = 0; i <= 6; i++) { const u = i / 6, x = lerp(x0, x1, u); r.push(x, yy + (i % 2 ? 3.2 : -0.6) + Math.sin(t * 1.3 + x * 0.3) * sw * 1.2); } return r; };
    const n = ys.length, yE = Lp[2 * n - 1];
    const left = [], right = [];
    for (let i = 0; i < n; i++) left.push(Lp[2 * i], Lp[2 * i + 1]);
    left.push(...hem(Lp[2 * n - 2], Cp[2 * n - 2], yE));
    for (let i = n - 1; i >= 0; i--) left.push(Cp[2 * i], Cp[2 * i + 1]);
    for (let i = 0; i < n; i++) right.push(Cp[2 * i], Cp[2 * i + 1]);
    right.push(...hem(Cp[2 * n - 2], Rp[2 * n - 2], yE));
    for (let i = n - 1; i >= 0; i--) right.push(Rp[2 * i], Rp[2 * i + 1]);
    const top = -121 + sh(-121);
    // the dark half and the lit half (the lit one is the screen's right, but with her back turned the screen's left)
    const gd = ctx.createLinearGradient(0, top, 0, yE + 4); gd.addColorStop(0, K.blk3); gd.addColorStop(0.4, K.blk2); gd.addColorStop(1, K.blk);
    const gl = ctx.createLinearGradient(0, top, 0, yE + 4); gl.addColorStop(0, '#f5f9ff'); gl.addColorStop(0.5, '#cfd9ea'); gl.addColorStop(1, '#9aa7c0');
    poly(ctx, left, litR ? gd : gl, EDGE, 2); poly(ctx, right, litR ? gl : gd, EDGE, 2);
    // modelling: the lit half falls into shade toward the seam and the light gathers on its far edge; the dark half keeps a cold glint on its edge
    { const mi = 2 * (n >> 1), xe = litR ? Rp[mi] : Lp[mi], xm = Cp[mi];
      if (Math.abs(xe - xm) > 2) {
        const sg = ctx.createLinearGradient(xm, 0, xe, 0); sg.addColorStop(0, 'rgba(62,78,112,0.30)'); sg.addColorStop(0.35, 'rgba(62,78,112,0)'); sg.addColorStop(0.8, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,0.32)');
        const pts = litR ? right : left; ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i) ctx.lineTo(pts[i], pts[i + 1]); else ctx.moveTo(pts[i], pts[i + 1]); } ctx.closePath(); ctx.fillStyle = sg; ctx.fill();
      } }
    for (const s of [-1, 1]) {
      const lit = (s > 0) === litR, E = s < 0 ? Lp : Rp, dx = s < 0 ? 1.2 : -1.4;
      ctx.beginPath(); for (let i = 0; i < n - 1; i++) { const x = E[2 * i] + dx, y = E[2 * i + 1]; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = lit ? rgba('#ffffff', 0.8) : rgba(K.frost, 0.38); ctx.lineWidth = lit ? 1.4 : 1.2; ctx.stroke();
    }
    // folds: lines fanning from the waist to the hem
    ctx.lineCap = 'round';
    const wy = -56 + sh(-56);
    for (let k = 0; k < 5; k++) {
      const f = (k + 1) / 6, i1 = Math.max(0, n - 2);
      const bx = (a, b) => lerp(a, b, 0.5);
      for (const s of [-1, 1]) {
        const lit = (s > 0) === litR, E = s < 0 ? Lp : Rp, ex = lerp(Cp[2 * i1], E[2 * i1], f), ey = yE - 3, x0 = lerp(Cp[2 * 12], E[2 * 12], f * 0.8);
        if (Math.abs(E[2 * 12] - Cp[2 * 12]) < 3) continue;
        ctx.beginPath(); ctx.moveTo(x0, wy); ctx.quadraticCurveTo(bx(x0, ex) + s * 1.5, (wy + ey) / 2, ex, ey);
        ctx.strokeStyle = lit ? rgba(K.sil4, 0.4 - 0.1 * (k % 2)) : rgba('#7f93bd', 0.22); ctx.lineWidth = lit ? 1.2 : 1.1; ctx.stroke();
        if (lit && k % 2 === 0) { ctx.beginPath(); ctx.moveTo(x0 + 1.6, wy + 2); ctx.quadraticCurveTo(bx(x0, ex) + 3, (wy + ey) / 2, ex + 1.4, ey - 1); ctx.strokeStyle = rgba('#ffffff', 0.6); ctx.lineWidth = 0.9; ctx.stroke(); }
      }
    }
    // the seam between the two halves: one bright line, the terminator (down her front, or down her back)
    ctx.beginPath(); for (let i = 0; i < n; i++) { const x = Cp[2 * i], y = Cp[2 * i + 1]; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = rgba(K.frostH, 0.85); ctx.lineWidth = 1.4; ctx.stroke(); ctx.strokeStyle = rgba(K.frost, 0.22); ctx.lineWidth = 4; ctx.stroke();
    // the hem band: dark thread on the lit half, silver thread and small crescents on the dark half
    if (yb > 20) {
      const hy = yE - 8, i2 = 2 * n - 2;
      for (const s of [-1, 1]) {
        const lit = (s > 0) === litR, E = s < 0 ? Lp : Rp, xa = E[i2] - s * 1.5, xb = Cp[i2];
        if (Math.abs(xa - xb) < 3) continue;
        ctx.beginPath(); ctx.moveTo(xa, hy); ctx.lineTo(xb, hy + 0.5); ctx.strokeStyle = lit ? rgba(K.sil4, 0.7) : rgba(K.sil2, 0.8); ctx.lineWidth = 1.4; ctx.stroke();
        if (!lit && Math.abs(xa - xb) > 14) for (let i = 0; i < 4; i++) { const x = lerp(xa - s * 4.5, xb + s * 6, (i + 0.5) / 4), yy = hy + 4; ctx.beginPath(); ctx.arc(x, yy, 2.2, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = rgba(K.sil2, 0.75); ctx.lineWidth = 1; ctx.stroke(); }
      }
    }
    // the girdle: a thin silver chain, with a small moon for a clasp at the front (from behind, a plain band with a knot at the spine)
    const gy = -61 + sh(-61), gxL = Lp[2 * 12] - 1.5, gxR = Rp[2 * 12] + 1.5, gx = Cp[2 * 12];
    poly(ctx, [gxL, gy - 2.6, gxR, gy - 2.6, gxR, gy + 2.2, gxL, gy + 2.2], K.sil3, EDGE, 1.4);
    line(ctx, gxL + 1, gy - 1.4, gxR - 1, gy - 1.4, rgba('#ffffff', 0.8), 0.9);
    if (litR) { circle(ctx, gx, gy, 4.4, K.sil, EDGE, 1.4); circle(ctx, gx + 1.8 * sf, gy - 0.4, 3.5, K.blk2); circle(ctx, gx, gy, 4.4, null, rgba('#ffffff', 0.7), 0.7); }
    else { poly(ctx, [gx - 3.4, gy - 3.4, gx + 3.4, gy - 3.4, gx + 3.4, gy + 3.2, gx - 3.4, gy + 3.2], K.sil, EDGE, 1.3); line(ctx, gx - 1.6, gy - 1.6, gx + 1.6, gy + 1.4, rgba(K.sil4, 0.8), 1); }
    // the long ends of the girdle: a black tail on the dark side, a silver one on the lit side, hanging to the knee and swaying (the far one first)
    if (o.mk < 0.6) {
      ctx.save(); ctx.globalAlpha *= 1 - o.mk * 1.6;
      for (const s of (fx * sf <= 0 ? [-1, 1] : [1, -1])) {
        const lit = (s > 0) === litR, x0 = gx + s * 5.4 * Math.max(0.3, Math.abs(fy)), L = 40 - (lit ? 6 : 0), swy = Math.sin(t * 1.2 + s * 1.6) * sw * 2.2 + s * 1.5;
        const pts = [x0 - 3.4, gy + 2, x0 + 3.4, gy + 2, x0 + 4.2 + swy * 0.5, gy + L * 0.5, x0 + 3.2 + swy, gy + L, x0 + 0.6 + swy, gy + L - 4.4, x0 - 2.4 + swy, gy + L + 1, x0 - 4 + swy * 0.5, gy + L * 0.5];
        const g = ctx.createLinearGradient(0, gy, 0, gy + L); if (!lit) { g.addColorStop(0, K.blk3); g.addColorStop(1, K.blk); } else { g.addColorStop(0, '#f1f6ff'); g.addColorStop(1, '#aab7ce'); }
        poly(ctx, pts, g, EDGE, 1.6);
        line(ctx, x0 + 0.4, gy + 4, x0 + 0.8 + swy * 0.6, gy + L - 7, rgba(!lit ? K.frost : K.sil4, 0.5), 0.9);
      }
      ctx.restore();
    }
    void back; void pr;
    return { Lp, Cp, Rp, n, sh, xcAt, litR };
  }

  // the high thin collar rising behind the head: dark on the dark half, silver on the lit one (turned, only the near half shows)
  function collar(ctx, fx, fy, D) {
    const sp = spanOf(fx, fy, 0.32);
    for (const s of [-1, 1]) {
      const k = s < 0 ? sp.wl : sp.wr; if (k < 0.06) continue;
      const lit = (s > 0) === sp.litR;
      ctx.save(); ctx.translate(fx * 3 + sp.xs * 26, 0); ctx.scale(k, 1);
      const pts = [s * 7, -116 + D, s * 26, -108 + D, s * 21.4, -129 + D, s * 11, -123 + D];
      poly(ctx, pts, lit ? K.sil : K.blk2, EDGE, 1.6 / Math.max(0.5, k));
      line(ctx, s * 20, -128 + D, s * 23.6, -111 + D, lit ? rgba('#ffffff', 0.85) : rgba(K.frostH, 0.55), 1);
      ctx.restore();
    }
  }

  // the mantle: a short cape of layered cloth over the shoulders and upper arms, black on the dark side and silver on the lit side, its hem scalloped
  // and trimmed, a row of small crescents on the dark half. It gives her shoulders and a waist: the robe is cinched under it. (D: sunk; lift: shoulders up)
  // Turned, it narrows to the depth of her shoulders and only the near half shows; the seam of the halves runs down her front (or her back).
  function mantle(ctx, t, fx, fy, D, lift, back, sw) {
    const sp = spanOf(fx, fy, 0.36), y0 = D - lift * 0.6, wv = (i, k = 1) => Math.sin(t * 1.2 + i * 1.7) * sw * 0.8 * k;
    const bul = 4 * clamp(1 - Math.min(sp.wl, sp.wr) / 0.5, 0, 1), dirB = sp.wl > sp.wr ? 1 : -1;   // (edge-on, the front edge of the cape is rounded, not a straight cut)
    for (const s of [-1, 1]) {
      const k = s < 0 ? sp.wl : sp.wr; if (k < 0.05) continue;
      const lit = (s > 0) === sp.litR, lw = 1 / Math.max(0.5, k);
      ctx.save(); ctx.translate(fx * 3 + sp.xs * 48, y0); ctx.scale(k * 1.14, 1.03);
      const hem = [s * 41 + wv(1) * s, -78.4, s * 36.4, -70.6 + wv(2, 0.5), s * 30.6, -75.6, s * 24.4, -67.6 + wv(3, 0.5), s * 17.4, -73.4, s * 11, -66.2 + wv(4, 0.5), s * 5.4, -72, 0, -67];
      const pts = [0, -119.4, s * 10, -119.4, s * 26, -116, s * 37, -108, s * 42.2, -97.6].concat(hem);
      if (bul > 0.3 && s === -dirB) pts.push(dirB * bul * 0.6, -74, dirB * bul, -88, dirB * bul, -102, dirB * bul * 0.55, -113);
      const g = ctx.createLinearGradient(s * 3, -118, s * 36, -70);
      if (!lit) { g.addColorStop(0, K.blk3); g.addColorStop(0.6, K.blk2); g.addColorStop(1, K.blk); } else { g.addColorStop(0, '#fbfdff'); g.addColorStop(1, '#b3c1d8'); }
      poly(ctx, pts, g, EDGE, 1.9 * lw);
      // folds falling from the shoulder to the hem, the light along the shoulder, the trim along the edge
      for (let q = 0; q < 4; q++) { const f = q / 3; line(ctx, s * (13 + f * 22), -114 + f * 6, s * (9 + f * 29) + wv(q, 0.3) * s, -75 + (q % 2 ? 4 : 0), rgba(!lit ? K.frost : K.sil4, !lit ? 0.2 : 0.38), 1 * lw); }
      line(ctx, s * 13, -118.4, s * 34, -109, rgba(!lit ? K.frostH : '#ffffff', !lit ? 0.5 : 0.95), 1.2 * lw);
      ctx.beginPath(); ctx.moveTo(s * 42, -90); for (let i = 0; i < hem.length; i += 2) ctx.lineTo(hem[i], hem[i + 1] - 1.4);
      ctx.strokeStyle = rgba(!lit ? K.sil2 : K.sil4, !lit ? 0.85 : 0.75); ctx.lineWidth = 1.3 * lw; ctx.lineJoin = 'round'; ctx.stroke();
      if (!lit) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(s * (6 + i * 7.6), -88 - (i % 2) * 3, 2, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = rgba(K.sil2, 0.7); ctx.lineWidth = 1 * lw; ctx.stroke(); }
      ctx.restore();
    }
    ctx.save(); ctx.translate(fx * 3 + sp.xs * 48, y0); ctx.scale(1.14, 1.03);
    if (bul > 0.3) { ctx.beginPath(); ctx.moveTo(0, -118); ctx.quadraticCurveTo(dirB * bul * 1.7, -92, 0, -67.4); ctx.strokeStyle = rgba(K.frostH, 0.8); ctx.lineWidth = 1.2; ctx.stroke(); }
    else line(ctx, 0, -118, 0, -67.4, rgba(K.frostH, 0.8), 1.2);   // the seam of the two halves carries on down the front (or the back)
    ctx.restore();
    void back;
  }

  // ---------------------------------------------------------------------------------------------------------- arms
  function ik(sx, sy, hx, hy, side, l1, l2) {
    let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
    const maxd = (l1 + l2) * 0.985; if (d > maxd) { hx = sx + dx * maxd / d; hy = sy + dy * maxd / d; dx = hx - sx; dy = hy - sy; d = maxd; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const ux = dx / d, uy = dy / d;
    const e1 = [sx + ux * a - uy * h, sy + uy * a + ux * h], e2 = [sx + ux * a + uy * h, sy + uy * a - ux * h];
    // the elbow goes outward and down
    const sc = e => (e[0] - sx) * side * 0.6 + (e[1] - sy) * 1.0;
    const e = sc(e1) >= sc(e2) ? e1 : e2;
    return [e[0], e[1], hx, hy];
  }
  function hand(ctx, x, y, rot, open) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (open > 0.05) { for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.32 * open, len = 10.4 + 1.6 * (2 - Math.abs(i)); line(ctx, Math.cos(a) * 3.4, Math.sin(a) * 3.4, Math.cos(a) * len, Math.sin(a) * len, EDGE, 4.4 * (1 - 0.1 * Math.abs(i))); line(ctx, Math.cos(a) * 3.4, Math.sin(a) * 3.4, Math.cos(a) * len, Math.sin(a) * len, K.skin, 2.6); } }
    ellipse(ctx, 0, 0, 7.4, 5.7, 0, K.skin, EDGE, 1.7);
    if (open <= 0.05) { line(ctx, -1.4, -2.6, 4.6, -2.2, rgba(K.skinD, 0.7), 0.9); line(ctx, -1.4, 0.5, 4.8, 0.7, rgba(K.skinD, 0.7), 0.9); }
    ctx.restore();
  }
  // a tapered tube from (x0, y0) to (x1, y1)
  function tube(ctx, x0, y0, x1, y1, w0, w1, fill, stroke, lw) {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    poly(ctx, [x0 + nx * w0, y0 + ny * w0, x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1, x0 - nx * w0, y0 - ny * w0], fill, stroke, lw);
  }
  // a smooth limb through three points (shoulder, elbow, wrist) with a width at each end and the middle
  function limbShape(ctx, p0, pe, p2, w0, we, w2, fill, stroke, lw) {
    const cx = 2 * pe[0] - (p0[0] + p2[0]) / 2, cy = 2 * pe[1] - (p0[1] + p2[1]) / 2, N = 8, L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      const x = a * p0[0] + b * cx + c * p2[0], y = a * p0[1] + b * cy + c * p2[1];
      const tx = 2 * (1 - u) * (cx - p0[0]) + 2 * u * (p2[0] - cx), ty = 2 * (1 - u) * (cy - p0[1]) + 2 * u * (p2[1] - cy), tl = Math.hypot(tx, ty) || 1;
      const w = u < 0.5 ? lerp(w0, we, u * 2) : lerp(we, w2, (u - 0.5) * 2), nx = -ty / tl, ny = tx / tl;
      L.push(x + nx * w, y + ny * w); R.push(x - nx * w, y - ny * w);
    }
    const pts = L.slice(); for (let i = N; i >= 0; i--) pts.push(R[2 * i], R[2 * i + 1]);
    smoothClosed(ctx, pts); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
    return { x: p2[0], y: p2[1] };
  }
  // a sleeve from the shoulder to the hand: a smooth arm widening to the wrist, a cuff and the cloth that hangs below it. side -1 dark, +1 lit.
  function sleeve(ctx, t, sx, sy, hx, hy, side, sw, open, latv) {
    const lv = latv == null ? side : latv, lit = side > 0, col = lit ? '#d3ddec' : K.blk2, col2 = lit ? '#a6b3ca' : K.blk3, hi = lit ? '#ffffff' : K.frostH;
    const [ex, ey, wx, wy] = ik(sx, sy, hx, hy, lv, 28, 30);
    const fdx = wx - ex, fdy = wy - ey, fl = Math.hypot(fdx, fdy) || 1, ux = fdx / fl, uy = fdy / fl, nx = -uy, ny = ux;
    // the cloth below the wrist: two points hanging down
    const hang = 16 + 6 * Math.sin(t * 1.3 + side) * sw, wd = 12.8;
    poly(ctx, [wx + nx * wd, wy + ny * wd, wx + nx * wd * 0.5 + 1, wy + ny * wd * 0.5 + hang + Math.sin(t * 1.6) * sw * 1.5, wx - 1, wy + hang * 0.45 + 2, wx - nx * wd * 0.5, wy - ny * wd * 0.5 + hang * 0.9 + Math.sin(t * 1.9 + 2) * sw * 1.5, wx - nx * wd, wy - ny * wd], col, EDGE, 1.7);
    line(ctx, wx + nx * wd * 0.55, wy + ny * wd * 0.55 + 3, wx + nx * wd * 0.35 + 0.6, wy + ny * wd * 0.35 + hang * 0.8, rgba(hi, lit ? 0.5 : 0.22), 1);
    const g = ctx.createLinearGradient(sx, sy, wx, wy); g.addColorStop(0, col2); g.addColorStop(1, col);
    const g2 = ctx.createLinearGradient(sx - 14, sy - 10, sx + 14, sy + 8); if (lit) { g2.addColorStop(0, '#ffffff'); g2.addColorStop(1, '#b3c1d8'); } else { g2.addColorStop(0, K.blk3); g2.addColorStop(1, K.blk); }
    limbShape(ctx, [sx, sy], [ex, ey], [wx + ux * 6, wy + uy * 6], 11.8, 9.8, 12, g, EDGE, 1.9);
    // the swell of the upper arm and the forearm: a shade along the underside and a lighter band over the muscle, so that the sleeve reads as a round limb
    { const ax = ex - sx, ay = ey - sy, al = Math.hypot(ax, ay) || 1, anx = -ay / al, any = ax / al;
      line(ctx, sx - anx * 7.4 + ax * 0.16, sy - any * 7.4 + ay * 0.16, ex - anx * 7.2, ey - any * 7.2, rgba(lit ? K.sil4 : '#000000', lit ? 0.3 : 0.4), 3);
      line(ctx, ex + ux * 6 - nx * 7.4, ey + uy * 6 - ny * 7.4, wx - nx * 8, wy - ny * 8, rgba(lit ? K.sil4 : '#000000', lit ? 0.28 : 0.4), 3);
      // the elbow: a gather of cloth over the joint
      ellipse(ctx, ex, ey, 6.4, 5.4, Math.atan2(ay, ax), rgba(lit ? K.sil3 : K.blk3, 0.55)); }
    // a light along the top of it, and the band of the cuff: dark thread on the lit sleeve, silver on the dark one
    line(ctx, ex + nx * 6, ey + ny * 6, wx + nx * 10.2, wy + ny * 10.2, rgba(hi, lit ? 0.8 : 0.4), 1.3);
    const cxp = wx + ux * 2.4, cyp = wy + uy * 2.4;
    line(ctx, cxp + nx * 12.6, cyp + ny * 12.6, cxp - nx * 12.6, cyp - ny * 12.6, rgba(lit ? K.sil4 : K.sil2, 0.9), 2);
    // the shoulder: a round cap
    // (two lames of cloth-backed plate under a dome, the dome's edge picked out in thread)
    ellipse(ctx, sx + lv * 3.4, sy + 7.6, 13.6, 4.8, lv * 0.12, col2, EDGE, 1.6);
    ellipse(ctx, sx + lv * 2.4, sy + 3.6, 14.6, 5.6, lv * 0.1, col, EDGE, 1.6);
    ellipse(ctx, sx + lv * 1.4, sy - 1.4, 13.6, 9.2, lv * 0.08, g2, EDGE, 1.9);
    ctx.beginPath(); ctx.ellipse(sx + lv * 1.4, sy - 1.4, 10.8, 6.6, lv * 0.08, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = rgba(lit ? K.sil4 : K.sil2, 0.75); ctx.lineWidth = 1.1; ctx.stroke();
    ellipse(ctx, sx - lv * 2, sy - 5, 8, 2.8, lv * 0.1, rgba(hi, lit ? 0.8 : 0.3));
    ctx.beginPath(); ctx.arc(sx + lv * 3, sy + 0.4, 2.2, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = rgba(lit ? K.sil4 : K.sil2, 0.8); ctx.lineWidth = 1; ctx.stroke();
    return [wx + ux * 3, wy + uy * 3, Math.atan2(uy, ux)];
  }

  // ---------------------------------------------------------------------------------------------------------- the head
  function face(ctx, cx, cy, hfx, hfy, eyes, red, t, lit) {
    const rx = 11.4, ry = 14.6, vis = clamp((hfy + 0.5) / 0.5, 0, 1), side = Math.abs(hfx), sgn = hfx >= 0 ? 1 : -1, kp = sstep(0.3, 0.85, side);   // (kp: 0 square on .. 1 in profile)
    // the neck is drawn by the caller; the skull
    const sg = ctx.createLinearGradient(cx - 12, 0, cx + 12, 0); sg.addColorStop(0, K.skinS); sg.addColorStop(0.55, K.skin); sg.addColorStop(1, '#ffffff');
    poly(ctx, [cx - 8.4, cy + 7, cx - 3, cy + 14.6, cx, cy + 16.4, cx + 3, cy + 14.6, cx + 8.4, cy + 7], sg);
    ellipse(ctx, cx, cy, rx, ry, 0, sg, EDGE, 1.8);
    poly(ctx, [cx - 8.8, cy + 8, cx - 3.2, cy + 15.2, cx, cy + 17, cx + 3.2, cy + 15.2, cx + 8.8, cy + 8, cx + 5, cy + 12, cx, cy + 14.5, cx - 5, cy + 12], sg, EDGE, 1.6);
    ellipse(ctx, cx, cy + 3, rx - 0.4, ry - 3.6, 0, sg);
    if (vis > 0.02) {
      ctx.save(); ctx.globalAlpha *= vis;
      const fo = hfx * 6.6, ex = cx + fo, ey = cy + 1.2, sep = 4.8 * (1 - 0.6 * side);
      // the dark half of the face (the moon's: it is lit on the right)
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx - 0.3, ry - 0.3, 0, 0, TAU); ctx.clip();
      const dg = ctx.createLinearGradient(cx - rx, 0, cx + 2, 0); dg.addColorStop(0, 'rgba(8,12,26,0.34)'); dg.addColorStop(1, 'rgba(8,12,26,0)');
      ctx.fillStyle = dg; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2 + 6);
      ctx.restore();
      if (kp > 0.02) {   // in profile the face stands out from the skull: brow, nose, lips and chin on the side she looks to
        const q = (a, b) => lerp(a, b, kp), F = [8.6, -8, 10.8, -4.6, 10.3, -1.4, 10.9, 1, q(10.9, 16.8), 5.8, q(10.9, 11.8), 7.8, q(10.8, 12.2), 9.4, q(10.6, 11.2), 10.6, q(10.6, 11.9), 11.8, q(10, 10.6), 13.2, q(8.6, 10.2), 15.6];
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sgn, 1);
        const pg = ctx.createLinearGradient(-12 * sgn, 0, 12 * sgn, 0); pg.addColorStop(0, K.skinS); pg.addColorStop(0.55, K.skin); pg.addColorStop(1, '#ffffff');
        ctx.beginPath(); ctx.moveTo(F[0], F[1]); for (let i = 2; i < F.length; i += 2) ctx.lineTo(F[i], F[i + 1]); ctx.lineTo(3.6, 16.6); ctx.lineTo(-1, 12); ctx.lineTo(-1, -6); ctx.closePath(); ctx.fillStyle = pg; ctx.fill();
        ctx.beginPath(); ctx.moveTo(F[0], F[1]); for (let i = 2; i < F.length; i += 2) ctx.lineTo(F[i], F[i + 1]); ctx.lineTo(3.6, 16.6); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.stroke();
        line(ctx, q(10.4, 12.4), 10.2, q(10.4, 10.2), 10.4, rgba(K.lip, 0.9), 1);   // the line of the lips
        ctx.restore();
      }
      for (const s of [-1, 1]) {
        const far = (hfx > 0 && s < 0) || (hfx < 0 && s > 0), w = 3.4 * (far ? 1 - 0.78 * side : 1) * (1 - 0.25 * kp * (far ? 0 : 1));
        if (side > 0.82 && far) continue;
        const x = ex + s * sep;
        // the brow
        ctx.beginPath(); ctx.moveTo(x - w - 0.6, ey - 3.4); ctx.quadraticCurveTo(x, ey - 5.6, x + w + 0.6, ey - 3.2); ctx.strokeStyle = rgba(K.sil4, 0.8); ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.stroke();
        if (eyes > 0.12) {   // an eye that is open: a bright almond, and a light
          const hh = 1.2 + 1.5 * eyes;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, ey, 7 + 3 * eyes, red > 0.1 ? '#a8222b' : K.frost, 0.45 * eyes); ctx.restore();
          ctx.beginPath(); ctx.moveTo(x - w, ey); ctx.quadraticCurveTo(x, ey - hh, x + w, ey); ctx.quadraticCurveTo(x, ey + hh * 0.9, x - w, ey); ctx.fillStyle = red > 0.1 ? rgba('#e25a5e', 0.95) : K.frostH; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 0.9; ctx.stroke();
        } else {   // shut: a curve and the long lashes
          ctx.beginPath(); ctx.moveTo(x - w, ey - 0.4); ctx.quadraticCurveTo(x, ey + 2.1, x + w, ey - 0.4); ctx.strokeStyle = '#1b2440'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - w, ey - 0.2); ctx.lineTo(x - w - 1.1, ey + 1.3); ctx.moveTo(x + w, ey - 0.2); ctx.lineTo(x + w + 1.1, ey + 1.3); ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
      // the nose and the mouth
      if (kp < 0.98) { ctx.save(); ctx.globalAlpha *= 1 - kp; ctx.beginPath(); ctx.moveTo(ex, ey + 1.6); ctx.lineTo(ex + hfx * 1.7, ey + 6.4); ctx.lineTo(ex + hfx * 1.7 - 1.6 * (1 - side), ey + 7); ctx.strokeStyle = rgba(K.skinD, 0.85); ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
      if (kp < 0.9) { const mm = lerp(ex, cx + sgn * 8.8, kp), mh = 2.6 * (1 - 0.5 * side); ctx.save(); ctx.globalAlpha *= 1 - kp; ctx.beginPath(); ctx.moveTo(mm - mh, ey + 10.6); ctx.quadraticCurveTo(mm, ey + 11.6, mm + mh, ey + 10.6); ctx.strokeStyle = K.lip; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
      ctx.restore();
    }
    void lit; void t;
  }
  // the hair on the head: a cap with a hairline over the face, a parting, the sides coming down. back: nothing of the face shows
  function hairCap(ctx, cx, cy, hfx, hfy, back) {
    const rx = 11.4 + 2, ry = 14.6 + 1.8, vis = clamp((hfy + 0.5) / 0.5, 0, 1), sgn = hfx >= 0 ? 1 : -1, kp = sstep(0.3, 0.85, Math.abs(hfx));
    const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0); g.addColorStop(0, '#aab6cc'); g.addColorStop(0.5, '#dce5f2'); g.addColorStop(1, '#fafcff');
    if (back > 0.5) { ellipse(ctx, cx, cy - 0.5, rx + 0.6, ry + 0.6, 0, g, EDGE, 1.8); for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 1.2, cy - ry + 1); ctx.quadraticCurveTo(cx + k * 4.2, cy, cx + k * 3.4, cy + ry - 1); ctx.strokeStyle = rgba(k % 2 ? '#ffffff' : K.sil4, 0.4); ctx.lineWidth = 0.9; ctx.stroke(); } return; }
    const fo = hfx * 6.6 * vis, hl = cy - 3 + (1 - vis) * 6;
    // turned, the opening for the face slides off to the side she looks to (the hair covers the whole back of the head) and the lock on that side shortens to nothing
    const xR = sgn > 0 ? lerp(rx - 3, rx - 0.8, kp) : lerp(rx - 3, 2.2, kp), xL = sgn > 0 ? lerp(-rx + 3, -2.2, kp) : lerp(-rx + 3, -rx + 0.8, kp);
    const yR = sgn > 0 ? lerp(cy + 10, hl - 0.5, kp) : cy + 10, yRc = sgn > 0 ? lerp(cy + 2, hl, kp) : cy + 2, yL = sgn > 0 ? cy + 10 : lerp(cy + 10, hl - 0.5, kp), yLc = sgn > 0 ? cy + 2 : lerp(cy + 2, hl, kp);
    const bk = 2.6 * kp;   // (the back of the skull is rounder under the hair)
    ctx.beginPath(); ctx.moveTo(cx - rx - 0.4 - (sgn > 0 ? bk : 0), yL); ctx.quadraticCurveTo(cx - rx - 2 - (sgn > 0 ? bk : 0), cy - ry * 0.7, cx - 2, cy - ry - 2.2); ctx.quadraticCurveTo(cx + rx + 2 + (sgn < 0 ? bk : 0), cy - ry * 0.7, cx + rx + 0.4 + (sgn < 0 ? bk : 0), yR);
    ctx.quadraticCurveTo(cx + rx - 1.6, yRc, cx + xR, hl + 1); ctx.quadraticCurveTo(cx + fo * 0.7, hl - 9, cx + xL, hl + 1); ctx.quadraticCurveTo(cx - rx + 1.6, yLc, cx - rx - 0.4 - (sgn > 0 ? bk : 0), yL); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + fo * 0.5 - 0.6, cy - ry - 1.6); ctx.quadraticCurveTo(cx + fo * 0.7, cy - ry * 0.6, cx + fo * 0.7, hl - 4); ctx.strokeStyle = rgba(K.sil4, 0.6); ctx.lineWidth = 1; ctx.stroke();
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx + fo * 0.5 + k * 1.6, cy - ry - 1); ctx.quadraticCurveTo(cx + k * 6, cy - 6, cx + k * 5 + fo * 0.5, hl); ctx.strokeStyle = rgba(k > 0 ? '#ffffff' : K.sil4, 0.38); ctx.lineWidth = 0.8; ctx.stroke(); }
  }

  // the wolf-skull helm of the Hunt: a bone-silver skull worn over her head, a long muzzle over her brow pointing the way she looks, ears
  // swept back, two small moons in the sockets over her eyes. Her hair comes out from under it. In profile the muzzle runs out ahead of her
  // face; from the front it comes down over her nose; from behind there is only the dome and the ears.
  function helm(ctx, hx, hy, hfx, hfy, t, eyes, red) {
    const vis = clamp((hfy + 0.45) / 0.8, 0, 1), side = Math.abs(hfx);
    const g = ctx.createLinearGradient(hx - 14, hy - 18, hx + 14, hy + 6); g.addColorStop(0, '#e9eef7'); g.addColorStop(0.5, '#aab6cb'); g.addColorStop(1, '#6f7d99');
    for (const s of [-1, 1]) {   // the ears, pointed, swept back
      const bk = -hfx * 4;
      poly(ctx, [hx + s * 6.6, hy - 11, hx + s * 14 + bk, hy - 29 + Math.sin(t * 1.1 + s) * 0.8, hx + s * 12.6, hy - 10], g, EDGE, 1.6);
      poly(ctx, [hx + s * 8.4, hy - 12, hx + s * 13 + bk * 0.9, hy - 25, hx + s * 11.6, hy - 11.6], rgba('#3a4766', 0.7));
    }
    // the dome
    ellipse(ctx, hx - hfx * 1.2, hy - 6, 14, 11.6, 0, g, EDGE, 1.9);
    ellipse(ctx, hx - 3 - hfx, hy - 11, 6.4, 2.6, -0.2, rgba('#ffffff', 0.7));
    line(ctx, hx - hfx * 1.2, hy - 17, hx + hfx * 3, hy - 4, rgba('#6c7993', 0.8), 1.2);   // the seam over the crown
    if (vis > 0.05) {
      ctx.save(); ctx.globalAlpha *= vis;
      const d = nrm(hfx * 0.9, 0.3 + 0.62 * Math.max(0, hfy)), L = lerp(16, 29, side), B = [hx + hfx * 3.4, hy - 3.4], E = [B[0] + d[0] * L, B[1] + d[1] * L], n = [-d[1], d[0]];
      poly(ctx, [B[0] + n[0] * 7.6, B[1] + n[1] * 7.6, E[0] + n[0] * 3.6, E[1] + n[1] * 3.6, E[0] - n[0] * 3.6, E[1] - n[1] * 3.6, B[0] - n[0] * 7.6, B[1] - n[1] * 7.6], g, EDGE, 2);
      line(ctx, B[0], B[1], E[0], E[1], rgba('#6c7993', 0.7), 1);
      line(ctx, B[0] + n[0] * 3.6, B[1] + n[1] * 3.6, E[0] + n[0] * 1.6, E[1] + n[1] * 1.6, rgba('#ffffff', 0.7), 1);
      for (const s of [-1, 1]) poly(ctx, [E[0] + n[0] * 2.4 * s - d[0] * 3.4, E[1] + n[1] * 2.4 * s - d[1] * 3.4, E[0] + n[0] * 2.8 * s + d[0] * 1.2 - n[0] * s * 1.2, E[1] + n[1] * 2.8 * s + d[1] * 1.2 + 3, E[0] + n[0] * 1.2 * s - d[0] * 3.4, E[1] + n[1] * 1.2 * s - d[1] * 3.4], '#ffffff', EDGE, 0.9);
      ellipse(ctx, E[0], E[1], 2.6, 2.2, Math.atan2(d[1], d[0]), '#04080f');
      // the sockets, over her eyes, with a small moon lit in each
      const fo = hfx * 6.6, sep = 4.8 * (1 - 0.6 * side), ey = hy + 0.6;
      for (const s of [-1, 1]) {
        const far = (hfx > 0 && s < 0) || (hfx < 0 && s > 0); if (side > 0.82 && far) continue;
        const x = hx + fo + s * sep * 1.1, r = 3.6 * (far ? 1 - 0.7 * side : 1);
        ellipse(ctx, x, ey - 1.6, r + 0.8, 3.4, 0, '#04080f', EDGE, 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, ey - 1.6, 8, red > 0.1 ? '#a8222b' : K.frost, 0.4 + 0.3 * eyes); ctx.restore();
        circle(ctx, x, ey - 1.6, 1.7, red > 0.1 ? '#e25a5e' : '#ffffff');
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------------------------------------- the crescent blade
  const BL = 168, THETA = 1.12, RB = BL / THETA, BUTT = 24, S0 = 12;
  const BN = 16;
  // from the hand (hx, hy), pointing at ba; L foreshortens it along its length; cv bows it (-1 .. 1). Returns the tip and the middle of the blade.
  function blade(ctx, hx, hy, ba, L, cv, lit, t, o = {}) {
    const ax = Math.cos(ba), ay = Math.sin(ba), nx = -ay, ny = ax;
    const P = (s, w) => [hx + ax * s * L + nx * w, hy + ay * s * L + ny * w];
    const cvs = Math.abs(cv) < 0.05 ? 0.05 : cv;
    const ca = [], oe = [], ie = [];
    for (let i = 0; i <= BN; i++) {
      const u = i / BN, ph = THETA * u, s = S0 + RB * Math.sin(ph), w = cvs * RB * (1 - Math.cos(ph));
      const bell = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.82)), 0.78) * (1 - 0.12 * u) + 0.0001;
      const ns = Math.sin(ph), nw = -Math.sign(cvs) * Math.cos(ph);   // outward (convex) normal in (s, w)
      const wo = 9.4 * bell, wi = 5.6 * bell * (0.8 + 0.2 * Math.abs(cvs));
      ca.push(P(s, w)); oe.push(P(s + ns * wo, w + nw * wo)); ie.push(P(s - ns * wi, w - nw * wi));
    }
    const tip = ca[BN], mid = ca[BN >> 1];
    // its light
    if (lit > 0.3 && !o.noGlow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 3; i <= BN; i += 4) glow(ctx, ca[i][0], ca[i][1], 16 + 10 * lit, K.frost, 0.05 + 0.06 * Math.min(1.4, lit)); ctx.restore(); }
    // the haft: a wrapped grip and a small moon for a pommel
    const b0 = P(-BUTT, 0), b1 = P(S0 + 2, 0);
    line(ctx, b0[0], b0[1], b1[0], b1[1], EDGE, 7); line(ctx, b0[0], b0[1], b1[0], b1[1], K.blk3, 4.6);
    for (let i = 1; i < 7; i++) { const s = lerp(-BUTT + 2, S0, i / 7), a = P(s, -2.3), b = P(s + 2.2, 2.3); line(ctx, a[0], a[1], b[0], b[1], rgba(K.sil2, 0.75), 0.9); }
    const pm = P(-BUTT - 3, 0);
    circle(ctx, pm[0], pm[1], 4.8, K.sil, EDGE, 1.4); circle(ctx, pm[0] + nx * 1.7 * -Math.sign(cvs) + ax * 0.5, pm[1] + ny * 1.7 * -Math.sign(cvs), 3.8, K.blk2); circle(ctx, pm[0], pm[1], 4.8, null, rgba('#ffffff', 0.6), 0.7);
    // the blade: the outer band (the edge) silver-white, the inner band black with a thread of silver on its spine
    const full = []; for (let i = 0; i <= BN; i++) full.push(oe[i][0], oe[i][1]); for (let i = BN; i >= 0; i--) full.push(ie[i][0], ie[i][1]);
    poly(ctx, full, EDGE, EDGE, 3.4);
    const og = []; for (let i = 0; i <= BN; i++) og.push(oe[i][0], oe[i][1]); for (let i = BN; i >= 0; i--) og.push(ca[i][0], ca[i][1]);
    const gr = ctx.createLinearGradient(hx, hy, tip[0], tip[1]); gr.addColorStop(0, '#dbe5f3'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#cfe3fa');
    poly(ctx, og, gr);
    const ig = []; for (let i = 0; i <= BN; i++) ig.push(ca[i][0], ca[i][1]); for (let i = BN; i >= 0; i--) ig.push(ie[i][0], ie[i][1]);
    poly(ctx, ig, K.blk2);
    ctx.beginPath(); for (let i = 1; i < BN; i++) { if (i === 1) ctx.moveTo(ie[i][0], ie[i][1]); else ctx.lineTo(ie[i][0], ie[i][1]); }
    ctx.strokeStyle = rgba(K.sil2, 0.75); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.beginPath(); for (let i = 1; i < BN; i++) { if (i === 1) ctx.moveTo(oe[i][0], oe[i][1]); else ctx.lineTo(oe[i][0], oe[i][1]); }
    ctx.strokeStyle = rgba('#ffffff', 0.95); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); for (let i = 2; i < BN - 1; i++) { if (i === 2) ctx.moveTo(ca[i][0], ca[i][1]); else ctx.lineTo(ca[i][0], ca[i][1]); }
    ctx.strokeStyle = rgba(K.frost, 0.7 + 0.2 * Math.min(1, lit)); ctx.lineWidth = 1.1; ctx.stroke();
    // the guard: a thin crescent across the haft, bowing toward the blade
    const g0 = P(S0 - 1, -15), g1 = P(S0 + 5, 0), g2 = P(S0 - 1, 15);
    ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.quadraticCurveTo(g1[0], g1[1], g2[0], g2[1]); ctx.lineCap = 'round'; ctx.strokeStyle = EDGE; ctx.lineWidth = 5.2; ctx.stroke(); ctx.strokeStyle = K.sil; ctx.lineWidth = 3; ctx.stroke();
    // a glint runs down it now and then
    const q = (t * 0.17) % 1;
    if (q < 0.6) { const u = q / 0.6, i = Math.min(BN, Math.round(u * BN)), a = Math.sin(u * Math.PI); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ca[i][0], ca[i][1], 9, '#ffffff', 0.7 * a); ctx.restore(); }
    return [tip[0], tip[1], mid[0], mid[1], ca[5][0], ca[5][1]];
  }
  // the swept path of the blade: pale quads between where its tip and middle were on the last few frames
  function trail(ctx, g, t, tip) {
    const tr = g.tr, last = tr[tr.length - 1];
    if (!last || last.t > t || t - last.t > 0.3) { tr.length = 0; }
    const l2 = tr[tr.length - 1];
    if (!l2 || t - l2.t > 1 / 90) tr.push({ t, x: tip[0], y: tip[1], gx: tip[4], gy: tip[5] });
    while (tr.length && t - tr[0].t > 0.34) tr.shift();
    if (tr.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i], age = clamp(1 - (t - b.t) / 0.34, 0, 1), sp = Math.hypot(b.x - a.x, b.y - a.y);
      if (sp < 2.2 || sp > 110) continue;
      const fast = clamp((sp - 6) / 24, 0, 1);   // (a quick stroke leaves a bright streak, a slow draw only a pale path)
      ctx.fillStyle = rgba(K.frostH, (0.24 + 0.2 * fast) * age * age);
      ctx.beginPath(); ctx.moveTo(a.gx, a.gy); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.gx, b.gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', (0.5 + 0.35 * fast) * age * age); ctx.lineWidth = 1.4 + 1.6 * fast; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  // Earthshine's second hit: a pale blade, the afterimage of the cut, drawn in light alone, sweeping down the same way a beat after it
  function echo(ctx, g, t) {
    const A = g.A, fx = g.fx, sg = g.sg, [, a1] = cutAngles(g.fx, g.fy, sg);
    const up = -Math.PI / 2 - sg * 0.55, u = clamp((A.p - 0.66) / 0.5, 0, 1), e = easeOut(u), al = Math.sin(Math.min(1, u * 1.1) * Math.PI);
    if (al < 0.02) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.62 * al;
    blade(ctx, lerp(-sg * 36, fx * 16, e), lerp(-138, -58, e), lerp(up, a1, e), 1.06, sg > 0 ? -1 : 1, 0, t, { noGlow: true });
    glow(ctx, lerp(-sg * 36, fx * 16, e), lerp(-138, -58, e), 60, K.frostH, 0.2);
    ctx.restore();
  }
  // ---------------------------------------------------------------------------------------------------------- the figure
  // The saddle (mk 0 .. 1): the robe stops at the hip and a skirt falls over each flank, the hair falls over the saddle, the legs are not drawn.
  function figure(ctx, g, st, t, wfx) {
    const P = g.p, fx = g.fx, fy = g.fy, name = g.name, mv = g.mv, side = Math.abs(fx), back = fy < -0.3 ? 1 : 0, mk = g.mk;
    const sw = 0.9 + mv * 1.6 + P.spr * 1.2 + (name === 'dash' || name === 'ride' ? 1.6 : 0);
    const D = clamp(P.drop, 0, 1.3) * 28;
    const bob = Math.sin(t * 0.9) * 0.8 + mv * Math.abs(Math.sin(g.ph)) * 1.4;
    const sk = P.sk * Math.sin(t * 61) * 0.7;
    const yb = lerp(GY - 2, -36, mk);
    // her shadow, and the pool of pale light and hair round her on the dust
    if (mk < 0.95) {
      ctx.save(); ctx.globalAlpha *= 1 - mk;
      ellipse(ctx, 0, GY - 1, 50 * (1 + 0.18 * P.drop + 0.2 * P.spr), 10, 0, rgba('#03050c', 0.3 - 0.18 * Math.min(1, P.fl / 12)));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, GY - 2, 70, K.frost, 0.07 + 0.04 * Math.min(1.5, P.lit)); ctx.restore();
      // the hair lies on the dust round her feet in a pale spill
      const pool = 1 + 0.5 * P.drop;
      ellipse(ctx, -fx * 14, GY - 3, 52 * pool, 8.5 * pool, 0, rgba('#e4ebf6', 0.55), rgba(EDGE, 0.35), 1);
      ellipse(ctx, -fx * 14, GY - 4, 38 * pool, 5 * pool, 0, rgba('#ffffff', 0.35));
      ctx.restore();
    }
    if (name === 'dash' && mk < 0.5) {   // streaks of pale light behind her
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const y = -130 + i * 22 + hash(i, 1) * 8, Ln = 40 + 50 * hash(i, 2); line(ctx, -fx * 18, y, -fx * (18 + Ln), y + fy * 6, rgba(K.frostH, 0.2), 1.8); }
      ctx.restore();
    }
    // the crown, behind everything of her, floating a little
    const cy = CROWN_Y + Math.sin(t * 0.8) * 1.6 - P.fl * 0.9 + D * 0.6 + (name === 'death' ? 0 : 0) - P.bow * 2;
    if (g.ca > 0.01 && g.crown) { ctx.save(); ctx.translate(-fx * 3 + P.lean * -0.6 + sk, cy); crown(ctx, g.crown, t, CROWN_R, g.ca); ctx.restore(); }
    ctx.save();
    ctx.translate(0, bob * 0.5 - P.fl);
    ctx.transform(1, 0, -P.lean / 150, 1, 0, 0);
    const blk = () => blade(ctx, P.hx + sk * 0.4, P.hy, P.ba, P.L, P.cv, P.lit, t);
    let tip = null;
    const bdx = Math.cos(P.ba), bdy = Math.sin(P.ba), behind = (bdy < -0.35 && P.hy > -120) || back;
    // the long fall of hair behind: all of it from behind, the part outside the robe from the front
    // where she is turned: the head, the shoulders (each side of her has a place on the screen and a depth: the nearer one is in front), which hand has the blade
    const headX = fx * 3 + P.lean * 0.1 + sk, sx0 = 22.4, lift = P.lift * 3.4, sy = -110 - lift + D;
    const bodies = [{ lit: true, lat: 1, d: -fx }, { lit: false, lat: -1, d: fx }];   // (her left is the lit half, her right the dark: the screen's right and left as she faces the camera)
    for (const b of bodies) b.x = fx * 3 + b.lat * fy * sx0 + b.d * 3;
    // the blade is in the hand nearer the camera when she is in profile (a mirror of itself east and west); square on it keeps the side it was
    const mainB = bodies[0].lat * fy * g.sg + 1.3 * bodies[0].d >= bodies[1].lat * fy * g.sg + 1.3 * bodies[1].d ? bodies[0] : bodies[1], offB = mainB === bodies[0] ? bodies[1] : bodies[0];
    const farB = !back && offB.d < -0.3 ? offB : null;   // (behind her body: drawn before the robe, so the robe covers what it should)
    const bx = P.hx + sk * 0.4, by = P.hy, ox1 = bx - bdx * 22, oy1 = by - bdy * 22;
    const offX = lerp(P.ox, ox1, P.two), offY = lerp(P.oy, oy1, P.two);
    const armOf = b => {
      const isMain = b === mainB, [wx, wy, ang] = sleeve(ctx, t, b.x, sy, isMain ? bx : offX, isMain ? by : offY, b.lit ? 1 : -1, sw, isMain ? 0 : P.oh, b.lat * fy);
      if (!isMain && mk > 0.5 && g.rein && P.two < 0.5) g.reinHand = [wx, wy];
      hand(ctx, wx, wy, ang, isMain ? 0 : P.oh);
    };
    // the long fall of hair behind: all of it from behind, the part outside the robe from the front (turned, it falls behind her, away from the way she faces)
    if (!back) hairMass(ctx, t, { fx, fy, x0: headX, kb: 26, top: -144 + D, bot: lerp(GY - 4, 4, mk) + (mk > 0.5 ? 18 * mk : 0), w0: 14, w1: lerp(40, 44, mk), sw, spr: P.spr });
    collar(ctx, fx, fy, D);
    if (behind) tip = blk();
    if (farB) armOf(farB);
    // the robe
    ctx.save();
    const R = robe(ctx, t, { fx, fy, drop: P.drop, yb, sw, spr: P.spr, back, mk });
    ctx.restore();
    // the over-skirt: two long panels hung from the girdle over her hips, wider than the robe under them, a point to each hem, the dark one scalloped with thread.
    // Turned, the panel of the near hip covers the side of the skirt and the far one is behind her.
    if (mk < 0.6 && R && R.n > 24) {
      ctx.save(); ctx.globalAlpha *= 1 - mk * 1.6;
      const i0 = 12, i1 = Math.min(R.n - 8, 23), pr = Math.abs(fx);
      for (const b of bodies.slice().sort((a, c) => a.d - c.d)) {
        if (b.d < -0.45) continue;
        const lat = b.lat * fy, os = lat >= 0 ? 1 : -1, lit = b.lit, c = [], ys = [];
        for (let i = i0; i <= i1; i++) {
          const hw = (R.Rp[2 * i] - R.Lp[2 * i]) / 2, cx0 = (R.Rp[2 * i] + R.Lp[2 * i]) / 2, pw = hw * (0.36 + 0.44 * pr) + (i - i0) * 0.25 + 1.5 * (1 - pr);
          c.push([cx0 + lat * 0.73 * hw + os * 1.5 * (1 - pr), pw]); ys.push(R.Lp[2 * i + 1]);
        }
        const k = c.length - 1, ye = ys[k], pts = [];
        for (let i = 0; i <= k; i++) pts.push(c[i][0] - c[i][1], ys[i]);
        pts.push(c[k][0] - c[k][1], ye + 2, c[k][0] + b.lat * 2, ye + 8 + Math.sin(t * 1.4 + b.lat) * sw * 1.2, c[k][0] + c[k][1], ye + 1);
        for (let i = k; i >= 0; i--) pts.push(c[i][0] + c[i][1], ys[i]);
        const gg = ctx.createLinearGradient(0, ys[0], 0, ye + 8); if (lit) { gg.addColorStop(0, '#f2f7ff'); gg.addColorStop(1, '#a9b6cd'); } else { gg.addColorStop(0, K.blk3); gg.addColorStop(1, K.blk); }
        poly(ctx, pts, gg, EDGE, 1.9);
        for (let q = 0; q < 3; q++) { const f = 0.3 + q * 0.3; line(ctx, lerp(c[0][0] - c[0][1], c[0][0] + c[0][1], 0.5 + (f - 0.6) * 0.5), ys[0] + 3, lerp(c[k][0] - c[k][1], c[k][0] + c[k][1], f), ye - 2, rgba(lit ? K.sil4 : K.frost, lit ? 0.35 : 0.16), 1); }
        const eo = c[0][0] + os * c[0][1], ek = c[k][0] + os * c[k][1];
        line(ctx, eo - os * 1.2, ys[0] + 1.6, ek - os * 1.2, ye, rgba(lit ? '#ffffff' : K.frostH, lit ? 0.85 : 0.45), 1.2);
        line(ctx, c[0][0] - c[0][1] + 1, ys[0] + 1.4, c[0][0] + c[0][1] - 1, ys[0] + 1.6, rgba(lit ? K.sil4 : K.sil2, 0.8), 1.4);
      }
      ctx.restore();
    }
    // the skirt over a saddle: a panel falling over each flank (turned, the near flank's panel drapes forward and back along the wolf, the far one is behind it)
    if (mk > 0.02) {
      ctx.save(); ctx.globalAlpha *= mk;
      const X = [6, 24, 48, 62, 56, 38, 22, 10], Z = [-12, 12, 34, 40, 30, 8, -16, -30], Y = [-40, -44, -26, 6, 22, 14, 24, 6];
      for (const b of bodies.slice().sort((a, c) => a.d - c.d)) {
        if (b.d < -0.35) continue;
        const lit = b.lit, px = (xx, zz) => b.lat * fy * xx + fx * zz, pts = [];
        for (let i = 0; i < 8; i++) pts.push(px(X[i], Z[i]), Y[i] + (i === 3 ? Math.sin(t * 1.4 + b.lat) * sw * 2 : i === 6 ? Math.sin(t * 1.7 + b.lat) * sw : 0));
        const gg = ctx.createLinearGradient(0, -44, 0, 24); if (lit) { gg.addColorStop(0, '#e2e9f5'); gg.addColorStop(1, '#9aa7c0'); } else { gg.addColorStop(0, K.blk3); gg.addColorStop(1, K.blk); }
        poly(ctx, pts, gg, EDGE, 1.9);
        for (let k = 0; k < 3; k++) line(ctx, px(12, -4), -38, px(30 + k * 12, 18 - k * 14), 12 + k * 3, rgba(lit ? K.sil4 : K.frost, lit ? 0.4 : 0.14), 1);
        line(ctx, px(8, 0), -42, px(44, 30), -22, rgba(lit ? '#ffffff' : K.frostH, lit ? 0.7 : 0.35), 1.1);
        ctx.beginPath(); ctx.moveTo(px(40, 24), 14); ctx.quadraticCurveTo(px(52, 30), 18, px(57, 36), 21); ctx.strokeStyle = rgba(lit ? K.sil4 : K.sil2, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.restore();
    }
    // the mantle over the shoulders
    mantle(ctx, t, fx, fy, D, lift, back > 0.5, sw);
    const armsAndBlade = () => {
      // the arms: the lit sleeve is her left, the dark one her right; the hands on the haft. The near one last.
      if (!behind) tip = blk();
      if (name === 'buster' && g.A && g.A.has && g.A.p > 0.66 && g.A.p < 1.7) echo(ctx, g, t);
      if (offB !== farB) armOf(offB);
      armOf(mainB);
      // reins: the chain from her off hand to Garrow's collar
      if (mk > 0.5 && g.rein && P.two < 0.5 && g.reinHand) reins(ctx, t, g.reinHand, g.rein, mk);
    };
    if (back) armsAndBlade();
    if (back) {
      const cpAt = y => { const r = clamp((y + 121) / 5, 0, R.n - 1), i = Math.floor(r), j = Math.min(R.n - 1, i + 1); return lerp(R.Cp[2 * i], R.Cp[2 * j], r - i); };
      hairMass(ctx, t, { fx, fy, x0: headX, kb: 14, cxf: y => (y < -100 ? headX : lerp(headX, cpAt(y), clamp((y + 100) / 40, 0, 1))), top: -140 + D, bot: lerp(GY - 6, 0, mk), w0: 15, w1: lerp(26, 32, mk), sw, spr: P.spr, narrow: 1, extra: 5 });
    }
    // the neck and the head
    const hbow = P.bow, hx = headX, hy = HY + D + (hbow > 0 ? hbow * 6 : hbow * 2.4);
    { const nx0 = hx * 0.8, nw = yawW(fx, fy, 0.8), ng = ctx.createLinearGradient(nx0 - 9, 0, nx0 + 9, 0); ng.addColorStop(0, K.skinD); ng.addColorStop(0.45, K.skinS); ng.addColorStop(1, K.skin);
      poly(ctx, [nx0 - 7.4 * nw, -128 + D, nx0 + 7.4 * nw, -128 + D, nx0 + 9.6 * nw, -112 + D, nx0 - 9.6 * nw, -112 + D], ng, EDGE, 1.5);   // (a column with some width to it, flaring to the shoulders)
      line(ctx, nx0 - 2 * nw, -122 + D, nx0 - 4.4 * nw, -113.4 + D, rgba(K.skinD, 0.55), 1); line(ctx, nx0 + 5 * nw, -126 + D, nx0 + 6.6 * nw, -114 + D, rgba('#ffffff', 0.5), 1);
      // the cowl at its foot: a gathered ring of cloth, black on the dark side and silver on the lit side
      const sp = spanOf(fx, fy, 0.58);
      for (const s of [-1, 1]) {
        const k = s < 0 ? sp.wl : sp.wr; if (k < 0.06) continue;
        const lit = (s > 0) === sp.litR;
        ctx.save(); ctx.translate(nx0 + sp.xs * 15.6, 0); ctx.scale(k, 1);
        poly(ctx, [0, -113 + D, s * 13.6, -113.6 + D, s * 15.6, -108.4 + D, s * 8, -105 + D, 0, -106.4 + D], lit ? K.sil : K.blk2, EDGE, 1.5 / Math.max(0.5, k));
        line(ctx, s * 2, -112 + D, s * 13, -112.4 + D, lit ? rgba('#ffffff', 0.85) : rgba(K.frostH, 0.5), 1);
        ctx.restore();
      }
    }
    if (!back) {   // long locks of hair falling over the shoulders and on past the robe to the ground (the far one hides behind her when she is in profile)
      for (const b of bodies.slice().sort((a, c) => a.d - c.d)) {
        if (b.d < -0.55) continue;
        const lf = b.lat * fy, s = b.lat;
        for (let j = 2; j >= 0; j--) {
          const ex = [20, 32, 54][j], ey = [-38, -2, lerp(GY - 2, 18, mk)][j];
          const x1 = (lf * ex * (1 - 0.15 * side) - fx * (4 + j * 4) + fx * Math.abs(fx) * (6 + j * 3)) * (1 + 0.25 * P.spr), y1 = ey + D * 0.1;
          lock(ctx, t, lf * (13 + j * 2) + hx * 0.5 + b.d * 2, hy + 8 + (hbow > 0 ? hbow * 5 : 0), x1, y1, 12.4 - j * 1.6, sw, s + j, lf * [3, 3, 0][j]);
        }
      }
    }
    // the head: a face, then the hair over it
    ctx.save(); ctx.translate(hx, hy); ctx.scale(0.86, 0.86);   // (the head is a little smaller than it was, so that she is eight heads and not six)
    if (back < 0.5) face(ctx, 0, 0, g.hfx, g.hfy, P.eyes, g.crown ? g.crown.red : 0, t, P.lit);
    else ellipse(ctx, 0, 0, 12.4, 15.4, 0, K.skinS, EDGE, 1.6);
    hairCap(ctx, 0, 0, g.hfx, g.hfy, back);
    ctx.restore();
    if (mk > 0.02) { ctx.save(); ctx.globalAlpha *= clamp(mk * 1.6 - 0.3, 0, 1); ctx.translate(hx, hy); ctx.scale(0.96, 0.96); helm(ctx, 0, 0, g.hfx, g.hfy, t, P.eyes, g.crown ? g.crown.red : 0); ctx.restore(); }
    if (!back) armsAndBlade();
    ctx.restore();
    if (tip) trail(ctx, g, t, tip);
    // Totality: the whole of her in a deep red light
    if (name === 'enrage') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, -80, 130, '#7a1620', 0.16 + 0.05 * Math.sin(t * 9));
      for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, GY - 6, 36 + q * 150, (36 + q * 150) * 0.28, 0, 0, TAU); ctx.strokeStyle = rgba('#b3242c', 0.5 * (1 - q)); ctx.lineWidth = 2.6 - q * 1.6; ctx.stroke(); }
      ctx.restore();
    }
    void wfx;
  }
  // a chain hanging from one hand to the other point (figure coordinates): links along a sagging curve
  function reins(ctx, t, a, b, k) {
    const n = 11, sag = 12 + Math.sin(t * 1.8) * 1.4;
    ctx.save(); ctx.globalAlpha *= k;
    const pt = u => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * sag];
    for (let i = 0; i <= n; i++) {
      const u = i / n, [x, y] = pt(u), [x2, y2] = pt(Math.min(1, u + 0.05)), ang = Math.atan2(y2 - y, x2 - x);
      ctx.beginPath(); ctx.ellipse(x, y, 3.6, 2.2, ang + (i % 2 ? Math.PI / 2 : 0), 0, TAU); ctx.strokeStyle = EDGE; ctx.lineWidth = 3.2; ctx.stroke(); ctx.strokeStyle = '#c6d1e0'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- the Wild Hunt
  // Garrow's body is drawn by his own function with a state of ours; the wolf's pose follows hers
  const WOLF = { howl: 'gaHowl', run: 'gaRun', snap: 'gaSnap', scent: 'gaScent', pounce: 'gaPounce', pack: 'gaPack', circle: 'gaCircle', drift: 'gaDrift', enrage: 'gaEnrage', rime: 'gaRime' };
  function wolfState(g, st, t) {
    const w = g.wolf, name = g.name, pr = {}, A = null, tp = t - g.t0;
    w.t = t; w.action = null; w.moving = !!st.moving;
    let want = st.props && typeof st.props.mlWolf === 'string' ? st.props.mlWolf : '';
    if (!want) {
      if (name === 'full' || name === 'eclipse') want = 'howl';
      else if (name === 'enrage') want = 'enrage';
      else if (name === 'ride' || name === 'dash') { want = 'run'; w.moving = true; }
      else if (name === 'death') want = 'drift';
      else if (name === 'intro') want = tp < 1.0 ? 'drift' : '';
      else if ((name === 'buster' || name === 'cut') && st.action && st.action.type === 'attack') want = 'snap';   // (the wolf gathers across the whole cast with her and goes as she strikes: his snap, handed her action, runs on its long form, garrow-art.js)
    }
    if (want === 'snap' && st.action && st.action.type === 'attack') w.action = st.action;
    if (want && WOLF[want]) pr[WOLF[want]] = true;
    w.props = pr;
    void A;
    return w;
  }
  const SEAT = [-11, 0], COLLAR = [27, 12], GS_ = 1.7, RS = 0.88;   // (the rider is drawn a little smaller than she stands, so the wolf shows)
  function mounted(ctx, g, st, angle, t) {
    const w = wolfState(g, st, t);
    // the wolf first (his drawing, in the turned frame)
    const base = ctx.globalAlpha;
    const wolfFade = g.name === 'death' ? 1 : 1;
    ctx.globalAlpha = base * wolfFade;
    if (typeof GA_ART !== 'undefined') GA_ART.body(ctx, w, angle);
    ctx.globalAlpha = base;
    // then her, upright on the screen's axes, at his shoulders
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const sx = (SEAT[0] - 8) * GS_ * ca - SEAT[1] * GS_ * sa, sy = (SEAT[0] - 8) * GS_ * sa + SEAT[1] * GS_ * ca;
    const col = [(COLLAR[0] - 8) * GS_ * ca - COLLAR[1] * GS_ * sa, (COLLAR[0] - 8) * GS_ * sa + COLLAR[1] * GS_ * ca];
    let px = sx, py = sy - 18, hop = 0;
    if (g.name === 'mount') {   // from the ground beside him to his shoulders
      const u = clamp((t - g.t0 - 0.3) / 1.2, 0, 1), e = easeOut(u), sidex = -g.sg * 78;
      px = lerp(sx + sidex, sx, e); py = lerp(sy + 30, sy - 18, e); hop = Math.sin(u * Math.PI) * 44;
    }
    ctx.save(); ctx.rotate(-angle);
    ctx.translate(px, py - hop + 36 * RS); ctx.scale(RS, RS);
    g.rein = [(col[0] - px) / RS, (col[1] - py - 36 * RS + 6) / RS];
    let vis = g.vis, reveal = g.reveal;
    if (vis < 0.995 || reveal < 0.999) ctx.globalAlpha = base * vis;
    if (reveal < 0.999) {
      const yy = -190 + reveal * 260;
      ctx.save(); ctx.beginPath(); ctx.rect(-300, -400, 600, yy + 400); ctx.clip();
      figure(ctx, g, st, t, w);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = base * Math.sin(reveal * Math.PI);
      ctx.fillStyle = rgba(K.frostH, 0.5); ctx.fillRect(-40, yy - 1.2, 80, 2.4); glow(ctx, 0, yy, 56, K.frost, 0.3); ctx.restore();
    } else figure(ctx, g, st, t, w);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------- Maelis
  function body(ctx, st, angle = 0) {
    const g = st.ml || (st.ml = newState());
    const t = st.t || 0;
    update(g, st, angle, t);
    if (g.form === 2) { mounted(ctx, g, st, angle, t); return; }
    ctx.save(); ctx.rotate(-angle);
    const base = ctx.globalAlpha;
    if (g.vis < 0.995 || g.reveal < 0.999) ctx.globalAlpha = base * g.vis;
    if (g.reveal < 0.999) {   // lowering out of the light, from the head down
      const yy = -200 + g.reveal * 270;
      ctx.save(); ctx.beginPath(); ctx.rect(-300, -400, 600, yy + 400); ctx.clip();
      figure(ctx, g, st, t, null);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = base * Math.sin(g.reveal * Math.PI);
      ctx.fillStyle = rgba(K.frostH, 0.5); ctx.fillRect(-40, yy - 1.2, 80, 2.4); glow(ctx, 0, yy, 56, K.frost, 0.3); ctx.restore();
    } else figure(ctx, g, st, t, null);
    ctx.restore();
  }

  return { body, crown, POSES, KEYS, K, PHM, CROWN_R, CROWN_Y };
})();

if (typeof BOSS_ART !== 'undefined') BOSS_ART.maelis = ML_ART.body;
