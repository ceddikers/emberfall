// The Barrow Gate: the town's second portal, the way back into the Hollow King's hall for the specialization trials
// (arena/trials.js). It does not exist until some hero on this account has cleared the Hollow King (Save.trialsOpen);
// the first time it shows, it rises out of the cold with a short arrival moment (a banner, the camera, a ring of mist).
// Everything is drawn here in code: a broken barrow arch with a cold ghost-light in its mouth, standing stones, flagstones
// worn pale, a path of stepping stones from the Trophy Hall's east wall. Colours are the Shade's: grey-green stone, pale cyan light.
// main.js owns the panel (openBarrow) and the trial start; this file is only the place itself.

const BarrowGate = (() => {
  const SEEN = 'barrowgate';   // town state: seen[SEEN] once its arrival has played (town-life.js keeps the same book for bosses)
  const ARRIVE = 3.4;          // seconds the arch takes to rise
  const QUIET = 6.5;           // a boss's own town moment (banner, newcomer walking in) has to be over this long first
  const C = { cold: '#9fe6df', pale: '#d8fffa', deep: '#0e2d33', mist: '#cfe8e4', hi: '#aebdb7', mid: '#8a9892', lo: '#64736f', dk: '#3e4b4a', moss: '#5f7d68', plaque: '#1b2628', rim: '#8fc9c4', ink: '#d4f3ef' };
  let deps = null;          // { open(), banner(text), focus(pt), busy(), sound() } from main
  let bornAt = -999;        // when it began to rise (long ago: it is simply there)
  let quietSince = null, colliders = null, T = 0;
  const g = () => TOWN.barrow;
  const isOpen = () => typeof Save !== 'undefined' && !!TOWN.barrow && Save.trialsOpen();
  const rise = now => clamp((now - bornAt) / ARRIVE, 0, 1);   // 0 = not there yet, 1 = risen

  // where the stones stand (local to the gate: base point, size, lean), and which are solid
  const STONES = [
    { x: -140, y: 14, w: 27, h: 64, lean: -0.07 }, { x: -122, y: -54, w: 29, h: 74, lean: 0.05 }, { x: -66, y: -80, w: 24, h: 58, lean: -0.06 },
    { x: 74, y: -82, w: 26, h: 66, lean: 0.07 }, { x: 128, y: -44, w: 27, h: 60, lean: -0.05 }, { x: 146, y: 18, w: 29, h: 68, lean: 0.06 },
  ];
  const PIL = 62, BASE = 34;   // pillar offset from the centre, and the ground line under the arch

  // solid parts: the two pillars, the threshold (you stand before the mouth, not in it), the standing stones
  function sync(on) {
    if (on && !colliders) {
      const p = g();
      colliders = {
        circles: [{ x: p.x - PIL, y: p.y + BASE - 12, r: 21 }, { x: p.x + PIL, y: p.y + BASE - 12, r: 21 }, ...STONES.map(s => ({ x: p.x + s.x, y: p.y + s.y - 6, r: 13 }))],
        rects: [{ x: p.x - 44, y: p.y + 8, w: 88, h: 14 }],
      };
      COLLIDERS.circles.push(...colliders.circles); COLLIDERS.rects.push(...colliders.rects);
    } else if (!on && colliders) {
      for (const c of colliders.circles) { const i = COLLIDERS.circles.indexOf(c); if (i >= 0) COLLIDERS.circles.splice(i, 1); }
      for (const r of colliders.rects) { const i = COLLIDERS.rects.indexOf(r); if (i >= 0) COLLIDERS.rects.splice(i, 1); }
      colliders = null;
    }
  }

  function townBook() {
    let s = Save.get('town');
    if (!s || typeof s !== 'object') { s = {}; Save.set('town', s); }
    s.seen = s.seen || {};
    return s;
  }

  // each frame (in town or not): the gate appears, and its arrival plays once the town is quiet
  function update(dt, now, inTown) {
    T = now;
    const on = isOpen();
    sync(on);
    if (!on || !deps) return;
    const book = townBook();
    if (book.seen[SEEN]) { if (bornAt === Infinity) bornAt = -999; return; }
    // not yet seen: hidden until its moment (so a boss's own arrival, or a fight, never has the gate pop up under it)
    bornAt = Infinity;
    if (!inTown || deps.busy()) { quietSince = null; return; }
    if (quietSince == null) quietSince = now;
    if (now - quietSince < QUIET) return;
    book.seen[SEEN] = 1; Save.commit();
    bornAt = now;
    deps.banner('Cold mist has come down off the Barrow, and a broken arch stands in it beside the Trophy Hall. Whoever passes through finds the Hollow King\'s hall as it was, and the old trials waiting in it.');
    deps.focus({ x: g().x, y: g().y + 10 });
    deps.sound();
  }

  const exists = () => isOpen() && bornAt !== Infinity;
  const interactables = () => (exists() && rise(T) > 0.9
    ? [{ x: g().x, y: g().y - 10, r: 62, reach: 100, label: 'The Barrow Gate', open: () => deps && deps.open() }] : []);
  // where you stand after a trial: out of the mouth, before the plaque
  const exitSpot = () => ({ x: g().x + (Math.random() - 0.5) * 70, y: g().y + 104 });

  // ---------------------------------------------------------------- drawing
  const arch = (ctx, r) => { ctx.beginPath(); ctx.moveTo(-r, BASE); ctx.lineTo(-r, -50); ctx.arc(0, -50, r, Math.PI, 0); ctx.lineTo(r, BASE); ctx.closePath(); };

  function stone(ctx, s, t, i, e) {
    const x = s.x, y = s.y, w = s.w, h = s.h * (0.5 + 0.5 * e), L = s.lean * h;
    ctx.save(); ctx.globalAlpha *= e;
    ellipse(ctx, x + 6, y + 2, w * 0.8, 6, 0, 'rgba(0,0,0,0.22)');
    const top = [x + L, y - h], tl = [x - w * 0.46 + L * 0.9, y - h * 0.86], tr = [x + w * 0.42 + L * 0.9, y - h * 0.92];
    poly(ctx, [x - w / 2, y, x + w / 2, y, tr[0], tr[1], top[0], top[1], tl[0], tl[1]], C.mid, OUT, 2.5);
    poly(ctx, [x - w / 2, y, x - 1, y, top[0] - 1, top[1], tl[0], tl[1]], C.hi);
    poly(ctx, [x + w * 0.14, y, x + w / 2, y, tr[0], tr[1], top[0] + 2, top[1] + 8], C.lo);
    line(ctx, x - 2 + L * 0.4, y - h * 0.55, x + 3 + L * 0.5, y - h * 0.3, 'rgba(30,40,40,0.5)', 1.3);
    line(ctx, x + 3 + L * 0.5, y - h * 0.3, x - 1 + L * 0.2, y - h * 0.12, 'rgba(30,40,40,0.5)', 1.3);
    ellipse(ctx, x - w * 0.15, y - 3, w * 0.52, 6, 0, 'rgba(95,125,104,0.85)');
    ellipse(ctx, x + w * 0.2, y - h * 0.8, 6, 3, 0.4, 'rgba(95,125,104,0.55)');
    // a faint cold rune, breathing on its own beat
    const a = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.9));
    glow(ctx, x + L * 0.55, y - h * 0.45, 13, C.cold, a * 0.9);
    line(ctx, x + L * 0.55 - 3, y - h * 0.5, x + L * 0.55 + 3, y - h * 0.5, rgba(C.pale, a + 0.2), 1.4);
    line(ctx, x + L * 0.55, y - h * 0.5, x + L * 0.55, y - h * 0.38, rgba(C.pale, a + 0.2), 1.4);
    ctx.restore();
  }

  function pillar(ctx, x, h, broken, t, side) {
    const w = 36, top = BASE - h;
    ellipse(ctx, x + 8, BASE + 2, w * 0.8, 8, 0, 'rgba(0,0,0,0.25)');
    // plinth
    rrect(ctx, x - w / 2 - 6, BASE - 12, w + 12, 14, 3, C.lo, OUT, 2.5);
    // shaft (broken ones end in a jagged cut)
    const pts = broken
      ? [x - w / 2, BASE - 12, x - w / 2, top + 14, x - w * 0.22, top + 2, x - 2, top + 16, x + w * 0.18, top - 4, x + w / 2, top + 10, x + w / 2, BASE - 12]
      : [x - w / 2, BASE - 12, x - w / 2, top, x + w / 2, top, x + w / 2, BASE - 12];
    poly(ctx, pts, C.mid, OUT, 2.5);
    ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.clip();
    ctx.fillStyle = C.hi; ctx.fillRect(x - w / 2, top - 6, 9, h + 6);
    ctx.fillStyle = C.lo; ctx.fillRect(x + w / 2 - 11, top - 6, 11, h + 6);
    for (let by = BASE - 40; by > top; by -= 28) line(ctx, x - w / 2, by, x + w / 2, by, 'rgba(30,40,40,0.4)', 1.6);
    // moss up one side, crept in from the ground
    ellipse(ctx, x - side * 8, BASE - 14, 17, 11, 0, 'rgba(95,125,104,0.8)');
    ellipse(ctx, x - side * 10, BASE - 36, 8, 6, 0, 'rgba(95,125,104,0.55)');
    ctx.restore();
    // a column of runes, each lit in turn
    for (let k = 0; k < 3; k++) {
      const ry = BASE - 34 - k * 22 - (broken ? 0 : 6), a = 0.25 + 0.55 * Math.max(0, Math.sin(t * 1.6 - k * 0.9 + side));
      if (ry < top + 14) continue;
      glow(ctx, x, ry, 14, C.cold, a * 0.6);
      line(ctx, x - 5, ry, x + 5, ry, rgba(C.pale, 0.35 + a * 0.6), 1.7);
      line(ctx, x, ry - 6, x, ry + 6, rgba(C.pale, 0.35 + a * 0.6), 1.7);
      line(ctx, x - 5, ry - 5, x + 5, ry + 5, rgba(C.pale, 0.25 + a * 0.5), 1.2);
    }
  }

  // the arch: interior light, then the stone over its edges
  function drawArch(ctx, t, e) {
    const p = g();
    ctx.save(); ctx.translate(p.x, p.y);
    // it rises out of the ground: everything under the line is clipped away, and slides up into place
    ctx.beginPath(); ctx.rect(-220, -260, 440, 260 + BASE + 14); ctx.clip();
    const slide = (1 - easeOut(e)) * 120;
    ctx.translate(0, slide);
    ctx.globalAlpha = clamp(e * 2, 0, 1);
    // the ghost-light in the mouth
    if (e > 0.35) {
      const lit = clamp((e - 0.35) / 0.5, 0, 1);
      ctx.save(); arch(ctx, 44); ctx.clip();
      const gr = ctx.createRadialGradient(0, -24, 4, 0, -24, 92);
      gr.addColorStop(0, C.pale); gr.addColorStop(0.4, '#5fb8b3'); gr.addColorStop(1, C.deep);
      ctx.fillStyle = gr; ctx.globalAlpha = lit * (0.9 + Math.sin(t * 2.1) * 0.06); ctx.fillRect(-50, -110, 100, 150);
      // curtains of mist, drifting up through it
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        for (let k = 0; k <= 14; k++) {
          const q = k / 14, yy = BASE - q * 150, xx = -42 + i * 14 + Math.sin(t * 0.9 + i * 1.4 + q * 5) * 7;
          k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.strokeStyle = rgba(C.pale, 0.12 + 0.1 * Math.sin(t * 1.1 + i)); ctx.lineWidth = 9; ctx.stroke();
      }
      ctx.globalAlpha = lit * 0.5;
      glow(ctx, 0, BASE - 6, 56, C.pale, 0.55);
      ctx.restore();
    }
    // stone: the broken right pillar, the whole left one, the arc that springs from it and stops short
    pillar(ctx, PIL * -1, 92, false, t, -1);
    pillar(ctx, PIL, 58, true, t, 1);
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(0, -50, 57, Math.PI, Math.PI * 1.63); ctx.lineWidth = 32; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -50, 57, Math.PI, Math.PI * 1.63); ctx.lineWidth = 27; ctx.strokeStyle = C.mid; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -50, 66, Math.PI * 1.04, Math.PI * 1.6); ctx.lineWidth = 6; ctx.strokeStyle = C.hi; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -50, 48, Math.PI * 1.05, Math.PI * 1.6); ctx.lineWidth = 5; ctx.strokeStyle = C.lo; ctx.stroke();
    for (const a of [1.18, 1.31, 1.44, 1.55]) {
      const ca = Math.PI * a; line(ctx, Math.cos(ca) * 44, -50 + Math.sin(ca) * 44, Math.cos(ca) * 70, -50 + Math.sin(ca) * 70, 'rgba(30,40,40,0.45)', 1.6);
    }
    const ba = Math.PI * 1.63;   // the break: a jag of cut stone, and the rubble that fell from it
    poly(ctx, [Math.cos(ba) * 44, -50 + Math.sin(ba) * 44, Math.cos(ba) * 70, -50 + Math.sin(ba) * 70, Math.cos(ba) * 66 + 9, -50 + Math.sin(ba) * 66 + 7, Math.cos(ba) * 56 + 3, -50 + Math.sin(ba) * 56 - 6], C.mid, OUT, 2);
    ellipse(ctx, -50, -50 - 28, 15, 7, -0.6, 'rgba(95,125,104,0.7)');
    ctx.restore();
  }

  // ---- the three drawing passes: ground, the stone itself (depth-sorted with everyone), and the air over it
  function drawGround(ctx, now) {
    if (!exists()) return;
    T = now;
    const p = g(), e = rise(now), ee = easeOut(e);
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = ee;
    // worn ground: a soft pale patch with flagstones, cracked, moss between
    ellipse(ctx, 0, 14, 176, 112, 0, 'rgba(96,114,108,0.30)');
    ellipse(ctx, 0, 14, 146, 92, 0, 'rgba(120,140,134,0.38)');
    const r = rng(41);
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU, d = Math.sqrt(r()), sx = Math.cos(a) * d * 128, sy = 14 + Math.sin(a) * d * 76, w = 14 + r() * 14, h = 11 + r() * 9;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate((r() - 0.5) * 0.7);
      rrect(ctx, -w / 2, -h / 2, w, h, 3, ['#9eaca6', '#8e9c96', '#a6b3ad'][Math.floor(r() * 3)], 'rgba(40,58,58,0.55)', 1.2);
      if (r() < 0.3) ellipse(ctx, (r() - 0.5) * w * 0.5, h * 0.2, w * 0.35, 3, 0, 'rgba(95,125,104,0.6)');
      ctx.restore();
    }
    // the stepping stones from the Trophy Hall's east wall: pale at the gate, lost in the grass toward the road
    const path = [[-204, 94], [-162, 86], [-122, 76], [-84, 66], [-48, 58]];
    path.forEach(([px, py], i) => {
      const k = (i + 1) / path.length;
      ctx.save(); ctx.translate(px + (r() - 0.5) * 6, py + (r() - 0.5) * 6); ctx.rotate((r() - 0.5) * 0.9);
      ctx.globalAlpha = ee * (0.45 + 0.55 * k);
      rrect(ctx, -12, -8, 24 + r() * 6, 17, 4, '#9eaca6', 'rgba(40,58,58,0.55)', 1.3);
      ctx.restore();
    });
    ctx.globalAlpha = ee;
    // the fallen piece of the lintel, lying where it dropped
    ellipse(ctx, 100, BASE + 18, 24, 9, 0, 'rgba(0,0,0,0.22)');
    poly(ctx, [76, BASE + 14, 96, BASE + 2, 122, BASE + 6, 126, BASE + 20, 100, BASE + 26], C.mid, OUT, 2.2);
    poly(ctx, [76, BASE + 14, 96, BASE + 2, 104, BASE + 8, 84, BASE + 20], C.hi);
    ellipse(ctx, 106, BASE + 22, 15, 5, 0, 'rgba(95,125,104,0.75)');
    poly(ctx, [-98, BASE + 20, -84, BASE + 12, -70, BASE + 18, -76, BASE + 26, -94, BASE + 27], C.lo, OUT, 2);
    // cold light spilling out of the mouth onto the stones
    glow(ctx, 0, BASE + 14, 120, C.cold, (0.16 + Math.sin(now * 2.1) * 0.03) * ee);
    // low mist, wandering the patch
    ctx.save(); ctx.scale(1, 0.42);
    for (let i = 0; i < 9; i++) {
      const mx = Math.sin(now * 0.11 + i * 1.7) * 150 + Math.cos(now * 0.07 + i) * 30, my = (30 + Math.cos(now * 0.09 + i * 2.3) * 52) / 0.42;
      glow(ctx, mx, my, 62 + (i % 3) * 16, C.mist, (0.10 + 0.05 * Math.sin(now * 0.4 + i * 1.3)) * ee);
    }
    ctx.restore();
    ctx.restore();
  }

  const body = { kind: 'stagecraft', y: 0, draw: ctx => drawArch(ctx, T, rise(T)) };
  const plaque = { kind: 'stagecraft', y: 0, draw: ctx => {
    const p = g(), e = easeOut(rise(T));
    if (e < 0.6) return;
    ctx.save(); ctx.globalAlpha = clamp((e - 0.6) / 0.4, 0, 1);
    ctx.font = '700 13px Cinzel, Georgia, serif';
    const text = 'The Barrow Gate', tw = ctx.measureText(text).width + 30, y = p.y + BASE + 30;
    glow(ctx, p.x, y + 12, tw * 0.7, C.cold, 0.10);
    rrect(ctx, p.x - tw / 2, y, tw, 25, 4, C.plaque, C.rim, 1.5);
    rrect(ctx, p.x - tw / 2 + 3, y + 3, tw - 6, 19, 2, null, 'rgba(143,201,196,0.28)', 1);
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, p.x, y + 13);
    ctx.restore();
  } };
  const stoneEnts = STONES.map((s, i) => ({ kind: 'stagecraft', y: 0, draw: ctx => { const p = g(); ctx.save(); ctx.translate(p.x, p.y); stone(ctx, s, T, i, easeOut(rise(T))); ctx.restore(); } }));
  function entities(now) {
    if (!exists()) return [];
    T = now;
    const p = g();
    body.y = p.y + BASE; plaque.y = p.y + BASE + 40;
    STONES.forEach((s, i) => { stoneEnts[i].y = p.y + s.y; });
    return [body, plaque, ...stoneEnts];
  }

  // above everything: the mist leaving the mouth, motes, the ghost of a crown, and the arrival's rings and flash
  function drawOver(ctx, now) {
    if (!exists()) return;
    T = now;
    const p = g(), e = rise(now), arriving = now - bornAt < ARRIVE + 1.2;
    ctx.save(); ctx.translate(p.x, p.y);
    const boost = arriving ? 1 + (1 - e) * 1.2 : 1;
    for (let i = 0; i < 9; i++) {
      const q = (now * 0.2 + i / 9) % 1, mx = Math.sin(i * 2.7 + now * 0.45) * (20 + q * 26), my = BASE - 10 - q * 170, r = 22 + q * 34;
      glow(ctx, mx, my, r, C.pale, Math.sin(q * Math.PI) * 0.16 * boost * e);
    }
    for (let i = 0; i < 16; i++) {
      const q = (now * 0.33 + i * 0.173) % 1, mx = Math.sin(i * 5.1 + now * 0.7) * (14 + q * 40) * (i % 2 ? 1 : -1), my = BASE - 4 - q * 150;
      circle(ctx, mx, my, 1.1 + (1 - q) * 1.3, rgba(C.pale, Math.sin(q * Math.PI) * 0.85 * e));
    }
    // a crown, thin as breath, over the break
    if (e > 0.7) {
      const a = (0.28 + 0.2 * Math.sin(now * 1.7)) * clamp((e - 0.7) / 0.3, 0, 1);
      ctx.save(); ctx.translate(14, -138 + Math.sin(now * 1.2) * 2.5);
      ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-16, -6); ctx.lineTo(-7, 0); ctx.lineTo(0, -10); ctx.lineTo(7, 0); ctx.lineTo(16, -6); ctx.lineTo(14, 8); ctx.closePath();
      ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C.pale, a + 0.1); ctx.stroke();
      glow(ctx, 0, 0, 26, C.cold, a * 0.55);
      ctx.restore();
    }
    if (now - bornAt < ARRIVE + 1.6) {
      // the arrival: three rings out across the ground, and a cold flash as the arch comes up
      for (let k = 0; k < 3; k++) {
        const q = clamp((now - bornAt - 0.25 * k) / 2.6, 0, 1);
        if (q <= 0 || q >= 1) continue;
        ellipse(ctx, 0, BASE + 8, 50 + q * 230, (50 + q * 230) * 0.5, 0, null, rgba(C.cold, (1 - q) * 0.75), 3 - q * 1.6);
      }
      const f = clamp(1 - Math.abs((now - bornAt) - 1.7) / 1.5, 0, 1);
      glow(ctx, 0, -20, 190, C.pale, f * 0.5);
    }
    ctx.restore();
  }

  return { init(d) { deps = d; }, update, drawGround, drawOver, entities, interactables, exitSpot, isOpen: exists, sync };
})();
