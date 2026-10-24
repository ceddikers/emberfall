// Class identity gauges. Every class gets its own shape that matches its fantasy, never a plain bar.
// draw(ctx, k, w, h, t): k is the Kit (k.g holds the gauge values), drawn centered in a w x h canvas.

const GAUGES = {
  // Bastion: a heater shield split into four segments that fill with gold Resolve.
  shield(c, k, w, h, t) {
    const v = k.g.resolve / 100, cx = w / 2, top = 10, sw = 70, sh = 84;
    const shape = () => {
      c.beginPath();
      c.moveTo(cx - sw / 2, top);
      c.lineTo(cx + sw / 2, top);
      c.lineTo(cx + sw / 2, top + sh * 0.45);
      c.quadraticCurveTo(cx + sw / 2, top + sh * 0.85, cx, top + sh);
      c.quadraticCurveTo(cx - sw / 2, top + sh * 0.85, cx - sw / 2, top + sh * 0.45);
      c.closePath();
    };
    shape(); c.fillStyle = '#1d2433'; c.fill();
    c.save(); shape(); c.clip();
    const fillTop = top + sh * (1 - v);
    const gr = c.createLinearGradient(0, fillTop, 0, top + sh);
    gr.addColorStop(0, k.has('oath') ? '#fff3b0' : '#f2cf6a'); gr.addColorStop(1, '#a8781e');
    c.fillStyle = gr; c.fillRect(0, fillTop, w, h);
    if (v > 0) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, fillTop, w, 2); }
    for (let i = 1; i < 4; i++) line(c, cx - sw / 2, top + sh * i / 4, cx + sw / 2, top + sh * i / 4, 'rgba(10,12,20,0.75)', 2);
    c.restore();
    shape(); c.lineWidth = 3; c.strokeStyle = k.g.resolve >= 50 ? '#ffe28a' : '#7a8aa8'; c.stroke();
    line(c, cx, top + 4, cx, top + sh - 6, 'rgba(255,255,255,0.12)', 2);
    if (k.g.counter) { glow(c, cx, top + 28, 22, '#bfe0ff', 0.6 + Math.sin(t * 10) * 0.2); crossedSwords(c, cx, top + 28, 9); }
    label(c, String(Math.floor(k.g.resolve)), cx, top + sh + 16, '#f2e6c8', 14, 'system-ui', 800);
  },

  // Bloodreaver: an anatomical heart that fills with Blood and beats faster as it fills; drops = free Drains.
  heart(c, k, w, h, t) {
    const v = k.g.blood / 100, cx = w / 2, cy = 50;
    const beat = 1 + Math.max(0, Math.sin(t * (4 + v * 6))) * (0.04 + v * 0.05);
    const shape = () => {
      c.beginPath();
      c.moveTo(cx, cy + 34 * beat);
      c.bezierCurveTo(cx - 46 * beat, cy + 4, cx - 34 * beat, cy - 38 * beat, cx - 4, cy - 22 * beat);
      c.quadraticCurveTo(cx, cy - 18 * beat, cx + 4, cy - 22 * beat);
      c.bezierCurveTo(cx + 34 * beat, cy - 38 * beat, cx + 46 * beat, cy + 4, cx, cy + 34 * beat);
      c.closePath();
    };
    shape(); c.fillStyle = '#2a1014'; c.fill();
    c.save(); shape(); c.clip();
    const fillTop = cy + 34 - 70 * v;
    c.fillStyle = k.has('frenzy') ? '#ff3040' : (k.def.gauge.color || '#b3131f');   // a spec can recolour it (Berserker's Rage)
    c.beginPath(); c.moveTo(0, fillTop);
    for (let x = 0; x <= w; x += 6) c.lineTo(x, fillTop + Math.sin(x * 0.2 + t * 4) * 2);
    c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.restore();
    // arteries
    limb(c, [cx - 8, cy - 22, cx - 12, cy - 38], '#5a1a22', 5);
    limb(c, [cx + 6, cy - 22, cx + 14, cy - 36, cx + 22, cy - 36], '#5a1a22', 5);
    shape(); c.lineWidth = 2.5; c.strokeStyle = k.g.blood >= 40 ? '#ff6a6a' : '#7a3a40'; c.stroke();
    const gorge = k.stacks('gorge');
    for (let i = 0; i < gorge; i++) { const x = cx - 18 + i * 18, y = cy + 48; poly(c, [x, y - 8, x + 5, y + 2, x, y + 6, x - 5, y + 2], '#ff3a4a', OUT, 1.2); }
    label(c, String(Math.floor(k.g.blood)), cx, cy + 6, '#ffe0e0', 15, 'system-ui', 800);
    // the bank: what the next Drain cashes (the damage taken since the last one); bright once it's worth a Drain
    const bank = Math.round(k.g.bank || 0);
    if (bank > 0) {
      const big = typeof REAVER !== 'undefined' && k.env.maxHp && bank >= k.env.maxHp() * REAVER.GLOW;
      if (big) glow(c, cx + 40, cy + 30, 14, '#ff3a4a', 0.5 + Math.sin(t * 8) * 0.15);
      label(c, String(bank), cx + 40, cy + 34, big ? '#ffd0d0' : '#c08088', 11, 'system-ui', 700);
    }
  },

  // Runeguard: three rune stones orbiting a ward ring; lit stones are Runes ready to use.
  runes(c, k, w, h, t) {
    const cx = w / 2, cy = 50;
    circle(c, cx, cy, 34, 'rgba(60,40,110,0.35)', k.has('overload') ? '#d8c8ff' : '#6a5aa8', 2);
    c.save(); c.translate(cx, cy); c.rotate(t * 0.4);
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); line(c, 0, -30, 0, -36, 'rgba(201,184,255,0.5)', 1.5); }
    c.restore();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * TAU / 3 + Math.sin(t * 0.8) * 0.08;
      const x = cx + Math.cos(a) * 30, y = cy + Math.sin(a) * 30, lit = i < k.g.runes;
      if (lit) glow(c, x, y, 18, '#b18cff', 0.7);
      poly(c, [x, y - 13, x + 9, y, x, y + 13, x - 9, y], lit ? '#5b3fa0' : '#26203a', lit ? '#e6dcff' : '#4a4466', 2);
      if (lit) { line(c, x - 3, y - 5, x + 3, y + 5, '#f2ecff', 1.5); line(c, x + 3, y - 5, x - 3, y + 1, '#f2ecff', 1.5); }
    }
    hexagon(c, cx, cy, 11, 'rgba(159,216,255,0.25)', '#9fd8ff', 1.5, t);
  },

  // Ranger: a quiver holding up to ten arrows (10 Focus each); a glowing eye when Keen Eye is up.
  quiver(c, k, w, h, t) {
    const cx = w / 2 - 6, top = 26, n = Math.floor(k.g.focus / 10);
    c.save(); c.translate(cx, top); c.rotate(0.18);
    for (let i = 0; i < 10; i++) {
      const x = -22 + i * 5, has = i < n;
      if (!has) continue;
      line(c, x, 6, x, -14 - (i % 2) * 4, '#c9b08a', 2);
      poly(c, [x - 3, -14 - (i % 2) * 4, x, -22 - (i % 2) * 4, x + 3, -14 - (i % 2) * 4], i >= 5 ? '#ffe27a' : '#e8e2d0', OUT, 0.8);
    }
    rrect(c, -27, 0, 54, 62, [4, 4, 14, 14], '#6b4a2b', OUT, 2);
    rrect(c, -27, 0, 54, 9, 3, '#8a6238', OUT, 1.5);
    line(c, -20, 22, 20, 22, '#4a3420', 2); line(c, -18, 42, 18, 42, '#4a3420', 2);
    c.restore();
    if (k.has('keen')) {
      const ex = w - 26, ey = 30;
      glow(c, ex, ey, 20, '#ffd27a', 0.6 + Math.sin(t * 8) * 0.2);
      ellipse(c, ex, ey, 12, 7, 0, '#fff3c8', OUT, 1.5);
      circle(c, ex, ey, 4, '#a8641a');
      if (k.stacks('keen') >= 2) label(c, '×2', ex, ey + 16, '#ffd27a', 11, 'system-ui', 800);   // (a second Keen Eye banked)
    }
    if (k.has('barrage')) label(c, '×3', w - 26, 62, '#ffe27a', 14, 'system-ui', 800);
    // Sharpshooter's Steady Aim (five pips) and Venomstrike's Acid (eight drops) down the left of the quiver
    if (k.def.spec === 'sharpshooter') {
      const n = k.stacks('aim');
      for (let i = 0; i < 5; i++) { const y = 84 - i * 12; if (i < n) glow(c, 14, y, 8, '#ffe27a', n >= 5 ? 0.6 : 0.3); circle(c, 14, y, 3.4, i < n ? '#ffe27a' : '#2a2418', i < n ? '#fff6c8' : '#6a5a38', 1); }
    } else if (k.def.spec === 'venomstrike') {
      const n = k.g.acid || 0;
      for (let i = 0; i < 8; i++) { const y = 90 - i * 9.5, on = i < n; circle(c, 14, y, 3, on ? '#9aff4a' : '#1e2a18', on ? '#e4ffc8' : '#4a6a38', 1); }
      if (n >= 8) glow(c, 14, 54, 22, '#9aff4a', 0.4 + Math.sin(t * 8) * 0.15);
    }
    label(c, String(Math.floor(k.g.focus)), cx, top + 80, '#f2e6c8', 13, 'system-ui', 800);
  },

  // Shadowblade: five moon phases in an arc (combo points), with a venom drop while the poison is up.
  moon(c, k, w, h, t) {
    const cx = w / 2, cy = 70;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i + 0.5) * Math.PI / 5;
      const x = cx + Math.cos(a) * 44, y = cy + Math.sin(a) * 44, lit = i < k.g.combo;
      circle(c, x, y, 9, lit ? '#e8dcff' : '#1e1a28', lit ? '#ffffff' : '#4a4060', 1.5);
      if (lit) {
        // carve the crescent: later points are fuller moons
        circle(c, x + 9 - i * 2.2, y - 2, 8.5 - i * 1.6, '#2b2433');
        glow(c, x, y, 14, '#c9a8ff', k.g.combo >= 5 ? 0.6 + Math.sin(t * 8) * 0.2 : 0.3);
      }
    }
    if (k.dotRemaining('poison') > 0) {
      const f = Math.min(1, k.dotRemaining('poison') / 24);
      poly(c, [cx, cy - 22, cx + 9, cy - 4, cx, cy + 4, cx - 9, cy - 4], f < 0.3 ? '#4a7a3a' : '#8aff6a', OUT, 1.5);
      label(c, Math.ceil(k.dotRemaining('poison')) + 's', cx, cy + 22, '#bfffaa', 12, 'system-ui', 700);
    }
    // Bladedancer's Tempo: three small pips down at the left; all three lit, Blade Fury is a Flourish
    if (k.def.spec === 'bladedancer') {
      const n = k.stacks('tempo');
      for (let i = 0; i < 3; i++) {
        const x = cx - 54 + i * 11, y = cy + 20, on = i < n;
        poly(c, [x, y - 5, x + 4, y, x, y + 5, x - 4, y], on ? (n >= 3 ? '#fff0ff' : '#d6b3ff') : '#1e1a28', on ? '#ffffff' : '#4a4060', 1);
      }
      if (n >= 3) glow(c, cx - 43, cy + 20, 16, '#e0c8ff', 0.4 + Math.sin(t * 6) * 0.15);
    }
    if (k.has('dance')) label(c, '✦', cx, cy - 34, '#e0a8ff', 18, 'system-ui');
  },

  // Pyromancer: a glass crucible that fills with Heat; the top band is the danger zone; sparks = procs.
  crucible(c, k, w, h, t) {
    const cx = w / 2, bottom = 92, v = Math.min(1, k.g.heat / 100);
    const shape = () => {
      c.beginPath();
      c.moveTo(cx - 12, 10); c.lineTo(cx + 12, 10); c.lineTo(cx + 12, 54);
      c.arc(cx, bottom - 22, 22, -Math.PI / 2 + 0.55, Math.PI * 1.5 - 0.55);
      c.lineTo(cx - 12, 10); c.closePath();
    };
    shape(); c.fillStyle = '#1e1414'; c.fill();
    c.save(); shape(); c.clip();
    const fillTop = bottom - (bottom - 10) * v;
    const gr = c.createLinearGradient(0, 10, 0, bottom);
    gr.addColorStop(0, '#fff2a0'); gr.addColorStop(0.3, '#ff7a1a'); gr.addColorStop(1, '#a0200a');
    c.fillStyle = gr; c.fillRect(0, fillTop, w, h);
    c.fillStyle = 'rgba(255,40,20,0.18)'; c.fillRect(0, 10, w, (bottom - 10) * 0.15);
    c.restore();
    shape(); c.lineWidth = 2.5; c.strokeStyle = k.g.heat >= 85 ? (Math.sin(t * 14) > 0 ? '#ff4030' : '#ffd060') : '#b07050'; c.stroke();
    line(c, cx - 16, 10 + (bottom - 10) * 0.15, cx + 16, 10 + (bottom - 10) * 0.15, '#ff5040', 1.5);
    if (k.has('burnt')) label(c, '✖', cx, bottom - 18, '#202020', 20, 'system-ui', 800);
    const sparks = k.has('hotstreak') ? 2 : k.has('heating') ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const x = cx + 32, y = 30 + i * 26, on = i < sparks;
      if (on) glow(c, x, y, 14, '#ffb03a', 0.7);
      poly(c, [x, y - 9, x + 4, y - 2, x + 9, y, x + 4, y + 2, x, y + 9, x - 4, y + 2, x - 9, y, x - 4, y - 2], on ? '#ffe27a' : '#3a2a20', OUT, 1);
    }
    // White-Hot (Vent at 90+ lights Hot Streak): a pale tick at 90, and the number burns white past it
    line(c, cx + 12, 10 + (bottom - 10) * 0.1, cx + 18, 10 + (bottom - 10) * 0.1, '#fff4dc', 1.5);
    label(c, String(Math.floor(k.g.heat)), cx - 34, 56, k.g.heat >= 90 ? '#ffffff' : '#ffd8b0', 14, 'system-ui', 800);
  },

  // Cleric: a sun disc ringed by three petals (available Petals) and three inner rays (bloom toward Dawnstar).
  sundial(c, k, w, h, t) {
    const cx = w / 2, cy = 52;
    const toNext = Math.max(0, Math.min(1, 1 - (k.g.petalAt - k.now) / 15));
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * TAU / 3, has = i < k.g.petals;
      const x = cx + Math.cos(a) * 32, y = cy + Math.sin(a) * 32;
      c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
      ellipse(c, 0, 0, 9, 15, 0, has ? '#fff2b0' : '#2a2618', has ? '#e8c15a' : '#5a5030', 1.5);
      c.restore();
    }
    if (k.g.petals < 3) {
      c.beginPath(); c.arc(cx, cy, 44, -Math.PI / 2, -Math.PI / 2 + TAU * toNext);
      c.lineWidth = 2; c.strokeStyle = 'rgba(232,193,90,0.7)'; c.stroke();
    }
    const ready = k.g.bloom >= 3;
    if (ready) glow(c, cx, cy, 30, '#fff0a0', 0.7 + Math.sin(t * 6) * 0.2);
    circle(c, cx, cy, 16, ready ? '#fff6c8' : '#c9a040', OUT, 2);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * TAU / 3 + Math.PI / 3;
      // (a Mend fills half a ray)
      const fill = Math.max(0, Math.min(1, k.g.bloom - i));
      line(c, cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, cx + Math.cos(a) * 25, cy + Math.sin(a) * 25, '#4a4030', 3);
      if (fill > 0) line(c, cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, cx + Math.cos(a) * (18 + 7 * fill), cy + Math.sin(a) * (18 + 7 * fill), '#fff6c8', 3);
    }
  },

  // Grovekeeper: a sprout that grows leaves as Bloom fills, and blooms into a flower at 100.
  sprout(c, k, w, h, t) {
    const cx = w / 2, base = 92, v = k.g.bloom / 100;
    ellipse(c, cx, base, 30, 7, 0, '#4a3420', OUT, 1.5);
    const stemH = 20 + 52 * v, sway = Math.sin(t * 1.5) * 3;
    limb(c, [cx, base - 2, cx + sway * 0.5, base - stemH * 0.5, cx + sway, base - stemH], '#4f9a3a', 3);
    const leaves = Math.floor(v * 6);
    for (let i = 0; i < leaves; i++) {
      const y = base - 12 - i * (stemH - 14) / 6, side = i % 2 ? 1 : -1;
      ellipse(c, cx + side * 10 + sway * (i / 6), y, 10, 4.5, side * 0.5, '#6fd05a', OUT, 1);
    }
    const tx = cx + sway, ty = base - stemH;
    if (k.g.bloom >= 50) {
      const open = Math.min(1, (k.g.bloom - 50) / 50);
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + t * 0.3;
        ellipse(c, tx + Math.cos(a) * 7 * open, ty + Math.sin(a) * 7 * open, 6 * open + 2, 3.5 * open + 1.5, a, '#ffb0d0', OUT, 1);
      }
      circle(c, tx, ty, 4, '#ffe27a', OUT, 1);
      if (k.g.bloom >= 90) glow(c, tx, ty, 18, '#ffb0d0', 0.5 + Math.sin(t * 6) * 0.2);
    } else circle(c, tx, ty, 4, '#8fdc6a', OUT, 1);
    if (k.dotRemaining('thorn') > 0) label(c, '❦ ' + Math.ceil(k.dotRemaining('thorn')), w - 22, 20, k.dotRemaining('thorn') < 9 ? '#ffb070' : '#a8e08a', 11, 'system-ui', 700);
    label(c, String(Math.floor(k.g.bloom)), 18, 20, '#d8f5c8', 13, 'system-ui', 800);
  },

  // Chronomancer: an hourglass whose sand is Flux. In Haste it glows teal and the sand pours down fast.
  hourglass(c, k, w, h, t) {
    const cx = w / 2, top = 8, bot = 92, mid = 50, v = Math.min(1, k.g.flux / 100), haste = k.g.stance === 'haste';
    const frame = haste ? '#5ff0ff' : '#c8d4dc';
    if (haste) glow(c, cx, mid, 46, '#3fd0d0', 0.35);
    // glass
    c.beginPath();
    c.moveTo(cx - 26, top + 6); c.lineTo(cx + 26, top + 6); c.lineTo(cx + 4, mid); c.lineTo(cx + 26, bot - 6); c.lineTo(cx - 26, bot - 6); c.lineTo(cx - 4, mid); c.closePath();
    c.fillStyle = 'rgba(200,240,250,0.08)'; c.fill();
    c.save(); c.clip();
    // top bulb holds Flux, bottom shows what's been spent
    const tFill = (mid - top - 6) * v;
    c.fillStyle = '#e8c15a'; c.fillRect(cx - 30, mid - tFill, 60, tFill);
    const bFill = (bot - 6 - mid) * (1 - v) * 0.85;
    c.fillStyle = '#b8902a'; c.fillRect(cx - 30, bot - 6 - bFill, 60, bFill);
    if (haste && v > 0) { for (let i = 0; i < 4; i++) circle(c, cx + Math.sin(t * 9 + i) * 1.2, mid + ((t * 70 + i * 10) % (bot - mid - 8)), 1.5, '#ffe27a'); }
    c.restore();
    c.beginPath();
    c.moveTo(cx - 26, top + 6); c.lineTo(cx + 26, top + 6); c.lineTo(cx + 4, mid); c.lineTo(cx + 26, bot - 6); c.lineTo(cx - 26, bot - 6); c.lineTo(cx - 4, mid); c.closePath();
    c.lineWidth = 2; c.strokeStyle = frame; c.stroke();
    rrect(c, cx - 32, top, 64, 7, 3, '#5a4a6a', frame, 1.5);
    rrect(c, cx - 32, bot - 7, 64, 7, 3, '#5a4a6a', frame, 1.5);
    if (k.has('lag')) label(c, '…', cx, mid + 6, '#ff8a7a', 22, 'system-ui', 800);
    label(c, haste ? 'HASTE' : 'SLOW', cx, bot + 12, haste ? '#5ff0ff' : '#c8d4dc', 11, 'Cinzel, Georgia, serif', 800);
  },
};

