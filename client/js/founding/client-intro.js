// The Founding: the opening scene, on every tab. A run begins with the founders' wagon and the heroes coming down the North Road
// into the empty valley at dusk, the warmth found where the Hearth will stand, the camp made, the first ashlings stirring far up
// the road, and the Steward's word. About a minute, in engine, on the real map; then control.
//
// The host (sim-intro.js) holds the world still and sends fds.in = [t, total, [voter ids], need]; this file plays the script from t:
//   FoundingIntro.TOTAL / CUTS / CAPTIONS / camAt(t) / nightAt(t) / hero(t, i, n, home) / founders(t) / wagon(t) / ashlings(t) / warm(t)
// are pure (the test walks them); the layer below draws them with the game's own art:
//   - the four founders and the wagon are the map art's own (props.founders / props.carts, set here for the length of the scene),
//   - the heroes are the real hero units, walked by the script (their tracks are replaced every frame; the host never moves them),
//   - dusk is props.night, eased back to the run's own when the scene ends.
// Hero input is locked (clicks and keys are eaten; the host ignores every intent but the vote). Esc, or the small Skip, votes to skip.
// All files LF.

const FoundingIntro = (() => {
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const ST = typeof FOUNDING_STORY !== 'undefined' ? FOUNDING_STORY : require('./story.js').FOUNDING_STORY;
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const TOTAL = FS.INTRO_TOTAL || 58;
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const HEARTH = M.P.hearth;

  // ---------------------------------------------------------------- the beats (seconds)
  const CUT1 = 12.0, CUT2 = 44.0, CUT3 = 49.6;     // the dips to black: the pass -> the road, the camp -> the road head, the road head -> the camp
  const T_STOP = 26.0, DECEL = 1.6, V = 88, S_STOP = 3910;   // the caravan comes to rest at the Hearth's north rim
  const DEFAULT = {   // where the map art stands the founders when nothing says otherwise (map-art.js drawFounder, a run's first minute)
    steward: [3700, 3700, PI, false], smith: [4160, 3834, -1.3, false], digger: [2810, 4080, 0.3, true], warden: [2996, 1970, PI, false],
  };
  const POST = [2652, 1728, -PI / 2, false];        // the Warden at the head of the road, looking up it

  // The words. Each is a founder's own way of saying it, short, no teaching, no digits. The last is the line the run has always opened with.
  const CAPTIONS = [
    { t0: 2.8, t1: 6.8, by: 'warden', text: 'That is all of us over the pass. I counted twice.' },
    { t0: 7.2, t1: 11.2, by: 'smith', text: 'If this road ends soon, I will forgive it everything.' },
    { t0: 14.0, t1: 18.4, by: 'digger', text: 'You can follow where it fell. The grass is still making up its mind.' },
    { t0: 19.0, t1: 23.0, by: 'steward', text: 'The light is going. Keep walking, and keep close.' },
    { t0: 27.4, t1: 31.4, by: 'digger', text: 'Here. The ground is warm. Come and put a hand on it.' },
    { t0: 32.0, t1: 35.6, by: 'smith', text: 'Warm as a forge nobody lit.' },
    { t0: 37.6, t1: 42.6, by: 'warden', text: 'Every one of us accounted for. I will take the first watch, up the road.' },
    { t0: 45.4, t1: 49.2, by: 'warden', text: 'There, past the bend. Did something move?' },
    { t0: 50.8, t1: 56.4, by: 'steward', line: 'start' },
  ];
  for (const c of CAPTIONS) if (c.line) c.text = ST.line(c.line).t;
  const SOUNDS = [[0.4, 'fd-night'], [29.0, 'fd-hero-rise'], [46.6, 'fd-stalker']];
  const TITLE = { name: 'The Founding', sub: 'The first evening in the valley', t0: 1.2, t1: 6.4 };

  // ---------------------------------------------------------------- the road
  const LEN = M.laneLength('north');
  function road(s) {   // [x, y, dirX, dirY] a distance s along the North Road, straight on beyond both ends
    if (s <= 0) { const p = M.along('north', 0); return [p[0] + p[2] * s, p[1] + p[3] * s, p[2], p[3]]; }
    if (s >= LEN) { const p = M.along('north', LEN); return [p[0] - p[2] * 0, p[1] + (s - LEN), 0, 1]; }
    return M.along('north', s);
  }
  const onRoad = (s, lat) => { const r = road(s); return [r[0] - r[3] * lat, r[1] + r[2] * lat, Math.atan2(r[3], r[2])]; };
  const faceTo = (x, y, tx, ty) => Math.atan2(ty - y, tx - x);
  // the caravan's lead: the pass for the first shot, then the last stretch of the road, slowing to a stop at the Hearth
  function lead(t) {
    if (t < CUT1) return -140 + 84 * t;
    const u = T_STOP - t;
    if (u <= 0) return S_STOP;
    return u >= DECEL ? S_STOP - V * DECEL / 2 - V * (u - DECEL) : S_STOP - V * u * u / (2 * DECEL);
  }
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // a walk along waypoints [[t, x, y], ...] (stands before the first and after the last), eased between each pair; the facing is the walk's direction
  function walk(keys, t) {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2], null];
    const last = keys[keys.length - 1];
    if (t >= last[0]) return [last[1], last[2], null];
    let i = 0; while (keys[i + 1][0] < t) i++;
    const a = keys[i], b = keys[i + 1], k = sm((t - a[0]) / (b[0] - a[0]));
    return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), Math.atan2(b[2] - a[2], b[1] - a[1])];
  }

  // ---------------------------------------------------------------- the camera
  function camAt(t) {
    if (t < CUT1) { const p = road(lead(t) - 120), k = t / CUT1; return [p[0] - 20, p[1] + 20, lerp(1.12, 1.24, k)]; }
    if (t < CUT2) {
      const p = road(lead(t) - 70), w = sm((t - 22.5) / 5.5), zB = 1.18;
      let x = lerp(p[0], 3215, w), y = lerp(p[1], 3830, w), z = lerp(zB, 1.2, w);
      if (t > 36) { const d = sm((t - 36) / 7.5); x = lerp(x, 3430, d); y = lerp(y, 3800, d); z = lerp(z, 1.0, d); }
      if (t > 27 && t < 35) z += 0.07 * Math.sin((t - 27) / 8 * PI);   // a breath of a push-in as the warmth is found
      return [x, y, z];
    }
    if (t < CUT3) { const k = sm((t - CUT2) / (CUT3 - CUT2)); return [lerp(2760, 2690, k), lerp(1770, 1520, k), lerp(0.96, 0.9, k)]; }
    if (t < 55) { const k = sm((t - CUT3) / (55 - CUT3)); return [lerp(3450, 3430, k), lerp(3850, 3860, k), lerp(1.08, 1.1, k)]; }
    const k = sm((t - 55) / (TOTAL - 55));
    return [lerp(3430, 3250, k), lerp(3860, 3868, k), lerp(1.1, 0.9, k)];
  }
  // dusk deepening, and the dark at the road head
  const NIGHT = [[0, 0.34], [12, 0.46], [24, 0.6], [36, 0.7], [44, 0.82], [49.6, 0.66], [TOTAL, 0.58]];
  function nightAt(t) {
    if (t <= NIGHT[0][0]) return NIGHT[0][1];
    for (let i = 1; i < NIGHT.length; i++) if (t <= NIGHT[i][0]) return lerp(NIGHT[i - 1][1], NIGHT[i][1], sm((t - NIGHT[i - 1][0]) / (NIGHT[i][0] - NIGHT[i - 1][0])));
    return NIGHT[NIGHT.length - 1][1];
  }
  // 0..1 black: in from black at the start, and the three dips
  const dip = (t, c) => clamp(1 - (Math.abs(t - c) - 0.25) / 0.55, 0, 1);
  const fadeAt = t => Math.max(clamp(1 - t / 1.8, 0, 1), dip(t, CUT1), dip(t, CUT2), dip(t, CUT3));
  const barsAt = t => sm(t / 0.9) * (1 - sm((t - (TOTAL - 1.2)) / 1.2));
  const titleAt = t => sm((t - TITLE.t0) / 1.2) * (1 - sm((t - (TITLE.t1 - 1.4)) / 1.4));
  const captionAt = t => CAPTIONS.find(c => t >= c.t0 && t < c.t1) || null;

  // ---------------------------------------------------------------- the heroes
  // i of n heroes (stable order), with the place the host stood them (home): the road, then the Hearth's rim, then home.
  function hero(t, i, n, home) {
    const lat = (i - (n - 1) / 2) * 46, back = 24 + (i % 2) * 46;
    const rim = onRoad(S_STOP - back, lat);
    const spot = [rim[0], rim[1]];
    if (t < T_STOP + 0.4) { const p = onRoad(lead(t) - back, lat); return [p[0], p[1], p[2]]; }
    if (t < 37) return [spot[0], spot[1], faceTo(spot[0], spot[1], HEARTH[0], HEARTH[1])];
    // home, round whichever side of the ring is nearer
    const side = home.x < HEARTH[0] ? -1 : 1, way = [HEARTH[0] + side * 150, HEARTH[1] - 20];
    const k = sm((t - 37) / 6.5);
    if (k >= 1) return [home.x, home.y, -PI / 2];
    const a = k < 0.5 ? lerp2(spot, way, k * 2) : lerp2(way, [home.x, home.y], (k - 0.5) * 2);
    const b = k < 0.5 ? way : [home.x, home.y];
    return [a[0], a[1], faceTo(a[0], a[1], b[0], b[1])];
  }

  // ---------------------------------------------------------------- the founders and the wagon
  const WAGON_BACK = 190, SHAFT = 88;
  function wagon(t) {
    if (t >= CUT2) return null;
    const p = onRoad(lead(t) - WAGON_BACK, 0);
    return { x: p[0], y: p[1], a: p[2] };
  }
  function founders(t) {
    const o = {};
    if (t >= CUT2) {   // after the dip: the road head, and everyone else where the map art keeps them
      for (const id of Object.keys(DEFAULT)) o[id] = DEFAULT[id].slice();
      o.warden = POST.slice();
      return o;
    }
    const l = lead(t), w = onRoad(l - WAGON_BACK, 0), fx = Math.cos(w[2]), fy = Math.sin(w[2]);
    const pull = lat => [w[0] + fx * SHAFT - fy * lat, w[1] + fy * SHAFT + fx * lat, w[2]];
    // the Steward at the head of them
    { const road0 = onRoad(l + 40, 10);
      const k = walk([[37.5, road0[0], road0[1]], [43.4, DEFAULT.steward[0], DEFAULT.steward[1]]], t);
      const atRoad = t < 37.5; const x = atRoad ? road0[0] : k[0], y = atRoad ? road0[1] : k[1];
      o.steward = [x, y, t < T_STOP ? road0[2] : t < 37.5 ? faceTo(x, y, HEARTH[0], HEARTH[1]) : (t >= 43.4 ? DEFAULT.steward[2] : k[2]), false]; }
    // the Smith and the Digger at the shafts, then the Smith to the rim, then to his forge; the Digger to the ground, then to his spring
    { const s0 = pull(-14), d0 = pull(14);
      const sk = walk([[31.2, s0[0], s0[1]], [33.6, 3342, 3846], [36.0, 3342, 3846], [43.5, DEFAULT.smith[0], DEFAULT.smith[1]]], t);
      const dk = walk([[26.8, d0[0], d0[1]], [29.0, 3112, 3822], [36.2, 3112, 3822], [43.5, DEFAULT.digger[0], DEFAULT.digger[1]]], t);
      o.smith = t < 31.2 ? [s0[0], s0[1], s0[2], false] : [sk[0], sk[1], sk[2] == null ? faceTo(sk[0], sk[1], HEARTH[0], HEARTH[1]) : sk[2], false];
      if (t >= 43.5) o.smith[2] = DEFAULT.smith[2];
      o.digger = t < 26.8 ? [d0[0], d0[1], d0[2], false] : [dk[0], dk[1], dk[2] == null ? faceTo(dk[0], dk[1], HEARTH[0], HEARTH[1]) : dk[2], t >= 29.2 && t < 36.2];
      if (t >= 43.5) { o.digger[2] = DEFAULT.digger[2]; o.digger[3] = DEFAULT.digger[3]; } }
    // the Warden last in line, then in among them counting, then off up the road
    { const w0 = onRoad(l - WAGON_BACK - 150, 26);
      const k = walk([[27.2, w0[0], w0[1]], [32.5, 3296, 3730], [38.6, 3296, 3730], [41.0, 3200, 3560], [43.9, 3200, 3290]], t);
      const idle = t >= 32.5 && t < 38.6;
      o.warden = t < 27.2 ? [w0[0], w0[1], w0[2], false] : [k[0], k[1], k[2] == null ? faceTo(k[0], k[1], HEARTH[0], HEARTH[1]) : k[2], false];
      if (idle) o.warden[2] = faceTo(3296, 3730, HEARTH[0], HEARTH[1]); }
    return o;
  }
  // where the Hearth's warmth shows: 0..1
  const warm = t => (t < 26.4 ? 0 : t < 30.4 ? sm((t - 26.4) / 4) : t < 37 ? 1 : lerp(1, 0.35, sm((t - 37) / 5)));

  // ---------------------------------------------------------------- the first ashlings, far up the road
  const ASH = [[1290, 18, 0], [1372, -34, 0.22], [1456, 26, 0.5], [1548, -20, 0.8], [1628, 40, 1.1]];   // road distance, sideways, delay
  function ashlings(t) {
    if (t < CUT2) return [];
    return ASH.map(([s, lat, dl], i) => {
      const t0 = 46.0 + dl, k = sm((t - t0) / 1.4), creep = Math.max(0, t - t0) * 7;
      const p = onRoad(s + creep, lat);
      return { x: p[0], y: p[1], a: p[2] + (i % 2 ? 0.2 : -0.15), k, eye: clamp((t - t0 + 0.3) / 0.9, 0, 1) * (0.75 + 0.25 * Math.sin(t * 5 + i * 2)) };
    });
  }

  return { TOTAL, CUTS: [CUT1, CUT2, CUT3], T_STOP, CAPTIONS, SOUNDS, TITLE, DEFAULT, POST, camAt, nightAt, fadeAt, barsAt, titleAt, captionAt, hero, wagon, founders, warm, ashlings, road, lead };
})();

