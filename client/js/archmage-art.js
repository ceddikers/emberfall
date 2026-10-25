// Azerath, the Sunken Archmage — everything he looks like, drawn in code: his body and the four elementals, how each of his
// mechanics is drawn on the floor (the tells), what each one does when it lands, what it leaves behind, the drowned tower's
// floor with its seven circles, and the link that joins the two heroes who carry a rune. Loaded after arena-view.js; the other
// files reach it through AZ_ART (boss-tells.js get() / track() / the buster tell, boss-vfx.js impact() and the enrage), and it
// adds to ArenaView and BOSS_ART / ADD_ART itself.
// The rule as everywhere: the red (or blue) outline marks the exact area and is drawn by boss-tells.js; what is painted inside
// is the extra clue, and safe floor is never painted. The look follows the painted sheets (docs/art/vfx-reference/archmage-*.png):
// deep teal water and brass for the tower, each element in its own colour only where the danger is (fire orange, frost pale
// blue, lightning yellow, the void violet), bold ink-edged shapes with a white-hot core.

const AZ_ART = (() => {
  const COL = AZ.COL, ELS = AZ.ELS;
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const mix2 = (a, b, q) => {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join('');
  };
  // 'azReact:fire:frost' -> ['azReact', 'fire', 'frost']
  const parse = tag => String(tag || '').split(':');
  const BRASS = '#d8b45a', BONE = '#efe6cc', WATER = '#3fe0d0';
  const easeIn = q => q * q;
  // one palette per element: the colour, a saturated mid, the white-hot core, the dark inky edge, the glow
  const P = {
    fire: { col: COL.fire, mid: '#ff8a2a', hot: '#fff2c0', ink: '#3a1206', glow: '#ff5a1a' },
    frost: { col: COL.frost, mid: '#8fdcff', hot: '#ffffff', ink: '#082033', glow: '#7fd8ff' },
    bolt: { col: COL.bolt, mid: '#ffd23a', hot: '#ffffff', ink: '#33260a', glow: '#ffe45a' },
    void: { col: COL.void, mid: '#8a3fe8', hot: '#f0dcff', ink: '#0c0218', glow: '#a05aff' },
    arc: { col: '#7fd8ff', mid: '#6fb8ff', hot: '#ffffff', ink: '#06182e', glow: '#9af0ff' },       // the plain arcane: Burst and Lance
    water: { col: WATER, mid: '#2fc8bc', hot: '#e8fffb', ink: '#04262c', glow: '#5ad0c8' },        // the tower's own water
  };

  // ---------------------------------------------------------------- element glyphs (the same four everywhere)
  // fire: a flame; frost: a six-armed flake; bolt: a bolt; void: a ring round a dark eye
  function glyph(ctx, el, x, y, r, col, lw = 2) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (el === 'fire') {
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.8, -r * 0.3, r * 0.75, r * 0.6, 0, r * 0.8);
      ctx.bezierCurveTo(-r * 0.75, r * 0.6, -r * 0.8, -r * 0.2, 0, -r); ctx.fill();
    } else if (el === 'frost') {
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.55 - Math.sin(a) * r * 0.25, Math.sin(a) * r * 0.55 + Math.cos(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.lineTo(Math.cos(a) * r * 0.55 + Math.sin(a) * r * 0.25, Math.sin(a) * r * 0.55 - Math.cos(a) * r * 0.25); ctx.stroke(); }
    } else if (el === 'bolt') {
      ctx.beginPath(); ctx.moveTo(r * 0.25, -r); ctx.lineTo(-r * 0.55, r * 0.1); ctx.lineTo(-r * 0.05, r * 0.1); ctx.lineTo(-r * 0.3, r); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 0.1, -r * 0.2); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0.4, 0.4 + TAU * 0.78); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- small painted pieces, shared by tells, impacts and decals
  // a flame tongue standing on (x, y)
  function tongue(ctx, x, y, h, w, sway, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 1.35, y - h * 0.3, x - w * 0.15 + sway * 0.35, y - h * 0.55, x + sway, y - h);
    ctx.bezierCurveTo(x + w * 0.5 + sway * 0.9, y - h * 0.6, x + w * 1.45, y - h * 0.3, x + w, y);
    ctx.quadraticCurveTo(x, y + w * 0.4, x - w, y); ctx.fill();
  }
  // a flame: ink edge, orange body, yellow heart, white-hot tip
  function flame(ctx, x, y, h, w, t, a, ph = 0) {
    if (a <= 0.01 || h < 1) return;
    const sw = Math.sin(t * 7 + ph) * w * 1.5 + w * 0.5 * Math.sin(ph * 3.1), hh = h * (0.88 + 0.12 * Math.sin(t * 11 + ph * 2));
    ctx.save(); ctx.globalAlpha = Math.min(1, a);
    if (h > 18) { const o = w * 0.95 * (ph % 2 < 1 ? 1 : -1); tongue(ctx, x + o, y, hh * 0.62 * 1.1, w * 0.8, -sw * 0.8, 'rgba(58,18,6,0.85)'); tongue(ctx, x + o, y, hh * 0.62, w * 0.62, -sw * 0.8, '#ff7a1a'); }   // a lick off to one side
    tongue(ctx, x, y, hh * 1.1, w * 1.3, sw, 'rgba(58,18,6,0.85)');
    tongue(ctx, x, y, hh, w, sw, '#ff6a1a');
    tongue(ctx, x, y - 1, hh * 0.68, w * 0.66, sw * 0.8, '#ffb23a');
    tongue(ctx, x, y - 1, hh * 0.38, w * 0.36, sw * 0.6, '#fff2c0');
    ctx.restore();
  }
  // an ice shard standing on (x, y): ink edge, pale body, a lit facet
  function crystal(ctx, x, y, h, w, lean, a) {
    if (a <= 0.01 || h < 1) return;
    const tx = x + lean * h;
    ctx.save(); ctx.globalAlpha = Math.min(1, a);
    poly(ctx, [x - w, y, x - w * 0.55, y - h * 0.55, tx, y - h, x + w * 0.6, y - h * 0.5, x + w, y], '#8fdcff', '#082033', 1.8);
    poly(ctx, [x - w * 0.15, y, x - w * 0.45, y - h * 0.5, tx, y - h, x + w * 0.05, y - h * 0.45], '#e8faff', null);
    ctx.restore();
  }
  // a void spike: black body, violet rim, a pale heart at the tip
  function voidSpike(ctx, x, y, h, w, lean, a) {
    if (a <= 0.01 || h < 1) return;
    const tx = x + lean * h;
    ctx.save(); ctx.globalAlpha = Math.min(1, a);
    glow(ctx, x, y - h * 0.3, w * 3.2 + h * 0.2, '#a05aff', 0.4);
    poly(ctx, [x - w, y, x - w * 0.3, y - h * 0.6, tx, y - h, x + w * 0.4, y - h * 0.55, x + w, y], '#0c0218', '#b078ff', 1.8);
    poly(ctx, [x - w * 0.25, y - h * 0.3, tx, y - h * 0.97, x + w * 0.2, y - h * 0.35], '#7a2fd8', null);
    ctx.restore();
  }
  // a crooked bolt (lit: wide glow, saturated body, white core), jumping with `step`
  function zig(ctx, x1, y1, x2, y2, step, a, o = {}) {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, n = Math.max(3, Math.round(L / (o.seg || 26))), nx = -(y2 - y1) / L, ny = (x2 - x1) / L, jag = o.jag ?? 12, col = o.col || COL.bolt, w = o.w ?? 3;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    const trace = () => { ctx.beginPath(); ctx.moveTo(x1, y1); for (let i = 1; i < n; i++) { const q = i / n, j = (hash(i, step + (o.seed || 0)) - 0.5) * 2 * jag; ctx.lineTo(x1 + (x2 - x1) * q + nx * j, y1 + (y2 - y1) * q + ny * j); } ctx.lineTo(x2, y2); };
    for (const [c, lw, al] of [[col, w * 4, 0.22], [col, w, 0.85], ['#ffffff', Math.max(1, w * 0.4), 0.95]]) { trace(); ctx.globalAlpha = Math.min(1, a * al); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke(); }
    ctx.restore();
  }
  // a crack in the floor, ink-edged with a lit vein (no blending: it sits in the decals, under everything)
  function crackLine(ctx, x1, y1, x2, y2, seed, k, o = {}) {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, n = Math.max(3, Math.round(L / (o.seg || 18))), nx = -(y2 - y1) / L, ny = (x2 - x1) / L, jag = o.jag ?? 7;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = () => { ctx.beginPath(); ctx.moveTo(x1, y1); for (let i = 1; i < n; i++) { const q = i / n, j = (hash(i, seed) - 0.5) * 2 * jag; ctx.lineTo(x1 + (x2 - x1) * q + nx * j, y1 + (y2 - y1) * q + ny * j); } ctx.lineTo(x2, y2); };
    trace(); ctx.strokeStyle = rgba(o.ink || '#04101a', 0.85 * k); ctx.lineWidth = (o.w || 2) + 3; ctx.stroke();
    trace(); ctx.strokeStyle = rgba(o.col || '#bfeaff', (o.a ?? 0.9) * k); ctx.lineWidth = o.w || 2; ctx.stroke();
    ctx.restore();
  }
  // small rune marks set round a ring (the tower's own hand), turning slowly
  function runes(ctx, x, y, r, n, sz, col, a, rot = 0, seed = 0) {
    if (a <= 0.01) return;
    ctx.save(); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const an = rot + i * TAU / n, kind = Math.floor(hash(i, seed) * 4);
      ctx.save(); ctx.translate(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.rotate(an + Math.PI / 2); ctx.beginPath();
      if (kind === 0) { ctx.moveTo(-sz * 0.5, sz * 0.6); ctx.lineTo(0, -sz * 0.7); ctx.lineTo(sz * 0.5, sz * 0.6); ctx.moveTo(-sz * 0.3, sz * 0.1); ctx.lineTo(sz * 0.3, sz * 0.1); }
      else if (kind === 1) { ctx.moveTo(0, -sz * 0.7); ctx.lineTo(0, sz * 0.7); ctx.moveTo(-sz * 0.45, -sz * 0.2); ctx.lineTo(sz * 0.45, sz * 0.3); }
      else if (kind === 2) { ctx.arc(0, -sz * 0.15, sz * 0.4, 0.5, TAU - 0.5); ctx.moveTo(0, sz * 0.25); ctx.lineTo(0, sz * 0.75); }
      else { ctx.moveTo(-sz * 0.5, -sz * 0.5); ctx.lineTo(sz * 0.5, -sz * 0.5); ctx.lineTo(-sz * 0.5, sz * 0.5); ctx.lineTo(sz * 0.5, sz * 0.5); }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  // a brass-rimmed ring with the element's colour inside it and rune marks turning between
  function brassRing(ctx, x, y, r, el, a, t, o = {}) {
    const Q = P[el] || P.arc;
    circle(ctx, x, y, r, null, rgba(BRASS, 0.62 * a), 1.8);
    circle(ctx, x, y, r - 6, null, rgba(Q.col, 0.5 * a), 1.2);
    const n = Math.max(8, Math.min(40, Math.round(r / 9)));
    runes(ctx, x, y, r - 17, n, 4.5, Q.mid, 0.5 * a, t * (o.spin ?? 0.25), o.seed || 0);
  }
  // a six-pointed star (the staff's mark) drawn as two triangles
  function hexStar(ctx, x, y, r, col, w, rot = 0) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round';
    for (const off of [0, Math.PI]) { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = rot + off - Math.PI / 2 + i * TAU / 3; i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.stroke(); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- tells (boss-tells.js get() asks for one by tag)
  // a spread of points inside a shape, the same each frame for a seed
  function pts(s, n, seed) {
    const out = [], R = s.kind === 'rect' ? Math.min(s.len, ARENA.R * 2) : s.r || 100;
    const ca = s.kind === 'rect' ? Math.cos(s.angle) : 0, sa = s.kind === 'rect' ? Math.sin(s.angle) : 0;
    for (let i = 0; i < n * 5 && out.length < n; i++) {
      let x, y;
      if (s.kind === 'rect') { const u = hash(i, seed) * R, v = (hash(i, seed + 1) - 0.5) * s.w; x = s.x + ca * u - sa * v; y = s.y + sa * u + ca * v; }
      else { x = s.x + (hash(i, seed) * 2 - 1) * R; y = s.y + (hash(i, seed + 1) * 2 - 1) * R; if (s.kind !== 'circle' && s.kind !== 'donut' && s.kind !== 'cone') continue; }
      if (SHAPES.contains(s, x, y, -6)) out.push({ x, y, i });
    }
    return out;
  }
  const wash = (ctx, col, a) => { ctx.fillStyle = rgba(col, a); ctx.fillRect(-ARENA.R * 2, -ARENA.R * 2, ARENA.R * 4, ARENA.R * 4); };

  // which of his moves a shape belongs to. The tags are shared by several moves (azFire is the Pyre Rings, a Cinder Rune and
  // a Convergence sigil), so the shape and the kind of hit say which; a Counterspell echo keeps its original's shape
  function moveOf(tg, s) {
    const base = parse(tg.tag)[0], conv = s.kind === 'circle' && s.r === 225;
    if (base === 'azFire') return conv ? 'convFire' : (s.kind === 'donut' || (Math.abs(s.x) < 2 && Math.abs(s.y) < 2 && s.r >= 170)) ? 'pyre' : 'cinder';
    if (base === 'azFrost') return conv ? 'convFrost' : s.kind === 'rect' ? 'lances' : 'rime';
    if (base === 'azBolt') return conv ? 'convBolt' : 'leap';
    if (base === 'azVoid') return conv ? 'convVoid' : s.kind === 'donut' ? 'rift' : 'rifts';
    return base;
  }

  // the disc of an element: what is painted inside a circle that is its (Cinder, Rime, Bolt, Rifts, Convergence, Mark)
  const MOTIF = {
    // fire: standing flames, embers lifting
    fire(ctx, x, y, r, p, k, t, id) {
      glow(ctx, x, y, r * 1.05, '#ff5a1a', (0.12 + 0.2 * p) * k);
      const n = Math.max(6, Math.round(TAU * r * 0.8 / 32));
      for (let i = 0; i < n; i++) { const a = i * TAU / n + 0.2 * hash(i, id), d = r * (0.6 + 0.22 * hash(i, id + 1)); flame(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d + 6, (10 + 17 * p) * (0.7 + 0.5 * hash(i, id + 2)), 4.5 + 2 * p, t, (0.55 + 0.4 * p) * k, i); }
      for (let i = 0; i < 10; i++) { const u = (t * 0.6 + hash(i, id + 3)) % 1, a = hash(i, id + 4) * TAU, d = hash(i, id + 5) * r * 0.85; glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d - u * 30, 8 + 6 * p, i % 2 ? '#ffd27a' : '#ff8a2a', (0.2 + 0.4 * p) * k * (1 - u)); }
    },
    // frost: a lattice of spokes and a turning hexagon, crystals crowding the edge
    frost(ctx, x, y, r, p, k, t, id) {
      glow(ctx, x, y, r * 1.05, '#7fd8ff', (0.1 + 0.2 * p) * k);
      ctx.save(); ctx.strokeStyle = rgba('#e8faff', (0.25 + 0.3 * p) * k); ctx.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + t * 0.15; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74); ctx.stroke(); }
      hexagon(ctx, x, y, r * 0.48, null, rgba('#e8faff', (0.3 + 0.3 * p) * k), 1.4, t * 0.15);
      hexagon(ctx, x, y, r * 0.72, null, rgba('#9fe0ff', (0.25 + 0.3 * p) * k), 1.2, -t * 0.1);
      ctx.restore();
      const n = Math.max(8, Math.round(r / 8));
      for (let i = 0; i < n; i++) { const a = i * TAU / n + hash(i, id) * 0.2, d = r * 0.88; crystal(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d + 3, (7 + 14 * p) * (0.7 + 0.6 * hash(i, id + 1)), 3 + 2 * hash(i, id + 2), (hash(i, id + 3) - 0.5) * 0.5, (0.5 + 0.4 * p) * k); }
    },
    // lightning: threads of light hopping from the middle to the rim
    bolt(ctx, x, y, r, p, k, t, id) {
      glow(ctx, x, y, r * 1.05, '#ffe45a', (0.08 + 0.18 * p) * k);
      const step = Math.floor(t * 10);
      for (let i = 0; i < 6; i++) {
        if (hash(i, step + 9) < 0.25) continue;
        const a = i * TAU / 6 + hash(i, id) * 0.5, b = a + (hash(i, step) - 0.5) * 0.8;
        zig(ctx, x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(b) * r * 0.86, y + Math.sin(b) * r * 0.86, step + i, (0.35 + 0.5 * p) * k, { jag: 9, seg: 20, w: 1.6 });
      }
    },
    // void: black cracks with a violet vein, small black shards leaning out of them
    void(ctx, x, y, r, p, k, t, id) {
      glow(ctx, x, y, r * 1.05, '#4a1a8a', (0.18 + 0.25 * p) * k);
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + hash(i, id) * 0.5;
        crackLine(ctx, x + Math.cos(a) * r * 0.12, y + Math.sin(a) * r * 0.12, x + Math.cos(a + (hash(i, id + 7) - 0.5) * 0.5) * r * 0.84, y + Math.sin(a + (hash(i, id + 7) - 0.5) * 0.5) * r * 0.84, id + i, k, { ink: '#0c0218', col: '#b078ff', a: 0.4 + 0.5 * p, w: 1.6, jag: r * 0.05 });
      }
      for (let i = 0; i < 9; i++) { const a = hash(i, id + 3) * TAU, d = (0.3 + 0.55 * hash(i, id + 4)) * r; voidSpike(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d + 4, (8 + 16 * p) * (0.6 + hash(i, id + 5)), 3.2, (hash(i, id + 6) - 0.5) * 0.6, (0.5 + 0.4 * p) * k); }
    },
  };
  // an element's disc: brass-rimmed, its motif inside, its glyph in the middle
  function disc(ctx, el, s, p, k, t, id, o = {}) {
    const Q = P[el];
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    MOTIF[el](ctx, s.x, s.y, s.r, p, k, t, id);
    brassRing(ctx, s.x, s.y, s.r - 3, el, (0.7 + 0.3 * p) * k, t, { seed: id });
    ctx.restore();
    if (o.glyph !== false) glyph(ctx, el, s.x, s.y - 2, Math.min(s.r * 0.26, o.glyphMax || 26), rgba(Q.mid, (0.35 + 0.55 * p) * k), 2.4);
  }

  // ---- the moves' own floor marks
  // Arcane Burst: the room gathers: rings of white-blue light drawn in toward him, the staff's six-pointed star over his circle
  function burstTell(ctx, tg, s, p, k, t, env) {
    const R = ARENA.R, b = env.boss || { x: 0, y: 0 };
    ctx.save();
    ctx.fillStyle = `rgba(4,26,32,${(0.05 + 0.2 * p * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1, rr = 90 + (1 - q) * (R - 40); circle(ctx, b.x, b.y, rr, null, rgba('#bff0ff', (0.1 + 0.3 * p) * q * k), 2 + 3 * q); }
    for (const [rr, w] of [[170, 3], [350, 3]]) { circle(ctx, b.x, b.y, rr, null, rgba('#9af0ff', (0.22 + 0.5 * p) * k), w + 5 * p); circle(ctx, b.x, b.y, rr, null, rgba('#ffffff', (0.15 + 0.4 * p) * k), 1.2); }
    hexStar(ctx, b.x, b.y, 140, rgba('#d8f6ff', (0.2 + 0.5 * p) * k), 2, t * 0.3);
    ctx.restore();
    runes(ctx, b.x, b.y, 158, 28, 5, '#bff0ff', (0.3 + 0.4 * p) * k, -t * 0.2, 3);
    runes(ctx, b.x, b.y, 338, 56, 5, '#bff0ff', (0.25 + 0.35 * p) * k, t * 0.15, 5);
    ELS.forEach((el, i) => { const q = (t * 0.55 + i / 4) % 1; ellipse(ctx, b.x, b.y, 60 + q * R, (60 + q * R) * 0.92, 0, null, rgba(COL[el], 0.18 * (1 - q) * k * (0.4 + 0.6 * p)), 3); });
  }
  // Arcane Lance: a blue ring closing on the tank, a thin beam laid from his staff to them, growing hot
  function lanceTell(ctx, tg, s, p, k, t, env) {
    const tgt = tg.target != null && env.entById ? env.entById(tg.target) : null;
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = tgt ? Math.hypot(tgt.x - s.x, tgt.y - s.y) : s.r * 0.75;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
    g.addColorStop(0, rgba('#d8f6ff', (0.12 + 0.18 * p) * k)); g.addColorStop(1, rgba('#6fb8ff', (0.03 + 0.07 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    // thin lines of light converging on the middle of the cone
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) { const f = (i - 3) / 3, a0 = s.angle + f * s.arc * 0.5; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a0) * s.r, s.y + Math.sin(a0) * s.r); ctx.lineTo(s.x + ca * L * 0.9, s.y + sa * L * 0.9); ctx.strokeStyle = rgba('#bfeaff', (0.06 + 0.12 * p) * (1 - Math.abs(f) * 0.4) * k); ctx.stroke(); }
    ctx.restore();
    // the beam, growing hot as it nears, with chevrons running out along it
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [w, a, c] of [[10 + 8 * p, 0.12, '#6fb8ff'], [3 + 2.5 * p, 0.55 + 0.35 * p, '#bfeaff'], [1.2, 0.8, '#ffffff']]) { ctx.beginPath(); ctx.moveTo(s.x + ca * 44, s.y + sa * 44); ctx.lineTo(s.x + ca * L, s.y + sa * L); ctx.strokeStyle = rgba(c, a * k); ctx.lineWidth = w; ctx.stroke(); }
    for (let i = 0; i < 4; i++) { const q = (t * 0.9 + i / 4) % 1, d = 60 + q * Math.max(40, L - 100); ctx.save(); ctx.translate(s.x + ca * d, s.y + sa * d); ctx.rotate(s.angle); ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(3, 0); ctx.lineTo(-8, 9); ctx.strokeStyle = rgba('#ffffff', (1 - q) * (0.35 + 0.5 * p) * k); ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore(); }
    ctx.restore();
    // the ring round the one it is for
    if (tgt) {
      const x = tgt.x, y = tgt.y + 4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      circle(ctx, x, y, 58, null, rgba('#6fb8ff', (0.3 + 0.4 * p) * k), 7);
      circle(ctx, x, y, 58, null, rgba('#bfeaff', (0.6 + 0.35 * p) * k), 2.4);
      circle(ctx, x, y, 58 + (1 - p) * 70, null, rgba('#ffffff', (0.2 + 0.5 * p) * k), 1.8);
      ctx.restore();
      runes(ctx, x, y, 44, 10, 4.5, '#d8f6ff', (0.5 + 0.4 * p) * k, t * 0.8, 9);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 0.6; line(ctx, x + Math.cos(a) * 64, y + Math.sin(a) * 64, x + Math.cos(a) * 76, y + Math.sin(a) * 76, rgba('#ffffff', (0.5 + 0.4 * p) * k), 2); }
    }
  }
  // Pyre Rings: flames standing along the whole band, ember-bright runes between them
  function pyreTell(ctx, tg, s, p, k, t) {
    const id = tg.id, ro = Math.min(s.r, ARENA.R + 30), ri = s.kind === 'donut' ? s.r2 : 0;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    wash(ctx, '#ff5a1a', (0.07 + 0.14 * p) * k);
    const rows = ri ? [ri + 14, (ro + ri) / 2, ro - 14] : [ro * 0.8, ro * 0.45];
    rows.forEach((rr, j) => {
      const mid = ri && j === 1, n = Math.max(8, Math.round(TAU * rr / (mid ? 62 : 44)));
      for (let i = 0; i < n; i++) { const a = i * TAU / n + j * 0.37 + hash(i, id) * 0.06; flame(ctx, Math.cos(a) * rr, Math.sin(a) * rr + 8, (15 + 24 * p) * (0.75 + 0.5 * hash(i, id + j)) * (mid ? 0.8 : 1), 8 + 3 * p, t, (0.55 + 0.4 * p) * k, i + j * 7); }
    });
    for (const rr of ri ? [ro - 3, ri + 3] : [ro - 3]) { circle(ctx, 0, 0, rr, null, rgba(BRASS, 0.55 * k), 1.8); runes(ctx, 0, 0, rr + (rr === ro - 3 ? -13 : 13), Math.max(12, Math.round(rr / 12)), 5, '#ffb23a', (0.45 + 0.4 * p) * k, t * 0.1 * (rr > 300 ? -1 : 1), id); }
    for (let i = 0; i < 18; i++) { const u = (t * 0.5 + hash(i, id + 9)) % 1, a = hash(i, id + 10) * TAU, rr = ri ? ri + (ro - ri) * hash(i, id + 11) : ro * hash(i, id + 11); glow(ctx, Math.cos(a) * rr, Math.sin(a) * rr - u * 40, 9 + 5 * p, i % 2 ? '#ffd27a' : '#ff8a2a', (0.2 + 0.4 * p) * k * (1 - u)); }
    ctx.restore();
  }
  // Ice Lances: a spear of ice lying along the line out of him, chevrons running out, shards rising at its edges
  function lancesTell(ctx, tg, s, p, k, t) {
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), nx = -sa, ny = ca, L = Math.min(s.len, 640), id = tg.id;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const g = ctx.createLinearGradient(s.x, s.y, s.x + ca * L, s.y + sa * L);
    g.addColorStop(0, rgba('#e8faff', (0.12 + 0.2 * p) * k)); g.addColorStop(1, rgba('#7fd8ff', (0.03 + 0.1 * p) * k));
    ctx.fillStyle = g; ctx.fillRect(s.x - L - 100, s.y - L - 100, L * 2 + 200, L * 2 + 200);
    // shards pushing up along both edges
    const n = Math.round(L / 34);
    for (let i = 1; i < n; i++) for (const side of [-1, 1]) {
      const u = i * 34 + hash(i, id + side) * 14, v = side * (s.w / 2 - 12 - 6 * hash(i, id + 5));
      crystal(ctx, s.x + ca * u + nx * v, s.y + sa * u + ny * v + 3, (6 + 14 * p) * (0.6 + 0.8 * hash(i + side, id + 2)), 3, (hash(i, id + 4) - 0.5) * 0.5, (0.4 + 0.45 * p) * k);
    }
    ctx.restore();
    // the lance: a long diamond of ice with a barbed head, chevrons running out along it
    const a = (0.3 + 0.6 * p) * k, hw = 11 + 4 * p, hd = 64, hs = 24 + 6 * p;
    const P0 = [s.x + ca * 58, s.y + sa * 58], tip = [s.x + ca * L, s.y + sa * L], neck = [s.x + ca * (L - hd), s.y + sa * (L - hd)];
    ctx.save(); ctx.globalAlpha = a;
    poly(ctx, [P0[0] + nx * hw * 0.4, P0[1] + ny * hw * 0.4, neck[0] + nx * hw, neck[1] + ny * hw, neck[0] + nx * hs, neck[1] + ny * hs, tip[0], tip[1], neck[0] - nx * hs, neck[1] - ny * hs, neck[0] - nx * hw, neck[1] - ny * hw, P0[0] - nx * hw * 0.4, P0[1] - ny * hw * 0.4], '#8fdcff', '#082033', 2.2);
    poly(ctx, [P0[0], P0[1], neck[0] + nx * hw * 0.3, neck[1] + ny * hw * 0.3, tip[0] - ca * 10, tip[1] - sa * 10, neck[0] - nx * hw * 0.3, neck[1] - ny * hw * 0.3], '#e8faff', null);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const q = (t * 0.8 + i / 4) % 1, d = 90 + q * (L - 160); ctx.save(); ctx.translate(s.x + ca * d, s.y + sa * d); ctx.rotate(s.angle); ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(4, 0); ctx.lineTo(-9, 12); ctx.strokeStyle = rgba('#ffffff', (1 - q) * (0.3 + 0.5 * p) * k); ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  // Rime Rune: a frozen disc, snowflake in the middle (a share: the outline is blue)
  function rimeTell(ctx, tg, s, p, k, t) { disc(ctx, 'frost', s, p, k, t, tg.id, { glyphMax: 30 }); }
  // Cinder Rune: a ring of fire about the bearer, the flame sign in it
  function cinderTell(ctx, tg, s, p, k, t) { disc(ctx, 'fire', s, p, k, t, tg.id); }
  // Rift Rune: a band of void round the bearer; the quiet middle is left unpainted
  function riftTell(ctx, tg, s, p, k, t) {
    const id = tg.id, ro = s.r, ri = s.r2;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    wash(ctx, '#2a0a4a', (0.14 + 0.24 * p) * k);
    const mid = (ro + ri) / 2;
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + hash(i, id) * 0.3;
      crackLine(ctx, Math.cos(a) * (ri + 8) + s.x, Math.sin(a) * (ri + 8) + s.y, Math.cos(a + 0.12) * (ro - 8) + s.x, Math.sin(a + 0.12) * (ro - 8) + s.y, id + i, k, { ink: '#0c0218', col: '#b078ff', a: 0.4 + 0.5 * p, w: 1.6, jag: 9 });
    }
    const n = Math.round(TAU * mid / 34);
    for (let i = 0; i < n; i++) { const a = i * TAU / n + hash(i, id + 2) * 0.1, d = mid + (hash(i, id + 3) - 0.5) * (ro - ri) * 0.6; voidSpike(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d + 5, (10 + 20 * p) * (0.6 + hash(i, id + 4)), 3.6, (hash(i, id + 5) - 0.5) * 0.6, (0.5 + 0.4 * p) * k); }
    for (const rr of [ro - 4, ri + 4]) { circle(ctx, s.x, s.y, rr, null, rgba(BRASS, 0.45 * k), 1.6); circle(ctx, s.x, s.y, rr + (rr > mid ? -5 : 5), null, rgba('#b078ff', (0.4 + 0.4 * p) * k), 1.4); }
    runes(ctx, s.x, s.y, mid, Math.round(TAU * mid / 50), 5, '#d8b8ff', (0.4 + 0.4 * p) * k, -t * 0.15, id);
    ctx.restore();
  }
  // Storm Rune: a rope of lightning from one bearer to the other, the bolt sign at each end
  function beamTell(ctx, tg, s, p, k, t) {
    if (s.len < 4) return;
    const ca = Math.cos(s.angle), sa = Math.sin(s.angle), step = Math.floor(t * 12);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    wash(ctx, '#ffe45a', (0.08 + 0.14 * p) * k);
    ctx.restore();
    const a = (0.45 + 0.5 * p) * k;
    zig(ctx, s.x, s.y, s.x + ca * s.len, s.y + sa * s.len, step, a, { jag: 17, seg: s.len / 9, w: 3.4 });
    // two thinner arcs weaving round it
    for (let j = 0; j < 2; j++) zig(ctx, s.x + ca * s.len * 0.1, s.y + sa * s.len * 0.1, s.x + ca * s.len * 0.9, s.y + sa * s.len * 0.9, step + 7 + j * 5, a * 0.6, { jag: 26, seg: s.len / 7, w: 1.6, seed: j * 3 });
    glow(ctx, s.x, s.y, 34, '#ffe45a', 0.35 * a); glow(ctx, s.x + ca * s.len, s.y + sa * s.len, 34, '#ffe45a', 0.35 * a);
    glyph(ctx, 'bolt', s.x, s.y, 10, rgba('#fff6b0', a), 2); glyph(ctx, 'bolt', s.x + ca * s.len, s.y + sa * s.len, 10, rgba('#fff6b0', a), 2);
  }
  // Leaping Bolt: the bolt's disc, and a dashed hop from the one before it (from his hands for the first)
  function leapTell(ctx, tg, s, p, k, t, env) {
    disc(ctx, 'bolt', s, p, k, t, tg.id, { glyphMax: 24 });
    if (!tg._prev && tg._prev !== null) {
      let best = null;
      if (env.tgs) for (const o of env.tgs.values()) if (o !== tg && o.tag === tg.tag && o.live && o.live.kind === 'circle' && o.live.r === s.r && o.start + o.dur < tg.start + tg.dur - 0.3 && (!best || o.start + o.dur > best.start + best.dur)) best = o;
      tg._prev = best;
    }
    const from = tg._prev ? tg._prev.live : { x: 0, y: -40 };
    const mx = (from.x + s.x) / 2, my = (from.y + s.y) / 2 - 70 - Math.hypot(s.x - from.x, s.y - from.y) * 0.18;
    ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
    ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo(mx, my, s.x, s.y);
    ctx.strokeStyle = rgba('#ffe45a', 0.25 * k); ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = rgba('#fff6b0', (0.4 + 0.5 * p) * k); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.setLineDash([]);
    const ex = s.x - mx, ey = s.y - my, ea = Math.atan2(ey, ex);
    ctx.translate(s.x - Math.cos(ea) * (s.r + 6), s.y - Math.sin(ea) * (s.r + 6)); ctx.rotate(ea);
    ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(4, 0); ctx.lineTo(-12, 9); ctx.strokeStyle = rgba('#fff6b0', (0.5 + 0.4 * p) * k); ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // Void Rifts: the floor cracking open round a dark mouth, shards leaning up out of it
  function riftsTell(ctx, tg, s, p, k, t) {
    disc(ctx, 'void', s, p, k, t, tg.id, { glyphMax: 20 });
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    for (let i = 0; i < 12; i++) { const u = (t * 0.5 + hash(i, tg.id + 8)) % 1, a = hash(i, tg.id + 9) * TAU, d = s.r * (0.9 - 0.7 * u); circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 2 + 3 * (1 - u), rgba('#10041e', 0.6 * k), rgba('#b078ff', (0.3 + 0.4 * p) * k), 1.2); }
    ctx.restore();
  }
  // the four discs of the Convergence: each the same disc as its own move, larger, brass-ringed
  const convTell = el => (ctx, tg, s, p, k, t) => disc(ctx, el, s, p, k, t, tg.id, { glyphMax: 40 });
  // Arcane Mark (Hard): the hero's own element rising where they stood
  function markTell(ctx, tg, s, p, k, t) {
    const el = parse(tg.tag)[1] || 'fire', Q = P[el];
    disc(ctx, el, s, p, k, t, tg.id, { glyph: false });
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * (0.2 + 0.7 * q), null, rgba(Q.col, 0.5 * (1 - q) * k), 2); }
    glow(ctx, s.x, s.y - 20 - 14 * p, 34 + 14 * p, Q.glow, (0.2 + 0.4 * p) * k);
    glyph(ctx, el, s.x, s.y - 4 - 6 * Math.sin(t * 3), 20 + 8 * p, rgba(Q.mid, (0.55 + 0.4 * p) * k), 2.6);
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    const gr = ctx.createLinearGradient(0, s.y - 150, 0, s.y); gr.addColorStop(0, rgba(Q.glow, 0)); gr.addColorStop(1, rgba(Q.glow, (0.12 + 0.2 * p) * k)); ctx.fillStyle = gr; ctx.fillRect(s.x - s.r * 0.5, s.y - 150, s.r, 150);
    ctx.restore();
  }
  // two elements meeting: a swirl of both. The Convergence lens (a rect across two circles) is a wash from one colour to the other
  // with a white-hot seam down its middle
  function reactTell(ctx, tg, s, p, k, t) {
    const [, e1, e2] = parse(tg.tag), c1 = COL[e1] || '#ffffff', c2 = COL[e2] || '#ffffff', id = tg.id;
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    if (s.kind === 'rect') {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), nx = -sa, ny = ca, mx = s.x + ca * s.len / 2, my = s.y + sa * s.len / 2;
      const g = ctx.createLinearGradient(mx + nx * s.w / 2, my + ny * s.w / 2, mx - nx * s.w / 2, my - ny * s.w / 2);
      g.addColorStop(0, rgba(c1, (0.18 + 0.3 * p) * k)); g.addColorStop(0.5, rgba('#ffffff', (0.14 + 0.3 * p) * k)); g.addColorStop(1, rgba(c2, (0.18 + 0.3 * p) * k));
      ctx.fillStyle = g; ctx.fillRect(mx - 200, my - 200, 400, 400);
      for (let i = 0; i < 16; i++) { const u = (t * 0.7 + hash(i, id)) % 1, a = s.len * hash(i, id + 1), v = (hash(i, id + 2) - 0.5) * s.w * 0.8; glow(ctx, s.x + ca * a + nx * v, s.y + sa * a + ny * v - u * 34, 8 + 6 * p, i % 2 ? c1 : c2, (0.25 + 0.45 * p) * k * (1 - u)); if (i % 4 === 0) circle(ctx, s.x + ca * a + nx * v, s.y + sa * a + ny * v - u * 34, 2, rgba('#ffffff', (0.6 * (1 - u)) * k)); }
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ffffff', (0.3 + 0.5 * p) * k); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + ca * 8, s.y + sa * 8); ctx.lineTo(s.x + ca * (s.len - 8), s.y + sa * (s.len - 8)); ctx.stroke();
    } else {
      wash(ctx, mix2(c1, c2, 0.5), (0.1 + 0.2 * p) * k);
      for (const q of pts(s, 22, id)) {
        const u = (t * 0.7 + hash(q.i, 7)) % 1;
        glow(ctx, q.x + Math.sin(t * 3 + q.i) * 6, q.y - u * 30, 10 + 8 * p, q.i % 2 ? c1 : c2, (0.2 + 0.4 * p) * k * (1 - u));
        if (q.i % 5 === 0) circle(ctx, q.x, q.y, 2.2, rgba('#ffffff', (0.4 + 0.4 * p) * k));
      }
      for (let i = 0; i < 2; i++) { const a = t * 1.4 + i * Math.PI; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.55, a, a + 1.6); ctx.strokeStyle = rgba(i ? c1 : c2, (0.4 + 0.4 * p) * k); ctx.lineWidth = 3; ctx.stroke(); }
      circle(ctx, s.x, s.y, s.r * 0.25 * (0.6 + 0.6 * p), rgba('#ffffff', 0.25 * k));
    }
    ctx.restore();
  }
  // the working's pulses: a ripple of the tower's water, rune marks drifting up through it
  function pulseTell(ctx, tg, s, p, k, t) {
    ctx.save(); SHAPES.trace(ctx, s); ctx.clip();
    glow(ctx, s.x, s.y, s.r * 1.1, WATER, (0.14 + 0.3 * p) * k);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; circle(ctx, s.x, s.y, s.r * (0.15 + 0.8 * q), null, rgba('#bff8f0', 0.55 * (1 - q) * k), 2.2); }
    ctx.restore();
    brassRing(ctx, s.x, s.y, s.r - 3, 'water', (0.6 + 0.3 * p) * k, t, { seed: tg.id });
    for (let i = 0; i < 6; i++) { const u = (t * 0.8 + hash(i, tg.id)) % 1, a = hash(i, tg.id + 1) * TAU, d = hash(i, tg.id + 2) * s.r * 0.7; circle(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - u * 22, 2 + 3 * u, null, rgba('#bff8f0', 0.6 * (1 - u) * k), 1.4); }
  }
  // Counterspell (Hard): the echo of the last spell. A pale-violet double of its outline, brass runes turning at its middle, and a comet
  // thrown across the room from where the spell first fell (the mirror of this spot) in the first part of the wait
  function echoTell(ctx, tg, s, p, k, t) {
    const ca = s.kind === 'rect' ? Math.cos(s.angle) : 0, sa = s.kind === 'rect' ? Math.sin(s.angle) : 0;
    const cx = s.kind === 'rect' ? s.x + ca * s.len / 2 : s.x, cy = s.kind === 'rect' ? s.y + sa * s.len / 2 : s.y, sx = -cx, sy = -cy;
    ctx.save(); ctx.lineJoin = 'round';
    SHAPES.trace(ctx, s); ctx.setLineDash([6, 8]); ctx.lineDashOffset = t * 26;
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#c8a0ff', (0.3 + 0.35 * Math.sin(t * 5) * 0.5 + 0.2) * k); ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    const q = clamp(p / 0.4, 0, 1);
    if (q < 1) {
      const qq = easeOut(q), hx = sx + (cx - sx) * qq, hy = sy + (cy - sy) * qq, tx = sx + (cx - sx) * Math.max(0, qq - 0.25), ty = sy + (cy - sy) * Math.max(0, qq - 0.25);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.strokeStyle = rgba('#c8a0ff', 0.5 * (1 - q) * k); ctx.lineWidth = 12; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.8 * (1 - q) * k); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      glow(ctx, hx, hy, 26, '#c8a0ff', 0.8 * (1 - q) * k);
      glyph(ctx, 'void', sx, sy, 14, rgba('#c8a0ff', 0.7 * (1 - q) * k), 2);
    }
    const rr = Math.min(s.r || 70, 70);
    runes(ctx, cx, cy, rr * 0.6, 8, 5, '#e0d0ff', (0.4 + 0.3 * p) * k, t * 0.9, tg.id);
    circle(ctx, cx, cy, rr * 0.34 * (0.7 + 0.3 * Math.sin(t * 4)), null, rgba(BRASS, 0.5 * k), 1.6);
  }

  const GROUND = {
    pyre: pyreTell, cinder: cinderTell, convFire: convTell('fire'),
    lances: lancesTell, rime: rimeTell, convFrost: convTell('frost'),
    leap: leapTell, convBolt: convTell('bolt'),
    rifts: riftsTell, rift: riftTell, convVoid: convTell('void'),
    azBeam: beamTell, azMark: markTell, azReact: reactTell, azPulse: pulseTell,
  };
  const mk = base => ({
    ground(ctx, tg, s, p, k, t, env) {
      const g = GROUND[moveOf(tg, s)];
      if (g) g(ctx, tg, s, p, k, t, env);
      if (tg.color === 'echo') echoTell(ctx, tg, s, p, k, t);
      if (g || tg.color === 'echo') lockCue(ctx, tg, s, p, k, t);
    },
  });
  const TELLS = {
    azFire: mk(), azFrost: mk(), azBolt: mk(), azVoid: mk(), azBeam: mk(), azMark: mk(), azReact: mk(), azPulse: mk(),
    // Arcane Burst / the failed binding: the room rings
    azBurst: { raidwide: true, ground: burstTell },
    azSurge: { raidwide: true, ground(ctx, tg, s, p, k, t, env) { const R = ARENA.R, b = env.boss || { x: 0, y: 0 }; ctx.save(); ctx.fillStyle = `rgba(20,10,40,${(0.05 + 0.18 * p) * k})`; ctx.fillRect(-R - 80, -R - 80, R * 2 + 160, R * 2 + 160); ctx.restore(); for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; ellipse(ctx, b.x, b.y, 50 + q * R, (50 + q * R) * 0.92, 0, null, rgba('#c8a0ff', 0.3 * (1 - q) * k), 3); } } },
  };
  const tell = tag => TELLS[parse(tag)[0]] || null;
  // the Arcane Lance is drawn by the generic buster tell in boss-tells.js, which hands it over to us
  const lance = lanceTell;

  // ---------------------------------------------------------------- screen feel, the sigil stamp and the whiff (all cosmetic)
  // The camera holds for a beat when something big lands (the existing hook: main.js FX.cam), never more than once in a couple of
  // seconds; a flash in the colour of the element for your own view only.
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const AS = { camAt: -99, whiffAt: new Map(), once: new Set() };
  function feel(stop, punch, dur, gap, flashCol, flashA) {
    const t = nowS(); if (t - AS.camAt < gap) return; AS.camAt = t;
    try { if (typeof FX !== 'undefined' && FX.cam) { if (stop) FX.cam.stop(stop); FX.cam.punch(punch, dur); if (flashCol) FX.cam.flash(flashCol, flashA || 0.18, 0.32); } } catch (e) { /* cosmetic */ }
  }
  const onceAt = key => { if (AS.once.has(key)) return false; if (AS.once.size > 200) AS.once.clear(); AS.once.add(key); return true; };
  const ELM = { pyre: 'fire', cinder: 'fire', convFire: 'fire', lances: 'frost', rime: 'frost', convFrost: 'frost', leap: 'bolt', convBolt: 'bolt', azBeam: 'bolt', rifts: 'void', rift: 'void', convVoid: 'void' };
  const ECHO_COL = '#c8a0ff';
  // the colour a shape's landing is in (the element of the move; a lens is the mix of its two; an echo is pale violet)
  function colOf(tg, s) {
    if (tg.color === 'echo') return ECHO_COL;
    const [base, e1, e2] = parse(tg.tag);
    if (base === 'azReact') return mix2(COL[e1] || '#ffffff', COL[e2] || '#ffffff', 0.5);
    if (base === 'azMark') return (P[e1] || P.fire).col;
    if (base === 'azPulse') return WATER;
    const el = ELM[moveOf(tg, s)];
    return el ? P[el].col : '#9af0ff';
  }
  // the sigil slams onto the floor where a blow lands: a brass ring and the element's rune marks opening out and fading, its sign
  // flashing in the middle. The tower's own hand on every landing; it sits inside the area that just hit.
  function stamp(x, y, r, el, o = {}) {
    const Q = P[el] || null, col = o.col || (Q ? Q.col : '#9af0ff'), hot = o.hot || (Q ? Q.hot : '#ffffff'), dir = o.dir || 1, seed = (Math.abs(x) * 7 + Math.abs(y) * 3) | 0;
    VFX.fx({ dur: o.dur || 0.75, layer: 'ground', draw: (c, p, t, e) => {
      const a = e.a * Math.pow(1 - p, 1.5), q = easeOut(Math.min(1, p / 0.4));
      c.save(); c.globalCompositeOperation = 'lighter';
      circle(c, x, y, r * (0.55 + 0.7 * q), null, rgba(col, 0.8 * a), 2.5 + 4 * (1 - p));
      circle(c, x, y, r * (0.42 + 0.55 * q), null, rgba(BRASS, 0.7 * a), 1.6);
      glow(c, x, y, r * 0.7, col, 0.4 * a * (1 - q * 0.5));
      c.restore();
      runes(c, x, y, r * (0.5 + 0.55 * q), Math.max(8, Math.round(r / 7)), 6, hot, 0.9 * a, dir * t * 2.4, seed);
      if (Q && !o.noGlyph) glyph(c, el, x, y, r * 0.3 * (1.5 - 0.5 * q), rgba(hot, 0.9 * a), 3);
    } });
  }
  // a beam of the element drawn from a point to another and gone: the working running between sigils
  function beamFx(x1, y1, x2, y2, col, w = 7, dur = 0.5) {
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p), reach = easeOut(Math.min(1, p / 0.3));
      const ex = x1 + (x2 - x1) * reach, ey = y1 + (y2 - y1) * reach;
      c.save();
      VFX.neonPath(c, col, w * (1 - p * 0.5), k, () => { c.moveTo(x1, y1 - 6); c.lineTo(ex, ey - 6); });
      VFX.neonPath(c, '#ffffff', w * 0.35, k, () => { c.moveTo(x1, y1 - 6); c.lineTo(ex, ey - 6); });
      c.restore();
      VFX.glowAt(c, ex, ey - 6, 26 + 20 * (1 - p), col, 0.7 * k);
    } });
  }
  // which way is "away from the blow" for a hero standing just outside a shape
  function awayFrom(s, u) {
    if (s.kind === 'rect') {
      const c = Math.cos(s.angle), sn = Math.sin(s.angle), across = -(u.x - s.x) * sn + (u.y - s.y) * c, sg = across >= 0 ? 1 : -1;
      return { x: -sn * sg, y: c * sg };
    }
    const dx = u.x - s.x, dy = u.y - s.y, d = Math.hypot(dx, dy) || 1, sg = s.kind === 'donut' && d < s.r2 ? -1 : 1;   // (in a ring's hole, away from the blow is inward)
    return { x: sg * dx / d, y: sg * dy / d };
  }
  // THE WHIFF: a hero who stood just outside a blow when it landed (and was not hit) feels its edge go by: a streak of the element
  // along the edge a stride in front of them, a small rune ring at their feet, sparks, and for your own hero a faint flash, a push
  // of the camera and a soft whoosh. Only ever drawn for a hero the blow did not hit and was close to: a reward, never a hint.
  function whiff(u, s, col, mine, echo) {
    const a = awayFrom(s, u), tx = -a.y, ty = a.x, ex = u.x - a.x * 34, ey = u.y - a.y * 34 - 14;
    VFX.fx({ dur: 0.34, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p) * (1 - p), L = 40 + 62 * easeOut(Math.min(1, p / 0.5)), sh = (p - 0.2) * 40;
      c.save();
      VFX.neonPath(c, col, 4.5 * (1 - p * 0.6), k, () => { c.moveTo(ex - tx * L + a.x * sh, ey - ty * L + a.y * sh); c.lineTo(ex + tx * L + a.x * sh, ey + ty * L + a.y * sh); });
      VFX.neonPath(c, '#ffffff', 2, k * 0.8, () => { c.moveTo(ex - tx * L * 0.5 + a.x * sh, ey - ty * L * 0.5 + a.y * sh); c.lineTo(ex + tx * L * 0.5 + a.x * sh, ey + ty * L * 0.5 + a.y * sh); });
      c.restore();
    } });
    stamp(u.x, u.y + 6, 40, null, { col, hot: '#ffffff', dur: 0.5, dir: echo ? -1 : 1 });
    VFX.sparks(u.x - a.x * 18, u.y - 10, { color: col, n: mine ? 12 : 7, speed: 300, angle: Math.atan2(a.y, a.x), spread: 0.9, up: 80, life: 0.9 });
    if (mine) {
      try {
        if (typeof FX !== 'undefined' && FX.cam) { FX.cam.flash(col, 0.09, 0.18); FX.cam.punch(0.018, 0.32); }
        if (typeof Sound !== 'undefined' && Sound.play) Sound.play('dash', { vol: 0.3, rate: 1.25, key: 'az-whiff', minGap: 0.3 });
      } catch (e) { /* cosmetic */ }
    }
  }
  const NEAR = 80;   // a hero this close to the edge of a blow (and not hit) gets the whiff
  function whiffs(tg, msg, ctx) {
    if (!ctx || !ctx.units || !msg) return;
    if (tg.type === 'raidwide' || tg.type === 'buster' || tg.type === 'stack' || tg.type === 'tower' || tg.type === 'safe') return;
    const s = tg.live; if (!s || (s.kind !== 'circle' && s.kind !== 'donut' && s.kind !== 'rect')) return;
    if ((s.kind === 'rect' && s.len < 40) || (s.kind !== 'rect' && !(s.r > 40))) return;
    const hits = msg.hits || [], t = nowS(), col = colOf(tg, s), echo = tg.color === 'echo';
    for (const u of ctx.units) {
      if (hits.includes(u.id)) continue;
      if (t - (AS.whiffAt.get(u.id) || -9) < 0.7) continue;
      if (SHAPES.contains(s, u.x, u.y)) continue;   // inside and not hit: covered or shielded, not a dodge
      if (!SHAPES.contains(s, u.x, u.y, NEAR)) continue;
      AS.whiffAt.set(u.id, t);
      whiff(u, s, col, typeof Net !== 'undefined' && u.id === Net.id, echo);
    }
  }
  // the last beat of a wait, inside the area that is about to go: a ring of the element closing on the middle (or sweeping in from
  // the rim of a band) and landing at the instant the blow does, a spearhead of light running down a line. It sits wholly inside the
  // red; it times the landing, it never paints anything safe.
  function lockCue(ctx, tg, s, p, k, t) {
    if (p < 0.7 || !(k > 0)) return;
    const u = (p - 0.7) / 0.3, col = colOf(tg, s), a = (0.2 + 0.6 * u) * k;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    if (s.kind === 'circle' && s.r > 40) {
      SHAPES.trace(ctx, s); ctx.clip();
      const rr = s.r * (1 - 0.94 * u);
      circle(ctx, s.x, s.y, rr, null, rgba(col, a * 0.8), 3 + 4 * u);
      circle(ctx, s.x, s.y, rr, null, rgba('#ffffff', a * 0.9), 1.4);
    } else if (s.kind === 'donut') {
      SHAPES.trace(ctx, s); ctx.clip();
      const rr = s.r - (s.r - s.r2) * u;
      circle(ctx, s.x, s.y, rr, null, rgba(col, a * 0.8), 3 + 3 * u);
      circle(ctx, s.x, s.y, rr, null, rgba('#ffffff', a * 0.9), 1.4);
    } else if (s.kind === 'rect' && s.len > 100) {
      SHAPES.trace(ctx, s); ctx.clip();
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), d = 40 + (s.len - 60) * easeOut(u), hx = s.x + ca * d, hy = s.y + sa * d;
      ctx.beginPath(); ctx.moveTo(s.x + ca * Math.max(0, d - 120), s.y + sa * Math.max(0, d - 120)); ctx.lineTo(hx, hy);
      ctx.strokeStyle = rgba(col, a * 0.7); ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 2.4; ctx.stroke();
      glow(ctx, hx, hy, 34, col, 0.7 * a);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- impacts (boss-vfx.js impact() hands every tag of his over)
  // standing things that burst up out of the floor and die down: items = [{ x, y, h, w, lean, at, ph }]
  function eruptItems(el, items, dur = 1.0) {
    items.sort((a, b) => a.y - b.y);
    const Q = P[el];
    VFX.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      c.save();
      for (const it of items) {
        const u = t - (it.at || 0); if (u < 0) continue;
        const fade = clamp((dur - (it.at || 0) - u) / 0.45, 0, 1), a = e.a * fade;
        if (a <= 0.01) continue;
        const grow = easeOut(Math.min(1, u / 0.14));
        if (el === 'fire') { VFX.glowAt(c, it.x, it.y - it.h * 0.3, it.w * 3.4, Q.glow, 0.5 * a); flame(c, it.x, it.y, it.h * grow * (0.55 + 0.45 * fade), it.w, t, a, it.ph || 0); }
        else if (el === 'frost') { VFX.glowAt(c, it.x, it.y - it.h * 0.3, it.w * 3, Q.glow, 0.4 * a); crystal(c, it.x, it.y, it.h * grow, it.w * 0.9, it.lean || 0, a); }
        else if (el === 'void') voidSpike(c, it.x, it.y, it.h * grow, it.w, it.lean || 0, a);
        else if (u < 0.4) { const fl = Math.floor(t * 30); zig(c, it.x + (it.lean || 0) * 160, it.y - it.h * 1.7, it.x, it.y, fl + (it.ph | 0), a * (1 - u / 0.4) * (hash(fl, it.ph || 0) > 0.25 ? 1 : 0.35), { jag: 14, seg: 24, w: 2.6 }); VFX.glowAt(c, it.x, it.y, it.w * 3.2, Q.glow, 0.6 * a * (1 - u / 0.4)); }
      }
      c.restore();
    }, done: () => { if (el === 'frost') for (const it of items) if (Math.random() < 0.6) VFX.spawn({ x: it.x, y: it.y, z: it.h * 0.4, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 80, vz: 40 + Math.random() * 90, g: 400, life: 0.5, size: 9, color: '#9fe0ff', kind: 'shard', add: false, vr: (Math.random() - 0.5) * 12 }); } });
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  // random standing things inside a circle (the first is the tall one at the middle)
  function erupt(el, x, y, r, n, o = {}) {
    const items = Array.from({ length: n }, (_, i) => { const a = Math.random() * TAU, d = (i === 0 ? 0 : Math.sqrt(Math.random())) * r; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, h: (i === 0 ? 1.5 : 0.7 + Math.random() * 0.6) * (o.h ?? 70), w: (o.w ?? 10) * (0.85 + Math.random() * 0.5), at: Math.random() * 0.16, lean: (Math.random() - 0.5) * 0.5, ph: Math.random() * 6 }; });
    eruptItems(el, items, o.dur ?? 1.0);
  }
  // a bold burst at a point: spiked shape with the element's ink edge and hot core, a ring, sparks
  function burstAt(el, x, y, r, o = {}) {
    const Q = P[el];
    VFX.spikeburst(x, y, { r, n: o.n ?? 14, color: Q.mid, core: Q.hot, ink: Q.ink, dur: o.dur ?? 0.45, z: o.z ?? 6 });
    VFX.flash(x, y - 10, r * 1.3, Q.glow, 0.25);
  }
  // pieces of the room for the bigger moves
  function ringShock(H, x, y, r, col, w = 6, r0 = 0) { H.shockAt(x, y, { r, r0, color: col, w, dur: 0.5, flat: 1 }); }
  let lastBolt = null;   // where the last Leaping Bolt came down (the next one's arc starts there)

  function impact(tg, ctx, H, msg) {
    const s = tg.live, [base, e1, e2] = parse(tg.tag);
    try { whiffs(tg, msg, ctx); } catch (e) { /* cosmetic */ }
    if (tg.type === 'buster') {
      const e = tg.target != null ? ctx.entById(tg.target) : null, x = e ? e.x : s.x + Math.cos(s.angle) * 160, y = e ? e.y : s.y + Math.sin(s.angle) * 160;
      // a spear of arcane light thrown from his staff, and a spiked blue burst where it lands
      const d = Math.hypot(x - s.x, y - s.y) || 1, ax = (x - s.x) / d, ay = (y - s.y) / d;
      VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, o) => {
        const q = easeOut(Math.min(1, p / 0.16)), k = o.a * Math.min(1, (1 - p) / 0.5), L = d * q;
        c.save();
        VFX.neonPath(c, '#7fd8ff', 9 * (1 - p * 0.5), k, () => { c.moveTo(s.x + ax * 40, s.y - 14 + ay * 40); c.lineTo(s.x + ax * L, s.y - 14 + ay * L); });
        poly(c, [s.x + ax * L - ay * 14, s.y - 14 + ay * L + ax * 14, s.x + ax * (L + 36), s.y - 14 + ay * (L + 36), s.x + ax * L + ay * 14, s.y - 14 + ay * L - ax * 14], rgba('#e8faff', k), rgba('#06182e', k), 2);
        c.restore();
      } });
      H.shapeFlash(s, '#9af0ff', { a: 0.26 });
      burstAt('arc', x, y, 110, { n: 14, dur: 0.55 });
      erupt('frost', x, y, 54, 7, { h: 74, w: 9, dur: 0.9 });
      VFX.sparks(x, y, { color: '#d8f6ff', n: 10, speed: 380 });
      H.shockAt(x, y, { r: 120, color: '#9af0ff', w: 6, flat: 1 }); H.shake(9);
      stamp(x, y, 84, 'frost', { col: '#9af0ff', dur: 0.8 });
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.random() * 0.4; beamFx(x, y, x + Math.cos(a) * 120, y + Math.sin(a) * 120, '#bfeaff', 3.5, 0.35); }
      feel(0.05, 0.028, 0.4, 2.2, '#bfeaff', 0.1);
      return;
    }
    if (base === 'azBurst') {
      H.roomTint('#bfeaff', 0.2, 0.7);
      burstAt('arc', 0, 0, 230, { n: 16, dur: 0.6, z: 10 });
      for (const [r, d] of [[352, 0], [520, 0.08]]) H.after(d, () => ringShock(H, 0, 0, r, '#9af0ff', 8));
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + Math.random() * 0.2; VFX.sparks(Math.cos(a) * 170, Math.sin(a) * 170, { color: '#d8f6ff', n: 3, speed: 240 }); }
      stamp(0, 0, 200, null, { col: '#9af0ff', hot: '#ffffff', dur: 0.9 });
      VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => { const k = e.a * (1 - p); c.save(); c.globalCompositeOperation = 'lighter'; hexStar(c, 0, -14, 90 + 380 * easeOut(p), rgba('#d8f6ff', 0.8 * k), 3 + 3 * (1 - p), t * 2); hexStar(c, 0, -14, 60 + 240 * easeOut(p), rgba('#ffffff', 0.7 * k), 1.6, -t * 2.6); c.restore(); } });
      feel(0.05, 0.03, 0.45, 2.2, '#bfeaff', 0.16);
      H.shake(8); return;
    }
    if (base === 'azSurge') {
      H.roomTint('#a05aff', 0.22, 0.8);
      for (const el of ELS) { burstAt(el, AZ.SIG[el][0], AZ.SIG[el][1], 140, { n: 12 }); stamp(AZ.SIG[el][0], AZ.SIG[el][1], 150, el, { dur: 0.9 }); beamFx(AZ.SIG[el][0], AZ.SIG[el][1], 0, 0, COL[el], 6, 0.6); }
      feel(0.07, 0.035, 0.5, 2.2, '#a05aff', 0.22);
      H.shake(9); return;
    }
    const mv = moveOf(tg, s), echo = tg.color === 'echo';
    if (mv === 'pyre') {
      H.shapeFlash(s, COL.fire, { a: 0.4, dur: 0.6 });
      const ro = Math.min(s.r, ARENA.R + 30), ri = s.kind === 'donut' ? s.r2 : 0;
      const rows = ri ? [ri + 14, (ro + ri) / 2, ro - 14] : [ro * 0.82, ro * 0.5, ro * 0.18], items = [];
      rows.forEach((rr, j) => { const n = Math.max(8, Math.round(TAU * rr / (j === 1 ? 54 : 38))); for (let i = 0; i < n; i++) { const a = i * TAU / n + j * 0.4 + Math.random() * 0.05, x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (ARENA.sd(x, y) > -8) continue; items.push({ x, y: y + 6, h: rnd(38, 86), w: rnd(11, 16), at: Math.random() * 0.18, ph: Math.random() * 6 }); } });
      eruptItems('fire', items, 1.15);
      for (const rr of ri ? [ri, ro] : [ro]) H.shockAt(0, 0, { r: Math.min(rr + 10, ARENA.R + 20), color: '#ffb04a', w: 8, dur: 0.6, flat: 1, clip: 1 });
      for (const q of H.scatter(s, 16)) H.after(Math.random() * 0.3, () => VFX.sparks(q.x, q.y, { color: '#ffd27a', n: 3, speed: 260 }));
      // the fire runs out across the band: a ring of rune marks sweeping from the inner edge to the outer, the heat at its back
      VFX.fx({ dur: 0.7, layer: 'air', draw: (c, p, t, e) => { const q = easeOut(p), rr = ri + (ro - ri) * q, k = e.a * (1 - p); c.save(); ARENA.trace(c, 4); c.clip(); c.globalCompositeOperation = 'lighter'; circle(c, 0, 0, Math.max(4, rr), null, rgba('#ffb04a', 0.7 * k), 5 + 5 * (1 - p)); circle(c, 0, 0, Math.max(4, rr), null, rgba('#fff2c0', 0.8 * k), 1.6); c.restore(); runes(c, 0, 0, Math.max(10, rr - 16), Math.max(10, Math.round(rr / 14)), 6, '#fff2c0', 0.8 * k, t * 3, 4); } });
      feel(0.05, 0.026, 0.4, 2.2, '#ff9a4a', 0.12);
      H.shake(8);
    } else if (mv === 'cinder') {
      H.shapeFlash(s, COL.fire, { a: 0.38, dur: 0.55 });
      burstAt('fire', s.x, s.y, s.r * 1.0, { n: 14 });
      erupt('fire', s.x, s.y, s.r * 0.78, 12, { h: 70, w: 10, dur: 1.0 });
      VFX.pillar(s.x, s.y, { r: s.r * 0.4, h: 220, color: '#ff8a2a', dur: 0.6 });
      ringShock(H, s.x, s.y, s.r * 1.15, '#ffb04a', 7);
      VFX.sparks(s.x, s.y, { color: '#ffd27a', n: 12, speed: 320 }); H.shake(7);
      stamp(s.x, s.y, s.r * 1.05, 'fire');
    } else if (mv === 'lances') {
      H.shapeFlash(s, COL.frost, { a: 0.34, dur: 0.55 }); H.sweep(s, '#e8faff', 0.4);
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), nx = -sa, ny = ca, items = [], L = Math.min(s.len, 640);
      for (let u = 56; u < L; u += 34) { const at = u / L * 0.28; for (let j = 0; j < 2; j++) { const v = (Math.random() - 0.5) * (s.w - 24), big = Math.abs(v) < s.w * 0.18; items.push({ x: s.x + ca * u + nx * v, y: s.y + sa * u + ny * v, h: (big ? rnd(70, 110) : rnd(34, 70)) * (0.8 + 0.4 * (1 - u / L)), w: big ? 12 : 8, lean: (Math.random() - 0.5) * 0.5, at }); } }
      eruptItems('frost', items, 1.2);
      H.shockAt(s.x + ca * L, s.y + sa * L, { r: 70, color: '#bfeaff', w: 5, dur: 0.4, flat: 1 });
      for (let u = 120; u < L; u += 170) stamp(s.x + ca * u, s.y + sa * u, 54, 'frost', { dur: 0.6 });
      beamFx(s.x + ca * 50, s.y + sa * 50, s.x + ca * L, s.y + sa * L, '#e8faff', 6, 0.4);
      feel(0.05, 0.026, 0.4, 2.2, '#bfeaff', 0.1);
      H.shake(8);
    } else if (mv === 'rime') {
      H.shapeFlash(s, COL.frost, { a: 0.36, dur: 0.6 });
      const items = []; const n = Math.round(s.r / 7);
      for (let i = 0; i < n; i++) { const a = i * TAU / n + Math.random() * 0.2, d = s.r * (0.7 + 0.3 * Math.random()); items.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, h: rnd(40, 80), w: rnd(7, 11), lean: Math.cos(a) * 0.3, at: 0.04 + Math.random() * 0.08 }); }
      for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, d = Math.random() * s.r * 0.4; items.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, h: rnd(60, 110), w: rnd(9, 13), lean: (Math.random() - 0.5) * 0.4, at: Math.random() * 0.06 }); }
      eruptItems('frost', items, 1.2);
      burstAt('frost', s.x, s.y, s.r * 0.8, { n: 16, dur: 0.5 });
      ringShock(H, s.x, s.y, s.r * 1.25, '#d8f6ff', 7);
      stamp(s.x, s.y, s.r * 1.05, 'frost', { dur: 0.85 });
      feel(0.06, 0.03, 0.45, 2.2, '#d8f6ff', 0.14);
      H.shake(7);
    } else if (mv === 'leap') {
      H.shapeFlash(s, COL.bolt, { a: 0.3, dur: 0.45 });
      erupt('bolt', s.x, s.y, s.r * 0.5, 3, { h: 90, w: 9, dur: 0.6 });
      burstAt('bolt', s.x, s.y, s.r * 1.05, { n: 12 });
      ringShock(H, s.x, s.y, s.r * 1.3, '#fff6b0', 6);
      if (lastBolt && Math.abs(lastBolt.at - tg.start) < 6 && performance.now() / 1000 - lastBolt.now < 1.6) {
        const a = lastBolt; VFX.fx({ dur: 0.35, layer: 'air', draw: (c, p, t, e) => { zig(c, a.x, a.y - 8, s.x, s.y - 8, Math.floor(t * 30), e.a * (1 - p) * (hash(Math.floor(t * 30), 3) > 0.2 ? 1 : 0.3), { jag: 22, seg: 30, w: 2.6 }); } });
      }
      lastBolt = { x: s.x, y: s.y, at: tg.start, now: performance.now() / 1000 };
      VFX.sparks(s.x, s.y, { color: '#fff6b0', n: 8, speed: 300 }); H.shake(8);
      stamp(s.x, s.y, s.r * 1.1, 'bolt', { dur: 0.6 });
    } else if (mv === 'rifts') {
      H.shapeFlash(s, COL.void, { a: 0.36, dur: 0.6 });
      erupt('void', s.x, s.y, s.r * 0.8, 10, { h: 110, w: 12, dur: 1.1 });
      VFX.swirl(s.x, s.y, { r: s.r * 0.9, color: '#a05aff', dur: 0.7, arms: 3, inward: 1 });
      ringShock(H, s.x, s.y, s.r * 1.2, '#c8a0ff', 6);
      VFX.debris(s.x, s.y, { color: '#1a1226', n: 7, speed: 1.1 }); H.shake(7);
      stamp(s.x, s.y, s.r * 1.05, 'void', { dir: -1 });
    } else if (mv === 'rift') {
      H.shapeFlash(s, COL.void, { a: 0.34, dur: 0.6 });
      const mid = (s.r + s.r2) / 2, items = [], n = Math.round(TAU * mid / 30);
      for (let i = 0; i < n; i++) { const a = i * TAU / n + Math.random() * 0.1, d = mid + (Math.random() - 0.5) * (s.r - s.r2) * 0.7; items.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, h: rnd(50, 110), w: rnd(8, 12), lean: Math.cos(a) * 0.3, at: Math.random() * 0.14 }); }
      eruptItems('void', items.filter(it => ARENA.sd(it.x, it.y) < -8), 1.1);
      H.shockAt(s.x, s.y, { r: s.r, r0: s.r2, color: '#c8a0ff', w: 7, dur: 0.5, flat: 1 });
      VFX.swirl(s.x, s.y, { r: s.r * 0.85, color: '#a05aff', dur: 0.7, arms: 4, inward: 1 }); H.shake(8);
      stamp(s.x, s.y, s.r * 0.85, 'void', { dir: -1 });
    } else if (mv === 'convFire' || mv === 'convFrost' || mv === 'convBolt' || mv === 'convVoid') {
      const el = { convFire: 'fire', convFrost: 'frost', convBolt: 'bolt', convVoid: 'void' }[mv];
      H.shapeFlash(s, COL[el], { a: 0.4, dur: 0.7 });
      burstAt(el, s.x, s.y, s.r * 0.9, { n: 16, dur: 0.6 });
      erupt(el, s.x, s.y, s.r * 0.78, el === 'bolt' ? 7 : 16, { h: 100, w: 12, dur: 1.2 });
      ringShock(H, s.x, s.y, s.r * 1.2, P[el].hot, 8);
      stamp(s.x, s.y, s.r * 1.1, el, { dur: 1.0 });
      beamFx(s.x, s.y, 0, 0, COL[el], 8, 0.6);   // (the sigils answer one another through the middle of the floor)
      if (onceAt('conv' + Math.round(tg.start * 4))) { H.roomTint('#ffffff', 0.12, 0.6); VFX.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => { c.save(); c.globalCompositeOperation = 'lighter'; hexStar(c, 0, -10, 40 + 260 * easeOut(p), rgba('#ffffff', 0.8 * e.a * (1 - p)), 3, t * 2.4); c.restore(); glow(c, 0, -10, 120 * (1 - p * 0.5), '#ffffff', 0.5 * e.a * (1 - p)); } }); }
      feel(0.09, 0.045, 0.55, 3, COL[el], 0.15);
      H.shake(10);
    } else if (base === 'azBeam') {
      H.shapeFlash(s, COL.bolt, { a: 0.3, dur: 0.45 }); H.sweep(s, '#fffbe0', 0.3);
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => { const fl = Math.floor(t * 30), a = e.a * (1 - p) * (hash(fl, 5) > 0.2 ? 1 : 0.4); zig(c, s.x, s.y - 10, s.x + ca * s.len, s.y + sa * s.len - 10, fl, a, { jag: 20, seg: s.len / 9, w: 4 }); zig(c, s.x, s.y - 10, s.x + ca * s.len, s.y + sa * s.len - 10, fl + 11, a * 0.6, { jag: 32, seg: s.len / 7, w: 2 }); } });
      for (const q of H.scatter(s, 8)) VFX.sparks(q.x, q.y, { color: '#fff6b0', n: 3, speed: 280 });
      burstAt('bolt', s.x, s.y, 46); burstAt('bolt', s.x + ca * s.len, s.y + sa * s.len, 46);
      H.shake(8);
    } else if (base === 'azReact') {
      const c1 = COL[e1] || '#ffffff', c2 = COL[e2] || '#ffffff', mid = mix2(c1, c2, 0.5);
      H.shapeFlash(s, mid, { a: 0.4, dur: 0.6 });
      const pts2 = H.scatter(s, 10);
      pts2.forEach((q, i) => H.after(Math.random() * 0.2, () => { burstAt(i % 2 ? e1 : e2, q.x, q.y, 36, { n: 10, dur: 0.35 }); }));
      VFX.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => { const cx = s.kind === 'rect' ? s.x + Math.cos(s.angle) * s.len / 2 : s.x, cy = s.kind === 'rect' ? s.y + Math.sin(s.angle) * s.len / 2 : s.y; VFX.glowAt(c, cx, cy, 70 * (1 - p * 0.4), '#ffffff', e.a * (1 - p) * 0.9); } });
      if (s.kind === 'circle') { ringShock(H, s.x, s.y, s.r * 1.2, mid, 7); stamp(s.x, s.y, s.r * 1.05, null, { col: mid, hot: '#ffffff' }); }
      else { H.sweep(s, '#ffffff', 0.35); const ca = Math.cos(s.angle), sa = Math.sin(s.angle); beamFx(s.x, s.y, s.x + ca * s.len, s.y + sa * s.len, mid, 9, 0.45); }
      feel(0.05, 0.026, 0.4, 2.2, mid, 0.14);
      H.shake(8);
    } else if (base === 'azMark') {
      const Q = P[e1] || P.fire;
      H.shapeFlash(s, '#ffe27a', { a: 0.3 });
      burstAt(e1, s.x, s.y, s.r * 1.0, { n: 14 });
      erupt(e1 in P ? e1 : 'fire', s.x, s.y, s.r * 0.7, 9, { h: 90, w: 11, dur: 1.0 });
      VFX.pillar(s.x, s.y, { r: s.r * 0.5, h: 300, color: Q.col, dur: 0.6 });
      ringShock(H, s.x, s.y, s.r * 1.3, Q.col, 6); H.shake(7);
      stamp(s.x, s.y, s.r * 1.1, e1 in P ? e1 : 'fire', { dur: 0.9 });
      feel(0.06, 0.03, 0.45, 2.2, Q.col, 0.16);
    } else if (base === 'azPulse') {
      H.shapeFlash(s, WATER, { a: 0.3, dur: 0.4 });
      for (let i = 0; i < 3; i++) H.shockAt(s.x, s.y, { r: s.r * (1.1 + i * 0.35), color: '#bff8f0', w: 4, dur: 0.5, flat: 1, delay: i * 0.1 });
      VFX.splash(s.x, s.y, { color: '#6fe8dc', n: 8, speed: 1 }); H.shake(4);
    } else {
      H.shapeFlash(s, P[e1] ? P[e1].col : '#9af0ff', { a: 0.34 });
    }
    if (echo) {
      // the echo of the echo: the shape folds in on itself, a mirror of runes turning the wrong way, pale shards flung out
      const er = Math.min(s.r || 90, 200), ex = s.kind === 'rect' ? s.x + Math.cos(s.angle) * s.len / 2 : s.x, ey = s.kind === 'rect' ? s.y + Math.sin(s.angle) * s.len / 2 : s.y;
      ringShock(H, ex, ey, er * 1.1, ECHO_COL, 5); VFX.sparks(ex, ey, { color: '#e0d0ff', n: 10, speed: 280 });
      stamp(ex, ey, Math.max(46, er * 0.9), 'void', { col: ECHO_COL, hot: '#f2e8ff', dir: -1, dur: 0.8 });
      VFX.swirl(ex, ey, { r: Math.max(50, er * 0.8), color: ECHO_COL, dur: 0.6, arms: 3, inward: 1 });
      for (let i = 0; i < 5; i++) { const a = Math.random() * TAU; VFX.spawn({ x: ex, y: ey, z: 6, vx: Math.cos(a) * 130, vy: Math.sin(a) * 90, vz: 120 + Math.random() * 160, g: 480, life: 0.7, size: 8, color: '#e0d0ff', kind: 'shard', add: true, vr: (Math.random() - 0.5) * 10 }); }
      feel(0.04, 0.022, 0.4, 2.2, ECHO_COL, 0.12);
    }
  }

  // ---------------------------------------------------------------- aftermath (boss-tells.js track() asks once per landed mechanic)
  // what stays on the floor for a few seconds: a quiet decal, cooling, never louder than the warning was
  function aftermath(tg, env, A) {
    const { mark, AFTER } = A, T = AFTER.tier, s = tg.live, [base, e1, e2] = parse(tg.tag);
    if (tg.type === 'buster') {
      const e = tg.target != null && env.entById ? env.entById(tg.target) : null, L = e ? Math.hypot(e.x - s.x, e.y - s.y) : s.r * 0.7, a = s.angle, sx = s.x, sy = s.y, ex = sx + Math.cos(a) * L, ey = sy + Math.sin(a) * L;
      mark(T.short, { kind: 'circle', x: ex, y: ey, r: 0 }, (ctx, q, k, age, seed) => {
        crackLine(ctx, sx + Math.cos(a) * 50, sy + Math.sin(a) * 50, ex, ey, seed, k, { w: 2.6, jag: 12, seg: 26, col: '#bfeaff' });
        for (let i = 0; i < 5; i++) { const u = 0.2 + 0.7 * hash(i, seed + 3), px = sx + (ex - sx) * u, py = sy + (ey - sy) * u, side = i % 2 ? 1 : -1; crackLine(ctx, px, py, px - Math.sin(a) * side * (20 + 18 * hash(i, seed + 4)), py + Math.cos(a) * side * (20 + 18 * hash(i, seed + 4)), seed + i, k, { w: 1.6, jag: 5, seg: 12 }); }
        circle(ctx, ex, ey, 40, rgba('#bfeaff', 0.14 * k), rgba('#e8faff', 0.5 * k), 1.6);
        for (let i = 0; i < 6; i++) { const aa = i * TAU / 6 + seed; poly(ctx, [ex + Math.cos(aa) * 8, ey + Math.sin(aa) * 8, ex + Math.cos(aa + 0.2) * 26, ey + Math.sin(aa + 0.2) * 26, ex + Math.cos(aa - 0.2) * 26, ey + Math.sin(aa - 0.2) * 26], rgba('#e8faff', 0.5 * k), rgba('#06182e', 0.6 * k), 1); }
      }, tg.id);
      return;
    }
    if (base === 'azBurst') {
      mark(T.brief, { kind: 'circle', x: 0, y: 0, r: 0 }, (ctx, q, k, age, seed) => { for (const R of [170, 350]) { circle(ctx, 0, 0, R, null, rgba('#bff0ff', 0.55 * k), 2.4); runes(ctx, 0, 0, R - 12, R > 300 ? 52 : 26, 4.5, '#9af0ff', 0.55 * k, age * 0.2, seed); } hexStar(ctx, 0, 0, 140, rgba('#bff0ff', 0.3 * k), 1.6, age * 0.3); }, tg.id);
      return;
    }
    if (base === 'azSurge') return;
    const mv = moveOf(tg, s);
    if (mv === 'pyre') {
      const ro = Math.min(s.r, ARENA.R + 30), ri = s.kind === 'donut' ? s.r2 : 0;
      mark(T.short, s, (ctx, q, k, age, seed) => {
        const heat = Math.max(0, 1 - age / 3.2);
        ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
        for (const rr of ri ? [ri + 10, ro - 10] : [ro - 10]) {
          circle(ctx, 0, 0, rr, null, rgba('#140804', 0.34 * k), 22);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, 0, 0, rr, null, rgba('#ff6a1a', 0.5 * k * (0.35 + heat)), 3.4); circle(ctx, 0, 0, rr, null, rgba('#ffd27a', 0.45 * k * heat), 1.2); ctx.restore();
          const n = Math.round(TAU * rr / 30);
          for (let i = 0; i < n; i++) { const a = i * TAU / n + hash(i, seed) * 0.05, h = 7 + 9 * hash(i, seed + 1); poly(ctx, [Math.cos(a - 0.012) * rr, Math.sin(a - 0.012) * rr, Math.cos(a) * (rr + h), Math.sin(a) * (rr + h), Math.cos(a + 0.012) * rr, Math.sin(a + 0.012) * rr], rgba(i % 3 ? '#ff7a1a' : '#ffd27a', (0.4 + 0.5 * heat) * k), rgba('#2a0e06', 0.7 * k), 1); }
        }
        ctx.restore();
      }, tg.id);
    } else if (mv === 'cinder') {
      mark(T.short, s, (ctx, q, k, age, seed) => {
        const heat = Math.max(0, 1 - age / 3), r = q.r;
        circle(ctx, q.x, q.y, r, rgba('#140804', 0.2 * k), rgba('#2a0e06', 0.5 * k), 2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, q.x, q.y, r - 4, null, rgba('#ff6a1a', 0.55 * k * (0.35 + heat)), 3); ctx.restore();
        const n = 20; for (let i = 0; i < n; i++) { const a = i * TAU / n + seed, h = 6 + 8 * hash(i, seed); poly(ctx, [q.x + Math.cos(a - 0.04) * r, q.y + Math.sin(a - 0.04) * r, q.x + Math.cos(a) * (r + h), q.y + Math.sin(a) * (r + h), q.x + Math.cos(a + 0.04) * r, q.y + Math.sin(a + 0.04) * r], rgba(i % 3 ? '#ff7a1a' : '#ffd27a', (0.4 + 0.5 * heat) * k), rgba('#2a0e06', 0.6 * k), 1); }
        glyph(ctx, 'fire', q.x, q.y, 16, rgba('#ff8a2a', (0.3 + 0.5 * heat) * k), 2);
        for (let i = 0; i < 6; i++) { const a = hash(i, seed + 2) * TAU, d = hash(i, seed + 3) * r * 0.8; glow(ctx, q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, 5, '#ff8a2a', 0.6 * k * heat * (0.5 + 0.5 * Math.sin(age * 6 + i))); }
      }, tg.id);
    } else if (mv === 'lances') {
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle), L = Math.min(s.len, 640);
      mark(T.short, s, (ctx, q, k, age, seed) => {
        const melt = Math.min(1, age / 4.5);
        for (let u = 80; u < L; u += 56) for (let j = 0; j < 3; j++) {
          const v = (hash(u + j, seed) - 0.5) * (q.w - 24), px = q.x + ca * (u + 14 * hash(j, seed + 1)) - sa * v, py = q.y + sa * (u + 14 * hash(j, seed + 1)) + ca * v, sz = (6 + 9 * hash(u + j, seed + 2)) * (1 - melt * 0.5), a = hash(u + j, seed + 3) * TAU;
          poly(ctx, [px + Math.cos(a) * sz, py + Math.sin(a) * sz * 0.7, px + Math.cos(a + 2.1) * sz * 0.7, py + Math.sin(a + 2.1) * sz * 0.5, px + Math.cos(a + 3.9) * sz, py + Math.sin(a + 3.9) * sz * 0.7], rgba('#dff4ff', 0.95 * k), rgba('#082033', 0.8 * k), 1.4);
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#9fe0ff', 0.2 * k); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(q.x + ca * 60, q.y + sa * 60); ctx.lineTo(q.x + ca * L, q.y + sa * L); ctx.stroke(); ctx.restore();
      }, tg.id);
    } else if (mv === 'rime') {
      mark(T.short, s, (ctx, q, k, age, seed) => {
        ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
        const g = ctx.createRadialGradient(q.x, q.y, q.r * 0.1, q.x, q.y, q.r); g.addColorStop(0, rgba('#e8faff', 0.3 * k)); g.addColorStop(1, rgba('#7fd8ff', 0.18 * k)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill();
        circle(ctx, q.x, q.y, q.r, null, rgba('#e8faff', 0.6 * k), 2.2);
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + hash(i, seed) * 0.3; crackLine(ctx, q.x + Math.cos(a) * q.r * 0.15, q.y + Math.sin(a) * q.r * 0.15, q.x + Math.cos(a) * q.r * 0.92, q.y + Math.sin(a) * q.r * 0.92, seed + i, k, { w: 1.4, jag: 6, col: '#ffffff', a: 0.8 }); }
        glyph(ctx, 'frost', q.x, q.y, 26, rgba('#ffffff', 0.7 * k), 2);
        for (let i = 0; i < 7; i++) { const a = hash(i, seed + 5) * TAU, d = hash(i, seed + 6) * q.r * 0.8; glow(ctx, q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, 5, '#ffffff', 0.7 * k * (0.5 + 0.5 * Math.sin(age * 4 + i))); }
        ctx.restore();
      }, tg.id);
    } else if (mv === 'leap') {
      mark(T.brief, s, (ctx, q, k, age, seed) => {
        circle(ctx, q.x, q.y, q.r * 0.7, rgba('#1a1204', 0.22 * k), rgba('#33260a', 0.4 * k), 1.6);
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + hash(i, seed) * 0.5; crackLine(ctx, q.x + Math.cos(a) * 10, q.y + Math.sin(a) * 10, q.x + Math.cos(a) * q.r * (0.75 + 0.3 * hash(i, seed + 1)), q.y + Math.sin(a) * q.r * (0.75 + 0.3 * hash(i, seed + 1)), seed + i, k, { w: 1.8, jag: 7, ink: '#33260a', col: '#ffe45a', a: 0.7 + 0.3 * Math.sin(age * 14 + i) }); }
        glow(ctx, q.x, q.y, 22, '#ffe45a', 0.4 * k * (0.5 + 0.5 * Math.sin(age * 12)));
      }, tg.id);
    } else if (mv === 'rifts') {
      mark(T.short, s, (ctx, q, k, age, seed) => {
        const g = ctx.createRadialGradient(q.x, q.y, 4, q.x, q.y, q.r * 0.9); g.addColorStop(0, rgba('#04000a', 0.8 * k)); g.addColorStop(0.5, rgba('#10041e', 0.45 * k)); g.addColorStop(1, rgba('#10041e', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.95, 0, TAU); ctx.fill();
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + hash(i, seed) * 0.5; crackLine(ctx, q.x + Math.cos(a) * 14, q.y + Math.sin(a) * 14, q.x + Math.cos(a) * q.r * (0.8 + 0.4 * hash(i, seed + 1)), q.y + Math.sin(a) * q.r * (0.8 + 0.4 * hash(i, seed + 1)), seed + i, k, { w: 2.2, jag: 9, ink: '#04000a', col: '#a05aff', a: 0.55 + 0.35 * Math.sin(age * 3 + i) }); }
        glow(ctx, q.x, q.y, 20, '#a05aff', 0.3 * k);
      }, tg.id);
    } else if (mv === 'rift') {
      mark(T.short, s, (ctx, q, k, age, seed) => {
        ctx.save(); ARENA.trace(ctx, 2); ctx.clip();
        for (const rr of [q.r - 8, q.r2 + 8]) { circle(ctx, q.x, q.y, rr, null, rgba('#10041e', 0.4 * k), 14); circle(ctx, q.x, q.y, rr, null, rgba('#b078ff', 0.6 * k), 1.8); }
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + hash(i, seed) * 0.3; crackLine(ctx, q.x + Math.cos(a) * (q.r2 + 12), q.y + Math.sin(a) * (q.r2 + 12), q.x + Math.cos(a + 0.08) * (q.r - 10), q.y + Math.sin(a + 0.08) * (q.r - 10), seed + i, k, { w: 1.6, jag: 8, ink: '#04000a', col: '#a05aff', a: 0.6 }); }
        ctx.restore();
      }, tg.id);
    } else if (base === 'azBeam') {
      if (s.len < 4) return;
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      mark(T.brief, s, (ctx, q, k, age, seed) => { crackLine(ctx, q.x, q.y, q.x + ca * q.len, q.y + sa * q.len, seed, k, { w: 2.2, jag: 12, seg: 22, ink: '#33260a', col: '#ffe45a', a: 0.6 + 0.3 * Math.sin(age * 15) }); for (let i = 0; i < 8; i++) { const u = hash(i, seed + 2) * q.len; circle(ctx, q.x + ca * u + (hash(i, seed + 3) - 0.5) * 30, q.y + sa * u + (hash(i, seed + 4) - 0.5) * 30, 2, rgba('#fff6b0', 0.7 * k * (0.4 + 0.6 * Math.sin(age * 9 + i) ** 2))); } }, tg.id);
    } else if (mv.startsWith('conv')) {
      const el = { convFire: 'fire', convFrost: 'frost', convBolt: 'bolt', convVoid: 'void' }[mv], Q = P[el];
      mark(T.long, s, (ctx, q, k, age, seed) => {
        glow(ctx, q.x, q.y, q.r * 1.05, Q.glow, 0.22 * k);
        for (let i = 0; i < 3; i++) { const u = (age * 0.35 + i / 3) % 1; circle(ctx, q.x, q.y, q.r * (0.2 + 0.78 * u), null, rgba('#bff8f0', 0.5 * (1 - u) * k), 2); }
        circle(ctx, q.x, q.y, q.r - 4, null, rgba(Q.col, 0.6 * k), 2); circle(ctx, q.x, q.y, q.r * 0.55, null, rgba(BRASS, 0.4 * k), 1.4);
        glyph(ctx, el, q.x, q.y, 28, rgba(Q.mid, 0.55 * k), 2.4);
        runes(ctx, q.x, q.y, q.r * 0.8, 20, 5, Q.mid, 0.45 * k, age * 0.15, seed);
      }, tg.id);
    } else if (base === 'azReact') {
      if (s.kind === 'rect') return;
      const c1 = COL[e1] || '#ffffff', c2 = COL[e2] || '#ffffff';
      mark(T.brief, s, (ctx, q, k, age, seed) => { for (let i = 0; i < 2; i++) { const a = age * 1.2 + i * Math.PI; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.7, a, a + 1.8); ctx.strokeStyle = rgba(i ? c1 : c2, 0.6 * k); ctx.lineWidth = 3; ctx.stroke(); } circle(ctx, q.x, q.y, q.r, null, rgba(mix2(c1, c2, 0.5), 0.45 * k), 2); }, tg.id);
    } else if (base === 'azMark') {
      const Q = P[e1] || P.fire;
      mark(T.short, s, (ctx, q, k, age, seed) => { glow(ctx, q.x, q.y, q.r, Q.glow, 0.2 * k); circle(ctx, q.x, q.y, q.r - 4, null, rgba(BRASS, 0.55 * k), 1.8); circle(ctx, q.x, q.y, q.r - 10, null, rgba(Q.col, 0.5 * k), 1.2); runes(ctx, q.x, q.y, q.r - 22, 12, 5, Q.mid, 0.45 * k, age * 0.2, seed); glyph(ctx, e1 in P ? e1 : 'fire', q.x, q.y, 20, rgba(Q.mid, 0.6 * k), 2.2); }, tg.id);
    } else if (base === 'azPulse') {
      mark(T.brief, s, (ctx, q, k, age, seed) => { for (let i = 0; i < 3; i++) { const u = (age * 0.5 + i / 3) % 1; circle(ctx, q.x, q.y, q.r * (0.3 + 0.8 * u), null, rgba('#bff8f0', 0.55 * (1 - u) * k), 2); } }, tg.id);
    }
  }

  // ---------------------------------------------------------------- the Tide Rises (the enrage): dark water climbing the walls and closing in
  // drawn on the floor layer; t seconds into the cast, dur its length. The flood starts at the rim and the foam line comes in.
  function tide(c, t, dur, a) {
    const q = clamp(t / dur, 0, 1), R = ARENA.R, rr = R + 20 - (R - 90) * easeIn(q) * 0.92;
    c.save(); ARENA.trace(c, 0); c.clip();
    // the water: everything beyond the foam line, clear teal, deeper toward the wall
    c.beginPath(); c.rect(-R * 2, -R * 2, R * 4, R * 4); c.arc(0, 0, rr, 0, TAU, true);
    const g = c.createRadialGradient(0, 0, Math.max(10, rr), 0, 0, R + 30);
    g.addColorStop(0, rgba('#6ff0e4', 0.34 * a)); g.addColorStop(1, rgba('#0a5a66', 0.6 * a));
    c.fillStyle = g; c.fill('evenodd');
    // ripples on the water, slow rings drifting in
    for (let i = 0; i < 5; i++) { const u = (t * 0.25 + i / 5) % 1, r2 = rr + (R + 30 - rr) * u; c.beginPath(); c.arc(0, 0, r2, 0, TAU); c.strokeStyle = rgba('#d8fffa', 0.22 * (1 - u) * a); c.lineWidth = 2; c.stroke(); }
    // the foam line: a bright crest with white caps and a second thin one behind it
    for (const [dd, w, al] of [[0, 7, 0.5], [-14, 3, 0.35]]) { c.beginPath(); for (let i = 0; i <= 96; i++) { const an = i * TAU / 96, r3 = rr + dd + Math.sin(an * 11 + t * 2.4) * 5 + Math.sin(an * 5 - t * 1.6) * 4; i ? c.lineTo(Math.cos(an) * r3, Math.sin(an) * r3) : c.moveTo(Math.cos(an) * r3, Math.sin(an) * r3); } c.closePath(); c.strokeStyle = rgba('#e8fffb', al * a); c.lineWidth = w; c.stroke(); }
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const an = hash(i, 3) * TAU, r3 = rr + Math.sin(t * 2 + i) * 6 - hash(i, 4) * 10; glow(c, Math.cos(an) * r3, Math.sin(an) * r3, 8 + 8 * hash(i, 5), '#ffffff', 0.35 * a * (0.5 + 0.5 * Math.sin(t * 3 + i))); }
    c.restore();
  }

  // ---------------------------------------------------------------- the drowned tower's floor
  const SIG = AZ.SIG;
  function sigil(c, el, x, y, r, a) {
    const col = COL[el];
    glow(c, x, y, r * 1.5, col, 0.22 * a);
    circle(c, x, y, r, 'rgba(6,22,28,0.55)', rgba(col, 0.7 * a), 3);
    circle(c, x, y, r * 1.05, null, rgba(BRASS, 0.4 * a), 1.4);
    circle(c, x, y, r * 0.86, null, rgba(col, 0.45 * a), 1.4);
    circle(c, x, y, r * 0.5, null, rgba(BRASS, 0.3 * a), 1.2);
    for (let i = 0; i < 24; i++) { const an = i * TAU / 24; line(c, x + Math.cos(an) * r * 0.9, y + Math.sin(an) * r * 0.9, x + Math.cos(an) * r * (i % 2 ? 1.0 : 1.06), y + Math.sin(an) * r * (i % 2 ? 1.0 : 1.06), rgba(col, 0.5 * a), 1.5); }
    runes(c, x, y, r * 0.7, 12, 7, col, 0.45 * a, 0, ELS.indexOf(el) * 5);
    glyph(c, el, x, y, r * 0.38, rgba(col, 0.85 * a), 3);
  }
  function buildTower(c, bx, by) {
    const r = rng(131), R = ARENA.full;
    // the dark water round the tower, a few drowned columns standing in it
    c.fillStyle = '#04141a'; c.fillRect(-bx, -by, bx * 2, by * 2);
    for (let i = 0; i < 70; i++) { const a = r() * TAU, d = R + 10 + r() * Math.max(bx, by), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.95; if (Math.abs(x) > bx - 6 || Math.abs(y) > by - 6) continue; glow(c, x, y, 40 + r() * 90, r() < 0.5 ? '#0a3a44' : '#06222a', 0.35 + r() * 0.35); }
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + 0.2 + r() * 0.2, d = R + 50 + r() * 50, x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (Math.abs(x) > bx - 30 || Math.abs(y) > by - 30) continue;
      circle(c, x, y, 20 + r() * 8, '#1c3a40', 'rgba(0,0,0,0.6)', 3); circle(c, x - 3, y - 3, 12, '#2a5258'); glow(c, x, y, 40, '#0a4048', 0.3);
    }
    // the floor: wet teal stone in rings of dressed blocks
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    const g = c.createRadialGradient(0, -R * 0.1, 30, 0, 0, R);
    g.addColorStop(0, '#34565c'); g.addColorStop(0.6, '#2a464c'); g.addColorStop(1, '#1b3338');
    c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
    for (let ring = 0; ring < 10; ring++) {
      const r0 = ring * 54, r1 = r0 + 54, n = Math.max(6, Math.round(TAU * (r0 + r1) / 2 / 46)), off = r();
      for (let i = 0; i < n; i++) {
        const a0 = (i + off) * TAU / n, a1 = a0 + TAU / n - 0.012, v = 52 + r() * 26;
        c.beginPath(); c.arc(0, 0, r1 - 1, a0, a1); c.arc(0, 0, r0 + 1, a1, a0, true); c.closePath();
        c.fillStyle = `rgba(${v * 0.7 | 0},${v + 14 | 0},${v + 20 | 0},${0.22 + r() * 0.2})`; c.fill(); c.strokeStyle = 'rgba(4,14,18,0.5)'; c.lineWidth = 1.4; c.stroke();
      }
    }
    for (let i = 0; i < 2600; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R; circle(c, x, y, 0.5 + r() * 1.2, r() < 0.6 ? `rgba(4,14,18,${0.2 + r() * 0.3})` : `rgba(140,230,225,${0.05 + r() * 0.08})`); }
    // kelp and algae creeping over the blocks, and standing water
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R, s = 14 + r() * 36; glow(c, Math.cos(a) * d, Math.sin(a) * d, s, r() < 0.5 ? '#1c5a44' : '#14403a', 0.22 + r() * 0.2); }
    for (let i = 0; i < 16; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R * 0.9, x = Math.cos(a) * d, y = Math.sin(a) * d, w = 24 + r() * 60;
      ellipse(c, x, y, w, w * 0.45, r() * TAU, 'rgba(10,50,60,0.4)', 'rgba(150,240,235,0.18)', 1.5); ellipse(c, x - w * 0.2, y - w * 0.1, w * 0.35, w * 0.1, 0, 'rgba(200,255,250,0.14)');
    }
    for (let i = 0; i < 18; i++) {
      let x = (r() * 2 - 1) * R * 0.9, y = (r() * 2 - 1) * R * 0.9, a = r() * TAU;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5 + r() * 5; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (10 + r() * 18); y += Math.sin(a) * (10 + r() * 18); c.lineTo(x, y); }
      c.strokeStyle = 'rgba(2,10,14,0.55)'; c.lineWidth = 1.6; c.stroke();
    }
    // the seven circles: the middle one (a seven-pointed star), the two rings round it, and the four sigils. Teal inlay with a brass thread
    const inlay = (rad, w, a) => { c.beginPath(); c.arc(0, 0, rad, 0, TAU); c.strokeStyle = `rgba(94,200,192,${a})`; c.lineWidth = w; c.stroke(); };
    inlay(170, 4, 0.5); inlay(164, 1.4, 0.4); inlay(350, 4, 0.5); inlay(344, 1.4, 0.4); inlay(R - 16, 3, 0.35);
    for (const rad of [170, 350]) { c.beginPath(); c.arc(0, 0, rad + 5, 0, TAU); c.strokeStyle = 'rgba(216,180,90,0.32)'; c.lineWidth = 1.2; c.stroke(); }
    for (const rad of [170, 350]) for (let i = 0; i < 72; i++) { const a = i * TAU / 72; line(c, Math.cos(a) * (rad - 10), Math.sin(a) * (rad - 10), Math.cos(a) * (rad + (i % 6 ? 2 : 10)), Math.sin(a) * (rad + (i % 6 ? 2 : 10)), 'rgba(94,200,192,0.4)', 1.4); }
    glow(c, 0, 0, 120, '#2a8a86', 0.25);
    circle(c, 0, 0, 84, 'rgba(6,24,30,0.45)', 'rgba(94,200,192,0.7)', 3); circle(c, 0, 0, 74, null, 'rgba(94,200,192,0.4)', 1.4); circle(c, 0, 0, 88, null, 'rgba(216,180,90,0.3)', 1.2);
    c.beginPath(); for (let i = 0; i <= 7; i++) { const a = -Math.PI / 2 + i * 3 * TAU / 7; i ? c.lineTo(Math.cos(a) * 70, Math.sin(a) * 70) : c.moveTo(Math.cos(a) * 70, Math.sin(a) * 70); }
    c.strokeStyle = 'rgba(150,240,232,0.55)'; c.lineWidth = 2; c.stroke();
    for (const el of ELS) sigil(c, el, SIG[el][0], SIG[el][1], 108, 0.62);
    c.restore();
    c.beginPath(); c.arc(0, 0, R - 4, 0, TAU); c.strokeStyle = 'rgba(80,220,210,0.18)'; c.lineWidth = 12; c.stroke();
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 3; c.stroke();
    ArenaView.amb = { kind: 'tower', bubbles: Array.from({ length: 22 }, () => ({ a: r() * TAU, d: Math.sqrt(r()) * R, sp: 0.04 + r() * 0.08, ph: r() * 9, s: 1 + r() * 2.2 })), caus: Array.from({ length: 12 }, () => ({ a: r() * TAU, d: Math.sqrt(r()) * R, sp: 0.02 + r() * 0.04, s: 60 + r() * 90, ph: r() * 9 })) };
  }
  // the room's life: light moving on the water, bubbles, and the sigils glowing with what the fight asks of them
  function towerLife(ctx, a, t) {
    const room = ArenaView.liveRoom, ev = (room && room.ev) || {};
    ctx.save(); ARENA.trace(ctx, 0); ctx.clip();
    for (const cs of a.caus) { const an = cs.a + t * cs.sp; glow(ctx, Math.cos(an) * cs.d, Math.sin(an) * cs.d * 0.95, cs.s, '#5ad0c8', 0.045 + 0.03 * Math.sin(t * 0.6 + cs.ph)); }
    for (const b of a.bubbles) { const u = (t * b.sp + b.ph) % 1, x = Math.cos(b.a) * b.d + Math.sin(t + b.ph) * 6, y = Math.sin(b.a) * b.d * 0.95 - u * 26; circle(ctx, x, y, b.s, null, rgba('#c8fff6', 0.32 * Math.sin(u * Math.PI)), 1); }
    const bind = ev.bind && t < ev.bind.end ? ev.bind.els || [] : [], flare = ev.flare && t < ev.flare.end ? ev.flare.els || [] : [], live = ev.live && t < ev.live.end ? ev.live.el : null, conv = ev.conv && t < ev.conv.end ? ev.conv : null;
    for (const el of ELS) {
      const [x, y] = SIG[el], col = COL[el];
      let k = 0.12 + 0.06 * Math.sin(t * 1.1 + el.length);
      if (bind.includes(el)) k = 0.5 + 0.3 * Math.sin(t * 5);
      if (flare.includes(el)) k = 0.55 + 0.35 * Math.sin(t * 6);
      if (live === el) k = Math.max(k, 0.6 + 0.2 * Math.sin(t * 3.4));   // (Rune Mark: the sigil of the coming spell burns until it lands)
      if (conv) k = Math.max(k, 0.25 + 0.55 * clamp((t - conv.start) / Math.max(0.5, conv.end - conv.start), 0, 1));
      const bd = ev.bound && ev.bound.el === el ? ev.bound : null, sg = ev.surge && ev.surge.el === el ? ev.surge : null;
      if (bd && t < bd.end) k = Math.max(k, 1.0 - (t - bd.start) / (bd.end - bd.start) * 0.5);
      glow(ctx, x, y, 150, col, k * 0.55);
      circle(ctx, x, y, 108, null, rgba(col, Math.min(1, k * 1.4) * 0.8), 2.5);
      if (k > 0.3) runes(ctx, x, y, 94, 16, 6, col, Math.min(1, k) * 0.55, t * 0.3, ELS.indexOf(el));
      if (bind.includes(el) || live === el) for (let i = 0; i < 2; i++) { const q = (t * 0.8 + i * 0.5) % 1; circle(ctx, x, y, 108 + q * 50, null, rgba(col, 0.5 * (1 - q)), 2); }
      if (bd && t < bd.end) {
        const q = (t - bd.start) / (bd.end - bd.start), P2 = P[el];
        circle(ctx, x, y, 108 + q * 200, null, rgba('#ffffff', 0.7 * (1 - q)), 4);
        // the bound element stands in its sigil as a column of its own light
        const gr = ctx.createLinearGradient(0, y - 190, 0, y); gr.addColorStop(0, rgba(P2.glow, 0)); gr.addColorStop(0.8, rgba(P2.glow, 0.5 * (1 - q * 0.7))); gr.addColorStop(1, rgba('#ffffff', 0.7 * (1 - q * 0.7)));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.rect(x - 34, y - 190, 68, 190); ctx.fill();
        glyph(ctx, el, x, y - 70 - 40 * q, 22, rgba(P2.hot, 0.85 * (1 - q * 0.6)), 3);
        // the rune ring that held it closes on the sigil and its light climbs, the bright seal of a thing well bound
        runes(ctx, x, y, 150 * (1 - q) + 30, 20, 6, P2.hot, 0.9 * (1 - q), -t * 3, ELS.indexOf(el));
        circle(ctx, x, y, 150 * (1 - q) + 30, null, rgba(BRASS, 0.8 * (1 - q)), 2);
        for (let i = 0; i < 8; i++) { const u = (q * 1.4 + i / 8) % 1, an = i * 0.8 + t; glow(ctx, x + Math.cos(an) * 46 * (1 - u), y - u * 180, 7, P2.hot, 0.7 * (1 - u) * (1 - q * 0.5)); }
      }
      if (sg && t < sg.end) {
        const q = (t - sg.start) / (sg.end - sg.start);
        glow(ctx, x, y, 220, col, 0.5 * (1 - q));
        circle(ctx, x, y, 60 + q * 520, null, rgba(col, 0.7 * (1 - q)), 5 * (1 - q) + 1);   // (an unbound one tears loose: a ring through the room)
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the link between the two rune bearers (ArenaView.tether hands it over)
  // A sigil of each rune's element under the bearer's feet, a brass medallion over their head holding the rune, a thread from each to
  // him, and between the two a link: thin and dashed while they stand apart, a thick bloom of both elements when they are close.
  function runeLink(ctx, a, b, th, t) {
    const [, ea, eb, live] = parse(th.tag), ca = COL[ea] || '#ffffff', cb = COL[eb] || '#ffffff';
    const d = Math.hypot(b.x - a.x, b.y - a.y), near = d < 250, mid = mix2(ca, cb, 0.5), age = Math.max(0, t - (th.start != null ? th.start : t));
    const ay = a.y - 22 - (a.lift || 0), by = b.y - 22 - (b.lift || 0), mx = (a.x + b.x) / 2, my = (ay + by) / 2;
    ctx.save(); ctx.lineCap = 'round';
    // threads from the bearers up to him (he floats over the middle of the floor)
    for (const [e, col, ey] of [[a, ca, ay], [b, cb, by]]) {
      const hx = e.x, hy = e.y - 78 - (e.lift || 0);
      ctx.beginPath(); ctx.moveTo(hx, hy - 14); ctx.quadraticCurveTo((hx + 0) / 2, Math.min(hy, -60) - 40, 0, -34);
      ctx.strokeStyle = rgba(col, 0.2); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 1.6; ctx.stroke();
    }
    const g = ctx.createLinearGradient(a.x, ay, b.x, by); g.addColorStop(0, rgba(ca, 0.9)); g.addColorStop(1, rgba(cb, 0.9));
    const wob = Math.sin(t * 5) * 7, nx = -(by - ay) / (d || 1), ny = (b.x - a.x) / (d || 1);
    ctx.beginPath(); ctx.moveTo(a.x, ay); ctx.quadraticCurveTo(mx + nx * wob, my + ny * wob, b.x, by);
    ctx.strokeStyle = g; ctx.lineWidth = near ? 5 : 3; if (!near) ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.25; ctx.lineWidth = 11; ctx.stroke(); ctx.globalAlpha = 1;
    // the reaction where the runes are close: a bloom of both
    if (near) {
      const k = 1 - d / 250;
      glow(ctx, mx, my, 50 + 40 * k, mid, 0.35 + 0.35 * k);
      for (let i = 0; i < 6; i++) { const q = (t * 0.9 + i / 6) % 1, an = i * 1.05 + t; glow(ctx, mx + Math.cos(an) * 18 * q, my + Math.sin(an) * 12 * q - q * 26, 9, i % 2 ? ca : cb, 0.6 * (1 - q)); }
      circle(ctx, mx, my, 8 + 4 * Math.sin(t * 8), rgba('#ffffff', 0.7));
    }
    // a rune under each bearer's feet and over their head
    for (const [e, el, col] of [[a, ea, ca], [b, eb, cb]]) {
      // the live rune (the element of the coming spell) is the bright one; the other waits dim
      const isLive = !live || live === el, dim = isLive ? 1 : 0.5;
      const hx = e.x, hy = e.y - 78 - (e.lift || 0) + Math.sin(t * 2.4 + e.x) * 2, arr = clamp(1 - age / 0.5, 0, 1);
      // the floor sigil
      const fy = e.y + 4;
      ctx.save(); ctx.translate(e.x, fy); ctx.scale(1, 0.7);
      circle(ctx, 0, 0, 26 + Math.sin(t * 4) * 1.5, rgba(col, 0.1), rgba(col, 0.75), 2);
      circle(ctx, 0, 0, 31, null, rgba(BRASS, 0.5), 1.4);
      ctx.restore();
      runes(ctx, e.x, fy, 22, 8, 4, col, 0.6, t * 0.8, ELS.indexOf(el));
      // the last moment before the spell is cast from them: the rune tightens, a ring closing on the bearer's feet and the medallion flaring
      const rem = th.end != null ? th.end - t : 9;
      if (isLive && rem > 0 && rem < 1.6) { const u = 1 - rem / 1.6; ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, e.x, fy, 26 + (1 - u) * 52, null, rgba(col, 0.25 + 0.6 * u), 2 + 2 * u); circle(ctx, e.x, fy, 26 + (1 - u) * 52, null, rgba('#ffffff', 0.5 * u), 1); ctx.restore(); }
      if (arr > 0) { circle(ctx, e.x, fy, 26 + 70 * (1 - arr), null, rgba(col, arr * 0.7), 3); glow(ctx, e.x, e.y - 30, 60 * arr + 20, col, 0.6 * arr); }
      // the medallion: a brass ring round a dark disc, the rune in it
      const sc = (1 + arr * 0.7) * (isLive ? 1.18 + 0.05 * Math.sin(t * 5) : 0.9);
      glow(ctx, hx, hy, 34 * sc, col, (0.4 + 0.3 * arr) * dim + (isLive && live ? 0.2 : 0));
      circle(ctx, hx, hy, 16 * sc, 'rgba(6,20,26,0.88)', null);
      // the ring is drawn by what the rune asks: a closed ring for the two that bring the pair together (frost, lightning), a ring
      // broken in two that drifts apart for the two that part them (fire, the void)
      ctx.lineCap = 'butt';
      if (AZ.RULE[el] === 'pair') { circle(ctx, hx, hy, 16 * sc, null, rgba(BRASS, 0.95 * dim), 2.4); circle(ctx, hx, hy, 12.5 * sc, null, rgba(col, 0.8 * dim), 1.4); }
      else for (const sgn of [-1, 1]) {
        const off = 2.2 * sc + Math.sin(t * 3) * 0.8, ox = sgn * off, a0 = sgn > 0 ? -1.38 : Math.PI - 1.38;
        ctx.beginPath(); ctx.arc(hx + ox, hy, 16 * sc, a0, a0 + 2.76); ctx.strokeStyle = rgba(BRASS, 0.95 * dim); ctx.lineWidth = 2.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(hx + ox, hy, 12.5 * sc, a0, a0 + 2.76); ctx.strokeStyle = rgba(col, 0.8 * dim); ctx.lineWidth = 1.4; ctx.stroke();
      }
      ctx.lineCap = 'round';
      ctx.globalAlpha = dim; glyph(ctx, el, hx, hy, 8.5 * sc, col, 2); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the elementals (adds) and his body
  // each drawn facing +x, the way the others in ADD_ART are
  const elementalArt = el => (ctx, st) => {
    const t = st.t || 0, Q = P[el], moving = st.moving !== false;
    const bob = Math.sin(t * (moving ? 7 : 3)) * (moving ? 1.8 : 1);
    glow(ctx, 0, 0, 46, Q.glow, 0.42);
    if (el === 'fire') {
      // a spirit of flame: a trail of tongues streaming back, a bright head, ember eyes
      for (let i = 0; i < 6; i++) { const a = Math.PI + (i - 2.5) * 0.4 + Math.sin(t * 5 + i) * 0.12, d = 14 + (i % 3) * 5, L = 28 + 10 * Math.sin(t * 6 + i * 1.7); poly(ctx, [Math.cos(a) * 3, Math.sin(a) * 3 + bob, Math.cos(a - 0.35) * d, Math.sin(a - 0.35) * d + bob, Math.cos(a) * (d + L), Math.sin(a) * (d + L) + bob, Math.cos(a + 0.35) * d, Math.sin(a + 0.35) * d + bob], i % 2 ? '#ff8a2a' : '#ff5a1a', '#3a1206', 1.8); }
      circle(ctx, 2, bob, 15, '#ff8a2a', '#3a1206', 2.2); circle(ctx, 4, bob, 10, '#ffd27a'); circle(ctx, 6, bob, 5, '#fff2c0');
      for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6; poly(ctx, [4 + Math.cos(a - 0.2) * 12, bob + Math.sin(a - 0.2) * 12, 4 + Math.cos(a) * 21, bob + Math.sin(a) * 21, 4 + Math.cos(a + 0.2) * 12, bob + Math.sin(a + 0.2) * 12], '#ff6a1a', '#3a1206', 1.4); }
    } else if (el === 'frost') {
      // a wolf of ice: body, head forward, ears, a crest of shards, tail of crystal
      const legs = moving ? Math.sin(t * 9) : 0;
      for (const [lx, ly, ph] of [[-8, -10, 0], [-8, 10, Math.PI], [8, -10, Math.PI], [8, 10, 0]]) limb(ctx, [lx, ly * 0.8, lx + Math.sin(t * 9 + ph) * 4 * (moving ? 1 : 0), ly * 1.15], '#8fdcff', 4);
      poly(ctx, [-18, 0, -26, -4, -36 - legs * 2, -2 + legs * 2, -26, 4], '#cfeeff', '#082033', 1.6);
      ellipse(ctx, -2, bob, 20, 11, 0, '#8fdcff', '#082033', 2.2); ellipse(ctx, -4, bob - 3, 12, 4, 0, '#e8faff');
      for (let i = 0; i < 5; i++) { const x = -12 + i * 6; poly(ctx, [x - 3, bob - 8, x + 1, bob - 17 - (i % 2) * 4, x + 4, bob - 8], '#e8faff', '#082033', 1.2); }
      ellipse(ctx, 20, bob, 10, 8, 0, '#a8e6ff', '#082033', 2); poly(ctx, [26, bob - 3, 36, bob + 1, 26, bob + 5], '#d8f4ff', '#082033', 1.4);
      for (const sy of [-1, 1]) poly(ctx, [16, bob + 6 * sy, 14, bob + 14 * sy, 21, bob + 7 * sy], '#e8faff', '#082033', 1.2);
      circle(ctx, 22, bob - 3, 1.8, '#ffffff'); circle(ctx, 22, bob + 3, 1.8, '#ffffff');
    } else if (el === 'bolt') {
      // a cat of lightning: a lean body of white-hot light, spines that jump, a crooked tail
      const step = Math.floor(t * 8);
      circle(ctx, 0, bob, 13, '#ffd23a', '#33260a', 2); ellipse(ctx, -6, bob, 16, 8, 0, '#ffe45a', '#33260a', 2); circle(ctx, 2, bob, 7, '#ffffff');
      ctx.save(); ctx.strokeStyle = '#33260a'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, c] of [[5, '#33260a'], [2.6, '#ffe45a'], [1, '#ffffff']]) { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(-18, bob); ctx.lineTo(-26 + (hash(step, 1) - 0.5) * 6, bob - 8); ctx.lineTo(-30, bob + 3); ctx.lineTo(-40 + (hash(step, 2) - 0.5) * 6, bob - 6); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + step * 0.9; ctx.beginPath(); ctx.moveTo(0, bob); ctx.lineTo(Math.cos(a) * 14 + 3, bob + Math.sin(a) * 14 - 3); ctx.lineTo(Math.cos(a) * (24 + 6 * hash(i, step)), bob + Math.sin(a) * (24 + 6 * hash(i, step))); ctx.strokeStyle = '#ffe45a'; ctx.lineWidth = 2.4; ctx.stroke(); }
      ctx.restore();
      ellipse(ctx, 14, bob, 8, 7, 0, '#fff6b0', '#33260a', 2); for (const sy of [-1, 1]) poly(ctx, [12, bob + 5 * sy, 14, bob + 12 * sy, 18, bob + 6 * sy], '#ffe45a', '#33260a', 1.2);
    } else {
      // a wraith of the void: a tattered cloak trailing, a dark hood with a violet rim, two pale eyes
      for (let i = 0; i < 6; i++) { const a = Math.PI + (i - 2.5) * 0.36 + Math.sin(t * 2 + i) * 0.1, L = 24 + 10 * Math.sin(t * 3 + i * 2); poly(ctx, [Math.cos(a) * 4, Math.sin(a) * 4 + bob, Math.cos(a - 0.3) * 14, Math.sin(a - 0.3) * 14 + bob, Math.cos(a) * (14 + L), Math.sin(a) * (14 + L) + bob, Math.cos(a + 0.3) * 14, Math.sin(a + 0.3) * 14 + bob], '#10041e', '#a05aff', 1.4); }
      circle(ctx, 2, bob, 17, '#10041e', '#a05aff', 2.4);
      for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; ctx.beginPath(); ctx.arc(2, bob, 8 + i * 4, a, a + 2.2); ctx.strokeStyle = rgba('#c8a0ff', 0.8 - i * 0.2); ctx.lineWidth = 2; ctx.stroke(); }
      circle(ctx, 2, bob, 5, '#000000');
      glow(ctx, 10, bob - 4, 8, '#f0dcff', 0.7); glow(ctx, 10, bob + 4, 8, '#f0dcff', 0.7);
    }
    if (el !== 'void' && el !== 'frost') { circle(ctx, 9, bob - 4, 2, '#ffffff'); circle(ctx, 9, bob + 4, 2, '#ffffff'); }
  };
  function archmage(ctx, st) {
    const props = st.props || {}, t = st.t || 0;
    const el = ELS.find(e => props[e]) || null, hot = el ? COL[el] : '#7fe8e0';
    const cast = props.arc || el || props.rune || props.bind || props.conv || props.counter || props.swap || props.mark || props.burst || props.lance;
    const bob = Math.sin(t * 1.5) * 2;
    // seven rings turning round him, one for each element in turn
    for (let i = 0; i < 7; i++) {
      const el2 = ELS[i % 4], rad = 30 + i * 3.5, a0 = t * (0.6 + i * 0.13) * (i % 2 ? -1 : 1), lit = el === el2 || props.conv ? 1 : 0.35;
      ctx.beginPath(); ctx.arc(0, bob, rad, a0, a0 + 2.1 + (i % 3) * 0.5); ctx.strokeStyle = rgba(COL[el2], 0.35 + 0.5 * lit); ctx.lineWidth = 1.6 + lit; ctx.stroke();
      circle(ctx, Math.cos(a0) * rad, bob + Math.sin(a0) * rad, 1.9 + lit, rgba(COL[el2], 0.6 + 0.4 * lit));
    }
    // a thin brass halo behind the hood
    circle(ctx, 4, bob, 17, null, rgba(BRASS, 0.55), 1.6);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 0.2; line(ctx, 4 + Math.cos(a) * 17, bob + Math.sin(a) * 17, 4 + Math.cos(a) * 21, bob + Math.sin(a) * 21, rgba(BRASS, 0.6), 1.4); }
    glow(ctx, 0, bob, 56, hot, cast ? 0.4 : 0.18);
    // robe, drowned: a heavy teal gown with the hem trailing in strands of weed
    for (let i = 0; i < 7; i++) { const y = (i - 3) * 8.5, w = Math.sin(t * 2 + i) * 4; limb(ctx, [-14, bob + y * 0.7, -30 + w, bob + y, -46 + w * 1.6, bob + y * 1.1], i % 2 ? '#1f5a54' : '#2a6a60', 5); }
    ellipse(ctx, -2, bob, 23, 29, 0, '#17383e', OUT, 2.5);
    ellipse(ctx, -3, bob, 14, 22, 0, '#1f4d52');
    line(ctx, -10, bob - 24, -10, bob + 24, rgba('#d8b45a', 0.8), 2.4);
    // two brass lanterns hanging from his sleeves
    for (const sy of [-1, 1]) { const lx = 8 + Math.sin(t * 2 + sy) * 1.5, ly = bob + 30 * sy; line(ctx, 4, bob + 18 * sy, lx, ly, rgba(BRASS, 0.9), 1.4); rrect(ctx, lx - 3.5, ly - 3.5 + (sy > 0 ? 0 : -1), 7, 8, 2, '#d8b45a', OUT, 1.2); circle(ctx, lx, ly + 0.5, 2, rgba('#fff0b0', 0.9)); glow(ctx, lx, ly, 12, '#ffe08a', 0.35); }
    // sleeves out in front, hands holding the orb between them
    const lift = cast ? 4 : 0, spread = props.bind || props.conv ? 7 : 0;
    for (const sy of [-1, 1]) { limb(ctx, [4, bob + 18 * sy, 16, bob + (14 - lift) * sy + spread * sy, 27, bob + (9 - lift) * sy + spread * sy * 1.4], '#17383e', 8); circle(ctx, 28, bob + (9 - lift) * sy + spread * sy * 1.4, 3.6, '#c9b99a', OUT, 1.5); }
    const pulse = 0.8 + 0.2 * Math.sin(t * 5);
    glow(ctx, 31, bob, 24 + (cast ? 8 : 0), hot, 0.55 * pulse);
    circle(ctx, 31, bob, 7 + (cast ? 1.5 : 0), rgba(hot, 0.95), OUT, 2); circle(ctx, 29, bob - 2, 2.6, '#ffffff');
    if (el) glyph(ctx, el, 31, bob, 4.4, '#10222a', 1.6);
    // the staff's mark: a six-pointed star for the Burst, a bright needle forward for the Lance, a ring of the four lights for the Binding and Convergence
    if (props.burst) hexStar(ctx, 31, bob, 15 + 3 * Math.sin(t * 6), rgba('#d8f6ff', 0.9), 1.6, t * 1.4);
    if (props.lance) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(34, bob); ctx.lineTo(70 + 6 * Math.sin(t * 20), bob); ctx.strokeStyle = rgba('#bfeaff', 0.9); ctx.lineWidth = 2.2; ctx.stroke(); ctx.strokeStyle = rgba('#6fb8ff', 0.3); ctx.lineWidth = 7; ctx.stroke(); ctx.restore(); }
    if (props.bind || props.conv) for (let i = 0; i < 4; i++) { const a = t * 1.6 + i * Math.PI / 2; glow(ctx, 31 + Math.cos(a) * 16, bob + Math.sin(a) * 16, 8, COL[ELS[i]], 0.8); circle(ctx, 31 + Math.cos(a) * 16, bob + Math.sin(a) * 16, 2.2, '#ffffff'); }
    // hood, a pale face in it, eyes lit in the colour of what he is calling
    circle(ctx, 6, bob, 12.5, '#0d2a30', OUT, 2.5);
    circle(ctx, 9, bob, 8, '#d8e0d4', OUT, 1.6);
    circle(ctx, 12, bob - 3.2, 1.9, hot); circle(ctx, 12, bob + 3.2, 1.9, hot); glow(ctx, 12, bob, 10, hot, 0.55);
    // a crown of broken coral
    for (let k = 0; k < 5; k++) { const a = -1.2 + k * 0.6; poly(ctx, [4 + Math.cos(a - 0.12) * 12, bob + Math.sin(a - 0.12) * 12, 4 + Math.cos(a) * 19, bob + Math.sin(a) * 19, 4 + Math.cos(a + 0.12) * 12, bob + Math.sin(a + 0.12) * 12], '#e8a890', OUT, 1.2); }
  }
  return { tell, lance, impact, aftermath, tide, glyph, buildTower, towerLife, runeLink, elementalArt, archmage };
})();

// his body and the four elementals he calls
BOSS_ART.archmage = AZ_ART.archmage;
ADD_ART.azfire = AZ_ART.elementalArt('fire'); ADD_ART.azfrost = AZ_ART.elementalArt('frost'); ADD_ART.azbolt = AZ_ART.elementalArt('bolt'); ADD_ART.azvoid = AZ_ART.elementalArt('void');

// the tower floor, its life, and the rune link
ArenaView.buildTower = AZ_ART.buildTower;
ArenaView.towerLife = AZ_ART.towerLife;
ArenaView.runeLink = AZ_ART.runeLink;
