// Hero art, drawn in code ("paper doll" style). Each hero is drawn in local space
// facing +x, with the left hand at -y and the right hand at +y, ~16px radius at scale 1.

const ANIM_DUR = { attack: 0.45, bash: 0.4, brace: 1.2, cast: 0.55, big: 0.9, dash: 0.2 };

function feet(ctx, st, color) {
  const w = st.moving ? Math.sin(st.t * 12) * 5 : 0;
  ellipse(ctx, 1 + w, -6.5, 5, 3.4, 0, color, OUT, 1.5);
  ellipse(ctx, 1 - w, 6.5, 5, 3.4, 0, color, OUT, 1.5);
}
function torso(ctx, color, rx = 9, ry = 14) {
  ellipse(ctx, -1, 0, rx, ry, 0, color, OUT, 2);
  ellipse(ctx, 0.5, -ry * 0.25, rx * 0.45, ry * 0.42, 0, shade(color, 0.18));
}
function hand(ctx, x, y, color) { circle(ctx, x, y, 3.5, color, OUT, 1.5); }
// How far a caster's hands / orb / staff are pushed out: a quick pulse for instant spells, a steady build-up
// while channeling a real cast (so the orb is biggest right before it releases).
function castAmt(st) {
  const a = st.action;
  if (a && a.channel && a.type === 'cast') { const p = actP(st, 'cast'); return p < 0 ? 0 : Math.min(1, 0.25 + p * 0.9); }
  return pulse(Math.max(actP(st, 'cast'), actP(st, 'big')));
}
// direction of the current swing: autos alternate forehand / backhand
const swingDir = st => (st.action && st.action.alt ? -1 : 1);
// a glowing motion smear along a weapon's arc (local space), from angle a0 to a1 at radius r around (cx, cy)
function smear(ctx, cx, cy, r, a0, a1, color, alpha, width = 6) {
  if (alpha <= 0.02 || Math.abs(a1 - a0) < 0.05) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  for (const [col, w, al] of [[color, width, 0.35], ['#ffffff', width * 0.35, 0.7]]) {
    ctx.globalAlpha = alpha * al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, lo, hi); ctx.stroke();
  }
  ctx.restore();
}
// how much of a swing's strike is happening right now (0 outside the fast part), for smears
function strikeAmt(p) { return p < 0.28 || p > 0.62 ? 0 : Math.sin((p - 0.28) / 0.34 * Math.PI); }

function flame(ctx, x, y, r, t) {
  glow(ctx, x, y, r * 3, '#ff7a1a', 0.35);
  const j = Math.sin(t * 23) * 0.6, k = Math.cos(t * 17) * 0.6;
  circle(ctx, x, y, r, '#ff4d1a');
  circle(ctx, x + 0.8 + j, y + k * 0.5, r * 0.72, '#ff9a2a');
  circle(ctx, x + 1.2 + j * 0.5, y + k * 0.3, r * 0.42, '#ffe27a');
}

