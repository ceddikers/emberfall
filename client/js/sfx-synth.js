// Emberfall procedural sound library: every sound effect in the game, synthesized with the Web Audio API (no files).
//
// Each recipe registers with the audio core (client/js/audio.js, the global `Sound`):
//   Sound.define(name, (ctx, out, t0, p) => durationSeconds)   one-shots: build nodes from t0 into `out`
//   Sound.defineLoop(name, (ctx, out, p) => stopFn)            endless beds: stopFn() fades out (~0.3 s) and frees
// p = { vol, rate, pan, seed, remote, variant }. `variant` (0-1) and `seed` vary pitch and timbre a little so repeats
// don't grate; `rate` multiplies pitch. Gain, pan, limiting and remote dimming are the engine's job: recipes sit at a
// nominal level (peaks around -6 dBFS) and are balanced against each other by the TRIM table below, which
// tools/audio/render.js measures and can rewrite (--write-trim).
//
// Everything is built from one small toolkit (tone, noise, partials, wood, glass, metal, coins, thud, whoosh, rumble,
// sizzle, crackle, creak, scrape, zap, crack, bubbles, splat, voice, choir, pad, horn, drum, pluck, tick) so the whole
// set shares one sound: dusky low fantasy, warm and a little rustic, nothing cartoonish, no chiptune.
// Sample-made material (noise colours, crackle, water, birds, frogs, mug clinks, a heartbeat, reverb impulse responses)
// is computed once per AudioContext and cached in a WeakMap.
//
// Load-safe anywhere: nothing touches window or AudioContext at load; without `Sound` it registers nothing.
// See tools/audio/README.md for how to audition, measure and add recipes.
(function (G) {
  'use strict';
  const EPS = 1e-4;
  const TAU = Math.PI * 2;
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);      // MIDI note -> Hz
  const st = n => Math.pow(2, n / 12);                    // semitones -> ratio
  const cf = f => Math.max(20, Math.min(19000, f));       // a safe filter frequency
  const dbg = db => Math.pow(10, db / 20);

  function mulberry(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------------------------------------------------------------------------------------------- per-context caches
  const CACHE = new WeakMap();
  const per = ctx => { let c = CACHE.get(ctx); if (!c) { c = {}; CACHE.set(ctx, c); } return c; };

  // a buffer computed sample by sample, once per context. `xfade` samples of extra material are crossfaded into the
  // head so the buffer loops without a click.
  function makeBuf(ctx, key, secs, ch, fill, xfade) {
    const c = per(ctx); if (c[key]) return c[key];
    const sr = ctx.sampleRate, n = Math.max(1, Math.floor(secs * sr)), X = xfade ? Math.min(Math.floor(n / 4), xfade) : 0;
    const b = ctx.createBuffer(ch, n, sr);
    for (let i = 0; i < ch; i++) {
      const tmp = new Float32Array(n + X);
      fill(tmp, sr, mulberry(0x51ed + i * 7919 + hashStr(key)), i);
      const d = b.getChannelData(i);
      for (let j = 0; j < n; j++) d[j] = tmp[j];
      for (let j = 0; j < X; j++) { const w = j / X; d[j] = tmp[j] * w + tmp[n + j] * (1 - w); }
    }
    return (c[key] = b);
  }
  function normRms(d, target) { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; const k = target / (Math.sqrt(s / d.length) || 1); for (let i = 0; i < d.length; i++) d[i] *= k; }
  function normPeak(d, target) { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); const k = target / (m || 1); for (let i = 0; i < d.length; i++) d[i] *= k; }

  const NOISE = {
    white: (d, sr, r) => { for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; normRms(d, 0.25); },
    pink: (d, sr, r) => { let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = r() * 2 - 1; b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913; d[i] = b0 + b1 + b2 + w * 0.1848; } normRms(d, 0.25); },
    brown: (d, sr, r) => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (r() * 2 - 1)) / 1.02; d[i] = l; } let m = 0; for (let i = 0; i < d.length; i++) m += d[i]; m /= d.length; for (let i = 0; i < d.length; i++) d[i] -= m; normRms(d, 0.25); },
  };
  const nbuf = (ctx, color) => makeBuf(ctx, 'n-' + color, 4, 1, NOISE[color] || NOISE.white, 2048);

  // sparse clicks and pops: fire, static, gravel, rain, chalk
  const crackBuf = ctx => makeBuf(ctx, 'crackle', 3, 1, (d, sr, r) => {
    let t = 0;
    while (t < 3) {
      t += -Math.log(1 - r() * 0.999) / 80;
      const i0 = Math.floor(t * sr), len = 8 + Math.floor(r() * r() * 140), amp = Math.pow(r(), 2.2) * (r() < 0.5 ? -1 : 1);
      for (let j = 0; j < len && i0 + j < d.length; j++) d[i0 + j] += amp * Math.exp(-j / (len * 0.3)) * (r() * 2 - 1);
    }
    normPeak(d, 0.95);
  });
  // water: bubbles rising in pitch (a fountain, a pond, a boiling pot)
  const waterBuf = ctx => makeBuf(ctx, 'water', 6.3, 2, (d, sr, r) => {
    let t = 0;
    while (t < 6.3) {
      t += -Math.log(1 - r() * 0.999) / 38;
      const f0 = 380 * Math.pow(2, r() * 2.3), tau = 0.004 + r() * r() * 0.03, amp = 0.15 + r() * 0.85, i0 = Math.floor(t * sr), N = Math.floor(tau * 6 * sr);
      let ph = 0;
      for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr; ph += TAU * f0 * (1 + 0.9 * tt / (tau * 6)) / sr; d[i0 + j] += amp * Math.exp(-tt / tau) * Math.sin(ph) * Math.min(1, j / 20); }
    }
    normPeak(d, 0.9);
  }, 4096);
  // birdsong phrases with long gaps (town ambience)
  const birdBuf = ctx => makeBuf(ctx, 'birds', 21, 1, (d, sr, r) => {
    let t = 0.6;
    while (t < 19.5) {
      const notes = 2 + Math.floor(r() * 5), base = 2500 + r() * 2300, kind = Math.floor(r() * 3);
      let tt = t;
      for (let n = 0; n < notes; n++) {
        const len = 0.035 + r() * 0.1, f0 = base * (0.85 + r() * 0.4), f1 = f0 * (kind === 0 ? 1.35 : kind === 1 ? 0.7 : 1 + (r() - 0.5) * 0.3), amp = 0.25 + r() * 0.6, trill = 30 + r() * 40;
        const i0 = Math.floor(tt * sr), N = Math.floor(len * sr); let ph = 0;
        for (let j = 0; j < N && i0 + j < d.length; j++) { const x = j / N, f = f0 + (f1 - f0) * x + Math.sin(j / sr * TAU * trill) * f0 * 0.03; ph += TAU * f / sr; d[i0 + j] += amp * Math.pow(Math.sin(Math.PI * x), 2) * Math.sin(ph); }
        tt += len + 0.025 + r() * 0.08;
      }
      t = tt + 1.4 + r() * 4.2;
    }
    normPeak(d, 0.9);
  });
  // frogs: pulse-train croaks (the pond)
  const frogBuf = ctx => makeBuf(ctx, 'frogs', 17, 1, (d, sr, r) => {
    let t = 0.8;
    while (t < 16) {
      const reps = r() < 0.4 ? 2 : 1, fr = 320 + r() * 300, rate = 28 + r() * 18, len = 0.2 + r() * 0.25, amp = 0.4 + r() * 0.6;
      for (let rp = 0; rp < reps; rp++) {
        const ts = t + rp * (len + 0.12), pulses = Math.floor(len * rate);
        for (let k = 0; k < pulses; k++) {
          const i0 = Math.floor((ts + k / rate) * sr), env = Math.pow(Math.sin(Math.PI * (k + 0.5) / pulses), 0.6), N = Math.floor(0.03 * sr);
          for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr; d[i0 + j] += amp * env * Math.exp(-tt / 0.006) * (Math.sin(TAU * fr * tt) + 0.4 * Math.sin(TAU * 2.1 * fr * tt)); }
        }
      }
      t += 1.5 + r() * 3.5;
    }
    normPeak(d, 0.9);
  });
  // mug and glass clinks, the odd dull thunk (the tavern)
  const clinkBuf = ctx => makeBuf(ctx, 'clinks', 13, 1, (d, sr, r) => {
    let t = 0.4;
    while (t < 12.5) {
      const reps = r() < 0.35 ? 2 : 1;
      for (let rp = 0; rp < reps; rp++) {
        const i0 = Math.floor((t + rp * (0.06 + r() * 0.1)) * sr), clay = r() < 0.4, f = clay ? 700 + r() * 500 : 1700 + r() * 1600, dec = clay ? 0.03 : 0.07 + r() * 0.1, amp = 0.3 + r() * 0.7, N = Math.floor(dec * 6 * sr);
        const parts = clay ? [[1, 1], [2.3, 0.4]] : [[1, 1], [1.52, 0.6], [2.71, 0.35], [4.1, 0.15]];
        for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr; let s = 0; for (const [m, a] of parts) s += a * Math.sin(TAU * f * m * tt) * Math.exp(-tt / (dec / m)); d[i0 + j] += amp * s; }
        if (r() < 0.3) { const N2 = Math.floor(0.12 * sr); for (let j = 0; j < N2 && i0 + j < d.length; j++) { const tt = j / sr; d[i0 + j] += 0.5 * Math.sin(TAU * 140 * tt) * Math.exp(-tt / 0.03); } }
      }
      t += 0.5 + r() * 2.2;
    }
    normPeak(d, 0.9);
  });
  // a heartbeat, one lub-dub per loop (low HP)
  const heartBuf = ctx => makeBuf(ctx, 'heart', 0.78, 1, (d, sr) => {
    const beat = (at, f0, f1, dec, amp) => {
      const i0 = Math.floor(at * sr), N = Math.floor(dec * 7 * sr); let ph = 0;
      for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr, f = f1 + (f0 - f1) * Math.exp(-tt / 0.03); ph += TAU * f / sr; d[i0 + j] += amp * Math.sin(ph) * Math.exp(-tt / dec) * Math.min(1, j / 40); }
    };
    beat(0.01, 70, 42, 0.07, 1); beat(0.29, 82, 50, 0.05, 0.65);
    normPeak(d, 0.95);
  });

  // reverb impulse responses: decaying noise that darkens as it decays
  const IR = { room: [0.55, 0.0, 0.45], hall: [2.3, 0.012, 0.7], cave: [1.7, 0.02, 0.85] };
  const irBuf = (ctx, type) => makeBuf(ctx, 'ir-' + type, IR[type][0], 2, (d, sr, r, ch) => {
    const [len, pre, dark] = IR[type], n = d.length, p0 = Math.floor(pre * sr);
    let lp = 0;
    for (let i = p0; i < n; i++) {
      const x = (i - p0) / (n - p0), a = Math.exp(-6.9 * x) * (1 - x), c = 0.15 + dark * 0.8 * x;
      lp = lp * c + (r() * 2 - 1) * (1 - c);
      d[i] = lp * a * (1 + (1 - c));
    }
    if (type === 'cave') for (let k = 0; k < 7; k++) { const i = p0 + Math.floor((0.01 + r() * 0.09) * sr); if (i < n) d[i] += (r() < 0.5 ? -1 : 1) * (0.4 - k * 0.04); }
    for (let i = 0; i < Math.min(n, 64); i++) d[i] *= i / 64;
  });

  const curves = {};
  function driveCurve(k) {
    const key = Math.round(k * 10) / 10; if (curves[key]) return curves[key];
    const n = 1024, c = new Float32Array(n), norm = Math.tanh(key);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(key * x) / norm; }
    return (curves[key] = c);
  }

  // ---------------------------------------------------------------------------------------------- automation helpers
  function glide(param, t, f0, f1, d, curve) {
    param.setValueAtTime(f0, t);
    if (f1 == null || f1 === f0) return;
    if (curve === 'lin') param.linearRampToValueAtTime(f1, t + d);
    else if (curve === 'tgt') param.setTargetAtTime(f1, t, Math.max(0.005, d / 3));
    else param.exponentialRampToValueAtTime(Math.max(1e-3, f1), t + Math.max(0.002, d));
  }
  // a gain envelope. o: { peak, a (attack), hold, dur (total), swell (exponential attack), rel:'lin',
  //   pts: [[time, level 0-1], ...] (exponential moves, a level of 0 is a linear fade to silence) }
  function envelope(param, t, o) {
    const pk = Math.max(EPS * 2, o.peak == null ? 0.5 : o.peak);
    param.setValueAtTime(EPS, t);
    if (o.pts) {
      let last = EPS, lt = t;
      for (const [dt, v] of o.pts) {
        const tt = t + Math.max(0.001, dt), val = v * pk;
        if (tt <= lt) continue;
        if (val <= EPS || last <= EPS) param.linearRampToValueAtTime(Math.max(0, val), tt); else param.exponentialRampToValueAtTime(val, tt);
        last = val; lt = tt;
      }
      if (last > EPS) { param.linearRampToValueAtTime(0, lt + 0.02); lt += 0.02; }
      return lt;
    }
    const a = Math.max(0.001, o.a == null ? 0.003 : o.a), hold = o.hold || 0, dur = Math.max(a + hold + 0.01, o.dur || 0.2);
    if (o.swell) param.exponentialRampToValueAtTime(pk, t + a); else param.linearRampToValueAtTime(pk, t + a);
    if (hold) param.setValueAtTime(pk, t + a + hold);
    if (o.rel === 'lin') param.linearRampToValueAtTime(0, t + dur);
    else { param.exponentialRampToValueAtTime(EPS, t + dur); param.setValueAtTime(0, t + dur + 0.001); }
    return t + dur;
  }

  // ---------------------------------------------------------------------------------------------- one play's state
  function mk(ctx, out, t0, p, name) {
    p = p || {};
    const v = typeof p.variant === 'number' && isFinite(p.variant) ? Math.max(0, Math.min(0.9999, p.variant)) : Math.random();
    const seed = ((p.seed == null || !isFinite(p.seed) ? Math.floor(Math.random() * 4294967296) : Math.floor(p.seed)) ^ Math.floor(v * 1e6) ^ hashStr(name)) >>> 0;
    const r = mulberry(seed);
    const rate = p.rate > 0 && isFinite(p.rate) ? p.rate : 1;
    const S = { ctx, out, t0, p, v, r, rate, end: t0, tail: 0, verbs: {}, revDefault: 0, verbType: 'room', name };
    S.rr = (a, b) => a + (b - a) * r();
    S.pick = a => a[Math.floor(r() * a.length)];
    S.vi = n => (S.forceV != null ? S.forceV % n : Math.min(n - 1, Math.floor(v * n)));   // (forceV: a layer pinned to one variant)
    S.k = rate * st((r() - 0.5) * 0.5);           // +-25 cents per play
    S.t0 = t0;
    S.T = at => S.t0 + (at || 0);
    S.mark = t => { if (t > S.end) S.end = t; };
    // bus -> gentle glue compressor (Chrome's has a 6 ms lookahead, so it catches the click transients) -> trim -> out.
    // The trim sits after the compressor so the measured level trims (TRIM) stay linear.
    S.bus = ctx.createGain();
    const dcb = ctx.createBiquadFilter(); dcb.type = 'highpass'; dcb.frequency.value = 25; dcb.Q.value = 0;   // DC / sub-rumble blocker
    const trim = ctx.createGain(); trim.gain.value = dbg(TRIM[name] || 0); trim.connect(out);
    if (ctx.createDynamicsCompressor && !NOCOMP[name]) {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = -24; c.knee.value = 12; c.ratio.value = 4; c.attack.value = 0.002; c.release.value = 0.12;
      S.bus.connect(dcb); dcb.connect(c); c.connect(trim); S.tail += 0.01;
    } else { S.bus.connect(dcb); dcb.connect(trim); }
    S.space = (type, amount) => { S.verbType = type; S.revDefault = amount; };
    for (const k in TOOLS) S[k] = o => TOOLS[k](S, o || {});
    return S;
  }
  function gain(S, v) { const g = S.ctx.createGain(); g.gain.value = v == null ? 1 : v; return g; }
  function osc(S, type, f, t) { const o = S.ctx.createOscillator(); o.type = type === 'saw' ? 'sawtooth' : type === 'tri' ? 'triangle' : (type || 'sine'); o.frequency.setValueAtTime(Math.max(0.01, f), t); return o; }
  function lfo(S, param, rate, depth, t, d, delay, type) {
    const l = osc(S, type || 'sine', rate, t), g = S.ctx.createGain();
    if (delay) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(depth, t + delay); } else g.gain.setValueAtTime(depth, t);
    l.connect(g); g.connect(param); l.start(t); l.stop(t + d + 0.05);
    return l;
  }
  function verbIn(S, type) {
    if (!S.verbs[type]) {
      const c = S.ctx.createConvolver(); c.buffer = irBuf(S.ctx, type);
      c.connect(S.bus); S.verbs[type] = c; S.tail = Math.max(S.tail, IR[type][0] + 0.01);
    }
    return S.verbs[type];
  }
  // filters a node by o.hp / o.bp / o.pk / o.lp (+ o.hp1 / o.bp1 / o.lp1 sweeps over o.fd), then o.drive
  function chain(S, node, o, t) {
    const k = o.abs ? 1 : S.k, fd = o.fd || o.dur || 0.2;
    const f = (type, a, b, q) => { const bq = S.ctx.createBiquadFilter(); bq.type = type; bq.Q.value = q; glide(bq.frequency, t, cf(a * k), b != null ? cf(b * k) : null, fd, o.fcurve); node.connect(bq); node = bq; };
    if (o.hp) f('highpass', o.hp, o.hp1, o.hq == null ? 0 : o.hq);
    if (o.bp) f('bandpass', o.bp, o.bp1, o.q == null ? 1 : o.q);
    if (o.pk) for (const [pf, pg, pq] of (Array.isArray(o.pk[0]) ? o.pk : [o.pk])) { const bq = S.ctx.createBiquadFilter(); bq.type = 'peaking'; bq.frequency.value = cf(pf * k); bq.gain.value = pg; bq.Q.value = pq || 1; node.connect(bq); node = bq; }
    if (o.lp) f('lowpass', o.lp, o.lp1, o.lq == null ? 0 : o.lq);
    if (o.drive) { const w = S.ctx.createWaveShaper(); w.curve = driveCurve(o.drive); w.oversample = '2x'; node.connect(w); node = w; }
    return node;
  }
  // amplitude modulation: o.am = [rate, depth, type]; o.grain = crackle depth (grit, sputter, rustle)
  function mods(S, node, o, t, d) {
    if (o.am) { const [rate, depth, type] = o.am; const g = gain(S, 1 - depth * 0.5); node.connect(g); lfo(S, g.gain, rate, depth * 0.5, t, d, o.amDelay || 0, type); node = g; }
    if (o.grain) {
      const g = gain(S, 1 - o.grain * 0.6); node.connect(g);
      const c = S.ctx.createBufferSource(); c.buffer = crackBuf(S.ctx); c.loop = true; c.playbackRate.value = o.grainRate || 1;
      const cg = gain(S, o.grain * 2.2); c.connect(cg); cg.connect(g.gain); c.start(t, S.r() * 2.5); c.stop(t + d + 0.05);
      node = g;
    }
    return node;
  }
  function route(S, node, o) {
    if (o.pan && S.ctx.createStereoPanner) { const pn = S.ctx.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, o.pan)); node.connect(pn); node = pn; }
    node.connect(o.to || S.bus);
    const rv = o.rev != null ? o.rev : S.revDefault;
    if (rv > 0) { const sg = gain(S, rv); node.connect(sg); sg.connect(verbIn(S, o.verb || S.verbType)); }
    if (o.ech && S.echoIn) { const eg = gain(S, o.ech); node.connect(eg); eg.connect(S.echoIn); }
  }
  function finish(S, node, o, t) {
    const d = o.dur || 0.2;
    node = mods(S, node, o, t, d);
    const g = gain(S, 0); node.connect(g);
    const end = envelope(g.gain, t, o);
    route(S, g, o); S.mark(end);
    return end;
  }

  // ---------------------------------------------------------------------------------------------- the toolkit
  const PARTIALS = {
    church: [[0.5, 0.35, 1], [1, 0.5, 0.8], [1.19, 0.32, 0.6], [1.5, 0.22, 0.5], [2, 0.38, 0.42], [2.51, 0.13, 0.3], [2.99, 0.17, 0.25], [4.17, 0.09, 0.16], [5.43, 0.05, 0.1]],
    hand: [[1, 1, 1], [2.0, 0.3, 0.55], [2.76, 0.38, 0.42], [5.4, 0.18, 0.2], [8.93, 0.07, 0.1]],
    service: [[1, 1, 1], [2.76, 0.45, 0.5], [5.4, 0.25, 0.25], [8.93, 0.12, 0.12]],
    glass: [[1, 1, 1], [2.32, 0.5, 0.6], [4.25, 0.3, 0.35], [6.63, 0.15, 0.2], [9.38, 0.06, 0.12]],
    bar: [[1, 1, 1], [2.756, 0.5, 0.5], [5.404, 0.25, 0.3], [8.933, 0.1, 0.15]],
    plate: [[1, 0.8, 1], [1.59, 0.6, 0.8], [2.14, 0.5, 0.6], [2.3, 0.45, 0.6], [2.65, 0.4, 0.5], [2.92, 0.35, 0.45], [3.5, 0.3, 0.4], [4.15, 0.22, 0.3], [5.2, 0.15, 0.2]],
    wood: [[1, 1, 1], [2.31, 0.45, 0.55], [3.93, 0.22, 0.3], [5.6, 0.08, 0.18]],
    coin: [[1, 1, 1], [1.48, 0.7, 0.8], [2.13, 0.5, 0.6], [2.92, 0.35, 0.45], [3.61, 0.2, 0.3]],
    stone: [[1, 1, 1], [1.73, 0.6, 0.5], [2.45, 0.4, 0.35], [3.3, 0.2, 0.2]],
  };
  const VOWEL = { a: [[800, 1], [1150, 0.5], [2900, 0.12]], o: [[450, 1], [800, 0.45], [2830, 0.08]], u: [[325, 1], [700, 0.3], [2530, 0.05]], e: [[400, 1], [1700, 0.35], [2600, 0.1]], i: [[290, 1], [2100, 0.25], [2950, 0.1]] };

  const TOOLS = {
    // an oscillator: { type, f, f1, glide, curve, det, vib:[rate, depth(frac), delay], fm:[ratio, index, index1], + filters/env }
    tone(S, o) {
      const t = S.T(o.at), d = o.dur || 0.2, k = o.abs ? 1 : S.k, f0 = o.f * k;
      const n = osc(S, o.type, f0, t);
      if (o.f1) glide(n.frequency, t, f0, o.f1 * k, o.glide || d, o.curve);
      if (o.det) n.detune.setValueAtTime(o.det, t);
      if (o.vib) lfo(S, n.frequency, o.vib[0], o.vib[1] * f0, t, d, o.vib[2] || 0);
      if (o.fm) {
        const [ratio, i0, i1] = o.fm, fm0 = f0 * ratio, m = osc(S, 'sine', fm0, t), mg = S.ctx.createGain();
        if (o.f1) glide(m.frequency, t, fm0, o.f1 * k * ratio, o.glide || d, o.curve);
        mg.gain.setValueAtTime(Math.max(EPS, i0 * fm0), t); mg.gain.exponentialRampToValueAtTime(Math.max(EPS, (i1 == null ? i0 * 0.1 : i1) * fm0), t + d);
        m.connect(mg); mg.connect(n.frequency); m.start(t); m.stop(t + d + 0.05);
      }
      const last = chain(S, n, o, t);
      n.start(t); n.stop(t + d + 0.05);
      return finish(S, last, o, t);
    },
    // filtered noise: { color: white|pink|brown, pr (playback rate), + filters/env/mods }
    noise(S, o) {
      const t = S.T(o.at), d = o.dur || 0.2;
      const b = S.ctx.createBufferSource(); b.buffer = nbuf(S.ctx, o.color || 'white'); b.loop = true;
      if (o.pr) b.playbackRate.setValueAtTime(o.pr, t);
      const last = chain(S, b, o, t);
      b.start(t, S.r() * 3.5); b.stop(t + d + 0.05);
      return finish(S, last, o, t);
    },
    // a sum of decaying sine partials: { set (PARTIALS name or [[ratio, amp, decay mult]]), f, dur, beat (Hz), spread (cents), strike }
    partials(S, o) {
      const t = S.T(o.at), d = o.dur || 1, k = o.abs ? 1 : S.k, set = typeof o.set === 'string' ? PARTIALS[o.set] : (o.set || PARTIALS.hand);
      const sum = set.reduce((a, q) => a + q[1], 0), pk = (o.peak == null ? 0.4 : o.peak) * 1.3 / sum;
      const bus = gain(S, 1);
      let last = chain(S, bus, o, t); last = mods(S, last, o, t, d); route(S, last, o);
      set.forEach(([ratio, amp, dm], i) => {
        const f = o.f * k * ratio * st((S.r() - 0.5) * (o.spread || 6) / 100);
        if (f > 17000 || f < 15) return;
        const twins = o.beat && i < 3 ? [0, o.beat] : [0];
        for (const bt of twins) {
          const n = osc(S, 'sine', f + bt, t), g = gain(S, 0), pd = Math.max(0.03, d * dm);
          envelope(g.gain, t, { peak: pk * amp * (bt ? 0.6 : 1), a: o.a || 0.0015, dur: pd, swell: o.swell });
          n.connect(g); g.connect(bus); n.start(t); n.stop(t + pd + 0.05);
        }
      });
      if (o.strike) TOOLS.noise(S, { at: o.at, bp: o.f * 3, q: 1.2, dur: 0.03, a: 0.001, peak: (o.peak == null ? 0.4 : o.peak) * o.strike, to: o.to, rev: o.rev, abs: o.abs });
      S.mark(t + d);
      return t + d;
    },
    bell(S, o) { return TOOLS.partials(S, Object.assign({ set: 'church', beat: 1.3, strike: 0.25 }, o)); },
    glass(S, o) {
      TOOLS.noise(S, { at: o.at, hp: 6000, dur: 0.012, a: 0.0008, peak: (o.peak == null ? 0.3 : o.peak) * 0.35, to: o.to, rev: o.rev, pan: o.pan });
      return TOOLS.partials(S, Object.assign({ set: 'glass', dur: 0.6, spread: 10 }, o));
    },
    metal(S, o) {
      if (o.click !== 0) TOOLS.noise(S, { at: o.at, hp: o.f * 1.5, dur: 0.02, a: 0.0008, peak: (o.peak == null ? 0.3 : o.peak) * (o.click || 0.5), to: o.to, rev: o.rev, pan: o.pan });
      return TOOLS.partials(S, Object.assign({ set: 'plate', dur: 0.5, spread: 14 }, o));
    },
    // wood knock: resonant partials plus a click
    wood(S, o) {
      const f = o.f || 700, pk = o.peak == null ? 0.4 : o.peak;
      TOOLS.noise(S, { at: o.at, bp: f * 3, q: 1.5, dur: 0.014, a: 0.0008, peak: pk * 0.6, to: o.to, rev: o.rev, pan: o.pan, abs: o.abs });
      return TOOLS.partials(S, Object.assign({ set: 'wood', dur: 0.09, spread: 8 }, o, { f }));
    },
    coins(S, o) {
      const n = o.n || 3, spread = o.spread == null ? 0.15 : o.spread; let end = S.T(o.at);
      for (let i = 0; i < n; i++) {
        const at = (o.at || 0) + (n > 1 ? spread * (i / (n - 1)) * (0.7 + S.r() * 0.6) : 0), f = (o.f || 3600) * S.rr(0.85, 1.2);
        TOOLS.noise(S, { at, hp: 5000, dur: 0.01, a: 0.0005, peak: (o.peak || 0.25) * 0.5, to: o.to, rev: o.rev, pan: o.pan });
        end = Math.max(end, TOOLS.partials(S, { at, set: 'coin', f, dur: S.rr(0.18, 0.4), peak: (o.peak || 0.25) * S.rr(0.6, 1), spread: 20, to: o.to, rev: o.rev, pan: o.pan }));
      }
      return end;
    },
    // a body impact: a sine dropping in pitch plus a click. { f, f1, pd (pitch drop time), dur, click, clickF, drive, sub }
    thud(S, o) {
      const f = o.f || 110, pk = o.peak == null ? 0.6 : o.peak, d = o.dur || 0.3;
      const end = TOOLS.tone(S, { at: o.at, type: o.type || 'sine', f, f1: o.f1 || f * 0.45, glide: o.pd || d * 0.35, dur: d, a: o.a || 0.002, peak: pk, drive: o.drive, lp: o.lp, rev: o.rev, to: o.to, abs: o.abs, ech: o.ech, pan: o.pan });
      if (o.click !== 0) TOOLS.noise(S, { at: o.at, color: 'white', lp: o.clickF || 2500, dur: o.clickDur || 0.03, a: 0.0008, peak: pk * (o.click == null ? 0.45 : o.click), rev: o.rev, to: o.to, abs: o.abs, pan: o.pan });
      if (o.sub) TOOLS.tone(S, { at: o.at, f: (o.f1 || f * 0.45) * 0.75, dur: d * 1.3, a: 0.01, peak: pk * o.sub, rev: o.rev, to: o.to, abs: o.abs });
      return end;
    },
    // air moving: band-passed noise sweeping f -> f1, swelling to its peak at peakAt (0-1)
    whoosh(S, o) {
      const d = o.dur || 0.3, at = o.peakAt == null ? 0.6 : o.peakAt;
      return TOOLS.noise(S, Object.assign({}, o, { color: o.color || 'pink', bp: o.f || 600, bp1: o.f1 || 2400, q: o.q == null ? 1.2 : o.q, fd: d * (o.sweep || 1), dur: d,
        pts: o.pts || [[d * at * 0.5, 0.3], [d * at, 1], [d * at + (d - d * at) * 0.4, 0.3], [d, 0]] }));
    },
    // a low bed: brown noise low-passed, plus a sub sine
    rumble(S, o) {
      const d = o.dur || 1, pk = o.peak == null ? 0.4 : o.peak, a = o.a == null ? d * 0.3 : o.a;
      const pts = o.pts || [[a, 1], [d, 0]];
      TOOLS.noise(S, { at: o.at, color: 'brown', lp: o.f || 140, lp1: o.f1, fd: d, dur: d, pts, peak: pk, rev: o.rev, to: o.to, grain: o.grain, am: o.am, ech: o.ech, pan: o.pan });
      if (o.sub !== 0) TOOLS.tone(S, { at: o.at, f: o.subF || 42, f1: o.subF1, dur: d, pts, peak: pk * (o.sub || 0.35), am: o.am || [S.rr(5, 9), 0.4], rev: o.rev, to: o.to });
      return S.T(o.at) + d;
    },
    sizzle(S, o) { return TOOLS.noise(S, Object.assign({ color: 'white', hp: 2800, lp: 9000, grain: 0.85, grainRate: 1.3 }, o)); },
    // the crackle buffer: dens = playback rate (density and brightness)
    crackle(S, o) {
      const t = S.T(o.at), d = o.dur || 0.5;
      const b = S.ctx.createBufferSource(); b.buffer = crackBuf(S.ctx); b.loop = true; b.playbackRate.value = o.dens || 1;
      const last = chain(S, b, Object.assign({ bp: o.f || 2500, q: o.q == null ? 0.6 : o.q }, o), t);
      b.start(t, S.r() * 2.5); b.stop(t + d + 0.05);
      return finish(S, last, o, t);
    },
    // friction: a jittering pulse train through resonances (wood, armour, silk). { f (pulses/s), f1, res:[Hz], q, jit }
    creak(S, o) {
      const t = S.T(o.at), d = o.dur || 0.5, k = o.abs ? 1 : S.k, f0 = o.f || 30, f1 = o.f1 || f0, jit = o.jit == null ? 0.5 : o.jit;
      const n = osc(S, 'sawtooth', f0, t);
      for (let tt = t; tt < t + d;) { tt += 0.015 + S.r() * 0.05; const base = f0 + (f1 - f0) * Math.min(1, (tt - t) / d); n.frequency.linearRampToValueAtTime(Math.max(3, base * (1 + (S.r() - 0.5) * 2 * jit)), tt); }
      const bus = gain(S, o.comp || 6);
      for (const rf of (o.res || [600, 1300])) { const bq = S.ctx.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = cf(rf * k); bq.Q.value = o.q || 10; n.connect(bq); bq.connect(bus); }
      n.start(t); n.stop(t + d + 0.05);
      return finish(S, chain(S, bus, Object.assign({}, o, { bp: null, hp: o.hp || 150 }), t), o, t);
    },
    // grinding / scraping: band noise chopped by a square LFO. { f, q, rate }
    scrape(S, o) { return TOOLS.noise(S, Object.assign({ color: 'white', bp: o.f || 1500, q: o.q || 2, am: [o.rate || 40, 0.8, 'square'], grain: 0.4 }, o)); },
    // electricity: a saw whose pitch is shaken by noise. { f, jit }
    zap(S, o) {
      const t = S.T(o.at), d = o.dur || 0.3, k = o.abs ? 1 : S.k, f = (o.f || 120) * k;
      const n = osc(S, 'sawtooth', f, t);
      if (o.f1) glide(n.frequency, t, f, o.f1 * k, d, o.curve);
      const nz = S.ctx.createBufferSource(); nz.buffer = nbuf(S.ctx, 'white'); nz.loop = true;
      const ng = gain(S, f * (o.jit || 2.5)); nz.connect(ng); ng.connect(n.frequency);
      const last = chain(S, n, Object.assign({ hp: 300, bp: o.bf || 2200, q: 0.8 }, o), t);
      n.start(t); n.stop(t + d + 0.05); nz.start(t, S.r() * 3); nz.stop(t + d + 0.05);
      return finish(S, last, Object.assign({ grain: 0.6, grainRate: 1.6 }, o), t);
    },
    // a lightning / whip crack: a hard noise spike, a bright crackling tail
    crack(S, o) {
      const pk = o.peak == null ? 0.6 : o.peak;
      TOOLS.noise(S, { at: o.at, hp: o.f || 1200, dur: 0.05, a: 0.0004, peak: pk, drive: 2, rev: o.rev, to: o.to, pan: o.pan, ech: o.ech });
      TOOLS.noise(S, { at: (o.at || 0) + 0.004, bp: 3200, q: 0.5, dur: o.dur || 0.35, a: 0.002, peak: pk * 0.45, grain: 0.9, grainRate: 1.8, rev: o.rev, to: o.to, pan: o.pan, ech: o.ech });
      return S.T(o.at) + (o.dur || 0.35);
    },
    // bubbles: n short sines rising in pitch over `spread` seconds. { n, f, f1 (pitch range), spread, size }
    bubbles(S, o) {
      const n = o.n || 6, spread = o.spread == null ? 0.4 : o.spread, pk = o.peak == null ? 0.2 : o.peak;
      let end = S.T(o.at);
      for (let i = 0; i < n; i++) {
        const at = (o.at || 0) + spread * Math.pow(S.r(), o.bias || 1), f = (o.f || 400) * Math.pow((o.f1 || 1600) / (o.f || 400), S.r()), d = (o.size || 0.04) * S.rr(0.5, 1.5);
        end = Math.max(end, TOOLS.tone(S, { at, f, f1: f * S.rr(1.4, 2.1), glide: d, dur: d * 1.6, a: 0.002, peak: pk * S.rr(0.4, 1), to: o.to, rev: o.rev, pan: o.pan, lp: o.lp }));
      }
      return end;
    },
    // a wet impact: low slap, a squelch sweeping down, a few bubbles
    splat(S, o) {
      const pk = o.peak == null ? 0.5 : o.peak, at = o.at || 0, d = o.dur || 0.3;
      TOOLS.noise(S, { at, color: 'pink', lp: 1400, dur: 0.09, a: 0.001, peak: pk * 0.8, rev: o.rev, to: o.to });
      TOOLS.noise(S, { at: at + 0.01, color: 'pink', bp: 1300, bp1: 350, q: 5, dur: d, fd: d * 0.7, a: 0.004, peak: pk * 0.7, grain: 0.3, rev: o.rev, to: o.to });
      TOOLS.thud(S, { at, f: 95, f1: 55, dur: 0.12, peak: pk * 0.6, click: 0, rev: o.rev, to: o.to });
      TOOLS.bubbles(S, { at: at + 0.02, n: 3, f: 250, f1: 700, spread: d * 0.6, peak: pk * 0.25, size: 0.03, to: o.to });
      return S.T(at) + d;
    },
    // a soft vowel without words: a buzzy source through moving formants. { f, f1, vowel, vowel1, breath }
    voice(S, o) {
      const t = S.T(o.at), d = o.dur || 0.15, k = o.abs ? 1 : S.k;
      const n = osc(S, 'sawtooth', o.f * k, t); if (o.f1) glide(n.frequency, t, o.f * k, o.f1 * k, d, 'lin');
      lfo(S, n.frequency, S.rr(4.5, 6), o.f * k * 0.012, t, d);
      const src = gain(S, 1); n.connect(src);
      if (o.breath !== 0) { const b = S.ctx.createBufferSource(); b.buffer = nbuf(S.ctx, 'white'); b.loop = true; const bg = gain(S, o.breath || 0.25); b.connect(bg); bg.connect(src); b.start(t, S.r() * 3); b.stop(t + d + 0.05); }
      const sum = gain(S, 1), v0 = VOWEL[o.vowel || 'a'], v1 = VOWEL[o.vowel1 || o.vowel || 'a'];
      v0.forEach(([ff, amp], i) => { const bq = S.ctx.createBiquadFilter(); bq.type = 'bandpass'; bq.Q.value = 7 + i * 3; glide(bq.frequency, t, ff * Math.sqrt(k), v1[i][0] * Math.sqrt(k), d, 'lin'); const g = gain(S, amp * 3.2); src.connect(bq); bq.connect(g); g.connect(sum); });
      n.start(t); n.stop(t + d + 0.05);
      return finish(S, chain(S, sum, { lp: o.lp || 2600, abs: true }, t), Object.assign({ pts: [[d * 0.22, 1], [d * 0.7, 0.65], [d, 0]] }, o), t);
    },
    // a low choir: detuned saws per note through vowel formants. { notes:[Hz], vowel, vowel1, dur, + env }
    choir(S, o) {
      const t = S.T(o.at), d = o.dur || 2, k = o.abs ? 1 : S.k, notes = o.notes || [mf(45)];
      const src = gain(S, 1 / Math.sqrt(notes.length * 3));
      for (const nf of notes) for (const det of [-13, 0, 10]) {
        const n = osc(S, 'sawtooth', nf * k, t); n.detune.value = det + (S.r() - 0.5) * 6;
        if (o.bend) glide(n.frequency, t, nf * k, nf * k * st(o.bend), d, 'exp');
        lfo(S, n.frequency, S.rr(4.6, 5.6), nf * k * 0.007, t, d, 0.4);
        n.connect(src); n.start(t); n.stop(t + d + 0.05);
      }
      const sum = gain(S, 1), v0 = VOWEL[o.vowel || 'o'], v1 = VOWEL[o.vowel1 || o.vowel || 'o'];
      v0.forEach(([ff, amp], i) => { const bq = S.ctx.createBiquadFilter(); bq.type = 'bandpass'; bq.Q.value = 5 + i * 2; glide(bq.frequency, t, ff, v1[i][0], d, 'lin'); const g = gain(S, amp * 2.6); src.connect(bq); bq.connect(g); g.connect(sum); });
      return finish(S, chain(S, sum, { lp: o.lp || 3200, abs: true }, t), Object.assign({ a: 0.6, swell: true }, o), t);
    },
    // a sustained chord: { notes:[Hz], type, det (cents), lpEnv:[f0, fPeak, fEnd, tPeak], bend (semitones over dur), bend0 }
    pad(S, o) {
      const t = S.T(o.at), d = o.dur || 1, k = o.abs ? 1 : S.k, notes = o.notes || [mf(57)];
      const src = gain(S, 1 / Math.sqrt(notes.length * 2));
      for (const nf of notes) for (const det of [-(o.det || 8), o.det || 8]) {
        const f = nf * k, n = osc(S, o.type || 'saw', o.bend0 ? f * st(o.bend0) : f, t); n.detune.value = det;
        if (o.bend0) glide(n.frequency, t, f * st(o.bend0), f, o.bendT || d * 0.4, 'exp');
        else if (o.bend) glide(n.frequency, t, f, f * st(o.bend), d, 'exp');
        if (o.vib) lfo(S, n.frequency, o.vib[0] * S.rr(0.9, 1.1), o.vib[1] * f, t, d, o.vib[2] || 0);
        n.connect(src); n.start(t); n.stop(t + d + 0.05);
      }
      let node = src;
      if (o.lpEnv) {
        const [a, b, c, tp] = o.lpEnv, bq = S.ctx.createBiquadFilter(); bq.type = 'lowpass'; bq.Q.value = o.lq || 0;
        bq.frequency.setValueAtTime(cf(a * k), t); bq.frequency.exponentialRampToValueAtTime(cf(b * k), t + (tp || d * 0.5)); bq.frequency.exponentialRampToValueAtTime(cf(c * k), t + d);
        src.connect(bq); node = bq;
      }
      return finish(S, chain(S, node, o, t), Object.assign({ a: 0.2, swell: true }, o), t);
    },
    // a war horn: two saws and a sub through an opening low-pass, a scoop into pitch, late vibrato. { f, dur }
    horn(S, o) {
      const t = S.T(o.at), d = o.dur || 1.2, k = o.abs ? 1 : S.k, f = o.f * k;
      const src = gain(S, 0.5);
      [[1, 'sawtooth', 0], [1, 'sawtooth', 7], [0.5, 'square', 0]].forEach(([m, type, det]) => {
        const n = osc(S, type, f * m * 0.94, t); n.detune.value = det; glide(n.frequency, t, f * m * 0.94, f * m, 0.09, 'exp');
        lfo(S, n.frequency, 5.2, f * m * 0.008, t, d, 0.5); n.connect(src); n.start(t); n.stop(t + d + 0.05);
      });
      const bq = S.ctx.createBiquadFilter(); bq.type = 'lowpass'; bq.Q.value = 3;
      bq.frequency.setValueAtTime(cf(f * 1.2), t); bq.frequency.exponentialRampToValueAtTime(cf(f * (o.bright || 7)), t + 0.12); bq.frequency.exponentialRampToValueAtTime(cf(f * 3.5), t + d * 0.6); bq.frequency.exponentialRampToValueAtTime(cf(f * 1.5), t + d);
      src.connect(bq);
      TOOLS.noise(S, { at: o.at, bp: f * 6, q: 1.5, dur: 0.15, a: 0.02, peak: (o.peak || 0.4) * 0.15, rev: o.rev, to: o.to, abs: true });
      return finish(S, bq, Object.assign({ a: 0.06, pts: [[0.06, 1], [d * 0.6, 0.75], [d, 0]] }, o), t);
    },
    // a drum: body thud, skin noise, stick click. { f, dur }
    drum(S, o) {
      const f = o.f || 110, pk = o.peak == null ? 0.6 : o.peak, d = o.dur || 0.5;
      TOOLS.thud(S, { at: o.at, f: f * 1.6, f1: f, pd: 0.04, dur: d, peak: pk, click: 0.3, clickF: 1800, drive: o.drive, rev: o.rev, to: o.to, ech: o.ech, sub: o.sub });
      TOOLS.noise(S, { at: o.at, color: 'pink', bp: f * 3, q: 0.8, dur: d * 0.35, a: 0.001, peak: pk * 0.35, rev: o.rev, to: o.to, ech: o.ech });
      return S.T(o.at) + d;
    },
    // a plucked string: a saw through a closing low-pass. { f, dur, bright, bend }
    pluck(S, o) {
      const f = o.f, d = o.dur || 0.5, pk = o.peak == null ? 0.3 : o.peak;
      TOOLS.tone(S, { at: o.at, type: o.type || 'saw', f, f1: o.bend ? f * st(o.bend) : null, glide: d * 0.6, dur: d, a: 0.002, peak: pk, lp: f * (o.bright || 8), lp1: f * 1.3, fd: d * 0.35, rev: o.rev, to: o.to, pan: o.pan, ech: o.ech, abs: o.abs });
      TOOLS.tone(S, { at: o.at, type: 'tri', f, f1: o.bend ? f * st(o.bend) : null, glide: d * 0.6, dur: d * 1.2, a: 0.002, peak: pk * 0.4, rev: o.rev, to: o.to, pan: o.pan, ech: o.ech, abs: o.abs });
      TOOLS.noise(S, { at: o.at, hp: 3000, dur: 0.008, a: 0.0005, peak: pk * 0.25, to: o.to, pan: o.pan });
      return S.T(o.at) + d * 1.2;
    },
    // a clock tick
    tick(S, o) {
      const pk = o.peak == null ? 0.25 : o.peak;
      TOOLS.wood(S, { at: o.at, f: o.f || 2300, dur: 0.035, peak: pk, rev: o.rev, to: o.to, pan: o.pan });
      return TOOLS.metal(S, { at: o.at, set: 'bar', f: (o.f || 2300) * 1.8, dur: 0.05, peak: pk * 0.3, click: 0, rev: o.rev, to: o.to, pan: o.pan });
    },
    // tiny legs: n clicks spread over dur, density ramping by `bias`
    skitter(S, o) {
      const n = o.n || 20, d = o.dur || 0.6, pk = o.peak == null ? 0.2 : o.peak;
      for (let i = 0; i < n; i++) {
        const at = (o.at || 0) + d * Math.pow(S.r(), o.bias || 1);
        TOOLS.noise(S, { at, bp: S.rr(o.f || 2500, (o.f || 2500) * 2), q: 3, dur: S.rr(0.006, 0.016), a: 0.0005, peak: pk * S.rr(0.3, 1), pan: o.pan == null ? S.rr(-0.4, 0.4) : o.pan, to: o.to, rev: o.rev });
      }
      S.mark(S.T(o.at) + d + 0.02);
      return S.T(o.at) + d;
    },
    // a feedback echo the other tools can send to with `ech`. { time, fb, lp, kill }
    echo(S, o) {
      const t = S.T(0), dl = S.ctx.createDelay(2), fb = gain(S, o.fb || 0.35), lp = S.ctx.createBiquadFilter();
      dl.delayTime.value = Math.max(0.01, o.time || 0.25); lp.type = 'lowpass'; lp.frequency.value = o.lp || 2500;
      const inp = gain(S, 1); inp.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(S.bus);
      const kill = t + (o.kill || 2);
      fb.gain.setValueAtTime(o.fb || 0.35, kill - 0.3); fb.gain.linearRampToValueAtTime(0, kill); inp.gain.setValueAtTime(1, kill - 0.3); inp.gain.linearRampToValueAtTime(0, kill);
      S.echoIn = inp; S.mark(kill);
      return kill;
    },
  };

  // ---------------------------------------------------------------------------------------------- loops
  // a loop's builder gets L: looped sources and LFOs that run until stop(). L.out is the master (faded in by `fadeIn`).
  function mkLoop(ctx, out, p, name, fadeIn) {
    p = p || {};
    const t = ctx.currentTime, nodes = [], r = mulberry(((p.seed == null ? Math.random() * 4294967296 : p.seed) ^ hashStr(name)) >>> 0);
    const master = ctx.createGain(); master.gain.setValueAtTime(0, t); master.gain.linearRampToValueAtTime(dbg(TRIM[name] || 0), t + (fadeIn || 0.8)); master.connect(out);
    const k = (p.rate > 0 ? p.rate : 1);
    const L = {
      ctx, t, r, k, out: master, rr: (a, b) => a + (b - a) * r(),
      g: v => { const g = ctx.createGain(); g.gain.value = v == null ? 1 : v; return g; },
      f: (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = cf(f); b.Q.value = q == null ? (type === 'bandpass' ? 1 : 0) : q; return b; },
      src: (buf, rate) => { const b = ctx.createBufferSource(); b.buffer = typeof buf === 'string' ? nbuf(ctx, buf) : buf; b.loop = true; b.playbackRate.value = rate || 1; b.start(t, r() * b.buffer.duration * 0.9); nodes.push(b); return b; },
      osc: (type, f, det) => { const o = osc({ ctx }, type, f * k, t); if (det) o.detune.value = det; o.start(t); nodes.push(o); return o; },
      lfo: (param, rate, depth, type) => { const o = osc({ ctx }, type || 'sine', rate, t), g = ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(t); nodes.push(o); return o; },
      c: (...ns) => { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); return ns[ns.length - 1]; },
      verb: (type, amt, from) => { const c = ctx.createConvolver(); c.buffer = irBuf(ctx, type); const g = ctx.createGain(); g.gain.value = amt; from.connect(g); g.connect(c); c.connect(master); },
      crackle: rate => L.src(crackBuf(ctx), rate),
    };
    let stopped = false;
    const stop = () => {
      if (stopped) return; stopped = true;
      const now = ctx.currentTime;
      try { master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.setTargetAtTime(0, now, 0.08); } catch (e) { /* context closed */ }
      for (const n of nodes) { try { n.stop(now + 0.45); } catch (e) { /* already stopped */ } }
      const free = () => { try { master.disconnect(); } catch (e) { /* gone */ } };
      if (typeof setTimeout === 'function' && !(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext)) setTimeout(free, 700);
    };
    return { L, stop };
  }

  // ---------------------------------------------------------------------------------------------- registry
  const DEFS = [], LOOPS = [], CAT = {};
  const FN = {};
  function def(name, cat, fn) { DEFS.push([name, fn]); CAT[name] = cat; FN[name] = fn; }
  function loop(name, cat, fn, fadeIn) { LOOPS.push([name, fn, fadeIn]); CAT[name] = cat; }

  // per-recipe level trims in dB, measured by tools/audio/render.js against the loudness targets of each category
  // (node tools/audio/render.js --write-trim rewrites this block; hand edits are fine too)
  // recipes left uncompressed (long tonal tails where pumping would show)
  const NOCOMP = {};
  // @@TRIM-BEGIN
  const TRIM = {
    'ab-alembist-auto': 6.5, 'ab-alembist-batch': -1.5, 'ab-alembist-blend': 0.5, 'ab-alembist-dew': -1,
    'ab-alembist-distill': -1, 'ab-alembist-ember': -1.5, 'ab-alembist-quicksilver': 0.5, 'ab-alembist-salt': 1,
    'ab-alembist-throw': 1, 'ab-bastion-auto': 1.5, 'ab-bastion-avatar': -2, 'ab-bastion-banner': -0.5,
    'ab-bastion-bash': -2, 'ab-bastion-blade': -0.5, 'ab-bastion-brace': 1.5, 'ab-bastion-bulwark': -1.5,
    'ab-bastion-edge': -1.5, 'ab-bastion-hallowed': -2, 'ab-bastion-oath': -1, 'ab-bastion-zeal': -2.5,
    'ab-bloodreaver-auto': 1.5, 'ab-bloodreaver-drain': -1.5, 'ab-bloodreaver-frenzy': -2, 'ab-bloodreaver-hack': -0.5,
    'ab-bloodreaver-lance': 1.5, 'ab-bloodreaver-moon': 1, 'ab-bloodreaver-rampage': -1.5, 'ab-bloodreaver-scab': 2,
    'ab-bloodreaver-undying': 0.5, 'ab-bloodreaver-warcry': -1, 'ab-buff': 2, 'ab-cast-loop': -16,
    'ab-chronomancer-accel': -2, 'ab-chronomancer-auto': 4, 'ab-chronomancer-bolt': -0.5, 'ab-chronomancer-bubble': -1,
    'ab-chronomancer-chamber': -1, 'ab-chronomancer-recall': -3.5, 'ab-chronomancer-rewind': -1.5, 'ab-chronomancer-shift': -0.5,
    'ab-chronomancer-stasis': -1, 'ab-chronomancer-warp': -1, 'ab-cleric-auto': 1.5, 'ab-cleric-barrier': -2,
    'ab-cleric-bene': -3, 'ab-cleric-condemn': -3.5, 'ab-cleric-dawnbloom': -3, 'ab-cleric-dawnsanctum': -2,
    'ab-cleric-intervene': -2.5, 'ab-cleric-mend': -1.5, 'ab-cleric-petal': -2.5, 'ab-cleric-prayer': -2,
    'ab-cleric-smite': -2, 'ab-dot': 7, 'ab-driftblade-auto': 1.5, 'ab-driftblade-carve': 0.5,
    'ab-driftblade-cross': 1.5, 'ab-driftblade-eyestep': 0.5, 'ab-driftblade-gale': 1.5, 'ab-driftblade-galeline': 1,
    'ab-driftblade-gyre': 1, 'ab-driftblade-hook': 0.5, 'ab-driftblade-impact': -2.5, 'ab-driftblade-slip': 5,
    'ab-driftblade-still': -0.5, 'ab-driftblade-tailspin': 0.5, 'ab-fire': -1.5, 'ab-gorgemaw-auto': 4.5,
    'ab-gorgemaw-bottomless': -0.5, 'ab-gorgemaw-gnash': 3.5, 'ab-gorgemaw-iron': 1.5, 'ab-gorgemaw-regurgitate': -1.5,
    'ab-gorgemaw-spit': 3.5, 'ab-gorgemaw-stonebelly': -0.5, 'ab-gorgemaw-wide': -0.5, 'ab-grovekeeper-auto': 8.5,
    'ab-grovekeeper-bloom': -1.5, 'ab-grovekeeper-growth': -1, 'ab-grovekeeper-lifebind': -2, 'ab-grovekeeper-moonwell': -2,
    'ab-grovekeeper-rebirth': -1.5, 'ab-grovekeeper-rejuv': -1.5, 'ab-grovekeeper-seed': -1, 'ab-grovekeeper-thorn': 1.5,
    'ab-grovekeeper-treant': -1.5, 'ab-heal': -1.5, 'ab-heavy': -1, 'ab-holy': -2,
    'ab-ironpalm-auto': 0.5, 'ab-ironpalm-bell': -1.5, 'ab-ironpalm-bellows': 1, 'ab-ironpalm-breaker': -1,
    'ab-ironpalm-crane': -0.5, 'ab-ironpalm-dragon': -2.5, 'ab-ironpalm-drop': -2.5, 'ab-ironpalm-flow': -0.5,
    'ab-ironpalm-gate': -1, 'ab-ironpalm-kick': 0.5, 'ab-ironpalm-ox': -1.5, 'ab-ironpalm-palm': -0.5,
    'ab-ironpalm-palms': -1.5, 'ab-ironpalm-pond': -0.5, 'ab-ironpalm-slide': -1, 'ab-ironpalm-wall': -0.5,
    'ab-ledger': 0.5, 'ab-magic-generic': 0.5, 'ab-marionettist-auto': 8.5, 'ab-marionettist-cross': 2.5,
    'ab-marionettist-finale': -1.5, 'ab-marionettist-jab': 2, 'ab-marionettist-pirouette': 1, 'ab-marionettist-pull': 5,
    'ab-marionettist-redcurtain': 2, 'ab-marionettist-string': 4.5, 'ab-marionettist-swap': 0.5, 'ab-marionettist-tangle': 5,
    'ab-maw': 1, 'ab-melee-generic': 0.5, 'ab-nature': 3.5, 'ab-oathbroker-audit': 1.5,
    'ab-oathbroker-auto': 8, 'ab-oathbroker-cosign': 0.5, 'ab-oathbroker-default': -1, 'ab-oathbroker-foreclose': -2.5,
    'ab-oathbroker-moratorium': -1.5, 'ab-oathbroker-reneg': 4.5, 'ab-oathbroker-writ': -1.5, 'ab-pyromancer-auto': 2,
    'ab-pyromancer-circle': -1.5, 'ab-pyromancer-combust': -2, 'ab-pyromancer-fireball': -2.5, 'ab-pyromancer-fireblast': -2,
    'ab-pyromancer-meteor': -3, 'ab-pyromancer-phoenix': -2, 'ab-pyromancer-phoenixblast': -2.5, 'ab-pyromancer-phoenixflame': -2,
    'ab-pyromancer-pyro': -3.5, 'ab-pyromancer-vent': -1.5, 'ab-ranged-generic': 1, 'ab-ranger-aimed': 0.5,
    'ab-ranger-auto': 8, 'ab-ranger-barrage': 1, 'ab-ranger-caustic': 6, 'ab-ranger-cloak': 0.5,
    'ab-ranger-explosive': -3.5, 'ab-ranger-falcon': 1.5, 'ab-ranger-mark': 3.5, 'ab-ranger-pierce': 0.5,
    'ab-ranger-quick': 5.5, 'ab-ranger-rapid': 1.5, 'ab-rune': 0.5, 'ab-runeguard-cleave': -3,
    'ab-runeguard-glyph': -2.5, 'ab-runeguard-living': -2.5, 'ab-runeguard-mirror': -1.5, 'ab-runeguard-overload': -2.5,
    'ab-runeguard-sanctum': -2, 'ab-runeguard-strike': -1, 'ab-runeguard-ward': -2, 'ab-runeguard-whirl': -1.5,
    'ab-shadowblade-auto': 2.5, 'ab-shadowblade-backstab': -0.5, 'ab-shadowblade-blossom': 1, 'ab-shadowblade-dance': 1.5,
    'ab-shadowblade-evis': 1, 'ab-shadowblade-fury': 0.5, 'ab-shadowblade-rupture': 1.5, 'ab-shadowblade-shadowcut': 1.5,
    'ab-shadowblade-shadowedge': 0.5, 'ab-shadowblade-smoke': 1, 'ab-shadowblade-step': 2, 'ab-shadowblade-strike': 2,
    'ab-shadowblade-venom': 2, 'ab-shield': 1.5, 'ab-shot': 6, 'ab-slash': 0.5,
    'ab-stab': 1.5, 'ab-taunt': 4, 'ab-thermist-auto': 2, 'ab-thermist-bleed': 1,
    'ab-thermist-cinder': -1.5, 'ab-thermist-equil': -0.5, 'ab-thermist-flare': -2.5, 'ab-thermist-invert': -1.5,
    'ab-thermist-lance': -1, 'ab-thermist-shock': -2.5, 'ab-thermist-thermocline': -1.5, 'ab-thermist-zero': -2,
    'ab-thread': 4, 'ab-threadweaver-auto': 8, 'ab-threadweaver-cradle': -0.5, 'ab-threadweaver-embroider': 0.5,
    'ab-threadweaver-mend': -1, 'ab-threadweaver-needle': 3.5, 'ab-threadweaver-shuttle': 0.5, 'ab-threadweaver-snip': 5,
    'ab-threadweaver-tapestry': 1, 'ab-threadweaver-tie': 1, 'ab-time': -0.5, 'ab-wind': 5.5,
    'amb-fountain': -11, 'amb-pond': -16.5, 'amb-tavern': -13, 'amb-town': -18.5,
    'arrival': -8, 'bm-grubnak-belly-flop': -1, 'bm-grubnak-butchers-charge': -0.5, 'bm-grubnak-chop-chop': 1,
    'bm-grubnak-cleaver-toss': 1.5, 'bm-grubnak-clogged-drains': 3.5, 'bm-grubnak-dinner-rush': 3.5, 'bm-grubnak-double-chop': 1,
    'bm-grubnak-family-meal': 0.5, 'bm-grubnak-flambe': -0.5, 'bm-grubnak-flare-up': -1.5, 'bm-grubnak-gorge': 2,
    'bm-grubnak-grease-fire': 0.5, 'bm-grubnak-intro': -1, 'bm-grubnak-ladle-spin': 4, 'bm-grubnak-larder-toss': 2.5,
    'bm-grubnak-lid-slam': -1.5, 'bm-grubnak-meat-toss': 1.5, 'bm-grubnak-mince': 1.5, 'bm-grubnak-mise-en-place': 4,
    'bm-grubnak-order-up': -3, 'bm-grubnak-rolling-meatballs': 2.5, 'bm-grubnak-service': -1, 'bm-grubnak-simmer': 2,
    'bm-grubnak-spice-rack': 0.5, 'bm-grubnak-stockpot': 1.5, 'bm-grubnak-tenderize': 1, 'bm-grubnak-whisk': 7,
    'bm-hollowking-barrow-bells': -1.5, 'bm-hollowking-barrow-knell': 1.5, 'bm-hollowking-coffin-lids': 2, 'bm-hollowking-court-of-bones': 1.5,
    'bm-hollowking-crown-of-graves': 3.5, 'bm-hollowking-dirge': 0.5, 'bm-hollowking-echo-knights': 4.5, 'bm-hollowking-funeral-march': 0.5,
    'bm-hollowking-grave-cleave': 0.5, 'bm-hollowking-grave-marks': 4, 'bm-hollowking-gravebind': 2.5, 'bm-hollowking-intro': 1.5,
    'bm-hollowking-judgement': 0.5, 'bm-hollowking-lantern': 8.5, 'bm-hollowking-lights-out': 2, 'bm-hollowking-royal-audience': -1.5,
    'bm-hollowking-royal-decree': -1, 'bm-hollowking-royal-doom': 1, 'bm-hollowking-royal-gaze': -1.5, 'bm-hollowking-sceptre-sweep': 3.5,
    'bm-hollowking-the-charge-sheet': 1.5, 'bm-hollowking-the-king-rises': -1, 'bm-hollowking-the-long-night': 1.5, 'bm-hollowking-writ-of-execution': 1.5,
    'bm-skitterra-acid-deluge': 0.5, 'bm-skitterra-brood': 4.5, 'bm-skitterra-ceiling-ambush': 1, 'bm-skitterra-chrysalis': 4,
    'bm-skitterra-egg-sacs': 1.5, 'bm-skitterra-eightfold-lunge': 1.5, 'bm-skitterra-fang-rush': 2, 'bm-skitterra-from-the-dark': 2,
    'bm-skitterra-into-the-dark': 2, 'bm-skitterra-intro': -1, 'bm-skitterra-molt': 3, 'bm-skitterra-silk-lines': 3.5,
    'bm-skitterra-silk-reel': 3.5, 'bm-skitterra-silk-wrap': 2.5, 'bm-skitterra-snare-weave': 2, 'bm-skitterra-spiderlings': 11,
    'bm-skitterra-spin': 8, 'bm-skitterra-spinneret-volley': 16, 'bm-skitterra-strand-reel': 5.5, 'bm-skitterra-the-swarm': 11.5,
    'bm-skitterra-the-web-gives-way': 0.5, 'bm-skitterra-tightening-web': 2, 'bm-skitterra-venom-drip': 4, 'bm-skitterra-venom-mist': -1.5,
    'bm-skitterra-venom-spit': 4, 'bm-volkar-avalanche': 0.5, 'bm-volkar-ball-lightning': 1.5, 'bm-volkar-chain-lightning': 3,
    'bm-volkar-distant-thunder': 4, 'bm-volkar-eye-closes': 2, 'bm-volkar-eye-of-the-storm': 4.5, 'bm-volkar-gale-slam': 4,
    'bm-volkar-gathering-storm': 0.5, 'bm-volkar-grounding-rods': 3, 'bm-volkar-heavens-fall': -1, 'bm-volkar-intro': -1.5,
    'bm-volkar-lightning-rods': 9, 'bm-volkar-polarity-minus': 3, 'bm-volkar-polarity-plus': 3, 'bm-volkar-polarity-surge': 1.5,
    'bm-volkar-pulse': 4.5, 'bm-volkar-rod-strike': 1.5, 'bm-volkar-skyfall': -0.5, 'bm-volkar-squall-line': 3,
    'bm-volkar-static-field': 5, 'bm-volkar-still-air': 3, 'bm-volkar-storm-walls': 2, 'bm-volkar-supercell': 2,
    'bm-volkar-thunder-crash': 1, 'bm-volkar-thunderclap': 1.5, 'bm-volkar-thunderhead': 2.5, 'bm-volkar-titan-fist': -1.5,
    'boss-death': -2.5, 'boss-enrage': -2.5, 'boss-impact-heavy': 0.5, 'boss-impact-light': 7,
    'boss-intro': -1.5, 'buff-on': -0.5, 'chest-drop': 3.5, 'chest-open': -5,
    'cleanse': -5, 'clear': -4.5, 'crit': 4, 'dash': 6.5,
    'debuff-on': -1, 'dummy-hit': 3, 'emote-cheer': -6.5, 'emote-laugh': -2,
    'emote-wave': 2, 'fish-bite': 3, 'fish-cast': 1.5, 'fish-catch': -3,
    'fish-lost': -0.5, 'fish-reel': -0.5, 'heal-land': -2.5, 'hit-heavy': 5,
    'hit-light': 9, 'lb-fire': -1.5, 'lb-ready': -5, 'loot-take': -2,
    'low-hp': -4.5, 'npc-talk': -6, 'ping': 2.5, 'portal-enter': -3,
    'portal-hum': -22.5, 'pull-count': 0.5, 'pull-count-last': -3.5, 'pull-go': -2,
    'revive': -2, 'shield-break': 5, 'shield-up': -4, 'step-grass': 8,
    'step-stone': 8.5, 'step-wood': 1.5, 'story-page': 3.5, 'tg-aoe': 1.5,
    'tg-buster': 1, 'tg-charge': 0.5, 'tg-gaze': 0.5, 'tg-knockback': 2.5,
    'tg-raidwide': -0.5, 'tg-spread': 5.5, 'tg-stack': 1.5, 'title-sting': -3,
    'ui-bounty': 0.5, 'ui-buy': -6, 'ui-click': 2, 'ui-close': -0.5,
    'ui-equip': -2.5, 'ui-error': -3, 'ui-feat': -7, 'ui-gold': -4,
    'ui-hover': 13, 'ui-secret': -6, 'ult-alembist': 0.5, 'ult-bastion': 1.5,
    'ult-bloodreaver': 1, 'ult-driftblade': 6.5, 'ult-fire': -1.5, 'ult-gorgemaw': 1,
    'ult-grovekeeper': 2.5, 'ult-marionettist': 0.5, 'ult-oathbroker': -1, 'ult-pyromancer': -1,
    'ult-ranger': 3, 'ult-ready': -4, 'ult-runeguard': -1, 'ult-shadowblade': 4,
    'ult-thermist': -1, 'ult-threadweaver': -1, 'waymark': 11.5, 'wipe': -2,
  };
  // @@TRIM-END

  // ============================================================================================== 1. interface
  def('ui-click', 'ui', S => {
    S.wood({ f: S.rr(820, 1000), dur: 0.06, peak: 0.45, lp: 5000 });
    S.tone({ f: 190, f1: 150, dur: 0.05, peak: 0.22, lp: 900 });
  });
  def('ui-hover', 'ui', S => { S.wood({ f: S.rr(1900, 2300), dur: 0.03, peak: 0.14, hp: 900 }); });
  def('ui-open', 'ui', S => {
    S.noise({ color: 'pink', bp: 1300, bp1: 3200, q: 0.9, dur: 0.18, pts: [[0.05, 0.5], [0.1, 1], [0.18, 0]], peak: 0.32, grain: 0.5 });
    S.tone({ at: 0.11, f: 150, f1: 110, dur: 0.07, peak: 0.22, lp: 600 });
    S.noise({ at: 0.1, bp: 4500, q: 1.5, dur: 0.05, peak: 0.07 });
  });
  def('ui-close', 'ui', S => {
    S.noise({ color: 'pink', bp: 3200, bp1: 1200, q: 0.9, dur: 0.16, pts: [[0.04, 1], [0.1, 0.5], [0.16, 0]], peak: 0.3, grain: 0.5 });
    S.tone({ at: 0.09, f: 130, f1: 90, dur: 0.08, peak: 0.26, lp: 500 });
    S.wood({ at: 0.09, f: 420, dur: 0.05, peak: 0.12, lp: 1800 });
  });
  def('ui-error', 'ui', S => {
    S.thud({ f: 170, f1: 95, dur: 0.14, peak: 0.45, lp: 700, click: 0.25, clickF: 1200 });
    S.wood({ f: 310, dur: 0.1, peak: 0.22, lp: 1500 });
    S.thud({ at: 0.085, f: 130, f1: 80, dur: 0.16, peak: 0.4, lp: 600, click: 0.2, clickF: 1000 });
  });
  def('ui-gold', 'ui', S => { S.coins({ n: 2 + S.vi(2), f: 3600, spread: 0.12, peak: 0.3 }); });
  def('ui-buy', 'ui', S => {
    S.coins({ n: 6, f: 3400, spread: 0.2, peak: 0.24 });
    S.noise({ at: 0.2, color: 'brown', lp: 500, dur: 0.12, a: 0.004, peak: 0.45 });
    S.thud({ at: 0.2, f: 140, f1: 90, dur: 0.1, peak: 0.25, click: 0 });
    S.noise({ at: 0.27, color: 'pink', bp: 2400, bp1: 4200, q: 2, dur: 0.1, peak: 0.08 });
  });
  def('ui-equip', 'ui', S => {
    S.noise({ color: 'pink', bp: 2200, q: 0.8, dur: 0.14, pts: [[0.04, 1], [0.14, 0]], grain: 0.4, peak: 0.25 });
    S.metal({ at: 0.05, set: 'bar', f: 2400, dur: 0.09, peak: 0.2 });
    S.metal({ at: 0.11, set: 'bar', f: 3100, dur: 0.07, peak: 0.13 });
    S.thud({ at: 0.04, f: 200, f1: 130, dur: 0.07, peak: 0.2, click: 0 });
  });
  def('ui-feat', 'ui', S => {
    S.space('room', 0.35);
    [0, 4, 7, 12].forEach((n, i) => S.partials({ at: i * 0.075, set: 'hand', f: mf(72 + n), dur: 1.0 - i * 0.1, peak: 0.2 }));
    S.pad({ notes: [mf(60), mf(67)], type: 'tri', dur: 1.1, a: 0.2, peak: 0.07, lp: 1500 });
  });
  def('ui-secret', 'ui', S => {
    S.space('hall', 0.4);
    [0, 6, 11, 14, 18].forEach((n, i) => S.glass({ at: i * 0.11, f: mf(74 + n), dur: 1.2, peak: 0.12, am: [7, 0.4] }));
    S.noise({ hp: 5000, dur: 1.2, pts: [[0.5, 1], [1.2, 0]], peak: 0.05 });
    S.tone({ f: mf(50), dur: 1.3, a: 0.4, swell: true, peak: 0.06, vib: [0.8, 0.01] });
  });
  def('ui-bounty', 'ui', S => {
    S.scrape({ f: 3200, q: 1.5, dur: 0.12, peak: 0.2, rate: 45, pts: [[0.02, 1], [0.12, 0]] });
    S.scrape({ at: 0.16, f: 3600, q: 1.5, dur: 0.09, peak: 0.16, rate: 55, pts: [[0.02, 1], [0.09, 0]] });
    S.wood({ at: 0.28, f: 1400, dur: 0.04, peak: 0.12 });
    S.coins({ at: 0.32, n: 1, f: 3800, peak: 0.28 });
  });
  def('title-sting', 'sting', S => {
    S.space('hall', 0.5);
    S.pad({ notes: [mf(38), mf(45), mf(52), mf(53), mf(57)], dur: 3.0, lpEnv: [250, 1500, 300, 1.2], pts: [[1.0, 1], [1.7, 0.8], [3.0, 0]], peak: 0.32, det: 9, vib: [0.25, 0.002] });
    S.rumble({ dur: 2.6, f: 120, peak: 0.16, a: 1.0 });
    S.bell({ at: 0.9, f: mf(50), dur: 2.4, peak: 0.08, lp: 1800 });
    S.noise({ hp: 3500, dur: 1.4, pts: [[1.0, 1], [1.4, 0]], peak: 0.03 });
  });
  def('story-page', 'ui', S => {
    S.noise({ color: 'pink', bp: 1800, bp1: 4500, q: 0.7, dur: 0.32, pts: [[0.12, 0.4], [0.2, 1], [0.32, 0]], peak: 0.3, grain: 0.6 });
    S.noise({ at: 0.2, bp: 5000, q: 1, dur: 0.03, peak: 0.09 });
    S.whoosh({ f: 300, f1: 800, dur: 0.3, peak: 0.12 });
  });

  // ============================================================================================== 2. town
  def('npc-talk', 'town', S => {
    const base = [118, 168, 212][S.vi(3)], n = 3 + Math.floor(S.r() * 3), vows = ['a', 'o', 'e', 'u', 'i'];
    let t = 0;
    for (let i = 0; i < n; i++) {
      const d = S.rr(0.07, 0.13), last = i === n - 1;
      S.voice({ at: t, f: base * S.rr(0.95, 1.12), f1: base * (last ? S.rr(0.78, 0.88) : S.rr(0.88, 1.05)), dur: last ? d * 1.4 : d, vowel: S.pick(vows), vowel1: S.pick(vows), peak: 0.32, lp: 1800 });
      t += d + S.rr(0.015, 0.05);
    }
  });
  def('arrival', 'town', S => {
    S.space('room', 0.3);
    for (let i = 0; i < 7; i++) S.wood({ at: i * 0.17 + S.rr(0, 0.02), f: S.rr(260, 340), dur: 0.09, peak: 0.24 - i * 0.015, lp: 2000 });
    S.rumble({ dur: 1.35, f: 170, peak: 0.16, a: 0.15, grain: 0.3 });
    S.creak({ at: 0.1, dur: 1.1, f: 18, f1: 12, res: [520, 1100], q: 10, peak: 0.07 });
    [62, 65, 69, 74].forEach((n, i) => S.pluck({ at: 1.25 + i * 0.16, f: mf(n), dur: i === 3 ? 1.4 : 0.8, peak: 0.2, bright: 6, rev: 0.4 }));
  });
  def('portal-enter', 'sting', S => {
    S.space('hall', 0.55);
    S.whoosh({ f: 250, f1: 3500, dur: 0.55, peakAt: 0.9, peak: 0.45, q: 1.5 });
    S.tone({ f: 200, f1: 800, dur: 0.52, a: 0.45, swell: true, peak: 0.08, lp: 2000 });
    S.thud({ at: 0.48, f: 75, f1: 32, dur: 1.4, pd: 0.5, peak: 0.65, drive: 2 });
    S.rumble({ at: 0.48, dur: 1.6, f: 140, peak: 0.28, a: 0.05 });
    S.glass({ at: 0.5, f: 1320, dur: 1.4, peak: 0.07 });
  });
  def('fish-cast', 'town', S => {
    S.whoosh({ f: 1800, f1: 5500, q: 3, dur: 0.2, peakAt: 0.7, peak: 0.3 });
    for (let i = 0; i < 14; i++) S.wood({ at: 0.05 + i * 0.022, f: 3400, dur: 0.015, peak: 0.06, hp: 1500 });
    S.bubbles({ at: 0.75, n: 1, f: 500, f1: 600, size: 0.05, peak: 0.22 });
    S.noise({ at: 0.75, color: 'pink', lp: 1500, dur: 0.1, peak: 0.1 });
  });
  def('fish-bite', 'town', S => {
    S.bubbles({ n: 1, f: 600, f1: 700, size: 0.05, peak: 0.3 });
    S.noise({ color: 'pink', lp: 2000, dur: 0.12, a: 0.002, peak: 0.18 });
    [0.15, 0.3, 0.45].forEach((at, i) => S.bubbles({ at, n: 1, f: 900, f1: 1100, size: 0.03, peak: 0.1 / (i + 1) }));
    S.pluck({ at: 0.05, f: 180, dur: 0.25, peak: 0.1, bright: 4 });
  });
  def('fish-reel', 'town', S => {
    let t = 0;
    for (let i = 0; i < 16; i++) { S.wood({ at: t, f: 3000, dur: 0.018, peak: 0.1, hp: 1200 }); S.metal({ at: t, set: 'bar', f: 4200, dur: 0.02, peak: 0.03, click: 0 }); t += 0.045 - i * 0.0015; }
    S.tone({ f: 900, dur: t, a: 0.1, peak: 0.03, vib: [9, 0.01] });
  });
  def('fish-catch', 'town', S => {
    S.noise({ bp: 900, bp1: 2500, q: 0.6, dur: 0.35, pts: [[0.02, 1], [0.35, 0]], peak: 0.42 });
    S.bubbles({ at: 0.05, n: 10, f: 700, f1: 2400, spread: 0.5, size: 0.025, peak: 0.12 });
    S.thud({ f: 120, f1: 60, dur: 0.15, peak: 0.25, click: 0 });
    S.pluck({ at: 0.35, f: mf(79), dur: 0.5, peak: 0.08, rev: 0.3 }); S.pluck({ at: 0.45, f: mf(84), dur: 0.6, peak: 0.08, rev: 0.3 });
  });
  def('fish-lost', 'town', S => {
    S.pluck({ f: 160, bend: -6, dur: 0.55, peak: 0.25, bright: 5 });
    S.whoosh({ f: 600, f1: 280, dur: 0.32, peak: 0.12 });
    S.noise({ at: 0.25, color: 'pink', lp: 1200, dur: 0.2, pts: [[0.03, 1], [0.2, 0]], peak: 0.1 });
  });
  def('emote-cheer', 'town', S => {
    [67, 71, 74, 79].forEach((n, i) => S.pluck({ at: i * 0.06, f: mf(n), dur: 0.4 + i * 0.1, peak: 0.16, rev: 0.25 }));
    S.coins({ at: 0.05, n: 4, f: 5000, spread: 0.2, peak: 0.08 });
    S.whoosh({ f: 800, f1: 2600, dur: 0.3, peak: 0.1 });
  });
  def('emote-laugh', 'town', S => {
    [72, 69, 72, 69, 65].forEach((n, i) => S.pluck({ at: i * 0.09, f: mf(n), dur: 0.18, peak: 0.18 - i * 0.02, bright: 3 }));
  });
  def('emote-wave', 'town', S => {
    S.whoosh({ f: 700, f1: 1800, dur: 0.35, peak: 0.25 });
    S.glass({ at: 0.2, f: 1760, dur: 0.6, peak: 0.07 });
  });
  def('dummy-hit', 'town', S => {
    S.thud({ f: 120, f1: 65, dur: 0.14, peak: 0.55, click: 0.3, clickF: 1500 });
    S.noise({ color: 'pink', bp: 2600, q: 0.7, dur: 0.18, pts: [[0.01, 1], [0.18, 0]], grain: 0.8, peak: 0.28 });
    S.wood({ at: 0.01, f: 260, dur: 0.1, peak: 0.2, lp: 1500 });
    S.creak({ at: 0.05, dur: 0.25, f: 25, f1: 15, res: [700, 1400], q: 9, peak: 0.05 });
  });
  def('step-grass', 'step', S => {
    S.noise({ color: 'pink', bp: S.rr(2200, 3200), q: 0.8, dur: 0.07, pts: [[0.01, 1], [0.07, 0]], grain: 0.7, peak: 0.2 });
    S.noise({ color: 'brown', lp: 400, dur: 0.05, peak: 0.12 });
  });
  def('step-stone', 'step', S => {
    S.noise({ hp: 2000, dur: 0.03, a: 0.001, peak: 0.12 });
    S.tone({ f: S.rr(300, 360), f1: 250, dur: 0.035, peak: 0.12 });
    S.noise({ color: 'pink', bp: 900, q: 1, dur: 0.05, peak: 0.1, grain: 0.5 });
  });
  def('step-wood', 'step', S => {
    S.wood({ f: S.rr(200, 260), dur: 0.09, peak: 0.28, lp: 1800 });
    S.tone({ f: 110, f1: 90, dur: 0.06, peak: 0.12 });
  });

  // ============================================================================================== 3. combat, shared
  def('pull-count', 'hud', S => {
    S.drum({ f: 120, dur: 0.35, peak: 0.5 });
    S.wood({ f: 1800, dur: 0.02, peak: 0.12 });
  });
  def('pull-count-last', 'hud', S => {
    S.space('hall', 0.3);
    S.drum({ f: 85, dur: 0.6, peak: 0.7, sub: 0.3 });
    S.wood({ f: 1500, dur: 0.03, peak: 0.15 });
  });
  def('pull-go', 'imp', S => {
    S.space('hall', 0.45);
    S.drum({ f: 62, dur: 1.3, peak: 0.75, drive: 1.5, sub: 0.4 });
    S.horn({ at: 0.02, f: mf(45), dur: 1.5, peak: 0.32 });
    S.horn({ at: 0.04, f: mf(52), dur: 1.4, peak: 0.12 });
    S.rumble({ dur: 1.4, f: 120, peak: 0.18, a: 0.05 });
  });
  def('hit-light', 'imp', S => {
    S.thud({ f: S.rr(140, 165), f1: 70, dur: 0.12, peak: 0.5, click: 0.3 });
    S.noise({ color: 'pink', lp: 1600, dur: 0.06, a: 0.001, peak: 0.28 });
    S.noise({ color: 'pink', bp: 3000, dur: 0.04, peak: 0.07 });
  });
  def('hit-heavy', 'imp', S => {
    S.thud({ f: 110, f1: 38, dur: 0.4, peak: 0.65, drive: 2 });
    S.noise({ bp: 900, q: 0.8, dur: 0.18, grain: 0.6, a: 0.001, peak: 0.38 });
    S.metal({ set: 'plate', f: 520, dur: 0.25, peak: 0.08 });
    S.rumble({ dur: 0.5, f: 150, peak: 0.2, a: 0.01 });
  });
  def('death', 'sting', S => {
    S.space('hall', 0.5);
    S.thud({ f: 85, f1: 35, dur: 0.6, lp: 500, peak: 0.6 });
    S.pad({ at: 0.1, notes: [mf(57), mf(60), mf(64)], type: 'tri', bend: -5, dur: 2.4, a: 0.05, lpEnv: [1200, 900, 250, 0.3], peak: 0.16 });
    S.whoosh({ f: 900, f1: 200, dur: 0.9, peak: 0.1, peakAt: 0.2 });
  });
  def('revive', 'sting', S => {
    S.space('hall', 0.5);
    S.pad({ notes: [mf(55), mf(62), mf(67), mf(74)], type: 'saw', bend0: -7, bendT: 0.7, dur: 1.8, a: 0.7, lpEnv: [400, 2600, 900, 0.9], pts: [[0.8, 1], [1.8, 0]], peak: 0.2 });
    [79, 83, 86, 91].forEach((n, i) => S.glass({ at: 0.5 + i * 0.08, f: mf(n), dur: 1.0, peak: 0.08 }));
    S.whoosh({ f: 300, f1: 2500, dur: 0.8, peakAt: 0.85, peak: 0.18 });
  });
  def('crit', 'ab', S => {
    S.metal({ set: 'bar', f: S.rr(2600, 3000), dur: 0.35, peak: 0.25 });
    S.noise({ hp: 3500, dur: 0.05, a: 0.0005, peak: 0.35 });
    S.glass({ f: 4200, dur: 0.3, peak: 0.08 });
  });
  def('dash', 'ab', S => {
    const v = S.vi(2);
    S.whoosh({ f: v ? 1400 : 500, f1: v ? 450 : 2600, q: 1, dur: 0.26, peakAt: 0.5, peak: 0.45, am: [28, 0.25] });
    S.noise({ at: 0.2, color: 'pink', bp: 1500, dur: 0.05, peak: 0.08, grain: 0.5 });
  });
  def('heal-land', 'hud', S => {
    S.space('room', 0.3);
    S.partials({ set: 'hand', f: mf(79), dur: 0.9, peak: 0.2 });
    S.partials({ at: 0.07, set: 'hand', f: mf(84), dur: 1.0, peak: 0.16 });
    S.noise({ hp: 6000, dur: 0.6, pts: [[0.2, 1], [0.6, 0]], peak: 0.04 });
  });
  def('shield-up', 'hud', S => {
    S.space('room', 0.3);
    [0, 4, 7, 11, 14].forEach((n, i) => S.glass({ at: i * 0.04, f: mf(84 + n), dur: 0.7, peak: 0.1 }));
    S.noise({ hp: 6000, dur: 0.6, pts: [[0.3, 1], [0.6, 0]], peak: 0.1 });
    S.tone({ f: 400, f1: 800, dur: 0.4, a: 0.3, swell: true, peak: 0.06 });
  });
  def('shield-break', 'imp', S => {
    S.thud({ f: 140, f1: 60, dur: 0.2, peak: 0.4 });
    S.noise({ hp: 3000, dur: 0.06, a: 0.0005, peak: 0.35 });
    for (let i = 0; i < 10; i++) S.glass({ at: Math.pow(S.r(), 1.5) * 0.25, f: S.rr(2200, 6500), dur: S.rr(0.25, 0.5), peak: 0.08, pan: S.rr(-0.5, 0.5) });
    S.noise({ hp: 5000, dur: 0.4, grain: 0.8, pts: [[0.02, 1], [0.4, 0]], peak: 0.15 });
  });
  def('buff-on', 'hud', S => {
    S.pad({ notes: [mf(62), mf(69)], lpEnv: [400, 2400, 900, 0.4], dur: 0.8, a: 0.25, peak: 0.18 });
    S.whoosh({ f: 500, f1: 2500, dur: 0.5, peak: 0.14 });
    S.partials({ at: 0.25, set: 'hand', f: mf(81), dur: 0.7, peak: 0.1 });
  });
  def('debuff-on', 'hud', S => {
    S.space('room', 0.4);
    S.pad({ notes: [mf(38), mf(44), mf(45)], bend: -2, a: 0.01, dur: 0.8, lpEnv: [900, 700, 250, 0.1], peak: 0.3, drive: 1.5, swell: false });
    S.noise({ bp: 2000, q: 2, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.12 });
    S.thud({ f: 90, f1: 45, dur: 0.3, peak: 0.35 });
  });
  def('cleanse', 'hud', S => {
    S.noise({ hp: 2000, hp1: 9000, dur: 0.6, pts: [[0.1, 1], [0.6, 0]], peak: 0.2 });
    S.glass({ at: 0.05, f: mf(88), dur: 0.6, peak: 0.1 }); S.glass({ at: 0.12, f: mf(93), dur: 0.6, peak: 0.08 });
    S.whoosh({ f: 800, f1: 4000, dur: 0.5, peak: 0.15 });
  });
  def('lb-ready', 'hud', S => {
    S.space('hall', 0.4);
    [72, 76, 79, 84, 88, 91].forEach((n, i) => S.glass({ at: i * 0.07, f: mf(n), dur: 1, peak: 0.11 }));
    S.noise({ hp: 4000, dur: 1, pts: [[0.6, 1], [1.0, 0]], peak: 0.1 });
    S.pad({ notes: [mf(60), mf(67)], type: 'tri', a: 0.5, dur: 1.3, peak: 0.1 });
  });
  def('lb-fire', 'imp', S => {
    S.space('hall', 0.5);
    S.whoosh({ f: 200, f1: 3000, dur: 0.3, peakAt: 0.95, peak: 0.4 });
    S.thud({ at: 0.28, f: 70, f1: 28, dur: 1.6, drive: 3, peak: 0.75, sub: 0.3 });
    S.crack({ at: 0.28, f: 2000, peak: 0.45 });
    S.metal({ at: 0.28, set: 'plate', f: 300, dur: 1.2, peak: 0.13 });
    S.rumble({ at: 0.28, dur: 2, f: 150, peak: 0.32, a: 0.05 });
    S.pad({ at: 0.28, notes: [mf(50), mf(57), mf(62), mf(66)], a: 0.02, swell: false, dur: 1.6, lpEnv: [3000, 2000, 400, 0.1], peak: 0.2 });
    S.noise({ at: 0.3, hp: 6000, dur: 1.0, grain: 0.7, pts: [[0.05, 1], [1.0, 0]], peak: 0.08 });
  });
  def('ping', 'hud', S => {
    S.tone({ f: 1320, fm: [2, 1.5, 0.1], dur: 0.18, peak: 0.28 });
    S.tone({ f: 1980, dur: 0.12, peak: 0.08 });
  });
  def('waymark', 'hud', S => {
    S.wood({ f: 1500, dur: 0.04, peak: 0.3 });
    S.scrape({ at: 0.02, f: 3800, q: 2, dur: 0.07, rate: 60, peak: 0.14, pts: [[0.01, 1], [0.07, 0]] });
  });
  def('clear', 'sting', S => {
    S.space('hall', 0.45);
    const H = (at, n, d, pk) => S.horn({ at, f: mf(n), dur: d, peak: pk });
    S.drum({ f: 70, dur: 0.9, peak: 0.55 }); S.drum({ at: 0.6, f: 75, dur: 0.6, peak: 0.4 });
    H(0, 62, 0.3, 0.26); H(0.3, 69, 0.3, 0.26); H(0.6, 74, 0.95, 0.28);
    H(1.55, 72, 0.27, 0.24); H(1.82, 74, 0.27, 0.24);
    H(2.1, 78, 2.3, 0.26); H(2.1, 74, 2.3, 0.16); H(2.1, 66, 2.3, 0.14);
    S.drum({ at: 2.1, f: 60, dur: 1.4, peak: 0.6, sub: 0.3 });
    [86, 90, 93].forEach((n, i) => S.partials({ at: 2.1 + i * 0.05, set: 'hand', f: mf(n), dur: 2.0, peak: 0.07 }));
    S.pad({ at: 2.1, notes: [mf(50), mf(57), mf(62), mf(66)], type: 'tri', dur: 2.9, a: 0.4, lp: 1600, peak: 0.12 });
    S.noise({ at: 1.4, hp: 5000, dur: 2.2, pts: [[0.7, 1], [2.2, 0]], peak: 0.06 });
  });
  def('wipe', 'sting', S => {
    S.space('hall', 0.6);
    S.pad({ notes: [mf(38), mf(45), mf(48), mf(53)], bend: -1, a: 0.4, dur: 3.2, lpEnv: [700, 600, 180, 0.5], peak: 0.3 });
    S.drum({ f: 58, dur: 1.4, peak: 0.5, sub: 0.3 });
    S.choir({ at: 0.2, notes: [mf(50), mf(53), mf(57)], vowel: 'u', dur: 3.0, a: 0.8, peak: 0.1 });
  });
  def('chest-drop', 'imp', S => {
    S.thud({ f: 75, f1: 32, dur: 0.45, drive: 1.5, peak: 0.7 });
    S.wood({ f: 170, dur: 0.25, peak: 0.35, lp: 1800 });
    S.metal({ set: 'plate', f: 380, dur: 0.4, peak: 0.1 });
    S.noise({ color: 'brown', lp: 900, dur: 0.5, grain: 0.7, pts: [[0.02, 1], [0.5, 0]], peak: 0.22 });
    S.thud({ at: 0.16, f: 90, f1: 50, dur: 0.18, peak: 0.25 });
  });
  def('chest-open', 'ui', S => {
    S.space('room', 0.3);
    S.creak({ dur: 0.7, f: 22, f1: 9, res: [430, 900, 1700], q: 14, peak: 0.28 });
    [84, 88, 91, 96].forEach((n, i) => S.glass({ at: 0.55 + i * 0.06, f: mf(n), dur: 0.8, peak: 0.09 }));
    S.whoosh({ at: 0.5, f: 1000, f1: 5000, dur: 0.6, peak: 0.1 });
    S.noise({ at: 0.55, hp: 6000, dur: 0.8, grain: 0.9, pts: [[0.1, 1], [0.8, 0]], peak: 0.06 });
  });
  def('loot-take', 'ui', S => {
    S.whoosh({ f: 1200, f1: 3000, dur: 0.15, peak: 0.2 });
    S.metal({ at: 0.05, set: 'bar', f: 2800, dur: 0.12, peak: 0.12 });
    S.pluck({ at: 0.07, f: mf(76), dur: 0.3, peak: 0.12 }); S.pluck({ at: 0.12, f: mf(83), dur: 0.4, peak: 0.1 });
  });
  def('ult-ready', 'hud', S => {
    S.space('hall', 0.4);
    S.partials({ set: 'hand', f: mf(69), dur: 1.4, peak: 0.2 });
    S.glass({ at: 0.08, f: mf(81), dur: 1, peak: 0.1 }); S.glass({ at: 0.16, f: mf(88), dur: 1, peak: 0.08 });
    S.pad({ notes: [mf(57), mf(64), mf(69)], type: 'tri', a: 0.35, dur: 1.2, peak: 0.12 });
    S.noise({ hp: 5000, dur: 0.8, pts: [[0.4, 1], [0.8, 0]], peak: 0.06 });
  });
  def('ult-fire', 'ult', S => {
    S.space('hall', 0.5);
    S.whoosh({ f: 300, f1: 2800, dur: 0.18, peakAt: 0.9, peak: 0.35 });
    S.thud({ at: 0.15, f: 80, f1: 30, dur: 1.0, drive: 2, peak: 0.65, sub: 0.3 });
    S.crack({ at: 0.15, f: 2500, peak: 0.3 });
    S.pad({ at: 0.15, notes: [mf(45), mf(52), mf(57), mf(61)], a: 0.01, swell: false, dur: 1.2, lpEnv: [3500, 2500, 600, 0.1], peak: 0.2 });
    S.rumble({ at: 0.15, dur: 1.2, f: 140, peak: 0.2, a: 0.05 });
  });
  def('ult-window-end', 'hud', S => {
    [84, 79, 76, 72].forEach((n, i) => S.glass({ at: i * 0.09, f: mf(n), dur: 0.6, peak: 0.08 }));
    S.whoosh({ f: 3000, f1: 500, dur: 0.6, peak: 0.1 });
    S.tone({ f: 600, f1: 300, dur: 0.6, a: 0.05, peak: 0.06 });
  });

  // ---------------------------------------------------------------------------------------------- telegraph cues
  // These carry information: the clearest, most prominent layer of the mix (category 'tg').
  def('tg-raidwide', 'tg', S => {
    S.space('hall', 0.3);
    S.pad({ notes: [mf(33), mf(40), mf(45)], bend: 3, lpEnv: [150, 1400, 900, 1.1], dur: 1.5, pts: [[1.1, 1], [1.5, 0]], peak: 0.38 });
    S.rumble({ dur: 1.45, f: 110, f1: 260, peak: 0.3, pts: [[1.1, 1], [1.45, 0]] });
    S.noise({ hp: 1500, hp1: 5000, dur: 1.35, pts: [[1.15, 1], [1.35, 0]], peak: 0.13 });
  });
  def('tg-buster', 'tg', S => {
    S.thud({ f: 65, f1: 40, dur: 0.35, drive: 2.5, peak: 0.65 });
    S.thud({ at: 0.26, f: 60, f1: 34, dur: 0.5, drive: 2.5, peak: 0.75 });
    S.tone({ type: 'saw', f: 55, lp: 320, dur: 0.75, pts: [[0.02, 1], [0.2, 0.3], [0.28, 1], [0.75, 0]], peak: 0.2 });
    S.metal({ set: 'plate', f: 180, dur: 0.5, peak: 0.1 });
  });
  def('tg-aoe', 'tg', S => {
    S.tone({ f: 900, f1: 2200, glide: 0.18, dur: 0.25, a: 0.02, peak: 0.24 });
    S.noise({ bp: 1500, bp1: 4500, q: 6, dur: 0.22, pts: [[0.15, 1], [0.22, 0]], peak: 0.15 });
    S.tone({ at: 0.18, f: 2200, fm: [1.41, 2, 0.1], dur: 0.45, peak: 0.24 });
  });
  def('tg-stack', 'tg', S => {
    S.space('room', 0.35);
    [67, 71, 74].forEach((n, i) => S.partials({ at: i * 0.08, set: 'hand', f: mf(n), dur: 0.5, peak: 0.14 }));
    [67, 74, 79].forEach(n => S.partials({ at: 0.3, set: 'hand', f: mf(n), dur: 1.1, peak: 0.2 }));
    S.whoosh({ f: 3000, f1: 800, dur: 0.35, peakAt: 0.85, peak: 0.13 });
  });
  def('tg-spread', 'tg', S => {
    for (let i = 0; i < 14; i++) { const a = i * 0.028 + S.rr(0, 0.02); S.wood({ at: a, f: S.rr(1800, 4500), dur: 0.04, peak: 0.24 - i * 0.012, pan: (i % 2 ? 1 : -1) * Math.min(0.8, i * 0.07) }); }
    S.whoosh({ f: 800, f1: 4000, dur: 0.4, peakAt: 0.3, peak: 0.13 });
  });
  def('tg-tower', 'tg', S => {
    S.space('hall', 0.4);
    S.tone({ f: mf(57), fm: [2.0, 1.2, 0.3], dur: 1.4, a: 0.05, peak: 0.25, vib: [5, 0.004, 0.3] });
    S.tone({ f: mf(69), dur: 1.4, a: 0.2, peak: 0.12 });
    S.noise({ bp: mf(57) * 4, q: 20, dur: 1.2, a: 0.1, peak: 0.08 });
  });
  def('tg-gaze', 'tg', S => {
    S.space('cave', 0.4);
    S.voice({ f: 90, dur: 1.0, vowel: 'i', vowel1: 'u', breath: 4, peak: 0.25, lp: 6000, pts: [[0.4, 1], [1.0, 0]] });
    S.noise({ hp: 3000, hp1: 7000, dur: 1.0, pts: [[0.5, 1], [1.0, 0]], peak: 0.14, pan: -0.3 });
    S.tone({ f: 2600, f1: 2400, dur: 1, a: 0.4, swell: true, peak: 0.03 }); S.tone({ f: 2607, f1: 2407, dur: 1, a: 0.4, swell: true, peak: 0.03 });
  });
  def('tg-knockback', 'tg', S => {
    S.noise({ color: 'pink', bp: 400, bp1: 2200, q: 1, dur: 0.7, pts: [[0.6, 1], [0.7, 0]], peak: 0.42 });
    S.tone({ f: 120, f1: 220, dur: 0.65, a: 0.5, swell: true, peak: 0.15 });
    S.thud({ at: 0.62, f: 90, f1: 50, dur: 0.2, peak: 0.4 });
  });
  def('tg-charge', 'tg', S => {
    S.space('hall', 0.2);
    S.rumble({ dur: 1.1, f: 90, f1: 400, peak: 0.42, pts: [[0.95, 1], [1.1, 0]] });
    [0.1, 0.4, 0.62, 0.78, 0.9].forEach((at, i) => S.thud({ at, f: 90, f1: 45, dur: 0.18, peak: 0.25 + i * 0.08 }));
  });
  def('boss-impact-light', 'imp', S => {
    S.thud({ f: 110, f1: 45, dur: 0.3, drive: 1.5, peak: 0.6 });
    S.noise({ bp: 1200, dur: 0.12, grain: 0.5, a: 0.001, peak: 0.3 });
    S.crackle({ lp: 3000, dur: 0.3, pts: [[0.01, 1], [0.3, 0]], peak: 0.15 });
  });
  def('boss-impact-heavy', 'imp', S => {
    S.space('hall', 0.35);
    S.thud({ f: 70, f1: 26, dur: 0.8, drive: 3, peak: 0.8, sub: 0.3 });
    S.crack({ f: 1500, peak: 0.35 });
    S.rumble({ dur: 1.4, f: 140, peak: 0.36, a: 0.02 });
    S.noise({ color: 'brown', lp: 1500, grain: 0.8, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.24 });
    S.metal({ set: 'plate', f: 150, dur: 0.6, peak: 0.07 });
  });
  def('boss-intro', 'sting', S => {
    S.space('hall', 0.5);
    S.drum({ f: 55, dur: 1.5, peak: 0.7, sub: 0.4 });
    S.rumble({ dur: 2.5, f: 120, peak: 0.3, a: 0.8 });
    S.choir({ notes: [mf(33), mf(40), mf(43)], vowel: 'u', vowel1: 'o', dur: 2.6, a: 0.7, peak: 0.18 });
    S.bell({ at: 0.1, f: mf(45), dur: 3, peak: 0.2 });
  });
  def('boss-enrage', 'tg', S => {
    S.pad({ notes: [mf(45), mf(46), mf(51)], bend: 2, lpEnv: [300, 3000, 2500, 1.0], dur: 1.3, a: 1.0, pts: [[1.0, 1], [1.3, 0]], peak: 0.32 });
    S.drum({ at: 1.0, f: 60, dur: 0.6, peak: 0.6, drive: 2 }); S.drum({ at: 1.15, f: 55, dur: 0.9, peak: 0.7, drive: 2 });
    S.crack({ at: 1.15, peak: 0.3 });
  });
  def('boss-death', 'sting', S => {
    S.space('hall', 0.6);
    S.thud({ f: 60, f1: 25, dur: 1.5, drive: 2.5, peak: 0.75, sub: 0.3 });
    S.crack({ peak: 0.35 });
    S.rumble({ dur: 3, f: 130, peak: 0.32, a: 0.05 });
    S.noise({ color: 'brown', lp: 1400, grain: 0.8, dur: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.2 });
    S.pad({ at: 0.2, notes: [mf(45), mf(52), mf(57)], bend: -12, dur: 3, a: 0.1, lpEnv: [1500, 1200, 200, 0.3], peak: 0.18 });
    S.bell({ at: 0.3, f: mf(38), dur: 3.5, peak: 0.2 });
  });

  // ============================================================================================== 4. abilities by kind
  // Each family has 2-3 internal variants (p.variant) plus per-play pitch and timbre jitter.
  def('ab-slash', 'ab', S => {
    const v = S.vi(3), up = [1, 1.22, 0.86][v];
    S.whoosh({ f: 900 * up, f1: 3200 * up, dur: 0.16, peakAt: 0.7, peak: 0.45, q: 1.4 });
    S.metal({ at: 0.03, set: 'bar', f: S.rr(2300, 2900) * up, dur: 0.18, peak: 0.07, click: 0 });
    S.noise({ at: 0.1, color: 'pink', lp: 1800, dur: 0.07, a: 0.001, peak: 0.32 });
    S.thud({ at: 0.1, f: 160, f1: 80, dur: 0.1, peak: 0.3, click: 0.2 });
  });
  def('ab-heavy', 'ab', S => {
    const up = [1, 0.85, 1.15][S.vi(3)];
    S.whoosh({ f: 300 * up, f1: 1300 * up, dur: 0.3, peakAt: 0.8, peak: 0.4, q: 1 });
    S.thud({ at: 0.26, f: 95 * up, f1: 38, dur: 0.45, drive: 2, peak: 0.65 });
    S.noise({ at: 0.26, bp: 700, dur: 0.2, grain: 0.6, a: 0.001, peak: 0.35 });
    S.metal({ at: 0.26, set: 'plate', f: 260 * up, dur: 0.35, peak: 0.07 });
    S.crackle({ at: 0.3, dur: 0.3, f: 2000, pts: [[0.01, 1], [0.3, 0]], peak: 0.1 });
  });
  def('ab-stab', 'ab', S => {
    const up = [1, 1.15, 0.9][S.vi(3)];
    S.whoosh({ f: 2500 * up, f1: 5000 * up, q: 2, dur: 0.09, peak: 0.28 });
    S.noise({ at: 0.05, bp: 3000 * up, bp1: 6500 * up, q: 5, dur: 0.07, pts: [[0.01, 1], [0.07, 0]], peak: 0.25 });
    S.thud({ at: 0.08, f: 220, f1: 100, dur: 0.07, peak: 0.25, click: 0.3 });
    S.metal({ at: 0.05, set: 'bar', f: 4200 * up, dur: 0.1, peak: 0.05, click: 0 });
  });
  def('ab-punch', 'ab', S => {
    const v = S.vi(3), lo = [1, 0.75, 1.2][v];
    S.whoosh({ f: 700 * lo, f1: 1600 * lo, dur: 0.1, peak: 0.25 });
    S.thud({ at: 0.07, f: 170 * lo, f1: 60, dur: 0.12, peak: 0.6, click: 0.5, clickF: 1800 });
    S.noise({ at: 0.07, color: 'pink', bp: 1600, q: 1, dur: 0.03, a: 0.0008, peak: 0.3 });
  });
  def('ab-shot', 'ab', S => {
    const f = S.rr(150, 180) * [1, 1.1, 0.92][S.vi(3)];
    S.pluck({ f, dur: 0.25, bright: 6, peak: 0.3 });
    S.noise({ bp: 1200, q: 4, dur: 0.04, a: 0.0008, peak: 0.15 });
    S.whoosh({ at: 0.03, f: 2500, f1: 5500, q: 2.5, dur: 0.22, peakAt: 0.3, peak: 0.22, am: [90, 0.3] });
  });
  def('ab-fire', 'ab', S => {
    S.space('room', 0.25);
    const v = S.vi(3);
    S.noise({ color: 'pink', lp: 600, lp1: 4000, fd: 0.15, dur: 0.55, pts: [[0.06, 1], [0.2, 0.7], [0.55, 0]], peak: 0.42 });
    S.crackle({ at: 0.05, f: 2500, dur: 0.5, dens: 1.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.22 });
    S.tone({ type: 'saw', f: 70, f1: 50, lp: 300, dur: 0.35, peak: 0.18, drive: 2 });
    S.rumble({ dur: 0.5, f: 400, peak: 0.16, a: 0.05, sub: 0 });
    if (v === 2) { S.thud({ at: 0.18, f: 120, f1: 45, dur: 0.35, peak: 0.45, drive: 1.5 }); S.noise({ at: 0.18, color: 'pink', lp: 2500, dur: 0.25, a: 0.002, peak: 0.25 }); }
  });
  def('ab-frost', 'ab', S => {
    for (let i = 0; i < 4; i++) S.glass({ at: S.rr(0, 0.12), f: S.rr(2500, 5200), dur: 0.5, peak: 0.08, pan: S.rr(-0.3, 0.3) });
    S.noise({ hp: 5000, dur: 0.45, pts: [[0.03, 1], [0.45, 0]], grain: 0.3, peak: 0.2 });
    S.crackle({ f: 3500, dur: 0.25, dens: 1.4, pts: [[0.01, 1], [0.25, 0]], peak: 0.2 });
    S.tone({ f: 1800, f1: 900, dur: 0.3, peak: 0.05 });
    S.whoosh({ f: 400, f1: 900, dur: 0.3, peak: 0.15 });
  });
  def('ab-holy', 'ab', S => {
    S.space('hall', 0.3);
    const root = [84, 86, 81][S.vi(3)];
    [0, 4, 7].forEach((n, i) => S.tone({ at: i * 0.02, f: mf(root + n), fm: [3.5, 1.2, 0.05], dur: 0.9, peak: 0.1 }));
    S.pad({ notes: [mf(root - 12), mf(root - 5)], type: 'sine', a: 0.08, dur: 0.8, peak: 0.1 });
    S.noise({ hp: 6000, dur: 0.6, pts: [[0.1, 1], [0.6, 0]], peak: 0.08 });
    S.whoosh({ f: 1500, f1: 4000, dur: 0.25, peak: 0.12 });
  });
  def('ab-nature', 'ab', S => {
    S.noise({ color: 'pink', bp: 1800, bp1: 2800, q: 0.8, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], grain: 0.7, peak: 0.25 });
    S.wood({ f: S.rr(280, 340), dur: 0.25, peak: 0.3, lp: 2000 });
    const n = [76, 74, 79][S.vi(3)];
    S.tone({ f: mf(n), f1: mf(n + 3), glide: 0.2, dur: 0.45, a: 0.06, peak: 0.1, vib: [5.5, 0.01, 0.1] });
    S.noise({ bp: mf(n), q: 12, dur: 0.4, a: 0.06, peak: 0.05 });
    if (S.vi(3) === 1) S.creak({ at: 0.05, dur: 0.35, f: 30, f1: 15, res: [380, 800], q: 10, peak: 0.08 });
  });
  def('ab-time', 'ab', S => {
    for (let i = 0; i < 4; i++) S.tick({ at: i * 0.085, f: i % 2 ? 2000 : 2400, peak: 0.2 });
    S.noise({ color: 'pink', bp: 1500, bp1: 3500, dur: 0.5, pts: [[0.45, 1], [0.5, 0]], peak: 0.2 });
    S.tone({ at: 0.45, f: mf([81, 79, 84][S.vi(3)]), fm: [1.5, 1, 0.1], dur: 0.7, peak: 0.15, vib: [7, 0.02] });
  });
  def('ab-rune', 'ab', S => {
    const up = [1, 1.12, 0.9][S.vi(3)];
    S.thud({ f: 120 * up, f1: 55, dur: 0.3, peak: 0.4, lp: 900 });
    S.tone({ f: mf(45) * up, fm: [1.41, 3, 0.5], dur: 0.8, a: 0.05, swell: true, peak: 0.2, lp: 1500 });
    S.metal({ set: 'plate', f: 600 * up, dur: 0.6, peak: 0.06, click: 0 });
    S.crackle({ f: 3000, dur: 0.5, pts: [[0.1, 1], [0.5, 0]], peak: 0.1 });
  });
  def('ab-thread', 'ab', S => {
    const f = S.rr(600, 900);
    S.pluck({ f, type: 'tri', dur: 0.3, bright: 5, peak: 0.2 });
    S.noise({ bp: 2500, bp1: 6500, q: 9, dur: 0.18, pts: [[0.1, 1], [0.18, 0]], peak: 0.2 });
    S.noise({ at: 0.16, hp: 3000, dur: 0.015, a: 0.0005, peak: 0.2 });
    S.whoosh({ f: 3000, f1: 5000, q: 3, dur: 0.15, peak: 0.1 });
  });
  def('ab-alchemy', 'ab', S => {
    const v = S.vi(3);
    S.glass({ f: S.rr(2200, 2800), dur: 0.3, peak: 0.24 }); S.glass({ at: 0.05, f: S.rr(3000, 3600), dur: 0.25, peak: 0.12 });
    S.bubbles({ at: 0.05, n: 8, f: 500, f1: 1800, spread: 0.5, peak: 0.12 });
    S.noise({ hp: 4000, grain: 0.9, dur: 0.7, pts: [[0.05, 1], [0.7, 0]], peak: 0.15 });
    if (v === 2) { S.thud({ at: 0.12, f: 200, f1: 70, dur: 0.2, peak: 0.45 }); S.noise({ at: 0.12, color: 'pink', lp: 2500, dur: 0.15, a: 0.001, peak: 0.3 }); }
  });
  def('ab-wind', 'ab', S => {
    const up = [1, 1.2, 0.85][S.vi(3)];
    S.whoosh({ f: 450 * up, f1: 1500 * up, dur: 0.55, peakAt: 0.45, peak: 0.4, q: 0.8, am: [11, 0.3] });
    S.whoosh({ at: 0.1, f: 700 * up, f1: 2200 * up, dur: 0.45, peak: 0.18 });
    S.noise({ bp: 1800 * up, bp1: 2600 * up, q: 25, dur: 0.5, pts: [[0.25, 1], [0.5, 0]], peak: 0.1 });
  });
  def('ab-maw', 'ab', S => {
    const v = S.vi(3);
    S.thud({ f: 130, f1: 50, dur: 0.2, peak: 0.55 });
    S.wood({ f: 1300, dur: 0.03, peak: 0.28 }); S.wood({ at: 0.03, f: 1150, dur: 0.03, peak: 0.22 });
    S.noise({ at: 0.03, color: 'pink', bp: 1200, bp1: 400, q: 4, dur: 0.18, peak: 0.3 });
    if (v > 0) { S.tone({ at: 0.22, f: 210, f1: 90, dur: 0.25, peak: 0.28, lp: 600 }); S.noise({ at: 0.22, color: 'brown', lp: 300, dur: 0.2, peak: 0.2 }); }
  });
  def('ab-ledger', 'ab', S => {
    const v = S.vi(3);
    if (v === 0) { S.thud({ f: 220, f1: 100, dur: 0.09, peak: 0.5, click: 0.5 }); S.wood({ f: 500, dur: 0.1, peak: 0.3 }); S.noise({ color: 'pink', bp: 3000, dur: 0.06, peak: 0.1 }); }
    else if (v === 1) { for (let i = 0; i < 3; i++) S.scrape({ at: i * 0.09, f: 4500, q: 3, rate: 80, dur: 0.07, pts: [[0.01, 1], [0.07, 0]], peak: 0.16 }); S.wood({ at: 0.3, f: 2600, dur: 0.02, peak: 0.12 }); }
    else { S.coins({ n: 3, f: 3400, peak: 0.22 }); S.thud({ at: 0.15, f: 200, f1: 100, dur: 0.08, peak: 0.3 }); }
    S.coins({ at: v === 1 ? 0.32 : 0.1, n: 1, f: 4000, peak: 0.1 });
  });
  def('ab-taunt', 'ab', S => {
    S.space('room', 0.3);
    S.metal({ set: 'plate', f: 420, dur: 0.5, peak: 0.2, strike: 0.3 });
    S.thud({ f: 100, f1: 50, dur: 0.3, peak: 0.5 });
    S.tone({ type: 'saw', f: 75, f1: 65, lp: 500, dur: 0.5, am: [35, 0.6], peak: 0.18, drive: 2 });
  });
  def('ab-heal', 'ab', S => {
    S.space('room', 0.35);
    const base = [79, 77, 81][S.vi(3)];
    [0, 4, 7].forEach((n, i) => S.partials({ at: i * 0.08, set: 'hand', f: mf(base + n), dur: 1, peak: 0.14 }));
    S.pad({ notes: [mf(base - 12), mf(base - 5)], type: 'sine', a: 0.1, dur: 0.9, peak: 0.06 });
    S.noise({ hp: 6000, dur: 0.6, pts: [[0.2, 1], [0.6, 0]], peak: 0.04 });
  });
  def('ab-shield', 'ab', S => {
    [84, 88, 91].forEach((n, i) => S.glass({ at: i * 0.04, f: mf(n), dur: 0.6, peak: 0.09 }));
    S.noise({ hp: 7000, dur: 0.5, pts: [[0.25, 1], [0.5, 0]], peak: 0.07 });
    S.tone({ f: 500, f1: 900, dur: 0.35, a: 0.25, swell: true, peak: 0.05 });
  });
  def('ab-buff', 'ab', S => {
    S.pad({ notes: [mf(62), mf(69)], type: 'tri', lpEnv: [600, 2500, 1000, 0.3], a: 0.2, dur: 0.7, peak: 0.16 });
    S.whoosh({ f: 600, f1: 2400, dur: 0.4, peak: 0.12 });
    S.partials({ at: 0.2, set: 'hand', f: mf(86), dur: 0.6, peak: 0.08 });
  });
  def('ab-dot', 'ab', S => {
    S.noise({ color: 'pink', bp: 900, q: 3, dur: 0.45, grain: 0.6, pts: [[0.05, 1], [0.45, 0]], peak: 0.35 });
    S.tone({ type: 'saw', f: 60, lp: 250, dur: 0.3, am: [9, 0.7], peak: 0.2 });
    S.bubbles({ n: 1, f: 300, f1: 500, peak: 0.1 });
  });
  def('ab-magic-generic', 'ab', S => {
    S.whoosh({ f: 800, f1: 2400, dur: 0.25, peak: 0.3 });
    S.tone({ at: 0.1, f: S.rr(700, 900), fm: [2.76, 2, 0.1], dur: 0.5, peak: 0.15 });
    S.noise({ hp: 5000, grain: 0.9, dur: 0.4, pts: [[0.1, 1], [0.4, 0]], peak: 0.07 });
  });
  def('ab-melee-generic', 'ab', S => {
    S.whoosh({ f: 700, f1: 2000, dur: 0.14, peak: 0.35 });
    S.thud({ at: 0.1, f: 150, f1: 70, dur: 0.12, peak: 0.45 });
    S.noise({ at: 0.1, color: 'pink', lp: 1500, dur: 0.05, peak: 0.2 });
  });
  def('ab-ranged-generic', 'ab', S => {
    S.whoosh({ f: 1800, f1: 4500, q: 2, dur: 0.25, peak: 0.45 });
    S.thud({ at: 0.17, f: 200, f1: 90, dur: 0.08, peak: 0.3 });
    S.noise({ at: 0.17, hp: 2500, dur: 0.04, peak: 0.12 });
  });

  // ---------------------------------------------------------------------------------------------- per-ability voices
  // Every ability has its own recipe, ab-<class>-<ability id>: one or more family layers above, each at its own pitch,
  // offset, level and pinned variant, plus accent layers below for the part of the move that is its own (a meteor's
  // fall, a palm flurry, a rewind's reverse rush). Layer: [name, pitch, at (s), gain, variant]; name is an accent
  // (ACC) or a family ('fire' = ab-fire) or any recipe.
  const ACC = {
    boom: S => { S.thud({ f: 90, f1: 35, dur: 0.4, drive: 2, peak: 0.55 }); S.rumble({ dur: 0.5, f: 160, peak: 0.18, a: 0.01 }); },
    sparkle: S => { for (let i = 0; i < 5; i++) S.glass({ at: S.rr(0, 0.25), f: S.rr(3000, 6000), dur: 0.35, peak: 0.07, pan: S.rr(-0.4, 0.4) }); },
    chime: S => S.partials({ set: 'hand', f: mf(79), dur: 0.8, peak: 0.16 }),
    bell: S => S.bell({ set: 'hand', f: mf(64), dur: 1.2, peak: 0.2 }),
    sizzle: S => S.sizzle({ dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.2 }),
    crackle: S => S.crackle({ f: 2500, dens: 1.4, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.22 }),
    roar: S => S.tone({ type: 'saw', f: 60, f1: 52, lp: 420, am: [17, 0.4], drive: 2.5, dur: 0.6, pts: [[0.1, 1], [0.6, 0]], peak: 0.2 }),
    'whoosh-up': S => S.whoosh({ f: 400, f1: 2400, dur: 0.35, peakAt: 0.8, peak: 0.3 }),
    'whoosh-down': S => S.whoosh({ f: 2400, f1: 400, dur: 0.35, peakAt: 0.3, peak: 0.3 }),
    swirl: S => S.whoosh({ f: 600, f1: 1500, dur: 0.7, peakAt: 0.5, am: [7, 0.6], peak: 0.28 }),
    tick: S => { for (let i = 0; i < 3; i++) S.tick({ at: i * 0.07, f: 2200, peak: 0.18 }); },
    clock: S => { for (let i = 0; i < 5; i++) S.tick({ at: i * 0.13, f: i % 2 ? 1500 : 1800, peak: 0.18 }); S.partials({ at: 0.65, set: 'hand', f: mf(57), dur: 0.9, peak: 0.14 }); },
    ring: S => S.metal({ set: 'bar', f: 1500, dur: 0.5, peak: 0.12 }),
    clang: S => S.metal({ set: 'plate', f: 400, dur: 0.6, peak: 0.22, strike: 0.4 }),
    snap: S => B.snap(S, 0, 1),
    zing: S => B.zing(S, 0, 1, 0),
    creak: S => S.creak({ dur: 0.5, f: 26, f1: 14, res: [500, 1100], q: 10, peak: 0.14 }),
    leaves: S => S.noise({ color: 'pink', bp: 2500, q: 0.8, grain: 0.8, dur: 0.5, pts: [[0.1, 1], [0.5, 0]], peak: 0.2 }),
    drip: S => [0, 0.09, 0.2].forEach((at, i) => S.tone({ at, f: 1100 + i * 260, f1: 2200 + i * 400, glide: 0.03, dur: 0.07, peak: 0.18 })),
    bubble: S => S.bubbles({ n: 8, f: 300, f1: 1200, spread: 0.45, peak: 0.14 }),
    wet: S => S.splat({ peak: 0.4, dur: 0.25 }),
    glassbreak: S => { S.noise({ hp: 3000, dur: 0.05, a: 0.0005, peak: 0.25 }); for (let i = 0; i < 6; i++) S.glass({ at: S.rr(0, 0.15), f: S.rr(2200, 5500), dur: 0.35, peak: 0.07 }); },
    choir: S => S.choir({ notes: [mf(60), mf(67)], vowel: 'a', a: 0.15, dur: 0.9, peak: 0.12 }),
    drone: S => S.tone({ f: mf(38), fm: [1.5, 2, 0.6], dur: 0.9, a: 0.3, swell: true, lp: 900, peak: 0.16 }),
    pulse: S => { S.thud({ f: 70, f1: 42, dur: 0.18, peak: 0.4, click: 0.1, lp: 300 }); S.thud({ at: 0.24, f: 80, f1: 46, dur: 0.15, peak: 0.3, click: 0.1, lp: 300 }); },
    coin: S => S.coins({ n: 2, f: 3600, spread: 0.08, peak: 0.2 }),
    stamp: S => B.stamp(S, 0, 0.9),
    quill: S => { for (let i = 0; i < 2; i++) S.scrape({ at: i * 0.08, f: 4600, q: 3, rate: 85, dur: 0.06, pts: [[0.01, 1], [0.06, 0]], peak: 0.14 }); },
    growl: S => S.tone({ type: 'saw', f: 72, f1: 64, lp: 520, am: [33, 0.6], drive: 2, dur: 0.45, pts: [[0.05, 1], [0.45, 0]], peak: 0.18 }),
    gulp: S => { S.tone({ f: 200, f1: 80, dur: 0.28, lp: 600, peak: 0.28 }); S.noise({ color: 'brown', lp: 300, dur: 0.2, peak: 0.15 }); },
    shimmer: S => S.noise({ hp: 6000, dur: 0.6, pts: [[0.3, 1], [0.6, 0]], peak: 0.1 }),
    frostcrack: S => { S.crackle({ f: 3500, dens: 1.8, dur: 0.3, pts: [[0.01, 1], [0.3, 0]], peak: 0.25 }); S.glass({ f: 4200, dur: 0.4, peak: 0.08 }); },
    thunk: S => S.wood({ f: 420, dur: 0.14, peak: 0.3 }),
    flutter: S => S.whoosh({ f: 700, f1: 1600, dur: 0.4, am: [22, 0.7], peak: 0.25 }),
    puff: S => S.noise({ color: 'pink', lp: 1800, lp1: 600, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.3 }),
    hum: S => S.tone({ f: 220, fm: [2, 0.8, 0.2], dur: 0.8, a: 0.25, swell: true, peak: 0.12, vib: [5, 0.006] }),
    tear: S => S.noise({ bp: 2600, bp1: 700, q: 3, grain: 0.8, grainRate: 0.6, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.25 }),
    string: S => S.pluck({ f: 440, type: 'tri', dur: 0.45, peak: 0.16 }),
    breath: S => S.noise({ color: 'pink', bp: 800, bp1: 1400, q: 1.2, dur: 0.45, pts: [[0.35, 1], [0.45, 0]], peak: 0.25 }),
  };
  function layer(S, l) {
    const [name, p, at, g, v] = Array.isArray(l) ? l : [l];
    const fn = ACC[name] || FN['ab-' + name] || FN[name];
    if (!fn) throw new Error('no layer ' + name);
    const save = { k: S.k, t0: S.t0, fv: S.forceV, bus: S.bus, rev: S.revDefault, vt: S.verbType };
    const sub = gain(S, g == null ? 1 : g); sub.connect(S.bus);
    S.k = save.k * (p || 1); S.t0 = save.t0 + (at || 0); S.forceV = v; S.bus = sub;
    try { fn(S, S.p); } finally { S.k = save.k; S.t0 = save.t0; S.forceV = save.fv; S.bus = save.bus; S.revDefault = save.rev; S.verbType = save.vt; }
  }
  const ABIL = {
    bastion: {
      blade: [['slash', 1, 0, 1, 0], ['ring', 1.1, 0.1, 0.6]],
      edge: [['holy', 1, 0, 0.8, 0], ['slash', 0.9, 0, 0.8, 1], ['chime', 1.2, 0.1]],
      brace: [['shield', 0.8], ['clang', 0.9, 0, 0.8]],
      oath: [['buff', 0.9, 0, 1, 0], ['choir', 1, 0.05, 0.7], ['bell', 1, 0.1, 0.6]],
      banner: [['buff', 1.1, 0, 1, 1], ['flutter', 0.8], ['boom', 1.2, 0.15, 0.6]],
      bulwark: [['shield', 0.7], ['boom', 0.8, 0, 0.8], ['hum', 0.7, 0.05]],
      bash: [['heavy', 1.2, 0, 1, 0], ['clang', 1.1, 0.2]],
      zeal: [['holy', 0.85, 0, 1, 1], ['shield', 1], ['hum', 1.2, 0, 0.6]],
      hallowed: [['holy', 0.75, 0, 1, 1], ['boom', 1, 0, 0.6], ['shimmer', 1]],
      avatar: [['holy', 1.1, 0, 1, 2], ['choir', 1.25], ['whoosh-up', 1]],
      auto: [['slash', 0.95, 0, 0.8, 1]],
    },
    bloodreaver: {
      hack: [['slash', 0.85, 0, 1, 2], ['thunk', 0.8, 0.1]],
      drain: [['heavy', 0.9, 0, 1, 0], ['pulse', 1], ['wet', 1, 0.25, 0.6]],
      letting: [['slash', 1.1, 0, 1, 0], ['tear', 1, 0.08]],
      frenzy: [['buff', 0.8, 0, 1, 2], ['growl', 1], ['pulse', 1.3, 0.1]],
      warcry: [['taunt', 1], ['growl', 0.8], ['boom', 1, 0.05, 0.7]],
      undying: [['dot', 0.8], ['drone', 0.6], ['pulse', 0.8, 0.2]],
      rampage: [['heavy', 0.8, 0, 1, 1], ['growl', 1.2, 0, 0.6], ['wet', 1, 0.28]],
      lance: [['shot', 0.8, 0, 1, 0], ['wet', 1.3, 0.15], ['whoosh-down', 1.4, 0.05, 0.6]],
      scab: [['shield', 0.7], ['crackle', 0.6], ['wet', 0.8, 0, 0.5]],
      moon: [['buff', 0.7, 0, 1, 1], ['drone', 0.8], ['choir', 0.7, 0.1, 0.6]],
      auto: [['slash', 0.8, 0, 0.8, 0]],
    },
    runeguard: {
      strike: [['rune', 1, 0, 1, 0], ['punch', 1, 0, 0.8, 0]],
      ward: [['rune', 1.1, 0, 1, 1], ['shield', 1.2], ['hum', 1]],
      glyph: [['rune', 0.9, 0, 1, 2], ['heavy', 1, 0.05, 0.8, 0], ['crackle', 1.2, 0.1]],
      overload: [['rune', 0.8, 0, 1, 0], ['buff', 1, 0, 1, 2], ['hum', 1.4, 0.1]],
      sanctum: [['rune', 1.2, 0, 1, 0], ['shield', 0.9], ['bell', 0.8, 0.1, 0.6]],
      mirror: [['shield', 1.3], ['rune', 1.3, 0, 0.7, 1], ['sparkle', 0.8, 0.1]],
      cut: [['rune', 1.15, 0, 0.8, 2], ['slash', 1.05, 0, 1, 1]],
      cleave: [['rune', 0.75, 0, 0.8, 0], ['heavy', 0.9, 0, 1, 2], ['ring', 0.7, 0.25]],
      whirl: [['rune', 1.25, 0, 1, 1], ['swirl', 1], ['sparkle', 1.1, 0.2]],
      living: [['rune', 0.7, 0, 1, 2], ['heavy', 0.7, 0, 1, 1], ['boom', 0.7, 0.3]],
      auto: [['rune', 1.4, 0, 0.6, 1], ['punch', 1.2, 0, 0.6, 1]],
    },
    ranger: {
      quick: [['shot', 1.1, 0, 1, 0]],
      pierce: [['shot', 0.9, 0, 1, 1], ['whoosh-up', 1.5, 0.05, 0.7], ['thunk', 1, 0.25]],
      rapid: [['shot', 1.2, 0, 1, 2], ['shot', 1.25, 0.09, 0.7, 0], ['shot', 1.15, 0.18, 0.6, 1]],
      barrage: [['buff', 1, 0, 1, 0], ['string', 1, 0, 0.7], ['flutter', 1.2, 0.1]],
      mark: [['shot', 1.05, 0, 0.6, 2], ['chime', 0.8, 0.1, 0.6], ['dot', 1.2, 0.1, 0.5]],
      cloak: [['nature', 1, 0, 1, 0], ['shield', 0.9], ['leaves', 1.2]],
      aimed: [['breath', 1, 0, 0.6], ['shot', 0.8, 0.3, 1, 0], ['thunk', 0.8, 0.6]],
      caustic: [['shot', 1, 0, 1, 2], ['sizzle', 1, 0.2, 0.7]],
      explosive: [['shot', 0.95, 0, 1, 1], ['fire', 1, 0.2, 0.8, 2], ['boom', 1, 0.22]],
      falcon: [['wind', 1.2, 0, 1, 0], ['flutter', 0.7], ['shot', 1.3, 0.15, 0.6, 2]],
      auto: [['shot', 1.15, 0, 0.7, 1]],
    },
    shadowblade: {
      strike: [['stab', 1, 0, 1, 0]],
      evis: [['slash', 1.1, 0, 1, 2], ['stab', 0.9, 0.12, 0.8, 1], ['tear', 1.2, 0.15, 0.6]],
      step: [['dash', 1.2, 0, 1, 0], ['stab', 1.1, 0.18, 0.8, 2], ['puff', 0.8]],
      dance: [['buff', 1.2, 0, 1, 1], ['swirl', 1.3], ['zing', 1.2, 0.1, 0.5]],
      venom: [['stab', 0.9, 0, 1, 2], ['drip', 1], ['sizzle', 1.3, 0.1, 0.5]],
      smoke: [['alchemy', 0.8, 0, 0.6, 2], ['puff', 1], ['whoosh-down', 0.7]],
      fury: [['slash', 1.2, 0, 1, 0], ['slash', 1.3, 0.1, 0.8, 1], ['slash', 1.15, 0.2, 0.7, 2]],
      backstab: [['stab', 0.8, 0, 1, 1], ['wet', 1.2, 0.08]],
      rupture: [['stab', 1.15, 0, 1, 1], ['tear', 0.8, 0.06], ['pulse', 1.4, 0.2, 0.5]],
      blossom: [['slash', 0.95, 0, 1, 0], ['swirl', 1.5], ['sparkle', 0.9, 0.15]],
      shadowcut: [['dash', 0.9, 0, 1, 1], ['stab', 1.2, 0.15, 1, 0], ['puff', 1.2, 0.1]],
      shadowedge: [['slash', 0.9, 0, 1, 1], ['stab', 1.3, 0.1, 0.8, 0], ['ring', 0.8, 0.15]],
      auto: [['stab', 1.25, 0, 0.7, 2]],
    },
    pyromancer: {
      fireball: [['fire', 1, 0, 1, 0], ['whoosh-up', 0.9, 0, 0.7], ['boom', 1.1, 0.25, 0.7]],
      pyro: [['fire', 0.8, 0, 1, 1], ['roar', 1], ['boom', 0.8, 0.35]],
      fireblast: [['fire', 1.25, 0, 1, 0], ['crackle', 1.3], ['thunk', 0.6, 0.02]],
      combust: [['fire', 0.9, 0, 0.7, 1], ['buff', 0.8, 0, 1, 0], ['roar', 1.3, 0.1, 0.6]],
      vent: [['fire', 0.7, 0, 1, 1], ['breath', 0.7], ['sizzle', 0.8, 0.1]],
      smolder: [['fire', 1.1, 0, 0.6, 1], ['crackle', 0.7], ['drone', 1, 0, 0.6]],
      meteor: [['whoosh-down', 0.7], ['fire', 0.85, 0.3, 1, 2], ['boom', 0.7, 0.35]],
      circle: [['fire', 1, 0, 0.8, 1], ['rune', 1.2, 0, 0.7, 0], ['swirl', 0.9]],
      firestep: [['dash', 0.9, 0, 1, 0], ['fire', 1.3, 0, 0.7, 0], ['crackle', 1.5, 0.1]],
      phoenix: [['fire', 1.2, 0, 1, 1], ['flutter', 0.9], ['whoosh-up', 1.2, 0.1]],
      phoenixflame: [['fire', 1.4, 0, 1, 0], ['zing', 0.6], ['sizzle', 1.2, 0.1]],
      phoenixblast: [['fire', 0.75, 0, 1, 2], ['roar', 0.8], ['flutter', 0.7, 0.05]],
      auto: [['fire', 1.5, 0, 0.5, 0], ['crackle', 1.2, 0, 0.5]],
    },
    cleric: {
      smite: [['holy', 1, 0, 1, 0], ['thunk', 1.2, 0.1, 0.6], ['ring', 1.3, 0.05, 0.5]],
      mend: [['heal', 1, 0, 1, 0]],
      petal: [['heal', 1.12, 0, 1, 1], ['holy', 1.2, 0, 0.6, 1], ['leaves', 1.5, 0.1, 0.4]],
      prayer: [['heal', 0.9, 0, 1, 2], ['choir', 1], ['bell', 1.2, 0.1, 0.5]],
      intervene: [['holy', 0.8, 0, 1, 1], ['shield', 1], ['whoosh-down', 1.1]],
      bene: [['heal', 1.25, 0, 1, 0], ['buff', 1.2, 0, 1, 1], ['chime', 1.4, 0.1]],
      barrier: [['shield', 1.1], ['holy', 1.3, 0, 0.6, 2], ['hum', 1.3]],
      condemn: [['holy', 0.9, 0, 1, 2], ['fire', 1.2, 0.1, 0.7, 0], ['boom', 1.2, 0.2, 0.6]],
      dawnbloom: [['heal', 1.2, 0, 1, 2], ['holy', 1.05, 0, 0.8, 0], ['sparkle', 1.3]],
      dawnsanctum: [['holy', 0.7, 0, 1, 0], ['shield', 0.8], ['choir', 0.85]],
      auto: [['holy', 1.4, 0, 0.5, 1]],
    },
    grovekeeper: {
      wrath: [['nature', 1, 0, 1, 0], ['thunk', 1, 0.1], ['whoosh-up', 1.1, 0, 0.6]],
      rejuv: [['nature', 1.1, 0, 1, 1], ['heal', 1, 0, 0.7, 1], ['drip', 1.3, 0.1]],
      thorn: [['nature', 0.9, 0, 1, 2], ['slash', 0.9, 0.05, 0.8, 1], ['creak', 1.3]],
      growth: [['nature', 0.8, 0, 1, 0], ['heal', 0.85, 0, 0.8, 2], ['creak', 0.8]],
      bloom: [['nature', 1.2, 0, 1, 0], ['heal', 1.15, 0, 0.8, 0], ['sparkle', 1]],
      rebirth: [['nature', 0.7, 0, 1, 1], ['holy', 0.85, 0, 1, 0], ['choir', 0.9]],
      lifebind: [['nature', 1.05, 0, 1, 2], ['heal', 0.95, 0, 1, 1], ['string', 0.8, 0.05]],
      moonwell: [['heal', 0.8, 0, 1, 1], ['holy', 0.75, 0, 0.6, 0], ['bubble', 0.7]],
      seed: [['nature', 1.3, 0, 1, 1], ['heal', 1.3, 0, 0.7, 2], ['thunk', 1.4, 0.15]],
      treant: [['nature', 0.65, 0, 1, 2], ['heavy', 0.7, 0, 1, 0], ['creak', 0.6], ['boom', 0.6, 0.3]],
      auto: [['nature', 1.5, 0, 0.5, 0]],
    },
    chronomancer: {
      bolt: [['time', 1, 0, 1, 0], ['zing', 1, 0.05, 0.6]],
      rewind: [['time', 1.1, 0, 1, 1], ['heal', 1, 0, 0.7, 0], ['whoosh-up', 0.8]],
      shift: [['time', 0.9, 0, 1, 2], ['dash', 1.3, 0, 0.6, 1]],
      accel: [['time', 1.25, 0, 1, 0], ['buff', 1.1, 0, 1, 2], ['tick', 1.4, 0, 0.7]],
      stasis: [['time', 0.7, 0, 1, 1], ['shield', 0.9], ['hum', 0.7]],
      recall: [['time', 0.8, 0, 1, 2], ['heal', 0.9, 0.05, 0.8, 1], ['bell', 1, 0.2]],
      chamber: [['time', 1.15, 0, 0.8, 1], ['buff', 0.9, 0, 1, 1], ['ring', 1.2, 0.05]],
      bubble: [['time', 1.3, 0, 0.8, 2], ['shield', 1.2], ['bubble', 1.5]],
      warp: [['time', 0.75, 0, 1, 0], ['swirl', 0.8], ['clock', 0.9]],
      auto: [['time', 1.4, 0, 0.5, 1]],
    },
    thermist: {
      cinder: [['fire', 1.15, 0, 1, 1], ['crackle', 1.4, 0.05, 0.6]],
      rime: [['frost', 1, 0, 1, 0], ['zing', 1.4, 0, 0.5]],
      flare: [['fire', 1.05, 0, 1, 2], ['whoosh-up', 1.3], ['boom', 1.3, 0.18, 0.5]],
      lance: [['frost', 0.85, 0, 1, 1], ['shot', 0.85, 0, 0.8, 1], ['frostcrack', 1, 0.2]],
      equil: [['shield', 0.95], ['fire', 1.3, 0, 0.4, 0], ['frost', 1.3, 0, 0.4, 0]],
      invert: [['fire', 0.85, 0, 0.8, 0], ['frost', 0.85, 0.1, 0.8, 2], ['swirl', 0.8]],
      shock: [['fire', 1, 0, 0.8, 2], ['frost', 1.15, 0, 0.8, 1], ['glassbreak', 1, 0.1]],
      bleed: [['frost', 1.2, 0, 0.7, 2], ['breath', 1.1], ['sizzle', 1.1, 0.05, 0.6]],
      thermocline: [['fire', 0.95, 0, 0.8, 1], ['frost', 0.95, 0, 0.8, 0], ['zing', 0.7, 0.05, 0.5]],
      zero: [['frost', 0.7, 0, 1, 2], ['frostcrack', 0.7], ['boom', 0.8, 0.15]],
      auto: [['frost', 1.4, 0, 0.5, 1], ['fire', 1.4, 0, 0.4, 0]],
    },
    driftblade: {
      carve: [['slash', 1.05, 0, 1, 0], ['wind', 1.3, 0, 0.5, 0]],
      slip: [['dash', 1, 0, 1, 1], ['wind', 1.1, 0, 0.6, 2]],
      hook: [['slash', 0.95, 0, 1, 2], ['wind', 0.9, 0, 0.8, 1], ['swirl', 1.2, 0, 0.5]],
      cross: [['wind', 0.8, 0, 1, 0], ['slash', 0.85, 0.1, 0.8, 1], ['whoosh-up', 0.7]],
      still: [['shield', 1.05], ['breath', 0.9], ['ring', 1.4, 0.05]],
      gale: [['wind', 0.7, 0, 1, 2], ['buff', 0.85, 0, 1, 0], ['swirl', 0.7]],
      pass: [['slash', 1.2, 0, 1, 1], ['dash', 1.1, 0, 0.5, 0], ['whoosh-down', 1.3]],
      impact: [['wind', 0.75, 0, 1, 1], ['heavy', 0.85, 0.1, 1, 0], ['boom', 0.9, 0.3]],
      gyre: [['wind', 1.2, 0, 1, 1], ['slash', 1.25, 0, 0.8, 2], ['swirl', 1.5]],
      tailspin: [['wind', 1.4, 0, 1, 0], ['slash', 1.1, 0.1, 0.8, 0], ['flutter', 1.3]],
      galeline: [['wind', 0.85, 0, 1, 2], ['slash', 0.75, 0.05, 1, 2], ['whoosh-up', 0.9, 0.1]],
      eyestep: [['dash', 0.8, 0, 1, 0], ['slash', 1.35, 0.15, 0.9, 0], ['wind', 1.5, 0, 0.5, 1]],
      auto: [['slash', 1.15, 0, 0.7, 2], ['wind', 1.6, 0, 0.3, 0]],
    },
    alembist: {
      throw: [['alchemy', 1, 0, 1, 0], ['whoosh-up', 1.2, 0, 0.6]],
      distill: [['alchemy', 0.85, 0, 1, 1], ['drip', 0.9], ['hum', 1.1]],
      batch: [['alchemy', 0.7, 0, 1, 2], ['buff', 1, 0, 1, 0], ['bubble', 0.6]],
      catalyst: [['alchemy', 1.2, 0, 1, 1], ['sparkle', 1.2], ['sizzle', 1, 0.1, 0.6]],
      blend: [['alchemy', 0.9, 0, 1, 0], ['swirl', 1.1], ['bubble', 1]],
      ember: [['alchemy', 1.1, 0, 0.8, 0], ['fire', 1.3, 0.05, 0.7, 1]],
      dew: [['alchemy', 1.3, 0, 0.8, 1], ['drip', 1.4], ['heal', 1.4, 0.1, 0.5, 1]],
      salt: [['alchemy', 0.95, 0, 0.8, 0], ['crackle', 0.9], ['shield', 1.4, 0, 0.6]],
      quicksilver: [['alchemy', 1.4, 0, 0.8, 2], ['tick', 1.2], ['zing', 1.1, 0.05, 0.5]],
      auto: [['alchemy', 1.5, 0, 0.5, 0]],
    },
    gorgemaw: {
      gnash: [['maw', 1, 0, 1, 0]],
      wide: [['maw', 0.8, 0, 1, 1], ['growl', 0.7], ['breath', 0.6]],
      spit: [['maw', 1.1, 0, 0.7, 0], ['wet', 1], ['shot', 0.9, 0.05, 0.6, 2]],
      digest: [['maw', 0.7, 0, 0.8, 2], ['gulp', 0.8], ['heal', 0.8, 0.2, 0.6, 2]],
      iron: [['shield', 0.6], ['clang', 0.6], ['maw', 1.2, 0, 0.5, 0]],
      bottomless: [['maw', 0.6, 0, 1, 1], ['gulp', 0.6, 0.2], ['drone', 0.5]],
      regurgitate: [['maw', 0.9, 0, 1, 2], ['wet', 0.7, 0.1], ['heavy', 0.9, 0.15, 0.7, 1]],
      stonebelly: [['shield', 0.75], ['boom', 0.7], ['gulp', 1.1, 0.1]],
      auto: [['maw', 1.25, 0, 0.7, 0]],
    },
    oathbroker: {
      collect: [['ledger', 1, 0, 0.8, 2], ['slash', 1, 0, 1, 0]],
      reneg: [['ledger', 1.1, 0, 1, 1], ['taunt', 1.1, 0, 0.6]],
      settle: [['ledger', 0.9, 0, 1, 0], ['coin', 1], ['boom', 1.2, 0.1, 0.5]],
      lien: [['ledger', 1.2, 0, 1, 2], ['dot', 1.1], ['quill', 1.1]],
      writ: [['ledger', 0.85, 0, 1, 1], ['shield', 1], ['stamp', 0.9, 0.3]],
      default: [['ledger', 0.7, 0, 1, 0], ['heavy', 0.8, 0.05, 1, 0], ['clang', 0.8, 0.3]],
      audit: [['ledger', 1.3, 0, 1, 1], ['quill', 0.9], ['tick', 1, 0.2]],
      moratorium: [['ledger', 0.8, 0, 1, 2], ['shield', 0.8], ['hum', 0.8]],
      cosign: [['ledger', 1.15, 0, 1, 0], ['shield', 1.15], ['quill', 1.3, 0.2]],
      foreclose: [['ledger', 0.75, 0, 1, 1], ['heavy', 0.7, 0, 1, 2], ['stamp', 0.7, 0.3], ['coin', 0.8, 0.35]],
      auto: [['ledger', 1.4, 0, 0.6, 0]],
    },
    ironpalm: {
      palm: [['punch', 1.2, 0, 1, 2]],
      fist: [['punch', 0.9, 0, 1, 0], ['thunk', 0.8, 0.07, 0.5]],
      kick: [['punch', 0.75, 0, 1, 1], ['whoosh-up', 1, 0, 0.6]],
      crane: [['punch', 1.3, 0, 1, 0], ['wind', 1.3, 0, 0.6, 0], ['flutter', 1.4]],
      flow: [['punch', 1.15, 0, 1, 2], ['punch', 1.25, 0.1, 0.8, 2], ['punch', 1.05, 0.2, 1, 0]],
      gate: [['punch', 0.95, 0, 1, 0], ['heavy', 1.1, 0, 0.6, 0], ['whoosh-up', 0.8, 0.05]],
      drop: [['heavy', 0.85, 0, 1, 0], ['punch', 0.7, 0.2, 0.8, 1], ['boom', 0.85, 0.3]],
      wall: [['punch', 0.8, 0, 1, 1], ['shield', 0.85], ['thunk', 0.6, 0.1]],
      breaker: [['heavy', 1.05, 0, 1, 1], ['crackle', 0.8, 0.25]],
      ox: [['heavy', 0.75, 0, 1, 2], ['punch', 0.8, 0.1, 0.8, 0], ['growl', 0.9, 0.05, 0.5]],
      palms: [['punch', 1.1, 0, 0.8, 2], ['punch', 1.2, 0.06, 0.7, 0], ['punch', 1, 0.12, 0.8, 2], ['punch', 1.3, 0.18, 0.7, 0], ['punch', 0.95, 0.24, 1, 1]],
      read: [['shield', 1.25], ['breath', 1.2], ['thunk', 1.1, 0.05]],
      skin: [['shield', 0.65], ['clang', 0.7, 0.05], ['buff', 0.7, 0, 1, 1]],
      bell: [['buff', 0.95, 0, 1, 2], ['bell', 0.8], ['boom', 1.1, 0, 0.4]],
      bellows: [['buff', 0.75, 0, 1, 0], ['breath', 0.8], ['roar', 1.2, 0.1, 0.4]],
      dragon: [['heavy', 0.95, 0, 1, 2], ['whoosh-up', 0.6], ['roar', 0.9, 0.15, 0.6]],
      pond: [['shield', 0.9], ['drip', 0.7], ['hum', 0.9]],
      slide: [['heavy', 0.7, 0, 1, 1], ['punch', 0.85, 0.15, 0.8, 2], ['crackle', 0.6, 0.2]],
      auto: [['punch', 1.35, 0, 0.7, 1]],
    },
    threadweaver: {
      needle: [['thread', 1.2, 0, 1, 0], ['stab', 1.4, 0.05, 0.6, 0]],
      tie: [['thread', 0.9, 0, 1, 1], ['string', 1, 0.1]],
      mend: [['thread', 1.05, 0, 0.8, 2], ['heal', 1.05, 0, 0.8, 2]],
      snip: [['thread', 1.3, 0, 1, 2], ['snap', 1]],
      shuttle: [['thread', 0.8, 0, 1, 0], ['shot', 1.1, 0, 0.7, 0], ['thunk', 1.2, 0.2]],
      tapestry: [['thread', 0.7, 0, 1, 2], ['shield', 1.05], ['string', 0.7]],
      embroider: [['thread', 1.15, 0, 1, 1], ['heal', 1.2, 0, 0.6, 0], ['quill', 1.5]],
      cradle: [['thread', 0.95, 0, 1, 0], ['shield', 0.75], ['string', 1.3, 0.1]],
      auto: [['thread', 1.4, 0, 0.6, 1]],
    },
    marionettist: {
      jab: [['stab', 1.1, 0, 1, 1], ['string', 1.5, 0, 0.5]],
      pull: [['thread', 1, 0, 1, 2], ['creak', 1.2], ['whoosh-down', 0.9]],
      cross: [['thread', 0.85, 0, 1, 1], ['stab', 0.95, 0.1, 0.9, 2], ['tear', 1.1, 0.15, 0.5]],
      pirouette: [['slash', 1.15, 0, 1, 1], ['thread', 1.1, 0, 0.6, 0], ['swirl', 1.3]],
      swap: [['thread', 1.25, 0, 0.8, 0], ['dash', 1.15, 0, 1, 1], ['thunk', 1.5, 0.2]],
      finale: [['thread', 0.75, 0, 1, 0], ['heavy', 0.9, 0.05, 1, 1], ['bell', 1.1, 0.3, 0.5]],
      tangle: [['thread', 0.9, 0, 1, 2], ['creak', 0.9], ['dot', 1, 0.1, 0.6]],
      redcurtain: [['thread', 0.8, 0, 0.7, 1], ['buff', 0.85, 0, 1, 2], ['flutter', 0.6]],
      string: [['thread', 1.35, 0, 1, 0], ['zing', 1.2]],
      auto: [['thread', 1.2, 0, 0.6, 2], ['thunk', 1.6, 0, 0.5]],
    },
  };
  for (const cls in ABIL) for (const id in ABIL[cls]) { const spec = ABIL[cls][id]; def('ab-' + cls + '-' + id, 'ab', S => { for (const l of spec) layer(S, l); }); }

  // ---------------------------------------------------------------------------------------------- Ultimate signatures
  // Played together with ult-fire: a short layer in each class's own idiom.
  def('ult-bastion', 'ult', S => {
    S.space('hall', 0.4);
    S.metal({ set: 'plate', f: 330, dur: 1.0, peak: 0.25, strike: 0.4 });
    S.thud({ f: 85, f1: 40, dur: 0.5, peak: 0.5 });
    S.choir({ at: 0.05, notes: [mf(57), mf(61), mf(64)], vowel: 'a', a: 0.1, dur: 1.1, peak: 0.12 });
    S.bell({ at: 0.05, f: mf(69), set: 'hand', dur: 1.1, peak: 0.12 });
  });
  def('ult-bloodreaver', 'ult', S => {
    S.space('room', 0.4);
    S.tone({ type: 'saw', f: 55, f1: 75, lp: 400, lp1: 1200, dur: 1.0, a: 0.4, swell: true, drive: 2.5, peak: 0.22 });
    S.thud({ f: 70, f1: 40, dur: 0.2, peak: 0.5, click: 0.1 }); S.thud({ at: 0.28, f: 80, f1: 45, dur: 0.18, peak: 0.4, click: 0.1 });
    S.splat({ at: 0.6, peak: 0.4 });
  });
  def('ult-runeguard', 'ult', S => {
    S.space('hall', 0.35);
    S.tone({ f: mf(40), fm: [1.41, 4, 0.5], dur: 1.0, a: 0.6, swell: true, peak: 0.22, lp: 1800 });
    [0.15, 0.32, 0.46, 0.58].forEach((at, i) => S.partials({ at, set: 'stone', f: 500 + i * 120, dur: 0.25, peak: 0.12, strike: 0.5 }));
    S.thud({ at: 0.7, f: 70, f1: 30, dur: 0.6, peak: 0.55, drive: 2 });
  });
  def('ult-ranger', 'ult', S => {
    for (let i = 0; i < 4; i++) S.pluck({ at: i * 0.05, f: S.rr(140, 190), dur: 0.25, peak: 0.16 });
    for (let i = 0; i < 9; i++) S.whoosh({ at: 0.2 + i * 0.07 + S.rr(0, 0.04), f: 4500, f1: 1500, q: 3, dur: 0.25, peak: 0.12, pan: S.rr(-0.6, 0.6) });
    S.thud({ at: 0.85, f: 120, f1: 50, dur: 0.3, peak: 0.4 });
  });
  def('ult-shadowblade', 'ult', S => {
    let t = 0;
    for (let i = 0; i < 8; i++) { S.whoosh({ at: t, f: 1500 + i * 150, f1: 4500, q: 2, dur: 0.09, peak: 0.25, pan: i % 2 ? 0.4 : -0.4 }); t += 0.1 - i * 0.008; }
    S.noise({ at: t, bp: 3000, bp1: 7000, q: 5, dur: 0.2, pts: [[0.01, 1], [0.2, 0]], peak: 0.3 });
    S.metal({ at: t, set: 'bar', f: 3600, dur: 0.5, peak: 0.12 });
  });
  def('ult-pyromancer', 'ult', S => {
    S.space('room', 0.3);
    S.noise({ color: 'pink', lp: 500, lp1: 5000, fd: 0.6, dur: 1.1, pts: [[0.6, 1], [1.1, 0]], peak: 0.4, grain: 0.3 });
    S.tone({ at: 0.2, f: 1800, f1: 2600, glide: 0.3, fm: [1.5, 1.5, 0.3], dur: 0.6, a: 0.05, peak: 0.08, vib: [14, 0.03] });
    S.crackle({ dur: 1.1, dens: 1.6, f: 3000, pts: [[0.5, 1], [1.1, 0]], peak: 0.2 });
    S.thud({ at: 0.6, f: 90, f1: 35, dur: 0.5, peak: 0.45, drive: 2 });
  });
  def('ult-cleric', 'ult', S => {
    S.space('hall', 0.45);
    S.choir({ notes: [mf(60), mf(64), mf(67), mf(72)], vowel: 'a', a: 0.3, dur: 1.2, peak: 0.16 });
    [84, 88, 91, 96].forEach((n, i) => S.partials({ at: 0.1 + i * 0.06, set: 'hand', f: mf(n), dur: 1.0, peak: 0.09 }));
  });
  def('ult-grovekeeper', 'ult', S => {
    S.space('hall', 0.3);
    S.creak({ dur: 1.0, f: 14, f1: 30, res: [180, 420, 900], q: 9, peak: 0.25 });
    S.wood({ at: 0.5, f: 110, dur: 0.6, peak: 0.35, lp: 1200 });
    S.noise({ color: 'pink', bp: 2200, q: 0.7, dur: 1.1, pts: [[0.6, 1], [1.1, 0]], grain: 0.8, peak: 0.2 });
  });
  def('ult-chronomancer', 'ult', S => {
    S.space('hall', 0.3);
    S.noise({ color: 'pink', bp: 800, bp1: 5000, dur: 0.8, pts: [[0.75, 1], [0.8, 0]], peak: 0.28 });
    let t = 0; for (let i = 0; i < 10; i++) { S.tick({ at: t, f: 2600 - i * 80, peak: 0.12 + i * 0.01 }); t += 0.12 - i * 0.009; }
    S.tone({ at: 0.8, f: mf(84), f1: mf(72), glide: 0.4, fm: [1.5, 1.5, 0.1], dur: 0.6, peak: 0.15 });
  });
  def('ult-thermist', 'ult', S => {
    for (let i = 0; i < 5; i++) S.glass({ at: S.rr(0, 0.25), f: S.rr(2400, 5600), dur: 0.6, peak: 0.08, pan: S.rr(-0.4, 0.4) });
    S.crackle({ f: 3500, dur: 0.3, peak: 0.2 });
    S.noise({ at: 0.25, color: 'pink', lp: 600, lp1: 4000, fd: 0.2, dur: 0.7, pts: [[0.1, 1], [0.7, 0]], peak: 0.4 });
    S.thud({ at: 0.35, f: 80, f1: 30, dur: 0.6, peak: 0.5, drive: 2 });
  });
  def('ult-driftblade', 'ult', S => {
    S.whoosh({ f: 300, f1: 2000, dur: 1.1, peakAt: 0.7, peak: 0.4, am: [6, 0.5] });
    S.noise({ bp: 900, bp1: 3200, q: 22, dur: 1.0, pts: [[0.7, 1], [1.0, 0]], peak: 0.12 });
    S.whoosh({ at: 0.75, f: 2500, f1: 600, dur: 0.35, peak: 0.3 });
  });
  def('ult-alembist', 'ult', S => {
    S.bubbles({ n: 22, f: 200, f1: 1200, spread: 0.9, bias: 0.7, peak: 0.16 });
    S.noise({ color: 'brown', lp: 500, dur: 1.0, grain: 0.5, pts: [[0.5, 1], [1.0, 0]], peak: 0.25 });
    [76, 80, 83, 88].forEach((n, i) => S.glass({ at: 0.5 + i * 0.05, f: mf(n), dur: 0.7, peak: 0.08 }));
    S.sizzle({ at: 0.4, dur: 0.7, pts: [[0.1, 1], [0.7, 0]], peak: 0.14 });
  });
  def('ult-gorgemaw', 'ult', S => {
    S.tone({ type: 'saw', f: 50, f1: 40, lp: 350, dur: 0.6, am: [28, 0.6], drive: 3, a: 0.2, swell: true, peak: 0.22 });
    S.thud({ at: 0.5, f: 110, f1: 40, dur: 0.35, peak: 0.6 });
    S.wood({ at: 0.5, f: 900, dur: 0.05, peak: 0.3 });
    S.splat({ at: 0.52, peak: 0.35 });
    S.tone({ at: 0.85, f: 180, f1: 70, dur: 0.3, lp: 500, peak: 0.3 });
  });
  def('ult-oathbroker', 'ult', S => {
    S.space('hall', 0.3);
    S.whoosh({ f: 400, f1: 1200, dur: 0.25, peakAt: 0.9, peak: 0.25 });
    S.thud({ at: 0.22, f: 150, f1: 60, dur: 0.35, peak: 0.6, click: 0.6 });
    S.wood({ at: 0.22, f: 380, dur: 0.2, peak: 0.35 });
    S.coins({ at: 0.3, n: 12, f: 3400, spread: 0.6, peak: 0.16 });
  });
  def('ult-ironpalm', 'ult', S => {
    for (let i = 0; i < 10; i++) S.thud({ at: i * 0.055, f: S.rr(150, 190), f1: 70, dur: 0.07, peak: 0.3, click: 0.5, clickF: 2000 });
    S.bell({ at: 0.6, set: 'hand', f: mf(57), dur: 1.2, peak: 0.22, beat: 1.2 });
    S.thud({ at: 0.6, f: 100, f1: 45, dur: 0.3, peak: 0.45 });
  });
  def('ult-threadweaver', 'ult', S => {
    [0.0, 0.18, 0.36].forEach(at => { S.wood({ at, f: 520, dur: 0.06, peak: 0.25 }); S.whoosh({ at: at + 0.02, f: 2500, f1: 4500, q: 4, dur: 0.12, peak: 0.12 }); });
    [72, 76, 79, 83, 86, 91].forEach((n, i) => S.pluck({ at: 0.45 + i * 0.05, f: mf(n), type: 'tri', dur: 0.6, peak: 0.1, rev: 0.3 }));
  });
  def('ult-marionettist', 'ult', S => {
    for (let i = 0; i < 4; i++) S.wood({ at: i * 0.08, f: S.rr(600, 900), dur: 0.05, peak: 0.25 });
    [69, 72, 76, 81].forEach((n, i) => S.pluck({ at: 0.35 + i * 0.06, f: mf(n), dur: 0.5, peak: 0.12, rev: 0.3 }));
    S.whoosh({ at: 0.35, color: 'brown', f: 200, f1: 900, dur: 0.7, peak: 0.3, q: 0.6 });
  });

  // ============================================================================================== 5. boss moves
  // bm-<boss>-<move slug>: each move's signature, played as its warning appears. Category 'bm': with the telegraph
  // cues, the most prominent layer of the mix. Shared gestures first.
  const B = {
    cleaver(S, at, pk) {
      S.noise({ at, bp: 2600, bp1: 1400, q: 8, dur: 0.22, pts: [[0.18, 1], [0.22, 0]], peak: 0.2 * pk });
      S.tone({ at, f: 2100, f1: 1300, dur: 0.22, a: 0.15, swell: true, peak: 0.04 * pk });
      S.thud({ at: at + 0.2, f: 140, f1: 60, dur: 0.18, peak: 0.55 * pk, click: 0.5 });
      S.wood({ at: at + 0.2, f: 380, dur: 0.12, peak: 0.35 * pk });
      S.metal({ at: at + 0.2, set: 'bar', f: 1900, dur: 0.25, peak: 0.1 * pk, click: 0 });
    },
    slam(S, at, pk, f) {
      S.thud({ at, f: f || 75, f1: 30, dur: 0.6, drive: 2.5, peak: 0.7 * pk, sub: 0.3 });
      S.noise({ at, color: 'brown', lp: 1400, grain: 0.7, dur: 0.6, pts: [[0.02, 1], [0.6, 0]], peak: 0.25 * pk });
      S.rumble({ at, dur: 1, f: 140, peak: 0.25 * pk, a: 0.02 });
    },
    windup(S, at, d, pk) { S.whoosh({ at, f: 200, f1: 900, dur: d, peakAt: 0.95, peak: 0.3 * pk, q: 0.9 }); },
    thunder(S, at, pk, far, pan) {
      if (!far) S.crack({ at, peak: 0.5 * pk, pan, ech: 0.3 });
      S.rumble({ at: at + (far ? 0 : 0.03), dur: far ? 2.2 : 1.8, f: far ? 90 : 170, peak: 0.42 * pk, a: far ? 0.35 : 0.05, grain: 0.5, am: [S.rr(3, 6), 0.5], pan });
      S.crackle({ at: at + 0.05, f: far ? 600 : 1500, dur: 1.2, dens: 0.7, pts: [[0.1, 1], [1.2, 0]], peak: 0.2 * pk, pan });
    },
    bolt(S, at, pk, pan) {
      S.zap({ at, f: 90, dur: 0.25, peak: 0.25 * pk, pan });
      S.crack({ at: at + 0.02, peak: 0.5 * pk, pan });
      S.thud({ at: at + 0.02, f: 90, f1: 35, dur: 0.4, peak: 0.45 * pk, drive: 2, pan });
    },
    rain(S, at, d, pk) {
      S.crackle({ at, f: 4000, q: 0.4, dens: 2.2, dur: d, pts: [[d * 0.3, 1], [d * 0.8, 0.8], [d, 0]], peak: 0.32 * pk });
      S.noise({ at, color: 'pink', hp: 1500, lp: 8000, dur: d, pts: [[d * 0.3, 1], [d, 0]], peak: 0.2 * pk });
    },
    grind(S, at, d, pk) {
      S.noise({ at, color: 'brown', lp: 700, dur: d, grain: 0.9, grainRate: 0.6, am: [S.rr(9, 14), 0.7, 'square'], pts: [[0.1, 1], [d * 0.8, 0.8], [d, 0]], peak: 0.42 * pk });
      S.noise({ at, bp: 1800, q: 2, dur: d, grain: 0.9, pts: [[0.1, 1], [d, 0]], peak: 0.1 * pk });
      S.rumble({ at, dur: d, f: 90, peak: 0.2 * pk, a: 0.1 });
    },
    silk(S, at, d, pk, f) {
      f = f || 1;
      S.creak({ at, dur: d, f: 40, f1: 90, res: [1600 * f, 2800 * f, 4100 * f], q: 16, peak: 0.22 * pk, jit: 0.3 });
      S.tone({ at, f: 900 * f, f1: 1500 * f, dur: d, a: d * 0.8, swell: true, peak: 0.05 * pk, vib: [7, 0.01] });
    },
    snap(S, at, pk) { S.noise({ at, hp: 2500, dur: 0.03, a: 0.0005, peak: 0.35 * pk }); S.pluck({ at, f: 330, bend: -12, dur: 0.3, peak: 0.15 * pk, bright: 10 }); },
    zing(S, at, pk, pan) { S.noise({ at, bp: 2000, bp1: 7000, q: 10, dur: 0.16, pts: [[0.12, 1], [0.16, 0]], peak: 0.24 * pk, pan }); },
    hiss(S, at, d, pk) { S.noise({ at, hp: 2500, lp: 9000, dur: d, pts: [[d * 0.25, 1], [d, 0]], peak: 0.3 * pk, grain: 0.3 }); },
    bite(S, at, pk) {
      S.wood({ at, f: 1600, dur: 0.03, peak: 0.35 * pk }); S.wood({ at: at + 0.03, f: 1450, dur: 0.03, peak: 0.28 * pk });
      S.thud({ at, f: 140, f1: 60, dur: 0.2, peak: 0.5 * pk });
      S.splat({ at: at + 0.01, peak: 0.28 * pk, dur: 0.2 });
    },
    chomp(S, at, pk) { S.thud({ at, f: 120, f1: 45, dur: 0.25, peak: 0.5 * pk }); S.wood({ at, f: 900, dur: 0.04, peak: 0.25 * pk }); S.splat({ at, peak: 0.3 * pk, dur: 0.25 }); },
    clink(S, at, pk, f, pan) { S.partials({ at, set: [[1, 1, 1], [2.4, 0.5, 0.5], [3.9, 0.3, 0.3]], f: f || S.rr(1400, 3000), dur: 0.2, peak: 0.14 * pk, pan }); S.noise({ at, hp: 3000, dur: 0.01, peak: 0.08 * pk, pan }); },
    parchment(S, at, d, pk) { S.noise({ at, color: 'pink', bp: 2500, q: 0.7, grain: 0.8, dur: d, pts: [[d * 0.3, 1], [d, 0]], peak: 0.25 * pk }); },
    stamp(S, at, pk) { S.thud({ at, f: 150, f1: 60, dur: 0.3, peak: 0.55 * pk, click: 0.6 }); S.wood({ at, f: 360, dur: 0.18, peak: 0.35 * pk }); },
    polarity(S, at, plus, pk) {
      if (plus) {
        S.tone({ at, f: mf(57), f1: mf(57) * 1.03, fm: [1, 1.2, 0.3], dur: 0.7, a: 0.03, peak: 0.22 * pk });
        S.tone({ at, f: mf(64), dur: 0.7, a: 0.05, peak: 0.12 * pk });
        S.tone({ at, f: mf(45), dur: 0.7, a: 0.05, peak: 0.12 * pk, am: [12, 0.4] });
      } else {
        S.tone({ at, f: mf(76), f1: mf(76) * 0.97, dur: 0.7, a: 0.03, peak: 0.14 * pk });
        S.tone({ at, f: mf(76) * 1.012, f1: mf(76) * 0.982, dur: 0.7, a: 0.03, peak: 0.14 * pk });
        S.glass({ at, f: mf(88), dur: 0.7, peak: 0.08 * pk });
        S.noise({ at, hp: 6000, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.06 * pk });
      }
    },
  };

  // ---------------------------------------------------------------------------------------------- Grubnak, the Ogre Chef
  def('bm-grubnak-intro', 'sting', S => {
    S.space('room', 0.4);
    S.metal({ set: 'plate', f: 480, dur: 0.9, peak: 0.25, strike: 0.4 }); S.metal({ at: 0.16, set: 'plate', f: 640, dur: 0.7, peak: 0.22 }); S.metal({ at: 0.3, set: 'plate', f: 410, dur: 1.0, peak: 0.26 });
    S.drum({ at: 0.3, f: 70, dur: 0.8, peak: 0.5 });
    [0.75, 0.95, 1.13, 1.3].forEach((at, i) => S.voice({ at, f: 85 - i * 4, f1: 70 - i * 4, dur: 0.14, vowel: 'a', vowel1: 'o', breath: 0.6, peak: 0.35 - i * 0.04, lp: 1400 }));
  });
  def('bm-grubnak-grease-fire', 'bm', S => {
    S.space('room', 0.3);
    S.sizzle({ dur: 1.4, pts: [[0.5, 1], [1.0, 0.8], [1.4, 0]], peak: 0.3 });
    S.whoosh({ at: 0.2, f: 300, f1: 2500, dur: 0.9, peakAt: 0.6, peak: 0.4, q: 0.8 });
    S.noise({ at: 0.35, color: 'pink', lp: 500, lp1: 3000, fd: 0.3, dur: 0.9, pts: [[0.25, 1], [0.9, 0]], peak: 0.3 });
    S.crackle({ at: 0.3, dens: 1.6, f: 2500, dur: 1.1, pts: [[0.3, 1], [1.1, 0]], peak: 0.22 });
    S.bubbles({ n: 8, f: 1500, f1: 4000, spread: 1.2, size: 0.015, peak: 0.1 });
  });
  def('bm-grubnak-tenderize', 'bm', S => {
    B.windup(S, 0, 0.3, 1);
    S.thud({ at: 0.28, f: 110, f1: 40, dur: 0.45, drive: 2, peak: 0.65 }); S.splat({ at: 0.28, peak: 0.45 }); S.metal({ at: 0.28, set: 'plate', f: 820, dur: 0.3, peak: 0.12 });
    S.thud({ at: 0.58, f: 120, f1: 45, dur: 0.3, drive: 2, peak: 0.5 }); S.splat({ at: 0.58, peak: 0.32 });
  });
  def('bm-grubnak-mince', 'bm', S => { B.cleaver(S, 0, 0.8); B.cleaver(S, 0.22, 0.9); B.cleaver(S, 0.44, 1); });
  def('bm-grubnak-double-chop', 'bm', S => { B.cleaver(S, 0, 1.1); B.cleaver(S, 0.35, 1.25); S.rumble({ at: 0.55, dur: 0.7, f: 150, peak: 0.3, a: 0.01 }); S.whoosh({ f: 300, f1: 1200, dur: 0.55, peak: 0.3 }); });
  def('bm-grubnak-chop-chop', 'bm', S => { [0, 0.16, 0.32, 0.48].forEach((at, i) => B.cleaver(S, at, 0.75 + i * 0.08)); });
  def('bm-grubnak-ladle-spin', 'bm', S => {
    S.whoosh({ f: 250, f1: 700, dur: 1.3, peakAt: 0.5, peak: 0.4, q: 0.8, am: [3.2, 0.8] });
    S.scrape({ at: 0.1, f: 1100, q: 3, rate: 30, dur: 1.1, pts: [[0.2, 1], [1.0, 0.8], [1.1, 0]], peak: 0.2 });
    S.metal({ at: 0.05, set: 'bar', f: 640, dur: 1.2, peak: 0.1 });
    S.rumble({ dur: 1.2, f: 120, peak: 0.2 });
  });
  def('bm-grubnak-lid-slam', 'bm', S => {
    B.windup(S, 0, 0.25, 1);
    S.metal({ at: 0.22, set: 'plate', f: 400, dur: 1.6, peak: 0.35, strike: 0.5 });
    S.metal({ at: 0.24, set: 'plate', f: 560, dur: 1.2, peak: 0.15, am: [9, 0.5] });
    S.noise({ at: 0.22, hp: 2000, dur: 0.9, grain: 0.3, pts: [[0.01, 1], [0.9, 0]], peak: 0.3 });
    S.thud({ at: 0.22, f: 90, f1: 40, dur: 0.4, peak: 0.5 });
  });
  def('bm-grubnak-meat-toss', 'bm', S => {
    S.whoosh({ f: 250, f1: 700, dur: 0.45, peakAt: 0.7, peak: 0.6, am: [6, 0.3] });
    S.splat({ at: 0.45, peak: 0.7, dur: 0.4 });
    S.noise({ at: 0.47, color: 'pink', bp: 700, q: 2, grain: 0.5, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.25 });
    S.thud({ at: 0.45, f: 80, f1: 40, dur: 0.3, peak: 0.45 });
  });
  def('bm-grubnak-family-meal', 'bm', S => {
    S.space('room', 0.35);
    for (let i = 0; i < 6; i++) S.partials({ at: i * 0.11, set: 'hand', f: mf(i % 2 ? 84 : 81), dur: 0.5, peak: 0.22 });
    S.whoosh({ at: 0.7, f: 3000, f1: 500, dur: 0.6, peakAt: 0.9, peak: 0.25 });
    S.pad({ at: 0.7, notes: [mf(45), mf(52)], dur: 0.9, a: 0.5, peak: 0.12 });
    S.drum({ at: 1.3, f: 70, dur: 0.6, peak: 0.55 });
  });
  def('bm-grubnak-larder-toss', 'bm', S => {
    S.whoosh({ f: 220, f1: 600, dur: 0.5, peak: 0.3, am: [5, 0.4] });
    S.wood({ at: 0.48, f: 160, dur: 0.3, peak: 0.45 }); S.wood({ at: 0.5, f: 240, dur: 0.2, peak: 0.3 });
    S.noise({ at: 0.48, color: 'brown', lp: 1500, grain: 0.8, dur: 0.4, pts: [[0.01, 1], [0.4, 0]], peak: 0.3 });
    S.thud({ at: 0.48, f: 85, f1: 40, dur: 0.4, peak: 0.5 });
  });
  def('bm-grubnak-gut-blast', 'bm', S => {
    S.tone({ type: 'saw', f: 55, f1: 70, lp: 300, lp1: 900, dur: 0.8, a: 0.5, swell: true, drive: 2.5, peak: 0.25, am: [24, 0.5] });
    S.noise({ at: 0.55, color: 'pink', lp: 900, lp1: 400, dur: 0.7, pts: [[0.03, 1], [0.7, 0]], peak: 0.5 });
    S.whoosh({ at: 0.55, f: 300, f1: 150, dur: 0.6, peakAt: 0.1, peak: 0.35 });
    S.thud({ at: 0.55, f: 70, f1: 35, dur: 0.5, peak: 0.5 });
  });
  def('bm-grubnak-butchers-charge', 'bm', S => {
    [0, 0.28, 0.5, 0.68, 0.82].forEach((at, i) => { S.thud({ at, f: 80, f1: 40, dur: 0.3, peak: 0.35 + i * 0.07 }); S.metal({ at, set: 'bar', f: 900, dur: 0.15, peak: 0.05, click: 0 }); });
    S.rumble({ dur: 1.0, f: 120, f1: 300, peak: 0.3, pts: [[0.85, 1], [1.0, 0]] });
    S.whoosh({ at: 0.7, f: 300, f1: 1500, dur: 0.4, peak: 0.3 });
  });
  def('bm-grubnak-order-up', 'bm', S => {
    S.space('room', 0.3);
    S.wood({ f: 900, dur: 0.03, peak: 0.12 });
    S.partials({ at: 0.01, set: 'service', f: mf(88), dur: 1.4, peak: 0.35 });
    S.partials({ at: 0.28, set: 'service', f: mf(88), dur: 1.4, peak: 0.3 });
  });
  def('bm-grubnak-rolling-meatballs', 'bm', S => {
    S.rumble({ dur: 1.6, f: 300, peak: 0.35, am: [7, 0.6], grain: 0.5, pts: [[0.4, 1], [1.6, 0]] });
    S.noise({ color: 'pink', bp: 400, q: 1, am: [6.5, 0.7], dur: 1.5, pts: [[0.4, 1], [1.5, 0]], peak: 0.2 });
    for (let i = 0; i < 5; i++) S.thud({ at: S.rr(0.1, 1.3), f: S.rr(90, 130), f1: 50, dur: 0.15, peak: 0.25 });
  });
  def('bm-grubnak-flare-up', 'bm', S => {
    S.wood({ f: 2600, dur: 0.02, peak: 0.2 });
    S.noise({ at: 0.08, color: 'pink', lp: 250, lp1: 5000, fd: 0.25, dur: 1.4, pts: [[0.12, 1], [0.5, 0.6], [1.4, 0]], peak: 0.5 });
    S.thud({ at: 0.08, f: 70, f1: 30, dur: 0.6, peak: 0.5 });
    S.tone({ at: 0.08, type: 'saw', f: 60, lp: 300, am: [18, 0.3], drive: 2, dur: 1.4, pts: [[0.2, 1], [1.4, 0]], peak: 0.2 });
    S.crackle({ at: 0.1, dens: 1.8, dur: 1.4, pts: [[0.2, 1], [1.4, 0]], peak: 0.25 });
  });
  def('bm-grubnak-flambe', 'bm', S => {
    S.wood({ f: 2600, dur: 0.02, peak: 0.15 });
    S.noise({ at: 0.05, color: 'pink', lp: 400, lp1: 6000, fd: 0.35, dur: 1.2, pts: [[0.15, 1], [0.4, 0.7], [1.2, 0]], peak: 0.5 });
    S.whoosh({ at: 0.05, f: 400, f1: 2400, dur: 0.9, peakAt: 0.3, peak: 0.3 });
    S.crackle({ at: 0.1, dens: 2, dur: 1.2, pts: [[0.2, 1], [1.2, 0]], peak: 0.25 });
    S.sizzle({ at: 0.4, dur: 0.8, pts: [[0.1, 1], [0.8, 0]], peak: 0.15 });
  });
  def('bm-grubnak-stockpot', 'bm', S => {
    S.scrape({ f: 500, q: 2, rate: 22, dur: 1.0, pts: [[0.1, 1], [1.0, 0]], peak: 0.3 });
    S.noise({ color: 'pink', bp: 600, am: [3, 0.8], dur: 1.0, peak: 0.1 });
    S.metal({ at: 1.0, set: 'plate', f: 260, dur: 0.9, peak: 0.3, strike: 0.4 });
    S.thud({ at: 1.0, f: 70, f1: 32, dur: 0.5, peak: 0.55 });
  });
  def('bm-grubnak-simmer', 'bm', S => {
    S.bubbles({ n: 30, f: 150, f1: 600, spread: 1.5, size: 0.05, peak: 0.22, lp: 1200 });
    S.noise({ hp: 3000, dur: 1.6, pts: [[0.8, 1], [1.6, 0]], peak: 0.1 });
    S.rumble({ dur: 1.6, f: 100, peak: 0.15 });
  });
  def('bm-grubnak-whisk', 'bm', S => {
    S.noise({ bp: 3000, q: 1.5, am: [14, 0.8], dur: 1.0, pts: [[0.1, 1], [0.9, 0.8], [1.0, 0]], peak: 0.25 });
    for (let i = 0; i < 12; i++) S.metal({ at: i * 0.075, set: 'bar', f: S.rr(3000, 4500), dur: 0.05, peak: 0.05, click: 0 });
    S.metal({ set: 'plate', f: 900, dur: 1, peak: 0.08 });
  });
  def('bm-grubnak-spice-rack', 'bm', S => {
    for (let i = 0; i < 6; i++) S.glass({ at: S.rr(0, 0.4), f: S.rr(1800, 3200), dur: 0.3, peak: 0.15 });
    for (let i = 0; i < 5; i++) S.wood({ at: S.rr(0, 0.4), f: S.rr(500, 900), dur: 0.05, peak: 0.15 });
    S.whoosh({ at: 0.45, color: 'pink', f: 800, f1: 2500, dur: 0.4, peak: 0.28 });
    S.crackle({ at: 0.5, hp: 4000, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.1 });
  });
  def('bm-grubnak-boil-over', 'bm', S => {
    S.bubbles({ n: 12, f: 150, f1: 500, spread: 1.0, bias: 0.5, size: 0.05, peak: 0.18 });
    S.bubbles({ at: 0.6, n: 20, f: 200, f1: 900, spread: 0.6, bias: 0.6, size: 0.04, peak: 0.22 });
    S.rumble({ dur: 1.2, f: 80, f1: 300, peak: 0.3, pts: [[1.1, 1], [1.2, 0]] });
    S.whoosh({ at: 1.2, f: 300, f1: 2500, dur: 0.4, peakAt: 0.2, peak: 0.45 });
    S.splat({ at: 1.2, peak: 0.6, dur: 0.4 });
    S.sizzle({ at: 1.25, dur: 1, pts: [[0.05, 1], [1, 0]], peak: 0.25 });
    S.thud({ at: 1.2, f: 80, f1: 35, dur: 0.5, peak: 0.5 });
  });
  def('bm-grubnak-last-orders', 'bm', S => {
    S.space('hall', 0.4);
    S.bell({ f: mf(50), dur: 2.5, peak: 0.35 }); S.bell({ at: 0.9, f: mf(50), dur: 2.5, peak: 0.3 });
    S.drum({ f: 60, dur: 1, peak: 0.45 });
  });
  def('bm-grubnak-gorge', 'bm', S => {
    [0, 0.3, 0.6].forEach(at => B.chomp(S, at, 1));
    S.tone({ at: 0.95, f: 200, f1: 70, dur: 0.35, lp: 600, peak: 0.35 });
    S.tone({ type: 'saw', f: 50, lp: 350, am: [26, 0.5], dur: 1.3, peak: 0.14 });
  });
  def('bm-grubnak-clogged-drains', 'bm', S => {
    for (let i = 0; i < 5; i++) { const at = i * 0.17 + S.rr(0, 0.05), f = S.rr(120, 220); S.tone({ at, f, f1: f * 1.8, glide: 0.08, dur: 0.14, peak: 0.3, lp: 800 }); S.noise({ at, color: 'pink', lp: 600, dur: 0.1, peak: 0.1 }); }
    S.metal({ at: 0.3, set: 'plate', f: 300, dur: 0.4, peak: 0.12 });
    S.whoosh({ f: 400, f1: 900, am: [4, 0.5], dur: 1.0, peak: 0.15 });
  });
  def('bm-grubnak-belly-flop', 'bm', S => {
    S.whoosh({ f: 1200, f1: 250, dur: 0.5, peakAt: 0.85, peak: 0.35 });
    S.thud({ at: 0.45, f: 60, f1: 25, dur: 1, drive: 3, peak: 0.8, sub: 0.4 });
    S.splat({ at: 0.45, peak: 0.55, dur: 0.4 });
    S.rumble({ at: 0.45, dur: 1.3, f: 140, peak: 0.35, a: 0.02 });
  });
  def('bm-grubnak-cleaver-toss', 'bm', S => {
    S.whoosh({ f: 2000, f1: 3000, dur: 0.6, am: [17, 0.8], peak: 0.55 });
    S.whoosh({ f: 600, f1: 1100, dur: 0.6, am: [17, 0.7], peak: 0.3 });
    S.wood({ at: 0.58, f: 300, dur: 0.2, peak: 0.45 }); S.metal({ at: 0.58, set: 'bar', f: 1700, dur: 0.5, peak: 0.15 });
    S.thud({ at: 0.58, f: 150, f1: 70, dur: 0.15, peak: 0.4 });
  });
  def('bm-grubnak-mise-en-place', 'bm', S => {
    for (let i = 0; i < 5; i++) { S.metal({ at: i * 0.16, set: 'bar', f: S.rr(2200, 3200), dur: 0.25, peak: 0.14 }); S.wood({ at: i * 0.16 + 0.01, f: 600, dur: 0.05, peak: 0.2 }); }
    S.whoosh({ at: 0.85, f: 2000, f1: 4000, dur: 0.15, peak: 0.15 });
  });
  def('bm-grubnak-service', 'bm', S => {
    S.space('room', 0.3);
    S.partials({ set: 'service', f: mf(91), dur: 1.2, peak: 0.35 });
    for (let i = 0; i < 5; i++) B.clink(S, S.rr(0.2, 0.5), 0.8);
  });
  def('bm-grubnak-dinner-rush', 'bm', S => {
    for (let i = 0; i < 14; i++) B.clink(S, S.rr(0, 1.3), 1, null, S.rr(-0.6, 0.6));
    [0.2, 0.7, 1.1].forEach(at => S.metal({ at, set: 'plate', f: S.rr(400, 600), dur: 0.5, peak: 0.15 }));
    for (let i = 0; i < 4; i++) S.whoosh({ at: i * 0.3 + S.rr(0, 0.1), f: 600, f1: 2000, dur: 0.15, peak: 0.15 });
    for (let i = 0; i < 6; i++) S.wood({ at: i * 0.21, f: S.rr(300, 500), dur: 0.08, peak: 0.15 });
  });

  // ---------------------------------------------------------------------------------------------- Queen Skitterra
  def('bm-skitterra-intro', 'sting', S => {
    S.space('cave', 0.45);
    S.skitter({ n: 40, dur: 1.2, f: 2200, peak: 0.25 });
    B.hiss(S, 0.8, 1.0, 1);
    S.noise({ at: 0.8, bp: 3500, q: 2, dur: 1.0, pts: [[0.2, 1], [1.0, 0]], peak: 0.15 });
    S.tone({ at: 0.8, type: 'saw', f: 60, lp: 250, dur: 1, a: 0.3, peak: 0.12, am: [7, 0.5] });
  });
  def('bm-skitterra-venom-mist', 'bm', S => {
    S.space('cave', 0.35);
    B.hiss(S, 0, 1.5, 1.2);
    S.bubbles({ n: 12, f: 200, f1: 700, spread: 1.2, size: 0.05, peak: 0.15, lp: 1500 });
    S.whoosh({ f: 400, f1: 1200, dur: 1.4, peakAt: 0.5, peak: 0.25 });
    S.noise({ color: 'pink', bp: 900, q: 2, grain: 0.4, dur: 1.4, pts: [[0.4, 1], [1.4, 0]], peak: 0.15 });
  });
  def('bm-skitterra-silk-wrap', 'bm', S => {
    B.silk(S, 0, 0.9, 1.3);
    S.pluck({ at: 0.9, f: 180, dur: 0.5, bright: 10, peak: 0.3 });
    S.thud({ at: 0.9, f: 110, f1: 50, dur: 0.25, peak: 0.4 });
  });
  def('bm-skitterra-eightfold-lunge', 'bm', S => {
    S.skitter({ n: 30, dur: 0.45, bias: 0.6, f: 2000, peak: 0.3 });
    S.whoosh({ at: 0.35, f: 400, f1: 1800, dur: 0.3, peak: 0.55 });
    B.bite(S, 0.62, 1.1);
    S.tone({ at: 0.62, type: 'saw', f: 70, lp: 400, am: [30, 0.6], dur: 0.4, peak: 0.15 });
  });
  def('bm-skitterra-silk-lines', 'bm', S => {
    for (let i = 0; i < 5; i++) { B.zing(S, i * 0.12, 1, i % 2 ? 0.5 : -0.5); S.pluck({ at: i * 0.12 + 0.12, f: S.rr(500, 900), type: 'tri', dur: 0.3, peak: 0.1 }); }
  });
  def('bm-skitterra-spin', 'bm', S => {
    S.whoosh({ f: 500, f1: 1500, dur: 1.2, am: [6, 0.7], peak: 0.32 });
    B.silk(S, 0, 1.2, 0.7, 0.7);
    [0.3, 0.6, 0.9].forEach((at, i) => B.zing(S, at, 0.7, i - 1));
  });
  def('bm-skitterra-venom-spit', 'bm', S => {
    S.noise({ bp: 1500, q: 1, dur: 0.08, a: 0.001, peak: 0.45 });
    S.noise({ color: 'pink', bp: 1200, bp1: 400, q: 4, dur: 0.2, peak: 0.3 });
    S.whoosh({ at: 0.05, f: 1500, f1: 800, dur: 0.3, peak: 0.2 });
    S.sizzle({ at: 0.35, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.3 });
    S.bubbles({ at: 0.35, n: 6, f: 800, f1: 2500, spread: 0.6, size: 0.02, peak: 0.08 });
  });
  def('bm-skitterra-strand-reel', 'bm', S => {
    S.creak({ f: 22, f1: 30, res: [700, 1500], q: 12, dur: 1.2, am: [8, 0.5, 'square'], peak: 0.25 });
    B.silk(S, 0, 1.2, 0.8);
    for (let i = 0; i < 10; i++) S.wood({ at: i * 0.12, f: 1800, dur: 0.02, peak: 0.12 });
  });
  def('bm-skitterra-silk-reel', 'bm', S => {
    S.creak({ f: 18, f1: 26, res: [400, 900], q: 12, dur: 1.2, am: [6, 0.5, 'square'], peak: 0.3 });
    B.silk(S, 0, 1.0, 1, 0.8);
    S.whoosh({ at: 0.9, f: 300, f1: 1500, dur: 0.4, peak: 0.35 });
    S.thud({ at: 1.25, f: 100, f1: 45, dur: 0.3, peak: 0.45 });
  });
  def('bm-skitterra-brood', 'bm', S => {
    S.tone({ type: 'saw', f: 48, lp: 200, am: [3, 0.8], dur: 1.6, a: 0.3, peak: 0.25 });
    S.skitter({ n: 25, dur: 1.6, f: 3000, peak: 0.12 });
    S.bubbles({ n: 6, f: 200, f1: 500, spread: 1.4, size: 0.06, peak: 0.12, lp: 900 });
  });
  def('bm-skitterra-acid-deluge', 'bm', S => {
    B.rain(S, 0, 1.8, 1.3);
    S.sizzle({ at: 0.3, dur: 1.5, pts: [[0.6, 1], [1.5, 0]], peak: 0.3 });
    S.rumble({ dur: 1.8, f: 200, peak: 0.15 });
  });
  def('bm-skitterra-into-the-dark', 'bm', S => {
    S.space('cave', 0.5);
    S.whoosh({ f: 2500, f1: 200, dur: 1.2, peakAt: 0.2, peak: 0.35 });
    S.tone({ f: 300, f1: 60, dur: 1.4, peak: 0.15 });
    S.thud({ at: 0.9, f: 50, f1: 30, dur: 0.8, peak: 0.45, lp: 300, click: 0 });
  });
  def('bm-skitterra-from-the-dark', 'bm', S => {
    S.skitter({ n: 10, dur: 0.3, f: 3000, peak: 0.15 });
    S.whoosh({ f: 3000, f1: 400, dur: 0.5, peakAt: 0.85, peak: 0.35 });
    S.thud({ at: 0.48, f: 90, f1: 35, dur: 0.4, drive: 1.5, peak: 0.6 });
    B.hiss(S, 0.5, 0.4, 0.6);
  });
  def('bm-skitterra-venom-drip', 'bm', S => {
    [0, 0.35, 0.6].forEach(at => { S.tone({ at, f: 1200, f1: 2400, glide: 0.03, dur: 0.07, peak: 0.3 }); S.sizzle({ at: at + 0.03, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.1 }); });
  });
  def('bm-skitterra-tightening-web', 'bm', S => {
    [0, 0.3, 0.6].forEach((at, i) => S.creak({ at, dur: 1.2 - at * 0.5, f: 30 + i * 10, f1: 70, res: [900 + i * 500, 2000 + i * 700], q: 14, peak: 0.15 }));
    S.tone({ f: 70, f1: 90, dur: 1.5, a: 0.8, swell: true, peak: 0.15, lp: 400 });
    B.silk(S, 0.3, 1.2, 0.7);
  });
  def('bm-skitterra-the-swarm', 'bm', S => {
    for (let i = 0; i < 4; i++) S.skitter({ at: i * 0.1, n: 30, dur: 1.6, f: 1800 + i * 300, peak: 0.22, pan: -0.75 + i * 0.5 });
    S.noise({ bp: 4000, q: 4, am: [30, 0.8], dur: 1.8, pts: [[0.6, 1], [1.8, 0]], peak: 0.08 });
    S.rumble({ dur: 1.8, f: 250, peak: 0.08, sub: 0 });
  });
  def('bm-skitterra-spiderlings', 'bm', S => {
    for (let i = 0; i < 3; i++) S.skitter({ at: i * 0.08, n: 26, dur: 1.1, f: 2200 + i * 400, peak: 0.2, pan: -0.5 + i * 0.5 });
    S.noise({ color: 'pink', bp: 2600, q: 1.2, grain: 0.9, grainRate: 2.2, dur: 1.2, pts: [[0.3, 1], [0.9, 0.8], [1.2, 0]], peak: 0.25 });
    S.noise({ bp: 4500, q: 3, am: [34, 0.8], dur: 1.2, pts: [[0.3, 1], [1.2, 0]], peak: 0.1 });
  });
  def('bm-skitterra-chrysalis', 'bm', S => {
    [0, 0.35, 0.7].forEach(at => { B.silk(S, at, 0.5, 0.9, 0.9); S.whoosh({ at, f: 900, f1: 2200, dur: 0.4, am: [8, 0.5], peak: 0.15 }); });
    [1.1, 1.35, 1.9, 2.15].forEach((at, i) => S.thud({ at, f: 60, f1: 40, dur: 0.18, lp: 220, click: 0, peak: i % 2 ? 0.28 : 0.38 }));
  });
  def('bm-skitterra-the-web-gives-way', 'bm', S => {
    S.noise({ bp: 2000, grain: 0.9, grainRate: 0.7, dur: 0.8, pts: [[0.1, 1], [0.6, 0.7], [0.8, 0]], peak: 0.35 });
    [0.1, 0.3, 0.45].forEach(at => B.snap(S, at, 1));
    for (let i = 0; i < 5; i++) S.thud({ at: S.rr(0.7, 1.4), f: S.rr(80, 140), f1: 45, dur: 0.3, peak: 0.35 });
    S.rumble({ at: 0.7, dur: 1.2, f: 150, peak: 0.3, a: 0.05 });
    S.crackle({ at: 0.7, f: 1500, dur: 1, pts: [[0.05, 1], [1, 0]], peak: 0.2 });
  });
  def('bm-skitterra-egg-sacs', 'bm', S => {
    for (let i = 0; i < 3; i++) { S.tone({ at: i * 0.35, f: 70, f1: 60, dur: 0.3, a: 0.08, peak: 0.3 }); S.noise({ at: i * 0.35, color: 'pink', lp: 500, dur: 0.3, a: 0.08, peak: 0.1 }); }
    S.splat({ at: 1.1, peak: 0.55, dur: 0.4 });
    S.bubbles({ at: 1.1, n: 6, f: 250, f1: 800, spread: 0.4, peak: 0.12 });
  });
  def('bm-skitterra-fang-rush', 'bm', S => {
    [0, 0.2, 0.4].forEach((at, i) => { S.skitter({ at: at - 0.1 > 0 ? at - 0.1 : 0, n: 6, dur: 0.1, peak: 0.15 }); B.bite(S, at, 0.85 + i * 0.1); });
  });
  def('bm-skitterra-spinneret-volley', 'bm', S => {
    for (let i = 0; i < 5; i++) { B.zing(S, i * 0.13, 0.9, S.rr(-0.6, 0.6)); S.noise({ at: i * 0.13, bp: 1000, dur: 0.04, a: 0.001, peak: 0.2 }); }
  });
  def('bm-skitterra-molt', 'bm', S => {
    S.crackle({ f: 1500, dens: 0.8, dur: 0.9, pts: [[0.2, 1], [0.9, 0]], peak: 0.5 });
    S.noise({ color: 'pink', bp: 900, q: 1.5, grain: 0.8, dur: 0.9, pts: [[0.2, 1], [0.9, 0]], peak: 0.2 });
    for (let i = 0; i < 4; i++) S.wood({ at: S.rr(0, 0.6), f: S.rr(900, 1500), dur: 0.06, peak: 0.25 });
    S.splat({ at: 0.7, peak: 0.35, dur: 0.4 });
    S.creak({ at: 0.6, dur: 0.5, f: 25, f1: 10, res: [500, 1100], q: 6, peak: 0.08 });
  });
  def('bm-skitterra-ceiling-ambush', 'bm', S => {
    S.skitter({ n: 20, dur: 0.5, f: 3000, peak: 0.15 });
    S.whoosh({ at: 0.45, f: 2500, f1: 300, dur: 0.45, peakAt: 0.8, peak: 0.35 });
    S.thud({ at: 0.88, f: 80, f1: 32, dur: 0.6, drive: 2, peak: 0.7 });
    S.crackle({ at: 0.88, f: 2000, dur: 0.6, pts: [[0.02, 1], [0.6, 0]], peak: 0.2 });
    S.wood({ at: 0.88, f: 700, dur: 0.06, peak: 0.25 });
  });
  def('bm-skitterra-snare-weave', 'bm', S => {
    [0, 0.12, 0.24, 0.36].forEach((at, i) => { B.zing(S, at, 1, i % 2 ? 0.6 : -0.6); S.pluck({ at: at + 0.14, f: S.rr(300, 450), type: 'tri', dur: 0.4, peak: 0.12 }); });
    B.silk(S, 0.4, 0.8, 1.6);
    S.tone({ at: 0.4, f: 110, f1: 140, dur: 0.8, a: 0.5, swell: true, lp: 600, type: 'saw', peak: 0.12 });
  });

  // ---------------------------------------------------------------------------------------------- Volkar, the Storm Titan
  def('bm-volkar-intro', 'sting', S => {
    S.space('hall', 0.5);
    S.echo({ time: 0.31, fb: 0.35, lp: 1500, kill: 4 });
    B.thunder(S, 0, 1.1, true);
    B.grind(S, 0.6, 1.6, 1);
    S.crack({ at: 1.6, peak: 0.4, ech: 0.4 });
    S.thud({ at: 1.6, f: 70, f1: 30, dur: 0.9, peak: 0.55, drive: 2 });
  });
  def('bm-volkar-pulse', 'bm', S => {
    S.tone({ type: 'saw', f: 45, lp: 400, am: [11, 0.6], dur: 1.0, a: 0.1, peak: 0.3 });
    S.tone({ f: 90, am: [11, 0.6], dur: 1.0, a: 0.1, peak: 0.15 });
    S.zap({ f: 60, dur: 1.0, bf: 1500, peak: 0.07, a: 0.1 });
  });
  def('bm-volkar-thunderclap', 'bm', S => {
    S.space('hall', 0.4);
    S.echo({ time: 0.21, fb: 0.35, lp: 1800, kill: 2.5 });
    S.crack({ f: 2000, peak: 0.5, ech: 0.4 });
    B.thunder(S, 0, 1.3);
  });
  def('bm-volkar-titan-fist', 'bm', S => {
    S.rumble({ dur: 0.5, f: 80, f1: 200, peak: 0.25, pts: [[0.48, 1], [0.5, 0]] });
    S.whoosh({ f: 150, f1: 700, dur: 0.5, peakAt: 0.95, peak: 0.35 });
    S.thud({ at: 0.5, f: 65, f1: 25, dur: 1, drive: 3, peak: 0.85, sub: 0.4 });
    S.partials({ at: 0.5, set: 'stone', f: 300, dur: 0.4, peak: 0.3, strike: 0.6 });
    S.crackle({ at: 0.5, lp: 2500, dur: 0.8, pts: [[0.02, 1], [0.8, 0]], peak: 0.3 });
    S.rumble({ at: 0.5, dur: 1.2, f: 140, peak: 0.3, a: 0.02 });
  });
  def('bm-volkar-polarity-surge', 'bm', S => { B.polarity(S, 0, true, 1); B.polarity(S, 0.35, false, 1); B.bolt(S, 0.8, 0.7); });
  def('bm-volkar-polarity-plus', 'bm', S => { B.polarity(S, 0, true, 1.2); });
  def('bm-volkar-polarity-minus', 'bm', S => { B.polarity(S, 0, false, 1.2); });
  def('bm-volkar-thunder-crash', 'bm', S => { S.space('hall', 0.3); B.bolt(S, 0, 1.2); B.thunder(S, 0.05, 1); });
  def('bm-volkar-static-field', 'bm', S => {
    S.crackle({ dens: 2, f: 4000, dur: 1.4, pts: [[0.3, 1], [1.4, 0]], peak: 0.3 });
    S.zap({ f: 50, dur: 1.4, bf: 3000, jit: 4, a: 0.2, peak: 0.12 });
    S.noise({ hp: 6000, grain: 0.9, dur: 1.4, pts: [[0.3, 1], [1.4, 0]], peak: 0.1 });
    S.tone({ f: 120, am: [50, 0.4], dur: 1.4, a: 0.2, peak: 0.08 });
  });
  def('bm-volkar-rod-strike', 'bm', S => { B.bolt(S, 0, 1); S.metal({ at: 0.02, set: 'bar', f: 900, dur: 1.0, peak: 0.2 }); });
  def('bm-volkar-gale-slam', 'bm', S => {
    S.whoosh({ f: 300, f1: 1200, dur: 0.5, peakAt: 0.3, peak: 0.5, q: 0.7 });
    S.whoosh({ f: 150, f1: 500, dur: 0.8, peak: 0.3 });
    S.thud({ f: 80, f1: 40, dur: 0.4, peak: 0.5 });
  });
  def('bm-volkar-storm-walls', 'bm', S => {
    B.rain(S, 0, 2, 1);
    [0.4, 1.1, 1.6].forEach((at, i) => S.zap({ at, f: 80, dur: 0.15, peak: 0.15, pan: [-0.5, 0.3, 0.6][i] }));
    S.rumble({ dur: 2, f: 120, peak: 0.2 });
  });
  def('bm-volkar-lightning-rods', 'bm', S => {
    S.metal({ set: 'plate', f: 700, dur: 0.6, peak: 0.25, strike: 0.4 });
    S.thud({ f: 120, f1: 50, dur: 0.2, peak: 0.4 });
    S.crackle({ at: 0.15, dens: 2.2, f: 4500, dur: 1.0, pts: [[0.2, 1], [1.0, 0]], peak: 0.2 });
    S.zap({ at: 0.15, f: 70, dur: 1, a: 0.1, peak: 0.08 });
  });
  def('bm-volkar-grounding-rods', 'bm', S => {
    [0, 0.3, 0.6].forEach(at => { S.metal({ at, set: 'plate', f: S.rr(650, 800), dur: 0.5, peak: 0.2, strike: 0.4 }); S.thud({ at, f: 120, f1: 50, dur: 0.2, peak: 0.35 }); });
    S.tone({ f: 100, am: [50, 0.3], dur: 1.4, a: 0.3, peak: 0.1 });
  });
  def('bm-volkar-avalanche', 'bm', S => {
    S.rumble({ dur: 2, f: 200, peak: 0.4, a: 0.3, grain: 0.7 });
    for (let i = 0; i < 10; i++) { const at = S.rr(0.1, 1.6); S.thud({ at, f: S.rr(70, 160), f1: 50, dur: 0.25, peak: S.rr(0.2, 0.4) }); S.partials({ at, set: 'stone', f: S.rr(300, 600), dur: 0.2, peak: 0.08 }); }
    S.crackle({ f: 1500, dur: 1.8, pts: [[0.5, 1], [1.8, 0]], peak: 0.2 });
  });
  def('bm-volkar-squall-line', 'bm', S => {
    S.whoosh({ color: 'pink', f: 300, f1: 1800, dur: 1.8, peakAt: 0.85, peak: 0.45, q: 0.6, am: [5, 0.3] });
    S.noise({ bp: 900, bp1: 2800, q: 25, dur: 1.7, pts: [[1.4, 1], [1.7, 0]], peak: 0.1 });
    S.crackle({ at: 0.8, f: 4000, dens: 2, dur: 1.0, pts: [[0.6, 1], [1.0, 0]], peak: 0.12 });
  });
  def('bm-volkar-eye-of-the-storm', 'bm', S => {
    S.space('hall', 0.4);
    S.whoosh({ f: 1500, f1: 300, dur: 1.6, peakAt: 0.1, peak: 0.35 });
    S.tone({ f: mf(64), dur: 1.8, a: 0.6, swell: true, peak: 0.06 });
    S.glass({ at: 0.8, f: mf(76), dur: 1.2, peak: 0.08 });
  });
  def('bm-volkar-still-air', 'bm', S => {
    S.space('hall', 0.5);
    S.glass({ f: mf(76), dur: 1.6, peak: 0.12 }); S.glass({ at: 0.3, f: mf(83), dur: 1.4, peak: 0.1 });
    S.tone({ f: 220, dur: 1.8, a: 0.6, swell: true, peak: 0.06 });
    S.noise({ hp: 8000, dur: 1.6, pts: [[0.8, 1], [1.6, 0]], peak: 0.03 });
  });
  def('bm-volkar-distant-thunder', 'bm', S => { S.space('hall', 0.4); B.thunder(S, 0, 0.8, true); });
  def('bm-volkar-eye-closes', 'bm', S => {
    S.whoosh({ f: 200, f1: 1500, dur: 1.0, peakAt: 0.9, peak: 0.45 });
    S.rumble({ dur: 1.0, f: 90, f1: 250, peak: 0.3, pts: [[0.95, 1], [1.0, 0]] });
    S.whoosh({ at: 0.95, f: 1200, f1: 400, dur: 0.6, peakAt: 0.1, peak: 0.35 });
  });
  def('bm-volkar-gathering-storm', 'bm', S => {
    S.rumble({ dur: 2, f: 80, f1: 250, peak: 0.4, pts: [[1.8, 1], [2, 0]] });
    S.crackle({ dens: 1.5, f: 3000, dur: 2, pts: [[1.8, 1], [2, 0]], peak: 0.2 });
    S.whoosh({ f: 300, f1: 1200, dur: 2, peakAt: 0.9, peak: 0.25 });
    S.crack({ at: 1.6, peak: 0.25 });
  });
  def('bm-volkar-thunderhead', 'bm', S => {
    S.space('hall', 0.4);
    S.echo({ time: 0.37, fb: 0.4, lp: 1200, kill: 3.5 });
    S.crack({ peak: 0.55, ech: 0.5 });
    S.rumble({ dur: 2.5, f: 160, peak: 0.45, a: 0.05, grain: 0.6, am: [4, 0.5], ech: 0.3 });
    S.crackle({ at: 0.05, f: 1200, dur: 1.8, dens: 0.7, pts: [[0.1, 1], [1.8, 0]], peak: 0.2 });
  });
  def('bm-volkar-heavens-fall', 'bm', S => {
    S.space('hall', 0.5);
    S.crack({ f: 1500, peak: 0.6 });
    B.thunder(S, 0.02, 1.2);
    S.thud({ f: 55, f1: 22, dur: 1.4, drive: 3, peak: 0.8, sub: 0.4 });
    for (let i = 0; i < 8; i++) S.partials({ at: S.rr(0.05, 0.8), set: 'stone', f: S.rr(250, 700), dur: 0.3, peak: 0.12, strike: 0.5 });
    S.rumble({ dur: 2.5, f: 130, peak: 0.4, a: 0.05 });
  });
  def('bm-volkar-chain-lightning', 'bm', S => {
    for (let i = 0; i < 4; i++) { const pan = -0.6 + i * 0.4; S.zap({ at: i * 0.12, f: 100, dur: 0.18, peak: 0.3, pan }); S.crack({ at: i * 0.12, peak: 0.25, dur: 0.15, pan }); }
    S.zap({ f: 55, dur: 0.7, bf: 900, a: 0.02, peak: 0.25, pts: [[0.05, 1], [0.45, 0.8], [0.7, 0]] });
    S.rumble({ at: 0.1, dur: 1.0, f: 180, peak: 0.3, a: 0.05, grain: 0.5 });
  });
  def('bm-volkar-ball-lightning', 'bm', S => {
    S.zap({ f: 70, f1: 110, dur: 1.2, bf: 1800, am: [9, 0.5], a: 0.1, peak: 0.22 });
    S.crackle({ dens: 1.8, f: 4000, dur: 1.2, pts: [[0.3, 1], [1.2, 0]], peak: 0.15 });
    S.tone({ f: 140, f1: 220, dur: 1.2, a: 0.2, peak: 0.12 });
  });
  def('bm-volkar-skyfall', 'bm', S => {
    S.tone({ f: 2400, f1: 500, glide: 0.9, dur: 0.9, a: 0.05, peak: 0.1 });
    S.noise({ bp: 3000, bp1: 600, q: 8, dur: 0.9, pts: [[0.85, 1], [0.9, 0]], peak: 0.2 });
    S.thud({ at: 0.9, f: 70, f1: 26, dur: 0.8, drive: 3, peak: 0.8 });
    S.crackle({ at: 0.9, lp: 2500, dur: 0.7, pts: [[0.02, 1], [0.7, 0]], peak: 0.25 });
    S.rumble({ at: 0.9, dur: 1.2, f: 140, peak: 0.3, a: 0.02 });
  });
  def('bm-volkar-supercell', 'bm', S => {
    S.space('hall', 0.35);
    [0, 0.5, 1.0, 1.5].forEach((at, i) => { const pan = -0.7 + i * 0.5; S.crack({ at, peak: 0.3 + i * 0.07, pan }); S.rumble({ at, dur: 1.0, f: 160, peak: 0.25 + i * 0.05, a: 0.03, pan }); });
  });

  // ---------------------------------------------------------------------------------------------- The Hollow King
  const chains = (S, at, d, pk) => { for (let i = 0; i < 14; i++) S.metal({ at: at + S.rr(0, d), set: 'bar', f: S.rr(1800, 3200), dur: 0.12, peak: 0.08 * pk, click: 0.3 }); };
  def('bm-hollowking-intro', 'sting', S => {
    S.space('hall', 0.6);
    S.bell({ f: mf(36), dur: 4, peak: 0.4 });
    chains(S, 0.3, 1.2, 1);
    S.scrape({ at: 0.3, f: 2200, q: 3, rate: 25, dur: 1.0, pts: [[0.2, 1], [1, 0]], peak: 0.08 });
    S.choir({ at: 0.2, notes: [mf(36), mf(43)], vowel: 'u', dur: 3, a: 1, peak: 0.1 });
  });
  def('bm-hollowking-barrow-knell', 'bm', S => {
    S.space('hall', 0.6);
    S.bell({ f: mf(38), dur: 4, peak: 0.45, lp: 3000 });
    S.choir({ notes: [mf(38), mf(45)], vowel: 'u', dur: 3.5, a: 1, peak: 0.1 });
    S.rumble({ dur: 2, f: 100, peak: 0.15, a: 0.05 });
  });
  def('bm-hollowking-royal-gaze', 'bm', S => {
    S.space('cave', 0.45);
    S.voice({ f: 80, dur: 1.2, vowel: 'e', vowel1: 'u', breath: 5, peak: 0.3, lp: 6000, pts: [[0.5, 1], [1.2, 0]] });
    S.tone({ f: 1800, f1: 2200, dur: 1.2, a: 0.5, swell: true, peak: 0.04 }); S.tone({ f: 1806, f1: 2207, dur: 1.2, a: 0.5, swell: true, peak: 0.04 });
    S.tone({ type: 'saw', f: 55, lp: 200, dur: 1.2, a: 0.3, peak: 0.1 });
    S.glass({ at: 0.1, f: mf(86), dur: 1, peak: 0.06 });
  });
  def('bm-hollowking-grave-cleave', 'bm', S => {
    S.whoosh({ f: 150, f1: 900, dur: 0.5, peakAt: 0.95, peak: 0.35 });
    S.metal({ at: 0.45, set: 'bar', f: 700, dur: 1.2, peak: 0.2, strike: 0.5 });
    S.thud({ at: 0.45, f: 70, f1: 30, dur: 0.7, drive: 2.5, peak: 0.7 });
    S.noise({ at: 0.5, bp: 2500, bp1: 600, q: 3, dur: 0.35, grain: 0.8, grainRate: 0.6, pts: [[0.03, 1], [0.35, 0]], peak: 0.35 });
    S.splat({ at: 0.55, peak: 0.25, dur: 0.2 });
  });
  def('bm-hollowking-royal-doom', 'bm', S => {
    S.space('hall', 0.45);
    for (let i = 0; i < 8; i++) S.tick({ at: i * 0.5, f: i % 2 ? 1400 : 1600, peak: 0.25 });
    S.choir({ notes: [mf(38), mf(41), mf(45)], vowel: 'o', vowel1: 'u', dur: 4.2, a: 1.5, peak: 0.16 });
    S.bell({ at: 4.0, f: mf(36), dur: 3.5, peak: 0.5 });
    S.thud({ at: 4.0, f: 50, f1: 28, dur: 1, peak: 0.45 });
  });
  def('bm-hollowking-lantern', 'bm', S => {
    S.crackle({ f: 1500, dens: 0.9, dur: 1.2, pts: [[0.2, 1], [1.2, 0]], peak: 0.22 });
    S.noise({ color: 'pink', lp: 600, dur: 1.2, pts: [[0.2, 1], [1.2, 0]], peak: 0.12 });
    S.creak({ dur: 0.35, f: 30, res: [1800, 3200], q: 14, peak: 0.1 });
    S.metal({ set: 'bar', f: 2200, dur: 0.2, peak: 0.08 });
  });
  def('bm-hollowking-echo-knights', 'bm', S => {
    S.space('hall', 0.35);
    S.echo({ time: 0.28, fb: 0.5, lp: 1500, kill: 2.5 });
    S.creak({ dur: 0.8, f: 20, f1: 35, res: [900, 2200, 3400], q: 15, peak: 0.2 });
    for (let i = 0; i < 3; i++) S.metal({ at: S.rr(0, 0.6), set: 'plate', f: S.rr(700, 1100), dur: 0.2, peak: 0.08 });
    S.whoosh({ at: 0.6, f: 300, f1: 1200, dur: 0.45, peak: 0.55, ech: 0.6 });
    S.choir({ at: 0.5, notes: [mf(45), mf(52)], vowel: 'u', dur: 1.4, a: 0.3, peak: 0.12 });
  });
  def('bm-hollowking-barrow-bells', 'bm', S => {
    S.space('hall', 0.5);
    [[0, 50, 'church'], [0.3, 57, 'hand'], [0.55, 45, 'church'], [0.95, 53, 'hand'], [1.2, 48, 'church']].forEach(([at, n, set]) => S.bell({ at, f: mf(n), set, dur: 2.5, peak: 0.22 }));
  });
  def('bm-hollowking-coffin-lids', 'bm', S => {
    B.grind(S, 0, 1.2, 1.2);
    S.thud({ at: 1.2, f: 70, f1: 35, dur: 0.6, peak: 0.6 });
    S.partials({ at: 1.2, set: 'stone', f: 260, dur: 0.4, peak: 0.2, strike: 0.5 });
  });
  def('bm-hollowking-the-long-night', 'bm', S => {
    S.space('hall', 0.6);
    S.whoosh({ f: 2000, f1: 200, dur: 1.5, peakAt: 0.1, peak: 0.25 });
    S.tone({ f: 55, dur: 3, a: 1, swell: true, peak: 0.12 });
    S.bell({ at: 0.8, f: mf(45), dur: 3, peak: 0.22, lp: 1200 });
    S.whoosh({ at: 0.5, f: 300, f1: 600, dur: 2.5, peak: 0.06, am: [0.7, 0.5] });
  });
  def('bm-hollowking-judgement', 'bm', S => {
    S.space('hall', 0.45);
    S.echo({ time: 0.33, fb: 0.3, lp: 1500, kill: 2.5 });
    B.windup(S, 0, 0.3, 1);
    S.wood({ at: 0.28, f: 330, dur: 0.3, peak: 0.5, ech: 0.4 });
    S.thud({ at: 0.28, f: 120, f1: 50, dur: 0.5, peak: 0.6, click: 0.7, ech: 0.4 });
    S.bell({ at: 0.3, f: mf(43), dur: 2.5, peak: 0.25 });
  });
  def('bm-hollowking-sceptre-sweep', 'bm', S => {
    S.whoosh({ f: 250, f1: 1400, dur: 0.6, peakAt: 0.6, peak: 0.45, q: 0.9 });
    S.metal({ at: 0.1, set: 'bar', f: 1100, dur: 0.6, peak: 0.1 });
    chains(S, 0.05, 0.4, 0.6);
  });
  def('bm-hollowking-barrow-stomp', 'bm', S => {
    S.thud({ f: 60, f1: 28, dur: 0.8, drive: 2.5, peak: 0.8, sub: 0.4 });
    S.crackle({ lp: 2000, dur: 0.6, pts: [[0.02, 1], [0.6, 0]], peak: 0.25 });
    S.partials({ set: 'stone', f: 250, dur: 0.3, peak: 0.15 });
    S.rumble({ dur: 1.2, f: 130, peak: 0.3, a: 0.02 });
  });
  def('bm-hollowking-crown-of-graves', 'bm', S => {
    S.space('hall', 0.35);
    for (let i = 0; i < 6; i++) { const at = i * 0.12, pan = Math.cos(i / 6 * TAU) * 0.7; S.thud({ at, f: 100, f1: 50, dur: 0.3, peak: 0.35, pan }); S.partials({ at, set: 'stone', f: 350, dur: 0.2, peak: 0.1, pan }); }
    S.choir({ at: 0.7, notes: [mf(45), mf(48), mf(52)], vowel: 'a', a: 0.05, dur: 1.2, peak: 0.15 });
  });
  def('bm-hollowking-the-charge-sheet', 'bm', S => {
    B.parchment(S, 0, 0.6, 1);
    for (let i = 0; i < 4; i++) S.scrape({ at: 0.15 + i * 0.1, f: 4500, q: 3, rate: 80, dur: 0.07, pts: [[0.01, 1], [0.07, 0]], peak: 0.12 });
    S.drum({ at: 0.7, f: 60, dur: 0.6, peak: 0.45 }); S.drum({ at: 1.1, f: 55, dur: 0.8, peak: 0.5 });
  });
  def('bm-hollowking-royal-decree', 'bm', S => {
    S.space('hall', 0.4);
    S.horn({ f: mf(38), dur: 1.2, peak: 0.3 });
    B.stamp(S, 1.0, 1);
  });
  def('bm-hollowking-lights-out', 'bm', S => {
    S.whoosh({ f: 2000, f1: 300, dur: 0.5, peakAt: 0.15, peak: 0.35 });
    S.sizzle({ at: 0.1, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.2 });
    S.thud({ at: 0.4, f: 50, f1: 30, dur: 0.8, peak: 0.4, lp: 300, click: 0 });
    S.tone({ at: 0.3, f: 400, f1: 80, dur: 1.0, peak: 0.08 });
  });
  def('bm-hollowking-court-of-bones', 'bm', S => {
    S.space('hall', 0.4);
    for (let i = 0; i < 30; i++) S.wood({ at: S.rr(0, 1.5), f: S.rr(1200, 2500), dur: 0.03, peak: 0.2, pan: S.rr(-0.6, 0.6) });
    S.choir({ notes: [mf(40), mf(47)], vowel: 'u', dur: 1.8, a: 0.6, peak: 0.12 });
    S.drum({ at: 0.2, f: 55, dur: 0.8, peak: 0.4 });
  });
  def('bm-hollowking-grave-marks', 'bm', S => {
    [0, 0.35, 0.7].forEach(at => { S.scrape({ at, f: 900, q: 2, rate: 30, dur: 0.25, pts: [[0.05, 1], [0.25, 0]], peak: 0.25 }); S.thud({ at: at + 0.2, f: 120, f1: 55, dur: 0.2, peak: 0.4 }); });
  });
  def('bm-hollowking-the-king-rises', 'bm', S => {
    S.space('hall', 0.45);
    S.rumble({ dur: 2, f: 80, f1: 300, peak: 0.4, pts: [[1.8, 1], [2, 0]] });
    S.choir({ notes: [mf(38), mf(45), mf(50), mf(53)], vowel: 'o', vowel1: 'a', dur: 2.1, pts: [[1.7, 1], [2.1, 0]], peak: 0.2 });
    S.metal({ at: 1.8, set: 'plate', f: 500, dur: 0.6, peak: 0.2, strike: 0.4 });
    S.thud({ at: 1.85, f: 70, f1: 30, dur: 0.6, peak: 0.55, drive: 2 });
  });
  def('bm-hollowking-royal-tithe', 'bm', S => {
    S.coins({ n: 10, f: 3200, spread: 0.5, peak: 0.2 });
    S.pad({ notes: [mf(38), mf(44)], a: 0.01, swell: false, dur: 0.8, lp: 600, peak: 0.2 });
    S.whoosh({ at: 0.2, f: 3000, f1: 400, dur: 0.5, peak: 0.2 });
  });
  def('bm-hollowking-dirge', 'bm', S => {
    S.space('hall', 0.5);
    [[0, 50], [0.7, 48], [1.4, 45]].forEach(([at, n]) => S.choir({ at, notes: [mf(n), mf(n - 7)], vowel: 'o', dur: 1.1, a: 0.3, peak: 0.15 }));
    S.drum({ f: 55, dur: 0.8, peak: 0.35 }); S.drum({ at: 1.4, f: 52, dur: 1, peak: 0.4 });
  });
  def('bm-hollowking-royal-audience', 'bm', S => {
    S.space('cave', 0.45);
    S.voice({ f: 80, dur: 1.0, vowel: 'i', vowel1: 'o', breath: 5, peak: 0.25, lp: 6000, pts: [[0.4, 1], [1.0, 0]] });
    S.bell({ at: 0.3, set: 'hand', f: mf(57), dur: 1.8, peak: 0.22 });
    S.tone({ type: 'saw', f: 55, lp: 200, dur: 1.5, a: 0.3, peak: 0.1 });
  });
  def('bm-hollowking-funeral-march', 'bm', S => {
    S.space('hall', 0.45);
    [0, 0.7, 1.4, 2.1].forEach(at => S.drum({ at, f: 60, dur: 0.7, peak: 0.45 }));
    S.bell({ f: mf(45), dur: 2.8, peak: 0.2 });
    S.choir({ at: 0.2, notes: [mf(38), mf(45)], vowel: 'u', dur: 2.5, a: 0.8, peak: 0.08 });
  });
  def('bm-hollowking-gravebind', 'bm', S => {
    chains(S, 0, 0.7, 1.2);
    S.scrape({ f: 2200, q: 3, rate: 25, dur: 0.7, pts: [[0.1, 1], [0.7, 0]], peak: 0.12 });
    S.thud({ at: 0.75, f: 110, f1: 50, dur: 0.3, peak: 0.5 });
    S.metal({ at: 0.75, set: 'plate', f: 600, dur: 0.5, peak: 0.15 });
  });
  def('bm-hollowking-burial-rites', 'bm', S => {
    S.space('hall', 0.4);
    [0, 0.5, 1.0].forEach(at => { S.noise({ at, color: 'brown', lp: 1200, grain: 0.9, grainRate: 0.6, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.3 }); S.thud({ at, f: 90, f1: 50, dur: 0.15, peak: 0.25, click: 0 }); });
    S.bell({ at: 1.4, set: 'hand', f: mf(52), dur: 2, peak: 0.2 });
    S.choir({ at: 0.3, notes: [mf(40), mf(47)], vowel: 'u', dur: 2, a: 0.6, peak: 0.08 });
  });
  def('bm-hollowking-writ-of-execution', 'bm', S => {
    S.space('hall', 0.45);
    B.parchment(S, 0, 0.5, 1);
    B.stamp(S, 0.55, 1.1);
    S.bell({ at: 0.8, f: mf(38), dur: 3, peak: 0.35 });
  });

  // ============================================================================================== 6. loops
  // Beds built from long looped material at unrelated lengths, moved by slow LFOs so they never feel like a loop.
  loop('amb-town', 'amb', L => {
    // breeze: pink noise through a wandering band
    const wind = L.c(L.src('pink'), L.f('bandpass', 520, 0.6)), wg = L.g(0.5);
    L.lfo(wind.frequency, 0.071, 260); L.lfo(wind.frequency, 0.029, 140); L.lfo(wg.gain, 0.043, 0.3);
    L.c(wind, wg, L.out);
    const gust = L.c(L.src('brown', 0.9), L.f('lowpass', 320), L.g(0.25)); L.lfo(gust.gain, 0.021, 0.2); gust.connect(L.out);
    // birds: two copies of the song at unrelated rates and offsets
    L.c(L.src(birdBuf(L.ctx), 1), L.f('highpass', 1600), L.g(0.12), L.out);
    L.c(L.src(birdBuf(L.ctx), 0.87), L.f('highpass', 1600), L.f('lowpass', 5000), L.g(0.07), L.out);
    // a faint murmur of people: brown noise through two moving formants, chopped at a speaking rate
    const mur = L.src('brown', 1.3), mg = L.g(0.0);
    [[480, 5], [1150, 6]].forEach(([f, q], i) => { const bq = L.f('bandpass', f, q); L.lfo(bq.frequency, 0.6 + i * 0.37, f * 0.25); L.c(mur, bq, mg); });
    const chop = L.g(0.5); L.lfo(chop.gain, 2.7, 0.35); L.lfo(chop.gain, 0.13, 0.15);
    L.c(mg, chop, L.f('lowpass', 1400), L.g(0.5), L.out); mg.gain.value = 0.6;
    // room tone
    L.c(L.src('brown', 0.7), L.f('lowpass', 110), L.g(0.4), L.out);
  }, 2.5);
  loop('amb-fountain', 'amb', L => {
    L.c(L.src(waterBuf(L.ctx), 1), L.f('highpass', 300), L.g(0.35), L.out);
    L.c(L.src(waterBuf(L.ctx), 0.91), L.f('bandpass', 900, 0.7), L.g(0.2), L.out);
    const wash = L.c(L.src('white'), L.f('bandpass', 2600, 0.5), L.f('lowpass', 7000), L.g(0.1)); L.lfo(wash.gain, 0.17, 0.03); wash.connect(L.out);
    L.c(L.src('pink'), L.f('lowpass', 500), L.g(0.12), L.out);
  }, 1.5);
  loop('amb-tavern', 'amb', L => {
    const mur = L.src('brown', 1.2), mg = L.g(0.7);
    [[420, 4], [900, 5], [1500, 6]].forEach(([f, q], i) => { const bq = L.f('bandpass', f, q); L.lfo(bq.frequency, 0.5 + i * 0.31, f * 0.3); L.c(mur, bq, mg); });
    const chop = L.g(0.55); L.lfo(chop.gain, 3.1, 0.3); L.lfo(chop.gain, 0.11, 0.2);
    L.c(mg, chop, L.f('lowpass', 900), L.g(0.6), L.out);
    L.c(L.src(clinkBuf(L.ctx), 1), L.f('lowpass', 2500), L.g(0.18), L.out);
    L.c(L.src(clinkBuf(L.ctx), 0.83), L.f('lowpass', 1800), L.g(0.1), L.out);
    L.c(L.src('brown', 0.6), L.f('lowpass', 140), L.g(0.4), L.out);
  }, 1.5);
  loop('amb-pond', 'amb', L => {
    L.c(L.src(frogBuf(L.ctx), 1), L.f('lowpass', 2500), L.g(0.18), L.out);
    L.c(L.src(frogBuf(L.ctx), 1.13), L.f('lowpass', 1800), L.g(0.08), L.out);
    const lap = L.c(L.src('brown'), L.f('lowpass', 480), L.g(0.5)); L.lfo(lap.gain, 0.37, 0.35); L.lfo(lap.gain, 0.19, 0.15); lap.connect(L.out);
    L.c(L.src(waterBuf(L.ctx), 0.6), L.f('lowpass', 1200), L.g(0.06), L.out);
  }, 1.5);
  loop('portal-hum', 'amb', L => {
    const body = L.g(0.18);
    [55, 55.4, 82.5].forEach((f, i) => L.c(L.osc(i === 2 ? 'triangle' : 'sawtooth', f), body));
    const lp = L.f('lowpass', 380, 2); L.lfo(lp.frequency, 0.19, 140); L.c(body, lp, L.out);
    const sh = L.g(0.03); L.c(L.osc('sine', 880), sh); L.c(L.osc('sine', 1321), sh); L.lfo(sh.gain, 0.23, 0.025); L.c(sh, L.out);
    const swirl = L.c(L.src('pink'), L.f('bandpass', 1200, 7)); L.lfo(swirl.frequency, 0.31, 600); L.c(swirl, L.g(0.25), L.out);
    const sub = L.g(0.25); L.c(L.osc('sine', 110), sub); L.lfo(sub.gain, 0.3, 0.12); L.c(sub, L.out);
    L.verb('hall', 0.25, body);
  }, 1.2);
  loop('ab-cast-loop', 'loop', L => {
    const g = L.g(0.12);
    [mf(57), mf(64), mf(69) * 1.002].forEach(f => { const o = L.osc('sine', f); L.lfo(o.frequency, 4.5 + L.r(), f * 0.004); L.c(o, g); });
    L.lfo(g.gain, 2.9, 0.04);
    L.c(g, L.out);
    const air = L.c(L.src('pink'), L.f('bandpass', 2400, 3)); L.lfo(air.frequency, 0.7, 900); L.c(air, L.g(0.18), L.out);
    L.c(L.crackle(1.4), L.f('highpass', 5000), L.g(0.06), L.out);
  }, 0.35);
  loop('low-hp', 'alert', L => {
    L.c(L.src(heartBuf(L.ctx), 1), L.f('lowpass', 260), L.g(1.0), L.out);
    const drone = L.g(0.05); L.c(L.osc('sine', 46), drone); L.lfo(drone.gain, 0.13, 0.02); L.c(drone, L.out);
  }, 0.25);

  // ---------------------------------------------------------------------------------------------- install
  const API = { mf, st, CAT, TRIM, ABIL, ACC, strict: false, names: () => DEFS.map(d => d[0]), loops: () => LOOPS.map(d => d[0]), installed: false };
  function install(Snd) {
    for (const [name, fn] of DEFS) {
      Snd.define(name, (ctx, out, t0, p) => {
        const S = mk(ctx, out, t0, p, name);
        try {
          const d = fn(S, S.p) || 0;
          return Math.max(d, S.end - t0) + S.tail;
        } catch (e) {
          if (API.strict) throw e;
          if (!API['warned-' + name]) { API['warned-' + name] = true; if (typeof console !== 'undefined') console.warn('[sfx] ' + name + ': ' + e.message); }
          return Math.max(0, S.end - t0);
        }
      });
    }
    if (Snd.defineLoop) for (const [name, fn, fadeIn] of LOOPS) {
      Snd.defineLoop(name, (ctx, out, p) => { const { L, stop } = mkLoop(ctx, out, p, name, fadeIn); fn(L, p || {}); return stop; });
    }
    API.installed = true;
  }
  API.install = install;
  G.SfxSynth = API;
  if (typeof Sound !== 'undefined' && Sound && typeof Sound.define === 'function') install(Sound);
})(typeof globalThis !== 'undefined' ? globalThis : this);
