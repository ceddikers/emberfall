// Hero art, drawn in code ("paper doll" style). Each hero is drawn in local space
// facing +x, with the left hand at -y and the right hand at +y, ~16px radius at scale 1.

const ANIM_DUR = { attack: 0.45, bash: 0.4, brace: 1.2, cast: 0.55, big: 0.9, dash: 0.2,
  // Ironpalm's strikes (its presses recover in 0.38-0.75s, so its animations are quick)
  palm: 0.3, fist: 0.42, kick: 0.38, uppercut: 0.5, axe: 0.55, flurry: 0.7, guard: 0.6 };
const IP_STRIKES = ['palm', 'fist', 'kick', 'uppercut', 'axe', 'flurry'];

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
  const p = Math.max(actP(st, 'attack'), actP(st, 'bash'), st.action && IP_STRIKES.includes(st.action.type) ? actP(st) : -1);
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
  const coat = '#56603e', apron = '#8a5a34', copper = '#b8743a', skin = '#e8c4a0', hair = '#7a3e24', brass = '#d8a84a';
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
  // the bandolier, slung over one shoulder and round the front of the coat, with four vials in its loops
  const strap = q => ({ x: -2 + Math.sin(q * Math.PI) * 11.5, y: -13 + q * 25 });
  ctx.beginPath(); for (let q = 0; q <= 1.001; q += 0.1) { const p = strap(q); ctx.lineTo(p.x, p.y); }
  ctx.lineCap = 'round'; ctx.lineWidth = 4.6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4424'; ctx.stroke();
  const vials = ['#4fe0c0', '#ff5a1a', '#f4ecd2', '#ffd23a'];
  vials.forEach((col, i) => { const p = strap(0.2 + i * 0.2); rrect(ctx, p.x - 1.9, p.y - 2.5, 3.8, 5, 1.2, col, OUT, 1); circle(ctx, p.x + 1.9, p.y, 0.9, '#9a6a3a'); });
  // hands: the left on the strap, the right holding a vial out (further on a throw)
  hand(ctx, 7, -10, '#6b4a30');
  const vx = 9 + cast * 8, vy = 11 - cast * 4;
  glow(ctx, vx + 3, vy, 6 + cast * 5, '#4fe0c0', 0.25 + cast * 0.4);
  rrect(ctx, vx + 1, vy - 2.6, 5, 5.2, 1.6, '#4fe0c0', OUT, 1.1);
  hand(ctx, vx, vy, '#6b4a30');
  // the bun with a glass rod through it, then the head, then the goggles
  circle(ctx, -7.5, 0, 4.4, hair, OUT, 1.5); circle(ctx, -8.4, -1.2, 1.6, shade(hair, 0.18));
  line(ctx, -10, -5, -5, 5, '#cfe8ee', 1.4);
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
  // a satchel of labelled jars at the hip
  rrect(ctx, -6, -18, 9, 6, 1.8, '#7a5434', OUT, 1.4);
  for (const [x, col] of [[-4, '#7ff0a8'], [-1, '#bfe8ec'], [1.6, '#ffd23a']]) { circle(ctx, x, -18.5, 1.3, col, OUT, 0.8); }
  rrect(ctx, -3.5, -14.6, 4, 1.8, 0.4, '#efe2c0');
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
  const fx = -2 + Math.sin(0.4 * Math.PI) * 11.5, fy = -13 + 0.4 * 25;
  line(ctx, fx + 1.9, fy, fx + 5, fy - 1.5, '#d8c8a8', 0.9);
  glow(ctx, fx + 5, fy - 1.5, 4 + Math.sin(st.t * 30), '#ffd070', 0.9);
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
  if (cls && HERO_TRAIL[cls.id]) HERO_TRAIL[cls.id](ctx, x, y, st, scale, opts.spec);   // world-space trails (the Driftblade's wind)
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

