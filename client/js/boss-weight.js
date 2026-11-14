// Boss weight (cosmetic only: it reads the clock, the cast and the landing, and changes nothing the host does).
//
// Two things make a boss's heavy blow feel heavy:
//  1. a long gather. main.js 'bcast' asks cast() how heavy the move is and stamps the body's action with it (action.w0 = when the cast bar began, action.wk = the
//     weight); draw-util.js windUp / strikeBeats then load the body slowly across the whole bar and hold a beat at full coil, and body() (called from
//     BOSS_VFX.drawBody) lets the whole figure sink, lean back, breathe in and shudder with the strain, feet where they were. The strike itself, and the
//     frame it lands on, are the old ones. castFx() lets the floor and the room's props answer his shifting weight while the bar runs.
//  2. what the blow does to the room. land() (called first thing from BOSS_VFX.impact, which still plays its own landing after it) throws dust and chips along the
//     direction of the blow, runs a low ring of dust along the floor, cracks / dents / scorches the ground where it hit and then lets the room recover (scar():
//     cracks close, ice re-frosts, scorch cools to ash, a dent fills with sand, the water stills), shakes the props near it (kick() / rattle(), called from
//     ArenaView.drawProp: they jolt and then swing back and come to rest) and sheds a little dust from them.
// Everything is drawn on the floor layer (under telegraphs and heroes), nothing is permanent, nothing hides a telegraph, a hero or a mark, no screen shake / flash /
// tint / sound is added, and the particle counts follow the Light / Balanced / Full quality setting (FX.quality) and the bright parts Reduce flashes (FX.flashK).