// ---------------------------------------------------------------- the advanced DPS (Thermist, Driftblade)
Object.assign(GAUGES, {
  // Thermist: a two-sided dial, frost blue on the left and ember orange on the right, a centre mark at 0.
  // The needle is the Temperature; a bright bead marks the peak reached since the last crossing (lit once a Shock is armed).
  dial(c, k, w, h, t) {
    const cx = w / 2, cy = 66, R = 46, g = k.g, max = 5;
    const ang = v => -Math.PI / 2 + (v / max) * (Math.PI * 0.42);
    const arc = (v0, v1, r, col, lw) => { c.beginPath(); c.arc(cx, cy, r, ang(v0), ang(v1)); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); };
    c.lineCap = 'butt';
    arc(-max, max, R, 'rgba(242,230,200,0.35)', 14);   // a hairline rim round the empty track
    arc(-max, 0, R, '#1c3044', 11); arc(0, max, R, '#40261a', 11);
    // the filled side, step by step
    const tv = g.temp || 0;
    for (let i = 0; i < Math.abs(tv); i++) {
      const s = Math.sign(tv), v0 = s * i + s * 0.06, v1 = s * (i + 1) - s * 0.06;
      const col = s < 0 ? ['#3a78b8', '#4f94d8', '#6fb2f0', '#9ad0ff', '#d8f0ff'][i] : ['#b8501f', '#d8662a', '#f08236', '#ffa64a', '#ffe08a'][i];
      arc(Math.min(v0, v1), Math.max(v0, v1), R, col, 11);
    }
    // step ticks; the ±5 edges drawn heavier
    for (let v = -max; v <= max; v++) {
      const a = ang(v), r0 = R - 8, r1 = v === 0 || Math.abs(v) === max ? R + 10 : R + 6;
      line(c, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, v === 0 ? '#f2e6c8' : 'rgba(10,12,20,0.85)', v === 0 ? 2 : 1.5);
    }
    // the Shock bead: where the dial peaked since it last crossed 0
    if (g.peak >= 1 && g.side) {
      const pv = g.side * Math.min(max, g.peak), a = ang(pv), x = cx + Math.cos(a) * (R + 13), y = cy + Math.sin(a) * (R + 13);
      const armed = g.peak >= 3;
      if (armed) glow(c, x, y, 10, g.side > 0 ? '#ffb05a' : '#9ad8ff', 0.6 + Math.sin(t * 8) * 0.2);
      circle(c, x, y, armed ? 3.4 : 2.4, armed ? '#ffffff' : '#7a7068', OUT, 1);
    }
    // the needle
    const na = ang(Math.max(-max - 0.4, Math.min(max + 0.4, tv)));
    line(c, cx, cy, cx + Math.cos(na) * (R + 4), cy + Math.sin(na) * (R + 4), OUT, 4);
    line(c, cx, cy, cx + Math.cos(na) * (R + 4), cy + Math.sin(na) * (R + 4), '#f2e6c8', 2);
    circle(c, cx, cy, 5, '#3d2b40', '#f2e6c8', 1.5);
    // edge states: On the Brink rims the edge, Overheat/Frostbite cross the dial out
    if (k.has('brink')) { const s = Math.sign(tv) || 1; c.save(); c.globalAlpha = 0.6 + Math.sin(t * 12) * 0.3; arc(s * 4.1, s * 5, R + 9, s > 0 ? '#ffe08a' : '#d8f0ff', 2); arc(s * 5, s * 4.1, R + 9, s > 0 ? '#ffe08a' : '#d8f0ff', 2); c.restore(); }
    if (k.has('overheat') || k.has('frostbite')) label(c, k.has('overheat') ? 'OVERHEAT' : 'FROSTBITE', cx, cy + 22, k.has('overheat') ? '#ff7a4a' : '#9ad8ff', 10, 'Cinzel, Georgia, serif', 800);
    else label(c, (tv > 0 ? '+' : '') + tv, cx, cy + 22, tv > 0 ? '#ffc890' : tv < 0 ? '#bfe2ff' : '#f2e6c8', 14, 'system-ui', 800);
    if (k.has('attuned')) { c.save(); c.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2; arc(-max, max, R - 10, '#e8d8ff', 1.5); c.restore(); }
    // Zenith: Strain fills a thin red arc under the dial; Redline lights it
    if (k.def.redline) {
      const sv = Math.min(1, (g.strain || 0) / 100);
      c.beginPath(); c.arc(cx, cy, R - 14, Math.PI * 0.75, Math.PI * 0.25, true); c.lineWidth = 3; c.strokeStyle = '#2a1418'; c.stroke();
      if (sv > 0) { c.beginPath(); c.arc(cx, cy, R - 14, Math.PI * 0.75, Math.PI * 0.75 - sv * Math.PI * 1.5, true); c.strokeStyle = sv > 0.6 ? (Math.sin(t * 14) > 0 ? '#ff4a5a' : '#ffb0a0') : '#ff5a6a'; c.stroke(); }
    }
    // Pendulum: Momentum pips
    if (k.def.momentum) { const m = k.stacks('momentum'); for (let i = 0; i < 3; i++) circle(c, cx - 12 + i * 12, cy + 38, 3, i < m ? '#ffb08a' : '#2a2026', OUT, 1); }
    // banked embers (talent) and a banked overload (talent)
    for (let i = 0; i < (g.embers || 0); i++) { glow(c, 14 + i * 9, 16, 5, '#ff8a3a', 0.7); circle(c, 14 + i * 9, 16, 1.8, '#ffd27a'); }
    if (g.latent) { glow(c, w - 16, 16, 8, '#e8d8ff', 0.6); circle(c, w - 16, 16, 2.6, '#ffffff', OUT, 1); }
  },

  // Driftblade: a crescent of wind that fills while you move and drains while you stand. Streaks run through it at speed.
  drift(c, k, w, h, t) {
    const cx = w / 2, cy = 62, R = 42, g = k.g, max = (k.def.gauge && k.def.gauge.max) || 100, v = Math.min(1, (g.drift || 0) / max);
    const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, comet = max > 100;
    const col = comet ? '#ffd08a' : k.def.orbit ? '#a8f0c8' : '#7fe8cc';
    c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, R, a0, a1); c.lineWidth = 12; c.strokeStyle = '#16232a'; c.stroke();
    if (v > 0) {
      c.beginPath(); c.arc(cx, cy, R, a0, a0 + (a1 - a0) * v); c.lineWidth = 9; c.strokeStyle = col; c.stroke();
      // streaks racing along the filled arc while the gauge is rising
      if (k._driftSeen != null && g.drift > k._driftSeen) k._driftUpT = t;
      const moving = t - (k._driftUpT || -9) < 0.4;
      for (let i = 0; i < 4; i++) {
        const q = ((t * (moving ? 1.6 : 0.35) + i / 4) % 1) * v, a = a0 + (a1 - a0) * q;
        c.beginPath(); c.arc(cx, cy, R + (i % 2 ? 2 : -2), a, a + 0.18); c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.stroke();
      }
    }
    k._driftSeen = g.drift;
    // 100-marks (Comet runs to 200, the halfway mark is a full normal gauge)
    if (comet) { const a = a0 + (a1 - a0) * 0.5; line(c, cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8), cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8), '#f2e6c8', 1.5); }
    if (v >= 0.8) glow(c, cx, cy, 30, col, 0.25 + Math.sin(t * 7) * 0.1);
    // a feather in the middle, tilting with the fill
    c.save(); c.translate(cx, cy); c.rotate(-0.6 + v * 1.2 + Math.sin(t * 3) * 0.05);
    ellipse(c, 0, 0, 5, 15, 0, v >= 0.8 ? '#f4fff8' : '#9fb8b0', OUT, 1.5);
    line(c, 0, -13, 0, 17, '#2a3a3a', 1);
    c.restore();
    label(c, String(Math.floor(g.drift || 0)), cx, cy + 34, '#d8fff0', 13, 'system-ui', 800);
    // Orbit: stacks as five beads on a ring; Stillpoint holds the gauge (a line across it); Gale Run doubles the rim
    if (k.def.orbit) { const n = k.stacks('orbit'); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5 + t * 0.6; circle(c, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 2.6, i < n ? '#e8fff2' : '#22343a', OUT, 0.8); } }
    if (k.has('still')) line(c, cx - R - 6, cy, cx + R + 6, cy, '#f2e6c8', 1.5);
    if (k.has('gale')) { c.save(); c.globalAlpha = 0.5 + Math.sin(t * 9) * 0.25; c.beginPath(); c.arc(cx, cy, R + 9, a0, a1); c.lineWidth = 1.5; c.strokeStyle = col; c.stroke(); c.restore(); }
    if (k.has('tailwind')) { glow(c, w - 18, 18, 9, '#ffffff', 0.5); poly(c, [w - 24, 14, w - 12, 18, w - 24, 22], '#e8fff8', OUT, 1); }
  },
});

// ======================================================================= Threadweaver and Marionettist (classes-c)
Object.assign(GAUGES, {
  // Threadweaver: a wooden spool on its side, wound fuller as Spool fills. Above it a knot for every thread you could
  // hold: tied knots glow, and turn pink, then red, as that thread is pulled toward its snapping length.
  spool(c, k, w, h, t) {
    const cx = w / 2, cy = 60, g = k.g, v = Math.min(1, (g.spool || 0) / 100);
    const hw = 30, fr = 26, core = 6, wound = core + v * (fr - core - 3);
    // the wound thread, a little lighter where the light catches the top of the coil
    if (v > 0) {
      rrect(c, cx - hw + 5, cy - wound, (hw - 5) * 2, wound * 2, 4, '#7a66b8', OUT, 1.5);
      c.save(); c.beginPath(); c.rect(cx - hw + 5, cy - wound, (hw - 5) * 2, wound * 2); c.clip();
      for (let x = cx - hw + 7; x < cx + hw - 5; x += 3.2) line(c, x, cy - wound, x - 2, cy + wound, 'rgba(230,220,255,0.28)', 1);
      c.restore();
      ellipse(c, cx, cy - wound * 0.55, hw - 8, wound * 0.22, 0, 'rgba(255,255,255,0.18)');
    }
    rrect(c, cx - hw + 5, cy - core, (hw - 5) * 2, core * 2, 2, '#b88a54', OUT, 1.2);   // the bare core
    for (const s of [-1, 1]) {   // the two flanges
      ellipse(c, cx + s * hw, cy, 5, fr, 0, '#a8763e', OUT, 1.8);
      ellipse(c, cx + s * hw - s * 1.2, cy, 2.4, fr - 4, 0, '#c8965a');
    }
    if (v >= 0.35) { const ready = (g.spool || 0) >= 35; glow(c, cx, cy, 34, '#b89cff', (ready ? 0.18 : 0.06) + (v >= 0.7 ? Math.sin(t * 5) * 0.06 : 0)); }
    label(c, String(Math.floor(g.spool || 0)), cx, cy + 40, '#e8ddff', 13, 'system-ui', 800);
    // the knots: one per thread you can hold
    const mx = weaveMax(k), threads = weaveThreads(k);
    for (let i = 0; i < mx; i++) {
      const x = cx + (i - (mx - 1) / 2) * 15, y = 18, th = threads[i];
      if (!th) { circle(c, x, y, 3.2, '#251d30', OUT, 1); continue; }
      const strain = Math.min(1, (th[2] || 0) / WEAVE.SNAP), col = strain > 0.88 ? '#ff5a7a' : strain > 0.72 ? '#ff9ad8' : '#e8ddff';
      glow(c, x, y, 7 + strain * 4, col, 0.45 + (strain > 0.88 ? Math.sin(t * 20) * 0.25 : 0));
      circle(c, x, y, 3.6, col, OUT, 1.1);
      line(c, x - 2.5, y + 3, x - 4, y + 8, rgba(col, 0.7), 1); line(c, x + 2.5, y + 3, x + 4, y + 8, rgba(col, 0.7), 1);
    }
  },

  // Marionettist: the control bar, with its three Strings hanging below (a torn one dangles short and frayed; at 0 the
  // Doll lies limp and a little count runs down), and a row of five footlights that Encore lights from the left.
  marionette(c, k, w, h, t) {
    const cx = w / 2, g = k.g, limp = mariLimp(k), s = limp ? 0 : g.strings;
    // the bar
    c.save(); c.translate(cx, 22); c.rotate(Math.sin(t * 1.6) * 0.05);
    rrect(c, -30, -3.5, 60, 7, 2.5, '#9a6a3c', OUT, 1.6);
    rrect(c, -3.5, -12, 7, 24, 2.5, '#8a5a32', OUT, 1.5);
    for (const x of [-26, 0, 26]) circle(c, x, 0, 2.2, '#e2bb58', OUT, 0.8);
    c.restore();
    // the strings: whole ones run down to the stage, torn ones hang short
    for (let i = 0; i < 3; i++) {
      const x = cx - 26 + i * 26, whole = i < s;
      c.beginPath(); c.moveTo(x, 24);
      if (whole) c.quadraticCurveTo(x + Math.sin(t * 2 + i) * 3, 52, x, 76);
      else c.quadraticCurveTo(x + 3, 32, x - 2, 38 + Math.sin(t * 3 + i) * 1.5);
      c.strokeStyle = whole ? 'rgba(246,232,240,0.9)' : 'rgba(200,170,180,0.45)'; c.lineWidth = whole ? 1.6 : 1.1; c.stroke();
      if (whole) circle(c, x, 77, 2.4, '#d0507e', OUT, 0.8);
    }
    if (limp) {
      const left = Math.max(0, g.limpUntil - k.now);
      label(c, left.toFixed(1), cx, 64, '#ff9ab0', 13, 'system-ui', 800);
    }
    // footlights: Encore
    for (let i = 0; i < 5; i++) {
      const x = cx - 40 + i * 20, y = 98, on = i < (g.encore || 0);
      if (on) glow(c, x, y - 3, 12, '#ffcf6a', g.encore >= 5 ? 0.65 + Math.sin(t * 8) * 0.15 : 0.45);
      ellipse(c, x, y, 7, 4, 0, on ? '#ffe2a0' : '#2a2026', OUT, 1.2);
      rrect(c, x - 7, y, 14, 4, 1, '#3a2c22', OUT, 1);
    }
    // Cutting Line: a red edge on the strings; Understudy: two little Doll heads on the bar
    // (Taut String: the red edge brightens and spreads as the line holds across the enemy)
    if (k.def.bladed) { const tt = Math.min(1, (g.taut || 0) / MARI.TAUT_MAX); for (let i = 0; i < Math.min(3, s); i++) glow(c, cx - 26 + i * 26, 50, 5 + tt * 7, '#ff6a8a', 0.4 + tt * 0.4); }
    if (k.def.dolls === 2) for (const x of [-12, 12]) { circle(c, cx + x, 38, 4, '#f8efe8', OUT, 1); circle(c, cx + x - 1.5, 38, 2.6, '#1a1418'); }
  },
});