const HERO_ART = {
  bastion(ctx, st) {
    const steel = '#9fb0c6', blue = '#3d6fb6', gold = '#e8c15a';
    const s = swing(actP(st, 'attack'));
    const bash = pulse(actP(st, 'bash'));
    const pb = actP(st, 'brace');
    const brace = pb < 0 ? 0 : Math.min(1, pb / 0.12, (1 - pb) / 0.12);
    const big = pulse(actP(st, 'big'));
    const front = Math.max(bash, brace);
    const wave = Math.sin(st.t * 4) * 1.5 + (st.moving ? Math.sin(st.t * 11) * 2 : 0);
    poly(ctx, [-4, -12, -19, -13 + wave * 0.5, -23 + wave, 0, -19, 13 - wave * 0.5, -4, 12], blue, OUT, 2);
    feet(ctx, st, '#5d6878');
    torso(ctx, steel);
    ellipse(ctx, 0, -12, 6, 5, 0, '#8796ab', OUT, 1.5);
    ellipse(ctx, 0, 12, 6, 5, 0, '#8796ab', OUT, 1.5);
    // sword (with a bright arc while it cuts)
    const dir = swingDir(st), rot = 0.35 + dir * s * 1.1 - big * 1.3, pa = actP(st, 'attack');
    smear(ctx, 7, 12, 24, 0.35 + dir * 1.1, rot, '#cfe0ff', strikeAmt(pa), 7);
    ctx.save(); ctx.translate(7, 12); ctx.rotate(rot);
    poly(ctx, [2, -2, 22, -2, 27, 0, 22, 2, 2, 2], '#e3e9f0', OUT, 1.5);
    line(ctx, 4, 0, 21, 0, '#b8c2cf', 1);
    rrect(ctx, -0.5, -5.5, 3, 11, 1, gold, OUT, 1.2);
    rrect(ctx, -6, -1.6, 5.5, 3.2, 1, '#6b4a2b', OUT, 1);
    ctx.restore();
    hand(ctx, 7, 12, steel);
    // tower shield: at the side normally, in front when bashing / bracing
    ctx.save(); ctx.translate(7 + 9 * front, -12 + 11 * front); ctx.rotate(-0.45 * (1 - front));
    rrect(ctx, -3.5, -13, 7, 26, 3, blue, OUT, 2);
    rrect(ctx, -1.8, -10.5, 3.6, 21, 1.5, null, gold, 1.4);
    circle(ctx, 0, 0, 2.6, gold, OUT, 1);
    ctx.restore();
    // helmet with plume
    circle(ctx, 1, 0, 8, steel, OUT, 2);
    circle(ctx, 2.5, -2.5, 3, '#c3cfdd');
    line(ctx, 6.6, -3.5, 6.6, 3.5, '#2a3140', 2);
    ellipse(ctx, -3.5, 0, 7, 2.6, 0, '#c43b3b', OUT, 1.5);
  },

  bloodreaver(ctx, st) {
    const leather = '#6e2b2b', iron = '#5b5f66', bone = '#e8dcc0';
    const s = swing(actP(st, 'attack'));
    const wave = Math.sin(st.t * 4) * 1.5 + (st.moving ? Math.sin(st.t * 11) * 2 : 0);
    poly(ctx, [-4, -11, -17, -12, -20 + wave, -6, -15, -3, -22 + wave, 1, -16, 5, -20 + wave, 10, -4, 11], '#4a1416', OUT, 2);
    feet(ctx, st, '#3a1a1a');
    torso(ctx, leather, 9.5, 14.5);
    for (const sy of [-1, 1]) {
      ellipse(ctx, -1, 12.5 * sy, 6.5, 5, 0, iron, OUT, 1.5);
      poly(ctx, [-4, 15 * sy, -2, 22 * sy, 0, 15.5 * sy], bone, OUT, 1.2);
      poly(ctx, [1, 15 * sy, 4, 20 * sy, 4, 14 * sy], bone, OUT, 1.2);
    }
    // two-handed axe (a heavy red-tinged arc while it chops)
    const dir = swingDir(st), rot = 0.1 + dir * s * 1.3;
    smear(ctx, 3, 7, 30, 0.1 + dir * 1.3, rot, '#ff9a8a', strikeAmt(actP(st, 'attack')), 9);
    ctx.save(); ctx.translate(3, 7); ctx.rotate(rot);
    rrect(ctx, -6, -1.8, 34, 3.6, 1.5, '#6b4a2b', OUT, 1.5);
    poly(ctx, [22, -2, 25, -11, 33, -15, 31, -6, 31, 6, 33, 15, 25, 11, 22, 2], iron, OUT, 2);
    line(ctx, 32, -13, 30.5, -5, '#c9ced6', 1.2);
    line(ctx, 32, 13, 30.5, 5, '#c9ced6', 1.2);
    hand(ctx, 2, 0, '#c99a7a'); hand(ctx, 12, 0, '#c99a7a');
    ctx.restore();
    // horned helm
    for (const sy of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(1, 5 * sy);
      ctx.quadraticCurveTo(3, 13 * sy, 11, 13 * sy);
      ctx.quadraticCurveTo(5, 10 * sy, 4, 4 * sy);
      ctx.closePath(); fillStroke(ctx, bone, OUT, 1.5);
    }
    circle(ctx, 1, 0, 7.5, iron, OUT, 2);
    circle(ctx, 2.5, -2.5, 2.6, '#7d828b');
    circle(ctx, 6.2, -2.4, 1.2, '#ff4040'); circle(ctx, 6.2, 2.4, 1.2, '#ff4040');
  },

  runeguard(ctx, st) {
    const robe = '#5b3fa0', trim = '#c9b8ff', silver = '#b9c0cc';
    const cast = castAmt(st);
    const fr = pulse(actP(st, 'big'));
    feet(ctx, st, '#2e2250');
    ellipse(ctx, -2, 0, 11, 15, 0, robe, OUT, 2);
    ellipse(ctx, -2, 0, 8, 12, 0, null, rgba('#c9b8ff', 0.5), 1.2);
    ellipse(ctx, 0, -11, 5.5, 4.5, 0, silver, OUT, 1.5);
    ellipse(ctx, 0, 11, 5.5, 4.5, 0, silver, OUT, 1.5);
    // floating hex shield on the left, swings to the front for Mirror Aegis
    const hx = 7 + fr * 9, hy = -19 + fr * 19;
    glow(ctx, hx, hy, 16, '#a98bff', 0.35 + fr * 0.3);
    hexagon(ctx, hx, hy, 9, rgba('#7b5cf0', 0.55), trim, 1.6);
    hexagon(ctx, hx, hy, 4.5, null, rgba('#ffffff', 0.7), 1);
    for (const sy of [-1, 1]) {
      glow(ctx, 8 + cast * 5, 10 * sy, 7, '#b18cff', 0.4 + cast * 0.5);
      hand(ctx, 8 + cast * 5, 10 * sy, '#d9c8ff');
    }
    circle(ctx, 0, 0, 8, '#3f2b75', OUT, 2);
    ellipse(ctx, 5, 0, 2.5, 4.2, 0, '#1a1030');
    circle(ctx, 5.6, -1.6, 0.9, '#c9b8ff'); circle(ctx, 5.6, 1.6, 0.9, '#c9b8ff');
    for (let i = 0; i < 3; i++) {
      const a = st.t * 1.6 + i * TAU / 3, r = 24 + cast * 8;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.9;
      glow(ctx, x, y, 8, '#b18cff', 0.5);
      poly(ctx, [x, y - 5, x + 3.5, y, x, y + 5, x - 3.5, y], '#3b2a6b', trim, 1.2);
      circle(ctx, x, y, 1.4, '#e6dcff');
    }
  },

  ranger(ctx, st) {
    const cloak = '#3f7a3a', leather = '#7a5636', hood = '#2f5f2b', skin = '#e0b890';
    const pa = actP(st, 'attack');
    const nocked = pa >= 0 && pa < 0.6;
    const pull = nocked ? easeOut(pa / 0.6) : 0;
    // quiver on the back
    ctx.save(); ctx.translate(-8, 5); ctx.rotate(0.5);
    rrect(ctx, -9, -3, 17, 6, 2, leather, OUT, 1.5);
    for (const o of [-1.5, 1.5]) poly(ctx, [-9, o - 1.5, -13, o, -9, o + 1.5], '#e8e2d0', OUT, 1);
    ctx.restore();
    feet(ctx, st, '#4b3a28');
    poly(ctx, [-6, -10, -16, -4, -16, 4, -6, 10], shade(cloak, -0.15), OUT, 1.5);
    ellipse(ctx, -2, 0, 10, 14.5, 0, cloak, OUT, 2);
    // bow (string pulls back while attacking)
    // after the release the string thrums for a moment and the bow kicks back
    const after = pa >= 0.6 ? (pa - 0.6) / 0.4 : -1;
    const thrum = after >= 0 ? Math.sin(after * 40) * 2.2 * (1 - after) : 0;
    const flex = pull * 4 + (after >= 0 ? (1 - after) * 2 : 0);
    const sx = 11 - pull * 13 + thrum;
    ctx.beginPath(); ctx.moveTo(11, -15); ctx.quadraticCurveTo(22 + flex, 0, 11, 15);
    ctx.lineCap = 'round'; ctx.lineWidth = 5.5; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = leather; ctx.stroke();
    tracePath(ctx, [11, -15, sx, 0, 11, 15]); ctx.lineWidth = 1; ctx.strokeStyle = '#efe8d8'; ctx.stroke();
    if (nocked) {
      line(ctx, sx, 0, sx + 22, 0, '#d8c8a0', 2);
      poly(ctx, [sx + 22, -2.5, sx + 27, 0, sx + 22, 2.5], '#cfd6de', OUT, 1);
    }
    hand(ctx, 16.5, 0, skin);
    hand(ctx, nocked ? sx : 6, nocked ? 0 : 9, skin);
    // hood
    poly(ctx, [-5, -4, -12, 0, -5, 4], hood, OUT, 1.5);
    circle(ctx, 0, 0, 7.8, hood, OUT, 2);
    ellipse(ctx, 5, 0, 2.2, 4, 0, skin);
  },

  shadowblade(ctx, st) {
    const cloth = '#2b2433', scarf = '#c22d4b';
    const pa = actP(st, 'attack');
    let l = 0, r = 0;
    if (pa >= 0) { if (pa < 0.5) l = pulse(pa / 0.5); else r = pulse((pa - 0.5) / 0.5); }
    const pts = [];
    for (let i = 0; i < 7; i++) pts.push(-3 - i * 4, Math.sin(st.t * 8 - i * 0.9) * i * 0.8);
    limb(ctx, pts, scarf, 3.5);
    feet(ctx, st, '#1a1620');
    torso(ctx, cloth, 8.5, 13);
    const dagger = (x, y, rot) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      poly(ctx, [1, -1.8, 13, 0, 1, 1.8], '#dfe3ec', OUT, 1.3);
      rrect(ctx, -0.5, -3.5, 2, 7, 0.8, '#7b3fa0', OUT, 1);
      ctx.restore();
      hand(ctx, x, y, '#3d3447');
    };
    // autos stab with one blade (alternating); abilities stab with both
    if (st.action && st.action.alt != null && st.action.type === 'attack') { if (st.action.alt) { r = Math.max(l, r); l = 0; } else { l = Math.max(l, r); r = 0; } }
    // thrust streaks ahead of each blade at full extension
    for (const [k, y] of [[l, -4], [r, 4]]) if (k > 0.5) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (k - 0.5) * 1.6;
      line(ctx, 26, y, 36, y, '#e8c8ff', 2); line(ctx, 28, y - 2.5, 34, y - 2.5, '#ffffff', 1);
      ctx.restore();
    }
    dagger(8 + l * 9, -9 + l * 5, -0.15 + l * 0.15);
    dagger(8 + r * 9, 9 - r * 5, 0.15 - r * 0.15);
    circle(ctx, 0, 0, 7.5, '#1f1a26', OUT, 2);
    circle(ctx, -1.5, -2, 2.6, '#2e2738');
    glow(ctx, 5.5, 0, 6, '#d48cff', 0.4);
    circle(ctx, 5.5, -2.4, 1.2, '#e0a8ff'); circle(ctx, 5.5, 2.4, 1.2, '#e0a8ff');
  },

  pyromancer(ctx, st) {
    const robe = '#b8401f', trim = '#f2c84b', hat = '#7a2414', skin = '#f0c9a0';
    const cast = castAmt(st);
    feet(ctx, st, '#4a1a10');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    ellipse(ctx, -2, 0, 7.5, 11.5, 0, null, rgba(trim, 0.7), 1.2);
    // tome in the left hand, fire orb in the right
    rrect(ctx, 5, -15, 7, 8, 1.5, '#5a2a6b', OUT, 1.3);
    hand(ctx, 8, -9.5, skin);
    const ox = 14 + cast * 8, oy = 9 - cast * 6;
    hand(ctx, ox - 5, oy + 1, skin);
    flame(ctx, ox, oy, 4.5 + cast * 3, st.t);
    // wizard hat seen from above, tip flopping backwards
    circle(ctx, 0, 0, 10.5, hat, OUT, 2);
    circle(ctx, 0, 0, 7, null, trim, 1.5);
    poly(ctx, [-1, -5, -1, 5, -14, 3], shade(hat, 0.12), OUT, 1.5);
    circle(ctx, -1, 0, 5, shade(hat, 0.12), OUT, 1.5);
  },

  cleric(ctx, st) {
    const robe = '#ece6d6', gold = '#e8c15a', blue = '#4a78c2', skin = '#f0d0b0';
    const cast = castAmt(st);
    feet(ctx, st, '#8a7a5a');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    rrect(ctx, -12, -2.5, 20, 5, 2, blue);
    ellipse(ctx, 0, -11.5, 5, 4, 0, gold, OUT, 1.3);
    ellipse(ctx, 0, 11.5, 5, 4, 0, gold, OUT, 1.3);
    // sun staff
    const tx = 22 + cast * 3;
    limb(ctx, [-5, 13, tx, 11], '#8a6a3a', 2.5);
    glow(ctx, tx, 11, 12 + cast * 8, '#ffe680', 0.5 + cast * 0.4);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + st.t;
      line(ctx, tx + Math.cos(a) * 4, 11 + Math.sin(a) * 4, tx + Math.cos(a) * 7, 11 + Math.sin(a) * 7, gold, 1.4);
    }
    circle(ctx, tx, 11, 3.6, gold, OUT, 1.3);
    hand(ctx, 7, 12.5, skin);
    // holy book
    rrect(ctx, 6, -15, 8, 9, 1.5, '#7a3b2b', OUT, 1.3);
    line(ctx, 10, -14.5, 10, -6.5, '#f3ead2', 1);
    hand(ctx, 8.5, -9.5, skin);
    circle(ctx, 1, 0, 7.4, skin, OUT, 2);
    ellipse(ctx, -1, 0, 6, 6.8, 0, '#d9b06a');
    // halo
    glow(ctx, 1, 0, 16, '#ffe680', 0.25 + cast * 0.3);
    circle(ctx, 1, 0, 10.5 + Math.sin(st.t * 3) * 0.6, null, gold, 2);
  },

  grovekeeper(ctx, st) {
    const robe = '#6b5a3a', leaf = '#5fbf4a', bark = '#5a3d22', bone = '#d8c8a0';
    const cast = castAmt(st);
    feet(ctx, st, '#3d2f1c');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    ellipse(ctx, -2, 0, 7, 11, 0, null, rgba(leaf, 0.5), 1.2);
    ellipse(ctx, 0, -12, 7, 3.6, 0.4, leaf, OUT, 1.4);
    ellipse(ctx, 0, 12, 7, 3.6, -0.4, leaf, OUT, 1.4);
    // gnarled staff
    const tx = 23 + cast * 3;
    limb(ctx, [-5, 13, 4, 14.5, 12, 11.5, tx - 2, 13], bark, 2.6);
    ellipse(ctx, tx - 3, 9, 4, 2, -0.6, leaf, OUT, 1);
    ellipse(ctx, tx - 3, 17, 4, 2, 0.6, leaf, OUT, 1);
    glow(ctx, tx, 13, 12 + cast * 8, '#8fff7a', 0.5 + cast * 0.4);
    circle(ctx, tx, 13, 3.4, '#b8ff9a', OUT, 1.2);
    hand(ctx, 7, 13, '#c9a27a');
    hand(ctx, 8, -10, '#c9a27a');
    // antlers
    for (const sy of [-1, 1]) {
      limb(ctx, [-1, 4 * sy, -6, 11 * sy, -12, 13 * sy], bone, 2);
      limb(ctx, [-5, 9.5 * sy, -3, 15 * sy], bone, 1.8);
    }
    circle(ctx, 0.5, 0, 7.2, '#4f5a2a', OUT, 2);
    circle(ctx, -1, -2, 2.4, '#6b7a3a');
    // drifting leaves
    for (let i = 0; i < 3; i++) {
      const a = st.t * 0.9 + i * 2.1, r = 20 + Math.sin(st.t * 1.3 + i) * 4;
      ellipse(ctx, Math.cos(a) * r, Math.sin(a) * r, 2.6, 1.3, a * 2, leaf, OUT, 0.8);
    }
  },

  chronomancer(ctx, st) {
    const robe = '#1f4d6b', trim = '#3fd0d0', silver = '#c8d4dc';
    const cast = castAmt(st);
    // rotating clock face on the ground
    ctx.save(); ctx.rotate(st.t * 0.6);
    circle(ctx, 0, 0, 23, null, rgba(trim, 0.35 + cast * 0.4), 1.5);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, r1 = i % 3 ? 20.5 : 19;
      line(ctx, Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * 23, Math.sin(a) * 23, rgba(trim, 0.55), 1.2);
    }
    ctx.restore();
    feet(ctx, st, '#102a3a');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    ellipse(ctx, -2, 0, 7.5, 11.5, 0, null, rgba(silver, 0.6), 1.2);
    // floating hourglass
    ctx.save(); ctx.translate(5, -21 + Math.sin(st.t * 2) * 1.5); ctx.rotate(Math.sin(st.t) * 0.3 + cast * Math.PI);
    poly(ctx, [-3.5, -5, 3.5, -5, 0, 0, 3.5, 5, -3.5, 5, 0, 0], rgba('#e8f4f8', 0.6), silver, 1.2);
    poly(ctx, [-2, 3.5, 2, 3.5, 0, 1], '#e8c15a');
    ctx.restore();
    for (const sy of [-1, 1]) {
      const hx = 8 + (sy > 0 ? cast * 5 : 0);
      glow(ctx, hx, 9.5 * sy, 7, '#5ff0ff', 0.35 + cast * 0.5);
      hand(ctx, hx, 9.5 * sy, '#bfe9f0');
    }
    circle(ctx, 0, 0, 7.8, '#173a52', OUT, 2);
    ellipse(ctx, 4.8, 0, 2.4, 4, 0, '#0b1b26');
    glow(ctx, 7, 0, 6, '#5ff0ff', 0.6);
    poly(ctx, [6, 0, 8, -1.8, 10, 0, 8, 1.8], '#9ff8ff', OUT, 0.8);
  },

  // Players who have not picked a hero yet float around as a wisp.
  wisp(ctx, st) {
    glow(ctx, 0, 0, 26, '#bfefff', 0.55);
    for (let i = 1; i <= 4; i++) circle(ctx, -i * 4, Math.sin(st.t * 6 - i) * 2, 3.5 - i * 0.6, rgba('#dffaff', 0.7 - i * 0.14));
    circle(ctx, 0, 0, 6.5 + Math.sin(st.t * 5) * 0.6, '#f2ffff');
    circle(ctx, 1.5, -1.5, 2.5, '#ffffff');
  },
};

