// Hero art, drawn in code ("paper doll" style). Each hero is drawn in local space
// facing +x, with the left hand at -y and the right hand at +y, ~16px radius at scale 1.

const ANIM_DUR = { attack: 0.45, bash: 0.4, brace: 1.2, cast: 0.55, big: 0.9, dash: 0.2,
  // Ironpalm's strikes (its presses recover in 0.38-0.75s, so its animations are quick)
  palm: 0.3, fist: 0.42, kick: 0.38, uppercut: 0.5, axe: 0.55, flurry: 0.7, guard: 0.6 };
const IP_STRIKES = ['palm', 'fist', 'kick', 'uppercut', 'axe', 'flurry'];

function feet(ctx, st, color) {
  // the stride runs with the hero's real speed and eases in and out (heroMotion); old callers without one still step
  const amp = st.walkK != null ? st.walkK : st.moving ? 1 : 0;
  const w = amp > 0.01 ? Math.sin(st.stride != null ? st.stride : st.t * 12) * 5 * amp : 0;
  const sit = st.sitK || 0;   // sitting (the emote): legs stretched out in front
  ellipse(ctx, 1 + w + sit * 8, -6.5 - sit * 0.6, 5, 3.4, 0, color, OUT, 1.5);
  ellipse(ctx, 1 - w + sit * 9, 6.5 + sit * 0.6, 5, 3.4, 0, color, OUT, 1.5);
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
    const crus = HERO_SPEC === 'crusader';   // the Crusader's cape is gold and a white sun-tabard hangs down the back (the sword gets a sun on its guard)
    const s = swing(actP(st, 'attack'));
    const bash = pulse(actP(st, 'bash'));
    const pb = actP(st, 'brace');
    const brace = pb < 0 ? 0 : Math.min(1, pb / 0.12, (1 - pb) / 0.12);
    const big = pulse(actP(st, 'big'));
    const front = Math.max(bash, brace);
    const wave = Math.sin(st.t * 4) * 1.5 + (st.moving ? Math.sin(st.t * 11) * 2 : 0);
    poly(ctx, [-4, -12, -19, -13 + wave * 0.5, -23 + wave, 0, -19, 13 - wave * 0.5, -4, 12], crus ? '#e6bd4c' : blue, OUT, 2);
    if (crus) {
      line(ctx, -6, -10, -20 + wave * 0.5, -5, '#f6dc8a', 1.2); line(ctx, -6, 10, -20 + wave * 0.5, 5, '#f6dc8a', 1.2);
      rrect(ctx, -17, -4.6, 11, 9.2, 2, '#f6efd8', OUT, 1.3);
      circle(ctx, -11.5, 0, 2.3, gold, OUT, 0.8);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; line(ctx, -11.5 + Math.cos(a) * 2.6, Math.sin(a) * 2.6, -11.5 + Math.cos(a) * 4, Math.sin(a) * 4, gold, 1); }
    }
    feet(ctx, st, '#5d6878');
    torso(ctx, steel);
    for (const sy of [-1, 1]) { ellipse(ctx, 0, 12 * sy, 6, 5, 0, '#8796ab', OUT, 1.5); circle(ctx, 0.5, 12 * sy, 1.4, gold, OUT, 0.8); }
    // the plumed great-helm, carried at the hip
    circle(ctx, -6, 13, 4, steel, OUT, 1.5);
    line(ctx, -3.6, 11.2, -3.6, 14.8, '#2a3140', 1.4);
    ellipse(ctx, -9, 13, 4.2, 1.8, 0, '#c43b3b', OUT, 1.2); ellipse(ctx, -10.5, 10.8, 3.4, 1.4, -0.5, '#d9514a', OUT, 1);
    // sword (with a bright arc while it cuts)
    const dir = swingDir(st), rot = 0.35 + dir * s * 1.1 - big * 1.3, pa = actP(st, 'attack');
    smear(ctx, 7, 12, 24, 0.35 + dir * 1.1, rot, '#cfe0ff', strikeAmt(pa), 7);
    ctx.save(); ctx.translate(7, 12); ctx.rotate(rot);
    poly(ctx, [2, -2, 22, -2, 27, 0, 22, 2, 2, 2], '#e3e9f0', OUT, 1.5);
    line(ctx, 4, 0, 21, 0, '#b8c2cf', 1);
    rrect(ctx, -0.5, -5.5, 3, 11, 1, gold, OUT, 1.2);
    if (crus) { circle(ctx, 1, 0, 3.4, gold, OUT, 1); circle(ctx, 1, 0, 1.4, '#fff3c0'); }
    rrect(ctx, -6, -1.6, 5.5, 3.2, 1, '#6b4a2b', OUT, 1);
    ctx.restore();
    hand(ctx, 7, 12, steel);
    // tower shield: at the side normally, in front when bashing / bracing
    ctx.save(); ctx.translate(7 + 9 * front, -12 + 11 * front); ctx.rotate(-0.45 * (1 - front));
    rrect(ctx, -3.5, -13, 7, 26, 3, blue, OUT, 2);
    rrect(ctx, -1.8, -10.5, 3.6, 21, 1.5, null, gold, 1.4);
    // a gold fleur-de-lis, as on the painted shield
    line(ctx, 0, -7, 0, 8, gold, 1.5); poly(ctx, [0, -10, 1.9, -6, 0, -3.4, -1.9, -6], gold, OUT, 0.6);
    for (const sx of [-1, 1]) ellipse(ctx, 2.2 * sx, 0.5, 1.6, 0.9, sx * 0.7, gold, OUT, 0.5);
    ctx.restore();
    // bare head: short, tousled platinum-blond hair
    for (const sy of [-1, 0, 1]) poly(ctx, [-4, 3 * sy - 2.4, -10.5, 4.5 * sy, -4, 3 * sy + 2.4], '#e6d390', OUT, 1.2);
    hairHead(ctx, '#e6d390', '#f0d2b4');
  },

  bloodreaver(ctx, st) {
    const berserk = HERO_SPEC === 'berserker', hemo = HERO_SPEC === 'hemomancer';
    const leather = berserk ? '#c4825c' : hemo ? '#2a2226' : '#5e2626', iron = '#5b5f66', bone = hemo ? '#8a7a56' : '#a8946a';
    const s = swing(actP(st, 'attack'));
    const wave = Math.sin(st.t * 4) * 1.5 + (st.moving ? Math.sin(st.t * 11) * 2 : 0);
    poly(ctx, [-4, -11, -17, -12, -20 + wave, -6, -15, -3, -22 + wave, 1, -16, 5, -20 + wave, 10, -4, 11], hemo ? '#8a1424' : '#4a1416', OUT, 2);
    feet(ctx, st, '#3a1a1a');
    torso(ctx, leather, 9.5, 14.5);
    // heavy fur mantle across the shoulders (the Berserker keeps it on one shoulder, bare and scarred on the other; the Hemomancer wears a red cloak), a bronze clasp
    const fur = hemo ? '#8a1a2a' : '#7a6450';
    ellipse(ctx, -3, 0, 7, 16, 0, berserk ? leather : fur, OUT, 1.8);
    for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) { if (berserk && sy > 0) continue; circle(ctx, -1 - i * 3.2, (13.5 - i * 0.8) * sy, 3, i % 2 ? fur : shade(fur, 0.14), OUT, 1.1); }
    if (berserk) { ctx.save(); ctx.strokeStyle = '#9a3a2a'; ctx.lineWidth = 1; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-5 + i * 3, 8 + i * 0.8); ctx.lineTo(-2 + i * 3, 13 + i * 0.4); ctx.stroke(); } ctx.restore(); }
    if (hemo) { line(ctx, 2, -12, 3, 12, '#9a8a60', 0.9); for (const sy of [-1, 1]) poly(ctx, [1, 8 * sy, 3.4, 10 * sy, 1, 12.4 * sy, -1, 10 * sy], '#c0102a', OUT, 0.8); }
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
    hairBack(ctx, mane, berserk ? 13 : 10, berserk ? 8 : 7);
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
      rrect(ctx, 3, -0.9, 5.4, 1.8, 0.8, '#3e4248', OUT, 0.8);   // the nose-guard
      ellipse(ctx, 6.4, 0, 1.9, 3.8, 0, '#c99a7a');
      circle(ctx, 6.4, -1.9, 0.8, '#2a1a14'); circle(ctx, 6.4, 1.9, 0.8, '#2a1a14');
      if (!hemo) for (const sy of [-1, 1]) line(ctx, 5.4, 3.4 * sy, 7.6, 1.8 * sy, '#d8482a', 1);   // red war paint across the cheeks
    }
    ellipse(ctx, 8.8, 0, 3, 4.2, 0, mane, OUT, 1.2);   // the beard
  },

  runeguard(ctx, st) {
    // a deep-violet cloak and hood with a pale rune-patterned border, black under-robes, engraved silver pauldrons and a
    // silver compass-star clasp (Spellwarden: the cloak goes midnight blue with an ice-blue border; Runeblade: hood down, see its spec look)
    const sw = HERO_SPEC === 'spellwarden';
    const robe = sw ? '#2c3270' : '#4a2f8a', trim = sw ? '#bcd8ff' : '#d3c6ff', silver = '#b9c0cc', hoodC = sw ? '#3a3a7e' : '#4b2f90', skin = '#dcae86';
    const cast = castAmt(st);
    const fr = pulse(actP(st, 'big'));
    feet(ctx, st, '#1c1a30');
    ellipse(ctx, -2, 0, 11, 15, 0, robe, OUT, 2);
    ellipse(ctx, -2, 0, 8, 12, 0, null, rgba(trim, 0.55), 1.4);
    for (const sy of [-1, 1]) {
      ellipse(ctx, 0, 11 * sy, 6.2, 4.8, 0, silver, OUT, 1.5);
      line(ctx, -2.4, 11 * sy, 2.4, 11 * sy, '#6a7080', 0.8); line(ctx, 0, 11 * sy - 2.4, 0, 11 * sy + 2.4, '#6a7080', 0.8);   // the engraved star on each pauldron
    }
    // the compass-star clasp and its dangling cord at the chest
    circle(ctx, 6.4, 0, 2.5, silver, OUT, 1); circle(ctx, 6.4, 0, 1, sw ? '#7ab0ff' : '#9b6cf0');
    // floating hex shield on the left, swings to the front for Mirror Aegis
    const hx = 7 + fr * 9, hy = -19 + fr * 19;
    glow(ctx, hx, hy, 16, '#a98bff', 0.35 + fr * 0.3);
    hexagon(ctx, hx, hy, 9, rgba('#7b5cf0', 0.55), trim, 1.6);
    hexagon(ctx, hx, hy, 4.5, null, rgba('#ffffff', 0.7), 1);
    for (const sy of [-1, 1]) {
      glow(ctx, 8 + cast * 5, 10 * sy, 7, '#b18cff', 0.4 + cast * 0.5);
      hand(ctx, 8 + cast * 5, 10 * sy, skin);
    }
    // violet hood up, its rim banded in pale runes; the face shows, navy-black hair across the brow
    circle(ctx, 0, 0, 8, hoodC, OUT, 2);
    circle(ctx, -1.5, -2.4, 2.6, shade(hoodC, 0.12));
    ellipse(ctx, 4.8, 0, 2.6, 4.6, 0, skin);
    ellipse(ctx, 3.6, 0, 1.5, 4.6, 0, '#1c2140');
    poly(ctx, [3.6, -3.2, 6.6, -1.2, 3.8, 0.4], '#1c2140');
    ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0.6, 0, 6.6, -1.15, 1.15); ctx.stroke();
    for (const a of [-0.95, -0.55, -0.15, 0.25, 0.65, 1.05]) circle(ctx, 0.6 + Math.cos(a) * 6.6, Math.sin(a) * 6.6, 0.5, hoodC);   // the rune diamonds along the border
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
    // a dark-green cloak over cream shirt sleeves and a brown leather corset, gold buckles and bracers; tan skin, long auburn hair
    // (Venomstrike: the cloak's deep hood is up over the head, drawn by its spec look)
    const venom = HERO_SPEC === 'venomstrike';
    const cloak = venom ? '#25452b' : '#2f5f38', leather = '#6a4528', hood = venom ? '#1f3a26' : '#2f5f38', skin = '#b97a4c', hair = '#b0401c', gold = '#d8b04a', shirt = '#eadfc4';
    const pa = actP(st, 'attack');
    const nocked = pa >= 0 && pa < 0.6;
    const pull = nocked ? easeOut(pa / 0.6) : 0;
    // quiver on the back, a gold band on it, white-fletched arrows
    ctx.save(); ctx.translate(-8, 5); ctx.rotate(0.5);
    rrect(ctx, -9, -3, 17, 6, 2, leather, OUT, 1.5);
    rrect(ctx, 3, -3.2, 2.2, 6.4, 0.8, gold, OUT, 0.8);
    for (const o of [-1.5, 1.5]) { poly(ctx, [-9, o - 1.5, -13, o, -9, o + 1.5], '#f2ecdc', OUT, 1); line(ctx, -9, o, -12, o, '#3f7a3a', 0.8); }
    ctx.restore();
    feet(ctx, st, '#4b3a28');
    poly(ctx, [-6, -10, -16, -4, -16, 4, -6, 10], shade(cloak, -0.15), OUT, 1.5);
    ellipse(ctx, -2, 0, 10, 14.5, 0, cloak, OUT, 2);
    // cream shirt sleeves at the shoulders with a gold-buckled leather strap across the chest and a gold leaf clasp
    for (const sy of [-1, 1]) { ellipse(ctx, 2, 11.5 * sy, 5.2, 4, 0.3 * sy, shirt, OUT, 1.3); rrect(ctx, 0.2, 10 * sy - 1.2, 3, 2.4, 0.6, gold, OUT, 0.7); }
    line(ctx, -5, -9, 4, 6, leather, 2.6); rrect(ctx, -0.6, -2.4, 3, 3.6, 0.7, gold, OUT, 0.8);
    ellipse(ctx, 3.2, -6.5, 1.9, 1.3, -0.5, gold, OUT, 0.8);
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
    for (const sy of [-1, 1]) poly(ctx, [10, 14 * sy, 12.4, 14.4 * sy, 14, 17.8 * sy, 11, 17 * sy], gold, OUT, 0.9);   // gold caps on the limb tips
    if (nocked) {
      line(ctx, sx, 0, sx + 22, 0, '#d8c8a0', 2);
      poly(ctx, [sx + 22, -2.5, sx + 28, 0, sx + 22, 2.5], gold, OUT, 1);
    }
    ellipse(ctx, 18, 0, 2.6, 5.4, 0, gold, OUT, 1);   // the gold-wrapped grip
    hand(ctx, 16.5, 0, '#5a3c26');   // dark brown leather gloves
    hand(ctx, nocked ? sx : 6, nocked ? 0 : 9, '#5a3c26');
    for (const [hx, hy] of [[16.5, 0], [nocked ? sx : 6, nocked ? 0 : 9]]) line(ctx, hx - 3.5, hy - 2.2, hx - 3.5, hy + 2.2, gold, 1.5);   // a gold bracer cuff on each wrist
    // hood down around the shoulders; long auburn hair with one thick braid, pointed half-elf ears
    ellipse(ctx, -5, 0, 4.5, 9, 0, hood, OUT, 1.5);
    hairBack(ctx, hair, 9, 6.5);
    braid(ctx, -2, 6, -11, 10, hair, '#c9a24a', 5);
    ellipse(ctx, -5, -5.5, 1.8, 1.2, 0, '#d8b04a', OUT, 0.6);   // a gold hair clasp
    hairHead(ctx, hair, skin, 7.6);
    for (const sy of [-1, 1]) poly(ctx, [0, 6.2 * sy, 1.4, 12.5 * sy, 4.2, 6 * sy], '#c4885a', OUT, 1.1);   // pointed half-elf ears
  },

  shadowblade(ctx, st) {
    // black lacquered armour with silver diamond plates and buckled straps, a long crimson scarf, black gloves, long black hair
    // (Bladedancer: curved blades, silver bracers and a violet scarf; Nightstalker: a red-lined black hood, see its spec look)
    const dancer = HERO_SPEC === 'bladedancer';
    const cloth = '#1f1a28', scarf = dancer ? '#7a45b8' : '#b0203a', silver = '#c4c8d4', skin = '#dcb496', glove = '#16131c';
    const pa = actP(st, 'attack');
    let l = 0, r = 0;
    if (pa >= 0) { if (pa < 0.5) l = pulse(pa / 0.5); else r = pulse((pa - 0.5) / 0.5); }
    const pts = [], pts2 = [];
    for (let i = 0; i < 8; i++) { pts.push(-3 - i * 4, Math.sin(st.t * 8 - i * 0.9) * i * 0.8); pts2.push(-3 - i * 3.2, -3 + Math.sin(st.t * 7 - i * 1.1 + 1) * i * 0.9 - i * 0.5); }
    limb(ctx, pts2, shade(scarf, -0.15), 2.8);
    limb(ctx, pts, scarf, 3.8);
    feet(ctx, st, '#14111a');
    torso(ctx, cloth, 8.5, 13);
    ellipse(ctx, -1, 0, 6, 10, 0, null, rgba('#9b5cd0', 0.65), 1.2);   // purple trim
    // silver diamond plates on the shoulders, a buckled strap across the chest
    for (const sy of [-1, 1]) { poly(ctx, [-1, 10.6 * sy, 2.4, 12.4 * sy, 5.6, 10.6 * sy, 2.4, 8.4 * sy], silver, OUT, 1); poly(ctx, [1.2, 10.6 * sy, 2.4, 11.6 * sy, 3.8, 10.6 * sy, 2.4, 9.6 * sy], '#5a5668'); }
    line(ctx, -5, -8, 4, 7, '#2e2838', 2.2); rrect(ctx, -0.8, -2, 3, 3.4, 0.7, silver, OUT, 0.8);
    const dagger = (x, y, rot) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      if (dancer) {
        ctx.beginPath(); ctx.moveTo(1, -1.8); ctx.quadraticCurveTo(14, -3.6, 21, 3.4); ctx.quadraticCurveTo(12, 0.6, 1, 1.8); ctx.closePath();
        ctx.fillStyle = '#e8ecf6'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.stroke();
      } else poly(ctx, [1, -1.8, 13, 0, 1, 1.8], '#dfe3ec', OUT, 1.3);
      rrect(ctx, -0.5, -3.5, 2, 7, 0.8, '#8a8c9c', OUT, 1);
      rrect(ctx, -5, -1.2, 5, 2.4, 0.8, '#2a2438', OUT, 0.8);
      line(ctx, -5, 0, -8, 1.4, '#7b3fa0', 1.3);   // the violet tassel on the pommel
      ctx.restore();
      hand(ctx, x, y, glove);
      if (dancer) line(ctx, x - 3.4, y - 2.2, x - 3.4, y + 2.2, silver, 1.6);   // a silver bracer ring at the wrist
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
    // long black hair, a pale-gold face with one silver earring
    hairBack(ctx, '#14111c', 10, 6.5);
    hairHead(ctx, '#14111c', skin, 7.5);
    circle(ctx, -1.6, -2.3, 1.6, '#3a3550');   // a blue-black sheen
    circle(ctx, 1, 7.4, 0.9, silver, OUT, 0.5);
  },

  pyromancer(ctx, st) {
    // a crimson cloak over a black bodice, tall black collar edged in gold; a gold-banded crimson witch hat with a red gem
    // (Sigilmancer: the hat and cloak go midnight blue, Cataclysm: a deeper blood red)
    const sig = HERO_SPEC === 'sigilmancer', cata = HERO_SPEC === 'cataclysm';
    const robe = sig ? '#262a4c' : cata ? '#8a1c16' : '#a82a1a', trim = '#f2c84b', hat = sig ? '#232846' : cata ? '#8a1c1c' : '#9a2020', skin = '#f0c9a0', inner = '#1a1218';
    const cast = castAmt(st);
    feet(ctx, st, '#3a1410');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    ellipse(ctx, -2, 0, 7.5, 11.5, 0, null, rgba(trim, 0.7), 1.2);
    // the tall pointed collar at each shoulder, black with a gold edge; a red gem clasp between them
    for (const sy of [-1, 1]) poly(ctx, [-4, 8.5 * sy, 1, 15.5 * sy, 7, 11.5 * sy, 5, 7.5 * sy], inner, rgba(trim, 0.9), 1.1);
    circle(ctx, 5.5, 0, 1.6, '#e0283a', OUT, 0.8);
    // left hand open at the side with a flared orange cuff, the right holding a fire up on one finger
    ellipse(ctx, 4, -12, 4.6, 3.4, -0.4, sig ? '#d65a2a' : '#e8741f', OUT, 1.2);
    hand(ctx, 8, -9.5, skin);
    const ox = 14 + cast * 8, oy = 9 - cast * 6;
    ellipse(ctx, ox - 8, oy + 3, 4.6, 3.4, 0.5, sig ? '#d65a2a' : '#e8741f', OUT, 1.2);
    hand(ctx, ox - 5, oy + 1, skin);
    flame(ctx, ox, oy, 4.5 + cast * 3, st.t);
    // long, wavy flame-red hair spilling out from under the brim
    hairBack(ctx, '#d8381a', 11, 8);
    // wide witch hat seen from above, a gold-stitched edge, a gem brooch on the band, a crystal dangling from the tip flopped backwards
    circle(ctx, 0, 0, 10.5, hat, OUT, 2);
    circle(ctx, 0, 0, 9.4, null, rgba(trim, 0.55), 0.8);
    circle(ctx, 0, 0, 7, null, '#b88a3a', 1.7);
    poly(ctx, [-1, -5, -1, 5, -14, 3], shade(hat, 0.12), OUT, 1.5);
    circle(ctx, -1, 0, 5, shade(hat, 0.12), OUT, 1.5);
    poly(ctx, [-15.5, 3, -14, 5, -15.5, 8, -17, 5], '#d8d0c0', OUT, 0.8);   // the dangling crystal
    circle(ctx, 7, 0, 2.5, trim, OUT, 0.9); circle(ctx, 7, 0, 1.3, '#e0283a');   // the gem brooch
  },

  cleric(ctx, st) {
    const robe = '#ece6d6', gold = '#e8c15a', blue = '#4a78c2', skin = '#7a4a2e';
    const cast = castAmt(st);
    feet(ctx, st, '#8a7a5a');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    // the stole down the back: blue edged in gold (the Aegis wears plain white with gold diamonds, the Inquisitor a red-orange stole)
    const aegis = HERO_SPEC === 'aegis', inq = HERO_SPEC === 'inquisitor';
    rrect(ctx, -12, -2.5, 20, 5, 2, aegis ? '#f8f2e0' : inq ? '#d8501c' : blue);
    rrect(ctx, -12, -2.5, 20, 5, 2, null, gold, 0.9);
    rrect(ctx, -9.5, -12.5, 4.6, 25, 2, aegis ? '#f8f2e0' : inq ? '#d8501c' : blue, OUT, 1.2);   // and over both shoulders
    rrect(ctx, -8.6, -11.8, 2.8, 23.6, 1.4, null, gold, 0.8);
    if (aegis) for (const x of [-9, -4, 1]) poly(ctx, [x, 0, x + 1.5, -1.4, x + 3, 0, x + 1.5, 1.4], gold);
    if (inq) { circle(ctx, -5, 0, 1.7, null, gold, 1); circle(ctx, -5, 0, 0.5, gold); }
    for (const sy of [-1, 1]) { ellipse(ctx, 0, 11.5 * sy, 5, 4, 0, gold, OUT, 1.3); circle(ctx, 0, 11.5 * sy, 1.7, '#f7de8a', OUT, 0.7); }   // gold sun pauldrons
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
    ctx.save(); ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(1, 0, 6.6, -2.1, 2.1); ctx.stroke(); ctx.restore();   // the hood's gold edge
    ellipse(ctx, 5.6, 0, 2.4, 4.2, 0, skin);
    for (const sy of [-1, 1]) ellipse(ctx, 4.2, 4.3 * sy, 2.2, 1.1, 0.5 * sy, '#c4c4c8');   // grey hair at the temples
    ellipse(ctx, 7.8, 0, 1.7, 3, 0, '#d4cfc6', OUT, 0.8);
    // halo
    glow(ctx, 1, 0, 16, '#ffe680', 0.25 + cast * 0.3);
    circle(ctx, 1, 0, 10.5 + Math.sin(st.t * 3) * 0.6, null, gold, 2);
  },

  // Grovekeeper: an old woman in a deep-green hooded cloak with a mantle of layered leaves, pale antlers rising from the
  // hood, a long silver braid with blossoms, a twisted ivy-wound staff. Lifebinder goes hoodless (silver hair, pink under-robe,
  // a crown of leaves and blossoms); Moonwell wears a blue hood banded in silver.
  grovekeeper(ctx, st) {
    const moon = HERO_SPEC === 'moonwell', life = HERO_SPEC === 'lifebinder';
    const robe = moon ? '#25368a' : '#2f5a2e', hoodC = moon ? '#2c3f96' : '#4b7d38', leaf = '#5fbf4a', leafD = '#3f8a34', bark = '#5a3d22', bone = '#e8e0c8', silver = '#dcdce2', skin = '#d8a874';
    const cast = castAmt(st);
    feet(ctx, st, '#3d2f1c');
    ellipse(ctx, -2, 0, 10.5, 14.5, 0, robe, OUT, 2);
    ellipse(ctx, -2, 0, 7, 11, 0, null, moon ? rgba('#c8d4f0', 0.55) : rgba(leaf, 0.5), 1.2);
    if (life) ellipse(ctx, 2.5, 0, 3.6, 8.5, 0, '#e8a0b8', OUT, 1);
    // the mantle: leaves layered over each shoulder (a plain heavy cloak for the Moonwell)
    for (const sy of [-1, 1]) {
      if (moon) { ellipse(ctx, -1, 12.2 * sy, 6.5, 4, 0.2 * sy, '#1e2c78', OUT, 1.4); ellipse(ctx, 0, 11.5 * sy, 3.6, 2, 0.2 * sy, '#32469c'); continue; }
      for (let i = 0; i < 4; i++) ellipse(ctx, -5 + i * 3.4, sy * (11.6 + (i % 2) * 1.1), 4.2, 2.2, sy * (0.55 - i * 0.2), i % 2 ? leaf : leafD, OUT, 0.9);
    }
    // gnarled staff, ivy wound round it
    const tx = 23 + cast * 3;
    limb(ctx, [-5, 13, 4, 14.5, 12, 11.5, tx - 2, 13], bark, 2.6);
    for (const [x, y, a] of [[1, 12.2, -0.5], [7, 13.6, 0.5], [13, 11.4, -0.4], [17, 12.6, 0.5]]) ellipse(ctx, x, y, 2.3, 1.1, a, leaf, OUT, 0.7);
    circle(ctx, 9.5, 12.6, 1.3, '#fff4f6', OUT, 0.6); circle(ctx, 9.5, 12.6, 0.5, '#f0b8c8');
    ellipse(ctx, tx - 3, 9, 4, 2, -0.6, leaf, OUT, 1);
    ellipse(ctx, tx - 3, 17, 4, 2, 0.6, leaf, OUT, 1);
    glow(ctx, tx, 13, 12 + cast * 8, moon ? '#a9c4ff' : '#8fff7a', 0.5 + cast * 0.4);
    circle(ctx, tx, 13, 3.4, moon ? '#dbe6ff' : '#b8ff9a', OUT, 1.2);
    hand(ctx, 7, 13, skin);
    hand(ctx, 8, -10, skin);
    // antlers, branching, pale as bone (the Lifebinder and Moonwell leave them off)
    if (!life && !moon) for (const sy of [-1, 1]) {
      limb(ctx, [-1, 4 * sy, -6, 11 * sy, -12, 13 * sy], bone, 2);
      limb(ctx, [-5, 9.5 * sy, -3, 15 * sy], bone, 1.8);
      limb(ctx, [-9, 12 * sy, -13, 17 * sy], bone, 1.6);
    }
    // a long silver braid over one shoulder, a blossom at its tie
    braid(ctx, -2, -5.5, -11, -9.5, silver, moon ? '#9aa4b8' : '#8a6a3a', 5);
    if (!moon) { circle(ctx, -9.5, -8.6, 1.5, '#fff4f6', OUT, 0.6); circle(ctx, -9.5, -8.6, 0.6, '#f0a8bc'); }
    // the head. Base: a mossy leaf-lined hood with silver hair at the face. Lifebinder: bare silver hair. Moonwell: a blue hood.
    if (life) {
      hairBack(ctx, silver, 8, 6.5);
      circle(ctx, 0.5, 0, 7.2, silver, OUT, 2);
      circle(ctx, -1.5, -2.2, 2.4, '#f2f2f6');
      ellipse(ctx, 5.2, 0, 2.5, 4.2, 0, skin);
      poly(ctx, [3.2, -3.6, 7, -1.4, 4, 0.2], silver);
    } else {
      circle(ctx, 0.5, 0, 7.4, hoodC, OUT, 2);
      circle(ctx, -1, -2, 2.4, shade(hoodC, 0.15));
      if (!moon) for (let i = 0; i < 5; i++) { const a = 2.3 + i * 0.45; ellipse(ctx, 0.5 + Math.cos(a) * 7.2, Math.sin(a) * 7.2, 2.4, 1.2, a, i % 2 ? leaf : leafD, OUT, 0.7); }
      ellipse(ctx, 5, 0, 2.3, 4, 0, skin);
      for (const sy of [-1, 1]) ellipse(ctx, 4.6, 3.9 * sy, 2.7, 1.3, 0.55 * sy, silver, OUT, 0.6);
    }
    if (!moon) for (const [fx, fy] of [[-2.5, 3.5], [1.5, -4.5], [-4.5, -1]]) { circle(ctx, fx, fy, 1.6, '#fff4f6', OUT, 0.6); circle(ctx, fx, fy, 0.6, '#f0b8c8'); }
    // drifting leaves (pale motes for the Moonwell)
    for (let i = 0; i < 3; i++) {
      const a = st.t * 0.9 + i * 2.1, r = 20 + Math.sin(st.t * 1.3 + i) * 4;
      if (moon) circle(ctx, Math.cos(a) * r, Math.sin(a) * r, 1.3, '#dbe6ff');
      else ellipse(ctx, Math.cos(a) * r, Math.sin(a) * r, 2.6, 1.3, a * 2, leaf, OUT, 0.8);
    }
  },

  chronomancer(ctx, st) {
    // the class is a deep teal coat with silver trim; the Accelerant's is red-brown with gold, the Echoist's navy with gold
    const acc = HERO_SPEC === 'accelerant', echo = HERO_SPEC === 'echoist';
    const robe = acc ? '#8a3624' : echo ? '#1d2a5e' : '#1c4560', trim = acc ? '#ffc94a' : echo ? '#8f86ff' : '#3fd0d0', silver = acc || echo ? '#d8b24a' : '#c8d4dc';
    const aura = acc ? '#ffd36a' : echo ? '#b49cff' : '#5ff0ff';
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
    // a star-compass brooch on the left shoulder, its chain looping to an hourglass medallion at the right hip
    ctx.save(); ctx.strokeStyle = silver; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-1, -12.5); ctx.quadraticCurveTo(15, 0, 1.5, 12); ctx.stroke(); ctx.restore();
    circle(ctx, -1, -12.5, 2.5, silver, OUT, 1); circle(ctx, -1, -12.5, 1, robe);
    circle(ctx, 1.5, 12, 3, silver, OUT, 1.1); poly(ctx, [0.2, 10.6, 2.8, 10.6, 1.5, 12, 2.8, 13.4, 0.2, 13.4, 1.5, 12], robe);
    // floating hourglass (brass caps)
    ctx.save(); ctx.translate(5, -21 + Math.sin(st.t * 2) * 1.5); ctx.rotate(Math.sin(st.t) * 0.3 + cast * Math.PI);
    poly(ctx, [-3.5, -5, 3.5, -5, 0, 0, 3.5, 5, -3.5, 5, 0, 0], rgba('#e8f4f8', 0.6), silver, 1.2);
    poly(ctx, [-2, 3.5, 2, 3.5, 0, 1], '#e8c15a');
    line(ctx, -4, -5, 4, -5, '#c8a24a', 1.7); line(ctx, -4, 5, 4, 5, '#c8a24a', 1.7);
    ctx.restore();
    for (const sy of [-1, 1]) {
      const hx = 8 + (sy > 0 ? cast * 5 : 0);
      glow(ctx, hx, 9.5 * sy, 7, aura, 0.35 + cast * 0.5);
      hand(ctx, hx, 9.5 * sy, '#f0d6c0');
    }
    // high silver-trimmed collar behind the head, long wavy chestnut hair, small round gold spectacles
    ellipse(ctx, -3.5, 0, 4, 10, 0, shade(robe, -0.2), OUT, 1.5);
    ellipse(ctx, -3.5, 0, 4, 10, 0, null, silver, 1);
    hairBack(ctx, '#80482a', acc ? 7 : 10, acc ? 7 : 6.5);
    if (acc) for (const sy of [-1, 1]) line(ctx, -9, 2.2 * sy, -14, 4 * sy, '#1a1418', 1.6);   // the black ribbon tying it back
    hairHead(ctx, '#80482a', '#f0d6c0', 7.6);
    if (acc) {
      // brass goggles pushed up on the brow, one great glass in them
      ctx.save(); ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0.5, 0, 6.6, -2.2, -0.2); ctx.stroke(); ctx.restore();
      circle(ctx, 2.2, -3.4, 2.7, '#c8a24a', OUT, 1); circle(ctx, 2.2, -3.4, 1.8, '#1f2a22'); circle(ctx, 1.6, -4, 0.6, 'rgba(255,255,255,0.7)');
    } else {
      for (const sy of [-1, 1]) circle(ctx, 6.6, 1.8 * sy, 1.15, null, '#e8c15a', 0.9);
      line(ctx, 6.6, -0.7, 6.6, 0.7, '#e8c15a', 0.8);
    }
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
    // plain scuffed steel, a gold border, studded with rivets, a gold fleur-cross down the face (as in the painting)
    rrect(ctx, -4.5, -17, 9, 34, 3, '#b4bfcd', OUT, 2);
    rrect(ctx, -2.8, -15, 5.6, 30, 1.8, null, '#e8c15a', 1.5);
    for (const [x, y] of [[-3.2, -15], [3.2, -15], [-3.2, 15], [3.2, 15], [-3.2, 0], [3.2, 0]]) circle(ctx, x, y, 0.8, '#e8c15a', OUT, 0.5);
    line(ctx, 0, -11, 0, 12, '#e8c15a', 1.5); line(ctx, -3, -4, 3, -4, '#e8c15a', 1.5);
    poly(ctx, [0, -14, 1.8, -10.5, 0, -8, -1.8, -10.5], '#e8c15a', OUT, 0.6);
    for (const sx of [-1, 1]) ellipse(ctx, 2.4 * sx, 0.5, 1.4, 0.8, sx * 0.7, '#e8c15a', OUT, 0.5);
    ctx.restore();
  },
  // Crusader: a gold tabard over the plate and a blade that glows with dawnlight
  crusader(ctx, st) {
    // (the gold cape, the white sun-tabard and the sun guard are drawn with the class art; here, dawnlight on the blade)
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
    // the horned circlet at the brow, a ruby in it
    ctx.save(); ctx.strokeStyle = '#8a7a56'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-1, 0, 8.6, -0.55, 0.55); ctx.stroke(); ctx.restore();
    poly(ctx, [6.6, 0, 7.6, -1.2, 8.6, 0, 7.6, 1.2], '#c0102a', OUT, 0.7);
    for (let i = 0; i < 3; i++) {
      const a = st.t * 1.4 + i * TAU / 3, x = Math.cos(a) * 25, y = Math.sin(a) * 23;
      glow(ctx, x, y, 8, '#ff2d4b', 0.45);
      circle(ctx, x, y, 3, '#c0102a', OUT, 1);
      circle(ctx, x - 0.8, y - 0.8, 0.9, '#ff9aa8');
    }
  },
  // Spellwarden: pale blue sigils on the robe (the rune ring is under them), the cloak's ice-blue border (see HERO_ART.runeguard),
  // a gold compass medallion with a diamond tassel at the chest, and the right palm held open and glowing blue
  spellwarden(ctx, st) {
    ellipse(ctx, -2, 0, 8, 12, 0, null, rgba('#9fd8ff', 0.7), 1.4);
    circle(ctx, 6.4, 0, 2.7, '#d8b04a', OUT, 1); circle(ctx, 6.4, 0, 1.2, '#7ab0ff');
    poly(ctx, [8.6, 0.2, 11, -0.8, 12.6, 0.4, 11, 1.8], '#d8b04a', OUT, 0.8);
    const k = Math.sin(st.t * 2) * 0.1;
    glow(ctx, 14, 10, 9, '#8fc8ff', 0.4);
    for (let i = -2; i <= 2; i++) line(ctx, 13, 10, 17.5, 10 + i * 2.1 + k, '#e0b890', 1.7);   // the open fingers
  },
  // Runeblade: the hood thrown back, tousled black hair and a clear face; a long silver rune-carved sword with a violet glowing
  // channel and a silver star crossguard, held in a black glove
  runeblade(ctx, st) {
    const s = swing(actP(st, 'attack'));
    ellipse(ctx, -4.5, 0, 4.4, 9, 0, '#4a2f8a', OUT, 1.5);   // the cloak gathered round the neck
    for (const sy of [-1, -0.35, 0.35, 1]) poly(ctx, [-3, 3.6 * sy - 1.6, -10.5, 6 * sy, -3, 3.6 * sy + 1.6], '#15131f', OUT, 1.1);
    hairHead(ctx, '#15131f', '#dcae86', 8.2);
    circle(ctx, -1.6, -2.3, 1.6, '#3a3556');
    ctx.save(); ctx.translate(9, 11); ctx.rotate(0.3 + s * 1.2);
    poly(ctx, [2, -2.8, 26, -2.8, 32, 0, 26, 2.8, 2, 2.8], '#cfd4e0', OUT, 1.5);
    line(ctx, 4, 0, 28, 0, '#9b7cf0', 1.8);
    for (let i = 0; i < 4; i++) circle(ctx, 9 + i * 5, 0, 0.9, '#efe6ff');
    glow(ctx, 17, 0, 13, '#a98bff', 0.32);
    poly(ctx, [-0.5, -1, 1.5, -6.5, 3.4, -1, 5, 0, 3.4, 1, 1.5, 6.5, -0.5, 1], '#b9c0cc', OUT, 1.1);   // the crossguard
    circle(ctx, 1.5, 0, 1.1, '#9b6cf0');
    rrect(ctx, -6, -1.4, 5.5, 2.8, 1, '#2a2438', OUT, 1);
    ctx.restore();
    hand(ctx, 9, 11, '#1c1a24');
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
  // Lifebinder: a crown of leaves with pink blossoms woven through the silver hair, a pink sash across the robe
  lifebinder(ctx) {
    line(ctx, -7, -9, 5, 8, '#e8a0b8', 2.4);
    for (let i = 0; i < 7; i++) { const a = -1.4 + i * 0.47; ellipse(ctx, Math.cos(a) * 8.5, Math.sin(a) * 8.5, 2.8, 1.3, a, i % 2 ? '#5fdf8a' : '#8fffb0', OUT, 0.6); }
    for (const [x, y] of [[-6, -6], [-6, 6], [3, -8], [6.5, 6.5]]) { circle(ctx, x, y, 2.3, '#f4a8c0', OUT, 0.7); circle(ctx, x, y, 0.8, '#fff4f6'); }
  },
  // Moonwell: a silver band stitched across the hood, a crescent brooch, a pale crescent moon floating behind the head
  moonwell(ctx, st) {
    ctx.save(); ctx.translate(-14, -10 + Math.sin(st.t * 1.5) * 1.2);
    glow(ctx, 0, 0, 10, '#a9c4ff', 0.45);
    ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.arc(1.8, -0.8, 3.8, 0, TAU, true); ctx.fill('evenodd');
    ctx.restore();
    ellipse(ctx, -2, 0, 8, 12, 0, null, rgba('#a9c4ff', 0.6), 1.2);
    ctx.save(); ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0.5, 0, 6.6, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = '#8a96b4'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(0.5, 0, 7.4, -1.2, 1.2); ctx.stroke(); ctx.restore();
    circle(ctx, 1.5, -11, 2.6, '#cfd6e6', OUT, 0.9);
    ctx.fillStyle = '#25368a'; ctx.beginPath(); ctx.arc(1.5, -11, 1.5, 0, TAU); ctx.arc(2.3, -11.4, 1.3, 0, TAU, true); ctx.fill('evenodd');
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
    poly(ctx, [46, -2.4, 51, 0, 46, 2.4], '#e8c15a', OUT, 0.8);   // a gold broadhead at the end of the aim line
    glow(ctx, 6, -2, 5, '#fff2c0', 0.6); circle(ctx, 6, -2, 1.4, '#fff8e0');
    rrect(ctx, 3.6, 6.4, 3.4, 5.4, 1, '#d8b04a', OUT, 0.9);   // a heavy gold bracer on the draw arm
  },
  // Venomstrike: the dark-green cloak's deep hood up over the auburn hair (a sliver of face under it), green-dripping
  // arrowheads in the quiver, a haze of acid bubbles
  venomstrike(ctx, st) {
    for (let i = 0; i < 3; i++) { const x = -12 + i * 2.5, y = -9 + i * 2; poly(ctx, [x, y - 3, x + 2, y, x, y + 3, x - 2, y], '#9aff4a', OUT, 0.8); }
    glow(ctx, -10, -5, 9, '#7adf3a', 0.3 + Math.sin(st.t * 3) * 0.08);
    // the hood, over everything above the shoulders: a lighter green rim at the front, the face a sliver within it
    ellipse(ctx, -2.5, 0, 9.4, 10.2, 0, '#1f3a26', OUT, 1.8);
    ellipse(ctx, -4.5, -3, 3.6, 2.4, 0, '#2c5234');
    ellipse(ctx, 5.2, 0, 2.6, 4.2, 0, '#b97a4c');
    ellipse(ctx, 3.6, 0, 1.5, 4.6, 0, '#a8401c');
    poly(ctx, [3.6, -3.4, 6.6, -1.3, 3.8, 0.4], '#a8401c');
    ctx.strokeStyle = '#3a6a42'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-0.2, 0, 8.3, -1.05, 1.05); ctx.stroke();
    circle(ctx, 4, 8.6, 1.5, '#d8b04a', OUT, 0.7);   // a brass clasp at the throat
    for (let i = 0; i < 3; i++) { const q = (st.t * 0.55 + i / 3) % 1; ctx.save(); ctx.globalAlpha = Math.sin(q * Math.PI) * 0.85; circle(ctx, -9 - q * 5 + i * 2, -9 - q * 9, 1.1 + (i % 2) * 0.5, '#b8ff5a', OUT, 0.5); ctx.restore(); }
  },
  // Bladedancer: two curved silver blades (see HERO_ART.shadowblade), silver bracers, and a swirl of silver light and violet ribbon
  // winding round them
  bladedancer(ctx, st) {
    const s = swing(actP(st, 'attack'));
    ctx.save(); ctx.translate(8, -10); ctx.rotate(-0.5 - s * 1.4);
    ctx.strokeStyle = '#e8ecff'; ctx.lineWidth = 2.4; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(0, 0, 14, -0.2, 1.1); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(8, 10); ctx.rotate(0.5 + s * 1.4);
    ctx.strokeStyle = '#e8ecff'; ctx.lineWidth = 2.4; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(0, 0, 14, -1.1, 0.2); ctx.stroke();
    ctx.restore();
    glow(ctx, 0, 0, 22, '#e0c8ff', 0.15);
    for (let i = 0; i < 3; i++) { const a = st.t * 2 + i * TAU / 3; glow(ctx, 8 + Math.cos(a) * 12, Math.sin(a) * 15, 3, '#f4eaff', 0.55); }
  },
  // Nightstalker: a black cloak lined in red over the shoulders, the hood pulled low (a red rim)
  nightstalker(ctx) {
    poly(ctx, [-2, -12, -13, -15, -22, -7, -17, -2, -23, 5, -14, 15, -2, 12], '#0e0c12', OUT, 1.8);
    poly(ctx, [-4, -9, -12, -11, -18, -6, -14, -1, -18, 4, -12, 11, -4, 9], '#6a1424');
    ellipse(ctx, -1.5, 0, 9, 9.5, 0, '#141118', OUT, 1.6);
    ctx.strokeStyle = '#b0203a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-0.5, 0, 7.6, -1.1, 1.1); ctx.stroke();
    ellipse(ctx, 5.8, 0, 2, 3.6, 0, '#dcb496');
    ellipse(ctx, 4.6, 0, 1.4, 4, 0, '#1a1720');
    poly(ctx, [4.6, -2.2, 7, -0.6, 4.6, 0.9], '#1a1720');
  },
  // Cataclysm: a small burning rock orbiting overhead, trailing smoke
  cataclysm(ctx, st) {
    // red gem clasps on the cloak, a grey curl of smoke off the hat tip, and a burning rock orbiting, a flame trailing it
    for (const sy of [-1, 1]) { circle(ctx, 1.5, 11 * sy, 1.9, '#f2c84b', OUT, 0.8); circle(ctx, 1.5, 11 * sy, 1, '#e0283a'); }
    for (let i = 0; i < 3; i++) {
      const q = (st.t * 0.6 + i / 3) % 1;
      ctx.save(); ctx.globalAlpha = (1 - q) * 0.5; circle(ctx, -15 - q * 8 + Math.sin(q * 7 + i) * 2, 6 + q * 3, 1.8 + q * 2.6, '#9a8f8c'); ctx.restore();
    }
    const a = st.t * 1.6, x = Math.cos(a) * 20, y = Math.sin(a) * 18;
    glow(ctx, x, y, 10, '#ff4a2a', 0.5);
    for (let i = 1; i <= 3; i++) { const b = a - i * 0.22; glow(ctx, Math.cos(b) * 20, Math.sin(b) * 18, 5 - i, '#ff8a2a', 0.45 / i); }
    poly(ctx, [x - 4, y - 1, x - 1.5, y - 3.8, x + 3, y - 2.6, x + 4, y + 1, x + 1, y + 3.8, x - 3, y + 2.6], '#3a2420', OUT, 1);
    circle(ctx, x - 1, y - 1, 1.2, '#ffb050');
    circle(ctx, x + 1.5, y + 1.4, 0.7, '#ff7a2a');
  },
  // Sigilmancer: a wide band of burning sigils turning round the whole figure, and a second flame lit in the open left hand
  sigilmancer(ctx, st) {
    ctx.save(); ctx.translate(3, 0); ctx.rotate(st.t * 0.9); ctx.scale(1, 0.84);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    circle(ctx, 0, 0, 20, null, rgba('#ff9a2a', 0.5), 2.6); circle(ctx, 0, 0, 20, null, rgba('#ffe08a', 0.8), 0.9); circle(ctx, 0, 0, 15.5, null, rgba('#ff9a2a', 0.4), 0.9);
    ctx.restore();
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6, x = Math.cos(a) * 17.8, y = Math.sin(a) * 17.8;
      glow(ctx, x, y, 4.6, '#ffcf7a', 0.65);
      poly(ctx, [x, y - 2.8, x + 1, y - 1, x + 2.8, y, x + 1, y + 1, x, y + 2.8, x - 1, y + 1, x - 2.8, y, x - 1, y - 1], '#fff0b0');
    }
    ctx.restore();
    flame(ctx, 14, -10, 2.8 + castAmt(st) * 1.8, st.t + 1);
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
  const coat = '#4f5a38', apron = '#d9cdaa', copper = '#b8743a', skin = '#d9a276', hair = '#a8401f', brass = '#d8a84a';
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
  // the apron is cream and well used: red and brown stains
  circle(ctx, -1.5, 3, 1.7, 'rgba(150,50,40,0.5)'); circle(ctx, 2, -3.5, 1.2, 'rgba(120,70,40,0.45)'); circle(ctx, -3, -2, 0.9, 'rgba(150,50,40,0.4)'); circle(ctx, 3.2, 5, 0.9, 'rgba(120,70,40,0.45)');
  // the green work-coat's open collar, turned back at each shoulder
  for (const sy of [-1, 1]) poly(ctx, [-3, 6.5 * sy, 3.5, 9.5 * sy, 5.5, 7 * sy, 1, 4.5 * sy], coat, OUT, 1.1);
  // the bandolier, slung over one shoulder and round the front of the coat, with three vials in its loops (red, blue, clear)
  const strap = q => ({ x: -2 + Math.sin(q * Math.PI) * 11.5, y: -13 + q * 25 });
  ctx.beginPath(); for (let q = 0; q <= 1.001; q += 0.1) { const p = strap(q); ctx.lineTo(p.x, p.y); }
  ctx.lineCap = 'round'; ctx.lineWidth = 4.6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4424'; ctx.stroke();
  const vials = ['#d8344a', '#3a5ee0', '#e8f0f4'];
  vials.forEach((col, i) => { const p = strap(0.3 + i * 0.2); rrect(ctx, p.x - 1.9, p.y - 2.5, 3.8, 5, 1.2, col, OUT, 1); circle(ctx, p.x + 1.9, p.y, 0.9, '#9a6a3a'); });
  // hands: the left on the strap, the right holding a vial out (further on a throw)
  hand(ctx, 7, -10, '#6b4a30');
  const vx = 9 + cast * 8, vy = 11 - cast * 4;
  // (a round flask of amber, as in the painting)
  glow(ctx, vx + 3.6, vy, 6 + cast * 5, '#ffc040', 0.25 + cast * 0.4);
  rrect(ctx, vx + 4.4, vy - 1.1, 3.4, 2.2, 0.8, '#d8e8ec', OUT, 0.9);
  circle(ctx, vx + 3.6, vy, 3.1, '#f0b830', OUT, 1.1); circle(ctx, vx + 2.8, vy - 1, 0.9, 'rgba(255,255,255,0.7)');
  hand(ctx, vx, vy, '#6b4a30');
  // the bun with a glass rod through it, then the head, then the goggles
  circle(ctx, -7.5, 0, 4.4, hair, OUT, 1.5); circle(ctx, -8.4, -1.2, 1.6, shade(hair, 0.18));
  line(ctx, -10, -5, -5, 5, '#cfe8ee', 1.4);
  hairHead(ctx, hair, skin, 7.4);
  // the goggles: pushed up on the brow (dark lenses) normally, over her eyes in orange glass (Volatile), hung round her neck (Apothecary)
  const eyes = HERO_SPEC === 'volatile', neck = HERO_SPEC === 'apothecary';
  ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 1.6; ctx.beginPath();
  if (eyes) ctx.arc(0.5, 0, 7.2, -1.25, 1.25);
  else if (!neck) { ctx.arc(0.5, 0, 7.2, 0.25, 1.9); ctx.moveTo(0.5 + Math.cos(-1.9) * 7.2, Math.sin(-1.9) * 7.2); ctx.arc(0.5, 0, 7.2, -1.9, -0.25); }
  ctx.stroke();
  const gx = eyes ? 6 : neck ? 9.8 : 2.4;
  for (const sy of [-1, 1]) {
    circle(ctx, gx, 2.5 * sy, 2.3, eyes ? '#ffb070' : '#2a2c30', OUT, 1);
    circle(ctx, gx, 2.5 * sy, 2.3, null, brass, 1);
    circle(ctx, gx - 0.6, 2.5 * sy - 0.8, 0.7, 'rgba(255,255,255,0.8)');
  }
  if (neck) {
    // a few small white flowers and a sprig of green tucked in her hair
    circle(ctx, -1.5, -7.2, 1.2, '#f6f2e4', OUT, 0.6); circle(ctx, 1, -7.8, 1, '#f6f2e4', OUT, 0.6); circle(ctx, -1.5, -7.2, 0.45, '#e8c040');
    ellipse(ctx, -4, -7.6, 2, 0.9, 0.5, '#6f9a4a', OUT, 0.6);
  }
};
// Apothecary: a second strap of vials crossing the first, dried herbs bundled on the still, a label tag
SPEC_ART.apothecary = function (ctx, st) {
  // a big brown satchel of labelled jars and herbs at the hip, lavender and leaves sprouting from it
  for (const [x, h, col] of [[-6.5, 7, '#9a7ac8'], [-4.5, 9, '#8a6ab8'], [-2.5, 7.5, '#a888d4']]) { line(ctx, x, -17, x - 0.5, -17 - h, '#5f8a3a', 1); circle(ctx, x - 0.5, -17 - h, 1.1, col); circle(ctx, x - 0.7, -17 - h * 0.7, 0.9, col); }
  for (const [x, a] of [[-0.5, -0.9], [-8.5, -2.3]]) ellipse(ctx, x, -19.5, 3.4, 1.2, a, '#6f9a4a', OUT, 0.6);
  rrect(ctx, -10, -20, 14, 8, 2, '#7a4a2a', OUT, 1.4);
  line(ctx, -10, -17, 4, -17, 'rgba(30,16,8,0.5)', 1);
  rrect(ctx, -4.2, -18.2, 3.2, 3.6, 0.6, '#d8a84a', OUT, 0.8);
  for (const [x, col] of [[-8, '#7ff0a8'], [-5.5, '#bfe8ec'], [2, '#ffd23a']]) { circle(ctx, x, -20.4, 1.2, col, OUT, 0.7); }
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
  // the held flask is the bomb: a lit fuse on its neck, sparks spitting off it
  const c = castAmt(st), fx = 9 + c * 8 + 7.6, fy = 11 - c * 4;
  line(ctx, fx - 0.5, fy, fx + 2.8, fy - 2, '#d8c8a8', 0.9);
  glow(ctx, fx + 2.8, fy - 2, 5 + Math.sin(st.t * 30), '#ffd070', 0.9);
  for (let i = 0; i < 3; i++) { const q = (st.t * 2.6 + i / 3) % 1, a = -0.9 + i * 0.9; circle(ctx, fx + 2.8 + Math.cos(a) * q * 7, fy - 2 + Math.sin(a) * q * 7, 0.9 * (1 - q) + 0.2, '#ffe08a'); }
  glow(ctx, 0, 0, 22, '#ff8a2a', 0.1 + Math.sin(st.t * 5) * 0.03);
};

