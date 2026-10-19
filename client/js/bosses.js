// Boss art, drawn in code. Same conventions as heroes.js (facing +x), ~45px radius at scale 1.

const BOSS_ATTACK_DUR = 1.4;

const BOSS_ART = {
  grubnak(ctx, st) {
    const skin = '#7fa650', apron = '#f1ede2';
    const props = st.props || {};
    const s = swing(actP(st, 'attack'));
    const w = st.moving ? Math.sin(st.t * 7) * 6 : 0;
    // raid props (the arena sets st.props from the boss's cast): held tools tell you what's coming
    if (props.held === 'ladle' && props.spin) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(0, 0, 70 + i * 8, st.t * 9 + i, st.t * 9 + i + 2.2);
        ctx.strokeStyle = `rgba(255,240,210,${0.35 - i * 0.1})`; ctx.lineWidth = 5 - i; ctx.stroke();
      }
    }
    ellipse(ctx, 2 + w, -17, 11, 8, 0, '#4a3524', OUT, 2.5);
    ellipse(ctx, 2 - w, 17, 11, 8, 0, '#4a3524', OUT, 2.5);
    // what he grabs after the chop: a lid strapped to his back, or a ladle tucked behind him
    if (props.next === 'lid') { circle(ctx, -30, 0, 22, '#aab2bb', OUT, 2.5); circle(ctx, -30, 0, 15, null, '#d8dee4', 1.5); }
    if (props.next === 'ladle') { line(ctx, -50, -14, -14, 4, OUT, 6); line(ctx, -50, -14, -14, 4, '#b88a4a', 3.5); circle(ctx, -54, -16, 10, '#9aa2ab', OUT, 2.5); }
    const cleaver = (glowA) => {
      if (glowA > 0) {
        glow(ctx, 44, 6, 70, '#fff2b0', glowA);
        // glints running along the edge
        for (let i = 0; i < 3; i++) {
          const q = (st.t * 1.6 + i / 3) % 1;
          circle(ctx, 31 + q * 26, 15, 3.5 * (1 - Math.abs(q - 0.5) * 2) + 0.5, `rgba(255,255,255,${glowA})`);
        }
      }
      rrect(ctx, 20, -2.5, 10, 5, 2, '#5a3d22', OUT, 2);
      rrect(ctx, 29, -5, 30, 22, [2, 6, 6, 2], glowA > 0.5 ? '#fffbe8' : '#c7ccd4', OUT, 2.5);
      line(ctx, 31, 15, 57, 15, '#eef1f5', 2);
      circle(ctx, 53, -0.5, 2.2, '#5d636c');
    };
    if (props.mince) {
      // a second cleaver comes out; the one about to fall catches the light
      const pulseA = 0.75 + Math.sin(st.t * 10) * 0.2;
      const lg = props.mince.side === 'left' ? pulseA : props.mince.second === 'left' ? 0.25 : 0;
      ctx.save(); ctx.translate(2, -27); ctx.rotate(-0.9); ctx.scale(1, -1);
      ellipse(ctx, 9, 0, 14, 9, 0, skin, OUT, 2.5);
      cleaver(lg);
      circle(ctx, 20, 0, 8.5, skin, OUT, 2.5);
      ctx.restore();
    } else if (props.held === 'ladle') {
      ctx.save(); ctx.translate(4, -31); ctx.rotate(props.spin ? -1.4 : -0.6);
      ellipse(ctx, 0, 0, 13, 9, 0, skin, OUT, 2.5);
      line(ctx, 8, 0, 62, 0, OUT, 6); line(ctx, 8, 0, 62, 0, '#b88a4a', 3.5);
      circle(ctx, 70, 0, 12, '#9aa2ab', OUT, 2.5); circle(ctx, 70, 0, 7, '#5a3a20');
      circle(ctx, 12, 0, 8, skin, OUT, 2.5);
      ctx.restore();
    } else if (props.held === 'lid') {
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.meat) {
      // Rolling Meatballs: a huge meatball hefted in his off hand, ready to throw
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      const bob = Math.sin(st.t * 6) * 2;
      circle(ctx, 22, -44 + bob, 17, '#7a3a1e', OUT, 2.5);
      ellipse(ctx, 18, -50 + bob, 10, 5, 0, 'rgba(200,40,20,0.8)');
      circle(ctx, 27, -40 + bob, 2.5, '#6ec046'); circle(ctx, 16, -38 + bob, 2, '#4a200e');
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else {
      // left arm holding a drumstick
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      limb(ctx, [30, -39, 38, -43], '#efe6cf', 2.5);
      ellipse(ctx, 25, -37, 8, 6, 0.3, '#a8642e', OUT, 2);
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    }
    // belly + apron
    ellipse(ctx, -4, 0, 30, 34, 0, skin, OUT, 3);
    ellipse(ctx, -10, -10, 12, 14, 0, shade(skin, 0.15));
    ellipse(ctx, 7, 0, 18, 24, 0, apron, OUT, 2);
    circle(ctx, 10, -8, 2.5, '#b33a2a'); circle(ctx, 4, 9, 1.8, '#b33a2a'); circle(ctx, 13, 6, 1.4, '#8a5a2a');
    // right arm with the giant cleaver
    const rg = props.mince ? (props.mince.side === 'right' ? 0.75 + Math.sin(st.t * 10) * 0.2 : props.mince.second === 'right' ? 0.25 : 0) : 0;
    ctx.save(); ctx.translate(2, 27); ctx.rotate(props.mince ? 0.9 : 0.15 + s * 1.2);
    ellipse(ctx, 9, 0, 14, 9, 0, skin, OUT, 2.5);
    cleaver(rg);
    circle(ctx, 20, 0, 8.5, skin, OUT, 2.5);
    ctx.restore();
    // head, tusks, chef hat
    circle(ctx, 23, 0, 13, skin, OUT, 2.5);
    for (const sy of [-1, 1]) poly(ctx, [32, 5 * sy, 41, 8 * sy, 34, 1.5 * sy], '#f3ecd8', OUT, 1.5);
    circle(ctx, 31, -4.5, 1.8, OUT); circle(ctx, 31, 4.5, 1.8, OUT);
    for (const [hx, hy] of [[14, -7], [14, 7], [20, 0], [8, 0]]) circle(ctx, hx, hy, 7.5, '#ffffff', OUT, 2);
    circle(ctx, 14, 0, 7, '#ffffff');
    rrect(ctx, 21, -9, 4, 18, 1.5, '#e6e2d8', OUT, 1.5);
    if (props.held === 'lid') {
      // a pot lid hoisted overhead, ready to come down
      const lift = 1 + Math.sin(st.t * 5) * 0.04;
      ellipse(ctx, 8, -6, 40 * lift, 40 * lift, 0, 'rgba(0,0,0,0.18)');
      circle(ctx, 6, -10, 36 * lift, '#aab2bb', OUT, 3);
      circle(ctx, 6, -10, 27 * lift, null, '#d8dee4', 2);
      rrect(ctx, 0, -16, 12, 12, 3, '#3a2a1a', OUT, 2);
    }
    if (props.steam) {
      for (let i = 0; i < 6; i++) {
        const q = (st.t * 0.8 + i / 6) % 1, a = i * 1.05;
        circle(ctx, Math.cos(a) * (30 + q * 30), Math.sin(a) * (30 + q * 30), 8 + q * 10, `rgba(240,240,240,${0.35 * (1 - q)})`);
      }
    }
  },

  skitterra(ctx, st) {
    const props = st.props || {};
    // a shed husk is the same shape, pale and hollow
    const husk = !!props.husk;
    const body = husk ? '#b8a99a' : '#3a2448', dark = husk ? '#8a7c70' : '#24152e', mark = husk ? '#c8b8a8' : '#d6304a', gold = husk ? '#d8ccb8' : '#e8c15a';
    const rear = Math.max(pulse(actP(st, 'attack')), props.rear ? 0.55 + Math.sin(st.t * 7) * 0.12 : 0);
    const speed = st.moving ? 10 : 2.2;
    // Silk: threads stream from her spinnerets and wheel around her
    if (props.silk) {
      for (let i = 0; i < 5; i++) {
        const a = st.t * 2.2 + i * TAU / 5;
        ctx.beginPath(); ctx.moveTo(-50, 0);
        ctx.quadraticCurveTo(Math.cos(a) * 40 - 40, Math.sin(a) * 70, Math.cos(a + 0.6) * 75, Math.sin(a + 0.6) * 75);
        ctx.strokeStyle = 'rgba(240,240,255,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    // eight legs
    for (const sy of [-1, 1]) for (let i = 0; i < 4; i++) {
      const bx = 12 - i * 5, by = 8 * sy;
      const sw = Math.sin(st.t * speed + i * 1.4 + (sy > 0 ? Math.PI : 0)) * (st.moving ? 0.22 : 0.06);
      const a = sy * (0.55 + i * 0.62 + sw - (i < 2 ? rear * 0.4 : 0));
      const kx = bx + Math.cos(a) * 30, ky = by + Math.sin(a) * 30;
      const a2 = a + sy * (i < 2 ? -0.5 : 0.5);
      const fx = kx + Math.cos(a2) * 26, fy = ky + Math.sin(a2) * 26;
      limb(ctx, [bx, by, kx, ky, fx, fy], body, 4);
      circle(ctx, kx, ky, 3, dark, OUT, 1.2);
    }
    // abdomen with hourglass marking (Brood: the egg sacs inside glow)
    ellipse(ctx, -26, 0, 28, 23, 0, body, OUT, 3);
    ellipse(ctx, -30, -7, 12, 8, 0, shade(body, 0.15));
    if (props.brood) {
      for (const [ex, ey] of [[-34, -9], [-20, 10], [-38, 8], [-22, -10]]) {
        glow(ctx, ex, ey, 12, '#e8ff9a', 0.5 + Math.sin(st.t * 9 + ex) * 0.2);
        circle(ctx, ex, ey, 4.5, '#f4ffd0', OUT, 1.2);
      }
    }
    poly(ctx, [-36, -8, -18, -8, -27, 0, -18, 8, -36, 8, -27, 0], mark, OUT, 1.5);
    if (husk) for (const pts of [[-44, -6, -34, 0, -40, 8], [-14, -14, -20, -4, -12, 4]]) { tracePath(ctx, pts); ctx.strokeStyle = '#6a5c50'; ctx.lineWidth = 1.5; ctx.stroke(); }
    ellipse(ctx, 6, 0, 15, 13, 0, shade(body, 0.08), OUT, 2.5);
    // head, fangs, eyes, crown
    const hx = 22 + rear * 6;
    circle(ctx, hx, 0, 9, dark, OUT, 2.5);
    const open = 0.35 + rear * 0.5 + Math.sin(st.t * 6) * 0.05;
    for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(hx + 6, 3.5 * sy); ctx.rotate(sy * open);
      poly(ctx, [0, -2, 10, 0, 0, 2], '#e8dcc0', OUT, 1.3);
      ctx.restore();
    }
    // Venom: her fangs drip green before she spits or breathes mist
    if (props.venom) {
      glow(ctx, hx + 16, 0, 22, '#8aff4a', 0.6 + Math.sin(st.t * 8) * 0.15);
      for (let i = 0; i < 3; i++) { const q = (st.t * 1.4 + i / 3) % 1; circle(ctx, hx + 14 + q * 10, (i - 1) * 5, 2.6 * (1 - q) + 0.6, `rgba(170,255,110,${0.9 * (1 - q)})`); }
    }
    if (husk) return;
    glow(ctx, hx + 5, 0, 10, '#ff3a3a', 0.35);
    for (const [ex, ey, r] of [[5, -3, 1.8], [5, 3, 1.8], [3, -5.5, 1.3], [3, 5.5, 1.3], [6.5, -1, 1.1], [6.5, 1, 1.1]]) circle(ctx, hx + ex, ey, r, '#ff3a3a');
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 0.6 + k * Math.PI * 0.2;
      poly(ctx, [hx + Math.cos(a - 0.15) * 7, Math.sin(a - 0.15) * 7, hx + Math.cos(a) * 13, Math.sin(a) * 13,
        hx + Math.cos(a + 0.15) * 7, Math.sin(a + 0.15) * 7], gold, OUT, 1.2);
    }
  },

  volkar(ctx, st) {
    const stone = '#5b6a80', dark = '#3a4455', bolt = '#7fe8ff';
    const props = st.props || {};
    const pa = actP(st, 'attack');
    let f = 0; // fist punch: pull back, slam forward, recover
    if (pa >= 0) f = pa < 0.4 ? -easeOut(pa / 0.4) * 0.6 : pa < 0.55 ? -0.6 + 1.6 * ((pa - 0.4) / 0.15) : 1 - (pa - 0.55) / 0.45;
    if (st.raid) ctx.scale(1.35, 1.35);   // in his own arena he is a giant
    glow(ctx, 0, 0, 80, bolt, props.charge ? 0.3 : 0.12);
    // Thunderclap / Eye of the Storm: the sky churns overhead
    if (props.sky) for (let i = 0; i < 7; i++) {
      const a = st.t * 1.4 + i * TAU / 7;
      glow(ctx, Math.cos(a) * 46, Math.sin(a) * 46, 30, '#1a2230', 0.7);
      if ((Math.floor(st.t * 10) + i) % 5 === 0) jagged(ctx, Math.cos(a) * 46, Math.sin(a) * 46, 0, 0, Math.floor(st.t * 20) + i, bolt, 1.2);
    }
    // Gale Slam: he draws breath, and the air streams into him
    if (props.inhale) for (let i = 0; i < 10; i++) {
      const q = (st.t * 1.8 + i / 10) % 1, a = i * TAU / 10, d = 110 - q * 80;
      line(ctx, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * (d - 18), Math.sin(a) * (d - 18), `rgba(225,240,255,${0.7 * q})`, 2);
    }
    // orbiting rocks tethered by lightning (they whirl while the storm walls turn)
    for (let i = 0; i < 4; i++) {
      const a = st.t * (props.spin ? 3.2 : 0.8) + i * TAU / 4, rx = Math.cos(a) * 64, ry = Math.sin(a) * 64;
      if (Math.floor(st.t * 8 + i * 3) % 4 !== 0) jagged(ctx, rx * 0.45, ry * 0.45, rx, ry, Math.floor(st.t * 14) + i * 31, bolt, 1.2);
      poly(ctx, [rx - 7, ry - 4, rx - 2, ry - 8, rx + 6, ry - 5, rx + 7, ry + 3, rx + 1, ry + 7, rx - 6, ry + 5], stone, OUT, 2);
    }
    const w = st.moving ? Math.sin(st.t * 6) * 6 : 0;
    ellipse(ctx, -6 + w, -18, 13, 10, 0, dark, OUT, 2.5);
    ellipse(ctx, -6 - w, 18, 13, 10, 0, dark, OUT, 2.5);
    // hulking stone body with glowing cracks
    ellipse(ctx, -6, 0, 24, 40, 0, stone, OUT, 3);
    ellipse(ctx, -10, -14, 10, 14, 0, shade(stone, 0.12));
    for (const pts of [[-14, -22, -6, -12, -10, -2, -2, 8], [-16, 14, -8, 20, -12, 30]]) {
      tracePath(ctx, pts); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 5; ctx.strokeStyle = rgba(bolt, 0.3); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = bolt; ctx.stroke();
    }
    for (const sy of [-1, 1]) {
      const fx = 16 + f * 18, fy = 36 * sy;
      ellipse(ctx, 4 + f * 8, 32 * sy, 14, 10, 0, dark, OUT, 2.5);
      // Polarity Surge: one hand burns gold, the other cold blue. Titan Fist: the right fist gathers lightning.
      if (props.polar) glow(ctx, fx, fy, 30, sy < 0 ? '#ffc24a' : '#4ad8ff', 0.6 + Math.sin(st.t * 8) * 0.15);
      if (props.fist && sy > 0) { glow(ctx, fx, fy, 34, bolt, 0.7 + Math.sin(st.t * 12) * 0.2); if (Math.floor(st.t * 14) % 2) jagged(ctx, fx, fy, fx + 30, fy + (Math.random() - 0.5) * 30, Math.floor(st.t * 14), bolt, 1.2); }
      circle(ctx, fx, fy, 14, stone, OUT, 3);
      line(ctx, fx + 7, fy - 6, fx + 7, fy + 6, dark, 2);
      line(ctx, fx + 3, fy - 8, fx + 3, fy + 8, dark, 1.5);
      if (f > 0.5) glow(ctx, fx + 8, fy, 22, bolt, f - 0.5);
    }
    // charged up (rods, Thunder Crash, Static Field): lightning crawls over the stone
    if (props.charge && Math.floor(st.t * 12) % 2) for (let i = 0; i < 2; i++) {
      const a = (Math.floor(st.t * 12) * 1.7 + i * 2.4) % TAU;
      jagged(ctx, Math.cos(a) * 12, Math.sin(a) * 30, Math.cos(a + 0.8) * 28, Math.sin(a + 0.8) * 40, Math.floor(st.t * 12) * 5 + i, bolt, 1.1);
    }
    // head with a crown of stone spikes
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 0.6 + k * Math.PI * 0.2;
      poly(ctx, [16 + Math.cos(a - 0.2) * 9, Math.sin(a - 0.2) * 9, 16 + Math.cos(a) * 18, Math.sin(a) * 18,
        16 + Math.cos(a + 0.2) * 9, Math.sin(a + 0.2) * 9], stone, OUT, 1.5);
    }
    circle(ctx, 16, 0, 11, dark, OUT, 2.5);
    glow(ctx, 23, 0, 12, bolt, 0.5);
    circle(ctx, 23, -4, 2.2, '#dffbff'); circle(ctx, 23, 4, 2.2, '#dffbff');
    if (Math.floor(st.t * 10) % 3 === 0) jagged(ctx, -12, -30, 2, -18, Math.floor(st.t * 20), bolt, 1);
  },

  hollowking(ctx, st) {
    const iron = '#3a3d48', ghost = '#6dff9a', gold = '#b89a4a';
    const s = swing(actP(st, 'attack'));
    glow(ctx, 0, 0, 75, ghost, 0.14);
    // tattered cape
    const cape = [-2, -24];
    for (let i = 0; i <= 8; i++) cape.push(-38 - (i % 2) * 8 + Math.sin(st.t * 3 + i) * 3, -26 + i * 6.5);
    cape.push(-2, 24);
    poly(ctx, cape, '#1c1a24', OUT, 2.5);
    // orbiting ghost skulls
    for (let i = 0; i < 3; i++) {
      const a = -st.t * 1.1 + i * TAU / 3, x = Math.cos(a) * 54, y = Math.sin(a) * 54;
      glow(ctx, x, y, 14, ghost, 0.45);
      circle(ctx, x, y, 6, '#d8f5e0', OUT, 1.5);
      circle(ctx, x - 1.8, y - 1, 1.5, OUT); circle(ctx, x + 1.8, y - 1, 1.5, OUT);
    }
    const w = st.moving ? Math.sin(st.t * 7) * 5 : 0;
    ellipse(ctx, 2 + w, -11, 8, 6, 0, '#22232b', OUT, 2);
    ellipse(ctx, 2 - w, 11, 8, 6, 0, '#22232b', OUT, 2);
    ellipse(ctx, -2, 0, 19, 27, 0, iron, OUT, 3);
    ellipse(ctx, -2, 0, 13, 20, 0, null, rgba(ghost, 0.4), 1.5);
    for (const sy of [-1, 1]) {
      ellipse(ctx, 0, 23 * sy, 11, 9, 0, '#4a4e5c', OUT, 2.5);
      poly(ctx, [-4, 29 * sy, -1, 37 * sy, 2, 29 * sy], '#4a4e5c', OUT, 1.5);
    }
    // ghost flame in the left hand
    glow(ctx, 16, -24, 14, ghost, 0.6);
    circle(ctx, 16, -24, 5, '#4a4e5c', OUT, 2);
    // greatsword
    ctx.save(); ctx.translate(10, 24); ctx.rotate(0.3 + s * 1.2);
    poly(ctx, [4, -3.5, 52, -3.5, 60, 0, 52, 3.5, 4, 3.5], '#2b2f3a', OUT, 2);
    line(ctx, 8, 0, 50, 0, rgba(ghost, 0.9), 1.5);
    rrect(ctx, 0, -8, 4, 16, 1.5, gold, OUT, 1.5);
    rrect(ctx, -9, -2, 9, 4, 1.5, '#2a1d14', OUT, 1.2);
    circle(ctx, 0, 0, 5.5, '#4a4e5c', OUT, 2);
    ctx.restore();
    // helm and jagged crown
    circle(ctx, 4, 0, 11, '#2a2c34', OUT, 2.5);
    for (let k = 0; k < 9; k++) {
      const a = k * TAU / 9 + 0.35;
      poly(ctx, [4 + Math.cos(a - 0.22) * 9, Math.sin(a - 0.22) * 9, 4 + Math.cos(a) * 16, Math.sin(a) * 16,
        4 + Math.cos(a + 0.22) * 9, Math.sin(a + 0.22) * 9], gold, OUT, 1.2);
    }
    circle(ctx, 4, 0, 8.5, '#2a2c34');
    glow(ctx, 11, 0, 10, ghost, 0.6);
    circle(ctx, 10.5, -3.5, 1.8, ghost); circle(ctx, 10.5, 3.5, 1.8, ghost);
  },
};

