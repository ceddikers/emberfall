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
      const H = HEAVY[name];   // short, sharp sounds: squash the click so the body can be raised (see HEAVY)
      c.threshold.value = H ? -38 : -24; c.knee.value = H ? 8 : 12; c.ratio.value = H ? 10 : 4; c.attack.value = H ? 0.001 : 0.002; c.release.value = H ? 0.2 : 0.12;
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
  // short, sharp recipes whose click is far above their body: a harder, slower compressor lowers the crest so the same
  // peak ceiling carries more loudness
  const HEAVY = {};
  for (const n of ['ab-ledger', 'ab-dot', 'ab-bastion-blade', 'ab-bloodreaver-hack', 'ab-bloodreaver-letting', 'ab-ranger-pierce', 'ab-shadowblade-evis',
    'ab-shadowblade-backstab', 'ab-driftblade-carve', 'ab-driftblade-hook', 'ab-driftblade-pass', 'ab-driftblade-auto', 'ab-oathbroker-audit',
    'ab-oathbroker-auto', 'ab-ironpalm-kick', 'ab-ironpalm-crane', 'ab-marionettist-jab', 'bm-skitterra-eightfold-lunge', 'bm-skitterra-molt']) HEAVY[n] = 1;
  // @@TRIM-BEGIN
  const TRIM = {
    'ab-alembist-auto': 6.5, 'ab-alembist-batch': -1.5, 'ab-alembist-blend': 0.5, 'ab-alembist-dew': -1,
    'ab-alembist-distill': -1, 'ab-alembist-ember': -1.5, 'ab-alembist-quicksilver': 0.5, 'ab-alembist-salt': 1,
    'ab-alembist-throw': 1, 'ab-bastion-aegis': -1, 'ab-bastion-auto': 1.5, 'ab-bastion-avatar': -2,
    'ab-bastion-banner': -0.5, 'ab-bastion-bash': -2, 'ab-bastion-blade': 5.5, 'ab-bastion-brace': 1.5,
    'ab-bastion-bulwark': -1.5, 'ab-bastion-edge': -1.5, 'ab-bastion-hallowed': -2, 'ab-bastion-oath': -1,
    'ab-bastion-zeal': -2.5, 'ab-bloodreaver-auto': 1.5, 'ab-bloodreaver-drain': -1.5, 'ab-bloodreaver-frenzy': -2,
    'ab-bloodreaver-hack': 5, 'ab-bloodreaver-lance': 1.5, 'ab-bloodreaver-letting': 5.5, 'ab-bloodreaver-moon': 1,
    'ab-bloodreaver-rampage': -1.5, 'ab-bloodreaver-scab': 2, 'ab-bloodreaver-undying': 0.5, 'ab-bloodreaver-warcry': -1,
    'ab-buff': 2, 'ab-cast-loop': -16, 'ab-chronomancer-accel': -2, 'ab-chronomancer-auto': 4,
    'ab-chronomancer-bolt': -0.5, 'ab-chronomancer-bubble': -1, 'ab-chronomancer-chamber': -1, 'ab-chronomancer-recall': -3.5,
    'ab-chronomancer-rewind': -1.5, 'ab-chronomancer-shift': -0.5, 'ab-chronomancer-stasis': -1, 'ab-chronomancer-warp': -1,
    'ab-cleric-auto': 1.5, 'ab-cleric-barrier': -2, 'ab-cleric-bene': -3, 'ab-cleric-condemn': -3.5,
    'ab-cleric-dawnbloom': -3, 'ab-cleric-dawnsanctum': -2, 'ab-cleric-intervene': -2.5, 'ab-cleric-mend': -1.5,
    'ab-cleric-petal': -2.5, 'ab-cleric-prayer': -2, 'ab-cleric-smite': -2, 'ab-dot': 6.5,
    'ab-driftblade-auto': 5, 'ab-driftblade-carve': 3.5, 'ab-driftblade-cross': 1.5, 'ab-driftblade-eyestep': 0.5,
    'ab-driftblade-gale': 1.5, 'ab-driftblade-galeline': 1, 'ab-driftblade-gyre': 1, 'ab-driftblade-hook': 3,
    'ab-driftblade-impact': -2.5, 'ab-driftblade-pass': 5.5, 'ab-driftblade-roost': 1.5, 'ab-driftblade-slip': 5,
    'ab-driftblade-starfall': -1, 'ab-driftblade-still': -0.5, 'ab-driftblade-tailspin': 0.5, 'ab-fire': -1.5,
    'ab-gloomsworn-auto': 2, 'ab-gloomsworn-mantle': 1.5, 'ab-gloomsworn-pact': 1, 'ab-gloomsworn-pall': 0.5,
    'ab-gloomsworn-pyre': -1, 'ab-gloomsworn-reave': -1.5, 'ab-gloomsworn-rend': 0.5, 'ab-gloomsworn-rite': -0.5,
    'ab-gloomsworn-shade': 4, 'ab-gloomsworn-strike': -2, 'ab-gloomsworn-wardmantle': 1, 'ab-gorgemaw-auto': 4.5,
    'ab-gorgemaw-bottomless': -0.5, 'ab-gorgemaw-gnash': 4, 'ab-gorgemaw-iron': 1.5, 'ab-gorgemaw-regurgitate': -1.5,
    'ab-gorgemaw-spit': 3.5, 'ab-gorgemaw-stonebelly': -0.5, 'ab-gorgemaw-wide': -0.5, 'ab-grovekeeper-auto': 8.5,
    'ab-grovekeeper-bloom': -1.5, 'ab-grovekeeper-canopy': -2, 'ab-grovekeeper-growth': -1, 'ab-grovekeeper-lifebind': -2,
    'ab-grovekeeper-moonwell': -2, 'ab-grovekeeper-rebirth': -1.5, 'ab-grovekeeper-rejuv': -1.5, 'ab-grovekeeper-seed': -1,
    'ab-grovekeeper-thorn': 1.5, 'ab-grovekeeper-treant': -1.5, 'ab-heal': -1.5, 'ab-heavy': -1,
    'ab-holy': -2, 'ab-houndmaster-auto': 2.5, 'ab-houndmaster-calloff': -5.5, 'ab-houndmaster-finisher': 1,
    'ab-houndmaster-flank': -7, 'ab-houndmaster-howl': -3, 'ab-houndmaster-knife': 0.5, 'ab-houndmaster-longchase': -6.5,
    'ab-houndmaster-mount': 5, 'ab-houndmaster-pounce': 5.5, 'ab-houndmaster-quarry': 5, 'ab-houndmaster-relay': -6.5,
    'ab-houndmaster-ridedown': 0.5, 'ab-ironpalm-auto': 0.5, 'ab-ironpalm-bell': -1.5, 'ab-ironpalm-bellows': 1,
    'ab-ironpalm-breaker': -1, 'ab-ironpalm-crane': 3.5, 'ab-ironpalm-dragon': -2.5, 'ab-ironpalm-drop': -2.5,
    'ab-ironpalm-flow': -0.5, 'ab-ironpalm-gate': -1, 'ab-ironpalm-kick': 5, 'ab-ironpalm-ox': -1.5,
    'ab-ironpalm-palm': -0.5, 'ab-ironpalm-palms': -1.5, 'ab-ironpalm-pond': -0.5, 'ab-ironpalm-slide': -1,
    'ab-ironpalm-wall': -0.5, 'ab-kenseier-auto': 2, 'ab-kenseier-cut': 1, 'ab-kenseier-deathblow': 1,
    'ab-kenseier-deflect': 7.5, 'ab-kenseier-duel': 1.5, 'ab-kenseier-guard': 0.5, 'ab-kenseier-mantle': 1.5,
    'ab-kenseier-mikiri': 9, 'ab-kenseier-whirlwind': 10.5, 'ab-lanternkeeper-auto': 4.5, 'ab-lanternkeeper-beacon': -1,
    'ab-lanternkeeper-beaconflare': -1, 'ab-lanternkeeper-carry': 1.5, 'ab-lanternkeeper-festival': 1.5, 'ab-lanternkeeper-flare': -1.5,
    'ab-lanternkeeper-hand': -1, 'ab-lanternkeeper-relight': -1.5, 'ab-lanternkeeper-set': 2, 'ab-lanternkeeper-stride': 3.5,
    'ab-lanternkeeper-trail': 4.5, 'ab-lanternkeeper-trim': 6.5, 'ab-lanternkeeper-wisp': 6.5, 'ab-ledger': 5,
    'ab-magic-generic': 0.5, 'ab-marionettist-auto': 9, 'ab-marionettist-cross': 2.5, 'ab-marionettist-crossfire': -1,
    'ab-marionettist-cue': 1, 'ab-marionettist-cutcord': 2, 'ab-marionettist-finale': -1.5, 'ab-marionettist-jab': 7,
    'ab-marionettist-pirouette': 1, 'ab-marionettist-pull': 5, 'ab-marionettist-redcurtain': 2, 'ab-marionettist-string': 4.5,
    'ab-marionettist-strum': 2, 'ab-marionettist-swap': 0.5, 'ab-marionettist-tangle': 5, 'ab-maw': 1,
    'ab-melee-generic': 0.5, 'ab-nature': 3.5, 'ab-oathbroker-audit': 5, 'ab-oathbroker-auto': 4.5,
    'ab-oathbroker-blanket': -1, 'ab-oathbroker-cosign': 0.5, 'ab-oathbroker-default': -1, 'ab-oathbroker-foreclose': -2.5,
    'ab-oathbroker-moratorium': -1.5, 'ab-oathbroker-reneg': 4.5, 'ab-oathbroker-warrant': -0.5, 'ab-oathbroker-writ': -1.5,
    'ab-pyromancer-auto': 2, 'ab-pyromancer-circle': -1.5, 'ab-pyromancer-combust': -2, 'ab-pyromancer-fireball': -2.5,
    'ab-pyromancer-fireblast': -2, 'ab-pyromancer-meteor': -3, 'ab-pyromancer-phoenix': -2, 'ab-pyromancer-phoenixblast': -2.5,
    'ab-pyromancer-phoenixflame': -2, 'ab-pyromancer-pyro': -3.5, 'ab-pyromancer-vent': -1.5, 'ab-ranged-generic': 1,
    'ab-ranger-aimed': 0.5, 'ab-ranger-auto': 8, 'ab-ranger-barrage': 1, 'ab-ranger-caustic': 6,
    'ab-ranger-cloak': 0.5, 'ab-ranger-explosive': -3.5, 'ab-ranger-falcon': 1.5, 'ab-ranger-mark': 3.5,
    'ab-ranger-pierce': 3.5, 'ab-ranger-quick': 6, 'ab-ranger-rapid': 1.5, 'ab-rune': 0.5,
    'ab-runeguard-cleave': -3, 'ab-runeguard-glyph': -2.5, 'ab-runeguard-living': -2.5, 'ab-runeguard-mirror': -1.5,
    'ab-runeguard-overload': -2.5, 'ab-runeguard-sanctum': -2, 'ab-runeguard-strike': -1, 'ab-runeguard-ward': -2,
    'ab-runeguard-whirl': -1.5, 'ab-shadowblade-auto': 2.5, 'ab-shadowblade-backstab': 6, 'ab-shadowblade-blossom': 1,
    'ab-shadowblade-dance': 1.5, 'ab-shadowblade-evis': 5.5, 'ab-shadowblade-fury': 0.5, 'ab-shadowblade-rupture': 1.5,
    'ab-shadowblade-shadowcut': 1.5, 'ab-shadowblade-shadowedge': 0.5, 'ab-shadowblade-smoke': 1, 'ab-shadowblade-step': 2,
    'ab-shadowblade-strike': 2, 'ab-shadowblade-venom': 2, 'ab-shield': 1.5, 'ab-shot': 6,
    'ab-slash': 0.5, 'ab-stab': 1.5, 'ab-taunt': 4, 'ab-thermist-auto': 2,
    'ab-thermist-cinder': -1.5, 'ab-thermist-equil': -0.5, 'ab-thermist-flare': -2.5, 'ab-thermist-invert': -1.5,
    'ab-thermist-lance': -1, 'ab-thermist-redgiant': -2, 'ab-thermist-shock': -2.5, 'ab-thermist-sunset': -1.5,
    'ab-thermist-thermocline': -1.5, 'ab-thermist-zero': -2, 'ab-thread': 4, 'ab-threadweaver-auto': 9,
    'ab-threadweaver-cradle': -0.5, 'ab-threadweaver-embroider': 0.5, 'ab-threadweaver-mend': -1, 'ab-threadweaver-needle': 3.5,
    'ab-threadweaver-shuttle': 0.5, 'ab-threadweaver-snip': 5.5, 'ab-threadweaver-tapestry': 1, 'ab-threadweaver-thrum': -2.5,
    'ab-threadweaver-tie': 1, 'ab-thresher-auto': 2, 'ab-thresher-finish': 0.5, 'ab-thresher-frenzy': 0.5,
    'ab-thresher-gatecut': 7, 'ab-thresher-gravewalk': 4.5, 'ab-thresher-snap': 9.5, 'ab-thresher-star': 2.5,
    'ab-thresher-string': 7, 'ab-thresher-twinstar': 6, 'ab-thresher-veil': 2, 'ab-tidecaller-auto': 5,
    'ab-tidecaller-bore': -2.5, 'ab-tidecaller-breakwater': 1, 'ab-tidecaller-current': 5.5, 'ab-tidecaller-maelstrom': 2.5,
    'ab-tidecaller-riptide': 4.5, 'ab-tidecaller-sip': 1, 'ab-tidecaller-spray': 4.5, 'ab-tidecaller-springflood': -4,
    'ab-tidecaller-surge': -3.5, 'ab-tidecaller-swell': 4, 'ab-tidecaller-undertow': 2, 'ab-time': -0.5,
    'ab-wind': 5.5, 'amb-fountain': -11, 'amb-pond': -16.5, 'amb-tavern': -13,
    'amb-town': -18.5, 'arrival': -8, 'bm-archmage-arcane-burst': -0.5, 'bm-archmage-arcane-mark': 2,
    'bm-archmage-call-of-the-circle': 2.5, 'bm-archmage-cinder-rune': 1, 'bm-archmage-convergence': 1.5, 'bm-archmage-counterspell': 2.5,
    'bm-archmage-ice-lances': 3, 'bm-archmage-leaping-bolt': 1, 'bm-archmage-pyre-rings': 1, 'bm-archmage-rift-rune': -1.5,
    'bm-archmage-rime-rune': 0.5, 'bm-archmage-rune-mark': 2, 'bm-archmage-rune-swap': 2, 'bm-archmage-sigil-flare': 1,
    'bm-archmage-storm-rune': 2, 'bm-archmage-the-binding': 1.5, 'bm-archmage-the-tide-rises': 1, 'bm-archmage-void-rifts': -1,
    'bm-brannoc-breaker': -0.5, 'bm-brannoc-deep-call': -2.5, 'bm-brannoc-double-grip': 2, 'bm-brannoc-fist-slam': -1,
    'bm-brannoc-hammer-heel': -1, 'bm-brannoc-intro': -1.5, 'bm-brannoc-riposte': 3, 'bm-brannoc-roar-of-the-stands': -1.5,
    'bm-brannoc-sand-furrow': 2, 'bm-brannoc-sunwheel': 2.5, 'bm-brannoc-sunwheel-unbound': 0.5, 'bm-brannoc-the-final-bell': -1,
    'bm-brannoc-the-tide-rises': -0.5, 'bm-brannoc-twin-wheels': 3, 'bm-brannoc-undertow-grip': 0.5, 'bm-brannoc-victory-leap': -1,
    'bm-caelum-anchored-wake': 2, 'bm-caelum-ascendant': -1.5, 'bm-caelum-chorus-of-the-fallen': 0.5, 'bm-caelum-cinder-crown': -1,
    'bm-caelum-constellation-fall': -1.5, 'bm-caelum-dark-ember': -2.5, 'bm-caelum-eightfold-wake': 1, 'bm-caelum-embers-of-heaven': -0.5,
    'bm-caelum-glint': 2.5, 'bm-caelum-grace-withdrawn': -1.5, 'bm-caelum-horizon-cut': -1.5, 'bm-caelum-intro': -1.5,
    'bm-caelum-nightfall': -1.5, 'bm-caelum-pinning-thrust': -1.5, 'bm-caelum-second-coil': -1.5, 'bm-caelum-starfall': -1,
    'bm-caelum-the-sky-comes-down': -1.5, 'bm-caelum-the-starwyrm': -2.5, 'bm-corvane-comet-draw': 1.5, 'bm-corvane-comet-volley': 3,
    'bm-corvane-draw-cut': 4.5, 'bm-corvane-false-stance': 2, 'bm-corvane-hollow-breath': 6, 'bm-corvane-hundredfold-parting': 0.5,
    'bm-corvane-intro': -2, 'bm-corvane-last-light-of-the-pass': -1.5, 'bm-corvane-rising-crane': 1, 'bm-corvane-scabbard-sweep': 2.5,
    'bm-corvane-the-last-vigil': -1.5, 'bm-corvane-the-vigil': 1, 'bm-corvane-whetted-edge': -0.5, 'bm-corvane-white-gale': 3.5,
    'bm-grubnak-belly-flop': -1, 'bm-grubnak-butchers-charge': -0.5, 'bm-grubnak-chop-chop': 1, 'bm-grubnak-cleaver-toss': 1.5,
    'bm-grubnak-clogged-drains': 3.5, 'bm-grubnak-dinner-rush': 3.5, 'bm-grubnak-double-chop': 1, 'bm-grubnak-family-meal': 0.5,
    'bm-grubnak-flambe': -0.5, 'bm-grubnak-flare-up': -1.5, 'bm-grubnak-gorge': 2, 'bm-grubnak-grease-fire': 0.5,
    'bm-grubnak-intro': -1, 'bm-grubnak-ladle-spin': 4, 'bm-grubnak-larder-toss': 2.5, 'bm-grubnak-lid-slam': -1.5,
    'bm-grubnak-meat-toss': 1.5, 'bm-grubnak-mince': 1.5, 'bm-grubnak-mise-en-place': 4, 'bm-grubnak-order-up': -3,
    'bm-grubnak-rolling-meatballs': 2.5, 'bm-grubnak-service': -1, 'bm-grubnak-simmer': 2, 'bm-grubnak-spice-rack': 0.5,
    'bm-grubnak-stockpot': 1.5, 'bm-grubnak-tenderize': 1, 'bm-grubnak-whisk': 7, 'bm-hollowking-barrow-bells': -1.5,
    'bm-hollowking-barrow-knell': 1.5, 'bm-hollowking-coffin-lids': 2, 'bm-hollowking-court-of-bones': 1.5, 'bm-hollowking-crown-of-graves': 3.5,
    'bm-hollowking-dirge': 0.5, 'bm-hollowking-echo-knights': 4.5, 'bm-hollowking-funeral-march': 0.5, 'bm-hollowking-grave-cleave': 0.5,
    'bm-hollowking-grave-marks': 4, 'bm-hollowking-grave-summons': 1.5, 'bm-hollowking-gravebind': 2.5, 'bm-hollowking-intro': 1.5,
    'bm-hollowking-judgement': 0.5, 'bm-hollowking-lantern': 8.5, 'bm-hollowking-lights-out': 2, 'bm-hollowking-royal-audience': -1.5,
    'bm-hollowking-royal-decree': -1, 'bm-hollowking-royal-doom': 1, 'bm-hollowking-royal-gaze': -1.5, 'bm-hollowking-sceptre-sweep': 3.5,
    'bm-hollowking-sceptre-throw': 2, 'bm-hollowking-the-charge-sheet': 1.5, 'bm-hollowking-the-king-rises': -1, 'bm-hollowking-the-long-night': 1.5,
    'bm-hollowking-writ-of-execution': 1.5, 'bm-hydra-acid-spray': 3, 'bm-hydra-flame-gout': 3, 'bm-hydra-intro': -3,
    'bm-hydra-mire-spit': 2, 'bm-hydra-mothers-cry': -1.5, 'bm-hydra-mothers-heart': 0.5, 'bm-hydra-regrowth': 0.5,
    'bm-hydra-rending-maul': 1.5, 'bm-hydra-rime-crown': 1, 'bm-hydra-searing': 2.5, 'bm-hydra-stonegaze': 0.5,
    'bm-hydra-stormcall': 3, 'bm-hydra-stump-echo': -0.5, 'bm-hydra-tail-thrash': 1, 'bm-hydra-the-drowning': -2.5,
    'bm-hydra-tidal-dance': 3.5, 'bm-hydra-tidal-line': 2, 'bm-hydra-undertow': 3, 'bm-hydra-venom-bloom': 3,
    'bm-morrowoak-barrow-lantern': 2, 'bm-morrowoak-brood-roots': 2.5, 'bm-morrowoak-deeper-roots': -1, 'bm-morrowoak-fourfold-bloom': 1,
    'bm-morrowoak-frost-fist': -0.5, 'bm-morrowoak-hunger-seed': -1, 'bm-morrowoak-hungering-dark': -1, 'bm-morrowoak-hydra-head': 1.5,
    'bm-morrowoak-inhale': -1.5, 'bm-morrowoak-intro': -1, 'bm-morrowoak-nothing-left': -3, 'bm-morrowoak-root-lash': -0.5,
    'bm-morrowoak-sap-tide': -0.5, 'bm-morrowoak-saplings': 3, 'bm-morrowoak-storm-knot': 0.5, 'bm-morrowoak-the-grove-remade': -1,
    'bm-morrowoak-the-swallowing': -3, 'bm-morrowoak-twin-seed': -0.5, 'bm-morrowoak-wyrm-wing': -1, 'bm-skitterra-acid-deluge': 0.5,
    'bm-skitterra-brood': 4.5, 'bm-skitterra-ceiling-ambush': 1, 'bm-skitterra-chrysalis': 4, 'bm-skitterra-cocoon-drop': 1.5,
    'bm-skitterra-egg-sacs': 1.5, 'bm-skitterra-eightfold-lunge': 6.5, 'bm-skitterra-fang-rush': 2, 'bm-skitterra-from-the-dark': 2,
    'bm-skitterra-into-the-dark': 2, 'bm-skitterra-intro': -1, 'bm-skitterra-molt': 8, 'bm-skitterra-silk-lines': 3.5,
    'bm-skitterra-silk-reel': 3.5, 'bm-skitterra-silk-wrap': 2.5, 'bm-skitterra-snare-weave': 2, 'bm-skitterra-spiderlings': 11,
    'bm-skitterra-spin': 8, 'bm-skitterra-spinneret-volley': 16, 'bm-skitterra-strand-reel': 5.5, 'bm-skitterra-the-swarm': 11.5,
    'bm-skitterra-the-web-gives-way': 0.5, 'bm-skitterra-tightening-web': 2, 'bm-skitterra-venom-drip': 4, 'bm-skitterra-venom-mist': -1.5,
    'bm-skitterra-venom-spit': 4, 'bm-titan-avalanche': 0.5, 'bm-titan-breath-of-winter': 1.5, 'bm-titan-endless-winter': -1.5,
    'bm-titan-frostbite': 2.5, 'bm-titan-glacial-stomp': -0.5, 'bm-titan-icefall': 2.5, 'bm-titan-intro': -3,
    'bm-titan-rime-slam': 0.5, 'bm-titan-titans-grip': 2.5, 'bm-titan-titans-sweep': 2, 'bm-titan-twin-slam': 2,
    'bm-titan-whiteout': 1.5, 'bm-titan-winters-grasp': 2.5, 'bm-titan-winters-howl': -1, 'bm-volkar-avalanche': 0.5,
    'bm-volkar-ball-lightning': 1.5, 'bm-volkar-chain-lightning': 3, 'bm-volkar-eye-closes': 2, 'bm-volkar-eye-of-the-storm': 4.5,
    'bm-volkar-gale-slam': 4, 'bm-volkar-gathering-storm': 0.5, 'bm-volkar-grounding-rods': 3, 'bm-volkar-heavens-fall': -1,
    'bm-volkar-intro': -1.5, 'bm-volkar-lightning-rods': 9, 'bm-volkar-polarity-minus': 3, 'bm-volkar-polarity-plus': 3,
    'bm-volkar-polarity-surge': 1.5, 'bm-volkar-pulse': 4.5, 'bm-volkar-rod-strike': 1.5, 'bm-volkar-skyfall': -0.5,
    'bm-volkar-squall-line': 3, 'bm-volkar-static-field': 5, 'bm-volkar-still-air': 3, 'bm-volkar-storm-walls': 2,
    'bm-volkar-supercell': 2, 'bm-volkar-thunder-crash': 1, 'bm-volkar-thunderclap': 1.5, 'bm-volkar-thunderhead': 2.5,
    'bm-volkar-titan-fist': -1.5, 'bm-volkar-twin-fall': -1.5, 'bm-wyrm-cinder-rain': 7.5, 'bm-wyrm-ember-breath': 3.5,
    'bm-wyrm-intro': -4, 'bm-wyrm-take-flight': 3.5, 'bm-wyrm-twin-breath': 3.5, 'boss-death': -2.5,
    'boss-enrage': -2.5, 'boss-impact-heavy': 0.5, 'boss-impact-light': 7, 'boss-intro': -1.5,
    'buff-on': -0.5, 'chest-drop': 3.5, 'chest-open': -5, 'cleanse': -5,
    'clear': -4.5, 'crit': 4, 'dash': 6.5, 'debuff-on': -1,
    'dummy-hit': 3, 'emote-cheer': -6.5, 'emote-laugh': -2, 'emote-wave': 2,
    'feast-chew': 6.5, 'feast-clink': -5.5, 'feast-serve': -3.5, 'feast-sting': -2.5,
    'fish-bite': 3, 'fish-cast': 1.5, 'fish-catch': -3, 'fish-lost': -0.5,
    'fish-reel': -0.5, 'gloom-hollow-off': -2, 'gloom-hollow-on': 2, 'heal-land': -2.5,
    'hit-heavy': 5, 'hit-light': 9, 'hm-bark-ash': -0.5, 'hm-bark-ghost': 3.5,
    'hm-bark-greyfang': 0.5, 'hm-bark-rust': 0.5, 'hm-bite': 8, 'hm-bite-big': 2.5,
    'hm-bringdown': -3, 'hm-calloff': 1.5, 'hm-down': 3, 'hm-hamstring': 1,
    'hm-horn': -6, 'hm-howl': -3.5, 'hm-longchase': 1.5, 'hm-mount': -1,
    'hm-quarry': 6.5, 'hm-relay': 4, 'hm-rend': 0.5, 'hm-ridedown': 2.5,
    'hm-snap': 7, 'hm-up': 2.5, 'hm-whistle-hold': -7.5, 'hm-whistle-pounce': -7,
    'ken-blaze': 0.5, 'ken-break': -0.5, 'ken-deathblow': -2, 'ken-good': 8,
    'ken-iai': 2.5, 'ken-miss': 7.5, 'ken-off': 4.5, 'ken-pass': 6.5,
    'ken-perfect': 2, 'ken-pommel': 6.5, 'ken-redirect': 1, 'lamp-drop': 11,
    'lamp-ember': 14.5, 'lamp-end': 6.5, 'lamp-eternal': 0.5, 'lamp-pilgrim': 4.5,
    'lamp-pillar': 3, 'lamp-snuff': 5.5, 'lamp-sparks': 5, 'lb-fire': -1.5,
    'lb-ready': -5, 'loot-take': -2, 'low-hp': -4.5, 'npc-talk': -6,
    'ping': 2.5, 'pip-up': 12, 'portal-enter': -3, 'portal-hum': -22.5,
    'pull-count': 0.5, 'pull-count-last': -3.5, 'pull-go': -2, 'reaper-blink': 5.5,
    'reaper-danse': 5, 'reaper-finish1': 4.5, 'reaper-finish2': -0.5, 'reaper-finish3': 1,
    'reaper-finish4': -2, 'reaper-frenzy': -2.5, 'reaper-gate-bloom': -2.5, 'reaper-gate-close': -1,
    'reaper-gate-open': 3.5, 'reaper-gate-tone': 8, 'reaper-gatebreaker': 1.5, 'reaper-harvest': -1,
    'reaper-moon': 1.5, 'reaper-pop-bind': 4.5, 'reaper-pop-death': 3, 'reaper-pop-drain': 4,
    'reaper-pop-thread': 9, 'reaper-rune': 12.5, 'reaper-rune-emp': 6, 'reaper-slack': 14.5,
    'reaper-slash': 2.5, 'reaper-star-collapse': -2, 'reaper-star-open': 0.5, 'reaper-swing': 12,
    'reaper-veil': -0.5, 'revive': -2, 'shield-break': 5, 'shield-up': -4,
    'stack-1': 8, 'stack-2': -2.5, 'step-grass': 8, 'step-stone': 8.5,
    'step-wood': 1.5, 'story-page': 3.5, 'tg-aoe': 1.5, 'tg-buster': 1,
    'tg-charge': 0.5, 'tg-gaze': 0.5, 'tg-knockback': 2.5, 'tg-raidwide': -0.5,
    'tg-spread': 5.5, 'tg-stack': 1.5, 'tide-bell': 1, 'tide-crash': -1.5,
    'tide-crest': 4.5, 'tide-gull': 9.5, 'tide-pop': 1.5, 'tide-slack': 10.5,
    'tide-wave': 2.5, 'title-sting': -3, 'ui-bounty': 0.5, 'ui-buy': -6,
    'ui-click': 2, 'ui-close': -0.5, 'ui-equip': -2.5, 'ui-error': -3,
    'ui-feat': -7, 'ui-gold': -4, 'ui-hover': 13, 'ui-secret': -6,
    'ult-alembist': 0.5, 'ult-bastion': 1.5, 'ult-bloodreaver': 1, 'ult-driftblade': 6.5,
    'ult-fire': -1.5, 'ult-gloomsworn': -1, 'ult-gorgemaw': 1, 'ult-grovekeeper': 2.5,
    'ult-houndmaster': -3.5, 'ult-kenseier': -1.5, 'ult-lanternkeeper': -2, 'ult-marionettist': 0.5,
    'ult-oathbroker': -1, 'ult-pyromancer': -1, 'ult-ranger': 3, 'ult-ready': -4,
    'ult-runeguard': -1, 'ult-shadowblade': 4, 'ult-thermist': -1, 'ult-threadweaver': -1,
    'ult-tidecaller': -2, 'waymark': 11.5, 'wipe': -2,
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
  // the chef's table (town-life.js): the dish set down, forks and cups, quiet chewing, and the happy sting once the plate is clean
  def('feast-serve', 'town', S => {
    S.space('room', 0.2);
    S.wood({ f: 420, dur: 0.1, peak: 0.34, lp: 2400 });
    S.metal({ at: 0.05, set: 'bar', f: 2300, dur: 0.18, peak: 0.1, click: 0.2 });
    S.noise({ at: 0.12, color: 'pink', bp: 2600, q: 0.8, dur: 0.35, pts: [[0.1, 0.5], [0.2, 1], [0.35, 0]], peak: 0.07 });
    [72, 76, 79].forEach((n, i) => S.pluck({ at: 0.3 + i * 0.09, f: mf(n), dur: 0.5, peak: 0.1, bright: 5, rev: 0.3 }));
  });
  def('feast-clink', 'town', S => {
    S.space('room', 0.18);
    for (let i = 0; i < 4; i++) S.glass({ at: i * 0.07 + S.rr(0, 0.03), f: S.rr(1700, 2600), dur: 0.5, peak: 0.16 - i * 0.02 });
    S.wood({ at: 0.32, f: 360, dur: 0.07, peak: 0.16, lp: 2000 });
  });
  def('feast-chew', 'town', S => {
    for (let i = 0; i < 3; i++) {
      const at = i * 0.17 + S.rr(0, 0.03);
      S.noise({ at, color: 'pink', bp: 900 + S.rr(0, 500), q: 1.2, dur: 0.09, pts: [[0.01, 1], [0.09, 0]], peak: 0.2, grain: 0.7 });
      S.wood({ at: at + 0.01, f: S.rr(200, 280), dur: 0.05, peak: 0.07, lp: 1400 });
    }
    S.metal({ at: 0.58, set: 'bar', f: 3000, dur: 0.06, peak: 0.05, click: 0.1 });
  });
  def('feast-sting', 'sting', S => {
    S.space('room', 0.3);
    [67, 71, 74, 79].forEach((n, i) => S.pluck({ at: i * 0.1, f: mf(n), dur: i === 3 ? 1.1 : 0.45, peak: 0.2, bright: 6, rev: 0.4 }));
    S.glass({ at: 0.32, f: mf(91), dur: 0.9, peak: 0.07 });
    S.thud({ at: 0, f: 110, f1: 60, dur: 0.18, pd: 0.4, peak: 0.12 });
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
  // a class's counted stacks filling: Pyromancer's two sparks (Heating Up, Hot Streak) and any whole-number pips
  def('stack-1', 'hud', S => {
    S.space('room', 0.2);
    S.glass({ f: mf(91), dur: 0.35, peak: 0.12 });
    S.noise({ hp: 5000, dur: 0.12, pts: [[0.01, 1], [0.12, 0]], peak: 0.07 });
    S.tone({ at: 0.01, f: mf(79), dur: 0.1, peak: 0.07 });
  });
  def('stack-2', 'hud', S => {
    S.space('room', 0.3);
    S.whoosh({ f: 700, f1: 3600, dur: 0.22, peak: 0.16 });
    S.glass({ at: 0.1, f: mf(84), dur: 0.5, peak: 0.1 }); S.glass({ at: 0.15, f: mf(91), dur: 0.6, peak: 0.1 }); S.glass({ at: 0.2, f: mf(96), dur: 0.8, peak: 0.09 });
    S.thud({ at: 0.1, f: 160, f1: 70, dur: 0.25, peak: 0.2 });
    S.noise({ at: 0.1, hp: 3000, dur: 0.35, pts: [[0.02, 1], [0.35, 0]], peak: 0.1 });
  });
  def('pip-up', 'hud', S => {
    S.glass({ f: mf(86), dur: 0.3, peak: 0.1 });
    S.wood({ f: 1800, dur: 0.03, peak: 0.12 });
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
    // Marionettist's Cue: a dry finger snap (a skin-on-skin crack, no body) and a wire pulled taut, its pitch rising as it tightens
    fsnap: S => { S.noise({ bp: 2300, q: 1.4, dur: 0.035, a: 0.0003, peak: 0.42 }); S.noise({ hp: 5500, dur: 0.018, a: 0.0002, peak: 0.22 }); S.thud({ f: 420, f1: 260, dur: 0.03, peak: 0.12, click: 0 }); },
    twang: S => { S.pluck({ f: 294, bend: 5, dur: 0.55, bright: 14, peak: 0.2 }); S.pluck({ at: 0.012, f: 588, bend: 5, dur: 0.35, bright: 10, peak: 0.07 }); },
    breath: S => S.noise({ color: 'pink', bp: 800, bp1: 1400, q: 1.2, dur: 0.45, pts: [[0.35, 1], [0.45, 0]], peak: 0.25 }),
    // Gloomsworn: the duskblade through dark air, a hollow breath (a vowel with no voice in it), an iron toll, a crack of the shell
    gsweep: S => { S.whoosh({ color: 'brown', f: 220, f1: 800, q: 0.9, dur: 0.3, peakAt: 0.5, peak: 0.45 }); S.metal({ at: 0.04, set: 'plate', f: 190, dur: 0.5, peak: 0.1, click: 0.3 }); },
    gbreath: S => { S.noise({ color: 'pink', bp: 520, bp1: 360, q: 3.2, dur: 0.55, pts: [[0.16, 1], [0.55, 0]], peak: 0.17 }); S.voice({ f: 92, vowel: 'o', vowel1: 'u', breath: 1.4, dur: 0.5, peak: 0.06 }); },
    gtoll: S => { S.bell({ set: 'church', f: mf(35), dur: 1.7, peak: 0.2, beat: 0.9 }); S.thud({ f: 60, f1: 38, dur: 0.3, peak: 0.25, click: 0 }); },
    gcrack: S => { S.crack({ f: 1100, dur: 0.22, peak: 0.22 }); S.glass({ at: 0.02, f: mf(88), dur: 0.5, peak: 0.05 }); },
    // Reaper (class id thresher): inky black smoke with blue lightning. Low muffled air and scythe steel (rpcut: a quick swish with a thin singing edge; rpink: the dark air
    // that follows it), glassy blue crackle (rpspark), a finger snap (rpsnap), an inward breath (rpinhale), soft dark cloth (rpcloth), a vanish (rpvanish), a sharp whine (rpwhine)
    // and the bright edge of the Gate's swings (rpedge)
    rpcut: S => { S.whoosh({ color: 'pink', f: 700, f1: 3200, q: 0.8, dur: 0.2, peakAt: 0.55, peak: 0.3 }); S.noise({ at: 0.05, hp: 6000, dur: 0.1, pts: [[0.04, 1], [0.1, 0]], peak: 0.06 }); S.metal({ at: 0.07, set: 'bar', f: 3600, dur: 0.2, peak: 0.03, click: 0 }); },
    rpink: S => { S.noise({ color: 'brown', lp: 520, lp1: 240, dur: 0.32, a: 0.04, pts: [[0.08, 1], [0.32, 0]], peak: 0.16 }); },
    rpspark: S => { S.crackle({ f: 4200, dens: 1.8, dur: 0.22, pts: [[0.01, 1], [0.22, 0]], peak: 0.14 }); S.glass({ at: 0.01, f: mf(98), dur: 0.3, peak: 0.04 }); },
    rpsnap: S => { S.noise({ hp: 2800, dur: 0.03, a: 0.0004, peak: 0.4 }); S.wood({ f: 1900, dur: 0.05, peak: 0.2 }); S.thud({ f: 240, f1: 150, dur: 0.05, peak: 0.12, click: 0 }); },
    rpinhale: S => { S.whoosh({ color: 'pink', f: 2400, f1: 300, q: 1, dur: 0.4, peakAt: 0.8, peak: 0.22 }); S.tone({ f: mf(40), fm: [1.5, 1.5, 0.5], dur: 0.4, a: 0.3, swell: true, lp: 700, peak: 0.08 }); },
    rpcloth: S => { S.noise({ color: 'brown', lp: 900, lp1: 1500, dur: 0.55, a: 0.18, pts: [[0.25, 1], [0.55, 0]], peak: 0.22 }); S.noise({ color: 'pink', bp: 400, bp1: 700, q: 0.8, dur: 0.5, a: 0.15, pts: [[0.25, 1], [0.5, 0]], peak: 0.1 }); },
    rpvanish: S => { S.whoosh({ color: 'pink', f: 300, f1: 4200, q: 1.4, dur: 0.28, peakAt: 0.35, peak: 0.3 }); S.noise({ color: 'brown', lp: 600, lp1: 200, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.16 }); S.glass({ at: 0.12, f: mf(96), dur: 0.4, peak: 0.04 }); },
    rpwhine: S => { S.tone({ type: 'saw', f: 900, f1: 2800, glide: 0.35, dur: 0.4, lp: 5000, a: 0.02, pts: [[0.02, 1], [0.3, 0.8], [0.4, 0]], peak: 0.07 }); S.metal({ at: 0.02, set: 'bar', f: 2600, dur: 0.5, peak: 0.07, click: 0.4 }); S.scrape({ at: 0.02, f: 5400, q: 3, rate: 80, dur: 0.22, pts: [[0.02, 1], [0.22, 0]], peak: 0.06 }); },
    rpedge: S => { B.zing(S, 0, 0.8, 0); S.glass({ f: mf(103), dur: 0.35, peak: 0.05 }); },
    // Threadweaver's Thrum: every held thread plucked at once, a soft warm rising strum that rings on (the heal and the cover over both ends)
    thrum: S => { [69, 72, 76, 79, 84].forEach((n, i) => S.pluck({ at: i * 0.05, f: mf(n), type: 'tri', dur: 0.9, bright: 6, peak: 0.13, pan: (i - 2) * 0.25 })); S.partials({ at: 0.25, set: 'hand', f: mf(88), dur: 1.1, peak: 0.05 }); S.noise({ color: 'pink', bp: 3000, q: 1, dur: 0.3, pts: [[0.1, 1], [0.3, 0]], peak: 0.03 }); },
    // Severance: shears closing (two bright blades meeting), then every thread letting go in a fast fall of snaps
    shear: S => { S.metal({ set: 'bar', f: 3900, dur: 0.18, peak: 0.12, click: 0.5 }); S.metal({ at: 0.05, set: 'bar', f: 5200, dur: 0.14, peak: 0.1, click: 0.4 }); S.noise({ at: 0.015, hp: 6500, dur: 0.05, a: 0.0004, peak: 0.2 }); [0.1, 0.17, 0.23, 0.3].forEach(at => B.snap(S, at, 0.55)); },
    // Marionettist's Strum: a taut wire plucked down the line, four bright strings falling away with a fretted scrape and the zing of the cut
    strum: S => { [76, 72, 69, 64].forEach((n, i) => S.pluck({ at: i * 0.03, f: mf(n), bend: 3, dur: 0.35, bright: 16, peak: 0.15, pan: 0.4 - i * 0.25 })); S.scrape({ at: 0.01, f: 5200, q: 3, rate: 70, dur: 0.14, pts: [[0.01, 1], [0.14, 0]], peak: 0.1 }); B.zing(S, 0.13, 0.8, 0); },
    // Crossfire: two wires hauled in from either side, rising, taut, and meeting in one heavy cut
    crossfire: S => { for (const sd of [-1, 1]) { S.noise({ bp: 900, bp1: 4200, q: 6, dur: 0.2, pts: [[0.16, 1], [0.2, 0]], peak: 0.3, pan: sd * 0.9 }); S.pluck({ at: 0.15, f: sd < 0 ? 196 : 208, bend: -4, dur: 0.6, bright: 20, peak: 0.2, pan: sd * 0.5 }); } S.thud({ at: 0.19, f: 150, f1: 70, dur: 0.14, peak: 0.22, lp: 600 }); S.crack({ at: 0.19, f: 1800, dur: 0.15, peak: 0.28 }); B.snap(S, 0.2, 1.1); S.metal({ at: 0.19, set: 'bar', f: 2200, dur: 0.3, peak: 0.06, click: 0.3 }); },
    // Gloomsworn's Dusk Reave: a slow, dragging reaping stroke, the shell splitting under it and a deep toll as the dark closes round the wound
    greave: S => { S.whoosh({ color: 'brown', f: 160, f1: 600, q: 0.8, dur: 0.5, peakAt: 0.6, peak: 0.5 }); S.scrape({ at: 0.1, f: 900, q: 2, rate: 40, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.1 }); S.crack({ at: 0.32, f: 700, dur: 0.25, peak: 0.3 }); S.thud({ at: 0.32, f: 70, f1: 32, dur: 0.5, drive: 1.8, peak: 0.5 }); S.bell({ at: 0.34, set: 'church', f: mf(31), dur: 1.8, peak: 0.16, beat: 1.1 }); S.voice({ at: 0.38, f: 70, vowel: 'o', vowel1: 'u', breath: 1.5, dur: 0.8, peak: 0.07 }); },
    // Tidecaller (class id tidecaller): sea water. A surf wash (a pink hiss swelling in and pulling back), a conch horn (a soft breathy low
    // horn that scoops up into pitch), droplets and bubbles with a glass ping on them, a rush of tide, a heavy crash of water, a whirlpool
    // turning, a bell struck under water (dull and low-passed with bubbles), a stone wall (a low thud and a slap of wet), a pull down into the deep
    tsurf: S => { S.whoosh({ color: 'pink', f: 260, f1: 1700, q: 0.55, dur: 0.75, peakAt: 0.45, peak: 0.34 }); S.noise({ at: 0.1, color: 'white', hp: 4200, grain: 0.9, grainRate: 1.6, dur: 0.6, pts: [[0.2, 1], [0.6, 0]], peak: 0.07 }); },
    tfoam: S => S.noise({ color: 'white', hp: 3600, lp: 9000, grain: 0.9, grainRate: 1.8, dur: 0.45, pts: [[0.04, 1], [0.45, 0]], peak: 0.13 }),
    tdrop: S => { S.bubbles({ n: 3, f: 900, f1: 2400, spread: 0.18, size: 0.03, peak: 0.18 }); S.glass({ at: 0.04, f: mf(88), dur: 0.35, peak: 0.05 }); },
    tconch: S => { S.horn({ f: mf(47), dur: 0.85, bright: 5, peak: 0.2 }); S.noise({ color: 'pink', bp: 700, bp1: 1100, q: 1.4, dur: 0.5, pts: [[0.15, 1], [0.5, 0]], peak: 0.06 }); },
    trush: S => { S.whoosh({ color: 'brown', f: 160, f1: 1300, q: 0.6, dur: 0.9, peakAt: 0.55, peak: 0.4 }); S.rumble({ f: 120, dur: 0.8, peak: 0.16, sub: 0.2 }); },
    tcrash: S => { S.thud({ f: 62, f1: 34, dur: 0.5, drive: 1.6, peak: 0.5 }); S.noise({ at: 0.02, color: 'pink', bp: 1600, bp1: 700, q: 0.7, dur: 0.6, pts: [[0.06, 1], [0.6, 0]], peak: 0.3 }); S.noise({ at: 0.05, color: 'white', hp: 4000, grain: 0.8, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.09 }); },
    twhirl: S => { S.whoosh({ color: 'pink', f: 420, f1: 1100, q: 1.2, dur: 0.8, peakAt: 0.5, am: [6, 0.7], peak: 0.28 }); S.bubbles({ at: 0.1, n: 6, f: 500, f1: 1500, spread: 0.6, size: 0.035, peak: 0.1 }); },
    tbell: S => { S.bell({ set: 'church', f: mf(55), dur: 1.5, peak: 0.16, beat: 0.9, lp: 1100 }); S.bubbles({ at: 0.06, n: 4, f: 700, f1: 1700, spread: 0.4, size: 0.03, peak: 0.07 }); },
    tstone: S => { S.thud({ f: 70, f1: 38, dur: 0.45, drive: 1.4, peak: 0.5 }); S.crack({ at: 0.01, f: 800, dur: 0.18, peak: 0.12 }); S.noise({ at: 0.03, color: 'pink', bp: 900, q: 0.8, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.2 }); },
    tpull: S => { S.whoosh({ color: 'brown', f: 1500, f1: 150, q: 0.8, dur: 0.7, peakAt: 0.25, peak: 0.36 }); S.noise({ color: 'pink', bp: 500, bp1: 300, q: 3, dur: 0.6, pts: [[0.15, 1], [0.6, 0]], peak: 0.12 }); },
    tmoon: S => { S.glass({ f: mf(91), dur: 0.7, peak: 0.07 }); S.partials({ at: 0.03, set: 'hand', f: mf(84), dur: 0.6, peak: 0.05 }); },
    tgull: S => { [0, 0.26].forEach((at, i) => S.tone({ at, f: 2600 - i * 200, f1: 1700, glide: 0.2, dur: 0.24, vib: [28, 0.03, 0], lp: 5000, a: 0.02, peak: 0.05 })); },
    // Kenseier (class id kenseier): steel on ash and ember. A clean blade sweep with a thread of scrape on it, a spit of ember, a blade drawn from a scabbard (a long
    // scrape ending in a ring of bar metal), a soft hiss of ash and cloth, a sword planted (a thud with a low plate ring), a spinning rush of air, a dull wooden knock,
    // a hush of breath, a low iron toll, and a run of tiny cuts
    knsweep: S => { S.whoosh({ color: 'white', f: 900, f1: 3800, q: 1.3, dur: 0.22, peakAt: 0.5, peak: 0.26 }); S.scrape({ at: 0.01, f: 5200, q: 3, rate: 60, dur: 0.12, pts: [[0.02, 1], [0.12, 0]], peak: 0.05 }); },
    knember: S => { S.crackle({ f: 2600, dens: 1.2, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.1 }); S.noise({ color: 'pink', lp: 2200, lp1: 800, dur: 0.25, pts: [[0.03, 1], [0.25, 0]], peak: 0.07 }); },
    kndraw: S => { S.scrape({ f: 4200, q: 3, rate: 80, dur: 0.22, pts: [[0.02, 1], [0.22, 0]], peak: 0.12 }); S.metal({ at: 0.2, set: 'bar', f: 3400, dur: 0.35, peak: 0.09, click: 0.6 }); },
    knash: S => { S.noise({ color: 'pink', lp: 1500, lp1: 600, dur: 0.6, a: 0.08, pts: [[0.2, 1], [0.6, 0]], peak: 0.16 }); S.noise({ at: 0.05, color: 'white', hp: 5200, grain: 0.9, grainRate: 1.4, dur: 0.55, pts: [[0.1, 1], [0.55, 0]], peak: 0.05 }); },
    knplant: S => { S.thud({ f: 90, f1: 48, dur: 0.35, drive: 1.2, peak: 0.45 }); S.metal({ at: 0.01, set: 'plate', f: 300, dur: 0.7, peak: 0.14, strike: 0.4 }); },
    knspin: S => { S.whoosh({ color: 'white', f: 600, f1: 2600, q: 1, dur: 0.5, peakAt: 0.45, am: [9, 0.6], peak: 0.3 }); S.scrape({ at: 0.04, f: 4800, q: 3, rate: 45, dur: 0.3, pts: [[0.05, 1], [0.3, 0]], peak: 0.04 }); },
    knknock: S => { S.wood({ f: 420, dur: 0.1, peak: 0.2 }); S.thud({ f: 130, f1: 70, dur: 0.14, peak: 0.3, click: 0 }); },
    knhush: S => { S.noise({ color: 'pink', lp: 1200, lp1: 200, dur: 0.7, a: 0.06, pts: [[0.2, 1], [0.7, 0]], peak: 0.18 }); S.noise({ at: 0.05, color: 'white', hp: 4500, hp1: 1500, dur: 0.5, pts: [[0.1, 1], [0.5, 0]], peak: 0.04 }); },
    kntoll: S => { S.bell({ set: 'hand', f: mf(50), dur: 0.9, peak: 0.16, beat: 0.8, lp: 1800 }); S.thud({ f: 100, f1: 60, dur: 0.2, peak: 0.25, click: 0 }); },
    // Lanternkeeper (class id lanternkeeper): iron and brass, a flame and the light of it. A clink of a small iron lantern set down (a short ring of bar
    // metal with a dull knock under it), a thick iron post planted (a deep thud and a low plate ring), a chain rattled (a run of links), a match
    // struck (a quick scrape, a hiss and the pop of the head catching), a flame taking hold (a soft rush rising into a low warm swell), a bit of
    // flame guttering and a puff of it going out, a pair of shears closing on a wick, a bright spit of ember sparks, a warm brass bell, a low
    // hum of voices, a rustle of paper wings, and a bright glass chime for light
    lkclink: S => { S.metal({ set: 'bar', f: 2100, dur: 0.22, peak: 0.16, click: 0.5 }); S.metal({ at: 0.012, set: 'plate', f: 780, dur: 0.18, peak: 0.1, click: 0.2 }); S.wood({ f: 360, dur: 0.1, peak: 0.12 }); },
    lkpost: S => { S.thud({ f: 82, f1: 40, dur: 0.4, drive: 1.5, peak: 0.5 }); S.metal({ at: 0.01, set: 'plate', f: 260, dur: 0.6, peak: 0.14, strike: 0.4 }); S.metal({ at: 0.03, set: 'bar', f: 1100, dur: 0.3, peak: 0.08, click: 0.2 }); },
    lkchain: S => { for (let i = 0; i < 6; i++) S.metal({ at: i * 0.034 + S.rr(0, 0.012), set: 'bar', f: S.rr(1500, 2500), dur: 0.1, peak: 0.07 + (i % 2) * 0.03, click: 0.3, pan: S.rr(-0.2, 0.2) }); S.scrape({ at: 0.01, f: 4600, q: 3, rate: 70, dur: 0.2, pts: [[0.02, 1], [0.2, 0]], peak: 0.06 }); },
    lkmatch: S => { S.scrape({ f: 4800, q: 2.4, rate: 55, dur: 0.13, pts: [[0.01, 1], [0.13, 0]], peak: 0.2 }); S.noise({ at: 0.13, color: 'white', hp: 3200, dur: 0.07, a: 0.002, pts: [[0.01, 1], [0.07, 0]], peak: 0.2 }); S.noise({ at: 0.15, color: 'pink', lp: 2200, lp1: 700, dur: 0.35, pts: [[0.05, 1], [0.35, 0]], peak: 0.14 }); },
    lkfwoomp: S => { S.noise({ color: 'pink', lp: 350, lp1: 2600, fd: 0.35, dur: 0.55, a: 0.04, pts: [[0.16, 1], [0.55, 0]], peak: 0.34 }); S.thud({ f: 90, f1: 55, dur: 0.3, peak: 0.28, click: 0 }); S.crackle({ at: 0.1, f: 3000, dens: 1.4, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.1 }); },
    lkgutter: S => { S.crackle({ f: 2200, dens: 0.9, dur: 0.45, pts: [[0.04, 1], [0.45, 0]], peak: 0.14 }); S.noise({ color: 'pink', bp: 900, bp1: 500, q: 1.2, dur: 0.4, pts: [[0.1, 1], [0.4, 0]], peak: 0.08 }); },
    lkpuff: S => { S.noise({ color: 'pink', lp: 1700, lp1: 500, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.22 }); S.noise({ at: 0.03, color: 'white', hp: 5000, grain: 0.9, dur: 0.35, pts: [[0.02, 1], [0.35, 0]], peak: 0.06 }); },
    lksnip: S => { S.metal({ set: 'bar', f: 3700, dur: 0.1, peak: 0.13, click: 0.6 }); S.metal({ at: 0.03, set: 'bar', f: 4600, dur: 0.07, peak: 0.1, click: 0.5 }); S.noise({ at: 0.02, hp: 6500, dur: 0.05, pts: [[0.005, 1], [0.05, 0]], peak: 0.08 }); },
    lkspark: S => { for (let i = 0; i < 4; i++) S.tick({ at: S.rr(0, 0.12), f: S.rr(2800, 4600), peak: 0.1 }); S.crackle({ f: 4200, dens: 2, dur: 0.18, pts: [[0.01, 1], [0.18, 0]], peak: 0.12 }); },
    lkbell: S => { S.bell({ set: 'hand', f: mf(72), dur: 1.3, peak: 0.16, beat: 0.9 }); S.glass({ at: 0.02, f: mf(91), dur: 0.8, peak: 0.04 }); },
    lkgong: S => { S.bell({ set: 'church', f: mf(52), dur: 1.9, peak: 0.18, beat: 0.7, lp: 2200 }); S.thud({ f: 70, f1: 40, dur: 0.3, peak: 0.2, click: 0 }); },
    lkhum: S => { S.choir({ notes: [mf(55), mf(62), mf(67)], vowel: 'o', a: 0.2, dur: 1.1, peak: 0.1 }); },
    lkmoth: S => { S.whoosh({ f: 1800, f1: 3400, q: 1.6, dur: 0.38, peakAt: 0.5, am: [26, 0.8], peak: 0.1 }); S.glass({ at: 0.06, f: mf(93), dur: 0.5, peak: 0.04 }); },
    lkchime: S => { [88, 93, 97].forEach((n, i) => S.glass({ at: i * 0.05, f: mf(n), dur: 0.8, peak: 0.07, pan: (i - 1) * 0.3 })); },
    lkstep: S => { S.wood({ f: 300, dur: 0.07, peak: 0.12 }); S.wood({ at: 0.14, f: 340, dur: 0.07, peak: 0.1 }); S.noise({ at: 0.01, color: 'pink', lp: 1400, dur: 0.12, pts: [[0.01, 1], [0.12, 0]], peak: 0.05 }); },
  };
  // Houndmaster (class id houndmaster): bone whistles, leather and fur, paws on earth, a brass horn. The whistles are two-tone and each command has its own: Flank two rising notes,
  // Hold one long steady one, Pounce three sharp rising ones, Call Off a falling slide and a short low note. The hounds bark: Rust low and gruff, Ash higher and quicker, Greyfang
  // one deep one with a growl under it, the Wild Hunt ghosts breathy and far off. Bites are the snap of teeth; Rend's claws are two long scrapes that cross
  const whn = (S, at, f, f1, dur, pk) => {
    S.tone({ at, f, f1, glide: dur * 0.45, dur, a: 0.012, vib: [30, 0.012, 0.04], lp: 6200, pts: [[0.015, 1], [dur * 0.7, 0.8], [dur, 0]], peak: pk });
    S.tone({ at, f: f * 2.01, f1: f1 ? f1 * 2.01 : null, glide: dur * 0.45, dur, a: 0.012, lp: 7000, pts: [[0.015, 1], [dur * 0.7, 0.7], [dur, 0]], peak: pk * 0.18 });
    S.noise({ at, color: 'white', bp: f1 || f, q: 9, dur, a: 0.01, pts: [[0.012, 1], [dur * 0.7, 0.6], [dur, 0]], peak: pk * 0.4 });
  };
  const hbark = (S, at, f, dur, pk) => {
    S.voice({ at, f, f1: f * 0.62, vowel: 'a', vowel1: 'o', dur, breath: 0.45, lp: 2400, peak: pk });
    S.noise({ at, color: 'pink', bp: f * 6, q: 1.4, dur: dur * 0.5, a: 0.002, pts: [[0.004, 1], [dur * 0.5, 0]], peak: pk * 0.5 });
    S.thud({ at, f: f * 0.8, f1: f * 0.5, dur: dur * 0.6, peak: pk * 0.5, click: 0 });
  };
  const hhowl = (S, at, f, pk, len) => {
    S.voice({ at, f, f1: f * 1.9, vowel: 'o', vowel1: 'u', dur: len * 0.42, breath: 0.2, lp: 2200, peak: pk, a: 0.04 });
    S.voice({ at: at + len * 0.4, f: f * 1.9, f1: f * 1.55, vowel: 'u', vowel1: 'o', dur: len * 0.6, breath: 0.2, lp: 2000, peak: pk * 0.9 });
  };
  Object.assign(ACC, {
    hmwf: S => { whn(S, 0, 1850, 1900, 0.13, 0.13); whn(S, 0.14, 2500, 2560, 0.24, 0.13); },
    hmwh: S => { whn(S, 0, 2100, 1960, 0.58, 0.12); },
    hmwp: S => { whn(S, 0, 2300, 2420, 0.07, 0.14); whn(S, 0.09, 2700, 2820, 0.07, 0.14); whn(S, 0.18, 3150, 3320, 0.1, 0.14); },
    hmwc: S => { whn(S, 0, 2700, 1750, 0.3, 0.13); whn(S, 0.34, 1750, 1760, 0.14, 0.12); },
    hmcloth: S => { S.noise({ color: 'pink', lp: 2200, lp1: 700, dur: 0.14, pts: [[0.02, 1], [0.14, 0]], peak: 0.16 }); S.noise({ at: 0.01, color: 'white', hp: 5200, dur: 0.08, pts: [[0.01, 1], [0.08, 0]], peak: 0.04 }); },
    hmsteel: S => { S.metal({ set: 'bar', f: 3000, dur: 0.18, peak: 0.08, click: 0.5 }); S.scrape({ at: 0.01, f: 5000, q: 3, rate: 60, dur: 0.1, pts: [[0.01, 1], [0.1, 0]], peak: 0.05 }); },
    hmpuff: S => { S.noise({ color: 'pink', bp: 1800, q: 0.8, dur: 0.12, a: 0.02, pts: [[0.03, 1], [0.12, 0]], peak: 0.1 }); },
    hmbreath: S => { S.noise({ color: 'pink', bp: 900, bp1: 1900, q: 0.9, dur: 0.18, a: 0.04, pts: [[0.06, 1], [0.18, 0]], peak: 0.14 }); S.wood({ at: 0.15, f: 900, dur: 0.03, peak: 0.1 }); },
    hmpaws: S => { for (let i = 0; i < 6; i++) { S.thud({ at: i * 0.045 + S.rr(0, 0.01), f: S.rr(110, 150), f1: 70, dur: 0.06, peak: 0.1 + (i % 2) * 0.03, click: 0 }); S.noise({ at: i * 0.045, color: 'pink', lp: 1400, dur: 0.04, pts: [[0.004, 1], [0.04, 0]], peak: 0.05 }); } },
    hmgrowl: S => { S.noise({ color: 'brown', lp: 380, dur: 0.5, a: 0.06, pts: [[0.12, 1], [0.5, 0]], peak: 0.2 }); S.tone({ type: 'saw', f: 85, f1: 62, glide: 0.45, dur: 0.5, am: [22, 0.8], lp: 520, a: 0.05, peak: 0.1 }); },
    hmknot: S => { S.crack({ f: 1800, dur: 0.08, peak: 0.2 }); S.noise({ at: 0.005, color: 'white', hp: 3200, dur: 0.05, pts: [[0.004, 1], [0.05, 0]], peak: 0.08 }); },
    hmsnap: S => { S.crack({ f: 3600, dur: 0.05, peak: 0.25 }); S.wood({ at: 0.002, f: 1300, dur: 0.04, peak: 0.18 }); S.noise({ at: 0.002, color: 'white', hp: 6000, dur: 0.03, pts: [[0.002, 1], [0.03, 0]], peak: 0.06 }); },
    hmhowl: S => { hhowl(S, 0, 300, 0.1, 1.1); hhowl(S, 0.14, 240, 0.08, 1.0); },
    hmclaws: S => { S.scrape({ f: 4300, q: 2.6, rate: 70, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.1, pan: -0.3 }); S.scrape({ at: 0.06, f: 3600, q: 2.6, rate: 55, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.1, pan: 0.3 }); },
  });
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
      aegis: [['shield', 0.6, 0, 1], ['clang', 0.7, 0, 0.7], ['whoosh-up', 0.6, 0.05, 0.6], ['hum', 0.6, 0.1, 0.8], ['boom', 0.8, 0.15, 0.5], ['chime', 0.9, 0.3, 0.5]],
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
      bloodbath: [['slash', 0.9, 0, 1, 1], ['wet', 1.2, 0.05], ['tear', 0.8, 0.12, 0.7]],
      pact: [['buff', 0.7, 0, 1, 1], ['pulse', 1.1, 0.1], ['heal', 0.8, 0.2, 0.6, 1]],
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
      wardglyph: [['rune', 1, 0, 1, 2], ['shield', 0.9, 0.05], ['chime', 1.1, 0.15]],
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
      canopy: [['nature', 0.8, 0, 0.8, 1], ['leaves', 0.8, 0, 0.9], ['heal', 1.1, 0.1, 0.8, 1], ['shimmer', 1, 0.2, 0.6], ['hum', 1.2, 0.1, 0.5]],
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
      sunset: [['shield', 0.9], ['bell', 0.8, 0.05, 0.6], ['fire', 0.8, 0.1, 0.5, 1], ['whoosh-down', 0.9, 0.15, 0.6]],
      thermocline: [['fire', 0.95, 0, 0.8, 1], ['frost', 0.95, 0, 0.8, 0], ['zing', 0.7, 0.05, 0.5]],
      zero: [['frost', 0.7, 0, 1, 2], ['frostcrack', 0.7], ['boom', 0.8, 0.15]],
      auto: [['frost', 1.4, 0, 0.5, 1], ['fire', 1.4, 0, 0.4, 0]],
      redgiant: [['fire', 0.6, 0, 1, 2], ['hum', 0.6, 0, 0.8], ['whoosh-up', 0.6, 0.05, 0.7], ['boom', 0.6, 0.3, 0.6]],
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
      roost: [['wind', 0.6, 0, 1, 2], ['breath', 0.7, 0.05, 1.4], ['flutter', 0.5, 0.2, 0.9], ['hum', 0.8, 0.15, 0.9]],
      starfall: [['sparkle', 0.9, 0, 1], ['whoosh-down', 1.4, 0, 0.8], ['boom', 0.9, 0.35, 0.8], ['slash', 1.4, 0.35, 0.6, 1], ['chime', 1.6, 0.4, 0.6]],
      stoop: [['whoosh-down', 1.6, 0, 1], ['slash', 1.3, 0.12, 0.9, 2], ['wind', 1.5, 0.1, 0.5, 1]],
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
      feedingfrenzy: [['maw', 0.9, 0, 0.8, 1], ['gulp', 0.9, 0.12], ['growl', 0.8, 0.2], ['buff', 0.6, 0.1]],
      banquet: [['maw', 0.7, 0, 1, 2], ['gulp', 0.8, 0.2], ['heal', 0.9, 0.35, 0.6, 1], ['shield', 0.6, 0.3]],
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
      blanket: [['ledger', 0.8, 0, 0.7, 2], ['shield', 0.8, 0.05, 0.9], ['flutter', 0.4, 0.1, 0.5], ['hum', 0.7, 0.1, 0.6], ['coin', 0.8, 0.3, 0.5]],
      warrant: [['ledger', 1, 0, 0.8, 0], ['stamp', 1.1, 0.05, 1], ['quill', 0.9, 0.2], ['clang', 1.3, 0.28, 0.5]],
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
      thrum: [['thrum', 1, 0, 1], ['heal', 1.15, 0.05, 0.4, 1]],
      severance: [['shear', 1, 0, 1], ['shield', 1.1, 0.2, 0.7], ['thread', 1.4, 0.05, 0.4, 2]],
      auto: [['thread', 1.4, 0, 0.6, 1]],
    },
    marionettist: {
      jab: [['stab', 1.1, 0, 1, 1], ['string', 1.5, 0, 0.5]],
      cue: [['fsnap', 1, 0, 1], ['twang', 1, 0.04, 0.85], ['stab', 1.2, 0.11, 0.9, 2], ['zing', 1.4, 0.1, 0.4]],
      pull: [['thread', 1, 0, 1, 2], ['creak', 1.2], ['whoosh-down', 0.9]],
      cross: [['thread', 0.85, 0, 1, 1], ['stab', 0.95, 0.1, 0.9, 2], ['tear', 1.1, 0.15, 0.5]],
      pirouette: [['slash', 1.15, 0, 1, 1], ['thread', 1.1, 0, 0.6, 0], ['swirl', 1.3]],
      swap: [['thread', 1.25, 0, 0.8, 0], ['dash', 1.15, 0, 1, 1], ['thunk', 1.5, 0.2]],
      finale: [['thread', 0.75, 0, 1, 0], ['heavy', 0.9, 0.05, 1, 1], ['bell', 1.1, 0.3, 0.5]],
      tangle: [['thread', 0.9, 0, 1, 2], ['creak', 0.9], ['dot', 1, 0.1, 0.6]],
      cutcord: [['tear', 0.9, 0, 1], ['twang', 0.8, 0.01, 0.8], ['stab', 0.85, 0.12, 1, 2], ['snap', 1.1, 0.12, 0.5]],
      redcurtain: [['thread', 0.8, 0, 0.7, 1], ['buff', 0.85, 0, 1, 2], ['flutter', 0.6]],
      string: [['thread', 1.35, 0, 1, 0], ['zing', 1.2]],
      strum: [['strum', 1, 0, 1], ['stab', 1.3, 0.12, 0.5, 1]],
      crossfire: [['crossfire', 1, 0, 1], ['heavy', 0.9, 0.2, 0.5, 1]],
      auto: [['thread', 1.2, 0, 0.6, 2], ['thunk', 1.6, 0, 0.5]],
    },
    // Gloomsworn: low, heavy and metallic, with a hollow breath under it (gbreath); no two moves alike
    gloomsworn: {
      rend: [['slash', 0.7, 0, 0.9], ['gsweep', 1], ['gbreath', 1.1, 0.05, 0.5]],
      strike: [['heavy', 0.7, 0, 1, 1], ['clang', 0.55, 0.05, 0.9], ['boom', 0.8, 0.12, 0.7], ['gbreath', 0.8, 0.1, 0.5]],
      shade: [['dash', 0.8, 0, 1, 1], ['gbreath', 1.4, 0, 0.9], ['wind', 0.6, 0.03, 0.6], ['stab', 0.8, 0.14, 0.6, 0]],
      pall: [['gtoll', 1, 0, 1], ['drone', 0.7, 0, 0.7], ['shield', 0.6, 0.1, 0.7, 2]],
      mantle: [['shield', 0.5, 0, 0.8, 1], ['gbreath', 0.7, 0, 1], ['creak', 0.6, 0.05, 0.7], ['hum', 0.5, 0.1, 0.6]],
      rite: [['gtoll', 0.75, 0.05, 0.8], ['shield', 0.8, 0.15, 0.8, 0], ['heal', 0.6, 0.2, 0.5], ['gbreath', 0.6, 0, 0.8]],
      vigil: [['gtoll', 1.4, 0, 0.8], ['hum', 0.8, 0, 0.7], ['shield', 0.9, 0.1, 0.8, 1], ['gbreath', 1, 0.1, 0.5]],
      pyre: [['gbreath', 0.6, 0, 1], ['fire', 0.5, 0.05, 0.8, 0], ['boom', 0.7, 0.18, 0.9], ['gcrack', 1, 0.2]],
      reave: [['greave', 1, 0, 1], ['gbreath', 0.7, 0.35, 0.4]],
      auto: [['slash', 0.65, 0, 0.7, 1], ['gsweep', 1.2, 0, 0.5]],
      wardmantle: [['gbreath', 0.9, 0, 0.8], ['flutter', 0.4, 0, 0.6], ['shield', 1.1, 0.08, 0.9, 2], ['clang', 1.4, 0.12, 0.45]],
      pact: [['gtoll', 0.8, 0, 1], ['growl', 0.8, 0, 0.7], ['pulse', 1, 0.15, 0.9], ['gcrack', 0.9, 0.25, 0.6], ['gbreath', 0.6, 0.3, 0.7]],
    },
    // Reaper (class id thresher): a quick scythe through dark air (rpcut over rpink) with blue sparks and a finger snap; every move has its own voice. The string's swings are short and light
    // (pressed up to five times in two seconds); their rising note comes with the moment (sound-hooks.js SoundHooks.thresher 'swing'). The Gate's swings (Gate Cut) are the brighter edge
    thresher: {
      string: [['rpcut', 1, 0, 0.8], ['rpink', 1, 0.02, 0.3]],
      finish: [['rpcut', 0.75, 0, 0.9], ['heavy', 0.8, 0.05, 0.6, 1], ['rpspark', 1, 0.06, 0.5]],
      snap: [['rpsnap', 1, 0, 1], ['rpspark', 1.1, 0.02, 0.8], ['sparkle', 1.3, 0.04, 0.25]],
      star: [['rpinhale', 1, 0, 0.9], ['rpspark', 0.75, 0.08, 0.4], ['boom', 0.8, 0.28, 0.25]],
      twinstar: [['rpinhale', 1.4, 0, 0.8], ['rpspark', 1.2, 0.05, 0.5], ['rpedge', 1.2, 0.18, 0.4]],
      veil: [['rpcloth', 1, 0, 1], ['wind', 0.6, 0, 0.35]],
      gravewalk: [['rpvanish', 1, 0, 1], ['rpcloth', 1.4, 0, 0.4]],
      frenzy: [['rpwhine', 1, 0, 1], ['rpink', 0.8, 0, 0.5]],
      gatecut: [['rpcut', 1.3, 0, 0.8], ['rpedge', 1, 0.02, 0.7]],
      auto: [['slash', 0.8, 0, 0.6, 0], ['rpcut', 1.25, 0, 0.5]],
    },
  };
  // Tidecaller (class id tidecaller): sea water, every move its own sound: a spray of salt water, a drop in a cupped hand, a rising swell, a whirl, a conch and a wave
  // coming in, the tide turned, a stone wall of sea, the flood (two conch calls and a great rush), the pull of the deep, a whirlpool, a bore of tide
  ABIL.tidecaller = {
    spray: [['whoosh-up', 1.5, 0, 0.5], ['tdrop', 1.3, 0.05, 0.8], ['tfoam', 1.3, 0.1, 0.55]],
    sip: [['tdrop', 1, 0, 1], ['tmoon', 1.2, 0.1, 0.5]],
    swell: [['tdrop', 0.8, 0, 0.8], ['whoosh-up', 0.8, 0.03, 0.4], ['tmoon', 1, 0.15, 0.55]],
    riptide: [['twhirl', 1.2, 0, 1], ['tdrop', 1.5, 0.12, 0.5], ['tmoon', 0.9, 0.22, 0.4]],
    surge: [['tconch', 1, 0, 0.9], ['tsurf', 1, 0.15, 1], ['trush', 1, 0.2, 0.4]],
    current: [['whoosh-up', 0.9, 0, 0.6], ['tdrop', 0.7, 0.05, 0.5], ['tsurf', 1.6, 0.05, 0.4]],
    breakwater: [['tstone', 1, 0, 1], ['tsurf', 0.6, 0.06, 0.8], ['tbell', 0.7, 0.22, 0.5]],
    springflood: [['tconch', 0.7, 0, 1], ['tconch', 1.05, 0.14, 0.6], ['trush', 0.8, 0.28, 0.8], ['tbell', 1.2, 0.45, 0.4]],
    undertow: [['tpull', 1, 0, 1], ['tbell', 0.6, 0.15, 0.7], ['tsurf', 0.7, 0.2, 0.5]],
    maelstrom: [['twhirl', 0.7, 0, 1], ['trush', 0.9, 0.1, 0.6], ['tbell', 0.5, 0.3, 0.3]],
    bore: [['trush', 1.3, 0, 1], ['tcrash', 1, 0.25, 0.7], ['tconch', 1.4, 0, 0.5]],
    auto: [['whoosh-up', 1.6, 0, 0.9], ['tfoam', 1.5, 0.02, 1], ['tdrop', 1.6, 0.04, 0.5]],
  };
  // Kenseier (class id kenseier): steel on ash and ember, every move its own sound: three cuts (a clean sweep with an ember on the end), the blade lifted to meet a blow
  // (a thin draw; what it meets is a clang or a clank from the moment), a quick step through, the blade drawn for the Deathblow, a cloak of ash, a sword planted, a
  // blade sheathed and waited on, a spin, and an ember duel struck up with a beat (Flash of Ash is the Ultimate, ult-kenseier)
  ABIL.kenseier = {
    auto: [['slash', 0.8, 0, 0.6, 0], ['knsweep', 1.25, 0, 0.55]],
    cut: [['slash', 0.9, 0, 0.9, 1], ['knsweep', 1, 0, 0.7], ['knember', 1, 0.05, 0.5]],
    deflect: [['kndraw', 1.5, 0, 0.7], ['knknock', 1.6, 0.03, 0.4]],
    mikiri: [['dash', 1.2, 0, 0.6, 0], ['knash', 1.4, 0, 0.5], ['knsweep', 0.7, 0.02, 0.4]],
    deathblow: [['kndraw', 0.8, 0, 0.8], ['knhush', 1, 0.02, 0.7], ['heavy', 0.7, 0.1, 0.5, 1]],
    mantle: [['knash', 0.9, 0, 1], ['shield', 0.5, 0, 0.7, 1], ['kntoll', 0.6, 0.1, 0.4]],
    guard: [['knplant', 1, 0, 1], ['shield', 0.8, 0.05, 0.7, 2], ['kntoll', 1.2, 0.1, 0.4]],
    iai: [['knhush', 0.8, 0, 0.5], ['knknock', 2.2, 0.15, 0.9], ['kndraw', 0.6, 0.02, 0.5]],
    whirlwind: [['knspin', 1, 0, 1], ['knsweep', 1.2, 0.08, 0.6], ['knember', 1.1, 0.1, 0.4]],
    duel: [['kntoll', 0.7, 0, 0.9], ['knember', 0.9, 0.04, 0.7], ['knknock', 1.1, 0.22, 0.6], ['knknock', 1.1, 0.42, 0.6]],
  };
  // Lanternkeeper (class id lanternkeeper): iron, brass and flame, every move its own sound: a spit of ember, a snip of the shears, a lantern set down and its flame
  // catching, a Great Beacon planted, a lantern hooked on an ally, a burst of every light at once, a chain dragged and a lantern tossed, a match struck, a wisp,
  // a flock of paper lanterns, a walk that drops little lights, a dash dragging them along, and the beam of the Lighthouse
  ABIL.lanternkeeper = {
    auto: [['lkspark', 1, 0, 0.9], ['whoosh-up', 1.8, 0, 0.35], ['lkchime', 1.4, 0.04, 0.3]],
    trim: [['lksnip', 1, 0, 1], ['lkspark', 1.2, 0.05, 0.8], ['whoosh-up', 1.4, 0, 0.3]],
    set: [['lkclink', 1, 0, 1], ['lkfwoomp', 1.1, 0.06, 0.6], ['lkchime', 0.9, 0.12, 0.3]],
    beacon: [['lkpost', 1, 0, 1], ['lkfwoomp', 0.8, 0.07, 0.9], ['lkgong', 1, 0.1, 0.6], ['lkhum', 0.8, 0.15, 0.4]],
    hand: [['lkchain', 1, 0, 0.7], ['lkclink', 1.3, 0.1, 0.8], ['lkbell', 1.1, 0.12, 0.7], ['lkfwoomp', 1.3, 0.1, 0.35]],
    flare: [['lkfwoomp', 1.2, 0, 1], ['lkspark', 0.9, 0.03, 0.8], ['lkchime', 1.3, 0.08, 0.6], ['lkbell', 0.85, 0.05, 0.6]],
    carry: [['lkchain', 0.9, 0, 0.9], ['whoosh-up', 1, 0.04, 0.5], ['lkclink', 0.8, 0.28, 0.8]],
    relight: [['lkmatch', 1, 0, 1], ['lkfwoomp', 0.9, 0.17, 0.8], ['lkbell', 1.3, 0.28, 0.5], ['lkhum', 1.3, 0.2, 0.3]],
    wisp: [['lkmoth', 1, 0, 1], ['lkchime', 1.5, 0.05, 0.5], ['lkgutter', 1.2, 0.08, 0.35]],
    festival: [['lkmoth', 1.2, 0, 0.8], ['lkchime', 1, 0, 0.8], ['lkchime', 1.3, 0.13, 0.6], ['lkchime', 1.7, 0.26, 0.5], ['lkhum', 1.2, 0.1, 0.4]],
    stride: [['lkstep', 1, 0, 0.9], ['lkclink', 1.4, 0.04, 0.6], ['lkfwoomp', 1.5, 0.1, 0.4]],
    trail: [['dash', 1.2, 0, 0.7, 0], ['lkchain', 1.3, 0.02, 0.8], ['lkchime', 1.6, 0.1, 0.5]],
    beaconflare: [['lkfwoomp', 0.9, 0, 1], ['lkgong', 1.2, 0.02, 0.8], ['lkchime', 1.1, 0.06, 0.7], ['lkspark', 0.8, 0.04, 0.8]],
  };
  // Houndmaster (class id houndmaster): every move its own sound. The whistles of Flank and Call Off are the moves themselves; Hold / Pounce is one button, so its press is only a breath
  // and a click of the lips and the right whistle (Hold's one long note, Pounce's three) comes with the moment (sound-hooks.js SoundHooks.houndmaster). The knife is steel and leather,
  // Mark the Quarry a cloth snapped out and knotted, Relay both whistles close together, Mount paws and leather, Ride Down a drop and a cut, Howl the pack's voices, the Long Chase a
  // sharp note and a gallop (Wild Hunt is the Ultimate, ult-houndmaster)
  ABIL.houndmaster = {
    auto: [['slash', 0.85, 0, 0.6, 0], ['hmcloth', 1.3, 0, 0.4]],
    knife: [['slash', 0.95, 0, 0.9, 1], ['hmsteel', 1, 0.03, 0.5]],
    flank: [['hmwf', 1, 0, 1], ['hmpuff', 1, 0, 0.3]],
    finisher: [['hmsnap', 1, 0, 0.9], ['heavy', 0.9, 0.04, 0.6, 1], ['hmgrowl', 1, 0, 0.4]],
    pounce: [['hmbreath', 1, 0, 1], ['hmcloth', 0.8, 0.12, 0.5]],
    calloff: [['hmwc', 1, 0, 1], ['hmpaws', 1, 0.12, 0.6]],
    quarry: [['hmcloth', 0.7, 0, 0.9], ['hmknot', 1, 0.08, 0.8], ['buff', 1.2, 0.1, 0.4, 1]],
    relay: [['hmwf', 1.3, 0, 0.8], ['hmwc', 1.1, 0.18, 0.8], ['hmpaws', 1.2, 0.08, 0.5]],
    mount: [['hmpaws', 0.6, 0, 0.9], ['hmcloth', 0.6, 0.04, 0.7], ['hmgrowl', 0.7, 0.1, 0.5]],
    ridedown: [['whoosh-down', 1, 0, 0.7], ['slash', 0.8, 0.05, 0.9, 2], ['heavy', 0.8, 0.2, 0.7, 0]],
    howl: [['hmhowl', 1, 0, 1], ['buff', 0.9, 0.1, 0.4, 2]],
    longchase: [['hmwh', 1.4, 0, 0.8], ['hmpaws', 1.3, 0.1, 0.8], ['whoosh-up', 1.2, 0.05, 0.4]],
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
  // Gloomsworn: the sky going dark (a hollow breath drawn in, a low drone swelling), the black sun's toll, the shells bursting on the party
  def('ult-gloomsworn', 'ult', S => {
    S.space('hall', 0.5);
    S.noise({ color: 'pink', bp: 360, bp1: 700, q: 2.6, dur: 0.55, pts: [[0.5, 1], [0.55, 0]], peak: 0.2 });
    S.choir({ notes: [mf(33), mf(40)], vowel: 'o', vowel1: 'u', a: 0.45, dur: 1.3, peak: 0.13 });
    S.bell({ at: 0.5, set: 'church', f: mf(31), dur: 2.2, peak: 0.26, beat: 0.7 });
    S.thud({ at: 0.5, f: 70, f1: 28, dur: 0.7, peak: 0.55, drive: 2 });
    S.whoosh({ at: 0.5, color: 'brown', f: 300, f1: 2000, dur: 0.5, peakAt: 0.3, peak: 0.3 });
    [79, 84, 88, 91, 96].forEach((n, i) => S.glass({ at: 0.6 + i * 0.05, f: mf(n), dur: 0.9, peak: 0.07, pan: (i - 2) * 0.3 }));
  });
  // Reaper (class id thresher): the Ultimate (Arcane Gate: a breath drawn in as the world tints violet, a low violet hum opening on two beating tones with a phasing shimmer of glass, the
  // gateway settling on a soft bell), and the moments the kit sends (sound-hooks.js SoundHooks.thresher): a string's swing (a thin blue edge, pitched up for each of the four), the four
  // finishers (a hooking flick, the blade into the ground with a crack of ink, a long skewer, the huge sweep), the quake ring, a rune laid (a tiny glassy chime, deeper when empowered), a
  // mark popped by the Snap (a wet pop, a rope's twang, a dull thud with a high crack, a thin silver ping), a Full Harvest and a Harvest Moon, the Void Star opening (an inward hum) and
  // collapsing (a deep muffled boom with crackle), a string timing out, Dusk Veil, Insane Reaper, the Blink and the slashes that come with it, Danse Macabre, and the Gate: a strike
  // (a rising tone for each empowered mark), Gatebreaker, the fifth swing's blue-white release and the Gate closing
  def('ult-thresher', 'ult', S => {
    S.space('hall', 0.5);
    S.whoosh({ color: 'pink', f: 3200, f1: 240, q: 1.1, dur: 0.55, peakAt: 0.9, peak: 0.3 });
    S.tone({ at: 0.45, f: mf(40), fm: [1.5, 2, 0.5], dur: 1.3, a: 0.55, swell: true, lp: 900, peak: 0.13 });
    S.tone({ at: 0.45, f: mf(40), det: 14, vib: [4.5, 0.004, 0.2], dur: 1.3, a: 0.55, swell: true, lp: 700, peak: 0.1 });
    S.choir({ at: 0.4, notes: [mf(52), mf(59)], vowel: 'u', vowel1: 'o', a: 0.6, dur: 1.3, peak: 0.09 });
    [91, 95, 98, 103].forEach((n, i) => S.glass({ at: 0.75 + i * 0.1, f: mf(n), dur: 0.9, peak: 0.045, pan: i % 2 ? 0.35 : -0.35 }));
    S.bell({ at: 1.25, set: 'hand', f: mf(76), dur: 1.1, peak: 0.1 });
    S.thud({ at: 1.25, f: 74, f1: 36, dur: 0.5, peak: 0.28 });
  });
  def('reaper-swing', 'ab', S => {
    S.noise({ color: 'pink', bp: 2600, bp1: 4200, q: 1.6, dur: 0.14, pts: [[0.03, 1], [0.14, 0]], peak: 0.12 });
    S.glass({ at: 0.02, f: mf(93), dur: 0.28, peak: 0.05 });
    S.metal({ at: 0.03, set: 'bar', f: 3800, dur: 0.14, peak: 0.03, click: 0 });
  });
  def('reaper-finish1', 'ab', S => {
    S.whoosh({ color: 'pink', f: 900, f1: 3800, q: 1, dur: 0.22, peakAt: 0.5, peak: 0.32 });
    S.metal({ at: 0.12, set: 'bar', f: 3300, dur: 0.22, peak: 0.07, click: 0.5 });
    S.scrape({ at: 0.1, f: 5000, q: 3, rate: 80, dur: 0.1, pts: [[0.01, 1], [0.1, 0]], peak: 0.06 });
    S.glass({ at: 0.14, f: mf(91), dur: 0.5, peak: 0.06 });
  });
  def('reaper-finish2', 'ab', S => {
    S.whoosh({ color: 'pink', f: 2200, f1: 300, q: 0.9, dur: 0.14, peakAt: 0.8, peak: 0.25 });
    S.thud({ at: 0.13, f: 80, f1: 38, dur: 0.45, drive: 1.6, peak: 0.5 });
    S.crack({ at: 0.13, f: 900, dur: 0.3, peak: 0.3 });
    S.metal({ at: 0.14, set: 'plate', f: 230, dur: 0.5, peak: 0.07, click: 0.3 });
    S.crackle({ at: 0.16, f: 3200, dens: 1.2, dur: 0.4, pts: [[0.03, 1], [0.4, 0]], peak: 0.12 });
    S.noise({ at: 0.14, color: 'brown', lp: 480, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.18 });
  });
  def('reaper-finish3', 'ab', S => {
    S.whoosh({ color: 'pink', f: 500, f1: 6000, q: 1.4, dur: 0.55, peakAt: 0.7, peak: 0.36 });
    S.crackle({ at: 0.2, f: 4600, dens: 1.8, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.12 });
    S.noise({ at: 0.4, hp: 2500, dur: 0.05, a: 0.0006, peak: 0.25 });
    S.metal({ at: 0.42, set: 'bar', f: 2700, dur: 0.4, peak: 0.08, click: 0.5 });
    S.thud({ at: 0.42, f: 120, f1: 60, dur: 0.18, peak: 0.3 });
    S.glass({ at: 0.45, f: mf(98), dur: 0.6, peak: 0.05 });
  });
  def('reaper-finish4', 'ab', S => {
    S.space('room', 0.2);
    S.whoosh({ color: 'brown', f: 140, f1: 900, q: 0.7, dur: 0.55, peakAt: 0.5, peak: 0.5 });
    S.whoosh({ at: 0.04, color: 'pink', f: 500, f1: 3600, q: 0.8, dur: 0.5, peakAt: 0.55, peak: 0.34 });
    [0, 1, 2, 3].forEach(i => { B.zing(S, 0.22 + i * 0.05, 0.9, (i - 1.5) * 0.45); S.glass({ at: 0.24 + i * 0.05, f: mf(88 + i * 3), dur: 0.7, peak: 0.045, pan: (i - 1.5) * 0.4 }); });
    S.thud({ at: 0.3, f: 66, f1: 32, dur: 0.6, drive: 1.7, peak: 0.45 });
    S.bell({ at: 0.3, set: 'church', f: mf(45), dur: 1.0, peak: 0.1, beat: 0.9 });
  });
  def('reaper-quake', 'ab', S => {
    S.rumble({ dur: 0.9, f: 90, peak: 0.3, a: 0.04, grain: 0.5 });
    S.thud({ f: 56, f1: 30, dur: 0.7, drive: 1.5, peak: 0.38 });
    S.crackle({ at: 0.04, f: 1800, dens: 0.8, dur: 0.7, pts: [[0.1, 1], [0.7, 0]], peak: 0.14 });
    S.noise({ color: 'brown', lp: 380, lp1: 140, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.2 });
  });
  def('reaper-rune', 'ab', S => {
    S.glass({ f: mf(91), dur: 0.4, peak: 0.07 });
    S.glass({ at: 0.015, f: mf(98), dur: 0.28, peak: 0.03 });
    S.noise({ hp: 6500, dur: 0.012, a: 0.0006, peak: 0.08 });
  });
  def('reaper-rune-emp', 'ab', S => {
    S.glass({ f: mf(91), dur: 0.45, peak: 0.07 });
    S.glass({ at: 0.015, f: mf(79), dur: 0.5, peak: 0.05 });
    S.bell({ set: 'hand', f: mf(64), dur: 0.9, peak: 0.08 });
    S.thud({ f: 90, f1: 55, dur: 0.18, peak: 0.16, click: 0 });
  });
  def('reaper-pop-drain', 'ab', S => {
    S.bubbles({ n: 2, f: 500, f1: 1400, spread: 0.04, size: 0.03, peak: 0.22 });
    S.noise({ color: 'pink', lp: 2000, lp1: 600, dur: 0.1, pts: [[0.01, 1], [0.1, 0]], peak: 0.16 });
    S.glass({ at: 0.01, f: mf(91), dur: 0.25, peak: 0.04 });
  });
  def('reaper-pop-bind', 'ab', S => {
    S.noise({ hp: 2500, dur: 0.03, a: 0.0005, peak: 0.2 });
    S.pluck({ f: 196, bend: -5, dur: 0.5, bright: 18, peak: 0.22 });
    S.pluck({ at: 0.01, f: 392, bend: -4, dur: 0.3, bright: 12, peak: 0.07 });
  });
  def('reaper-pop-death', 'ab', S => {
    S.thud({ f: 90, f1: 45, dur: 0.3, drive: 1.4, peak: 0.5 });
    S.crack({ at: 0.01, f: 2600, dur: 0.12, peak: 0.28 });
    S.noise({ color: 'brown', lp: 320, dur: 0.25, pts: [[0.02, 1], [0.25, 0]], peak: 0.14 });
  });
  def('reaper-pop-thread', 'ab', S => {
    S.glass({ f: mf(103), dur: 0.55, peak: 0.08 });
    S.metal({ set: 'bar', f: 4200, dur: 0.3, peak: 0.04, click: 0.3 });
    B.zing(S, 0, 0.45, 0);
  });
  def('reaper-harvest', 'ab', S => {
    S.space('hall', 0.35);
    S.bell({ set: 'church', f: mf(60), dur: 1.6, peak: 0.2, beat: 0.9 });
    S.bell({ at: 0.02, set: 'hand', f: mf(84), dur: 1.1, peak: 0.1 });
    S.noise({ color: 'brown', lp: 500, lp1: 200, dur: 0.8, a: 0.02, pts: [[0.1, 1], [0.8, 0]], peak: 0.2 });
    S.glass({ at: 0.05, f: mf(96), dur: 0.8, peak: 0.05 });
    S.thud({ f: 72, f1: 36, dur: 0.4, peak: 0.3 });
  });
  def('reaper-moon', 'ab', S => {
    S.whoosh({ color: 'pink', f: 2000, f1: 7000, q: 2, dur: 0.3, peakAt: 0.6, peak: 0.2 });
    [91, 95, 98, 103, 107].forEach((n, i) => S.glass({ at: 0.04 + i * 0.045, f: mf(n), dur: 0.8, peak: 0.055, pan: (i - 2) * 0.3 }));
    S.tone({ at: 0.05, f: mf(84), fm: [2, 1.5, 0.4], dur: 0.7, a: 0.2, swell: true, lp: 3000, peak: 0.05 });
  });
  def('reaper-star-open', 'ab', S => {
    S.space('room', 0.2);
    S.whoosh({ color: 'pink', f: 3600, f1: 260, q: 1.2, dur: 1.0, peakAt: 0.9, peak: 0.3 });
    S.tone({ f: mf(31), f1: mf(38), glide: 1, fm: [1.5, 2, 0.5], dur: 1.1, a: 0.7, swell: true, lp: 700, peak: 0.14 });
    S.tone({ at: 0.1, f: mf(50), f1: mf(57), glide: 0.9, dur: 1.0, a: 0.7, swell: true, lp: 900, am: [9, 0.4], peak: 0.05 });
    S.crackle({ at: 0.4, f: 4500, dens: 1.5, dur: 0.6, pts: [[0.5, 1], [0.6, 0.7]], peak: 0.08 });
  });
  def('reaper-star-collapse', 'ab', S => {
    S.space('hall', 0.3);
    S.thud({ f: 58, f1: 26, dur: 0.9, drive: 2, peak: 0.6 });
    S.noise({ color: 'brown', lp: 260, lp1: 120, dur: 1.0, a: 0.01, pts: [[0.05, 1], [1, 0]], peak: 0.3 });
    S.crack({ at: 0.02, f: 1200, dur: 0.3, peak: 0.2 });
    S.crackle({ at: 0.03, f: 3200, dens: 1.2, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.16 });
    S.glass({ at: 0.1, f: mf(79), dur: 0.9, peak: 0.04 });
  });
  def('reaper-slack', 'ab', S => {
    S.noise({ color: 'pink', bp: 1800, bp1: 700, q: 1, dur: 0.25, pts: [[0.03, 1], [0.25, 0]], peak: 0.09 });
    S.crackle({ f: 2000, dens: 0.8, dur: 0.2, pts: [[0.02, 1], [0.2, 0]], peak: 0.05 });
    S.tone({ f: 600, f1: 220, glide: 0.25, dur: 0.28, lp: 1200, a: 0.01, peak: 0.04 });
  });
  def('reaper-veil', 'ab', S => {
    S.noise({ color: 'brown', lp: 700, lp1: 1400, dur: 0.9, a: 0.35, pts: [[0.4, 1], [0.9, 0]], peak: 0.25 });
    S.tone({ f: mf(38), fm: [1.5, 1, 0.3], dur: 0.9, a: 0.4, swell: true, lp: 600, peak: 0.1 });
    S.glass({ at: 0.5, f: mf(79), dur: 0.6, peak: 0.03 });
  });
  def('reaper-frenzy', 'ab', S => {
    S.tone({ type: 'saw', f: 700, f1: 3400, glide: 0.6, dur: 0.7, lp: 6000, a: 0.02, vib: [18, 0.02, 0.1], pts: [[0.03, 1], [0.55, 0.9], [0.7, 0]], peak: 0.08 });
    S.scrape({ at: 0.05, f: 4800, q: 3, rate: 90, dur: 0.5, pts: [[0.05, 1], [0.5, 0.8], [0.6, 0]], peak: 0.06 });
    S.noise({ color: 'brown', lp: 300, dur: 0.7, a: 0.05, pts: [[0.2, 1], [0.7, 0]], peak: 0.2 });
    S.crackle({ at: 0.3, f: 4200, dens: 1.8, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.08 });
  });
  def('reaper-blink', 'ab', S => {
    S.whoosh({ color: 'pink', f: 400, f1: 6000, q: 2, dur: 0.14, peakAt: 0.6, peak: 0.3 });
    S.zap({ f: 200, f1: 900, dur: 0.12, peak: 0.07 });
    S.noise({ color: 'brown', lp: 500, dur: 0.18, pts: [[0.02, 1], [0.18, 0]], peak: 0.14 });
    S.crack({ at: 0.1, f: 3000, dur: 0.12, peak: 0.12 });
  });
  def('reaper-slash', 'ab', S => {
    S.whoosh({ color: 'pink', f: 900, f1: 4500, q: 0.9, dur: 0.16, peakAt: 0.5, peak: 0.3 });
    S.crack({ at: 0.08, f: 2200, dur: 0.15, peak: 0.2 });
    S.glass({ at: 0.08, f: mf(95), dur: 0.35, peak: 0.05 });
  });
  def('reaper-danse', 'ab', S => {
    [0, 0.09, 0.18].forEach((at, i) => {
      S.whoosh({ at, color: 'pink', f: 800 + i * 250, f1: 3600 + i * 400, q: 0.9, dur: 0.14, peakAt: 0.5, peak: 0.22, pan: (i - 1) * 0.5 });
      S.glass({ at: at + 0.06, f: mf(88 + i * 4), dur: 0.4, peak: 0.05, pan: (i - 1) * 0.5 });
    });
    S.crack({ at: 0.24, f: 2400, dur: 0.12, peak: 0.14 });
  });
  def('reaper-gate-open', 'ab', S => {
    S.space('hall', 0.4);
    S.tone({ f: mf(52), fm: [1.5, 1.5, 0.4], dur: 0.7, a: 0.35, swell: true, lp: 1200, peak: 0.08 });
    [86, 91, 95].forEach((n, i) => S.glass({ at: 0.08 + i * 0.1, f: mf(n), dur: 0.7, peak: 0.04, pan: (i - 1) * 0.4 }));
    S.whoosh({ color: 'pink', f: 3000, f1: 800, q: 1, dur: 0.5, peakAt: 0.4, peak: 0.1 });
  });
  def('reaper-gate-tone', 'ab', S => {
    S.whoosh({ f: 1800, f1: 5200, q: 2, dur: 0.12, peak: 0.2 });
    S.glass({ at: 0.02, f: mf(79), dur: 0.6, peak: 0.07 });
    S.partials({ at: 0.02, set: 'hand', f: mf(72), dur: 0.5, peak: 0.07 });
    S.crackle({ at: 0.02, f: 4400, dens: 1.8, dur: 0.14, pts: [[0.01, 1], [0.14, 0]], peak: 0.06 });
  });
  def('reaper-gatebreaker', 'ab', S => {
    S.metal({ set: 'bar', f: 2400, dur: 0.5, peak: 0.1, click: 0.6 });
    B.zing(S, 0, 1, -0.3); B.zing(S, 0.05, 1, 0.3);
    [88, 95, 100].forEach((n, i) => S.glass({ at: 0.04 + i * 0.05, f: mf(n), dur: 0.8, peak: 0.06 }));
    S.thud({ f: 100, f1: 60, dur: 0.2, peak: 0.25 });
  });
  def('reaper-gate-bloom', 'ab', S => {
    S.space('hall', 0.4);
    S.thud({ f: 76, f1: 36, dur: 0.6, drive: 1.8, peak: 0.5 });
    S.bell({ set: 'hand', f: mf(84), dur: 1.5, peak: 0.16 });
    S.choir({ at: 0.03, notes: [mf(60), mf(67), mf(72)], vowel: 'a', a: 0.12, dur: 1.2, peak: 0.1 });
    S.crack({ at: 0.02, f: 1500, dur: 0.35, peak: 0.25 });
    S.crackle({ at: 0.04, f: 3600, dens: 1.5, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.1 });
    [84, 88, 91, 96, 100].forEach((n, i) => S.glass({ at: 0.06 + i * 0.045, f: mf(n), dur: 0.9, peak: 0.06, pan: (i - 2) * 0.3 }));
  });
  def('reaper-gate-close', 'ab', S => {
    S.space('hall', 0.35);
    S.tone({ f: mf(45), f1: mf(33), glide: 0.8, fm: [1.5, 1.5, 0.3], dur: 0.9, a: 0.05, lp: 800, pts: [[0.05, 1], [0.9, 0]], peak: 0.1 });
    S.whoosh({ color: 'pink', f: 2400, f1: 200, q: 1, dur: 0.6, peakAt: 0.2, peak: 0.14 });
    [96, 91, 86].forEach((n, i) => S.glass({ at: i * 0.1, f: mf(n), dur: 0.6, peak: 0.035 }));
  });
  // Tidecaller (class id tidecaller): the Ultimate (a long conch call over a great rush of water with a bell under it), and the moments the kit sends
  // (sound-hooks.js SoundHooks.tidecaller): the crest (a pearl note and a wash of foam), slack water (a soft pulling-back), a Riptide Mark popping (a bubble
  // burst and a chime), the wave of a Surge (pitched by how high the water was), the Drowned Bell, the flood's gulls, the Leviathan's crash
  def('ult-tidecaller', 'ult', S => {
    S.space('hall', 0.45);
    S.horn({ f: mf(40), dur: 1.4, bright: 4, peak: 0.26 }); S.horn({ at: 0.04, f: mf(47), dur: 1.3, bright: 4, peak: 0.12 });
    S.whoosh({ at: 0.35, color: 'brown', f: 150, f1: 2200, q: 0.6, dur: 1.0, peakAt: 0.6, peak: 0.38 });
    S.thud({ at: 0.9, f: 66, f1: 30, dur: 0.7, peak: 0.5, drive: 2 });
    S.bell({ at: 0.9, set: 'church', f: mf(55), dur: 1.6, peak: 0.14, beat: 0.9, lp: 1400 });
    [79, 84, 88, 91, 96].forEach((n, i) => S.glass({ at: 1.0 + i * 0.06, f: mf(n), dur: 0.9, peak: 0.06, pan: (i - 2) * 0.3 }));
  });
  def('tide-crest', 'ab', S => {
    S.glass({ f: mf(91), dur: 0.9, peak: 0.1 }); S.partials({ at: 0.02, set: 'hand', f: mf(84), dur: 0.7, peak: 0.07 });
    S.noise({ at: 0.03, color: 'pink', bp: 700, bp1: 2000, q: 0.8, dur: 0.6, pts: [[0.2, 1], [0.6, 0]], peak: 0.1 });
  });
  def('tide-slack', 'ab', S => {
    S.noise({ color: 'pink', bp: 1400, bp1: 350, q: 0.7, dur: 0.7, pts: [[0.1, 1], [0.7, 0]], peak: 0.1 });
    S.bubbles({ at: 0.15, n: 3, f: 500, f1: 900, spread: 0.3, size: 0.04, peak: 0.05 });
  });
  def('tide-pop', 'ab', S => {
    S.bubbles({ n: 7, f: 600, f1: 2600, spread: 0.12, size: 0.025, peak: 0.16 });
    S.glass({ at: 0.02, f: mf(88), dur: 0.7, peak: 0.1 }); S.partials({ at: 0.03, set: 'hand', f: mf(81), dur: 0.5, peak: 0.07 });
    S.noise({ color: 'white', hp: 4000, grain: 0.9, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.07 });
  });
  def('tide-wave', 'ab', S => {
    S.whoosh({ color: 'pink', f: 400, f1: 2800, q: 0.7, dur: 0.45, peakAt: 0.6, peak: 0.3 });
    S.glass({ at: 0.08, f: mf(84), dur: 0.8, peak: 0.08 }); S.glass({ at: 0.13, f: mf(91), dur: 0.7, peak: 0.06 });
  });
  def('tide-bell', 'ab', S => {
    S.space('room', 0.3);
    S.bell({ set: 'church', f: mf(50), dur: 1.8, peak: 0.2, beat: 0.8, lp: 1200 });
    S.bubbles({ at: 0.1, n: 8, f: 600, f1: 1900, spread: 0.7, size: 0.035, peak: 0.08 });
    S.glass({ at: 0.35, f: mf(86), dur: 0.9, peak: 0.05 });
  });
  def('tide-gull', 'ab', S => { S.tone({ f: 2400, f1: 1600, glide: 0.18, dur: 0.22, vib: [26, 0.03, 0], lp: 5000, a: 0.02, peak: 0.05 }); S.tone({ at: 0.28, f: 2200, f1: 1500, glide: 0.2, dur: 0.24, vib: [26, 0.03, 0], lp: 5000, a: 0.02, peak: 0.04 }); S.tone({ at: 0.7, f: 2500, f1: 1700, glide: 0.2, dur: 0.22, vib: [24, 0.03, 0], lp: 5000, a: 0.02, peak: 0.035 }); });
  def('tide-crash', 'ab', S => {
    S.space('hall', 0.35);
    S.thud({ f: 58, f1: 30, dur: 0.7, drive: 1.8, peak: 0.55 });
    S.noise({ color: 'pink', bp: 1800, bp1: 500, q: 0.6, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.36 });
    S.noise({ at: 0.03, color: 'white', hp: 4000, grain: 0.8, dur: 0.7, pts: [[0.05, 1], [0.7, 0]], peak: 0.1 });
    [84, 88, 91].forEach((n, i) => S.glass({ at: 0.2 + i * 0.05, f: mf(n), dur: 0.8, peak: 0.05 }));
  });
  // Kenseier (class id kenseier): the Ultimate (Flash of Ash: a drawn breath, a run of tiny cuts quickening into a rush, then one deep thud and a glass crack), and the
  // moments the kit sends (sound-hooks.js SoundHooks.kenseier): a Perfect (a high clean clang), a Good (a duller clank), a press with nothing to meet (a thin whiff), a step
  // through a blow, a Break (a glass crack with a gold ring-out), Off-balance (a dull stagger), the Deathblow (a drawn-out whoosh and then a thump), a Pommel's knock, a
  // Redirect (the blow sent back), Blazing Mantle catching, and Iai's counter-cut
  def('ult-kenseier', 'ult', S => {
    S.space('hall', 0.4);
    S.noise({ color: 'pink', lp: 1400, lp1: 250, dur: 0.5, a: 0.04, pts: [[0.15, 1], [0.5, 0]], peak: 0.16 });
    for (let i = 0; i < 22; i++) { const at = 0.2 + 0.7 * (1 - Math.pow(1 - i / 22, 1.8)); S.tick({ at, f: 2200 + i * 110, peak: 0.1 + i * 0.004 }); if (i % 3 === 0) S.scrape({ at, f: 5400, q: 3, rate: 70, dur: 0.06, pts: [[0.005, 1], [0.06, 0]], peak: 0.06 }); }
    S.whoosh({ at: 0.35, color: 'white', f: 700, f1: 4200, q: 1.1, dur: 0.6, peakAt: 0.9, peak: 0.26 });
    S.thud({ at: 0.98, f: 68, f1: 32, dur: 0.7, drive: 2, peak: 0.55 });
    S.crack({ at: 0.98, f: 2800, dur: 0.3, peak: 0.35 });
    [88, 93, 97, 100].forEach((n, i) => S.glass({ at: 1.0 + i * 0.045, f: mf(n), dur: 0.9, peak: 0.06, pan: (i - 1.5) * 0.3 }));
    S.bell({ at: 1.0, set: 'hand', f: mf(50), dur: 1.4, peak: 0.12, beat: 0.8, lp: 1600 });
  });
  def('ken-perfect', 'ab', S => {
    S.metal({ set: 'bar', f: 2700, dur: 0.6, peak: 0.2, click: 0.9, spread: 4 });
    S.partials({ at: 0.004, set: 'service', f: 1500, dur: 0.8, peak: 0.1, spread: 3, strike: 0.3 });
    S.glass({ at: 0.01, f: mf(100), dur: 0.7, peak: 0.05 });
    S.noise({ hp: 7000, dur: 0.05, a: 0.0006, pts: [[0.004, 1], [0.05, 0]], peak: 0.1 });
  });
  def('ken-good', 'ab', S => {
    S.metal({ set: 'plate', f: 540, dur: 0.22, peak: 0.2, click: 0.7, lp: 3200 });
    S.thud({ f: 150, f1: 90, dur: 0.12, peak: 0.3, click: 0 });
    S.wood({ at: 0.004, f: 700, dur: 0.07, peak: 0.12 });
  });
  def('ken-miss', 'ab', S => {
    S.whoosh({ color: 'pink', f: 900, f1: 450, q: 0.8, dur: 0.18, peakAt: 0.3, peak: 0.16 });
    S.wood({ at: 0.13, f: 300, dur: 0.06, peak: 0.1 });
  });
  def('ken-pass', 'ab', S => {
    S.whoosh({ color: 'white', f: 500, f1: 2800, q: 1, dur: 0.24, peakAt: 0.55, peak: 0.2 });
    S.noise({ at: 0.04, color: 'pink', lp: 1800, lp1: 500, dur: 0.2, pts: [[0.03, 1], [0.2, 0]], peak: 0.08 });
    S.tick({ at: 0.2, f: 3600, peak: 0.07 }); S.glass({ at: 0.2, f: mf(96), dur: 0.4, peak: 0.03 });
  });
  def('ken-break', 'ab', S => {
    S.space('room', 0.2);
    S.crack({ f: 2600, dur: 0.28, peak: 0.5 });
    [0, 0.03, 0.055, 0.09, 0.13, 0.17].forEach((at, i) => S.glass({ at: 0.01 + at, f: S.rr(2200, 4200), dur: 0.5 - i * 0.04, peak: 0.1, pan: S.rr(-0.4, 0.4) }));
    S.thud({ at: 0.01, f: 110, f1: 55, dur: 0.22, peak: 0.4, drive: 1.3 });
    S.glass({ at: 0.2, f: mf(98), dur: 1.0, peak: 0.07 });
    S.noise({ at: 0.02, hp: 5000, grain: 0.9, grainRate: 2, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.08 });
  });
  def('ken-off', 'ab', S => {
    S.thud({ f: 110, f1: 50, dur: 0.3, peak: 0.45, drive: 1.2 });
    S.tone({ at: 0.04, f: 260, f1: 120, glide: 0.35, dur: 0.4, am: [9, 0.5], lp: 900, a: 0.01, peak: 0.1 });
    S.metal({ set: 'plate', f: 260, dur: 0.3, peak: 0.1, click: 0.3, lp: 1800 });
  });
  def('ken-deathblow', 'ab', S => {
    S.space('room', 0.25);
    S.whoosh({ color: 'pink', f: 260, f1: 3400, q: 0.9, dur: 0.5, peakAt: 0.9, peak: 0.34 });
    S.scrape({ at: 0.05, f: 5200, q: 3, rate: 50, dur: 0.35, pts: [[0.06, 1], [0.35, 0]], peak: 0.05 });
    S.thud({ at: 0.46, f: 72, f1: 34, dur: 0.6, drive: 1.8, peak: 0.55 });
    S.crack({ at: 0.46, f: 900, dur: 0.18, peak: 0.2 });
    S.metal({ at: 0.48, set: 'plate', f: 220, dur: 0.7, peak: 0.1, strike: 0.3 });
  });
  def('ken-pommel', 'ab', S => {
    S.wood({ f: 380, dur: 0.1, peak: 0.25 });
    S.thud({ f: 120, f1: 65, dur: 0.16, peak: 0.35, click: 0.2 });
    S.metal({ at: 0.01, set: 'bar', f: 1500, dur: 0.12, peak: 0.07, click: 0.3 });
  });
  def('ken-redirect', 'ab', S => {
    S.whoosh({ color: 'white', f: 2800, f1: 700, q: 1, dur: 0.2, peakAt: 0.3, peak: 0.2 });
    S.metal({ at: 0.17, set: 'plate', f: 900, dur: 0.35, peak: 0.16, click: 0.8 });
    S.thud({ at: 0.18, f: 130, f1: 70, dur: 0.14, peak: 0.25, click: 0 });
  });
  def('ken-blaze', 'ab', S => {
    S.noise({ color: 'pink', lp: 300, lp1: 2800, fd: 0.4, dur: 0.5, a: 0.03, pts: [[0.15, 1], [0.5, 0]], peak: 0.3 });
    S.crackle({ at: 0.05, f: 3000, dens: 1.5, dur: 0.4, pts: [[0.03, 1], [0.4, 0]], peak: 0.1 });
    S.thud({ at: 0.12, f: 80, f1: 46, dur: 0.3, peak: 0.4 });
  });
  def('ken-iai', 'ab', S => {
    S.scrape({ f: 6000, q: 3, rate: 90, dur: 0.1, pts: [[0.01, 1], [0.1, 0]], peak: 0.12 });
    S.crack({ at: 0.08, f: 3000, dur: 0.18, peak: 0.3 });
    S.metal({ at: 0.09, set: 'bar', f: 3800, dur: 0.4, peak: 0.1, click: 0.6 });
  });
  // Houndmaster (class id houndmaster): the Ultimate (Wild Hunt: a hunting horn sounded twice, a pack of ghostly howls answering out of the dark, a deep thud as they break and run), and the
  // moments the kit sends (sound-hooks.js SoundHooks.houndmaster): the whistles of Hold and Pounce, a bark for each hound, a bite and a big one, Rend (two scrapes crossing), Hamstring (a low
  // tearing cut and a stumble), Bring Down (the leap and a heavy landing), Snap, the pounce landing, Call Off arriving, Relay, a hound downed and back on its feet, the Quarry marked, the
  // horn of Wild Hunt, Mount, Ride Down, Howl and the Long Chase
  def('ult-houndmaster', 'ult', S => {
    S.space('hall', 0.5);
    S.horn({ f: mf(52), dur: 0.8, peak: 0.34 });
    S.horn({ at: 0.62, f: mf(59), dur: 1.0, peak: 0.34 });
    [0, 0.12, 0.26].forEach((at, i) => hhowl(S, 0.9 + at, [260, 310, 230][i], 0.08, 1.1));
    S.thud({ at: 1.5, f: 70, f1: 34, dur: 0.6, drive: 1.8, peak: 0.5 });
    S.noise({ at: 1.5, color: 'pink', lp: 2400, lp1: 400, dur: 0.7, a: 0.03, pts: [[0.08, 1], [0.7, 0]], peak: 0.2 });
    [86, 91, 95].forEach((n, i) => S.glass({ at: 1.5 + i * 0.06, f: mf(n), dur: 0.9, peak: 0.05, pan: (i - 1) * 0.3 }));
  });
  def('hm-whistle-hold', 'ab', S => { ACC.hmwh(S); });
  def('hm-whistle-pounce', 'ab', S => { ACC.hmwp(S); });
  def('hm-bark-rust', 'ab', S => { hbark(S, 0, 140, 0.17, 0.3); hbark(S, 0.23, 128, 0.2, 0.3); });
  def('hm-bark-ash', 'ab', S => { hbark(S, 0, 235, 0.12, 0.26); hbark(S, 0.16, 250, 0.11, 0.24); hbark(S, 0.31, 225, 0.13, 0.24); });
  def('hm-bark-greyfang', 'ab', S => { hbark(S, 0, 96, 0.3, 0.38); S.noise({ at: 0.08, color: 'brown', lp: 360, dur: 0.45, a: 0.05, pts: [[0.12, 1], [0.45, 0]], peak: 0.14 }); });
  def('hm-bark-ghost', 'ab', S => { S.space('hall', 0.55); hbark(S, 0, 205, 0.2, 0.18); S.glass({ at: 0.05, f: mf(88), dur: 0.9, peak: 0.04 }); S.noise({ at: 0.02, color: 'white', hp: 4800, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.03 }); });
  def('hm-bite', 'ab', S => { ACC.hmsnap(S); S.thud({ f: 120, f1: 70, dur: 0.1, peak: 0.22, click: 0 }); });
  def('hm-bite-big', 'ab', S => { ACC.hmsnap(S); S.thud({ f: 90, f1: 46, dur: 0.22, peak: 0.45, drive: 1.2 }); ACC.hmgrowl(S); S.crack({ at: 0.01, f: 1500, dur: 0.1, peak: 0.2 }); });
  def('hm-rend', 'ab', S => { ACC.hmclaws(S); S.whoosh({ color: 'white', f: 900, f1: 3600, q: 1.2, dur: 0.26, peakAt: 0.4, peak: 0.22 }); S.thud({ at: 0.13, f: 100, f1: 56, dur: 0.22, peak: 0.45, drive: 1.2 }); S.glass({ at: 0.14, f: mf(92), dur: 0.5, peak: 0.05 }); });
  def('hm-hamstring', 'ab', S => { S.whoosh({ color: 'pink', f: 1400, f1: 300, q: 0.9, dur: 0.28, peakAt: 0.3, peak: 0.26 }); S.noise({ at: 0.08, color: 'white', bp: 2400, bp1: 900, q: 1.4, dur: 0.18, pts: [[0.02, 1], [0.18, 0]], peak: 0.16 }); S.thud({ at: 0.2, f: 130, f1: 70, dur: 0.14, peak: 0.35, click: 0 }); S.thud({ at: 0.34, f: 105, f1: 55, dur: 0.2, peak: 0.4, drive: 1.1 }); S.noise({ at: 0.3, color: 'pink', lp: 1400, lp1: 300, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.1 }); });
  def('hm-bringdown', 'ab', S => { S.space('room', 0.2); S.whoosh({ color: 'pink', f: 500, f1: 2000, q: 0.9, dur: 0.3, peakAt: 0.8, peak: 0.3 }); S.thud({ at: 0.28, f: 66, f1: 32, dur: 0.6, drive: 1.9, peak: 0.6 }); S.crack({ at: 0.28, f: 900, dur: 0.16, peak: 0.28 }); S.noise({ at: 0.3, color: 'brown', lp: 700, lp1: 150, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.3 }); hbark(S, 0.1, 110, 0.2, 0.25); });
  def('hm-snap', 'ab', S => { ACC.hmsnap(S); S.thud({ at: 0.01, f: 140, f1: 80, dur: 0.1, peak: 0.25, click: 0 }); });
  def('hm-pounce', 'ab', S => { S.whoosh({ color: 'pink', f: 600, f1: 1600, q: 0.9, dur: 0.22, peakAt: 0.6, peak: 0.22 }); S.thud({ at: 0.48, f: 96, f1: 50, dur: 0.22, peak: 0.45, drive: 1.1 }); S.noise({ at: 0.48, color: 'pink', lp: 1800, lp1: 400, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.12 }); });
  def('hm-calloff', 'ab', S => { ACC.hmpaws(S); S.thud({ at: 0.3, f: 100, f1: 60, dur: 0.16, peak: 0.3, click: 0 }); S.thud({ at: 0.36, f: 112, f1: 64, dur: 0.16, peak: 0.28, click: 0 }); S.noise({ at: 0.3, color: 'pink', lp: 1600, dur: 0.2, pts: [[0.02, 1], [0.2, 0]], peak: 0.08 }); });
  def('hm-relay', 'ab', S => { S.whoosh({ color: 'pink', f: 700, f1: 1500, q: 1, dur: 0.3, peakAt: 0.5, peak: 0.16, pan: -0.5 }); S.whoosh({ at: 0.04, color: 'pink', f: 1500, f1: 700, q: 1, dur: 0.3, peakAt: 0.5, peak: 0.16, pan: 0.5 }); ACC.hmpaws(S); });
  def('hm-down', 'ab', S => { S.tone({ f: 520, f1: 210, glide: 0.35, dur: 0.4, am: [8, 0.5], lp: 1400, a: 0.01, peak: 0.12 }); S.thud({ at: 0.02, f: 110, f1: 55, dur: 0.22, peak: 0.3 }); S.noise({ at: 0.04, color: 'pink', lp: 1300, lp1: 300, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.1 }); });
  def('hm-up', 'ab', S => { hbark(S, 0, 190, 0.15, 0.22); S.glass({ at: 0.06, f: mf(90), dur: 0.6, peak: 0.05 }); S.glass({ at: 0.11, f: mf(95), dur: 0.6, peak: 0.04 }); });
  def('hm-quarry', 'ab', S => { S.noise({ color: 'pink', lp: 2400, lp1: 600, dur: 0.2, pts: [[0.02, 1], [0.2, 0]], peak: 0.2 }); ACC.hmknot(S); S.glass({ at: 0.1, f: mf(86), dur: 0.7, peak: 0.05 }); });
  def('hm-horn', 'ab', S => { S.space('hall', 0.45); S.horn({ f: mf(52), dur: 0.9, peak: 0.36 }); S.horn({ at: 0.55, f: mf(59), dur: 0.9, peak: 0.34 }); });
  def('hm-mount', 'ab', S => { ACC.hmpaws(S); S.thud({ at: 0.05, f: 90, f1: 50, dur: 0.2, peak: 0.35 }); hbark(S, 0.08, 100, 0.22, 0.3); });
  def('hm-ridedown', 'ab', S => { S.thud({ f: 72, f1: 36, dur: 0.4, drive: 1.5, peak: 0.5 }); S.noise({ color: 'pink', lp: 1800, lp1: 300, dur: 0.4, pts: [[0.03, 1], [0.4, 0]], peak: 0.16 }); S.scrape({ at: 0.1, f: 4200, q: 2.6, rate: 60, dur: 0.18, pts: [[0.02, 1], [0.18, 0]], peak: 0.08 }); S.crack({ at: 0.12, f: 1400, dur: 0.1, peak: 0.25 }); });
  def('hm-howl', 'ab', S => { S.space('hall', 0.4); ACC.hmhowl(S); hhowl(S, 0.3, 275, 0.07, 0.9); });
  def('hm-longchase', 'ab', S => { for (let i = 0; i < 14; i++) S.thud({ at: i * 0.09 + S.rr(0, 0.015), f: S.rr(100, 140), f1: 62, dur: 0.07, peak: 0.12 + (i % 2) * 0.04, click: 0 }); [1, 2, 3, 4].forEach(q => { S.crack({ at: q * 0.31, f: 3200, dur: 0.05, peak: 0.14 }); S.thud({ at: q * 0.31, f: 96, f1: 52, dur: 0.16, peak: 0.3, click: 0 }); }); });
  // Lanternkeeper (class id lanternkeeper): the Ultimate (Lighthouse: a great flame taking hold, a brass bell tolling and a low choir swelling under a rising shimmer of
  // glass), and the moments the kit sends (sound-hooks.js SoundHooks.lanternkeeper): an Ember gained (a tiny warm tick), a lantern snuffed (a puff and a thread of smoke),
  // a small light dropped (a soft catch), the Lighthouse going dark (the hum falling away), the Eternal Lamp lit (a bell and a long hum), Trailing Sparks (a spit of
  // sparks), a Pillar of Flame scorching the boss, and Pilgrim's Pace (a soft chime)
  def('ult-lanternkeeper', 'ult', S => {
    S.space('hall', 0.45);
    S.noise({ color: 'pink', lp: 300, lp1: 3200, fd: 0.7, dur: 1.0, a: 0.05, pts: [[0.4, 1], [1.0, 0]], peak: 0.36 });
    S.thud({ at: 0.28, f: 76, f1: 36, dur: 0.6, peak: 0.5, drive: 2 });
    S.bell({ at: 0.3, set: 'church', f: mf(52), dur: 1.9, peak: 0.16, beat: 0.8, lp: 1800 });
    S.bell({ at: 0.34, set: 'hand', f: mf(72), dur: 1.5, peak: 0.12 });
    S.choir({ at: 0.15, notes: [mf(55), mf(62), mf(67), mf(74)], vowel: 'o', vowel1: 'a', a: 0.3, dur: 1.5, peak: 0.12 });
    [86, 91, 95, 98, 103].forEach((n, i) => S.glass({ at: 0.45 + i * 0.07, f: mf(n), dur: 1.0, peak: 0.06, pan: (i - 2) * 0.3 }));
  });
  def('lamp-ember', 'ab', S => { S.tick({ f: 2600, peak: 0.12 }); S.glass({ at: 0.015, f: mf(96), dur: 0.35, peak: 0.05 }); S.crackle({ at: 0.01, f: 3600, dens: 1.6, dur: 0.12, pts: [[0.01, 1], [0.12, 0]], peak: 0.06 }); });
  def('lamp-snuff', 'ab', S => {
    S.noise({ color: 'pink', lp: 1600, lp1: 450, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.2 });
    S.noise({ at: 0.04, color: 'white', hp: 5000, grain: 0.9, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.05 });
    S.tone({ at: 0.04, f: 330, f1: 150, glide: 0.3, dur: 0.35, lp: 700, a: 0.01, peak: 0.05 });
  });
  def('lamp-drop', 'ab', S => { S.noise({ color: 'pink', lp: 2400, lp1: 900, dur: 0.18, a: 0.01, pts: [[0.05, 1], [0.18, 0]], peak: 0.12 }); S.glass({ at: 0.02, f: mf(90), dur: 0.4, peak: 0.04 }); });
  def('lamp-end', 'ab', S => {
    S.choir({ notes: [mf(62), mf(55)], vowel: 'o', a: 0.05, dur: 0.9, peak: 0.08 });
    S.noise({ at: 0.05, color: 'pink', lp: 1800, lp1: 400, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.14 });
  });
  def('lamp-eternal', 'ab', S => {
    S.space('hall', 0.35);
    S.bell({ set: 'church', f: mf(55), dur: 2.0, peak: 0.16, beat: 0.8, lp: 1600 });
    S.choir({ at: 0.05, notes: [mf(55), mf(62)], vowel: 'o', a: 0.25, dur: 1.4, peak: 0.08 });
    S.glass({ at: 0.1, f: mf(98), dur: 1.2, peak: 0.06 });
  });
  def('lamp-sparks', 'ab', S => { S.crackle({ f: 4200, dens: 2.2, dur: 0.35, pts: [[0.01, 1], [0.35, 0]], peak: 0.2 }); for (let i = 0; i < 5; i++) S.tick({ at: S.rr(0, 0.25), f: S.rr(3000, 5200), peak: 0.07 }); S.glass({ at: 0.03, f: mf(95), dur: 0.5, peak: 0.04 }); });
  def('lamp-pillar', 'ab', S => {
    S.noise({ color: 'pink', lp: 300, lp1: 2200, fd: 0.35, dur: 0.5, a: 0.03, pts: [[0.12, 1], [0.5, 0]], peak: 0.26 });
    S.thud({ f: 70, f1: 40, dur: 0.3, peak: 0.28, click: 0 });
    S.crackle({ at: 0.08, f: 3200, dens: 1.5, dur: 0.35, pts: [[0.04, 1], [0.35, 0]], peak: 0.12 });
  });
  def('lamp-pilgrim', 'ab', S => { S.bell({ set: 'hand', f: mf(76), dur: 0.9, peak: 0.1 }); S.glass({ at: 0.04, f: mf(93), dur: 0.6, peak: 0.04 }); });
  // Hollow: the knight goes hollow (a crack through a low struck shell and a breath let go), is sealed (a white resolve), or breaks
  def('gloom-hollow-on', 'sting', S => {
    S.space('hall', 0.45);
    S.thud({ f: 70, f1: 32, dur: 0.5, peak: 0.55, drive: 2 });
    S.crack({ at: 0.02, f: 900, dur: 0.3, peak: 0.3 });
    S.metal({ at: 0.03, set: 'plate', f: 150, dur: 1.2, peak: 0.16, strike: 0.4 });
    S.noise({ at: 0.1, color: 'pink', bp: 700, bp1: 300, q: 3, dur: 0.9, pts: [[0.1, 1], [0.9, 0]], peak: 0.22 });
    S.choir({ at: 0.15, notes: [mf(38), mf(45)], vowel: 'u', vowel1: 'o', a: 0.2, dur: 1.2, peak: 0.1 });
  });
  def('gloom-hollow-off', 'sting', S => {
    S.space('hall', 0.5);
    S.noise({ color: 'pink', bp: 400, bp1: 2400, q: 1.6, dur: 0.5, pts: [[0.4, 1], [0.5, 0]], peak: 0.18 });
    S.bell({ at: 0.2, set: 'hand', f: mf(72), dur: 1.6, peak: 0.22 });
    S.choir({ at: 0.1, notes: [mf(52), mf(59), mf(64)], vowel: 'a', a: 0.3, dur: 1.4, peak: 0.12 });
    S.thud({ at: 0.2, f: 90, f1: 50, dur: 0.3, peak: 0.3, click: 0.1 });
    [84, 88, 91].forEach((n, i) => S.glass({ at: 0.35 + i * 0.07, f: mf(n), dur: 0.9, peak: 0.07 }));
  });
  def('gloom-hollow-break', 'sting', S => {
    S.space('hall', 0.45);
    S.thud({ f: 80, f1: 30, dur: 0.6, peak: 0.55, drive: 2 });
    for (let i = 0; i < 7; i++) S.glass({ at: S.rr(0, 0.25), f: S.rr(1800, 5200), dur: 0.45, peak: 0.08, pan: S.rr(-0.5, 0.5) });
    S.noise({ at: 0.02, hp: 2500, dur: 0.06, a: 0.0005, peak: 0.28 });
    S.metal({ at: 0.04, set: 'plate', f: 120, dur: 1.0, peak: 0.14, strike: 0.4 });
    S.pad({ at: 0.1, notes: [mf(45), mf(48)], type: 'tri', bend: -6, dur: 1.6, a: 0.05, lpEnv: [900, 700, 200, 0.3], peak: 0.12 });
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
  // Cocoon Drop: a silk line paying out, the whistle of the fall, a soft heavy thump and the shell rustling as it settles
  def('bm-skitterra-cocoon-drop', 'bm', S => {
    B.silk(S, 0, 0.9, 0.7, 0.7);
    S.whoosh({ at: 0.35, f: 1800, f1: 250, dur: 0.6, peakAt: 0.2, peak: 0.3 });
    S.thud({ at: 1.0, f: 85, f1: 38, dur: 0.5, drive: 1.6, peak: 0.6, lp: 400 });
    S.noise({ at: 1.0, color: 'pink', lp: 700, dur: 0.35, pts: [[0.02, 1], [0.35, 0]], peak: 0.25 });
    S.splat({ at: 1.02, peak: 0.28, dur: 0.3 });
    S.skitter({ at: 1.3, n: 8, dur: 0.5, f: 2400, peak: 0.1 });
    S.tone({ at: 1.3, f: 60, f1: 55, dur: 0.5, a: 0.1, peak: 0.12 });
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
  def('bm-volkar-twin-fall', 'bm', S => {
    S.space('hall', 0.5);
    S.crack({ f: 1500, peak: 0.45, pan: -0.7 });
    S.crack({ at: 0.35, f: 1300, peak: 0.45, pan: 0.7 });
    B.thunder(S, 0.02, 1.0);
    S.thud({ f: 62, f1: 24, dur: 1.2, drive: 3, peak: 0.7, sub: 0.4 });
    S.thud({ at: 0.35, f: 48, f1: 20, dur: 1.2, drive: 3, peak: 0.7, sub: 0.4 });
    for (let i = 0; i < 6; i++) S.partials({ at: S.rr(0.05, 0.9), set: 'stone', f: S.rr(300, 800), dur: 0.3, peak: 0.1, strike: 0.5, pan: i % 2 ? 0.6 : -0.6 });
    S.rumble({ dur: 2.5, f: 120, peak: 0.4, a: 0.05 });
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
  // Sceptre Throw: the sceptre hurled, a spinning rising whistle with chains rattling after it, then a plate-iron strike into stone
  def('bm-hollowking-sceptre-throw', 'bm', S => {
    S.whoosh({ f: 500, f1: 3200, dur: 0.45, peakAt: 0.8, peak: 0.45, q: 1.1, am: [14, 0.5] });
    chains(S, 0, 0.35, 0.5);
    S.metal({ at: 0.45, set: 'plate', f: 700, dur: 0.9, peak: 0.25, strike: 0.5 });
    S.partials({ at: 0.45, set: 'stone', f: 300, dur: 0.3, peak: 0.15 });
    S.thud({ at: 0.45, f: 110, f1: 45, dur: 0.4, peak: 0.55, drive: 1.8 });
    S.crack({ at: 0.45, f: 1400, dur: 0.18, peak: 0.25 });
  });
  // Grave Summons: whispering dead and knuckled bones closing in from both sides, the earth dragging, one deep bell where they meet
  def('bm-hollowking-grave-summons', 'bm', S => {
    S.space('hall', 0.4);
    for (let i = 0; i < 8; i++) { const pan = (i % 2 ? 1 : -1) * (0.9 - i * 0.1); S.voice({ at: i * 0.15, f: 110 + (i % 3) * 14, vowel: 'u', vowel1: 'o', breath: 1.6, dur: 0.6, peak: 0.06, pan }); S.wood({ at: i * 0.15 + 0.05, f: S.rr(900, 1600), dur: 0.03, peak: 0.18, pan }); }
    S.scrape({ at: 0.1, f: 700, q: 2, rate: 25, dur: 1.2, pts: [[0.2, 1], [1.2, 0]], peak: 0.12 });
    S.rumble({ at: 0.2, dur: 1.4, f: 70, f1: 140, peak: 0.3, a: 0.4 });
    S.bell({ at: 1.2, set: 'church', f: mf(40), dur: 2, peak: 0.18, beat: 0.8 });
    S.thud({ at: 1.2, f: 60, f1: 32, dur: 0.6, peak: 0.5 });
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

  // ---------------------------------------------------------------------------------------------- Vhalgrath (the Ember Wyrm)
  def('bm-wyrm-intro', 'sting', S => {
    S.space('cave', 0.6);
    S.voice({ f: 52, f1: 40, dur: 2.2, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.4, lp: 3500, pts: [[0.3, 1], [2.2, 0]] });
    S.rumble({ dur: 3, f: 70, peak: 0.45, a: 0.1 });
    S.crackle({ at: 0.5, dens: 1.2, f: 3000, dur: 2, pts: [[0.3, 1], [2, 0]], peak: 0.12 });
  });
  def('bm-wyrm-tyrants-roar', 'bm', S => {
    S.space('cave', 0.5);
    S.voice({ f: 58, f1: 44, dur: 1.8, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.38, lp: 4000, pts: [[0.25, 1], [1.8, 0]] });
    S.rumble({ dur: 2.4, f: 80, peak: 0.4, a: 0.05 });
    S.noise({ at: 0.3, bp: 900, q: 2, dur: 1.4, pts: [[0.2, 1], [1.4, 0]], peak: 0.12 });
  });
  def('bm-wyrm-rending-claws', 'bm', S => {
    S.whoosh({ f: 200, f1: 1100, dur: 0.4, peakAt: 0.9, peak: 0.35 });
    S.metal({ at: 0.38, set: 'bar', f: 900, dur: 0.9, peak: 0.16, strike: 0.6 });
    S.thud({ at: 0.4, f: 80, f1: 34, dur: 0.6, drive: 2.5, peak: 0.65 });
    S.noise({ at: 0.4, bp: 3200, bp1: 700, q: 3, dur: 0.3, grain: 0.8, pts: [[0.03, 1], [0.3, 0]], peak: 0.3 });
  });
  def('bm-wyrm-ember-breath', 'bm', S => {
    S.noise({ bp: 500, bp1: 2200, q: 1.2, dur: 1.6, a: 0.25, pts: [[0.3, 0.7], [0.9, 1], [1.6, 0]], peak: 0.3 });
    S.crackle({ dens: 2.4, f: 4200, dur: 1.6, pts: [[0.3, 1], [1.6, 0]], peak: 0.2 });
    S.rumble({ dur: 1.8, f: 90, peak: 0.25, a: 0.2 });
  });
  def('bm-wyrm-tail-lash', 'bm', S => {
    S.whoosh({ f: 120, f1: 700, dur: 0.6, peakAt: 0.85, peak: 0.4 });
    S.thud({ at: 0.55, f: 70, f1: 30, dur: 0.6, drive: 2.5, peak: 0.6 });
    S.crack({ at: 0.55, peak: 0.25, dur: 0.15 });
  });
  def('bm-wyrm-magma-burst', 'bm', S => {
    [0, 0.18, 0.36].forEach((at, i) => { S.thud({ at, f: 90 - i * 10, f1: 40, dur: 0.4, drive: 2, peak: 0.45 }); S.splat({ at, peak: 0.22, dur: 0.25 }); });
    S.crackle({ at: 0.1, dens: 2, f: 3600, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.2 });
  });
  def('bm-wyrm-cinder-feast', 'bm', S => {
    S.rumble({ dur: 1.8, f: 110, peak: 0.3, a: 0.3 });
    S.crackle({ dens: 1.6, f: 3000, dur: 1.8, pts: [[0.4, 1], [1.8, 0]], peak: 0.2 });
    S.tone({ f: 82, f1: 123, dur: 1.6, a: 0.8, peak: 0.1 });
  });
  def('bm-wyrm-take-flight', 'bm', S => {
    [0, 0.4, 0.8].forEach((at, i) => S.whoosh({ at, f: 100, f1: 500 + i * 100, dur: 0.45, peakAt: 0.5, peak: 0.28 - i * 0.04 }));
    S.rumble({ dur: 1.4, f: 90, peak: 0.25, a: 0.1 });
  });
  def('bm-wyrm-dragonfall', 'bm', S => {
    S.space('cave', 0.4);
    S.whoosh({ f: 700, f1: 90, dur: 1.4, peakAt: 0.8, peak: 0.35 });
    S.thud({ at: 1.4, f: 60, f1: 24, dur: 1.0, drive: 3, peak: 0.85 });
    S.rumble({ at: 1.4, dur: 1.6, f: 100, peak: 0.35, a: 0.02 });
    S.crackle({ at: 1.4, lp: 2800, dur: 0.8, pts: [[0.02, 1], [0.8, 0]], peak: 0.25 });
  });
  def('bm-wyrm-twin-pass', 'bm', S => {
    S.whoosh({ f: 500, f1: 120, dur: 0.9, peakAt: 0.5, peak: 0.32 });
    S.whoosh({ at: 0.9, f: 700, f1: 90, dur: 1.2, peakAt: 0.8, peak: 0.34 });
    S.thud({ at: 2.1, f: 60, f1: 24, dur: 0.9, drive: 3, peak: 0.7 });
  });
  def('bm-wyrm-the-roost', 'bm', S => {
    S.space('cave', 0.45);
    [0, 0.5, 1.0, 1.5].forEach(at => S.whoosh({ at, f: 90, f1: 380, dur: 0.5, peakAt: 0.5, peak: 0.22 }));
    S.voice({ at: 1.2, f: 62, dur: 1.2, vowel: 'o', breath: 5, peak: 0.25, lp: 3000, pts: [[0.3, 1], [1.2, 0]] });
    S.rumble({ dur: 2.2, f: 80, peak: 0.3, a: 0.2 });
  });
  def('bm-wyrm-crater-boils', 'bm', S => {
    S.rumble({ dur: 3, f: 60, peak: 0.45, a: 0.3 });
    S.crackle({ dens: 2.2, f: 3400, dur: 2.8, pts: [[0.5, 1], [2.8, 0]], peak: 0.22 });
    S.noise({ bp: 400, q: 1.5, dur: 2.5, a: 0.5, pts: [[1.2, 1], [2.5, 0]], peak: 0.15 });
  });
  def('bm-wyrm-twin-breath', 'bm', S => {
    [0, 1.1].forEach(at => {
      S.noise({ at, bp: 500, bp1: 2200, q: 1.2, dur: 1.3, a: 0.2, pts: [[0.25, 0.7], [0.7, 1], [1.3, 0]], peak: 0.28 });
      S.crackle({ at, dens: 2.2, f: 4000, dur: 1.3, pts: [[0.25, 1], [1.3, 0]], peak: 0.18 });
    });
    S.rumble({ dur: 2.4, f: 90, peak: 0.25, a: 0.2 });
  });
  def('bm-wyrm-heart-burn', 'bm', S => {
    S.space('cave', 0.5);
    S.bell({ f: mf(31), dur: 4, peak: 0.45, lp: 2500 });
    [0.8, 1.6, 2.4].forEach(at => { S.thud({ at, f: 80, f1: 36, dur: 0.4, peak: 0.4 }); S.crackle({ at, dens: 2, f: 3000, dur: 0.5, pts: [[0.02, 1], [0.5, 0]], peak: 0.18 }); });
    S.rumble({ at: 2.6, dur: 2.2, f: 70, peak: 0.45, a: 0.4 });
  });
  def('bm-wyrm-wingbeat', 'bm', S => {
    S.whoosh({ f: 80, f1: 600, dur: 0.7, peakAt: 0.6, peak: 0.4 });
    S.thud({ at: 0.55, f: 60, f1: 30, dur: 0.5, drive: 2, peak: 0.5 });
  });
  def('bm-wyrm-cinder-rain', 'bm', S => {
    for (let i = 0; i < 10; i++) { S.tone({ at: i * 0.2, f: 1600 + S.rr(0, 900), f1: 500, dur: 0.25, peak: 0.05 }); S.thud({ at: i * 0.2 + 0.25, f: 120, f1: 60, dur: 0.15, peak: 0.12 }); }
    S.crackle({ dens: 1.5, f: 3500, dur: 2.4, pts: [[0.3, 1], [2.4, 0]], peak: 0.15 });
  });
  def('bm-wyrm-heart-flare', 'bm', S => {
    S.bell({ f: mf(36), dur: 3, peak: 0.35 });
    S.thud({ at: 0.6, f: 70, f1: 30, dur: 0.7, drive: 2.5, peak: 0.6 });
    S.crackle({ at: 0.6, dens: 2.4, f: 3600, dur: 1.0, pts: [[0.03, 1], [1.0, 0]], peak: 0.22 });
  });
  def('bm-wyrm-talon-dive', 'bm', S => {
    S.voice({ f: 520, f1: 180, dur: 0.9, vowel: 'a', vowel1: 'i', breath: 4, peak: 0.16, lp: 5000, pts: [[0.2, 1], [0.9, 0]] });
    S.whoosh({ at: 0.2, f: 1400, f1: 120, dur: 1.0, peakAt: 0.7, peak: 0.33 });
    S.thud({ at: 1.2, f: 70, f1: 28, dur: 0.8, drive: 3, peak: 0.8 });
    S.crackle({ at: 1.2, lp: 3000, dur: 0.6, pts: [[0.02, 1], [0.6, 0]], peak: 0.2 });
  });
  def('bm-wyrm-aftershock', 'bm', S => {
    S.space('cave', 0.4);
    [0, 0.45, 0.9].forEach((at, i) => S.thud({ at, f: 84 - i * 12, f1: 34, dur: 0.6, drive: 2, peak: 0.6 - i * 0.1 }));
    S.rumble({ at: 0.1, dur: 2.2, f: 70, peak: 0.4, a: 0.2 });
    S.crackle({ at: 0.9, dens: 2, f: 3200, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.2 });
  });
  def('bm-wyrm-cinder-run', 'bm', S => {
    [0, 0.8, 1.6].forEach((at, i) => {
      S.whoosh({ at, f: 900 - i * 150, f1: 100, dur: 0.7, peakAt: 0.5, peak: 0.3 });
      S.thud({ at: at + 0.6, f: 66, f1: 26, dur: 0.6, drive: 2.5, peak: 0.6 });
    });
    S.crackle({ at: 0.6, dens: 2, f: 3400, dur: 2.2, pts: [[0.2, 1], [2.2, 0]], peak: 0.14 });
    S.rumble({ dur: 2.6, f: 80, peak: 0.3, a: 0.1 });
  });
  def('bm-wyrm-ashfall', 'bm', S => {
    S.space('cave', 0.6);
    S.voice({ f: 50, f1: 36, dur: 3, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.4, lp: 3000, pts: [[0.4, 1], [3, 0]] });
    S.rumble({ dur: 4, f: 60, peak: 0.5, a: 0.5 });
    S.noise({ bp: 700, q: 1.2, dur: 3.5, a: 1, pts: [[2.5, 1], [3.5, 0]], peak: 0.2 });
  });

  // ---------------------------------------------------------------------------------------------- Hrimgar (the Frost Titan)
  def('bm-titan-intro', 'sting', S => {
    S.space('hall', 0.6);
    S.voice({ f: 46, f1: 38, dur: 2.6, vowel: 'o', vowel1: 'a', breath: 5, peak: 0.4, lp: 2600, pts: [[0.4, 1], [2.6, 0]] });
    S.rumble({ dur: 3.2, f: 55, peak: 0.45, a: 0.2 });
    S.bell({ at: 0.6, f: mf(52), dur: 3.4, peak: 0.16, lp: 5000 });
  });
  def('bm-titan-winters-howl', 'bm', S => {
    S.space('hall', 0.55);
    S.noise({ bp: 600, bp1: 1800, q: 1.4, dur: 2.2, a: 0.5, pts: [[0.6, 0.8], [1.2, 1], [2.2, 0]], peak: 0.3 });
    S.voice({ f: 52, f1: 44, dur: 1.9, vowel: 'o', breath: 6, peak: 0.28, lp: 3200, pts: [[0.3, 1], [1.9, 0]] });
    S.rumble({ dur: 2.4, f: 60, peak: 0.35, a: 0.1 });
  });
  def('bm-titan-glacial-fist', 'bm', S => {
    S.whoosh({ f: 140, f1: 800, dur: 0.6, peakAt: 0.85, peak: 0.35 });
    S.thud({ at: 0.58, f: 56, f1: 26, dur: 0.9, drive: 3, peak: 0.75 });
    S.crack({ at: 0.58, peak: 0.3, dur: 0.2 });
    S.metal({ at: 0.6, set: 'bar', f: 1300, dur: 1.4, peak: 0.12, strike: 0.5 });
  });
  def('bm-titan-rime-slam', 'bm', S => {
    S.whoosh({ f: 120, f1: 500, dur: 0.5, peakAt: 0.9, peak: 0.3 });
    S.thud({ at: 0.5, f: 60, f1: 28, dur: 0.8, drive: 3, peak: 0.7 });
    S.crackle({ at: 0.5, dens: 3, f: 5200, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.22 });
    S.tone({ at: 0.5, f: 2300, f1: 900, dur: 0.5, peak: 0.06 });
  });
  def('bm-titan-twin-slam', 'bm', S => {
    [0, 1.1].forEach(at => {
      S.whoosh({ at, f: 120, f1: 500, dur: 0.45, peakAt: 0.9, peak: 0.26 });
      S.thud({ at: at + 0.45, f: 60, f1: 28, dur: 0.7, drive: 3, peak: 0.6 });
      S.crackle({ at: at + 0.45, dens: 3, f: 5000, dur: 0.7, pts: [[0.02, 1], [0.7, 0]], peak: 0.18 });
    });
  });
  def('bm-titan-fault-line', 'bm', S => {
    S.thud({ at: 0.3, f: 54, f1: 24, dur: 1.0, drive: 3, peak: 0.7 });
    S.crackle({ at: 0.35, dens: 4, f: 4200, dur: 1.8, pts: [[0.05, 1], [0.6, 0.8], [1.8, 0]], peak: 0.28 });
    S.noise({ at: 0.4, bp: 2600, bp1: 700, q: 2.5, dur: 1.4, grain: 0.7, pts: [[0.05, 1], [1.4, 0]], peak: 0.2 });
    S.rumble({ at: 0.3, dur: 2.0, f: 50, peak: 0.35, a: 0.05 });
  });
  def('bm-titan-icefall', 'bm', S => {
    for (let i = 0; i < 8; i++) { S.tone({ at: i * 0.25, f: 2600 + S.rr(0, 1400), f1: 700, dur: 0.3, peak: 0.09 }); S.thud({ at: i * 0.25 + 0.3, f: 160, f1: 70, dur: 0.2, peak: 0.16 }); S.crackle({ at: i * 0.25 + 0.3, dens: 3, f: 6000, dur: 0.25, pts: [[0.02, 1], [0.25, 0]], peak: 0.16 }); }
    S.bell({ f: mf(70), dur: 2.4, peak: 0.1, lp: 6000 });
  });
  def('bm-titan-titans-sweep', 'bm', S => {
    S.whoosh({ f: 90, f1: 520, dur: 1.4, peakAt: 0.7, peak: 0.45 });
    S.rumble({ dur: 1.8, f: 56, peak: 0.35, a: 0.2 });
    S.thud({ at: 1.3, f: 50, f1: 24, dur: 0.8, drive: 2.5, peak: 0.55 });
  });
  def('bm-titan-winters-grasp', 'bm', S => {
    S.space('hall', 0.4);
    S.crackle({ dens: 2.8, f: 5600, dur: 2.0, pts: [[0.4, 0.6], [1.6, 1], [2, 0]], peak: 0.2 });
    S.bell({ f: mf(64), dur: 3.0, peak: 0.18, lp: 5500 });
    S.bell({ at: 0.15, f: mf(71), dur: 2.6, peak: 0.1, lp: 6500 });
    S.noise({ bp: 4200, q: 3, dur: 2, a: 0.9, pts: [[1.4, 1], [2, 0]], peak: 0.08 });
  });
  def('bm-titan-frostbite', 'bm', S => {
    S.tone({ f: 1760, f1: 1180, dur: 1.4, a: 0.1, peak: 0.07 });
    S.crackle({ dens: 3.2, f: 6200, dur: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.16 });
    S.bell({ at: 0.1, f: mf(76), dur: 2.4, peak: 0.12, lp: 7000 });
    S.noise({ bp: 3000, q: 2, dur: 1.2, a: 0.3, pts: [[0.5, 1], [1.2, 0]], peak: 0.07 });
  });
  def('bm-titan-whiteout', 'bm', S => {
    S.space('hall', 0.6);
    S.noise({ bp: 900, bp1: 3200, q: 0.9, dur: 3.4, a: 1.0, pts: [[1.8, 1], [3.4, 0]], peak: 0.36 });
    S.rumble({ dur: 3.4, f: 50, peak: 0.3, a: 0.8 });
    S.bell({ at: 2.0, f: mf(60), dur: 3, peak: 0.14, lp: 5000 });
  });
  def('bm-titan-the-long-night', 'bm', S => {
    S.space('hall', 0.7);
    S.bell({ f: mf(33), dur: 5, peak: 0.4, lp: 2400 });
    S.voice({ at: 0.5, f: 44, f1: 41, dur: 3.2, vowel: 'o', breath: 4, peak: 0.3, lp: 2400, pts: [[0.8, 1], [3.2, 0]] });
    S.rumble({ dur: 4.4, f: 48, peak: 0.4, a: 0.6 });
    S.crackle({ at: 1.5, dens: 1.2, f: 5200, dur: 2.5, pts: [[0.3, 1], [2.5, 0]], peak: 0.07 });
  });
  def('bm-titan-avalanche', 'bm', S => {
    S.space('hall', 0.5);
    S.rumble({ dur: 4.2, f: 46, peak: 0.55, a: 1.2 });
    S.noise({ bp: 300, bp1: 1400, q: 0.8, dur: 4, a: 1.4, grain: 0.6, pts: [[2.2, 1], [4, 0]], peak: 0.35 });
    [0.8, 1.6, 2.4, 3.2].forEach((at, i) => S.thud({ at, f: 52, f1: 28, dur: 0.7, drive: 2.5, peak: 0.3 + i * 0.07 }));
  });
  def('bm-titan-the-lake-rises', 'bm', S => {
    S.space('hall', 0.6);
    S.rumble({ dur: 4.8, f: 44, peak: 0.5, a: 1.4 });
    S.crackle({ dens: 3.5, f: 4800, dur: 3.8, pts: [[0.4, 0.5], [2.2, 1], [3.8, 0]], peak: 0.2 });
    S.noise({ bp: 240, bp1: 1100, q: 1.1, dur: 4.6, a: 1.8, grain: 0.35, pts: [[2.6, 1], [4.6, 0]], peak: 0.3 });
    [2.4, 3.1, 3.8, 4.5].forEach((at, i) => { S.thud({ at, f: 64, f1: 26, dur: 0.8, drive: 2, peak: 0.42 + i * 0.06 }); S.bell({ at: at + 0.02, f: mf(48 - i * 2), dur: 2.2, peak: 0.09, lp: 3800 }); });
  });
  def('bm-titan-glacial-stomp', 'bm', S => {
    S.thud({ at: 0.3, f: 50, f1: 22, dur: 1.1, drive: 3.4, peak: 0.85 });
    S.rumble({ at: 0.3, dur: 2.0, f: 52, peak: 0.4, a: 0.02 });
    [1.4, 2.8].forEach(at => { S.crackle({ at, dens: 4, f: 5000, dur: 0.8, pts: [[0.02, 1], [0.8, 0]], peak: 0.2 }); S.tone({ at, f: 2400, f1: 900, dur: 0.4, peak: 0.05 }); });
  });
  def('bm-titan-breath-of-winter', 'bm', S => {
    S.noise({ bp: 1400, bp1: 4200, q: 1.0, dur: 2.0, a: 0.3, pts: [[0.4, 0.7], [1.0, 1], [2.0, 0]], peak: 0.32 });
    S.crackle({ at: 0.4, dens: 3, f: 6200, dur: 1.8, pts: [[0.3, 1], [1.8, 0]], peak: 0.16 });
    S.bell({ at: 1.1, f: mf(73), dur: 2.6, peak: 0.1, lp: 6500 });
  });
  def('bm-titan-titans-grip', 'bm', S => {
    S.whoosh({ f: 200, f1: 70, dur: 0.7, peakAt: 0.7, peak: 0.3 });
    S.thud({ at: 0.65, f: 58, f1: 30, dur: 0.6, drive: 2.5, peak: 0.55 });
    S.metal({ at: 0.65, set: 'bar', f: 520, dur: 1.2, peak: 0.12, strike: 0.7 });
    S.crackle({ at: 0.7, dens: 2, f: 3800, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.12 });
  });
  def('bm-titan-endless-winter', 'bm', S => {
    S.space('hall', 0.7);
    S.voice({ f: 42, f1: 34, dur: 3.4, vowel: 'o', vowel1: 'a', breath: 5, peak: 0.4, lp: 2400, pts: [[0.5, 1], [3.4, 0]] });
    S.rumble({ dur: 4.4, f: 46, peak: 0.5, a: 0.5 });
    S.noise({ bp: 800, bp1: 3000, q: 1.0, dur: 3.8, a: 1.2, pts: [[2.6, 1], [3.8, 0]], peak: 0.26 });
    S.bell({ at: 0.2, f: mf(31), dur: 4.4, peak: 0.25, lp: 2200 });
  });

  // ---------------------------------------------------------------------------------------------- Azerath (the Sunken Archmage)
  def('bm-archmage-intro', 'sting', S => {
    S.space('hall', 0.65);
    S.pad({ notes: [mf(45), mf(52), mf(57)], dur: 3.2, det: 9, type: 'saw', lpEnv: [300, 1400, 500, 1.2], vib: [4.5, 0.003], peak: 0.2 });
    [0, 0.5, 1.0, 1.5].forEach((at, i) => S.bell({ at: at + 0.3, f: mf(64 + i * 3), dur: 2.4, peak: 0.12, lp: 5000 }));
    S.rumble({ dur: 3.4, f: 50, peak: 0.35, a: 0.4 });
  });
  def('bm-archmage-arcane-burst', 'bm', S => {
    S.space('hall', 0.5);
    S.bell({ f: mf(57), dur: 2.4, peak: 0.28, lp: 4500 });
    S.thud({ at: 0.35, f: 70, f1: 30, dur: 0.8, drive: 2.5, peak: 0.6 });
    S.noise({ at: 0.35, bp: 1800, bp1: 500, q: 1.4, dur: 1.2, a: 0.1, pts: [[0.05, 1], [1.2, 0]], peak: 0.2 });
    [0.35, 0.55, 0.75].forEach((at, i) => S.bell({ at, f: mf(69 + i * 4), dur: 1.4, peak: 0.1, lp: 6000 }));
  });
  def('bm-archmage-arcane-lance', 'bm', S => {
    S.whoosh({ f: 300, f1: 2400, dur: 0.45, peakAt: 0.9, peak: 0.34 });
    S.tone({ at: 0.4, f: 1800, f1: 600, dur: 0.5, peak: 0.1 });
    S.thud({ at: 0.42, f: 90, f1: 38, dur: 0.6, drive: 2.5, peak: 0.6 });
    S.metal({ at: 0.42, set: 'bar', f: 1500, dur: 1.2, peak: 0.14, strike: 0.6 });
  });
  def('bm-archmage-rune-mark', 'bm', S => {
    S.space('hall', 0.4);
    [0, 0.22].forEach((at, i) => { S.bell({ at, f: mf(72 + i * 7), dur: 1.4, peak: 0.2, lp: 6000 }); S.tone({ at, f: mf(84 + i * 7), dur: 0.5, peak: 0.05 }); });
    S.noise({ at: 0.05, bp: 3600, q: 3, dur: 0.6, a: 0.05, pts: [[0.1, 1], [0.6, 0]], peak: 0.07, grain: 0.5 });
  });
  def('bm-archmage-cinder-rune', 'bm', S => {
    S.bell({ f: mf(64), dur: 1.2, peak: 0.14, lp: 5000 });
    S.noise({ bp: 500, bp1: 2400, q: 1.2, dur: 1.5, a: 0.3, pts: [[0.3, 0.7], [0.8, 1], [1.5, 0]], peak: 0.4 });
    S.crackle({ dens: 2.2, f: 4000, dur: 1.6, pts: [[0.3, 1], [1.6, 0]], peak: 0.26 });
    S.rumble({ dur: 1.6, f: 85, peak: 0.4, a: 0.2 });
    S.thud({ at: 0.9, f: 80, f1: 36, dur: 0.5, drive: 2, peak: 0.4 });
  });
  def('bm-archmage-rime-rune', 'bm', S => {
    S.space('hall', 0.5);
    [0, 0.12, 0.26, 0.4].forEach((at, i) => S.bell({ at, f: mf(81 + i * 2), dur: 1.8, peak: 0.1, lp: 8000 }));
    S.noise({ bp: 4200, q: 2, dur: 1.6, a: 0.6, pts: [[0.8, 0.8], [1.6, 0]], peak: 0.09 });
    S.pad({ notes: [mf(69), mf(76)], dur: 1.8, det: 6, type: 'sine', peak: 0.09 });
  });
  def('bm-archmage-storm-rune', 'bm', S => {
    S.zap({ f: 140, f1: 90, dur: 0.9, jit: 3, bf: 2600, peak: 0.2 });
    S.crack({ at: 0.55, peak: 0.45 }); S.crack({ at: 0.65, peak: 0.3, f: 2200 });
    S.thud({ at: 0.55, f: 80, f1: 34, dur: 0.6, drive: 2, peak: 0.45 });
    S.crackle({ at: 0.55, dens: 3, f: 5200, dur: 1.0, pts: [[0.02, 1], [1.0, 0]], peak: 0.2 });
  });
  def('bm-archmage-rift-rune', 'bm', S => {
    S.space('hall', 0.55);
    S.tone({ f: mf(40), f1: mf(34), dur: 1.8, a: 0.4, peak: 0.2 });
    S.noise({ bp: 300, bp1: 120, q: 2, dur: 1.8, a: 0.6, pts: [[0.8, 0.8], [1.8, 0]], peak: 0.22 });
    S.whoosh({ at: 0.2, f: 1200, f1: 100, dur: 1.2, peakAt: 0.7, peak: 0.2 });
    S.thud({ at: 1.3, f: 50, f1: 24, dur: 0.7, drive: 2, peak: 0.4 });
  });
  def('bm-archmage-pyre-rings', 'bm', S => {
    [0, 0.9].forEach(at => {
      S.noise({ at, bp: 400, bp1: 1800, q: 1.2, dur: 1.0, a: 0.15, pts: [[0.25, 1], [1.0, 0]], peak: 0.22 });
      S.thud({ at: at + 0.15, f: 80, f1: 36, dur: 0.6, drive: 2, peak: 0.45 });
      S.crackle({ at, dens: 2, f: 3600, dur: 1.0, pts: [[0.1, 1], [1.0, 0]], peak: 0.16 });
    });
    S.rumble({ dur: 2.2, f: 70, peak: 0.25, a: 0.2 });
  });
  def('bm-archmage-ice-lances', 'bm', S => {
    [0, 0.14, 0.28].forEach((at, i) => { S.whoosh({ at, f: 600, f1: 3200, dur: 0.3, peakAt: 0.8, peak: 0.2 }); S.bell({ at: at + 0.25, f: mf(88 + i * 2), dur: 1.2, peak: 0.09, lp: 9000 }); });
    S.crackle({ at: 0.3, dens: 3, f: 6000, dur: 0.8, pts: [[0.02, 1], [0.8, 0]], peak: 0.15 });
  });
  def('bm-archmage-leaping-bolt', 'bm', S => {
    [0, 0.2, 0.4, 0.6].forEach((at, i) => { S.crack({ at, peak: 0.55 - i * 0.05, f: 1400 + i * 300 }); S.zap({ at, f: 160 + i * 40, dur: 0.18, jit: 3, peak: 0.2 }); S.thud({ at, f: 100 - i * 8, f1: 40, dur: 0.3, drive: 2, peak: 0.45 }); });
    S.crackle({ dens: 3, f: 5000, dur: 1.0, pts: [[0.05, 1], [1.0, 0]], peak: 0.2 });
    S.rumble({ dur: 1.2, f: 90, peak: 0.3, a: 0.1 });
  });
  def('bm-archmage-void-rifts', 'bm', S => {
    S.space('hall', 0.5);
    S.whoosh({ f: 900, f1: 80, dur: 1.0, peakAt: 0.6, peak: 0.3 });
    S.tone({ at: 0.2, f: mf(36), f1: mf(31), dur: 1.4, a: 0.3, peak: 0.2 });
    S.thud({ at: 0.9, f: 56, f1: 22, dur: 0.9, drive: 2.5, peak: 0.55 });
    S.noise({ at: 0.9, bp: 250, q: 1.5, dur: 1.2, a: 0.05, pts: [[0.1, 1], [1.2, 0]], peak: 0.2 });
  });
  def('bm-archmage-the-binding', 'bm', S => {
    S.space('hall', 0.6);
    S.pad({ notes: [mf(45), mf(52), mf(59)], dur: 3, det: 8, type: 'saw', lpEnv: [300, 1200, 500, 1.4], peak: 0.17 });
    [0, 0.7, 1.4, 2.1].forEach((at, i) => S.bell({ at: at + 0.2, f: mf(60 + i * 5), dur: 2.2, peak: 0.14, lp: 5000 }));
  });
  def('bm-archmage-call-of-the-circle', 'bm', S => {
    S.space('hall', 0.5);
    S.bell({ f: mf(55), dur: 2.0, peak: 0.22, lp: 4000 });
    S.whoosh({ at: 0.1, f: 100, f1: 700, dur: 0.9, peakAt: 0.7, peak: 0.25 });
    S.noise({ at: 0.5, bp: 800, q: 1.2, dur: 0.9, a: 0.1, pts: [[0.1, 1], [0.9, 0]], peak: 0.14 });
    S.voice({ at: 0.3, f: 120, f1: 160, dur: 0.9, vowel: 'o', breath: 4, peak: 0.12, lp: 2500, pts: [[0.2, 1], [0.9, 0]] });
  });
  def('bm-archmage-convergence', 'bm', S => {
    S.space('hall', 0.65);
    S.pad({ notes: [mf(45), mf(52), mf(57), mf(64)], dur: 4.4, det: 10, type: 'saw', lpEnv: [250, 2200, 600, 3.2], peak: 0.18 });
    [0, 1.1, 2.2, 3.3].forEach((at, i) => { S.bell({ at, f: mf(57 + i * 3), dur: 2.4, peak: 0.16, lp: 6000 }); S.thud({ at: at + 0.05, f: 70 - i * 6, f1: 30, dur: 0.5, drive: 2, peak: 0.3 }); });
    S.rumble({ at: 3.4, dur: 2.0, f: 60, peak: 0.45, a: 0.3 });
  });
  // Sigil Flare: two sigils kindle in turn, a bell for each, and the floor between them cracks as they meet
  def('bm-archmage-sigil-flare', 'bm', S => {
    S.space('hall', 0.55);
    S.pad({ notes: [mf(52), mf(59)], dur: 2.6, det: 8, type: 'saw', lpEnv: [300, 1800, 500, 2.2], peak: 0.15 });
    [0, 0.9].forEach((at, i) => { S.bell({ at, f: mf(64 + i * 5), dur: 2.0, peak: 0.18, lp: 5500 }); S.thud({ at: at + 0.05, f: 76 - i * 8, f1: 32, dur: 0.5, drive: 2, peak: 0.32 }); });
    S.crack({ at: 1.8, peak: 0.3, f: 1800 });
    S.rumble({ at: 1.8, dur: 1.0, f: 70, peak: 0.3, a: 0.2 });
  });
  def('bm-archmage-counterspell', 'bm', S => {
    S.space('hall', 0.5);
    S.bell({ f: mf(69), dur: 1.4, peak: 0.2, lp: 5000 });
    S.whoosh({ at: 0.3, f: 1600, f1: 120, dur: 0.9, peakAt: 0.4, peak: 0.28 });
    S.bell({ at: 1.2, f: mf(60), dur: 1.8, peak: 0.16, lp: 3500 });
    S.thud({ at: 1.2, f: 60, f1: 28, dur: 0.6, drive: 2, peak: 0.4 });
  });
  def('bm-archmage-rune-swap', 'bm', S => {
    S.space('hall', 0.4);
    S.bell({ f: mf(72), dur: 1.0, peak: 0.18, lp: 6000 });
    S.whoosh({ at: 0.2, f: 400, f1: 2000, dur: 0.5, peakAt: 0.5, peak: 0.3 });
    S.bell({ at: 0.55, f: mf(79), dur: 1.2, peak: 0.2, lp: 6000 });
    S.thud({ at: 0.5, f: 90, f1: 40, dur: 0.4, drive: 2, peak: 0.35 });
  });
  def('bm-archmage-arcane-mark', 'bm', S => {
    S.space('hall', 0.45);
    S.bell({ f: mf(60), dur: 2.2, peak: 0.22, lp: 4200 });
    S.noise({ bp: 900, bp1: 2400, q: 1.4, dur: 1.4, a: 0.6, pts: [[0.7, 0.8], [1.4, 0]], peak: 0.14 });
    S.thud({ at: 1.2, f: 74, f1: 32, dur: 0.6, drive: 2, peak: 0.4 });
  });
  def('bm-archmage-the-tide-rises', 'bm', S => {
    S.space('hall', 0.7);
    S.noise({ color: 'brown', bp: 200, bp1: 900, q: 0.9, dur: 4.5, a: 1.5, pts: [[3, 1], [4.5, 0]], peak: 0.35 });
    S.rumble({ dur: 5, f: 48, peak: 0.5, a: 0.8 });
    S.pad({ notes: [mf(40), mf(47), mf(52)], dur: 4.4, det: 12, type: 'saw', lpEnv: [200, 1600, 400, 3], peak: 0.2 });
    [3.0, 3.4, 3.8].forEach(at => S.bell({ at, f: mf(48), dur: 3, peak: 0.2, lp: 2500 }));
  });

  // ---------------------------------------------------------------------------------------------- Corvane (the Unburied Blade)
  // steel on a cold night: a slow scrape of a blade leaving the scabbard, ice cracking, wind, one bell-like ring as the edge fills,
  // the long hiss of a dash across snow. No voice.
  def('bm-corvane-intro', 'sting', S => {
    S.space('hall', 0.6);
    S.noise({ color: 'pink', bp: 500, bp1: 1500, q: 0.8, dur: 3.2, a: 1.2, pts: [[1.4, 0.7], [3.2, 0]], peak: 0.2 });
    S.scrape({ at: 0.9, f: 3400, q: 2.2, dur: 1.5, rate: 26, peak: 0.16, pts: [[0.5, 1], [1.5, 0]] });
    S.metal({ at: 2.4, set: 'bar', f: 1480, dur: 3.0, peak: 0.16, strike: 0.4 });
    S.bell({ at: 2.45, f: mf(88), dur: 3.2, peak: 0.06, lp: 8000 });
    S.rumble({ dur: 3.2, f: 44, peak: 0.25, a: 0.6 });
  });
  def('bm-corvane-white-gale', 'bm', S => {
    S.space('hall', 0.5);
    S.noise({ bp: 500, bp1: 2600, q: 1.1, dur: 2.0, a: 0.5, pts: [[0.8, 0.8], [1.2, 1], [2.0, 0]], peak: 0.32 });
    S.crackle({ at: 0.5, dens: 3, f: 6000, dur: 1.6, pts: [[0.2, 1], [1.6, 0]], peak: 0.12 });
    S.tone({ f: 1200, f1: 760, dur: 1.8, a: 0.4, peak: 0.04 });
    S.rumble({ dur: 2.0, f: 52, peak: 0.28, a: 0.3 });
  });
  def('bm-corvane-sundering-cut', 'bm', S => {
    S.scrape({ f: 3000, q: 2, dur: 0.35, rate: 30, peak: 0.12, pts: [[0.05, 1], [0.35, 0]] });
    S.whoosh({ at: 0.3, f: 300, f1: 2400, dur: 0.35, peakAt: 0.85, peak: 0.34 });
    S.metal({ at: 0.62, set: 'plate', f: 480, dur: 0.9, peak: 0.28, strike: 0.7 });
    S.thud({ at: 0.62, f: 66, f1: 28, dur: 0.8, drive: 3, peak: 0.7 });
    S.glass({ at: 0.64, f: 2700, dur: 0.8, peak: 0.08 });
  });
  def('bm-corvane-cracked-guard', 'bm', S => {
    S.glass({ f: 2300, dur: 0.5, peak: 0.1 });
    S.crackle({ at: 0.05, dens: 5, f: 4800, dur: 0.7, pts: [[0.02, 1], [0.7, 0]], peak: 0.24 });
    S.whoosh({ at: 0.45, f: 260, f1: 2000, dur: 0.3, peakAt: 0.85, peak: 0.28 });
    S.metal({ at: 0.74, set: 'plate', f: 380, dur: 1.1, peak: 0.34, strike: 0.8 });
    S.thud({ at: 0.74, f: 56, f1: 24, dur: 1.0, drive: 3.5, peak: 0.8 });
    S.crack({ at: 0.74, peak: 0.3, dur: 0.2 });
    S.glass({ at: 0.78, f: 1700, dur: 1.0, peak: 0.12 });
  });
  def('bm-corvane-draw-cut', 'bm', S => {
    S.scrape({ f: 3800, q: 2.4, dur: 0.4, rate: 22, peak: 0.16, pts: [[0.05, 0.7], [0.3, 1], [0.4, 0]] });
    S.metal({ at: 0.38, set: 'bar', f: 2900, dur: 0.5, peak: 0.12 });
    S.whoosh({ at: 0.45, f: 700, f1: 4200, dur: 0.35, peakAt: 0.9, peak: 0.3 });
    S.noise({ at: 0.55, bp: 6000, q: 1.4, dur: 0.18, a: 0.002, pts: [[0.01, 1], [0.18, 0]], peak: 0.14 });
  });
  def('bm-corvane-scabbard-sweep', 'bm', S => {
    S.wood({ f: 190, dur: 0.14, peak: 0.28 });
    S.whoosh({ at: 0.1, f: 120, f1: 640, dur: 0.75, peakAt: 0.72, peak: 0.42 });
    S.noise({ at: 0.15, bp: 500, bp1: 900, q: 1.4, dur: 0.6, a: 0.2, pts: [[0.3, 1], [0.6, 0]], peak: 0.12 });
    S.thud({ at: 0.82, f: 80, f1: 38, dur: 0.5, drive: 2.5, peak: 0.45 });
    S.wood({ at: 0.82, f: 150, dur: 0.12, peak: 0.2 });
  });
  def('bm-corvane-still-water', 'bm', S => {
    S.space('hall', 0.55);
    S.glass({ f: mf(88), dur: 2.4, peak: 0.12 });
    S.glass({ at: 0.12, f: mf(95), dur: 2.0, peak: 0.08 });
    S.partials({ at: 0.04, set: 'glass', f: mf(76), dur: 2.8, peak: 0.1, am: [3, 0.3] });
    S.noise({ bp: 4200, q: 4, dur: 2.2, a: 1.0, pts: [[1.2, 0.6], [2.2, 0]], peak: 0.05 });
    S.crackle({ at: 1.1, dens: 1, f: 6400, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.07 });
  });
  def('bm-corvane-hollow-breath', 'bm', S => {
    S.space('hall', 0.5);
    S.noise({ bp: 900, bp1: 350, q: 1.5, dur: 1.4, a: 0.5, pts: [[0.6, 1], [1.4, 0]], peak: 0.26 });
    S.tone({ f: 640, f1: 420, dur: 1.2, a: 0.3, peak: 0.05 });
    S.glass({ at: 0.7, f: 1580, dur: 1.0, peak: 0.09 });
    S.crackle({ at: 0.8, dens: 2, f: 5500, dur: 0.7, pts: [[0.05, 1], [0.7, 0]], peak: 0.1 });
  });
  def('bm-corvane-cold-sheathe', 'bm', S => {
    S.space('hall', 0.45);
    S.scrape({ f: 2800, q: 2, dur: 0.9, rate: 20, peak: 0.14, pts: [[0.1, 0.4], [0.8, 1], [0.9, 0]] });
    S.metal({ at: 0.92, set: 'plate', f: 540, dur: 0.7, peak: 0.26, strike: 0.7 });
    S.thud({ at: 0.92, f: 58, f1: 26, dur: 1.0, drive: 3, peak: 0.7 });
    S.bell({ at: 0.95, f: mf(84), dur: 2.8, peak: 0.1, lp: 7000 });
    S.noise({ at: 1.0, bp: 3000, q: 2, dur: 1.0, a: 0.1, pts: [[0.05, 1], [1.0, 0]], peak: 0.07 });
  });
  def('bm-corvane-rising-crane', 'bm', S => {
    S.space('hall', 0.4);
    S.scrape({ f: 3300, q: 2, dur: 0.6, rate: 24, peak: 0.12, pts: [[0.1, 0.5], [0.6, 1], [0.7, 0]] });
    S.whoosh({ at: 0.4, f: 200, f1: 1600, dur: 0.6, peakAt: 0.85, peak: 0.4 });
    S.metal({ at: 0.98, set: 'bar', f: 1700, dur: 2.0, peak: 0.12, strike: 0.5 });
    S.whoosh({ at: 1.4, f: 240, f1: 2000, dur: 0.5, peakAt: 0.85, peak: 0.36 });
    S.metal({ at: 1.88, set: 'bar', f: 2000, dur: 1.8, peak: 0.1, strike: 0.5 });
    S.glass({ at: 1.9, f: 2900, dur: 0.7, peak: 0.06 });
  });
  def('bm-corvane-comet-draw', 'bm', S => {
    S.space('hall', 0.45);
    S.bell({ f: mf(81), dur: 1.8, peak: 0.12, lp: 8000 });
    S.noise({ at: 0.1, bp: 2500, bp1: 5000, q: 2.4, dur: 0.6, a: 0.5, pts: [[0.5, 1], [0.6, 0]], peak: 0.1 });
    S.whoosh({ at: 0.65, f: 400, f1: 5200, dur: 0.9, peakAt: 0.2, peak: 0.42 });
    S.noise({ at: 0.65, bp: 3000, bp1: 1200, q: 0.9, dur: 1.3, a: 0.02, pts: [[0.05, 1], [1.3, 0]], peak: 0.22 });
    S.thud({ at: 1.4, f: 70, f1: 30, dur: 0.7, drive: 2.5, peak: 0.45 });
  });
  def('bm-corvane-comet-volley', 'bm', S => {
    S.space('hall', 0.45);
    S.bell({ f: mf(81), dur: 1.4, peak: 0.1, lp: 8000 });
    [0.35, 1.3, 2.25].forEach((at, i) => {
      S.whoosh({ at, f: 400 + i * 120, f1: 5400, dur: 0.8, peakAt: 0.2, peak: 0.36 });
      S.noise({ at, bp: 3000, bp1: 1200, q: 0.9, dur: 1.0, a: 0.02, pts: [[0.05, 1], [1.0, 0]], peak: 0.17 });
      S.thud({ at: at + 0.7, f: 70, f1: 30, dur: 0.5, drive: 2.5, peak: 0.34 });
      S.bell({ at: at + 0.7, f: mf(86 + i * 3), dur: 1.2, peak: 0.07, lp: 8000 });
    });
  });
  def('bm-corvane-hundredfold-parting', 'bm', S => {
    S.space('hall', 0.55);
    S.bell({ f: mf(79), dur: 2.2, peak: 0.12, lp: 8000 });
    [0.35, 0.8, 1.2, 1.55, 1.85, 2.1].forEach((at, i) => {
      S.noise({ at, bp: 2400 + i * 500, bp1: 700, q: 1.3, dur: 0.22, a: 0.004, pts: [[0.01, 1], [0.22, 0]], peak: 0.2 });
      S.glass({ at: at + 0.03, f: 2200 + i * 380, dur: 0.6, peak: 0.07 });
    });
    S.whoosh({ at: 2.3, f: 300, f1: 3600, dur: 0.45, peakAt: 0.85, peak: 0.36 });
    S.metal({ at: 2.75, set: 'bar', f: 1900, dur: 2.4, peak: 0.14, strike: 0.6 });
    S.thud({ at: 2.75, f: 62, f1: 28, dur: 0.8, drive: 2.8, peak: 0.5 });
  });
  def('bm-corvane-false-stance', 'bm', S => {
    S.space('hall', 0.4);
    S.metal({ f: 1500, dur: 1.4, peak: 0.1, strike: 0.5 });
    S.scrape({ at: 0.35, f: 3000, q: 2, dur: 0.3, rate: 36, peak: 0.12, pts: [[0.03, 1], [0.3, 0]] });
    S.metal({ at: 0.7, set: 'bar', f: 1780, dur: 1.6, peak: 0.11, strike: 0.5 });
    S.glass({ at: 0.72, f: 2500, dur: 0.6, peak: 0.07 });
    S.tone({ at: 0.35, f: 1800, f1: 700, dur: 0.5, peak: 0.035 });
  });
  def('bm-corvane-whetted-edge', 'bm', S => {
    S.space('hall', 0.5);
    S.noise({ bp: 700, bp1: 2400, q: 1.0, dur: 2.0, a: 0.7, pts: [[1.2, 0.8], [2.0, 0]], peak: 0.14 });
    S.scrape({ f: 3600, q: 2.2, dur: 1.2, rate: 18, peak: 0.07, pts: [[0.8, 1], [1.2, 0]] });
    [0, 0.45, 0.85, 1.2].forEach((at, i) => S.glass({ at: at + 0.1, f: mf(81 + i * 3), dur: 1.0, peak: 0.05 + i * 0.012 }));
    S.metal({ at: 1.25, set: 'bar', f: 1760, dur: 1.8, peak: 0.16, strike: 0.4 });
    S.bell({ at: 1.3, f: mf(93), dur: 2.0, peak: 0.07, lp: 8000 });
  });
  def('bm-corvane-overwhet', 'bm', S => {
    S.space('hall', 0.5);
    S.noise({ bp: 900, bp1: 3200, q: 1.2, dur: 1.9, a: 0.6, pts: [[1.1, 0.9], [1.9, 0]], peak: 0.15 });
    S.scrape({ f: 4200, q: 2.6, dur: 1.4, rate: 30, peak: 0.1, pts: [[1.0, 1], [1.4, 0]] });
    [0, 0.35, 0.65, 0.9, 1.1].forEach((at, i) => S.glass({ at: at + 0.05, f: mf(84 + i * 3), dur: 0.7, peak: 0.05 + i * 0.012, am: [9, 0.4] }));
    S.metal({ at: 1.2, set: 'bar', f: 2100, dur: 1.4, peak: 0.14, strike: 0.5, spread: 40 });
    S.tone({ at: 1.2, f: 3300, f1: 2600, dur: 0.8, peak: 0.035 });
    S.crack({ at: 1.55, peak: 0.28, dur: 0.2 });
    S.crackle({ at: 1.55, dens: 4, f: 5600, dur: 0.7, pts: [[0.02, 1], [0.7, 0]], peak: 0.16 });
    S.glass({ at: 1.58, f: 1900, dur: 1.0, peak: 0.1 });
  });
  def('bm-corvane-returning-parting', 'bm', S => {
    S.space('hall', 0.55);
    S.bell({ f: mf(72), dur: 2.2, peak: 0.12, lp: 6000 });
    [0.3, 0.65, 0.95, 1.2, 1.45, 1.7].forEach((at, i) => {
      S.noise({ at, bp: 5200 - i * 500, bp1: 600, q: 1.3, dur: 0.22, a: 0.004, pts: [[0.01, 1], [0.22, 0]], peak: 0.2 });
      S.glass({ at: at + 0.03, f: 3700 - i * 330, dur: 0.6, peak: 0.07 });
    });
    S.whoosh({ at: 1.9, f: 3200, f1: 260, dur: 0.5, peakAt: 0.15, peak: 0.36 });
    S.metal({ at: 2.3, set: 'bar', f: 1450, dur: 2.4, peak: 0.14, strike: 0.6 });
    S.thud({ at: 2.3, f: 58, f1: 26, dur: 0.8, drive: 2.8, peak: 0.5 });
    S.crackle({ at: 2.3, dens: 2, f: 5000, dur: 0.8, pts: [[0.02, 1], [0.8, 0]], peak: 0.1 });
  });
  def('bm-corvane-the-vigil', 'bm', S => {
    S.space('hall', 0.7);
    S.bell({ f: mf(45), dur: 4.6, peak: 0.26, lp: 2600 });
    S.bell({ at: 0.9, f: mf(52), dur: 3.8, peak: 0.1, lp: 3200 });
    S.thud({ at: 0.15, f: 56, f1: 30, dur: 0.6, drive: 2, peak: 0.38 });
    S.noise({ color: 'pink', bp: 400, bp1: 1100, q: 0.9, dur: 3.6, a: 1.2, pts: [[1.6, 0.7], [3.6, 0]], peak: 0.15 });
    S.glass({ at: 1.8, f: mf(88), dur: 2.0, peak: 0.05 });
  });
  def('bm-corvane-the-last-vigil', 'bm', S => {
    S.space('hall', 0.7);
    S.bell({ f: mf(43), dur: 5.0, peak: 0.28, lp: 2600 });
    S.thud({ at: 0.15, f: 54, f1: 28, dur: 0.7, drive: 2.2, peak: 0.4 });
    S.noise({ color: 'pink', bp: 350, bp1: 1300, q: 0.9, dur: 3.2, a: 1.0, pts: [[1.4, 0.7], [3.2, 0]], peak: 0.14 });
    [1.2, 1.75, 2.3].forEach((at, i) => {   // the three edges, once each, rising
      S.metal({ at, set: 'bar', f: 1480 + i * 300, dur: 1.8, peak: 0.12 + i * 0.02, strike: 0.5 });
      S.glass({ at: at + 0.03, f: mf(84 + i * 4), dur: 0.9, peak: 0.05 });
    });
    S.whoosh({ at: 2.2, f: 200, f1: 3000, dur: 0.5, peakAt: 0.85, peak: 0.3 });
  });
  def('bm-corvane-last-light-of-the-pass', 'bm', S => {
    S.space('hall', 0.7);
    S.bell({ f: mf(40), dur: 5.4, peak: 0.34, lp: 2400 });
    S.noise({ bp: 400, bp1: 3600, q: 0.9, dur: 4.2, a: 1.6, pts: [[2.8, 1], [4.2, 0]], peak: 0.32 });
    S.rumble({ dur: 4.4, f: 46, peak: 0.45, a: 1.0 });
    S.scrape({ at: 1.6, f: 3600, q: 2.2, dur: 1.6, rate: 22, peak: 0.12, pts: [[1.0, 1], [1.6, 0]] });
    S.metal({ at: 3.3, set: 'bar', f: 1480, dur: 3.0, peak: 0.2, strike: 0.5 });
    S.whoosh({ at: 3.2, f: 200, f1: 3400, dur: 0.6, peakAt: 0.9, peak: 0.34 });
    S.thud({ at: 3.85, f: 52, f1: 24, dur: 1.2, drive: 3.4, peak: 0.8 });
    S.crackle({ at: 3.85, dens: 4, f: 5600, dur: 1.2, pts: [[0.02, 1], [1.2, 0]], peak: 0.22 });
  });

  // ---------------------------------------------------------------------------------------------- Brannoc (the Undefeated)
  // bronze ringing off stone: the shield's whirr and a bright clang at every bounce, a ghost crowd's roar, wet sand and water;
  // after the Tide Rises the deep sea: heavy surf, groaning metal, a huge slow bell. Laughs and roars are vowel textures only.
  const brWhirr = (S, at, dur, f, f1, pan, pk) => {
    S.noise({ at, bp: f, bp1: f1, q: 3, dur, a: 0.05, am: [34, 0.7, 'square'], grain: 0.3, pts: [[dur * 0.5, 1], [dur, 0.7]], peak: pk, pan });
    S.tone({ at, type: 'saw', f: f * 0.18, f1: f1 * 0.14, dur, a: 0.05, lp: 1400, peak: pk * 0.2, am: [28, 0.6], pan });
  };
  const brClang = (S, at, f, pk, pan) => {
    S.metal({ at, set: 'plate', f, dur: 0.9, peak: pk, strike: 0.8, pan });
    S.metal({ at: at + 0.01, set: 'bar', f: f * 3.1, dur: 0.5, peak: pk * 0.35, click: 0, pan });
  };
  const brLaugh = (S, at, pk, f, n) => {
    for (let i = 0; i < (n || 4); i++) S.voice({ at: at + i * 0.17, f: (f || 105) * (1 - i * 0.03), f1: (f || 105) * (0.84 - i * 0.03), dur: 0.14, vowel: 'a', vowel1: 'o', breath: 0.7, lp: 1700, peak: pk * (1 - i * 0.1) });
  };
  const brCrowd = (S, at, dur, pk) => {
    S.noise({ at, color: 'pink', bp: 350, bp1: 1400, q: 0.7, dur, a: dur * 0.4, pts: [[dur * 0.6, 1], [dur, 0]], peak: pk });
    [0, 1, 2, 3].forEach(i => S.voice({ at: at + i * 0.07, f: 98 + i * 17, f1: 118 + i * 14, dur: dur * 0.9, vowel: i % 2 ? 'o' : 'a', vowel1: 'u', breath: 1.4, lp: 1600, peak: pk * 0.3, a: dur * 0.35, pan: (i - 1.5) * 0.5 }));
  };
  def('bm-brannoc-intro', 'sting', S => {
    S.space('hall', 0.6);
    brCrowd(S, 0, 2.6, 0.2);
    S.drum({ at: 1.2, f: 72, dur: 0.8, peak: 0.5 });
    brClang(S, 1.4, 520, 0.24);
    brClang(S, 1.62, 700, 0.2);
    brLaugh(S, 2.0, 0.3, 100, 4);
    S.metal({ at: 2.7, set: 'plate', f: 440, dur: 1.6, peak: 0.2, strike: 0.5 });
    S.rumble({ dur: 3.2, f: 44, peak: 0.2, a: 0.6 });
  });
  def('bm-brannoc-sunwheel', 'bm', S => {
    S.space('hall', 0.4);
    S.metal({ f: 620, dur: 0.4, peak: 0.16, strike: 0.9 });
    S.whoosh({ at: 0.05, f: 200, f1: 1600, dur: 0.4, peakAt: 0.9, peak: 0.3 });
    brWhirr(S, 0.35, 1.5, 1800, 3200, 0, 0.36);
    [0.75, 1.3, 1.8].forEach((at, i) => brClang(S, at, 900 + i * 110, 0.3 - i * 0.04));
    S.glass({ at: 0.78, f: 3300, dur: 0.6, peak: 0.06 });
  });
  def('bm-brannoc-twin-wheels', 'bm', S => {
    S.space('hall', 0.4);
    S.whoosh({ f: 200, f1: 1800, dur: 0.4, peakAt: 0.9, peak: 0.3 });
    brWhirr(S, 0.3, 1.5, 1500, 2800, -0.7, 0.3);
    brWhirr(S, 0.5, 1.5, 2100, 3600, 0.7, 0.3);
    [[0.75, 820, -0.7], [1.0, 1060, 0.7], [1.35, 880, -0.7], [1.6, 1130, 0.7], [1.95, 940, -0.5], [2.1, 1200, 0.5]].forEach(([at, f, p], i) => brClang(S, at, f, 0.28 - i * 0.02, p));
  });
  def('bm-brannoc-riposte', 'bm', S => {
    S.space('hall', 0.35);
    brClang(S, 0, 760, 0.3);
    S.scrape({ at: 0.04, f: 3600, q: 2.4, dur: 0.25, rate: 40, peak: 0.1, pts: [[0.03, 1], [0.25, 0]] });
    S.whoosh({ at: 0.32, f: 3400, f1: 300, dur: 0.22, peakAt: 0.2, peak: 0.34 });
    brWhirr(S, 0.5, 0.9, 2600, 3400, 0, 0.14);
    brClang(S, 0.62, 1180, 0.26);
    S.glass({ at: 0.64, f: 3000, dur: 0.5, peak: 0.07 });
  });
  def('bm-brannoc-victory-leap', 'bm', S => {
    S.space('hall', 0.5);
    S.voice({ f: 110, f1: 190, dur: 0.35, vowel: 'o', vowel1: 'a', breath: 0.8, lp: 1800, peak: 0.28 });
    S.thud({ at: 0.05, f: 90, f1: 50, dur: 0.18, peak: 0.35 });
    S.whoosh({ at: 0.15, f: 200, f1: 2200, dur: 0.7, peakAt: 0.9, peak: 0.32 });
    brCrowd(S, 0.5, 1.4, 0.16);
    S.whoosh({ at: 1.1, f: 2400, f1: 160, dur: 0.6, peakAt: 0.2, peak: 0.34 });
    S.thud({ at: 1.75, f: 62, f1: 26, dur: 1.1, drive: 3.2, peak: 0.85 });
    S.noise({ at: 1.75, color: 'pink', bp: 900, bp1: 300, q: 0.8, dur: 1.0, a: 0.01, pts: [[0.05, 1], [1.0, 0]], peak: 0.26 });
    S.splat({ at: 1.78, dur: 0.4, peak: 0.28 });
    brClang(S, 1.77, 420, 0.18);
    brLaugh(S, 2.25, 0.2, 100, 3);
  });
  def('bm-brannoc-hammer-heel', 'bm', S => {
    S.space('room', 0.3);
    S.whoosh({ f: 120, f1: 800, dur: 0.4, peakAt: 0.85, peak: 0.36 });
    S.thud({ at: 0.42, f: 74, f1: 34, dur: 0.6, drive: 2.6, peak: 0.6 });
    S.noise({ at: 0.42, color: 'pink', bp: 800, bp1: 300, q: 0.9, dur: 0.4, a: 0.004, pts: [[0.03, 1], [0.4, 0]], peak: 0.2 });
    S.whoosh({ at: 0.7, f: 100, f1: 600, dur: 0.35, peakAt: 0.85, peak: 0.34 });
    S.thud({ at: 1.04, f: 58, f1: 24, dur: 1.1, drive: 3.4, peak: 0.9 });
    S.metal({ at: 1.04, set: 'plate', f: 360, dur: 1.2, peak: 0.28, strike: 0.8 });
    S.splat({ at: 1.06, dur: 0.5, peak: 0.3 });
    S.crack({ at: 1.04, peak: 0.3, dur: 0.2 });
  });
  def('bm-brannoc-roar-of-the-stands', 'bm', S => {
    S.space('hall', 0.75);
    brCrowd(S, 0, 2.6, 0.4);
    [0, 1, 2, 3, 4].forEach(i => S.voice({ at: 0.15 + i * 0.05, f: 130 + i * 31, f1: 210 + i * 25, dur: 2.0, vowel: 'a', vowel1: 'o', breath: 1.8, lp: 2400, peak: 0.1, a: 0.8, pan: (i - 2) * 0.4 }));
    [0.9, 1.3, 1.7, 2.1].forEach((at, i) => { S.drum({ at, f: 68, dur: 0.5, peak: 0.45 }); S.wood({ at: at + 0.02, f: 1200 + i * 90, dur: 0.05, peak: 0.12 }); });
    S.rumble({ dur: 2.8, f: 50, peak: 0.4, a: 0.5 });
    S.noise({ at: 0.6, bp: 1800, bp1: 3500, q: 0.8, dur: 2.0, a: 0.8, pts: [[1.0, 1], [2.0, 0]], peak: 0.12 });
    S.thud({ at: 2.3, f: 60, f1: 26, dur: 0.9, drive: 3, peak: 0.7 });
  });
  def('bm-brannoc-sand-furrow', 'bm', S => {
    S.space('room', 0.35);
    S.metal({ f: 880, dur: 0.6, peak: 0.16, strike: 0.9 });
    S.thud({ at: 0.03, f: 70, f1: 36, dur: 0.4, drive: 2, peak: 0.5 });
    S.noise({ at: 0.1, color: 'pink', bp: 500, bp1: 1900, q: 0.9, dur: 1.3, a: 0.12, pts: [[0.4, 1], [1.3, 0]], peak: 0.3 });
    S.scrape({ at: 0.1, f: 1100, q: 1.2, dur: 1.2, rate: 17, peak: 0.12, pts: [[0.3, 1], [1.2, 0]] });
    S.rumble({ at: 0.1, dur: 1.4, f: 46, peak: 0.35, a: 0.2 });
    S.whoosh({ at: 0.4, color: 'brown', f: 90, f1: 500, dur: 0.9, peakAt: 0.35, peak: 0.24 });
    S.noise({ at: 1.2, bp: 3800, q: 1, dur: 0.7, a: 0.05, grain: 0.7, pts: [[0.1, 1], [0.7, 0]], peak: 0.1 });
    S.bubbles({ at: 1.0, n: 4, f: 300, f1: 900, spread: 0.4, size: 0.035, peak: 0.08 });
  });
  def('bm-brannoc-the-tide-rises', 'bm', S => {
    S.space('hall', 0.75);
    S.noise({ color: 'brown', bp: 150, bp1: 1100, q: 0.8, dur: 5.2, a: 2.2, pts: [[3.6, 1], [5.2, 0]], peak: 0.42 });
    S.noise({ color: 'pink', hp: 2600, lp: 9000, grain: 0.8, grainRate: 1.2, dur: 4.6, a: 2.0, pts: [[3.2, 1], [4.6, 0]], peak: 0.12 });
    S.rumble({ dur: 5.4, f: 42, peak: 0.55, a: 1.0 });
    [0.5, 1.4, 2.5, 3.5].forEach((at, i) => { S.crack({ at, peak: 0.34, dur: 0.22 }); S.metal({ at, set: 'stone', f: 140 - i * 12, dur: 1.2, peak: 0.24, strike: 0.9 }); S.thud({ at, f: 60, f1: 28, dur: 0.7, drive: 3, peak: 0.55 }); });
    S.creak({ at: 0.8, dur: 3.0, f: 20, f1: 10, res: [400, 850, 1500], q: 11, peak: 0.18 });
    S.bubbles({ at: 1.5, n: 18, f: 200, f1: 1100, spread: 3, bias: 0.8, peak: 0.12 });
    S.bell({ at: 3.8, f: mf(38), dur: 3.6, peak: 0.16, lp: 1800 });
    S.whoosh({ at: 3.3, color: 'brown', f: 100, f1: 1400, dur: 1.2, peakAt: 0.85, peak: 0.4 });
  });
  def('bm-brannoc-fist-slam', 'bm', S => {
    S.space('hall', 0.6);
    S.whoosh({ color: 'brown', f: 70, f1: 500, dur: 0.7, peakAt: 0.9, peak: 0.4 });
    S.creak({ dur: 0.7, f: 20, f1: 10, res: [450, 950], q: 12, peak: 0.16 });
    S.thud({ at: 0.75, f: 48, f1: 20, dur: 1.5, drive: 4, peak: 1 });
    S.metal({ at: 0.75, set: 'plate', f: 250, dur: 1.8, peak: 0.34, strike: 0.9 });
    S.crack({ at: 0.75, peak: 0.34, dur: 0.22 });
    S.noise({ at: 0.78, color: 'brown', bp: 1200, bp1: 200, q: 0.8, dur: 1.4, a: 0.01, pts: [[0.05, 1], [1.4, 0]], peak: 0.34 });
    S.splat({ at: 0.8, dur: 0.6, peak: 0.34 });
    S.rumble({ at: 0.75, dur: 1.8, f: 38, peak: 0.4, a: 0.1 });
  });
  def('bm-brannoc-breaker', 'bm', S => {
    S.space('hall', 0.65);
    S.thud({ f: 56, f1: 28, dur: 0.7, drive: 3, peak: 0.6 });
    S.metal({ set: 'plate', f: 270, dur: 1.4, peak: 0.24, strike: 0.9 });
    S.noise({ at: 0.3, color: 'brown', bp: 120, bp1: 1500, q: 0.8, dur: 2.2, a: 1.4, pts: [[1.5, 1], [2.2, 0.8]], peak: 0.42 });
    S.noise({ at: 0.5, color: 'pink', hp: 2400, lp: 9000, grain: 0.8, dur: 2.0, a: 1.2, pts: [[1.5, 1], [2.0, 0]], peak: 0.14 });
    S.whoosh({ at: 1.2, color: 'brown', f: 150, f1: 1800, dur: 0.9, peakAt: 0.8, peak: 0.4 });
    S.thud({ at: 2.2, f: 52, f1: 24, dur: 1.2, drive: 3.2, peak: 0.7 });
    S.splat({ at: 2.2, dur: 0.6, peak: 0.3 });
    S.noise({ at: 2.4, bp: 1800, bp1: 400, q: 0.7, dur: 1.6, a: 0.05, pts: [[0.1, 1], [1.6, 0]], peak: 0.2 });
    S.bubbles({ at: 2.4, n: 12, f: 300, f1: 1400, spread: 1.0, bias: 0.8, peak: 0.1 });
  });
  const brGripOne = (S, at, pan) => {
    S.noise({ at, color: 'brown', bp: 1400, bp1: 200, q: 0.9, dur: 0.7, a: 0.05, pts: [[0.1, 1], [0.7, 0]], peak: 0.28, pan });
    S.bubbles({ at, n: 8, f: 1400, f1: 300, spread: 0.5, size: 0.035, peak: 0.12, pan });
    S.creak({ at: at + 0.35, dur: 0.6, f: 24, f1: 11, res: [380, 800, 1400], q: 11, peak: 0.18, pan });
    S.splat({ at: at + 0.65, dur: 0.4, peak: 0.3, pan });
    S.thud({ at: at + 0.65, f: 66, f1: 30, dur: 0.7, drive: 2.6, peak: 0.55, pan });
    S.metal({ at: at + 0.7, set: 'bar', f: 210, dur: 1.0, peak: 0.12, strike: 0.7, pan });
  };
  def('bm-brannoc-undertow-grip', 'bm', S => {
    S.space('hall', 0.55);
    brGripOne(S, 0, 0);
    S.rumble({ at: 0.6, dur: 1.2, f: 40, peak: 0.3, a: 0.1 });
  });
  def('bm-brannoc-double-grip', 'bm', S => {
    S.space('hall', 0.55);
    brGripOne(S, 0, -0.5);
    brGripOne(S, 0.55, 0.5);
    S.rumble({ at: 1.1, dur: 1.4, f: 38, peak: 0.34, a: 0.1 });
  });
  def('bm-brannoc-sunwheel-unbound', 'bm', S => {
    S.space('hall', 0.65);
    S.rumble({ dur: 3.4, f: 48, peak: 0.34, a: 0.6 });
    S.whoosh({ color: 'brown', f: 90, f1: 1200, dur: 0.8, peakAt: 0.9, peak: 0.34 });
    S.noise({ at: 0.6, bp: 500, bp1: 1300, q: 2.4, dur: 2.2, a: 0.3, am: [18, 0.7, 'square'], grain: 0.3, pts: [[0.8, 1], [2.2, 0.7]], peak: 0.26 });
    S.tone({ at: 0.6, type: 'saw', f: 70, f1: 110, dur: 2.2, a: 0.3, lp: 900, am: [15, 0.6], peak: 0.12 });
    [1.0, 1.6, 2.2, 2.8].forEach((at, i) => {
      S.metal({ at, set: 'plate', f: 300 - i * 14, dur: 1.8, peak: 0.34, strike: 0.9 });
      S.bell({ at, f: mf(48 - i), dur: 1.6, peak: 0.1, lp: 2400 });
      S.thud({ at, f: 56, f1: 26, dur: 0.7, drive: 3, peak: 0.55 });
      S.splat({ at: at + 0.02, dur: 0.3, peak: 0.16 });
    });
    S.glass({ at: 1.04, f: 2900, dur: 0.8, peak: 0.07 });
  });
  def('bm-brannoc-deep-call', 'bm', S => {
    S.space('hall', 0.8);
    S.tone({ f: 46, f1: 62, dur: 2.8, a: 0.9, vib: [3.2, 0.03, 0.5], fm: [2, 1.2, 0.2], lp: 700, pts: [[0.9, 1], [2.8, 0]], peak: 0.4 });
    S.voice({ at: 0.2, f: 52, f1: 66, dur: 2.4, vowel: 'o', vowel1: 'u', breath: 0.5, lp: 900, a: 0.8, peak: 0.16 });
    S.rumble({ dur: 3.4, f: 40, peak: 0.45, a: 0.8 });
    S.bell({ at: 1.3, f: mf(40), dur: 3.0, peak: 0.12, lp: 1600 });
    S.noise({ at: 1.6, color: 'brown', bp: 120, bp1: 1400, q: 0.8, dur: 1.8, a: 0.5, pts: [[0.8, 1], [1.8, 0]], peak: 0.34 });
    S.whoosh({ at: 1.7, color: 'brown', f: 90, f1: 900, dur: 0.9, peakAt: 0.7, peak: 0.34 });
    S.thud({ at: 2.1, f: 54, f1: 24, dur: 1.0, drive: 3, peak: 0.6 });
  });
  def('bm-brannoc-the-final-bell', 'bm', S => {
    S.space('hall', 0.8);
    S.noise({ color: 'brown', bp: 130, bp1: 1800, q: 0.8, dur: 5.8, a: 2.6, pts: [[4.2, 1], [5.8, 0]], peak: 0.42 });
    S.rumble({ dur: 6.0, f: 38, peak: 0.55, a: 1.4 });
    S.creak({ at: 0.6, dur: 3.4, f: 18, f1: 9, res: [350, 760, 1300], q: 12, peak: 0.2 });
    [0, 1.9, 3.4, 4.5].forEach((at, i) => { S.bell({ at, f: mf(33), dur: 4.6, peak: 0.28 + i * 0.03, lp: 1500 }); S.thud({ at, f: 44, f1: 24, dur: 0.9, drive: 3, peak: 0.55 }); S.metal({ at, set: 'plate', f: 170, dur: 1.4, peak: 0.12, strike: 0.9 }); });
    S.bubbles({ at: 1.0, n: 16, f: 150, f1: 800, spread: 3.5, bias: 0.8, peak: 0.1 });
    S.whoosh({ at: 4.2, color: 'brown', f: 90, f1: 1900, dur: 1.2, peakAt: 0.9, peak: 0.42 });
    S.noise({ at: 5.0, color: 'pink', hp: 2400, lp: 9000, grain: 0.8, dur: 1.8, a: 0.05, pts: [[0.1, 1], [1.8, 0]], peak: 0.2 });
    S.crack({ at: 5.4, peak: 0.34, dur: 0.22 });
    S.thud({ at: 5.4, f: 44, f1: 20, dur: 1.6, drive: 4, peak: 0.95 });
  });

  // ---------------------------------------------------------------------------------------------- Morrow-Oak (the Starved Grove)
  // an elder tree like a slow landslide: groaning, creaking wood, dry leaves, roots tearing out of the earth, amber sap welling.
  // The Hunger is the opposite of sound: reversed swells, a low drone that pulls the ear in, then a cut. After the Swallowing the
  // limbs echo the bosses they were grown from, warped through wood (a chop, silk, storm, a grave-lantern's toll; a wing, ice, a rune, a hiss).
  const moCreak = (S, at, dur, pk, pan, f0, f1) => S.creak({ at, dur, f: f0 || 22, f1: f1 || 12, res: [310, 690, 1250], q: 11, peak: pk, pan });
  const moLeaves = (S, at, dur, pk, pan) => S.noise({ at, color: 'pink', hp: 2800, lp: 9000, grain: 0.85, grainRate: 1.4, dur, pts: [[dur * 0.35, 1], [dur, 0]], peak: pk, pan });
  const moRootTear = (S, at, pk, pan) => {
    S.noise({ at, color: 'brown', bp: 900, bp1: 160, q: 0.9, dur: 0.6, a: 0.01, pts: [[0.04, 1], [0.6, 0]], peak: pk * 0.8, pan });
    S.crackle({ at, dens: 0.8, f: 1400, dur: 0.6, pts: [[0.02, 1], [0.6, 0]], peak: pk * 0.5, pan });
    moCreak(S, at, 0.5, pk * 0.5, pan, 30, 14);
    S.thud({ at: at + 0.04, f: 70, f1: 32, dur: 0.5, drive: 2, peak: pk * 0.8, pan });
  };
  // a reversed swell that is pulled inward and cut: the Hunger drawing breath
  const moVoid = (S, at, dur, pk, f0, f1) => {
    S.noise({ at, color: 'brown', bp: 1700, bp1: 90, q: 1.1, dur, pts: [[dur * 0.94, 1], [dur, 0]], peak: pk });
    S.tone({ at, f: f0 || 150, f1: f1 || 36, dur, fm: [0.5, 1.3, 0.2], lp: 600, pts: [[dur * 0.92, 1], [dur, 0]], peak: pk * 0.55 });
  };
  const moSap = (S, at, pk) => {
    S.bubbles({ at, n: 8, f: 160, f1: 520, spread: 0.7, size: 0.07, bias: 0.8, peak: pk });
    S.noise({ at, color: 'brown', bp: 400, bp1: 180, q: 1.2, dur: 0.9, pts: [[0.3, 1], [0.9, 0]], peak: pk * 1.2 });
  };
  def('bm-morrowoak-intro', 'sting', S => {
    S.space('hall', 0.65);
    S.rumble({ dur: 3.4, f: 42, peak: 0.3, a: 1.0 });
    moCreak(S, 0.2, 2.6, 0.2, 0, 18, 9);
    moLeaves(S, 0.3, 2.6, 0.12);
    [0.8, 1.6, 2.3].forEach((at, i) => S.thud({ at, f: 56 - i * 4, f1: 26, dur: 0.9, drive: 3, peak: 0.45 + i * 0.1 }));
    moVoid(S, 1.5, 1.8, 0.2, 130, 34);
    S.tone({ at: 1.8, f: 46, f1: 40, dur: 1.6, a: 0.5, lp: 500, peak: 0.1 });
  });
  def('bm-morrowoak-hunger-seed', 'bm', S => {
    S.space('room', 0.35);
    S.bubbles({ n: 6, f: 200, f1: 700, spread: 0.7, size: 0.05, peak: 0.1 });
    moVoid(S, 0.1, 1.0, 0.24, 800, 90);
    S.thud({ at: 1.2, f: 62, f1: 26, dur: 0.8, drive: 2.6, peak: 0.6 });
    S.crack({ at: 1.2, peak: 0.26, dur: 0.2 });
    S.noise({ at: 1.22, color: 'brown', bp: 900, bp1: 200, q: 0.8, dur: 0.7, a: 0.01, pts: [[0.05, 1], [0.7, 0]], peak: 0.3 });
    moLeaves(S, 1.3, 0.6, 0.1);
  });
  def('bm-morrowoak-twin-seed', 'bm', S => {
    S.space('room', 0.4);
    S.bubbles({ n: 5, f: 200, f1: 700, spread: 0.6, size: 0.05, peak: 0.08, pan: -0.6 });
    S.bubbles({ at: 0.15, n: 5, f: 260, f1: 900, spread: 0.6, size: 0.05, peak: 0.08, pan: 0.6 });
    S.tone({ f: 118, f1: 150, dur: 1.2, a: 0.8, fm: [1.5, 0.8, 0.1], lp: 700, peak: 0.1, pan: -0.5 });
    S.tone({ f: 124, f1: 164, dur: 1.2, a: 0.8, fm: [1.5, 0.8, 0.1], lp: 700, peak: 0.1, pan: 0.5 });
    moVoid(S, 0.2, 1.1, 0.2, 700, 80);
    [1.3, 1.45].forEach((at, i) => { S.thud({ at, f: 64 - i * 6, f1: 26, dur: 0.8, drive: 2.6, peak: 0.5, pan: i ? 0.5 : -0.5 }); S.crack({ at, peak: 0.2, dur: 0.18, pan: i ? 0.5 : -0.5 }); });
    S.rumble({ at: 1.3, dur: 1.2, f: 42, peak: 0.3, a: 0.1 });
  });
  def('bm-morrowoak-inhale', 'bm', S => {
    S.space('hall', 0.6);
    moVoid(S, 0, 2.6, 0.4, 1200, 70);
    moLeaves(S, 0.2, 2.2, 0.14);
    S.noise({ color: 'white', hp: 1500, lp: 7000, bp: 2200, bp1: 400, q: 0.7, dur: 2.5, pts: [[2.3, 1], [2.5, 0]], peak: 0.12 });
    S.rumble({ dur: 2.8, f: 46, peak: 0.34, a: 2.0 });
    moCreak(S, 1.0, 1.6, 0.14, 0, 16, 28);
    S.thud({ at: 2.6, f: 50, f1: 22, dur: 0.6, drive: 3, peak: 0.45 });
  });
  def('bm-morrowoak-fourfold-bloom', 'bm', S => {
    S.space('hall', 0.45);
    S.whoosh({ color: 'brown', f: 100, f1: 700, dur: 0.9, peakAt: 0.9, peak: 0.26 });
    moCreak(S, 0, 0.9, 0.16, 0, 20, 34);
    [0, 1, 2, 3].forEach(i => S.wood({ at: 0.7 + i * 0.05, f: 520 + i * 160, dur: 0.12, peak: 0.12, pan: (i - 1.5) * 0.5 }));
    [1.0, 2.0].forEach((at, j) => {
      S.crack({ at, peak: 0.34, dur: 0.22 });
      S.thud({ at, f: 70, f1: 32, dur: 0.6, drive: 2.4, peak: 0.6 });
      S.glass({ at: at + 0.02, f: 2400 + j * 300, dur: 0.5, peak: 0.07 });
      S.crackle({ at, dens: 3, f: 5000, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.1 });
      S.noise({ at, color: 'brown', bp: 600, bp1: 200, q: 0.8, dur: 0.5, a: 0.01, pts: [[0.04, 1], [0.5, 0]], peak: 0.2 });
    });
    S.whoosh({ at: 1.2, f: 600, f1: 300, dur: 0.6, peakAt: 0.4, peak: 0.2 });
    moLeaves(S, 2.05, 0.9, 0.12);
  });
  def('bm-morrowoak-root-lash', 'bm', S => {
    S.space('hall', 0.35);
    moCreak(S, 0, 0.5, 0.18, 0, 16, 30);
    S.whoosh({ color: 'brown', f: 90, f1: 900, dur: 0.5, peakAt: 0.9, peak: 0.36 });
    S.crack({ at: 0.52, peak: 0.4, dur: 0.22 });
    S.thud({ at: 0.52, f: 58, f1: 26, dur: 0.9, drive: 3, peak: 0.85 });
    S.wood({ at: 0.54, f: 300, dur: 0.15, peak: 0.3 });
    moRootTear(S, 0.55, 0.3);
    S.whoosh({ at: 0.9, f: 800, f1: 150, dur: 0.4, peakAt: 0.3, peak: 0.2 });
    S.splat({ at: 0.6, dur: 0.3, peak: 0.12 });
  });
  def('bm-morrowoak-sap-tide', 'bm', S => {
    S.space('hall', 0.55);
    S.rumble({ dur: 2.6, f: 52, peak: 0.4, a: 0.5 });
    S.noise({ color: 'brown', bp: 150, bp1: 700, q: 0.9, dur: 2.4, a: 0.8, pts: [[1.3, 1], [2.4, 0]], peak: 0.3 });
    [0, 0.5, 1.0, 1.5].forEach((at, i) => moSap(S, at, 0.12 + i * 0.03));
    moCreak(S, 0.3, 1.8, 0.12, 0, 14, 10);
    S.thud({ at: 1.6, f: 50, f1: 24, dur: 1.2, drive: 3, peak: 0.7 });
    S.splat({ at: 1.62, dur: 0.6, peak: 0.28 });
    S.bell({ at: 1.65, f: mf(40), dur: 2.2, peak: 0.07, lp: 1400 });
  });
  def('bm-morrowoak-saplings', 'bm', S => {
    S.space('room', 0.4);
    S.rumble({ dur: 1.6, f: 60, peak: 0.25, a: 0.3 });
    for (let i = 0; i < 6; i++) {
      const at = 0.1 + i * 0.17, pan = (i % 3 - 1) * 0.6;
      S.thud({ at, f: 140 - i * 6, f1: 70, dur: 0.14, drive: 1.5, peak: 0.28, pan });
      S.wood({ at: at + 0.02, f: 700 + i * 70, dur: 0.08, peak: 0.16, pan });
      moLeaves(S, at, 0.25, 0.07, pan);
    }
    S.voice({ at: 0.2, f: 220, f1: 330, dur: 0.9, vowel: 'u', vowel1: 'o', breath: 1.4, lp: 1100, peak: 0.08, a: 0.4 });
    S.creak({ at: 0.8, dur: 0.8, f: 40, f1: 24, res: [600, 1400], q: 10, peak: 0.12 });
    S.bubbles({ at: 1.0, n: 4, f: 300, f1: 900, spread: 0.4, peak: 0.06 });
  });
  def('bm-morrowoak-hungering-dark', 'bm', S => {
    S.space('hall', 0.6);
    [[0, -0.7, 1100], [0.35, 0.7, 900], [0.7, 0, 1300]].forEach(([at, pan, f]) => moVoid(S, at, 1.4, 0.2, f, 60));
    S.rumble({ dur: 2.4, f: 40, peak: 0.4, a: 1.4 });
    S.tone({ f: 44, f1: 34, dur: 2.4, a: 1.2, lp: 400, peak: 0.16, am: [3, 0.5] });
    moCreak(S, 0.4, 1.6, 0.12, 0, 14, 8);
    S.thud({ at: 2.1, f: 46, f1: 20, dur: 1.4, drive: 3.6, peak: 0.9 });
    S.noise({ at: 2.12, color: 'brown', bp: 1100, bp1: 120, q: 0.8, dur: 1.4, a: 0.01, pts: [[0.05, 1], [1.4, 0]], peak: 0.3 });
  });
  def('bm-morrowoak-the-swallowing', 'bm', S => {
    S.space('hall', 0.85);
    // the whole grove tearing loose and falling into the dark
    S.rumble({ dur: 8, f: 46, peak: 0.55, a: 1.5 });
    S.noise({ color: 'brown', bp: 120, bp1: 1600, q: 0.8, dur: 6.5, pts: [[5.5, 1], [6.5, 0]], peak: 0.4 });
    moCreak(S, 0, 4.5, 0.22, 0, 16, 7);
    [0.3, 0.9, 1.6, 2.4, 3.3, 4.3].forEach((at, i) => { moRootTear(S, at, 0.3 + i * 0.03, (i % 3 - 1) * 0.5); S.metal({ at, set: 'stone', f: 130 - i * 8, dur: 1.2, peak: 0.12, strike: 0.9 }); });
    moLeaves(S, 0.6, 5.0, 0.16);
    moVoid(S, 2.5, 4.2, 0.46, 1600, 40);
    S.pad({ at: 3, notes: [mf(34), mf(41), mf(46)], dur: 3.8, det: 14, type: 'saw', lpEnv: [150, 800, 200, 3], peak: 0.12 });
    S.whoosh({ at: 5.6, color: 'brown', f: 2200, f1: 70, dur: 1.4, peakAt: 0.2, peak: 0.36 });
    S.thud({ at: 6.9, f: 42, f1: 18, dur: 2.0, drive: 4, peak: 1 });
    S.crack({ at: 6.9, peak: 0.34, dur: 0.22 });
    S.bell({ at: 6.95, f: mf(30), dur: 4.8, peak: 0.16, lp: 1100 });
    S.rumble({ at: 6.9, dur: 3.5, f: 36, peak: 0.45, a: 0.1 });
  });
  def('bm-morrowoak-the-grove-remade', 'bm', S => {
    S.space('hall', 0.65);
    S.rumble({ dur: 3.8, f: 44, peak: 0.4, a: 1.0 });
    moCreak(S, 0, 3.4, 0.22, 0, 14, 26);
    [0.5, 1.2, 1.9, 2.6].forEach((at, i) => {
      S.noise({ at, color: 'brown', bp: 150, bp1: 900, q: 0.9, dur: 0.8, a: 0.4, pts: [[0.5, 1], [0.8, 0]], peak: 0.26, pan: (i - 1.5) * 0.5 });
      S.wood({ at: at + 0.55, f: 260 + i * 40, dur: 0.2, peak: 0.28, pan: (i - 1.5) * 0.5 });
      S.crack({ at: at + 0.55, peak: 0.2, dur: 0.15, pan: (i - 1.5) * 0.5 });
    });
    moLeaves(S, 0.4, 3.0, 0.14);
    S.choir({ at: 1.0, notes: [mf(34), mf(41)], dur: 2.8, vowel: 'o', vowel1: 'u', lp: 700, peak: 0.1 });
    S.thud({ at: 3.2, f: 54, f1: 24, dur: 1.2, drive: 3.2, peak: 0.8 });
    S.bell({ at: 3.2, f: mf(38), dur: 2.6, peak: 0.1, lp: 1400 });
  });
  def('bm-morrowoak-deeper-roots', 'bm', S => {
    S.space('hall', 0.7);
    S.rumble({ dur: 4.2, f: 40, peak: 0.5, a: 0.9 });
    moCreak(S, 0, 3.8, 0.26, 0, 12, 24);
    moVoid(S, 0, 1.4, 0.22, 600, 60);
    [0.4, 0.9, 1.4, 1.9, 2.4].forEach((at, i) => moRootTear(S, at, 0.34 + i * 0.03, (i % 2 ? 0.5 : -0.5)));
    [1.2, 1.9, 2.6].forEach((at, i) => S.metal({ at, set: 'stone', f: 110 - i * 8, dur: 1.4, peak: 0.16, strike: 0.9 }));
    S.choir({ at: 1.2, notes: [mf(31), mf(38), mf(43)], dur: 3.0, vowel: 'o', vowel1: 'u', lp: 600, peak: 0.12 });
    moLeaves(S, 0.6, 3.0, 0.14);
    S.thud({ at: 3.5, f: 48, f1: 20, dur: 1.6, drive: 3.8, peak: 0.95 });
    S.splat({ at: 3.52, dur: 0.6, peak: 0.26 });
  });
  def('bm-morrowoak-cleaver-bough', 'bm', S => {
    S.space('hall', 0.4);
    moCreak(S, 0, 0.7, 0.2, 0, 18, 30);
    S.whoosh({ color: 'brown', f: 90, f1: 1000, dur: 0.7, peakAt: 0.9, peak: 0.34 });
    S.metal({ at: 0.72, set: 'plate', f: 320, dur: 1.0, peak: 0.28, strike: 0.9 });
    S.wood({ at: 0.72, f: 200, dur: 0.3, peak: 0.4 });
    S.thud({ at: 0.72, f: 52, f1: 24, dur: 1.0, drive: 3.4, peak: 0.95 });
    S.splat({ at: 0.74, dur: 0.4, peak: 0.24 });
    S.crack({ at: 0.72, peak: 0.3, dur: 0.2 });
    S.metal({ at: 1.2, set: 'bar', f: 150, dur: 0.7, peak: 0.08, strike: 0.6 });
  });
  def('bm-morrowoak-brood-roots', 'bm', S => {
    S.space('room', 0.4);
    // many legs on dry wood, strung with silk
    for (let i = 0; i < 9; i++) {
      const at = 0.05 + i * 0.09 + (i % 2) * 0.03, pan = Math.sin(i * 2.1) * 0.7;
      S.wood({ at, f: 520 + (i * 97) % 500, dur: 0.06, peak: 0.16, pan });
      S.tick({ at: at + 0.02, f: 2600 + (i * 211) % 900, peak: 0.06, pan });
    }
    S.skitter({ at: 0.1, dur: 0.9, n: 14, f: 3200, f1: 1500, peak: 0.1 });
    S.scrape({ at: 0.3, f: 4200, q: 3, dur: 0.9, rate: 55, peak: 0.07, pts: [[0.3, 1], [0.9, 0]] });
    moCreak(S, 0.4, 0.9, 0.14, 0, 36, 20);
    S.whoosh({ at: 0.9, f: 700, f1: 2400, dur: 0.4, peakAt: 0.7, peak: 0.22 });
    [1.1, 1.18, 1.26].forEach((at, i) => S.thud({ at, f: 90 - i * 6, f1: 40, dur: 0.3, drive: 2, peak: 0.4, pan: (i - 1) * 0.5 }));
  });
  def('bm-morrowoak-storm-knot', 'bm', S => {
    S.space('hall', 0.5);
    moCreak(S, 0, 0.8, 0.16, 0, 22, 40);
    S.zap({ at: 0.1, f: 90, f1: 140, dur: 0.9, jit: 1.5, peak: 0.1 });
    S.crackle({ at: 0.15, dens: 2.5, f: 3200, dur: 0.9, pts: [[0.4, 1], [0.9, 0.5]], peak: 0.12 });
    S.rumble({ dur: 1.4, f: 70, peak: 0.3, a: 0.5 });
    [1.0, 1.35, 1.7].forEach((at, i) => {
      S.crack({ at, peak: 0.4, dur: 0.3, pan: (i - 1) * 0.6 });
      S.zap({ at, f: 140, f1: 70, dur: 0.3, peak: 0.16, pan: (i - 1) * 0.6 });
      S.thud({ at: at + 0.02, f: 72, f1: 32, dur: 0.6, drive: 2.8, peak: 0.6, pan: (i - 1) * 0.6 });
      S.wood({ at: at + 0.03, f: 380, dur: 0.15, peak: 0.2, pan: (i - 1) * 0.6 });
    });
    S.noise({ at: 1.0, color: 'brown', bp: 1100, bp1: 220, q: 0.8, dur: 1.4, a: 0.5, pts: [[0.1, 1], [1.4, 0]], peak: 0.16 });
  });
  def('bm-morrowoak-barrow-lantern', 'bm', S => {
    S.space('hall', 0.7);
    // a grave-lantern's toll hung on a creaking branch
    moCreak(S, 0, 1.0, 0.14, 0, 16, 11);
    S.bell({ at: 0.3, f: mf(52), dur: 2.4, peak: 0.2, lp: 2200 });
    S.wood({ at: 0.3, f: 340, dur: 0.18, peak: 0.2 });
    S.bell({ at: 1.2, f: mf(50), dur: 2.4, peak: 0.16, lp: 2000 });
    S.pad({ at: 0.5, notes: [mf(52), mf(59)], dur: 2.0, det: 6, type: 'tri', lpEnv: [300, 1100, 300, 1.2], peak: 0.08 });
    S.noise({ at: 0.6, color: 'pink', bp: 700, bp1: 1200, q: 1.2, dur: 1.8, a: 0.6, pts: [[0.9, 0.8], [1.8, 0]], peak: 0.1 });
    moLeaves(S, 1.5, 0.8, 0.07);
    S.thud({ at: 1.2, f: 60, f1: 30, dur: 0.6, drive: 2, peak: 0.4 });
  });
  def('bm-morrowoak-wyrm-wing', 'bm', S => {
    S.space('hall', 0.6);
    // a scorched bat-wing of bark and ember: a creaking unfurl, one roar, a down-draught
    moCreak(S, 0, 0.9, 0.2, 0, 20, 34);
    S.voice({ at: 0.15, f: 78, f1: 120, dur: 0.9, vowel: 'a', vowel1: 'o', breath: 1.6, lp: 1700, peak: 0.26, a: 0.3 });
    S.whoosh({ at: 0.6, color: 'brown', f: 140, f1: 1800, dur: 0.8, peakAt: 0.85, peak: 0.4 });
    S.thud({ at: 1.4, f: 54, f1: 24, dur: 1.2, drive: 3.2, peak: 0.85 });
    S.noise({ at: 1.4, color: 'brown', bp: 1600, bp1: 200, q: 0.7, dur: 1.4, a: 0.04, pts: [[0.1, 1], [1.4, 0]], peak: 0.36 });
    S.sizzle({ at: 1.4, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.1 });
    S.crackle({ at: 1.4, dens: 1.2, f: 2200, dur: 1.0, pts: [[0.05, 1], [1.0, 0]], peak: 0.2 });
    moLeaves(S, 1.5, 0.8, 0.1);
  });
  def('bm-morrowoak-frost-fist', 'bm', S => {
    S.space('hall', 0.55);
    moCreak(S, 0, 0.8, 0.18, 0, 14, 24);
    S.crackle({ at: 0.1, dens: 4, f: 5200, dur: 0.7, pts: [[0.3, 1], [0.7, 0]], peak: 0.12 });
    S.whoosh({ at: 0.35, color: 'brown', f: 80, f1: 600, dur: 0.5, peakAt: 0.9, peak: 0.32 });
    S.thud({ at: 0.9, f: 46, f1: 20, dur: 1.4, drive: 3.8, peak: 1 });
    S.wood({ at: 0.9, f: 240, dur: 0.2, peak: 0.3 });
    S.glass({ at: 0.92, f: 2100, dur: 1.0, peak: 0.12 });
    S.glass({ at: 0.98, f: 3100, dur: 0.7, peak: 0.08 });
    S.crackle({ at: 0.92, dens: 5, f: 5800, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.22 });
    S.noise({ at: 1.1, bp: 4600, q: 1, dur: 0.8, a: 0.05, grain: 0.7, pts: [[0.1, 1], [0.8, 0]], peak: 0.1 });
  });
  def('bm-morrowoak-archmage-rune', 'bm', S => {
    S.space('hall', 0.7);
    // a rune carved in bark waking: a rising chime ring, a pause, then the outer ring breaks
    moCreak(S, 0, 0.6, 0.14, 0, 18, 12);
    [0, 1, 2, 3, 4].forEach(i => S.glass({ at: 0.2 + i * 0.16, f: mf(74 + i * 4), dur: 1.4, peak: 0.07 + i * 0.01 }));
    S.pad({ at: 0.2, notes: [mf(62), mf(69)], dur: 1.6, det: 10, type: 'sine', lpEnv: [400, 2200, 600, 1.0], peak: 0.1 });
    S.whoosh({ at: 0.9, f: 200, f1: 3000, dur: 0.7, peakAt: 0.9, peak: 0.26 });
    S.bell({ at: 1.6, f: mf(60), dur: 2.6, peak: 0.16, lp: 5000 });
    S.thud({ at: 1.6, f: 60, f1: 28, dur: 0.9, drive: 2.8, peak: 0.6 });
    S.wood({ at: 1.62, f: 420, dur: 0.14, peak: 0.2 });
    S.whoosh({ at: 2.0, f: 3000, f1: 400, dur: 0.6, peakAt: 0.2, peak: 0.24 });
    S.glass({ at: 2.1, f: mf(90), dur: 1.4, peak: 0.07 });
  });
  def('bm-morrowoak-hydra-head', 'bm', S => {
    S.space('room', 0.45);
    // a serpent head of wet bark: a hiss, a strike, a wet snap
    moCreak(S, 0, 0.6, 0.16, 0, 24, 40);
    S.noise({ at: 0.1, color: 'white', bp: 5200, bp1: 3400, q: 1.2, dur: 1.0, grain: 0.5, pts: [[0.5, 1], [1.0, 0]], peak: 0.18 });
    S.bubbles({ at: 0.4, n: 6, f: 300, f1: 1100, spread: 0.5, peak: 0.07 });
    S.whoosh({ at: 1.0, f: 600, f1: 3400, dur: 0.25, peakAt: 0.85, peak: 0.36 });
    S.crack({ at: 1.27, peak: 0.34, dur: 0.18 });
    S.splat({ at: 1.27, dur: 0.4, peak: 0.34 });
    S.thud({ at: 1.27, f: 74, f1: 34, dur: 0.6, drive: 2.4, peak: 0.7 });
    S.wood({ at: 1.3, f: 360, dur: 0.14, peak: 0.24 });
    S.noise({ at: 1.5, color: 'white', bp: 5600, bp1: 2800, q: 1.2, dur: 0.6, a: 0.02, grain: 0.5, pts: [[0.1, 1], [0.6, 0]], peak: 0.12 });
  });
  def('bm-morrowoak-nothing-left', 'bm', S => {
    S.space('hall', 0.9);
    // the end of everything: every voice of the grove in turn, then the void drawing the last sound out of the room
    S.rumble({ dur: 7, f: 40, peak: 0.55, a: 1.6, pts: [[4.5, 1], [7, 0]] });
    moCreak(S, 0, 4.0, 0.22, 0, 16, 7);
    moLeaves(S, 0.2, 3.5, 0.16);
    [0.4, 1.3, 2.2, 3.1].forEach((at, i) => {
      S.metal({ at, set: 'stone', f: 120 - i * 10, dur: 1.4, peak: 0.16, strike: 0.9 });
      S.thud({ at, f: 56 - i * 3, f1: 24, dur: 0.9, drive: 3, peak: 0.55 + i * 0.07 });
      S.bell({ at, f: mf(34 - i), dur: 3.0, peak: 0.12, lp: 1200 });
    });
    moVoid(S, 1.8, 5.0, 0.5, 1800, 34);
    S.choir({ at: 2.4, notes: [mf(28), mf(35), mf(40)], dur: 4.2, vowel: 'o', vowel1: 'u', lp: 600, peak: 0.14, pts: [[3.6, 1], [4.2, 0]] });
    S.whoosh({ at: 6.2, color: 'brown', f: 2600, f1: 60, dur: 1.0, peakAt: 0.15, peak: 0.4 });
    S.thud({ at: 7.0, f: 40, f1: 16, dur: 2.4, drive: 4.2, peak: 1 });
    S.crack({ at: 7.0, peak: 0.3, dur: 0.2 });
  });

  // ---------------------------------------------------------------------------------------------- Caelum Vey (the Starborn)
  // black glass and starlight: thin, high, singing blade tones; the hush before each cut and a clean glassy slice; afterimages as
  // shimmering echoes; deep cosmic drones and choir pads for the Starwyrm and the Ascendant; the meteor as a vast, slow roar that
  // grows closer. Grace Withdrawn drains the room, Nightfall is a dark toll. No words.
  const caHush = (S, at, dur, pk, f0, f1) => {      // the held breath before a cut: thin air drawn in and up
    S.noise({ at, bp: f0 || 2600, bp1: f1 || 6200, q: 5, dur, a: dur * 0.85, pts: [[dur * 0.92, 1], [dur, 0]], peak: pk });
    S.tone({ at, f: (f0 || 2600) * 0.5, f1: (f1 || 6200) * 0.5, dur, a: dur * 0.8, pts: [[dur * 0.92, 1], [dur, 0]], peak: pk * 0.14 });
  };
  const caSlice = (S, at, f, pk, pan) => {          // a clean glassy cut: a bright whoosh, a thin ring, a hair of sparkle
    S.whoosh({ at, f: f * 0.5, f1: f * 2.6, dur: 0.26, peakAt: 0.8, peak: pk, q: 2, pan });
    S.noise({ at: at + 0.2, hp: 6500, dur: 0.1, a: 0.002, pts: [[0.005, 1], [0.1, 0]], peak: pk * 0.4, pan });
    S.glass({ at: at + 0.22, f, dur: 0.9, peak: pk * 0.34, pan });
    S.tone({ at: at + 0.22, f: f * 2.01, dur: 0.7, a: 0.003, peak: pk * 0.07, pan });
  };
  const caEcho = (S, at, f, pk, n, pan) => {         // an afterimage: the same note again and again, fainter, shimmering
    for (let i = 0; i < (n || 3); i++) S.glass({ at: at + i * 0.12, f: f * (1 + i * 0.004), dur: 0.8, peak: pk * Math.pow(0.6, i), am: [11 + i * 2, 0.5], pan });
  };
  const caStars = (S, at, n, spread, pk, f0, f1) => {   // star-dust: a scatter of tiny high chimes
    for (let i = 0; i < n; i++) {
      const u = ((i * 0.618) % 1), a = at + spread * u;
      S.tone({ at: a, f: f0 * Math.pow(f1 / f0, (i * 0.37) % 1), dur: 0.5, a: 0.003, peak: pk * (0.5 + 0.5 * ((i * 0.31) % 1)), pan: Math.sin(i * 2.3) * 0.7 });
    }
  };
  const caDrone = (S, at, dur, pk, notes) => {       // a deep cosmic drone under a long thing
    S.pad({ at, notes: notes || [mf(31), mf(38), mf(43)], dur, det: 11, type: 'saw', lpEnv: [140, 900, 220, dur * 0.6], peak: pk });
    S.rumble({ at, dur, f: 40, peak: pk * 1.6, a: dur * 0.4 });
  };
  const caMeteor = (S, at, dur, pk) => {             // the meteor: a vast slow roar, growing closer
    S.noise({ at, color: 'brown', bp: 90, bp1: 1400, q: 0.8, dur, a: dur * 0.7, pts: [[dur * 0.85, 1], [dur, 0.7]], peak: pk });
    S.noise({ at, color: 'pink', hp: 1800, lp: 8000, grain: 0.7, grainRate: 1.2, dur, a: dur * 0.75, pts: [[dur * 0.9, 1], [dur, 0.6]], peak: pk * 0.28 });
    S.tone({ at, f: 38, f1: 56, dur, a: dur * 0.6, fm: [1.5, 0.8, 0.2], lp: 400, peak: pk * 0.4 });
  };
  def('bm-caelum-intro', 'sting', S => {
    S.space('hall', 0.8);
    // a bright, cold chime and a breath: he says one line
    S.rumble({ dur: 3.4, f: 42, peak: 0.22, a: 1.2 });
    caStars(S, 0, 7, 1.4, 0.04, 2600, 6200);
    S.glass({ at: 0.8, f: mf(93), dur: 3.0, peak: 0.12 });
    S.glass({ at: 0.86, f: mf(100), dur: 2.6, peak: 0.07 });
    S.partials({ at: 0.82, set: 'glass', f: mf(81), dur: 3.2, peak: 0.1, am: [2.4, 0.3] });
    caHush(S, 1.5, 1.0, 0.1, 1800, 4200);
    S.voice({ at: 1.9, f: 108, f1: 94, dur: 1.0, vowel: 'o', vowel1: 'u', breath: 2.4, lp: 1500, peak: 0.1, a: 0.3 });
    S.metal({ at: 2.6, set: 'bar', f: 2200, dur: 1.6, peak: 0.07, strike: 0.2 });
    S.thud({ at: 2.7, f: 54, f1: 28, dur: 1.0, drive: 2, peak: 0.3 });
  });
  def('bm-caelum-glint', 'bm', S => {
    S.space('hall', 0.45);
    caHush(S, 0, 0.5, 0.1);
    S.glass({ at: 0.4, f: mf(100), dur: 0.5, peak: 0.07 });
    caSlice(S, 0.55, 3200, 0.3);
    caEcho(S, 0.8, 3600, 0.06, 3);
  });
  // the Wakes: a dance of afterimages. Each is a run of hush-and-slice, the afterimage's echo trailing behind.
  def('bm-caelum-eightfold-wake', 'bm', S => {
    S.space('hall', 0.55);
    caHush(S, 0, 0.7, 0.1);
    for (let i = 0; i < 8; i++) {
      const at = 0.7 + i * 0.3, pan = ((i % 2) ? 1 : -1) * 0.6, f = 2800 + i * 260;
      S.glass({ at: at - 0.2, f: f * 1.5, dur: 0.4, peak: 0.04, pan });
      caSlice(S, at, f, 0.22 + i * 0.012, pan);
    }
    caEcho(S, 3.0, 4200, 0.07, 4);
    S.rumble({ at: 0.7, dur: 2.4, f: 50, peak: 0.16, a: 1.0 });
    S.metal({ at: 3.2, set: 'bar', f: 2600, dur: 2.0, peak: 0.08, strike: 0.3 });
  });
  def('bm-caelum-anchored-wake', 'bm', S => {
    S.space('hall', 0.6);
    // cuts held in place by a low bell: the anchors
    S.bell({ f: mf(57), dur: 3.4, peak: 0.16, lp: 3000 });
    S.thud({ f: 62, f1: 30, dur: 0.7, drive: 2, peak: 0.4 });
    caHush(S, 0.4, 0.6, 0.09);
    for (let i = 0; i < 6; i++) {
      const at = 1.0 + i * 0.32, pan = ((i % 2) ? 1 : -1) * 0.5;
      caSlice(S, at, 2700 + i * 220, 0.22, pan);
      if (i === 2) { S.bell({ at: at + 0.15, f: mf(57), dur: 2.6, peak: 0.12, lp: 3000 }); S.thud({ at: at + 0.15, f: 62, f1: 30, dur: 0.6, drive: 2, peak: 0.3 }); }
    }
    S.bell({ at: 3.1, f: mf(57), dur: 3.0, peak: 0.14, lp: 3000 });
    caEcho(S, 3.1, 3900, 0.06, 3);
  });
  def('bm-caelum-mirrored-wake', 'bm', S => {
    S.space('hall', 0.65);
    // the pass rising, then the same pass again falling: a mirror
    caHush(S, 0, 0.6, 0.09);
    for (let i = 0; i < 6; i++) caSlice(S, 0.6 + i * 0.26, 2200 + i * 420, 0.2, -0.6 + i * 0.24);
    S.glass({ at: 2.2, f: mf(103), dur: 1.4, peak: 0.08 });
    S.noise({ at: 2.2, bp: 5200, q: 6, dur: 0.3, a: 0.01, pts: [[0.05, 1], [0.3, 0]], peak: 0.08 });
    for (let i = 0; i < 6; i++) caSlice(S, 2.5 + i * 0.26, 4300 - i * 420, 0.18 - i * 0.012, 0.6 - i * 0.24);
    caEcho(S, 3.9, 2400, 0.06, 4);
    S.rumble({ dur: 4.2, f: 50, peak: 0.2, a: 1.2 });
    S.thud({ at: 2.25, f: 60, f1: 28, dur: 0.9, drive: 2.4, peak: 0.45 });
    S.bell({ at: 2.25, f: mf(55), dur: 2.4, peak: 0.1, lp: 2800 });
  });
  def('bm-caelum-chorus-of-the-fallen', 'bm', S => {
    S.space('hall', 0.9);
    // the three bosses before him, ghostly: Corvane's drawn steel and glass bell, Brannoc's shield clang and crowd, Morrow-Oak's
    // creak and leaves, each thin and far, under a hollow chord
    S.choir({ at: 0, notes: [mf(45), mf(52), mf(57)], dur: 3.8, vowel: 'o', vowel1: 'u', lp: 900, peak: 0.1, pts: [[2.4, 1], [3.8, 0]] });
    S.scrape({ at: 0.4, f: 3600, q: 2.2, dur: 0.7, rate: 24, peak: 0.07, pts: [[0.3, 1], [0.7, 0]], pan: -0.7 });
    S.metal({ at: 1.05, set: 'bar', f: 1480, dur: 2.2, peak: 0.06, strike: 0.3, pan: -0.7 });
    S.bell({ at: 1.08, f: mf(88), dur: 2.4, peak: 0.04, lp: 6000, pan: -0.7 });
    S.metal({ at: 1.5, set: 'plate', f: 700, dur: 1.4, peak: 0.1, strike: 0.7, pan: 0.7 });
    S.metal({ at: 1.51, set: 'bar', f: 2200, dur: 0.8, peak: 0.04, click: 0, pan: 0.7 });
    S.noise({ at: 1.3, color: 'pink', bp: 350, bp1: 1300, q: 0.7, dur: 1.6, a: 0.7, pts: [[1.0, 1], [1.6, 0]], peak: 0.06, pan: 0.7 });
    S.creak({ at: 2.1, dur: 1.4, f: 18, f1: 11, res: [310, 690, 1250], q: 11, peak: 0.1 });
    S.noise({ at: 2.2, color: 'pink', hp: 2800, lp: 9000, grain: 0.85, grainRate: 1.4, dur: 1.4, pts: [[0.5, 1], [1.4, 0]], peak: 0.05 });
    caEcho(S, 2.9, 3000, 0.05, 4);
    S.glass({ at: 3.2, f: mf(88), dur: 2.0, peak: 0.05 });
    S.thud({ at: 3.4, f: 50, f1: 24, dur: 1.2, drive: 2.4, peak: 0.45 });
    S.rumble({ dur: 3.8, f: 42, peak: 0.2, a: 1.2 });
  });
  def('bm-caelum-cinder-crown', 'bm', S => {
    S.space('hall', 0.55);
    // a crown of embers set on the tank: a toll, a flare, the ring crackling out
    S.bell({ f: mf(48), dur: 2.6, peak: 0.2, lp: 2600 });
    caHush(S, 0.1, 0.8, 0.07, 1400, 3600);
    S.whoosh({ at: 0.75, f: 300, f1: 2800, dur: 0.4, peakAt: 0.85, peak: 0.34 });
    S.thud({ at: 1.15, f: 56, f1: 26, dur: 1.2, drive: 3.2, peak: 0.85 });
    S.crack({ at: 1.15, peak: 0.3, dur: 0.22 });
    S.glass({ at: 1.17, f: 2400, dur: 1.0, peak: 0.1 });
    S.sizzle({ at: 1.2, dur: 1.8, pts: [[0.1, 1], [1.8, 0]], peak: 0.16 });
    S.crackle({ at: 1.2, dens: 1.6, f: 2600, dur: 2.0, pts: [[0.3, 1], [2.0, 0]], peak: 0.2 });
    S.noise({ at: 1.3, color: 'brown', bp: 900, bp1: 180, q: 0.8, dur: 1.4, a: 0.04, pts: [[0.1, 1], [1.4, 0]], peak: 0.26 });
    S.bell({ at: 1.2, f: mf(60), dur: 2.2, peak: 0.08, lp: 5000 });
  });
  def('bm-caelum-pinning-thrust', 'bm', S => {
    S.space('hall', 0.4);
    // the blade turning after the tank, locking; one long lunge and the pin
    caHush(S, 0, 0.7, 0.08, 3000, 7000);
    S.tone({ at: 0.1, f: 2100, f1: 2500, dur: 0.6, a: 0.3, peak: 0.03, am: [8, 0.6] });
    S.metal({ at: 0.55, set: 'bar', f: 3300, dur: 0.5, peak: 0.07, strike: 0.2 });
    S.whoosh({ at: 0.75, f: 500, f1: 6000, dur: 0.5, peakAt: 0.9, peak: 0.4, q: 2 });
    S.thud({ at: 1.2, f: 62, f1: 24, dur: 1.1, drive: 3.4, peak: 0.9 });
    S.metal({ at: 1.2, set: 'plate', f: 520, dur: 1.2, peak: 0.26, strike: 0.8 });
    S.glass({ at: 1.22, f: 3400, dur: 1.2, peak: 0.12 });
    S.crack({ at: 1.2, peak: 0.3, dur: 0.2 });
    S.scrape({ at: 1.3, f: 2400, q: 3, dur: 0.8, rate: 30, peak: 0.1, pts: [[0.05, 1], [0.8, 0]] });
    S.metal({ at: 1.85, set: 'bar', f: 1700, dur: 1.4, peak: 0.1, strike: 0.5 });
  });
  def('bm-caelum-grace-withdrawn', 'bm', S => {
    S.space('hall', 0.7);
    // the room drained: a bright chord that falls away, every sound pulled thin and out, a long silence with one hair of glass
    S.pad({ notes: [mf(69), mf(76), mf(81)], dur: 1.8, det: 6, type: 'sine', lpEnv: [3000, 2400, 300, 1.0], peak: 0.14 });
    S.glass({ f: mf(93), dur: 1.6, peak: 0.1 });
    S.tone({ at: 0.2, f: 1800, f1: 90, dur: 2.2, a: 0.1, curve: 'exp', pts: [[0.3, 1], [2.2, 0]], peak: 0.1 });
    S.noise({ at: 0.1, bp: 5200, bp1: 400, q: 1.5, dur: 2.2, a: 0.05, pts: [[0.3, 1], [2.2, 0]], peak: 0.2 });
    S.whoosh({ at: 0.5, f: 4000, f1: 120, dur: 1.4, peakAt: 0.2, peak: 0.26 });
    caStars(S, 0.2, 6, 1.2, 0.04, 6200, 2600);
    S.thud({ at: 1.9, f: 40, f1: 18, dur: 1.4, drive: 2.5, peak: 0.34 });
    S.glass({ at: 3.0, f: mf(100), dur: 2.4, peak: 0.03 });
  });
  def('bm-caelum-nightfall', 'bm', S => {
    S.space('hall', 0.8);
    // a dark, heavy toll: the sky closing
    S.bell({ f: mf(31), dur: 5.4, peak: 0.34, lp: 1800 });
    S.thud({ f: 46, f1: 20, dur: 1.8, drive: 4, peak: 1 });
    S.crack({ peak: 0.28, dur: 0.22 });
    S.noise({ color: 'brown', bp: 1400, bp1: 100, q: 0.8, dur: 2.2, a: 0.03, pts: [[0.08, 1], [2.2, 0]], peak: 0.4 });
    S.rumble({ dur: 4.4, f: 36, peak: 0.5, a: 0.1 });
    S.bell({ at: 1.5, f: mf(26), dur: 5.0, peak: 0.26, lp: 1400 });
    S.thud({ at: 1.5, f: 40, f1: 18, dur: 1.6, drive: 3.4, peak: 0.7 });
    S.choir({ at: 0.3, notes: [mf(26), mf(33)], dur: 3.6, vowel: 'o', vowel1: 'u', lp: 500, peak: 0.1, pts: [[1.2, 1], [3.6, 0]] });
    S.whoosh({ at: 0.05, color: 'brown', f: 2400, f1: 80, dur: 1.4, peakAt: 0.1, peak: 0.3 });
  });
  def('bm-caelum-starfall', 'bm', S => {
    S.space('hall', 0.65);
    // shards breaking off the meteor and falling: high falling whistles, each ending in a bright thump, a roar behind
    caMeteor(S, 0, 2.6, 0.2);
    [[0.3, 4800, 0.7], [0.65, 5600, -0.5], [1.0, 4200, 0.2], [1.3, 5200, -0.8], [1.6, 4600, 0.5]].forEach(([at, f, pan], i) => {
      S.tone({ at, f, f1: f * 0.2, dur: 0.6, a: 0.01, curve: 'exp', pts: [[0.04, 1], [0.6, 0]], peak: 0.05, pan });
      S.whoosh({ at, f: f * 0.8, f1: f * 0.15, dur: 0.55, peakAt: 0.15, peak: 0.16, pan });
      S.thud({ at: at + 0.5, f: 80 - i * 4, f1: 36, dur: 0.5, drive: 2.2, peak: 0.4, pan });
      S.glass({ at: at + 0.52, f: 2400 + i * 300, dur: 0.9, peak: 0.1, pan });
    });
    S.crackle({ at: 1.8, dens: 3, f: 5000, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.12 });
    S.thud({ at: 2.4, f: 52, f1: 22, dur: 1.4, drive: 3.4, peak: 0.8 });
  });
  def('bm-caelum-dark-ember', 'bm', S => {
    S.space('hall', 0.5);
    // a black ember: the absence of a spark; a low pulse that pulls the highs out and drops a dull coal
    S.noise({ bp: 4200, bp1: 300, q: 2.4, dur: 1.0, a: 0.01, pts: [[0.06, 1], [1.0, 0]], peak: 0.12 });
    S.tone({ f: 120, f1: 58, dur: 1.4, a: 0.3, fm: [0.5, 1.4, 0.2], lp: 500, pts: [[0.5, 1], [1.4, 0]], peak: 0.26, am: [3.4, 0.5] });
    S.thud({ at: 0.9, f: 50, f1: 24, dur: 1.2, drive: 3, peak: 0.7 });
    S.sizzle({ at: 0.92, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.08 });
    S.crackle({ at: 0.95, dens: 0.8, f: 1400, dur: 1.0, pts: [[0.05, 1], [1.0, 0]], peak: 0.12 });
    S.glass({ at: 1.0, f: mf(52), dur: 1.4, peak: 0.07 });
  });
  def('bm-caelum-the-starwyrm', 'bm', S => {
    S.space('hall', 0.85);
    // the constellations come loose and the serpent of stars wakes: a drone and choir rising, stars scattering, a long low call
    caDrone(S, 0, 4.4, 0.16, [mf(31), mf(38), mf(45)]);
    S.choir({ at: 0.4, notes: [mf(43), mf(50), mf(55)], dur: 3.8, vowel: 'a', vowel1: 'o', lp: 1400, peak: 0.12, pts: [[2.4, 1], [3.8, 0]] });
    caStars(S, 0.2, 18, 2.8, 0.05, 1800, 7000);
    [0, 1, 2, 3].forEach(i => S.glass({ at: 1.2 + i * 0.3, f: mf(81 + i * 5), dur: 1.4, peak: 0.07 }));
    S.tone({ at: 2.0, f: 52, f1: 96, dur: 1.8, a: 0.5, fm: [2, 1.4, 0.3], lp: 900, vib: [3.6, 0.04, 0.4], pts: [[1.0, 1], [1.8, 0]], peak: 0.28 });
    S.voice({ at: 2.1, f: 60, f1: 84, dur: 1.6, vowel: 'o', vowel1: 'a', breath: 1.4, lp: 1100, peak: 0.12, a: 0.5 });
    S.whoosh({ at: 3.0, f: 300, f1: 5200, dur: 1.2, peakAt: 0.9, peak: 0.34 });
    S.thud({ at: 4.1, f: 48, f1: 22, dur: 1.4, drive: 3.4, peak: 0.8 });
    S.bell({ at: 4.1, f: mf(38), dur: 3.0, peak: 0.12, lp: 2200 });
  });
  def('bm-caelum-embers-of-heaven', 'bm', S => {
    S.space('hall', 0.6);
    // star-glass struck off the half-buried star: glassy ringing impacts, burning
    caMeteor(S, 0, 1.8, 0.14);
    [[0.7, 2600, -0.5], [1.15, 2100, 0.6], [1.6, 3000, 0]].forEach(([at, f, pan]) => {
      S.whoosh({ at: at - 0.35, f: 3600, f1: 500, dur: 0.4, peakAt: 0.2, peak: 0.2, pan });
      S.thud({ at, f: 64, f1: 28, dur: 0.9, drive: 3, peak: 0.6, pan });
      S.glass({ at: at + 0.02, f, dur: 1.4, peak: 0.16, pan });
      S.glass({ at: at + 0.05, f: f * 1.5, dur: 0.9, peak: 0.08, pan });
      S.crackle({ at, dens: 3.5, f: 5600, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.18, pan });
      S.sizzle({ at: at + 0.1, dur: 0.9, pts: [[0.1, 1], [0.9, 0]], peak: 0.07, pan });
    });
    S.rumble({ at: 0.6, dur: 1.6, f: 46, peak: 0.3, a: 0.2 });
  });
  def('bm-caelum-constellation-fall', 'bm', S => {
    S.space('hall', 0.85);
    // the serpent rears and breathes: starlight pouring across the whole floor; a long swell of bright air and choir, a falling
    // run of glass, and a hush where the shadow is
    S.tone({ f: 54, f1: 72, dur: 1.4, a: 0.5, fm: [2, 1.2, 0.3], lp: 800, peak: 0.24 });
    S.voice({ at: 0.1, f: 70, f1: 100, dur: 1.2, vowel: 'o', vowel1: 'a', breath: 1.4, lp: 1200, peak: 0.12, a: 0.3 });
    caHush(S, 0.8, 1.2, 0.1, 1200, 5200);
    S.noise({ at: 1.8, bp: 800, bp1: 6500, q: 0.8, dur: 3.0, a: 0.5, pts: [[1.2, 1], [3.0, 0]], peak: 0.36 });
    S.noise({ at: 1.9, color: 'pink', hp: 3000, lp: 9500, grain: 0.7, dur: 2.6, a: 0.4, pts: [[1.0, 1], [2.6, 0]], peak: 0.14 });
    S.choir({ at: 1.8, notes: [mf(57), mf(64), mf(69), mf(76)], dur: 3.2, vowel: 'a', vowel1: 'o', lp: 2400, peak: 0.12, pts: [[1.2, 1], [3.2, 0]] });
    for (let i = 0; i < 10; i++) S.glass({ at: 1.9 + i * 0.16, f: mf(100 - i * 2), dur: 1.0, peak: 0.07, pan: Math.sin(i * 1.7) * 0.7 });
    S.rumble({ at: 1.8, dur: 3.0, f: 46, peak: 0.34, a: 0.4 });
    S.thud({ at: 1.85, f: 52, f1: 24, dur: 1.4, drive: 3, peak: 0.6 });
  });
  def('bm-caelum-ascendant', 'bm', S => {
    S.space('hall', 0.9);
    // the crater falls away and he rises above the clouds: the ground tearing loose, a drop into wind, then a vast open choir
    // with the meteor roaring below
    S.rumble({ dur: 8, f: 40, peak: 0.5, a: 1.2, pts: [[3.5, 1], [8, 0]] });
    [0.2, 0.8, 1.5, 2.3].forEach((at, i) => { S.metal({ at, set: 'stone', f: 120 - i * 8, dur: 1.4, peak: 0.18, strike: 0.9 }); S.thud({ at, f: 56 - i * 4, f1: 24, dur: 0.9, drive: 3, peak: 0.5 + i * 0.07 }); S.crack({ at, peak: 0.22, dur: 0.2 }); });
    caDrone(S, 0.4, 7, 0.14, [mf(31), mf(38), mf(43)]);
    S.whoosh({ at: 2.5, color: 'brown', f: 90, f1: 3400, dur: 2.2, peakAt: 0.9, peak: 0.42 });
    caMeteor(S, 3, 4.4, 0.22);
    S.noise({ at: 4.6, color: 'pink', bp: 1400, bp1: 3000, q: 0.5, dur: 3.2, a: 1.0, pts: [[1.4, 1], [3.2, 0]], peak: 0.14 });
    S.choir({ at: 4.4, notes: [mf(43), mf(50), mf(55), mf(62)], dur: 3.6, vowel: 'a', vowel1: 'o', lp: 2200, peak: 0.16, pts: [[1.6, 1], [3.6, 0]] });
    S.choir({ at: 5.0, notes: [mf(67), mf(74)], dur: 3.0, vowel: 'i', vowel1: 'a', lp: 3200, peak: 0.07 });
    caStars(S, 4.6, 14, 3.0, 0.045, 2400, 7800);
    S.bell({ at: 5.2, f: mf(50), dur: 3.8, peak: 0.14, lp: 3200 });
    S.glass({ at: 5.3, f: mf(93), dur: 2.6, peak: 0.1 });
    S.thud({ at: 4.5, f: 44, f1: 20, dur: 1.8, drive: 3.6, peak: 0.8 });
  });
  def('bm-caelum-horizon-cut', 'bm', S => {
    S.space('hall', 0.7);
    // one cut the width of the room: the long hush, a single high sweep, and a rain of falling glass either side of the gap
    caHush(S, 0, 1.3, 0.14, 1600, 7200);
    S.tone({ f: 800, f1: 3200, dur: 1.3, a: 1.0, peak: 0.04, pts: [[1.2, 1], [1.3, 0]] });
    S.whoosh({ at: 1.3, f: 400, f1: 7000, dur: 0.9, peakAt: 0.8, peak: 0.42, q: 2.2 });
    S.noise({ at: 2.05, hp: 6000, dur: 0.14, a: 0.002, pts: [[0.005, 1], [0.14, 0]], peak: 0.2 });
    S.glass({ at: 2.1, f: 3800, dur: 2.4, peak: 0.18 });
    S.glass({ at: 2.12, f: 2500, dur: 2.0, peak: 0.1 });
    S.scrape({ at: 2.1, f: 5200, q: 3, dur: 0.9, rate: 28, peak: 0.1, pts: [[0.1, 1], [0.9, 0]] });
    for (let i = 0; i < 12; i++) {
      const at = 2.5 + i * 0.12 + (i % 3) * 0.04;
      S.glass({ at, f: 1800 + ((i * 523) % 2400), dur: 0.7, peak: 0.05 + ((i * 7) % 5) * 0.008, pan: Math.sin(i * 2.4) * 0.8 });
      if (i % 3 === 0) S.thud({ at: at + 0.05, f: 90 - i * 3, f1: 40, dur: 0.4, drive: 1.6, peak: 0.28, pan: Math.sin(i * 2.4) * 0.8 });
    }
    S.thud({ at: 2.05, f: 58, f1: 24, dur: 1.2, drive: 3.2, peak: 0.7 });
  });
  def('bm-caelum-second-coil', 'bm', S => {
    S.space('hall', 0.7);
    // the serpent of stars diving straight across the room: a starlit trail, a rising call, and a body-length rush
    S.tone({ f: 70, f1: 140, dur: 1.0, a: 0.4, fm: [2, 1.4, 0.3], lp: 1000, peak: 0.22 });
    S.voice({ at: 0.05, f: 76, f1: 130, dur: 0.9, vowel: 'o', vowel1: 'a', breath: 1.6, lp: 1300, peak: 0.12, a: 0.3 });
    caStars(S, 0.4, 8, 0.9, 0.05, 2200, 6800);
    S.whoosh({ at: 0.9, f: 300, f1: 4800, dur: 0.9, peakAt: 0.55, peak: 0.42 });
    S.noise({ at: 1.0, color: 'brown', bp: 400, bp1: 1400, q: 0.9, dur: 1.0, a: 0.1, pts: [[0.4, 1], [1.0, 0]], peak: 0.26 });
    for (let i = 0; i < 9; i++) S.glass({ at: 1.0 + i * 0.1, f: 3600 - i * 200, dur: 0.8, peak: 0.06, pan: -0.7 + i * 0.17 });
    S.thud({ at: 1.95, f: 54, f1: 24, dur: 1.3, drive: 3.4, peak: 0.85 });
    S.glass({ at: 1.97, f: 2100, dur: 1.4, peak: 0.12 });
    S.crackle({ at: 1.95, dens: 3, f: 5200, dur: 1.0, pts: [[0.02, 1], [1.0, 0]], peak: 0.16 });
  });
  def('bm-caelum-the-sky-comes-down', 'bm', S => {
    S.space('hall', 0.95);
    // the end of the set: the meteor falls. A vast, slow roar that swells for the whole cast, the choir and drone of everything
    // he has called, bells tolling as it nears, then the strike, a shatter of glass, and a long ring-out into silence
    S.rumble({ dur: 10, f: 38, peak: 0.6, a: 6, pts: [[7.4, 1], [9.6, 0.8], [10, 0]] });
    caMeteor(S, 0, 8.4, 0.46);
    S.noise({ at: 1.0, color: 'pink', bp: 300, bp1: 3400, q: 0.7, dur: 7.6, a: 5.4, pts: [[7.0, 1], [7.6, 0.6]], peak: 0.3 });
    caDrone(S, 0.4, 8, 0.14, [mf(29), mf(36), mf(41)]);
    S.choir({ at: 1.5, notes: [mf(41), mf(48), mf(53), mf(60)], dur: 6.2, vowel: 'a', vowel1: 'o', lp: 2000, peak: 0.16, pts: [[4.6, 1], [6.2, 0.8]] });
    S.choir({ at: 3.2, notes: [mf(65), mf(72)], dur: 4.6, vowel: 'i', vowel1: 'a', lp: 3200, peak: 0.07 });
    [1.0, 2.8, 4.4, 5.6, 6.5, 7.2].forEach((at, i) => { S.bell({ at, f: mf(31 + (i % 2) * 5), dur: 4.6, peak: 0.22 + i * 0.02, lp: 1800 }); S.thud({ at, f: 44, f1: 22, dur: 0.9, drive: 3, peak: 0.45 + i * 0.05 }); });
    caStars(S, 2.0, 22, 5.2, 0.04, 2400, 8000);
    S.whoosh({ at: 6.4, color: 'brown', f: 200, f1: 3800, dur: 1.6, peakAt: 0.95, peak: 0.44 });
    S.thud({ at: 8.2, f: 38, f1: 14, dur: 3.0, drive: 4.5, peak: 1 });
    S.crack({ at: 8.2, peak: 0.36, dur: 0.3 });
    S.noise({ at: 8.2, color: 'brown', bp: 1800, bp1: 100, q: 0.7, dur: 2.8, a: 0.02, pts: [[0.1, 1], [2.8, 0]], peak: 0.5 });
    for (let i = 0; i < 12; i++) S.glass({ at: 8.25 + i * 0.07, f: 1600 + ((i * 611) % 3200), dur: 1.8, peak: 0.1, pan: Math.sin(i * 2.1) * 0.8 });
    S.bell({ at: 8.3, f: mf(31), dur: 5.5, peak: 0.3, lp: 1600 });
    S.rumble({ at: 8.2, dur: 4.4, f: 34, peak: 0.5, a: 0.1 });
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

  // ---------------------------------------------------------------------------------------------- The Hydra of the Drowned Temple
  def('bm-hydra-intro', 'sting', S => {
    S.space('hall', 0.6);
    S.noise({ color: 'brown', lp: 900, dur: 2.6, a: 0.3, pts: [[0.6, 0.6], [1.4, 1], [2.6, 0]], peak: 0.3 });
    S.bubbles({ at: 0.2, n: 8, f: 160, f1: 520, spread: 1.6, size: 0.05, peak: 0.12 });
    S.voice({ at: 0.9, f: 70, f1: 54, dur: 1.8, vowel: 'o', vowel1: 'a', breath: 6, peak: 0.3, lp: 3000, pts: [[0.3, 1], [1.8, 0]] });
    S.choir({ at: 1.0, notes: [mf(38), mf(45), mf(50)], vowel: 'u', dur: 2.2, a: 0.8, peak: 0.08 });
  });
  def('bm-hydra-mothers-cry', 'bm', S => {
    S.space('hall', 0.5);
    S.voice({ f: 150, f1: 120, dur: 1.9, vowel: 'a', vowel1: 'o', breath: 4, peak: 0.3, lp: 5000, pts: [[0.25, 1], [1.9, 0]] });
    S.bell({ at: 0.1, f: mf(55), dur: 2.6, peak: 0.2, lp: 4000 });
    S.rumble({ dur: 2.2, f: 70, peak: 0.3, a: 0.1 });
    S.bubbles({ at: 0.5, n: 6, f: 300, f1: 900, spread: 1.2, size: 0.04, peak: 0.07 });
  });
  def('bm-hydra-rending-maul', 'bm', S => {
    S.whoosh({ f: 160, f1: 900, dur: 0.45, peakAt: 0.9, peak: 0.35 });
    S.splat({ at: 0.4, peak: 0.4, dur: 0.3 });
    S.thud({ at: 0.4, f: 74, f1: 30, dur: 0.6, drive: 2.5, peak: 0.65 });
    S.noise({ at: 0.4, bp: 2600, bp1: 600, q: 3, dur: 0.3, grain: 0.8, pts: [[0.03, 1], [0.3, 0]], peak: 0.28 });
  });
  def('bm-hydra-acid-spray', 'bm', S => {
    S.noise({ bp: 2400, bp1: 5200, q: 1.5, dur: 1.5, a: 0.2, pts: [[0.3, 0.8], [0.8, 1], [1.5, 0]], peak: 0.22 });
    S.sizzle({ at: 0.3, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.2 });
    S.bubbles({ at: 0.4, n: 8, f: 500, f1: 1800, spread: 0.9, size: 0.03, peak: 0.08 });
  });
  def('bm-hydra-tidal-line', 'bm', S => {
    S.noise({ color: 'pink', bp: 300, bp1: 1800, q: 1.2, dur: 1.4, a: 0.25, pts: [[0.4, 0.7], [0.9, 1], [1.4, 0]], peak: 0.32 });
    S.whoosh({ at: 0.3, f: 120, f1: 800, dur: 0.9, peakAt: 0.7, peak: 0.28 });
    S.bubbles({ at: 0.6, n: 7, f: 300, f1: 1200, spread: 0.7, size: 0.04, peak: 0.1 });
    S.thud({ at: 1.0, f: 70, f1: 34, dur: 0.5, peak: 0.4 });
  });
  def('bm-hydra-venom-bloom', 'bm', S => {
    S.space('hall', 0.35);
    S.pad({ notes: [mf(45), mf(46)], type: 'tri', dur: 1.8, a: 0.4, peak: 0.1, lp: 900 });
    S.bubbles({ n: 10, f: 200, f1: 900, spread: 1.4, size: 0.05, peak: 0.12 });
    S.splat({ at: 1.5, peak: 0.35, dur: 0.3 });
    S.thud({ at: 1.5, f: 80, f1: 38, dur: 0.5, peak: 0.45 });
  });
  def('bm-hydra-flame-gout', 'bm', S => {
    S.noise({ bp: 500, bp1: 2400, q: 1.2, dur: 1.2, a: 0.2, pts: [[0.25, 0.7], [0.7, 1], [1.2, 0]], peak: 0.28 });
    S.crackle({ dens: 2.2, f: 4000, dur: 1.3, pts: [[0.25, 1], [1.3, 0]], peak: 0.2 });
    S.thud({ at: 0.9, f: 90, f1: 40, dur: 0.4, drive: 2, peak: 0.45 });
  });
  def('bm-hydra-rime-crown', 'bm', S => {
    S.space('hall', 0.4);
    [0, 0.12, 0.24, 0.38].forEach((at, i) => S.glass({ at, f: 1500 + i * 420, dur: 1.0, peak: 0.12 - i * 0.015 }));
    S.noise({ bp: 4200, q: 2, dur: 1.3, a: 0.3, pts: [[0.5, 0.7], [0.9, 1], [1.3, 0]], peak: 0.12 });
    S.thud({ at: 0.95, f: 70, f1: 36, dur: 0.5, peak: 0.35 });
  });
  def('bm-hydra-stormcall', 'bm', S => {
    S.rumble({ dur: 1.6, f: 60, peak: 0.35, a: 0.2 });
    [0.3, 0.55, 0.8].forEach((at, i) => { S.zap({ at, f: 90, dur: 0.22, peak: 0.2, pan: [-0.5, 0, 0.5][i] }); S.crack({ at: at + 0.04, peak: 0.2, dur: 0.12 }); });
    S.noise({ at: 0.9, bp: 800, q: 1, dur: 1.0, pts: [[0.05, 1], [1.0, 0]], peak: 0.15 });
  });
  def('bm-hydra-stonegaze', 'bm', S => {
    S.space('cave', 0.45);
    S.tone({ f: 110, f1: 330, dur: 2.0, a: 1.0, peak: 0.1, lp: 1800 });
    S.scrape({ at: 0.4, f: 1400, q: 3, rate: 18, dur: 1.4, pts: [[0.1, 1], [1.4, 0]], peak: 0.1 });
    S.rumble({ dur: 2.2, f: 52, peak: 0.3, a: 0.5 });
    S.glass({ at: 1.8, f: 880, dur: 1.2, peak: 0.07 });
  });
  def('bm-hydra-mire-spit', 'bm', S => {
    [0, 0.2, 0.4].forEach((at, i) => { S.splat({ at, peak: 0.3, dur: 0.3 }); S.thud({ at, f: 100 - i * 12, f1: 46, dur: 0.3, peak: 0.3 }); });
    S.bubbles({ at: 0.2, n: 10, f: 120, f1: 500, spread: 1.0, size: 0.06, peak: 0.1 });
    S.noise({ color: 'brown', lp: 700, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.18 });
  });
  def('bm-hydra-searing', 'bm', S => {
    S.sizzle({ dur: 1.4, pts: [[0.2, 1], [0.7, 0.8], [1.4, 0]], peak: 0.28 });
    S.whoosh({ f: 200, f1: 1400, dur: 0.6, peakAt: 0.6, peak: 0.24 });
    S.crackle({ dens: 2, f: 3600, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.16 });
    S.thud({ at: 0.15, f: 80, f1: 40, dur: 0.3, peak: 0.3 });
  });
  def('bm-hydra-submerge', 'bm', S => {
    S.space('hall', 0.55);
    S.noise({ color: 'brown', lp: 1400, lp1: 200, dur: 3.2, a: 0.4, pts: [[0.6, 0.8], [1.6, 1], [3.2, 0]], peak: 0.4 });
    S.bubbles({ at: 0.3, n: 14, f: 600, f1: 140, spread: 2.4, size: 0.06, peak: 0.12 });
    S.rumble({ dur: 3.4, f: 46, peak: 0.45, a: 0.4 });
    S.choir({ at: 0.4, notes: [mf(33), mf(40)], vowel: 'u', dur: 2.8, a: 0.9, peak: 0.1 });
  });
  def('bm-hydra-mothers-heart', 'bm', S => {
    S.space('hall', 0.5);
    [0, 0.9, 1.8, 2.7].forEach((at, i) => { S.thud({ at, f: 56, f1: 26, dur: 0.7, drive: 2, peak: 0.55 }); S.thud({ at: at + 0.22, f: 48, f1: 24, dur: 0.5, peak: 0.38 }); S.bell({ at, f: mf(31 + i * 2), dur: 2.4, peak: 0.18, lp: 3000 }); });
    S.choir({ at: 0.3, notes: [mf(38), mf(45), mf(52)], vowel: 'a', dur: 3.4, a: 1.0, peak: 0.1 });
    S.rumble({ dur: 3.6, f: 60, peak: 0.35, a: 0.4 });
  });
  def('bm-hydra-the-drowning', 'bm', S => {
    S.space('hall', 0.6);
    S.noise({ color: 'brown', lp: 1800, dur: 4.2, a: 1.2, pts: [[2.4, 0.7], [3.6, 1], [4.2, 0]], peak: 0.45 });
    S.rumble({ dur: 4.4, f: 44, peak: 0.55, a: 0.5 });
    S.voice({ at: 0.4, f: 62, f1: 46, dur: 3.4, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.34, lp: 3000, pts: [[0.4, 1], [3.4, 0]] });
    S.bubbles({ at: 1.0, n: 20, f: 500, f1: 120, spread: 3, size: 0.07, peak: 0.1 });
    [2.6, 3.2, 3.8].forEach(at => S.drum({ at, f: 62, dur: 0.8, peak: 0.45 }));
  });
  def('bm-hydra-regrowth', 'bm', S => {
    S.creak({ dur: 0.9, f: 20, f1: 11, res: [480, 1000, 1800], q: 12, peak: 0.2 });
    S.bubbles({ at: 0.1, n: 9, f: 150, f1: 700, spread: 0.9, size: 0.05, peak: 0.12 });
    S.splat({ at: 0.8, peak: 0.35, dur: 0.3 });
    S.voice({ at: 0.7, f: 130, f1: 190, dur: 0.9, vowel: 'o', breath: 4, peak: 0.16, lp: 4000, pts: [[0.2, 1], [0.9, 0]] });
  });
  def('bm-hydra-tidal-dance', 'bm', S => {
    [0, 0.9, 1.8].forEach((at, i) => { S.whoosh({ at, f: 130, f1: 900 + i * 150, dur: 0.7, peakAt: 0.6, peak: 0.26 }); S.noise({ at, color: 'pink', bp: 400, bp1: 1600, q: 1.2, dur: 0.8, pts: [[0.1, 1], [0.8, 0]], peak: 0.2 }); });
    S.drum({ at: 0.6, f: 90, dur: 0.4, peak: 0.35 }); S.drum({ at: 1.5, f: 90, dur: 0.4, peak: 0.35 });
    S.bubbles({ at: 0.4, n: 9, f: 300, f1: 1100, spread: 2, size: 0.04, peak: 0.08 });
  });
  def('bm-hydra-hydras-gaze', 'bm', S => {
    S.space('cave', 0.55);
    S.tone({ f: 82, f1: 164, dur: 2.6, a: 1.2, peak: 0.1, lp: 2000 });
    S.voice({ at: 0.3, f: 110, f1: 96, dur: 2.0, vowel: 'i', breath: 7, peak: 0.12, lp: 5000, pts: [[0.4, 1], [2.0, 0]] });
    S.glass({ at: 2.2, f: 1760, dur: 1.4, peak: 0.1 });
    S.rumble({ dur: 2.8, f: 50, peak: 0.35, a: 0.6 });
  });
  def('bm-hydra-tail-thrash', 'bm', S => {
    S.whoosh({ f: 90, f1: 520, dur: 0.7, peakAt: 0.55, peak: 0.34 });
    S.splat({ at: 0.55, peak: 0.42, dur: 0.4 });
    S.thud({ at: 0.58, f: 62, f1: 28, dur: 0.7, drive: 2, peak: 0.6 });
    S.bubbles({ at: 0.7, n: 12, f: 250, f1: 1300, spread: 1.0, size: 0.04, peak: 0.1 });
  });
  def('bm-hydra-undertow', 'bm', S => {
    S.whoosh({ f: 1100, f1: 110, dur: 1.0, peakAt: 0.25, peak: 0.3 });
    S.noise({ color: 'pink', bp: 1500, bp1: 260, q: 1.0, dur: 1.1, pts: [[0.15, 1], [1.0, 0]], peak: 0.22 });
    S.bubbles({ at: 0.15, n: 14, f: 1200, f1: 180, spread: 1.0, size: 0.05, peak: 0.12 });
    S.thud({ at: 0.95, f: 54, f1: 30, dur: 0.6, drive: 1.5, peak: 0.45 });
  });
  def('bm-hydra-stump-echo', 'bm', S => {
    S.space('cave', 0.45);
    S.voice({ f: 190, f1: 120, dur: 1.1, vowel: 'o', vowel1: 'a', breath: 6, peak: 0.16, lp: 3000, pts: [[0.3, 1], [1.1, 0]] });
    S.bell({ at: 0.15, f: mf(98), dur: 1.4, peak: 0.12, lp: 2600 });
    S.bubbles({ at: 0.1, n: 7, f: 700, f1: 160, spread: 0.8, size: 0.05, peak: 0.1 });
  });

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
