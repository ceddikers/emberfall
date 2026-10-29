// The Cinder Sovereign (the Ultimate): its five rooms, the ash fall, the colour grade of each act and the camera pull-back.
// Contract: docs/plans/2026-10-ultimate-build.md. Everything here hooks into ArenaView from this file (arena-view.js is not edited):
//   buildFloor     the five floors (ids `sovereign`, `sovereign:forge`, `sovereign:crater`, `sovereign:square`, `sovereign:night`)
//   drawAmbient    each room's own life, then the ash fall, then the grade (all in world space, under every telegraph and unit)
//   roomEvent      roomev `svact` { act: 1..4 | 'night' } (grade and ash density, eased over a couple of seconds)
//                  and `svcam` { zoom, dur } (the camera pull-back; main.js reads SV_ROOMS.camZoom(now), see camOut())
// The rooms, each a round floor kept dark and low in contrast so red and blue telegraphs read on every one:
//   the hall (amber): cracked flagstones like Emberfall's square, four cold braziers at the rim
//   the forge (steel grey): the same floor cracked into sheets with glowing seams, three scorched spots, burning silhouettes of the
//     crater rim, a glacier, a tower and a drowned temple standing round the edge
//   the crater (violet): the set 3 crater under the relit meteor (set3-sky.js)
//   the square (white-gold fire): Emberfall's square burning: the fountain, the sealed portal ring, the Tankard and its sign, the
//     bluebells, the houses and trees round it
//   the night (cool blue): the same square, whole, lit only by windows
// Loaded after arena-view.js, draw-util.js and set3-sky.js.