// ======================================================================= Alembist (classes-b)
// a small symbol for a recipe, drawn in the liquid of a vial (and on the icons)
function alemGlyph(c, kind, x, y, s, col = '#ffffff') {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
  switch (kind) {
    case 'plus': c.fillRect(-1.2, -4, 2.4, 8); c.fillRect(-4, -1.2, 8, 2.4); break;
    case 'flame': c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(4.5, 0, 2.5, 4); c.quadraticCurveTo(0, 5.5, -2.5, 4); c.quadraticCurveTo(-4.5, 0, 0, -5); c.fill(); break;
    case 'ward': c.beginPath(); c.moveTo(0, -5); c.lineTo(4, -3); c.lineTo(3.4, 2); c.lineTo(0, 5); c.lineTo(-3.4, 2); c.lineTo(-4, -3); c.closePath(); c.stroke(); break;
    case 'cloud': for (const [px, py, r] of [[-2.2, 1, 2.4], [1.8, 1, 2.6], [0, -1.6, 2.6]]) { c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill(); } break;
    case 'drop': c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(4, 1, 0, 4.5); c.quadraticCurveTo(-4, 1, 0, -5); c.stroke(); c.beginPath(); c.arc(0, 1.5, 1.2, 0, TAU); c.fill(); break;
    case 'bolt': c.beginPath(); c.moveTo(1.5, -5); c.lineTo(-2.5, 0.5); c.lineTo(0.5, 0.5); c.lineTo(-1.5, 5); c.lineTo(2.8, -1); c.lineTo(-0.2, -1); c.closePath(); c.fill(); break;
    case 'mirror': c.beginPath(); c.ellipse(0, 0, 3.4, 4.6, 0, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-1, -2.5); c.lineTo(1.4, -0.4); c.stroke(); break;
    default: { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); }
  }
  c.restore();
}
// a glass vial standing at (x, y) (its foot), w wide, h tall. o: { color, level 0..1, glyph, lift, dim, colors (a Blend's stripes) }
function alemVial(c, x, y, w, h, o) {
  const neck = w * 0.42, bodyH = h * 0.72, top = y - h;
  const shape = () => { c.beginPath(); c.moveTo(x - neck / 2, top + h * 0.12); c.lineTo(x - neck / 2, y - bodyH); c.quadraticCurveTo(x - w / 2, y - bodyH + 2, x - w / 2, y - bodyH + 8); c.lineTo(x - w / 2, y - 4); c.quadraticCurveTo(x - w / 2, y, x - w / 2 + 4, y); c.lineTo(x + w / 2 - 4, y); c.quadraticCurveTo(x + w / 2, y, x + w / 2, y - 4); c.lineTo(x + w / 2, y - bodyH + 8); c.quadraticCurveTo(x + w / 2, y - bodyH + 2, x + neck / 2, y - bodyH); c.lineTo(x + neck / 2, top + h * 0.12); c.closePath(); };
  shape(); c.fillStyle = 'rgba(200,230,240,0.08)'; c.fill();
  if (o.color) {
    c.save(); shape(); c.clip();
    const lv = y - (h * 0.9) * Math.max(0.05, Math.min(1, o.level));
    if (o.colors) o.colors.forEach((col, i) => { c.fillStyle = col; c.fillRect(x - w / 2 + i * w / o.colors.length, lv, w / o.colors.length + 0.5, y - lv); });
    else { const g = c.createLinearGradient(0, lv, 0, y); g.addColorStop(0, shade(o.color, 0.25)); g.addColorStop(1, shade(o.color, -0.35)); c.fillStyle = g; c.fillRect(x - w, lv, w * 2, y - lv); }
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x - w, lv, w * 2, 1.4);
    c.restore();
  }
  shape(); c.lineWidth = 1.6; c.strokeStyle = o.dim ? 'rgba(160,170,180,0.35)' : 'rgba(225,240,248,0.85)'; c.stroke();
  c.save(); shape(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x - w / 2 + 2.5, y - bodyH + 4, 2.2, bodyH - 8); c.restore();
  if (o.color) rrect(c, x - neck / 2 - 1.5, top, neck + 3, h * 0.14, 1.5, '#9a6a3a', OUT, 1.1);   // the cork
  if (o.glyph) alemGlyph(c, o.glyph, x, y - bodyH * 0.45, w / 22, 'rgba(255,255,255,0.9)');
}

