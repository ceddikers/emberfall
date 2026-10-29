// The Cinder Sovereign (the Ultimate): the ground effects of its moves and of the echoes' answers, drawn in code (Act I).
// Contract: docs/plans/2026-10-ultimate-build.md ("Built (FX1)", "Built (FX2)"). Echoes themselves are ult-echo.js; the Sovereign's body is sovereign-art.js.
// What is here (look: the painted VFX sheets: a small wind-up glyph, a bold shape with a hot white-yellow core, a saturated mid colour and dark
// ink edges, then a slow aftermath of smoke, embers and scorch):
//   the descent     (roomev svact 1)   seams glowing under the party as the halo lights, ash and cinder glimpses drifting up past the rim
//   Kindling        (tag svKindling)   a wind-up glyph, then a ring of flame bursting out from the Sovereign and a scorched floor
//   Brand           (tag svBrand)      the blade's heat gathering on the tank, a sear slash, and a brand glyph (floor and chest) that fades with the burn
//   Ashen Sweep     (tag svSweep)      the blade's edge heating, a molten crescent racing across the half, a burning slash left on the floor
//   Cupped Ember    (tag svEmber)      the ember cupped in the hand, thrown in an arc, landing as a blue flame column
//   Scatter         (tag svScatter)    sparks on each circle's edge, then bursting off every hero
//   Halo Turn       (roomev svturn:n)  lighthouse beams from the lit sigils sweeping round, locking onto the lines, then firing
//   Flambe Service  (svflambe:n, tags svPlate svFlambe svMince)   four cloches with gold rims filling in order, lids lifting, the flambe racing plate to plate
//                                      as blue-tipped flame, the Mince cleaver's glint and slam
//   Burning Web     (svweb:n, svfuse:n, svshadow:n)   fire threads wall to wall with glowing knots, a broken knot's thread burning out like a fuse,
//                                      a whole thread going up with her shadow racing along it
//   Glass Floor     (svglass:n, svsheets)   the wave's sheets as red-hot glass (the next ring in full), a crack front, each sheet shattering into glittering shards, then black boiling water
//   Heads of Flame  (svhead:k, svbite:n, svcut:k, tag svBite)   a floor sigil burning in, a fire serpent rising into the real head, an ember flicker, the bite's lunge and fan of fire, the stump's fire pool
//   Cinder Dive     (tags svDiveLand svDivePath svAfter svSteam, svdive:n)   the spot glowing, embers igniting down the line, the comet with wings of flame, the slam, the Aftershock ring, steam columns
//   Twin Brands     (svtwin:n, tags svMeet svBloom svTwin)   each bearer's brand as the wall's element glyph, the lit wall glowing along its rim in that element, a thread between the bearers,
//                                      the blue blaze of a meet, the red bloom and burning circles of a flee, the lit wall's light jumping across the room on the shifted cast
//   The Heart Remembers (svheart, svpillar:n, svseal)   a heartbeat vignette on the sound's grid, the Sovereign sealed in a bell of glass and embers, a pillar of fire and a crack out of the
//                                      floor from each stump, the held breath (our clock stops), the seal shattering (shards low and fast, a white-gold ring across the floor)
//   Rebirth         (svrebirth, tag svRebirth)   the blade driven in, the room's fire spiralling into it, the dark (party and halo lit), the halo opening to the rim as blades of light in slow motion,
//                                      the sky splitting over the crater, the choir's tolls, the gathering cast, the raidwide's toll
//   Corvane's stance (svechoact on his echo)   a cold-blue gleam along his blade answered by an ember gleam on the Sovereign's, falling into step
//   Crescent, Lance, Pyre (svcrescent:n svlance:n svpyre:n)   two crossing fans of flame, then turned; blade-thin streaks that leave a burning line and a cracked impact at the wall;
//                                      numbered burning marks and blink-cuts from both ends
//   The Sovereign's Dance (svdance:n)   silver-and-ember numbered afterimages, burning slashes that hang in the air and fall as embers, Caelum's cuts silver-white
//   Sunwheel of Embers (svwheel:n, svwallout:n, tag svCatch)   a bronze wheel with a blazing rim rolling its path and clanging at each bounce, the walls of fire (the svWall zones are
//                                      drawn here; the default zone wash is kept off them), the blue catch ring and flash, every wall snuffed into smoke on a catch, burning down on a miss
// Layers (all hooked in from this file; no other file changes): everything that lies on the floor is drawn UNDER the telegraph fills (ArenaView.drawTelegraphs is
// wrapped: ours first, then theirs, so the red and blue outlines and their rims are always on top); only brief impacts are drawn OVER (ArenaView.drawRoomOver,
// ours last). Safe ground is never painted, and nothing flashes the screen: every light is local. Everything is a pure function of the clients' clock and of
// the events and telegraphs (a telegraph is remembered from the moment it is first seen, so its landing still plays after the telegraph is gone).
// Preview: tools/preview/sovereign-fx.html, or window.__svFxPreview(canvas, effect, t, opts).

const SV_FX = (() => {
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const sm = q => q * q * (3 - 2 * q);
  const ei = q => q * q;
  const eo3 = q => 1 - Math.pow(1 - q, 3);
  const c01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const K = {
    ink: '#0c0503', char: '#241008', dark: '#4a1608', red: '#c23a12', ember: '#ff7a22', amber: '#ffa83a', gold: '#ffd05a', hot: '#fff2b0', white: '#fffdf0',
    ash: '#b9ac9a', smoke: '#1e1310', blue: '#3a86ff', blueMid: '#5db0ff', blueHi: '#b8e2ff', blueDk: '#0e2a70',
  };
  const FIRE = [K.red, K.ember, K.hot], BLUE = [K.blueDk, K.blueMid, K.blueHi];
  const RR = () => (typeof ARENA !== 'undefined' && ARENA.r) || 520;
  // Low effects: the game has no setting for it yet, so this reads Save.setting('lowFx') when one is added (and the system's reduced-motion setting, as hud.js
  // does). Low drops the crowds (ash, embers, rings of tongues, motes) to about a third and keeps every shape, so each move still reads the same.
  let LOW = false;
  const CALM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const readLow = () => { try { return !!((typeof Save !== 'undefined' && Save.setting && Save.setting('lowFx', false)) || (CALM && CALM.matches)); } catch (e) { return false; } };
  const cnt = n => (LOW ? Math.max(1, Math.ceil(n * 0.4)) : n);
  const stp = () => (LOW ? 2 : 1);
  const newState = () => ({ recs: [], seen: new WeakSet(), last: -1e9, hk: {}, doom: new Map(), cures: [], lant: new Map(), sunk: new Map(), room: null, cv: {}, wo: {}, gr: [], sap: {}, hk4: null, lcar: new Map(), pass: [] });
  let S = newState();   // (the fight's; the preview swaps its own in per canvas)
  let warned = false;
  const warn = e => { if (!warned) { warned = true; if (typeof console !== 'undefined') console.warn('sovereign-fx', e); } };

  // ---------------------------------------------------------------------------------------------------------------- small painted pieces
  const add = (c, fn) => { c.save(); c.globalCompositeOperation = 'lighter'; fn(); c.restore(); };
  const SPR = {};
  function sprite(key, w, h, fn) {
    let s = SPR[key]; if (s !== undefined) return s;
    if (typeof document === 'undefined') return (SPR[key] = null);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); return (SPR[key] = cv);
  }
  // a flame tongue lying along `ang` from (x, y): an ink edge, then red, orange and a hot core (len long, wid wide at the root, ph sways it)
  function tongue(c, x, y, ang, len, wid, ph, pal, k) {
    if (k <= 0.02 || len < 2) return;
    const sw = Math.sin(ph * TAU) * wid * 0.22;
    c.save(); c.translate(x, y); c.rotate(ang);
    for (let j = 0; j < 4; j++) {
      const L = len * (j === 0 ? 1.1 : 1 - (j - 1) * 0.3), W = wid * 0.5 * (j === 0 ? 1.18 : 1 - (j - 1) * 0.3);
      c.beginPath(); c.moveTo(0, -W); c.quadraticCurveTo(L * 0.5, -W * 1.3 + sw, L, sw * 1.7); c.quadraticCurveTo(L * 0.5, W * 1.3 + sw, 0, W); c.closePath();
      c.fillStyle = j === 0 ? rgba(K.ink, 0.5 * k) : rgba(pal[j - 1], k * (j === 3 ? 0.95 : 0.9)); c.fill();
    }
    c.restore();
  }
  const UP = -Math.PI / 2;
  // embers rising off a spot: a pure function of t (looping), so a scrubbed clock draws the same thing
  function rise(c, x, y, o) {
    const n = cnt(o.n || 10), t = o.t, per = o.per || 1.6, h = o.rise || 70, sp = o.spread || 30, sz = o.size || 3, a = o.a == null ? 1 : o.a, sd = o.seed || 0;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const ph = (t / per + hs(i, sd)) % 1, al = Math.sin(ph * Math.PI) * a; if (al <= 0.03) continue;
      glow(c, x + (hs(i, sd + 1) - 0.5) * sp + Math.sin(t * 2 + i * 1.7) * 5 * ph, y - ph * h * (0.6 + 0.4 * hs(i, sd + 2)), sz * (1.3 - 0.6 * ph) + 1, ph < 0.4 ? (o.hot || K.hot) : (o.col || K.ember), al);
    }
    c.restore();
  }
  // a glint: a long thin four-pointed star with a glow
  function glint(c, x, y, r, rot, col, a) {
    if (a <= 0.02 || r <= 0.5) return;
    glow(c, x, y, r * 1.8, col, 0.5 * a);
    c.save(); c.translate(x, y); c.rotate(rot);
    for (const [R, w, f] of [[r * 1.6, 0.13, col], [r, 0.3, K.white]]) {
      c.beginPath();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? R * w : R, an = i * Math.PI / 4; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(rr, 0); }
      c.closePath(); c.fillStyle = rgba(f, Math.min(1, a)); c.fill();
    }
    c.restore();
  }
  // a streak: ink edge, mid colour, gold and a white core along a line (a slash, a spark's tail)
  function streak(c, x1, y1, x2, y2, w, a, o = {}) {
    if (a <= 0.02 || w <= 0.2) return;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = rgba(K.ink, 0.5 * a); c.lineWidth = w * 1.5; c.stroke();
    c.strokeStyle = rgba(o.mid || K.ember, a); c.lineWidth = w; c.stroke();
    c.strokeStyle = rgba(o.hi || K.gold, a); c.lineWidth = w * 0.5; c.stroke();
    c.strokeStyle = rgba(K.white, a * 0.95); c.lineWidth = Math.max(0.8, w * 0.18); c.stroke();
    c.restore();
  }
  const clipShape = (c, s) => { SHAPES.trace(c, s); c.clip(); };
  const clipRoom = c => { ARENA.trace(c, 3); c.clip(); };
  // a scorch: a dark soft blot with a ring of glowing cracks that cool
  function scorch(c, x, y, r, a, heat, seed, col) {
    if (a <= 0.01) return;
    glow(c, x, y, r * 1.2, K.char, 0.62 * a);
    glow(c, x, y, r * 0.8, K.ink, 0.5 * a);
    if (heat > 0.03) add(c, () => {
      for (let i = 0; i < 9; i++) {
        const an = hs(i, seed) * TAU, d = r * (0.35 + 0.6 * hs(i, seed + 1));
        c.beginPath(); c.moveTo(x + Math.cos(an) * d * 0.25, y + Math.sin(an) * d * 0.25); c.lineTo(x + Math.cos(an + 0.15) * d * 0.7, y + Math.sin(an + 0.15) * d * 0.7); c.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d);
        c.strokeStyle = rgba(col || K.ember, 0.7 * heat * a); c.lineWidth = 1.6; c.stroke();
      }
      glow(c, x, y, r * 0.45, col || K.ember, 0.18 * heat * a);
    });
  }

  // ---------------------------------------------------------------------------------------------------------------- sprites
  const brandGlyph = () => sprite('brand', 160, 160, g => {
    g.translate(80, 80);
    const ring = (r, lw, col, a) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = lw; g.strokeStyle = rgba(col, a); g.stroke(); };
    ring(62, 11, K.ink, 0.6); ring(62, 5, K.ember, 1); ring(62, 1.8, K.hot, 1); ring(47, 2.5, K.amber, 0.85);
    g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(Math.cos(a) * 51, Math.sin(a) * 51); g.lineTo(Math.cos(a) * 59, Math.sin(a) * 59); g.strokeStyle = rgba(K.gold, 0.95); g.lineWidth = 3; g.stroke(); }
    g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-27, 11, -21, -14, -4, -40); g.bezierCurveTo(-2, -23, 6, -18, 10, -8); g.bezierCurveTo(19, -18, 25, -4, 19, 11); g.bezierCurveTo(14, 23, 6, 30, 0, 30); g.closePath();
    g.lineJoin = 'round'; g.strokeStyle = rgba(K.ink, 0.8); g.lineWidth = 8; g.stroke(); g.fillStyle = rgba(K.ember, 0.55); g.fill(); g.strokeStyle = rgba(K.hot, 1); g.lineWidth = 3.4; g.stroke();
    g.beginPath(); g.moveTo(-36, 31); g.lineTo(36, -31); g.strokeStyle = rgba(K.ink, 0.7); g.lineWidth = 9; g.stroke(); g.strokeStyle = rgba(K.white, 0.95); g.lineWidth = 3.4; g.stroke();
  });
  const domeSprite = () => sprite('dome', 140, 90, g => {   // a gold-rimmed silver cloche, seen a little from above; its base is at y 84
    g.beginPath(); g.moveTo(14, 82); g.bezierCurveTo(14, 28, 46, 14, 70, 14); g.bezierCurveTo(94, 14, 126, 28, 126, 82); g.closePath();
    const gr = g.createLinearGradient(14, 0, 126, 0);
    gr.addColorStop(0, '#3a2a1c'); gr.addColorStop(0.28, '#9a8a78'); gr.addColorStop(0.46, '#efe6d2'); gr.addColorStop(0.7, '#8a7a68'); gr.addColorStop(1, '#2a1c12');
    g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = rgba(K.ink, 0.95); g.stroke();
    g.beginPath(); g.moveTo(14, 82); g.lineTo(126, 82); g.lineWidth = 7; g.strokeStyle = rgba(K.ink, 0.9); g.stroke(); g.lineWidth = 4; g.strokeStyle = rgba(K.gold, 1); g.stroke();
    g.beginPath(); g.moveTo(34, 62); g.bezierCurveTo(34, 40, 48, 30, 60, 26); g.lineWidth = 4; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();
    g.beginPath(); g.arc(70, 12, 7, 0, TAU); g.fillStyle = rgba(K.gold, 1); g.fill(); g.lineWidth = 3; g.strokeStyle = rgba(K.ink, 0.95); g.stroke();
  });
  let beamGrad = null;   // (the beam's fade along its length, in the beam's own frame: built once)
  const beamFill = c => {
    if (!beamGrad || beamGrad.c !== c.canvas) { const g = c.createLinearGradient(0, 0, 1300, 0); g.addColorStop(0, 'rgba(255,244,196,0.95)'); g.addColorStop(0.35, 'rgba(255,222,140,0.55)'); g.addColorStop(1, 'rgba(255,190,96,0.12)'); beamGrad = { g, c: c.canvas }; }
    return beamGrad.g;
  };

  // ---------------------------------------------------------------------------------------------------------------- the descent (svact 1)
  // The seams of the flagstones crack open from the middle outward, glow, and beat once a half second as each of the halo's twelve flames lights; ash and
  // faint cinder glimpses (the King's Road, the high places, the crater) drift up past the rim.
  const SEAMS = (() => {
    const out = [], R = 520, N = 16;
    for (let i = 0; i < N; i++) {
      let a = i * TAU / N + (hs(i, 1) - 0.5) * 0.25; const pts = [];
      for (let r = 24; r <= R + 44; r += 34) { a += (hs(i * 37 + r, 2) - 0.5) * 0.12; pts.push([Math.cos(a) * r, Math.sin(a) * r, r]); }
      out.push(pts);
      if (i % 2 === 0) {
        const f = 4 + Math.floor(hs(i, 3) * 6), b = [pts[f]]; let ba = Math.atan2(pts[f][1], pts[f][0]) + (hs(i, 4) < 0.5 ? -0.55 : 0.55);
        for (let j = 1; j <= 6; j++) { ba += (hs(i * 11 + j, 5) - 0.5) * 0.3; const p = b[j - 1]; b.push([p[0] + Math.cos(ba) * 32, p[1] + Math.sin(ba) * 32, Math.hypot(p[0] + Math.cos(ba) * 32, p[1] + Math.sin(ba) * 32)]); }
        out.push(b);
      }
    }
    for (const r of [140, 270, 400]) for (let j = 0; j < 4; j++) {   // (ring cracks: arcs of the circles of flagstones)
      const a0 = (j + hs(r, j)) * TAU / 4, span = 0.5 + 0.7 * hs(r, j + 9), pts = [];
      for (let q = 0; q <= 10; q++) { const a = a0 + span * q / 10, rr = r + (hs(r * 3 + q, j) - 0.5) * 9; pts.push([Math.cos(a) * rr, Math.sin(a) * rr, r]); }
      out.push(pts);
    }
    return out;
  })();
  function descent(c, room, t) {
    const e = room.ev.svact; if (!e || e.act !== 1) return;
    const u = t - e.start; if (u < -0.1 || u > 13) return;
    const R = RR(), kIn = c01((u + 0.1) / 0.5), n = Math.min(12, Math.floor(u / 0.5)), age = u - 0.5 * Math.floor(u / 0.5);
    const pulse = u >= 0.5 && u < 6.3 ? Math.exp(-age * 6) : 0, base = u < 6 ? lerp(0.2, 0.8, c01(u / 6)) : 0.8 * (1 - c01((u - 6) / 4)), a = c01(base + pulse * 0.45) * kIn;
    const F = 20 + (R + 70) * sm(c01(u / 2.6));
    if (a > 0.02) {
      c.save(); clipRoom(c);
      add(c, () => { glow(c, 0, 0, R * 0.95, K.ember, 0.05 + 0.1 * a); });
      c.lineJoin = 'round'; c.lineCap = 'round';
      for (const lay of [[9, K.ink, 0.5, 0], [13, K.ember, 0.13, 1], [2.6, K.gold, 0.85, 1], [1, K.white, 0.7, 1]]) {
        c.lineWidth = lay[0]; c.strokeStyle = rgba(lay[1], lay[2] * (lay[3] ? a : kIn));
        if (lay[3]) c.globalCompositeOperation = 'lighter'; else c.globalCompositeOperation = 'source-over';
        c.beginPath();
        for (const pts of SEAMS) {
          let on = false;
          for (let j = 0; j < pts.length; j++) { const p = pts[j]; if (p[2] > F) break; if (!on) { c.moveTo(p[0], p[1]); on = true; } else c.lineTo(p[0], p[1]); }
        }
        c.stroke();
      }
      c.globalCompositeOperation = 'lighter';
      if (u < 3.2) for (let i = 0; i < SEAMS.length; i += 3) { const pts = SEAMS[i]; let last = null; for (const p of pts) { if (p[2] > F) break; last = p; } if (last) glow(c, last[0], last[1], 18, K.hot, 0.55 * (1 - c01(u / 3.2))); }
      c.restore();
    }
    // ash past the rim, rising, and the cinder glimpses it carries
    const ka = c01((u + 0.1) / 1.2) * (1 - c01((u - 7.5) / 3.5));
    if (ka > 0.02) {
      c.save();
      for (let i = 0; i < cnt(70); i++) {
        const th = hs(i) * TAU, rho = R * (0.9 + 0.3 * hs(i, 1)), ph = (u * 0.15 + hs(i, 2)) % 1, al = Math.sin(ph * Math.PI) * 0.8 * ka;
        if (al < 0.04) continue;
        const px = Math.cos(th) * rho + Math.sin(u * 0.8 + i) * 9, py = Math.sin(th) * rho - ph * 180;
        if (i % 4 === 0) { c.globalCompositeOperation = 'lighter'; glow(c, px, py, 4 + 3 * hs(i, 6), K.ember, al * 0.85); c.globalCompositeOperation = 'source-over'; }
        c.save(); c.translate(px, py); c.rotate(u * (1 + hs(i, 7)) + i); c.fillStyle = rgba(i % 3 ? K.ash : '#8a7e70', al * 0.7); const sz = 1.8 + 3 * hs(i, 8); c.fillRect(-sz, -sz * 0.5, sz * 2, sz); c.restore();
      }
      c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let g = 0; g < 3; g++) {   // (the King's Road, the high places, the crater: each wavers up out of the ash and dissolves)
        const q = c01((u - 0.7 - g * 1.1) / 5), env = Math.sin(q * Math.PI) * ka * 0.5; if (env <= 0.02) continue;
        const an = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6][g], cx = Math.cos(an) * (R + 6), cy = Math.sin(an) * (R + 6) - q * 60;
        c.setLineDash([7, 9]); c.lineDashOffset = -u * 14; c.strokeStyle = rgba(g === 2 ? K.amber : K.ember, env); c.lineWidth = 2;
        c.beginPath();
        if (g === 0) { c.moveTo(cx - 70, cy + 36); c.lineTo(cx - 14, cy - 58); c.moveTo(cx + 70, cy + 36); c.lineTo(cx + 14, cy - 58); c.moveTo(cx - 36, cy + 36); c.lineTo(cx - 6, cy - 58); c.moveTo(cx + 36, cy + 36); c.lineTo(cx + 6, cy - 58); }
        else if (g === 1) { c.moveTo(cx - 90, cy + 30); c.lineTo(cx - 48, cy - 34); c.lineTo(cx - 22, cy - 6); c.lineTo(cx + 12, cy - 66); c.lineTo(cx + 50, cy - 8); c.lineTo(cx + 70, cy - 28); c.lineTo(cx + 96, cy + 30); }
        else { c.ellipse(cx, cy, 78, 26, 0, 0, TAU); c.moveTo(cx - 78, cy); c.lineTo(cx - 92, cy + 32); c.moveTo(cx + 78, cy); c.lineTo(cx + 92, cy + 32); }
        c.stroke();
      }
      c.setLineDash([]); c.restore();
    }
  }

  // ---------------------------------------------------------------------------------------------------------------- the Sovereign's own moves (telegraph tags)
  // One entry per tag: under(c, r, t, env) is drawn beneath the telegraph fills (wind-up, scorch), over(c, r, t, env) after the units (a brief landing).
  // r is the remembered telegraph: { tag, start, dur, land, s (its live shape), target, sd }.
  const bossAt = env => env.boss && Number.isFinite(env.boss.x) ? env.boss : { x: 0, y: -60 };
  const TELL = {};

  // Kindling: a small ring glyph at the Sovereign's feet and cinders pulled in to it, then a ring of fire thrown out to the walls
  TELL.svKindling = {
    under(c, r, t, env) {
      const b = bossAt(env), u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.5) * (0.4 + 0.6 * p), rad = 46 + 18 * p;
        add(c, () => {
          glow(c, b.x, b.y, 110 + 40 * p, K.ember, 0.1 + 0.2 * p);
          c.lineWidth = 2.4; c.strokeStyle = rgba(K.gold, 0.55 * k); c.beginPath(); c.arc(b.x, b.y, rad, 0, TAU); c.stroke();
          c.lineWidth = 1.4; c.strokeStyle = rgba(K.hot, 0.5 * k); c.beginPath(); c.arc(b.x, b.y, rad * 0.62, 0, TAU); c.stroke();
          for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + u * 0.7; c.beginPath(); c.moveTo(b.x + Math.cos(a) * (rad - 6), b.y + Math.sin(a) * (rad - 6)); c.lineTo(b.x + Math.cos(a) * (rad + 9), b.y + Math.sin(a) * (rad + 9)); c.strokeStyle = rgba(K.gold, 0.8 * k); c.lineWidth = 2.6; c.stroke(); }
          for (let i = 0; i < 16; i++) {   // (cinders spiralling in)
            const ph = (u * 0.55 + hs(i, 3)) % 1, an = hs(i, 4) * TAU + ph * 2.4, d = 210 * (1 - ph) + 30;
            glow(c, b.x + Math.cos(an) * d, b.y + Math.sin(an) * d, 3 + 2 * hs(i, 5), ph > 0.6 ? K.hot : K.ember, Math.sin(ph * Math.PI) * (0.3 + 0.6 * p));
          }
        });
        if (p > 0.75) { const q = (p - 0.75) / 0.25; for (let i = 0; i < 18; i += stp()) tongue(c, b.x + Math.cos(i * TAU / 18) * 58, b.y + Math.sin(i * TAU / 18) * 58, i * TAU / 18, 14 + 22 * q, 11, t * 1.6 + i * 0.37, FIRE, 0.55 * q); }
      } else if (age < 9) {   // the scorched ring left round him, cooling
        const R = RR(), fade = 1 - c01(age / 9), heat = 1 - c01(age / 3);
        c.save(); clipRoom(c);
        glow(c, b.x, b.y, R * 0.55, K.char, 0.3 * fade);
        c.lineWidth = 46; c.strokeStyle = rgba(K.ink, 0.22 * fade); c.beginPath(); c.arc(b.x, b.y, R * 0.62, 0, TAU); c.stroke();
        add(c, () => {
          for (let i = 0; i < 14; i++) { const a = hs(i, 6) * TAU, d0 = 60 + 40 * hs(i, 7), d1 = 150 + 330 * hs(i, 8); c.beginPath(); c.moveTo(b.x + Math.cos(a) * d0, b.y + Math.sin(a) * d0); c.lineTo(b.x + Math.cos(a + 0.05) * d1 * 0.6, b.y + Math.sin(a + 0.05) * d1 * 0.6); c.lineTo(b.x + Math.cos(a) * d1, b.y + Math.sin(a) * d1); c.strokeStyle = rgba(K.ember, 0.6 * heat); c.lineWidth = 2; c.stroke(); }
        });
        c.restore();
      }
    },
    over(c, r, t, env) {
      const b = bossAt(env), age = t - r.land; if (age < 0 || age > 2.6) return;
      const R = RR(), q = c01(age / 0.9), rr = 40 + (R + 80) * eo3(q), w = 84 * (1 - 0.45 * q), a = 0.8 * (1 - ei(q));
      c.save(); clipRoom(c);
      if (q < 1) {
        c.beginPath(); c.arc(b.x, b.y, rr, 0, TAU);
        for (const [lw, col, al] of [[w * 1.2, K.ink, 0.42], [w * 0.82, K.red, 0.85], [w * 0.58, K.ember, 0.95], [w * 0.3, K.gold, 1], [w * 0.1, K.white, 1]]) { c.lineWidth = lw; c.strokeStyle = rgba(col, al * a); c.stroke(); }
        for (let i = 0; i < 44; i += stp()) { const an = i * TAU / 44 + hs(i, 9) * 0.1, ln = (46 + 34 * hs(i, 10)) * (1 - q * 0.6); tongue(c, b.x + Math.cos(an) * (rr + w * 0.3), b.y + Math.sin(an) * (rr + w * 0.3), an, ln, 26, t * 2 + i * 0.7, FIRE, a); }
        add(c, () => glow(c, b.x, b.y, 200 * (1 - q) + 40, K.hot, 0.5 * (1 - q)));
      }
      if (age > 0.25) rise(c, b.x, b.y + 30, { n: 26, t: age, per: 2.4, rise: 130, spread: R * 1.3, a: 0.8 * (1 - c01((age - 0.25) / 2.3)), seed: 11 });
      c.restore();
    },
  };

  // Brand: the heat of the blade gathers on the tank (a ring of embers closing in), a sear slash lands, and a brand glyph burns on the floor under the tank and
  // over its chest until the burn runs out (BURN is 90 s, ticking every 3 s: the glyph flares on each tick)
  const BURN = 90;
  const brandLive = (r, t) => { for (const o of S.recs) if (o !== r && o.tag === 'svBrand' && o.target === r.target && o.land > r.land && o.land <= t) return false; return true; };
  TELL.svBrand = {
    under(c, r, t, env) {
      const u = t - r.start, p = c01(u / r.dur), age = t - r.land, e = r.target != null && env.entById ? env.entById(r.target) : null;
      const x = e ? e.x : r.s.x, y = e ? e.y : r.s.y;
      if (age < 0) {
        const k = c01(u / 0.6) * (0.3 + 0.7 * p), b = bossAt(env);
        add(c, () => {
          for (let i = 0; i < 18; i++) {   // (embers closing in on the tank)
            const ph = (u * 0.7 + hs(i, 12)) % 1, an = hs(i, 13) * TAU + ph * 3, d = 118 * (1 - ph) + 22;
            glow(c, x + Math.cos(an) * d, y + Math.sin(an) * d, 5 + 3 * hs(i, 14), ph > 0.55 ? K.hot : K.ember, Math.sin(ph * Math.PI) * k);
          }
          glow(c, x, y, 70 + 24 * p, K.ember, 0.15 + 0.35 * p);
          const dx = x - b.x, dy = y - b.y, L = Math.hypot(dx, dy) || 1;   // (the blade's heat: a thread of red light from the Sovereign to its mark)
          c.beginPath(); c.moveTo(b.x + dx / L * 40, b.y + dy / L * 40); c.lineTo(x - dx / L * 40, y - dy / L * 40); c.strokeStyle = rgba(K.ember, 0.12 + 0.3 * ei(p)); c.lineWidth = 2 + 3 * p; c.stroke();
        });
        return;
      }
      if (age > BURN + 2 || !brandLive(r, t) || r.cancel) return;
      const fade = 1 - c01((age - 2) / (BURN - 2)), tick = age > 3 ? Math.exp(-((age - 3) % 3) * 4) : 0, k = (0.25 + 0.75 * fade) * c01(age / 0.4);
      const g = brandGlyph(); if (!g) return;
      c.save(); c.translate(x, y + 6); c.rotate(t * 0.25); c.scale(1, 1);
      c.globalAlpha = (0.5 + 0.4 * tick) * k; c.drawImage(g, -50, -50, 100, 100);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = (0.2 + 0.5 * tick) * k; c.drawImage(g, -50, -50, 100, 100);
      c.restore();
      add(c, () => glow(c, x, y, 70, K.ember, (0.1 + 0.25 * tick) * k));
      if (age < 6) scorch(c, x, y, 120, 0.7 * (1 - age / 6), 1 - age / 3, r.sd, K.ember);
    },
    over(c, r, t, env) {
      const age = t - r.land; if (age < 0 || age > BURN + 2 || r.cancel) return;
      const e = r.target != null && env.entById ? env.entById(r.target) : null, x = e ? e.x : r.s.x, y = e ? e.y - (e.lift || 0) : r.s.y, b = bossAt(env);
      if (age < 0.85) {   // the sear: a slash across the tank, sparks, a ring
        const q = c01(age / 0.85), ang = Math.atan2(y - b.y, x - b.x) + 1.15, L = 190 * eo3(c01(age / 0.14)), a = (1 - ei(c01((age - 0.1) / 0.75)));
        c.save();
        streak(c, x - Math.cos(ang) * L * 0.5, y - 36 - Math.sin(ang) * L * 0.5, x + Math.cos(ang) * L * 0.5, y - 36 + Math.sin(ang) * L * 0.5, 15 * (1 - q * 0.5), a);
        add(c, () => { glow(c, x, y - 36, 90 * (1 - q) + 30, K.hot, 0.55 * (1 - q));
          c.beginPath(); c.arc(x, y + 4, 20 + 110 * eo3(q), 0, TAU); c.lineWidth = 3 * (1 - q); c.strokeStyle = rgba(K.gold, 0.7 * (1 - q)); c.stroke();
          for (let i = 0; i < 14; i++) { const an = hs(i, 15) * TAU, sp = 60 + 150 * hs(i, 16), d = sp * age, d0 = sp * Math.max(0, age - 0.1), z = 30 * Math.sin(Math.min(1, age * 2) * Math.PI * 0.5);
            streak(c, x + Math.cos(an) * d0, y - 30 + Math.sin(an) * d0 * 0.7 - z, x + Math.cos(an) * d, y - 30 + Math.sin(an) * d * 0.7 - z, 2.4, (1 - q) * 0.9); } });
        c.restore();
      }
      if (age > 0.3 && brandLive(r, t)) {   // (the glyph over the chest, small, with embers coming off it)
        const fade = 1 - c01((age - 2) / (BURN - 2)), tick = age > 3 ? Math.exp(-((age - 3) % 3) * 4) : 0, k = (0.3 + 0.7 * fade) * c01((age - 0.3) / 0.5), g = brandGlyph();
        if (g) { c.save(); c.translate(x, y - 56); c.scale(1, 0.92); c.globalAlpha = (0.55 + 0.35 * tick) * k; c.drawImage(g, -17, -17, 34, 34); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (0.25 + 0.5 * tick) * k; c.drawImage(g, -17, -17, 34, 34); c.restore(); }
        rise(c, x, y - 40, { n: 5, t, per: 1.8, rise: 46, spread: 24, size: 2.2, a: 0.7 * k, seed: 17 });
      }
    },
  };

  // Ashen Sweep: the blade's edge (the line through the Sovereign) heats, then a molten crescent races across the half, leaving a burning slash
  TELL.svSweep = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land, ca = Math.cos(s.angle), sa = Math.sin(s.angle), px = -sa, py = ca;
      const L = 1300;
      if (age < 0) {
        const k = c01(u / 0.5) * (0.25 + 0.75 * p);
        c.save(); clipRoom(c);
        add(c, () => {   // (the heat in the half the blade will cross: faint, and only inside the red)
          c.save(); clipShape(c, s); c.fillStyle = rgba(K.ember, 0.025 + 0.07 * ei(p)); c.fillRect(-1400, -1400, 2800, 2800); c.restore();
          c.beginPath(); c.moveTo(s.x - px * L, s.y - py * L); c.lineTo(s.x + px * L, s.y + py * L); c.strokeStyle = rgba(K.red, 0.7 * k); c.lineWidth = 8 + 12 * p; c.stroke();
          c.strokeStyle = rgba(K.gold, 0.9 * k); c.lineWidth = 3 + 3 * p; c.stroke();
        });
        rise(c, s.x + px * 160, s.y + py * 160, { n: 6, t, per: 1.5, rise: 60, spread: 20, size: 2.4, a: 0.6 * k, seed: 21 });
        rise(c, s.x - px * 160, s.y - py * 160, { n: 6, t, per: 1.5, rise: 60, spread: 20, size: 2.4, a: 0.6 * k, seed: 22 });
        c.restore();
      } else if (age < 8) {   // the slash burning on the floor: a dark scar with a molten line that goes out
        const fade = 1 - c01(age / 8), heat = 1 - c01(age / 3.2), Rs = 420, reveal = c01((50 + 1180 * Math.pow(c01(age / 1.0), 1.15) - Rs) / 70);
        c.save(); clipRoom(c); clipShape(c, s);
        c.lineCap = 'round';
        for (const [i, off, w] of [[0, 0, 44], [1, -52, 26], [2, 58, 18]]) {
          const rad = Rs + off; c.beginPath(); c.arc(s.x, s.y, rad, s.angle - 1.2, s.angle + 1.2); c.strokeStyle = rgba(K.ink, (i ? 0.3 : 0.5) * fade * reveal); c.lineWidth = w; c.stroke();
        }
        add(c, () => {
          c.beginPath(); c.arc(s.x, s.y, Rs, s.angle - 1.2, s.angle + 1.2); c.strokeStyle = rgba(K.ember, 0.6 * heat * reveal); c.lineWidth = 14; c.stroke(); c.strokeStyle = rgba(K.gold, 0.85 * heat * reveal); c.lineWidth = 5; c.stroke();
          c.beginPath(); c.arc(s.x, s.y, Rs, s.angle - 1.2, s.angle + 1.2); c.strokeStyle = rgba(K.hot, 0.6 * heat * heat * reveal); c.lineWidth = 1.8; c.stroke();
        });
        for (let i = 0; i < 4; i++) { const a = s.angle - 1.0 + 2 * hs(i, 23); rise(c, s.x + Math.cos(a) * Rs, s.y + Math.sin(a) * Rs, { n: 4, t: age + i, per: 1.8, rise: 70, spread: 120, size: 2.6, a: 0.6 * heat, seed: 24 + i }); }
        c.restore();
      }
    },
    over(c, r, t, env) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 1.3) return;
      const q = c01(age / 1.0), rad = 50 + 1180 * Math.pow(q, 1.15), a = 0.95 * (1 - ei(c01((q - 0.55) / 0.45))), w = 120 * (1 - 0.35 * q);
      c.save(); clipRoom(c); clipShape(c, s);
      c.beginPath(); c.arc(s.x, s.y, rad, s.angle - 1.58, s.angle + 1.58);
      for (const [lw, col, al] of [[w * 1.2, K.ink, 0.45], [w * 0.8, K.red, 0.8], [w * 0.55, K.ember, 0.95], [w * 0.28, K.gold, 1], [w * 0.09, K.white, 1]]) { c.lineWidth = lw; c.strokeStyle = rgba(col, al * a); c.stroke(); }
      for (let i = 0; i < 26; i += stp()) { const an = s.angle - 1.5 + 3 * i / 25 + (hs(i, 25) - 0.5) * 0.08; tongue(c, s.x + Math.cos(an) * (rad + 10), s.y + Math.sin(an) * (rad + 10), an, (40 + 40 * hs(i, 26)) * (1 - q * 0.5), 30, t * 2.2 + i * 0.8, FIRE, a * 0.9); }
      add(c, () => { for (let i = 0; i < 20; i++) { const an = s.angle - 1.5 + 3 * hs(i, 27), d = rad - 20 * hs(i, 28), z = 20 + 60 * q * hs(i, 29); glow(c, s.x + Math.cos(an) * d, s.y + Math.sin(an) * d - z * 0.4, 5 + 4 * hs(i, 30), K.hot, a * 0.8); } });
      c.restore();
    },
  };

  // Cupped Ember: the ember cupped in the hand while it is cast, thrown in an arc to the stack, and landing as a blue flame column
  const THROW = 1.25;
  const emberAt = (b, tx, ty, q) => ({ x: lerp(b.x, tx, q), y: lerp(b.y, ty, q), z: 44 + 150 * 4 * q * (1 - q) });
  TELL.svEmber = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land, b = bossAt(env);
      if (age < 0) {
        const k = c01(u / 0.6) * (0.3 + 0.7 * p);
        add(c, () => {   // (wisps of blue winding in to the middle of the stack: the clue inside the circle)
          for (let i = 0; i < 12; i++) {
            const ph = (u * 0.65 + hs(i, 31)) % 1, an = hs(i, 32) * TAU + ph * 3.2, d = (s.r - 10) * (1 - ph) + 10;
            glow(c, s.x + Math.cos(an) * d, s.y + Math.sin(an) * d, 6 + 4 * hs(i, 33), ph > 0.6 ? K.blueHi : K.blueMid, Math.sin(ph * Math.PI) * k);
          }
          glow(c, s.x, s.y, 60, K.blueMid, 0.12 + 0.25 * p);
        });
      } else if (age < 6 && !r.cancel) {   // the blue scorch
        const f = 1 - c01(age / 6);
        c.save(); ellipse(c, s.x, s.y, 70, 58, 0, rgba(K.ink, 0.25 * f)); c.restore();
        scorch(c, s.x, s.y, 80, 0.5 * f, 1 - c01(age / 3), r.sd, K.blueMid);
      }
    },
    over(c, r, t, env) {
      const s = r.s, u = t - r.start, age = t - r.land, b = bossAt(env); if (r.cancel) return;
      const tu = u - (r.dur - THROW);
      if (age < 0) {
        const k = c01(u / 0.6) * c01((r.dur - u) / 0.4 + (tu > 0 ? 0 : 1));
        if (tu < 0) {   // cupped in the hand
          const d = Math.hypot(s.x - b.x, s.y - b.y) || 1, hx = b.x + (s.x - b.x) / d * 36, hy = b.y + (s.y - b.y) / d * 36 - 40, p = c01(u / (r.dur - THROW));
          add(c, () => { glow(c, hx, hy, 18 + 14 * p, K.ember, 0.55 * k); glow(c, hx, hy, 7 + 5 * p, K.white, 0.9 * k); });
          for (let i = 0; i < 3; i++) tongue(c, hx + (i - 1) * 5, hy + 3, UP + (i - 1) * 0.3, 14 + 8 * p, 8, t * 2.3 + i * 0.5, FIRE, 0.8 * k);
        } else {   // thrown
          const q = c01(tu / THROW), P = emberAt(b, s.x, s.y, q);
          add(c, () => {
            for (let j = 9; j >= 1; j--) { const qq = Math.max(0, q - j * 0.035), T = emberAt(b, s.x, s.y, qq); glow(c, T.x, T.y - T.z, 12 - j, j < 4 ? K.gold : K.ember, 0.6 * (1 - j / 10)); }
            glow(c, P.x, P.y - P.z, 28, K.ember, 0.6); glow(c, P.x, P.y - P.z, 12, K.white, 0.95);
            glow(c, P.x, P.y, 20 * (1 - 0.4 * Math.sin(q * Math.PI)), K.ink, 0);   // (its shadow, below)
          });
          ellipse(c, P.x, P.y, 14 - 4 * Math.sin(q * Math.PI), 6, 0, rgba(K.ink, 0.35));
          tongue(c, P.x, P.y - P.z, Math.atan2(P.y - b.y, P.x - b.x) + Math.PI, 40, 18, t * 3, FIRE, 0.9);
        }
        return;
      }
      if (age > 1.5) return;
      const hq = c01(age / 0.22), H = 235 * eo3(hq) * (1 - ei(c01((age - 0.8) / 0.7))), W = 120 * (1 - 0.3 * c01((age - 0.5) / 1)), a = 1 - ei(c01((age - 0.9) / 0.6));
      c.save();
      add(c, () => glow(c, s.x, s.y, 140 * (1 - c01(age / 1.4)) + 40, K.blueMid, 0.5 * a));
      for (let i = -3; i <= 3; i++) tongue(c, s.x + i * W * 0.2, s.y + Math.abs(i) * 3, UP + i * 0.06, H * (1 - Math.abs(i) * 0.14), W * (0.66 - Math.abs(i) * 0.06), t * 2.1 + i * 0.7, BLUE, a);
      tongue(c, s.x, s.y, UP, H * 1.05, W * 0.55, t * 2.6, [K.blueMid, K.blueHi, K.white], a);
      const q = c01(age / 0.55);
      if (q < 1) { c.beginPath(); c.arc(s.x, s.y, 20 + (s.r - 20) * eo3(q), 0, TAU); c.lineWidth = 4 * (1 - q); c.strokeStyle = rgba(K.blueHi, 0.8 * (1 - q)); c.globalCompositeOperation = 'lighter'; c.stroke(); }
      rise(c, s.x, s.y - 10, { n: 14, t: age, per: 1.4, rise: 200, spread: 90, size: 3, a: 0.9 * a, col: K.blueMid, hot: K.blueHi, seed: 34 });
      c.restore();
    },
  };

  // Scatter: sparks drifting round each circle's edge as it winds up, then a burst off every hero
  TELL.svScatter = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.5) * (0.25 + 0.75 * p);
        add(c, () => {
          for (let i = 0; i < 14; i++) {
            const an = hs(i, 35) * TAU + u * (0.4 + 0.5 * hs(i, 36)) * (i % 2 ? 1 : -1), fl = 0.5 + 0.5 * Math.sin(u * (4 + 6 * hs(i, 37)) + i * 2);
            glow(c, s.x + Math.cos(an) * (s.r - 5), s.y + Math.sin(an) * (s.r - 5), 2.6 + 2 * fl, fl > 0.7 ? K.hot : K.amber, k * (0.4 + 0.6 * fl));
          }
          glow(c, s.x, s.y, 32 + 22 * p, K.ember, 0.05 + 0.18 * ei(p));
        });
      } else if (age < 4.5 && !r.cancel) scorch(c, s.x, s.y, 46, 0.55 * (1 - c01(age / 4.5)), 1 - c01(age / 2.2), r.sd, K.ember);
    },
    over(c, r, t, env) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 0.7 || r.cancel) return;
      const q = c01(age / 0.5), a = 1 - ei(q);
      c.save();
      add(c, () => {
        glow(c, s.x, s.y, 60 * (1 - q) + 14, K.hot, 0.55 * (1 - q));
        c.beginPath(); c.arc(s.x, s.y, 14 + (s.r - 14) * eo3(q), 0, TAU); c.lineWidth = 2.4 * (1 - q); c.strokeStyle = rgba(K.gold, 0.6 * (1 - q)); c.stroke();
      });
      for (let i = 0; i < 14; i++) {
        const an = i * TAU / 14 + (hs(i, 38) - 0.5) * 0.3, sp = (0.55 + 0.45 * hs(i, 39)) * s.r, d1 = sp * eo3(q), d0 = sp * eo3(Math.max(0, q - 0.14));
        streak(c, s.x + Math.cos(an) * d0, s.y + Math.sin(an) * d0 - 8 * q, s.x + Math.cos(an) * d1, s.y + Math.sin(an) * d1 - 8 * q, 3, a);
      }
      c.restore();
    },
  };

  // The Mince (Flambe Service's last move): a cleaver's glint travels the line the blade will fall on, then it slams down it
  TELL.svMince = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, age = t - r.land, R = RR();
      if (age < 0) {
        const left = r.land - t, k = c01((2.4 - left) / 0.8) * c01(left / 0.15 + 0.2);
        if (k <= 0.02) return;
        // (the edge it will fall along: x = 0, up and down the room; the half is the red)
        c.save(); clipRoom(c);
        add(c, () => { c.beginPath(); c.moveTo(0, -R); c.lineTo(0, R); c.strokeStyle = rgba(K.gold, 0.5 * k); c.lineWidth = 4; c.stroke(); c.strokeStyle = rgba(K.hot, 0.35 * k); c.lineWidth = 12; c.stroke(); });
        const gy = -R + 2 * R * ((t * 0.7) % 1);
        add(c, () => { glow(c, 0, gy, 70, K.hot, 0.5 * k); });
        glint(c, 0, gy, 24 + 8 * Math.sin(t * 9), 0.4, K.hot, k);
        c.restore();
      } else if (age < 7 && !r.cancel) {
        const fade = 1 - c01(age / 7), heat = 1 - c01(age / 2.6);
        c.save(); clipRoom(c);
        c.beginPath(); c.moveTo(0, -R); c.lineTo(0, R); c.lineCap = 'round'; c.strokeStyle = rgba(K.ink, 0.5 * fade); c.lineWidth = 26; c.stroke();
        add(c, () => { c.strokeStyle = rgba(K.ember, 0.55 * heat); c.lineWidth = 7; c.stroke(); c.strokeStyle = rgba(K.gold, 0.8 * heat); c.lineWidth = 2.4; c.stroke(); });
        for (let i = 0; i < 6; i++) rise(c, 0, -R + (i + 0.5) / 6 * 2 * R, { n: 3, t: age + i, per: 1.8, rise: 60, spread: 20, size: 2.4, a: 0.6 * heat, seed: 40 + i });
        c.restore();
      }
    },
    over(c, r, t, env) {
      const age = t - r.land; if (age < 0 || age > 0.9 || r.cancel) return;
      const R = RR(), q = c01(age / 0.9), a = 1 - ei(c01((age - 0.08) / 0.82)), top = -R + 2 * R * eo3(c01(age / 0.1)) ;
      c.save(); clipRoom(c);
      streak(c, 0, -R, 0, Math.min(R, top), 30 * (1 - 0.6 * q), a);
      add(c, () => { c.beginPath(); c.moveTo(0, -R); c.lineTo(0, R); c.strokeStyle = rgba(K.hot, 0.35 * a); c.lineWidth = 80 * (1 - q); c.stroke();
        for (let i = 0; i < 28; i++) { const y = -R + 2 * R * hs(i, 41), d = (24 + 80 * hs(i, 42)) * age * (hs(i, 43) < 0.5 ? -1 : 1); streak(c, d * 0.4, y, d, y - 30 * age, 2.4, a * 0.9); } });
      c.restore();
    },
  };

  // The flambe's run along its line is drawn from the svflambe event (below); the line's own telegraph only leaves the scorch here
  TELL.svFlambe = {
    under(c, r, t, env) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 6 || r.cancel) return;
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), fade = 1 - c01(age / 6), heat = 1 - c01(age / 2.2);
      c.save(); clipRoom(c); c.lineCap = 'round';
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + ca * s.len, s.y + sa * s.len); c.strokeStyle = rgba(K.ink, 0.38 * fade); c.lineWidth = 34; c.stroke();
      add(c, () => { c.strokeStyle = rgba(K.blueMid, 0.35 * heat); c.lineWidth = 6; c.stroke(); c.strokeStyle = rgba(K.ember, 0.4 * heat); c.lineWidth = 2.4; c.stroke(); });
      c.restore();
    },
  };

  // ---------------------------------------------------------------------------------------------------------------- Halo Turn (svturn:n)
  // Beams of pale gold leave the lit sigils and sweep round (slowing as they come) to lock exactly on the lines the script drew (a0 + i x 30 degrees,
  // starting 150 out from the Sovereign). A hum on the locked line, then the line fires: a column of fire, and a scorch.
  const LOCK = 0.78;
  function turnBeam(c, b, ang, rb, w, a) {
    c.save(); c.translate(b.x, b.y); c.rotate(ang);
    c.beginPath(); c.moveTo(rb, -w * 0.12); c.lineTo(1300, -w); c.lineTo(1300, w); c.lineTo(rb, w * 0.12); c.closePath(); c.fillStyle = beamFill(c); c.globalAlpha *= a; c.fill();
    c.restore();
  }
  function turnUnder(c, ev, t, env) {
    const b = bossAt(env), d = Math.max(1, (ev.dur || 5.2) - 1), u = t - ev.start, lit = ev.lit | 0, a0 = +ev.a0 || 0, sweep = +ev.sweep || 1.1;
    if (u < -0.1 || u > d + 7) return;
    const lockT = d * LOCK, q = c01(u / lockT), e = 1 - Math.pow(1 - q, 3), ka = c01((u + 0.1) / 0.5);
    c.save(); clipRoom(c);
    for (let i = 0; i < 12; i++) {
      if (!(lit & (1 << i))) continue;
      const fin = a0 + i * TAU / 12, ang = fin - sweep * (1 - e), ca = Math.cos(ang), sa = Math.sin(ang);
      if (u < d) {
        const locked = c01((u - lockT) / (d - lockT)), rb = lerp(118, 150, q);
        add(c, () => {
          turnBeam(c, b, ang, rb, 40 * (1 - 0.45 * locked), (0.7 + 0.3 * q) * ka * (1 - 0.1 * locked));
          turnBeam(c, b, ang, rb, 10, 0.9 * ka * (0.7 + 0.3 * locked));
          glow(c, b.x + ca * rb, b.y + sa * rb, 22, K.hot, 0.65 * ka);
          if (u < lockT) for (let j = 0; j < 6; j++) glow(c, b.x + ca * (rb + 120 + j * 170 * (0.6 + 0.4 * hs(j, i))), b.y + sa * (rb + 120 + j * 170), 5, K.gold, 0.35 * ka * (1 - q * 0.5));   // (motes in the beam)
          if (locked > 0) {   // locked: a hum on the line, brightening to the shot
            const lk = Math.min(1, locked * 3);
            c.beginPath(); c.moveTo(b.x + ca * 150, b.y + sa * 150); c.lineTo(b.x + ca * 1300, b.y + sa * 1300); c.strokeStyle = rgba(K.hot, (0.3 + 0.55 * locked) * lk); c.lineWidth = 1.5 + 4 * locked; c.stroke();
            c.strokeStyle = rgba(K.gold, (0.15 + 0.3 * locked) * lk); c.lineWidth = 12 + 10 * locked; c.stroke();
            if (u - lockT < 0.3) { const f = 1 - (u - lockT) / 0.3; glint(c, b.x + ca * 150, b.y + sa * 150, 20 * f + 6, ang, K.hot, f); }
          }
        });
      } else {   // fired: the scorch left on the line
        const age = u - d, fade = 1 - c01(age / 7), heat = 1 - c01(age / 2.4);
        c.beginPath(); c.moveTo(b.x + ca * 150, b.y + sa * 150); c.lineTo(b.x + ca * 1300, b.y + sa * 1300); c.lineCap = 'round'; c.strokeStyle = rgba(K.ink, 0.38 * fade); c.lineWidth = 40; c.stroke();
        add(c, () => { c.strokeStyle = rgba(K.ember, 0.4 * heat); c.lineWidth = 8; c.stroke(); c.strokeStyle = rgba(K.gold, 0.6 * heat); c.lineWidth = 2.4; c.stroke(); });
      }
    }
    c.restore();
  }
  function turnOver(c, ev, t, env) {
    const b = bossAt(env), d = Math.max(1, (ev.dur || 5.2) - 1), age = t - ev.start - d, lit = ev.lit | 0, a0 = +ev.a0 || 0;
    if (age < 0 || age > 0.75) return;
    const q = c01(age / 0.75), a = 1 - ei(c01((age - 0.05) / 0.7)), w = 64 * (1 - 0.35 * q), front = 150 + 1200 * eo3(c01(age / 0.14));
    c.save(); clipRoom(c);
    for (let i = 0; i < 12; i++) {
      if (!(lit & (1 << i))) continue;
      const ang = a0 + i * TAU / 12, ca = Math.cos(ang), sa = Math.sin(ang);
      c.save(); c.translate(b.x, b.y); c.rotate(ang);
      c.fillStyle = rgba(K.ink, 0.35 * a); c.fillRect(150, -w * 0.6, front - 150, w * 1.2);
      c.fillStyle = rgba(K.red, 0.7 * a); c.fillRect(150, -w * 0.46, front - 150, w * 0.92);
      c.fillStyle = rgba(K.ember, 0.9 * a); c.fillRect(150, -w * 0.32, front - 150, w * 0.64);
      c.fillStyle = rgba(K.gold, a); c.fillRect(150, -w * 0.17, front - 150, w * 0.34);
      c.fillStyle = rgba(K.white, a); c.fillRect(150, -w * 0.06, front - 150, w * 0.12);
      c.restore();
      for (let j = 0; j < 8; j += stp()) { const dd = 200 + 1000 * hs(j, i + 50); if (dd > front) continue; tongue(c, b.x + ca * dd, b.y + sa * dd + 4, UP, (50 + 60 * hs(j, i + 60)) * (1 - q * 0.5), 34, t * 2 + j + i, FIRE, a * 0.9); }
      add(c, () => glow(c, b.x + ca * 150, b.y + sa * 150, 70 * (1 - q) + 20, K.hot, 0.5 * (1 - q)));
    }
    c.restore();
  }

  // ---------------------------------------------------------------------------------------------------------------- Flambe Service (svflambe:n)
  // ev: { plates: [[x, y]...], at: [serve times], r, dur }. Each plate's gold rim fills toward its own serving time (the soonest to finish is the next to be
  // served); at the serving the lid lifts off on a puff of flambe, and the plate's flame races to the next plate as a run of blue-tipped fire.
  function plateUnder(c, ev, t, env) {
    const u = t - ev.start, P = ev.plates || [], A = ev.at || [], n = P.length, R0 = ev.r || 85;
    if (!n || u < -0.2 || t > ev.end + 0.8) return;
    const kin = c01((u + 0.2) / 0.7), kout = 1 - c01((t - (ev.end - 0.5)) / 1.3), K0 = kin * kout;
    if (K0 <= 0.02) return;
    c.save(); clipRoom(c);
    for (let k = 0; k < n; k++) {
      const [x, y] = P[k], at = A[k] ?? 4, f = c01(u / Math.max(0.5, at)), served = u >= at, sa = u - at;
      // the platter
      c.beginPath(); c.arc(x, y, R0 * 0.78, 0, TAU); c.fillStyle = rgba(K.ink, 0.34 * K0); c.fill();
      c.lineWidth = 3; c.strokeStyle = rgba(K.gold, 0.5 * K0); c.stroke();
      c.beginPath(); c.arc(x, y, R0 * 0.62, 0, TAU); c.lineWidth = 1.4; c.strokeStyle = rgba(K.gold, 0.28 * K0); c.stroke();
      // the rim: dim where it is empty, gold and hot where it has filled; the head of the fill glows
      c.lineCap = 'butt'; c.beginPath(); c.arc(x, y, R0 * 0.9, 0, TAU); c.lineWidth = 9; c.strokeStyle = rgba(K.ink, 0.45 * K0); c.stroke();
      c.lineWidth = 5; c.strokeStyle = rgba(K.gold, 0.22 * K0); c.stroke();
      if (f > 0.001) {
        c.beginPath(); c.arc(x, y, R0 * 0.9, -Math.PI / 2, -Math.PI / 2 + TAU * f); c.lineWidth = 6; c.strokeStyle = rgba(K.gold, K0); c.stroke();
        c.lineWidth = 2; c.strokeStyle = rgba(K.white, 0.9 * K0); c.stroke();
        if (!served) { const ha = -Math.PI / 2 + TAU * f; add(c, () => glow(c, x + Math.cos(ha) * R0 * 0.9, y + Math.sin(ha) * R0 * 0.9, 14 + 6 * f, K.hot, 0.8 * K0)); }
      }
      if (!served) {   // (the cloche still on: a gold glow leaking from under it as its rim nears full)
        const sp = domeSprite();
        add(c, () => glow(c, x, y, 70, K.gold, (0.05 + 0.25 * f * f) * K0));
        if (sp) { c.save(); c.globalAlpha = K0; c.drawImage(sp, x - 59, y - 64 + Math.sin(t * 2 + k) * 0.8, 118, 76); c.restore(); }
        rise(c, x, y - 30, { n: 3, t: t + k, per: 2.2, rise: 50, spread: 40, size: 6, a: 0.12 * K0, col: '#ddd', hot: '#fff', seed: 60 + k });
      } else {   // served: the flambe over the plate
        const fq = c01(sa / 0.4), H = (210 * Math.exp(-sa * 1.5) + 56) * fq * K0;
        add(c, () => glow(c, x, y - 20, 90, K.blueMid, 0.2 * K0 * (1 - c01(sa / 5))));
        for (let i = -2; i <= 2; i++) tongue(c, x + i * 18, y + 6 - Math.abs(i) * 2, UP + i * 0.1, H * (1 - Math.abs(i) * 0.18), 34, t * 2 + i * 0.6 + k, BLUE, K0 * 0.9);
        for (let i = -1; i <= 1; i++) tongue(c, x + i * 18, y + 4, UP + i * 0.14, H * 0.6 * (1 - Math.abs(i) * 0.2), 22, t * 2.4 + i + k, FIRE, K0 * 0.8);
      }
      // the flambe racing on to the next plate
      if (k + 1 < n) {
        const [x1, y1] = P[k + 1], dx = x1 - x, dy = y1 - y, Ln = Math.hypot(dx, dy), ca = dx / Ln, sa2 = dy / Ln, run = Ln - R0 - 12, q = c01((u - at) / 1.7);
        if (u >= at - 0.05) {
          const head = run * q, kk = K0 * (1 - c01((u - at - 1.7 - 0.8) / 1.0));
          if (kk > 0.02) {
            add(c, () => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + ca * head, y + sa2 * head); c.strokeStyle = rgba(K.blueMid, 0.3 * kk); c.lineWidth = 14; c.stroke(); c.strokeStyle = rgba(K.hot, 0.6 * kk); c.lineWidth = 2.4; c.stroke(); });
            const burning = q >= 1 ? 1 - c01((u - at - 1.7) / 0.8) : 1;
            for (let j = 0; j < 22; j += stp()) {
              const s = head - j * 22; if (s < 0) break;
              const h = (96 - j * 3) * (0.7 + 0.3 * Math.sin(t * 9 + j * 1.3)) * burning * kk;
              if (h < 6) continue;
              tongue(c, x + ca * s, y + sa2 * s + 3, UP, h, 30, t * 2 + j * 0.37, FIRE, kk * 0.95);
              tongue(c, x + ca * s, y + sa2 * s + 3 - h * 0.5, UP, h * 0.6, 20, t * 2.5 + j * 0.5, BLUE, kk * 0.9);
            }
            add(c, () => { glow(c, x + ca * head, y + sa2 * head - 14, 34, K.blueHi, 0.6 * kk * (q < 1 ? 1 : burning)); glow(c, x + ca * head, y + sa2 * head - 14, 12, K.white, 0.9 * kk * (q < 1 ? 1 : burning)); });
          }
        }
      }
    }
    c.restore();
  }
  function plateOver(c, ev, t, env) {   // the lids, in the air
    const u = t - ev.start, P = ev.plates || [], A = ev.at || [];
    if (!P.length || u < 0 || t > ev.end + 0.8) return;
    const sp = domeSprite(); if (!sp) return;
    c.save(); clipRoom(c);
    for (let k = 0; k < P.length; k++) {
      const [x, y] = P[k], sa = u - (A[k] ?? 4); if (sa < 0 || sa > 1.1) continue;
      const q = c01(sa / 1.1), z = 90 * eo3(c01(sa / 0.5)) - 30 * ei(c01((sa - 0.5) / 0.6)), dir = k % 2 ? 1 : -1, a = 1 - ei(c01((sa - 0.55) / 0.55));
      c.save(); c.translate(x + dir * 70 * eo3(q), y - 30 - z); c.rotate(dir * 0.8 * eo3(q)); c.globalAlpha = a; c.drawImage(sp, -45, -50, 90, 58); c.restore();
      if (sa < 0.3) add(c, () => glow(c, x, y - 20, 70 * (1 - sa / 0.3) + 20, K.hot, 0.6 * (1 - sa / 0.3)));
    }
    c.restore();
  }

  // ---------------------------------------------------------------------------------------------------------------- Burning Web (svweb:n, svfuse:n, svshadow:n)
  const geo = l => { const L = Math.hypot(l[2] - l[0], l[3] - l[1]) || 1, ux = (l[2] - l[0]) / L, uy = (l[3] - l[1]) / L; return { x1: l[0], y1: l[1], x2: l[2], y2: l[3], kx: l[4], ky: l[5], len: L, ux, uy, s0: l[4] == null ? L / 2 : (l[4] - l[0]) * ux + (l[5] - l[1]) * uy }; };
  const near = (a, b) => Math.abs(a - b) < 3;
  function webState(room, key, ev, t) {   // for each thread: when it is broken (a fuse) or goes up whole (a shadow)
    const out = (ev.l || []).map(l => ({ g: geo(l), fuse: null, shadow: null }));
    for (const k in room.ev) {
      const e = room.ev[k];
      if (k.startsWith('svfuse:') && e.start >= ev.start - 0.3) { for (const o of out) if (!o.fuse && near(e.x1, o.g.x1) && near(e.y1, o.g.y1) && near(e.x2, o.g.x2) && near(e.y2, o.g.y2)) o.fuse = e; }
      else if (k.startsWith('svshadow:') && e.start >= ev.start - 0.3) { for (const o of out) if (!o.shadow && (e.l || []).some(m => near(m[0], o.g.x1) && near(m[1], o.g.y1) && near(m[2], o.g.x2) && near(m[3], o.g.y2))) o.shadow = e; }
    }
    return out;
  }
  // a stretch [sa, sb] of a thread (distance from its first end): ink, glow, gold core, hot core, wavering a little
  function threadSeg(c, g, sa, sb, t, a, seed) {
    if (sb - sa < 1 || a <= 0.02) return;
    const nx = -g.uy, ny = g.ux, n = Math.max(2, Math.ceil((sb - sa) / 38));
    const path = () => { c.beginPath(); for (let i = 0; i <= n; i++) { const s = sa + (sb - sa) * i / n, o = Math.sin(s * 0.03 + t * 3 + seed) * 1.6; const x = g.x1 + g.ux * s + nx * o, y = g.y1 + g.uy * s + ny * o; i ? c.lineTo(x, y) : c.moveTo(x, y); } };
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    path(); c.strokeStyle = rgba(K.ink, 0.5 * a); c.lineWidth = 9; c.stroke();
    c.globalCompositeOperation = 'lighter';
    path(); c.strokeStyle = rgba(K.ember, 0.22 * a); c.lineWidth = 20; c.stroke();
    path(); c.strokeStyle = rgba(K.amber, 0.9 * a); c.lineWidth = 5.4; c.stroke();
    path(); c.strokeStyle = rgba(K.hot, 0.95 * a); c.lineWidth = 2.2; c.stroke();
    c.restore();
  }
  function threadFlames(c, g, sa, sb, t, a, seed, hmul = 1) {
    if (a <= 0.03) return;
    for (let s = sa + 14; s < sb; s += 46 * stp()) {
      const i = Math.round(s / 46), fl = 0.55 + 0.45 * Math.sin(t * (5 + 3 * hs(i, seed)) + i * 1.9);
      tongue(c, g.x1 + g.ux * s, g.y1 + g.uy * s + 2, UP, (14 + 12 * fl) * hmul, 9, t * 1.7 + i * 0.4, FIRE, 0.8 * a * (0.5 + 0.5 * fl));
    }
  }
  const knotOrb = (c, x, y, t, a, hot) => {
    add(c, () => {
      glow(c, x, y, 34 + 14 * hot, K.ember, (0.4 + 0.3 * Math.sin(t * 4)) * a * (1 + hot * 0.5)); glow(c, x, y, 13 + 5 * hot, K.hot, 0.95 * a); glow(c, x, y, 5, K.white, a);
      for (let i = 0; i < 4; i++) { const an = i * TAU / 4 + t * 1.4, d = 17 + 4 * Math.sin(t * 5 + i); c.beginPath(); c.moveTo(x + Math.cos(an) * 9, y + Math.sin(an) * 9); c.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d); c.strokeStyle = rgba(K.gold, 0.8 * a); c.lineWidth = 2; c.stroke(); }
    });
    c.beginPath(); c.arc(x, y, 12, 0, TAU); c.lineWidth = 2.6; c.strokeStyle = rgba(K.ink, 0.7 * a); c.stroke();
  };
  const spider = (c, x, y, ang, t, a) => {   // her shadow: a small dark spider, a thin gold rim of light on it
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(1.7, 1.7);
    c.fillStyle = rgba(K.ink, 0.85 * a); c.strokeStyle = rgba(K.ink, 0.85 * a); c.lineWidth = 3.4; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
      const bx = (i - 1.5) * 7, sw = Math.sin(t * 22 + i * 1.7 + (sd > 0 ? 1 : 0)) * 6;
      c.beginPath(); c.moveTo(bx, sd * 5); c.lineTo(bx + 5 + sw * 0.5, sd * 17); c.lineTo(bx + sw - 1, sd * 28); c.stroke();
    }
    c.beginPath(); c.ellipse(-8, 0, 12, 8, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(6, 0, 7, 6, 0, 0, TAU); c.fill();
    c.strokeStyle = rgba(K.amber, 0.5 * a); c.lineWidth = 1.2; c.beginPath(); c.ellipse(-8, 0, 12, 8, 0, 0, TAU); c.stroke();
    add(c, () => { glow(c, 8, -1, 3, K.ember, a); glow(c, 8, 2, 3, K.ember, a); });
    c.restore();
  };
  const FUSE_FIRST = 50, FUSE_PIECE = 150;
  function webUnder(c, room, key, ev, t) {
    const u = t - ev.start; if (u < -0.1 || u > 140) return;
    const st = webState(room, key, ev, t);
    c.save(); clipRoom(c);
    st.forEach((o, i) => {
      const g = o.g, seed = i * 3.1;
      let a = c01((u + 0.1) / 0.3), sa = 0, sb = g.len;
      if (u < 0.9) { const f = eo3(c01(u / 0.9)); sa = g.s0 - g.s0 * f; sb = g.s0 + (g.len - g.s0) * f; }   // (strung out from the knot to both walls)
      if (o.fuse) {
        const f = o.fuse, fu = t - f.start, sp = f.sp || 230, lead = f.at == null ? 1.5 : f.at, d = Math.max(0, (t - f.start - lead) * sp), far = [g.s0, g.len - g.s0];
        if (fu > (f.dur || 6) + 0.2) return;
        // the burnt extent on each side steps with the pieces (a piece lands as the head reaches its start), the thread beyond stands whole
        const ext = side => { if (d < FUSE_FIRST) return 0; return Math.min(far[side], FUSE_FIRST + FUSE_PIECE * (Math.floor((d - FUSE_FIRST) / FUSE_PIECE) + 1)); };
        const eL = ext(0), eR = ext(1);
        const heat = fu < lead ? c01(fu / lead) : 1;
        threadSeg(c, g, sa, Math.max(sa, g.s0 - eL), t, a, seed); threadSeg(c, g, Math.min(sb, g.s0 + eR), sb, t, a, seed);
        if (fu < lead) {   // (the break: the thread near the knot flares as the fuse takes)
          const L0 = 20 + 90 * ei(heat);
          threadSeg(c, g, g.s0 - L0, g.s0 + L0, t, 1, seed);
          add(c, () => glow(c, f.kx, f.ky, 40 + 40 * heat, K.hot, 0.3 + 0.5 * heat));
          tongue(c, f.kx, f.ky, UP, 30 + 50 * heat, 24, t * 2.4, FIRE, 0.9);
        } else {
          // the burnt stretch: charred, flames along it that die away behind the head
          for (const [sd, dirn] of [[0, -1], [1, 1]]) {
            const E = sd ? eR : eL; if (E <= FUSE_FIRST) continue;
            const aS = g.s0 + dirn * FUSE_FIRST, bS = g.s0 + dirn * E;
            const lo = Math.min(aS, bS), hi = Math.max(aS, bS), burn = 1 - c01((fu - lead - (E - FUSE_FIRST) / sp - 0.9) / 1.6);
            threadSeg(c, g, lo, hi, t, 0.0, seed);
            c.beginPath(); c.moveTo(g.x1 + g.ux * lo, g.y1 + g.uy * lo); c.lineTo(g.x1 + g.ux * hi, g.y1 + g.uy * hi); c.lineCap = 'round'; c.strokeStyle = rgba(K.ink, 0.42 * c01(burn + 0.4)); c.lineWidth = 18; c.stroke();
            for (let s = FUSE_FIRST; s < E; s += 20) {
              const pos = g.s0 + dirn * s, landed = lead + (FUSE_FIRST + Math.floor((s - FUSE_FIRST) / FUSE_PIECE) * FUSE_PIECE - FUSE_FIRST) / sp + FUSE_FIRST / sp, age = fu - landed, kk = 1 - c01((age - 0.5) / 1.4);
              if (kk <= 0.02) continue;
              const j = Math.round(s / 20), fl = 0.6 + 0.4 * Math.sin(t * 8 + j * 2.1);
              tongue(c, g.x1 + g.ux * pos, g.y1 + g.uy * pos + 3, UP, (56 + 50 * fl) * kk, 34, t * 2 + j * 0.3, FIRE, 0.95 * kk);
              if (j % 2) tongue(c, g.x1 + g.ux * pos, g.y1 + g.uy * pos + 2, UP, (34 + 28 * fl) * kk, 20, t * 2.6 + j, [K.ember, K.gold, K.white], 0.9 * kk);
            }
          }
          // the head: a hot bead running on each way
          for (const dirn of [-1, 1]) { const E = dirn < 0 ? eL : eR; if (E >= far[dirn < 0 ? 0 : 1]) continue; const hd = Math.min(d, far[dirn < 0 ? 0 : 1]), px = g.x1 + g.ux * (g.s0 + dirn * hd), py = g.y1 + g.uy * (g.s0 + dirn * hd); add(c, () => { glow(c, px, py - 8, 30, K.ember, 0.6); glow(c, px, py - 8, 11, K.white, 0.95); }); }
        }
        if (fu < lead + 0.6) { /* (the knot's own flare is in the over layer) */ }
      } else if (o.shadow) {
        const sh = o.shadow, at = sh.start + (sh.at || 0), land = at + 1.6;
        if (t > land + 0.25) return;
        const pre = c01((t - ev.start) / 1) ; void pre;
        const sw = c01((t - sh.start) / Math.max(0.3, sh.at || 1));   // (the thread brightens as her shadow gathers)
        threadSeg(c, g, sa, sb, t, a * (1 + 0.3 * sw), seed);
        if (t < land) {
          threadFlames(c, g, sa, sb, t, a * (0.3 + 0.7 * sw), seed, 1 + sw);
          if (t >= at) {   // her shadow racing along: a dark smear behind it, and the spider
            const hd = Math.min(g.len, (t - at) * (sh.sp || 700)), tr = Math.max(0, hd - 260);
            c.save(); c.lineCap = 'round'; c.beginPath(); c.moveTo(g.x1 + g.ux * tr, g.y1 + g.uy * tr); c.lineTo(g.x1 + g.ux * hd, g.y1 + g.uy * hd); c.strokeStyle = rgba(K.ink, 0.32); c.lineWidth = 40; c.stroke(); c.restore();
          }
        }
      } else {
        threadSeg(c, g, sa, sb, t, a, seed);
        if (u > 0.5) threadFlames(c, g, sa, sb, t, a * 0.8, seed);
        rise(c, (g.x1 + g.x2) / 2, (g.y1 + g.y2) / 2, { n: 8, t: t + i, per: 2.2, rise: 50, spread: g.len * 0.9, size: 2.4, a: 0.55 * a, seed: 70 + i });
      }
      if (!o.fuse && !(o.shadow && t > o.shadow.start + (o.shadow.at || 0) + 1.6)) knotOrb(c, g.kx, g.ky, t + i, c01((u - 0.2) / 0.5), o.shadow ? 0.5 : 0);
    });
    c.restore();
  }
  function webOver(c, room, key, ev, t) {   // the brief moments: a knot popping, a piece of thread bursting as the fuse reaches it, a thread going up whole
    const st = webState(room, key, ev, t);
    c.save(); clipRoom(c);
    st.forEach((o, i) => {
      const g = o.g;
      if (o.fuse) {
        const f = o.fuse, fu = t - f.start, sp = f.sp || 230, lead = f.at == null ? 1.5 : f.at;
        if (fu >= 0 && fu < 0.8) {   // the knot pops
          const q = c01(fu / 0.8);
          add(c, () => { glow(c, f.kx, f.ky, 80 * (1 - q) + 20, K.hot, 0.7 * (1 - q)); c.beginPath(); c.arc(f.kx, f.ky, 10 + 70 * eo3(q), 0, TAU); c.lineWidth = 3 * (1 - q); c.strokeStyle = rgba(K.gold, 0.8 * (1 - q)); c.stroke();
            for (let j = 0; j < 12; j++) { const an = hs(j, 80 + i) * TAU, d = 120 * eo3(q) * (0.5 + hs(j, 81)); streak(c, f.kx + Math.cos(an) * d * 0.7, f.ky + Math.sin(an) * d * 0.7, f.kx + Math.cos(an) * d, f.ky + Math.sin(an) * d - 6 * q, 2.2, 1 - q); } });
        }
        for (const dirn of [-1, 1]) {   // (each piece bursts as the head reaches its start)
          const far = dirn < 0 ? g.s0 : g.len - g.s0;
          for (let a = FUSE_FIRST, j = 0; a < far; a += FUSE_PIECE, j++) {
            const tl = f.start + lead + a / sp, age = t - tl; if (age < 0 || age > 0.5) continue;
            const mid = Math.min(far, a + FUSE_PIECE * 0.5), px = g.x1 + g.ux * (g.s0 + dirn * mid), py = g.y1 + g.uy * (g.s0 + dirn * mid), q = c01(age / 0.5);
            add(c, () => { glow(c, px, py - 10, 80 * (1 - q) + 28, K.hot, 0.5 * (1 - q)); for (let k = 0; k < 6; k++) { const an = hs(k, 82 + j) * TAU, d = 50 * eo3(q); glow(c, px + Math.cos(an) * d, py - 12 + Math.sin(an) * d * 0.7 - 24 * q, 3, K.gold, 0.9 * (1 - q)); } });
          }
        }
      } else if (o.shadow) {
        const sh = o.shadow, at = sh.start + (sh.at || 0), land = at + 1.6, age = t - land;
        if (t >= at && t < land + 0.1) { const hd = Math.min(g.len, (t - at) * (sh.sp || 700)); spider(c, g.x1 + g.ux * hd, g.y1 + g.uy * hd + 4, Math.atan2(g.uy, g.ux), t, hd < g.len ? 1 : c01(1 - (t - at - g.len / (sh.sp || 700)) / 0.4)); }
        if (age >= 0 && age < 1.1) {   // the whole thread goes up at once: a wall of flame the length of it
          const q = c01(age / 1.1), a = 1 - ei(c01((age - 0.2) / 0.9)), H = 190 * eo3(c01(age / 0.18)) * (1 - 0.5 * q), n = Math.ceil(g.len / 34);
          add(c, () => { c.beginPath(); c.moveTo(g.x1, g.y1); c.lineTo(g.x2, g.y2); c.strokeStyle = rgba(K.hot, 0.5 * a); c.lineWidth = 70 * (1 - q * 0.6); c.lineCap = 'round'; c.stroke(); });
          for (let j = 0; j <= n; j += stp()) { const s = g.len * j / n, fl = 0.7 + 0.3 * Math.sin(t * 9 + j * 1.7); tongue(c, g.x1 + g.ux * s, g.y1 + g.uy * s + 4, UP + (hs(j, 83) - 0.5) * 0.25, H * fl * (0.7 + 0.3 * hs(j, 84)), 52, t * 2 + j * 0.31, FIRE, a * 0.9); }
          rise(c, (g.x1 + g.x2) / 2, (g.y1 + g.y2) / 2, { n: 24, t: age, per: 1.4, rise: 160, spread: g.len, size: 3, a: a * 0.9, seed: 85 + i });
        }
      }
    });
    c.restore();
  }

  // ================================================================================================================ FX1b: the second half of Act I
  // Ember and Ash (pol charges, svSurge), the Crier (the bell, Royal Doom, the lantern, the knights' replay), Royal Tithe and the Dirge, and the burnback set piece.
  // Layers as above: everything on the floor under the telegraph fills, brief impacts and things in the air over. Safe ground is never painted, and no
  // screen flash: the brightest light here (the settling floor) is a local glow at 40% alpha for a fifth of a second.
  const GR = { dk: '#0a3326', mid: '#2fb98a', hi: '#b6ffd8', glow: '#58e8a8', bone: '#e8f2dc' };   // (grave green: the Hollow King's sound and light)
  const GRAVE = [GR.dk, GR.mid, GR.hi], TITHEC = ['#6f8a22', '#c4d65a', '#fff3a8'], GOLD = [K.amber, K.gold, K.white];
  const bez2 = (a, b, c, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * b + q * q * c;
  const rawRaid = () => (typeof window !== 'undefined' && window.__game && window.__game.raid) || null;
  // the host's own state (the Doom, the lanterns, the knights live on `raid`, which tellEnv does not carry): env first (the preview, or a main.js that adds them), else the debug handle
  const feed = (env, k) => { if (env[k] !== undefined) return env[k]; const R = rawRaid(); return R ? R[k] : undefined; };
  const stOf = env => (env.boss && env.boss.st) || (rawRaid() && rawRaid().bossDraw && rawRaid().bossDraw.st) || null;
  const haloR = env => { const st = stOf(env); return st && typeof SV_ART !== 'undefined' && SV_ART.sigilPos ? SV_ART.sigilPos(st, 0).r : 118; };
  const haloPt = (env, i) => {
    const b = bossAt(env), st = stOf(env);
    if (st && typeof SV_ART !== 'undefined' && SV_ART.sigilPos) { const p = SV_ART.sigilPos(st, i); return { x: b.x + p.x, y: b.y + p.y }; }
    const a = i * TAU / 12 - Math.PI / 2; return { x: b.x + Math.cos(a) * 118, y: b.y + Math.sin(a) * 118 };
  };
  const resetState = s => { s.recs.length = 0; s.seen = new WeakSet(); s.hk = {}; s.doom.clear(); s.cures.length = 0; s.lant.clear(); s.sunk.clear(); s.cv = {}; s.wo = {}; s.gr.length = 0; s.sap = {}; s.hk4 = null; s.lcar.clear(); s.pass.length = 0; };
  // a layered ring (ink edge, saturated mid, bright, hot core) of width w at radius r: the shape of a toll or a bell's ring
  function bandRing(c, x, y, r, w, a, pal) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.lineWidth = w * 1.5; c.strokeStyle = rgba(K.ink, 0.4 * a); c.stroke();
    add(c, () => { for (const [k, col, al] of [[1, pal[0], 0.75], [0.6, pal[1], 0.9], [0.28, pal[2], 1], [0.09, K.white, 1]]) { c.lineWidth = w * k; c.strokeStyle = rgba(col, al * a); c.stroke(); } });
  }

  // ---------------------------------------------------------------------------------------------------------------- Ember and Ash (pol, svSurge)
  // Every hero carries a charge until the act ends: a small flame (fire) or a curl of grey ash (ash) orbits them. A faint line of drawing, with motes moving
  // along it toward each other, joins each hero to the nearest opposite charge (the pull); it never marks a place to stand. The Surge's burst lands on the pairs.
  const PAIR = 150, PULL = 440;
  function charges(env) {
    const out = []; if (!env.pol || !env.pol.size || !env.units) return out;
    for (const u of env.units) { const s = env.pol.get(u.id); if (s) out.push({ id: u.id, x: u.x, y: u.y, s }); }
    return out;
  }
  const surgeK = t => { for (const r of S.recs) if (r.tag === 'svSurge' && t >= r.start - 0.1 && t < r.land) return c01((t - r.start) / r.dur); return -1; };
  function bonds(c, t, env) {
    const U = charges(env); if (U.length < 2) return;
    const sk = surgeK(t), seen = new Set();
    for (const a of U) {
      let best = null, bd = PULL;
      for (const b of U) if (b.s !== a.s) { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < bd) { bd = d; best = b; } }
      if (!best) continue;
      const key = a.id < best.id ? a.id + ':' + best.id : best.id + ':' + a.id; if (seen.has(key)) continue; seen.add(key);
      const f = a.s > 0 ? a : best, g = a.s > 0 ? best : a;   // (f the fire end, g the ash end)
      const near = 1 - c01((bd - 70) / (PULL - 70)), k = (0.2 + 0.45 * near) * (bd < 76 ? 0.55 : 1) * (sk < 0 ? 1 : 1 + 1.4 * sk);
      const mx = (f.x + g.x) / 2, my = (f.y + g.y) / 2, nx = -(g.y - f.y) / bd, ny = (g.x - f.x) / bd, bow = Math.sin(t * 1.1 + f.id) * Math.min(26, bd * 0.08), cx = mx + nx * bow, cy = my + ny * bow;
      const grad = c.createLinearGradient(f.x, f.y, g.x, g.y); grad.addColorStop(0, rgba(K.ember, k)); grad.addColorStop(0.5, rgba(K.gold, k * 0.5)); grad.addColorStop(1, rgba(K.ash, k));
      add(c, () => {
        c.beginPath(); c.moveTo(f.x, f.y); c.quadraticCurveTo(cx, cy, g.x, g.y); c.lineCap = 'round'; c.strokeStyle = grad;
        c.lineWidth = 5; c.globalAlpha = 0.35; c.stroke(); c.globalAlpha = 1;
        c.setLineDash([9, 10]); c.lineDashOffset = -t * 20; c.lineWidth = 1.8; c.stroke(); c.setLineDash([]);
        for (let j = 0; j < cnt(3); j++) {   // (a mote of flame and a mote of ash drifting in from either end)
          const ph = (t * 0.45 + j / 3 + hs(f.id, j) * 0.2) % 1, q = ph * 0.5, al = Math.sin(ph * Math.PI) * Math.min(1, k * 2.2);
          glow(c, bez2(f.x, cx, g.x, q), bez2(f.y, cy, g.y, q), 3.6, K.gold, al * 0.9);
          glow(c, bez2(f.x, cx, g.x, 1 - q), bez2(f.y, cy, g.y, 1 - q), 3.6, K.ash, al * 0.8);
        }
        if (sk >= 0) glow(c, mx, my, 26 + 40 * sk, K.amber, 0.08 + 0.22 * sk);   // (the Surge gathering where the bond is)
      });
    }
  }
  function orbit(c, t, u, sk) {
    const fire = u.s > 0, dir = fire ? 1 : -1, n = LOW ? 1 : 2, sp = Math.max(0, sk), spd = (fire ? 1.9 : 1.15) * (1 + 0.8 * sp), R = 24 + 5 * sp;
    for (let i = 0; i < n; i++) {
      const a = t * spd * dir + i * Math.PI + u.id * 1.3, x = u.x + Math.cos(a) * R, y = u.y - 14 + Math.sin(a) * R * 0.6;
      if (fire) {
        add(c, () => {
          for (let j = 4; j >= 1; j--) { const a2 = a - dir * j * 0.2; glow(c, u.x + Math.cos(a2) * R, u.y - 14 + Math.sin(a2) * R * 0.6, 5 - j * 0.7, K.ember, 0.3 * (1 - j / 5)); }
          glow(c, x, y, 15, K.ember, 0.42); glow(c, x, y - 4, 6, K.hot, 0.8);
        });
        tongue(c, x, y + 4, UP, 15 + 4 * Math.sin(t * 9 + i), 9, t * 2.2 + u.id + i, FIRE, 0.95);
      } else {   // a curl of grey ash: a small spiral, flakes shed behind it
        for (let j = 5; j >= 1; j--) { const a2 = a - dir * j * 0.17; c.save(); c.translate(u.x + Math.cos(a2) * R, u.y - 14 + Math.sin(a2) * R * 0.6); c.rotate(j + t * 2); c.fillStyle = rgba(K.ash, 0.55 * (1 - j / 6)); c.fillRect(-1.8, -1, 3.6, 2); c.restore(); }
        c.save(); c.translate(x, y); c.lineCap = 'round'; c.beginPath();
        for (let k = 0; k <= 12; k++) { const an = k * 0.8 + t * 3 + i, rr = 1 + k * 0.62; if (k) c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); else c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        c.strokeStyle = rgba(K.ink, 0.5); c.lineWidth = 4.4; c.stroke(); c.strokeStyle = rgba('#d8cfc0', 0.9); c.lineWidth = 2; c.stroke(); c.restore();
      }
    }
  }
  // who the Surge lands on: opposite charges within 150 pair up (the bond's midpoint); a hero with none near is alone
  function surgePairs(env) {
    const U = charges(env), out = [], used = new Set();
    for (const a of U) {
      if (used.has(a.id)) continue;
      let best = null, bd = PAIR;
      for (const b of U) if (b.id !== a.id && b.s !== a.s && !used.has(b.id)) { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d <= bd) { bd = d; best = b; } }
      const same = U.some(b => b.id !== a.id && b.s === a.s && Math.hypot(b.x - a.x, b.y - a.y) <= PAIR);
      used.add(a.id);
      if (best) { used.add(best.id); out.push({ x: (a.x + best.x) / 2, y: (a.y + best.y) / 2, d: bd, id: a.id, same }); } else out.push({ x: a.x, y: a.y, d: 0, id: a.id, alone: true, same });
    }
    return out;
  }
  TELL.svSurge = {
    under(c, r, t, env) {
      const age = t - r.land;
      if (age >= 0 && age < 4.5 && !r.cancel && r.pairs) for (const q of r.pairs) scorch(c, q.x, q.y, q.alone ? 60 : 46, 0.5 * (1 - c01(age / 4.5)), 1 - c01(age / 2.2), r.sd + q.id, q.alone ? K.red : K.ember);
    },
    over(c, r, t, env) {
      const age = t - r.land; if (age < 0 || age > 1.1 || r.cancel) return;
      if (!r.pairs) r.pairs = surgePairs(env);
      const q = c01(age / 0.75), a = 1 - ei(q);
      for (const p of r.pairs) {
        const R0 = p.alone ? 74 : 58 + p.d * 0.5, col = p.alone ? K.ember : K.gold;
        add(c, () => {
          glow(c, p.x, p.y - 10, 90 * (1 - q) + 24, p.alone ? K.red : K.hot, 0.55 * (1 - q));
          c.beginPath(); c.arc(p.x, p.y, 16 + R0 * eo3(q), 0, TAU); c.lineWidth = (p.alone ? 5 : 3) * (1 - q); c.strokeStyle = rgba(col, 0.75 * (1 - q)); c.stroke();
          if (p.same) { c.beginPath(); c.arc(p.x, p.y, 10 + R0 * 0.7 * eo3(q), 0, TAU); c.lineWidth = 2 * (1 - q); c.strokeStyle = rgba(K.red, 0.8 * (1 - q)); c.stroke(); }
        });
        for (let i = 0; i < 10; i += stp()) { const an = i * TAU / 10 + hs(i, 90 + p.id) * 0.4; tongue(c, p.x + Math.cos(an) * 14, p.y - 6 + Math.sin(an) * 11, an, (30 + 30 * hs(i, 91)) * (1 - 0.4 * q) * (p.alone ? 1.3 : 1), 16, t * 2 + i, p.alone ? [K.dark, K.red, K.ember] : FIRE, a * 0.9); }
        for (let i = 0; i < cnt(16); i++) {   // (and the ash, thrown out grey)
          const an = hs(i, 92 + p.id) * TAU, sp = 50 + 130 * hs(i, 93), d = sp * eo3(q);
          c.save(); c.translate(p.x + Math.cos(an) * d, p.y + Math.sin(an) * d * 0.75 - 22 * q); c.rotate(i + age * 6); c.fillStyle = rgba(i % 3 ? K.ash : '#8a7e70', a * 0.85); c.fillRect(-3, -1.5, 6, 3); c.restore();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------------------------------------------- The Crier: the bell, Royal Doom, the lantern, the knights
  // The Hollow King's echo (its body is ult-echo.js's) rings his bell: three rings of grave-green sound leave it across the floor with embers shot through them.
  const trackHk = room => { for (const k in room.ev) if (k.startsWith('svecho:')) { const e = room.ev[k]; if (e.who === 'hollowking') S.hk[k.slice(7)] = { x: +e.x || 0, y: +e.y || 0 }; } };
  function bellUnder(c, room, t) {
    for (const k in room.ev) {
      if (!k.startsWith('svechoact:')) continue;
      const a = room.ev[k]; if (a.anim !== 'bell' && a.anim !== 'knell') continue;
      const h = S.hk[k.slice(10)]; if (!h) continue;
      const age = t - a.start; if (age < -0.05 || age > 2.8) continue;
      if (age < 0.55) {   // (the wind-up: a small rune ring at his feet, which the first ring leaves)
        const w = c01((age + 0.05) / 0.25) * (1 - c01((age - 0.3) / 0.25)), rr = 30 + 12 * age;
        add(c, () => {
          glow(c, h.x, h.y + 4, 60, GR.mid, 0.2 * w);
          c.beginPath(); c.arc(h.x, h.y + 6, rr, 0, TAU); c.lineWidth = 2.4; c.strokeStyle = rgba(GR.glow, 0.7 * w); c.stroke();
          for (let i = 0; i < 8; i++) { const an = i * TAU / 8 - age * 2; c.beginPath(); c.moveTo(h.x + Math.cos(an) * (rr - 5), h.y + 6 + Math.sin(an) * (rr - 5)); c.lineTo(h.x + Math.cos(an) * (rr + 8), h.y + 6 + Math.sin(an) * (rr + 8)); c.strokeStyle = rgba(GR.hi, 0.85 * w); c.lineWidth = 2.4; c.stroke(); }
        });
      }
      c.save(); clipRoom(c);
      for (let i = 0; i < 3; i++) {
        const q = (age - 0.3 - 0.42 * i) / 1.5; if (q <= 0 || q >= 1) continue;
        const rr = 30 + 390 * eo3(q), al = (1 - ei(q)) * (i ? 0.7 : 1), lw = 6 + 22 * (1 - q);
        bandRing(c, h.x, h.y + 6, rr, lw, al, [GR.mid, GR.glow, GR.hi]);
        add(c, () => {   // (a thinner ring of broken arcs just inside: the sound's own shimmer)
          c.beginPath(); c.arc(h.x, h.y + 6, rr - lw * 0.9 - 6, 0, TAU); c.setLineDash([34, 26]); c.lineDashOffset = -rr * 0.6; c.lineWidth = 2; c.strokeStyle = rgba(GR.hi, 0.55 * al); c.stroke(); c.setLineDash([]);
          for (let j = 0; j < cnt(44); j++) {   // (embers shot through the ring: each a spark on the ring that streaks outward)
            const an = hs(j, 95 + i) * TAU, off = (hs(j, 96 + i) - 0.5) * lw * 1.4, x = h.x + Math.cos(an) * (rr + off), y = h.y + 6 + Math.sin(an) * (rr + off);
            glow(c, x, y, 6 + 4 * hs(j, 97), j % 3 ? K.ember : K.hot, al * 0.95);
            c.beginPath(); c.moveTo(x - Math.cos(an) * 22, y - Math.sin(an) * 22); c.lineTo(x + Math.cos(an) * 12, y + Math.sin(an) * 12); c.lineWidth = 3; c.strokeStyle = rgba(K.amber, al * 0.9); c.stroke(); c.lineWidth = 1.2; c.strokeStyle = rgba(K.white, al * 0.8); c.stroke();
          }
        });
      }
      c.restore();
    }
  }
  function bellOver(c, room, t) {
    for (const k in room.ev) {
      if (!k.startsWith('svechoact:')) continue;
      const a = room.ev[k]; if (a.anim !== 'bell' && a.anim !== 'knell') continue;
      const h = S.hk[k.slice(10)]; if (!h) continue;
      const age = t - a.start; if (age < 0.15 || age > 0.9) continue;
      const q = c01((age - 0.15) / 0.75);
      add(c, () => { glow(c, h.x, h.y - 70, 46 * (1 - q) + 14, GR.hi, 0.6 * (1 - q)); });   // (the clapper's strike)
      glint(c, h.x, h.y - 70, 22 * (1 - q) + 4, 0.3, GR.glow, 1 - q);
      for (let i = 0; i < cnt(8); i++) { const an = -Math.PI / 2 + (hs(i, 98) - 0.5) * 3, d = (20 + 60 * hs(i, 99)) * eo3(q); streak(c, h.x + Math.cos(an) * d * 0.5, h.y - 70 + Math.sin(an) * d * 0.5, h.x + Math.cos(an) * d, h.y - 70 + Math.sin(an) * d, 2.2, 1 - q); }
    }
  }

  // Royal Doom: a skull sigil on the floor under the doomed, its ring of grave-green fire burning down (clockwise from the top, as the mark over their head does);
  // it goes red-hot as the time runs out. A cure breaks the sigil into shards of light.
  const skullSprite = () => sprite('skull', 96, 96, g => {
    g.translate(48, 50); g.lineJoin = 'round';
    g.beginPath(); g.ellipse(0, -6, 25, 22, 0, 0, TAU); g.fillStyle = GR.bone; g.fill(); g.lineWidth = 5; g.strokeStyle = rgba(K.ink, 0.95); g.stroke();
    g.beginPath(); g.moveTo(-14, 10); g.lineTo(-14, 26); g.lineTo(14, 26); g.lineTo(14, 10); g.closePath(); g.fillStyle = '#cfdcc4'; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(-9.5, -7, 6.5, 8, 0, 0, TAU); g.ellipse(9.5, -7, 6.5, 8, 0, 0, TAU); g.fillStyle = rgba(K.ink, 1); g.fill();
    g.beginPath(); g.arc(-9.5, -5.5, 2.6, 0, TAU); g.arc(9.5, -5.5, 2.6, 0, TAU); g.fillStyle = GR.glow; g.fill();
    g.beginPath(); g.moveTo(0, 2); g.lineTo(-4, 10); g.lineTo(4, 10); g.closePath(); g.fillStyle = K.ink; g.fill();
    g.strokeStyle = rgba(K.ink, 0.9); g.lineWidth = 2; g.beginPath(); for (const x of [-7, 0, 7]) { g.moveTo(x, 14); g.lineTo(x, 25); } g.stroke();
    g.beginPath(); g.moveTo(-3, -26); g.lineTo(2, -17); g.lineTo(-2, -12); g.strokeStyle = K.ember; g.lineWidth = 2.2; g.stroke();
  });
  function trackDoom(env, t) {
    const D = feed(env, 'doom') || new Map(), R = rawRaid();
    for (const [id, d] of D) { const e = env.entById && env.entById(id); S.doom.set(id, { start: d.start, end: d.end, x: e ? e.x : 0, y: e ? e.y : 0 }); }
    for (const [id, d] of S.doom) {
      if (D.has(id)) continue;
      S.doom.delete(id);
      const st = R && R.party && R.party.get ? R.party.get(id) : null;
      if (!(st && st.alive === false) && t < d.end - 0.35) S.cures.push({ id, at: t, x: d.x, y: d.y });   // (gone before it ran out and not dead: a cure)
    }
    for (let i = S.cures.length - 1; i >= 0; i--) if (t > S.cures[i].at + 2 || t < S.cures[i].at - 1) S.cures.splice(i, 1);
  }
  function doomSigil(c, env, t) {
    const D = feed(env, 'doom'); if (!D || !D.size || !env.entById) return;
    const sp = skullSprite();
    for (const [id, d] of D) {
      const e = env.entById(id); if (!e) continue;
      const x = e.x, y = e.y + 8, span = Math.max(0.1, d.end - d.start), frac = c01((d.end - t) / span), k = c01((t - d.start) / 0.7), hot = frac < 0.3, pulse = hot ? 0.75 + 0.25 * Math.sin(t * 14) : 1;
      const R0 = 58, main = hot ? K.ember : GR.glow, core = hot ? K.hot : GR.hi, a0 = -Math.PI / 2, ae = a0 + TAU * frac, late = t - d.end;
      if (late > 0.6) continue;
      c.beginPath(); c.arc(x, y, R0 - 2, 0, TAU); c.fillStyle = rgba(K.ink, 0.28 * k); c.fill();
      c.beginPath(); c.arc(x, y, R0, 0, TAU); c.lineWidth = 9; c.strokeStyle = rgba(K.ink, 0.5 * k); c.stroke(); c.lineWidth = 3; c.strokeStyle = rgba(GR.dk, 0.9 * k); c.stroke();
      add(c, () => {
        glow(c, x, y, 80, hot ? K.red : GR.mid, (0.1 + (hot ? 0.12 * (1 - frac / 0.3) : 0)) * k);
        if (frac > 0.004) { c.beginPath(); c.arc(x, y, R0, a0, ae); c.lineCap = 'round'; c.lineWidth = 9; c.strokeStyle = rgba(main, 0.7 * k * pulse); c.stroke(); c.lineWidth = 4; c.strokeStyle = rgba(core, 0.95 * k); c.stroke(); c.lineWidth = 1.4; c.strokeStyle = rgba(K.white, k); c.stroke(); }
        for (let i = 0; i < 12; i++) { const an = i * TAU / 12 + t * 0.25; c.beginPath(); c.moveTo(x + Math.cos(an) * (R0 + 7), y + Math.sin(an) * (R0 + 7)); c.lineTo(x + Math.cos(an) * (R0 + 13), y + Math.sin(an) * (R0 + 13)); c.strokeStyle = rgba(GR.glow, 0.5 * k); c.lineWidth = 2; c.stroke(); }
        if (hot) { c.beginPath(); c.arc(x, y, R0 * 0.62, 0, TAU); c.lineWidth = 2; c.strokeStyle = rgba(K.red, 0.5 * k * pulse); c.stroke(); }
      });
      if (sp) { c.save(); c.translate(x, y); c.globalAlpha = (0.5 + 0.15 * pulse) * k; c.drawImage(sp, -38, -40, 76, 76); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.2 * k * pulse; c.drawImage(sp, -38, -40, 76, 76); c.restore(); }
      const hx = x + Math.cos(ae) * R0, hy = y + Math.sin(ae) * R0;   // (the head of the burn)
      if (frac > 0.004) { add(c, () => { glow(c, hx, hy, 22, K.ember, 0.8 * k); glow(c, hx, hy, 8, K.white, k); }); tongue(c, hx, hy + 2, UP, 18 + 6 * Math.sin(t * 10), 10, t * 2.5, FIRE, 0.9 * k); rise(c, hx, hy, { n: 3, t, per: 1.2, rise: 34, spread: 10, size: 2, a: 0.8 * k, seed: 100 + (id | 0) }); }
      if (late > 0) {   // (it runs out: a hot ring thrown off the sigil)
        const q = c01(late / 0.55);
        add(c, () => { glow(c, x, y, 90 * (1 - q) + 20, K.red, 0.5 * (1 - q)); c.beginPath(); c.arc(x, y, R0 + 90 * eo3(q), 0, TAU); c.lineWidth = 6 * (1 - q); c.strokeStyle = rgba(K.ember, 0.9 * (1 - q)); c.stroke(); });
      }
    }
  }
  function cureOver(c, t) {
    for (const q of S.cures) {
      const age = t - q.at; if (age < 0 || age > 1.8) continue;
      const f = c01(age / 0.8), a = 1 - ei(c01((age - 0.3) / 1.5)), H = 150 * eo3(c01(age / 0.25)) * (1 - 0.5 * c01((age - 0.6) / 1.0));
      add(c, () => {
        glow(c, q.x, q.y - 20, 90 * (1 - f) + 30, K.gold, 0.5 * (1 - f));
        c.beginPath(); c.arc(q.x, q.y + 8, 14 + 110 * eo3(f), 0, TAU); c.lineWidth = 4 * (1 - f); c.strokeStyle = rgba(K.gold, 0.85 * (1 - f)); c.stroke();
        c.lineWidth = 2.4;   // (the sigil's ring, broken into slivers that fly outward and go out)
        for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + 0.2, rr = 58 + 70 * eo3(f); c.beginPath(); c.arc(q.x, q.y + 8, rr, an, an + 0.38); c.strokeStyle = rgba(GR.glow, 0.9 * (1 - f)); c.stroke(); }
      });
      for (let i = -2; i <= 2; i++) tongue(c, q.x + i * 7, q.y + 4, UP + i * 0.05, H * (1 - Math.abs(i) * 0.2), 14, t * 2 + i, GOLD, a * 0.8);
      rise(c, q.x, q.y - 8, { n: 10, t: age, per: 1.5, rise: 120, spread: 40, size: 2.8, a: a, col: K.gold, hot: K.white, seed: 120 });
    }
  }

  // The lantern: the flame leaves the Hollow King's sigil on the halo as a comet (an arc, ember turning gold) and lands as the lantern's light. Once it stands
  // (or is carried), a pool of warm light lies round it on the floor; ArenaView.lantern (main.js) still draws the lantern itself in its hands.
  function lanternFlight(c, room, t, env) {
    for (const k in room.ev) {
      if (!k.startsWith('svlantern:')) continue;
      const ev = room.ev[k], u = t - ev.start, fly = Math.max(0.3, ev.fly || 1.1); if (u < -0.05 || u > fly + 2.2) continue;
      const P0 = haloPt(env, ev.sig == null ? 3 : ev.sig | 0), x1 = +ev.x || 0, y1 = +ev.y || 0, q = c01(u / fly);
      const at = qq => { const e = 1 - Math.pow(1 - qq, 1.8); return { x: lerp(P0.x, x1, e), y: lerp(P0.y, y1, e), z: lerp(80, 38, e) + 130 * Math.sin(Math.PI * Math.min(1, qq)) * (1 - 0.3 * qq) }; };
      if (u < 0.4) { const f = 1 - u / 0.4; add(c, () => glow(c, P0.x, P0.y, 44 * f + 10, K.hot, 0.6 * f)); glint(c, P0.x, P0.y, 18 * f + 5, 0.5, K.gold, f); }
      if (u >= 0 && u < fly) {
        const H = at(q), T2 = at(Math.max(0, q - 0.04));
        ellipse(c, H.x, H.y, 11 - 3 * Math.sin(q * Math.PI), 5, 0, rgba(K.ink, 0.3));
        add(c, () => {
          for (let j = 14; j >= 1; j--) { const T = at(Math.max(0, q - j * 0.03)); glow(c, T.x, T.y - T.z, 12 - j * 0.6, j < 5 ? K.gold : K.ember, 0.55 * (1 - j / 15)); }
          glow(c, H.x, H.y - H.z, 32, K.ember, 0.5); glow(c, H.x, H.y - H.z, 15, K.gold, 0.8); glow(c, H.x, H.y - H.z, 6, K.white, 1);
        });
        tongue(c, H.x, H.y - H.z, Math.atan2((T2.y - T2.z) - (H.y - H.z), T2.x - H.x), 38, 18, t * 3, FIRE, 0.9);
      }
      const la = u - fly;
      if (la >= 0 && la < 1.4) {   // (it lands: a ring of light on the stones, sparks up)
        const f = c01(la / 0.85), a = 1 - ei(c01(la / 1.4));
        add(c, () => { glow(c, x1, y1 - 20, 80 * (1 - f) + 30, K.hot, 0.55 * (1 - f)); c.beginPath(); c.arc(x1, y1 + 4, 10 + 110 * eo3(f), 0, TAU); c.lineWidth = 4 * (1 - f); c.strokeStyle = rgba(K.gold, 0.85 * (1 - f)); c.stroke(); });
        for (let i = 0; i < cnt(8); i++) { const an = hs(i, 101) * TAU, d = (20 + 70 * hs(i, 102)) * eo3(f); streak(c, x1 + Math.cos(an) * d * 0.5, y1 + Math.sin(an) * d * 0.4 - 10, x1 + Math.cos(an) * d, y1 + Math.sin(an) * d * 0.7 - 10 - 30 * f, 2.2, a * 0.9); }
        rise(c, x1, y1 - 10, { n: 8, t: la, per: 1.3, rise: 80, spread: 40, size: 2.6, a: a, col: K.gold, hot: K.white, seed: 103 });
      }
    }
  }
  function lanternPools(c, env, t) {
    const L = feed(env, 'lanterns'); if (!L || !L.length) return;
    for (const l of L) {
      const car = l.carrier != null && env.entById ? env.entById(l.carrier) : null, x = car ? car.x : l.x, y = car ? car.y : l.y;
      let t0 = S.lant.get(l.id); if (t0 == null || t < t0 - 1) { t0 = t; S.lant.set(l.id, t0); }
      const k = c01((t - t0) / 0.6), s = l.last ? 1.5 : 1, fl = 0.85 + 0.1 * Math.sin(t * 8 + l.id) + 0.05 * Math.sin(t * 19);
      add(c, () => {
        glow(c, x, y + 2, 120 * s, K.gold, 0.13 * k * fl); glow(c, x, y, 58 * s, K.hot, 0.16 * k * fl);
        c.beginPath(); c.arc(x, y + 2, 85, 0, TAU); c.setLineDash([5, 9]); c.lineDashOffset = -t * 8; c.lineWidth = 1.6; c.strokeStyle = rgba(K.gold, 0.22 * k); c.stroke(); c.setLineDash([]);   // (how far its light reaches)
        for (let i = 0; i < cnt(5); i++) { const an = t * (0.9 + 0.2 * i) + i * TAU / 5, d = 26 + 8 * Math.sin(t * 2 + i); glow(c, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.6 - 2, 3, i % 2 ? K.hot : K.gold, 0.7 * k); }
      });
      rise(c, x, y - (car ? 52 : 34), { n: 4, t: t + l.id, per: 1.8, rise: 40, spread: 12, size: 2.2, a: 0.7 * k, col: K.amber, seed: 130 });
    }
  }

  // The knights' replay: the Sovereign's last sweep, remembered. Wind-up: a grave rune and fire gathering at each knight, and a faint ghost of the old slash's
  // arc inside the red half. Then each knight cuts a fan of grave-green light with ember in its edge across the half (clipped to the red, never the safe half),
  // and a ghost of the burnt knight lunges with it.
  function knightPts(env, s) {
    const KN = feed(env, 'knights'), out = [];
    if (KN && KN.size) for (const k of KN.values()) if (!k.gone) out.push({ x: k.x, y: k.y });
    if (out.length < 2) { out.length = 0; const a = s.angle, px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2); for (const d of [-1, 1]) out.push({ x: s.x + px * d * 400, y: s.y + py * d * 400 }); }
    return out;
  }
  function ghostKnight(c, x, y, face, a, t) {
    if (a <= 0.02) return;
    c.save(); c.translate(x, y); c.scale(1.35, 1.35); c.globalAlpha = a; c.lineJoin = 'round'; c.lineCap = 'round';
    ellipse(c, 0, 4, 18, 7, 0, rgba(K.ink, 0.3));
    c.beginPath(); c.moveTo(-14, 2); c.lineTo(-11, -22); c.lineTo(-17, -30); c.lineTo(-8, -34); c.lineTo(-5, -44); c.arc(0, -48, 7, Math.PI * 1.15, Math.PI * 1.85); c.lineTo(5, -44); c.lineTo(8, -34); c.lineTo(17, -30); c.lineTo(11, -22); c.lineTo(14, 2); c.closePath();
    c.fillStyle = rgba('#0b1512', 0.82); c.fill(); c.strokeStyle = rgba(GR.glow, 0.85); c.lineWidth = 1.8; c.stroke();
    c.beginPath(); c.moveTo(-3, -22); c.lineTo(1, -12); c.lineTo(-2, -4); c.strokeStyle = rgba(K.ember, 0.9); c.lineWidth = 1.6; c.stroke();   // (a burnt crack, still glowing)
    const sa = face - 0.9 * Math.sin(t * 2 + x) * 0.1; c.beginPath(); c.moveTo(Math.cos(sa) * 8, -24 + Math.sin(sa) * 8); c.lineTo(Math.cos(sa) * 46, -24 + Math.sin(sa) * 46); c.strokeStyle = rgba(GR.hi, 0.95); c.lineWidth = 2.6; c.stroke();
    c.globalCompositeOperation = 'lighter'; glow(c, -2, -48, 10, GR.glow, 0.7); glow(c, 2, -48, 10, K.ember, 0.4);
    c.restore();
  }
  TELL.svReplay = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land, KN = knightPts(env, s);
      if (age < 0) {
        const k = c01(u / 0.6) * (0.3 + 0.7 * p);
        c.save(); clipRoom(c); clipShape(c, s);
        add(c, () => { c.beginPath(); c.arc(s.x, s.y, 420, s.angle - 1.2, s.angle + 1.2); c.setLineDash([16, 12]); c.lineDashOffset = -t * 30; c.lineWidth = 6; c.strokeStyle = rgba(GR.glow, 0.3 * k); c.stroke(); c.lineWidth = 1.8; c.strokeStyle = rgba(GR.hi, 0.5 * k); c.stroke(); c.setLineDash([]); });
        c.restore();
        KN.forEach((q, n) => {
          const rr = 30 + 8 * p;
          add(c, () => {
            glow(c, q.x, q.y + 6, 70, GR.mid, (0.08 + 0.2 * p) * k);
            c.beginPath(); c.arc(q.x, q.y + 8, rr, 0, TAU); c.lineWidth = 2.4; c.strokeStyle = rgba(GR.glow, 0.7 * k); c.stroke();
            for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + u * 0.8; c.beginPath(); c.moveTo(q.x + Math.cos(an) * (rr - 5), q.y + 8 + Math.sin(an) * (rr - 5)); c.lineTo(q.x + Math.cos(an) * (rr + 8), q.y + 8 + Math.sin(an) * (rr + 8)); c.strokeStyle = rgba(GR.hi, 0.8 * k); c.lineWidth = 2.4; c.stroke(); }
            for (let i = 0; i < cnt(10); i++) { const ph = (u * 0.6 + hs(i, 104 + n)) % 1, an = hs(i, 105) * TAU + ph * 2.6, d = 96 * (1 - ph) + 14; glow(c, q.x + Math.cos(an) * d, q.y + Math.sin(an) * d * 0.8, 3 + 2 * hs(i, 106), i % 2 ? GR.hi : K.ember, Math.sin(ph * Math.PI) * k * 0.9); }
          });
          tongue(c, q.x, q.y - 34, UP, 26 * (0.4 + 0.6 * p), 12, t * 2 + n, GRAVE, 0.8 * k);
        });
      } else if (age < 7 && !r.cancel) {   // the two cuts scarred on the floor: dark, with a grave-green line that cools to nothing
        const fade = 1 - c01(age / 7), heat = 1 - c01(age / 3);
        c.save(); clipRoom(c); clipShape(c, s); c.lineCap = 'round';
        KN.forEach(q => {
          c.beginPath(); c.arc(q.x, q.y, 540, s.angle - 0.95, s.angle + 0.95); c.strokeStyle = rgba(K.ink, 0.45 * fade); c.lineWidth = 40; c.stroke();
          add(c, () => { c.beginPath(); c.arc(q.x, q.y, 540, s.angle - 0.95, s.angle + 0.95); c.strokeStyle = rgba(GR.mid, 0.5 * heat); c.lineWidth = 12; c.stroke(); c.strokeStyle = rgba(GR.hi, 0.8 * heat); c.lineWidth = 4; c.stroke(); c.strokeStyle = rgba(K.ember, 0.55 * heat); c.lineWidth = 1.6; c.stroke(); });
        });
        c.restore();
      }
    },
    over(c, r, t, env) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 1.4 || r.cancel) return;
      const KN = knightPts(env, s), f = c01(age / 0.95);
      c.save(); clipRoom(c); clipShape(c, s);
      KN.forEach((q, n) => {
        const rad = 40 + 900 * Math.pow(f, 1.1), a = 0.95 * (1 - ei(c01((f - 0.55) / 0.45))), w = 100 * (1 - 0.35 * f);
        if (a <= 0.01) return;
        c.beginPath(); c.arc(q.x, q.y, rad, s.angle - 1.0, s.angle + 1.0);
        for (const [lw, col, al] of [[w * 1.2, K.ink, 0.45], [w * 0.8, GR.dk, 0.85], [w * 0.55, GR.mid, 0.95], [w * 0.28, GR.hi, 1], [w * 0.09, K.white, 1]]) { c.lineWidth = lw; c.strokeStyle = rgba(col, al * a); c.stroke(); }
        for (let i = 0; i < 18; i += stp()) { const an = s.angle - 0.95 + 1.9 * i / 17; tongue(c, q.x + Math.cos(an) * (rad + 8), q.y + Math.sin(an) * (rad + 8), an, (34 + 34 * hs(i, 107 + n)) * (1 - f * 0.5), 26, t * 2.2 + i * 0.8, i % 3 ? GRAVE : FIRE, a * 0.9); }
        add(c, () => { for (let i = 0; i < cnt(14); i++) { const an = s.angle - 0.95 + 1.9 * hs(i, 108 + n), d = rad - 18 * hs(i, 109); glow(c, q.x + Math.cos(an) * d, q.y + Math.sin(an) * d - 8, 4 + 3 * hs(i, 110), i % 2 ? K.ember : GR.hi, a * 0.8); } });
      });
      c.restore();
      KN.forEach(q => { const lg = eo3(c01(age / 0.5)); ghostKnight(c, q.x + Math.cos(s.angle) * 90 * lg, q.y + Math.sin(s.angle) * 90 * lg, s.angle, 1 - ei(c01(age / 1.3)), t); });
    },
  };

  // ---------------------------------------------------------------------------------------------------------------- Royal Tithe and the Dirge
  // The Tithe (roomev 'tithe', as it lands): each hero's life lifts off them as green-gold motes that arc up to the Sovereign's chest, which swells as they
  // arrive. The Dirge (the hidden raidwide eight seconds on): three faint tolls from the Sovereign as it winds up, then one heavy ring of green-gold sound.
  function titheOver(c, room, t, env) {
    const ev = room.ev.tithe; if (!ev) return;
    const u = t - ev.start; if (u < -0.05 || u > 3.6) return;
    const b = bossAt(env), U = env.units || [], tx = b.x, ty = b.y - 96;
    U.forEach((h, i) => {
      if (u >= 0 && u < 0.9) {   // (the life leaving: a ring and glints on the hero)
        const q = c01(u / 0.9);
        add(c, () => { glow(c, h.x, h.y - 14, 40 * (1 - q) + 16, TITHEC[1], 0.45 * (1 - q)); c.beginPath(); c.arc(h.x, h.y + 4, 12 + 44 * eo3(q), 0, TAU); c.lineWidth = 2.6 * (1 - q); c.strokeStyle = rgba(GR.glow, 0.8 * (1 - q)); c.stroke(); });
      }
      for (let j = 0; j < cnt(6); j++) {
        const d0 = 0.05 + 0.07 * i + 0.13 * j, q = (u - d0) / 1.35; if (q <= 0 || q >= 1) continue;
        const sx = h.x + (hs(i, j) - 0.5) * 24, sy = h.y - 12, side = hs(i, j + 5) < 0.5 ? -1 : 1, mx = (sx + tx) / 2 + side * (50 + 60 * hs(j, i)), my = Math.min(sy, ty) - 70 - 40 * hs(j, i + 3);
        const al = Math.sqrt(Math.sin(q * Math.PI));
        add(c, () => {
          for (let k = 5; k >= 1; k--) { const qq = Math.max(0, q - k * 0.035); glow(c, bez2(sx, mx, tx, qq), bez2(sy, my, ty, qq), 9 - k * 1.2, qq < 0.5 ? GR.glow : K.gold, 0.6 * al * (1 - k / 6)); }
          const hx = bez2(sx, mx, tx, q), hy = bez2(sy, my, ty, q);
          glow(c, hx, hy, 16, q < 0.5 ? GR.glow : K.gold, 0.85 * al); glow(c, hx, hy, 6, K.white, al);
        });
      }
    });
    const take = c01((u - 0.7) / 0.8) * (1 - c01((u - 1.9) / 1.2)), pq = c01((u - 1.5) / 0.9);
    if (take > 0.01) add(c, () => { glow(c, tx, ty, 70 * take + 20, TITHEC[1], 0.3 * take); glow(c, tx, ty, 26, K.hot, 0.35 * take); });
    if (pq > 0 && pq < 1) add(c, () => { c.beginPath(); c.arc(tx, ty + 20, 30 + 70 * eo3(pq), 0, TAU); c.lineWidth = 3 * (1 - pq); c.strokeStyle = rgba(K.gold, 0.55 * (1 - pq)); c.stroke(); });
  }
  TELL.svDirge = {
    under(c, r, t, env) {
      const b = bossAt(env), u = t - r.start, p = c01(u / r.dur), age = t - r.land, R = RR();
      if (age < 0) {
        const k = c01(u / 0.5) * (0.3 + 0.7 * p);
        c.save(); clipRoom(c);
        for (let n = 0; n < 3; n++) {   // (three faint tolls)
          const q = (u - 1.0 - 1.5 * n) / 1.5; if (q <= 0 || q >= 1) continue;
          bandRing(c, b.x, b.y + 20, 40 + (R * 0.6) * eo3(q), 8 * (1 - q) + 3, (0.22 + 0.12 * n) * (1 - ei(q)), [GR.dk, GR.mid, TITHEC[1]]);
        }
        c.restore();
        add(c, () => {   // (a small rune of grave-green at his feet, ticks turning slowly)
          const rad = 46 + 10 * p; glow(c, b.x, b.y + 20, 90, GR.mid, 0.06 + 0.12 * p);
          c.beginPath(); c.arc(b.x, b.y + 20, rad, 0, TAU); c.lineWidth = 2.2; c.strokeStyle = rgba(GR.glow, 0.5 * k); c.stroke();
          for (let i = 0; i < 6; i++) { const an = i * TAU / 6 - u * 0.5; c.beginPath(); c.moveTo(b.x + Math.cos(an) * (rad - 6), b.y + 20 + Math.sin(an) * (rad - 6)); c.lineTo(b.x + Math.cos(an) * (rad + 9), b.y + 20 + Math.sin(an) * (rad + 9)); c.strokeStyle = rgba(TITHEC[2], 0.75 * k); c.lineWidth = 2.6; c.stroke(); }
        });
      } else if (age < 7 && !r.cancel) {   // green-gold motes sinking back onto the floor
        const fade = 1 - c01(age / 7), n = cnt(26);
        add(c, () => { for (let i = 0; i < n; i++) { const ph = (age * 0.2 + hs(i, 111)) % 1, an = hs(i, 112) * TAU, d = R * 0.9 * Math.sqrt(hs(i, 113)); glow(c, b.x + Math.cos(an) * d, b.y + Math.sin(an) * d * 0.9 - 90 * (1 - ph), 3 + 2 * hs(i, 114), i % 2 ? GR.glow : K.gold, Math.sin(ph * Math.PI) * 0.6 * fade); } });
      }
    },
    over(c, r, t, env) {
      const b = bossAt(env), age = t - r.land; if (age < 0 || age > 2.6 || r.cancel) return;
      const R = RR();
      c.save(); clipRoom(c);
      for (const [dl, wmul, am] of [[0, 1, 1], [0.35, 0.55, 0.6]]) {
        const q = c01((age - dl) / 1.1); if (q <= 0 || q >= 1) continue;
        const rr = 40 + (R + 80) * eo3(q), w = 60 * wmul * (1 - 0.5 * q), a = 0.85 * am * (1 - ei(q));
        bandRing(c, b.x, b.y + 20, rr, w, a, [GR.dk, TITHEC[0], TITHEC[1]]);
        add(c, () => { c.beginPath(); c.arc(b.x, b.y + 20, rr, 0, TAU); c.lineWidth = w * 0.28; c.strokeStyle = rgba(TITHEC[2], a); c.stroke(); });
        for (let i = 0; i < 36; i += stp()) { const an = i * TAU / 36 + hs(i, 115) * 0.1; tongue(c, b.x + Math.cos(an) * (rr + w * 0.3), b.y + 20 + Math.sin(an) * (rr + w * 0.3), an, (30 + 26 * hs(i, 116)) * (1 - q * 0.6) * wmul, 20, t * 2 + i * 0.6, i % 4 ? GRAVE : FIRE, a * 0.8); }
      }
      add(c, () => glow(c, b.x, b.y + 10, 160 * (1 - c01(age / 1.1)) + 30, GR.hi, 0.35 * (1 - c01(age / 1.1))));
      c.restore();
    },
  };

  // ---------------------------------------------------------------------------------------------------------------- the road burns back (svact 2: set piece svburnback, 8 s)
  // 0 to 2.6   the four braziers' flames lean inward and are drawn off as streams of fire into the halo, which drinks them
  // 1.3 to 5   seams of light race across the floor, a net of cracks that cools slowly; the floor splits into sheets
  // 4.7        the floor settles: a heavy burst of dust and embers (the rooms file has swapped the floor; the camera shake is the game's)
  // Everything drawn over the floor is done by 8.4 s, inside the set piece, so nothing is ever drawn over a telegraph.
  const BB = (() => {
    const out = [], R = 520;
    const add1 = (pts, t0, sp) => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); out.push({ pts, cum, t0, sp }); };
    for (let i = 0; i < 9; i++) {   // (long chords rim to rim)
      const th = i * Math.PI / 9 + (hs(i, 200) - 0.5) * 0.35, off = (hs(i, 201) - 0.5) * 540, nx = Math.cos(th + Math.PI / 2), ny = Math.sin(th + Math.PI / 2), dx = Math.cos(th), dy = Math.sin(th);
      const h = Math.sqrt(Math.max(1, (R + 40) * (R + 40) - off * off)), pts = [];
      for (let q = 0; q <= 16; q++) { const s = (i % 2 ? 1 : -1) * (-h + 2 * h * q / 16), w = (hs(i * 17 + q, 202) - 0.5) * 34; pts.push([dx * s + nx * (off + w), dy * s + ny * (off + w)]); }
      add1(pts, 1.3 + 0.17 * i, 1000);
    }
    for (let i = 0; i < 6; i++) {   // (and seams off the middle, out)
      const th = i * TAU / 6 + (hs(i, 203) - 0.5) * 0.5, pts = []; let a = th;
      for (let q = 0; q <= 11; q++) { a += (hs(i * 13 + q, 204) - 0.5) * 0.14; pts.push([Math.cos(a) * q * 50, Math.sin(a) * q * 50]); }
      add1(pts, 1.5 + 0.12 * i, 900);
    }
    return out;
  })();
  function bbSeams(c, u) {
    const fadeAll = 1 - c01((u - 7.2) / 3.6); if (fadeAll <= 0.02 || u < 1.3) return;
    const segs = [], heads = [], flare = u > 4.7 ? Math.exp(-(u - 4.7) * 5) : 0;
    for (const sm2 of BB) {
      const head = (u - sm2.t0) * sm2.sp; if (head <= 0) continue;
      for (let j = 1; j < sm2.pts.length; j++) {
        if (sm2.cum[j - 1] >= head) break;
        const p0 = sm2.pts[j - 1], p1 = sm2.pts[j], f = c01((head - sm2.cum[j - 1]) / Math.max(1, sm2.cum[j] - sm2.cum[j - 1])), age = u - (sm2.t0 + sm2.cum[j] / sm2.sp);
        const a = (0.18 + 0.82 * Math.exp(-Math.max(0, age) * 1.3) + 0.5 * flare) * fadeAll;
        segs.push([p0[0], p0[1], lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f), Math.min(1, a), age < 0.7 ? 1 - age / 0.7 : 0]);
      }
      if (head < sm2.cum[sm2.cum.length - 1]) { let j = 1; while (j < sm2.pts.length - 1 && sm2.cum[j] < head) j++; const p0 = sm2.pts[j - 1], p1 = sm2.pts[j], f = c01((head - sm2.cum[j - 1]) / Math.max(1, sm2.cum[j] - sm2.cum[j - 1])); heads.push([lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f)]); }
    }
    c.save(); clipRoom(c); c.lineCap = 'round';
    c.strokeStyle = rgba(K.ink, 0.45 * fadeAll); c.lineWidth = 9; c.beginPath(); for (const s of segs) { c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); } c.stroke();
    c.globalCompositeOperation = 'lighter';
    if (!LOW) for (const s of segs) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.strokeStyle = rgba(K.ember, 0.2 * s[4]); c.lineWidth = 15; c.stroke(); }
    for (const s of segs) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.strokeStyle = rgba(K.gold, 0.85 * s[4]); c.lineWidth = 2.8; c.stroke(); if (s[5] > 0.02) { c.strokeStyle = rgba(K.white, 0.85 * s[5]); c.lineWidth = 1.2; c.stroke(); } }
    for (const h of heads) { glow(c, h[0], h[1], 26, K.hot, 0.55); glow(c, h[0], h[1], 9, K.white, 0.9); }
    c.restore();
  }
  function bbBraziers(c, env, u) {
    if (u > 4.2) return;
    const b = bossAt(env), Rh = haloR(env), R = RR() + 34;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, P0 = { x: Math.cos(a) * R, y: Math.sin(a) * R }, T = { x: b.x + Math.cos(a) * Rh, y: b.y + Math.sin(a) * Rh };
      const ang = Math.atan2(b.y - P0.y, b.x - P0.x), da = Math.atan2(Math.sin(ang - UP), Math.cos(ang - UP)), lean = c01(u / 0.5), fl = 1 - c01((u - 0.5) / 0.7);
      // the flame in the bowl bends toward the middle and is pulled off
      if (fl > 0.02) { add(c, () => glow(c, P0.x, P0.y - 10, 50 * fl + 14, K.ember, 0.4 * fl)); tongue(c, P0.x, P0.y - 8, UP + da * lean, (30 + 90 * lean) * fl, 26, u * 2 + i, FIRE, 0.95 * fl); }
      // the stream: a bezier swinging round on its way in, a bright head and a thinning tail
      const dist = Math.hypot(T.x - P0.x, T.y - P0.y), sw = (i % 2 ? 1 : -1) * 0.36 * dist, mx = (P0.x + T.x) / 2 - (T.y - P0.y) / dist * sw, my = (P0.y + T.y) / 2 + (T.x - P0.x) / dist * sw;
      const sh = c01((u - 0.35) / 1.7), st = c01((u - 0.9) / 1.7), fade = 1 - c01((u - 3.2) / 1.0);
      if (sh > 0.01 && st < 1 && fade > 0.02) {
        const N = 20, pt = q => [bez2(P0.x, mx, T.x, q), bez2(P0.y, my, T.y, q) - 10 * Math.sin(q * Math.PI)];
        const path = () => { c.beginPath(); for (let k = 0; k <= N; k++) { const q = lerp(st, sh, k / N), p = pt(q); if (k) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } };
        c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
        path(); c.strokeStyle = rgba(K.ink, 0.3 * fade); c.lineWidth = 14; c.stroke();
        c.globalCompositeOperation = 'lighter';
        path(); c.strokeStyle = rgba(K.ember, 0.35 * fade); c.lineWidth = 11; c.stroke(); path(); c.strokeStyle = rgba(K.gold, 0.85 * fade); c.lineWidth = 4.4; c.stroke(); path(); c.strokeStyle = rgba(K.white, 0.9 * fade); c.lineWidth = 1.6; c.stroke();
        for (let k = 0; k < cnt(10); k++) { const q = lerp(st, sh, hs(k, 205 + i)), p = pt(q); glow(c, p[0] + (hs(k, 206) - 0.5) * 16, p[1] + (hs(k, 207) - 0.5) * 16, 3.4, K.hot, 0.8 * fade); }
        const hp = pt(sh); glow(c, hp[0], hp[1], 24, K.ember, 0.6 * fade); glow(c, hp[0], hp[1], 9, K.white, 0.95 * fade);
        c.restore();
      }
      // the halo drinks it
      const ua = u - 2.05; if (ua > 0 && ua < 0.9) { const q = ua / 0.9; add(c, () => { glow(c, T.x, T.y, 50 * (1 - q) + 14, K.hot, 0.6 * (1 - q)); c.beginPath(); c.arc(b.x, b.y, Rh, a - 0.5, a + 0.5); c.lineWidth = 5 * (1 - q); c.strokeStyle = rgba(K.gold, 0.8 * (1 - q)); c.stroke(); }); }
      // the bowl goes dark: a little smoke
      if (u > 0.8) for (let k = 0; k < cnt(3); k++) { const ph = ((u - 0.8) * 0.35 + k / 3) % 1; glow(c, P0.x + (hs(k, 208 + i) - 0.5) * 14, P0.y - 14 - ph * 70, 14 + ph * 20, '#1c1612', 0.34 * (1 - ph) * (1 - c01((u - 3.4) / 0.8))); }
    }
  }
  function bbSettle(c, u) {
    const a = u - 4.7; if (a < -0.05 || a > 5) return;
    const R = RR(), qd = c01(a / 1.6);
    c.save(); clipRoom(c);
    const f = c01(a / 0.22); if (a >= 0 && f < 1) add(c, () => glow(c, 0, 0, 190 * (1 - f) + 40, K.hot, 0.4 * (1 - f)));   // (the one bright thing: local, brief, at most 40%)
    if (a >= 0 && a < 1.2) { const q = a / 1.2; bandRing(c, 0, 0, 40 + (R + 40) * eo3(q), 46 * (1 - q) + 6, 0.75 * (1 - ei(q)), [K.dark, K.red, K.ember]); }
    const N = cnt(60);
    for (let i = 0; i < N; i++) {   // (the dust ring rolling out along the floor)
      const an = i * TAU / N + (hs(i, 209) - 0.5) * 0.3, rr = (60 + (R + 20) * eo3(qd)) * (0.78 + 0.3 * hs(i, 210)), sz = 60 + 70 * hs(i, 211), al = 0.62 * (1 - c01(a / 4.8)) * c01(a / 0.15 + 0.1);
      glow(c, Math.cos(an) * rr, Math.sin(an) * rr * 0.92, sz, i % 3 ? '#8c7c66' : '#3a2c20', al);
    }
    for (let i = 0; i < cnt(14); i++) { const ph = c01(a / 3.2), x = (hs(i, 212) - 0.5) * 220 * (0.4 + ph), y = -ph * 240 * hs(i, 213) + 20; glow(c, x, y, 80 + 80 * ph, '#6a5a48', 0.5 * (1 - ph) * c01(a / 0.2)); }   // (the billow off the middle)
    c.restore();
    add(c, () => {
      for (let i = 0; i < cnt(60); i++) {   // (embers thrown off the cracks, arcing and falling)
        const an = hs(i, 215) * TAU, sp = 120 + 520 * hs(i, 216), q = c01(a / 2.8), d = sp * eo3(c01(a / 1.3)), z = (40 + 160 * hs(i, 217)) * 4 * q * (1 - q), al = (1 - q) * (0.6 + 0.4 * Math.sin(a * 14 + i));
        if (al <= 0.03) continue;
        glow(c, Math.cos(an) * d, Math.sin(an) * d * 0.8 - z, 2.6 + 2 * hs(i, 218), i % 3 ? K.ember : K.hot, al);
      }
    });
  }
  function burnUnder(c, room, t, env) {
    const e = room.ev.svact; if (!e || e.act !== 2) return;
    const u = t - e.start; if (u < 0 || u > 11.5) return;
    bbSeams(c, u);
    if (u >= 8.4) bbSettle(c, u);
  }
  function burnOver(c, room, t, env) {
    const e = room.ev.svact; if (!e || e.act !== 2) return;
    const u = t - e.start; if (u < 0 || u > 8.4) return;
    bbBraziers(c, env, u); bbSettle(c, u);
  }

  // ---------------------------------------------------------------------------------------------------------------- Act II, first half (FX2)
  // Glass Floor, Heads of Flame and Cinder Dive, from the roomevs S2a sends (svglass:n, svsheets, svhead:k, svbite:n, svcut:k, svdive:n) and the tags
  // (svBite, svDiveLand, svDivePath, svAfter, svSteam). The sheets are 150 wide, centres at multiples of 150 (the forge floor's grid, laid in by S2a).
  const SHW = 150, hkey = (x, y) => x + ',' + y;
  const FIREP = [K.red, K.ember, K.hot];
  const WAVES = new WeakMap();
  const sdOf = (a, b) => (Math.abs(a * 7 + b * 13) | 0) % 97;

  // a small wind-up glyph: two rings and a turning crown of ticks
  function glyph(c, x, y, rad, k, u, ticks = 8) {
    if (k <= 0.02) return;
    add(c, () => {
      c.lineWidth = 2.4; c.strokeStyle = rgba(K.gold, 0.55 * k); c.beginPath(); c.arc(x, y, rad, 0, TAU); c.stroke();
      c.lineWidth = 1.3; c.strokeStyle = rgba(K.hot, 0.5 * k); c.beginPath(); c.arc(x, y, rad * 0.62, 0, TAU); c.stroke();
      c.lineWidth = 2.6; c.strokeStyle = rgba(K.gold, 0.8 * k); c.beginPath();
      for (let i = 0; i < ticks; i++) { const a = i * TAU / ticks + u * 0.7; c.moveTo(x + Math.cos(a) * (rad - 6), y + Math.sin(a) * (rad - 6)); c.lineTo(x + Math.cos(a) * (rad + 9), y + Math.sin(a) * (rad + 9)); }
      c.stroke();
    });
  }
  // jagged cracks running out from (x, y): an ink groove, then the fire in it
  function crackLines(c, x, y, n, r0, r1, seed, a, heat) {
    if (a <= 0.02 || r1 <= r0 + 2) return;
    const p = new Path2D();
    for (let i = 0; i < n; i++) {
      let an = i * TAU / n + (hs(i, seed) - 0.5) * 0.5; p.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0);
      for (let j = 1; j <= 5; j++) { an += (hs(i * 9 + j, seed + 1) - 0.5) * 0.3; const d = r0 + (r1 - r0) * j / 5; p.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d); }
    }
    c.save(); c.lineJoin = c.lineCap = 'round';
    c.lineWidth = 5; c.strokeStyle = rgba(K.ink, 0.5 * a); c.stroke(p);
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = 2.6; c.strokeStyle = rgba(K.ember, 0.75 * a * heat); c.stroke(p);
    c.lineWidth = 1; c.strokeStyle = rgba(K.gold, 0.8 * a * heat); c.stroke(p);
    c.restore();
  }
  // a ribbon of fire along points (ink edge, red, ember, gold, white), narrowing from w0 to w1
  function ribbonPts(c, pts, w0, w1, a, o = {}) {
    if (a <= 0.02 || pts.length < 2) return;
    c.save(); c.lineCap = c.lineJoin = 'round';
    for (const [k, col, al] of [[1.5, K.ink, 0.5], [1, o.mid || K.red, 0.92], [0.62, o.mid2 || K.ember, 0.95], [0.34, K.gold, 1], [0.12, K.white, 1]]) {
      for (let i = 1; i < pts.length; i++) {
        const w = lerp(w0, w1, i / (pts.length - 1));
        c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.lineWidth = Math.max(0.6, w * k); c.strokeStyle = rgba(col, al * a * (o.fade ? 1 - (i - 1) / pts.length * 0.8 : 1)); c.stroke();
      }
    }
    c.restore();
  }
  // a serpent's head of fire, drawn like the Hydra's flame head (facing `ang`; the lower jaw opens with `open`)
  function fireHead(c, x, y, ang, s, a, t, open) {
    if (a <= 0.02 || s <= 0.02) return;
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    const shape = () => { c.beginPath(); c.ellipse(2, 0, 18, 12.5, 0, 0, TAU); c.moveTo(10, -9); c.lineTo(28, -6); c.lineTo(38, -2); c.lineTo(38, 2); c.lineTo(26, 4); c.lineTo(10, 5); c.closePath(); };
    for (const [f, col, al] of [[1.32, K.ink, 0.5], [1.12, K.red, 0.92], [0.9, K.ember, 0.95], [0.64, K.gold, 1], [0.36, K.white, 1]]) {
      c.save(); c.translate(12, 0); c.scale(f, f); c.translate(-12, 0); shape(); c.fillStyle = rgba(col, al * a); c.fill(); c.restore();
    }
    c.save(); c.translate(14, 3); c.rotate((open == null ? 0.2 : open) * 0.7);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(18, 1); c.lineTo(25, 4); c.lineTo(24, 7); c.lineTo(8, 8); c.lineTo(-2, 6); c.closePath();
    c.fillStyle = rgba(K.red, 0.92 * a); c.fill(); c.lineJoin = 'round'; c.lineWidth = 2; c.strokeStyle = rgba(K.ink, 0.7 * a); c.stroke(); c.restore();
    for (const sy of [-1, 1]) { c.beginPath(); c.ellipse(14, 6.2 * sy, 3.4, 1.6, 0, 0, TAU); c.fillStyle = rgba(K.white, a); c.fill(); }
    for (let i = -2; i <= 2; i++) tongue(c, -2, i * 5, Math.PI + i * 0.28, 26 + 10 * (2 - Math.abs(i)), 12, t * 2 + i, FIRE, 0.85 * a);
    c.restore();
  }

  // ---- Glass Floor (svglass:n, svsheets)
  // The wave's sheets are red-hot glass from the stamp; only the next ring glows in full (the later rings are faint, as the telegraphs' own ghosting).
  // A crack front runs out sheet by sheet, each sheet crazing in the last 0.9 s before it shatters into glittering red shards. A shattered sheet is
  // black boiling water with an ember sheen and steam wisps until `svsheets` says it is whole again.
  function waveOf(ev) {
    let w = WAVES.get(ev.s); if (w) return w;
    const A = [...new Set(ev.s.map(s => +(+s[2]).toFixed(2)))].sort((a, b) => a - b), fx = ev.foot[0], fy = ev.foot[1];
    let dmax = 0; for (const s of ev.s) dmax = Math.max(dmax, Math.hypot(s[0] - fx, s[1] - fy));
    w = { A, dmax, vel: A.length > 1 && dmax > 0 ? dmax / (A[A.length - 1] - A[0]) : 187.5, idx: at => { const v = +(+at).toFixed(2); let i = A.indexOf(v); return i < 0 ? 0 : i; } };
    WAVES.set(ev.s, w); return w;
  }
  // a pane of red-hot glass (heat 0..1: how brightly it glows, prog 0..1: how far it has crazed)
  function pane(c, x, y, heat, prog, u, sd, a) {
    const h = SHW / 2 - 5;
    c.save(); c.translate(x, y);
    c.fillStyle = rgba(K.ink, 0.38 * a); c.fillRect(-h - 3, -h - 3, 2 * h + 6, 2 * h + 6);
    c.fillStyle = rgba(K.red, (0.16 + 0.42 * heat) * a); c.fillRect(-h, -h, 2 * h, 2 * h);
    c.fillStyle = rgba(K.ember, (0.04 + 0.3 * heat) * a); c.fillRect(-h + 14, -h + 14, 2 * h - 28, 2 * h - 28);
    add(c, () => {
      glow(c, 0, 0, 92, K.ember, (0.05 + 0.2 * heat) * a); glow(c, 0, 0, 40, K.hot, (0.03 + 0.2 * heat) * a);
      c.lineWidth = 3; c.strokeStyle = rgba(K.gold, (0.12 + 0.6 * heat) * a); c.strokeRect(-h + 1, -h + 1, 2 * h - 2, 2 * h - 2);
      c.lineWidth = 1; c.strokeStyle = rgba(K.white, (0.08 + 0.5 * heat) * a); c.strokeRect(-h + 5, -h + 5, 2 * h - 10, 2 * h - 10);
      const cc = -2 * h + 4 * h * ((u * 0.3 + hs(sd, 141)) % 1), xa = Math.max(-h, cc - h), xb = Math.min(h, cc + h);   // (a glint sliding across the glass)
      c.beginPath(); c.moveTo(xa, cc - xa); c.lineTo(xb, cc - xb); c.lineWidth = 5; c.strokeStyle = rgba(K.hot, 0.14 * heat * a); c.stroke(); c.lineWidth = 1.2; c.strokeStyle = rgba(K.white, 0.4 * heat * a); c.stroke();
    });
    if (prog > 0.02) {   // crazing: cracks from the middle (an ink groove, the fire in it)
      const n = LOW ? 4 : 7, p = new Path2D();
      for (let i = 0; i < n; i++) {
        let an = i * TAU / n + (hs(i, sd) - 0.5) * 0.7; const L = h * (0.8 + 0.5 * hs(i, sd + 1)) * prog; p.moveTo(0, 0);
        for (let d = 16; d < L + 16; d += 16) { an += (hs(i * 7 + d, sd + 2) - 0.5) * 0.5; const dd = Math.min(d, L); p.lineTo(Math.cos(an) * dd, Math.sin(an) * dd); if (d >= L) break; }
      }
      c.lineJoin = c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = rgba(K.ink, 0.6 * a); c.stroke(p);
      c.globalCompositeOperation = 'lighter'; c.lineWidth = 1.8; c.strokeStyle = rgba(K.gold, (0.5 + 0.5 * prog) * a); c.stroke(p); c.lineWidth = 0.7; c.strokeStyle = rgba(K.white, 0.9 * a); c.stroke(p);
    }
    c.restore();
  }
  function glassUnder(c, ev, t) {
    const list = ev.s, u = t - ev.start;
    if (!list || !list.length || !ev.foot || u < -0.1) return;
    const W = waveOf(ev), A = W.A; if (u > A[A.length - 1] + 0.4) return;
    const kIn = c01((u + 0.1) / 0.5); let ni = 0; while (ni < A.length && A[ni] <= u) ni++;
    c.save(); clipRoom(c);
    { const hl = S.room ? holes6(S.room) : []; if (hl.length) { const pp = new Path2D(); pp.rect(-3000, -3000, 6000, 6000); for (const h of hl) { pp.moveTo(h[0] + h[2] + 8, h[1]); pp.arc(h[0], h[1], h[2] + 8, 0, TAU, true); } c.clip(pp, 'evenodd'); } }
    for (const s of list) {
      const at = +s[2]; if (u >= at) continue;
      const idx = W.idx(at), prev = idx > 0 ? A[idx - 1] : 0, full = sm(c01((u - prev) / 0.35)), faint = idx - ni >= 2 ? 0.14 : 0.24;
      pane(c, s[0], s[1], lerp(faint, 1, full), c01((u - (at - 0.9)) / 0.9), u, sdOf(s[0], s[1]), kIn);
    }
    const fx = ev.foot[0], fy = ev.foot[1];
    if (u < A[0]) glyph(c, fx, fy, 38 + 5 * Math.sin(u * 5), kIn * (0.4 + 0.6 * c01(u / A[0])), u);
    if (u >= A[0] - 0.3) {   // the crack front: a jagged ring of fire running out, in step with the shattering
      const rf = Math.max(8, W.vel * (u - A[0])), a = 0.9 * (1 - 0.4 * c01(rf / 460)) * c01((u - A[0] + 0.3) / 0.3) * c01(rf / 60) * (1 - c01((rf - W.dmax) / 50)), jit = Math.min(16, rf * 0.12), N = LOW ? 28 : 56, p = new Path2D();
      for (let i = 0; i <= N; i++) { const an = i * TAU / N, rr = rf + (hs(i % N, 151) - 0.5) * jit; const px = fx + Math.cos(an) * rr, py = fy + Math.sin(an) * rr; i ? p.lineTo(px, py) : p.moveTo(px, py); }
      c.lineJoin = c.lineCap = 'round'; c.lineWidth = 9; c.strokeStyle = rgba(K.ink, 0.4 * a); c.stroke(p);
      c.globalCompositeOperation = 'lighter'; c.lineWidth = 5.5; c.strokeStyle = rgba(K.red, 0.75 * a); c.stroke(p); c.lineWidth = 2.4; c.strokeStyle = rgba(K.gold, a); c.stroke(p); c.lineWidth = 0.9; c.strokeStyle = rgba(K.white, a); c.stroke(p);
    }
    c.restore();
  }
  // one sheet shattering: a flash, slivers of red glass thrown up that glitter as they turn, a puff of steam
  function shatter(c, cx, cy, age, sd) {
    const q = c01(age / 1.2), a = 1 - ei(q);
    if (age < 0.3) add(c, () => glow(c, cx, cy, 110, K.hot, 0.55 * (1 - age / 0.3)));
    const n = cnt(10), e = eo3(Math.min(1, age / 0.7));
    for (let i = 0; i < n; i++) {
      const ox = (hs(i, sd) - 0.5) * 110, oy = (hs(i, sd + 1) - 0.5) * 110, an = Math.atan2(oy, ox) + (hs(i, sd + 2) - 0.5) * 0.6, sp = 30 + 80 * hs(i, sd + 3);
      const x = cx + ox + Math.cos(an) * sp * e, z = 55 * hs(i, sd + 4) * Math.sin(Math.min(1, age / 0.9) * Math.PI), y = cy + oy + Math.sin(an) * sp * e * 0.8 - z + 30 * q * q;
      const sz = 7 + 13 * hs(i, sd + 5), rot = hs(i, sd + 6) * TAU + age * (4 + 6 * hs(i, sd + 7));
      c.save(); c.translate(x, y); c.rotate(rot);
      c.beginPath(); c.moveTo(sz, 0); c.lineTo(-sz * 0.5, -sz * 0.6); c.lineTo(-sz * 0.35, sz * 0.55); c.closePath();
      c.fillStyle = rgba(K.red, 0.9 * a); c.fill(); c.lineJoin = 'round'; c.lineWidth = 2.2; c.strokeStyle = rgba(K.ink, 0.75 * a); c.stroke();
      c.beginPath(); c.moveTo(sz * 0.75, 0); c.lineTo(-sz * 0.1, -sz * 0.25); c.lineTo(-sz * 0.05, sz * 0.2); c.closePath(); c.fillStyle = rgba(K.gold, 0.85 * a); c.fill();
      c.restore();
      const gl = Math.pow(Math.max(0, Math.sin(age * 16 + i * 2.3)), 6);
      if (gl > 0.2 && i % 2 === 0) add(c, () => glint(c, x, y, 8 + 8 * gl, rot, K.hot, gl * a));
    }
    for (let i = 0; i < cnt(3); i++) glow(c, cx + (hs(i, sd + 9) - 0.5) * 80 + 20 * q * (i - 1), cy - 10 - 80 * q * (0.6 + 0.4 * hs(i, sd)), 18 + 20 * q, '#c9bfb2', 0.09 * (1 - q));
  }
  function glassOver(c, ev, t) {
    const list = ev.s, u = t - ev.start; if (!list || !ev.foot || u < 0) return;
    const W = waveOf(ev); if (u > W.A[W.A.length - 1] + 1.4) return;
    c.save(); clipRoom(c);
    if (u < 0.6) {   // the stamp: a ring thrown out of the foot sheet and sparks
      const q = c01(u / 0.6), fx = ev.foot[0], fy = ev.foot[1];
      bandRing(c, fx, fy, 24 + 120 * eo3(q), 40 * (1 - q * 0.6), 0.85 * (1 - ei(q)), FIREP);
      add(c, () => { glow(c, fx, fy, 100 * (1 - q) + 30, K.hot, 0.5 * (1 - q)); for (let i = 0; i < cnt(10); i++) { const an = hs(i, 161) * TAU, sp = 90 + 160 * hs(i, 162); streak(c, fx + Math.cos(an) * sp * Math.max(0, u - 0.06), fy + Math.sin(an) * sp * Math.max(0, u - 0.06) * 0.8, fx + Math.cos(an) * sp * u, fy + Math.sin(an) * sp * u * 0.8, 2.4, 0.9 * (1 - q)); } });
    }
    for (const s of list) { const age = u - s[2]; if (age >= 0 && age < 1.3) shatter(c, s[0], s[1], age, sdOf(s[0], s[1])); }
    c.restore();
  }

  // ---- the sunk sheets
  const waterSprite = v => sprite('svwater' + v, 150, 150, g => {
    g.beginPath(); g.roundRect(3, 3, 144, 144, 5);
    const gr = g.createRadialGradient(75, 75, 6, 75, 75, 100); gr.addColorStop(0, '#0d1016'); gr.addColorStop(0.7, '#07090d'); gr.addColorStop(1, '#030406');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {   // (the rings of old boils, and a few slow waves)
      const x = 20 + hs(i, v * 9 + 1) * 110, y = 20 + hs(i, v * 9 + 2) * 110, rr = 8 + hs(i, v * 9 + 3) * 26;
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,106,32,0.12)'; g.stroke();
    }
    for (let j = 0; j < 6; j++) { g.beginPath(); for (let x = 6; x <= 144; x += 6) { const y = 18 + j * 23 + Math.sin(x * 0.09 + j * 1.7 + v * 2) * 3.5; x === 6 ? g.moveTo(x, y) : g.lineTo(x, y); } g.lineWidth = 1.4; g.strokeStyle = 'rgba(150,50,16,0.26)'; g.stroke(); }
    g.restore();
    g.lineJoin = 'round'; g.beginPath(); g.roundRect(3, 3, 144, 144, 5); g.lineWidth = 4; g.strokeStyle = 'rgba(8,3,2,0.9)'; g.stroke();
    g.beginPath(); g.roundRect(7, 7, 136, 136, 4); g.lineWidth = 3.4; g.strokeStyle = 'rgba(255,106,32,0.5)'; g.stroke(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,214,130,0.55)'; g.stroke();
  });
  function trackSunk(room, t) {
    const ev = room.ev.svsheets; if (!ev && !S.sunk.size) return;
    const list = (ev && ev.sunk) || [], have = new Set(); let ab = null;
    for (const p of list) {
      const k = hkey(p[0], p[1]); have.add(k); const o = S.sunk.get(k);
      if (!o) {
        if (!ab) { ab = new Map(); for (const kk in room.ev) if (kk.startsWith('svglass:')) { const g = room.ev[kk]; if (g.s) for (const s of g.s) ab.set(hkey(s[0], s[1]), g.start + s[2]); } }
        const sc = ab.get(k);
        S.sunk.set(k, { cx: p[0], cy: p[1], since: sc != null && sc <= t ? sc : t, gone: null, sd: sdOf(p[0], p[1]), v: Math.abs((p[0] / SHW) * 2 + p[1] / SHW | 0) % 3 });
      } else if (o.gone != null) o.gone = null;
    }
    for (const [k, o] of S.sunk) { if (have.has(k)) continue; if (o.gone == null) o.gone = t; else if (t > o.gone + 1.6) S.sunk.delete(k); }
  }
  // how hard each sunk sheet is boiling: from the dive's message on (a little, then more), and under a steam circle until it bursts
  function boilMap(room, t) {
    let bm = null;
    for (const k in room.ev) if (k.startsWith('svdive:')) {
      const ev = room.ev[k], at = ev.at || 5.4, u = t - ev.start; if (u < 0 || u > at + 4.6 || !ev.boil) continue;
      bm = bm || new Map(); const v = 0.35 + 0.25 * c01(u / at); for (const b of ev.boil) { const kk = hkey(b[0], b[1]); bm.set(kk, Math.max(bm.get(kk) || 0, v)); }
    }
    for (const r of S.recs) if (r.tag === 'svSteam' && !r.cancel) {
      const age = t - r.land, v = age < 0 ? 0.55 + 0.45 * c01((t - r.start) / r.dur) : age < 2.6 ? 0.5 * (1 - age / 2.6) : 0;
      if (v > 0) { bm = bm || new Map(); const kk = hkey(Math.round(r.s.x / SHW) * SHW, Math.round(r.s.y / SHW) * SHW); bm.set(kk, Math.max(bm.get(kk) || 0, v)); }
    }
    return bm;
  }
  function sunkSheet(c, o, t, bm) {
    const x = o.cx, y = o.cy, sd = o.sd, age = t - o.since, k = c01(age / 0.7) * (o.gone != null ? 1 - c01((t - o.gone) / 1.5) : 1);
    if (k < 0.02) return;
    const g = waterSprite(o.v); if (!g) return;
    const boil = bm ? bm.get(hkey(x, y)) || 0 : 0;
    c.globalAlpha = 0.96 * k; c.drawImage(g, x - 75, y - 75, 150, 150); c.globalAlpha = 1;
    add(c, () => {
      c.lineWidth = 5; c.strokeStyle = rgba(K.ember, (0.14 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.6 + sd)) + 0.35 * boil) * k); c.strokeRect(x - 70, y - 70, 140, 140);   // (the ember rim: it reads as 'not here' without any painted safe spot)
      for (let j = 0; j < 2; j++) glow(c, x + Math.sin(t * 0.5 + sd + j * 2.6) * 46, y + Math.cos(t * 0.37 + sd * 1.3 + j * 1.9) * 46, 34, K.ember, (0.07 + 0.08 * boil) * k);
      if (age < 0.6) { const q = c01(age / 0.6); c.beginPath(); c.arc(x, y, 18 + 50 * eo3(q), 0, TAU); c.lineWidth = 4 * (1 - q); c.strokeStyle = rgba(K.gold, 0.7 * (1 - q)); c.stroke(); }
    });
    // bubbles rising and popping (more of them, faster, when the water boils)
    const nB = cnt(5 + Math.round(5 * boil)), rate = 0.6 + 0.9 * boil;
    for (let i = 0; i < nB; i++) {
      const tt = t * rate * (0.7 + 0.6 * hs(i, sd + 20)) + hs(i, sd + 21), cyc = Math.floor(tt), ph = tt - cyc;
      const bx = x + (hs(i + cyc * 7, sd + 22) - 0.5) * 112, by = y + (hs(i + cyc * 7, sd + 23) - 0.5) * 112, rm = 3 + 4 * hs(i, sd + 24);
      c.beginPath();
      if (ph < 0.75) { c.arc(bx, by, 1 + rm * (ph / 0.75), 0, TAU); c.lineWidth = 2.2; c.strokeStyle = rgba(K.ink, 0.6 * k); c.stroke(); c.lineWidth = 1; c.strokeStyle = rgba(K.amber, 0.65 * k); c.stroke(); }
      else { const q = (ph - 0.75) / 0.25; c.arc(bx, by, rm + 9 * q, 0, TAU); c.lineWidth = 1.6 * (1 - q); c.strokeStyle = rgba(K.amber, 0.6 * (1 - q) * k); c.stroke(); if (q < 0.5) add(c, () => glow(c, bx, by - 4 * q, 7, K.hot, 0.5 * (1 - q * 2) * k)); }
    }
    // steam wisps
    const nW = cnt(2 + Math.round(2 * boil));
    for (let i = 0; i < nW; i++) {
      const ph = (t * (0.2 + 0.1 * boil) + hs(i, sd + 30)) % 1;
      glow(c, x + (hs(i, sd + 31) - 0.5) * 90 + Math.sin(t * 0.9 + i * 2) * 8 * ph, y - 4 - ph * (46 + 40 * boil), 16 + 22 * ph, '#c9bfb2', Math.sin(ph * Math.PI) * (0.17 + 0.14 * boil) * k);
    }
  }
  function sunkUnder(c, room, t) {
    { const ac = room.ev.svact && room.ev.svact.act; if (ac === 3 || ac === 4 || ac === 'night') { S.sunk.clear(); return; } }   // (the forge's black water is Act II's: Act IV's glass patch sinks nothing)
    trackSunk(room, t);
    if (!S.sunk.size) return;
    const bm = boilMap(room, t);
    c.save(); clipRoom(c);
    for (const o of S.sunk.values()) sunkSheet(c, o, t, bm);
    c.restore();
  }

  // ---- Heads of Flame (svhead:k, svcut:k, svbite:n + the svBite tag)
  const headDir = ev => Math.atan2(ev.y, ev.x);   // (the add's `facing`: out from the middle; its neck runs back toward it)
  // the floor sigil burning in stroke by stroke: the ring runs clockwise from the top, then the ticks, then a serpent's S
  function sigil(c, x, y, p, a) {
    const rp = c01(p / 0.55), sp = c01((p - 0.4) / 0.6), R0 = 58;
    c.save(); c.translate(x, y); c.lineCap = c.lineJoin = 'round';
    const strokes = fn => { for (const [w, col, al, ad] of [[8, K.ink, 0.5, 0], [4.6, K.ember, 0.95, 1], [2, K.gold, 1, 1], [0.8, K.white, 0.9, 1]]) { c.globalCompositeOperation = ad ? 'lighter' : 'source-over'; c.lineWidth = w; c.strokeStyle = rgba(col, al * a); fn(); c.stroke(); } c.globalCompositeOperation = 'source-over'; };
    if (rp > 0) strokes(() => { c.beginPath(); c.arc(0, 0, R0, UP, UP + TAU * rp); });
    if (rp > 0.1) strokes(() => { c.beginPath(); for (let i = 0; i < 8; i++) { if (rp < 0.1 + i * 0.11) break; const an = UP + i * TAU / 8; c.moveTo(Math.cos(an) * (R0 - 11), Math.sin(an) * (R0 - 11)); c.lineTo(Math.cos(an) * (R0 - 3), Math.sin(an) * (R0 - 3)); } });
    if (sp > 0) { c.setLineDash([130, 130]); c.lineDashOffset = 130 * (1 - sp); strokes(() => { c.beginPath(); c.moveTo(-24, 24); c.bezierCurveTo(-38, 4, -6, -2, 6, -12); c.bezierCurveTo(16, -20, 10, -34, -6, -30); c.bezierCurveTo(-12, -28, -10, -18, -2, -20); }); c.setLineDash([]); }
    c.restore();
  }
  const HEAD_NECK = 118;
  function headUnder(c, ev, key, room, t) {
    const x = ev.x, y = ev.y, rs = +ev.rise || 2, u = t - ev.start;
    if (u < -0.1) return;
    const cut = room.ev['svcut:' + key.slice(7)], kIn = c01((u + 0.1) / 0.3);
    if (cut) {   // (the stump has the place now: just the sigil's ring, scorched)
      const ca = c01((t - cut.start) / 1.5);
      sigil(c, x, y, 1, 0.5 * (1 - ca) * kIn);
      return;
    }
    const stand = u >= rs, p = c01(u / (rs * 0.7)), fl = 0.5 + 0.5 * Math.sin(t * 6 + x);
    c.save(); clipRoom(c);
    add(c, () => glow(c, x, y, 96, K.ember, (stand ? 0.1 + 0.04 * fl : 0.05 + 0.2 * p) * kIn));
    sigil(c, x, y, p, (stand ? 0.5 + 0.12 * fl : 0.5 + 0.5 * p) * kIn);
    if (!stand) {   // the fire gathering in it: a fountain of tongues that climbs toward the rise
      const q = c01((u - rs * 0.45) / (rs * 0.55));
      for (let i = 0; i < cnt(7); i++) tongue(c, x + (i - 3) * 9, y + 6, UP + (i - 3) * 0.12, (16 + 56 * q) * (0.6 + 0.4 * hs(i, 81)), 14, t * 2 + i, FIRE, 0.8 * q);
    }
    rise(c, x, y, { n: stand ? 4 : 8, t, per: stand ? 2.2 : 1.2, rise: stand ? 60 : 90, spread: 70, size: 2.4, a: 0.7 * kIn, seed: 83 + (x > 0 ? 1 : 0) });
    c.restore();
  }
  function headOver(c, ev, key, room, t) {
    const x = ev.x, y = ev.y, rs = +ev.rise || 2, u = t - ev.start, f = headDir(ev);
    if (u < rs - 1.3 || room.ev['svcut:' + key.slice(7)]) return;
    c.save(); clipRoom(c);
    if (u < rs + 0.4) {   // the rise: a head of fire climbing out of the sigil on a neck of fire, handing over to the real head as it stands
      const q = eo3(c01((u - (rs - 1.3)) / 1.3)), a = Math.min(1, q * 3) * (u < rs ? 1 : 1 - c01((u - rs) / 0.4));
      const pts = []; for (let i = 0; i <= 9; i++) { const qq = i / 9, d = HEAD_NECK * q * qq, sw = Math.sin(qq * 3.4 + t * 2 + x) * 10 * qq; pts.push([x - Math.cos(f) * d - Math.sin(f) * sw * -1, y - Math.sin(f) * d + Math.cos(f) * sw * -1]); }
      ribbonPts(c, pts, 17 * (0.5 + 0.5 * q), 7, 0.8 * a);
      fireHead(c, x, y - 34 * (1 - q), f, 0.4 + 0.9 * q, a, t, 0.2 + 0.5 * Math.sin(q * Math.PI));
      add(c, () => glow(c, x, y - 10, 70, K.hot, 0.3 * q * a));
    }
    if (u >= rs && u < rs + 0.7) {   // it stands: a burst
      const q = c01((u - rs) / 0.7);
      add(c, () => { glow(c, x, y, 110 * (1 - q) + 30, K.hot, 0.55 * (1 - q)); c.beginPath(); c.arc(x, y + 6, 20 + 80 * eo3(q), 0, TAU); c.lineWidth = 4 * (1 - q); c.strokeStyle = rgba(K.gold, 0.8 * (1 - q)); c.stroke(); });
      for (let i = 0; i < cnt(8); i++) tongue(c, x + Math.cos(i * TAU / 8) * 24, y + Math.sin(i * TAU / 8) * 20, UP, (30 + 24 * hs(i, 91)) * (1 - q), 14, t * 2 + i, FIRE, 0.8 * (1 - q));
    }
    if (u >= rs + 0.2) {   // an ember flicker round the standing head: tongues licking up off the skull, embers, a flare now and then, the neck smouldering
      const k = c01((u - rs - 0.2) / 0.5), fl = Math.pow(Math.max(0, Math.sin(t * 5.3 + x * 0.1)), 8);
      for (let i = 0; i < 3; i++) tongue(c, x - 8 + i * 11, y - 8, UP + (i - 1) * 0.3, 28 + 12 * Math.sin(t * 7 + i * 2) + 18 * fl, 15, t * 2.4 + i, FIRE, 0.7 * k);
      add(c, () => {
        glow(c, x, y - 4, 52, K.ember, (0.2 + 0.15 * fl) * k); glow(c, x + Math.cos(f) * 24, y + Math.sin(f) * 24 - 4, 26, K.amber, (0.16 + 0.2 * fl) * k);
        for (let i = 1; i <= 4; i++) { const d = HEAD_NECK * i / 5, pu = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 1.7 + x); glow(c, x - Math.cos(f) * d, y - Math.sin(f) * d, 9 + 5 * pu, K.ember, 0.18 * pu * k); }
      });
      rise(c, x, y - 6, { n: 7, t, per: 1.5, rise: 54, spread: 40, size: 2.2, a: 0.85 * k, seed: 95 + (x > 0 ? 1 : 0) });
    }
    c.restore();
  }
  // the cut: the head folds, burning, into its neck and a flash goes up; the stump's fire pool takes over under it
  function cutOver(c, ev, key, room, t) {
    const age = t - ev.start; if (age < 0 || age > 1.3) return;
    const hv = room.ev['svhead:' + key.slice(6)], f = headDir(ev), x = ev.x, y = ev.y, q = c01(age / 0.9), a = 1 - ei(q);
    c.save(); clipRoom(c);
    if (q < 1) {
      const pts = []; for (let i = 0; i <= 8; i++) { const qq = i / 8, d = HEAD_NECK * (1 - 0.7 * q) * qq, sw = Math.sin(qq * 3.4 + t * 5) * 14 * qq; pts.push([x - Math.cos(f) * d + Math.sin(f) * sw, y - Math.sin(f) * d - Math.cos(f) * sw + 18 * q * qq]); }
      ribbonPts(c, pts, 15 * (1 - 0.5 * q), 6, 0.75 * a, { fade: true });
      fireHead(c, x, y + 16 * q, f + 0.7 * q, 1 - 0.55 * q, a, t, 0.9);
    }
    add(c, () => {
      glow(c, x, y - 8, 100 * (1 - c01(age / 0.35)) + 30, K.hot, 0.65 * (1 - c01(age / 0.35)));
      c.beginPath(); c.arc(x, y + 4, 18 + 90 * eo3(c01(age / 0.6)), 0, TAU); c.lineWidth = 4 * (1 - c01(age / 0.6)); c.strokeStyle = rgba(K.gold, 0.8 * (1 - c01(age / 0.6))); c.stroke();
      for (let i = 0; i < cnt(14); i++) { const an = hs(i, 171) * TAU, sp = 40 + 110 * hs(i, 172), d = sp * Math.min(age, 0.9), z = 60 * Math.sin(Math.min(1, age / 1.0) * Math.PI) * hs(i, 173); glow(c, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.7 - z, 4 + 3 * hs(i, 174), i % 3 ? K.ember : K.hot, (1 - q) * 0.9); }
    });
    c.restore();
  }
  // the stump: a charred stub of neck in a small pool of fire (a hazard: its rim burns ring-wide, and it crackles)
  function stumpUnder(c, ev, t) {
    const age = t - ev.start; if (age < 0) return;
    const x = ev.x, y = ev.y, k = c01(age / 0.6), sd = sdOf(x, y), fl = 0.5 + 0.5 * Math.sin(t * 7 + sd);
    c.save(); clipRoom(c);
    scorch(c, x, y, 82, k * 0.95, ev.burnt ? 0.15 : 0.6 + 0.25 * fl, sd, K.ember);
    if (ev.burnt) { ellipse(c, x, y + 3, 17, 11, 0, rgba('#1b0c08', k), rgba(K.ink, 0.9 * k), 2.4); ellipse(c, x, y - 2, 11, 6.5, 0, rgba('#2a1410', k), null); c.restore(); return; }
    add(c, () => {
      glow(c, x, y, 68, K.ember, 0.28 * k); glow(c, x, y, 40, K.amber, (0.16 + 0.08 * fl) * k);
      c.beginPath(); c.arc(x, y, 62, 0, TAU); c.lineWidth = 5; c.strokeStyle = rgba(K.red, (0.4 + 0.2 * fl) * k); c.stroke(); c.lineWidth = 1.6; c.strokeStyle = rgba(K.gold, 0.55 * k); c.stroke();
    });
    const n = cnt(10);
    for (let i = 0; i < n; i++) { const an = i * TAU / n + hs(i, sd) * 0.3, ln = 13 + 12 * hs(i, sd + 1) + 7 * Math.sin(t * 6 + i * 1.9); tongue(c, x + Math.cos(an) * 58, y + Math.sin(an) * 56 + 4, UP, ln, 12, t * 2.2 + i, FIRE, 0.62 * k); }
    ellipse(c, x, y + 3, 17, 11, 0, rgba('#1b0c08', k), rgba(K.ink, 0.9 * k), 2.4);
    ellipse(c, x, y - 2, 11, 6.5, 0, rgba('#6a2210', k), null);
    add(c, () => { glow(c, x, y - 2, 14, K.hot, 0.5 * k); });
    for (let i = 0; i < 3; i++) tongue(c, x + (i - 1) * 7, y - 3, UP + (i - 1) * 0.18, 30 + 12 * Math.sin(t * 5.5 + i * 2.1) + (i % 2) * 6, 14, t * 2 + i, FIRE, 0.85 * k);
    add(c, () => {
      for (let i = 0; i < cnt(5); i++) {   // (crackle: a spark that jumps and is gone)
        const pk = Math.pow(Math.max(0, Math.sin(t * 6 + hs(i, sd + 5) * 40)), 14); if (pk < 0.15) continue;
        const cyc = Math.floor(t * 6 / TAU + hs(i, sd + 5) * 40 / TAU), an = hs(i + cyc, sd + 6) * TAU, d = 14 + 44 * hs(i + cyc, sd + 7);
        glint(c, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.9 - 6, 5 + 4 * pk, an, K.hot, pk * k);
      }
    });
    rise(c, x, y - 4, { n: 6, t, per: 1.4, rise: 56, spread: 46, size: 2.2, a: 0.75 * k, seed: sd });
    c.restore();
  }
  const headOfBite = (r, room) => {
    if (r.head) return r.head;
    let best = null, bd = 1e9;
    for (const k in room.ev) if (k.startsWith('svbite:')) { const e = room.ev[k], d = Math.abs(e.start - r.start) + (e.id === r.target ? 0 : 5); if (d < bd) { bd = d; best = e; } }
    return best && bd < 1.2 ? (r.head = { x: best.x, y: best.y }) : null;
  };
  // the bite: a glyph and cinders drawn into the head's maw while the circle is on the hero, then a lunge, the jaws closing, a fan of fire into the circle
  TELL.svBite = {
    under(c, r, t) {
      const room = S.room, h = room && headOfBite(r, room); if (!h || r.cancel) return;
      const u = t - r.start, p = c01(u / r.dur), age = t - r.land; if (age >= 0) return;
      const k = c01(u / 0.4) * (0.3 + 0.7 * p), f = Math.atan2(h.y, h.x), mx = h.x + Math.cos(f) * 30, my = h.y + Math.sin(f) * 30;
      glyph(c, h.x, h.y + 4, 36 + 6 * p, 0.7 * k, u, 6);
      add(c, () => {
        glow(c, mx, my, 16 + 26 * p, K.ember, (0.1 + 0.4 * p) * k);
        for (let i = 0; i < cnt(8); i++) { const ph = (u * 0.8 + hs(i, 181)) % 1, an = hs(i, 182) * TAU + ph * 2, d = 80 * (1 - ph) + 8; glow(c, mx + Math.cos(an) * d, my + Math.sin(an) * d * 0.8, 2.6 + 2 * hs(i, 183), ph > 0.6 ? K.hot : K.ember, Math.sin(ph * Math.PI) * 0.8 * k); }
      });
    },
    over(c, r, t) {
      const room = S.room, h = room && headOfBite(r, room), age = t - r.land; if (!h || r.cancel || age < 0 || age > 1.5) return;
      const T = r.s, f = Math.atan2(T.y - h.y, T.x - h.x), dist = Math.hypot(T.x - h.x, T.y - h.y), R = Math.min(T.r || 100, 100);
      c.save(); clipRoom(c);
      const lq = eo3(c01(age / 0.14)), back = c01((age - 0.34) / 0.3), hq = Math.min(1, lq) * (1 - eo3(back)), px = lerp(h.x, T.x - Math.cos(f) * 34, hq), py = lerp(h.y, T.y - Math.sin(f) * 34, hq) - 18 * Math.sin(Math.min(1, age / 0.14) * Math.PI);
      if (age < 0.62) {
        const pts = []; for (let i = 0; i <= 8; i++) { const q = i / 8; pts.push([lerp(h.x, px, q), lerp(h.y, py, q) - 14 * Math.sin(q * Math.PI)]); }
        const a = 1 - ei(c01((age - 0.3) / 0.32));
        ribbonPts(c, pts, 15, 6, 0.85 * a);
        fireHead(c, px, py, f, 1.1, a, t, age < 0.14 ? 1 : age < 0.3 ? 0.1 : 0.7);
      }
      if (age > 0.1) {   // the fan: a spray of fire thrown on into the circle, the bite's two crescents closing, a ring, embers
        const q = c01((age - 0.1) / 0.75), a = 0.8 * (1 - ei(q)), reach = R * 0.95 * eo3(c01((age - 0.1) / 0.3));
        for (let i = -4; i <= 4; i += stp()) tongue(c, T.x + Math.cos(f) * -10, T.y + Math.sin(f) * -10, f + i * 0.2, reach * (0.6 + 0.4 * Math.cos(i * 0.2)) * (1 - 0.3 * q), 24, t * 2 + i, FIRE, 0.9 * a);
        add(c, () => {
          glow(c, T.x, T.y, 70 * (1 - q) + 30, K.hot, 0.5 * (1 - q));
          const cl = c01((age - 0.1) / 0.15);   // (the jaws: two crescents closing across the mark)
          for (const sd of [-1, 1]) { c.beginPath(); c.arc(T.x, T.y, 46, f + sd * (Math.PI * 0.5 + 0.9 * (1 - cl)) - 0.8, f + sd * (Math.PI * 0.5 + 0.9 * (1 - cl)) + 0.8); c.lineWidth = 5 * a; c.strokeStyle = rgba(K.hot, 0.9 * a); c.stroke(); }
          c.beginPath(); c.arc(T.x, T.y, 20 + (R - 10) * eo3(q), 0, TAU); c.lineWidth = 3 * (1 - q); c.strokeStyle = rgba(K.gold, 0.7 * a); c.stroke();
          for (let i = 0; i < cnt(12); i++) { const an = f + (hs(i, 191) - 0.5) * 2.2, sp = 70 + 150 * hs(i, 192), d = sp * Math.min(age, 0.9), z = 24 * Math.sin(Math.min(1, age * 1.5) * Math.PI * 0.5); streak(c, T.x + Math.cos(an) * d * 0.8, T.y + Math.sin(an) * d * 0.8 - z, T.x + Math.cos(an) * Math.max(0, d - 18), T.y + Math.sin(an) * Math.max(0, d - 18) - z, 2.2, a * 0.9); }
        });
      }
      c.restore();
    },
  };

  // ---- Cinder Dive (the tags svDiveLand, svDivePath, svAfter, svSteam, and svdive:n for the boil)
  // the chosen spot glows first; the line of embers ignites from the far end toward it; the dive streaks down it as a comet of fire with wings of flame;
  // the landing slams and the crater cools; the Aftershock ring rolls out over everything but the quiet middle; steam columns burst at every sunk sheet crossed
  const DIVE_FLY = 1.4;
  TELL.svDiveLand = {
    under(c, r, t) {
      const L = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.5) * (0.3 + 0.7 * p);
        c.save(); clipRoom(c);
        add(c, () => { glow(c, L.x, L.y, 130, K.ember, (0.08 + 0.3 * ei(p)) * k); glow(c, L.x, L.y, 64, K.amber, (0.05 + 0.3 * ei(p)) * k); });
        glyph(c, L.x, L.y, 82, k, u, 12);
        rise(c, L.x, L.y, { n: 12, t, per: 1.5, rise: 70, spread: 110, size: 2.6, a: 0.8 * k, seed: 101 });
        c.restore();
      } else if (age < 9 && !r.cancel) {   // the crater, cooling: a blot, cracks, a glowing middle
        const fade = 1 - c01(age / 9), heat = 1 - c01(age / 6);
        c.save(); clipRoom(c);
        scorch(c, L.x, L.y, 140, fade, heat, r.sd, K.ember);
        crackLines(c, L.x, L.y, 12, 30, 150, r.sd + 3, fade, heat);
        add(c, () => glow(c, L.x, L.y, 80, K.ember, 0.3 * heat));
        c.restore();
      }
    },
    over(c, r, t) {
      const L = r.s, age = t - r.land; if (age < 0 || age > 2 || r.cancel) return;
      const q = c01(age / 0.45), q2 = c01(age / 1.4), R = L.r || 120;
      c.save(); clipRoom(c);
      bandRing(c, L.x, L.y, 30 + (R + 30) * eo3(q), 58 * (1 - 0.6 * q), 0.9 * (1 - ei(q)), FIREP);
      if (q < 1) for (let i = 0; i < 20; i += stp()) { const an = i * TAU / 20 + hs(i, 201) * 0.1, rr = (30 + (R + 30) * eo3(q)); tongue(c, L.x + Math.cos(an) * rr, L.y + Math.sin(an) * rr * 0.9, an, (36 + 30 * hs(i, 202)) * (1 - q * 0.6), 22, t * 2 + i, FIRE, 0.9 * (1 - ei(q))); }
      for (let i = 0; i < 5; i++) tongue(c, L.x + (i - 2) * 14, L.y + 4, UP + (i - 2) * 0.1, (130 - 24 * Math.abs(i - 2)) * (1 - ei(q2)) * eo3(c01(age / 0.15)), 30, t * 2 + i, FIRE, 0.9 * (1 - ei(q2)));
      add(c, () => {
        glow(c, L.x, L.y, 240 * (1 - c01(age / 0.4)) + 60, K.hot, 0.8 * (1 - c01(age / 0.4)));
        for (let i = 0; i < cnt(8); i++) { const an = hs(i, 203) * TAU, sp = 90 + 150 * hs(i, 204), d = sp * Math.min(age, 1.1), z = 110 * hs(i, 205) * Math.sin(Math.min(1, age / 1.2) * Math.PI); glow(c, L.x + Math.cos(an) * d, L.y + Math.sin(an) * d * 0.7 - z, 7, i % 2 ? K.amber : K.hot, (1 - q2) * 0.9); glow(c, L.x + Math.cos(an) * d, L.y + Math.sin(an) * d * 0.7 - z, 3, K.white, 1 - q2); }
      });
      for (let i = 0; i < cnt(5); i++) { const rr = 90 + 150 * eo3(q2), an = i * TAU / 5 + hs(i, 206); glow(c, L.x + Math.cos(an) * rr, L.y + Math.sin(an) * rr * 0.6 - 10 * q2, 30 + 20 * q2, '#a39a8e', 0.2 * (1 - q2)); }   // (dust rolling out)
      c.restore();
    },
  };
  TELL.svDivePath = {
    under(c, r, t) {
      const s = r.s, u = t - r.start, age = t - r.land; if (age > 6 || (r.cancel && age > 0.3)) return;
      const ux = Math.cos(s.angle), uy = Math.sin(s.angle), nx = -uy, ny = ux, len = s.len, IG = 0.9, front = len * c01((u + 0.05) / IG);
      const heat = age < 0 ? 0.4 + 0.6 * c01(u / r.dur) : 1 - c01(age / 6), n = Math.floor(len / 36);
      c.save(); clipRoom(c);
      for (let i = 1; i < n; i += stp()) {
        const d = i * 36 + 14; if (d > front) break;
        const px = s.x + ux * d + nx * (hs(i, 131) - 0.5) * 66, py = s.y + uy * d + ny * (hs(i, 131) - 0.5) * 66, fl = Math.exp(-(u - (d / len) * IG) * 4) * (age < 0 ? 1 : 0);
        ellipse(c, px, py + 2, 15, 9, 0, rgba(K.ink, 0.3 * heat), null);
        add(c, () => glow(c, px, py, 20 + 12 * fl, K.ember, (0.3 + 0.35 * fl) * heat));
        tongue(c, px, py + 3, UP, (10 + 14 * hs(i, 132) + 24 * fl) * (0.4 + 0.6 * heat), 11, t * 2 + i, FIRE, 0.75 * heat);
        if (fl > 0.2) add(c, () => glint(c, px, py - 4, 6 + 8 * fl, 0.4, K.hot, fl));
      }
      c.restore();
    },
    over(c, r, t) {
      const s = r.s, u = t - (r.land - DIVE_FLY); if (r.cancel || u < -0.05 || u > DIVE_FLY + 0.05) return;
      const q = c01(u / DIVE_FLY), ux = Math.cos(s.angle), uy = Math.sin(s.angle), x1 = s.x, y1 = s.y, x2 = s.x + ux * s.len, y2 = s.y + uy * s.len;
      const pos = qq => { const e = Math.pow(c01(qq), 1.7), z = 250 * Math.pow(1 - e, 1.4); return [lerp(x1, x2, e), lerp(y1, y2, e) - z, lerp(x1, x2, e), lerp(y1, y2, e)]; };
      const H = pos(q), P = pos(q - 0.03), dx = H[0] - P[0], dy = H[1] - P[1], back = Math.atan2(-dy, -dx) || Math.PI;
      c.save();
      c.beginPath(); c.ellipse(H[2], H[3] + 4, 26 + 26 * q, 9 + 8 * q, 0, 0, TAU); c.fillStyle = rgba(K.ink, 0.35 * q); c.fill();   // (its shadow, growing as it comes down)
      const N = LOW ? 8 : 15, tr = []; for (let k = 0; k < N; k++) { const pp = pos(q - k * 0.032); tr.push([pp[0], pp[1]]); }
      ribbonPts(c, tr, 46, 4, 0.95, { fade: true });
      for (let side = -1; side <= 1; side += 2) for (let j = 0; j < 5; j++) {   // (wings of flame, swept back and beating)
        const an = back + side * (0.5 + 0.17 * j + 0.06 * Math.sin(t * 16 + j)), ln = 135 - 14 * j + 14 * (j % 2);
        tongue(c, H[0], H[1], an, ln, 32, t * 3 + j * 0.7 + side, FIRE, 0.88);
      }
      ellipse(c, H[0], H[1], 36, 15, Math.atan2(dy, dx), rgba(K.ink, 0.6), null);
      for (const [rx, ry, col] of [[31, 13, K.red], [24, 10, K.ember], [17, 7, K.gold], [9, 4, K.white]]) ellipse(c, H[0], H[1], rx, ry, Math.atan2(dy, dx), col, null);
      add(c, () => { glow(c, H[0], H[1], 90, K.ember, 0.5); glow(c, H[0], H[1], 38, K.hot, 0.7); });
      c.restore();
    },
  };
  // the Aftershock: cracks growing in the danger ring while it winds up, then a ring of fire rolling out from the edge of the quiet middle
  TELL.svAfter = {
    under(c, r, t) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land, r2 = s.r2 || 240;
      if (age < 0) {
        c.save(); clipRoom(c);
        crackLines(c, s.x, s.y, LOW ? 8 : 14, r2 + 10, r2 + 10 + 320 * eo3(p), r.sd + 7, 0.8 * c01(u / 0.4), 0.3 + 0.7 * p);
        add(c, () => glow(c, s.x, s.y, 150, K.ember, 0.06 + 0.2 * p * (0.6 + 0.4 * Math.sin(u * 7))));
        c.restore();
      }
    },
    over(c, r, t) {
      const s = r.s, age = t - r.land, r2 = s.r2 || 240, maxR = RR() + 110; if (age < 0 || age > 1.7 || r.cancel) return;
      c.save(); clipRoom(c);
      for (const [dl, wm, am] of [[0, 1, 1], [0.3, 0.55, 0.6]]) {
        const q = c01((age - dl) / 1.3); if (q <= 0 || q >= 1) continue;
        const w = 64 * wm * (1 - 0.5 * q), rr = lerp(r2 + 0.75 * w + 4, maxR, q), a = 0.9 * am * (1 - ei(q));
        bandRing(c, s.x, s.y, rr, w, a, FIREP);
        for (let i = 0; i < 36; i += stp()) { const an = i * TAU / 36 + hs(i, 211) * 0.1; tongue(c, s.x + Math.cos(an) * (rr + w * 0.3), s.y + Math.sin(an) * (rr + w * 0.3), an, (30 + 26 * hs(i, 212)) * (1 - q * 0.6) * wm, 20, t * 2 + i * 0.6, FIRE, a * 0.8); }
      }
      c.restore();
    },
  };
  // the steam: the water hisses under the circle, then a column bursts up, a ring of steam, ground mist lingering
  TELL.svSteam = {
    under(c, r, t) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.4) * (0.3 + 0.7 * p);
        c.save(); clipRoom(c);
        add(c, () => glow(c, s.x, s.y, 76, K.ember, (0.06 + 0.3 * ei(p)) * k));
        for (let i = 0; i < cnt(3); i++) { const ph = (t * (0.5 + 0.5 * p) + hs(i, 221)) % 1; glow(c, s.x + (hs(i, 222) - 0.5) * 60, s.y - ph * (24 + 50 * p), 12 + 12 * ph, '#d8d0c4', Math.sin(ph * Math.PI) * 0.25 * k); }
        c.restore();
      }
    },
    over(c, r, t) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 4 || r.cancel) return;
      c.save();
      const q = c01(age / 1.6), x = s.x, y = s.y;
      if (age < 0.5) { const jq = eo3(c01(age / 0.22)), jw = 52 * (1 - c01(age / 0.5)); streak(c, x, y, x, y - 250 * jq, jw, 1 - ei(c01(age / 0.5)), { mid: K.ember, hi: K.hot }); add(c, () => glow(c, x, y, 100 * (1 - c01(age / 0.4)) + 30, K.hot, 0.6 * (1 - c01(age / 0.4)))); }
      for (let i = 0; i < cnt(13); i++) {
        const qq = c01((age - i * 0.035) / 1.5); if (qq <= 0 || qq >= 1) continue;
        const px = x + (hs(i, 223) - 0.5) * 36 * qq + Math.sin(t * 2 + i) * 6 * qq, py = y - 24 - qq * (170 + 50 * hs(i, 224)), rr = 30 + 42 * qq, al = Math.pow(1 - qq, 1.1);
        glow(c, px, py, rr * 1.15, '#8a909c', al * 0.6); glow(c, px, py, rr * 0.75, '#efe9e0', al * 0.8);
        if (qq < 0.35) add(c, () => glow(c, px, py + 10, rr * 0.8, K.ember, 0.3 * (1 - qq / 0.35)));
      }
      if (q < 1) { const rq = eo3(q), a = 1 - ei(q); c.beginPath(); c.ellipse(x, y + 4, 20 + 100 * rq, (20 + 100 * rq) * 0.5, 0, 0, TAU); c.lineWidth = 9 * (1 - q) + 1; c.strokeStyle = rgba('#8a909c', 0.25 * a); c.stroke(); c.lineWidth = 2.4 * (1 - q) + 0.5; c.strokeStyle = rgba('#f4efe6', 0.4 * a); c.stroke(); }
      for (let i = 0; i < cnt(4); i++) { const ph = c01((age - 0.3) / 3.5), an = i * TAU / 4 + hs(i, 225), d = 30 + 70 * ph; glow(c, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.5 - 10 * ph, 34 + 20 * ph, '#cfc6ba', 0.16 * (1 - ph)); }   // (mist along the ground)
      c.restore();
    },
  };

  // ---------------------------------------------------------------------------------------------------------------- FX3: Twin Brands (svtwin:n and the tags svMeet svBloom svTwin)
  // Azerath's four elements live on the four walls (fire north, frost east, lightning south, the void west). Each bearer's brand burns on as that element's glyph
  // (under the feet, small over the chest); the lit wall glows along its whole rim; a thread of light links the two. A meet (frost, lightning) ends in a blue blaze
  // at the wall point, a flee (fire, the void) in a red bloom there and a burning ring round each bearer's circle. The shifted cast: the lit wall's light jumps
  // across the room to the new wall (the brands change element with it); the new wall's own telegraphs are the game's.
  const hx = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mixc = (a, b, q) => { const A = hx(a), B = hx(b); return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], c01(q))).toString(16).padStart(2, '0')).join(''); };
  const rad = d => d * Math.PI / 180;
  const ELM = {
    fire: { a: -90, mid: K.ember, hi: K.gold, core: K.hot, pal: FIRE },
    frost: { a: 0, mid: '#59b8ff', hi: '#dff6ff', core: '#ffffff', pal: ['#0b2a5c', '#59b8ff', '#dff6ff'] },
    bolt: { a: 90, mid: '#a47bff', hi: '#fff2a0', core: '#ffffff', pal: ['#2a1670', '#a47bff', '#fff2a0'] },
    void: { a: 180, mid: '#8a34d0', hi: '#e0a8ff', core: '#f6e6ff', pal: ['#0a0310', '#6a24a8', '#d69cff'] },
  };
  for (const k in ELM) ELM[k].key = k;
  const elOf = s => ELM[s] || ELM.fire;
  const elGlyph = el => sprite('tw-' + el, 160, 160, g => {
    const E = ELM[el]; g.translate(80, 80);
    const ring = (r, lw, col, a) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = lw; g.strokeStyle = rgba(col, a); g.stroke(); };
    ring(62, 11, K.ink, 0.6); ring(62, 5, E.mid, 1); ring(62, 1.8, E.hi, 1); ring(47, 2.5, E.mid, 0.85);
    g.lineCap = g.lineJoin = 'round';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(Math.cos(a) * 51, Math.sin(a) * 51); g.lineTo(Math.cos(a) * 59, Math.sin(a) * 59); g.strokeStyle = rgba(E.hi, 0.95); g.lineWidth = 3; g.stroke(); }
    const done = fill => { g.strokeStyle = rgba(K.ink, 0.8); g.lineWidth = 8; g.stroke(); if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = rgba(E.hi, 1); g.lineWidth = 3.4; g.stroke(); };
    if (el === 'fire') {
      g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-27, 11, -21, -14, -4, -40); g.bezierCurveTo(-2, -23, 6, -18, 10, -8); g.bezierCurveTo(19, -18, 25, -4, 19, 11); g.bezierCurveTo(14, 23, 6, 30, 0, 30); g.closePath();
      done(rgba(K.ember, 0.55));
    } else if (el === 'frost') {
      for (let i = 0; i < 6; i++) {
        g.save(); g.rotate(i * TAU / 6 - Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(40, 0); g.moveTo(20, 0); g.lineTo(32, -11); g.moveTo(20, 0); g.lineTo(32, 11); g.moveTo(31, 0); g.lineTo(38, -6); g.moveTo(31, 0); g.lineTo(38, 6);
        done(null); g.restore();
      }
      g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fillStyle = rgba(E.core, 1); g.fill();
    } else if (el === 'bolt') {
      g.beginPath(); g.moveTo(16, -44); g.lineTo(-17, 4); g.lineTo(-1, 4); g.lineTo(-14, 44); g.lineTo(20, -7); g.lineTo(4, -7); g.closePath();
      done(rgba(E.mid, 0.6));
    } else {
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.moveTo(Math.cos(a) * 31, Math.sin(a) * 31); g.lineTo(Math.cos(a + 0.12) * 43, Math.sin(a + 0.12) * 43); } done(null);
      g.beginPath(); g.arc(0, 0, 26, 0, TAU); done('#05020a');
      g.beginPath(); g.ellipse(0, 0, 15, 5.5, 0, 0, TAU); g.fillStyle = rgba(E.core, 1); g.fill(); g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fillStyle = '#05020a'; g.fill();
    }
  });

  // the wall's light: a band of the element's light along its whole rim (the wall is the quarter of the rim facing it), a glow reaching in, and the element's own life
  const wallEnv = q => Math.pow(Math.max(0, Math.sin(q * Math.PI)), 0.55);
  function polyStroke(c, pts, w, col, a) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.lineWidth = w; c.strokeStyle = rgba(col, a); c.stroke(); }
  function wallLight(c, el, A, k, t, fl) {
    if (k <= 0.02) return;
    const E = elOf(el), R = RR(), a0 = A - 0.82, a1 = A + 0.82, N = cnt(14);
    c.save(); clipRoom(c);
    add(c, () => { for (let i = 0; i <= N; i++) { const q = i / N, an = lerp(a0, a1, q); glow(c, Math.cos(an) * (R - 26), Math.sin(an) * (R - 26), 130, E.mid, (0.13 + 0.1 * fl) * k * wallEnv(q)); } });
    const M = LOW ? 10 : 20; c.lineCap = 'round';
    for (const [w, col, al, ad] of [[26, K.ink, 0.4, 0], [16, E.mid, 0.5, 1], [6, E.hi, 0.85, 1], [2, E.core, 0.9, 1]]) {
      c.globalCompositeOperation = ad ? 'lighter' : 'source-over'; c.lineWidth = w * (1 + 0.25 * fl);
      for (let i = 0; i < M; i++) { const q0 = i / M, q1 = (i + 1) / M; c.strokeStyle = rgba(col, al * k * wallEnv((q0 + q1) / 2)); c.beginPath(); c.arc(0, 0, R - 8, lerp(a0, a1, q0), lerp(a0, a1, q1) + 0.01); c.stroke(); }
    }
    c.globalCompositeOperation = 'source-over';
    if (el === 'fire') {
      const n = cnt(18);
      for (let i = 0; i < n; i++) { const q = (i + 0.3 + 0.4 * hs(i, 301)) / n, an = lerp(a0, a1, q), e = wallEnv(q), L = (26 + 40 * hs(i, 302)) * (0.6 + 0.4 * k) * (1 + 0.5 * fl) * (0.8 + 0.2 * Math.sin(t * 6 + i * 2)); tongue(c, Math.cos(an) * (R - 6), Math.sin(an) * (R - 6), an + Math.PI, L * e, 24, t * 2 + i * 0.7, FIRE, 0.85 * k * e); }
      rise(c, Math.cos(A) * (R - 30), Math.sin(A) * (R - 30), { n: 12, t, per: 1.6, rise: 90, spread: 520, size: 2.6, a: 0.75 * k, seed: 301 });
    } else if (el === 'frost') {
      const n = cnt(14);
      for (let i = 0; i < n; i++) {
        const q = (i + 0.5) / n, an = lerp(a0, a1, q) + (hs(i, 310) - 0.5) * 0.04, e = wallEnv(q), grow = sm(c01(k * 1.25 - hs(i, 311) * 0.5)), len = (34 + 64 * hs(i, 312)) * grow * (1 + 0.3 * fl), wd = 9 + 9 * hs(i, 313);
        const bx = Math.cos(an) * (R - 2), by = Math.sin(an) * (R - 2), ix = -Math.cos(an), iy = -Math.sin(an), px = -iy, py = ix;
        c.beginPath(); c.moveTo(bx + px * wd, by + py * wd); c.lineTo(bx + ix * len, by + iy * len); c.lineTo(bx - px * wd, by - py * wd); c.closePath();
        c.fillStyle = rgba(E.mid, 0.72 * k * e); c.fill(); c.lineJoin = 'round'; c.strokeStyle = rgba(K.ink, 0.6 * k * e); c.lineWidth = 2; c.stroke();
        c.beginPath(); c.moveTo(bx + px * wd * 0.35, by + py * wd * 0.35); c.lineTo(bx + ix * len * 0.86, by + iy * len * 0.86); c.lineTo(bx - px * wd * 0.1, by - py * wd * 0.1); c.closePath(); c.fillStyle = rgba(E.hi, 0.7 * k * e); c.fill();
        if (i % 3 === 0) glint(c, bx + ix * len, by + iy * len, 7 + 5 * Math.sin(t * 3 + i), 0.3, E.hi, 0.7 * k * e);
      }
      rise(c, Math.cos(A) * (R - 30), Math.sin(A) * (R - 30), { n: 12, t, per: 2.4, rise: 60, spread: 520, size: 2.2, a: 0.6 * k, seed: 311, col: E.mid, hot: E.hi });
    } else if (el === 'bolt') {
      const s = Math.floor(t * 13);
      for (let j = 0; j < 3; j++) {   // (a flicker of arcs crawling along the rim)
        const an0 = lerp(a0, a1, 0.12 + 0.76 * hs(j, s + 5)), dir = hs(j, s + 6) < 0.5 ? -1 : 1, pts = [];
        for (let i = 0; i <= 7; i++) { const an = an0 + dir * i * 0.045, rr = R - 12 - 8 * hs(i + j * 9, s + 7); pts.push([Math.cos(an) * rr, Math.sin(an) * rr]); }
        const fa = k * (0.45 + 0.55 * hs(j, s + 8)) * wallEnv((an0 - a0) / (a1 - a0));
        polyStroke(c, pts, 7, K.ink, 0.35 * fa); c.globalCompositeOperation = 'lighter'; polyStroke(c, pts, 3.6, E.mid, 0.9 * fa); polyStroke(c, pts, 1.5, E.hi, fa); polyStroke(c, pts, 0.8, E.core, fa); c.globalCompositeOperation = 'source-over';
      }
      const nf = cnt(5);
      for (let j = 0; j < nf; j++) {   // (forks leaping in)
        const q = (j + 0.5 + (hs(j, s + 1) - 0.5) * 0.6) / nf, an = lerp(a0, a1, q), e = wallEnv(q), len = (70 + 80 * hs(j, s + 2)) * (0.8 + 0.4 * fl), pts = [[Math.cos(an) * (R - 8), Math.sin(an) * (R - 8)]];
        for (let i = 1; i <= 5; i++) { const d = R - 8 - len * i / 5, off = (hs(i + j * 7, s + 3) - 0.5) * 34, aa = an + off / Math.max(60, d); pts.push([Math.cos(aa) * d, Math.sin(aa) * d]); }
        const fa = k * e * (0.4 + 0.6 * hs(j, s + 4));
        polyStroke(c, pts, 6, K.ink, 0.3 * fa); c.globalCompositeOperation = 'lighter'; polyStroke(c, pts, 3, E.mid, 0.85 * fa); polyStroke(c, pts, 1.3, E.core, fa); c.globalCompositeOperation = 'source-over';
        add(c, () => glow(c, pts[0][0], pts[0][1], 26, E.hi, 0.4 * fa));
      }
    } else {   // the void: dark blots and tongues licking in, a violet rim, motes pulled out to the wall
      for (let i = 0; i < cnt(10); i++) { const q = (i + 0.5) / cnt(10), an = lerp(a0, a1, q), e = wallEnv(q); ellipse(c, Math.cos(an) * (R - 30), Math.sin(an) * (R - 30), 44 + 30 * hs(i, 321), 34 + 20 * hs(i, 322), an, rgba('#030106', 0.5 * k * e)); }
      const n = cnt(14);
      for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, an = lerp(a0, a1, q), e = wallEnv(q), L = (30 + 34 * hs(i, 323)) * (0.6 + 0.4 * k) * (1 + 0.4 * fl); tongue(c, Math.cos(an) * (R - 8), Math.sin(an) * (R - 8), an + Math.PI, L * e, 22, t * 1.6 + i * 0.8, E.pal, 0.95 * k * e); }
      add(c, () => { for (let i = 0; i < cnt(16); i++) { const ph = (t * 0.35 + hs(i, 324)) % 1, an = lerp(a0, a1, hs(i, 325)), d = R - 170 + 160 * ph, e = wallEnv((an - a0) / (a1 - a0)); glow(c, Math.cos(an) * d, Math.sin(an) * d, 4 + 3 * hs(i, 326), E.hi, Math.sin(ph * Math.PI) * 0.8 * k * e); } });
    }
    c.restore();
  }
  // the light jumping from one wall to the other: a comet across the room, its colour turning from the old element's to the new one's
  function jumpStreak(c, p0, p1, q, a, cA, cB) {
    if (q <= 0 || q >= 1.2 || a <= 0.02) return;
    const hq = Math.min(1, q), tq = Math.max(0, q - 0.5), N = LOW ? 8 : 16, fade = q > 1 ? 1 - (q - 1) / 0.2 : 1;
    for (let i = 0; i < N; i++) {
      const q0 = lerp(tq, hq, i / N), q1 = lerp(tq, hq, (i + 1) / N), f = (i + 1) / N;
      streak(c, lerp(p0[0], p1[0], q0), lerp(p0[1], p1[1], q0), lerp(p0[0], p1[0], q1), lerp(p0[1], p1[1], q1), 3 + 15 * f, a * f * fade, { mid: mixc(cA, cB, q1), hi: mixc(K.hot, cB, q1 * 0.5) });
    }
    if (q < 1) { const x = lerp(p0[0], p1[0], hq), y = lerp(p0[1], p1[1], hq); add(c, () => { glow(c, x, y, 60, mixc(cA, cB, q), 0.6 * a); glow(c, x, y, 22, K.white, 0.9 * a); }); }
  }
  // a brand on a bearer: the element's glyph (floor), embers circling; over: a small one on the chest, and the burning-on
  function brandAt(c, e, ev, u, at, t, post, over, ch) {
    const E = elOf(ev.el), F = ev.shift && ev.from ? elOf(ev.from) : null, x = e.x, y = e.y - (over ? (e.lift || 0) : 0);
    const prog = c01(u / at), on = ev.shift ? 1 : sm(c01(u / 0.4)), pulse = 0.5 + 0.5 * Math.sin(t * (3 + 6 * prog)), fl = u > at ? Math.exp(-(u - at) * 3) : 0;
    const k = on * post * (0.55 + 0.35 * prog + 0.1 * pulse) + 0.4 * fl * post, sq = ev.shift ? c01((u - 0.35) / 0.55) : 1;
    const layers = F && sq < 1 ? [[F, 1 - sq], [E, sq]] : [[E, 1]], sc = ev.shift ? 1 + 0.35 * (1 - sq) : 1 + 0.8 * (1 - on);
    if (!over) {
      add(c, () => {
        glow(c, x, y, 72 + 20 * fl, E.mid, (0.1 + 0.2 * pulse * prog + 0.3 * fl) * k);
        for (let i = 0; i < 5; i++) { const an = t * 1.6 + i * TAU / 5, d = 40 + 4 * Math.sin(t * 3 + i); glow(c, x + Math.cos(an) * d, y + 6 + Math.sin(an) * d * 0.5, 3.4, E.hi, 0.8 * k); }
      });
      for (const [el, w] of layers) {
        const g = elGlyph(el.key); if (!g) continue;
        c.save(); c.translate(x, y + 6); c.rotate(el.key === 'bolt' ? 0 : t * 0.25); c.scale(sc, sc);
        c.globalAlpha = (0.5 + 0.4 * pulse) * k * w; c.drawImage(g, -52, -52, 104, 104);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = (0.2 + 0.45 * prog * pulse + 0.4 * fl) * k * w; c.drawImage(g, -52, -52, 104, 104); c.restore();
      }
      if (ch) {   // (read by charge, pass three: a dashed ring in the bearer's own charge round the brand, fire turning quickly, ash slowly the other way)
        const cc = chCol(ch);
        c.save(); c.globalCompositeOperation = 'lighter'; c.setLineDash(ch > 0 ? [7, 7] : [3, 10]); c.lineDashOffset = -t * (ch > 0 ? 28 : -12); c.beginPath(); c.arc(x, y + 6, 44, 0, TAU);
        c.lineWidth = 3.2; c.strokeStyle = rgba(cc[0], 0.6 * k); c.stroke(); c.lineWidth = 1.2; c.strokeStyle = rgba(cc[1], 0.85 * k); c.stroke(); c.setLineDash([]); c.restore();
      }
      return;
    }
    const burn = ev.shift ? u - 0.35 : u;   // the burning on: a ring, a flash, sparks
    if (burn >= 0 && burn < 0.7) {
      const q = c01(burn / 0.7), a = 1 - ei(q);
      add(c, () => {
        glow(c, x, y - 30, 70 * (1 - q) + 24, E.hi, 0.5 * (1 - q)); c.beginPath(); c.arc(x, y + 4, 20 + 90 * eo3(q), 0, TAU); c.lineWidth = 3 * (1 - q); c.strokeStyle = rgba(E.hi, 0.7 * a); c.stroke();
        for (let i = 0; i < cnt(10); i++) { const an = hs(i, 341) * TAU, sp = 50 + 120 * hs(i, 342), d = sp * burn, d0 = sp * Math.max(0, burn - 0.08); streak(c, x + Math.cos(an) * d0, y - 28 + Math.sin(an) * d0 * 0.7, x + Math.cos(an) * d, y - 28 + Math.sin(an) * d * 0.7, 2.2, a * 0.9, { mid: E.mid, hi: E.hi }); }
      });
    }
    for (const [el, w] of layers) {
      const g = elGlyph(el.key); if (!g) continue;
      c.save(); c.translate(x, y - 56); c.globalAlpha = (0.55 + 0.35 * pulse) * k * w; c.drawImage(g, -17, -17, 34, 34); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (0.25 + 0.5 * fl + 0.2 * prog) * k * w; c.drawImage(g, -17, -17, 34, 34); c.restore();
    }
    if (ch) {   // (the charge's badge beside the brand over the head: a small flame, or a curl of ash)
      const bx = x + 26, by = y - 60, cc = chCol(ch);
      c.save(); c.beginPath(); c.arc(bx, by, 9, 0, TAU); c.fillStyle = rgba(K.ink, 0.6 * k); c.fill(); c.lineWidth = 2; c.strokeStyle = rgba(cc[1], 0.9 * k); c.stroke(); c.restore();
      if (ch > 0) tongue(c, bx, by + 5, UP, 11 + 2 * Math.sin(t * 9), 7, t * 2.2, FIRE, 0.95 * k);
      else { c.save(); c.translate(bx, by); c.lineCap = 'round'; c.beginPath(); for (let j = 0; j <= 10; j++) { const an = j * 0.85 + t * 2, rr = 0.8 + j * 0.55; j ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.lineWidth = 1.8; c.strokeStyle = rgba('#ece4d8', 0.9 * k); c.stroke(); c.restore(); }
    }
    rise(c, x, y - 40, { n: 5, t, per: 1.8, rise: 46, spread: 24, size: 2.2, a: 0.7 * k, seed: 345, col: E.mid, hot: E.hi });
  }
  // a thread of light between the two bearers: motes running toward the middle (a meet) or away from it (a flee)
  function tether(c, a, b, ev, u, at, t, post, chs) {
    const E = elOf(ev.el), k = sm(c01(u / 0.6)) * post * (0.28 + 0.3 * c01(u / at)), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    if (k <= 0.02 || L < 30) return;
    const mx = (a.x + b.x) / 2 - dy / L * 0.12 * L, my = (a.y + b.y) / 2 + dx / L * 0.12 * L, out = ev.rule === 'split';
    c.save(); c.lineCap = 'round'; c.setLineDash([5, 9]); c.lineDashOffset = -t * 18;
    c.beginPath(); c.moveTo(a.x, a.y + 6); c.quadraticCurveTo(mx, my + 6, b.x, b.y + 6); c.strokeStyle = rgba(K.ink, 0.35 * k); c.lineWidth = 4; c.stroke();
    c.globalCompositeOperation = 'lighter'; let tsc = rgba(E.mid, 0.8 * k); if (chs && chs[0] && chs[1]) { const gr = c.createLinearGradient(a.x, a.y, b.x, b.y); gr.addColorStop(0, rgba(chCol(chs[0])[0], 0.85 * k)); gr.addColorStop(1, rgba(chCol(chs[1])[0], 0.85 * k)); tsc = gr; } c.strokeStyle = tsc; c.lineWidth = 1.8; c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 4; i++) { const ph = (t * 0.45 + i / 4) % 1, hf = out ? 0.5 * ph : 0.5 * (1 - ph), q = i % 2 ? hf : 1 - hf; glow(c, bez2(a.x, mx, b.x, q), bez2(a.y, my, b.y, q) + 6, 4, E.hi, Math.sin(ph * Math.PI) * 0.9 * k); }
    c.restore();
  }
  function brandsFrame(c, ev, u, at, t, env, over) {
    if (!ev.ids || !env.entById) return;
    const post = u > at ? 1 - c01((u - at) / 0.9) : 1; if (post <= 0.02) return;
    const pts = [], chs = [];
    for (const id of ev.ids) { const e = env.entById(id); if (e) { const ch = ev.rule ? chargeOf(env, id) : 0; pts.push(e); chs.push(ch); brandAt(c, e, ev, u, at, t, post, over, ch); } }
    if (!over && pts.length === 2) tether(c, pts[0], pts[1], ev, u, at, t, post, chs);
  }
  function twinUnder(c, ev, u, at, t, env) {
    const E = elOf(ev.el), A = rad(ev.wall != null ? ev.wall : E.a), shift = !!ev.shift, R = RR();
    const post = u > at ? 1 - c01((u - at) / 1.1) : 1, fl = u > at ? Math.exp(-(u - at) * 2.6) : (at - u < 0.9 ? 0.35 * (0.5 + 0.5 * Math.sin(t * 24)) : 0);
    if (post > 0.01) {
      let kBeacon = 0;
      if (!shift) {
        const k = sm(c01(u / 0.7)) * (0.62 + 0.38 * c01(u / at)) * post; kBeacon = k;
        wallLight(c, ev.el, A, k, t, fl);
      } else {
        const F = ev.from ? elOf(ev.from) : null, Af = F ? rad(F.a) : A, kOld = 1 - sm(c01(u / 0.3)), kNew = sm(c01((u - 0.4) / 0.5)) * (0.7 + 0.3 * c01(u / at)) * post; kBeacon = kNew;
        if (F && kOld > 0.02) wallLight(c, F.key, Af, kOld * 0.9, t, 0.5 * kOld);
        wallLight(c, ev.el, A, kNew, t, fl + (u > 0.4 && u < 1.0 ? 0.6 * (1 - (u - 0.4) / 0.6) : 0));
        if (F) jumpStreak(c, [Math.cos(Af) * (R - 14), Math.sin(Af) * (R - 14)], [Math.cos(A) * (R - 14), Math.sin(A) * (R - 14)], (u - 0.05) / 0.42, 0.9, F.hi, E.hi);
      }
      add(c, () => glow(c, ev.x, ev.y, 80, E.mid, 0.12 * kBeacon));
    }
    brandsFrame(c, ev, u, at, t, env, false);
  }
  function twinFrame(c, room, t, env, over) {
    for (const k in room.ev) {
      if (k.charCodeAt(2) !== 116 || !k.startsWith('svtwin:')) continue;
      const ev = room.ev[k], u = t - ev.start, at = +ev.at || 6; if (u < -0.1 || u > at + 4.5) continue;
      if (over) brandsFrame(c, ev, u, at, t, env, true); else twinUnder(c, ev, u, at, t, env);
    }
  }
  // which twin cast a telegraph belongs to (its wall's element): by the circle's place (the wall point) or by its bearer
  function twinEvFor(x, y, id, start) {
    const room = S.room; if (!room) return null; let best = null;
    for (const k in room.ev) if (k.startsWith('svtwin:')) { const e = room.ev[k]; if (e.start > start + 0.4) continue; if ((id != null && e.ids && e.ids.indexOf(id) >= 0) || (Math.abs((e.x || 0) - x) < 6 && Math.abs((e.y || 0) - y) < 6)) if (!best || e.start > best.start) best = e; }
    return best;
  }
  // the meet (a stack circle at the wall point): blue wisps winding in while it winds up, then a blue blaze
  TELL.svMeet = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.6) * (0.3 + 0.7 * p);
        add(c, () => {
          for (let i = 0; i < cnt(16); i++) { const ph = (u * 0.5 + hs(i, 331)) % 1, an = hs(i, 332) * TAU + ph * 3.4, d = (s.r - 12) * (1 - ph) + 8; glow(c, s.x + Math.cos(an) * d, s.y + Math.sin(an) * d, 6 + 4 * hs(i, 333), ph > 0.6 ? K.blueHi : K.blueMid, Math.sin(ph * Math.PI) * k); }
          glow(c, s.x, s.y, s.r * 0.6, K.blueMid, 0.1 + 0.28 * ei(p));
        });
      } else if (age < 7 && !r.cancel) {
        const f = 1 - c01(age / 7);
        c.save(); clipRoom(c); ellipse(c, s.x, s.y, s.r * 0.9, s.r * 0.74, 0, rgba(K.ink, 0.25 * f)); scorch(c, s.x, s.y, s.r * 0.95, 0.55 * f, 1 - c01(age / 3.2), r.sd, K.blueMid); c.restore();
      }
    },
    over(c, r, t, env) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 2.2 || r.cancel) return;
      const E = elOf((twinEvFor(s.x, s.y, null, r.start) || {}).el), hq = c01(age / 0.2), H = 300 * eo3(hq) * (1 - ei(c01((age - 0.9) / 0.9))), W = s.r * 0.95 * (1 - 0.35 * c01((age - 0.5) / 1)), a = 1 - ei(c01((age - 1.0) / 1.0)), q = c01(age / 0.55);
      c.save(); clipRoom(c);
      add(c, () => { glow(c, s.x, s.y, 230 * (1 - c01(age / 1.8)) + 60, K.blueMid, 0.5 * a); glow(c, s.x, s.y, 120 * (1 - c01(age / 0.6)) + 20, K.white, 0.5 * (1 - c01(age / 0.6))); });
      for (let i = -5; i <= 5; i++) tongue(c, s.x + i * W * 0.17, s.y + Math.abs(i) * 3, UP + i * 0.05, H * (1 - Math.abs(i) * 0.13), W * (0.5 - Math.abs(i) * 0.04), t * 2.1 + i * 0.7, BLUE, a);
      tongue(c, s.x, s.y, UP, H * 1.06, W * 0.5, t * 2.6, [K.blueMid, K.blueHi, K.white], a);
      if (q < 1) bandRing(c, s.x, s.y, 24 + (s.r - 24) * eo3(q), 44 * (1 - q) + 5, 0.85 * (1 - q), BLUE);
      add(c, () => { for (let i = 0; i < cnt(14); i++) { const an = i * TAU / 14 + hs(i, 335) * 0.4, sp = (0.5 + 0.5 * hs(i, 336)) * s.r * 1.3, d1 = sp * eo3(q), d0 = sp * eo3(Math.max(0, q - 0.16)); streak(c, s.x + Math.cos(an) * d0, s.y + Math.sin(an) * d0 * 0.8, s.x + Math.cos(an) * d1, s.y + Math.sin(an) * d1 * 0.8, 2.6, a * (1 - q), { mid: E.mid, hi: E.hi }); } });
      rise(c, s.x, s.y - 10, { n: 16, t: age, per: 1.4, rise: 220, spread: 110, size: 3, a: 0.9 * a, col: K.blueMid, hot: K.blueHi, seed: 337 });
      c.restore();
    },
  };
  // the bloom (a red circle at the wall point): heat and cracks gathering at the wall, then a flower of fire opening out to the circle's rim
  TELL.svBloom = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.6) * (0.3 + 0.7 * p);
        c.save(); clipRoom(c);
        add(c, () => glow(c, s.x, s.y, s.r * 0.7, K.red, 0.06 + 0.22 * ei(p)));
        crackLines(c, s.x, s.y, 7, 14, 14 + s.r * 0.8 * sm(p), r.sd, 0.55 * k, p);
        rise(c, s.x, s.y, { n: 10, t, per: 1.5, rise: 90, spread: s.r * 1.3, size: 2.6, a: 0.7 * k, seed: 351 });
        c.restore();
      } else if (age < 8 && !r.cancel) {
        const f = 1 - c01(age / 8), heat = 1 - c01(age / 3.4);
        c.save(); clipRoom(c); scorch(c, s.x, s.y, s.r * 0.85, 0.7 * f, heat, r.sd, K.ember); crackLines(c, s.x, s.y, 7, 14, s.r * 0.9, r.sd, 0.8 * f, heat); rise(c, s.x, s.y, { n: 8, t: age, per: 1.8, rise: 80, spread: s.r * 1.2, size: 2.4, a: 0.6 * heat, seed: 352 }); c.restore();
      }
    },
    over(c, r, t, env) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 2.4 || r.cancel) return;
      const q = c01(age / 0.8), a = 1 - ei(c01((age - 0.5) / 1.9)), n = LOW ? 10 : 18;
      c.save(); clipRoom(c);
      add(c, () => { glow(c, s.x, s.y, s.r * 1.1 * (1 - 0.3 * q), K.red, 0.5 * a); glow(c, s.x, s.y, 140 * (1 - c01(age / 0.5)) + 30, K.hot, 0.6 * (1 - c01(age / 0.5))); });
      for (let i = 0; i < n; i++) {   // (the petals: long tongues laid out from the wall point, each a different length)
        const an = i * TAU / n + 0.2, L = s.r * (0.55 + 0.4 * hs(i, 355)) * eo3(q) * (1 - 0.3 * c01((age - 1.0) / 1.4));
        tongue(c, s.x, s.y, an, L, 64 * (0.7 + 0.5 * hs(i, 356)), t * 1.8 + i * 0.6, FIREP, a * 0.95);
      }
      if (q < 1) bandRing(c, s.x, s.y, 30 + (s.r - 30) * eo3(q), 58 * (1 - q) + 8, 0.9 * (1 - ei(q)), [K.dark, K.red, K.ember]);
      const nt = cnt(36);
      for (let i = 0; i < nt; i++) { const an = i * TAU / nt + hs(i, 357) * 0.2, rr = s.r * eo3(c01(age / 0.7)); tongue(c, s.x + Math.cos(an) * rr, s.y + Math.sin(an) * rr, an, (24 + 26 * hs(i, 358)) * (1 - c01((age - 0.4) / 1.6)), 20, t * 2 + i * 0.5, FIRE, 0.7 * a); }
      rise(c, s.x, s.y, { n: 22, t: age, per: 2, rise: 160, spread: s.r * 1.4, size: 3, a: 0.9 * a, seed: 359 });
      c.restore();
    },
  };
  // each bearer's circle (a spread: it follows the bearer, then locks): sparks round its edge, then the ring of the circle burns
  TELL.svTwin = {
    under(c, r, t, env) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.5) * (0.25 + 0.75 * p);
        add(c, () => {
          for (let i = 0; i < cnt(14); i++) { const an = hs(i, 361) * TAU + u * (0.4 + 0.5 * hs(i, 362)) * (i % 2 ? 1 : -1), fl = 0.5 + 0.5 * Math.sin(u * (4 + 6 * hs(i, 363)) + i * 2); glow(c, s.x + Math.cos(an) * (s.r - 5), s.y + Math.sin(an) * (s.r - 5), 2.6 + 2 * fl, fl > 0.7 ? K.hot : K.amber, k * (0.4 + 0.6 * fl)); }
          glow(c, s.x, s.y, 40 + 24 * p, K.red, 0.04 + 0.2 * ei(p));
        });
      } else if (age < 5 && !r.cancel) scorch(c, s.x, s.y, s.r * 0.62, 0.55 * (1 - c01(age / 5)), 1 - c01(age / 2.4), r.sd, K.ember);
    },
    over(c, r, t, env) {
      const s = r.s, age = t - r.land; if (age < 0 || age > 2.6 || r.cancel) return;
      const q = c01(age / 0.5), a = 1 - ei(c01((age - 0.4) / 2.2)), n = LOW ? 14 : 28;
      c.save(); clipRoom(c);
      add(c, () => { glow(c, s.x, s.y, 80 * (1 - q) + 20, K.hot, 0.5 * (1 - q)); c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.lineWidth = 12 * (1 - 0.5 * q); c.strokeStyle = rgba(K.red, 0.6 * a); c.stroke(); c.lineWidth = 4; c.strokeStyle = rgba(K.gold, 0.85 * a); c.stroke(); });
      for (let i = 0; i < n; i++) { const an = i * TAU / n + hs(i, 364) * 0.15; tongue(c, s.x + Math.cos(an) * s.r, s.y + Math.sin(an) * s.r, an + (hs(i, 365) - 0.5) * 0.5, (26 + 34 * hs(i, 366)) * (0.4 + 0.6 * eo3(q)) * (1 - c01((age - 0.6) / 2)), 22, t * 2.2 + i * 0.6, FIRE, a * 0.9); }
      rise(c, s.x, s.y, { n: 10, t: age, per: 1.6, rise: 80, spread: s.r * 1.4, size: 2.6, a: 0.8 * a, seed: 367 });
      c.restore();
    },
  };

  // ---------------------------------------------------------------------------------------------------------------- FX3: The Heart Remembers (svheart, svpillar:n, svseal)
  // The wall. svheart is the clock (pillars [x, y, seconds to the eruption, live], sweep, kindling, end); svpillar:n paints each pillar 2.2 s before it erupts;
  // svseal is the glass breaking. The heart beats on the sound's own grid (a lub 0.02 s into each 1.25 s, a dub at 0.4) until the held breath after the last pillar
  // (the sound stops it 0.25 s after that pillar); the effects' own clock stands still through the breath. A dark vignette (a canvas, drawn FIRST in the floor
  // layer, so everything else lies over it) closes in on the room's edge, pulsing with the beat; the pillars and the seal are drawn under the telegraph fills
  // (the next pillar's circle is painted over a column), and only sparks and the shards are drawn over.
  const HP = 1.25;
  const SEAL = { RX: 170, RY: 230, drop: 56, flat: 0.34 };
  const SEALTRI = (() => {   // the glass: a net of triangles over a half-disc (x -1..1, y 0 at the floor to -1 at the top), each one a shard when it breaks
    const GX = 8, GY = 6, pts = [], out = [];
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) pts.push([-1 + 2 * i / GX + (i > 0 && i < GX ? (hs(i * 9 + j, 501) - 0.5) * 0.14 : 0), -j / GY + (j > 0 && j < GY ? (hs(i * 7 + j, 502) - 0.5) * 0.12 : 0)]);
    const P = (i, j) => pts[j * (GX + 1) + i];
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const a = P(i, j), b = P(i + 1, j), c2 = P(i + 1, j + 1), d = P(i, j + 1);
      for (const tri of (hs(i + j * 11, 503) < 0.5 ? [[a, b, c2], [a, c2, d]] : [[a, b, d], [b, c2, d]])) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        if (cx * cx + cy * cy <= 0.98) out.push({ v: tri, cx, cy });
      }
    }
    return out;
  })();
  const GLASS = ['#b8862a', '#ffe08a', '#fffbe8'];   // (white-gold: the ring of the break, and the glass's own light)
  const sealGeom = b => ({ x: b.x, y: b.y + SEAL.drop, RX: SEAL.RX, RY: SEAL.RY });
  function heartOf(room, t) {
    const ev = room.ev.svheart; if (!ev) return null;
    const u = t - ev.start, ps = Array.isArray(ev.pillars) ? ev.pillars : [], seal = room.ev.svseal, done = seal ? t - seal.start : -1;
    if (u < -0.1 || done > 5 || (!seal && u > (+ev.end || 0) + 3)) return null;
    let last = 0; for (const p of ps) last = Math.max(last, +p[2] || 0);
    const b0 = last + 0.25, b1 = Math.max(+ev.sweep || 0, b0 + 0.75), end = +ev.end || b1 + 8;
    let B = 0; if (u >= 0.02 && u < b0) { const ph = (((u - 0.02) % HP) + HP) % HP; B = Math.max(Math.exp(-ph * 9), ph >= 0.38 ? 0.65 * Math.exp(-(ph - 0.38) * 9) : 0) * c01(u / 1.2); }
    let th = 0; for (const p of ps) { const a = u - (+p[2] || 0); if (a >= 0 && a < 1.5) th = Math.max(th, Math.exp(-a * 5)); }
    return { ev, u, ps, last, b0, b1, end, B, th, held: u >= b0 && u < b1, done, ht: u < b0 ? u : u < b1 ? b0 : u - (b1 - b0) };
  }
  // a dark layer: a small canvas painted in the world's frame (so it can have lit places cut out of it), laid over the floor; beyond it the same flat dark
  let DKC = null;
  function darkLayer(c, D, paint) {
    if (typeof document === 'undefined') return;
    if (!DKC) { DKC = document.createElement('canvas'); DKC.width = DKC.height = 192; }
    const g = DKC.getContext('2d'), k = 192 / (2 * D);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, 192, 192); g.setTransform(k, 0, 0, k, 96, 96);
    const edge = paint(g);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    c.save(); c.drawImage(DKC, -D, -D, 2 * D, 2 * D);
    c.fillStyle = rgba(edge.col, edge.a); const O = 3000; c.fillRect(-O, -O, 2 * O, O - D); c.fillRect(-O, D, 2 * O, O - D); c.fillRect(-O, -D, O - D, 2 * D); c.fillRect(D, -D, O - D, 2 * D); c.restore();
  }
  function cutLit(g, x, y, r, a) {   // a lit place: the dark is taken away round it, softly
    g.globalCompositeOperation = 'destination-out';
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba('#000000', a)); rg.addColorStop(0.55, rgba('#000000', a * 0.5)); rg.addColorStop(1, rgba('#000000', 0));
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over';
  }
  const VGC = '#12030a';
  function heartVignette(c, H) {
    const u = H.u, kIn = sm(c01(u / 1.2)), out = H.done >= 0 ? 1 - c01(H.done / 0.7) : u > H.end + 1.2 ? 1 - c01((u - H.end - 1.2) / 0.8) : 1;
    const breath = H.held ? sm(c01((u - H.b0) / 0.5)) : 0, calm = u >= H.b1 ? sm(c01((u - H.b1) / 0.8)) : 0;
    const ea = kIn * out * (0.6 + 0.14 * H.B + 0.12 * H.th + 0.14 * breath - 0.22 * calm);
    if (ea <= 0.02) return;
    let cx = 0, cy = 0; if (H.ps.length) { for (const p of H.ps) { cx += p[0]; cy += p[1]; } cx = cx / H.ps.length * 0.3; cy = cy / H.ps.length * 0.3; }
    const r0 = 250 - 30 * H.B - 50 * breath - 16 * H.th;
    darkLayer(c, 1100, g => {
      const gr = g.createRadialGradient(cx, cy, r0, cx, cy, r0 + 330); gr.addColorStop(0, rgba(VGC, 0)); gr.addColorStop(1, rgba(VGC, ea));
      g.fillStyle = gr; g.fillRect(-1100, -1100, 2200, 2200);
      for (const p of H.ps) cutLit(g, p[0], p[1], 220, 0.6 + 0.25 * H.B + 0.15 * H.th);   // (the eye is drawn to the stumps)
      return { col: VGC, a: ea };
    });
  }

  // the seal: a bell of glass over the Sovereign, a net of facets with embers trapped in it. Under: the ring on the floor, the back of the glass and the embers;
  // over: the facets' edges, the rim and the glints (thin, so a telegraph under the Sovereign still reads through it)
  function domePath(c, G) { c.beginPath(); c.ellipse(G.x, G.y, G.RX, G.RY, 0, Math.PI, TAU); c.closePath(); }
  function sealUnder(c, H, b, t) {
    if (H.done >= 0) return;
    const k = sm(c01(H.u / 0.9)), G = sealGeom(b), ht = H.ht, near = c01((H.u - (H.end - 1.0)) / 0.9), lit = 0.5 + 0.5 * H.B + 0.9 * near;
    if (k <= 0.02) return;
    c.save();
    add(c, () => {   // the ring on the floor: a rune circle of embers
      glow(c, G.x, G.y, G.RX * 1.25, K.ember, (0.06 + 0.08 * lit) * k);
      c.lineCap = 'round';
      for (const [w, col, al] of [[10, K.red, 0.5], [4.4, K.ember, 0.9], [1.6, K.hot, 1]]) { c.beginPath(); c.ellipse(G.x, G.y, G.RX * 1.02, G.RX * SEAL.flat, 0, 0, TAU); c.lineWidth = w; c.strokeStyle = rgba(col, al * k * (0.6 + 0.4 * lit)); c.stroke(); }
      c.beginPath(); for (let i = 0; i < 24; i++) { const a = i * TAU / 24 + ht * 0.05; c.moveTo(G.x + Math.cos(a) * G.RX * 0.9, G.y + Math.sin(a) * G.RX * SEAL.flat * 0.9); c.lineTo(G.x + Math.cos(a) * G.RX * 1.12, G.y + Math.sin(a) * G.RX * SEAL.flat * 1.12); } c.lineWidth = 2.4; c.strokeStyle = rgba(K.gold, 0.7 * k); c.stroke();
    });
    // the back of the glass: a faint warm tint, brighter at the rim
    c.save(); domePath(c, G); c.clip();
    const gr = c.createRadialGradient(G.x, G.y - G.RY * 0.42, G.RY * 0.1, G.x, G.y - G.RY * 0.3, G.RY * 1.05); gr.addColorStop(0, rgba('#ffd48a', 0.02)); gr.addColorStop(0.7, rgba('#ffb060', 0.06 * lit)); gr.addColorStop(1, rgba('#ff9040', 0.16 * lit));
    c.globalAlpha = k; c.fillStyle = gr; c.fillRect(G.x - G.RX, G.y - G.RY, G.RX * 2, G.RY); c.globalAlpha = 1;
    add(c, () => {   // (embers trapped in the glass, rising slowly and turning back)
      for (let i = 0; i < cnt(16); i++) { const ph = (ht * 0.1 + hs(i, 520)) % 1, x = G.x + (hs(i, 521) * 2 - 1) * G.RX * 0.82 * Math.sqrt(1 - ph * ph * 0.8) + Math.sin(ht * 0.8 + i * 2) * 9, y = G.y - ph * G.RY * 0.92; glow(c, x, y, 3.4 + 2 * hs(i, 522), i % 3 ? K.ember : K.hot, Math.sin(ph * Math.PI) * 0.85 * k); }
    });
    c.restore(); c.restore();
  }
  function sealOver(c, H, b, t, flare) {
    const G = sealGeom(b), k = flare != null ? 1 : sm(c01(H.u / 0.9)), ht = H.ht, bt = H.B, near = flare != null ? flare : c01((H.u - (H.end - 1.0)) / 0.9);
    if (k <= 0.02) return;
    const lit = 0.45 + 0.4 * bt + 0.9 * near, X = x => G.x + x * G.RX, Y = y => G.y + y * G.RY;
    c.save(); domePath(c, G); c.clip();
    c.lineJoin = 'round';
    for (let i = 0; i < SEALTRI.length; i++) {   // (each facet takes a little light of its own)
      const f = SEALTRI[i], v = f.v, fa = (0.025 + 0.05 * (0.5 + 0.5 * Math.sin(ht * 0.9 + i * 1.7))) * (0.6 + 0.8 * lit);
      c.beginPath(); c.moveTo(X(v[0][0]), Y(v[0][1])); c.lineTo(X(v[1][0]), Y(v[1][1])); c.lineTo(X(v[2][0]), Y(v[2][1])); c.closePath(); c.fillStyle = rgba(i % 2 ? '#ffe9b8' : '#ffc27a', fa * k); c.fill();
    }
    const edges = new Path2D(); for (const f of SEALTRI) { const v = f.v; edges.moveTo(X(v[0][0]), Y(v[0][1])); edges.lineTo(X(v[1][0]), Y(v[1][1])); edges.lineTo(X(v[2][0]), Y(v[2][1])); edges.closePath(); }
    c.strokeStyle = rgba(K.ink, 0.28 * k); c.lineWidth = 2.6; c.stroke(edges);
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(K.gold, Math.min(1, (0.28 + 0.3 * lit)) * k); c.lineWidth = 1.1; c.stroke(edges);
    if (near > 0.02) { c.strokeStyle = rgba(K.white, 0.7 * near * k); c.lineWidth = 1.6; c.stroke(edges); }
    // a long glint sliding across the glass
    const gq = (ht * 0.22) % 1; if (gq < 0.5) { const x0 = G.x - G.RX + gq * 2 * G.RX * 2; c.beginPath(); c.moveTo(x0, G.y); c.lineTo(x0 + G.RY * 0.45, G.y - G.RY); c.lineWidth = 9; c.strokeStyle = rgba(K.hot, 0.1 * Math.sin(gq * 2 * Math.PI) * k); c.stroke(); }
    c.restore();
    c.save(); c.lineCap = 'round';   // the rim
    c.beginPath(); c.ellipse(G.x, G.y, G.RX, G.RY, 0, Math.PI, TAU); c.strokeStyle = rgba(K.ink, 0.5 * k); c.lineWidth = 7; c.stroke();
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(K.ember, 0.85 * k * (0.7 + 0.3 * lit)); c.lineWidth = 3.4; c.stroke(); c.strokeStyle = rgba(K.hot, 0.9 * k); c.lineWidth = 1.2; c.stroke();
    for (let i = 0; i < cnt(7); i++) { const a = Math.PI + 0.25 + (TAU / 2 - 0.5) * hs(i, 525), tw = 0.5 + 0.5 * Math.sin(ht * 2.4 + i * 3.1); glint(c, G.x + Math.cos(a) * G.RX, G.y + Math.sin(a) * G.RY, 6 + 6 * tw, 0.3 + i, K.white, (0.35 + 0.5 * tw) * k * (0.6 + 0.5 * near)); }
    c.restore();
  }
  // the break: the ring of white-gold light across the whole floor (under), the shards flung low and fast (over)
  function sealRing(c, b, age) {
    if (age < 0 || age > 1.7) return;
    const G = sealGeom(b), R = RR(), q = c01(age / 1.15), rr = 50 + (R + 160) * eo3(q), a = 1 - ei(c01((q - 0.4) / 0.6));
    c.save(); clipRoom(c);
    const f = c01(age / 0.2); if (f < 1) add(c, () => glow(c, G.x, G.y - 90, 230 * (1 - f) + 50, K.hot, 0.42 * (1 - f)));   // (the one bright thing: local, brief)
    bandRing(c, G.x, G.y, rr, 46 * (1 - 0.6 * q) + 5, 0.95 * a, GLASS);
    bandRing(c, G.x, G.y, rr * 0.9, 12 * (1 - q) + 2, 0.5 * a, ['#5a4a2a', '#ffd9a0', '#fffbe8']);
    add(c, () => { for (let i = 0; i < cnt(34); i++) { const an = i * TAU / cnt(34) + hs(i, 530) * 0.2, p = c01((age - 0.02 * hs(i, 531)) / 1.15), r2 = (50 + (R + 160) * eo3(p)) * (0.97 + 0.04 * hs(i, 532)); glint(c, G.x + Math.cos(an) * r2, G.y + Math.sin(an) * r2, 5 + 7 * hs(i, 533), an, K.white, a * (0.5 + 0.5 * hs(i, 534))); } });
    c.restore();
  }
  function sealShards(c, b, age) {
    if (age < 0 || age > 3.4) return;
    const G = sealGeom(b), step = LOW ? 2 : 1, al = 1 - c01((age - 1.0) / 1.9);
    if (al <= 0.02) return;
    c.save(); c.lineJoin = 'round';
    for (let n = 0; n < SEALTRI.length; n += step) {
      const f = SEALTRI[n], fa = TAU * ((n * 0.618 + hs(n, 541) * 0.3) % 1), V = 760 + 700 * hs(n, 542), dist = V * (1 - Math.exp(-age * 3.4)) / 3.4, z0 = -f.cy * G.RY, vz = 90 + 180 * hs(n, 543);
      const z = Math.max(0, z0 + vz * age - 520 * age * age), sx = G.x + f.cx * G.RX * 0.92, sy = G.y;
      const px = sx + Math.cos(fa) * dist, py = sy + Math.sin(fa) * dist * 0.85 - z, spd = V * Math.exp(-age * 3.4), dx = Math.cos(fa), dy = Math.sin(fa) * 0.85;
      const rot = hs(n, 544) * TAU + age * (8 * (hs(n, 545) - 0.5)), sc = G.RX * 0.5 * (0.7 + 0.5 * hs(n, 546)), tint = n % 3 === 0 ? '#fff6d8' : n % 3 === 1 ? '#ffd890' : '#cfe6ff', a = al * (0.55 + 0.45 * hs(n, 547));
      const tl = Math.min(120, spd * 0.07);
      if (tl > 4) {   // (the shard's streak: a refracted trail, with a cool fringe on some)
        streak(c, px - dx * tl, py - dy * tl, px, py, 3.2, a * 0.8, { mid: tint, hi: '#fffbe8' });
        if (n % 4 === 0) { add(c, () => { c.lineCap = 'round'; c.beginPath(); c.moveTo(px - dx * tl * 0.9 - dy * 4, py - dy * tl * 0.9 + dx * 4); c.lineTo(px - dy * 4, py + dx * 4); c.strokeStyle = rgba('#7fd0ff', 0.45 * a); c.lineWidth = 2; c.stroke(); }); }
      }
      c.save(); c.translate(px, py); c.rotate(rot);
      c.beginPath(); for (let i = 0; i < 3; i++) { const v = f.v[i]; i ? c.lineTo((v[0] - f.cx) * sc, (v[1] - f.cy) * sc) : c.moveTo((v[0] - f.cx) * sc, (v[1] - f.cy) * sc); } c.closePath();
      c.fillStyle = rgba(tint, 0.8 * a); c.fill(); c.strokeStyle = rgba(K.ink, 0.5 * a); c.lineWidth = 2.4; c.stroke(); c.strokeStyle = rgba(K.white, 0.9 * a); c.lineWidth = 1; c.stroke();
      c.restore();
      if (n % 5 === 0) glint(c, px, py, 6 + 6 * hs(n, 548), rot, K.white, a * 0.8);
    }
    add(c, () => { for (let i = 0; i < cnt(44); i++) { const fa = hs(i, 550) * TAU, V = 900 + 900 * hs(i, 551), d = V * (1 - Math.exp(-age * 3)) / 3, spd = V * Math.exp(-age * 3), L = Math.min(70, spd * 0.05), x = G.x + Math.cos(fa) * d, y = G.y - 20 + Math.sin(fa) * d * 0.85; streak(c, x - Math.cos(fa) * L, y - Math.sin(fa) * 0.85 * L, x, y, 1.8, al * 0.7, { mid: '#ffe08a', hi: '#fffbe8' }); } });
    c.restore();
  }

  // a pillar from a stump. Wind-up (the 2.2 s it is painted): the stump's glow thumping with the beat, cracks creeping out, flames gathering. Eruption: a column of
  // fire up from the stump, a ring out to the circle's rim, flung embers, a crack that runs out of the floor (toward the Sovereign's seal, and others) and smoulders.
  function floorCracks(c, x, y, od, age, bx, by, a, heat) {
    const reach = eo3(c01(age / 0.5)); if (reach <= 0.01 || a <= 0.02) return;
    const toB = Math.atan2(by - y, bx - x), dB = Math.hypot(bx - x, by - y), p = new Path2D(), tips = [];
    for (let j = 0; j < 6; j++) {
      const an = j === 0 ? toB + (hs(od, 381) - 0.5) * 0.3 : toB + (j - 3) * 1.05 + (hs(j, od + 382) - 0.5) * 0.6, len = (j === 0 ? Math.max(140, Math.min(dB - 150, 430)) : 110 + 150 * hs(j, od + 383)) * reach, n = 8, pts = [];
      for (let s = 0; s <= n; s++) { const d = 18 + (len - 18) * s / n, off = s ? (hs(s * 5 + j, od + 384) - 0.5) * 26 * Math.min(1, s / 2) : 0; pts.push([x + Math.cos(an) * d - Math.sin(an) * off, y + Math.sin(an) * d + Math.cos(an) * off]); }
      p.moveTo(pts[0][0], pts[0][1]); for (let s = 1; s <= n; s++) p.lineTo(pts[s][0], pts[s][1]);
      const fk = pts[Math.min(4, n)], fa2 = an + (j % 2 ? 0.7 : -0.7); p.moveTo(fk[0], fk[1]); p.lineTo(fk[0] + Math.cos(fa2) * 52 * reach, fk[1] + Math.sin(fa2) * 52 * reach);
      if (reach < 1) tips.push(pts[n]);
    }
    c.save(); c.lineJoin = c.lineCap = 'round';
    c.lineWidth = 7; c.strokeStyle = rgba(K.ink, 0.55 * a); c.stroke(p);
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = 3.4; c.strokeStyle = rgba(K.ember, 0.85 * a * heat); c.stroke(p); c.lineWidth = 1.3; c.strokeStyle = rgba(K.gold, 0.9 * a * heat); c.stroke(p);
    for (const q of tips) glow(c, q[0], q[1], 20, K.hot, 0.6 * a);
    c.restore();
  }
  function pillarUnder(c, ev, u, H, t, env) {
    const x = ev.x, y = ev.y, at = +ev.at || 2.2, r = ev.r || 150, od = (+ev.order || 1) * 7;
    if (u < -0.1 || u > at + 7) return;
    const hu = u - (H ? H.u - H.ht : 0), b = bossAt(env);
    c.save(); clipRoom(c);
    if (u < at) {
      const p = c01(u / at), B = H ? H.B : 0;
      add(c, () => { glow(c, x, y, r * 0.85, K.ember, (0.05 + 0.26 * p * p) * (0.8 + 0.5 * B)); glow(c, x, y, 50, K.hot, 0.1 * p + 0.22 * B * p); });
      crackLines(c, x, y, 6, 16, 16 + r * 0.75 * sm(p), od + 3, 0.6 * p, p);
      for (let i = 0; i < cnt(5); i++) tongue(c, x + (i - 2) * 10, y + 4, UP + (i - 2) * 0.15, (10 + 44 * p * p) * (0.6 + 0.4 * hs(i, 371 + od)), 14, hu * 2 + i, FIRE, 0.8 * p);
      rise(c, x, y, { n: 8, t: hu, per: 1.3, rise: 90, spread: 70, size: 2.4, a: 0.8 * p, seed: 375 + od });
      c.restore(); return;
    }
    const age = hu - at, fade = 1 - c01((age - 3) / 3.5), heat = 0.35 + 0.65 * Math.exp(-age / 1.8);
    floorCracks(c, x, y, od, age, b.x, b.y, fade, heat);
    scorch(c, x, y, r * 0.8, 0.8 * fade, heat, od, K.ember);
    if (age < 2.6) {
      const q = c01(age / 0.16), q2 = c01(age / 0.34), Hh = 430 * eo3(q) * (1 - sm(c01((age - 0.8) / 1.1))), W = r * 0.62 * (1 - 0.4 * c01((age - 0.35) / 1.0)), a = 1 - ei(c01((age - 0.9) / 1.4));
      add(c, () => {
        for (let j = 0; j < 7; j++) glow(c, x, y - Hh * (j + 0.4) / 7, W * (1.15 - j * 0.09), K.ember, 0.3 * a);
        glow(c, x, y, r * 1.1, K.hot, 0.5 * (1 - c01(age / 0.5)));
      });
      for (let i = -3; i <= 3; i++) tongue(c, x + i * W * 0.28, y + Math.abs(i) * 3, UP + i * 0.04, Hh * (1 - Math.abs(i) * 0.17), W * (0.55 - Math.abs(i) * 0.06), hu * 2.4 + i * 0.7, FIRE, a);
      tongue(c, x, y, UP, Hh * 1.06, W * 0.62, hu * 2.9, [K.ember, K.gold, K.white], a); tongue(c, x, y, UP, Hh * 0.8, W * 0.3, hu * 3.3, [K.gold, K.white, K.white], a);
      add(c, () => glow(c, x, y - Hh * 0.25, W * 1.4, K.hot, 0.28 * a));
      if (q2 < 1) bandRing(c, x, y, 24 + (r - 24) * eo3(q2), 44 * (1 - q2) + 5, 0.85 * (1 - q2), [K.dark, K.red, K.ember]);
      add(c, () => { for (let i = 0; i < cnt(18); i++) { const an = hs(i, 386 + od) * TAU, sp = 200 + 520 * hs(i, 387 + od), d1 = sp * eo3(c01(age / 0.7)), d0 = sp * eo3(c01(age / 0.7 - 0.12)), z = 130 * hs(i, 388 + od) * 4 * c01(age / 1.2) * (1 - c01(age / 1.2)); streak(c, x + Math.cos(an) * d0, y + Math.sin(an) * d0 * 0.8 - z, x + Math.cos(an) * d1, y + Math.sin(an) * d1 * 0.8 - z, 2.4, (1 - c01(age / 1.0)) * 0.9); } });
    }
    if (age > 0.6 && age < 5) rise(c, x, y, { n: 10, t: hu, per: 1.7, rise: 100, spread: 90, size: 2.6, a: 0.8 * (1 - c01((age - 0.6) / 4.4)), seed: 389 + od });
    c.restore();
  }
  function heartUnder(c, room, t, env, H) {
    if (!H) return;
    const b = bossAt(env);
    if (H.done < 0) sealUnder(c, H, b, t); else sealRing(c, b, H.done);
  }
  function heartOver(c, room, t, env, H) {
    if (!H) return;
    const b = bossAt(env);
    if (H.done < 0) sealOver(c, H, b, t);
    else { if (H.done < 0.16) sealOver(c, H, b, t, 1 - H.done / 0.16); sealShards(c, b, H.done); }
  }

  // ---------------------------------------------------------------------------------------------------------------- FX3: Rebirth (roomev svrebirth, the set piece svrebirth; tag svRebirth)
  // { dark: [from, to], halo, crater, choir, dur } are seconds from the message. Nothing can hit the party for all of it, so all of it may be drawn over anything.
  //   0.3        the blade is driven into the floor (a light blade drops to the floor beside the Sovereign; fissures, a ring)
  //   0.5-2.7    every fire in the room (seam points of the forge, the three scorched spots, the stumps) is drawn into the blade as spiralling ribbons
  //   1.3-2.5    the room goes dark; held 2.5-4.0: only the party, the halo and the blade's own light are lit
  //   4.0        the halo OPENS: a ring of light to the edge of the room, twelve blades of light (the lit sigils; the dark ones stay dark), in slow motion for a second
  //   5.0        the sky splits (a rift above the room, the meteor rekindling), the floor is the crater; the dark lifts as the light spreads
  //   6.0        the choir: tolls of white-gold and violet across the floor
  //   8.6-12     the Rebirth cast gathers the room's light into the halo; at 12.05 the raidwide's toll (tag svRebirth)
  // SLOW MOTION. The client can slow its clock (main.js killSlowK scales the dt that feeds `now`), but that is main.js's: here the effects' own time is warped
  // (warpU: 40% speed for one second from the halo's opening, then up to 1.8x for 1.5 s to catch up), so everything this file draws is slowed and the beats
  // after it keep their real times. SV_FX.slowK(now) gives the same curve for main.js to multiply into its dt; if it is used, set SV_FX.slow.on = false.
  const SLOW = { on: true, rate: 0.4, dur: 1.0, catchUp: 1.5 };
  function warpU(u, halo) {
    if (!SLOW.on || u <= halo) return u;
    const lost = (1 - SLOW.rate) * SLOW.dur;
    if (u <= halo + SLOW.dur) return halo + SLOW.rate * (u - halo);
    const x = u - halo - SLOW.dur, T = SLOW.catchUp;
    if (x >= T) return u;
    return halo + SLOW.rate * SLOW.dur + x + (2 * lost / T) * (x - x * x / (2 * T));
  }
  function slowK(t) {
    const ev = S.room && S.room.ev && S.room.ev.svrebirth; if (!ev || !SLOW.on) return 1;
    const u = t - ev.start, h = +ev.halo || 4;
    return u >= h && u < h + SLOW.dur ? SLOW.rate : 1;
  }
  const RBDK = '#04030a', RB_FLIGHT = 1.25;
  const RB_SRC = (() => {
    const out = []; let n = 0;
    BB.forEach((s, si) => { if (si % 2) return; for (const q of [0.3, 0.7]) { const p = s.pts[Math.floor((s.pts.length - 1) * q)]; if (Math.hypot(p[0], p[1]) < 500) out.push({ x: p[0], y: p[1], t0: 0.55 + 0.9 * hs(n++, 401) }); } });
    for (let i = 0; i < 3; i++) { const a = rad(-90 + i * 120); out.push({ x: Math.cos(a) * 0.52 * 520, y: Math.sin(a) * 0.52 * 520, t0: 0.7 + 0.25 * i }); }
    return out;
  })();
  const litMask = env => env.lit != null ? env.lit : (stOf(env) && stOf(env).props && stOf(env).props.svLit != null ? stOf(env).props.svLit : 0xfff);
  const bladePt = (env, b) => { const st = stOf(env), side = st && st.props && st.props.svBladeSide === -1 ? -1 : 1; return { x: b.x + side * 62, y: b.y + 70 }; };
  function rbSources(room) {
    const out = RB_SRC.slice();
    for (const k in room.ev) if (k.startsWith('svcut:')) { const e = room.ev[k]; out.push({ x: e.x, y: e.y, t0: 0.6 + 0.25 * ((+k.slice(6) || 1) - 1), stump: 1 }); }
    return out;
  }
  // a ribbon of fire spiralling in to the blade, a bright head and a thinning tail
  function ribbonIn(c, s, P, q, a) {
    const dx = s.x - P.x, dy = s.y - P.y, D0 = Math.hypot(dx, dy), th0 = Math.atan2(dy, dx);
    const at = qq => { const e = Math.pow(c01(qq), 1.5), d = D0 * (1 - e), th = th0 + 4.6 * e; return [P.x + Math.cos(th) * d, P.y + Math.sin(th) * d * 0.92]; };
    const tail = Math.max(0, q - 0.34), N = LOW ? 6 : 12, pts = []; for (let i = 0; i <= N; i++) pts.push(at(lerp(tail, Math.min(1, q), i / N)));
    c.save(); c.lineCap = c.lineJoin = 'round';
    for (const [k, col, al, ad] of [[1.5, K.ink, 0.35, 0], [1, K.red, 0.85, 1], [0.62, K.ember, 0.95, 1], [0.34, K.gold, 1, 1], [0.12, K.white, 1, 1]]) {
      c.globalCompositeOperation = ad ? 'lighter' : 'source-over';
      for (let sec = 0; sec < 3; sec++) {   // (three sections, tail to head, each its own width and strength: one stroke each)
        const i0 = Math.floor(sec * N / 3), i1 = Math.floor((sec + 1) * N / 3), f = (sec + 1) / 3; c.beginPath(); c.moveTo(pts[i0][0], pts[i0][1]); for (let i = i0 + 1; i <= i1; i++) c.lineTo(pts[i][0], pts[i][1]);
        c.lineWidth = (2 + 10 * f) * k; c.strokeStyle = rgba(col, al * a * Math.pow(f, 0.8)); c.stroke();
      }
    }
    const h = pts[N]; glow(c, h[0], h[1], 20, K.hot, 0.6 * a); glow(c, h[0], h[1], 8, K.white, 0.9 * a);
    c.restore();
  }
  // the blade, planted: a tall blade of light standing in the floor, its heat growing as the fire arrives (g 0..1); drawn over the Sovereign, additive only
  function plantedBlade(c, P, y0, g, a) {
    if (a <= 0.02) return;
    c.save(); c.translate(P.x, P.y + y0); c.globalCompositeOperation = 'lighter';
    const body = f => { c.beginPath(); c.moveTo(0, 0); c.lineTo(11 * f, -34); c.lineTo(8 * f, -170); c.lineTo(0, -184); c.lineTo(-8 * f, -170); c.lineTo(-11 * f, -34); c.closePath(); };
    glow(c, 0, -90, 120, K.ember, (0.14 + 0.22 * g) * a);
    for (const [f, col, al] of [[1.6, K.red, 0.35 + 0.2 * g], [1.05, K.ember, 0.6 + 0.3 * g], [0.62, K.gold, 0.8], [0.26, K.white, 1]]) { body(f); c.fillStyle = rgba(col, al * a); c.fill(); }
    c.beginPath(); c.rect(-32, -188, 64, 8); c.fillStyle = rgba(K.gold, 0.85 * a); c.fill(); c.beginPath(); c.rect(-5, -226, 10, 40); c.fillStyle = rgba(K.ember, 0.8 * a); c.fill();
    glow(c, 0, -228, 12, K.white, 0.8 * a); glow(c, 0, 0, 40, K.hot, (0.3 + 0.5 * g) * a);
    c.restore();
  }
  // a blade of light laid out along an angle from the halo (the opening of the wheel): ink edge, red, gold and a white spine
  function bladeRay(c, x, y, an, L, w, a) {
    if (a <= 0.02 || L < 4) return;
    c.save(); c.translate(x, y); c.rotate(an);
    const path = f => { c.beginPath(); c.moveTo(0, -w * 0.25 * f); c.lineTo(L * 0.16, -w * 0.5 * f); c.lineTo(L, 0); c.lineTo(L * 0.16, w * 0.5 * f); c.lineTo(0, w * 0.25 * f); c.closePath(); };
    path(1.5); c.fillStyle = rgba(K.ink, 0.4 * a); c.fill();
    c.globalCompositeOperation = 'lighter';
    for (const [f, col, al] of [[1.1, K.red, 0.7], [0.78, K.ember, 0.85], [0.5, K.gold, 0.95], [0.18, K.white, 1]]) { path(f); c.fillStyle = rgba(col, al * a); c.fill(); }
    c.restore();
  }
  function rebirthDark(c, room, t, env) {
    const ev = room.ev.svrebirth; if (!ev) return;
    const u = t - ev.start, d0 = ev.dark ? +ev.dark[0] : 2.5, halo = +ev.halo || 4;
    if (u < d0 - 1.4 || u > halo + 5.2) return;
    const wu = warpU(u, halo), b = bossAt(env), P = bladePt(env, b);
    const inK = sm(c01((u - (d0 - 1.2)) / 1.2)), rev = sm(c01((wu - (halo + 1.0)) / 2.4)), A = 0.94 * inK * (1 - rev);
    if (A <= 0.02) return;
    const hr = 210 + 900 * sm(c01((wu - halo) / 2.8));
    darkLayer(c, 1100, g => {
      g.fillStyle = rgba(RBDK, A); g.fillRect(-1100, -1100, 2200, 2200);
      cutLit(g, b.x, b.y, hr, 0.97);                      // the halo
      if (wu < halo + 0.8) cutLit(g, P.x, P.y - 60, 150, 0.75);   // the blade's own light
      if (env.units) for (const un of env.units) cutLit(g, un.x, un.y, 120, 0.95);   // the party
      return { col: RBDK, a: A };
    });
  }
  function skySplit(c, u, crater) {
    const a = u - (crater - 0.15); if (a < 0 || a > 4.4) return;
    const Rf = (typeof ARENA !== 'undefined' && ARENA.full) || RR(), sx = 0.37 * Rf, sy = -(Rf + 160), open = eo3(c01(a / 0.55)), close = 1 - sm(c01((a - 1.6) / 2.4)), w = open * close;
    const bump = c01(a / 0.5) * (1 - c01((a - 1.0) / 3.2));
    c.save(); c.lineJoin = c.lineCap = 'round';
    if (w > 0.02) {   // the rift: a jagged seam in the sky, its lips dark, its light the meteor's
      const pts = []; for (let i = 0; i <= 14; i++) { const q = i / 14; pts.push([sx - 620 + 1240 * q + (hs(i, 421) - 0.5) * 40, sy - 60 + Math.sin(q * 7) * 30 + (hs(i, 422) - 0.5) * 60 * (i % 2)]); }
      polyStroke(c, pts, 6 + 54 * w, K.ink, 0.5 * w);
      c.globalCompositeOperation = 'lighter'; polyStroke(c, pts, 4 + 36 * w, '#7a4ad8', 0.45 * w); polyStroke(c, pts, 3 + 20 * w, '#ff9a4a', 0.8 * w); polyStroke(c, pts, 1 + 8 * w, K.white, 0.95 * w);
    }
    c.globalCompositeOperation = 'lighter';
    glow(c, sx, sy, 400, '#ff7a30', 0.45 * bump); glow(c, sx, sy, 170, '#ffc890', 0.5 * bump); glow(c, sx, sy, 60, K.white, 0.55 * bump);
    for (let i = 0; i < cnt(30); i++) {   // (embers shaken down off the rekindled meteor, crossing the room)
      const ph = (a * 0.55 + hs(i, 423)) % 1, x = sx + (hs(i, 424) - 0.5) * 1000 - ph * 160, y = sy + 20 + ph * (Math.abs(sy) + 620), al = Math.sin(ph * Math.PI) * 0.8 * c01(a / 0.6) * (1 - c01((a - 2.8) / 1.5));
      if (al > 0.03) streak(c, x + 10, y - 44, x, y, 2.2, al, { mid: '#ff9a4a', hi: '#ffe0b0' });
    }
    c.restore();
  }
  function rebirthUnder(c, room, t, env) {
    const ev = room.ev.svrebirth; if (!ev) return;
    const u = t - ev.start, dur = +ev.dur || 12; if (u < -0.1 || u > dur + 1) return;
    const b = bossAt(env), P = bladePt(env, b), halo = +ev.halo || 4, crater = +ev.crater || 5;
    c.save();
    const srcs = rbSources(room); let arrived = 0;
    for (const s of srcs) if (u >= s.t0 + RB_FLIGHT) arrived++;
    const g = srcs.length ? arrived / srcs.length : 0;
    if (u < 5.2) {
      for (let si = 0; si < srcs.length; si++) {   // the fire leaving each place: it gathers, is drawn off, and the place is left black (low effects: every other one)
        const s = srcs[si]; if (LOW && si % 2) continue;
        if (u < s.t0) { const k = c01(u / s.t0); add(c, () => glow(c, s.x, s.y, 36 + 16 * k, K.ember, 0.3 * k)); continue; }
        const q = (u - s.t0) / RB_FLIGHT;
        if (u < s.t0 + 0.45) { const f = 1 - (u - s.t0) / 0.45, ang = Math.atan2(P.y - s.y, P.x - s.x); tongue(c, s.x, s.y, ang, 18 + 44 * (1 - f), 18, u * 3, FIRE, 0.9 * f); }
        glow(c, s.x, s.y, 30, K.char, 0.55 * c01((u - s.t0) / 0.5));
        if (q < 1) ribbonIn(c, s, P, q, 1);
      }
    }
    if (u > 0.3 && u < halo + 1.2) {   // the blade driven in: a ring, fissures round it, the blade standing, a light that grows as the fire arrives
      const au = u - 0.3, k = c01(au / 0.2), lit = 0.25 + 0.75 * g, out = u > halo ? 1 - c01((u - halo) / 1.2) : 1;
      c.save(); clipRoom(c);
      crackLines(c, P.x, P.y, 9, 10, 20 + 230 * eo3(c01(au / 0.9)), 411, 0.9 * k * out, 0.5 + 0.5 * g);
      if (au < 0.8) bandRing(c, P.x, P.y, 20 + 150 * eo3(au / 0.8), 30 * (1 - au / 0.8) + 4, 0.8 * (1 - au / 0.8), [K.dark, K.red, K.ember]);
      c.restore();
      add(c, () => { glow(c, P.x, P.y - 20, 150 + 120 * g, K.ember, (0.25 + 0.3 * g) * out); glow(c, P.x, P.y - 20, 60, K.hot, (0.3 + 0.5 * g) * out); });
      for (const s of srcs) { const ag = u - s.t0 - RB_FLIGHT; if (ag >= 0 && ag < 0.35) add(c, () => glow(c, P.x, P.y - 16, 46 * (1 - ag / 0.35) + 14, K.hot, 0.6 * (1 - ag / 0.35))); }
    }
    if (u > crater - 0.2) skySplit(c, u, crater);
    c.restore();
  }
  // a toll of light across the whole floor: rings of white-gold and violet
  function tollRings(c, b, age, scale) {
    if (age < 0 || age > 2.4) return;
    const R = RR(); c.save(); clipRoom(c);
    for (const [d, pal, w] of [[0, GLASS, 56], [0.2, ['#2a1670', '#a47bff', '#f4f0ff'], 30], [0.4, GLASS, 16]]) {
      const q = c01((age - d) / 1.4); if (q <= 0 || q >= 1) continue;
      bandRing(c, b.x, b.y, 60 + (R + 200) * eo3(q), (w * (1 - 0.6 * q) + 4) * scale, 0.9 * (1 - ei(q)) * (d ? 0.75 : 1), pal);
    }
    const f = c01(age / 0.3); if (f < 1) add(c, () => glow(c, b.x, b.y - 40, 240 * (1 - f) + 60, '#d8c8ff', 0.4 * (1 - f)));
    c.restore();
  }
  function rebirthOver(c, room, t, env) {
    const ev = room.ev.svrebirth; if (!ev) return;
    const u = t - ev.start, dur = +ev.dur || 12; if (u < -0.1 || u > dur + 1) return;
    const b = bossAt(env), halo = +ev.halo || 4, choir = +ev.choir || 6, wu = warpU(u, halo), ou = wu - halo, R = RR(), hr = haloR(env), mask = litMask(env);
    c.save();
    if (ou > -0.9 && ou < 3.4) {
      if (ou < 0) {   // the breath in: a ring of light draws onto the halo
        const q = 1 + ou / 0.9;
        add(c, () => { c.beginPath(); c.arc(b.x, b.y, hr + 190 * (1 - q), 0, TAU); c.lineWidth = 3; c.strokeStyle = rgba(K.gold, 0.6 * q); c.stroke(); glow(c, b.x, b.y, hr * 0.9, K.gold, 0.18 * q); });
      } else {   // the halo opens: a ring of light out to the edge of the room, and a blade of light along each lit sigil
        const q = c01(ou / 1.5), rr = hr + (R + 60 - hr) * eo3(q), a = 1 - ei(c01((q - 0.3) / 0.7)), rq = sm(c01((ou - 1.4) / 1.2));
        c.save(); clipRoom(c);
        bandRing(c, b.x, b.y, rr, 52 * (1 - q) + 8, 0.95 * a, GLASS);
        bandRing(c, b.x, b.y, Math.max(hr, rr * 0.92), 18 * (1 - q) + 3, 0.5 * a, ['#2a1670', '#a47bff', '#f4f0ff']);
        c.restore();
        for (let i = 0; i < 12; i++) {
          const p = haloPt(env, i), an = Math.atan2(p.y - b.y, p.x - b.x);
          if (mask & (1 << i)) bladeRay(c, b.x + Math.cos(an) * (hr - 20), b.y + Math.sin(an) * (hr - 20), an, (R * 0.98 - hr + 20) * eo3(c01(ou / 1.2)), 28, 0.95 * (1 - rq));
          else add(c, () => glow(c, p.x, p.y, 24, '#8e97ad', 0.2 * (1 - c01(ou / 1.4))));   // (a dark sigil: only a puff of cold ash, no light)
        }
        add(c, () => {
          glow(c, b.x, b.y - 30, 270 * (1 - c01(ou / 0.55)) + 90, K.hot, 0.45 * (1 - c01(ou / 0.55)));
          for (let i = 0; i < cnt(46); i++) { const an = hs(i, 431) * TAU, sp = 300 + 700 * hs(i, 432), d1 = hr + sp * eo3(c01(ou / 1.3)), d0 = hr + sp * eo3(c01(ou / 1.3 - 0.1)); streak(c, b.x + Math.cos(an) * d0, b.y + Math.sin(an) * d0 * 0.92, b.x + Math.cos(an) * d1, b.y + Math.sin(an) * d1 * 0.92, 2.2, 0.9 * (1 - c01(ou / 1.5))); }
        });
      }
    }
    if (u > 0.3 && u < halo + 1.2) {
      const au = u - 0.3, srcs = rbSources(room); let arrived = 0; for (const s of srcs) if (u >= s.t0 + RB_FLIGHT) arrived++;
      plantedBlade(c, bladePt(env, b), -320 * (1 - eo3(c01(au / 0.16))), 0.25 + 0.75 * (srcs.length ? arrived / srcs.length : 0), u > halo ? 1 - c01((u - halo) / 1.2) : 1);
    }
    tollRings(c, b, u - choir, 1);
    const cu = u - 8.6;   // the cast: the room's light gathers into the halo
    if (cu > 0 && cu < 3.6) {
      const k = c01(cu / 0.6) * (1 - c01((cu - 3.2) / 0.4));
      add(c, () => {
        glow(c, b.x, b.y - 20, hr * (1.5 + 0.3 * cu / 3.4), '#c8a6ff', 0.34 * k); glow(c, b.x, b.y - 20, hr * 0.8, K.gold, 0.38 * k * (0.3 + 0.7 * cu / 3.4));
        for (let j = 0; j < 3; j++) { const ph = (cu * 0.55 + j / 3) % 1, rr = hr + (R * 0.95 - hr) * Math.pow(1 - ph, 1.6); c.beginPath(); c.arc(b.x, b.y, rr, 0, TAU); c.lineWidth = 3; c.strokeStyle = rgba(j % 2 ? K.gold : '#c8a6ff', 0.6 * Math.sin(ph * Math.PI) * k); c.stroke(); }
        for (let i = 0; i < cnt(46); i++) { const ph = (cu * 0.4 + hs(i, 411)) % 1, an = hs(i, 412) * TAU, d = hr + (R * 0.95 - hr) * Math.pow(1 - ph, 1.4); glow(c, b.x + Math.cos(an) * d, b.y + Math.sin(an) * d * 0.92, 5 + 3 * hs(i, 413), i % 3 ? K.gold : '#c8a6ff', Math.sin(ph * Math.PI) * 0.95 * k); }
      });
    }
    c.restore();
  }
  // the raidwide that ends the set piece (hidden): its toll, and cinders falling after
  TELL.svRebirth = {
    over(c, r, t, env) {
      const age = t - r.land; if (age < 0 || age > 2.6 || r.cancel) return;
      const b = bossAt(env); tollRings(c, b, age, 1.2);
      rise(c, b.x, b.y - 80, { n: 30, t: age, per: 2.4, rise: -140, spread: RR() * 1.5, a: 0.8 * (1 - c01(age / 2.6)), seed: 441, col: '#c8a6ff', hot: K.white });
    },
  };

  // what is drawn first in the floor layer: the wall's vignette and Rebirth's dark (everything else of ours then lies over them)
  function shade(c, room, t, env, H) {
    if (H) heartVignette(c, H);
    rebirthDark(c, room, t, env);
  }

  // ---------------------------------------------------------------------------------------------------------------- FX4: Act III's unleashings (Corvane's stance, Crescent, Lance, Pyre, the Dance, the Sunwheel)
  // Everything here lies UNDER the telegraph fills except brief strikes (a streak racing a line, a blink's glint, a clang, the catch flash), which are drawn over for
  // under half a second at the instant the telegraph itself resolves. Safe ground is never painted: a fan's heat is only ever inside the fan, a line's only on the line.
  const SILV = { ink: '#070a16', dk: '#3c4c80', mid: '#9db2e6', hi: '#dfeaff' };   // Caelum's silver-white
  const SILVP = [SILV.dk, SILV.mid, SILV.hi], COLD = { mid: K.blueMid, hi: K.blueHi }, SILO = { mid: SILV.mid, hi: SILV.hi };
  const rot2 = (a, x, y) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
  // a fire band on the current path: ink edge, (a cold fringe for Corvane's), red, ember, gold and a white core
  function bandStroke(c, w, a, cold) {
    const L = [[1.2, K.ink, 0.42], cold ? [0.98, K.blueMid, 0.55] : null, [0.8, K.red, 0.8], [0.55, K.ember, 0.95], [0.28, K.gold, 1], [0.09, K.white, 1]];
    for (const l of L) { if (!l) continue; c.lineWidth = w * l[0]; c.strokeStyle = rgba(l[1], l[2] * a); c.stroke(); }
  }
  const numSprite = (n, sil) => sprite('svn' + n + (sil ? 's' : 'e'), 72, 72, g => {
    g.translate(36, 38); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 44px Georgia, "Times New Roman", serif'; g.lineJoin = 'round';
    g.lineWidth = 9; g.strokeStyle = rgba(K.ink, 0.85); g.strokeText(String(n), 0, 0);
    g.lineWidth = 4; g.strokeStyle = rgba(sil ? SILV.mid : K.ember, 1); g.strokeText(String(n), 0, 0);
    g.fillStyle = sil ? '#f4f8ff' : K.hot; g.fillText(String(n), 0, 0);
  });
  // what the host remembers of Act III's echoes: Corvane's place (from his svecho) and when a Sunwheel was caught (svwallout:n; the event itself is gone after 1.5 s)
  function trackFx4(room) {
    for (const k in room.ev) {
      if (k.startsWith('svecho:')) { const e = room.ev[k]; if (e.who === 'corvane') S.cv[k.slice(7)] = { x: +e.x || 0, y: +e.y || 0, face: +e.face || 0 }; }
      else if (k.startsWith('svwallout:')) { const n = k.slice(10); if (S.wo[n] == null) S.wo[n] = room.ev[k].start; }
    }
  }

  // ---- Corvane's stance (svechoact:<his n> with anim crane | comet | parting): a cold-blue gleam runs along his blade and an ember gleam answers it on the Sovereign's,
  // out of step at first and falling into step: the two agree. A faint thread joins the tips; a shared flare as the move begins.
  const STANCE_LEN = { crane: 92, comet: 114, parting: 64 };
  function bladesOf(env, cv, anim) {
    const b = bossAt(env), st = stOf(env), sg = st && st.props && st.props.svBladeSide === -1 ? -1 : 1, fs = Number.isFinite(b.facing) ? b.facing : Math.atan2(cv.y - b.y, cv.x - b.x);
    const hs0 = rot2(fs, 16, 30 * sg), ds = fs + Math.atan2(0.52 * sg, 0.85), Ls = anim === 'parting' ? 70 : anim === 'comet' ? 104 : 90;
    const S0 = { x: b.x + hs0[0], y: b.y + hs0[1] }, S1 = { x: S0.x + Math.cos(ds) * Ls, y: S0.y + Math.sin(ds) * Ls };
    const hc = rot2(cv.face, 8, -18), dc = cv.face - 0.4, Lc = STANCE_LEN[anim] || 90;
    const C0 = { x: cv.x + hc[0], y: cv.y + hc[1] }, C1 = { x: C0.x + Math.cos(dc) * Lc, y: C0.y + Math.sin(dc) * Lc };
    return { S0, S1, C0, C1, ds, dc };
  }
  function gleamAlong(c, p0, p1, ph, col, hi, a, w) {
    if (a <= 0.02) return;
    const g = ph < 0 ? 0 : ph > 1 ? 1 : ph, en = Math.sin(g * Math.PI), ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    add(c, () => {
      c.lineCap = 'round'; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y);
      c.strokeStyle = rgba(col, 0.25 * a); c.lineWidth = w * 3.4; c.stroke(); c.strokeStyle = rgba(hi, 0.65 * a); c.lineWidth = w; c.stroke(); c.strokeStyle = rgba(K.white, 0.75 * a); c.lineWidth = Math.max(1, w * 0.35); c.stroke();
      glow(c, lerp(p0.x, p1.x, g), lerp(p0.y, p1.y, g), 10 + 16 * en, hi, 0.7 * a * en);
    });
    glint(c, lerp(p0.x, p1.x, g), lerp(p0.y, p1.y, g), 5 + 15 * en, ang, hi, a * en);
  }
  function stanceUnder(c, ev, n, t, env, room) {
    const cv = S.cv[n], anim = ev.anim; if (!cv || !STANCE_LEN[anim]) return;
    const u = t - ev.start; let go = null;
    for (const k in room.ev) if (/^sv(crescent|lance|pyre):/.test(k)) { const d = room.ev[k].start - ev.start; if (d > -0.2 && d < 6 && (go == null || d < go)) go = d; }
    if (go == null) go = 2.2;
    if (u < -0.1 || u > go + 1.0) return;
    const B = bladesOf(env, cv, anim), PER = 1.0, k = c01((u + 0.1) / 0.45) * (1 - c01((u - go) / 0.9)), lag = 0.4 * (1 - c01(u / 1.8));
    const pc = (u / PER) % 1, ue = u - lag, pe = ue > 0 ? (ue / PER) % 1 : -1, flare = u > go ? Math.exp(-(u - go) * 3.5) : 0, agree = 1 - lag / 0.4;
    c.save();
    gleamAlong(c, B.C0, B.C1, pc, K.blueMid, K.blueHi, k, 3);
    if (pe >= 0) gleamAlong(c, B.S0, B.S1, pe, K.ember, K.gold, k * c01(ue / 0.4), 3.4);
    // the thread between the two tips: it brightens as the gleams fall into step, and a mote runs each way
    add(c, () => {
      const q = c01(u / 1.8);
      c.setLineDash([5, 9]); c.lineDashOffset = -u * 18; c.beginPath(); c.moveTo(B.C1.x, B.C1.y); c.lineTo(B.S1.x, B.S1.y); c.strokeStyle = rgba(K.hot, (0.1 + 0.3 * agree + 0.4 * flare) * k); c.lineWidth = 1.6 + 2 * flare; c.stroke(); c.setLineDash([]);
      const m = (u * 0.9) % 1;
      glow(c, lerp(B.C1.x, B.S1.x, m * 0.5), lerp(B.C1.y, B.S1.y, m * 0.5), 6, K.blueHi, 0.6 * k * q);
      glow(c, lerp(B.S1.x, B.C1.x, m * 0.5), lerp(B.S1.y, B.C1.y, m * 0.5), 6, K.gold, 0.6 * k * q);
      glow(c, B.C1.x, B.C1.y, 14 + 22 * flare, K.blueHi, (0.2 + 0.7 * flare) * k);
      glow(c, B.S1.x, B.S1.y, 14 + 26 * flare, K.hot, (0.2 + 0.8 * flare) * k);
    });
    if (flare > 0.05) { const R = 20 + 70 * (1 - flare); c.beginPath(); c.arc(B.S1.x, B.S1.y, R, 0, TAU); c.strokeStyle = rgba(K.gold, 0.6 * flare); c.lineWidth = 2; c.globalCompositeOperation = 'lighter'; c.stroke(); c.beginPath(); c.arc(B.C1.x, B.C1.y, R, 0, TAU); c.strokeStyle = rgba(K.blueHi, 0.6 * flare); c.stroke(); }
    c.restore();
  }

  // ---- Crescent (svcrescent:n): two wide fans of flame, the Sovereign's ember, Corvane's ember with a cold edge. They sweep out across each other, then turn a quarter.
  // Wind-up: the fan's heat and its two edges, only inside the fan; the turn is the leading edge sweeping to its place, only inside the second fan.
  const fanPath = (c, x, y, ang, arc) => { c.moveTo(x, y); c.arc(x, y, 1500, ang - arc * 0.5, ang + arc * 0.5); c.closePath(); };
  const crFans = ev => [[ev.x, ev.y, ev.a, 0], [ev.kx, ev.ky, ev.ka, 1]];
  function crescentUnder(c, ev, t) {
    const at = ev.at, u = t - ev.start, arc = ev.arc || 2;
    if (u < -0.1 || u > at[1] + 8.5) return;
    const k = u < at[0] ? 0 : u < at[1] ? 1 : -1;
    for (const [x, y, A, cold] of crFans(ev)) {
      if (k >= 0) {
        const t0 = k ? at[0] : 0, p = c01((u - t0) / (at[k] - t0)), kw = c01((u - t0 + 0.1) / 0.5) * (0.25 + 0.75 * p), ang = A[k];
        c.save(); clipRoom(c); c.beginPath(); fanPath(c, x, y, ang, arc); c.clip();
        add(c, () => {
          c.fillStyle = rgba(K.ember, (0.02 + 0.07 * ei(p)) * kw); c.fillRect(x - 1600, y - 1600, 3200, 3200);
          for (const s of [-1, 1]) {
            const ae = ang + s * arc * 0.5, ca = Math.cos(ae), sa = Math.sin(ae);
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + ca * 1500, y + sa * 1500);
            if (cold) { c.strokeStyle = rgba(K.blueMid, 0.4 * kw); c.lineWidth = 12 + 8 * p; c.stroke(); }
            c.strokeStyle = rgba(K.red, 0.5 * kw); c.lineWidth = 6 + 8 * p; c.stroke(); c.strokeStyle = rgba(cold ? K.blueHi : K.gold, 0.85 * kw); c.lineWidth = 2.4 + 2 * p; c.stroke();
            for (let j = 0; j < 3; j++) { const d = 140 + ((u * 0.45 + j / 3 + (s > 0 ? 0.17 : 0)) % 1) * 1200; glow(c, x + ca * d, y + sa * d, 9, cold && j === 1 ? K.blueHi : K.hot, 0.6 * kw); }
          }
          glow(c, x, y, 60 + 60 * p, cold ? K.blueMid : K.ember, 0.3 * kw);
        });
        if (k === 1) {   // the turn: the leading edge sweeps from where the first fan ended to where the second stands
          const gap = at[1] - at[0], sw = sm(c01((u - at[0] - 0.05) / Math.max(0.3, gap - 0.35))), as = lerp(A[0], A[1], sw) + arc * 0.5, e = Math.sin(sw * Math.PI);
          if (e > 0.03) { streak(c, x + Math.cos(as) * 60, y + Math.sin(as) * 60, x + Math.cos(as) * 1400, y + Math.sin(as) * 1400, 12, 0.8 * Math.sqrt(e), cold ? COLD : {}); }
        }
        c.restore();
      }
      // the scars the beats left, in the fans: rays of cooling fire (the first beat's stay through the gap)
      for (let j = 0; j < 2; j++) {
        const age = u - at[j]; if (age < 0.12 || age > 7.5) continue;
        const fade = 1 - c01(age / 7), heat = 1 - c01(age / 2.6), ang = A[j], p = new Path2D();
        for (let i = 0; i < 7; i++) { const an = ang - arc * 0.44 + arc * 0.88 * hs(i, 80 + j + cold * 7), d0 = 90 + 120 * hs(i, 81), d1 = 420 + 1000 * hs(i, 82); p.moveTo(x + Math.cos(an) * d0, y + Math.sin(an) * d0); p.lineTo(x + Math.cos(an + 0.02) * (d0 + d1) * 0.5, y + Math.sin(an + 0.02) * (d0 + d1) * 0.5); p.lineTo(x + Math.cos(an) * d1, y + Math.sin(an) * d1); }
        c.save(); clipRoom(c); c.lineCap = 'round'; c.lineJoin = 'round';
        c.lineWidth = 15; c.strokeStyle = rgba(K.ink, 0.34 * fade * c01(age / 0.3)); c.stroke(p);
        add(c, () => { c.lineWidth = 6; c.strokeStyle = rgba(K.ember, 0.5 * heat); c.stroke(p); c.lineWidth = 2; c.strokeStyle = rgba(cold ? K.blueHi : K.gold, 0.7 * heat); c.stroke(p); });
        c.restore();
      }
    }
  }
  function crescentOver(c, ev, t) {
    const at = ev.at, u = t - ev.start, arc = ev.arc || 2;
    for (let j = 0; j < 2; j++) {
      const age = u - at[j]; if (age < 0 || age > 1.3) continue;
      const q = c01(age / 0.8), rad = 70 + 1500 * Math.pow(q, 1.4), a = 0.95 * (1 - ei(c01((q - 0.6) / 0.4))), w = 130 * (1 - 0.35 * q);
      c.save(); clipRoom(c);
      for (const [x, y, A, cold] of crFans(ev)) {
        const ang = A[j]; c.save(); c.beginPath(); fanPath(c, x, y, ang, arc); c.clip();
        if (q < 1) {
          c.beginPath(); c.arc(x, y, rad, ang - arc * 0.5 - 0.05, ang + arc * 0.5 + 0.05); bandStroke(c, w, a, cold);
          for (let i = 0; i < 26; i += stp()) { const an = ang - arc * 0.5 + arc * i / 25 + (hs(i, 83) - 0.5) * 0.06; tongue(c, x + Math.cos(an) * (rad + 8), y + Math.sin(an) * (rad + 8), an, (34 + 38 * hs(i, 84)) * (1 - q * 0.5), 28, t * 2.2 + i * 0.8, FIRE, a * 0.9); }
          add(c, () => { for (let i = 0; i < 12; i++) { const an = ang - arc * 0.5 + arc * hs(i, 85), d = rad - 20 * hs(i, 86); glow(c, x + Math.cos(an) * d, y + Math.sin(an) * d, 6 + 4 * hs(i, 87), cold && i % 3 === 0 ? K.blueHi : K.hot, a * 0.75); } });
        }
        add(c, () => glow(c, x, y, 170 * (1 - q) + 40, cold ? K.blueHi : K.hot, 0.5 * (1 - q)));
        c.restore();
      }
      c.restore();
    }
  }

  // ---- Lance (svlance:n): a blade-thin streak of flame down each line; the line is left burning to the wall and the wall's floor cracks where it struck.
  const lnLines = ev => ev.l.map(([x1, y1, x2, y2, at], i) => { const L = Math.hypot(x2 - x1, y2 - y1) || 1; return { x1, y1, x2, y2, at, cold: i, L, ux: (x2 - x1) / L, uy: (y2 - y1) / L }; });
  function lanceUnder(c, ev, t) {
    const u = t - ev.start; if (u < -0.1) return;
    lnLines(ev).forEach((l, i) => {
      const age = u - l.at, { x1, y1, x2, y2, L, ux, uy, cold } = l; if (age > 9) return;
      if (age < 0) {
        const p = c01(u / l.at), kw = c01((u + 0.1) / 0.5) * (0.25 + 0.75 * p);
        c.save(); clipRoom(c);
        add(c, () => {
          c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
          c.strokeStyle = rgba(cold ? K.blueMid : K.red, 0.5 * kw); c.lineWidth = 3 + 7 * p; c.stroke(); c.strokeStyle = rgba(K.gold, 0.85 * kw); c.lineWidth = 1.6 + 2.4 * p; c.stroke(); c.strokeStyle = rgba(K.white, 0.7 * kw * p); c.lineWidth = 1; c.stroke();
          for (let j = 0; j < 3; j++) { const d = ((u * 0.8 + j / 3) % 1) * L; glow(c, x1 + ux * d, y1 + uy * d, 8, K.hot, 0.6 * kw); }
          glow(c, x1, y1, 30 + 30 * p, cold ? K.blueHi : K.ember, 0.3 * kw);
        });
        c.restore();
        glint(c, x1, y1, 8 + 24 * p, Math.atan2(uy, ux), cold ? K.blueHi : K.hot, kw);   // (the needle's point charging)
      } else {
        const fade = 1 - c01(age / 6.5), heat = 1 - c01(age / 2.4);
        c.save(); clipRoom(c); c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
        c.strokeStyle = rgba(K.ink, 0.4 * fade * c01(age / 0.2)); c.lineWidth = 20; c.stroke();
        add(c, () => {
          if (cold) { c.strokeStyle = rgba(K.blueMid, 0.22 * heat); c.lineWidth = 15; c.stroke(); }
          c.strokeStyle = rgba(K.ember, 0.6 * heat); c.lineWidth = 8; c.stroke(); c.strokeStyle = rgba(K.gold, 0.85 * heat); c.lineWidth = 2.8; c.stroke(); c.strokeStyle = rgba(K.hot, 0.6 * heat * heat); c.lineWidth = 1.2; c.stroke();
        });
        for (let j = 0; j < 4; j++) rise(c, x1 + ux * L * (j + 0.5) / 4, y1 + uy * L * (j + 0.5) / 4, { n: 3, t: age + j, per: 1.7, rise: 60, spread: 16, size: 2.4, a: 0.6 * heat, seed: 90 + j + i * 5 });
        c.restore();
        const g = c01(age / 0.25);   // the wall's floor, cracked where the lance struck
        scorch(c, x2, y2, 76, 0.55 * fade * g, heat, 95 + i, K.ember);
        crackLines(c, x2, y2, 9, 8, 24 + 96 * eo3(g), 61 + i * 9, 0.95 * fade, heat);
      }
    });
  }
  function lanceOver(c, ev, t) {
    const u = t - ev.start;
    lnLines(ev).forEach((l, i) => {
      const age = u - l.at; if (age < 0 || age > 1.0) return;
      const head = eo3(c01(age / 0.12)), tail = c01((age - 0.07) / 0.5), a = 1 - ei(c01((age - 0.1) / 0.55)), dx = l.x2 - l.x1, dy = l.y2 - l.y1;
      c.save(); clipRoom(c);
      streak(c, l.x1 + dx * tail, l.y1 + dy * tail, l.x1 + dx * head, l.y1 + dy * head, 15 * (1 - 0.6 * c01(age / 0.6)), a, l.cold ? COLD : {});
      c.restore();
      const ia = age - 0.07;
      if (ia > 0) {   // the strike at the wall: a flash, a ring, sparks thrown back along the line
        const q = c01(ia / 0.4), an = Math.atan2(l.uy, l.ux) + Math.PI;
        add(c, () => {
          glow(c, l.x2, l.y2, 100 * (1 - c01(ia / 0.3)) + 20, l.cold ? K.blueHi : K.hot, 0.65 * (1 - q));
          c.beginPath(); c.arc(l.x2, l.y2, 14 + 100 * eo3(q), 0, TAU); c.lineWidth = 3 * (1 - q); c.strokeStyle = rgba(l.cold ? K.blueHi : K.gold, 0.8 * (1 - q)); c.stroke();
        });
        glint(c, l.x2, l.y2, 46 * (1 - q) + 8, an + 0.5, l.cold ? K.blueHi : K.hot, 1 - q);
        for (let j = 0; j < 14; j++) { const sa = an + (hs(j, 100 + i) - 0.5) * 2.1, sp = 180 + 340 * hs(j, 101), d1 = sp * ia, d0 = sp * Math.max(0, ia - 0.08); streak(c, l.x2 + Math.cos(sa) * d0, l.y2 + Math.sin(sa) * d0, l.x2 + Math.cos(sa) * d1, l.y2 + Math.sin(sa) * d1, 2.6, 1 - q, l.cold && j % 2 ? COLD : {}); }
      }
    });
  }

  // ---- Pyre (svpyre:n): numbered burning marks where the heroes stood; the Sovereign and Corvane blink between them from either end, each cut a streak of fire.
  // Mark j is cut by the Sovereign's beat j-1 and by Corvane's beat n-j. The mark the next beat reaches is brightest; each flares as a cut passes and goes out after its last.
  function pyreUnder(c, ev, t) {
    const u = t - ev.start, m = ev.m, n = m.length, S1 = ev.s || [], C1 = ev.c || []; if (u < -0.1) return;
    const endU = Math.max(S1.length ? S1[S1.length - 1][4] : 0, C1.length ? C1[C1.length - 1][4] : 0); if (u > endU + 6) return;
    let nk = S1.length; for (let k = 0; k < S1.length; k++) if (S1[k][4] > u) { nk = k; break; }
    for (let j = 1; j <= n; j++) {
      const [x, y] = m[j - 1], h1 = j - 1, h2 = n - j, b1 = S1[h1] ? S1[h1][4] : 1e9, b2 = C1[h2] ? C1[h2][4] : 1e9, last = Math.min(1e8, Math.max(S1[h1] ? b1 : 0, C1[h2] ? b2 : 0));
      const gone = u > last ? c01((u - last) / 0.9) : 0, k = c01((u + 0.1 - j * 0.07) / 0.5) * (1 - gone); if (k < 0.02) continue;
      const lit = nk === h1 || nk === h2 ? 1 : 0.5, fl = Math.max(u > b1 ? Math.exp(-(u - b1) * 5) : 0, u > b2 ? Math.exp(-(u - b2) * 5) : 0), kk = k * (0.55 + 0.45 * lit) * (1 + 0.35 * fl);
      c.save(); c.lineJoin = c.lineCap = 'round';
      c.beginPath(); c.arc(x, y, 46, 0, TAU); c.lineWidth = 10; c.strokeStyle = rgba(K.ink, 0.5 * k); c.stroke();
      add(c, () => {
        glow(c, x, y, 78, K.ember, (0.1 + 0.16 * lit + 0.3 * fl) * k);
        c.beginPath(); c.arc(x, y, 46, 0, TAU); c.lineWidth = 4.4; c.strokeStyle = rgba(K.ember, 0.85 * kk); c.stroke(); c.lineWidth = 1.8; c.strokeStyle = rgba(K.gold, 0.95 * kk); c.stroke();
        c.beginPath(); c.arc(x, y, 32, 0, TAU); c.lineWidth = 1.4; c.strokeStyle = rgba(K.amber, 0.6 * kk); c.stroke();
        c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 0.4 * (j % 2 ? 1 : -1); c.moveTo(x + Math.cos(a) * 38, y + Math.sin(a) * 38); c.lineTo(x + Math.cos(a) * 54, y + Math.sin(a) * 54); }
        c.lineWidth = 2.4; c.strokeStyle = rgba(K.gold, 0.8 * kk); c.stroke();
        if (lit > 0.9) for (let i = 0; i < 4; i++) { const a = t * 1.3 + i * TAU / 4; glow(c, x + Math.cos(a) * 46, y + Math.sin(a) * 46, 5, K.hot, 0.7 * k); }
      });
      const ns = numSprite(j, false); if (ns) { c.globalAlpha = Math.min(1, k * (0.6 + 0.4 * lit)); c.drawImage(ns, x - 25, y - 96, 50, 50); c.globalAlpha = 1; add(c, () => glow(c, x, y - 70, 30, K.ember, 0.18 * lit * k)); }
      c.restore();
    }
    // the places the two start from: a small heat until the first cut
    if (S1.length && u < S1[0][4]) { const k = c01((u + 0.1) / 0.5); add(c, () => { glow(c, ev.cfrom[0], ev.cfrom[1], 40, K.blueMid, 0.22 * k); }); }
    // the cuts' scars: a thin burning line cooling on the floor
    for (const [list, cold] of [[S1, 0], [C1, 1]]) for (const s of list) {
      const age = u - s[4]; if (age < 0.1 || age > 4.2) continue;
      const fade = 1 - c01(age / 4), heat = 1 - c01(age / 1.6);
      c.save(); clipRoom(c); c.lineCap = 'round'; c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]);
      c.strokeStyle = rgba(K.ink, 0.3 * fade); c.lineWidth = 14; c.stroke();
      add(c, () => { c.strokeStyle = rgba(cold ? K.blueMid : K.ember, 0.5 * heat); c.lineWidth = 5; c.stroke(); c.strokeStyle = rgba(K.gold, 0.75 * heat); c.lineWidth = 1.8; c.stroke(); });
      c.restore();
    }
  }
  function pyreOver(c, ev, t) {
    const u = t - ev.start;
    for (const [list, cold] of [[ev.s || [], 0], [ev.c || [], 1]]) for (const s of list) {
      const age = u - s[4]; if (age < 0 || age > 0.75) continue;
      const dx = s[2] - s[0], dy = s[3] - s[1], head = eo3(c01(age / 0.1)), tail = c01((age - 0.06) / 0.4), a = 1 - ei(c01((age - 0.08) / 0.62)), q = c01(age / 0.5);
      c.save(); clipRoom(c);
      streak(c, s[0] + dx * tail, s[1] + dy * tail, s[0] + dx * head, s[1] + dy * head, 17 * (1 - 0.55 * q), a, cold ? COLD : {});
      c.restore();
      // the blink: a wisp where it left, a glint, a ring and sparks where it arrives
      const ang = Math.atan2(dy, dx);
      add(c, () => {
        glow(c, s[0], s[1], 50 * (1 - q) + 10, cold ? K.blueMid : K.ember, 0.4 * (1 - q));
        glow(c, s[2], s[3], 80 * (1 - q) + 18, cold ? K.blueHi : K.hot, 0.6 * (1 - q) * c01(age / 0.05));
        c.beginPath(); c.arc(s[2], s[3], 12 + 66 * eo3(q), 0, TAU); c.lineWidth = 2.6 * (1 - q); c.strokeStyle = rgba(cold ? K.blueHi : K.gold, 0.8 * (1 - q)); c.stroke();
      });
      if (age > 0.05) {
        glint(c, s[2], s[3], 34 * (1 - q) + 8, ang + 0.6, cold ? K.blueHi : K.hot, 1 - q);
        for (let j = 0; j < 8; j++) { const sa = ang + (hs(j, 110) - 0.5) * 2.6, sp = 120 + 240 * hs(j, 111), d1 = sp * (age - 0.05), d0 = sp * Math.max(0, age - 0.1); streak(c, s[2] + Math.cos(sa) * d0, s[3] + Math.sin(sa) * d0, s[2] + Math.cos(sa) * d1, s[3] + Math.sin(sa) * d1, 2.4, 1 - q, cold && j % 2 ? COLD : {}); }
      }
    }
  }

  // ---- The Sovereign's Dance (svdance:n): silver-and-ember afterimages of the Sovereign at each point, numbered, faint, the next brightest; every cut leaves a burning
  // slash that HANGS in the air a moment and then falls as embers. Caelum's cuts (the last three beats) are silver-white and fall as stardust.
  const HANG = 1.25, FALL = 1.5;
  function afterimage(c, x, y, face, a, lit, t) {
    if (a <= 0.02) return;
    c.save(); c.translate(x, y); c.rotate(face); c.lineJoin = c.lineCap = 'round';
    add(c, () => { glow(c, 0, 0, 74, K.ember, 0.2 * lit * a); glow(c, 0, 0, 48, SILV.mid, 0.2 * lit * a); });
    c.globalAlpha = a;
    ellipse(c, 0, 0, 30, 24, 0, rgba(SILV.dk, 0.5), rgba(SILV.hi, 0.85), 2);
    ellipse(c, 0, 0, 23, 17, 0, null, rgba(K.ember, 0.8), 1.6);
    circle(c, 8, 0, 9, rgba(SILV.mid, 0.8), rgba(SILV.hi, 0.9), 1.6);
    c.beginPath(); c.moveTo(16, 18); c.lineTo(16 + Math.cos(0.45) * 82, 18 + Math.sin(0.45) * 82); c.strokeStyle = rgba(K.ink, 0.5); c.lineWidth = 6; c.stroke(); c.strokeStyle = rgba(K.ember, 0.9); c.lineWidth = 3.2; c.stroke(); c.strokeStyle = rgba(SILV.hi, 0.95); c.lineWidth = 1.2; c.stroke();
    c.restore();
  }
  function hangSlash(c, x1, y1, x2, y2, age, sil, sd) {
    if (age < 0.03 || age > HANG + FALL + 0.6) return;
    const o = sil ? SILO : {}, up = 30 * eo3(c01(age / 0.22)), sag = age > HANG - 0.2 ? 6 * c01((age - HANG + 0.2) / 0.6) : 0, z = up - sag;
    const q = c01((age - HANG) / 0.45), lineA = (1 - 0.3 * c01(age / HANG)) * (1 - ei(q)) * (0.85 + 0.15 * Math.sin(age * 22 + sd));
    c.save(); c.lineCap = 'round';
    if (age < HANG + 0.6) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = rgba(K.ink, 0.24 * (1 - c01((age - HANG) / 0.6))); c.lineWidth = 10; c.stroke(); }   // (its shadow on the floor)
    if (lineA > 0.03) {
      streak(c, x1, y1 - z, x2, y2 - z, 11 * (1 - 0.3 * c01(age / HANG)), lineA, o);
      add(c, () => { c.beginPath(); c.moveTo(x1, y1 - z); c.lineTo(x2, y2 - z); c.strokeStyle = rgba(sil ? SILV.mid : K.ember, 0.2 * lineA); c.lineWidth = 34; c.stroke(); });
      for (let j = 0, N = cnt(7); j < N; j++) { const s = (j + 0.5) / N; tongue(c, x1 + (x2 - x1) * s, y1 + (y2 - y1) * s - z, UP, 18 + 14 * hs(j, sd + 6), 12, age * 3 + j, sil ? SILVP : FIRE, lineA * 0.65); }
    }
    add(c, () => {
      if (age > HANG - 0.2) {   // it breaks and falls: pieces drop to the floor and cool
        const N = cnt(30), G = 520;
        for (let i = 0; i < N; i++) {
          const s = (i + hs(i, sd)) / N, pa = age - (HANG - 0.15) - hs(i, sd + 3) * 0.5; if (pa < 0) continue;
          const px = x1 + (x2 - x1) * s + (hs(i, sd + 4) - 0.5) * 24 * pa, fy = y1 + (y2 - y1) * s, h = z - 0.5 * G * pa * pa, alive = c01(1 - pa / 1.35), rest = h <= 0;
          glow(c, px, fy - Math.max(0, h), (rest ? 3 : 4.6) * (0.5 + alive), sil ? SILV.hi : rest ? K.ember : K.hot, alive * (rest ? 0.7 : 0.95));
          if (!rest) { c.beginPath(); c.moveTo(px, fy - h); c.lineTo(px, fy - h - 11); c.strokeStyle = rgba(sil ? SILV.mid : K.ember, 0.6 * alive); c.lineWidth = 2; c.stroke(); }
        }
      }
      if (age > HANG) { const f = 1 - c01((age - HANG) / 2); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = rgba(sil ? SILV.mid : K.ember, 0.22 * f); c.lineWidth = 7; c.stroke(); }
    });
    c.restore();
  }
  // every cut of a dance: [x1, y1, x2, y2, beat (1..), caelum]
  function danceCuts(ev) {
    const L = ev.l, out = [];
    for (let k = 1; k <= L.length; k++) { const p0 = k === 1 ? ev.from : L[k - 2], p1 = L[k - 1]; out.push([p0[0], p0[1], p1[0], p1[1], k, 0]); }
    for (const q of ev.c || []) out.push([q[0], q[1], q[2], q[3], q[4], 1]);
    return out;
  }
  const danceAt = (ev, k) => ev.lead + k * ev.step;
  function danceUnder(c, ev, t) {
    const u = t - ev.start, L = ev.l, n = L.length; if (u < -0.1 || u > danceAt(ev, n) + HANG + FALL + 1) return;
    let nk = n + 1; for (let k = 1; k <= n; k++) if (danceAt(ev, k) > u) { nk = k; break; }
    for (let k = 1; k <= n; k++) {
      const [x, y, , fc] = L[k - 1], at = danceAt(ev, k), age = u - at, rank = k - nk;
      const face = k < n ? fc : Math.atan2(L[n - 1][1] - L[n - 2][1], L[n - 1][0] - L[n - 2][0]);
      const fin = c01((u + 0.1 - k * 0.12) / 0.6), out = age > 0 ? 1 - c01(age / 0.35) : 1;
      if (fin * out > 0.02) {
        const lit = k === nk ? 1 : 0, a = (k === nk ? 0.8 : Math.max(0.2, 0.4 - 0.04 * rank)) * fin * out;
        afterimage(c, x, y, face, a, lit, t);
        const ns = numSprite(k, true); if (ns) { c.save(); c.globalAlpha = Math.min(1, (0.45 + 0.55 * lit) * fin * out); c.drawImage(ns, x - 22, y - 86, 44, 44); c.restore(); }
      }
      if (age > 0 && age < 1.2) rise(c, x, y, { n: 6, t: age, per: 1.0, rise: 50, spread: 36, size: 2.6, a: 0.8 * (1 - c01(age / 1.1)), seed: 120 + k });
    }
    for (const s of danceCuts(ev)) hangSlash(c, s[0], s[1], s[2], s[3], u - danceAt(ev, s[4]), !!s[5], 130 + s[4] * 7 + s[5] * 3);
  }
  function danceOver(c, ev, t) {
    const u = t - ev.start;
    for (const s of danceCuts(ev)) {
      const age = u - danceAt(ev, s[4]); if (age < 0 || age > 0.5) continue;
      const sil = !!s[5], dx = s[2] - s[0], dy = s[3] - s[1], head = eo3(c01(age / 0.1)), tail = c01((age - 0.05) / 0.3), a = 1 - ei(c01((age - 0.06) / 0.4)), q = c01(age / 0.35);
      c.save(); clipRoom(c);
      streak(c, s[0] + dx * tail, s[1] + dy * tail, s[0] + dx * head, s[1] + dy * head, 18 * (1 - 0.5 * q), a, sil ? SILO : {});
      c.restore();
      add(c, () => glow(c, s[2], s[3], 70 * (1 - q) + 16, sil ? SILV.hi : K.hot, 0.55 * (1 - q)));
      if (sil && age > 0.04) glint(c, s[2], s[3], 30 * (1 - q) + 6, 0.4, SILV.hi, 1 - q);
    }
  }

  // ---- Sunwheel of Embers (svwheel:n, svwallout:n, tag svCatch). The wheel spins up in Brannoc's hand, is thrown and rolls its painted path; each bounce clangs; every leg
  // it has run rises as a wall of fire. A catch puts every wall out at once into smoke; a miss lets them burn down slowly.
  const WR = 50;   // (the wheel's own radius: the painted path is 130 wide)
  const wheelSprite = () => sprite('svwheel', 140, 140, g => {
    g.translate(70, 70); g.lineJoin = g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, 64, 0, TAU); g.fillStyle = rgba(K.ink, 0.55); g.fill();
    const gr = g.createRadialGradient(-14, -16, 6, 0, 0, 60); gr.addColorStop(0, '#f2c880'); gr.addColorStop(0.35, '#c98a3a'); gr.addColorStop(0.75, '#8a5420'); gr.addColorStop(1, '#4a2a10');
    g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.fillStyle = gr; g.fill();
    for (const r of [50, 39, 27]) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = 3.2; g.strokeStyle = 'rgba(40,20,8,0.8)'; g.stroke(); g.beginPath(); g.arc(0, 0, r - 2.4, 0, TAU); g.lineWidth = 1.2; g.strokeStyle = 'rgba(244,196,120,0.7)'; g.stroke(); }
    for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * TAU / 8); g.beginPath(); g.moveTo(17, 0); g.lineTo(52, 0); g.lineWidth = 6; g.strokeStyle = 'rgba(40,20,8,0.85)'; g.stroke(); g.lineWidth = 2; g.strokeStyle = 'rgba(240,190,110,0.85)'; g.stroke(); g.restore(); }
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; g.beginPath(); g.arc(Math.cos(a) * 54, Math.sin(a) * 54, 2.6, 0, TAU); g.fillStyle = '#ffd77a'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(30,14,6,0.9)'; g.stroke(); }
    const bg = g.createRadialGradient(-4, -5, 1, 0, 0, 16); bg.addColorStop(0, '#fff0c0'); bg.addColorStop(0.5, '#e0a848'); bg.addColorStop(1, '#7a4a18');
    g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fillStyle = bg; g.fill(); g.lineWidth = 2.4; g.strokeStyle = 'rgba(30,14,6,0.95)'; g.stroke();
    g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.lineWidth = 3.4; g.strokeStyle = 'rgba(26,12,4,0.95)'; g.stroke();
  });
  function wheelGeo(ev) {
    const P = ev.l, last = P.length - 1, along = [0];
    for (let i = 1; i <= last; i++) along.push(along[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { P, last, along };
  }
  function wheelAt(G, d) {
    const { P, last, along } = G;
    if (d <= 0) return { x: P[0][0], y: P[0][1], a: Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]), rest: 0 };
    if (d >= along[last]) return { x: P[last][0], y: P[last][1], a: Math.atan2(P[last][1] - P[last - 1][1], P[last][0] - P[last - 1][0]), rest: 1 };
    let i = 1; while (along[i] < d) i++;
    const q = (d - along[i - 1]) / (along[i] - along[i - 1] || 1);
    return { x: lerp(P[i - 1][0], P[i][0], q), y: lerp(P[i - 1][1], P[i][1], q), a: Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]), rest: 0 };
  }
  // one wall of fire (a leg the wheel has run): lit at `ig`, rises along the leg from its start, burns its life, then goes out (or is put out at outU)
  function wallFrame(c, f, ev, u, outU, t, idx) {
    const [x1, y1, x2, y2, ig0] = f, fw = ev.fw || 70, gw = graceWall(ev, ig0, ev.life || 7), ig = gw[0], life = gw[1], age = u - ig; if (age < 0) return;
    const caught = outU != null && outU >= ig && u >= outU, out = caught ? u - outU : -1;
    let h, gh, scar;
    if (caught) { h = Math.max(0, 1 - out / 0.3); h *= h; gh = h; scar = 1 - c01(out / 6); }
    else {
      if (age > life + 4) return;
      const burn = sm(c01((age - (life - 2.6)) / 2.6)), after = age > life ? c01((age - life) / 3.2) : 0;
      h = age > life ? 0 : eo3(c01(age / 0.5)) * (1 - 0.82 * burn);
      gh = age > life ? 0.4 * (1 - after) : eo3(c01(age / 0.5)) * (1 - 0.55 * burn);
      scar = age > life ? 1 - c01((age - life) / 4) : 1;
    }
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ang = Math.atan2(y2 - y1, x2 - x1);
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    if (scar > 0.02) { c.strokeStyle = rgba(K.ink, 0.38 * scar * c01(age / 0.4)); c.lineWidth = fw + 10; c.stroke(); }
    if (gh > 0.03) add(c, () => { c.strokeStyle = rgba(K.red, 0.3 * gh); c.lineWidth = fw; c.stroke(); c.strokeStyle = rgba(K.ember, 0.4 * gh); c.lineWidth = fw * 0.55; c.stroke(); c.strokeStyle = rgba(K.gold, 0.55 * gh); c.lineWidth = fw * 0.2; c.stroke(); c.strokeStyle = rgba(K.hot, 0.55 * gh); c.lineWidth = 4; c.stroke(); });
    if (h > 0.04) {
      const sp = LOW ? 76 : 44, nT = Math.max(2, Math.round(L / sp)), rev = y2 < y1, pal = h > 0.55 ? FIRE : [K.dark, K.red, K.ember];
      for (let jj = 0; jj < nT; jj++) {   // (drawn top to bottom, so the near tongues overlap the far ones)
        const j = rev ? nT - 1 - jj : jj, s = (j + 0.5) / nT, gate = age < 1 ? c01((age - 0.28 * s) / 0.3) : 1; if (gate <= 0.02) continue;
        const px = x1 + (x2 - x1) * s + (hs(j, 70 + idx) - 0.5) * fw * 0.45, py = y1 + (y2 - y1) * s + (hs(j, 72 + idx) - 0.5) * fw * 0.45, fl = 0.75 + 0.25 * Math.sin(t * 9 + j * 1.9 + idx);
        const H = (68 + 52 * hs(j, 71 + idx)) * fl * h * gate;
        if (j % 3 === 0) add(c, () => glow(c, px, py - H * 0.35, 54, K.ember, 0.2 * h * gate));
        tongue(c, px, py, UP + Math.sin(t * 3 + j) * 0.09, H, 38, t * 2.4 + j * 0.6, pal, 0.95 * Math.min(1, h * 1.6));
      }
      for (const s of [0.17, 0.5, 0.83]) rise(c, x1 + (x2 - x1) * s, y1 + (y2 - y1) * s, { n: 4, t, per: 1.7, rise: 120, spread: 30, size: 2.8, a: 0.7 * h, seed: 140 + idx });
    }
    if (caught && out < 2.8) {   // snuffed: a billow of smoke along the whole leg
      for (let j = 0, N = cnt(10); j < N; j++) {
        const s = (j + hs(j, 150 + idx)) / N, o2 = out - 0.05 * (j % 4), q = c01(o2 / 2.6); if (o2 < 0) continue;
        const px = x1 + (x2 - x1) * s + (hs(j, 151 + idx) - 0.5) * 70 * q, py = y1 + (y2 - y1) * s - (26 + 120 * eo3(q)), r = 22 + 48 * q, a = 0.62 * Math.pow(1 - q, 1.4) * c01(o2 / 0.15);
        glow(c, px, py, r, '#2a1e18', a); glow(c, px + 5, py - 7, r * 0.8, K.ash, a * 0.42);
      }
      if (out < 0.5) rise(c, (x1 + x2) / 2, (y1 + y2) / 2, { n: 8, t: out * 1.2, per: 0.8, rise: 130, spread: L * 0.8, size: 2.4, a: 0.7 * (1 - out / 0.5), seed: 160 + idx });
    }
    c.restore();
  }
  function wheelUnder(c, ev, n, t) {
    const u = t - ev.start, G = wheelGeo(ev), sp = ev.sp || 950, at = ev.at || 4.6, last = G.last, wo = S.wo[n], outU = wo != null ? wo - ev.start : null;
    if (u < -0.1) return;
    ev.fire.forEach((f, i) => wallFrame(c, f, ev, u, outU, t, i));
    // the wall's scorch where each bounce struck, and the trail the wheel leaves behind it
    for (let i = 1; i < last; i++) { const age = u - (at + G.along[i] / sp); if (age > 0 && age < 7) { const P = G.P[i], nl = Math.hypot(P[0], P[1]) || 1, wx = P[0] * (1 + 40 / nl), wy = P[1] * (1 + 40 / nl); scorch(c, wx, wy, 52, 0.5 * (1 - c01(age / 7)), 1 - c01(age / 2.2), 170 + i, K.amber); } }
    const d = (u - at) * sp;
    if (d > 0 && d < G.along[last] + 60) add(c, () => { for (let j = 1; j <= 9; j++) { const w = wheelAt(G, d - j * 22); glow(c, w.x, w.y, 36 - 2.4 * j, j < 4 ? K.gold : K.ember, 0.34 * (1 - j / 10)); } });
  }
  function clang(c, x, y, nx, ny, age) {
    if (age < 0 || age > 0.7) return;
    const q = c01(age / 0.45), a = 1 - q, an = Math.atan2(ny, nx);
    add(c, () => {
      glow(c, x, y, 110 * (1 - c01(age / 0.25)) + 24, K.hot, 0.75 * (1 - c01(age / 0.3)));
      for (const [d0, w] of [[0, 3], [0.1, 2]]) { const qq = c01((age - d0) / 0.45); if (qq <= 0) continue; c.beginPath(); c.arc(x, y, 16 + 120 * eo3(qq), 0, TAU); c.lineWidth = w * (1 - qq); c.strokeStyle = rgba(d0 ? K.gold : '#ffe6b0', 0.85 * (1 - qq)); c.stroke(); }   // (the ringing: two thin rings, bronze-white)
    });
    glint(c, x, y, 54 * (1 - q) + 8, an + 0.4, K.hot, a);
    for (let j = 0; j < 16; j++) { const sa = an + (hs(j, 180) - 0.5) * 2.4, sp = 200 + 330 * hs(j, 181), d1 = sp * age, d0 = sp * Math.max(0, age - 0.09); streak(c, x + Math.cos(sa) * d0, y + Math.sin(sa) * d0, x + Math.cos(sa) * d1, y + Math.sin(sa) * d1, 2.8, a); }
  }
  function wheelBody(c, x, y, spin, dirA, mv, heat, a, t) {
    ellipse(c, x + 6, y + 10, 50, 42, 0, rgba(K.ink, 0.3 * a));
    add(c, () => glow(c, x, y, 100, K.ember, 0.28 * heat * a));
    const s = wheelSprite();
    if (s) { c.save(); c.translate(x, y); c.rotate(spin); c.globalAlpha = a; c.drawImage(s, -60, -60, 120, 120); c.restore(); }
    add(c, () => { c.beginPath(); c.arc(x, y, WR + 2, 0, TAU); c.strokeStyle = rgba(K.ember, 0.7 * heat * a); c.lineWidth = 9; c.stroke(); c.strokeStyle = rgba(K.gold, 0.9 * heat * a); c.lineWidth = 3.4; c.stroke(); c.strokeStyle = rgba(K.white, 0.7 * heat * a); c.lineWidth = 1.2; c.stroke(); });
    const nT = cnt(16), bx = -Math.cos(dirA), by = -Math.sin(dirA);
    for (let j = 0; j < nT; j++) {   // (the rim blazing: tongues streaming back; the sides stay short so the painted edges stay clear)
      const th = j * TAU / nT + spin * 0.25, rx = Math.cos(th), ry = Math.sin(th), al = rx * bx + ry * by, len = (12 + 26 * Math.max(0, al) * (0.4 + 0.6 * mv) + 8 * (1 - mv)) * (0.8 + 0.4 * hs(j, 190)) * heat;
      tongue(c, x + rx * (WR + 2), y + ry * (WR + 2), Math.atan2(ry + by * mv * 0.9, rx + bx * mv * 0.9), len, 15, t * 2.6 + j * 0.7, FIRE, 0.85 * heat * a);
    }
  }
  function wheelOver(c, ev, n, t) {
    const u = t - ev.start, G = wheelGeo(ev), sp = ev.sp || 950, at = ev.at || 4.6, last = G.last, tEnd = G.along[last] / sp, hold = ev.hold == null ? 2 : ev.hold, Tres = at + tEnd + hold;
    const wo = S.wo[n], outU = wo != null ? wo - ev.start : null, cp = ev.c && ev.c[0] ? ev.c[0] : G.P[last];
    if (u < -0.1) return;
    for (let i = 1; i < last; i++) {   // (a wall's bounce or a hole's rim: the normal is what turns the path, the contact 40 px behind the wheel's place)
      const P = G.P[i], A0 = G.P[i - 1], B0 = G.P[i + 1], i1 = Math.hypot(P[0] - A0[0], P[1] - A0[1]) || 1, o1 = Math.hypot(B0[0] - P[0], B0[1] - P[1]) || 1;
      let nx = (B0[0] - P[0]) / o1 - (P[0] - A0[0]) / i1, ny = (B0[1] - P[1]) / o1 - (P[1] - A0[1]) / i1; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      clang(c, P[0] - nx * 40, P[1] - ny * 40, nx, ny, u - (at + G.along[i] / sp));
    }
    let vis = c01((u - 0.7) / 0.5);
    if (outU != null) vis *= 1 - c01((u - outU) / 0.3); else if (u > Tres + 0.25) vis *= 1 - c01((u - Tres - 0.25) / 0.2);
    if (vis > 0.02) {
      const d = (u - at) * sp, rolling = u > at && d < G.along[last], w = wheelAt(G, d), rest = Math.max(0, u - at - tEnd);
      const spin = u < at ? 2.0 * u * u : 2.0 * at * at + Math.min(d, G.along[last]) / WR + (rest > 0 ? 19 * (1 - Math.exp(-1.8 * rest)) / 1.8 : 0);
      const heat = u < at ? 0.35 + 0.65 * c01(u / at) : rest > 0 ? 1 - 0.3 * c01(rest / hold) : 1;
      wheelBody(c, w.x, w.y, spin, w.a, rolling ? 1 : 0, heat, vis, t);
      if (u > at - 0.05 && u < at + 0.45) { const q = c01((u - at) / 0.45); add(c, () => { glow(c, G.P[0][0], G.P[0][1], 90 * (1 - q) + 20, K.hot, 0.5 * (1 - q)); c.beginPath(); c.arc(G.P[0][0], G.P[0][1], 20 + 90 * eo3(q), 0, TAU); c.lineWidth = 3 * (1 - q); c.strokeStyle = rgba(K.gold, 0.7 * (1 - q)); c.stroke(); }); }   // (the throw)
    }
    if (outU != null) {   // caught: a blue-white column, a ring out to the circle's rim, sparks
      const age = u - outU; if (age >= 0 && age < 1.5) {
        const hq = c01(age / 0.2), H = 210 * eo3(hq) * (1 - ei(c01((age - 0.7) / 0.7))), W = 86 * (1 - 0.3 * c01((age - 0.4) / 1)), a = 1 - ei(c01((age - 0.8) / 0.6)), r = ev.r || 95;
        add(c, () => glow(c, cp[0], cp[1], 130 * (1 - c01(age / 1.2)) + 36, K.blueHi, 0.5 * a));
        for (let i = -2; i <= 2; i++) tongue(c, cp[0] + i * W * 0.2, cp[1] + Math.abs(i) * 3, UP + i * 0.06, H * (1 - Math.abs(i) * 0.14), W * (0.66 - Math.abs(i) * 0.06), t * 2.1 + i * 0.7, BLUE, a);
        tongue(c, cp[0], cp[1], UP, H * 1.05, W * 0.55, t * 2.6, [K.blueMid, K.blueHi, K.white], a);
        const q = c01(age / 0.5);
        if (q < 1) add(c, () => { c.beginPath(); c.arc(cp[0], cp[1], 18 + (r + 30) * eo3(q), 0, TAU); c.lineWidth = 4 * (1 - q); c.strokeStyle = rgba(K.blueHi, 0.85 * (1 - q)); c.stroke(); });
        glint(c, cp[0], cp[1] - 20, 50 * (1 - q) + 10, 0.3, K.blueHi, 1 - q);
        rise(c, cp[0], cp[1] - 10, { n: 12, t: age, per: 1.3, rise: 190, spread: 70, size: 3, a: 0.9 * a, col: K.blueMid, hot: K.blueHi, seed: 195 });
      }
    } else if (u > Tres + 0.25 && u < Tres + 1.6) {   // missed: it bursts on the whole room (a ring of fire out to the walls)
      const age = u - Tres - 0.25, q = c01(age / 1.3), a = 1 - ei(c01((q - 0.4) / 0.6));
      c.save(); clipRoom(c); c.beginPath(); c.arc(cp[0], cp[1], 30 + 900 * Math.pow(q, 1.3), 0, TAU); bandStroke(c, 70 * (1 - 0.5 * q), 0.8 * a, false); c.restore();
      add(c, () => glow(c, cp[0], cp[1], 160 * (1 - q) + 30, K.hot, 0.6 * (1 - q)));
    }
  }
  // the blue catch ring: swirling blue flame and motes winding in while it waits; a scorch after
  TELL.svCatch = {
    under(c, r, t) {
      const s = r.s, u = t - r.start, p = c01(u / r.dur), age = t - r.land;
      if (age < 0) {
        const k = c01(u / 0.8) * (0.3 + 0.7 * p);
        add(c, () => {
          glow(c, s.x, s.y, s.r + 24, K.blueMid, 0.08 + 0.2 * p);
          for (let i = 0; i < 10; i++) { const an = i * TAU / 10 + u * 0.8, fl = 0.5 + 0.5 * Math.sin(u * 5 + i * 2); glow(c, s.x + Math.cos(an) * (s.r - 6), s.y + Math.sin(an) * (s.r - 6), 4 + 2 * fl, K.blueHi, k * (0.4 + 0.5 * fl)); }
          for (let i = 0; i < 10; i++) { const ph = (u * 0.6 + hs(i, 200)) % 1, an = hs(i, 201) * TAU + ph * 3, d = (s.r - 12) * (1 - ph) + 8; glow(c, s.x + Math.cos(an) * d, s.y + Math.sin(an) * d, 5 + 3 * hs(i, 202), ph > 0.6 ? K.blueHi : K.blueMid, Math.sin(ph * Math.PI) * k); }
          c.beginPath(); c.arc(s.x, s.y, s.r - 4, 0, TAU); c.lineWidth = 2; c.strokeStyle = rgba(K.blueHi, 0.4 * k); c.stroke();
        });
        for (let i = 0; i < 12; i += stp()) { const an = i * TAU / 12 + u * 0.3; tongue(c, s.x + Math.cos(an) * (s.r - 4), s.y + Math.sin(an) * (s.r - 4), UP, 12 + 20 * p, 12, u * 2 + i * 0.6, BLUE, 0.7 * k); }
      } else if (age < 5 && !r.cancel) {
        let caught = false; for (const k in S.wo) if (Math.abs(S.wo[k] - r.land) < 0.8) caught = true;
        const f = 1 - c01(age / 5);
        scorch(c, s.x, s.y, 80, 0.5 * f, 1 - c01(age / 2.6), r.sd, caught ? K.blueMid : K.ember);
      }
    },
  };

  // ---------------------------------------------------------------------------------------------------------------- FX5: Grace Withdrawn, Nightfall, Seeds of Ash, the saplings, Every Name, the heat haze
  // The holes, the paper peel and the portal's stones are FLOOR and are drawn by sovereign-rooms.js (they must lie under the echoes, which are drawn before this layer);
  // this file draws what happens over and around them. Messages (contract: "Built (S3b)"): svgrace, svseed:n, svhole:n, svsapling:n, svsapdie:n, svsaparr:n, svrecall:n,
  // svact 4 (the clock of Every Name) and the Hollow King's svecho with fly 0 in Act IV.
  const roomState = env => (env && env.roomS) || undefined;   // (the preview's own rooms state; undefined in the fight: SV_ROOMS then uses its own)
  const grHold = ev => (ev.hold != null ? +ev.hold : (+ev.dur || 8) + 0.6);   // (the script holds the floor fire for the gap and 0.6 s: sovereign.js `holdFire(gap + 0.6)`)
  function trackFx5(room, env, t) {
    for (const k in room.ev) {
      const ev = room.ev[k];
      if (k === 'svgrace') { if (!S.gr.some(g => Math.abs(g.start - ev.start) < 0.01)) S.gr.push({ start: ev.start, dur: +ev.dur || 8, hold: grHold(ev) }); }
      else if (k.startsWith('svsapling:')) {
        const n = k.slice(10), s = S.sap[n] || (S.sap[n] = { trail: [], pos: null, lastT: t });
        const done = room.ev['svsapdie:' + n] || room.ev['svsaparr:' + n], u = t - ev.start;
        let p = env.entById && ev.id != null ? env.entById(ev.id) : null;
        if (!p) { const b = bossAt(env), dx = b.x - ev.x, dy = b.y - ev.y, D = Math.hypot(dx, dy) || 1, d = Math.max(0, u - 1.5) * (+ev.speed || 24); p = { x: ev.x + dx / D * d, y: ev.y + dy / D * d }; }
        s.pos = { x: p.x, y: p.y };
        if (!done && u > 1.4 && u < (ev.dur || 45)) {
          const lt = s.trail[s.trail.length - 1];
          if (!lt || Math.hypot(lt.x - p.x, lt.y - p.y) > 15) s.trail.push({ x: p.x, y: p.y, t0: t });
          if (s.trail.length > 24) s.trail.shift();
        }
        while (s.trail.length && t - s.trail[0].t0 > 3.4) s.trail.shift();
      } else if (k.startsWith('svecho:') && ev.who === 'hollowking' && room.ev.svact && (room.ev.svact.act === 4 || room.ev.svact.act === 'night') && !(+ev.fly)) {
        S.hk4 = { n: k.slice(7), x: +ev.x || 0, y: +ev.y || 0, face: +ev.face || 0, start: ev.start, rise: +ev.rise || 2.3 };
      }
    }
    S.gr = S.gr.filter(g => t < g.start + 45 && t > g.start - 1);
    if (S.hk4 && !(room.ev.svact && (room.ev.svact.act === 4 || room.ev.svact.act === 'night'))) S.hk4 = null;
  }
  const activeGrace = t => { for (const g of S.gr) if (t >= g.start - 0.05 && t < g.start + 40) return g; return null; };

  // ---- Grace Withdrawn: each hero's life drawn out toward the Sovereign as a thin thread of light, which snaps. They are left dim until healed.
  const LIFE = { dk: '#7a5a1a', mid: '#ffd27a', hi: '#fff4cc' };
  const lifeBez = (p0, c1, p1, s) => { const m = 1 - s; return [m * m * p0[0] + 2 * m * s * c1[0] + s * s * p1[0], m * m * p0[1] + 2 * m * s * c1[1] + s * s * p1[1]]; };
  function threadPath(c, p0, c1, p1, s0, s1, w, a) {
    if (s1 - s0 < 0.01 || a <= 0.02) return;
    c.beginPath(); for (let j = 0, N = 14; j <= N; j++) { const q = lifeBez(p0, c1, p1, s0 + (s1 - s0) * j / N); j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }
    c.lineCap = 'round'; c.strokeStyle = rgba(LIFE.mid, 0.22 * a); c.lineWidth = w * 3.2; c.stroke(); c.strokeStyle = rgba(LIFE.hi, 0.8 * a); c.lineWidth = w; c.stroke();
  }
  const THREAD_IN = 0.8, THREAD_SNAP = 1.15;
  function graceUnder(c, g, t, env) {
    const u = t - g.start; if (u < -0.05 || u > 2.2 || !env.units) return;
    const b = bossAt(env), P1 = [b.x, b.y - 46];
    let pulls = 0;
    c.save();
    env.units.forEach((un, i) => {
      const P0 = [un.x, un.y - 26], dist = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), nx = -(P1[1] - P0[1]) / (dist || 1), ny = (P1[0] - P0[0]) / (dist || 1), sw = Math.sin(t * 3 + i * 1.7) * 14 + (i % 2 ? 22 : -22);
      const C1 = [(P0[0] + P1[0]) / 2 + nx * sw, (P0[1] + P1[1]) / 2 + ny * sw - 40 - dist * 0.12], head = eo3(c01(u / THREAD_IN)), ts = THREAD_SNAP + 0.06 * i, r = c01((u - ts) / 0.5);
      add(c, () => {
        if (u < 0.28) { const f = 1 - u / 0.28; glow(c, un.x, un.y - 14, 56 * f + 14, LIFE.hi, 0.5 * f); }   // (the life leaving: one flare on the hero)
        if (u < ts) {
          threadPath(c, P0, C1, P1, 0, head, 1.5, 1); pulls += head;
          for (let m = 0; m < 4; m++) { const s = ((u * 1.3 + m / 4 + hs(i, m)) % 1) * head; const q = lifeBez(P0, C1, P1, s); glow(c, q[0], q[1], 5.5, LIFE.hi, 0.85 * Math.sin(Math.min(1, s / Math.max(0.05, head)) * Math.PI)); }   // (motes of life running to him)
          glow(c, lifeBez(P0, C1, P1, head)[0], lifeBez(P0, C1, P1, head)[1], 9, LIFE.hi, 0.9 * (1 - c01((u - 0.7) / 0.2)));
        } else if (r < 1) {   // the snap: it parts near the middle, the halves whip back to either end
          const sm0 = 0.45 + 0.1 * Math.sin(i * 2.3), a = (1 - r) * (1 - r);
          threadPath(c, P0, C1, P1, 0, sm0 * (1 - eo3(r)), 1.3 * (1 - r) + 0.4, a); threadPath(c, P0, C1, P1, sm0 + (1 - sm0) * eo3(r), 1, 1.3 * (1 - r) + 0.4, a);
          const q = lifeBez(P0, C1, P1, sm0); glow(c, q[0], q[1], 26 * (1 - r) + 6, LIFE.hi, 0.7 * (1 - r));
          if (r < 0.5) glint(c, q[0], q[1], 24 * (1 - r * 2) + 4, 0.8 + i, LIFE.hi, 1 - r * 2);
          for (let m = 0; m < cnt(7); m++) { const an = hs(m, i + 60) * TAU, d = (6 + 34 * hs(m, i + 61)) * eo3(r); glow(c, q[0] + Math.cos(an) * d, q[1] + Math.sin(an) * d + 14 * r * r * 4, 3.4, m % 2 ? LIFE.mid : LIFE.hi, 0.85 * (1 - r)); }
        }
      });
    });
    // the Sovereign's chest takes the light in, and flares as each thread parts
    const rr = c01((u - THREAD_SNAP) / 0.6);
    add(c, () => { glow(c, P1[0], P1[1], 36 + 26 * Math.min(1, pulls / 3), LIFE.mid, 0.4 * c01(u / 0.3) * (1 - rr * 0.6)); glow(c, P1[0], P1[1], 14, LIFE.hi, 0.6 * c01(u / 0.3) * (1 - rr)); });
    c.restore();
  }
  // left dim: a cold shade over each hero while their health is low after the Grace, easing off as they are healed
  function graceOver(c, g, t, env) {
    if (!env.units) return;
    const P = feed(env, 'party'); if (!P || !P.get) return;
    const u = t - g.start; if (u < 0.25 || u > 40) return;
    c.save();
    for (const un of env.units) {
      const s = P.get(un.id); if (!s || s.alive === false || !(s.maxHp > 0)) continue;
      const d = c01((0.8 - s.hp / s.maxHp) / 0.65) * c01((u - 0.25) / 0.4); if (d <= 0.02) continue;
      c.save(); c.translate(un.x, un.y - 12); c.scale(1, 1.55);
      const gr = c.createRadialGradient(0, 0, 2, 0, 0, 22); gr.addColorStop(0, rgba('#07091a', 0.5 * d)); gr.addColorStop(0.65, rgba('#07091a', 0.34 * d)); gr.addColorStop(1, rgba('#07091a', 0));
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fill(); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let m = 0; m < cnt(3); m++) { const q = (t * 0.45 + hs(m, un.id + 80)) % 1; glow(c, un.x + (hs(m, un.id + 81) - 0.5) * 24, un.y - 10 - q * 40, 3, '#9ab0d8', 0.4 * d * Math.sin(q * Math.PI)); }   // (what is left of the light drifting off, grey)
      c.restore();
    }
    c.restore();
  }

  // ---- Nightfall: a falling dark (the cast, 8 s) and one great toll ring as it lands. The dark is laid first, with every hero and the halo cut out of it; telegraphs and units lie over it.
  const NIGHT = { ink: '#05030c', pal: ['#07040f', '#6a54c8', '#e8e0ff'], pal2: ['#3a2a10', '#d8a04a', '#fff0c0'] };
  function nightfallDark(c, room, t, env) {
    const g = activeGrace(t); if (!g) return;
    const u = t - g.start, gap = g.dur;
    if (u < 0 || u > gap + 2.4) return;
    const inK = sm(c01((u - 0.4) / 6.4)), out = sm(c01((u - gap) / 2.0)), A = 0.58 * inK * (1 - out); if (A <= 0.02) return;
    const b = bossAt(env), ye = lerp(-1100, 900, sm(c01(u / (gap - 0.5))));
    darkLayer(c, 1100, gl => {
      const gr = gl.createLinearGradient(0, -1100, 0, 1100), e = c01((ye + 1100) / 2200);
      gr.addColorStop(0, rgba(NIGHT.ink, A)); gr.addColorStop(Math.max(0.001, e * 0.62), rgba(NIGHT.ink, A * 0.95)); gr.addColorStop(Math.min(0.999, Math.max(e + 0.02, 0.01)), rgba(NIGHT.ink, A * 0.28)); gr.addColorStop(1, rgba(NIGHT.ink, A * 0.18));
      gl.fillStyle = gr; gl.fillRect(-1100, -1100, 2200, 2200);
      cutLit(gl, b.x, b.y - 30, 190, 0.8);   // the halo
      if (env.units) for (const un of env.units) cutLit(gl, un.x, un.y, 110, 0.92);
      return { col: NIGHT.ink, a: A };
    });
  }
  function nightfallUnder(c, g, t, env) {
    const u = t - g.start, gap = g.dur; if (u < 0 || u > gap + 4.5) return;
    const b = bossAt(env), R = RR();
    c.save();
    // falling: slow dark flakes and a few pale ones, thickening as the cast runs
    const kf = c01((u - 0.3) / 2) * (1 - c01((u - gap - 0.6) / 1.4)), W = 1500;
    if (kf > 0.02) for (let i = 0; i < cnt(70); i++) {
      const x = ((hs(i, 90) * W + Math.sin(t * 0.5 + hs(i, 91) * 9) * 16 + t * 5) % W) - W / 2, sp = 40 + 70 * hs(i, 92), y = (((hs(i, 93) * W + t * sp) % W) - W / 2) * 0.9, s = 1.4 + 2.6 * hs(i, 94), a = kf * (0.18 + 0.4 * hs(i, 95)) * (i / 70 < c01(u / 6) ? 1 : 0);
      c.fillStyle = rgba(i % 5 ? '#0a0614' : '#b8b0e0', a); c.fillRect(x, y, s, s * 1.8);
    }
    // the tolls: two faint (a third of the way and two thirds), then the great one as the dark lands
    for (const [at, k, w] of [[gap - 5.3, 0.22, 16], [gap - 2.7, 0.3, 22]]) { const a = u - at; if (a > 0 && a < 1.5) { const q = a / 1.5; clipRoomRing(c, b.x, b.y, 50 + (R + 100) * eo3(q), w * (1 - 0.5 * q), k * (1 - ei(q)), NIGHT.pal); } }
    const a = u - gap;
    if (a > -0.3 && a < 2.6) {
      if (a < 0) add(c, () => glow(c, b.x, b.y - 30, 60 + 60 * (1 + a / 0.3), '#cfc4ff', 0.4 * (1 + a / 0.3)));   // (the held breath: light gathering in the Sovereign)
      else {
        const q1 = c01(a / 1.7), q2 = c01((a - 0.28) / 1.5);
        if (q1 < 1) clipRoomRing(c, b.x, b.y, 60 + (R + 240) * eo3(q1), 54 * (1 - 0.55 * q1) + 5, 0.95 * (1 - ei(q1)), NIGHT.pal);
        if (q2 > 0 && q2 < 1) clipRoomRing(c, b.x, b.y, 60 + (R + 240) * eo3(q2), 22 * (1 - 0.5 * q2) + 3, 0.8 * (1 - ei(q2)), NIGHT.pal2);
        const f = c01(a / 0.3); if (f < 1) add(c, () => glow(c, b.x, b.y - 30, 260 * (1 - f) + 70, '#d8c8ff', 0.42 * (1 - f)));
        if (a < 2.2) for (let m = 0; m < cnt(20); m++) { const q = c01((a - 0.1 - 0.05 * (m % 5)) / 2.0); if (q <= 0) continue; const an = hs(m, 96) * TAU, d = (160 + 360 * hs(m, 97)) * eo3(c01(q * 1.3)); add(c, () => glow(c, b.x + Math.cos(an) * d, b.y + Math.sin(an) * d * 0.9 + 60 * q * q, 3.4, m % 3 ? '#a898ff' : '#fff0c0', 0.8 * (1 - q))); }   // (sparks of cold light settling)
      }
    }
    c.restore();
  }
  function clipRoomRing(c, x, y, r, w, a, pal) { c.save(); clipRoom(c); bandRing(c, x, y, r, w, a, pal); c.restore(); }

  // ---- Seeds of Ash (svseed:n, the tag svSeed): a dark seed pulsing over its carrier's head with a ring shrinking onto it; under the circle, the floor cracking and a ring closing on the middle
  const seedRec = (id, st) => S.recs.find(r => r.tag === 'svSeed' && r.target === id && Math.abs(r.start - st) < 1.5);
  function seedFloor(c, ev, t, env) {
    const u = t - ev.start, at = +ev.at || 6; if (u < -0.1 || u > at + 0.15 || !ev.ids) return;
    const R = +ev.r || 95;
    c.save();
    for (const id of ev.ids) {
      const rec = seedRec(id, ev.start), un = env.entById && env.entById(id), s = rec ? rec.s : un ? { x: un.x, y: un.y } : null; if (!s) continue;
      const q = c01(u / at), lock = c01((u - (at - (ev.lock || 1.6))) / (ev.lock || 1.6)), cx = s.x, cy = s.y, sd = (id * 7 + 3) % 61;
      crackLines(c, cx, cy, 7, 8, 8 + (R * 0.85) * eo3(q), sd, 0.55 * c01(q * 3), 0.25 + 0.75 * lock);   // (the ground splitting from the middle, the glow growing as it nears)
      const rr = Math.max(8, R * (1 - ei(q)) * 0.96);
      add(c, () => {   // the ring closing on the middle: a countdown inside the red circle, never outside it
        c.beginPath(); c.arc(cx, cy, rr, 0, TAU); c.lineWidth = 6; c.strokeStyle = rgba(K.dark, 0.5); c.stroke();
        c.lineWidth = 2.6; c.strokeStyle = rgba(lock > 0 ? K.ember : K.ash, 0.55 + 0.3 * lock); c.stroke(); c.lineWidth = 1; c.strokeStyle = rgba(K.hot, 0.5 + 0.4 * lock); c.stroke();
        for (let m = 0; m < 8; m++) { const an = m * TAU / 8 + u * 0.4; c.beginPath(); c.moveTo(cx + Math.cos(an) * (rr - 5), cy + Math.sin(an) * (rr - 5)); c.lineTo(cx + Math.cos(an) * (rr + 5), cy + Math.sin(an) * (rr + 5)); c.strokeStyle = rgba(K.gold, 0.5 * lock + 0.15); c.lineWidth = 2; c.stroke(); }
        glow(c, cx, cy, 20 + 30 * lock, K.red, 0.18 + 0.3 * lock);
      });
      if (lock > 0) rise(c, cx, cy, { n: 6, t, per: 0.9, rise: 50, spread: R * 1.3, size: 2.2, a: 0.7 * lock, seed: 170 + sd });
    }
    c.restore();
  }
  function seedOver(c, ev, t, env) {
    const u = t - ev.start, at = +ev.at || 6; if (u < -0.1 || u > at + 0.6 || !ev.ids || !env.entById) return;
    for (const id of ev.ids) {
      const un = env.entById(id); if (!un) continue;
      const q = c01(u / at), f = 1 + 4.2 * q * q, ph = u + 4.2 * u * u * u / (3 * at * at), fr = ph % 1, beat = Math.exp(-fr * 7), x = un.x, y = un.y - 56 - 3 * Math.sin(t * 2.2 + id), pop = u > at ? c01((u - at) / 0.35) : 0, a = 1 - pop;
      if (a <= 0.02) continue;
      c.save();
      // the shrinking ring: it closes on the seed once a beat, faster as the burst nears
      add(c, () => {
        const rr = 7 + 24 * (1 - fr) * (1 - fr); c.beginPath(); c.arc(x, y, rr, 0, TAU); c.lineWidth = 2.2; c.strokeStyle = rgba(K.ember, (0.25 + 0.5 * fr) * a); c.stroke(); c.lineWidth = 0.9; c.strokeStyle = rgba(K.hot, 0.55 * fr * a); c.stroke();
        glow(c, x, y, 20 + 14 * beat, K.red, (0.3 + 0.4 * beat + 0.3 * q) * a);
      });
      // the seed: dark, split along its length with the fire inside
      c.translate(x, y); c.rotate(Math.sin(t * 1.7 + id) * 0.14); const sz = 1.3 + 0.2 * beat + 0.25 * q;
      c.beginPath(); c.moveTo(0, -10 * sz); c.bezierCurveTo(8 * sz, -5 * sz, 7 * sz, 6 * sz, 0, 10 * sz); c.bezierCurveTo(-7 * sz, 6 * sz, -8 * sz, -5 * sz, 0, -10 * sz); c.closePath();
      c.fillStyle = rgba('#120a06', 0.96 * a); c.fill(); c.lineWidth = 2; c.strokeStyle = rgba(K.ink, a); c.stroke();
      c.beginPath(); c.moveTo(0, -8 * sz); c.bezierCurveTo(2.4 * sz, -2 * sz, -2.4 * sz, 2 * sz, 0, 8 * sz);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = rgba(K.red, (0.5 + 0.5 * beat) * a); c.lineWidth = 3; c.stroke(); c.strokeStyle = rgba(K.gold, (0.35 + 0.65 * beat) * a); c.lineWidth = 1.4; c.stroke(); c.restore();
      c.restore();
      if (a > 0.1) { c.save(); c.globalCompositeOperation = 'lighter'; for (let m = 0; m < cnt(3); m++) { const k = (t * 0.7 + hs(m, id + 110)) % 1; glow(c, x + (hs(m, id + 111) - 0.5) * 10, y + 8 + k * 40, 2.4, K.ember, 0.7 * (1 - k) * a); } c.restore(); }   // (cinders dropping off it)
      if (pop > 0) add(c, () => { glow(c, x, y, 50 * pop + 10, K.hot, 0.7 * (1 - pop)); });
    }
  }

  // ---- the saplings (svsapling:n, svsapdie:n, svsaparr:n, svrecall:n)
  function sapCrown(c, x, y, face, t, k, seed, big) {   // flame on the tree's head and arms, leaning back from the way it walks
    const lean = -Math.cos(face) * 0.3;
    add(c, () => { glow(c, x, y - 30, 56 * k + 10, K.ember, 0.26 * k); glow(c, x, y - 36, 26 * k, K.gold, 0.3 * k); });
    for (const [ox, oy, L, W] of [[0, -38, 40, 20], [-9, -34, 30, 14], [9, -34, 32, 14], [-13, -22, 20, 9], [13, -22, 22, 9], [0, -14, 20, 11]]) {
      const fl = 0.78 + 0.22 * Math.sin(t * 9 + ox * 0.7 + seed);
      tongue(c, x + ox, y + oy, UP + lean + Math.sin(t * 3 + ox + seed) * 0.12 + (ox / 80), L * fl * k * (big || 1), W, t * 2.2 + ox, FIRE, 0.95 * Math.min(1, k * 1.4));
    }
    rise(c, x, y - 30, { n: 5, t: t + seed, per: 1.2, rise: 80, spread: 24, size: 2.4, a: 0.8 * k, seed: 190 + seed });
  }
  function sapUnder(c, room, t, env) {
    for (const k in room.ev) {
      if (!k.startsWith('svsapling:')) continue;
      const n = k.slice(10), ev = room.ev[k], s = S.sap[n]; if (!s) continue;
      const done = room.ev['svsapdie:' + n] || room.ev['svsaparr:' + n], u = t - ev.start;
      for (const q of s.trail) {   // the cinders it leaves: a scorched smudge with a glow that dies
        const a = t - q.t0, f = 1 - c01(a / 3.2); if (f <= 0.02) continue;
        glow(c, q.x, q.y + 6, 14, K.char, 0.5 * f); glow(c, q.x, q.y + 6, 10, K.ink, 0.4 * f);
        add(c, () => { glow(c, q.x, q.y + 6, 9 + 4 * f, K.ember, 0.55 * f * f); circle(c, q.x + (hs(Math.round(q.x), 3) - 0.5) * 8, q.y + 4 - a * 7, 1.4, rgba(K.gold, 0.8 * f * f)); });
      }
      if (!done && s.pos && u < (ev.dur || 45)) add(c, () => glow(c, s.pos.x, s.pos.y + 4, 74, K.ember, 0.15 + 0.03 * Math.sin(t * 9 + +n)));   // (its light on the ground)
      if (u < 1.9 && u > -0.1) {   // climbing out of its hole: the fire that burned the hole still licking up round it
        const k2 = Math.sin(c01(u / 1.9) * Math.PI);
        for (let m = 0; m < 5; m++) { const an = m * TAU / 5 + 0.4, d = 50 * hs(m, 120); tongue(c, ev.x + Math.cos(an) * d, ev.y + Math.sin(an) * d * 0.7 + 4, UP, (50 + 40 * hs(m, 121)) * k2, 24, t * 2 + m, FIRE, 0.9 * k2); }
      }
    }
    for (const k in room.ev) {
      if (k.startsWith('svsapdie:')) { const ev = room.ev[k], a = t - ev.start; if (a > -0.05 && a < 3.4) scorch(c, ev.x, ev.y, 44, 0.6 * (1 - c01((a - 0.8) / 2.4)), 1 - c01(a / 1.6), 200 + (+k.slice(9) || 0), K.amber); }
      else if (k.startsWith('svsaparr:')) { const ev = room.ev[k], a = t - ev.start; if (a > -0.05 && a < 1.5) { const f = c01(a / 0.7); add(c, () => { c.beginPath(); c.arc(ev.x, ev.y + 6, 12 + 70 * eo3(f), 0, TAU); c.lineWidth = 4 * (1 - f) + 1; c.strokeStyle = rgba(K.gold, 0.8 * (1 - f)); c.stroke(); glow(c, ev.x, ev.y, 60 * (1 - f) + 18, K.hot, 0.5 * (1 - f)); }); } }
    }
  }
  const findRecall = (room, t0) => { let best = null; for (const k in room.ev) if (k.startsWith('svrecall:')) { const e = room.ev[k]; if (e.start >= t0 - 0.2 && e.start <= t0 + 12 && (!best || e.start < best.start)) best = e; } return best; };
  function sapOver(c, room, t, env) {
    for (const k in room.ev) {
      if (k.startsWith('svsapling:')) {
        const n = k.slice(10), ev = room.ev[k], s = S.sap[n]; if (!s || !s.pos) continue;
        if (room.ev['svsapdie:' + n] || room.ev['svsaparr:' + n]) continue;
        const u = t - ev.start; if (u < 0.3 || u > (ev.dur || 45)) continue;
        const b = bossAt(env);
        sapCrown(c, s.pos.x, s.pos.y, Math.atan2(b.y - s.pos.y, b.x - s.pos.x), t, c01((u - 0.3) / 0.6), +n * 5);
      } else if (k.startsWith('svsapdie:')) {   // killed: the crown flares and sinks, the fire goes up in embers and ash
        const ev = room.ev[k], a = t - ev.start; if (a < -0.05 || a > 2.2) continue;
        const sd = +k.slice(9) || 1;
        if (a < 0.7) { const f = 1 - a / 0.7; for (let m = 0; m < 4; m++) tongue(c, ev.x + (m - 1.5) * 8, ev.y - 6, UP + (m - 1.5) * 0.18, (46 + 20 * (m % 3)) * f * f, 18, t * 2 + m, FIRE, 0.95 * f); }
        add(c, () => {
          const f = c01(a / 0.3); glow(c, ev.x, ev.y - 20, 90 * (1 - f) + 30, K.hot, 0.6 * (1 - f)); const r = c01(a / 0.6);
          c.beginPath(); c.arc(ev.x, ev.y + 4, 14 + 80 * eo3(r), 0, TAU); c.lineWidth = 4 * (1 - r) + 1; c.strokeStyle = rgba(K.ember, 0.8 * (1 - r)); c.stroke();
          for (let m = 0; m < cnt(16); m++) { const an = hs(m, sd + 130) * TAU, v = 40 + 130 * hs(m, sd + 131), q = c01(a / 1.6); glow(c, ev.x + Math.cos(an) * v * q * 1.1, ev.y - 20 + Math.sin(an) * v * q * 0.6 - 90 * q + 150 * q * q, 3 + 2 * (1 - q), m % 3 ? K.ember : K.hot, 0.85 * (1 - q)); }
        });
        for (let m = 0; m < cnt(6); m++) { const q = c01((a - 0.1 - 0.04 * m) / 1.9); if (q <= 0) continue; glow(c, ev.x + (hs(m, sd + 132) - 0.5) * 50 + 14 * q, ev.y - 20 - 80 * q, 14 + 22 * q, '#2a1e18', 0.5 * (1 - q)); }
      } else if (k.startsWith('svsaparr:')) {   // arrived: it flares at his feet, the fire lifts off as a comet into the halo and lights a sigil
        const ev = room.ev[k], a = t - ev.start; if (a < -0.05 || a > 3.0) continue;
        const b = bossAt(env), rc = findRecall(room, ev.start), ang = Math.atan2(ev.y - b.y, ev.x - b.x), idx = ((Math.round((ang + Math.PI / 2) / TAU * 12) % 12) + 12) % 12, tgt = haloPt(env, rc ? (rc.sig | 0) : idx);
        if (a < 0.8) { const f = Math.sin(c01(a / 0.8) * Math.PI); for (let m = 0; m < 6; m++) tongue(c, ev.x + (m - 2.5) * 7, ev.y + 2, UP + (m - 2.5) * 0.1, (60 + 70 * hs(m, 140)) * f, 22, t * 2.4 + m, FIRE, 0.95 * Math.min(1, f * 1.5)); add(c, () => glow(c, ev.x, ev.y - 30, 100 * f + 20, K.hot, 0.45 * f)); }
        const fl = 1.1, q = c01((a - 0.35) / fl);
        if (q > 0 && q < 1) {
          const at = qq => { const e = 1 - Math.pow(1 - qq, 1.7); return { x: lerp(ev.x, tgt.x, e), y: lerp(ev.y - 30, tgt.y, e) - 90 * Math.sin(Math.PI * qq) }; };
          const H = at(q);
          add(c, () => { for (let j = 12; j >= 1; j--) { const T = at(Math.max(0, q - j * 0.03)); glow(c, T.x, T.y, 11 - j * 0.6, j < 5 ? K.gold : K.ember, 0.55 * (1 - j / 13)); } glow(c, H.x, H.y, 28, K.ember, 0.5); glow(c, H.x, H.y, 13, K.gold, 0.85); glow(c, H.x, H.y, 5, K.white, 1); });
          const T2 = at(Math.max(0, q - 0.04)); tongue(c, H.x, H.y, Math.atan2(T2.y - H.y, T2.x - H.x), 34, 16, t * 3, FIRE, 0.9);
        }
        const la = a - 0.35 - fl;   // (it lands on the halo: a ring of fire round the whole halo, and a glint on the sigil)
        if (la > 0 && la < 1.4) { const f = c01(la / 1.0); add(c, () => { c.beginPath(); c.arc(b.x, b.y, haloR(env) * (0.9 + 0.2 * eo3(f)), 0, TAU); c.lineWidth = 5 * (1 - f) + 1; c.strokeStyle = rgba(K.gold, 0.55 * (1 - f)); c.stroke(); glow(c, tgt.x, tgt.y, 44 * (1 - f) + 12, K.hot, 0.7 * (1 - f)); }); glint(c, tgt.x, tgt.y, 26 * (1 - f) + 6, 0.7, K.gold, 1 - f); }
      } else if (k.startsWith('svrecall:')) {   // the sigil relit: a white-gold ring runs out of it, a glint, embers up
        const ev = room.ev[k], a = t - ev.start; if (a < -0.05 || a > 2.0) continue;
        const P = haloPt(env, ev.sig | 0), f = c01(a / 1.3);
        add(c, () => { c.beginPath(); c.arc(P.x, P.y, 8 + 64 * eo3(f), 0, TAU); c.lineWidth = 4 * (1 - f) + 1; c.strokeStyle = rgba(K.gold, 0.8 * (1 - f)); c.stroke(); glow(c, P.x, P.y, 46 * (1 - f) + 14, K.hot, 0.65 * (1 - f)); });
        glint(c, P.x, P.y, 22 * (1 - f) + 6, 0.4, K.gold, 1 - f); rise(c, P.x, P.y, { n: 6, t: a, per: 1.2, rise: 50, spread: 20, size: 2.2, a: 1 - f, seed: 150 });
      }
    }
  }

  // ---- Every Name: burning scraps of the peeling floor in the air (the paper itself is sovereign-rooms.js's), and the Hollow King's lantern catching
  function peelScraps(c, env, t) {
    if (typeof SV_ROOMS === 'undefined' || !SV_ROOMS.peelInfo) return;
    const rs = roomState(env), I = SV_ROOMS.peelInfo(t, rs); if (!I) return;
    const NK = LOW ? 2 : 5;
    c.save();
    I.strips.forEach((st, i) => {
      for (let k = 0; k < NK; k++) {
        const te = st.s + (k + 0.4 + 0.5 * hs(k, i + 200)) / NK * st.d * 0.9, age = I.u - te; if (age < 0 || age > 1.8) continue;
        const p0 = SV_ROOMS.peelPoint(i, te, hs(k, i + 201), rs); if (!p0) continue;
        const sd = i * 7 + k, vx = (hs(sd, 202) - 0.4) * 70 + 18, vy = -(50 + 90 * hs(sd, 203)), x = p0.x + vx * age + Math.sin(I.u * 2.4 + sd) * 14 * age, y = p0.y + vy * age + 30 * age * age * (hs(sd, 204) < 0.4 ? 1 : 0.2), fa = Math.sin(Math.min(1, age / 1.8) * Math.PI) * 0.95;
        const sz = 5 + 8 * hs(sd, 205), rot = age * (1.6 + 2 * hs(sd, 206)) * (sd % 2 ? 1 : -1) + sd, sq = 0.35 + 0.65 * Math.abs(Math.cos(age * 2.6 + sd));
        c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, sq); c.globalAlpha = fa; c.fillStyle = '#22170f'; c.fillRect(-sz / 2, -sz * 0.35, sz, sz * 0.7);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = fa * 0.9; c.strokeStyle = '#ffb860'; c.lineWidth = 1.4; c.strokeRect(-sz / 2, -sz * 0.35, sz, sz * 0.7); glow(c, 0, 0, sz * 1.5, '#ff9a3c', 0.22); c.restore();
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let m = 0; m < 2; m++) { const q = age + 0.2 * m, cx = p0.x + (vx * 0.6 + (hs(sd, 207 + m) - 0.5) * 40) * q, cy = p0.y - (80 + 80 * hs(sd, 209 + m)) * q; glow(c, cx, cy, 3.2, m ? '#fff0c0' : '#ffa850', 0.7 * (1 - c01(q / 1.8)) * fa); }
        c.restore();
      }
    });
    c.restore();
  }
  // the Hollow King's lantern (guessed: held at his front hand; his body is ult-echo.js's, and the art does not draw it): dark until he stands, then a flame catches
  function lanternHK(c, room, t, env) {
    const h = S.hk4; if (!h) return;
    const u = t - h.start, tc = h.rise + 0.3; if (u < h.rise - 0.6) return;
    const act = room.ev['svechoact:' + h.n], lie = act && act.anim === 'liedown' ? c01((t - act.start) / 0.9) : 0;
    if (lie >= 1) return;   // (set down: the lantern on the stones is main.js's, with its pool of light from lanternPools)
    const hand = rot2(h.face, 26, -16), lq = sm(lie), hx = lerp(h.x + hand[0] * 1.1, h.x + 34, lq), hy = lerp(h.y + hand[1] * 1.1 + 16, h.y + 14, lq) - 20 * Math.sin(lq * Math.PI);
    const ka = sm(c01((u - tc) / 0.8)), spark = u > tc - 0.1 ? Math.exp(-(u - tc) * 3.2) * c01((u - tc + 0.1) / 0.1) : 0, fl = 0.85 + 0.1 * Math.sin(t * 8.2) + 0.05 * Math.sin(t * 19), lit = ka * (1 - 0.45 * lie);
    c.save();
    if (lit > 0.02) add(c, () => { glow(c, hx, hy + 2, 120 * lit * fl, K.gold, 0.15 * lit); glow(c, hx, hy, 54, K.hot, 0.2 * lit * fl); if (lie < 0.5) glow(c, h.x + hand[0] * 0.6, h.y - 40, 70, K.gold, 0.12 * lit * (1 - lie * 2)); });   // (the light on the ground, and on his own face)
    // the lantern: an iron ring, a cage with glass, a base
    c.translate(hx, hy); c.lineJoin = c.lineCap = 'round';
    c.beginPath(); c.arc(0, -17, 4, Math.PI, TAU); c.lineWidth = 2; c.strokeStyle = rgba(K.ink, 0.95); c.stroke();
    c.beginPath(); c.moveTo(-6, -12); c.lineTo(-7, 6); c.lineTo(7, 6); c.lineTo(6, -12); c.closePath();
    c.fillStyle = rgba(lit > 0.1 ? mixHexFx('#2a2218', '#ffcf7a', lit * 0.7) : '#2a2218', 0.95); c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#120c08'; c.stroke();
    c.beginPath(); c.moveTo(-8, -13); c.lineTo(8, -13); c.moveTo(-8, 7); c.lineTo(8, 7); c.moveTo(0, -12); c.lineTo(0, 6); c.lineWidth = 2; c.strokeStyle = '#120c08'; c.stroke();
    if (lit > 0.02 || spark > 0.02) add(c, () => {
      tongue(c, 0, 3, UP + Math.sin(t * 4) * 0.1, (14 + 4 * Math.sin(t * 9)) * (lit + spark * 0.8) + 12 * spark, 8, t * 2, [K.red, K.gold, K.white], 0.95);
      glow(c, 0, -4, 16 + 30 * spark, K.hot, 0.5 * lit + 0.6 * spark);
      if (spark > 0.05) { c.beginPath(); c.arc(0, -4, 8 + 40 * (1 - spark), 0, TAU); c.lineWidth = 2.4 * spark + 0.5; c.strokeStyle = rgba(K.gold, 0.8 * spark); c.stroke(); for (let m = 0; m < cnt(8); m++) { const an = hs(m, 220) * TAU, d = 6 + 40 * (1 - spark) * (0.5 + hs(m, 221)); glow(c, Math.cos(an) * d, -4 + Math.sin(an) * d - 14 * (1 - spark), 2.2, K.hot, 0.9 * spark); } }
    });
    c.restore();
  }
  const mixHexFx = (a, b, q) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], q)).toString(16).padStart(2, '0')).join(''); };

  // ---- the heat haze: a displaced patch of the canvas round the Sovereign and along the blade (a few device pixels of sideways shimmer, soft-edged), taken from what is already
  // drawn (the floor and our floor effects: the telegraphs, the units and the body come after it, so none of them is ever moved). Off under low effects, and at the kill.
  let HZ = null, HZ2 = null;
  function hazePatch(c, m, x, y, rx, ry, amp, t, seed) {
    const cv = c.canvas, sx = m.a, sy = m.d, w = Math.ceil(2 * rx * sx), h = Math.ceil(2 * ry * sy), dx = Math.round(m.a * x + m.e - rx * sx), dy = Math.round(m.d * y + m.f - ry * sy);
    if (w < 8 || h < 8 || w > 760 || h > 760 || dx + w <= 0 || dy + h <= 0 || dx >= cv.width || dy >= cv.height) return;
    if (!HZ) { HZ = document.createElement('canvas'); HZ2 = document.createElement('canvas'); HZ.width = HZ.height = HZ2.width = HZ2.height = 768; }
    const g = HZ.getContext('2d'), g2 = HZ2.getContext('2d'), x0 = Math.max(0, dx), y0 = Math.max(0, dy), x1 = Math.min(cv.width, dx + w), y1 = Math.min(cv.height, dy + h);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.drawImage(cv, x0, y0, x1 - x0, y1 - y0, x0 - dx, y0 - dy, x1 - x0, y1 - y0);
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.globalCompositeOperation = 'source-over'; g2.clearRect(0, 0, w, h);
    const SL = Math.max(4, Math.round(7 * sy));
    for (let yy = 0; yy < h; yy += SL) { const v = yy / h, wob = (Math.sin(t * 2.6 + yy / sy * 0.11 + seed) + 0.6 * Math.sin(t * 4.1 + yy / sy * 0.23 + seed * 2)) * amp * sx * (0.4 + 0.6 * Math.sin(v * Math.PI)); g2.drawImage(HZ, 0, yy, w, Math.min(SL, h - yy), wob, yy, w, Math.min(SL, h - yy)); }
    g2.globalCompositeOperation = 'destination-in';
    const rg = g2.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.9)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = rg; g2.fillRect(0, 0, w, h); g2.globalCompositeOperation = 'source-over';
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(HZ2, 0, 0, w, h, dx, dy, w, h); c.restore();
  }
  function heatHaze(c, room, t, env) {
    if (LOW || typeof document === 'undefined' || !c.getTransform) return;
    const m = c.getTransform(); if (!m || m.b || m.c || m.a <= 0.05) return;
    const st = stOf(env), pr = (st && st.props) || {}; if ((pr.svGutter || 0) > 0.25) return;
    const act = room.ev.svact ? room.ev.svact.act : 1; if (act === 'night') return;
    const b = bossAt(env), sg = pr.svBladeSide === -1 ? -1 : 1, fs = Number.isFinite(b.f) ? b.f : Number.isFinite(b.facing) ? b.facing : Math.PI / 2;
    const hs0 = rot2(fs, 16, 30 * sg), ds = fs + Math.atan2(0.52 * sg, 0.85), L = { 1: 84, 2: 98, 3: 112, 4: 124 }[act] || 98, S0 = { x: b.x + hs0[0], y: b.y + hs0[1] };
    hazePatch(c, m, b.x, b.y - 36, 104, 118, 2.6, t, 1);
    for (const [f, r, a, sd] of [[0.55, 34, 2.4, 2], [1.05, 28, 2.8, 3]]) hazePatch(c, m, S0.x + Math.cos(ds) * L * f, S0.y + Math.sin(ds) * L * f - 16 * f, r, r * 1.35, a, t, sd);
  }

  function fx5Under(c, room, t, env) {
    const g = activeGrace(t); if (g) { graceUnder(c, g, t, env); nightfallUnder(c, g, t, env); }
    sapUnder(c, room, t, env);
    for (const k in room.ev) if (k.startsWith('svseed:')) seedFloor(c, room.ev[k], t, env);
  }
  function fx5Over(c, room, t, env) {
    const g = activeGrace(t); if (g) graceOver(c, g, t, env);
    for (const k in room.ev) if (k.startsWith('svseed:')) seedOver(c, room.ev[k], t, env);
    sapOver(c, room, t, env);
    peelScraps(c, env, t); lanternHK(c, room, t, env);
  }

  // The Grace's hold, drawn: the script holds the floor fire (zone.startAt = max(startAt, now + hold), zone.end += hold) when Grace Withdrawn lands, so a wall that is lit then
  // burns the held time longer, and one not yet lit lights only when the hold is over. The Sunwheel's walls (FX4) read this so none vanishes while it can still hurt.
  function graceWall(ev, ig, life) {
    let ti = ev.start + ig, te = ti + life;
    for (const g of S.gr) if (g.start < te) { te += g.hold; if (g.start < ti) ti = Math.max(ti, g.start + g.hold); }
    return [ti - ev.start, te - ti];
  }

  // ---------------------------------------------------------------------------------------------------------------- FX6: the lantern's hand-over, the last flame (the kill), Emberfall (the enrage), the wipe
  // Messages (contract: "Built (S4a)", "Built (S4b)"): the lantern's carrier changing (`lant`, read from env.lanterns), roomev svlie { order, step, hk, night, echo[], pos[], dur } (the echoes lying
  // down are ult-echo.js's; its `start` is the client's own, see ULT_ECHO LIE_FIRST), svgutter { dur } (the art's svGutter and the room's drain), svact 'night', svemberfall { seams, ignite, ash, dur },
  // svwipe { lit, enrage, dur }. Nothing here is bright: the kill is quiet, Emberfall burns from under and then eats the screen from its edges in (never a white screen, no flash at all),
  // and the wipe's relight is a ripple of small flames and a flare of the floor's fire.
  const NBAND = 8;
  let SEAM6 = null;
  // the square's flagstone seams (the lattice of sovereign-rooms.js stones(): rows of 34 px, every other row half a stone along), in NBAND rings from the middle out, and the points the flames come from
  function seams6() {
    const R6 = typeof ARENA !== 'undefined' && ARENA.kind === 'circle' ? ARENA.full : 540, R = RR() + 12;
    if (SEAM6 && SEAM6.R6 === R6 && SEAM6.R === R) return SEAM6;
    const cell = 34, paths = Array.from({ length: NBAND }, () => new Path2D()), pts = [];
    for (let gy = -R6, ri = 0; gy < R6; gy += cell, ri++) {
      for (let gx = -R6 + (ri % 2) * cell / 2, gi = 0; gx < R6; gx += cell, gi++) {
        for (const g of [[gx, gy, gx, gy + cell], [gx, gy, gx + cell, gy]]) {
          const d = Math.hypot((g[0] + g[2]) / 2, (g[1] + g[3]) / 2); if (d > R) continue;
          const b = Math.min(NBAND - 1, Math.floor(d / R * NBAND)); paths[b].moveTo(g[0], g[1]); paths[b].lineTo(g[2], g[3]);
        }
        if ((ri * 7 + gi * 3) % 11 === 0 && Math.hypot(gx, gy) < R - 10) pts.push([gx + (hs(ri, gi) - 0.5) * 10, gy + (hs(gi, ri) - 0.5) * 10, Math.hypot(gx, gy) / R, hs(ri * 31 + gi, 611)]);
      }
    }
    return (SEAM6 = { R6, R, paths, pts });
  }
  const holes6 = room => { const o = []; for (const k in room.ev) if (k.startsWith('svhole:')) { const e = room.ev[k]; o.push([+e.x || 0, +e.y || 0, +e.r || 80]); } return o; };
  const partyMid = env => { const U = env.units; if (!U || !U.length) return { x: 0, y: 0 }; let x = 0, y = 0; for (const u of U) { x += u.x; y += u.y; } return { x: x / U.length, y: y / U.length }; };
  const chargeOf = (env, id) => { const P = env.pol !== undefined ? env.pol : rawRaid() && rawRaid().pol; const v = P && P.get ? P.get(id) : 0; return v > 0 ? 1 : v < 0 ? -1 : 0; };
  const chCol = ch => (ch > 0 ? [K.ember, K.gold] : [K.ash, '#ece4d8']);

  // ---- the lantern's hand-over: when the last lantern changes carriers (a cure passes it on), a small flame leaps from the old hands to the new
  function trackFx6(room, env, t) {
    const L = feed(env, 'lanterns');
    if (L && L.length) for (const l of L) {
      if (!l.last) continue;
      const prev = S.lcar.get(l.id);
      if (l.carrier != null) { const a = prev != null && prev !== l.carrier && env.entById ? env.entById(prev) : null; if (a) S.pass.push({ x: a.x, y: a.y, to: l.carrier, at: t }); S.lcar.set(l.id, l.carrier); } else S.lcar.set(l.id, null);
    }
    for (let i = S.pass.length - 1; i >= 0; i--) if (t > S.pass[i].at + 1.6 || t < S.pass[i].at - 1) S.pass.splice(i, 1);
  }
  function passOver(c, env, t) {
    for (const p of S.pass) {
      const age = t - p.at, B = env.entById ? env.entById(p.to) : null; if (!B || age < 0 || age > 1.5) continue;
      const fl = 0.62, q = c01(age / fl), P0 = { x: p.x + 14, y: p.y - 20 }, P2 = { x: B.x + 14, y: B.y - 24 }, mx = (P0.x + P2.x) / 2, my = Math.min(P0.y, P2.y) - 60 - Math.hypot(P2.x - P0.x, P2.y - P0.y) * 0.18;
      const at = s => { const m = 1 - s; return { x: m * m * P0.x + 2 * m * s * mx + s * s * P2.x, y: m * m * P0.y + 2 * m * s * my + s * s * P2.y }; };
      if (age < fl) {
        const H = at(Math.pow(q, 0.85));
        add(c, () => {
          for (let j = 12; j >= 1; j--) { const T = at(Math.max(0, Math.pow(q, 0.85) - j * 0.035)); glow(c, T.x, T.y, 10 - j * 0.5, j < 4 ? K.gold : K.ember, 0.5 * (1 - j / 13)); }
          glow(c, H.x, H.y, 26, K.ember, 0.45); glow(c, H.x, H.y, 12, K.gold, 0.8); glow(c, H.x, H.y, 5, K.white, 1);
        });
        tongue(c, H.x, H.y, UP, 20, 11, t * 3, FIRE, 0.9);
      } else {
        const a2 = age - fl, f = c01(a2 / 0.8);
        add(c, () => { glow(c, P2.x, P2.y, 60 * (1 - f) + 18, K.gold, 0.45 * (1 - f)); c.beginPath(); c.arc(P2.x, P2.y + 20, 10 + 60 * eo3(f), 0, TAU); c.lineWidth = 3 * (1 - f); c.strokeStyle = rgba(K.gold, 0.8 * (1 - f)); c.stroke(); });
        rise(c, P2.x, P2.y + 6, { n: 6, t: a2, per: 1.1, rise: 50, spread: 26, size: 2.4, a: 1 - f, col: K.gold, hot: K.white, seed: 650 });
      }
    }
  }

  // ---- the last flame (the kill)
  // Under: ash settling slowly over the square, the last embers dying out of the floor, and, as the night comes, a faint cold ring running out from the party. Over: the halo's last flame
  // (the Hollow King's sigil) lets go, falls, lands and gutters out; a few motes leave the Sovereign.
  const LF = { fall0: 0.9, fall1: 2.9, out: 3.9 };
  function lastFlameUnder(c, room, t, env) {
    const L = room.ev.svlie; if (!L) return;
    const u = t - L.start; if (u < -0.1) return;
    const R = RR(), nt = room.ev.svact && room.ev.svact.act === 'night' ? t - room.ev.svact.start : u - (+L.night || 10.4), drain = c01((u - 0.4) / 8.6), post = nt > 0 ? 1 - 0.8 * c01(nt / 6) : 1;
    c.save(); clipRoom(c);
    // ash settling (pale flakes, very slowly)
    const nA = cnt(46), ak = sm(c01(u / 2.5)) * post;
    c.fillStyle = '#b0a698';
    for (let i = 0; i < nA; i++) {
      const x = (hs(i, 601) * 2 - 1) * R + Math.sin(t * 0.5 + hs(i, 602) * 9) * 16, y = ((hs(i, 603) * 2 * R + t * (7 + 9 * hs(i, 604))) % (2 * R)) - R, sz = 1.2 + 1.8 * hs(i, 605);
      c.globalAlpha = (0.16 + 0.26 * hs(i, 606)) * ak; c.save(); c.translate(x, y); c.rotate(t * 0.4 + i); c.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2); c.restore();
    }
    c.globalAlpha = 1;
    // the last embers, dying out of the floor where the fire was: fewer and fewer
    const nE = cnt(34);
    add(c, () => {
      for (let i = 0; i < nE; i++) {
        if (hs(i, 607) < drain * 1.05) continue;   // (this one has gone out)
        const per = 3.2 + 2.4 * hs(i, 608), ph = (t / per + hs(i, 609)) % 1, x = (hs(i, 610) * 2 - 1) * R * 0.92, y = (hs(i, 612) * 2 - 1) * R * 0.92 - ph * 56;
        if (x * x + (y + ph * 56) * (y + ph * 56) > R * R) continue;
        glow(c, x + Math.sin(t * 0.8 + i) * 6, y, 3.6, ph < 0.45 ? K.amber : K.ember, Math.sin(ph * Math.PI) * 0.6 * (1 - drain * 0.5));
      }
    });
    // the night comes: a faint cold ring running out from the party, and the lantern's pool stays warm on the stones (lanternPools)
    if (nt > 0 && nt < 4.6) {
      const q = c01(nt / 4.4), P = partyMid(env);
      bandRing(c, P.x, P.y, 30 + R * 1.5 * eo3(q), 130 * (1 - 0.45 * q), 0.13 * (1 - ei(q)), ['#0a1030', '#4a68c0', '#c4d6ff']);
    }
    c.restore();
  }
  function lastFlameOver(c, room, t, env) {
    const L = room.ev.svlie; if (!L) return;
    const u = t - L.start; if (u < 0 || u > 9.5) return;
    const b = bossAt(env);
    // a few last motes leaving the Sovereign as the ember goes out of it
    const mk = (1 - c01((u - 0.3) / 8.5)) * c01(u / 0.8);
    if (mk > 0.02) rise(c, b.x, b.y - 30, { n: 6, t, per: 2.8, rise: 90, spread: 30, size: 2.2, a: 0.7 * mk, col: K.amber, hot: K.hot, seed: 640 });
    // the halo's last flame (the Hollow King's sigil): it shrinks where it stands, lets go, drifts down like a feather, lands, and gutters out in a thread of smoke
    if (u > LF.out + 3.5) return;
    const P = haloPt(env, 3), z0 = 46, fq = c01((u - LF.fall0) / (LF.fall1 - LF.fall0)), z = z0 * (1 - sm(fq)), sway = Math.sin(fq * 7) * 9 * (1 - fq) * c01(fq * 6);
    const x = P.x + sway, y = P.y + 4, gut = c01((u - LF.fall1) / (LF.out - LF.fall1));
    const h = (u < LF.fall0 ? 34 * (1 - 0.4 * sm(c01(u / LF.fall0))) : 20 * (1 - 0.3 * fq)) * (1 - sm(gut)) * (0.88 + 0.12 * Math.sin(t * 17) + 0.05 * Math.sin(t * 31)), a = c01(u / 0.4) * (1 - sm(gut));
    if (a > 0.02) {
      const fx = x, fy = y - z;
      add(c, () => { glow(c, x, y, 54 * (0.5 + 0.5 * (1 - z / z0)), K.ember, 0.14 * a); glow(c, fx, fy - 6, 34, K.amber, 0.3 * a); glow(c, fx, fy - 4, 12, K.hot, 0.55 * a); });
      tongue(c, fx, fy, UP + Math.sin(t * 3.1) * 0.08, Math.max(2, h), 12, t * 2, FIRE, 0.95 * a);
      if (z > 3 && fq > 0) rise(c, fx, fy, { n: 3, t, per: 1.0, rise: 18, spread: 8, size: 1.8, a: 0.7 * a, col: K.amber, hot: K.hot, seed: 645 });
    }
    // the landing: a soft ring on the stones and a few embers
    const la = u - LF.fall1;
    if (la > 0 && la < 1.8) {
      const f = c01(la / 1.5);
      add(c, () => { c.beginPath(); c.arc(P.x, P.y + 6, 10 + 38 * eo3(f), 0, TAU); c.lineWidth = 2.4 * (1 - f); c.strokeStyle = rgba(K.amber, 0.45 * (1 - f)); c.stroke(); });
      rise(c, P.x, P.y + 2, { n: 5, t: la, per: 1.6, rise: 46, spread: 16, size: 2, a: 1 - f, col: K.amber, hot: K.hot, seed: 647 });
    }
    // the smoke after: three grey wisps lifting from the dead flame
    const sa = u - LF.out;
    if (sa > -0.4 && sa < 3.4) for (let i = 0; i < 3; i++) { const q = c01((sa + 0.4 + i * 0.3) / 3.4); glow(c, P.x + Math.sin(q * 5 + i * 2) * 7 + (i - 1) * 3, P.y - 8 - q * 70, 7 + 12 * q, '#8f867c', 0.12 * Math.sin(q * Math.PI)); }
  }

  // ---- Emberfall (the enrage)
  function emberfallUnder(c, room, t, env) {
    const E = room.ev.svemberfall; if (!E) return;
    const u = t - E.start, sA = +E.seams || 0.8, iA = +E.ignite || 2.4, R = RR(), G = seams6();
    if (u < sA - 0.1) return;
    // the seams: white-gold light rising up through every flagstone joint, ring after ring from the middle (the fountain) to the rim, then pulsing as the fire builds
    const wave = sm(c01((u - sA) / Math.max(0.5, iA - sA + 0.4))), rf = R * 1.25 * wave, kT = (0.3 + 0.7 * sm(c01((u - sA) / 3.2))) * (1 + 0.12 * Math.sin(u * 9));
    c.save(); clipRoom(c);
    add(c, () => glow(c, 0, 0, R * 1.15, K.amber, 0.12 * kT * wave));
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let b = 0; b < NBAND; b++) {
      const ab = c01((rf - (b / NBAND) * R) / (R / NBAND * 1.6)) * (0.88 + 0.12 * Math.sin(t * 7 + b * 1.7)); if (ab <= 0.01) continue;
      c.lineWidth = 9; c.strokeStyle = rgba(K.amber, 0.16 * ab * kT); c.stroke(G.paths[b]);
      c.lineWidth = 3; c.strokeStyle = rgba('#ffe2a0', 0.62 * ab * kT); c.stroke(G.paths[b]);
      c.lineWidth = 1.1; c.strokeStyle = rgba(K.white, 0.8 * ab * kT); c.stroke(G.paths[b]);
    }
    c.globalCompositeOperation = 'source-over';
    // the town ignites from below: flames come up out of the seams, the middle first, spreading to the rim; a ring of fire along the edge
    if (u > iA - 0.2) {
      const gk = sm(c01((u - iA) / 3.0)), pts = G.pts, step = LOW ? 2 : 1;
      for (let i = 0; i < pts.length; i += step) {
        const p = pts[i], age = u - iA - p[2] * 1.7 - p[3] * 0.7; if (age <= 0) continue;
        const grow = sm(c01(age / 0.9)), hgt = (34 + 60 * p[3]) * grow * (0.9 + 0.1 * Math.sin(t * 8 + i)) * (0.6 + 0.4 * gk);
        tongue(c, p[0], p[1] + 4, UP + Math.sin(t * 1.7 + i) * 0.06, hgt, 13 + 6 * p[3], t * 2 + i * 0.7, [K.red, K.gold, K.white], 0.85 * grow);
      }
      add(c, () => { glow(c, 0, 0, R * 1.3, K.ember, 0.1 * gk); });
      bandRing(c, 0, 0, R * 0.98, 110, 0.32 * gk, [K.dark, K.ember, K.hot]);
      rise(c, 0, 0, { n: 26, t, per: 2.4, rise: 150, spread: R * 0.9, size: 2.6, a: 0.8 * gk, col: K.gold, hot: K.white, seed: 660 });
    }
    c.restore();
  }
  // the screen burning to ash from its edges in: char at the edge, a ragged line of glowing ember eating inward, ash-grey beyond it, embers and flakes in the air; the middle stays clear
  function emberfallOver(c, room, t, env) {
    const E = room.ev.svemberfall; if (!E) return;
    const u = t - E.start, aA = +E.ash || 4.4, dur = +E.dur || 8; if (u < aA - 0.1) return;
    const cv = c.canvas, W = cv.width, H = cv.height, mxR = Math.hypot(W, H) / 2 * 1.06, p = sm(c01((u - aA) / Math.max(0.5, dur - aA - 0.3))), r0 = mxR * (1 - 0.8 * p);
    const N = LOW ? 56 : 96, rad = [];
    for (let i = 0; i < N; i++) { const th = i / N * TAU, nz = 0.5 * Math.sin(th * 5 + 1.3) + 0.3 * Math.sin(th * 11 + 0.4) + 0.25 * Math.sin(th * 23 + 2.1) + 0.2 * (hs(i, 670) - 0.5) * 2; rad.push(r0 * (1 + 0.1 * nz * (0.4 + 0.6 * p)) + 5 * Math.sin(t * 1.3 + i * 0.8)); }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    const cx = W / 2, cy = H / 2, poly = new Path2D();
    for (let i = 0; i <= N; i++) { const th = (i % N) / N * TAU, r = rad[i % N]; const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r * 0.9; i ? poly.lineTo(x, y) : poly.moveTo(x, y); }
    poly.closePath();
    const ring = new Path2D(); ring.rect(0, 0, W, H); ring.addPath(poly);
    const fa = c01((u - aA + 0.1) / 0.5);
    c.fillStyle = rgba('#0e0907', 0.94 * fa); c.fill(ring, 'evenodd');                                         // (the char)
    c.lineJoin = 'round'; c.lineWidth = Math.max(10, W * 0.03); c.strokeStyle = rgba('#6c6258', 0.32 * fa); c.stroke(poly);   // (ash, the paper that has burnt through and not yet gone)
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = Math.max(16, W * 0.02); c.strokeStyle = rgba('#ff6a1c', 0.1 * fa); c.stroke(poly);
    c.lineWidth = Math.max(6, W * 0.008); c.strokeStyle = rgba('#ffb050', 0.34 * fa * (0.8 + 0.2 * Math.sin(t * 9))); c.stroke(poly);
    c.lineWidth = Math.max(2, W * 0.003); c.strokeStyle = rgba('#fff0c0', 0.8 * fa); c.stroke(poly);
    // embers lifting off the line and flakes beyond it
    const nE = LOW ? 24 : 56;
    for (let i = 0; i < nE; i++) {
      const th = hs(i, 671) * TAU, ph = (t * (0.5 + 0.5 * hs(i, 672)) + hs(i, 673)) % 1, k = Math.floor(th / TAU * N) % N, r = rad[k] + (hs(i, 674) - 0.3) * 24;
      const x = cx + Math.cos(th) * r + Math.sin(t + i) * 8, y = cy + Math.sin(th) * r * 0.9 - ph * 70;
      c.globalAlpha = Math.sin(ph * Math.PI) * 0.85 * fa; c.fillStyle = hs(i, 675) < 0.5 ? '#ffc070' : '#fff0c8'; const s = 1.6 + 2.2 * hs(i, 676); c.fillRect(x, y, s, s);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.restore();
  }

  // ---- the wipe: the halo relights in full, flame by flame, in a fast ripple; the square's fire flares as if nothing had been learned
  function wipeUnder(c, room, t, env) {
    const W = room.ev.svwipe; if (!W) return;
    const u = t - W.start, dur = +W.dur || 2.6; if (u < -0.05 || u > dur + 4) return;
    const R = RR(), b = bossAt(env), k = sm(c01(u / 0.55)) * (1 - 0.4 * sm(c01((u - 1.4) / 2.6))), G = seams6();
    c.save(); clipRoom(c);
    add(c, () => glow(c, 0, 0, R * 1.2, K.ember, 0.16 * k));
    // the fire's flare: a ring of flame round the rim, and the floor's seams lit (fully, if the enrage had already burned them)
    const nT = cnt(40);
    for (let i = 0; i < nT; i++) {
      const th = i / nT * TAU + 0.4 * hs(i, 680), r = R * (0.62 + 0.34 * hs(i, 681)), age = u - 0.05 - (Math.hypot(Math.cos(th) * r - b.x, Math.sin(th) * r - b.y) / (R * 2)) * 0.5; if (age <= 0) continue;
      const g = sm(c01(age / 0.5)) * (1 - 0.35 * sm(c01((u - 1.6) / 2.4)));
      tongue(c, Math.cos(th) * r, Math.sin(th) * r + 4, UP, (46 + 56 * hs(i, 682)) * g, 15, t * 2 + i, [K.red, K.gold, K.white], 0.85 * g);
    }
    const sk = (W.enrage ? 0.8 : 0.38) * k;
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let bd = 0; bd < NBAND; bd++) { c.lineWidth = 8; c.strokeStyle = rgba(K.amber, 0.14 * sk); c.stroke(G.paths[bd]); c.lineWidth = 2.6; c.strokeStyle = rgba('#ffe2a0', 0.6 * sk); c.stroke(G.paths[bd]); }
    c.globalCompositeOperation = 'source-over';
    // the ring of the relight, out from the Sovereign
    const q = c01(u / 1.1); if (q < 1) bandRing(c, b.x, b.y, 30 + 900 * eo3(q), 70 * (1 - 0.5 * q), 0.4 * (1 - ei(q)), FIREP);
    c.restore();
  }
  function wipeOver(c, room, t, env) {
    const W = room.ev.svwipe; if (!W) return;
    const u = t - W.start, dur = +W.dur || 2.6; if (u < 0 || u > dur + 6) return;
    for (let i = 0; i < 12; i++) {
      const ti = i * 0.065, age = u - ti; if (age < 0) continue;
      const P = haloPt(env, i), pop = Math.exp(-age * 4.5) * c01(age / 0.05), fl = 0.88 + 0.12 * Math.sin(t * 13 + i * 2) + 0.04 * Math.sin(t * 29 + i), g = sm(c01(age / 0.25)), out = 1 - sm(c01((u - dur - 2.2) / 3.5)) * 0.4;
      add(c, () => { glow(c, P.x, P.y - 8, 40 + 38 * pop, K.amber, (0.3 + 0.35 * pop) * g * out); glow(c, P.x, P.y - 8, 11, K.hot, (0.5 + 0.4 * pop) * g * out); if (age < 0.5) { c.beginPath(); c.arc(P.x, P.y - 4, 8 + 42 * eo3(c01(age / 0.5)), 0, TAU); c.lineWidth = 2.4 * (1 - age / 0.5); c.strokeStyle = rgba(K.gold, 0.8 * (1 - age / 0.5)); c.stroke(); } });
      tongue(c, P.x, P.y, UP + Math.sin(t * 3 + i) * 0.07, (30 + 22 * pop) * g * fl, 12, t * 2.2 + i, FIRE, 0.95 * out);
      if (pop > 0.25) glint(c, P.x, P.y - 12, 16 + 20 * pop, 0.5, K.hot, pop * 0.8);
    }
  }

  function fx6Under(c, room, t, env) { trackFx6(room, env, t); lastFlameUnder(c, room, t, env); emberfallUnder(c, room, t, env); wipeUnder(c, room, t, env); }
  function fx6Over(c, room, t, env) { passOver(c, env, t); lastFlameOver(c, room, t, env); wipeOver(c, room, t, env); emberfallOver(c, room, t, env); }

  // ---------------------------------------------------------------------------------------------------------------- the frame
  // Remember every Sovereign telegraph the moment it is first seen (its landing is drawn from the memory, so it plays through the telegraph's removal).
  function scan(env, t) {
    if (t < S.last - 1) resetState(S);
    S.last = t;
    if (env.tgs) for (const tg of env.tgs.values()) {
      if (!tg.tag || tg.tag.charCodeAt(0) !== 115 || tg.tag.charCodeAt(1) !== 118 || S.seen.has(tg)) continue;   // ('sv')
      S.seen.add(tg); S.recs.push({ tg, tag: tg.tag, start: tg.start, dur: tg.dur, target: tg.target != null ? tg.target : tg.follow, sd: (+tg.id || S.recs.length) % 97, s: tg.live || tg.shape, land: tg.start + tg.dur, cancel: false });
    }
    for (let i = S.recs.length - 1; i >= 0; i--) {
      const r = S.recs[i], tg = r.tg;
      r.s = tg.live || tg.shape || r.s;
      if (tg.gone != null) { r.cancel = tg.gone < tg.start + tg.dur - 0.45; r.land = tg.gone; } else r.land = tg.start + tg.dur;
      if (t > r.land + (r.tag === 'svBrand' ? BURN + 4 : 9) || r.cancel && t > r.land + 0.3) S.recs.splice(i, 1);
    }
  }
  const frameLow = env => { LOW = env && env.low != null ? !!env.low : readLow(); };
  function under(ctx, room, t, env) {
    if (!room || !room.ev) return;
    frameLow(env); S.room = room; scan(env, t); trackHk(room); trackFx4(room); trackDoom(env, t); trackFx5(room, env, t);
    const rb = room.ev.svrebirth, act2 = !(room.ev.svact && room.ev.svact.act >= 3) && !rb;   // (the heads, their stumps and the water are Act II's: the floor they lay on is gone from Act III on, and from Rebirth's first message)
    const H = heartOf(room, t);
    ctx.save();
    shade(ctx, room, t, env, H); nightfallDark(ctx, room, t, env);   // (the wall's vignette and Rebirth's dark: first, so everything else lies over them)
    descent(ctx, room, t);
    bonds(ctx, t, env); bellUnder(ctx, room, t); doomSigil(ctx, env, t); lanternPools(ctx, env, t); burnUnder(ctx, room, t, env); sunkUnder(ctx, room, t);
    for (const k in room.ev) {
      const ev = room.ev[k];
      if (k.startsWith('svturn:')) turnUnder(ctx, ev, t, env);
      else if (k.startsWith('svflambe:')) plateUnder(ctx, ev, t, env);
      else if (k.startsWith('svweb:')) webUnder(ctx, room, k, ev, t);
      else if (k.startsWith('svglass:')) glassUnder(ctx, ev, t);
      else if (k.startsWith('svhead:')) { if (act2) headUnder(ctx, ev, k, room, t); }
      else if (k.startsWith('svcut:')) { if (act2 || (rb && t - rb.start < 0.6 + 0.25 * ((+k.slice(6) || 1) - 1) + 0.6)) stumpUnder(ctx, ev, t); }   // (at Rebirth a stump's fire stays until the blade draws it off)
      else if (k.startsWith('svpillar:')) pillarUnder(ctx, ev, t - ev.start, H, t, env);
      else if (k.startsWith('svechoact:')) stanceUnder(ctx, ev, k.slice(10), t, env, room);
      else if (k.startsWith('svcrescent:')) crescentUnder(ctx, ev, t);
      else if (k.startsWith('svlance:')) lanceUnder(ctx, ev, t);
      else if (k.startsWith('svpyre:')) pyreUnder(ctx, ev, t);
      else if (k.startsWith('svdance:')) danceUnder(ctx, ev, t);
      else if (k.startsWith('svwheel:')) wheelUnder(ctx, ev, k.slice(8), t);
    }
    twinFrame(ctx, room, t, env, false); heartUnder(ctx, room, t, env, H); rebirthUnder(ctx, room, t, env); fx5Under(ctx, room, t, env); fx6Under(ctx, room, t, env);
    for (const r of S.recs) { const f = TELL[r.tag]; if (f && f.under && t > r.start - 0.1) f.under(ctx, r, t, env); }
    heatHaze(ctx, room, t, env);   // (last: a few pixels of shimmer taken from the floor as it now stands, under every telegraph fill and unit)
    ctx.restore();
  }
  function over(ctx, room, t, env) {
    if (!room || !room.ev) return;
    frameLow(env); S.room = room;
    const act2 = !(room.ev.svact && room.ev.svact.act >= 3) && !room.ev.svrebirth;
    ctx.save();
    { const sk = surgeK(t); for (const u of charges(env)) orbit(ctx, t, u, sk); }
    bellOver(ctx, room, t); cureOver(ctx, t); lanternFlight(ctx, room, t, env); titheOver(ctx, room, t, env); burnOver(ctx, room, t, env);
    for (const k in room.ev) {
      const ev = room.ev[k];
      if (k.startsWith('svturn:')) turnOver(ctx, ev, t, env);
      else if (k.startsWith('svflambe:')) plateOver(ctx, ev, t, env);
      else if (k.startsWith('svweb:')) webOver(ctx, room, k, ev, t);
      else if (k.startsWith('svglass:')) glassOver(ctx, ev, t);
      else if (k.startsWith('svhead:')) { if (act2) headOver(ctx, ev, k, room, t); }
      else if (k.startsWith('svcut:')) { if (act2) cutOver(ctx, ev, k, room, t); }
      else if (k.startsWith('svcrescent:')) crescentOver(ctx, ev, t);
      else if (k.startsWith('svlance:')) lanceOver(ctx, ev, t);
      else if (k.startsWith('svpyre:')) pyreOver(ctx, ev, t);
      else if (k.startsWith('svdance:')) danceOver(ctx, ev, t);
      else if (k.startsWith('svwheel:')) wheelOver(ctx, ev, k.slice(8), t);
    }
    twinFrame(ctx, room, t, env, true); heartOver(ctx, room, t, env, heartOf(room, t)); rebirthOver(ctx, room, t, env); fx5Over(ctx, room, t, env); fx6Over(ctx, room, t, env);
    for (const r of S.recs) { const f = TELL[r.tag]; if (f && f.over && t > r.start - 0.1) f.over(ctx, r, t, env); }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------------------------- hooks
  // drawTelegraphs: ours first (so the fills and rims go on top); drawRoomOver: ours last
  function hook() {
    if (typeof ArenaView === 'undefined' || ArenaView.__svFx) return;
    const dt = ArenaView.drawTelegraphs, dro = ArenaView.drawRoomOver;
    ArenaView.drawTelegraphs = function (ctx, tgs, t, env) {
      if (env && env.bossId === 'sovereign') { try { under(ctx, this.liveRoom || env.room, t, env); } catch (e) { warn(e); } }
      return dt.apply(this, arguments);
    };
    ArenaView.drawRoomOver = function (ctx, room, t, env) {
      const res = dro.apply(this, arguments);
      if (env && env.bossId === 'sovereign') { try { over(ctx, room, t, env); } catch (e) { warn(e); } }
      return res;
    };
    ArenaView.__svFx = 1;
  }
  // The fire walls (zone tag svWall) are drawn here from svwheel, so the default zone drawing (a pale wash over the rect, the fall-through of drawZones) is kept off them:
  // the zones are handed on without them, and only when one stands (a cheap filtered copy; every other zone is untouched).
  function hookZones() {
    if (typeof ArenaView === 'undefined' || ArenaView.__svFxZ || typeof ArenaView.drawZones !== 'function') return;
    const dz = ArenaView.drawZones;
    ArenaView.drawZones = function (ctx, zones, t) {
      if (zones && zones.size) {
        let has = false; for (const z of zones.values()) if (z.tag === 'svWall') { has = true; break; }
        if (has) { const m = new Map(); for (const [id, z] of zones) if (z.tag !== 'svWall') m.set(id, z); zones = m; }
      }
      return dz.call(this, ctx, zones, t);
    };
    ArenaView.__svFxZ = 1;
  }
  hookZones();
  hook();

  // ---------------------------------------------------------------------------------------------------------------- the preview
  // window.__svFxPreview(canvas, effect, t, opts): the hall floor (SV_ROOMS), the Sovereign (SV_ART), four heroes and one effect, played from the clock t (it
  // loops every `period`). effect: see EFFECTS (descent .. burnback are Act I; glass sunk heads dive are Act II, on the forge floor). opts: { loop (default true), bare (no floor life) }.
  const HEROES = [['#7aa0ff', -250, 170], ['#ffd27a', 120, 230], ['#7aff9a', 260, -40], ['#ff9ad0', -120, -190]];
  const BOSS0 = { x: 0, y: -60 };
  const SCEN = {
    descent: { period: 12, build: () => ({ ev: { svact: { act: 1, start: 0.3, dur: 9999 } }, tgs: [] }) },
    kindling: { period: 8, build: () => ({ ev: {}, tgs: [{ tag: 'svKindling', type: 'raidwide', start: 0.4, dur: 3.4, shape: { kind: 'circle', x: 0, y: 0, r: 0 } }] }) },
    brand: { period: 11, build: () => ({ ev: {}, tgs: [{ tag: 'svBrand', type: 'buster', start: 0.4, dur: 3.8, target: 0, shape: { kind: 'circle', x: HEROES[0][1], y: HEROES[0][2], r: 130 } }] }) },
    sweep: { period: 9, build: () => ({ ev: {}, tgs: [{ tag: 'svSweep', type: 'aoe', start: 0.4, dur: 3.6, shape: { kind: 'rect', x: BOSS0.x, y: BOSS0.y, angle: 0, len: 1300, w: 2600 } }] }) },
    ember: { period: 8, build: () => ({ ev: {}, tgs: [{ tag: 'svEmber', type: 'stack', start: 0.4, dur: 4, target: 1, shape: { kind: 'circle', x: HEROES[1][1], y: HEROES[1][2], r: 125 } }] }) },
    scatter: { period: 8, build: () => ({ ev: {}, tgs: HEROES.map((h, i) => ({ tag: 'svScatter', type: 'spread', start: 0.4, dur: 4.2, target: i, shape: { kind: 'circle', x: h[1], y: h[2], r: 150 } })) }) },
    turn: { period: 12, build: () => {
      const a0 = 0.26, lit = 0xfff & ~0x0c4, tgs = [];
      for (let i = 0; i < 12; i++) if (lit & (1 << i)) { const a = a0 + i * TAU / 12; tgs.push({ tag: 'svLine', type: 'aoe', start: 0.4, dur: 4.2, shape: { kind: 'rect', x: BOSS0.x + Math.cos(a) * 150, y: BOSS0.y + Math.sin(a) * 150, angle: a, len: 1300, w: 64 } }); }
      return { ev: { 'svturn:1': { a0, sweep: 1.1, lit, dur: 5.2, start: 0.4 } }, tgs };
    } },
    flambe: { period: 17, build: () => {
      const P = [[-212, -212], [212, -212], [212, 212], [-212, 212]], at = [5, 7.4, 9.8, 12.2], tgs = [];
      P.forEach(([x, y], k) => tgs.push({ tag: 'svPlate', type: 'tower', start: 0.4, dur: at[k], shape: { kind: 'circle', x, y, r: 85 } }));
      for (let k = 0; k < 3; k++) { const [x0, y0] = P[k], [x1, y1] = P[k + 1], L = Math.hypot(x1 - x0, y1 - y0); tgs.push({ tag: 'svFlambe', type: 'aoe', start: 0.4, dur: at[k] + 1.7, shape: { kind: 'rect', x: x0, y: y0, angle: Math.atan2(y1 - y0, x1 - x0), len: L - 97, w: 70 } }); }
      tgs.push({ tag: 'svMince', type: 'aoe', start: 0.4, dur: at[3] + 2.6, shape: { kind: 'rect', x: 0, y: 0, angle: 0, len: 1300, w: 2600 } });
      return { ev: { 'svflambe:1': { plates: P, at, r: 85, dur: at[3] + 3, start: 0.4 } }, tgs };
    } },
    web: { period: 14, build: () => {
      const R = 508, WEB = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].map(na => { const g = 260, nx = Math.cos(na), ny = Math.sin(na), tx = -ny, ty = nx, h = Math.sqrt(R * R - g * g); return [Math.round(nx * g - tx * h), Math.round(ny * g - ty * h), Math.round(nx * g + tx * h), Math.round(ny * g + ty * h), Math.round(nx * g), Math.round(ny * g)]; });
      const l0 = WEB[0], l1 = WEB[1], l2 = WEB[2], tgs = [];
      // the first knot is broken at 3.6 (its fuse), the other two threads are left for the shadow at 7.5
      const fz = { x1: l1[0], y1: l1[1], x2: l1[2], y2: l1[3], kx: l1[4], ky: l1[5], sp: 230, at: 1.5, dur: 6, start: 3.6 };
      for (const dirn of [-1, 1]) { const len = Math.hypot(l1[2] - l1[0], l1[3] - l1[1]), ux = (l1[2] - l1[0]) / len, uy = (l1[3] - l1[1]) / len, s0 = (l1[4] - l1[0]) * ux + (l1[5] - l1[1]) * uy, far = dirn < 0 ? s0 : len - s0;
        for (let a = 50; a < far; a += 150) { const b = Math.min(a + 150, far), A = [l1[0] + ux * (s0 + dirn * a), l1[1] + uy * (s0 + dirn * a)], B = [l1[0] + ux * (s0 + dirn * b), l1[1] + uy * (s0 + dirn * b)]; tgs.push({ tag: 'svFuse', type: 'aoe', start: 3.6, dur: 1.5 + a / 230, shape: { kind: 'rect', x: A[0], y: A[1], angle: Math.atan2(B[1] - A[1], B[0] - A[0]), len: b - a + 4, w: 84 } }); } }
      for (const l of [l0, l2]) tgs.push({ tag: 'svShadow', type: 'aoe', start: 7.5, dur: 4, shape: { kind: 'rect', x: l[0], y: l[1], angle: Math.atan2(l[3] - l[1], l[2] - l[0]), len: Math.hypot(l[2] - l[0], l[3] - l[1]), w: 100 } });
      return { ev: { 'svweb:1': { l: WEB, start: 0.4 }, 'svfuse:1': fz, 'svshadow:1': { l: [l0.slice(0, 4), l2.slice(0, 4)], at: 2.4, sp: 700, dur: 5, start: 7.5 } }, tgs };
    } },
  };
  // FX1b: Act I's second half. pos(i, t) moves the heroes; extra(t) is the host state the real game keeps on `raid` (pol, doom, lanterns, knights); echo is the
  // Hollow King's place (the preview paints a placeholder ghost: his real body is ult-echo.js's); form switches the floor (burnback).
  const lerpv = (a, b, q) => a + (b - a) * q;
  SCEN.emberash = { period: 10, pose: 'call', poseTo: 1.6,
    pos: (i, tt) => { const e = sm(c01(tt / 5.8)), A = [[-170, 130, 0.45], [190, -110, -0.6]][i >> 1], d = lerpv(230, 36, e) * (i % 2 ? 1 : -1); return [A[0] + Math.cos(A[2]) * d, A[1] + Math.sin(A[2]) * d]; },
    extra: () => ({ pol: new Map([[0, 1], [1, -1], [2, 1], [3, -1]]) }),
    build: () => ({ ev: {}, tgs: [{ tag: 'svSurge', type: 'polarity', start: 0.4, dur: 6, shape: { kind: 'circle', x: 0, y: 0, r: 150 } }] }) };
  SCEN.bell = { period: 6, echo: { x: -180, y: -170 }, extra: () => ({}),
    build: () => ({ ev: { 'svecho:1': { who: 'hollowking', sig: 3, x: -180, y: -170, start: 0.05, dur: -1 }, 'svechoact:1': { anim: 'bell', dur: 1.6, start: 1.0 } }, tgs: [] }) };
  SCEN.doom = { period: 14, pose: 'call', poseFrom: 0.2, poseTo: 1.6, echo: { x: -180, y: -170 },
    pos: (i, tt) => { if (i !== 0) return [HEROES[i][1], HEROES[i][2]]; const a = [-250, 170], l = [-220, 150], d = [120, 230]; if (tt < 3.2) return a; if (tt < 4.6) { const q = sm(c01((tt - 3.2) / 1.4)); return [lerpv(a[0], l[0], q), lerpv(a[1], l[1], q)]; } const q = sm(c01((tt - 4.6) / 3.2)); return [lerpv(l[0], d[0] - 40, q), lerpv(l[1], d[1], q)]; },
    extra: tt => ({ doom: new Map(tt >= 0.5 && tt < 8.2 ? [[1, { start: 0.5, end: 13.5 }]] : []), lanterns: tt >= 2.8 && tt < 8.3 ? [{ id: 1, x: -220, y: 150, carrier: tt >= 4.6 ? 0 : null, last: false }] : [] }),
    build: () => ({ ev: { 'svecho:1': { who: 'hollowking', sig: 3, x: -180, y: -170, start: 0.05, dur: -1 }, 'svechoact:1': { anim: 'bell', dur: 1.6, start: 0.2 }, 'svlantern:1': { sig: 3, x: -220, y: 150, fly: 1.1, dur: 18, start: 1.7 } }, tgs: [] }) };
  SCEN.replay = { period: 9, pose: '', extra: () => ({ knights: new Map([[1, { x: -156, y: 308 }], [2, { x: 156, y: -428 }]]) }),
    build: () => ({ ev: {}, tgs: [{ tag: 'svReplay', type: 'aoe', start: 0.4, dur: 3.2, shape: { kind: 'rect', x: BOSS0.x, y: BOSS0.y, angle: 0.4, len: 1300, w: 2600 } }] }) };
  SCEN.tithe = { period: 14, pose: 'call', poseFrom: 0.2, poseTo: 4,
    build: () => ({ ev: { tithe: { start: 0.8, dur: 0 } }, tgs: [{ tag: 'svDirge', type: 'raidwide', start: 3.2, dur: 5, shape: { kind: 'circle', x: 0, y: 0, r: 0 }, hidden: true }] }) };
  SCEN.burnback = { period: 15, pose: '', form: tt => (tt >= 0.7 ? 'sovereign:forge' : 'sovereign'), act: tt => (tt >= 0.4 ? 2 : 1),
    build: () => ({ ev: { svact: { act: 2, start: 0.4, dur: 9999 } }, tgs: [] }) };
  // FX2: the first half of Act II on the forge floor. The same maths as the S2a script (sheets of 150, glassWave, the dive's line); dyn(tt, scen) adds the
  // events that change while it plays (the sunk sheets); adds(tt) are the standing heads, drawn with the game's own ADD_ART['hy-flame'].
  const FORGE = { form: () => 'sovereign:forge', act: () => 2 };
  const sheetList = () => { const o = []; for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) if (Math.hypot(i * SHW, j * SHW) <= 500) o.push([i * SHW, j * SHW]); return o; };
  const mkWave = (fx, fy, reach) => {
    const fcx = Math.round(fx / SHW) * SHW, fcy = Math.round(fy / SHW) * SHW, s = [];
    for (const [cx, cy] of sheetList()) { const dd = Math.hypot(cx - fcx, cy - fcy) / SHW; if (dd <= reach + 1e-6) s.push([cx, cy, +(2.6 + Math.round(dd * 2) / 2 * 0.8).toFixed(2)]); }
    return { foot: [fcx, fcy], s: s.sort((a, b) => a[2] - b[2]) };
  };
  const sheetTg = (s, st) => ({ tag: 'svGlass', type: 'aoe', start: st, dur: s[2], ghost: 1, shape: { kind: 'rect', x: s[0] - SHW / 2, y: s[1], angle: 0, len: SHW, w: SHW } });
  const sheetClip = (a, b, s) => {
    let t0 = 0, t1 = 1; const h = SHW / 2;
    for (const [p, d, lo, hi] of [[a.x, b.x - a.x, s[0] - h, s[0] + h], [a.y, b.y - a.y, s[1] - h, s[1] + h]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
      let u0 = (lo - p) / d, u1 = (hi - p) / d; if (u0 > u1) [u0, u1] = [u1, u0]; t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
    }
    return t0 < t1 ? [t0, t1] : null;
  };
  SCEN.glass = { period: 15, pose: 'call', poseFrom: 0.05, poseTo: 1.6, form: FORGE.form, act: FORGE.act, extra: () => ({}),
    build: () => { const w = mkWave(300, 0, 3); return { ev: { 'svglass:1': { foot: w.foot, w: SHW, s: w.s, dur: w.s[w.s.length - 1][2] + 2, start: 0.4 } }, tgs: w.s.map(s => sheetTg(s, 0.4)), wave: w }; },
    dyn: (tt, b) => { const sunk = b.wave.s.filter(s => 0.45 + s[2] <= tt); return { svsheets: { w: SHW, sunk: sunk.map(s => [s[0], s[1]]), dur: 9999, start: sunk.length ? 0.45 + sunk[sunk.length - 1][2] : 0 } }; } };
  SCEN.sunk = { period: 10, pose: '', form: FORGE.form, act: FORGE.act, extra: () => ({}),
    build: () => { const w = mkWave(-150, 150, 2); return { ev: { svsheets: { w: SHW, sunk: w.s.filter((s, i) => i % 3 !== 2).map(s => [s[0], s[1]]), dur: 9999, start: 0.05 } },
      tgs: [{ tag: 'svTest', type: 'aoe', start: 0.4, dur: 9, shape: { kind: 'circle', x: -150, y: 150, r: 100 } }] }; } };
  SCEN.heads = { period: 22, pose: 'call', poseFrom: 0.05, poseTo: 1.4, form: FORGE.form, act: FORGE.act, extra: () => ({}),
    build: () => {
      const tgs = [], bite = (st, id) => tgs.push({ tag: 'svBite', type: 'aoe', start: st, dur: 2, target: id, shape: { kind: 'circle', x: HEROES[id][1], y: HEROES[id][2], r: 100 } });
      bite(8, 2); bite(11.6, 0);
      return { ev: {
        'svhead:1': { x: 240, y: -240, rise: 1.6, dur: 9999, start: 0.4 }, 'svhead:2': { x: -240, y: -240, rise: 2.2, dur: 9999, start: 4.4 },
        'svbite:1': { head: 1, x: 240, y: -240, id: 2, dur: 2.8, start: 8 }, 'svbite:2': { head: 2, x: -240, y: -240, id: 0, dur: 2.8, start: 11.6 },
        'svcut:1': { x: 240, y: -240, order: 1, dur: 9999, start: 15.4 }, 'svcut:2': { x: -240, y: -240, order: 2, dur: 9999, start: 18 } }, tgs };
    },
    adds: tt => { const o = []; if (tt >= 2.0 && tt < 15.4) o.push({ x: 240, y: -240 }); if (tt >= 6.6 && tt < 18) o.push({ x: -240, y: -240 }); return o.map(h => Object.assign(h, { ang: Math.atan2(h.y, h.x) })); } };
  SCEN.dive = { period: 17, pose: 'call', poseFrom: 0.05, poseTo: 1.4, form: FORGE.form, act: FORGE.act, extra: () => ({}),
    build: () => {
      const R = RR(), sp = i => { const a = (-90 + i * 120) * Math.PI / 180; return { x: Math.round(Math.cos(a) * 0.52 * R), y: Math.round(Math.sin(a) * 0.52 * R) }; };
      const L = sp(1), P = sp(2), ap = Math.atan2(P.y, P.x), E = { x: Math.round(Math.cos(ap) * (R + 40)), y: Math.round(Math.sin(ap) * (R + 40)) };
      const ang = +Math.atan2(L.y - E.y, L.x - E.x).toFixed(3), len = Math.round(Math.hypot(L.x - E.x, L.y - E.y)), w = mkWave(-150, 150, 2), cross = [];
      for (const s of w.s) { const q = sheetClip(E, L, s); if (!q || (q[1] - q[0]) * len < 40) continue; const m = (q[0] + q[1]) / 2; cross.push([s[0], s[1], Math.round(E.x + (L.x - E.x) * m), Math.round(E.y + (L.y - E.y) * m)]); }
      const st = 0.4, at = 5.4, tgs = [
        { tag: 'svDiveLand', type: 'aoe', start: st, dur: at, shape: { kind: 'circle', x: L.x, y: L.y, r: 120 } },
        { tag: 'svDivePath', type: 'aoe', start: st + 1.3, dur: at - 1.3, shape: { kind: 'rect', x: E.x, y: E.y, angle: ang, len, w: 140 } },
        { tag: 'svAfter', type: 'aoe', start: st + at + 0.43, dur: 2.8, shape: { kind: 'donut', x: L.x, y: L.y, r: 1400, r2: 240 } }];
      for (const q of cross) tgs.push({ tag: 'svSteam', type: 'aoe', start: st + at + 1.0, dur: 3.6, shape: { kind: 'circle', x: q[2], y: q[3], r: 85 } });
      return { ev: { svsheets: { w: SHW, sunk: w.s.map(s => [s[0], s[1]]), dur: 9999, start: 0.05 }, 'svdive:1': { x1: E.x, y1: E.y, x2: L.x, y2: L.y, at, fly: 1.4, boil: cross.map(q => q.slice()), dur: at + 7, start: st } }, tgs };
    } };
  // FX3: Azerath's Twin Brands, the wall (The Heart Remembers) and Rebirth, on the forge floor (Rebirth ends on the crater). The messages are the ones sovereign.js sends.
  // pos(i, tt) moves the heroes; follow: a circle that follows a hero until 0.8 s before it lands (as the spread's).
  const mv = (i, tt, from, to, t0, t1) => { const q = sm(c01((tt - t0) / (t1 - t0))); return [lerpv(from[0], to[0], q), lerpv(from[1], to[1], q)]; };
  const twinEv = (el, wall, rule, at, start, o = {}) => Object.assign({ el, wall, x: Math.round(Math.cos(wall * Math.PI / 180) * 380), y: Math.round(Math.sin(wall * Math.PI / 180) * 380), rule, ids: [0, 1], corners: null, r: rule === 'pair' ? 150 : 290, at, shift: 0, from: null, dur: at + 1.5, start }, o);
  SCEN.twinmeet = { period: 13, pose: 'call', poseFrom: 0.05, poseTo: 1.6, form: FORGE.form, act: FORGE.act, extra: () => ({}),
    pos: (i, tt) => i === 0 ? mv(i, tt, [HEROES[0][1], HEROES[0][2]], [330, 40], 1.2, 6.0) : i === 1 ? mv(i, tt, [HEROES[1][1], HEROES[1][2]], [420, -30], 1.5, 6.2) : [HEROES[i][1], HEROES[i][2]],
    build: () => ({ ev: { 'svtwin:1': twinEv('frost', 0, 'pair', 7, 0.4) }, tgs: [{ tag: 'svMeet', type: 'stack', start: 0.4, dur: 7, shape: { kind: 'circle', x: 380, y: 0, r: 150 } }] }) };
  SCEN.twinflee = { period: 12, pose: 'call', poseFrom: 0.05, poseTo: 1.6, form: FORGE.form, act: FORGE.act, extra: () => ({}),
    pos: (i, tt) => i === 0 ? mv(i, tt, [HEROES[0][1], HEROES[0][2]], [-255, 255], 1.2, 6.0) : i === 1 ? mv(i, tt, [HEROES[1][1], HEROES[1][2]], [255, 255], 1.2, 6.0) : [HEROES[i][1], HEROES[i][2]],
    build: () => ({ ev: { 'svtwin:1': twinEv('fire', -90, 'split', 7, 0.4, { corners: [[255, 255], [-255, 255]] }) }, tgs: [
      { tag: 'svBloom', type: 'aoe', start: 0.4, dur: 7, shape: { kind: 'circle', x: 0, y: -380, r: 290 } },
      { tag: 'svTwin', type: 'spread', start: 0.4, dur: 7, target: 0, follow: 0, shape: { kind: 'circle', x: HEROES[0][1], y: HEROES[0][2], r: 125 } },
      { tag: 'svTwin', type: 'spread', start: 0.4, dur: 7, target: 1, follow: 1, shape: { kind: 'circle', x: HEROES[1][1], y: HEROES[1][2], r: 125 } }] }) };
  SCEN.twinshift = { period: 14, pose: 'call', poseFrom: 0.05, poseTo: 1.6, form: FORGE.form, act: FORGE.act, extra: () => ({}),
    pos: (i, tt) => i === 0 ? (tt < 3.2 ? mv(i, tt, [HEROES[0][1], HEROES[0][2]], [-60, 60], 1.0, 3.0) : mv(i, tt, [-60, 60], [330, 30], 3.4, 7.4)) : i === 1 ? (tt < 3.2 ? mv(i, tt, [HEROES[1][1], HEROES[1][2]], [100, 140], 1.0, 3.0) : mv(i, tt, [100, 140], [420, -30], 3.4, 7.4)) : [HEROES[i][1], HEROES[i][2]],
    build: () => ({ ev: { 'svtwin:1': twinEv('void', 180, 'split', 7.8, 0.4, { corners: [[255, -255], [255, 255]] }) }, tgs: [{ tag: 'svMeet', type: 'stack', start: 3.2, dur: 5, shape: { kind: 'circle', x: 380, y: 0, r: 150 } }] }),
    dyn: tt => tt >= 3.2 ? { 'svtwin:1': twinEv('frost', 0, 'pair', 5, 3.2, { shift: 1, from: 'void' }) } : {} };
  SCEN.twinwalls = { period: 16, pose: '', form: FORGE.form, act: FORGE.act, extra: () => ({}),
    pos: i => i === 0 ? [-120, 70] : i === 1 ? [110, 130] : [HEROES[i][1], HEROES[i][2]],
    build: () => ({ ev: {}, tgs: [] }),
    dyn: tt => { const i = Math.floor(tt / 4) % 4, el = ['fire', 'frost', 'bolt', 'void'][i]; return { 'svtwin:1': twinEv(el, [-90, 0, 90, 180][i], i % 3 === 0 ? 'split' : 'pair', 3.6, i * 4 + 0.2, { dur: 5 }) }; } };
  const HEADS = [[240, -240], [-240, -240], [-340, 0]];
  const heartScen = full => {
    const first = full ? 4.0 : 0.5, gap = 2.7, ps = full ? HEADS.map((h, i) => [h[0], h[1], +(first + i * gap).toFixed(2), 0]) : [[HEADS[0][0], HEADS[0][1], first, 0]], last = ps[ps.length - 1][2], sweep = last + 1.0, kind = sweep + 3.6 + 0.8, end = kind + 3.4 + 0.1, s0 = 0.4;
    const ev = { svact: { act: 2, start: -30, dur: 9999 }, svheart: { n: ps.length, pillars: ps, sweep, kindling: kind, end, r: 150, dur: end + 1, start: s0 }, svseal: { broken: 1, dur: 3, start: s0 + end } }, tgs = [];
    ps.forEach((p, i) => { const st = s0 + p[2] - 2.2; ev['svpillar:' + (i + 1)] = { head: i + 1, x: p[0], y: p[1], order: i + 1, live: 0, r: 150, at: 2.2, dur: 3.4, start: st }; ev['svcut:' + (i + 1)] = { x: p[0], y: p[1], order: i + 1, dur: 9999, start: 0.05 }; tgs.push({ tag: 'svPillar', type: 'aoe', start: st, dur: 2.2, ghost: 1, shape: { kind: 'circle', x: p[0], y: p[1], r: 150 } }); });
    tgs.push({ tag: 'svSweep', type: 'aoe', start: s0 + sweep, dur: 3.6, shape: { kind: 'rect', x: BOSS0.x, y: BOSS0.y, angle: 0.4, len: 1300, w: 2600 } });
    tgs.push({ tag: 'svKindling', type: 'raidwide', start: s0 + kind, dur: 3.4, shape: { kind: 'circle', x: 0, y: 0, r: 0 } });
    return { ev, tgs };
  };
  SCEN.heart = { period: 25, pose: '', form: FORGE.form, act: FORGE.act, extra: () => ({}), build: () => heartScen(true) };
  SCEN.shatter = { period: 10, pose: '', form: FORGE.form, act: FORGE.act, extra: () => ({}), build: () => heartScen(false) };
  SCEN.rebirth = { period: 16, pose: 'rebirth', poseFrom: 8.9, poseTo: 12.3, lit: 0xf00, form: tt => (tt >= 5.3 ? 'sovereign:crater' : 'sovereign:forge'), act: tt => (tt >= 5.3 ? 3 : 2), artForm: tt => (tt >= 5.3 ? 'crater' : 'forge'), wheel: tt => (tt >= 4.3 ? 1 : 0), extra: () => ({ lit: 0xf00 }),
    build: () => { const ev = { svact: { act: 2, start: -30, dur: 9999 }, svrebirth: { dark: [2.5, 4.0], halo: 4.0, crater: 5.0, choir: 6.0, dur: 12, start: 0.3 } }; HEADS.forEach((h, i) => { ev['svcut:' + (i + 1)] = { x: h[0], y: h[1], order: i + 1, dur: 9999, start: 0.05 }; }); return { ev, tgs: [{ tag: 'svRebirth', type: 'raidwide', start: 0.3, dur: 12.05, hidden: true, shape: { kind: 'circle', x: 0, y: 0, r: 0 } }] }; },
    dyn: tt => tt >= 5.3 ? { svact: { act: 3, start: 5.3, dur: 9999 } } : {} };
  // FX4: Act III on the crater floor (the messages are the ones sovereign.js sends: the S3a contract). The echoes are stand-ins (their real bodies are ult-echo.js's); the
  // dashed grey line on Corvane's stand-in is where the stance's gleam is taken to run.
  const CRATER = { form: () => 'sovereign:crater', act: () => 3, artForm: () => 'crater', wheel: () => 1, lit: 0xf00, extra: () => ({ lit: 0xf00 }) };
  const CVP = { x: -232, y: 62 }, CVF = +Math.atan2(-CVP.y, -CVP.x).toFixed(2), CAEL = { x: -104, y: -386 };
  const cvEv = () => ({ 'svecho:1': { who: 'corvane', x: CVP.x, y: CVP.y, face: CVF, start: 0.05, dur: -1 } });
  const toWall = (x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a), b = x * dx + y * dy, cc = x * x + y * y - RR() * RR(); return -b + Math.sqrt(Math.max(0, b * b - cc)); };
  const rectTg = (tag, a, b, w, st, dur, ghost) => ({ tag, type: 'aoe', start: st, dur, ghost: ghost ? 1 : 0, shape: { kind: 'rect', x: a.x, y: a.y, angle: +Math.atan2(b.y - a.y, b.x - a.x).toFixed(3), len: Math.round(Math.hypot(b.x - a.x, b.y - a.y)), w } });
  const cvStand = [{ who: 'corvane', x: CVP.x, y: CVP.y, face: CVF, col: '#8fe0ff' }];
  SCEN.stance = Object.assign({}, CRATER, { period: 15, pose: '', facing: 0, stand: () => cvStand,
    build: () => ({ ev: cvEv(), tgs: [] }),
    dyn: tt => ({ 'svechoact:1': { anim: ['crane', 'comet', 'parting'][Math.floor(tt / 5) % 3], dur: 9.2, start: Math.floor(tt / 5) * 5 + 0.8 } }) });
  SCEN.crescent = Object.assign({}, CRATER, { period: 14, pose: 'crescent', poseFrom: 2.7, poseTo: 7.5, facing: 0.08, stand: () => cvStand,
    build: () => {
      const B = BOSS0, a = Math.atan2(HEROES[2][2] - B.y, HEROES[2][1] - B.x), ac = a + Math.PI / 2, turn = Math.PI / 4, at = [3.4, 4.8], s0 = 2.6;
      const cone = (x, y, ang, dur) => ({ tag: 'svCrescent', type: 'aoe', start: s0, dur, ghost: 1, shape: { kind: 'cone', x, y, r: 1500, arc: 2.0, angle: +ang.toFixed(3) } });
      return { ev: Object.assign(cvEv(), { 'svechoact:1': { anim: 'crane', dur: 9.2, start: 0.4 }, 'svcrescent:1': { x: B.x, y: B.y, kx: CVP.x, ky: CVP.y, a: [+a.toFixed(3), +(a + turn).toFixed(3)], ka: [+ac.toFixed(3), +(ac + turn).toFixed(3)], arc: 2.0, at, dur: at[1] + 1.2, start: s0 } }),
        tgs: [cone(B.x, B.y, a, at[0]), cone(CVP.x, CVP.y, ac, at[0]), cone(B.x, B.y, a + turn, at[1]), cone(CVP.x, CVP.y, ac + turn, at[1])] };
    } });
  SCEN.lance = Object.assign({}, CRATER, { period: 12, pose: 'lance', poseFrom: 2.7, poseTo: 6.5, facing: 0, stand: () => cvStand,
    build: () => {
      const B = BOSS0, hp = i => ({ x: HEROES[i][1], y: HEROES[i][2] }), t1 = hp(0), t2 = hp(2), a1 = Math.atan2(t1.y - B.y, t1.x - B.x), a2 = Math.atan2(t2.y - CVP.y, t2.x - CVP.x), L1 = Math.round(toWall(B.x, B.y, a1)), L2 = Math.round(toWall(CVP.x, CVP.y, a2)), d = 3.6, d2 = 5.0, s0 = 2.6;
      const e1 = { x: Math.round(B.x + Math.cos(a1) * L1), y: Math.round(B.y + Math.sin(a1) * L1) }, e2 = { x: Math.round(CVP.x + Math.cos(a2) * L2), y: Math.round(CVP.y + Math.sin(a2) * L2) };
      return { ev: Object.assign(cvEv(), { 'svechoact:1': { anim: 'comet', dur: 9.2, start: 0.4 }, 'svlance:1': { l: [[B.x, B.y, e1.x, e1.y, d], [CVP.x, CVP.y, e2.x, e2.y, d2]], w: 150, dur: d2 + 1.2, start: s0 } }),
        tgs: [rectTg('svLance', B, e1, 150, s0, d, true), rectTg('svLance', CVP, e2, 150, s0, d2, true)] };
    } });
  SCEN.pyre = Object.assign({}, CRATER, { period: 13, pose: 'pyre', poseFrom: 2.7, poseTo: 8.5, facing: 0, stand: () => cvStand,
    build: () => {
      const m = HEROES.map(h => ({ x: h[1], y: h[2] })), n = m.length, lead = 3.4, step = 1.0, at = k => lead + k * step, s0 = 2.6, ss = [], cs = [], tgs = [];
      for (let k = 0; k < n; k++) {
        const sa = k === 0 ? BOSS0 : m[k - 1], sb = m[k], ca = k === 0 ? CVP : m[n - k], cb = m[n - 1 - k];
        ss.push([sa.x, sa.y, sb.x, sb.y, at(k)]); cs.push([ca.x, ca.y, cb.x, cb.y, at(k)]);
        tgs.push(rectTg('svPyre', sa, sb, 96, s0, at(k), true), rectTg('svPyre', ca, cb, 96, s0, at(k), true));
      }
      return { ev: Object.assign(cvEv(), { 'svechoact:1': { anim: 'parting', dur: 9.2, start: 0.4 }, 'svpyre:1': { m: m.map((q, i) => [q.x, q.y, i + 1]), s: ss, c: cs, from: [BOSS0.x, BOSS0.y], cfrom: [CVP.x, CVP.y], lead, step, dur: at(n) + 1.2, start: s0 } }), tgs };
    } });
  SCEN.dance = Object.assign({}, CRATER, { period: 14, pose: 'dance', poseFrom: 0.7, poseTo: 8.4, facing: 0, stand: tt => [{ who: 'caelum', x: CAEL.x, y: CAEL.y, face: Math.PI / 2, col: '#cfe0ff' }],
    build: () => {
      const R = 380, pts = [-90, 60, 210, 0, 150, 300].map(a => ({ x: Math.round(Math.cos(a * Math.PI / 180) * R), y: Math.round(Math.sin(a * Math.PI / 180) * R) })), n = pts.length, lead = 3.4, step = 0.65, s0 = 0.6, tgs = [], cs = [];
      let prev = { x: BOSS0.x, y: BOSS0.y };
      pts.forEach((q, i) => {
        const at = lead + (i + 1) * step; tgs.push(rectTg('svDance', prev, q, 96, s0, at, true));
        if (i >= n - 3) { const ra = { x: -prev.x, y: -prev.y }, rb = { x: -q.x, y: -q.y }; tgs.push(rectTg('svDance', ra, rb, 96, s0, at, true)); cs.push([ra.x, ra.y, rb.x, rb.y, i + 1]); }
        prev = q;
      });
      return { ev: { 'svdance:1': { l: pts.map((q, i) => { const nx = pts[i + 1]; return [q.x, q.y, i + 1, nx ? +Math.atan2(nx.y - q.y, nx.x - q.x).toFixed(2) : 0]; }), c: cs, from: [BOSS0.x, BOSS0.y], lead, step, dur: lead + n * step + 0.8, start: s0 } }, tgs };
    } });
  const WBUILT = {};
  function wheelBuilt(caught) {   // the S3a throw: from Brannoc's sigil toward (100, -200), three bounces 40 inside the rim, a catch point 30% down the line after the last
    if (WBUILT[caught]) return WBUILT[caught];
    const WH = { speed: 950, w: 130, fireW: 70, life: 7, r: 95, pad: 40, frac: 0.3, hold: 2 }, d = 4.6, s0 = 0.4, RW = RR() - WH.pad;
    const hit = (x, y, dx, dy) => { const b = x * dx + y * dy, cc = x * x + y * y - RW * RW; return -b + Math.sqrt(Math.max(0, b * b - cc)); };
    let x = -386, y = -104; const a = Math.atan2(-200 - y, 100 - x); let dx = Math.cos(a), dy = Math.sin(a); const pts = [[x, y]];
    for (let i = 0; i < 3; i++) { const t = hit(x, y, dx, dy); x += dx * t; y += dy * t; pts.push([x, y]); const nx = x / RW, ny = y / RW, dd = dx * nx + dy * ny; dx -= 2 * dd * nx; dy -= 2 * dd * ny; }
    { const [lx, ly] = pts[3], t = hit(lx, ly, dx, dy); pts.push([lx + dx * t * WH.frac, ly + dy * t * WH.frac]); }
    const last = pts.length - 1, along = [0], tgs = [], fire = [];
    for (let i = 1; i <= last; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tEnd = along[last] / WH.speed;
    for (let i = 1; i <= last; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax), run = i === last ? L - WH.r : L;
      for (let u0 = 0; run - u0 > 12;) { const u = Math.min(run, u0 + 260); tgs.push({ tag: 'svWheel', type: 'aoe', start: s0, dur: d + (along[i - 1] + u) / WH.speed, shape: { kind: 'rect', x: Math.round(ax + Math.cos(ang) * u0), y: Math.round(ay + Math.sin(ang) * u0), angle: +ang.toFixed(3), len: Math.round(u - u0), w: WH.w } }); u0 = u; }
      const ig = d + (i === last ? along[i] - WH.r : along[i]) / WH.speed, ln = Math.max(20, run - 8);
      fire.push([Math.round(ax), Math.round(ay), Math.round(ax + Math.cos(ang) * ln), Math.round(ay + Math.sin(ang) * ln), +ig.toFixed(2)]);
    }
    const [ex, ey] = pts[last].map(Math.round), tRes = d + tEnd + WH.hold;
    tgs.push({ tag: 'svCatch', type: 'tower', start: s0, dur: tRes, shape: { kind: 'circle', x: ex, y: ey, r: WH.r } });
    const ev = { 'svwheel:1': { l: pts.map(q => q.map(Math.round)), c: [[ex, ey]], sp: WH.speed, at: d, w: WH.w, r: WH.r, fire, fw: WH.fireW, life: WH.life, hold: WH.hold, dur: tRes + WH.life + 2, start: s0 } };
    if (caught) ev['svwallout:1'] = { dur: 1.5, start: s0 + tRes + 0.05 };
    return (WBUILT[caught] = { ev, tgs, ex, ey, tRes: s0 + tRes, end: s0 + d + along[last] / WH.speed + WH.life + 4.5 });
  }
  const wheelScen = caught => Object.assign({}, CRATER, { period: caught ? 17 : 21, pose: 'call', poseFrom: 0.2, poseTo: 4.6, facing: 0,
    stand: tt => (tt < 4.7 ? [{ who: 'brannoc', x: -386, y: -104, face: 0.3, col: '#e0a848' }] : []),
    pos: (i, tt) => { if (!caught || i !== 3) return [HEROES[i][1], HEROES[i][2]]; const w = wheelBuilt(true); return mv(i, tt, [HEROES[3][1], HEROES[3][2]], [w.ex, w.ey + 10], w.tRes - 4, w.tRes - 0.6); },
    build: () => { const w = wheelBuilt(caught); return { ev: w.ev, tgs: w.tgs }; } });
  SCEN.wheel = wheelScen(true);
  SCEN.wheelmiss = wheelScen(false);
  // FX5: Grace Withdrawn + Nightfall, Seeds of Ash and the holes, the saplings, Every Name (the peel into the square), the heat haze. The floor pieces (holes, paper, portal) come from
  // sovereign-rooms.js: sc.rooms(tt) hands its preview the holes and the peel; sc.extraEnt(tt) gives the saplings their positions (the real game finds them through entById).
  const sapPos = (h, st, tt, sp = 24) => { const b = BOSS0, dx = b.x - h.x, dy = b.y - h.y, D = Math.hypot(dx, dy) || 1, d = Math.max(0, tt - st - 1.5) * sp; return { x: Math.round(h.x + dx / D * d), y: Math.round(h.y + dy / D * d) }; };
  function sapStand(c, s, tt) {   // (a stand-in for Morrow-Oak's sapling add: a little dead tree with a gold flower)
    c.save(); c.translate(s.x, s.y); c.lineJoin = 'round';
    ellipse(c, 0, 8, 14, 5, 0, rgba(K.ink, 0.3));
    for (let i = 0; i < 4; i++) line(c, (i - 1.5) * 5, 2, (i - 1.5) * 9 + Math.sin(tt * 9 + i) * 3, 12, '#6a5a48', 3);
    poly(c, [-8, 6, -6.5, -8, -5, -18, 5, -18, 6.5, -8, 8, 6], '#4a3a2a', OUT, 2);
    line(c, -7, -8, -17, -16, '#5a4a38', 3); line(c, 7, -8, 17, -16, '#5a4a38', 3);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ellipse(c, Math.cos(a) * 5 + 0, -24 + Math.sin(a) * 5, 3.6, 2.2, a, '#f2c230', OUT, 1); }
    circle(c, 0, -24, 2.6, '#ff9a2a', OUT, 1);
    c.restore();
  }
  const SEED_H = [[-330, 60], [330, 120]], HOLE_AT = [[-330, 60], [330, 120], [-190, 150], [215, 215], [90, -250]];
  const seedHoleList = [{ id: 101, x: SEED_H[0][0], y: SEED_H[0][1], r: 80, t0: 6.6 }, { id: 102, x: SEED_H[1][0], y: SEED_H[1][1], r: 80, t0: 6.6 }];
  const seedPos = (i, tt) => i === 0 ? mv(i, tt, [HEROES[0][1], HEROES[0][2]], SEED_H[0], 0.8, 4.0) : i === 2 ? mv(i, tt, [HEROES[2][1], HEROES[2][2]], SEED_H[1], 0.8, 4.0) : [HEROES[i][1], HEROES[i][2]];
  SCEN.seeds = Object.assign({}, CRATER, { period: 17, pose: 'call', poseFrom: 0.1, poseTo: 1.8, facing: 0,
    pos: seedPos, rooms: () => ({ holes: seedHoleList }),
    extraEnt: tt => { const o = {}; seedHoleList.forEach((h, k) => { const st = 7 + 0.2 * k; if (tt >= st && !(k === 0 && tt >= 14.6)) o[11 + k] = sapPos(h, st, tt); }); return o; },
    saps: tt => { const o = []; seedHoleList.forEach((h, k) => { const st = 7 + 0.2 * k; if (tt >= st + 0.4 && !(k === 0 && tt >= 14.6)) o.push(sapPos(h, st, tt)); }); return o; },
    build: () => {
      const tgs = [0, 2].map(i => ({ tag: 'svSeed', type: 'aoe', start: 0.6, dur: 6, target: i, follow: i, lockAt: 1.6, shape: { kind: 'circle', x: HEROES[i][1], y: HEROES[i][2], r: 95 } }));
      const ev = { 'svseed:1': { ids: [0, 2], at: 6, lock: 1.6, r: 95, dur: 7, start: 0.6 } };
      seedHoleList.forEach((h, k) => { ev['svsapling:' + (k + 1)] = { id: 11 + k, x: h.x, y: h.y, hole: k + 1, speed: 24, dur: 45, start: 7 + 0.2 * k }; });
      ev['svsapdie:1'] = (() => { const p = sapPos(seedHoleList[0], 7, 14.6); return { x: p.x, y: p.y, dur: 2, start: 14.6 }; })();
      return { ev, tgs };
    } });
  SCEN.holes = Object.assign({}, CRATER, { period: 12, pose: '', facing: 0,
    rooms: () => ({ holes: HOLE_AT.slice(0, 4).map((p, i) => ({ id: 111 + i, x: p[0], y: p[1], r: 80, t0: 0.6 + 2.4 * i })) }),
    build: () => ({ ev: {}, tgs: [{ tag: 'svTest', type: 'aoe', start: 0.4, dur: 11, shape: { kind: 'circle', x: -190, y: 150, r: 70 } }] }) });
  SCEN.holes4 = { period: 12, pose: '', form: () => 'sovereign:square', act: () => 4, artForm: () => 'square', wheel: () => 1, lit: 0, extra: () => ({}),
    rooms: () => ({ act4: -30, holes: HOLE_AT.slice(0, 4).map((p, i) => ({ id: 121 + i, x: p[0], y: p[1], r: 80, t0: i < 2 ? -20 : 0.6 + 2.4 * (i - 2) })) }),
    build: () => ({ ev: { svact: { act: 4, start: -30, dur: 9999 } }, tgs: [{ tag: 'svTest', type: 'aoe', start: 0.4, dur: 11, shape: { kind: 'circle', x: -190, y: 150, r: 70 } }] }) };
  const SAPH = [{ x: -190, y: 150 }, { x: 215, y: 215 }], SAPA = 13.5;
  SCEN.sapling = Object.assign({}, CRATER, { period: 19, pose: '', facing: 0, lit: 0xb00,
    rooms: () => ({ holes: SAPH.map((h, i) => ({ id: 131 + i, x: h.x, y: h.y, r: 80, t0: -20 })) }),
    extraEnt: tt => { const o = {}; if (tt >= 0.4 && tt < 8.2) o[11] = sapPos(SAPH[0], 0.4, tt); if (tt >= 1.2 && tt < SAPA) o[12] = sapPos(SAPH[1], 1.2, tt); return o; },
    saps: tt => { const o = []; if (tt >= 0.8 && tt < 8.2) o.push(sapPos(SAPH[0], 0.4, tt)); if (tt >= 1.6 && tt < SAPA) o.push(sapPos(SAPH[1], 1.2, tt)); return o; },
    build: () => { const pa = sapPos(SAPH[0], 0.4, 8.2), pb = sapPos(SAPH[1], 1.2, SAPA);
      return { ev: { 'svsapling:1': { id: 11, x: SAPH[0].x, y: SAPH[0].y, hole: 1, speed: 24, dur: 45, start: 0.4 }, 'svsapling:2': { id: 12, x: SAPH[1].x, y: SAPH[1].y, hole: 2, speed: 24, dur: 45, start: 1.2 },
        'svsapdie:1': { x: pa.x, y: pa.y, dur: 2, start: 8.2 }, 'svsaparr:2': { x: pb.x, y: pb.y, dur: 3, start: SAPA }, 'svrecall:1': { sig: 10, who: 'morrowoak', dur: 8, start: SAPA + 0.9 } }, tgs: [] }; } });
  const hpAt = (i, tt) => tt < 2.0 ? 100 : tt < 6 + i * 1.5 ? 1 : lerpv(1, 100, c01((tt - (6 + i * 1.5)) / 1.6));
  SCEN.grace = Object.assign({}, CRATER, { period: 16, pose: 'call', poseFrom: 0.05, poseTo: 4.5, facing: 0,
    extra: tt => ({ lit: 0xf00, party: new Map(HEROES.map((h, i) => [i, { hp: hpAt(i, tt), maxHp: 100, alive: true }]))}),
    build: () => ({ ev: { svgrace: { dur: 8, start: 2.0 } }, tgs: [{ tag: 'svNight', type: 'raidwide', start: 2.0, dur: 8, hidden: true, shape: { kind: 'circle', x: 0, y: 0, r: 0 } }] }) });
  const PTL = () => { const a = -0.62, r = RR() * 0.74; return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) }; };
  const PEEL_HOLES = [{ id: 141, x: -190, y: 150, r: 80, t0: -20 }, { id: 142, x: 215, y: 215, r: 80, t0: -20 }, { id: 143, x: -330, y: -110, r: 80, t0: -20 }];
  SCEN.peel = { period: 15, pose: '', facing: 0, form: tt => (tt < 0.3 ? 'sovereign:crater' : 'sovereign:square'), act: tt => (tt < 0.3 ? 3 : 4), artForm: tt => (tt < 0.3 ? 'crater' : 'square'), wheel: () => 1, lit: 0, extra: () => ({}),
    echo: PTL(), echoAt: 0.4, echoRise: 2.3, echoFace: Math.atan2(-PTL().y, -PTL().x),
    rooms: () => ({ peel: { at: 0.3 }, holes: PEEL_HOLES }),
    build: () => { const P = PTL(); return { ev: { svact: { act: 4, start: 0.3, dur: 9999 }, 'svecho:1': { who: 'hollowking', sig: 3, x: P.x, y: P.y, fly: 0, rise: 2.3, dur: -1, face: +Math.atan2(-P.y, -P.x).toFixed(2), kneel: 0, start: 0.4 }, 'svechoact:1': { anim: 'lantern', dur: 9999, start: 0.4 } }, tgs: [] }; } };
  // the Grace Withdrawn hold on the Sunwheel's walls: the grace lands (3.2 s) before the walls light; they light only after the hold (8.6 s later) and burn their life on
  SCEN.wheelhold = Object.assign({}, wheelScen(false), { period: 32, build: () => { const w = wheelBuilt(false); return { ev: Object.assign({}, w.ev, { svgrace: { dur: 8, start: 3.2 } }), tgs: w.tgs }; } });
  SCEN.haze = { period: 10, pose: '', form: () => 'sovereign:crater', act: () => 3, artForm: () => 'crater', wheel: () => 1, lit: 0xf00, extra: () => ({}),
    build: () => ({ ev: { svact: { act: 3, start: -30, dur: 9999 } }, tgs: [] }) };
  // FX6: Act IV on the square (the lantern's hand-over, the kill, Emberfall, the wipe). The echoes of the kill are ult-echo.js's (sc.echoes: the preview calls ULT_ECHO.floor).
  const SQ = { form: () => 'sovereign:square', act: () => 4, artForm: () => 'square', wheel: () => 1, lit: 0, extra: () => ({}) };
  const LF_ORDER = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 3];
  const sigPos = i => { const P = PTL(); if (i === 3) return [P.x, P.y, +Math.atan2(-P.y, -P.x).toFixed(2)]; if (i === 8) { const a8 = 8.5 / 12 * TAU - Math.PI / 2, x = Math.round(Math.cos(a8) * 240), y = Math.round(Math.sin(a8) * 240); return [x, y, +Math.atan2(-y, -x).toFixed(2)]; } const a = (i + 0.5) / 12 * TAU - Math.PI / 2; return [Math.round(Math.cos(a) * 400), Math.round(Math.sin(a) * 400), +(a + Math.PI).toFixed(2)]; };
  const LF0 = 0.6;   // (the svlie message's arrival)
  SCEN.lastflame = Object.assign({}, SQ, { period: 24, lit: 0, echoes: true,
    form: tt => (tt < LF0 + 10.4 ? 'sovereign:square' : 'sovereign:night'), act: tt => (tt < LF0 + 10.4 ? 4 : 'night'), rooms: () => ({ gut: LF0 + 0.3, ease: LF0 + 0.3, cool: LF0 + 10.4, holes: PEEL_HOLES, act4: -30 }), gutter: tt => c01((tt - LF0 - 0.3) / 8.5),
    extra: tt => { const P = PTL(); return { lanterns: tt >= LF0 + 9.3 ? [{ id: 2, x: P.x + 34, y: P.y + 18, carrier: null, last: true }] : [] }; },
    dyn: tt => (tt >= LF0 + 10.4 ? { svact: { act: 'night', start: LF0 + 10.4, dur: 9999 } } : {}),
    build: () => { const P = PTL(), face = +Math.atan2(-P.y, -P.x).toFixed(2); return { ev: { svact: { act: 4, start: -30, dur: 9999 }, 'svecho:1': { who: 'hollowking', sig: 3, x: P.x, y: P.y, fly: 0, rise: 2.3, dur: -1, face, kneel: 0, start: -20 },
      svlie: { order: LF_ORDER, step: 0.62, hk: 1.3, night: 10.4, echo: LF_ORDER.map(i => (i === 3 ? 1 : 0)), pos: LF_ORDER.map(sigPos), dur: 14, start: LF0 }, svgutter: { dur: 8.5, start: LF0 + 0.3 }, 'svechoact:1': { anim: 'liedown', dur: 9999, start: LF0 + 9.3 },
      'svhole:141': { id: 141, x: -190, y: 150, r: 80, start: -20, dur: 9999 }, 'svhole:142': { id: 142, x: 215, y: 215, r: 80, start: -20, dur: 9999 } }, tgs: [] }; } });
  SCEN.emberfall = Object.assign({}, SQ, { period: 12, pose: 'enrage', poseFrom: 0.1, poseTo: 8.6, lit: 0xfff, rooms: () => ({ holes: PEEL_HOLES, act4: -30 }),
    build: () => ({ ev: { svact: { act: 4, start: -30, dur: 9999 }, svemberfall: { seams: 0.8, ignite: 2.4, ash: 4.4, dur: 8, start: 0.5 } }, tgs: [] }) });
  SCEN.wipe = Object.assign({}, SQ, { period: 8, lit: 0, build: () => ({ ev: { svact: { act: 4, start: -30, dur: 9999 }, svwipe: { lit: 0xfff, enrage: 0, dur: 2.6, start: 0.8 } }, tgs: [] }) });
  SCEN.wipeburnt = Object.assign({}, SQ, { period: 8, lit: 0, build: () => ({ ev: { svact: { act: 4, start: -30, dur: 9999 }, svwipe: { lit: 0xfff, enrage: 1, dur: 2.6, start: 0.8 } }, tgs: [] }) });
  // Act IV's reused effects together, on the square with three holes: the two plates, the nine-pane glass patch round the holes, the wheel bouncing off a hole's rim, pass three's
  // Twin Brands read by charge, pass four's pillars at fresh places, and the lantern passing on cure (the first hero cured hands it to the second)
  SCEN.act4 = Object.assign({}, SQ, { period: 16, pose: 'call', poseFrom: 0.1, poseTo: 1.4, rooms: () => ({ holes: PEEL_HOLES, act4: -30 }),
    pos: (i, tt) => (i === 1 ? mv(i, tt, [HEROES[1][1], HEROES[1][2]], [-236, 196], 2.0, 6.0) : [HEROES[i][1], HEROES[i][2]]),
    extra: tt => ({ pol: new Map([[0, 1], [1, -1], [2, 1], [3, -1]]), lanterns: [{ id: 1, x: -250, y: 170, carrier: tt < 6.4 ? 0 : 1, last: true }], doom: new Map(tt < 6.4 ? [[1, { start: 0.3, end: 12 }]] : []) }),
    build: () => {
      const w = mkWave(150, 100, 1.5), tgs = w.s.map(q => sheetTg(q, 0.5)), ev = { svact: { act: 4, start: -30, dur: 9999 },
        'svflambe:1001': { plates: [[-300, -220], [250, 220]], at: [2.65, 5.65], r: 85, dur: 8.65, start: 0.5 },
        'svglass:1': { foot: w.foot, w: SHW, s: w.s, dur: w.s[w.s.length - 1][2] + 2, start: 0.5 },
        'svwheel:1': { l: [[-380, -110], [-250, 52], [300, -210], [410, 180]], c: [[410, 180]], sp: 950, at: 3.5, w: 130, r: 95, fire: [], fw: 70, life: 7, hold: 2, dur: 14, start: 7.0 },
        'svtwin:1': twinEv('frost', 0, 'pair', 6, 8.0, {}) };
      PEEL_HOLES.forEach(h => { ev['svhole:' + h.id] = { id: h.id, x: h.x, y: h.y, r: h.r, start: -20, dur: 9999 }; });
      [[-120, 330, 9.5], [260, -250, 11.0], [-330, -200, 12.5]].forEach((q, i) => { const st = q[2]; ev['svpillar:' + (i + 1)] = { head: i + 1, x: q[0], y: q[1], order: i + 1, live: 0, r: 150, at: 2.2, dur: 3.4, start: st }; tgs.push({ tag: 'svPillar', type: 'aoe', start: st, dur: 2.2, ghost: 1, shape: { kind: 'circle', x: q[0], y: q[1], r: 150 } }); });
      return { ev, tgs };
    } });
  function standIn(c, s, anim, env) {
    c.save(); c.translate(s.x, s.y); c.lineJoin = 'round';
    ellipse(c, 0, 6, 18, 7, 0, rgba(K.ink, 0.3));
    c.beginPath(); c.moveTo(-13, 4); c.lineTo(-10, -26); c.lineTo(0, -40); c.lineTo(10, -26); c.lineTo(13, 4); c.closePath(); c.fillStyle = rgba('#10121c', 0.9); c.fill(); c.strokeStyle = rgba(s.col, 0.9); c.lineWidth = 2; c.stroke();
    circle(c, 0, -46, 6, rgba(s.col, 0.9));
    c.restore();
    if (s.who === 'corvane' && anim && STANCE_LEN[anim]) { const B = bladesOf(env, s, anim); c.save(); c.setLineDash([4, 5]); c.beginPath(); c.moveTo(B.C0.x, B.C0.y); c.lineTo(B.C1.x, B.C1.y); c.strokeStyle = 'rgba(180,190,210,0.4)'; c.lineWidth = 1.5; c.stroke(); c.restore(); }
  }
  const tgFill = (tg, t) => { const c = tg.type === 'tower' || tg.type === 'stack' ? ['rgba(80,150,255,0.24)', '#5aa0ff'] : ['rgba(255,59,47,0.24)', '#ff3b2f']; return c; };
  function preview(cv, effect, t, o = {}) {
    const sc = SCEN[effect]; if (!sc || typeof SV_ROOMS === 'undefined') return false;
    const W = cv.width, H = cv.height, tt = o.loop === false ? t : t % sc.period, keep = S;
    let e = cv.__svFx;
    if (!e || e.effect !== effect) {
      const b = sc.build(); e = cv.__svFx = Object.assign(newState(), { effect, scen: b, objs: b.tgs.map((g, i) => Object.assign({ id: i + 1, live: Object.assign({}, g.shape), gone: null }, g)) });
    }
    if (tt < (e.pt ?? 0) - 0.5) { resetState(e); for (const g of e.objs) g.gone = null; }
    e.pt = tt;
    // the hall floor first (it also sets the ARENA the effects clip to), then everything at the same scale
    const rform = sc.form ? sc.form(tt) : 'sovereign'; SV_ROOMS.preview(cv, rform, sc.act ? sc.act(tt) : 1, tt, sc.rooms ? sc.rooms(tt) : {});
    const R = ARENA.r, half = R + 230, s = Math.min(W, H) / (2 * half), ctx = cv.getContext('2d');
    // the room and the telegraphs as the fight would have them
    const room = { ev: {}, props: [], floor: [] };
    for (const k in e.scen.ev) { const v = e.scen.ev[k]; if (tt >= v.start) room.ev[k] = Object.assign({}, v, { end: v.start + (v.dur || 0) }); }
    if (sc.dyn) { const d = sc.dyn(tt, e.scen); for (const k in d) room.ev[k] = Object.assign({ end: (d[k].start || 0) + (d[k].dur || 0) }, d[k]); }
    const tgs = new Map(), units = HEROES.map((h, i) => { const p = sc.pos ? sc.pos(i, tt) : [h[1], h[2]]; return { id: i, x: p[0], y: p[1], lift: 0 }; });
    let nextDur = 1e9;
    for (const g of e.objs) if (g.ghost && g.gone == null && tt < g.start + g.dur) nextDur = Math.min(nextDur, g.dur);
    for (const g of e.objs) {
      if (g.follow != null && tt < g.start + g.dur - (g.lockAt || 0.8) && units[g.follow]) { g.live.x = Math.round(units[g.follow].x); g.live.y = Math.round(units[g.follow].y); }
      if (g.gone == null && tt >= g.start + g.dur) g.gone = g.start + g.dur;
      if (tt >= g.start && (g.gone == null || tt <= g.gone + 0.25)) tgs.set(g.id, g);
    }
    const xs = sc.extraEnt ? sc.extraEnt(tt) : {};
    const env = Object.assign({ tgs, boss: sc.facing != null ? Object.assign({ facing: sc.facing }, BOSS0) : BOSS0, bossId: 'sovereign', entById: id => units[id] || xs[id] || null, roomS: SV_ROOMS.stateFor ? SV_ROOMS.stateFor(rform) : undefined, room, units, low: !!o.low, pol: new Map(), doom: new Map(), lanterns: [], knights: new Map() }, sc.extra ? sc.extra(tt) : {});
    if (sc.lit != null) env.lit = sc.lit;
    // the Sovereign on its own layer, then laid in
    let bl = cv.__svBoss; if (!bl || bl.width !== W) { bl = cv.__svBoss = document.createElement('canvas'); bl.width = W; bl.height = H; }
    bl.getContext('2d').clearRect(0, 0, W, H);
    const bossPose = sc.pose != null ? (tt > (sc.poseFrom || 0.4) && tt < (sc.poseTo || 4.6) ? sc.pose : '') : effect === 'kindling' ? 'kindling' : effect === 'brand' ? 'brand' : effect === 'sweep' ? 'sweep' : effect === 'ember' ? 'ember' : effect === 'scatter' ? 'scatter' : effect === 'turn' ? 'haloturn' : effect === 'flambe' || effect === 'web' ? 'call' : '';
    const k0 = (tgs.size || room.ev.svturn) ? 1 : 0;
    if (typeof __svArtPreview === 'function') __svArtPreview(bl, { t: tt, zoom: s * 1.2, clear: false, pose: bossPose && (sc.pose != null || (tt > 0.4 && tt < 4.6)) ? bossPose : '', lit: sc.lit != null ? sc.lit : effect === 'burnback' && tt >= 0.7 ? 0xff0 : 0xfff, gutter: sc.gutter ? sc.gutter(tt) : 0, wheel: sc.wheel ? sc.wheel(tt) : 0, form: sc.artForm ? sc.artForm(tt) : undefined });
    S = e;
    try {
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s);
      // the telegraph fills (what boss-tells.js would paint over our floor effects), under: our floor effects first
      if (sc.echoes && typeof ULT_ECHO !== 'undefined') { ULT_ECHO.hooks.boss = () => BOSS0; ULT_ECHO.S.frame = -1e9; ULT_ECHO.floor(ctx, room, tt); }
      const m0 = performance.now(); under(ctx, room, tt, env); cv.__svMs = (cv.__svMs || 0) + performance.now() - m0;   // (cv.__svMs: the ms our floor effects took, summed: for timing)
      for (const g of tgs.values()) { const [f, rim] = tgFill(g, tt); const p = c01((tt - g.start) / g.dur), land = g.gone != null, fa = (land ? 1 - c01((tt - g.gone) / 0.25) : 1) * (g.ghost && !land && g.dur - nextDur > 0.05 ? 0.3 : 1); ctx.save(); ctx.beginPath(); ARENA.trace(ctx, 4); ctx.clip(); SHAPES.trace(ctx, g.live); ctx.fillStyle = f.replace('0.24', String(0.1 + 0.18 * p)); ctx.globalAlpha = fa; ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
      ctx.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bl, 0, BOSS0.y * s); ctx.restore();
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s);
      for (const [i, [col]] of HEROES.entries()) { const x = units[i].x, y = units[i].y; ctx.beginPath(); ctx.ellipse(x, y + 14, 15, 6, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill(); circle(ctx, x, y - 8, 12, col, OUT, 2.5); }
      if (sc.adds && typeof drawAdd === 'function' && ADD_ART['hy-flame']) for (const h of sc.adds(tt)) drawAdd(ctx, 'hy-flame', h.x, h.y, h.ang, { t: tt, props: {} }, false, 1);
      if (sc.stand && tt > 0.1) { const an = room.ev['svechoact:1'] && room.ev['svechoact:1'].anim; for (const s of sc.stand(tt)) standIn(ctx, s, an, env); }
      if (sc.echo && tt > (sc.echoAt ?? 0.5)) ghostKnight(ctx, sc.echo.x, sc.echo.y, sc.echoFace ?? Math.PI / 2, c01((tt - (sc.echoAt ?? 0.5)) / (sc.echoRise ?? 0.6)) * 0.9, tt);
      if (sc.saps) for (const s of sc.saps(tt)) sapStand(ctx, s, tt);   // (a stand-in for the Hollow King's echo)
      const m1 = performance.now(); over(ctx, room, tt, env); cv.__svMs += performance.now() - m1;
      ctx.restore();
    } finally { S = keep; }
    return true;
  }
  if (typeof window !== 'undefined') window.__svFxPreview = preview;

  return { under, over, preview, EFFECTS: Object.keys(SCEN), SCEN, slowK, slow: SLOW };
})();