// the spec of the hero being drawn right now, for the few class looks a spec changes underneath (the Berserker's helm)
let HERO_SPEC = null;
// ---- Body language (all cosmetic, all read off the anim state, so you, friends and bots move alike) ----
//  st.spd / st.stride / st.walkK: how fast the hero really moves on screen, a stride phase that runs with it, and how
//    much of the walk shows (heroMotion keeps them; legs, bob and lean follow)
//  st.hurt = { t0, k, ax, ay }: a hit landed (k 0..1 strength, (ax, ay) away from what hit them): a flash and a recoil
//  st.dashT: the last moment of a dash (fx.js dashTrail): lean into it, then a settle on arrival
//  st.react = { kind: 'cheer' | 'slump', t0 }: the end of a fight
// A hero can also be drawn into a picture of its own (heroSprite): the hit flash, the downed body and the dash
// afterimages are one image each, never a stack of see-through shapes.
const HERO_BOX = 150;   // local units round a hero that its picture holds (room for a raised weapon or a staff)
let _heroScratch = null;
const heroCanvas = () => (typeof document === 'undefined' ? null : document.createElement('canvas'));
function heroMotion(st, x, y) {
  const t = st.t;
  if (st._mt === t) return;
  if (st.stride == null) { st.stride = 0; st.walkK = st.moving ? 1 : 0; st.spd = 0; }
  const dt = st._mt == null ? 0 : t - st._mt;
  if (dt > 0 && dt < 0.25 && st._mx != null) {
    const v = Math.min(900, Math.hypot(x - st._mx, y - st._my) / dt);
    st.spd += (v - st.spd) * Math.min(1, dt * 14);
    // stride speed follows the real speed (a slowed walk takes slower steps); standing still in a preview still steps
    const rate = st.moving ? (st.spd > 25 ? clamp(st.spd / 230, 0.6, 1.5) : 1) : 0;
    st.stride += dt * 12 * rate;
    st.walkK += ((st.moving ? 1 : 0) - st.walkK) * Math.min(1, dt * 12);
  }
  st._mt = t; st._mx = x; st._my = y;
}
const NO_POSE = { fwd: 0, tw: 0, sx: 1, sy: 1, wave: 0 };
// what the body is doing on top of its class animation: offsets in local units (oy up the screen, fwd along the facing)
function heroPose(st, emote) {
  const t = st.t, P = { oy: 0, hop: 0, fwd: 0, tw: 0, sx: 1, sy: 1, hx: 0, hy: 0, flash: 0, wave: 0, shadow: 0 };
  const wk = st.walkK || 0;
  if (wk > 0.01) {
    // a bob on every step, a slight lean into the walk (more the faster it goes) and a sway of the shoulders
    const ph = st.stride || 0, rate = clamp((st.spd || 230) / 230, 0.6, 1.5);
    P.oy -= Math.abs(Math.sin(ph)) * 1.4 * wk;
    P.fwd += 1.3 * wk * Math.min(1.2, rate);
    P.tw += Math.sin(ph) * 0.05 * wk;
  }
  if (st.dashT != null) {
    const a = t - st.dashT;
    if (a >= 0 && a < 0.4) {
      // leaning hard into the dash and stretched along it; on arrival it lets go and settles back with a little give
      const q = Math.max(0, (a - 0.05) / 0.32), rel = a < 0.05 ? 1 : Math.max(0, 1 - q / 0.25), s = q > 0 ? Math.sin(Math.min(1, q) * Math.PI) * (1 - Math.min(1, q)) : 0;
      P.fwd += 4 * rel - 2.2 * s; P.sx *= 1 + 0.1 * rel - 0.06 * s; P.sy *= 1 - 0.1 * rel + 0.05 * s;
    }
  }
  const h = st.hurt;
  if (h) {
    const a = t - h.t0;
    if (a >= 0.32 || a < -0.05) st.hurt = null;
    else if (a >= 0) {
      // knocked back 2-3 px from the blow and eased home; a white flash for the first beat
      const r = a < 0.04 ? a / 0.04 : 1 - easeOut((a - 0.04) / 0.28);
      P.hx = h.ax * h.k * 3 * r; P.hy = h.ay * h.k * 3 * r;
      P.flash = a < 0.13 ? (0.3 + 0.4 * h.k) * (1 - a / 0.13) : 0;
      P.sy *= 1 - 0.05 * h.k * r;
    }
  }
  const rc = st.react;
  if (rc) {
    const a = t - rc.t0;
    if (rc.kind === 'cheer') {
      if (a > 1.5) st.react = null;
      else if (a > 0) {
        // two hops, the second smaller, with a squash as they land
        const hop = a < 0.45 ? Math.sin(a / 0.45 * Math.PI) * 9 : a < 0.8 ? Math.sin((a - 0.45) / 0.35 * Math.PI) * 4.5 : 0;
        P.hop += hop;
        const land = a > 0.42 && a < 0.55 ? Math.sin((a - 0.42) / 0.13 * Math.PI) : a > 0.78 && a < 0.92 ? Math.sin((a - 0.78) / 0.14 * Math.PI) * 0.6 : 0;
        P.sx *= 1 + 0.06 * land; P.sy *= 1 - 0.08 * land;
      }
    } else if (rc.kind === 'slump') {
      if (a > 2.6) st.react = null;
      else if (a > 0) {
        // head down and sinking to a knee, then slowly back up
        const k = a < 0.5 ? easeOut(a / 0.5) : a > 2.0 ? 1 - easeOut((a - 2.0) / 0.6) : 1;
        P.oy += 3 * k; P.fwd += 2.6 * k; P.sx *= 1 - 0.05 * k; P.sy *= 1 - 0.09 * k; P.tw -= 0.08 * k;
      }
    }
  }
  st.sitK = 0;
  if (emote && emote.k > 0.001) {
    const k = emote.k, et = emote.t;
    switch (emote.kind) {
      case 'sit': st.sitK = k; P.oy += 3 * k; P.fwd -= 2.5 * k; P.sy *= 1 - 0.04 * k; P.shadow += 3 * k; break;
      case 'wave': P.wave = k; P.tw += Math.sin(et * 8) * 0.04 * k; break;
      case 'cheer': P.hop += Math.abs(Math.sin(et * 6.5)) * 7 * k; break;
      case 'dance': P.tw += Math.sin(et * 9) * 0.32 * k; P.hop += Math.abs(Math.sin(et * 9)) * 3 * k; P.fwd += Math.sin(et * 4.5) * 1.5 * k; break;
      case 'bow': {
        const b = (et < 0.35 ? easeOut(et / 0.35) : et < 1.4 ? 1 : Math.max(0, 1 - easeOut((et - 1.4) / 0.45))) * k;
        P.fwd += 3.5 * b; P.sx *= 1 - 0.06 * b; P.sy *= 1 - 0.03 * b; P.oy += 1.5 * b;
        break;
      }
      case 'laugh': P.oy += Math.sin(et * 22) * k; P.tw += Math.sin(et * 11) * 0.05 * k; break;
      case 'point': P.fwd += 2 * k; break;
    }
  }
  return P;
}
// a raised hand waving beside the head (the wave emote), in the hero's local space
function waveHand(ctx, t, k) {
  const hx = 4 + Math.sin(t * 12) * 3.5, hy = -15 - k * 2;
  ctx.save(); ctx.globalAlpha *= Math.min(1, k * 1.5);
  limb(ctx, [0, -9, hx, hy], '#d9b490', 2.4);
  circle(ctx, hx, hy, 3.2, '#ecc8a2', OUT, 1.3);
  ctx.strokeStyle = 'rgba(255,248,230,0.6)'; ctx.lineWidth = 1; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx, hy, 6.5, -Math.PI / 2 + s * 0.6 - 0.35, -Math.PI / 2 + s * 0.6 + 0.35); ctx.stroke(); }
  ctx.restore();
}
// the hero itself, in its local space (no shadow, ring or ground marks): what heroSprite takes a picture of
function heroBody(ctx, cls, angle, st, opts, P) {
  HERO_SPEC = opts.spec || null;
  const big = pulse(actP(st, 'big'));
  if (cls && big > 0) glow(ctx, 0, 0, 36, cls.accent, big * 0.6);
  ctx.rotate(angle);
  const body = attackBody(st);
  ctx.translate(body.lunge + P.fwd, 0); ctx.rotate(body.twist + P.tw);
  const br = (1 + Math.sin((st.t + (st.phase || 0)) * 2.5) * 0.02) * (1 + big * 0.06);
  ctx.scale(br * P.sx, br * P.sy);
  (cls ? HERO_ART[cls.id] || HERO_ART.cleric : HERO_ART.wisp)(ctx, st);   // (a class not drawn yet borrows the Cleric's figure)
  if (cls && opts.spec && SPEC_ART[opts.spec]) SPEC_ART[opts.spec](ctx, st);
  if (cls) drawChannelFocus(ctx, cls, st, cls ? channelP(st) : -1);
  if (P.wave > 0) waveHand(ctx, st.t, P.wave);
}
// The hero drawn into a canvas of its own at the resolution it's about to be shown at (read off ctx's transform,
// which must already hold the hero's scale). into: a canvas to keep (else a shared scratch one, good until the next call).
function heroSprite(ctx, cls, angle, st, opts, P, into) {
  const cv = into || _heroScratch || (_heroScratch = heroCanvas());
  if (!cv) return null;
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 }, px = clamp(Math.hypot(m.a, m.b) || 1, 0.5, 5);
  const S = Math.ceil(HERO_BOX * px);
  if (cv.width !== S || cv.height !== S) { cv.width = S; cv.height = S; }
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, S, S);
  c.setTransform(S / HERO_BOX, 0, 0, S / HERO_BOX, S / 2, S / 2);
  heroBody(c, cls, angle, st, opts || {}, P || NO_POSE);
  c.setTransform(1, 0, 0, 1, 0, 0);
  return cv;
}
const blitHero = (ctx, cv) => ctx.drawImage(cv, -HERO_BOX / 2, -HERO_BOX / 2, HERO_BOX, HERO_BOX);
// one still picture of a hero in a fresh anim state (the dash afterimages): ctx must hold the scale it's shown at
function heroSnapshot(ctx, cls, angle, st, opts, into) {
  return heroSprite(ctx, cls, angle, st, opts, heroPose(st, null), into || heroCanvas());
}

