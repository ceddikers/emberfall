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

// A bare head seen from above (facing +x): hair over the crown, a sliver of face at the front, a fringe across the brow.
function hairHead(ctx, hair, skin, r = 7.6) {
  circle(ctx, 0.5, 0, r, hair, OUT, 2);
  circle(ctx, -1.6, -2.3, r * 0.32, shade(hair, 0.2));
  ellipse(ctx, r * 0.68, 0, 2.4, r * 0.55, 0, skin);
  // the hairline: a smooth curve over the back of the face with one forelock dipping toward the brow
  ellipse(ctx, r * 0.5, 0, r * 0.2, r * 0.64, 0, hair);
  poly(ctx, [r * 0.5, -r * 0.3, r * 0.84, -r * 0.08, r * 0.5, r * 0.12], hair);
  // a few strands sweeping back from the brow, so it reads as hair and not a cap
  ctx.save(); ctx.strokeStyle = shade(hair, -0.3); ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  for (const sy of [-0.55, 0, 0.55]) { ctx.beginPath(); ctx.moveTo(r * 0.3, sy * r * 0.7); ctx.quadraticCurveTo(-r * 0.2, sy * r * 0.95, -r * 0.7, sy * r * 0.8); ctx.stroke(); }
  ctx.restore();
}
// long hair falling behind the head (toward -x): one soft, wavy mass with an outline round the outside only
function hairBack(ctx, hair, len = 9, spread = 6.5) {
  const lumps = [];
  for (let i = -2; i <= 2; i++) lumps.push([-3 - len * 0.45 - (2 - Math.abs(i)) * len * 0.12, i * spread * 0.42, spread * 0.5]);
  lumps.push([-3, 0, spread * 0.8]);
  ctx.beginPath(); for (const [x, y, r] of lumps) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  ctx.lineWidth = 3.6; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = hair; ctx.fill();
  ctx.save(); ctx.strokeStyle = shade(hair, -0.3); ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  for (const sy of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(-4, sy * spread * 0.6); ctx.quadraticCurveTo(-4 - len * 0.5, sy * spread * 1.05, -3 - len, sy * spread * 0.75); ctx.stroke(); }
  ctx.restore();
}
// a braid from (x0, y0) toward (x1, y1): woven segments and a tie at the end
function braid(ctx, x0, y0, x1, y1, hair, tie, n = 4) {
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, a = Math.atan2(y1 - y0, x1 - x0);
    ellipse(ctx, x, y, 2.4 - k * 0.5, 1.8 - k * 0.3, a + (i % 2 ? 0.5 : -0.5), hair, OUT, 1);
  }
  circle(ctx, x1 + (x1 - x0) * 0.12, y1 + (y1 - y0) * 0.12, 1.2, tie, OUT, 0.8);
}

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
    for (const sy of [-1, 1]) { ellipse(ctx, 0, 12 * sy, 6, 5, 0, '#8796ab', OUT, 1.5); circle(ctx, 0.5, 12 * sy, 1.4, gold, OUT, 0.8); }
    // the plumed great-helm, carried at the hip
    circle(ctx, -6, 13, 4, steel, OUT, 1.5);
    line(ctx, -3.6, 11.2, -3.6, 14.8, '#2a3140', 1.4);
    ellipse(ctx, -9, 13, 3.6, 1.6, 0, '#c43b3b', OUT, 1.2);
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
    // bare head: short, tousled platinum-blond hair
    for (const sy of [-1, 0, 1]) poly(ctx, [-4, 3 * sy - 2.4, -10.5, 4.5 * sy, -4, 3 * sy + 2.4], '#e6d390', OUT, 1.2);
    hairHead(ctx, '#e6d390', '#f0d2b4');
  },

  bloodreaver(ctx, st) {
    const leather = '#6e2b2b', iron = '#5b5f66', bone = '#e8dcc0';
    const s = swing(actP(st, 'attack'));
    const wave = Math.sin(st.t * 4) * 1.5 + (st.moving ? Math.sin(st.t * 11) * 2 : 0);
    poly(ctx, [-4, -11, -17, -12, -20 + wave, -6, -15, -3, -22 + wave, 1, -16, 5, -20 + wave, 10, -4, 11], '#4a1416', OUT, 2);
    feet(ctx, st, '#3a1a1a');
    torso(ctx, leather, 9.5, 14.5);
    // heavy fur mantle across the shoulders, a bronze clasp
    const fur = '#7a6450';
    ellipse(ctx, -3, 0, 7, 16, 0, fur, OUT, 1.8);
    for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) circle(ctx, -1 - i * 3.2, (13.5 - i * 0.8) * sy, 3, i % 2 ? fur : shade(fur, 0.14), OUT, 1.1);
    circle(ctx, 4, -6, 2, '#c08a3a', OUT, 1);
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
    // a wild red mane spilling out behind the helm, two braids bound in bronze
    const mane = '#b8461f';
    hairBack(ctx, mane, 10, 7);
    for (const sy of [-1, 1]) braid(ctx, -1, 6.5 * sy, -8, 10.5 * sy, mane, '#c08a3a', 3);
    if (HERO_SPEC === 'berserker') {
      // the Berserker fights bare-headed: the wild mane, nothing between it and the sky
      hairHead(ctx, mane, '#c99a7a', 7.8);
    } else {
      // open-faced horned helm
      for (const sy of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(1, 5 * sy);
        ctx.quadraticCurveTo(3, 13 * sy, 11, 13 * sy);
        ctx.quadraticCurveTo(5, 10 * sy, 4, 4 * sy);
        ctx.closePath(); fillStroke(ctx, bone, OUT, 1.5);
      }
      circle(ctx, 1, 0, 7.5, iron, OUT, 2);
      circle(ctx, 2.5, -2.5, 2.6, '#7d828b');
      ellipse(ctx, 6.4, 0, 1.9, 3.8, 0, '#c99a7a');
      circle(ctx, 6.4, -1.9, 0.8, '#2a1a14'); circle(ctx, 6.4, 1.9, 0.8, '#2a1a14');
    }
    ellipse(ctx, 8.6, 0, 2.6, 3.8, 0, mane, OUT, 1.2);   // the beard
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
    // violet hood up, its rim banded in pale lavender runes; the face shows, navy-black hair across the brow
    circle(ctx, 0, 0, 8, '#4b3590', OUT, 2);
    circle(ctx, -1.5, -2.4, 2.6, '#5d46a8');
    ellipse(ctx, 4.8, 0, 2.6, 4.6, 0, '#ecd2bc');
    ellipse(ctx, 3.6, 0, 1.5, 4.6, 0, '#1c2140');
    poly(ctx, [3.6, -3.2, 6.6, -1.2, 3.8, 0.4], '#1c2140');
    ctx.strokeStyle = '#d9ccff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0.6, 0, 6.6, -1.15, 1.15); ctx.stroke();
    // slate rune stones orbiting, their carvings filled with lavender
    for (let i = 0; i < 3; i++) {
      const a = st.t * 1.6 + i * TAU / 3, r = 24 + cast * 8;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.9;
      glow(ctx, x, y, 7, '#b18cff', 0.35);
      poly(ctx, [x, y - 5, x + 3.5, y, x, y + 5, x - 3.5, y], '#6a6f7e', OUT, 1.2);
      poly(ctx, [x, y - 2.6, x + 1.6, y, x, y + 2.6, x - 1.6, y], null, '#d9ccff', 1);
    }
  },

  ranger(ctx, st) {
    const cloak = '#3f7a3a', leather = '#7a5636', hood = '#2f5f2b', skin = '#c98e64', hair = '#a8441e';
    const pa = actP(st, 'attack');
    const nocked = pa >= 0 && pa < 0.6;
    const pull = nocked ? easeOut(pa / 0.6) : 0;
    // quiver on the back
    ctx.save(); ctx.translate(-8, 5); ctx.rotate(0.5);
    rrect(ctx, -9, -3, 17, 6, 2, leather, OUT, 1.5);
    for (const o of [-1.5, 1.5]) poly(ctx, [-9, o - 1.5, -13, o, -9, o + 1.5], '#6fbf52', OUT, 1);
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
    hand(ctx, 16.5, 0, '#6b4a30');   // brown leather gloves
    hand(ctx, nocked ? sx : 6, nocked ? 0 : 9, '#6b4a30');
    // hood down around the shoulders; long auburn hair with one thick braid, pointed half-elf ears
    ellipse(ctx, -5, 0, 4.5, 9, 0, hood, OUT, 1.5);
    hairBack(ctx, hair, 8, 6);
    braid(ctx, -2, 6, -11, 10, hair, '#c9a24a', 5);
    hairHead(ctx, hair, skin, 7.6);
    for (const sy of [-1, 1]) poly(ctx, [0, 6.2 * sy, 1.4, 12.5 * sy, 4.2, 6 * sy], '#d8a074', OUT, 1.1);   // pointed half-elf ears
  },

  shadowblade(ctx, st) {
    const cloth = '#2b2433', scarf = '#a32640';
    const pa = actP(st, 'attack');
    let l = 0, r = 0;
    if (pa >= 0) { if (pa < 0.5) l = pulse(pa / 0.5); else r = pulse((pa - 0.5) / 0.5); }
    const pts = [];
    for (let i = 0; i < 7; i++) pts.push(-3 - i * 4, Math.sin(st.t * 8 - i * 0.9) * i * 0.8);
    limb(ctx, pts, scarf, 3.5);
    feet(ctx, st, '#1a1620');
    torso(ctx, cloth, 8.5, 13);
    ellipse(ctx, -1, 0, 6, 10, 0, null, rgba('#9b5cd0', 0.65), 1.2);   // purple trim
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
    // shaggy black hair spiking back, a pale face, the mask pulled down under the chin
    for (const sy of [-1, -0.35, 0.35, 1]) poly(ctx, [-3, 3.5 * sy - 1.6, -11, 6 * sy, -3, 3.5 * sy + 1.6], '#1a1720', OUT, 1.1);
    hairHead(ctx, '#1a1720', '#e8d8cc', 7.5);
    circle(ctx, -1.6, -2.3, 1.6, '#3a3550');   // a blue-black sheen
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
    // long, wavy flame-red hair spilling out from under the brim
    hairBack(ctx, '#d2401e', 11, 8);
    // wide witch hat seen from above, a red gem on its gold band, tip flopping backwards
    circle(ctx, 0, 0, 10.5, hat, OUT, 2);
    circle(ctx, 0, 0, 7, null, trim, 1.5);
    circle(ctx, 7, 0, 1.6, '#e0283a', OUT, 0.9);
    poly(ctx, [-1, -5, -1, 5, -14, 3], shade(hat, 0.12), OUT, 1.5);
    circle(ctx, -1, 0, 5, shade(hat, 0.12), OUT, 1.5);
  },

  cleric(ctx, st) {
    const robe = '#ece6d6', gold = '#e8c15a', blue = '#4a78c2', skin = '#7a4a2e';
    const cast = castAmt(st);
    feet(ctx, st, '#8a7a5a');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    rrect(ctx, -12, -2.5, 20, 5, 2, blue);
    ellipse(ctx, 0, -11.5, 5, 4, 0, gold, OUT, 1.3);
    ellipse(ctx, 0, 11.5, 5, 4, 0, gold, OUT, 1.3);
    // sun staff
    const tx = 22 + cast * 3;
    limb(ctx, [-5, 13, tx, 11], '#c9a040', 2.5);
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
    // white hood up, deep brown face, a neat grey beard
    circle(ctx, 1, 0, 7.6, '#f6f2e8', OUT, 2);
    circle(ctx, -1, -2.3, 2.6, '#ffffff');
    ellipse(ctx, 5.6, 0, 2.4, 4.2, 0, skin);
    ellipse(ctx, 7.8, 0, 1.7, 3, 0, '#d4cfc6', OUT, 0.8);
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
    // a long silver braid over one shoulder
    braid(ctx, -2, -5.5, -11, -9.5, '#dcdce2', '#8a6a3a', 5);
    // mossy, leafy hood with a few small white flowers; the face at the front
    circle(ctx, 0.5, 0, 7.2, '#4f5a2a', OUT, 2);
    circle(ctx, -1, -2, 2.4, '#6b7a3a');
    ellipse(ctx, 5, 0, 2.3, 4, 0, '#d8b08a');
    for (const [fx, fy] of [[-2.5, 3.5], [1.5, -4.5], [-4.5, -1]]) { circle(ctx, fx, fy, 1.6, '#fff4f6', OUT, 0.6); circle(ctx, fx, fy, 0.6, '#f0b8c8'); }
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
      hand(ctx, hx, 9.5 * sy, '#f0d6c0');
    }
    // high silver-trimmed collar behind the head, long wavy chestnut hair, small round gold spectacles
    ellipse(ctx, -3.5, 0, 4, 10, 0, '#173a52', OUT, 1.5);
    ellipse(ctx, -3.5, 0, 4, 10, 0, null, silver, 1);
    hairBack(ctx, '#7a4426', 9, 6.5);
    hairHead(ctx, '#7a4426', '#f0d6c0', 7.6);
    for (const sy of [-1, 1]) circle(ctx, 6.6, 1.8 * sy, 1.15, null, '#e8c15a', 0.9);
    line(ctx, 6.6, -0.7, 6.6, 0.7, '#e8c15a', 0.8);
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
    // the gold tabard shows on the back below the head, a sun on it
    rrect(ctx, -14, -5, 8, 10, 2, '#e8c15a', OUT, 1.2);
    circle(ctx, -10, 0, 2.6, null, '#fff3c0', 1.2);
    glow(ctx, 18, 14, 16, '#ffe9a0', 0.35 + Math.sin(st.t * 3) * 0.1);
  },
  // Berserker: helm off (see HERO_ART.bloodreaver), orange war paint across the face, rage smouldering off him
  berserker(ctx, st) {
    glow(ctx, 0, 0, 20, '#ff6a2a', 0.18 + Math.sin(st.t * 6) * 0.06);
    for (const sy of [-1, 1]) line(ctx, 4.6, 2.6 * sy, 7.4, 1.4 * sy, '#ff6a2a', 1.4);
  },
  // Hemomancer: a deep red hood over the horned helm (beard showing), and orbs of blood circling them
  hemomancer(ctx, st) {
    ellipse(ctx, -1, 0, 9, 9.5, 0, '#7a1424', OUT, 1.8);
    circle(ctx, -3, -2.6, 2.8, '#922033');
    ellipse(ctx, 5.4, 0, 2.4, 4.2, 0, '#c99a7a');
    ellipse(ctx, 8.2, 0, 2.4, 3.6, 0, '#b8461f', OUT, 1.1);
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
  // Sharpshooter: a long gold-trimmed scope-eye glint and a steadier stance (a faint aim line ahead)
  sharpshooter(ctx, st) {
    ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(st.t * 2) * 0.1;
    ctx.setLineDash([3, 5]); line(ctx, 14, 0, 46, 0, '#f2d27a', 1.2); ctx.setLineDash([]);
    ctx.restore();
    glow(ctx, 6, -2, 5, '#fff2c0', 0.6); circle(ctx, 6, -2, 1.4, '#fff8e0');
  },
  // Venomstrike: green-dripping arrowheads in the quiver and a toxic haze
  venomstrike(ctx, st) {
    for (let i = 0; i < 3; i++) { const x = -12 + i * 2.5, y = -9 + i * 2; poly(ctx, [x, y - 3, x + 2, y, x, y + 3, x - 2, y], '#9aff4a', OUT, 0.8); }
    glow(ctx, -10, -5, 9, '#7adf3a', 0.3 + Math.sin(st.t * 3) * 0.08);
  },
  // Bladedancer: a second curved blade in the off hand, both trailing a silver shimmer
  bladedancer(ctx, st) {
    const s = swing(actP(st, 'attack'));
    ctx.save(); ctx.translate(8, -10); ctx.rotate(-0.5 - s * 1.4);
    ctx.strokeStyle = '#e8ecff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 14, -0.2, 1.1); ctx.stroke();
    ctx.restore();
    glow(ctx, 0, 0, 22, '#e0c8ff', 0.15);
  },
  // Nightstalker: a black hood lined in red, pulled low over the face
  nightstalker(ctx) {
    ellipse(ctx, -1.5, 0, 9, 9.5, 0, '#141118', OUT, 1.6);
    ctx.strokeStyle = '#b0203a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-0.5, 0, 7.6, -1.1, 1.1); ctx.stroke();
    ellipse(ctx, 5.8, 0, 2, 3.6, 0, '#e8d8cc');
    ellipse(ctx, 4.6, 0, 1.4, 4, 0, '#1a1720');
    poly(ctx, [4.6, -2.2, 7, -0.6, 4.6, 0.9], '#1a1720');
  },
  // Cataclysm: a small burning rock orbiting overhead, trailing smoke
  cataclysm(ctx, st) {
    const a = st.t * 1.6, x = Math.cos(a) * 20, y = Math.sin(a) * 18;
    glow(ctx, x, y, 10, '#ff4a2a', 0.5);
    circle(ctx, x, y, 3.5, '#4a2a22', OUT, 1); circle(ctx, x - 1, y - 1, 1.2, '#ffb050');
  },
  // Sigilmancer: a little ring of ember glyphs turning around the hands
  sigilmancer(ctx, st) {
    ctx.save(); ctx.translate(8, 0); ctx.rotate(st.t * 1.2);
    circle(ctx, 0, 0, 13, null, rgba('#ffb347', 0.55), 1.3);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; glow(ctx, Math.cos(a) * 13, Math.sin(a) * 13, 4, '#ffcf7a', 0.7); }
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

// ======================================================================= Alembist (classes-b)
// A goggled alchemist: brass goggles over the eyes, a messy bun with a glass stirring rod through it, an olive work
// coat under a leather apron, a bandolier of coloured vials across the chest, and a smoking copper still on her back.
// The right hand flicks a vial out on a throw; the left steadies the strap.
HERO_ART.alembist = function (ctx, st) {
  const coat = '#56603e', apron = '#8a5a34', copper = '#b8743a', skin = '#e8c4a0', hair = '#3e2a22', brass = '#d8a84a';
  const cast = castAmt(st);
  // the still on her back: a copper pot, a coiled swan neck over the shoulder, a chimney puffing steam
  for (let i = 0; i < 3; i++) {
    const q = (st.t * 0.45 + i / 3) % 1;
    circle(ctx, -23 - q * 10, -6 - q * 4 + Math.sin(st.t * 2 + i) * 1.5, 2 + q * 3.5, `rgba(226,230,226,${0.55 * (1 - q)})`);
  }
  limb(ctx, [-12, -5, -8, -12, -1, -13], copper, 2.2);
  ellipse(ctx, -15, 0, 8, 8.5, 0, copper, OUT, 1.8);
  ellipse(ctx, -17, -2.5, 3.4, 2.4, -0.5, '#e0a068');
  rrect(ctx, -23, -8, 6, 5, 1.2, '#8a5428', OUT, 1.3);   // the chimney
  circle(ctx, -15, 0, 3, null, 'rgba(70,30,10,0.6)', 1);  // a rivet ring
  feet(ctx, st, '#3a2a1e');
  torso(ctx, coat, 9.5, 14);
  ellipse(ctx, 1.5, 0, 6.5, 10.5, 0, apron, OUT, 1.5);           // the apron front
  line(ctx, 4, -6, 4, 6, 'rgba(40,20,10,0.4)', 1);
  // the bandolier, corner to corner, with four vials in its loops
  line(ctx, -7, -12, 8, 11, OUT, 4.6); line(ctx, -7, -12, 8, 11, '#6b4424', 3);
  const vials = ['#4fe0c0', '#ff5a1a', '#f4ecd2', '#ffd23a'];
  vials.forEach((col, i) => { const q = 0.18 + i * 0.22, x = -7 + 15 * q, y = -12 + 23 * q; rrect(ctx, x - 1.8, y - 2.4, 3.6, 4.8, 1.2, col, OUT, 1); circle(ctx, x, y - 2.6, 0.9, '#9a6a3a'); });
  // hands: the left on the strap, the right holding a vial out (further on a throw)
  hand(ctx, 7, -10, '#6b4a30');
  const vx = 9 + cast * 8, vy = 11 - cast * 4;
  glow(ctx, vx + 3, vy, 6 + cast * 5, '#4fe0c0', 0.25 + cast * 0.4);
  rrect(ctx, vx + 1, vy - 2.6, 5, 5.2, 1.6, '#4fe0c0', OUT, 1.1);
  hand(ctx, vx, vy, '#6b4a30');
  // the bun with a glass rod through it, then the head, then the goggles
  circle(ctx, -7.5, 0, 4, hair, OUT, 1.5);
  line(ctx, -9.5, -4.5, -5, 4.5, '#cfe8ee', 1.2);
  hairHead(ctx, hair, skin, 7.4);
  ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0.5, 0, 7.2, -1.25, 1.25); ctx.stroke();   // the goggle strap
  for (const sy of [-1, 1]) {
    circle(ctx, 6, 2.5 * sy, 2.3, HERO_SPEC === 'volatile' ? '#ffb070' : '#7fd8c0', OUT, 1);
    circle(ctx, 6, 2.5 * sy, 2.3, null, brass, 1);
    circle(ctx, 5.4, 2.5 * sy - 0.8, 0.7, 'rgba(255,255,255,0.8)');
  }
};
// Apothecary: a second strap of vials crossing the first, dried herbs bundled on the still, a label tag
SPEC_ART.apothecary = function (ctx, st) {
  line(ctx, -7, 12, 8, -11, OUT, 4.2); line(ctx, -7, 12, 8, -11, '#7a5434', 2.6);
  for (const [q, col] of [[0.3, '#7ff0a8'], [0.62, '#bfe8ec']]) { const x = -7 + 15 * q, y = 12 - 23 * q; rrect(ctx, x - 1.7, y - 2.3, 3.4, 4.6, 1.1, col, OUT, 1); }
  for (let i = 0; i < 3; i++) ellipse(ctx, -19 + i * 1.5, 5 + i * 1.2, 3.2, 1.3, 0.8 + i * 0.3, i % 2 ? '#7aa04a' : '#9ab85a', OUT, 0.7);
  rrect(ctx, -12, 6, 4, 3, 0.6, '#efe2c0', OUT, 0.8);
  glow(ctx, 0, 0, 20, '#d8b070', 0.08 + Math.sin(st.t * 1.5) * 0.03);
};
// Volatile: soot on the apron, sparks spitting off the still, a lit fuse on one vial of the bandolier
SPEC_ART.volatile = function (ctx, st) {
  circle(ctx, 3, 3, 2.4, 'rgba(30,20,16,0.45)'); circle(ctx, -1, -4, 1.6, 'rgba(30,20,16,0.4)');
  for (let i = 0; i < 3; i++) {
    const q = (st.t * 1.8 + i / 3) % 1, a = i * 2.1 + st.t;
    glow(ctx, -15 + Math.cos(a) * (6 + q * 8), Math.sin(a) * (6 + q * 8), 3.5, '#ffb040', 0.9 * (1 - q));
  }
  const fx = -7 + 15 * 0.4, fy = -12 + 23 * 0.4;
  line(ctx, fx, fy - 2.6, fx - 1.5, fy - 6, '#d8c8a8', 0.9);
  glow(ctx, fx - 1.5, fy - 6, 4 + Math.sin(st.t * 30), '#ffd070', 0.9);
};

