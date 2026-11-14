// Garrow's moments (wall-fx.js' stage, and the room events and hooks of arena/bosses/garrow.js): never told in words, only felt.
// He has no wall and the script sends him no beat events of its own (he was built before the showpieces), so every moment here is staged from what he does send: the
// room events gwdrift / gwwipe, the mist he goes into (propfx gwmist), and the three presentation hooks of boss-vfx.js (GW_FX.intro / enrage / enrageLand / death, wrapped
// below). The fight is cold and quiet and he is a hunter, so each moment is built the same patient way: a build-up the player can feel coming, one held beat in which the
// sound is thinned almost to nothing and the floor is bare, then the release, big and short. Snow, ice blue, silver; the only warm colour is the lit windows of the town on
// the far shore, which the dark leaves lit alone.
//
//   THE ENTRANCE. He is the first thing down the Moon's road. The lake goes still; one paw print after another is pressed into the snow along the line of moonlight, from the south
//     edge toward the place where he will stand, each a little nearer (the prints and their soft thuds are the build-up); they stop one short of him and the lake holds its breath
//     (the held beat: the sound thinned, a cold dark gathering on the spot); then the mist comes up where the last print would be, the floor cracks out under it in a ring, and he is
//     there, the two moons of his eyes last (garrow-fx.js' intro, its beats moved later to follow the prints; boss-vfx.js hides his body until the mist is up).
//   THE WHITEOUT (the mid-fight set piece: Snowdrift, then The Long Chase). The flurry thickens over the cast (a cold closing in from the edges, the music drawn thin); at its end the
//     snow takes every track (the release of the wipe, a breath out, no flash); a short calm; then he is gone into the white (the first mist he goes into once the tracks are
//     wiped: THE CHASE BEGINS: the pale veil closes in from the edges over the whole chase, the music held low) and the last mist, where he comes out at his place again, ends it:
//     the veil lets go in one breath, a long low note from far off answers it, the music comes back.
//   THE ENRAGE (Cold Trail). The ice creeps in from every edge of the lake while one tone climbs; at the land the floor cracks across, the cold takes the lake and the room goes out.
//   THE KILL. He is called off, not destroyed (he is the Moon's hound; she sends for him, and Maelis rides him in the last of the set): the lake stills, the music stops, the clock stops;
//     the line of moonlight brightens along the road; the chain draws taut and he is drawn down it, thinning to mist and two small moons, south to the edge of the lake and out of it,
//     the road dimming behind him; the chain falls slack on the snow (garrow-fx.js leaves it there) and the town's windows are the last thing lit.
// Sound split: his casts and smaller moves are the sound lane's (bm-garrow-*, bm-garrow-m-*); the staged beats are this file's (bm-garrow-w-*, sfx-synth.js @@WALL-garrow), and the
// lake's bed (amb) is thinned in each held beat (Sound.duckBus, audio.js).
// Everything is drawn from the room's event times and this file's own clock (the game's `t` the room hooks hand it), so a rejoin replay (FX.muted) sees the room as it is by now
// and hears nothing: sounds, the camera, the music and the spawned particles only come from a live event.