// The Alembist's gauge: the copper still (the half-brew in its reagent sockets) and the bandolier of vials, oldest on
// the left, each loop numbered for its key (the next one thrown is raised over a chevron; a vial marked with its number
// gets a fine gold frame and a gold numeral). The liquid rises as a vial ripens and it glints when ripe; a spoiling vial
// goes murky; a Volatile vial burns down a fuse on its cork.
GAUGES.bandolier = (c, k, w, h, t) => {
  const A = k.def.alem, g = k.g, sx = 36, sy = 82;
  // the still: a copper pot, its swan neck reaching for the bandolier, steam while Distill is up
  const need = k.has('catalyst') ? 3 : 2;
  const mix = g.half.length ? ALEMBIC.reagents[g.half[g.half.length - 1]].color : null;
  const pop = Math.max(0, 1 - (k.now - g.popAt) / 0.45), popCol = g.popR ? alemInfo(g.popR).color : '#ffffff';
  if (pop > 0) glow(c, sx, sy - 6, 40 + (1 - pop) * 20, popCol, pop * 0.7);
  if (mix) glow(c, sx, sy - 6, 26, mix, 0.35 + Math.sin(t * 8) * 0.08);
  limb(c, [sx + 6, sy - 26, sx + 22, sy - 44, sx + 44, sy - 40], '#b8743a', 3.5);
  ellipse(c, sx, sy, 24, 19, 0, '#a8622a', OUT, 2);
  ellipse(c, sx - 7, sy - 7, 9, 6, -0.4, '#d89058');
  rrect(c, sx - 7, sy - 33, 14, 14, 3, '#b8743a', OUT, 1.8);
  line(c, sx - 18, sy + 2, sx + 18, sy + 2, 'rgba(60,20,8,0.5)', 1.5);
  // bubbles of the half-brew inside the pot's glass port
  circle(c, sx, sy + 1, 9, 'rgba(20,14,10,0.85)', '#e8b070', 1.5);
  if (mix || pop > 0) for (let i = 0; i < 4; i++) { const q = (t * 1.4 + i / 4) % 1; circle(c, sx - 4 + i * 2.6, sy + 6 - q * 11, 1.4 + q, rgba(mix || popCol, 0.9 * (1 - q))); }
  if (k.has('distill')) for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; circle(c, sx + Math.sin(t * 3 + i) * 3, sy - 38 - q * 22, 3 + q * 4, `rgba(230,240,245,${0.5 * (1 - q)})`); }
  // the reagent sockets on the hopper: filled as you press them (a third socket after Catalyst)
  for (let i = 0; i < need; i++) {
    const x = sx + (i - (need - 1) / 2) * 15, y = 36, r = g.half[i];
    if (r) { glow(c, x, y, 13, ALEMBIC.reagents[r].color, 0.6); poly(c, [x, y - 7, x + 5, y + 2, x, y + 6, x - 5, y + 2], ALEMBIC.reagents[r].color, OUT, 1.3); }
    else poly(c, [x, y - 7, x + 5, y + 2, x, y + 6, x - 5, y + 2], 'rgba(30,24,20,0.8)', need === 3 && i === 2 ? '#ff9a4a' : 'rgba(200,170,120,0.55)', 1.2);
  }
  // a fallen ally can't be raised again yet: a small dimmed feather that fills back
  const rl = g.raiseAt - k.now;
  if (rl > 0) { circle(c, 8, 8, 6, 'rgba(20,16,12,0.8)', 'rgba(120,200,180,0.5)', 1.2); c.beginPath(); c.moveTo(8, 8); c.arc(8, 8, 6, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - rl / ALEMBIC.RAISE_CD)); c.closePath(); c.fillStyle = 'rgba(120,230,200,0.55)'; c.fill(); }
  // the Kiln under the still: a coal lights for every cure vial thrown; all three lit, they flare (the next Throw adds a Fire Bomb)
  const kiln = g.kiln || 0, hot = kiln >= ALEMBIC.KILN;
  for (let i = 0; i < ALEMBIC.KILN; i++) {
    const x = sx + (i - 1) * 13, y = 109, lit = i < kiln;
    if (lit) glow(c, x, y, hot ? 11 + Math.sin(t * 6 + i) * 2 : 8, hot ? '#ff7a2a' : '#ff9a4a', hot ? 0.7 : 0.4);
    ellipse(c, x, y, 5, 3.4, 0, lit ? (hot ? '#ffb040' : '#e0622a') : 'rgba(40,30,24,0.9)', OUT, 1.2);
  }
  // the bandolier: a leather strap with a loop per slot
  const n = A.slots, x0 = 74, x1 = w - 4, sp = (x1 - x0) / n, vw = n > 3 ? 15 : 20, vh = n > 3 ? 38 : 46, foot = 96;
  ctx2Strap(c, x0 - 4, x1 + 2, foot - 10);
  const pick = alemPick(k), marked = pick >= 0 && g.mark != null && g.vials[pick].id === g.mark, spoilT = alemSpoilTime(k);
  // the place numbers under the loops (the keys that mark them): gold under the vial that goes next
  c.save(); c.font = '600 9px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const x = x0 + sp * (i + 0.5);
    c.fillStyle = i === pick ? (marked ? '#ffd27a' : 'rgba(255,214,140,0.8)') : g.vials[i] ? 'rgba(232,210,170,0.55)' : 'rgba(232,210,170,0.25)';
    c.fillText(String(i + 1), x, foot + 13);
  }
  c.restore();
  for (let i = 0; i < n; i++) {
    const x = x0 + sp * (i + 0.5), v = g.vials[i];
    if (!v) { alemVial(c, x, foot, vw, vh, { dim: true }); continue; }
    const info = alemInfo(v.r), str = alemStrength(k, v), ripe = v.parts ? 1 : Math.min(1, (str - 1) / ALEMBIC.GROW);
    let col = info.color, lift = i === pick ? 5 : 0, shake = 0;
    const age = k.now - v.born;
    // spoiling: the last 10s go murky, the last 3s blink
    if (!v.fuse && !v.keep && spoilT - age < 10) { const s = 1 - (spoilT - age) / 10; col = mixHex(col, '#5a4a30', s * 0.75); }
    if (v.fuse && v.fuse - k.now < 2) shake = Math.sin(t * 50) * 1.6;
    c.save(); c.translate(shake, -lift);
    if (ripe >= 1 && !v.fuse) glow(c, x, foot - vh * 0.45, vw * 1.4, col, 0.35 + Math.sin(t * 4 + i) * 0.1);
    if (v.fuse && v.fuse - k.now < 2) glow(c, x, foot - vh * 0.45, vw * 1.6, '#ff4a1a', 0.5);
    alemVial(c, x, foot, vw, vh, { color: col, level: v.parts ? 1 : 0.45 + 0.55 * ripe, glyph: info.glyph, colors: v.parts ? v.parts.map(p => alemInfo(p.r).color) : null });
    if (ripe >= 1 && !v.fuse) { const gx = x + vw * 0.22, gy = foot - vh * 0.62, s = 3 + Math.sin(t * 5 + i) * 1.2; poly(c, [gx, gy - s, gx + 1, gy - 1, gx + s, gy, gx + 1, gy + 1, gx, gy + s, gx - 1, gy + 1, gx - s, gy, gx - 1, gy - 1], '#ffffff'); }
    if (!v.fuse && !v.keep && spoilT - age < 3 && Math.sin(t * 12) > 0) circle(c, x, foot - vh - 4, 2.4, '#ff5a3a');
    if (v.fuse) {
      // the fuse: a curl of wick over the cork that burns down, a spark at its end
      const left = Math.max(0, (v.fuse - k.now) / (A.fuse + (k.talent('alembist_cask') ? 2 : 0))), top = foot - vh;
      c.beginPath(); for (let j = 0; j <= 12 * left; j++) { const q = j / 12; c.lineTo(x + Math.sin(q * 7) * 3, top - 2 - q * 14); }
      c.lineWidth = 1.6; c.strokeStyle = '#d8c8a8'; c.stroke();
      const ex = x + Math.sin(left * 7) * 3, ey = top - 2 - left * 14;
      glow(c, ex, ey, 7, '#ffb040', 0.9); circle(c, ex, ey, 1.6, '#fff4c0');
    }
    c.restore();
    if (i === pick) {
      // the chevron under the vial R takes; a marked vial also stands in a fine gold frame (corner brackets, no glow)
      poly(c, [x - 5, foot + 6, x + 5, foot + 6, x, foot + 1], marked ? '#ffd27a' : 'rgba(255,210,122,0.55)', OUT, 1);
      if (marked) {
        const fx = x - sp / 2 + 2, fy = foot - vh - 9, fw = sp - 4, fh = vh + 13, e = 5;
        c.save(); c.strokeStyle = '#ffd27a'; c.lineWidth = 1.3; c.lineCap = 'round'; c.beginPath();
        for (const [cx, cy, dx, dy] of [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]]) { c.moveTo(cx + dx * e, cy); c.lineTo(cx, cy); c.lineTo(cx, cy + dy * e); }
        c.stroke(); c.restore();
      }
    }
  }
};
// a leather strap across the vial loops
function ctx2Strap(c, xa, xb, y) {
  c.beginPath(); c.moveTo(xa, y + 4); c.quadraticCurveTo((xa + xb) / 2, y + 12, xb, y + 2);
  c.lineWidth = 9; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 6; c.strokeStyle = '#6b4424'; c.stroke();
  c.lineWidth = 1; c.strokeStyle = 'rgba(230,190,130,0.35)'; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);
}
function mixHex(a, b, f) {
  const A = hexToRgb(a), B = hexToRgb(b), m = i => Math.round(A[i] + (B[i] - A[i]) * f);
  return '#' + [m(0), m(1), m(2)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Icons drawn in code for classes whose painted icons aren't all in yet (abilityIcon in hud.js asks first).
// icons/<class>/manifest.json lists the painted ones: those are used as soon as it loads.
const ICON_ART = (() => {
  const out = {}, cache = new Map(), painted = {};
  const load = cls => { painted[cls] = new Set(); if (typeof fetch === 'undefined') return; fetch(`icons/${cls}/manifest.json`).then(r => (r.ok ? r.json() : [])).then(ids => { for (const id of ids) painted[cls].add(id); }).catch(() => {}); };
  function draw(id) {
    if (typeof document === 'undefined') return null;
    const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S * 2;
    const c = cv.getContext('2d'); c.scale(2, 2);
    const bg = c.createRadialGradient(S / 2, S * 0.42, 4, S / 2, S / 2, S * 0.72);
    bg.addColorStop(0, '#3a2a1c'); bg.addColorStop(1, '#100b08'); c.fillStyle = bg; c.fillRect(0, 0, S, S);
    const R = ALEMBIC.reagents;
    const flask = (x, y, col, glyph, sc = 1) => { glow(c, x, y - 14 * sc, 22 * sc, col, 0.45); alemVial(c, x, y, 22 * sc, 40 * sc, { color: col, level: 0.85, glyph }); };
    switch (id) {
      case 'ember': glow(c, 32, 34, 26, R.E.color, 0.6); poly(c, [32, 10, 44, 30, 38, 52, 26, 52, 20, 30], '#ff8a2a', OUT, 2); poly(c, [32, 22, 38, 34, 34, 46, 30, 46, 26, 34], '#ffe08a'); break;
      case 'dew': glow(c, 32, 34, 26, R.D.color, 0.6); c.beginPath(); c.moveTo(32, 10); c.quadraticCurveTo(50, 36, 32, 52); c.quadraticCurveTo(14, 36, 32, 10); fillStroke(c, '#4fc8ff', OUT, 2); circle(c, 27, 36, 4, 'rgba(255,255,255,0.6)'); break;
      case 'salt': glow(c, 32, 36, 24, '#ffffff', 0.35); for (const [x, y, r] of [[24, 40, 9], [38, 38, 10], [31, 26, 8]]) { c.save(); c.translate(x, y); c.rotate(0.6); rrect(c, -r / 2, -r / 2, r, r, 1.5, '#f4ecd2', OUT, 1.6); c.restore(); } break;
      case 'quicksilver': glow(c, 32, 34, 26, '#c9d4e6', 0.55); ellipse(c, 32, 40, 15, 9, 0, '#b8c4d4', OUT, 2); circle(c, 26, 26, 6, '#dfe6f2', OUT, 1.6); circle(c, 40, 28, 4, '#dfe6f2', OUT, 1.4); ellipse(c, 27, 37, 5, 2.4, 0, 'rgba(255,255,255,0.7)'); break;
      case 'throw': { c.save(); c.translate(36, 30); c.rotate(-0.7); flask(0, 16, '#4fe0c0', 'plus', 0.85); c.restore(); c.setLineDash([3, 4]); c.beginPath(); c.moveTo(8, 56); c.quadraticCurveTo(14, 20, 28, 26); c.strokeStyle = 'rgba(255,230,180,0.6)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]); break; }
      case 'distill': glow(c, 30, 40, 24, '#d8f0f0', 0.35); ellipse(c, 28, 44, 15, 12, 0, '#a8622a', OUT, 2); limb(c, [34, 34, 44, 20, 54, 24], '#b8743a', 3); for (let i = 0; i < 3; i++) circle(c, 22 + i * 4, 22 - i * 5, 4 + i, 'rgba(230,240,245,0.55)'); break;
      case 'batch': flask(18, 54, '#4fe0c0', 'plus', 0.7); flask(32, 52, '#ff5a1a', 'flame', 0.8); flask(46, 54, '#f4ecd2', 'ward', 0.7); break;
      case 'catalyst': flask(32, 54, '#ff8a3a', 'star', 0.95); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; line(c, 32 + Math.cos(a) * 16, 26 + Math.sin(a) * 16, 32 + Math.cos(a) * 22, 26 + Math.sin(a) * 22, '#ffd27a', 2); } break;
      case 'blend': { glow(c, 32, 34, 26, '#ffe0a8', 0.5); alemVial(c, 32, 56, 26, 46, { color: '#ffffff', level: 0.9, colors: ['#4fe0c0', '#ff5a1a', '#f4ecd2', '#ffd23a'] }); break; }
      default: flask(32, 54, '#ffd27a', 'star', 0.95);
    }
    c.strokeStyle = '#00000088'; c.lineWidth = 1; c.strokeRect(1.5, 1.5, S - 3, S - 3);
    return cv.toDataURL();
  }
  out.alembist = id => {
    if (!painted.alembist) load('alembist');
    if (painted.alembist.has(id)) return null;   // the painted icon (abilityIcon falls back to icons/<class>/<id>.png)
    if (!cache.has(id)) cache.set(id, draw(id));
    return cache.get(id);
  };
  // asked for at load, so the list is in before a hotbar is first drawn (the hotbar keeps the first icon it gets)
  if (typeof document !== 'undefined') load('alembist');
  return out;
})();

// ======================================================================= Gorgemaw, Oathbroker (tanks-2)
// a Morsel's shape as a small glyph (the Belly, the icons): Ring a hoop, Lance a bar, Fang a wedge, Spike a star
function mawGlyph(c, m, x, y, s, col) {
  const ink = OUT;
  if (m === 'ring') { c.beginPath(); c.arc(x, y, 6 * s, 0, TAU); c.lineWidth = 3.4 * s; c.strokeStyle = ink; c.stroke(); c.lineWidth = 2.2 * s; c.strokeStyle = col; c.stroke(); }
  else if (m === 'lance') { rrect(c, x - 8 * s, y - 2.4 * s, 16 * s, 4.8 * s, 2 * s, col, ink, 1.2); }
  else if (m === 'fang') poly(c, [x - 7 * s, y - 5 * s, x + 7 * s, y - 5 * s, x, y + 7 * s], col, ink, 1.2);
  else { const p = []; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = (i % 2 ? 3 : 8) * s; p.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } poly(c, p, col, ink, 1.2); }
}
Object.assign(GAUGES, {
  // Gorgemaw: the Belly. Its Morsels sit in a row of hollows (oldest on the left: that's what Spit fires), each in its
  // shape's colour. A jaw over the row opens while Open Wide is up; a Glutton's matching pair is bracketed (a Fusion).
  belly(c, k, w, h, t) {
    const g = k.g, max = (k.def.gauge && k.def.gauge.max) || 3, b = g.belly || [], cx = w / 2, cy = 70;
    const R = max > 3 ? 54 : 46;
    ellipse(c, cx, cy, R + 6, 34, 0, '#3a2018', OUT, 2.2);
    ellipse(c, cx, cy - 4, R, 27, 0, '#5a3020');
    const gap = (R * 2 - 12) / max;
    for (let i = 0; i < max; i++) {
      const x = cx - R + 6 + gap * (i + 0.5), y = cy;
      circle(c, x, y, Math.min(12, gap * 0.42), '#24120c', 'rgba(255,220,180,0.2)', 1);
      const m = b[i];
      if (!m) continue;
      const col = MAW.COLOR[m.m] || '#ff9a3a', fresh = i === b.length - 1 && k.now - (g.popAt ?? -9) < 0.35;
      glow(c, x, y, 13, col, fresh ? 0.9 : 0.35);
      mawGlyph(c, m.m, x, y, fresh ? 1.25 : 1, col);
    }
    // a Glutton's Fusion: the oldest two match
    if (k.def.fuse && b.length >= 2 && b[0].m === b[1].m) {
      const x0 = cx - R + 6 + gap * 0.1, x1 = cx - R + 6 + gap * 1.9;
      c.save(); c.globalAlpha = 0.7 + Math.sin(t * 8) * 0.25; rrect(c, x0, cy - 15, x1 - x0, 30, 8, null, '#fff0c8', 1.6); c.restore();
    }
    // the jaw over it: shut, or gaping while Open Wide is up (Bottomless: wider, and red)
    const open = (g.jawUntil || 0) > k.now, all = k.has('bottomless'), gape = open ? (all ? 16 : 11) : 2;
    const jc = all ? '#ff6a3a' : '#ffd0a0';
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 40, 26); c.quadraticCurveTo(cx, 26 - gape * 1.4, cx + 40, 26); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2; c.strokeStyle = open ? jc : '#8a6a58'; c.stroke();
    c.beginPath(); c.moveTo(cx - 40, 30); c.quadraticCurveTo(cx, 30 + gape * 0.6, cx + 40, 30); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2; c.strokeStyle = open ? jc : '#8a6a58'; c.stroke();
    if (open) { for (let i = 0; i < 6; i++) { const x = cx - 30 + i * 12; poly(c, [x - 3, 26 - gape * 0.9, x + 3, 26 - gape * 0.9, x, 26 - gape * 0.9 + 5], '#fff4e0', OUT, 0.8); }
      glow(c, cx, 28, 26, jc, 0.3 + Math.sin(t * 10) * 0.1); }
    label(c, String(b.length), cx, cy + 32, '#ffe0c0', 13, 'system-ui', 800);
    if (k.has('stone')) { c.save(); c.globalAlpha = 0.55; ellipse(c, cx, cy, R + 9, 37, 0, null, '#c8c0b0', 2); c.restore(); }
  },

  // Oathbroker: the Ledger, as a page. Every entry is a line: its amount (a bar and the number) and the seconds until it
  // comes due, oldest at the top; a line is red in its last 2s. The total is written above. Terms show in the margin:
  // Lien (a chain), Writ (a scroll), Moratorium (an hourglass: everything held), Default (the page crossed out and void),
  // a Guarantor's bond (a link, with its seconds).
  ledger(c, k, w, h, t) {
    const g = k.g, L = (g.ledger || []).slice().sort((a, b) => a.due - b.due), now = k.now;
    const x0 = 22, x1 = w - 8, top = 22, rowH = 10.5, rows = 8;
    rrect(c, x0 - 4, top - 18, x1 - x0 + 8, h - top + 12, 4, '#e8e0cc', OUT, 1.6);
    rrect(c, x0 - 4, top - 18, x1 - x0 + 8, 14, 4, '#d4c8ae');
    const maxHp = (k.env && k.env.maxHp && k.env.maxHp()) || 1, tot = g.total || 0;
    label(c, String(Math.round(tot)), (x0 + x1) / 2, top - 11, tot > maxHp * 0.35 ? '#a01828' : '#2a2034', 12, 'system-ui', 800);
    const frozen = (g.frozen || 0) > now;
    for (let i = 0; i < rows; i++) { const y = top + i * rowH; line(c, x0, y + rowH - 1, x1, y + rowH - 1, 'rgba(60,40,60,0.18)', 1); }
    const shown = L.slice(0, rows);
    shown.forEach((e, i) => {
      const y = top + i * rowH, left = Math.max(0, e.due - now), late = left < 2;
      const bw = Math.min(1, e.a / (maxHp * 0.12)) * 46;
      c.fillStyle = e.co ? 'rgba(120,100,180,0.55)' : late ? 'rgba(190,40,56,0.6)' : 'rgba(60,44,70,0.35)'; c.fillRect(x0 + 2, y + 2, Math.max(2, bw), rowH - 4);
      label(c, String(Math.round(e.a)), x0 + 66, y + rowH / 2 + 0.5, late ? '#a01828' : '#2a2034', 10, 'system-ui', 700);
      if (e.rn) label(c, '»', x0 + 88, y + rowH / 2 + 0.5, '#6a50b0', 10, 'system-ui', 800);   // (renegotiated: a setup for Lien, Writ, Default)
      label(c, (g.holdUntil || 0) > now ? '—' : left.toFixed(left < 10 ? 1 : 0), x1 - 14, y + rowH / 2 + 0.5, late ? '#a01828' : '#5a4a6a', 10, 'system-ui', 700);
    });
    if (L.length > rows) label(c, '+' + (L.length - rows), x1 - 14, top + rows * rowH + 4, '#5a4a6a', 9, 'system-ui', 700);
    // the margin: the terms in force
    let my = top + 4;
    const pip = (draw, lit) => { c.save(); c.globalAlpha = lit ? 1 : 0; draw(8, my); c.restore(); if (lit) my += 18; };
    pip((x, y) => { circle(c, x, y, 3.5, null, '#b8a8e0', 1.6); circle(c, x, y + 6, 3.5, null, '#b8a8e0', 1.6); }, (g.lienUntil || 0) > now);
    pip((x, y) => { rrect(c, x - 5, y - 4, 10, 10, 2, '#f0e8d8', OUT, 1); line(c, x - 3, y, x + 3, y, '#6a5a4a', 1); line(c, x - 3, y + 3, x + 3, y + 3, '#6a5a4a', 1); }, (g.writUntil || 0) > now);
    pip((x, y) => { poly(c, [x - 4, y - 4, x + 4, y - 4, x, y + 1], '#e8dcc0', OUT, 1); poly(c, [x - 4, y + 6, x + 4, y + 6, x, y + 1], '#e8dcc0', OUT, 1); }, (g.holdUntil || 0) > now);
    pip((x, y) => { ellipse(c, x - 2, y + 1, 4, 3, 0, null, '#b8a8e0', 1.6); ellipse(c, x + 2, y + 1, 4, 3, 0, null, '#b8a8e0', 1.6); label(c, String(Math.ceil(Math.max(0, g.cosignUntil - now))), x, y + 11, '#b8a8e0', 8, 'system-ui', 700); }, g.cosign != null && (g.cosignUntil || 0) > now);
    if (frozen) {
      c.save(); c.globalAlpha = 0.85; line(c, x0, top + 2, x1, top + rows * rowH - 4, '#a01828', 2.5); line(c, x1, top + 2, x0, top + rows * rowH - 4, '#a01828', 2.5); c.restore();
      label(c, 'VOID ' + Math.ceil(g.frozen - now), (x0 + x1) / 2, top + rows * rowH / 2, '#a01828', 12, 'Cinzel, Georgia, serif', 800);
    }
    // a bill just stamped: a red seal flashes in the corner
    if (g.stampAt != null && now - g.stampAt < 0.5) { const k2 = 1 - (now - g.stampAt) / 0.5; c.save(); c.globalAlpha = k2; circle(c, x1 - 6, top - 11, 7 + (1 - k2) * 4, '#c04a5a', OUT, 1.2); c.restore(); }
  },
});