// Channeling: where each caster gathers power (local space, facing +x, at full cast) and what it looks like.
const CHANNEL = {
  pyromancer: { focus: [22, 3], color: '#ff8a2a', hot: '#ffe08a', mote: 'ember' },
  cleric: { focus: [25, 11], color: '#ffe680', hot: '#fffbe6', mote: 'mote' },
  grovekeeper: { focus: [26, 13], color: '#8fff7a', hot: '#e8ffd8', mote: 'leaf' },
  chronomancer: { focus: [13, 9.5], color: '#5ff0ff', hot: '#e8ffff', mote: 'tick' },
  runeguard: { focus: [13, 0], color: '#b18cff', hot: '#f0e8ff', mote: 'mote' },
};
const channelP = st => (st.action && st.action.channel && st.action.type === 'cast' ? actP(st, 'cast') : -1);

// under the caster, aligned to the ground: a rune circle whose rim fills as the cast completes
function drawChannelGround(ctx, cls, st, p) {
  const ch = CHANNEL[cls.id] || { color: cls.accent };
  const k = Math.min(1, p / 0.12);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.18 * k; ellipse(ctx, 0, 2, 27, 21, 0, ch.color);
  ctx.globalAlpha = 0.5 * k;
  ctx.setLineDash([3, 4]); ctx.lineDashOffset = -st.t * 18;
  ellipse(ctx, 0, 2, 27, 21, 0, null, ch.color, 1.2);
  ctx.setLineDash([]);
  // the progress rim, brightest at its leading edge
  ctx.globalAlpha = 0.95 * k; ctx.strokeStyle = ch.color; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, 2, 30, 23, 0, -Math.PI / 2, -Math.PI / 2 + p * TAU); ctx.stroke();
  const ea = -Math.PI / 2 + p * TAU;
  glow(ctx, Math.cos(ea) * 30, 2 + Math.sin(ea) * 23, 7, ch.hot || '#ffffff', 0.9 * k);
  // six rune ticks turning slowly inside
  ctx.globalAlpha = 0.6 * k;
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6 + st.t * 0.9;
    line(ctx, Math.cos(a) * 18, 2 + Math.sin(a) * 14, Math.cos(a) * 23, 2 + Math.sin(a) * 17.5, ch.color, 1.4);
  }
  ctx.restore();
}