(() => {
  if (typeof WallFx === 'undefined' || typeof ArenaView === 'undefined' || typeof GW_FX === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const smooth = q => { q = clamp01(q); return q * q * (3 - 2 * q); };
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const SNOW = '236,244,255', ICE = '159,208,255', DEEP = '4,10,26', WARM = '#ffb865', WARMH = '#ffe3ae';
  const ROAD = { x0: 78, y1: -70, x1: -6 };   // (garrow-room.js: the line of moonlight, from the south edge toward the middle)
  const SPOT = { x: 0, y: -120 };             // (where he stands: the script's spawn)

  const muted = () => typeof FX !== 'undefined' && !!FX.muted;
  const cam = (k, ...a) => { try { if (typeof FX !== 'undefined' && FX.cam && FX.cam[k]) FX.cam[k](...a); } catch (e) { /* cosmetic */ } };
  const bus = (...a) => { try { if (typeof Sound !== 'undefined' && Sound.duckBus) Sound.duckBus('amb', ...a); } catch (e) { /* cosmetic */ } };
  const mus = (k, ...a) => { try { if (typeof Sound !== 'undefined' && Sound.music && Sound.music[k]) Sound.music[k](...a); } catch (e) { /* (the music is only a mood) */ } };
  const play = (name, o) => { try { return typeof SoundHooks !== 'undefined' ? SoundHooks.play(name, Object.assign({ vol: 1, key: 'gww:' + name, minGap: 0.15 }, o)) : false; } catch (e) { return false; } };
  const shake = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); else if (typeof FX !== 'undefined') FX.shake = Math.max(FX.shake || 0, n); } catch (e) { /* cosmetic */ } };
  const ambOf = () => (ArenaView.amb && ArenaView.amb.kind === 'mere' ? ArenaView.amb : null);
  const clockNow = () => (GW_FX.S && GW_FX.S.lastT > 0 ? GW_FX.S.lastT : 0);

  // ---- the room's own state for the moments (one per raid: room objects are made fresh for each)
  const state = room => room.gww || (room.gww = { queue: [], introAsk: null, intro: null, drift: null, wipeAt: -99, chase: null, chaseEnd: null, enrage: null, land: null, fall: null, bd: null, chaseSeen: false });
  // the game clock's timers (the room's draw runs them): a Practice Hall slow-down or a stopped tab moves them with the picture; a late one is dropped, never piled up
  const later = (W, now, secs, fn) => { W.queue.push({ at: now + secs, fn }); };
  function runQueue(W, t) {
    if (!W.queue.length) return;
    const due = [], keep = [];
    for (const q of W.queue) (q.at <= t ? due : keep).push(q);
    W.queue = keep;
    for (const q of due) if (t - q.at < 0.6 && !muted()) { try { q.fn(); } catch (e) { /* cosmetic */ } }
  }

  // ================================================================== small drawn pieces
  const additive = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
  const rectClip = ctx => { const hw = ARENA.hw || 560, hh = ARENA.hh || 400; ctx.beginPath(); ctx.rect(-hw - 60, -hh - 60, 2 * hw + 120, 2 * hh + 120); ctx.clip(); };
  // a closing dark (or pale veil) from the edges of the lake toward a place: nothing but the floor is under it (the units and every warning are drawn over)
  function vignette(ctx, k, cx, cy, rIn, rOut, col = DEEP) {
    if (k <= 0.004) return;
    ctx.save(); rectClip(ctx);
    const hw = ARENA.hw || 560, hh = ARENA.hh || 400, g = ctx.createRadialGradient(cx, cy, Math.max(1, rIn), cx, cy, Math.max(rIn + 1, rOut));
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${Math.min(1, k)})`);
    ctx.fillStyle = g; ctx.fillRect(-hw - 60, -hh - 60, 2 * hw + 120, 2 * hh + 120); ctx.restore();
  }
  function jag(x0, y0, a, n, len, wob, seed) {
    const pts = [[x0, y0]]; let x = x0, y = y0, ang = a;
    for (let i = 0; i < n; i++) { ang += (hash(i + seed * 17, seed) - 0.5) * wob; x += Math.cos(ang) * len * (0.7 + 0.6 * hash(i, seed + 3)); y += Math.sin(ang) * len * (0.7 + 0.6 * hash(i + 5, seed + 1)); pts.push([x, y]); }
    return pts;
  }
  function crackSet(x0, y0, n, len, segs, seed) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + (hash(i, seed) - 0.5) * 0.35, L = len * (0.7 + 0.5 * hash(i, seed + 9));
      out.push({ pts: jag(x0, y0, a, segs, L / segs, 0.7, seed + i), w: 0.8 + hash(i, seed + 2) * 0.9 });
      if (hash(i, seed + 4) < 0.6) { const b = out[out.length - 1].pts, m = b[Math.floor(segs / 2)]; out.push({ pts: jag(m[0], m[1], a + (hash(i, seed + 5) < 0.5 ? 0.8 : -0.8), Math.ceil(segs * 0.45), L / segs * 0.8, 0.8, seed + i + 40), w: 0.55 }); }
    }
    return out;
  }
  // a set of cracks drawn grown to g (0-1) of its length, glow then core; k: how lit. In the ice: a dark core with a pale glow, never white.
  function drawCracks(ctx, set, g, k) {
    if (k <= 0.01 || g <= 0) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const c of set) {
      const n = c.pts.length - 1, upto = g * n;
      ctx.beginPath();
      for (let j = 0; j <= n && j <= upto + 1; j++) {
        let [x, y] = c.pts[j];
        if (j > upto) { const [px, py] = c.pts[j - 1], q = upto - (j - 1); x = px + (x - px) * q; y = py + (y - py) * q; }
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(${ICE},${0.22 * k})`; ctx.lineWidth = c.w * 5; ctx.stroke();
      ctx.strokeStyle = `rgba(6,14,34,${0.8 * k})`; ctx.lineWidth = c.w * 2.2; ctx.stroke();
      ctx.strokeStyle = `rgba(${SNOW},${0.7 * k})`; ctx.lineWidth = c.w * 0.8; ctx.stroke();
    }
    ctx.restore();
  }
  // one paw print pressed into the snow: a dark dent with a pale lip and four toes (a hound the size of a house)
  function paw(ctx, x, y, ang, sz, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const pad = (px, py, rx, ry) => { ctx.beginPath(); ctx.ellipse(px, py, rx * sz, ry * sz, 0, 0, TAU); ctx.fillStyle = `rgba(8,18,44,${0.46 * a})`; ctx.fill(); ctx.strokeStyle = `rgba(${SNOW},${0.62 * a})`; ctx.lineWidth = 1.8; ctx.stroke(); };
    pad(-2, 0, 15, 12); [[14, -11], [19, -4], [19, 4], [14, 11]].forEach(([px, py]) => pad(px, py, 6, 5));
    ctx.restore();
  }
  function frostEdge(ctx, k, seed) {   // the ice creeping in from the lake's edge: short bright spikes pointing inward, longer as k grows
    if (k <= 0.01) return;
    const hw = ARENA.hw || 560, hh = ARENA.hh || 400, N = 150;
    ctx.save(); rectClip(ctx); ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      const u = i / N, per = 2 * (2 * hw + 2 * hh), d = u * per;
      let x, y, nx, ny;
      if (d < 2 * hw) { x = -hw + d; y = -hh; nx = 0; ny = 1; } else if (d < 2 * hw + 2 * hh) { x = hw; y = -hh + (d - 2 * hw); nx = -1; ny = 0; } else if (d < 4 * hw + 2 * hh) { x = hw - (d - 2 * hw - 2 * hh); y = hh; nx = 0; ny = -1; } else { x = -hw; y = hh - (d - 4 * hw - 2 * hh); nx = 1; ny = 0; }
      const L = (18 + 110 * hash(i, seed)) * k, a = (0.3 + 0.5 * hash(i, seed + 2)) * k;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx * L + ny * (hash(i, seed + 3) - 0.5) * 24, y + ny * L + nx * (hash(i, seed + 3) - 0.5) * 24);
      ctx.strokeStyle = `rgba(60,96,176,${a * 0.7})`; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = `rgba(${SNOW},${a})`; ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.restore();
  }
  // the town's windows, kept lit through every dark (they are the one warm thing in the room)
  function windowsLit(ctx, k, t) {
    const am = ambOf(); if (!am || !am.windows || k <= 0.01) return;
    additive(ctx, () => { for (const wn of am.windows) { if (wn.x == null) continue; const tw = 0.86 + 0.1 * Math.sin(t * 1.3 + (wn.ph || 0)); glow(ctx, wn.x, wn.y, 20, WARM, 0.2 * k * tw); glow(ctx, wn.x, wn.y, 7, WARMH, 0.6 * k * tw); } });
  }

  // ================================================================== the live end
  // The Whiteout's own room events (arena/bosses/garrow.js): gwdrift { wo: 1 } the Snowdrift cast that opens it, gwwipe, gwhold (the calm after the wipe), gwchase (the hunts), gwchaseend.
  function onEvent(room, msg, now) {
    const k = msg.k, W = state(room), on = !muted();
    switch (k) {
      // ---------------------------------------------------------------- the whiteout
      case 'gwdrift': {
        W.drift = { t0: now, dur: msg.dur || 4.6 };
        const d = Math.max(2.4, (msg.dur || 4.6) - 1);   // (the cast: the wind climbs over it and the wipe ends it)
        if (on && (msg.dur || 4.6) >= 4) {
          if (msg.wo) { play('bm-garrow-w-drift', { vol: 0.9, key: 'gww:drift', rate: 3.6 / d }); mus('muffle', 1500, d * 0.9); mus('duck', 0.3, d); bus(0.25, d); cam('lean', 0.03, d * 0.8, 0.8, 1.2); }
          else { play('bm-garrow-w-drift', { vol: 0.55, key: 'gww:drift', rate: 3.6 / d }); mus('muffle', 1900, d * 0.8); cam('lean', 0.02, 2.6, 0.6, 1.2); }
        }
        break;
      }
      case 'gwwipe':
        W.wipeAt = now;
        if (on) { play('bm-garrow-w-wipe', { vol: 0.8, key: 'gww:wipe' }); mus('muffle', 0, 0.8); }
        break;
      case 'gwhold':   // the calm after the wipe: the wind is cut dead and the lake holds its breath
        if (on) { mus('muffle', 380, 0.12); mus('duck', 0.88, (msg.dur || 1.2) + 0.2); bus(0.92, (msg.dur || 1.2) + 0.2); cam('stop', 0.09); cam('lean', 0.025, msg.dur || 1.2, 0.3, 1.2); }
        break;
      case 'gwchase':  // he goes into the white
        if (on) { play('bm-garrow-w-vanish', { vol: 1, key: 'gww:vanish' }); mus('muffle', 1100, 1.2); mus('duck', 0.6, 3); bus(0.8, 3); cam('lean', 0.03, 0.8, 4, 1.4); }
        break;
      case 'gwchaseend':   // he is back at his place and the white lets go
        if (on) { play('bm-garrow-w-return', { vol: 1, key: 'gww:return' }); mus('muffle', 0, 0.6); later(W, now, 0.15, () => mus('swell', 0.28, 1.8)); cam('stop', 0.08); }
        break;
    }
  }

  // ================================================================== drawing (under the units: the room's own hook)
  function introDraw(ctx, t, W) {
    const I = W.intro; if (!I) return;
    const age = t - I.t0; if (age < 0 || age > 7.5) return;
    const am = ambOf(), by = am && am.by != null ? am.by : 430;
    const dx = ROAD.x1 - ROAD.x0, dy = ROAD.y1 - (by + 4), L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, ang = Math.atan2(uy, ux);
    // the prints, one every fifth of a second, each nearer: pressed in, then they hang, then the snow takes them back (gone by about five seconds)
    const N = 9, fade = 1 - smooth((age - 4.4) / 2.6);
    for (let i = 0; i < N; i++) {
      const tp = 0.2 + i * 0.2, q = clamp01((age - tp) / 0.22); if (q <= 0) continue;
      const u = 0.04 + (i / (N - 1)) * 0.82, side = i % 2 ? 1 : -1, x = ROAD.x0 + dx * u + nx * 17 * side, y = by + 4 + dy * u + ny * 17 * side;
      paw(ctx, x, y, ang, 1.5 + 0.5 * u, easeOut(q) * fade);
      if (q < 1) additive(ctx, () => glow(ctx, x, y, 34, `rgb(${SNOW})`, 0.2 * (1 - q)));
    }
    // the held beat (1.8 to 3.0 s): the lake closes in a little round the spot, the dark gathering on it
    const hold = smooth((age - 1.8) / 0.4) * (1 - smooth((age - 3.0) / 0.6));
    vignette(ctx, 0.34 * hold, SPOT.x, SPOT.y + 30, 190, 640);
    // the release (3.0 s): a flat ring out across the lake, the ice cracking out under it
    const ra = age - 3.0;
    if (ra > 0 && ra < 2.4) {
      if (!W.introCr) W.introCr = crackSet(SPOT.x, SPOT.y + 30, 9, 420, 7, 3);
      drawCracks(ctx, W.introCr, easeOut(clamp01(ra / 0.4)), (1 - smooth((ra - 0.4) / 1.8)) * 0.9);
      const q = ra / 1.0;
      if (q < 1) additive(ctx, () => {
        const r = 40 + 640 * easeOut(q), al = Math.pow(1 - q, 1.4);
        ctx.lineWidth = 12 * (1 - q * 0.5) + 2; ctx.strokeStyle = `rgba(${ICE},${0.24 * al})`; ctx.beginPath(); ctx.ellipse(SPOT.x, SPOT.y + 30, r, r * 0.66, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 3.4; ctx.strokeStyle = `rgba(${SNOW},${0.7 * al})`; ctx.stroke();
        glow(ctx, SPOT.x, SPOT.y + 20, 170 * (1 - q * 0.5), `rgb(${ICE})`, 0.3 * (1 - q));
      });
    }
  }
  // ---- the Whiteout: what it is to be inside one. Snow blows in from the whole lake and the wind climbs over the cast; the sight closes in to a small clear circle round each hero and everything
  // beyond it (the far shore, the reeds, the floor's own marks) goes to one flat storm-grey; the far windows go out one by one (garrow-room.js reads the same events). The wipe cuts the wind dead:
  // the calm, grey and still, the floor bare. Then he is gone into it and only the two moons of his eyes are left, and it holds like that until he is back. All of it lies UNDER the prints, the
  // units and every warning (GW_FX.under is wrapped below, so this is drawn first): nothing is hidden or dimmed that is not the floor itself.
  const FOG = '78,96,132';
  const WIND_DIR = Math.atan2(0.34, 0.94);
  // where the Whiteout stands at time t: { k: how closed in (0..1), wind: how hard it blows, hold: 1 in the calm, chase: he is in the white } or null
  function woPhase(ev, t) {
    const D = ev.gwdrift; if (!D || !D.wo || t < D.start) return null;
    const Tw = D.end - 1, Hd = ev.gwhold, Ch = ev.gwchase, Ce = ev.gwchaseend;
    let k, wind = 0, hold = 0;
    if (t < Tw) { const u = clamp01((t - D.start) / Math.max(0.5, Tw - D.start)); k = smooth(Math.pow(u, 1.15)); wind = u * u * (3 - 2 * u) * 0.5 + 0.5 * u * u * u * u; }
    else { k = 1; wind = Ch ? 0.1 : 0; }
    if (Hd && t >= Hd.start) hold = clamp01((t - Hd.start) / 0.12) * (1 - clamp01((t - Hd.end) / 0.4));
    let rel = null;
    if (Ce && t >= Ce.start) rel = (t - Ce.start) / 1.3;
    else if (!Ch && Hd && t > Hd.end + 2.5) rel = (t - Hd.end - 2.5) / 1.3;   // (no chase came: the white thins)
    if (rel != null) { if (rel > 1.05) return null; k *= 1 - smooth(rel); wind = Math.max(wind, 0.5 * (1 - rel) * (Ce ? 1 : 0)); }
    return { k, wind, hold, chase: !!(Ch && t >= Ch.start && !(Ce && t >= Ce.start)), T0: D.start, Tw };
  }
  function fogLayer(W, a) {
    if (typeof document === 'undefined') return null;
    const S = 0.3, w = Math.round(2 * a.bx * S), h = Math.round(2 * a.by * S);
    if (!W.fog || W.fog.cv.width !== w || W.fog.cv.height !== h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; W.fog = { cv, c: cv.getContext('2d'), S, ph: 0, last: null }; }
    return W.fog;
  }
  function whiteoutDraw(ctx, t, W, ev, v) {
    const P = W.fall ? null : woPhase(ev, t);
    // the wipe: a breath out (a pale front crossing the floor from the west, no flash)
    const wa = t - W.wipeAt;
    if (wa >= 0 && wa < 1.6) {
      const q = wa / 1.4, hw = ARENA.hw || 560, hh = ARENA.hh || 400, x = -hw + 2 * hw * easeOut(q) * 1.05;
      additive(ctx, () => { ctx.save(); rectClip(ctx); const g = ctx.createLinearGradient(x - 260, 0, x + 60, 0); g.addColorStop(0, `rgba(${SNOW},0)`); g.addColorStop(0.7, `rgba(${SNOW},${0.1 * (1 - q)})`); g.addColorStop(1, `rgba(${SNOW},0)`); ctx.fillStyle = g; ctx.fillRect(x - 260, -hh - 60, 320, 2 * hh + 120); ctx.restore(); });
    }
    // a lesser flurry's cold at the edges (Act III's single Snowdrift, Buried Scent's): the old vignette, kept small
    const D = ev.gwdrift;
    if (!P && D && !D.wo && W.drift && (D.end - D.start) >= 4) {
      const age = t - D.start, dur = D.end - D.start;
      if (age >= 0 && age < dur + 1.2) { const k = smooth(age / (dur * 0.8)) * (1 - smooth((age - dur) / 1.0)); vignette(ctx, 0.34 * k, SPOT.x, SPOT.y, 260, 760, '40,64,118'); frostEdge(ctx, 0.6 * k, 5); }
    }
    if (!P || P.k < 0.004) { if (W.fog) W.fog.last = null; return; }
    const am = ambOf(); if (!am) return;
    const F = fogLayer(W, am); if (!F) return;
    const { cv, c, S } = F, bx = am.bx, by = am.by, dt = F.last == null ? 0 : clamp01(t - F.last); F.last = t;
    F.ph += dt * (80 + 1500 * P.wind);   // (how far the wind has carried the snow)
    c.setTransform(S, 0, 0, S, bx * S, by * S);
    c.globalCompositeOperation = 'source-over'; c.clearRect(-bx, -by, 2 * bx, 2 * by);
    const A = 0.84 * smooth(clamp01(P.k * 1.25));
    c.fillStyle = `rgba(${FOG},${A})`; c.fillRect(-bx, -by, 2 * bx, 2 * by);
    // the snow driven through it (it stops dead with the wipe): long pale streaks along the wind
    const sa = clamp01(P.wind * 1.4) * (1 - P.hold);
    if (sa > 0.02) {
      const cw = Math.cos(WIND_DIR), sw = Math.sin(WIND_DIR), Wd = 2 * bx, Hd = 2 * by;
      c.lineCap = 'round';
      for (let i = 0; i < 150; i++) {
        const sp = 0.7 + 0.8 * hash(i, 4), L = (60 + 150 * hash(i, 5)) * (0.6 + 0.8 * P.wind), a = (0.25 + 0.5 * hash(i, 6)) * sa;
        const u = (hash(i, 1) * Wd + F.ph * sp * cw) % Wd, w2 = (hash(i, 2) * Hd + F.ph * sp * sw + 40 * Math.sin(t * 0.7 + i)) % Hd;
        const x = (u < 0 ? u + Wd : u) - bx, y = (w2 < 0 ? w2 + Hd : w2) - by;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - cw * L, y - sw * L); c.strokeStyle = `rgba(232,241,255,${a})`; c.lineWidth = 2.2 + 3 * hash(i, 7); c.stroke();
      }
    }
    // the sight: a clear circle round each hero (it breathes in the wind and is still in the calm), smaller the closer the white is
    const R0 = 1150 - 980 * easeOut(P.k);
    c.globalCompositeOperation = 'destination-out';
    let n = 0;
    for (const u of (v && v.units) || []) {
      const R = R0 * (1 + 0.04 * Math.sin(t * 2.1 + n * 1.7) * (1 - P.hold)); n++;
      const g = c.createRadialGradient(u.x, u.y, R * 0.2, u.x, u.y, R);
      g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.5, 'rgba(0,0,0,0.88)'); g.addColorStop(0.78, 'rgba(0,0,0,0.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(u.x - R, u.y - R, 2 * R, 2 * R);
    }
    c.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(cv, -bx, -by, 2 * bx, 2 * by); ctx.restore();
    // him, in the white: a pocket of dark behind the two moons of his eyes while he stands in it
    const b = v && v.boss;
    if (P.chase && b) { const q = smooth(clamp01((t - ev.gwchase.start) / 0.8)); glow(ctx, b.x, b.y - 10, 130, '#0b1630', 0.38 * q); }
  }
  function enrageDraw(ctx, t, W) {
    const E = W.enrage, L = W.land; if (!E) return;
    const age = t - E.t0; if (age < 0) return;
    const kb = smooth(age / E.dur);
    if (!L) { if (age > E.dur + 1.0) return; frostEdge(ctx, kb, 13); vignette(ctx, 0.34 * kb, SPOT.x, SPOT.y, 300 - 80 * kb, 760, '10,24,56'); return; }
    const la = t - L.t0; if (la < 0) return;
    if (la < 3.0) {
      if (!L.cr) L.cr = crackSet(0, 0, 13, 760, 9, 31);
      drawCracks(ctx, L.cr, easeOut(clamp01(la / 0.5)), (1 - smooth((la - 0.6) / 2.2)) * 0.95);
    }
    frostEdge(ctx, 1 - smooth(la / 2.0) * 0.4, 13);
    vignette(ctx, Math.min(0.9, 0.34 + 0.56 * smooth(la / 1.2)), SPOT.x, SPOT.y, 250 - 90 * smooth(la / 1.2), 740, '6,14,36');
    windowsLit(ctx, smooth(la / 1.2), t);
  }
  function fallDraw(ctx, t, W, ev) {
    const F = W.fall; if (!F) return;
    const age = t - F.t0; if (age < 0) return;
    const am = ambOf(), by = am && am.by != null ? am.by : 430, hw = ARENA.hw || 560;
    const x0 = F.x != null ? F.x : SPOT.x, y0 = F.y != null ? F.y : SPOT.y;
    const dx = ROAD.x0 - x0, dy = by + 40 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    // the lake stills and the dark closes in toward the road (the town is left lit)
    const k = smooth((age - 0.1) / 2.0);
    vignette(ctx, 0.88 * k, 0, 40, 300 - 130 * k, 760, '3,8,22');
    windowsLit(ctx, k, t);
    // the road brightens along its length as he is called down it, and dims behind him
    const q = clamp01((age - 0.9) / 2.8), head = easeOut(q) * 0.2 + q * q * 0.8;   // (slow to start, then drawn quickly)
    additive(ctx, () => {
      ctx.save(); rectClip(ctx); ctx.lineCap = 'round';
      const road = (w, a) => { ctx.strokeStyle = `rgba(${SNOW},${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ux * L, y0 + uy * L); ctx.stroke(); };
      const lit = smooth((age - 0.3) / 1.2) * (1 - smooth((age - 3.4) / 1.8));
      road(46, 0.06 * lit); road(16, 0.14 * lit); road(3.4, 0.5 * lit);
      // the chain drawn taut from him down the road to the head of the mist, a pale line with links
      if (q > 0 && q < 1) {
        const hx = x0 + ux * L * head, hy = y0 + uy * L * head, ta = Math.sin(Math.min(1, q * 1.4) * Math.PI * 0.5) * (1 - smooth((q - 0.8) / 0.2));
        ctx.strokeStyle = `rgba(${SNOW},${0.65 * ta})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x0, y0 + 30); ctx.lineTo(hx, hy); ctx.stroke();
        for (let i = 1; i < 14; i++) { const u = i / 14, px = x0 + (hx - x0) * u, py = y0 + 30 + (hy - y0 - 30) * u; ctx.fillStyle = `rgba(${SNOW},${0.5 * ta})`; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.fill(); }
        // the two small moons that were his eyes, going down the road; and the mist he is thinning into
        const w = 9 + 5 * (1 - q);
        for (const s of [-1, 1]) glow(ctx, hx + nx * s * w, hy + ny * s * w - 14, 15, `rgb(${SNOW})`, 0.75 * ta);
        glow(ctx, hx, hy, 70 * (1 - q * 0.5), `rgb(${ICE})`, 0.2 * ta);
      }
      ctx.restore();
    });
    // he goes out at the edge of the lake: a last ring, small
    const oa = age - 3.7;
    if (oa > 0 && oa < 1.4) additive(ctx, () => { const r = 20 + 130 * easeOut(oa / 1.2), al = Math.pow(1 - oa / 1.4, 1.5), ex = x0 + ux * L, ey = y0 + uy * L; ctx.lineWidth = 2.4; ctx.strokeStyle = `rgba(${SNOW},${0.6 * al})`; ctx.beginPath(); ctx.ellipse(ex, ey - 10, r, r * 0.6, 0, 0, TAU); ctx.stroke(); });
  }

  function underDraw(ctx, room, t, v) {
    const W = state(room), ev = room.ev || {};
    runQueue(W, t);
    if (v && v.boss) W.bd = v.boss;
    if (W.introAsk) {   // (BOSS_VFX.intro: his entrance begins now)
      const ask = W.introAsk; W.introAsk = null; W.intro = { t0: t }; W.introCr = null;
      if (!muted()) {
        play('bm-garrow-w-road', { vol: 0.9, key: 'gww:road' }); mus('muffle', 2400, 1.8); mus('duck', 0.6, 1.8); bus(0.8, 3);
        later(W, t, 1.8, () => { mus('muffle', 420, 0.2); mus('duck', 0.93, 1.3); bus(0.85, 1.3); play('bm-garrow-w-hold', { vol: 0.3, key: 'gww:hold' }); cam('lean', 0.03, 1.0, 0.5, 1.2); });
        later(W, t, 3.0, () => {
          play('bm-garrow-w-arrive', { vol: 1, key: 'gww:arrive' }); cam('stop', 0.1); cam('punch', 0.016, 0.7);
          mus('muffle', 0, 0.3); later(W, t + 3.0, 0.1, () => mus('swell', 0.3, 1.8));
          for (let i = 0; i < 16; i++) VFX.spawn({ x: SPOT.x + rand(-60, 60), y: SPOT.y + 30 + rand(-20, 20), z: rand(6, 40), vx: rand(-90, 90), vy: rand(-30, 30), vz: rand(40, 150), g: 120, drag: 0.04, life: rand(1.2, 2.2), size: rand(5, 11), size1: 1, color: '#e8f4ff', kind: 'glow', add: false, a: 0.7 });
        });
      }
    }
    introDraw(ctx, t, W);
    whiteoutDraw(ctx, t, W, ev, v);
    enrageDraw(ctx, t, W);
    fallDraw(ctx, t, W, ev);
  }

  // ================================================================== the hooks
  const roomEvent0 = ArenaView.roomEvent;
  const MOMENT_EV = { gwdrift: 1, gwwipe: 1, gwhold: 1, gwchase: 1, gwchaseend: 1 };
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = roomEvent0.call(this, room, msg, now, ...rest);
    try { if (room && room.ev && msg && typeof msg.k === 'string' && MOMENT_EV[msg.k]) onEvent(room, msg, now); } catch (e) { /* cosmetic */ }
    return r;
  };
  // every moment here lies UNDER the prints, the corridors and the units: garrow-fx.js' own under() (the prints) is wrapped so that this is drawn first
  const under0 = GW_FX.under;
  GW_FX.under = function (ctx, room, t, v) {
    if (room && ambOf()) { try { ctx.save(); underDraw(ctx, room, t, v); ctx.restore(); } catch (e) { ctx.restore(); if (!underDraw.warned) { underDraw.warned = true; console.warn('[garrow moments]', e); } } }
    return under0.apply(this, arguments);
  };
  // the presentation hooks of boss-vfx.js: garrow-fx.js' own are kept whole and the moment is laid beside them
  const liveW = () => { const room = ArenaView.liveRoom; return room && ambOf() ? state(room) : null; };
  const intro0 = GW_FX.intro;
  GW_FX.intro = function (sh, b, H) {
    try { const W = liveW(); if (W) W.introAsk = { b }; } catch (e) { /* cosmetic */ }
    // his own beats (the mist boiling up, the ring, the eyes) come after the road's prints and the held beat
    const SHIFT = 1.9, H2 = Object.assign({}, H, { soon: (s, d, fn) => H.soon(s, d + SHIFT, fn), emit: (s, dur, every, fn) => H.soon(s, SHIFT, () => H.emit(s, dur, every, fn)) });
    return intro0.call(this, sh, b, H2);
  };
  const enrage0 = GW_FX.enrage;
  GW_FX.enrage = function (sh, b, dur, H) {
    try {
      const W = liveW();
      if (W) { const t = clockNow(); W.enrage = { t0: t, dur }; W.land = null; if (!muted()) { play('bm-garrow-w-cold', { vol: 0.9, key: 'gww:cold' }); mus('muffle', 900, dur * 0.9); mus('duck', 0.4, dur); bus(0.5, dur); cam('lean', 0.03, dur * 0.7, 0.8, 1.4); } }
    } catch (e) { /* cosmetic */ }
    return enrage0.call(this, sh, b, dur, H);
  };
  const enrageLand0 = GW_FX.enrageLand;
  GW_FX.enrageLand = function (b, H) {
    try {
      const W = liveW();
      if (W && W.enrage) { const t = clockNow(); W.land = { t0: t }; if (!muted()) { play('bm-garrow-w-enrage-land', { vol: 1, key: 'gww:enrl' }); cam('stop', 0.2); cam('flash', '#cfe4ff', 0.12, 0.4); cam('punch', 0.04, 0.7); mus('muffle', 0, 0.2); mus('duck', 0.95, 3); bus(0.8, 3); } }
    } catch (e) { /* cosmetic */ }
    return enrageLand0.call(this, b, H);
  };
  const death0 = GW_FX.death;
  GW_FX.death = function (sh, b, H) {
    try {
      const W = liveW();
      if (W) {
        const t = clockNow(); W.fall = { t0: t, x: b && b.x, y: b && b.y }; W.enrage = null; W.land = null; W.chase = null;
        if (!muted()) { play('bm-garrow-w-called', { vol: 1, key: 'gww:called' }); mus('muffle', 500, 0.3); mus('duck', 0.97, 5); bus(0.9, 5); cam('stop', 0.18); cam('lean', 0.05, 0.7, 1.4, 1.6); }
      }
    } catch (e) { /* cosmetic */ }
    return death0.call(this, sh, b, H);
  };
  // the seal of a wall: he has none
  WallFx.moment('garrow', null, { up() { }, broke(S) { S.muffle(0, 0.5); } });
  // the kill is quiet: no confetti (BOSS_VFX.victory is shared; main.js calls it on every clear): the town's windows are the last thing lit
  if (typeof BOSS_VFX !== 'undefined' && BOSS_VFX.victory) {
    const victory0 = BOSS_VFX.victory;
    BOSS_VFX.victory = function () {
      try { const room = ArenaView.liveRoom; if (room && room.gww && room.gww.fall && ambOf()) return undefined; } catch (e) { /* cosmetic */ }
      return victory0.apply(this, arguments);
    };
  }
})();