// ======================================================================= Ironpalm (tank)
// The three inputs as small glyphs: Light an open palm (a round pad), Heavy a fist (a squared block), Kick a foot (a wedge)
const IP_COL = { L: '#f2d9a0', H: '#ff8a5a', K: '#8fd8c8' };
function ipGlyph(c, x, y, key, s, o = {}) {
  const col = o.dim ? 'rgba(160,150,140,0.35)' : IP_COL[key], ink = o.dim ? 'rgba(20,16,24,0.5)' : OUT;
  c.save(); c.translate(x, y); c.scale(s, s);
  if (o.crisp) glow(c, 0, 0, 9, '#ffffff', 0.55);
  if (key === 'L') { circle(c, 0, 0.6, 4.2, col, ink, 1.3); for (let i = -1; i <= 1; i++) circle(c, i * 2.4, -3.8, 1.3, col, ink, 0.9); }
  else if (key === 'H') { rrect(c, -4.4, -3.6, 8.8, 7.6, 2, col, ink, 1.3); for (let i = -1; i <= 1; i++) line(c, i * 2.6, -3.6, i * 2.6, -1, 'rgba(26,22,34,0.6)', 0.8); }
  else { c.beginPath(); c.moveTo(-4.5, -3.5); c.lineTo(1, -3.5); c.lineTo(4.8, 1.5); c.lineTo(2.5, 4); c.lineTo(-4.5, 4); c.closePath(); fillStroke(c, col, ink, 1.3); }
  if (o.ring) { c.globalAlpha = o.ring; circle(c, 0, 0, 7.5, null, '#ffffff', 1.4); c.globalAlpha = 1; }
  c.restore();
}
// Breath: a ring of pale breath round an iron-wrapped fist. Right of it, the string you're spelling (Crisp presses rimmed
// white), the rhythm bar (the recovery, then the window, with a bright notch where a press lands Crisp), and every
// named move still in reach, its inputs lit as far as you've come and the next one ringed.
GAUGES.breath = function (c, k, w, h, t) {
  const g = k.g, now = k.now, max = k.poolMax(), v = Math.max(0, Math.min(1, (g.breath || 0) / max));
  const cx = 50, cy = 52, R = 36;
  const winded = !!g.winded;   // (below 18 until it's back to 45: resting pace, the keys don't glow, presses are taps)
  const resting = now - k.lastSpend >= IRONPALM.pool.delay || k.has('skin') || winded;
  const shake = k.has('stagger') ? Math.sin(t * 60) * 2 : 0;
  c.save(); c.translate(shake, 0);
  const swell = resting && v < 1 ? 1 + Math.sin(t * 5) * 0.02 : 1;   // it swells a little as you breathe in
  c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, R * swell, 0, TAU); c.lineWidth = 11; c.strokeStyle = '#1a1820'; c.stroke();
  const col = k.has('wind') ? '#ffd08a' : winded ? (Math.sin(t * 12) > 0 ? '#c86a5a' : '#7a4a44') : '#e6f2f2';
  const ea = -Math.PI / 2 + TAU * v;
  if (v > 0) { c.beginPath(); c.arc(cx, cy, R * swell, -Math.PI / 2, ea); c.lineWidth = 8; c.strokeStyle = col; c.stroke(); }
  if (resting && v < 1) glow(c, cx + Math.cos(ea) * R, cy + Math.sin(ea) * R, 8, '#ffffff', 0.4 + Math.sin(t * 8) * 0.15);
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10; line(c, cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6), cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), 'rgba(10,8,14,0.7)', 1.2); }
  // the fist: iron knuckles over cloth wraps; it glows while a read tankbuster holds a finisher open
  if (k.has('opening')) glow(c, cx, cy, 26, '#ffb84a', 0.55 + Math.sin(t * 10) * 0.2);
  rrect(c, cx - 11, cy - 6, 22, 16, 5, '#c8a888', OUT, 1.6);
  for (let i = 0; i < 3; i++) line(c, cx - 11, cy - 1 + i * 4, cx + 11, cy - 1 + i * 4, 'rgba(90,60,40,0.45)', 1);
  for (let i = 0; i < 4; i++) circle(c, cx - 7.5 + i * 5, cy - 7, 2.8, k.has('opening') ? '#ffd890' : '#8a96a4', OUT, 1.1);
  label(c, String(Math.floor(g.breath || 0)), cx, cy + 25, winded ? '#ff9a8a' : '#f2e6c8', 11, 'system-ui', 800);
  if (winded) {   // the cue: breathe in, to the notch at 60
    const ra = -Math.PI / 2 + TAU * IRONPALM.RECOVER / max;
    line(c, cx + Math.cos(ra) * (R - 7), cy + Math.sin(ra) * (R - 7), cx + Math.cos(ra) * (R + 7), cy + Math.sin(ra) * (R + 7), '#ffffff', 2);
    c.save(); c.globalAlpha = 0.65 + Math.sin(t * 5) * 0.35;
    label(c, 'BREATHE', cx, cy - R - 9, '#ffe2c8', 10, 'Cinzel, Georgia, serif', 800);
    c.restore();
  }
  // Avalanche Fist: Momentum as beads under the ring; Read's stance as a bright arc over it
  if (k.def.avalanche) { const n = k.stacks('rush'); for (let i = 0; i < IRONPALM.RUSH_MAX; i++) { const a = Math.PI * (0.18 + i * 0.66 / (IRONPALM.RUSH_MAX - 1)); circle(c, cx + Math.cos(a) * (R + 9), cy + Math.sin(a) * (R + 9), 2.4, i < n ? '#ffb070' : '#2a2026', OUT, 0.8); } }
  if (k.has('read')) { c.beginPath(); c.arc(cx, cy, R + 7, -Math.PI * 0.85, -Math.PI * 0.15); c.lineWidth = 2; c.strokeStyle = '#ffe2a8'; c.stroke(); }
  c.restore();

  // ---- the string
  const x0 = 104, live = ipLive(k), flash = g.flash && now - g.flash.at < 0.7 ? g.flash : null;
  const dropped = !live && now - g.dropAt < 0.35;
  if (live) g.lastKeys = g.keys.slice();
  const keys = live && g.keys.length ? g.keys : flash ? flash.keys : dropped ? (g.lastKeys || []) : [];
  keys.forEach((kk, i) => {
    const x = x0 + 9 + i * 19, y = 15 + (dropped ? Math.sin(t * 50 + i) * 1.5 : 0);
    rrect(c, x - 8.5, y - 8.5, 17, 17, 4, dropped ? 'rgba(120,40,36,0.6)' : 'rgba(30,26,36,0.85)', kk.crisp ? '#ffffff' : 'rgba(242,230,200,0.25)', kk.crisp ? 1.4 : 1);
    ipGlyph(c, x, y, kk.x, 1.25, { crisp: kk.crisp });
  });
  const bx = x0 + Math.max(1, keys.length) * 19 + 6;
  if (flash) {
    c.save(); c.globalAlpha = Math.max(0, 1 - (now - flash.at) / 0.7);
    c.font = '800 10px Cinzel, Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.lineWidth = 3; c.strokeStyle = 'rgba(10,8,14,0.9)'; c.strokeText(flash.name.toUpperCase(), bx, 16);
    c.fillStyle = flash.open ? '#ffd27a' : '#f2e6c8'; c.fillText(flash.name.toUpperCase(), bx, 16);
    c.restore();
  } else if (live && !k.has('slide')) {
    const rec = Math.max(0, k.lockUntil - now), win = g.juggle ? IRONPALM.JUGGLE : IRONPALM.WINDOW, bw = Math.max(30, w - 6 - bx);
    const total = k.lockLen + win, scale = bw / total, recW = k.lockLen * scale;
    rrect(c, bx, 12, bw, 6, 3, 'rgba(20,18,26,0.9)', 'rgba(242,230,200,0.2)', 1);
    const done = Math.max(0, Math.min(bw, (total - (g.strUntil - now)) * scale));
    if (done > 0) rrect(c, bx, 12, done, 6, 3, rec > 0 ? 'rgba(140,130,120,0.6)' : 'rgba(242,230,200,0.5)');
    const crispNow = rec <= 0 && now - k.lockUntil <= IRONPALM.CRISP;
    c.fillStyle = crispNow ? '#ffffff' : 'rgba(255,240,200,0.55)'; c.fillRect(bx + recW, 9, Math.max(2, IRONPALM.CRISP * scale), 12);
    if (crispNow) glow(c, bx + recW + 2, 15, 9, '#ffffff', 0.6);
  }

  // ---- the moves still in reach
  const pre = k.has('opening') ? 'LKH' : live ? g.str : '';
  const plan = k.has('opening') ? 'LKHH' : g.plan;
  const rows = ipMoves(k).filter(e => e.seq.startsWith(pre) && e.seq.length > pre.length)
    .sort((a, b) => a.seq.length - b.seq.length || a.seq.localeCompare(b.seq)).slice(0, 8);
  const rh = Math.min(12, 80 / Math.max(1, rows.length));
  rows.forEach((e, r) => {
    const y = 34 + r * rh, onPlan = plan === e.seq;
    for (let i = 0; i < e.seq.length; i++) {
      const got = i < pre.length, next = i === pre.length;
      ipGlyph(c, x0 + 6 + i * 11, y, e.seq[i], 0.8, { dim: !!pre && !got && !next, ring: next && pre ? 0.55 + Math.sin(t * 9) * 0.35 : 0 });
    }
    c.font = `${onPlan ? 700 : 600} 9.5px system-ui`; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = pre ? '#f2e6c8' : onPlan ? '#ece2cc' : 'rgba(232,220,196,0.6)';
    c.fillText(e.mv.name, x0 + 64, y + 0.5);
    if (onPlan) { c.fillStyle = rgba(k.def.avalanche ? '#d08a5a' : '#f0a73a', 0.85); c.fillRect(x0 + 60, y - 3.5, 2, 7); }
  });
};

// two crossed swords (the Bastion's counter mark), drawn: no font has to carry the glyph
function crossedSwords(c, x, y, r) {
  c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const s of [-1, 1]) {
    c.save(); c.rotate(s * Math.PI / 4);
    // blade, guard, grip: dark outline first, then the steel
    for (const [col, k] of [['#141a26', 1.9], ['#ffffff', 1]]) {
      c.strokeStyle = col;
      c.lineWidth = 2.6 * k; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r * 0.45); c.stroke();
      c.lineWidth = 1.8 * k; c.beginPath(); c.moveTo(-r * 0.38, r * 0.45); c.lineTo(r * 0.38, r * 0.45); c.stroke();
      c.lineWidth = 2 * k; c.beginPath(); c.moveTo(0, r * 0.5); c.lineTo(0, r * 0.95); c.stroke();
    }
    c.restore();
  }
  c.restore();
}

// Every gauge's main value eases to a change (~120 ms) instead of snapping, and a real gain or spend gives one soft
// flash (gold for a gain, pale for a spend). Small, steady drips (Heat cooling, Flux draining) don't flash.
// Counted gauges (Runes, Combo, Petals: max under 20) keep whole pips and only flash, so a pip never lights early.
const GAUGE_EASE = { kit: null, v: 0, at: 0, flash: -9, dir: 0 };
function drawGauge(c, kit, w, h, t) {
  const g = kit.def.gauge;
  if (!g || !GAUGES[g.kind]) return;
  const E = GAUGE_EASE, key = g.key, real = kit.g && kit.g[key];
  if (typeof real !== 'number') { GAUGES[g.kind](c, kit, w, h, t); return; }
  const max = g.max || 100, smooth = max >= 20;
  const dt = Math.max(0, Math.min(0.1, t - E.at)); E.at = t;
  if (E.kit !== kit) { E.kit = kit; E.v = real; E.flash = -9; }
  const step = real - E.v;
  if (Math.abs(step) >= (smooth ? max * 0.04 : 0.5)) { E.flash = t; E.dir = Math.sign(step); }
  E.v = !smooth || Math.abs(step) < max * 0.004 ? real : E.v + step * (1 - Math.exp(-dt / 0.04));
  // (the drawer reads the eased value for this one draw; the kit's own number is put straight back)
  kit.g[key] = E.v;
  try { GAUGES[g.kind](c, kit, w, h, t); } finally { kit.g[key] = real; }
  const q = (t - E.flash) / 0.32;
  if (q >= 0 && q < 1) {
    c.save(); c.globalCompositeOperation = 'lighter';
    glow(c, w / 2, h * 0.42, Math.min(w, h) * (0.42 + q * 0.12), E.dir > 0 ? '#ffd88a' : '#dfe8ff', 0.32 * (1 - q) * (1 - q));
    c.restore();
  }
}

// ======================================================================= Gloomsworn (tank, class 18)
// Gloom: a dark glass vessel, cracked, that fills from the bottom with shadow lit by a cold teal-white where it is full of
// cracks; the surface line glows, and brimming (100) a crown of shards stands up on it and pulses: Hollow is ready.
// While Hollow (and the grace after) the vessel empties out to pure light, a ring of one segment per second runs down
// round it (teal for the Hollow, amber for the grace) and two bars race underneath: the debt (red) against what has been
// healed back (green), with the verdict beneath. The painted gauge replaces this later.
Object.assign(GAUGES, {
  gloom(c, k, w, h, t) {
    const g = k.g, v = Math.max(0, Math.min(1, (g.gloom || 0) / 100)), cx = w / 2, cy = 44, R = 29, now = k.now;
    const hol = k.has('hollow'), grace = !hol && (g.graceUntil || 0) > now, hl = (hol || grace) && g.hl ? g.hl : null, full = (g.gloom || 0) >= 99.5;
    const GH = '#bff8ee', pulse = 0.5 + 0.5 * Math.sin(t * 6);
    // the light behind the vessel
    if (hol) glow(c, cx, cy, R + 22, GH, 0.34 + 0.1 * pulse);
    else if (grace) glow(c, cx, cy, R + 20, '#ffb06a', 0.26 + 0.12 * Math.sin(t * 9));
    else if (full) glow(c, cx, cy, R + 18, GH, 0.2 + 0.12 * pulse);
    else if (v > 0.4) glow(c, cx, cy, R + 10, '#6a3aba', 0.16 * v);
    // the crown of shards on a full vessel
    if (full || hol) for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.33, tip = R + 9 + (i % 2) * 4 + (hol ? Math.sin(t * 3 + i) * 1.5 : 0), w2 = 0.1;
      poly(c, [cx + Math.cos(a - w2) * (R - 1), cy + Math.sin(a - w2) * (R - 1), cx + Math.cos(a) * tip, cy + Math.sin(a) * tip, cx + Math.cos(a + w2) * (R - 1), cy + Math.sin(a + w2) * (R - 1)], '#120a1e', OUT, 1.2);
      c.save(); c.globalAlpha = 0.5 + 0.5 * pulse; line(c, cx + Math.cos(a) * (R + 1), cy + Math.sin(a) * (R + 1), cx + Math.cos(a) * (tip - 2), cy + Math.sin(a) * (tip - 2), GH, 1); c.restore();
    }
    circle(c, cx, cy, R, '#0e0816', OUT, 2.4);
    c.save(); c.beginPath(); c.arc(cx, cy, R - 2, 0, TAU); c.clip();
    // the fill: a Hollow vessel is all light, an ordinary one is shadow brightening to a pale surface
    const top = hol ? cy - R : cy + R - 2 * (R - 2) * v;
    const gr = c.createLinearGradient(0, top, 0, cy + R);
    if (hol) { gr.addColorStop(0, '#f4fffb'); gr.addColorStop(1, '#5fd8c8'); }
    else if (grace) { gr.addColorStop(0, '#ffe0b8'); gr.addColorStop(1, '#8a4a3a'); }
    else { gr.addColorStop(0, v > 0.85 ? '#a98ae8' : '#7a5ac8'); gr.addColorStop(0.35, '#4a2a8a'); gr.addColorStop(1, '#1e0f3a'); }
    c.fillStyle = gr; c.beginPath(); c.moveTo(0, top);
    for (let x = 0; x <= w; x += 4) c.lineTo(x, top + (hol ? 0 : Math.sin(x * 0.22 + t * 3) * 1.6));
    c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    // the cracks in the glass: pale where the shadow behind them is, hidden above the surface
    c.strokeStyle = hol ? 'rgba(20,10,40,0.55)' : GH; c.lineWidth = 1.1; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [x0, y0, x1, y1, x2, y2] of [[-4, -22, 3, -8, -2, 4], [3, -8, 14, -14, 20, -6], [-2, 4, -14, 12, -20, 8], [-2, 4, 8, 16, 6, 26], [-14, 12, -12, 22, -4, 27]]) {
      const yy = cy + y0; if (!hol && yy < top - 1) continue;
      c.globalAlpha = hol ? 0.7 : 0.3 + 0.5 * v; c.beginPath(); c.moveTo(cx + x0, cy + y0); c.lineTo(cx + x1, cy + y1); c.lineTo(cx + x2, cy + y2); c.stroke();
    }
    c.globalAlpha = 1;
    // the surface line
    if (!hol && v > 0.02 && v < 0.99) { c.strokeStyle = GH; c.globalAlpha = 0.85; c.lineWidth = 1.3; c.beginPath(); for (let x = cx - R; x <= cx + R; x += 4) { const yy = top + Math.sin(x * 0.22 + t * 3) * 1.6; x === cx - R ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); c.globalAlpha = 1; }
    c.restore();
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.lineWidth = 2.5; c.strokeStyle = hol ? '#ffffff' : grace ? '#ffb06a' : full ? '#e8fffa' : (g.gloom || 0) >= 40 ? '#a98ae8' : '#5a4a78'; c.stroke();
    // the marks where Gloom Strike (40) and Black Pall (30) become possible
    if (!hol) for (const m of [30, 40]) { const y = cy + R - 2 * (R - 2) * (m / 100), dx = Math.sqrt(Math.max(0, (R - 2) * (R - 2) - (y - cy) * (y - cy))); line(c, cx - dx, y, cx - dx + 5, y, 'rgba(240,230,255,0.6)', 1.2); }
    label(c, hol ? 'HOLLOW' : String(Math.floor(g.gloom || 0)), cx, cy + 1, hol ? '#0e0816' : '#f6f2ff', hol ? 9 : 15, 'system-ui', 800);
    // Hollow's ring: a segment for every second, running out clockwise from the top; the grace is the amber tail
    if (hol || grace) {
      const D = k.def.hollowLong ? GLOOM.HOLLOW_LONG : GLOOM.HOLLOW, Gr = GLOOM.GRACE, n = D + Gr, left = Math.max(0, (g.graceUntil || 0) - now), gone = n - left;
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + i * TAU / n + 0.05, a1 = -Math.PI / 2 + (i + 1) * TAU / n - 0.05, amber = i >= D;
        const part = Math.max(0, Math.min(1, i + 1 - gone));   // 1 = whole second left, 0 = spent
        c.beginPath(); c.arc(cx, cy, R + 7, a0, a1); c.lineWidth = 4.5; c.lineCap = 'butt'; c.strokeStyle = 'rgba(14,8,22,0.8)'; c.stroke();
        if (part > 0.01) { c.beginPath(); c.arc(cx, cy, R + 7, a0, a0 + (a1 - a0) * part); c.lineWidth = 3.4; c.strokeStyle = amber ? (grace ? `rgba(255,${150 + 60 * Math.sin(t * 9)},106,1)` : '#ffb06a') : GH; c.stroke(); }
      }
    }
    // debt against healing
    if (hl) {
      const debt = Math.max(1, hl.debt), maxHp = (k.env.maxHp && k.env.maxHp()) || 1, scale = Math.max(debt, hl.healed, maxHp * 0.25), bw = 118, bx = cx - bw / 2, by = cy + R + 13, covered = hl.healed >= debt;
      rrect(c, bx, by, bw, 7, 3, '#241830', OUT, 1);
      rrect(c, bx, by, Math.max(2, bw * Math.min(1, debt / scale)), 7, 3, '#c0405a');
      rrect(c, bx, by + 9, bw, 7, 3, '#241830', OUT, 1);
      rrect(c, bx, by + 9, Math.max(2, bw * Math.min(1, hl.healed / scale)), 7, 3, covered ? '#5fe08a' : '#7fc89a');
      const mx = bx + bw * Math.min(1, debt / scale); line(c, mx, by + 8, mx, by + 17, '#ffffff', 1.2);   // the debt, marked on the healed bar: reach it
      label(c, `debt ${Math.round(hl.debt)}`, cx, by + 6, '#fff', 8, 'system-ui', 700);
      label(c, `healed ${Math.round(hl.healed)}`, cx, by + 15, '#fff', 8, 'system-ui', 700);
      label(c, covered ? 'covered' : `short ${Math.round(debt - hl.healed)}`, cx, by + 26, covered ? '#8ff0b0' : '#ff9ab0', 9, 'system-ui', 700);
    }
  },
});

