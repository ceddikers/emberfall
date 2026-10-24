// The Hydra of the Drowned Temple (Boss VIII): the Mother's body and her heads, drawn in code. Loaded after bosses.js, whose
// BOSS_ART / ADD_ART tables it adds to. Conventions as the other bosses: facing +x, about 45 px across at scale 1.
//   The body (BOSS_ART.hydra) sits in the pool and never walks: a mound of coils with a brass collar, nine neck-roots round it
//   and the Mother's own face turned to whoever holds her. props (set from her casts, main.js): cry (the maw wide, a ring of
//   sound), maul (rears and strikes), head (a head is casting), dive (sinking under the flood), heart (the Heart open in her chest).
//   The heads (ADD_ART['hy-<element>'], '-s' a lesser head, '-e' an Elder, '-w' a head breaking the flood) are drawn with their
//   own neck running back toward the middle of the room: they stand HEAD_R (hydra.js) from it, so a neck is a fixed length.
//   Each head is told apart by element: colour, crest and a row of pips on its brow (one to eight: the head's number).

const HY_EL = {
  acid:  { col: '#9ccc2e', dark: '#3d5a12', glow: '#c8ff4a', n: 1 },
  tide:  { col: '#2fbfb0', dark: '#0f4a46', glow: '#7ffff0', n: 2 },
  venom: { col: '#a050e0', dark: '#3a1660', glow: '#e0a0ff', n: 3 },
  flame: { col: '#e8742a', dark: '#5a2008', glow: '#ffc06a', n: 4 },
  frost: { col: '#a8d8f0', dark: '#3a5a78', glow: '#e8f8ff', n: 5 },
  storm: { col: '#e8d040', dark: '#5a4c10', glow: '#fff6a0', n: 6 },
  gaze:  { col: '#c8c4d4', dark: '#4a4858', glow: '#ffffff', n: 7 },
  mire:  { col: '#9a7a44', dark: '#3a2a14', glow: '#d8b868', n: 8 },
};

