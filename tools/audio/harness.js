// Runs inside headless Chrome (tools/audio/render.js evaluates it after sfx-synth.js): renders recipes with an
// OfflineAudioContext and measures them. Exposes globalThis.__audio.
(function () {
  'use strict';
  const SR = 44100;
  const db = x => (x > 0 ? 20 * Math.log10(x) : -200);

  // K-weighting (ITU-R BS.1770) biquads for this sample rate
  function kCoefs(fs) {
    let G = 3.999843853973347, Q = 0.7071752369554196, fc = 1681.974450955533;
    let A = Math.pow(10, G / 40), w = 2 * Math.PI * fc / fs, al = Math.sin(w) / (2 * Q), c = Math.cos(w), sA = Math.sqrt(A);
    const s1 = norm([A * ((A + 1) + (A - 1) * c + 2 * sA * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * sA * al)],
      [(A + 1) - (A - 1) * c + 2 * sA * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * sA * al]);
    Q = 0.5003270373238773; fc = 38.13547087602444; w = 2 * Math.PI * fc / fs; al = Math.sin(w) / (2 * Q); c = Math.cos(w);
    const s2 = norm([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]);
    return [s1, s2];
    function norm(b, a) { return { b0: b[0] / a[0], b1: b[1] / a[0], b2: b[2] / a[0], a1: a[1] / a[0], a2: a[2] / a[0] }; }
  }
  function biquad(x, k) { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = k.b0 * x[i] + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
  // loudness: momentary max (400 ms windows, 100 ms hop) and gated integrated, over [0, end)
  function loudness(chs, end) {
    const K = kCoefs(SR), n = Math.min(end, chs[0].length), win = Math.round(0.4 * SR), hop = Math.round(0.1 * SR);
    const sq = chs.map(c => { const y = biquad(biquad(c.subarray(0, n), K[0]), K[1]); const s = new Float64Array(n + 1); for (let i = 0; i < n; i++) s[i + 1] = s[i] + y[i] * y[i]; return s; });
    const blocks = [];
    for (let st = 0; st === 0 || st + win <= n + hop; st += hop) {
      const e = Math.min(n, st + win); let z = 0;
      for (const s of sq) z += (s[e] - s[Math.min(st, e)]) / win;
      blocks.push(z);
      if (st + win >= n) break;
    }
    const L = z => -0.691 + 10 * Math.log10(Math.max(z, 1e-20));
    const mMax = Math.max(...blocks.map(L));
    const g1 = blocks.filter(z => L(z) > -70);
    let integ = -70;
    if (g1.length) { const m1 = g1.reduce((a, b) => a + b, 0) / g1.length, rel = L(m1) - 10, g2 = g1.filter(z => L(z) > rel); integ = L(g2.reduce((a, b) => a + b, 0) / g2.length); }
    return { mMax, integ };
  }
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
    }
  }
  function spectrum(m, end) {
    const N = 2048, P = new Float64Array(N / 2);
    for (let st = 0; st + N <= Math.max(end, N); st += N / 2) {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N; i++) re[i] = (m[st + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
      fft(re, im);
      for (let k = 0; k < N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k];
    }
    let tot = 0, cen = 0, lo = 0, mid = 0, hi = 0;
    for (let k = 1; k < N / 2; k++) { const f = k * SR / N, p = P[k]; tot += p; cen += f * p; if (f < 250) lo += p; else if (f < 4000) mid += p; else hi += p; }
    tot = tot || 1;
    return { centroid: Math.round(cen / tot), low: +(lo / tot).toFixed(3), mid: +(mid / tot).toFixed(3), high: +(hi / tot).toFixed(3) };
  }
  function analyse(buf, declared, measureEnd) {
    const chs = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)], n = chs[0].length;
    let peak = 0, nan = 0, first = -1, last = -1, sum = 0;
    const m = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = chs[0][i], b = chs[1][i];
      if (!isFinite(a) || !isFinite(b)) { nan++; continue; }
      const p = Math.max(Math.abs(a), Math.abs(b)); if (p > peak) peak = p;
      if (p > 0.001) { if (first < 0) first = i; last = i; }
      m[i] = (a + b) / 2; sum += m[i];
    }
    const end = Math.min(n, measureEnd ? Math.round(measureEnd * SR) : n);
    let ss = 0, cnt = 0; for (let i = Math.max(0, first); i <= last && i < end; i++) { ss += m[i] * m[i]; cnt++; }
    const fr = Math.round(0.01 * SR); let quiet = 0, frames = 0;
    const span = Math.min(end, Math.round(declared * SR));
    for (let st = 0; st + fr <= span; st += fr) { let e = 0; for (let i = st; i < st + fr; i++) e += m[i] * m[i]; frames++; if (db(Math.sqrt(e / fr)) < -60) quiet++; }
    const L = loudness(chs, end);
    return Object.assign({
      peak: +db(peak).toFixed(2), rms: +db(Math.sqrt(ss / Math.max(1, cnt))).toFixed(2), nan, dc: +(sum / n).toFixed(5),
      silence: frames ? +(quiet / frames).toFixed(3) : 1, lead: first < 0 ? null : +(first / SR).toFixed(3), lastSound: last < 0 ? null : +(last / SR).toFixed(3),
      lufsM: +L.mMax.toFixed(2), lufsI: +L.integ.toFixed(2),
    }, spectrum(m, end));
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, bytes = 44 + n * ch * 2, ab = new ArrayBuffer(bytes), v = new DataView(ab);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * ch * 2, true);
    const d = []; for (let c = 0; c < ch; c++) d.push(buf.getChannelData(c));
    let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, d[c][i] || 0)); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    const u = new Uint8Array(ab); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }

  async function oneShot(name, variant, seed, wantWav) {
    const fn = Sound.recipes[name], p = { vol: 1, rate: 1, pan: 0, seed, remote: false, variant };
    const probe = new OfflineAudioContext(2, 128, SR), pg = probe.createGain(); pg.connect(probe.destination);
    const declared = fn(probe, pg, 0, p);
    if (!isFinite(declared) || declared <= 0) throw new Error('bad duration ' + declared);
    const len = Math.ceil((Math.min(15, declared) + 0.5) * SR);
    const ctx = new OfflineAudioContext(2, len, SR), out = ctx.createGain(); out.connect(ctx.destination);
    const t0 = performance.now();
    fn(ctx, out, 0, p);
    const buf = await ctx.startRendering();
    const a = analyse(buf, declared, null);
    a.declared = +declared.toFixed(3); a.ms = Math.round(performance.now() - t0);
    // sound still going past the declared duration would be cut off if the engine frees nodes there
    a.overrun = a.lastSound != null && a.lastSound > declared + 0.1;
    if (wantWav) a.wav = wav(buf);
    return a;
  }
  async function loopOne(name, seed, wantWav) {
    const fn = Sound.loops[name], p = { vol: 1, rate: 1, pan: 0, seed, remote: false };
    // 5.6 s: fade in, measure the settled bed over 2.5-5.0 s, call stop() at 5.0 s and check the last 0.1 s is silent
    const ctx = new OfflineAudioContext(2, Math.round(5.6 * SR), SR), out = ctx.createGain(); out.connect(ctx.destination);
    const t0 = performance.now();
    const stop = fn(ctx, out, p);
    if (typeof stop !== 'function') throw new Error('defineLoop builder did not return a stop function');
    ctx.suspend(5.0).then(() => { stop(); ctx.resume(); });
    const buf = await ctx.startRendering();
    const view = { numberOfChannels: 2, length: Math.round(2.5 * SR), getChannelData: c => buf.getChannelData(c).subarray(Math.round(2.5 * SR), Math.round(5.0 * SR)) };
    const a = analyse(view, 2.5, 2.5);
    const tail = buf.getChannelData(0).subarray(Math.round(5.5 * SR)); let t = 0; for (const x of tail) t = Math.max(t, Math.abs(x));
    a.stopTail = +db(t).toFixed(1); a.stopsClean = t < 0.001; a.declared = 3; a.ms = Math.round(performance.now() - t0);
    a.overrun = false;
    if (wantWav) a.wav = wav(buf);
    return a;
  }

  globalThis.__audio = {
    list: () => ({ shots: Object.keys(Sound.recipes), loops: Object.keys(Sound.loops), cat: SfxSynth.CAT, trim: SfxSynth.TRIM }),
    async run(name, variants, wantWav) {
      const isLoop = !!Sound.loops[name], res = [];
      const vs = isLoop ? [0.5] : Array.from({ length: variants }, (_, i) => (i + 0.5) / variants);
      const jobs = vs.map((v, i) => (isLoop ? loopOne(name, 1000 + i, wantWav === 'all' || (wantWav && i === 0)) : oneShot(name, v, 1000 + i * 7919, wantWav === 'all' || (wantWav && i === 0)))
        .then(a => { a.variant = v; return a; }, e => ({ variant: v, error: String(e && e.stack || e) })));
      for (const r of await Promise.all(jobs)) res.push(r);
      return { name, isLoop, res };
    },
  };
})();