// cls may be null (wisp). opts: { ring, ringColor (the player's party colour; the role's without one), noShadow, lift, spec,
// emote: { kind, t, k } (pastimes.js emoteLook) }
function drawHero(ctx, cls, x, y, angle, st, scale = 1, opts = {}) {
  HERO_SPEC = opts.spec || null;
  heroMotion(st, x, y);
  const P = heroPose(st, opts.emote);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const lift = (opts.lift || 0) + P.hop;
  if (!opts.noShadow) ellipse(ctx, 2, 5, 16 - lift * 0.15 + P.shadow, 12 - lift * 0.12 + P.shadow * 0.5, 0, 'rgba(0,0,0,0.28)');
  if (cls && opts.ring !== false) ellipse(ctx, 0, 2, 19, 15, 0, null, rgba(opts.ringColor || ROLES[cls.role].color, 0.85), 2);
  const chP = cls ? channelP(st) : -1;
  if (chP >= 0) drawChannelGround(ctx, cls, st, chP);
  if (opts.spec && SPEC_GROUND[opts.spec]) SPEC_GROUND[opts.spec](ctx, st);
  if (cls && HERO_TRAIL[cls.id]) HERO_TRAIL[cls.id](ctx, x, y, st, scale, opts.spec);   // world-space trails (the Driftblade's wind)
  ctx.translate(P.hx / scale, P.hy / scale - lift + P.oy);
  const cv = P.flash > 0.02 && cls ? heroSprite(ctx, cls, angle, st, opts, P) : null;
  if (cv) {
    // the hit flash: the hero's own picture washed white (a whole-hero overlay would whiten the floor round it)
    const c = cv.getContext('2d');
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = P.flash; c.fillStyle = '#ffffff'; c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    blitHero(ctx, cv);
  } else heroBody(ctx, cls, angle, st, opts, P);
  ctx.restore();
  HERO_SPEC = null;
}

// A downed hero's picture: taken once as they fall, washed grey and cold. null where there's no canvas.
function heroDownSprite(ctx, cls, angle, opts) {
  const base = heroSprite(ctx, cls, angle, { t: 0, moving: false, action: null, phase: 0 }, opts, NO_POSE);
  const cv = base && heroCanvas();
  if (!cv) return null;
  cv.width = base.width; cv.height = base.height;
  const c = cv.getContext('2d');
  c.drawImage(base, 0, 0);
  c.globalCompositeOperation = 'saturation'; c.fillStyle = 'rgba(128,128,128,0.85)'; c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'destination-in'; c.drawImage(base, 0, 0);   // (back to the hero's own outline)
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(52,76,124,0.28)'; c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'source-over';
  return cv;
}
// A hero going down (k 0 -> 1) or getting up (1 -> 0): img (their picture, at the scale ctx will hold) tipped over
// onto the floor, falling backward from where they faced, with a soft shadow; their ring (ringColor, as drawHero) goes to a
// muted dashed one.
function drawHeroDown(ctx, cls, x, y, angle, scale, k, img, ringColor) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  const fa = angle + Math.PI, fx = Math.cos(fa), fy = Math.sin(fa);
  ellipse(ctx, 2 + fx * 7 * k, 5 + fy * 5 * k, 16 + 7 * k, 12 - 2 * k, fa * k, 'rgba(0,0,0,' + (0.28 + 0.06 * k).toFixed(3) + ')');
  if (cls) {
    if (k < 0.99) ellipse(ctx, 0, 2, 19, 15, 0, null, rgba(ringColor || ROLES[cls.role].color, 0.85 * (1 - k)), 2);
    ctx.setLineDash([4, 5]);
    ellipse(ctx, 0, 2, 19, 15, 0, null, rgba('#9c98a8', 0.5 * k), 1.5);
    ctx.setLineDash([]);
  }
  if (img) {
    ctx.translate(fx * 7 * k, fy * 6 * k + 2 * k);
    ctx.rotate(1.4 * k);                              // tipped over (about 80 degrees)...
    ctx.scale(1 + 0.04 * k, 1 - 0.1 * k);             // ...and slumped flat
    ctx.globalAlpha *= 1 - 0.12 * k;
    blitHero(ctx, img);
  }
  ctx.restore();
}

