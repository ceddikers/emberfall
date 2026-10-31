// Vhalgrath's walls (wall-fx.js): the moments, never told in words.
//   Ember Heart (10%): his chest splits and the fire inside him roars up; light cracks out across his scales and the crater floor round
//     him, and the Heart beats under the fight (the sound and the light keep one time). When it closes: two last beats, the cracks flare
//     white and slam dark, steam pours off him, and the music comes back up.
//   Last Ember (3%): he rises and the crater's own fire is drawn up into him on a storm, the music sunk under it; when the last landing
//     falls, one great blow, and ash comes down over the crater as the music returns.
// Everything here is drawn on his body (body), thin and under the telegraphs (floor), or brief in the air.

(() => {
  if (typeof WallFx === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000);

  // the Heart's time: sfx-synth.js 'wall-wyrm-heart' plays a 1.25 s beat at 0.92 speed, lub then dub
  const BEAT = 1.25 / 0.92, LUB = 0.01 / 0.92, DUB = 0.33 / 0.92;
  const pulse = tt => {
    if (tt < 0) return 0;
    const q = tt % BEAT, a = q - LUB, b = q - DUB;
    return (a >= 0 ? Math.exp(-a / 0.11) : 0) + (b >= 0 ? 0.7 * Math.exp(-b / 0.09) : 0);
  };

  // where a point of his body is drawn (bosses.js wyrm: x along his facing, y across it; lifted and larger in the air, raised on the perch)
  const lift = bd => { const p = (bd.st && bd.st.props) || {}; return p.air ? { up: 52, k: 1.15 } : p.perch ? { up: 18, k: 1 } : { up: 0, k: 1 }; };
  const onBody = (S, x, y) => {
    const bd = S.bd, L = lift(bd), f = bd.f || 0, c = Math.cos(f), s = Math.sin(f), k = L.k * S.sc;
    return { x: bd.x + (x * c - y * s) * k, y: bd.y + (x * s + y * c) * k - L.up * S.sc };
  };

  // light cracking out of the Heart across his scales: jagged lines in his own units from the chest (8, 0), some forking
  function bodyCracks() {
    const out = [];
    for (let i = 0; i < 11; i++) {
      const a0 = i * TAU / 11 + rand(-0.2, 0.2), len = rand(26, 46) * (Math.abs(Math.cos(a0)) > 0.6 ? 1.15 : 0.8);
      const pts = [[8, 0]]; let a = a0, x = 8, y = 0;
      const n = 4 + (Math.random() < 0.5 ? 1 : 0);
      for (let j = 1; j <= n; j++) { a += rand(-0.45, 0.45); x += Math.cos(a) * len / n; y += Math.sin(a) * len / n * 0.75; pts.push([x, y]); }
      out.push({ pts, w: rand(1.2, 2.1), d: 0 });
      if (Math.random() < 0.55) {   // a fork from the middle
        const m = pts[2], fa = a0 + (Math.random() < 0.5 ? 0.7 : -0.7), fl = len * 0.4;
        out.push({ pts: [m, [m[0] + Math.cos(fa) * fl * 0.5, m[1] + Math.sin(fa) * fl * 0.4], [m[0] + Math.cos(fa + 0.2) * fl, m[1] + Math.sin(fa + 0.2) * fl * 0.75]], w: rand(0.9, 1.4), d: 0.4 });
      }
    }
    return out;
  }
  // the crater splitting round his feet: long jagged lines in world units out from where he stood when it opened
  function floorCracks() {
    return Array.from({ length: 9 }, (_, i) => {
      const a0 = i * TAU / 9 + rand(-0.25, 0.25), len = rand(150, 260), n = 6, pts = [[0, 0]]; let a = a0, x = 0, y = 0;
      for (let j = 1; j <= n; j++) { a += rand(-0.35, 0.35); x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]); }
      return { pts, w: rand(1.6, 3), len };
    });
  }
  // a crack drawn grown to `g` (0-1) of its length
  function path(c, pts, g, map) {
    const n = pts.length - 1, upto = g * n;
    c.beginPath();
    for (let j = 0; j <= n && j <= upto + 1; j++) {
      let [x, y] = pts[j];
      if (j > upto) { const [px, py] = pts[j - 1], q = upto - (j - 1); x = px + (x - px) * q; y = py + (y - py) * q; }
      const p = map(x, y); j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y);
    }
  }
  // his cracks: glow (hot) round a bright core (core); k: how lit, g: how far grown
  function drawBodyCracks(c, S, cracks, k, g, hot = '255,138,42', core = '255,236,190') {
    if (k <= 0.01) return;
    const map = (x, y) => onBody(S, x, y);
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const cr of cracks) {
      const gg = clamp01((g - cr.d) / (1 - cr.d)); if (gg <= 0) continue;
      path(c, cr.pts, gg, map);
      c.strokeStyle = `rgba(${hot},${Math.min(1, 0.4 * k)})`; c.lineWidth = cr.w * 3.4 * S.sc; c.stroke();
      c.strokeStyle = `rgba(${core},${Math.min(1, 0.9 * k)})`; c.lineWidth = cr.w * S.sc; c.stroke();
    }
    c.restore();
  }
  // the Heart itself: a white-hot core in his chest, swelling with each beat
  function drawCore(c, S, b, k, col = '255,170,64') {
    const p = onBody(S, 8, 0), r = (26 + 16 * b) * S.sc;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(255,250,235,${0.85 * k})`); g.addColorStop(0.3, `rgba(${col},${0.55 * k})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
    c.restore();
  }
  const embersOff = (S, n, o = {}) => {
    for (let i = 0; i < n; i++) {
      const cr = S.st.cracks[(Math.random() * S.st.cracks.length) | 0], e = cr.pts[cr.pts.length - 1], p = onBody(S, e[0], e[1]);
      VFX.spawn({ x: p.x + rand(-4, 4), y: p.y + rand(-4, 4), z: 10, vx: rand(-30, 30), vy: rand(-20, 10), vz: rand(60, 150) * (o.up || 1), life: rand(0.6, 1.1), size: rand(3, 6), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ff7a1a' });
    }
  };

  // ---- the Ember Heart
  WallFx.moment('wyrm', 'Ember Heart', {
    up(S) {
      const bd = S.bd, st = S.st;
      st.cracks = bodyCracks(); st.floor = floorCracks(); st.fx = bd.x; st.fy = bd.y; st.beat0 = 1.4;
      const ch = onBody(S, 8, 0);
      S.play('wall-wyrm-open');
      S.muffle(320, 0.18);
      S.later(2.6, () => S.muffle(1700, 5));   // (the music comes back up to a heavy, dark version of itself for the dance)
      S.later(1.4, () => S.loop('wall-wyrm-heart', { vol: 0.85, fade: 0.25 }));
      S.cam('stop', 0.12); S.cam('flash', '#ffb040', 0.4, 0.6); S.cam('dim', 0.35, 1.0);
      S.lean(0.055, 0.35, 1.1, 1.5);
      S.shake(13);
      // the chest bursting: a column of fire up out of him, crust thrown off, a ring across the crater
      VFX.pillar(ch.x, ch.y, { r: 38 * S.sc, h: 440, color: '#ff8a2a', dur: 1.1 });
      VFX.flash(ch.x, ch.y, 210, '#ffd27a', 0.35);
      VFX.sparks(ch.x, ch.y, { color: '#ffb040', n: 40, speed: 620, up: 260 });
      VFX.debris(ch.x, ch.y, { color: '#2a1c18', n: 10, speed: 1.3, hot: true });
      VFX.smoke(ch.x, ch.y, { color: '#3a2a26', n: 6, size: 30, a: 0.45, speed: 90 });
      S.ring(bd.x, bd.y, { r: 430, color: '#ff8a2a', w: 12, dur: 0.95 });
      S.ring(bd.x, bd.y, { r: 240, color: '#ffe0a0', w: 6, dur: 0.55, delay: 0.06 });
      // the first two great beats (with the sound's)
      for (const [at, r, n] of [[0.75, 300, 7], [1.08, 220, 4]]) S.later(at, () => { const q = onBody(S, 8, 0); S.ring(S.bd.x, S.bd.y, { r, color: '#ffb040', w: 5, dur: 0.6 }); VFX.flash(q.x, q.y, 120, '#ffd27a', 0.2); S.shake(n); });
    },
    quiet(S) { const st = S.st; st.cracks = bodyCracks(); st.floor = floorCracks(); st.fx = S.bd.x; st.fy = S.bd.y; st.beat0 = S.since(); S.loop('wall-wyrm-heart', { vol: 0.85, fade: 1 }); S.muffle(1700, 1); },
    floor(c, S, t, age) {
      const st = S.st; if (!st.floor) return;
      const g = easeOut(clamp01(age / 0.9)), b = pulse(S.since() - st.beat0), k = (0.12 + 0.3 * b) * clamp01(age / 0.15) * (1 - 0.5 * clamp01((age - 2) / 3));   // (bright as it opens, settling to a glow under the dance)
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      const map = (x, y) => ({ x: st.fx + x, y: st.fy + y });
      for (const cr of st.floor) {
        path(c, cr.pts, g, map);
        c.strokeStyle = `rgba(255,120,30,${0.3 * k})`; c.lineWidth = cr.w * 4; c.stroke();
        c.strokeStyle = `rgba(255,214,140,${0.6 * k})`; c.lineWidth = cr.w * 0.9; c.stroke();
      }
      c.restore();
    },
    body(c, S, t, age) {
      const st = S.st; if (!st.cracks) return;
      const b = pulse(S.since() - st.beat0), open = clamp01(age / 0.15) * S.present();
      drawBodyCracks(c, S, st.cracks, open * (0.55 + 0.6 * b), easeOut(clamp01(age / 0.7)));
      drawCore(c, S, b, open * (0.7 + 0.3 * b));
      // embers shaken off him on each lub
      const i = Math.floor((S.since() - st.beat0 - LUB) / BEAT);
      if (i >= 0 && i !== st.lastBeat) { st.lastBeat = i; embersOff(S, 6); }
    },
    broke(S) {
      const st = S.st;
      if (!st.cracks) { st.cracks = bodyCracks(); }
      S.play('wall-wyrm-close');
      // the last two beats: the cracks flare white, then the Heart slams shut and the light goes out of him
      const flare = now();
      VFX.fx({ dur: 2.2, layer: 'air', draw: (c, p) => {
        const tt = now() - flare;
        if (tt < 0.3) { const k = 0.9 + 0.6 * Math.exp(-tt / 0.08); drawBodyCracks(c, S, st.cracks, k, 1, '255,190,90', '255,255,240'); drawCore(c, S, 1, 1, '255,210,120'); }
        else { const q = clamp01((tt - 0.3) / 1.9); drawBodyCracks(c, S, st.cracks, 0.7 * (1 - q) * (1 - q), 1, '150,40,20', '210,90,40'); }
      } });
      S.later(0.3, () => {
        const bd = S.bd, ch = onBody(S, 8, 0);
        S.cam('stop', 0.1); S.cam('flash', '#fff0d0', 0.25, 0.4); S.cam('punch', 0.035, 0.5);
        S.shake(12);
        S.ring(bd.x, bd.y, { r: 380, color: '#ffe0a0', w: 10, dur: 0.75 });
        VFX.sparks(ch.x, ch.y, { color: '#ffe0a0', n: 24, speed: 480, up: 200 });
        for (let i = 0; i < 3; i++) S.later(i * 0.18, () => { const q = onBody(S, rand(-20, 20), rand(-18, 18)); VFX.smoke(q.x, q.y, { color: '#8a8480', n: 4, size: 34, a: 0.4, speed: 70 }); });
        S.muffle(0, 0.25); S.swell(0.3, 1.8);
      });
    },
  });

  // ---- the Last Ember
  WallFx.moment('wyrm', 'Last Ember', {
    up(S) {
      const bd = S.bd, st = S.st;
      st.cracks = bodyCracks(); st.next = 0;
      S.play('wall-wyrm-rise');
      S.muffle(450, 0.6);
      S.later(0.8, () => S.loop('wall-wyrm-storm', { vol: 0.75, fade: 1.2 }));
      S.cam('flash', '#ff9a40', 0.25, 0.5); S.cam('dim', 0.3, 0.9);
      S.lean(0.04, 0.6, 0.6, 1.4);
      S.shake(8);
      S.ring(bd.x, bd.y, { r: 380, color: '#ff8a2a', w: 8, dur: 1.0 });
      VFX.motes(bd.x, bd.y, { color: '#ffb040', n: 24, r: 90 * S.sc, rise: 1.4, life: 1.6 });
    },
    quiet(S) { S.st.cracks = bodyCracks(); S.st.next = 0; S.loop('wall-wyrm-storm', { vol: 0.75, fade: 1 }); S.muffle(450, 1); },
    body(c, S, t, age) {
      const st = S.st; if (!st.cracks) return;
      const flick = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3), pr = S.present();
      drawBodyCracks(c, S, st.cracks, clamp01(age / 0.4) * flick * pr, easeOut(clamp01(age / 0.6)), '255,160,60', '255,248,225');
      drawCore(c, S, 0.6 + 0.4 * flick, clamp01(age / 0.4) * pr);
      // the crater's fire drawn up into him: embers lift off the floor all round and stream to his chest (about thirty a second)
      const tn = S.since();
      if (tn < st.next) return;
      st.next = tn + 1 / 30;
      const R = typeof ARENA !== 'undefined' && ARENA.inner ? ARENA.inner : 520, a = rand(0, TAU), d = rand(0.35, 0.95) * R;
      const x = Math.cos(a) * d, y = Math.sin(a) * d, ch = pr > 0.5 ? onBody(S, 8, 0) : { x: x * 0.2, y: y * 0.2 - 120 }, life = rand(0.9, 1.4);   // (out of sight on his run: they rise toward the sky over the crater)
      VFX.spawn({ x, y, z: 0, vx: (ch.x - x) / life, vy: (ch.y - y) / life, vz: rand(30, 70), drag: 0, life, size: rand(3, 6), size1: 1, color: Math.random() < 0.5 ? '#ffb040' : '#ff7a1a' });
    },
    broke(S) {
      const bd = S.bd, x = bd.x, y = bd.y;
      S.play('wall-wyrm-fall');
      S.cam('stop', 0.14); S.cam('flash', '#fff0d0', 0.3, 0.5); S.cam('punch', 0.04, 0.6);
      S.shake(15);
      S.muffle(0, 0.15); S.swell(0.35, 2.4);
      S.ring(x, y, { r: 540, color: '#ffd27a', w: 14, dur: 1.0 });
      S.ring(x, y, { r: 300, color: '#fff3c8', w: 6, dur: 0.6, delay: 0.05 });
      VFX.sparks(x, y - 30, { color: '#ffe0a0', n: 40, speed: 640, up: 280 });
      VFX.debris(x, y, { color: '#2a1c18', n: 12, speed: 1.4, hot: true });
      VFX.smoke(x, y, { color: '#4a3a38', n: 8, size: 40, a: 0.45, speed: 110 });
      // ash coming down over the crater: pale flakes drifting and turning, a few last embers among them
      const R = typeof ARENA !== 'undefined' && ARENA.inner ? ARENA.inner : 520;
      const ash = n => { for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), d = Math.sqrt(Math.random()) * R, ember = Math.random() < 0.12;
        VFX.spawn({ x: Math.cos(a) * d, y: Math.sin(a) * d, z: rand(120, 320), vx: rand(-14, 14), vy: rand(-6, 10), vz: -rand(30, 60), drag: 0,
          life: rand(3.5, 6), size: rand(2, 4), size1: rand(1, 2), color: ember ? '#ffb040' : '#d8d0c8', add: ember, a: ember ? 1 : 0.55, flutter: rand(2, 5) });
      } };
      for (let k = 0; k < 6; k++) S.later(0.3 + k * 0.45, () => ash(15));
    },
  });
})();