// in the hero's local space (after rotation): motes spiralling into the focus, which swells; a "ready" pulse at the end.
// Also a small flash at the focus for instant spells (the short 'cast' gesture).
function drawChannelFocus(ctx, cls, st, p) {
  const ch = CHANNEL[cls.id]; if (!ch) return;
  const [fx, fy] = ch.focus;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (p < 0) {
    const q = pulse(actP(st, 'cast'));
    if (q > 0) { glow(ctx, fx, fy, 6 + q * 10, ch.color, q * 0.8); glow(ctx, fx, fy, 3 + q * 4, ch.hot, q); }
    ctx.restore(); return;
  }
  const k = Math.min(1, p / 0.15);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const q = (st.t * 1.5 + i / n) % 1, a = i * TAU / n + st.t * 1.8 + q * 2.4, r = 30 * (1 - q) + 2;
    const x = fx + Math.cos(a) * r, y = fy + Math.sin(a) * r, al = Math.sin(q * Math.PI) * k;
    ctx.globalAlpha = al;
    if (ch.mote === 'leaf') { ctx.globalCompositeOperation = 'source-over'; ellipse(ctx, x, y, 2.6, 1.2, a * 2, ch.color, OUT, 0.6); ctx.globalCompositeOperation = 'lighter'; }
    else if (ch.mote === 'tick') line(ctx, x, y, x + Math.cos(a + 1.57) * 3.5, y + Math.sin(a + 1.57) * 3.5, ch.color, 1.6);
    else { glow(ctx, x, y, ch.mote === 'ember' ? 5 : 4, ch.color, al); circle(ctx, x, y, ch.mote === 'ember' ? 1.4 : 1.1, ch.hot); }
  }
  ctx.globalAlpha = 1;
  glow(ctx, fx, fy, 8 + p * 16, ch.color, (0.25 + p * 0.45) * k);
  glow(ctx, fx, fy, 3 + p * 5, ch.hot, (0.4 + p * 0.5) * k);
  if (p > 0.82) { const r = (p - 0.82) / 0.18; circle(ctx, fx, fy, 6 + r * 10, null, rgba(ch.hot, 0.9 * (1 - r)), 1.5); }
  ctx.restore();
}