// ======================================================================= Reaper (id thresher; damage, class 19)
// Toll (the gauge kind stays `harvest`): four slots, one per affliction on the boss (Mark, Drain, Bind, Thread). Each slot is a
// stack of Weight pips from the foot up (as many as the spec holds: 2, 3 or 5), lit in the affliction's own colour; a slot at full
// Weight glows. A fine line under each slot runs down with its seconds (none for an Anchored Thread), and the affliction's sigil sits
// under that. The one you laid last (what Sever takes) wears a pale chevron over its slot. A fine line under them runs down with
// the Wisp's seconds (a small blue flame at its end), and in the Gate five pips count the strikes (the fifth gold). An empty slot is
// dark. The painted gauge replaces this later.
Object.assign(GAUGES, {
  harvest(c, k, w, h, t) {
    const g = k.g, now = k.now, ids = THRESH.IDS, max = thMaxW(k), dur = k.def.affDur || THRESH.DUR;
    const bw = 26, gap = 8, tot = ids.length * bw + (ids.length - 1) * gap, x0 = w / 2 - tot / 2, top = 8, bh = 48;
    const hidden = id => !!(k.def.noAff && k.def.noAff.indexOf(id) >= 0);
    const COL = { mark: '#ff6a6a', drain: '#ff8fd0', bind: '#b88cff', thread: '#dff2f0' };
    // the affliction's glyph, small, under its slot
    const mini = (id, x, y, s, col, dim) => {
      c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = dim ? 0.45 : 1;
      const path = () => {
        c.beginPath();
        if (id === 'mark') { c.moveTo(0, -s); c.lineTo(s * 0.68, 0); c.lineTo(0, s); c.lineTo(-s * 0.68, 0); c.closePath(); c.moveTo(0, -s * 0.55); c.lineTo(0, s * 0.55); }
        else if (id === 'drain') { c.moveTo(0, -s * 1.05); c.bezierCurveTo(s * 0.9, -s * 0.1, s * 0.8, s * 0.8, 0, s * 0.8); c.bezierCurveTo(-s * 0.8, s * 0.8, -s * 0.9, -s * 0.1, 0, -s * 1.05); }
        else if (id === 'bind') { for (let i = 0; i < 3; i++) { const a = i * TAU / 3 - Math.PI / 2; c.save(); c.rotate(a); c.moveTo(s * 1.04, 0); c.ellipse(s * 0.42, 0, s * 0.62, s * 0.34, 0, 0, TAU); c.restore(); } }
        else { for (let i = 0; i < 3; i++) { const lx = (i - 1) * s * 0.62, ly = (i - 1) * s * 0.62, rx = s * (i % 2 ? 0.42 : 0.3), ry = s * (i % 2 ? 0.3 : 0.42); c.moveTo(lx + rx, ly); c.ellipse(lx, ly, rx, ry, 0.6, 0, TAU); } }
      };
      c.strokeStyle = '#0c0a14'; c.lineWidth = 3.6; path(); c.stroke(); c.strokeStyle = col; c.lineWidth = 1.6; path(); c.stroke();
      c.restore();
    };
    ids.forEach((id, i) => {
      const x = x0 + i * (bw + gap), cx = x + bw / 2, a = g.aff[id], wt = a ? a.w : 0, col = COL[id], full = wt >= max, last = g.last === id && wt > 0;
      if (hidden(id)) { rrect(c, x, top, bw, bh, 6, '#14131a', OUT, 2); label(c, '-', cx, top + bh / 2, '#4a4650', 12, 'system-ui', 700); return; }
      if (full) glow(c, cx, top + bh / 2, bh * 0.75, col, 0.24 + 0.1 * Math.sin(t * 6 + i));
      rrect(c, x, top, bw, bh, 6, '#100c1a', last ? '#e0f6ff' : OUT, last ? 2 : 2.4);
      // the Weight pips, from the foot up
      const ph = (bh - 6 - (max - 1) * 3) / max;
      for (let p = 0; p < max; p++) {
        const py = top + bh - 3 - (p + 1) * ph - p * 3, on = p < wt;
        rrect(c, x + 3, py, bw - 6, ph, 2.5, on ? col : 'rgba(90,88,112,0.22)', on ? 'rgba(10,8,18,0.8)' : null, 1);
        if (on) { c.save(); c.globalAlpha = 0.5; c.fillStyle = '#ffffff'; c.fillRect(x + 5, py + 1.2, bw - 10, 1.6); c.restore(); }
      }
      if (full) { c.save(); c.globalAlpha = 0.5 + Math.sin(t * 6 + i) * 0.3; rrect(c, x - 1, top - 1, bw + 2, bh + 2, 7, null, col, 2); c.restore(); }
      // what Sever takes: a pale chevron over the slot
      if (last) { c.save(); c.strokeStyle = '#e0f6ff'; c.lineWidth = 1.8; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(cx - 5, top - 7); c.lineTo(cx, top - 2.5); c.lineTo(cx + 5, top - 7); c.stroke(); c.restore(); }
      // its seconds
      const ty = top + bh + 4;
      rrect(c, x, ty, bw, 3, 1.5, '#120e1c');
      if (a && isFinite(a.until)) rrect(c, x, ty, Math.max(1.5, bw * Math.min(1, (a.until - now) / dur)), 3, 1.5, (a.until - now) < 3 ? '#ffffff' : col);
      else if (a) rrect(c, x, ty, bw, 3, 1.5, col);
      mini(id, cx, top + bh + 17, 6, wt ? col : '#5a5870', !wt);
    });
    // the Wisp's seconds, a fine line with a little pale flame at its end
    const wl = k.has('wisp') ? k.remaining('wisp') : 0, wy = top + bh + 30;
    rrect(c, x0, wy, tot, 4, 2, '#120e1c', OUT, 1);
    if (wl > 0) {
      const fw = (tot - 2) * Math.min(1, wl / THRESH.WISP_DUR);
      rrect(c, x0 + 1, wy + 0.5, Math.max(2, fw), 3, 1.5, '#9ad4ff');
      glow(c, x0 + 1 + fw, wy + 2, 7, '#7ec4ff', 0.8); circle(c, x0 + 1 + fw, wy + 2, 1.8, '#ffffff');
    }
    // inside the Gate: five pips, the fifth gold
    if (k.has('gate')) {
      const n = g.gate | 0;
      for (let i = 0; i < 5; i++) {
        const px = w / 2 + (i - 2) * 18, py = wy + 17, last = i === 4, lit = i < n;
        if (lit) glow(c, px, py, last ? 12 : 9, last ? '#ffd65a' : '#8fd8e8', 0.5);
        circle(c, px, py, last ? 6.5 : 5, lit ? (last ? '#ffe27a' : '#8fd8e8') : '#120e1c', last ? '#ffe27a' : '#6a7a90', 1.6);
      }
    }
  },
});

// ======================================================================= Tidecaller (healer, class 20)
// Tide: a tall glass vial of sea water that rises on its own clock, holds at the crest and ebbs. The surface ripples and a
// small arrow beside it says which way the water is going; the foot of the vial is tinted for LOW water (where Sip is
// stronger, 35) and its head for the crest (90 and up), where a pearl marker waits and shrinks away over the hold. Spring
// Flood floods the vial gold-white with a ring running down its seconds; Breakwater lays stone blocks over it (the water
// is held) with a bar of its seconds. Beside it: the Riptide Mark (a whirl in a ring that runs down, green when the mark will
// pop at the next crest, rust when it will lapse first), the Deep Shield (Undertow: a dark bar draining), a free Sip drop
// (Low Water) and, with Tide Table, a strip of the next 20s with a pearl tick where the next crest lands. The painted gauge
// replaces this later.
const TIDE_G = { he: -1, h0: 2 };
Object.assign(GAUGES, {
  tide(c, k, w, h, t) {
    const g = k.g, now = k.now, f = Math.max(0, Math.min(1, (g.tide || 0) / 100)), ph = g.tphase || 'rise';
    const flood = now < (g.floodUntil || 0), wall = now < (g.wallUntil || 0), deep = now < (g.deepUntil || 0), mark = g.mark && now < g.mark.until ? g.mark : null;
    const cx = 34, vw = 30, top = 12, vh = 90, bot = top + vh, x0 = cx - vw / 2, TEAL = '#3fb8a8', FOAM = '#eaf8f5', PEARL = '#d7f2ee';
    const lowY = bot - vh * 0.35, hiY = bot - vh * 0.9, hold = ph === 'hold' && !flood;
    if (g.holdEnd !== TIDE_G.he) { TIDE_G.he = g.holdEnd; TIDE_G.h0 = Math.max(0.5, (g.holdEnd || 0) - now); }
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    // the light round the vial: gold-white in a flood, pearl at the crest, a faint teal once the water is up
    if (flood) glow(c, cx, top + vh / 2, 62, '#fff0b8', 0.32 + 0.1 * pulse);
    else if (hold || f > 0.9) glow(c, cx, top + 10, 44, PEARL, 0.18 + 0.1 * pulse);
    else if (f > 0.4) glow(c, cx, bot - vh * f * 0.5, 40, TEAL, 0.1 * f);
    const shape = () => { c.beginPath(); c.roundRect(x0, top, vw, vh, 12); };
    shape(); c.fillStyle = '#0c1c26'; c.fill();
    c.save(); shape(); c.clip();
    // the low-water band and the crest band, tinted behind the water
    c.fillStyle = 'rgba(63,184,168,0.12)'; c.fillRect(x0, lowY, vw, bot - lowY);
    c.fillStyle = 'rgba(215,242,238,0.13)'; c.fillRect(x0, top, vw, hiY - top);
    // the water: a gradient from deep teal to pale, a rippling surface with a lighter swell riding it
    const sy = bot - vh * f, amp = ph === 'ebb' ? 1.3 : 1.9;
    const gr = c.createLinearGradient(0, sy, 0, bot);
    if (flood) { gr.addColorStop(0, '#fffbe6'); gr.addColorStop(0.5, '#8fe8dc'); gr.addColorStop(1, '#2a9a98'); }
    else if (deep) { gr.addColorStop(0, '#6ad0d8'); gr.addColorStop(0.5, '#2c8fa6'); gr.addColorStop(1, '#12506a'); }
    else { gr.addColorStop(0, f > 0.9 ? '#e8fbf6' : '#8fe8d8'); gr.addColorStop(0.45, '#3fb8a8'); gr.addColorStop(1, '#17606c'); }
    c.fillStyle = gr; c.beginPath(); c.moveTo(x0, bot);
    for (let x = x0; x <= x0 + vw + 1; x += 3) c.lineTo(x, sy + Math.sin(x * 0.32 + t * 3.2) * amp + Math.sin(x * 0.15 - t * 1.7) * 0.8);
    c.lineTo(x0 + vw, bot); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.14)'; c.beginPath(); c.moveTo(x0, bot);
    for (let x = x0; x <= x0 + vw + 1; x += 3) c.lineTo(x, sy + 5 + Math.sin(x * 0.22 - t * 2.4) * 1.6);
    c.lineTo(x0 + vw, bot); c.closePath(); c.fill();
    // the surface line and bubbles rising from the floor
    if (f > 0.02) { c.strokeStyle = FOAM; c.globalAlpha = 0.9; c.lineWidth = 1.4; c.beginPath(); for (let x = x0; x <= x0 + vw; x += 3) { const yy = sy + Math.sin(x * 0.32 + t * 3.2) * amp + Math.sin(x * 0.15 - t * 1.7) * 0.8; x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); c.globalAlpha = 1; }
    if (f > 0.1) for (let i = 0; i < 4; i++) { const q = (t * 0.5 + i * 0.27) % 1, by = bot - 4 - q * (vh * f - 6), bx = x0 + 7 + ((i * 7) % 16) + Math.sin(q * 9 + i) * 2; c.fillStyle = 'rgba(234,248,245,' + (0.55 * (1 - q)).toFixed(2) + ')'; c.beginPath(); c.arc(bx, by, 1.1 + (i % 2) * 0.6, 0, TAU); c.fill(); }
    // Breakwater: stone blocks laid over the vial, and the water held
    if (wall) {
      c.fillStyle = 'rgba(120,138,150,0.34)'; c.fillRect(x0, top, vw, vh);
      c.strokeStyle = 'rgba(20,28,36,0.8)'; c.lineWidth = 1;
      for (let r = 0; r < 9; r++) { const yy = top + r * 10; c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + vw, yy); c.stroke(); for (let b = 0; b < 2; b++) { const bx = x0 + (r % 2 ? 7 : 15) + b * 15; c.beginPath(); c.moveTo(bx, yy); c.lineTo(bx, yy + 10); c.stroke(); } }
    }
    c.restore();
    shape(); c.lineWidth = 2.6; c.strokeStyle = flood ? '#fff0b8' : wall ? '#9fb2be' : hold ? PEARL : f > 0.4 ? '#4aa8a0' : '#3a5a66'; c.stroke();
    // the marks on the vial: low water (Sip is stronger) at 35, the crest at 90
    for (const [yy, col] of [[lowY, TEAL], [hiY, PEARL]]) { line(c, x0 + vw + 1, yy, x0 + vw + 6, yy, col, 1.6); line(c, x0 - 6, yy, x0 - 1, yy, col, 1.6); }
    label(c, 'low', x0 - 10, lowY + 3, 'rgba(120,214,200,0.8)', 7, 'system-ui', 700);
    // the pearl at the crest: it glows while the crest holds and a ring over the vial's head runs down with its seconds
    const pearlY = top - 1;
    if (hold) {
      const left = Math.max(0, (g.holdEnd || 0) - now), q = Math.min(1, left / TIDE_G.h0);
      glow(c, cx, pearlY + 6, 18, '#ffffff', 0.45 + 0.2 * pulse);
      c.beginPath(); c.arc(cx, top + 14, 20, -Math.PI / 2 - Math.PI * q * 0.6, -Math.PI / 2 + Math.PI * q * 0.6); c.lineWidth = 2.4; c.lineCap = 'round'; c.strokeStyle = g.spring ? '#ffe9a0' : PEARL; c.stroke();
    }
    circle(c, cx, pearlY + 3, hold ? 4.2 : 3.2, hold ? '#ffffff' : 'rgba(215,242,238,0.55)', '#26404a', 1.2);
    if (g.spring) { glow(c, cx, pearlY + 3, 9, '#ffe9a0', 0.5); circle(c, cx, pearlY + 3, 1.6, '#ffe9a0'); }
    // which way the water is going: a small arrow at the surface on the right of the vial
    const ax = x0 + vw + 11, ay = Math.max(top + 8, Math.min(bot - 8, sy));
    const dirc = flood ? '#fff0b8' : ph === 'rise' ? '#8fe8d8' : ph === 'ebb' ? '#ff9a7a' : PEARL;
    if (ph === 'hold' || wall) { c.fillStyle = dirc; c.fillRect(ax - 4, ay - 1.3, 8, 2.6); }
    else { const up = ph === 'rise' ? 1 : -1, bob = Math.sin(t * 5) * 1.2 * up; poly(c, [ax, ay - 5 * up - bob, ax + 4.5, ay + 1 * up - bob, ax - 4.5, ay + 1 * up - bob], dirc, '#10202a', 1); }
    // the right column: what the water is doing, the Mark, the Deep Shield, the foot strip
    const rx = 74, nc = typeof tideNextCrest === 'function' ? tideNextCrest(k) : 0;
    const word = flood ? 'FLOOD' : wall ? 'HELD' : ph === 'rise' ? (f >= 0.9 ? 'High' : f < 0.35 ? 'Low' : 'Rising') : ph === 'hold' ? 'CREST' : 'Ebbing';
    label(c, word, rx + 24, top + 9, flood ? '#fff0b8' : wall ? '#c4d2da' : ph === 'ebb' ? '#ffb8a0' : hold ? '#ffffff' : '#bff3ea', 13, 'system-ui', 800);
    const sub = flood ? Math.max(0, g.floodUntil - now).toFixed(1) + 's' : wall ? Math.max(0, g.wallUntil - now).toFixed(1) + 's held' : hold ? 'now' : 'crest ' + Math.ceil(nc) + 's';
    label(c, sub, rx + 24, top + 22, 'rgba(210,235,232,0.75)', 9, 'system-ui', 600);
    // the Riptide Mark: a whirl in a ring that runs down over its 20s
    const my = top + 48, left = mark ? Math.max(0, mark.until - now) : 0, willPop = mark && nc <= left + 0.2;
    const mcol = !mark ? '#3a5a66' : willPop ? '#8fe8a8' : '#e0916a';
    glow(c, rx + 10, my, 16, mcol, mark ? 0.22 + (willPop && nc < 3 ? 0.14 * pulse : 0) : 0);
    circle(c, rx + 10, my, 12, 'rgba(12,28,38,0.9)', '#1a2e3a', 1.4);
    if (mark) { c.beginPath(); c.arc(rx + 10, my, 12, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, left / 20)); c.lineWidth = 2.6; c.lineCap = 'round'; c.strokeStyle = mcol; c.stroke(); }
    c.save(); c.translate(rx + 10, my); c.rotate(t * (mark ? 1.4 : 0.3)); c.strokeStyle = mcol; c.globalAlpha = mark ? 1 : 0.6; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); for (let i = 0; i <= 22; i++) { const a = i * 0.46, r = 1.2 + i * 0.26; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); c.restore();
    label(c, mark ? 'Mark' : 'no Mark', rx + 38, my - 1, mark ? '#d7f2ee' : 'rgba(140,170,176,0.75)', 9, 'system-ui', 700);
    label(c, mark ? (willPop ? 'pops ' + Math.ceil(nc) + 's' : 'lapses') : '', rx + 38, my + 10, mcol, 8.5, 'system-ui', 700);
    // the Deep Shield (Undertow): a dark bar of its seconds
    const dy = top + 68;
    if (deep) { const dl = Math.max(0, g.deepUntil - now), dw = 56; rrect(c, rx, dy, dw, 6, 3, '#0e2230', OUT, 1); rrect(c, rx + 0.5, dy + 0.5, Math.max(2, (dw - 1) * Math.min(1, dl / 10)), 5, 2.5, '#2c8fa6'); label(c, 'Deep ' + dl.toFixed(0) + 's', rx + dw / 2, dy + 16, '#8fd8e4', 8.5, 'system-ui', 700); }
    // a free Sip waiting (Low Water): a drop
    if (g.lowWater) { glow(c, rx + 6, dy + 3, 12, '#bff3ea', 0.4 + 0.2 * pulse); poly(c, [rx + 6, dy - 5, rx + 10.5, dy + 3, rx + 6, dy + 8, rx + 1.5, dy + 3], '#d7f2ee', '#10202a', 1); label(c, 'free Sip', rx + 32, dy + 6, '#d7f2ee', 8.5, 'system-ui', 700); }
    // Tide Table: the next 20 seconds on a strip, a pearl tick where the next crest lands (the cycle is 20s)
    if (k.talent && k.talent('tidecaller_table')) {
      const sw = 56, sy2 = h - 11, px = rx + sw * Math.max(0, Math.min(1, nc / 20));
      rrect(c, rx, sy2, sw, 5, 2.5, '#0e2230', OUT, 1);
      c.fillStyle = 'rgba(63,184,168,0.4)'; c.fillRect(rx + 1, sy2 + 0.5, Math.max(0, px - rx - 1), 4);
      line(c, px, sy2 - 4, px, sy2 + 9, '#ffffff', 1.6); circle(c, px, sy2 - 5, 2, PEARL, '#10202a', 0.8);
    }
  },
});

