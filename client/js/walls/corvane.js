// Corvane's wall (wall-fx.js): The Vigil (42%), never told in words.
//   Design: the last guard of the pass goes to a knee and keeps his watch. The idiom is cold and stillness: the wind drops away, the snow lifts and
//   hangs, the blade is laid down across his knees, and a low bell begins to toll a long way off. While it holds the rime grows over him in a
//   thin shell of ice with a crescent turning behind his helm (the crescent on his brow); each toll breathes the light up in it and shakes a
//   little frost loose, and each wisp that reaches him is a flame taken (a soft chime, a glint along the blade). The floor keeps only hairline
//   cracks of frost and a ring that walks outward from him on every toll. When the watch ends he stands: the shell bursts off him in shards, the
//   blade is drawn clean (one long white line of light along it), a ring of white and a thin ring of lantern-amber run out, the lanterns flare
//   as he passes, snow comes down over the pass and the wind and the music come back.
//   The kneel itself and the frost spreading from his cast (corvane-fx.js) are his; this adds the seal, the toll and the rise.
// Everything is drawn on his body (body), faint and under the telegraphs (floor, white and not blue or red), or brief in the air.

(() => {
  if (typeof WallFx === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };

  // the bell's time: sfx-synth.js 'wall-corvane-toll' strikes at the start of each 4 s; the loop is started TOLL0 seconds after the seal goes up
  const P = 4.0, TOLL0 = 0.64;
  const toll = tt => { if (tt < 0) return 0; const q = tt % P; return Math.min(1.1, Math.exp(-q / 0.5) + 0.28 * Math.exp(-q / 1.8)); };

  const lanterns = () => ((typeof ArenaView !== 'undefined' && ArenaView.liveRoom && ArenaView.liveRoom.props) || []).filter(p => p.kind === 'stonelantern');
  const notchOf = S => { const pr = S.bd && S.bd.st && S.bd.st.props; return pr ? pr.notch | 0 : 0; };
  const glow = (c, x, y, r, col, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };
  // snow: pale flakes drifting down over the pass (a few of them catching the lanterns' warmth)
  const snow = (n, zLo = 120, zHi = 320) => {
    const R = typeof ARENA !== 'undefined' && ARENA.inner ? ARENA.inner : 520;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), d = Math.sqrt(Math.random()) * R, warm = Math.random() < 0.08;
      VFX.spawn({ x: Math.cos(a) * d, y: Math.sin(a) * d, z: rand(zLo, zHi), vx: rand(-10, 10), vy: rand(-4, 8), vz: -rand(26, 52), drag: 0, life: rand(3.5, 6), size: rand(2, 4), size1: rand(1, 2),
        color: warm ? '#ffd890' : '#eef6ff', add: warm, a: warm ? 0.9 : 0.6, flutter: rand(2, 5) });
    }
  };

  // frost cracking out over the snow from where he knelt: jagged hairlines in world units
  function frostLines() {
    return Array.from({ length: 13 }, (_, i) => {
      const a0 = i * TAU / 13 + rand(-0.2, 0.2), len = rand(150, 290), n = 7, pts = [[0, 0]]; let a = a0, x = 0, y = 0;
      for (let j = 1; j <= n; j++) { a += rand(-0.3, 0.3); x += Math.cos(a) * len / n; y += Math.sin(a) * len / n * 0.8; pts.push([x, y]); }
      return { pts, w: rand(1, 1.8), d: rand(0, 0.35) };
    });
  }
  function path(c, pts, g, map) {
    const n = pts.length - 1, upto = g * n;
    c.beginPath();
    for (let j = 0; j <= n && j <= upto + 1; j++) {
      let [x, y] = pts[j];
      if (j > upto) { const [px, py] = pts[j - 1], q = upto - (j - 1); x = px + (x - px) * q; y = py + (y - py) * q; }
      const p = map(x, y); j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y);
    }
  }

  // the rime on him: a thin shell of ice (rim, sheen and a ring of crystals), a crescent turning behind the helm. k: how much of it, b: the toll's breath
  function rime(c, S, t, age, k, b) {
    const x = S.bd.x, y = S.bd.y, sc = S.sc, R = 41 * sc * (1 + 0.022 * b), grow = easeOut(clamp01(age / 2.2));
    c.save();
    // the sheen over his body: nearly clear in the middle, so the floor under him still reads
    const g = c.createRadialGradient(x, y, R * 0.5, x, y, R);
    g.addColorStop(0, 'rgba(225,240,255,0)'); g.addColorStop(0.8, `rgba(225,240,255,${(0.07 + 0.05 * b) * k})`); g.addColorStop(1, `rgba(245,251,255,${(0.2 + 0.1 * b) * k})`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
    c.lineWidth = 1.8; c.strokeStyle = `rgba(245,251,255,${(0.42 + 0.3 * b) * k})`; c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke();
    // the crystals standing off the rim, each growing in its own time
    for (let i = 0; i < 18; i++) {
      const gi = clamp01((age - 0.15 - hash(i, 2) * 1.3) / 0.7); if (gi <= 0) continue;
      const a = i * TAU / 18 + (hash(i, 1) - 0.5) * 0.22, L = (4 + 18 * hash(i, 3) * hash(i, 3)) * sc * easeOut(gi) * (1 + 0.1 * b), w = 0.06, tw = 0.75 + 0.25 * Math.sin(t * 1.7 + i * 2.3);
      c.beginPath(); c.moveTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R); c.lineTo(x + Math.cos(a) * (R + L), y + Math.sin(a) * (R + L)); c.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R); c.closePath();
      c.fillStyle = `rgba(236,247,255,${0.4 * tw * k})`; c.fill(); c.lineWidth = 1; c.strokeStyle = `rgba(255,255,255,${0.75 * tw * k})`; c.stroke();
    }
    // the crescent, his brow's, turning slowly round him and flaring on each toll
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    const Rc = R * 1.2, a0 = t * 0.32, span = 1.05 + 0.15 * b;
    c.lineWidth = 7 * sc * 0.6; c.strokeStyle = `rgba(190,226,255,${(0.1 + 0.16 * b) * k})`; c.beginPath(); c.arc(x, y, Rc, a0, a0 + span); c.stroke();
    c.lineWidth = 2.4; c.strokeStyle = `rgba(255,255,255,${(0.5 + 0.4 * b) * k})`; c.beginPath(); c.arc(x, y, Rc, a0, a0 + span); c.stroke();
    c.lineWidth = 1; c.strokeStyle = `rgba(215,236,255,${0.1 * k})`; c.beginPath(); c.arc(x, y, Rc, 0, TAU); c.stroke();
    glow(c, x, y, R * 1.5, '225,240,255', 0.2 * b * k);   // (the toll lights the whole shell from within)
    // a glint that wanders over the shell
    const ga = t * 0.6, gx = x + Math.cos(ga) * R, gy = y + Math.sin(ga) * R * 0.98;
    glow(c, gx, gy, 12 * sc, '255,255,255', 0.32 * k * grow);
    c.restore();
  }

  // the blade across his knees: a long line of light along it, lit by the toll, and a glint where a flame was just taken
  function blade(c, S, k, b, take) {
    const a = S.pt(16, 36), z = S.pt(16, -42);
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(z.x, z.y);
    c.strokeStyle = `rgba(190,230,255,${(0.05 + 0.16 * b) * k})`; c.lineWidth = 9 * S.sc; c.stroke();
    c.strokeStyle = `rgba(255,255,255,${(0.1 + 0.4 * b) * k})`; c.lineWidth = 2; c.stroke();
    if (take > 0.02) {
      const u = 0.15 + 0.7 * clamp01((notchOf(S) - 0.5) / 4), px = a.x + (z.x - a.x) * u, py = a.y + (z.y - a.y) * u;
      glow(c, px, py, 30 * S.sc * (0.7 + 0.5 * take), '255,255,255', 0.5 * take * k);
    }
    c.restore();
  }

  WallFx.moment('corvane', 'The Vigil', {
    up(S) {
      const bd = S.bd, st = S.st, sc = S.sc;
      st.lines = frostLines(); st.fx = bd.x; st.fy = bd.y; st.t0 = TOLL0; st.take = -9; st.n = notchOf(S); st.lastToll = -1;
      // the hush: the wind drops away, the blade is laid down, the weight of him in the snow
      S.play('wall-corvane-kneel');
      S.muffle(300, 0.35);
      S.later(2.2, () => S.muffle(1900, 3.5));   // (the bell and the wisps' dance keep their beat)
      S.later(TOLL0, () => S.loop('wall-corvane-toll', { vol: 0.85, fade: 0.05 }));
      S.cam('stop', 0.08); S.cam('flash', '#e6f2ff', 0.22, 0.5); S.cam('dim', 0.3, 1.1);
      S.lean(0.04, 0.5, 0.9, 1.4);
      S.shake(6);
      // the snow lifts off the pass and hangs; a ring runs out over it, then a slower, fainter one with the first bell
      VFX.motes(bd.x, bd.y, { color: '#eef6ff', n: 22, r: 340, rise: 0.4, life: 2.2, size: 8 });
      VFX.flash(bd.x, bd.y - 40, 130, '#e8f2ff', 0.22);
      S.ring(bd.x, bd.y, { r: 330, color: '#eef6ff', w: 6, dur: 0.95 });
      S.later(TOLL0, () => { S.ring(S.bd.x, S.bd.y, { r: 240, color: '#ffffff', w: 3, dur: 1.4 }); S.shake(3); });
      S.later(0.3, () => snow(14, 60, 220));
    },
    quiet(S) {
      const st = S.st;
      st.lines = frostLines(); st.fx = S.bd.x; st.fy = S.bd.y; st.t0 = S.since(); st.take = -9; st.n = notchOf(S); st.lastToll = -1;
      S.loop('wall-corvane-toll', { vol: 0.85, fade: 1 }); S.muffle(1900, 1);
    },
    floor(c, S, t, age) {
      const st = S.st; if (!st.lines) return;
      const tt = S.since() - st.t0, b = toll(tt), g = easeOut(clamp01(age / 1.6)), k = clamp01(age / 0.3);
      c.save();
      if (typeof ARENA !== 'undefined' && ARENA.trace) { ARENA.trace(c, 2); c.clip(); }
      c.lineCap = 'round'; c.lineJoin = 'round';
      const map = (x, y) => ({ x: st.fx + x, y: st.fy + y });
      for (const cr of st.lines) {   // (hairlines of frost, white, a little brighter on each toll)
        const gg = clamp01((g - cr.d) / (1 - cr.d)); if (gg <= 0) continue;
        path(c, cr.pts, gg, map);
        c.strokeStyle = `rgba(8,22,40,${0.1 * k})`; c.lineWidth = cr.w + 2; c.stroke();
        c.strokeStyle = `rgba(236,246,255,${(0.1 + 0.07 * b) * k})`; c.lineWidth = cr.w; c.stroke();
      }
      // the toll walking out over the snow: one thin ring on each strike
      if (tt >= 0) {
        const q = (tt % P) / 2.2;
        if (q < 1) {
          const r = 50 + 340 * easeOut(q), a = 0.2 * (1 - q) * (1 - q) * k;
          c.lineWidth = 2.2; c.strokeStyle = `rgba(240,248,255,${a})`; c.beginPath(); c.ellipse(st.fx, st.fy + 8, r, r * 0.8, 0, 0, TAU); c.stroke();
        }
      }
      c.restore();
    },
    body(c, S, t, age) {
      const st = S.st; if (!st.lines) return;
      const pr = S.present(); if (pr <= 0.01) return;
      const tt = S.since() - st.t0, b = toll(tt), k = clamp01(age / 0.25) * pr;
      // a flame taken: another notch on his blade
      const n = notchOf(S);
      if (n > st.n && age > 0.5) { st.take = S.since(); S.play('wall-corvane-take', { vol: 0.8 }); }
      st.n = n;
      const take = clamp01(1 - (S.since() - st.take) / 0.7);
      rime(c, S, t, age, k, b);
      blade(c, S, k, b, take);
      // on each toll he breathes out: a little cold mist off the helm, and frost shaken loose from the shell
      const i = tt >= 0 ? Math.floor(tt / P) : -1;
      if (i >= 0 && i !== st.lastToll) {
        st.lastToll = i;
        const h = S.pt(10, 0);
        VFX.smoke(h.x, h.y - 6, { color: '#dfe9f6', n: 3, size: 16, a: 0.3, speed: 26 });
        VFX.sparks(S.bd.x, S.bd.y, { color: '#eef8ff', n: 6, speed: 130, up: 60 });
      }
    },
    broke(S) {
      const bd = S.bd, x = bd.x, y = bd.y, sc = S.sc;
      S.play('wall-corvane-rise');
      // the shell bursts off him in shards and the blade is drawn clean: one long white line of light, then nothing
      S.shatter({ color: '#d4eaff', edge: '#ffffff', rx: 46, ry: 46, cy: 0, n: 14, push: 1.1, bits: 26 });
      const a = S.pt(16, 36), z = S.pt(16, -42);
      VFX.fx({ dur: 0.9, layer: 'air', draw: (c, p) => {
        const e = 1 - p, q = easeOut(clamp01(p / 0.25));
        const px = a.x + (z.x - a.x) * q, py = a.y + (z.y - a.y) * q;
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(px, py);
        c.strokeStyle = `rgba(190,230,255,${0.6 * e * e})`; c.lineWidth = 14 * sc * e; c.stroke();
        c.strokeStyle = `rgba(255,255,255,${e})`; c.lineWidth = 3.6 * e + 1; c.stroke();
        glow(c, px, py, 38 * sc * e, '255,255,255', 0.6 * e);
        c.restore();
      } });
      S.ring(x, y, { r: 540, color: '#ffffff', w: 11, dur: 0.85 });
      S.ring(x, y, { r: 320, color: '#dff0ff', w: 5, dur: 0.6, delay: 0.05 });
      S.ring(x, y, { r: 420, color: '#ffc870', w: 4, dur: 1.0, delay: 0.14 });   // (the lanterns' warmth, thin, a breath behind)
      VFX.pillar(x, y, { r: 44 * sc, h: 440, color: '#e6f4ff', dur: 0.9 });
      VFX.flash(x, y - 40, 190, '#ffffff', 0.24);
      VFX.sparks(x, y - 20, { color: '#ffffff', n: 34, speed: 560, up: 220 });
      S.cam('stop', 0.12); S.cam('flash', '#f4faff', 0.28, 0.45); S.cam('punch', 0.035, 0.5);
      S.shake(11);
      S.muffle(0, 0.2); S.swell(0.3, 2.0);
      // the lanterns flare as he stands, one after another outward from him
      const L = lanterns().slice().sort((u, v) => Math.hypot(u.x - x, u.y - y) - Math.hypot(v.x - x, v.y - y));
      L.forEach((pr, i) => S.later(0.14 + i * 0.07, () => { VFX.flash(pr.x, pr.y - 34, 66, '#ffc870', 0.4); VFX.sparks(pr.x, pr.y - 32, { color: '#ffd890', n: 5, speed: 170 }); }));
      // the wind comes back: a gust of snow thrown outward along the snow, then the flakes coming down over the pass
      for (let i = 0; i < 30; i++) {
        const ang = rand(0, TAU), sp = rand(180, 420);
        VFX.spawn({ x: x + Math.cos(ang) * 30, y: y + Math.sin(ang) * 22, z: rand(10, 50), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.6, vz: rand(10, 70), g: 40, drag: 0.5, life: rand(0.9, 1.5), size: rand(4, 8), size1: 0,
          color: i % 3 ? '#ffffff' : '#cfe6ff', kind: i % 2 ? 'star' : 'glow', vr: rand(-4, 4) });
      }
      for (let k = 0; k < 6; k++) S.later(0.3 + k * 0.45, () => snow(14));
    },
  });
})();
