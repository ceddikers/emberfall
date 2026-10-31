// Morrow-Oak's wall (wall-fx.js): the Swallowing (48%), never told in words.
//   The Hunger in his split heartwood takes the grove, and for as long as it holds the party is inside the swallow. The room already plays a
//   large scripted fall of its own (morrowoak-fx.js: the seams, the slabs, the blow at six seconds, the floor changing, the roots as he
//   unfolds, and the limbs growing), and its cast has an eight-second sound. This moment frames that and never repeats it: no flash on the
//   beats the room already flashes on, no floor of its own.
//   Rise: the sound drops out and the light is drawn INWARD (two rings close on his feet, dead leaves from the rim stream into the split, the
//     camera leans in and the music sinks), then one gulp: a hitstop, a short violet flare in the split, a deep wooden boom. The seal is the swallow.
//   Hold: once the party has landed on the remade grove, the swallowing goes on in him. Every couple of seconds a ring of light slides down his
//     trunk from the crown into the split and the split flares as it lands, and a low wooden gulp keeps the same time (the sound and the picture
//     are one clock); a few leaves are pulled in with each. The music is back at a muffled 2400 Hz so the dance keeps its beat.
//   Break (the limbs tear out of the dark): the Hunger lets go. A hitstop, a pale flare out of the split, a great ring across the room, a breath
//     of dead gold leaves blown out from him, the music swelling back and the loop released into an out-breath.
// Everything here is drawn on his trunk (body), or brief in the air; nothing is on the floor, nothing covers a telegraph.