// ======================================================================= Lanternkeeper (healer, class 21)
// Embers: a hanging iron lantern, its roof and bars in iron with brass trim, and in the bottom of its cage a bed of coals, one for
// every Ember you can hold (4, or 5 with Hoarded Embers). A lit coal glows orange with a white-gold heart; the next one warms as
// its 5 seconds come round (a thin ring closing on it). The flame standing over the bed is how full you are: a stub with one coal,
// a tall gold tongue with the cage full. Two small sparks under the lantern are the Trim count (the third bolt gives an Ember).
// Beside it, the wicks: one small lantern for each light you have out (a hanging hand lantern has its hook), its flame shrinking
// from tall gold to a red stub as the wick burns down, so the lanterns that need a Trim or a Relight can be seen from here.
// Lamplighter's Stride shows its seconds as a small bar; Lighthouse sets two beams turning behind the lantern and a ring of its
// seconds round it. The painted gauge replaces this later.
const LK_FLAME = w => (w > 0.66 ? '#ffd27a' : w > 0.33 ? '#ffa94a' : w > 0.02 ? '#ff7a3a' : '#c8452a');
// a teardrop of flame standing on (x, y), h tall, bending a little with sway
function lkFlameShape(c, x, y, h, w, sway) {
  c.beginPath(); c.moveTo(x + sway, y - h);
  c.quadraticCurveTo(x + w * 0.9 + sway * 0.4, y - h * 0.38, x, y);
  c.quadraticCurveTo(x - w * 0.9 + sway * 0.4, y - h * 0.38, x + sway, y - h);
  c.closePath();
}
Object.assign(GAUGES, {
  embers(c, k, w, h, t) {
    const g = k.g, now = k.now, max = typeof lkEmbMax === 'function' ? lkEmbMax(k) : 4, emb = Math.max(0, Math.min(max, g.emb || 0));
    const every = typeof LANTERN !== 'undefined' ? LANTERN.EMB_EVERY : 5, frac = emb >= max ? 0 : Math.max(0, Math.min(1, (g.embAt || 0) / every));
    const lit = now < (g.lightUntil || 0), stride = now < (g.strideUntil || 0), f = emb / max;
    const cx = 42, IRON = '#2b2620', IRON2 = '#46403a', BRASS = '#b98f45', pulse = 0.5 + 0.5 * Math.sin(t * 6);
    const flick = Math.sin(t * 11) * 0.5 + Math.sin(t * 17.3) * 0.5;
    // Lighthouse: two beams turning behind the lantern, a ring of its seconds
    if (lit) {
      const left = Math.max(0, (g.lightUntil || 0) - now), q = Math.min(1, left / (typeof LANTERN !== 'undefined' ? LANTERN.LIGHT : 8));
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 2; b++) {
        const a = t * 0.9 + b * Math.PI;
        c.fillStyle = 'rgba(255,214,140,0.16)'; c.beginPath(); c.moveTo(cx, 58); c.lineTo(cx + Math.cos(a - 0.13) * 90, 58 + Math.sin(a - 0.13) * 90); c.lineTo(cx + Math.cos(a + 0.13) * 90, 58 + Math.sin(a + 0.13) * 90); c.closePath(); c.fill();
      }
      c.restore();
      glow(c, cx, 58, 56, '#fff0c8', 0.22 + 0.06 * pulse);
      c.beginPath(); c.arc(cx, 58, 40, -Math.PI / 2, -Math.PI / 2 + TAU * q); c.lineWidth = 2; c.lineCap = 'round'; c.strokeStyle = 'rgba(255,236,190,0.8)'; c.stroke();
    } else if (f > 0.05) glow(c, cx, 70, 38 + 10 * f, '#ff9f3a', 0.1 + 0.16 * f);
    // the chain and ring, the roof with its finial
    line(c, cx, 0, cx, 8, IRON2, 1.6); circle(c, cx, 10.5, 3, null, BRASS, 1.6);
    poly(c, [cx - 7, 17, cx + 7, 17, cx + 21, 28, cx - 21, 28], IRON, OUT, 1.6);
    line(c, cx - 15, 24, cx + 15, 24, BRASS, 1.2); circle(c, cx, 15.5, 2.2, BRASS, OUT, 0.8);
    // the cage: dark glass, the warm inside, the flame over the coals
    const top = 28, bot = 90, x0 = cx - 21, cw = 42;
    c.save(); c.beginPath(); c.rect(x0, top, cw, bot - top); c.clip();
    c.fillStyle = '#15100c'; c.fillRect(x0, top, cw, bot - top);
    const warm = lit ? 0.62 : 0.12 + 0.4 * f;
    const gr = c.createRadialGradient(cx, bot - 8, 2, cx, bot - 8, 48); gr.addColorStop(0, `rgba(${lit ? '255,236,190' : '255,170,70'},${warm.toFixed(3)})`); gr.addColorStop(1, 'rgba(255,150,50,0)');
    c.fillStyle = gr; c.fillRect(x0, top, cw, bot - top);
    if (emb > 0.05 || lit) {
      const fh = lit ? 50 : 7 + 40 * f, fw = lit ? 10 : 4.5 + 5 * f, sw = flick * (1 + f);
      lkFlameShape(c, cx, bot - 6, fh * (0.94 + 0.06 * flick), fw, sw); c.fillStyle = lit ? '#ffe9b0' : '#ff9f3a'; c.fill();
      lkFlameShape(c, cx, bot - 6, fh * 0.72, fw * 0.66, sw * 0.8); c.fillStyle = lit ? '#fff6dc' : '#ffc46b'; c.fill();
      lkFlameShape(c, cx, bot - 6, fh * 0.4, fw * 0.36, sw * 0.5); c.fillStyle = '#fffdf0'; c.fill();
    }
    c.restore();
    // the bed of coals: one per Ember
    const span = max > 1 ? 30 : 0;
    for (let i = 0; i < max; i++) {
      const x = cx - span / 2 + (max > 1 ? span * i / (max - 1) : 0), y = 84.5, a = Math.max(0, Math.min(1, emb - i)), next = i === Math.floor(emb) && emb < max;
      const r = 4.2, rock = [x - r, y + 1, x - r * 0.7, y - r * 0.9, x + r * 0.2, y - r, x + r, y - r * 0.2, x + r * 0.8, y + r * 0.9, x - r * 0.1, y + r];
      if (a > 0.02) glow(c, x, y, 11, '#ff8a3a', 0.55 * a + 0.1 * a * flick);
      poly(c, rock, a > 0.02 ? `rgb(${Math.round(70 + 185 * a)},${Math.round(34 + 70 * a)},${Math.round(20 + 14 * a)})` : '#241b16', a > 0.02 ? '#5a2a10' : '#4a3d33', 1);
      if (a > 0.02) circle(c, x - 0.5, y - 0.5, 1.1 + 1.2 * a, `rgba(255,${Math.round(190 + 40 * a)},${Math.round(110 + 60 * a)},${(0.55 + 0.45 * a).toFixed(2)})`);
      if (next && frac > 0.02) {
        glow(c, x, y, 8, '#ff9f3a', 0.3 * frac);
        c.beginPath(); c.arc(x, y, 6.2, -Math.PI / 2, -Math.PI / 2 + TAU * frac); c.lineWidth = 1.4; c.lineCap = 'round'; c.strokeStyle = 'rgba(255,196,107,0.9)'; c.stroke();
      }
    }
    // the bars and rails over the front of the cage, the base with its feet
    for (const bx of [x0, cx - 10.5, cx + 10.5, x0 + cw]) line(c, bx, top, bx, bot, IRON, bx === x0 || bx === x0 + cw ? 3 : 2.2);
    for (const bx of [x0, cx - 10.5, cx + 10.5, x0 + cw]) line(c, bx - 0.5, top + 1, bx - 0.5, bot - 1, IRON2, 0.8);
    rrect(c, x0 - 2, top - 2.5, cw + 4, 4.5, 1.5, IRON, OUT, 1.2); line(c, x0, top - 0.5, x0 + cw, top - 0.5, BRASS, 1);
    rrect(c, x0 - 2, bot, cw + 4, 7, 2, IRON, OUT, 1.4); line(c, x0, bot + 1.5, x0 + cw, bot + 1.5, BRASS, 1);
    for (const fx of [x0 + 1, x0 + cw - 1]) poly(c, [fx - 3, bot + 7, fx + 3, bot + 7, fx + 2, bot + 11, fx - 2, bot + 11], IRON, OUT, 1);
    // the number, and the Trim sparks (two: the third bolt gives an Ember)
    label(c, String(Math.round(emb)), cx, 113, f >= 1 ? '#ffe2a0' : '#f2e6c8', 13, 'system-ui', 800);
    for (let i = 0; i < 2; i++) {
      const on = (g.trims || 0) > i, x = cx + 18 + i * 9, y = 108;
      if (on) glow(c, x, y, 7, '#ffc46b', 0.5);
      poly(c, [x, y - 3.4, x + 2.6, y, x, y + 3.4, x - 2.6, y], on ? '#ffd27a' : '#241b16', on ? '#fff0c0' : '#4a3d33', 0.9);
    }
    // the wicks: a small lantern for every light out, its flame the wick
    label(c, 'wicks', 108, 11, 'rgba(214,186,130,0.7)', 8, 'system-ui', 700);
    const lan = (g.lan || []).filter(l => l.kind !== 'float').slice(-6);
    if (!lan.length) {
      label(c, 'none lit', 108, 44, 'rgba(160,140,110,0.6)', 9, 'system-ui', 600);
      for (let i = 0; i < 3; i++) rrect(c, 93 + i * 15 - 4, 52, 8, 6, 1.5, 'rgba(36,27,22,0.8)', 'rgba(74,61,51,0.8)', 1);
    }
    lan.forEach((l, i) => {
      const x = 93 + (i % 3) * 15, yb = (i < 3 ? 42 : 72), wk = Math.max(0, Math.min(1, l.wick)), big = l.kind === 'beacon', eternal = l.kind === 'eternal';
      const col = eternal ? '#fff0c8' : LK_FLAME(wk), fh = eternal ? 11 : 2 + 11 * wk, sw = Math.sin(t * 9 + i * 2) * 0.6;
      if (big) line(c, x, yb + 5, x, yb + 12, IRON2, 2);
      if (l.on != null && l.kind === 'hand') { c.beginPath(); c.arc(x, yb - 15.5, 2.6, Math.PI, 0); c.lineWidth = 1.1; c.strokeStyle = BRASS; c.stroke(); }
      glow(c, x, yb - fh * 0.5, 7 + fh * 0.4, col, 0.3);
      lkFlameShape(c, x, yb - 1, fh, 2.7, sw); c.fillStyle = col; c.fill();
      if (wk > 0.34 || eternal) { lkFlameShape(c, x, yb - 1, fh * 0.5, 1.2, sw * 0.5); c.fillStyle = '#fffbea'; c.fill(); }
      rrect(c, x - 4.4, yb - 1, 8.8, 6.2, 1.4, IRON, OUT, 1); line(c, x - 4, yb + 0.5, x + 4, yb + 0.5, BRASS, 0.9);
      if (wk <= 0.02 && !eternal) circle(c, x, yb - 2.2, 1.3, '#c8452a');
    });
    // Lamplighter's Stride: the seconds left to drop lights, a small bar
    if (stride) {
      const left = Math.max(0, (g.strideUntil || 0) - now), q = Math.min(1, left / (typeof LANTERN !== 'undefined' ? LANTERN.STRIDE : 10));
      rrect(c, 88, 92, 38, 5, 2.5, '#1d1612', OUT, 1); rrect(c, 88.5, 92.5, Math.max(2, 37 * q), 4, 2, '#ff9f5a');
      label(c, 'Stride ' + left.toFixed(0) + 's', 107, 105, '#ffb98a', 8.5, 'system-ui', 700);
    }
    if (lit) {
      const left = Math.max(0, (g.lightUntil || 0) - now);
      label(c, 'Lighthouse ' + left.toFixed(0) + 's', 98, stride ? 114 : 100, '#fff0c8', 8, 'system-ui', 800);
    }
  },
});

