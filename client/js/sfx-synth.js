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
      src: (buf, rate, from) => { const b = ctx.createBufferSource(); b.buffer = typeof buf === 'string' ? nbuf(ctx, buf) : buf; b.loop = true; b.playbackRate.value = rate || 1; b.start(t, from != null ? from : r() * b.buffer.duration * 0.9); nodes.push(b); return b; },   // (from: a fixed start, for a loop the picture keeps time with)
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
    'ab-wind': 5.5, 'amb-fountain': -11, 'amb-garrow-mere': -16.5, 'amb-maelis-moon': -0.5,
    'amb-ormun-scales': -13.5, 'amb-pond': -16.5, 'amb-tavern': -13, 'amb-town': -18.5,
    'amb-vesper-hall': -13, 'arrival': -8, 'bm-archmage-arcane-burst': -0.5, 'bm-archmage-arcane-mark': 2,
    'bm-archmage-call-of-the-circle': 2.5, 'bm-archmage-cascading-convergence': -0.5, 'bm-archmage-cinder-rune': 1, 'bm-archmage-circle-brand': 0.5,
    'bm-archmage-circle-of-fire': 1.5, 'bm-archmage-circle-of-lightning': 1, 'bm-archmage-circle-of-the-void': 0.5, 'bm-archmage-convergence': 1.5,
    'bm-archmage-counterspell': 2.5, 'bm-archmage-ice-lances': 3, 'bm-archmage-leaping-bolt': 1, 'bm-archmage-pyre-rings': 1,
    'bm-archmage-rift-rune': -1.5, 'bm-archmage-rime-rune': 0.5, 'bm-archmage-rune-mark': 2, 'bm-archmage-rune-swap': 2,
    'bm-archmage-runic-clock': 2.5, 'bm-archmage-sigil-flare': 1, 'bm-archmage-spellweave': 1, 'bm-archmage-storm-rune': 2,
    'bm-archmage-the-binding': 1.5, 'bm-archmage-the-seven-circles': 1, 'bm-archmage-the-tide-rises': 1, 'bm-archmage-void-rifts': -1,
    'bm-brannoc-breaker': -0.5, 'bm-brannoc-carry-through': 0.5, 'bm-brannoc-crowd-pleaser': 0.5, 'bm-brannoc-crowds-choice': 2,
    'bm-brannoc-deep-call': -2.5, 'bm-brannoc-double-grip': 2, 'bm-brannoc-fist-slam': -1, 'bm-brannoc-hammer-heel': -1,
    'bm-brannoc-intro': -1.5, 'bm-brannoc-m-banner': 2.5, 'bm-brannoc-m-carry-slam': 1, 'bm-brannoc-m-carry-throw': 10,
    'bm-brannoc-m-cheer': 2, 'bm-brannoc-m-mark': 8, 'bm-brannoc-m-post-hit': 1.5, 'bm-brannoc-m-post-lock': 2.5,
    'bm-brannoc-m-sigil': 8, 'bm-brannoc-m-wrong': 3.5, 'bm-brannoc-rebound': 2, 'bm-brannoc-riposte': 3,
    'bm-brannoc-roar-of-the-stands': -1.5, 'bm-brannoc-sand-furrow': 2, 'bm-brannoc-stand-your-ground': 0.5, 'bm-brannoc-sunwheel': 2.5,
    'bm-brannoc-sunwheel-unbound': 0.5, 'bm-brannoc-the-final-bell': -1, 'bm-brannoc-the-tide-rises': -0.5, 'bm-brannoc-twin-wheels': 3,
    'bm-brannoc-undertow-grip': 0.5, 'bm-brannoc-victory-leap': -1, 'bm-caelum-anchored-wake': 2, 'bm-caelum-ascendant': -1.5,
    'bm-caelum-carried-shadow': -1, 'bm-caelum-chorus-of-the-fallen': 0.5, 'bm-caelum-cinder-crown': -1, 'bm-caelum-constellation-fall': -1.5,
    'bm-caelum-dark-ember': -2.5, 'bm-caelum-eightfold-wake': 1, 'bm-caelum-embers-of-heaven': -0.5, 'bm-caelum-fallen-stars': 2,
    'bm-caelum-glint': 2.5, 'bm-caelum-grace-withdrawn': -1.5, 'bm-caelum-horizon-cut': -1.5, 'bm-caelum-intro': -1.5,
    'bm-caelum-m-carried': -1.5, 'bm-caelum-m-lengthens': 1.5, 'bm-caelum-m-star-burst': 2, 'bm-caelum-m-star-mark': 7.5,
    'bm-caelum-m-sunless': 1, 'bm-caelum-nightfall': -1.5, 'bm-caelum-pinning-thrust': -1.5, 'bm-caelum-second-coil': -1.5,
    'bm-caelum-starfall': -1, 'bm-caelum-the-shadow-lengthens': 3, 'bm-caelum-the-sky-comes-down': -1.5, 'bm-caelum-the-starwyrm': -2.5,
    'bm-caelum-trailing-cut': 1.5, 'bm-corvane-answering-cut': 2, 'bm-corvane-comet-draw': 1.5, 'bm-corvane-comet-volley': 3,
    'bm-corvane-draw-cut': 4.5, 'bm-corvane-false-stance': 2, 'bm-corvane-gale-through-the-pass': 2.5, 'bm-corvane-hollow-breath': 6,
    'bm-corvane-hundredfold-parting': 0.5, 'bm-corvane-intro': -2, 'bm-corvane-last-light-of-the-pass': -1.5, 'bm-corvane-m-counter': 6,
    'bm-corvane-m-gale': 2, 'bm-corvane-m-lesson-fail': 6, 'bm-corvane-m-mark': 7.5, 'bm-corvane-m-ring': 0.5,
    'bm-corvane-m-ring-throw': 3.5, 'bm-corvane-m-shrine': 2.5, 'bm-corvane-m-wall': 2.5, 'bm-corvane-rising-crane': 1,
    'bm-corvane-scabbard-sweep': 2.5, 'bm-corvane-the-circle': 1.5, 'bm-corvane-the-last-vigil': -1.5, 'bm-corvane-the-shrine': 3.5,
    'bm-corvane-the-vigil': 1, 'bm-corvane-three-lessons': 4, 'bm-corvane-whetted-edge': -0.5, 'bm-corvane-white-gale': 3.5,
    'bm-garrow-buried-scent': 7, 'bm-garrow-circle-the-prey': 5.5, 'bm-garrow-cold-trail': -3.5, 'bm-garrow-double-scent': 5.5,
    'bm-garrow-doubling-back': 5.5, 'bm-garrow-howl': -4, 'bm-garrow-intro': -1, 'bm-garrow-m-flurry': 4.5,
    'bm-garrow-m-hound-bite': 11, 'bm-garrow-m-hound-fade': 16.5, 'bm-garrow-m-hound-scent': 10.5, 'bm-garrow-m-hound-spawn': 9.5,
    'bm-garrow-m-hounds-meet': 4.5, 'bm-garrow-m-last': 6, 'bm-garrow-m-lock': 5, 'bm-garrow-m-mist-in': 5.5,
    'bm-garrow-m-mist-out': 4.5, 'bm-garrow-m-pounce': 6, 'bm-garrow-m-pounce-wide': 1, 'bm-garrow-m-ridge': 2,
    'bm-garrow-m-rime-land': 5, 'bm-garrow-m-ring-burst': 1.5, 'bm-garrow-m-run': 6, 'bm-garrow-m-run-start': 9,
    'bm-garrow-m-scent': 4, 'bm-garrow-m-still-burst': 5, 'bm-garrow-m-still-mark': 8.5, 'bm-garrow-m-wipe': 7.5,
    'bm-garrow-mist-hounds': 9, 'bm-garrow-on-the-scent': 6, 'bm-garrow-rime': 6.5, 'bm-garrow-snowdrift': 3.5,
    'bm-garrow-stillness': 2.5, 'bm-garrow-the-long-chase': 2.5, 'bm-garrow-the-second-hound': 5, 'bm-garrow-the-whole-trail': 5.5,
    'bm-garrow-throat-snap': 1.5, 'bm-garrow-w-arrive': -0.5, 'bm-garrow-w-called': -2, 'bm-garrow-w-cold': 0.5,
    'bm-garrow-w-drift': 5, 'bm-garrow-w-enrage-land': -2.5, 'bm-garrow-w-hold': 1, 'bm-garrow-w-return': -3.5,
    'bm-garrow-w-road': 2, 'bm-garrow-w-vanish': 1, 'bm-garrow-w-wipe': 3.5, 'bm-grubnak-belly-flop': -1,
    'bm-grubnak-butchers-charge': -0.5, 'bm-grubnak-chop-chop': 1, 'bm-grubnak-clean-plate': -3, 'bm-grubnak-cleaver-toss': 1.5,
    'bm-grubnak-clogged-drains': 3.5, 'bm-grubnak-dessert-is-served': 2.5, 'bm-grubnak-dinner-bell': -1.5, 'bm-grubnak-dinner-rush': 3.5,
    'bm-grubnak-double-chop': 1, 'bm-grubnak-family-meal': 0.5, 'bm-grubnak-flambe': -0.5, 'bm-grubnak-flare-up': -1.5,
    'bm-grubnak-flashover': 1.5, 'bm-grubnak-flashover-burst': -1.5, 'bm-grubnak-gorge': 2, 'bm-grubnak-gorged': -2,
    'bm-grubnak-gorged-mend': 1, 'bm-grubnak-grease-fire': 0.5, 'bm-grubnak-intro': -1, 'bm-grubnak-kitchen-staff': 2.5,
    'bm-grubnak-ladle-spin': 4, 'bm-grubnak-larder-toss': 2.5, 'bm-grubnak-lid-slam': -1.5, 'bm-grubnak-long-skewer': 0.5,
    'bm-grubnak-meat-toss': 1.5, 'bm-grubnak-mince': 1.5, 'bm-grubnak-mise-en-place': 4, 'bm-grubnak-order-served': 3,
    'bm-grubnak-order-up': -3, 'bm-grubnak-plate-spoiled': 1.5, 'bm-grubnak-rolling-meatballs': 2.5, 'bm-grubnak-service': -1,
    'bm-grubnak-simmer': 2, 'bm-grubnak-skewer': 2, 'bm-grubnak-spice-rack': 0.5, 'bm-grubnak-spit-up': 1.5,
    'bm-grubnak-stockpot': 1.5, 'bm-grubnak-tenderize': 1, 'bm-grubnak-ticket': 3.5, 'bm-grubnak-whisk': 7,
    'bm-hollowking-barrow-bells': -1.5, 'bm-hollowking-barrow-knell': 1.5, 'bm-hollowking-coffin-lids': 2, 'bm-hollowking-court-of-bones': 1.5,
    'bm-hollowking-crown-of-graves': 3.5, 'bm-hollowking-dirge': 0.5, 'bm-hollowking-echo-knights': 4.5, 'bm-hollowking-exile': 1,
    'bm-hollowking-funeral-march': 0.5, 'bm-hollowking-grave-cleave': 0.5, 'bm-hollowking-grave-marks': 4, 'bm-hollowking-grave-summons': 1.5,
    'bm-hollowking-gravebind': 2.5, 'bm-hollowking-intro': 1.5, 'bm-hollowking-judgement': 0.5, 'bm-hollowking-kneel': 2.5,
    'bm-hollowking-lantern': 8.5, 'bm-hollowking-lights-out': 2, 'bm-hollowking-roll-call': 0.5, 'bm-hollowking-roll-called': 4,
    'bm-hollowking-roll-caught': 2, 'bm-hollowking-roll-judged': 5, 'bm-hollowking-royal-audience': -1.5, 'bm-hollowking-royal-decree': -1,
    'bm-hollowking-royal-doom': 1, 'bm-hollowking-royal-gaze': -1.5, 'bm-hollowking-sceptre-rebuke': 1.5, 'bm-hollowking-sceptre-sweep': 3.5,
    'bm-hollowking-sceptre-throw': 2, 'bm-hollowking-shackle': 1, 'bm-hollowking-the-charge-sheet': 1.5, 'bm-hollowking-the-king-rises': -1,
    'bm-hollowking-the-long-night': 1.5, 'bm-hollowking-the-sentence': 2, 'bm-hollowking-turned-out': 1, 'bm-hollowking-writ-of-execution': 1.5,
    'bm-hood-burial': -0.5, 'bm-hood-calm-breaks': 0.5, 'bm-hood-cold-breath': 3, 'bm-hood-communion': -1,
    'bm-hood-dead-calm': -1, 'bm-hood-echo': -2, 'bm-hood-frostfall': -3, 'bm-hood-hollow-echo': -2,
    'bm-hood-hollow-step': 1, 'bm-hood-hollowing': -1, 'bm-hood-interment': -0.5, 'bm-hood-intro': -1.5,
    'bm-hood-last-toll': -2, 'bm-hood-pale-waltz': 1, 'bm-hood-pursuit': 0.5, 'bm-hood-rimeburst': -1.5,
    'bm-hood-rimelight': -2.5, 'bm-hood-severance': 1, 'bm-hood-the-scales': 1, 'bm-hood-the-tolling': 2,
    'bm-hood-two-hands': 1, 'bm-hood-verdict': -0.5, 'bm-hood-verdict-eternal': -1, 'bm-hood-weighing': -0.5,
    'bm-hydra-acid-spray': 3, 'bm-hydra-breach': 0.5, 'bm-hydra-entwined-necks': 0.5, 'bm-hydra-flame-gout': 3,
    'bm-hydra-intro': -3, 'bm-hydra-mire-spit': 2, 'bm-hydra-mothers-cry': -1.5, 'bm-hydra-mothers-heart': 0.5,
    'bm-hydra-regrowth': 0.5, 'bm-hydra-rending-maul': 1.5, 'bm-hydra-rime-crown': 1, 'bm-hydra-scalding': 2.5,
    'bm-hydra-searing': 2.5, 'bm-hydra-stonegaze': 0.5, 'bm-hydra-stormcall': 3, 'bm-hydra-stump-echo': -0.5,
    'bm-hydra-tail-thrash': 1, 'bm-hydra-the-drowning': -2.5, 'bm-hydra-tidal-dance': 3.5, 'bm-hydra-tidal-line': 2,
    'bm-hydra-undertow': 3, 'bm-hydra-venom-bloom': 3, 'bm-maelis-annular': 3, 'bm-maelis-blood-harvest': 1.5,
    'bm-maelis-blood-moon-dance': 1.5, 'bm-maelis-crescent': 4, 'bm-maelis-earthshine': 2, 'bm-maelis-full-moon': 2,
    'bm-maelis-gibbous': 2.5, 'bm-maelis-half-moon': 4, 'bm-maelis-harvest': 3, 'bm-maelis-hunters-moon': 2.5,
    'bm-maelis-hunts-pass': 5.5, 'bm-maelis-intro': 2, 'bm-maelis-libration': 2, 'bm-maelis-m-crown-crescent': 7.5,
    'bm-maelis-m-crown-crescent-wane': 7.5, 'bm-maelis-m-crown-full': 10.5, 'bm-maelis-m-crown-full-wane': 10.5, 'bm-maelis-m-crown-gibbous': 8,
    'bm-maelis-m-crown-gibbous-wane': 9, 'bm-maelis-m-crown-half': 8.5, 'bm-maelis-m-crown-half-wane': 8, 'bm-maelis-m-crown-new': 5.5,
    'bm-maelis-m-crown-ring': 7, 'bm-maelis-m-crown-umbral': 1, 'bm-maelis-m-crown2': 12.5, 'bm-maelis-m-cut-crescent': 4.5,
    'bm-maelis-m-cut-gibbous': 1, 'bm-maelis-m-cut-half': 4, 'bm-maelis-m-cut-ring': 2.5, 'bm-maelis-m-cut-ucrescent': -0.5,
    'bm-maelis-m-dance-end': 5, 'bm-maelis-m-dash': 9, 'bm-maelis-m-earth': -1, 'bm-maelis-m-earth2': 5,
    'bm-maelis-m-full': -0.5, 'bm-maelis-m-hound': 14, 'bm-maelis-m-line': 6.5, 'bm-maelis-m-line-lock': 18.5,
    'bm-maelis-m-lock': 6.5, 'bm-maelis-m-mark-eye': 2.5, 'bm-maelis-m-mark-moon': 2, 'bm-maelis-m-mark-prey': 7.5,
    'bm-maelis-m-mark-step': 8.5, 'bm-maelis-m-moonlet-burst': 4.5, 'bm-maelis-m-moonlet-fall': 2, 'bm-maelis-m-moonlet-gone': 7,
    'bm-maelis-m-moonlet-harvest': 1.5, 'bm-maelis-m-moonlet-hum': 8, 'bm-maelis-m-moonlet-rest': 9.5, 'bm-maelis-m-open': 2,
    'bm-maelis-m-pool': 6.5, 'bm-maelis-m-pool-met': 4.5, 'bm-maelis-m-pounce': 4.5, 'bm-maelis-m-pounce-wide': 0.5,
    'bm-maelis-m-ride': 9, 'bm-maelis-m-ride-start': 8, 'bm-maelis-m-rock': -1, 'bm-maelis-m-run': 7.5,
    'bm-maelis-m-shade': 9.5, 'bm-maelis-m-step-cut': 5.5, 'bm-maelis-m-touch': 1, 'bm-maelis-m-touch-end': 10.5,
    'bm-maelis-m-well-met': -2.5, 'bm-maelis-m-well-missed': -1, 'bm-maelis-moon-touched': 4, 'bm-maelis-moonless-steps': 1.5,
    'bm-maelis-moonlets': 3, 'bm-maelis-moonrise': 3.5, 'bm-maelis-moonwell': 5, 'bm-maelis-new-moon': 3,
    'bm-maelis-the-hounds-return': 7.5, 'bm-maelis-the-last-dance': 1, 'bm-maelis-the-last-light': 4, 'bm-maelis-the-long-eclipse': 1.5,
    'bm-maelis-the-waxing': 4, 'bm-maelis-totality': 0.5, 'bm-maelis-two-crowns': 9.5, 'bm-maelis-umbral-crescent': 1,
    'bm-maelis-umbral-half-moon': 1, 'bm-maelis-w-answer': -1, 'bm-maelis-w-breath': 2, 'bm-maelis-w-dark': 1,
    'bm-maelis-w-dusk': -1, 'bm-maelis-w-enter': -2, 'bm-maelis-w-fall': -1, 'bm-maelis-w-fall2': -4,
    'bm-maelis-w-gather': -1.5, 'bm-maelis-w-hold': 1.5, 'bm-maelis-w-howl': -5.5, 'bm-maelis-w-hunt': -4.5,
    'bm-maelis-w-light': -3, 'bm-maelis-w-streak': 3.5, 'bm-maelis-w-total': -2.5, 'bm-maelis-w-total-build': -0.5,
    'bm-maelis-w-vault': 4, 'bm-maelis-w-wane': -1, 'bm-maelis-waning-dance': 3.5, 'bm-maelis-waxing-dance': 3.5,
    'bm-morrowoak-barrow-lantern': 2, 'bm-morrowoak-brood-roots': 2.5, 'bm-morrowoak-deeper-roots': -1, 'bm-morrowoak-fourfold-bloom': 1,
    'bm-morrowoak-frost-fist': -0.5, 'bm-morrowoak-grafting': 2, 'bm-morrowoak-greenseed': -1.5, 'bm-morrowoak-hunger-seed': -1,
    'bm-morrowoak-hungering-dark': -1, 'bm-morrowoak-hungers-reach': 2, 'bm-morrowoak-hydra-head': 1.5, 'bm-morrowoak-inhale': -1.5,
    'bm-morrowoak-intro': -1, 'bm-morrowoak-m-graft': 3.5, 'bm-morrowoak-m-mend': 2, 'bm-morrowoak-m-seed-mark': 1,
    'bm-morrowoak-m-stir': 1.5, 'bm-morrowoak-nothing-left': -3, 'bm-morrowoak-root-lash': -0.5, 'bm-morrowoak-sap-tide': -0.5,
    'bm-morrowoak-saplings': 3, 'bm-morrowoak-starved': -1.5, 'bm-morrowoak-storm-knot': 0.5, 'bm-morrowoak-take-root': -1.5,
    'bm-morrowoak-the-grove-remade': -1, 'bm-morrowoak-the-hunger-stirs': 1.5, 'bm-morrowoak-the-swallowing': -3, 'bm-morrowoak-twin-seed': -0.5,
    'bm-morrowoak-wyrm-wing': -1, 'bm-ormun-buoyed': 5.5, 'bm-ormun-burden': 5, 'bm-ormun-counterweight': 1.5,
    'bm-ormun-exact-measure': 7.5, 'bm-ormun-first-weighing': 5, 'bm-ormun-heavy-hand': 4.5, 'bm-ormun-hollow-weight': 3.5,
    'bm-ormun-let-it-be-level': 6.5, 'bm-ormun-m-beat': 5, 'bm-ormun-m-bell': 2, 'bm-ormun-m-bite': 12,
    'bm-ormun-m-buoy': 4.5, 'bm-ormun-m-burden': 4.5, 'bm-ormun-m-clear': 13.5, 'bm-ormun-m-crack': 5.5,
    'bm-ormun-m-creak': 5, 'bm-ormun-m-drop': 2, 'bm-ormun-m-exact': 12.5, 'bm-ormun-m-fall': 1,
    'bm-ormun-m-fall-bridge': 5, 'bm-ormun-m-fall-light': 4.5, 'bm-ormun-m-flood': 3.5, 'bm-ormun-m-hand': 2,
    'bm-ormun-m-lap': 16.5, 'bm-ormun-m-lift': 9.5, 'bm-ormun-m-mark': 14, 'bm-ormun-m-read': 8.5,
    'bm-ormun-m-rise': 5, 'bm-ormun-m-roll': 15, 'bm-ormun-m-scatter': 3, 'bm-ormun-m-set': 7.5,
    'bm-ormun-m-sink': 11, 'bm-ormun-m-swing': 3.5, 'bm-ormun-m-throw': 4.5, 'bm-ormun-m-tide-in': 2,
    'bm-ormun-scatter-the-silver': 6, 'bm-ormun-spring-tide': 5.5, 'bm-ormun-the-beam-leans': 5.5, 'bm-ormun-the-bridge-breaks': 2.5,
    'bm-ormun-the-heavier-falls': 4, 'bm-ormun-the-lighter-rises': 6.5, 'bm-ormun-the-scale-falls': 1.5, 'bm-ormun-the-tide-arrives': 5.5,
    'bm-ormun-the-tide-comes-in': 2.5, 'bm-ormun-the-tide-weighs-too': 3.5, 'bm-ormun-the-weight-of-things': 5, 'bm-ormun-three-burdens': 5,
    'bm-ormun-tip-the-scale': 3, 'bm-ormun-twin-undertow': 5.5, 'bm-ormun-undertow': 3.5, 'bm-ormun-w-break': -1,
    'bm-ormun-w-ebb': -1, 'bm-ormun-w-enrage-land': -1.5, 'bm-ormun-w-fall': -1.5, 'bm-ormun-w-hold': 3,
    'bm-ormun-w-pass': 1, 'bm-ormun-w-release': -1.5, 'bm-ormun-w-span-fall': -1, 'bm-ormun-w-span-groan': 1.5,
    'bm-ormun-w-tip': -1, 'bm-seraph-absolution': -1, 'bm-seraph-afterglow': -1.5, 'bm-seraph-ash-landing': -1.5,
    'bm-seraph-benediction': -0.5, 'bm-seraph-broken-halo': -1, 'bm-seraph-cold-sermon': -0.5, 'bm-seraph-following-light': 0.5,
    'bm-seraph-frost-shadow': -0.5, 'bm-seraph-intro': -2.5, 'bm-seraph-last-rites': 0.5, 'bm-seraph-radiance': -3,
    'bm-seraph-return': -1, 'bm-seraph-returning-edge': -0.5, 'bm-seraph-six-wings': 5, 'bm-seraph-the-unsaid': -1.5,
    'bm-seraph-wingbeat': -1, 'bm-seraph-wingfall': 0.5, 'bm-skitterra-acid-deluge': 0.5, 'bm-skitterra-brood': 4.5,
    'bm-skitterra-cats-cradle': 1.5, 'bm-skitterra-ceiling-ambush': 1, 'bm-skitterra-chrysalis': 4, 'bm-skitterra-cocoon-crack': 6.5,
    'bm-skitterra-cocoon-drop': 1.5, 'bm-skitterra-cocoon-split': 0.5, 'bm-skitterra-cradle-burn': 7, 'bm-skitterra-cradle-tighten': -1,
    'bm-skitterra-eclosion': -0.5, 'bm-skitterra-egg-sacs': 1.5, 'bm-skitterra-eightfold-lunge': 6.5, 'bm-skitterra-fang-rush': 2,
    'bm-skitterra-fang-strike': 1, 'bm-skitterra-flutter': 3.5, 'bm-skitterra-from-the-dark': 2, 'bm-skitterra-heartbeat': 2.5,
    'bm-skitterra-imprint': 2.5, 'bm-skitterra-imprint-wash': 3, 'bm-skitterra-into-the-dark': 2, 'bm-skitterra-intro': -1,
    'bm-skitterra-lure-crush': 3.5, 'bm-skitterra-lure-hatch': 5, 'bm-skitterra-molt': 8, 'bm-skitterra-moonlight': -0.5,
    'bm-skitterra-moth-queen': 1.5, 'bm-skitterra-moth-shriek': -4, 'bm-skitterra-rebirth': 1, 'bm-skitterra-scale-wave': 0.5,
    'bm-skitterra-silk-lines': 3.5, 'bm-skitterra-silk-reel': 3.5, 'bm-skitterra-silk-wrap': 2.5, 'bm-skitterra-snare-weave': 2,
    'bm-skitterra-spiderlings': 11, 'bm-skitterra-spin': 8, 'bm-skitterra-spinneret-volley': 16, 'bm-skitterra-strand-cut': 6,
    'bm-skitterra-strand-reel': 5.5, 'bm-skitterra-the-swarm': 11.5, 'bm-skitterra-the-web-gives-way': 0.5, 'bm-skitterra-tightening-web': 2,
    'bm-skitterra-venom-cure': 6, 'bm-skitterra-venom-drip': 4, 'bm-skitterra-venom-mist': -1.5, 'bm-skitterra-venom-spit': 4,
    'bm-sovereign-aftershock': -1.5, 'bm-sovereign-ashen-sweep': -1, 'bm-sovereign-brand': -1.5, 'bm-sovereign-brand-sear': 1.5,
    'bm-sovereign-burning-web': 4, 'bm-sovereign-call': 1, 'bm-sovereign-cinder-dive': -2, 'bm-sovereign-cloche': 3.5,
    'bm-sovereign-crescent': 2, 'bm-sovereign-crier': 1, 'bm-sovereign-crossed-blades': 2, 'bm-sovereign-cupped-ember': -0.5,
    'bm-sovereign-ember-and-ash': 1, 'bm-sovereign-emberfall': -1, 'bm-sovereign-flambe': 0.5, 'bm-sovereign-flambe-service': 0.5,
    'bm-sovereign-foretold': 1, 'bm-sovereign-fuse': 7.5, 'bm-sovereign-glass-floor': -1.5, 'bm-sovereign-grace-withdrawn': -2.5,
    'bm-sovereign-halo-procession': -0.5, 'bm-sovereign-halo-turn': -1.5, 'bm-sovereign-heads-of-flame': -2, 'bm-sovereign-hollow-kings-bell': 1.5,
    'bm-sovereign-intro': -0.5, 'bm-sovereign-kindling': -2, 'bm-sovereign-knights-sweep': -0.5, 'bm-sovereign-knot': 4,
    'bm-sovereign-lance': -3, 'bm-sovereign-lantern': 4, 'bm-sovereign-mince': 0.5, 'bm-sovereign-nightfall': -1,
    'bm-sovereign-pyre': 2.5, 'bm-sovereign-royal-doom': 1, 'bm-sovereign-scatter': 0.5, 'bm-sovereign-seeds-of-ash': 1,
    'bm-sovereign-shadow': -0.5, 'bm-sovereign-sovereigns-dance': -0.5, 'bm-sovereign-sunwheel-of-embers': 0.5, 'bm-sovereign-surge': -1.5,
    'bm-sovereign-the-anvil-count': 2, 'bm-sovereign-twin-brands': 2, 'bm-sovereign-two-dancers': 2, 'bm-titan-avalanche': 0.5,
    'bm-titan-breath-of-winter': 1.5, 'bm-titan-deep-winter': 0.5, 'bm-titan-endless-winter': -1.5, 'bm-titan-frostbite': 2.5,
    'bm-titan-glacial-stomp': -0.5, 'bm-titan-ice-tomb': 1, 'bm-titan-icebreaker': 2, 'bm-titan-icefall': 2.5,
    'bm-titan-intro': -3, 'bm-titan-rime-slam': 0.5, 'bm-titan-sunk-towers': 0.5, 'bm-titan-the-ice-groans': 2,
    'bm-titan-titans-grip': 2.5, 'bm-titan-titans-sweep': 2, 'bm-titan-twin-slam': 2, 'bm-titan-two-winters': 1,
    'bm-titan-whiteout': 1.5, 'bm-titan-winters-grasp': 2.5, 'bm-titan-winters-howl': -1, 'bm-vesper-backhand': 7.5,
    'bm-vesper-counterpoint': -1.5, 'bm-vesper-cross-cut': 6.5, 'bm-vesper-double-glass': 5.5, 'bm-vesper-evenfall-dance': 2,
    'bm-vesper-hairline-fracture': 15.5, 'bm-vesper-hand-mirror': 9.5, 'bm-vesper-intro': 1, 'bm-vesper-lagging-glass': 1,
    'bm-vesper-last-reflection': -1.5, 'bm-vesper-lay-glass': 7.5, 'bm-vesper-m-back': 6, 'bm-vesper-m-backhand': 10.5,
    'bm-vesper-m-counter': 2, 'bm-vesper-m-counter-glass': 5.5, 'bm-vesper-m-cross': 3.5, 'bm-vesper-m-cross-glass': 9,
    'bm-vesper-m-cut': 7, 'bm-vesper-m-cut-draw': 9.5, 'bm-vesper-m-cut-draw-glass': 11.5, 'bm-vesper-m-cut-glass': 7.5,
    'bm-vesper-m-cut-last': 0.5, 'bm-vesper-m-evenfall': 2, 'bm-vesper-m-fracture': 7.5, 'bm-vesper-m-hair': 8,
    'bm-vesper-m-hand-break': 5, 'bm-vesper-m-hand-land': 4.5, 'bm-vesper-m-mark-aim': 8, 'bm-vesper-m-mark-chain': 12,
    'bm-vesper-m-mark-lag': 13, 'bm-vesper-m-mark-wrong': 0.5, 'bm-vesper-m-open': 4.5, 'bm-vesper-m-pull': 2,
    'bm-vesper-m-shard': 3.5, 'bm-vesper-m-shard-hall': 4.5, 'bm-vesper-m-soak-met': 3.5, 'bm-vesper-m-soak-missed': 6.5,
    'bm-vesper-m-step': 6.5, 'bm-vesper-m-swap': 1, 'bm-vesper-m-thread-lock': -2, 'bm-vesper-m-thread-snap': 5,
    'bm-vesper-m-through': 3.5, 'bm-vesper-m-trade': 5, 'bm-vesper-m-verdict': 1, 'bm-vesper-m-verdict-glass': 6.5,
    'bm-vesper-out-of-step': 2.5, 'bm-vesper-ring-true': -1, 'bm-vesper-shared-reflection': 0.5, 'bm-vesper-silver-thread': 0.5,
    'bm-vesper-the-hall': 3, 'bm-vesper-the-line': 2, 'bm-vesper-the-mirror-turns': 1, 'bm-vesper-through-the-glass': 3,
    'bm-vesper-through-the-glass-again': 1, 'bm-vesper-trading-places': 2, 'bm-vesper-twin-verdict': -3.5, 'bm-vesper-two-threads': 1.5,
    'bm-vesper-w-breath': 1.5, 'bm-vesper-w-dark': -0.5, 'bm-vesper-w-enrage-land': -3, 'bm-vesper-w-fall': -1,
    'bm-vesper-w-latch': -2, 'bm-vesper-w-peak': -2.5, 'bm-vesper-w-plant': -3.5, 'bm-vesper-w-step': 3,
    'bm-vesper-w-trade': 3, 'bm-vesper-w-turn': -3, 'bm-vesper-wrong-hand': 1, 'bm-volkar-avalanche': 0.5,
    'bm-volkar-ball-lightning': 1.5, 'bm-volkar-chain-lightning': 3, 'bm-volkar-charge-swap': 5, 'bm-volkar-conduct-burst': -1,
    'bm-volkar-conduct-leap': 2, 'bm-volkar-conduction': 3.5, 'bm-volkar-crossing-arms': 2.5, 'bm-volkar-eye-closes': 2,
    'bm-volkar-eye-of-the-storm': 4.5, 'bm-volkar-gale-slam': 4, 'bm-volkar-gathering-storm': 0.5, 'bm-volkar-grounding-rods': 3,
    'bm-volkar-heavens-fall': -1, 'bm-volkar-intro': -1.5, 'bm-volkar-lightning-rods': 9, 'bm-volkar-magnet-pull': 1.5,
    'bm-volkar-magnet-push': 4, 'bm-volkar-magnetize': 0.5, 'bm-volkar-polarity-minus': 3, 'bm-volkar-polarity-plus': 3,
    'bm-volkar-polarity-surge': 1.5, 'bm-volkar-pulse': 4.5, 'bm-volkar-reaching-arms': 0.5, 'bm-volkar-rod-strike': 1.5,
    'bm-volkar-skyfall': -0.5, 'bm-volkar-split-current': -1, 'bm-volkar-split-land': 1.5, 'bm-volkar-squall-line': 3,
    'bm-volkar-static-field': 5, 'bm-volkar-static-lash': 4.5, 'bm-volkar-still-air': 3, 'bm-volkar-storm-burst': -1.5,
    'bm-volkar-storm-groan': 1, 'bm-volkar-storm-heart': 1, 'bm-volkar-storm-hush': 1.5, 'bm-volkar-storm-roar': -1,
    'bm-volkar-storm-roll': 2.5, 'bm-volkar-storm-unbound': -1, 'bm-volkar-storm-walls': 2, 'bm-volkar-supercell': 2,
    'bm-volkar-the-sky-lowers': 1, 'bm-volkar-thunder-crash': 1, 'bm-volkar-thunderclap': 1.5, 'bm-volkar-thunderhead': 2.5,
    'bm-volkar-titan-fist': -1.5, 'bm-volkar-twin-fall': -1.5, 'bm-wyrm-cinder-rain': 7.5, 'bm-wyrm-ember-breath': 3.5,
    'bm-wyrm-ember-devils': 4, 'bm-wyrm-intro': -4, 'bm-wyrm-marked-prey': -0.5, 'bm-wyrm-molten-trail': 2,
    'bm-wyrm-pounce': 0.5, 'bm-wyrm-skyward': 1, 'bm-wyrm-take-flight': 3.5, 'bm-wyrm-the-tyrant-wakes': -1.5,
    'bm-wyrm-twin-breath': 3.5, 'boss-auto': 2.5, 'boss-death': -2.5, 'boss-enrage': -2.5,
    'boss-impact-empty': 7, 'boss-impact-heavy': 0.5, 'boss-impact-light': 7, 'boss-intro': -1.5,
    'boss-step': 6, 'buff-on': -0.5, 'chest-drop': 3.5, 'chest-open': -5,
    'cleanse': -5, 'clear': -4.5, 'crit': 4, 'dash': 6.5,
    'debuff-on': -1, 'dummy-hit': 3, 'emote-cheer': -6.5, 'emote-laugh': -2,
    'emote-wave': 2, 'enrage-bell': 3, 'fd-alert': -6, 'fd-arrow': 7,
    'fd-auto-cast': 7, 'fd-auto-ember': 12.5, 'fd-auto-hit-arrow': 8.5, 'fd-auto-hit-ember': 16,
    'fd-auto-hit-holy': 11, 'fd-auto-hit-melee': 7.5, 'fd-auto-holy': 9, 'fd-auto-melee': -1,
    'fd-auto-shot': 8.5, 'fd-ballista': 1, 'fd-banner': -0.5, 'fd-bash': 4,
    'fd-boon': -3, 'fd-boss-arrive': -3, 'fd-boss-down': -2, 'fd-brace': 1,
    'fd-brand': 9.5, 'fd-brute-slam': 3, 'fd-buy': -3, 'fd-camp-hit': 5.5,
    'fd-carve': 5.5, 'fd-chain-ash-breath': 1, 'fd-chain-bell': 0.5, 'fd-chain-bubble': 3.5,
    'fd-chain-down': -3, 'fd-chain-far': -3, 'fd-chain-oak-cut': 4.5, 'fd-chain-pike-lunge': 3.5,
    'fd-chain-pike-slap': 5, 'fd-chain-ram-charge': 0.5, 'fd-chain-ram-stamp': 2.5, 'fd-chain-root-snare': 1,
    'fd-chain-soak-ok': -1, 'fd-chain-stump-throw': 3, 'fd-chain-sweep': 2, 'fd-chain-whelp-call': 1.5,
    'fd-count': 6, 'fd-cover': -1, 'fd-dawn': -0.5, 'fd-dawn-breaks': -1,
    'fd-defeat': -1.5, 'fd-deliver': 1.5, 'fd-elite-die': -3, 'fd-enemy-die': 5,
    'fd-enemy-hit': 5.5, 'fd-erupt': -0.5, 'fd-fireball-cast': 7.5, 'fd-fireball-hit': 3.5,
    'fd-firestep': 3, 'fd-flamecircle': 1, 'fd-flood-rise': 2, 'fd-gate-break': 0.5,
    'fd-gate-hit': 3, 'fd-gate-shut': -2.5, 'fd-gnaw-breath': -3, 'fd-gnaw-lunge': -2.5,
    'fd-gnaw-sniff': 0.5, 'fd-gnaw-stamp': 1, 'fd-hero-down': -1, 'fd-hyperforge': -3,
    'fd-levelup': -0.5, 'fd-log-break': 2.5, 'fd-loot-land': 1, 'fd-march': -6,
    'fd-mark': 3.5, 'fd-mend': -2.5, 'fd-meteor-fall': 1.5, 'fd-meteor-hit': -2,
    'fd-mire-charge': 2.5, 'fd-mire-drown': -1.5, 'fd-mire-stamp': -1, 'fd-night': -1,
    'fd-page': 1.5, 'fd-perfect': 2, 'fd-pickup': 4, 'fd-pierce': 7,
    'fd-ping': 8.5, 'fd-post-out': 5.5, 'fd-post-plant': 0.5, 'fd-quake': 0.5,
    'fd-quest-done': -1.5, 'fd-quest-missed': -2, 'fd-quest-offer': -5.5, 'fd-rankup': 2.5,
    'fd-recall': -3, 'fd-recall-done': -2.5, 'fd-relight': 0.5, 'fd-sanctum': -2.5,
    'fd-sell': -2, 'fd-setdown': 2.5, 'fd-smite': 0.5, 'fd-soldier-heal': 9.5,
    'fd-soldier-shot': 12, 'fd-soldier-swing': 4, 'fd-spire-bolt': 5.5, 'fd-spire-hit': 4.5,
    'fd-spit': 6, 'fd-stalker': 1.5, 'fd-starfall': 2, 'fd-step': 1.5,
    'fd-strike-claw': 7.5, 'fd-strike-dart': 7.5, 'fd-strike-shade': 7, 'fd-strike-slag': 4,
    'fd-strike-torch': 7, 'fd-tail-sweep': 1, 'fd-tower-fall': -2.5, 'fd-trap-arm': 3,
    'fd-trap-burst': 3.5, 'fd-tunnel-burrow': -0.5, 'fd-tunnel-surface': -1.5, 'fd-victory': -4.5,
    'fd-wall': -1, 'fd-wave': -7, 'fd-waystone-wake': -4, 'fd-whelps': 15,
    'fd-wick-breath': 0.5, 'fd-wick-eat': 5.5, 'fd-wick-glow': 2.5, 'fd-wick-lunge': 2,
    'fd-wild-boar': -4.5, 'fd-wild-howl': -6.5, 'fd-wild-return': -3.5, 'fd-wild-snap': 2,
    'fd-wild-stone': 2.5, 'fd-wild-wake': -3.5, 'fd-wild-wolf': -5, 'feast-chew': 6.5,
    'feast-clink': -5.5, 'feast-serve': -3.5, 'feast-sting': -2.5, 'fish-bite': 3,
    'fish-cast': 1.5, 'fish-catch': -3, 'fish-lost': -0.5, 'fish-reel': -0.5,
    'gloom-hollow-off': -2, 'gloom-hollow-on': 2, 'hd-bell': 0.5, 'hd-blade-out': -2.5,
    'hd-freeze': -2, 'hd-frost-hit': 2, 'hd-kneel': -1.5, 'hd-lie': -1,
    'hd-open-2': -2, 'hd-palm-open': -4, 'hd-pillar': -0.5, 'hd-shard': -1,
    'hd-thaw': 3, 'hd-wing': 5.5, 'heal-land': -2.5, 'hit-confirm': 5.5,
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
    'step-wood': 1.5, 'story-page': 3.5, 'sv-anvil-rise': 3.5, 'sv-anvil-strike': -1.5,
    'sv-bite': 1, 'sv-boil': 3.5, 'sv-burnback': 0.5, 'sv-call-archmage': 0.5,
    'sv-call-brannoc': 2.5, 'sv-call-corvane': -1, 'sv-call-grubnak': 0.5, 'sv-call-hollowking': 1.5,
    'sv-call-hydra': -3, 'sv-call-morrowoak': 0.5, 'sv-call-skitterra': 3, 'sv-call-titan': 1,
    'sv-call-volkar': 1, 'sv-call-wyrm': -3, 'sv-crescent-fan': -0.5, 'sv-crumble': -3.5,
    'sv-cut': -2, 'sv-dance-cut': 0.5, 'sv-dance-cut2': 1, 'sv-dance-image': -1,
    'sv-descent': -1.5, 'sv-dive-fall': -2, 'sv-dive-line': 1, 'sv-drift-loop': -11,
    'sv-emberfall-below': -1, 'sv-everyname': -0.5, 'sv-fore-ghost': 0.5, 'sv-gutter': 1,
    'sv-head-rise': -2, 'sv-heart-breath': 6, 'sv-heart-loop': -14, 'sv-hole-fall': -4.5,
    'sv-hole-town': 0.5, 'sv-lance-dash': -1, 'sv-lantern-down': 0.5, 'sv-lantern-fly': 7,
    'sv-lie-bell': -2.5, 'sv-pillar': -2, 'sv-proc-burst': -1, 'sv-pyre-cut': 1.5,
    'sv-rebirth-blast': -1, 'sv-rebirth-choir': -1.5, 'sv-rebirth-draw': -1.5, 'sv-rebirth-halo': -1,
    'sv-rebirth-sky': -2, 'sv-relight': -0.5, 'sv-sapling-arrive': -3, 'sv-sapling-creak': 2.5,
    'sv-sapling-die': -4, 'sv-seal-shatter': -1.5, 'sv-seed-burst': -1.5, 'sv-seed-pulse': 2,
    'sv-signal': -3, 'sv-stance-comet': -1, 'sv-stance-crane': 0.5, 'sv-stance-parting': 4,
    'sv-steam-burst': -1, 'sv-twin-bloom': -2, 'sv-twin-bolt': 3.5, 'sv-twin-fire': -0.5,
    'sv-twin-meet': -0.5, 'sv-twin-shift': 3.5, 'sv-twin-void': -0.5, 'sv-wall-fire': -0.5,
    'sv-wall-out': 0.5, 'sv-water-hiss': -1.5, 'sv-wheel-clang': 3, 'sv-wheel-loop': -10,
    'sv-wheel-throw': 1, 'sv-wipe-chord': -1.5, 'tg-aoe': 1.5, 'tg-buster': 1,
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
    'ult-tidecaller': -2, 'wall-break': -1.5, 'wall-caelum-break': -1, 'wall-caelum-seal': -1.5,
    'wall-caelum-vigil': -19.5, 'wall-corvane-kneel': -1.5, 'wall-corvane-rise': -1, 'wall-corvane-take': 1,
    'wall-corvane-toll': -18.5, 'wall-hydra-break': -2, 'wall-hydra-heart': -11.5, 'wall-hydra-up': -3,
    'wall-morrowoak-gulp': -13, 'wall-morrowoak-out': -0.5, 'wall-morrowoak-up': -2, 'wall-titan-break': -1,
    'wall-titan-up': -3, 'wall-titan-wind': -5.5, 'wall-up': -3.5, 'wall-wyrm-close': -1.5,
    'wall-wyrm-fall': -1.5, 'wall-wyrm-heart': -12, 'wall-wyrm-open': -3.5, 'wall-wyrm-rise': -0.5,
    'wall-wyrm-storm': -11, 'waymark': 11.5, 'wipe': -2,
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
  // a wall goes up: the boss is sealed (main.js wallEdge). A pull inward, the seal slammed home, chains running through it, and a low chord held under
  def('wall-up', 'sting', S => {
    S.space('hall', 0.55);
    S.whoosh({ f: 3200, f1: 180, dur: 0.42, peakAt: 0.9, peak: 0.34, q: 1.1 });
    S.thud({ at: 0.4, f: 66, f1: 24, dur: 1.8, drive: 3, peak: 0.62, sub: 0.22 });
    S.crack({ at: 0.4, f: 1800, peak: 0.34 });
    S.metal({ at: 0.4, set: 'plate', f: 300, dur: 1.5, peak: 0.26 });
    S.metal({ at: 0.43, set: 'bar', f: 520, dur: 0.9, peak: 0.1 });
    [0.5, 0.58, 0.64, 0.74, 0.8, 0.9].forEach((at, i) => S.metal({ at, set: 'coin', f: 1500 + (i % 3) * 420 + S.rr(-80, 80), dur: 0.16, peak: 0.13, pan: S.rr(-0.7, 0.7) }));
    S.rumble({ at: 0.4, dur: 2.4, f: 110, peak: 0.18, a: 0.05 });
    S.pad({ at: 0.4, notes: [mf(38), mf(45), mf(50), mf(57)], type: 'tri', a: 0.18, dur: 2.4, lpEnv: [2200, 1500, 500, 0.2], peak: 0.2 });
    S.choir({ at: 0.55, notes: [mf(50), mf(57)], vowel: 'o', dur: 2.0, a: 0.5, peak: 0.07 });
    [84, 88, 91].forEach((n, i) => S.glass({ at: 0.46 + i * 0.07, f: mf(n), dur: 1.3, peak: 0.12, pan: (i - 1) * 0.5 }));
  });
  // a wall breaks: the seal gives (a crack, glass shattering outward, a boom) and a clean chord rises where the weight was
  def('wall-break', 'imp', S => {
    S.space('hall', 0.5);
    S.crack({ f: 2400, peak: 0.55 });
    S.thud({ at: 0.03, f: 90, f1: 30, dur: 1.4, drive: 2.6, peak: 0.6, sub: 0.2 });
    S.whoosh({ at: 0.05, f: 500, f1: 6000, dur: 0.5, peakAt: 0.2, peak: 0.3 });
    for (let i = 0; i < 12; i++) S.glass({ at: 0.02 + i * 0.035 + S.rr(0, 0.03), f: S.rr(2400, 6200), dur: 0.5, peak: 0.09 + 0.04 * Math.random(), pan: S.rr(-0.8, 0.8) });
    S.metal({ at: 0.04, set: 'plate', f: 520, dur: 0.8, peak: 0.2 });
    S.noise({ at: 0.05, hp: 5000, dur: 0.9, grain: 0.8, pts: [[0.05, 1], [0.9, 0]], peak: 0.1 });
    S.rumble({ at: 0.05, dur: 1.4, f: 150, peak: 0.24, a: 0.04 });
    S.pad({ at: 0.3, notes: [mf(50), mf(57), mf(62), mf(66)], type: 'tri', a: 0.1, dur: 1.9, lp: 2600, peak: 0.14 });
    [86, 90, 93].forEach((n, i) => S.glass({ at: 0.34 + i * 0.06, f: mf(n), dur: 1.2, peak: 0.05 }));
  });
  // ---------------------------------------------------------------------------------------------- the walls' own moments (wall-fx.js, walls/<boss>.js)
  // Each sealed boss has its own sounds for the seal going up, the held bed while it holds, and the break. Kept per boss in the slots below.
  // @@WALL-wyrm
  // Vhalgrath's Ember Heart: his chest splits open (a crust cracking, a gout of fire roaring up, the first great beat), the heart beating under the
  // fight while he is sealed, and the Heart slamming shut (two last beats, the crust closing with a crack, steam). His Last Ember: the crater's
  // fire drawn up into him on a rising storm, and the fall that ends it.
  const wyrmHeartBuf = ctx => makeBuf(ctx, 'wyrmheart', 1.25, 1, (d, sr, r) => {
    const beat = (at, f0, f1, dec, amp) => {
      const i0 = Math.floor(at * sr), N = Math.floor(dec * 7 * sr); let ph = 0, lp = 0;
      // (a body under the beat, and a soft knock on top so it still reads on small speakers)
      for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr, f = f1 + (f0 - f1) * Math.exp(-tt / 0.05); ph += TAU * f / sr; lp += 0.08 * ((r() * 2 - 1) - lp); d[i0 + j] += amp * (Math.sin(ph) + 0.25 * Math.sin(ph * 2.02) + 0.12 * Math.sin(ph * 3.9) * Math.exp(-tt / 0.04) + 1.6 * lp * Math.exp(-tt / 0.018)) * Math.exp(-tt / dec) * Math.min(1, j / 60); }
    };
    beat(0.01, 58, 30, 0.13, 1); beat(0.33, 66, 36, 0.1, 0.75);
    normPeak(d, 0.95);
  });
  def('wall-wyrm-open', 'sting', S => {
    S.space('cave', 0.55);
    S.crack({ f: 900, peak: 0.42 });
    S.crackle({ at: 0.02, f: 1800, dens: 1.4, dur: 0.6, peak: 0.22 });
    S.thud({ at: 0.04, f: 62, f1: 26, dur: 1.6, drive: 3.4, peak: 0.85, sub: 0.35 });
    S.noise({ at: 0.06, color: 'brown', bp: 120, bp1: 1700, q: 0.7, dur: 1.5, a: 0.15, pts: [[0.25, 1], [1.5, 0]], peak: 0.4 });
    S.whoosh({ at: 0.05, color: 'brown', f: 180, f1: 2400, dur: 0.9, peakAt: 0.3, peak: 0.32 });
    S.rumble({ at: 0.05, dur: 2.6, f: 120, peak: 0.3, a: 0.1 });
    S.thud({ at: 0.75, f: 54, f1: 28, dur: 0.9, drive: 2.4, peak: 0.6, click: 0 });
    S.thud({ at: 1.08, f: 62, f1: 32, dur: 0.7, drive: 2.2, peak: 0.42, click: 0 });
    S.pad({ at: 0.1, notes: [mf(33), mf(40), mf(45)], type: 'saw', a: 0.4, dur: 2.6, det: 8, lpEnv: [300, 1400, 500, 0.4], peak: 0.16 });
    S.choir({ at: 0.35, notes: [mf(45), mf(52)], vowel: 'o', dur: 2.2, a: 0.6, lp: 1600, peak: 0.07 });
  });
  loop('wall-wyrm-heart', 'loop', L => {
    // the Ember Heart beating (period 1.25 s / 0.92: wall-fx's walls/wyrm.js keeps time with it from the first beat), a low fire breathing under it
    L.c(L.src(wyrmHeartBuf(L.ctx), 0.92, 0), L.f('lowpass', 900, 0.5), L.g(1.0), L.out);
    const fire = L.g(0.05); L.c(L.src('brown'), L.f('lowpass', 420), fire); L.lfo(fire.gain, 0.73, 0.03); L.c(fire, L.out);
    const drone = L.g(0.05); [36.7, 37.1].forEach(f => L.c(L.osc('sine', f), drone)); L.c(drone, L.out);
  }, 0.25);
  def('wall-wyrm-close', 'imp', S => {
    S.space('cave', 0.55);
    S.thud({ f: 60, f1: 28, dur: 0.8, drive: 2.8, peak: 0.7, click: 0 });
    S.thud({ at: 0.3, f: 70, f1: 30, dur: 1.3, drive: 3.4, peak: 0.85, sub: 0.3 });
    S.crack({ at: 0.31, f: 700, peak: 0.45 });
    S.crackle({ at: 0.32, f: 1200, dens: 0.9, dur: 0.5, peak: 0.2 });
    S.metal({ at: 0.31, set: 'plate', f: 140, dur: 0.9, peak: 0.16 });
    S.sizzle({ at: 0.38, dur: 1.6, pts: [[0.1, 1], [1.6, 0]], peak: 0.16 });
    S.whoosh({ at: 0.36, color: 'white', f: 3000, f1: 900, dur: 1.4, peakAt: 0.12, peak: 0.12 });
    S.rumble({ at: 0.3, dur: 1.6, f: 110, peak: 0.26, a: 0.03 });
    S.pad({ at: 0.45, notes: [mf(38), mf(45), mf(50), mf(54)], type: 'tri', a: 0.15, dur: 1.9, lp: 1800, peak: 0.13 });
  });
  def('wall-wyrm-rise', 'sting', S => {
    S.space('cave', 0.6);
    S.whoosh({ color: 'brown', f: 90, f1: 700, dur: 0.7, peakAt: 0.6, peak: 0.4 });
    S.thud({ at: 0.42, f: 48, f1: 26, dur: 1.2, drive: 2.6, peak: 0.55, click: 0 });
    S.whoosh({ at: 0.9, color: 'brown', f: 90, f1: 700, dur: 0.6, peakAt: 0.6, peak: 0.32 });
    S.noise({ at: 0.2, color: 'brown', bp: 200, bp1: 2600, q: 0.6, dur: 2.6, a: 2.2, pts: [[2.4, 1], [2.6, 0.6]], peak: 0.32 });
    S.crackle({ at: 0.6, f: 2200, dens: 1.6, dur: 2.0, a: 1.6, peak: 0.16 });
    S.pad({ at: 0.3, notes: [mf(36), mf(43), mf(48), mf(51)], type: 'saw', a: 2.0, swell: true, dur: 2.6, det: 10, lpEnv: [300, 2600, 900, 0.85], peak: 0.16 });
  });
  loop('wall-wyrm-storm', 'loop', L => {
    // the Last Ember: a firestorm turning over the crater, crackling, a low wind under it
    const roar = L.g(0.5), bp = L.f('bandpass', 380, 0.7); L.c(L.src('brown'), bp, roar, L.out); L.lfo(bp.frequency, 0.21, 120); L.lfo(roar.gain, 0.37, 0.15);
    const cr = L.g(0.18); L.c(L.crackle(1.3), L.f('bandpass', 1900, 0.7), cr, L.out);
    const lo = L.g(0.08); [43.6, 44.2].forEach(f => L.c(L.osc('sine', f), lo)); L.c(lo, L.out);
  }, 1.2);
  def('wall-wyrm-fall', 'imp', S => {
    S.space('cave', 0.6);
    S.thud({ f: 52, f1: 22, dur: 2.0, drive: 4, peak: 0.95, sub: 0.4 });
    S.crack({ at: 0.01, f: 800, peak: 0.5 });
    S.crackle({ at: 0.02, f: 1500, dens: 1.2, dur: 0.9, peak: 0.24 });
    S.noise({ at: 0.02, color: 'brown', lp: 900, lp1: 160, fd: 2.4, dur: 2.6, a: 0.01, pts: [[0.05, 1], [2.6, 0]], peak: 0.42 });
    S.rumble({ at: 0.02, dur: 3.0, f: 100, peak: 0.34, a: 0.02 });
    S.choir({ at: 0.4, notes: [mf(45), mf(52), mf(57), mf(60)], vowel: 'a', vowel1: 'o', dur: 3.2, a: 0.4, lp: 3200, peak: 0.09 });
    S.pad({ at: 0.3, notes: [mf(33), mf(45), mf(52), mf(57)], type: 'tri', a: 0.3, dur: 3.2, lp: 2000, peak: 0.16 });
    [81, 76, 72].forEach((m, i) => S.bell({ at: 0.6 + i * 0.22, f: mf(m), dur: 2.2, peak: 0.05, lp: 5000 }));
  });
  // @@WALL-titan (its recipes go right under this line)
  // Hrimgar's Plateau Tips: the glacier groans as the plateau tips under the fight (a great ice-sheet creaking, his fist on the ice, a crack running
  // away across it, a cold chord from the aurora), the held bed of wind and singing ice while he is sealed, and the rime shell round him
  // bursting (glass raining, the cold let go in one breath, the aurora's chord opening).
  def('wall-titan-up', 'sting', S => {
    S.space('hall', 0.6);
    S.creak({ f: 24, f1: 9, res: [95, 190, 430], q: 9, dur: 2.2, a: 0.1, pts: [[0.4, 0.6], [1.3, 1], [2.2, 0]], lp: 1100, peak: 0.34 });
    S.thud({ at: 0.04, f: 58, f1: 24, dur: 1.4, drive: 3.2, peak: 0.85, sub: 0.35 });
    S.crack({ at: 0.05, f: 1300, peak: 0.45, dur: 0.18 });
    S.crackle({ at: 0.08, dens: 3.5, f: 5600, dur: 1.4, pts: [[0.03, 1], [0.5, 0.7], [1.4, 0]], peak: 0.2 });
    for (let i = 0; i < 6; i++) S.glass({ at: 0.1 + Math.pow(S.r(), 1.4) * 0.5, f: S.rr(2400, 6200), dur: S.rr(0.3, 0.6), peak: 0.07, pan: S.rr(-0.5, 0.5) });
    S.whoosh({ at: 0.1, color: 'pink', f: 160, f1: 3000, dur: 1.2, peakAt: 0.45, peak: 0.3 });
    S.tone({ at: 0.2, f: 78, f1: 34, dur: 1.9, a: 0.05, peak: 0.28 });
    S.voice({ at: 0.25, f: 44, f1: 38, dur: 2.0, vowel: 'o', vowel1: 'a', breath: 5, peak: 0.22, lp: 2400, pts: [[0.35, 1], [2.0, 0]] });
    S.pad({ at: 0.35, notes: [mf(45), mf(52), mf(57)], type: 'tri', a: 0.5, dur: 2.4, lp: 1800, peak: 0.13 });
    [81, 86, 88].forEach((n, i) => S.glass({ at: 0.9 + i * 0.1, f: mf(n), dur: 1.5, peak: 0.05, am: [5, 0.3] }));
  });
  loop('wall-titan-wind', 'loop', L => {
    // the sealed plateau: a cold wind over the ice, a thin whistle that comes and goes, the aurora's faint hum, and now and then the ice ticking
    const wind = L.g(0.26), bp = L.f('bandpass', 700, 0.55); L.c(L.src('pink'), bp, wind, L.out); L.lfo(bp.frequency, 0.13, 260); L.lfo(wind.gain, 0.23, 0.1);
    const wh = L.g(0.05), wb = L.f('bandpass', 2300, 7); L.c(L.src('white'), wb, wh, L.out); L.lfo(wb.frequency, 0.17, 700); L.lfo(wh.gain, 0.29, 0.04);
    const hum = L.g(0.022); [174.6, 261.6, 349.2].forEach((f, i) => { L.c(L.osc('sine', f, i * 4 - 4), hum); }); L.lfo(hum.gain, 0.31, 0.012); L.c(hum, L.out);
    const tk = L.g(0.1); L.c(L.crackle(0.35), L.f('bandpass', 5200, 1.2), tk, L.out);
    const lo = L.g(0.04); [41.2, 41.6].forEach(f => L.c(L.osc('sine', f), lo)); L.c(lo, L.out);
  }, 1.2);
  def('wall-titan-break', 'imp', S => {
    S.space('hall', 0.55);
    S.thud({ f: 52, f1: 22, dur: 1.8, drive: 3.8, peak: 0.9, sub: 0.4 });
    S.crack({ at: 0.01, f: 1500, peak: 0.5, dur: 0.2 });
    for (let i = 0; i < 14; i++) S.glass({ at: Math.pow(S.r(), 1.5) * 0.45, f: S.rr(2000, 6800), dur: S.rr(0.3, 0.7), peak: 0.07, pan: S.rr(-0.6, 0.6) });
    S.crackle({ at: 0.02, dens: 4, f: 6000, dur: 1.1, pts: [[0.03, 1], [1.1, 0]], peak: 0.22 });
    S.noise({ at: 0.02, hp: 5000, dur: 0.7, grain: 0.8, pts: [[0.03, 1], [0.7, 0]], peak: 0.16 });
    S.whoosh({ at: 0.06, color: 'white', f: 3600, f1: 700, dur: 1.5, peakAt: 0.15, peak: 0.2 });
    S.rumble({ at: 0.02, dur: 2.8, f: 90, peak: 0.3, a: 0.03 });
    S.choir({ at: 0.45, notes: [mf(45), mf(52), mf(57)], vowel: 'a', vowel1: 'o', dur: 3.0, a: 0.5, lp: 3000, peak: 0.08 });
    [81, 86, 91, 93].forEach((n, i) => S.bell({ at: 0.5 + i * 0.16, f: mf(n), dur: 2.4, peak: 0.05, lp: 6000 }));
  });

  // @@WALL-hydra (its recipes go right under this line)
  // The Mother's Heart: her chest opens on a gold light (a bronze gong, water thrown up round her, the first great beats), the Heart beating
  // slow and wet under the fight while she is sealed (a drowned bronze hum under it), and the seal breaking (two last beats, the Heart slamming
  // shut with a crack of brass, a wave thrown out over the pool, a long breath out).
  const hydraHeartBuf = ctx => makeBuf(ctx, 'hydraheart', 1.848, 1, (d, sr, r) => {   // (1.848 s = 2 pi / 3.4, the beat of the glow in her chest: walls/hydra.js keeps time with it)
    const beat = (at, f0, f1, dec, amp) => {
      const i0 = Math.floor(at * sr), N = Math.floor(dec * 7 * sr); let ph = 0;
      for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr, f = f1 + (f0 - f1) * Math.exp(-tt / 0.06); ph += TAU * f / sr; d[i0 + j] += amp * (Math.sin(ph) + 0.2 * Math.sin(ph * 2.01)) * Math.exp(-tt / dec) * Math.min(1, j / 70); }
    };
    beat(0.01, 52, 28, 0.15, 1); beat(0.36, 58, 31, 0.11, 0.7);
    // the water answering each beat: a slow, dark swell of brown noise behind it
    let lp = 0;
    for (const [at, amp] of [[0.03, 0.22], [0.38, 0.14]]) {
      const i0 = Math.floor(at * sr), N = Math.floor(0.5 * sr);
      for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr; lp += 0.012 * ((r() * 2 - 1) - lp); d[i0 + j] += amp * lp * 9 * Math.sin(Math.PI * Math.min(1, tt / 0.5)) * Math.exp(-tt / 0.22); }
    }
    normPeak(d, 0.95);
  });
  def('wall-hydra-up', 'sting', S => {
    S.space('hall', 0.65);
    S.crack({ f: 800, peak: 0.4 });
    S.thud({ at: 0.03, f: 58, f1: 24, dur: 1.7, drive: 3.2, peak: 0.85, sub: 0.32 });
    S.metal({ at: 0.02, set: 'plate', f: 130, dur: 2.8, peak: 0.2 });
    S.bell({ at: 0.04, f: mf(43), dur: 3.2, peak: 0.12, lp: 3200 });
    S.noise({ at: 0.05, color: 'brown', bp: 140, bp1: 1900, q: 0.6, dur: 1.5, a: 0.1, pts: [[0.3, 1], [1.5, 0]], peak: 0.36 });
    S.whoosh({ at: 0.04, color: 'pink', f: 300, f1: 3200, dur: 0.7, peakAt: 0.22, peak: 0.2 });
    S.bubbles({ at: 0.12, n: 16, f: 260, f1: 1200, spread: 1.0, size: 0.05, peak: 0.1 });
    S.rumble({ at: 0.05, dur: 2.6, f: 90, peak: 0.28, a: 0.1 });
    S.thud({ at: 0.72, f: 52, f1: 27, dur: 0.9, drive: 2.4, peak: 0.6, click: 0 });
    S.thud({ at: 1.06, f: 58, f1: 30, dur: 0.7, drive: 2.2, peak: 0.42, click: 0 });
    S.pad({ at: 0.15, notes: [mf(31), mf(38), mf(43), mf(47)], type: 'tri', a: 0.5, dur: 2.6, lp: 1500, peak: 0.14 });
    S.choir({ at: 0.45, notes: [mf(38), mf(45)], vowel: 'o', dur: 2.2, a: 0.7, lp: 1700, peak: 0.07 });
  });
  loop('wall-hydra-heart', 'loop', L => {
    // the Mother's Heart beating (period 1.848 s: walls/hydra.js starts it on a beat of the glow in her chest and keeps time with it), the water
    // moving slowly round her, and a drowned bronze hum under both
    L.c(L.src(hydraHeartBuf(L.ctx), 1, 0), L.f('lowpass', 330), L.g(1.0), L.out);
    const wet = L.g(0.1), wf = L.f('lowpass', 520, 0.7); L.c(L.src('brown'), wf, wet, L.out); L.lfo(wf.frequency, 0.16, 140); L.lfo(wet.gain, 0.23, 0.04);
    const hum = L.g(0.045); [49, 49.4, 98.3].forEach(f => L.c(L.osc('sine', f), hum)); L.lfo(hum.gain, 0.11, 0.02); L.c(hum, L.out);
    const br = L.g(0.012), bf = L.f('lowpass', 700, 0.8); [mf(50), mf(50) * 1.006, mf(57)].forEach(f => L.c(L.osc('triangle', f), br)); L.lfo(br.gain, 0.13, 0.006); L.c(br, bf, L.out);
  }, 0.3);
  def('wall-hydra-break', 'imp', S => {
    S.space('hall', 0.65);
    S.thud({ f: 56, f1: 28, dur: 0.8, drive: 2.8, peak: 0.7, click: 0 });
    S.thud({ at: 0.3, f: 62, f1: 24, dur: 2.0, drive: 3.8, peak: 0.95, sub: 0.35 });
    S.crack({ at: 0.3, f: 1600, peak: 0.5 });
    S.metal({ at: 0.31, set: 'plate', f: 190, dur: 2.4, peak: 0.24 });
    S.metal({ at: 0.32, set: 'plate', f: 540, dur: 1.0, peak: 0.12 });
    for (let i = 0; i < 9; i++) S.glass({ at: 0.31 + i * 0.045 + S.rr(0, 0.03), f: S.rr(2200, 5400), dur: 0.5, peak: 0.07 + 0.03 * Math.random(), pan: S.rr(-0.8, 0.8) });
    S.whoosh({ at: 0.3, color: 'pink', f: 500, f1: 4200, dur: 0.7, peakAt: 0.18, peak: 0.3 });
    S.noise({ at: 0.31, color: 'pink', bp: 1400, bp1: 500, q: 0.7, dur: 1.2, a: 0.01, pts: [[0.06, 1], [1.2, 0]], peak: 0.3 });
    S.bubbles({ at: 0.4, n: 26, f: 500, f1: 2400, spread: 1.4, size: 0.035, peak: 0.08, bias: 1.6 });
    S.rumble({ at: 0.3, dur: 2.8, f: 80, peak: 0.3, a: 0.04 });
    S.pad({ at: 0.45, notes: [mf(38), mf(45), mf(50), mf(54)], type: 'tri', a: 0.2, dur: 2.8, lp: 2200, peak: 0.14 });
    S.choir({ at: 0.55, notes: [mf(45), mf(52), mf(57), mf(62)], vowel: 'a', vowel1: 'o', dur: 3.0, a: 0.5, lp: 3000, peak: 0.08 });
    [81, 76, 73].forEach((m, i) => S.bell({ at: 0.8 + i * 0.22, f: mf(m), dur: 2.0, peak: 0.045, lp: 5000 }));
  });

  // @@WALL-corvane (its recipes go right under this line)
  // Corvane's Vigil: he goes to a knee and the pass holds its breath (the wind drops away, the blade laid down, frost forming), a low bell tolling
  // under the fight while he keeps his watch (walls/corvane.js keeps time with it), a flame taken for each wisp that reaches him, and the rime
  // bursting off him as he rises with the blade drawn clean and the wind coming back.
  const cvTollBuf = ctx => makeBuf(ctx, 'cvtoll', 4.0, 1, (d, sr, r) => {
    // a low temple bell struck once a period (felt mallet, long tail that wraps round into the next strike)
    const n = d.length, F = 147;
    const part = (ratio, amp, dec) => { const w = TAU * F * ratio / sr, N = Math.floor(dec * 5 * sr); for (let j = 0; j < N; j++) d[j % n] += amp * Math.sin(w * j) * Math.exp(-j / sr / dec) * Math.min(1, j / 80); };
    part(0.5, 0.55, 2.8); part(1, 0.8, 2.4); part(1.19, 0.4, 1.6); part(1.5, 0.28, 1.3); part(2, 0.34, 1.1); part(2.51, 0.14, 0.7); part(3.0, 0.1, 0.5); part(4.17, 0.05, 0.3);
    part(0.5 * 1.004, 0.3, 2.4); part(1.003, 0.35, 2.0);   // (the slow beating of a real bell)
    let lp = 0; for (let j = 0; j < Math.floor(0.06 * sr); j++) { lp += 0.08 * ((r() * 2 - 1) - lp); d[j] += lp * 1.2 * Math.exp(-j / sr / 0.014); }   // (the mallet)
    normPeak(d, 0.9);
  });
  def('wall-corvane-kneel', 'sting', S => {
    S.space('hall', 0.5);
    S.whoosh({ color: 'pink', f: 2800, f1: 200, dur: 1.5, peakAt: 0.12, peak: 0.3, q: 0.9 });
    S.noise({ at: 0.1, color: 'white', hp: 4200, dur: 1.4, a: 0.02, pts: [[0.05, 0.6], [1.4, 0]], grain: 0.5, peak: 0.06 });
    S.metal({ at: 0.46, set: 'plate', f: 230, dur: 1.2, peak: 0.16, click: 0.3 });
    S.metal({ at: 0.5, set: 'bar', f: 740, dur: 0.9, peak: 0.07 });
    S.thud({ at: 0.5, f: 56, f1: 28, dur: 1.4, drive: 2.2, peak: 0.55, sub: 0.25, click: 0 });
    S.rumble({ at: 0.5, dur: 2.2, f: 90, peak: 0.12, a: 0.05 });
    [88, 93, 97].forEach((n, i) => S.glass({ at: 0.62 + i * 0.13, f: mf(n), dur: 1.6, peak: 0.06, pan: (i - 1) * 0.5 }));
    S.choir({ at: 0.6, notes: [mf(50), mf(57)], vowel: 'u', dur: 2.6, a: 0.8, lp: 1500, peak: 0.07 });
    S.pad({ at: 0.5, notes: [mf(38), mf(45), mf(50)], type: 'tri', a: 0.5, dur: 2.6, lpEnv: [900, 1200, 400, 0.8], peak: 0.13 });
  });
  loop('wall-corvane-toll', 'loop', L => {
    // the Vigil's bell (period 4.0 s: walls/corvane.js keeps time from the first strike), a thin wind a long way off, a cold drone under both
    L.c(L.src(cvTollBuf(L.ctx), 1, 0), L.f('lowpass', 2200), L.g(1.0), L.out);
    const wind = L.g(0.09), bp = L.f('bandpass', 420, 0.8); L.c(L.src('brown'), bp, wind, L.out); L.lfo(bp.frequency, 0.09, 140); L.lfo(wind.gain, 0.13, 0.05);
    const air = L.g(0.02); L.c(L.src('pink'), L.f('bandpass', 2600, 0.6), air, L.out); L.lfo(air.gain, 0.17, 0.014);
    const drone = L.g(0.04); [73.5, 110.25].forEach(f => L.c(L.osc('sine', f), drone)); L.c(drone, L.out);
  }, 0.05);
  def('wall-corvane-take', 'hud', S => {
    S.space('hall', 0.4);
    S.glass({ f: mf(88), dur: 1.0, peak: 0.1 });
    S.glass({ at: 0.08, f: mf(95), dur: 0.9, peak: 0.06, pan: 0.3 });
    S.tone({ f: mf(45), f1: mf(40), dur: 0.7, a: 0.01, peak: 0.1 });
    S.noise({ hp: 5200, dur: 0.4, a: 0.02, pts: [[0.1, 1], [0.4, 0]], peak: 0.03 });
  });
  def('wall-corvane-rise', 'imp', S => {
    S.space('hall', 0.5);
    S.crack({ f: 2600, peak: 0.5 });
    S.thud({ at: 0.02, f: 70, f1: 28, dur: 1.5, drive: 3, peak: 0.6, sub: 0.25 });
    S.bell({ at: 0.02, f: mf(45), dur: 3.0, peak: 0.2 });
    for (let i = 0; i < 12; i++) S.glass({ at: 0.03 + i * 0.04 + S.rr(0, 0.03), f: S.rr(3000, 7000), dur: 0.5, peak: 0.08 + 0.04 * Math.random(), pan: S.rr(-0.8, 0.8) });
    S.noise({ at: 0.06, bp: 1500, bp1: 7500, q: 3, dur: 0.4, a: 0.01, pts: [[0.05, 1], [0.4, 0]], peak: 0.2 });
    S.metal({ at: 0.08, set: 'bar', f: 2100, dur: 1.4, peak: 0.14 });
    S.metal({ at: 0.06, set: 'plate', f: 640, dur: 1.2, peak: 0.1 });
    S.whoosh({ at: 0.15, color: 'white', f: 400, f1: 5200, dur: 1.4, peakAt: 0.25, peak: 0.26 });
    S.rumble({ at: 0.04, dur: 1.6, f: 130, peak: 0.2, a: 0.04 });
    S.choir({ at: 0.35, notes: [mf(57), mf(64), mf(69)], vowel: 'a', vowel1: 'o', dur: 2.8, a: 0.35, lp: 3000, peak: 0.08 });
    S.pad({ at: 0.3, notes: [mf(45), mf(52), mf(57), mf(61)], type: 'tri', a: 0.2, dur: 2.6, lp: 2400, peak: 0.13 });
    S.bell({ at: 0.45, set: 'hand', f: mf(81), dur: 2.0, peak: 0.05 });
  });
  //
  //
  //

  // @@WALL-morrowoak (its recipes go right under this line)
  // Morrow-Oak's Swallowing: the grove's own fall already has an eight-second cast sound (bm-morrowoak-the-swallowing), so these three only frame it.
  // The seal going up (the world drawn in, one wooden gulp), the swallowing going on in him while the seal holds (a groan swelling to a low gulp
  // every 2.6 s; walls/morrowoak.js runs a ring of light down his trunk in time with it), and the Hunger letting go as the limbs tear out of the dark.
  const oakGulpBuf = ctx => makeBuf(ctx, 'oakgulp', 2.6, 1, (d, sr, r) => {
    let ph = 0, pg = 0, walk = 0, lp = 0, lw = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, tt = t - 1.5;
      lp += ((r() * 2 - 1) - lp) * 0.04; lw += ((r() * 2 - 1) - lw) * 0.35;
      if (t < 1.55) {   // the groan: a woody low tone swelling toward the gulp, its pitch shaken
        walk = walk * 0.995 + (r() - 0.5) * 0.06;
        ph += TAU * (58 + 30 * Math.pow(Math.min(1, t / 1.5), 2)) * (1 + walk) / sr;
        d[i] += Math.pow(Math.min(1, t / 1.5), 1.6) * 0.3 * (Math.sin(ph) + 0.6 * Math.sin(ph * 2.01) + 0.4 * Math.sin(ph * 3.02) + 0.22 * Math.sin(ph * 4.03));
      }
      if (tt >= 0) {   // the gulp (a low wooden knock, a wet click), and the air going back out after it
        pg += TAU * (40 + 48 * Math.exp(-tt / 0.05)) / sr;
        d[i] += (Math.sin(pg) + 0.25 * Math.sin(pg * 2.02)) * Math.exp(-tt / 0.16) * Math.min(1, tt * 400);
        d[i] += Math.sin(TAU * (120 + 70 * Math.exp(-tt / 0.03)) * tt) * Math.exp(-tt / 0.04) * 0.3 + lw * Math.exp(-tt / 0.03) * 0.25 + lp * Math.exp(-tt / 0.45) * 1.4;
      }
      d[i] *= Math.min(1, (d.length - i) / (0.15 * sr));
    }
    normPeak(d, 0.95);
  });
  def('wall-morrowoak-up', 'sting', S => {
    S.space('hall', 0.6);
    moVoid(S, 0, 0.9, 0.3, 800, 50);
    moCreak(S, 0.05, 1.7, 0.12, 0, 16, 8);
    S.thud({ at: 0.92, f: 50, f1: 22, dur: 1.7, drive: 3.2, peak: 0.8, sub: 0.3 });
    S.wood({ at: 0.92, f: 210, dur: 0.2, peak: 0.3, lp: 1600 });
    S.crack({ at: 0.92, f: 900, peak: 0.2, dur: 0.2 });
    S.rumble({ at: 0.9, dur: 2.2, f: 60, peak: 0.24, a: 0.05 });
    S.choir({ at: 1.0, notes: [mf(34), mf(41)], vowel: 'u', dur: 1.9, a: 0.5, lp: 700, peak: 0.06 });
  });
  loop('wall-morrowoak-gulp', 'loop', L => {
    L.c(L.src(oakGulpBuf(L.ctx), 1, 0), L.f('lowpass', 800), L.g(1.0), L.out);   // (a fixed start: the ring of light on his trunk keeps time with it)
    const air = L.g(0.05); L.c(L.src('brown'), L.f('lowpass', 360), air); L.lfo(air.gain, 0.31, 0.03); L.c(air, L.out);
    const lv = L.g(0.025); L.c(L.src('pink'), L.f('highpass', 3000), lv, L.out); L.lfo(lv.gain, 0.43, 0.02);
    const drone = L.g(0.05); [41.2, 41.7].forEach(f => L.c(L.osc('sine', f), drone)); L.c(drone, L.out);
  }, 0.3);
  def('wall-morrowoak-out', 'imp', S => {
    S.space('hall', 0.7);
    S.thud({ f: 48, f1: 20, dur: 1.8, drive: 3.6, peak: 0.85, sub: 0.3 });
    S.crack({ f: 1100, peak: 0.36, dur: 0.25 });
    [0.05, 0.16, 0.28, 0.4].forEach((at, i) => moRootTear(S, at, 0.3 + i * 0.02, (i - 1.5) * 0.5));   // (the limbs tearing out of the dark)
    S.noise({ at: 0.1, color: 'brown', bp: 200, bp1: 1800, q: 0.7, dur: 1.8, a: 0.1, pts: [[0.3, 1], [1.8, 0]], peak: 0.3 });
    S.whoosh({ at: 0.1, color: 'brown', f: 300, f1: 2600, dur: 1.2, peakAt: 0.3, peak: 0.26 });
    moLeaves(S, 0.2, 2.0, 0.16);
    S.rumble({ at: 0.05, dur: 2.6, f: 70, peak: 0.28, a: 0.05 });
    S.pad({ at: 0.35, notes: [mf(38), mf(45), mf(50), mf(57)], type: 'tri', a: 0.3, dur: 2.6, lp: 2000, peak: 0.14 });
    S.choir({ at: 0.45, notes: [mf(50), mf(57)], vowel: 'o', vowel1: 'a', dur: 2.4, a: 0.5, lp: 1800, peak: 0.07 });
    [79, 74, 70].forEach((m, i) => S.bell({ at: 0.7 + i * 0.2, f: mf(m), dur: 2.0, peak: 0.04, lp: 4500 }));
  });

  // @@WALL-caelum (its recipes go right under this line)
  // Caelum's Starwyrm: the seal as a held breath (the sky drawn in, a thin glass chime closing, then the light letting go: walls/caelum.js lays the flare of
  // the sky coming loose right after it), a bed of starlight twinkling while he is sealed (eight pings in a 6 s loop; walls/caelum.js lights a star of his
  // ring on each), and the ring coming apart in silver glass as the stars go back up.
  const caelumVigilBuf = ctx => makeBuf(ctx, 'caelumvigil', 6.0, 1, (d, sr) => {
    // [time, midi note]: keep in step with PINGS in walls/caelum.js
    const P = [[0.6, 88], [1.25, 91], [1.95, 93], [2.55, 86], [3.3, 96], [4.05, 98], [4.6, 94], [5.4, 84]];
    for (const [at, n] of P) {
      const f = mf(n), i0 = Math.floor(at * sr), N = Math.floor(3.2 * sr);
      for (let j = 0; j < N && i0 + j < d.length; j++) {
        const tt = j / sr, e = Math.min(1, j / 80) * Math.exp(-tt / 0.5);
        d[i0 + j] += e * (Math.sin(TAU * f * tt) + 0.35 * Math.sin(TAU * f * 2.76 * tt) * Math.exp(-tt / 0.18) + 0.12 * Math.sin(TAU * f * 5.4 * tt) * Math.exp(-tt / 0.08));
      }
    }
    normPeak(d, 0.9);
  }, 22050);
  def('wall-caelum-seal', 'sting', S => {
    S.space('hall', 0.75);
    // the breath in: the air pulled toward him and a glass shimmer swelling, then the chime that closes the seal (the sky's own flare follows)
    S.whoosh({ f: 6800, f1: 800, dur: 0.42, peakAt: 0.85, peak: 0.2, q: 1.2 });
    S.pad({ notes: [mf(81), mf(88), mf(93)], type: 'sine', a: 0.28, swell: true, dur: 0.7, lp: 6000, peak: 0.08 });
    S.thud({ at: 0.3, f: 58, f1: 26, dur: 1.3, drive: 2, peak: 0.42, click: 0 });
    [[81, 0.3, 0.18], [88, 0.33, 0.12], [93, 0.37, 0.09]].forEach(([n, at, pk], i) => S.glass({ at, f: mf(n), dur: 2.6, peak: pk, pan: (i - 1) * 0.35 }));
    S.bell({ at: 0.3, f: mf(69), dur: 2.8, peak: 0.07, lp: 3500 });
    S.rumble({ at: 0.3, dur: 1.8, f: 70, peak: 0.12, a: 0.1 });
    for (let i = 0; i < 9; i++) S.tone({ at: 0.45 + i * 0.13 + S.rr(0, 0.05), f: S.rr(3200, 7600), dur: 0.5, a: 0.003, peak: 0.028, pan: S.rr(-0.7, 0.7) });
  });
  loop('wall-caelum-vigil', 'loop', L => {
    // the sky held still: starlight twinkling over a hush (the buffer starts at a fixed offset so the picture keeps time with its pings)
    const tw = L.g(0.7); L.c(L.src(caelumVigilBuf(L.ctx), 1, 0), tw, L.out); L.verb('hall', 0.35, tw);
    const pad = L.g(0.05); [mf(57), mf(64)].forEach(f => L.c(L.osc('sine', f), L.f('lowpass', 900), pad)); L.lfo(pad.gain, 0.17, 0.025); L.c(pad, L.out);
    const air = L.g(0.015), bp = L.f('bandpass', 5200, 4); L.c(L.src('white'), bp, air, L.out); L.lfo(bp.frequency, 0.11, 900); L.lfo(air.gain, 0.19, 0.009);
    const lo = L.g(0.07); L.c(L.osc('sine', mf(31)), lo, L.out); L.lfo(lo.gain, 0.13, 0.03);
  }, 1.4);
  def('wall-caelum-break', 'imp', S => {
    S.space('hall', 0.6);
    // the ring of glass coming apart and the stars going back up: a crack, silver shards scattering, a struck chord, a rising release
    S.crack({ f: 3400, peak: 0.42 });
    S.thud({ at: 0.02, f: 72, f1: 30, dur: 1.2, drive: 2.2, peak: 0.5, sub: 0.2 });
    for (let i = 0; i < 14; i++) S.glass({ at: 0.01 + i * 0.03 + S.rr(0, 0.025), f: S.rr(2600, 7000), dur: 0.55, peak: 0.08 + 0.05 * Math.random(), pan: S.rr(-0.8, 0.8) });
    S.whoosh({ at: 0.04, f: 600, f1: 7200, dur: 0.75, peakAt: 0.25, peak: 0.26 });
    [[81, 0.06, 0.16], [88, 0.1, 0.12], [93, 0.15, 0.1]].forEach(([n, at, pk], i) => S.glass({ at, f: mf(n), dur: 2.4, peak: pk, pan: (i - 1) * 0.4 }));
    S.bell({ at: 0.06, f: mf(69), dur: 2.6, peak: 0.1, lp: 3800 });
    for (let i = 0; i < 10; i++) S.tone({ at: 0.2 + i * 0.08 + S.rr(0, 0.04), f: 2400 * Math.pow(2.7, i / 9) * S.rr(0.97, 1.03), dur: 0.45, a: 0.003, peak: 0.04, pan: S.rr(-0.7, 0.7) });
    S.pad({ at: 0.2, notes: [mf(57), mf(64), mf(69), mf(76)], type: 'tri', a: 0.12, dur: 2.2, lp: 3000, peak: 0.13 });
    S.choir({ at: 0.25, notes: [mf(69), mf(76)], vowel: 'a', dur: 2.4, a: 0.35, lp: 2600, peak: 0.05 });
  });
  //
  //
  //

  // @@WALL-sovereign (its recipes go right under this line)
  //
  //
  //

  // @@WALL-garrow (its recipes go right under this line)
  // Garrow's staged moments (walls/garrow.js): a hunter on a frozen lake, so cold and patient: soft thuds in snow, wind, ice, one long low note from far off. The entrance (the road's prints, the held beat,
  // his arrival), the whiteout (the flurry building, the wipe, the white taking him, his return), the enrage's long cold and its land, and the kill (he is called off, down the road). His casts and smaller
  // moves are the sound lane's (bm-garrow-*, bm-garrow-m-*).
  const gwwHowl = (S, at, dur, pk, f = 150) => {   // one long low note from far off: rising a little, then settling, a slap-back behind it and a thin edge of frost
    S.echo({ time: 0.8, fb: 0.4, lp: 1400, kill: at + dur + 3.4 });
    const d1 = dur * 0.6;
    S.voice({ at, f: f * 0.8, f1: f * 1.18, dur: d1, vowel: 'o', vowel1: 'u', breath: 1.1, lp: 2000, peak: pk, ech: 0.55, rev: 0.7, verb: 'cave', pts: [[0.4, 0.6], [d1 - 0.05, 1], [d1, 0]] });
    S.voice({ at: at + dur * 0.42, f: f * 1.18, f1: f * 0.74, dur: dur * 0.58, vowel: 'u', vowel1: 'o', breath: 1.1, lp: 1800, peak: pk * 0.9, ech: 0.55, rev: 0.7, verb: 'cave', pts: [[0.2, 0.9], [dur * 0.2, 1], [dur * 0.44, 0.5], [dur * 0.58, 0]] });
    S.tone({ at: at + 0.3, f: f * 7, f1: f * 9, dur: dur * 0.7, a: dur * 0.3, peak: pk * 0.04, ech: 0.6 });
  };
  def('bm-garrow-w-road', 'bm', S => {            // the first thing down the road: nine soft thuds in the snow, each a little nearer, a thin wind rising under them and a cold tone drawn tight
    S.space('hall', 0.4);
    S.noise({ color: 'pink', bp: 500, bp1: 1500, q: 0.6, dur: 2.4, a: 0.4, pts: [[0.6, 0.5], [1.8, 1], [2.4, 0]], peak: 0.07 });
    for (let i = 0; i < 9; i++) {
      const at = 0.2 + i * 0.2;
      S.thud({ at, f: 76 - 1.6 * i, f1: 40, dur: 0.5, drive: 1.3, peak: 0.07 + 0.012 * i, click: 0.15, sub: 0.1 });
      S.noise({ at, color: 'white', bp: 3000 + 160 * i, q: 1.2, dur: 0.12, a: 0.01, pts: [[0.02, 1], [0.12, 0]], peak: 0.03 + 0.004 * i });
    }
    S.tone({ f: mf(46), dur: 2.4, a: 0.8, peak: 0.05, pts: [[1.0, 0.3], [1.9, 1], [2.4, 0]] });
  });
  def('bm-garrow-w-hold', 'bm', S => {            // the held beat: a pale pair of tones beating slowly, drawn tight, and then nothing
    S.space('hall', 0.4);
    S.tone({ f: mf(70), dur: 1.4, peak: 0.05, pts: [[0.5, 0.45], [1.25, 1], [1.4, 0]] });
    S.tone({ f: mf(70), det: 7, dur: 1.4, peak: 0.05, pts: [[0.5, 0.45], [1.25, 1], [1.4, 0]] });
    S.tone({ f: mf(82), dur: 1.4, peak: 0.016, pts: [[0.8, 0.5], [1.25, 1], [1.4, 0]], pan: 0.4 });
  });
  def('bm-garrow-w-arrive', 'bm', S => {          // he is there: a deep soft knock under the ice, the ice cracking out in a ring, a long breath of mist, a low chord settling
    S.space('hall', 0.55);
    S.thud({ f: 62, f1: 26, dur: 1.5, drive: 2.2, peak: 0.55, sub: 0.3, click: 0.1 });
    S.crack({ f: 2400, peak: 0.28, dur: 0.5 });
    for (let i = 0; i < 7; i++) S.glass({ at: 0.04 + i * 0.06 + S.rr(0, 0.03), f: S.rr(2200, 6200), dur: S.rr(0.4, 0.9), peak: 0.05 + 0.03 * Math.random(), pan: S.rr(-0.8, 0.8) });
    S.noise({ color: 'pink', bp: 700, bp1: 280, q: 0.7, dur: 1.9, a: 0.2, pts: [[0.3, 1], [1.9, 0]], peak: 0.16 });
    S.rumble({ at: 0.05, dur: 2.2, f: 80, peak: 0.2, a: 0.05 });
    S.pad({ at: 0.4, notes: [mf(46), mf(53), mf(58)], type: 'tri', a: 0.5, dur: 2.8, lp: 2600, peak: 0.11 });
  });
  def('bm-garrow-w-drift', 'bm', S => {           // the Whiteout's wind: it climbs over the whole cast, howling higher and wider, and is cut dead where the cast ends (3.6 s; played faster for a shorter cast)
    S.space('hall', 0.4);
    S.noise({ color: 'pink', bp: 250, bp1: 2800, q: 0.6, dur: 3.6, a: 3.0, pts: [[3.3, 0.85], [3.5, 1], [3.58, 0]], peak: 0.12 });
    S.noise({ color: 'white', bp: 3800, bp1: 1800, q: 0.9, dur: 3.6, a: 3.1, pts: [[3.3, 0.6], [3.5, 1], [3.58, 0]], peak: 0.035 });
    S.tone({ f: mf(52), f1: mf(68), dur: 3.6, a: 3.0, peak: 0.045, pts: [[3.3, 0.7], [3.5, 1], [3.58, 0]] });
    S.rumble({ dur: 3.55, f: 60, peak: 0.1, a: 3.0 });
  });
  def('bm-garrow-w-wipe', 'bm', S => {            // the snow takes every track, the wind gone: a soft low settle into the quiet, one thin glass note
    S.space('hall', 0.45);
    S.thud({ at: 0.02, f: 70, f1: 36, dur: 0.9, drive: 1.1, peak: 0.2, click: 0, sub: 0.1 });
    S.noise({ color: 'pink', bp: 1400, bp1: 500, q: 0.8, dur: 0.6, a: 0.05, pts: [[0.15, 1], [0.6, 0]], peak: 0.05 });
    S.glass({ at: 0.15, f: mf(86), dur: 1.8, peak: 0.035 });
  });
  def('bm-garrow-w-vanish', 'bm', S => {          // he is gone into the white: the sound swallowed, a hush closing over it, a low note falling away under the snow
    S.space('hall', 0.5);
    S.noise({ color: 'pink', bp: 1900, bp1: 260, q: 0.7, dur: 1.8, a: 0.05, pts: [[0.1, 1], [1.8, 0]], peak: 0.17 });
    S.thud({ f: 58, f1: 24, dur: 1.4, drive: 1.8, peak: 0.34, sub: 0.2, click: 0.05 });
    S.whoosh({ f: 6000, f1: 400, dur: 0.9, peakAt: 0.15, peak: 0.12, q: 0.9 });
    S.tone({ f: mf(60), f1: mf(48), dur: 1.8, a: 0.1, peak: 0.06, pts: [[0.2, 1], [1.8, 0]] });
  });
  def('bm-garrow-w-return', 'bm', S => {          // he comes out of the white: a long low note from far off answering, the snow letting go with a breath, a soft chord opening
    S.space('cave', 0.6);
    gwwHowl(S, 0.15, 4.4, 0.2, 150);
    gwwHowl(S, 2.4, 3.0, 0.045, 130);
    S.noise({ color: 'pink', bp: 1200, bp1: 3000, q: 0.7, dur: 1.2, a: 0.12, pts: [[0.2, 1], [1.2, 0]], peak: 0.1 });
    S.thud({ at: 0.04, f: 66, f1: 30, dur: 0.9, drive: 1.5, peak: 0.28, click: 0.1 });
    S.rumble({ at: 0.2, dur: 4.2, f: 66, peak: 0.08, a: 1.0 });
  });
  def('bm-garrow-w-cold', 'bm', S => {            // the enrage's long cold: ice creeping in from every edge; one tone climbing, creaks of ice and a rising shimmer, over eight seconds
    S.space('hall', 0.5);
    S.pad({ notes: [mf(40), mf(47)], type: 'sine', a: 3.0, dur: 8.2, lp: 1600, peak: 0.08, pts: [[5.0, 0.5], [7.8, 1], [8.2, 0]] });
    S.tone({ f: mf(52), f1: mf(76), dur: 8.0, a: 4.0, peak: 0.05, pts: [[6.0, 0.5], [7.8, 1], [8.0, 0]] });
    S.noise({ color: 'pink', bp: 400, bp1: 2400, q: 0.7, dur: 8.0, a: 4.0, pts: [[6.0, 0.6], [7.8, 1], [8.0, 0]], peak: 0.08 });
    for (let i = 0; i < 14; i++) S.glass({ at: 0.5 + i * 0.5 + S.rr(0, 0.2), f: S.rr(2400, 7200), dur: S.rr(0.4, 1.0), peak: 0.03 + 0.004 * i, pan: S.rr(-0.9, 0.9) });
    S.rumble({ dur: 8.0, f: 54, peak: 0.1, a: 4.0 });
  });
  def('bm-garrow-w-enrage-land', 'bm', S => {     // Cold Trail lands: a huge flat boom, the whole lake cracking across, glass thrown, a low note held as the room goes out
    S.space('hall', 0.75);
    S.thud({ f: 58, f1: 20, dur: 2.0, drive: 3, peak: 0.95, sub: 0.45, click: 0.2 });
    S.crack({ f: 2800, peak: 0.42, dur: 0.6 });
    for (let i = 0; i < 20; i++) S.glass({ at: 0.01 + i * 0.05 + S.rr(0, 0.03), f: S.rr(1600, 6800), dur: S.rr(0.5, 1.1), peak: 0.07 + 0.05 * Math.random(), pan: S.rr(-0.9, 0.9) });
    S.whoosh({ at: 0.03, f: 300, f1: 6800, dur: 0.9, peakAt: 0.35, peak: 0.26, q: 0.9 });
    S.rumble({ at: 0.05, dur: 2.8, f: 90, peak: 0.3, a: 0.05 });
    S.pad({ at: 0.5, notes: [mf(40), mf(47), mf(52)], type: 'tri', a: 0.6, dur: 3.2, lp: 2200, peak: 0.12 });
  });
  def('bm-garrow-w-called', 'bm', S => {          // the kill: he is called off, not broken: the lake stills, a chain drawn taut and singing, one long note from far off going away down the road, the wind dying
    S.space('hall', 0.7);
    S.thud({ at: 0.02, f: 60, f1: 28, dur: 1.4, drive: 1.6, peak: 0.28, sub: 0.2, click: 0 });
    S.metal({ at: 0.9, f: 1300, dur: 1.4, peak: 0.1, click: 0.1 });
    S.tone({ at: 0.9, f: mf(80), f1: mf(86), dur: 2.4, a: 0.4, peak: 0.04, pts: [[0.6, 1], [2.4, 0]] });
    S.noise({ at: 0.1, color: 'pink', bp: 1400, bp1: 300, q: 0.7, dur: 3.2, a: 0.2, pts: [[0.4, 1], [3.2, 0]], peak: 0.1 });
    gwwHowl(S, 1.0, 4.6, 0.18, 140);
    S.bell({ at: 0.04, f: mf(36), dur: 5.4, peak: 0.26, lp: 2400 });
    S.pad({ at: 1.0, notes: [mf(46), mf(53), mf(58)], type: 'sine', a: 1.6, dur: 5.0, lp: 2400, peak: 0.07 });
  });

  // @@WALL-vesper (its recipes go right under this line)
  // Vesper's showpiece moments (walls/vesper.js): cool and quiet, struck glass and a held breath. The wall: a note for each soak met (the same recipe, climbing by its rate), the latch of the last, the
  // held beat (almost nothing), the riser of the turn and its release, the breath after. The line: the glass going dark, the plant, the Glass Knight stepping through. The dance's last cut, the enrage's
  // long build and its land, and the kill.
  def('bm-vesper-w-latch', 'bm', S => {           // the last soak met: a small bright catch, a deep knock, three panes struck climbing across the hall and the glass, the air drawn in
    S.space('hall', 0.75);
    S.metal({ f: 2100, dur: 0.28, peak: 0.16 });
    S.thud({ at: 0.02, f: 70, f1: 34, dur: 0.9, drive: 1.6, peak: 0.45, click: 0, sub: 0.3 });
    [[76, 0.04, 0.26], [88, 0.14, 0.22], [95, 0.26, 0.16]].forEach(([n, at, pk], i) => S.glass({ at, f: mf(n), dur: 3.2, peak: pk, pan: (i - 1) * 0.35 }));
    S.whoosh({ at: 0.05, f: 6200, f1: 900, dur: 0.6, peakAt: 0.3, peak: 0.12 });
  });
  def('bm-vesper-w-hold', 'bm', S => {            // the held beat: a pale pair of tones beating slowly, drawn tight, and then nothing
    S.space('hall', 0.5);
    S.tone({ f: mf(88), dur: 1.5, peak: 0.05, pts: [[0.55, 0.45], [1.35, 1], [1.5, 0]] });
    S.tone({ f: mf(88), det: 9, dur: 1.5, peak: 0.05, pts: [[0.55, 0.45], [1.35, 1], [1.5, 0]] });
    S.tone({ f: mf(100), dur: 1.5, peak: 0.018, pts: [[0.8, 0.5], [1.35, 1], [1.5, 0]], pan: 0.4 });
  });
  def('bm-vesper-w-turn', 'bm', S => {            // the mirror turns: a deep boom, the north glass coming apart in a rain, the pane of light swung through, the hall opening in a chord
    S.space('hall', 0.7);
    S.thud({ f: 66, f1: 24, dur: 1.9, drive: 3, peak: 0.9, sub: 0.4, click: 0.2 });
    S.crack({ f: 2600, peak: 0.4, dur: 0.5 });
    for (let i = 0; i < 18; i++) S.glass({ at: 0.01 + i * 0.045 + S.rr(0, 0.03), f: S.rr(1800, 6800), dur: S.rr(0.5, 1.1), peak: 0.07 + 0.05 * Math.random(), pan: S.rr(-0.9, 0.9) });
    S.whoosh({ at: 0.03, f: 300, f1: 7000, dur: 0.95, peakAt: 0.4, peak: 0.28, q: 0.9 });
    S.rumble({ at: 0.05, dur: 2.4, f: 120, peak: 0.28, a: 0.05 });
    S.pad({ at: 0.55, notes: [mf(52), mf(59), mf(64), mf(71)], type: 'tri', a: 0.5, dur: 3.0, lp: 3000, peak: 0.13 });
    [88, 95, 100].forEach((n, i) => S.glass({ at: 0.9 + i * 0.12, f: mf(n), dur: 2.4, peak: 0.06 }));
  });
  def('bm-vesper-w-breath', 'bm', S => {          // after the turn: the hall breathes out, a soft rush of air through a high pane and a low settling
    S.space('hall', 0.6);
    S.noise({ color: 'pink', bp: 2400, bp1: 900, q: 0.8, dur: 1.4, a: 0.25, pts: [[0.3, 1], [1.4, 0]], peak: 0.1 });
    S.tone({ f: mf(45), dur: 1.4, a: 0.2, peak: 0.08, pts: [[0.3, 1], [1.4, 0]] });
    S.glass({ at: 0.4, f: mf(83), dur: 2.2, peak: 0.05 });
  });
  def('bm-vesper-w-trade', 'bm', S => {           // Through the Glass, again: two panes passing, one note falling as another rises a step apart, a small low knock under them (smaller than the turn)
    S.space('hall', 0.65);
    S.glass({ f: mf(88), f1: mf(83), glide: 0.5, dur: 1.6, peak: 0.14, pan: -0.35 });
    S.glass({ at: 0.04, f: mf(81), f1: mf(86), glide: 0.5, dur: 1.6, peak: 0.14, pan: 0.35 });
    S.thud({ at: 0.02, f: 80, f1: 40, dur: 0.5, peak: 0.25, click: 0 });
    S.whoosh({ at: 0.02, f: 3000, f1: 1000, dur: 0.4, peakAt: 0.4, peak: 0.06 });
  });
  def('bm-vesper-w-dark', 'bm', S => {            // the glass going dark: its notes falling away one after another, an exhale, the low note thinning out
    S.space('hall', 0.75);
    [100, 95, 91, 88, 83, 76].forEach((n, i) => S.glass({ at: i * 0.3, f: mf(n), dur: 2.0, peak: 0.12 - 0.012 * i, pan: (i % 2 ? 0.3 : -0.3) }));
    S.noise({ color: 'brown', lp: 900, lp1: 160, dur: 2.2, a: 0.3, pts: [[0.4, 1], [2.2, 0]], peak: 0.2 });
    S.tone({ f: mf(33), dur: 2.4, a: 0.1, peak: 0.16, pts: [[0.2, 1], [2.4, 0]] });
  });
  def('bm-vesper-w-plant', 'bm', S => {           // the blade driven into the floor: a huge low knock, the blade ringing, the cracks running out, the line singing
    S.space('hall', 0.7);
    S.thud({ f: 74, f1: 28, dur: 2.2, drive: 3.4, peak: 0.95, sub: 0.5, click: 0.3 });
    S.metal({ f: 520, dur: 2.5, peak: 0.28 });
    S.crack({ at: 0.01, f: 2200, peak: 0.45, dur: 0.6 });
    S.crackle({ at: 0.05, f: 3800, dens: 1.5, dur: 1.2, peak: 0.12, pts: [[0.2, 1], [1.2, 0]] });
    S.whoosh({ at: 0.04, f: 500, f1: 6500, dur: 0.8, peakAt: 0.3, peak: 0.2 });
    S.pad({ at: 0.15, notes: [mf(64), mf(71), mf(76)], type: 'sine', a: 0.2, dur: 3.4, lp: 4000, peak: 0.12 });
    [88, 95].forEach((n, i) => S.glass({ at: 0.2 + i * 0.1, f: mf(n), dur: 3.0, peak: 0.07 }));
  });
  def('bm-vesper-w-step', 'bm', S => {            // the Glass Knight steps out of the glass: a soft plate step, a pane rung low, a ripple falling away
    S.space('hall', 0.65);
    S.metal({ f: 380, dur: 0.5, peak: 0.12, click: 0.2 });
    S.thud({ at: 0.01, f: 90, f1: 46, dur: 0.4, peak: 0.25, click: 0 });
    S.glass({ at: 0.06, f: mf(83), dur: 2.2, peak: 0.1 });
    S.tone({ at: 0.04, f: 1500, f1: 520, glide: 0.6, dur: 0.7, peak: 0.04, a: 0.02 });
  });
  def('bm-vesper-w-peak', 'bm', S => {            // the last cut of the dance: two blades meeting, one note struck on the other, glass in a fine rain, a deep release
    S.space('hall', 0.7);
    S.thud({ f: 62, f1: 26, dur: 1.5, drive: 2.8, peak: 0.85, sub: 0.4 });
    S.thud({ at: 0.035, f: 88, f1: 40, dur: 0.9, drive: 2, peak: 0.45, click: 0, pan: 0.4 });
    S.crack({ f: 2400, peak: 0.45, dur: 0.5 });
    S.metal({ f: 700, dur: 1.8, peak: 0.22 });
    for (let i = 0; i < 12; i++) S.glass({ at: 0.03 + i * 0.05 + S.rr(0, 0.03), f: S.rr(2200, 7200), dur: S.rr(0.4, 0.9), peak: 0.06 + 0.04 * Math.random(), pan: S.rr(-0.9, 0.9) });
    [76, 88].forEach((n, i) => S.glass({ at: 0.1 + i * 0.05, f: mf(n), dur: 3.2, peak: 0.16 }));
    S.whoosh({ at: 0.05, f: 700, f1: 6000, dur: 0.7, peakAt: 0.3, peak: 0.2 });
  });
  def('bm-vesper-w-enrage-land', 'bm', S => {     // the last reflection lands: every pane in the room struck at once, a deep fall under it, then the room goes out
    S.space('hall', 0.8);
    S.thud({ f: 58, f1: 20, dur: 2.6, drive: 3.6, peak: 1.0, sub: 0.5 });
    S.crack({ f: 2000, peak: 0.55, dur: 0.7 });
    for (let i = 0; i < 28; i++) S.glass({ at: i * 0.04 + S.rr(0, 0.03), f: S.rr(1500, 7500), dur: S.rr(0.6, 1.4), peak: 0.07 + 0.05 * Math.random(), pan: S.rr(-1, 1) });
    S.metal({ f: 480, dur: 2.2, peak: 0.25 });
    S.whoosh({ at: 0.03, f: 400, f1: 7200, dur: 1.0, peakAt: 0.35, peak: 0.3 });
    S.rumble({ at: 0.05, dur: 2.8, f: 120, peak: 0.3, a: 0.05 });
  });
  def('bm-vesper-w-fall', 'bm', S => {            // she falls: a single struck pane and the notes of an open chord falling after it, one small bright tink at a time, a low hum, and a long quiet
    S.space('hall', 0.85);
    S.metal({ f: 420, dur: 1.6, peak: 0.16 });
    S.thud({ at: 0.02, f: 60, f1: 28, dur: 1.4, drive: 1.6, peak: 0.5, click: 0, sub: 0.3 });
    [100, 95, 88, 83, 76].forEach((n, i) => S.glass({ at: 0.15 + i * 0.35, f: mf(n), dur: 4.2, peak: 0.19 - 0.02 * i, pan: (i % 2 ? 0.35 : -0.35) }));
    for (let i = 0; i < 10; i++) S.glass({ at: 0.5 + i * 0.23 + S.rr(0, 0.1), f: S.rr(3200, 7400), dur: 0.7, peak: 0.035 + 0.02 * Math.random(), pan: S.rr(-0.9, 0.9) });
    S.tone({ f: mf(33), dur: 4.6, a: 0.3, peak: 0.18, pts: [[0.5, 1], [4.6, 0]] });
    S.pad({ at: 0.6, notes: [mf(52), mf(59), mf(64)], type: 'sine', a: 1.0, dur: 4.2, lp: 2600, peak: 0.08 });
  });

  // @@WALL-ormun (its recipes go right under this line)
  // Ormun's staged moments (walls/ormun.js): slow and heavy, black water and silver. Every release has a deep body and a mid body (a laptop speaker keeps only the mids): a low thud, a second knock an octave and
  // a half up, water in the noise bands, and a bell. The Spring Tide: the gather, the held beat (almost nothing), the release, each pass under a pan, the ebb, the break. The bridge: the span's groan and its fall.
  // The beam's groan and the Tip. The entrance (rise), the enrage's build and land, and the kill (fall). The count's bell, the verdict's lock and the strike are the sound lane's (bm-ormun-m-*).
  def('bm-ormun-w-gather', 'bm', S => {           // the Tide gathering: the sea drawn back (a rising rumble and a rising band of water), the chains taking up the slack (three groans), a low chord swelling
    S.space('hall', 0.6);
    S.whoosh({ f: 500, f1: 1800, dur: 3.9, peakAt: 0.75, peak: 0.12, q: 0.7, pts: [[2.8, 1], [3.7, 0.4], [3.9, 0]] }); S.tone({ f: mf(67), dur: 3.8, a: 2.6, peak: 0.03, pts: [[2.6, 1], [3.8, 0]] });
    S.rumble({ dur: 3.9, f: 110, f1: 280, a: 2.6, peak: 0.3, pts: [[2.7, 1], [3.8, 0.5], [3.9, 0]] });
    S.noise({ color: 'pink', bp: 240, bp1: 1500, q: 0.8, dur: 3.9, pts: [[2.8, 1], [3.7, 0.35], [3.9, 0]], peak: 0.17 });
    S.pad({ notes: [mf(31), mf(38), mf(43)], type: 'sine', a: 2.6, dur: 3.9, lp: 1500, peak: 0.15 });
    S.tone({ f: mf(55), dur: 3.8, peak: 0.04, pts: [[2.4, 0.5], [3.6, 1], [3.8, 0]] }); S.tone({ f: mf(55), det: 11, dur: 3.8, peak: 0.04, pts: [[2.4, 0.5], [3.6, 1], [3.8, 0]] });
    [0.8, 1.9, 2.8].forEach((at, i) => S.creak({ at, f: 26 - i * 2, f1: 19, dur: 0.9, res: [380 + i * 90, 900], q: 9, a: 0.25, peak: 0.14 + 0.03 * i }));
  });
  def('bm-ormun-w-hold', 'bm', S => {             // the held beat: one pale tone drawn thin over a still sea, and then nothing
    S.space('hall', 0.55);
    S.tone({ f: mf(79), dur: 1.5, peak: 0.045, pts: [[0.6, 0.4], [1.3, 1], [1.5, 0]] });
    S.tone({ f: mf(79), det: 8, dur: 1.5, peak: 0.045, pts: [[0.6, 0.4], [1.3, 1], [1.5, 0]] });
    S.tone({ f: mf(55), dur: 1.5, peak: 0.03, pts: [[0.8, 0.5], [1.3, 1], [1.5, 0]], pan: -0.3 });
  });
  def('bm-ormun-w-release', 'bm', S => {          // The Tide Arrives: the sea breaks open along its whole length, a deep knock and its octave and a half, a roar of water, a great low bell, the chains taking the strain
    S.space('hall', 0.7);
    S.thud({ f: 64, f1: 25, dur: 2.3, drive: 3, peak: 0.378, sub: 0.4, click: 0.2 });
    S.thud({ at: 0.015, f: 170, f1: 62, dur: 1.0, drive: 1.6, peak: 0.21, click: 0, pan: 0.2 });
    S.crack({ f: 1800, peak: 0.35, dur: 0.45 });
    S.whoosh({ at: 0.03, f: 260, f1: 5200, dur: 1.5, peakAt: 0.32, peak: 0.714, q: 0.8 });
    S.noise({ at: 0.04, color: 'white', hp: 1400, lp: 7500, dur: 1.4, a: 0.01, pts: [[0.05, 1], [0.5, 0.6], [1.4, 0]], peak: 0.34 });
    [0.02, 0.2, 0.42, 0.7].forEach((at, i) => S.splat({ at, peak: 0.4 - i * 0.06, dur: 0.4, pan: (i % 2 ? 0.5 : -0.5) }));
    S.bell({ at: 0.02, f: mf(40), dur: 3.2, peak: 0.34, lp: 3000 }); S.bell({ at: 0.04, f: mf(64), dur: 2.4, peak: 0.12, lp: 4200 });
    S.metal({ at: 0.08, f: 250, dur: 0.9, peak: 0.27, click: 0.4 });
    S.pad({ at: 0.5, notes: [mf(40), mf(47), mf(52), mf(59)], type: 'sine', a: 0.9, dur: 3.2, lp: 2600, peak: 0.12 });
  });
  def('bm-ormun-w-pass', 'bm', S => {             // the Tide sliding under a pan: a long surge of water, the chains groaning, the pan heaving up with a low knock, a soft ring of silver
    S.space('hall', 0.65);
    S.whoosh({ f: 180, f1: 900, dur: 2.6, peakAt: 0.42, peak: 0.476, q: 0.6 });
    S.rumble({ dur: 2.6, f: 100, f1: 240, a: 0.9, peak: 0.073 });
    S.creak({ at: 0.2, f: 28, f1: 17, dur: 1.9, res: [330, 720], q: 9, a: 0.3, peak: 0.21 });
    S.thud({ at: 0.55, f: 150, f1: 58, dur: 0.9, drive: 1.2, peak: 0.143, click: 0.1, sub: 0.18 });
    S.metal({ at: 0.6, f: 215, dur: 1.5, peak: 0.15, click: 0.2 });
    S.noise({ at: 0.3, color: 'pink', bp: 700, bp1: 2400, q: 1, dur: 1.6, pts: [[0.5, 1], [1.6, 0]], peak: 0.102 });
  });
  def('bm-ormun-w-ebb', 'bm', S => {              // the Tide going out from under the pans: the water draining away, a falling note
    S.space('hall', 0.6);
    S.whoosh({ f: 1500, f1: 400, dur: 2.2, peakAt: 0.2, peak: 0.1, q: 0.7 });
    S.noise({ color: 'pink', lp: 1800, lp1: 260, dur: 2.4, a: 0.2, pts: [[0.3, 1], [2.4, 0]], peak: 0.255 });
    S.tone({ f: mf(48), f1: mf(40), glide: 2.2, dur: 2.4, a: 0.2, peak: 0.1, pts: [[0.3, 1], [2.4, 0]] });
    S.creak({ at: 0.1, f: 22, f1: 17, dur: 1.4, res: [300, 640], q: 8, a: 0.3, peak: 0.098 });
  });
  def('bm-ormun-w-break', 'bm', S => {            // the third count: the Tide thrown away. A deep knock and its upper body, the bell struck clean, a rush of water going out, the sea settling, a chord opening
    S.space('hall', 0.75);
    S.thud({ f: 62, f1: 24, dur: 2.4, drive: 3.2, peak: 0.399, sub: 0.45, click: 0.25 });
    S.thud({ at: 0.02, f: 180, f1: 66, dur: 1.0, drive: 1.6, peak: 0.21, click: 0, pan: -0.2 });
    S.crack({ f: 2000, peak: 0.35, dur: 0.4 });
    S.bell({ at: 0.02, f: mf(52), dur: 3.8, peak: 0.3, lp: 3600 }); S.bell({ at: 0.05, f: mf(76), dur: 3.2, peak: 0.12, lp: 5200 });
    S.whoosh({ at: 0.9, f: 900, f1: 140, dur: 3.0, peakAt: 0.25, peak: 0.578, q: 0.7 });
    S.rumble({ at: 0.9, dur: 3.2, f: 120, f1: 60, a: 0.3, peak: 0.083 });
    [0.1, 0.3, 0.55].forEach((at, i) => S.splat({ at, peak: 0.4 - i * 0.07, dur: 0.4, pan: i % 2 ? 0.5 : -0.5 }));
    S.pad({ at: 1.2, notes: [mf(52), mf(59), mf(64), mf(71)], type: 'tri', a: 0.9, dur: 3.6, lp: 3000, peak: 0.13 });
    [88, 95, 100].forEach((n, i) => S.glass({ at: 1.6 + i * 0.25, f: mf(n), dur: 2.6, peak: 0.05 }));
  });
  def('bm-ormun-w-span-groan', 'bm', S => {       // the bridge groaning: stone grinding on iron, the span taking its last weight, grit falling
    S.space('hall', 0.6);
    S.noise({ at: 0.2, color: 'pink', bp: 700, bp1: 1900, q: 1.2, dur: 2.5, a: 1.4, peak: 0.07, pts: [[1.8, 1], [2.5, 0]] }); S.metal({ at: 1.9, f: 430, dur: 0.9, peak: 0.1 });
    S.scrape({ f: 320, q: 3, rate: 9, dur: 2.7, a: 1.6, peak: 0.1, pts: [[1.8, 1], [2.6, 0.7], [2.7, 0]] });
    [0.3, 1.2, 2.0].forEach((at, i) => S.creak({ at, f: 18 + i * 5, f1: 34 + i * 8, dur: 0.9, res: [200 + i * 80, 560, 1150], q: 8, a: 0.2, peak: 0.168 + 0.03 * i }));
    S.rumble({ dur: 2.8, f: 90, a: 1.8, peak: 0.24, pts: [[1.9, 1], [2.7, 0.6], [2.8, 0]] });
    S.crackle({ at: 0.4, f: 2200, dens: 0.6, dur: 2.2, peak: 0.07, pts: [[1.8, 1], [2.2, 0]] });
    S.tone({ f: mf(36), dur: 2.7, a: 1.6, peak: 0.036, pts: [[1.8, 1], [2.7, 0]] });
  });
  def('bm-ormun-w-span-fall', 'bm', S => {        // the bridge goes: a crack through the stone, the slabs falling into the sea one after another, the chains whipping free, the pans ringing
    S.space('hall', 0.7);
    S.noise({ at: 0.04, color: 'pink', bp: 900, bp1: 2600, q: 0.8, dur: 1.6, pts: [[0.1, 1], [1.6, 0]], peak: 0.28 }); S.metal({ at: 0.06, f: 610, dur: 1.5, peak: 0.22, click: 0.4 }); S.bell({ at: 0.04, f: mf(62), dur: 2.2, peak: 0.1, lp: 4200 });
    S.crack({ f: 1500, peak: 0.5, dur: 0.5 });
    S.thud({ f: 62, f1: 24, dur: 2.4, drive: 3, peak: 0.378, sub: 0.4, click: 0.2 });
    S.thud({ at: 0.02, f: 140, f1: 52, dur: 0.9, drive: 1.5, peak: 0.21, click: 0, pan: 0.15 });
    [0.12, 0.26, 0.4, 0.55, 0.72].forEach((at, i) => { S.splat({ at, peak: 0.45 - i * 0.05, dur: 0.45, pan: (i - 2) * 0.3 }); S.thud({ at, f: 110 - i * 8, f1: 48, dur: 0.5, peak: 0.105, click: 0.2 }); });
    S.whoosh({ at: 0.05, f: 300, f1: 4600, dur: 1.3, peakAt: 0.3, peak: 0.34 });
    S.metal({ at: 0.1, f: 232, dur: 1.9, peak: 0.2 }); S.metal({ at: 0.24, f: 318, dur: 1.5, peak: 0.18, click: 0.3, pan: 0.4 });
    S.rumble({ at: 0.05, dur: 2.8, f: 130, a: 0.15, peak: 0.086 });
    S.bell({ at: 0.03, f: mf(50), dur: 2.8, peak: 0.16, lp: 3200 });
  });
  def('bm-ormun-w-beam-groan', 'bm', S => {       // the beam taking the god's hand: iron groaning along its length, the chains drawing tight, a held tension
    S.space('hall', 0.6);
    S.noise({ color: 'pink', bp: 900, bp1: 2200, q: 1.2, dur: 3.3, a: 2.0, peak: 0.07, pts: [[2.6, 1], [3.2, 0.5], [3.3, 0]] }); S.metal({ at: 2.9, f: 520, dur: 0.9, peak: 0.1 });
    [0.2, 1.0, 1.8, 2.5].forEach((at, i) => S.creak({ at, f: 20 + i * 4, f1: 30 + i * 6, dur: 0.95, res: [700 + i * 150, 1500, 2900], q: 9, a: 0.2, peak: 0.154 + 0.02 * i }));
    S.whoosh({ f: 140, f1: 700, dur: 3.3, peakAt: 0.8, peak: 0.272, q: 0.6, pts: [[2.6, 1], [3.2, 0.5], [3.3, 0]] });
    S.rumble({ dur: 3.4, f: 90, a: 2.4, peak: 0.24, pts: [[2.6, 1], [3.3, 0.6], [3.4, 0]] });
    S.tone({ f: mf(50), dur: 3.3, a: 2.2, peak: 0.05, pts: [[2.4, 0.6], [3.2, 1], [3.3, 0]] }); S.tone({ f: mf(50), det: 12, dur: 3.3, a: 2.2, peak: 0.05, pts: [[2.4, 0.6], [3.2, 1], [3.3, 0]] });
  });
  def('bm-ormun-w-tip', 'bm', S => {              // the Tip: both pans swung in one stroke, two heavy splashes under them, the chains and the beam ringing out
    S.space('hall', 0.7);
    S.noise({ at: 0.03, color: 'pink', bp: 900, bp1: 2800, q: 0.8, dur: 1.6, pts: [[0.1, 1], [1.6, 0]], peak: 0.28 }); S.metal({ at: 0.05, f: 720, dur: 1.6, peak: 0.2, click: 0.4 }); S.bell({ at: 0.04, f: mf(64), dur: 2.4, peak: 0.13, lp: 4200 });
    S.thud({ f: 66, f1: 26, dur: 2.2, drive: 3, peak: 0.357, sub: 0.4, click: 0.2 });
    S.thud({ at: 0.0, f: 150, f1: 56, dur: 0.9, drive: 1.5, peak: 0.189, click: 0, pan: -0.5 }); S.thud({ at: 0.07, f: 135, f1: 52, dur: 0.9, drive: 1.5, peak: 0.189, click: 0, pan: 0.5 });
    S.whoosh({ at: 0.02, f: 250, f1: 5000, dur: 1.4, peakAt: 0.3, peak: 0.32 });
    S.splat({ at: 0.3, peak: 0.6, dur: 0.5, pan: -0.6 }); S.splat({ at: 0.4, peak: 0.6, dur: 0.5, pan: 0.6 });
    S.metal({ at: 0.04, f: 520, dur: 2.5, peak: 0.2 }); S.metal({ at: 0.1, f: 300, dur: 2.0, peak: 0.18, click: 0.3 });
    S.rumble({ at: 0.05, dur: 2.5, f: 120, a: 0.2, peak: 0.079 });
    S.pad({ at: 0.4, notes: [mf(43), mf(50), mf(55)], type: 'sine', a: 0.6, dur: 2.8, lp: 2600, peak: 0.1 });
  });
  def('bm-ormun-w-rise', 'bm', S => {             // he rises out of the water: a deep rumble swelling, a great sheet of water running off stone, the chains groaning, one low bell
    S.space('hall', 0.7);
    S.noise({ at: 0.5, color: 'pink', bp: 800, bp1: 2600, q: 0.8, dur: 4.0, a: 1.2, peak: 0.12, pts: [[1.4, 0.6], [2.6, 1], [4.0, 0]] }); S.bubbles({ at: 0.8, n: 8, f: 600, f1: 2200, spread: 3.0, peak: 0.12, size: 0.04 }); S.bell({ at: 1.15, f: mf(55), dur: 3.0, peak: 0.1, lp: 3600 });
    S.rumble({ dur: 4.6, f: 80, f1: 220, a: 1.6, peak: 0.35, pts: [[1.6, 1], [3.6, 0.8], [4.6, 0]] });
    S.noise({ color: 'pink', bp: 420, bp1: 1900, q: 0.7, dur: 4.6, a: 1.0, pts: [[1.2, 0.6], [2.8, 1], [4.6, 0]], peak: 0.221 });
    S.bubbles({ at: 0.6, n: 10, f: 300, f1: 1300, spread: 3.2, peak: 0.1, size: 0.05 });
    S.creak({ at: 0.4, f: 24, f1: 17, dur: 2.0, res: [340, 760], q: 9, a: 0.4, peak: 0.196 });
    S.tone({ f: mf(31), dur: 4.4, a: 1.2, peak: 0.096, pts: [[1.4, 1], [4.4, 0]] }); S.tone({ f: mf(43), dur: 4.2, a: 1.4, peak: 0.07, pts: [[1.6, 1], [4.2, 0]] });
    S.bell({ at: 1.1, f: mf(36), dur: 3.4, peak: 0.16, lp: 2600 });
    S.thud({ at: 1.0, f: 130, f1: 50, dur: 1.2, drive: 1.2, peak: 0.126, click: 0 });
  });
  def('bm-ormun-w-enrage-build', 'bm', S => {     // The Scale Falls building: one tone climbing under a rising sea, the chains groaning faster and faster
    S.space('hall', 0.65);
    S.whoosh({ f: 400, f1: 2400, dur: 8.2, peakAt: 0.9, peak: 0.1, q: 0.8, pts: [[7.4, 1], [8.1, 0.4], [8.2, 0]] });
    S.pad({ notes: [mf(38), mf(45), mf(50)], type: 'tri', bend: 7, a: 7.2, dur: 8.2, lp: 1800, peak: 0.14 });
    S.rumble({ dur: 8.2, f: 90, f1: 420, a: 7, peak: 0.3, pts: [[7.4, 1], [8.1, 0.5], [8.2, 0]] });
    S.noise({ color: 'pink', bp: 300, bp1: 2400, q: 0.8, dur: 8.2, pts: [[7.4, 1], [8.1, 0.4], [8.2, 0]], peak: 0.153 });
    [0.8, 2.6, 4.0, 5.0, 5.8, 6.4, 6.9, 7.3].forEach((at, i) => S.creak({ at, f: 22 + i * 3, f1: 16 + i * 2, dur: 0.7, res: [360 + i * 90, 880, 1700], q: 9, a: 0.15, peak: 0.112 + 0.015 * i }));
    S.tone({ f: mf(62), f1: mf(74), glide: 8, dur: 8.2, a: 7, peak: 0.05, pts: [[7.2, 1], [8.1, 0.6], [8.2, 0]] });
  });
  def('bm-ormun-w-enrage-land', 'bm', S => {      // The Scale Falls: the beam comes down, the sea breaks over both pans, every chain in the room struck at once, and then the room goes out
    S.space('hall', 0.8);
    S.noise({ at: 0.03, color: 'pink', bp: 900, bp1: 2600, q: 0.8, dur: 1.6, pts: [[0.1, 1], [1.6, 0]], peak: 0.26 }); S.bell({ at: 0.04, f: mf(65), dur: 2.6, peak: 0.12, lp: 4200 });
    S.thud({ f: 58, f1: 20, dur: 2.8, drive: 3.6, peak: 0.42, sub: 0.3 });
    S.thud({ at: 0.02, f: 160, f1: 58, dur: 1.1, drive: 2, peak: 0.231, click: 0, pan: 0.2 });
    S.crack({ f: 1700, peak: 0.55, dur: 0.6 });
    S.whoosh({ at: 0.03, f: 220, f1: 6000, dur: 1.5, peakAt: 0.3, peak: 0.714, q: 0.8 });
    S.noise({ at: 0.04, color: 'white', hp: 1200, lp: 7000, dur: 1.5, a: 0.01, pts: [[0.05, 1], [0.6, 0.6], [1.5, 0]], peak: 0.34 });
    for (let i = 0; i < 9; i++) S.metal({ at: i * 0.05 + S.rr(0, 0.03), f: S.rr(220, 760), dur: S.rr(0.9, 1.9), peak: 0.08 + 0.05 * Math.random(), pan: S.rr(-0.9, 0.9), click: 0.3 });
    [0.02, 0.15, 0.32].forEach((at, i) => S.splat({ at, peak: 0.5 - i * 0.1, dur: 0.5, pan: i % 2 ? 0.5 : -0.5 }));
    S.bell({ at: 0.02, f: mf(41), dur: 3.4, peak: 0.28, lp: 2800 });
    S.rumble({ at: 0.05, dur: 3.2, f: 110, a: 0.1, peak: 0.099 });
  });
  def('bm-ormun-w-fall', 'bm', S => {             // he is brought down: the water stops, one very low bell and its upper notes falling after it, the sea draining to still, a single high note, a long quiet
    S.space('hall', 0.85);
    S.bell({ at: 0.08, f: mf(67), dur: 4.2, peak: 0.09, lp: 4200 }); S.noise({ at: 0.1, color: 'pink', bp: 900, bp1: 350, q: 0.8, dur: 2.4, pts: [[0.2, 1], [2.4, 0]], peak: 0.12 });
    S.thud({ at: 0.02, f: 62, f1: 28, dur: 1.6, drive: 1.6, peak: 0.21, click: 0, sub: 0.18 });
    S.thud({ at: 0.03, f: 150, f1: 70, dur: 0.8, drive: 1.2, peak: 0.118, click: 0 });
    S.bell({ at: 0.04, f: mf(34), dur: 5.4, peak: 0.32, lp: 2600 }); S.bell({ at: 0.06, f: mf(46), dur: 4.8, peak: 0.14, lp: 3200 }); S.bell({ at: 0.9, f: mf(58), dur: 4.2, peak: 0.08, lp: 4000 });
    S.noise({ color: 'brown', lp: 900, lp1: 70, dur: 3.2, a: 0.2, pts: [[0.3, 1], [3.2, 0]], peak: 0.374 });
    S.noise({ color: 'pink', bp: 1200, bp1: 300, q: 0.7, dur: 2.6, a: 0.2, pts: [[0.3, 1], [2.6, 0]], peak: 0.17 });
    S.pad({ at: 0.8, notes: [mf(46), mf(53), mf(58)], type: 'sine', a: 1.4, dur: 5.0, lp: 2400, peak: 0.08 });
    [88, 93, 100].forEach((n, i) => S.glass({ at: 2.4 + i * 0.7, f: mf(n), dur: 3.2, peak: 0.045 - 0.008 * i, pan: (i - 1) * 0.3 }));
    S.tone({ f: mf(31), dur: 5.6, a: 0.6, peak: 0.084, pts: [[0.8, 1], [5.6, 0]] });
  });

  // @@WALL-maelis (its recipes go right under this line)
  // Maelis Orne's staged moments (walls/maelis.js): cool and quiet, struck glass, a held breath, one long cold note. Every release has a deep body AND a body above 250 Hz (crack, glass, metal, noise
  // bands), so it lands on a small speaker too. New Moon: the crown going out (wane), the room going out (dark), the dash of the dance climbing (streak, played at a rising rate), the last light gathered
  // (answer), the held beat (hold), the light drawn in (gather), the light's return (light) and the breath after. The Hound's Return: his howl, his landing (land), her vault, the second form (hunt).
  // The eclipse (dusk, eclipse), Totality (total-build, total), the kill (fall, fall2) and the entrance (enter). Her casts and smaller moves are the sound lane's (bm-maelis-*, bm-maelis-m-*).
  const mlHowl = (S, at, dur, pk, f = 300) => {   // one long cold note from far off: rising, then settling, with a slap-back and a thin edge of frost on it (no growl)
    S.echo({ time: 0.74, fb: 0.4, lp: 1500, kill: at + dur + 3.4 });
    const d1 = dur * 0.56, d2 = dur * 0.56;
    S.voice({ at, f: f * 0.78, f1: f * 1.2, dur: d1, vowel: 'o', vowel1: 'u', breath: 1.2, lp: 2200, peak: pk, ech: 0.55, rev: 0.7, verb: 'cave', pts: [[0.4, 0.6], [d1 - 0.05, 1], [d1, 0]] });
    S.voice({ at: at + dur * 0.44, f: f * 1.2, f1: f * 0.86, dur: d2, vowel: 'u', vowel1: 'o', breath: 1.2, lp: 2000, peak: pk * 0.9, ech: 0.55, rev: 0.7, verb: 'cave', pts: [[0.2, 0.9], [d2 * 0.3, 1], [d2 * 0.75, 0.5], [d2, 0]] });
    S.tone({ at: at + 0.3, f: f * 6.1, f1: f * 8.6, dur: dur * 0.7, a: dur * 0.3, peak: pk * 0.05, ech: 0.6 });
  };
  def('bm-maelis-w-wane', 'bm', S => {            // New Moon begins, the crown going out: a pale chord drawn down a fourth, glass notes falling one by one, a low breath leaving the floor
    S.space('hall', 0.7);
    S.pad({ notes: [mf(76), mf(83), mf(88)], type: 'sine', bend: -5, a: 0.5, dur: 3.9, lp: 3200, peak: 0.1, pts: [[0.7, 1], [3.9, 0]] });
    [100, 95, 91, 88, 83, 79].forEach((n, i) => S.glass({ at: 0.2 + i * 0.5, f: mf(n), dur: 2.2, peak: 0.12 - 0.012 * i, pan: i % 2 ? 0.35 : -0.35 }));
    S.noise({ color: 'brown', lp: 760, lp1: 150, dur: 3.8, a: 0.5, pts: [[0.8, 1], [3.8, 0]], peak: 0.18 });
    S.noise({ color: 'pink', bp: 2600, bp1: 700, q: 0.8, dur: 3.6, a: 0.4, pts: [[0.6, 1], [3.6, 0]], peak: 0.05 });
    S.tone({ f: mf(40), dur: 3.9, a: 0.9, peak: 0.1, pts: [[1.6, 1], [3.9, 0]] });
  });
  def('bm-maelis-w-dark', 'bm', S => {            // the room goes out: one soft low knock, a high thin note drawn down to nothing, the air let out
    S.space('hall', 0.8);
    S.thud({ f: 60, f1: 30, dur: 1.4, drive: 1.4, peak: 0.34, click: 0, sub: 0.3 });
    S.glass({ at: 0.05, f: mf(95), f1: mf(83), glide: 1.6, dur: 2.2, peak: 0.1 });
    S.metal({ at: 0.02, f: 420, dur: 1.4, peak: 0.07, click: 0.2 });
    S.noise({ at: 0.1, color: 'pink', bp: 1800, bp1: 450, q: 0.8, dur: 1.8, a: 0.1, pts: [[0.3, 1], [1.8, 0]], peak: 0.09 });
  });
  def('bm-maelis-w-streak', 'bm', S => {          // a dash of the sword dance (played at a rate that climbs): a bright draw of air, the cut struck on a glass note, a small knock
    S.space('hall', 0.5);
    S.whoosh({ f: 1300, f1: 7200, dur: 0.28, peakAt: 0.75, peak: 0.2, q: 0.9 });
    S.crack({ at: 0.22, f: 2700, peak: 0.2, dur: 0.2 });
    S.glass({ at: 0.2, f: mf(88), dur: 1.0, peak: 0.14 }); S.glass({ at: 0.23, f: mf(95), dur: 0.8, peak: 0.07, pan: 0.3 });
    S.thud({ at: 0.21, f: 140, f1: 58, dur: 0.3, peak: 0.18, click: 0 });
  });
  def('bm-maelis-w-answer', 'bm', S => {          // the last light gathered: three struck notes climbing, a thread of shimmer drawn up, a soft knock under it
    S.space('hall', 0.7);
    [83, 88, 95].forEach((n, i) => S.glass({ at: i * 0.16, f: mf(n), dur: 2.2, peak: 0.18 - 0.02 * i, pan: (i - 1) * 0.35 }));
    S.whoosh({ at: 0.04, f: 900, f1: 6800, dur: 0.9, peakAt: 0.8, peak: 0.1, q: 0.9 });
    S.thud({ at: 0.02, f: 90, f1: 44, dur: 0.6, peak: 0.22, click: 0 });
    S.tone({ at: 0.3, f: mf(100), dur: 1.4, a: 0.3, peak: 0.04, pts: [[0.6, 1], [1.4, 0]] });
  });
  def('bm-maelis-w-hold', 'bm', S => {            // the held beat: a pale pair of tones beating slowly, drawn tight, and then nothing
    S.space('hall', 0.5);
    S.tone({ f: mf(81), dur: 1.6, peak: 0.05, pts: [[0.6, 0.45], [1.45, 1], [1.6, 0]] });
    S.tone({ f: mf(81), det: 9, dur: 1.6, peak: 0.05, pts: [[0.6, 0.45], [1.45, 1], [1.6, 0]] });
    S.tone({ f: mf(93), dur: 1.6, peak: 0.016, pts: [[0.85, 0.5], [1.45, 1], [1.6, 0]], pan: 0.4 });
  });
  def('bm-maelis-w-gather', 'bm', S => {          // Full Moon building in the dark: light drawn in from every side, a chord climbing, a band of air rising, glass accumulating, ending on its peak
    S.space('hall', 0.65);
    S.pad({ notes: [mf(64), mf(71), mf(76)], type: 'tri', bend: 7, a: 3.2, dur: 3.75, lp: 2600, peak: 0.14, pts: [[3.3, 1], [3.7, 0.7], [3.75, 0]] });
    S.whoosh({ f: 400, f1: 6400, dur: 3.75, peakAt: 0.88, peak: 0.16, q: 0.8, pts: [[3.1, 1], [3.55, 0.5], [3.75, 0]] });
    S.rumble({ dur: 3.75, f: 100, f1: 240, a: 3.2, peak: 0.24, pts: [[3.3, 1], [3.7, 0.4], [3.75, 0]] });
    for (let i = 0; i < 14; i++) S.glass({ at: 0.4 + i * 0.22 + S.rr(0, 0.08), f: mf(S.pick([88, 95, 100, 107])), dur: 0.9, peak: 0.03 + 0.012 * i, pan: S.rr(-0.8, 0.8) });
    S.tone({ f: mf(88), f1: mf(100), glide: 3.6, dur: 3.75, a: 3.0, peak: 0.05, pts: [[3.2, 1], [3.7, 0.8], [3.75, 0]] });
  });
  def('bm-maelis-w-light', 'bm', S => {           // the light comes back all at once: a deep knock, a crack, a bright burst of air, the whole sky struck (glass in a rising chord), a bell, the room opening in a chord
    S.space('hall', 0.75);
    S.thud({ f: 62, f1: 24, dur: 2.2, drive: 3, peak: 0.5, sub: 0.3, click: 0.2 });
    S.thud({ at: 0.02, f: 190, f1: 70, dur: 0.9, drive: 1.6, peak: 0.4, click: 0.3, pan: 0.2 });
    S.crack({ f: 2400, peak: 0.8, dur: 0.5 });
    S.noise({ at: 0.03, color: 'white', hp: 1500, lp: 9000, dur: 1.2, a: 0.006, pts: [[0.04, 1], [0.4, 0.55], [1.2, 0]], peak: 0.36 });
    S.whoosh({ at: 0.03, f: 500, f1: 7400, dur: 1.0, peakAt: 0.3, peak: 0.5, q: 0.9 });
    S.metal({ at: 0.04, f: 520, dur: 1.9, peak: 0.4 }); S.metal({ at: 0.06, f: 1300, set: 'bar', dur: 1.4, peak: 0.16, click: 0.3, pan: -0.3 });
    for (let i = 0; i < 16; i++) S.glass({ at: 0.03 + i * 0.045 + S.rr(0, 0.03), f: S.rr(1600, 7000), dur: S.rr(0.6, 1.4), peak: 0.06 + 0.05 * Math.random(), pan: S.rr(-0.9, 0.9) });
    [76, 83, 88, 95].forEach((n, i) => S.glass({ at: 0.08 + i * 0.07, f: mf(n), dur: 3.2, peak: 0.24 }));
    S.bell({ at: 0.05, f: mf(52), dur: 3.4, peak: 0.26, lp: 3600 });
    S.rumble({ at: 0.05, dur: 2.4, f: 120, peak: 0.1, a: 0.05 });
    S.pad({ at: 0.45, notes: [mf(52), mf(59), mf(64), mf(71)], type: 'tri', a: 0.7, dur: 3.2, lp: 3200, peak: 0.12 });
  });
  def('bm-maelis-w-breath', 'bm', S => {          // after the light: the room breathes out, a soft rush of air over the dust and a low settling
    S.space('hall', 0.6);
    S.noise({ color: 'pink', bp: 2200, bp1: 800, q: 0.8, dur: 1.6, a: 0.3, pts: [[0.35, 1], [1.6, 0]], peak: 0.1 });
    S.tone({ f: mf(45), dur: 1.6, a: 0.25, peak: 0.08, pts: [[0.35, 1], [1.6, 0]] });
    S.glass({ at: 0.45, f: mf(88), dur: 2.0, peak: 0.05 });
  });
  def('bm-maelis-w-howl', 'bm', S => {            // the Hound's howl from far off: one long cold note, the dust holding still for it, a faint wind under it and a last answer from further away
    S.space('cave', 0.6);
    mlHowl(S, 0.2, 4.2, 0.26, 300);
    mlHowl(S, 2.3, 3.0, 0.06, 262);
    S.noise({ color: 'pink', bp: 360, bp1: 700, q: 0.7, dur: 4.8, a: 1.2, pts: [[2.0, 1], [4.8, 0]], peak: 0.05 });
    S.rumble({ at: 0.3, dur: 4.2, f: 70, peak: 0.1, a: 1.2 });
  });
  def('bm-maelis-w-vault', 'bm', S => {           // she goes to him: a long breath of robe on the air, a soft note rising with her, a light step at the end
    S.space('hall', 0.5);
    S.whoosh({ f: 700, f1: 4200, dur: 0.9, peakAt: 0.45, peak: 0.2, q: 0.8 });
    S.glass({ at: 0.05, f: mf(83), f1: mf(95), glide: 0.7, dur: 1.4, peak: 0.12 });
    S.thud({ at: 0.62, f: 100, f1: 50, dur: 0.4, peak: 0.2, click: 0.1 });
    S.metal({ at: 0.62, f: 380, dur: 0.6, peak: 0.07, click: 0.2 });
  });
  def('bm-maelis-w-hunt', 'bm', S => {            // she is on his back: the second form. A deep knock and a crack, a low horn call under his howl and hers answering, the sky struck in a chord, a bell, the room opening
    S.space('hall', 0.75);
    S.thud({ f: 58, f1: 22, dur: 2.4, drive: 3.2, peak: 0.9, sub: 0.45, click: 0.25 });
    S.thud({ at: 0.02, f: 160, f1: 60, dur: 1.0, drive: 1.6, peak: 0.4, click: 0, pan: 0.15 });
    S.crack({ f: 2200, peak: 0.52, dur: 0.5 });
    S.noise({ at: 0.03, color: 'white', hp: 1400, lp: 8500, dur: 1.2, a: 0.006, pts: [[0.04, 1], [0.5, 0.5], [1.2, 0]], peak: 0.18 });
    S.whoosh({ at: 0.04, f: 400, f1: 7000, dur: 1.1, peakAt: 0.3, peak: 0.3, q: 0.9 });
    S.metal({ at: 0.05, f: 480, dur: 2.0, peak: 0.24 }); S.metal({ at: 0.09, f: 1900, set: 'bar', dur: 1.2, peak: 0.1, click: 0.3, pan: 0.4 });
    S.horn({ at: 0.1, f: mf(45), dur: 2.4, peak: 0.2, bright: 5 });
    S.echo({ time: 0.6, fb: 0.35, lp: 1700, kill: 7 });
    S.voice({ at: 0.5, f: 240, f1: 380, dur: 1.6, vowel: 'o', vowel1: 'u', breath: 1.2, lp: 2400, peak: 0.22, ech: 0.5, rev: 0.5, pts: [[0.3, 0.7], [1.2, 1], [1.6, 0]] });
    S.voice({ at: 1.6, f: 380, f1: 250, dur: 2.0, vowel: 'u', vowel1: 'o', breath: 1.2, lp: 2200, peak: 0.2, ech: 0.5, rev: 0.5, pts: [[0.2, 1], [0.8, 0.8], [2.0, 0]] });
    [76, 83, 88, 95, 100].forEach((n, i) => S.glass({ at: 0.12 + i * 0.07, f: mf(n), dur: 3.4, peak: 0.12 }));
    S.bell({ at: 0.06, f: mf(45), dur: 4.0, peak: 0.2, lp: 3200 });
    S.pad({ at: 0.5, notes: [mf(45), mf(52), mf(57), mf(64)], type: 'tri', a: 0.9, dur: 3.8, lp: 3000, peak: 0.12 });
    S.rumble({ at: 0.05, dur: 2.8, f: 100, peak: 0.26, a: 0.05 });
  });
  def('bm-maelis-w-dusk', 'bm', S => {            // the eclipse begins: a low drone creeping up out of the floor in a dark chord, a second note slipping out of tune with it, the air going thin and cold
    S.space('hall', 0.7);
    S.pad({ notes: [mf(34), mf(41), mf(44)], type: 'tri', a: 3.4, dur: 5.6, lp: 1700, lpEnv: [200, 1500, 900, 4.4], peak: 0.17, pts: [[3.6, 1], [5.4, 0.8], [5.6, 0]] });
    S.tone({ f: mf(70), dur: 5.6, a: 3.2, peak: 0.04, pts: [[3.6, 1], [5.4, 0.8], [5.6, 0]] }); S.tone({ f: mf(70), det: 14, dur: 5.6, a: 3.2, peak: 0.04, pts: [[3.6, 1], [5.4, 0.8], [5.6, 0]] });
    S.rumble({ dur: 5.6, f: 80, f1: 190, a: 3.6, peak: 0.24, pts: [[3.8, 1], [5.4, 0.6], [5.6, 0]] });
    S.noise({ color: 'pink', bp: 1800, bp1: 500, q: 0.8, dur: 5.4, a: 2.0, pts: [[3.0, 1], [5.4, 0.3], [5.6, 0]], peak: 0.05 });
    [1.4, 3.0, 4.4].forEach((at, i) => S.glass({ at, f: mf(83 - 2 * i), dur: 2.4, peak: 0.05 }));
  });
  def('bm-maelis-w-eclipse', 'bm', S => {         // the red takes the first edge: a great slow bell, a dark chord opening under it, a breath let out. Not a hit: a weight settling
    S.space('hall', 0.85);
    S.bell({ f: mf(34), dur: 6.0, peak: 0.34, lp: 2800 }); S.bell({ at: 0.03, f: mf(46), dur: 5.0, peak: 0.16, lp: 3400 }); S.bell({ at: 0.6, f: mf(58), dur: 4.0, peak: 0.08, lp: 4200 });
    S.thud({ f: 52, f1: 30, dur: 2.0, drive: 1.6, peak: 0.3, click: 0.05, sub: 0.3 });
    S.metal({ at: 0.02, f: 300, dur: 2.2, peak: 0.1, click: 0.2 });
    S.pad({ at: 0.3, notes: [mf(46), mf(53), mf(56)], type: 'sine', a: 1.4, dur: 5.2, lp: 2200, peak: 0.1 });
    S.noise({ at: 0.2, color: 'pink', bp: 1500, bp1: 380, q: 0.7, dur: 3.2, a: 0.3, pts: [[0.5, 1], [3.2, 0]], peak: 0.1 });
    S.noise({ color: 'brown', lp: 800, lp1: 120, dur: 4.4, a: 0.2, pts: [[0.4, 1], [4.4, 0]], peak: 0.2 });
  });
  def('bm-maelis-w-total-build', 'bm', S => {     // Totality building: one tone climbing under a darkening sky, a low pulse faster and faster, the air drawn thin
    S.space('hall', 0.65);
    S.pad({ notes: [mf(38), mf(45), mf(50)], type: 'tri', bend: 8, a: 6.2, dur: 7.2, lp: 1900, peak: 0.14 });
    S.tone({ f: mf(62), f1: mf(76), glide: 7, dur: 7.2, a: 6.2, peak: 0.05, pts: [[6.3, 1], [7.1, 0.6], [7.2, 0]] });
    S.rumble({ dur: 7.2, f: 90, f1: 400, a: 6.2, peak: 0.3, pts: [[6.4, 1], [7.1, 0.5], [7.2, 0]] });
    S.noise({ color: 'pink', bp: 300, bp1: 2600, q: 0.8, dur: 7.2, pts: [[6.4, 1], [7.1, 0.4], [7.2, 0]], peak: 0.14 });
    S.whoosh({ f: 500, f1: 3000, dur: 7.2, peakAt: 0.9, peak: 0.1, q: 0.8, pts: [[6.4, 1], [7.1, 0.4], [7.2, 0]] });
    [0.6, 2.4, 3.8, 4.8, 5.5, 5.9, 6.3, 6.6].forEach((at, i) => S.thud({ at, f: 70 + i * 4, f1: 38, dur: 0.4, peak: 0.1 + 0.02 * i, click: 0.1 }));
  });
  def('bm-maelis-w-total', 'bm', S => {           // Totality lands: the moon's shadow falls on the whole room. A very deep fall, a crack and a burst of dark air, every glass note in the sky struck at once and let go, a long hush
    S.space('hall', 0.8);
    S.thud({ f: 56, f1: 20, dur: 2.8, drive: 3.6, peak: 0.55, sub: 0.4 });
    S.thud({ at: 0.02, f: 190, f1: 66, dur: 1.1, drive: 2, peak: 0.42, click: 0.3, pan: 0.2 });
    S.crack({ f: 1800, peak: 0.85, dur: 0.6 });
    S.noise({ at: 0.03, color: 'white', hp: 1200, lp: 7600, dur: 1.4, a: 0.006, pts: [[0.05, 1], [0.6, 0.6], [1.4, 0]], peak: 0.46 });
    S.whoosh({ at: 0.03, f: 300, f1: 6000, dur: 1.4, peakAt: 0.3, peak: 0.6, q: 0.8 });
    for (let i = 0; i < 24; i++) S.glass({ at: i * 0.04 + S.rr(0, 0.03), f: S.rr(1400, 7000), dur: S.rr(0.6, 1.4), peak: 0.09 + 0.06 * Math.random(), pan: S.rr(-1, 1) });
    S.metal({ at: 0.02, f: 420, dur: 2.4, peak: 0.4 });
    S.bell({ at: 0.04, f: mf(33), dur: 4.4, peak: 0.3, lp: 2600 });
    S.rumble({ at: 0.05, dur: 3.2, f: 110, peak: 0.12, a: 0.05 });
  });
  def('bm-maelis-w-fall', 'bm', S => {            // she falls: a single struck bell and the notes of an open chord falling after it, one small bright note at a time, a low hum, and one warm high note left ringing at the end
    S.space('hall', 0.85);
    S.metal({ f: 440, dur: 1.6, peak: 0.16 });
    S.thud({ at: 0.02, f: 58, f1: 28, dur: 1.4, drive: 1.6, peak: 0.45, click: 0, sub: 0.3 });
    S.bell({ at: 0.04, f: mf(52), dur: 5.0, peak: 0.24, lp: 3200 });
    [100, 95, 88, 83, 76].forEach((n, i) => S.glass({ at: 0.15 + i * 0.36, f: mf(n), dur: 4.2, peak: 0.18 - 0.02 * i, pan: i % 2 ? 0.35 : -0.35 }));
    for (let i = 0; i < 9; i++) S.glass({ at: 0.6 + i * 0.25 + S.rr(0, 0.1), f: S.rr(3200, 7400), dur: 0.7, peak: 0.032 + 0.02 * Math.random(), pan: S.rr(-0.9, 0.9) });
    S.tone({ f: mf(33), dur: 4.8, a: 0.3, peak: 0.16, pts: [[0.5, 1], [4.8, 0]] });
    S.pad({ at: 0.6, notes: [mf(52), mf(59), mf(64)], type: 'sine', a: 1.0, dur: 4.4, lp: 2600, peak: 0.08 });
    S.bell({ at: 3.2, f: mf(84), dur: 3.0, peak: 0.08, lp: 5000 }); S.tone({ at: 3.2, f: mf(84), dur: 2.8, a: 0.2, peak: 0.03, pts: [[0.4, 1], [2.8, 0]] });   // (the warm one: the town's light)
  });
  def('bm-maelis-w-fall2', 'bm', S => {           // she falls in the saddle: the howl begins and is cut off short, a hush, then the same bell and falling notes, quieter, and the one warm note
    S.space('hall', 0.85);
    S.echo({ time: 0.6, fb: 0.3, lp: 1500, kill: 4 });
    S.voice({ f: 250, f1: 360, dur: 0.7, vowel: 'o', vowel1: 'u', breath: 1.2, lp: 2200, peak: 0.24, ech: 0.4, rev: 0.4, pts: [[0.25, 0.8], [0.62, 1], [0.7, 0]] });
    S.thud({ at: 0.72, f: 60, f1: 28, dur: 1.4, drive: 1.6, peak: 0.42, click: 0, sub: 0.3 });
    S.metal({ at: 0.72, f: 420, dur: 1.6, peak: 0.14 });
    S.bell({ at: 0.76, f: mf(52), dur: 5.0, peak: 0.2, lp: 3200 });
    [100, 95, 88, 83, 76].forEach((n, i) => S.glass({ at: 0.95 + i * 0.36, f: mf(n), dur: 4.0, peak: 0.15 - 0.016 * i, pan: i % 2 ? 0.35 : -0.35 }));
    S.noise({ at: 0.8, color: 'pink', bp: 1500, bp1: 420, q: 0.7, dur: 2.4, a: 0.3, pts: [[0.6, 1], [2.4, 0]], peak: 0.08 });
    S.tone({ at: 0.8, f: mf(33), dur: 4.8, a: 0.3, peak: 0.14, pts: [[0.5, 1], [4.8, 0]] });
    S.bell({ at: 3.9, f: mf(84), dur: 3.0, peak: 0.08, lp: 5000 }); S.tone({ at: 3.9, f: mf(84), dur: 2.8, a: 0.2, peak: 0.03, pts: [[0.4, 1], [2.8, 0]] });
  });
  def('bm-maelis-w-enter', 'bm', S => {           // the entrance: the crown first (a pure high note and its shimmer), the light lowering her (a chord opening), her step on the dust, a low breath
    S.space('hall', 0.7);
    S.glass({ f: mf(100), dur: 3.0, peak: 0.16 }); S.glass({ at: 0.12, f: mf(107), dur: 2.6, peak: 0.08, pan: 0.3 });
    S.tone({ f: mf(88), f1: mf(83), glide: 2.4, dur: 2.8, a: 0.9, peak: 0.05, pts: [[1.0, 1], [2.8, 0]] });
    S.pad({ at: 0.6, notes: [mf(52), mf(59), mf(64), mf(71)], type: 'sine', a: 1.6, dur: 3.6, lp: 2800, peak: 0.1, pts: [[1.8, 1], [3.6, 0]] });
    S.noise({ at: 0.8, color: 'pink', bp: 700, bp1: 2200, q: 0.8, dur: 1.8, a: 0.9, pts: [[1.3, 1], [1.8, 0]], peak: 0.06 });
    S.thud({ at: 2.5, f: 90, f1: 44, dur: 0.6, drive: 1.2, peak: 0.34, click: 0.1, sub: 0.2 });
    S.metal({ at: 2.5, f: 360, dur: 1.0, peak: 0.1, click: 0.2 });
    S.bell({ at: 2.52, f: mf(57), dur: 3.0, peak: 0.1, lp: 3600 });
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
  // @@LIFE (the layer between the big moments: your blow landing, the boss's steps and swing, an empty landing, the enrage bell; all kept quiet by their callers)
  def('hit-confirm', 'ab', S => {
    S.thud({ f: S.rr(150, 185), f1: 85, dur: 0.1, peak: 0.45, click: 0.3, clickF: 1800 });
    S.noise({ color: 'pink', bp: 2400, q: 0.8, dur: 0.05, a: 0.001, peak: 0.2 });
  });
  def('boss-step', 'imp', S => {
    S.thud({ f: S.rr(62, 76), f1: 32, dur: 0.32, peak: 0.6, drive: 1.5 });
    S.noise({ color: 'brown', lp: 500, dur: 0.18, pts: [[0.01, 1], [0.18, 0]], peak: 0.2 });
    S.rumble({ dur: 0.35, f: 90, peak: 0.1, a: 0.01 });
  });
  def('boss-auto', 'imp', S => {
    S.whoosh({ f: 300, f1: 950, q: 0.8, dur: 0.22, peakAt: 0.7, peak: 0.32 });
    S.thud({ at: 0.2, f: 95, f1: 40, dur: 0.35, peak: 0.6, drive: 1.5, click: 0.2 });
    S.noise({ at: 0.2, color: 'pink', lp: 1400, dur: 0.1, a: 0.001, peak: 0.25 });
  });
  def('boss-impact-empty', 'imp', S => {
    S.thud({ f: 80, f1: 38, dur: 0.35, peak: 0.45, drive: 1.2 });
    S.noise({ color: 'brown', lp: 900, dur: 0.3, grain: 0.6, pts: [[0.02, 1], [0.3, 0]], peak: 0.18 });
  });
  def('enrage-bell', 'tg', S => {
    S.space('hall', 0.4);
    S.bell({ f: mf(38), dur: 3.2, peak: 0.4 });
    S.drum({ f: 55, dur: 0.5, peak: 0.25 });
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
  def('bm-grubnak-skewer', 'bm', S => {
    S.whoosh({ f: 3600, f1: 1600, dur: 0.38, peakAt: 0.7, q: 2, peak: 0.38 });
    S.whoosh({ at: 0.04, f: 900, f1: 500, dur: 0.3, peak: 0.12 });
    S.metal({ at: 0.03, set: 'bar', f: 3400, dur: 0.1, peak: 0.07 });
    S.wood({ at: 0.38, f: 520, dur: 0.1, peak: 0.5 });
    S.thud({ at: 0.38, f: 170, f1: 80, dur: 0.12, peak: 0.32 });
    S.metal({ at: 0.4, set: 'bar', f: 2600, dur: 0.6, peak: 0.1 });
    S.tone({ at: 0.4, f: 1900, f1: 1840, dur: 0.45, am: [26, 0.7], peak: 0.05 });
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
  // Hard's Gorged form. Clean Plate is a slow dread laid on the cast's length (6.8 s on Hard; main.js and grubnak-fx.js hold the same marks): 0 to 4.7 s the
  // room starts to move, a sub-bass rumble climbing, the pans and plates on the shelves ticking quicker and wood groaning; 4.76 to 5.9 s a held breath, every
  // bed cut dead and only a slow heart and a thread of air; 5.9 to 6.8 s the rush (a hard suction sweep, crockery flying in) and the swallow at the end.
  // Gorged is the payoff (played on the swell): a boom, the apron strings tearing, a huge low roar and buttons popping while the room jolts three times.
  // Gorged Mend is the healed bars: one deep swallow for each, a warm chord coming back under them. Spit Up the retch and the wet lump, Sour Burp a low
  // belch with a hiss of gas and fizzing acid, Second Helping a short, hungrier gulp (three quick swallows).
  def('bm-grubnak-clean-plate', 'bm', S => {
    S.space('room', 0.3);
    // the build
    S.rumble({ dur: 4.8, f: 55, f1: 140, subF: 32, subF1: 58, pts: [[0.8, 0.12], [3.2, 0.55], [4.55, 1], [4.8, 0]], peak: 0.17 });
    S.tone({ type: 'saw', f: 36, f1: 66, lp: 260, am: [4, 0.6], dur: 4.8, pts: [[1.5, 0.2], [4.5, 1], [4.8, 0]], peak: 0.07 });
    S.noise({ color: 'brown', lp: 240, lp1: 1500, dur: 4.8, am: [6, 0.35], pts: [[2, 0.2], [4.5, 1], [4.8, 0]], peak: 0.1 });
    S.voice({ at: 0.3, f: 44, f1: 72, dur: 4.4, vowel: 'o', vowel1: 'a', breath: 1.2, peak: 0.08, lp: 700, pts: [[1.4, 0.3], [4.1, 1], [4.4, 0]] });
    S.creak({ at: 0.9, dur: 3.6, f: 14, f1: 38, res: [260, 540, 900], q: 11, peak: 0.07, jit: 0.5, pts: [[1.2, 0.3], [3.2, 1], [3.6, 0]] });
    let tk = 0.7, gap = 0.55, i = 0;   // the crockery on the shelves, ticking quicker and louder
    while (tk < 4.6) {
      const q = tk / 4.6;
      S.metal({ at: tk, set: i % 2 ? 'bar' : 'plate', f: 900 + S.rr(0, 900), dur: 0.16, peak: 0.03 + 0.06 * q, pan: S.rr(-0.7, 0.7) });
      S.wood({ at: tk + 0.03, f: 220 + S.rr(0, 200), dur: 0.07, peak: 0.03 + 0.055 * q, pan: S.rr(-0.7, 0.7) });
      tk += gap; gap = Math.max(0.1, gap * 0.86); i++;
    }
    // the held breath: a slow heart and a thread of air, nothing else
    S.thud({ at: 4.96, f: 62, f1: 30, dur: 0.35, peak: 0.07, click: 0.06, lp: 160 });
    S.thud({ at: 5.3, f: 54, f1: 28, dur: 0.4, peak: 0.055, click: 0.05, lp: 160 });
    S.thud({ at: 5.74, f: 66, f1: 30, dur: 0.35, peak: 0.09, click: 0.06, lp: 160 });
    S.tone({ at: 4.85, f: 2900, f1: 2700, dur: 1.0, pts: [[0.3, 1], [0.7, 0.8], [1.0, 0]], peak: 0.012 });
    // the rush
    S.whoosh({ at: 5.9, color: 'pink', f: 300, f1: 5200, q: 1.1, dur: 0.95, peakAt: 0.85, peak: 0.9 });
    S.noise({ at: 5.9, color: 'brown', lp: 400, lp1: 2500, dur: 0.95, pts: [[0.8, 1], [0.95, 0]], peak: 0.55 });
    S.rumble({ at: 5.9, dur: 1.0, f: 80, f1: 200, subF: 40, subF1: 70, a: 0.7, peak: 0.75 });
    for (let j = 0; j < 9; j++) {
      const at = 6.02 + j * 0.08;
      S.metal({ at, set: j % 2 ? 'bar' : 'plate', f: 1700 - j * 120 + S.rr(-60, 60), dur: 0.14, peak: 0.1 + j * 0.01, pan: S.rr(-0.6, 0.6) });
      S.wood({ at: at + 0.02, f: 300 + j * 30, dur: 0.06, peak: 0.1, pan: S.rr(-0.6, 0.6) });
    }
    S.thud({ at: 6.74, f: 80, f1: 30, dur: 0.6, drive: 2, peak: 0.95, sub: 0.4 });
    S.voice({ at: 6.7, f: 90, f1: 50, dur: 0.35, vowel: 'u', vowel1: 'o', breath: 0.4, peak: 0.45, lp: 700 });
  });
  def('bm-grubnak-gorged', 'bm', S => {
    S.space('hall', 0.4);
    S.thud({ f: 70, f1: 22, dur: 1.2, drive: 2.6, peak: 0.7, sub: 0.5 });
    S.noise({ color: 'white', hp: 800, lp: 6000, dur: 0.35, pts: [[0.02, 1], [0.35, 0]], peak: 0.3, grain: 0.5 });   // the strings of the apron tearing
    S.voice({ at: 0.05, f: 85, f1: 48, dur: 2.2, vowel: 'a', vowel1: 'o', breath: 1.4, peak: 0.5, lp: 1800, pts: [[0.15, 1], [1.3, 0.85], [2.2, 0]] });
    S.voice({ at: 0.08, f: 128, f1: 70, dur: 1.9, vowel: 'a', vowel1: 'u', breath: 0.8, peak: 0.26, lp: 2400, pts: [[0.12, 1], [1.2, 0.7], [1.9, 0]] });
    S.tone({ type: 'saw', f: 40, f1: 28, lp: 300, am: [30, 0.7], dur: 2.3, pts: [[0.1, 1], [1.6, 0.7], [2.3, 0]], peak: 0.2 });
    S.rumble({ dur: 2.8, f: 120, a: 0.05, peak: 0.32 });
    S.creak({ dur: 1.4, f: 30, f1: 70, res: [260, 520, 880], q: 12, peak: 0.22, jit: 0.4 });
    [0.12, 0.26, 0.4, 0.61].forEach((at, i) => S.metal({ at, set: 'coin', f: 2300 + i * 260 + S.rr(-80, 80), dur: 0.22, peak: 0.1, pan: S.rr(-0.6, 0.6) }));   // buttons popping off
    [0.5, 0.95, 1.4].forEach((at, i) => S.thud({ at, f: 64 - i * 8, f1: 30, dur: 0.4, peak: 0.34 - i * 0.04 }));
    S.bubbles({ at: 0.3, n: 6, f: 130, f1: 420, spread: 1.4, size: 0.04, peak: 0.16 });
    S.splat({ at: 1.5, peak: 0.26, dur: 0.35 });
  });
  def('bm-grubnak-gorged-mend', 'bm', S => {
    S.space('room', 0.3);
    [0.5, 1.1, 1.7].forEach((at, i) => {
      S.voice({ at: at - 0.06, f: 125 - i * 8, f1: 70, dur: 0.28, vowel: 'u', vowel1: 'o', breath: 0.4, peak: 0.3, lp: 800 });
      S.thud({ at: at + 0.08, f: 100 - i * 12, f1: 40, dur: 0.3, drive: 1.6, peak: 0.42 + i * 0.07, sub: 0.3 });
      S.bubbles({ at, n: 3, f: 200, f1: 700, spread: 0.15, size: 0.03, peak: 0.12 });
      S.glass({ at: at + 0.1, f: mf(79 + i * 5), dur: 1.0, peak: 0.05, am: [5, 0.3], pan: (i - 1) * 0.4 });
    });
    S.choir({ at: 0.4, notes: [mf(38), mf(45), mf(50)], vowel: 'o', vowel1: 'a', dur: 2.2, a: 0.7, peak: 0.09 });   // strength coming back
    S.rumble({ at: 0.3, dur: 2.2, f: 90, f1: 130, a: 1.0, peak: 0.16 });
  });
  def('bm-grubnak-spit-up', 'bm', S => {
    S.space('room', 0.25);
    [0, 0.28].forEach((at, i) => {
      S.voice({ at, f: 110 - i * 14, f1: 70, dur: 0.22, vowel: 'a', vowel1: 'o', breath: 1.4, peak: 0.34, lp: 1100 });
      S.noise({ at, color: 'pink', bp: 700, q: 2, dur: 0.2, grain: 0.7, pts: [[0.12, 1], [0.2, 0]], peak: 0.2 });
    });
    S.voice({ at: 0.55, f: 90, f1: 150, dur: 0.4, vowel: 'o', vowel1: 'a', breath: 2, peak: 0.3, lp: 1500 });
    S.bubbles({ at: 0.55, n: 6, f: 300, f1: 1200, spread: 0.5, size: 0.02, peak: 0.2 });
    S.whoosh({ at: 0.95, f: 700, f1: 260, dur: 0.35, peakAt: 0.4, peak: 0.28, q: 1.2 });
    S.splat({ at: 1.3, peak: 0.6, dur: 0.4 });
    S.thud({ at: 1.3, f: 100, f1: 45, dur: 0.3, drive: 1.5, peak: 0.45 });
    S.wood({ at: 1.38, f: 260, dur: 0.1, peak: 0.28 });
    S.wood({ at: 1.5, f: 330, dur: 0.07, peak: 0.18 });
  });
  def('bm-grubnak-sour-burp', 'bm', S => {
    S.space('room', 0.25);
    S.voice({ f: 52, f1: 96, dur: 0.75, vowel: 'a', vowel1: 'o', breath: 1.1, peak: 0.42, lp: 900, pts: [[0.15, 1], [0.5, 0.9], [0.75, 0]] });
    S.tone({ type: 'saw', f: 64, f1: 38, lp: 360, am: [34, 0.65], dur: 0.7, peak: 0.2 });
    S.rumble({ dur: 0.9, f: 110, peak: 0.3, a: 0.04, grain: 0.7 });
    S.noise({ at: 0.25, hp: 2200, lp: 7000, dur: 0.9, pts: [[0.12, 1], [0.9, 0]], peak: 0.26, grain: 0.3 });
    S.sizzle({ at: 0.55, dur: 1.0, pts: [[0.1, 1], [0.6, 0.7], [1.0, 0]], peak: 0.2 });
    S.bubbles({ at: 0.6, n: 8, f: 700, f1: 2600, spread: 0.9, size: 0.012, peak: 0.12 });
    S.tone({ at: 0.62, f: 880, f1: 520, dur: 0.5, am: [18, 0.6], peak: 0.04 });
  });
  def('bm-grubnak-second-helping', 'bm', S => {
    S.space('room', 0.3);
    S.whoosh({ color: 'pink', f: 2400, f1: 320, q: 1.4, dur: 1.15, peakAt: 0.8, peak: 0.4 });
    S.rumble({ dur: 1.4, f: 100, f1: 160, a: 0.7, peak: 0.28 });
    [0.62, 0.9, 1.14].forEach((at, i) => {
      S.thud({ at, f: 110 - i * 15, f1: 44, dur: 0.22, drive: 1.6, peak: 0.48 + i * 0.06 });
      S.voice({ at, f: 105 - i * 12, f1: 62, dur: 0.17, vowel: 'u', vowel1: 'o', breath: 0.5, peak: 0.28, lp: 800 });
      S.bubbles({ at, n: 2, f: 200, f1: 600, spread: 0.1, size: 0.025, peak: 0.12 });
    });
    S.metal({ at: 0.2, set: 'plate', f: 520, dur: 0.5, peak: 0.07 });
    S.thud({ at: 1.38, f: 60, f1: 26, dur: 0.6, drive: 2.2, peak: 0.45, sub: 0.3 });
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
  // The revamp's moves. Long Skewer (the blue line behind the tank): the long iron drawn slowly and driven through, a ringing bar and a slow, heavy thud under it.
  def('bm-grubnak-long-skewer', 'bm', S => {
    S.space('room', 0.3);
    S.whoosh({ f: 1300, f1: 360, dur: 0.95, peakAt: 0.8, q: 1.6, peak: 0.4 });
    S.metal({ at: 0.05, set: 'bar', f: 520, dur: 1.0, peak: 0.12, am: [7, 0.4] });
    S.tone({ at: 0.1, type: 'saw', f: 300, f1: 190, dur: 0.8, a: 0.6, swell: true, lp: 1400, peak: 0.05 });
    S.wood({ at: 0.95, f: 380, dur: 0.14, peak: 0.55 });
    S.thud({ at: 0.95, f: 110, f1: 45, dur: 0.5, drive: 2, peak: 0.6 });
    S.metal({ at: 0.97, set: 'bar', f: 1500, dur: 1.4, peak: 0.13, strike: 0.3 });
    S.rumble({ at: 0.97, dur: 0.9, f: 120, peak: 0.25, a: 0.02 });
  });
  // Dinner Bell (Mains opens): a big iron bell struck three times, low and wide, a gas burner catching under each stroke, a low swell under it all (a light raidwide on the last)
  def('bm-grubnak-dinner-bell', 'bm', S => {
    S.space('hall', 0.4);
    [0, 0.9, 1.8].forEach((at, i) => {
      S.bell({ at, set: 'hand', f: mf(55 - i * 2), dur: 2.4, peak: 0.28 });
      S.noise({ at: at + 0.25, color: 'pink', lp: 250, lp1: 2200, fd: 0.35, dur: 0.6, pts: [[0.08, 1], [0.6, 0]], peak: 0.2 });
    });
    S.rumble({ dur: 3.4, f: 70, peak: 0.25, a: 0.8 });
    S.thud({ at: 1.8, f: 62, f1: 30, dur: 0.8, drive: 1.6, peak: 0.4 });
  });
  // Dessert Is Served (Dessert opens): a cloche lifted, a spoon on a glass, then the lights going down a step at a time under a low sweet chord
  def('bm-grubnak-dessert-is-served', 'bm', S => {
    S.space('hall', 0.45);
    S.metal({ set: 'plate', f: 1100, dur: 1.2, peak: 0.1, strike: 0.3 });
    S.scrape({ at: 0.05, f: 2400, q: 3, rate: 30, dur: 0.3, pts: [[0.05, 1], [0.3, 0]], peak: 0.08 });
    [[0.5, 88], [0.95, 83], [1.4, 76]].forEach(([at, n]) => S.glass({ at, f: mf(n), dur: 1.4, peak: 0.08 }));
    S.whoosh({ at: 0.3, f: 2600, f1: 180, dur: 2.6, peakAt: 0.1, peak: 0.2 });
    S.pad({ at: 0.2, notes: [mf(38), mf(45), mf(50)], type: 'tri', dur: 3.2, a: 1.2, lpEnv: [500, 900, 250, 1.0], peak: 0.12 });
    S.crackle({ at: 0.4, f: 1200, dens: 0.6, dur: 2.4, pts: [[0.4, 0.8], [2.4, 0]], peak: 0.07 });
    S.thud({ at: 2.7, f: 55, f1: 30, dur: 0.6, lp: 220, click: 0, peak: 0.3 });
  });
  // Kitchen Staff (Extreme): both larder doors flung open with a bang, hurried feet and rattling pans, two sous-chefs calling out
  def('bm-grubnak-kitchen-staff', 'bm', S => {
    S.space('room', 0.3);
    [[0, -0.8], [0.14, 0.8]].forEach(([at, pan]) => {
      S.creak({ at, dur: 0.35, f: 30, f1: 55, res: [320, 700], q: 8, peak: 0.12, pan });
      S.wood({ at: at + 0.3, f: 170, dur: 0.3, peak: 0.5, pan }); S.thud({ at: at + 0.3, f: 90, f1: 42, dur: 0.35, peak: 0.45, pan });
    });
    for (let i = 0; i < 12; i++) S.wood({ at: 0.55 + i * 0.12, f: 230 + (i % 2) * 40, dur: 0.07, peak: 0.12 + i * 0.006, pan: i % 2 ? 0.6 : -0.6 });
    for (let i = 0; i < 6; i++) S.metal({ at: S.rr(0.6, 1.9), set: 'plate', f: S.rr(500, 900), dur: 0.3, peak: 0.07, pan: S.rr(-0.7, 0.7) });
    [[0.9, -0.5, 170], [1.3, 0.5, 150]].forEach(([at, pan, f]) => S.voice({ at, f, f1: f * 0.85, dur: 0.22, vowel: 'e', vowel1: 'o', breath: 0.5, peak: 0.1, lp: 1800, pan }));
  });
  // Flashover (Extreme, the cast): the grease heating on the marked hero, a hiss that climbs and spits, the air itself tightening toward the flash
  def('bm-grubnak-flashover', 'bm', S => {
    S.space('room', 0.3);
    S.sizzle({ dur: 2.4, pts: [[1.6, 1], [2.4, 0]], peak: 0.34 });
    S.crackle({ at: 0.2, f: 2400, dens: 1.2, dur: 2.2, pts: [[0.3, 0.2], [2.0, 1], [2.2, 0]], peak: 0.24 });
    S.noise({ at: 0.4, color: 'pink', lp: 300, lp1: 3500, fd: 2.0, dur: 2.0, pts: [[1.8, 1], [2.0, 0]], peak: 0.2 });
    S.tone({ type: 'saw', f: 60, f1: 130, lp: 400, lp1: 1200, dur: 2.3, a: 1.2, swell: true, am: [14, 0.4], peak: 0.12 });
    for (let i = 0; i < 5; i++) S.wood({ at: 0.4 + i * 0.38 + S.rr(0, 0.1), f: S.rr(1800, 2800), dur: 0.02, peak: 0.1 });
  });
  // Flashover going off (roomev grubnak-flashover): a white crack of ignition, the whoomp, and the fire running out along the grease
  def('bm-grubnak-flashover-burst', 'bm', S => {
    S.space('room', 0.3);
    S.crack({ f: 2600, dur: 0.2, peak: 0.45 });
    S.noise({ at: 0.02, color: 'pink', lp: 250, lp1: 6500, fd: 0.3, dur: 1.1, pts: [[0.1, 1], [0.5, 0.6], [1.1, 0]], peak: 0.55 });
    S.thud({ at: 0.03, f: 70, f1: 28, dur: 0.7, drive: 2.2, peak: 0.6 });
    S.whoosh({ at: 0.1, f: 500, f1: 3600, dur: 0.8, peakAt: 0.4, peak: 0.3, pan: -0.5 });
    S.whoosh({ at: 0.18, f: 500, f1: 3600, dur: 0.8, peakAt: 0.4, peak: 0.25, pan: 0.5 });
    S.crackle({ at: 0.15, dens: 2.2, f: 3000, dur: 1.3, pts: [[0.2, 1], [1.3, 0]], peak: 0.28 });
  });
  // an order going over the counter (roomev grubnak-served): the service bell and a plate slid along
  def('bm-grubnak-order-served', 'bm', S => {
    S.space('room', 0.25);
    S.partials({ set: 'service', f: mf(86), dur: 0.9, peak: 0.3 });
    S.scrape({ at: 0.05, f: 1800, q: 2, rate: 22, dur: 0.3, pts: [[0.05, 1], [0.3, 0]], peak: 0.1 });
    S.wood({ at: 0.35, f: 700, dur: 0.05, peak: 0.15 });
  });
  // a plate nobody served spoils (the tower's fail): crockery smashing on the floor, a heavy slop
  def('bm-grubnak-plate-spoiled', 'bm', S => {
    S.space('room', 0.3);
    for (let i = 0; i < 7; i++) S.glass({ at: S.rr(0, 0.22), f: S.rr(1500, 4200), dur: 0.35, peak: 0.1, pan: S.rr(-0.6, 0.6) });
    S.metal({ at: 0.02, set: 'plate', f: 350, dur: 0.9, peak: 0.3, strike: 0.5 });
    S.thud({ at: 0.02, f: 100, f1: 45, dur: 0.4, peak: 0.45 });
    S.splat({ at: 0.06, peak: 0.4, dur: 0.35 });
  });
  // the number signs handed out (hmark ticket): a ticket torn from the pad, a pin tapped in
  def('bm-grubnak-ticket', 'bm', S => {
    B.parchment(S, 0, 0.25, 0.9);
    S.tick({ at: 0.18, f: 2000, peak: 0.25 }); S.tick({ at: 0.3, f: 2400, peak: 0.2 });
    S.partials({ at: 0.32, set: 'service', f: mf(90), dur: 0.5, peak: 0.12 });
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
  def('bm-skitterra-fang-strike', 'bm', S => {
    B.hiss(S, 0, 0.9, 0.6);                                                                    // she draws a breath of venom
    S.tone({ type: 'saw', f: 420, f1: 180, lp: 900, a: 0.5, dur: 1.0, peak: 0.07 });          // the body rears
    S.whoosh({ at: 0.85, f: 3200, f1: 500, dur: 0.22, peakAt: 0.9, peak: 0.4 });             // the stab, down the lane
    B.bite(S, 1.05, 1.15);
    S.crack({ at: 1.05, f: 1800, dur: 0.1, peak: 0.25 });                                     // fang on stone
    S.thud({ at: 1.05, f: 130, f1: 55, dur: 0.3, peak: 0.5 });
    S.sizzle({ at: 1.15, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.15 });                  // venom left on the floor
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

  // Skitterra's second form, Hard only (the Moth Queen). The Chrysalis is built to be dreaded (client/js/skitterra-moth.js cocoon()): a heartbeat that quickens over the
  // cast, the silk giving way thread by thread, a held breath (the sound stops dead, the music ducked), then the tear (eclosion), her shriek, and the bars refilling.
  // The heartbeat: one lub-dub, played on every beat of the cocoon (louder and faster as the cast runs; the beat is the player's clock on the check)
  def('bm-skitterra-heartbeat', 'bm', S => {
    S.thud({ f: 70, f1: 36, dur: 0.3, lp: 320, click: 0.15, drive: 2, peak: 0.85 });                                    // lub
    S.thud({ at: 0.26, f: 84, f1: 46, dur: 0.24, lp: 360, click: 0.1, drive: 1.6, peak: 0.55 });                        // dub
    S.noise({ color: 'brown', lp: 700, dur: 0.34, pts: [[0.02, 1], [0.34, 0]], peak: 0.26 });                           // the wet weight of it
    S.noise({ at: 0.005, bp: 190, q: 1.1, dur: 0.12, pts: [[0.01, 1], [0.12, 0]], peak: 0.2 });                         // enough body to carry on small speakers
    S.noise({ at: 0.265, bp: 210, q: 1.1, dur: 0.1, pts: [[0.01, 1], [0.1, 0]], peak: 0.13 });
    S.creak({ dur: 0.45, f: 26, f1: 16, res: [600, 1300], q: 8, peak: 0.05, jit: 0.4 });                                // silk straining over it
  });
  // The silk goes thread by thread, quicker and quicker, the shell creaking, while a thin pale note climbs; it is cut off dead at the end (the held breath follows)
  def('bm-skitterra-cocoon-split', 'bm', S => {
    S.space('cave', 0.3);
    [0.05, 0.3, 0.5, 0.66, 0.8, 0.92, 1.02, 1.1, 1.17, 1.23, 1.29].forEach((at, i) => B.snap(S, at, 0.35 + i * 0.05));
    S.creak({ dur: 1.6, f: 22, f1: 11, res: [500, 1200, 2400], q: 10, peak: 0.2, jit: 0.4 });
    S.crackle({ at: 0.3, f: 1300, dens: 0.8, dur: 1.3, pts: [[0.6, 0.3], [1.3, 1]], peak: 0.24 });
    S.tone({ f: mf(81), f1: mf(93), dur: 1.58, a: 1.4, swell: true, peak: 0.07, vib: [6, 0.012] });
    S.tone({ f: mf(82), f1: mf(94.2), dur: 1.58, a: 1.4, swell: true, peak: 0.05, vib: [5, 0.01] });                    // (a hair off it: it grates)
    S.tone({ f: mf(40), f1: mf(43), dur: 1.58, a: 1.2, swell: true, lp: 400, type: 'saw', peak: 0.1 });
  });
  // Eclosion: the tear. The shell splits all at once, the wet burst, then wings opening: papery dust and a slow beat as they unfurl and dry
  def('bm-skitterra-eclosion', 'bm', S => {
    S.space('cave', 0.4);
    S.crack({ f: 1900, peak: 0.5, ech: 0.3 });                                                                // the shell goes
    [0, 0.04, 0.09, 0.15, 0.22].forEach((at, i) => B.snap(S, at, 0.8 - i * 0.1));
    S.crackle({ f: 1400, dens: 0.9, dur: 0.9, pts: [[0.04, 1], [0.9, 0]], peak: 0.32 });                      // the husk splitting
    S.splat({ at: 0.03, peak: 0.5, dur: 0.5 });
    S.thud({ at: 0.02, f: 70, f1: 28, dur: 0.8, drive: 2.4, peak: 0.75, sub: 0.3 });                          // the burst
    S.noise({ at: 0.02, color: 'brown', lp: 1600, grain: 0.7, dur: 0.8, pts: [[0.02, 1], [0.8, 0]], peak: 0.28 });
    B.parchment(S, 0.12, 1.3, 1.1);                                                                          // wings opening: dry, papery
    S.whoosh({ at: 0.2, f: 300, f1: 2200, dur: 1.2, peakAt: 0.55, am: [11, 0.6], peak: 0.3 });
    [0.62, 1.22].forEach((at, i) => { S.thud({ at, f: 60 - i * 8, f1: 38, dur: 0.4, lp: 200, click: 0, peak: 0.4 - i * 0.08 }); S.whoosh({ at: at - 0.05, f: 200, f1: 700, dur: 0.4, peak: 0.2 }); });   // the first slow beats
    S.glass({ at: 0.3, f: mf(88), dur: 1.8, peak: 0.05, am: [6, 0.4] });
    S.tone({ at: 0.25, f: mf(43), f1: mf(46), dur: 1.8, a: 0.9, swell: true, lp: 500, type: 'saw', peak: 0.1 });
  });
  // Her first cry: a shriek that climbs and breaks, two throats a hair apart so it grates, a rasp of wing-dust in it, the cave giving it back
  def('bm-skitterra-moth-shriek', 'bm', S => {
    S.space('cave', 0.6);
    S.echo({ time: 0.17, fb: 0.4, lp: 3500, kill: 3 });
    S.voice({ f: 640, f1: 1900, dur: 1.5, vowel: 'a', vowel1: 'e', breath: 2.5, peak: 0.34, lp: 7000, pts: [[0.12, 1], [0.75, 1], [1.5, 0]] });
    S.voice({ f: 690, f1: 2050, dur: 1.5, vowel: 'e', vowel1: 'i', breath: 2, peak: 0.26, lp: 7000, pts: [[0.12, 1], [0.75, 1], [1.5, 0]] });
    S.tone({ f: 1300, f1: 3900, dur: 1.4, a: 0.1, fm: [2.01, 3, 0.5], peak: 0.07, vib: [18, 0.02] });
    S.noise({ hp: 3500, lp: 9000, am: [47, 0.9], dur: 1.4, pts: [[0.1, 1], [0.8, 0.8], [1.4, 0]], peak: 0.16, grain: 0.6 });
    S.rumble({ dur: 1.6, f: 80, peak: 0.25, a: 0.05 });
    B.parchment(S, 0.1, 1.2, 0.7);
  });
  // The bars refilling: light pouring back into her, a surge for each of the three, climbing, over a deep swell; ends on a clear high chord
  def('bm-skitterra-rebirth', 'bm', S => {
    S.space('cave', 0.45);
    [0, 0.55, 1.1].forEach((at, i) => {
      S.whoosh({ at, f: 300 + i * 150, f1: 2400 + i * 800, dur: 0.7, peakAt: 0.75, peak: 0.26 + i * 0.04 });
      S.glass({ at: at + 0.05, f: mf(72 + i * 7), dur: 1.6, peak: 0.08 + i * 0.01, am: [6, 0.3] });
      S.thud({ at: at + 0.5, f: 58 + i * 8, f1: 38, dur: 0.4, lp: 220, click: 0, peak: 0.4 });
      S.sizzle({ at, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.07 + i * 0.02 });
    });
    S.tone({ f: mf(45), f1: mf(52), dur: 2.2, a: 1.5, swell: true, lp: 600, type: 'saw', peak: 0.12 });
    [0, 7, 12, 16].forEach((n, i) => S.glass({ at: 1.5 + i * 0.1, f: mf(84 + n), dur: 1.8, peak: 0.06, am: [5, 0.3], pan: (i - 1.5) * 0.4 }));
  });
  // the name over the boss bar: a low pale chord and a slow wingbeat, glass dust over it
  def('bm-skitterra-moth-queen', 'sting', S => {
    S.space('cave', 0.5);
    S.choir({ at: 0.1, notes: [mf(45), mf(52), mf(55)], vowel: 'o', vowel1: 'a', dur: 2.4, a: 0.9, peak: 0.1 });
    [0.2, 0.95, 1.6].forEach((at, i) => { S.thud({ at, f: 58, f1: 36, dur: 0.45, lp: 220, click: 0, peak: 0.42 - i * 0.06 }); S.whoosh({ at: at - 0.1, f: 200, f1: 800, dur: 0.5, peak: 0.18 }); });   // wings: slow, heavy
    [0, 7, 12, 16].forEach((n, i) => S.glass({ at: 0.7 + i * 0.14, f: mf(84 + n), dur: 1.6, peak: 0.07, am: [5, 0.3], pan: (i - 1.5) * 0.4 }));
    B.parchment(S, 0.4, 1.4, 0.5);
  });
  // Scale Wave: the wings beat over the hub (three heavy beats, each a push of air) and the dust rolls out in two ripples:
  // a wide hush out beyond the hub first, then a deeper boom as it folds in over the hub
  def('bm-skitterra-scale-wave', 'bm', S => {
    S.space('cave', 0.3);
    [0, 0.6, 1.2].forEach((at, i) => { S.thud({ at: at + 0.25, f: 62, f1: 34, dur: 0.5, lp: 240, click: 0, peak: 0.4 + i * 0.1 }); S.whoosh({ at, f: 180, f1: 700 + i * 200, dur: 0.5, peakAt: 0.7, peak: 0.28 + i * 0.05 }); B.parchment(S, at + 0.15, 0.4, 0.6); });
    S.noise({ at: 1.9, color: 'pink', hp: 1200, lp: 6500, dur: 1.2, pts: [[0.25, 1], [0.7, 0.7], [1.2, 0]], peak: 0.2, grain: 0.6 });                                   // ripple one: dust racing outward
    S.whoosh({ at: 1.9, f: 500, f1: 3200, dur: 1.0, peakAt: 0.6, peak: 0.28 });
    S.thud({ at: 3.1, f: 55, f1: 28, dur: 0.8, drive: 2, peak: 0.6, lp: 300 });                                                                                          // ripple two: the hub
    S.rumble({ at: 3.0, dur: 1.0, f: 110, peak: 0.28, a: 0.04 });
    S.noise({ at: 3.05, bp: 3000, q: 1, dur: 0.6, grain: 0.8, pts: [[0.03, 1], [0.6, 0]], peak: 0.16 });
  });
  // Flutter: a quick dry shiver of wings, then three passes down the cave, each higher and nearer: a papery rush across the speakers
  def('bm-skitterra-flutter', 'bm', S => {
    S.noise({ bp: 2200, q: 2, am: [38, 0.85], dur: 1.3, pts: [[0.8, 1], [1.3, 0]], peak: 0.14 });                                // the wings' shiver, building
    S.tone({ type: 'saw', f: 150, f1: 240, lp: 700, am: [30, 0.8], a: 1.0, dur: 1.4, swell: true, peak: 0.06 });
    [[1.5, -0.7, 1], [2.3, 0.7, 1.15], [3.1, 0, 1.3]].forEach(([at, pan, k], i) => {
      S.whoosh({ at, f: 600 * k, f1: 2800 * k, dur: 0.45, peakAt: 0.55, am: [24, 0.5], peak: 0.4, pan });
      B.parchment(S, at + 0.05, 0.4, 0.8);
      S.thud({ at: at + 0.4, f: 90, f1: 40, dur: 0.25, peak: 0.3 + i * 0.08 });
    });
  });
  // Moonlight: a pale column of light: a glass chord swelling up through a hush, a high pure note, then the dust settling
  def('bm-skitterra-moonlight', 'bm', S => {
    S.space('cave', 0.55);
    [0, 7, 12, 19, 24].forEach((n, i) => S.glass({ at: i * 0.22, f: mf(72 + n), dur: 2.2 - i * 0.2, peak: 0.075, am: [5 + i, 0.3], pan: (i - 2) * 0.25 }));
    S.tone({ f: mf(60), f1: mf(72), dur: 2.4, a: 2.0, swell: true, peak: 0.14, vib: [5, 0.006] });
    S.tone({ at: 0.6, f: mf(84), dur: 2.2, a: 1.6, swell: true, peak: 0.07, vib: [6, 0.01] });
    S.noise({ hp: 5000, dur: 2.4, pts: [[1.9, 1], [2.4, 0]], peak: 0.07 });
    S.sizzle({ at: 2.5, dur: 1.0, pts: [[0.1, 1], [1.0, 0]], peak: 0.14 });                                                 // the scales settling on the floor
    S.thud({ at: 2.4, f: 70, f1: 40, dur: 0.5, lp: 260, click: 0, peak: 0.34 });
  });
  // The revamp's moves (Extreme). Cat's Cradle: four heroes tied by silk, two strands drawn taut and plucked in turn across the room (a pitch higher each time), the silk straining
  // under them; the web's tightening itself is bm-skitterra-cradle-tighten
  def('bm-skitterra-cats-cradle', 'bm', S => {
    S.space('cave', 0.35);
    [[0, 64, -0.6], [0.4, 71, 0.6], [0.8, 67, -0.6], [1.2, 74, 0.6], [1.6, 71, -0.6], [2.0, 78, 0.6]].forEach(([at, n, pan]) => S.pluck({ at, f: mf(n), type: 'tri', dur: 0.7, bright: 6, peak: 0.16, pan }));
    B.silk(S, 0.1, 2.4, 0.9, 1.3);
    S.tone({ at: 0.3, f: mf(76), f1: mf(84), dur: 2.2, a: 1.8, swell: true, peak: 0.05, vib: [6, 0.008] });
    S.tone({ at: 0.3, f: mf(76) * 1.011, f1: mf(84) * 0.99, dur: 2.2, a: 1.8, swell: true, peak: 0.04 });
    S.tone({ at: 0.2, type: 'saw', f: 90, f1: 120, lp: 450, dur: 2.4, a: 1.6, swell: true, peak: 0.07 });
  });
  // the strands pulled tight (roomev cradle-tighten): a run of snaps and one deep twang as the web closes on the party
  def('bm-skitterra-cradle-tighten', 'bm', S => {
    S.space('cave', 0.3);
    [0, 0.06, 0.12, 0.2].forEach((at, i) => B.snap(S, at, 0.8 - i * 0.1));
    S.pluck({ at: 0.05, f: 85, type: 'saw', bend: -5, dur: 1.0, bright: 8, peak: 0.34 });
    S.creak({ dur: 0.9, f: 40, f1: 22, res: [900, 2000, 3600], q: 14, peak: 0.22 });
    S.thud({ at: 0.22, f: 70, f1: 32, dur: 0.6, drive: 2, peak: 0.55 });
    S.whoosh({ at: 0.05, f: 400, f1: 2600, dur: 0.4, peakAt: 0.3, peak: 0.25 });
  });
  // the crossed strands burning (roomev cradle-burn): a thin spark where the silk crosses, a hiss
  def('bm-skitterra-cradle-burn', 'bm', S => {
    B.zing(S, 0, 1, -0.4); B.zing(S, 0.05, 0.8, 0.4);
    S.crackle({ f: 3500, dens: 2, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.22 });
    S.sizzle({ at: 0.05, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.2 });
    S.thud({ at: 0.02, f: 140, f1: 70, dur: 0.18, peak: 0.28 });
  });
  // Lure: a brood's warmth to lead the shadow by: slow wet egg-pulses under a thin whistle that falls and falls, silk hissing as it comes
  def('bm-skitterra-lure', 'bm', S => {
    S.space('cave', 0.4);
    [0, 0.5, 1.0].forEach((at, i) => { S.thud({ at, f: 64, f1: 38, dur: 0.3, lp: 240, click: 0.1, peak: 0.34 - i * 0.04 }); S.bubbles({ at: at + 0.05, n: 3, f: 200, f1: 600, spread: 0.2, size: 0.035, peak: 0.1, lp: 1000 }); });
    S.tone({ at: 0.1, f: 1900, f1: 420, glide: 1.6, dur: 1.7, a: 0.25, peak: 0.08, vib: [5, 0.015] });
    S.tone({ at: 0.1, f: 1930, f1: 430, glide: 1.6, dur: 1.7, a: 0.25, peak: 0.05 });
    B.hiss(S, 0.5, 1.2, 0.5);
    S.rumble({ at: 0.2, dur: 1.6, f: 80, peak: 0.16, a: 0.5 });
  });
  // an egg clutch crushed under the shadow (roomev lure-crush): the shells going in one wet crunch
  def('bm-skitterra-lure-crush', 'bm', S => {
    S.thud({ f: 85, f1: 38, dur: 0.5, drive: 1.8, peak: 0.6, lp: 400 });
    for (let i = 0; i < 6; i++) S.wood({ at: S.rr(0, 0.12), f: S.rr(900, 1700), dur: 0.05, peak: 0.22, pan: S.rr(-0.4, 0.4) });
    S.splat({ at: 0.02, peak: 0.55, dur: 0.4 });
    S.crackle({ f: 1800, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.2 });
  });
  // a clutch split before it was ripe (roomev lure-hatch): a burst of shell, the brood spilling out chittering, a hiss
  def('bm-skitterra-lure-hatch', 'bm', S => {
    S.crack({ f: 1500, dur: 0.2, peak: 0.3 });
    S.splat({ at: 0.03, peak: 0.45, dur: 0.4 });
    S.skitter({ at: 0.1, n: 22, dur: 0.7, f: 2400, peak: 0.2 });
    B.hiss(S, 0.1, 0.6, 0.5);
    S.bubbles({ at: 0.05, n: 5, f: 250, f1: 900, spread: 0.4, size: 0.03, peak: 0.1 });
  });
  // Imprint: the hatchlings fixing on a hero: a burst of chittering, two bright locking pings and the acid beginning to bubble in the floor
  def('bm-skitterra-imprint', 'bm', S => {
    S.space('cave', 0.35);
    S.skitter({ n: 24, dur: 0.9, f: 2600, peak: 0.2, bias: 0.7 });
    [0.5, 0.8].forEach((at, i) => { S.tone({ at, f: 1100 + i * 380, f1: 1500 + i * 500, glide: 0.05, dur: 0.18, peak: 0.16 }); S.glass({ at: at + 0.02, f: mf(88 + i * 4), dur: 0.8, peak: 0.07 }); });
    S.bubbles({ at: 0.6, n: 12, f: 180, f1: 700, spread: 1.2, size: 0.05, peak: 0.12, lp: 1300 });
    S.sizzle({ at: 0.7, dur: 1.2, pts: [[0.3, 1], [1.2, 0]], peak: 0.14 });
    S.tone({ type: 'saw', f: 55, lp: 240, am: [5, 0.7], dur: 1.6, a: 0.4, peak: 0.12 });
  });
  // a hatchling's shell dissolving in the acid (roomev imprint-wash): a rising fizz and the pop as it gives
  def('bm-skitterra-imprint-wash', 'bm', S => {
    S.sizzle({ dur: 0.8, pts: [[0.5, 1], [0.8, 0]], peak: 0.3 });
    S.bubbles({ n: 8, f: 400, f1: 2400, spread: 0.5, size: 0.02, peak: 0.12 });
    S.glass({ at: 0.55, f: mf(86), dur: 0.7, peak: 0.1 });
    S.splat({ at: 0.6, peak: 0.25, dur: 0.25 });
  });
  // a strand cut (a knot struck, propfx chip with no id): one clean snap and the silk going slack
  def('bm-skitterra-strand-cut', 'bm', S => {
    B.snap(S, 0, 1);
    S.whoosh({ at: 0.03, f: 3200, f1: 500, dur: 0.35, peakAt: 0.1, peak: 0.2 });
    S.pluck({ at: 0.05, f: 240, bend: -10, type: 'tri', dur: 0.4, peak: 0.1 });
  });
  // a cocoon cracked or broken (propfx on the prop): the shell splitting, dry silk
  def('bm-skitterra-cocoon-crack', 'bm', S => {
    S.crack({ f: 1600, dur: 0.18, peak: 0.28 });
    S.crackle({ at: 0.02, f: 1400, dens: 0.9, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.2 });
    B.parchment(S, 0.04, 0.4, 0.7);
    S.thud({ at: 0.02, f: 100, f1: 50, dur: 0.3, lp: 400, peak: 0.35 });
  });
  // the venom carried off (hmarkx venom): a small clean note, the hiss going out of the air
  def('bm-skitterra-venom-cure', 'bm', S => {
    S.glass({ f: mf(84), dur: 0.9, peak: 0.1 }); S.glass({ at: 0.09, f: mf(91), dur: 0.8, peak: 0.08 });
    S.whoosh({ f: 1800, f1: 400, dur: 0.4, peakAt: 0.2, peak: 0.1 });
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
  def('bm-volkar-static-lash', 'bm', S => {
    S.space('hall', 0.25);
    S.whoosh({ f: 400, f1: 3200, dur: 0.55, peakAt: 0.9, peak: 0.28, q: 1.4 });
    S.crackle({ dens: 2.2, f: 5000, dur: 0.6, pts: [[0.1, 0.4], [0.55, 1], [0.6, 0]], peak: 0.14 });
    S.zap({ at: 0.5, f: 90, f1: 150, dur: 0.35, bf: 2200, a: 0.01, peak: 0.28 });
    S.crack({ at: 0.58, f: 3200, peak: 0.42, dur: 0.12 });
    S.crackle({ at: 0.6, lp: 3500, dur: 0.5, pts: [[0.02, 1], [0.5, 0]], peak: 0.2 });
    S.rumble({ at: 0.6, dur: 0.7, f: 150, peak: 0.2, a: 0.03 });
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

  // The Storm Unbound (Hard) is a slow dread and then a payoff, and the sound follows it (volkar-storm.js event() plays the rest on its clock):
  //   the cast: the wind letting go (this recipe), then far thunder coming nearer (roll, roll, clap, clap) and the stone groaning (groan), then the
  //   calm (hush: the music is ducked and the Pulse stops, so it is nearly silent), the burst, the roar as the face opens its eyes, and the charge
  def('bm-volkar-storm-unbound', 'bm', S => {
    S.space('hall', 0.35);
    // the roar of the storm drawn down to nothing, and a dread drone coming up under it (all gone before the calm, 3.8 s before the burst)
    S.whoosh({ color: 'pink', f: 1900, f1: 160, dur: 3.5, peakAt: 0.08, peak: 0.36, q: 0.6 });
    S.noise({ color: 'brown', lp: 900, lp1: 120, dur: 3.5, fd: 3.5, pts: [[0.1, 1], [3.5, 0]], peak: 0.26, grain: 0.5 });
    B.thunder(S, 0.15, 0.55, true);
    S.tone({ f: mf(30), f1: mf(30) * 0.97, dur: 3.7, a: 2.2, swell: true, peak: 0.2 });
    S.tone({ type: 'sawtooth', f: mf(36), dur: 3.5, a: 2.6, swell: true, lp: 260, peak: 0.07, am: [0.8, 0.5] });
    S.glass({ at: 1.2, f: mf(78), dur: 1.8, peak: 0.04 });
    // the first groan of the stone
    S.creak({ at: 1.5, dur: 1.5, f: 26, f1: 48, res: [160, 330, 640], q: 9, peak: 0.2, jit: 0.4 });
    S.thud({ at: 2.9, f: 60, f1: 30, dur: 0.6, drive: 2, peak: 0.28 });
  });
  // far thunder, still a long way off (the first two flashes): a low roll that comes and goes
  def('bm-volkar-storm-roll', 'bm', S => {
    S.space('hall', 0.55);
    B.thunder(S, 0, 1, true);
    S.rumble({ at: 0.4, dur: 2.2, f: 70, f1: 45, peak: 0.3, a: 0.6, grain: 0.6, am: [S.rr(2, 4), 0.5] });
  });
  // thunder close enough to feel (the last two flashes): a crack and a long rolling boom
  def('bm-volkar-storm-clap', 'bm', S => {
    S.space('hall', 0.5);
    S.echo({ time: 0.3, fb: 0.35, lp: 1300, kill: 3 });
    S.crack({ f: 1400, peak: 0.45, ech: 0.4 });
    B.thunder(S, 0.02, 1.0);
    S.thud({ at: 0.03, f: 60, f1: 28, dur: 0.9, drive: 2.5, peak: 0.5, sub: 0.3 });
  });
  // the stone of his body groaning under the strain: a long creak, a dull breath of dust and a crack at the end of it
  def('bm-volkar-storm-groan', 'bm', S => {
    S.space('cave', 0.35);
    S.creak({ dur: 1.7, f: 22, f1: 44, res: [140, 290, 560, 980], q: 8, peak: 0.34, jit: 0.45 });
    S.noise({ color: 'brown', lp: 400, dur: 1.6, pts: [[0.5, 1], [1.6, 0]], peak: 0.2, grain: 0.8 });
    S.crack({ at: 1.25, f: 1000, peak: 0.28, dur: 0.1 });
    S.partials({ at: 1.27, set: 'stone', f: 300, dur: 0.45, peak: 0.12, strike: 0.6 });
  });
  // the calm (3.8 s, as long as the calm itself): the air goes out of the world, a thin high tone hangs in what is left, the stone's heart beats
  // (faster and heavier) with a groan between, tiny cracks run through it, and the breath is drawn in; then nothing, and the burst
  def('bm-volkar-storm-hush', 'bm', S => {
    S.space('hall', 0.4);
    S.whoosh({ f: 900, f1: 60, dur: 0.6, peakAt: 0.1, peak: 0.3, q: 0.7 });
    S.tone({ f: mf(95), dur: 3.5, a: 1.3, swell: true, peak: 0.05, vib: [5, 0.004] });
    S.tone({ f: mf(96.3), dur: 3.5, a: 1.4, swell: true, peak: 0.04 });
    [[0.9, 0.28], [1.9, 0.34], [2.7, 0.4], [3.15, 0.46]].forEach(([at, pk]) => {
      S.thud({ at, f: 52, f1: 26, dur: 0.5, drive: 2, peak: pk, sub: 0.3 });
      S.thud({ at: at + 0.2, f: 46, f1: 24, dur: 0.4, drive: 1.5, peak: pk * 0.5 });
    });
    [0.6, 1.6, 2.35].forEach((at, i) => S.creak({ at, dur: 1.0, f: 24, f1: 40 + i * 4, res: [150, 310, 620], q: 9, peak: 0.12 + 0.03 * i, jit: 0.4 }));
    [2.85, 3.0, 3.3, 3.42].forEach((at, i) => S.crack({ at, f: 2200 - i * 150, peak: 0.1 + 0.03 * i, dur: 0.06, pan: i % 2 ? 0.4 : -0.4 }));
    S.whoosh({ at: 3.05, f: 300, f1: 3600, dur: 0.72, peakAt: 0.95, peak: 0.26, q: 1.2 });
  });
  // the burst: the stone body goes up in one crack, a boom through the whole summit, shattered rock and the storm let loose
  def('bm-volkar-storm-burst', 'bm', S => {
    S.space('hall', 0.6);
    S.echo({ time: 0.33, fb: 0.4, lp: 1400, kill: 4 });
    S.crack({ f: 1600, peak: 0.7, ech: 0.5 });
    S.thud({ f: 50, f1: 18, dur: 1.6, drive: 3.5, peak: 0.9, sub: 0.5 });
    S.noise({ hp: 800, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.4, grain: 0.6 });
    S.whoosh({ at: 0.05, f: 3000, f1: 200, dur: 1.4, peakAt: 0.05, peak: 0.42 });
    for (let i = 0; i < 9; i++) { const at = 0.04 + i * 0.07 + S.rr(0, 0.05); S.crack({ at, f: S.rr(900, 1800), peak: 0.2, dur: 0.1, pan: S.rr(-0.7, 0.7) }); S.partials({ at, set: 'stone', f: S.rr(200, 560), dur: 0.4, peak: 0.12, strike: 0.6, pan: S.rr(-0.7, 0.7) }); }
    B.thunder(S, 0.05, 1.2);
    S.rumble({ at: 0.2, dur: 3.2, f: 110, f1: 60, peak: 0.45, a: 0.1, grain: 0.6, am: [4, 0.5] });
    S.crackle({ at: 0.1, dens: 2, f: 3500, dur: 2.2, pts: [[0.15, 1], [2.2, 0]], peak: 0.22 });
  });
  // the roar as the face opens its eyes: a huge low voice made of thunder, with a crack of the first look
  def('bm-volkar-storm-roar', 'bm', S => {
    S.space('hall', 0.6);
    S.crack({ at: 0.02, f: 1200, peak: 0.35, ech: 0.3 });
    S.tone({ type: 'sawtooth', f: 55, f1: 38, dur: 2.4, pts: [[0.12, 1], [1.6, 0.8], [2.4, 0]], lp: 520, lp1: 220, am: [11, 0.5], vib: [6, 0.03], peak: 0.38 });
    S.tone({ type: 'sawtooth', f: 82, f1: 57, dur: 2.2, pts: [[0.15, 1], [1.5, 0.7], [2.2, 0]], lp: 700, lp1: 300, am: [13, 0.5], peak: 0.17 });
    S.noise({ color: 'brown', bp: 260, bp1: 140, q: 1.5, dur: 2.4, pts: [[0.12, 1], [1.6, 0.8], [2.4, 0]], am: [17, 0.6], peak: 0.4 });
    S.noise({ color: 'pink', bp: 900, bp1: 450, q: 2, dur: 2.2, pts: [[0.1, 1], [2.2, 0]], am: [23, 0.7], peak: 0.14 });
    S.thud({ at: 0.02, f: 48, f1: 20, dur: 1.3, drive: 3, peak: 0.7, sub: 0.4 });
    B.thunder(S, 0.2, 0.9);
  });
  // the charge: three bolts poured down into the heart, each heavier than the last (at 0.4 s, 1.2 s and 2.0 s: the host fills a bar on each), a rising
  // rush of lightning under them
  def('bm-volkar-storm-charge', 'bm', S => {
    S.space('hall', 0.45);
    S.crackle({ dens: 2.2, f: 3500, dur: 3.0, pts: [[0.4, 0.3], [2.0, 0.9], [2.8, 0.5], [3.0, 0]], peak: 0.2 });
    S.whoosh({ f: 300, f1: 2600, dur: 2.8, peakAt: 0.7, peak: 0.3, q: 0.8 });
    S.zap({ f: 60, f1: 140, dur: 2.7, bf: 1800, am: [9, 0.4], a: 0.2, peak: 0.12 });
    [0.4, 1.2, 2.0].forEach((at, i) => {
      B.bolt(S, at, 0.75 + 0.15 * i);
      S.thud({ at: at + 0.03, f: 70 - i * 8, f1: 24, dur: 0.9, drive: 3, peak: 0.55 + 0.1 * i, sub: 0.35 });
      S.glass({ at: at + 0.05, f: mf(72 + i * 4), dur: 1.0, peak: 0.07 });
      S.rumble({ at: at + 0.05, dur: 0.9, f: 120, peak: 0.25, a: 0.02 });
    });
  });
  // the Storm Heart (the form's name on the boss bar): a hung, humming core with sparks leaping off it
  def('bm-volkar-storm-heart', 'bm', S => {
    S.space('hall', 0.45);
    S.tone({ type: 'saw', f: 55, lp: 500, am: [7, 0.55], dur: 1.6, a: 0.4, peak: 0.22 });
    S.tone({ f: mf(52), f1: mf(52) * 1.02, dur: 1.6, a: 0.5, swell: true, peak: 0.12, vib: [4, 0.01] });
    S.zap({ f: 65, f1: 110, dur: 1.6, bf: 1600, am: [9, 0.5], a: 0.2, peak: 0.16 });
    [0.5, 0.9, 1.25].forEach((at, i) => S.crack({ at, f: 2400, peak: 0.2, dur: 0.08, pan: [-0.5, 0.4, -0.2][i] }));
    S.glass({ at: 0.15, f: mf(79), dur: 1.3, peak: 0.07 });
    S.rumble({ dur: 1.8, f: 90, peak: 0.25, a: 0.3 });
  });
  // Storm Arm (Hard): a long lightning arm swung down, a heavy slam with a crack of fork lightning
  def('bm-volkar-storm-arm', 'bm', S => {
    S.space('hall', 0.35);
    S.whoosh({ f: 250, f1: 2600, dur: 0.7, peakAt: 0.92, peak: 0.4, q: 0.8 });
    S.crackle({ dens: 2.2, f: 4500, dur: 0.7, pts: [[0.1, 0.4], [0.68, 1], [0.7, 0]], peak: 0.14 });
    S.zap({ at: 0.55, f: 70, f1: 140, dur: 0.18, bf: 2000, a: 0.01, peak: 0.28 });
    B.slam(S, 0.72, 1.1, 62);
    S.crack({ at: 0.72, f: 2000, peak: 0.55, dur: 0.12, ech: 0.3 });
    S.partials({ at: 0.74, set: 'stone', f: 260, dur: 0.5, peak: 0.25, strike: 0.6 });
    S.crackle({ at: 0.74, lp: 3000, dens: 1.5, dur: 1.0, pts: [[0.02, 1], [1.0, 0]], peak: 0.25 });
    S.tone({ at: 0.9, f: 110, am: [40, 0.5], dur: 0.9, a: 0.05, pts: [[0.05, 1], [0.9, 0]], peak: 0.08 });
  });
  // Crossing Arms (Hard): two quick rakes, one a beat after the other, each a hiss of lightning dragged across stone
  def('bm-volkar-crossing-arms', 'bm', S => {
    S.space('hall', 0.35);
    [[0, -0.7, 1], [0.55, 0.7, 0.8]].forEach(([at, pan, pk]) => {
      S.whoosh({ at, f: 600, f1: 4200, dur: 0.5, peakAt: 0.5, peak: 0.34 * pk, q: 1.2, pan });
      S.crackle({ at: at + 0.1, dens: 3, f: 5500, dur: 0.6, pts: [[0.1, 1], [0.6, 0]], peak: 0.2 * pk, pan });
      S.scrape({ at: at + 0.12, f: 1600, q: 3, rate: 40, dur: 0.5, pts: [[0.1, 1], [0.5, 0]], peak: 0.1 * pk, pan });
      S.crack({ at: at + 0.2, f: 3000, peak: 0.35 * pk, dur: 0.1, pan });
      S.thud({ at: at + 0.2, f: 85, f1: 40, dur: 0.4, peak: 0.4 * pk, pan });
    });
    S.rumble({ dur: 1.4, f: 110, peak: 0.25, a: 0.1 });
  });
  // Reaching Arms (Hard): two towers humming, a low gold one and a high blue one, beating against each other
  def('bm-volkar-reaching-arms', 'bm', S => {
    S.space('hall', 0.5);
    B.polarity(S, 0, true, 1.1);
    B.polarity(S, 0.35, false, 1.1);
    S.tone({ at: 0.1, f: mf(57), f1: mf(57) * 1.01, dur: 1.5, a: 0.5, swell: true, pan: -0.5, peak: 0.12 });
    S.tone({ at: 0.35, f: mf(76), dur: 1.3, a: 0.5, swell: true, pan: 0.5, peak: 0.08, am: [6, 0.4] });
    S.rumble({ at: 0.5, dur: 1.3, f: 80, f1: 160, peak: 0.28, a: 0.5 });
    S.crackle({ at: 0.6, dens: 1.5, f: 4000, dur: 1.0, pts: [[0.4, 1], [1.0, 0]], peak: 0.12 });
    S.thud({ at: 1.2, f: 120, f1: 55, dur: 0.3, peak: 0.35 });
  });
  // The revamp's moves. Magnetize: the summit turned into a lodestone, a low hum that swells, two tones sliding together while a field of sparks builds and iron rings against iron
  def('bm-volkar-magnetize', 'bm', S => {
    S.space('hall', 0.35);
    S.tone({ type: 'saw', f: 48, f1: 64, lp: 300, lp1: 700, am: [13, 0.5], dur: 2.4, a: 1.4, swell: true, peak: 0.22 });
    S.tone({ at: 0.1, f: mf(62), f1: mf(67), dur: 2.2, a: 1.2, swell: true, peak: 0.1 });
    S.tone({ at: 0.1, f: mf(74), f1: mf(67) * 1.006, dur: 2.2, a: 1.2, swell: true, peak: 0.07 });
    S.crackle({ at: 0.3, dens: 1.6, f: 3800, dur: 2.0, pts: [[1.6, 1], [2.0, 0]], peak: 0.16 });
    [0.5, 1.0, 1.5, 1.9].forEach((at, i) => S.metal({ at, set: 'bar', f: 700 + i * 220, dur: 0.5, peak: 0.1 + i * 0.02, pan: i % 2 ? 0.5 : -0.5 }));
    S.rumble({ dur: 2.4, f: 90, peak: 0.22, a: 1.0 });
  });
  // the pull (roomev volkar-magnetize, a pair of opposite charges): everything rushing inward, two irons meeting with a clang and a heavy thud
  def('bm-volkar-magnet-pull', 'bm', S => {
    S.whoosh({ f: 3200, f1: 400, dur: 0.6, peakAt: 0.7, q: 1.1, peak: 0.42 });
    S.zap({ at: 0.1, f: 70, f1: 150, dur: 0.5, bf: 1800, a: 0.1, peak: 0.16 });
    S.metal({ at: 0.58, set: 'plate', f: 520, dur: 0.9, peak: 0.28, strike: 0.5 });
    S.crack({ at: 0.58, f: 2200, dur: 0.12, peak: 0.3 });
    S.thud({ at: 0.58, f: 80, f1: 34, dur: 0.6, drive: 2, peak: 0.6 });
  });
  // the throw (a pair of like charges): a hard burst outward, a crack, the bodies sent flying
  def('bm-volkar-magnet-push', 'bm', S => {
    S.crack({ f: 2400, dur: 0.15, peak: 0.45 });
    S.thud({ f: 70, f1: 30, dur: 0.5, drive: 2.2, peak: 0.55 });
    S.whoosh({ at: 0.02, f: 500, f1: 4200, dur: 0.55, peakAt: 0.2, q: 1.1, peak: 0.4 });
    S.zap({ at: 0.02, f: 110, f1: 60, dur: 0.4, bf: 2600, a: 0.01, peak: 0.2 });
    S.metal({ at: 0.04, set: 'bar', f: 1300, dur: 0.5, peak: 0.1 });
  });
  // The Sky Lowers (Normal's last act opens): low and wide, the whole cloud settling over the summit, the wind dropping out from under it, far thunder in its belly
  def('bm-volkar-the-sky-lowers', 'bm', S => {
    S.space('hall', 0.5);
    S.whoosh({ color: 'pink', f: 1800, f1: 130, dur: 3.2, peakAt: 0.15, q: 0.6, peak: 0.28 });
    S.tone({ f: mf(31), f1: mf(29), dur: 3.4, a: 2.0, swell: true, peak: 0.2 });
    S.tone({ type: 'saw', f: mf(38), dur: 3.2, a: 2.2, swell: true, lp: 240, peak: 0.07, am: [0.9, 0.5] });
    B.thunder(S, 0.3, 0.55, true);
    S.rumble({ at: 0.5, dur: 2.8, f: 80, f1: 50, peak: 0.28, a: 1.2 });
    S.creak({ at: 1.2, dur: 1.4, f: 24, f1: 44, res: [160, 330, 640], q: 9, peak: 0.12, jit: 0.4 });
    S.thud({ at: 3.0, f: 48, f1: 26, dur: 0.8, drive: 1.6, peak: 0.3, lp: 220 });
  });
  // the charge swap (roomev volkar-shift): the gold note sliding down and the blue sliding up as they cross, a spark between
  def('bm-volkar-charge-swap', 'bm', S => {
    S.tone({ f: mf(69), f1: mf(57), dur: 0.55, a: 0.02, peak: 0.2, pan: -0.4 });
    S.tone({ f: mf(64), f1: mf(76), dur: 0.55, a: 0.02, peak: 0.16, pan: 0.4 });
    S.glass({ at: 0.28, f: mf(88), dur: 0.7, peak: 0.08 });
    S.zap({ at: 0.24, f: 100, dur: 0.2, peak: 0.16 });
    S.crack({ at: 0.27, f: 2800, dur: 0.1, peak: 0.2 });
  });
  // Conduction (Extreme): a bolt gathering over one hero and reaching along an unseen line of heroes: static building, links of chain pulling tight one after another
  def('bm-volkar-conduction', 'bm', S => {
    S.space('hall', 0.3);
    S.crackle({ dens: 1.4, f: 3200, dur: 3.0, pts: [[0.4, 0.2], [2.7, 1], [3.0, 0]], peak: 0.22 });
    S.zap({ f: 55, f1: 190, dur: 3.0, bf: 1800, am: [9, 0.4], a: 1.2, peak: 0.14 });
    S.tone({ type: 'saw', f: 52, f1: 80, lp: 320, dur: 3.0, a: 2.0, swell: true, am: [18, 0.4], peak: 0.12 });
    [0.5, 1.2, 1.9, 2.5].forEach((at, i) => { S.metal({ at, set: 'bar', f: 1700 + i * 300, dur: 0.18, peak: 0.12, pan: i % 2 ? 0.5 : -0.5 }); S.metal({ at: at + 0.05, set: 'bar', f: 2400 + i * 300, dur: 0.14, peak: 0.07 }); });
    S.glass({ at: 2.2, f: mf(79), dur: 1.0, peak: 0.07 });
    S.rumble({ dur: 3.0, f: 100, peak: 0.2, a: 1.5 });
  });
  // each strike of the Conduction (the host's chain message; the pitch climbs with each hero struck): a bolt landing on a body and a spark leaping on
  def('bm-volkar-conduct-leap', 'bm', S => {
    S.zap({ f: 90, f1: 160, dur: 0.22, bf: 2400, peak: 0.3 });
    S.crack({ at: 0.03, f: 2400, dur: 0.14, peak: 0.4 });
    S.thud({ at: 0.03, f: 90, f1: 40, dur: 0.4, drive: 1.8, peak: 0.45 });
    S.glass({ at: 0.05, f: mf(83), dur: 0.5, peak: 0.08 });
  });
  // the Conduction going wrong (roomev volkar-conduct-burst): the whole line flashing at once, a white crack and a boom across the summit
  def('bm-volkar-conduct-burst', 'bm', S => {
    S.space('hall', 0.5);
    S.crack({ f: 1800, peak: 0.65, ech: 0.4 });
    S.noise({ hp: 900, dur: 0.6, pts: [[0.02, 1], [0.6, 0]], peak: 0.35, grain: 0.6 });
    S.thud({ at: 0.02, f: 52, f1: 20, dur: 1.2, drive: 3, peak: 0.8, sub: 0.4 });
    B.thunder(S, 0.05, 0.9);
    S.crackle({ at: 0.05, dens: 2.2, f: 3800, dur: 1.4, pts: [[0.1, 1], [1.4, 0]], peak: 0.25 });
    S.rumble({ at: 0.1, dur: 1.8, f: 110, peak: 0.3, a: 0.05 });
  });
  // the end of the Conduction grounded in a stone (propfx bolt on a stone while it runs): the charge going down into the rock, a long low hum dying
  def('bm-volkar-conduct-ground', 'bm', S => {
    S.metal({ set: 'bar', f: 520, dur: 1.4, peak: 0.22, strike: 0.4 });
    S.partials({ at: 0.02, set: 'stone', f: 260, dur: 0.5, peak: 0.18, strike: 0.5 });
    S.thud({ at: 0.02, f: 70, f1: 30, dur: 0.7, drive: 2, peak: 0.55 });
    S.tone({ at: 0.1, f: 110, f1: 55, dur: 1.2, am: [40, 0.5], pts: [[0.05, 1], [1.2, 0]], peak: 0.1 });
    S.sizzle({ at: 0.1, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.1 });
  });
  // Split Current (Extreme): one note tearing in two, a gold one sliding down and a blue one sliding up, a ring of lightning racing round him between them
  def('bm-volkar-split-current', 'bm', S => {
    S.space('hall', 0.4);
    S.tone({ f: mf(66), f1: mf(54), dur: 1.9, a: 0.5, peak: 0.2, pan: -0.3 });
    S.tone({ f: mf(66), f1: mf(78), dur: 1.9, a: 0.5, peak: 0.12, pan: 0.3 });
    S.tone({ at: 0.1, f: mf(66) * 2, f1: mf(90), dur: 1.7, a: 0.4, peak: 0.04 });
    S.whoosh({ at: 0.1, f: 400, f1: 4200, dur: 1.5, peakAt: 0.7, q: 1.3, peak: 0.3 });
    S.crackle({ at: 0.2, dens: 2.4, f: 4500, dur: 1.5, pts: [[0.3, 0.5], [1.2, 1], [1.5, 0]], peak: 0.2 });
    S.crack({ at: 1.3, f: 2600, peak: 0.3, pan: -0.6 }); S.crack({ at: 1.38, f: 2300, peak: 0.3, pan: 0.6 });
    S.rumble({ dur: 2.0, f: 90, peak: 0.2, a: 0.6 });
  });
  // the Split Current landing (tag splitin): the ring struck, a crack each side and the floor taking it
  def('bm-volkar-split-land', 'bm', S => {
    S.crack({ f: 2400, peak: 0.4, pan: -0.7 }); S.crack({ at: 0.05, f: 2200, peak: 0.4, pan: 0.7 });
    S.thud({ f: 60, f1: 26, dur: 0.8, drive: 2.4, peak: 0.6 });
    S.crackle({ at: 0.02, dens: 1.8, f: 3500, dur: 0.7, pts: [[0.02, 1], [0.7, 0]], peak: 0.2 });
    S.rumble({ dur: 1.0, f: 120, peak: 0.22, a: 0.03 });
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
  // Sceptre Rebuke: the sceptre driven point-first at his own knight: a hard dry hiss, a flat plate-iron rap that stops dead, and one low bell as the court takes the blow in
  def('bm-hollowking-sceptre-rebuke', 'bm', S => {
    S.noise({ bp: 3400, bp1: 1300, q: 4, dur: 0.16, pts: [[0.01, 1], [0.16, 0]], peak: 0.28 });
    S.whoosh({ f: 900, f1: 2800, dur: 0.2, peakAt: 0.9, peak: 0.28, q: 1.4 });
    S.metal({ at: 0.18, set: 'plate', f: 950, dur: 0.55, peak: 0.28, strike: 0.7 });
    S.crack({ at: 0.18, f: 2200, dur: 0.1, peak: 0.28 });
    S.thud({ at: 0.18, f: 150, f1: 60, dur: 0.3, peak: 0.5, drive: 1.6 });
    S.space('hall', 0.3);
    S.bell({ at: 0.32, f: mf(43), dur: 1.6, peak: 0.2, lp: 2600 });
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
  // The three Extreme judgements (new sounds only; nothing above changes). The Sentence: heavy chains dragged and dropped (the shackled pair), two low tolls going down, a thin glass note
  // hung over them (the exiled pair), the court's gavel
  def('bm-hollowking-the-sentence', 'bm', S => {
    S.space('hall', 0.5);
    chains(S, 0, 1.0, 1.3);
    S.scrape({ f: 2000, q: 3, rate: 22, dur: 0.9, pts: [[0.1, 1], [0.9, 0]], peak: 0.1 });
    [[0.9, 36], [1.7, 33]].forEach(([at, n]) => S.bell({ at, f: mf(n), dur: 2.4, peak: 0.28, lp: 2400 }));
    S.glass({ at: 1.3, f: mf(88), dur: 1.6, peak: 0.07 });
    S.wood({ at: 2.2, f: 300, dur: 0.25, peak: 0.45, ech: 0.3 });
    S.thud({ at: 2.2, f: 90, f1: 40, dur: 0.5, peak: 0.55, click: 0.6 });
  });
  // Roll Call: the court's numbers read out one after another, a hollow roll of ticks under a voice stepping down, a page turned between them
  def('bm-hollowking-roll-call', 'bm', S => {
    S.space('cave', 0.45);
    [0, 0.42, 0.84, 1.26].forEach((at, i) => {
      S.voice({ at, f: 105 - i * 6, f1: 96 - i * 6, dur: 0.3, vowel: i % 2 ? 'u' : 'o', vowel1: 'o', breath: 1.2, peak: 0.12, lp: 1600 });
      S.tick({ at: at + 0.06, f: 1700 + i * 100, peak: 0.2 });
    });
    for (let i = 0; i < 10; i++) S.wood({ at: 1.7 + i * 0.06, f: 1400 + i * 40, dur: 0.03, peak: 0.1 + i * 0.012 });
    B.parchment(S, 0.2, 0.5, 0.6);
    S.drum({ at: 2.3, f: 58, dur: 0.7, peak: 0.45 });
    S.bell({ at: 2.3, set: 'hand', f: mf(50), dur: 1.8, peak: 0.16 });
  });
  // a knight going down on one knee as it takes a swing in (roomev kneel gains one): armour folding, a low creak
  def('bm-hollowking-kneel', 'bm', S => {
    S.space('hall', 0.35);
    S.creak({ dur: 0.6, f: 22, f1: 14, res: [700, 1500, 2600], q: 12, peak: 0.16 });
    S.metal({ at: 0.45, set: 'plate', f: 480, dur: 0.7, peak: 0.2, strike: 0.5 });
    S.thud({ at: 0.45, f: 90, f1: 42, dur: 0.4, peak: 0.4 });
    S.bell({ at: 0.5, f: mf(40), dur: 1.4, peak: 0.1, lp: 2000 });
  });
  // a knight that knelt answering with the swing turned inside out (roomev kneel loses one): the sound drawn backwards, a bell swelling instead of striking, then a low blow
  def('bm-hollowking-turned-out', 'bm', S => {
    S.space('hall', 0.45);
    S.whoosh({ f: 200, f1: 2600, dur: 0.9, peakAt: 0.95, q: 1.1, peak: 0.3 });
    S.bell({ f: mf(43), dur: 1.3, a: 1.0, swell: true, peak: 0.2, lp: 2600 });
    S.tone({ f: mf(62), f1: mf(50), dur: 1.0, a: 0.85, swell: true, peak: 0.06 });
    S.metal({ at: 0.95, set: 'plate', f: 620, dur: 0.7, peak: 0.16, strike: 0.5 });
    S.thud({ at: 0.95, f: 80, f1: 34, dur: 0.5, peak: 0.45, drive: 1.6 });
  });
  // an exile's ring drawn on the floor (tg exile): a hollow note and a thin ring of air sweeping out round the hero, set apart
  def('bm-hollowking-exile', 'bm', S => {
    S.space('hall', 0.4);
    S.whoosh({ f: 700, f1: 2800, dur: 0.7, peakAt: 0.6, q: 1.6, peak: 0.22 });
    S.bell({ at: 0.1, set: 'hand', f: mf(62), dur: 1.4, peak: 0.16 });
    S.glass({ at: 0.15, f: mf(86), dur: 1.1, peak: 0.07 });
    S.noise({ at: 0.1, hp: 5000, dur: 0.8, pts: [[0.3, 1], [0.8, 0]], peak: 0.05 });
  });
  // the shackle drawn between the bound pair (tether bind while a Sentence is out): iron links and a lock
  def('bm-hollowking-shackle', 'bm', S => {
    chains(S, 0, 0.3, 1.4);
    S.metal({ at: 0.32, set: 'plate', f: 420, dur: 0.6, peak: 0.2, strike: 0.5 });
    S.thud({ at: 0.32, f: 110, f1: 50, dur: 0.3, peak: 0.4 });
  });
  // a Roll Call number called (tg rollcall): one clear eye-opening note and a tick
  def('bm-hollowking-roll-called', 'bm', S => {
    S.glass({ f: mf(84), dur: 1.1, peak: 0.1 });
    S.tick({ at: 0.02, f: 2000, peak: 0.25 });
    S.bell({ at: 0.04, set: 'hand', f: mf(57), dur: 1.0, peak: 0.12 });
  });
  // the call judged (it lands): the court's gavel and a short low bell
  def('bm-hollowking-roll-judged', 'bm', S => {
    S.space('hall', 0.3);
    B.stamp(S, 0, 0.9);
    S.bell({ at: 0.05, f: mf(43), dur: 1.2, peak: 0.14, lp: 2600 });
  });
  // a hero caught looking (or not looking) on a call: a dull blow, a held breath of dread
  def('bm-hollowking-roll-caught', 'bm', S => {
    S.space('cave', 0.3);
    S.thud({ f: 70, f1: 30, dur: 0.6, drive: 2, peak: 0.5 });
    S.voice({ f: 78, f1: 62, dur: 0.7, vowel: 'u', vowel1: 'o', breath: 2, peak: 0.16, lp: 1400 });
    S.noise({ at: 0.05, hp: 1500, lp: 6000, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.12, grain: 0.4 });
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
  def('bm-wyrm-pounce', 'bm', S => {
    S.rumble({ dur: 1.3, f: 66, peak: 0.24, a: 0.5 });
    S.voice({ f: 74, f1: 98, dur: 1.0, vowel: 'o', vowel1: 'a', breath: 5, peak: 0.15, lp: 2600, pts: [[0.6, 1], [1.0, 0]] });
    S.whoosh({ at: 1.0, f: 160, f1: 900, dur: 0.35, peakAt: 0.6, peak: 0.3 });
    S.thud({ at: 1.3, f: 78, f1: 30, dur: 0.7, drive: 2.8, peak: 0.75 });
    S.splat({ at: 1.3, peak: 0.25, dur: 0.3 });
    S.crackle({ at: 1.35, dens: 2.2, f: 3200, dur: 1.0, pts: [[0.03, 1], [1.0, 0]], peak: 0.2 });
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
  def('bm-wyrm-searing-descent', 'bm', S => {
    S.space('cave', 0.4);
    S.whoosh({ f: 800, f1: 100, dur: 1.2, peakAt: 0.75, peak: 0.3 });
    S.thud({ at: 1.2, f: 62, f1: 26, dur: 0.8, drive: 2.5, peak: 0.7 });
    [1.5, 2.3, 3.1].forEach((at, i) => {
      S.noise({ at, bp: 700 + i * 500, bp1: 2400, q: 1.1, dur: 0.9, a: 0.1, pts: [[0.15, 1], [0.9, 0]], peak: 0.26 });
      S.crackle({ at, dens: 2.2, f: 3800, dur: 0.8, pts: [[0.1, 1], [0.8, 0]], peak: 0.16 });
    });
  });
  def('bm-wyrm-ashfall', 'bm', S => {
    S.space('cave', 0.6);
    S.voice({ f: 50, f1: 36, dur: 3, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.4, lp: 3000, pts: [[0.4, 1], [3, 0]] });
    S.rumble({ dur: 4, f: 60, peak: 0.5, a: 0.5 });
    S.noise({ bp: 700, q: 1.2, dur: 3.5, a: 1, pts: [[2.5, 1], [3.5, 0]], peak: 0.2 });
  });

  // Skyward: he climbs and circles the crater once; wing air passes from one side to the other under a long rising gust, a low breath, then the light blow of the circle closing
  def('bm-wyrm-skyward', 'bm', S => {
    S.space('cave', 0.45);
    S.whoosh({ f: 110, f1: 700, dur: 1.5, peakAt: 0.7, peak: 0.3, pan: -0.55 });
    S.whoosh({ at: 1.4, f: 700, f1: 160, dur: 1.5, peakAt: 0.4, peak: 0.3, pan: 0.55 });
    [0.1, 0.65, 1.2, 1.75, 2.3].forEach((at, i) => S.thud({ at, f: 64 + i * 6, f1: 32, dur: 0.4, drive: 1.6, peak: 0.2 }));
    S.voice({ at: 0.6, f: 66, f1: 90, dur: 2.0, vowel: 'o', vowel1: 'a', breath: 6, peak: 0.12, lp: 2600, pts: [[0.7, 1], [2.0, 0]] });
    S.rumble({ dur: 3.0, f: 80, peak: 0.28, a: 0.5 });
    S.thud({ at: 3.0, f: 62, f1: 28, dur: 0.7, drive: 2.2, peak: 0.45 });
  });
  // The Tyrant Wakes: the crater rim catching light as he rises from the ground; a slow, wide roar from far down, a deep bell, embers heating to a steady crackle, then the ground blow
  def('bm-wyrm-the-tyrant-wakes', 'bm', S => {
    S.space('cave', 0.6);
    S.choir({ notes: [mf(28), mf(35)], vowel: 'a', vowel1: 'o', dur: 3.4, a: 1.3, peak: 0.12, lp: 2200 });
    S.voice({ at: 0.5, f: 40, f1: 31, dur: 2.8, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.26, lp: 2800, pts: [[0.9, 1], [2.8, 0]] });
    S.rumble({ dur: 4.2, f: 56, peak: 0.42, a: 1.2 });
    S.crackle({ at: 0.6, dens: 1.4, f: 3400, dur: 3.2, pts: [[0.6, 0.3], [2.4, 1], [3.2, 0]], peak: 0.2 });
    S.bell({ at: 0.2, f: mf(28), dur: 4, peak: 0.26, lp: 2200 });
    S.thud({ at: 3.2, f: 56, f1: 24, dur: 0.9, drive: 2.5, peak: 0.55 });
  });
  // Marked Prey: a hero is picked out. Three thin ember pings close up on each other, then he falls on the mark: a long drop and a molten slam
  def('bm-wyrm-marked-prey', 'bm', S => {
    S.space('cave', 0.35);
    [0, 0.5, 0.9].forEach((at, i) => { S.tone({ at, f: 1500 + i * 220, f1: 1100 + i * 160, dur: 0.22, a: 0.004, peak: 0.12 }); S.crackle({ at, dens: 3, f: 4800, dur: 0.2, pts: [[0.02, 1], [0.2, 0]], peak: 0.1 }); });
    S.voice({ at: 1.2, f: 480, f1: 170, dur: 0.9, vowel: 'a', vowel1: 'i', breath: 4, peak: 0.12, lp: 4800, pts: [[0.2, 1], [0.9, 0]] });
    S.whoosh({ at: 1.3, f: 1300, f1: 100, dur: 0.9, peakAt: 0.75, peak: 0.28 });
    S.thud({ at: 2.15, f: 66, f1: 26, dur: 0.9, drive: 3, peak: 0.8 });
    S.splat({ at: 2.15, peak: 0.28, dur: 0.35 });
    S.crackle({ at: 2.2, dens: 2.4, f: 3000, dur: 1.2, pts: [[0.03, 1], [1.2, 0]], peak: 0.22 });
  });
  // Ember Devils: whirls spin up under every hero; a rising turning gust, a hot hiss, and a small puff as each one settles
  def('bm-wyrm-ember-devils', 'bm', S => {
    S.noise({ bp: 360, bp1: 1900, q: 1.3, dur: 2.2, a: 0.5, am: [7, 0.7], pts: [[0.6, 0.6], [1.7, 1], [2.2, 0]], peak: 0.42 });
    S.noise({ at: 0.2, bp: 3200, q: 2.5, dur: 2.0, a: 0.6, am: [11, 0.6], pts: [[1.0, 0.8], [2.0, 0]], peak: 0.1 });
    S.crackle({ at: 0.3, dens: 2.6, f: 3800, dur: 1.9, pts: [[0.4, 0.5], [1.5, 1], [1.9, 0]], peak: 0.26 });
    S.rumble({ dur: 2.4, f: 90, peak: 0.1, a: 0.6 });
    [1.9, 2.05, 2.2, 2.35].forEach((at, i) => { S.thud({ at, f: 110 - i * 8, f1: 52, dur: 0.25, peak: 0.3, pan: [-0.6, -0.2, 0.2, 0.6][i] }); S.crackle({ at, dens: 3, f: 4200, dur: 0.25, pts: [[0.02, 1], [0.25, 0]], peak: 0.12, pan: [-0.6, -0.2, 0.2, 0.6][i] }); });
  });
  // Molten Trail: a line of rings walked out along the rim; a hot hiss and five slow plops of lava, each lower and rounder, the last heaviest
  def('bm-wyrm-molten-trail', 'bm', S => {
    S.space('cave', 0.35);
    S.sizzle({ dur: 3.0, pts: [[0.3, 0.5], [1.5, 0.9], [3.0, 0]], peak: 0.14 });
    [0, 0.6, 1.2, 1.8, 2.4].forEach((at, i) => {
      S.bubbles({ at, n: 3, f: 90, f1: 320, spread: 0.2, size: 0.07, peak: 0.12 });
      S.thud({ at: at + 0.2, f: 84 - i * 6, f1: 38, dur: 0.45, drive: 1.8, peak: 0.34 + i * 0.05 });
      S.crackle({ at: at + 0.2, dens: 2, f: 3000, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.14 });
    });
    S.rumble({ dur: 3.2, f: 72, peak: 0.2, a: 0.4 });
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
  def('bm-titan-icebreaker', 'bm', S => {
    S.whoosh({ f: 180, f1: 1100, dur: 0.42, peakAt: 0.9, peak: 0.28 });
    S.crack({ at: 0.4, peak: 0.42, dur: 0.14 });
    S.thud({ at: 0.4, f: 88, f1: 40, dur: 0.55, drive: 2.4, peak: 0.5 });
    S.noise({ at: 0.42, bp: 4800, bp1: 1400, q: 2.2, dur: 0.7, grain: 0.8, pts: [[0.02, 1], [0.7, 0]], peak: 0.2 });
    S.crackle({ at: 0.44, dens: 5, f: 6400, dur: 0.55, pts: [[0.02, 1], [0.55, 0]], peak: 0.14 });
    S.tone({ at: 0.85, f: 340, f1: 150, dur: 0.45, a: 0.02, peak: 0.1 });
    S.bell({ at: 0.9, f: mf(52), dur: 1.4, peak: 0.07, lp: 3200 });
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

  // The Ice Groans: the plateau shifts under everyone; a long low creak of ice, fine cracks running outward and a deep bell, then a light settling blow
  def('bm-titan-the-ice-groans', 'bm', S => {
    S.space('hall', 0.6);
    S.creak({ dur: 2.8, f: 16, f1: 9, res: [220, 520, 1100], q: 12, peak: 0.3 });
    S.rumble({ dur: 3.4, f: 48, peak: 0.22, a: 1.0 });
    S.crackle({ at: 0.5, dens: 1.6, f: 4600, dur: 2.6, pts: [[0.3, 0.4], [1.4, 1], [2.6, 0]], peak: 0.22 });
    S.bell({ at: 0.3, f: mf(36), dur: 4, peak: 0.24, lp: 2400 });
    S.thud({ at: 3.1, f: 52, f1: 26, dur: 0.8, drive: 2.2, peak: 0.45 });
  });
  // Deep Winter: the aurora goes dark and the water glazes over; a wind falling away into a held low chord, then pale glass chimes as the ice takes the sheets
  def('bm-titan-deep-winter', 'bm', S => {
    S.space('hall', 0.7);
    S.noise({ bp: 2200, bp1: 260, q: 0.9, dur: 3.0, a: 0.3, pts: [[0.4, 1], [1.6, 0.7], [3.0, 0]], peak: 0.3 });
    S.pad({ notes: [mf(33), mf(40), mf(45)], type: 'sine', dur: 4.0, det: 6, a: 1.2, peak: 0.18, lpEnv: [900, 400, 300, 1.5] });
    S.rumble({ dur: 3.6, f: 46, peak: 0.35, a: 0.9 });
    [2.2, 2.55, 2.85, 3.1].forEach((at, i) => S.glass({ at, f: mf(84 + i * 3), dur: 1.2, peak: 0.08 }));
    S.crackle({ at: 2.3, dens: 4, f: 6200, dur: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.12 });
    S.bell({ at: 3.0, f: mf(31), dur: 3, peak: 0.2, lp: 2200 });
  });
  // Two Winters: two states at once. A long still glass tone held against a moving gust, twice over, with the avalanche's low slide beneath and a closing chime
  def('bm-titan-two-winters', 'bm', S => {
    S.space('hall', 0.5);
    S.rumble({ dur: 3.8, f: 50, peak: 0.34, a: 0.9 });
    S.glass({ f: mf(76), dur: 3.0, peak: 0.16 });
    S.glass({ at: 1.5, f: mf(83), dur: 2.2, peak: 0.1 });
    S.whoosh({ at: 0.35, f: 220, f1: 2200, dur: 0.9, peakAt: 0.6, peak: 0.24, pan: -0.4 });
    S.whoosh({ at: 1.55, f: 2200, f1: 220, dur: 0.9, peakAt: 0.4, peak: 0.24, pan: 0.4 });
    S.noise({ at: 2.2, bp: 300, bp1: 1300, q: 0.8, dur: 1.6, a: 0.6, grain: 0.5, pts: [[0.9, 1], [1.6, 0]], peak: 0.2 });
    S.bell({ at: 3.0, f: mf(64), dur: 2.4, peak: 0.14, lp: 4500 });
  });
  // Ice Tomb: the cold closes round two heroes; a hard gust, then a muffled knock of ice for each, a glassy crack and a hollow low bell as the block sets
  def('bm-titan-ice-tomb', 'bm', S => {
    S.space('hall', 0.35);
    S.noise({ bp: 1200, bp1: 4200, q: 1.1, dur: 1.2, a: 0.2, pts: [[0.4, 0.8], [0.8, 1], [1.2, 0]], peak: 0.22 });
    [1.0, 1.45].forEach((at, i) => {
      S.thud({ at, f: 74 - i * 8, f1: 34, dur: 0.6, drive: 2.4, peak: 0.55, lp: 900 });
      S.crack({ at, peak: 0.22, dur: 0.2, f: 2000 });
      S.glass({ at: at + 0.04, f: 1900 - i * 260, dur: 0.9, peak: 0.1 });
      S.crackle({ at, dens: 4, f: 5600, dur: 0.5, pts: [[0.02, 1], [0.5, 0]], peak: 0.13 });
    });
    S.bell({ at: 1.5, f: mf(40), dur: 2.4, peak: 0.2, lp: 1500 });
  });
  // Sunk Towers: two towers of ice rise on the sunk sheets; a grind climbing, two heavy settling thuds and a splash of water, a low struck bell for the soak
  def('bm-titan-sunk-towers', 'bm', S => {
    S.space('hall', 0.5);
    S.scrape({ f: 700, q: 3, rate: 22, dur: 1.8, pts: [[0.3, 0.6], [1.5, 1], [1.8, 0]], peak: 0.2 });
    S.rumble({ dur: 2.2, f: 52, peak: 0.2, a: 0.4 });
    [1.5, 1.95].forEach((at, i) => {
      S.thud({ at, f: 58 - i * 6, f1: 26, dur: 0.8, drive: 3, peak: 0.6 });
      S.bubbles({ at, n: 6, f: 200, f1: 900, spread: 0.4, size: 0.05, peak: 0.1, pan: i ? 0.4 : -0.4 });
      S.crackle({ at, dens: 3, f: 4800, dur: 0.5, pts: [[0.02, 1], [0.5, 0]], peak: 0.14 });
    });
    S.bell({ at: 2.1, f: mf(52), dur: 2.6, peak: 0.2, lp: 3000 });
  });

  // ---------------------------------------------------------------------------------------------- Azerath (the Sunken Archmage)
  def('bm-archmage-intro', 'sting', S => {
    S.space('hall', 0.65);
    S.pad({ notes: [mf(45), mf(52), mf(57)], dur: 3.2, det: 9, type: 'saw', lpEnv: [300, 1400, 500, 1.2], vib: [4.5, 0.003], peak: 0.2 });
    [0, 0.5, 1.0, 1.5].forEach((at, i) => S.bell({ at: at + 0.3, f: mf(64 + i * 3), dur: 2.4, peak: 0.12, lp: 5000 }));
    S.rumble({ dur: 3.4, f: 50, peak: 0.35, a: 0.4 });
  });
  // Circle Brand: a rune is pressed on the knight alone: a hiss of hot metal, a bright ring that closes, a low thud as it sets
  def('bm-archmage-circle-brand', 'bm', S => {
    S.space('hall', 0.4);
    S.noise({ bp: 3400, bp1: 900, q: 1.6, dur: 0.7, a: 0.03, pts: [[0.05, 1], [0.7, 0]], peak: 0.16, grain: 0.4 });
    S.metal({ at: 0.05, set: 'bar', f: 900, dur: 1.4, peak: 0.12, strike: 0.5 });
    S.tone({ at: 0.3, f: mf(79), f1: mf(72), dur: 0.5, peak: 0.07 });
    S.bell({ at: 0.35, f: mf(67), dur: 1.6, peak: 0.18, lp: 5000 });
    S.thud({ at: 0.55, f: 78, f1: 34, dur: 0.5, drive: 2, peak: 0.38 });
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

  // The act openers: the floor turns to one element's circle. Low and wide, no sharp edge: a held chord, a soft bell for the sigil, and one colour of the element under it
  // Circle of Fire: warm chord, a heat swelling in the stone, an ember crackle
  def('bm-archmage-circle-of-fire', 'bm', S => {
    S.space('hall', 0.6);
    S.pad({ notes: [mf(40), mf(47), mf(52)], type: 'saw', dur: 3.0, det: 8, a: 0.9, peak: 0.16, lpEnv: [250, 1100, 500, 1.6] });
    S.noise({ bp: 300, bp1: 1400, q: 1.0, dur: 2.8, a: 1.0, pts: [[1.4, 0.8], [2.8, 0]], peak: 0.22 });
    S.crackle({ at: 0.5, dens: 1.6, f: 3400, dur: 2.4, pts: [[0.5, 0.4], [1.6, 1], [2.4, 0]], peak: 0.15 });
    S.bell({ at: 0.2, f: mf(52), dur: 2.8, peak: 0.16, lp: 3200 });
    S.rumble({ dur: 3.2, f: 70, peak: 0.28, a: 0.8 });
  });
  // Circle of Frost: a cold chord, glass bells coming on one after another, a faint ice shimmer
  def('bm-archmage-circle-of-frost', 'bm', S => {
    S.space('hall', 0.65);
    S.pad({ notes: [mf(45), mf(52), mf(57)], type: 'sine', dur: 3.0, det: 7, a: 1.0, peak: 0.15, lpEnv: [400, 2000, 700, 1.6] });
    [0.3, 0.7, 1.15, 1.65].forEach((at, i) => S.bell({ at, f: mf(76 + i * 3), dur: 2.0, peak: 0.07, lp: 7000 }));
    S.noise({ bp: 4400, q: 2, dur: 2.4, a: 1.0, pts: [[1.4, 0.8], [2.4, 0]], peak: 0.07 });
    S.rumble({ dur: 3.2, f: 56, peak: 0.24, a: 0.8 });
  });
  // Circle of Lightning: a charged chord, a far thunder rolling, small blue sparks inside it; never a crack
  def('bm-archmage-circle-of-lightning', 'bm', S => {
    S.space('hall', 0.55);
    S.pad({ notes: [mf(43), mf(50), mf(55)], type: 'saw', dur: 3.0, det: 10, a: 0.9, peak: 0.15, lpEnv: [300, 1500, 600, 1.4] });
    S.rumble({ dur: 3.4, f: 90, peak: 0.34, a: 1.0, am: [3, 0.5] });
    [0.9, 1.5, 2.0].forEach((at, i) => S.zap({ at, f: 120 + i * 30, dur: 0.16, jit: 2.5, peak: 0.07, pan: [-0.4, 0.3, -0.1][i] }));
    S.bell({ at: 0.2, f: mf(55), dur: 2.6, peak: 0.14, lp: 3600 });
  });
  // Circle of the Void: a chord sinking, a slow pull inward and a hollow low note where the light goes out
  def('bm-archmage-circle-of-the-void', 'bm', S => {
    S.space('hall', 0.7);
    S.pad({ notes: [mf(36), mf(43), mf(48)], type: 'saw', dur: 3.2, det: 9, a: 0.8, bend: -3, peak: 0.16, lpEnv: [500, 250, 150, 1.0] });
    S.whoosh({ f: 1400, f1: 90, dur: 2.2, peakAt: 0.5, peak: 0.2 });
    S.tone({ at: 0.4, f: mf(34), f1: mf(29), dur: 2.6, a: 0.8, peak: 0.16 });
    S.rumble({ dur: 3.4, f: 50, peak: 0.4, a: 0.8 });
  });
  // The Seven Circles: the finale's opening. All four sigils wake; seven soft bells climb one circle at a time over a wide held chord and a slow swell from below
  def('bm-archmage-the-seven-circles', 'bm', S => {
    S.space('hall', 0.7);
    S.pad({ notes: [mf(36), mf(43), mf(48), mf(55)], type: 'saw', dur: 3.4, det: 10, a: 1.0, peak: 0.17, lpEnv: [250, 1500, 500, 2.0] });
    [52, 55, 57, 60, 64, 67, 71].forEach((m, i) => S.bell({ at: 0.2 + i * 0.38, f: mf(m), dur: 2.2, peak: 0.07 + i * 0.01, lp: 3800 }));
    S.rumble({ dur: 3.8, f: 52, peak: 0.42, a: 1.2 });
    S.thud({ at: 3.0, f: 56, f1: 26, dur: 0.9, drive: 2, peak: 0.4 });
  });
  // Spellweave: three glyphs in turn over his staff, a different element for each (glass, a spark, a low void note), then the threads drawn together and settling
  def('bm-archmage-spellweave', 'bm', S => {
    S.space('hall', 0.5);
    S.glass({ f: mf(81), dur: 1.2, peak: 0.12 });
    S.zap({ at: 0.75, f: 150, f1: 110, dur: 0.22, jit: 3, peak: 0.12 });
    S.crack({ at: 0.82, peak: 0.14, dur: 0.16, f: 1800 });
    S.tone({ at: 1.5, f: mf(38), f1: mf(34), dur: 1.1, a: 0.2, peak: 0.16 });
    S.whoosh({ at: 2.1, f: 300, f1: 2400, dur: 1.1, peakAt: 0.55, peak: 0.2 });
    S.whoosh({ at: 2.4, f: 2200, f1: 260, dur: 1.2, peakAt: 0.35, peak: 0.18, pan: 0.4 });
    S.bell({ at: 3.2, f: mf(64), dur: 2.4, peak: 0.16, lp: 4800 });
    S.thud({ at: 3.2, f: 72, f1: 32, dur: 0.6, drive: 2, peak: 0.34 });
  });
  // Runic Clock: two rings burning down at different rates; two trains of ticks, one quick and high, one slow and lower, the quick one ends in a bell and the slow one a heavier note
  def('bm-archmage-runic-clock', 'bm', S => {
    S.space('hall', 0.35);
    for (let i = 0; i < 9; i++) S.tick({ at: 0.1 + i * 0.28, f: 2900, peak: 0.12, pan: -0.3 });
    for (let i = 0; i < 6; i++) S.tick({ at: 0.15 + i * 0.5, f: 1700, peak: 0.12, pan: 0.3 });
    S.bell({ at: 2.7, f: mf(76), dur: 1.6, peak: 0.16, lp: 6000 });
    S.bell({ at: 3.2, f: mf(57), dur: 2.4, peak: 0.2, lp: 3600 });
    S.thud({ at: 3.2, f: 66, f1: 30, dur: 0.5, drive: 2, peak: 0.3 });
  });
  // Cascading Convergence: the sigils go off one after another, each lower than the one before, then the last blow on the middle and the diagonals as one deep settle
  def('bm-archmage-cascading-convergence', 'bm', S => {
    S.space('hall', 0.65);
    S.pad({ notes: [mf(45), mf(52), mf(57)], type: 'saw', dur: 4.2, det: 10, a: 0.5, peak: 0.14, lpEnv: [250, 1800, 500, 2.4] });
    [0, 0.6, 1.2, 1.8].forEach((at, i) => {
      S.bell({ at, f: mf(76 - i * 4), dur: 1.6, peak: 0.2, lp: 6000 });
      S.thud({ at: at + 0.04, f: 82 - i * 8, f1: 34, dur: 0.45, drive: 2, peak: 0.36 });
      S.noise({ at, bp: 2400 - i * 400, bp1: 700, q: 1.4, dur: 0.5, a: 0.02, pts: [[0.05, 1], [0.5, 0]], peak: 0.12 });
    });
    S.thud({ at: 3.3, f: 54, f1: 22, dur: 1.0, drive: 2.8, peak: 0.6 });
    S.rumble({ at: 3.3, dur: 2.0, f: 56, peak: 0.45, a: 0.1 });
    S.bell({ at: 3.3, f: mf(40), dur: 3.0, peak: 0.22, lp: 2400 });
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
  def('bm-corvane-answering-cut', 'bm', S => {
    S.metal({ set: 'bar', f: 3300, dur: 0.3, peak: 0.1, strike: 0.9 });
    S.whoosh({ at: 0.07, f: 900, f1: 3800, dur: 0.22, peakAt: 0.8, peak: 0.26 });
    S.metal({ at: 0.3, set: 'plate', f: 720, dur: 0.55, peak: 0.24, strike: 0.9 });
    S.thud({ at: 0.3, f: 92, f1: 44, dur: 0.4, drive: 2.2, peak: 0.42 });
    S.noise({ at: 0.31, bp: 5200, q: 1.6, dur: 0.12, a: 0.002, pts: [[0.01, 1], [0.12, 0]], peak: 0.12 });
    S.glass({ at: 0.34, f: 2900, dur: 0.45, peak: 0.07 });
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
  // ---- the revamp's moves and moments (the casts below play from their names; the m- cues are the moments sound-hooks.js reads off the room: a counter cut, a ring closing, a lesson)
  // The Shrine (3.4 s, Act II's opener): he walks to the shrine and bows. A low bell struck softly, the lanterns flaring one by one, cold air held; the blow itself is bm-corvane-m-shrine.
  def('bm-corvane-the-shrine', 'bm', S => {
    S.space('hall', 0.75);
    S.bell({ f: mf(45), dur: 4.4, peak: 0.2, lp: 2200 });
    S.pad({ at: 0.4, notes: [mf(40), mf(47)], dur: 3.0, det: 8, type: 'sine', lpEnv: [300, 900, 300, 2.2], peak: 0.1 });
    S.noise({ color: 'pink', bp: 300, bp1: 800, q: 0.8, dur: 3.2, a: 1.4, pts: [[1.8, 0.8], [3.2, 0]], peak: 0.12 });
    [0.9, 1.4, 1.85].forEach((at, i) => { S.whoosh({ at, f: 300 + i * 90, f1: 1700 + i * 300, dur: 0.4, peakAt: 0.5, peak: 0.1 }); S.glass({ at: at + 0.12, f: mf(76 + i * 3), dur: 1.2, peak: 0.05 }); });
    S.glass({ at: 2.5, f: mf(88), dur: 1.8, peak: 0.07 });
  });
  def('bm-corvane-m-shrine', 'imp', S => {
    S.space('hall', 0.5);
    S.thud({ f: 62, f1: 28, dur: 0.8, drive: 2.4, peak: 0.55 });
    S.bell({ at: 0.02, f: mf(52), dur: 2.0, peak: 0.12, lp: 2600 });
    S.noise({ at: 0.05, bp: 2400, bp1: 600, q: 1.2, dur: 0.9, a: 0.01, pts: [[0.05, 1], [0.9, 0]], peak: 0.14 });
    S.glass({ at: 0.06, f: 2300, dur: 0.8, peak: 0.07 });
  });
  // The Circle (2.4 s): a duel named. The blade out of its sheath, a thin glass note that holds, the air drawn tight in a ring and shut at the end of the bar; bm-corvane-m-ring is the shutting.
  def('bm-corvane-the-circle', 'bm', S => {
    S.space('hall', 0.5);
    S.scrape({ f: 3500, q: 2.2, dur: 0.6, rate: 24, peak: 0.12, pts: [[0.1, 0.5], [0.6, 1], [0.7, 0]] });
    S.metal({ at: 0.62, set: 'bar', f: 1560, dur: 1.6, peak: 0.12, strike: 0.5 });
    S.noise({ at: 0.5, bp: 3400, bp1: 1000, q: 3.2, dur: 1.8, a: 0.9, pts: [[1.4, 1], [1.8, 0]], peak: 0.13 });
    S.partials({ at: 0.7, set: 'glass', f: mf(84), dur: 1.7, peak: 0.07, am: [6, 0.4] });
    S.tone({ at: 0.8, f: 800, f1: 1500, dur: 1.4, a: 0.9, peak: 0.03 });
  });
  def('bm-corvane-m-ring', 'bm', S => {
    S.space('hall', 0.5);
    S.noise({ bp: 4200, bp1: 800, q: 2.4, dur: 0.4, a: 0.005, pts: [[0.04, 1], [0.4, 0]], peak: 0.18 });
    S.metal({ at: 0.05, set: 'plate', f: 640, dur: 0.9, peak: 0.24, strike: 0.9 });
    S.thud({ at: 0.05, f: 70, f1: 32, dur: 0.6, drive: 2.6, peak: 0.5 });
    [0, 0.06, 0.12].forEach((at, i) => S.glass({ at: at + 0.06, f: 2000 + i * 540, dur: 1.2, peak: 0.07 }));
    S.bell({ at: 0.08, f: mf(76), dur: 2.0, peak: 0.08, lp: 5000 });
  });
  // a hero thrown back in (or out) of the ring: a short flick of air and a clack of steel
  def('bm-corvane-m-ring-throw', 'imp', S => {
    S.whoosh({ f: 400, f1: 2600, dur: 0.22, peakAt: 0.7, peak: 0.26 });
    S.metal({ at: 0.18, set: 'bar', f: 2600, dur: 0.35, peak: 0.12, strike: 0.9 });
    S.thud({ at: 0.2, f: 90, f1: 46, dur: 0.3, drive: 1.8, peak: 0.3 });
  });
  // Gale Through the Pass (4.4 s): one wind from the west end of the pass to the east, building the whole bar. Ice singing in it, snow hissing along the floor; the blow is bm-corvane-m-gale.
  def('bm-corvane-gale-through-the-pass', 'bm', S => {
    S.space('hall', 0.55);
    S.noise({ bp: 260, bp1: 2400, q: 1.0, dur: 4.4, a: 2.8, pts: [[3.4, 1], [4.4, 0.8]], peak: 0.26, pan: -0.55 });
    S.noise({ at: 1.0, bp: 500, bp1: 3600, q: 1.1, dur: 3.4, a: 2.2, pts: [[2.6, 1], [3.4, 0.7]], peak: 0.2, pan: 0.55 });
    S.tone({ f: 620, f1: 1500, dur: 4.2, a: 2.6, vib: [5, 0.04, 0.5], pts: [[3.4, 1], [4.2, 0.3]], peak: 0.035 });
    S.crackle({ at: 0.8, dens: 2.4, f: 5600, dur: 3.4, pts: [[2.0, 1], [3.4, 0.4]], peak: 0.1 });
    S.rumble({ dur: 4.4, f: 46, peak: 0.3, a: 2.4 });
    [1.2, 2.2, 3.1].forEach((at, i) => S.glass({ at, f: mf(88 + i * 4), dur: 1.0, peak: 0.04 }));
  });
  def('bm-corvane-m-gale', 'imp', S => {
    S.noise({ bp: 500, bp1: 2800, q: 1.1, dur: 1.2, a: 0.04, pts: [[0.1, 1], [1.2, 0]], peak: 0.36 });
    S.whoosh({ f: 200, f1: 2200, dur: 0.5, peakAt: 0.4, peak: 0.34 });
    S.crackle({ at: 0.05, dens: 4, f: 6000, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.18 });
    S.thud({ at: 0.05, f: 58, f1: 26, dur: 0.8, drive: 2.8, peak: 0.6 });
  });
  // the east wall stopping a hero the gale threw
  def('bm-corvane-m-wall', 'imp', S => {
    S.thud({ f: 54, f1: 24, dur: 0.7, drive: 3, peak: 0.7 });
    S.crack({ peak: 0.28, dur: 0.18 });
    S.metal({ at: 0.01, set: 'stone', f: 190, dur: 0.6, peak: 0.16, strike: 0.9 });
  });
  // Three Lessons (rides the stance's own bar): three dry knocks of a pointing blade, low, high, and a soft one for the sheath, with the cold held under them
  def('bm-corvane-three-lessons', 'bm', S => {
    S.space('hall', 0.45);
    [[0.15, 150, mf(64)], [0.7, 520, mf(94)], [1.25, 300, mf(80)]].forEach(([at, wf, gf], i) => {
      S.wood({ at, f: wf, dur: 0.1, peak: 0.26 });
      S.glass({ at: at + 0.02, f: gf, dur: i === 2 ? 0.5 : 1.0, peak: i === 2 ? 0.05 : 0.09 });
    });
    S.noise({ bp: 1400, bp1: 3600, q: 3, dur: 1.8, a: 0.9, pts: [[1.2, 1], [1.8, 0]], peak: 0.06 });
    S.metal({ at: 1.8, set: 'bar', f: 1640, dur: 1.2, peak: 0.1, strike: 0.5 });
  });
  // a lesson on your own head (rate: low 0.8, sheath 1, high 1.35, the duel a little over) and a lesson failed
  def('bm-corvane-m-mark', 'bm', S => {
    S.wood({ f: 300, dur: 0.1, peak: 0.2 });
    S.glass({ at: 0.02, f: mf(88), dur: 0.9, peak: 0.1 });
    S.metal({ at: 0.03, set: 'bar', f: 1800, dur: 0.5, peak: 0.07, strike: 0.9 });
  });
  def('bm-corvane-m-lesson-fail', 'imp', S => {
    S.metal({ set: 'plate', f: 420, dur: 0.7, peak: 0.22, strike: 0.9 });
    S.thud({ f: 76, f1: 38, dur: 0.5, drive: 2.2, peak: 0.45 });
    S.crackle({ at: 0.02, dens: 3, f: 4600, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.12 });
  });
  // Still Water's counter: a white cut across the one who struck him
  def('bm-corvane-m-counter', 'imp', S => {
    S.whoosh({ f: 800, f1: 5200, dur: 0.16, peakAt: 0.8, peak: 0.3 });
    S.metal({ at: 0.13, set: 'bar', f: 3300, dur: 0.4, peak: 0.1, strike: 0.9 });
    S.glass({ at: 0.14, f: 2700, dur: 0.6, peak: 0.07 });
    S.noise({ at: 0.14, bp: 6200, q: 1.4, dur: 0.1, a: 0.002, pts: [[0.01, 1], [0.1, 0]], peak: 0.12 });
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
  def('bm-brannoc-rebound', 'bm', S => {
    S.space('hall', 0.4);
    S.whoosh({ f: 260, f1: 2200, dur: 0.28, peakAt: 0.9, peak: 0.3 });
    brWhirr(S, 0.2, 0.7, 2200, 3000, -0.3, 0.2);
    brClang(S, 0.62, 1040, 0.34, 0.3);
    S.scrape({ at: 0.65, f: 3400, q: 2.2, dur: 0.14, rate: 40, peak: 0.06, pts: [[0.03, 1], [0.14, 0]] });
    S.whoosh({ at: 0.7, f: 2400, f1: 700, dur: 0.3, peakAt: 0.3, peak: 0.2, pan: 0.2 });
    S.thud({ at: 1.12, f: 96, f1: 44, dur: 0.5, drive: 2.2, peak: 0.5 });
    S.metal({ at: 1.12, set: 'plate', f: 410, dur: 0.6, peak: 0.2, strike: 0.7 });
    S.noise({ at: 1.14, bp: 1500, bp1: 400, q: 1.2, dur: 0.35, pts: [[0.02, 1], [0.35, 0]], peak: 0.12 });
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
  // ---- the revamp's moves and moments (the casts play from their names; the m- cues are the moments sound-hooks.js reads off the room: a banner down, a post held, a role's ring, a carried throw)
  // Crowd-Pleaser (3.6 s, Act II's opener): the Sunwheel held up to the stands: the crowd swelling, banners snapping open down the benches, a slow bronze ring; the light blow is bm-brannoc-m-cheer.
  def('bm-brannoc-crowd-pleaser', 'bm', S => {
    S.space('hall', 0.75);
    brCrowd(S, 0, 3.4, 0.3);
    [0, 1, 2, 3].forEach(i => S.voice({ at: 0.3 + i * 0.08, f: 120 + i * 29, f1: 190 + i * 22, dur: 2.6, vowel: 'a', vowel1: 'o', breath: 1.8, lp: 2200, peak: 0.08, a: 1.2, pan: (i - 1.5) * 0.45 }));
    [0.9, 1.5, 2.1, 2.7].forEach((at, i) => {
      S.whoosh({ at, color: 'pink', f: 500, f1: 2600, dur: 0.22, peakAt: 0.3, peak: 0.16, pan: (i % 2 ? 0.5 : -0.5) });
      S.wood({ at: at + 0.12, f: 180 + i * 30, dur: 0.12, peak: 0.16, pan: (i % 2 ? 0.5 : -0.5) });
    });
    S.metal({ at: 1.2, set: 'plate', f: 590, dur: 2.2, peak: 0.18, strike: 0.5 });
    S.bell({ at: 1.25, f: mf(52), dur: 2.6, peak: 0.1, lp: 3000 });
    S.rumble({ dur: 3.6, f: 48, peak: 0.28, a: 1.4 });
  });
  def('bm-brannoc-m-cheer', 'imp', S => {
    S.space('hall', 0.5);
    S.drum({ f: 70, dur: 0.6, peak: 0.5 });
    brCrowd(S, 0, 0.9, 0.22);
    brClang(S, 0.02, 640, 0.2);
    S.thud({ at: 0.02, f: 62, f1: 30, dur: 0.7, drive: 2.4, peak: 0.45 });
  });
  // a banner knocked loose, striking the sand: cloth cracking, the pole dropping, a thud
  def('bm-brannoc-m-banner', 'imp', S => {
    S.whoosh({ color: 'pink', f: 700, f1: 200, dur: 0.3, peakAt: 0.3, peak: 0.22 });
    S.wood({ at: 0.22, f: 150, dur: 0.18, peak: 0.34 });
    S.thud({ at: 0.24, f: 74, f1: 34, dur: 0.6, drive: 2.4, peak: 0.55 });
    S.noise({ at: 0.24, color: 'pink', bp: 1200, bp1: 300, q: 0.9, dur: 0.4, a: 0.005, pts: [[0.03, 1], [0.4, 0]], peak: 0.16 });
  });
  // Stand Your Ground (the wheel's cast on Extreme, one hero a post): the wheel's whirr with a heavy bronze post planted under it and the clang that will come off it
  def('bm-brannoc-stand-your-ground', 'bm', S => {
    S.space('hall', 0.45);
    S.whoosh({ f: 200, f1: 1600, dur: 0.4, peakAt: 0.9, peak: 0.28 });
    brWhirr(S, 0.35, 1.6, 1700, 3000, 0, 0.3);
    S.thud({ at: 0.55, f: 52, f1: 24, dur: 0.9, drive: 3.4, peak: 0.7 });
    S.metal({ at: 0.55, set: 'plate', f: 230, dur: 1.8, peak: 0.26, strike: 0.9 });
    S.bell({ at: 0.58, f: mf(45), dur: 2.4, peak: 0.12, lp: 2200 });
    brClang(S, 1.5, 1040, 0.32);
    brClang(S, 1.9, 760, 0.26);
  });
  // the post held where it stands (a gold ping on you, the iron closing about them), and the wheel's light blow on it
  def('bm-brannoc-m-mark', 'bm', S => {
    S.metal({ set: 'plate', f: 880, dur: 0.7, peak: 0.16, strike: 0.9 });
    S.bell({ at: 0.02, f: mf(79), dur: 1.0, peak: 0.1, lp: 4000 });
  });
  def('bm-brannoc-m-post-lock', 'bm', S => {
    S.metal({ set: 'bar', f: 360, dur: 0.5, peak: 0.2, strike: 0.9 });
    S.metal({ at: 0.09, set: 'bar', f: 520, dur: 0.5, peak: 0.16, strike: 0.9 });
    S.thud({ at: 0.1, f: 72, f1: 36, dur: 0.4, drive: 2.2, peak: 0.4 });
    S.scrape({ at: 0.14, f: 1800, q: 2, dur: 0.2, rate: 30, peak: 0.07, pts: [[0.02, 1], [0.2, 0]] });
  });
  def('bm-brannoc-m-post-hit', 'imp', S => {
    brClang(S, 0, 880, 0.32);
    S.thud({ at: 0.02, f: 66, f1: 30, dur: 0.6, drive: 2.6, peak: 0.55 });
    S.crack({ at: 0.02, peak: 0.2, dur: 0.15 });
  });
  // Crowd's Choice (the wheel's cast on Extreme, a role's sigil on each ring): three calls from the stands, low, middle and high (a shield, a cross, a blade), over the wheel's whirr
  def('bm-brannoc-crowds-choice', 'bm', S => {
    S.space('hall', 0.55);
    S.whoosh({ f: 200, f1: 1800, dur: 0.4, peakAt: 0.9, peak: 0.28 });
    brWhirr(S, 0.3, 1.8, 1500, 3000, 0, 0.26);
    [[0.5, 96, 78], [0.95, 140, 118], [1.4, 205, 170]].forEach(([at, f, f1], i) => {
      brCrowd(S, at, 0.7, 0.1);
      [0, 1].forEach(j => S.voice({ at: at + j * 0.05, f: f * (1 + j * 0.02), f1, dur: 0.55, vowel: i === 1 ? 'i' : 'o', vowel1: 'a', breath: 1.0, lp: 1900, peak: 0.1, a: 0.12, pan: (j - 0.5) * 0.6 }));
      brClang(S, at + 0.15, 520 + i * 260, 0.22);
    });
    brClang(S, 2.1, 980, 0.26);
  });
  // a role's ring appears, its sigil sounded (rate: tank 0.75, healer 1, damage 1.4) and a wrong catch
  def('bm-brannoc-m-sigil', 'bm', S => {
    S.bell({ f: mf(74), dur: 1.0, peak: 0.12, lp: 5000 });
    S.metal({ set: 'plate', f: 700, dur: 0.5, peak: 0.1, strike: 0.9 });
    S.voice({ at: 0.02, f: 150, f1: 130, dur: 0.3, vowel: 'o', vowel1: 'a', breath: 0.8, lp: 1500, peak: 0.07 });
  });
  def('bm-brannoc-m-wrong', 'imp', S => {
    S.metal({ set: 'plate', f: 210, dur: 0.8, peak: 0.24, strike: 0.9 });
    S.thud({ f: 56, f1: 26, dur: 0.7, drive: 2.8, peak: 0.55 });
    S.noise({ at: 0.02, color: 'brown', bp: 700, bp1: 200, q: 1, dur: 0.5, a: 0.01, pts: [[0.04, 1], [0.5, 0]], peak: 0.16 });
  });
  // Carry-through (the wheel's cast on Extreme): a caught wheel carries its catcher on: the whirr and a long forward rush, a scrape of bronze along stone, a hard stop
  def('bm-brannoc-carry-through', 'bm', S => {
    S.space('hall', 0.5);
    S.whoosh({ f: 200, f1: 1600, dur: 0.4, peakAt: 0.9, peak: 0.28 });
    brWhirr(S, 0.3, 1.5, 1600, 2900, 0, 0.26);
    S.whoosh({ at: 1.2, color: 'brown', f: 120, f1: 1800, dur: 0.9, peakAt: 0.8, peak: 0.34 });
    S.scrape({ at: 1.3, f: 1500, q: 1.6, dur: 0.9, rate: 18, peak: 0.12, pts: [[0.3, 1], [0.9, 0.4]] });
    brClang(S, 0.7, 960, 0.26);
    brClang(S, 2.2, 440, 0.34);
    S.thud({ at: 2.2, f: 56, f1: 26, dur: 0.8, drive: 3, peak: 0.6 });
  });
  def('bm-brannoc-m-carry-throw', 'imp', S => {
    S.whoosh({ color: 'brown', f: 150, f1: 2000, dur: 0.4, peakAt: 0.6, peak: 0.32 });
    S.scrape({ at: 0.1, f: 1700, q: 1.6, dur: 0.4, rate: 20, peak: 0.1, pts: [[0.1, 1], [0.4, 0]] });
  });
  def('bm-brannoc-m-carry-slam', 'imp', S => {
    S.thud({ f: 50, f1: 22, dur: 1.0, drive: 3.6, peak: 0.85 });
    brClang(S, 0, 360, 0.3);
    S.crack({ peak: 0.28, dur: 0.18 });
    S.splat({ at: 0.02, dur: 0.4, peak: 0.2 });
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
  def('bm-morrowoak-hungers-reach', 'bm', S => {
    S.space('room', 0.35);
    moVoid(S, 0, 2.6, 0.12, 420, 70);
    moCreak(S, 0.2, 2.2, 0.1, -0.3, 20, 34);
    [0.5, 1.0, 1.4, 1.75, 2.05, 2.3, 2.52].forEach((at, i) => {
      moRootTear(S, at, 0.18 + i * 0.025, (i % 2 ? 0.45 : -0.45));
      S.wood({ at: at + 0.04, f: 240 + i * 55, dur: 0.1, peak: 0.1, pan: (i % 2 ? 0.45 : -0.45) });
    });
    S.whoosh({ at: 1.6, color: 'brown', f: 120, f1: 1100, dur: 1.4, peakAt: 0.92, peak: 0.2 });
    S.crack({ at: 3.0, peak: 0.28, dur: 0.18 });
    S.thud({ at: 3.0, f: 60, f1: 30, dur: 0.55, drive: 2.2, peak: 0.5 });
    moLeaves(S, 3.05, 0.7, 0.1);
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
  // ---- the revamp's moves and moments (the casts play from their names; the m- cues are the moments sound-hooks.js reads off the room: the opening blows, a seed carried, a hole closing, a limb's graft)
  // The Hunger Stirs (3.4 s, Act II's opener): the heartwood splitting wider. Slow and low: wood giving, a deep drone, the first hollow breath; the blow is bm-morrowoak-m-stir.
  def('bm-morrowoak-the-hunger-stirs', 'bm', S => {
    S.space('hall', 0.75);
    S.rumble({ dur: 3.6, f: 40, peak: 0.34, a: 1.6 });
    moCreak(S, 0, 3.2, 0.2, 0, 14, 22);
    moCreak(S, 0.9, 2.2, 0.12, 0.4, 26, 14);
    [0.7, 1.5, 2.3].forEach((at, i) => { S.crack({ at, peak: 0.16 + i * 0.03, dur: 0.18 }); S.wood({ at, f: 140 - i * 10, dur: 0.3, peak: 0.2 }); });
    S.tone({ at: 0.6, f: 52, f1: 44, dur: 2.8, a: 1.4, fm: [0.6, 1.0, 0.2], lp: 420, peak: 0.14 });
    moVoid(S, 1.6, 1.8, 0.14, 500, 60);
    moLeaves(S, 0.8, 2.2, 0.06);
  });
  // Starved (3.4 s, Act IV's opener): the same grove with nothing left in it: higher and drier, a hollow wind, the drone thinning away rather than building
  def('bm-morrowoak-starved', 'bm', S => {
    S.space('hall', 0.85);
    S.noise({ color: 'pink', bp: 700, bp1: 260, q: 2.4, dur: 3.4, a: 0.6, pts: [[1.4, 1], [3.4, 0]], peak: 0.16 });
    moLeaves(S, 0, 3.2, 0.12);
    moCreak(S, 0.2, 2.8, 0.14, 0, 30, 12);
    S.tone({ f: 92, f1: 38, dur: 3.2, a: 0.3, fm: [0.5, 1.4, 0.2], lp: 520, pts: [[0.6, 1], [3.2, 0]], peak: 0.2 });
    S.pad({ at: 0.2, notes: [mf(46), mf(53)], dur: 3.0, det: 16, type: 'saw', lpEnv: [500, 300, 120, 2.6], peak: 0.07 });
    [0.5, 1.5, 2.6].forEach((at, i) => S.wood({ at, f: 520 - i * 90, dur: 0.1, peak: 0.1, pan: (i - 1) * 0.5 }));
  });
  def('bm-morrowoak-m-stir', 'imp', S => {
    S.space('hall', 0.5);
    S.thud({ f: 48, f1: 22, dur: 1.2, drive: 3.4, peak: 0.7 });
    S.noise({ at: 0.02, color: 'brown', bp: 900, bp1: 150, q: 0.8, dur: 0.9, a: 0.01, pts: [[0.05, 1], [0.9, 0]], peak: 0.22 });
    moCreak(S, 0, 0.7, 0.12, 0, 26, 14);
    moLeaves(S, 0.05, 0.5, 0.06);
  });
  // Greenseed (3 s): the living seed beside the Hunger's: bright where that one is hollow. Water drops, a green warmth rising, a small wooden tick as it sets
  def('bm-morrowoak-greenseed', 'bm', S => {
    S.space('room', 0.4);
    S.bubbles({ n: 7, f: 500, f1: 1500, spread: 1.2, size: 0.04, peak: 0.1 });
    S.tone({ at: 0.2, f: 196, f1: 330, dur: 2.2, a: 1.0, vib: [4.5, 0.02, 0.3], lp: 1400, pts: [[1.6, 1], [2.2, 0]], peak: 0.1 });
    S.tone({ at: 0.35, f: 294, f1: 494, dur: 2.0, a: 1.0, lp: 2200, pts: [[1.5, 1], [2.0, 0]], peak: 0.05 });
    [1.2, 1.5, 1.85].forEach((at, i) => S.wood({ at, f: 900 + i * 220, dur: 0.07, peak: 0.12 }));
    S.glass({ at: 2.2, f: mf(88), dur: 1.0, peak: 0.06 });
    moLeaves(S, 2.1, 0.7, 0.06);
  });
  // a seed on you (rate: 1 the living one, lower for the Hunger's)
  def('bm-morrowoak-m-seed-mark', 'bm', S => {
    S.bubbles({ n: 3, f: 400, f1: 1100, spread: 0.2, size: 0.04, peak: 0.1 });
    S.tone({ f: 260, f1: 390, dur: 0.5, a: 0.02, lp: 1800, pts: [[0.05, 1], [0.5, 0]], peak: 0.12 });
    S.wood({ at: 0.02, f: 700, dur: 0.07, peak: 0.14 });
  });
  // a hole closing for good (propfx mgmend): the floor knitting over, soft green chimes climbing, a burst of leaves
  def('bm-morrowoak-m-mend', 'bm', S => {
    S.space('room', 0.4);
    S.noise({ color: 'brown', bp: 200, bp1: 900, q: 1, dur: 0.9, a: 0.35, pts: [[0.5, 1], [0.9, 0]], peak: 0.18 });
    [0, 1, 2, 3].forEach(i => S.glass({ at: 0.15 + i * 0.12, f: mf(76 + i * 4), dur: 0.9, peak: 0.07 }));
    S.thud({ at: 0.5, f: 78, f1: 40, dur: 0.5, drive: 1.8, peak: 0.35 });
    S.wood({ at: 0.52, f: 320, dur: 0.14, peak: 0.2 });
    moLeaves(S, 0.5, 0.8, 0.12);
  });
  // Take Root (4.4 s): the Hunger breathes in over three rings of root laid on the floor. Roots taking hold one after another, a long inward pull, the drag at the bar's end
  def('bm-morrowoak-take-root', 'bm', S => {
    S.space('hall', 0.6);
    moVoid(S, 0.2, 4.0, 0.3, 1100, 60);
    [0.3, 1.2, 2.1].forEach((at, i) => { moRootTear(S, at, 0.24 + i * 0.04, (i - 1) * 0.5); S.wood({ at: at + 0.05, f: 200 + i * 30, dur: 0.2, peak: 0.16, pan: (i - 1) * 0.5 }); });
    moCreak(S, 0.5, 3.4, 0.14, 0, 16, 30);
    S.rumble({ dur: 4.4, f: 44, peak: 0.34, a: 3.0 });
    moLeaves(S, 0.6, 3.4, 0.1);
    S.thud({ at: 4.3, f: 50, f1: 22, dur: 0.7, drive: 3, peak: 0.5 });
  });
  // Grafting (1.8 s): a limb's wood running into the one beside it. A tearing, then bark closing over bark with a sap-wet thunk
  def('bm-morrowoak-grafting', 'bm', S => {
    S.space('room', 0.4);
    moCreak(S, 0, 1.5, 0.16, 0, 20, 34);
    S.noise({ color: 'brown', bp: 300, bp1: 1000, q: 1, dur: 1.2, a: 0.7, pts: [[0.9, 1], [1.2, 0]], peak: 0.16 });
    moSap(S, 0.5, 0.12);
    S.wood({ at: 1.3, f: 240, dur: 0.2, peak: 0.34 });
    S.thud({ at: 1.3, f: 66, f1: 30, dur: 0.6, drive: 2.4, peak: 0.55 });
    S.splat({ at: 1.32, dur: 0.4, peak: 0.16 });
  });
  // a limb breaking (propfx mggraft): the stump tearing off and its wood running away across the floor
  def('bm-morrowoak-m-graft', 'imp', S => {
    moRootTear(S, 0, 0.34);
    S.whoosh({ at: 0.1, color: 'brown', f: 200, f1: 900, dur: 0.5, peakAt: 0.5, peak: 0.2 });
    moCreak(S, 0.2, 0.7, 0.1, 0, 30, 18);
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
  def('bm-caelum-trailing-cut', 'bm', S => {
    S.space('hall', 0.4);
    // the copy appears at the heel and keeps pace: a faint stepping shimmer, three small glassy steps drifting after the tank
    caHush(S, 0, 0.5, 0.07, 2600, 6000);
    for (let i = 0; i < 3; i++) S.glass({ at: 0.35 + i * 0.22, f: 2300 + i * 380, dur: 0.3, peak: 0.035, pan: (i - 1) * 0.5 });
    // the ring stops: one bright chime, a held breath
    S.metal({ at: 1.05, set: 'bar', f: 3100, dur: 0.7, peak: 0.07, strike: 0.2 });
    // the cut drops straight down onto the spot: a short glassy drop (no run), a small thud, then the copy's echo
    S.whoosh({ at: 1.3, f: 1800, f1: 4200, dur: 0.18, peakAt: 0.7, peak: 0.22, q: 2 });
    S.thud({ at: 1.46, f: 74, f1: 32, dur: 0.6, drive: 2.4, peak: 0.55 });
    S.glass({ at: 1.46, f: 3600, dur: 0.7, peak: 0.09 });
    S.crack({ at: 1.46, peak: 0.16, dur: 0.12 });
    caEcho(S, 1.7, 3400, 0.05, 3);
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
  // ---- the revamp's moves and moments (the casts play from their names; the m- cues are the moments sound-hooks.js reads off the room: the opening blows, a carried shadow, a star dropped and burst)
  // The Shadow Lengthens (3.2 s, Act II's opener): the blade lifted and the shadow swelling out to its new size (it grows 2.2 s in). Low and wide: a dark drone opening, one thin glass ring held above it; the blow is bm-caelum-m-lengthens.
  def('bm-caelum-the-shadow-lengthens', 'bm', S => {
    S.space('hall', 0.85);
    caDrone(S, 0, 3.6, 0.12, [mf(33), mf(40), mf(45)]);
    S.noise({ color: 'brown', bp: 100, bp1: 700, q: 0.8, dur: 3.2, a: 1.8, pts: [[2.3, 1], [3.2, 0.5]], peak: 0.24 });
    S.glass({ at: 0.3, f: mf(93), dur: 2.6, peak: 0.06 });
    S.tone({ at: 0.3, f: 1900, f1: 2600, dur: 1.6, a: 0.6, peak: 0.025, am: [7, 0.5] });
    S.whoosh({ at: 1.6, color: 'brown', f: 90, f1: 900, dur: 0.9, peakAt: 0.85, peak: 0.3 });
    caStars(S, 1.8, 5, 1.0, 0.025, 2600, 5200);
  });
  def('bm-caelum-m-lengthens', 'imp', S => {
    S.space('hall', 0.6);
    S.thud({ f: 50, f1: 24, dur: 1.2, drive: 3, peak: 0.6 });
    S.noise({ at: 0.02, color: 'brown', bp: 1100, bp1: 120, q: 0.8, dur: 1.0, a: 0.02, pts: [[0.06, 1], [1.0, 0]], peak: 0.24 });
    S.glass({ at: 0.04, f: mf(88), dur: 1.6, peak: 0.07 });
  });
  // Sunless (3.4 s, Act IV's opener): the light leaving the sky. Stars winking out one after another, a chord falling away to nothing, and in the hush a single coal taking
  def('bm-caelum-sunless', 'bm', S => {
    S.space('hall', 0.85);
    S.pad({ notes: [mf(64), mf(71), mf(76)], dur: 2.8, det: 6, type: 'sine', lpEnv: [2600, 2000, 240, 2.4], peak: 0.12 });
    [0, 0.25, 0.5, 0.8, 1.1, 1.45, 1.8].forEach((at, i) => S.tone({ at, f: 6400 - i * 640, f1: 5200 - i * 640, dur: 0.4, a: 0.004, peak: 0.04 }));
    S.noise({ at: 0.3, bp: 4200, bp1: 240, q: 1.4, dur: 2.6, a: 0.1, pts: [[0.3, 1], [2.6, 0]], peak: 0.14 });
    S.rumble({ at: 1.0, dur: 2.4, f: 38, peak: 0.3, a: 1.0 });
    S.tone({ at: 2.7, f: 90, f1: 60, dur: 0.7, a: 0.2, lp: 400, peak: 0.12 });
    S.sizzle({ at: 2.9, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.05 });
  });
  def('bm-caelum-m-sunless', 'imp', S => {
    S.space('hall', 0.7);
    S.bell({ f: mf(33), dur: 3.4, peak: 0.24, lp: 1500 });
    S.thud({ f: 46, f1: 20, dur: 1.4, drive: 3.6, peak: 0.8 });
    S.sizzle({ at: 0.05, dur: 1.2, pts: [[0.05, 1], [1.2, 0]], peak: 0.1 });
    S.crackle({ at: 0.08, dens: 1.4, f: 2200, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.12 });
  });
  // Carried Shadow (the Starfall's cast on Extreme, one hero carrying a tower): the shards falling as before but fewer, over a small dark pulse that travels
  def('bm-caelum-carried-shadow', 'bm', S => {
    S.space('hall', 0.6);
    caMeteor(S, 0, 2.6, 0.14);
    S.tone({ f: 82, f1: 70, dur: 2.6, a: 0.4, lp: 420, am: [2.4, 0.7], pts: [[1.2, 1], [2.6, 0.2]], peak: 0.2 });
    [[0.5, 5200, 0.6], [1.1, 4400, -0.4], [1.7, 5000, 0.2]].forEach(([at, f, pan], i) => {
      S.tone({ at, f, f1: f * 0.2, dur: 0.6, a: 0.01, curve: 'exp', pts: [[0.04, 1], [0.6, 0]], peak: 0.05, pan });
      S.thud({ at: at + 0.5, f: 78 - i * 4, f1: 34, dur: 0.5, drive: 2.2, peak: 0.4, pan });
      S.glass({ at: at + 0.52, f: 2500 + i * 330, dur: 0.9, peak: 0.09, pan });
    });
    S.thud({ at: 2.4, f: 54, f1: 24, dur: 1.2, drive: 3.2, peak: 0.7 });
  });
  // the carrier's own dark disc settling on them (roomev caelum-carried): a soft low pulse and one glass note
  def('bm-caelum-m-carried', 'bm', S => {
    S.tone({ f: 88, f1: 64, dur: 0.9, a: 0.1, lp: 480, am: [3, 0.6], pts: [[0.2, 1], [0.9, 0]], peak: 0.22 });
    S.noise({ color: 'brown', bp: 600, bp1: 160, q: 1, dur: 0.7, a: 0.1, pts: [[0.2, 1], [0.7, 0]], peak: 0.14 });
    S.glass({ at: 0.05, f: mf(84), dur: 1.0, peak: 0.06 });
  });
  // Fallen Stars (3 s): heroes marked to drop stars from the sky. A hush, then stars appearing as thin chimes high up and sinking
  def('bm-caelum-fallen-stars', 'bm', S => {
    S.space('hall', 0.8);
    caHush(S, 0, 1.2, 0.08, 2000, 5600);
    caStars(S, 0.6, 12, 1.8, 0.05, 6800, 2400);
    [0.9, 1.4, 1.9].forEach((at, i) => { S.glass({ at, f: mf(98 - i * 5), dur: 1.4, peak: 0.08, am: [5, 0.4] }); S.thud({ at: at + 0.1, f: 70 - i * 6, f1: 34, dur: 0.4, drive: 1.4, peak: 0.18 }); });
    S.rumble({ dur: 3, f: 44, peak: 0.2, a: 1.2 });
    S.bell({ at: 2.2, f: mf(62), dur: 1.8, peak: 0.07, lp: 4200 });
  });
  // a star on you (a thin high ping), a star landing (dropped from the sky: a falling chime and a ringing thump) and a star bursting or spent (glass breaking)
  def('bm-caelum-m-star-mark', 'bm', S => {
    S.glass({ f: mf(98), dur: 0.9, peak: 0.1 });
    S.tone({ at: 0.02, f: 5200, f1: 3800, dur: 0.3, a: 0.004, peak: 0.04 });
  });
  def('bm-caelum-m-star-drop', 'bm', S => {
    S.space('hall', 0.5);
    S.tone({ f: 5400, f1: 1100, dur: 0.5, a: 0.01, curve: 'exp', pts: [[0.04, 1], [0.5, 0]], peak: 0.07 });
    S.thud({ at: 0.42, f: 74, f1: 32, dur: 0.7, drive: 2.6, peak: 0.55 });
    S.glass({ at: 0.44, f: 2600, dur: 1.4, peak: 0.1 });
    S.glass({ at: 0.46, f: 3900, dur: 1.0, peak: 0.05 });
  });
  def('bm-caelum-m-star-burst', 'imp', S => {
    S.space('hall', 0.5);
    S.crack({ peak: 0.3, dur: 0.2 });
    S.noise({ hp: 5000, dur: 0.12, a: 0.002, pts: [[0.005, 1], [0.12, 0]], peak: 0.2 });
    for (let i = 0; i < 7; i++) S.glass({ at: 0.02 + i * 0.05, f: 1700 + ((i * 521) % 2600), dur: 0.8, peak: 0.07, pan: Math.sin(i * 2.2) * 0.7 });
    S.thud({ at: 0.02, f: 66, f1: 30, dur: 0.6, drive: 2.4, peak: 0.45 });
  });
  // The Star's Pull (the lead bar of one dance, a second or so): the sky drawing everything toward its middle. Air sucked inward and down, a low hum gathering
  def('bm-caelum-the-stars-pull', 'bm', S => {
    S.space('hall', 0.6);
    S.noise({ bp: 6000, bp1: 500, q: 1.6, dur: 1.8, a: 0.1, pts: [[0.4, 1], [1.8, 0]], peak: 0.2 });
    S.tone({ f: 1800, f1: 140, dur: 1.6, a: 0.05, curve: 'exp', pts: [[0.3, 1], [1.6, 0]], peak: 0.05 });
    S.tone({ at: 0.3, f: 72, f1: 58, dur: 1.5, a: 0.6, lp: 380, am: [4, 0.4], peak: 0.2 });
    caStars(S, 0, 6, 1.0, 0.03, 5600, 2200);
    S.thud({ at: 1.5, f: 50, f1: 26, dur: 0.7, drive: 2, peak: 0.3 });
  });

  // ============================================================================================== Garrow, the Moon's Hound (Season 2, boss XIII: the Long Mere)
  // Cold and close: breath, snow, mist, a silver chain, ice. No fire, no brass, no crowd, and he never snarls or barks: the worst he does is go quiet and look. A howl is one long clean
  // note that carries over the frozen lake with the lake's own slap-back; running on snow is a soft fast drumming, not hooves; ice cracks upward. The hunts (On the Scent and its
  // variants) share one voice, the sniff and the low close breath, and each adds a turn of its own. The m- cues are the moments sound-hooks.js reads off the room (its "garrow" block).
  const gwSniff = (S, at, pk, pan = 0, k = 1) => S.noise({ at, color: 'pink', hp: 500, bp: 900 * k, bp1: 2300 * k, q: 1.1, dur: 0.24, pts: [[0.09, 1], [0.24, 0]], peak: pk, pan });   // cold air drawn in
  const gwBreath = (S, at, dur, pk, f = 1300, pan = 0) => {       // the low close breath: a soft swell of air and a little chest under it
    S.noise({ at, color: 'pink', bp: f, bp1: f * 0.7, q: 0.7, lp: 3200, dur, pts: [[dur * 0.45, 1], [dur, 0]], peak: pk, pan });
    S.noise({ at: at + dur * 0.1, color: 'brown', lp: 380, dur: dur * 0.9, pts: [[dur * 0.4, 1], [dur * 0.9, 0]], peak: pk * 0.5, pan });
  };
  const gwPaws = (S, at, n, gap, pk, o = {}) => {                 // a soft fast drumming on snow: a muffled thump and a dry crunch (o.pf(i, n): where each lands, o.fade: dying away)
    for (let i = 0; i < n; i++) {
      const t = at + i * gap + (i % 2 ? gap * 0.1 : 0), f = (o.f || 96) * (i % 2 ? 0.9 : 1), pan = o.pf ? o.pf(i, n) : o.pan != null ? o.pan : Math.sin(i * 1.3) * 0.25;
      const p2 = pk * (o.fade ? 1 - 0.8 * i / n : 1 - (i % 3) * 0.1);
      S.thud({ at: t, f, f1: f * 0.5, dur: 0.14, peak: p2, click: 0, lp: 420, pan });
      S.noise({ at: t, color: 'pink', hp: 1800, lp: 5200, dur: 0.07, pts: [[0.012, 1], [0.07, 0]], peak: p2 * 0.35, grain: 0.6, pan });
    }
  };
  const gwWind = (S, at, dur, pk, f0, f1, peakAt = 0.6, pan = 0) => {   // wind and the hiss of fine snow in it (peakAt under 0.9)
    S.whoosh({ at, color: 'pink', f: f0, f1, dur, peakAt, q: 0.9, peak: pk, pan });
    S.sizzle({ at: at + dur * 0.05, dur: dur * 0.95, hp: 4500, lp: 9000, pts: [[dur * peakAt * 0.7, 0.4], [dur * peakAt, 1], [dur * 0.95, 0]], peak: pk * 0.2, pan });
  };
  const gwIce = (S, at, pk, f = 2600, pan = 0) => { S.crack({ at, peak: pk, dur: 0.12, f: 2400, pan }); S.glass({ at: at + 0.005, f, dur: 0.7, peak: pk * 0.35, pan }); };   // a crack and its small ring
  const gwHowl = (S, at, dur, pk, f = 190, fb = 0.42) => {        // one long clean note, rising and then settling, with the lake's slap-back behind it (no growl in it)
    S.echo({ time: 0.62, fb, lp: 1700, kill: at + dur + 3 });
    const d1 = dur * 0.58, d2 = dur * 0.55;
    S.voice({ at, f, f1: f * 1.55, dur: d1, vowel: 'o', vowel1: 'u', breath: 1.4, lp: 2400, peak: pk, ech: 0.5, rev: 0.4, pts: [[0.35, 0.7], [d1 - 0.05, 1], [d1, 0]] });
    S.voice({ at: at + dur * 0.45, f: f * 1.55, f1: f * 0.92, dur: d2, vowel: 'u', vowel1: 'o', breath: 1.4, lp: 2200, peak: pk * 0.9, ech: 0.5, rev: 0.4, pts: [[0.2, 0.9], [d2 * 0.35, 1], [d2 * 0.75, 0.5], [d2, 0]] });
    S.tone({ at: at + 0.2, f: f * 5.8, f1: f * 8.4, dur: dur * 0.7, a: dur * 0.3, peak: pk * 0.05, ech: 0.6 });   // the thin cold edge on the note
  };
  // his entrance: wind over the ice, a few links of the broken silver chain, one far howl, a breath out and the hush
  def('bm-garrow-intro', 'sting', S => {
    S.space('hall', 0.7);
    gwWind(S, 0, 3.8, 0.18, 260, 800, 0.5);
    S.rumble({ dur: 3.8, f: 55, peak: 0.14, a: 1.4 });
    for (let i = 0; i < 5; i++) S.metal({ at: 0.8 + i * 0.12 + (i % 2) * 0.03, set: 'bar', f: 2500 + i * 190, dur: 0.45, peak: 0.045, strike: 0.2, pan: i % 2 ? 0.35 : -0.35 });
    gwHowl(S, 1.3, 2.6, 0.16, 170);
    gwBreath(S, 3.2, 0.9, 0.06, 1000);
    S.thud({ at: 3.55, f: 52, f1: 28, dur: 0.9, drive: 1.4, peak: 0.22 });
  });
  // ---- the hunts: the sniff and the low close breath are the family; each adds its own turn
  def('bm-garrow-on-the-scent', 'bm', S => {       // three sniffs, a thin cold note (the moon), the breath held, and the paws set as the trail locks
    S.space('hall', 0.35);
    gwSniff(S, 0.25, 0.22, -0.25); gwSniff(S, 0.75, 0.26, 0.25); gwSniff(S, 1.3, 0.18, 0, 0.85);
    S.glass({ at: 0.5, f: mf(96), dur: 2.6, peak: 0.05 });
    gwBreath(S, 1.9, 1.7, 0.16, 1100);
    S.rumble({ at: 1.2, dur: 2.6, f: 55, peak: 0.12, a: 1.2 });
    gwBreath(S, 3.5, 0.8, 0.07, 1700);
    S.thud({ at: 3.55, f: 60, f1: 34, dur: 0.5, drive: 1.3, peak: 0.16 });
  });
  def('bm-garrow-double-scent', 'bm', S => {      // two scents one after the other: a pair of sniffs on the left under a low note, a pair on the right a fifth above it
    S.space('hall', 0.35);
    gwSniff(S, 0.25, 0.2, -0.6); gwSniff(S, 0.65, 0.22, -0.6); S.glass({ at: 0.45, f: mf(88), dur: 1.8, peak: 0.055, pan: -0.5 });
    gwSniff(S, 1.45, 0.2, 0.6, 1.12); gwSniff(S, 1.85, 0.22, 0.6, 1.12); S.glass({ at: 1.65, f: mf(95), dur: 1.8, peak: 0.055, pan: 0.5 });
    gwBreath(S, 2.5, 1.5, 0.14, 1100, -0.3); gwBreath(S, 2.7, 1.5, 0.12, 1250, 0.3);
    S.rumble({ at: 1.5, dur: 2.4, f: 55, peak: 0.1, a: 1.0 });
    S.thud({ at: 3.55, f: 60, f1: 34, dur: 0.5, drive: 1.3, peak: 0.16 });
  });
  def('bm-garrow-doubling-back', 'bm', S => {     // the trail run there (the drumming and a rising sweep) and then the same trail back (mirrored), a single glass note at the turn
    S.space('hall', 0.35);
    gwSniff(S, 0.25, 0.22, -0.2); gwSniff(S, 0.75, 0.24, 0.2);
    gwBreath(S, 1.4, 1.2, 0.12, 1100);
    S.whoosh({ at: 2.4, color: 'pink', f: 500, f1: 2600, dur: 0.9, peakAt: 0.85, q: 1.1, peak: 0.12 });
    gwPaws(S, 2.4, 6, 0.14, 0.2, { pf: i => -0.6 + i * 0.24 });
    S.glass({ at: 3.35, f: mf(98), dur: 0.9, peak: 0.07 });
    gwPaws(S, 3.5, 6, 0.14, 0.2, { pf: i => 0.6 - i * 0.24 });
    S.whoosh({ at: 3.5, color: 'pink', f: 2600, f1: 500, dur: 0.9, peakAt: 0.15, q: 1.1, peak: 0.12 });
  });
  def('bm-garrow-buried-scent', 'bm', S => {      // two clean sniffs, then the flurry lands over the trail and the next two come muffled, as through snow
    S.space('hall', 0.35);
    gwSniff(S, 0.25, 0.22, -0.2); gwSniff(S, 0.7, 0.22, 0.2);
    gwWind(S, 1.0, 2.2, 0.13, 500, 1800, 0.55);
    S.noise({ at: 1.5, color: 'brown', lp: 320, dur: 1.8, pts: [[0.7, 1], [1.8, 0]], peak: 0.12 });
    [[1.6, 0.14, -0.3], [2.3, 0.1, 0.3]].forEach(([at, pk, pan]) => S.noise({ at, color: 'pink', bp: 600, bp1: 900, q: 0.9, lp: 900, dur: 0.3, pts: [[0.1, 1], [0.3, 0]], peak: pk, pan }));
    S.glass({ at: 3.6, f: mf(90), dur: 1.0, peak: 0.04 });
  });
  def('bm-garrow-the-whole-trail', 'bm', S => {   // the snow has stopped: one long slow draw, and the whole line walked back step by step, low and sparse
    S.space('hall', 0.45);
    gwBreath(S, 0.2, 2.4, 0.15, 900);
    S.rumble({ dur: 5.8, f: 50, peak: 0.12, a: 2.0 });
    gwPaws(S, 1.4, 10, 0.4, 0.13, { f: 70, pf: (i, n) => -0.5 + i / (n - 1) });
    S.glass({ at: 1.4, f: mf(84), dur: 4.4, peak: 0.04 });
    gwBreath(S, 4.8, 1.4, 0.07, 800);
  });
  def('bm-garrow-the-second-hound', 'bm', S => {  // the same sniffs and a hollow second set, lower and far off, a beat behind: a shade takes a scent too
    S.space('hall', 0.45);
    gwSniff(S, 0.25, 0.2, -0.2); gwSniff(S, 0.75, 0.2, 0.2);
    gwSniff(S, 0.55, 0.12, -0.7, 0.7); gwSniff(S, 1.05, 0.12, 0.7, 0.7);
    S.partials({ at: 0.9, set: 'glass', f: mf(79), dur: 3.0, beat: 2.5, peak: 0.07, am: [5, 0.3] });
    S.voice({ at: 1.4, f: 120, f1: 105, dur: 1.6, vowel: 'u', breath: 5, lp: 1200, peak: 0.05 });
    gwBreath(S, 2.0, 1.6, 0.12, 1100); gwBreath(S, 2.3, 1.5, 0.07, 700, 0.5);
    S.thud({ at: 3.55, f: 58, f1: 32, dur: 0.5, drive: 1.3, peak: 0.14 });
  });
  def('bm-garrow-stillness', 'bm', S => {         // one sniff and a breath, and then everything holds: a single cold note and almost nothing under it
    S.space('hall', 0.5);
    gwSniff(S, 0.25, 0.2, 0);
    gwBreath(S, 0.8, 1.0, 0.1, 1200);
    S.glass({ at: 1.9, f: mf(100), dur: 3.6, peak: 0.07, am: [6, 0.25] });
    S.partials({ at: 1.95, set: 'glass', f: mf(88), dur: 3.4, peak: 0.04 });
    S.tone({ at: 2.0, f: mf(52), dur: 3.0, a: 1.2, lp: 300, peak: 0.05 });
    S.crack({ at: 3.6, peak: 0.06, dur: 0.1, f: 3000 });
  });
  // ---- the rest of his kit
  def('bm-garrow-throat-snap', 'bm', S => {       // a breath drawn, the silver chain shifting, the jaws parting with a dry click, and the close on cold air
    S.space('hall', 0.35);
    gwBreath(S, 0.3, 1.3, 0.14, 1000);
    for (let i = 0; i < 3; i++) S.metal({ at: 1.5 + i * 0.35, set: 'bar', f: 3000 + i * 260, dur: 0.3, peak: 0.04, strike: 0.2, pan: i % 2 ? 0.3 : -0.3 });
    S.wood({ at: 2.6, f: 900, dur: 0.06, peak: 0.22 });
    S.whoosh({ at: 2.9, color: 'pink', f: 300, f1: 1600, dur: 0.3, peakAt: 0.9, peak: 0.2 });
    S.crack({ at: 3.3, peak: 0.34, dur: 0.18, f: 1500 });
    S.wood({ at: 3.3, f: 520, dur: 0.12, peak: 0.45 });
    S.thud({ at: 3.3, f: 82, f1: 38, dur: 0.6, drive: 2.2, peak: 0.5 });
  });
  def('bm-garrow-howl', 'bm', S => {              // the howl across the frozen lake: one long clean note and the lake's own answer
    S.space('hall', 0.55);
    gwHowl(S, 0.2, 4.0, 0.3, 190);
    gwWind(S, 0, 4.4, 0.06, 200, 500, 0.5);
    S.rumble({ at: 0.2, dur: 4.0, f: 60, peak: 0.12, a: 1.0 });
  });
  def('bm-garrow-rime', 'bm', S => {              // the draw, then a breath of frost out toward two of them (one either side), crystals hissing in it
    S.space('hall', 0.4);
    gwBreath(S, 0.3, 1.0, 0.1, 1300);
    S.whoosh({ at: 1.2, color: 'pink', f: 1500, f1: 4200, dur: 2.6, peakAt: 0.5, q: 1.0, peak: 0.22, pan: -0.55 });
    S.whoosh({ at: 1.5, color: 'pink', f: 1300, f1: 3600, dur: 2.6, peakAt: 0.5, q: 1.0, peak: 0.2, pan: 0.55 });
    S.sizzle({ at: 1.4, dur: 2.4, hp: 6000, lp: 12000, pts: [[1.0, 1], [2.4, 0]], peak: 0.06 });
    for (let i = 0; i < 6; i++) S.glass({ at: 1.8 + i * 0.28, f: 3600 + ((i * 517) % 2400), dur: 0.5, peak: 0.035, pan: i % 2 ? 0.5 : -0.5 });
    S.glass({ at: 4.0, f: mf(100), dur: 1.4, peak: 0.06 });
  });
  def('bm-garrow-mist-hounds', 'bm', S => {       // almost silent: a stir of mist, a patter of paws in pairs out to either side, a thin whisper, a soft settling
    S.space('hall', 0.3);
    S.noise({ color: 'pink', bp: 700, bp1: 1300, q: 0.8, lp: 2400, dur: 3.0, pts: [[1.4, 0.6], [3.0, 0]], peak: 0.1 });
    for (let i = 0; i < 8; i++) gwPaws(S, 0.5 + i * 0.3, 2, 0.1, 0.07, { f: 110, pan: i % 2 ? 0.7 : -0.7 });
    S.noise({ at: 0.9, color: 'white', hp: 3500, bp: 5200, q: 1.5, dur: 1.2, pts: [[0.5, 1], [1.2, 0]], peak: 0.05 });
    S.glass({ at: 2.2, f: mf(88), dur: 1.2, peak: 0.03 });
    S.thud({ at: 2.9, f: 60, f1: 40, dur: 0.4, peak: 0.1, click: 0, lp: 300 });
  });
  def('bm-garrow-circle-the-prey', 'bm', S => {   // he trots a ring round the party: the drumming goes round the listener, and the ring's note rises as it closes
    S.space('hall', 0.4);
    gwBreath(S, 0.3, 0.9, 0.08, 1100);
    gwPaws(S, 0.8, 15, 0.27, 0.2, { f: 100, pf: (i, n) => Math.sin(i / n * Math.PI * 2) * 0.8 });
    S.rumble({ at: 0.8, dur: 4.2, f: 60, peak: 0.1, a: 2 });
    gwWind(S, 3.4, 1.8, 0.08, 600, 1800, 0.85);
    S.glass({ at: 4.7, f: mf(95), dur: 1.2, peak: 0.06 }); S.glass({ at: 4.75, f: mf(88), dur: 1.2, peak: 0.05 });
  });
  def('bm-garrow-snowdrift', 'bm', S => {         // a flurry sweeping the lake: wind and hiss swelling to the moment it wipes every track, a thin whistle in the gusts
    S.space('hall', 0.35);
    gwWind(S, 0, 4.0, 0.3, 350, 2600, 0.88);
    S.rumble({ at: 0.6, dur: 3.4, f: 90, peak: 0.16, a: 2.4 });
    S.tone({ at: 0.8, f: 900, f1: 1500, dur: 3.0, a: 1.6, peak: 0.018, am: [0.9, 0.8], lp: 2000 });
  });
  def('bm-garrow-the-long-chase', 'bm', S => {    // he has gone into the white: wind low and wide, one far howl, a few paws far off, a breath
    S.space('hall', 0.5);
    gwWind(S, 0, 9.0, 0.16, 260, 900, 0.3);
    gwWind(S, 5.0, 4.5, 0.12, 300, 1100, 0.4);
    gwHowl(S, 1.0, 3.0, 0.09, 150, 0.5);
    gwPaws(S, 4.6, 5, 0.2, 0.05, { f: 80, fade: 1 });
    S.rumble({ dur: 9.5, f: 50, peak: 0.12, a: 3.0 });
    gwBreath(S, 8.0, 1.6, 0.06, 900);
  });
  def('bm-garrow-cold-trail', 'bm', S => {        // the enrage: the wind building over the whole lake, a vast low howl, then the lake goes quiet and one long crack runs under it
    S.space('hall', 0.8);
    gwWind(S, 0, 7.4, 0.28, 120, 1100, 0.88);
    S.pad({ notes: [mf(34), mf(41)], dur: 7.6, type: 'sine', det: 5, lpEnv: [200, 600, 200, 5], peak: 0.1 });
    gwHowl(S, 1.0, 5.0, 0.26, 120, 0.5);
    S.rumble({ dur: 7.6, f: 45, peak: 0.22, a: 4 });
    S.crack({ at: 7.5, peak: 0.3, dur: 0.4, f: 900 });
    S.thud({ at: 7.5, f: 40, f1: 20, dur: 1.4, drive: 3, peak: 0.7 });
    S.crackle({ at: 7.5, dens: 2.5, f: 3600, dur: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.2 });
    S.glass({ at: 7.55, f: mf(100), dur: 2.4, peak: 0.07 });
  });
  // ---- the moments (sound-hooks.js reads them off the room)
  def('bm-garrow-m-scent', 'bm', S => {           // the scent taken: a low, close breath and one thin note
    S.space('hall', 0.3);
    gwBreath(S, 0, 0.8, 0.2, 800);
    S.thud({ at: 0.05, f: 58, f1: 36, dur: 0.5, click: 0, lp: 300, peak: 0.22 });
    S.glass({ at: 0.1, f: mf(96), dur: 1.0, peak: 0.05 });
  });
  def('bm-garrow-m-hound-scent', 'bm', S => {     // a hound has your scent: a whisper of paws
    gwPaws(S, 0, 4, 0.1, 0.1, { f: 110, fade: 1, pan: 0 });
    S.noise({ color: 'white', hp: 3500, bp: 5200, q: 1.5, dur: 0.5, pts: [[0.2, 1], [0.5, 0]], peak: 0.05 });
  });
  def('bm-garrow-m-still-mark', 'bm', S => {      // asked to be still: a held thin note and a tick of ice
    S.glass({ f: mf(100), dur: 1.4, peak: 0.07, am: [6, 0.25] });
    S.crack({ at: 0.02, peak: 0.05, dur: 0.08, f: 3000 });
  });
  def('bm-garrow-m-lock', 'bm', S => {            // the trail lighting end to end: a thin bright line drawn across the ice and its ring
    S.space('hall', 0.4);
    S.whoosh({ color: 'pink', f: 1200, f1: 5200, dur: 0.55, peakAt: 0.9, q: 1.4, peak: 0.16 });
    S.glass({ at: 0.45, f: mf(96), dur: 1.0, peak: 0.08 });
    S.glass({ at: 0.5, f: mf(103), dur: 0.8, peak: 0.04 });
  });
  def('bm-garrow-m-run-start', 'bm', S => {       // he pushes off: a puff of snow and one low thump
    S.noise({ color: 'pink', lp: 900, dur: 0.2, pts: [[0.03, 1], [0.2, 0]], peak: 0.2 });
    S.thud({ f: 70, f1: 38, dur: 0.25, click: 0, lp: 360, peak: 0.4 });
    S.whoosh({ at: 0.05, color: 'pink', f: 400, f1: 1500, dur: 0.25, peakAt: 0.5, peak: 0.1 });
  });
  def('bm-garrow-m-run', 'bm', S => {             // a rush along the snow: a hiss of air and a few quick soft footfalls
    S.whoosh({ color: 'pink', f: 500, f1: 1800, dur: 0.4, peakAt: 0.45, q: 1.0, peak: 0.16 });
    gwPaws(S, 0.02, 3, 0.09, 0.2, { f: 100, pan: 0 });
  });
  def('bm-garrow-m-pounce', 'imp', S => {         // landing: a flump of snow, a crisp crunch, a snap of air
    S.space('hall', 0.25);
    S.thud({ f: 78, f1: 34, dur: 0.4, drive: 1.6, click: 0.15, lp: 700, peak: 0.55 });
    S.noise({ at: 0.01, color: 'pink', lp: 1100, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.25 });
    S.noise({ at: 0.02, color: 'white', hp: 3000, lp: 8000, dur: 0.14, pts: [[0.01, 1], [0.14, 0]], peak: 0.12, grain: 0.7 });
    S.crack({ at: 0.01, peak: 0.12, dur: 0.1, f: 2000 });
  });
  def('bm-garrow-m-pounce-wide', 'imp', S => {    // a hero fallen on: the same landing, heavy and wide, the snow blown out in a ring
    S.space('hall', 0.45);
    S.thud({ f: 52, f1: 24, dur: 0.9, drive: 2.6, click: 0.15, lp: 600, peak: 0.8 });
    S.noise({ at: 0.02, color: 'brown', bp: 300, bp1: 120, q: 0.8, dur: 1.0, pts: [[0.05, 1], [1.0, 0]], peak: 0.4 });
    S.noise({ at: 0.03, color: 'pink', hp: 2500, lp: 9000, dur: 0.9, pts: [[0.06, 1], [0.9, 0]], peak: 0.16, grain: 0.7 });
    S.rumble({ at: 0.05, dur: 1.2, f: 60, peak: 0.3, a: 0.05 });
    S.crack({ at: 0.01, peak: 0.16, dur: 0.14, f: 1800 });
  });
  def('bm-garrow-m-still-burst', 'imp', S => {    // Stillness bursts: the walked steps going off along a line, a quick run of ice snaps
    S.space('hall', 0.3);
    for (let i = 0; i < 6; i++) gwIce(S, i * 0.045, 0.2 - i * 0.015, 2200 + i * 260, (i % 2 ? 0.4 : -0.4));
    S.thud({ f: 64, f1: 30, dur: 0.5, drive: 2, peak: 0.45 });
  });
  def('bm-garrow-m-ring-burst', 'imp', S => {     // the ring of his track bursting: cracks all round the listener, a low boom under them
    S.space('hall', 0.45);
    for (let i = 0; i < 10; i++) gwIce(S, i * 0.03, 0.2, 1900 + ((i * 421) % 1800), Math.sin(i / 10 * Math.PI * 2) * 0.85);
    S.thud({ f: 56, f1: 26, dur: 0.9, drive: 2.4, peak: 0.6 });
    S.rumble({ at: 0.02, dur: 1.1, f: 70, peak: 0.25, a: 0.04 });
    S.whoosh({ color: 'pink', f: 3000, f1: 700, dur: 0.6, peakAt: 0.1, peak: 0.1 });
  });
  def('bm-garrow-m-rime-land', 'imp', S => {      // the breath of frost lands: a soft burst of cold air, crystals tinkling down, the mist settling
    S.space('hall', 0.4);
    S.noise({ color: 'pink', bp: 3000, bp1: 1400, q: 0.9, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.22 });
    S.thud({ f: 70, f1: 34, dur: 0.35, click: 0, lp: 500, peak: 0.4 });
    for (let i = 0; i < 6; i++) S.glass({ at: 0.04 + i * 0.07, f: 2800 + ((i * 631) % 2600), dur: 0.7, peak: 0.05, pan: Math.sin(i * 2.1) * 0.6 });
    S.sizzle({ at: 0.1, dur: 0.8, hp: 5000, lp: 11000, pts: [[0.05, 1], [0.8, 0]], peak: 0.05 });
  });
  def('bm-garrow-m-hound-spawn', 'bm', S => {     // a mist-hound gathering out of the mist: a whisper that swells, two soft paws
    S.noise({ color: 'pink', bp: 800, bp1: 1500, q: 0.8, lp: 2400, dur: 0.8, pts: [[0.4, 1], [0.8, 0]], peak: 0.1 });
    gwPaws(S, 0.45, 2, 0.12, 0.08, { f: 110, pan: 0 });
  });
  def('bm-garrow-m-hound-bite', 'imp', S => {     // a snap: teeth closing on cold air and a small puff of breath
    S.wood({ f: 1400, dur: 0.05, peak: 0.3 });
    S.crack({ at: 0.005, peak: 0.16, dur: 0.1, f: 2200 });
    S.noise({ at: 0.03, color: 'pink', bp: 1300, bp1: 800, q: 0.8, dur: 0.22, pts: [[0.05, 1], [0.22, 0]], peak: 0.1 });
    S.thud({ at: 0.01, f: 90, f1: 46, dur: 0.15, click: 0, lp: 500, peak: 0.25 });
  });
  def('bm-garrow-m-hound-fade', 'bm', S => {      // a hound fading by itself: the whisper thinning to nothing
    S.noise({ color: 'pink', bp: 900, bp1: 500, q: 0.8, lp: 1800, dur: 0.9, pts: [[0.15, 1], [0.9, 0]], peak: 0.08 });
    S.glass({ at: 0.05, f: mf(88), dur: 0.8, peak: 0.02 });
  });
  def('bm-garrow-m-hounds-meet', 'bm', S => {     // two hounds meeting head-on and going out together: two whispers drawn in from either side, a soft folding hush, a last small chime
    S.space('hall', 0.35);
    S.noise({ color: 'pink', bp: 1500, bp1: 700, q: 0.9, lp: 2400, dur: 0.6, pts: [[0.4, 1], [0.6, 0.6]], peak: 0.12, pan: -0.7 });
    S.noise({ color: 'pink', bp: 1400, bp1: 650, q: 0.9, lp: 2400, dur: 0.6, pts: [[0.4, 1], [0.6, 0.6]], peak: 0.12, pan: 0.7 });
    S.thud({ at: 0.5, f: 62, f1: 38, dur: 0.5, click: 0, lp: 260, peak: 0.28 });
    S.noise({ at: 0.5, color: 'pink', bp: 700, bp1: 300, q: 0.7, lp: 1200, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.14 });
    S.glass({ at: 0.55, f: mf(91), dur: 1.0, peak: 0.03 });
  });
  def('bm-garrow-m-mist-in', 'bm', S => {         // he goes into the mist: a breath drawn down and away, a faint run of chain links
    S.space('hall', 0.4);
    S.whoosh({ color: 'pink', f: 1500, f1: 400, dur: 0.8, peakAt: 0.2, q: 0.9, peak: 0.16 });
    for (let i = 0; i < 3; i++) S.metal({ at: 0.1 + i * 0.1, set: 'bar', f: 2900 - i * 220, dur: 0.3, peak: 0.035, strike: 0.2 });
    S.thud({ at: 0.3, f: 60, f1: 36, dur: 0.4, click: 0, lp: 260, peak: 0.16 });
  });
  def('bm-garrow-m-mist-out', 'bm', S => {        // he comes out of the mist: a breath swelling, the paws settling, a link of chain
    S.space('hall', 0.4);
    S.whoosh({ color: 'pink', f: 400, f1: 1300, dur: 0.9, peakAt: 0.7, q: 0.9, peak: 0.16 });
    gwPaws(S, 0.6, 2, 0.14, 0.12, { f: 80, pan: 0 });
    S.metal({ at: 0.7, set: 'bar', f: 2700, dur: 0.4, peak: 0.04, strike: 0.2 });
    S.thud({ at: 0.65, f: 56, f1: 32, dur: 0.5, click: 0, lp: 260, peak: 0.25 });
  });
  def('bm-garrow-m-ridge', 'imp', S => {          // a ridge of ice standing up along the line he ran: cracks climbing, a shove of ice, shards falling
    S.space('hall', 0.4);
    for (let i = 0; i < 4; i++) gwIce(S, i * 0.08, 0.22, 1600 + i * 500);
    S.whoosh({ color: 'pink', f: 300, f1: 2400, dur: 0.4, peakAt: 0.8, peak: 0.12 });
    S.thud({ at: 0.15, f: 60, f1: 28, dur: 0.7, drive: 2.2, peak: 0.5 });
    S.rumble({ at: 0.1, dur: 0.8, f: 80, peak: 0.2, a: 0.05 });
    for (let i = 0; i < 4; i++) S.glass({ at: 0.4 + i * 0.07, f: 3000 + ((i * 577) % 2200), dur: 0.6, peak: 0.03, pan: Math.sin(i * 2.4) * 0.6 });
  });
  def('bm-garrow-m-flurry', 'bm', S => {          // a flurry landing on a hunt (Buried Scent): wind and hiss building to the moment it wipes the tracks
    S.space('hall', 0.3);
    gwWind(S, 0, 2.6, 0.28, 500, 2600, 0.85);
    S.rumble({ at: 0.3, dur: 2.2, f: 90, peak: 0.12, a: 1.4 });
  });
  def('bm-garrow-m-wipe', 'bm', S => {            // the wipe: every footprint gone at once, a soft breath of air leaving and a sudden hush
    S.noise({ color: 'pink', lp: 1600, dur: 0.35, pts: [[0.03, 1], [0.35, 0]], peak: 0.2 });
    S.tone({ f: 70, f1: 36, dur: 0.6, a: 0.02, lp: 300, peak: 0.1 });
    S.glass({ at: 0.1, f: mf(88), dur: 0.9, peak: 0.02 });
  });
  def('bm-garrow-m-frost', 'bm', S => {           // Act III: the cold bites. Low and wide: a slow drone, a long fracture running under the lake, one ring held above it
    S.space('hall', 0.8);
    S.pad({ notes: [mf(31), mf(38)], dur: 4.2, type: 'sine', det: 5, lpEnv: [180, 500, 160, 2.4], peak: 0.12 });
    S.rumble({ dur: 4.0, f: 50, peak: 0.24, a: 1.4 });
    S.crackle({ at: 0.5, dens: 0.6, f: 1800, dur: 3.2, pts: [[0.8, 1], [1.8, 0.6], [3.2, 0]], peak: 0.14 });
    S.thud({ at: 1.2, f: 46, f1: 22, dur: 1.4, drive: 2.6, peak: 0.55 });
    S.glass({ at: 1.3, f: mf(88), dur: 2.8, peak: 0.06 });
  });
  def('bm-garrow-m-last', 'bm', S => {            // Act IV: the snow stops. The wind draws away to nothing, one low breath, and near silence
    S.space('hall', 0.7);
    S.whoosh({ color: 'pink', f: 1800, f1: 160, dur: 2.8, peakAt: 0.05, q: 0.8, peak: 0.22 });
    S.rumble({ dur: 3.4, f: 55, peak: 0.12, a: 0.3 });
    gwBreath(S, 2.0, 1.4, 0.05, 700);
    S.glass({ at: 3.0, f: mf(96), dur: 1.4, peak: 0.02 });
  });
  // the room's bed: the Long Mere at night, a thin wind across the snow, fine snow hissing, now and then a long low gust, the ice ticking far off
  loop('amb-garrow-mere', 'amb', L => {
    const wind = L.c(L.src('pink'), L.f('bandpass', 420, 0.5)), wg = L.g(0.4);
    L.lfo(wind.frequency, 0.047, 180); L.lfo(wind.frequency, 0.019, 110); L.lfo(wg.gain, 0.031, 0.25);
    L.c(wind, wg, L.out);
    const gust = L.c(L.src('brown', 0.8), L.f('lowpass', 260), L.g(0.3)); L.lfo(gust.gain, 0.017, 0.22); gust.connect(L.out);
    const hiss = L.c(L.src('white', 1.0), L.f('highpass', 5200), L.g(0.025)); L.lfo(hiss.gain, 0.061, 0.02); hiss.connect(L.out);
    const wh = L.c(L.src('pink', 0.6), L.f('bandpass', 1700, 14)), wn = L.g(0.03); L.lfo(wh.frequency, 0.037, 420); L.lfo(wn.gain, 0.05, 0.03); L.c(wh, wn, L.out);
    L.c(L.crackle(0.18), L.f('highpass', 3500), L.g(0.05), L.out);
  }, 3);

  // ============================================================================================== Vesper, the Mirror Knight (Season 2, boss XIV: the Argent Hall)
  // Steel, glass and a held breath. She never speaks, breathes or grunts: her voice is plate stepping on stone, a blade drawn along itself, the ring a struck blade leaves (two of them a hair
  // apart: the beat between a blade and its reflection) and, before a blow, the room drawing in and holding (a thin swell of air cut to nothing: the silence she fights in). The glass is the same
  // sound seen through a window: vsGlass(S) is the recipe's own toolkit run through a high-pass and a dulling filter, a little sharp, quieter and wetter, so what lands in the glass is the hall's
  // sound thinner, colder and farther off (pitched an octave up where it is a note); a move that lands in both rooms plays the sound and its glass answer a beat behind. The casts are the builds
  // and each ends on the held breath, never on a blow: a landing sounds from its telegraph tag, exactly on its beat (the m- cues, sound-hooks.js "vesper" block). The showpiece beats' cues
  // (bm-vesper-w-) are walls/vesper.js's.
  const vsGlass = (S, o = {}) => {                                // the recipe's toolkit seen through the glass: every call is high-passed, dulled, quieter, sharper and wetter
    const ctx = S.ctx, hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = o.hp || 700; hp.Q.value = 0.5;
    lp.type = 'lowpass'; lp.frequency.value = o.lp || 6000; lp.Q.value = 0.4;
    g.gain.value = o.gain == null ? 0.6 : o.gain;
    hp.connect(lp); lp.connect(g); g.connect(S.bus);
    const V = Object.create(S);
    Object.defineProperty(V, 'tail', { get: () => S.tail, set: v => { S.tail = v; } });
    V.k = S.k * st(o.pitch == null ? 2 : o.pitch); V.revDefault = Math.max(S.revDefault, 0.3) * 1.5; V.verbType = 'hall';
    for (const k in TOOLS) V[k] = q => TOOLS[k](V, Object.assign({ to: hp }, q));
    return V;
  };
  const vsInhale = (S, at, dur, pk, pan = 0) => {                 // the room draws in and holds: a thin swell of high air and a pressure under it, cut to nothing
    S.noise({ at, color: 'white', bp: 3800, bp1: 6800, q: 0.9, dur, pts: [[dur * 0.9, 1], [dur, 0]], peak: pk, pan });
    S.tone({ at, f: 82, dur, pts: [[dur * 0.9, 1], [dur, 0]], peak: pk * 0.5, lp: 260, pan });
  };
  const vsSing = (S, at, f, dur, pk, o = {}) => {                 // a swelling pure note, a pair a hair apart (a blade and its reflection) through a soft low-pass, held and let go
    const beat = o.beat == null ? 1.4 : o.beat, a = Math.min(o.a == null ? dur * 0.65 : o.a, dur * 0.9), f1 = o.f1, lp = o.lp || 2400;
    const pts = [[a, 1], [Math.max(a + 0.05, dur - 0.15), 0.85], [dur, 0]];
    S.tone({ at, f, f1, dur, pts, peak: pk, lp, pan: o.pan, vib: [5.2, 0.004, 0.4] });
    S.tone({ at, f: f + beat, f1: f1 ? f1 + beat : null, dur, pts, peak: pk * 0.8, lp, pan: o.pan });
    S.tone({ at, f: f * 2.01, f1: f1 ? f1 * 2.01 : null, dur, pts, peak: pk * 0.1, lp: 3600, pan: o.pan });
  };
  const vsRing = (S, at, f, dur, pk, pan = 0, beat = 1.6) => S.partials({ at, set: 'bar', f, dur, beat, peak: pk, spread: 5, strike: 0.2, pan });   // a struck blade: steel partials, the twin beating
  const vsDraw = (S, at, dur, pk, pan = 0, up = 1) => {           // steel along steel: a narrow band of air sweeping up (or down) with a fine grain in it
    S.noise({ at, color: 'white', bp: up ? 2600 : 6800, bp1: up ? 6800 : 2600, q: 4.5, dur, fd: dur, pts: [[dur * 0.2, 0.5], [dur * 0.85, 1], [dur, 0]], peak: pk, grain: 0.35, pan });
    S.noise({ at, color: 'pink', hp: 5000, dur, pts: [[dur * 0.85, 0.6], [dur, 0]], peak: pk * 0.15, pan });
  };
  const vsStep = (S, at, pk, pan = 0, f = 64) => {                // plate on stone: a low blow with a short dry rattle of steel on it
    S.thud({ at, f, f1: f * 0.52, dur: 0.3, click: 0.08, lp: 650, peak: pk, pan });
    S.noise({ at, color: 'white', hp: 2200, bp: 4300, q: 1.6, dur: 0.08, pts: [[0.008, 1], [0.08, 0]], peak: pk * 0.28, grain: 0.5, pan });
    S.metal({ at: at + 0.012, set: 'plate', f: 1750, dur: 0.2, peak: pk * 0.07, click: 0, pan });
  };
  const vsCut = (S, at, pk, pan = 0, f = 3800, f1 = 700, w = 0.4) => {   // a stroke of the blade: the air parted along it and a clean steel crack on the beat
    S.whoosh({ at, color: 'pink', f, f1, dur: w, peakAt: 0.25, q: 1.5, peak: pk * 0.55, pan });
    S.crack({ at, peak: pk * 0.3, dur: 0.12, f: 2600, pan });
  };
  // her entrance: the hall's own stone tone, three slow strides, the blade drawn and one long ring (the glass answers it a beat later, higher), and the held breath
  def('bm-vesper-intro', 'sting', S => {
    S.space('hall', 0.75); const G = vsGlass(S);
    S.rumble({ dur: 4.6, f: 48, peak: 0.12, a: 1.8 });
    S.pad({ notes: [mf(38), mf(45)], dur: 4.4, type: 'sine', det: 4, lpEnv: [200, 520, 200, 2.2], peak: 0.07 });
    [0.55, 1.25, 1.95].forEach((t, i) => vsStep(S, t, 0.2 + i * 0.03, -0.15 + i * 0.15, 66 + i * 4));
    vsDraw(S, 2.3, 0.9, 0.1, 0);
    vsRing(S, 3.1, mf(74), 3.0, 0.1, -0.2, 1.4);
    vsRing(G, 3.45, mf(86), 2.6, 0.08, 0.3, 1.1);
    vsInhale(S, 3.9, 0.9, 0.045);
  });
  // ---- the casts: builds, each ending on the held breath
  def('bm-vesper-the-hall', 'bm', S => {          // the act opens: the stone tone of the hall, two slow strides, the point of the blade set down and its ring answered from the glass
    S.space('hall', 0.8); const G = vsGlass(S);
    S.rumble({ dur: 3.2, f: 52, peak: 0.12, a: 1.4 });
    S.pad({ notes: [mf(38), mf(45)], dur: 3.1, type: 'sine', det: 4, lpEnv: [200, 480, 220, 1.6], peak: 0.07 });
    vsStep(S, 0.5, 0.2, -0.2, 64); vsStep(S, 1.3, 0.22, 0.2, 60);
    S.metal({ at: 1.9, set: 'bar', f: mf(81), dur: 1.6, peak: 0.06, strike: 0.3, beat: 1.2 });
    vsRing(G, 2.2, mf(93), 1.4, 0.07, 0.3, 1.2);
    vsInhale(S, 2.0, 1.0, 0.04);
  });
  def('bm-vesper-evenfall', 'bm', S => {          // the wide cone and its mirror image: the blade drawn out and brought round, the same draw from the glass a beat behind, a swelling pair of notes in each
    S.space('hall', 0.45); const G = vsGlass(S);
    vsDraw(S, 0.3, 1.3, 0.16, -0.35);
    vsDraw(G, 0.65, 1.2, 0.1, 0.35, 0);
    vsSing(S, 0.9, mf(74), 2.4, 0.07, { pan: -0.25 });
    vsSing(G, 1.2, mf(86), 2.2, 0.05, { pan: 0.3 });
    vsInhale(S, 2.5, 1.1, 0.045);
  });
  def('bm-vesper-twin-verdict', 'bm', S => {      // the tank's cut, in the hall and then the glass: a low heavy build, a stride, a deep note and its rumble held, then the glass draws its own breath a second on
    S.space('hall', 0.5); const G = vsGlass(S);
    vsStep(S, 0.6, 0.26, -0.1, 58);
    vsSing(S, 0.8, mf(50), 2.8, 0.1, { lp: 900, beat: 1.0, f1: mf(52) });
    S.rumble({ at: 0.6, dur: 3.2, f: 62, peak: 0.12, a: 1.6 });
    vsInhale(S, 2.9, 0.9, 0.05);
    vsInhale(G, 4.0, 1.0, 0.07, 0.3);
  });
  def('bm-vesper-lay-glass', 'bm', S => {         // shards laid in the glass only: the hall stays quiet, and far off four thin notes are set down one by one, climbing, a fine hiss under them
    S.space('hall', 0.55); const G = vsGlass(S, { gain: 0.8 });
    S.rumble({ dur: 3.8, f: 50, peak: 0.07, a: 1.8 });
    [0.7, 1.35, 1.95, 2.45].forEach((t, i) => {
      const pan = [-0.5, 0.4, -0.15, 0.6][i];
      G.glass({ at: t, f: mf(88 + [0, 3, 5, 8][i]), dur: 1.8, peak: 0.07, pan }); G.crack({ at: t, peak: 0.05, dur: 0.06, f: 3200, pan });
    });
    G.sizzle({ at: 0.6, dur: 3.0, hp: 6000, lp: 12000, pts: [[2.0, 1], [3.0, 0]], peak: 0.03 });
    vsInhale(G, 3.0, 1.1, 0.06, 0.2);
  });
  def('bm-vesper-ring-true', 'bm', S => {         // both blades struck on the wall: two notes a hair apart rising together, the glass pair a beat behind and sharper
    S.space('hall', 0.6); const G = vsGlass(S);
    vsSing(S, 0.3, mf(62), 3.4, 0.09, { f1: mf(69), beat: 1.6, pan: -0.2 });
    vsSing(G, 0.6, mf(74), 3.2, 0.06, { f1: mf(81), beat: 2.4, pan: 0.3 });
    S.rumble({ dur: 4.0, f: 56, peak: 0.1, a: 2.0 });
    vsInhale(S, 3.6, 0.7, 0.05);
  });
  def('bm-vesper-out-of-step', 'bm', S => {       // she steps half a pace out of line: a stride, a second a hair late from the glass, and the pair of notes drifting apart (the beat widening)
    S.space('hall', 0.6); const G = vsGlass(S);
    S.rumble({ dur: 3.0, f: 52, peak: 0.1, a: 1.2 });
    vsStep(S, 0.45, 0.22, -0.15, 62); vsStep(S, 1.15, 0.2, -0.15, 62); vsStep(G, 1.34, 0.14, 0.4, 62);
    S.tone({ at: 0.5, f: mf(70), dur: 2.4, pts: [[1.2, 1], [2.2, 0.8], [2.4, 0]], peak: 0.06, lp: 2200, pan: -0.2 });
    G.tone({ at: 0.8, f: mf(82), f1: mf(82) * 1.012, dur: 2.2, pts: [[1.1, 1], [2.0, 0.8], [2.2, 0]], peak: 0.06, lp: 3000, pan: 0.3 });
    vsInhale(S, 2.2, 0.8, 0.035);
  });
  def('bm-vesper-counterpoint', 'bm', S => {      // two voices in contrary motion: a low close note rising in the hall as a high thin one falls from the glass, passing in the middle, both held
    S.space('hall', 0.55); const G = vsGlass(S);
    vsSing(S, 0.3, mf(50), 3.8, 0.09, { f1: mf(62), beat: 1.0, lp: 1100, pan: -0.25 });
    vsSing(G, 0.3, mf(98), 3.8, 0.05, { f1: mf(86), beat: 2.0, pan: 0.3 });
    S.rumble({ dur: 4.2, f: 54, peak: 0.08, a: 2.2 });
    vsInhale(S, 3.7, 0.9, 0.05);
  });
  def('bm-vesper-cross-cut', 'bm', S => {         // two strokes that will cross: one drawn up in the hall as another is drawn down in the glass, the two bands of air passing each other
    S.space('hall', 0.45); const G = vsGlass(S);
    vsStep(S, 0.3, 0.16, 0, 64);
    vsDraw(S, 0.8, 1.4, 0.3, -0.5, 1);
    vsDraw(G, 0.8, 1.4, 0.22, 0.5, 0);
    vsRing(S, 2.3, mf(79), 1.4, 0.05, -0.3, 1.8);
    vsInhale(S, 3.1, 1.0, 0.045);
  });
  def('bm-vesper-silver-thread', 'bm', S => {     // a thread drawn out between her and the glass: one thin note stretching upward, fine ticks as it tightens, the silver hiss of it running, then held taut
    S.space('hall', 0.5);
    S.tone({ at: 0.4, f: mf(88), f1: mf(94), dur: 4.4, pts: [[3.6, 1], [4.2, 0.9], [4.4, 0]], peak: 0.05, lp: 4000, vib: [6, 0.003, 1.0] });
    S.noise({ at: 0.5, color: 'white', bp: 7200, q: 3, dur: 3.6, pts: [[2.8, 1], [3.6, 0]], peak: 0.04 });
    [1.0, 1.8, 2.4, 2.9, 3.3, 3.6].forEach((t, i) => S.metal({ at: t, set: 'bar', f: 3300 + i * 190, dur: 0.14, peak: 0.03, strike: 0.2, pan: i % 2 ? 0.4 : -0.4 }));
    vsStep(S, 0.3, 0.12, 0, 66);
    vsInhale(S, 3.9, 0.7, 0.035);
  });
  def('bm-vesper-through-the-glass', 'bm', S => { // the wall begins: the glass draws in, a long inward sweep over a low chord, three notes sinking through it, the held breath
    S.space('hall', 0.75); const G = vsGlass(S);
    S.whoosh({ at: 0.2, color: 'pink', f: 5200, f1: 500, dur: 2.8, peakAt: 0.7, q: 1.0, peak: 0.16 });
    S.pad({ notes: [mf(38), mf(45), mf(50)], dur: 3.3, type: 'sine', det: 4, lpEnv: [200, 560, 240, 1.8], peak: 0.08 });
    [[1.4, 98], [1.9, 93], [2.4, 86]].forEach(([t, m]) => G.glass({ at: t, f: mf(m), dur: 1.6, peak: 0.06 }));
    vsInhale(S, 2.6, 0.8, 0.04);
  });
  def('bm-vesper-shared-reflection', 'bm', S => { // two must stand together: a pair of notes a little apart, one either side, closing to a single unison, the glass a soft answer above
    S.space('hall', 0.55); const G = vsGlass(S);
    S.tone({ at: 0.3, f: mf(69) * 1.035, f1: mf(69), glide: 3.6, dur: 4.4, pts: [[1.2, 1], [3.8, 1], [4.2, 0.9], [4.4, 0]], peak: 0.06, lp: 2200, pan: -0.5 });
    S.tone({ at: 0.3, f: mf(69) / 1.035, f1: mf(69), glide: 3.6, dur: 4.4, pts: [[1.2, 1], [3.8, 1], [4.2, 0.9], [4.4, 0]], peak: 0.06, lp: 2200, pan: 0.5 });
    G.tone({ at: 1.0, f: mf(81), dur: 3.4, pts: [[1.2, 1], [3.0, 0.7], [3.4, 0]], peak: 0.03, lp: 3000, pan: 0.2 });
    S.rumble({ dur: 4.6, f: 50, peak: 0.06, a: 2.2 });
    vsInhale(S, 4.0, 0.7, 0.03);
  });
  def('bm-vesper-hairline-fracture', 'bm', S => { // a hairline crack drawn across the glass: small cracks running across the room with a thin ring each, a fine crackle along them, the held breath
    S.space('hall', 0.5); const G = vsGlass(S);
    for (let i = 0; i < 9; i++) { const pan = -0.8 + i * 0.2; G.crack({ at: 0.4 + i * 0.27, peak: 0.05, dur: 0.05, f: 3400, pan }); G.glass({ at: 0.4 + i * 0.27, f: 3000 + i * 260, dur: 0.5, peak: 0.035, pan }); }
    G.crackle({ at: 0.4, dens: 0.8, f: 3200, dur: 2.4, pts: [[0.8, 1], [2.4, 0]], peak: 0.06 });
    vsInhale(S, 2.5, 0.6, 0.035);
  });
  def('bm-vesper-the-mirror-turns', 'bm', S => {  // the mirror begins to turn: a deep slow grind rising a fifth, air swept past on one side and then the other, three glass notes climbing; no blow at the end
    S.space('hall', 0.8); const G = vsGlass(S);
    S.rumble({ dur: 3.6, f: 70, peak: 0.2, a: 1.8, am: [2.4, 0.4] });
    S.pad({ notes: [mf(33), mf(40)], dur: 3.6, type: 'sine', det: 5, bend: 7, lpEnv: [160, 620, 200, 2.4], peak: 0.12 });
    S.whoosh({ at: 0.4, color: 'pink', f: 300, f1: 2600, dur: 3.0, peakAt: 0.9, q: 1.0, peak: 0.1, pan: -0.5 });
    G.whoosh({ at: 0.9, color: 'pink', f: 500, f1: 3200, dur: 2.5, peakAt: 0.9, q: 1.0, peak: 0.08, pan: 0.5 });
    [[1.2, 86], [1.8, 91], [2.4, 98]].forEach(([t, m]) => G.glass({ at: t, f: mf(m), dur: 1.4, peak: 0.05 }));
    vsInhale(S, 2.9, 0.6, 0.035);
  });
  // the dance: a stately bed of its own (a slow chord rising a fifth, plate strides alternating hall and glass, a few quiet glass notes), the cuts themselves are the moments'; Trading Places is the same
  // dance after the knights have changed rooms: from its fourth stride the strides swap sides
  const vsDanceBed = (S, swap) => {
    S.space('hall', 0.6); const G = vsGlass(S);
    S.pad({ notes: [mf(50), mf(57)], dur: 9.0, type: 'sine', det: 4, bend: 5, lpEnv: [220, 700, 260, 6], peak: 0.07 });
    S.rumble({ dur: 9.2, f: 52, peak: 0.07, a: 3.0 });
    [0.5, 1.8, 3.1, 4.3, 5.5, 6.6, 7.6].forEach((t, i) => { const glass = (i % 2 === 1) !== (swap && i >= 3); (glass ? vsStep(G, t, 0.1, 0.35, 64) : vsStep(S, t, 0.12, -0.35, 62)); });
    [2.3, 3.6, 4.8, 5.9, 7.0].forEach((t, i) => G.glass({ at: t, f: mf(86 + [0, 2, 4, 7, 9][i]), dur: 1.4, peak: 0.03, pan: i % 2 ? 0.4 : -0.4 }));
    if (swap) { S.whoosh({ at: 4.4, color: 'pink', f: 900, f1: 4200, dur: 0.8, peakAt: 0.5, q: 1.2, peak: 0.07, pan: -0.5 }); G.whoosh({ at: 4.4, color: 'pink', f: 4200, f1: 900, dur: 0.8, peakAt: 0.5, q: 1.2, peak: 0.06, pan: 0.5 }); }
    vsInhale(S, 8.4, 0.7, 0.03);
  };
  def('bm-vesper-evenfall-dance', 'bm', S => vsDanceBed(S, false));
  def('bm-vesper-trading-places', 'bm', S => vsDanceBed(S, true));
  def('bm-vesper-the-line', 'bm', S => {          // she strides to the middle of the hall (four plate steps, the gaps lengthening), the glass dims, and everything holds; no blow at the end (the planting is the staged beat's)
    S.space('hall', 0.8); const G = vsGlass(S);
    S.rumble({ dur: 3.6, f: 48, peak: 0.1, a: 1.0 });
    [0.2, 0.62, 1.08, 1.58].forEach((t, i) => vsStep(S, t, 0.2 + i * 0.02, -0.05, 56 + i * 3));
    G.tone({ at: 0.3, f: mf(98), f1: mf(76), dur: 2.6, pts: [[0.3, 1], [2.4, 0.6], [2.6, 0]], peak: 0.05, lp: 4000 });
    S.tone({ at: 1.5, f: mf(38), dur: 2.0, a: 0.4, peak: 0.05, lp: 200 });
    vsInhale(S, 1.9, 1.3, 0.035);
  });
  def('bm-vesper-last-reflection', 'bm', S => {  // the enrage: every reflection in the hall ringing at once, a rising pair of notes in each room, glass notes multiplying faster and faster, a vast low swell, then the held breath and nothing
    S.space('hall', 0.85); const G = vsGlass(S);
    vsSing(S, 0.3, mf(62), 7.0, 0.1, { f1: mf(81), beat: 1.4, a: 5.5, pan: -0.2 });
    vsSing(G, 0.5, mf(74), 6.8, 0.06, { f1: mf(93), beat: 2.2, a: 5.5, pan: 0.3 });
    S.pad({ notes: [mf(38), mf(45), mf(50)], dur: 7.4, type: 'sine', det: 5, bend: 7, lpEnv: [180, 700, 220, 5.5], peak: 0.1 });
    S.rumble({ dur: 7.6, f: 46, peak: 0.2, a: 5 });
    let t = 1.0, gap = 0.9;
    for (let i = 0; i < 14; i++) { G.glass({ at: t, f: mf(86 + [0, 3, 7, 10, 12][i % 5]), dur: 1.6, peak: 0.045, pan: Math.sin(i * 2.1) * 0.6 }); t += gap; gap *= 0.86; }
    vsInhale(S, 6.9, 1.0, 0.07);
  });
  // ---- Hard and Extreme
  def('bm-vesper-double-glass', 'bm', S => {      // Lay Glass in both rooms: four thin notes set down in the glass, and in the hall a row of four slow, heavy strides laid across it, left to right
    S.space('hall', 0.55); const G = vsGlass(S, { gain: 0.8 });
    S.rumble({ dur: 4.2, f: 50, peak: 0.08, a: 2.0 });
    [0.8, 1.45, 2.05, 2.55].forEach((t, i) => { const pan = [0.5, -0.4, 0.2, -0.6][i]; G.glass({ at: t, f: mf(88 + [0, 3, 5, 8][i]), dur: 1.6, peak: 0.09, pan }); G.crack({ at: t, peak: 0.04, dur: 0.06, f: 3200, pan }); });
    [1.0, 1.55, 2.1, 2.65].forEach((t, i) => vsStep(S, t, 0.14, -0.7 + i * 0.47, 72 - i * 4));
    vsInhale(S, 3.5, 1.0, 0.055);
  });
  def('bm-vesper-two-threads', 'bm', S => {       // two threads, one and two: a thin note stretching up on the left, a fifth above it a second on the right, a single tick for the first and a pair for the second, held taut
    S.space('hall', 0.5);
    S.tone({ at: 0.4, f: mf(88), f1: mf(93), dur: 4.6, pts: [[3.8, 1], [4.4, 0.9], [4.6, 0]], peak: 0.045, lp: 4000, vib: [6, 0.003, 1.0], pan: -0.45 });
    S.tone({ at: 0.9, f: mf(95), f1: mf(100), dur: 4.1, pts: [[3.3, 1], [3.9, 0.9], [4.1, 0]], peak: 0.04, lp: 5000, vib: [7, 0.003, 1.0], pan: 0.45 });
    S.metal({ at: 0.4, set: 'bar', f: 3300, dur: 0.14, peak: 0.04, strike: 0.2, pan: -0.45 });
    S.metal({ at: 0.9, set: 'bar', f: 3900, dur: 0.14, peak: 0.04, strike: 0.2, pan: 0.45 }); S.metal({ at: 1.05, set: 'bar', f: 3900, dur: 0.14, peak: 0.035, strike: 0.2, pan: 0.45 });
    S.noise({ at: 0.6, color: 'white', bp: 7200, q: 3, dur: 3.8, pts: [[3.0, 1], [3.8, 0]], peak: 0.04 });
    vsStep(S, 0.3, 0.12, 0, 66);
    vsInhale(S, 4.2, 0.8, 0.035);
  });
  def('bm-vesper-hand-mirror', 'bm', S => {       // the Glass Knight throws a standing mirror: a stance, then a spinning whirr crossing the room and falling in pitch, a glass shimmer riding it; the landing is the moment's
    S.space('hall', 0.55); const G = vsGlass(S, { hp: 600 });
    vsStep(S, 0.2, 0.12, -0.1, 66);
    S.whoosh({ at: 0.35, color: 'pink', f: 2800, f1: 700, dur: 2.2, peakAt: 0.5, q: 1.6, peak: 0.2, am: [14, 0.7], pan: -0.25 });
    G.glass({ at: 0.6, f: mf(93), dur: 2.0, peak: 0.08, am: [14, 0.6], pan: 0.3 });
    vsInhale(S, 2.0, 0.6, 0.035);
  });
  def('bm-vesper-backhand', 'bm', S => {          // a cross-cut that changes sides: the stroke drawn up on the left, held, and drawn again from the right (the glass), the breath after it; the change itself is the moment's
    S.space('hall', 0.45); const G = vsGlass(S);
    vsStep(S, 0.3, 0.16, -0.2, 64);
    vsDraw(S, 0.6, 1.5, 0.28, -0.55, 1);
    vsDraw(G, 3.7, 1.3, 0.22, 0.55, 0);
    vsDraw(S, 3.9, 1.2, 0.22, 0.5, 1);
    vsRing(S, 2.4, mf(79), 1.2, 0.04, -0.4, 1.8);
    vsInhale(S, 4.9, 0.7, 0.045);
  });
  def('bm-vesper-through-the-glass-again', 'bm', S => {   // the glass lets go of one and takes the other: two notes crossing, one rising as one falls, a thin glass tick as they pass
    S.space('hall', 0.6); const G = vsGlass(S);
    S.tone({ at: 0.3, f: mf(62), f1: mf(74), dur: 2.6, pts: [[1.2, 1], [2.2, 0.8], [2.6, 0]], peak: 0.07, lp: 2000, pan: -0.5 });
    S.tone({ at: 0.3, f: mf(74), f1: mf(62), dur: 2.6, pts: [[1.2, 1], [2.2, 0.8], [2.6, 0]], peak: 0.07, lp: 2000, pan: 0.5 });
    G.glass({ at: 1.5, f: mf(93), dur: 1.0, peak: 0.07 });
    S.rumble({ dur: 2.8, f: 50, peak: 0.07, a: 1.4 });
    vsInhale(S, 2.3, 0.6, 0.035);
  });
  def('bm-vesper-lagging-glass', 'bm', S => {     // the twin that is a step behind: a struck note and its late echo, a second note, its late echo again, each repeat lower than the last
    S.space('hall', 0.5); S.echo({ time: 0.72, fb: 0.5, lp: 2200, kill: 5.2 });
    S.partials({ at: 0.4, set: 'bar', f: mf(74), dur: 1.8, beat: 1.4, peak: 0.12, strike: 0.2, ech: 0.8 });
    S.partials({ at: 1.5, set: 'bar', f: mf(81), dur: 1.6, beat: 1.4, peak: 0.1, strike: 0.2, ech: 0.8 });
    S.glass({ at: 2.1, f: mf(93), dur: 1.4, peak: 0.05, ech: 0.9 });
    vsInhale(S, 2.3, 0.7, 0.035);
  });
  def('bm-vesper-wrong-hand', 'bm', S => {        // the twin raises the wrong hand: a warm low note on the left and a tritone clashing softly on the right, a wooden tap on one side and then, wrongly, the other
    S.space('hall', 0.5); const G = vsGlass(S);
    S.tone({ at: 0.3, f: mf(57), dur: 2.6, pts: [[1.0, 1], [2.2, 0.8], [2.6, 0]], peak: 0.08, lp: 700, pan: -0.5 });
    S.tone({ at: 0.5, f: mf(63), dur: 2.4, pts: [[1.0, 1], [2.0, 0.8], [2.4, 0]], peak: 0.045, lp: 900, pan: 0.5 });
    S.wood({ at: 0.6, f: 520, dur: 0.09, peak: 0.2, pan: -0.5 }); S.wood({ at: 1.0, f: 520, dur: 0.09, peak: 0.2, pan: 0.5 });
    G.glass({ at: 1.3, f: mf(87), dur: 1.2, peak: 0.05, pan: 0.3 });
    vsInhale(S, 2.2, 0.7, 0.035);
  });
  // ---- the moments (sound-hooks.js reads them off the room; every one begins on its beat)
  def('bm-vesper-m-fracture', 'bm', S => {        // the twin is struck: a hairline crack runs through the glass, a few shards ring and fall, and a dull blow lands on the body
    S.space('hall', 0.4); const G = vsGlass(S);
    S.thud({ f: 84, f1: 44, dur: 0.3, click: 0, lp: 420, peak: 0.28 });
    G.crack({ peak: 0.2, dur: 0.12, f: 3000 });
    G.glass({ at: 0.02, f: mf(95), dur: 1.0, peak: 0.1 });
    for (let i = 0; i < 4; i++) G.glass({ at: 0.08 + i * 0.07, f: 3300 + ((i * 577) % 2600), dur: 0.5, peak: 0.04, pan: i % 2 ? 0.5 : -0.5 });
  });
  def('bm-vesper-m-shard', 'bm', S => {           // a shard falling in the glass, far off: a thin crack, a bright ring and a few small pieces
    S.space('hall', 0.5); const G = vsGlass(S, { gain: 0.8 });
    G.crack({ peak: 0.22, dur: 0.1, f: 3200 });
    G.glass({ at: 0.01, f: 3100, dur: 1.0, peak: 0.14 });
    for (let i = 0; i < 3; i++) G.glass({ at: 0.06 + i * 0.06, f: 4200 + ((i * 733) % 2400), dur: 0.4, peak: 0.035, pan: i % 2 ? 0.5 : -0.5 });
    S.thud({ f: 82, f1: 46, dur: 0.2, click: 0, lp: 380, peak: 0.08 });
  });
  def('bm-vesper-m-shard-hall', 'bm', S => {      // a shard of Double Glass in the hall itself: heavier, a low blow, a crack on the stone, steel ringing under glass
    S.space('hall', 0.45); const G = vsGlass(S);
    S.thud({ f: 70, f1: 36, dur: 0.5, drive: 1.6, click: 0.15, lp: 700, peak: 0.45 });
    S.crack({ peak: 0.2, dur: 0.12, f: 1800 });
    S.glass({ at: 0.01, f: 1800, dur: 0.8, peak: 0.1 });
    S.metal({ at: 0.02, set: 'plate', f: 900, dur: 0.6, peak: 0.07, click: 0 });
    for (let i = 0; i < 3; i++) G.glass({ at: 0.08 + i * 0.07, f: 3600 + ((i * 611) % 2200), dur: 0.5, peak: 0.03, pan: i % 2 ? 0.5 : -0.5 });
  });
  def('bm-vesper-m-evenfall', 'imp', S => {       // the wide cone lands in both rooms: a low blow, a wide stroke of air and its ring, and the glass's stroke a beat behind, thinner and from the other side
    S.space('hall', 0.45); const G = vsGlass(S);
    S.thud({ f: 66, f1: 32, dur: 0.8, drive: 1.8, peak: 0.5 });
    S.crack({ peak: 0.22, dur: 0.14, f: 2400 });
    S.whoosh({ color: 'pink', f: 4200, f1: 700, dur: 0.6, peakAt: 0.15, q: 1.4, peak: 0.26, pan: -0.5 });
    vsRing(S, 0.02, mf(62), 1.8, 0.2, -0.1, 1.8);
    G.whoosh({ at: 0.2, color: 'pink', f: 3800, f1: 900, dur: 0.5, peakAt: 0.15, q: 1.4, peak: 0.16, pan: 0.5 });
    G.crack({ at: 0.2, peak: 0.12, dur: 0.1, f: 2600, pan: 0.3 });
    vsRing(G, 0.22, mf(74), 1.6, 0.12, 0.35, 1.8);
  });
  def('bm-vesper-m-verdict', 'imp', S => {        // the tank's cut in the hall: the heaviest blow of hers, a deep blow with a low ring of steel under it and a stroke of air
    S.space('hall', 0.5);
    S.thud({ f: 56, f1: 26, dur: 1.0, drive: 2.4, peak: 0.6 });
    S.crack({ peak: 0.3, dur: 0.14, f: 1500 });
    S.whoosh({ color: 'pink', f: 3200, f1: 500, dur: 0.4, peakAt: 0.1, q: 1.4, peak: 0.2 });
    vsRing(S, 0.02, mf(55), 2.2, 0.22, 0, 1.4);
    S.rumble({ at: 0.02, dur: 0.9, f: 66, peak: 0.25, a: 0.04 });
  });
  def('bm-vesper-m-verdict-glass', 'imp', S => { // the second cut of Twin Verdict, from the glass: a small blow far under it, a thin crack and a high ring; lighter than the first
    S.space('hall', 0.6); const G = vsGlass(S);
    S.thud({ f: 62, f1: 32, dur: 0.5, click: 0, lp: 380, peak: 0.25 });
    G.crack({ peak: 0.22, dur: 0.12, f: 2200 });
    G.whoosh({ color: 'pink', f: 3600, f1: 800, dur: 0.4, peakAt: 0.1, q: 1.4, peak: 0.12 });
    vsRing(G, 0.02, mf(67), 1.8, 0.14, 0.3, 1.6);
  });
  def('bm-vesper-m-counter', 'imp', S => {        // Vesper's close ring burst round her: a blow, a ring of air thrown outward and falling away, a low ring of steel
    S.space('hall', 0.45);
    S.thud({ f: 60, f1: 28, dur: 0.9, drive: 2.0, peak: 0.5 });
    S.noise({ color: 'pink', bp: 3200, bp1: 500, q: 0.8, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.28 });
    vsRing(S, 0.02, mf(57), 1.8, 0.16, 0, 1.6);
    S.crack({ peak: 0.14, dur: 0.1, f: 1800 });
  });
  def('bm-vesper-m-counter-glass', 'imp', S => {  // the Glass Knight's wide ring far out: a thin crack, two wide notes held apart (one either side) and a long hush of glass air
    S.space('hall', 0.6); const G = vsGlass(S);
    G.crack({ peak: 0.2, dur: 0.12, f: 2000 });
    G.glass({ at: 0.02, f: 1900, dur: 1.6, peak: 0.1, pan: -0.6 }); G.glass({ at: 0.04, f: 2250, dur: 1.5, peak: 0.09, pan: 0.6 });
    G.noise({ color: 'pink', bp: 700, bp1: 3500, q: 0.8, dur: 0.9, pts: [[0.12, 1], [0.9, 0]], peak: 0.1 });
    S.rumble({ dur: 0.9, f: 70, peak: 0.12, a: 0.05 });
  });
  def('bm-vesper-m-cross', 'imp', S => {          // the hall's side of a Cross-Cut: a broad slap of steel on stone, a blow, two strokes of air crossing each other
    S.space('hall', 0.45);
    S.crack({ peak: 0.34, dur: 0.16, f: 1400 });
    S.thud({ f: 62, f1: 30, dur: 0.7, drive: 1.8, peak: 0.5 });
    S.whoosh({ color: 'pink', f: 800, f1: 4200, dur: 0.4, peakAt: 0.2, q: 1.4, peak: 0.2, pan: -0.5 });
    S.whoosh({ color: 'pink', f: 4200, f1: 800, dur: 0.4, peakAt: 0.2, q: 1.4, peak: 0.2, pan: 0.5 });
    vsRing(S, 0.02, mf(67), 1.4, 0.12, 0, 1.8);
  });
  def('bm-vesper-m-cross-glass', 'imp', S => {    // the stripe of glass: one narrow thin line, a crack along it, one high note
    S.space('hall', 0.55); const G = vsGlass(S);
    G.crack({ peak: 0.2, dur: 0.1, f: 2800 });
    G.whoosh({ color: 'pink', f: 5200, f1: 2800, dur: 0.35, peakAt: 0.1, q: 2.0, peak: 0.12 });
    G.glass({ at: 0.02, f: mf(88), dur: 1.2, peak: 0.1 });
    S.thud({ f: 70, f1: 36, dur: 0.3, click: 0, lp: 360, peak: 0.15 });
  });
  def('bm-vesper-m-thread-lock', 'bm', S => {     // the thread locks taut between the hero and their twin: a thin note snapping up a step and holding, a tick of steel
    S.space('hall', 0.4);
    S.tone({ f: mf(90), f1: mf(93), glide: 0.12, dur: 0.9, pts: [[0.04, 1], [0.5, 0.5], [0.9, 0]], peak: 0.1, lp: 5000, vib: [7, 0.003, 0.1] });
    S.metal({ set: 'bar', f: 3600, dur: 0.2, peak: 0.06, strike: 0.3 });
    S.noise({ color: 'white', hp: 6500, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.04 });
  });
  def('bm-vesper-m-thread-snap', 'imp', S => {    // the thread parts: a string let go (a bright twang falling), a crack, and the glass's thin answer a beat behind
    S.space('hall', 0.45); const G = vsGlass(S);
    S.tone({ f: 2300, f1: 1000, dur: 0.22, a: 0.002, peak: 0.12, lp: 4500 });
    S.crack({ peak: 0.26, dur: 0.12, f: 2600 });
    S.thud({ f: 70, f1: 36, dur: 0.4, click: 0, lp: 420, peak: 0.3 });
    G.tone({ at: 0.18, f: 4600, f1: 2000, dur: 0.22, a: 0.002, peak: 0.1, lp: 6000 });
    G.glass({ at: 0.2, f: mf(93), dur: 1.2, peak: 0.08 });
  });
  def('bm-vesper-m-cut-draw', 'bm', S => {        // a cut of the dance drawn (Vesper's): a short rising draw of steel and a small ring
    S.space('hall', 0.35);
    vsDraw(S, 0, 0.5, 0.12, 0);
    vsRing(S, 0.35, mf(86), 0.8, 0.04, 0, 1.4);
  });
  def('bm-vesper-m-cut-draw-glass', 'bm', S => {  // a cut of the dance drawn by the Glass Knight: the same draw coming down, thin and far
    S.space('hall', 0.5); const G = vsGlass(S);
    vsDraw(G, 0, 0.5, 0.1, 0, 0);
    vsRing(G, 0.35, mf(86), 0.8, 0.04, 0, 1.4);
  });
  def('bm-vesper-m-cut', 'imp', S => {            // a cut of Vesper's lands: a stroke of air, a steel crack, a short blow and the ring (the caller climbs the rate and the level up the dance)
    S.space('hall', 0.4);
    vsCut(S, 0, 0.5, -0.2);
    S.thud({ f: 70, f1: 38, dur: 0.35, click: 0.1, lp: 700, peak: 0.4 });
    vsRing(S, 0.02, mf(74), 1.2, 0.12, -0.1, 1.8);
  });
  def('bm-vesper-m-cut-glass', 'imp', S => {      // a cut of the Glass Knight's lands: a long thin stroke, a high crack and a high ring, a small blow far under
    S.space('hall', 0.55); const G = vsGlass(S);
    G.whoosh({ color: 'pink', f: 5200, f1: 900, dur: 0.5, peakAt: 0.15, q: 1.4, peak: 0.2, pan: 0.3 });
    G.crack({ peak: 0.2, dur: 0.1, f: 2800, pan: 0.3 });
    vsRing(G, 0.02, mf(86), 1.2, 0.12, 0.3, 1.8);
    S.thud({ f: 66, f1: 34, dur: 0.3, click: 0, lp: 360, peak: 0.2 });
  });
  def('bm-vesper-m-cut-last', 'imp', S => {       // the last cut, both knights at once: a deep blow, a wide stroke in each room, a low long ring and its high twin, a long low swell under them
    S.space('hall', 0.6); const G = vsGlass(S);
    S.thud({ f: 50, f1: 24, dur: 1.3, drive: 2.6, peak: 0.65 });
    S.crack({ peak: 0.34, dur: 0.16, f: 1500 });
    S.whoosh({ color: 'pink', f: 4200, f1: 600, dur: 0.6, peakAt: 0.12, q: 1.3, peak: 0.3, pan: -0.4 });
    vsRing(S, 0.02, mf(50), 3.0, 0.24, 0, 1.6);
    G.whoosh({ at: 0.06, color: 'pink', f: 5200, f1: 800, dur: 0.6, peakAt: 0.12, q: 1.3, peak: 0.2, pan: 0.4 });
    G.crack({ at: 0.06, peak: 0.2, dur: 0.12, f: 2600, pan: 0.4 });
    vsRing(G, 0.08, mf(74), 2.4, 0.16, 0.35, 1.6);
    S.rumble({ at: 0.02, dur: 1.5, f: 62, peak: 0.25, a: 0.05 });
  });
  def('bm-vesper-m-step', 'bm', S => {            // the Glass Knight steps out of line: one stride and a ring from the glass that does not agree with it, a hair flat and beating
    S.space('hall', 0.55); const G = vsGlass(S);
    vsStep(S, 0, 0.14, 0, 62);
    vsRing(G, 0.1, mf(79), 1.4, 0.12, 0.3, 5);
  });
  def('bm-vesper-m-hand-land', 'imp', S => {      // a standing mirror set down in the hall: a blow, the frame knocking on stone, glass shivering in it
    S.space('hall', 0.5); const G = vsGlass(S);
    S.thud({ f: 60, f1: 35, dur: 0.5, drive: 1.4, peak: 0.45 });
    S.wood({ at: 0.02, f: 380, dur: 0.18, peak: 0.28 });
    S.metal({ at: 0.03, set: 'plate', f: 520, dur: 0.9, peak: 0.08, click: 0 });
    [2200, 2900, 3600].forEach((f, i) => G.glass({ at: 0.05 + i * 0.06, f, dur: 1.0, peak: 0.07, pan: (i - 1) * 0.4 }));
  });
  def('bm-vesper-m-hand-break', 'imp', S => {     // the hand mirror shatters: a crack, a bright scatter of glass falling in many pieces and a low blow, then a hush
    S.space('hall', 0.55); const G = vsGlass(S, { hp: 1500, lp: 7500 });
    S.crack({ peak: 0.3, dur: 0.16, f: 2200 });
    S.thud({ f: 70, f1: 34, dur: 0.5, drive: 1.6, click: 0.1, lp: 600, peak: 0.35 });
    G.noise({ at: 0.02, color: 'white', hp: 4000, dur: 1.1, pts: [[0.05, 1], [1.1, 0]], peak: 0.14, grain: 0.9 });
    for (let i = 0; i < 10; i++) G.glass({ at: 0.03 + i * 0.05 + (i % 3) * 0.02, f: 2400 + ((i * 677) % 4000), dur: 0.7, peak: 0.045, pan: Math.sin(i * 2.3) * 0.7 });
    S.rumble({ at: 0.02, dur: 0.8, f: 66, peak: 0.12, a: 0.04 });
  });
  def('bm-vesper-m-pull', 'bm', S => {            // the glass reaches for a hero: an inward sweep growing, a low note rising under it, three glass notes drawn up
    S.space('hall', 0.55); const G = vsGlass(S);
    S.whoosh({ color: 'pink', f: 5200, f1: 600, dur: 1.3, peakAt: 0.85, q: 1.0, peak: 0.16 });
    S.tone({ f: mf(45), f1: mf(52), dur: 1.4, pts: [[0.9, 1], [1.4, 0]], peak: 0.07, lp: 500 });
    [0.2, 0.55, 0.9].forEach((t, i) => G.glass({ at: t, f: mf(86 + i * 4), dur: 1.0, peak: 0.05 }));
  });
  def('bm-vesper-m-through', 'bm', S => {         // a hero goes through the glass: a soft crack at the surface, a plunging sweep and a long thin ring, the hall's sound gone dull behind
    S.space('hall', 0.6); const G = vsGlass(S);
    S.crack({ peak: 0.12, dur: 0.1, f: 2400 });
    S.whoosh({ color: 'pink', f: 2800, f1: 350, dur: 0.9, peakAt: 0.1, q: 0.9, peak: 0.2 });
    S.thud({ at: 0.04, f: 60, f1: 32, dur: 0.5, click: 0, lp: 300, peak: 0.25 });
    G.glass({ at: 0.06, f: mf(91), dur: 1.6, peak: 0.08 }); G.glass({ at: 0.1, f: mf(98), dur: 1.4, peak: 0.05 });
  });
  def('bm-vesper-m-back', 'bm', S => {            // a hero comes back through: the release, a rising sweep and a breath out, one glass tick
    S.space('hall', 0.5); const G = vsGlass(S);
    S.whoosh({ color: 'pink', f: 400, f1: 3400, dur: 0.8, peakAt: 0.7, q: 0.9, peak: 0.22 });
    S.thud({ at: 0.55, f: 62, f1: 36, dur: 0.4, click: 0, lp: 300, peak: 0.12 });
    G.glass({ at: 0.6, f: mf(95), dur: 1.0, peak: 0.05 });
  });
  def('bm-vesper-m-soak-met', 'bm', S => {        // a round of soaks met: two notes landing on the same pitch, a soft unison ring with its high twin
    S.space('hall', 0.5); const G = vsGlass(S);
    S.partials({ set: [[1, 1, 1], [2, 0.14, 0.7], [3, 0.05, 0.5]], f: mf(81), dur: 1.6, peak: 0.12, pan: -0.3 });
    S.partials({ at: 0.01, set: [[1, 1, 1], [2, 0.14, 0.7], [3, 0.05, 0.5]], f: mf(81), dur: 1.6, peak: 0.12, pan: 0.3 });
    G.glass({ at: 0.15, f: mf(93), dur: 1.2, peak: 0.05 });
  });
  def('bm-vesper-m-soak-missed', 'bm', S => {     // a soak that did not have its two: a dull knock and a pair of low notes that do not agree, quickly gone
    S.space('hall', 0.4);
    S.thud({ f: 74, f1: 40, dur: 0.35, click: 0, lp: 400, peak: 0.3 });
    S.partials({ set: [[1, 1, 1], [2, 0.14, 0.7]], f: mf(62), dur: 0.9, peak: 0.1, pan: -0.3 });
    S.partials({ at: 0.01, set: [[1, 1, 1], [2, 0.14, 0.7]], f: mf(62) * 1.045, dur: 0.9, peak: 0.1, pan: 0.3 });
  });
  def('bm-vesper-m-swap', 'bm', S => {            // the glass lets one hero go and takes another: two glass notes passing, one up and one down, a tick between
    S.space('hall', 0.5); const G = vsGlass(S);
    G.tone({ f: mf(86), f1: mf(98), dur: 0.9, pts: [[0.1, 1], [0.6, 0.6], [0.9, 0]], peak: 0.08, lp: 5000, pan: -0.5 });
    G.tone({ f: mf(98), f1: mf(86), dur: 0.9, pts: [[0.1, 1], [0.6, 0.6], [0.9, 0]], peak: 0.08, lp: 5000, pan: 0.5 });
    G.glass({ at: 0.4, f: mf(93), dur: 0.8, peak: 0.05 });
  });
  def('bm-vesper-m-trade', 'bm', S => {           // the knights trade rooms: four strides crossing from one side to the other as a stroke of air crosses the other way, a note and its answer
    S.space('hall', 0.55); const G = vsGlass(S);
    [0, 0.2, 0.4, 0.6].forEach((t, i) => vsStep(S, t, 0.16, -0.6 + i * 0.4, 62));
    G.whoosh({ at: 0.05, color: 'pink', f: 4200, f1: 900, dur: 0.8, peakAt: 0.5, q: 1.2, peak: 0.12, pan: 0.4 });
    vsRing(S, 0.7, mf(74), 1.4, 0.08, 0.2, 1.4); vsRing(G, 0.85, mf(86), 1.3, 0.06, -0.2, 1.4);
  });
  def('bm-vesper-m-backhand', 'bm', S => {        // the Backhand changes sides: the stroke drawn back in a quick falling sweep, a knock, the other side's rising from the glass
    S.space('hall', 0.45); const G = vsGlass(S);
    S.whoosh({ color: 'pink', f: 4200, f1: 800, dur: 0.35, peakAt: 0.3, q: 1.4, peak: 0.22, pan: -0.5 });
    S.wood({ at: 0.3, f: 700, dur: 0.06, peak: 0.08 });
    G.whoosh({ at: 0.32, color: 'pink', f: 900, f1: 4800, dur: 0.4, peakAt: 0.6, q: 1.4, peak: 0.2, pan: 0.5 });
  });
  def('bm-vesper-m-mark-aim', 'bm', S => {        // an eye on you (Evenfall is aimed at you): one thin glance, a high note and a tick
    S.space('hall', 0.3);
    S.glass({ f: mf(100), dur: 1.0, peak: 0.08 });
    S.noise({ color: 'white', hp: 6500, dur: 0.1, pts: [[0.01, 1], [0.1, 0]], peak: 0.05 });
  });
  def('bm-vesper-m-mark-chain', 'bm', S => {      // the thread tied to you: three small links of silver running
    S.space('hall', 0.3);
    for (let i = 0; i < 3; i++) S.metal({ at: i * 0.07, set: 'bar', f: 3100 - i * 260, dur: 0.22, peak: 0.07, strike: 0.25, pan: i % 2 ? 0.3 : -0.3 });
  });
  def('bm-vesper-m-mark-lag', 'bm', S => {        // your twin will lag: a note and its late, lower copy
    S.space('hall', 0.4);
    S.glass({ f: mf(88), dur: 1.0, peak: 0.08, pan: -0.2 });
    S.glass({ at: 0.45, f: mf(84), dur: 1.0, peak: 0.04, pan: 0.2 });
  });
  def('bm-vesper-m-mark-wrong', 'bm', S => {      // your twin will use the wrong hand: a warm low note and a tritone against it
    S.space('hall', 0.4);
    S.tone({ f: mf(57), dur: 0.9, pts: [[0.05, 1], [0.5, 0.6], [0.9, 0]], peak: 0.08, lp: 700 });
    S.tone({ at: 0.05, f: mf(63), dur: 0.8, pts: [[0.05, 1], [0.4, 0.6], [0.8, 0]], peak: 0.04, lp: 900 });
  });
  def('bm-vesper-m-open', 'imp', S => {           // the light raidwide of an act's opening: a soft low blow and one ring of steel with its glass twin
    S.space('hall', 0.55); const G = vsGlass(S);
    S.thud({ f: 60, f1: 32, dur: 0.6, drive: 1.4, peak: 0.35 });
    vsRing(S, 0.02, mf(62), 1.8, 0.12, -0.1, 1.4);
    vsRing(G, 0.2, mf(74), 1.4, 0.08, 0.3, 1.4);
  });
  def('bm-vesper-m-ring', 'imp', S => {           // Ring True: both blades struck on the wall, a great ring in the hall and the glass's a beat behind
    S.space('hall', 0.6); const G = vsGlass(S);
    S.thud({ f: 56, f1: 28, dur: 0.9, drive: 2.0, peak: 0.5 });
    S.crack({ peak: 0.24, dur: 0.14, f: 1800 });
    vsRing(S, 0.02, mf(66), 3.2, 0.3, -0.15, 1.6);
    vsRing(G, 0.24, mf(78), 2.8, 0.2, 0.3, 2.2);
    S.rumble({ at: 0.02, dur: 1.2, f: 64, peak: 0.2, a: 0.05 });
  });
  def('bm-vesper-m-hair', 'imp', S => {           // Hairline Fracture lands: a thin crack that runs across the glass, a small blow, fine ticks falling away
    S.space('hall', 0.5); const G = vsGlass(S);
    S.thud({ f: 70, f1: 38, dur: 0.4, click: 0, lp: 420, peak: 0.3 });
    for (let i = 0; i < 6; i++) { const pan = -0.7 + i * 0.28; G.crack({ at: i * 0.05, peak: 0.1, dur: 0.05, f: 3400, pan }); G.glass({ at: i * 0.05, f: 3200 + i * 300, dur: 0.6, peak: 0.04, pan }); }
  });
  // the room's bed: the Argent Hall at night, a large still room of stone and silver. Almost nothing: a very low room tone, a thin shimmer of silver air drifting, two high notes a hair apart
  // beating once in a long while, the glass ticking as it cools
  loop('amb-vesper-hall', 'amb', L => {
    const room = L.c(L.src('brown', 0.7), L.f('lowpass', 160), L.g(0.35)); L.lfo(room.gain, 0.023, 0.12); room.connect(L.out);
    const air = L.c(L.src('pink', 0.8), L.f('bandpass', 3100, 9)), ag = L.g(0.012); L.lfo(air.frequency, 0.031, 420); L.lfo(ag.gain, 0.043, 0.01); L.c(air, ag, L.out);
    const a = L.g(0.005), b = L.g(0.005); L.lfo(a.gain, 0.037, 0.004); L.lfo(b.gain, 0.029, 0.004);
    L.c(L.osc('sine', mf(86)), a, L.out); L.c(L.osc('sine', mf(86) * 1.0021), b, L.out);
    const sub = L.c(L.osc('sine', 55), L.g(0.03)); L.lfo(sub.gain, 0.019, 0.015); sub.connect(L.out);
    L.c(L.crackle(0.05), L.f('highpass', 4500), L.g(0.012), L.out);
  }, 3);

  // ============================================================================================== Ormun, the Tide-Weigher (Season 2, boss XV: the Scales)
  // Deep water, stone, great chains and one huge slow bell. He never speaks, roars or grunts, and he never hurries: his voice is the sleeves' water running, a chain taken up link by link, a block of
  // stone set down, and a bell struck so slowly and so low it is more felt than heard (church partials a long way down, dark, a slow beat in them). Every move keeps that voice and adds a turn of its
  // own; the three kinds of judgement are told apart by the shape of what is rung: Let It Be Level is two even strokes, left and right, the same note, and a steady settling pair of links
  // (everything symmetrical); The Heavier Falls is a falling scale of three tolls with the chain running out faster and faster; The Lighter Rises is a rising scale with the chain hauled
  // up slower and slower and drops of water lifted off. The casts are the builds and each ends on a held silence, never on a blow: a landing sounds from its telegraph tag exactly on its beat (the m- cues,
  // sound-hooks.js "ormun" block, so Hard's shorter casts stay in time). A judgement's count being read (the beam stopping dead) and the strike that follows are the m-read and m-fall cues.
  // The staged beats (bm-ormun-w-) are walls/ormun.js's.
  const omToll = (S, at, m, dur, pk, o = {}) =>                 // the huge slow bell: church partials very low, a slow soft stroke, dark, a slow beat in the first three
    S.partials({ at, set: 'church', f: mf(m), dur, a: o.a == null ? 0.05 : o.a, beat: o.beat == null ? 0.6 : o.beat, peak: pk, spread: 6, lp: o.lp || 1700, pan: o.pan });
  const omLinks = (S, at, n, gap, pk, o = {}) => {              // a great chain through its rings: n heavy low links; o.acc multiplies the gap each link, o.f -> o.f1 walks the pitch, o.pan -> o.pan1 the place
    let t = at, g = gap;
    for (let i = 0; i < n; i++) {
      const x = n > 1 ? i / (n - 1) : 0, f0 = o.f || 400, f = f0 * Math.pow((o.f1 || f0) / f0, x), p0 = o.pan || 0, pan = p0 + ((o.pan1 == null ? p0 : o.pan1) - p0) * x;
      const p = pk * (o.fade ? 1 - o.fade * x : 1) * (i % 2 ? 0.8 : 1);
      S.metal({ at: t, set: 'plate', f, dur: o.dur || 0.3, peak: p, click: 0.3, pan });
      if (o.body !== 0) S.thud({ at: t, f: 92, f1: 56, dur: 0.12, click: 0, lp: 420, peak: p * 0.4, pan });
      t += g; g *= o.acc || 1;
    }
    return t;
  };
  const omSea = (S, at, dur, pk, o = {}) => {                   // the night sea moving along stone: pink noise in a drifting band, lapping slowly, a gurgle of grain in it, a dark wash under
    const pts = o.pts || [[dur * 0.45, 1], [dur, 0]];
    S.noise({ at, color: 'pink', bp: o.f || 600, bp1: o.f1 || 1100, q: 0.6, lp: 2800, hp: 110, dur, pts, peak: pk, am: [o.lap || 0.45, 0.55], grain: 0.3, pan: o.pan });
    S.noise({ at, color: 'brown', lp: o.low || 360, dur, pts, peak: pk * 0.8, pan: o.pan });
  };
  const omStone = (S, at, pk, o = {}) => {                      // stone on stone: a low blow, the dull knock of a block settling, a little grit
    const f = o.f || 62;
    S.thud({ at, f, f1: f * 0.52, dur: o.dur || 0.5, click: 0.12, lp: 520, peak: pk, pan: o.pan });
    S.partials({ at, set: 'stone', f: o.kf || 150, dur: 0.32, peak: pk * 0.28, pan: o.pan });
    S.noise({ at, color: 'brown', lp: 900, dur: 0.2, pts: [[0.01, 1], [0.2, 0]], peak: pk * 0.3, pan: o.pan });
  };
  const omDrip = (S, at, pk, f, pan = 0) => S.tone({ at, f, f1: f * 1.35, glide: 0.05, dur: 0.18, a: 0.002, peak: pk, lp: 3000, pan });   // a drop off a sleeve into deep water
  const omBeam = (S, at, dur, pk, o = {}) => S.creak({ at, f: o.f || 20, f1: o.f1 || 10, dur, res: [170, 400, 850, o.top || 0].filter(Boolean), q: 12, peak: pk, hp: 90, pts: o.pts || [[dur * 0.45, 1], [dur, 0]], pan: o.pan });   // the beam taking the strain

  // his entrance: the sea a long way under, the great chains drawn taut one link at a time, water running from his sleeves, the beam creaking, one vast toll and the pans swaying to rest
  def('bm-ormun-intro', 'sting', S => {
    S.space('hall', 0.55);
    omSea(S, 0, 4.4, 0.14, { f: 380, f1: 820, low: 280, lap: 0.28, pts: [[2.0, 1], [4.4, 0]] });
    S.rumble({ dur: 5.0, f: 46, peak: 0.1, a: 2.2 });
    omLinks(S, 0.7, 7, 0.4, 0.08, { f: 300, f1: 500, acc: 0.88, pan: -0.45, pan1: 0.45 });
    [1.0, 1.6, 2.0, 2.6, 3.0].forEach((t, i) => omDrip(S, t, 0.035, 560 + i * 90, i % 2 ? 0.5 : -0.5));
    omBeam(S, 2.0, 1.2, 0.07, { pts: [[0.5, 1], [1.2, 0]] });
    omToll(S, 2.4, 36, 3.2, 0.22, { a: 0.08 });
    S.thud({ at: 2.4, f: 46, f1: 26, dur: 1.2, drive: 1.4, peak: 0.3, click: 0 });
    omBeam(S, 3.9, 1.2, 0.04, { f: 12, f1: 8, pan: 0.3 });
  });
  // ---- the openers: the scales taken in hand, each its own way
  def('bm-ormun-first-weighing', 'bm', S => {      // the scales taken in hand: the left chain taken up, then the right a little higher, one toll as he looks down
    S.space('hall', 0.55);
    omSea(S, 0, 1.8, 0.06, { lap: 0.3, pts: [[0.9, 1], [1.8, 0]] });
    omLinks(S, 0.2, 4, 0.2, 0.09, { f: 300, f1: 460, pan: -0.5, acc: 1.12 });
    omLinks(S, 0.75, 4, 0.2, 0.09, { f: 340, f1: 520, pan: 0.5, acc: 1.12 });
    omToll(S, 1.3, 43, 1.7, 0.13);
  });
  def('bm-ormun-the-beam-leans', 'bm', S => {      // the beam tilts: one chain runs out downward as the other is gently taken up, a long creak and a toll that is not quite true
    S.space('hall', 0.55);
    omLinks(S, 0.2, 6, 0.22, 0.08, { f: 480, f1: 280, acc: 0.88, pan: 0.5, pan1: 0.1 });
    omLinks(S, 0.5, 4, 0.3, 0.05, { f: 300, f1: 340, acc: 1.1, pan: -0.5 });
    omBeam(S, 0.5, 1.8, 0.09, { pts: [[0.8, 1], [1.8, 0]] });
    omToll(S, 1.5, 40, 1.4, 0.1, { beat: 1.8 });
  });
  def('bm-ormun-the-weight-of-things', 'bm', S => { // everything weighs: two blocks of stone set down one after the other, the chains groaning, a deeper toll
    S.space('hall', 0.6);
    omStone(S, 0.4, 0.26, { f: 56, pan: -0.3 }); omStone(S, 1.1, 0.28, { f: 50, pan: 0.3 });
    omLinks(S, 0.5, 5, 0.3, 0.06, { f: 260, f1: 220, acc: 1.05 });
    S.rumble({ at: 0.3, dur: 2.2, f: 52, peak: 0.12, a: 1.2 });
    omToll(S, 1.5, 36, 1.6, 0.13);
  });
  def('bm-ormun-the-bridge-breaks', 'bm', S => {   // the span groans: stone grinding on stone, the chains taking the strain faster and higher, the beam creaking to a pitch; ends in the held hush
    S.space('hall', 0.6);
    S.rumble({ dur: 2.3, f: 60, peak: 0.16, a: 1.4 });
    S.scrape({ at: 0.2, f: 420, q: 2, rate: 9, dur: 2.0, pts: [[1.4, 1], [2.0, 0]], peak: 0.07 });
    omLinks(S, 0.3, 10, 0.2, 0.07, { f: 300, f1: 700, acc: 0.88 });
    omBeam(S, 0.4, 1.8, 0.1, { f: 14, f1: 28, pts: [[1.5, 1], [1.8, 0]] });
    S.tone({ at: 1.0, f: mf(33), f1: mf(36), dur: 1.3, pts: [[1.0, 1], [1.3, 0]], peak: 0.05, lp: 400 });
  });
  def('bm-ormun-spring-tide', 'bm', S => {         // the wall begins: the sea drawn back out from under the pans, a deep pull rising, the chains slackening, a toll; then nothing (the stillness is staged)
    S.space('hall', 0.65);
    S.noise({ at: 0.1, color: 'pink', bp: 1600, bp1: 220, q: 0.7, lp: 3000, dur: 2.4, pts: [[0.5, 1], [2.4, 0]], peak: 0.2, am: [0.7, 0.5], grain: 0.25 });
    S.rumble({ dur: 2.7, f: 55, peak: 0.16, a: 1.6 });
    omLinks(S, 0.4, 5, 0.35, 0.06, { f: 500, f1: 300, acc: 0.9 });
    omToll(S, 1.3, 36, 1.5, 0.12);
  });
  // ---- the three judgements: the same cast bar, three different shapes
  def('bm-ormun-let-it-be-level', 'bm', S => {     // two strokes, the same note, left and then right, a steady even pair of links settling and one unison: everything symmetrical; then the silence the count is read in
    S.space('hall', 0.6);
    omToll(S, 0.3, 43, 3.0, 0.11, { pan: -0.55 }); omToll(S, 1.2, 43, 3.0, 0.11, { pan: 0.55 });
    for (let i = 0; i < 6; i++) S.metal({ at: 1.5 + i * 0.4, set: 'plate', f: 380, dur: 0.28, peak: 0.07 * (1 - i * 0.1), click: 0.3, pan: i % 2 ? 0.5 : -0.5 });
    omSea(S, 0.2, 3.6, 0.04, { lap: 0.25, pts: [[1.4, 1], [3.6, 0]] });
    omToll(S, 3.3, 43, 1.2, 0.06);
  });
  def('bm-ormun-the-heavier-falls', 'bm', S => {   // a falling scale: three tolls each deeper, the chain running out faster and faster, a block coming to rest at the bottom
    S.space('hall', 0.6);
    omToll(S, 0.3, 50, 1.6, 0.1); omToll(S, 1.2, 43, 1.8, 0.12); omToll(S, 2.1, 36, 2.0, 0.14);
    omLinks(S, 0.5, 14, 0.2, 0.07, { f: 520, f1: 260, acc: 0.88 });
    S.rumble({ at: 1.5, dur: 2.6, f: 55, peak: 0.16, a: 1.0 });
    omStone(S, 2.1, 0.22, { f: 48 });
  });
  def('bm-ormun-the-lighter-rises', 'bm', S => {   // a rising scale: three tolls each higher and lighter, the chain hauled up slower and slower, drops of water lifted off climbing
    S.space('hall', 0.6);
    omToll(S, 0.3, 36, 1.6, 0.09); omToll(S, 1.3, 43, 1.7, 0.09); omToll(S, 2.4, 50, 1.9, 0.09);
    omLinks(S, 0.4, 8, 0.28, 0.06, { f: 260, f1: 520, acc: 1.1, body: 0 });
    S.noise({ at: 0.5, color: 'pink', bp: 400, bp1: 2200, q: 0.8, lp: 3200, dur: 2.6, pts: [[1.8, 1], [2.6, 0]], peak: 0.07, grain: 0.3 });
    [0.9, 1.5, 2.0, 2.4, 2.7].forEach((t, i) => omDrip(S, t, 0.03, 520 + i * 160, i % 2 ? 0.4 : -0.4));
  });
  // ---- the rest of his kit
  def('bm-ormun-heavy-hand', 'bm', S => {          // the tank's blow: one great chain hauled back slowly, link after link, the sleeves pouring heavier, the lowest note he has; then the hush before the blow
    S.space('hall', 0.55);
    omLinks(S, 0.2, 7, 0.32, 0.09, { f: 260, f1: 380, acc: 0.95 });
    omSea(S, 0.2, 2.2, 0.1, { f: 500, f1: 900, low: 240, pts: [[1.8, 1], [2.2, 0]] });
    S.rumble({ at: 0.5, dur: 2.2, f: 50, peak: 0.18, a: 1.3 });
    omToll(S, 1.5, 33, 1.4, 0.13);
  });
  def('bm-ormun-the-tide-comes-in', 'bm', S => {   // the sea rising over both rims: a long swell of water, a deep pressure under it, two far slow bells out on the dark water
    S.space('hall', 0.65);
    omSea(S, 0, 3.0, 0.24, { f: 300, f1: 900, low: 420, lap: 0.5, pts: [[2.2, 1], [3.0, 0]] });
    S.rumble({ dur: 3.2, f: 70, peak: 0.22, a: 2.0 });
    omToll(S, 1.0, 52, 2.0, 0.05, { lp: 900 }); omToll(S, 1.8, 50, 1.6, 0.04, { lp: 800, pan: 0.4 });
  });
  def('bm-ormun-counterweight', 'bm', S => {       // a weight let down on its chain: the links paying out fast and slower, a low hum climbing as it nears, one dry tick for the hero it is aimed at
    S.space('hall', 0.55);
    omLinks(S, 0.2, 18, 0.18, 0.07, { f: 360, acc: 0.93, pan: -0.3, pan1: 0.3 });
    S.tone({ at: 0.6, f: mf(31), f1: mf(38), dur: 2.4, pts: [[1.6, 1], [2.4, 0]], peak: 0.08, lp: 300 });
    S.tick({ at: 2.4, f: 1500, peak: 0.12 });
  });
  def('bm-ormun-hollow-weight', 'bm', S => {       // the same chain let down, but the weight is cracked: the links uneven, the hum wavering, a dull knock and a hairline crack, a flat dull toll
    S.space('hall', 0.55);
    omLinks(S, 0.2, 14, 0.2, 0.07, { f: 330, f1: 300, acc: 0.95, pan: -0.3, pan1: 0.3 });
    S.tone({ at: 0.6, f: mf(30), f1: mf(37), dur: 2.4, pts: [[1.6, 1], [2.4, 0]], peak: 0.08, lp: 300, am: [5, 0.6] });
    S.wood({ at: 1.2, f: 300, dur: 0.12, peak: 0.15 });
    S.crack({ at: 2.0, peak: 0.05, dur: 0.1, f: 1600 });
    omToll(S, 1.7, 39, 1.2, 0.07, { beat: 2.2, lp: 900 });
  });
  def('bm-ormun-undertow', 'bm', S => {            // the low rim floods: water drawn back across stone, its lapping quickening, a draining gurgle falling, a deep toll under it
    S.space('hall', 0.6);
    S.noise({ at: 0.1, color: 'pink', bp: 1400, bp1: 180, q: 0.8, lp: 3000, dur: 3.4, pts: [[0.6, 1], [1.6, 0.8], [3.4, 0]], peak: 0.22, am: [1.4, 0.6], grain: 0.4 });
    S.rumble({ at: 0.2, dur: 3.6, f: 80, peak: 0.2, a: 1.2, am: [1.4, 0.4] });
    S.tone({ at: 0.8, f: 170, f1: 70, dur: 2.2, a: 0.5, peak: 0.05, lp: 500 });
    [1.0, 1.6, 2.0, 2.3].forEach((t, i) => omDrip(S, t, 0.03, 700 - i * 110, i % 2 ? 0.4 : -0.4));
    omToll(S, 2.0, 31, 1.6, 0.09);
  });
  def('bm-ormun-twin-undertow', 'bm', S => {       // both rims: the same draining, once on each side and out of step, two tolls a fifth apart
    S.space('hall', 0.6);
    S.noise({ at: 0.1, color: 'pink', bp: 1400, bp1: 180, q: 0.8, lp: 3000, dur: 3.0, pts: [[0.6, 1], [1.5, 0.8], [3.0, 0]], peak: 0.17, am: [1.2, 0.6], grain: 0.4, pan: -0.6 });
    S.noise({ at: 0.35, color: 'pink', bp: 1200, bp1: 160, q: 0.8, lp: 3000, dur: 3.0, pts: [[0.6, 1], [1.5, 0.8], [3.0, 0]], peak: 0.17, am: [1.7, 0.6], grain: 0.4, pan: 0.6 });
    S.rumble({ at: 0.2, dur: 3.2, f: 80, peak: 0.2, a: 1.2, am: [1.4, 0.4] });
    omToll(S, 1.8, 31, 1.5, 0.08, { pan: -0.5 }); omToll(S, 2.2, 38, 1.4, 0.07, { pan: 0.5 });
  });
  def('bm-ormun-burden', 'bm', S => {              // one hero made heavy, one made light: a block of stone sinking, the chain going taut, and a thin high note rising away from it
    S.space('hall', 0.5);
    omStone(S, 0.5, 0.22, { f: 50 });
    omLinks(S, 0.45, 3, 0.18, 0.1, { f: 280, f1: 240, acc: 1.2 });
    omToll(S, 1.0, 38, 1.3, 0.07);
    S.tone({ at: 1.1, f: mf(76), f1: mf(83), dur: 1.0, a: 0.3, lp: 3000, peak: 0.04 });
  });
  def('bm-ormun-three-burdens', 'bm', S => {       // two made heavy and one made light: two stones sinking, one after the other, and the thin note rising
    S.space('hall', 0.5);
    omStone(S, 0.4, 0.2, { f: 54, pan: -0.3 }); omStone(S, 0.85, 0.24, { f: 48, pan: 0.3 });
    omLinks(S, 0.35, 5, 0.17, 0.09, { f: 290, f1: 230, acc: 1.12 });
    omToll(S, 1.1, 36, 1.2, 0.07);
    S.tone({ at: 1.3, f: mf(78), f1: mf(86), dur: 0.9, a: 0.3, lp: 3000, peak: 0.035 });
  });
  def('bm-ormun-tip-the-scale', 'bm', S => {       // the beam taking all the strain: a creak quickening and climbing, the chains hauled faster and higher, water pouring off the high pan; ends in the held hush
    S.space('hall', 0.6);
    omBeam(S, 0.1, 2.3, 0.12, { f: 10, f1: 26, top: 1500, pts: [[1.8, 1], [2.3, 0]] });
    omLinks(S, 0.4, 12, 0.2, 0.07, { f: 320, f1: 640, acc: 0.88, pan: -0.4 });
    S.noise({ at: 0.6, color: 'pink', bp: 1000, bp1: 1800, q: 0.6, lp: 3000, dur: 1.8, pts: [[1.2, 1], [1.8, 0]], peak: 0.1, grain: 0.3, pan: 0.5 });
    S.rumble({ dur: 2.5, f: 60, peak: 0.14, a: 1.8 });
  });
  def('bm-ormun-the-tide-arrives', 'bm', S => {    // the serpent comes (the arrival itself is staged and starts as this does): only a very low swell of water moving far under the pans, no edge, gone
    S.space('hall', 0.6);
    S.rumble({ dur: 2.0, f: 44, peak: 0.14, a: 1.4 });
    S.noise({ color: 'brown', lp: 260, dur: 1.9, pts: [[1.2, 1], [1.9, 0]], peak: 0.12 });
    S.tone({ f: mf(26), f1: mf(31), dur: 1.9, a: 0.9, peak: 0.06, lp: 200 });
    omToll(S, 0.4, 29, 1.4, 0.06, { lp: 700 });
  });
  def('bm-ormun-the-scale-falls', 'bm', S => {     // the enrage: the sea rising over everything, every chain running at once, the bell tolled slower and deeper three times, then a long hush before the fall
    S.space('hall', 0.8);
    omSea(S, 0, 6.2, 0.26, { f: 200, f1: 1200, low: 500, lap: 0.35, pts: [[4.6, 1], [6.2, 0]] });
    S.rumble({ dur: 6.4, f: 50, peak: 0.26, a: 4.2 });
    omLinks(S, 0.8, 24, 0.3, 0.09, { f: 260, f1: 520, acc: 0.93, pan: -0.4, pan1: 0.4 });
    omToll(S, 1.2, 33, 3.8, 0.17); omToll(S, 3.4, 31, 2.8, 0.15); omToll(S, 5.0, 29, 1.8, 0.13);
    omBeam(S, 2.0, 3.6, 0.09, { f: 8, f1: 24, pts: [[3.0, 1], [3.6, 0]] });
  });
  def('bm-ormun-scatter-the-silver', 'bm', S => {  // the hand raised over a cradle: the chain hauled back, and silver pieces shaking against one another in the weight, faster; the hush
    S.space('hall', 0.55);
    omLinks(S, 0.2, 6, 0.3, 0.09, { f: 300, f1: 400, acc: 0.96 });
    S.coins({ at: 0.8, n: 12, f: 2800, spread: 1.6, peak: 0.07 });
    omToll(S, 1.6, 40, 1.6, 0.08);
    S.rumble({ at: 0.3, dur: 2.2, f: 52, peak: 0.1, a: 1.2 });
  });
  def('bm-ormun-buoyed', 'bm', S => {              // one made lighter than nothing: the chain going slack, a few links falling away, a clear note rising and drops lifted off it
    S.space('hall', 0.55);
    omLinks(S, 0.2, 6, 0.1, 0.06, { f: 420, f1: 250, acc: 0.92, fade: 0.5, body: 0 });
    S.tone({ at: 0.4, f: mf(72), f1: mf(84), dur: 1.4, a: 0.5, lp: 3500, peak: 0.05 });
    [0.7, 1.0, 1.25].forEach((t, i) => omDrip(S, t, 0.03, 700 + i * 220, i % 2 ? 0.4 : -0.4));
  });
  def('bm-ormun-exact-measure', 'bm', S => {       // a number named: a rule laid across the pans, fine dry ticks spaced exactly, a thin pure note held over them, and one fixed toll set down at the end
    S.space('hall', 0.55);
    for (let i = 0; i < 8; i++) S.tick({ at: 0.3 + i * 0.3, f: 1700, peak: 0.07, pan: -0.3 + i * 0.085 });
    S.partials({ at: 0.3, set: 'bar', f: mf(76), dur: 3.0, peak: 0.035, a: 0.4, swell: true });
    omToll(S, 2.9, 43, 1.6, 0.09);
  });
  def('bm-ormun-the-tide-weighs-too', 'bm', S => { // the water takes a weight of its own: four heavy plunks of water, each lower and heavier than the last, the sea rising under them
    S.space('hall', 0.6);
    for (let i = 0; i < 4; i++) { S.thud({ at: 0.3 + i * 0.55, f: 110 - i * 14, f1: 52, dur: 0.5, lp: 500, click: 0, peak: 0.12 + i * 0.03 }); S.noise({ at: 0.3 + i * 0.55, color: 'pink', bp: 900, bp1: 300, q: 0.7, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.09 }); }
    omSea(S, 0.2, 2.4, 0.1, { f: 400, f1: 900, low: 320, pts: [[1.8, 1], [2.4, 0]] });
    S.rumble({ dur: 2.6, f: 60, peak: 0.12, a: 1.6 });
  });
  // ---- the moments (sound-hooks.js reads them off the room)
  def('bm-ormun-m-creak', 'bm', S => {             // the beam creaking as the count changes: quiet, a short stretch of wood and iron and one soft link
    S.space('hall', 0.4);
    omBeam(S, 0, 0.9, 0.12, { f: 24, f1: 11, pts: [[0.25, 1], [0.9, 0]] });
    S.metal({ at: 0.35, set: 'plate', f: 330, dur: 0.2, peak: 0.03, click: 0 });
  });
  def('bm-ormun-m-lift', 'bm', S => {              // a weight lifted: the chain takes it, two links, stone leaving stone and a faint ring
    S.space('hall', 0.35);
    omLinks(S, 0, 2, 0.1, 0.06, { f: 360, f1: 440 });
    S.noise({ at: 0.05, color: 'brown', bp: 600, q: 0.8, lp: 1400, dur: 0.3, pts: [[0.08, 1], [0.3, 0]], peak: 0.1 });
    S.partials({ at: 0.1, set: 'stone', f: 220, dur: 0.5, peak: 0.04 });
  });
  def('bm-ormun-m-set', 'bm', S => {               // a weight set down in its cradle: a dull knock of stone on stone, a link slackening, a short ring of the rim
    S.space('hall', 0.4);
    omStone(S, 0, 0.32, { f: 68 });
    S.metal({ at: 0.03, set: 'plate', f: 520, dur: 0.4, peak: 0.04, click: 0 });
    S.metal({ at: 0.1, set: 'plate', f: 330, dur: 0.2, peak: 0.04, click: 0.3 });
  });
  def('bm-ormun-m-clear', 'bm', S => {             // every weight lifted away at once on his chains: a run of links hauled up, stone scraping, a dying sweep of air
    S.space('hall', 0.5);
    omLinks(S, 0, 8, 0.09, 0.05, { f: 300, f1: 600, acc: 0.9, body: 0 });
    S.scrape({ at: 0.05, f: 500, q: 2, rate: 10, dur: 0.6, pts: [[0.2, 1], [0.6, 0]], peak: 0.05 });
    S.whoosh({ at: 0.1, color: 'pink', f: 300, f1: 1400, dur: 0.8, peakAt: 0.4, peak: 0.07 });
  });
  def('bm-ormun-m-drop', 'imp', S => {             // a weight falling onto a hero: the chain whipped slack, a huge dull blow of stone, grit thrown out, a low shudder after it
    S.space('hall', 0.45);
    S.thud({ f: 52, f1: 24, dur: 0.9, drive: 2.4, click: 0.12, lp: 700, peak: 0.7 });
    omStone(S, 0, 0.3, { f: 70 });
    S.metal({ at: 0.02, set: 'plate', f: 260, dur: 0.6, peak: 0.1, click: 0.3 });
    S.noise({ at: 0.02, color: 'brown', bp: 400, bp1: 160, q: 0.8, dur: 0.8, pts: [[0.04, 1], [0.8, 0]], peak: 0.3 });
    S.rumble({ at: 0.04, dur: 1.0, f: 56, peak: 0.22, a: 0.04 });
  });
  def('bm-ormun-m-crack', 'imp', S => {            // a cracked weight comes down: the same blow but dull and hollow, a crack running through it, grit falling after
    S.space('hall', 0.45);
    S.thud({ f: 62, f1: 32, dur: 0.6, drive: 1.4, click: 0.1, lp: 520, peak: 0.45 });
    S.wood({ at: 0.01, f: 260, dur: 0.2, peak: 0.3 });
    S.crack({ at: 0.02, peak: 0.1, dur: 0.14, f: 1400 });
    S.noise({ at: 0.1, color: 'white', hp: 3000, lp: 7000, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.05, grain: 0.7 });
  });
  def('bm-ormun-m-read', 'bm', S => {              // the count is read: the beam stops dead. A single dry stop, stone on stone, and nothing after it
    S.wood({ f: 520, dur: 0.07, peak: 0.4 });
    S.thud({ f: 90, f1: 60, dur: 0.12, click: 0.5, lp: 900, peak: 0.3 });
    S.metal({ at: 0.01, set: 'plate', f: 700, dur: 0.12, peak: 0.04, click: 0 });
  });
  def('bm-ormun-m-fall', 'imp', S => {             // a pan struck and ringing: a vast blow, the water slapped off the rim, the chains jolting, the pan ringing like a bell hung wrong
    S.space('hall', 0.55);
    S.thud({ f: 58, f1: 28, dur: 1.0, drive: 2.2, click: 0.1, lp: 700, peak: 0.6 });
    omToll(S, 0.02, 38, 4.2, 0.3, { a: 0.012, beat: 0.7 });
    S.noise({ at: 0.02, color: 'pink', bp: 700, bp1: 300, q: 0.7, dur: 0.8, pts: [[0.03, 1], [0.8, 0]], peak: 0.2 });
    omLinks(S, 0.06, 4, 0.07, 0.1, { f: 420, f1: 300 });
    S.rumble({ at: 0.02, dur: 1.4, f: 60, peak: 0.2, a: 0.04 });
  });
  def('bm-ormun-m-fall-light', 'imp', S => {       // a pan struck lightly (the pans were level): a shorter blow, a small toll, the same jolt of chain
    S.space('hall', 0.5);
    S.thud({ f: 66, f1: 34, dur: 0.6, drive: 1.4, click: 0.1, lp: 650, peak: 0.35 });
    omToll(S, 0.02, 43, 2.2, 0.14, { a: 0.012, beat: 0.7 });
    omLinks(S, 0.04, 3, 0.08, 0.06, { f: 440, f1: 330 });
  });
  def('bm-ormun-m-fall-bridge', 'imp', S => {      // the bridge struck (too many stood on it): a flat blow of stone on the span, plate rattling on it, grit, no bell
    S.space('hall', 0.4);
    omStone(S, 0, 0.5, { f: 74, dur: 0.6 });
    S.metal({ at: 0.02, set: 'plate', f: 540, dur: 0.7, peak: 0.1, click: 0.3 });
    S.noise({ at: 0.02, color: 'pink', bp: 1600, bp1: 500, q: 0.8, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.14, grain: 0.5 });
  });
  def('bm-ormun-m-hand', 'imp', S => {             // Heavy Hand lands: a colossal fist of stone, water thrown off his sleeve in a sheet, the lowest toll he has, iron ringing under it
    S.space('hall', 0.5);
    S.thud({ f: 50, f1: 24, dur: 1.0, drive: 2.6, click: 0.1, lp: 700, peak: 0.75 });
    S.noise({ at: 0.01, color: 'pink', bp: 1500, bp1: 300, q: 0.7, dur: 0.6, pts: [[0.04, 1], [0.6, 0]], peak: 0.26, grain: 0.3 });
    omToll(S, 0.03, 33, 3.0, 0.2, { a: 0.015 });
    S.metal({ at: 0.02, set: 'plate', f: 200, dur: 0.9, peak: 0.1, click: 0.3 });
    S.rumble({ at: 0.02, dur: 1.2, f: 52, peak: 0.22, a: 0.04 });
  });
  def('bm-ormun-m-tide-in', 'imp', S => {          // The Tide Comes In lands: a wide wash of water over both rims at once, a deep blow under it, no bell
    S.space('hall', 0.55);
    omSea(S, 0, 1.6, 0.3, { f: 1400, f1: 400, low: 500, lap: 0.8, pts: [[0.12, 1], [1.6, 0]] });
    S.thud({ f: 52, f1: 26, dur: 0.9, drive: 2.0, click: 0, lp: 600, peak: 0.55 });
    S.rumble({ at: 0.02, dur: 1.4, f: 64, peak: 0.2, a: 0.05 });
  });
  def('bm-ormun-m-beat', 'imp', S => {             // the light blow that closes an opener: one soft low toll and a link
    S.space('hall', 0.5);
    S.thud({ f: 60, f1: 32, dur: 0.6, drive: 1.2, click: 0, lp: 500, peak: 0.3 });
    omToll(S, 0.02, 36, 2.0, 0.12, { a: 0.02 });
    omLinks(S, 0.05, 2, 0.1, 0.05, { f: 340, f1: 300 });
  });
  def('bm-ormun-m-flood', 'imp', S => {            // the rim floods inward: water rushing in over the stone in a ring, a wash that rises and drains away with a low gurgle
    S.space('hall', 0.5);
    S.noise({ color: 'pink', bp: 400, bp1: 1700, q: 0.7, lp: 3200, dur: 1.3, pts: [[0.2, 1], [1.3, 0]], peak: 0.28, grain: 0.35 });
    S.thud({ at: 0.05, f: 60, f1: 32, dur: 0.6, click: 0, lp: 500, peak: 0.4 });
    S.noise({ at: 0.4, color: 'brown', lp: 400, lp1: 120, dur: 1.0, pts: [[0.15, 1], [1.0, 0]], peak: 0.2 });
    S.tone({ at: 0.5, f: 180, f1: 70, dur: 0.9, a: 0.1, peak: 0.04, lp: 500 });
  });
  def('bm-ormun-m-lap', 'bm', S => {               // water lapping onto the low pan's rim: a soft sheet of water over stone and one small drop
    S.space('hall', 0.4);
    S.noise({ color: 'pink', bp: 500, bp1: 900, q: 0.8, lp: 1800, dur: 0.9, pts: [[0.3, 1], [0.9, 0]], peak: 0.1, grain: 0.3 });
    omDrip(S, 0.35, 0.025, 520);
  });
  def('bm-ormun-m-rise', 'bm', S => {              // a drowned thing climbing onto the pan: water sheeting off stone, a hand dragged over it, a low blow as it comes up
    S.space('hall', 0.45);
    S.noise({ color: 'pink', bp: 1400, bp1: 400, q: 0.7, lp: 3000, dur: 0.9, pts: [[0.1, 1], [0.9, 0]], peak: 0.15, grain: 0.35 });
    S.scrape({ at: 0.15, f: 500, q: 2, rate: 12, dur: 0.5, pts: [[0.15, 1], [0.5, 0]], peak: 0.05 });
    S.thud({ at: 0.5, f: 70, f1: 40, dur: 0.35, click: 0, lp: 400, peak: 0.25 });
  });
  def('bm-ormun-m-bite', 'imp', S => {             // a drowned thing's bite: a wet snap and a short splash
    S.wood({ f: 600, dur: 0.08, peak: 0.2 });
    S.noise({ at: 0.01, color: 'pink', bp: 1800, bp1: 600, q: 0.8, dur: 0.25, pts: [[0.03, 1], [0.25, 0]], peak: 0.12 });
    S.thud({ at: 0.01, f: 100, f1: 50, dur: 0.15, click: 0, lp: 500, peak: 0.2 });
  });
  def('bm-ormun-m-sink', 'bm', S => {              // a drowned thing going under: water closing over, a falling drop, a low gurgle
    S.space('hall', 0.45);
    S.noise({ color: 'pink', bp: 900, bp1: 200, q: 0.7, lp: 2000, dur: 0.9, pts: [[0.08, 1], [0.9, 0]], peak: 0.12 });
    S.tone({ at: 0.05, f: 420, f1: 210, dur: 0.5, a: 0.02, peak: 0.04, lp: 1200 });
  });
  def('bm-ormun-m-scatter', 'imp', S => {          // a cradle struck: the weight on it split with a great dull blow, a crack through the stone, silver pieces thrown out ringing
    S.space('hall', 0.5);
    S.thud({ f: 56, f1: 28, dur: 0.7, drive: 2.0, click: 0.1, lp: 650, peak: 0.55 });
    S.crack({ at: 0.01, peak: 0.16, dur: 0.14, f: 1300 });
    S.coins({ at: 0.03, n: 7, f: 2600, spread: 0.2, peak: 0.12 });
    S.rumble({ at: 0.02, dur: 0.9, f: 60, peak: 0.16, a: 0.04 });
  });
  def('bm-ormun-m-roll', 'bm', S => {              // one silver piece rolling away across the pan: a thin rattle sliding off, slowing, one last small ring as it comes to rest in its cradle
    S.noise({ color: 'white', bp: 1800, bp1: 900, q: 2, lp: 4000, dur: 0.7, pts: [[0.1, 1], [0.6, 0.6], [0.7, 0]], peak: 0.09, am: [22, 0.6], grain: 0.5 });
    S.metal({ at: 0.65, set: 'bar', f: 2400, dur: 0.4, peak: 0.04, click: 0, strike: 0.2 });
  });
  def('bm-ormun-m-throw', 'bm', S => {             // thrown across by the tip: a rush of air and water pouring off, a heavy low landing
    S.space('hall', 0.45);
    S.whoosh({ color: 'pink', f: 300, f1: 2000, dur: 0.7, peakAt: 0.4, q: 0.9, peak: 0.2 });
    S.noise({ at: 0.05, color: 'pink', bp: 900, bp1: 1500, q: 0.6, dur: 0.6, pts: [[0.2, 1], [0.6, 0]], peak: 0.06, grain: 0.3 });
    S.thud({ at: 0.62, f: 66, f1: 34, dur: 0.4, click: 0.1, lp: 500, peak: 0.3 });
  });
  def('bm-ormun-m-burden', 'bm', S => {            // the weight settles on you: a block of stone sinking, two links going taut, a low note falling
    S.space('hall', 0.4);
    omStone(S, 0, 0.26, { f: 56 });
    omLinks(S, 0.08, 2, 0.12, 0.08, { f: 280, f1: 240 });
    S.tone({ at: 0.05, f: mf(40), f1: mf(33), dur: 0.7, a: 0.03, peak: 0.07, lp: 400 });
  });
  def('bm-ormun-m-buoy', 'bm', S => {              // weightless: a soft clear note rising away, two drops lifted off, a faint sweep of air up
    S.space('hall', 0.45);
    S.tone({ f: mf(79), f1: mf(86), dur: 1.0, a: 0.25, lp: 3500, peak: 0.07 });
    omDrip(S, 0.1, 0.03, 800, -0.3); omDrip(S, 0.35, 0.03, 1050, 0.3);
    S.whoosh({ color: 'pink', f: 600, f1: 2400, dur: 0.6, peakAt: 0.7, peak: 0.04 });
  });
  def('bm-ormun-m-mark', 'bm', S => {              // a sign over you before a weight falls: one small iron tick and a low knock
    S.metal({ set: 'bar', f: 900, dur: 0.3, peak: 0.05, strike: 0.2 });
    S.thud({ at: 0.01, f: 80, f1: 50, dur: 0.18, click: 0, lp: 400, peak: 0.12 });
  });
  def('bm-ormun-m-exact', 'bm', S => {             // Exact Measure names its number: one dry stone knock for each (called once per stroke) and a thin pure note over it
    S.wood({ f: 800, dur: 0.06, peak: 0.25 });
    S.partials({ set: 'bar', f: mf(76), dur: 0.7, peak: 0.05, strike: 0.2 });
    S.thud({ f: 90, f1: 55, dur: 0.15, click: 0, lp: 500, peak: 0.2 });
  });
  def('bm-ormun-m-bell', 'bm', S => {              // the bell on the chain tolls the count: one slow stroke of the huge bell (called once for each, climbing a step on each)
    S.space('hall', 0.6);
    omToll(S, 0, 40, 3.2, 0.26, { a: 0.02, beat: 0.7 });
    S.thud({ f: 56, f1: 30, dur: 0.6, click: 0, lp: 400, peak: 0.25 });
  });
  def('bm-ormun-m-swing', 'bm', S => {             // the count came out exactly level and nobody was struck: the beam swings hard, the pans lurch, water sloshes off each, two tolls a fifth apart ring together
    S.space('hall', 0.6);
    omBeam(S, 0, 1.2, 0.1, { f: 8, f1: 22, pts: [[0.5, 1], [1.2, 0]] });
    omLinks(S, 0.1, 6, 0.08, 0.09, { f: 360, f1: 520, acc: 0.95, pan: -0.5, pan1: 0.5 });
    S.noise({ at: 0.2, color: 'pink', bp: 1000, bp1: 400, q: 0.7, dur: 1.0, pts: [[0.15, 1], [1.0, 0]], peak: 0.12, grain: 0.3, pan: -0.6 });
    S.noise({ at: 0.35, color: 'pink', bp: 1000, bp1: 400, q: 0.7, dur: 1.0, pts: [[0.15, 1], [1.0, 0]], peak: 0.12, grain: 0.3, pan: 0.6 });
    omToll(S, 0.5, 38, 3.6, 0.14, { pan: -0.4 }); omToll(S, 0.55, 45, 3.4, 0.12, { pan: 0.4 });
  });
  // the room's bed: the night sea a long way below the pans. Almost nothing: a very deep swell, slow water on stone, drops now and then off his sleeves, a chain shifting once in a long while
  loop('amb-ormun-scales', 'amb', L => {
    const deep = L.c(L.src('brown', 0.7), L.f('lowpass', 130), L.g(0.4)); L.lfo(deep.gain, 0.021, 0.15); deep.connect(L.out);
    const sea = L.c(L.src('pink', 0.8), L.f('bandpass', 520, 0.6)), sg = L.g(0.05); L.lfo(sea.frequency, 0.037, 180); L.lfo(sg.gain, 0.083, 0.035); L.c(sea, sg, L.out);
    L.c(L.src(waterBuf(L.ctx), 0.55), L.f('bandpass', 700, 1.2), L.g(0.04), L.out);
    L.c(L.crackle(0.1), L.f('bandpass', 700, 6), L.g(0.04), L.out);
    const sub = L.c(L.osc('sine', 38), L.g(0.03)); L.lfo(sub.gain, 0.017, 0.015); sub.connect(L.out);
  }, 3);

  // ============================================================================================== Maelis Orne, the Pale Regent (Season 2, boss XVI: the Face of the Moon)
  // Cold, high and clear: the face of the moon under a black sky, with no air to carry anything far, so every sound is close, thin and followed by a long silence. She never speaks, breathes or steps: her
  // voice is struck glass (a pure high note with its glass harmonics), a blade bowed like a saw (a slow saw drawn through a closing filter, the rosin hissing), breath on frost (a thin high band of air) and, once in
  // a long while, one distant bell. The crown's phase is a nested chord, so a cut can be told by ear before it lands: a crescent is one thin note (A6), a half is two (E6 and A6), a gibbous four, the full moon the
  // whole chord down to its low A; waxing climbs the notes (low to high) and waning falls (high to low), and a dance rides its phases, its landings climbing or falling with it. The dark of the crown (umbral, the
  // eclipse) is the same notes turned over: bowed, low, falling and beating, with no glass in them. In her second form the hound's breath joins hers (gwSniff, gwBreath and gwPaws, Garrow's own toolkit, a little
  // colder and set on moon dust: no snow, no wind). The casts are the builds and each ends on a held silence, never on a blow: a landing sounds from its telegraph tag, exactly on its beat (the m- cues,
  // sound-hooks.js "maelis" block). The staged beats (bm-maelis-w-) are walls/maelis.js's.
  const MLP = { crescent: [93], half: [88, 93], gibbous: [81, 88, 93, 97], full: [57, 64, 69, 76, 81, 88, 93, 97] };   // the phases as nested chords (MIDI notes)
  const mlGl = (S, at, m, dur, pk, pan = 0) => S.glass({ at, f: mf(m), dur, peak: pk, pan });   // a struck glass note: pure, high and quiet
  const mlBow = (S, at, m, dur, pk, o = {}) => {                  // a bowed blade: two saws a hair apart through a closing filter, vibrato late, rosin in the air (o.m1: the note drawn to)
    const f = mf(m), a = Math.min(o.a == null ? dur * 0.55 : o.a, dur * 0.85), pts = [[a, 1], [Math.max(a + 0.05, dur - 0.2), 0.8], [dur, 0]], f1 = o.m1 ? mf(o.m1) : null, lp = o.lp || f * 2.6;
    S.tone({ at, type: 'sawtooth', f, f1, dur, pts, peak: pk, lp, vib: [5.3, 0.004, dur * 0.3], pan: o.pan });
    S.tone({ at, type: 'sawtooth', f: f * 1.003, f1: f1 ? f1 * 1.003 : null, dur, pts, peak: pk * 0.6, lp, pan: o.pan });
    S.noise({ at, color: 'white', bp: f * 2.4, q: 5, hp: 1200, dur, pts, peak: pk * 0.1, pan: o.pan });
  };
  const mlAir = (S, at, dur, pk, pan = 0, f = 4600) => S.noise({ at, color: 'white', bp: f, bp1: f * 0.85, q: 2.4, hp: 2600, dur, pts: [[dur * 0.55, 1], [dur, 0]], peak: pk, pan });   // breath on frost: a thin high band that swells and lets go
  const mlHold = (S, at, dur, pk) => {                            // the held silence: a hair of frost drawn in and cut dead, one high note under it, and then nothing at all
    S.noise({ at, color: 'white', bp: 6400, bp1: 7800, q: 3, hp: 4200, dur, pts: [[dur * 0.92, 1], [dur, 0]], peak: pk });
    S.tone({ at, f: mf(100), f1: mf(101), dur, pts: [[dur * 0.9, 1], [dur, 0]], peak: pk * 0.3, lp: 8000 });
  };
  const mlBell = (S, at, m, dur, pk, pan = 0) => S.partials({ at, set: 'church', f: mf(m), dur, a: 0.02, beat: 0.5, peak: pk, spread: 5, lp: 3000, pan, rev: 1.1 });   // one distant bell
  const mlDraw = (S, at, dur, pk, pan = 0, up = 1) => {           // a silver line drawn: a very narrow band of air sweeping high, thinner and higher than a blade on steel
    S.noise({ at, color: 'white', bp: up ? 2400 : 5800, bp1: up ? 5800 : 2400, q: 5, dur, fd: dur, pts: [[dur * (up ? 0.85 : 0.15), 1], [dur, 0]], peak: pk, pan });
    S.glass({ at: at + (up ? dur * 0.9 : 0), f: mf(up ? 98 : 93), dur: 0.8, peak: pk * 0.3, pan });
  };
  const mlShim = (S, at, dur, pk, pan = 0) => S.sizzle({ at, hp: 6500, lp: 13000, dur, pts: [[dur * 0.45, 1], [dur, 0]], peak: pk, am: [0.5, 0.6], pan });   // the faint high shimmer of glass dust
  const mlPhase = (S, ph, at, step, pk, o = {}) => {              // a phase sounded: its nested chord, note by note (o.wane: from the top down), each held and let go
    const ns = MLP[ph].slice(); if (o.wane) ns.reverse();
    ns.forEach((m, i) => mlGl(S, at + i * step, m + (o.up || 0), o.dur || 2.0, pk / Math.sqrt(ns.length) * (m < 70 ? 0.8 : 1), o.pan || 0));
  };
  const mlUmb = (S, at, m, dur, pk, o = {}) => {                  // the dark of the crown: the same notes bowed low, falling and beating, with no glass in them
    const f = mf(m), pts = [[dur * 0.3, 1], [dur * 0.8, 0.7], [dur, 0]], lp = Math.min(2200, f * 3);
    S.tone({ at, type: 'tri', f, f1: f * 0.94, dur, pts, peak: pk, lp, pan: o.pan });
    S.tone({ at, type: 'tri', f: f * 1.011, f1: f * 0.95, dur, pts, peak: pk * 0.8, lp, pan: o.pan });
  };
  const mlDust = (S, at, pk, pan = 0) => S.noise({ at, color: 'pink', lp: 1400, hp: 250, dur: 0.22, pts: [[0.02, 1], [0.22, 0]], peak: pk, pan });   // moon dust: a dry flump with no air in it
  const mlPaws = (S, at, n, gap, pk, o = {}) => {                 // the hound's paws on moon dust: Garrow's soft thump and dry crunch, set higher and drier (no snow to muffle it), a mid knock on each so it carries
    for (let i = 0; i < n; i++) {
      const t = at + i * gap + (i % 2 ? gap * 0.1 : 0), f = (o.f || 190) * (i % 2 ? 0.9 : 1), pan = o.pan != null ? o.pan : Math.sin(i * 1.3) * 0.25, p2 = pk * (o.fade ? 1 - 0.8 * i / n : 1 - (i % 3) * 0.1);
      S.thud({ at: t, f, f1: f * 0.6, dur: 0.14, peak: p2 * 0.6, click: 0, lp: 800, pan });
      S.noise({ at: t, color: 'pink', bp: 1300, q: 0.8, hp: 700, lp: 5200, dur: 0.08, pts: [[0.012, 1], [0.08, 0]], peak: p2 * 1.2, grain: 0.6, pan });
    }
  };

  // her entrance: a breath on frost, one far bell, a blade bowed up a fifth, the crown lit a phase at a time (crescent, half, gibbous, full), and the hush
  def('bm-maelis-intro', 'sting', S => {
    S.space('hall', 0.9);
    mlAir(S, 0.2, 2.4, 0.05, 0, 4200);
    mlBell(S, 0.8, 64, 4.0, 0.1);
    mlBow(S, 1.4, 69, 3.2, 0.05, { m1: 76, a: 2.0, lp: 2600 });
    [[2.5, 'crescent'], [3.1, 'half'], [3.7, 'gibbous']].forEach(([t, ph], i) => mlPhase(S, ph, t, 0.07, 0.05, { dur: 2.0, pan: (i - 1) * 0.25 }));
    mlPhase(S, 'full', 4.4, 0.1, 0.06, { dur: 3.0 });
    mlHold(S, 5.6, 0.8, 0.035);
  });
  // ---- the openers: each lights the crown its own way, then holds
  def('bm-maelis-moonrise', 'bm', S => {          // the act opens: the moon coming up over a black edge: one bowed note climbing a fourth, a breath on frost, one far bell, the crescent lit last
    S.space('hall', 0.85);
    mlBow(S, 0.1, 64, 2.0, 0.055, { m1: 69, a: 1.2 });
    mlAir(S, 0.2, 1.7, 0.04, -0.2);
    mlBell(S, 0.8, 57, 2.0, 0.07);
    mlGl(S, 1.5, 93, 1.4, 0.06, 0.2);
    mlHold(S, 1.9, 0.5, 0.03);
  });
  def('bm-maelis-the-waxing', 'bm', S => {        // the second act: the crown waxing in front of you, three chords climbing (crescent, half, gibbous), the blade drawn up under them
    S.space('hall', 0.8);
    mlBow(S, 0.1, 57, 2.4, 0.05, { m1: 69, a: 1.6 });
    [[0.35, 'crescent'], [0.9, 'half'], [1.45, 'gibbous']].forEach(([t, ph]) => mlPhase(S, ph, t, 0.08, 0.055, { dur: 1.6 }));
    mlAir(S, 0.3, 1.8, 0.03, 0.2, 6000);
    mlHold(S, 2.2, 0.5, 0.03);
  });
  def('bm-maelis-hunters-moon', 'bm', S => {      // the second half of the hunt: the hound's breath beside the bowed blade, three paws on moon dust, one bell, a high note over it
    S.space('hall', 0.7);
    mlBow(S, 0.1, 57, 2.2, 0.05, { m1: 64, a: 1.2 });
    gwBreath(S, 0.3, 1.3, 0.05, 1500, -0.2);
    mlPaws(S, 0.9, 3, 0.2, 0.05, { f: 100, pan: 0.2 });
    mlBell(S, 1.1, 64, 2.0, 0.07);
    mlGl(S, 1.6, 100, 1.0, 0.04);
    mlHold(S, 2.1, 0.5, 0.03);
  });
  // ---- the cuts of one phase: a crescent is a thin sound, a half two voices, a gibbous full, the full moon the whole chord
  def('bm-maelis-crescent', 'bm', S => {          // one thin note and a narrow line of air, a glass tremble on it, the line drawn high; nothing else
    S.space('hall', 0.8);
    mlAir(S, 0.2, 2.6, 0.035, 0.15, 6800);
    mlGl(S, 0.7, 93, 2.6, 0.07);
    S.tone({ at: 0.9, f: mf(93), dur: 2.0, a: 0.8, peak: 0.025, am: [6.5, 0.7], lp: 5000 });
    mlDraw(S, 1.6, 1.0, 0.08, 0.3, 1);
    mlHold(S, 3.0, 0.7, 0.03);
  });
  def('bm-maelis-half-moon', 'bm', S => {         // two notes (a fifth) and a broader frost, a bowed note below them, the line drawn from the left
    S.space('hall', 0.8);
    mlBow(S, 0.2, 76, 2.8, 0.04, { a: 1.6 });
    mlPhase(S, 'half', 0.8, 0.35, 0.07, { dur: 2.6 });
    mlAir(S, 0.4, 2.4, 0.04, -0.2, 5400);
    mlDraw(S, 1.7, 1.1, 0.1, -0.3, 1);
    mlHold(S, 3.1, 0.7, 0.03);
  });
  def('bm-maelis-gibbous', 'bm', S => {           // four notes, a bowed fifth under them, a wide frost and a bell: the fullest of her single cuts
    S.space('hall', 0.85);
    mlBow(S, 0.1, 69, 3.0, 0.05, { m1: 76, a: 1.8 });
    mlPhase(S, 'gibbous', 0.6, 0.28, 0.08, { dur: 2.8 });
    mlAir(S, 0.3, 2.8, 0.05, 0, 4400);
    mlBell(S, 1.6, 64, 2.4, 0.07);
    mlDraw(S, 1.9, 1.2, 0.11, 0, 1);
    mlHold(S, 3.3, 0.6, 0.03);
  });
  def('bm-maelis-full-moon', 'bm', S => {         // the whole chord assembling note by note from its low A up to the top, a bell, the dust of glass; held before the blow
    S.space('hall', 0.9);
    MLP.full.forEach((m, i) => mlGl(S, 0.1 + i * 0.3, m, 3.0 - i * 0.2, 0.05, i % 2 ? 0.25 : -0.25));
    mlBow(S, 0.1, 57, 2.6, 0.05, { a: 1.8 });
    mlBell(S, 1.4, 64, 2.8, 0.07);
    mlShim(S, 1.0, 1.8, 0.03);
    mlHold(S, 2.6, 0.5, 0.04);
  });
  def('bm-maelis-umbral-crescent', 'bm', S => {   // the dark of a crescent (a gibbous in the dark): four bowed notes falling one after another with no glass among them, a low breath
    S.space('hall', 0.9);
    [[0.1, 76], [0.5, 69], [0.9, 64], [1.3, 57]].forEach(([t, m], i) => mlUmb(S, t, m, 2.2, 0.06, { pan: i % 2 ? 0.3 : -0.3 }));
    mlAir(S, 0.2, 2.8, 0.03, 0, 2600);
    S.rumble({ at: 0.2, dur: 2.4, f: 80, peak: 0.07, a: 1.4 });
    mlHold(S, 3.0, 0.6, 0.03);
  });
  def('bm-maelis-umbral-half-moon', 'bm', S => {  // the dark of a half: two bowed notes falling a fifth together, a hollow beating between them
    S.space('hall', 0.9);
    mlUmb(S, 0.2, 69, 2.6, 0.065, { pan: -0.3 }); mlUmb(S, 0.7, 62, 2.4, 0.06, { pan: 0.3 });
    S.tone({ at: 0.4, f: mf(64), dur: 2.2, a: 1.0, peak: 0.03, lp: 1200, am: [3.5, 0.7] });
    mlAir(S, 0.3, 2.4, 0.03, 0, 2400);
    mlHold(S, 3.0, 0.6, 0.03);
  });
  def('bm-maelis-earthshine', 'bm', S => {        // the tank's cut and its pale second: a long blade-note drawn up, a pale fifth lit above it, the line drawn through, held
    S.space('hall', 0.8);
    mlBow(S, 0.2, 64, 3.0, 0.06, { a: 2.0, lp: 1800 });
    mlGl(S, 1.2, 81, 2.0, 0.055, -0.2); mlGl(S, 2.0, 88, 1.6, 0.035, 0.3);
    mlDraw(S, 1.9, 1.0, 0.1, 0, 1);
    mlHold(S, 3.2, 0.6, 0.03);
  });
  def('bm-maelis-moonwell', 'bm', S => {          // shafts of light, one after the other: each a pure held note with a slow shimmer in it and light falling from above (a high band sweeping down)
    S.space('hall', 0.85);
    [[0.4, 88, -0.45], [1.3, 93, 0.45]].forEach(([t, m, pan]) => {
      S.tone({ at: t, f: mf(m), dur: 2.6, a: 0.6, peak: 0.05, lp: 4500, am: [3, 0.4], pan });
      S.whoosh({ at: t, color: 'white', f: 9000, f1: 3500, q: 5, dur: 0.9, peakAt: 0.3, peak: 0.07, pan });
    });
    mlBell(S, 2.1, 69, 2.2, 0.06);
    mlHold(S, 3.5, 0.6, 0.03);
  });
  def('bm-maelis-moonlets', 'bm', S => {          // small moons set to fall: soft round notes dropping one after another down the left and the right, a thin shimmer
    S.space('hall', 0.8);
    [[0.3, 88, -0.5], [0.8, 84, 0.5], [1.3, 81, -0.4], [1.7, 78, 0.4], [2.1, 76, 0]].forEach(([t, m, pan]) => {
      S.tone({ at: t, f: mf(m), dur: 1.0, pts: [[0.02, 1], [1.0, 0]], peak: 0.05, lp: 3500, pan });
      S.glass({ at: t, f: mf(m + 12), dur: 0.5, peak: 0.02, pan });
    });
    mlShim(S, 0.4, 2.0, 0.025);
    mlHold(S, 2.8, 0.6, 0.03);
  });
  // ---- the dances: four phases in the moon's order, the blade drawn up (waxing) or down (waning) under them; the cuts themselves are the moments'
  const mlDance = (S, o) => {
    const dir = o.dir || 1, ph = dir > 0 ? ['crescent', 'half', 'gibbous', 'full'] : ['full', 'gibbous', 'half', 'crescent'];
    S.space('hall', 0.85);
    mlBow(S, 0.2, dir > 0 ? 57 : 81, 8.2, 0.045, { m1: dir > 0 ? 81 : 57, a: 4.2, lp: 3000 });
    ph.forEach((p, k) => mlPhase(S, p, 0.9 + k * 2.0, 0.09, 0.05 + 0.008 * k, { dur: 2.4, wane: dir < 0, pan: k % 2 ? 0.3 : -0.3 }));
    mlAir(S, 1.2, 6.0, 0.03, 0, dir > 0 ? 4600 : 6200);
    if (o.moons) { [1.6, 3.2, 4.8, 6.4].forEach((t, i) => S.tone({ at: t, f: mf(76 + i * 2), dur: 0.9, pts: [[0.03, 1], [0.9, 0]], peak: 0.04, lp: 3000, pan: i % 2 ? 0.4 : -0.4 })); S.tone({ at: 6.6, f: mf(81), dur: 1.8, a: 1.4, swell: true, peak: 0.04, lp: 3500 }); }
    if (o.dark) { mlUmb(S, 3.4, 64, 2.4, 0.06, { pan: -0.3 }); mlUmb(S, 5.4, 57, 2.4, 0.06, { pan: 0.3 }); S.tone({ at: 3.0, f: mf(52), dur: 5.0, a: 2.0, peak: 0.03, lp: 700, am: [2.2, 0.8] }); }
    if (o.bell) mlBell(S, 7.0, 69, 2.4, 0.07);
    mlHold(S, 8.8, 0.7, 0.035);
  };
  def('bm-maelis-waxing-dance', 'bm', S => mlDance(S, { dir: 1 }));
  def('bm-maelis-waning-dance', 'bm', S => mlDance(S, { dir: -1 }));
  def('bm-maelis-harvest', 'bm', S => mlDance(S, { dir: 1, moons: 1, bell: 1 }));
  def('bm-maelis-blood-moon-dance', 'bm', S => mlDance(S, { dir: -1, dark: 1 }));
  def('bm-maelis-blood-harvest', 'bm', S => mlDance(S, { dir: 1, moons: 1, dark: 1 }));
  def('bm-maelis-the-last-dance', 'bm', S => {    // lit and umbral alternating up the chord, a glass note and then a dark one, six steps and the blade drawn up two octaves under them; ends before the full moon
    S.space('hall', 0.9);
    mlBow(S, 0.3, 57, 10.0, 0.05, { m1: 93, a: 6.0, lp: 3500 });
    const lit = [[0.8, 'crescent'], [3.9, 'half'], [7.0, 'gibbous']];
    lit.forEach(([t, ph]) => mlPhase(S, ph, t, 0.1, 0.06, { dur: 2.2 }));
    [[2.35, 76], [5.45, 69], [8.55, 62]].forEach(([t, m], i) => { mlUmb(S, t, m, 2.0, 0.065, { pan: i % 2 ? 0.3 : -0.3 }); mlUmb(S, t + 0.12, m - 7, 1.9, 0.045, { pan: i % 2 ? -0.3 : 0.3 }); });
    mlAir(S, 1.0, 9.0, 0.03, 0, 5600);
    mlBell(S, 6.0, 64, 3.4, 0.07);
    mlHold(S, 10.8, 0.7, 0.04);
  });
  def('bm-maelis-the-second-howl', 'bm', S => {   // Extreme, in the middle of the last dance: Garrow's long howl come back, low and far (his note, the lake's slap-back left to ring), her blade bowed up a fifth under it as if to answer him, one glass note on the crown; it sits below the dance's chord and leaves the shade's own sound (m-shade) for the run
    S.space('hall', 0.8);
    gwHowl(S, 0.1, 3.0, 0.12, 150);
    gwWind(S, 0, 3.4, 0.03, 220, 600, 0.5);
    mlBow(S, 0.5, 50, 2.6, 0.04, { m1: 57, a: 1.6, lp: 1200 });
    mlGl(S, 1.7, 76, 1.4, 0.025, 0.3);
  });
  // ---- the wall and the hunt
  def('bm-maelis-new-moon', 'bm', S => {          // the crown going dark: the whole chord struck once, the blade bowed down through it, the frost drawn out of the air and held; the dark itself is staged
    S.space('hall', 0.9);
    mlPhase(S, 'full', 0.05, 0.06, 0.07, { dur: 1.5 });
    mlBow(S, 0.1, 81, 1.3, 0.05, { m1: 57, a: 0.3 });
    mlAir(S, 0.2, 1.1, 0.04, 0, 6400);
    mlHold(S, 1.2, 0.4, 0.03);
  });
  def('bm-maelis-moonless-steps', 'bm', S => {    // the sword dance in the dark: a low bowed note and its dark twin, six thin silver ticks climbing with a glass note on each, long silences between
    S.space('hall', 0.9);
    mlUmb(S, 0.2, 64, 6.0, 0.05); mlBow(S, 0.5, 69, 6.0, 0.03, { a: 3.0, lp: 1400 });
    for (let i = 0; i < 6; i++) { const t = 1.2 + i * 1.0, pan = i % 2 ? 0.4 : -0.4; S.metal({ at: t, set: 'bar', f: 3000 + i * 180, dur: 0.16, peak: 0.045, strike: 0.2, pan }); mlGl(S, t + 0.02, 81 + [0, 2, 4, 7, 9, 12][i], 1.4, 0.05, pan); }
    mlHold(S, 7.4, 0.7, 0.03);
  });
  def('bm-maelis-the-last-light', 'bm', S => {    // the last of the light drawn in: motes of glass from every side, closing in faster and faster toward the middle, a soft chord swelling under them; held
    S.space('hall', 0.85);
    for (let i = 0; i < 10; i++) { const x = i / 9, t = 0.2 + 2.3 * (1 - Math.pow(1 - x, 1.7)); mlGl(S, t, 88 + (i % 3) * 5, 1.0, 0.035, (i % 2 ? 1 : -1) * 0.7 * (1 - x)); }
    S.tone({ at: 0.4, f: mf(76), dur: 2.6, a: 1.8, swell: true, peak: 0.05, lp: 3000 }); S.tone({ at: 0.6, f: mf(81), dur: 2.4, a: 1.6, swell: true, peak: 0.04, lp: 3000 });
    mlHold(S, 2.6, 0.5, 0.03);
  });
  def('bm-maelis-the-hounds-return', 'bm', S => { // almost nothing: the road is quiet, a breath on frost, one long thin bowed note and a far glass note; his howl is the staged beat's and nothing here may cover it
    S.space('hall', 0.9);
    mlAir(S, 0.3, 2.2, 0.025, 0, 3800);
    mlBow(S, 0.6, 60, 2.0, 0.03, { a: 1.4, lp: 1100 });
    mlGl(S, 1.4, 76, 1.6, 0.035, 0.3);
    mlHold(S, 2.2, 0.5, 0.02);
  });

  def('bm-maelis-hunts-pass', 'bm', S => {        // she rides a marked trail as the hound did: two cold sniffs and the close breath (his), a bowed note rising, the footprints lit one by one, a few far paws; held
    S.space('hall', 0.8);
    gwSniff(S, 0.3, 0.12, -0.3, 1.2); gwSniff(S, 0.8, 0.14, 0.3, 1.2);
    gwBreath(S, 1.3, 1.2, 0.07, 1600);
    mlBow(S, 0.4, 64, 2.8, 0.045, { m1: 76, a: 2.0 });
    for (let i = 0; i < 8; i++) S.glass({ at: 1.6 + i * 0.14, f: 3000 + i * 350, dur: 0.35, peak: 0.03, pan: -0.4 + i * 0.11 });
    mlPaws(S, 2.9, 4, 0.16, 0.05, { fade: 1 });
    mlHold(S, 3.6, 0.6, 0.03);
  });
  def('bm-maelis-the-long-eclipse', 'bm', S => {  // the crown dimming: the whole chord struck once and then taken from the top down by dark bowed notes falling through it; held (the red itself is staged)
    S.space('hall', 0.9);
    mlPhase(S, 'full', 0.05, 0.1, 0.07, { dur: 1.6 });
    mlUmb(S, 0.6, 69, 1.6, 0.06, { pan: -0.3 }); mlUmb(S, 0.9, 62, 1.5, 0.055, { pan: 0.3 });
    mlAir(S, 0.2, 1.4, 0.03, 0, 3000);
    mlHold(S, 1.7, 0.5, 0.03);
  });
  def('bm-maelis-totality', 'bm', S => {          // the enrage: the blade drawn up two octaves over six seconds, the phases cycling faster and faster, a far low bell, then the chord reddening (dark notes falling through it) and the hold
    S.space('hall', 0.95);
    mlBow(S, 0.2, 57, 6.0, 0.06, { m1: 93, a: 5.0, lp: 4200 });
    mlBell(S, 0.6, 52, 5.5, 0.09);
    let t = 0.3, g = 1.9, k = 0;
    while (t < 4.8) { ['crescent', 'half', 'gibbous', 'full'].forEach((ph, i) => mlPhase(S, ph, t + g * i * 0.25, 0.04, 0.045, { dur: Math.max(0.8, g * 0.9), pan: Math.sin(k++ * 1.7) * 0.4 })); t += g; g *= 0.74; }
    [[4.9, 76], [5.2, 69], [5.5, 64], [5.8, 57]].forEach(([tt, m], i) => mlUmb(S, tt, m, 1.0, 0.06, { pan: i % 2 ? 0.3 : -0.3 }));
    mlAir(S, 0.5, 5.4, 0.04, 0, 5600);
    mlHold(S, 6.1, 0.4, 0.035);
  });
  // ---- Hard and Extreme
  def('bm-maelis-two-crowns', 'bm', S => {        // two crowns: her reflection in the dust shows its own phase; a half in front and a gibbous behind it a shade out of tune, one on either side, the line drawn between them
    S.space('hall', 0.85);
    mlPhase(S, 'half', 0.4, 0.2, 0.06, { pan: -0.5, dur: 2.4 });
    mlPhase(S, 'gibbous', 1.1, 0.18, 0.045, { pan: 0.5, dur: 2.2, up: 0.35 });
    mlAir(S, 0.4, 2.6, 0.035, 0, 5200);
    mlDraw(S, 2.0, 1.0, 0.08, 0, 1);
    mlHold(S, 3.4, 0.6, 0.03);
  });

  def('bm-maelis-annular', 'bm', S => {           // a ring of light: a rim tone (a glass sung round its edge, a beating pair) and the light spreading outward from the middle in two bands, a bell behind it; held
    S.space('hall', 0.85);
    S.partials({ at: 0.3, set: 'bar', f: mf(81), dur: 2.8, beat: 2.4, a: 1.2, swell: true, peak: 0.07 });
    S.whoosh({ at: 0.8, color: 'pink', f: 800, f1: 6500, dur: 1.6, peakAt: 0.8, q: 3, peak: 0.08 });
    S.whoosh({ at: 1.2, color: 'pink', f: 700, f1: 5200, dur: 1.4, peakAt: 0.8, q: 3, peak: 0.06, pan: 0.3 });
    mlBell(S, 1.5, 69, 2.2, 0.06);
    mlHold(S, 3.2, 0.6, 0.03);
  });
  def('bm-maelis-libration', 'bm', S => {         // the crown rocking: a glass note swaying slowly down and back, a creak of the blade bowed against itself, one dry tick as it stops; held
    S.space('hall', 0.85);
    S.tone({ at: 0.3, f: mf(93), f1: mf(90), glide: 1.8, dur: 3.0, pts: [[0.4, 1], [2.8, 0.8], [3.0, 0]], peak: 0.05, lp: 5000, am: [1.1, 0.8] });
    mlBow(S, 0.3, 76, 3.2, 0.035, { a: 1.8 });
    S.scrape({ at: 1.2, f: 600, q: 3, rate: 14, dur: 1.2, pts: [[0.5, 1], [1.2, 0]], peak: 0.03 });
    S.tick({ at: 3.0, f: 2800, peak: 0.08 });
    mlHold(S, 3.6, 0.6, 0.03);
  });
  def('bm-maelis-moonfall', 'bm', S => {          // one moon coming down on one hero: a long note falling from very high, shimmer trailing behind it, a breath of frost; held before the fall
    S.space('hall', 0.85);
    S.tone({ at: 0.3, f: mf(100), f1: mf(76), glide: 1.9, dur: 2.0, pts: [[0.2, 1], [1.8, 0.7], [2.0, 0]], peak: 0.05, lp: 5000 });
    mlShim(S, 0.5, 1.8, 0.03);
    mlAir(S, 0.8, 1.4, 0.03, 0.2, 3400);
    mlHold(S, 2.2, 0.5, 0.03);
  });
  def('bm-maelis-moon-touched', 'bm', S => {      // two heroes touched: two eyes opening (a high note and a higher one a little apart), and a pair of notes crossing, one rising as one falls; held
    S.space('hall', 0.85);
    mlGl(S, 0.4, 100, 1.6, 0.06, -0.5); mlGl(S, 1.0, 103, 1.4, 0.05, 0.5);
    S.tone({ at: 0.6, f: mf(88), f1: mf(76), dur: 1.8, pts: [[0.6, 1], [1.8, 0]], peak: 0.04, lp: 3500, pan: -0.3 });
    S.tone({ at: 0.6, f: mf(76), f1: mf(88), dur: 1.8, pts: [[0.6, 1], [1.8, 0]], peak: 0.04, lp: 3500, pan: 0.3 });
    mlAir(S, 0.5, 1.8, 0.025, 0, 6000);
    mlHold(S, 2.4, 0.5, 0.03);
  });

  // ---- the moments (sound-hooks.js reads them off the room; every one begins on its beat)
  // the crown changes phase: quiet, the phase as a nested chord (the hook rate-limits it); the waning ones fall from the top
  for (const ph of ['crescent', 'half', 'gibbous', 'full']) for (const wane of [0, 1]) {
    def('bm-maelis-m-crown-' + ph + (wane ? '-wane' : ''), 'bm', S => {
      S.space('hall', 0.7);
      mlPhase(S, ph, 0, ph === 'full' ? 0.1 : 0.11, 0.06, { dur: 1.4, wane });
      if (ph === 'crescent') S.tone({ f: mf(93) * (wane ? 1.03 : 0.97), f1: mf(93) * (wane ? 0.97 : 1.03), dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.02, lp: 5000 });
    });
  }
  def('bm-maelis-m-crown-umbral', 'bm', S => {    // the dark of the crown is what strikes: two bowed notes falling, hollow, no glass (the hook sets the pitch by the phase)
    S.space('hall', 0.7);
    mlUmb(S, 0, 69, 1.4, 0.06); mlUmb(S, 0.12, 62, 1.3, 0.05, { pan: 0.2 });
  });
  def('bm-maelis-m-crown-new', 'bm', S => {       // the crown goes out: one note sinking away, very quiet
    S.space('hall', 0.7);
    S.tone({ f: mf(88), f1: mf(76), dur: 1.4, glide: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.04, lp: 3500 });
  });
  def('bm-maelis-m-crown-ring', 'bm', S => {      // Annular's crown: full with a dark middle: a rim tone, a beating pair, one glass note
    S.space('hall', 0.7);
    S.partials({ set: 'bar', f: mf(81), dur: 1.6, beat: 2.4, peak: 0.06 });
    mlGl(S, 0.05, 93, 1.2, 0.04);
  });
  def('bm-maelis-m-crown2', 'bm', S => {          // her reflection in the dust shows a second crown: a high note and its echo, thin and a step behind
    S.space('hall', 0.9);
    mlGl(S, 0, 96, 1.4, 0.05, 0.4); mlGl(S, 0.26, 96, 1.2, 0.03, -0.4);
  });
  def('bm-maelis-m-rock', 'bm', S => {            // Libration: the crown rocks a quarter turn and stops: a glass note slides down a step, a short bowed creak, a dry tick as it catches
    S.space('hall', 0.6);
    S.tone({ f: mf(93), f1: mf(90), glide: 0.45, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.09, lp: 5000 });
    S.scrape({ at: 0.05, f: 700, q: 3, rate: 16, dur: 0.4, pts: [[0.15, 1], [0.4, 0]], peak: 0.04 });
    S.tick({ at: 0.5, f: 2800, peak: 0.1 });
  });
  def('bm-maelis-m-dance-end', 'bm', S => {       // a dance is over: a breath of frost let go and one note falling after it
    S.space('hall', 0.8);
    mlAir(S, 0, 1.2, 0.05, 0, 4800);
    S.tone({ at: 0.1, f: mf(88), f1: mf(81), dur: 1.4, glide: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.04, lp: 3500 });
  });
  // ---- a cut lands, by phase: thin, two voices, full, the whole chord
  def('bm-maelis-m-cut-crescent', 'imp', S => {   // a crescent lands: thin and bright, one clean high crack, a narrow line of air and a single glass note, only a small knock under it
    S.space('hall', 0.55);
    S.crack({ peak: 0.2, dur: 0.1, f: 4200 });
    mlDraw(S, 0, 0.3, 0.14, 0.1, 0);
    mlGl(S, 0.01, 93, 1.3, 0.14);
    S.thud({ f: 92, f1: 56, dur: 0.22, click: 0, lp: 450, peak: 0.16 });
  });
  def('bm-maelis-m-cut-half', 'imp', S => {       // a half lands: two voices a fifth apart, a broader stroke of air, a knock with some body
    S.space('hall', 0.55);
    S.crack({ peak: 0.26, dur: 0.12, f: 3000 });
    S.whoosh({ color: 'pink', f: 7000, f1: 1500, dur: 0.38, peakAt: 0.12, q: 2.2, peak: 0.2 });
    mlPhase(S, 'half', 0.01, 0.02, 0.12, { dur: 1.5 });
    S.thud({ f: 78, f1: 42, dur: 0.4, click: 0.1, lp: 600, peak: 0.3 });
    S.partials({ at: 0.02, set: 'bar', f: mf(69), dur: 1.0, beat: 1.5, peak: 0.06 });
  });
  def('bm-maelis-m-cut-gibbous', 'imp', S => {    // a gibbous lands: four notes, a wide fall of air, a heavy body and a low ring of its own
    S.space('hall', 0.6);
    S.crack({ peak: 0.3, dur: 0.14, f: 2200 });
    S.whoosh({ color: 'pink', f: 8500, f1: 900, dur: 0.55, peakAt: 0.1, q: 1.4, peak: 0.26 });
    mlPhase(S, 'gibbous', 0.01, 0.02, 0.14, { dur: 1.8 });
    S.thud({ f: 84, f1: 44, dur: 0.5, drive: 1.5, click: 0.12, lp: 800, peak: 0.3 });
    S.partials({ at: 0.02, set: 'bar', f: mf(69), dur: 1.6, beat: 1.4, peak: 0.18 });
    S.rumble({ at: 0.02, dur: 0.7, f: 70, peak: 0.05, a: 0.04 });
  });
  def('bm-maelis-m-full', 'imp', S => {           // the full moon lands: the whole chord struck at once to its low A, the deepest blow of hers, a bell and the long stroke of air
    S.space('hall', 0.65);
    S.thud({ f: 90, f1: 44, dur: 0.9, drive: 1.6, click: 0.1, lp: 1000, peak: 0.28 });
    S.thud({ f: 56, f1: 30, dur: 1.0, click: 0, lp: 400, peak: 0.1 });
    S.noise({ color: 'pink', bp: 700, bp1: 280, q: 0.7, lp: 2400, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.2 });
    S.crack({ peak: 0.3, dur: 0.16, f: 1700 });
    S.whoosh({ color: 'pink', f: 7500, f1: 450, dur: 0.75, peakAt: 0.1, q: 1.2, peak: 0.28 });
    mlPhase(S, 'full', 0.01, 0.018, 0.22, { dur: 2.6 });
    mlBell(S, 0.03, 64, 3.2, 0.22);
    S.partials({ at: 0.02, set: 'bar', f: mf(64), dur: 2.4, beat: 1.2, peak: 0.2 });
    S.rumble({ at: 0.02, dur: 1.4, f: 70, peak: 0.05, a: 0.05 });
  });
  def('bm-maelis-m-cut-ucrescent', 'imp', S => {  // an umbral crescent lands: the dark of a crescent, a gibbous with no light in it: four bowed notes falling together, a band of air closing downward, a hollow blow
    S.space('hall', 0.6);
    S.thud({ f: 62, f1: 30, dur: 0.8, drive: 1.5, click: 0, lp: 520, peak: 0.45 });
    S.noise({ color: 'pink', bp: 3600, bp1: 700, q: 0.8, lp: 3000, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.2 });
    [[0, 76], [0.05, 69], [0.1, 64], [0.15, 57]].forEach(([t, m], i) => mlUmb(S, t, m, 1.4, 0.1, { pan: i % 2 ? 0.3 : -0.3 }));
    S.rumble({ at: 0.02, dur: 1.0, f: 66, peak: 0.16, a: 0.05 });
  });
  def('bm-maelis-m-cut-uhalf', 'imp', S => {      // an umbral half lands: two bowed notes falling a fifth, a hollow beating between them, a dull blow
    S.space('hall', 0.6);
    S.thud({ f: 76, f1: 40, dur: 0.55, click: 0, lp: 560, peak: 0.35 });
    S.noise({ color: 'pink', bp: 3000, bp1: 900, q: 0.8, lp: 2600, dur: 0.45, pts: [[0.05, 1], [0.45, 0]], peak: 0.16 });
    mlUmb(S, 0, 69, 1.2, 0.11, { pan: -0.3 }); mlUmb(S, 0, 62, 1.2, 0.1, { pan: 0.3 });
  });
  def('bm-maelis-m-cut-ring', 'imp', S => {       // Annular lands: the ring of light struck: a band of air thrown outward, a rim tone and a lower one beating, a blow with the middle left out of it
    S.space('hall', 0.6);
    S.thud({ f: 84, f1: 44, dur: 0.6, drive: 1.4, click: 0, lp: 700, peak: 0.26 });
    S.whoosh({ color: 'pink', f: 700, f1: 6000, dur: 0.6, peakAt: 0.5, q: 2.5, peak: 0.26 });
    S.partials({ set: 'bar', f: mf(81), dur: 2.0, beat: 2.2, peak: 0.16, strike: 0.2 });
    S.partials({ at: 0.04, set: 'bar', f: mf(69), dur: 1.6, beat: 1.8, peak: 0.1 });
    S.crack({ peak: 0.16, dur: 0.1, f: 2400 });
  });
  def('bm-maelis-m-open', 'imp', S => {           // the light raidwide of an opener: one soft blow, a distant bell and two glass notes after it
    S.space('hall', 0.6);
    S.thud({ f: 84, f1: 44, dur: 0.5, drive: 1.2, click: 0, lp: 700, peak: 0.22 });
    mlBell(S, 0.02, 69, 2.2, 0.2);
    mlGl(S, 0.04, 88, 1.2, 0.1); mlGl(S, 0.1, 93, 1.0, 0.08);
  });
  def('bm-maelis-m-earth', 'imp', S => {          // Earthshine's cut: the pale light on the tank, a deep blow and a long low ring of silver, a stroke of air, one glass note
    S.space('hall', 0.5);
    S.thud({ f: 100, f1: 50, dur: 0.6, drive: 1.5, lp: 1000, peak: 0.22 });
    S.noise({ color: 'pink', bp: 900, bp1: 350, q: 0.7, lp: 2600, dur: 0.4, pts: [[0.03, 1], [0.4, 0]], peak: 0.2 });
    S.crack({ peak: 0.3, dur: 0.14, f: 1500 });
    S.whoosh({ color: 'pink', f: 5200, f1: 600, dur: 0.45, peakAt: 0.1, q: 1.3, peak: 0.22 });
    S.partials({ at: 0.02, set: 'bar', f: mf(64), dur: 2.4, beat: 1.4, peak: 0.32, strike: 0.2 });
    S.partials({ at: 0.03, set: 'bar', f: mf(76), dur: 1.8, beat: 1.1, peak: 0.12 });
    mlGl(S, 0.03, 81, 1.8, 0.12);
    S.rumble({ at: 0.02, dur: 1.0, f: 70, peak: 0.03, a: 0.04 });
  });
  def('bm-maelis-m-earth2', 'imp', S => {         // the pale second hit, a beat later: higher and thinner, a small blow, two glass notes a fifth apart, a thin stroke
    S.space('hall', 0.55);
    S.thud({ f: 84, f1: 46, dur: 0.35, click: 0.1, lp: 700, peak: 0.28 });
    S.crack({ peak: 0.18, dur: 0.1, f: 2400 });
    S.whoosh({ color: 'pink', f: 7000, f1: 1500, dur: 0.35, peakAt: 0.1, q: 1.8, peak: 0.14 });
    mlGl(S, 0.02, 88, 1.4, 0.1); mlGl(S, 0.06, 93, 1.2, 0.08);
  });
  def('bm-maelis-m-ride', 'bm', S => {            // Earthshine from the saddle: a piece of the trail struck as the rider reaches it: two quick paws and a high tick of silver
    mlPaws(S, 0, 2, 0.07, 0.16, { f: 200, pan: 0 });
    S.wood({ at: 0.01, f: 900, dur: 0.06, peak: 0.1 });
    mlGl(S, 0.01, 98, 0.5, 0.06);
    mlDraw(S, 0.02, 0.18, 0.07, 0, 1);
  });
  // ---- Moonwell
  def('bm-maelis-m-well-met', 'bm', S => {        // a shaft of light caught by two: a pure note rising a step and holding, two glass notes (a fifth) and a thin bell behind
    S.space('hall', 0.6);
    S.tone({ f: mf(88), f1: mf(93), glide: 0.15, dur: 1.2, pts: [[0.05, 1], [0.7, 0.6], [1.2, 0]], peak: 0.1, lp: 4500 });
    mlGl(S, 0.02, 88, 1.4, 0.08, -0.3); mlGl(S, 0.04, 93, 1.4, 0.08, 0.3);
    mlShim(S, 0.1, 0.9, 0.03);
    mlBell(S, 0.1, 69, 1.4, 0.06);
  });
  def('bm-maelis-m-well-missed', 'bm', S => {     // a shaft with only one in it: a dull knock and a dark note falling, a flat tick; quickly gone
    S.space('hall', 0.4);
    S.thud({ f: 74, f1: 40, dur: 0.35, click: 0, lp: 400, peak: 0.3 });
    mlUmb(S, 0, 64, 0.9, 0.09);
    S.wood({ at: 0.04, f: 700, dur: 0.08, peak: 0.1 });
  });
  // ---- Moonlets and Moonfall: a small moon falls, rests where it landed and bursts
  def('bm-maelis-m-mark-moon', 'bm', S => {       // a moon is on you: one soft round note and a tick
    S.tone({ f: mf(88), dur: 0.8, pts: [[0.04, 1], [0.8, 0]], peak: 0.07, lp: 3500 });
    S.tick({ at: 0.01, f: 2600, peak: 0.05 });
  });
  def('bm-maelis-m-moonlet-fall', 'imp', S => {   // a moonlet comes down: a note falling fast from very high, a bright tick, a dull knock of dust, a soft ring where it lands
    S.space('hall', 0.5);
    S.tone({ f: mf(98), f1: mf(76), glide: 0.35, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.08, lp: 5000 });
    S.thud({ at: 0.3, f: 70, f1: 38, dur: 0.4, click: 0.1, lp: 520, peak: 0.4 });
    mlDust(S, 0.3, 0.14);
    S.partials({ at: 0.3, set: 'bar', f: mf(76), dur: 1.0, peak: 0.08, strike: 0.2 });
  });
  def('bm-maelis-m-moonlet-rest', 'bm', S => {    // a moonlet at rest: a round held note breathing slowly, a little glass on it; quiet
    S.space('hall', 0.7);
    S.tone({ f: mf(81), dur: 1.8, a: 0.4, peak: 0.05, lp: 3500, am: [2.2, 0.5] });
    mlGl(S, 0.02, 93, 1.0, 0.03);
  });
  def('bm-maelis-m-moonlet-hum', 'bm', S => {     // a moonlet about to burst: its note rising and brightening, a tight shimmer
    S.space('hall', 0.6);
    S.tone({ f: mf(81), f1: mf(88), dur: 0.9, a: 0.6, swell: true, peak: 0.06, lp: 4500 });
    mlShim(S, 0, 0.9, 0.025);
  });
  def('bm-maelis-m-moonlet-burst', 'imp', S => {  // a moonlet bursts: glass thrown out in every direction, a small round blow, a ring of air
    S.space('hall', 0.55);
    S.glass({ f: mf(93), dur: 1.0, peak: 0.12 });
    for (let i = 0; i < 6; i++) S.glass({ at: 0.02 + i * 0.04, f: 2800 + ((i * 631) % 3200), dur: 0.5, peak: 0.05, pan: Math.sin(i * 2.3) * 0.7 });
    S.thud({ f: 100, f1: 52, dur: 0.4, click: 0.1, lp: 900, peak: 0.28 });
    S.whoosh({ color: 'pink', f: 1500, f1: 6000, dur: 0.35, peakAt: 0.25, q: 1.6, peak: 0.14 });
  });
  def('bm-maelis-m-moonlet-harvest', 'imp', S => { // a moonlet lit twice bursts wider: the same, a second ring behind it, a bell and a deeper blow
    S.space('hall', 0.6);
    S.thud({ f: 84, f1: 40, dur: 0.7, drive: 1.5, click: 0.1, lp: 800, peak: 0.3 });
    S.glass({ f: mf(88), dur: 1.4, peak: 0.14 });
    for (let i = 0; i < 9; i++) S.glass({ at: 0.02 + i * 0.045, f: 2600 + ((i * 577) % 3600), dur: 0.6, peak: 0.045, pan: Math.sin(i * 2.1) * 0.8 });
    S.whoosh({ color: 'pink', f: 1200, f1: 8000, dur: 0.5, peakAt: 0.3, q: 1.4, peak: 0.16 });
    S.whoosh({ at: 0.14, color: 'pink', f: 900, f1: 6000, dur: 0.5, peakAt: 0.3, q: 1.4, peak: 0.1 });
    mlBell(S, 0.03, 69, 2.0, 0.18);
  });
  def('bm-maelis-m-moonlet-gone', 'bm', S => {    // a moonlet gone without bursting: its note thinning to nothing, a sigh of frost
    S.space('hall', 0.7);
    S.tone({ f: mf(81), f1: mf(76), dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.04, lp: 3000 });
    mlAir(S, 0, 0.7, 0.025, 0, 4400);
  });
  // ---- marks on a hero
  def('bm-maelis-m-mark-prey', 'bm', S => {       // an eye on your trail: a cold sniff (his), a short bowed note falling a step, a tick of ice
    S.space('hall', 0.35);
    gwSniff(S, 0, 0.1, 0, 1.15);
    mlBow(S, 0.15, 76, 0.8, 0.04, { m1: 74, a: 0.2 });
    S.crack({ at: 0.3, peak: 0.04, dur: 0.08, f: 3200 });
  });
  def('bm-maelis-m-mark-step', 'bm', S => {       // a dash will take you: one clear thin note and a tick of silver (the hook climbs the pitch with the number)
    S.space('hall', 0.4);
    mlGl(S, 0, 93, 1.0, 0.09);
    S.tick({ at: 0.01, f: 3000, peak: 0.08 });
  });
  def('bm-maelis-m-mark-eye', 'bm', S => {        // Moon-Touched: an eye opens on you: a soft bowed harmonic swelling and, a beat behind it, its small inverse falling
    S.space('hall', 0.6);
    S.tone({ f: mf(100), dur: 1.0, a: 0.25, swell: true, peak: 0.06, lp: 5000 });
    S.tone({ at: 0.28, f: mf(100), f1: mf(88), dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.03, lp: 3500 });
    mlAir(S, 0, 0.8, 0.025, 0, 6200);
  });
  def('bm-maelis-m-touch', 'bm', S => {           // the inversion begins: the lit chord rising and the dark one falling through it, once, and gone
    S.space('hall', 0.8);
    mlPhase(S, 'gibbous', 0, 0.12, 0.07, { dur: 1.4 });
    mlUmb(S, 0.05, 69, 1.4, 0.07, { pan: -0.3 }); mlUmb(S, 0.2, 62, 1.3, 0.06, { pan: 0.3 });
    mlAir(S, 0, 1.0, 0.03, 0, 5200);
  });
  def('bm-maelis-m-touch-end', 'bm', S => {       // the inversion is over: a falling pair of glass notes resolving to one
    S.space('hall', 0.8);
    mlGl(S, 0, 93, 1.4, 0.05, -0.3); mlGl(S, 0.1, 88, 1.4, 0.04, 0.3); mlGl(S, 0.5, 81, 1.4, 0.05);
  });
  // ---- the wall: the silver line of each dash in the dark, the dash, its small cut, the pools of the last light
  def('bm-maelis-m-line', 'bm', S => {            // a silver line drawn from her to a hero in the dark: a thin band of air sweeping up and one bright note at the end of it
    S.space('hall', 0.5);
    mlDraw(S, 0, 0.6, 0.14, 0, 1);
    mlGl(S, 0.55, 100, 0.8, 0.07);
  });
  def('bm-maelis-m-line-lock', 'bm', S => {       // the line locks (it is red now): one dry tick and a small ring
    S.metal({ set: 'bar', f: 3400, dur: 0.2, peak: 0.07, strike: 0.3 });
    S.crack({ peak: 0.08, dur: 0.06, f: 4200 });
  });
  def('bm-maelis-m-dash', 'imp', S => {           // she crosses the line: a thin fast stroke of air from end to end and a clean crack, a knock where she stops
    S.space('hall', 0.4);
    S.whoosh({ color: 'pink', f: 6500, f1: 600, dur: 0.35, peakAt: 0.2, q: 1.6, peak: 0.3 });
    S.crack({ peak: 0.3, dur: 0.1, f: 2600 });
    S.thud({ f: 110, f1: 56, dur: 0.25, click: 0.1, lp: 700, peak: 0.14 });
    mlGl(S, 0.02, 100, 0.8, 0.06);
  });
  def('bm-maelis-m-step-cut', 'imp', S => {       // the small crescent at the end of a dash: a quick slice down and up, a glass note and its octave, a dry knock (the hook climbs it step by step)
    S.space('hall', 0.5);
    mlDraw(S, 0, 0.2, 0.12, 0, 0); mlDraw(S, 0.12, 0.2, 0.1, 0, 1);
    mlGl(S, 0.01, 93, 1.2, 0.1); mlGl(S, 0.05, 105, 0.8, 0.04);
    S.thud({ f: 86, f1: 48, dur: 0.25, click: 0, lp: 480, peak: 0.2 });
  });
  def('bm-maelis-m-pool', 'bm', S => {            // a pool of the last light laid: a soft pad of glass swelling and a bowed note settling under it (the hook climbs it as the pools shrink)
    S.space('hall', 0.7);
    mlBow(S, 0, 69, 1.4, 0.04, { a: 0.6, lp: 1800 });
    mlGl(S, 0.1, 81, 1.2, 0.05); mlShim(S, 0.1, 1.0, 0.02);
  });
  def('bm-maelis-m-pool-met', 'bm', S => {        // the light gathered: three soft notes closing from either side to one, a small bell
    S.space('hall', 0.6);
    mlGl(S, 0, 88, 1.2, 0.06, -0.4); mlGl(S, 0.02, 88, 1.2, 0.06, 0.4); mlGl(S, 0.14, 93, 1.4, 0.06);
    mlBell(S, 0.1, 76, 1.4, 0.05);
  });
  def('bm-maelis-m-pool-missed', 'bm', S => {     // the light scattered: a dull knock and a bowed note falling a step, a crack of glass
    S.space('hall', 0.45);
    S.thud({ f: 70, f1: 38, dur: 0.4, click: 0, lp: 420, peak: 0.3 });
    mlUmb(S, 0, 76, 0.9, 0.08);
    S.crack({ at: 0.03, peak: 0.1, dur: 0.1, f: 2800 });
  });
  // ---- the trail: footprints lighting, the ride, the pounce
  def('bm-maelis-m-lock', 'bm', S => {            // the trail locks: its footprints lit end to end, eight small glass ticks climbing, a thin line drawn over them
    S.space('hall', 0.45);
    for (let i = 0; i < 8; i++) S.glass({ at: i * 0.045, f: 2000 + i * 300, dur: 0.35, peak: 0.05, pan: -0.5 + i * 0.14 });
    mlDraw(S, 0, 0.45, 0.07, 0, 1);
    mlGl(S, 0.4, 93, 1.0, 0.06);
  });
  def('bm-maelis-m-ride-start', 'bm', S => {      // she pushes off on the trail: a puff of dust, one low thump, a thin line of air rising behind
    S.space('hall', 0.3);
    mlDust(S, 0, 0.26);
    S.thud({ f: 104, f1: 54, dur: 0.22, click: 0, lp: 600, peak: 0.22 });
    S.whoosh({ at: 0.05, color: 'pink', f: 1500, f1: 6500, dur: 0.35, peakAt: 0.7, q: 2, peak: 0.16 });
    mlGl(S, 0.1, 93, 0.8, 0.05);
  });
  def('bm-maelis-m-run', 'bm', S => {             // a piece of the trail lands as the rider reaches it: three quick paws, a flick of silver
    mlPaws(S, 0.02, 3, 0.09, 0.2, { f: 210, pan: 0 });
    mlGl(S, 0.03, 96, 0.5, 0.05);
  });
  def('bm-maelis-m-pounce', 'imp', S => {         // the pounce lands: a flump of dust, a crisp crunch, a ring of glass round it
    S.space('hall', 0.35);
    S.thud({ f: 104, f1: 50, dur: 0.4, drive: 1.4, click: 0.15, lp: 900, peak: 0.3 });
    mlDust(S, 0.01, 0.38);
    S.noise({ at: 0.02, color: 'white', hp: 2400, lp: 7000, dur: 0.14, pts: [[0.01, 1], [0.14, 0]], peak: 0.1, grain: 0.7 });
    S.crack({ at: 0.01, peak: 0.16, dur: 0.1, f: 2000 });
    for (let i = 0; i < 4; i++) mlGl(S, 0.03 + i * 0.05, 86 + i * 3, 0.9, 0.08, Math.sin(i * 2.1) * 0.6);
  });
  def('bm-maelis-m-pounce-wide', 'imp', S => {    // a hero fallen on (they never moved): the same landing heavy and wide, the dust blown out in a ring, a bell and the glass of the floor ringing
    S.space('hall', 0.5);
    S.thud({ f: 100, f1: 46, dur: 0.9, drive: 1.8, click: 0.15, lp: 1000, peak: 0.42 });
    S.thud({ f: 54, f1: 26, dur: 1.0, click: 0, lp: 400, peak: 0.07 });
    S.noise({ at: 0.02, color: 'pink', bp: 600, bp1: 200, q: 0.8, lp: 2000, dur: 1.0, pts: [[0.05, 1], [1.0, 0]], peak: 0.3 });
    S.noise({ at: 0.03, color: 'pink', hp: 2000, lp: 8000, dur: 0.9, pts: [[0.06, 1], [0.9, 0]], peak: 0.14, grain: 0.7 });
    S.crack({ at: 0.01, peak: 0.2, dur: 0.14, f: 1800 });
    mlBell(S, 0.03, 64, 2.4, 0.22);
    for (let i = 0; i < 6; i++) mlGl(S, 0.04 + i * 0.05, 83 + i * 2, 1.1, 0.07, Math.sin(i * 2.4) * 0.7);
  });
  def('bm-maelis-m-hound', 'bm', S => {           // his breath beside hers (the second form): a cold sniff, the low close breath, two paws, one thin glass note
    S.space('hall', 0.4);
    gwSniff(S, 0.05, 0.1, -0.3, 1.1);
    gwBreath(S, 0.3, 1.0, 0.08, 1100, 0.2);
    mlPaws(S, 0.9, 2, 0.16, 0.07, { f: 104, pan: 0.1 });
    mlGl(S, 0.4, 88, 1.0, 0.03);
  });
  def('bm-maelis-m-shade', 'bm', S => {           // the Second Howl: his shade far down the road: hollow glass beating, a low far note, a breath; the howl is the shade's, not a dog's
    S.space('hall', 0.9);
    S.partials({ set: 'glass', f: mf(79), dur: 3.0, beat: 2.4, peak: 0.06, am: [5, 0.3], pan: -0.3 });
    S.voice({ at: 0.5, f: 118, f1: 100, dur: 1.8, vowel: 'u', breath: 5, lp: 1100, peak: 0.05, pan: 0.3 });
    gwBreath(S, 1.6, 1.4, 0.05, 800, 0.4);
  });
  // the room's bed: the face of the moon under a black sky. Almost nothing: a very narrow band of air drifting up high, two high notes a hair apart rising and falling on their own slow breaths,
  // dust settling a long way off. No room tone to speak of: there is no air here to move
  loop('amb-maelis-moon', 'amb', L => {
    const air = L.c(L.src('white', 0.9), L.f('bandpass', 6400, 14)), ag = L.g(0.012); L.lfo(air.frequency, 0.021, 700); L.lfo(ag.gain, 0.037, 0.009); L.c(air, ag, L.out);
    const a = L.g(0.004), b = L.g(0.004), c = L.g(0.0025); L.lfo(a.gain, 0.027, 0.0035); L.lfo(b.gain, 0.019, 0.0035); L.lfo(c.gain, 0.013, 0.002);
    L.c(L.osc('sine', mf(93)), a, L.out); L.c(L.osc('sine', mf(93) * 1.0017), b, L.out); L.c(L.osc('sine', mf(76)), c, L.out);
    L.c(L.src('brown', 0.6), L.f('lowpass', 120), L.g(0.1), L.out);
    L.c(L.crackle(0.04), L.f('highpass', 5200), L.g(0.01), L.out);
  }, 3);

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

  // Scalding: the stumps open two sear rings side by side; steam hissing out left and right, hot water boiling in each, a wet slap as they set
  def('bm-hydra-scalding', 'bm', S => {
    S.space('hall', 0.35);
    [-0.6, 0.6].forEach((pan, i) => {
      S.noise({ at: i * 0.12, bp: 3600, bp1: 1800, q: 1.3, dur: 1.4, a: 0.25, pts: [[0.3, 0.8], [0.7, 1], [1.4, 0]], peak: 0.2, pan });
      S.bubbles({ at: 0.2 + i * 0.12, n: 8, f: 400, f1: 1500, spread: 1.0, size: 0.04, peak: 0.1, pan });
      S.splat({ at: 1.0 + i * 0.1, peak: 0.26, dur: 0.25 });
    });
    S.sizzle({ dur: 1.5, pts: [[0.3, 1], [1.5, 0]], peak: 0.14 });
    S.thud({ at: 1.0, f: 76, f1: 34, dur: 0.5, peak: 0.4 });
  });
  // Entwined Necks: two heads wind round each other; wet creak of coiling flesh, two voices passing each other in pitch, a knotting squelch and then a loosened release
  def('bm-hydra-entwined-necks', 'bm', S => {
    S.space('cave', 0.4);
    S.creak({ dur: 1.8, f: 18, f1: 11, res: [260, 640, 1300], q: 10, peak: 0.2 });
    S.voice({ at: 0.2, f: 200, f1: 110, dur: 1.5, vowel: 'o', vowel1: 'a', breath: 6, peak: 0.13, lp: 3000, pts: [[0.3, 1], [1.5, 0]], pan: -0.5 });
    S.voice({ at: 0.2, f: 110, f1: 200, dur: 1.5, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.13, lp: 3000, pts: [[0.3, 1], [1.5, 0]], pan: 0.5 });
    S.bubbles({ at: 0.3, n: 9, f: 200, f1: 800, spread: 1.4, size: 0.05, peak: 0.09 });
    S.splat({ at: 1.7, peak: 0.34, dur: 0.3 });
    S.thud({ at: 1.7, f: 60, f1: 28, dur: 0.6, drive: 1.8, peak: 0.45 });
  });
  // Breach: the pool heaves and a wave is thrown to the wall; a swell from the deep, a great surge going outward and the slam of the wall, then water running back
  def('bm-hydra-breach', 'bm', S => {
    S.space('hall', 0.55);
    S.rumble({ dur: 3.4, f: 50, peak: 0.45, a: 1.4 });
    S.noise({ color: 'brown', lp: 900, lp1: 2200, dur: 2.2, a: 1.2, pts: [[1.4, 1], [2.2, 0]], peak: 0.32 });
    S.bubbles({ at: 0.2, n: 14, f: 120, f1: 500, spread: 1.4, size: 0.07, peak: 0.1 });
    S.whoosh({ at: 1.5, f: 200, f1: 1700, dur: 1.0, peakAt: 0.55, peak: 0.34 });
    S.thud({ at: 2.4, f: 50, f1: 24, dur: 1.0, drive: 2.8, peak: 0.75 });
    S.splat({ at: 2.4, peak: 0.4, dur: 0.45 });
    S.noise({ at: 2.5, color: 'pink', bp: 1400, bp1: 260, q: 1.0, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.2 });
  });

  // ============================================================================================== 7. The Founding
  // The hero-defense mode (client/js/founding/). Earthy and warm: wood, stone, fire, water, canvas, the founders' camp.
  // Played by name (Sound.play('fd-...')), so none of these need an SfxMap entry. The noisy repeats (autos, enemy hits)
  // sit in the 'ui' / 'hud' targets, short and soft; skills are 'ab', Ultimates 'ult', boss moves 'bm', big beats 'sting'.

  // ---- heroes: Bastion
  def('fd-bash', 'ab', S => {
    S.thud({ f: 150, f1: 70, dur: 0.18, peak: 0.55, click: 0.4, clickF: 3000, lp: 900 });
    S.metal({ at: 0.005, set: 'plate', f: 480, dur: 0.35, peak: 0.3, strike: 0.7 });
    S.wood({ at: 0.01, f: 260, dur: 0.12, peak: 0.25 });
  });
  def('fd-banner', 'ab', S => {
    S.whoosh({ color: 'white', f: 400, f1: 1500, dur: 0.22, peakAt: 0.5, peak: 0.2 });
    S.thud({ at: 0.18, f: 85, f1: 50, dur: 0.22, peak: 0.55, click: 0.2 });
    S.wood({ at: 0.19, f: 340, dur: 0.14, peak: 0.28 });
    S.noise({ at: 0.24, color: 'pink', bp: 900, q: 1, dur: 0.45, am: [9, 0.7], peak: 0.12, pts: [[0.05, 1], [0.45, 0]] });
    S.horn({ at: 0.28, f: mf(46), dur: 0.55, peak: 0.1, bright: 4 });
  });
  def('fd-brace', 'ab', S => {
    S.metal({ set: 'bar', f: 210, dur: 0.3, peak: 0.28, strike: 0.5 });
    S.creak({ dur: 0.18, f: 40, f1: 25, res: [500, 1100], q: 10, peak: 0.12 });
    S.thud({ at: 0.14, f: 100, f1: 60, dur: 0.18, peak: 0.45, click: 0.15, lp: 700 });
  });
  def('fd-perfect', 'ab', S => {
    S.space('room', 0.2);
    S.crack({ peak: 0.35, dur: 0.15, f: 2200 });
    S.bell({ at: 0.01, f: mf(81), dur: 0.9, peak: 0.28 });
    S.glass({ at: 0.05, f: mf(100), dur: 0.5, peak: 0.1 });
    S.whoosh({ f: 300, f1: 3200, dur: 0.3, peakAt: 0.3, peak: 0.25 });
    S.thud({ f: 120, f1: 60, dur: 0.22, peak: 0.5, click: 0.3 });
  });
  def('fd-wall', 'ult', S => {
    S.space('hall', 0.25);
    S.rumble({ dur: 0.95, f: 90, peak: 0.45, a: 0.25 });
    S.scrape({ f: 700, q: 1.5, rate: 22, dur: 0.6, peak: 0.2, pts: [[0.1, 1], [0.6, 0.6]] });
    [0.3, 0.46, 0.62].forEach((at, i) => {
      S.thud({ at, f: 75 - i * 6, f1: 36, dur: 0.4, drive: 1.8, peak: 0.55, pan: (i - 1) * 0.4 });
      S.metal({ at, set: 'stone', f: 190 + i * 40, dur: 0.5, peak: 0.2, strike: 0.6, pan: (i - 1) * 0.4 });
    });
    S.glass({ at: 0.85, f: 1760, dur: 0.9, peak: 0.08 });
  });

  // ---- heroes: Cleric
  def('fd-mend', 'hud', S => {
    S.space('room', 0.3);
    S.glass({ f: mf(88), dur: 0.5, peak: 0.16 });
    S.glass({ at: 0.09, f: mf(93), dur: 0.7, peak: 0.14 });
    S.bubbles({ n: 4, f: 700, f1: 2000, spread: 0.3, size: 0.03, peak: 0.07 });
    S.voice({ f: 330, f1: 392, dur: 0.5, vowel: 'o', breath: 3, peak: 0.07 });
  });
  def('fd-smite', 'ab', S => {
    S.crack({ peak: 0.4, dur: 0.18, f: 2000 });
    S.bell({ f: mf(76), dur: 0.8, peak: 0.22 });
    S.whoosh({ f: 3000, f1: 400, dur: 0.18, peakAt: 0.2, peak: 0.25 });
    S.thud({ at: 0.06, f: 130, f1: 70, dur: 0.15, peak: 0.35, click: 0 });
  });
  def('fd-sanctum', 'ab', S => {
    S.space('hall', 0.3);
    S.pad({ notes: [mf(55), mf(62), mf(67)], type: 'tri', dur: 1.3, a: 0.35, peak: 0.22, lpEnv: [500, 2200, 900] });
    S.bell({ at: 0.1, f: mf(79), dur: 1.2, peak: 0.16 });
    S.bubbles({ at: 0.2, n: 6, f: 900, f1: 2800, spread: 0.9, size: 0.03, peak: 0.05 });
    S.thud({ f: 70, f1: 45, dur: 0.3, peak: 0.3, click: 0, lp: 400 });
  });
  def('fd-dawn', 'ult', S => {
    S.space('hall', 0.45);
    S.choir({ notes: [mf(50), mf(57), mf(62)], vowel: 'a', vowel1: 'o', dur: 2.2, a: 0.9, peak: 0.16 });
    S.whoosh({ f: 200, f1: 4200, dur: 1.4, peakAt: 0.8, peak: 0.24 });
    [[0.7, 74], [0.85, 78], [1.0, 81], [1.2, 86]].forEach(([at, n]) => S.bell({ at, f: mf(n), dur: 1.4, peak: 0.16 }));
    S.thud({ at: 1.4, f: 62, f1: 38, dur: 0.7, peak: 0.45, click: 0, lp: 300 });
    S.bubbles({ at: 1.3, n: 9, f: 1200, f1: 3500, spread: 0.8, size: 0.03, peak: 0.05 });
  });

  // ---- heroes: Pyromancer
  def('fd-fireball-cast', 'ab', S => {
    S.whoosh({ color: 'white', f: 500, f1: 2400, dur: 0.22, peakAt: 0.4, peak: 0.28 });
    S.sizzle({ dur: 0.22, peak: 0.16, pts: [[0.04, 1], [0.22, 0]] });
    S.thud({ f: 110, f1: 60, dur: 0.12, peak: 0.25, click: 0 });
  });
  def('fd-fireball-hit', 'ab', S => {
    S.thud({ f: 85, f1: 40, dur: 0.3, drive: 2, peak: 0.6 });
    S.whoosh({ color: 'white', f: 2500, f1: 300, dur: 0.25, peakAt: 0.15, peak: 0.28 });
    S.crackle({ at: 0.05, dens: 2, f: 3000, dur: 0.45, pts: [[0.05, 1], [0.45, 0]], peak: 0.2 });
    S.sizzle({ at: 0.04, dur: 0.3, peak: 0.1, pts: [[0.05, 1], [0.3, 0]] });
  });
  def('fd-flamecircle', 'ab', S => {
    S.space('room', 0.2);
    [-0.7, 0, 0.7].forEach((pan, i) => S.whoosh({ at: i * 0.11, color: 'brown', f: 150, f1: 900, dur: 0.35, peakAt: 0.5, peak: 0.24, pan }));
    S.crackle({ dens: 1.5, f: 2400, dur: 0.7, pts: [[0.3, 1], [0.7, 0.4]], peak: 0.2 });
    S.thud({ at: 0.3, f: 70, f1: 45, dur: 0.3, peak: 0.35, click: 0, lp: 300 });
  });
  def('fd-erupt', 'ab', S => {
    S.thud({ f: 62, f1: 30, dur: 0.5, drive: 2.5, peak: 0.7 });
    S.whoosh({ color: 'brown', f: 200, f1: 2200, dur: 0.4, peakAt: 0.35, peak: 0.34 });
    S.crack({ at: 0.02, peak: 0.3, dur: 0.2 });
    S.crackle({ at: 0.1, dens: 1.7, f: 2800, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.2 });
    S.rumble({ dur: 0.6, f: 100, peak: 0.25, a: 0.1 });
  });
  def('fd-firestep', 'ab', S => {
    S.whoosh({ color: 'white', f: 1800, f1: 600, dur: 0.16, peakAt: 0.3, peak: 0.26 });
    S.noise({ at: 0.14, color: 'pink', lp: 1400, dur: 0.12, a: 0.004, peak: 0.25 });
    S.crackle({ at: 0.14, dens: 2.2, f: 3400, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.13 });
    S.tone({ at: 0.14, f: 220, f1: 110, dur: 0.12, peak: 0.12, lp: 500 });
  });
  def('fd-meteor-fall', 'ult', S => {
    S.space('hall', 0.25);
    S.tone({ f: 1900, f1: 260, dur: 1.3, curve: 'exp', a: 0.5, peak: 0.07, lp: 3500 });
    S.whoosh({ color: 'pink', f: 300, f1: 2600, dur: 1.4, peakAt: 0.95, peak: 0.32 });
    S.rumble({ dur: 1.4, f: 80, peak: 0.28, a: 0.9 });
    S.crackle({ at: 0.3, dens: 1.4, f: 3000, dur: 1.0, pts: [[0.8, 1], [1.0, 0]], peak: 0.1 });
  });
  def('fd-meteor-hit', 'ult', S => {
    S.space('hall', 0.3);
    S.thud({ f: 56, f1: 22, dur: 1.2, drive: 3, peak: 0.9 });
    S.crack({ peak: 0.4, dur: 0.25 });
    S.rumble({ dur: 1.7, f: 90, peak: 0.4, a: 0.12 });
    S.whoosh({ color: 'brown', f: 200, f1: 2400, dur: 0.5, peakAt: 0.25, peak: 0.34 });
    S.crackle({ at: 0.15, dens: 1.6, f: 2800, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.2 });
    S.skitter({ at: 0.2, dur: 0.9, n: 14, f: 1500, f1: 800, peak: 0.1, bias: 0.6 });
  });

  // ---- heroes: Ranger
  def('fd-arrow', 'ab', S => {
    S.pluck({ f: mf(43), dur: 0.18, bright: 12, peak: 0.3 });
    S.whoosh({ color: 'white', at: 0.02, f: 3200, f1: 1400, dur: 0.2, peakAt: 0.3, peak: 0.18 });
    S.wood({ f: 600, dur: 0.05, peak: 0.12 });
  });
  def('fd-pierce', 'ab', S => {
    S.wood({ f: 520, dur: 0.08, peak: 0.4 });
    S.noise({ hp: 3000, dur: 0.02, a: 0.0005, peak: 0.3 });
    S.metal({ set: 'bar', f: 1700, dur: 0.14, peak: 0.08, click: 0 });
    S.whoosh({ color: 'white', f: 2200, f1: 900, dur: 0.12, peakAt: 0.3, peak: 0.16 });
  });
  def('fd-trap-arm', 'hud', S => {
    S.tick({ f: 1900, peak: 0.15 });
    S.tick({ at: 0.07, f: 2400, peak: 0.13 });
    S.metal({ at: 0.03, set: 'bar', f: 900, dur: 0.12, peak: 0.1, click: 0 });
    S.wood({ at: 0.14, f: 600, dur: 0.06, peak: 0.12 });
  });
  def('fd-trap-burst', 'ab', S => {
    S.crack({ peak: 0.45, dur: 0.22, f: 1600 });
    S.thud({ f: 100, f1: 50, dur: 0.3, drive: 1.5, peak: 0.55 });
    S.skitter({ at: 0.02, dur: 0.4, n: 12, f: 2200, f1: 1200, peak: 0.12 });
    S.whoosh({ color: 'white', f: 2400, f1: 500, dur: 0.22, peakAt: 0.15, peak: 0.25 });
  });
  def('fd-mark', 'hud', S => {
    S.glass({ f: mf(96), dur: 0.35, peak: 0.14 });
    S.tone({ type: 'tri', f: 520, f1: 1040, dur: 0.14, peak: 0.15, lp: 3000 });
    S.tone({ at: 0.12, type: 'tri', f: 1040, dur: 0.12, peak: 0.1, lp: 3000 });
    S.tick({ at: 0.12, f: 2800, peak: 0.1 });
  });
  def('fd-starfall', 'ult', S => {
    S.space('hall', 0.25);
    S.pad({ notes: [mf(62), mf(69)], type: 'tri', dur: 2.0, a: 0.8, peak: 0.1, lpEnv: [600, 2500, 800] });
    for (let i = 0; i < 14; i++) {
      const at = 0.1 + i * 0.12 + S.rr(0, 0.08), pan = S.rr(-0.8, 0.8);
      S.whoosh({ at, color: 'white', f: S.rr(3200, 4200), f1: S.rr(900, 1500), dur: 0.18, peakAt: 0.3, peak: 0.12, pan });
      S.wood({ at: at + 0.16, f: S.rr(420, 760), dur: 0.06, peak: 0.12, pan });
    }
    S.glass({ at: 0.2, f: mf(93), dur: 1.6, peak: 0.07 });
    S.glass({ at: 0.9, f: mf(98), dur: 1.4, peak: 0.06 });
  });

  // ---- heroes: autos and states (short and soft)
  def('fd-auto-melee', 'ui', S => {
    S.whoosh({ color: 'pink', f: S.rr(650, 800), f1: 1800, dur: 0.08, peakAt: 0.4, peak: 0.14 });
    S.thud({ at: 0.05, f: S.rr(140, 170), f1: 80, dur: 0.07, peak: 0.3, click: 0.5, lp: 1200 });
  });
  def('fd-auto-shot', 'ui', S => {
    S.pluck({ f: S.rr(300, 360), dur: 0.1, bright: 10, peak: 0.18 });
    S.whoosh({ color: 'white', f: 3000, f1: 1800, dur: 0.1, peakAt: 0.3, peak: 0.08 });
  });
  def('fd-auto-cast', 'ui', S => {
    S.tone({ f: 700, f1: 1250, dur: 0.1, peak: 0.16, lp: 3000 });
    S.glass({ at: 0.02, f: S.rr(2200, 2600), dur: 0.16, peak: 0.06 });
    S.noise({ hp: 4000, dur: 0.05, a: 0.004, peak: 0.05 });
  });
  def('fd-hero-down', 'sting', S => {
    S.space('room', 0.2);
    S.thud({ f: 90, f1: 45, dur: 0.35, peak: 0.55, click: 0.2, lp: 700 });
    S.noise({ at: 0.04, color: 'pink', bp: 700, bp1: 300, q: 0.8, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.15 });
    S.voice({ f: 160, f1: 85, dur: 0.7, vowel: 'o', vowel1: 'u', breath: 8, peak: 0.16, pts: [[0.1, 1], [0.7, 0]] });
    S.metal({ at: 0.1, set: 'plate', f: 220, dur: 0.4, peak: 0.1, strike: 0.5 });
  });
  def('fd-hero-rise', 'sting', S => {
    S.space('hall', 0.3);
    S.pad({ notes: [mf(55), mf(62)], type: 'tri', dur: 1.1, a: 0.35, peak: 0.2, lpEnv: [400, 2400, 1200] });
    S.bell({ at: 0.3, f: mf(79), dur: 1.0, peak: 0.2 });
    S.whoosh({ f: 300, f1: 2800, dur: 0.5, peakAt: 0.8, peak: 0.16 });
    S.voice({ at: 0.15, f: 196, f1: 262, dur: 0.7, vowel: 'a', breath: 3, peak: 0.1 });
  });
  def('fd-levelup', 'sting', S => {
    S.space('room', 0.25);
    [64, 68, 71, 76].forEach((n, i) => { S.glass({ at: i * 0.08, f: mf(n + 12), dur: 0.5, peak: 0.12 }); S.pluck({ at: i * 0.08, f: mf(n), dur: 0.4, bright: 6, peak: 0.12 }); });
    S.bell({ at: 0.3, f: mf(88), dur: 1.0, peak: 0.16 });
    S.bubbles({ at: 0.25, n: 7, f: 1200, f1: 3500, spread: 0.5, size: 0.03, peak: 0.05 });
  });
  def('fd-rankup', 'hud', S => {
    S.space('room', 0.2);
    S.pluck({ f: mf(69), dur: 0.3, bright: 6, peak: 0.18 });
    S.bell({ at: 0.09, f: mf(83), dur: 0.6, peak: 0.12 });
  });

  // ---- enemies
  def('fd-enemy-hit', 'ui', S => {
    S.thud({ f: S.rr(120, 150), f1: 75, dur: 0.06, peak: 0.35, click: 0.6, clickF: 1800, lp: 1200 });
    S.noise({ color: 'pink', bp: 900, dur: 0.05, a: 0.002, peak: 0.12 });
  });
  def('fd-enemy-die', 'hud', S => {
    S.splat({ peak: 0.3, dur: 0.2 });
    S.tone({ f: 200, f1: 70, dur: 0.22, peak: 0.2, lp: 600 });
    S.noise({ at: 0.04, color: 'pink', lp: 900, lp1: 250, dur: 0.2, pts: [[0.05, 1], [0.2, 0]], peak: 0.12 });
  });
  def('fd-elite-die', 'ab', S => {
    S.space('room', 0.2);
    S.thud({ f: 70, f1: 35, dur: 0.6, drive: 1.5, peak: 0.6 });
    S.voice({ f: 120, f1: 58, dur: 0.6, vowel: 'o', vowel1: 'u', breath: 6, peak: 0.2, pts: [[0.08, 1], [0.6, 0]] });
    S.splat({ at: 0.03, peak: 0.3, dur: 0.3 });
    S.rumble({ dur: 0.6, f: 80, peak: 0.2, a: 0.1 });
    S.metal({ at: 0.2, set: 'plate', f: 250, dur: 0.4, peak: 0.1, strike: 0.5 });
  });
  def('fd-spit', 'hud', S => {
    S.bubbles({ n: 5, f: 300, f1: 1000, spread: 0.12, size: 0.03, peak: 0.12 });
    S.whoosh({ at: 0.04, color: 'white', f: 1200, f1: 2400, dur: 0.14, peakAt: 0.4, peak: 0.12 });
    S.noise({ color: 'pink', bp: 1400, bp1: 500, q: 3, dur: 0.1, peak: 0.12, grain: 0.3 });
  });
  def('fd-brute-slam', 'bm', S => {
    S.space('room', 0.15);
    S.thud({ f: 80, f1: 38, dur: 0.5, drive: 2, peak: 0.7 });
    S.crack({ peak: 0.28, dur: 0.15, f: 1400 });
    S.wood({ at: 0.02, f: 200, dur: 0.25, peak: 0.25 });
    S.rumble({ dur: 0.45, f: 100, peak: 0.25, a: 0.05 });
    S.skitter({ at: 0.06, dur: 0.3, n: 8, f: 1800, f1: 900, peak: 0.08 });
  });
  def('fd-stalker', 'hud', S => {
    S.skitter({ dur: 0.35, n: 8, f: 2500, peak: 0.1, bias: 0.8 });
    S.noise({ at: 0.05, hp: 4000, dur: 0.3, a: 0.08, peak: 0.07, pts: [[0.15, 1], [0.3, 0]] });
    S.voice({ at: 0.1, f: 90, f1: 70, dur: 0.3, vowel: 'i', breath: 8, peak: 0.07 });
  });
  def('fd-camp-hit', 'ab', S => {
    S.thud({ f: 110, f1: 65, dur: 0.22, peak: 0.45, click: 0.2, lp: 500 });
    S.creak({ at: 0.05, dur: 0.3, f: 25, f1: 15, res: [420, 900], q: 9, peak: 0.12 });
    S.noise({ color: 'pink', bp: 600, q: 0.8, dur: 0.18, pts: [[0.03, 1], [0.18, 0]], peak: 0.18 });
  });
  def('fd-gate-hit', 'ab', S => {
    S.thud({ f: 75, f1: 40, dur: 0.35, drive: 1.5, peak: 0.6 });
    S.wood({ f: 180, dur: 0.25, peak: 0.32 });
    S.crack({ at: 0.02, peak: 0.2, dur: 0.1, f: 900 });
    S.creak({ at: 0.1, dur: 0.3, f: 22, f1: 14, res: [380, 800], q: 9, peak: 0.1 });
  });
  def('fd-gate-break', 'imp', S => {
    S.space('hall', 0.25);
    S.crack({ peak: 0.45, dur: 0.3, f: 900 });
    for (let i = 0; i < 6; i++) S.wood({ at: 0.02 + i * 0.07 + S.rr(0, 0.04), f: S.rr(180, 600), dur: 0.2, peak: 0.28, pan: S.rr(-0.5, 0.5) });
    S.thud({ f: 55, f1: 25, dur: 1.0, drive: 3, peak: 0.85 });
    S.rumble({ dur: 1.2, f: 110, peak: 0.35, a: 0.1 });
    S.skitter({ at: 0.3, dur: 0.8, n: 16, f: 1400, f1: 700, peak: 0.1 });
  });

  // ---- bosses
  def('fd-boss-arrive', 'sting', S => {
    S.space('hall', 0.45);
    S.horn({ f: mf(38), dur: 2.2, peak: 0.4, bright: 5 });
    S.horn({ at: 0.4, f: mf(45), dur: 1.8, peak: 0.25, bright: 4 });
    [1.2, 1.7].forEach(at => S.drum({ at, f: 58, dur: 0.9, peak: 0.55 }));
    S.rumble({ dur: 2.6, f: 60, peak: 0.4, a: 0.6 });
    S.choir({ at: 0.3, notes: [mf(38), mf(45)], vowel: 'u', dur: 2.4, a: 1.0, peak: 0.1 });
  });
  def('fd-boss-down', 'sting', S => {
    S.space('hall', 0.5);
    S.thud({ f: 50, f1: 22, dur: 1.6, drive: 3, peak: 0.85 });
    S.rumble({ at: 0.1, dur: 2.2, f: 70, peak: 0.4, a: 0.1, pts: [[0.1, 1], [2.2, 0]] });
    S.choir({ at: 0.3, notes: [mf(43), mf(50), mf(55)], vowel: 'o', vowel1: 'u', dur: 2.4, a: 0.8, bend: -2, peak: 0.12 });
    S.bell({ at: 1.0, f: mf(57), dur: 2.2, peak: 0.2 });
    S.skitter({ at: 0.1, dur: 1.2, n: 16, f: 1200, f1: 700, peak: 0.08, bias: 0.7 });
  });
  def('fd-tunnel-burrow', 'bm', S => {
    S.space('cave', 0.2);
    S.scrape({ f: 600, q: 1.2, rate: 28, dur: 0.85, peak: 0.28, pts: [[0.15, 1], [0.6, 0.8], [0.85, 0]] });
    S.noise({ color: 'brown', lp: 700, lp1: 150, dur: 1.0, a: 0.1, pts: [[0.2, 1], [1.0, 0]], peak: 0.4 });
    [0.1, 0.3, 0.5].forEach((at, i) => S.thud({ at, f: 70 - i * 10, f1: 32, dur: 0.3, peak: 0.45, click: 0.2, lp: 400 }));
    S.rumble({ dur: 1.1, f: 80, f1: 40, peak: 0.3, a: 0.2 });
  });
  def('fd-tunnel-surface', 'bm', S => {
    S.space('cave', 0.25);
    S.crack({ peak: 0.4, dur: 0.3, f: 800 });
    S.thud({ at: 0.02, f: 58, f1: 26, dur: 0.9, drive: 2.5, peak: 0.8 });
    S.noise({ color: 'brown', lp: 2200, lp1: 300, dur: 0.7, a: 0.01, peak: 0.45 });
    S.skitter({ at: 0.05, dur: 0.8, n: 18, f: 1400, f1: 700, peak: 0.1, bias: 0.6 });
    S.voice({ at: 0.15, f: 100, f1: 66, dur: 0.6, vowel: 'a', breath: 7, peak: 0.16, pts: [[0.1, 1], [0.6, 0]] });
  });
  def('fd-tail-sweep', 'bm', S => {
    S.whoosh({ color: 'brown', f: 100, f1: 800, dur: 0.6, peakAt: 0.6, peak: 0.36 });
    S.thud({ at: 0.45, f: 64, f1: 30, dur: 0.6, drive: 2, peak: 0.65 });
    S.wood({ at: 0.46, f: 240, dur: 0.2, peak: 0.25 });
    S.scrape({ at: 0.45, f: 900, q: 1.2, rate: 30, dur: 0.35, peak: 0.12, pts: [[0.05, 1], [0.35, 0]] });
    S.skitter({ at: 0.5, dur: 0.4, n: 10, f: 1500, peak: 0.07 });
  });
  def('fd-quake', 'bm', S => {
    S.space('cave', 0.3);
    S.rumble({ dur: 1.7, f: 70, peak: 0.5, a: 0.4 });
    [0.2, 0.55, 0.9, 1.2].forEach((at, i) => { S.crack({ at, peak: 0.25, dur: 0.18, f: 900 }); S.thud({ at, f: 60 - i * 4, f1: 30, dur: 0.4, peak: 0.4, click: 0.1 }); });
    S.noise({ color: 'brown', lp: 1500, dur: 1.6, a: 0.3, pts: [[0.5, 1], [1.6, 0]], peak: 0.3, grain: 0.4 });
  });

  // the Wick-Eater: a thin thing that eats light
  def('fd-wick-glow', 'tg', S => {
    S.space('cave', 0.3);
    S.tone({ f: 400, f1: 900, dur: 1.1, a: 0.8, swell: true, peak: 0.13, am: [7, 0.4] });
    S.voice({ f: 300, f1: 520, dur: 1.0, vowel: 'i', breath: 6, peak: 0.1, pts: [[0.7, 1], [1.0, 0.6]] });
    S.glass({ at: 0.6, f: 3000, dur: 0.6, peak: 0.07 });
    S.sizzle({ dur: 1.1, peak: 0.05, pts: [[0.8, 1], [1.1, 0]] });
  });
  def('fd-wick-lunge', 'bm', S => {
    S.whoosh({ color: 'white', f: 4000, f1: 800, dur: 0.25, peakAt: 0.35, peak: 0.4 });
    S.crack({ at: 0.18, peak: 0.3, dur: 0.15, f: 1500 });
    S.wood({ at: 0.18, f: 1100, dur: 0.1, peak: 0.25 });
    S.thud({ at: 0.18, f: 100, f1: 50, dur: 0.2, peak: 0.4, click: 0 });
    S.voice({ at: 0.02, f: 420, f1: 260, dur: 0.3, vowel: 'i', breath: 9, peak: 0.12 });
  });
  def('fd-wick-breath', 'bm', S => {
    S.space('hall', 0.3);
    S.noise({ color: 'pink', bp: 3500, bp1: 1200, q: 0.8, dur: 1.5, a: 0.3, pts: [[0.3, 1], [1.5, 0]], peak: 0.32 });
    S.partials({ set: 'glass', f: 1900, dur: 1.4, peak: 0.06, am: [8, 0.5], a: 0.2, swell: true });
    S.rumble({ dur: 1.6, f: 65, peak: 0.3, a: 0.4 });
    S.voice({ f: 95, f1: 70, dur: 1.4, vowel: 'o', breath: 9, peak: 0.1, pts: [[0.3, 1], [1.4, 0]] });
  });
  def('fd-wick-eat', 'bm', S => {
    S.whoosh({ color: 'pink', f: 2500, f1: 500, dur: 0.35, peakAt: 0.3, peak: 0.28 });
    S.noise({ at: 0.32, color: 'pink', lp: 800, dur: 0.1, a: 0.003, peak: 0.3 });
    S.sizzle({ at: 0.3, dur: 0.5, peak: 0.1, pts: [[0.05, 1], [0.5, 0]] });
    S.tone({ at: 0.36, f: 220, f1: 110, dur: 0.16, peak: 0.15, lp: 600 });
    S.glass({ at: 0.33, f: 1500, dur: 0.3, peak: 0.04 });
  });

  // the Mirebull: a huge drowned ox that floods the ford
  def('fd-mire-stamp', 'bm', S => {
    S.space('room', 0.2);
    S.thud({ f: 70, f1: 32, dur: 0.8, drive: 2, peak: 0.7 });
    S.splat({ at: 0.02, peak: 0.45, dur: 0.4 });
    S.bubbles({ at: 0.1, n: 8, f: 250, f1: 900, spread: 0.5, size: 0.05, peak: 0.1 });
    S.voice({ f: 70, f1: 55, dur: 0.8, vowel: 'o', breath: 6, peak: 0.2, pts: [[0.1, 1], [0.8, 0]] });
  });
  def('fd-mire-charge', 'bm', S => {
    S.space('room', 0.15);
    [0, 0.22, 0.42, 0.6, 0.76, 0.9, 1.03, 1.15].forEach((at, i) => {
      S.thud({ at, f: 85, f1: 45, dur: 0.18, peak: 0.28 + i * 0.03, click: 0.1, lp: 600, pan: (i % 2 ? 0.2 : -0.2) });
      S.noise({ at, color: 'pink', bp: 1200, q: 0.8, dur: 0.12, peak: 0.1 });
    });
    S.whoosh({ color: 'brown', f: 120, f1: 700, dur: 1.3, peakAt: 0.85, peak: 0.26 });
    S.voice({ f: 66, f1: 80, dur: 0.9, vowel: 'o', breath: 6, peak: 0.12, pts: [[0.1, 1], [0.9, 0]] });
  });
  def('fd-flood-rise', 'bm', S => {
    S.space('hall', 0.3);
    S.noise({ color: 'pink', bp: 300, bp1: 900, q: 0.9, dur: 2.0, a: 0.8, pts: [[1.0, 0.8], [1.7, 1], [2.0, 0]], peak: 0.4 });
    S.bubbles({ n: 12, f: 220, f1: 1100, spread: 1.6, size: 0.05, peak: 0.1 });
    S.rumble({ dur: 2.0, f: 70, peak: 0.35, a: 0.8 });
    S.splat({ at: 0.05, peak: 0.25, dur: 0.3 });
  });
  def('fd-log-break', 'bm', S => {
    S.space('room', 0.2);
    S.crack({ peak: 0.45, dur: 0.25, f: 900 });
    S.crack({ at: 0.09, peak: 0.35, dur: 0.2, f: 700 });
    S.wood({ at: 0.02, f: 150, dur: 0.4, peak: 0.45 });
    S.thud({ at: 0.04, f: 70, f1: 36, dur: 0.5, peak: 0.55 });
    S.splat({ at: 0.14, peak: 0.4, dur: 0.4 });
    S.creak({ at: 0.04, dur: 0.35, f: 28, f1: 12, res: [320, 760], q: 10, peak: 0.12 });
  });
  def('fd-mire-drown', 'bm', S => {
    S.space('hall', 0.4);
    S.voice({ f: 100, f1: 56, dur: 1.8, vowel: 'o', vowel1: 'u', breath: 7, peak: 0.24, pts: [[0.2, 1], [1.8, 0]] });
    S.bubbles({ at: 0.2, n: 18, f: 600, f1: 120, spread: 1.8, size: 0.06, peak: 0.12 });
    S.noise({ color: 'brown', lp: 1100, lp1: 160, dur: 2.2, a: 0.3, pts: [[0.8, 1], [2.2, 0]], peak: 0.4 });
    S.thud({ at: 1.7, f: 44, f1: 22, dur: 0.9, drive: 2, peak: 0.55 });
  });

  // Old Gnaw: a vast blind ash beast that sniffs for warmth
  def('fd-gnaw-sniff', 'bm', S => {
    S.space('cave', 0.3);
    [0, 0.38, 0.8].forEach((at, i) => S.noise({ at, color: 'pink', bp: 400 + i * 80, bp1: 1000 + i * 100, q: 1.6, dur: 0.28, a: 0.03, pts: [[0.1, 1], [0.28, 0]], peak: 0.28 }));
    S.rumble({ dur: 1.4, f: 60, peak: 0.35, a: 0.3 });
    S.voice({ at: 0.1, f: 55, f1: 62, dur: 1.2, vowel: 'o', breath: 10, peak: 0.12, pts: [[0.3, 1], [1.2, 0]] });
  });
  def('fd-gnaw-breath', 'bm', S => {
    S.space('hall', 0.35);
    S.noise({ color: 'brown', lp: 1300, lp1: 700, dur: 1.7, a: 0.35, pts: [[0.4, 1], [1.7, 0]], peak: 0.45 });
    S.crackle({ at: 0.1, dens: 2, f: 3200, dur: 1.5, pts: [[0.4, 1], [1.5, 0]], peak: 0.18 });
    S.voice({ f: 60, f1: 48, dur: 1.6, vowel: 'a', breath: 10, peak: 0.2, pts: [[0.25, 1], [1.6, 0]] });
    S.sizzle({ at: 0.2, dur: 1.4, peak: 0.07, pts: [[0.3, 1], [1.4, 0]] });
  });
  def('fd-gnaw-stamp', 'bm', S => {
    S.space('cave', 0.35);
    S.thud({ f: 40, f1: 20, dur: 1.2, drive: 3.2, peak: 0.95 });
    S.rumble({ dur: 1.5, f: 65, peak: 0.45, a: 0.08 });
    S.noise({ at: 0.05, color: 'brown', lp: 1800, lp1: 250, dur: 1.0, a: 0.01, peak: 0.35, grain: 0.4 });
    S.skitter({ at: 0.15, dur: 1.0, n: 18, f: 1100, f1: 600, peak: 0.1, bias: 0.6 });
  });
  def('fd-gnaw-lunge', 'bm', S => {
    S.space('cave', 0.25);
    S.whoosh({ color: 'brown', f: 80, f1: 500, dur: 0.6, peakAt: 0.7, peak: 0.4 });
    S.voice({ f: 80, f1: 140, dur: 0.6, vowel: 'a', breath: 8, peak: 0.2, pts: [[0.1, 1], [0.6, 0.8]] });
    [0.55, 0.62, 0.7].forEach((at, i) => S.wood({ at, f: 140 + i * 90, dur: 0.12, peak: 0.28 }));
    S.thud({ at: 0.58, f: 46, f1: 24, dur: 0.8, drive: 2.8, peak: 0.8 });
    S.crack({ at: 0.58, peak: 0.25, dur: 0.15, f: 800 });
  });
  def('fd-whelps', 'bm', S => {
    S.skitter({ dur: 1.0, n: 26, f: 2800, f1: 1400, peak: 0.12, bias: 0.8 });
    S.crackle({ dens: 2.4, f: 3600, dur: 0.9, pts: [[0.2, 1], [0.9, 0]], peak: 0.12 });
    [0.1, 0.35, 0.6].forEach(at => S.voice({ at, f: S.rr(550, 700), f1: S.rr(800, 950), dur: 0.14, vowel: 'i', breath: 4, peak: 0.07, pan: S.rr(-0.6, 0.6) }));
    S.sizzle({ dur: 0.7, peak: 0.05, pts: [[0.1, 1], [0.7, 0]] });
  });

  // ---- world and quests
  def('fd-wave', 'hud', S => {
    S.space('hall', 0.3);
    S.horn({ f: mf(48), dur: 0.5, peak: 0.28, bright: 5 });
    S.horn({ at: 0.35, f: mf(55), dur: 0.7, peak: 0.26, bright: 5 });
    S.drum({ at: 0.35, f: 70, dur: 0.5, peak: 0.35 });
  });
  def('fd-night', 'sting', S => {
    S.space('hall', 0.35);
    S.pad({ notes: [mf(45), mf(52), mf(57)], type: 'tri', dur: 2.4, a: 0.8, bend: -1.5, peak: 0.2, lpEnv: [900, 500, 250] });
    S.noise({ color: 'pink', bp: 500, q: 0.6, dur: 2.2, a: 0.8, pts: [[1.0, 1], [2.2, 0]], peak: 0.1 });
    [0.8, 1.35].forEach((at, i) => S.voice({ at, f: 400 - i * 60, f1: 340 - i * 60, dur: 0.4, vowel: 'o', breath: 2, peak: 0.07 }));
    S.skitter({ at: 0.2, dur: 1.8, n: 14, f: 5000, peak: 0.03 });
  });
  def('fd-dawn-breaks', 'sting', S => {
    S.space('hall', 0.35);
    S.pad({ notes: [mf(50), mf(57), mf(62), mf(66)], type: 'tri', dur: 2.4, a: 1.0, peak: 0.2, lpEnv: [400, 2600, 1600] });
    S.bell({ at: 0.6, f: mf(78), dur: 1.6, peak: 0.14 });
    [0.9, 1.15, 1.4, 1.62, 1.9].forEach((at, i) => S.tone({ at, f: 3000 + (i * 370) % 1200, f1: 3900 + (i * 290) % 900, dur: 0.07, a: 0.005, peak: 0.05 }));
    S.whoosh({ f: 300, f1: 2500, dur: 1.4, peakAt: 0.9, peak: 0.1 });
  });
  def('fd-quest-offer', 'hud', S => {
    S.space('room', 0.2);
    S.wood({ f: 430, dur: 0.1, peak: 0.28 });
    S.wood({ at: 0.12, f: 440, dur: 0.1, peak: 0.26 });
    S.horn({ at: 0.3, f: mf(55), dur: 0.5, peak: 0.16, bright: 4 });
    S.horn({ at: 0.62, f: mf(62), dur: 0.6, peak: 0.16, bright: 4 });
  });
  def('fd-quest-done', 'sting', S => {
    S.space('hall', 0.3);
    [62, 66, 69].forEach((n, i) => S.pluck({ at: i * 0.07, f: mf(n), dur: 0.8, bright: 6, peak: 0.2 }));
    S.bell({ at: 0.3, f: mf(86), dur: 1.4, peak: 0.16 });
    S.choir({ at: 0.15, notes: [mf(50), mf(57)], vowel: 'o', dur: 1.2, a: 0.4, peak: 0.1 });
    S.coins({ at: 0.35, n: 3, f: 3400, spread: 0.12, peak: 0.1 });
  });
  def('fd-quest-missed', 'hud', S => {
    S.space('room', 0.25);
    S.pluck({ f: mf(50), dur: 0.5, bright: 3, peak: 0.2 });
    S.pluck({ at: 0.28, f: mf(46), dur: 0.8, bright: 3, peak: 0.2 });
    S.wood({ at: 0.28, f: 210, dur: 0.15, peak: 0.2 });
    S.creak({ at: 0.35, dur: 0.4, f: 22, f1: 12, res: [380, 760], q: 9, peak: 0.07 });
  });
  def('fd-pickup', 'town', S => {
    S.noise({ color: 'pink', bp: 1500, bp1: 2800, q: 0.9, dur: 0.14, am: [24, 0.6], pts: [[0.04, 1], [0.14, 0]], peak: 0.2 });
    S.wood({ at: 0.05, f: 600, dur: 0.06, peak: 0.1 });
    S.tone({ at: 0.04, f: 280, f1: 380, dur: 0.1, peak: 0.08, lp: 900 });
  });
  def('fd-setdown', 'town', S => {
    S.thud({ f: 110, f1: 70, dur: 0.14, peak: 0.4, click: 0.2, lp: 500 });
    S.noise({ at: 0.03, color: 'pink', bp: 1100, q: 0.9, dur: 0.1, am: [20, 0.5], peak: 0.1 });
  });
  def('fd-deliver', 'hud', S => {
    S.space('room', 0.2);
    S.thud({ f: 100, f1: 60, dur: 0.15, peak: 0.4, click: 0.2, lp: 600 });
    S.wood({ at: 0.01, f: 380, dur: 0.12, peak: 0.25 });
    S.bell({ at: 0.1, f: mf(79), dur: 0.7, peak: 0.12 });
    S.glass({ at: 0.14, f: mf(91), dur: 0.5, peak: 0.07 });
  });
  def('fd-post-plant', 'hud', S => {
    S.thud({ f: 90, f1: 50, dur: 0.16, peak: 0.45, click: 0.3, lp: 600 });
    S.thud({ at: 0.13, f: 85, f1: 48, dur: 0.16, peak: 0.45, click: 0.3, lp: 600 });
    S.wood({ at: 0.14, f: 300, dur: 0.12, peak: 0.22 });
    S.whoosh({ at: 0.3, color: 'brown', f: 150, f1: 600, dur: 0.22, peakAt: 0.4, peak: 0.2 });
    S.crackle({ at: 0.3, dens: 1.6, f: 3000, dur: 0.4, pts: [[0.05, 1], [0.4, 0]], peak: 0.1 });
  });
  def('fd-post-out', 'hud', S => {
    S.sizzle({ dur: 0.35, peak: 0.16, pts: [[0.03, 1], [0.35, 0]] });
    S.noise({ color: 'pink', lp: 900, dur: 0.1, a: 0.003, peak: 0.25 });
    S.tone({ f: 400, f1: 150, dur: 0.35, peak: 0.1, lp: 700 });
    S.creak({ at: 0.05, dur: 0.2, f: 24, f1: 14, res: [400, 800], q: 9, peak: 0.06 });
  });
  def('fd-relight', 'hud', S => {
    S.space('room', 0.2);
    S.whoosh({ color: 'brown', f: 150, f1: 900, dur: 0.3, peakAt: 0.5, peak: 0.26 });
    S.crackle({ at: 0.1, dens: 1.8, f: 3000, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.13 });
    S.bell({ at: 0.15, f: mf(81), dur: 0.8, peak: 0.1 });
    S.tone({ type: 'tri', f: 300, f1: 520, dur: 0.3, a: 0.1, peak: 0.1, lp: 1200 });
  });
  def('fd-waystone-wake', 'hud', S => {
    S.space('hall', 0.3);
    S.thud({ f: 90, f1: 55, dur: 0.3, peak: 0.35, click: 0.1, lp: 500 });
    S.partials({ at: 0.02, set: 'stone', f: mf(46), dur: 1.2, peak: 0.28, strike: 0.5 });
    S.bell({ at: 0.12, f: mf(58), dur: 1.4, peak: 0.14 });
    [74, 79, 83, 86].forEach((n, i) => S.glass({ at: 0.3 + i * 0.1, f: mf(n), dur: 0.9, peak: 0.07 }));
    S.tone({ type: 'tri', at: 0.2, f: 280, f1: 760, dur: 0.6, a: 0.3, peak: 0.07, lp: 1400 });
  });
  def('fd-loot-land', 'town', S => {
    S.metal({ set: 'bar', f: S.rr(2100, 2500), dur: 0.14, peak: 0.2, click: 0.2 });
    S.tick({ at: 0.01, f: 3200, peak: 0.08 });
    S.metal({ at: 0.07, set: 'bar', f: S.rr(3000, 3500), dur: 0.09, peak: 0.1 });
    S.thud({ f: 140, f1: 90, dur: 0.07, peak: 0.12, lp: 600 });
  });
  def('fd-brand', 'hud', S => {
    S.tick({ f: 3000, peak: 0.2 });
    S.scrape({ f: 3500, q: 2, rate: 60, dur: 0.12, peak: 0.1 });
    S.whoosh({ at: 0.13, color: 'pink', f: 200, f1: 1200, dur: 0.25, peakAt: 0.3, peak: 0.26 });
    S.crackle({ at: 0.15, dens: 1.5, f: 2800, dur: 0.6, pts: [[0.05, 1], [0.6, 0.3]], peak: 0.14 });
  });
  def('fd-carve', 'ui', S => {
    S.metal({ set: 'stone', f: S.rr(1300, 1600), dur: 0.12, peak: 0.28 });
    S.noise({ hp: 3000, dur: 0.05, a: 0.001, peak: 0.12 });
    S.tick({ at: 0.01, f: 3000, peak: 0.08 });
  });
  def('fd-cover', 'hud', S => {
    S.space('room', 0.2);
    S.scrape({ f: 320, q: 1, rate: 18, dur: 0.7, peak: 0.28, pts: [[0.1, 1], [0.7, 0.4]] });
    S.rumble({ dur: 0.8, f: 85, peak: 0.28, a: 0.2 });
    S.thud({ at: 0.68, f: 70, f1: 38, dur: 0.3, peak: 0.45, click: 0.1 });
    S.metal({ at: 0.68, set: 'stone', f: 170, dur: 0.5, peak: 0.12, strike: 0.5 });
  });
  def('fd-boon', 'hud', S => {
    S.space('hall', 0.3);
    [79, 83, 86].forEach((n, i) => S.glass({ at: i * 0.06, f: mf(n), dur: 0.9, peak: 0.12 }));
    S.pad({ notes: [mf(55), mf(62)], type: 'tri', dur: 0.9, a: 0.25, peak: 0.12, lpEnv: [400, 1800, 900] });
    S.bubbles({ at: 0.1, n: 5, f: 1200, f1: 3200, spread: 0.5, size: 0.03, peak: 0.04 });
  });
  def('fd-buy', 'ui', S => {
    S.coins({ n: 3, f: 3000, spread: 0.1, peak: 0.18 });
    S.thud({ at: 0.12, f: 110, f1: 70, dur: 0.1, peak: 0.3, click: 0, lp: 500 });
    S.wood({ at: 0.13, f: 500, dur: 0.07, peak: 0.1 });
  });
  def('fd-forge', 'ab', S => {
    S.space('room', 0.25);
    S.thud({ f: 100, f1: 60, dur: 0.12, peak: 0.45, click: 0.4 });
    S.metal({ set: 'bar', f: 880, dur: 0.9, peak: 0.34, strike: 0.9 });
    S.metal({ at: 0.01, set: 'plate', f: 1320, dur: 0.4, peak: 0.1, click: 0 });
    S.sizzle({ at: 0.15, dur: 0.6, peak: 0.12, pts: [[0.05, 1], [0.6, 0]] });
  });
  def('fd-hyperforge', 'ab', S => {
    S.space('hall', 0.35);
    S.thud({ f: 90, f1: 55, dur: 0.15, peak: 0.5, click: 0.4 });
    S.metal({ set: 'bar', f: 880, dur: 1.1, peak: 0.34, strike: 0.9 });
    S.bell({ at: 0.15, f: mf(81), dur: 1.6, peak: 0.2 });
    S.whoosh({ at: 0.1, f: 400, f1: 4200, dur: 0.7, peakAt: 0.8, peak: 0.22 });
    [88, 93, 97, 100].forEach((n, i) => S.glass({ at: 0.35 + i * 0.09, f: mf(n), dur: 0.9, peak: 0.08 }));
    S.sizzle({ at: 0.2, dur: 0.8, peak: 0.1, pts: [[0.05, 1], [0.8, 0]] });
  });
  def('fd-page', 'hud', S => {
    S.space('room', 0.2);
    S.noise({ hp: 2500, bp: 5000, q: 0.6, dur: 0.14, am: [30, 0.7], pts: [[0.04, 1], [0.14, 0]], peak: 0.18 });
    S.noise({ at: 0.09, hp: 2500, bp: 4200, q: 0.6, dur: 0.1, am: [26, 0.7], peak: 0.12 });
    S.glass({ at: 0.14, f: mf(91), dur: 0.7, peak: 0.1 });
  });
  def('fd-gate-shut', 'sting', S => {
    S.space('hall', 0.4);
    S.creak({ dur: 1.0, f: 18, f1: 9, res: [300, 640, 1100], q: 11, peak: 0.2 });
    S.whoosh({ color: 'brown', at: 0.7, f: 100, f1: 600, dur: 0.4, peakAt: 0.9, peak: 0.25 });
    S.thud({ at: 1.0, f: 45, f1: 20, dur: 1.6, drive: 3, peak: 0.95 });
    S.metal({ at: 1.0, set: 'stone', f: 140, dur: 1.5, peak: 0.25, strike: 0.7 });
    S.wood({ at: 1.35, f: 160, dur: 0.4, peak: 0.4 });
    S.thud({ at: 1.35, f: 60, f1: 34, dur: 0.5, peak: 0.55 });
    S.rumble({ at: 1.0, dur: 1.8, f: 70, peak: 0.35, a: 0.05 });
    S.bell({ at: 1.7, f: mf(38), dur: 2.2, peak: 0.2 });
  });
  def('fd-count', 'hud', S => {
    S.space('room', 0.2);
    S.wood({ f: 300, dur: 0.1, peak: 0.25 });
    S.bell({ at: 0.02, f: mf(72), dur: 0.55, peak: 0.14 });
  });
  def('fd-victory', 'sting', S => {
    S.space('hall', 0.45);
    S.horn({ f: mf(50), dur: 0.5, peak: 0.3, bright: 5 });
    S.horn({ at: 0.45, f: mf(57), dur: 0.45, peak: 0.3, bright: 5 });
    S.horn({ at: 0.85, f: mf(62), dur: 1.9, peak: 0.34, bright: 5 });
    S.drum({ f: 70, dur: 0.6, peak: 0.45 }); S.drum({ at: 0.45, f: 70, dur: 0.6, peak: 0.45 }); S.drum({ at: 0.85, f: 62, dur: 1.0, peak: 0.5 });
    S.choir({ at: 0.9, notes: [mf(50), mf(57), mf(62), mf(66)], vowel: 'a', vowel1: 'o', dur: 2.3, a: 0.5, peak: 0.14 });
    [74, 78, 81, 86].forEach((n, i) => S.bell({ at: 1.0 + i * 0.16, f: mf(n), dur: 1.6, peak: 0.14 }));
    S.coins({ at: 1.2, n: 5, f: 3400, spread: 0.5, peak: 0.1 });
  });
  def('fd-defeat', 'sting', S => {
    S.space('hall', 0.5);
    S.pad({ notes: [mf(38), mf(45), mf(50)], type: 'tri', dur: 2.8, a: 0.5, bend: -1.5, peak: 0.24, lpEnv: [800, 500, 200] });
    S.drum({ f: 52, dur: 1.0, peak: 0.55 }); S.drum({ at: 0.95, f: 46, dur: 1.4, peak: 0.55 });
    S.voice({ at: 0.2, f: 110, f1: 78, dur: 2.0, vowel: 'u', vowel1: 'o', breath: 5, peak: 0.16, pts: [[0.4, 1], [2.0, 0]] });
    S.bell({ at: 1.0, f: mf(62), dur: 2.2, peak: 0.14 });
    S.rumble({ dur: 2.6, f: 55, peak: 0.3, a: 0.3 });
  });

  // ---- the Founding, pass 2: recall, pings, a lane under strain, a wave step, a sale (all quiet)
  def('fd-recall', 'hud', S => {
    S.space('hall', 0.35);
    S.pad({ notes: [mf(57), mf(64), mf(69)], type: 'tri', dur: 1.6, a: 0.7, peak: 0.16, lpEnv: [500, 2200, 1400] });
    S.whoosh({ f: 400, f1: 2800, dur: 1.5, peakAt: 0.9, peak: 0.07 });
    [0.35, 0.7, 1.05].forEach((at, i) => S.glass({ at, f: mf(78 + i * 3), dur: 0.7, peak: 0.07 }));
  });
  def('fd-recall-done', 'hud', S => {
    S.space('hall', 0.3);
    [72, 79, 84].forEach((n, i) => S.glass({ at: i * 0.07, f: mf(n), dur: 0.9, peak: 0.12 }));
    S.pad({ notes: [mf(55), mf(62)], type: 'tri', dur: 0.8, a: 0.1, peak: 0.1, lpEnv: [1600, 900, 500] });
    S.bubbles({ at: 0.05, n: 4, f: 1600, f1: 3400, spread: 0.3, size: 0.03, peak: 0.03 });
  });
  def('fd-ping', 'hud', S => {
    S.space('room', 0.15);
    S.tick({ f: 2000, peak: 0.28 });
    S.glass({ at: 0.04, f: mf(88), dur: 0.35, peak: 0.07 });
  });
  def('fd-alert', 'hud', S => {
    S.space('hall', 0.35);
    S.horn({ f: mf(47), dur: 0.9, peak: 0.16, bright: 3 });
    S.horn({ at: 0.04, f: mf(54), dur: 0.8, peak: 0.07, bright: 3 });
    S.pad({ notes: [mf(40)], type: 'tri', dur: 1.1, a: 0.3, peak: 0.08, lpEnv: [300, 500, 250] });
  });
  def('fd-step', 'hud', S => {
    S.space('hall', 0.3);
    S.pad({ notes: [mf(43), mf(50), mf(55)], type: 'tri', dur: 1.4, a: 0.4, bend: 0.8, peak: 0.12, lpEnv: [400, 1000, 400] });
    S.drum({ f: 74, dur: 0.5, peak: 0.2 });
    S.metal({ at: 0.05, set: 'plate', f: 260, dur: 0.7, peak: 0.05 });
  });
  def('fd-sell', 'ui', S => {
    S.coins({ n: 3, f: 3300, spread: 0.12, peak: 0.16 });
    S.wood({ at: 0.02, f: 560, dur: 0.06, peak: 0.1 });
    S.thud({ at: 0.14, f: 130, f1: 80, dur: 0.09, peak: 0.16, click: 0, lp: 500 });
  });

  // ---- the Founding, pass 4: defence towers, squads, wild camps (all soft; they repeat a lot)
  def('fd-bell-ring', 'hud', S => {
    S.space('hall', 0.3);
    S.bell({ f: mf(64), dur: 1.6, peak: 0.2, beat: 1.4 });
    S.bell({ at: 0.01, f: mf(71), dur: 1.0, peak: 0.06 });
    S.glass({ at: 0.08, f: mf(95), dur: 1.1, peak: 0.035, am: [5, 0.4] });
  });
  def('fd-ballista', 'ui', S => {
    S.thud({ f: 125, f1: 55, dur: 0.16, peak: 0.5, click: 0.25, lp: 800 });
    S.pluck({ f: mf(40), dur: 0.4, peak: 0.34, bright: 5, bend: -4 });
    S.wood({ at: 0.004, f: 320, dur: 0.1, peak: 0.22 });
    S.whoosh({ at: 0.03, color: 'white', f: 3200, f1: 900, dur: 0.15, peakAt: 0.3, peak: 0.07 });
  });
  def('fd-tower-fall', 'ab', S => {
    S.space('room', 0.2);
    S.creak({ dur: 0.22, f: 22, f1: 14, res: [380, 800], q: 9, peak: 0.12 });
    S.crack({ at: 0.04, peak: 0.28, dur: 0.22, f: 800 });
    for (let i = 0; i < 5; i++) S.wood({ at: 0.1 + i * 0.07 + S.rr(0, 0.04), f: S.rr(160, 520), dur: 0.2, peak: 0.24, pan: S.rr(-0.4, 0.4) });
    S.thud({ at: 0.12, f: 72, f1: 34, dur: 0.6, drive: 1.8, peak: 0.6 });
    S.metal({ at: 0.14, set: 'stone', f: 170, dur: 0.5, peak: 0.14, strike: 0.6 });
    S.rumble({ at: 0.1, dur: 0.8, f: 90, peak: 0.24, a: 0.05 });
    S.skitter({ at: 0.2, dur: 0.6, n: 12, f: 1400, f1: 700, peak: 0.07 });
  });
  def('fd-march', 'hud', S => {
    S.space('hall', 0.35);
    S.horn({ f: mf(43), dur: 0.75, peak: 0.13, bright: 3 });
    S.horn({ at: 0.6, f: mf(50), dur: 1.0, peak: 0.13, bright: 3 });
    [0, 0.3, 0.6, 0.85].forEach((at, i) => S.drum({ at, f: 78 - (i > 2 ? 8 : 0), dur: 0.35, peak: 0.18 }));
    S.pad({ notes: [mf(43), mf(50)], type: 'tri', dur: 1.5, a: 0.3, peak: 0.05, lpEnv: [300, 700, 300] });
  });
  def('fd-wild-wake', 'hud', S => {
    S.space('room', 0.15);
    S.noise({ color: 'pink', bp: 1500, bp1: 500, q: 1.2, dur: 0.22, a: 0.02, peak: 0.15, pts: [[0.05, 1], [0.22, 0]] });
    S.voice({ at: 0.12, f: 88, f1: 62, dur: 0.6, vowel: 'o', vowel1: 'u', breath: 7, peak: 0.16, pts: [[0.12, 1], [0.6, 0]] });
    S.rumble({ at: 0.1, dur: 0.5, f: 70, peak: 0.12, a: 0.1 });
  });
  def('fd-wild-howl', 'hud', S => {
    S.space('hall', 0.4);
    S.voice({ f: 300, f1: 540, dur: 0.7, vowel: 'o', vowel1: 'u', breath: 2, peak: 0.13, pts: [[0.3, 1], [0.7, 0.9]] });
    S.voice({ at: 0.65, f: 540, f1: 380, dur: 1.1, vowel: 'u', vowel1: 'o', breath: 2, peak: 0.13, pts: [[0.15, 0.9], [0.7, 0.6], [1.1, 0]] });
    S.noise({ at: 0.1, color: 'pink', bp: 1800, q: 1, dur: 1.4, a: 0.3, peak: 0.03, pts: [[0.4, 1], [1.4, 0]] });
  });
  def('fd-wild-return', 'ui', S => {
    S.thud({ f: 90, f1: 48, dur: 0.3, peak: 0.4, click: 0, lp: 450 });
    S.noise({ at: 0.04, color: 'brown', lp: 900, lp1: 250, dur: 0.4, a: 0.05, peak: 0.25, pts: [[0.1, 1], [0.4, 0]] });
    S.voice({ at: 0.08, f: 75, f1: 58, dur: 0.35, vowel: 'u', breath: 6, peak: 0.07 });
  });
  def('fd-wild-boar', 'ui', S => {
    S.thud({ f: 110, f1: 60, dur: 0.14, peak: 0.45, click: 0.2, lp: 700 });
    S.voice({ f: 120, f1: 80, dur: 0.22, vowel: 'o', breath: 7, peak: 0.12 });
    S.wood({ at: 0.01, f: 260, dur: 0.1, peak: 0.18 });
  });
  def('fd-wild-wolf', 'ui', S => {
    S.noise({ hp: 2500, dur: 0.03, a: 0.001, peak: 0.2 });
    S.wood({ at: 0.005, f: 1500, dur: 0.07, peak: 0.2 });
    S.voice({ at: 0.02, f: 190, f1: 130, dur: 0.25, vowel: 'a', breath: 8, peak: 0.1 });
    S.thud({ at: 0.03, f: 100, f1: 56, dur: 0.1, peak: 0.25, click: 0, lp: 500 });
  });
  def('fd-wild-snap', 'ui', S => {
    S.wood({ f: 900, dur: 0.06, peak: 0.28 });
    S.wood({ at: 0.07, f: 700, dur: 0.06, peak: 0.2 });
    S.splat({ at: 0.02, peak: 0.12, dur: 0.15 });
  });
  def('fd-wild-stone', 'ui', S => {
    S.metal({ set: 'stone', f: 210, dur: 0.35, peak: 0.28, strike: 0.7 });
    S.thud({ f: 85, f1: 45, dur: 0.2, peak: 0.4, click: 0.1, lp: 500 });
    S.skitter({ at: 0.03, dur: 0.18, n: 5, f: 1600, peak: 0.07 });
  });

  // ---- the Founding: the hidden chain (names only; see client-chain.js)
  def('fd-chain-bell', 'ab', S => {
    S.space('hall', 0.4);
    S.bell({ f: mf(55), dur: 2.0, peak: 0.26, beat: 2.4 });
    S.bell({ at: 0.01, f: mf(55) * 1.06, dur: 1.2, peak: 0.1 });
    S.crackle({ at: 0.02, dens: 1.3, f: 2400, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.07 });
    S.thud({ f: 100, f1: 60, dur: 0.12, peak: 0.25, click: 0.2, lp: 500 });
  });
  def('fd-chain-far', 'sting', S => {
    S.space('cave', 0.5);
    S.horn({ f: mf(36), dur: 1.7, peak: 0.3, bright: 2.5 });
    S.drum({ at: 0.3, f: 54, dur: 1.0, peak: 0.45 });
    S.rumble({ dur: 1.8, f: 60, peak: 0.3, a: 0.5 });
    S.choir({ at: 0.2, notes: [mf(36)], vowel: 'u', dur: 1.6, a: 0.7, peak: 0.07, lp: 900 });
  });
  def('fd-chain-ram-charge', 'bm', S => {
    S.space('cave', 0.15);
    for (let i = 0; i < 9; i++) S.thud({ at: 0.04 + i * 0.1 - i * i * 0.004, f: 82 - i, f1: 40, dur: 0.18, peak: 0.1 + i * 0.045, click: 0.15, lp: 450 });
    S.noise({ color: 'pink', bp: 1400, bp1: 500, q: 1, dur: 0.18, a: 0.01, peak: 0.12 });
    S.whoosh({ at: 0.1, color: 'brown', f: 120, f1: 900, dur: 0.8, peakAt: 0.9, peak: 0.28 });
    S.rumble({ dur: 0.95, f: 80, peak: 0.25, a: 0.5 });
  });
  def('fd-chain-ram-stamp', 'bm', S => {
    S.space('cave', 0.25);
    S.thud({ f: 62, f1: 30, dur: 0.6, drive: 2, peak: 0.7 });
    S.crack({ at: 0.01, peak: 0.28, dur: 0.18, f: 1300 });
    S.glass({ at: 0.03, f: mf(96), dur: 0.7, peak: 0.1 });
    S.metal({ at: 0.02, set: 'stone', f: 150, dur: 0.5, peak: 0.16, strike: 0.6 });
    S.rumble({ dur: 0.5, f: 90, peak: 0.22, a: 0.04 });
    S.skitter({ at: 0.05, dur: 0.3, n: 8, f: 2200, f1: 1200, peak: 0.07 });
  });
  def('fd-chain-sweep', 'bm', S => {
    S.whoosh({ color: 'brown', f: 120, f1: 1000, dur: 0.55, peakAt: 0.75, peak: 0.32 });
    S.wood({ at: 0.4, f: 200, dur: 0.2, peak: 0.34 });
    S.thud({ at: 0.4, f: 80, f1: 40, dur: 0.4, drive: 1.5, peak: 0.55 });
    S.glass({ at: 0.41, f: mf(90), dur: 0.5, peak: 0.07 });
    S.noise({ at: 0.42, color: 'pink', bp: 1000, q: 0.8, dur: 0.3, pts: [[0.03, 1], [0.3, 0]], peak: 0.12 });
  });
  def('fd-chain-pike-lunge', 'bm', S => {
    S.space('room', 0.2);
    S.noise({ color: 'pink', lp: 3000, lp1: 500, dur: 0.4, a: 0.02, pts: [[0.1, 1], [0.4, 0]], peak: 0.32, grain: 0.3 });
    S.bubbles({ n: 7, f: 300, f1: 1400, spread: 0.2, size: 0.035, peak: 0.1 });
    S.wood({ at: 0.2, f: 1200, dur: 0.06, peak: 0.3 });
    S.wood({ at: 0.24, f: 950, dur: 0.07, peak: 0.22 });
    S.splat({ at: 0.18, peak: 0.25, dur: 0.25 });
  });
  def('fd-chain-pike-slap', 'bm', S => {
    S.space('room', 0.2);
    S.splat({ peak: 0.6, dur: 0.35 });
    S.crack({ peak: 0.2, dur: 0.15, f: 1800 });
    S.thud({ f: 90, f1: 46, dur: 0.3, peak: 0.45, click: 0.1, lp: 500 });
    S.bubbles({ at: 0.06, n: 8, f: 900, f1: 3000, spread: 0.35, size: 0.02, peak: 0.07, bias: 1.5 });
  });
  def('fd-chain-bubble', 'hud', S => {
    S.bubbles({ n: 6, f: 280, f1: 1000, spread: 0.14, size: 0.03, peak: 0.12 });
    S.whoosh({ at: 0.04, color: 'white', f: 1000, f1: 2000, dur: 0.14, peakAt: 0.4, peak: 0.09 });
    S.glass({ at: 0.16, f: mf(86), dur: 0.5, peak: 0.05 });
  });
  def('fd-chain-root-snare', 'bm', S => {
    S.space('cave', 0.2);
    S.creak({ dur: 0.7, f: 20, f1: 36, res: [300, 700, 1300], q: 10, peak: 0.2, pts: [[0.1, 1], [0.7, 0.4]] });
    S.scrape({ f: 500, q: 1.3, rate: 24, dur: 0.5, peak: 0.16, pts: [[0.1, 1], [0.5, 0]] });
    [0.1, 0.22, 0.32].forEach(at => { S.crack({ at, peak: 0.2, dur: 0.12, f: 1000 }); S.wood({ at, f: S.rr(200, 400), dur: 0.15, peak: 0.25 }); });
    S.thud({ at: 0.05, f: 70, f1: 36, dur: 0.5, drive: 1.6, peak: 0.5 });
  });
  def('fd-chain-stump-throw', 'bm', S => {
    S.space('room', 0.2);
    S.creak({ dur: 0.3, f: 24, f1: 16, res: [350, 800], q: 9, peak: 0.14 });
    S.whoosh({ at: 0.15, color: 'brown', f: 150, f1: 900, dur: 0.4, peakAt: 0.5, peak: 0.28 });
    S.thud({ at: 0.18, f: 100, f1: 52, dur: 0.2, peak: 0.4, click: 0.2, lp: 700 });
    S.wood({ at: 0.19, f: 240, dur: 0.18, peak: 0.28 });
  });
  def('fd-chain-ash-breath', 'bm', S => {
    S.space('hall', 0.3);
    S.noise({ color: 'pink', bp: 1600, bp1: 700, q: 0.7, dur: 1.4, a: 0.3, pts: [[0.3, 1], [1.4, 0]], peak: 0.3 });
    S.crackle({ dens: 1.4, f: 2800, dur: 1.2, pts: [[0.3, 1], [1.2, 0]], peak: 0.13 });
    S.rumble({ dur: 1.5, f: 65, peak: 0.28, a: 0.4 });
    S.voice({ f: 100, f1: 72, dur: 1.2, vowel: 'o', breath: 9, peak: 0.1, pts: [[0.3, 1], [1.2, 0]] });
    S.sizzle({ at: 0.2, dur: 1.0, peak: 0.04, pts: [[0.3, 1], [1.0, 0]] });
  });
  def('fd-chain-whelp-call', 'bm', S => {
    S.space('cave', 0.3);
    S.voice({ f: 220, f1: 170, dur: 0.7, vowel: 'a', vowel1: 'o', breath: 4, peak: 0.16, pts: [[0.15, 1], [0.7, 0]] });
    [0.45, 0.65, 0.88].forEach(at => S.voice({ at, f: S.rr(620, 760), f1: S.rr(900, 1050), dur: 0.16, vowel: 'i', breath: 4, peak: 0.08, pan: S.rr(-0.6, 0.6) }));
    S.skitter({ at: 0.5, dur: 0.6, n: 14, f: 2600, f1: 1400, peak: 0.08, bias: 0.8 });
  });
  def('fd-chain-oak-cut', 'ab', S => {
    S.space('room', 0.12);
    S.thud({ f: 130, f1: 70, dur: 0.14, peak: 0.4, click: 0.35, lp: 900 });
    S.wood({ at: 0.004, f: 330, dur: 0.18, peak: 0.34 });
    S.crack({ at: 0.01, peak: 0.16, dur: 0.1, f: 1500 });
    S.skitter({ at: 0.06, dur: 0.25, n: 6, f: 1800, f1: 1000, peak: 0.06 });
  });
  def('fd-chain-soak-ok', 'hud', S => {
    S.space('room', 0.3);
    [79, 83, 88].forEach((n, i) => S.glass({ at: i * 0.07, f: mf(n), dur: 0.8, peak: 0.1 }));
    S.bubbles({ at: 0.02, n: 4, f: 800, f1: 2200, spread: 0.25, size: 0.03, peak: 0.04 });
    S.pad({ notes: [mf(55), mf(62)], type: 'tri', dur: 0.7, a: 0.1, peak: 0.06, lpEnv: [900, 600, 400] });
  });
  def('fd-chain-down', 'sting', S => {
    S.space('hall', 0.4);
    S.horn({ f: mf(48), dur: 0.5, peak: 0.2, bright: 4 });
    S.horn({ at: 0.45, f: mf(55), dur: 1.2, peak: 0.2, bright: 4 });
    S.drum({ f: 66, dur: 0.6, peak: 0.4 }); S.drum({ at: 0.45, f: 62, dur: 0.9, peak: 0.4 });
    [76, 83, 88].forEach((n, i) => S.bell({ at: 0.55 + i * 0.12, f: mf(n), dur: 1.4, peak: 0.1 }));
    S.coins({ at: 0.7, n: 4, f: 3300, spread: 0.3, peak: 0.07 });
  });

  // ---- the Founding, pass 5: basic combat (autos, their impacts, small enemy strikes, soldiers). Constant, so very soft, short and varied.
  def('fd-auto-holy', 'ui', S => {
    const n = [88, 91, 95][S.vi(3)];
    S.glass({ f: mf(n), dur: 0.22, peak: 0.1 });
    S.tone({ f: S.rr(620, 720), f1: S.rr(900, 1000), dur: 0.09, peak: 0.1, lp: 2400 });
    S.noise({ hp: 5000, dur: 0.03, a: 0.003, peak: 0.03 });
  });
  def('fd-auto-ember', 'ui', S => {
    S.whoosh({ color: 'pink', f: S.rr(900, 1100), f1: 2600, dur: 0.1, peakAt: 0.5, peak: 0.12 });
    S.crackle({ dens: 1.8, f: 3000, dur: 0.12, pts: [[0.02, 1], [0.12, 0]], peak: 0.09 });
    S.tone({ f: S.rr(420, 520), f1: 260, dur: 0.1, peak: 0.07, lp: 1500 });
  });
  def('fd-auto-hit-melee', 'ui', S => {
    S.thud({ f: S.rr(130, 170), f1: 75, dur: 0.07, peak: 0.28, click: 0.4, lp: 1000 });
    S.metal({ set: 'bar', f: S.rr(900, 1300), dur: 0.12, peak: 0.07, strike: 0.5 });
  });
  def('fd-auto-hit-arrow', 'ui', S => {
    S.wood({ f: S.rr(520, 760), dur: 0.07, peak: 0.2 });
    S.thud({ f: S.rr(150, 190), f1: 100, dur: 0.05, peak: 0.12, click: 0, lp: 700 });
  });
  def('fd-auto-hit-holy', 'ui', S => {
    S.glass({ f: mf([93, 96, 100][S.vi(3)]), dur: 0.2, peak: 0.08 });
    S.noise({ color: 'pink', bp: 2200, q: 1, dur: 0.05, a: 0.003, peak: 0.07 });
  });
  def('fd-auto-hit-ember', 'ui', S => {
    S.noise({ color: 'pink', lp: 1400, dur: 0.07, a: 0.002, peak: 0.16 });
    S.crackle({ dens: 2.2, f: 3400, dur: 0.14, pts: [[0.02, 1], [0.14, 0]], peak: 0.08 });
    S.thud({ f: S.rr(120, 150), f1: 70, dur: 0.06, peak: 0.12, click: 0, lp: 600 });
  });
  def('fd-strike-claw', 'ui', S => {
    S.noise({ color: 'white', bp: S.rr(2400, 3400), bp1: 1400, q: 1.5, dur: 0.07, a: 0.004, peak: 0.12 });
    S.skitter({ at: 0.01, dur: 0.06, n: 3, f: 2800, peak: 0.07 });
    S.thud({ at: 0.02, f: S.rr(110, 140), f1: 70, dur: 0.06, peak: 0.12, click: 0, lp: 600 });
  });
  def('fd-strike-dart', 'ui', S => {
    S.whoosh({ color: 'white', f: S.rr(3500, 4200), f1: 1200, dur: 0.09, peakAt: 0.3, peak: 0.1 });
    S.crackle({ at: 0.04, dens: 2, f: 3600, dur: 0.1, pts: [[0.02, 1], [0.1, 0]], peak: 0.06 });
    S.thud({ at: 0.05, f: S.rr(150, 190), f1: 90, dur: 0.05, peak: 0.1, click: 0, lp: 700 });
  });
  def('fd-strike-slag', 'ui', S => {
    S.thud({ f: S.rr(75, 95), f1: 45, dur: 0.16, peak: 0.34, click: 0.15, lp: 500 });
    S.metal({ at: 0.01, set: 'stone', f: S.rr(150, 200), dur: 0.2, peak: 0.1, strike: 0.5 });
    S.crackle({ at: 0.03, dens: 1.2, f: 2400, dur: 0.14, pts: [[0.02, 1], [0.14, 0]], peak: 0.05 });
  });
  def('fd-strike-torch', 'ui', S => {
    S.whoosh({ color: 'brown', f: 200, f1: S.rr(1000, 1400), dur: 0.12, peakAt: 0.5, peak: 0.16 });
    S.crackle({ at: 0.03, dens: 1.5, f: 2800, dur: 0.16, pts: [[0.02, 1], [0.16, 0]], peak: 0.08 });
    S.thud({ at: 0.06, f: S.rr(120, 150), f1: 80, dur: 0.06, peak: 0.1, click: 0, lp: 500 });
  });
  def('fd-strike-shade', 'ui', S => {
    S.space('room', 0.25);
    S.whoosh({ color: 'pink', f: 1800, f1: 500, dur: 0.18, peakAt: 0.4, peak: 0.08 });
    S.glass({ at: 0.03, f: mf(S.vi(2) ? 83 : 86), dur: 0.3, peak: 0.03 });
    S.thud({ at: 0.08, f: 90, f1: 50, dur: 0.08, peak: 0.1, click: 0, lp: 400 });
  });
  def('fd-soldier-swing', 'ui', S => {
    S.whoosh({ color: 'pink', f: S.rr(500, 650), f1: 1500, dur: 0.07, peakAt: 0.4, peak: 0.1 });
    S.metal({ at: 0.045, set: 'bar', f: S.rr(700, 1000), dur: 0.1, peak: 0.07, strike: 0.5 });
    S.thud({ at: 0.045, f: S.rr(140, 180), f1: 85, dur: 0.05, peak: 0.12, click: 0.2, lp: 900 });
  });
  def('fd-soldier-shot', 'ui', S => {
    S.pluck({ f: S.rr(280, 340), dur: 0.08, bright: 8, peak: 0.12 });
    S.whoosh({ color: 'white', f: 3000, f1: 1800, dur: 0.08, peakAt: 0.3, peak: 0.05 });
  });
  def('fd-soldier-heal', 'ui', S => {
    S.space('room', 0.2);
    S.glass({ f: mf([84, 88, 91][S.vi(3)]), dur: 0.35, peak: 0.08 });
    S.bubbles({ n: 3, f: 900, f1: 2000, spread: 0.12, size: 0.025, peak: 0.03 });
  });
  // the Ash Spire: a slow heavy ember bolt leaves it (a low rising roar with an ember crackle), and lands with a dull ash thud and a spray of sparks
  def('fd-spire-bolt', 'ui', S => {
    S.space('room', 0.2);
    S.whoosh({ color: 'brown', f: S.rr(160, 200), f1: S.rr(480, 560), dur: 0.5, peakAt: 0.55, peak: 0.16 });
    S.noise({ color: 'brown', bp: 140, bp1: 380, q: 0.9, dur: 0.5, a: 0.1, pts: [[0.3, 1], [0.5, 0]], peak: 0.1 });
    S.crackle({ at: 0.03, dens: 1.6, f: 2600, dur: 0.4, pts: [[0.08, 1], [0.4, 0]], peak: 0.06 });
  });
  def('fd-spire-hit', 'ui', S => {
    S.thud({ f: S.rr(80, 100), f1: 42, dur: 0.2, peak: 0.3, click: 0.1, lp: 500 });
    S.crackle({ at: 0.01, dens: 2, f: 2800, dur: 0.22, pts: [[0.02, 1], [0.22, 0]], peak: 0.1 });
    S.metal({ at: 0.01, set: 'stone', f: S.rr(140, 190), dur: 0.2, peak: 0.07, strike: 0.5 });
  });

  // ---------------------------------------------------------------------------------------------- The Cinder Sovereign (the Ultimate, boss id sovereign)
  // ember and ash: a deep crackling body of fire under everything, and a struck-blade ring on the blade moves (a bar of steel and a thread of glass,
  // lower and hotter than Caelum's cold glass). The twelve call stings borrow one signature texture from each fallen boss and lay the same ember
  // crackle over it, so every echo sounds like itself and like this fight. Set pieces are soft rising tones, bells and a choir. No words.
  const svBody = (S, at, dur, pk, dens, pan) => {       // the deep crackling body: a low fire roar, a crackle, a sizzle
    S.noise({ at, color: 'brown', bp: 110, bp1: 300, q: 0.9, dur, a: Math.min(0.4, dur * 0.3), pts: [[dur * 0.55, 1], [dur, 0]], peak: pk, pan });
    S.crackle({ at, dens: dens || 1.4, f: 2400, dur, pts: [[Math.min(0.2, dur * 0.15), 1], [dur, 0]], peak: pk * 0.55, pan });
    S.sizzle({ at, dur, pts: [[dur * 0.2, 1], [dur, 0]], peak: pk * 0.3, pan });
  };
  const svLay = (S, at, dur, pk, pan) => {              // the ember crackle laid over a sting
    S.crackle({ at, dens: 1.8, f: 3000, dur, pts: [[0.08, 1], [dur, 0]], peak: pk, pan });
    S.noise({ at, color: 'brown', bp: 140, bp1: 260, q: 0.8, dur, a: 0.1, pts: [[dur * 0.5, 1], [dur, 0]], peak: pk * 0.9, pan });
  };
  const svRing = (S, at, f, pk, dur, pan) => {          // a struck blade: steel bar, its inharmonic overtone, a thread of glass
    S.metal({ at, set: 'bar', f, dur: dur || 1.8, peak: pk, strike: 0.5, pan });
    S.metal({ at: at + 0.004, set: 'bar', f: f * 2.76, dur: 0.8, peak: pk * 0.3, click: 0, pan });
    S.glass({ at: at + 0.01, f: f * 1.5, dur: (dur || 1.8) * 0.5, peak: pk * 0.12, pan });
  };
  const svSwing = (S, at, f, pk, pan, d) => S.whoosh({ at, f: f * 0.4, f1: f * 2.4, dur: d || 0.3, peakAt: 0.8, peak: pk, q: 1.5, pan });
  const svHush = (S, at, d, pk, f0, f1, pan) => S.noise({ at, bp: f0 || 900, bp1: f1 || 3200, q: 3, dur: d, a: d * 0.85, pts: [[d * 0.92, 1], [d, 0]], peak: pk, pan });   // the breath drawn in before a cut
  const svCloche = (S, at, pk) => {                     // a cloche lid lifted: a clank, a slide, a service bell's ting, a puff of steam
    S.metal({ at, set: 'plate', f: 900, dur: 0.5, peak: 0.22 * pk, strike: 0.8 });
    S.scrape({ at: at + 0.03, f: 2600, q: 2, dur: 0.2, rate: 30, peak: 0.07 * pk, pts: [[0.05, 1], [0.2, 0]] });
    S.metal({ at: at + 0.2, set: 'bar', f: 2900, dur: 0.7, peak: 0.1 * pk, strike: 0.6 });
    S.glass({ at: at + 0.21, f: 4300, dur: 0.5, peak: 0.05 * pk });
    S.noise({ at: at + 0.1, hp: 3500, dur: 0.35, a: 0.02, pts: [[0.05, 1], [0.35, 0]], peak: 0.07 * pk });
  };
  const svFlambe = (S, at, pk) => {                     // a flambé: the whoosh builds, then the fwoomp of the pan catching
    S.whoosh({ at, f: 300, f1: 2400, dur: 0.9, peakAt: 0.85, peak: 0.34 * pk, q: 0.8 });
    S.crackle({ at: at + 0.2, dens: 1.8, f: 2800, dur: 1.0, pts: [[0.5, 1], [1.0, 0.4]], peak: 0.16 * pk });
    S.thud({ at: at + 0.92, f: 62, f1: 30, dur: 0.8, drive: 2.8, peak: 0.6 * pk });
    S.whoosh({ at: at + 0.92, color: 'brown', f: 500, f1: 120, dur: 0.7, peakAt: 0.1, peak: 0.3 * pk });
    S.sizzle({ at: at + 0.95, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.18 * pk });
  };
  const svMince = (S, at, pk) => {                      // the Mince: the cleaver comes down twice, fast, and the board rings
    S.whoosh({ at, f: 400, f1: 2200, dur: 0.9, peakAt: 0.9, peak: 0.28 * pk, q: 1 });
    B.cleaver(S, at + 0.78, pk); B.cleaver(S, at + 1.0, pk * 1.1);
    S.thud({ at: at + 0.98, f: 70, f1: 30, dur: 0.7, drive: 2.6, peak: 0.55 * pk });
    svRing(S, at + 0.98, 700, 0.1 * pk, 1.0);
  };
  const svChoirHit = (S, at, pk, dur) => S.choir({ at, notes: [mf(38), mf(45), mf(50), mf(57), mf(62)], dur: dur || 4.2, vowel: 'a', vowel1: 'o', lp: 2400, peak: pk, pts: [[1.2, 1], [dur || 4.2, 0]] });

  def('bm-sovereign-intro', 'sting', S => {
    S.space('hall', 0.7);
    // the Ember wakes: a slow double heartbeat in a cold hall, the fire catching under it, one low bell
    [0, 0.7].forEach((at, i) => S.thud({ at, f: 52 - i * 4, f1: 26, dur: 0.9, drive: 3, peak: 0.5 + i * 0.1 }));
    svBody(S, 0.3, 2.2, 0.18, 1.2);
    S.bell({ at: 1.0, f: mf(38), dur: 3.4, peak: 0.2, lp: 2400 });
    S.choir({ at: 0.8, notes: [mf(38), mf(45)], vowel: 'u', dur: 2.6, a: 1.0, peak: 0.08 });
  });
  def('bm-sovereign-call', 'bm', S => {
    S.space('hall', 0.6);
    // the Sovereign says a name: one low breath of a voice over a drawn-in crackle, and a soft bell for the dead
    S.voice({ at: 0.1, f: 88, f1: 76, dur: 1.2, vowel: 'o', vowel1: 'u', breath: 3, lp: 1500, peak: 0.16, a: 0.3 });
    svHush(S, 0, 0.7, 0.08, 500, 1800);
    S.crackle({ at: 0.2, dens: 1.2, f: 2400, dur: 1.2, pts: [[0.3, 1], [1.2, 0]], peak: 0.1 });
    S.bell({ at: 0.55, f: mf(50), dur: 2.2, peak: 0.12, lp: 2400 });
  });
  def('bm-sovereign-kindling', 'bm', S => {
    S.space('hall', 0.6);
    // the raidwide that opens every act: the fire draws breath, catches, and rolls over the room
    S.whoosh({ f: 200, f1: 2200, dur: 1.0, peakAt: 0.9, peak: 0.34, q: 0.8 });
    S.noise({ color: 'brown', bp: 90, bp1: 700, q: 0.8, dur: 1.0, a: 0.8, pts: [[0.9, 1], [1.0, 0.7]], peak: 0.3 });
    S.thud({ at: 1.0, f: 60, f1: 26, dur: 1.4, drive: 3.4, peak: 0.9 });
    S.crack({ at: 1.0, peak: 0.28, dur: 0.2 });
    svBody(S, 1.0, 2.4, 0.3, 1.5);
    S.bell({ at: 1.02, f: mf(38), dur: 3.2, peak: 0.16, lp: 2400 });
  });
  def('bm-sovereign-brand', 'bm', S => {
    S.space('hall', 0.5);
    // the blade drawn red and laid on the tank: a hush, the ring of it struck, the iron's hiss, a glow that holds
    svHush(S, 0, 0.7, 0.1, 1200, 3600);
    svSwing(S, 0.5, 1200, 0.3, 0, 0.3);
    svRing(S, 0.8, 880, 0.22, 2.0);
    S.thud({ at: 0.8, f: 66, f1: 28, dur: 0.8, drive: 2.8, peak: 0.8 });
    S.crack({ at: 0.8, peak: 0.26, dur: 0.14 });
    S.sizzle({ at: 0.85, dur: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.26 });
    S.crackle({ at: 0.85, dens: 1.6, f: 2600, dur: 1.4, pts: [[0.2, 1], [1.4, 0]], peak: 0.18 });
    S.glass({ at: 0.95, f: mf(81), dur: 1.8, peak: 0.07, am: [3, 0.3] });
  });
  def('bm-sovereign-brand-sear', 'hud', S => {
    // the burn's tick on the tank, every few seconds for a long while: a short sear and a low pulse, nothing more
    S.sizzle({ dur: 0.45, pts: [[0.02, 1], [0.45, 0]], peak: 0.3 });
    S.thud({ f: 70, f1: 36, dur: 0.3, drive: 1.5, peak: 0.35 });
    S.crackle({ at: 0.02, dens: 1.4, f: 2600, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.2 });
  });
  def('bm-sovereign-ashen-sweep', 'bm', S => {
    S.space('hall', 0.5);
    // half the room swept by the blade: a long breath, a huge low sweep of ash and steel, the ring trailing after it
    svHush(S, 0, 0.8, 0.1, 600, 2400);
    S.whoosh({ at: 0.5, f: 180, f1: 1300, dur: 0.8, peakAt: 0.8, peak: 0.42, q: 0.9 });
    S.noise({ at: 0.7, color: 'pink', hp: 1400, lp: 7000, grain: 0.8, dur: 1.2, pts: [[0.25, 1], [1.2, 0]], peak: 0.18 });
    svRing(S, 1.18, 1180, 0.2, 2.0);
    S.thud({ at: 1.18, f: 54, f1: 24, dur: 1.2, drive: 3.4, peak: 0.85 });
    svBody(S, 1.2, 1.6, 0.2, 1.8);
  });
  def('bm-sovereign-cupped-ember', 'bm', S => {
    S.space('hall', 0.5);
    // an ember held in a cupped hand: a warm low hum that swells and brightens, the crackle drawing in, a soft weight at the end for the stack to catch
    S.tone({ type: 'saw', f: mf(38), f1: mf(40), lp: 500, am: [5, 0.4], dur: 1.8, a: 1.1, pts: [[1.6, 1], [1.8, 0]], peak: 0.22 });
    S.tone({ f: mf(62), f1: mf(65), dur: 1.8, a: 1.2, swell: true, peak: 0.05, vib: [5, 0.006] });
    S.crackle({ dens: 0.9, f: 2200, dur: 1.8, pts: [[1.3, 1], [1.8, 0.5]], peak: 0.14 });
    S.bell({ at: 1.5, f: mf(62), dur: 1.8, peak: 0.1, lp: 3000 });
    S.thud({ at: 1.7, f: 60, f1: 34, dur: 0.7, drive: 1.8, peak: 0.5 });
  });
  def('bm-sovereign-scatter', 'bm', S => {
    S.space('hall', 0.45);
    // the ember bursts into sparks flung to every hero: a rush outward and a dozen cracking pops, thrown wide
    S.whoosh({ f: 400, f1: 3200, dur: 0.7, peakAt: 0.7, peak: 0.3, q: 1 });
    for (let i = 0; i < 9; i++) {
      const at = 0.45 + i * 0.075, pan = Math.sin(i * 2.4) * 0.85;
      S.crack({ at, peak: 0.12 + (i % 3) * 0.03, dur: 0.1, pan });
      S.crackle({ at, dens: 2.4, f: 4200, dur: 0.3, pts: [[0.02, 1], [0.3, 0]], peak: 0.1, pan });
    }
    S.thud({ at: 0.45, f: 70, f1: 34, dur: 0.7, drive: 2.2, peak: 0.55 });
    svBody(S, 0.5, 1.1, 0.16, 2.2);
  });
  def('bm-sovereign-halo-turn', 'bm', S => {
    S.space('hall', 0.55);
    // the halo's beams sweep round like lighthouse lamps (a thin tone that leans and swells), then lock, and fire red
    S.tone({ f: 330, f1: 740, dur: 2.0, a: 1.4, am: [3.2, 0.5], lp: 2400, pts: [[1.7, 1], [2.0, 0]], peak: 0.14 });
    S.noise({ bp: 500, bp1: 3400, q: 3, dur: 2.0, a: 1.5, am: [3.2, 0.6], pts: [[1.8, 1], [2.0, 0]], peak: 0.2 });
    S.glass({ at: 1.0, f: mf(86), dur: 0.8, peak: 0.05 }); S.glass({ at: 1.5, f: mf(91), dur: 0.8, peak: 0.05 });
    svBody(S, 0, 2.2, 0.12, 1.1);
    S.whoosh({ at: 1.75, f: 800, f1: 5200, dur: 0.3, peakAt: 0.85, peak: 0.3, q: 2 });
    svRing(S, 2.05, 1480, 0.22, 2.4);
    S.thud({ at: 2.05, f: 56, f1: 26, dur: 1.2, drive: 3.2, peak: 0.85 });
    S.crack({ at: 2.05, peak: 0.3, dur: 0.18 });
    svBody(S, 2.05, 1.4, 0.2, 2.0);
  });
  def('bm-sovereign-halo-procession', 'bm', S => {
    S.space('hall', 0.55);
    // Act I's Halo Procession (a 2.4 s cast): the halo lights two arcs and they begin to turn, like two lamps drawn apart. Two thin tones a fifth apart lean away from each other and
    // swell, a turning shimmer under them, a glass note as each arc catches, and the halo's fire under it all, ending on a soft struck ring (the wedges' strikes are sound-hooks.js's)
    S.tone({ f: 330, f1: 392, dur: 2.4, a: 1.2, am: [2.4, 0.4], lp: 2200, pts: [[2.0, 1], [2.4, 0]], peak: 0.12, pan: -0.4 });
    S.tone({ f: 495, f1: 588, dur: 2.4, a: 1.2, am: [2.4, 0.4], lp: 2600, pts: [[2.0, 1], [2.4, 0]], peak: 0.1, pan: 0.4 });
    S.noise({ bp: 700, bp1: 2600, q: 3, dur: 2.4, a: 1.6, am: [2.4, 0.6], pts: [[2.1, 1], [2.4, 0]], peak: 0.14 });
    S.glass({ at: 0.7, f: mf(86), dur: 0.9, peak: 0.05, pan: -0.4 }); S.glass({ at: 1.2, f: mf(93), dur: 0.9, peak: 0.05, pan: 0.4 });
    svBody(S, 0, 2.6, 0.12, 1.1);
    svRing(S, 2.2, 1320, 0.16, 1.6);
    S.thud({ at: 2.2, f: 60, f1: 30, dur: 0.9, drive: 2.4, peak: 0.55 });
  });
  def('sv-proc-burst', 'bm', S => {
    S.space('hall', 0.45);
    // a hero's ring closing and bursting (1.6 s, the burst 1.0 s in): a rising rush as the embers are drawn in, a held breath, then a bright pop and a ring of sparks flung wide
    S.whoosh({ f: 500, f1: 2600, dur: 1.0, peakAt: 0.9, peak: 0.22, q: 1.4 });
    S.tone({ f: 440, f1: 880, dur: 1.0, a: 0.9, lp: 3000, pts: [[0.9, 1], [1.0, 0]], peak: 0.07 });
    S.crack({ at: 1.0, peak: 0.26, dur: 0.14 });
    S.thud({ at: 1.0, f: 72, f1: 34, dur: 0.8, drive: 2.2, peak: 0.6 });
    for (let i = 0; i < 6; i++) S.crackle({ at: 1.02 + i * 0.05, dens: 2.2, f: 4000, dur: 0.25, pts: [[0.02, 1], [0.25, 0]], peak: 0.08, pan: Math.sin(i * 2.1) * 0.8 });
    svRing(S, 1.02, 1640, 0.12, 1.4);
    svBody(S, 1.0, 0.8, 0.14, 2.0);
  });
  def('bm-sovereign-rebirth', 'bm', S => {
    S.space('hall', 0.8);
    // the room's whole fire spirals into one point: a swelling pull of air and flame, a deepening drone, then held (the choir hit is the set piece's)
    S.noise({ color: 'pink', bp: 200, bp1: 3800, q: 1.2, dur: 3.4, a: 2.8, pts: [[3.2, 1], [3.4, 0.8]], peak: 0.3 });
    S.tone({ type: 'saw', f: 40, f1: 110, dur: 3.6, a: 3.0, lp: 700, peak: 0.2, am: [4, 0.3] });
    S.crackle({ dens: 0.8, f: 2600, dur: 3.4, pts: [[3.0, 1], [3.4, 0.6]], peak: 0.2 });
    S.rumble({ dur: 3.6, f: 40, peak: 0.4, a: 2.4 });
    moVoid(S, 2.2, 1.2, 0.2, 700, 70);
    S.bell({ at: 3.3, f: mf(38), dur: 3.0, peak: 0.12, lp: 2200 });
  });
  // Act III's four casts are WIND-UPS of about three and a half seconds (the bar's lead: the blow lands that long after it begins). The cuts, fans and rings are played
  // by sound-hooks.js from the room's events at the true landing times (sv-dance-cut, sv-crescent-fan, sv-lance-dash, sv-pyre-cut, sv-cross-ring), so nothing here lands.
  def('bm-sovereign-sovereigns-dance', 'bm', S => {
    S.space('hall', 0.6);
    // the blade begins its dance (3.4 s on the bar before the first cut): a long breath, the blade drawn and held, a thin glass shimmer climbing, the fire gathering low
    svHush(S, 0, 2.8, 0.1, 700, 3200);
    S.scrape({ at: 0.2, f: 3200, q: 2.2, dur: 0.9, rate: 26, peak: 0.07, pts: [[0.5, 1], [0.9, 0]] });
    S.tone({ f: 330, f1: 990, dur: 3.2, a: 2.8, am: [3.4, 0.4], lp: 2600, pts: [[3.0, 1], [3.2, 0]], peak: 0.1 });
    [[0.9, 86], [1.7, 91], [2.5, 98]].forEach(([at, m], i) => S.glass({ at, f: mf(m), dur: 1.0, peak: 0.05, pan: (i - 1) * 0.5 }));
    svBody(S, 0.4, 2.9, 0.12, 1.1);
    S.thud({ at: 3.2, f: 56, f1: 30, dur: 0.5, drive: 1.6, peak: 0.3 });
  });
  def('bm-sovereign-crescent', 'bm', S => {
    S.space('hall', 0.55);
    // the wind-up of one huge arc (3.4 s before the first fan): a held breath drawn in, two long drawn-out sweeps of air leaning from opposite walls, a low gathering note
    svHush(S, 0.2, 2.8, 0.1, 500, 2600);
    S.whoosh({ at: 0.6, f: 160, f1: 900, dur: 2.2, peakAt: 0.85, peak: 0.2, q: 1.1, pan: -0.7 });
    S.whoosh({ at: 1.0, f: 180, f1: 1100, dur: 2.1, peakAt: 0.85, peak: 0.16, q: 1.1, pan: 0.7 });
    S.tone({ type: 'saw', f: mf(38), f1: mf(45), lp: 500, dur: 3.3, a: 2.7, pts: [[3.1, 1], [3.3, 0]], peak: 0.12, am: [4, 0.3] });
    svBody(S, 0.2, 3.0, 0.1, 1.0);
    S.glass({ at: 2.9, f: mf(90), dur: 0.5, peak: 0.04 });
  });
  def('bm-sovereign-lance', 'bm', S => {
    S.space('hall', 0.45);
    // the wind-up of a straight thrust (3.6 s before the dash): the blade drawn back (a scrape and a hush), one thin note stretched tighter and tighter, then a held silence
    svHush(S, 0, 3.0, 0.1, 1800, 4800);
    S.scrape({ at: 0.1, f: 3000, q: 2.2, dur: 0.8, rate: 24, peak: 0.07, pts: [[0.5, 1], [0.8, 0]] });
    S.tone({ f: 880, f1: 2640, dur: 3.2, a: 3.0, lp: 4200, pts: [[3.1, 1], [3.2, 0]], peak: 0.08, vib: [6, 0.004] });
    S.tone({ type: 'saw', f: mf(38), lp: 420, dur: 3.2, a: 2.6, pts: [[3.0, 1], [3.2, 0]], peak: 0.08 });
    svBody(S, 0.4, 2.8, 0.08, 0.9);
    S.crack({ at: 3.3, peak: 0.1, dur: 0.08 });
  });
  def('bm-sovereign-pyre', 'bm', S => {
    S.space('hall', 0.65);
    // the wind-up of the blink-cuts (3.4 s before the first, longer for a larger party): the ground splitting with heat, a roar of flame building, the crackle thickening, nothing yet struck
    S.crack({ at: 0.15, peak: 0.16, dur: 0.14 }); S.crack({ at: 0.9, peak: 0.18, dur: 0.14 }); S.crack({ at: 1.9, peak: 0.2, dur: 0.14 });
    S.noise({ color: 'brown', bp: 100, bp1: 900, q: 0.8, dur: 3.3, a: 2.8, pts: [[3.1, 1], [3.3, 0.8]], peak: 0.3 });
    S.whoosh({ at: 1.2, color: 'brown', f: 200, f1: 2200, dur: 2.0, peakAt: 0.9, peak: 0.28 });
    S.crackle({ at: 0.4, dens: 1.2, f: 3000, dur: 2.9, pts: [[2.6, 1], [2.9, 0.6]], peak: 0.2 });
    S.rumble({ dur: 3.3, f: 42, peak: 0.34, a: 2.6 });
  });
  def('bm-sovereign-emberfall', 'bm', S => {
    S.space('hall', 0.95);
    // the enrage: the whole sky of embers comes down. A vast swelling roar of fire and falling bells, the strike, then the long burn
    S.rumble({ dur: 8.4, f: 38, peak: 0.6, a: 5, pts: [[6.4, 1], [7.8, 0.8], [8.4, 0]] });
    S.noise({ color: 'brown', bp: 90, bp1: 1400, q: 0.8, dur: 7.2, a: 5.4, pts: [[6.4, 1], [7.2, 0.7]], peak: 0.4 });
    S.crackle({ dens: 1.0, f: 2800, dur: 7.2, pts: [[5.6, 1], [7.2, 0.7]], peak: 0.26 });
    S.choir({ at: 1.2, notes: [mf(38), mf(45), mf(50), mf(57)], dur: 5.4, vowel: 'a', vowel1: 'o', lp: 2000, peak: 0.14, pts: [[4, 1], [5.4, 0.8]] });
    [0.8, 2.4, 3.8, 4.8, 5.6].forEach((at, i) => { S.bell({ at, f: mf(33 + (i % 2) * 5), dur: 4.2, peak: 0.2 + i * 0.02, lp: 1800 }); S.thud({ at, f: 44, f1: 22, dur: 0.9, drive: 3, peak: 0.4 + i * 0.05 }); });
    for (let i = 0; i < 18; i++) S.crackle({ at: 2 + i * 0.28, dens: 3, f: 5200, dur: 0.2, pts: [[0.01, 1], [0.2, 0]], peak: 0.06 + i * 0.004, pan: Math.sin(i * 2.1) * 0.8 });
    S.whoosh({ at: 5.8, color: 'brown', f: 200, f1: 3800, dur: 1.5, peakAt: 0.95, peak: 0.44 });
    S.thud({ at: 7.4, f: 36, f1: 14, dur: 3.2, drive: 4.5, peak: 1 });
    S.crack({ at: 7.4, peak: 0.36, dur: 0.3 });
    svBody(S, 7.4, 3.2, 0.4, 1.6);
    svRing(S, 7.45, 660, 0.2, 3.4);
  });

  // ---- the twelve call stings: one per fallen boss, about a second and a half, in its colours, ember crackle laid over each
  const SV_CALL = {
    grubnak: S => {      // a cleaver's ring and the sizzle of the pan
      B.cleaver(S, 0, 1.1); svRing(S, 0.2, 640, 0.18, 1.2);
      S.metal({ at: 0.32, set: 'plate', f: 480, dur: 0.9, peak: 0.16, strike: 0.4 });
      S.sizzle({ at: 0.3, dur: 1.1, pts: [[0.1, 1], [1.1, 0]], peak: 0.2 });
    },
    skitterra: S => {    // silk drawn tight and the chitter of many legs, a snap
      B.silk(S, 0, 0.8, 1.2); S.skitter({ at: 0.35, n: 30, dur: 0.9, f: 2400, peak: 0.22 }); B.snap(S, 0.85, 1);
    },
    volkar: S => {       // a thunder crack and its rolling
      B.thunder(S, 0, 1.1, false); S.zap({ f: 70, dur: 0.4, peak: 0.12 });
    },
    hollowking: S => {   // a funeral bell, and a rattle of chain
      S.bell({ f: mf(38), dur: 2.4, peak: 0.42, lp: 3000 });
      S.choir({ notes: [mf(38), mf(45)], vowel: 'u', dur: 1.8, a: 0.6, peak: 0.1 });
      chains(S, 0.5, 0.6, 0.8);
    },
    wyrm: S => {         // two wing beats and a roar
      S.whoosh({ f: 120, f1: 420, dur: 0.4, peakAt: 0.6, peak: 0.3 }); S.whoosh({ at: 0.42, f: 120, f1: 380, dur: 0.4, peakAt: 0.6, peak: 0.3 });
      S.thud({ at: 0.38, f: 60, f1: 30, dur: 0.5, drive: 2, peak: 0.4 });
      S.voice({ at: 0.75, f: 58, f1: 42, dur: 1.2, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.34, lp: 3800, pts: [[0.2, 1], [1.2, 0]] });
      S.rumble({ at: 0.75, dur: 1.4, f: 80, peak: 0.35, a: 0.05 });
    },
    titan: S => {        // ice cracking, four times, down a long fault, and a bright fall of shards
      [0, 0.17, 0.42, 0.7].forEach((at, i) => { S.crack({ at, peak: 0.34 - i * 0.04, dur: 0.14 }); S.noise({ at: at + 0.02, bp: 4800, bp1: 1400, q: 2.2, dur: 0.5, grain: 0.8, pts: [[0.02, 1], [0.5, 0]], peak: 0.14, pan: (i - 1.5) * 0.4 }); });
      S.thud({ at: 0.42, f: 80, f1: 38, dur: 0.6, drive: 2, peak: 0.4 }); S.glass({ at: 0.8, f: 2200, dur: 0.8, peak: 0.08 });
    },
    archmage: S => {     // a rune chime climbing three notes, with the thin ring of each circle closing
      [64, 67, 71].forEach((m, i) => { S.bell({ at: i * 0.22, f: mf(m), dur: 1.6, peak: 0.16, lp: 5000 }); S.glass({ at: i * 0.22 + 0.01, f: mf(m + 24), dur: 0.9, peak: 0.05 }); });
      S.pad({ notes: [mf(45), mf(52)], dur: 1.6, det: 9, type: 'saw', lpEnv: [300, 1100, 400, 0.8], peak: 0.1 });
    },
    hydra: S => {        // a long hiss from many mouths, wet at the edges
      B.hiss(S, 0, 1.2, 1.2); B.hiss(S, 0.25, 1.0, 0.8);
      S.voice({ at: 0.3, f: 150, f1: 110, dur: 1.0, vowel: 'o', breath: 7, peak: 0.1, lp: 4000 });
      S.bubbles({ at: 0.3, n: 6, f: 300, f1: 900, spread: 0.9, size: 0.04, peak: 0.07 });
    },
    corvane: S => {      // a sword drawn from its scabbard and the ring of it at the end
      S.scrape({ f: 3400, q: 2.2, dur: 0.9, rate: 26, peak: 0.16, pts: [[0.5, 1], [0.9, 0]] });
      S.metal({ at: 0.95, set: 'bar', f: 1480, dur: 1.8, peak: 0.16, strike: 0.4 }); S.bell({ at: 0.97, f: mf(88), dur: 1.4, peak: 0.05, lp: 8000 });
    },
    brannoc: S => {      // a crowd's roar over the hum of the spinning wheel, a shield ringing
      brCrowd(S, 0, 1.4, 0.22); brWhirr(S, 0.3, 1.1, 1800, 3200, 0, 0.3); brClang(S, 1.3, 560, 0.2);
    },
    morrowoak: S => {    // old wood groaning, leaves, one deep settling thud
      moCreak(S, 0, 1.4, 0.24, 0, 20, 11); moLeaves(S, 0.2, 1.3, 0.12);
      S.thud({ at: 1.1, f: 56, f1: 26, dur: 0.8, drive: 3, peak: 0.5 });
    },
    caelum: S => {       // a glass chime and a scatter of starlight, one clean cut
      S.glass({ at: 0.1, f: mf(93), dur: 1.6, peak: 0.14 }); S.glass({ at: 0.16, f: mf(100), dur: 1.4, peak: 0.08 });
      caStars(S, 0, 6, 1.0, 0.04, 2600, 6200); caSlice(S, 0.7, 3200, 0.2);
    },
  };
  Object.keys(SV_CALL).forEach(who => def('sv-call-' + who, 'sting', S => {
    S.space('hall', 0.5);
    SV_CALL[who](S);
    svLay(S, 0, 1.7, 0.1);                                                  // the ember crackle every call shares
    S.thud({ f: 48, f1: 30, dur: 0.7, drive: 2, peak: 0.22 });
  }));
  def('sv-assemble', 'sting', S => {
    S.space('hall', 0.6);
    // cinders drawn together into a shape: air and ash pulled in, a swelling crackle, a low tone rising, and the settle
    S.noise({ color: 'pink', bp: 200, bp1: 2800, q: 1.2, dur: 2.2, a: 1.7, pts: [[2.0, 1], [2.2, 0.7]], peak: 0.26 });
    S.crackle({ dens: 0.7, f: 2400, dur: 2.2, pts: [[1.8, 1], [2.2, 0.6]], peak: 0.2 });
    S.tone({ type: 'saw', f: 60, f1: 150, dur: 2.2, a: 1.8, lp: 500, peak: 0.12 });
    S.thud({ at: 2.15, f: 56, f1: 30, dur: 0.8, drive: 2.4, peak: 0.5 });
    S.sizzle({ at: 2.15, dur: 0.6, pts: [[0.03, 1], [0.6, 0]], peak: 0.16 });
  });
  def('sv-crumble', 'hud', S => {
    S.space('hall', 0.5);
    // an echo crumbling to ash: a dry cascade of crackle and soft thuds fading, a last sigh
    S.crackle({ dens: 1.4, f: 2200, dur: 2.6, pts: [[0.2, 1], [2.6, 0]], peak: 0.3 });
    S.noise({ color: 'brown', bp: 260, bp1: 90, q: 0.8, dur: 2.4, a: 0.1, pts: [[0.2, 1], [2.4, 0]], peak: 0.3 });
    [0.1, 0.5, 0.95, 1.5].forEach((at, i) => S.thud({ at, f: 80 - i * 8, f1: 34, dur: 0.4, drive: 1.5, peak: 0.3 - i * 0.05 }));
    S.sizzle({ at: 0.2, dur: 2.0, pts: [[0.1, 1], [2.0, 0]], peak: 0.12 });
  });

  // ---- Act I: the echoes' moves
  def('bm-sovereign-cloche', 'bm', S => { S.space('room', 0.3); svCloche(S, 0, 1); });
  def('bm-sovereign-flambe', 'bm', S => { S.space('room', 0.3); svFlambe(S, 0, 1); });
  def('bm-sovereign-mince', 'bm', S => { S.space('room', 0.3); svMince(S, 0, 1); });
  def('bm-sovereign-flambe-service', 'bm', S => {   // the whole service in one: lid, flambé, Mince
    S.space('room', 0.35);
    svCloche(S, 0, 1); svFlambe(S, 0.7, 0.9); svMince(S, 2.2, 1);
  });
  def('bm-sovereign-burning-web', 'bm', S => {
    S.space('cave', 0.4);
    // three threads set alight across the room, one after another: silk drawn tight, the flame running along it, a spitting crackle
    for (let i = 0; i < 3; i++) {
      const at = i * 0.45, pan = (i - 1) * 0.6;
      B.silk(S, at, 0.9, 0.8, 1 + i * 0.12);
      S.whoosh({ at: at + 0.1, f: 300, f1: 2600, dur: 0.6, peakAt: 0.6, peak: 0.22, pan });
      S.sizzle({ at: at + 0.15, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.16, pan });
    }
    svBody(S, 0.3, 2.4, 0.16, 1.7);
    S.tone({ at: 1.2, f: 1100, f1: 2200, dur: 1.2, a: 0.9, swell: true, peak: 0.03, vib: [6, 0.01] });
  });
  def('bm-sovereign-knot', 'bm', S => {
    S.space('cave', 0.35);
    // a knot breaking: a hard snap, a spit of ember, a short sear; the fuse begins to run
    B.snap(S, 0, 1.2);
    S.crack({ at: 0.01, peak: 0.24, dur: 0.1 });
    S.crackle({ at: 0.02, dens: 2.6, f: 4200, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.16 });
    S.thud({ at: 0.02, f: 90, f1: 42, dur: 0.3, drive: 1.6, peak: 0.4 });
    S.sizzle({ at: 0.08, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.14 });
  });
  def('bm-sovereign-fuse', 'bm', S => {
    S.space('cave', 0.3);
    // the flame racing out along a thread from the break: a hiss that climbs, a stream of crackle, a thin tone that rises
    S.noise({ bp: 1800, bp1: 6500, q: 1.2, dur: 1.8, a: 0.1, grain: 0.9, pts: [[0.3, 1], [1.8, 0.5]], peak: 0.26 });
    S.crackle({ dens: 3, f: 4200, dur: 1.8, pts: [[0.1, 1], [1.8, 0.4]], peak: 0.2 });
    S.tone({ f: 1400, f1: 3600, dur: 1.8, a: 0.2, peak: 0.03 });
    S.whoosh({ f: 400, f1: 2800, dur: 1.0, peakAt: 0.7, peak: 0.16, q: 1.4 });
  });
  def('bm-sovereign-shadow', 'bm', S => {
    S.space('cave', 0.5);
    // her shadow dropping along every thread left whole: a dark pull, a thousand small legs running, then the strike (lands at 1 s)
    S.noise({ color: 'brown', bp: 1400, bp1: 80, q: 1.0, dur: 1.0, pts: [[0.9, 1], [1.0, 0.5]], peak: 0.3 });
    S.skitter({ n: 24, dur: 0.9, f: 2000, bias: 0.6, peak: 0.12 });
    S.thud({ at: 1.0, f: 54, f1: 26, dur: 1.0, drive: 3, peak: 0.8 });
    S.crack({ at: 1.0, peak: 0.26, dur: 0.16 });
    S.sizzle({ at: 1.02, dur: 1.2, pts: [[0.05, 1], [1.2, 0]], peak: 0.2 });
    svBody(S, 1.0, 1.4, 0.18, 1.6);
  });
  def('bm-sovereign-ember-and-ash', 'bm', S => {
    S.space('hall', 0.45);
    // a low magnetic hum between two poles, beating, with a thread of static and the embers drawn along it
    S.tone({ type: 'saw', f: 55, lp: 400, am: [11, 0.6], dur: 2.4, a: 0.8, pts: [[2.2, 1], [2.4, 0]], peak: 0.26 });
    S.tone({ f: 110, am: [11, 0.6], dur: 2.4, a: 0.8, pts: [[2.2, 1], [2.4, 0]], peak: 0.12 });
    S.zap({ f: 60, dur: 2.2, bf: 1500, peak: 0.07, a: 0.4 });
    svBody(S, 0.2, 2.2, 0.12, 1.0);
  });
  def('bm-sovereign-surge', 'bm', S => {
    S.space('hall', 0.5);
    // the Surge: the poles snap together: a rising rush, a bolt of static and the thump of it
    S.whoosh({ f: 200, f1: 3200, dur: 0.8, peakAt: 0.9, peak: 0.3, q: 1 });
    B.polarity(S, 0.7, true, 0.7);
    S.zap({ at: 0.75, f: 90, dur: 0.3, peak: 0.25 });
    S.crack({ at: 0.85, peak: 0.42, dur: 0.14 });
    S.thud({ at: 0.85, f: 64, f1: 28, dur: 0.9, drive: 2.8, peak: 0.8 });
    svBody(S, 0.85, 1.2, 0.18, 2.2);
  });
  def('bm-sovereign-hollow-kings-bell', 'bm', S => {
    S.space('hall', 0.7);
    // the Hollow King's funeral bell, answered: the same toll with an ember crackle laid over it
    S.bell({ f: mf(36), dur: 3.6, peak: 0.42, lp: 3000 });
    S.bell({ at: 0.02, f: mf(48), dur: 2.4, peak: 0.12, lp: 4000 });
    S.choir({ notes: [mf(36), mf(43)], vowel: 'u', dur: 3.0, a: 0.8, peak: 0.08 });
    svLay(S, 0.3, 2.4, 0.09);
    S.rumble({ dur: 2.2, f: 90, peak: 0.14, a: 0.05 });
  });
  def('bm-sovereign-royal-doom', 'bm', S => {
    S.space('hall', 0.65);
    // a doom set on one of you: three tolls falling in pitch, a low swell under them, the crack of the sentence
    [[0, 38], [0.95, 36], [1.9, 33]].forEach(([at, m], i) => { S.bell({ at, f: mf(m), dur: 3.0, peak: 0.34 - i * 0.02, lp: 2800 }); S.thud({ at, f: 50, f1: 26, dur: 0.8, drive: 2.6, peak: 0.45 }); });
    S.rumble({ dur: 3.4, f: 44, peak: 0.3, a: 1.8 });
    S.crack({ at: 2.9, peak: 0.28, dur: 0.18 });
    svBody(S, 2.9, 1.2, 0.18, 1.4);
  });
  def('bm-sovereign-lantern', 'bm', S => {
    S.space('room', 0.4);
    // the lantern carried: a rattle of chain, a warm glass note, and the small steady flicker of a flame in a case
    chains(S, 0, 0.6, 0.9);
    S.glass({ at: 0.15, f: mf(81), dur: 1.6, peak: 0.1, am: [4, 0.25] });
    S.crackle({ at: 0.1, dens: 0.8, f: 1800, dur: 1.6, pts: [[0.2, 1], [1.6, 0.3]], peak: 0.12 });
    S.noise({ at: 0.1, color: 'pink', bp: 700, q: 1.2, dur: 1.6, a: 0.2, am: [9, 0.5], pts: [[0.3, 1], [1.6, 0]], peak: 0.07 });
  });
  def('bm-sovereign-knights-sweep', 'bm', S => {
    S.space('hall', 0.6);
    // a knight replaying a sweep: a rewinding hush, the swing, and the ring of it again, fainter and lower, twice
    svHush(S, 0, 0.5, 0.07, 4000, 900);
    svSwing(S, 0.45, 1000, 0.32, 0, 0.4);
    svRing(S, 0.85, 1000, 0.2, 1.6);
    S.thud({ at: 0.85, f: 62, f1: 28, dur: 0.9, drive: 2.8, peak: 0.7 });
    svRing(S, 1.15, 940, 0.08, 1.2, -0.4); svRing(S, 1.45, 880, 0.04, 1.0, 0.4);
    svBody(S, 0.9, 1.4, 0.14, 1.6);
  });

  def('bm-sovereign-crier', 'bm', S => {
    S.space('hall', 0.65);
    // the Hollow King's herald crying the sentence again (the answer to his call): a handbell rung hard three times, an empty helm's voice calling over it, then the hall's low toll
    [0, 0.26, 0.52].forEach((at, i) => S.bell({ at, f: mf(84 - i), dur: 1.4, peak: 0.2 - i * 0.02, lp: 5000 }));
    S.voice({ at: 0.12, f: 124, f1: 98, dur: 1.5, vowel: 'a', vowel1: 'o', breath: 2, lp: 1800, peak: 0.12, a: 0.12 });
    S.bell({ at: 0.9, f: mf(36), dur: 3.0, peak: 0.3, lp: 2800 });
    S.thud({ at: 0.9, f: 52, f1: 28, dur: 0.8, drive: 2.4, peak: 0.45 });
    svLay(S, 1.0, 1.8, 0.07);
  });

  // ---- the set pieces
  def('sv-descent', 'sting', S => {
    S.space('hall', 0.8);
    // the halo lighting: twelve soft rising tones, one for every half second (D minor, climbing), under a swelling drone and a gathering fire,
    // then a low weight as the Sovereign is whole
    const scale = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19];
    scale.forEach((n, i) => {
      S.bell({ at: i * 0.5, f: mf(62 + n), dur: 2.2, peak: 0.07 + i * 0.006, lp: 5000, pan: Math.sin(i * 2.4) * 0.5 });
      S.glass({ at: i * 0.5 + 0.01, f: mf(86 + n), dur: 1.0, peak: 0.025 });
    });
    S.pad({ notes: [mf(38), mf(45), mf(50)], dur: 6.4, det: 8, type: 'saw', lpEnv: [140, 900, 240, 3.8], peak: 0.12 });
    S.rumble({ dur: 6.4, f: 40, peak: 0.3, a: 3.8 });
    S.crackle({ dens: 0.8, f: 2400, dur: 6.2, pts: [[5.0, 1], [6.2, 0.6]], peak: 0.12 });
    S.thud({ at: 6.0, f: 48, f1: 24, dur: 1.4, drive: 3, peak: 0.7 });
    S.bell({ at: 6.0, f: mf(38), dur: 3.0, peak: 0.16, lp: 2200 });
  });
  def('sv-burnback', 'bm', S => {
    S.space('hall', 0.7);
    // the burnback: the four braziers pulled out inward one after another, the floor cracking all round, and four struck bells one by one
    [[-0.9, 0], [0.9, 0.45], [-0.6, 0.9], [0.6, 1.35]].forEach(([pan, at]) => {
      moVoid(S, at, 0.7, 0.22, 400, 60);
      S.crackle({ at, dens: 2, f: 3200, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.14, pan });
      S.thud({ at: at + 0.68, f: 60, f1: 30, dur: 0.5, drive: 2, peak: 0.35, pan });
    });
    for (let i = 0; i < 10; i++) {
      const at = 2.2 + i * 0.2 + (i % 3) * 0.04;
      S.crack({ at, peak: 0.16 + (i % 3) * 0.04, dur: 0.12, pan: Math.sin(i * 1.9) * 0.8 });
    }
    S.noise({ at: 2.2, color: 'brown', bp: 400, bp1: 90, q: 0.9, dur: 2.2, a: 0.2, grain: 0.9, pts: [[0.4, 1], [2.2, 0]], peak: 0.26 });
    [0, 0.5, 1.1, 1.7].forEach((at, i) => S.thud({ at: 2.3 + at, f: 52 - i * 3, f1: 24, dur: 0.9, drive: 3, peak: 0.5 }));
    [[4.4, 50], [5.4, 45], [6.4, 41], [7.4, 38]].forEach(([at, m], i) => {
      S.bell({ at, f: mf(m), dur: 3.6, peak: 0.28 + i * 0.03, lp: 2600 });
      S.thud({ at, f: 48 - i * 3, f1: 24, dur: 0.9, drive: 3, peak: 0.45 + i * 0.05 });
      S.glass({ at: at + 0.01, f: mf(m + 36), dur: 1.4, peak: 0.04 });
    });
    S.rumble({ at: 4.4, dur: 4.2, f: 38, peak: 0.25, a: 2.4 });
  });
  def('sv-rebirth-choir', 'bm', S => {
    S.space('hall', 0.85);
    // the choir hit of Rebirth: the held breath breaks, a full chord from the dark, a drum of a heart, the new fire catching
    S.thud({ f: 40, f1: 18, dur: 2.6, drive: 4, peak: 1 });
    S.crack({ peak: 0.32, dur: 0.22 });
    svChoirHit(S, 0.02, 0.22, 4.4);
    S.choir({ at: 0.04, notes: [mf(62), mf(69)], dur: 3.4, vowel: 'i', vowel1: 'a', lp: 3400, peak: 0.07 });
    S.bell({ at: 0.05, f: mf(38), dur: 5.0, peak: 0.26, lp: 1800 });
    svBody(S, 0.05, 3.2, 0.3, 1.6);
    S.whoosh({ f: 1200, f1: 120, dur: 0.9, peakAt: 0.1, peak: 0.3, color: 'brown' });
  });
  // ---- Act I, the rest: the Hollow King's lantern in flight, and the Ember and Ash drift (a quiet magnetic hum while the charges pull)
  def('sv-lantern-fly', 'hud', S => {
    S.space('hall', 0.4);
    // the lantern's flame leaving the Hollow King's sigil and crossing the room: a thin rising rush, a flicker, a small glass note carried with it
    S.whoosh({ f: 500, f1: 2200, dur: 1.1, peakAt: 0.85, peak: 0.2, q: 1.6 });
    S.crackle({ dens: 1.4, f: 3000, dur: 1.1, pts: [[0.2, 1], [1.1, 0.4]], peak: 0.12 });
    S.glass({ at: 0.05, f: mf(86), dur: 1.1, peak: 0.05, am: [5, 0.3] });
  });
  loop('sv-drift-loop', 'loop', L => {
    // two poles of a charge, humming just apart (they beat slowly), a thread of static over them
    const body = L.g(0.16);
    [55, 55.7].forEach(f => L.c(L.osc('sawtooth', f), body));
    const lp = L.f('lowpass', 300, 1.5); L.lfo(lp.frequency, 0.4, 90); L.c(body, lp, L.out);
    const hi = L.g(0.03); L.c(L.osc('sine', 110), hi); L.lfo(hi.gain, 1.7, 0.02); L.c(hi, L.out);
    L.c(L.crackle(0.8), L.f('highpass', 4500), L.g(0.05), L.out);
  }, 0.8);

  // ---- Act II: Glass Floor (Hrimgar: ice, glass and a heavy foot)
  def('bm-sovereign-glass-floor', 'bm', S => {
    S.space('hall', 0.6);
    // Hrimgar's stamp, ember-lit: the foot lifted, one huge blow, and the floor answers: a crack that opens under the heel and RUNS outward, split after split,
    // brighter and farther each time, the ember crackle in every seam
    S.whoosh({ f: 100, f1: 520, dur: 0.6, peakAt: 0.9, peak: 0.3, q: 0.9 });
    S.thud({ at: 0.6, f: 46, f1: 20, dur: 1.6, drive: 4, peak: 1 });
    S.crack({ at: 0.6, peak: 0.4, dur: 0.22 });
    S.metal({ at: 0.62, set: 'bar', f: 520, dur: 2.4, peak: 0.16, strike: 0.5 });
    for (let i = 0; i < 7; i++) {
      const at = 0.72 + i * 0.22 + (i % 2) * 0.03, pan = Math.sin(i * 2.3) * 0.8;
      S.crack({ at, peak: 0.3 - i * 0.025, dur: 0.14, pan });
      S.noise({ at: at + 0.01, bp: 5200 - i * 300, bp1: 1400, q: 2.2, dur: 0.5, grain: 0.8, pts: [[0.02, 1], [0.5, 0]], peak: 0.13, pan });
      S.glass({ at: at + 0.02, f: 1800 + i * 260, dur: 0.9, peak: 0.05, pan });
    }
    S.crackle({ at: 0.7, dens: 4, f: 4600, dur: 2.0, pts: [[0.05, 1], [0.8, 0.8], [2.0, 0]], peak: 0.2 });
    S.rumble({ at: 0.6, dur: 2.6, f: 50, peak: 0.4, a: 0.05 });
    svLay(S, 0.8, 2.2, 0.12);
    S.sizzle({ at: 1.4, dur: 1.6, pts: [[0.2, 1], [1.6, 0]], peak: 0.1 });
  });
  def('sv-glass-shatter', 'bm', S => {
    S.space('hall', 0.45);
    // one sheet of the floor giving way as the crack reaches it: a pane going all at once, a bright spill of shards, and the black water coming up under it
    S.crack({ peak: 0.4, dur: 0.16 });
    S.noise({ bp: 6200, bp1: 1800, q: 1.8, dur: 0.7, grain: 0.9, pts: [[0.015, 1], [0.7, 0]], peak: 0.26 });
    for (let i = 0; i < 5; i++) S.glass({ at: 0.02 + i * 0.045 + S.rr(0, 0.03), f: S.rr(2200, 5200), dur: S.rr(0.5, 0.9), peak: 0.07 });
    S.crackle({ at: 0.03, dens: 3.2, f: 5200, dur: 0.6, pts: [[0.02, 1], [0.6, 0]], peak: 0.16 });
    S.thud({ at: 0.02, f: 110, f1: 46, dur: 0.4, drive: 2, peak: 0.5 });
    S.noise({ at: 0.15, color: 'brown', bp: 300, bp1: 90, q: 0.8, dur: 0.7, a: 0.05, pts: [[0.1, 1], [0.7, 0]], peak: 0.18 });
  });
  def('sv-water-hiss', 'hud', S => {
    S.space('hall', 0.35);
    // black water standing where the sheet was: a long hiss of steam off cold, hot iron, and a few slow bubbles
    S.sizzle({ dur: 1.4, pts: [[0.05, 1], [1.4, 0]], peak: 0.28 });
    S.noise({ bp: 3600, bp1: 1400, q: 0.9, dur: 1.4, a: 0.1, grain: 0.9, pts: [[0.2, 1], [1.4, 0]], peak: 0.22 });
    S.bubbles({ at: 0.15, n: 6, f: 200, f1: 520, spread: 0.9, size: 0.05, peak: 0.08 });
  });

  // ---- Act II: Heads of Flame (the Hydra: many mouths, hiss and throat; a head of fire)
  def('bm-sovereign-heads-of-flame', 'bm', S => {
    S.space('cave', 0.5);
    // the Hydra's answer: many mouths drawing breath at once, a wet hiss with a bubbling growl in it, the fire catching in the throats
    B.hiss(S, 0, 1.4, 1.2); B.hiss(S, 0.2, 1.2, 0.8);
    S.voice({ at: 0.25, f: 150, f1: 96, dur: 1.4, vowel: 'o', vowel1: 'a', breath: 7, peak: 0.16, lp: 3600, pts: [[0.3, 1], [1.4, 0]] });
    S.bubbles({ at: 0.1, n: 7, f: 700, f1: 160, spread: 0.8, size: 0.05, peak: 0.1 });
    S.noise({ bp: 400, bp1: 2200, q: 1.2, dur: 1.5, a: 1.0, pts: [[1.3, 1], [1.5, 0.4]], peak: 0.22 });
    svLay(S, 0.3, 1.4, 0.1);
    S.thud({ at: 1.3, f: 80, f1: 38, dur: 0.5, drive: 2, peak: 0.45 });
  });
  def('sv-head-rise', 'bm', S => {
    S.space('cave', 0.55);
    // a head of fire rising out of its sigil in the floor: the stone splits under the heat, a roar of flame climbs and climbs, and the head clears the floor at 1.6 s
    // with a throaty cry and a gout
    S.crack({ at: 0.05, peak: 0.2, dur: 0.14 }); S.crack({ at: 0.35, peak: 0.24, dur: 0.14 });
    S.noise({ color: 'brown', bp: 90, bp1: 1100, q: 0.8, dur: 1.7, a: 1.4, pts: [[1.55, 1], [1.7, 0.8]], peak: 0.34 });
    S.whoosh({ at: 0.6, color: 'brown', f: 180, f1: 2200, dur: 1.0, peakAt: 0.95, peak: 0.34 });
    S.crackle({ dens: 1.4, f: 2800, dur: 3.0, pts: [[1.6, 1], [3.0, 0]], peak: 0.2 });
    S.voice({ at: 1.5, f: 170, f1: 104, dur: 1.5, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.2, lp: 3200, pts: [[0.15, 1], [1.5, 0]] });
    S.thud({ at: 1.6, f: 58, f1: 26, dur: 1.2, drive: 3, peak: 0.8 });
    S.rumble({ at: 1.5, dur: 1.8, f: 60, peak: 0.3, a: 0.2 });
    svBody(S, 1.6, 2.0, 0.2, 1.6);
  });
  def('sv-bite', 'bm', S => {
    S.space('cave', 0.4);
    // a head lunging at one hero: the breath drawn in over the long lock (a thin hiss climbing, flame gathering in the throat), then the jaws clap shut on a gout
    // (lands at 1.97 s)
    S.noise({ bp: 700, bp1: 3400, q: 3, dur: 1.9, a: 1.6, pts: [[1.8, 1], [1.9, 0]], peak: 0.12 });
    S.tone({ type: 'saw', f: 90, f1: 200, lp: 500, dur: 1.9, a: 1.5, peak: 0.1, am: [7, 0.4] });
    S.crackle({ at: 0.6, dens: 1.2, f: 2600, dur: 1.4, pts: [[1.2, 1], [1.4, 0.8]], peak: 0.12 });
    S.wood({ at: 1.96, f: 520, dur: 0.12, peak: 0.4 });
    S.crack({ at: 1.96, peak: 0.34, dur: 0.12 });
    S.thud({ at: 1.97, f: 70, f1: 32, dur: 0.6, drive: 2.4, peak: 0.6 });
    S.whoosh({ at: 1.97, color: 'brown', f: 500, f1: 150, dur: 0.6, peakAt: 0.1, peak: 0.3 });
    svBody(S, 1.98, 1.0, 0.16, 1.8);
  });
  def('sv-cut', 'bm', S => {
    S.space('cave', 0.5);
    // a head cut down: the blow, a cry that climbs and is cut off mid-breath, the fire dropping out of the neck in a gush, and the stump left burning low
    S.whoosh({ f: 400, f1: 2600, dur: 0.25, peakAt: 0.8, peak: 0.26, q: 1.4 });
    S.crack({ at: 0.24, peak: 0.34, dur: 0.14 });
    S.thud({ at: 0.24, f: 90, f1: 38, dur: 0.6, drive: 2.4, peak: 0.7 });
    S.voice({ at: 0.1, f: 200, f1: 360, dur: 0.5, vowel: 'a', vowel1: 'i', breath: 6, peak: 0.2, lp: 3600, pts: [[0.1, 1], [0.34, 1], [0.5, 0]] });
    S.noise({ at: 0.3, color: 'brown', bp: 500, bp1: 120, q: 0.8, dur: 1.0, a: 0.05, pts: [[0.1, 1], [1.0, 0]], peak: 0.3 });
    S.sizzle({ at: 0.3, dur: 1.2, pts: [[0.05, 1], [1.2, 0]], peak: 0.2 });
    S.crackle({ at: 0.5, dens: 1.0, f: 2200, dur: 2.2, pts: [[0.3, 1], [2.2, 0.15]], peak: 0.16 });
    S.bell({ at: 0.28, f: mf(40), dur: 1.8, peak: 0.1, lp: 2000 });
  });

  // ---- Act II: Cinder Dive (Vhalgrath: wings, a roar, the ground taking him)
  def('bm-sovereign-cinder-dive', 'bm', S => {
    S.space('cave', 0.5);
    // Vhalgrath's call: two heavy wing beats and a roar that climbs, the tyrant leaving his peak; a hot low hum under it that stays, ember crackle in every breath
    S.whoosh({ f: 120, f1: 460, dur: 0.45, peakAt: 0.6, peak: 0.3 });
    S.whoosh({ at: 0.5, f: 120, f1: 400, dur: 0.45, peakAt: 0.6, peak: 0.32 });
    S.thud({ at: 0.42, f: 56, f1: 28, dur: 0.5, drive: 2, peak: 0.45 });
    S.thud({ at: 0.92, f: 52, f1: 26, dur: 0.5, drive: 2, peak: 0.5 });
    S.voice({ at: 0.9, f: 66, f1: 130, dur: 1.4, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.3, lp: 3800, pts: [[0.3, 1], [1.4, 0]] });
    S.rumble({ at: 0.9, dur: 1.6, f: 80, peak: 0.3, a: 0.1 });
    S.tone({ type: 'saw', f: 60, f1: 120, lp: 400, dur: 1.6, a: 1.0, peak: 0.1, am: [6, 0.4] });
    svLay(S, 0.2, 1.8, 0.12);
  });
  def('sv-dive-line', 'bm', S => {
    S.space('cave', 0.4);
    // the line of his dive lit from the rim to the spot: a long low roar of flame that runs the length of the floor, a spitting crackle along it, a hot tone rising
    S.whoosh({ color: 'brown', f: 160, f1: 1800, dur: 1.2, peakAt: 0.7, peak: 0.34, q: 0.7 });
    S.noise({ color: 'brown', bp: 100, bp1: 900, q: 0.8, dur: 1.6, a: 0.3, pts: [[0.8, 1], [1.6, 0]], peak: 0.28 });
    S.crackle({ dens: 3, f: 3400, dur: 1.6, pts: [[0.2, 1], [1.6, 0]], peak: 0.22 });
    S.tone({ type: 'saw', f: 110, f1: 330, lp: 700, dur: 1.4, a: 1.0, peak: 0.08 });
    S.sizzle({ at: 0.1, dur: 1.4, pts: [[0.1, 1], [1.4, 0]], peak: 0.14 });
  });
  def('sv-dive-fall', 'bm', S => {
    S.space('cave', 0.55);
    // Vhalgrath coming down the line: a shriek of air falling in pitch, the roar close behind it, and the ground taking him at 1.4 s: a huge low blow, a wall of crackle
    // and a gush of steam off the glass
    S.whoosh({ f: 2400, f1: 110, dur: 1.4, peakAt: 0.9, peak: 0.4, q: 1.1 });
    S.voice({ at: 0.3, f: 140, f1: 52, dur: 1.2, vowel: 'a', vowel1: 'o', breath: 6, peak: 0.26, lp: 3600, pts: [[0.4, 1], [1.2, 0.7]] });
    S.noise({ color: 'brown', bp: 100, bp1: 700, q: 0.8, dur: 1.4, a: 1.1, pts: [[1.3, 1], [1.4, 0.8]], peak: 0.26 });
    S.thud({ at: 1.4, f: 44, f1: 18, dur: 2.2, drive: 4.2, peak: 1 });
    S.crack({ at: 1.4, peak: 0.36, dur: 0.24 });
    S.rumble({ at: 1.4, dur: 2.4, f: 56, peak: 0.45, a: 0.02 });
    svBody(S, 1.42, 2.6, 0.32, 1.6);
    S.noise({ at: 1.5, hp: 2800, dur: 1.4, a: 0.05, pts: [[0.1, 1], [1.4, 0]], peak: 0.14 });
    svRing(S, 1.42, 700, 0.12, 2.4);
  });
  def('bm-sovereign-aftershock', 'bm', S => {
    S.space('hall', 0.7);
    // the landing's ring: the ground gathers itself (a low swell and three small tremors drawing in), then the ring goes out from the middle across the whole
    // floor (a sweep from low to high, lands at 2.8 s) and a long boom runs behind it; the quiet middle is the one place it never reaches
    S.rumble({ dur: 2.9, f: 46, peak: 0.34, a: 2.2 });
    [0.2, 0.9, 1.7].forEach((at, i) => S.thud({ at, f: 70 - i * 6, f1: 32, dur: 0.5, drive: 1.8, peak: 0.28 + i * 0.1 }));
    S.noise({ color: 'brown', bp: 80, bp1: 1200, q: 0.9, dur: 2.8, a: 2.4, pts: [[2.6, 1], [2.8, 0.8]], peak: 0.26 });
    S.crackle({ at: 0.6, dens: 1.2, f: 2800, dur: 2.2, pts: [[1.8, 1], [2.2, 0.6]], peak: 0.14 });
    S.whoosh({ at: 2.1, color: 'brown', f: 120, f1: 2800, dur: 0.7, peakAt: 0.9, peak: 0.36, q: 0.8 });
    S.thud({ at: 2.8, f: 40, f1: 16, dur: 2.4, drive: 4.2, peak: 1 });
    S.crack({ at: 2.8, peak: 0.3, dur: 0.22 });
    svBody(S, 2.82, 2.2, 0.28, 1.8);
    svRing(S, 2.82, 560, 0.14, 2.6);
  });
  def('sv-boil', 'bm', S => {
    S.space('cave', 0.4);
    // the water in the sunk sheets where the line crossed it, coming to the boil: bubbles that quicken, a steady hiss swelling, the last of it about to break (lasts 3.6 s)
    S.bubbles({ n: 26, f: 160, f1: 700, spread: 3.4, size: 0.06, bias: 0.5, peak: 0.1 });
    S.noise({ bp: 3200, bp1: 1800, q: 0.9, dur: 3.6, a: 3.0, grain: 0.9, pts: [[3.3, 1], [3.6, 0.7]], peak: 0.22 });
    S.sizzle({ at: 0.4, dur: 3.2, pts: [[2.8, 1], [3.2, 0.6]], peak: 0.16 });
    S.rumble({ dur: 3.6, f: 70, peak: 0.16, a: 3.0 });
  });
  def('sv-steam-burst', 'bm', S => {
    S.space('hall', 0.45);
    // steam breaking up through the glass in a column: a hard hiss like a vent opening, a hollow thump, the boiling water thrown out in pops
    S.whoosh({ f: 800, f1: 5200, dur: 0.35, peakAt: 0.4, peak: 0.34, q: 0.8 });
    S.noise({ hp: 2400, dur: 1.2, a: 0.04, grain: 0.7, pts: [[0.05, 1], [1.2, 0]], peak: 0.3 });
    S.thud({ at: 0.04, f: 80, f1: 34, dur: 0.6, drive: 2.4, peak: 0.7 });
    S.crack({ at: 0.04, peak: 0.2, dur: 0.1 });
    S.bubbles({ at: 0.1, n: 8, f: 500, f1: 150, spread: 0.7, size: 0.05, peak: 0.1 });
    S.crackle({ at: 0.1, dens: 1.6, f: 3000, dur: 0.8, pts: [[0.02, 1], [0.8, 0]], peak: 0.12 });
  });

  // ---- Act II: Twin Brands (Azerath's circles: two brands burn on, and one of four walls lights in its element; fire and the void to flee, frost and lightning to meet)
  def('bm-sovereign-twin-brands', 'bm', S => {
    S.space('hall', 0.6);
    // Azerath's cast (1.6 s): two circles drawn in the air (a rising arcane hum and a thin gathering hiss), then a brand searing on each bearer, one a note above the other
    S.tone({ type: 'saw', f: 70, f1: 150, lp: 600, dur: 1.6, a: 1.2, peak: 0.1, am: [6, 0.3] });
    S.noise({ bp: 600, bp1: 3600, q: 2.2, dur: 1.5, a: 1.2, pts: [[1.3, 1], [1.5, 0]], peak: 0.14 });
    S.glass({ at: 0.1, f: mf(86), dur: 1.2, peak: 0.04, am: [5, 0.3] });
    [[0.75, -0.6, 1000], [1.1, 0.6, 1190]].forEach(([at, pan, f]) => {
      S.sizzle({ at, dur: 0.8, pts: [[0.03, 1], [0.8, 0]], peak: 0.2, pan });
      S.thud({ at, f: 78, f1: 38, dur: 0.5, drive: 2, peak: 0.45, pan });
      svRing(S, at, f, 0.12, 1.4, pan);
    });
    svLay(S, 0.6, 1.6, 0.1);
  });
  def('sv-twin-fire', 'bm', S => {
    S.space('hall', 0.5);
    // the fire wall lighting (north): a roar of flame that climbs up the wall, the crackle spitting along it, a low blow as it takes and burns on
    S.whoosh({ color: 'brown', f: 120, f1: 1800, dur: 1.0, peakAt: 0.7, peak: 0.34, q: 0.7 });
    S.noise({ color: 'brown', bp: 90, bp1: 700, q: 0.8, dur: 2.4, a: 0.8, pts: [[1.0, 1], [2.4, 0.5]], peak: 0.3 });
    S.crackle({ dens: 3, f: 3200, dur: 2.4, pts: [[0.3, 1], [2.4, 0.3]], peak: 0.2 });
    S.thud({ at: 0.75, f: 58, f1: 28, dur: 1.0, drive: 3, peak: 0.6 });
    S.sizzle({ at: 0.2, dur: 2.0, pts: [[0.3, 1], [2.0, 0]], peak: 0.12 });
  });
  def('sv-twin-frost', 'bm', S => {
    S.space('hall', 0.6);
    // the frost wall lighting (east): ice forming along it, a run of high glass chimes (a cold open chord), a breath of cold air
    S.crack({ peak: 0.14, dur: 0.12 });
    [[0, 0], [0.12, 7], [0.26, 12], [0.42, 19]].forEach(([at, n], i) => S.glass({ at, f: mf(86 + n), dur: 2.0, peak: 0.1, pan: -0.5 + i * 0.33 }));
    S.bell({ at: 0.02, f: mf(74), dur: 2.6, peak: 0.12, lp: 6000 });
    S.noise({ hp: 4000, dur: 1.6, a: 0.2, pts: [[0.3, 1], [1.6, 0]], peak: 0.07 });
    S.tone({ f: mf(62), dur: 2.2, a: 0.6, peak: 0.04, am: [4, 0.3], lp: 3000 });
  });
  def('sv-twin-bolt', 'bm', S => {
    S.space('hall', 0.5);
    // the lightning wall lighting (south): a run of cracks along it, the static spitting, a low rumble of thunder under the last
    for (let i = 0; i < 4; i++) { const pan = -0.5 + i * 0.33; S.zap({ at: i * 0.1, f: 100, dur: 0.16, peak: 0.28, pan }); S.crack({ at: i * 0.1, peak: 0.2, dur: 0.13, pan }); }
    S.zap({ at: 0.2, f: 60, dur: 1.2, bf: 1100, a: 0.02, peak: 0.2, pts: [[0.05, 1], [0.6, 0.6], [1.2, 0]] });
    S.crackle({ at: 0.1, dens: 4, f: 4600, dur: 2.0, pts: [[0.1, 1], [2.0, 0.2]], peak: 0.2 });
    S.rumble({ at: 0.35, dur: 1.8, f: 160, peak: 0.28, a: 0.05, grain: 0.5 });
  });
  def('sv-twin-void', 'bm', S => {
    S.space('hall', 0.7);
    // the void wall lighting (west): no flame and no glass, only a hum that the room leans into, two low notes beating, a dark swell and a hollow knock
    moVoid(S, 0, 1.6, 0.22, 400, 50);
    S.tone({ type: 'saw', f: 55, dur: 2.6, a: 1.0, lp: 300, peak: 0.12, am: [0.7, 0.3] });
    S.tone({ type: 'saw', f: 55.9, dur: 2.6, a: 1.0, lp: 300, peak: 0.1 });
    S.rumble({ dur: 2.6, f: 38, peak: 0.3, a: 1.0 });
    S.thud({ at: 1.0, f: 46, f1: 24, dur: 1.2, drive: 3, peak: 0.55 });
  });
  def('sv-twin-shift', 'bm', S => {
    S.space('hall', 0.45);
    // the lit wall changing, once: the glow drawn off one wall (a falling slide) and thrown across to another (a quick rising one), a click as it settles
    S.whoosh({ f: 1800, f1: 160, dur: 0.5, peakAt: 0.3, peak: 0.26, q: 1.2 });
    S.whoosh({ at: 0.35, f: 160, f1: 2200, dur: 0.5, peakAt: 0.85, peak: 0.28, q: 1.2 });
    S.glass({ at: 0.3, f: mf(88), dur: 0.9, peak: 0.07 });
    S.crack({ at: 0.85, peak: 0.2, dur: 0.1 });
    S.thud({ at: 0.86, f: 90, f1: 44, dur: 0.4, drive: 1.8, peak: 0.35 });
  });
  def('sv-twin-meet', 'bm', S => {
    S.space('hall', 0.55);
    // the brands answering at the wall circle (lands at 0.55 s): two tones drawn together from far apart, then one joined ring and a soft weight
    S.tone({ f: 220, f1: 330, dur: 0.55, a: 0.4, peak: 0.12, lp: 2000, pan: -0.5 });
    S.tone({ f: 495, f1: 330, dur: 0.55, a: 0.4, peak: 0.12, lp: 2000, pan: 0.5 });
    S.bell({ at: 0.55, f: mf(62), dur: 2.6, peak: 0.22, lp: 4200 });
    S.bell({ at: 0.55, f: mf(69), dur: 2.2, peak: 0.12, lp: 4200 });
    S.glass({ at: 0.56, f: mf(98), dur: 1.4, peak: 0.05 });
    S.thud({ at: 0.55, f: 60, f1: 30, dur: 0.8, drive: 2.4, peak: 0.55 });
    svBody(S, 0.55, 1.0, 0.1, 1.2);
  });
  def('sv-twin-bloom', 'bm', S => {
    S.space('hall', 0.65);
    // the bloom at the lit wall and the circles on the two bearers (lands at 0.6 s): a breath drawn in and the fire (or the dark) going out from the wall all at once
    S.noise({ bp: 400, bp1: 2600, q: 1.4, dur: 0.6, a: 0.5, pts: [[0.55, 1], [0.6, 0.6]], peak: 0.2 });
    S.thud({ at: 0.6, f: 48, f1: 20, dur: 1.8, drive: 4, peak: 1 });
    S.crack({ at: 0.6, peak: 0.34, dur: 0.2 });
    S.whoosh({ at: 0.6, color: 'brown', f: 200, f1: 3200, dur: 0.8, peakAt: 0.2, peak: 0.36, q: 0.8 });
    S.rumble({ at: 0.6, dur: 2.0, f: 52, peak: 0.4, a: 0.02 });
    svBody(S, 0.62, 2.0, 0.26, 1.6);
    svRing(S, 0.62, 600, 0.1, 2.0);
  });

  // ---- Act II: The Anvil Count (the Sovereign's own move: a pip count rung on an anvil, then one tower after another struck in turn)
  def('bm-sovereign-the-anvil-count', 'bm', S => {
    S.space('hall', 0.6);
    // the cast (3.6 s): a forge hum swelling under it and four rings struck on an anvil, each a step higher, one for every place in the count
    S.tone({ type: 'saw', f: 58, f1: 92, lp: 520, dur: 3.2, a: 1.4, peak: 0.1, am: [4, 0.3] });
    S.noise({ bp: 500, bp1: 2400, q: 2, dur: 3.0, a: 1.4, pts: [[2.6, 1], [3.0, 0]], peak: 0.09 });
    [0, 3, 7, 12].forEach((n, i) => {
      const at = 0.3 + i * 0.8, pan = -0.45 + i * 0.3;
      S.thud({ at, f: 74, f1: 38, dur: 0.5, drive: 2, peak: 0.4, pan });
      svRing(S, at, mf(70 + n), 0.13, 1.5, pan);
    });
    svLay(S, 0.4, 3.0, 0.07);
  });
  def('sv-anvil-rise', 'bm', S => {
    S.space('hall', 0.5);
    // a tower coming up on its sheet: the iron heating (a rising hiss and a low swell), the anvil settling with one soft low note
    S.noise({ bp: 400, bp1: 2600, q: 1.8, dur: 1.2, a: 0.8, pts: [[1.0, 1], [1.2, 0]], peak: 0.12 });
    S.tone({ type: 'saw', f: 60, f1: 120, lp: 500, dur: 1.2, a: 0.7, peak: 0.08 });
    S.thud({ at: 0.9, f: 66, f1: 40, dur: 0.5, drive: 1.6, peak: 0.3 });
    svRing(S, 0.92, mf(62), 0.07, 1.0);
  });
  def('sv-anvil-strike', 'bm', S => {
    S.space('hall', 0.55);
    // the hammer coming down on the tower (lands at 0.1 s): a bright ring of steel, the blow under it and a spray of sparks
    S.crack({ at: 0.1, peak: 0.34, dur: 0.16 });
    S.thud({ at: 0.1, f: 70, f1: 30, dur: 0.9, drive: 3, peak: 0.7 });
    svRing(S, 0.1, mf(74), 0.2, 2.2);
    svRing(S, 0.11, mf(81), 0.1, 1.4);
    S.crackle({ at: 0.12, dens: 3.5, f: 4200, dur: 0.9, pts: [[0.02, 1], [0.9, 0]], peak: 0.16 });
    svBody(S, 0.12, 1.0, 0.1, 1.2);
  });

  // ---- the wall: The Heart Remembers (a heartbeat under the sealed room, a pillar of fire from each stump in cut order, a held breath, the glass seal shattering)
  def('bm-sovereign-the-heart-remembers', 'bm', S => {
    S.space('hall', 0.8);
    // the Sovereign's cast over the sealed room (3.0 s): the heart heard first, slow, then a low bell tolled for each head (three, each a step down), the drone gathering
    [0.1, 0.5, 1.3, 1.7].forEach((at, i) => S.thud({ at, f: (i % 2 ? 62 : 52), f1: 28, dur: 0.8, drive: 3, peak: i % 2 ? 0.4 : 0.55 }));
    [[0.9, 50], [1.8, 47], [2.7, 43]].forEach(([at, m]) => {
      S.bell({ at, f: mf(m), dur: 3.2, peak: 0.22, lp: 2600 });
      S.glass({ at: at + 0.01, f: mf(m + 36), dur: 1.2, peak: 0.03 });
    });
    S.pad({ notes: [mf(38), mf(45), mf(50)], dur: 3.6, det: 8, type: 'saw', lpEnv: [140, 700, 240, 2.8], peak: 0.1 });
    S.rumble({ dur: 3.4, f: 40, peak: 0.3, a: 2.4 });
    S.crackle({ at: 1.2, dens: 0.8, f: 2400, dur: 2.2, pts: [[1.6, 1], [2.2, 0.6]], peak: 0.12 });
  });
  const svHeartBuf = ctx => makeBuf(ctx, 'svheart', 1.25, 1, (d, sr) => {
    const beat = (at, f0, f1, dec, amp) => {
      const i0 = Math.floor(at * sr), N = Math.floor(dec * 7 * sr); let ph = 0;
      for (let j = 0; j < N && i0 + j < d.length; j++) { const tt = j / sr, f = f1 + (f0 - f1) * Math.exp(-tt / 0.04); ph += TAU * f / sr; d[i0 + j] += amp * Math.sin(ph) * Math.exp(-tt / dec) * Math.min(1, j / 50); }
    };
    beat(0.02, 62, 34, 0.11, 1); beat(0.4, 70, 40, 0.08, 0.7);
    normPeak(d, 0.95);
  });
  loop('sv-heart-loop', 'loop', L => {
    // the wall's heart, a slow double beat about once a second, under a low drone and one held string note: nothing else
    L.c(L.src(svHeartBuf(L.ctx), 1), L.f('lowpass', 220), L.g(1.0), L.out);
    const drone = L.g(0.07); [41, 41.5].forEach(f => L.c(L.osc('sine', f), drone)); L.lfo(drone.gain, 0.11, 0.025); L.c(drone, L.out);
    const str = L.g(0.03), lp = L.f('lowpass', 900, 0.7); [mf(62), mf(62) * 1.004].forEach(f => L.c(L.osc('sawtooth', f), str)); L.lfo(str.gain, 0.17, 0.012); L.c(str, lp, L.out);
  }, 1.2);
  def('sv-pillar', 'bm', S => {
    S.space('cave', 0.5);
    // a stump's pillar of fire (lands at 0.9 s; the hook plays it a little higher for each in the cut order): the floor splitting, a roar of flame climbing, the column
    // going up in one blow with a crack of the floor, and the fire left burning
    S.crack({ at: 0.1, peak: 0.2, dur: 0.14 }); S.crack({ at: 0.45, peak: 0.24, dur: 0.14 });
    S.noise({ color: 'brown', bp: 90, bp1: 1300, q: 0.8, dur: 0.95, a: 0.8, pts: [[0.88, 1], [0.95, 0.8]], peak: 0.34 });
    S.whoosh({ color: 'brown', f: 160, f1: 2600, dur: 0.9, peakAt: 0.95, peak: 0.3 });
    S.thud({ at: 0.9, f: 56, f1: 24, dur: 1.4, drive: 3.6, peak: 0.95 });
    S.crack({ at: 0.9, peak: 0.34, dur: 0.2 });
    S.whoosh({ at: 0.9, color: 'brown', f: 400, f1: 120, dur: 0.9, peakAt: 0.1, peak: 0.34 });
    S.rumble({ at: 0.9, dur: 1.6, f: 54, peak: 0.34, a: 0.02 });
    svBody(S, 0.92, 2.2, 0.26, 1.8);
    svRing(S, 0.92, 520, 0.1, 2.0);
  });
  def('sv-heart-breath', 'bm', S => {
    S.space('hall', 0.5);
    // the held breath after the last pillar (1.0 s): the whole room drawing in at once (a thin hiss climbing and stopping dead) and one high glass note held over a silence
    S.noise({ bp: 900, bp1: 4200, q: 3, dur: 0.95, a: 0.9, pts: [[0.9, 1], [0.95, 0]], peak: 0.16 });
    S.glass({ at: 0.1, f: mf(98), dur: 1.0, peak: 0.05, am: [5, 0.2] });
    S.tone({ f: mf(74), f1: mf(74) * 1.02, dur: 1.0, a: 0.8, peak: 0.04, lp: 2200 });
  });
  def('sv-seal-shatter', 'bm', S => {
    S.space('hall', 0.8);
    // the seal breaking like glass (the room-wide pane goes at once): one huge crack, then shards streaking out low and fast in every direction (bright noise sweeping
    // up and out, glass slivers panning wide), a white-gold ring running across the floor (a rising bell shimmer) and the boom behind it
    S.crack({ peak: 0.5, dur: 0.26 });
    S.thud({ f: 42, f1: 18, dur: 2.4, drive: 4.2, peak: 1 });
    S.noise({ bp: 1400, bp1: 7000, q: 1.6, dur: 1.2, grain: 0.9, pts: [[0.02, 1], [1.2, 0]], peak: 0.3 });
    S.whoosh({ at: 0.05, f: 300, f1: 6000, dur: 0.9, peakAt: 0.5, peak: 0.3, q: 0.9 });
    for (let i = 0; i < 14; i++) S.glass({ at: 0.04 + i * 0.055 + S.rr(0, 0.03), f: S.rr(2400, 6200), dur: S.rr(0.6, 1.2), peak: 0.06, pan: S.rr(-0.9, 0.9) });
    S.crackle({ at: 0.05, dens: 4, f: 5000, dur: 1.2, pts: [[0.02, 1], [1.2, 0]], peak: 0.2 });
    [0, 4, 7, 12, 16].forEach((n, i) => S.bell({ at: 0.15 + i * 0.12, f: mf(74 + n), dur: 2.6, peak: 0.1, lp: 6000, pan: Math.sin(i * 2.4) * 0.5 }));
    S.rumble({ dur: 3.0, f: 46, peak: 0.34, a: 0.05 });
    svRing(S, 0.05, 900, 0.12, 2.4);
  });

  // ---- Rebirth (the set piece: the blade drives into the floor and every fire in the room is drawn into it, the dark, the halo opening, the sky splitting, the choir, and the raidwide)
  def('sv-rebirth-draw', 'bm', S => {
    S.space('hall', 0.8);
    // from the instant the seal breaks (the shatter has the first second): the blade driven into the floor at 0.9 s (a plunge, a ring, a blow), every fire in the room
    // drawn into it as ribbons (a band of noise sweeping from high to low, the crackle thinning, a rising tone drawn tight), and at 2.5 s all of it snuffed out at once
    S.whoosh({ at: 0.6, f: 2400, f1: 200, dur: 0.4, peakAt: 0.7, peak: 0.26, q: 1.2 });
    S.metal({ at: 0.9, set: 'bar', f: 380, dur: 2.4, peak: 0.2, strike: 0.5 });
    S.thud({ at: 0.9, f: 50, f1: 22, dur: 1.6, drive: 3.6, peak: 0.9 });
    S.crack({ at: 0.9, peak: 0.28, dur: 0.18 });
    S.noise({ at: 1.0, color: 'pink', bp: 3800, bp1: 260, q: 1.4, dur: 1.5, a: 0.2, pts: [[0.6, 1], [1.5, 0.9]], peak: 0.28 });
    S.noise({ at: 1.1, color: 'pink', bp: 2600, bp1: 180, q: 1.6, dur: 1.4, a: 0.2, pts: [[0.6, 1], [1.4, 0.9]], peak: 0.18, pan: 0.5 });
    S.crackle({ at: 1.0, dens: 3, f: 3000, dur: 1.5, pts: [[0.1, 1], [1.5, 0]], peak: 0.2 });
    S.tone({ type: 'saw', at: 1.0, f: 60, f1: 340, dur: 1.5, a: 1.3, lp: 900, peak: 0.12 });
    S.rumble({ at: 0.9, dur: 1.6, f: 44, peak: 0.34, a: 0.3 });
    S.whoosh({ at: 2.3, f: 1600, f1: 90, dur: 0.25, peakAt: 0.5, peak: 0.3, q: 1.4 });
    S.thud({ at: 2.5, f: 40, f1: 20, dur: 0.7, drive: 2.4, peak: 0.5 });
  });
  def('sv-rebirth-halo', 'bm', S => {
    S.space('hall', 0.9);
    // the halo opening out of the dark to the edge of the room and settling into twelve sigils (lands at 0.4 s): a breath of air out from the middle, twelve glass bells
    // fanning out round the room one after another, and a low swell under it
    S.noise({ bp: 500, bp1: 4200, q: 1.2, dur: 1.4, a: 0.4, pts: [[0.5, 1], [1.4, 0]], peak: 0.2 });
    S.whoosh({ at: 0.3, f: 200, f1: 3400, dur: 0.9, peakAt: 0.4, peak: 0.28, q: 0.8 });
    const scale = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19];
    scale.forEach((n, i) => {
      S.bell({ at: 0.4 + i * 0.07, f: mf(74 + n), dur: 2.4, peak: 0.09, lp: 6000, pan: Math.sin(i * 2.4) * 0.8 });
      S.glass({ at: 0.41 + i * 0.07, f: mf(98 + n), dur: 1.2, peak: 0.03, pan: Math.sin(i * 2.4) * 0.8 });
    });
    S.pad({ notes: [mf(38), mf(45), mf(50)], at: 0.2, dur: 2.8, det: 8, type: 'saw', lpEnv: [140, 800, 240, 1.2], peak: 0.1 });
    S.thud({ at: 0.4, f: 54, f1: 26, dur: 1.2, drive: 3, peak: 0.6 });
  });
  def('sv-rebirth-sky', 'bm', S => {
    S.space('cave', 0.85);
    // the sky splitting and the meteor rekindling overhead, the floor becoming the crater (lands at 0.5 s): a tearing rip across the whole width, then a roar of fire
    // that comes from far above and does not stop, the crater's floor breaking up under it
    S.noise({ bp: 800, bp1: 6000, q: 1.2, dur: 0.6, a: 0.45, grain: 0.9, pts: [[0.5, 1], [0.6, 0.5]], peak: 0.26 });
    S.crack({ at: 0.5, peak: 0.46, dur: 0.3 });
    S.thud({ at: 0.5, f: 44, f1: 18, dur: 2.6, drive: 4.2, peak: 1 });
    S.noise({ at: 0.5, color: 'brown', bp: 70, bp1: 700, q: 0.8, dur: 3.2, a: 1.4, pts: [[1.2, 1], [3.2, 0]], peak: 0.36 });
    S.whoosh({ at: 0.3, color: 'brown', f: 80, f1: 1400, dur: 1.6, peakAt: 0.6, peak: 0.3 });
    S.crackle({ at: 0.5, dens: 2.4, f: 3000, dur: 3.0, pts: [[0.3, 1], [3.0, 0]], peak: 0.22 });
    for (let i = 0; i < 9; i++) S.crack({ at: 0.7 + i * 0.16 + (i % 3) * 0.03, peak: 0.18, dur: 0.12, pan: Math.sin(i * 1.9) * 0.8 });
    S.rumble({ at: 0.5, dur: 3.2, f: 38, peak: 0.42, a: 0.1 });
    svBody(S, 0.55, 2.6, 0.26, 1.8);
  });
  def('sv-rebirth-blast', 'bm', S => {
    S.space('hall', 0.85);
    // the Rebirth raidwide landing over the whole room as the set piece ends (the cast's own swell has run up to it): a huge low blow, a bright ring of fire out of the
    // crater's middle, and a long boom
    S.thud({ f: 38, f1: 16, dur: 2.8, drive: 4.4, peak: 1 });
    S.crack({ peak: 0.4, dur: 0.24 });
    S.whoosh({ color: 'brown', f: 200, f1: 3200, dur: 0.9, peakAt: 0.25, peak: 0.38, q: 0.8 });
    svBody(S, 0.02, 2.6, 0.32, 1.8);
    S.rumble({ dur: 3.0, f: 48, peak: 0.44, a: 0.02 });
    svRing(S, 0.03, 560, 0.16, 2.8);
    S.choir({ at: 0.05, notes: [mf(38), mf(45), mf(50)], dur: 2.6, vowel: 'a', vowel1: 'o', lp: 2200, peak: 0.1, pts: [[0.8, 1], [2.6, 0]] });
  });

  // ---- Act III: Corvane's stance and the crossed blades, the unleashings' landings, the Sovereign's Dance with Caelum's afterimages, and Brannoc's Sunwheel of Embers
  def('bm-sovereign-crossed-blades', 'bm', S => {
    S.space('hall', 0.55);
    // Corvane's answer (1.6 s; the same cast opens every stance): two blades drawn from opposite sides and brought across one another, a breath held, and the faint
    // ring of the two touching, a fifth apart (the unleashing's own rings come later, from the room's events)
    S.scrape({ f: 3400, q: 2.2, dur: 0.8, rate: 26, peak: 0.1, pts: [[0.5, 1], [0.8, 0]], pan: -0.7 });
    S.scrape({ at: 0.12, f: 3800, q: 2.2, dur: 0.7, rate: 30, peak: 0.1, pts: [[0.45, 1], [0.7, 0]], pan: 0.7 });
    svHush(S, 0, 0.9, 0.06, 900, 3000);
    svRing(S, 0.9, 1180, 0.12, 1.6, -0.3); svRing(S, 0.91, 1770, 0.12, 1.6, 0.3);
    S.thud({ at: 0.9, f: 60, f1: 34, dur: 0.5, drive: 1.5, peak: 0.3 });
    svLay(S, 0.1, 1.2, 0.05);
  });
  def('sv-stance-crane', 'bm', S => {
    S.space('hall', 0.6);
    // Corvane's low stance (the blade held low, Crescent), 2.2 s: one long breath drawn slowly in, a blade turning flat over the floor (a slow, low scrape that falls), a
    // low note settling, and a soft ring at rest
    svHush(S, 0, 1.7, 0.1, 260, 1000);
    S.scrape({ at: 0.3, f: 1500, q: 2, dur: 1.5, rate: 12, peak: 0.08, pts: [[0.8, 1], [1.5, 0]] });
    S.tone({ f: 330, f1: 247, dur: 2.0, a: 0.9, lp: 1400, peak: 0.07, vib: [4, 0.006], pts: [[1.2, 1], [2.0, 0]] });
    svRing(S, 1.7, 520, 0.12, 2.0);
    S.thud({ at: 1.7, f: 56, f1: 34, dur: 0.6, drive: 1.4, peak: 0.25 });
  });
  def('sv-stance-comet', 'bm', S => {
    S.space('hall', 0.5);
    // Corvane's drawn stance (the blade out of its scabbard, Lance), 2.2 s: a quick breath, the blade drawn in one bright scrape that ends on a hard ring, then a thin high note held tight
    svHush(S, 0, 1.2, 0.1, 1800, 4200);
    S.scrape({ at: 0.7, f: 3600, q: 2.4, dur: 0.7, rate: 28, peak: 0.12, pts: [[0.45, 1], [0.7, 0]] });
    S.metal({ at: 1.4, set: 'bar', f: 2300, dur: 1.6, peak: 0.16, strike: 0.4 });
    S.bell({ at: 1.42, f: mf(88), dur: 1.2, peak: 0.05, lp: 8000 });
    S.tone({ f: 1760, f1: 1800, dur: 2.0, a: 1.6, lp: 4000, peak: 0.04, pts: [[1.6, 1], [2.0, 0]] });
    S.crack({ at: 1.4, peak: 0.12, dur: 0.08 });
  });
  def('sv-stance-parting', 'bm', S => {
    S.space('hall', 0.6);
    // Corvane's sheathed stance (the blade put away, Pyre), 2.2 s: a breath drawn in, the blade run home (a scrape that falls in pitch), the click of the guard against the mouth of the
    // scabbard, and the breath let out over a silence
    svHush(S, 0, 1.0, 0.08, 800, 2400);
    S.scrape({ at: 0.6, f: 3400, f1: 1400, q: 2.2, dur: 0.8, rate: 22, peak: 0.1, pts: [[0.3, 1], [0.8, 0]] });
    S.metal({ at: 1.45, set: 'bar', f: 2800, dur: 0.3, peak: 0.1, click: 0.7 });
    S.wood({ at: 1.46, f: 700, dur: 0.1, peak: 0.12 });
    S.thud({ at: 1.46, f: 90, f1: 50, dur: 0.3, drive: 1.2, peak: 0.2 });
    S.noise({ at: 1.55, bp: 600, bp1: 220, q: 1.4, dur: 0.6, a: 0.05, pts: [[0.1, 1], [0.6, 0]], peak: 0.08 });
  });
  def('sv-cross-ring', 'bm', S => {
    S.space('hall', 0.6);
    // two blades unleashing together, ringing in harmony: one struck bar low and left, one a fifth above it on the right, a glass third over both, and the floor under them
    svRing(S, 0.05, 1180, 0.2, 2.0, -0.45);
    svRing(S, 0.06, 1770, 0.2, 2.0, 0.45);
    S.glass({ at: 0.08, f: mf(98), dur: 1.4, peak: 0.05, am: [4, 0.3] });
    S.pad({ notes: [mf(62), mf(69)], at: 0.05, dur: 1.6, det: 6, type: 'saw', lpEnv: [300, 1400, 400, 0.4], peak: 0.06 });
    S.thud({ at: 0.05, f: 62, f1: 28, dur: 0.7, drive: 2.2, peak: 0.5 });
    S.crack({ at: 0.05, peak: 0.16, dur: 0.1 });
  });
  def('sv-crescent-fan', 'bm', S => {
    S.space('hall', 0.55);
    // a fan of the blade across the room, landing at 0.9 s: a long sweep from one side and, a breath behind it, its crossing from the other, a heavy low blow and a high crescent shimmer, the fire left in the air
    S.whoosh({ at: 0, f: 220, f1: 2400, dur: 0.9, peakAt: 0.95, peak: 0.34, q: 1.2, pan: -0.8 });
    S.whoosh({ at: 0.1, f: 260, f1: 2800, dur: 0.8, peakAt: 0.95, peak: 0.26, q: 1.2, pan: 0.8 });
    S.thud({ at: 0.9, f: 58, f1: 26, dur: 1.0, drive: 3, peak: 0.7 });
    S.noise({ at: 0.9, color: 'pink', hp: 3000, dur: 0.8, pts: [[0.04, 1], [0.8, 0]], peak: 0.1, grain: 0.7 });
    svBody(S, 0.9, 1.3, 0.16, 1.8);
  });
  def('sv-lance-dash', 'bm', S => {
    S.space('hall', 0.45);
    // the blade-dash through a hero and out to the wall, landing at 0.4 s: a needle of air, a hard crack and a high ring, a low blow, sparks along the line
    S.whoosh({ at: 0, f: 800, f1: 5200, dur: 0.4, peakAt: 0.9, peak: 0.38, q: 2.4 });
    S.crack({ at: 0.4, peak: 0.38, dur: 0.14 });
    svRing(S, 0.4, 2600, 0.22, 1.6);
    S.thud({ at: 0.4, f: 72, f1: 30, dur: 0.7, drive: 3, peak: 0.65 });
    S.crackle({ at: 0.42, dens: 2.6, f: 4600, dur: 0.7, pts: [[0.02, 1], [0.7, 0]], peak: 0.14 });
  });
  def('sv-pyre-cut', 'bm', S => {
    S.space('hall', 0.5);
    // one blink-cut of the Pyre, landing at 0.18 s (the hook plays it a little higher for each beat, and a fifth over for Corvane's): a flick of air, a hard tick, a short bright ring
    // and a flare of cinders where the blade has passed
    S.whoosh({ at: 0, f: 1000, f1: 5400, dur: 0.18, peakAt: 0.9, peak: 0.3, q: 2 });
    S.crack({ at: 0.18, peak: 0.3, dur: 0.1 });
    svRing(S, 0.18, 2000, 0.18, 1.0);
    S.thud({ at: 0.18, f: 80, f1: 38, dur: 0.4, drive: 2, peak: 0.45 });
    S.sizzle({ at: 0.2, dur: 0.5, pts: [[0.03, 1], [0.5, 0]], peak: 0.18 });
    S.crackle({ at: 0.2, dens: 2.4, f: 4200, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.1 });
  });
  def('bm-sovereign-two-dancers', 'bm', S => {
    S.space('hall', 0.5);
    // Caelum's answer (1.6 s): two glass notes struck a third apart (the two dancers), the second just behind the first, a scatter of starlight, and one clean cut
    S.glass({ at: 0.1, f: mf(91), dur: 1.4, peak: 0.14, pan: -0.4 }); S.glass({ at: 0.28, f: mf(95), dur: 1.3, peak: 0.12, pan: 0.4 });
    caEcho(S, 0.1, mf(98), 0.06, 3, -0.3);
    caStars(S, 0, 7, 1.0, 0.04, 2600, 6200);
    caSlice(S, 0.85, 3200, 0.2);
  });
  def('bm-sovereign-foretold', 'bm', S => {
    S.space('hall', 0.6);
    // Caelum's answer, Foretold (the bar runs about seven seconds; the first three are here): a long breath drawn in, glass notes climbing a pentatonic scale one after another (the four
    // ghosts forming), a cold shimmer under them that swells, the fire held low, and one thin note stretched tighter over it all
    svHush(S, 0, 2.6, 0.08, 900, 3600);
    [[0.4, 79], [0.95, 83], [1.5, 86], [2.05, 91]].forEach(([at, m], i) => { S.glass({ at, f: mf(m), dur: 1.4, peak: 0.1, pan: (i - 1.5) * 0.35 }); caEcho(S, at + 0.14, mf(m), 0.03, 2, (i - 1.5) * 0.35); });
    S.tone({ f: 660, f1: 1320, dur: 3.2, a: 2.6, am: [3.0, 0.35], lp: 3000, pts: [[2.9, 1], [3.2, 0]], peak: 0.07 });
    caStars(S, 0.3, 8, 2.4, 0.03, 2400, 6000);
    svBody(S, 0.2, 2.8, 0.08, 1.0);
    S.thud({ at: 2.9, f: 52, f1: 32, dur: 0.5, drive: 1.4, peak: 0.2 });
  });
  def('sv-fore-ghost', 'hud', S => {
    S.space('hall', 0.5);
    // one ghost forming (the hook plays each a step up the scale): a soft glass note with a breath of cold air under it and a few specks of starlight
    S.glass({ f: mf(84), dur: 1.2, peak: 0.13 });
    S.glass({ at: 0.012, f: mf(84) * 2.01, dur: 0.6, peak: 0.03 });
    S.whoosh({ at: 0, f: 400, f1: 2400, dur: 0.5, peakAt: 0.6, peak: 0.07, q: 1.4 });
    caStars(S, 0.05, 4, 0.5, 0.025, 3000, 6400);
  });
  def('sv-fore-blades', 'bm', S => {
    S.space('hall', 0.55);
    // the three fans of the Foretold landing at 0.22 s: three glassy slices a third apart in quick succession, the blades struck and ringing together, a low blow and a spit of cinders
    [0, 0.05, 0.1].forEach((d, i) => caSlice(S, d, 2000 + i * 500, 0.2, (i - 1) * 0.6));
    svRing(S, 0.22, 1480, 0.16, 1.4);
    svRing(S, 0.27, 1870, 0.12, 1.2);
    S.thud({ at: 0.22, f: 60, f1: 28, dur: 0.7, drive: 2.6, peak: 0.6 });
    S.crackle({ at: 0.24, dens: 2.4, f: 3600, dur: 0.5, pts: [[0.02, 1], [0.5, 0]], peak: 0.1 });
  });
  def('sv-dance-image', 'hud', S => {
    S.space('hall', 0.5);
    // an afterimage standing where the blade will be (the hook plays them in order, each a step up a scale): one glass note and the faint after-ring of it
    S.glass({ f: mf(86), dur: 1.3, peak: 0.16 });
    S.glass({ at: 0.012, f: mf(86) * 2.01, dur: 0.7, peak: 0.04 });
    S.bell({ at: 0.01, f: mf(74), dur: 1.1, peak: 0.05, lp: 5000 });
    caEcho(S, 0.14, mf(86), 0.04, 2);
  });
  def('sv-dance-cut', 'bm', S => {
    S.space('hall', 0.5);
    // one cut of the Sovereign's Dance, landing at 0.22 s: a glassy slice of air, the blade struck and ringing, a low blow and a spit of cinders
    caSlice(S, 0, 2200, 0.22);
    svRing(S, 0.22, 1480, 0.18, 1.4);
    S.thud({ at: 0.22, f: 64, f1: 30, dur: 0.6, drive: 2.4, peak: 0.55 });
    S.crackle({ at: 0.24, dens: 2.2, f: 3600, dur: 0.4, pts: [[0.02, 1], [0.4, 0]], peak: 0.1 });
  });
  def('sv-dance-cut2', 'bm', S => {
    S.space('hall', 0.55);
    // Caelum's blade cutting alongside, deeper than the Sovereign's (lands at 0.22 s): the same slice an octave down, a heavier bar and a cold glass ring over it
    S.whoosh({ at: 0, f: 160, f1: 1300, dur: 0.26, peakAt: 0.85, peak: 0.28, q: 1.6 });
    S.metal({ at: 0.22, set: 'bar', f: 740, dur: 1.6, peak: 0.2, strike: 0.5 });
    S.metal({ at: 0.224, set: 'bar', f: 740 * 2.76, dur: 0.7, peak: 0.06, click: 0 });
    S.glass({ at: 0.23, f: mf(81), dur: 1.2, peak: 0.07 });
    S.thud({ at: 0.22, f: 48, f1: 24, dur: 0.8, drive: 2.8, peak: 0.6 });
  });
  const svWheelRing = (S, at, f, pk, pan) => {   // the Sunwheel's bronze: a plate struck hard and a bar a little over it
    S.metal({ at, set: 'plate', f, dur: 1.1, peak: pk, strike: 0.8, pan });
    S.metal({ at: at + 0.01, set: 'bar', f: f * 3.1, dur: 0.6, peak: pk * 0.35, click: 0, pan });
    S.crack({ at, peak: pk * 0.5, dur: 0.1, pan });
  };
  def('bm-sovereign-sunwheel-of-embers', 'bm', S => {
    S.space('hall', 0.5);
    // Brannoc's cast (4.6 s, the wheel is thrown as it ends): the old crowd's roar swelling, the shield spun up on his arm (a whirr that climbs and brightens with embers
    // catching along its rim), a drum, and the held moment before the throw
    brCrowd(S, 0, 3.6, 0.16);
    brWhirr(S, 0.6, 3.6, 500, 2400, 0, 0.22);
    S.crackle({ at: 1.2, dens: 1.0, f: 2600, dur: 3.2, pts: [[2.8, 1], [3.2, 0.5]], peak: 0.14 });
    S.drum({ at: 2.2, f: 70, dur: 0.7, peak: 0.34 }); S.drum({ at: 3.4, f: 66, dur: 0.7, peak: 0.4 }); S.drum({ at: 4.1, f: 62, dur: 0.8, peak: 0.5 });
    svWheelRing(S, 3.0, 420, 0.08, 0);
    svBody(S, 1.0, 3.4, 0.1, 1.0);
  });
  def('sv-wheel-throw', 'bm', S => {
    S.space('hall', 0.55);
    // the throw (the wheel leaves his hand at 0.2 s): a heavy sling of air, a bright release, a drum, and the shield's whirr taking off across the room
    S.whoosh({ at: 0, f: 300, f1: 2600, dur: 0.4, peakAt: 0.9, peak: 0.38, q: 1.2 });
    S.thud({ at: 0.2, f: 68, f1: 32, dur: 0.6, drive: 2.4, peak: 0.6 });
    svWheelRing(S, 0.2, 520, 0.14, 0);
    brWhirr(S, 0.2, 0.9, 1800, 3200, 0, 0.2);
    S.sizzle({ at: 0.22, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.14 });
  });
  loop('sv-wheel-loop', 'loop', L => {
    // the wheel rolling: a bronze whirr (a noise band chopped fast), a low spinning tone under it, a trail of cinders; the loop stops when it comes to the ring
    const n = L.g(0.1), bp = L.f('bandpass', 2200, 3);
    L.c(L.crackle(2.4), bp, n, L.out); L.lfo(n.gain, 30, 0.08, 'square');
    const lo = L.g(0.1); [96, 96.9].forEach(f => L.c(L.osc('sawtooth', f), lo)); const lp = L.f('lowpass', 700, 0.7); L.lfo(lo.gain, 26, 0.05, 'square'); L.c(lo, lp, L.out);
    const hum = L.g(0.05); L.c(L.osc('sine', 190), hum); L.lfo(hum.gain, 0.8, 0.02); L.c(hum, L.out);
    L.c(L.crackle(0.9), L.f('highpass', 4200), L.g(0.04), L.out);
  }, 0.15);
  def('sv-wheel-clang', 'bm', S => {
    S.space('hall', 0.5);
    // the wheel striking the wall (a bounce): bronze on stone, one hard clang and its overtone, a low blow, a spray of sparks
    svWheelRing(S, 0, 620, 0.24, 0);
    S.thud({ f: 60, f1: 30, dur: 0.6, drive: 2.4, peak: 0.55 });
    S.crackle({ at: 0.02, dens: 3, f: 4200, dur: 0.5, pts: [[0.02, 1], [0.5, 0]], peak: 0.14 });
  });
  def('sv-wall-fire', 'bm', S => {
    S.space('cave', 0.45);
    // a wall of fire roaring up along a leg of the wheel's road (it takes at 0.5 s): the whoosh building along its length, the blow of it catching and a long settled roar with crackle under it
    S.whoosh({ at: 0, color: 'brown', f: 120, f1: 2000, dur: 0.6, peakAt: 0.9, peak: 0.34, q: 0.7 });
    S.thud({ at: 0.5, f: 58, f1: 28, dur: 0.9, drive: 3, peak: 0.6 });
    S.noise({ at: 0.45, color: 'brown', bp: 90, bp1: 600, q: 0.8, dur: 2.6, a: 0.2, pts: [[0.4, 1], [2.6, 0.2]], peak: 0.3 });
    S.crackle({ at: 0.4, dens: 3, f: 3000, dur: 2.6, pts: [[0.2, 1], [2.6, 0.2]], peak: 0.2 });
    S.sizzle({ at: 0.5, dur: 1.8, pts: [[0.1, 1], [1.8, 0]], peak: 0.1 });
  });
  def('sv-wheel-catch', 'bm', S => {
    S.space('hall', 0.5);
    // the wheel caught: the shield stopped dead in a pair of hands (a heavy thud, a short clang that is cut off, the whirr dying away), the catcher grunting low
    S.thud({ f: 48, f1: 22, dur: 1.0, drive: 3.4, peak: 0.9 });
    svWheelRing(S, 0, 360, 0.16, 0);
    S.whoosh({ at: 0.02, f: 2400, f1: 200, dur: 0.5, peakAt: 0.1, peak: 0.24, q: 1.2 });
    S.voice({ at: 0.04, f: 90, f1: 62, dur: 0.4, vowel: 'o', vowel1: 'u', breath: 2, lp: 1400, peak: 0.1, a: 0.05 });
    S.rumble({ dur: 1.2, f: 50, peak: 0.3, a: 0.02 });
  });
  def('sv-wall-out', 'bm', S => {
    S.space('cave', 0.45);
    // the walls snuffed out (a catch puts every wall out at once): a huge drawn-in breath, the roar cut off in a gust, steam hissing off cooling stone, one low settle
    S.whoosh({ at: 0, f: 2600, f1: 140, dur: 0.5, peakAt: 0.15, peak: 0.34, q: 1 });
    S.noise({ at: 0.1, hp: 3800, dur: 1.4, a: 0.1, pts: [[0.1, 1], [1.4, 0]], peak: 0.14 });
    S.crackle({ at: 0.05, dens: 2, f: 2400, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.1 });
    S.thud({ at: 0.04, f: 52, f1: 26, dur: 0.8, drive: 2.6, peak: 0.55 });
  });

  // ---- Act III, the rest: Grace Withdrawn and Nightfall, Morrow-Oak's Seeds of Ash and the holes and saplings they leave, and the push into Every Name
  def('bm-sovereign-grace-withdrawn', 'bm', S => {
    S.space('hall', 0.7);
    // the cast (3.2 s): everyone's life drawn out to a thread. Air pulled inward in one narrowing rush, the fire's roar starved thin, a heart stumbling softer and slower,
    // and a held high tone that rises out of a thread of glass and carries on into Nightfall's cast. The last low fall is the grace leaving (3.1 s)
    S.whoosh({ f: 320, f1: 3000, dur: 3.0, peakAt: 0.92, peak: 0.3, q: 2.2 });
    S.noise({ color: 'brown', bp: 220, bp1: 60, q: 0.9, dur: 2.9, a: 0.1, pts: [[0.3, 1], [2.9, 0]], peak: 0.26 });
    S.crackle({ dens: 1.6, f: 2600, dur: 2.6, pts: [[0.2, 1], [2.6, 0]], peak: 0.12 });
    [[0.15, 0.5, 52], [1.05, 0.36, 48], [2.1, 0.24, 44]].forEach(([at, pk, f]) => {
      S.thud({ at, f, f1: 26, dur: 0.7, drive: 2.4, peak: pk });
      S.thud({ at: at + 0.3, f: f + 8, f1: 30, dur: 0.5, drive: 2, peak: pk * 0.6 });
    });
    S.tone({ at: 1.5, f: mf(88), dur: 3.6, a: 1.4, pts: [[1.4, 1], [3.0, 0.9], [3.6, 0]], peak: 0.07, vib: [5.2, 0.004, 1.0] });
    S.tone({ at: 1.5, f: mf(88) * 1.0045, dur: 3.6, a: 1.4, pts: [[1.4, 1], [3.0, 0.9], [3.6, 0]], peak: 0.05 });
    S.glass({ at: 2.2, f: mf(100), dur: 1.8, peak: 0.05 });
    S.thud({ at: 3.1, f: 44, f1: 20, dur: 1.2, drive: 3, peak: 0.6 });
    S.bell({ at: 3.1, f: mf(33), dur: 3.0, peak: 0.1, lp: 1500 });
  });
  def('bm-sovereign-nightfall', 'bm', S => {
    S.space('hall', 0.8);
    // the cast (8 s) and the blow it ends on: the held high tone thin over a cold wind, a great bell tolled slower than a heart, then faster and lower each time, and the
    // dark landing on everyone at 8.0 s: a rush drawn in, one huge blow, the bell, the fire's body
    S.tone({ f: mf(88), dur: 8.0, a: 0.6, pts: [[0.5, 1], [7.0, 0.8], [7.9, 0]], peak: 0.045, vib: [5.2, 0.004, 0.5] });
    S.tone({ f: mf(88) * 1.0045, dur: 8.0, a: 0.6, pts: [[0.5, 1], [7.0, 0.8], [7.9, 0]], peak: 0.03 });
    S.noise({ color: 'pink', bp: 520, bp1: 170, q: 1.1, dur: 7.6, a: 2.4, pts: [[2.6, 0.6], [6.8, 1], [7.6, 0]], peak: 0.09 });
    [[0.3, 38, 0.14], [2.3, 36, 0.16], [4.1, 34, 0.18], [5.6, 33, 0.2], [6.7, 31, 0.22], [7.4, 29, 0.26]].forEach(([at, m, pk], i) => {
      S.bell({ at, f: mf(m), dur: 3.4, peak: pk, lp: 2200 });
      S.thud({ at, f: 46 - i * 2, f1: 24, dur: 0.9, drive: 2.6, peak: 0.28 + i * 0.05 });
      S.glass({ at: at + 0.01, f: mf(m + 36), dur: 1.2, peak: 0.02 + i * 0.004 });
    });
    S.whoosh({ at: 6.9, color: 'brown', f: 120, f1: 2200, dur: 1.1, peakAt: 0.92, peak: 0.34, q: 0.8 });
    S.thud({ at: 8.0, f: 42, f1: 18, dur: 1.9, drive: 4, peak: 0.95 });
    S.crack({ at: 8.0, peak: 0.26, dur: 0.2 });
    svBody(S, 8.0, 2.0, 0.26, 1.4);
    S.bell({ at: 8.02, f: mf(26), dur: 3.4, peak: 0.2, lp: 1600 });
  });
  def('bm-sovereign-seeds-of-ash', 'bm', S => {
    S.space('hall', 0.5);
    // Morrow-Oak's answer (1.6 s): seeds scattered over the party. A hush of breath, a dry rattle of husks, an ember warming under it and a soft pop as they settle
    svHush(S, 0, 1.2, 0.08, 700, 2800);
    [0.2, 0.34, 0.5, 0.63, 0.82, 0.95, 1.12].forEach((at, i) => S.wood({ at, f: 2200 + (i * 613) % 1400, dur: 0.05, peak: 0.1 - i * 0.006, pan: Math.sin(i * 2.1) * 0.6 }));
    S.crackle({ at: 0.3, dens: 1.2, f: 2400, dur: 1.4, pts: [[0.6, 1], [1.4, 0.4]], peak: 0.1 });
    S.tone({ at: 0.2, f: mf(50), f1: mf(57), dur: 1.5, a: 1.2, pts: [[1.2, 1], [1.5, 0]], peak: 0.07, lp: 1200 });
    S.thud({ at: 1.45, f: 92, f1: 50, dur: 0.3, drive: 1.6, peak: 0.34 });
    S.glass({ at: 1.46, f: mf(86), dur: 0.9, peak: 0.05 });
  });
  def('sv-seed-pulse', 'hud', S => {
    S.space('room', 0.3);
    // a seed beating on its carrier (the hook plays it faster and higher as the burst nears): a low warm throb, a breath of ember
    S.thud({ f: 74, f1: 44, dur: 0.36, drive: 1.6, peak: 0.5, click: 0.15 });
    S.tone({ f: mf(45), dur: 0.42, a: 0.02, peak: 0.16, lp: 900 });
    S.crackle({ at: 0.02, dens: 1.5, f: 2200, dur: 0.3, pts: [[0.04, 1], [0.3, 0]], peak: 0.1 });
    S.glass({ at: 0.03, f: mf(81), dur: 0.5, peak: 0.025 });
  });
  def('sv-seed-burst', 'bm', S => {
    S.space('cave', 0.5);
    // a seed bursting and the floor burning through (the hook plays it as the hole opens): a crack in the stone, the fire's blow coming up, a roar of it, and the rubble
    // falling away into the dark below, stone by stone
    S.crack({ at: 0, peak: 0.34, dur: 0.3 });
    S.whoosh({ at: 0, color: 'brown', f: 160, f1: 2000, dur: 0.7, peakAt: 0.25, peak: 0.34, q: 0.7 });
    S.thud({ at: 0.04, f: 52, f1: 22, dur: 1.5, drive: 3.6, peak: 0.95 });
    svBody(S, 0.05, 2.4, 0.3, 1.8);
    S.noise({ at: 0.2, color: 'brown', bp: 320, bp1: 90, q: 0.8, dur: 1.9, a: 0.1, grain: 0.9, pts: [[0.2, 1], [1.9, 0]], peak: 0.22 });
    [0.25, 0.42, 0.6, 0.85, 1.15, 1.55].forEach((at, i) => S.bell({ at, set: 'stone', f: 220 - i * 18, dur: 0.5, peak: 0.1 - i * 0.012, pan: Math.sin(i * 1.7) * 0.7, strike: 0.5 }));
    S.sizzle({ at: 0.1, dur: 1.6, pts: [[0.1, 1], [1.6, 0]], peak: 0.12 });
  });
  def('sv-hole-town', 'hud', S => {
    S.space('hall', 0.6);
    // the town's sound, faint, up through a new hole (the hook plays it a moment after the burst): a bell far off, a cold breath of wind over the square, the Tankard's sign swinging
    S.bell({ at: 0.35, f: mf(62), dur: 3.0, peak: 0.1, lp: 1300 });
    S.noise({ color: 'pink', bp: 480, bp1: 900, q: 1.2, dur: 3.4, a: 1.2, pts: [[1.2, 1], [3.4, 0]], peak: 0.08 });
    S.creak({ at: 1.3, dur: 0.8, f: 14, f1: 9, res: [500, 1000], q: 9, peak: 0.025 });
    S.tone({ at: 0.5, f: mf(62) * 2.01, dur: 1.6, a: 0.02, pts: [[0.05, 1], [1.6, 0]], peak: 0.012, lp: 1800 });
  });
  def('sv-hole-fall', 'hud', S => {
    S.space('cave', 0.4);
    // a hero stepping into a hole the fire burned through (the hook plays it at the hero): the edge crumbling, a rush of air going down, and a heavy landing in the dark below
    S.bell({ set: 'stone', f: 260, dur: 0.3, peak: 0.08, strike: 0.5 });
    S.whoosh({ f: 1800, f1: 160, dur: 0.55, peakAt: 0.12, peak: 0.22, q: 0.8 });
    S.noise({ at: 0.04, color: 'brown', bp: 600, bp1: 120, q: 0.8, dur: 0.6, a: 0.02, pts: [[0.05, 1], [0.6, 0]], peak: 0.12 });
    S.thud({ at: 0.55, f: 60, f1: 28, dur: 0.9, drive: 2.4, peak: 0.6 });
    S.crack({ at: 0.55, f: 500, peak: 0.16, dur: 0.2 });
    S.crackle({ at: 0.55, dens: 1.4, f: 2400, dur: 0.6, pts: [[0.05, 1], [0.6, 0]], peak: 0.08 });
  });
  def('sv-sapling-creak', 'hud', S => {
    S.space('room', 0.3);
    // a burning sapling taking a step (the hook plays one every step or two while it walks): green wood groaning, a root pulled out of ground, the cinders spitting
    S.creak({ dur: 0.55, f: 20, f1: 11, res: [420, 900, 1500], q: 12, peak: 0.16 });
    S.thud({ at: 0.28, f: 88, f1: 48, dur: 0.22, drive: 1.4, peak: 0.24, click: 0 });
    S.wood({ at: 0.3, f: 520, dur: 0.1, peak: 0.1 });
    S.crackle({ at: 0.05, dens: 1.6, f: 2600, dur: 0.5, pts: [[0.1, 1], [0.5, 0.2]], peak: 0.09 });
  });
  def('sv-sapling-die', 'hud', S => {
    S.space('cave', 0.45);
    // a sapling cut down: the trunk splits, the crown comes down in a rush of sparks, and the fire hisses out on the ground, a low sigh going with it
    S.crack({ at: 0, f: 700, peak: 0.3, dur: 0.3 });
    [0.04, 0.09, 0.15].forEach((at, i) => S.wood({ at, f: 600 + i * 260, dur: 0.1, peak: 0.12 }));
    S.whoosh({ at: 0.1, f: 2000, f1: 220, dur: 0.7, peakAt: 0.1, peak: 0.24, q: 0.9 });
    S.thud({ at: 0.38, f: 62, f1: 30, dur: 0.8, drive: 2, peak: 0.5 });
    S.crackle({ at: 0.1, dens: 2.2, f: 3000, dur: 1.2, pts: [[0.05, 1], [1.2, 0]], peak: 0.14 });
    S.sizzle({ at: 0.5, dur: 1.0, pts: [[0.05, 1], [1.0, 0]], peak: 0.1 });
    S.voice({ at: 0.15, f: 72, f1: 50, dur: 1.0, vowel: 'o', vowel1: 'u', breath: 3, lp: 1200, peak: 0.05, a: 0.2 });
  });
  def('sv-sapling-arrive', 'hud', S => {
    S.space('hall', 0.5);
    // a sapling reaching the Sovereign and going up in one flare: a rising rush, a burst of sparks, a bright note at the top
    S.whoosh({ f: 260, f1: 3200, dur: 0.8, peakAt: 0.88, peak: 0.26, q: 1.2 });
    S.crackle({ at: 0.1, dens: 2.4, f: 3200, dur: 0.9, pts: [[0.6, 1], [0.9, 0]], peak: 0.16 });
    S.thud({ at: 0.78, f: 66, f1: 34, dur: 0.6, drive: 2, peak: 0.4 });
    S.glass({ at: 0.8, f: mf(89), dur: 1.0, peak: 0.06 });
  });
  def('sv-relight', 'bm', S => {
    S.space('hall', 0.6);
    // a dark sigil on the halo catching again: a breath, the fwump of the flame taking, a struck blade ringing as it lights, a thread of glass and one low bell
    S.whoosh({ f: 300, f1: 2400, dur: 0.4, peakAt: 0.9, peak: 0.26, q: 1.2 });
    S.thud({ at: 0.36, f: 70, f1: 34, dur: 0.8, drive: 2.4, peak: 0.55 });
    S.crackle({ at: 0.3, dens: 2, f: 3000, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.14 });
    svRing(S, 0.38, 1180, 0.12, 1.6);
    S.glass({ at: 0.4, f: mf(93), dur: 1.2, peak: 0.05 });
    S.bell({ at: 0.4, f: mf(50), dur: 2.2, peak: 0.08, lp: 2000 });
    S.sizzle({ at: 0.38, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.1 });
  });
  def('sv-everyname', 'bm', S => {
    S.space('hall', 0.8);
    // the push (set piece, 10 s): the crater peeling away in strips like burning paper (a rip and a curl of fire for each, crackle all the while), the camera pulling back
    // (one wide rush of air that opens and falls away), and a low swell of strings and voices under it all, with one deep bell where the second line is spoken (6 s)
    for (let i = 0; i < 11; i++) {
      const at = 0.15 + i * 0.32 + (i % 3) * 0.05, pan = Math.sin(i * 2.3) * 0.8;
      S.scrape({ at, f: 3000 + (i % 4) * 500, q: 1.5, dur: 0.38, rate: 90, pts: [[0.04, 1], [0.38, 0]], peak: 0.09, pan });
      S.whoosh({ at: at + 0.05, color: 'brown', f: 300, f1: 2400, dur: 0.55, peakAt: 0.45, peak: 0.13, pan });
    }
    S.crackle({ at: 0, dens: 2.6, f: 3000, dur: 4.6, pts: [[0.4, 1], [3.4, 1], [4.6, 0]], peak: 0.2 });
    S.whoosh({ f: 180, f1: 1900, dur: 3.6, peakAt: 0.5, peak: 0.34, q: 0.7 });
    S.whoosh({ at: 0.3, color: 'brown', f: 90, f1: 700, dur: 4.0, peakAt: 0.4, peak: 0.26, q: 0.6 });
    S.thud({ at: 3.4, f: 50, f1: 24, dur: 1.4, drive: 3, peak: 0.55 });
    S.pad({ notes: [mf(38), mf(45), mf(50)], dur: 10, det: 8, type: 'saw', lpEnv: [140, 900, 200, 5], peak: 0.15 });
    S.choir({ at: 2.4, notes: [mf(50), mf(57), mf(62)], dur: 7.2, a: 3.0, vowel: 'o', vowel1: 'a', lp: 2200, peak: 0.07, pts: [[3.0, 1], [7.2, 0]] });
    svBody(S, 0.5, 8.0, 0.1, 0.9);
    S.bell({ at: 6.0, f: mf(38), dur: 4.0, peak: 0.16, lp: 1800 });
  });
  def('sv-hk-climb', 'bm', S => {
    S.space('hall', 0.6);
    // the Hollow King climbing out of the portal ring uncalled (the echo rises for 2.3 s): the ring's stones grinding apart and shifting, a heavy armoured foot on the
    // flagstones as he stands, and last his lantern catching: a puff of flame, a chain swinging, a small warm bell
    S.scrape({ f: 340, q: 1.2, dur: 1.9, rate: 14, pts: [[0.3, 1], [1.5, 0.8], [1.9, 0]], peak: 0.17 });
    S.rumble({ dur: 2.4, f: 90, peak: 0.3, a: 0.5 });
    [0.3, 0.85, 1.45].forEach((at, i) => S.bell({ at, set: 'stone', f: 150 - i * 12, dur: 0.6, peak: 0.12, strike: 0.5 }));
    S.metal({ at: 1.75, set: 'plate', f: 380, dur: 0.6, peak: 0.12, strike: 0.7 });
    S.thud({ at: 1.95, f: 56, f1: 28, dur: 0.9, drive: 2.8, peak: 0.65 });
    S.whoosh({ at: 2.2, f: 400, f1: 2400, dur: 0.35, peakAt: 0.6, peak: 0.16, q: 1.2 });
    S.crackle({ at: 2.25, dens: 1.8, f: 2800, dur: 0.9, pts: [[0.1, 1], [0.9, 0]], peak: 0.12 });
    S.creak({ at: 2.4, dur: 0.4, f: 40, f1: 28, res: [900, 1800], q: 10, peak: 0.07 });
    S.bell({ at: 2.3, f: mf(57), set: 'hand', dur: 1.4, peak: 0.1 });
    S.glass({ at: 2.31, f: mf(81), dur: 1.0, peak: 0.04 });
  });

  // ---- The last flame, the enrage and the wipe (set pieces 6 and 7). The kill is played by the room's own events, one sound per beat: a soft bell as each echo lies down
  // (sv-lie-bell, pitched down a minor scale by sound-hooks.js), the Hollow King's lantern set down, the fire's long exhale; Emberfall's rise from below sits under the cast's sky of
  // embers (bm-sovereign-emberfall), so it keeps clear of the roar and carries the seams, the town's timbers and the ash instead.
  def('sv-lie-bell', 'hud', S => {
    S.space('hall', 0.6);
    // one echo lying down: a soft bell (the pitch is set by the rate, falling for each of the twelve), a pane of glass over it, the small thud of a body on stone and a last dust of ember
    S.bell({ f: mf(62), dur: 3.2, peak: 0.22, lp: 3600 });
    S.glass({ at: 0.01, f: mf(86), dur: 1.3, peak: 0.03 });
    S.thud({ at: 0.03, f: 72, f1: 38, dur: 0.5, drive: 1.4, peak: 0.16 });
    S.crackle({ at: 0.06, dens: 0.7, f: 2000, dur: 1.0, pts: [[0.1, 1], [1.0, 0]], peak: 0.05 });
  });
  def('sv-signal', 'hud', S => {
    S.space('hall', 0.5);
    // the First Signal: the first sigil of a pass flaring (once, short, quiet): a struck pane of glass and its octave answering, a thin rising air, a spit of ember
    S.glass({ f: mf(93), dur: 1.5, peak: 0.15 });
    S.glass({ at: 0.015, f: mf(93) * 2.01, dur: 0.9, peak: 0.05 });
    S.whoosh({ at: 0, f: 700, f1: 3200, dur: 0.3, peakAt: 0.9, peak: 0.07, q: 1.8 });
    S.bell({ at: 0.28, f: mf(81), dur: 1.4, peak: 0.07, lp: 4200 });
    S.crackle({ at: 0.04, dens: 1.2, f: 3000, dur: 0.5, pts: [[0.05, 1], [0.5, 0]], peak: 0.05 });
  });
  def('sv-lantern-down', 'bm', S => {
    S.space('hall', 0.6);
    // the Hollow King sets his lantern down on the stones and lies down beside it: the glass base on flagstone and the chain going slack, a small warm note in the case,
    // the armour settling (plate, a long low thud), the flame sinking to a flicker and one last low bell
    S.metal({ set: 'plate', f: 640, dur: 0.5, peak: 0.14, strike: 0.6 });
    chains(S, 0.1, 0.5, 0.8);
    S.thud({ at: 0.05, f: 92, f1: 50, dur: 0.35, drive: 1.6, peak: 0.22 });
    S.glass({ at: 0.22, f: mf(81), dur: 2.0, peak: 0.08, am: [4, 0.25] });
    [0.95, 1.2, 1.5].forEach((at, i) => S.metal({ at, set: 'plate', f: 300 - i * 40, dur: 0.4, peak: 0.1 - i * 0.02, strike: 0.7 }));
    S.thud({ at: 1.0, f: 56, f1: 30, dur: 1.0, drive: 2.4, peak: 0.42 });
    S.crackle({ at: 0.2, dens: 0.8, f: 1800, dur: 3.0, pts: [[0.2, 1], [3.0, 0]], peak: 0.1 });
    S.noise({ at: 0.2, color: 'pink', bp: 700, q: 1.2, dur: 3.0, a: 0.2, am: [9, 0.5], pts: [[0.3, 1], [3.0, 0]], peak: 0.06 });
    S.bell({ at: 1.3, f: mf(38), dur: 3.6, peak: 0.14, lp: 1800 });
  });
  def('sv-gutter', 'bm', S => {
    S.space('hall', 0.85);
    // the fire draining out of the square (8.5 s): a long exhale. The roar sinks and darkens, the crackle thins and stops, a saw sagging in pitch like a breath let go,
    // the last embers ticking down, and a hush where it ends
    S.noise({ color: 'brown', bp: 900, bp1: 80, q: 0.8, dur: 8.2, a: 0.1, pts: [[0.5, 1], [4.5, 0.55], [8.2, 0]], peak: 0.3 });
    S.whoosh({ at: 0.2, color: 'brown', f: 1600, f1: 90, dur: 3.4, peakAt: 0.12, peak: 0.3, q: 0.7 });
    S.rumble({ dur: 8.4, f: 58, peak: 0.28, a: 0.2, pts: [[3, 0.8], [8.4, 0]] });
    S.crackle({ dens: 1.8, f: 2600, dur: 7.6, pts: [[0.3, 1], [3.5, 0.5], [7.6, 0]], peak: 0.2 });
    S.tone({ type: 'saw', f: 170, f1: 38, dur: 8, a: 0.2, lp: 480, peak: 0.1 });
    S.sizzle({ at: 4, dur: 4.2, pts: [[0.3, 1], [4.2, 0]], peak: 0.08 });
    [5.2, 6.4, 7.3, 7.9].forEach((at, i) => S.thud({ at, f: 64 - i * 6, f1: 30, dur: 0.5, drive: 1.4, peak: 0.16 - i * 0.025 }));
  });
  def('sv-emberfall-below', 'bm', S => {
    S.space('hall', 0.9);
    // the town igniting from below (set piece, 8 s: the seams go white-gold at 0.8, the town ignites at 2.4, the ash closes in at 4.4): cracks running out across the stones,
    // a deep swell from under the floor and the weight of it catching, burning timbers (crack, creak, a bell tolling in a tower that is alight), then ash falling in a fine hiss.
    // No roar of its own: the cast's sound carries the sky.
    S.scrape({ at: 0.7, f: 170, q: 1.2, dur: 1.8, rate: 16, pts: [[0.3, 1], [1.8, 0]], peak: 0.15 });
    for (let i = 0; i < 16; i++) S.crack({ at: 0.8 + i * 0.1 + (i % 3) * 0.02, peak: 0.1 + i * 0.012, dur: 0.1, pan: Math.sin(i * 1.7) * 0.9 });
    S.glass({ at: 0.8, f: mf(86), dur: 1.8, peak: 0.04, am: [6, 0.3] });
    S.thud({ at: 2.4, f: 38, f1: 16, dur: 3.0, drive: 4, peak: 0.9 });
    S.tone({ type: 'sine', f: 30, f1: 46, dur: 5.2, at: 2.2, a: 1.6, peak: 0.26 });
    for (let i = 0; i < 9; i++) S.creak({ at: 2.6 + i * 0.42 + (i % 2) * 0.1, dur: 0.5, f: 46 + (i % 3) * 8, f1: 30, res: [800, 1700], q: 10, peak: 0.07, pan: Math.sin(i * 2.2) * 0.8 });
    for (let i = 0; i < 12; i++) S.crack({ at: 2.5 + i * 0.36 + S.rr(0, 0.12), peak: 0.1 + (i % 4) * 0.03, dur: 0.12, pan: Math.sin(i * 2.9) * 0.9 });
    S.crackle({ at: 2.4, dens: 3, f: 3200, dur: 5.6, pts: [[1.4, 1], [4.5, 0.8], [5.6, 0]], peak: 0.2 });
    [3.1, 4.3, 5.4, 6.3].forEach((at, i) => { S.bell({ at, set: 'hand', f: mf(45 + (i % 2) * 3), dur: 3.0, peak: 0.13 + i * 0.01, lp: 2400, pan: i % 2 ? 0.5 : -0.5 }); S.thud({ at, f: 52, f1: 28, dur: 0.6, drive: 2, peak: 0.28 }); });
    S.noise({ at: 4.4, hp: 3200, dur: 3.8, a: 2.2, pts: [[2.4, 1], [3.8, 0.4]], peak: 0.07 });
    S.sizzle({ at: 4.4, dur: 3.8, pts: [[1.6, 1], [3.8, 0.3]], peak: 0.12 });
  });
  def('sv-wipe-chord', 'bm', S => {
    S.space('hall', 0.8);
    // a wipe: the halo relights in full, as if nothing was learned. Twelve bright tones flick on round the ring in half a second, then one cruel chord: a major seventh
    // hung high over the dark key (D, F sharp, A, C sharp), brass and glass, a drum, the fire flaring behind it
    for (let i = 0; i < 12; i++) S.glass({ at: i * 0.04, f: mf(74 + [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19][i]), dur: 1.2, peak: 0.05, pan: Math.sin(i * 2.4) * 0.6 });
    S.thud({ at: 0.5, f: 46, f1: 22, dur: 1.8, drive: 3.4, peak: 0.85 });
    S.crack({ at: 0.5, peak: 0.3, dur: 0.18 });
    S.pad({ at: 0.5, notes: [mf(50), mf(62), mf(66), mf(69), mf(73)], type: 'saw', dur: 2.2, det: 10, lpEnv: [1400, 6200, 2200, 0.25], peak: 0.2 });
    S.choir({ at: 0.52, notes: [mf(74), mf(78), mf(81), mf(85)], dur: 2.0, vowel: 'a', vowel1: 'a', lp: 6000, peak: 0.09, pts: [[0.1, 1], [2.0, 0]] });
    [74, 78, 81, 85].forEach((m, i) => S.bell({ at: 0.5 + i * 0.015, f: mf(m), dur: 2.2, peak: 0.12, lp: 7000 }));
    svRing(S, 0.5, 880, 0.14, 1.8);
    svBody(S, 0.5, 1.8, 0.2, 2.4);
    S.whoosh({ at: 0.35, color: 'brown', f: 300, f1: 2600, dur: 0.3, peakAt: 0.95, peak: 0.3 });
  });

  // ---------------------------------------------------------------------------------------------- cold steel and bells (boss ids hood and seraph)
  // thin steel, breath, glass tones, a deep bell with chain shimmer for the tolls, a hard frost crack for the fixed blows and a hollow soft weight (no crack) for the
  // percentage hits, with a drawn-in hush before it. The second gate's wing beats are low and feathered. No voices but one cold sermon.
  const hdBreath = (S, at, d, pk, f0, f1, pan) => S.noise({ at, color: 'pink', bp: f0 || 2000, bp1: f1 || 5600, q: 1.8, dur: d, a: d * 0.75, pts: [[d * 0.85, 1], [d, 0]], peak: pk, pan });   // cold air drawn in
  const hdSigh = (S, at, d, pk, f0, f1, pan) => S.noise({ at, color: 'pink', bp: f0 || 4200, bp1: f1 || 1400, q: 1.2, dur: d, a: 0.04, pts: [[0.06, 1], [d, 0]], peak: pk, pan });          // ...and let out
  const hdSteel = (S, at, d, pk, pan) => {              // a blade sliding from a sleeve: a whisper of steel on cloth, then a thin ring
    S.noise({ at, bp: 3400, bp1: 7600, q: 7, dur: d, a: d * 0.25, pts: [[d * 0.4, 1], [d, 0]], peak: pk, pan });
    S.scrape({ at, f: 5200, q: 3, dur: d, rate: 70, pts: [[d * 0.3, 1], [d, 0]], peak: pk * 0.3, pan });
    S.metal({ at: at + d * 0.85, set: 'bar', f: 2600, dur: 1.2, peak: pk * 0.35, strike: 0.2, click: 0.2, pan });
  };
  const hdRing = (S, at, f, pk, dur, pan) => {          // a struck thin blade: bar, a thread of glass over it
    S.metal({ at, set: 'bar', f, dur: dur || 1.6, peak: pk, strike: 0.3, pan });
    S.glass({ at: at + 0.01, f: f * 1.5, dur: (dur || 1.6) * 0.5, peak: pk * 0.15, pan });
  };
  const hdCut = (S, at, f, pk, pan) => { S.whoosh({ at, f: f * 0.5, f1: f * 2.6, dur: 0.2, peakAt: 0.8, peak: pk, q: 2.2, pan }); hdRing(S, at + 0.17, f, pk * 0.5, 0.9, pan); };   // a swing and its ring
  const hdGlass = (S, at, f, pk, dur, pan, am) => {     // a glass tone with its fifth over it
    S.glass({ at, f, dur: dur || 1.2, peak: pk, pan, am });
    S.glass({ at: at + 0.03, f: f * 1.5, dur: (dur || 1.2) * 0.8, peak: pk * 0.4, pan });
  };
  const hdChains = (S, at, d, pk, pan) => {             // chains stirring: small bright clinks, thinning out
    const n = Math.max(3, Math.round(d * 18));
    for (let i = 0; i < n; i++) S.noise({ at: at + Math.pow(i / n, 1.3) * d, bp: S.rr(2200, 5200), q: 9, dur: S.rr(0.04, 0.09), a: 0.0006, peak: pk * (1 - (i / n) * 0.6) * S.rr(0.5, 1), pan });
  };
  const hdFrost = (S, at, pk, pan) => {                 // the hard crack of frost: a spike, a low thud under it, shards of glass and a sparkle
    S.crack({ at, f: 2600, peak: pk * 0.9, dur: 0.22, pan });
    S.thud({ at, f: 90, f1: 40, dur: 0.6, drive: 2.2, peak: pk * 0.45, pan });
    [0, 4, 7, 11].forEach((n, i) => S.glass({ at: at + 0.01 + i * 0.025, f: mf(93 + n), dur: 0.5, peak: pk * 0.11, pan }));
    S.sizzle({ at, hp: 5000, dur: 0.55, pts: [[0.02, 1], [0.55, 0]], peak: pk * 0.2, pan });
  };
  const hdWhump = (S, at, pk, pan) => {                 // the percentage landing: no crack, a hollow weight and the warmth going out of the air
    S.thud({ at, f: 56, f1: 28, dur: 1.0, drive: 1.4, peak: pk * 0.7, click: 0.1, pan });
    S.tone({ at, f: mf(62), f1: mf(50), dur: 1.0, pts: [[0.02, 1], [1.0, 0]], peak: pk * 0.18, lp: 900, pan });
    hdSigh(S, at, 0.9, pk * 0.12, 2400, 600, pan);
  };
  const hdToll = (S, at, f, pk, dur, shim) => {         // a deep bell, the chains shivering over it
    S.bell({ at, f, dur: dur || 3.2, peak: pk, lp: 2200 });
    hdChains(S, at + 0.02, shim == null ? 0.8 : shim, pk * 0.35);
    S.thud({ at, f: 58, f1: 34, dur: 0.6, drive: 1.6, peak: pk * 0.3, click: 0 });
  };
  const hdFeather = (S, at, pk, pan, f) => {            // a low feathered wing beat: a soft pressure swell, a rustle of vanes, a dull settle
    S.whoosh({ at, color: 'brown', f: (f || 150), f1: (f || 150) * 2.8, dur: 0.55, peakAt: 0.45, peak: pk, q: 0.7, pan });
    S.noise({ at, color: 'pink', hp: 2500, lp: 7000, grain: 0.7, dur: 0.5, a: 0.1, pts: [[0.2, 1], [0.5, 0]], peak: pk * 0.22, pan });
    S.thud({ at: at + 0.3, f: 58, f1: 32, dur: 0.5, drive: 1.2, peak: pk * 0.55, click: 0, pan });
  };
  const hdDrone = (S, at, d, pk, f, f2) => {            // a held cold pair of tones a fifth apart, slowly beating
    S.tone({ at, f, f1: f2 || f, dur: d, pts: [[d * 0.55, 1], [d, 0]], peak: pk, lp: 1400, am: [0.8, 0.3] });
    S.tone({ at, f: f * 1.5, f1: (f2 || f) * 1.5 * 1.004, dur: d, pts: [[d * 0.6, 1], [d, 0]], peak: pk * 0.5, lp: 1800 });
  };
  const hdStep = (S, at, pk, pan) => { S.noise({ at, color: 'pink', lp: 1300, dur: 0.1, a: 0.004, pts: [[0.01, 1], [0.1, 0]], peak: pk, pan }); S.thud({ at, f: 90, f1: 50, dur: 0.14, peak: pk * 1.2, click: 0, pan }); };   // a footfall in snow

  // gate 1 -------------------------------------------------------------------------------------------------
  def('bm-hood-intro', 'sting', S => {
    S.space('hall', 0.7);
    // a long drawn breath, one deep bell far off with the chains stirring under it, a thin steel ring at the end
    hdBreath(S, 0, 1.4, 0.14, 900, 3200);
    hdToll(S, 0.5, mf(38), 0.2, 3.6, 0.9);
    hdDrone(S, 0.2, 2.6, 0.08, mf(50));
    hdRing(S, 1.7, 1760, 0.1, 2.2);
  });
  def('bm-hood-hollow-step', 'bm', S => {
    S.space('hall', 0.35);
    // a short cast: a breath in, two soft steps in the snow, the blade whispering free, then two quick cuts
    hdBreath(S, 0, 0.6, 0.1, 1400, 4200);
    hdStep(S, 0.2, 0.2); hdStep(S, 0.45, 0.24);
    hdSteel(S, 0.3, 0.45, 0.16);
    hdCut(S, 0.85, 2000, 0.32); hdCut(S, 1.2, 2400, 0.36, 0.2);
  });
  def('bm-hood-cold-breath', 'bm', S => {
    S.space('hall', 0.4);
    // a cone of cold: a long breath drawn in and rising, a stop, then a wide breath out with frost grains flying and glass dust
    hdBreath(S, 0, 1.2, 0.2, 1200, 6200);
    hdSigh(S, 1.35, 0.9, 0.3, 5200, 1600);
    S.sizzle({ at: 1.35, hp: 6000, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.14 });
    S.whoosh({ at: 1.35, f: 600, f1: 2400, dur: 0.5, peakAt: 0.25, peak: 0.2, q: 0.8 });
    [0, 5, 9, 12].forEach((n, i) => S.glass({ at: 1.42 + i * 0.07, f: mf(95 + n), dur: 0.6, peak: 0.04, pan: i % 2 ? 0.4 : -0.4 }));
  });
  def('bm-hood-frostfall', 'bm', S => {
    S.space('hall', 0.45);
    // three crystals whistle down out of the dark, one after another, and land together close: a thin falling tone each, then three frost cracks across the room
    [[-0.6, 3400, 0.0], [0.6, 2900, 0.12], [0, 2500, 0.24]].forEach(([pan, f, d], i) => {
      S.tone({ at: d, f, f1: f * 0.4, dur: 1.5, pts: [[0.4, 1], [1.5, 0]], peak: 0.07, lp: 6000, pan, glide: 1.5 });
      hdFrost(S, 1.6 + i * 0.1, 0.26, pan);
    });
    hdBreath(S, 0, 1.5, 0.06, 3000, 7000);
  });
  def('bm-hood-pale-waltz', 'bm', S => {
    S.space('hall', 0.55);
    // three steps in a slow count: a low footfall, two light ones, a pair of glass notes rising a third, a breath held, and a steel ring on the last count
    hdStep(S, 0.0, 0.3); hdStep(S, 0.5, 0.15, -0.3); hdStep(S, 1.0, 0.15, 0.3);
    hdGlass(S, 0.5, mf(86), 0.07, 1.0, -0.3); hdGlass(S, 1.0, mf(89), 0.07, 1.0, 0.3);
    hdBreath(S, 1.0, 0.5, 0.08, 1800, 4400);
    hdDrone(S, 0, 1.8, 0.06, mf(50));
    hdRing(S, 1.55, 1560, 0.16, 1.4);
  });
  def('bm-hood-severance', 'bm', S => {
    S.space('hall', 0.5);
    // two blades slid out and set on their marks: a long slow draw of steel, a glass ping as each line locks, a rising whine, then two dashes and a cold hit each
    hdSteel(S, 0, 1.6, 0.16, -0.5); hdSteel(S, 0.5, 1.6, 0.16, 0.5);
    hdGlass(S, 1.5, mf(93), 0.07, 0.9, -0.6); hdGlass(S, 2.0, mf(96), 0.07, 0.9, 0.6);
    S.tone({ f: 1100, f1: 3600, dur: 3.5, a: 3.0, pts: [[3.2, 1], [3.5, 0]], peak: 0.05, lp: 5000, am: [7, 0.4] });
    hdBreath(S, 2.6, 0.9, 0.09, 1600, 5000);
    [3.6, 4.2].forEach((at, i) => { S.whoosh({ at: at - 0.2, f: 1800, f1: 7000, dur: 0.2, peakAt: 0.9, peak: 0.32, q: 2.4, pan: i ? 0.5 : -0.5 }); hdRing(S, at, 2100 + i * 220, 0.24, 1.4, i ? 0.5 : -0.5); hdWhump(S, at, 0.3, i ? 0.4 : -0.4); });
  });
  def('bm-hood-echo', 'bm', S => {
    S.space('hall', 0.55);
    // the two cuts again where they stopped: the same ring sounding late and doubled, smeared by a long echo, and a frost crack through the middle
    S.echo({ time: 0.27, fb: 0.5, lp: 3000, kill: 3.2 });
    hdRing(S, 0.3, 2100, 0.2, 1.8, -0.4); hdRing(S, 0.55, 2320, 0.2, 1.8, 0.4);
    S.metal({ at: 0.3, set: 'bar', f: 2100, dur: 1.2, peak: 0.12, ech: 0.8, pan: -0.4 }); S.metal({ at: 0.55, set: 'bar', f: 2320, dur: 1.2, peak: 0.12, ech: 0.8, pan: 0.4 });
    hdBreath(S, 0, 0.5, 0.07, 2400, 6000);
    hdFrost(S, 1.55, 0.5);
    hdSigh(S, 1.6, 1.2, 0.1, 3000, 900);
  });
  def('bm-hood-hollow-procession', 'bm', S => {
    S.space('hall', 0.5);
    // three figures at the edge draw steel one after another, left, right and middle (the middle one a note brighter), a low wind under them, then three dashes
    hdSteel(S, 0, 1.0, 0.13, -0.8); hdSteel(S, 0.5, 1.0, 0.13, 0.8); hdSteel(S, 1.0, 1.0, 0.18, 0);
    S.metal({ at: 2.0, set: 'bar', f: 3300, dur: 1.6, peak: 0.08 });
    hdDrone(S, 0.5, 4.2, 0.05, mf(57), mf(59));
    S.noise({ color: 'pink', bp: 2400, bp1: 3600, q: 3, dur: 4.4, a: 2.0, pts: [[3.8, 1], [4.4, 0]], peak: 0.08, am: [0.9, 0.5] });
    [[4.55, -0.8, 0.14], [4.7, 0.8, 0.14], [4.85, 0, 0.3]].forEach(([at, pan, pk]) => { S.whoosh({ at: at - 0.18, f: 1600, f1: 6400, dur: 0.18, peakAt: 0.9, peak: pk, q: 2.4, pan }); hdRing(S, at, 2000 + (pan === 0 ? 500 : 0), pk * 0.7, 1.2, pan); });
    hdWhump(S, 4.85, 0.3);
  });
  def('bm-hood-shatter', 'bm', S => {
    S.space('hall', 0.5);
    // whoever is frozen shatters: a sheet of ice goes with a long falling run of glass and then a heavy frost crack and a low blow
    S.tone({ f: 5200, f1: 1800, dur: 1.2, pts: [[0.1, 1], [1.2, 0]], peak: 0.05, lp: 7000 });
    for (let i = 0; i < 8; i++) S.glass({ at: 0.9 + i * 0.045, f: mf(105 - i * 2), dur: 0.7, peak: 0.07, pan: (i % 3 - 1) * 0.4 });
    S.crackle({ at: 0.9, dens: 2.6, f: 4800, dur: 0.9, pts: [[0.05, 1], [0.9, 0]], peak: 0.22 });
    hdFrost(S, 1.0, 0.8);
    S.thud({ at: 1.0, f: 60, f1: 30, dur: 1.0, drive: 3, peak: 0.4 });
  });
  def('bm-hood-the-tolling', 'bm', S => {
    S.space('hall', 0.6);
    // a lantern lit over one hero: a bright glass chime climbing three notes, a low bell humming up under it, the chains stirring, and one soft beat of a tolling to come
    [0, 5, 9].forEach((n, i) => hdGlass(S, i * 0.4, mf(88 + n), 0.07, 1.4, 0.3 - i * 0.3));
    S.bell({ at: 0.6, f: mf(50), dur: 3.2, peak: 0.1, lp: 2400, swell: true, a: 0.6 });
    hdChains(S, 0.4, 1.2, 0.08);
    hdDrone(S, 0.2, 3.0, 0.06, mf(50));
  });
  def('bm-hood-last-toll', 'bm', S => {
    S.space('hall', 0.65);
    // the last of the tolling: a huge low bell struck hard with every chain ringing, a frost crack riding the strike and a long hall ring
    hdBreath(S, 0, 1.0, 0.1, 800, 2600);
    hdToll(S, 1.1, mf(34), 0.5, 5.0, 1.6);
    S.bell({ at: 1.12, f: mf(46), dur: 4.0, peak: 0.28, lp: 2600 });
    S.crack({ at: 1.1, f: 2200, peak: 0.45, dur: 0.25 });
    S.thud({ at: 1.1, f: 62, f1: 26, dur: 1.4, drive: 3, peak: 0.55 });
    hdRing(S, 1.15, 880, 0.12, 3.0);
  });
  def('bm-hood-pursuit', 'bm', S => {
    S.space('hall', 0.4);
    // a hunt in the snow: quick footfalls running, a thin tone leaning up with each turn, and three heavy pounces, each a little higher
    for (let k = 0; k < 3; k++) {
      const t0 = k * 2.2, f = 880 * Math.pow(1.122, k);
      for (let i = 0; i < 5; i++) hdStep(S, t0 + 0.3 + i * 0.22, 0.1 + i * 0.03, (k - 1) * 0.3);
      S.tone({ at: t0, f: f, f1: f * 1.5, dur: 1.4, a: 1.0, pts: [[1.2, 1], [1.4, 0]], peak: 0.05, lp: 4000 });
      S.whoosh({ at: t0 + 1.0, f: 300, f1: 2400, dur: 0.4, peakAt: 0.95, peak: 0.2, q: 1.2 });
      S.thud({ at: t0 + 1.4, f: 76 - k * 6, f1: 34, dur: 0.6, drive: 2.2, peak: 0.55 }); S.crack({ at: t0 + 1.4, f: 2000, peak: 0.16, dur: 0.15 });
    }
  });
  def('bm-hood-rimelight', 'bm', S => {
    S.space('hall', 0.55);
    // a beam of cold light: two glass tones a hair apart swelling and beating, a narrow bright sweep of air through them, sparks of frost, and a pulse
    S.tone({ f: mf(89), f1: mf(89) * 1.002, dur: 3.2, a: 2.6, pts: [[2.8, 1], [3.2, 0]], peak: 0.07, lp: 6000 });
    S.tone({ f: mf(89) * 1.012, dur: 3.2, a: 2.6, pts: [[2.8, 1], [3.2, 0]], peak: 0.07, lp: 6000 });
    S.noise({ bp: 1400, bp1: 6400, q: 8, dur: 3.2, a: 2.6, pts: [[2.9, 1], [3.2, 0]], peak: 0.14 });
    for (let i = 0; i < 6; i++) S.glass({ at: 1.2 + i * 0.28, f: mf(100 + (i * 5) % 9), dur: 0.5, peak: 0.035, pan: Math.sin(i * 2.1) * 0.7 });
    S.thud({ at: 3.0, f: 70, f1: 34, dur: 0.7, drive: 1.6, peak: 0.4, click: 0.1 });
  });
  def('bm-hood-rimeburst', 'bm', S => {
    S.space('hall', 0.6);
    // the beam goes off over the whole room: a flash of high glass cascading down, a broad crack, a deep blow, frost dust falling after
    for (let i = 0; i < 9; i++) S.glass({ at: 0.05 + i * 0.05, f: mf(108 - i * 3), dur: 0.9, peak: 0.07, pan: (i % 2 ? 1 : -1) * 0.4 });
    S.noise({ hp: 3000, dur: 0.5, a: 0.002, pts: [[0.02, 1], [0.5, 0]], peak: 0.3, drive: 1.5 });
    hdFrost(S, 0.05, 0.9);
    S.thud({ at: 0.05, f: 52, f1: 26, dur: 1.2, drive: 3.2, peak: 0.55 });
    S.sizzle({ at: 0.2, hp: 4500, dur: 1.8, pts: [[0.1, 1], [1.8, 0]], peak: 0.1 });
    hdRing(S, 0.08, 1320, 0.14, 2.4);
  });
  def('bm-hood-hollowing', 'bm', S => {
    S.space('hall', 0.5);
    // the hush: the room's sound is drawn in and thinned out of it, a falling pitch and a breath held to the end, then the hollow weight on everyone
    hdBreath(S, 0, 2.6, 0.2, 700, 4800);
    S.tone({ f: mf(74), f1: mf(50), dur: 2.7, pts: [[2.4, 1], [2.7, 0]], peak: 0.07, lp: 2400 });
    S.noise({ color: 'brown', lp: 500, lp1: 90, dur: 2.7, a: 2.0, pts: [[2.4, 1], [2.7, 0]], peak: 0.2 });
    hdWhump(S, 2.95, 0.8);
  });
  def('bm-hood-hollow-echo', 'bm', S => {
    S.space('cave', 0.6);
    // the hollowing again, hard: a deep boom with a hollow stone resonance ringing in it, an echo of the boom, the frost crack
    S.echo({ time: 0.34, fb: 0.45, lp: 1400, kill: 3.2 });
    S.thud({ at: 0.8, f: 50, f1: 22, dur: 1.8, drive: 3.4, peak: 0.9, ech: 0.6 });
    S.partials({ at: 0.8, set: 'stone', f: 96, dur: 2.4, peak: 0.2, ech: 0.5 });
    hdBreath(S, 0, 0.8, 0.1, 600, 2000);
    hdFrost(S, 0.8, 0.6);
    hdSigh(S, 0.9, 1.6, 0.08, 1800, 400);
  });
  def('bm-hood-the-scales', 'bm', S => {
    S.space('hall', 0.55);
    // a pair of scales hung in the dark: chains creaking to a rest, a glass tone on the left and a lower steel one on the right, passing between the ears as the beam tilts, a clack when they settle
    hdChains(S, 0, 1.6, 0.14, -0.4);
    S.tone({ f: mf(81), dur: 3.8, a: 0.4, pts: [[0.4, 1], [3.4, 0.6], [3.8, 0]], peak: 0.07, lp: 4000, am: [1.4, 0.8] , pan: -0.6 });
    S.tone({ f: mf(77), dur: 3.8, a: 0.4, pts: [[0.4, 1], [3.4, 0.6], [3.8, 0]], peak: 0.07, lp: 4000, am: [1.4, 0.8], pan: 0.6 });
    S.noise({ bp: 1300, bp1: 2600, q: 5, dur: 3.5, a: 0.4, pts: [[0.6, 1], [3.5, 0]], peak: 0.07, am: [1.4, 0.7], grain: 0.5 });
    hdRing(S, 1.6, 1480, 0.18, 1.6, -0.5); hdRing(S, 2.0, 1240, 0.18, 1.6, 0.5);
    S.thud({ at: 3.55, f: 80, f1: 44, dur: 0.4, peak: 0.3, click: 0.3 });
  });
  def('bm-hood-weighing', 'bm', S => {
    S.space('hall', 0.6);
    // the scales drop their weight on everyone: a chain running out, a heavy iron bell struck and its clatter, the frost crack
    hdChains(S, 0, 1.0, 0.2);
    S.noise({ bp: 900, bp1: 200, q: 3, dur: 1.0, a: 0.8, pts: [[0.9, 1], [1.0, 0.4]], peak: 0.2 });
    S.metal({ at: 1.1, set: 'plate', f: 520, dur: 2.4, peak: 0.4, strike: 0.7 });
    S.bell({ at: 1.1, f: mf(48), dur: 3.0, peak: 0.2, lp: 2400 });
    hdChains(S, 1.12, 0.9, 0.25);
    hdFrost(S, 1.1, 0.7);
  });
  def('bm-hood-dead-calm', 'bm', S => {
    S.space('hall', 0.5);
    // everything goes still: a single held glass tone thinning away while the room's low air drops out from under it, a faint pulse of a pulse, a tiny snap of ice for whoever moved
    S.glass({ f: mf(91), dur: 4.4, peak: 0.12, am: [5, 0.25] });
    S.tone({ f: mf(91), f1: mf(91) * 0.995, dur: 4.4, a: 0.2, pts: [[0.3, 1], [2.6, 0.4], [4.4, 0]], peak: 0.06, lp: 3000, vib: [0.8, 0.003] });
    S.noise({ color: 'brown', lp: 300, lp1: 70, dur: 3.2, a: 0.1, pts: [[0.1, 1], [3.2, 0]], peak: 0.2 });
    for (let i = 0; i < 4; i++) S.thud({ at: 0.5 + i * 0.95, f: 50, f1: 36, dur: 0.3, peak: 0.12 * (1 - i * 0.22), click: 0 });
    S.glass({ at: 4.45, f: mf(100), dur: 0.5, peak: 0.07 }); S.crack({ at: 4.5, f: 4200, peak: 0.1, dur: 0.1 });
  });
  def('bm-hood-calm-breaks', 'bm', S => {
    S.space('hall', 0.55);
    // the stillness gives way under one hero: a long crack runs across ice, a second and a third branching off it, then the fixed blow
    for (let i = 0; i < 4; i++) { S.crack({ at: i * 0.17, f: 3000 + i * 500, peak: 0.12 + i * 0.07, dur: 0.1 }); S.glass({ at: i * 0.17, f: mf(100 + i * 2), dur: 0.5, peak: 0.04, pan: (i % 2 ? 0.3 : -0.3) }); }
    S.tone({ f: 2400, f1: 600, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.06, lp: 4000 });
    hdFrost(S, 0.85, 0.85);
    S.thud({ at: 0.85, f: 58, f1: 30, dur: 1.0, drive: 3, peak: 0.4 });
  });
  def('bm-hood-interment', 'bm', S => {
    S.space('hall', 0.5);
    // ice grows round a hero: a crystalline sizzle rising, creaks, the lid thudding home on its seam, a chain pulled tight, and a hollow weight
    S.sizzle({ hp: 4000, dur: 2.2, a: 1.6, pts: [[1.8, 1], [2.2, 0]], peak: 0.14 });
    S.creak({ at: 0.2, f: 24, f1: 50, res: [500, 1100, 2200], q: 12, dur: 1.8, peak: 0.14 });
    for (let i = 0; i < 6; i++) S.glass({ at: 0.3 + i * 0.28, f: mf(98 + (i * 3) % 8), dur: 0.5, peak: 0.04, pan: Math.sin(i * 1.7) * 0.5 });
    S.thud({ at: 2.2, f: 64, f1: 32, dur: 0.8, drive: 2.8, peak: 0.5 });
    S.metal({ at: 2.2, set: 'plate', f: 300, dur: 1.2, peak: 0.25, strike: 0.8 });
    hdChains(S, 2.25, 0.5, 0.2);
    hdWhump(S, 2.4, 0.4);
  });
  def('bm-hood-burial', 'bm', S => {
    S.space('cave', 0.5);
    // a long cast to break the ice before it settles: slow grinding under a rising low drone, a crack ticking louder every second, and the heavy settle if it holds
    S.noise({ color: 'brown', lp: 140, lp1: 360, dur: 8.0, a: 6, pts: [[7.6, 1], [8.0, 0.6]], peak: 0.2, am: [0.6, 0.4] });
    S.creak({ at: 0.4, f: 20, f1: 36, res: [350, 800, 1700], q: 10, dur: 7.4, pts: [[5, 0.5], [7.4, 1]], peak: 0.1 });
    S.tone({ f: mf(38), f1: mf(40), dur: 8.0, a: 6, pts: [[7.6, 1], [8.0, 0.5]], peak: 0.13, lp: 600, am: [3, 0.3] });
    for (let i = 0; i < 7; i++) { S.crack({ at: 1.0 + i * 1.0, f: 2600, peak: 0.04 + i * 0.015, dur: 0.1 }); S.glass({ at: 1.0 + i * 1.0, f: mf(96), dur: 0.5, peak: 0.02 + i * 0.01 }); }
    S.thud({ at: 8.0, f: 46, f1: 22, dur: 1.5, drive: 3, peak: 0.8 });
    hdFrost(S, 8.0, 0.45);
  });
  def('bm-hood-two-hands', 'bm', S => {
    S.space('hall', 0.5);
    // both hands raised at once: steel drawn on the left, a soft glass tone opening on the right, the two joined in one chord and a held breath
    hdSteel(S, 0.1, 0.8, 0.2, -0.7);
    hdGlass(S, 0.3, mf(86), 0.1, 2.0, 0.7);
    S.glass({ at: 0.9, f: mf(93), dur: 1.8, peak: 0.07, pan: 0 });
    S.choir({ at: 0.4, notes: [mf(50), mf(57), mf(65)], vowel: 'u', vowel1: 'o', dur: 1.8, a: 1.0, lp: 1400, peak: 0.07 });
    hdBreath(S, 0, 0.9, 0.08, 1200, 4000);
    hdRing(S, 0.95, 1860, 0.16, 1.6, -0.5);
  });
  def('bm-hood-communion', 'bm', S => {
    S.space('hall', 0.65);
    // a cold ring of light closing round the healer: a soft choir of cold vowels swelling, glass tones stepping up, a bell and a gathering of the chains, then one deep soft strike to stand in
    S.choir({ notes: [mf(50), mf(57), mf(62), mf(65)], vowel: 'o', vowel1: 'a', dur: 5.4, a: 3.4, lp: 1800, pts: [[4.8, 1], [5.4, 0]], peak: 0.1 });
    [0, 3, 7, 10].forEach((n, i) => hdGlass(S, 0.8 + i * 1.0, mf(81 + n), 0.05, 1.8, Math.sin(i * 1.3) * 0.5));
    hdChains(S, 3.5, 1.6, 0.1);
    S.bell({ at: 5.35, f: mf(45), dur: 3.0, peak: 0.28, lp: 2000 });
    S.thud({ at: 5.35, f: 56, f1: 26, dur: 1.2, drive: 2.4, peak: 0.7 });
    hdWhump(S, 5.5, 0.3);
  });
  def('bm-hood-verdict', 'bm', S => {
    S.space('hall', 0.7);
    // a heavy raidwide: both hands, a choir cluster rising to a held breath, the bell struck under a hard frost crack, a long cold ring
    hdSteel(S, 0, 1.0, 0.14, -0.5); hdGlass(S, 0.2, mf(86), 0.08, 2.0, 0.5);
    S.choir({ notes: [mf(38), mf(45), mf(50), mf(53), mf(57)], vowel: 'a', vowel1: 'o', dur: 2.6, a: 1.8, lp: 2200, pts: [[2.3, 1], [2.6, 0]], peak: 0.12 });
    hdBreath(S, 1.0, 1.6, 0.12, 900, 4400);
    hdToll(S, 2.7, mf(36), 0.5, 4.6, 1.4);
    hdFrost(S, 2.7, 0.8);
    hdRing(S, 2.75, 1100, 0.16, 3.0);
  });
  def('bm-hood-verdict-eternal', 'bm', S => {
    S.space('cave', 0.8);
    // the enrage: a slow bell tolled three times each lower and harder, a choir cluster held unresolved over a drone, breath, and a last crack that does not ring
    [[0.0, 45, 0.3], [1.9, 41, 0.38], [3.8, 36, 0.52]].forEach(([at, n, pk], i) => { hdToll(S, at, mf(n), pk, 4.2, 1.0 + i * 0.3); S.crack({ at, f: 2200, peak: 0.1 + i * 0.14, dur: 0.18 }); });
    S.choir({ at: 0.5, notes: [mf(38), mf(39), mf(45), mf(50), mf(56)], vowel: 'a', vowel1: 'u', dur: 6.0, a: 3.0, lp: 1800, pts: [[4.6, 1], [6.0, 0]], peak: 0.1 });
    hdDrone(S, 0, 6.0, 0.1, mf(26), mf(25));
    hdBreath(S, 2.6, 1.1, 0.12, 700, 3600);
    S.thud({ at: 3.8, f: 40, f1: 18, dur: 2.2, drive: 3.4, peak: 0.95 });
  });

  // gate 2 -------------------------------------------------------------------------------------------------
  def('bm-seraph-intro', 'sting', S => {
    S.space('hall', 0.75);
    // frost splitting upward and falling away: a long rising crack and shard-fall, a wide low unfolding of feathered beats, one high bright note cracking in two
    S.creak({ f: 20, f1: 60, res: [600, 1500, 3200], q: 12, dur: 1.4, peak: 0.1 });
    for (let i = 0; i < 6; i++) S.glass({ at: 0.3 + i * 0.12, f: mf(104 - i * 2), dur: 0.8, peak: 0.04, pan: Math.sin(i * 1.9) * 0.6 });
    hdFeather(S, 1.0, 0.3, -0.4, 120); hdFeather(S, 1.55, 0.35, 0.4, 110);
    hdGlass(S, 1.9, mf(93), 0.14, 2.8); S.glass({ at: 1.95, f: mf(93) * 1.03, dur: 2.4, peak: 0.08 });
    hdToll(S, 1.0, mf(38), 0.14, 3.4, 0.7);
  });
  def('bm-seraph-wingbeat', 'bm', S => {
    S.space('hall', 0.4);
    // a cast to hold your ground: two slow feathered beats gathering air, then one huge down-stroke that pushes the whole room out, the dull settle of the throw's end
    hdFeather(S, 0.0, 0.3, -0.5, 120); hdFeather(S, 0.55, 0.4, 0.5, 110);
    S.noise({ color: 'pink', bp: 200, bp1: 1400, q: 0.6, dur: 0.9, a: 0.8, pts: [[0.8, 1], [0.9, 0.6]], peak: 0.3 });
    hdFeather(S, 1.35, 0.7, 0, 90);
    S.thud({ at: 1.6, f: 52, f1: 24, dur: 1.2, drive: 2.6, peak: 0.7 });
    S.noise({ at: 1.6, color: 'brown', lp: 800, lp1: 120, dur: 1.2, a: 0.02, pts: [[0.05, 1], [1.2, 0]], peak: 0.3 });
    hdSigh(S, 1.7, 0.9, 0.08, 3000, 700);
  });
  def('bm-seraph-broken-halo', 'bm', S => {
    S.space('hall', 0.6);
    // a ring of high glass struck and cracking, a long rising ring-tone going out of tune, a shard torn off with a tearing hiss and flung, landing as a low frost thud
    hdGlass(S, 0, mf(96), 0.14, 2.0); S.glass({ at: 0.02, f: mf(96) * 1.014, dur: 1.8, peak: 0.1 });
    S.tone({ f: mf(96), f1: mf(96) * 1.12, dur: 1.2, a: 0.2, pts: [[0.3, 1], [1.2, 0]], peak: 0.04, lp: 7000 });
    S.crack({ at: 1.0, f: 4200, peak: 0.28, dur: 0.15 });
    S.noise({ at: 1.0, hp: 4000, dur: 0.4, a: 0.02, pts: [[0.05, 1], [0.4, 0]], peak: 0.18 });
    S.whoosh({ at: 1.2, f: 5200, f1: 1200, dur: 0.7, peakAt: 0.2, peak: 0.22, q: 2.4 });
    [0, 4, 7].forEach((n, i) => S.glass({ at: 1.1 + i * 0.05, f: mf(100 + n), dur: 0.6, peak: 0.05 }));
  });
  def('bm-seraph-returning-edge', 'bm', S => {
    S.space('hall', 0.45);
    // a blade thrown at a hero: a draw of steel, a spinning whine climbing (fast tremble), a hard thunk as it buries in the wall and a hum of the buried steel
    hdSteel(S, 0, 0.7, 0.16);
    S.tone({ f: 900, f1: 3200, dur: 1.3, a: 0.2, pts: [[1.2, 1], [1.3, 0.4]], peak: 0.08, lp: 5000, am: [28, 0.8] });
    S.whoosh({ at: 0.6, f: 800, f1: 5200, dur: 0.7, peakAt: 0.9, peak: 0.26, q: 2.2, pan: 0 });
    S.thud({ at: 1.4, f: 110, f1: 48, dur: 0.25, peak: 0.7, click: 0.9, clickF: 3000 });
    S.metal({ at: 1.4, set: 'bar', f: 740, dur: 1.8, peak: 0.2, strike: 0.5, click: 0 });
    S.tone({ at: 1.4, f: 740, dur: 1.6, a: 0.01, pts: [[0.02, 1], [1.6, 0]], peak: 0.05, am: [14, 0.7], lp: 2000 });
  });
  def('bm-seraph-return', 'bm', S => {
    S.space('hall', 0.55);
    // the blade comes back along a long curve: a whistle sweeping across the room from one ear to the other and falling in pitch as it passes, a chain of stamped hits along its path, a hard crack at the end
    S.tone({ f: 4200, f1: 900, dur: 1.5, a: 0.1, pts: [[0.2, 1], [1.4, 0.7], [1.5, 0]], peak: 0.07, lp: 6000, am: [26, 0.7], pan: -0.8 });
    S.whoosh({ f: 3200, f1: 500, dur: 1.5, peakAt: 0.1, peak: 0.3, q: 2, pan: -0.7 });
    for (let i = 0; i < 6; i++) { hdStep(S, 0.2 + i * 0.2, 0.18 + i * 0.03, -0.8 + i * 0.3); S.glass({ at: 0.2 + i * 0.2, f: mf(90 + i), dur: 0.4, peak: 0.04, pan: -0.8 + i * 0.3 }); }
    hdFrost(S, 1.6, 0.8, 0.3);
    hdRing(S, 1.62, 1580, 0.2, 2.0);
  });
  def('bm-seraph-radiance', 'bm', S => {
    S.space('hall', 0.65);
    // a bright light gathering over a hero, gold and cold: a swell of glass tones with a slow beat, a high choir of vowels rising, and six rays opening one after another round the room
    S.tone({ f: mf(93), dur: 3.2, a: 2.6, pts: [[2.8, 1], [3.2, 0]], peak: 0.07, lp: 6000 });
    S.tone({ f: mf(93) * 1.01, dur: 3.2, a: 2.6, pts: [[2.8, 1], [3.2, 0]], peak: 0.07, lp: 6000 });
    S.choir({ notes: [mf(69), mf(76), mf(81)], vowel: 'a', vowel1: 'i', dur: 3.2, a: 2.4, lp: 3200, pts: [[2.8, 1], [3.2, 0]], peak: 0.07 });
    for (let i = 0; i < 6; i++) S.glass({ at: 1.5 + i * 0.28, f: mf(86 + [0, 2, 4, 7, 9, 12][i]), dur: 1.0, peak: 0.07, pan: -0.8 + i * 0.32 });
    S.whoosh({ at: 2.7, f: 1000, f1: 6400, dur: 0.5, peakAt: 0.9, peak: 0.22, q: 1.6 });
  });
  def('bm-seraph-afterglow', 'bm', S => {
    S.space('hall', 0.6);
    // the light collapses on its target: a long falling run of glass into a sharp bright crack, a deep thud and a thin ring-down
    for (let i = 0; i < 7; i++) S.glass({ at: i * 0.1, f: mf(108 - i * 3), dur: 0.7, peak: 0.07 - i * 0.004, pan: Math.sin(i * 2.2) * 0.4 });
    S.tone({ f: 6000, f1: 1500, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.07, lp: 8000 });
    hdFrost(S, 0.8, 0.8);
    S.thud({ at: 0.8, f: 58, f1: 26, dur: 1.4, drive: 3, peak: 0.65 });
    hdRing(S, 0.82, 1760, 0.12, 2.0);
  });
  def('bm-seraph-wingfall', 'bm', S => {
    S.space('hall', 0.5);
    // a hovering descent: feathered beats rising off the floor and holding, then three dives from the edge, each a falling whistle and a hollow blow, spaced as the dives are
    hdFeather(S, 0, 0.3, -0.4, 120); hdFeather(S, 0.5, 0.34, 0.4, 130); hdFeather(S, 1.0, 0.36, -0.3, 140);
    hdDrone(S, 0.3, 5.4, 0.05, mf(45), mf(43));
    [[1.8, -0.6], [3.8, 0.6], [5.8, 0]].forEach(([at, pan], i) => {
      S.tone({ at: at - 0.5, f: 3600, f1: 700, dur: 0.6, a: 0.05, pts: [[0.1, 1], [0.6, 0]], peak: 0.06, lp: 5000, pan });
      S.whoosh({ at: at - 0.5, f: 4200, f1: 600, dur: 0.55, peakAt: 0.1, peak: 0.28, q: 1.8, pan });
      hdWhump(S, at, 0.38 + i * 0.05, pan); hdRing(S, at, 1500 + i * 120, 0.12, 1.2, pan);
    });
  });
  def('bm-seraph-ash-landing', 'bm', S => {
    S.space('cave', 0.55);
    // the last dive lands: a vast low thud, a puff of ash (dark soft noise rushing outward), a rattle of falling feathers, the frost crack and a ring of cold glass round the place
    S.thud({ at: 0.0, f: 46, f1: 20, dur: 2.0, drive: 3.4, peak: 0.95 });
    S.noise({ color: 'brown', lp: 900, lp1: 140, dur: 1.8, a: 0.03, pts: [[0.08, 1], [1.8, 0]], peak: 0.4 });
    S.noise({ at: 0.05, color: 'pink', hp: 2400, lp: 7000, grain: 0.8, dur: 1.6, a: 0.1, pts: [[0.3, 1], [1.6, 0]], peak: 0.15 });
    hdFrost(S, 0.0, 0.7);
    [0, 3, 7, 10, 12].forEach((n, i) => S.glass({ at: 0.15 + i * 0.1, f: mf(88 + n), dur: 1.2, peak: 0.05, pan: Math.sin(i * 2.4) * 0.8 }));
    hdFeather(S, 0.7, 0.18, 0, 160);
  });
  def('bm-seraph-following-light', 'bm', S => {
    S.space('hall', 0.6);
    // a slow cold light that follows one hero for a long while: a soft hum leaning toward them, a drop of glass left behind every beat where frost is laid, and a swell and flare at the end
    S.tone({ f: mf(74), f1: mf(79), dur: 8.4, a: 1.0, pts: [[1.2, 0.6], [7.4, 0.8], [8.4, 0]], peak: 0.09, lp: 2400, am: [1.6, 0.5], pan: -0.3 });
    S.tone({ f: mf(81), f1: mf(86), dur: 8.4, a: 1.0, pts: [[1.2, 0.4], [7.4, 0.6], [8.4, 0]], peak: 0.05, lp: 3200, pan: 0.3 });
    for (let i = 0; i < 13; i++) { const at = 0.6 + i * 0.6; S.glass({ at, f: mf(96 - (i % 4) * 2), dur: 0.7, peak: 0.04, pan: Math.sin(i * 1.7) * 0.6 }); S.noise({ at, hp: 5000, dur: 0.25, a: 0.002, pts: [[0.01, 1], [0.25, 0]], peak: 0.04, grain: 0.8 }); }
    hdBreath(S, 7.2, 1.1, 0.1, 1500, 5000);
    hdWhump(S, 8.4, 0.5);
  });
  def('bm-seraph-benediction', 'bm', S => {
    S.space('hall', 0.7);
    // a column of light over the healer and a long cold blessing: choir vowels opening upward over a gently rising glass fifth, then a drawn breath that stops short and the hollow weight on all in sight
    S.choir({ notes: [mf(50), mf(57), mf(62), mf(69)], vowel: 'o', vowel1: 'a', dur: 3.8, a: 2.4, lp: 2400, pts: [[3.4, 1], [3.8, 0]], peak: 0.1 });
    [0, 7, 12].forEach((n, i) => hdGlass(S, 0.6 + i * 0.9, mf(81 + n), 0.06, 1.6, (i - 1) * 0.4));
    S.bell({ at: 0.3, f: mf(62), dur: 3.2, peak: 0.06, lp: 2200 });
    hdBreath(S, 2.4, 1.5, 0.13, 800, 4200);
    hdWhump(S, 4.05, 0.7);
  });
  def('bm-seraph-absolution', 'bm', S => {
    S.space('hall', 0.65);
    // a bright raidwide: the choir cut short on a downward slip, a bright bell struck by a hard frost crack, a glass cascade and a boom under all of it
    S.choir({ notes: [mf(50), mf(57), mf(62)], vowel: 'a', vowel1: 'u', dur: 1.0, a: 0.4, lp: 2200, bend: -3, pts: [[0.8, 1], [1.0, 0]], peak: 0.09 });
    hdToll(S, 1.1, mf(50), 0.4, 3.4, 1.0);
    hdFrost(S, 1.1, 0.85);
    for (let i = 0; i < 6; i++) S.glass({ at: 1.15 + i * 0.05, f: mf(102 - i * 3), dur: 0.8, peak: 0.05, pan: Math.sin(i * 2.3) * 0.5 });
    S.thud({ at: 1.1, f: 50, f1: 22, dur: 1.6, drive: 3.2, peak: 0.85 });
  });
  def('bm-seraph-last-rites', 'bm', S => {
    S.space('hall', 0.6);
    // two heroes sealed in ice at once and one blade for the third: two slow bell strokes a fifth apart as the lids close left and right, ice sizzle on each, then steel slipped out, set and sent
    hdToll(S, 0.2, mf(43), 0.22, 3.4, 0.6); S.thud({ at: 0.2, f: 60, f1: 28, dur: 0.9, drive: 2.6, peak: 0.6, pan: -0.5 });
    hdToll(S, 1.0, mf(50), 0.22, 3.4, 0.6); S.thud({ at: 1.0, f: 64, f1: 30, dur: 0.9, drive: 2.6, peak: 0.6, pan: 0.5 });
    S.sizzle({ at: 0.2, hp: 4200, dur: 1.2, pts: [[0.05, 1], [1.2, 0]], peak: 0.1, pan: -0.5 }); S.sizzle({ at: 1.0, hp: 4200, dur: 1.2, pts: [[0.05, 1], [1.2, 0]], peak: 0.1, pan: 0.5 });
    hdSteel(S, 1.9, 0.9, 0.15, 0.2);
    S.tone({ at: 2.0, f: 1200, f1: 3000, dur: 3.0, a: 2.6, pts: [[2.8, 1], [3.0, 0]], peak: 0.04, lp: 5000, am: [8, 0.4] });
    hdCut(S, 4.85, 2200, 0.3, 0.2); hdWhump(S, 5.0, 0.3);
  });
  def('bm-seraph-cold-sermon', 'bm', S => {
    S.space('cave', 0.7);
    // a cold low voice speaking without words down the length of the room, glass tones answering from pillars one by one, a drawn breath, then frost laid in rows with a soft weight
    S.voice({ at: 0.2, f: 92, f1: 78, dur: 2.0, vowel: 'o', vowel1: 'u', breath: 4, lp: 1400, peak: 0.16, a: 0.5 });
    S.voice({ at: 1.2, f: 84, f1: 70, dur: 1.8, vowel: 'u', vowel1: 'o', breath: 4, lp: 1200, peak: 0.12, a: 0.4 });
    for (let i = 0; i < 5; i++) hdGlass(S, 0.5 + i * 0.4, mf(86 + [0, 3, 5, 7, 10][i]), 0.05, 1.2, -0.8 + i * 0.4);
    hdBreath(S, 2.2, 0.9, 0.1, 900, 3800);
    hdWhump(S, 3.1, 0.6);
    S.sizzle({ at: 3.1, hp: 5000, dur: 0.7, pts: [[0.05, 1], [0.7, 0]], peak: 0.1 });
  });
  def('bm-seraph-frost-shadow', 'bm', S => {
    S.space('hall', 0.55);
    // the sermon's shadows run down the rows again: a dark falling sweep of air, a low drone leaning down, then a line of hard frost cracks running outward and a deep blow
    S.noise({ color: 'brown', bp: 1200, bp1: 160, q: 1.2, dur: 1.4, a: 1.0, pts: [[1.2, 1], [1.4, 0.3]], peak: 0.3 });
    S.tone({ f: mf(62), f1: mf(45), dur: 1.5, pts: [[1.2, 1], [1.5, 0]], peak: 0.06, lp: 1600 });
    for (let i = 0; i < 5; i++) S.crack({ at: 1.4 + i * 0.06, f: 2400 + i * 400, peak: 0.28 - i * 0.03, dur: 0.14, pan: -0.8 + i * 0.4 });
    hdFrost(S, 1.4, 0.7);
    S.thud({ at: 1.4, f: 46, f1: 20, dur: 1.6, drive: 3.2, peak: 0.85 });
  });
  def('bm-seraph-six-wings', 'bm', S => {
    S.space('hall', 0.5);
    // one beat of six: a quick breath, a low feathered beat opening to the side, and a single glass note, a different one each time
    const n = S.vi(6);
    hdBreath(S, 0, 0.3, 0.08, 1500, 4800);
    hdFeather(S, 0.2, 0.34, (n % 2 ? 0.45 : -0.45), 110 + n * 8);
    hdGlass(S, 0.9, mf(81 + [0, 2, 3, 7, 9, 12][n]), 0.09, 1.0, (n % 2 ? 0.3 : -0.3));
    hdRing(S, 1.3, 1500 + n * 90, 0.1, 0.9);
  });
  def('bm-seraph-the-unsaid', 'bm', S => {
    S.space('cave', 0.85);
    // the last stroke: every wing beating at once under a cluster of choir, a bell toll that does not stop, glass bursting upward, a crack that opens the hall and a boom that holds
    for (let i = 0; i < 4; i++) hdFeather(S, i * 0.45, 0.3 + i * 0.08, (i % 2 ? 0.5 : -0.5), 120 - i * 10);
    S.choir({ notes: [mf(38), mf(45), mf(50), mf(57), mf(62), mf(69)], vowel: 'a', vowel1: 'o', dur: 4.2, a: 2.4, lp: 2600, pts: [[3.6, 1], [4.2, 0]], peak: 0.12 });
    hdBreath(S, 1.2, 1.5, 0.12, 800, 5200);
    hdToll(S, 2.0, mf(33), 0.55, 6.0, 1.8);
    S.bell({ at: 2.02, f: mf(45), dur: 5.0, peak: 0.28, lp: 2600 });
    for (let i = 0; i < 10; i++) S.glass({ at: 2.05 + i * 0.05, f: mf(92 + i * 2), dur: 1.2, peak: 0.05, pan: Math.sin(i * 2) * 0.6 });
    hdFrost(S, 2.0, 0.95);
    S.thud({ at: 2.0, f: 40, f1: 18, dur: 2.6, drive: 3.6, peak: 1.0 });
  });

  // events -----------------------------------------------------------------------------------------------------
  def('hd-blade-out', 'hud', S => {
    // the blade hand coming up: steel whispering free, a thread of ring
    hdSteel(S, 0, 0.45, 0.25);
    S.metal({ at: 0.35, set: 'bar', f: 3100, dur: 0.9, peak: 0.07, strike: 0.2, click: 0 });
  });
  def('hd-palm-open', 'hud', S => {
    S.space('hall', 0.4);
    // the light hand opening: a soft breath out and a warm-cold glass tone blooming in a fifth
    hdSigh(S, 0, 0.5, 0.08, 2600, 1200);
    S.glass({ at: 0.08, f: mf(86), dur: 1.4, peak: 0.16 }); S.glass({ at: 0.2, f: mf(93), dur: 1.2, peak: 0.08 });
    S.tone({ at: 0.08, f: mf(74), dur: 1.0, a: 0.4, pts: [[0.4, 1], [1.0, 0]], peak: 0.04, lp: 2400 });
  });
  def('hd-freeze', 'hud', S => {
    // a shell of frost closing round a hero: a quick crystalline sizzle and a falling thin tone, a small crack at the seal
    S.sizzle({ hp: 5000, dur: 0.5, a: 0.04, pts: [[0.1, 1], [0.5, 0]], peak: 0.14 });
    S.tone({ f: 4200, f1: 1600, dur: 0.4, pts: [[0.04, 1], [0.4, 0]], peak: 0.05, lp: 6000 });
    S.crack({ at: 0.32, f: 3500, peak: 0.2, dur: 0.1 });
    S.glass({ at: 0.33, f: mf(98), dur: 0.5, peak: 0.07 });
    S.thud({ at: 0.32, f: 96, f1: 54, dur: 0.18, peak: 0.25, click: 0 });
  });
  def('hd-thaw', 'hud', S => {
    // the shell going: a soft cracking and slipping, a few drops of glass, and a breath out
    for (let i = 0; i < 4; i++) S.crack({ at: i * 0.07, f: 2400, peak: 0.07, dur: 0.07, pan: (i % 2 ? 0.2 : -0.2) });
    for (let i = 0; i < 4; i++) S.glass({ at: 0.1 + i * 0.09, f: mf(92 - i * 3), dur: 0.5, peak: 0.05 });
    hdSigh(S, 0.15, 0.5, 0.05, 2600, 900);
  });
  def('hd-bell', 'bm', S => {
    S.space('hall', 0.55);
    // one toll: a deep bell with four chains shivering over it
    hdToll(S, 0, mf(45), 0.5, 3.6, 1.4);
    hdChains(S, 0.06, 1.3, 0.18, 0.2);
    S.noise({ bp: 3000, bp1: 1800, q: 4, dur: 1.4, a: 0.01, pts: [[0.02, 1], [1.4, 0]], peak: 0.08, grain: 0.7 });
    S.bell({ at: 0.01, f: mf(50), dur: 2.4, peak: 0.1, lp: 2400 });
  });
  def('hd-shard', 'bm', S => {
    S.space('hall', 0.5);
    // a shard torn from the ring and thrown: a hiss, a bright tearing crack, a whistle that falls away across the room
    S.crack({ f: 4400, peak: 0.3, dur: 0.14 });
    S.noise({ hp: 4500, dur: 0.3, a: 0.01, pts: [[0.03, 1], [0.3, 0]], peak: 0.15 });
    S.tone({ at: 0.05, f: 5000, f1: 1200, dur: 0.8, pts: [[0.1, 1], [0.8, 0]], peak: 0.06, lp: 6000 });
    S.whoosh({ at: 0.05, f: 4200, f1: 800, dur: 0.7, peakAt: 0.15, peak: 0.22, q: 2.2 });
    S.glass({ at: 0.03, f: mf(100), dur: 0.7, peak: 0.07 });
  });
  def('hd-pillar', 'bm', S => {
    S.space('hall', 0.5);
    // the shard standing up out of the floor: a heavy thud, ice growing with a creak and a rising sizzle, a bright top note and a settling ring
    S.thud({ f: 62, f1: 28, dur: 0.9, drive: 2.6, peak: 0.8 });
    S.crack({ f: 2200, peak: 0.3, dur: 0.2 });
    S.creak({ at: 0.02, f: 20, f1: 46, res: [500, 1200, 2600], q: 12, dur: 0.7, peak: 0.12 });
    S.sizzle({ at: 0.05, hp: 4500, dur: 0.8, pts: [[0.3, 1], [0.8, 0]], peak: 0.1 });
    S.glass({ at: 0.45, f: mf(93), dur: 1.4, peak: 0.1 });
    S.metal({ at: 0.02, set: 'stone', f: 150, dur: 1.0, peak: 0.2, strike: 0.5 });
  });
  def('hd-wing', 'bm', S => {
    S.space('hall', 0.35);
    // a wing opening before a beat (the pitch climbs with the count): a soft rustle of vanes and a low feathered push
    hdFeather(S, 0, 0.26, 0, 130);
    S.glass({ at: 0.2, f: mf(88), dur: 0.5, peak: 0.04 });
  });
  def('hd-shatter', 'bm', S => {
    S.space('hall', 0.5);
    // a pillar breaking: a deep crack, a burst of glass falling in a rush, a spray of frost and chips on the floor
    S.crack({ f: 1800, peak: 0.45, dur: 0.3 });
    S.thud({ f: 70, f1: 30, dur: 0.8, drive: 2.4, peak: 0.55 });
    for (let i = 0; i < 9; i++) S.glass({ at: 0.02 + i * 0.04, f: mf(104 - i * 2 + (i % 3)), dur: 0.7, peak: 0.07, pan: Math.sin(i * 1.9) * 0.6 });
    S.crackle({ at: 0.05, dens: 2.4, f: 4200, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.18 });
    S.sizzle({ at: 0.1, hp: 5500, dur: 0.8, pts: [[0.05, 1], [0.8, 0]], peak: 0.1 });
  });
  def('hd-frost-hit', 'imp', S => {
    // a percentage hit on you: the hollow weight and the cold going through, a thin falling tone, no crack
    S.thud({ f: 56, f1: 24, dur: 0.8, drive: 1.6, peak: 0.7, click: 0.15 });
    S.tone({ f: mf(86), f1: mf(62), dur: 0.7, pts: [[0.02, 1], [0.7, 0]], peak: 0.07, lp: 3000 });
    hdSigh(S, 0, 0.5, 0.1, 3600, 900);
    S.glass({ at: 0.02, f: mf(98), dur: 0.5, peak: 0.05 });
  });
  def('hd-open-1', 'sting', S => {
    S.space('hall', 0.7);
    // a long cold draught and cloth sliding, chains settling and a hand rising: a soft glass tone climbing a fifth, a held breath
    hdSigh(S, 0, 1.6, 0.12, 1800, 500);
    S.noise({ bp: 600, bp1: 1800, q: 1.4, dur: 1.4, a: 0.5, pts: [[0.9, 1], [1.4, 0]], peak: 0.1, grain: 0.5 });
    hdChains(S, 0.2, 1.2, 0.1);
    S.tone({ at: 1.0, f: mf(74), f1: mf(81), dur: 2.0, a: 0.8, pts: [[1.2, 1], [2.0, 0]], peak: 0.06, lp: 2400 });
    hdGlass(S, 1.6, mf(86), 0.1, 2.2);
    S.thud({ at: 0, f: 48, f1: 30, dur: 1.2, drive: 1.4, peak: 0.3, click: 0 });
  });
  def('hd-open-2', 'sting', S => {
    S.space('hall', 0.8);
    // the roof going up and away in frost: a long rising crack and falling shards, wide wind opening, three slow feathered beats unfolding, a bright cracked note
    S.creak({ f: 18, f1: 70, res: [500, 1300, 3000], q: 12, dur: 1.8, peak: 0.12 });
    S.noise({ bp: 300, bp1: 3200, q: 0.8, dur: 2.2, a: 1.4, pts: [[1.9, 1], [2.2, 0]], peak: 0.2 });
    for (let i = 0; i < 8; i++) S.glass({ at: 0.5 + i * 0.16, f: mf(106 - i * 2), dur: 0.9, peak: 0.045, pan: Math.sin(i * 2.1) * 0.7 });
    [[1.8, -0.5], [2.35, 0.5], [2.95, 0]].forEach(([at, pan], i) => hdFeather(S, at, 0.35 + i * 0.1, pan, 120 - i * 12));
    S.thud({ at: 1.8, f: 44, f1: 22, dur: 1.6, drive: 2.6, peak: 0.6 });
    hdGlass(S, 3.0, mf(93), 0.12, 2.8); S.glass({ at: 3.05, f: mf(93) * 1.03, dur: 2.2, peak: 0.07 });
  });
  def('hd-kneel', 'sting', S => {
    S.space('hall', 0.7);
    // the weight lowering: cloth and a long breath out, a single knee on the stone, one soft bell fading with its chains, the cold tone letting go
    hdSigh(S, 0, 2.0, 0.12, 2200, 400);
    S.noise({ bp: 500, bp1: 200, q: 1, dur: 1.2, a: 0.3, pts: [[0.5, 1], [1.2, 0]], peak: 0.12, grain: 0.4 });
    S.thud({ at: 1.2, f: 70, f1: 34, dur: 0.7, drive: 1.6, peak: 0.45 });
    hdToll(S, 1.5, mf(48), 0.2, 5.0, 0.9);
    hdDrone(S, 1.0, 4.0, 0.06, mf(50), mf(48));
  });
  def('hd-lie', 'sting', S => {
    S.space('hall', 0.75);
    // the wings folding and laying down: a run of feather rustles closing one by one, a soft body in snow, a long breath, and the high note of the ring dying away alone
    for (let i = 0; i < 6; i++) S.noise({ at: i * 0.35, color: 'pink', hp: 2200, lp: 6500, grain: 0.7, dur: 0.4, a: 0.08, pts: [[0.15, 1], [0.4, 0]], peak: 0.12 * (1 - i * 0.1), pan: Math.sin(i * 1.7) * 0.6 });
    hdFeather(S, 0, 0.18, -0.4, 100); hdFeather(S, 0.5, 0.2, 0.4, 90);
    S.thud({ at: 2.2, f: 60, f1: 30, dur: 1.2, drive: 1.4, peak: 0.45, click: 0 });
    S.noise({ at: 2.2, color: 'pink', lp: 1200, dur: 0.6, a: 0.02, pts: [[0.05, 1], [0.6, 0]], peak: 0.1 });
    hdSigh(S, 2.4, 2.4, 0.1, 2400, 400);
    hdGlass(S, 3.0, mf(93), 0.1, 4.0);
  });

  // ---------------------------------------------------------------------------------------------- install
  const API ={ mf, st, CAT, TRIM, ABIL, ACC, strict: false, names: () => DEFS.map(d => d[0]), loops: () => LOOPS.map(d => d[0]), installed: false };
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