// Body motion for attacks: a little wind-up lean back, then a lunge and twist into the strike.
function attackBody(st) {
  const p = Math.max(actP(st, 'attack'), actP(st, 'bash'));
  if (p < 0) return { lunge: 0, twist: 0 };
  const v = p < 0.3 ? -0.5 * easeOut(p / 0.3) : p < 0.55 ? -0.5 + 1.5 * easeOut((p - 0.3) / 0.25) : 1 - easeOut((p - 0.55) / 0.45);
  return { lunge: v * 3.5, twist: v * 0.13 * swingDir(st) };
}

// Specialization looks, drawn over the class art (same local space: facing +x). SPEC_GROUND goes under the hero.
const SPEC_GROUND = {
  // Spellwarden: a slow ring of pale runes under their feet
  spellwarden(ctx, st) {
    ctx.save(); ctx.scale(1, 0.7); ctx.rotate(st.t * 0.5);
    circle(ctx, 0, 0, 24, null, rgba('#9fd8ff', 0.45), 1.4);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; poly(ctx, [Math.cos(a) * 24 - 2, Math.sin(a) * 24, Math.cos(a) * 24, Math.sin(a) * 24 - 3, Math.cos(a) * 24 + 2, Math.sin(a) * 24, Math.cos(a) * 24, Math.sin(a) * 24 + 3], rgba('#cfeeff', 0.8)); }
    ctx.restore();
  },
};
const SPEC_ART = {
  // Sentinel: a great silver tower shield (it swings to the front to brace, like the class shield it covers)
  sentinel(ctx, st) {
    const pb = actP(st, 'brace'), brace = pb < 0 ? 0 : Math.min(1, pb / 0.12, (1 - pb) / 0.12);
    const front = Math.max(pulse(actP(st, 'bash')), brace);
    ctx.save(); ctx.translate(8 + 9 * front, -13 + 12 * front); ctx.rotate(-0.45 * (1 - front));
    rrect(ctx, -4.5, -17, 9, 34, 3, '#c9d6e6', OUT, 2);
    rrect(ctx, -2.4, -14, 4.8, 28, 1.5, null, '#3d6fb6', 1.6);
    line(ctx, 0, -12, 0, 12, '#3d6fb6', 1.4); line(ctx, -2, -4, 2, -4, '#3d6fb6', 1.4);
    ctx.restore();
  },
  // Crusader: a gold tabard over the plate and a blade that glows with dawnlight
  crusader(ctx, st) {
    rrect(ctx, -7, -4, 14, 8, 2, '#e8c15a', OUT, 1.2);
    poly(ctx, [-1, -2.5, 1, -2.5, 1, 2.5, -1, 2.5], '#fff3c0');
    glow(ctx, 18, 14, 16, '#ffe9a0', 0.35 + Math.sin(st.t * 3) * 0.1);
    circle(ctx, -9, 0, 5, null, rgba('#ffe27a', 0.6), 1.5);   // a small sun disc on the back
  },
  // Berserker: red war paint, and eyes that burn
  berserker(ctx, st) {
    for (const sy of [-1, 1]) { line(ctx, -5, 6 * sy, 4, 9 * sy, '#ff5a2a', 2); line(ctx, -6, 2 * sy, 2, 4 * sy, '#ff5a2a', 1.6); }
    glow(ctx, 6, 0, 8, '#ff6a2a', 0.5 + Math.sin(st.t * 6) * 0.15);
  },
  // Hemomancer: a dark cowl over the helm, and orbs of blood circling them
  hemomancer(ctx, st) {
    ellipse(ctx, -1, 0, 9, 9.5, 0, '#2a0a14', OUT, 1.8);
    ellipse(ctx, 4.5, 0, 3, 5, 0, '#120408');
    circle(ctx, 5.5, -1.8, 0.9, '#ff4a5a'); circle(ctx, 5.5, 1.8, 0.9, '#ff4a5a');
    for (let i = 0; i < 3; i++) {
      const a = st.t * 1.4 + i * TAU / 3, x = Math.cos(a) * 25, y = Math.sin(a) * 23;
      glow(ctx, x, y, 8, '#ff2d4b', 0.45);
      circle(ctx, x, y, 3, '#c0102a', OUT, 1);
      circle(ctx, x - 0.8, y - 0.8, 0.9, '#ff9aa8');
    }
  },
  // Spellwarden: pale blue sigils on the robe (the rune ring is under them)
  spellwarden(ctx) {
    ellipse(ctx, -2, 0, 8, 12, 0, null, rgba('#9fd8ff', 0.7), 1.4);
  },
  // Runeblade: a rune-carved sword in the right hand
  runeblade(ctx, st) {
    const s = swing(actP(st, 'attack'));
    ctx.save(); ctx.translate(9, 11); ctx.rotate(0.3 + s * 1.2);
    poly(ctx, [2, -2.2, 24, -2.2, 29, 0, 24, 2.2, 2, 2.2], '#d9ccff', OUT, 1.5);
    for (let i = 0; i < 3; i++) circle(ctx, 8 + i * 6, 0, 1.1, '#c58cff');
    glow(ctx, 16, 0, 12, '#c58cff', 0.3);
    rrect(ctx, -0.5, -5, 3, 10, 1, '#7b5cf0', OUT, 1.1);
    ctx.restore();
  },
  // Aegis: a small golden half-dome of light hovering over the shoulders
  aegis(ctx, st) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + Math.sin(st.t * 2) * 0.1;
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-2, 0, 15, -1.9, 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(-2, 0, 11, -1.6, 1.6); ctx.stroke();
    ctx.restore();
    glow(ctx, 10, 0, 7, '#fff6d8', 0.4);
  },
  // Inquisitor: a burning orange sash, and a brand-mark glowing on the hand
  inquisitor(ctx, st) {
    line(ctx, -9, -8, 6, 8, '#ff8a2a', 3); line(ctx, -9, -8, 6, 8, '#ffd27a', 1);
    glow(ctx, 9, 9.5, 8, '#ff8a2a', 0.45 + Math.sin(st.t * 5) * 0.12);
    circle(ctx, 9, 9.5, 2.2, null, '#ffc070', 1.2);
  },
  // Lifebinder: a crown of leaves and two blossoms
  lifebinder(ctx) {
    for (let i = 0; i < 7; i++) { const a = -1.4 + i * 0.47; ellipse(ctx, Math.cos(a) * 8.5, Math.sin(a) * 8.5, 2.8, 1.3, a, i % 2 ? '#5fdf8a' : '#8fffb0', OUT, 0.6); }
    circle(ctx, -6, -6, 2, '#ffd0e8', OUT, 0.6); circle(ctx, -6, 6, 2, '#ffd0e8', OUT, 0.6);
  },
  // Moonwell: a pale crescent moon floating behind the head, silver light on the robe
  moonwell(ctx, st) {
    ctx.save(); ctx.translate(-14, -10 + Math.sin(st.t * 1.5) * 1.2);
    glow(ctx, 0, 0, 10, '#a9c4ff', 0.45);
    ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.arc(1.8, -0.8, 3.8, 0, TAU, true); ctx.fill('evenodd');
    ctx.restore();
    ellipse(ctx, -2, 0, 8, 12, 0, null, rgba('#a9c4ff', 0.6), 1.2);
  },
  // Echoist: a faint second outline that trails a moment behind
  echoist(ctx, st) {
    ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(-5 - Math.sin(st.t * 2) * 1.5, 0);
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, null, '#c4a8ff', 1.4);
    circle(ctx, 0, 0, 7.8, null, '#d8c8ff', 1.2);
    ctx.restore();
  },
  // Accelerant: a golden clock-hand ring spinning fast around them
  accelerant(ctx, st) {
    ctx.save(); ctx.rotate(st.t * 3);
    circle(ctx, 0, 0, 21, null, rgba('#ffd36a', 0.45), 1.2);
    line(ctx, 0, 0, 0, -18, rgba('#ffe9a0', 0.7), 1.6); line(ctx, 0, 0, 12, 0, rgba('#ffe9a0', 0.7), 1.6);
    ctx.restore();
  },
};