// The status layer over a hero (local, cheap, persistent while it lasts): a shell for a shield or a defensive, a mote
// per chosen-ally buff, Slowed (cold haze, chevrons sinking), Damage Down (a grey-red arrow), Vulnerability (a pulsing
// cracked red rim), and drips for a bleed (red) or venom (green). s: the party state; buffs: [ALLY_BUFFS id].
const STATUS_BUFF_COLOR = { quickened: '#5ff0ff', blessed: '#ffe680', wildheart: '#8fff7a', galvanized: '#ffb35a' };
function drawHeroStatus(ctx, x, y, scale, cls, s, buffs, t) {
  const deb = s.debuffs || [], has = k => deb.some(d => d[0] === k);
  const slowed = has('slowed'), bleed = has('bleed'), venom = has('laden');
  if (!(s.shield > 0.5 || s.mit > 0 || s.dd || s.vuln || buffs.length || slowed || bleed || venom)) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  if (slowed) {
    glow(ctx, 0, -2, 26, '#5a8fd8', 0.2);
    for (let i = 0; i < 2; i++) {
      const q = (t * 0.9 + i * 0.5) % 1, sx = i ? 17 : -17, cy = -10 + q * 9;
      ctx.globalAlpha = Math.sin(q * Math.PI) * 0.85;
      ctx.strokeStyle = '#a8d8ff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(sx - 3, cy - 2); ctx.lineTo(sx, cy + 1); ctx.lineTo(sx + 3, cy - 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (s.shield > 0.5 || s.mit > 0) {
    // the shell: a faint dome round the body with a highlight turning on it (pale for a shield, the class colour for a defensive)
    const col = s.shield > 0.5 ? '#dcecff' : (cls && cls.accent) || '#dcecff', a0 = t * 1.7;
    ellipse(ctx, 0, -1, 21, 22, 0, rgba(col, 0.06), rgba(col, 0.3), 1.3);
    ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -1, 21, 22, 0, a0, a0 + 0.9); ctx.stroke();
  }
  if (s.vuln) {
    const pz = 0.5 + 0.5 * Math.sin(t * 6), col = rgba('#ff3a2a', 0.3 + 0.35 * pz);
    ellipse(ctx, 0, 1, 19.5, 17, 0, null, col, 1.5);
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.lineJoin = 'miter';
    for (const a of [-0.7, 1.9, 3.6]) {
      const c = Math.cos(a), sn = Math.sin(a), nx = -sn, ny = c;
      ctx.beginPath(); ctx.moveTo(c * 19.5, 1 + sn * 17);
      ctx.lineTo(c * 22.5 + nx * 1.6, 1 + sn * 19.5 + ny * 1.6); ctx.lineTo(c * 24.5 - nx * 1.2, 1 + sn * 21.5 - ny * 1.2); ctx.stroke();
    }
  }
  if (s.dd) {
    const q = (t * 0.8) % 1, ay = -21 + q * 5;
    glow(ctx, -17, ay, 9, '#a85a5a', 0.3 * Math.sin(q * Math.PI));
    ctx.globalAlpha = 0.35 + 0.55 * Math.sin(q * Math.PI);
    poly(ctx, [-19, ay - 4, -15, ay - 4, -15, ay, -12.5, ay, -17, ay + 4.5, -21.5, ay, -19, ay], '#c47070', 'rgba(20,10,12,0.9)', 1.1);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < buffs.length; i++) {
    // a mote per buff circling the waist; dimmer while it passes behind
    const a = t * 2.1 + i * TAU / buffs.length, mx = Math.cos(a) * 21, my = -4 + Math.sin(a) * 11, back = Math.sin(a) < 0;
    const col = STATUS_BUFF_COLOR[buffs[i]] || '#fff2c8';
    glow(ctx, mx, my, 7, col, back ? 0.3 : 0.75);
    circle(ctx, mx, my, 1.7, rgba(col, back ? 0.45 : 1));
  }
  for (const [on, col] of [[bleed, '#d0242a'], [venom, '#6ad04a']]) {
    if (!on) continue;
    for (let i = 0; i < 3; i++) {
      const q = (t * 1.1 + i * 0.37) % 1, dx = [-8, 7, -1][i], dy = -8 + q * q * 20, r = 1.8 - q * 0.6;
      ctx.globalAlpha = Math.sin(q * Math.PI) * 0.9;
      poly(ctx, [dx, dy - r * 2.2, dx + r, dy, dx - r, dy], col);
      circle(ctx, dx, dy, r, col);
    }
    ctx.globalAlpha = 1;
  }
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
    // a blue and a red tassel hang at the chest on gold caps; a brass clock collar rings the neck under the silver hair
    for (const [ty, col] of [[-3.6, '#3a6fd0'], [3.6, '#d8402a']]) { line(ctx, 6.5, ty, 9.4, ty * 1.15, col, 2.2); circle(ctx, 6.2, ty, 1.2, '#d8b04a', OUT, 0.7); }
    circle(ctx, 0.3, 0, 8.6, '#b8903a', OUT, 1.3); circle(ctx, 0.3, 0, 8.6, null, '#e0c068', 0.8);
    hairHead(ctx, hair, skin, 7.4);
    for (const [ty, col] of [[-6.4, '#3a6fd0'], [6.4, '#d8402a']]) { circle(ctx, 1.6, ty, 1.1, '#d8b04a', OUT, 0.6); line(ctx, 1.6, ty, 1.2, ty * 1.28, col, 1.6); }   // the tassels on the hair ties
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
    const coat = '#2f4580', sash = '#4cbf98', skin = '#d49a6a', hair = '#12151e';
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
    line(ctx, -6, -9, 3, 10, sash, 3.2);
    // grey-gold cloud embroidery on the shoulders and a pale trim along the collar
    ctx.save(); ctx.strokeStyle = '#b0a07a'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(-1, 9.5 * sy, 2.4, 0.4, 4.6); ctx.stroke(); ctx.beginPath(); ctx.arc(2.6, 8.4 * sy, 1.3, 0, 5); ctx.stroke(); }
    ctx.restore();
    // off hand back for balance (forward to steady the blade while bracing)
    hand(ctx, 2 + brace * 9, -11 + brace * 4, skin);
    // the sabre: held low and back, swept across on attacks, held flat across the front to parry
    const rot = brace > 0 ? -1.35 * brace + 0.5 * (1 - brace) : 0.5 + s * 1.25 * sd;
    ctx.save(); ctx.translate(9 + brace * 4, 10 - brace * 4); ctx.rotate(rot);
    ctx.fillStyle = '#e4ecf2'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(2, -1.6); ctx.quadraticCurveTo(15, -3.2, 27, -6.5); ctx.quadraticCurveTo(16, 0.5, 2, 1.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    line(ctx, 4, -0.4, 22, -4.2, '#ffffff', 0.8);
    circle(ctx, 1, 0, 3.3, '#c8a24a', OUT, 1); circle(ctx, 1, 0, 1.2, '#2a2418');   // the round gold guard
    line(ctx, -1, 1.5, -6, 4.5, '#2f8a68', 0.9); circle(ctx, -4, 3.6, 1, '#3a9a78', OUT, 0.6); circle(ctx, -6.4, 4.8, 1.1, '#3a9a78', OUT, 0.6);   // green-bead tassel
    ctx.restore();
    if (pa >= 0) smear(ctx, 9, 10, 24, 0.5 + 1.25 * sd, 0.5 - 1.5 * sd * strikeAmt(pa), '#7ff0d0', strikeAmt(pa));
    hand(ctx, 9 + brace * 4, 10 - brace * 4, skin);
    // dark hair swept back into a high tail
    poly(ctx, [-3, -2.8, -9, -1.2, -17, Math.sin(st.t * 6) * 1.8, -9, 1.6, -3, 2.8], hair, OUT, 1.2);
    hairHead(ctx, hair, skin, 7.3);
    // the jade ribbon knotted round the tail
    ellipse(ctx, -5.6, -1.9, 2.4, 1.1, -0.5, sash, OUT, 0.8); ellipse(ctx, -5.6, 1.9, 2.4, 1.1, 0.5, sash, OUT, 0.8); circle(ctx, -4.6, 0, 1.4, sash, OUT, 0.8);
  },
});

Object.assign(SPEC_ART, {
  // Pendulum: an ornate brass bob swinging on a fine chain from the fire hand, a few gold arcs of time trailing it
  pendulum(ctx, st) {
    const cast = castAmt(st), rx = 10 + cast * 6, ry = 10 - cast * 2;
    const a = Math.sin(st.t * 2.4) * 0.9, bx = rx + 2 + Math.sin(a) * 8, by = ry + 9 + Math.cos(a) * 1.5;
    line(ctx, rx, ry, bx, by, '#d8b25a', 1);
    ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(rx + 2, ry - 1, 10.5, 0.5, 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(rx + 2, ry - 1, 13, 0.55, 1.45); ctx.stroke(); ctx.restore();
    circle(ctx, bx, by, 3.2, '#d8b25a', OUT, 1.1);
    circle(ctx, bx, by, 1.7, '#b8903a', OUT, 0.6);
    circle(ctx, bx - 0.9, by - 0.9, 0.9, '#fff2c0');
    poly(ctx, [bx - 1, by + 2.8, bx, by + 5, bx + 1, by + 2.8], '#d8b25a', OUT, 0.7);
  },
  // Zenith: a small crown of flame and frost over the brow, burning brighter in Redline; ice shards breaking off the frozen arm, fire licking up the other
  zenith(ctx, st) {
    for (let i = 0; i < 5; i++) {
      const a = -1.1 + i * 0.55, x = Math.cos(a) * 7.8, y = Math.sin(a) * 7.8, hot = i >= 2;
      glow(ctx, x, y, 4, hot ? '#ff7a3a' : '#8fd4ff', 0.5 + Math.sin(st.t * 7 + i) * 0.15);
      poly(ctx, [x - 1.2, y - 1.2, x + Math.cos(a) * 3, y + Math.sin(a) * 3, x + 1.2, y + 1.2], hot ? '#ffb05a' : '#cfeeff', OUT, 0.7);
    }
    for (let i = 0; i < 4; i++) {
      const q = (st.t * 0.5 + i / 4) % 1, x = 2 + i * 4.2, y = -17 - Math.sin(q * Math.PI) * 4 + (i % 2) * 2.4;
      ctx.save(); ctx.globalAlpha = 0.85; ctx.translate(x, y); ctx.rotate(0.6 * i - 0.8);
      poly(ctx, [-2.6, 0, 0, -1, 3, 0, 0, 1], '#e8f8ff', '#7ab8e8', 0.7); ctx.restore();
    }
    const cast = castAmt(st), rx = 13 + cast * 6, ry = 10 - cast * 2;
    for (let i = 0; i < 3; i++) {
      const j = Math.sin(st.t * 14 + i * 2) * 1.2;
      poly(ctx, [rx - 1, ry + (i - 1) * 2.6, rx + 5 + j, ry + (i - 1) * 3.6 - 1.5, rx + 8 + j * 1.5 + i, ry + (i - 1) * 4.4 - 4, rx + 4, ry + (i - 1) * 2 + 1], i === 1 ? '#ffe27a' : '#ff8a2a');
    }
  },
  // Orbit: a dashed ring of wind turning round them, a feather riding it
  orbit(ctx, st) {
    ctx.save(); ctx.rotate(st.t * 2.2);
    // (the scarf's ribbons wind round them, the Orbit's look in the painting)
    for (const [a0, a1] of [[0.3, 2.3], [3.4, 5.4]]) { ctx.strokeStyle = rgba('#8fe0b8', 0.7); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 20, a0, a1); ctx.stroke(); }
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
  // Gorgemaw: a huge armoured glutton. A great round belly in riveted gold-brass plate under grey steel pauldrons, a
  // stained cream napkin tucked under the chin, two enormous gold gauntlets, and a steel helm with a gold slotted visor
  // pushed up on top; ginger hair and beard frame a ruddy face whose cheeks hinge open at the front (wide while Open
  // Wide is up, a snap when it eats).
  gorgemaw(ctx, st) {
    const gold = '#b8902a', goldD = '#8a6a1c', goldL = '#e6c25a', steel = '#8d939c', cloth = '#4a4a54', ginger = '#d9622e', skin = '#f2b684', napkin = '#f1e8d2';
    const s = swing(actP(st, 'attack')), dir = swingDir(st), pa = actP(st, 'attack');
    const open = Math.max(0, Math.min(1, ((st.jawUntil || 0) - st.t) / 0.15)), chomp = st.chompAt != null && st.t - st.chompAt < 0.25 ? 1 - (st.t - st.chompAt) / 0.25 : 0;
    const gape = Math.max(open * (st.jawAll > st.t ? 1.4 : 1), chomp * 0.6);
    feet(ctx, st, '#3a2f2a');
    // the belly: wider than any other hero, a gold-brass breastplate bulging over banded plates, studded with rivets
    ellipse(ctx, -1, 0, 13, 18, 0, goldD, OUT, 2.2);
    for (const k of [-0.55, 0, 0.55]) ellipse(ctx, -1 + 2, k * 14, 10, 2.2, 0, shade(goldD, -0.22));
    ellipse(ctx, 1, 0, 8, 11, 0, gold, OUT, 1.8);
    ellipse(ctx, 2.5, -3, 3.5, 5, 0, goldL);
    for (const sy of [-1, 1]) { circle(ctx, 4, 7 * sy, 1.2, '#fff0b0', OUT, 0.6); circle(ctx, -6, 10 * sy, 0.9, '#fff0b0', OUT, 0.5); }
    // pauldrons: grey riveted steel
    for (const sy of [-1, 1]) { ellipse(ctx, -2, 15 * sy, 7, 5.5, 0, steel, OUT, 1.8); ellipse(ctx, -1, 15 * sy, 4, 3, 0, shade(steel, 0.28)); circle(ctx, -4.6, 15 * sy, 0.8, '#e4e8ee'); circle(ctx, 1.4, 15 * sy, 0.8, '#e4e8ee'); }
    // the napkin tucked under the chin, spotted with gravy
    poly(ctx, [-1, -9.5, 6, -11.5, 13, -6.5, 15.5, 0, 13, 6.5, 6, 11.5, -1, 9.5], napkin, OUT, 1.4);
    line(ctx, 6, -10, 12, -3, shade(napkin, -0.15), 0.8); line(ctx, 6, 10, 12, 3, shade(napkin, -0.15), 0.8);
    for (const [x, y, r] of [[12.2, -3.4, 1], [13.6, 2.4, 0.8], [10.4, 5.4, 1.1]]) circle(ctx, x, y, r, '#b86a2e');
    // the gauntlets: the left braced, the right swinging in a cuff (and both forward at the mouth when it eats)
    const rot = 0.2 + dir * s * 1.1;
    if (pa >= 0) smear(ctx, 4, 14, 20, 0.2 + dir * 1.1, rot, '#ffd8a0', strikeAmt(pa), 8);
    ctx.save(); ctx.translate(4, 14); ctx.rotate(rot);
    limb(ctx, [0, 0, 9, 1], cloth, 6);
    circle(ctx, 13, 1, 6, gold, OUT, 1.8); circle(ctx, 11.6, -1, 2.2, goldL); for (let i = 0; i < 3; i++) line(ctx, 15, -3 + i * 3, 18, -3 + i * 3, OUT, 1.2);
    ctx.restore();
    const lf = gape * 4;
    limb(ctx, [2, -14, 9 + lf, -15 + lf * 0.5], cloth, 6);
    circle(ctx, 12 + lf, -15 + lf * 0.5, 6, gold, OUT, 1.8); circle(ctx, 10.6 + lf, -17 + lf * 0.5, 2.2, goldL);
    // ginger hair and beard behind the helm
    for (const sy of [-1, 1]) ellipse(ctx, -2.5, 8.2 * sy, 4.4, 3.2, 0.35 * sy, ginger, OUT, 1.2);
    // the helm: a domed steel bowl, a gold slotted visor pushed up along the crown
    circle(ctx, 1, 0, 8.6, steel, OUT, 2);
    circle(ctx, -1, -2.5, 3, shade(steel, 0.25));
    ellipse(ctx, 0, 0, 7.6, 3, 0, gold, OUT, 1.2);
    for (let i = 0; i < 4; i++) line(ctx, -3.6 + i * 2.4, -1.6, -3.6 + i * 2.4, 1.6, goldD, 0.9);
    circle(ctx, 6.6, 0, 0.9, goldL, OUT, 0.5);
    // the face: ruddy cheeks on two hinged plates, a ginger beard along their edges, teeth showing when it opens
    const ja = 0.15 + gape * 0.75, tA = Math.min(1, gape * 3.5);
    for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(5, 0); ctx.rotate(sy * ja);
      poly(ctx, [0, 0, 7, sy * 1, 8.5, sy * 6.5, 1, sy * 7.5], skin, OUT, 1.4);
      poly(ctx, [1, sy * 7.5, 8.5, sy * 6.5, 8.1, sy * 5.5, 1.6, sy * 6.2], ginger);
      circle(ctx, 3, sy * 3.4, 1.5, 'rgba(240,100,100,0.5)');
      if (tA > 0.05) { ctx.save(); ctx.globalAlpha = tA; for (let i = 0; i < 3; i++) poly(ctx, [2 + i * 2.2, sy * 1.2, 3.1 + i * 2.2, sy * 3.4, 4.2 + i * 2.2, sy * 1.2], '#fff4e0'); ctx.restore(); }
      ctx.restore();
    }
    if (gape > 0.1) { glow(ctx, 9, 0, 6 + gape * 6, st.jawAll > st.t ? '#ff6a3a' : '#ffb070', 0.35 * gape); ellipse(ctx, 8, 0, 2 + gape * 2, 2 + gape * 4, 0, '#2a0e08'); }
    line(ctx, 3, -5.5, 3, 5.5, '#2a2422', 1.2);
    circle(ctx, 4.5, -3, 0.9, '#2a1c14'); circle(ctx, 4.5, 3, 0.9, '#2a1c14');
  },

  // Oathbroker: a grey-robed contract-knight. A long grey surcoat over plate, a hooded half-helm, a ledger book
  // chained at the left hip, and a sealing-stamp mace in the right hand (its square head stamps on every hit).
  oathbroker(ctx, st) {
    const robe = '#5e5c6a', plate = '#a8abb6', wax = '#c0364a', vellum = '#e8e0cc', lil = '#b8a0e0', skin = '#e8c4a4', gold = '#c8a040', hair = '#e2cb86';
    const s = swing(actP(st, 'attack')), dir = swingDir(st), pa = actP(st, 'attack'), big = pulse(actP(st, 'big'));
    const wave = Math.sin(st.t * 3.5) * 1.2 + (st.moving ? Math.sin(st.t * 11) * 2 : 0);
    // the surcoat's long tails
    poly(ctx, [-4, -11, -18, -11 + wave * 0.4, -21 + wave, -3, -21 + wave, 3, -18, 11 - wave * 0.4, -4, 11], robe, OUT, 2);
    line(ctx, -6, 0, -20 + wave, 0, lil, 2.6); circle(ctx, -14 + wave * 0.6, 0, 1.5, lil, OUT, 0.7);   // the lilac stripe down the surcoat, a fleur at its heart
    feet(ctx, st, '#3a3844');
    torso(ctx, plate, 9, 14);
    ellipse(ctx, -1.5, 0, 6.5, 12, 0, robe, OUT, 1.4);
    line(ctx, 3.5, -8, 3.5, 8, lil, 1.4);
    for (const sy of [-1, 1]) { ellipse(ctx, -0.5, 12.5 * sy, 6, 4.5, 0, plate, OUT, 1.5); line(ctx, -4, 12.5 * sy, 2.5, 12.5 * sy, shade(plate, -0.3), 1); circle(ctx, 1.4, 10.4 * sy, 1.7, gold, OUT, 0.7); circle(ctx, 1.4, 10.4 * sy, 0.6, '#fff0b0'); }   // gold fleur medallions at the shoulders
    // the ledger: a thick book on a chain at the left hip, swaying
    const bs = Math.sin(st.t * 2.2) * 1.2;
    ctx.save(); ctx.setLineDash([1.6, 1.2]); line(ctx, -2, -12, -7, -17 + bs, gold, 1.4); ctx.setLineDash([]); ctx.restore();
    ctx.save(); ctx.translate(-8, -18 + bs); ctx.rotate(-0.25);
    rrect(ctx, -5, -3.5, 10, 7, 1.2, '#2e2428', OUT, 1.4); rrect(ctx, -4, -2.6, 8, 5.2, 0.8, vellum); circle(ctx, 0, 0, 2, wax, OUT, 0.6); for (const [cx, cy] of [[-4.6, -3.1], [4.6, -3.1], [-4.6, 3.1], [4.6, 3.1]]) circle(ctx, cx, cy, 0.9, gold);
    ctx.restore();
    // the stamp-mace: a shaft and a square seal head, brought down on every hit (and raised high for the big ones)
    const rot = 0.25 + dir * s * 1.15 - big * 1.2;
    if (pa >= 0) smear(ctx, 7, 11, 22, 0.25 + dir * 1.15, rot, lil, strikeAmt(pa), 6);
    ctx.save(); ctx.translate(7, 11); ctx.rotate(rot);
    rrect(ctx, -3, -1.3, 22, 2.6, 1, gold, OUT, 1.2);
    rrect(ctx, 18, -5, 7, 10, 1.5, gold, OUT, 1.6); rrect(ctx, 24, -4, 2.6, 8, 0.6, wax, OUT, 0.6); line(ctx, 20.5, -3.4, 20.5, 3.4, shade(gold, -0.3), 0.9);
    ctx.restore();
    hand(ctx, 7, 11, plate);
    hand(ctx, 6, -10, plate);
    // hood over a steel half-helm, a sliver of face
    circle(ctx, 0.5, 0, 7.8, robe, OUT, 2);
    ctx.save(); ctx.strokeStyle = lil; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0.5, 0, 6.6, -1.1, 1.1); ctx.stroke(); ctx.restore();   // the hood's lilac lining
    ellipse(ctx, 3, 0, 4.5, 5.5, 0, plate, OUT, 1.2);
    ellipse(ctx, 6.4, 0, 1.8, 3.2, 0, skin);
    for (const sy of [-1, 1]) ellipse(ctx, 5.2, 4.3 * sy, 2.3, 1.2, 0.5 * sy, hair, OUT, 0.6);   // blonde hair at the face
    line(ctx, 3, -4.5, 3, 4.5, '#3a3844', 1);
    poly(ctx, [3.6, 0, 2.2, -1.4, 0.6, 0, 2.2, 1.4], gold, OUT, 0.6);   // the circlet's fleur
    circle(ctx, -2, -2.2, 2, shade(robe, 0.18));
  },
});
Object.assign(SPEC_ART, {
  // Glutton: a glazed drumstick in the left gauntlet (up at the mouth when it eats), gravy down the napkin, a grin of rosy cheeks
  glutton(ctx, st) {
    const open = Math.max(0, Math.min(1, ((st.jawUntil || 0) - st.t) / 0.15)), chomp = st.chompAt != null && st.t - st.chompAt < 0.25 ? 1 - (st.t - st.chompAt) / 0.25 : 0;
    const lf = Math.max(open * (st.jawAll > st.t ? 1.4 : 1), chomp * 0.6) * 4, hx = 12 + lf, hy = -15 + lf * 0.5;
    limb(ctx, [hx - 3.5, hy + 3.5, hx + 1, hy - 0.5], '#efe6d0', 1.8);
    circle(ctx, hx - 4.2, hy + 4.2, 1.5, '#efe6d0', OUT, 0.8);
    ellipse(ctx, hx + 3.6, hy - 3.4, 5.4, 3.7, -0.55, '#8a4a22', OUT, 1.3);
    ellipse(ctx, hx + 2.8, hy - 4.6, 2.8, 1.4, -0.55, '#c98348');
    for (const [x, y] of [[9.6, 1.2], [12, -5.2], [8.2, 5.4]]) circle(ctx, x, y, 0.9, '#8a4a22');
  },
  // Gizzard: the belly polished to a mirror shine, warm light welling up through the plate while it digests
  gizzard(ctx, st) {
    const g = 0.14 + Math.sin(st.t * 3) * 0.05;
    glow(ctx, 0, 0, 17, '#ffc070', g);
    ctx.save(); ctx.strokeStyle = 'rgba(255,244,200,0.75)'; ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-1, 0, 10.5, 2.3, 3.5); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-1, 0, 12.2, 2.5, 3.2); ctx.stroke(); ctx.restore();
    for (const [x, y] of [[-3, -5], [-3, 5], [-8, 0]]) { circle(ctx, x, y, 1.4, '#f3d37a', OUT, 0.7); circle(ctx, x - 0.3, y - 0.3, 0.5, '#fffbe6'); }
  },
  // Guarantor: a gold chain across the chest to a second seal, gold trim on the pauldrons
  guarantor(ctx, st) {
    ctx.save(); ctx.setLineDash([1.6, 1.2]); line(ctx, 3, -11, 3, 11, '#e8c15a', 1.4); ctx.setLineDash([]); ctx.restore();
    circle(ctx, 4, 0, 2.4, '#ffd27a', OUT, 0.9);
    for (const sy of [-1, 1]) ellipse(ctx, -0.5, 12.5 * sy, 6, 4.5, 0, null, '#e8c15a', 1.2);
    // the ledger held open: its pages spread to both sides of the cover, gold at the corners
    ctx.save(); ctx.translate(-8, -18 + Math.sin(st.t * 2.2) * 1.2); ctx.rotate(-0.25);
    for (const sx of [-1, 1]) { rrect(ctx, sx < 0 ? -10.4 : 4.6, -3.2, 5.8, 6.4, 0.8, '#efe6cc', OUT, 1); line(ctx, sx * 7.4, -1.6, sx * 7.4, 1.6, '#a89a78', 0.6); }
    for (const [cx, cy] of [[-9.6, -2.6], [9.6, -2.6], [-9.6, 2.6], [9.6, 2.6]]) circle(ctx, cx, cy, 0.8, '#d8a840');
    ctx.restore();
  },
  // Collector: a red sash hung with coin pouches and wax seals
  collector(ctx) {
    line(ctx, -6, -10, 3, 10, '#b02a3a', 3);
    for (const [x, y] of [[-3, -4], [0, 3]]) circle(ctx, x, y, 1.9, '#d8a040', OUT, 0.8);
    for (const [x, y] of [[-6, 6.4], [-3.4, 8.6], [-0.6, 9.4]]) { line(ctx, x, y - 2.2, x, y, '#d8a040', 0.7); circle(ctx, x, y, 1.5, '#d8a040', OUT, 0.7); circle(ctx, x, y, 0.6, '#c0364a'); }   // hung with gold medallions and seals
  },
});
// ======================================================================= Threadweaver and Marionettist (classes-c)
Object.assign(HERO_ART, {
  // Threadweaver: a seamstress-witch. A wide plum hat with a crooked tip, a lilac shawl over a dark dress, three spools
  // of thread at her belt, and a needle as long as a rapier in her right hand, a glowing thread run through its eye and
  // looped back to her left. The needle thrusts on her casts.
  threadweaver(ctx, st) {
    const dress = '#2a1e36', shawl = '#a68ccf', hat = '#4a2a58', skin = '#e4bd94', hair = '#26222e', thread = '#cbb8ff';
    const cast = castAmt(st), pa = actP(st, 'attack'), thrust = Math.max(cast, pa >= 0 ? strikeAmt(pa) : 0);
    feet(ctx, st, '#1e1626');
    // three spools on the belt at her back, each a different thread
    [['#b79ae0', -9, -7], ['#9a7acd', -11, 0], ['#c8b0ee', -9, 7]].forEach(([c, x, y]) => {
      ellipse(ctx, x, y, 3.4, 2.4, 0, '#8a5a32', OUT, 1.1);
      ellipse(ctx, x, y, 2.4, 1.8, 0, c);
      line(ctx, x - 2.4, y, x + 2.4, y, shade(c, 0.25), 0.7);
    });
    torso(ctx, dress, 9, 13.5);
    // the shawl: a pointed drape over the shoulders, a darker hem stitched in a running line
    poly(ctx, [-6, -13, 4, -10, 6, 0, 4, 10, -6, 13, -2, 0], shawl, OUT, 1.5);
    for (const [x, y] of [[-3, -9], [0, -6.5], [2.4, -3.4], [-3.4, -5], [2.6, 3.4], [0, 6.6], [-3, 9], [-3.2, 5], [2.4, 0]]) circle(ctx, x, y, 0.9, '#7a62a8');   // the crochet's open holes
    ctx.save(); ctx.setLineDash([1.6, 1.8]); limb(ctx, [-4, -10, 3, -8, 4.5, 0, 3, 8, -4, 10], '#e8deff', 0.7); ctx.restore();
    // the needle: held low in the right hand, a long silver spike forward, the eye near the grip
    const nx = 8 + thrust * 9, ny = 9 - thrust * 5, ang = -0.14 - thrust * 0.18;
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(ang);
    poly(ctx, [-3, -1.3, 26 + thrust * 4, -0.25, 30 + thrust * 4, 0, 26 + thrust * 4, 0.25, -3, 1.3], '#e8eef4', OUT, 1.1);
    line(ctx, 0, -0.5, 22, -0.3, '#ffffff', 0.6);
    ellipse(ctx, -2.5, 0, 2.6, 1.6, 0, '#c8a24a', OUT, 0.9);
    circle(ctx, -2.5, 0, 0.8, '#1a1226');
    circle(ctx, -6.2, 0, 2.5, null, '#c8a24a', 1.4);   // the gold ring grip
    ctx.restore();
    // the thread: from the needle's eye back to her left hand, glowing, swaying
    const ex = nx - 2.5 * Math.cos(ang), ey = ny - 2.5 * Math.sin(ang), lx = 6 + cast * 3, ly = -11;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.bezierCurveTo(ex - 10, ey - 4 + Math.sin(st.t * 3) * 3, lx + 6, ly + 10 + Math.cos(st.t * 2.4) * 3, lx, ly);
    ctx.strokeStyle = rgba(thread, 0.35); ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = rgba('#efe6ff', 0.9); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
    hand(ctx, nx, ny, skin);
    hand(ctx, lx, ly, skin);
    glow(ctx, lx, ly, 5 + cast * 4, thread, 0.3 + cast * 0.3);
    // pale hair spilling from under the hat, then the hat: a wide brim seen from above, a band, the tip flopped back
    hairBack(ctx, hair, 9, 7.6);
    for (const [x, y] of [[-9, -5], [-12, 1], [-9, 6], [-14, -2]]) ellipse(ctx, x, y, 2.6, 1.2, 0.5, '#8a8694');   // grey streaks in the curls
    circle(ctx, 0, 0, 7, skin, OUT, 1.5);
    ellipse(ctx, -0.5, 0, 12.5, 12, 0, hat, OUT, 1.8);
    ellipse(ctx, -1.2, -1.2, 9, 8.5, 0, shade(hat, 0.08));
    circle(ctx, -1, 0, 6, null, '#7a5aa8', 1.7);   // the hat band
    ctx.save(); ctx.translate(-2, 0); ctx.rotate(Math.PI + Math.sin(st.t * 1.3) * 0.2);
    poly(ctx, [0, -4.2, 9, -2, 14, 2.5, 7, 3, 0, 4.2], shade(hat, 0.12), OUT, 1.2);
    circle(ctx, 14, 2.5, 1.4, '#ffe08a', OUT, 0.7);
    ctx.restore();
    circle(ctx, 4.6, -5, 2.1, '#d8b04a', OUT, 0.8); circle(ctx, 4.6, -5, 1, '#9a5ad0');   // the gold brooch and violet stone on the band
    for (const o of [-1.4, 0, 1.4]) line(ctx, 3.2 + o, -7.4, 5.6 + o * 2, -11, '#d8b04a', 0.9);   // three needles pinned in it
  },

  // Marionettist: a slight puppeteer in stagehand black. A close black hood with a pale face, a black jerkin, and a
  // wooden control bar held up in both hands in front, its strings running off to the Doll (drawn by stagecraft.js).
  // The bar tips and twitches on every command.
  marionettist(ctx, st) {
    const black = '#1c1a22', black2 = '#2c2834', skin = '#f0dccb', wood = '#9a6a3c', accent = '#c84a8c';
    const cast = castAmt(st), pa = actP(st, 'attack'), jerk = Math.max(cast, pa >= 0 ? strikeAmt(pa) : 0), big = pulse(actP(st, 'big'));
    const wv = Math.sin(st.t * 2.4) * 0.8 + (st.moving ? Math.sin(st.t * 10) * 1.6 : 0);
    // the cloak: a short black cape that hangs off the shoulders and stirs behind them
    poly(ctx, [-4, -11, -12, -10.5, -17 + wv, -5, -18 + wv, 0, -17 + wv, 5, -12, 10.5, -4, 11], '#25222d', OUT, 1.6);
    line(ctx, -7, -6, -15 + wv * 0.8, -3.5, '#34303e', 1); line(ctx, -7, 6, -15 + wv * 0.8, 3.5, '#34303e', 1);
    feet(ctx, st, '#121016');
    torso(ctx, black, 7.5, 12);
    line(ctx, -5, -8, -5, 8, black2, 1.4);
    // brass buttons at the shoulders where the jerkin fastens (the lacing and the collar button are hidden under the hood from above)
    for (const sy of [-1, 1]) circle(ctx, 1.5, 8.8 * sy, 1.2, '#c8923a', OUT, 0.6);
    // the control bar: a cross of wood held out in front, tipping with each command
    const tilt = Math.sin(st.t * 2.2) * 0.06 + jerk * 0.45 * (st.action && st.action.alt ? -1 : 1) + big * Math.sin(st.t * 18) * 0.25;
    ctx.save(); ctx.translate(13 + jerk * 3, 0); ctx.rotate(tilt);
    rrect(ctx, -1.8, -11, 3.6, 22, 1.2, wood, OUT, 1.3);
    rrect(ctx, -6, -1.6, 12, 3.2, 1.2, shade(wood, 0.1), OUT, 1.2);
    for (const y of [-10, 10]) circle(ctx, 0, y, 1.6, '#e2bb58', OUT, 0.7);
    circle(ctx, 6, 0, 1.6, '#e2bb58', OUT, 0.7);
    ctx.restore();
    hand(ctx, 11 + jerk * 3, -7, '#141218');
    hand(ctx, 11 + jerk * 3, 7, '#141218');   // black gloves
    // the hood: black all round, a pale face showing at the front
    circle(ctx, 0, 0, 7.2, black2, OUT, 1.6);
    ellipse(ctx, 3.2, 0, 3.4, 4.6, 0, skin);
    poly(ctx, [-6.5, -3, -11.5, 0, -6.5, 3], black2, OUT, 1);   // the hood's point, hanging back
    circle(ctx, -1.2, -2.5, 1.6, '#3a3644');
    poly(ctx, [1.2, -4.8, 5.4, -4.2, 5.6, -2.4, 6.6, -0.5, 4.8, -0.4, 4.8, 1.6, 5.4, 4.2, 1.2, 4.8], '#0e0c12');   // black bangs falling over the brow
    circle(ctx, 6.3, -1.5, 0.5, '#0e0c12'); circle(ctx, 6.3, 1.5, 0.5, '#0e0c12');
  },
});