// ---------------------------------------------------------------- the advanced DPS (Thermist, Driftblade)
Object.assign(HERO_ART, {
  // Thermist: a mage in a plum robe with split trim, the left arm frosted to the elbow, the right hand wreathed in flame.
  thermist(ctx, st) {
    const robe = '#3d2b40', skin = '#ecc6a6', hair = '#e9e3ea';
    const cast = castAmt(st);
    feet(ctx, st, '#22182a');
    // a short silver tail tied with a red and a blue cord
    braid(ctx, -6, 0.5, -15, 1.5 + Math.sin(st.t * 2) * 0.8, hair, '#ff7a3a', 4);
    circle(ctx, -9.5, 1, 0.9, '#7ac8ff');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    ellipse(ctx, -0.5, -3, 5, 6, 0, shade(robe, 0.14));
    ctx.save(); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#8fd4ff', 0.9); ctx.beginPath(); ctx.ellipse(-2, 0, 7.5, 11.5, 0, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();
    ctx.strokeStyle = rgba('#ff9a4a', 0.9); ctx.beginPath(); ctx.ellipse(-2, 0, 7.5, 11.5, 0, Math.PI * 0.04, Math.PI * 0.96); ctx.stroke();
    ctx.restore();
    // left arm: frost creeping up the sleeve to the elbow, shards on the forearm, a pale blue hand
    const lx = 9 + cast * 6, ly = -11 + cast * 1.5;
    limb(ctx, [0, -10, 4.5, -12.5, lx, ly], robe, 4.2);
    limb(ctx, [4.5, -12.5, lx, ly], '#bfe4fb', 3.4);
    for (const [sx, sy, a] of [[5.5, -14.5, -0.9], [7.5, -14, -0.4], [6, -10.5, 0.8]]) poly(ctx, [sx, sy, sx + Math.cos(a) * 3.2, sy + Math.sin(a) * 3.2, sx + 1, sy + 0.6], '#e8f8ff', OUT, 0.8);
    hand(ctx, lx, ly, '#cfe9ff');
    glow(ctx, lx + 1, ly, 7 + cast * 4, '#9fe0ff', 0.25 + cast * 0.3);
    // right arm: a bare forearm and a hand cupping a flame
    const rx = 10 + cast * 6, ry = 10 - cast * 2;
    limb(ctx, [0, 10, 4.5, 12.5, rx, ry], robe, 4.2);
    hand(ctx, rx, ry, skin);
    flame(ctx, rx + 3, ry, 3.2 + cast * 2.5, st.t);
    hairHead(ctx, hair, skin, 7.4);
    circle(ctx, -2, -2.5, 1.4, '#ffffff');
    // a spark and a snowflake circling each other over the shoulders
    const a = st.t * 1.8, ex = Math.cos(a) * 15, ey = Math.sin(a) * 13;
    glow(ctx, ex, ey, 5, '#ff8a3a', 0.6); circle(ctx, ex, ey, 1.2, '#ffd27a');
    ctx.save(); ctx.translate(-ex, -ey); ctx.rotate(st.t);
    for (let i = 0; i < 3; i++) { const q = i * Math.PI / 3; line(ctx, -Math.cos(q) * 2.4, -Math.sin(q) * 2.4, Math.cos(q) * 2.4, Math.sin(q) * 2.4, '#d8f2ff', 0.9); }
    ctx.restore();
  },

  // Driftblade: a light duellist in a slate coat, a long jade ribbon scarf streaming behind, a curved sabre in the right hand.
  driftblade(ctx, st) {
    const coat = '#33475c', sash = '#3fc29d', skin = '#d6a37c', hair = '#1d272b';
    const pa = actP(st, 'attack'), s = swing(pa), sd = swingDir(st);
    const pb = actP(st, 'brace'), brace = pb < 0 ? 0 : Math.min(1, pb / 0.1, (1 - pb) / 0.15);
    const dash = pulse(actP(st, 'dash'));
    // the scarf: long and straight at speed, loose and curling at rest
    const mv = st.moving || dash > 0, n = mv ? 10 : 7, pts = [];
    for (let i = 0; i < n; i++) pts.push(-4 - i * (mv ? 4.2 : 3), -2 + Math.sin(st.t * (mv ? 13 : 3.5) - i * 0.85) * i * (mv ? 0.55 : 0.9) + (mv ? 0 : i * 0.6));
    limb(ctx, pts, sash, 3.2);
    const tip = pts.length - 2;
    poly(ctx, [pts[tip], pts[tip + 1] - 2.2, pts[tip] - 4, pts[tip + 1], pts[tip], pts[tip + 1] + 2.2], sash, OUT, 1);
    feet(ctx, st, '#1e252c');
    torso(ctx, coat, 8.5, 13);
    line(ctx, -6, -9, 3, 10, sash, 2.4);
    // off hand back for balance (forward to steady the blade while bracing)
    hand(ctx, 2 + brace * 9, -11 + brace * 4, skin);
    // the sabre: held low and back, swept across on attacks, held flat across the front to parry
    const rot = brace > 0 ? -1.35 * brace + 0.5 * (1 - brace) : 0.5 + s * 1.25 * sd;
    ctx.save(); ctx.translate(9 + brace * 4, 10 - brace * 4); ctx.rotate(rot);
    ctx.fillStyle = '#e4ecf2'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(2, -1.6); ctx.quadraticCurveTo(15, -3.2, 27, -6.5); ctx.quadraticCurveTo(16, 0.5, 2, 1.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    line(ctx, 4, -0.4, 22, -4.2, '#ffffff', 0.8);
    ellipse(ctx, 1, 0, 1.4, 4, 0, '#c8a24a', OUT, 1);
    ctx.restore();
    if (pa >= 0) smear(ctx, 9, 10, 24, 0.5 + 1.25 * sd, 0.5 - 1.5 * sd * strikeAmt(pa), '#7ff0d0', strikeAmt(pa));
    hand(ctx, 9 + brace * 4, 10 - brace * 4, skin);
    // dark hair swept back into a high tail
    poly(ctx, [-3, -2.6, -14, Math.sin(st.t * 6) * 1.5, -3, 2.6], hair, OUT, 1.2);
    hairHead(ctx, hair, skin, 7.3);
    circle(ctx, -4.5, 0, 1.4, sash, OUT, 0.8);
  },
});

Object.assign(SPEC_ART, {
  // Pendulum: a brass bob swinging from the waist on a short chain
  pendulum(ctx, st) {
    const a = Math.sin(st.t * 2.4) * 0.9, bx = -6 + Math.cos(Math.PI + a) * -2, by = Math.sin(a) * 14;
    line(ctx, -5, 0, -12 + bx * 0.2, by, '#c8a24a', 1.1);
    circle(ctx, -12 + bx * 0.2, by, 3, '#d8b25a', OUT, 1.1);
    circle(ctx, -12.8 + bx * 0.2, by - 0.8, 1, '#fff2c0');
  },
  // Zenith: a small crown of flame and frost over the brow, burning brighter in Redline
  zenith(ctx, st) {
    for (let i = 0; i < 5; i++) {
      const a = -1.1 + i * 0.55, x = Math.cos(a) * 7.8, y = Math.sin(a) * 7.8, hot = i >= 2;
      glow(ctx, x, y, 4, hot ? '#ff7a3a' : '#8fd4ff', 0.5 + Math.sin(st.t * 7 + i) * 0.15);
      poly(ctx, [x - 1.2, y - 1.2, x + Math.cos(a) * 3, y + Math.sin(a) * 3, x + 1.2, y + 1.2], hot ? '#ffb05a' : '#cfeeff', OUT, 0.7);
    }
  },
  // Orbit: a dashed ring of wind turning round them, a feather riding it
  orbit(ctx, st) {
    ctx.save(); ctx.rotate(st.t * 2.2);
    ctx.setLineDash([5, 6]); circle(ctx, 0, 0, 22, null, rgba('#a8f0c8', 0.55), 1.3); ctx.setLineDash([]);
    ellipse(ctx, 22, 0, 3.4, 1.3, 1.57, '#e8fff2', OUT, 0.8);
    ctx.restore();
  },
  // Comet: a gold streak trailing straight back from the shoulders
  comet(ctx, st) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const k = st.moving ? 1 : 0.4;
    for (const [y, w] of [[-6, 1.6], [0, 2.4], [6, 1.6]]) { ctx.globalAlpha = 0.5 * k; line(ctx, -8, y, -24 - (st.moving ? 10 : 0), y * 0.6, '#ffd08a', w); }
    ctx.restore();
    glow(ctx, 2, 0, 12, '#ffd08a', 0.2 * k);
  },
});