const BOSS_WEIGHT = (() => {
  const TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const hasFx = () => typeof VFX !== 'undefined' && typeof ARENA !== 'undefined';
  const Q = () => { const q = typeof FX !== 'undefined' ? FX.quality : 'full'; return q === 'light' ? 0.4 : q === 'balanced' ? 0.7 : 1; };
  const FK = () => (typeof FX !== 'undefined' && FX.flashK != null ? FX.flashK : 1);

  // ---------------------------------------------------------------- how heavy each cast is (anim -> weight; a move's own name wins over its anim)
  // 0 / missing: an ordinary cast. ~0.5 a quick duelist's draw, 1 a big body, 1.4 a giant. Only the moves where the body clearly strikes: not spells.
  const CASTS = {
    grubnak: { cleaver: 1.15, raise: 0.8, flop: 1.0, charge: 0.9, throw: 0.6 },
    skitterra: { wrap: 0.8, lunge: 1.0, fang: 0.9 },
    volkar: { fist: 1.4, arm: 1.2, avalanche: 1.1 },
    hollowking: { cleave: 1.15, judgement: 0.9 },
    titan: { slam: 1.4, fist: 1.4 },
    wyrm: { claws: 1.2, tail: 1.2, breath: 0.6 },
    archmage: { lance: 0.45 },
    hydra: { maul: 1.2 },
    corvane: { cut: 0.7, guard: 0.6, draw: 0.6, crane: 0.6 },
    brannoc: { slam: 1.35, heel: 1.15, throw: 0.8, grip: 1.0, unbound: 1.1 },
    morrowoak: { lash: 1.3, cleaver: 1.25, fist: 1.25, wing: 1.1, roots: 0.8 },
    caelum: { crown: 0.8, thrust: 0.7, horizon: 0.8, coil: 0.8, glint: 0.5 },
    sovereign: { brand: 1.0, sweep: 1.0, crescent: 0.8, lance: 0.8 },
  };
  function cast(kind, anim, name, dur) {
    const t = CASTS[kind];
    if (!t || !(dur >= 0.9)) return 0;
    const w = t[name] != null ? t[name] : t[anim];
    return w > 0 ? w : 0;
  }

  // ---------------------------------------------------------------- the rooms: what the floor is made of and what flies up from it
  // floor: how it breaks and how it recovers (tile / rock / stone / dirt: cracks close with dust sifting in; ice: re-frosts; scorch: cools to ash; sand: the
  // dent fills; water: the ripples still). dust: the powder thrown up; chip: broken bits; ink / lip: the crack and its edge; ring: the low wave of dust on the floor;
  // bits: what else is in the air there; mass: his body (the weight of the shift and the dip); bust: how big a tank buster lands (1 = full); land: the other heavy
  // moves, by telegraph tag (0..1, a buster is 1)
  const PROFILE = {
    grubnak: { floor: 'tile', dust: '#9c8a68', chip: '#bfb08c', ink: '#2a1a0c', lip: '#8a7a5a', ring: '#e8dcc0', bits: 'flour', mass: 1.0,
      land: { skewer: 0.55, flop: 0.9, cleaver: 0.8, charge: 0.7, cask: 0.4 } },
    skitterra: { floor: 'rock', dust: '#a898b4', chip: '#50445e', ink: '#120c18', lip: '#5a4a66', ring: '#c4b4d8', bits: 'silk', mass: 0.85,
      land: { fangstrike: 0.7, fang: 0.7, ambush: 0.75 } },
    volkar: { floor: 'rock', dust: '#c0ccdc', chip: '#6a7482', ink: '#0e1420', lip: '#4a5666', ring: '#d4e4f6', bits: 'sparks', mass: 1.4,
      land: { lash: 0.5, lashwide: 0.5, crash: 0.55, gale: 0.6, avalanche: 0.6, armcross: 0.5 } },
    hollowking: { floor: 'stone', dust: '#c2d0c2', chip: '#4e5654', ink: '#0c1210', lip: '#3a4640', ring: '#b0e0c0', bits: 'grave', mass: 1.0,
      land: { erebuke: 0.6, throw: 0.6 } },
    titan: { floor: 'ice', dust: '#e8f2fb', chip: '#bcd6ee', ink: '#1a3050', lip: '#7ab0e0', ring: '#e2f2ff', bits: 'snow', mass: 1.5,
      land: { tislam: 0.9, tifault: 0.8, tisweep: 0.6, tisweep2: 0.5, tigrip: 0.5 } },
    wyrm: { floor: 'scorch', dust: '#7a6a60', chip: '#3a302c', ink: '#140a06', lip: '#5a2a14', ring: '#ffc890', bits: 'embers', mass: 1.4,
      land: { pounce: 0.9, dragonfall: 0.75 } },
    archmage: { floor: 'water', dust: '#a8c0c4', chip: '#50626a', ink: '#0a1418', lip: '#3a5058', ring: '#c4eef0', bits: 'spray', mass: 0.6, bust: 0.45, land: {} },
    hydra: { floor: 'water', dust: '#a8c8b8', chip: '#5a7a6a', ink: '#0c2018', lip: '#4a7a6a', ring: '#d0f0e2', bits: 'spray', mass: 1.2,
      land: { thrash: 0.8, undertow: 0.5, breach: 0.7 } },
    corvane: { floor: 'snow', dust: '#aebdd0', chip: '#cfe0ee', ink: '#1a2840', lip: '#8ab4d8', ring: '#f2f9ff', bits: 'snow', mass: 0.5, bust: 0.85,
      land: { cvDraw: 0.5, cvAnswer2: 0.55, cvComet: 0.5 } },
    brannoc: { floor: 'sand', dust: '#ead6a6', chip: '#b89860', ink: '#4a3418', lip: '#ecd8a8', ring: '#ecd8a8', bits: 'sand', mass: 1.3,
      land: { brLeap: 0.9, brPost: 0.5, brGrip: 0.6 } },
    morrowoak: { floor: 'dirt', dust: '#a8b480', chip: '#5a4a30', ink: '#140e08', lip: '#6a5a3a', ring: '#ccd8a0', bits: 'leaves', mass: 1.4,
      land: { mgRoots: 0.5, mgRod: 0.6 } },
    caelum: { floor: 'rock', dust: '#bcb8cc', chip: '#4e4a62', ink: '#14101e', lip: '#6a6488', ring: '#dedaf4', bits: 'motes', mass: 0.7,
      land: { clThrust: 0.9, clChorusLeap: 0.7 } },
    sovereign: { floor: 'scorch', dust: '#8e7e74', chip: '#403632', ink: '#120a08', lip: '#6a3a1e', ring: '#ffcc98', bits: 'embers', mass: 1.0,
      land: { svWedge: 0.4, svReplay: 0.4, svBite: 0.45 } },
  };
  // (the Tidewrought, Brannoc's second form, stands in the sea: its blows land on water and a broken ring of stone)
  const profileOf = (kind, st) => {
    const p = PROFILE[kind];
    if (kind === 'brannoc' && st && st.props && st.props.titan) return Object.assign({}, p, { floor: 'water', dust: '#cfe6ea', ring: '#dff4f4', bits: 'spray', mass: 2.0 });
    return p;
  };

  // ---------------------------------------------------------------- the body: sink, lean, breath and strain while it gathers; a dip when it lands
  // (q is bodyPose's offset record; the feet / origin stay put: the figure is only squashed toward them, tilted about them and shifted a pixel or two)
  function body(kind, st, q, f) {
    if (!st || !PROFILE[kind] || typeof windUp !== 'function') return;
    const W = windUp(st);
    if (!(W.wk > 0)) return;
    const wk = W.wk, t = st.t; f = f || 0;
    if (W.on) {
      const c = W.coil, hold = W.hold;
      q.sy *= 1 - 0.042 * wk * c; q.sx *= 1 + 0.02 * wk * c;                       // the weight settles down into the legs
      q.rot += -Math.cos(f) * 0.05 * wk * c;                                         // shoulders and head go back, away from the blow
      q.grow *= 1 + 0.012 * wk * c * (0.6 + 0.4 * Math.sin(t * 3.1));                // a slow deep breath in
      if (hold > 0) { const a = hold * Math.min(1, 0.4 + 0.5 * wk); q.ox += Math.sin(t * 47) * 0.55 * a; q.oy += Math.sin(t * 39 + 1) * 0.35 * a; }   // the strain at full coil
    } else if (W.q >= 0 && W.q < 0.8) {
      const d = Math.exp(-W.q / 0.16), r = Math.exp(-W.q / 0.35);
      q.sy *= 1 - 0.05 * wk * d; q.sx *= 1 + 0.03 * wk * d;                          // the dip where it lands, and a settle back up
      q.rot += -Math.cos(f) * -0.03 * wk * r * Math.sin(W.q * 14);
    }
  }

  // ---------------------------------------------------------------- the props answer: a jolt, a hop, then a lean that swings back and comes to rest
  const KICKS = [];
  function kick(x, y, r, k, t) {
    if (!(k > 0.02)) return;
    if (KICKS.length > 12) KICKS.shift();
    KICKS.push({ x, y, r, k, t0: t });
  }
  function rattle(pr, t) {
    if (!KICKS.length) return null;
    let dx = 0, dy = 0, rot = 0, any = false;
    for (let i = KICKS.length - 1; i >= 0; i--) {
      const K = KICKS[i], age = t - K.t0;
      if (age > 2.6) { KICKS.splice(i, 1); continue; }
      if (age < 0) continue;
      const ox = pr.x - K.x, oy = pr.y - K.y, d = Math.hypot(ox, oy);
      if (d > K.r) continue;
      const f = Math.pow(1 - d / K.r, 1.2) * K.k, ux = d > 1 ? ox / d : 0, e1 = Math.exp(-age / 0.26), e2 = Math.exp(-age / 0.85);
      dx += Math.sin(age * 41) * e1 * 7 * f * (ux || 1) * (0.6 + 0.4 * Math.sin(pr.x * 0.13));
      dy += -Math.abs(Math.sin(age * 33)) * e1 * 5 * f;
      rot += (ux >= 0 ? 1 : -1) * Math.sin(age * 9.5) * e2 * 0.1 * f;
      any = true;
    }
    return any ? { dx, dy, rot } : null;
  }
  // a little dust off the props near a blow (a few puffs; they settle back down)
  function shed(props, x, y, r, n, P) {
    if (!props || !hasFx()) return;
    let m = 0;
    for (const pr of props) {
      if (m >= n) break;
      const d = Math.hypot(pr.x - x, pr.y - y); if (d > r || d < 20) continue;
      m++;
      VFX.spawn({ x: pr.x + rand(-6, 6), y: pr.y + 2, z: rand(18, 44), vx: rand(-14, 14), vy: rand(-6, 6), vz: rand(-6, 10), g: 55, drag: 0.04, life: rand(0.8, 1.2), size: rand(10, 15), size1: 24, color: P.dust, kind: 'smoke', add: false, a: 0.3, fadeIn: 0.15, ground: true });
    }
  }

  // ---------------------------------------------------------------- floor pieces
  const clipRoom = c => { c.save(); ARENA.trace(c, 2); c.clip(); };
  // a low ring of dust running out along the floor (drawn on the floor, plain not additive: it never lights anything up). (Drawn with globalAlpha and constant colour
  // strings, like everything here: no strings or arrays are made per frame.)
  function dustRing(x, y, R, color, o = {}) {
    const dur = o.dur ?? 0.6, w = o.w ?? 6, a0 = (o.a ?? 0.34), flat = o.flat ?? 0.78, edge = ARENA.sd(x, y) + R > -4;
    VFX.fx({ dur, layer: 'ground', delay: o.delay, draw: (c, p, t, e) => {
      const q = 1 - (1 - p) * (1 - p), r = R * (0.15 + 0.85 * q), k = e.a * a0 * (1 - p) * (1 - p) * Math.min(1, p / 0.08);
      if (k < 0.01) return;
      if (edge) clipRoom(c);
      c.lineCap = 'round';
      c.strokeStyle = '#14100c'; c.globalAlpha = Math.min(1, k * 0.55); c.lineWidth = w * (1 - 0.5 * p) * 0.8; c.beginPath(); c.ellipse(x, y + 1, r * 0.9, r * 0.9 * flat, 0, 0, TAU); c.stroke();
      c.strokeStyle = color; c.globalAlpha = Math.min(1, k * 1.5); c.lineWidth = w * (1 - 0.6 * p); c.beginPath(); c.ellipse(x, y, r, r * flat, 0, 0, TAU); c.stroke();
      if (edge) c.restore(); else c.globalAlpha = 1;
    } });
  }

  // cracks as flat polylines in world space, grown from the middle outward. Radial for a blow on a spot, along the blow for a cut or a line.
  function makeCracks(x, y, ang, L, line, h, seed) {
    const R = (() => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const out = [];
    const walk = (px, py, a, len, segs, wob) => {
      const pts = [px, py]; for (let i = 0; i < segs; i++) { a += (R() - 0.5) * wob; px += Math.cos(a) * len / segs; py += Math.sin(a) * len / segs * 0.8; pts.push(px, py); } return pts;
    };
    if (line) {
      const main = walk(x, y, ang, L, 7, 0.55); out.push(main);
      const nb = 2 + Math.round(2 * h);
      for (let i = 0; i < nb; i++) { const k = 2 + Math.floor(R() * 4), bx = main[k * 2], by = main[k * 2 + 1]; out.push(walk(bx, by, ang + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.6), L * (0.18 + R() * 0.2), 3, 0.7)); }
    } else {
      const n = 5 + Math.round(3 * h);
      for (let i = 0; i < n; i++) { const a = i / n * TAU + (R() - 0.5) * 0.5, len = L * (0.55 + R() * 0.45); out.push(walk(x + Math.cos(a) * L * 0.08, y + Math.sin(a) * L * 0.08, a, len, 4, 0.8)); }
    }
    return out;
  }
  // the first fraction f of a polyline stroked as it is (a path, no copy made)
  const strokePart = (c, pts, f) => {
    const n = pts.length / 2 - 1, d = f * n, i = Math.floor(d); if (f <= 0) return;
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let j = 1; j <= Math.min(i, n); j++) c.lineTo(pts[j * 2], pts[j * 2 + 1]);
    if (i < n) { const t = d - i; c.lineTo(pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * t, pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * t); }
    c.stroke();
  };
  const strokePartA = (c, pts, f, col, a, w) => { if (a < 0.01) return; c.strokeStyle = col; c.globalAlpha = a > 1 ? 1 : a; c.lineWidth = w; strokePart(c, pts, f); };
  const HEAT = ['#ff5a14', '#e04a12', '#b83a10', '#8a2c0c', '#5a1e0a', '#3a1608'];   // (glowing cracks cooling: one constant per step, no string made per frame)
  // the mark a blow leaves, and the room putting itself back. o: { x, y, ang, len (a line along ang) | r (a spot), h (0..1 weight), P (the room), floor }
  // hold: seconds the mark stays whole; rec: seconds it takes to recover (so it is gone by hold + rec, 2.4 to 4.6 s after the landing)
  function scar(o) {
    if (!hasFx()) return;
    const P = o.P, floor = o.floor || P.floor, h = clamp(o.h, 0.2, 1), line = o.len > 0, x = o.x, y = o.y;
    const L = line ? o.len : o.r, hold = 0.55 + 0.6 * h, rec = (floor === 'water' ? 1.6 : floor === 'scorch' ? 1.5 : 1.3) + 1.0 * h, dur = hold + rec + 0.1;
    const cracks = floor === 'water' ? null : makeCracks(x, y, o.ang, L, line, h, (Math.random() * 1e9) | 0);
    const chips = floor === 'tile' || floor === 'stone' || floor === 'rock' ? Array.from({ length: Math.round(5 * h * Q()) }, () => {
      const c = cracks[Math.floor(Math.random() * cracks.length)], j = Math.floor(Math.random() * (c.length / 2)); return { x: c[j * 2] + rand(-9, 9), y: c[j * 2 + 1] + rand(-6, 6), s: rand(2, 4.2), r: rand(0, 6) }; }) : [];
    const seeds = Array.from({ length: 3 }, () => rand(0, 6));
    let sprinkled = false;
    VFX.fx({ dur, layer: 'ground', tick: (p) => {
      // the dust and the grains sift back into the break as it closes (a few, once the recovery starts)
      if (sprinkled || p * dur < hold || Q() < 0.5 || (floor !== 'sand' && floor !== 'tile' && floor !== 'stone' && floor !== 'rock' && floor !== 'dirt')) return;
      sprinkled = true;
      const n = Math.round(6 * h * Q());
      for (let i = 0; i < n; i++) {
        if (floor === 'sand') { const a = rand(0, TAU), d = rand(0.5, 1) * Math.min(L, 80); VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, z: 2, vx: -Math.cos(a) * d / 1.0, vy: -Math.sin(a) * d * 0.7 / 1.0, life: 0.9, size: rand(3, 5), size1: 1, color: P.dust, kind: 'soft', add: false, a: 0.7, ground: true }); }
        else { const c = cracks[Math.floor(Math.random() * cracks.length)], j = Math.floor(Math.random() * (c.length / 2)); VFX.spawn({ x: c[j * 2] + rand(-4, 4), y: c[j * 2 + 1] + rand(-3, 3), z: rand(6, 14), vx: rand(-6, 6), vz: 0, g: 60, life: 0.8, size: rand(7, 11), size1: 14, color: P.dust, kind: 'smoke', add: false, a: 0.22, fadeIn: 0.2, ground: true }); }
      }
    }, draw: (c, p, t, e) => {
      const rip = sm(t / 0.1), r0 = clamp((t - hold) / rec, 0, 1), rc = sm(r0), k = e.a * Math.min(1, t / 0.05);
      if (k < 0.01) return;
      clipRoom(c);
      c.lineCap = 'round'; c.lineJoin = 'round';
      if (floor === 'water') {            // a swell that spreads and the ripples that still: the water settles
        const amp = (1 - rc) * (1 - rc);
        for (let i = 0; i < 4; i++) {
          const ph = t * 2.2 - i * 0.42; if (ph < 0) continue;
          const R = (22 + ph * 70 + i * 6) * (0.5 + 0.5 * h) * (L > 90 ? L / 90 : 1), a = k * amp * Math.pow(0.62, i) * 0.55 * Math.min(1, ph * 3);
          if (a < 0.01) continue;
          c.strokeStyle = '#10241c'; c.globalAlpha = Math.min(1, a * 0.7); c.lineWidth = 3.2; c.beginPath(); c.ellipse(x, y + 1, R, R * 0.6, 0, 0, TAU); c.stroke();
          c.strokeStyle = P.ring; c.globalAlpha = Math.min(1, a); c.lineWidth = 1.8; c.beginPath(); c.ellipse(x, y, R, R * 0.6, 0, 0, TAU); c.stroke();
        }
      } else if (floor === 'sand') {      // a dent in the sand: a dark pit with a bright rim that fills in from the edges
        const Rd = (line ? 30 : Math.max(34, L * 0.42)) * (0.7 + 0.5 * h), fill = 1 - rc, g = k * 0.5 * fill;
        if (line) {
          strokePartA(c, cracks[0], rip, P.ink, g * 0.7, 15 * fill + 1); strokePartA(c, cracks[0], rip, P.lip, g * 0.6, 5 * fill + 1);
        } else {
          c.fillStyle = P.ink; c.globalAlpha = Math.min(1, g * 0.65); c.beginPath(); c.ellipse(x, y, Rd * rip * fill, Rd * 0.6 * rip * fill, 0, 0, TAU); c.fill();
          c.strokeStyle = P.lip; c.globalAlpha = Math.min(1, g * 1.1); c.lineWidth = 3 * fill; c.beginPath(); c.ellipse(x, y - 1, Rd * 1.08 * rip * fill, Rd * 0.64 * rip * fill, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        }
      } else {
        const keep = 1 - rc;                // how much of the break is still open
        if (floor === 'scorch') {           // a char blot under it, the cracks glowing and cooling to black, then the ash lifting
          const R = (line ? 40 : Math.max(36, L * 0.5)) * (0.7 + 0.5 * h), blot = k * (0.5 - 0.35 * rc);
          c.fillStyle = P.ink; c.globalAlpha = Math.min(1, blot * 0.55); c.beginPath(); c.ellipse(x, y, R * rip, R * 0.62 * rip, 0, 0, TAU); c.fill();
          if (line) strokePartA(c, cracks[0], rip, P.ink, blot, 13 * keep + 1);
        }
        // (the break: an ink slit with a lit lip, drawn out from the middle and narrowing and shortening back as the room recovers)
        const w = 3.4 * (1 - 0.55 * rc), vis = rip * (1 - 0.8 * rc);
        const icy = floor === 'ice' || floor === 'snow', frost = icy ? sm((r0 - 0.05) / 0.7) : 0, frostOut = icy ? 1 - sm((r0 - 0.72) / 0.28) : 1;
        const heat = floor === 'scorch' ? clamp(1 - (t - 0.1) / (hold + rec * 0.65), 0, 1) : 0;
        const a = k * (icy ? 1 - 0.8 * frost : 1) * (0.9 - 0.2 * rc);
        for (let ci = 0; ci < cracks.length; ci++) {
          const pts = cracks[ci];
          strokePartA(c, pts, vis, P.lip, a * 0.55, w + 3.2);
          strokePartA(c, pts, vis, P.ink, a, w);
          if (heat > 0.02) { c.save(); c.globalCompositeOperation = 'lighter'; strokePartA(c, pts, vis, HEAT[Math.min(5, Math.floor((1 - heat) * 6))], k * heat * 0.85 * FK(), w * 0.7); c.restore(); }
          if (frost > 0.02) {                // the crack frosts over: a white rime grows along it and thickens until it hides the break, then melts back into the ice
            strokePartA(c, pts, vis, '#eaf6ff', k * frostOut * 0.9 * frost, w + 1 + 5 * frost);
            strokePartA(c, pts, vis, '#ffffff', k * frostOut * 0.7 * frost, 1.4);
          } else if (rc > 0.02 && floor !== 'scorch') strokePartA(c, pts, vis, P.dust, k * 0.7 * rc, w + 0.5);   // the dust sifts in and the break fills
          else if (floor === 'scorch' && rc > 0.02) strokePartA(c, pts, vis, '#6a625c', k * 0.7 * rc, w + 1);
        }
        for (let ci = 0; ci < chips.length; ci++) {            // broken bits lying by the crack: they sink back in as it closes
          const ch = chips[ci], ca = k * (1 - rc) * rip * 0.9; if (ca < 0.02) continue;
          c.save(); c.translate(ch.x, ch.y); c.rotate(ch.r); c.fillStyle = P.chip; c.strokeStyle = P.ink; c.globalAlpha = Math.min(1, ca); c.lineWidth = 1;
          c.beginPath(); c.moveTo(-ch.s, -ch.s * 0.6); c.lineTo(ch.s * 0.9, -ch.s * 0.4); c.lineTo(ch.s * 0.6, ch.s * 0.7); c.lineTo(-ch.s * 0.8, ch.s * 0.5); c.closePath(); c.fill(); c.stroke(); c.restore();
        }
        // a film of dust over the spot that thins out
        const film = k * 0.16 * Math.sin(Math.min(1, t / (hold + rec)) * Math.PI) * (floor === 'scorch' ? 0.8 : 1);
        if (film > 0.01) { c.fillStyle = P.dust; c.globalAlpha = Math.min(1, film); c.beginPath(); c.ellipse(x, y, (line ? Math.min(L, 220) * 0.5 : L * 0.7), (line ? 34 : L * 0.45), line ? o.ang : 0, 0, TAU); c.fill(); }
      }
      c.restore();
    } });
  }

  // ---------------------------------------------------------------- the landing
  const dirOf = (bd, x, y) => bd ? Math.atan2(y - bd.y, x - bd.x) : 0;
  function dust(P, x, y, dir, spread, h, n, o = {}) {
    n = Math.round(n * Q()); const sp = 0.6 + 0.7 * h;
    for (let i = 0; i < n; i++) {
      const a = spread >= Math.PI ? rand(0, TAU) : dir + (Math.random() + Math.random() - 1) * spread, v = rand(60, 170) * sp * (o.speed ?? 1);
      VFX.spawn({ x: x + Math.cos(a) * rand(0, 14), y: y + Math.sin(a) * rand(0, 10), z: rand(2, 10), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: rand(14, 44), g: 70, drag: 0.07, life: rand(1.0, 1.6),
        size: rand(18, 28) * (0.7 + 0.5 * h), size1: rand(54, 84) * (0.7 + 0.4 * h), color: P.dust, kind: 'smoke', add: false, a: 0.6, fadeIn: 0.08, fadePow: 1.3, ground: true });
    }
  }
  function chipsFly(P, x, y, dir, spread, h, n) {
    n = Math.round(n * Q());
    for (let i = 0; i < n; i++) {
      const a = spread >= Math.PI ? rand(0, TAU) : dir + (Math.random() + Math.random() - 1) * spread, v = rand(110, 280) * (0.7 + 0.5 * h);
      VFX.spawn({ x, y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: rand(90, 220), g: 760, bounce: true, life: rand(0.5, 0.9), size: rand(3, 6) * (0.8 + 0.4 * h), size1: rand(2, 4), color: P.chip, kind: 'shard', add: false, a: 0.95, fadePow: 3, vr: rand(-10, 10), ground: true });
    }
  }
  // what else hangs in the air in that room
  function bits(P, x, y, dir, h) {
    const n = Math.round((3 + 4 * h) * Q()); if (n < 1) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), d = rand(4, 46);
      switch (P.bits) {
        case 'embers': if (FK() > 0.5) VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 6, vx: rand(-20, 20), vz: rand(40, 100), g: 30, life: rand(0.7, 1.2), size: rand(3, 5), size1: 0, color: Math.random() < 0.4 ? '#ffe08a' : '#ff8a2a' }); break;
        case 'snow': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 6, vx: rand(-30, 30), vz: rand(30, 80), g: 40, drag: 0.05, life: rand(0.8, 1.3), size: rand(3, 6), size1: 1, color: '#ffffff', kind: 'star', a: 0.8 * Math.max(FK(), 0.4) }); break;
        case 'sparks': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 6, vx: Math.cos(a) * 160, vy: Math.sin(a) * 100, vz: rand(30, 90), g: 400, life: rand(0.25, 0.4), size: 6, color: '#9ff4ff', stretch: 4, a: 0.8 * Math.max(FK(), 0.4) }); break;
        case 'spray': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 6, vx: Math.cos(a) * 60, vy: Math.sin(a) * 40, vz: rand(120, 220), g: 520, life: rand(0.5, 0.8), size: rand(4, 7), size1: 2, color: P.ring, kind: 'drop', add: false, a: 0.8 }); break;
        case 'leaves': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 14, vx: rand(-40, 40), vz: rand(30, 90), g: 50, drag: 0.04, life: rand(1, 1.6), size: rand(7, 11), color: '#8a7a40', kind: 'leaf', add: false, vr: rand(-4, 4), flutter: 6, a: 0.85 }); break;
        case 'grave': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 8, vx: rand(-10, 10), vz: rand(14, 36), life: rand(1, 1.6), size: rand(5, 9), size1: 2, color: '#8affb0', a: 0.5 * Math.max(FK(), 0.4) }); break;
        case 'motes': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 8, vx: rand(-14, 14), vz: rand(20, 50), life: rand(0.9, 1.4), size: rand(4, 7), size1: 1, color: '#cdbfff', a: 0.6 * Math.max(FK(), 0.4) }); break;
        case 'silk': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 8, vx: rand(-20, 20), vz: rand(20, 50), g: 20, drag: 0.05, life: rand(1, 1.5), size: rand(8, 12), size1: 3, color: '#f4f0ff', kind: 'streak', a: 0.45, rot: rand(0, TAU), add: false }); break;
        case 'flour': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 10, vx: rand(-34, 34), vz: rand(20, 60), g: 30, drag: 0.05, life: rand(0.9, 1.4), size: rand(12, 18), size1: 34, color: '#fbf6ea', kind: 'smoke', add: false, a: 0.42, ground: true }); break;
        case 'sand': VFX.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: 6, vx: Math.cos(dir + rand(-0.8, 0.8)) * 110, vy: Math.sin(dir + rand(-0.8, 0.8)) * 70, vz: rand(40, 110), g: 420, life: rand(0.5, 0.8), size: rand(3, 5), size1: 1, color: P.dust, kind: 'soft', add: false, a: 0.9 }); break;
      }
    }
  }

  // the telegraph's shape tells where it hit and which way the blow went
  function where(tg, ctx) {
    const s = tg.live || tg.shape; if (!s) return null;
    const bd = ctx.bossDraw, bx = bd ? bd.x : s.x, by = bd ? bd.y : s.y;
    if (s.kind === 'circle') {
      if (!(s.r > 0)) return null;
      return { mode: 'spot', x: s.x, y: s.y, r: clamp(s.r, 50, 250), dir: dirOf(bd, s.x, s.y) };
    }
    if (s.kind === 'cone' || s.kind === 'rect') {
      const a = s.angle || 0, ca = Math.cos(a), sa = Math.sin(a), reach = s.kind === 'cone' ? s.r : Math.min(s.len || 600, 620);
      const e = tg.type === 'buster' && tg.target != null && ctx.entById ? ctx.entById(tg.target) : null;
      const hx = e ? e.x : s.x + ca * reach * 0.62, hy = e ? e.y : s.y + sa * reach * 0.62;
      const L = Math.min(reach * 0.62, 300), x0 = s.x + ca * reach * 0.26, y0 = s.y + sa * reach * 0.26;
      return { mode: 'line', x: hx, y: hy, x0, y0, dir: a, len: L, reach: Math.min(reach, 520) };
    }
    return null;
  }
  function land(tg, msg, ctx) {
    try {
      if (!hasFx() || !ctx || !tg) return;
      const kind = ctx.boss, bd = ctx.bossDraw, P = profileOf(kind, bd && bd.st);
      if (!P) return;
      cur = P;
      const h0 = P.land[tg.tag] != null ? P.land[tg.tag] : (tg.type === 'buster' ? 1 : 0), h = tg.type === 'buster' ? h0 * (P.bust ?? 1) : h0;
      if (!(h > 0.1)) return;
      const w = where(tg, ctx); if (!w) return;
      const T = bd && bd.st ? bd.st.t : 0, big = 0.55 + 0.45 * h;
      if (w.mode === 'spot') {
        dust(P, w.x, w.y, w.dir, 0.8, h, 5 + 8 * h, { speed: 1.2 });        // (a plume thrown along the blow, and a low skirt all round)
        dust(P, w.x, w.y, 0, Math.PI, h * 0.7, 3 + 4 * h, { speed: 0.55 });
        chipsFly(P, w.x, w.y, w.dir, 1.0, h, 3 + 5 * h);
        bits(P, w.x, w.y, w.dir, h);
        dustRing(w.x, w.y, clamp(w.r * 1.15, 80, 280) * big, P.ring, { w: 4 + 4 * h, dur: 0.55 + 0.25 * h, a: 0.36 });
        scar({ x: w.x, y: w.y, ang: w.dir, r: Math.max(60, w.r * 0.85), h, P });
        kick(w.x, w.y, 260 + 220 * h, 0.55 + 0.6 * h, T); shed(ctx.props, w.x, w.y, 260 + 220 * h, 2 + Math.round(3 * h), P);
      } else {
        dust(P, w.x, w.y, w.dir, 0.65, h, 7 + 9 * h, { speed: 1.15 });
        chipsFly(P, w.x, w.y, w.dir, 0.55, h, 3 + 5 * h);
        bits(P, w.x, w.y, w.dir, h);
        // the blow along its line: puffs run out along it, quickest first
        const n = Math.round(clamp(w.len / 55, 2, 6) * Q()), ca = Math.cos(w.dir), sa = Math.sin(w.dir);
        for (let i = 1; i <= n; i++) { const d = w.len * i / n, px = w.x0 + ca * d, py = w.y0 + sa * d;
          VFX.fx({ dur: 0.04 * i, layer: 'ground', draw() {}, done: () => dust(P, px, py, w.dir, 0.9, h * 0.7, 2, { speed: 0.7 }) }); }
        dustRing(w.x, w.y, (90 + 90 * h) * big, P.ring, { w: 3.5 + 3.5 * h, dur: 0.5 + 0.2 * h, a: 0.34, delay: 0.02 });
        scar({ x: w.x0, y: w.y0, ang: w.dir, len: w.len + 40, h, P });
        kick(w.x, w.y, 240 + 200 * h, 0.5 + 0.55 * h, T); shed(ctx.props, w.x, w.y, 240 + 200 * h, 2 + Math.round(3 * h), P);
      }
    } catch (e) { /* cosmetic */ }
  }

  // The first landing in a room builds the little sprites its dust and chips are drawn from (VFX caches one per kind and colour): do it while the bar is still
  // running, in invisible particles, so the landing itself costs nothing extra.
  const warmed = new Set();
  function warm(P) {
    const key = P.dust + P.chip + P.bits; if (warmed.has(key)) return; warmed.add(key);
    const w = (kind, color) => VFX.spawn({ x: 0, y: 0, life: 0.02, size: 1, color, kind, add: false, a: 0 });
    for (let i = 0; i < 5; i++) w('smoke', P.dust);
    w('shard', P.chip); w('soft', P.dust);
    const b = { flour: [['smoke', '#fbf6ea']], silk: [['streak', '#f4f0ff']], sparks: [['glow', '#9ff4ff']], snow: [['star', '#ffffff']], spray: [['drop', P.ring]], leaves: [['leaf', '#8a7a40']], grave: [['glow', '#8affb0']], motes: [['glow', '#cdbfff']], embers: [['glow', '#ff8a2a'], ['glow', '#ffe08a']], sand: [['soft', P.dust]] }[P.bits] || [];
    for (const [k, c] of b) w(k, c);
  }

  // ---------------------------------------------------------------- the floor answers his shifting weight while the bar runs
  // A heavy body moves his feet as he loads: dust at his heel, a faint ring, the props near him shiver. Giants shift four times, a duelist plants once.
  function castFx(kind, anim, name, dur, bd) {
    try {
      const wk = cast(kind, anim, name, dur); if (!wk || !hasFx() || !bd) return;
      const P = profileOf(kind, bd.st), full = dur - 0.45 - Math.min(0.5, 0.12 * dur);
      warm(P);
      const at = wk >= 1.1 ? [0.2, 0.42, 0.64, 0.86] : wk >= 0.75 ? [0.38, 0.7] : [0.6];
      const fire = (fr, last) => {
        const t = Math.max(0.1, full * fr);
        VFX.fx({ dur: t, layer: 'ground', draw() {}, done: () => {
          if (!bd || !bd.st) return;
          const f = bd.f || 0, side = (Math.random() < 0.5 ? -1 : 1), fx = bd.x + Math.cos(f) * rand(-6, 14) + Math.cos(f + Math.PI / 2) * side * 26 * Math.min(1.3, wk), fy = bd.y + Math.sin(f) * rand(-6, 14) * 0.7 + Math.sin(f + Math.PI / 2) * side * 20 * Math.min(1.3, wk) + 8;
          const k = (0.45 + 0.35 * wk) * (last ? 1.25 : 1);
          dust(P, fx, fy, f + Math.PI, Math.PI, k * 0.5, 2 + Math.round(3 * k), { speed: 0.5 });
          if (wk >= 0.75) dustRing(fx, fy, 38 + 26 * wk, P.ring, { w: 3, dur: 0.5, a: 0.24 });
          kick(fx, fy, 200 + 140 * wk, 0.16 + 0.13 * wk, bd.st.t);
        } });
      };
      at.forEach((fr, i) => fire(fr, i === at.length - 1));
    } catch (e) { /* cosmetic */ }
  }

  // (the room the last landing was in: boss-vfx.js's floor marks take its dust for the powder that sifts into them as they close)
  let cur = null;
  const dustNow = () => (cur && cur.dust) || '#8a7e70';
  return { cast, castFx, body, land, kick, rattle, scar, dustRing, dustNow, PROFILE, CASTS, profileOf, heal: true, rooms: p => { cur = p; } };
})();