// cls may be null (wisp). opts: { ring, noShadow, lift, spec }
function drawHero(ctx, cls, x, y, angle, st, scale = 1, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const lift = opts.lift || 0;
  if (!opts.noShadow) ellipse(ctx, 2, 5, 16 - lift * 0.15, 12 - lift * 0.12, 0, 'rgba(0,0,0,0.28)');
  if (cls && opts.ring !== false) ellipse(ctx, 0, 2, 19, 15, 0, null, rgba(ROLES[cls.role].color, 0.85), 2);
  const chP = cls ? channelP(st) : -1;
  if (chP >= 0) drawChannelGround(ctx, cls, st, chP);
  if (opts.spec && SPEC_GROUND[opts.spec]) SPEC_GROUND[opts.spec](ctx, st);
  ctx.translate(0, -lift);
  const big = pulse(actP(st, 'big'));
  if (cls && big > 0) glow(ctx, 0, 0, 36, cls.accent, big * 0.6);
  ctx.rotate(angle);
  const body = attackBody(st);
  ctx.translate(body.lunge, 0); ctx.rotate(body.twist);
  const br = (1 + Math.sin((st.t + (st.phase || 0)) * 2.5) * 0.02) * (1 + big * 0.06);
  ctx.scale(br, br);
  (cls ? HERO_ART[cls.id] : HERO_ART.wisp)(ctx, st);
  if (cls && opts.spec && SPEC_ART[opts.spec]) SPEC_ART[opts.spec](ctx, st);
  if (cls) drawChannelFocus(ctx, cls, st, chP);
  ctx.restore();
}