// Adds (killable minions). Same conventions as the bosses: facing +x.
const ADD_ART = {
  // a spiderling: a small purple spider; enraged, it swells and its marking burns
  spiderling(ctx, st, enraged) {
    const body = enraged ? '#5a1e3a' : '#4a2c5e', mark = enraged ? '#ff4a2a' : '#d6304a';
    const bite = pulse(actP(st, 'attack'));
    if (enraged) glow(ctx, 0, 0, 34, '#ff3a2a', 0.35 + Math.sin(st.t * 10) * 0.12);
    for (const sy of [-1, 1]) for (let i = 0; i < 4; i++) {
      const sw = Math.sin(st.t * (st.moving ? 16 : 3) + i * 1.5 + (sy > 0 ? Math.PI : 0)) * (st.moving ? 0.3 : 0.08);
      const a = sy * (0.6 + i * 0.6 + sw);
      const kx = 4 - i * 2 + Math.cos(a) * 13, ky = 4 * sy + Math.sin(a) * 13;
      const a2 = a + sy * (i < 2 ? -0.6 : 0.6);
      limb(ctx, [4 - i * 2, 4 * sy, kx, ky, kx + Math.cos(a2) * 11, ky + Math.sin(a2) * 11], body, 2.5);
    }
    ellipse(ctx, -11, 0, 12, 10, 0, body, OUT, 2.2);
    poly(ctx, [-15, -3.5, -7, -3.5, -11, 0, -7, 3.5, -15, 3.5, -11, 0], mark, OUT, 1);
    circle(ctx, 5 + bite * 4, 0, 6.5, shade(body, -0.2), OUT, 2);
    circle(ctx, 8 + bite * 4, -2, 1.3, '#ff5a4a'); circle(ctx, 8 + bite * 4, 2, 1.3, '#ff5a4a');
  },
};
function drawAdd(ctx, kind, x, y, angle, st, enraged, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (enraged ? 1.2 : 1), scale * (enraged ? 1.2 : 1));
  ellipse(ctx, 2, 6, 22, 17, 0, 'rgba(0,0,0,0.3)');
  ctx.rotate(angle);
  (ADD_ART[kind] || ADD_ART.spiderling)(ctx, st, enraged);
  ctx.restore();
}

function drawBoss(ctx, boss, x, y, angle, st, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ellipse(ctx, 4, 10, 50, 40, 0, 'rgba(0,0,0,0.3)');
  ctx.rotate(angle);
  BOSS_ART[boss.id](ctx, st);
  ctx.restore();
}
