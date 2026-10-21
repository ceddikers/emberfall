// Loaded before any game script: makes the page repeatable and watches every canvas call.
//  - Math.random is seeded (__H.reseed(n)), performance.now / Date.now follow the gallery's own clock (__H.time, seconds);
//  - while __H.counting is on, every CanvasRenderingContext2D call is counted (a cost proxy) and any non-finite number
//    passed to one (or set on lineWidth / globalAlpha / ...) is recorded with the game file:line that did it;
//  - console.warn / console.error and uncaught errors are kept (VFX.draw drops a throwing effect with a console.warn).
(() => {
  const H = window.__H = { time: 0, counting: false, calls: 0, nan: [], warns: [], loadErrors: [], seed: 1 };
  let s = 1;
  H.reseed = n => { s = (n >>> 0) || 1; };
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const perfNow = performance.now.bind(performance);
  H.realNow = perfNow;
  performance.now = () => H.time * 1000;
  const D0 = 1767225600000;   // a fixed date (2026-01-01) so nothing depends on the day it runs
  Date.now = () => D0 + H.time * 1000;

  // the first game script on the stack (not this file, not the harness): 'client/js/ability-vfx.js:123'
  H.where = (stack, skip = 0) => {
    const lines = String(stack || '').split('\n').slice(1 + skip);
    for (const l of lines) {
      const m = /\/(js\/[^\s:)]+\.js):(\d+):(\d+)/.exec(l);
      if (m && !/instrument\.js|harness\.js/.test(m[1])) return 'client/' + m[1] + ':' + m[2];
    }
    return '?';
  };
  const bad = v => typeof v === 'number' && !Number.isFinite(v);
  H.noteNaN = (what, args) => {
    const at = H.where(new Error().stack, 1);
    const key = what + '@' + at;
    if (!H.nan.some(n => n.key === key)) H.nan.push({ key, what, at, args: args.map(a => (typeof a === 'number' ? String(a) : typeof a)).slice(0, 6).join(',') });
  };
  const P = CanvasRenderingContext2D.prototype;
  const METHODS = ['fillRect', 'strokeRect', 'clearRect', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo',
    'drawImage', 'fillText', 'strokeText', 'translate', 'rotate', 'scale', 'setTransform', 'transform', 'createLinearGradient', 'createRadialGradient',
    'createConicGradient', 'fill', 'stroke', 'clip', 'save', 'restore', 'beginPath', 'closePath', 'setLineDash', 'putImageData', 'createPattern', 'measureText'];
  for (const m of METHODS) {
    const orig = P[m];
    if (typeof orig !== 'function') continue;
    P[m] = function (...a) {
      if (H.counting) {
        H.calls++;
        for (let i = 0; i < a.length; i++) if (bad(a[i])) { H.noteNaN('ctx.' + m, a); break; }
      }
      return orig.apply(this, a);
    };
  }
  for (const prop of ['lineWidth', 'globalAlpha', 'lineDashOffset', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'miterLimit']) {
    const d = Object.getOwnPropertyDescriptor(P, prop);
    if (!d || !d.set) continue;
    Object.defineProperty(P, prop, { get: d.get, set(v) { if (H.counting && bad(v)) H.noteNaN('ctx.' + prop + '=', [v]); d.set.call(this, v); }, configurable: true });
  }
  const G = CanvasGradient.prototype, addStop = G.addColorStop;
  G.addColorStop = function (o, c) { if (H.counting && bad(o)) H.noteNaN('gradient.addColorStop', [o]); return addStop.call(this, o, c); };

  const warn = console.warn, err = console.error;
  console.warn = (...a) => { H.warns.push({ msg: a.map(x => (x && x.message) || String(x)).join(' ').slice(0, 300), at: H.where((a.find(x => x && x.stack) || {}).stack || new Error().stack) }); warn.apply(console, a); };
  console.error = (...a) => { H.warns.push({ msg: 'console.error: ' + a.map(x => (x && x.message) || String(x)).join(' ').slice(0, 300), at: H.where((a.find(x => x && x.stack) || {}).stack || new Error().stack) }); err.apply(console, a); };
  window.addEventListener('error', e => { H.loadErrors.push({ msg: String(e.message).slice(0, 300), at: (e.filename || '').replace(/^.*\/js\//, 'client/js/') + ':' + e.lineno }); });

  // the few globals the effect code reads from scripts the gallery doesn't load (net.js)
  window.Net = { id: 1000, isHost: true, send() {}, on() {}, broadcastAll() {} };
})();