Object.assign(SPEC_ART, {
  // Loomwright: a small wooden loom frame strung with blue and violet warp threads at her side, a woven patch growing on it,
  // a blue spool beside it, and loose threads of light slowly turning round her
  loomwright(ctx, st) {
    ctx.save(); ctx.rotate(st.t * 0.4);
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6, b = a + TAU / 6 * 2;
      line(ctx, Math.cos(a) * 21, Math.sin(a) * 21, Math.cos(b) * 21, Math.sin(b) * 21, rgba('#7a98ff', 0.35), 0.8);
      glow(ctx, Math.cos(a) * 21, Math.sin(a) * 21, 3, '#b8c8ff', 0.55);
    }
    ctx.restore();
    ctx.save(); ctx.translate(-4, -21); ctx.rotate(-0.12);
    rrect(ctx, -11, -4.5, 22, 9, 1, '#2c1e16', OUT, 1.2);
    for (let i = 0; i < 9; i++) line(ctx, -9.5 + i * 2.4, -3.6, -9.5 + i * 2.4, 3.6, i % 2 ? '#8a7af0' : '#5a8af0', 0.9);
    rrect(ctx, -10, 0.5, 20, 3.4, 0.6, '#6a58b8');
    rrect(ctx, -11, -4.5, 22, 9, 1, null, '#9a6a3c', 1.6);
    ctx.restore();
    ellipse(ctx, 9, -20, 2.4, 1.8, 0, '#5a8af0', OUT, 0.9); ellipse(ctx, 9, -20, 1.6, 1.1, 0, '#9ab8ff');
  },
  // Shears: a great pair of silver shears in her left hand, held open and snipping, a lilac tassel from the handle
  shears(ctx, st) {
    const o = 0.2 + Math.max(0, Math.sin(st.t * 1.6)) * 0.28, cast = castAmt(st), hx = 6 + cast * 3, hy = -11;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.28);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * o);
      poly(ctx, [1, -1.4, 20, -0.3, 24, 0, 20, 0.5, 1, 1.4], '#e4ecf2', OUT, 1);
      line(ctx, 3, 0, 20, 0, '#ffffff', 0.5);
      circle(ctx, -3.6, s * 1.9, 2.5, null, '#c8d0dc', 1.6);
      ctx.restore();
    }
    circle(ctx, 1, 0, 1.2, '#c8a24a', OUT, 0.6);
    line(ctx, -5, 2.4, -9, 6, '#c8a8f0', 1.2); circle(ctx, -9.4, 6.4, 1, '#c8a8f0', OUT, 0.5);
    ctx.restore();
    hand(ctx, hx, hy, '#e4bd94');
  },
  // Cutting Line: the strings run red at the bar, and a coil of bright wire hangs at the hip
  cuttingline(ctx, st) {
    for (let i = 0; i < 3; i++) circle(ctx, -6, -9 + i * 1.6, 2.6 - i * 0.3, null, rgba('#e8ecf4', 0.85), 0.9);   // a coil of bright silver wire
    glow(ctx, 14, 0, 9, '#ff6a8a', 0.18 + Math.sin(st.t * 4) * 0.06);
  },
  // Understudy: a second, smaller control bar slung across the back
  understudy(ctx, st) {
    ctx.save(); ctx.translate(-9, 2); ctx.rotate(0.6);
    rrect(ctx, -1.4, -8, 2.8, 16, 1, '#8a5a32', OUT, 1.1);
    rrect(ctx, -4.5, -1.2, 9, 2.4, 1, '#9a6a3c', OUT, 1);
    ctx.restore();
    poly(ctx, [-9, -5, -12.5, -7.6, -12.5, -2.4], '#f2e6d4', OUT, 0.8); poly(ctx, [-9, -5, -5.5, -7.6, -5.5, -2.4], '#f2e6d4', OUT, 0.8); circle(ctx, -9, -5, 1.2, '#c8404c', OUT, 0.6);   // a second Doll's cream bow tied to it
    glow(ctx, 0, 0, 22, '#e8a0ff', 0.06 + Math.sin(st.t * 1.4) * 0.03);
  },
});
CHANNEL.threadweaver = { focus: [24, 7], color: '#c8b0ff', hot: '#f6f0ff', mote: 'mote' };

// The Marionettist's Doll: life-sized, painted. A porcelain face with rose cheeks and painted lashes, black lacquered
// hair with a bow, a white ruff, a harlequin tunic (rose and cream diamonds), wooden arms with ball joints, and a
// stiletto set in its right hand. Drawn top-down like a hero, facing +x. o: { t, st (0 standing, 1 can't be touched,
// 2 limp, 3 in the Finale, 4 moving), act: { kind, t0 } (its last move), small (an Understudy's), seed, scale }
function drawDoll(ctx, x, y, angle, o = {}) {
  const t = o.t || 0, st = o.st || 0, a = o.act, ap = a ? t - a.t0 : 9;
  if (a && a.kind === 'away') return;   // (off its mark: Grand Finale's omnislash draws the Doll as it blinks round the target)
  const tunicA = '#d0507e', tunicB = '#f2e6d4', wood = '#c89a64', skin = '#f8efe8', hairC = '#1a1418';
  ctx.save(); ctx.translate(x, y); ctx.scale(o.scale || 1.5, o.scale || 1.5);
  const limp = st === 2;
  ellipse(ctx, 2, 5, limp ? 18 : 14, limp ? 10 : 11, 0, 'rgba(0,0,0,0.28)');
  // limp: slumped over on its side, faded, no strings holding it up
  if (limp) { ctx.globalAlpha = 0.78; ctx.rotate(angle + 1.2); ctx.translate(2, 4); ctx.scale(1, 0.82); }
  else {
    const hop = st === 4 ? Math.abs(Math.sin(t * 9 + (o.seed || 0))) * 2.5 : Math.sin(t * 2 + (o.seed || 0)) * 0.8;
    ctx.translate(0, -hop);
    let spin = 0;
    if (a && a.kind === 'spin' && ap < 0.7) spin = (ap / 0.7) * TAU * 2;
    if (a && a.kind === 'finale' && ap < 2.5) spin = Math.sin(ap * 6) * 0.6 + (ap > 2 ? (ap - 2) / 0.5 * TAU : 0);
    ctx.rotate(angle + spin + Math.sin(t * 1.6 + (o.seed || 0)) * 0.05);
  }
  if (st === 1) glow(ctx, 0, 0, 24, '#ffe8f4', 0.35 + Math.sin(t * 12) * 0.1);
  // its pose for the move it just made: a stab forward, arms flung wide for a cut, a lunge for a fling
  let reach = 0, spread = 0, lean = 0;
  if (a && !limp) {
    if ((a.kind === 'jab' || a.kind === 'finale') && ap < (a.kind === 'finale' ? 2.4 : 0.45)) reach = Math.max(0, Math.sin(((ap % 0.45) / 0.45) * Math.PI));
    if (a.kind === 'cut' && ap < 0.5) spread = Math.sin(ap / 0.5 * Math.PI);
    if (a.kind === 'pull' && ap < 0.4) lean = 1 - ap / 0.4;
  }
  ctx.translate(lean * 4, 0);
  // legs: two wooden pegs, swinging a little as it floats
  for (const s of [-1, 1]) limb(ctx, [-2, s * 4, -9 - Math.sin(t * 3 + s) * 1.5, s * 5.5], wood, 3);
  // the tunic: harlequin diamonds
  ellipse(ctx, -1, 0, 9, 12.5, 0, tunicB, OUT, 1.8);
  ctx.save(); ctx.beginPath(); ctx.ellipse(-1, 0, 8.2, 11.7, 0, 0, TAU); ctx.clip();
  for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) if ((i + j) % 2 === 0) poly(ctx, [j * 6 - 3, i * 6, j * 6, i * 6 - 3.5, j * 6 + 3, i * 6, j * 6, i * 6 + 3.5], tunicA);
  ctx.restore();
  ellipse(ctx, -1, 0, 9, 12.5, 0, null, OUT, 1.8);
  // arms: wooden, jointed at the shoulder and elbow; the right one ends in a stiletto
  const arm = (side, reachK, spreadK) => {
    const sx = 1, sy = side * 10, ex = 6 + reachK * 8 - spreadK * 2, ey = side * (12 + spreadK * 8 - reachK * 6);
    const hx = 9 + reachK * 14 - spreadK * 3, hy = side * (9 + spreadK * 12 - reachK * 7);
    limb(ctx, [sx, sy, ex, ey, hx, hy], wood, 3.2);
    circle(ctx, sx, sy, 2.4, shade(wood, 0.12), OUT, 1);
    circle(ctx, ex, ey, 1.8, shade(wood, 0.12), OUT, 0.9);
    return { hx, hy };
  };
  arm(-1, 0, spread);
  const r = arm(1, reach, spread);
  ctx.save(); ctx.translate(r.hx, r.hy); ctx.rotate(-0.5 * (1 - reach) + spread * 0.9);
  poly(ctx, [0, -1, 13 + reach * 3, 0, 0, 1], '#e8eef4', OUT, 1);
  line(ctx, 2, -0.3, 11, -0.1, '#ffffff', 0.5);
  ctx.restore();
  if (reach > 0.3) smear(ctx, 0, 0, 22, -0.25, 0.35, '#ffd8ec', reach * 0.6, 4);
  circle(ctx, r.hx, r.hy, 2.2, skin, OUT, 1);
  // the ruff, then the porcelain head: black lacquered hair cap, a rose bow, painted cheeks and lashes at the front
  for (let i = 0; i < 10; i++) { const q = i / 10 * TAU; circle(ctx, Math.cos(q) * 8.2, Math.sin(q) * 8.2, 2.2, '#fbf6ee', OUT, 0.8); }
  circle(ctx, 0, 0, 7, skin, OUT, 1.6);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 6.3, 0, TAU); ctx.clip();
  ellipse(ctx, -3.2, 0, 6.2, 7.2, 0, hairC);
  ctx.restore();
  circle(ctx, 4.4, -2.6, 1.3, rgba('#ff8aa8', 0.65)); circle(ctx, 4.4, 2.6, 1.3, rgba('#ff8aa8', 0.65));
  line(ctx, 5.2, -1.6, 6.2, -1.2, '#2a1a22', 0.7); line(ctx, 5.2, 1.6, 6.2, 1.2, '#2a1a22', 0.7);
  poly(ctx, [-6, -4, -9.5, -6, -9, -2], tunicA, OUT, 0.8); poly(ctx, [-6, -4, -9.5, -2.5, -8.5, -6.5], shade(tunicA, 0.1), OUT, 0.8);
  if (st === 3) glow(ctx, 0, 0, 20, '#ffd27a', 0.25 + Math.sin(t * 9) * 0.1);
  ctx.restore();
}

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
  const gi = HERO_SPEC === 'stillwater' ? '#86b4dc' : HERO_SPEC === 'avalanche' ? '#e8902a' : '#eba521';
  const sash = HERO_SPEC === 'stillwater' ? '#233a78' : '#8a2230', skin = '#b9743f', wrap = HERO_SPEC === 'stillwater' ? '#d8bc92' : '#ece0c8', stone = HERO_SPEC === 'avalanche', iron = stone ? '#7c766f' : '#4e4e58';
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
  for (let i = 0; i < 9; i++) { const a = -1.3 + i * 0.32, bx = 1 + Math.cos(a) * 7.5, by = Math.sin(a) * 7.5; circle(ctx, bx, by, 1.5, '#4a2616', OUT, 0.5); circle(ctx, bx - 0.4, by - 0.4, 0.5, '#8a5a3a'); }
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
    else { circle(ctx, hx, hy, r, wrap, OUT, 1.4); rrect(ctx, hx + r * 0.2, hy - r * 0.8, r * (stone ? 1.1 : 0.7), r * 1.6, stone ? 1.8 : 1, iron, OUT, 0.9); if (stone) { line(ctx, hx + r * 0.75, hy - r * 0.5, hx + r * 0.75, hy + r * 0.5, OUT, 0.7); circle(ctx, hx + r * 0.5, hy - r * 0.2, 0.7, '#a8a29a'); } }   // iron (or, for Avalanche, rubble) over the knuckles
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
  ctx.save(); ctx.strokeStyle = HERO_SPEC === 'stillwater' ? '#233a78' : '#9a2a38'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5.2, -2.2); ctx.lineTo(-5.2, 2.2); ctx.stroke(); ctx.restore();   // the cord round the knot
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
    // loose rubble drifting round the stone-bound fists
    for (let i = 0; i < 4; i++) {
      const a = st.t * 1.1 + i * 1.57, x = 11 + Math.cos(a) * 4.5, y = (i % 2 ? 1 : -1) * (9.5 + Math.sin(a * 1.3) * 3), r = 1.5 + (i % 2) * 0.6;
      poly(ctx, [x - r, y - r * 0.4, x - r * 0.2, y - r, x + r, y - r * 0.2, x + r * 0.5, y + r, x - r * 0.8, y + r * 0.7], i % 2 ? '#9a948c' : '#6c665f', OUT, 0.7);
    }
  },
});
// Gloomsworn (tank, class 18): a hooded dark knight in bruised-violet plate. The helm is cracked and lit from within (a
// cold teal-white), a crown of cracked shadow stands round the back of it, the cloak is ragged and trails behind, and a
// black greatsword with a pale light in its fuller rides at the right hip. The Reaver of Dusk burns brighter in the cracks.
HERO_ART.gloomsworn = function (ctx, st) {
  const plate = '#5a3f7e', plateD = '#3a2a58', ink = '#14101e', cloak = '#1d1430', vio = '#9a6ae0';
  const reaver = HERO_SPEC === 'duskreaver';   // the Reaver of Dusk fights bare-headed, wild black hair, the cracks lit rose-pink instead of cold teal
  const ghost = reaver ? '#ff8ab8' : '#bff8ee';
  const s = swing(actP(st, 'attack')), bash = pulse(actP(st, 'bash')), big = pulse(actP(st, 'big')), pa = actP(st, 'attack');
  const wave = Math.sin(st.t * 3.2) * 1.8 + (st.moving ? Math.sin(st.t * 10) * 2.4 : 0);
  const fl = (0.72 + 0.28 * Math.sin(st.t * 5.3 + 1)) * (reaver ? 1.25 : 1);
  // the ragged cloak, trailing behind: a long torn hem that stirs, lit faintly along its tatters
  const hem = [[-12, -13], [-17, -10], [-21 + wave * 0.4, -12], [-24 + wave, -6], [-30 + wave * 1.2, -3], [-25 + wave, 0], [-31 + wave * 1.3, 3], [-24 + wave, 6], [-27 + wave, 11], [-19 + wave * 0.4, 10], [-14, 13]];
  poly(ctx, [-3, -11].concat(...hem, [-3, 11]), cloak, OUT, 2);
  line(ctx, -8, -4, -21 + wave * 0.6, -3, '#2c1f48', 1.2); line(ctx, -8, 4, -21 + wave * 0.6, 3, '#2c1f48', 1.2);
  for (const [hx, hy] of [hem[4], hem[6], hem[3]]) glow(ctx, hx, hy, 5, ghost, 0.2 * fl);
  feet(ctx, st, '#241a38');
  torso(ctx, plate, 9.5, 14.5);
  // heavy spiked pauldrons, a pale rim along each
  for (const sy of [-1, 1]) {
    ellipse(ctx, 0.5, 12.5 * sy, 6.6, 5.4, 0, plateD, OUT, 1.6);
    poly(ctx, [-2, 16 * sy, 2, 17.5 * sy, 4.5, 15 * sy, 2, 13.5 * sy], ink, OUT, 1);
    ellipse(ctx, 0.5, 12.5 * sy, 4.8, 3.6, 0, null, 'rgba(191,248,238,0.35)', 0.9);
  }
  // the chest cracked open: light from within
  glow(ctx, 0, 0, 9, ghost, 0.22 * fl);
  ctx.save(); ctx.strokeStyle = ghost; ctx.globalAlpha = Math.min(1, 0.75 * fl); ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(0.5, -3); ctx.lineTo(-1.5, 0.5); ctx.lineTo(2.5, 4); ctx.lineTo(0.5, 8); ctx.moveTo(0.5, -3); ctx.lineTo(4, -4.5); ctx.stroke();
  ctx.restore();
  // the free hand holds a small pale flame: the vigil
  hand(ctx, 6, -11, plateD);
  glow(ctx, 9, -11.5, 7, ghost, 0.4 * fl); circle(ctx, 9, -11.5, 1.7, '#f4fffb');
  // the greatsword (a violet arc while it cuts; raised for a big move, thrust for a bash)
  const dir = swingDir(st), rot = 0.3 + dir * s * 1.2 - big * 1.4;
  // (no smear drawn here: the swing's dark trail is ABILITY_VFX.gloomsworn, which everyone sees)
  ctx.save(); ctx.translate(7 + 5 * bash, 11 - 3 * bash); ctx.rotate(rot - bash * 0.3);
  poly(ctx, [2, -2.6, 30, -3.4, 38, 0, 30, 3.4, 2, 2.6], '#171126', OUT, 1.6);
  line(ctx, 4, -2.2, 29, -3, vio, 1);
  ctx.save(); ctx.globalAlpha = Math.min(1, 0.85 * fl); line(ctx, 5, 0, 31, 0, ghost, 1.3); ctx.restore();
  glow(ctx, 20, 0, 13, ghost, 0.13 * fl);
  poly(ctx, [-0.5, -7.5, 3, -4.5, 3, 4.5, -0.5, 7.5, -2.2, 0], plateD, OUT, 1.3);
  rrect(ctx, -9, -1.6, 8, 3.2, 1, ink, OUT, 1); circle(ctx, -10.5, 0, 2.1, plateD, OUT, 1);
  hand(ctx, 0, 0, plateD); hand(ctx, -6, 0, plateD);
  ctx.restore();
  // the hood and the cracked helm; a crown of shadow shards stands round the back of it
  poly(ctx, [-5, -6.5, -15, 0, -5, 6.5], cloak, OUT, 1.8);
  ellipse(ctx, -3, 0, 8.6, 8.2, 0, cloak, OUT, 2);
  if (reaver) {
    hairBack(ctx, '#261f33', 12, 8);
    hairHead(ctx, '#261f33', '#a07a62', 7.8);
    ellipse(ctx, 7.6, 0, 2.5, 3.8, 0, '#17121a', OUT, 1);                       // the dark beard
    ellipse(ctx, 9.4, 0.8, 1, 1.5, 0, '#c4c0c0');                                // a grey tuft at the chin
    ctx.save(); ctx.strokeStyle = ghost; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.globalAlpha = Math.min(1, 0.9 * fl);
    ctx.beginPath(); ctx.moveTo(5.2, -2.6); ctx.lineTo(6.6, -1.2); ctx.lineTo(5.8, 0.3); ctx.moveTo(4.4, 2.4); ctx.lineTo(5.6, 3.8); ctx.stroke();   // cracks of light in the scarred face
    ctx.restore();
    glow(ctx, 6, 0, 5, ghost, 0.3 * fl);
  } else {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = 1.75 + i * (2.64 / (n - 1)), tip = 12.5 + (i % 2) * 2.6 + Math.sin(st.t * 2.6 + i * 1.7) * 0.7, w = 0.2;
    poly(ctx, [1 + Math.cos(a - w) * 6.4, Math.sin(a - w) * 6.4, 1 + Math.cos(a) * tip, Math.sin(a) * tip, 1 + Math.cos(a + w) * 6.4, Math.sin(a + w) * 6.4], ink, OUT, 1.1);
    circle(ctx, 1 + Math.cos(a) * (tip - 1.2), Math.sin(a) * (tip - 1.2), 0.9, ghost);
  }
  circle(ctx, 1, 0, 7.2, plateD, OUT, 2);
  circle(ctx, 2.6, -2.6, 2.4, shade(plateD, 0.22));
  ctx.save(); ctx.strokeStyle = ghost; ctx.globalAlpha = Math.min(1, 0.85 * fl); ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(7, 0.6); ctx.lineTo(3.5, -0.8); ctx.lineTo(1, 1.2); ctx.lineTo(-2.5, -0.6); ctx.lineTo(-5, 1.2); ctx.moveTo(1, 1.2); ctx.lineTo(-0.5, 4.4); ctx.stroke();
  ctx.restore();
  ellipse(ctx, 5.8, 0, 1.7, 3.8, 0, '#0a0612');
  glow(ctx, 6.4, 0, 6.5, ghost, 0.5 * fl);
  circle(ctx, 6.3, -1.8, 0.9, '#f4fffb'); circle(ctx, 6.3, 1.8, 0.9, '#f4fffb');
  }
};
// Duskward: the vigil kept, two pale-blue rings of light standing round them like the arcs behind the painted knight, a cold
// teal glint on the plate (the Reaver's look is inside HERO_ART.gloomsworn)
SPEC_ART.duskward = function (ctx, st) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#7aa8f0'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.5 + Math.sin(st.t * 2) * 0.1;
  ctx.beginPath(); ctx.arc(-1, 0, 19, -2.3, 2.3); ctx.stroke();
  ctx.globalAlpha *= 0.65; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(-1, 0, 22.5, -2.1, 2.1); ctx.stroke();
  ctx.restore();
  glow(ctx, 0, 0, 20, '#7aa8f0', 0.1);
};