// ================================================================ the layer
if (typeof Founding !== 'undefined' && Founding.addLayer) (() => {
  const SC = FoundingIntro, PI = Math.PI;
  let K = null, styled = false;
  const st = () => (K && K.S ? (K.S.__intro || (K.S.__intro = { on: false, t: 0, target: 0, targetAt: 0, total: SC.TOTAL, votes: [], need: 1, home: {}, mine: false, cap: -1, snd: 0, post: null, orig: null, origFor: null, saidStart: false, fogWas: false, els: null, emberT: 0 })) : null);
  const myId = () => K.S.myId;

  function css() {
    if (styled || typeof document === 'undefined') return; styled = true;
    const s = document.createElement('style'); s.id = 'fd-intro-css';
    s.textContent = `
#fd-root.fd-intro > :not(.fd-in) { visibility: hidden !important; pointer-events: none !important; }
#fd-root.fd-intro-out > :not(.fd-in) { animation: fdInHud 1.4s ease both; }
@keyframes fdInHud { from { opacity: 0; } to { opacity: 1; } }
.fd-in { position: absolute; pointer-events: none; }
#fd-in-fade { inset: 0; background: #070504; opacity: 1; z-index: 1; }
#fd-in-top, #fd-in-bot { left: 0; right: 0; height: 11.5vh; min-height: 56px; background: #050403; z-index: 2; }
#fd-in-top { top: 0; transform-origin: top; } #fd-in-bot { bottom: 0; transform-origin: bottom; }
#fd-in-title { left: 0; right: 0; top: 30%; text-align: center; z-index: 3; opacity: 0; }
#fd-in-title b { display: block; font: 600 22px Cinzel, Georgia, serif; letter-spacing: .42em; text-transform: uppercase; color: #e6c98a; text-shadow: 0 2px 14px #000; padding-left: .42em; }
#fd-in-title span { display: block; margin-top: 8px; font: italic 13.5px Georgia, serif; letter-spacing: .06em; color: #cfc4aa; text-shadow: 0 1px 8px #000; }
#fd-in-cap { left: 50%; bottom: calc(11.5vh + 26px); transform: translate(-50%, 6px); max-width: min(600px, 88vw); padding: 7px 18px 9px; text-align: center; background: #15120fe0; border: 1px solid #5a4630; border-radius: 3px; box-shadow: 0 6px 18px #000a; opacity: 0; transition: opacity .45s, transform .45s; z-index: 4; }
#fd-in-cap.on { opacity: 1; transform: translate(-50%, 0); }
#fd-in-cap b { display: block; font: 700 10px Cinzel, Georgia, serif; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 2px; }
#fd-in-cap span { display: block; font: italic 14px/1.45 Georgia, serif; color: #eadfc4; }
#fd-in-skip { right: 22px; bottom: calc(5.75vh - 13px); display: flex; align-items: center; gap: 10px; z-index: 5; pointer-events: auto; font: 11px system-ui, sans-serif; color: #8d8068; }
#fd-in-skip em { font-style: normal; letter-spacing: .04em; color: #a89c80; }
#fd-in-skip i { font-style: normal; padding: 1px 6px; border: 1px solid #4a3c2a; border-radius: 3px; color: #a89c80; letter-spacing: .06em; font-size: 10px; }
#fd-in-skip button { background: none; color: #d9b56a; border: 1px solid #6a5232; border-radius: 3px; padding: 4px 14px; font: 600 11px Cinzel, Georgia, serif; letter-spacing: .18em; text-transform: uppercase; cursor: pointer; }
#fd-in-skip button:hover { background: #2a2018; border-color: #a8864a; color: #f0d68c; }
#fd-in-skip button.on { background: #3a2c18; border-color: #c9a45c; color: #f0d68c; }`;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- the dom
  function build(T) {
    const root = document.getElementById('fd-root'); if (!root) return false;
    css();
    if (T.els && T.els.fade.parentNode === root) return true;
    const mk = (id, cls, html) => { const d = document.createElement('div'); d.id = id; d.className = 'fd-in' + (cls ? ' ' + cls : ''); if (html) d.innerHTML = html; root.appendChild(d); return d; };
    T.els = {
      root,
      fade: mk('fd-in-fade'), top: mk('fd-in-top'), bot: mk('fd-in-bot'),
      title: mk('fd-in-title', '', `<b>${SC.TITLE.name}</b><span>${SC.TITLE.sub}</span>`),
      cap: mk('fd-in-cap', '', '<b></b><span></span>'),
      skip: mk('fd-in-skip', '', '<em></em><i>Esc</i><button type="button">Skip</button>'),
    };
    const btn = T.els.skip.querySelector('button');
    btn.addEventListener('mousedown', e => e.stopPropagation());
    btn.addEventListener('click', () => vote());
    T.els.skip.addEventListener('contextmenu', e => e.preventDefault());
    return true;
  }
  function unbuild(T) {
    if (!T.els) return;
    for (const k of ['fade', 'top', 'bot', 'title', 'cap', 'skip']) if (T.els[k] && T.els[k].parentNode) T.els[k].parentNode.removeChild(T.els[k]);
    T.els = null;
  }
  const voted = T => T.votes.indexOf(myId()) >= 0;
  function vote() {
    const T = st(); if (!T || !T.on) return;
    T.mineAt = K.S.T;
    K.send(voted(T) ? { k: 'skipIntro', off: 1 } : { k: 'skipIntro' });
    T.mine = !voted(T);   // (shown at once; the next snapshot says the same)
  }
  function paintDom(T, t) {
    const e = T.els; if (!e) return;
    e.fade.style.opacity = SC.fadeAt(t).toFixed(3);
    const b = SC.barsAt(t); e.top.style.transform = `scaleY(${b.toFixed(3)})`; e.bot.style.transform = `scaleY(${b.toFixed(3)})`;
    e.title.style.opacity = SC.titleAt(t).toFixed(3);
    const c = SC.captionAt(t), idx = c ? SC.CAPTIONS.indexOf(c) : -1;
    if (idx !== T.cap) {
      T.cap = idx;
      if (c) { const f = FOUNDING_STORY.FOUNDERS[c.by]; e.cap.querySelector('b').style.color = f.col; e.cap.querySelector('b').textContent = f.name; e.cap.querySelector('span').textContent = c.text; e.cap.classList.add('on'); if (c.line === 'start') T.saidStart = true; }
      else e.cap.classList.remove('on');
    }
    const n = Math.max(1, (K.S.players || []).length), v = T.votes.length, mine = T.votes.indexOf(myId()) >= 0 || T.mine;
    const em = e.skip.querySelector('em'), btn = e.skip.querySelector('button');
    em.textContent = n > 1 && v > 0 ? `${v} / ${n} want to skip` : '';
    btn.classList.toggle('on', mine);
    e.skip.setAttribute('data-tip', n > 1 ? 'Skip the opening. Most of the party must agree; the host can skip it for everyone. Press again to take your vote back.' : 'Skip the opening.');
    e.skip.style.opacity = (0.35 + 0.65 * SC.barsAt(t)).toFixed(2);
  }

  // ---------------------------------------------------------------- the run's own state, borrowed for the scene
  function applyProps(T, t) {
    const P = K.S.props; if (!P) return;
    if (T.origFor !== P) { T.origFor = P; T.orig = { night: P.night, founders: P.founders, carts: P.carts }; }
    P.night = SC.nightAt(t);
    const f = SC.founders(t); P.founders = f;
    const w = SC.wagon(t); P.carts = w ? [{ x: Math.round(w.x), y: Math.round(w.y), a: w.a }] : [];
  }
  function restoreProps(T) {
    const P = K.S.props; if (!P || T.origFor !== P || !T.orig) return;
    if (T.orig.founders === undefined) delete P.founders; else P.founders = T.orig.founders;
    if (T.orig.carts === undefined) delete P.carts; else P.carts = T.orig.carts;
  }
  function walkHeroes(T, t) {
    const hs = []; for (const u of K.S.units.values()) if (u.kind === 'h') hs.push(u);
    hs.sort((a, b) => (String(a.id) < String(b.id) ? -1 : 1));
    hs.forEach((u, i) => {
      const home = T.home[u.key] || (T.home[u.key] = { x: u.x, y: u.y });
      const p = SC.hero(t, i, hs.length, home);
      u.tr.s = [{ t: -1e9, x: p[0], y: p[1], a: p[2] }]; u.fo = null;
    });
  }

  // ---------------------------------------------------------------- begin and end
  function begin(T, m) {
    T.on = true; T.t = m[0]; T.target = m[0]; T.targetAt = K.S.T; T.cap = -1; T.snd = 0; T.saidStart = false; T.mine = false;
    T.fogWas = !!K.S.noFog; K.S.noFog = true;                      // no fog for the film (and the enemies are not drawn: drawEnemy below)
    const cam = K.S.cam; cam.free = true;
    // the trials layer speaks the Steward's line when the run starts: here the Steward says it in his own beat
    const tr = K.S.__trials || (K.S.__trials = { queue: [], cur: null, t: 0, heardPart: -1, heardStart: 0, chipSig: '', pgN: -1 });
    tr.heardStart = 1;
    const root = document.getElementById('fd-root'); if (root) { root.classList.remove('fd-intro-out'); root.classList.add('fd-intro'); }
    build(T);
  }
  function finish(T, skipped) {
    if (!T.on) return;
    T.on = false;
    K.S.noFog = T.fogWas;
    const cam = K.S.cam; cam.free = false; cam.tz = 0.9;
    restoreProps(T);
    // who played the host's clock while the world stood still: a fresh one, as at the start of a run, so nothing lags
    try { if (typeof SendClock !== 'undefined') K.S.clock = new SendClock(); } catch (e) { /* the clock is a nicety */ }
    for (const u of K.S.units.values()) if (u.kind === 'h') { const h = T.home[u.key]; if (h) u.tr.s = [{ t: -1e9, x: h.x, y: h.y, a: -Math.PI / 2 }]; u.tr.settle(); }
    // skipped before the Steward spoke: the line is still his to say
    if (!T.saidStart) { const tr = K.S.__trials; const l = FOUNDING_STORY.line('start'); if (tr && Array.isArray(tr.queue) && l) tr.queue.push(l); }
    const root = document.getElementById('fd-root'); if (root) { root.classList.remove('fd-intro'); root.classList.add('fd-intro-out'); setTimeout(() => root.classList.remove('fd-intro-out'), 1500); }
    unbuild(T);
    T.post = { t: 0, from: SC.nightAt(Math.min(T.t, SC.TOTAL)) };   // dusk eases back to the run's light
  }

  function update(dt) {
    const S = K && K.S, T = st(); if (!S || !T) return;
    if (T.post) {   // the evening lifts into the run's own light
      T.post.t += dt; const P = S.props, k = Math.min(1, T.post.t / 6);
      if (P) { if (T.origFor !== P) { T.origFor = P; T.orig = { night: P.night, founders: P.founders, carts: P.carts }; } const to = +T.orig.night || 0; P.night = k >= 1 ? T.orig.night : T.post.from + (to - T.post.from) * k * k * (3 - 2 * k); }
      if (k >= 1) T.post = null;
    }
    if (!T.on) return;
    // the scene's clock follows the host's, gently
    T.t += dt;
    const want = T.target + (S.T - T.targetAt);
    T.t += (want - T.t) * Math.min(1, dt * 2.5); if (Math.abs(want - T.t) > 0.5) T.t = want;
    T.t = Math.min(T.t, SC.TOTAL);
    const t = T.t;
    // the picture
    const cam = S.cam, c = SC.camAt(t);
    cam.free = true; cam.x = c[0]; cam.y = c[1]; cam.zoom = cam.tz = c[2];
    applyProps(T, t); walkHeroes(T, t);
    if (!T.els || !T.els.fade.parentNode) build(T);
    paintDom(T, t);
    // sounds, once each
    while (T.snd < SC.SOUNDS.length && SC.SOUNDS[T.snd][0] <= t) { K.snd(SC.SOUNDS[T.snd][1]); T.snd++; }
    // the warmth at the Hearth: embers rising from the ring
    const w = SC.warm(t);
    if (w > 0.05 && SC.CUTS[1] > t) {
      T.emberT -= dt;
      while (T.emberT <= 0) {
        T.emberT += 0.09 / (0.3 + w);
        const a = Math.random() * K.TAU, r = 70 + Math.random() * 40;
        K.burst(K.M.P.hearth[0] + Math.cos(a) * r, K.M.P.hearth[1] + Math.sin(a) * r * 0.9, 1, { color: Math.random() < 0.5 ? '#ffb048' : '#ffd98a', spd: 14, dur: 2.3, size: 2.1, kind: 'dot', vy: -26, g: -14 });
      }
    }
  }

  // ---------------------------------------------------------------- drawing (world coordinates)
  function drawAshling(c, a, t) {
    const k = a.k, e = K;
    c.save(); c.translate(a.x, a.y); c.rotate(a.a); c.scale(1.5, 1.5 * (0.7 + 0.3 * k));
    e.ell(c, -5, 0, 8, 8, 0, '#34211a', '#120907', 1.5);
    e.ell(c, 0, 0, 11, 10.5, 0, '#43291f', '#120907', 1.6);
    c.strokeStyle = `rgba(255,138,42,${0.35 + 0.6 * a.eye})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -3); c.lineTo(-3, -1); c.lineTo(-6, 3); c.moveTo(-2, 5); c.lineTo(2, 3); c.stroke();
    c.fillStyle = '#b8a984'; c.beginPath(); c.moveTo(6, -8); c.lineTo(13, -12); c.lineTo(10, -5); c.fill(); c.beginPath(); c.moveTo(6, 8); c.lineTo(13, 12); c.lineTo(10, 5); c.fill();
    c.restore();
  }
  Founding.addLayer({
    init(kit) {
      K = kit;
      // Esc votes to skip (before anything else sees it)
      window.addEventListener('keydown', e => {
        const T = K && K.S ? K.S.__intro : null; if (!T || !T.on || e.key !== 'Escape') return;
        e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) vote();
      }, true);
    },
    snap(m) {
      const T = st(); if (!T) return;
      if (m.in) {
        T.target = m.in[0]; T.targetAt = K.S.T; T.total = m.in[1]; T.votes = m.in[2] || []; T.need = m.in[3];
        if (T.votes.indexOf(myId()) >= 0) T.mine = true; else if (T.mine && K.S.T - (T.mineAt || 0) > 1) T.mine = false;
        if (!T.on && !T.ended) begin(T, m.in);
      } else if (T.on) finish(T, false);
    },
    event(ev) {
      if (ev[0] !== 'in') return false;
      const T = st(); if (!T) return true;
      if (ev[1] === 'end') { T.ended = true; finish(T, !!ev[2]); }
      return true;
    },
    update,
    ground() {},
    units(L, inV) {
      const T = st(); if (!T || !T.on) return;
      const t = T.t, ash = SC.ashlings(t);
      for (const a of ash) if (inV(a.x, a.y)) L.push([a.y, 9, { draw: c => drawAshling(c, a, t) }]);
      const w = SC.wagon(t);
      if (w && inV(w.x, w.y)) {   // a lantern hung at the back of the wagon
        const bx = w.x - Math.cos(w.a) * 46 - Math.sin(w.a) * 20, by = w.y - Math.sin(w.a) * 46 + Math.cos(w.a) * 20;
        L.push([w.y + 24, 9, { draw: c => { c.save(); K.glowAt(c, bx, by - 8, 26, '255,190,90', 0.8 + 0.12 * Math.sin(t * 9)); K.ell(c, bx, by - 8, 2.6, 3.4, 0, '#ffd98a', '#3a2a14', 1); c.restore(); } }]);
      }
    },
    top(c) {
      const T = st(); if (!T || !T.on) return;
      const t = T.t, hx = K.M.P.hearth[0], hy = K.M.P.hearth[1], w = SC.warm(t);
      if (w > 0.02 && t < SC.CUTS[1]) {   // the warmth: a slow breath over the ring
        const br = 0.85 + 0.15 * Math.sin(t * 2.2);
        K.glowAt(c, hx, hy, 200 + 40 * w, '255,150,60', 0.3 * w * br);
        K.glowAt(c, hx, hy, 110, '255,205,130', 0.2 * w * br);
      }
      for (const a of SC.ashlings(t)) {
        if (a.eye < 0.02) continue;
        const ex = Math.cos(a.a + PI / 2) * 5, ey = Math.sin(a.a + PI / 2) * 5, fx = Math.cos(a.a) * 12, fy = Math.sin(a.a) * 12;
        for (const s of [-1, 1]) { K.glowAt(c, a.x + fx + ex * s, a.y + fy + ey * s, 13, '255,176,64', a.eye); K.ell(c, a.x + fx + ex * s, a.y + fy + ey * s, 2, 2, 0, `rgba(255,226,140,${a.eye})`); }
        K.glowAt(c, a.x, a.y, 34, '255,110,30', 0.28 * a.eye);
      }
    },
    lights(add) {
      const T = st(); if (!T || !T.on) return;
      const t = T.t, w = SC.wagon(t);
      if (w) add(w.x - Math.cos(w.a) * 46 - Math.sin(w.a) * 20, w.y - Math.sin(w.a) * 46 + Math.cos(w.a) * 20, 150, 0.7);
      const wm = SC.warm(t); if (wm > 0.05 && t < SC.CUTS[1]) add(K.M.P.hearth[0], K.M.P.hearth[1], 300 + 60 * wm, 0.5 * wm);
      for (const a of SC.ashlings(t)) if (a.eye > 0.05) add(a.x, a.y, 70, 0.55 * a.eye);
      if (t >= SC.CUTS[1] && t < SC.CUTS[2]) { const wd = SC.founders(t).warden; add(wd[0], wd[1], 130, 0.6); }   // (the Warden's lantern, at the head of the road)
    },
    drawEnemy() { const T = st(); return !!(T && T.on); },   // (nothing else lives in the valley during the scene)
    click() { const T = st(); return !!(T && T.on); },
    key(act, ev) { const T = st(); if (!T || !T.on) return false; return !/^F\d+$/.test(ev.key || ''); },
  });
  })();
if (typeof module !== 'undefined') module.exports = { FoundingIntro };
