// The Founding: the secret chain, drawing (pass 3). A client layer: Founding.addLayer({...}). Pairs with sim-chain.js.
// Draws: the landmarks of the places (the cracked bell on the Ledge, the reed pool, the carved oak, the cave mouth, the dark lantern, the fence
// posts, the rockfall, the kennel posts), the ten big bodies, the standing stones and cairns, the thorn patches and the small ones, a soft pulse at the minimap edge toward a link that has woken, and the small
// feedback for the chain's events. Telegraphs are the core's (the host sends them as `t` events; they are never hidden).
// Events: chbell x y | chwake i hx hy | chfound i | chm id name wind type | chdown i gold | chbonus i | chcut x y n need | chsoak x y ok
//   | chcall id n | chlose i | chend | chzone id x y R arm dur kind | chzoff id | chbreak x y | chrise n | chlamps secs | chdim k | chshape eid k
//   | chpull pid x y | chcairn x y | chherd ang x y | chfell eid x y | chhound k | chpost i n need x y | chcrown pid | chrage link step name.   Props read: chb chn chs chx chl.
(function () {
  if (typeof Founding === 'undefined' || !Founding.addLayer) return;
  const TAU = Math.PI * 2, PI = Math.PI, OUT = '#0b0806';
  let K = null;
  // sounds: the name wanted (add these recipes to sfx-synth.js) and the existing sound used until they exist
  const SND = {
    bell: 'fd-chain-bell', far: 'fd-chain-far', ramCharge: 'fd-chain-ram-charge', stamp: 'fd-chain-ram-stamp', sweep: 'fd-chain-sweep', lunge: 'fd-chain-pike-lunge', slap: 'fd-chain-pike-slap',
    spit: 'fd-chain-bubble', roots: 'fd-chain-root-snare', throw: 'fd-chain-stump-throw', breath: 'fd-chain-ash-breath', call: 'fd-chain-whelp-call', cut: 'fd-chain-oak-cut', down: 'fd-chain-down', soak: 'fd-chain-soak-ok',
  };
  const snd = (k, o) => K && K.snd(SND[k] || k, o);
  const ST = { rungAt: -99, wakeAt: -99, wakeI: -1, cutAt: -99, cuts: 0, oakHit: 0, shapes: {}, rage: 0, rageAt: -99 };

  const LINE = {   // what each move is called on the boss bar's cast line
    jab: 'Horn jab', swing: 'Horn sweep', charge: 'Charge', stamp: 'Stamp', lunge: 'Lunge', slap: 'Tail slap', spit: 'Pale bubble', slam: 'Bough slam',
    pound: 'Pound', roots: 'Root snare', throw: 'Stump throw', maul: 'Maul', breath: 'Ash breath', call: 'Whelp call',
    gaze: 'Gaze', fist: 'Stone fist', rockfall: 'Rockfall', flare: 'Lantern flare', stab: 'Antler stab', bellow: 'Bellow', heartbeat: 'Heartbeat', stampede: 'Stampede', whip: 'Whip crack',
    cairn: 'Cairn call', calf: 'Lost calf', tether: 'Tether', roar: 'Gorge-roar', splinter: 'Splinter', pull: 'Pull', lane: 'Fire lane', bite: 'Bite', ring: 'Spine ring', gore: 'Gore',
    howl: 'Howl', snap: 'Snap', flame: 'Ember lane', spines: 'Bone ring', howl2: 'Pack howl', ashfall: 'Ash-fall', quake: 'Ash quake', sweep: 'Ash sweep', ashlane: 'Ash lane', meteors: 'Ash fall', stackfall: 'Stack in the dark',
  };
  const BONUS_LINE = ['', 'The water goes quiet. Whatever lives in it has been drawn thin.', 'The oak weeps sap. It will not wake whole.', 'The nest smoulders. Whatever comes back will find it spoiled.',
    'The old lantern catches. Whatever watches the plain will come with one stone already cracked.', 'The brand burns down in the clearing. The woods are a little less sure of themselves.', 'Three posts touched, and the field remembers its fence. The herd will come thin.', 'The rocks come down across the road. One of the twins will wake with a crack in it.', 'Three kennels, three bones, three names. One hound will come limping.'];

  const ell = (c, x, y, rx, ry, rot, fill, stroke, lw) => K.ell(c, x, y, rx, ry, rot, fill, stroke, lw);
  const circ = (c, x, y, r, fill, stroke, lw) => K.ell(c, x, y, r, r, 0, fill, stroke, lw);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const eo = v => K.eo(v);
  const props = () => (K && K.S && K.S.props) || {};

  // ------------------------------------------------------------ wind-up of the current move on a unit
  function wind(u) {
    if (!u.chm0) return { k: 0, type: '' };
    const age = K.S.T - u.chm0; if (age > u.chmDur + 0.35) return { k: 0, type: '' };
    return { k: age < u.chmDur ? K.eo(clamp(age / u.chmDur, 0, 1)) : 1 - (age - u.chmDur) / 0.35, type: u.chmType, name: u.chmName, rel: age >= u.chmDur };
  }

  // ------------------------------------------------------------ the Ram of the High Pass: a huge ice-horned ram, grey fleece, horns the colour of old snow
  function drawRam(c, u) {
    const t = K.S.T, w = wind(u), charge = w.type === 'line' ? w.k : 0, rear = w.type === 'ring' ? w.k : 0, swing = w.type === 'cone' ? w.k : 0, run = u.mv > 0.4 ? 1 : 0;
    K.ell(c, u.x + 4, u.y + 24, 66, 30, 0, 'rgba(0,0,0,.32)');
    c.save(); c.translate(u.x + (charge > 0.3 ? Math.sin(t * 55) * 1.3 * charge : 0), u.y); c.rotate(u.face + (swing > 0 ? (0.5 - swing) * 0.5 : 0)); c.lineCap = 'round'; c.lineJoin = 'round';
    const sc = 1 + 0.05 * rear; c.scale(sc, sc);
    for (const [lx, ly, ph] of [[-28, -24, 0], [-28, 24, PI], [26, -26, PI], [26, 26, 0]]) {
      const sw = Math.sin(u.wp * 0.28 + ph) * (run ? 10 : 1.5), up = ly < 0 ? 0 : 0; ell(c, lx + sw, ly + up, 15, 9.5, 0, '#4a4036', OUT, 2);
      ell(c, lx + sw + 10, ly, 5, 5, 0, '#2c2620');
    }
    ell(c, -6, 0, 62, 40, 0, '#bdb6a7', OUT, 3.2);
    ell(c, -14, -6, 48, 26, 0, '#d2ccbd');
    c.strokeStyle = 'rgba(120,112,98,.55)'; c.lineWidth = 2.2;
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.2, px = -6 + Math.cos(a) * 48, py = Math.sin(a) * 30; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + Math.cos(a) * 8 + 2, py + Math.sin(a) * 8, px + Math.cos(a) * 14, py + Math.sin(a) * 14 + 3); c.stroke(); }
    ell(c, 36, 0, 28, 24, 0, '#d9d3c4', OUT, 2.4);                    // shoulders and ruff
    ell(c, 58, 0, 19, 15.5, 0, '#8a7c68', OUT, 2.6);                    // head
    ell(c, 71, 0, 10, 8.5, 0, '#9d8f79', OUT, 2);
    circ(c, 76, -3.2, 1.8, '#15110e'); circ(c, 76, 3.2, 1.8, '#15110e'); circ(c, 63, -8.4, 2, '#e8dcb0'); circ(c, 63, 8.4, 2, '#e8dcb0');
    for (const s of [-1, 1]) {   // the great curled horns: ice
      c.strokeStyle = OUT; c.lineWidth = 12; c.beginPath(); c.moveTo(52, s * 9); c.bezierCurveTo(44, s * 38, 70, s * 50, 86, s * 36); c.stroke();
      c.strokeStyle = '#cfeaf6'; c.lineWidth = 7.4; c.beginPath(); c.moveTo(52, s * 9); c.bezierCurveTo(44, s * 38, 70, s * 50, 86, s * 36); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(51, s * 12); c.bezierCurveTo(46, s * 36, 68, s * 46, 82, s * 34); c.stroke();
      c.strokeStyle = 'rgba(120,170,200,.6)'; c.lineWidth = 1.4; for (let r = 0; r < 4; r++) { const q = 0.2 + r * 0.2, px = 52 + (86 - 52) * q + Math.sin(q * 3) * 4, py = s * (9 + 40 * Math.sin(q * 2.6)); c.beginPath(); c.moveTo(px - 2, py - 3); c.lineTo(px + 2, py + 3); c.stroke(); }
      if (charge > 0.05) K.glowAt(c, 86, s * 36, 10 + 26 * charge, '170,220,255', 0.65 * charge);
    }
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.4; ell(c, -4, 0, 64, 42, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ the Pale Pike: a giant fish, white as a drowned lantern, circling in its pool
  function drawPike(c, u) {
    const t = K.S.T, w = wind(u), lunge = w.type === 'line' ? w.k : 0, spit = w.type === 'share' ? w.k : 0, slap = w.type === 'ring' ? w.k : 0;
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ell(c, u.x, u.y + 4, 56 + k * 46, 30 + k * 24, 0, null, `rgba(215,238,242,${0.34 * (1 - k)})`, 2); }
    K.ell(c, u.x + 3, u.y + 12, 60, 24, 0, 'rgba(6,24,34,.28)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face + Math.sin(t * 1.6 + u.ph) * 0.05); c.lineCap = 'round'; c.lineJoin = 'round';
    const sway = Math.sin(t * 2.2 + u.ph) * 7 + slap * 18 * Math.sin(t * 24);
    // tail
    c.fillStyle = '#9fb7bf'; c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-46, 0); c.quadraticCurveTo(-74, sway - 14, -92, sway - 22); c.quadraticCurveTo(-84, sway, -92, sway + 22); c.quadraticCurveTo(-74, sway + 14, -46, 0); c.fill(); c.stroke();
    ell(c, -8, 0, 54, 24, 0, '#d8e4e6', OUT, 3);
    ell(c, -12, -5, 42, 13, 0, '#eef5f4');
    c.strokeStyle = 'rgba(100,130,140,.5)'; c.lineWidth = 1.4; for (let i = 0; i < 7; i++) { const x = -34 + i * 10; c.beginPath(); c.moveTo(x, -17); c.quadraticCurveTo(x + 4, 0, x, 17); c.stroke(); }
    c.fillStyle = '#6f8f9a'; c.strokeStyle = OUT; c.lineWidth = 1.6; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-4, s * 20); c.lineTo(4 + slap * 6, s * 40); c.lineTo(16, s * 21); c.closePath(); c.fill(); c.stroke(); }
    c.strokeStyle = '#5d7e89'; c.lineWidth = 3; c.beginPath(); c.moveTo(-34, 0); c.lineTo(10, 0); c.stroke();   // the dorsal ridge
    // head and jaw
    const jaw = 4 + lunge * 12 + spit * 4;
    ell(c, 44 + lunge * 10, 0, 22, 16, 0, '#d3e0e2', OUT, 2.6);
    c.fillStyle = '#17252b'; c.beginPath(); c.moveTo(52 + lunge * 10, -jaw); c.lineTo(72 + lunge * 14, 0); c.lineTo(52 + lunge * 10, jaw); c.closePath(); c.fill();
    c.fillStyle = '#f2f6f0'; for (let i = 0; i < 4; i++) { const x = 56 + i * 4 + lunge * 10; c.beginPath(); c.moveTo(x, -jaw + 1); c.lineTo(x + 2, -jaw + 5); c.lineTo(x + 4, -jaw + 1); c.fill(); c.beginPath(); c.moveTo(x, jaw - 1); c.lineTo(x + 2, jaw - 5); c.lineTo(x + 4, jaw - 1); c.fill(); }
    circ(c, 40 + lunge * 10, -9, 3.4, '#f4eec8', OUT, 1.2); circ(c, 40 + lunge * 10, 9, 3.4, '#f4eec8', OUT, 1.2); circ(c, 41 + lunge * 10, -9, 1.5, '#0c1214'); circ(c, 41 + lunge * 10, 9, 1.5, '#0c1214');
    for (const s of [-1, 1]) { c.strokeStyle = '#b9c9c9'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(66 + lunge * 12, s * 2); c.quadraticCurveTo(80 + lunge * 12, s * 8 + Math.sin(t * 4) * 2, 88 + lunge * 12, s * 14); c.stroke(); }   // whiskers
    if (spit > 0.05) K.glowAt(c, 66, 0, 10 + 30 * spit, '150,200,255', 0.7 * spit);
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.45; ell(c, -8, 0, 54, 24, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ the Stumpwarden: a moss-and-bark giant, knuckled stumps for hands, a crown of bare boughs
  function drawWarden(c, u) {
    const t = K.S.T, w = wind(u), slam = w.type === 'cone' ? w.k : 0, pound = w.type === 'ring' ? w.k : 0, rt = w.type === 'spot' ? w.k : 0;
    K.glowAt(c, u.x, u.y, 96, '6,12,6', 0.3, false);
    K.ell(c, u.x + 4, u.y + 30, 72, 32, 0, 'rgba(0,0,0,.34)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.lineCap = 'round'; c.lineJoin = 'round';
    const step = Math.sin(u.wp * 0.14) * (u.mv > 0.3 ? 9 : 1);
    for (const [lx, ly, sg] of [[-20, -30, 1], [-20, 30, -1]]) { ell(c, lx + step * sg, ly, 20, 15, 0, '#3a2c20', OUT, 2.6); c.strokeStyle = '#2a4a28'; c.lineWidth = 2; c.beginPath(); c.moveTo(lx + step * sg - 12, ly - 4); c.lineTo(lx + step * sg + 8, ly + 5); c.stroke(); }
    // arms: stumps that rise on a slam or a pound
    for (const s of [-1, 1]) {
      const lift = Math.max(slam, pound, rt * 0.7), ax = 22 + 26 * (1 - lift * 0.4) + (slam > 0 ? 18 * slam : 0), ay = s * (42 - 8 * lift);
      c.strokeStyle = OUT; c.lineWidth = 19; c.beginPath(); c.moveTo(10, s * 26); c.quadraticCurveTo(24, s * 44, ax, ay); c.stroke();
      c.strokeStyle = '#5b4330'; c.lineWidth = 14; c.beginPath(); c.moveTo(10, s * 26); c.quadraticCurveTo(24, s * 44, ax, ay); c.stroke();
      c.strokeStyle = '#3d4f2c'; c.lineWidth = 5; c.beginPath(); c.moveTo(14, s * 30); c.quadraticCurveTo(26, s * 44, ax - 2, ay - s * 2); c.stroke();
      ell(c, ax + 6, ay, 17 + 3 * lift, 15 + 3 * lift, 0, '#6a4f37', OUT, 2.6); ell(c, ax + 8, ay, 9, 8, 0, '#8b6c4a'); c.strokeStyle = 'rgba(40,28,18,.7)'; c.lineWidth = 1.4; circ(c, ax + 8, ay, 4.5, null, 'rgba(40,28,18,.7)', 1.4);   // a sawn end, rings and all
    }
    ell(c, -6, 0, 50, 42, 0, '#4d3a29', OUT, 3.4);
    ell(c, -10, -4, 40, 31, 0, '#5c4631');
    c.strokeStyle = 'rgba(28,20,14,.65)'; c.lineWidth = 2.2; for (let i = 0; i < 9; i++) { const a = i * 0.7, px = -6 + Math.cos(a) * 40, py = Math.sin(a) * 33; c.beginPath(); c.moveTo(px * 0.55 - 3, py * 0.55); c.lineTo(px, py); c.stroke(); }
    for (const [mx, my, mr] of [[-24, -18, 14], [-4, 20, 12], [-34, 12, 11], [10, -26, 10], [-14, 2, 9]]) { ell(c, mx, my, mr * 1.2, mr, 0.5, '#46663a'); ell(c, mx - 2, my - 2, mr * 0.7, mr * 0.5, 0.5, '#5d8348'); }
    // a crown of bare boughs
    c.strokeStyle = OUT; c.lineWidth = 6; for (const [a, ln] of [[-0.9, 30], [-0.3, 38], [0.3, 38], [0.9, 30], [1.5, 22], [-1.5, 22]]) { c.beginPath(); c.moveTo(34, 0); c.quadraticCurveTo(44 + Math.cos(a) * 14, Math.sin(a) * 18, 40 + Math.cos(a) * ln, Math.sin(a) * ln); c.stroke(); }
    c.strokeStyle = '#4a3828'; c.lineWidth = 3.4; for (const [a, ln] of [[-0.9, 30], [-0.3, 38], [0.3, 38], [0.9, 30], [1.5, 22], [-1.5, 22]]) { c.beginPath(); c.moveTo(34, 0); c.quadraticCurveTo(44 + Math.cos(a) * 14, Math.sin(a) * 18, 40 + Math.cos(a) * ln, Math.sin(a) * ln); c.stroke(); }
    ell(c, 38, 0, 19, 17, 0, '#5a4430', OUT, 2.6);
    ell(c, 48, -6, 4.2, 3, 0, '#120d08'); ell(c, 48, 6, 4.2, 3, 0, '#120d08');
    K.glowAt(c, 48, -6, 9 + 3 * Math.sin(t * 3) + 14 * (slam + pound), '255,176,60', 0.7); K.glowAt(c, 48, 6, 9 + 3 * Math.sin(t * 3 + 1) + 14 * (slam + pound), '255,176,60', 0.7);
    if (rt > 0.05) K.glowAt(c, 20, 0, 40 + 70 * rt, '90,150,60', 0.4 * rt);
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.35; ell(c, -6, 0, 50, 42, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ the Ash Mother: a vast, low, ash-grey beast, egg sacs aglow on her back, a maw like a furnace door
  function drawMother(c, u) {
    const t = K.S.T, w = wind(u), breath = w.type === 'cone' && w.name === 'breath' ? w.k : 0, maul = w.type === 'cone' && w.name !== 'breath' ? w.k : 0, stamp = w.type === 'ring' ? w.k : 0, call = w.type === 'call' ? w.k : 0;
    K.glowAt(c, u.x, u.y, 110, '30,10,4', 0.28, false);
    K.ell(c, u.x + 6, u.y + 32, 92, 40, 0, 'rgba(0,0,0,.34)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.scale(1 + 0.035 * stamp, 1 + 0.035 * stamp); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [lx, ly, ph] of [[-44, -40, 0], [-44, 40, PI], [20, -44, PI], [20, 44, 0]]) {
      const sw = Math.sin(u.wp * 0.2 + ph) * (u.mv > 0.3 ? 10 : 1.5); ell(c, lx + sw, ly, 21, 14, 0, '#2c2724', OUT, 2.4);
      c.fillStyle = '#c4b998'; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(lx + sw + 17, ly + k * 6 - 2); c.lineTo(lx + sw + 26, ly + k * 6); c.lineTo(lx + sw + 17, ly + k * 6 + 2); c.fill(); }
    }
    c.strokeStyle = OUT; c.lineWidth = 12; c.beginPath(); c.moveTo(-70, 0); c.quadraticCurveTo(-96, Math.sin(t * 1.4) * 12, -112, Math.sin(t * 1.4 + 1) * 16); c.stroke();
    c.strokeStyle = '#4a423c'; c.lineWidth = 8; c.beginPath(); c.moveTo(-70, 0); c.quadraticCurveTo(-96, Math.sin(t * 1.4) * 12, -112, Math.sin(t * 1.4 + 1) * 16); c.stroke();
    ell(c, -12, 0, 82, 54, 0, '#4a423c', OUT, 3.4);
    ell(c, -18, -4, 66, 38, 0, '#5a514a');
    c.fillStyle = '#6f655b'; for (let i = 0; i < 22; i++) { const a = i * TAU / 22, bx = -12 + Math.cos(a) * 80, by = Math.sin(a) * 52, ln = 8 + 5 * Math.sin(i * 2.3 + t); c.beginPath(); c.moveTo(-12 + Math.cos(a - 0.07) * 76, Math.sin(a - 0.07) * 49); c.lineTo(bx + Math.cos(a) * ln, by + Math.sin(a) * ln); c.lineTo(-12 + Math.cos(a + 0.07) * 76, Math.sin(a + 0.07) * 49); c.fill(); }
    // the egg sacs on her back, each beating slowly; they flare when she calls
    for (const [sx, sy, sr] of [[-46, -18, 12], [-30, 16, 14], [-58, 8, 10], [-14, -22, 11], [-10, 20, 10]]) {
      const pu = 0.5 + 0.5 * Math.sin(t * 2.2 + sx), sz = sr * (1 + 0.1 * pu + 0.25 * call);
      ell(c, sx, sy, sz * 1.1, sz, 0.3, '#6b3b27', OUT, 1.8); ell(c, sx - 2, sy - 2, sz * 0.6, sz * 0.5, 0.3, '#b8643a'); K.glowAt(c, sx, sy, sz * 2 + 12 * call, '255,130,50', 0.35 + 0.25 * pu + 0.4 * call);
    }
    c.strokeStyle = 'rgba(255,120,40,.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-40, -36); c.lineTo(-26, -26); c.lineTo(-34, -14); c.moveTo(-20, 34); c.lineTo(-6, 26); c.lineTo(-14, 14); c.stroke();
    // head
    const hx = 62 + 14 * maul + 8 * breath;
    ell(c, 40, 0, 32, 28, 0, '#4a423c', OUT, 3);
    ell(c, hx, 0, 34, 24, 0, '#6a5f55', OUT, 3);
    ell(c, hx + 22, 0, 18, 15, 0, '#7a6e62', OUT, 2.4);
    const gape = 3 + breath * 11 + maul * 9; c.fillStyle = '#1a0d08'; c.beginPath(); c.moveTo(hx + 18, -gape); c.lineTo(hx + 44, 0); c.lineTo(hx + 18, gape); c.closePath(); c.fill();
    c.fillStyle = '#eadfc4'; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const x = hx + 22 + i * 5; c.beginPath(); c.moveTo(x, s * (gape - i * 1.2)); c.lineTo(x + 2.4, s * (gape - i * 1.2 - 4.5)); c.lineTo(x + 4.8, s * (gape - i * 1.2)); c.fill(); }
    for (const s of [-1, 1]) { ell(c, hx + 6, s * 11, 5.2, 3.6, 0, '#0b0807'); K.glowAt(c, hx + 6, s * 11, 11 + 3 * Math.sin(t * 5 + s), '255,140,50', 0.5); c.strokeStyle = '#c4b998'; c.lineWidth = 5; c.beginPath(); c.moveTo(hx - 10, s * 20); c.quadraticCurveTo(hx, s * 34, hx + 20, s * 32); c.stroke(); }
    if (breath > 0.04) K.glowAt(c, hx + 30, 0, 22 + 54 * breath, '255,150,60', 0.7 * breath);
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.3; ell(c, -12, 0, 82, 54, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ an Ash-Mother's whelp: small, grey, one ember eye
  function drawWhelp(c, u) {
    const t = K.S.T; K.ell(c, u.x + 1, u.y + 8, 10, 4.5, 0, 'rgba(0,0,0,.28)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.lineCap = 'round';
    const sw = Math.sin(u.wp * 0.5) * 3;
    for (const [lx, ly, ph] of [[-5, -7, 0], [-5, 7, 1], [4, -7, 1], [4, 7, 0]]) ell(c, lx + sw * (ph ? -1 : 1), ly, 3.4, 2.4, 0, '#2c2724', OUT, 1);
    ell(c, -1, 0, 11, 7.6, 0, '#4f4741', OUT, 1.8); ell(c, 9, 0, 6.4, 5.2, 0, '#6a5f55', OUT, 1.6); circ(c, 12, -2, 1.1, '#ffb060'); circ(c, 12, 2, 1.1, '#ffb060'); K.glowAt(c, 12, 0, 6, '255,140,50', 0.4 + 0.2 * Math.sin(t * 6 + u.ph));
    if (u.flash > 0) { c.globalAlpha = 0.5; ell(c, 0, 0, 11, 8, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }
  // ============================================================ links 5-10: the set pieces
  // ------------------------------------------------------------ the Lantern Warden: a founders' sentinel of grey stone, a lantern burning in its chest, one eye-slit
  function drawLantern(c, u) {
    const t = K.S.T, w = wind(u), gaze = w.type === 'gaze' ? w.k : 0, fist = w.type === 'ring' ? w.k : 0, fall = w.type === 'rockfall' ? w.k : 0, flare = w.type === 'share' ? w.k : 0;
    K.ell(c, u.x + 4, u.y + 26, 66, 30, 0, 'rgba(0,0,0,.34)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.lineCap = 'round'; c.lineJoin = 'round';
    ell(c, -4, 0, 60, 46, 0, '#6e6a62', OUT, 3.4);                                        // the plinth it was cut with
    ell(c, -8, -3, 48, 34, 0, '#8d887d');
    c.strokeStyle = 'rgba(40,36,30,.55)'; c.lineWidth = 1.8; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4; c.beginPath(); c.moveTo(-6 + Math.cos(a) * 20, Math.sin(a) * 16); c.lineTo(-6 + Math.cos(a) * 46, Math.sin(a) * 36); c.stroke(); }
    for (const s of [-1, 1]) {   // arms: blocks of stone that rise to strike
      const lift = Math.max(fist, fall), ax = 12 + 22 * (1 - lift * 0.5) + fist * 18, ay = s * (40 - 10 * lift);
      c.strokeStyle = OUT; c.lineWidth = 20; c.beginPath(); c.moveTo(-6, s * 24); c.quadraticCurveTo(10, s * 40, ax, ay); c.stroke();
      c.strokeStyle = '#9a9589'; c.lineWidth = 14; c.beginPath(); c.moveTo(-6, s * 24); c.quadraticCurveTo(10, s * 40, ax, ay); c.stroke();
      ell(c, ax + 8, ay, 17 + 4 * lift, 15 + 4 * lift, 0, '#8a857a', OUT, 2.6); ell(c, ax + 5, ay - 3, 8, 6, 0, '#a8a397');
    }
    ell(c, -6, 0, 40, 34, 0, '#a09b8f', OUT, 3); ell(c, -10, -4, 30, 24, 0, '#b3ae9f');
    const lg = 0.55 + 0.25 * Math.sin(t * 3 + u.ph) + 0.9 * flare;                        // the lantern in its chest
    ell(c, -2, 0, 14, 13, 0, '#3a2a18', OUT, 2); circ(c, -2, 0, 8 + 3 * flare, `rgba(255,190,90,${0.8 + 0.2 * Math.sin(t * 4)})`); K.glowAt(c, -2, 0, 36 + 80 * flare, '255,170,70', clamp(lg, 0, 1));
    ell(c, 30, 0, 17, 15, 0, '#a8a397', OUT, 2.8);                                         // the head
    ell(c, 38, 0, 6, 12, 0, '#2a2620');
    const eg = 0.35 + gaze * 0.65 + 0.12 * Math.sin(t * 5); ell(c, 40, 0, 3, 8 * (0.5 + gaze * 0.5), 0, `rgba(255,${190 - 80 * gaze},${90 - 60 * gaze},${clamp(0.5 + eg, 0, 1)})`);
    K.glowAt(c, 42, 0, 14 + 40 * gaze, '255,150,60', 0.5 * eg + 0.4 * gaze);
    c.strokeStyle = 'rgba(30,26,20,.8)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(24, -10); c.lineTo(30, -3); c.lineTo(26, 4); c.stroke();   // the old crack
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.35; ell(c, -4, 0, 60, 46, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ the Hollow Stag: a stag of fog and antler, grey-blue and half there, white eyes
  function drawStag(c, u) {
    const t = K.S.T, w = wind(u), charge = w.type === 'line' ? w.k : 0, stab = w.type === 'cone' ? w.k : 0, bell = w.type === 'bellow' ? w.k : 0, beat = w.type === 'share' ? w.k : 0, run = u.mv > 0.4 ? 1 : 0;
    for (let i = 0; i < 5; i++) { const k = (t * 0.35 + i / 5) % 1; K.glowAt(c, u.x + Math.sin(i * 2.1 + t * 0.6) * 46, u.y + 8 + k * 14, 40 + k * 26, '150,170,185', 0.14 * (1 - k), false); }   // fog about its feet
    K.ell(c, u.x + 3, u.y + 22, 54, 24, 0, 'rgba(0,0,0,.22)');
    c.save(); c.translate(u.x + (charge > 0.3 ? Math.sin(t * 50) * 1.2 : 0), u.y); c.rotate(u.face); c.lineCap = 'round'; c.lineJoin = 'round';
    c.globalAlpha = 0.9;
    for (const [lx, ly, ph] of [[-30, -17, 0], [-30, 17, PI], [24, -18, PI], [24, 18, 0]]) { const sw = Math.sin(u.wp * 0.3 + ph) * (run ? 12 : 1.5); c.strokeStyle = '#6d7b84'; c.lineWidth = 6; c.beginPath(); c.moveTo(lx, ly * 0.6); c.lineTo(lx + sw, ly * 1.3); c.stroke(); ell(c, lx + sw + 3, ly * 1.3, 5, 4, 0, '#3d474d'); }
    ell(c, -6, 0, 56, 26, 0, '#8d9ba3', OUT, 3);
    ell(c, -12, -4, 44, 17, 0, '#a7b5bb');
    c.strokeStyle = 'rgba(200,215,222,.55)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const x = -40 + i * 13, y = Math.sin(i * 1.3 + t * 0.8) * 3; c.beginPath(); c.moveTo(x, -18 + y); c.quadraticCurveTo(x - 7, 0, x, 18 - y); c.stroke(); }
    ell(c, 34 + 6 * stab, 0, 18, 12, 0, '#8d9ba3', OUT, 2.8);                              // neck and head
    ell(c, 52 + 10 * stab + 4 * charge, 0, 15, 10, 0, '#a7b5bb', OUT, 2.6);
    circ(c, 56 + 10 * stab, -6, 2.6, '#f4f6ee'); circ(c, 56 + 10 * stab, 6, 2.6, '#f4f6ee'); K.glowAt(c, 56 + 10 * stab, -6, 12, '230,245,255', 0.7); K.glowAt(c, 56 + 10 * stab, 6, 12, '230,245,255', 0.7);
    for (const s of [-1, 1]) {   // antlers: a great thorned fan, lowered to stab
      const lean = 0.5 * stab + 0.22 * charge;
      c.strokeStyle = OUT; c.lineWidth = 7.5; c.beginPath(); c.moveTo(46, s * 6); c.bezierCurveTo(52, s * (24 + 8 * bell), 74 + 18 * lean * 4, s * (44 - 8 * lean * 4), 94 + 16 * lean * 4, s * (34 - 14 * lean * 4)); c.stroke();
      c.strokeStyle = '#d9d2c0'; c.lineWidth = 4.2; c.beginPath(); c.moveTo(46, s * 6); c.bezierCurveTo(52, s * (24 + 8 * bell), 74 + 18 * lean * 4, s * (44 - 8 * lean * 4), 94 + 16 * lean * 4, s * (34 - 14 * lean * 4)); c.stroke();
      c.strokeStyle = '#cfc8b4'; c.lineWidth = 2.6; for (let k = 0; k < 4; k++) { const q = 0.25 + k * 0.2, px = 46 + 46 * q, py = s * (6 + 36 * Math.sin(q * 2.2)); c.beginPath(); c.moveTo(px, py); c.lineTo(px + 12, py + s * (10 + k * 3)); c.stroke(); }
    }
    if (beat > 0.05) { const pu = 0.5 + 0.5 * Math.sin(t * 9); K.glowAt(c, 6, 0, 30 + 70 * beat, '170,210,240', (0.35 + 0.35 * pu) * beat); }
    if (bell > 0.05) K.glowAt(c, 48, 0, 40 + 90 * bell, '200,225,245', 0.4 * bell);
    c.globalAlpha = 1;
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.4; ell(c, -6, 0, 56, 26, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ the Drover of Cairns: a ghost in a long coat and a wide hat, a whip and a lantern
  function drawDrover(c, u) {
    const t = K.S.T, w = wind(u), whip = w.type === 'cone' ? w.k : 0, herd = w.type === 'stampede' ? w.k : 0, call = w.type === 'share' ? w.k : 0;
    K.glowAt(c, u.x, u.y, 80, '140,170,200', 0.12, false);
    K.ell(c, u.x + 2, u.y + 22, 40, 18, 0, 'rgba(0,0,0,.26)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = 0.92;
    for (let i = 0; i < 4; i++) { const sw = Math.sin(t * 2 + i) * 4; c.fillStyle = `rgba(150,170,190,${0.5 - i * 0.1})`; c.beginPath(); c.moveTo(-20 - i * 10, -16 + sw); c.lineTo(-44 - i * 12, sw * 1.5); c.lineTo(-20 - i * 10, 16 + sw); c.closePath(); c.fill(); }   // the coat trailing as mist
    ell(c, -4, 0, 30, 28, 0, '#5d6c7a', OUT, 3.2); ell(c, -8, -3, 22, 19, 0, '#76889a');
    c.strokeStyle = 'rgba(30,38,46,.55)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-4, -26); c.lineTo(-2, 26); c.stroke();
    for (let i = 0; i < 3; i++) circ(c, -2, -14 + i * 14, 2, '#c9c2a6');                    // buttons
    const wa = whip * 1.2;                                                                   // right arm and the whip
    c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(4, -18); c.lineTo(22 + 8 * whip, -24 + 14 * wa); c.stroke(); c.strokeStyle = '#6a7b8c'; c.lineWidth = 7; c.beginPath(); c.moveTo(4, -18); c.lineTo(22 + 8 * whip, -24 + 14 * wa); c.stroke();
    c.strokeStyle = '#2a2018'; c.lineWidth = 2; c.beginPath(); c.moveTo(24 + 8 * whip, -24 + 14 * wa); c.bezierCurveTo(48 + 80 * whip, -50 + 60 * wa, 70 + 150 * whip, 12 - 30 * wa, 60 + 200 * whip, -8 + 20 * wa); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(4, 18); c.lineTo(24, 24); c.stroke(); c.strokeStyle = '#6a7b8c'; c.lineWidth = 7; c.beginPath(); c.moveTo(4, 18); c.lineTo(24, 24); c.stroke();
    circ(c, 28, 26, 7, `rgba(255,${190 + 30 * call},${110 + 60 * call},.95)`, OUT, 1.8); K.glowAt(c, 28, 26, 22 + 40 * call, '255,190,110', 0.5 + 0.4 * call);   // the lantern
    ell(c, 12, 0, 13, 12, 0, '#c9d4dc', OUT, 2.6);                                           // head
    ell(c, 12, 0, 22, 20, 0, '#4a5560', OUT, 2.8); ell(c, 10, -1, 12, 11, 0, '#5f6d79');    // the wide hat
    circ(c, 22, -4, 1.8, '#10161c'); circ(c, 22, 4, 1.8, '#10161c');
    if (herd > 0.05) K.glowAt(c, 0, 0, 40 + 70 * herd, '170,200,230', 0.35 * herd);
    c.globalAlpha = 1; if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.4; ell(c, -4, 0, 30, 28, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ a Gorge-twin: one half of a gargoyle, cut down the middle, an ember in the crack
  function drawTwin(c, u) {
    const t = K.S.T, w = wind(u), roar = w.type === 'share' ? w.k : 0, pull = w.type === 'cone' ? w.k : 0, spl = w.type === 'spot' ? w.k : 0, tet = w.type === 'tether' ? w.k : 0;
    K.ell(c, u.x + 3, u.y + 26, 54, 24, 0, 'rgba(0,0,0,.32)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.lineCap = 'round'; c.lineJoin = 'round';
    const ph = u.ph > 3 ? -1 : 1;
    for (const s of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 15; c.beginPath(); c.moveTo(-8, s * 12); c.quadraticCurveTo(-36 + 6 * Math.sin(t * 1.5 + s), s * 56, -64, s * (30 + 16 * roar)); c.stroke(); c.strokeStyle = '#6b6e72'; c.lineWidth = 10; c.beginPath(); c.moveTo(-8, s * 12); c.quadraticCurveTo(-36 + 6 * Math.sin(t * 1.5 + s), s * 56, -64, s * (30 + 16 * roar)); c.stroke(); }   // wings
    ell(c, -8, 0, 40, 30, 0, '#7d8186', OUT, 3.2); ell(c, -14, -4, 30, 20, 0, '#979ba0');
    for (const s of [-1, 1]) { const ax = 24 + 16 * pull + 8 * spl, ay = s * (30 - 8 * pull); c.strokeStyle = OUT; c.lineWidth = 15; c.beginPath(); c.moveTo(8, s * 16); c.lineTo(ax, ay); c.stroke(); c.strokeStyle = '#85898e'; c.lineWidth = 10; c.beginPath(); c.moveTo(8, s * 16); c.lineTo(ax, ay); c.stroke(); for (const k of [-1, 0, 1]) { c.strokeStyle = '#2f3134'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 11, ay + k * 5); c.stroke(); } }
    ell(c, 30 + 8 * roar, 0, 17, 14, 0, '#8c9095', OUT, 2.8);                              // head, horns
    for (const s of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.moveTo(26, s * 9); c.quadraticCurveTo(24, s * 22, 36, s * 24); c.stroke(); c.strokeStyle = '#5a5c60'; c.lineWidth = 4; c.beginPath(); c.moveTo(26, s * 9); c.quadraticCurveTo(24, s * 22, 36, s * 24); c.stroke(); }
    const gape = 3 + 10 * roar; c.fillStyle = '#17120e'; c.beginPath(); c.moveTo(38 + 8 * roar, -gape); c.lineTo(50 + 8 * roar, 0); c.lineTo(38 + 8 * roar, gape); c.closePath(); c.fill();
    circ(c, 34 + 8 * roar, -6, 2.4, '#ffb060'); circ(c, 34 + 8 * roar, 6, 2.4, '#ffb060'); K.glowAt(c, 34 + 8 * roar, 0, 16, '255,130,50', 0.5 + 0.3 * roar);
    // the cut: a jagged seam down the side that faces its twin, an ember in it
    c.strokeStyle = '#1b1a18'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-40, ph * -2); c.lineTo(-24, ph * 10); c.lineTo(-10, ph * 4); c.lineTo(8, ph * 14); c.lineTo(26, ph * 8); c.stroke();
    c.strokeStyle = `rgba(255,${130 + 40 * tet},50,${0.5 + 0.4 * Math.sin(t * 3 + u.ph) * 0.5 + 0.3 * tet})`; c.lineWidth = 1.6; c.stroke();
    K.glowAt(c, -8, ph * 7, 26 + 30 * tet, '255,110,40', 0.3 + 0.4 * tet);
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.35; ell(c, -8, 0, 40, 30, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ------------------------------------------------------------ the Ember-Hound Pack
  function houndBody(c, u, o) {   // o: { r, col, dark, fire, spines, lean }
    const t = K.S.T, w = wind(u), s = o.r / 24, lunge = w.type === 'line' ? w.k : 0, bite = (w.type === 'cone' || w.type === 'ring') ? w.k : 0, howl = w.type === 'share' ? w.k : 0, run = u.mv > 0.4 ? 1 : 0;
    K.ell(c, u.x + 2, u.y + 12 * s, 28 * s, 11 * s, 0, 'rgba(0,0,0,.3)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.scale(s, s); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [lx, ly, ph] of [[-14, -9, 0], [-14, 9, PI], [12, -9, PI], [12, 9, 0]]) { const sw = Math.sin(u.wp * 0.45 + ph) * (run ? 8 : 1.5); ell(c, lx + sw, ly, 7, 4, 0, o.dark, OUT, 1.8); }
    c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(-34, Math.sin(t * 6 + u.ph) * 6, -42, Math.sin(t * 5) * 8); c.stroke(); c.strokeStyle = o.dark; c.lineWidth = 3.4; c.stroke();
    ell(c, -4, 0, 25, 13, 0, o.col, OUT, 2.6); ell(c, -8, -2, 18, 8, 0, o.lite || o.col);
    if (o.spines) { c.fillStyle = '#e6dcc2'; c.strokeStyle = OUT; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const x = -18 + i * 6; c.beginPath(); c.moveTo(x - 3, -9); c.lineTo(x, -20 - (i % 2) * 5); c.lineTo(x + 3, -9); c.closePath(); c.fill(); c.stroke(); } }
    c.strokeStyle = `rgba(${o.fire},${0.55 + 0.35 * Math.sin(t * 4 + u.ph)})`; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-16, -6); c.lineTo(-8, 0); c.lineTo(-14, 6); c.moveTo(0, -7); c.lineTo(6, 0); c.lineTo(0, 7); c.stroke();
    ell(c, 21 + 5 * lunge, 0, 11, 9, 0, o.col, OUT, 2.4); ell(c, 29 + 5 * lunge + 3 * howl, 0, 7, 5, 0, o.lite || o.col, OUT, 1.8);
    const gape = 1 + 5 * bite + 6 * howl; c.fillStyle = '#170a06'; c.beginPath(); c.moveTo(27 + 5 * lunge, -gape); c.lineTo(37 + 5 * lunge, 0); c.lineTo(27 + 5 * lunge, gape); c.closePath(); c.fill();
    circ(c, 22 + 5 * lunge, -4, 1.5, `rgb(${o.fire})`); circ(c, 22 + 5 * lunge, 4, 1.5, `rgb(${o.fire})`); K.glowAt(c, 23 + 5 * lunge, 0, 12, o.fire, 0.45);
    K.glowAt(c, -2, 0, 24 + 24 * lunge + 30 * howl, o.fire, 0.18 + 0.2 * lunge + 0.3 * howl);
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.4; ell(c, -4, 0, 25, 13, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }
  const drawCinder = (c, u) => houndBody(c, u, { r: 24, col: '#4a2a22', dark: '#2a1814', lite: '#6a3a2c', fire: '255,120,50' });
  const drawThorn = (c, u) => houndBody(c, u, { r: 28, col: '#5a5246', dark: '#2e2a24', lite: '#756c5c', fire: '255,170,70', spines: true });
  const drawHowl = (c, u) => houndBody(c, u, { r: 22, col: '#8a8f98', dark: '#4a4e55', lite: '#aab0b8', fire: '170,210,255' });
  function drawLord(c, u) {
    const t = K.S.T, x = props().chx, alive = Array.isArray(x) && Array.isArray(x[0]) ? x[0] : [0, 0, 0], cols = ['255,120,50', '255,190,90', '160,210,255'];
    houndBody(c, u, { r: 42, col: '#2c2522', dark: '#161210', lite: '#41362f', fire: '255,100,40', spines: true });
    for (let i = 0; i < 3; i++) if (alive[i]) {   // the rings of the hounds that live: nothing touches him while one burns
      const R = 62 + i * 12, a0 = t * (0.5 + i * 0.12) * (i % 2 ? -1 : 1);
      c.strokeStyle = `rgba(${cols[i]},.75)`; c.lineWidth = 2.6; c.beginPath(); c.arc(u.x, u.y, R, a0, a0 + TAU * 0.82); c.stroke();
      K.glowAt(c, u.x + Math.cos(a0) * R, u.y + Math.sin(a0) * R, 14, cols[i], 0.6);
    }
  }

  // ------------------------------------------------------------ the First Hunger's Shadow: it wears one link after another in ash, and at the end nothing at all
  function drawColossus(c, u) {
    const t = K.S.T, w = wind(u), quake = w.type === 'ring' ? w.k : 0, sweep = w.type === 'cone' ? w.k : 0, lane = w.type === 'line' ? w.k : 0, fall = w.type === 'spot' ? w.k : 0, stack = w.type === 'share' ? w.k : 0;
    K.glowAt(c, u.x, u.y, 170, '20,10,6', 0.4, false);
    K.ell(c, u.x + 6, u.y + 40, 120, 50, 0, 'rgba(0,0,0,.4)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.scale(1 + 0.03 * quake, 1 + 0.03 * quake); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [lx, ly, ph] of [[-46, -52, 0], [-46, 52, PI]]) { const sw = Math.sin(u.wp * 0.1 + ph) * (u.mv > 0.3 ? 8 : 1); ell(c, lx + sw, ly, 30, 20, 0, '#2d2825', OUT, 3); }
    for (let i = 0; i < 4; i++) {   // four arms: the Hunger had many things to eat with
      const s = i < 2 ? -1 : 1, j = i % 2, lift = Math.max(sweep, quake, fall) * (j ? 1 : 0.6), ax = 34 + j * 30 + 40 * sweep * (j ? 1 : 0), ay = s * (66 + j * 14 - 20 * lift);
      c.strokeStyle = OUT; c.lineWidth = 26; c.beginPath(); c.moveTo(-6, s * 36); c.quadraticCurveTo(24, s * 66, ax, ay); c.stroke(); c.strokeStyle = '#3a342f'; c.lineWidth = 20; c.beginPath(); c.moveTo(-6, s * 36); c.quadraticCurveTo(24, s * 66, ax, ay); c.stroke();
      ell(c, ax + 10, ay, 20, 17, 0, '#2a2522', OUT, 3); K.glowAt(c, ax + 8, ay, 16, '255,120,40', 0.2 + 0.3 * lift);
    }
    ell(c, -8, 0, 84, 64, 0, '#33302c', OUT, 4); ell(c, -16, -6, 66, 46, 0, '#47423c');
    c.strokeStyle = 'rgba(255,120,40,.7)'; c.lineWidth = 2.4; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, r0 = 20 + (i % 3) * 8; c.beginPath(); c.moveTo(-8 + Math.cos(a) * r0, Math.sin(a) * r0 * 0.8); c.lineTo(-8 + Math.cos(a + 0.2) * (r0 + 26), Math.sin(a + 0.2) * (r0 + 22) * 0.8); c.lineTo(-8 + Math.cos(a - 0.1) * (r0 + 44), Math.sin(a - 0.1) * (r0 + 38) * 0.8); c.stroke(); }
    ell(c, -6, 0, 26, 22, 0, '#120a06', OUT, 2.6); K.glowAt(c, -6, 0, 40 + 90 * stack, '255,150,50', 0.5 + 0.3 * Math.sin(t * 2) + 0.4 * stack);   // the hollow in it
    ell(c, 58, 0, 25, 21, 0, '#3b3631', OUT, 3.4);                                         // a faceless head
    for (const s of [-1, 1]) { ell(c, 68, s * 8, 5, 3.4, 0, '#150c08'); K.glowAt(c, 68, s * 8, 13 + 12 * lane, '255,150,50', 0.7); }
    if (lane > 0.05) K.glowAt(c, 80, 0, 24 + 80 * lane, '255,140,50', 0.7 * lane);
    for (let i = 0; i < 10; i++) { const k = ((t * 0.3 + i / 10) % 1); circ(c, -40 + (i * 37 % 90), -60 + k * 130 - 20, 1.6, `rgba(170,150,130,${0.4 * (1 - k)})`); }
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.3; ell(c, -8, 0, 84, 64, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }
  function drawShadow(c, u) {
    const k = ST.shapes[u.id]; if (k === undefined || k >= 9) { drawColossus(c, u); return; }
    const f = DRAW_BY[['ram', 'pike', 'stumpwarden', 'ashmother', 'lanternwarden', 'hollowstag', 'drover', 'gorgetwin', 'emberlord'][k]];
    const t = K.S.T;
    K.glowAt(c, u.x, u.y, 120, '10,6,4', 0.36, false);
    c.save();
    try { if ('filter' in c) c.filter = 'grayscale(1) brightness(0.52) contrast(1.15)'; } catch (e) { /* no filters here: the ember seams still read it */ }
    if (f) f(c, u);
    c.restore();
    // ash on top: embers in its seams, flecks falling off it
    const r = (u.def && u.def.r) || 52;
    c.save(); c.translate(u.x, u.y);
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + t * 0.15, rr = r * (0.3 + 0.5 * ((i * 0.37 + t * 0.2) % 1)); K.glowAt(c, Math.cos(a) * rr, Math.sin(a) * rr * 0.8, 9, '255,120,40', 0.45 + 0.3 * Math.sin(t * 4 + i)); }
    for (let i = 0; i < 12; i++) { const q = ((t * 0.35 + i / 12) % 1); circ(c, Math.sin(i * 2.4) * r * 0.9, -r * 0.6 + q * r * 1.5, 1.5, `rgba(160,140,120,${0.5 * (1 - q)})`); }
    c.restore();
  }

  // ------------------------------------------------------------ small ones: a fog-hound, the lost calf
  function drawFogHound(c, u) {
    const t = K.S.T; K.ell(c, u.x + 1, u.y + 8, 11, 4.5, 0, 'rgba(0,0,0,.24)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.globalAlpha = 0.85; c.lineCap = 'round';
    const sw = Math.sin(u.wp * 0.55) * 3.4;
    for (const [lx, ly, ph] of [[-5, -6, 0], [-5, 6, 1], [5, -6, 1], [5, 6, 0]]) ell(c, lx + sw * (ph ? -1 : 1), ly, 3.2, 2.2, 0, '#6d7b84', OUT, 1);
    ell(c, -1, 0, 11, 6.4, 0, '#9fb0b9', OUT, 1.8); ell(c, 10, 0, 6, 4.6, 0, '#b6c4cb', OUT, 1.6); circ(c, 12, -2, 1.1, '#f4f6ee'); circ(c, 12, 2, 1.1, '#f4f6ee');
    K.glowAt(c, 0, 0, 14, '170,200,220', 0.25 + 0.1 * Math.sin(t * 5 + u.ph));
    if (u.flash > 0) { c.globalAlpha = 0.5; ell(c, 0, 0, 11, 7, 0, '#fff'); } c.restore();
  }
  function drawCalf(c, u) {
    const t = K.S.T; K.ell(c, u.x + 1, u.y + 10, 16, 6, 0, 'rgba(0,0,0,.3)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.lineCap = 'round';
    const sw = Math.sin(u.wp * 0.4) * 4;
    for (const [lx, ly, ph] of [[-8, -8, 0], [-8, 8, 1], [8, -8, 1], [8, 8, 0]]) ell(c, lx + sw * (ph ? -1 : 1), ly, 5, 3.6, 0, '#5d5a54', OUT, 1.4);
    ell(c, -1, 0, 16, 10, 0, '#8a867c', OUT, 2.2); ell(c, -3, -2, 11, 6, 0, '#a09b8f'); ell(c, 14, 0, 8, 6.4, 0, '#928d82', OUT, 2);
    c.strokeStyle = '#d6d0bc'; c.lineWidth = 2.2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(15, s * 4); c.lineTo(20, s * 8); c.stroke(); }
    c.strokeStyle = 'rgba(30,28,24,.7)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-8, -6); c.lineTo(-2, 0); c.lineTo(-8, 5); c.stroke();
    circ(c, 17, -2.4, 1.2, '#cfe6ff'); circ(c, 17, 2.4, 1.2, '#cfe6ff'); K.glowAt(c, 17, 0, 10, '170,200,255', 0.35 + 0.1 * Math.sin(t * 6));
    if (u.flash > 0) { c.globalAlpha = 0.5; ell(c, 0, 0, 16, 10, 0, '#fff'); } c.restore();
  }

  // ------------------------------------------------------------ the standing stones and cairns (props chs), thorn patches (events chzone), landmarks of the acts (props chl)
  function drawStone(c, s) {
    const x = s[0], y = s[1], hits = s[2], t = K.S.T, cairn = s[3];
    if (cairn) {
      K.ell(c, x + 3, y + 14, 46, 18, 0, 'rgba(0,0,0,.32)');
      for (const [dx, dy, r, col] of [[-16, 6, 15, '#6f6b63'], [14, 7, 14, '#7a756b'], [0, -2, 17, '#8a857a'], [-6, -14, 12, '#98938a'], [8, -17, 9, '#a39e93']]) { ell(c, x + dx, y + dy, r * 1.15, r, 0.3, col, OUT, 2.2); }
      K.glowAt(c, x, y - 6, 54, '160,200,240', 0.32 + 0.1 * Math.sin(t * 3)); c.strokeStyle = 'rgba(190,225,255,.5)'; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y - 4, 38 + 3 * Math.sin(t * 2), 0, TAU); c.stroke();
      return;
    }
    K.ell(c, x + 4, y + 20, 36, 14, 0, 'rgba(0,0,0,.34)');
    c.fillStyle = '#7c786e'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 24, y + 16); c.lineTo(x - 18, y - 34); c.lineTo(x - 4, y - 48); c.lineTo(x + 14, y - 40); c.lineTo(x + 24, y + 14); c.quadraticCurveTo(x, y + 24, x - 24, y + 16); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#9b968a'; c.beginPath(); c.moveTo(x - 18, y - 30); c.lineTo(x - 4, y - 44); c.lineTo(x + 2, y + 10); c.lineTo(x - 18, y + 12); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(210,190,130,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, y - 26); c.lineTo(x + 4, y - 8); c.moveTo(x - 2, y - 18); c.lineTo(x + 10, y - 18); c.stroke();   // a founders' mark
    if (hits >= 1) { c.strokeStyle = 'rgba(25,22,18,.9)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 6, y - 44); c.lineTo(x + 2, y - 26); c.lineTo(x - 5, y - 12); c.lineTo(x + 4, y + 6); c.stroke(); K.glowAt(c, x, y - 20, 22, '255,150,60', 0.2); }
  }
  function drawZone(c, z) {
    const t = K.S.T, age = t - z.t0; if (age < z.arm) return;   // while it warns, the core draws the red circle
    const left = z.arm + z.dur - age, fade = clamp(left / 0.8, 0, 1), k = clamp((age - z.arm) / 0.25, 0, 1);
    c.save(); c.globalAlpha = fade;
    ell(c, z.x, z.y, z.R, z.R * 0.94, 0, `rgba(120,26,26,${0.26 + 0.06 * Math.sin(t * 5 + z.id)})`, `rgba(255,86,64,${0.65 + 0.25 * Math.sin(t * 4)})`, 2);
    for (let i = 0; i < 12; i++) {   // brambles: dark thorns with red tips, standing up from the ground
      const a = i * TAU / 12 + z.id, rr = z.R * (0.35 + 0.5 * ((i * 0.37) % 1)), px = z.x + Math.cos(a) * rr, py = z.y + Math.sin(a) * rr * 0.94, h = (7 + (i % 3) * 3) * eo(k) * (1 + 0.15 * Math.sin(t * 6 + i));
      c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(px, py + 2); c.lineTo(px + Math.cos(a + 1) * 3, py - h); c.stroke();
      c.strokeStyle = '#3e2a22'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py + 2); c.lineTo(px + Math.cos(a + 1) * 3, py - h); c.stroke(); circ(c, px + Math.cos(a + 1) * 3, py - h, 1.6, '#ff6a50');
    }
    K.glowAt(c, z.x, z.y, z.R * 1.1, '255,70,50', 0.14 * fade); c.restore();
  }
  function drawLandmark(c, m) {   // [link, kind, x, y, done]
    const t = K.S.T, x = m[2], y = m[3], on = m[4];
    if (m[1] === 0) {   // the dark lantern: a post with an iron lantern, unlit
      K.ell(c, x + 2, y + 6, 16, 6, 0, 'rgba(0,0,0,.3)'); c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x, y - 34); c.lineTo(x + 14, y - 34); c.stroke(); c.strokeStyle = '#5b4a36'; c.lineWidth = 3.4; c.stroke();
      ell(c, x + 14, y - 26, 8, 10, 0, '#2c2a28', OUT, 2); ell(c, x + 14, y - 26, 4, 6, 0, '#14100c'); c.strokeStyle = '#8f8574'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 9, y - 30); c.lineTo(x + 19, y - 22); c.stroke();
    } else if (m[1] === 1 || m[1] === 3) {   // an old fence post / a kennel post with a chain and a gnawed bone
      K.ell(c, x + 2, y + 6, 11, 5, 0, 'rgba(0,0,0,.3)'); c.strokeStyle = OUT; c.lineWidth = 7.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x, y - 26); c.stroke(); c.strokeStyle = m[1] === 1 ? '#6b5a44' : '#4f4a44'; c.lineWidth = 4.6; c.stroke();
      if (m[1] === 1) { c.strokeStyle = '#a89a78'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y - 18); c.quadraticCurveTo(x + 14, y - 12, x + 30, y - 20); c.stroke(); }
      else { c.strokeStyle = '#8a8680'; c.lineWidth = 1.8; for (let i = 0; i < 4; i++) { ell(c, x + 5 + i * 4, y - 14 + i * 3, 2.4, 1.6, 0.6, null, '#8a8680', 1.4); } ell(c, x + 18, y + 2, 5, 2, 0.3, '#d8d0b8', OUT, 1); }
      if (on) K.glowAt(c, x, y - 22, 26, m[1] === 1 ? '240,210,140' : '255,140,60', 0.4 + 0.1 * Math.sin(t * 3));
    } else if (m[1] === 2) {   // the loose rockfall at the road's end
      K.ell(c, x + 4, y + 10, 40, 14, 0, 'rgba(0,0,0,.3)');
      for (const [dx, dy, r, col] of (on ? [[-30, 6, 8, '#6c685f'], [-4, 10, 9, '#77736a'], [24, 6, 10, '#6a665d'], [40, 12, 6, '#7f7b72']] : [[-16, 2, 14, '#6f6b63'], [10, 0, 15, '#7a756b'], [-2, -14, 13, '#85807a'], [18, -10, 9, '#8f8a80'], [-22, -16, 8, '#77736a']])) ell(c, x + dx, y + dy, r * 1.15, r, 0.3, col, OUT, 2);
    }
  }
  const DIM = { lamps: 0, lampsT: 0, dim: 0 };
  function darkness(c) {   // terrain only: the light goes out of the ground, never out of the units or the telegraphs
    const t = K.S.T, lamp = DIM.lampsT > t ? Math.min(1, (DIM.lampsT - t) / 0.5, (t - DIM.lamps) / 0.4 + 0.2) : 0, a = Math.max(lamp * 0.78, DIM.dim * 0.72); if (a < 0.02) return;
    const m = K.me && K.me(); const cam = K.S.cam, w = K.W() / cam.zoom, h = K.H() / cam.zoom, cx = m ? m.x : cam.x, cy = m ? m.y : cam.y, R = lamp > 0 ? 70 : 330 - 190 * DIM.dim;
    const g = c.createRadialGradient(cx, cy, R * 0.25, cx, cy, R * 2.4); g.addColorStop(0, 'rgba(4,4,10,0)'); g.addColorStop(1, `rgba(4,4,10,${a})`);
    c.save(); c.fillStyle = g; c.fillRect(cam.x - w / 2 - 20, cam.y - h / 2 - 20, w + 40, h + 40); c.restore();
  }

  // the thorn patches and the lines of the herd that the core does not draw
  const ZONES = new Map();
  function zonesTop(c) { for (const [id, z] of ZONES) { if (K.S.T - z.t0 > z.arm + z.dur + 0.2) { ZONES.delete(id); continue; } drawZone(c, z); } }
  function twinLink(c) {   // a faint grey chain of stone links between the two twins (not red: it burns only when it pulses)
    const tw = []; for (const u of K.S.units.values()) if (u.kind === 'e' && u.eid === 'gorgetwin' && !(u.f & K.FLAG.DEAD)) tw.push(u);
    if (tw.length !== 2) return; const [a, b] = tw, n = Math.max(3, Math.floor(Math.hypot(a.x - b.x, a.y - b.y) / 26));
    for (let i = 1; i < n; i++) { const q = i / n; ell(c, a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q + Math.sin(q * 9 + K.S.T) * 1.5, 4, 2.4, Math.atan2(b.y - a.y, b.x - a.x) + (i % 2 ? 1.2 : 0), '#8a8e92', '#2a2c2e', 1); }
  }

  // ------------------------------------------------------------ the rising fury: a red glow round every chain body, stronger a step at a time
  const FURY_KINDS = { ram: 1, pike: 1, stumpwarden: 1, ashmother: 1, lanternwarden: 1, hollowstag: 1, drover: 1, gorgetwin: 1, emberlord: 1, hcinder: 1, hthorn: 1, hhowl: 1, shadow: 1 };
  function drawFury(c, u) {
    if (!FURY_KINDS[u.eid] || !(ST.rage > 0)) return; const t = K.S.T, r = ((u.def && u.def.r) || 40) * (u.eid === 'shadow' && ST.shapes[u.id] >= 9 ? 1.25 : 1);
    const pu = 0.5 + 0.5 * Math.sin(t * 5); K.glowAt(c, u.x, u.y, r * (1.7 + 0.22 * ST.rage), '255,60,40', clamp(0.14 + 0.06 * ST.rage + 0.08 * pu, 0, 0.7));
  }

  const DRAW = { ram: drawRam, pike: drawPike, stumpwarden: drawWarden, ashmother: drawMother, chainwhelp: drawWhelp, lanternwarden: drawLantern, hollowstag: drawStag, drover: drawDrover, gorgetwin: drawTwin,
    emberlord: drawLord, hcinder: drawCinder, hthorn: drawThorn, hhowl: drawHowl, shadow: drawShadow, foghound: drawFogHound, stonecalf: drawCalf };
  const DRAW_BY = DRAW;

  // ------------------------------------------------------------ landmarks: faint, only noticed up close (they sit under the fog)
  const BELL = () => { const b = props().chb; return b ? b : null; };
  function drawBell(c) {
    const b = BELL(); if (!b) return; const t = K.S.T, x = b[0], y = b[1], rung = b[2], swing = rung ? Math.exp(-(t - ST.rungAt) * 0.7) * Math.sin((t - ST.rungAt) * 9) * 0.5 : 0.0;
    K.ell(c, x + 2, y + 6, 20, 7, 0, 'rgba(0,0,0,.3)');
    c.strokeStyle = OUT; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 14, y + 4); c.lineTo(x - 14, y - 26); c.lineTo(x + 14, y - 26); c.lineTo(x + 14, y + 4); c.stroke();
    c.strokeStyle = '#6b5236'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 14, y + 4); c.lineTo(x - 14, y - 26); c.lineTo(x + 14, y - 26); c.lineTo(x + 14, y + 4); c.stroke();
    c.save(); c.translate(x, y - 25); c.rotate(swing);
    c.fillStyle = '#9a7a3c'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.lineTo(10, 18); c.quadraticCurveTo(0, 22, -10, 18); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#c9a85a'; c.beginPath(); c.moveTo(-2, 1); c.lineTo(-5, 17); c.lineTo(-1, 19); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(30,22,10,.8)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(3, 4); c.lineTo(5, 10); c.lineTo(3, 14); c.stroke();   // the crack
    circ(c, 0, 21, 2, '#4a3a22'); c.restore();
    if (rung && t - ST.rungAt < 3.5) { const k = (t - ST.rungAt) / 3.5; ell(c, x, y - 12, 14 + 70 * k, 10 + 48 * k, 0, null, `rgba(240,210,130,${0.5 * (1 - k)})`, 2); }
  }
  function drawPool(c, inV) {
    const P = K.M.POND; if (!P || (inV && !inV(P.x, P.y, 140))) return; const t = K.S.T;
    // reeds, a few clumps round the water's edge
    for (let i = 0; i < 12; i++) {
      const a = i * 0.52 + 0.3, ex = P.x + Math.cos(a) * (P.rx + 6 + (i % 3) * 5), ey = P.y + Math.sin(a) * (P.ry + 6 + (i % 2) * 4), sw = Math.sin(t * 1.3 + i) * 2;
      c.strokeStyle = i % 2 ? '#4f6d3d' : '#3f5c33'; c.lineWidth = 1.8; c.lineCap = 'round';
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(ex + k * 3, ey); c.quadraticCurveTo(ex + k * 4 + sw, ey - 9, ex + k * 6 + sw * 1.6, ey - 17 - (i % 3) * 3); c.stroke(); }
      if (i % 3 === 0) { c.strokeStyle = '#6e5a3a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(ex + 5, ey); c.lineTo(ex + 5 + sw * 1.4, ey - 15); c.stroke(); circ(c, ex + 5 + sw * 1.4, ey - 17, 2.4, '#5a4630'); }
    }
    const k = (t * 0.22) % 1; ell(c, P.x + 8, P.y - 3, 14 + k * 50, 8 + k * 26, 0, null, `rgba(215,236,244,${0.2 * (1 - k)})`, 1.6);   // a slow ring from the deep
    const k2 = (t * 0.22 + 0.5) % 1; ell(c, P.x - 14, P.y + 6, 10 + k2 * 40, 6 + k2 * 20, 0, null, `rgba(215,236,244,${0.15 * (1 - k2)})`, 1.4);
  }
  function drawOak(c, inV) {
    const o = [5910, 644]; if (inV && !inV(o[0], o[1], 140)) return; const t = K.S.T, x = o[0], y = o[1], cuts = ST.cuts;
    K.ell(c, x + 6, y + 14, 34, 14, 0, 'rgba(0,0,0,.34)');
    c.strokeStyle = OUT; c.lineWidth = 3; for (const a of [-2.6, -1.9, -1.1, -0.4, 0.3, 1]) { c.beginPath(); c.moveTo(x, y + 6); c.quadraticCurveTo(x + Math.cos(a) * 20, y + 8 + Math.sin(a) * 8, x + Math.cos(a) * 36, y + 10 + Math.sin(a) * 14); c.stroke(); }
    ell(c, x, y, 24, 19, 0, '#4d3a29', OUT, 3.2); ell(c, x - 3, y - 4, 17, 13, 0, '#6a5039');
    c.strokeStyle = 'rgba(30,22,14,.6)'; c.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const a = i * 1.05; c.beginPath(); c.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 6); c.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 16); c.stroke(); }
    // the carved ring: a pale band cut into the bark, with a notch where it was started
    ell(c, x, y, 15, 11.5, 0, null, 'rgba(226,208,160,.8)', 2.4); c.strokeStyle = 'rgba(226,208,160,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 13, y - 3); c.lineTo(x + 19, y - 6); c.stroke();
    for (let i = 0; i < Math.min(6, cuts); i++) { const a = i * 1.1 + 0.4; circ(c, x + Math.cos(a) * 18, y + Math.sin(a) * 13, 2.2, '#c7a46a'); }
    if (cuts >= 6) for (let i = 0; i < 3; i++) { const dr = (t * 0.3 + i / 3) % 1; circ(c, x - 12 + i * 12, y + 8 + dr * 14, 1.8, `rgba(235,190,90,${1 - dr})`); }
    c.fillStyle = 'rgba(24,52,28,.16)'; c.beginPath(); c.ellipse(x, y - 4, 74, 56, 0, 0, TAU); c.fill();   // the canopy's shade
  }
  function drawCave(c, inV) {
    const x = 700, y = 206; if (inV && !inV(x, y, 140)) return; const t = K.S.T;
    ell(c, x, y + 2, 56, 38, 0, '#1a1613', OUT, 3.4);
    ell(c, x, y + 8, 40, 26, 0, '#050303');
    c.fillStyle = '#6a6056'; for (let i = 0; i < 9; i++) { const a = PI + i * (PI / 8), rx = x + Math.cos(a) * 56, ry = y + 2 + Math.sin(a) * 38; ell(c, rx, ry, 7, 5, a, '#665c52', OUT, 1.4); }
    c.strokeStyle = 'rgba(90,80,70,.5)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 40 + i * 26, y + 38); c.quadraticCurveTo(x - 36 + i * 26, y + 54, x - 46 + i * 26, y + 66); c.stroke(); }   // ash-streaks down the rock
    const g = 0.5 + 0.5 * Math.sin(t * 1.7); K.glowAt(c, x, y + 10, 34, '255,110,40', 0.12 + 0.08 * g);
    for (let i = 0; i < 3; i++) { const q = (t * 0.25 + i / 3) % 1; circ(c, x - 8 + i * 8 + Math.sin(t + i) * 4, y + 6 - q * 50, 1.4, `rgba(190,160,130,${0.3 * (1 - q)})`); }
  }

  // ------------------------------------------------------------ the minimap: a soft pulse at the edge toward a link that has woken
  function drawHint(g, kx, ky) {
    const P = props().chn; if (!P || P[3] !== 2 || !(P[1] || P[2])) return;
    const w = g.canvas.width, h = g.canvas.height, me = K.me && K.me(), ox = me ? me.x * kx : w / 2, oy = me ? me.y * ky : h / 2, tx = P[1] * kx, ty = P[2] * ky;
    let dx = tx - ox, dy = ty - oy; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const s = Math.min(dx > 0 ? (w - 7 - ox) / dx : dx < 0 ? (7 - ox) / dx : 1e9, dy > 0 ? (h - 7 - oy) / dy : dy < 0 ? (7 - oy) / dy : 1e9);
    const ex = ox + dx * s, ey = oy + dy * s, t = K.S.T, fresh = clamp(1 - (t - ST.wakeAt) / 14, 0, 1), pulse = (0.5 - 0.5 * Math.cos(t * TAU / 2.6)), a = 0.24 + 0.4 * pulse + 0.35 * fresh * pulse;
    const gr = g.createRadialGradient(ex, ey, 0, ex, ey, 30); gr.addColorStop(0, `rgba(255,214,150,${a})`); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(ex - 30, ey - 30, 60, 60);
    g.strokeStyle = `rgba(255,226,170,${0.25 + 0.4 * pulse})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex - dy * 5 - dx * 7, ey + dx * 5 - dy * 7); g.lineTo(ex + dx * 3, ey + dy * 3); g.lineTo(ex + dy * 5 - dx * 7, ey - dx * 5 - dy * 7); g.stroke();
  }

  // ------------------------------------------------------------ events
  function onEvent(ev) {
    const tag = ev[0]; if (typeof tag !== 'string' || tag.indexOf('ch') !== 0) return false;
    const S = K.S;
    switch (tag) {
      case 'chbell': ST.rungAt = S.T; snd('bell'); K.fxRing(ev[1], ev[2] - 10, 10, 120, 1.2, '240,210,130', 3, 0); K.burst(ev[1], ev[2] - 14, 8, { color: '#e6c98a', spd: 50, dur: 1, size: 2, kind: 'dot', vy: -20, g: -10 }); K.shake(2, 0.3); return true;
      case 'chwake': ST.wakeAt = S.T; ST.wakeI = ev[1]; snd('far', { vol: 0.22 }); return true;
      case 'chfound': return true;
      case 'chm': {
        const u = K.U('e' + ev[1]); const nm = ev[2], dur = ev[3];
        if (u) { u.chm0 = S.T; u.chmDur = dur; u.chmName = nm; u.chmType = ev[4]; }
        S.bcast = { txt: LINE[nm] || nm, t0: S.T, dur };
        const k = { jab: 'sweep', swing: 'sweep', charge: 'ramCharge', stamp: 'stamp', lunge: 'lunge', slap: 'slap', spit: 'spit', slam: 'sweep', pound: 'stamp', roots: 'roots', throw: 'throw', maul: 'sweep', breath: 'breath', call: 'call',
          gaze: 'fd-wick-breath', fist: 'stamp', rockfall: 'fd-quake', flare: 'fd-wick-glow', stab: 'sweep', bellow: 'fd-wild-howl', heartbeat: 'fd-boss-arrive', stampede: 'fd-march', whip: 'fd-tail-sweep', cairn: 'fd-wall', calf: 'fd-wild-snap',
          tether: 'fd-mire-stamp', roar: 'fd-wild-howl', splinter: 'fd-erupt', pull: 'fd-gnaw-lunge', lane: 'fd-wick-breath', flame: 'fd-wick-breath', bite: 'fd-wild-snap', snap: 'fd-wild-snap', gore: 'fd-wild-snap', ring: 'fd-quake', spines: 'fd-quake',
          howl: 'fd-wild-howl', howl2: 'fd-wild-howl', ashfall: 'fd-meteor-fall', quake: 'fd-gnaw-stamp', sweep: 'fd-tail-sweep', ashlane: 'fd-gnaw-breath', meteors: 'fd-starfall', stackfall: 'fd-wick-glow' }[nm];
        if (k) snd(k, u ? { vol: 0.8, at: { x: u.x, y: u.y }, reach: 1.5 } : { vol: 0.8 });   // (by vicinity, like the other bosses' moves: client.js snd)
        return true;
      }
      case 'chdown': { ST.rage = 0; DIM.dim = 0; DIM.lampsT = 0; const m = K.me && K.me(); snd('down'); if (m) K.ftxt(m.x, m.y - 56, '+' + ev[2] + ' coin at the run’s end', '#f3dfa4', 12, 2.2); return true; }
      case 'chbonus': { K.say(BONUS_LINE[ev[1]] || ''); K.snd('fd-pickup'); return true; }
      case 'chcut': { if (ev[4] === 6) ST.cuts = ev[3]; K.ftxt(ev[1], ev[2] - 34, ev[3] + ' / ' + ev[4], '#f3dfa4', 13, 1.2); K.burst(ev[1], ev[2], 8, { color: '#a87c4a', spd: 90, dur: 0.5, size: 3, kind: 'chunk', g: 260 }); snd('cut'); return true; }
      case 'chsoak': K.fxRing(ev[1], ev[2], 20, ev[3] ? 110 : 170, 0.6, ev[3] ? '170,215,255' : '255,120,90', 3, 0); K.ftxt(ev[1], ev[2] - 30, ev[3] ? 'Shared' : 'It bursts', ev[3] ? '#aee0ff' : '#ff9a8a', 13, 1.2); if (ev[3]) snd('soak'); K.shake(ev[3] ? 1 : 4, 0.2); return true;
      case 'chcall': { const u = K.U('e' + ev[1]); if (u) K.burst(u.x, u.y, 14, { color: '#8a6a50', spd: 140, dur: 0.7, size: 4, kind: 'dust' }); return true; }
      case 'chrage': { ST.rage = ev[2]; ST.rageAt = S.T; if (ev[2] === 1) K.say(ev[3] + ' rises.'); for (const u of S.units.values()) if (u.kind === 'e' && u.def && u.def.boss) { K.fxRing(u.x, u.y, 30, 150, 0.6, '255,60,40', 3, 0); K.ftxt(u.x, u.y - (u.def.r || 40) - 30, 'x' + (1 + 0.2 * ev[2]).toFixed(1), '#ff8a7a', 12, 1.4); break; } K.shake(2, 0.25); return true; }
      case 'chzone': ZONES.set(ev[1], { id: ev[1], x: ev[2], y: ev[3], R: ev[4], arm: ev[5], dur: ev[6], kind: ev[7], t0: S.T }); return true;
      case 'chzoff': { const z = ZONES.get(ev[1]); if (z) { z.dur = Math.max(0, (S.T - z.t0) - z.arm + 0.6); } return true; }
      case 'chbreak': K.burst(ev[1], ev[2] - 10, 12, { color: '#8a857a', spd: 150, dur: 0.6, size: 4, kind: 'chunk', g: 280 }); K.fxRing(ev[1], ev[2], 10, 70, 0.4, '190,180,160', 2, 0); K.snd('fd-log-break', { vol: 0.7 }); K.shake(2, 0.2); return true;
      case 'chrise': K.snd('fd-erupt', { vol: 0.5 }); K.shake(2, 0.3); return true;
      case 'chlamps': DIM.lamps = S.T; DIM.lampsT = S.T + ev[1]; K.snd('fd-post-out', { vol: 0.8 }); return true;
      case 'chdim': DIM.dim = ev[1]; return true;
      case 'chshape': { ST.shapes[ev[1]] = ev[2]; const u = K.U('e' + ev[1]); if (u) { K.burst(u.x, u.y, 18, { color: '#9a8a78', spd: 120, dur: 0.9, size: 5, kind: 'dust' }); K.fxRing(u.x, u.y, 20, 150, 0.7, '255,140,60', 3, 0); } K.snd('fd-quake', { vol: 0.5 }); K.shake(3, 0.35); return true; }
      case 'chpull': { const u = K.U('h' + ev[1]); K.fxRing(ev[2], ev[3], 60, 14, 0.4, '255,170,110', 3, 0); if (u) K.burst(ev[2], ev[3], 8, { color: '#8a857a', spd: 90, dur: 0.4, size: 3, kind: 'dust' }); K.snd('fd-gnaw-lunge', { vol: 0.6 }); return true; }
      case 'chcairn': K.fxRing(ev[1], ev[2], 10, 80, 0.6, '170,210,255', 3, 0); K.burst(ev[1], ev[2] - 6, 14, { color: '#8a857a', spd: 120, dur: 0.6, size: 4, kind: 'chunk', g: 240 }); K.snd('fd-setdown', { vol: 0.8 }); return true;
      case 'chherd': { K.shake(3, 0.7); K.snd('fd-march', { vol: 0.8 }); const dx = Math.cos(ev[1]), dy = Math.sin(ev[1]); for (let i = 0; i < 6; i++) K.burst(ev[2] - dx * (360 + i * 8), ev[3] - dy * (360 + i * 8) + (i - 2.5) * 56, 5, { color: '#7a6e5c', spd: 70, dur: 1, size: 5, kind: 'dust' }); return true; }
      case 'chfell': K.burst(ev[2], ev[3], 26, { color: '#8a857a', spd: 190, dur: 0.9, size: 5, kind: 'chunk', g: 260 }); K.fxRing(ev[2], ev[3], 20, 170, 0.7, '255,130,60', 3, 0); K.snd('fd-log-break', { vol: 0.9 }); K.shake(5, 0.5); return true;
      case 'chhound': { for (const u of K.S.units.values()) if (u.kind === 'e' && u.eid === 'emberlord') { K.fxRing(u.x, u.y, 30, 130, 0.6, '255,150,70', 3, 0); K.burst(u.x, u.y, 12, { color: '#ff9040', spd: 120, dur: 0.6, size: 3, kind: 'dot' }); } K.snd('fd-wild-howl', { vol: 0.6 }); return true; }
      case 'chpost': K.ftxt(ev[4], ev[5] - 40, ev[2] + ' / ' + ev[3], '#f3dfa4', 13, 1.2); K.snd('fd-pickup', { vol: 0.8 }); K.fxRing(ev[4], ev[5], 8, 40, 0.5, '240,215,150', 2, 0); return true;
      case 'chcrown': { const u = K.U('h' + ev[1]); if (u) K.fxRing(u.x, u.y, 14, 54, 0.5, '190,210,235', 2, 0); return true; }
      case 'chlose': ST.rage = 0; DIM.dim = 0; DIM.lampsT = 0; K.say('It slips back into the dark, and waits.'); return true;
      case 'chend': return true;
    }
    return false;
  }

  Founding.addLayer({
    init(kit) { K = kit; },
    reset() { Object.assign(ST, { rungAt: -99, wakeAt: -99, wakeI: -1, cutAt: -99, cuts: 0, oakHit: 0, shapes: {}, rage: 0, rageAt: -99 }); Object.assign(DIM, { lamps: 0, lampsT: 0, dim: 0 }); ZONES.clear(); },
    event: onEvent,
    ground(c, inV) { if (!K) return; drawBell(c); drawPool(c, inV); drawOak(c, inV); drawCave(c, inV); twinLink(c); darkness(c); },
    units(L, inV) {
      if (!K) return; const P = props();
      for (const s of P.chs || []) if (!inV || inV(s[0], s[1], 60)) L.push([s[1] + 8, 9, { draw(c) { drawStone(c, s); } }]);
      for (const m of P.chl || []) if (!inV || inV(m[2], m[3], 60)) L.push([m[3] + 4, 9, { draw(c) { drawLandmark(c, m); } }]);
    },
    top(c) { if (K) zonesTop(c); },
    mini(g, kx, ky) { if (K) drawHint(g, kx, ky); },
    drawEnemy(c, u) { const f = u.eid && DRAW[u.eid]; if (!f) return false; f(c, u); drawFury(c, u); return true; },
    snap() { const P = props().chn; if (!P) return; if (P[3] === 2 && ST.wakeI !== P[0] && ST.wakeAt < -50) { ST.wakeAt = K.S.T; ST.wakeI = P[0]; } },
  });
})();