// Reaper (the class id stays `thresher`; damage, class 19): a slim, elegant figure in a long black-violet cloak with a deep
// hood and a pale porcelain mask, a faint teal soul-glow behind its eyes and a soul-wisp on a fine chain at the hip. The scythe
// is long and graceful: a black snath with violet bands, a slender crescent blade of pale silver with a teal edge and a soul-ribbon
// streaming from its head. In the Reaper's Gate (st.thMist, set by ability-vfx.js) the body goes to mist.
HERO_ART.thresher = function (ctx, st) {
  const void_ = '#0c0a14', vioD = '#2a1840', vioM = '#4a2a6a', vioL = '#7a5aa8', bone = '#e8e4dc', boneD = '#b8b2c4', teal = '#8fd8e8', pale = '#e0f6ff';
  const grim = HERO_SPEC === 'grim';
  const mist = st.thMist && typeof FX !== 'undefined' && FX.now < st.thMist;
  const s = swing(actP(st, 'attack')), bash = pulse(actP(st, 'bash')), big = pulse(actP(st, 'big')), cast = pulse(actP(st, 'cast')), pa = actP(st, 'attack');
  const wave = Math.sin(st.t * 3.4) * 1.8 + (st.moving ? Math.sin(st.t * 10) * 2.2 : 0);
  const fl = 0.75 + 0.25 * Math.sin(st.t * 6.1 + 1);
  const cloakC = grim ? '#1a0f2a' : vioD, linC = grim ? '#2e1a46' : vioM;
  ctx.save();
  if (mist) ctx.globalAlpha = 0.34 + 0.1 * Math.sin(st.t * 7);
  // the long cloak behind: three pointed tails that stream, a violet lining inside and a thin teal edge on the longest
  const hem = [[-9, -11], [-16, -10], [-22 + wave * 0.5, -13], [-31 + wave, -8], [-24 + wave, -4], [-37 + wave * 1.3, 0], [-24 + wave, 4], [-31 + wave, 8], [-22 + wave * 0.5, 13], [-16, 10], [-9, 11]];
  poly(ctx, [-3, -8].concat(...hem, [-3, 8]), cloakC, OUT, 2);
  poly(ctx, [-6, -5, -16, -5.5, -27 + wave, -3.5, -34 + wave * 1.2, 0, -27 + wave, 3.5, -16, 5.5, -6, 5], linC);
  ctx.save(); ctx.globalAlpha = (mist ? 0.5 : 0.7) * fl; ctx.strokeStyle = teal; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-24 + wave, -4); ctx.lineTo(-37 + wave * 1.3, 0); ctx.lineTo(-24 + wave, 4); ctx.stroke(); ctx.restore();
  circle(ctx, -35 + wave * 1.3, 0, 1.1, teal);
  feet(ctx, st, '#1a1226');
  torso(ctx, cloakC, 7.4, 12.2);
  line(ctx, -2, -9, 3, 8, linC, 1.2);                                    // the fall of the cloak at the chest
  // slim mantle points over the shoulders, a thread of teal at each edge
  for (const sy of [-1, 1]) {
    poly(ctx, [-3, 7.8 * sy, 2, 14.6 * sy, 7, 13 * sy, 6, 9.4 * sy, 3, 7.4 * sy], vioM, OUT, 1.5);
    line(ctx, 2.5, 13.4 * sy, 6.4, 12.4 * sy, teal, 0.8);
  }
  // a narrow sash with a clasp, and the soul-wisp at the hip on a fine chain (on the left, clear of the swing)
  line(ctx, -5, -8.5, -5, 8.5, void_, 2); circle(ctx, -5, 0, 1.6, vioL, OUT, 0.8);
  line(ctx, -1, -9.5, 1.5, -12.6, vioL, 0.8);
  glow(ctx, 2.2, -14.2, 8, teal, 0.34 * fl);
  poly(ctx, [2.2, -17.2, 4.2, -14.4, 3.2, -12, 1.2, -12, 0.2, -14.4], pale, OUT, 0.8);
  circle(ctx, 2.2, -14, 1, '#ffffff');
  // the scythe: held two-handed on the right; the whole arm swings it round
  const dir = swingDir(st), rot = 0.55 + dir * s * 1.35 - big * 1.5 - cast * 0.5 + bash * 0.25;
  const blade = grim ? '#e8e2d8' : '#e4eaf2', edge = teal;
  ctx.save(); ctx.translate(5, 10); ctx.rotate(rot);
  // the snath: long, slender and black, ringed with violet at the grips, a small teardrop weight at the heel
  poly(ctx, [-14, -1.2, 20, -1.5, 40, -1.2, 40, 1.2, 20, 1.5, -14, 1.2], void_, OUT, 1.3);
  line(ctx, -12, -0.3, 39, -0.3, vioM, 0.8);
  for (const gx of [4, 24]) rrect(ctx, gx, -2.1, 2.6, 4.2, 0.9, vioL, OUT, 0.8);
  poly(ctx, [-14, 0, -18, -2, -21, 0, -18, 2], vioM, OUT, 1);
  circle(ctx, -17, 0, 0.9, teal);
  // the blade: a long slender crescent swept forward from the head, a collar of violet at its root, the edge lit teal
  circle(ctx, 40, 0, 2.6, vioM, OUT, 1.1); circle(ctx, 40, 0, 1, teal);
  const bl = grim ? 0.92 : 1;
  poly(ctx, [37, 2.2, 46, -2.8, 58, -9.5, 72, -14.5, 86, -13.5, 96 * bl, -7, 85, -10, 72, -10, 58, -5.2, 47, 1.8, 40, 4.2], blade, OUT, 1.4);
  line(ctx, 46, -2, 71, -12, grim ? '#cfc8bc' : '#c8d4e4', 0.7);                // the spine's sheen
  // thorny violet cracks running through the pale blade, a bone-coloured mount where it meets the snath
  for (const [x0, y0, x1, y1, x2, y2] of [[52, -3.4, 55, -6.6, 54, -8.4], [62, -6.4, 65, -9.6, 67, -9.2], [74, -11.2, 76, -8.6, 79, -9.4], [82, -11.2, 83, -9.4, 86, -9.8]]) {
    ctx.save(); ctx.strokeStyle = grim ? '#2a1840' : '#5a3a7a'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  poly(ctx, [37, 3, 40, 5.4, 44, 2.6, 46, -2.6, 42, -4, 38, -2], bone, OUT, 1);
  circle(ctx, 41.5, 0.4, 1.1, '#d8b04a', OUT, 0.5);
  ctx.save(); ctx.globalAlpha = (mist ? 0.5 : 1) * Math.min(1, 0.95 * fl); ctx.strokeStyle = edge; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(40, 3.8); ctx.quadraticCurveTo(54, -1.6, 72, -9.6); ctx.quadraticCurveTo(84, -9.8, 94 * bl, -6.8); ctx.stroke();
  ctx.restore();
  glow(ctx, 70, -9, 16, edge, 0.2 * fl); circle(ctx, 94 * bl, -6.8, 1.1, '#ffffff');
  // a soul-ribbon from the head of the snath, streaming behind the swing
  ctx.save(); ctx.globalAlpha = (mist ? 0.4 : 0.75) * fl; ctx.strokeStyle = teal; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(40, 0); ctx.bezierCurveTo(32, 5 + wave * 0.3, 24, 2, 16, 7 - wave * 0.3); ctx.stroke(); ctx.restore();
  ctx.restore();
  smear(ctx, 5, 10, 42, 0.55 + dir * 1.35, rot, grim ? '#e8c868' : teal, strikeAmt(pa) * 0.8, 7);
  hand(ctx, 5, 10, vioD); hand(ctx, 5 + 24 * Math.cos(rot), 10 + 24 * Math.sin(rot), vioD);
  // the deep hood, peaked and trailing at the back, and the pale mask in the shadow of it with a faint teal glow behind the eyes
  poly(ctx, [-3, -6.2, -16, 0, -3, 6.2], void_, OUT, 1.8);
  ellipse(ctx, -2, 0, 8.4, 7.6, 0, cloakC, OUT, 2);
  ellipse(ctx, -3.5, -2.2, 3.2, 2.2, 0, shade(cloakC, 0.2));
  ellipse(ctx, 3.4, 0, 5, 5.2, 0, void_);                                    // the shadowed hollow
  glow(ctx, 5, 0, 9, teal, 0.34 * fl);
  ellipse(ctx, 5.2, 0, 3.4, 4.3, 0, bone, OUT, 0.9);                         // the porcelain mask
  line(ctx, 3.3, 0, 7.4, 0, boneD, 0.7);
  ctx.save(); ctx.globalAlpha = Math.min(1, 0.9 * fl + 0.1); line(ctx, 5.9, -1.9, 6.9, -1.4, teal, 1.1); line(ctx, 5.9, 1.9, 6.9, 1.4, teal, 1.1); ctx.restore();
  glow(ctx, 6.4, 0, 4.5, pale, 0.4 * fl);
  ellipse(ctx, 0.8, 0, 8.4, 7.6, 0, null, shade(cloakC, 0.1), 1.6);          // the hood's lip
  ctx.restore();
  if (mist) for (let i = 0; i < 4; i++) { const q = (st.t * 0.9 + i / 4) % 1; ctx.save(); ctx.globalAlpha = (1 - q) * 0.4; circle(ctx, -4 - q * 10, (i - 1.5) * 5 + Math.sin(st.t * 3 + i) * 2, 3 + q * 4, '#b8a8d8'); ctx.restore(); }
};
Object.assign(SPEC_ART, {
  // Wraith: wisps of soul-mist trailing off the shoulders and cloak, a pale glint drifting off each hand
  sower(ctx, st) {
    // the cloak torn to ragged shreds streaming back, violet and black, cyan speed-light caught in them
    for (let i = 0; i < 5; i++) {
      const y0 = (i - 2) * 5.4, w = Math.sin(st.t * 5 + i * 1.7) * 2.6, L = 14 + (i % 2) * 6 + Math.abs(i - 2) * -1.5;
      poly(ctx, [-17, y0 - 1.6, -17 - L * 0.5, y0 + w - 2.4, -17 - L, y0 + w * 1.4, -17 - L * 0.55, y0 + w + 1, -17, y0 + 1.6], i % 2 ? '#2a1840' : '#0c0a14', OUT, 1);
      line(ctx, -19, y0, -17 - L * 0.8, y0 + w * 1.2, '#4a2a6a', 0.7);
    }
    for (let i = 0; i < 4; i++) {
      const q = (st.t * 0.7 + i / 4) % 1, y0 = (i % 2 ? 1 : -1) * (5 + (i >> 1) * 4);
      ctx.save(); ctx.globalAlpha = (1 - q) * 0.55; ctx.strokeStyle = '#8fd8e8'; ctx.lineWidth = 2 - q; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6 - q * 6, y0); ctx.quadraticCurveTo(-14 - q * 14, y0 + Math.sin(q * 6 + i) * 4, -22 - q * 18, y0 + Math.sin(q * 5 + i * 2) * 6); ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 3; i++) { const q = (st.t * 0.8 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - q) * 0.7; circle(ctx, 8 + q * 8, 7 + (i - 1) * 4 + Math.sin(q * 6 + i) * 2, 1 - q * 0.4, '#e0f6ff'); ctx.restore(); }
  },
  // Grim: an hourglass of gold sand at the hip (what is coming due) and a dim glow along the cloak's hem
  grim(ctx, st) {
    // a gold clock ring behind the hood (twelve tick marks) and an hourglass of gold sand at the hip on its chain
    ctx.save(); ctx.globalAlpha = 0.55; ctx.rotate(st.t * 0.12);
    circle(ctx, -3, 0, 20, null, '#d8b04a', 1.1);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12, r0 = i % 3 ? 17.6 : 16.4; line(ctx, -3 + Math.cos(a) * r0, Math.sin(a) * r0, -3 + Math.cos(a) * 20, Math.sin(a) * 20, '#d8b04a', i % 3 ? 0.9 : 1.5); }
    ctx.restore();
    glow(ctx, -3, 12, 7, '#ffd65a', 0.16 + Math.sin(st.t * 2) * 0.04);
    poly(ctx, [-5.2, 9.6, -1.4, 9.6, -3.3, 12.2, -1.4, 14.8, -5.2, 14.8, -3.3, 12.2], '#ffe9a0', OUT, 0.9);
    line(ctx, -5.6, 9.6, -1, 9.6, '#d8b04a', 1.1); line(ctx, -5.6, 14.8, -1, 14.8, '#d8b04a', 1.1);
    poly(ctx, [-4.2, 14.6, -3.3, 13, -2.4, 14.6], '#c8903a');
  },
});