(function () {
  const BRASS = '#b8903a', BRASS_L = '#e8c870', MOSS = '#2f5a3a', MOSS_D = '#16301f', MOSS_L = '#4f8a55', BELLY = '#a9b684';
  // black-green hide with the head's own colour showing only where it matters (crest, eyes, mouth, scale ticks)
  const mixc = (a, b, q) => { const pa = hexToRgb(a), pb = hexToRgb(b); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join(''); };

  // a neck: a tube from (-L, 0) running up to the head at (0, 0), swaying; wider at the root
  function neck(ctx, L, t, seed, el, w0, w1, lesser) {
    const N = 12, pts = [];
    for (let i = 0; i <= N; i++) {
      const q = i / N, x = -L * (1 - q), y = Math.sin(q * 3.4 + t * 1.5 + seed) * 9 * (1 - q * q) + Math.sin(q * 7 + t * 2.3 + seed * 2) * 2.2 * (1 - q);
      pts.push([x, y, w0 + (w1 - w0) * q]);
    }
    const edge = side => pts.map(([x, y, w], i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      return [x - dy / d * w * side, y + dx / d * w * side];
    });
    const up = edge(1), dn = edge(-1);
    ctx.beginPath(); ctx.moveTo(...up[0]);
    for (const p of up) ctx.lineTo(...p);
    for (let i = dn.length - 1; i >= 0; i--) ctx.lineTo(...dn[i]);
    ctx.closePath();
    ctx.fillStyle = mixc('#14271d', el.dark, 0.3); ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
    // a paler belly down one side, scale ticks across the back
    ctx.beginPath(); ctx.moveTo(...dn[0]); for (const p of dn) ctx.lineTo(...p);
    for (let i = dn.length - 1; i >= 0; i--) { const m = pts[i]; ctx.lineTo(dn[i][0] * 0.55 + m[0] * 0.45, dn[i][1] * 0.55 + m[1] * 0.45); }
    ctx.closePath(); ctx.fillStyle = rgba(BELLY, 0.5); ctx.fill();
    for (let i = 1; i < N; i += 1) {
      const [x, y, w] = pts[i];
      line(ctx, x - 1, y - w * 0.8, x + 2, y - w * 0.05, rgba(el.col, 0.55), 1.4);
      if (!lesser && i % 3 === 0) poly(ctx, [x + 3, y - w, x - 2, y - w - 5, x - 5, y - w], el.col, OUT, 1);
    }
  }

  // one head, facing +x, at the origin. variant: '' great, 's' lesser, 'e' elder, 'w' breaking the flood
  function head(ctx, st, enraged, elKey, variant) {
    const E = HY_EL[elKey], t = st.t || 0;
    st.hs = st.hs ?? Math.random() * 6.28;
    const lesser = variant === 's', elder = variant === 'e', water = variant === 'w';
    const ap = actP(st, 'attack'), strike = ap >= 0 ? Math.sin(ap * Math.PI) : 0;   // lunges and opens at an attack
    const k = lesser || water ? 0.78 : elder ? 1.18 : 1;
    const skin = mixc('#22402f', E.col, 0.3), jawc = mixc('#12231a', E.dark, 0.55);
    // the water: a ripple ring where a flood head breaks the surface
    if (water) for (let i = 0; i < 2; i++) { const q = (t * 0.8 + i * 0.5) % 1; ellipse(ctx, 0, 6, 30 + q * 40, (30 + q * 40) * 0.6, 0, null, rgba('#a8f0e8', 0.5 * (1 - q)), 2); }
    if (elder) glow(ctx, 0, 0, 70, BRASS_L, 0.18 + 0.08 * Math.sin(t * 3));
    // neck: back toward the middle of the room, unless the head is rising straight out of the water
    if (water) neck(ctx, 26, t, st.hs, E, 12, 9, true);
    else neck(ctx, lesser ? 124 : elder ? 124 : 118, t, st.hs, E, lesser ? 8 : elder ? 12 : 10.5, lesser ? 6.5 : elder ? 9.5 : 8, lesser);
    ctx.save(); ctx.scale(k, k); ctx.translate(strike * 5, 0);
    const open = 0.18 + strike * 0.75;
    // element decoration behind the skull
    if (elKey === 'venom') for (const sy of [-1, 1]) poly(ctx, [-2, 5 * sy, -10, (15 + strike * 9) * sy, 4, (20 + strike * 10) * sy, 12, 9 * sy], E.col, OUT, 1.8);   // a hood
    if (elKey === 'tide') for (const sy of [-1, 1]) { poly(ctx, [-4, 6 * sy, -16, 18 * sy, -4, 22 * sy, 6, 10 * sy], rgba('#7ffff0', 0.6), OUT, 1.5); line(ctx, -4, 8 * sy, -12, 18 * sy, rgba('#0f4a46', 0.7), 1.2); }
    if (elKey === 'storm') for (let i = -2; i <= 2; i++) poly(ctx, [-6, i * 4, -20 - Math.abs(i) * 2, i * 9, -6, i * 4 + 3], E.col, OUT, 1.4);
    if (elKey === 'frost') for (let i = -2; i <= 2; i++) poly(ctx, [-4, i * 4, -9 - (2 - Math.abs(i)) * 5, i * 8, -2, i * 4 + 3], rgba('#e8f8ff', 0.9), OUT, 1.3);
    if (elKey === 'flame') for (const sy of [-1, 1]) { poly(ctx, [4, 8 * sy, -8, 22 * sy, -16, 24 * sy, -6, 12 * sy], '#3a1a10', OUT, 1.6); glow(ctx, -12, 22 * sy, 10, E.glow, 0.4 + 0.2 * Math.sin(t * 8)); }
    if (elKey === 'mire') ellipse(ctx, -4, 0, 14, 11, 0, mixc('#22402f', E.col, 0.55), OUT, 2);   // a bloated throat sac
    // skull
    ellipse(ctx, 2, 0, 18, 12.5, 0, skin, OUT, 2.4);
    ellipse(ctx, 0, -4, 12, 5, 0, rgba('#ffffff', 0.18));
    for (let i = 0; i < 4; i++) line(ctx, -8 + i * 5, -10, -6 + i * 5, -6, rgba(E.dark, 0.7), 1.4);
    // snout and jaws: the lower jaw drops at an attack
    ctx.save(); ctx.translate(14, 3); ctx.rotate(open * 0.7);
    poly(ctx, [0, 0, 18, 1, 25, 4, 24, 7, 8, 8, -2, 6], jawc, OUT, 2);
    for (let i = 0; i < 3; i++) poly(ctx, [5 + i * 5, 0, 6.5 + i * 5, -5, 8 + i * 5, 0], '#f2ecd8', OUT, 0.8);
    ctx.restore();
    poly(ctx, [10, -9, 28, -6, 38, -2, 38, 2, 26, 4, 10, 5], skin, OUT, 2.2);
    line(ctx, 14, -7, 36, -2.4, rgba(E.col, 0.7), 1.6);   // a stripe of its colour along the snout
    for (let i = 0; i < 3; i++) poly(ctx, [16 + i * 6, 3, 17.5 + i * 6, 9 + strike * 3, 19 + i * 6, 3], '#f2ecd8', OUT, 0.9);
    circle(ctx, 33, -3, 1.3, E.dark);
    // the mouth's own light while it casts
    if (strike > 0.05) glow(ctx, 30, 3, 20 + 14 * strike, E.glow, 0.6 * strike);
    // the eye (a Gaze head: one great eye in the brow)
    if (elKey === 'gaze') {
      circle(ctx, 8, -1, 7.5, '#f4f2ee', OUT, 1.8); circle(ctx, 9.5, -1, 4.6, E.glow, null); circle(ctx, 10.2, -1, 2.2, '#241f33');
      glow(ctx, 9, -1, 18 + strike * 16, '#ffffff', 0.25 + 0.4 * strike);
    } else {
      for (const sy of [-1, 1]) { circle(ctx, 12, 6.2 * sy, 3.3, '#f6f2d8', OUT, 1.4); circle(ctx, 13, 6.2 * sy, 1.7, enraged ? '#ff4a2a' : E.dark); glow(ctx, 12.5, 6.2 * sy, 7, E.glow, 0.3 + 0.35 * strike); }
    }
    // a brass crown on an Elder
    if (elder) { for (let i = -2; i <= 2; i++) poly(ctx, [-6, i * 5 - 2, -14 + (2 - Math.abs(i)) * -2, i * 6, -6, i * 5 + 2], BRASS, OUT, 1.4); ellipse(ctx, -6, 0, 3, 11, 0, null, BRASS_L, 2); }
    // the number: one pip for each, along the brow
    for (let i = 0; i < E.n; i++) circle(ctx, -8 + i * 2.9, -7.4, 1.35, '#fff7d0', OUT, 0.8);
    if (elKey === 'acid') for (let i = 0; i < 2; i++) { const q = (t * 0.9 + i * 0.5 + st.hs) % 1; circle(ctx, 24 + i * 6, 9 + q * 14, 1.9 * (1 - q * 0.5), rgba('#c8ff4a', 0.9 * (1 - q))); }
    if (elKey === 'storm' && Math.sin(t * 17 + st.hs) > 0.4) { line(ctx, 10, -9, 16, -16, '#fff6a0', 1.6); line(ctx, 16, -16, 12, -22, '#fff6a0', 1.4); }
    ctx.restore();
  }

  for (const el of Object.keys(HY_EL)) for (const v of ['', 's', 'e', 'w']) {
    ADD_ART['hy-' + el + (v ? '-' + v : '')] = (ctx, st, enraged) => head(ctx, st, enraged, el, v);
  }

  // ---- the Mother -------------------------------------------------------------------------------------------------
  BOSS_ART.hydra = function (ctx, st, angle = 0) {
    const props = st.props || {}, t = st.t || 0;
    const sink = props.dive ? 1 : 0;
    // the body is drawn square to the room (the heads and their necks are), then her face turns to the tank
    ctx.save(); ctx.rotate(-angle);
    // ripples in the pool round her
    for (let i = 0; i < 3; i++) { const q = (t * 0.35 + i / 3) % 1; ellipse(ctx, 0, 6, 62 + q * 70, (62 + q * 70) * 0.82, 0, null, rgba('#c8f0d0', 0.34 * (1 - q) * (sink ? 1.5 : 1)), 2); }
    ctx.globalAlpha = sink ? 0.55 : 1;
    glow(ctx, 0, 0, 96, props.heart ? '#ffe08a' : '#6aa86a', props.heart ? 0.3 : 0.14);
    // a mound of coils: three rings of body, one over another
    for (const [r, ry, c, o] of [[62, 52, MOSS_D, 0], [50, 42, MOSS, 0.4], [36, 31, MOSS_L, 0.8]]) {
      ellipse(ctx, 0, 0, r, ry, 0, c, OUT, 3);
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + o + Math.sin(t * 0.4) * 0.02; line(ctx, Math.cos(a) * r * 0.78, Math.sin(a) * ry * 0.78, Math.cos(a + 0.18) * r * 0.97, Math.sin(a + 0.18) * ry * 0.97, rgba(MOSS_D, 0.7), 1.8); }
    }
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + i * TAU / 9;
      // the root of each neck, and a spine on the ridge between
      ellipse(ctx, Math.cos(a) * 44, Math.sin(a) * 38, 11, 9, a, MOSS, OUT, 2.4);
      const b = a + TAU / 18;
      poly(ctx, [Math.cos(b) * 38 - 3, Math.sin(b) * 33, Math.cos(b) * 52, Math.sin(b) * 45 - 7, Math.cos(b) * 38 + 3, Math.sin(b) * 33 + 2], BELLY, OUT, 1.2);
    }
    // a brass collar and the glow of the pool in the seams
    ellipse(ctx, 0, 0, 29, 25, 0, null, BRASS, 4.5); ellipse(ctx, 0, -1, 29, 25, 0, null, BRASS_L, 1.4);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; circle(ctx, Math.cos(a) * 29, Math.sin(a) * 25, 2.4, BRASS_L, OUT, 1); }
    // the Heart (the wall): her chest opens on a gold light
    if (props.heart) {
      const pu = 0.6 + Math.sin(t * 3.4) * 0.25;
      ellipse(ctx, 0, 0, 22, 18, 0, '#3a1208', OUT, 2.4);
      glow(ctx, 0, 0, 46, '#ffd870', 0.8 * pu); ellipse(ctx, 0, 0, 12, 10, 0, rgba('#ffe9a8', 0.95), OUT, 1.5); glow(ctx, 0, 0, 20, '#ffffff', 0.6 * pu);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // ---- her face, turned to the tank
    const s = swing(actP(st, 'attack')), maul = props.maul ? 1 : 0, cry = props.cry ? 1 : 0;
    const lunge = maul ? (-0.4 + Math.max(0, s) * 1.2) * 14 : 0, open = cry ? 0.95 : maul ? 0.75 : 0.16 + Math.max(0, Math.sin(t * 1.2)) * 0.05;
    if (sink) ctx.globalAlpha = 0.5;
    ctx.save(); ctx.translate(26 + lunge, 0);
    poly(ctx, [-14, -17, 6, -22, 30, -12, 36, 0, 30, 12, 6, 22, -14, 17], MOSS, OUT, 3);   // the broad head
    for (let i = 0; i < 5; i++) line(ctx, -10 + i * 6, -16 + Math.abs(i - 2) * 2, -6 + i * 6, -9, rgba(MOSS_D, 0.7), 1.6);
    // brass studs along her brow, and a pair of old tusks
    for (const sy of [-1, 1]) { circle(ctx, 10, 14 * sy, 2.6, BRASS_L, OUT, 1); poly(ctx, [24, 9 * sy, 38, 15 * sy, 28, 14 * sy], '#efe6cc', OUT, 1.4); }
    // the lower jaw hangs open for a Cry or a Maul
    ctx.save(); ctx.translate(14, 0);
    ctx.fillStyle = '#12090a'; ctx.beginPath(); ctx.ellipse(10, 0, 12, 4 + open * 15, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    if (cry) glow(ctx, 10, 0, 34, '#ffd870', 0.55 + 0.25 * Math.sin(t * 14));
    for (let i = 0; i < 4; i++) { const x = 3 + i * 5; poly(ctx, [x, -(3 + open * 15), x + 2, -(3 + open * 15) + 7, x + 4, -(3 + open * 15)], '#f2ecd8', OUT, 0.9); poly(ctx, [x, 3 + open * 15, x + 2, 3 + open * 15 - 7, x + 4, 3 + open * 15], '#f2ecd8', OUT, 0.9); }
    ctx.restore();
    // two heavy-lidded eyes, gold
    for (const sy of [-1, 1]) { ellipse(ctx, 0, 11 * sy, 6, 3.6, 0.2 * sy, '#e8c050', OUT, 1.6); ellipse(ctx, 1, 11 * sy, 1.4, 3.2, 0, '#1a1006'); glow(ctx, 0, 11 * sy, 9, '#ffd870', props.head ? 0.7 : 0.35); }
    ctx.restore();
    if (cry) for (let i = 0; i < 3; i++) { const q = (t * 1.6 + i / 3) % 1; ctx.beginPath(); ctx.arc(26, 0, 40 + q * 70, -0.9, 0.9); ctx.strokeStyle = rgba('#ffe9a8', 0.55 * (1 - q)); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.globalAlpha = 1;
  };
})();
