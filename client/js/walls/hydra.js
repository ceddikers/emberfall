// The Hydra's wall (wall-fx.js): the Mother's Heart (10%), never told in words.
//   The idea: the Mother is nine heads on one body, and the Heart is what feeds them. So the moment is about blood and bronze and still water.
//   The rise: her chest opens on a gold light that stands up through the roof of the temple, the pool is thrown outward in a crown round her, and the
//     first two great beats are felt before they are heard to settle. Then the light runs out of her down the nine necks (gold veins growing across
//     the floor to the nine columns, the first of them already glowing in her own coils) and the Heart begins to beat under the fight.
//   The hold: every beat of the Heart (the sound keeps one time with the glow already in her chest: wall-hydra-heart is 2 pi / 3.4 s long, the period
//     of that glow) sends a bright pulse out along each vein to its neck root and on to the column, swells the core, lights a rim of seal round her
//     coils, lifts a few gold motes and sends one pale ring over the pool. The music is held down for the rise and then comes back dark and warm.
//   The break: two last beats while the veins draw all their light back into her, the Heart slams shut (a white flash in the chest, the seal's rim
//     bursts into nine shards, the pool is thrown up round her in a crown with mist after it, rings run out over the water) and the music comes back.
// Everything here is drawn on her body (body), thin and under the telegraphs (floor), or brief in the air.

