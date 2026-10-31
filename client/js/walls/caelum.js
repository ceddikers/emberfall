// Caelum Vey's wall (wall-fx.js): the moment, never told in words.
//   The Starwyrm (52%): the fight already plays a great deal here (arena/bosses/caelum.js + caelum-fx.js: the ring of gold and the flare when the
//     sky comes loose, the serpent of stars coiling the room, rearing, breathing, unravelling), so this moment does not add a second spectacle. It
//     frames that one. The seal goes up as a held breath: the light drains out of the sky and the music sinks, a thin glass chime closes round
//     him (the flare of the sky coming loose lands right after it, as the release of that breath). While the serpent runs, a ring of nine stars
//     stands round his halo, joined as a constellation and turning slowly, each with a thread of light drawn up into the sky; a star flares each
//     time the held sound twinkles (the sound and the light keep one time), and the half-buried star answers on the floor, faintly. When the seal
//     breaks the ring flares white and goes: shards of silver glass fly from where it stood, the stars it was made of rise back into the sky,
//     and the music comes back whole. (The Ascendant cast starts half a second later, so the break is brief and clean, a hand-off.)
// Everything here is on his body (body), thin and faint under the telegraphs (floor), or a few brief motes in the air. Silver and pale gold only.

(() => {
  if (typeof WallFx === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const easeOut = q => 1 - (1 - q) * (1 - q);

  // the held sound ('wall-caelum-vigil', sfx-synth.js) is a 6 s bed twinkling eight times: [time in the loop, which of the nine stars answers]
  const LOOP = 6.0, PINGS = [[0.6, 0], [1.25, 5], [1.95, 2], [2.55, 7], [3.3, 4], [4.05, 1], [4.6, 8], [5.4, 3]];
  const N = 9, RING = 74;   // (the ring's radius in his own units: just outside his halo)

  // the nine stars of the ring, in his units from the middle of his halo (0, -88), and the lines that join them
  const STARS = Array.from({ length: N }, (_, i) => { const a = i * TAU / N + 0.35 + Math.sin(i * 2.1) * 0.1, r = RING * (0.92 + 0.12 * Math.sin(i * 3.7)); return { a, r, w: 0.75 + 0.5 * ((i * 0.37) % 1) }; });
  const LINES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [0, 3], [3, 6], [2, 5]];

  const halo = S => ({ x: S.bd.x, y: S.bd.y - 88 * S.sc });
  const starAt = (S, i, rot, grow) => { const s = STARS[i], a = s.a + rot, r = s.r * grow; return { x: S.bd.x + Math.cos(a) * r * S.sc, y: S.bd.y + (-88 + Math.sin(a) * r) * S.sc }; };

  // how lit each star is by the held sound's twinkles
  function flare(S, i) {
    const st = S.st; if (st.l0 == null) return 0;
    const u = ((S.since() - st.l0) % LOOP + LOOP) % LOOP;
    let k = 0;
    for (const [pt, idx] of PINGS) if (idx === i) { const d = ((u - pt) % LOOP + LOOP) % LOOP; k = Math.max(k, Math.exp(-d / 0.4)); }
    return k;
  }
  const flareAll = S => { let k = 0; for (let i = 0; i < N; i++) k = Math.max(k, flare(S, i)); return k; };

  const glow = (c, x, y, r, rgb, a) => {
    if (a <= 0.004 || r <= 0.5) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };
  // a four-pointed star: a long thin one under a short fat one
  const star4 = (c, x, y, r, rot, a) => {
    if (a <= 0.01 || r <= 0.3) return;
    c.save(); c.translate(x, y); c.rotate(rot);
    for (const [R, w, rgb, al] of [[r * 1.8, 0.14, '255,224,150', 0.85], [r, 0.32, '255,255,255', 1]]) {
      c.beginPath();
      for (let k = 0; k < 4; k++) { const ang = k * Math.PI / 2, ax = Math.cos(ang) * R, ay = Math.sin(ang) * R, bx = Math.cos(ang + Math.PI / 4) * R * w, by = Math.sin(ang + Math.PI / 4) * R * w; c.lineTo(ax, ay); c.lineTo(bx, by); }
      c.closePath(); c.fillStyle = `rgba(${rgb},${Math.min(1, al * a)})`; c.fill();
    }
    c.restore();
  };

  // the ring and its constellation on his body. k: how much of it is there (0-1), age: seconds since the seal went up, extra: a flare on all (the break)
  function drawRing(c, S, t, age, k, extra = 0, grow = 1) {
    if (k <= 0.01) return;
    const h = halo(S), sc = S.sc, rot = t * 0.12, formed = easeOut(clamp01(age / 0.9)), g = grow * (1 + (1 - formed) * 0.7);
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    // the two rings (the outer one thin and whole, the inner one a dashed trace turning the other way)
    c.lineWidth = 1.3; c.strokeStyle = `rgba(214,222,244,${(0.4 + 0.35 * extra) * k * formed})`;
    c.beginPath(); c.arc(h.x, h.y, RING * 0.995 * g * sc, 0, TAU); c.stroke();
    c.lineWidth = 1; c.strokeStyle = `rgba(255,236,180,${(0.2 + 0.3 * extra) * k * formed})`; c.setLineDash([9 * sc, 7 * sc]); c.lineDashOffset = t * 6;
    c.beginPath(); c.arc(h.x, h.y, RING * 0.84 * g * sc, 0, TAU); c.stroke(); c.setLineDash([]);
    // the threads: each star drawn up into the sky, thin and faint
    for (let i = 0; i < N; i++) {
      const born = 0.25 + i * 0.1, q = easeOut(clamp01((age - born) / 0.6)); if (q <= 0) continue;
      const p = starAt(S, i, rot, g), fl = flare(S, i), len = (70 + 40 * STARS[i].w) * sc * q;
      const gr = c.createLinearGradient(p.x, p.y, p.x, p.y - len);
      gr.addColorStop(0, `rgba(255,240,200,${(0.3 + 0.25 * fl + 0.3 * extra) * k})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
      c.strokeStyle = gr; c.lineWidth = 1.1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.sin(t * 0.9 + i) * 3 * sc, p.y - len); c.stroke();
    }
    // the constellation: faint lines, drawn as the stars come
    for (const [a, b] of LINES) {
      const qa = easeOut(clamp01((age - 0.25 - a * 0.1) / 0.6)), qb = easeOut(clamp01((age - 0.25 - b * 0.1) / 0.6)), q = Math.min(qa, qb); if (q <= 0) continue;
      const pa = starAt(S, a, rot, g), pb = starAt(S, b, rot, g);
      c.strokeStyle = `rgba(255,238,190,${(0.28 + 0.25 * Math.max(flare(S, a), flare(S, b)) + 0.4 * extra) * k * q})`; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(pa.x, pa.y); c.lineTo(pa.x + (pb.x - pa.x) * q, pa.y + (pb.y - pa.y) * q); c.stroke();
    }
    // the stars
    for (let i = 0; i < N; i++) {
      const born = 0.25 + i * 0.1, q = easeOut(clamp01((age - born) / 0.5)); if (q <= 0) continue;
      const p = starAt(S, i, rot, g), fl = Math.min(1, flare(S, i) + extra), r = (2.6 + 1.4 * STARS[i].w) * sc * q * (1 + 0.5 * fl);
      glow(c, p.x, p.y, r * (3.6 + 2.5 * fl), '255,214,120', (0.3 + 0.4 * fl) * k);
      star4(c, p.x, p.y, r, t * 0.4 + i, (0.75 + 0.25 * fl) * k);
    }
    c.restore();
  }

  WallFx.moment('caelum', 'The Starwyrm', {
    up(S) {
      const st = S.st;
      st.next = 0; st.last = -1;
      // the breath: the light drains out of the sky and the music sinks (the sky coming loose, the gold ring and the flare, are the fight's own and land a moment after)
      S.play('wall-caelum-seal');
      S.muffle(320, 0.4);
      S.later(3.2, () => S.muffle(2000, 3));   // (a heavier, hushed version of the music for the dance; it opens fully at the break)
      S.later(0.6, () => { st.l0 = S.since(); S.loop('wall-caelum-vigil', { vol: 0.8, fade: 1.4 }); });
      S.cam('dim', 0.3, 1.0);
      S.lean(0.04, 0.5, 0.9, 1.4);
      // the stars of the room lift a little off the floor toward the sky, brief and few
      for (let i = 0; i < 9; i++) S.later(0.15 + i * 0.1, () => {
        const a = rand(0, TAU), d = rand(0.3, 0.9) * (typeof ARENA !== 'undefined' && ARENA.inner ? ARENA.inner : 480);
        VFX.spawn({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.85, z: 0, vx: rand(-6, 6), vy: rand(-4, 4), vz: rand(70, 140), life: rand(1.0, 1.6), size: rand(4, 7), size1: 0, color: Math.random() < 0.5 ? '#ffe9a8' : '#e8ecff', kind: 'star' });
      });
    },
    quiet(S) { const st = S.st; st.next = 0; st.last = -1; st.l0 = S.since(); S.loop('wall-caelum-vigil', { vol: 0.8, fade: 1 }); S.muffle(2000, 1); },
    floor(c, S, t, age) {
      // his constellation laid flat on the floor under him, as the shadow of the ring, and the half-buried star answering the twinkles (all faint)
      const k = clamp01(age / 0.8) * S.present(), fa = flareAll(S);
      if (k <= 0.01) return;
      const x = S.bd.x, y = S.bd.y + 10, sc = S.sc, rot = -t * 0.12;
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      c.translate(x, y); c.scale(1, 0.4);
      c.lineWidth = 2; c.strokeStyle = `rgba(214,222,244,${0.12 * k})`; c.beginPath(); c.arc(0, 0, RING * 1.15 * sc, 0, TAU); c.stroke();
      const P = STARS.map(s => [Math.cos(s.a + rot) * s.r * 1.15 * sc, Math.sin(s.a + rot) * s.r * 1.15 * sc]);
      c.lineWidth = 1.4; c.strokeStyle = `rgba(255,238,190,${0.09 * k})`;
      c.beginPath(); for (const [a, b] of LINES) { c.moveTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); } c.stroke();
      for (let i = 0; i < N; i++) { const fl = flare(S, i); glow(c, P[i][0], P[i][1], (10 + 12 * fl) * sc, '255,224,150', (0.16 + 0.3 * fl) * k); }
      c.restore();
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, 0, 170, '255,224,150', (0.04 + 0.1 * fa) * k); c.restore();
    },
    body(c, S, t, age) {
      const st = S.st, pr = S.present(), k = clamp01(age / 0.3) * pr;
      drawRing(c, S, t, age, k);
      // a glint from the ring now and then, going up (a star in the air a moment, no more)
      const tn = S.since();
      if (pr > 0.5 && tn >= (st.next || 0)) {
        st.next = tn + rand(0.3, 0.6);
        const p = starAt(S, (Math.random() * N) | 0, t * 0.12, 1);
        VFX.spawn({ x: p.x, y: S.bd.y + 8, z: (S.bd.y - p.y) + 6, vx: rand(-5, 5), vy: 0, vz: rand(30, 70), life: rand(0.7, 1.1), size: rand(3, 5), size1: 0, color: Math.random() < 0.5 ? '#ffe9a8' : '#ffffff', kind: 'star' });
      }
    },
    broke(S) {
      const bd = S.bd, sc = S.sc, h = halo(S);
      S.play('wall-caelum-break');
      S.cam('stop', 0.1); S.cam('flash', '#fff6dc', 0.2, 0.4); S.cam('punch', 0.03, 0.5);
      S.shake(8);
      S.muffle(0, 0.25); S.swell(0.3, 1.8);
      // the ring flares white and goes: it comes apart in silver glass round his halo, and a ring of light runs out across the floor
      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      VFX.fx({ dur: 0.45, layer: 'air', draw: (c, p, tt) => {
        const q = clamp01(p / 0.5), k = (1 - q) * S.present();
        S.st.l0 = null;
        drawRing(c, S, t0 + tt, 9, k, 1 - q * 0.5, 1 + 0.35 * easeOut(q));
      } });
      S.shatter({ rx: RING, ry: RING, cy: -88, color: '#dfe3f2', edge: '#ffffff', n: 9, bits: 18, push: 0.9 });
      S.ring(bd.x, bd.y, { r: 400, color: '#e8ecff', w: 9, dur: 0.8 });
      S.ring(bd.x, bd.y, { r: 230, color: '#ffeebb', w: 5, dur: 0.55, delay: 0.07 });
      VFX.flash(h.x, h.y, 190, '#fff4d0', 0.22);
      // the stars it was made of go back up into the sky
      for (let i = 0; i < 22; i++) {
        const s = STARS[i % N], a = s.a + (t0 * 0.12), x = bd.x + Math.cos(a) * s.r * sc, zy = (88 - Math.sin(a) * s.r) * sc;
        VFX.spawn({ x: x + rand(-8, 8), y: bd.y + 8, z: zy + rand(-10, 10), vx: Math.cos(a) * rand(20, 90), vy: rand(-10, 10), vz: rand(120, 340), drag: 0.02, life: rand(0.9, 1.5), size: rand(4, 8), size1: 0, color: i % 3 ? '#ffe9a8' : '#ffffff', kind: 'star' });
      }
    },
  });
})();