(() => {
  if (typeof WallFx === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const LEAF = ['#d4a93e', '#b8892c', '#e8c452', '#9a7428'];

  // the gulp's time: sfx-synth.js 'wall-morrowoak-gulp' is a 2.6 s loop whose gulp lands 1.5 s in; the ring of light has run down the trunk by then
  const P = 2.6, G = 1.5, RUN = 1.1;

  // where a point of his body is drawn (morrowoak-art.js body(): upright, art units, scaled as he is drawn; the Remade is 1.12 larger and stands 22 higher)
  const isRem = S => !!(S.bd && S.bd.st && S.bd.st.props && S.bd.st.props.remade);
  const onTree = (S, ax, ay) => { const r = isRem(S), k = (r ? 1.12 : 1) * S.sc; return { x: S.bd.x + ax * k, y: S.bd.y + (ay + (r ? -22 : 0)) * k, k }; };
  // the trunk's half width at art height y (morrowoak-art.js TRUNK)
  const TRUNK = [[48, 72], [30, 54], [-10, 44], [-60, 43], [-92, 48], [-124, 36], [-154, 24]];
  const hwAt = y => { for (let i = 0; i < TRUNK.length - 1; i++) { const a = TRUNK[i], b = TRUNK[i + 1]; if (y <= a[0] && y >= b[0]) return a[1] + (b[1] - a[1]) * (a[0] - y) / (a[0] - b[0]); } return y > 48 ? 62 : 21; };

  // a ring of light round the trunk at art height y, its front half (seen from a little above)
  function band(c, S, y, a) {
    if (a <= 0.01) return;
    const rem = isRem(S), p = onTree(S, 0, y), hw = hwAt(y) * (rem ? 1.1 : 1) * 0.97 * p.k, ry = hw * 0.2;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.beginPath(); c.ellipse(p.x, p.y, hw, ry, 0, 0.1, Math.PI - 0.1);
    c.strokeStyle = `rgba(138,79,224,${0.34 * a})`; c.lineWidth = 15 * p.k; c.stroke();
    c.strokeStyle = `rgba(167,124,240,${0.5 * a})`; c.lineWidth = 6 * p.k; c.stroke();
    c.strokeStyle = `rgba(230,214,255,${0.85 * a})`; c.lineWidth = 2.6 * p.k; c.stroke();
    c.restore();
  }
  // the split taking it: a flare in the heartwood
  function splitFlare(c, S, g, a) {
    if (g * a <= 0.01) return;
    const p = onTree(S, 0, -50), r = (40 + 50 * g) * p.k;   // (the heartwood's own light sits a little above the split's middle)
    c.save(); c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    gr.addColorStop(0, `rgba(240,232,255,${0.95 * g * a})`); gr.addColorStop(0.35, `rgba(167,124,240,${0.6 * g * a})`); gr.addColorStop(1, 'rgba(138,79,224,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
    c.restore();
  }
  // dead leaves from the room's rim drawn into the split (sparse, brief)
  function leavesIn(S, n, spread, life0) {
    const sp = onTree(S, 0, -40), gy = S.bd.y + 14;
    for (let i = 0; i < n; i++) S.later(i * 0.05, () => {
      const a = rand(0, TAU), d = rand(spread[0], spread[1]), x0 = S.bd.x + Math.cos(a) * d, y0 = gy + Math.sin(a) * d * 0.6, life = rand(life0 * 0.85, life0 * 1.15), z0 = rand(8, 50);
      VFX.spawn({ x: x0, y: y0, z: z0, vx: (sp.x - x0) / life, vy: (gy - y0) / life, vz: (gy - sp.y - z0) / life, drag: 0, life, size: rand(7, 11), size1: 1, color: LEAF[i % 4], kind: 'leaf', add: false, vr: rand(-6, 6), flutter: 3 });
    });
  }

  // the held part: the loop and its picture start together, once the grove is remade (or at once for a wall we arrive at)
  function startHold(S) {
    const st = S.st; if (st.loopOn) return;
    st.loopOn = true; st.gulp0 = S.since(); st.lastGulp = -1;
    S.loop('wall-morrowoak-gulp', { vol: 0.85, fade: 0.3 });
    S.muffle(2400, 1.5);
  }

  WallFx.moment('morrowoak', 'The Swallowing', {
    up(S) {
      const bd = S.bd;
      S.play('wall-morrowoak-up');
      S.muffle(380, 0.4);
      S.later(2.4, () => S.muffle(1400, 2));   // (the fall is the room's; the music comes back part way for it, and fully when the grove is remade)
      S.cam('dim', 0.3, 1.4); S.lean(0.05, 0.9, 0.5, 1.8);
      // the light drawn inward: two rings close on his feet, the rim's dead leaves stream into the split
      S.ring(bd.x, bd.y + 12, { r0: 600, r: 60, color: '#a77cf0', w: 9, dur: 0.95, flat: 0.8, clip: 1 });
      S.ring(bd.x, bd.y + 12, { r0: 380, r: 40, color: '#dcc8ff', w: 5, dur: 0.8, delay: 0.12, flat: 0.8, clip: 1 });
      leavesIn(S, 16, [260, 520], 0.9);
      // the gulp
      S.later(0.9, () => {
        const q = onTree(S, 0, -40);
        S.cam('stop', 0.09); S.cam('flash', '#d8c8ff', 0.18, 0.4); S.cam('punch', 0.03, 0.5);
        S.shake(8);
        S.ring(S.bd.x, S.bd.y + 12, { r: 320, color: '#a77cf0', w: 8, dur: 0.7, flat: 0.8, clip: 1 });
        VFX.flash(q.x, q.y, 150, '#c8b0ff', 0.3);
      });
    },
    // a wall we arrive at (a rejoin): its look and its bed, no moment
    quiet(S) { S.st.fresh = true; startHold(S); },
    body(c, S, t, age) {
      const st = S.st, pr = S.present();
      if (!st.loopOn && !st.queued && (isRem(S) || S.since() > 12)) { st.queued = true; S.later(0.5, () => startHold(S)); }   // (the floor has changed: the swallowing goes on in him)
      if (!st.loopOn || st.gulp0 == null) return;
      const tt = S.since() - st.gulp0, q = ((tt % P) + P) % P, n = Math.floor(tt / P), up = 1 + 0.5 * clamp01((S.since() - 17) / 8);   // (a little hungrier toward the end)
      const ramp = easeOut(clamp01(tt / 0.8)) * pr;
      if (ramp <= 0.01) return;
      if (q > G - RUN && q <= G) { const u = (q - (G - RUN)) / RUN; band(c, S, -150 + 108 * u * u, Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.9 * ramp * up); }
      const a = q - G;
      splitFlare(c, S, a >= 0 ? Math.exp(-a / 0.2) : 0, ramp * up);
      if (n !== st.lastGulp && q >= G - RUN) { st.lastGulp = n; if (pr > 0.5) leavesIn(S, 3, [90, 170], 0.8); }
    },
    broke(S) {
      const bd = S.bd, q = onTree(S, 0, -40);
      S.play('wall-morrowoak-out');
      S.cam('stop', 0.08); S.cam('flash', '#efe6ff', 0.16, 0.35); S.cam('punch', 0.035, 0.5);
      S.shake(10);
      S.ring(bd.x, bd.y + 12, { r: 640, color: '#dcc8ff', w: 12, dur: 0.95, flat: 0.8, clip: 1 });
      S.ring(bd.x, bd.y + 12, { r: 360, color: '#ffe9a8', w: 6, dur: 0.65, delay: 0.07, flat: 0.8, clip: 1 });
      VFX.flash(q.x, q.y, 180, '#efe6ff', 0.3);
      // the last of the swallow comes back out: the split flares and the leaves he fed it are blown out of him in a ring
      VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p) => splitFlare(c, S, Math.pow(1 - p, 1.5), 1) });
      for (let w = 0; w < 3; w++) S.later(w * 0.14, () => {
        for (let i = 0; i < 13; i++) {
          const a = rand(0, TAU), sp = rand(150, 380);
          VFX.spawn({ x: q.x, y: S.bd.y + 14, z: rand(30, 70), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(30, 150), g: 90, drag: 0.5, life: rand(1.6, 2.6), size: rand(7, 12), size1: 1, color: LEAF[i % 4], kind: 'leaf', add: false, vr: rand(-7, 7), flutter: 5 });
        }
      });
      S.muffle(0, 0.25); S.swell(0.3, 2.0);
    },
  });
})();