(() => {
  if (typeof WallFx === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000);

  // the Heart's time: hydra-art.js breathes the glow in her chest at sin(3.4 t); sfx-synth.js 'wall-hydra-heart' is one period of it (lub, then dub)
  const GLOW = 3.4, BEAT = TAU / GLOW, LUB = 0.01, DUB = 0.36;
  const pulse = tt => {
    if (tt < 0) return 0;
    const q = tt % BEAT, a = q - LUB, b = q - DUB;
    return (a >= 0 ? Math.exp(-a / 0.12) : 0) + (b >= 0 ? 0.65 * Math.exp(-b / 0.1) : 0);
  };
  const GOLD = '255,208,96', PALE = '255,240,196', HOT = '255,252,236';
  const NECKS = 9, nAng = k => -Math.PI / 2 + k * TAU / NECKS;
  const R0 = 58, R1 = 388;   // a vein runs from her coils (the neck roots) out to the foot of its column (the columns stand at 400)

  // the body is drawn square to the room, centred on her (bosses.js drawBoss, hydra-art.js): a point of her body in the art's units
  const P = (S, x, y) => ({ x: S.bd.x + x * S.sc, y: S.bd.y + y * S.sc });

  // one vein of light per neck: points out from her coils to the column, wandering a little, a fork or two. The same angles carry the cracks in her coils.
  function makeVeins() {
    return Array.from({ length: NECKS }, (_, k) => {
      const a = nAng(k), ca = Math.cos(a), sa = Math.sin(a), n = 12, pts = [];
      let side = 0;
      for (let i = 0; i <= n; i++) {
        side += rand(-4, 4); side *= 0.8;
        const r = R0 + (R1 - R0) * i / n;
        pts.push([ca * r - sa * side, sa * r + ca * side]);
      }
      const forks = [];
      for (let j = 0; j < 2; j++) {
        const i0 = 3 + (Math.random() * 6 | 0), p = pts[i0], fa = a + (Math.random() < 0.5 ? 0.55 : -0.55) + rand(-0.15, 0.15), fl = rand(34, 66);
        forks.push([p, [p[0] + Math.cos(fa) * fl * 0.5, p[1] + Math.sin(fa) * fl * 0.5 + rand(-3, 3)], [p[0] + Math.cos(fa + 0.2) * fl, p[1] + Math.sin(fa + 0.2) * fl]]);
      }
      return { a, pts, forks, seed: rand(0, TAU) };
    });
  }
  // cracks of gold across her coils (in her art units), from the chest toward each neck root
  function makeCracks() {
    return Array.from({ length: NECKS }, (_, k) => {
      const a = nAng(k), pts = [[0, 0]]; let x = 0, y = 0, aa = a;
      for (let j = 1; j <= 4; j++) { aa += rand(-0.3, 0.3); const l = 12.5; x += Math.cos(aa) * l; y += Math.sin(aa) * l * 0.86; pts.push([x, y]); }
      return { a, pts, w: rand(1.2, 1.8) };
    });
  }
  // a polyline grown to g (0-1) of its length from its first point
  function grow(c, pts, g, map) {
    const n = pts.length - 1, upto = g * n;
    c.beginPath();
    for (let j = 0; j <= n && j <= upto + 1; j++) {
      let [x, y] = pts[j];
      if (j > upto) { const [px, py] = pts[j - 1], q = upto - (j - 1); x = px + (x - px) * q; y = py + (y - py) * q; }
      const p = map(x, y); j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y);
    }
  }
  const glowAt = (c, x, y, r, col, a) => {
    if (a <= 0.01) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${Math.min(1, a)})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };
  // where the front of a beat has got to along a vein, in px out from her chest (it runs out fast and slows)
  const front = tt => (R1 + 10) * (1 - Math.pow(1 - clamp01(tt / 1.1), 2.4));
  // the veins on the floor round her (faint, under the telegraphs). tt: seconds into the beat (-1: none), k: how bright, g: how far grown
  function drawVeins(c, S, veins, tt, k, g, hot = GOLD, core = PALE) {
    const map = (x, y) => ({ x: S.bd.x + x, y: S.bd.y + y });
    const b = pulse(tt), d = tt >= 0 ? front(tt) : -1, fade = tt >= 0 ? clamp01(1 - tt / 1.1) : 0;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const v of veins) {
      const gg = clamp01(g * 1.04); if (gg <= 0) continue;
      grow(c, v.pts, gg, map);
      c.strokeStyle = `rgba(${hot},${0.1 * k * (0.7 + 0.5 * b)})`; c.lineWidth = 7; c.stroke();
      c.strokeStyle = `rgba(${core},${0.26 * k * (0.7 + 0.6 * b)})`; c.lineWidth = 1.5; c.stroke();
      if (gg > 0.5) for (const f of v.forks) {
        grow(c, f, clamp01((gg - 0.4) / 0.5), map);
        c.strokeStyle = `rgba(${hot},${0.08 * k * (0.7 + 0.5 * b)})`; c.lineWidth = 4; c.stroke();
        c.strokeStyle = `rgba(${core},${0.18 * k * (0.7 + 0.5 * b)})`; c.lineWidth = 1; c.stroke();
      }
      if (d > 0 && gg > 0.99) {   // the beat's front: a spot of light running out along the vein
        const i = clamp01((d - R0) / (R1 - R0)) * (v.pts.length - 1), i0 = Math.min(v.pts.length - 2, Math.floor(i)), q = i - i0;
        if (d >= R0 - 6) {
          const p = map(v.pts[i0][0] + (v.pts[i0 + 1][0] - v.pts[i0][0]) * q, v.pts[i0][1] + (v.pts[i0 + 1][1] - v.pts[i0][1]) * q);
          glowAt(c, p.x, p.y, 22, hot, 0.5 * fade * k); glowAt(c, p.x, p.y, 8, HOT, 0.6 * fade * k);
        }
      }
    }
    c.restore();
  }

  // ---- the Mother's Heart
  WallFx.moment('hydra', "Mother's Heart", {
    up(S) {
      const bd = S.bd, st = S.st, ch = P(S, 0, 0);
      st.veins = makeVeins(); st.cracks = makeCracks(); st.beat0 = null; st.want = 1.6; st.lastBeat = -1;
      S.play('wall-hydra-up');
      S.muffle(260, 0.15);
      S.later(1.9, () => S.muffle(2200, 2.6));   // (the music comes back warm and dark for the dance)
      S.cam('stop', 0.12); S.cam('flash', '#ffe08a', 0.4, 0.6); S.cam('dim', 0.35, 1.0);
      S.lean(0.06, 0.35, 1.0, 1.5);
      S.shake(14);
      // her chest opening: a shaft of gold light up through the roof of the temple, the pool thrown out round her in a crown
      VFX.pillar(ch.x, ch.y, { r: 40 * S.sc, h: 480, color: '#ffd870', dur: 1.4 });
      VFX.flash(ch.x, ch.y, 230, '#ffe9a8', 0.38);
      VFX.sparks(ch.x, ch.y, { color: '#ffe08a', n: 26, speed: 520, up: 240 });
      for (let k = 0; k < NECKS; k++) { const q = P(S, Math.cos(nAng(k)) * 58, Math.sin(nAng(k)) * 50); VFX.splash(q.x, q.y, { n: 5, speed: 1.4, size: 1.1, color: '#d8fff4' }); }
      VFX.smoke(ch.x, ch.y, { color: '#d8f0e4', n: 5, size: 30, a: 0.3, speed: 80 });
      S.ring(bd.x, bd.y, { r: 450, color: '#ffe08a', w: 12, dur: 1.0 });
      S.ring(bd.x, bd.y, { r: 300, color: '#e8fff4', w: 6, dur: 0.6, delay: 0.07 });
      // the first two great beats (with the sound's)
      for (const [at, r, n] of [[0.72, 320, 8], [1.06, 230, 5]]) S.later(at, () => {
        const q = P(S, 0, 0);
        S.ring(S.bd.x, S.bd.y, { r, color: '#ffd870', w: 6, dur: 0.65 }); VFX.flash(q.x, q.y, 130, '#ffe9a8', 0.22); S.shake(n);
        VFX.motes(q.x, q.y, { color: '#ffe08a', n: 6, r: 50 * S.sc, rise: 1, life: 1.5 });
      });
    },
    quiet(S) {
      const st = S.st;
      st.veins = makeVeins(); st.cracks = makeCracks(); st.beat0 = null; st.want = 0.1; st.lastBeat = -1;
      S.muffle(2200, 1);
    },
    floor(c, S, t, age) {
      const st = S.st; if (!st.veins) return;
      const tt = st.beat0 == null ? -1 : S.since() - st.beat0;
      const g = easeOut(clamp01((age - 0.3) / 1.4)), k = clamp01(age / 0.3) * (1 - 0.15 * clamp01((age - 2) / 3));
      drawVeins(c, S, st.veins, tt, k, g);
      // the pool answers each lub with one pale ring (thin, faint)
      if (tt >= 0) {
        const q = (tt % BEAT) / 1.2;
        if (q < 1 && age > 1.5) {
          const R = 90 + 330 * easeOut(q);
          c.save(); c.translate(S.bd.x, S.bd.y + 6); c.scale(1, 0.9);
          c.strokeStyle = `rgba(${PALE},${0.16 * (1 - q) * (1 - q)})`; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
          c.restore();
        }
      }
    },
    body(c, S, t, age) {
      const st = S.st; if (!st.cracks) return;
      const pr = S.present(), open = clamp01(age / 0.15) * pr;
      // find the first beat of the glow in her chest (hydra-art.js: sin(3.4 t) peaks at t = pi/2 / 3.4) and start the Heart's sound on it, so the two keep time
      if (st.beat0 == null && st.want != null && S.since() >= st.want) {
        const w = ((Math.PI / 2 - GLOW * t) % TAU + TAU) % TAU / GLOW;
        st.beat0 = S.since() + w;
        S.later(w, () => S.loop('wall-hydra-heart', { vol: 0.85, fade: 0.12 }));
      }
      const tt = st.beat0 == null ? -1 : S.since() - st.beat0, b = pulse(tt);
      const gc = easeOut(clamp01(age / 0.6)), ch = P(S, 0, 0);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      // cracks of light across her coils, out to the nine neck roots
      const map = (x, y) => P(S, x, y);
      for (const cr of st.cracks) {
        grow(c, cr.pts, gc, map);
        c.strokeStyle = `rgba(${GOLD},${Math.min(1, (0.3 + 0.3 * b) * open)})`; c.lineWidth = cr.w * 3.6 * S.sc; c.stroke();
        c.strokeStyle = `rgba(${PALE},${Math.min(1, (0.55 + 0.4 * b) * open)})`; c.lineWidth = cr.w * S.sc; c.stroke();
      }
      // the front of each beat crossing her coils
      if (tt >= 0 && open > 0.05) {
        const d = front(tt) / S.sc, fade = clamp01(1 - tt / 1.1);
        if (d < 56) for (const cr of st.cracks) { const p = P(S, Math.cos(cr.a) * d, Math.sin(cr.a) * d * 0.86); glowAt(c, p.x, p.y, 16 * S.sc, GOLD, 0.6 * fade * open); }
      }
      // the seal: a rim of light round her coils, nine nodes on it, swelling with each beat
      c.lineWidth = 2.2 * S.sc * 0.8; c.strokeStyle = `rgba(${PALE},${(0.2 + 0.4 * b) * open})`;
      c.beginPath(); c.ellipse(ch.x, ch.y, 66 * S.sc * (1 + 0.012 * b), 56 * S.sc * (1 + 0.012 * b), 0, 0, TAU); c.stroke();
      for (let k = 0; k < NECKS; k++) {
        const a = nAng(k), p = P(S, Math.cos(a) * 66, Math.sin(a) * 56);
        c.fillStyle = `rgba(${PALE},${(0.35 + 0.55 * b) * open})`;
        c.save(); c.translate(p.x, p.y); c.rotate(a + Math.PI / 2); c.beginPath(); c.moveTo(0, -7); c.lineTo(3.6, 1); c.lineTo(0, 4); c.lineTo(-3.6, 1); c.closePath(); c.fill(); c.restore();
      }
      // the brass collar flaring and the white-hot core in her chest, swelling on the beat
      c.lineWidth = 3; c.strokeStyle = `rgba(${GOLD},${(0.12 + 0.55 * b) * open})`;
      c.beginPath(); c.ellipse(ch.x, ch.y, 29 * S.sc, 25 * S.sc, 0, 0, TAU); c.stroke();
      glowAt(c, ch.x, ch.y, (28 + 18 * b) * S.sc, GOLD, (0.4 + 0.35 * b) * open);
      glowAt(c, ch.x, ch.y, (12 + 6 * b) * S.sc, HOT, (0.5 + 0.4 * b) * open);
      c.restore();
      // a few gold motes lifted off her on each lub
      if (tt >= LUB) {
        const i = Math.floor((tt - LUB) / BEAT);
        if (i !== st.lastBeat) { st.lastBeat = i; if (pr > 0.5) VFX.motes(ch.x, ch.y, { color: '#ffe08a', n: 3, r: 46 * S.sc, rise: 1, life: 1.5 }); }
      }
    },
    broke(S) {
      const st = S.st, bd = S.bd;
      if (!st.veins) { st.veins = makeVeins(); st.cracks = makeCracks(); }
      const veins = st.veins, cracks = st.cracks, x0 = now(), ch = P(S, 0, 0);
      S.play('wall-hydra-break');
      // the two last beats: every vein draws its light back into her (a front running inward) as the core swells and flares white
      VFX.fx({ dur: 1.7, layer: 'ground', draw: (c, p, t, e) => {
        const tt = now() - x0;
        if (typeof ARENA !== 'undefined' && ARENA.trace) { c.save(); ARENA.trace(c, 4); c.clip(); }
        if (tt < 0.32) {
          const k = 1.2 + 1.2 * clamp01(tt / 0.3), inward = R1 * (1 - clamp01(tt / 0.3));
          const map = (x, y) => ({ x: bd.x + x, y: bd.y + y });
          c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
          for (const v of veins) {
            grow(c, v.pts, 1, map);
            c.strokeStyle = `rgba(${GOLD},${0.2 * k})`; c.lineWidth = 8; c.stroke();
            c.strokeStyle = `rgba(${HOT},${0.5 * k})`; c.lineWidth = 2; c.stroke();
            const i = clamp01((inward - R0) / (R1 - R0)) * (v.pts.length - 1), i0 = Math.min(v.pts.length - 2, Math.floor(i)), q = i - i0;
            const pp = map(v.pts[i0][0] + (v.pts[i0 + 1][0] - v.pts[i0][0]) * q, v.pts[i0][1] + (v.pts[i0 + 1][1] - v.pts[i0][1]) * q);
            glowAt(c, pp.x, pp.y, 26, GOLD, 0.7); glowAt(c, pp.x, pp.y, 9, HOT, 0.8);
          }
          c.restore();
        } else {
          const q = clamp01((tt - 0.32) / 0.55);
          if (q < 1) {   // a last white line down every vein, gone at once
            const map = (x, y) => ({ x: bd.x + x, y: bd.y + y });
            c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
            for (const v of veins) { grow(c, v.pts, 1, map); c.strokeStyle = `rgba(${HOT},${0.8 * (1 - q) * (1 - q)})`; c.lineWidth = 2.5 * (1 - q) + 0.5; c.stroke(); }
            c.restore();
          }
        }
        if (typeof ARENA !== 'undefined' && ARENA.trace) c.restore();
      } });
      // her chest: the core swells, flares white as the Heart slams shut, then goes dark amber and is gone (the art closes the moment the seal is gone)
      VFX.fx({ dur: 2.0, layer: 'air', draw: (c, p, t, e) => {
        const tt = now() - x0, pr = S.present(), q = P(S, 0, 0);
        c.save(); c.globalCompositeOperation = 'lighter';
        if (tt < 0.32) {
          const sw = clamp01(tt / 0.3);
          glowAt(c, q.x, q.y, (34 + 26 * sw) * S.sc, GOLD, (0.6 + 0.4 * sw) * pr); glowAt(c, q.x, q.y, (14 + 8 * sw) * S.sc, HOT, 0.9 * pr);
          c.lineWidth = 3; c.strokeStyle = `rgba(${PALE},${0.6 * pr})`; c.beginPath(); c.ellipse(q.x, q.y, 66 * S.sc, 56 * S.sc, 0, 0, TAU); c.stroke();
        } else {
          const u = clamp01((tt - 0.32) / 1.5), w = Math.exp(-(tt - 0.32) / 0.07);
          glowAt(c, q.x, q.y, (40 + 20 * w) * S.sc, w > 0.05 ? HOT : '255,150,60', (0.9 * w + 0.35 * (1 - u) * (1 - u)) * pr);
        }
        c.restore();
      } });
      S.later(0.32, () => {
        const q = P(S, 0, 0);
        S.cam('stop', 0.13); S.cam('flash', '#fff2cc', 0.32, 0.45); S.cam('punch', 0.04, 0.5);
        S.shake(16);
        // the seal's rim bursts into nine shards, the pool is thrown up round her and falls as mist
        S.shatter({ rx: 66, ry: 56, cy: 0, n: NECKS, color: '#ffd870', edge: '#fff6d6', push: 1.15, bits: 22 });
        S.ring(S.bd.x, S.bd.y, { r: 580, color: '#ffe9a8', w: 14, dur: 1.0 });
        S.ring(S.bd.x, S.bd.y, { r: 340, color: '#fff6d6', w: 6, dur: 0.6, delay: 0.05 });
        S.ring(S.bd.x, S.bd.y, { r: 470, color: '#e8fff4', w: 5, dur: 0.9, delay: 0.16 });
        VFX.flash(q.x, q.y, 220, '#fff4d0', 0.24);
        VFX.sparks(q.x, q.y, { color: '#ffe9a8', n: 30, speed: 560, up: 240 });
        for (let k = 0; k < NECKS; k++) { const a = nAng(k), r = P(S, Math.cos(a) * 62, Math.sin(a) * 52); VFX.splash(r.x, r.y, { n: 6, speed: 1.5, size: 1.2, color: '#d8fff4' }); }
        for (let i = 0; i < 4; i++) S.later(i * 0.16, () => { const m = P(S, rand(-40, 40), rand(-30, 30)); VFX.smoke(m.x, m.y, { color: '#dff2ea', n: 4, size: 38, a: 0.3, speed: 75 }); });
        VFX.motes(q.x, q.y, { color: '#ffe08a', n: 14, r: 70 * S.sc, rise: 1.2, life: 2 });
        S.muffle(0, 0.25); S.swell(0.32, 2.0);
      });
      // the pool settling: two slow rings after the blow
      for (const [at, r] of [[0.95, 260], [1.5, 200]]) S.later(at, () => S.ring(S.bd.x, S.bd.y, { r, color: '#e8fff4', w: 3, dur: 1.1 }));
    },
  });
})();
