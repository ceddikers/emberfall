// Vesper, the Mirror Knight: the room she is fought in, drawn in code. The Argent Hall: a rect 960 x 520 centred on (0, 0) (hw 480, hh 260,
// ARENA_DEFS.vesper) of polished moon-silver under tall windows, a hall that stands in black water. Pilasters and a cornice stand along the
// north wall, wall tops with pilaster caps along the others, the floor a calm sheet of large silver slabs with a faint polish and the faintest
// inlay, so that red and blue telegraphs read instantly on it (everything on the floor is kept under about 0.16 alpha).
// And beside it, across the MIRROR WALL, the same hall reflected: the glass hall, flipped, dimmer, a little greyer and bluer, deeper blue
// toward its far wall (it is "a long way down"), with its far windows showing one small warm glow far below: the only warm colour in the
// room. Palette for the set: silver, black water, frost blue, and that single warm light.
// Loaded after arena-view.js. It adds buildArgent / argentLife to ArenaView (arena-view.js: buildFloor picks it by boss id 'vesper', drawAmbient
// by amb.kind 'argent'). Preview: tools/preview/argent-room.html.
//
// THE ROOM STATE. vesper.js sends it as a room moment (arena-view.js stores room events in liveRoom.ev[k] = { ...msg, start, end, dur }):
//   f.emit({ t: 'roomev', k: 'vsmirror', kind: 'n' | 'e' | 'line', px, py, nx, ny, dur: 9999 })   at each change (no event yet: 'n')
//     kind 'n'     (also m: 'north')  Acts I to III: the NORTH wall (y = -260) is the mirror; the glass hall fills y from -780 to -260 (the same hall
//                  flipped top to bottom)
//     kind 'e'     (also m: 'east')   Act IV: the EAST wall (x = +480) is the mirror; the glass hall fills x from 480 to 1440 (flipped left to right);
//                  the north wall is a wall again
//     kind 'line'  (also m: 'line' or 'dark')  Act V: the glass is dark and the mirror wall is plain dull silver (the east wall; msg.wall = 'north' |
//                  'east' says which); the planted line itself is a later lane's
//   The room also goes dark by itself when the Act V opener's moment arrives (vsact with n = 5), as the design has the glass go dark there.
//   (A harness may instead set liveRoom.mirror to 'north' | 'east' | 'dark' | 'line'; with nothing at all the room is 'north'.)
//   A change is animated (about 2.4 s): the old glass fades, the new one assembles outward from its seam, the walls it uncovers come back.
// Other room moments it answers:
//   vsring     Ring True / Hairline Fracture: both blades struck on the wall: at the end of the cast (its dur is cast + 1 s) a bright flash runs
//              along the seam and a pale band sweeps the glass
//   vsturn     The Mirror Turns: while the cast runs the glass strains (a growing shimmer and a bright seam), until the state changes
//   vsshiver   the same shiver on its own (dur 1): for a harness
// The glass is drawn from two cached pictures (north and east), so a change of state costs nothing. Everything drawn here lies under the
// telegraphs and the units; the twins in the glass, the camera and the mirror line are other lanes'.
//
// The hall's own colours (for tuning telegraphs against it): floor #7b879e (north) .. #9aa6bb (middle), slab seams #27314b at 0.16 alpha,
// walls #39445d, the glass hall's floor #4e5a75 .. #66738f.

