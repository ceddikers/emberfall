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
    if (k.g.counter) { glow(c, cx, top + 28, 22, '#bfe0ff', 0.6 + Math.sin(t * 10) * 0.2); label(c, 'âš”', cx, top + 34, '#ffffff', 18, 'system-ui'); }
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
    }
    if (k.has('barrage')) label(c, 'Ã—3', w - 26, 62, '#ffe27a', 14, 'system-ui', 800);
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
    if (k.has('dance')) label(c, 'âœ¦', cx, cy - 34, '#e0a8ff', 18, 'system-ui');
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
    if (k.has('burnt')) label(c, 'âœ–', cx, bottom - 18, '#202020', 20, 'system-ui', 800);
    const sparks = k.has('hotstreak') ? 2 : k.has('heating') ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const x = cx + 32, y = 30 + i * 26, on = i < sparks;
      if (on) glow(c, x, y, 14, '#ffb03a', 0.7);
      poly(c, [x, y - 9, x + 4, y - 2, x + 9, y, x + 4, y + 2, x, y + 9, x - 4, y + 2, x - 9, y, x - 4, y - 2], on ? '#ffe27a' : '#3a2a20', OUT, 1);
    }
    label(c, String(Math.floor(k.g.heat)), cx - 34, 56, '#ffd8b0', 14, 'system-ui', 800);
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
      line(c, cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, cx + Math.cos(a) * 25, cy + Math.sin(a) * 25, i < k.g.bloom ? '#fff6c8' : '#4a4030', 3);
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
    if (k.dotRemaining('thorn') > 0) label(c, 'â¦ ' + Math.ceil(k.dotRemaining('thorn')), w - 22, 20, k.dotRemaining('thorn') < 9 ? '#ffb070' : '#a8e08a', 11, 'system-ui', 700);
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
    if (k.has('lag')) label(c, 'â€¦', cx, mid + 6, '#ff8a7a', 22, 'system-ui', 800);
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
// the left (the next one thrown is raised over a gold mark). The liquid rises as a vial ripens and it glints when ripe;
// a spoiling vial goes murky; a Volatile vial burns down a fuse on its cork.
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
  // the bandolier: a leather strap with a loop per slot
  const n = A.slots, x0 = 74, x1 = w - 4, sp = (x1 - x0) / n, vw = n > 3 ? 15 : 20, vh = n > 3 ? 38 : 46, foot = 96;
  ctx2Strap(c, x0 - 4, x1 + 2, foot - 10);
  const pick = alemPick(k), ripeT = alemRipeTime(k), spoilT = alemSpoilTime(k);
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
    if (i === pick) poly(c, [x - 5, foot + 6, x + 5, foot + 6, x, foot + 1], '#ffd27a', OUT, 1);
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

function drawGauge(c, kit, w, h, t) {
  const g = kit.def.gauge;
  if (g && GAUGES[g.kind]) GAUGES[g.kind](c, kit, w, h, t);
}