// ======================================================================= Kenseier (tank, class 22)
// Poise: a lacquered guard disc (a tsuba) ringed by twenty segments that fill ember-orange, running low to a flickering red; the
// blade stands upright in the middle of it. Off-balance greys the ring out, cracks the disc and counts its seconds down; while the
// boss is Broken (the party's window) the disc rings white-gold and the blade burns bright. A short ash bar under it is the key's
// rest after a deflect that caught nothing. The boss's Posture is not here: it is under the boss's name (raid-ui.js). The painted
// gauge replaces this later.
Object.assign(GAUGES, {
  poise(c, k, w, h, t) {
    const g = k.g, now = k.now, v = Math.max(0, Math.min(1, (g.poise || 0) / 100)), cx = w / 2, cy = 46, R = 33;
    const off = now < (g.offUntil || 0), brk = now < (g.breakUntil || 0), rest = now < (g.noDefl || 0), low = v < 0.3;
    const EM = '#ff8a3d', HOT = '#ffd9b0', GOLD = '#ffe2a0', ASH = '#a29d94', pl = 0.5 + 0.5 * Math.sin(t * 7);
    // the light behind the disc
    if (brk) glow(c, cx, cy, R + 22, GOLD, 0.34 + 0.12 * pl);
    else if (off) glow(c, cx, cy, R + 14, '#ff4a3a', 0.2 + 0.1 * pl);
    else if (v > 0.55) glow(c, cx, cy, R + 12, EM, 0.16 * v);
    circle(c, cx, cy, R, '#16161b', OUT, 2.4);
    circle(c, cx, cy, R - 12, '#0f0f13', brk ? GOLD : '#34343c', 1.4);
    // the segments, clockwise from the top; the last lit one is partial
    const n = 20, step = TAU / n;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * step + 0.05, fill = Math.max(0, Math.min(1, v * n - i));
      c.beginPath(); c.arc(cx, cy, R - 6, a0, a0 + step - 0.1); c.lineWidth = 6; c.lineCap = 'butt';
      c.strokeStyle = '#26262d'; c.stroke();
      if (fill <= 0.01) continue;
      c.globalAlpha = off ? 0.55 : low ? 0.65 + 0.35 * pl : 1;
      c.strokeStyle = off ? '#7a766f' : brk ? GOLD : low ? '#ff5a3a' : v > 0.8 ? '#ffa45c' : EM;
      c.beginPath(); c.arc(cx, cy, R - 6, a0, a0 + (step - 0.1) * fill); c.stroke(); c.globalAlpha = 1;
    }
    // the blade standing in the disc: a wrapped grip, a guard, a long pale blade with its edge
    const bx = cx, by = cy + 11;
    rrect(c, bx - 1.6, by - 2, 3.2, 9, 1, '#1b1b20', OUT, 1); line(c, bx - 1.6, by, bx + 1.6, by + 2, ASH, 0.8); line(c, bx - 1.6, by + 3, bx + 1.6, by + 5, ASH, 0.8);
    ellipse(c, bx, by - 3, 5, 1.6, 0, '#46464e', OUT, 1);
    c.beginPath(); c.moveTo(bx - 1.8, by - 4); c.lineTo(bx - 1.8, by - 23); c.quadraticCurveTo(bx - 1.6, by - 27, bx + 2.2, by - 28); c.lineTo(bx + 2.2, by - 4); c.closePath();
    c.fillStyle = brk ? '#fff6e0' : '#cfcbc2'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke();
    c.save(); c.globalAlpha = off ? 0.35 : 0.65 + 0.35 * v; line(c, bx + 1.8, by - 5, bx + 1.8, by - 26, brk ? '#ffffff' : EM, 1.3); c.restore();
    if (brk) glow(c, bx, by - 16, 16, GOLD, 0.45 + 0.15 * pl);
    // Off-balance: a crack across the disc and the ring greyed
    if (off) {
      c.save(); c.strokeStyle = '#ff6a4a'; c.lineWidth = 1.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = 0.9;
      c.beginPath(); c.moveTo(cx - 20, cy - 12); c.lineTo(cx - 8, cy - 4); c.lineTo(cx - 12, cy + 4); c.lineTo(cx + 2, cy + 8); c.lineTo(cx + 6, cy + 18); c.moveTo(cx - 8, cy - 4); c.lineTo(cx + 4, cy - 14); c.stroke(); c.restore();
    }
    // the words under it
    const ty = cy + R + 14;
    if (off) label(c, 'OFF-BALANCE ' + Math.max(0, (g.offUntil || 0) - now).toFixed(1) + 's', cx, ty, '#ff9a86', 11, 'system-ui', 800);
    else if (brk) label(c, 'BREAK ' + Math.max(0, (g.breakUntil || 0) - now).toFixed(1) + 's', cx, ty, '#ffe9b0', 12, 'system-ui', 800);
    else label(c, String(Math.floor(g.poise || 0)) + ' Poise', cx, ty, low ? '#ff9a86' : '#f2e6c8', 12, 'system-ui', 800);
    // the key resting after a deflect that caught nothing
    if (rest) {
      const q = Math.max(0, Math.min(1, ((g.noDefl || 0) - now) / (typeof KENSEI !== 'undefined' ? KENSEI.LOCK : 0.6)));
      rrect(c, cx - 22, h - 6, 44, 4, 2, '#1c1c22', OUT, 1); rrect(c, cx - 21.5, h - 5.5, Math.max(2, 43 * q), 3, 1.5, ASH);
    }
  },
});

// ======================================================================= Houndmaster (melee DPS, class 23)
// Pack: a hound's portrait for each hound (Rust in a rust collar, Ash in an ash-grey one; Lone Wolf has Greyfang alone, bigger and greyer),
// each in a ring in its collar colour with a little compass under it for its place round the boss (the boss in the middle, facing up: left
// flank, right flank, front, behind) and its own Bond bar. Between the two the pair they hold is a word in its colour (Rend gold, Hamstring
// green, Bring Down lilac, none grey) with a line joining the portraits. The shared Bond (what the finisher spends, a notch at 40) runs along
// the bottom. A downed hound is grey with a cross and the seconds to its return; Mark the Quarry rims the whole gauge in gold, Wild Hunt
// puts four pale ghosts in the middle. The painted gauge replaces this later. (Registered under 'pack', and under the class id and 'hounds'
// in case the kit names it either.)
(() => {
  const PAIRC = { rend: '#f0c050', hamstring: '#9ad46a', bringdown: '#c8a8ff' }, PAIRN = { rend: 'REND', hamstring: 'HAMSTRING', bringdown: 'BRING DOWN' };
  const COATS = { rust: ['#8f7a63', '#6c5845'], ash: ['#948f86', '#6f6a62'], greyfang: ['#8b8e93', '#5f6368'] };
  const COLS = { rust: '#c46a3a', ash: '#b8b2a8', greyfang: '#d6d0c4' };
  const NAMES = { rust: 'RUST', ash: 'ASH', greyfang: 'GREYFANG' };
  const SLOTV = { front: [0, -1], behind: [0, 1], left: [-1, 0], right: [1, 0] };
  // a hound's head in profile, facing right: a narrow muzzle, a folded ear, a collar at the neck. Centred on (x, y), r the portrait's radius.
  function head(c, x, y, r, id, down) {
    const [c1, c2] = COATS[id] || COATS.rust, col = down ? '#6e6a64' : COLS[id] || '#b8b2a8', s = r / 20;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (down) c.globalAlpha = 0.55;
    // neck and collar
    poly(c, [-14, 18, -9, -2, 3, -3, 7, 18], c1, OUT, 1.6);
    poly(c, [-12.5, 8, 6.2, 8, 6.8, 13, -13.4, 13], col, OUT, 1.2);
    circle(c, -3, 14.4, 1.7, down ? '#8a847c' : '#d8b25a', OUT, 0.8);
    // skull, a long narrow muzzle, the nose
    ellipse(c, -1, -5, 9, 8, 0, c1, OUT, 1.8);
    poly(c, [4, -7, 18, -3.2, 18.4, 0.6, 4, 3.6], shade(c1, 0.08), OUT, 1.6);
    line(c, 6, 1, 17, 0.6, c2, 0.8);
    circle(c, 18, -1.6, 1.8, '#1a1416');
    // the ear folded back, the eye
    poly(c, [-3, -11, -11, -5, -12, 3, -6, -2], c2, OUT, 1.2);
    if (down) { line(c, 3, -8, 6.5, -5, '#1a1416', 1.2); line(c, 6.5, -8, 3, -5, '#1a1416', 1.2); }
    else circle(c, 4.5, -6.4, 1.4, '#15100c');
    if (id === 'greyfang' && !down) { line(c, 0, -10.5, 3.5, -6.5, '#e4e6e8', 0.9); line(c, 1.5, -11, 5, -7, '#e4e6e8', 0.8); }
    c.restore();
  }
  // the compass for a place round the boss
  function compass(c, x, y, slot, col, t, away) {
    circle(c, x, y, 7.5, '#16121a', OUT, 1.4);
    circle(c, x, y, 2.4, '#3a3040');
    line(c, x, y - 2.4, x, y - 5.2, '#5a4a6a', 1);   // the boss's nose, up
    const v = SLOTV[slot];
    if (v) { c.save(); circle(c, x + v[0] * 5.6, y + v[1] * 5.6, 2.1 + 0.3 * Math.sin(t * 6), col, OUT, 0.8); c.restore(); }
    else { c.save(); c.setLineDash([2, 2.5]); c.strokeStyle = away ? '#7a6f86' : '#5a4a6a'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 5.6, 0, TAU); c.stroke(); c.restore(); }
  }
  GAUGES.pack = function (c, k, w, h, t) {
    const g = k.g, now = k.now, hs = Array.isArray(g.hounds) ? g.hounds.filter(o => o && !o.spectral) : [], solo = k.def && k.def.spec === 'lonewolf' || hs.length === 1;
    const pair = g.pair, pc = g.all ? '#fff4d0' : PAIRC[pair], mark = now < (g.markUntil || 0), hunt = now < (g.huntUntil || 0) || !!g.all, mount = now < (g.mountUntil || 0);
    const bond = Math.max(0, Math.min(100, g.bond || 0)), cx = w / 2, R = solo ? 25 : 21, cy = 31;
    const pl = 0.5 + 0.5 * Math.sin(t * 6);
    // the gold rim while the quarry is marked
    if (mark) { c.save(); c.globalAlpha = 0.5 + 0.25 * pl; c.strokeStyle = '#f0c050'; c.lineWidth = 2; c.beginPath(); c.roundRect(2, 2, w - 4, h - 4, 10); c.stroke(); c.restore(); }
    if (hunt) glow(c, cx, cy, 30, '#bfe9ff', 0.25 + 0.1 * pl);
    const xs = solo ? [cx] : [cx - Math.min(60, w * 0.3), cx + Math.min(60, w * 0.3)];
    const list = solo ? hs.slice(0, 1) : hs.slice(0, 2);
    // the line joining the pair, lit in its colour
    if (!solo && list.length === 2) {
      c.save(); c.lineCap = 'round';
      line(c, xs[0] + R, cy, xs[1] - R, cy, 'rgba(10,8,14,0.8)', 4.5);
      line(c, xs[0] + R, cy, xs[1] - R, cy, pc ? rgba(pc, 0.55 + 0.3 * pl) : '#3a3340', pc ? 2.4 : 1.6);
      c.restore();
    }
    list.forEach((o, i) => {
      const x = xs[i], down = o.mode === 'down' || (o.downUntil || 0) > now, col = COLS[o.id] || '#b8b2a8';
      if (!down && o.mode === 'bite') glow(c, x, cy, R + 8, col, 0.35 + 0.2 * pl);
      circle(c, x, cy, R, down ? '#1c1a1e' : '#1a2016', OUT, 2);
      c.save(); c.beginPath(); c.arc(x, cy, R - 1, 0, TAU); c.clip(); head(c, x + 1, cy + 3, R * 0.92, o.id, down); c.restore();
      c.save(); c.beginPath(); c.arc(x, cy, R, 0, TAU); c.lineWidth = 2.6; c.strokeStyle = down ? '#5a5650' : col; c.globalAlpha = down ? 0.7 : 1; c.stroke(); c.restore();
      if (!down && o.mode === 'hold') { c.save(); c.strokeStyle = rgba(col, 0.8); c.lineWidth = 1; c.beginPath(); c.arc(x, cy, R + 4, 0, TAU); c.setLineDash([3, 3]); c.stroke(); c.restore(); }
      if (!down && o.shield) { c.save(); c.strokeStyle = 'rgba(242,230,200,0.8)'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, cy, R + 3, 0.2, TAU - 0.2); c.stroke(); c.restore(); }
      if (down) label(c, Math.max(0, Math.ceil((o.downUntil || 0) - now)) + 's', x, cy + 4, '#d8d2c6', 12, 'system-ui', 800);
      // the compass and the Bond bar under it
      compass(c, x, cy + R + 13, down ? null : o.slot, col, t, !down && !o.slot);
      const bx = x - 22, by = cy + R + 24, bw = 44, bf = Math.max(0, Math.min(1, (o.bond || 0) / 100));
      rrect(c, bx, by, bw, 5, 2.5, '#17121a', OUT, 1);
      if (bf > 0.01) rrect(c, bx + 0.5, by + 0.5, Math.max(3, (bw - 1) * bf), 4, 2, down ? '#6e6a64' : col);
      label(c, NAMES[o.id] || '', x, cy - R - 3, down ? '#8a847c' : '#e8dcc0', 8, 'system-ui', 800);
    });
    if (!list.length) { circle(c, cx, cy, R, '#1a2016', OUT, 2); label(c, '?', cx, cy + 5, '#8a847c', 16, 'system-ui', 800); }
    // the word the pair makes
    const by2 = h - 12;
    label(c, g.all ? 'ALL THREE' : pair ? PAIRN[pair] : 'NO PAIR', cx, by2 - 6, pc || '#8f8a96', 10, 'system-ui', 800);
    if (mount) label(c, 'RIDING', cx, 9, '#f0c050', 9, 'system-ui', 800);
    else if (mark) label(c, 'QUARRY', cx, 9, '#f0c050', 9, 'system-ui', 800);
    // the shared Bond along the bottom: a notch where the finisher can be paid for (40), lit once it can
    const bw2 = Math.min(w - 36, 150), bx2 = cx - bw2 / 2;
    rrect(c, bx2, by2, bw2, 7, 3.5, '#17121a', OUT, 1.2);
    if (bond > 0.5) { c.save(); c.beginPath(); c.roundRect(bx2 + 0.5, by2 + 0.5, bw2 - 1, 6, 3); c.clip(); c.fillStyle = bond >= 40 ? (pc || '#e8c15a') : '#8a7a5a'; c.fillRect(bx2 + 0.5, by2 + 0.5, (bw2 - 1) * bond / 100, 6); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(bx2 + 0.5, by2 + 0.5, (bw2 - 1) * bond / 100, 1.5); c.restore(); }
    line(c, bx2 + bw2 * 0.4, by2 - 1, bx2 + bw2 * 0.4, by2 + 8, bond >= 40 ? '#fff4d0' : '#c8b88a', 1.4);
    label(c, String(Math.floor(bond)), bx2 + bw2 + 14, by2 + 7, bond >= 40 ? '#fff4d0' : '#c8b88a', 11, 'system-ui', 800);
    // Wild Hunt: four pale ghosts running along the top edge of the Bond bar
    if (hunt && !solo) for (let i = 0; i < 4; i++) { const gx = cx - 12 + i * 8 + Math.sin(t * 3 + i) * 1.5; c.save(); c.globalAlpha = 0.5 + 0.25 * Math.sin(t * 5 + i); circle(c, gx, cy + 2 + (i % 2) * 5, 2.4, '#d8f0ff'); c.restore(); }
  };
  GAUGES.hounds = GAUGES.pack; GAUGES.houndmaster = GAUGES.pack; GAUGES.kennel = GAUGES.pack;
})();