CHANNEL.thermist = { focus: [16, 0], color: '#ff9a6a', hot: '#e8f6ff', mote: 'ember' };

// ---------------------------------------------------------------- the advanced tanks (Gorgemaw, Oathbroker)
Object.assign(HERO_ART, {
  // Gorgemaw: a huge armoured glutton. A great round belly in banded leather under bronze plates, two enormous
  // gauntlets, and a helm whose jaw-plate hinges open at the front (wide while Open Wide is up, a snap when it eats).
  gorgemaw(ctx, st) {
    const bronze = '#b8743a', iron = '#4a3f3a', hide = '#7a4a30', skin = '#c88a64';
    const s = swing(actP(st, 'attack')), dir = swingDir(st), pa = actP(st, 'attack');
    const open = Math.max(0, Math.min(1, ((st.jawUntil || 0) - st.t) / 0.15)), chomp = st.chompAt != null && st.t - st.chompAt < 0.25 ? 1 - (st.t - st.chompAt) / 0.25 : 0;
    const gape = Math.max(open * (st.jawAll > st.t ? 1.4 : 1), chomp * 0.6);
    feet(ctx, st, '#3a2a22');
    // the belly: wider than any other hero, bands of hide and a bronze plate on top
    ellipse(ctx, -1, 0, 13, 18, 0, hide, OUT, 2.2);
    for (const k of [-0.55, 0, 0.55]) ellipse(ctx, -1 + 2, k * 14, 10, 2.2, 0, shade(hide, -0.18));
    ellipse(ctx, 1, 0, 8, 11, 0, bronze, OUT, 1.8);
    ellipse(ctx, 2.5, -3, 3.5, 5, 0, shade(bronze, 0.25));
    for (const sy of [-1, 1]) circle(ctx, 4, 7 * sy, 1.2, '#ffd8a0', OUT, 0.6);
    // pauldrons
    for (const sy of [-1, 1]) { ellipse(ctx, -2, 15 * sy, 7, 5.5, 0, iron, OUT, 1.8); ellipse(ctx, -1, 15 * sy, 4, 3, 0, bronze); }
    // the gauntlets: the left braced, the right swinging in a cuff (and both forward at the mouth when it eats)
    const rot = 0.2 + dir * s * 1.1;
    if (pa >= 0) smear(ctx, 4, 14, 20, 0.2 + dir * 1.1, rot, '#ffd0a0', strikeAmt(pa), 8);
    ctx.save(); ctx.translate(4, 14); ctx.rotate(rot);
    limb(ctx, [0, 0, 9, 1], iron, 6);
    circle(ctx, 13, 1, 6, bronze, OUT, 1.8); for (let i = 0; i < 3; i++) line(ctx, 15, -3 + i * 3, 18, -3 + i * 3, OUT, 1.2);
    ctx.restore();
    const lf = gape * 4;
    limb(ctx, [2, -14, 9 + lf, -15 + lf * 0.5], iron, 6);
    circle(ctx, 12 + lf, -15 + lf * 0.5, 6, bronze, OUT, 1.8);
    // the helm: a domed iron bowl and the hinged jaw-plate in front, its teeth showing when it opens
    circle(ctx, 1, 0, 8.6, iron, OUT, 2);
    circle(ctx, -1, -2.5, 3, shade(iron, 0.2));
    const ja = 0.15 + gape * 0.75;
    for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(5, 0); ctx.rotate(sy * ja);
      poly(ctx, [0, 0, 7, sy * 1, 8.5, sy * 6.5, 1, sy * 7.5], bronze, OUT, 1.4);
      for (let i = 0; i < 3; i++) poly(ctx, [2 + i * 2.2, sy * 1.2, 3.1 + i * 2.2, sy * 3.4, 4.2 + i * 2.2, sy * 1.2], '#fff4e0');
      ctx.restore();
    }
    if (gape > 0.1) { glow(ctx, 9, 0, 6 + gape * 6, st.jawAll > st.t ? '#ff6a3a' : '#ffb070', 0.35 * gape); ellipse(ctx, 8, 0, 2 + gape * 2, 2 + gape * 4, 0, '#2a0e08'); }
    line(ctx, 3, -5.5, 3, 5.5, '#2a2422', 1.2);
    circle(ctx, 4.5, -3, 1, '#ffb070'); circle(ctx, 4.5, 3, 1, '#ffb070');
  },

  // Oathbroker: a grey-robed contract-knight. A long grey surcoat over plate, a hooded half-helm, a ledger book
  // chained at the left hip, and a sealing-stamp mace in the right hand (its square head stamps on every hit).
  oathbroker(ctx, st) {
    const robe = '#7a7684', plate = '#a8a8b4', wax = '#c04a5a', vellum = '#e8e0cc', lil = '#b8a8e0', skin = '#e0c0a4';
    const s = swing(actP(st, 'attack')), dir = swingDir(st), pa = actP(st, 'attack'), big = pulse(actP(st, 'big'));
    const wave = Math.sin(st.t * 3.5) * 1.2 + (st.moving ? Math.sin(st.t * 11) * 2 : 0);
    // the surcoat's long tails
    poly(ctx, [-4, -11, -18, -11 + wave * 0.4, -21 + wave, -3, -21 + wave, 3, -18, 11 - wave * 0.4, -4, 11], robe, OUT, 2);
    line(ctx, -6, 0, -20 + wave, 0, shade(robe, -0.25), 1.2);
    feet(ctx, st, '#3a3844');
    torso(ctx, plate, 9, 14);
    ellipse(ctx, -1.5, 0, 6.5, 12, 0, robe, OUT, 1.4);
    line(ctx, 3.5, -8, 3.5, 8, lil, 1.4);
    for (const sy of [-1, 1]) { ellipse(ctx, -0.5, 12.5 * sy, 6, 4.5, 0, plate, OUT, 1.5); line(ctx, -4, 12.5 * sy, 2.5, 12.5 * sy, shade(plate, -0.3), 1); }
    // the ledger: a thick book on a chain at the left hip, swaying
    const bs = Math.sin(st.t * 2.2) * 1.2;
    ctx.save(); ctx.setLineDash([1.6, 1.2]); line(ctx, -2, -12, -7, -17 + bs, '#c8c8d0', 1.4); ctx.setLineDash([]); ctx.restore();
    ctx.save(); ctx.translate(-8, -18 + bs); ctx.rotate(-0.25);
    rrect(ctx, -5, -3.5, 10, 7, 1.2, '#4a3a4a', OUT, 1.4); rrect(ctx, -4, -2.6, 8, 5.2, 0.8, vellum); circle(ctx, 0, 0, 1.6, wax, OUT, 0.6);
    ctx.restore();
    // the stamp-mace: a shaft and a square seal head, brought down on every hit (and raised high for the big ones)
    const rot = 0.25 + dir * s * 1.15 - big * 1.2;
    if (pa >= 0) smear(ctx, 7, 11, 22, 0.25 + dir * 1.15, rot, lil, strikeAmt(pa), 6);
    ctx.save(); ctx.translate(7, 11); ctx.rotate(rot);
    rrect(ctx, -3, -1.3, 22, 2.6, 1, '#5a4a3a', OUT, 1.2);
    rrect(ctx, 18, -5, 7, 10, 1.5, plate, OUT, 1.6); rrect(ctx, 24, -4, 2, 8, 0.6, wax);
    ctx.restore();
    hand(ctx, 7, 11, plate);
    hand(ctx, 6, -10, plate);
    // hood over a steel half-helm, a sliver of face
    circle(ctx, 0.5, 0, 7.8, robe, OUT, 2);
    ellipse(ctx, 3, 0, 4.5, 5.5, 0, plate, OUT, 1.2);
    ellipse(ctx, 6.4, 0, 1.8, 3.2, 0, skin);
    line(ctx, 3, -4.5, 3, 4.5, '#3a3844', 1);
    circle(ctx, -2, -2.2, 2, shade(robe, 0.18));
  },
});
Object.assign(SPEC_ART, {
  // Glutton: a feast-napkin tied under the helm, and a fat gold belt round the belly
  glutton(ctx) {
    ellipse(ctx, -1, 0, 13.5, 18.5, 0, null, '#e8c15a', 2.2);
    poly(ctx, [8, -5, 14, 0, 8, 5], '#f4f0e4', OUT, 1.2);
    circle(ctx, -1, 13, 1.8, '#ffd27a', OUT, 0.8);
  },
  // Gizzard: grey stone plates set into the belly, glowing warm while it digests
  gizzard(ctx, st) {
    for (const [x, y] of [[-4, -8], [-4, 8], [-7, 0]]) poly(ctx, [x - 3, y - 3, x + 3, y - 3.5, x + 3.5, y + 3, x - 3, y + 3.5], '#9a948a', OUT, 1);
    glow(ctx, 0, 0, 16, '#ffc070', 0.12 + Math.sin(st.t * 3) * 0.05);
  },
  // Guarantor: a gold chain across the chest to a second seal, gold trim on the pauldrons
  guarantor(ctx) {
    ctx.save(); ctx.setLineDash([1.6, 1.2]); line(ctx, 3, -11, 3, 11, '#e8c15a', 1.4); ctx.setLineDash([]); ctx.restore();
    circle(ctx, 4, 0, 2.4, '#ffd27a', OUT, 0.9);
    for (const sy of [-1, 1]) ellipse(ctx, -0.5, 12.5 * sy, 6, 4.5, 0, null, '#e8c15a', 1.2);
  },
  // Collector: a red sash hung with coin pouches and wax seals
  collector(ctx) {
    line(ctx, -6, -10, 3, 10, '#a02838', 2.6);
    for (const [x, y] of [[-3, -4], [0, 3]]) circle(ctx, x, y, 1.9, '#d8a040', OUT, 0.8);
    circle(ctx, -5, 7, 1.6, '#c04a5a', OUT, 0.7);
  },
});