const SV_ROOMS = (() => {
  const FORMS = { sovereign: 'hall', 'sovereign:forge': 'forge', 'sovereign:crater': 'crater', 'sovereign:square': 'square', 'sovereign:night': 'night' };
  const lerp = (a, b, q) => a + (b - a) * q;
  const sm01 = q => q * q * (3 - 2 * q);
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const wrap = (v, w) => ((v % w) + w) % w;
  const mixHex = (a, b, q) => { const pa = hexToRgb(a), pb = hexToRgb(b); return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], q)).toString(16).padStart(2, '0')).join(''); };
  const rgb3 = a => `${a[0] | 0},${a[1] | 0},${a[2] | 0}`;
  const FAR = { hall: '#0a0705', forge: '#090a0d', crater: '#06051a', square: '#0b0806', night: '#050811' };

  // ------------------------------------------------------------------------------------------------------------------ the grade
  // one look per act: a multiply (so the floor takes the colour without going flat), a faint additive wash, and the ash fall's
  // density (0..1), how much of it is burning paper (0..1), the wind (px/s) and the ash's colour
  const GRADE = {
    1: { mul: '#ffefd8', add: '#ff9a40', addA: 0.04, ash: 0.2, paper: 0, ashc: '#cfc4b2', wind: 10 },       // the amber hall
    2: { mul: '#e0e7f2', add: '#9ab0d0', addA: 0.035, ash: 0.42, paper: 0, ashc: '#c4c8cf', wind: 18 },     // the steel-grey forge
    3: { mul: '#e6dcfa', add: '#8c70ff', addA: 0.04, ash: 0.72, paper: 0, ashc: '#ddd2ff', wind: 26 },      // violet starlight
    4: { mul: '#fff4e0', add: '#ffe2a0', addA: 0.05, ash: 1, paper: 1, ashc: '#e6d6b8', wind: 34 },         // white-gold town fire
    ebb: { mul: '#f0e2cc', add: '#ffb060', addA: 0.02, ash: 0.5, paper: 0.12, ashc: '#9c9284', wind: 14 },      // the kill: the fire draining out of the square (svgutter), on the way to the night
    night: { mul: '#a9bcf0', add: '#3a5cc8', addA: 0.03, ash: 0, paper: 0, ashc: '#c8d4ff', wind: 4 },      // the kill ends on cool night blue
  };
  const pack = g => ({ mul: hexToRgb(g.mul).slice(), add: hexToRgb(g.add).slice(), ashc: hexToRgb(g.ashc).slice(), n: [g.addA, g.ash, g.paper, g.wind] });
  const mixG = (a, b, q) => ({ mul: a.mul.map((v, i) => lerp(v, b.mul[i], q)), add: a.add.map((v, i) => lerp(v, b.add[i], q)), ashc: a.ashc.map((v, i) => lerp(v, b.ashc[i], q)), n: a.n.map((v, i) => lerp(v, b.n[i], q)) });
  const fresh = act => ({ act, from: pack(GRADE[act]), to: pack(GRADE[act]), t0: -99, dur: 0.001, z: { from: 1, to: 1, t0: -99, dur: 1 }, holes: [], hole: {}, act4: null, peel: null, peelKeep: false, low: false, gut: null, cool: null, nightAt: null });
  let S = fresh(1);   // (the act and the camera: one fight at a time; the preview swaps its own)
  const gradeAt = t => mixG(S.from, S.to, sm01(clamp((t - S.t0) / S.dur, 0, 1)));
  function setAct(act, t, instant) {
    if (!GRADE[act]) return;
    S.from = instant ? pack(GRADE[act]) : gradeAt(t);
    S.to = pack(GRADE[act]); S.t0 = t; S.dur = instant ? 0.001 : act === 'night' ? 4.4 : 2.4; S.act = act;
    if (act === 'night') S.nightAt = t;
  }
  // the grade eases to another look without changing the act (the fire ebbing: the holes, the square's life and the camera stay the act's own)
  function easeTo(key, t, dur) { S.from = gradeAt(t); S.to = pack(GRADE[key]); S.t0 = t; S.dur = Math.max(0.1, dur || 4); }
  const zoomAt = t => { const z = S.z; return lerp(z.from, z.to, sm01(clamp((t - z.t0) / Math.max(0.01, z.dur), 0, 1))); };
  function setZoom(zoom, dur, t) { S.z = { from: zoomAt(t), to: clamp(Number(zoom) || 1, 0.5, 1.2), t0: t, dur: dur > 0 ? dur : 1 }; }
  // the camera's extra zoom in this room (1 outside it): main.js multiplies camOut() by this
  function camZoom(t) { const a = typeof ArenaView !== 'undefined' ? ArenaView.amb : null; return a && a.kind === 'sovereign' ? zoomAt(t) : 1; }

  // ------------------------------------------------------------------------------------------------------------------ small parts
  // a flame (drawn additive): three tongues, gold into white, or orange for the forge
  const GOLD = ['#ff9a3c', '#ffd27a', '#fff6dc'], ORANGE = ['#ff5a1a', '#ff9a3a', '#ffe0a0'];
  function flame(ctx, x, y, h, w, t, ph, a, pal = GOLD) {
    const fl = 0.78 + 0.22 * Math.sin(t * 9 + ph) * Math.sin(t * 3.7 + ph * 2), sw = Math.sin(t * 5 + ph * 2) * w * 0.6;
    for (let k = 0; k < 3; k++) {
      const s = 1 - k * 0.3;
      ctx.beginPath(); ctx.moveTo(x - w * s, y);
      ctx.quadraticCurveTo(x - w * 0.7 * s, y - h * 0.5 * s, x + sw * s, y - h * s * fl);
      ctx.quadraticCurveTo(x + w * 0.7 * s, y - h * 0.5 * s, x + w * s, y); ctx.closePath();
      ctx.fillStyle = rgba(pal[k], a * (0.45 + 0.22 * k)); ctx.fill();
    }
  }
  const walk = (r, x, y, a, n, st, wob) => { const p = [x, y]; for (let i = 0; i < n; i++) { a += (r() - 0.5) * wob; const s = st * (0.6 + r() * 0.8); x += Math.cos(a) * s; y += Math.sin(a) * s; p.push(x, y); } return p; };
  const trace = (c, p) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) c.lineTo(p[k], p[k + 1]); };
  // flagstones laid in staggered rows, as in the square (town.js flagstones), over a disc
  function stones(c, R, r, cell, base, vary, edge = 'rgba(6,4,3,0.55)') {
    for (let gy = -R; gy < R; gy += cell) for (let gx = -R + (Math.round((gy + R) / cell) % 2) * cell / 2; gx < R; gx += cell) {
      if (Math.hypot(gx + cell / 2, gy + cell / 2) > R + cell) continue;
      rrect(c, gx + 1.5 + r() * 1.5, gy + 1.5 + r() * 1.5, cell - 4, cell - 4, 4, shade(base, (r() - 0.5) * vary), edge, 1);
    }
  }
  // a lip of stone round a round floor
  function lip(c, R, col, dark, lit) {
    c.beginPath(); c.arc(0, 0, R + 8, 0, TAU); c.strokeStyle = col; c.lineWidth = 16; c.stroke();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = dark; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.arc(0, 0, R + 15.5, 0, TAU); c.strokeStyle = lit; c.lineWidth = 1.4; c.stroke();
  }
  // the floor box fades into its flat far colour at its edges, so the colour drawn beyond it (the camera pulls back past it) joins up
  function edgeFade(c, bx, by, col, w) {
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, -by, 0, -by + w, -bx, -by, bx * 2, w], [0, by, 0, by - w, -bx, by - w, bx * 2, w], [-bx, 0, -bx + w, 0, -bx, -by, w, by * 2], [bx, 0, bx - w, 0, bx - w, -by, w, by * 2]]) {
      const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, rgba(col, 1)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.fillRect(rx, ry, rw, rh);
    }
  }
  const worldOf = (cx, cy, th) => (lx, ly) => [cx + lx * Math.cos(th) - ly * Math.sin(th), cy + lx * Math.sin(th) + ly * Math.cos(th)];

  // ------------------------------------------------------------------------------------------------------------------ the hall
  // a dark hall of cracked flagstones: a ring of old masonry, columns, four cold braziers at the rim (the last ember in each)
  function buildHall(c, bx, by, R) {
    const r = rng(6101);
    c.fillStyle = FAR.hall; c.fillRect(-bx, -by, bx * 2, by * 2);
    glow(c, 0, 0, R + 260, '#3a2412', 0.35);
    // the wall: blocks of dark masonry, the room's side of it catching a little amber
    for (let i = 0; i < 64; i++) {
      const a0 = i * TAU / 64 + 0.004, a1 = (i + 1) * TAU / 64 - 0.004, v = r(), ro = R + 78 + r() * 8;
      c.beginPath(); c.arc(0, 0, ro, a0, a1); c.arc(0, 0, R + 4, a1, a0, true); c.closePath();
      c.fillStyle = `rgb(${24 + v * 14 | 0},${19 + v * 10 | 0},${15 + v * 8 | 0})`; c.fill(); c.strokeStyle = 'rgba(4,3,2,0.9)'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, R + 6, a0 + 0.006, a1 - 0.006); c.strokeStyle = rgba('#ff9a4a', 0.05 + 0.07 * v); c.lineWidth = 2; c.stroke();
    }
    // columns standing in the wall, seen from above: a round top, a long shadow
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, d = R + 46, x = Math.cos(a) * d, y = Math.sin(a) * d;
      ellipse(c, x + 8, y + 10, 24, 20, 0, 'rgba(0,0,0,0.45)'); circle(c, x, y, 19, '#241d17', OUT, 2.5); circle(c, x, y, 13, '#2e251d'); circle(c, x - 4, y - 5, 6, 'rgba(255,200,140,0.05)');
    }
    // the floor
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    const g = c.createRadialGradient(0, 0, 30, 0, 0, R); g.addColorStop(0, '#3a2e24'); g.addColorStop(0.6, '#2b221b'); g.addColorStop(1, '#1b1511');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    stones(c, R, r, 34, '#2f261f', 0.2);
    for (let i = 0; i < 70; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; glow(c, Math.cos(a) * d, Math.sin(a) * d, 40 + r() * 80, r() < 0.5 ? '#07040a' : '#4a3020', 0.1 + r() * 0.1); }
    const seams = [];
    for (let i = 0; i < 44; i++) {   // cracks in the stone; a few have a little warmth far down in them
      const a0 = r() * TAU, d0 = Math.sqrt(r()) * R * 0.92, p = walk(r, Math.cos(a0) * d0, Math.sin(a0) * d0, r() * TAU, 5 + (r() * 5 | 0), 16, 1.1);
      c.lineJoin = c.lineCap = 'round'; trace(c, p); c.strokeStyle = 'rgba(3,2,1,0.72)'; c.lineWidth = 2.6; c.stroke(); c.strokeStyle = 'rgba(255,190,120,0.06)'; c.lineWidth = 0.8; c.stroke();
      if (i % 5 === 0) seams.push({ p, ph: r() * 9 });
    }
    for (let i = 0; i < 2600; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.0, r() < 0.6 ? `rgba(4,3,2,${0.15 + r() * 0.25})` : `rgba(255,220,170,${0.04 + r() * 0.1})`); }
    circle(c, 0, 0, R * 0.46, null, 'rgba(210,170,110,0.2)', 3); circle(c, 0, 0, R * 0.46 - 8, null, 'rgba(210,170,110,0.08)', 1);   // the square's gold ring, worn
    glow(c, 0, 0, R * 0.8, '#ff9a4a', 0.07);
    const v = c.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(4,2,1,0)'); v.addColorStop(1, 'rgba(4,2,1,0.45)'); c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    lip(c, R, '#2a221b', 'rgba(3,2,1,0.9)', 'rgba(255,170,100,0.18)');
    // four cold braziers on the lip: an iron bowl of grey ash
    const braziers = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * (R + 34), y = Math.sin(a) * (R + 34);
      ellipse(c, x + 6, y + 9, 30, 20, 0, 'rgba(0,0,0,0.5)');
      for (let k = 0; k < 3; k++) { const la = a + k * TAU / 3 + 0.5; line(c, x + Math.cos(la) * 12, y + Math.sin(la) * 12, x + Math.cos(la) * 27, y + Math.sin(la) * 27, OUT, 5); line(c, x + Math.cos(la) * 12, y + Math.sin(la) * 12, x + Math.cos(la) * 27, y + Math.sin(la) * 27, '#4a4036', 2.4); }   // (a tripod of iron legs)
      circle(c, x, y, 21, '#51473c', OUT, 2.5); circle(c, x, y, 16, '#14100c', OUT, 2);
      ellipse(c, x, y + 1, 12, 10, 0, '#6a6258'); for (let k = 0; k < 7; k++) circle(c, x + (r() - 0.5) * 16, y + (r() - 0.5) * 12, 1 + r() * 1.4, r() < 0.5 ? '#3a342d' : '#8a7e70');
      braziers.push({ x, y, ph: r() * 9 });
    }
    edgeFade(c, bx, by, FAR.hall, 140);
    return { form: 'hall', far: FAR.hall, bx, by, braziers, seams };
  }
  function hallLife(ctx, a, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of a.braziers) {   // the last ember in each bowl, and a thread of smoke going up
      const q = 0.5 + 0.5 * Math.sin(t * 1.3 + b.ph);
      glow(ctx, b.x, b.y, 22, '#ff7a30', 0.04 + 0.07 * q); circle(ctx, b.x + 2, b.y - 1, 1.5, rgba('#ff9a50', 0.3 + 0.4 * q));
      for (let k = 0; k < 4; k++) { const u = (t * 0.12 + k / 4 + b.ph) % 1; glow(ctx, b.x + Math.sin(t * 0.7 + k + b.ph) * 9 * u, b.y - u * 64, 8 + u * 18, '#8a8078', 0.1 * (1 - u)); }
    }
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, ARENA.r, 0, TAU); ctx.clip();
    for (const s of a.seams) {   // warmth far down in a few cracks, barely
      const q = 0.5 + 0.5 * Math.sin(t * 0.7 + s.ph); trace(ctx, s.p); ctx.lineJoin = ctx.lineCap = 'round';
      ctx.strokeStyle = rgba('#ff8a3a', 0.02 + 0.07 * q); ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.restore(); ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------------------------ the forge
  // the same floor cracked into sheets with glowing seams, three scorched spots; the hall's wall burned away and the high places
  // standing round the edge as burning silhouettes: the crater rim, a glacier, a tower, a drowned temple
  function silhouette(c, kind, ang, D, r, fires) {
    const ox = Math.cos(ang) * D, oy = Math.sin(ang) * D, th = ang + Math.PI / 2, P = worldOf(ox, oy, th), INK = '#07080b';
    const fire = (lx, ly, h, w) => { const [x, y] = P(lx, ly); fires.push({ x, y, h, w, ph: r() * 9 }); };
    c.save(); c.translate(ox, oy); c.rotate(th); c.scale(1.5, 1.5);   // (local +y points at the room; the shapes are drawn at 1.5x)
    glow(c, 0, -30, 200, '#ff6a20', 0.22);
    if (kind === 'rim') {   // a ridge of broken rock, lava along its foot
      const top = [], N = 18;
      for (let i = 0; i <= N; i++) { const x = (i / N - 0.5) * 380, k = Math.sin(i / N * Math.PI); top.push(x, -40 - 46 * k - (i % 3 === 1 ? 30 * k + r() * 14 : r() * 16) + 18 * (1 - k)); }
      poly(c, [-190, 30, ...top, 190, 30], INK, 'rgba(0,0,0,0.9)', 2.5);
      for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * 320, y = -30 + r() * 40; const p = walk(r, x, y, r() * TAU, 4, 12, 1.2); trace(c, p); c.strokeStyle = rgba('#ff7a2a', 0.5); c.lineWidth = 1.8; c.stroke(); }   // lava in the cracks
      trace(c, top); c.strokeStyle = rgba('#ff8a3a', 0.6); c.lineWidth = 2; c.stroke();
      for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 320; fire(x, -20 + r() * 20, 36 + r() * 24, 9 + r() * 4); }
    } else if (kind === 'glacier') {   // slabs of ice, tilted, a cold edge on each and the fire at their feet
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 56 + (r() - 0.5) * 14, h = 54 + r() * 54, w = 26 + r() * 16, lean = (r() - 0.5) * 30;
        poly(c, [x - w, 14, x - w + lean, -h, x + lean * 0.4, -h - 14, x + w + lean, -h + 6, x + w, 14], '#0b1018', 'rgba(0,0,0,0.9)', 2);
        line(c, x - w + lean, -h, x + lean * 0.4, -h - 14, rgba('#bcd6ff', 0.5), 1.4); line(c, x - w + 2, 10, x - w + lean + 2, -h + 4, rgba('#9ab8e8', 0.28), 1.2);
        fire(x, 10, 30 + r() * 28, 9 + r() * 4);
      }
    } else if (kind === 'tower') {   // a round tower top seen from above: a ring of battlements, the fire in the hollow of it
      ellipse(c, 6, 10, 62, 46, 0, 'rgba(0,0,0,0.5)'); circle(c, 0, -20, 52, '#0c0d12', 'rgba(0,0,0,0.9)', 3);
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16; if (i % 5 === 3) continue; const x = Math.cos(a) * 48, y = -20 + Math.sin(a) * 48; circle(c, x, y, 7, '#14161d', 'rgba(0,0,0,0.9)', 1.6); circle(c, x - 1.5, y - 2, 2.4, rgba('#ffb060', 0.3)); }
      circle(c, 0, -20, 34, '#050608'); glow(c, 0, -20, 46, '#ff8a3a', 0.5); fire(0, -14, 60, 18); fire(-14, -24, 36, 9); fire(13, -22, 40, 10);
      poly(c, [-52, -4, -72, 8, -62, 20, -44, 10], '#0c0d12', 'rgba(0,0,0,0.9)', 1.6);
    } else {   // columns standing in a row in the water, two of them broken
      ellipse(c, 0, -4, 124, 50, 0, '#0a1119', 'rgba(0,0,0,0.9)', 2.5); ellipse(c, 0, -2, 108, 38, 0, rgba('#ff7a2a', 0.1));   // the drowned floor, dark water
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + i * Math.PI / 6, x = Math.cos(a) * 124, y = -4 + Math.sin(a) * 50, broken = i === 2 || i === 4;
        ellipse(c, x + 6, y + 10, 18, 11, 0, 'rgba(0,0,0,0.45)'); circle(c, x, y, broken ? 11 : 15, '#0e1016', 'rgba(0,0,0,0.9)', 2.2);
        if (!broken) circle(c, x - 3, y - 4, 5, rgba('#ffb060', 0.25)); fire(x, y - 2, broken ? 22 : 38, broken ? 6 : 8);
      }
    }
    c.restore();
  }
  function buildForge(c, bx, by, R) {
    const r = rng(6202), fires = [];
    c.fillStyle = FAR.forge; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 90; i++) glow(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 50 + r() * 110, r() < 0.5 ? '#ff6a20' : '#3a1a10', 0.04 + r() * 0.06);
    // the hall's wall, burned to a broken ring of black blocks with the heat still in them
    for (let i = 0; i < 64; i++) {
      if (r() < 0.22) continue;
      const a0 = i * TAU / 64 + 0.004, a1 = (i + 1) * TAU / 64 - 0.004, ro = R + 22 + r() * 60, v = r();
      c.beginPath(); c.arc(0, 0, ro, a0, a1); c.arc(0, 0, R + 4, a1, a0, true); c.closePath(); c.fillStyle = `rgb(${14 + v * 10 | 0},${14 + v * 9 | 0},${17 + v * 9 | 0})`; c.fill(); c.strokeStyle = 'rgba(2,2,3,0.9)'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, ro - 1, a0 + 0.01, a1 - 0.01); c.strokeStyle = rgba('#ff7a2a', 0.18 + 0.3 * v); c.lineWidth = 1.6; c.stroke();
    }
    [[-3 * Math.PI / 4, 'rim'], [-Math.PI / 4, 'glacier'], [Math.PI / 4, 'tower'], [3 * Math.PI / 4, 'temple']].forEach(([ang, kind]) => silhouette(c, kind, ang, R + 150, r, fires));
    // the floor: steel-grey stone cracked into sheets
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    const g = c.createRadialGradient(0, 0, 30, 0, 0, R); g.addColorStop(0, '#31353c'); g.addColorStop(0.6, '#262a31'); g.addColorStop(1, '#181b20');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    stones(c, R, r, 34, '#292d34', 0.18, 'rgba(4,5,7,0.5)');
    for (let i = 0; i < 38; i++) {   // the sheets: big plates, some lifted a little, some sunk
      const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R, s = 70 + r() * 90, pts = [], q0 = r() * TAU;
      for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.7; pts.push(x + Math.cos(q) * s, y + Math.sin(q) * s * 0.85); }
      poly(c, pts, r() < 0.5 ? `rgba(255,255,255,${0.02 + r() * 0.04})` : `rgba(0,0,0,${0.08 + r() * 0.1})`, 'rgba(3,3,5,0.5)', 2);
    }
    const seams = [];
    for (let i = 0; i < 22; i++) {   // the seams: a dark groove, the fire in it (kept thin so a telegraph still reads over it)
      const a0 = r() * TAU, d0 = Math.sqrt(r()) * R * 0.9, p = walk(r, Math.cos(a0) * d0, Math.sin(a0) * d0, r() * TAU, 8 + (r() * 7 | 0), 34, 0.9);
      c.lineJoin = c.lineCap = 'round'; trace(c, p); c.strokeStyle = 'rgba(2,2,3,0.8)'; c.lineWidth = 6; c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ff6a20', 0.2); c.lineWidth = 3.2; c.stroke(); c.strokeStyle = rgba('#ffd890', 0.28); c.lineWidth = 1; c.stroke(); c.restore();
      seams.push({ p, ph: r() * 9 });
    }
    const spots = [];
    for (let i = 0; i < 3; i++) {   // three scorched spots: soot, cracked stone, a ring of ember
      const a = -Math.PI / 2 + i * TAU / 3, x = Math.cos(a) * R * 0.52, y = Math.sin(a) * R * 0.52, sr = 72;
      const sg = c.createRadialGradient(x, y, 0, x, y, sr * 1.2); sg.addColorStop(0, 'rgba(6,4,3,0.85)'); sg.addColorStop(0.7, 'rgba(6,4,3,0.55)'); sg.addColorStop(1, 'rgba(6,4,3,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(x, y, sr * 1.2, 0, TAU); c.fill();
      for (let k = 0; k < 9; k++) { const p = walk(r, x, y, k * TAU / 9 + r() * 0.4, 4, 15, 0.8); trace(c, p); c.strokeStyle = 'rgba(2,2,3,0.85)'; c.lineWidth = 3; c.stroke(); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ff7a2a', 0.3); c.lineWidth = 1.6; c.stroke(); c.restore(); }
      circle(c, x, y, sr * 0.8, null, rgba('#ff7a2a', 0.18), 3);
      spots.push({ x, y, r: sr });
    }
    for (let i = 0; i < 2600; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.0, r() < 0.6 ? `rgba(3,3,5,${0.15 + r() * 0.25})` : `rgba(200,210,230,${0.04 + r() * 0.09})`); }
    const v = c.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(3,3,5,0)'); v.addColorStop(1, 'rgba(3,3,5,0.42)'); c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    lip(c, R, '#1b1d23', 'rgba(2,2,3,0.9)', 'rgba(255,130,60,0.25)');
    edgeFade(c, bx, by, FAR.forge, 150);
    return { form: 'forge', far: FAR.forge, bx, by, seams, spots, fires, embers: Array.from({ length: 46 }, () => { const an = r() * TAU, d = R * (0.95 + r() * 0.55); return { x: Math.cos(an) * d, y: Math.sin(an) * d, ph: r() * 9, sp: 0.06 + r() * 0.1, s: 0.8 + r() * 1.3 }; }) };
  }
  function forgeLife(ctx, a, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, ARENA.r, 0, TAU); ctx.clip();
    for (const s of a.seams) {   // the light in the seams breathes
      const q = 0.5 + 0.5 * Math.sin(t * 0.9 + s.ph); trace(ctx, s.p); ctx.lineJoin = ctx.lineCap = 'round';
      ctx.strokeStyle = rgba('#ff7a2a', 0.02 + 0.08 * q); ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = rgba('#fff0c0', 0.08 * q); ctx.lineWidth = 0.9; ctx.stroke();
    }
    ctx.restore();
    for (const sp of a.spots) {   // the scorched spots smoulder: embers lifting off them
      glow(ctx, sp.x, sp.y, sp.r * 1.1, '#ff6a20', 0.05 + 0.04 * Math.sin(t * 1.7 + sp.x));
      for (let k = 0; k < 6; k++) { const u = (t * 0.25 + k / 6 + sp.x * 0.01) % 1; circle(ctx, sp.x + Math.sin(t + k * 2) * 24 + (k - 3) * 8, sp.y - u * 54, 1.4 * (1 - u * 0.5), rgba('#ffb060', 0.6 * Math.sin(u * Math.PI))); }
    }
    for (const f of a.fires) { glow(ctx, f.x, f.y - f.h * 0.4, f.h * 1.4, '#ff6a20', 0.07); flame(ctx, f.x, f.y, f.h, f.w, t, f.ph, 0.55, ORANGE); }
    for (const e of a.embers) { const q = (t * e.sp + e.ph) % 1; circle(ctx, e.x + Math.sin(t * 0.6 + e.ph * 7) * 14, e.y - q * 260, e.s * (1 - q * 0.5), rgba(q < 0.5 ? '#ffb060' : '#ffe2b0', 0.7 * Math.sin(q * Math.PI))); }
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------------------------ the crater
  // the set 3 crater under the relit meteor (set3-sky.js draws it, and it has finished falling): black-violet glass, spikes round
  // the rim lit on the meteor's side, light in the cracks
  function buildCrater(c, bx, by, R) {
    const r = rng(6303), mx = R * 0.37, my = -(R + 160), ma = Math.atan2(my, mx);
    const g0 = c.createLinearGradient(0, -by, 0, by); g0.addColorStop(0, '#05061a'); g0.addColorStop(0.45, '#0d0a2a'); g0.addColorStop(1, '#201038');
    c.fillStyle = g0; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 240; i++) circle(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 0.4 + r() * 1.1, rgba(r() < 0.8 ? '#e8ecff' : '#ffe2c0', 0.12 + r() * 0.4));
    glow(c, mx, my, 520, '#ff7a30', 0.28); glow(c, mx, my, 250, '#ffc890', 0.3);   // the meteor, burning again
    SET3_SKY.draw(c, mx, my, 1, { dir: -1.42 });
    c.beginPath(); c.arc(0, 0, R + 150, 0, TAU); c.arc(0, 0, R, 0, TAU, true);   // the crater's slope
    const sl = c.createRadialGradient(0, 0, R, 0, 0, R + 150); sl.addColorStop(0, 'rgba(23,20,51,1)'); sl.addColorStop(0.5, 'rgba(14,12,34,0.95)'); sl.addColorStop(1, 'rgba(7,6,26,0)'); c.fillStyle = sl; c.fill('evenodd');
    for (let i = 0; i < 64; i++) { const a = r() * TAU, d = R + 36 + r() * 110, s = 14 + r() * 36, pts = [], q0 = r() * TAU; for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.6; pts.push(Math.cos(a) * d + Math.cos(q) * s, Math.sin(a) * d + Math.sin(q) * s * 0.8); } poly(c, pts, `rgba(${14 + r() * 14 | 0},${12 + r() * 10 | 0},${34 + r() * 20 | 0},0.8)`, 'rgba(2,2,10,0.6)', 1.6); }
    for (let i = 0; i < 72; i++) {   // black glass spikes along the rim, lit orange on the meteor's side
      const a = i * TAU / 72 + r() * 0.04, lit = clamp(Math.cos(a - ma) * 0.8 + 0.2, 0, 1), d = R + 6 + r() * 26, h = 30 + r() * 100 * (0.5 + lit * 0.6), w = 14 + r() * 16;
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      poly(c, [ux * d + nx * w, uy * d + ny * w, ux * (d + h) + nx * 2, uy * (d + h) + ny * 2, ux * d - nx * w, uy * d - ny * w], '#0b0a1c', 'rgba(2,2,10,0.8)', 1.6);
      line(c, ux * d + nx * w, uy * d + ny * w, ux * (d + h) + nx * 2, uy * (d + h) + ny * 2, rgba('#ffa868', 0.1 + 0.5 * lit), 1.6);
    }
    glow(c, mx * 0.7, my * 0.7, 460, '#ff8a4a', 0.16);   // the meteor's fire on the near rim
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();   // the floor: glassy violet rock cracked with light
    const sg = c.createRadialGradient(0, 0, 40, 0, 0, R); sg.addColorStop(0, '#3e3a70'); sg.addColorStop(0.5, '#302c5c'); sg.addColorStop(1, '#1f1c42');
    c.fillStyle = sg; c.fillRect(-R, -R, R * 2, R * 2);
    for (let i = 0; i < 60; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; glow(c, Math.cos(a) * d, Math.sin(a) * d, 50 + r() * 100, r() < 0.5 ? '#07061a' : '#3a2f78', 0.12 + r() * 0.12); }
    for (let i = 0; i < 170; i++) {   // plates of glass-rock
      const a = r() * TAU, d = Math.sqrt(r()) * R, s = 18 + r() * 40, pts = [], q0 = r() * TAU;
      for (let k = 0; k < 6; k++) { const q = q0 + k * TAU / 6 + (r() - 0.5) * 0.7; pts.push(Math.cos(a) * d + Math.cos(q) * s, Math.sin(a) * d + Math.sin(q) * s * 0.85); }
      poly(c, pts, `rgba(${30 + r() * 36 | 0},${26 + r() * 30 | 0},${74 + r() * 50 | 0},${0.22 + r() * 0.26})`, 'rgba(6,4,20,0.5)', 1.6); line(c, pts[0], pts[1], pts[2], pts[3], 'rgba(200,190,255,0.18)', 1.1);
    }
    const fiss = [];
    for (let i = 0; i < 46; i++) {
      const a0 = r() * TAU, d0 = Math.sqrt(r()) * R * 0.9, p = walk(r, Math.cos(a0) * d0, Math.sin(a0) * d0, r() * TAU, 4 + (r() * 5 | 0), 22, 0.9);
      c.lineJoin = c.lineCap = 'round'; trace(c, p); c.strokeStyle = 'rgba(2,2,10,0.7)'; c.lineWidth = 3; c.stroke();
      if (i % 3 === 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#b4c6ff', 0.12); c.lineWidth = 2.2; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 0.8; c.stroke(); c.restore(); fiss.push({ p, ph: r() * 9 }); }
    }
    for (let i = 0; i < 2600; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.4 + r() * 1.0, r() < 0.55 ? `rgba(4,3,14,${0.15 + r() * 0.25})` : `rgba(200,190,255,${0.05 + r() * 0.14})`); }
    glow(c, 0, 0, R * 0.7, '#cfc8ff', 0.1); glow(c, R * 0.25, -R * 0.55, 520, '#ff8a4a', 0.06);
    const v = c.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(4,3,12,0)'); v.addColorStop(1, 'rgba(4,3,12,0.42)'); c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    lip(c, R, '#16142e', 'rgba(1,1,6,0.9)', 'rgba(255,168,104,0.3)');
    edgeFade(c, bx, by, FAR.crater, 140);
    return { form: 'crater', far: FAR.crater, bx, by, star: [mx, my], fiss,
      dust: Array.from({ length: 60 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.95; return { x: Math.cos(a) * d, y: Math.sin(a) * d, ph: r() * 9, sp: 0.05 + r() * 0.1, s: 0.7 + r() * 1.1 }; }),
      sparks: Array.from({ length: 5 }, () => ({ ph: r() * 9, sp: 0.04 + r() * 0.05, a: r() * 0.6 - 0.3 })) };
  }
  function craterLife(ctx, a, t) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, ARENA.r, 0, TAU); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (const f of a.fiss) {   // the light in the cracks breathes
      const q = 0.5 + 0.5 * Math.sin(t * 0.9 + f.ph); if (q < 0.2) continue;
      trace(ctx, f.p); ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = rgba('#d6dcff', 0.03 + 0.14 * q); ctx.lineWidth = 2.4; ctx.stroke();
    }
    for (const d of a.dust) { const q = (t * d.sp + d.ph) % 1; circle(ctx, d.x + Math.sin(t * 0.4 + d.ph * 5) * 12 + q * 10, d.y - q * 46, d.s * (1 - q * 0.5), rgba(d.ph % 2 < 1 ? '#e8ecff' : '#b9a8ff', 0.5 * Math.sin(q * Math.PI))); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';   // sparks flung down off the meteor, crossing the margin
    for (const s of a.sparks) { const q = (t * s.sp + s.ph) % 1, x0 = a.star[0] + 40 + s.a * 600, y0 = a.star[1] + 60, x = x0 + q * (s.a * 420 - 30), y = y0 + q * 540; line(ctx, x, y, x - (s.a * 420 - 30) * 0.05, y - 30, rgba('#ffb070', 0.5 * (1 - q) * Math.min(1, q * 8)), 2); circle(ctx, x, y, 1.8, rgba('#ffe0b0', 0.8 * (1 - q))); }
    ctx.restore();
    SET3_SKY.life(ctx, a.star[0], a.star[1], 1, t);
  }

  // ------------------------------------------------------------------------------------------------------------------ the square
  // a building seen from the room: its wall (door, windows) nearest, its roof behind. Returns where its windows and roof are.
  function building(c, ang, dist, w, wallH, roofH, o, r) {
    const cx = Math.cos(ang) * dist, cy = Math.sin(ang) * dist, th = ang + Math.PI / 2, P = worldOf(cx, cy, th), wins = [], roofs = [];
    c.save(); c.translate(cx, cy); c.rotate(th);
    ellipse(c, 8, -wallH * 0.4, w * 0.62, (wallH + roofH) * 0.55, 0, 'rgba(0,0,0,0.35)');
    rrect(c, -w / 2 - 8, -wallH - roofH, w + 16, roofH, 4, o.roof, OUT, 2.5);   // the roof, behind
    for (let y = -wallH - roofH + 12; y < -wallH; y += 12) line(c, -w / 2 - 6, y, w / 2 + 6, y, 'rgba(0,0,0,0.28)', 1.6);
    line(c, -w / 2 - 6, -wallH - roofH * 0.5, w / 2 + 6, -wallH - roofH * 0.5, o.roofHi, 2.4);
    if (o.chimney) { rrect(c, w * o.chimney - w / 2, -wallH - roofH + 10, 22, 24, 3, '#2a2620', OUT, 2); roofs.push(P(w * o.chimney - w / 2 + 11, -wallH - roofH + 16)); }
    rrect(c, -w / 2, -wallH, w, wallH, 2, o.wall, OUT, 2.5);   // the wall
    rrect(c, -w / 2, -wallH, w, 8, 2, 'rgba(0,0,0,0.25)');
    rrect(c, -14, -36, 28, 36, [14, 14, 0, 0], '#1e140c', OUT, 2);
    for (const f of o.wins || []) {
      const x = (f - 0.5) * w, y = -wallH * 0.62;
      rrect(c, x - 9, y - 11, 18, 22, 2, o.win, OUT, 1.8); line(c, x, y - 11, x, y + 11, OUT, 1.4); line(c, x - 9, y, x + 9, y, OUT, 1.4);
      wins.push(P(x, y));
    }
    if (o.burn) {   // scorched: soot up the wall, holes in the roof with the fire showing
      for (let i = 0; i < 5; i++) { const x = (r() - 0.5) * w, g = c.createLinearGradient(0, -wallH, 0, 0); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - 12, -wallH, 24, wallH); }
      for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * w * 0.9, y = -wallH - 8 - r() * (roofH - 16), hh = [x - 10, y - 5, x + 8, y - 8, x + 11, y + 5, x - 6, y + 9]; poly(c, hh, '#0a0605'); roofs.push(P(x, y)); }
    }
    if (o.name) {   // the sign hung over the door: a plate in an iron frame
      c.font = '700 13px Cinzel, Georgia, serif'; const sw = c.measureText(o.name).width + 28;
      line(c, -sw / 2 + 4, -wallH + 2, -sw / 2 + 4, -wallH + 12, '#2a1c10', 2); line(c, sw / 2 - 4, -wallH + 2, sw / 2 - 4, -wallH + 12, '#2a1c10', 2);
      rrect(c, -sw / 2, -wallH + 10, sw, 24, 4, '#3a2a1a', '#c9a65a', 2);
      c.fillStyle = o.burn ? 'rgba(240,212,138,0.55)' : '#f0d48a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.name, 0, -wallH + 22); c.textBaseline = 'alphabetic';
      if (o.burn) { for (let i = 0; i < 5; i++) { const x = -sw / 2 + r() * sw; poly(c, [x - 6, -wallH + 10, x + 5, -wallH + 10, x + 1, -wallH + 18 + r() * 8], '#0a0605'); } roofs.push(P(sw * 0.2, -wallH + 14)); roofs.push(P(-sw * 0.25, -wallH + 14)); }
    }
    c.restore();
    return { wins, roofs, door: P(0, -16), toward: th + Math.PI / 2 };
  }
  // a tree, as in town.js drawTree: round clumps of leaf; burnt, or whole
  function tree(c, x, y, s, r, burnt, night) {
    const lo = burnt ? ['#0d0a07', '#14100b', '#1d160e'] : night ? ['#0a1612', '#0f2219', '#17301f'] : ['#1f3d1c', '#346f2c', '#438a38'];
    ellipse(c, x + 12 * s, y + 14 * s, 34 * s, 22 * s, 0, 'rgba(0,0,0,0.3)'); circle(c, x, y + 6 * s, 6 * s, '#2a1c10');
    const bl = []; for (let k = 0; k < 5; k++) { const a = r() * TAU, d = r() * 13 * s; bl.push([x + Math.cos(a) * d, y - 6 * s + Math.sin(a) * d, (15 + r() * 8) * s]); }
    for (const [bx2, by2, br] of bl) circle(c, bx2, by2, br + 2, lo[0]); for (const [bx2, by2, br] of bl) circle(c, bx2, by2, br, lo[1]); for (const [bx2, by2, br] of bl) circle(c, bx2 - br * 0.25, by2 - br * 0.3, br * 0.55, lo[2]);
    return bl;
  }
  function buildSquare(c, bx, by, R, night) {
    const r = rng(night ? 8802 : 8801), fires = [], windows = [], K = night
      ? { far: FAR.night, grass: '#0e1b1c', blade: 'rgba(30,70,56,0.6)', pathA: '#1d222e', pathB: '#2b3244', plaza: '#363e52', stone: '#323a4e', kerb: '#454d62', wall: '#2a3144', roof: '#1c2334', roofHi: '#2c3650', win: '#ffd27a' }
      : { far: FAR.square, grass: '#17140e', blade: 'rgba(60,46,20,0.6)', pathA: '#1e1710', pathB: '#2c2218', plaza: '#3a3631', stone: '#37332e', kerb: '#46413b', wall: '#3b3228', roof: '#2a1a14', roofHi: '#4a2a1a', win: '#ffb860' };
    c.fillStyle = K.grass; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 900; i++) ellipse(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 10 + r() * 40, 6 + r() * 24, r() * 3, r() < 0.5 ? 'rgba(0,0,0,0.18)' : night ? 'rgba(60,120,110,0.07)' : 'rgba(120,80,30,0.07)');
    for (let i = 0; i < 1800; i++) { const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by; line(c, x, y, x - 1.5, y - 4, K.blade, 1.2); }
    if (night) for (let i = 0; i < 260; i++) circle(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 1.6, ['#c8d4ff', '#f2a0c0', '#a0c8ff', '#f2e27a'][i % 4] + '88');   // the town's flowers, gone grey-blue
    else { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) glow(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 30 + r() * 60, '#ff7a20', 0.05 + r() * 0.06); c.restore(); }
    // the dirt roads out of the square
    for (const a of [Math.PI, -Math.PI / 2, 0, 0.7, Math.PI / 2]) for (const [lw, col] of [[84, K.pathA], [70, K.pathB]]) { c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * bx * 1.3, Math.sin(a) * bx * 1.3); c.stroke(); }
    // trees out beyond the houses
    for (let i = 0; i < 20; i++) { const a = r() * TAU, d = R + 200 + r() * 200; if (d > bx - 30) continue; const bl = tree(c, Math.cos(a) * d, Math.sin(a) * d, 1.6 + r() * 0.6, r, !night, night); if (!night) for (let k = 0; k < 2; k++) fires.push({ x: bl[k][0], y: bl[k][1] - 6, h: 44 + r() * 30, w: 12 + r() * 6, ph: r() * 9, big: 1 }); }
    // the houses, the Tankard, the Trophy Hall and the Forge round the rim, as in town, each a wall facing in
    const o0 = { burn: !night, win: K.win, wall: K.wall, roof: K.roof, roofHi: K.roofHi };
    const spots = [
      [3.58, 'The Gilded Tankard', 230, 80, 60, { roof: night ? '#4a2a28' : '#3a1c14', wall: night ? '#3c4258' : '#4a3d2e', wins: [0.14, 0.31, 0.69, 0.86], chimney: 0.72 }],   // (west-north-west of the square, as in town)
      [-Math.PI / 2, null, 190, 70, 70, { roof: night ? '#26392f' : '#26180f', wall: night ? '#364058' : '#40362a', wins: [0.25, 0.75] }],   // the Trophy Hall, north
      [-0.2, null, 170, 66, 56, { roof: night ? '#323a46' : '#241a14', wall: night ? '#343c50' : '#3e3328', wins: [0.3, 0.7], chimney: 0.12 }],   // the Forge, east
      [0.55, null, 140, 58, 46, { roof: night ? '#2c3c5a' : '#2a1a14', wall: night ? '#364058' : '#40362a', wins: [0.5] }],
      [1.75, null, 150, 60, 48, { roof: night ? '#3a4658' : '#2a1a14', wall: night ? '#384258' : '#42382c', wins: [0.3, 0.7], chimney: 0.7 }],
      [2.5, null, 130, 56, 44, { roof: night ? '#3a2a2c' : '#2a1a14', wall: night ? '#384258' : '#42382c', wins: [0.5] }],
    ];
    const bs = spots.map(([ang, name, w, wh, rh, ov]) => building(c, ang, R + 16, w, wh, rh, Object.assign({}, o0, ov, name ? { name } : {}), r));
    for (const b of bs) {
      for (const [x, y] of b.wins) {
        if (night) { windows.push({ x, y, ph: r() * 9 }); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 54, '#ffcf80', 0.45); glow(c, x - Math.cos(b.toward) * 0, y, 16, '#fff0c0', 0.5); c.restore(); }
        else fires.push({ x, y: y + 6, h: 30 + r() * 14, w: 8, ph: r() * 9 });
      }
      if (!night) for (const [x, y] of b.roofs) fires.push({ x, y, h: 48 + r() * 26, w: 13 + r() * 5, ph: r() * 9, big: 1 });
    }
    // the plaza: the room itself, flagstones, with a kerb round it
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    c.fillStyle = K.plaza; c.fillRect(-R, -R, R * 2, R * 2);
    stones(c, R, r, 34, K.stone, 0.2, night ? 'rgba(8,10,18,0.5)' : 'rgba(6,4,3,0.5)');
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; glow(c, Math.cos(a) * d, Math.sin(a) * d, 40 + r() * 80, night ? '#06080f' : '#070402', 0.12 + r() * 0.12); }
    const cracks = [];
    if (!night) for (let i = 0; i < 30; i++) {   // the stone split, fire in some of the cracks
      const a0 = r() * TAU, d0 = Math.sqrt(r()) * R * 0.92, p = walk(r, Math.cos(a0) * d0, Math.sin(a0) * d0, r() * TAU, 5 + (r() * 5 | 0), 20, 1.0);
      c.lineJoin = c.lineCap = 'round'; trace(c, p); c.strokeStyle = 'rgba(3,2,1,0.75)'; c.lineWidth = 3; c.stroke();
      if (i % 3 === 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ffc060', 0.2); c.lineWidth = 2.2; c.stroke(); c.strokeStyle = rgba('#fff0c0', 0.3); c.lineWidth = 0.8; c.stroke(); c.restore(); cracks.push({ p, ph: r() * 9 }); }
    }
    circle(c, 0, 0, R * 0.44, null, night ? 'rgba(160,180,230,0.2)' : 'rgba(255,220,150,0.2)', 3);
    const rim = c.createRadialGradient(0, 0, R * 0.62, 0, 0, R * 1.02);   // the fire's light on the edge of the stones; the windows', at night
    rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, night ? 'rgba(255,200,120,0.05)' : 'rgba(255,170,70,0.13)'); c.fillStyle = rim; c.fillRect(-R, -R, R * 2, R * 2);
    const v = c.createRadialGradient(0, 0, R * 0.55, 0, 0, R * 1.02); v.addColorStop(0, 'rgba(2,2,4,0)'); v.addColorStop(1, 'rgba(2,2,4,0.4)'); c.fillStyle = v; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    lip(c, R, K.kerb, 'rgba(2,2,3,0.9)', night ? 'rgba(180,200,255,0.15)' : 'rgba(255,190,110,0.25)');
    // the fountain in the middle: a stone basin, the water dark gold (burning) or blue (night)
    const F = 86;
    circle(c, 5, 7, F + 14, 'rgba(0,0,0,0.3)'); circle(c, 0, 0, F + 10, night ? '#586078' : '#5a554c', OUT, 3); circle(c, 0, 0, F, '#2c2a26'); circle(c, 0, 0, F - 6, night ? '#1f4466' : '#3a2a14');
    circle(c, -14, -16, F * 0.5, night ? 'rgba(160,200,255,0.07)' : 'rgba(255,200,100,0.08)');
    // the sealed portal ring, north-east of the square as in town: an iron ring, a stone seal split across, and (burning) light under it
    const pa = -0.62, px = Math.cos(pa) * R * 0.74, py = Math.sin(pa) * R * 0.74, pr = 54, rr = pr + 16;
    circle(c, px + 5, py + 9, 98, 'rgba(0,0,0,0.3)'); circle(c, px, py, 94, night ? '#2c3040' : '#35302b'); circle(c, px, py, 90, null, night ? 'rgba(120,140,190,0.2)' : 'rgba(255,190,100,0.15)', 2);
    circle(c, px, py, rr, '#26242a', OUT, 3);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; circle(c, px + Math.cos(a) * (pr + 8), py + Math.sin(a) * (pr + 8), 6, '#403c44', OUT, 1.4); }
    circle(c, px, py, pr + 1, night ? '#4c5064' : '#4a443d', OUT, 2);
    if (!night) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, px, py, 90, '#ffd27a', 0.28); c.restore(); }
    for (const [a, b] of [[-2.4, 0.6], [0.9, 2.5]]) { const x0 = px + Math.cos(a) * pr * 0.9, y0 = py + Math.sin(a) * pr * 0.9, x1 = px + Math.cos(b) * pr * 0.9, y1 = py + Math.sin(b) * pr * 0.9; const mx2 = (x0 + x1) / 2 + 4, my2 = (y0 + y1) / 2 - 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(mx2, my2); c.lineTo(x1, y1); c.strokeStyle = '#070607'; c.lineWidth = 4; c.stroke(); if (!night) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ffe2a0', 0.7); c.lineWidth = 1.6; c.stroke(); c.restore(); } }
    circle(c, px, py, pr - 12, null, 'rgba(10,8,6,0.5)', 1.6);
    if (night) for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; line(c, px + Math.cos(a) * pr, py + Math.sin(a) * pr, px + Math.cos(a + Math.PI) * pr, py + Math.sin(a + Math.PI) * pr, '#1a181c', 2.4); }   // (the chains across it)
    // Osric's bluebells, in their careful ring round a flat stone, just outside the stones to the south-west
    const ba = 2.35, bxx = Math.cos(ba) * (R + 78), byy = Math.sin(ba) * (R + 78);
    circle(c, bxx + 2, byy + 3, 17, 'rgba(0,0,0,0.3)'); ellipse(c, bxx, byy, 15, 11, 0.3, night ? '#4a5266' : '#4a463e', OUT, 1.6);
    const bells = [];
    for (let k = 0; k < 14; k++) {
      const a = k * TAU / 14, x = bxx + Math.cos(a) * 32, y = byy + Math.sin(a) * 26;
      line(c, x, y + 5, x - 2, y - 7, night ? '#1d4a34' : '#30301a', 1.6); circle(c, x - 2, y - 9, 3.8, night ? '#6a8cf0' : '#3a4a8a', OUT, 1); circle(c, x - 3, y - 10, 1.2, night ? '#cfe0ff' : '#7a8ac0');
      bells.push([x - 2, y - 8]);
    }
    if (!night) for (let k = 0; k < 14; k += 2) fires.push({ x: bells[k][0], y: bells[k][1] + 2, h: 20 + r() * 12, w: 5, ph: r() * 9 });
    else { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, bxx, byy - 6, 50, '#7a9cff', 0.12); c.restore(); }
    edgeFade(c, bx, by, K.far, 150);
    return { form: night ? 'night' : 'square', far: K.far, bx, by, fires, windows, cracks, bluebells: [bxx, byy], portal: [px, py, pr], fountain: F,
      embers: Array.from({ length: night ? 0 : 60 }, () => { const an = r() * TAU, d = R * (0.9 + r() * 0.6); return { x: Math.cos(an) * d, y: Math.sin(an) * d, ph: r() * 9, sp: 0.05 + r() * 0.1, s: 0.8 + r() * 1.5 }; }),
      motes: Array.from({ length: night ? 34 : 0 }, () => ({ x: (r() * 2 - 1) * R * 1.2, y: (r() * 2 - 1) * R * 1.2, ph: r() * 9, sp: 4 + r() * 8 })) };
  }
  function squareLife(ctx, a, t, k = 1) {   // k 1..0: how much of the fire is left (the kill drains it)
    const hk = 0.25 + 0.75 * k; if (k <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
    for (const f of a.cracks) { const q = 0.5 + 0.5 * Math.sin(t * 1.1 + f.ph); trace(ctx, f.p); ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = rgba('#ffd890', 0.03 + 0.1 * q); ctx.lineWidth = 2.4; ctx.stroke(); }
    // the fountain: the water alight, small flames riding it
    glow(ctx, 0, 0, a.fountain * 1.4, '#ffb050', 0.1 + 0.04 * Math.sin(t * 2));
    for (let k = 0; k < 9; k++) { const an = k * TAU / 9 + t * 0.15, d = 20 + (k % 3) * 22; flame(ctx, Math.cos(an) * d, Math.sin(an) * d * 0.9 + 6, (20 + (k % 2) * 8) * hk, 7, t, k * 1.3, 0.4); }
    // the sealed ring: the fire under the seal pulsing up through it
    const [px, py, pr] = a.portal, q = 0.5 + 0.5 * Math.sin(t * 1.6); glow(ctx, px, py, pr * 1.6, '#ffe2a0', 0.1 + 0.1 * q); glow(ctx, px, py, pr * 0.7, '#ffffff', 0.08 + 0.08 * q);
    for (let k = 0; k < 8; k++) { const u = (t * 0.3 + k / 8) % 1, an = k * 2.4; circle(ctx, px + Math.cos(an) * pr * 0.6, py + Math.sin(an) * pr * 0.5 - u * 60, 1.6 * (1 - u * 0.5), rgba('#fff0c0', 0.7 * Math.sin(u * Math.PI))); }
    for (const f of a.fires) { glow(ctx, f.x, f.y - f.h * 0.4, f.h * (f.big ? 1.6 : 1.2), '#ffb050', f.big ? 0.1 : 0.07); flame(ctx, f.x, f.y, f.h * hk, f.w, t, f.ph, f.big ? 0.6 : 0.5); }
    for (const e of a.embers) { const u = (t * e.sp + e.ph) % 1; circle(ctx, e.x + Math.sin(t * 0.6 + e.ph * 7) * 14, e.y - u * 240, e.s * (1 - u * 0.5), rgba(u < 0.5 ? '#ffc070' : '#fff0c8', 0.7 * Math.sin(u * Math.PI))); }
    ctx.restore();
  }
  function nightLife(ctx, a, t) {
    const nk = S.nightAt == null ? 1 : sm01(clamp((t - S.nightAt - 0.6) / 3.4, 0, 1));   // (the windows light, the water stirs, the motes come, after the fire has gone)
    if (nk <= 0.01) return;
    ctx.save(); ctx.globalAlpha = nk; ctx.globalCompositeOperation = 'lighter';
    for (const w of a.windows) glow(ctx, w.x, w.y, 60, '#ffb860', 0.12 + 0.04 * Math.sin(t * 2.3 + w.ph) * Math.sin(t * 0.7 + w.ph));   // (a candle behind the glass)
    ctx.restore();
    ctx.save(); ctx.globalAlpha = nk;
    for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; circle(ctx, 0, 0, 18 + q * (a.fountain - 26), null, rgba('#a8c8ff', 0.4 * (1 - q)), 2); }   // the fountain's ripples
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10; k++) { const an = k * TAU / 10 + t * 0.3, q = (t * 1.2 + k * 0.1) % 1; circle(ctx, Math.cos(an) * (10 + q * 32), Math.sin(an) * (10 + q * 32) - Math.sin(q * Math.PI) * 16, 1.8, rgba('#cfe4ff', 0.6)); }
    glow(ctx, a.bluebells[0], a.bluebells[1] - 6, 46, '#7a9cff', 0.08 + 0.05 * Math.sin(t * 1.2));
    for (const m of a.motes) circle(ctx, m.x + Math.sin(t * 0.3 + m.ph) * 26, m.y + ((t * m.sp + m.ph * 40) % 80) - 40, 1.2, rgba('#bcd0ff', 0.14 + 0.1 * Math.sin(t + m.ph)));
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------------------------ ash fall
  // a cheap weather layer: flakes falling slowly and drifting on the wind, thicker each act. In Act IV it is burning paper turning
  // as it falls, and cinders rising. Every piece sits on a fixed slot in a box the size of the floor and wraps round it.
  function ashFall(ctx, a, g, t) {
    const d = g.n[1]; if (d < 0.01) return;
    const W = a.bx * 2, wind = g.n[3], paper = g.n[2];
    ctx.save();
    ctx.fillStyle = `rgb(${rgb3(g.ashc)})`;
    for (let i = 0; i < 220; i++) {
      const th = (i + 0.5) / 220; if (th > d) continue;
      const al = clamp((d - th) * 10, 0, 1) * (0.25 + 0.4 * hs(i, 1)), s = 1 + 2.2 * hs(i, 2) * hs(i, 2);
      const x = wrap(hs(i, 3) * W + t * wind * (0.5 + hs(i, 4)) + Math.sin(t * 0.6 + hs(i, 5) * 9) * 14, W) - W / 2, y = wrap(hs(i, 6) * W + t * (22 + 40 * hs(i, 7)), W) - W / 2;
      ctx.globalAlpha = al; ctx.fillRect(x, y, s, s * 1.4);
    }
    if (paper > 0.01) {
      for (let i = 0; i < 56; i++) {   // burning paper: a dark scrap with a lit edge, turning
        const th = (i + 0.5) / 56; if (th > paper) continue;
        const sz = 6 + 8 * hs(i, 11), x = wrap(hs(i, 12) * W + t * wind * (0.4 + hs(i, 13)) + Math.sin(t * 0.7 + hs(i, 14) * 9) * 30, W) - W / 2, y = wrap(hs(i, 15) * W + t * (14 + 22 * hs(i, 16)), W) - W / 2;
        const rot = t * (0.8 + hs(i, 17)) * (i % 2 ? 1 : -1) + hs(i, 18) * 6, sq = 0.35 + 0.65 * Math.abs(Math.cos(t * 1.3 + i));
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, sq); ctx.globalAlpha = 0.85 * paper;
        ctx.fillStyle = '#241a12'; ctx.fillRect(-sz / 2, -sz * 0.35, sz, sz * 0.7);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 * paper; ctx.strokeStyle = '#ffb860'; ctx.lineWidth = 1.4; ctx.strokeRect(-sz / 2, -sz * 0.35, sz, sz * 0.7);
        glow(ctx, 0, 0, sz * 1.4, '#ff9a3c', 0.18);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 110; i++) {   // cinders lifting
        const th = (i + 0.5) / 110; if (th > paper) continue;
        const x = wrap(hs(i, 21) * W + Math.sin(t * 0.5 + hs(i, 22) * 9) * 22 + t * wind * 0.3, W) - W / 2, y = W / 2 - wrap(hs(i, 23) * W + t * (18 + 30 * hs(i, 24)), W), fl = 0.5 + 0.5 * Math.sin(t * 7 + i * 3);
        ctx.globalAlpha = (0.35 + 0.5 * fl) * paper; ctx.fillStyle = i % 3 ? '#ffc070' : '#fff0c8'; ctx.fillRect(x, y, 1.6 + hs(i, 25) * 1.4, 1.6 + hs(i, 25) * 1.4);
      }
    }
    ctx.restore();
  }
  // the grade over the floor (the room's life and the ash are laid on after it; telegraphs and units are drawn after all of it, so they keep their own colour)
  function grade(ctx, g) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${rgb3(g.mul)})`; ctx.fillRect(-5000, -5000, 10000, 10000);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${rgb3(g.add)},${g.n[0].toFixed(3)})`; ctx.fillRect(-5000, -5000, 10000, 10000);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------------------------ FX5: the holes, the peel into the square, the portal
  // All three are FLOOR: they are drawn here (in the ambient layer, after the grade and the ash), so they lie under every echo, zone, telegraph and unit.
  //   the holes     roomev svhole:n { id, x, y, r } (and any 'hole' entry in the live room's floor, for a late joiner): the floor burns THROUGH, an edge of fire eating a ragged
  //                 pit; it stays, with a glowing rim, for the rest of the fight. Far down in it: the town square's stones burning (Acts III) or burning ground round a void (Act IV).
  //                 sovereign-fx.js turns MG_ART.holes off in these rooms (that is Morrow-Oak's violet pit) and draws the seeds, the saplings and the burst over them.
  //   the peel      roomev svact { act: 4 }: the crater's floor (kept from the moment the square replaces it: buildFloor stashes the old canvas) is drawn over the new floor as 18 strips
  //                 of paper, so the swap itself is never seen; fire eats each strip from its top edge down (the strip by the portal first, the rest in order of distance), its lip
  //                 curling and glowing, and the last of it falls away. The burning square is under it. Each hole is flared as the fire passes over it (it burns THROUGH the new floor).
  //   the portal    the square's sealed ring: from the same message its stone seal cracks, splits and slides apart, light rising out of the dark between the halves; it stays open.
  const lowOn = () => { try { return !!((typeof Save !== 'undefined' && Save.setting && Save.setting('lowFx', false)) || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)); } catch (e) { return false; } };
  const eo3 = q => 1 - Math.pow(1 - q, 3);
  const cl01 = q => clamp(q, 0, 1);
  const BELOW = {};
  // what lies far below a hole: 'crater' (Act III): Emberfall's flagstones, small and dim, cracks and patches of fire; 'square' (Act IV): burning ground round the rim, a void in the middle
  function belowSprite(mode) {
    if (BELOW[mode] !== undefined) return BELOW[mode];
    if (typeof document === 'undefined') return (BELOW[mode] = null);
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), r = rng(mode === 'square' ? 9101 : 9102);
    g.fillStyle = '#080403'; g.fillRect(0, 0, N, N);
    g.lineCap = g.lineJoin = 'round';
    if (mode === 'crater') {
      const cell = 24;
      for (let gy = -cell; gy < N + cell; gy += cell) for (let gx = -cell + (Math.round(gy / cell) % 2) * cell / 2; gx < N + cell; gx += cell) { const v = r(); rrect(g, gx + 1, gy + 1, cell - 3, cell - 3, 3, `rgb(${34 + v * 22 | 0},${24 + v * 14 | 0},${18 + v * 9 | 0})`, 'rgba(0,0,0,0.7)', 1); }
      g.beginPath(); g.arc(N * 0.5, N * 0.56, 92, 0.2, 2.7); g.strokeStyle = 'rgba(255,214,140,0.28)'; g.lineWidth = 3; g.stroke();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) { const x = r() * N, y = r() * N, rad = 30 + r() * 50; glow(g, x, y, rad, r() < 0.5 ? '#ff7a20' : '#ffb050', 0.55); glow(g, x, y, rad * 0.4, '#fff0b0', 0.3); }
      for (let i = 0; i < 16; i++) { const p = walk(r, r() * N, r() * N, r() * TAU, 5, 14, 1.1); trace(g, p); g.strokeStyle = rgba('#ff9a3a', 0.6); g.lineWidth = 2; g.stroke(); g.strokeStyle = rgba('#fff0c0', 0.45); g.lineWidth = 0.8; g.stroke(); }
    } else {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + r(); glow(g, N / 2 + Math.cos(a) * N * 0.4, N / 2 + Math.sin(a) * N * 0.4, 60, '#ff5a1a', 0.55); }
      for (let i = 0; i < 28; i++) { const a = r() * TAU, d0 = N * 0.58 + r() * 14, p = walk(r, N / 2 + Math.cos(a) * d0, N / 2 + Math.sin(a) * d0, a + Math.PI + (r() - 0.5) * 0.8, 6, 16, 0.9); trace(g, p); g.strokeStyle = rgba('#ff6a20', 0.7); g.lineWidth = 3; g.stroke(); g.strokeStyle = rgba('#ffd890', 0.6); g.lineWidth = 1; g.stroke(); }
      g.globalCompositeOperation = 'source-over';
      const vg = g.createRadialGradient(N / 2, N / 2, 8, N / 2, N / 2, N * 0.5); vg.addColorStop(0, 'rgba(0,0,0,1)'); vg.addColorStop(0.62, 'rgba(0,0,0,0.92)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = vg; g.fillRect(0, 0, N, N);
    }
    g.globalCompositeOperation = 'source-over';
    return (BELOW[mode] = cv);
  }
  // a hole's ragged outline, in unit radii; the fire eats it open unevenly (each point has its own lag)
  function holePts(h) {
    if (h.pts) return h.pts;
    const seed = (h.id | 0) * 13 + 7, N = 40, pts = [];
    for (let i = 0; i < N; i++) { const a = i * TAU / N, m = 0.88 + 0.17 * hs(i, seed) + 0.03 * Math.sin(a * 3 + seed) - ((i + seed) % 9 === 0 ? 0.1 : 0); pts.push([Math.cos(a) * m, Math.sin(a) * m * 0.95, 0.3 * hs(i, seed + 4)]); }
    return (h.pts = pts);
  }
  function holePath(c, h, age, rs = 1) {
    const P = holePts(h), r = h.r * rs; c.beginPath();
    for (let i = 0; i < P.length; i++) { const q = age >= 1.3 ? 1 : eo3(cl01((age - P[i][2]) / 0.7)), x = h.x + P[i][0] * r * q, y = h.y + P[i][1] * r * q; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath();
  }
  // flare: 0..1+, how hard the fire passing over a hole (the peel) is lighting it just now
  function holeDraw(c, h, t, mode, low, flare) {
    const age = t - h.t0; if (age < 0.02) return;
    const seed = (h.id | 0) * 13 + 7, x = h.x, y = h.y, R = h.r, birth = 1 - cl01(age / 2.8), br = 0.5 + 0.5 * Math.sin(t * 2.1 + seed), heat = 0.34 * birth + 0.6 * flare, op = cl01(age / 0.5);
    c.save(); c.lineCap = c.lineJoin = 'round';
    // the broken ground round it: scorched, split, a little fire in the splits
    holePath(c, h, age, 1.32 + 0.1 * flare); c.fillStyle = rgba('#080302', 0.5 * op); c.fill();
    holePath(c, h, age, 1.12); c.fillStyle = rgba('#060202', 0.5 * op); c.fill();
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + hs(i, seed + 1) * 0.5, q = eo3(cl01((age - 0.05 * i) / 0.7)), r0 = R * 0.95, r1 = R * (1.3 + 0.55 * hs(i, seed + 2)) * q, c0 = Math.cos(a), s0 = Math.sin(a), jx = (hs(i, seed + 3) - 0.5) * 14, jy = (hs(i, seed + 5) - 0.5) * 14;
      c.beginPath(); c.moveTo(x + c0 * r0, y + s0 * r0 * 0.95); c.lineTo(x + c0 * (r0 + r1) / 2 + jx, y + s0 * (r0 + r1) / 2 * 0.95 + jy); c.lineTo(x + c0 * r1, y + s0 * r1 * 0.95);
      c.strokeStyle = 'rgba(8,3,2,0.7)'; c.lineWidth = 3.2; c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ff7a22', cl01(0.22 + 0.18 * br + heat) * op); c.lineWidth = 1.5; c.stroke(); c.restore();
    }
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, R * 2.1, '#ff6a20', 0.12 + 0.04 * br + 0.28 * birth + 0.3 * flare); c.restore();
    // the pit
    holePath(c, h, age); c.fillStyle = '#05030a'; c.fill();
    c.save(); holePath(c, h, age); c.clip();
    const sp = belowSprite(mode);
    if (sp) { c.globalAlpha = (mode === 'square' ? 0.8 : 0.5) + 0.25 * birth; c.drawImage(sp, x - R * 1.15 + Math.sin(t * 0.5 + seed) * 3, y - R * 1.15 + 3, R * 2.3, R * 2.3); c.globalAlpha = 1; }
    const vg = c.createRadialGradient(x, y, R * 0.15, x, y, R * 1.05); vg.addColorStop(0, 'rgba(5,3,8,0)'); vg.addColorStop(0.55, 'rgba(5,3,8,0.28)'); vg.addColorStop(1, 'rgba(5,3,8,0.9)');   // (far down: the walls close in dark)
    c.fillStyle = vg; c.fillRect(x - R * 1.2, y - R * 1.2, R * 2.4, R * 2.4);
    c.globalCompositeOperation = 'lighter';
    glow(c, x, y + R * 0.1, R * 0.9, mode === 'square' ? '#c23a12' : '#ff7a22', (0.12 + 0.07 * Math.sin(t * 3.1 + seed * 2) * Math.sin(t * 1.3 + seed)) * op);   // (the fire below flickering)
    if (!low) for (let i = 0; i < 7; i++) { const q = (t * (0.3 + 0.2 * hs(i, seed + 6)) + hs(i, seed + 7)) % 1, a = hs(i, seed + 8) * TAU; circle(c, x + Math.cos(a) * R * 0.6 * (1 - q), y + Math.sin(a) * R * 0.5 * (1 - q) + q * R * 0.2, 1 + 1.4 * (1 - q), rgba('#ffc070', 0.7 * (1 - q) * Math.min(1, q * 5))); }
    c.globalCompositeOperation = 'source-over';
    holePath(c, h, age); c.strokeStyle = 'rgba(5,3,8,0.85)'; c.lineWidth = 18; c.stroke();
    c.globalCompositeOperation = 'lighter'; holePath(c, h, age); c.strokeStyle = rgba('#ff5a1a', cl01(0.3 + 0.1 * br + heat * 0.5)); c.lineWidth = 8; c.stroke();
    c.restore();
    // the rim: ink, fire, a hot edge; wider and whiter while it is eating (the first seconds) and as the peel passes
    holePath(c, h, age); c.strokeStyle = 'rgba(5,2,2,0.85)'; c.lineWidth = 6; c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba('#ff7a22', cl01(0.6 + 0.12 * br + 0.3 * heat)); c.lineWidth = 5 + 9 * heat; c.stroke();
    c.strokeStyle = rgba('#ffd05a', cl01(0.75 + 0.2 * heat)); c.lineWidth = 2.4 + 3 * heat; c.stroke();
    c.strokeStyle = rgba('#fff2b0', cl01(0.55 + 0.4 * birth + 0.4 * flare)); c.lineWidth = 1.2 + 1.2 * heat; c.stroke();
    const P = holePts(h), nf = low ? 5 : 10;
    for (let i = 0; i < nf; i++) {   // (hot spots crawling round the rim, and a small flame on some of them)
      const j = (i * 4 + Math.floor(t * 0.7 + seed)) % P.length, q = age >= 1.3 ? 1 : eo3(cl01((age - P[j][2]) / 0.7)), px = x + P[j][0] * R * q, py = y + P[j][1] * R * q, fl = 0.5 + 0.5 * Math.sin(t * 5 + i * 2.1 + seed);
      glow(c, px, py, 14 + 8 * fl, '#ffb050', 0.4 + 0.3 * fl);
      if (i % 2 === 0) flame(c, px, py + 3, 14 + 12 * fl + 20 * heat, 5.5, t, i * 1.7 + seed, 0.55 + 0.3 * heat, ORANGE);
    }
    c.restore();
    if (!low) for (let i = 0; i < 6; i++) {   // chips of stone and clods on the lip
      const a = hs(i, seed + 9) * TAU, d = R * (1.1 + 0.25 * hs(i, seed + 10)), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d * 0.95, s = 3 + 4 * hs(i, seed + 11), q = hs(i, seed + 12) * TAU;
      if (age > 0.3) poly(c, [cx + Math.cos(q) * s, cy + Math.sin(q) * s, cx + Math.cos(q + 2) * s * 0.8, cy + Math.sin(q + 2) * s * 0.8, cx + Math.cos(q + 4) * s * 0.9, cy + Math.sin(q + 4) * s * 0.9], '#4a3a2c', OUT, 1.2);
    }
    // embers lifting off it, always
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (low ? 3 : 7); i++) { const q = (t * 0.28 + hs(i, seed + 13)) % 1, a = hs(i, seed + 14) * TAU, d = R * 0.9 * hs(i, seed + 15); circle(c, x + Math.cos(a) * d + Math.sin(t + i) * 5 * q, y + Math.sin(a) * d * 0.9 - q * 70, 1.6 * (1 - q * 0.5), rgba(q < 0.45 ? '#fff0c0' : '#ffa850', 0.8 * Math.sin(q * Math.PI))); }
    c.restore();
    // the burst itself (the first 0.7 s): a shock ring and the thrown fire
    if (age < 0.9) {
      const q = age / 0.9;
      c.save(); c.globalCompositeOperation = 'lighter';
      glow(c, x, y, R * 1.4 * (1 - q) + 20, '#fff2b0', 0.7 * (1 - q));
      c.beginPath(); c.arc(x, y, R * (0.5 + 1.1 * eo3(q)), 0, TAU); c.strokeStyle = rgba('#ffd05a', 0.8 * (1 - q)); c.lineWidth = 5 * (1 - q) + 1; c.stroke();
      for (let i = 0; i < (low ? 6 : 14); i++) { const a = hs(i, seed + 16) * TAU, sp2 = (80 + 140 * hs(i, seed + 17)) * eo3(q), px = x + Math.cos(a) * (R * 0.5 + sp2), py = y + Math.sin(a) * (R * 0.5 + sp2) * 0.9 - 50 * Math.sin(q * Math.PI) * hs(i, seed + 18); circle(c, px, py, 2.4 * (1 - q) + 0.6, rgba(i % 3 ? '#ff9a3a' : '#fff0c0', 0.9 * (1 - q))); }
      c.restore();
    }
    // the fire passing over it (the peel): a ring of fire runs out from the rim, and sparks are thrown
    if (flare > 0.04) {
      const q = 1 - Math.min(1, flare);
      c.save(); c.globalCompositeOperation = 'lighter';
      c.beginPath(); c.arc(x, y, R * (0.9 + 0.55 * eo3(q)), 0, TAU); c.strokeStyle = rgba('#ffd05a', 0.7 * flare); c.lineWidth = 4 * flare + 1; c.stroke();
      for (let i = 0; i < (low ? 5 : 12); i++) { const a = hs(i, seed + 19) * TAU, d = R * (1 + 0.9 * eo3(q)) * (0.8 + 0.4 * hs(i, seed + 20)); circle(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.95 - 30 * q, 2 * flare + 0.6, rgba('#ffe8a0', 0.9 * flare)); }
      c.restore();
    }
    c.restore();
  }
  function holesDraw(c, a, t) {
    const lr = typeof ArenaView !== 'undefined' ? ArenaView.liveRoom : null;
    if (lr && lr.floor) for (const fl of lr.floor) { if (fl.kind !== 'hole' || S.hole[fl.id]) continue; S.hole[fl.id] = 1; S.holes.push({ id: fl.id, x: fl.x, y: fl.y, r: fl.r, t0: -99 }); }   // (a late joiner: no event, the hole already stands)
    if (!S.holes.length) return;
    const nk = S.act === 'night' ? 1 - sm01(clamp((t - (S.nightAt == null ? t : S.nightAt)) / 2.4, 0, 1)) : 1; if (nk <= 0.01) return;
    const mode = S.act === 4 || S.act === 'night' ? 'square' : 'crater', low = S.low;
    c.save(); c.globalAlpha = nk;
    for (const h of S.holes) if (t >= h.t0 - 0.02) { const rv = peelReveal(h.x, h.y); holeDraw(c, h, t, mode, low, rv == null ? 0 : Math.min(1.2, Math.max(0, Math.exp(-(t - rv) * 1.6) * cl01((t - rv + 0.25) / 0.25)))); }
    c.restore();
  }

  // ---- the peel: the old floor as strips of paper, burnt away from the top down
  const PEEL = { N: 18, s0: 0.12, spread: 3.0, dur: 1.55, end: 6.5, mul: '#e6dcfa' };
  function peelPlan(P) {
    if (P.strips) return P;
    const W = P.bx * 2, w = W / PEEL.N, portal = Math.cos(-0.62) * (ARENA.r || 520) * 0.74, ids = [];
    P.sc = P.cv.width / W; P.strips = [];
    for (let i = 0; i < PEEL.N; i++) { const x0 = -P.bx + i * w, x1 = x0 + w, xm = (x0 + x1) / 2; ids.push({ i, d: Math.abs(xm - portal) }); P.strips.push({ x0, x1, xm, w }); }
    ids.sort((a, b) => a.d - b.d);
    ids.forEach((o, rank) => {
      const st = P.strips[o.i], step = 9, m = Math.ceil(st.w / step);
      st.s = PEEL.s0 + PEEL.spread * Math.pow(rank / (PEEL.N - 1), 0.85) + (hs(o.i, 3) - 0.5) * 0.3;
      st.d = PEEL.dur * (0.82 + 0.45 * hs(o.i, 4)); st.step = step; st.m = m; st.ny = [];
      for (let j = 0; j <= m; j++) st.ny.push((hs(j, o.i * 7 + 5) - 0.5) * 26 + 14 * Math.sin(j * 0.9 + o.i * 1.7) + (hs(j, o.i + 40) < 0.12 ? 26 : 0));
    });
    return P;
  }
  const peelP = (st, u) => Math.pow(cl01((u - st.s) / st.d), 1.12);
  function peelEdge(P, st, p) {
    const base = -P.by - 70 + (2 * P.by + 140) * p, am = p <= 0 ? 0 : 0.35 + 0.65 * Math.sin(Math.PI * cl01(p)), pts = [];
    for (let j = 0; j <= st.m; j++) pts.push([Math.min(st.x1, st.x0 + j * st.step), base + st.ny[j] * am]);
    return pts;
  }
  // where on strip i (f = 0..1 across it) the fire's edge is at time u after the swap; the fx file throws burning scraps from it
  function peelPoint(i, u, f) {
    const P = S.peel; if (!P || !P.strips) return null;
    const st = P.strips[i], pts = peelEdge(P, st, peelP(st, u)), j = Math.min(st.m, Math.round(f * st.m));
    return { x: pts[j][0], y: pts[j][1] };
  }
  // the time (client clock) the edge passes (x, y), or null when there is no peel (so a hole is only flared by a real one)
  function peelReveal(x, y) {
    const P = S.peel; if (!P || !P.strips || S.act4 == null) return null;
    const st = P.strips[clamp(Math.floor((x + P.bx) / (P.bx * 2 / PEEL.N)), 0, PEEL.N - 1)], p = clamp((y + P.by + 70) / (2 * P.by + 140), 0, 1);
    return S.act4 + st.s + Math.pow(p, 1 / 1.12) * st.d;
  }
  function peelInfo(t) {
    const P = S.peel; if (!P || !P.strips || S.act4 == null) return null;
    const u = t - S.act4; if (u < -0.1 || u > PEEL.end) return null;
    return { u, strips: P.strips, n: PEEL.N };
  }
  function peelStrip(c, P, st, u, t, idx, low) {
    const p = peelP(st, u); if (p >= 1) return;
    const pts = peelEdge(P, st, p), fall = cl01((p - 0.9) / 0.1), w = st.x1 - st.x0;
    c.save();
    if (fall > 0) { c.translate(st.xm, P.by); c.rotate(0.05 * fall * (idx % 2 ? 1 : -1)); c.translate(-st.xm, -P.by + 90 * fall * fall); c.globalAlpha = 1 - fall; }
    c.beginPath(); pts.forEach((q, j) => (j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.lineTo(st.x1, P.by); c.lineTo(st.x0, P.by); c.closePath(); c.clip();
    c.drawImage(P.cv, (st.x0 + P.bx) * P.sc, 0, w * P.sc, P.cv.height, st.x0, -P.by, w, 2 * P.by);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = PEEL.mul; c.fillRect(st.x0, -P.by, w, 2 * P.by); c.globalCompositeOperation = 'source-over';
    if (p > 0) {   // (the paper chars toward the fire: two soft dark bands inside the edge)
      c.beginPath(); pts.forEach((q, j) => (j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.lineCap = c.lineJoin = 'round';
      c.strokeStyle = 'rgba(14,6,3,0.45)'; c.lineWidth = 52; c.stroke(); c.strokeStyle = 'rgba(8,3,2,0.7)'; c.lineWidth = 20; c.stroke();
    }
    c.restore();
    if (p <= 0 || p >= 0.97) return;
    c.save(); c.translate(0, fall > 0 ? 90 * fall * fall : 0); c.lineCap = c.lineJoin = 'round';
    const edge = () => { c.beginPath(); pts.forEach((q, j) => (j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); };
    edge(); c.strokeStyle = 'rgba(4,2,1,0.38)'; c.lineWidth = 16; c.translate(0, -7); c.stroke(); c.translate(0, 7);   // (the curled lip's shadow on the floor under it)
    c.beginPath(); pts.forEach((q, j) => (j ? c.lineTo(q[0], q[1] - 3 - 4 * hs(j, idx + 60)) : c.moveTo(q[0], q[1] - 3))); for (let j = pts.length - 1; j >= 0; j--) c.lineTo(pts[j][0], pts[j][1] + 1); c.closePath();
    c.fillStyle = 'rgba(38,20,10,0.92)'; c.fill();   // (the lip itself: the paper's dark back, curled over)
    c.globalCompositeOperation = 'lighter';
    c.beginPath(); pts.forEach((q, j) => (j ? c.lineTo(q[0], q[1] - 3 - 4 * hs(j, idx + 60)) : c.moveTo(q[0], q[1] - 3)));
    const fl = 0.8 + 0.2 * Math.sin(t * 11 + idx * 2);
    c.strokeStyle = rgba('#ff6a1a', 0.5 * fl); c.lineWidth = 11; c.stroke(); c.strokeStyle = rgba('#ffb050', 0.85 * fl); c.lineWidth = 5; c.stroke(); c.strokeStyle = rgba('#fff2b0', 0.9); c.lineWidth = 1.8; c.stroke();
    for (let j = 1; j < pts.length - 1; j += low ? 4 : 2) { const q = pts[j], k = 0.5 + 0.5 * Math.sin(t * 7 + j * 1.9 + idx), hot = hs(j, idx + 70); if (hot < 0.5) flame(c, q[0], q[1] - 3, 12 + 20 * hot * k, 5.5, t, j * 0.9 + idx, 0.6, hot < 0.25 ? GOLD : ORANGE); }
    if (!low) for (let s = 0; s < 3; s++) { const q = pts[Math.round((s + 0.5) * st.m / 3)]; glow(c, q[0], q[1] - 24, 64, '#ff7a22', 0.13 * fl); }
    c.restore();
  }
  function peelDraw(c, t) {
    const P = S.peel; if (!P || S.act4 == null) return;
    const u = t - S.act4;
    if (u > PEEL.end) { if (!S.peelKeep) S.peel = null; return; }
    if (u < -0.1) return;
    peelPlan(P);
    c.save();
    P.strips.forEach((st, i) => peelStrip(c, P, st, u, t, i, S.low));
    c.restore();
  }

  // ---- the cooling: the night square replaces the burning one in a single frame, so the old floor (kept as the peel keeps the crater's) is drawn over the new and fades out over 3.6 s
  function coolDraw(c, t) {
    const C0 = S.cool; if (!C0) return;
    if (C0.t0 == null) C0.t0 = S.nightAt == null ? t : S.nightAt;
    const u = (t - C0.t0) / 3.6; if (u >= 1) { S.cool = null; return; }
    if (u < -0.05) return;
    c.save(); c.globalAlpha = 1 - sm01(clamp(u, 0, 1)); c.drawImage(C0.cv, -C0.bx, -C0.by, C0.bx * 2, C0.by * 2); c.restore();
  }

  // ---- the portal: the sealed ring's seal cracks, splits and slides apart, light climbing out of the dark between
  function portalDraw(c, a, t) {
    if (S.act !== 4 || S.act4 == null || a.form !== 'square' || !a.portal) return;
    const u = t - S.act4; if (u < 0) return;
    const [px, py, pr] = a.portal, split = eo3(cl01((u - 0.9) / 1.7)), crack = cl01(u / 0.9) * (1 - cl01((u - 1.0) / 0.4)), low = S.low, fl = 0.85 + 0.15 * Math.sin(t * 3.3) * Math.sin(t * 1.1 + 1), face = Math.atan2(-py, -px), ax = face + Math.PI / 2;
    c.save(); c.translate(px, py); c.rotate(ax);   // (local x runs along the split; y is the way the halves slide)
    if (u < 1.4) {   // the crack: light leaking through the old seal along the line it will split on, the stones shivering
      const k = crack * (0.6 + 0.4 * Math.sin(u * 40) * Math.sin(u * 13));
      c.save(); c.globalCompositeOperation = 'lighter'; c.beginPath(); c.moveTo(-pr * 0.95, 0); for (let j = 1; j <= 8; j++) c.lineTo(-pr * 0.95 + j * pr * 0.2375, (hs(j, 31) - 0.5) * 10); c.strokeStyle = rgba('#ffd890', 0.7 * k); c.lineWidth = 3.4; c.stroke(); c.strokeStyle = rgba('#ffffff', 0.8 * k); c.lineWidth = 1.2; c.stroke(); glow(c, 0, 0, pr * 1.3, '#ffd27a', 0.28 * k); c.restore();
    }
    if (u >= 0.85) {
      const gap = 40 * split;
      // the pit between the halves, and the light in it
      ellipse(c, 0, 0, pr * 0.98, Math.max(2, pr * 0.98 * 0.2 + gap * 0.9), 0, '#07050a');
      c.save(); c.beginPath(); c.rect(-pr, -gap - 2, pr * 2, gap * 2 + 4); c.clip();
      c.globalCompositeOperation = 'lighter'; glow(c, 0, 0, pr * 1.1, '#ffd27a', 0.55 * split * fl); glow(c, 0, 0, pr * 0.5, '#ffffff', 0.4 * split * fl);
      c.restore();
      // the halves of the seal, sliding apart and tilting a little on their hinge
      for (const sd of [-1, 1]) {
        c.save(); c.translate(0, sd * gap); c.rotate(sd * 0.1 * split);
        c.beginPath(); c.arc(0, 0, pr + 1, sd > 0 ? 0 : Math.PI, sd > 0 ? Math.PI : TAU, false);
        c.moveTo(sd > 0 ? -pr - 1 : pr + 1, 0); for (let j = 0; j <= 8; j++) c.lineTo((sd > 0 ? -1 : 1) * (pr + 1) + (sd > 0 ? 1 : -1) * j * (pr + 1) * 0.25, sd * (hs(j, 32) * 6));   // (the jagged inner edge)
        c.closePath(); c.fillStyle = '#4a443d'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
        c.beginPath(); c.arc(0, 0, pr - 12, sd > 0 ? 0.1 : Math.PI + 0.1, sd > 0 ? Math.PI - 0.1 : TAU - 0.1); c.strokeStyle = 'rgba(10,8,6,0.5)'; c.lineWidth = 1.6; c.stroke();
        c.save(); c.globalCompositeOperation = 'lighter'; c.beginPath(); for (let j = 0; j <= 8; j++) { const xx = (sd > 0 ? -1 : 1) * (pr + 1) + (sd > 0 ? 1 : -1) * j * (pr + 1) * 0.25, yy = sd * (hs(j, 32) * 6); j ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.strokeStyle = rgba('#ffe2a0', 0.7 * split * fl); c.lineWidth = 2.2; c.stroke(); c.restore();   // (the cut edge glowing)
        c.restore();
      }
      // chips thrown up as it parts
      if (u < 3.4 && !low) for (let i = 0; i < 9; i++) { const q = cl01((u - 0.9 - 0.04 * i) / 1.3); if (q <= 0 || q >= 1) continue; const dx = (hs(i, 33) - 0.5) * pr * 1.6, dy = (hs(i, 34) - 0.5) * 40, rise2 = 70 * Math.sin(q * Math.PI) * (0.5 + hs(i, 35)); c.save(); c.translate(dx + dy * 0.2, dy + (hs(i, 36) < 0.5 ? -1 : 1) * gap * 0.5 - rise2); c.rotate(q * 6 + i); c.fillStyle = rgba('#4a443d', 1 - q * 0.4); c.fillRect(-3.5, -2.5, 7, 5); c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(-3.5, -2.5, 7, 5); c.restore(); }
    }
    c.restore();
    // light rising out of the open ring (screen-up): a soft column, and motes
    if (u >= 0.9) {
      const k = split * fl;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 7; j++) glow(c, px, py - 8 - j * 26, 50 - j * 4.5, '#ffd890', 0.17 * k * (1 - j / 8));   // (a soft column of light, stacked, with no hard edge)
      glow(c, px, py - 10, pr * 1.5, '#ffd27a', 0.2 * k);
      for (let i = 0; i < (low ? 4 : 10); i++) { const q = (t * 0.32 + hs(i, 37)) % 1; circle(c, px + (hs(i, 38) - 0.5) * pr * 1.3 + Math.sin(t + i) * 4 * q, py - 6 - q * 150, 1.6 * (1 - q * 0.5), rgba(q < 0.5 ? '#fff0c0' : '#ffc070', 0.8 * Math.sin(q * Math.PI) * k)); }
      c.restore();
    }
  }

  // Morrow-Oak's violet hole drawing (MG_ART.holes, called by ArenaView.drawRoomUnder for any room) is switched off in these rooms: the holes above are drawn instead
  function hookMg() {
    if (typeof MG_ART === 'undefined' || !MG_ART.holes || MG_ART.__sv) return;
    const h = MG_ART.holes;
    MG_ART.holes = function (ctx, room, t) { if (typeof ArenaView !== 'undefined' && ArenaView.amb && ArenaView.amb.kind === 'sovereign') return; return h.apply(this, arguments); };
    MG_ART.__sv = 1;
  }
  hookMg();

  // ------------------------------------------------------------------------------------------------------------------ hooks
  const BUILD = { hall: buildHall, forge: buildForge, crater: buildCrater, square: (c, bx, by, R) => buildSquare(c, bx, by, R, false), night: (c, bx, by, R) => buildSquare(c, bx, by, R, true) };
  const LIFE = { hall: hallLife, forge: forgeLife, crater: craterLife, square: squareLife, night: nightLife };
  const MARGIN = { hall: 300, forge: 340, crater: 300, square: 440, night: 440 };   // (the square's is wide: Act IV pulls the camera back)
  function life(ctx, a, t) {
    ctx.save(); ctx.fillStyle = a.far; ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000); ctx.rect(-a.bx, -a.by, a.bx * 2, a.by * 2); ctx.fill('evenodd'); ctx.restore();   // (flat colour beyond the floor's own canvas)
    S.low = lowOn(); hookMg();
    const g = gradeAt(t);
    coolDraw(ctx, t);   // (the kill: the burning square's stones, fading over the night's)
    grade(ctx, g);   // (the floor takes the grade; the lights and the ash laid on it after keep their own colour)
    if (a.form === 'square' && S.gut) LIFE.square(ctx, a, t, 1 - sm01(clamp((t - S.gut.t0) / S.gut.dur, 0, 1))); else LIFE[a.form](ctx, a, t);
    ashFall(ctx, a, g, t);
    peelDraw(ctx, t); holesDraw(ctx, a, t); portalDraw(ctx, a, t);   // (FX5: the floor's own happenings, last, so they are not covered by the ash or the grade)
  }

  const baseBuild = ArenaView.buildFloor, baseAmb = ArenaView.drawAmbient, baseEvent = ArenaView.roomEvent;
  ArenaView.buildFloor = function (bossId, scale) {
    const kind = FORMS[bossId], prevFloor = this.floor, prevBox = this.floorBox, prevForm = this.amb && this.amb.kind === 'sovereign' ? this.amb.form : null;
    if (!kind) return baseBuild.call(this, bossId, scale);
    const R = ARENA.kind === 'circle' ? ARENA.full : 540, bx = Math.ceil(R + MARGIN[kind]), by = bx;
    const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(bx * 2 * scale);
    const c = cv.getContext('2d'); c.scale(scale, scale); c.translate(bx, by);
    const amb = BUILD[kind](c, bx, by, R); amb.kind = 'sovereign';
    this.floor = cv; this.floorFor = bossId + '@' + scale; this.floorBox = { bx, by }; this.amb = amb;
    if (kind === 'square' && prevForm === 'crater' && prevFloor && prevBox) S.peel = { cv: prevFloor, bx: prevBox.bx, by: prevBox.by };   // (Every Name: the crater's floor is kept to peel away over the square, so the swap is never seen)
    if (kind === 'night' && prevForm === 'square' && prevFloor && prevBox) S.cool = { cv: prevFloor, bx: prevBox.bx, by: prevBox.by, t0: null };   // (the kill: the burning square cools into the night)
    if (kind === 'hall') S = fresh(1);   // (a fresh pull: Act I, the camera back where it was)
  };
  ArenaView.drawAmbient = function (ctx, t) {
    const a = this.amb;
    if (a && a.kind === 'sovereign') return life(ctx, a, t);
    return baseAmb.call(this, ctx, t);
  };
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    if (msg && msg.k === 'svact') { setAct(msg.act, now); if (msg.act === 4) S.act4 = now; }
    else if (msg && typeof msg.k === 'string' && msg.k.startsWith('svhole:')) { if (!S.hole[msg.id]) { S.hole[msg.id] = 1; S.holes.push({ id: msg.id, x: +msg.x || 0, y: +msg.y || 0, r: +msg.r || 80, t0: now }); } }
    else if (msg && msg.k === 'svcam') setZoom(msg.zoom, msg.dur, now);
    else if (msg && msg.k === 'svgutter') { S.gut = { t0: now, dur: Math.max(1, +msg.dur || 8.5) }; if (S.act === 4) easeTo('ebb', now, S.gut.dur); }   // (the kill: the fire drains out of the square, the grade ebbing with it)
    return baseEvent.call(this, room, msg, now, ...rest);
  };

  // ------------------------------------------------------------------------------------------------------------------ preview
  // window.__svRoomPreview(canvas, form, act, t, opts): draws a room as the arena would (floor, life, ash, grade) into a canvas, each
  // form with its own act and its own cached floor. opts.tells lays a red and a blue telegraph and four heroes over it to judge
  // readability. Changing a canvas's act eases the grade, as in the fight.
  const PREV = {};
  function prevEntry(form) {   // (a form's floor built for the preview alone, leaving the arena's own state as it was)
    let e = PREV[form]; if (e) return e;
    const k = [ArenaView.floor, ArenaView.floorFor, ArenaView.floorBox, ArenaView.amb];
    ARENA.use(form); ArenaView.buildFloor(form, 1);
    e = PREV[form] = { floor: ArenaView.floor, box: ArenaView.floorBox, amb: ArenaView.amb, S: fresh(1) };
    [ArenaView.floor, ArenaView.floorFor, ArenaView.floorBox, ArenaView.amb] = k;
    return e;
  }
  function preview(canvas, form, act, t, opts = {}) {
    const kind = FORMS[form]; if (!kind) return false;
    if (opts.peel) prevEntry('sovereign:crater');
    if (opts.cool != null) prevEntry('sovereign:square');
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, keep = S, keepA = ArenaView.amb, keepF = [ArenaView.floor, ArenaView.floorFor, ArenaView.floorBox];
    ARENA.use(form);
    let e = PREV[form];
    if (!e) {
      ArenaView.buildFloor(form, 1);
      e = PREV[form] = { floor: ArenaView.floor, box: ArenaView.floorBox, amb: ArenaView.amb, S: fresh(act == null ? 1 : act) };
    }
    S = e.S; if (act != null && act !== S.act) setAct(act, t);
    if (opts.holes) { const sg = JSON.stringify(opts.holes); if (e.holesSig !== sg) { e.holesSig = sg; S.holes = opts.holes.map(h => Object.assign({}, h)); S.hole = {}; for (const h of S.holes) S.hole[h.id] = 1; } }
    if (opts.act4 != null) S.act4 = opts.act4;
    if (opts.gut != null) S.gut = { t0: opts.gut, dur: 8.5 };   // (the kill: the square's fire draining; opts.ease also eases the grade to the ebb)
    if (opts.ease != null && e.easeAt !== opts.ease) { e.easeAt = opts.ease; S.from = pack(GRADE[4]); S.to = pack(GRADE.ebb); S.t0 = opts.ease; S.dur = 8.5; }
    if (opts.cool != null) { const o = PREV['sovereign:square']; if (!S.cool && (e.coolT == null || t < e.coolT - 0.5)) S.cool = { cv: o.floor, bx: o.box.bx, by: o.box.by, t0: opts.cool }; e.coolT = t; S.nightAt = opts.cool; }
    if (opts.peel && !S.peel) { const o = PREV['sovereign:crater']; S.peel = { cv: o.floor, bx: o.box.bx, by: o.box.by }; S.peelKeep = true; S.act4 = opts.peel.at; }
    const R = ARENA.r, half = R + 230, s = Math.min(W, H) / (2 * half);
    ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.translate(W / 2, H / 2); ctx.scale(s, s);
    ctx.drawImage(e.floor, -e.box.bx, -e.box.by, e.box.bx * 2, e.box.by * 2);
    life(ctx, e.amb, t);
    if (opts.tells) {   // (the boss tells' red and blue, roughly: a wash, a solid rim)
      const tl = (fill, rim) => { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = 2.5; ctx.stroke(); };
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R * 0.9, -0.6, 0.6); ctx.closePath(); tl('rgba(255,59,47,0.28)', '#ff3b2f');
      ctx.beginPath(); ctx.arc(-R * 0.45, -R * 0.3, 80, 0, TAU); tl('rgba(80,150,255,0.26)', '#5aa0ff');
      ctx.beginPath(); ctx.arc(-R * 0.2, R * 0.5, 110, 0, TAU); ctx.arc(-R * 0.2, R * 0.5, 50, 0, TAU, true); tl('rgba(255,59,47,0.28)', '#ff3b2f');
      [['#7aa0ff', -R * 0.4, -R * 0.25], ['#ffd27a', -R * 0.1, R * 0.45], ['#7aff9a', R * 0.2, 0], ['#ff9ad0', -R * 0.5, R * 0.1]].forEach(([col, x, y]) => circle(ctx, x, y, 11, col, OUT, 2.5));
    }
    ctx.restore();
    S = keep; ArenaView.amb = keepA; [ArenaView.floor, ArenaView.floorFor, ArenaView.floorBox] = keepF;
    return true;
  }
  if (typeof window !== 'undefined') window.__svRoomPreview = preview;

  const withS = (s, fn) => { if (!s) return fn(); const k = S; S = s; try { return fn(); } finally { S = k; } };
  // FX5, for sovereign-fx.js: the peel's strips (peelInfo), a point on a strip's burning edge (peelPoint), and the preview's own state for a form (stateFor)
  return { GRADE, FORMS, setAct, easeTo, setZoom, camZoom, preview, peelInfo: (t, s) => withS(s, () => peelInfo(t)), peelPoint: (i, u, f, s) => withS(s, () => peelPoint(i, u, f)), stateFor: form => (PREV[form] ? PREV[form].S : undefined) };
})();