// ---------------------------------------------------------------- Tidecaller (healer, class 20)
// A tall barefoot sea-priest in wet sea-blue wraps: a slate shawl hung with kelp fringe, hair in heavy wet ropes with pearl
// ties, a great conch on a leather strap (lifted to the lips for a cast, with arcs of sound off its flared mouth) and a
// small sphere of sea water floating over the open left hand. Spring Tide: a pale moon-halo and pearls circling; Undertow:
// dark water curling off the wraps and bubbles rising. The tide ring at the feet (HERO_TRAIL.tidecaller) rises and falls with
// the Tide: your own hero reads the kit, everyone else's runs a clock reset by the kit's crest / slack moments (ability-vfx.js).
function tidecallerLevel(st) {
  const g = typeof window !== 'undefined' && window.__game, kit = g && g.player && g.player.st === st && g.actor && g.actor.kit;
  if (kit && kit.g && kit.g.tphase) {
    const q = kit.g, now = kit.now;
    return { f: Math.max(0, Math.min(1, (q.tide || 0) / 100)), ph: q.tphase, flood: now < (q.floodUntil || 0), wall: now < (q.wallUntil || 0), deep: now < (q.deepUntil || 0) };
  }
  const m = st && st.tm, now = typeof FX !== 'undefined' ? FX.now : (st ? st.t : 0);
  let ph = m ? m.ph : 'rise', f = m ? m.f0 : 0.3, el = m ? now - m.t0 : 0;
  const hold = (m && m.hold) || 2;
  if (ph === 'rise') { f += el / 12; if (f >= 1) { el = (f - 1) * 12; f = 1; ph = 'hold'; } }
  if (ph === 'hold') { if (el > hold) { el -= hold; ph = 'ebb'; } else f = 1; }
  if (ph === 'ebb') { f = 1 - el / 6; if (f <= 0) { f = (-f) * 6 / 12; ph = 'rise'; } }
  return { f: Math.max(0, Math.min(1, f)), ph, flood: !!(m && m.flood && now < m.flood), wall: !!(m && m.wall && now < m.wall), deep: !!(m && m.deep && now < m.deep) };
}
HERO_ART.tidecaller = function (ctx, st) {
  const wrap = '#34689a', wrapD = '#214a74', teal = '#3fb8a8', foam = '#eaf8f5', pearl = '#efe8dc', slate = '#4a7cae';
  const skin = '#b27a52', rope = '#18232d', kelp = '#2a8a80', shell = '#f4e6d6', shellD = '#cba890', leather = '#6b4a2b';
  const cast = castAmt(st), big = pulse(actP(st, 'big')), now = st.t;
  const wave = Math.sin(now * 2.6) * 1.8 + (st.moving ? Math.sin(now * 9) * 2.2 : 0);
  // the long wet wrap trailing behind: a wavy hem with a thread of foam along it
  const hem = [[-9, -11], [-17, -12], [-24 + wave, -9], [-28 + wave, -5], [-27 + wave, -1], [-31 + wave * 1.1, 2], [-27 + wave, 5], [-28 + wave, 9], [-23 + wave, 12], [-16, 11], [-9, 10]];
  // (a closed curve through the points' midpoints: soft, flowing edges, not spikes)
  const flow = (pts, fill, stroke, lw) => {
    const n = pts.length, mid = i => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    ctx.beginPath(); const m0 = mid(n - 1); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(i); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    ctx.closePath(); ctx.lineJoin = 'round';
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  };
  flow([[-3, -9]].concat(hem, [[-3, 9]]), wrapD, OUT, 2);
  flow([[-6, -5], [-15, -6], [-22 + wave, -4], [-27 + wave, 0], [-22 + wave, 4], [-15, 6], [-6, 5]], wrap);
  ctx.save(); ctx.strokeStyle = foam; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-24 + wave, -9); ctx.quadraticCurveTo(-28 + wave, -5, -27 + wave, -1); ctx.quadraticCurveTo(-31 + wave * 1.1, 2, -27 + wave, 5); ctx.quadraticCurveTo(-28 + wave, 9, -23 + wave, 12); ctx.stroke();
  for (let i = 0; i < 3; i++) { const q = (now * 0.5 + i / 3) % 1; ctx.globalAlpha = Math.sin(q * Math.PI) * 0.6; circle(ctx, -24 - q * 14 + wave * 0.8, (i - 1) * 6, 1.1, foam); }
  ctx.restore();
  feet(ctx, st, skin);
  torso(ctx, wrap, 9.5, 14);
  // wraps crossing the chest, pale at the edge
  line(ctx, -5, -11, 4, 9, wrapD, 2.2); line(ctx, 3, -11, -5, 9, wrapD, 2.2);
  line(ctx, -5, -11, 4, 9, pearl, 0.7); line(ctx, 3, -11, -5, 9, pearl, 0.7);
  // the slate shawl over the shoulders, kelp hanging from its back edge
  ellipse(ctx, -2.5, 0, 6.2, 15.5, 0, slate, OUT, 1.7);
  ellipse(ctx, -1.5, -3, 2.6, 7, 0.2, shade(slate, 0.16));
  for (let i = -3; i <= 3; i++) ellipse(ctx, -9 + Math.abs(i) * 0.2 + Math.sin(now * 2 + i) * 0.6, i * 4.2, 3, 1.3, 0.25 * i, kelp, OUT, 0.8);
  // the conch's strap, and the spiral-shell brooch that pins the shawl at the shoulder
  line(ctx, -4, -12, 5, 11, leather, 1.8);
  circle(ctx, 5, 11, 1.4, '#d8b25a', OUT, 0.8);
  circle(ctx, 1, -12.6, 2.8, shell, OUT, 1); ctx.save(); ctx.strokeStyle = shellD; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(1, -12.6, 1.8, 0.4, 5.2); ctx.arc(1, -12.6, 0.9, 1, 5.5); ctx.stroke(); ctx.restore();
  for (const [bx, by] of [[-1.5, -14.6], [-4, -13.6], [2.4, -15.4]]) circle(ctx, bx, by, 0.9, pearl, OUT, 0.5);
  // the open left hand: a small sphere of sea water, a ripple round it
  const sx = 11 + cast * 3, sy = -11 - cast * 1.5, pr = 3.6 + cast * 1.4 + Math.sin(now * 3.4) * 0.35;
  hand(ctx, 6.5, -10.5, skin);
  glow(ctx, sx, sy, pr * 3.2, teal, 0.35 + cast * 0.3);
  circle(ctx, sx, sy, pr, '#58cfc0', OUT, 1.1);
  circle(ctx, sx - pr * 0.3, sy - pr * 0.35, pr * 0.42, '#e6fbf6');
  ctx.save(); ctx.strokeStyle = pearl; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 3);
  ctx.beginPath(); ctx.ellipse(sx, sy, pr + 2.6 + Math.sin(now * 2.2) * 0.8, pr * 0.55 + 1.4, 0, 0, TAU); ctx.stroke(); ctx.restore();
  // the conch: at the hip at rest, brought up to the lips to cast (the spire to the mouth, the flared lip out front)
  const k = Math.min(1, cast * 1.15 + big * 0.5), cx = 9 + 8 * k, cy = 13.5 - 11 * k, ca = 0.12 - 0.3 * k;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ca);
  ctx.beginPath(); ctx.moveTo(-10, 0.2); ctx.quadraticCurveTo(-5, -5.5, 3, -5.8); ctx.quadraticCurveTo(10, -5.4, 10, 0); ctx.quadraticCurveTo(10, 5.4, 3, 5.8); ctx.quadraticCurveTo(-5, 5.5, -10, 0.2); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.fillStyle = shell; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
  ellipse(ctx, 7, 0, 2.6, 4.4, 0, '#e8a8a0', OUT, 0.9);
  ctx.save(); ctx.strokeStyle = shellD; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  for (const [x0, w0] of [[-5.5, 2.6], [-2, 3.8], [1.8, 4.6]]) { ctx.beginPath(); ctx.ellipse(x0, 0, 1.1, w0, 0, -1.2, 1.2); ctx.stroke(); }
  ctx.restore();
  ellipse(ctx, -3, -2, 4, 1.2, 0.2, shade(shell, 0.4));
  ctx.restore();
  hand(ctx, cx - 2, cy + 1, skin);
  // sound off the conch's mouth while it's up: three arcs of foam-white and teal going out
  if (k > 0.35) {
    const ox = cx + Math.cos(ca) * 10, oy = cy + Math.sin(ca) * 10;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const q = (now * 2.4 + i / 3) % 1; ctx.globalAlpha = Math.sin(q * Math.PI) * 0.7 * k; ctx.strokeStyle = i % 2 ? teal : foam; ctx.lineWidth = 1.5 - q * 0.6; ctx.beginPath(); ctx.arc(ox, oy, 3 + q * 12, ca - 0.7, ca + 0.7); ctx.stroke(); }
    ctx.restore();
  }
  // the head: hair in heavy wet ropes, a pearl at the brow, the face a sliver at the front
  hairBack(ctx, rope, 8, 6.5);
  for (const [y0, y1, e] of [[-4.5, -9.5, 0.3], [4.5, 8.5, -0.3]]) { limb(ctx, [-3, y0, -9, y0 * 1.5 + e * 3, -15 + wave * 0.3, y1], OUT, 3.4); limb(ctx, [-3, y0, -9, y0 * 1.5 + e * 3, -15 + wave * 0.3, y1], rope, 2.2); circle(ctx, -16 + wave * 0.3, y1 + (y1 > 0 ? 0.6 : -0.6), 1.5, pearl, OUT, 0.8); }
  limb(ctx, [-2, 0, -10, 1, -19 + wave * 0.5, 0.5], OUT, 3.4); limb(ctx, [-2, 0, -10, 1, -19 + wave * 0.5, 0.5], shade(rope, 0.1), 2.2); circle(ctx, -20 + wave * 0.5, 0.5, 1.5, teal, OUT, 0.8);
  hairHead(ctx, rope, skin);
  for (const [px, py] of [[-1, -7.2], [1.6, -6.4], [-3.2, 7], [0, 7.4], [2.4, 6]]) circle(ctx, px, py, 0.95, pearl, OUT, 0.5);   // pearls strung through the hair
  circle(ctx, 5.4, -2.8, 1.5, pearl, OUT, 0.7);
  circle(ctx, 4.8, 3.6, 1.1, shell, OUT, 0.6);
  glow(ctx, 5.4, -2.8, 4, '#ffffff', 0.35);
};
Object.assign(SPEC_ART, {
  // Spring Tide: a pale moon-halo at the back of the head and three pearls circling the shoulders
  springtide(ctx, st) {
    glow(ctx, -1, 0, 15, '#bff3ea', 0.22 + Math.sin(st.t * 1.6) * 0.05);
    ctx.save(); ctx.strokeStyle = '#eaf8f5'; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-1, 0, 11.5, 1.8, 4.5); ctx.stroke(); ctx.restore();
    for (let i = 0; i < 9; i++) { const a = 1.9 + i * 0.3; circle(ctx, -1 + Math.cos(a) * 13.4, Math.sin(a) * 13.4, 0.9, '#f6f0e6', OUT, 0.5); }   // a loose arc of pearls over the hair
    for (let i = 0; i < 3; i++) { const a = st.t * 1.3 + i * TAU / 3, x = Math.cos(a) * 16 - 1, y = Math.sin(a) * 15, back = Math.sin(a) < 0; ctx.save(); ctx.globalAlpha = back ? 0.5 : 1; glow(ctx, x, y, 5, '#ffffff', 0.45); circle(ctx, x, y, 1.9, '#f2fbf8', OUT, 0.7); ctx.restore(); }
  },
  // Undertow: dark water curling off the wraps, bubbles rising
  undertow(ctx, st) {
    // the blue cloak drawn up over the head as a hood (a sliver of face, black hair at the brow), kelp hanging off the hem
    ellipse(ctx, -2.5, 0, 9.6, 10.4, 0, '#2f5f92', OUT, 1.8);
    ellipse(ctx, -5, -3.2, 3.6, 2.4, 0, '#4a7cae');
    ellipse(ctx, 5.2, 0, 2.6, 4.2, 0, '#b27a52');
    ellipse(ctx, 3.8, 0, 1.4, 4.4, 0, '#18232d');
    poly(ctx, [3.8, -3.2, 6.6, -1.2, 4, 0.4], '#18232d');
    ctx.strokeStyle = '#6a98c8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-0.2, 0, 8.4, -1.05, 1.05); ctx.stroke();
    for (const sy of [-1, 1]) circle(ctx, 2.4, 9.2 * sy, 0.9, '#efe8dc', OUT, 0.5);
    for (let i = 0; i < 3; i++) {
      const q = (st.t * 0.6 + i / 3) % 1, y0 = (i - 1) * 8;
      ctx.save(); ctx.globalAlpha = (1 - q) * 0.55; ctx.strokeStyle = '#1d5668'; ctx.lineWidth = 2.6 - q; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8 - q * 4, y0); ctx.quadraticCurveTo(-16 - q * 12, y0 + Math.sin(q * 6 + i * 2) * 5, -24 - q * 14, y0 + Math.sin(q * 5 + i) * 7); ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 4; i++) { const q = (st.t * 0.7 + i / 4) % 1; ctx.save(); ctx.globalAlpha = Math.sin(q * Math.PI) * 0.7; circle(ctx, -2 + Math.sin(q * 7 + i * 2) * 9, 7 - q * 22 + (i % 2 ? 7 : -9), 1.2 + (i % 2) * 0.5, null, '#9fe0e8', 0.8); ctx.restore(); }
  },
});
// the tide ring round the feet: a wave ring that swells and brightens with the water (foam at the crest, a flooded sheen
// under Spring Flood, stone blocks while Breakwater stands, a darker ring while a Deep Shield holds)
HERO_TRAIL.tidecaller = function (ctx, x, y, st, scale, spec) {
  if (!st || st.t == null) return;
  const L = tidecallerLevel(st), f = L.flood ? 1 : L.f, t = st.t, amp = 0.7 + 2.2 * f, rx = 22.5 + 3 * f, ry = 17.5 + 2.2 * f, sq = ry / rx;
  const col = L.flood ? '#ffffff' : L.deep ? '#2c8fa6' : '#3fb8a8', hi = L.flood ? '#fff6d0' : '#eaf8f5';
  ctx.save(); ctx.translate(0, 3);
  if (f > 0.05) { const gr = ctx.createRadialGradient(0, 0, 4, 0, 0, rx); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, 0.1 + 0.16 * f)); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill(); }
  const ring = (rr, ph, w, color, a) => {
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) { const an = i / 36 * TAU, d = rr + Math.sin(an * 6 + t * 2.2 + ph) * amp, px = Math.cos(an) * d, py = Math.sin(an) * d * sq; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.strokeStyle = rgba(color, a); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke();
  };
  ring(rx, 0, 1.4 + 2.2 * f, col, 0.22 + 0.5 * f);
  if (f > 0.25) ring(rx * 0.9, 2, 1 + f, hi, 0.12 + 0.4 * f);
  if (L.wall) for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + 0.13; ctx.save(); ctx.translate(Math.cos(an) * rx, Math.sin(an) * ry); ctx.rotate(an + Math.PI / 2); ctx.fillStyle = rgba('#6b7e8a', 0.9); ctx.strokeStyle = rgba('#1a1622', 0.8); ctx.lineWidth = 0.8; ctx.fillRect(-3, -2, 6, 4); ctx.strokeRect(-3, -2, 6, 4); ctx.restore(); }
  // foam beads riding the ring near the crest
  if (f > 0.7) for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + t * (L.ph === 'ebb' ? -0.4 : 0.5), d = Math.sin(an * 6 + t * 2.2) * amp; ctx.globalAlpha = Math.min(1, (f - 0.7) * 3); circle(ctx, Math.cos(an) * (rx + d), Math.sin(an) * (ry + d * sq) - 0.5, 1.3, hi); }
  ctx.globalAlpha = 1; ctx.restore();
};

// ---------------------------------------------------------------- Lanternkeeper (healer, class 21)
// A night warden in a long soot-grey coat with a deep cowl, brass buttons and belt, the face a lit sliver inside the hood. In the
// right hand a long staff with a crook, and from the crook hangs an iron lantern: seen from above, a cage with a gold flame in it and
// a warm pool round it, the flame as tall as the Embers in the kit (your own hero reads them; everyone else's stands at about three
// quarters). Casting lifts the lantern and throws four spikes of light; Lighthouse turns a long pale beam round it. A small lantern
// hangs from the belt at the left hip and an ember glows in the left palm. Beacon: a short brass post strapped across the back with a
// steady flame on it; Wayfarer: a travel pack with three little lights swinging from it and an ember-orange scarf streaming behind.
function lanternkeeperLevel(st) {
  const g = typeof window !== 'undefined' && window.__game, kit = g && g.player && g.player.st === st && g.actor && g.actor.kit;
  const now = typeof FX !== 'undefined' ? FX.now : (st ? st.t : 0);
  if (kit && kit.g && kit.g.lan) {
    const max = typeof lkEmbMax === 'function' ? lkEmbMax(kit) : 4;
    return { f: Math.max(0, Math.min(1, (kit.g.emb || 0) / max)), light: kit.now < (kit.g.lightUntil || 0), stride: kit.now < (kit.g.strideUntil || 0) };
  }
  const m = st && st.lk;
  return { f: 0.75, light: !!(m && m.light && now < m.light), stride: !!(m && m.stride && now < m.stride) };
}
HERO_ART.lanternkeeper = function (ctx, st) {
  const coat = '#4a463f', coatD = '#2c2925', coatL = '#625d54', brass = '#b98f45', brassL = '#e0b866', iron = '#2b2620', skin = '#b07a52', gold = '#ffc46b', hood = '#3a3630';
  const cast = castAmt(st), big = pulse(actP(st, 'big')), now = st.t, L = lanternkeeperLevel(st), f = L.f;
  const wave = Math.sin(now * 2.6) * 1.6 + (st.moving ? Math.sin(now * 9) * 2.2 : 0);
  const fl = 0.9 + 0.1 * Math.sin(now * 9.3) + 0.06 * Math.sin(now * 17);
  // the long coat trailing behind: a scalloped hem that stirs, lit a little along its edge by the lanterns
  const hem = [-6, -11, -14, -12.5, -21 + wave * 0.5, -10, -25 + wave, -6, -23 + wave, -2.5, -28 + wave * 1.1, 0.5, -23 + wave, 3.5, -26 + wave, 7, -20 + wave * 0.5, 10.5, -13, 12.5, -6, 11];
  poly(ctx, hem, coatD, OUT, 2);
  line(ctx, -8, -5, -20 + wave * 0.5, -4, coat, 1.2); line(ctx, -8, 5, -20 + wave * 0.5, 4, coat, 1.2); line(ctx, -8, 0, -22 + wave * 0.8, 0.5, coat, 1);
  ctx.save(); ctx.strokeStyle = gold; ctx.globalAlpha = (0.16 + 0.2 * f) * fl; ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-25 + wave, -6); ctx.lineTo(-23 + wave, -2.5); ctx.lineTo(-28 + wave * 1.1, 0.5); ctx.lineTo(-23 + wave, 3.5); ctx.lineTo(-26 + wave, 7); ctx.stroke(); ctx.restore();
  feet(ctx, st, '#1e1b17');
  torso(ctx, coat, 9.5, 14.5);
  // the capelet over the shoulders with a brass edge, a belt across the middle with its buckle, buttons down the front
  ellipse(ctx, -1.5, 0, 7, 15.8, 0, coatD, OUT, 1.7);
  ellipse(ctx, -1.5, 0, 5.4, 14, 0, null, rgba(brass, 0.55), 0.9);
  ellipse(ctx, 0, -3, 2.8, 7.4, 0.15, shade(coatD, 0.12));
  rrect(ctx, -3.6, -13.6, 2.8, 27.2, 1, '#6b4a2b', OUT, 1); line(ctx, -2.2, -12.4, -2.2, 12.4, brass, 0.8);
  line(ctx, -4.5, -12, 4.5, 9.5, '#2b1c10', 3.6); line(ctx, -4.5, -12, 4.5, 9.5, '#7a5230', 2.2);   // the leather strap across the chest
  rrect(ctx, -1.8, -3.4, 3.4, 4.4, 0.8, brass, OUT, 0.8); rrect(ctx, -0.9, -2.2, 1.6, 2, 0.5, iron);
  rrect(ctx, -4.4, -2.6, 4.2, 5.2, 1, brass, OUT, 1); rrect(ctx, -3.4, -1.3, 2.2, 2.6, 0.6, iron);
  for (const bx of [3.2, 6.4]) { circle(ctx, bx, 0, 1, brass, OUT, 0.6); }
  // the small lantern at the left hip
  glow(ctx, 0, -13.4, 7 + f * 2, gold, (0.16 + 0.12 * f) * fl);
  circle(ctx, 0, -13.4, 3.1, iron, OUT, 1.1); circle(ctx, 0, -13.4, 1.9, '#ffb04a'); circle(ctx, 0, -13.4, 0.8 + 0.4 * f, '#fff0b8');
  // the left hand: an ember cupped in the palm (flares when you cast)
  hand(ctx, 7, -9.2, '#6b4a2e');
  glow(ctx, 8.6, -9.4, 5 + cast * 4, '#ff9a3a', 0.45 + cast * 0.4); circle(ctx, 8.6, -9.4, 1.1 + cast * 0.8, '#ffd27a');
  // the staff with its crook, and the lantern hanging from it
  const tx = 22 + cast * 3 + big * 2, ty = 11.5 - cast * 1.2;
  limb(ctx, [-6, 13.5, 6, 12.5, tx - 1, ty], '#5a4630', 2.4);
  ctx.save(); ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(tx - 1, ty - 0.5, 2.9, -2.4, 1.2); ctx.stroke();
  ctx.strokeStyle = brassL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tx - 1, ty - 0.5, 2.9, -2.4, 1.2); ctx.stroke(); ctx.restore();
  // the pale beam while Lighthouse stands: a long wedge turning slowly round the lantern, faint
  if (L.light) {
    const ba = now * 1.2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 2; b++) { const a = ba + b * Math.PI; ctx.fillStyle = 'rgba(255,224,160,0.2)'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a - 0.1) * 70, ty + Math.sin(a - 0.1) * 70); ctx.lineTo(tx + Math.cos(a + 0.1) * 70, ty + Math.sin(a + 0.1) * 70); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  glow(ctx, tx, ty, 13 + cast * 8 + f * 5 + (L.light ? 8 : 0), L.light ? '#fff0c8' : gold, (0.34 + f * 0.2 + cast * 0.3) * fl);
  if (cast > 0.05 || big > 0.05) {
    const k = Math.max(cast, big);
    ctx.save(); ctx.strokeStyle = '#ffe9b0'; ctx.lineCap = 'round'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85 * k;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4 + now * 0.8; ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * 6.5, ty + Math.sin(a) * 6.5); ctx.lineTo(tx + Math.cos(a) * (10 + 6 * k), ty + Math.sin(a) * (10 + 6 * k)); ctx.stroke(); }
    ctx.restore();
  }
  // the lantern from above: an iron cage round a lit core, four bars, a brass roof cap
  circle(ctx, tx, ty, 5.6, iron, OUT, 1.4);
  circle(ctx, tx, ty, 4.1, '#ffb04a'); circle(ctx, tx, ty, 2.5 + f * 1.1 + (L.light ? 0.8 : 0), L.light ? '#fff6dc' : '#ffe08a'); circle(ctx, tx + 0.3, ty - 0.3, 1.1 + f * 0.6, '#fffdf0');
  ctx.save(); ctx.strokeStyle = iron; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx - 4.6, ty); ctx.lineTo(tx + 4.6, ty); ctx.moveTo(tx, ty - 4.6); ctx.lineTo(tx, ty + 4.6); ctx.stroke(); ctx.restore();
  circle(ctx, tx, ty, 1.7, brass, OUT, 0.7);
  hand(ctx, 7.5, 12.2, '#6b4a2e');
  // the braid over the shoulder, dark with a few grey streaks, a leather tie at its end
  braid(ctx, -3, -8, -14, -12, '#3a2e28', '#7a5230', 5);
  line(ctx, -5, -8.6, -8.6, -10, '#9a948c', 0.7); line(ctx, -9, -10.2, -12, -11.4, '#9a948c', 0.6);
  // the hat: a wide soft brim in worn slate, a dented crown, a brass badge on the band; the face a sliver under its front edge
  ellipse(ctx, -1.6, 0, 10, 11, 0, '#57534a', OUT, 2);
  ellipse(ctx, -2, 0, 8.2, 9.2, 0, null, rgba('#1e1b17', 0.4), 1);
  ellipse(ctx, 6.4, 0, 3.4, 5.4, 0, '#17120d', OUT, 0.9);
  ellipse(ctx, 7.4, 0, 2, 3.4, 0, skin);
  circle(ctx, 6.6, 2.3, 0.9, rgba('#2b2620', 0.55));
  glow(ctx, 7.6, 0, 6.5, gold, (0.22 + 0.2 * f) * fl);
  circle(ctx, 8.1, -1.3, 0.6, '#2a1c14'); circle(ctx, 8.1, 1.3, 0.6, '#2a1c14');
  ellipse(ctx, -2, -8, 3.8, 2.2, 0.3, coatL, OUT, 0.8);   // the brim's soft fold
  circle(ctx, -1.2, 0, 6.2, '#66615a', OUT, 1.7);
  circle(ctx, -1.2, 0, 5.6, null, '#26221d', 1.3);
  circle(ctx, -2.8, -2.4, 2.4, shade('#66615a', 0.22));
  circle(ctx, 3.2, -4.2, 1.7, brass, OUT, 0.7); circle(ctx, 3.2, -4.2, 0.6, brassL);
};
Object.assign(SPEC_ART, {
  // Beacon: a short brass post strapped across the back with a steady flame on it (it does not flicker: the fixed star)
  beacon(ctx, st) {
    const gold = '#ffd27a', f = lanternkeeperLevel(st).f;
    glow(ctx, -9.5, -8.5, 12 + f * 4, gold, 0.28 + 0.1 * f);
    line(ctx, -9.5, -8.5, -9.5, 8, '#6b5531', 2.4); line(ctx, -9.5, -8.5, -9.5, 8, '#b98f45', 1);
    rrect(ctx, -12.2, 3.5, 5.4, 2.2, 0.8, '#b98f45', OUT, 0.8);
    circle(ctx, -9.5, -9.4, 3.6, '#2b2620', OUT, 1.1); circle(ctx, -9.5, -9.4, 2.4, '#ffe0a0'); circle(ctx, -9.5, -9.4, 1.1, '#fffdf0');
    line(ctx, -14, -2.5, -5, 2.5, '#3a2c1c', 1.6);
  },
  // Wayfarer: a travel pack on the back with three small lights swinging from it, and an ember-orange scarf streaming behind
  wayfarer(ctx, st) {
    const now = st.t, sw = Math.sin(now * 3) * 1.2 + (st.moving ? Math.sin(now * 9) * 2.4 : 0);
    ctx.save(); ctx.strokeStyle = '#ff9f5a'; ctx.lineCap = 'round';
    for (const [w0, a] of [[3.2, 1], [1.4, 0.6]]) { ctx.globalAlpha = a; ctx.lineWidth = w0; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.quadraticCurveTo(-13 + sw * 0.4, -9 - sw, -22 + sw, -6 + sw * 1.4 - (a < 1 ? 3 : 0)); ctx.stroke(); }
    ctx.restore();
    ellipse(ctx, -9.5, 0, 5.4, 8.8, 0, '#6b4a2b', OUT, 1.5); ellipse(ctx, -9.5, 0, 3.3, 6.4, 0, '#8a6238');
    line(ctx, -4.6, -5.6, 2, -9, '#3a2c1c', 1.3); line(ctx, -4.6, 5.6, 2, 9, '#3a2c1c', 1.3);
    rrect(ctx, -14.4, -2.2, 3.2, 4.4, 0.8, '#b98f45', OUT, 0.7);
    for (let i = 0; i < 3; i++) {
      const y0 = -6.5 + i * 6.5, sx = -16 - Math.abs(sw) * 0.3 - i * 0.6, sy = y0 + Math.sin(now * 3.4 + i * 2) * 1 + sw * 0.4;
      line(ctx, -13, y0 * 0.7, sx, sy, '#3a2c1c', 0.8);
      glow(ctx, sx, sy, 5.5, '#ff9f5a', 0.4 + 0.1 * Math.sin(now * 8 + i)); circle(ctx, sx, sy, 1.9, '#2b2620', OUT, 0.7); circle(ctx, sx, sy, 1, '#ffd27a');
    }
  },
});