// World-space trails, drawn under the hero (called from drawHero after translate/scale; x, y are the hero's world position).
const HERO_TRAIL = {
  // the Driftblade's wind: two thin ribbons streaming from where they ran, fading in half a second
  driftblade(ctx, x, y, st, scale, spec) {
    if (!st || st.t == null) return;
    const tr = st.windTrail || (st.windTrail = []);
    const last = tr[tr.length - 1];
    if (st.moving && (!last || Math.hypot(x - last.x, y - last.y) > 5)) tr.push({ x, y, t: st.t });
    while (tr.length && (st.t - tr[0].t > 0.5 || st.t < tr[0].t)) tr.shift();
    if (tr.length > 40) tr.splice(0, tr.length - 40);
    if (tr.length < 2) return;
    const col = spec === 'comet' ? '#ffd08a' : spec === 'orbit' ? '#a8f0c8' : '#8ff0d8';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const off of [-7, 7]) {
      for (let i = 1; i < tr.length; i++) {
        const a = tr[i - 1], b = tr[i], age = 1 - (st.t - b.t) / 0.5;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * off, ny = dx / d * off;
        const wob = Math.sin(b.t * 18 + off) * 1.5;
        ctx.globalAlpha = Math.max(0, age) * 0.55; ctx.strokeStyle = col; ctx.lineWidth = 1 + age * 2;
        ctx.beginPath();
        ctx.moveTo((a.x - x) / scale + nx * 0.5, (a.y - y) / scale + ny * 0.5 + wob);
        ctx.lineTo((b.x - x) / scale + nx * 0.5, (b.y - y) / scale + ny * 0.5 + wob);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Ironpalm (tank)
// A barefoot monk-brawler: shaved head with a short topknot, a saffron sleeveless gi over a maroon sash, prayer beads
// round the neck, bare arms and iron plates bound over the knuckles with cloth wraps. Guard up at rest; the lead hand
// jabs open-palmed (Light), the rear hand drives a straight (Heavy), a leg snaps out (Kick); uppercut, axe kick, a
// flurry of palms, and forearms crossed for guard. Hits freeze for a beat (hitStop in draw-util.js).
HERO_ART.ironpalm = function (ctx, st) {
  const gi = HERO_SPEC === 'stillwater' ? '#9cc4dc' : HERO_SPEC === 'avalanche' ? '#c8875a' : '#f0a73a';
  const sash = HERO_SPEC === 'stillwater' ? '#2e4a66' : '#7a2430', skin = '#d9a07a', wrap = '#ece0c8', iron = '#8e9aa8';
  const p = actP(st), raw = p >= 0 && st.action ? st.action.type : null;
  const type = raw === 'attack' ? (st.action.alt ? 'fist' : 'palm') : raw;   // auto-attacks: a jab, then a straight
  const ease = q => (q < 0 ? 0 : q < 0.35 ? easeOut(q / 0.35) : 1 - easeOut((q - 0.35) / 0.65));   // out fast, back slower
  const k = type && p >= 0 ? ease(p) : 0;
  const bob = st.moving ? Math.sin(st.t * 12) * 1.2 : Math.sin(st.t * 3) * 0.5;
  // bare feet: wider stance; Kick and axe kick swing the rear leg out
  const legOut = (type === 'kick' || type === 'axe') ? k : 0;
  const w = st.moving ? Math.sin(st.t * 12) * 3 : 0;
  ellipse(ctx, 2 + w, -7.5, 4.6, 3, 0, skin, OUT, 1.4);
  if (legOut > 0) {
    const fx = 4 + legOut * 20, fy = 7 - legOut * 5;
    limb(ctx, [-1, 6, fx * 0.6, fy * 0.9 + 1, fx, fy], sash, 4.2);
    ellipse(ctx, fx + 2, fy, 4.8, 3.2, -0.3, skin, OUT, 1.4);
    if (type === 'axe') smear(ctx, 0, 0, 22, -1.2, 0.3, '#ffe0a0', Math.sin(p * Math.PI) * 0.9, 6);
    else smear(ctx, 0, 4, 20, 1.2, -0.1, '#ffffff', strikeAmt(p) * 1.2, 5);
  } else ellipse(ctx, 0 - w, 7.5, 4.6, 3, 0, skin, OUT, 1.4);
  // the body: a sleeveless gi crossed at the chest, tied with the sash
  torso(ctx, gi, 9, 13);
  line(ctx, -2, -9, 4, 3, shade(gi, -0.25), 1.6);
  rrect(ctx, -4.5, -11, 3, 22, 1, sash, OUT, 1.1);
  poly(ctx, [-4, 10, -11, 13 + Math.sin(st.t * 4) * 1.5, -9, 8], sash, OUT, 1);
  // prayer beads
  for (let i = 0; i < 9; i++) { const a = -1.3 + i * 0.32; circle(ctx, 1 + Math.cos(a) * 7.5, Math.sin(a) * 7.5, 1.1, '#4a2a1e', null); }
  // arms: guard up; which hand moves depends on the strike
  let L = [8, -8], R = [7, 9], open = false;
  if (type === 'palm') { L = [8 + k * 16, -8 + k * 6]; open = true; }
  else if (type === 'fist') R = [7 + k * 19, 9 - k * 8];
  else if (type === 'uppercut') { R = [7 + k * 12, 9 - k * 6]; }
  else if (type === 'flurry' && p >= 0) { const s = Math.sin(p * Math.PI * 7); L = [10 + Math.max(0, s) * 14, -6 + Math.max(0, s) * 4]; R = [10 + Math.max(0, -s) * 14, 6 - Math.max(0, -s) * 4]; open = true; }
  else if (type === 'guard' || type === 'brace') { L = [13, -3]; R = [12, 4]; }
  else if (type === 'big') { L = [6 - k * 2, -12 - k * 6]; R = [6 - k * 2, 12 + k * 6]; }
  const arm = (sx, sy, [hx, hy], up) => {
    limb(ctx, [sx, sy, (sx + hx) / 2 + 1, (sy + hy) / 2 + (sy < 0 ? -1.5 : 1.5), hx, hy], skin, 3.6);
    limb(ctx, [(sx + hx * 2) / 3, (sy + hy * 2) / 3, hx, hy], wrap, 3.2);   // the cloth wraps up the forearm
    const r = up ? 4.4 + k * 1.6 : 3.8;
    if (open && sy < 0 || (type === 'flurry' && p >= 0)) { ellipse(ctx, hx + 1, hy, r * 1.1, r * 1.3, 0, wrap, OUT, 1.4); line(ctx, hx + 2.5, hy - 2, hx + 2.5, hy + 2, 'rgba(90,60,40,0.4)', 0.8); }
    else { circle(ctx, hx, hy, r, wrap, OUT, 1.4); rrect(ctx, hx + r * 0.2, hy - r * 0.8, r * 0.7, r * 1.6, 1, iron, OUT, 0.9); }   // iron over the knuckles
  };
  arm(1, -10, L, type === 'palm');
  arm(1, 10, R, type === 'fist' || type === 'uppercut');
  if (type === 'fist') smear(ctx, 7, 9, 18, 0.6, -0.1, '#ffd8a0', strikeAmt(p), 5);
  if (type === 'uppercut') { const a = Math.sin(Math.min(1, p * 1.6) * Math.PI); glow(ctx, R[0], R[1], 10, '#ffb84a', a * 0.6); smear(ctx, 4, 6, 16, 1.4, -0.4, '#ffd27a', a, 6); }
  // shaved head, a short topknot at the back, a strip of brow
  ctx.save(); ctx.translate(0, bob * 0.2);
  circle(ctx, 0.5, 0, 7.4, skin, OUT, 2);
  circle(ctx, -1.5, -2.2, 2.4, shade(skin, 0.18));
  ellipse(ctx, 5.4, 0, 1.4, 4.6, 0, shade(skin, -0.2));
  circle(ctx, -7, 0, 2.6, '#2a1c16', OUT, 1.2);
  line(ctx, -9.5, 0, -12, Math.sin(st.t * 5) * 1.2, '#2a1c16', 1.6);
  ctx.restore();
};
CHANNEL.ironpalm = { focus: [12, 0], color: '#ffb84a', hot: '#fff0c8', mote: 'mote' };

Object.assign(SPEC_ART, {
  // Still Water: ripples spreading under the feet while they stand still, and a pale blue band round the brow
  stillwater(ctx, st) {
    if (!st.moving) for (let i = 0; i < 2; i++) { const q = (st.t * 0.6 + i * 0.5) % 1; ctx.save(); ctx.globalAlpha = (1 - q) * 0.5; ellipse(ctx, 0, 2, 12 + q * 16, (12 + q * 16) * 0.75, 0, null, '#bfe4f6', 1.2); ctx.restore(); }
    ctx.save(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#8fc8e8'; ctx.beginPath(); ctx.arc(0.5, 0, 6.8, -1.2, 1.2); ctx.stroke(); ctx.restore();
  },
  // Avalanche Fist: stone gauntlets over the wraps, grit falling off them, a smoulder of momentum
  avalanche(ctx, st) {
    for (const sy of [-1, 1]) { const x = 9, y = 8.5 * sy; glow(ctx, x, y, 8, '#d08a5a', 0.15 + Math.sin(st.t * 4 + sy) * 0.05); }
    for (let i = 0; i < 3; i++) { const q = (st.t * 1.3 + i / 3) % 1; circle(ctx, 6 - q * 6, (i - 1) * 9, 1 - q * 0.6, '#8a6a50'); }
  },
});