const VS_ROOM = (() => {
  const wrap = (v, n) => ((v % n) + n) % n;
  const HW = 480, HH = 260, T = 56, EL = 124;   // the hall's half sizes; a wall top's thickness; the north wall's height on the screen
  const WARM = '#ffb865', WARMH = '#ffe3ae';
  const REAL = {
    floorN: '#7a869d', floorM: '#98a4b9', floorS: '#8793a9', seam: '#27314b', seamHi: '#ffffff', inlay: '#e4ecf8',
    wall: '#39445d', wallD: '#262f45', wallHi: '#93a1bb', pil: '#8895ae', pilHi: '#c2cde0', pilD: '#58657f', cornice: '#9ba8c0', plinth: '#5b6881',
    lip: '#cfd9ea', lipD: '#7d8aa4', cap: '#2e3950', capHi: '#76839c', edge: '#0a1020',
    winT: '#1c2c52', winB: '#0a1226', winRim: '#a9b6cc', frost: '#9fd2ff', frostH: '#e3f4ff',
  };
  const GLASS = {
    floorN: '#4a566f', floorM: '#66738f', floorS: '#586580', seam: '#1b2640', seamHi: '#dfeaff', inlay: '#b7c8e4',
    wall: '#262f48', wallD: '#182036', wallHi: '#62749a', pil: '#5a6988', pilHi: '#93a6c6', pilD: '#36425e', cornice: '#6a7b9e', plinth: '#3a4764',
    lip: '#98a9c8', lipD: '#4f5e7e', cap: '#1f2940', capHi: '#4f6082', edge: '#070c1a',
    winT: '#0e1a38', winB: '#050a16', winRim: '#7387ac', frost: '#86bdf4', frostH: '#d4eaff',
  };
  const soft = (c, x, y, rx, ry, rot, col, a) => { c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(1, ry / rx); glow(c, 0, 0, rx, col, a); c.restore(); };
  const lerp = (a, b, q) => a + (b - a) * q;

  // ------------------------------------------------------------------------------------------------------------ the floor
  // large slabs in a running bond with hairline seams, a polish of broad pale bands, a thin inlaid border: drawn in the hall's own frame
  // (origin at its middle). It is mirrored by the caller for the glass hall.
  function floorTex(c, P, seed) {
    const r = rng(seed);
    c.save(); c.beginPath(); c.rect(-HW, -HH, HW * 2, HH * 2); c.clip();
    const g = c.createLinearGradient(0, -HH, 0, HH); g.addColorStop(0, P.floorN); g.addColorStop(0.5, P.floorM); g.addColorStop(1, P.floorS);
    c.fillStyle = g; c.fillRect(-HW, -HH, HW * 2, HH * 2);
    // a broad pool of paler light in the middle, as if the windows' light came to rest there
    soft(c, 0, 0, 520, 300, 0, '#dfe9fb', 0.1);
    for (let row = 0; row < 4; row++) {
      const y0 = -HH + row * 130, off = (row % 2) * 80;
      for (let x0 = -HW - off; x0 < HW; x0 += 160) {
        const tone = r();
        c.fillStyle = tone < 0.5 ? `rgba(255,255,255,${0.012 + 0.04 * r()})` : `rgba(14,24,56,${0.012 + 0.04 * r()})`;
        c.fillRect(x0 + 1.5, y0 + 1.5, 157, 127);
        // a faint lit edge along the top and left of a slab, a dark one under it
        c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x0 + 1.5, y0 + 1.5, 157, 1.6); c.fillRect(x0 + 1.5, y0 + 1.5, 1.6, 127);
        c.fillStyle = rgba(P.seam, 0.15); c.fillRect(x0 + 1.5, y0 + 127, 157, 2); c.fillRect(x0 + 157, y0 + 1.5, 2, 127);
      }
    }
    // the polish: long pale bands, slanted
    for (const [x, w, a] of [[-330, 70, 0.05], [-120, 120, 0.04], [160, 56, 0.05], [330, 100, 0.035]]) {
      const gr = c.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(x, -HH); c.lineTo(x + w, -HH); c.lineTo(x + w - 190, HH); c.lineTo(x - 190, HH); c.closePath(); c.fill();
    }
    // grain
    for (let i = 0; i < 260; i++) { const x = (r() * 2 - 1) * HW, y = (r() * 2 - 1) * HH; circle(c, x, y, 0.4 + r() * 0.5, r() < 0.7 ? 'rgba(255,255,255,0.1)' : 'rgba(14,24,56,0.08)'); }
    // the inlaid border: a pale line and a dark one, with a small diamond in each corner
    c.strokeStyle = rgba(P.inlay, 0.13); c.lineWidth = 2.2; c.strokeRect(-HW + 30, -HH + 30, HW * 2 - 60, HH * 2 - 60);
    c.strokeStyle = rgba(P.seam, 0.13); c.lineWidth = 1.2; c.strokeRect(-HW + 38, -HH + 38, HW * 2 - 76, HH * 2 - 76);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const x = sx * (HW - 30), y = sy * (HH - 30); poly(c, [x, y - 9, x + 9, y, x, y + 9, x - 9, y], rgba(P.inlay, 0.1), rgba(P.seam, 0.14), 1.2); }
    // a soft darkening toward the walls
    const vg = c.createRadialGradient(0, 0, 150, 0, 0, 560); vg.addColorStop(0, 'rgba(8,14,34,0)'); vg.addColorStop(1, 'rgba(8,14,34,0.3)');
    c.fillStyle = vg; c.fillRect(-HW, -HH, HW * 2, HH * 2);
    c.restore();
  }

  // ------------------------------------------------------------------------------------------------------------ walls
  // a wall top seen from above (its inner face is hidden): the lit moulding of the inner edge at local y = 0, the top, a post at each pilaster,
  // the dark outer edge where the wall goes down into the water. It lies along local +x from -len/2 to +len/2 and out toward +y.
  function cap(c, P, len, xs) {
    const x0 = -len / 2;
    // under it: the wall's side going down to the water, and its soft shadow on the water
    soft(c, 0, T + 8, len / 2 + 30, 18, 0, '#000208', 0.5);
    c.fillStyle = P.cap; c.fillRect(x0, 0, len, T);
    const tg = c.createLinearGradient(0, 0, 0, T); tg.addColorStop(0, 'rgba(255,255,255,0.1)'); tg.addColorStop(0.5, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.fillStyle = tg; c.fillRect(x0, 0, len, T);
    // the inner moulding: bright, with a thin dark line under it
    const lg = c.createLinearGradient(0, 0, 0, 9); lg.addColorStop(0, P.lip); lg.addColorStop(1, P.lipD);
    c.fillStyle = lg; c.fillRect(x0, 0, len, 9);
    c.fillStyle = 'rgba(4,8,20,0.55)'; c.fillRect(x0, 9, len, 2);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x0, 0, len, 1.3);
    // a recessed panel along the top
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.2; c.strokeRect(x0 + 16, 19, len - 32, T - 32);
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.strokeRect(x0 + 16.8, 19.8, len - 32, T - 32);
    // the posts
    for (const x of xs) {
      const big = Math.abs(x) > len / 2 - 30, s = big ? 40 : 30, y = T * 0.5 + 3;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x - s / 2 + 3, y - s / 2 + 4, s, s);
      c.fillStyle = P.capHi; c.fillRect(x - s / 2, y - s / 2, s, s);
      c.fillStyle = P.pilHi; c.fillRect(x - s / 2, y - s / 2, s, 3); c.fillRect(x - s / 2, y - s / 2, 3, s);
      c.fillStyle = P.pilD; c.fillRect(x - s / 2, y + s / 2 - 3, s, 3); c.fillRect(x + s / 2 - 3, y - s / 2, 3, s);
      c.strokeStyle = P.edge; c.lineWidth = 1.6; c.strokeRect(x - s / 2, y - s / 2, s, s);
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; c.strokeRect(x - s / 2 + 5, y - s / 2 + 5, s - 10, s - 10);
    }
    // the outer edge, and a thread of frost-light where the water meets it
    c.fillStyle = P.edge; c.fillRect(x0, T - 3, len, 3);
    c.fillStyle = rgba(P.frost, 0.3); c.fillRect(x0, T, len, 1.2);
  }
  // a lancet window, its base centre at (cx, by), w wide and h tall: a pointed arch with a frame, a mullion and a transom. dark: the night beyond it.
  function lancet(c, P, cx, by, w, h) {
    const hw = w / 2, sh = h - hw * 0.9, path = () => { c.beginPath(); c.moveTo(cx - hw, by); c.lineTo(cx - hw, by - sh); c.quadraticCurveTo(cx - hw, by - h + 4, cx, by - h); c.quadraticCurveTo(cx + hw, by - h + 4, cx + hw, by - sh); c.lineTo(cx + hw, by); c.closePath(); };
    // the deep reveal round it
    c.save(); c.translate(0, 0); path(); c.lineWidth = 9; c.strokeStyle = 'rgba(2,6,16,0.55)'; c.lineJoin = 'round'; c.stroke(); c.restore();
    path(); const g = c.createLinearGradient(0, by - h, 0, by); g.addColorStop(0, P.winT); g.addColorStop(1, P.winB); c.fillStyle = g; c.fill();
    c.save(); path(); c.clip();
    // faint stars and a pale haze low down
    const r = rng(((cx * 7 + by) | 0) + 11);
    for (let i = 0; i < 6; i++) circle(c, cx + (r() - 0.5) * w * 0.8, by - h * (0.3 + r() * 0.6), 0.4 + r() * 0.5, rgba(P.frostH, 0.25 + r() * 0.4));
    soft(c, cx, by - 4, w * 0.8, 12, 0, P.frost, 0.16);
    // the tracery: a mullion and a transom
    c.strokeStyle = rgba(P.winRim, 0.85); c.lineWidth = 2.2; c.beginPath(); c.moveTo(cx, by); c.lineTo(cx, by - h + 6); c.moveTo(cx - hw, by - sh * 0.58); c.lineTo(cx + hw, by - sh * 0.58); c.stroke();
    c.restore();
    path(); c.lineWidth = 2.6; c.strokeStyle = P.winRim; c.lineJoin = 'round'; c.stroke();
    path(); c.lineWidth = 1; c.strokeStyle = P.edge; c.stroke();
    c.fillStyle = P.winRim; c.fillRect(cx - hw - 4, by, w + 8, 4); c.fillStyle = P.edge; c.fillRect(cx - hw - 4, by + 4, w + 8, 1.6);   // the sill
  }
  const CAPX = [-HW - T / 2, ...[1, 2, 3, 4, 5, 6, 7].map(k => -HW + k * 120), HW + T / 2];   // (the posts on a long wall top, in line with the north wall's pilasters)
  const WINDOWS_X = [0, 1, 2, 3, 4, 5, 6, 7].map(k => -HW + 60 + k * 120);
  // the north wall seen from inside: an elevation of pilasters and tall windows, standing on the floor's top edge (local y = 0 is that edge)
  // and rising up the screen. Returns the windows' world positions in its own frame.
  function elevation(c, P, glass) {
    const x0 = -HW - T, len = HW * 2 + T * 2;
    // the wall behind the windows
    const g = c.createLinearGradient(0, 0, 0, -EL); g.addColorStop(0, P.wallD); g.addColorStop(0.45, P.wall); g.addColorStop(1, P.wallD);
    c.fillStyle = g; c.fillRect(x0, -EL, len, EL);
    // the plinth along the foot of it, with a bright top edge
    c.fillStyle = P.plinth; c.fillRect(x0, -14, len, 14); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x0, -14, len, 1.4); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x0, -2, len, 2);
    // soft shadow where the wall meets the floor
    const sg = c.createLinearGradient(0, 0, 0, 38); sg.addColorStop(0, 'rgba(4,8,22,0.34)'); sg.addColorStop(1, 'rgba(4,8,22,0)'); c.fillStyle = sg; c.fillRect(-HW, 0, HW * 2, 38);
    const wins = [];
    for (const cx of WINDOWS_X) { lancet(c, P, cx, -22, 54, 70); wins.push({ x: cx, y: -22 - 26 }); }
    // the pilasters: nine of them, a shaft with a base and a capital, lit on the left
    for (let k = 0; k < 9; k++) {
      const x = -HW + k * 120, w = 28;
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x - w / 2 + 6, -EL + 14, w, EL - 14);
      const pg = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); pg.addColorStop(0, P.pilHi); pg.addColorStop(0.35, P.pil); pg.addColorStop(1, P.pilD);
      c.fillStyle = pg; c.fillRect(x - w / 2, -EL + 14, w, EL - 14);
      c.strokeStyle = P.edge; c.lineWidth = 1.6; c.strokeRect(x - w / 2, -EL + 14, w, EL - 14);
      for (const fx of [-0.18, 0.18]) { c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w * fx, -EL + 30); c.lineTo(x + w * fx, -22); c.stroke(); }
      c.fillStyle = P.pilHi; c.fillRect(x - w / 2 - 5, -EL + 14, w + 10, 9); c.strokeStyle = P.edge; c.strokeRect(x - w / 2 - 5, -EL + 14, w + 10, 9);   // the capital
      c.fillStyle = P.pil; c.fillRect(x - w / 2 - 4, -26, w + 8, 12); c.strokeRect(x - w / 2 - 4, -26, w + 8, 12);   // the base
    }
    // the cornice along the top, with a bright lip
    c.fillStyle = P.cornice; c.fillRect(x0, -EL - 2, len, 14); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(x0, -EL - 2, len, 1.6); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x0, -EL + 10, len, 2);
    c.strokeStyle = P.edge; c.lineWidth = 1.4; c.strokeRect(x0, -EL - 2, len, 14);
    for (let i = 0; i < 41; i++) { const x = x0 + 12 + i * ((len - 24) / 40); c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x, -EL + 3, 4, 6); }   // dentils
    // the wall's outer edge meets the water
    c.fillStyle = rgba(P.frost, 0.28); c.fillRect(x0, -EL - 3.4, len, 1.2);
    return wins;
  }
  // the light the windows throw on the floor: long soft slants, very faint, laid on the floor from the top edge
  function pools(c, P, wins) {
    c.save(); c.beginPath(); c.rect(-HW, 0, HW * 2, HH * 2); c.clip();
    for (const w of wins) {
      const g = c.createLinearGradient(0, 0, 0, 230); g.addColorStop(0, rgba(P.frostH, 0.07)); g.addColorStop(1, rgba(P.frostH, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(w.x - 24, 0); c.lineTo(w.x + 24, 0); c.lineTo(w.x + 24 - 60, 230); c.lineTo(w.x - 24 - 60, 230); c.closePath(); c.fill();
    }
    c.restore();
  }

  // ------------------------------------------------------------------------------------------------------------ a whole hall
  // o: { cx, cy: where the hall's middle is in the room; fx, fy: the floor is mirrored; top, bottom, left, right: 'elev' | 'cap' | 'none';
  //      pal; seed } drawn in room coordinates. Returns the windows (room coordinates) of its elevation.
  function hall(c, o) {
    const P = o.pal;
    c.save(); c.translate(o.cx, o.cy);
    c.save(); c.scale(o.fx ? -1 : 1, o.fy ? -1 : 1); floorTex(c, P, o.seed); c.restore();
    let wins = [];
    if (o.top === 'elev') {
      c.save(); c.translate(0, -HH); wins = elevation(c, P, o.glass).map(w => ({ x: w.x + o.cx, y: w.y - HH + o.cy })); c.restore();
      c.save(); c.translate(0, -HH); pools(c, P, WINDOWS_X.map(x => ({ x }))); c.restore();
    }
    if (o.top === 'cap') { c.save(); c.translate(0, -HH); c.rotate(Math.PI); c.translate(0, 0); cap(c, P, HW * 2 + T * 2, CAPX); c.restore(); }
    if (o.bottom === 'cap') { c.save(); c.translate(0, HH); cap(c, P, HW * 2 + T * 2, CAPX); c.restore(); }
    if (o.right === 'cap') { c.save(); c.translate(HW, 0); c.rotate(-Math.PI / 2); cap(c, P, HH * 2, [-HH, -HH / 2, 0, HH / 2, HH]); c.restore(); }
    if (o.left === 'cap') { c.save(); c.translate(-HW, 0); c.rotate(Math.PI / 2); cap(c, P, HH * 2, [-HH, -HH / 2, 0, HH / 2, HH]); c.restore(); }
    c.restore();
    return wins;
  }

  // the glass hall: the hall drawn in the glass palette, then deepened toward its far end and veiled, with a few slanted sheens and fine scratches.
  // side 'north': x -536 .. 536, y -898 .. -260 (the far wall at the top); 'east': x 480 .. 1496, y -384 .. 316 (the far wall at the right)
  function buildGlass(side, sc) {
    const N = side === 'north';
    const x0 = N ? -HW - T : HW, y0 = N ? -HH * 3 - EL - 4 : -HH - EL - 4, x1 = N ? HW + T : HW * 3 + T, y1 = N ? -HH : HH + T;
    const w = x1 - x0, h = y1 - y0, cv = document.createElement('canvas');
    cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc);
    const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(-x0, -y0);
    const o = N ? { cx: 0, cy: -HH * 2, fx: false, fy: true, top: 'elev', bottom: 'none', left: 'cap', right: 'cap' }
      : { cx: HW * 2, cy: 0, fx: true, fy: false, top: 'elev', bottom: 'cap', left: 'none', right: 'cap' };
    const wins = hall(c, Object.assign(o, { pal: GLASS, seed: 5, glass: true }));
    // depth: darker and bluer the further from the seam
    c.save();
    c.beginPath();
    if (N) c.rect(x0, y0, w, h); else c.rect(x0, y0, w, h);
    c.clip();
    const g = N ? c.createLinearGradient(0, -HH, 0, y0) : c.createLinearGradient(HW, 0, x1, 0);
    g.addColorStop(0, 'rgba(8,16,40,0)'); g.addColorStop(0.5, 'rgba(8,16,44,0.18)'); g.addColorStop(1, 'rgba(6,12,36,0.5)');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    c.fillStyle = 'rgba(110,150,214,0.07)'; c.fillRect(x0, y0, w, h);
    // slanted sheens and scratches in the glass
    const r = rng(N ? 91 : 93);
    for (let i = 0; i < 4; i++) {
      const cxs = lerp(x0, x1, r()), cys = lerp(y0, y1, r()), wd = 40 + r() * 60;
      const gr = c.createLinearGradient(cxs, 0, cxs + wd, 0); gr.addColorStop(0, 'rgba(210,228,255,0)'); gr.addColorStop(0.5, 'rgba(210,228,255,0.06)'); gr.addColorStop(1, 'rgba(210,228,255,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(cxs, y0); c.lineTo(cxs + wd, y0); c.lineTo(cxs + wd - h * 0.5, y1); c.lineTo(cxs - h * 0.5, y1); c.closePath(); c.fill();
    }
    for (let i = 0; i < 16; i++) { const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), l = 30 + r() * 90, a = -0.6 + r() * 0.3; line(c, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 'rgba(210,228,255,0.07)', 0.9); }
    c.restore();
    return { cv, x0, y0, w, h, wins };
  }

  // ------------------------------------------------------------------------------------------------------------ the mirror's edge
  // the bright bevelled edge along the seam: a silver moulding with a lit line, a soft glare on the floor beside it and a dimmer one in the glass.
  // Drawn along local +x with the real hall on the +y side (local y > 0) and the glass on y < 0; a mirror wall of length len.
  function seamPic(len, sc) {
    const cv = document.createElement('canvas'), H = 44;
    cv.width = Math.ceil((len + 40) * sc); cv.height = Math.ceil(H * sc);
    const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(len / 2 + 20, H / 2);
    const x0 = -len / 2;
    let g = c.createLinearGradient(0, 0, 0, 17); g.addColorStop(0, 'rgba(244,250,255,0.62)'); g.addColorStop(0.35, 'rgba(210,228,255,0.22)'); g.addColorStop(1, 'rgba(190,214,255,0)');
    c.fillStyle = g; c.fillRect(x0, 0, len, 17);
    g = c.createLinearGradient(0, 0, 0, -15); g.addColorStop(0, 'rgba(230,242,255,0.4)'); g.addColorStop(1, 'rgba(190,214,255,0)');
    c.fillStyle = g; c.fillRect(x0, -15, len, 15);
    // the moulding: a bevel, two faces and a hairline of light
    c.fillStyle = 'rgba(2,6,18,0.5)'; c.fillRect(x0, 1.6, len, 3.4);
    const bg = c.createLinearGradient(0, -3.4, 0, 1.8); bg.addColorStop(0, '#9fb0cc'); bg.addColorStop(0.45, '#f6faff'); bg.addColorStop(0.55, '#d7e3f6'); bg.addColorStop(1, '#6f819f');
    c.fillStyle = bg; c.fillRect(x0, -3.4, len, 5.2);
    c.fillStyle = '#ffffff'; c.fillRect(x0, -0.6, len, 1.2);
    c.fillStyle = 'rgba(2,6,18,0.7)'; c.fillRect(x0, -4.6, len, 1.2);
    // the brackets where the frame meets the walls
    for (const sx of [-1, 1]) { const x = sx * (len / 2); poly(c, [x - sx * 22, -5.4, x + sx * 3, -7.4, x + sx * 3, 5.4, x - sx * 22, 3.6], '#b9c8e0', '#0a1020', 1.4); line(c, x - sx * 20, -3.6, x + sx * 1, -5.2, 'rgba(255,255,255,0.9)', 1); circle(c, x - sx * 9, -0.8, 1.8, '#e6f0ff', '#0a1020', 0.8); }
    return { cv, len, H };
  }
  // the plain dull silver wall of the dark state: a matte slab with a worn bevel and no reflection at all
  function dullPic(w, h, sc) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc);
    const c = cv.getContext('2d'); c.scale(sc, sc);
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#78839a'); g.addColorStop(0.5, '#646f86'); g.addColorStop(1, '#566177');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = rng(77);
    for (let i = 0; i < 160; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(8,14,34,0.08)'; c.fillRect(r() * w, r() * h, 2 + r() * 14, 1 + r() * 2); }
    c.strokeStyle = 'rgba(8,14,34,0.55)'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, w - 3, h - 3);
    c.strokeStyle = 'rgba(210,222,242,0.3)'; c.lineWidth = 1.2; c.strokeRect(5, 5, w - 10, h - 10);
    // rivets
    for (let i = 0; i < Math.round(Math.max(w, h) / 60); i++) { const t = (i + 0.5) / Math.round(Math.max(w, h) / 60); const x = w > h ? t * w : w / 2, y = w > h ? h / 2 : t * h; circle(c, x, y, 2, '#8d99b0', 'rgba(8,14,34,0.7)', 1); }
    return cv;
  }

  // ------------------------------------------------------------------------------------------------------------ the floor
  function buildArgent(c, bx, by) {
    const m = typeof c.getTransform === 'function' ? c.getTransform() : null, sc = m ? clamp(Math.hypot(m.a, m.b), 1, 1.5) : 1;
    const r = rng(1401);
    // ---- the black water all round, and the night sky's faint light on it
    const g = c.createRadialGradient(0, 0, 160, 0, 0, Math.hypot(bx, by));
    g.addColorStop(0, '#0d1626'); g.addColorStop(0.45, '#080e1b'); g.addColorStop(1, '#04060c');
    c.fillStyle = g; c.fillRect(-bx, -by, bx * 2, by * 2);
    soft(c, 0, 0, HW + 300, HH + 260, 0, '#223c68', 0.28);
    // long, low ripples on the water, and a few glints
    for (let i = 0; i < 90; i++) {
      const x = (r() * 2 - 1) * bx, y = (r() * 2 - 1) * by, len = 40 + r() * 140;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y + (r() - 0.5) * 5, x + len, y + (r() - 0.5) * 3);
      c.strokeStyle = rgba(r() < 0.5 ? '#9fb8e0' : '#5a7cb0', 0.035 + r() * 0.07); c.lineWidth = 1; c.stroke();
    }
    for (let i = 0; i < 70; i++) circle(c, (r() * 2 - 1) * bx, (r() * 2 - 1) * by, 0.5 + r() * 0.8, rgba('#cfe0ff', 0.08 + r() * 0.2));
    // the hall's reflection lying on the water just outside its walls: a pale band, broken by ripples
    for (const [x, y, w, h] of [[-HW - T, HH + T, HW * 2 + T * 2, 60], [-HW - T - 60, -HH - EL, 60, HH * 2 + EL + T + 60], [HW + T, -HH - EL, 60, HH * 2 + EL + T + 60]]) {
      soft(c, x + w / 2, y + h / 2, w / 2 + 20, h / 2 + 10, 0, '#8fb2e6', 0.07);
    }
    // the water fades into the plain dark of the screen at the edge of this picture (main.js fills the rest with #04060b)
    for (const [x0, y0, x1, y1, w, h] of [[-bx, 0, -bx + 180, 0, 180, by * 2], [bx, 0, bx - 180, 0, 180, by * 2], [0, -by, 0, -by + 180, bx * 2, 180], [0, by, 0, by - 180, bx * 2, 180]]) {
      const eg = c.createLinearGradient(x0, y0, x1, y1); eg.addColorStop(0, 'rgba(4,6,11,1)'); eg.addColorStop(1, 'rgba(4,6,11,0)'); c.fillStyle = eg;
      if (y0 === 0 && x0 < 0) c.fillRect(-bx, -by, 180, by * 2); else if (y0 === 0) c.fillRect(bx - 180, -by, 180, by * 2); else if (y0 < 0) c.fillRect(-bx, -by, bx * 2, 180); else c.fillRect(-bx, by - 180, bx * 2, 180);
    }
    // ---- the hall itself
    hall(c, { cx: 0, cy: 0, fx: false, fy: false, top: 'elev', bottom: 'cap', left: 'cap', right: 'cap', pal: REAL, seed: 5, glass: false });
    // a thin lit lip all round the floor's edge
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1.6; c.strokeRect(-HW + 0.8, -HH + 0.8, HW * 2 - 1.6, HH * 2 - 1.6);

    // ---- the glass halls (cached once), the mirror's edges and the dull wall of the dark state
    const north = buildGlass('north', sc), east = buildGlass('east', sc);
    const seamN = seamPic(HW * 2, sc), seamE = seamPic(HH * 2, sc);
    const dullE = dullPic(T + 4, HH * 2 + 6, sc), dullN = dullPic(HW * 2 + 12, EL + 14, sc);
    // the motes that drift in the hall (mirrored in the glass)
    const motes = Array.from({ length: 26 }, () => ({ x: r(), y: r(), s: 4 + r() * 8, ph: r() * 9, k: 0.6 + r() * 0.9, a: 0.18 + r() * 0.3 }));
    ArenaView.amb = {
      kind: 'argent', bx, by, sc, north, east, seamN, seamE, dullE, dullN, motes,
      cur: null, prev: null, t0: -999, wall: 'east', rings: Array.from({ length: 9 }, (_, i) => ({ ph: r() * 20, P: 11 + r() * 8, k: i })),
    };
  }

  // ------------------------------------------------------------------------------------------------------------ the life
  const KIND = { n: 'north', north: 'north', e: 'east', east: 'east', line: 'line', dark: 'dark' };
  function stateOf(room) {
    const ev = room && room.ev;
    let m = 'north', wall;
    const e = ev && ev.vsmirror;
    if (e && (e.m || e.kind)) { m = KIND[e.m || e.kind] || 'north'; wall = e.wall; }
    else if (room && typeof room.mirror === 'string') m = KIND[room.mirror] || 'north';
    if (ev && ev.vsact && ev.vsact.n >= 5 && isGlass(m)) { wall = wall || m; m = 'dark'; }
    return { m, wall };
  }
  // how hard the glass shivers now: a strike of Ring True at the end of its cast, The Mirror Turns straining, or a harness's vsshiver
  function shiverOf(ev, t) {
    let k = 0;
    const r = ev.vsring; if (r) { const ts = r.end - 1; if (t >= ts - 0.04 && t < ts + 1.4) k = Math.max(k, Math.exp(-(t - ts) * 2.4)); }
    const u = ev.vsturn; if (u && t >= u.start && t < u.end + 0.3) { const d = Math.max(0.5, (u.end - u.start) - 0.6), p = clamp((t - u.start) / d, 0, 1); k = Math.max(k, 0.25 + 0.5 * p * p + 0.12 * Math.sin(t * 23) * p); }
    const s = ev.vsshiver; if (s && t < s.end + 0.2) k = Math.max(k, Math.max(0, Math.min((t - s.start) / 0.06, (s.end - t) / 0.9, 1)));
    return k;
  }
  const isGlass = m => m === 'north' || m === 'east';
  // the glass hall's far-window glows: tiny warm lights, a long way down (the only warm colour in the room)
  function windowGlows(ctx, a, side, k, t) {
    const hall = side === 'north' ? a.north : a.east;
    if (k < 0.02) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    hall.wins.forEach((w, i) => {
      const big = i % 3 === 1, tw = 0.8 + 0.12 * Math.sin(t * (0.7 + (i % 4) * 0.23) + i * 2.1) + 0.05 * Math.sin(t * 2.9 + i), dip = (t * 0.7 + i * 3.1) % 13 < 0.25 ? 0.6 : 1;
      const inten = tw * dip * k, ox = (((i * 37) % 13) - 6) * 1.1, oy = 5 + ((i * 11) % 5);
      glow(ctx, w.x + ox, w.y + oy, big ? 9 : 5.4, WARM, (big ? 0.32 : 0.2) * inten);
      ctx.fillStyle = rgba(WARMH, Math.min(1, (big ? 0.85 : 0.6) * inten)); ctx.fillRect(w.x + ox - (big ? 1.3 : 0.9), w.y + oy - (big ? 1.3 : 0.9), big ? 2.6 : 1.8, big ? 2.6 : 1.8);
    });
    ctx.restore();
  }
  function argentLife(ctx, a, t) {
    const room = ArenaView.liveRoom, ev = (room && room.ev) || {};
    const env = (e, rise, fall) => (e ? Math.max(0, Math.min((t - e.start) / rise, (e.end - t) / fall, 1)) : 0);
    // ---- which state, and how far into a change
    const want = stateOf(room);
    if (a.cur === null) { a.cur = want.m; a.t0 = -999; if (want.wall) a.wall = want.wall; }
    else if (want.m !== a.cur) {
      a.prev = a.cur; if (isGlass(a.cur)) a.wall = a.cur; a.cur = want.m; a.t0 = t;
      if (want.wall) a.wall = want.wall;
    }
    const since = t - a.t0, changing = since < 2.6;
    const shiver = shiverOf(ev, t);
    // how much of each glass hall is there, and how far out from its seam it has been built (0..1)
    const level = { north: 0, east: 0 }, build = { north: 1, east: 1 };
    if (isGlass(a.cur)) { level[a.cur] = changing ? clamp((since - 0.55) / 0.5, 0, 1) : 1; build[a.cur] = changing ? easeOut(clamp((since - 0.5) / 1.5, 0, 1)) : 1; }
    if (a.prev && isGlass(a.prev) && changing) { level[a.prev] = Math.max(level[a.prev], 1 - clamp(since / 0.9, 0, 1)); build[a.prev] = 1; }
    const dull = (a.cur === 'dark' || a.cur === 'line') ? (changing ? clamp((since - 0.5) / 1.4, 0, 1) : 1) : (a.prev === 'dark' || a.prev === 'line') && changing ? 1 - clamp(since / 1, 0, 1) : 0;
    const bx = a.bx, by = a.by;

    // ---- water: a few slow rings spreading, outside the walls
    ctx.save(); ctx.lineWidth = 1.2;
    for (const rg of a.rings) {
      const cyc = Math.floor((t + rg.ph) / rg.P), q = ((t + rg.ph) % rg.P) / rg.P;
      if (q > 0.6) continue;
      const hx = hash01(rg.k * 31 + cyc * 7.3), hy = hash01(rg.k * 17 + cyc * 3.1 + 5), side = hx < 0.5 ? -1 : 1;
      const x = hy < 0.5 ? side * (HW + T + 40 + (bx - HW - T - 80) * hash01(rg.k + cyc * 1.7)) : (hx * 2 - 1) * (HW + T), y = hy < 0.5 ? (hash01(cyc + rg.k * 5) * 2 - 1) * HH : HH + T + 30 + (by - HH - T - 50) * hash01(rg.k * 3 + cyc);
      const rad = 4 + q / 0.6 * 46, al = Math.sin(q / 0.6 * Math.PI) * 0.18;
      ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.5, 0, 0, TAU); ctx.strokeStyle = rgba('#c8dcff', al); ctx.stroke();
    }
    ctx.restore();

    // ---- the glass halls
    for (const side of ['east', 'north']) {
      const k = level[side]; if (k < 0.01) continue;
      const h = side === 'north' ? a.north : a.east, p = build[side];
      ctx.save(); ctx.globalAlpha = k;
      // it assembles outward from its seam: a clip that grows (the far wall last)
      if (p < 0.999) {
        ctx.beginPath();
        if (side === 'north') ctx.rect(h.x0 - 2, h.y0 + h.h - h.h * p - 2, h.w + 4, h.h * p + 4); else ctx.rect(h.x0 - 2, h.y0 - 2, h.w * p + 4, h.h + 4);
        ctx.clip();
      }
      ctx.drawImage(h.cv, h.x0, h.y0, h.w, h.h);
      // a pale sheen sliding slowly over the glass now and then, and the shiver's bright band
      ctx.save(); ctx.beginPath();
      if (side === 'north') ctx.rect(-HW, -HH * 3, HW * 2, HH * 2); else ctx.rect(HW, -HH, HW * 2, HH * 2);
      ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const q = (t / 11 + (side === 'north' ? 0.2 : 0.55)) % 1, span = side === 'north' ? HW * 2 + 400 : HW * 2 + 400, sx = (side === 'north' ? -HW - 200 : HW - 200) + q * span;
      const sh = ctx.createLinearGradient(sx, 0, sx + 90, 0); const sa = q < 0.7 ? 0.05 * Math.sin(q / 0.7 * Math.PI) : 0;
      sh.addColorStop(0, 'rgba(220,236,255,0)'); sh.addColorStop(0.5, `rgba(220,236,255,${sa})`); sh.addColorStop(1, 'rgba(220,236,255,0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(sx, -HH * 3 - 10); ctx.lineTo(sx + 90, -HH * 3 - 10); ctx.lineTo(sx + 90 - 360, HH + 10); ctx.lineTo(sx - 360, HH + 10); ctx.closePath(); ctx.fill();
      if (shiver > 0.01) {
        const u = 1 - clamp(shiver, 0, 1);
        ctx.fillStyle = rgba('#e2efff', 0.16 * shiver); ctx.fillRect(side === 'north' ? -HW : HW, side === 'north' ? -HH * 3 : -HH, HW * 2, HH * 2);
        const pos = side === 'north' ? -HH - u * HH * 2 : HW + u * HW * 2;
        glow(ctx, side === 'north' ? 0 : pos, side === 'north' ? pos : 0, 300, '#dfeeff', 0.14 * shiver);
      }
      ctx.restore();
      windowGlows(ctx, a, side, k * (isGlass(a.cur) ? 1 : 1), t);
      ctx.restore();
    }

    // ---- the mirror's edge (the old one fades as the new one grows), and the dull wall of the dark state
    const edge = (side, k) => {
      if (k < 0.01) return;
      ctx.save(); ctx.globalAlpha = k;
      if (side === 'north') { ctx.translate(0, -HH); ctx.drawImage(a.seamN.cv, -HW - 20, -22, a.seamN.cv.width / a.sc, 44); }
      else { ctx.translate(HW, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(a.seamE.cv, -HH - 20, -22, a.seamE.cv.width / a.sc, 44); }
      ctx.restore();
      // glints that travel along the edge
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const q = ((t * 0.21 + i / 4 + hash01(i * 3.7) * 0.1) % 1), x = (q * 2 - 1) * (side === 'north' ? HW : HH) * 0.96, al = Math.sin(q * Math.PI) ** 3 * k;
        const wx = side === 'north' ? x : HW, wy = side === 'north' ? -HH : x;
        glow(ctx, wx, wy, 14, '#ffffff', 0.5 * al); line(ctx, wx - 6, wy, wx + 6, wy, rgba('#ffffff', 0.9 * al), 0.9); line(ctx, wx, wy - 6, wx, wy + 6, rgba('#ffffff', 0.9 * al), 0.9);
      }
      if (shiver > 0.01) { ctx.globalAlpha = k; if (side === 'north') { ctx.fillStyle = rgba('#ffffff', 0.5 * shiver); ctx.fillRect(-HW, -HH - 2, HW * 2, 4); glow(ctx, 0, -HH, 260, '#e4f0ff', 0.25 * shiver); } else { ctx.fillStyle = rgba('#ffffff', 0.5 * shiver); ctx.fillRect(HW - 2, -HH, 4, HH * 2); glow(ctx, HW, 0, 200, '#e4f0ff', 0.25 * shiver); } }
      ctx.restore();
    };
    edge('north', level.north); edge('east', level.east);
    if (dull > 0.01) {
      ctx.save(); ctx.globalAlpha = dull;
      if (a.wall === 'north') ctx.drawImage(a.dullN, -HW - 6, -HH - EL - 2, HW * 2 + 12, EL + 6 + 6); else ctx.drawImage(a.dullE, HW - 2, -HH - 3, T + 4, HH * 2 + 6);
      ctx.restore();
    }

    // ---- motes of pale light drifting up in the hall (and, mirrored, in the glass)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of a.motes) {
      const x = (wrap(m.x + Math.sin(t * 0.13 * m.k + m.ph) * 0.02, 1) * 2 - 1) * (HW - 20), y = HH - 14 - wrap(m.y * (HH * 2 - 28) + t * m.s * 0.55, HH * 2 - 28);
      const fade = Math.min(1, (HH - 14 - y) / 50, (y + HH - 14) / 50 + 0.2), al = m.a * Math.max(0, fade) * (0.7 + 0.3 * Math.sin(t * m.k + m.ph));
      ctx.fillStyle = rgba('#dcecff', al); ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
      if (level.north > 0.02) { ctx.fillStyle = rgba('#b8d2f4', al * 0.6 * level.north); ctx.fillRect(x - 0.9, -2 * HH - y - 0.9, 1.8, 1.8); }
      if (level.east > 0.02) { ctx.fillStyle = rgba('#b8d2f4', al * 0.6 * level.east); ctx.fillRect(2 * HW - x - 0.9, y - 0.9, 1.8, 1.8); }
    }
    ctx.restore();
  }

  return { buildArgent, argentLife };
})();

ArenaView.buildArgent = VS_ROOM.buildArgent;
ArenaView.argentLife = VS_ROOM.argentLife;