// the spec of the hero being drawn right now, for the few class looks a spec changes underneath (the Berserker's helm)
let HERO_SPEC = null;
// cls may be null (wisp). opts: { ring, noShadow, lift, spec }
function drawHero(ctx, cls, x, y, angle, st, scale = 1, opts = {}) {
  HERO_SPEC = opts.spec || null;
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

// The Talent Trainer at the Training Yard gate: an old weapons-master in a long blue coat with a red sash and a
// staff, beside a lectern with his open book of talents (talent-panel.js).
function drawTrainer(ctx, x, y, angle, st, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  // lectern, to his right as you face him, with the open book
  ellipse(ctx, 24, 9, 9, 6, 0, 'rgba(0,0,0,0.24)');
  rrect(ctx, 21, -2, 6, 12, 1, '#5a3c24', OUT, 1.3);
  poly(ctx, [14, -6, 34, -6, 32, 4, 16, 4], '#6b4a2b', OUT, 1.5);
  poly(ctx, [17, -4.5, 24, -3.5, 24, 2.5, 17, 1.5], '#efe2c0', OUT, 1);
  poly(ctx, [24, -3.5, 31, -4.5, 31, 1.5, 24, 2.5], '#e6d6b0', OUT, 1);
  glow(ctx, 24, -1, 9, '#ffd98a', 0.22 + Math.sin(st.t * 1.4) * 0.06);
  ellipse(ctx, 2, 5, 15, 11, 0, 'rgba(0,0,0,0.28)');
  ctx.rotate(angle + Math.sin(st.t * 0.5) * 0.18);
  feet(ctx, st, '#2a2018');
  torso(ctx, '#2f4a78', 10, 14);
  line(ctx, -9, -8, -9, 8, '#d8b25a', 1.4);                       // gold hem of the coat
  line(ctx, -4, -13, 4, 12, '#a8322a', 3);                        // red sash
  // staff in the right hand, the left hand resting on the belt
  limb(ctx, [14, 16, -12, 16], '#7a5432', 2.4);
  circle(ctx, 15, 16, 2.2, '#d8b25a', OUT, 1);
  hand(ctx, 5, 15, '#e0b48c');
  hand(ctx, 5, -11, '#e0b48c');
  // head: grey hair, long grey beard in front
  circle(ctx, 0, 0, 7.5, '#bdb6aa', OUT, 2);
  circle(ctx, -1.5, -2.5, 2.5, '#d6d0c4');
  ellipse(ctx, 6.5, 0, 5, 5.5, 0, '#d8d2c6', OUT, 1.5);
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