// The dwarf barkeep standing outside the tavern.
function drawKeeper(ctx, x, y, angle, st, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ellipse(ctx, 2, 5, 15, 11, 0, 'rgba(0,0,0,0.28)');
  ctx.rotate(angle + Math.sin(st.t * 0.7) * 0.25);
  feet(ctx, st, '#3d2a1a');
  torso(ctx, '#7a5236', 10, 14);
  ellipse(ctx, 3, 0, 6, 10, 0, '#efe6cf', OUT, 1.5);
  hand(ctx, 6, -12, '#e8b890');
  // mug
  rrect(ctx, 8, 9, 8, 8, 2, '#d8a83a', OUT, 1.3);
  circle(ctx, 12, 13, 3, '#fff8e0');
  hand(ctx, 7, 12, '#e8b890');
  circle(ctx, 0, 0, 7.5, '#e8b890', OUT, 2);
  circle(ctx, -1, -2.5, 2.5, '#f4cca8');
  ellipse(ctx, 6, 0, 5, 6.5, 0, '#d0702a', OUT, 1.5);
  ctx.restore();
}

function drawDummy(ctx, x, y, st, scale) {
  const since = st.t - st.hit;
  const w = since < 0.5 ? Math.sin(since * 25) * (1 - since * 2) * 0.3 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ellipse(ctx, 2, 5, 14, 10, 0, 'rgba(0,0,0,0.28)');
  ctx.rotate(Math.PI / 2 + w);
  rrect(ctx, -2.5, -16, 5, 32, 1.5, '#6b4a2b', OUT, 1.5);
  circle(ctx, 0, 0, 10, '#d8b860', OUT, 2);
  line(ctx, -8, -5, 8, -5, '#a88a3a', 1);
  line(ctx, -8, 5, 8, 5, '#a88a3a', 1);
  circle(ctx, 0, 0, 5.5, '#f2efe6', OUT, 1);
  circle(ctx, 0, 0, 3.2, '#d23a3a');
  circle(ctx, 0, 0, 1.2, '#f2efe6');
  ctx.restore();
}