// ---------------------------------------------------------------- Kenseier (tank, class 22)
// A tall figure in an ash-grey haori over dark lacquered plates, wide sleeves, a cloth mask and a headband whose tails stream behind,
// one long single-edged blade held two-handed with an ember-orange edge. Rests low and out to the right; Deflect (anim 'guard')
// brings it flat across the front with a spark where it meets the blow; the cuts swing it; big moves lift it.
// (The Perfect spark, rings and trails are ABILITY_VFX.kenseier; the closing ring on the feet is main.js drawKenRing.)
function kenseierBlade(st) {
  const s = swing(actP(st, 'attack')), g = pulse(actP(st, 'guard')), big = pulse(actP(st, 'big')), dir = swingDir(st);
  const rot = 0.5 + dir * s * 1.0 - g * 2.05 - big * 1.5;
  const px = 8 + 5 * g - 2 * big, py = 9 + 1.5 * g - 3 * big, c = Math.cos(rot), sn = Math.sin(rot);
  return { rot, px, py, g, big, s, c, sn, tx: px + c * 38, ty: py + sn * 38, mx: px + c * 24, my: py + sn * 24 };
}
HERO_ART.kenseier = function (ctx, st) {
  const ash = '#a29d94', ashL = '#c8c3b9', ashD = '#6c6861', char = '#2b2b31', charD = '#1b1b20', charL = '#46464e', ember = '#ff8a3d', hot = '#ffd9b0';
  const B = kenseierBlade(st), now = st.t, fl = 0.85 + 0.15 * Math.sin(now * 7.1) + 0.05 * Math.sin(now * 13);
  const wave = Math.sin(now * 3) * 1.6 + (st.moving ? Math.sin(now * 10) * 2.2 : 0);
  // the haori's long back panel: ash grey with an ember thread along the hem, pleats down it
  poly(ctx, [-3, -12, -15, -13.5, -24 + wave, -10, -28 + wave, -4, -26 + wave * 1.1, 0, -28 + wave, 4, -24 + wave, 10, -15, 13.5, -3, 12], ash, OUT, 2);
  for (const y of [-7, -3.5, 0, 3.5, 7]) line(ctx, -8, y * 1.1, -22 + wave * 0.8, y * 1.15, ashD, 0.9);
  for (const [x, y, r] of [[-13, -5, 1.9], [-18, 5.5, 1.5], [-10.5, 7.5, 1.2], [-20, -1, 1.1]]) ellipse(ctx, x + wave * 0.5, y, r * 1.4, r, 0.5, rgba(charD, 0.55));   // burn scars
  ctx.save(); ctx.strokeStyle = rgba(ember, 0.75 * fl); ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-24 + wave, -10); ctx.lineTo(-28 + wave, -4); ctx.lineTo(-26 + wave * 1.1, 0); ctx.lineTo(-28 + wave, 4); ctx.lineTo(-24 + wave, 10); ctx.stroke(); ctx.restore();
  feet(ctx, st, charD);
  torso(ctx, char, 9.5, 14);
  // the lacquered shoulder plates (sode): three stacked lames each side, a rim of ash on the top one
  for (const sy of [-1, 1]) {
    for (let i = 0; i < 3; i++) ellipse(ctx, 0.5 - i * 1.3, (11.5 + i * 1.2) * sy, 5.4, 3.6, 0.12 * sy, i === 0 ? charL : i === 1 ? char : charD, OUT, 1.2);
    ellipse(ctx, 0.5, 11.5 * sy, 4.2, 2.6, 0.12 * sy, null, rgba(ember, 0.7), 0.8);
  }
  // the haori over the chest: two ash panels crossing, an ember-orange piping at the lapel, the obi knotted at the hip
  ellipse(ctx, -2, 0, 6.4, 13.6, 0, ash, OUT, 1.6);
  line(ctx, -5, -11, 3.5, 9, ashD, 1.3); line(ctx, 3, -11, -5, 9, ashD, 1.3);
  line(ctx, -5, -11, 3.5, 9, rgba(ember, 0.8), 0.7);
  rrect(ctx, -4.6, -12.6, 3.2, 25.2, 1, charD, OUT, 1); line(ctx, -3, -11.4, -3, 11.4, rgba(ember, 0.55), 0.7);
  circle(ctx, -3, 12.6, 1.8, ember, OUT, 0.8);
  // the arms: wide ash sleeves to the hands, the leading (right) hand at the tsuba, the other at the pommel
  const hx2 = B.px - B.c * 8, hy2 = B.py - B.sn * 8;
  limb(ctx, [1, 11, (1 + B.px) / 2 + 1, (11 + B.py) / 2 + 2, B.px, B.py], ash, 4.6);
  limb(ctx, [1, -11, (1 + hx2) / 2, (-11 + hy2) / 2 - 1.5, hx2, hy2], ash, 4.6);
  for (const [sx, sy, hx, hy] of [[1, 11, B.px, B.py], [1, -11, hx2, hy2]]) {   // the forearms in black kote, bound with rope
    limb(ctx, [sx + (hx - sx) * 0.5, sy + (hy - sy) * 0.5 + (sy < 0 ? -0.8 : 1), hx, hy], char, 4.4);
    ellipse(ctx, sx + (hx - sx) * 0.72, sy + (hy - sy) * 0.72, 1, 2.6, Math.atan2(hy - sy, hx - sx), null, ashL, 1);
  }
  // the blade (local space: along +x from the hand): grip wrapped in ash, a round charcoal guard, a gold collar, a long single edge
  ctx.save(); ctx.translate(B.px, B.py); ctx.rotate(B.rot);
  glow(ctx, 20, 1.2, 15 + B.g * 5, ember, (0.16 + B.g * 0.2 + B.s * 0.2) * fl);
  poly(ctx, [-12, -1.6, 0, -1.6, 0, 1.6, -12, 1.6], charD, OUT, 1.2);
  for (let i = 0; i < 4; i++) line(ctx, -11 + i * 3, -1.4, -9 + i * 3, 1.4, ash, 0.9);
  circle(ctx, -12.4, 0, 1.9, charL, OUT, 0.9);
  ellipse(ctx, 0.8, 0, 1.8, 4.6, 0, charL, OUT, 1.2); ellipse(ctx, 0.8, 0, 0.9, 2.6, 0, '#d8b25a');
  ctx.beginPath(); ctx.moveTo(2, -1.9); ctx.lineTo(33, -2.5); ctx.quadraticCurveTo(39.5, -1.9, 39, 0.9); ctx.lineTo(33, 2.8); ctx.lineTo(2, 2.1); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.fillStyle = '#d6d2c9'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
  line(ctx, 3, -0.6, 32, -0.9, '#a7a39a', 0.9);   // the ridge of the blade
  for (const [x, y] of [[8, -1.2], [14, 0.1], [19.5, -1.4], [26, -0.2], [30, -1.5]]) circle(ctx, x, y, 0.75, '#8a6a4a');   // old rust
  ctx.save(); ctx.globalAlpha = Math.min(1, 0.95 * fl); line(ctx, 3, 1.7, 37, 1.9, ember, 1.8); line(ctx, 4, 1.65, 34, 1.75, hot, 0.7); ctx.restore();   // the ember edge
  ctx.restore();
  // a spark where the blade meets a blow (Deflect: its press brings the blade flat across the front)
  if (B.g > 0.35) {
    glow(ctx, B.mx, B.my, 12 * B.g, '#ffffff', 0.5 * B.g); glow(ctx, B.mx, B.my, 17 * B.g, ember, 0.5 * B.g);
    ctx.save(); ctx.strokeStyle = hot; ctx.lineCap = 'round'; ctx.lineWidth = 1.1; ctx.globalAlpha = B.g;
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4, r0 = 2 + B.g * 2, r1 = 6 + B.g * 6 + (i % 2) * 3; ctx.beginPath(); ctx.moveTo(B.mx + Math.cos(a) * r0, B.my + Math.sin(a) * r0); ctx.lineTo(B.mx + Math.cos(a) * r1, B.my + Math.sin(a) * r1); ctx.stroke(); }
    ctx.restore();
  }
  hand(ctx, hx2, hy2, charD); hand(ctx, B.px, B.py, charD);
  // the head: a dark topknot, an ash headband with its tails streaming behind, the lower face under a charcoal cloth mask, two ember glints
  const tl = Math.sin(now * 5) * 1.4 + (st.moving ? Math.sin(now * 12) * 2 : 0);
  limb(ctx, [-6.5, -2, -13 + tl * 0.4, -3 - tl, -20 + tl, -2 + tl * 1.3], ashL, 1.8);
  limb(ctx, [-6.5, 2, -13 + tl * 0.4, 3 + tl * 0.6, -19 + tl, 4 + tl * 1.1], ash, 1.8);
  poly(ctx, [-20 + tl, -2 + tl * 1.3, -23 + tl, -4 + tl * 1.3, -22 + tl, -1 + tl * 1.3, -24 + tl, 0.5 + tl * 1.3], ashL, OUT, 0.8);   // torn ends
  poly(ctx, [-19 + tl, 4 + tl * 1.1, -22 + tl, 2.6 + tl * 1.1, -21.5 + tl, 5 + tl * 1.1, -23.5 + tl, 6 + tl * 1.1], ash, OUT, 0.8);
  circle(ctx, 0.5, 0, 7.5, charD, OUT, 2);
  circle(ctx, -1.6, -2.4, 2.5, charL);
  circle(ctx, -6.2, 0, 2.5, charD, OUT, 1);   // the topknot
  ctx.save(); ctx.strokeStyle = ashL; ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0.5, 0, 6.2, -1.45, 1.45); ctx.stroke();
  ctx.strokeStyle = rgba(ember, 0.7); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0.5, 0, 7.1, -1.2, 1.2); ctx.stroke(); ctx.restore();
  ellipse(ctx, 6.3, 0, 2.6, 4.4, 0, char, OUT, 1);   // the mask
  line(ctx, 5.4, -3.2, 7.4, 0, charL, 0.8); line(ctx, 7.4, 0, 5.4, 3.2, charL, 0.8);
  circle(ctx, 6.9, -1.9, 0.75, ember); circle(ctx, 6.9, 1.9, 0.75, ember);
  glow(ctx, 7, 0, 5, ember, 0.28 * fl);
};
Object.assign(SPEC_ART, {
  // Deathblade: the edge burns hotter, sparks lifting off the tip, an ember-orange sash knotted at the back streaming behind
  deathblade(ctx, st) {
    const B = kenseierBlade(st), now = st.t, wv = Math.sin(now * 3.4) * 1.6 + (st.moving ? Math.sin(now * 10) * 2.2 : 0);
    ctx.save(); ctx.strokeStyle = '#ff8a3d'; ctx.lineCap = 'round';
    for (const [w0, a, dy] of [[2.6, 0.9, 0], [1.2, 0.6, 2.2]]) { ctx.globalAlpha = a; ctx.lineWidth = w0; ctx.beginPath(); ctx.moveTo(-4, 11); ctx.quadraticCurveTo(-13 + wv * 0.4, 14 + dy, -21 + wv, 12 + dy + wv * 0.8); ctx.stroke(); }
    ctx.restore();
    poly(ctx, [-21 + wv, 12 + wv * 0.8, -25 + wv, 10.5 + wv * 0.8, -23.5 + wv, 13.5 + wv * 0.8, -26 + wv, 14.5 + wv * 0.8], '#ff8a3d', OUT, 0.7);   // the torn tip
    glow(ctx, B.tx, B.ty, 11 + B.s * 6, '#ff6a2a', 0.34);
    for (let i = 0; i < 4; i++) {
      const q = (now * 0.9 + i / 4) % 1, x = B.mx + (B.tx - B.mx) * (i / 3) + Math.sin(q * 7 + i * 2) * 2.5, y = B.my + (B.ty - B.my) * (i / 3) - q * 11;
      ctx.save(); ctx.globalAlpha = Math.sin(q * Math.PI) * 0.9; circle(ctx, x, y, 1.1 + (i % 2) * 0.5, i % 2 ? '#ffd9b0' : '#ff8a3d'); ctx.restore();
    }
  },
  // Warden of the Ash: a pale ash mantle over the left shoulder and a thin pale arc standing off the left side, turning with the blade
  warden(ctx, st) {
    const B = kenseierBlade(st), now = st.t;
    ellipse(ctx, 0.5, -11.2, 6.6, 4.4, -0.1, '#d9d4ca', OUT, 1.3);
    ellipse(ctx, 0, -11.4, 4.6, 2.8, -0.1, null, 'rgba(255,138,61,0.55)', 0.8);
    for (const [x, y] of [[-1.5, -11], [1.8, -12.4], [3.4, -10.2], [-3.4, -12.6]]) poly(ctx, [x - 1.1, y, x, y - 0.9, x + 1.1, y, x, y + 0.9], '#7a756c');   // the mantle's dark diamonds
    for (let i = 0; i < 3; i++) { const x = -4 - i * 2.2, sw = Math.sin(now * 2.6 + i) * 0.8; ellipse(ctx, x + sw, -14 - i * 0.6, 2.2, 1.1, 0.3, '#b8b3a8', OUT, 0.7); }
    ctx.save(); ctx.strokeStyle = '#e8e2d6'; ctx.lineCap = 'round'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45 + 0.35 * B.g + 0.1 * Math.sin(now * 2);
    const a0 = -2.2 - B.g * 0.5; ctx.beginPath(); ctx.arc(2, 0, 20, a0, a0 + 1.1); ctx.stroke();
    ctx.globalAlpha *= 0.6; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(2, 0, 22.5, a0 + 0.1, a0 + 0.85); ctx.stroke(); ctx.restore();
  },
});

// ---------------------------------------------------------------- Houndmaster (melee DPS, class 23)
// A lean huntsman in a moss-green coat with a thick pale fur collar and a leather cap with a rust feather in the band, a tan belt with a long
// skinning knife in his right hand and a hunting horn slung at his left hip. Rests with the knife low and forward; the knife swings on a cut;
// a whistle (anim 'cast' / 'big') brings his left hand to his mouth around a small bone whistle, with a curve of notes; Wild Hunt lifts the horn
// to his lips. (The hounds are arena/kennel.js; the notes, bites and dust are ABILITY_VFX.houndmaster and KIT_VFX.)
function houndmasterKnife(st) {
  const s = swing(actP(st, 'attack')), dir = swingDir(st), big = pulse(actP(st, 'big'));
  const rot = 0.32 + dir * s * 1.15 - big * 0.9, px = 7.5 + 2.5 * Math.max(0, s) - big * 2, py = 9.2 - 1.2 * big, c = Math.cos(rot), sn = Math.sin(rot);
  return { s, big, rot, px, py, c, sn, tx: px + c * 26, ty: py + sn * 26 };
}
HERO_ART.houndmaster = function (ctx, st) {
  const moss = '#5a7a46', mossD = '#3d5632', tan = '#b08a5a', tanD = '#7c5d38', fur = '#cfc7b3', furD = '#a39b88', skin = '#c9946a', rust = '#c46a3a', brass = '#c9a23f', boot = '#2b2218';
  const K = houndmasterKnife(st), cast = Math.max(castAmt(st), 0), big = K.big, now = st.t;
  const wave = Math.sin(now * 3) * 1.4 + (st.moving ? Math.sin(now * 10) * 2 : 0);
  // the long coat's back panel: a split skirt of moss with a darker lining, swaying when he walks
  poly(ctx, [-3, -11.5, -12, -13, -21 + wave, -10, -24 + wave, -5, -22 + wave * 1.1, -1.2, -24 + wave, 1.2, -22 + wave * 1.1, 5, -24 + wave, 10, -21 + wave, 10, -12, 13, -3, 11.5], moss, OUT, 2);
  line(ctx, -8, 0, -22 + wave, 0, mossD, 1.6); line(ctx, -7, -6, -20 + wave * 0.8, -6.5, mossD, 0.9); line(ctx, -7, 6, -20 + wave * 0.8, 6.5, mossD, 0.9);
  feet(ctx, st, boot);
  torso(ctx, moss, 9.6, 14.2);
  // leather straps across the coat, a tan belt with a brass buckle, a pouch on the left hip and the knife's sheath on the right
  line(ctx, -5.5, -11.5, 4.5, 8.5, tanD, 3.6); line(ctx, -5.5, -11.5, 4.5, 8.5, tan, 2.1);
  rrect(ctx, -2.6, -13.6, 3.6, 27.2, 1.2, tan, OUT, 1.1); rrect(ctx, -2, -2.6, 2.6, 4.4, 0.8, brass, OUT, 0.8);
  rrect(ctx, -3.6, -14.2, 5.4, 5, 1.4, tanD, OUT, 1); circle(ctx, -0.9, -11.7, 0.8, brass);
  rrect(ctx, -4.5, 10.4, 11, 3.2, 1.4, tanD, OUT, 1);
  // the hunting horn: a brass curl slung at the left hip, its bell out to the front (Wild Hunt lifts it to his lips)
  if (big < 0.25) {
    ctx.save(); ctx.translate(-0.5, -13.6); ctx.rotate(0.35);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 5.4;
    ctx.beginPath(); ctx.moveTo(-6, 1.5); ctx.bezierCurveTo(-6, -6, 6, -7, 9, -1); ctx.stroke();
    ctx.strokeStyle = brass; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-6, 1.5); ctx.bezierCurveTo(-6, -6, 6, -7, 9, -1); ctx.stroke();
    ctx.strokeStyle = '#f0d98a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5.6, 0.2); ctx.bezierCurveTo(-5, -5, 4.5, -5.8, 7.4, -1.4); ctx.stroke();
    ellipse(ctx, 9.4, -0.8, 2.6, 3.6, -0.4, brass, OUT, 1); ellipse(ctx, 9.7, -0.8, 1.1, 1.9, -0.4, '#3a2a14');
    ctx.restore();
  }
  // the right arm and the long knife (a swing carries it round; rest has it forward and low)
  limb(ctx, [1, 11, (1 + K.px) / 2 + 1, (11 + K.py) / 2 + 1.5, K.px, K.py], moss, 4.4);
  ctx.save(); ctx.translate(K.px, K.py); ctx.rotate(K.rot);
  if (K.s > 0.15 || K.big > 0.2) glow(ctx, 18, 0, 12, '#ffffff', 0.12 + K.s * 0.2);
  rrect(ctx, -6, -1.5, 8, 3, 1.2, tanD, OUT, 1); for (let i = 0; i < 3; i++) line(ctx, -5 + i * 2.5, -1.4, -3.8 + i * 2.5, 1.4, tan, 0.8);
  circle(ctx, -6.4, 0, 1.7, brass, OUT, 0.8); line(ctx, -6.4, 0, -10, 3 + Math.sin(now * 5) * 1, rust, 1.2);   // a dented brass pommel, a rust thong swinging from it
  rrect(ctx, 1.4, -3.6, 2, 7.2, 0.8, brass, OUT, 0.9);
  ctx.beginPath(); ctx.moveTo(3.4, -2.3); ctx.lineTo(23, -2.4); ctx.quadraticCurveTo(29, -0.2, 28, 1.4); ctx.lineTo(23, 2.3); ctx.lineTo(3.4, 2.1); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.fillStyle = '#c9ccd0'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
  line(ctx, 4.5, -0.6, 25, -0.4, '#8f949a', 0.9); line(ctx, 5, 1.4, 24, 1.5, '#eef0f2', 0.7);
  ctx.restore();
  hand(ctx, K.px, K.py, skin);
  // the left hand: relaxed at his side, then up to his mouth around a small bone whistle when he whistles
  const wq = Math.min(1, cast * 1.3), lx = 4 + wq * 5.4, ly = -10.5 + wq * 8;
  limb(ctx, [1, -11, (1 + lx) / 2 - 0.5, (-11 + ly) / 2 - 1, lx, ly], moss, 4.4);
  hand(ctx, lx, ly, skin);
  if (wq > 0.25) {
    ctx.save(); ctx.globalAlpha = wq;
    ellipse(ctx, lx + 1.6, ly - 0.2, 2.4, 1.2, 0.2, '#efe4c6', OUT, 0.8); circle(ctx, lx + 2.8, ly - 0.2, 0.6, '#3a2a14');
    ctx.strokeStyle = '#f2e6c8'; ctx.lineCap = 'round'; ctx.lineWidth = 1.1;
    for (let i = 0; i < 2; i++) { const r = 5 + i * 3.2 + (1 - wq) * 3; ctx.globalAlpha = wq * (0.8 - i * 0.3); ctx.beginPath(); ctx.arc(lx + 2, ly, r, -0.7, 0.7); ctx.stroke(); }
    ctx.restore();
  }
  // Wild Hunt: the horn raised to his lips, its bell flaring forward, brass shining
  if (big >= 0.25) {
    const hb = Math.min(1, (big - 0.25) / 0.4);
    ctx.save(); ctx.translate(8.5, -2.4); ctx.rotate(-0.2);
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(-2, 2); ctx.bezierCurveTo(1, 8, 10, 8, 14, 1); ctx.stroke();
    ctx.strokeStyle = brass; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-2, 2); ctx.bezierCurveTo(1, 8, 10, 8, 14, 1); ctx.stroke();
    ellipse(ctx, 15.4, 0.6, 2.4, 4.8 * hb + 1, 0.2, brass, OUT, 1); ellipse(ctx, 15.8, 0.6, 1, 2.6 * hb + 0.4, 0.2, '#3a2a14');
    glow(ctx, 15, 0.6, 12, '#ffe2a0', 0.4 * hb);
    ctx.restore();
    hand(ctx, 7.5, -3.4, skin);
  }
  // the fur collar: a thick ring of pale tufts round the neck
  const nT = 11;
  for (let i = 0; i < nT; i++) { const a = i * TAU / nT + 0.3, r = 8.8 + (i % 2) * 0.7; circle(ctx, 0.2 + Math.cos(a) * r * 0.9, Math.sin(a) * r, 3.1, i % 2 ? fur : furD, OUT, 1); }
  circle(ctx, 0.3, 0, 8.4, fur, OUT, 1.2);
  // the head: a leather cap with a short front brim and a rust feather tucked in its band, the face a sliver at the front
  ellipse(ctx, 6.4, 0, 2.6, 4.3, 0, skin, OUT, 1);
  line(ctx, 7.6, -1.4, 8.4, -0.4, '#3a2a1a', 0.8);
  circle(ctx, 0.2, 0, 7, tanD, OUT, 1.8);
  circle(ctx, -0.8, -2, 2.2, tan);
  ctx.save(); ctx.strokeStyle = rgba(OUT, 0.55); ctx.lineWidth = 0.7; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; ctx.beginPath(); ctx.moveTo(0.2 + Math.cos(a) * 2, Math.sin(a) * 2); ctx.lineTo(0.2 + Math.cos(a) * 6.6, Math.sin(a) * 6.6); ctx.stroke(); }
  ctx.restore();
  poly(ctx, [5.2, -4.4, 9.3, -2.8, 9.3, 2.8, 5.2, 4.4], tan, OUT, 1.2);
  ctx.save(); ctx.strokeStyle = rust; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0.2, 0, 6.2, -2.4, -1.2); ctx.stroke(); ctx.restore();
  const fw = Math.sin(now * 4) * 0.8 + (st.moving ? Math.sin(now * 12) * 1.2 : 0);
  limb(ctx, [-1, -6, -4 + fw * 0.4, -8.4, -8 + fw, -9.2], rust, 1.7);
};
Object.assign(SPEC_ART, {
  // Pack Leader: two tabs of leather hung from his belt, one rust and one ash grey (his hounds' spare collars), and a brass whistle on a chain
  // at his chest that glints when he whistles
  packleader(ctx, st) {
    const now = st.t, cast = Math.max(castAmt(st), 0), sw = Math.sin(now * 3) * 0.6 + (st.moving ? Math.sin(now * 9) * 1.2 : 0);
    for (const [y, col] of [[7.2, '#c46a3a'], [10.2, '#b8b2a8']]) {
      limb(ctx, [-2.2, y, -4.8 + sw * 0.4, y + 0.6, -7.2 + sw, y + 1.4], col, 2);
      circle(ctx, -7.6 + sw, y + 1.5, 1.1, '#c9a23f', OUT, 0.7);
    }
    ctx.save(); ctx.strokeStyle = 'rgba(201,162,63,0.8)'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(2.2, -6); ctx.quadraticCurveTo(5.8, -1.2, 3.4, 4.6); ctx.stroke(); ctx.restore();
    ellipse(ctx, 3.4, 4.8, 2.1, 1.1, 0.4, '#c9a23f', OUT, 0.8);
    if (cast > 0.1) glow(ctx, 3.4, 4.8, 7, '#fff0b8', 0.5 * cast);
  },
  // Lone Wolf: a grey wolf pelt over his shoulders and back, the paws at his chest; a leather saddle strap crosses his coat and a coil of rope
  // hangs at his right hip
  lonewolf(ctx, st) {
    const now = st.t, sw = Math.sin(now * 2.6) * 1.1 + (st.moving ? Math.sin(now * 9) * 1.8 : 0);
    poly(ctx, [-3, -12, -11, -13.4, -19 + sw, -10, -23 + sw, -4, -21 + sw * 1.1, 0, -23 + sw, 4, -19 + sw, 10, -11, 13.4, -3, 12, -1, 6, -1, -6], '#8b8e93', OUT, 1.8);
    poly(ctx, [-4, -9, -12, -9.4, -18 + sw, -6, -20 + sw, 0, -18 + sw, 6, -12, 9.4, -4, 9], '#a7aaaf');
    for (const [x, y] of [[-9, -7], [-13, -2.4], [-13, 2.4], [-9, 7], [-17, 0]]) line(ctx, x, y, x - 3.2 + sw * 0.15, y * 1.06, '#6a6d72', 1.1);
    for (const sy of [-1, 1]) { ellipse(ctx, 1.6, sy * 5.2, 2.4, 1.6, sy * 0.4, '#8b8e93', OUT, 1); for (const k of [-1, 0, 1]) circle(ctx, 3.6, sy * 5.2 + k * 1, 0.5, '#e8e6e0'); }
    line(ctx, -6, 11.5, 5, -9, '#2b1c10', 3.2); line(ctx, -6, 11.5, 5, -9, '#6b4a2b', 1.9);
    ctx.save(); ctx.strokeStyle = OUT; ctx.lineWidth = 5.6; ctx.beginPath(); ctx.ellipse(-3, 12.4, 3.6, 3, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#c8b48a'; ctx.lineWidth = 3.2; ctx.stroke();
    ctx.strokeStyle = '#8a7650'; ctx.lineWidth = 0.8; ctx.setLineDash([1.2, 1.6]); ctx.stroke(); ctx.restore();
  },
});
