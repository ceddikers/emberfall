// Boss art, drawn in code. Same conventions as heroes.js (facing +x), ~45px radius at scale 1.

const BOSS_ATTACK_DUR = 1.4;

const BOSS_ART = {
  grubnak(ctx, st) {
    const skin = '#7fa650', apron = '#f1ede2';
    const props = st.props || {};
    const s = swing(actP(st, 'attack'));
    const w = st.moving ? Math.sin(st.t * 7) * 6 : 0;
    // Belly Flop (Hard): he crouches and swells, bouncing on his heels, before he drops
    if (props.flop) { const q = 1.08 + Math.sin(st.t * 14) * 0.04; ctx.scale(q, q); }
    // ...and then he's down: sprawled flat on his belly, arms and legs flung out, his hat knocked off, seeing stars
    if (props.flat) {
      ellipse(ctx, -2, 0, 58, 52, 0, 'rgba(0,0,0,0.22)');
      for (const sy of [-1, 1]) {
        line(ctx, -16, 16 * sy, -46, 40 * sy, OUT, 17); line(ctx, -16, 16 * sy, -46, 40 * sy, '#5a4636', 12);
        ellipse(ctx, -50, 44 * sy, 12, 8, 0.6 * sy, '#4a3524', OUT, 2.5);
        line(ctx, 10, 26 * sy, 40, 50 * sy, OUT, 17); line(ctx, 10, 26 * sy, 40, 50 * sy, skin, 12);
        circle(ctx, 43, 53 * sy, 9, skin, OUT, 2.5);
      }
      // the cleaver, dropped by his hand
      ctx.save(); ctx.translate(58, 50); ctx.rotate(0.4); rrect(ctx, -6, -2.5, 10, 5, 2, '#5a3d22', OUT, 2); rrect(ctx, 3, -5, 28, 20, [2, 6, 6, 2], '#c7ccd4', OUT, 2.5); ctx.restore();
      // his back, squashed flat, the apron strings tied in a bow
      ellipse(ctx, -4, 0, 38, 37, 0, skin, OUT, 3);
      ellipse(ctx, -12, -12, 15, 13, 0, shade(skin, 0.12));
      line(ctx, -4, -36, -4, 36, '#f1ede2', 3);
      for (const sy of [-1, 1]) ellipse(ctx, -12, 7 * sy, 7, 4, 0.5 * sy, '#f1ede2', OUT, 1.5);
      // his head, face down; the hat off to one side
      circle(ctx, 28, 0, 14, skin, OUT, 2.5);
      ellipse(ctx, 22, 0, 6, 10, 0, shade(skin, -0.12));
      ctx.save(); ctx.translate(30, -48); ctx.rotate(-0.7);
      for (const [hx, hy] of [[-6, -6], [-6, 6], [0, 0], [-12, 0]]) circle(ctx, hx, hy, 6.5, '#ffffff', OUT, 2);
      rrect(ctx, 2, -8, 4, 16, 1.5, '#e6e2d8', OUT, 1.5);
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const a = st.t * 4 + i * TAU / 3, x = 30 + Math.cos(a) * 22, y = Math.sin(a) * 22;
        ctx.save(); ctx.translate(x, y); ctx.rotate(st.t * 5 + i);
        poly(ctx, [0, -6, 1.8, -1.8, 6, 0, 1.8, 1.8, 0, 6, -1.8, 1.8, -6, 0, -1.8, -1.8], '#ffe27a', OUT, 1);
        ctx.restore();
      }
      return;
    }
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
    // ---- [boss presentation] cast poses: what he holds in his off hand says which move is coming (boss-vfx.js CAST_POSE)
    } else if (props.raise) {
      // Grease Fire / Last Orders / Last Call: a skillet of grease thrust up and forward, catching light
      ctx.save(); ctx.translate(4, -31); ctx.rotate(-0.35);
      ellipse(ctx, 0, 0, 13, 9, 0, skin, OUT, 2.5);
      line(ctx, 8, 0, 30, 0, OUT, 7); line(ctx, 8, 0, 30, 0, '#3a3a42', 4);
      circle(ctx, 44, 0, 15, '#2a2a30', OUT, 3); circle(ctx, 44, 0, 10.5, '#6a4212');
      const fl = 0.75 + Math.sin(st.t * 13) * 0.2;
      glow(ctx, 44, 0, 34, '#ff8a2a', 0.55 * fl);
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 + st.t * 3, h = 9 + 5 * Math.sin(st.t * 15 + i * 2.1), fx = 44 + Math.cos(a) * 5, fy = Math.sin(a) * 5;
        poly(ctx, [fx - 3.5, fy, fx + Math.cos(a) * h, fy + Math.sin(a) * h, fx + 3.5, fy], i % 2 ? '#ffb030' : '#ff6a14');
      }
      circle(ctx, 44, 0, 4, '#fff0b0');
      circle(ctx, 12, 0, 8, skin, OUT, 2.5);
      ctx.restore();
    } else if (props.bell) {
      // Order Up! / Dinner Rush / Service!: a brass service bell held out, his thumb on the plunger; it rings on the beat
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      const ding = Math.max(0, 1 - ((st.t * 1.6) % 1) * 4);
      ctx.save(); ctx.translate(26, -44 + ding * 1.5);
      ellipse(ctx, 0, 3, 15, 6, 0, '#5a3a1a', OUT, 2);
      ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#e0b048'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      ellipse(ctx, -4, -4, 4, 2.5, -0.4, 'rgba(255,248,210,0.8)');
      rrect(ctx, -1.5, -15, 3, 6, 1, '#c89a3a', OUT, 1.5);
      if (ding > 0) glow(ctx, 0, -2, 26, '#ffe08a', 0.6 * ding);
      ctx.restore();
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.cloche) {
      // Family Meal / Mise en Place: a covered platter held high on his palm, steam leaking from under the dome
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      ctx.save(); ctx.translate(24, -46);
      ellipse(ctx, 0, 4, 22, 9, 0, '#c8ced4', OUT, 2.5);
      ctx.beginPath(); ctx.ellipse(0, 3, 17, 15, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#dfe4e8'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      ellipse(ctx, -6, -5, 5, 3, -0.5, 'rgba(255,255,255,0.8)');
      circle(ctx, 0, -12, 3.2, '#c8ced4', OUT, 1.5);
      for (let i = 0; i < 3; i++) { const q = (st.t * 0.9 + i / 3) % 1; circle(ctx, -14 + i * 14, 2 - q * 20, 3 + q * 4, `rgba(245,245,245,${0.45 * (1 - q)})`); }
      ctx.restore();
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.whisk) {
      // Whisk: a big balloon whisk, beating so fast its wires blur
      ctx.save(); ctx.translate(4, -31); ctx.rotate(-0.5);
      ellipse(ctx, 0, 0, 13, 9, 0, skin, OUT, 2.5);
      line(ctx, 8, 0, 28, 0, OUT, 6); line(ctx, 8, 0, 28, 0, '#b88a4a', 3.5);
      ctx.translate(40, 0); ctx.rotate(st.t * 22);
      ellipse(ctx, 0, 0, 14, 14, 0, 'rgba(240,236,220,0.22)');
      for (let i = 0; i < 4; i++) ellipse(ctx, 0, 0, 13, 4.5, i * Math.PI / 4, null, '#dfe4ea', 1.6);
      ctx.restore();
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.hunk) {
      // Meat Toss: a slab of raw meat on the bone, swung back to throw
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      ctx.save(); ctx.translate(14, -50); ctx.rotate(-0.5 + Math.sin(st.t * 7) * 0.12);
      ellipse(ctx, 0, 0, 16, 11, 0, '#b83a2a', OUT, 2.5); ellipse(ctx, -3, -3, 9, 5, 0, '#e07060'); ellipse(ctx, 5, 2, 5, 3, 0.4, '#f0e0d0');
      line(ctx, 14, 0, 22, 0, '#efe6cf', 4); circle(ctx, 23, -2, 3, '#efe6cf', OUT, 1); circle(ctx, 23, 2, 3, '#efe6cf', OUT, 1);
      ctx.restore();
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.spice) {
      // Spice Rack: a jar of chilli shaken over the room, red flakes jumping out of it
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      const sh = Math.sin(st.t * 18) * 3;
      ctx.save(); ctx.translate(26 + sh, -46); ctx.rotate(0.6);
      rrect(ctx, -7, -11, 14, 20, 3, '#d8c8a8', OUT, 2); rrect(ctx, -7, 0, 14, 9, 2, '#c8401a'); rrect(ctx, -8, -14, 16, 5, 2, '#7a4a22', OUT, 1.5);
      ctx.restore();
      for (let i = 0; i < 4; i++) { const q = (st.t * 2.2 + i / 4) % 1; circle(ctx, 36 + q * 18 + i * 2, -50 + (i - 1.5) * 6 + q * 8, 1.8 * (1 - q) + 0.6, `rgba(220,60,20,${1 - q})`); }
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.bucket) {
      // Clogged Drains: a slop bucket of grease tipped forward, a thick brown pour off its lip
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      ctx.save(); ctx.translate(26, -44); ctx.rotate(0.8 + Math.sin(st.t * 3) * 0.08);
      rrect(ctx, -10, -11, 20, 22, [2, 2, 6, 6], '#6a6e74', OUT, 2.5); ellipse(ctx, 0, -11, 10, 3.5, 0, '#3a2410', OUT, 1.5);
      line(ctx, -10, -6, 10, -6, '#4a4e54', 1.5);
      ctx.restore();
      for (let i = 0; i < 3; i++) { const q = (st.t * 1.8 + i / 3) % 1; circle(ctx, 40 + q * 12, -38 + q * 4, 4.5 * (1 - q * 0.5), `rgba(110,64,20,${0.9 * (1 - q)})`); }
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.heave || props.carry) {
      // Flare-Up (and the walk down with it): both hands under the stockpot (the pot itself is drawn over his head below)
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      circle(ctx, 16, -30, 8, skin, OUT, 2.5);
    // ---- [/boss presentation]
    } else if (props.meat) {
      // Rolling Meatballs: a huge meatball hefted in his off hand, ready to throw
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      const bob = Math.sin(st.t * 6) * 2;
      circle(ctx, 22, -44 + bob, 17, '#7a3a1e', OUT, 2.5);
      ellipse(ctx, 18, -50 + bob, 10, 5, 0, 'rgba(200,40,20,0.8)');
      circle(ctx, 27, -40 + bob, 2.5, '#6ec046'); circle(ctx, 16, -38 + bob, 2, '#4a200e');
      circle(ctx, 16, -35, 8, skin, OUT, 2.5);
    } else if (props.brandy) {
      // Flambé (Hard): a brandy bottle in his off hand, a blue flame dancing on its neck
      ellipse(ctx, 4, -31, 13, 9, 0.35, skin, OUT, 2.5);
      ctx.save(); ctx.translate(24, -42); ctx.rotate(0.5 + Math.sin(st.t * 5) * 0.15);
      rrect(ctx, -7, -6, 22, 12, 4, '#7a3a12', OUT, 2); rrect(ctx, 13, -3, 10, 6, 2, '#5a2a0e', OUT, 1.5);
      ellipse(ctx, 2, -2, 6, 2.5, 0, 'rgba(255,220,160,0.5)');
      glow(ctx, 26, 0, 14, '#5aa8ff', 0.7 + Math.sin(st.t * 14) * 0.2);
      ctx.restore();
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
    // (Cleaver Toss, Hard: the cleaver drawn back over his shoulder, glinting)
    // ([boss presentation] Tenderize: the cleaver hauled up behind his shoulder, its edge brightening as the blow nears)
    const rg = props.mince ? (props.mince.side === 'right' ? 0.75 + Math.sin(st.t * 10) * 0.2 : props.mince.second === 'right' ? 0.25 : 0) : props.toss ? 0.6 + Math.sin(st.t * 12) * 0.2 : props.windup ? 0.45 + Math.sin(st.t * 9) * 0.2 : 0;
    ctx.save(); ctx.translate(2, 27); ctx.rotate(props.mince ? 0.9 : props.toss ? 2.2 : props.windup && !(s > 0.05) ? 2.6 + Math.sin(st.t * 4) * 0.06 : 0.15 + s * 1.2);
    ellipse(ctx, 9, 0, 14, 9, 0, skin, OUT, 2.5);
    cleaver(rg);
    circle(ctx, 20, 0, 8.5, skin, OUT, 2.5);
    ctx.restore();
    // head, tusks, chef hat ([boss presentation] Butcher's Charge: head down, tusks first, the hat pushed forward)
    const hd = props.headdown ? 7 + Math.sin(st.t * 16) * 1.2 : 0;
    ctx.save(); ctx.translate(hd, 0);
    circle(ctx, 23, 0, 13, skin, OUT, 2.5);
    for (const sy of [-1, 1]) poly(ctx, [32, 5 * sy, 41 + hd * 0.6, 8 * sy, 34, 1.5 * sy], '#f3ecd8', OUT, 1.5);
    circle(ctx, 31, -4.5, 1.8, props.headdown ? '#c8301a' : OUT); circle(ctx, 31, 4.5, 1.8, props.headdown ? '#c8301a' : OUT);
    if (hd) { ctx.translate(hd * 0.5, 0); ctx.scale(0.86, 0.86); }
    for (const [hx, hy] of [[14, -7], [14, 7], [20, 0], [8, 0]]) circle(ctx, hx, hy, 7.5, '#ffffff', OUT, 2);
    circle(ctx, 14, 0, 7, '#ffffff');
    rrect(ctx, 21, -9, 4, 18, 1.5, '#e6e2d8', OUT, 1.5);
    ctx.restore();
    if (props.heave || props.carry) {
      // [boss presentation] the stockpot hoisted over his head (Flare-Up), or carried down to the middle; it sways
      const sw = Math.sin(st.t * (props.carry ? 9 : 4)) * 2, R = 30;
      ctx.save(); ctx.translate(6 + sw, -4);
      ellipse(ctx, 4, 6, R + 4, R * 0.8, 0, 'rgba(0,0,0,0.18)');
      for (const sy of [-1, 1]) rrect(ctx, -6, sy * (R + 2) - 3, 12, 6, 3, '#4a4e54', OUT, 2);
      circle(ctx, 0, 0, R, '#9aa2ab', OUT, 3);
      circle(ctx, 0, 0, R - 6, '#5a3a20', OUT, 1.5);
      circle(ctx, 0, 0, R - 9, '#c8601a');
      for (let i = 0; i < 4; i++) { const q = (st.t * 1.3 + i / 4) % 1, a = i * 1.7; circle(ctx, Math.cos(a) * 9, Math.sin(a) * 9, 2 + q * 3, `rgba(255,${180 + q * 60 | 0},90,${0.9 * (1 - q)})`); }
      ellipse(ctx, -10, -12, 7, 4, -0.6, 'rgba(255,255,255,0.35)');
      ctx.restore();
    }
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
    // eight legs ([boss presentation] props.fold 0..1: dead, they curl in under her one pair after another)
    const fold = props.fold || 0;
    for (const sy of [-1, 1]) for (let i = 0; i < 4; i++) {
      const bx = 12 - i * 5, by = 8 * sy, fi = clamp(fold * 1.6 - i * 0.2, 0, 1);
      const sw = Math.sin(st.t * speed + i * 1.4 + (sy > 0 ? Math.PI : 0)) * (st.moving ? 0.22 : 0.06) * (1 - fold) + (fold > 0 && fi < 1 ? Math.sin(st.t * 30 + i) * 0.08 * fi : 0);
      const a = sy * (0.55 + i * 0.62 + sw - (i < 2 ? rear * 0.4 : 0));
      const L1 = 30 * (1 - 0.45 * fi), kx = bx + Math.cos(a) * L1, ky = by + Math.sin(a) * L1;
      const a2 = a + sy * (i < 2 ? -0.5 : 0.5) + sy * 2.2 * fi;
      const fx = kx + Math.cos(a2) * 26 * (1 - 0.3 * fi), fy = ky + Math.sin(a2) * 26 * (1 - 0.3 * fi);
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
    glow(ctx, hx + 5, 0, 10, '#ff3a3a', 0.35 * (1 - fold));
    for (const [ex, ey, r] of [[5, -3, 1.8], [5, 3, 1.8], [3, -5.5, 1.3], [3, 5.5, 1.3], [6.5, -1, 1.1], [6.5, 1, 1.1]]) circle(ctx, hx + ex, ey, r, fold > 0.6 ? '#5a2a2a' : '#ff3a3a');
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
      const a = st.t * (props.spin ? 3.2 : 0.8) + i * TAU / 4, rr = 64 * (1 + (props.disperse || 0) * 1.6), rx = Math.cos(a) * rr, ry = Math.sin(a) * rr;   // ([boss presentation] disperse: flung off as he goes)
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
    const props = st.props || {};
    let s = swing(actP(st, 'attack'));
    if (props.rise || props.raise) s = -0.9;   // Rise, My Guard / a big swing coming: the greatsword held high
    if (props.windup && !(s > 0.05)) s = -1.35 + Math.sin(st.t * 5) * 0.04;   // [boss presentation] Grave Cleave: hauled right back
    if (st.raid) ctx.scale(1.2, 1.2);
    glow(ctx, 0, 0, 75, ghost, 0.14);
    // Barrow Knell: rings of a tolling bell roll off him
    if (props.knell) for (let i = 0; i < 3; i++) { const q = (st.t * 0.9 + i / 3) % 1; ellipse(ctx, 0, 0, 30 + q * 70, 30 + q * 70, 0, null, rgba('#d8ffe4', 0.5 * (1 - q)), 2.5); }
    // Crown of Graves / Barrow Stomp: grave-light pools under him
    if (props.graves) glow(ctx, 0, 0, 95, '#3aff7a', 0.28 + Math.sin(st.t * 7) * 0.08);
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
    // ghost flame in the left hand (Royal Doom: it burns violet and a sigil turns in it)
    if (props.doom) {
      glow(ctx, 16, -24, 26, '#b46aff', 0.75);
      ctx.save(); ctx.translate(16, -24); ctx.rotate(st.t * 2);
      for (let k = 0; k < 3; k++) { const a = k * TAU / 3; line(ctx, Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a + 2.1) * 9, Math.sin(a + 2.1) * 9, '#e8d0ff', 1.5); }
      ctx.restore();
    // ---- [boss presentation] cast poses in his off hand (boss-vfx.js CAST_POSE)
    } else if (props.marks) {
      // Grave Marks: the hand thrust out, a ring of grave-sigils turning in its flame
      glow(ctx, 24, -30, 30, ghost, 0.7 + Math.sin(st.t * 9) * 0.15);
      ctx.save(); ctx.translate(24, -30); ctx.rotate(-st.t * 2.5);
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4; ctx.save(); ctx.rotate(a); line(ctx, 11, -3, 11, 3, '#c8ffd8', 1.6); line(ctx, 8.5, 0, 13.5, 0, '#c8ffd8', 1.6); ctx.restore(); }
      ellipse(ctx, 0, 0, 15, 15, 0, null, rgba('#c8ffd8', 0.6), 1.2);
      ctx.restore();
    } else if (props.gavel) {
      // Writ / Judgement: his sceptre raised over the court, its head burning gold
      ctx.save(); ctx.translate(16, -24); ctx.rotate(-0.9);
      line(ctx, 0, 0, 40, 0, OUT, 5.5); line(ctx, 0, 0, 40, 0, gold, 3);
      glow(ctx, 44, 0, 26, '#ffe6a0', 0.6 + Math.sin(st.t * 8) * 0.2);
      circle(ctx, 44, 0, 6.5, '#ffe08a', OUT, 2);
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + st.t; poly(ctx, [44 + Math.cos(a - 0.3) * 6, Math.sin(a - 0.3) * 6, 44 + Math.cos(a) * 12, Math.sin(a) * 12, 44 + Math.cos(a + 0.3) * 6, Math.sin(a + 0.3) * 6], '#ffe08a', OUT, 1); }
      ctx.restore();
    } else if (props.scroll) {
      // The Charge Sheet: a long roll of charges unfurled from his hand, read out line by line
      ctx.save(); ctx.translate(20, -30); ctx.rotate(-0.3);
      rrect(ctx, 0, -9, 34, 18, 1.5, '#d8ccb0', OUT, 1.8);
      for (let i = 0; i < 4; i++) line(ctx, 5, -5 + i * 3.4, 29 - (i % 2) * 6, -5 + i * 3.4, i === Math.floor(st.t * 1.5) % 4 ? '#3aff7a' : '#6a5a40', 1.2);
      rrect(ctx, -3, -11, 5, 22, 2.5, '#a8987a', OUT, 1.5); rrect(ctx, 32, -11, 5, 22, 2.5, '#a8987a', OUT, 1.5);
      ctx.restore();
    // ---- [/boss presentation]
    } else glow(ctx, 16, -24, 14, ghost, 0.6);
    circle(ctx, 16, -24, 5, '#4a4e5c', OUT, 2);
    // greatsword
    ctx.save(); ctx.translate(10, 24); ctx.rotate(0.3 + s * 1.2);
    poly(ctx, [4, -3.5, 52, -3.5, 60, 0, 52, 3.5, 4, 3.5], '#2b2f3a', OUT, 2);
    line(ctx, 8, 0, 50, 0, rgba(ghost, 0.9), 1.5);
    if (props.windup) { const g = 0.55 + Math.sin(st.t * 10) * 0.2; glow(ctx, 34, 0, 34, '#b46aff', g * 0.6); line(ctx, 8, 0, 54, 0, rgba('#f0e0ff', g), 2.2); }
    rrect(ctx, 0, -8, 4, 16, 1.5, gold, OUT, 1.5);
    rrect(ctx, -9, -2, 9, 4, 1.5, '#2a1d14', OUT, 1.2);
    circle(ctx, 0, 0, 5.5, '#4a4e5c', OUT, 2);
    ctx.restore();
    // helm and jagged crown (Royal Audience, Hard: the crown blazes and its points grow)
    circle(ctx, 4, 0, 11, '#2a2c34', OUT, 2.5);
    const aud = props.audience ? 0.75 + Math.sin(st.t * 9) * 0.2 : 0;
    if (aud) glow(ctx, 4, 0, 44, '#ffe6a0', 0.6 * aud);
    if (!props.crownless) for (let k = 0; k < 9; k++) {   // ([boss presentation] crownless: it fell when he did)
      const a = k * TAU / 9 + 0.35, tip = 16 + aud * 7;
      poly(ctx, [4 + Math.cos(a - 0.22) * 9, Math.sin(a - 0.22) * 9, 4 + Math.cos(a) * tip, Math.sin(a) * tip,
        4 + Math.cos(a + 0.22) * 9, Math.sin(a + 0.22) * 9], aud ? '#ffe08a' : gold, OUT, 1.2);
    }
    circle(ctx, 4, 0, 8.5, '#2a2c34');
    // Royal Gaze: he lifts his head and his eyes blaze white
    if (props.gaze) {
      const k = 0.7 + Math.sin(st.t * 10) * 0.2;
      glow(ctx, 12, 0, 34, '#e8fff0', 0.55 * k);
      for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.2; line(ctx, 14, 0, 14 + Math.cos(a) * 46, Math.sin(a) * 46, rgba('#e8fff0', 0.35 * k), 2); }
      circle(ctx, 10.5, -3.5, 2.6, '#ffffff'); circle(ctx, 10.5, 3.5, 2.6, '#ffffff');
    } else if (!props.crownless) {
      glow(ctx, 11, 0, 10, ghost, 0.6);
      circle(ctx, 10.5, -3.5, 1.8, ghost); circle(ctx, 10.5, 3.5, 1.8, ghost);
    }
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
  // Skitterra's cocoon (Hard): a pale bundle of silk bound round someone, stuck to a pillar; it twitches as they struggle
  cocoon(ctx, st) {
    const tw = Math.sin(st.t * 9) * 0.06;
    ctx.save(); ctx.rotate(tw);
    ellipse(ctx, 0, -6, 13, 20, 0, '#e8e4f0', OUT, 2.2);
    for (let i = 0; i < 6; i++) { const y = -22 + i * 6.5; ctx.beginPath(); ctx.ellipse(0, y, 13 - Math.abs(y + 6) * 0.25, 3, 0.3 * (i % 2 ? 1 : -1), 0, Math.PI); ctx.strokeStyle = 'rgba(150,140,170,0.7)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ellipse(ctx, -4, -14, 4, 7, -0.3, 'rgba(255,255,255,0.5)');
    ctx.restore();
  },
  // Skitterra's egg clutches: a heap of pale eggs bound in silk, twitching (break them before they hatch)
  clutch(ctx, st) {
    const tw = Math.sin(st.t * 7) * 0.05;
    ctx.save(); ctx.rotate(tw);
    ellipse(ctx, 0, 2, 24, 17, 0, 'rgba(230,226,240,0.35)', 'rgba(240,240,255,0.6)', 1.5);
    for (const [x, y, r] of [[-9, 2, 8], [8, 3, 8], [0, -7, 8], [-2, 9, 7], [11, -6, 6]]) {
      ellipse(ctx, x, y, r, r * 0.82, 0.3, '#ece6d6', OUT, 1.6);
      ellipse(ctx, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.2, -0.4, 'rgba(255,255,255,0.6)');
    }
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 2, 20 - i * 2, i * 1.3, i * 1.3 + 2.2); ctx.strokeStyle = 'rgba(240,240,255,0.55)'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  },
  // a thread's knot by its pillar: a fat wad of silk the thread runs out of (break it and the thread is cut)
  knot(ctx, st) {
    const tw = Math.sin(st.t * 5) * 0.08;
    ctx.save(); ctx.rotate(tw);
    circle(ctx, 0, 0, 15, '#e4e0ee', OUT, 2);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, i * 0.63, 0, TAU); ctx.strokeStyle = 'rgba(150,140,175,0.6)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ellipse(ctx, -5, -5, 4, 3, -0.5, 'rgba(255,255,255,0.7)');
    ctx.restore();
  },
  // the Hollow King's coffins (Court of Bones): a stone coffin by the wall, its lid grinding open as its time comes
  coffin(ctx, st) {
    const open = st.props && st.props.open ? Math.min(1, st.props.open) : 0;
    rrect(ctx, -11, -24, 22, 48, 5, '#3a3f43', OUT, 2.2);
    rrect(ctx, -8, -21, 16, 42, 4, '#24282b');
    if (open > 0) glow(ctx, 0, 0, 22 + open * 10, '#6dff9a', 0.4 * open);
    ctx.save(); ctx.translate(open * 6, -open * 3); ctx.rotate(open * 0.25);
    rrect(ctx, -12, -25, 24, 50, 5, '#525a5e', OUT, 2.2);
    line(ctx, 0, -17, 0, 10, 'rgba(10,12,12,0.6)', 2.5); line(ctx, -6, -10, 6, -10, 'rgba(10,12,12,0.6)', 2.5);
    ctx.restore();
  },
  // a skeleton out of a coffin: old bones in a rusted helm, a notched sword
  skeleton(ctx, st, enraged) {
    const sw = swing(actP(st, 'attack')), bone = '#e6e0cc';
    glow(ctx, 0, 0, 22, '#6dff9a', 0.15);
    for (const sy of [-1, 1]) limb(ctx, [-2, 5 * sy, -9, 9 * sy + Math.sin(st.t * 8) * 2 * sy], bone, 2);
    ellipse(ctx, -2, 0, 7, 9, 0, 'rgba(30,30,28,0.6)', OUT, 1.5);
    for (let i = -1; i <= 1; i++) line(ctx, -5, i * 3.5, 1, i * 3.5, bone, 1.6);
    ctx.save(); ctx.translate(4, 9); ctx.rotate(0.5 + sw * 1.3);
    poly(ctx, [2, -1.8, 26, -1.8, 30, 0, 26, 1.8, 2, 1.8], '#8a8070', OUT, 1.3);
    ctx.restore();
    circle(ctx, 5, 0, 6.5, bone, OUT, 1.8);
    circle(ctx, 7, -2.2, 1.6, enraged ? '#ff4a2a' : '#6dff9a'); circle(ctx, 7, 2.2, 1.6, enraged ? '#ff4a2a' : '#6dff9a');
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

// The Hollow King's Echo Knights: ghosts of his old guard, see-through and edged in grave-light. st.props.ready: the
// knight lifts its blade for a replay; st.props.mem (0..1): the swing it just remembered still glows on it.
function drawEchoKnight(ctx, x, y, angle, st, alpha = 1, scale = 1.6) {
  const ghost = '#6dff9a', steel = '#7a8a8e', dark = '#33403f';
  const props = st.props || {};
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.globalAlpha = alpha * 0.35;
  ellipse(ctx, 2, 7, 20, 14, 0, 'rgba(0,0,0,0.5)');
  ctx.globalAlpha = alpha;
  ctx.rotate(angle);
  const bob = Math.sin(st.t * 2.2) * 1.5;
  glow(ctx, 0, 0, 40, ghost, 0.16 + (props.mem || 0) * 0.4 + (props.ready ? 0.25 : 0));
  ctx.globalAlpha = alpha * 0.82;
  // a torn tabard trailing into mist where its legs should be
  const tab = [-4, -14];
  for (let i = 0; i <= 6; i++) tab.push(-24 - (i % 2) * 6 + Math.sin(st.t * 3 + i) * 2.5, -14 + i * 4.7);
  tab.push(-4, 14);
  poly(ctx, tab, rgba('#1f3a2c', 0.9), rgba(ghost, 0.5), 1.5);
  ellipse(ctx, -2, bob * 0.3, 14, 18, 0, steel, OUT, 2.2);
  line(ctx, -2, -12, -2, 12, rgba(ghost, 0.55), 1.4);
  // kite shield on the left arm
  ctx.save(); ctx.translate(4, -17);
  poly(ctx, [-7, -6, 7, -6, 8, 2, 0, 10, -8, 2], dark, OUT, 1.8);
  line(ctx, 0, -5, 0, 8, rgba(ghost, 0.7), 1.2); line(ctx, -5, -1, 5, -1, rgba(ghost, 0.7), 1.2);
  ctx.restore();
  // longsword on the right: held low, or raised for a replay (then it swings through)
  const sw = swing(actP(st, 'attack'));
  ctx.save(); ctx.translate(7, 16); ctx.rotate(props.ready ? -1.1 : 0.45 + sw * 1.4);
  poly(ctx, [3, -2.4, 40, -2.4, 46, 0, 40, 2.4, 3, 2.4], '#9fb0b4', OUT, 1.6);
  line(ctx, 6, 0, 40, 0, rgba(ghost, 0.95), 1.3);
  rrect(ctx, 0, -6, 3, 12, 1, '#5a6a6e', OUT, 1.2);
  ctx.restore();
  // great helm with a slit full of green light
  circle(ctx, 3, 0, 9, '#5f6d70', OUT, 2.2);
  rrect(ctx, 7, -5, 3, 10, 1, '#0d1a14');
  glow(ctx, 9, 0, 9, ghost, 0.55 + (props.ready ? 0.3 : 0));
  line(ctx, 9, -3.5, 9, 3.5, '#c8ffd8', 1.6);
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
