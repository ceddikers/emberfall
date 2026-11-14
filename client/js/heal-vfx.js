// Healer effects, second pass: the Grovekeeper, the Chronomancer, the Alembist, and the Cleric's Prayer Circle, Dawn Petal,
// raise and Ultimate. It loads after ability-vfx.js and replaces those recipes (same ids and keys) with ones in the
// pilot's standard: opaque bodies with a bright core and a dark ink rim (the floors are pale, additive light washes out),
// a gather, a bold landing, and a slow aftermath that has a visible end. Everything is cosmetic and drawn from the events
// every client hears; nothing here is read back by the game. Each class has its own material:
//   Grovekeeper   living green: seeds that sprout where a heal is planted, petals, leaves, pollen, bark and thorn
//   Chronomancer  brass, glass and falling sand: clock hands, afterimages of a moment rewound, time hanging still
//   Alembist      glass flasks that arc and shatter, coloured draughts with fumes and bubbles
// Pieces are small and capped, and reuse VFX's own particles; a recipe spends a handful of them, never a hundred.
(() => {
  const V = VFX, TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a), cl = v => Math.max(0, Math.min(1, v));
  const shake = s => vfxShake(s);
  // the living party (FX.party in the game), capped
  const party = () => { try { const l = typeof FX.party === 'function' ? FX.party() : null; return (l && l.length ? l : [FX.me]).filter(w => w && Number.isFinite(w.x)).slice(0, 8); } catch (e) { return []; } };
  // is this ally on the ground? (the party state the raid keeps; the hero itself carries no hp)
  const isDown = ent => { try { const g = window.__game, r = g && g.raid; if (!ent || !r || !r.party) return false; const id = ent === g.player ? Net.id : ent.id, s = id != null ? r.party.get(id) : null; return !!s && s.alive === false; } catch (e) { return false; } };
  // a cast on a fallen ally is a raise: FX.cast stamps the ally before the recipe runs (the recipe may run 0.2s later, when the host has already stood them up)
  const RAISERS = new Set(['rebirth', 'recall', 'intervene']);
  if (!FX._raiseStamp) {
    const _cast = FX.cast; FX._raiseStamp = true;
    FX.cast = function (ent, ab, tx, ty, opts) { if (ab && RAISERS.has(ab.fxId || ab.id) && opts && opts.tent) opts.tent._raiseAt = isDown(opts.tent) ? FX.now : -9; return _cast.apply(this, arguments); };
  }
  const raised = c => !!(c.tent && FX.now - (c.tent._raiseAt ?? -9) < 1);

  // ---- ink-rimmed particle sprites (VFX's own petals and drops have no rim; on a pale floor they vanish). Spawn with the
  // matching kind (so they turn and flutter) and swap the image in: put(o, img)
  const _spr = new Map();
  function spr(key, size, draw) { let c = _spr.get(key); if (!c) { c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.lineJoin = 'round'; draw(x, size); _spr.set(key, c); } return c; }
  const inkOf = col => shade(col, -0.6);
  const ipetal = col => spr('ip' + col, 32, (x, s) => { x.translate(s / 2, s / 2);
    x.beginPath(); x.moveTo(-s * 0.42, 0); x.quadraticCurveTo(-s * 0.05, -s * 0.34, s * 0.42, 0); x.quadraticCurveTo(-s * 0.05, s * 0.34, -s * 0.42, 0); x.closePath();
    x.fillStyle = col; x.fill(); x.lineWidth = 2.2; x.strokeStyle = inkOf(col); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(-s * 0.06, -s * 0.07, s * 0.17, s * 0.05, -0.2, 0, TAU); x.fill(); });
  const idrop = col => spr('id' + col, 32, (x, s) => { x.translate(s / 2, s / 2);
    x.beginPath(); x.moveTo(0, -s * 0.42); x.quadraticCurveTo(s * 0.34, s * 0.06, 0, s * 0.36); x.quadraticCurveTo(-s * 0.34, s * 0.06, 0, -s * 0.42); x.closePath();
    x.fillStyle = col; x.fill(); x.lineWidth = 2.2; x.strokeStyle = inkOf(col); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(-s * 0.1, s * 0.05, s * 0.06, s * 0.1, 0.3, 0, TAU); x.fill(); });
  const igrain = col => spr('ig' + col, 16, (x, s) => { x.translate(s / 2, s / 2); x.beginPath(); x.arc(0, 0, s * 0.3, 0, TAU); x.fillStyle = col; x.fill(); x.lineWidth = 1.6; x.strokeStyle = inkOf(col); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(-s * 0.14, -s * 0.14, s * 0.12, s * 0.1); });
  const ibub = col => spr('ib' + col, 32, (x, s) => { x.translate(s / 2, s / 2); x.beginPath(); x.arc(0, 0, s * 0.38, 0, TAU); x.fillStyle = rgba(col, 0.28); x.fill(); x.lineWidth = 2; x.strokeStyle = shade(col, -0.35); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(-s * 0.14, -s * 0.15, s * 0.1, s * 0.06, -0.6, 0, TAU); x.fill(); });
  const put = (o, img) => { const p = V.spawn(o); if (p && img) p.img = img; return p; };
  // a pointed leaf from the origin along +x, with an ink rim and a vein
  function leaf(c, len, wid, fill, ink, vein) {
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -wid, len, 0); c.quadraticCurveTo(len * 0.5, wid, 0, 0); c.closePath();
    c.fillStyle = fill; c.fill(); c.lineWidth = 1.7; c.strokeStyle = ink; c.lineJoin = 'round'; c.stroke();
    if (vein) { c.strokeStyle = vein; c.lineWidth = 0.9; c.beginPath(); c.moveTo(len * 0.12, 0); c.lineTo(len * 0.8, 0); c.stroke(); }
  }
  // a small stroked path with an ink under-stroke (a stem, a vine, a blade)
  function inked(c, ink, body, w, trace, hi) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = ink; c.lineWidth = w + 3; c.beginPath(); trace(); c.stroke();
    c.strokeStyle = body; c.lineWidth = w; c.beginPath(); trace(); c.stroke();
    if (hi) { c.strokeStyle = hi; c.lineWidth = Math.max(0.8, w * 0.3); c.beginPath(); trace(); c.stroke(); }
  }
  const handAt = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.7 }; };

  // =================================================================================================================
  // GROVEKEEPER: living green. Seeds fly and sprout, bark and thorns, petals, leaves, pollen.
  // =================================================================================================================
  const GV = { leaf: '#74d84c', leafD: '#2f7a22', leafL: '#c4f27a', ink: '#0d2008', bark: '#8a5c34', barkD: '#2e1c0c', gold: '#ffd66a', cream: '#fff6c8', pink: '#ffb4d0', pinkL: '#ffe4ee', teal: '#5ff0d0' };
  const gvDust = (x, y, n = 4, s = 1) => V.debris(x, y, { n, color: GV.barkD, speed: 0.6 * s, up: 0.7 });
  // pollen: small gold dots lifting on the air and thinning out
  function gvPollen(x, y, o = {}) {
    const n = o.n ?? 6, r = o.r ?? 14, g = igrain(o.color || GV.gold);
    for (let i = 0; i < n; i++) put({ x: x + rand(-r, r), y: y + rand(-r, r) * 0.5, z: o.z ?? rand(4, 18), vx: rand(-6, 6), vz: rand(26, 62) * (o.rise ?? 1), drag: 0.02, life: rand(1, 1.7), size: rand(5, 8), size1: 1, color: o.color || GV.gold, kind: 'star', add: false, sway: rand(10, 22), swayW: rand(3, 6), vr: rand(-2, 2), fadePow: 1.4 }, g);
  }
  // petals and leaves thrown up and drifting down (opaque, rimmed)
  function gvPetals(x, y, n, o = {}) {
    const cols = o.cols || [GV.pink, GV.pinkL, GV.leaf, GV.gold];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + rand(-0.3, 0.3), s = rand(60, 150) * (o.sp ?? 1), col = cols[i % cols.length], isLeaf = col === GV.leaf || col === GV.leafL;
      put({ x, y, z: o.z ?? 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(70, 150) * (o.up ?? 1), g: 170, drag: 0.05, life: rand(1.1, 1.7), size: rand(11, 16) * (o.s ?? 1), color: col, kind: isLeaf ? 'leaf' : 'petal', add: false, vr: rand(-6, 6), flutter: 6, fadePow: 2.2 }, isLeaf ? null : ipetal(col)); }
  }
  // a seed in flight: brown, rimmed, a sprout of two leaves streaming behind; o.kind 'seed' | 'pod' (a thorned pod) | 'root' (a spear of root).
  // Returns its flight time; o.onHit(x, y) runs when it lands
  function gvSeed(sx, sy, tx, ty, o = {}) {
    const d = Math.hypot(tx - sx, ty - sy), dur = Math.max(0.1, d / (o.speed || 900)), arc = o.arc ?? 16, s = (o.size ?? 1) * 1.45, kind = o.kind || 'seed', gold = !!o.gold, ang = Math.atan2(ty - sy, tx - sx);
    const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p, z: 22 + Math.sin(p * Math.PI) * arc });
    const lcol = gold ? GV.gold : GV.leaf;
    V.fx({ dur, layer: 'air', tick: p => { const q = pos(p);
      if (Math.random() < 0.55) put({ x: q.x, y: q.y, z: q.z, vx: -Math.cos(ang) * rand(20, 50) + rand(-14, 14), vy: -Math.sin(ang) * rand(20, 50) + rand(-8, 8), vz: rand(-8, 24), g: 60, drag: 0.04, life: rand(0.35, 0.6), size: rand(8, 11) * s, color: Math.random() < 0.7 ? lcol : GV.leafL, kind: 'leaf', add: false, vr: rand(-9, 9), flutter: 7 });
      if (Math.random() < 0.3) gvPollen(q.x, q.y, { n: 1, r: 3, z: q.z, color: gold ? GV.cream : GV.gold }); },
    draw: (c, p, t, e) => {
      const q = pos(p), y = q.y - q.z, k = e.a;
      for (let i = 3; i >= 1; i--) { const b = pos(Math.max(0, p - i * 0.045)); c.globalAlpha = k * (0.5 - i * 0.12); c.fillStyle = lcol; c.beginPath(); c.arc(b.x, b.y - b.z, (3.2 - i * 0.6) * s, 0, TAU); c.fill(); }
      c.save(); c.translate(q.x, y); c.rotate(ang); c.globalAlpha = k; c.lineJoin = 'round';
      // the sprout streaming back: two leaves on a hair of stem
      for (const sd of [-1, 1]) { c.save(); c.rotate(Math.PI + sd * (0.5 + 0.18 * Math.sin(t * 22 + sd))); c.translate(3 * s, 0); leaf(c, 11 * s, 3.4 * s, lcol, GV.ink); c.restore(); }
      if (kind === 'pod') { c.rotate(t * 12);
        for (let i = 0; i < 7; i++) { c.save(); c.rotate(i * TAU / 7); c.beginPath(); c.moveTo(4 * s, -2.4 * s); c.lineTo(11.5 * s, 0); c.lineTo(4 * s, 2.4 * s); c.closePath(); c.fillStyle = '#c9e06a'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = GV.ink; c.stroke(); c.restore(); }
        c.beginPath(); c.arc(0, 0, 5.4 * s, 0, TAU); c.fillStyle = GV.leafD; c.fill(); c.lineWidth = 1.8; c.strokeStyle = GV.ink; c.stroke(); c.fillStyle = GV.leafL; c.beginPath(); c.arc(-1.4 * s, -1.6 * s, 1.8 * s, 0, TAU); c.fill();
      } else if (kind === 'root') {
        c.beginPath(); c.moveTo(16 * s, 0); c.quadraticCurveTo(2 * s, -6 * s, -12 * s, -3 * s); c.lineTo(-12 * s, 3 * s); c.quadraticCurveTo(2 * s, 6 * s, 16 * s, 0); c.closePath(); c.fillStyle = GV.bark; c.fill(); c.lineWidth = 2; c.strokeStyle = GV.ink; c.stroke();
        c.strokeStyle = GV.gold; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6 * s, -1.4 * s); c.quadraticCurveTo(4 * s, -2.6 * s, 14 * s, -0.4 * s); c.stroke();
        for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(-2 * s, sd * 4 * s); c.lineTo(-7 * s, sd * 9 * s); c.lineTo(-8 * s, sd * 3 * s); c.closePath(); c.fillStyle = GV.leafD; c.fill(); c.lineWidth = 1.2; c.strokeStyle = GV.ink; c.stroke(); }
      } else { c.rotate(t * 10);
        c.beginPath(); c.ellipse(0, 0, 5.8 * s, 4 * s, 0, 0, TAU); c.fillStyle = gold ? '#e0a63a' : GV.bark; c.fill(); c.lineWidth = 2; c.strokeStyle = GV.ink; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-1.6 * s, -1.4 * s, 2.2 * s, 1.1 * s, -0.4, 0, TAU); c.fill(); }
      c.restore();
      V.glowAt(c, q.x, y, 9 * s, gold ? GV.gold : GV.leafL, 0.35 * k);
    }, done: () => { if (o.onHit) o.onHit(tx, ty); } });
    return dur;
  }
  // thorns of bark bursting up out of the floor in a ring and sinking back: ink rim, bark body, a lit edge, a barb, a gold tip
  function gvThorns(x, y, o = {}) {
    const n = Math.min(o.n ?? 7, 12), r = o.r ?? 40, h = o.h ?? 54, dur = o.dur ?? 0.8, inner = o.inner ?? 0.25;
    const sp = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.3, 0.3), d = rand(inner, 1) * r;
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, h: h * 1.3 * rand(0.6, 1.15), w: rand(5.5, 9.5), lean: Math.cos(a) * rand(0.25, 0.55) + rand(-0.12, 0.12), at: rand(0, 0.07) }; }).sort((a, b) => a.y - b.y);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a, sink = cl((p - 0.58) / 0.42);
      c.lineJoin = 'round';
      for (const s of sp) {
        const g = easeOut(cl((t - s.at) / 0.1)) * (1 - sink * sink); if (g <= 0.02) continue;
        const hh = s.h * g, tx = s.x + s.lean * hh, ty = s.y - hh, mx = s.x + s.lean * hh * 0.2, my = s.y - hh * 0.55;
        c.globalAlpha = 0.35 * k; c.fillStyle = '#000'; c.beginPath(); c.ellipse(s.x, s.y, s.w * 1.5, s.w * 0.6, 0, 0, TAU); c.fill();
        c.globalAlpha = k; c.fillStyle = GV.bark; c.strokeStyle = GV.ink; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(s.x - s.w, s.y); c.quadraticCurveTo(mx - s.w * 0.6, my, tx, ty); c.quadraticCurveTo(mx + s.w * 0.6, my, s.x + s.w, s.y); c.closePath(); c.fill(); c.stroke();
        const bx = s.x + (tx - s.x) * 0.45, by = s.y + (ty - s.y) * 0.45, sd = s.lean > 0 ? -1 : 1;
        c.fillStyle = GV.leafD; c.beginPath(); c.moveTo(bx, by - 3); c.lineTo(bx + sd * s.w * 1.4, by - 10); c.lineTo(bx, by + 3); c.closePath(); c.fill(); c.lineWidth = 1.4; c.stroke();
        c.strokeStyle = '#d9a864'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s.x - s.w * 0.35, s.y - 2); c.quadraticCurveTo(mx - s.w * 0.25, my, tx, ty); c.stroke();
        c.fillStyle = GV.gold; c.beginPath(); c.arc(tx, ty, 2.2, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    } });
  }
  // a small soil mound the size of a heal's planting, with clods thrown off it
  const gvMound = (x, y, n = 4) => { gvDust(x, y, n, 0.7); V.fx({ dur: 0.5, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - cl((p - 0.4) / 0.6)) * easeOut(cl(p / 0.15)); c.globalAlpha = 0.85 * k; c.fillStyle = GV.barkD; c.beginPath(); c.ellipse(x, y + 1, 9, 4.2, 0, 0, TAU); c.fill(); c.globalAlpha = k; c.fillStyle = GV.bark; c.beginPath(); c.ellipse(x, y - 1, 6.4, 2.8, 0, 0, TAU); c.fill(); c.globalAlpha = 1; } }); };

  // the plant a heal leaves at an ally's feet for as long as it works: a stem pushes up and unfurls two leaves, a bud swells; at each
  // tick the bud pulses and lets go a puff of pollen and a petal; Bloom throws it open; in its last moments the flower opens, drops its
  // petals and the stem folds down. kind 'sapling' (Rejuvenate, a tall stem and a pink bud), 'tuft' (Wild Growth: low grass and two
  // small flowers), 'gold' (Rebirth's: a golden bud). One per ally per kind: a recast cuts the old one short
  const plants = new WeakMap();
  function gvPlant(w, o = {}) {
    const dur = o.dur ?? 15, ticks = o.ticks || [], kind = o.kind || 'sapling', s = (o.s ?? 1) * 1.7, dx = o.dx ?? 20, dy = o.dy ?? 12;
    const key = kind === 'tuft' ? 'tuft' : 'stem', old = plants.get(w); const mine = plants.get(w) || {};
    if (mine[key]) mine[key].cut = true;
    const rec = { cut: false, burst: false }; mine[key] = rec; plants.set(w, mine);
    const petal = kind === 'gold' ? GV.gold : kind === 'tuft' ? '#ffffff' : GV.pink, petalIn = kind === 'gold' ? GV.cream : kind === 'tuft' ? '#d8f0ff' : GV.pinkL;
    const lean = rand(-0.25, 0.25), ph = rand(0, 6);
    let n = 0;
    V.fx({ dur, layer: 'air', delay: o.delay, tick: (p, dt, e) => {
      const T = p * dur; if (n < ticks.length && T >= ticks[n]) { n++; rec.pulseAt = T; gvPollen(w.x + dx, w.y + dy, { n: 3, r: 5, z: 18 * s, rise: 0.8 }); put({ x: w.x + dx, y: w.y + dy, z: 24 * s, vx: rand(-14, 14), vz: rand(30, 50), g: 60, life: 1, size: 9 * s, color: petal, kind: 'petal', add: false, vr: 3, flutter: 5 }, ipetal(petal)); }
    }, draw: (c, p, t, e) => {
      if (rec.cut && e.cutT == null) e.cutT = t;
      const T = t, out = e.cutT != null ? cl(1 - (T - e.cutT) / 0.3) : 1, end = dur - T;
      const k = e.a * out * cl(T / 0.1); if (k < 0.02) return;
      const g = easeOut(cl(T / 0.55)) * (end < 0.35 ? cl(end / 0.35) : 1);   // grows in, folds down at the end
      const open = kind === 'tuft' ? 0.5 : cl(1 - end / 1.0) * (end < 0.35 ? 1 : 1);
      if (rec.burst) { rec.burst = false; rec.burstAt = T; }
      const bp = rec.burstAt != null ? Math.max(0, 1 - (T - rec.burstAt) / 0.9) : 0, pp = rec.pulseAt != null ? Math.max(0, 1 - (T - rec.pulseAt) / 0.5) : 0;
      const bx = w.x + dx, by = w.y + dy, H = (kind === 'tuft' ? 13 : 27) * s * g, sw = Math.sin(T * 1.7 + ph) * 1.6 * s;
      c.save(); c.globalAlpha = k; c.lineJoin = 'round';
      // soil and its shadow
      c.globalAlpha = 0.3 * k; c.fillStyle = '#000'; c.beginPath(); c.ellipse(bx, by + 1, 9 * s, 3.6 * s, 0, 0, TAU); c.fill();
      c.globalAlpha = k; c.fillStyle = GV.barkD; c.beginPath(); c.ellipse(bx, by, 6.6 * s, 2.7 * s, 0, 0, TAU); c.fill();
      if (kind === 'tuft') {
        for (let i = -2; i <= 2; i++) { const hh = H * (0.65 + 0.35 * Math.cos(i * 0.9)), tx = bx + i * 3.4 * s + sw * (i + 2) * 0.3 + i * 1.2 * s;
          inked(c, GV.ink, i % 2 ? GV.leaf : GV.leafD, 2.3 * s, () => { c.moveTo(bx + i * 1.8 * s, by); c.quadraticCurveTo(bx + i * 2.6 * s, by - hh * 0.6, tx, by - hh); }, GV.leafL); }
        for (const sd of [-1, 1]) { const fx = bx + sd * 6.5 * s + sw, fy = by - H * 1.1 - 1, r0 = 3.2 * s * (1 + 0.6 * (bp + pp) * 0.5) * cl(g * 2 - 0.6);
          if (r0 > 0.6) { for (let i = 0; i < 5; i++) { c.save(); c.translate(fx, fy); c.rotate(i * TAU / 5 + T * 0.2); c.beginPath(); c.ellipse(r0 * 0.8, 0, r0 * 0.9, r0 * 0.55, 0, 0, TAU); c.fillStyle = petal; c.fill(); c.lineWidth = 1.2; c.strokeStyle = inkOf('#8ab0c8'); c.stroke(); c.restore(); }
            c.fillStyle = GV.gold; c.beginPath(); c.arc(fx, fy, r0 * 0.55, 0, TAU); c.fill(); } }
      } else {
        const tx = bx + lean * H + sw, ty = by - H, mx = bx + lean * H * 0.2 + sw * 0.3, my = by - H * 0.55;
        inked(c, GV.ink, GV.leaf, 2.6 * s, () => { c.moveTo(bx, by); c.quadraticCurveTo(mx, my, tx, ty); }, GV.leafL);
        // two leaves on the stem, unfurling
        for (const [q, sd] of [[0.36, -1], [0.6, 1]]) { const u = cl(g * 2.2 - q), lx = bx + (tx - bx) * q * 0.9, ly = by - H * q;
          if (u > 0.05) { c.save(); c.translate(lx, ly); c.rotate(sd < 0 ? Math.PI + 0.5 - 0.3 * (1 - u) : -0.5 + 0.3 * (1 - u)); leaf(c, 12 * s * u, 4.2 * s * u, GV.leaf, GV.ink, GV.leafL); c.restore(); } }
        // the bud (swells with each tick), opening toward its end and when Bloom throws it open
        const bo = Math.max(open, bp * 1.1), br = (3.6 + 1.4 * pp) * s * cl(g * 1.6 - 0.3) * (1 + 0.5 * bo);
        if (br > 0.8) {
          if (bo > 0.15) for (let i = 0; i < 6; i++) { c.save(); c.translate(tx, ty); c.rotate(i * TAU / 6 + 0.3); c.beginPath(); c.ellipse(br * (0.9 + 0.5 * bo), 0, br * (1.1 + 0.4 * bo), br * 0.62, 0, 0, TAU); c.fillStyle = i % 2 ? petal : petalIn; c.fill(); c.lineWidth = 1.3; c.strokeStyle = inkOf(petal); c.stroke(); c.restore(); }
          c.beginPath(); c.arc(tx, ty, br, 0, TAU); c.fillStyle = bo > 0.15 ? GV.gold : petal; c.fill(); c.lineWidth = 1.6; c.strokeStyle = inkOf(petal); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(tx - br * 0.3, ty - br * 0.3, br * 0.28, 0, TAU); c.fill();
          if (pp > 0.02 || bp > 0.02) V.glowAt(c, tx, ty, 14 * s + 10 * bp * s, GV.cream, 0.55 * Math.max(pp, bp) * k);
        }
      }
      c.restore();
    }, done: () => { const t2 = plants.get(w); if (t2 && t2[key] === rec) delete t2[key];
      if (!rec.cut) { for (let i = 0; i < 4; i++) put({ x: w.x + dx + rand(-4, 4), y: w.y + dy, z: kind === 'tuft' ? 10 : 26, vx: rand(-20, 20), vy: rand(-8, 8), vz: rand(10, 40), g: 90, drag: 0.04, life: rand(0.9, 1.3), size: rand(9, 12) * s, color: i % 2 ? petal : petalIn, kind: 'petal', add: false, vr: rand(-4, 4), flutter: 5, fadePow: 2 }, ipetal(i % 2 ? petal : petalIn)); } } });
    return rec;
  }
  // a hero's plant bursts open (Bloom): the bud flings its petals
  const gvBurst = w => { const m = plants.get(w); if (m && m.stem) { m.stem.burst = true; gvPetals(w.x + 20, w.y + 12, 7, { z: 26, sp: 0.6, up: 0.8, s: 0.9 }); gvPollen(w.x + 20, w.y + 12, { n: 4, r: 8, z: 22 }); return true; } return false; };
  // Wildheart: three gold leaves circling an ally for the buff's length, falling away at its end
  function gvWildheart(w, dur) {
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const end = dur - t, k = e.a * cl(t / 0.3) * cl(end / 0.5), fall = end < 0.5 ? (1 - end / 0.5) * 14 : 0;
      c.lineJoin = 'round';
      for (let i = 0; i < 3; i++) { const a = t * 2.2 + i * TAU / 3, x = w.x + Math.cos(a) * 24, y = w.y + Math.sin(a) * 24 * 0.55 - 22 - Math.sin(t * 2 + i) * 3 + fall;
        c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); c.globalAlpha = k; leaf(c, 15, 5.2, GV.gold, '#5a3c08', GV.cream); c.restore(); }
      c.globalAlpha = 1;
    } });
  }
  // a ring of grass tufts standing up as a wave runs out from a point and sinking again behind it (Wild Growth)
  function gvWave(x, y, o = {}) {
    const R = o.r ?? 170, sp = o.speed ?? 520, rings = [[0.25, 7], [0.5, 11], [0.75, 15], [1, 19]];
    const tufts = []; for (const [f, n] of rings) for (let i = 0; i < n; i++) { const a = i / n * TAU + rand(-0.15, 0.15) + f, rr = R * f * rand(0.93, 1.05); tufts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.6, at: rr / sp + rand(0, 0.06), h: rand(22, 34), lean: rand(-0.4, 0.4), n: 3 }); }
    tufts.sort((a, b) => a.y - b.y);
    V.fx({ dur: R / sp + 0.9, layer: 'air', draw: (c, p, t, e) => {
      c.lineCap = 'round';
      for (const f of tufts) { const u = t - f.at; if (u < 0) continue; const g = easeOut(cl(u / 0.14)) * (1 - cl((u - 0.3) / 0.35)); if (g <= 0.03) continue;
        const k = e.a * g;
        for (let j = -1; j <= 1; j++) { const hh = f.h * g * (j ? 0.75 : 1), tx = f.x + j * 4 + f.lean * hh, ty = f.y - hh;
          c.globalAlpha = k; inked(c, GV.ink, j ? GV.leaf : GV.leafD, 3, () => { c.moveTo(f.x + j * 1.6, f.y); c.quadraticCurveTo(f.x + j * 3 + f.lean * hh * 0.3, f.y - hh * 0.55, tx, ty); }, GV.leafL); } }
      c.globalAlpha = 1;
    } });
  }
  // six little flowers pop open on the floor round an ally and sink away: ink rim, pale petals, a gold heart (the planting landing)
  function gvFlowerRing(w, o = {}) {
    const R = o.r ?? 38, dur = o.dur ?? 1.1, cols = o.cols || [GV.pink, GV.pinkL], fl = Array.from({ length: 6 }, (_, i) => ({ a: i * TAU / 6 + rand(-0.2, 0.2), d: rand(0.9, 1.1), at: i * 0.03, ph: rand(0, 6) }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      c.lineJoin = 'round';
      for (const f of fl) { const g = easeOut(cl((t - f.at) / 0.2)) * (1 - cl((t - dur * 0.55) / (dur * 0.45))); if (g < 0.03) continue;
        const x = w.x + Math.cos(f.a) * R * f.d, y = w.y + Math.sin(f.a) * R * f.d * 0.6, r = 9 * g;
        c.fillStyle = '#000'; c.globalAlpha = 0.25 * e.a; c.beginPath(); c.ellipse(x, y + 1, r * 1.2, r * 0.6, 0, 0, TAU); c.fill(); c.globalAlpha = e.a;
        for (let j = 0; j < 5; j++) { c.save(); c.translate(x, y); c.scale(1, 0.75); c.rotate(j * TAU / 5 + f.ph); c.beginPath(); c.ellipse(r * 0.85, 0, r * 0.9, r * 0.55, 0, 0, TAU); c.fillStyle = cols[j % cols.length]; c.fill(); c.lineWidth = 1.3; c.strokeStyle = inkOf(cols[0]); c.stroke(); c.restore(); }
        c.fillStyle = GV.gold; c.beginPath(); c.arc(x, y, r * 0.5, 0, TAU); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#6a4a10'; c.stroke(); }
      c.globalAlpha = 1;
    } });
  }
  // an open golden lotus lying on the floor under a point: green leaves under gold petals under cream ones, an ink rim on every petal (Bloom)
  function gvLotus(x, y, o = {}) {
    const r = o.r ?? 70, dur = o.dur ?? 1.0, flat = 0.62, ph = rand(0, 1);
    const petal = (c, L, W) => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -W, L, 0); c.quadraticCurveTo(L * 0.5, W, 0, 0); c.closePath(); };
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const open = easeOut(cl((t - 0.05) / 0.3)), k = e.a * cl(t / 0.06) * cl((dur - t) / 0.4);
      c.save(); c.translate(x, y); c.scale(1, flat); c.globalAlpha = k; c.lineJoin = 'round'; c.rotate(ph);
      const layer = (n, L, W, off, fill, ink) => { for (let i = 0; i < n; i++) { c.save(); c.rotate(off + i * TAU / n); petal(c, L, W); c.fillStyle = fill; c.fill(); c.lineWidth = 1.8; c.strokeStyle = ink; c.stroke(); c.restore(); } };
      layer(8, r * (0.4 + 0.6 * open), r * 0.26, 0.2, GV.leafD, GV.ink);
      layer(8, r * (0.32 + 0.5 * open), r * 0.22, 0.2 + TAU / 16, GV.gold, '#6a4a10');
      layer(6, r * (0.24 + 0.38 * open), r * 0.2, 0.5, '#ffeaa8', '#8a6a20');
      layer(5, r * (0.14 + 0.2 * open), r * 0.13, 0.1, GV.cream, '#a88a30');
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, y, r * 0.22, '#ffffff', 0.5 * k);
    } });
  }
  // the vine whip of Thornlash: a bark-brown rope with a lit edge snaking out and cracking, a leaf nub at the knots
  function gvWhip(sx, sy, tx, ty, o = {}) {
    const dur = o.dur ?? 0.22, L = Math.hypot(tx - sx, ty - sy) || 1, nx = -(ty - sy) / L, ny = (tx - sx) / L, side = Math.random() < 0.5 ? -1 : 1;
    const at = (q, p) => { const w = Math.sin(q * Math.PI * 2.2 + p * 9) * 18 * Math.sin(q * Math.PI) * (1 - p * 0.7) * side; return { x: sx + (tx - sx) * q + nx * w, y: sy + (ty - sy) * q + ny * w }; };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const head = easeOut(cl(p / 0.6)), k = e.a * cl((1 - p) / 0.35), tail = Math.max(0, (p - 0.45) / 0.55) * 0.9;
      const path = () => { for (let s = 0; s <= 14; s++) { const q = tail + (head - tail) * s / 14, P = at(q, p); s ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); } };
      c.globalAlpha = k; inked(c, GV.ink, GV.bark, 4.2, path, '#d9a864');
      for (const q of [0.3, 0.55, 0.8]) { if (q > head || q < tail) continue; const P = at(q, p); c.save(); c.translate(P.x, P.y); c.rotate(Math.atan2(ny, nx) * 0 + q * 6); leaf(c, 7, 2.6, GV.leaf, GV.ink); c.restore(); }
      const h = at(head, p); c.fillStyle = GV.gold; c.beginPath(); c.arc(h.x, h.y, 2.6, 0, TAU); c.fill(); c.globalAlpha = 1;
      V.glowAt(c, h.x, h.y, 10, '#ffffff', 0.7 * k);
    } });
  }
  // thorn vine wound round a foe's feet for as long as the thorns bite: a ring of vine with thorns, a leaf dropping now and then; at each 3s
  // tick the thorns flex (a quick bristle), at the end the vine withers and goes
  function gvThornRing(x, y, dur, tickEvery) {
    const R = 76, thorns = Array.from({ length: 14 }, (_, i) => ({ a: i * TAU / 12 + rand(-0.15, 0.15), l: rand(6, 10) })), ph = rand(0, 6);
    let n = 0, pulse = -9;
    V.fx({ dur, layer: 'ground', tick: (p, dt, e) => { const T = p * dur; if (T >= (n + 1) * tickEvery - 0.001 && T < dur - 0.2) { n++; pulse = T; for (let i = 0; i < 2; i++) put({ x: x + rand(-30, 30), y: y + rand(-12, 12), z: rand(30, 50), vz: -15, vx: rand(-10, 10), life: 1.1, size: 9, color: GV.leaf, kind: 'leaf', add: false, vr: rand(-3, 3), flutter: 5 }); } },
    draw: (c, p, t, e) => {
      const end = dur - t, k = e.a * cl(t / 0.25) * cl(end / 0.8) * (0.5 + 0.5 * Math.max(0, 1 - t / 1.2)) * 0.92 + e.a * 0.08, flare = Math.max(0, 1 - (t - pulse) / 0.4);
      c.save(); c.translate(x, y); c.scale(1, 0.6); c.lineJoin = 'round';
      const path = () => { for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = R + Math.sin(a * 5 + ph) * 2.6; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } };
      c.globalAlpha = k; inked(c, GV.ink, end < 1.2 ? '#8a7a3a' : GV.leafD, 4.2, path, end < 1.2 ? '#c8b46a' : GV.leaf);
      for (const th of thorns) { const bx = Math.cos(th.a) * R, by = Math.sin(th.a) * R, l = th.l * 1.5 * (1 + 0.6 * flare); c.beginPath(); c.moveTo(bx - 2.2, by); c.lineTo(bx + Math.cos(th.a + 0.5) * l, by + Math.sin(th.a + 0.5) * l - 3); c.lineTo(bx + 2.2, by); c.closePath(); c.fillStyle = '#d9c78a'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = GV.ink; c.stroke(); }
      c.restore(); c.globalAlpha = 1;
    } });
  }

  // ---- Grovekeeper's recipes
  const GROVE = {};
  // the cast: a seed swells at the staff's tip with two leaves unfurling off it, leaves and pollen drawn in on a spiral (CAST_VFX gather)
  if (typeof CAST_VFX !== 'undefined' && CAST_VFX.recipes) CAST_VFX.recipes.grovekeeper = { col: '#74d84c', z: 30,
    tick(s, q) { if (Math.random() < 0.2 + 0.3 * q) { const a = Math.random() * TAU, life = 0.5, r = 38 - 8 * q;
        put({ x: s.h.x, y: s.h.y, z: s.h.z - rand(0, 16), life, size: rand(8, 11), size1: 4, color: Math.random() < 0.7 ? GV.leaf : GV.leafL, kind: 'leaf', add: false, vr: 6, flutter: 5, orbit: { follow: s.h, x: s.h.x, y: s.h.y, a, r, w: (Math.random() < 0.5 ? 1 : -1) * rand(5, 8), dr: -r / life * 0.95, flat: 0.6 } }); }
      if (Math.random() < 0.1) gvPollen(s.h.x, s.h.y, { n: 1, r: 5, z: s.h.z }); },
    draw(c, s, q, k, t) { const { x, y } = s.p, r = 2.4 + 5.6 * q; c.save(); c.translate(x, y); c.globalAlpha = k; c.lineJoin = 'round';
      for (const sd of [-1, 1]) { c.save(); c.rotate(-Math.PI / 2 + sd * (1.1 - 0.5 * q) + Math.sin(t * 5 + sd) * 0.08); c.translate(0, -r * 0.4); leaf(c, (6 + 10 * q), (2 + 3 * q), GV.leaf, GV.ink, GV.leafL); c.restore(); }
      c.beginPath(); c.ellipse(0, 0, r, r * 0.72, 0.3, 0, TAU); c.fillStyle = q > 0.85 ? '#e0a63a' : GV.bark; c.fill(); c.lineWidth = 2; c.strokeStyle = GV.ink; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.3, r * 0.35, r * 0.18, -0.4, 0, TAU); c.fill(); c.restore();
      V.glowAt(c, x, y, 9 + 8 * q, GV.leafL, 0.35 * k * q); } };

  // Wrath is the filler between heals, so it takes three turns: a thorned pod that bursts into brambles, a golden seed lobbed in an arc
  // that sprouts a ring of thorn, and a spear of root. All fly from the staff and are gone inside a second
  let wrathN = 0;
  GROVE.wrath = c => {
    const n = wrathN++ % 3, hand = handAt(c, 16);
    V.glint(hand.x, hand.y, { color: GV.leafL, size: 20, z: 32 });
    const land = (x, y) => {
      V.flash(x, y - 14, 44, GV.leafL, 0.18);
      gvThorns(x, y, n === 2 ? { n: 3, r: 10, h: 92, dur: 0.7, inner: 0 } : { n: n === 1 ? 9 : 7, r: n === 1 ? 46 : 36, h: n === 1 ? 46 : 54, dur: 0.75 });
      V.shock(x, y, { r: n === 2 ? 74 : 62, color: GV.leaf, dur: 0.3, w: 3 });
      gvDust(x, y, 5); gvPetals(x, y, 4, { cols: [GV.leaf, GV.leafL], z: 14, sp: 0.5 });
      shake(n === 2 ? 3 : 2);
    };
    gvSeed(hand.x, hand.y, c.tx, c.ty, { speed: TRV('grovekeeper', 'wrath'), arc: n === 1 ? 38 : 8, size: n === 2 ? 1.3 : 1.1, kind: ['pod', 'seed', 'root'][n], gold: n === 1, onHit: land });
  };
  // Rejuvenate: the staff taps and a seed arcs to the ally and drops at their feet; soil lifts, a ring of petals pops out low, and a plant
  // grows beside them and stays for the 15s, its bud swelling with every tick, flowering at the end
  GROVE.rejuv = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, hand = handAt(c, 14);
    V.glint(hand.x, hand.y, { color: GV.leafL, size: 18, z: 30 });
    const land = () => {
      gvMound(w.x + 20, w.y + 12, 4);
      gvPetals(w.x, w.y, 9, { z: 10, sp: 0.8, up: 0.7, s: 1.1 });
      gvPollen(w.x, w.y, { n: 7, r: 16 }); gvFlowerRing(w, { r: 48, dur: 1.2 });
      for (let i = 0; i < 6; i++) put({ x: w.x, y: w.y, z: 4, life: 0.65, size: rand(11, 14), color: i % 2 ? GV.leaf : GV.leafL, kind: 'leaf', add: false, vr: 5, flutter: 5, vz: 120, drag: 0.03, orbit: { x: w.x, y: w.y, a: i * TAU / 6, r: 30, w: 6, dr: -8, flat: 0.55, follow: w } });
      V.shock(w.x, w.y, { r: 46, color: GV.leaf, dur: 0.35, w: 2.5, layer: 'ground' });
      V.flash(w.x, w.y - 18, 34, GV.leafL, 0.16);
      gvPlant(w, { dur: 15, ticks: [3, 6, 9, 12, 15], kind: 'sapling' });
    };
    if (Math.hypot(w.x - c.x, w.y - c.y) < 30) { gvSeed(c.x, c.y - 52, w.x + 20, w.y + 12, { speed: 380, arc: 6, onHit: land }); } else gvSeed(hand.x, hand.y, w.x + 20, w.y + 12, { speed: 1000, arc: 22, onHit: land });
  };
  // Thornlash: a bark whip cracks out to the boss and a ring of thorns snaps shut round it; then a ring of thorny vine lies round its feet
  // for the 30s the thorns bite, flexing at each 3s tick, and withering at the end
  GROVE.thorn = c => {
    gvWhip(c.x, c.y - 16, c.tx, c.ty - 10, { dur: 0.22 });
    V.glint(c.tx, c.ty, { color: GV.leafL, size: 20, z: 10 });
    c.later(0.1, () => { const x = c.tx, y = c.ty;
      gvThorns(x, y, { n: 10, r: 44, h: 40, dur: 0.6, inner: 0.85 });
      V.flash(x, y - 14, 50, GV.leafL, 0.18); V.shock(x, y, { r: 70, color: GV.leaf, dur: 0.38, w: 3.5 });
      gvDust(x, y, 4); gvPetals(x, y, 3, { cols: [GV.leaf, GV.leafL], z: 14, sp: 0.5 }); shake(2);
      gvThornRing(x, y, 30, 3); });
  };
  // Wild Growth: the staff goes up, a spiral of leaves rises round the druid, and a wave of grass runs out over the party; wherever it reaches
  // an ally a tuft of grass and two small flowers is left for the 15s of regen (a pulse each 3s), the druid's own at once
  GROVE.growth = c => {
    const x = c.x, y = c.y;
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; put({ x, y, z: 6, life: 0.5, size: rand(10, 13), color: i % 3 ? GV.leaf : GV.gold, kind: 'leaf', add: false, vr: 5, flutter: 5, vz: 150, drag: 0.02, orbit: { x, y, a, r: 40, w: 7, dr: 38, flat: 0.55, follow: c.ent } }); }
    V.shock(x, y, { r: 60, color: GV.leaf, dur: 0.3, w: 3, layer: 'ground' });
    c.later(0.12, () => {
      gvWave(x, y, { r: 175 });
      V.shock(x, y, { r: 190, color: GV.leaf, dur: 0.5, w: 4 });
      gvPetals(x, y, 8, { z: 30, sp: 2, up: 1.1, s: 1.1 }); gvPollen(x, y, { n: 8, r: 30 });
      for (const w of party()) { const d = Math.hypot(w.x - x, w.y - y), at = Math.min(0.45, d / 520);
        c.later(at, () => { gvPollen(w.x, w.y, { n: 4, r: 12 }); gvPetals(w.x, w.y, 3, { z: 8, sp: 0.4, up: 0.5, s: 0.8 }); gvPlant(w, { kind: 'tuft', dur: 15, ticks: [3, 6, 9, 12, 15], dx: -17, dy: 14, s: 0.8 }); }); }
    });
  };
  // Bloom: a golden lotus opens on the floor at the druid's feet and throws its petals; pollen runs from it to every ally with a Rejuvenate
  // and their plants burst open
  GROVE.bloom = c => {
    const x = c.x, y = c.y;
    gvLotus(x, y, { r: 104, dur: 1.2 });
    c.later(0.1, () => {
      V.flash(x, y - 18, 64, GV.gold, 0.2); V.shock(x, y, { r: 150, color: GV.gold, dur: 0.5, w: 4 }); shake(3);
      gvPetals(x, y, 14, { z: 18, sp: 1.8, up: 1.3, s: 1.15, cols: [GV.gold, GV.cream, GV.leaf, GV.pink] }); gvPollen(x, y, { n: 8, r: 30 });
      let hit = 0;
      for (const w of party()) { const m = plants.get(w); if (!m || !m.stem) continue; hit++;
        const d = Math.hypot(w.x - x, w.y - y);
        for (let i = 0; i < 6; i++) c.later(i * 0.035, () => { const q = (i + 1) / 7; put({ x: x + (w.x - x) * q, y: y + (w.y - y) * q, z: 24 + Math.sin(q * Math.PI) * 34, life: 0.45, size: 4.5, size1: 1.5, color: GV.gold, kind: 'star', add: false, vr: 3 }, igrain(GV.gold)); });
        c.later(Math.min(0.4, 0.15 + d / 900), () => gvBurst(w)); }
    });
  };
  // Rebirth: on a living ally a gold seed arcs in and a golden sapling shoots up and bursts into petals, leaving Wildheart's leaves circling
  // them for 12s. On a fallen one it is the raise: a great seed drops from above, roots crack the floor, six tall stalks push up in a ring
  // round the body with their flowers closed, then open together as the ally rises, thrown petals and a column of leaves
  GROVE.rebirth = c => {
    const w = c.tent || { x: c.tx, y: c.ty };
    if (raised(c)) { gvRaise(w, c); return; }
    const hand = handAt(c, 14); V.glint(hand.x, hand.y, { color: GV.gold, size: 22, z: 30 });
    const land = () => {
      gvMound(w.x + 20, w.y + 12, 5); gvPetals(w.x, w.y, 8, { z: 10, sp: 1, up: 0.9, cols: [GV.gold, GV.cream, GV.leaf] }); gvPollen(w.x, w.y, { n: 8, r: 18, color: GV.gold });
      V.shock(w.x, w.y, { r: 50, color: GV.gold, dur: 0.4, w: 3, layer: 'ground' }); V.flash(w.x, w.y - 20, 44, GV.cream, 0.2);
      gvSapling(w, { dur: 0.9 }); gvWildheart(w, 12);
    };
    gvSeed(hand.x, hand.y, w.x + 20, w.y + 12, { speed: 1000, arc: 26, gold: true, size: 1.2, onHit: land });
  };
  // a young tree beside an ally that shoots up and bursts: trunk, a crown of leaf blobs, gold at the heart
  function gvSapling(w, o = {}) {
    const dur = o.dur ?? 0.9, bx = w.x + 38, by = w.y + 8;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const g = easeOut(cl(t / 0.3)) * (1 - cl((t - 0.62) / 0.28)), k = e.a * cl(t / 0.05); if (g < 0.03) return;
      const H = 66 * g; c.save(); c.globalAlpha = k; c.lineJoin = 'round';
      inked(c, GV.ink, GV.bark, 7 * (0.6 + 0.4 * g), () => { c.moveTo(bx, by); c.quadraticCurveTo(bx - 4, by - H * 0.55, bx + 2, by - H); }, '#c8945a');
      for (const [dx, dy, r] of [[-14, -4, 12], [14, -2, 12], [0, -12, 15], [-6, 4, 10], [8, 5, 10]]) { c.beginPath(); c.arc(bx + dx * g, by - H + dy * g, r * g, 0, TAU); c.fillStyle = GV.leafD; c.fill(); c.lineWidth = 2; c.strokeStyle = GV.ink; c.stroke(); }
      for (const [dx, dy, r] of [[-12, -7, 7], [10, -8, 7], [0, -17, 8]]) { c.beginPath(); c.arc(bx + dx * g, by - H + dy * g, r * g, 0, TAU); c.fillStyle = GV.leaf; c.fill(); }
      c.fillStyle = GV.gold; c.beginPath(); c.arc(bx + 2, by - H - 4 * g, 3.4 * g, 0, TAU); c.fill(); c.restore();
      V.glowAt(c, bx, by - H, 24 * g, GV.cream, 0.3 * k);
    }, done: () => { gvPetals(bx, by - 56, 12, { z: 56, sp: 1.2, up: 0.6, cols: [GV.gold, GV.cream, GV.leaf] }); } });
  }
  function gvRaise(w, c) {
    const bx = w.x, by = w.y, R0 = 36, stalks = Array.from({ length: 6 }, (_, i) => ({ a: i * TAU / 6 + 0.3, h: rand(58, 74), d: i * 0.05 }));
    // the seed falls
    V.fx({ dur: 0.34, layer: 'air', tick: p => { const z = 300 * (1 - p * p); put({ x: bx + rand(-3, 3), y: by, z, vz: 20, life: 0.4, size: rand(9, 12), color: Math.random() < 0.6 ? GV.leaf : GV.gold, kind: 'leaf', add: false, vr: 6, flutter: 6 }); },
      draw: (cc, p, t, e) => { const z = 300 * (1 - p * p), y = by - z - 14; cc.save(); cc.globalAlpha = e.a; cc.translate(bx, y); cc.rotate(t * 8);
        cc.beginPath(); cc.ellipse(0, 0, 9, 6.4, 0, 0, TAU); cc.fillStyle = '#e0a63a'; cc.fill(); cc.lineWidth = 2.4; cc.strokeStyle = GV.ink; cc.stroke(); cc.restore();
        V.glowAt(cc, bx, y, 22, GV.gold, 0.5 * e.a); V.streakTo(cc, bx, y - 70, bx, y, 5, GV.gold, 0.5 * e.a); },
      done: () => { // it lands: the floor cracks, soil leaps, the stalks begin
        V.shock(bx, by, { r: 110, color: GV.gold, dur: 0.5, w: 5, layer: 'ground' }); gvDust(bx, by, 8, 1.2); V.flash(bx, by - 16, 60, GV.cream, 0.2);
        V.decal(bx, by, { style: 'crack', r: 52, dur: 2.6, a: 0.45, seed: Math.random() * 6 });
        V.fx({ dur: 2.8, layer: 'air', draw: (cc, p2, t2, e2) => {
          const open = easeOut(cl((t2 - 0.7) / 0.35)), out = cl((2.8 - t2) / 0.7), k = e2.a * out; if (k < 0.02) return;
          cc.save(); cc.lineJoin = 'round'; cc.lineCap = 'round';
          for (const s of stalks) { const g = easeOut(cl((t2 - s.d) / 0.5)); if (g < 0.03) continue;
            const x0 = bx + Math.cos(s.a) * R0, y0 = by + Math.sin(s.a) * R0 * 0.6, H = s.h * g, tx = x0 - Math.cos(s.a) * 6 * (1 - open), ty = y0 - H;
            cc.globalAlpha = k; inked(cc, GV.ink, GV.leaf, 4.4, () => { cc.moveTo(x0, y0); cc.quadraticCurveTo(x0 + Math.cos(s.a) * 5, y0 - H * 0.55, tx, ty); }, GV.leafL);
            cc.save(); cc.translate(x0, y0 - H * 0.35); cc.rotate(Math.cos(s.a) > 0 ? -0.5 : Math.PI + 0.5); leaf(cc, 11 * g, 3.8 * g, GV.leaf, GV.ink, GV.leafL); cc.restore();
            const br = 5.5 * g;
            if (open > 0.05) for (let i = 0; i < 6; i++) { cc.save(); cc.translate(tx, ty); cc.rotate(i * TAU / 6 + s.a); cc.beginPath(); cc.ellipse(br * (0.8 + 1.1 * open), 0, br * (1 + 0.9 * open), br * 0.62, 0, 0, TAU); cc.fillStyle = i % 2 ? GV.gold : GV.cream; cc.fill(); cc.lineWidth = 1.4; cc.strokeStyle = '#6a4a10'; cc.stroke(); cc.restore(); }
            cc.beginPath(); cc.arc(tx, ty, br * (open > 0.05 ? 0.9 : 1.15), 0, TAU); cc.fillStyle = open > 0.05 ? '#e0a63a' : GV.gold; cc.fill(); cc.lineWidth = 1.8; cc.strokeStyle = '#6a4a10'; cc.stroke(); }
          cc.restore(); cc.globalAlpha = 1;
          V.glowAt(cc, bx, by - 20, 40 * open, GV.cream, 0.35 * k * open);
        }, tick: p2 => { const T = p2 * 2.8; if (T > 0.7 && T < 1.2 && Math.random() < 0.7) put({ x: bx + rand(-24, 24), y: by + rand(-8, 8), z: rand(4, 30), vz: rand(90, 160), vx: rand(-10, 10), drag: 0.04, life: rand(0.7, 1.1), size: rand(9, 12), color: Math.random() < 0.5 ? GV.leaf : GV.gold, kind: 'leaf', add: false, vr: rand(-6, 6), flutter: 6 }); } });
        c.later(0.75, () => { gvPetals(bx, by, 16, { z: 54, sp: 1.6, up: 1.1, s: 1.2, cols: [GV.gold, GV.cream, GV.pink, GV.leaf] }); gvPollen(bx, by, { n: 10, r: 28 }); V.shock(bx, by, { r: 90, color: GV.gold, dur: 0.5, w: 4 }); }); } });
  }

  // ---- the auto: a rimmed seed, a spray of soil and a two-leaf sprout where it lands
  const SPK = (typeof SPARK !== 'undefined') ? SPARK : null;
  if (SPK) SPK.grovekeeper = c => { const hand = { x: c.ent.x + Math.cos(c.ang) * 12, y: c.ent.y + Math.sin(c.ang) * 8 };
    gvSeed(hand.x, hand.y, c.tx, c.ty, { speed: 820, arc: 10, size: 0.8, onHit: (x, y) => { V.spawn({ x, y, z: 10, life: 0.16, size: 22, size1: 8, color: GV.leafL, kind: 'star', vr: 5 }); gvDust(x, y, 2, 0.6); gvPetals(x, y, 2, { cols: [GV.leaf], z: 8, sp: 0.4, up: 0.5, s: 0.7 }); } }); };

  Object.assign(ABILITY_VFX.grovekeeper, GROVE);
  // what the other healers in this file share
  globalThis.HLX = { put, ipetal, idrop, igrain, ibub, inked, inkOf, leaf, party, isDown, raised, shake, cl, rand, handAt, spr };
})();

// =====================================================================================================================
// CHRONOMANCER: brass, glass and falling sand. Clock hands, afterimages of a moment rewound, time hanging still.
// =====================================================================================================================
(() => {
  const H = HLX, V = VFX, TAU = Math.PI * 2, { put, igrain, inked, inkOf, party, shake, cl, rand, handAt } = H;
  const CH = { brass: '#d9a441', brassD: '#6a4812', brassL: '#ffe08a', ink: '#120c28', vio: '#8a62e8', vioL: '#c9b0ff', blue: '#6a8cf0', glass: '#e4eaff', sand: '#f2cf7a', haste: '#ff9a2a', hasteL: '#ffd27a', pale: '#ece4ff' };
  const NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const LAND = 0.4;   // an Ultimate's impact (the same beat as every healer's)
  const impact = (cam, col, a = 0.2, stop = 0.08) => { if (cam) { cam.stop(stop); cam.punch(0.06, 0.5); cam.flash(col, a, 0.32); } };
  const ultParty = ent => { const l = party(); return l.length ? l : [ent]; };
  const sandG = igrain(CH.sand);

  // the twelve numerals painted once per colour: an ink outline and a gold fill, so they read on the floor
  const _num = {};
  function numerals(col) {
    if (_num[col]) return _num[col];
    const fs = 40;
    return (_num[col] = NUM.map(s => { const cv = document.createElement('canvas'); let g = cv.getContext('2d'); g.font = `700 ${fs}px Georgia, serif`;
      const w = Math.ceil((g.measureText(s).width || fs) + 12), h = fs + 12; cv.width = w; cv.height = h; g = cv.getContext('2d'); g.font = `700 ${fs}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = 7; g.strokeStyle = CH.ink; g.strokeText(s, w / 2, h / 2); g.fillStyle = col; g.fillText(s, w / 2, h / 2); return { cv, w, h, fs }; }));
  }
  // a clock face lying on the floor: a faint glass tint, a brass band with an ink rim, twelve ticks, roman numerals, a minute hand and a
  // fat hour hand turning at `spin` (negative: backwards). Opaque strokes, so it reads on the pale floor; o.a caps its strength
  function chDial(x, y, o = {}) {
    const r = o.r ?? 100, dur = o.dur ?? 1, spin = o.spin ?? -1, cap = o.a ?? 1, flat = o.flat ?? 0.62, follow = o.follow, form = o.form || 0, col = o.col || CH.brass, nums = o.numerals === false ? null : numerals(o.numCol || CH.brassL), hands = o.hands !== false;
    return V.fx({ dur, layer: o.layer || 'ground', delay: o.delay, draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * cap * cl(t / 0.12) * cl((dur - t) / (o.fadeOut ?? 0.4));
      if (k <= 0.01) return;
      const R = r * (form ? 0.9 + 0.1 * easeOut(cl(t / form)) : 0.82 + 0.18 * easeOut(cl(t / 0.3))), bw = Math.max(2.6, R * 0.04), sweep = form ? cl(t / form) : 1;
      c.save(); c.translate(cx, cy); c.scale(1, flat); c.lineJoin = 'round'; c.lineCap = 'round';
      c.globalAlpha = 0.13 * k * sweep; c.fillStyle = '#2a1c6a'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
      c.globalAlpha = k; const a0 = -Math.PI / 2, ar = (rr, f) => { c.beginPath(); c.arc(0, 0, rr, a0, a0 + TAU * f); };
      c.strokeStyle = CH.ink; c.lineWidth = bw + 3.4; ar(R, sweep); c.stroke(); c.strokeStyle = col; c.lineWidth = bw; ar(R, sweep); c.stroke();
      c.strokeStyle = CH.brassL; c.lineWidth = Math.max(1, bw * 0.3); c.globalAlpha = 0.7 * k; c.beginPath(); c.arc(0, 0, R - bw * 0.15, a0 - 0.2, a0 + 1.4 * sweep); c.stroke(); c.globalAlpha = k;
      c.strokeStyle = CH.ink; c.lineWidth = 2.8; ar(R * 0.86, sweep); c.stroke(); c.strokeStyle = CH.vioL; c.lineWidth = 1.2; ar(R * 0.86, sweep); c.stroke();
      for (let i = 0; i < 12 * sweep; i++) { const a = i * TAU / 12 - Math.PI / 2, big = i % 3 === 0, r1 = R * (big ? 0.76 : 0.8), r2 = R * 0.9;
        c.strokeStyle = CH.ink; c.lineWidth = big ? 4.4 : 3; c.beginPath(); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c.stroke();
        c.strokeStyle = col; c.lineWidth = big ? 2.2 : 1.3; c.stroke(); }
      if (nums) { const sz = Math.max(9, R * 0.11); for (let i = 0; i < 12 * sweep; i++) { const a = i * TAU / 12 - Math.PI / 2, n = nums[i], sc = sz / n.fs; c.save(); c.translate(Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66); c.rotate(a + Math.PI / 2); c.globalAlpha = 0.95 * k; c.drawImage(n.cv, -n.w * sc / 2, -n.h * sc / 2, n.w * sc, n.h * sc); c.restore(); } }
      if (hands) { c.globalAlpha = k; const hand = (a, len, w, body) => { c.strokeStyle = CH.ink; c.lineWidth = w + 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.stroke(); c.strokeStyle = body; c.lineWidth = w; c.stroke(); };
        hand(-Math.PI / 2 + t * spin * 6, R * 0.62, 2.4, '#ffffff'); hand(-Math.PI / 2 + 2 + t * spin, R * 0.4, 4.4, col);
        c.beginPath(); c.arc(0, 0, bw * 1.3, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = CH.ink; c.stroke(); }
      c.restore();
    } });
  }
  // a tiny clock face ticking once where something lands: an ink rim, a brass ring, a hand that jumps and overshoots (a hit's stamp), 0.4s
  function chTick(x, y, o = {}) {
    const r = o.r ?? 18, dur = o.dur ?? 0.4, col = o.col || CH.brass, z = o.z ?? 20;
    V.fx({ dur, layer: 'air', delay: o.delay, draw: (c, p, t, e) => {
      const k = e.a * cl((1 - p) / 0.4), R = r * 1.5 * (0.7 + 0.3 * easeOut(cl(t / 0.1))), a = -Math.PI / 2 + (o.dir ?? 1) * (easeOut(cl(t / 0.14)) * 0.9 + 0.12 * Math.sin(cl(t / 0.14) * Math.PI)), cy = y - z;
      c.save(); c.translate(x, cy); c.scale(1, 0.8); c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha = k;
      c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = 'rgba(236,228,255,0.8)'; c.fill(); c.lineWidth = 5; c.strokeStyle = CH.ink; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = col; c.stroke();
      for (let i = 0; i < 4; i++) { const b = i * Math.PI / 2; c.strokeStyle = CH.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(Math.cos(b) * R * 0.7, Math.sin(b) * R * 0.7); c.lineTo(Math.cos(b) * R * 0.92, Math.sin(b) * R * 0.92); c.stroke(); }
      c.strokeStyle = CH.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); c.stroke(); c.strokeStyle = o.hand || CH.vio; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fillStyle = col; c.fill(); c.restore();
    } });
  }
  // grains of sand flying in an arc from one point to another (a heal thread: it reads as sand running along a curve, and is gone when it lands)
  function chGrains(x1, y1, x2, y2, o = {}, later) {
    const n = o.n ?? 8, dur = o.dur ?? 0.36, z1 = o.z1 ?? 30, z2 = o.z2 ?? 26, g = 260, vz0 = (z2 - z1) / dur + g * dur / 2, img = igrain(o.col || CH.sand);
    for (let i = 0; i < n; i++) { const fire = () => put({ x: x1 + rand(-3, 3), y: y1 + rand(-3, 3), z: z1, vx: (x2 - x1) / dur + rand(-8, 8), vy: (y2 - y1) / dur + rand(-8, 8), vz: vz0 + rand(-14, 14), g, life: dur, size: rand(5, 7), size1: 3.5, color: o.col || CH.sand, kind: 'star', add: false, vr: rand(-4, 4), fadePow: 4 }, img);
      if (later && i) later(i * 0.03, fire); else fire(); }
  }
  // a brass hourglass in local space (centre 0,0, s tall): caps, glass, sand (top: how much is left above, bot: how much has piled below)
  function chHourglass(c, s, top, bot, a) {
    const w = s * 0.34, hh = s * 0.5;
    c.save(); c.globalAlpha = a; c.lineJoin = 'round';
    const glass = () => { c.beginPath(); c.moveTo(-w, -hh); c.lineTo(w, -hh); c.quadraticCurveTo(w * 0.1, -hh * 0.2, w * 0.1, 0); c.quadraticCurveTo(w * 0.1, hh * 0.2, w, hh); c.lineTo(-w, hh); c.quadraticCurveTo(-w * 0.1, hh * 0.2, -w * 0.1, 0); c.quadraticCurveTo(-w * 0.1, -hh * 0.2, -w, -hh); c.closePath(); };
    glass(); c.fillStyle = 'rgba(228,234,255,0.55)'; c.fill();
    c.save(); glass(); c.clip(); c.fillStyle = CH.sand;
    if (top > 0.02) { const th = hh * 0.9 * top; c.beginPath(); c.moveTo(-w, -hh); c.lineTo(w, -hh); c.lineTo(w * (1 - top * 0.9) * 0.15, -hh + th); c.lineTo(-w * (1 - top * 0.9) * 0.15, -hh + th); c.closePath(); c.fill(); }
    if (bot > 0.02) { const bh = hh * 0.8 * bot; c.beginPath(); c.moveTo(-w * 0.95, hh); c.lineTo(w * 0.95, hh); c.quadraticCurveTo(w * 0.2, hh - bh, 0, hh - bh); c.quadraticCurveTo(-w * 0.2, hh - bh, -w * 0.95, hh); c.closePath(); c.fill(); }
    if (top > 0.02 && top < 0.98) { c.strokeStyle = CH.sand; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -hh * 0.1); c.lineTo(0, hh - hh * 0.8 * bot); c.stroke(); }
    c.restore();
    glass(); c.lineWidth = 2.2; c.strokeStyle = CH.ink; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-w * 0.78, -hh * 0.82); c.lineTo(-w * 0.78, -hh * 0.3); c.stroke();
    for (const sy of [-1, 1]) { c.fillStyle = CH.brass; c.fillRect(-w * 1.18, sy < 0 ? -hh - s * 0.1 : hh, w * 2.36, s * 0.1); c.lineWidth = 2; c.strokeStyle = CH.ink; c.strokeRect(-w * 1.18, sy < 0 ? -hh - s * 0.1 : hh, w * 2.36, s * 0.1); }
    c.restore();
  }
  // a hero-shaped afterimage with an ink rim and a lit edge (a moment that was): a translucent body, so the real hero shows through
  function chGhost(c, x, y, s, col, a) {
    if (a <= 0.01) return;
    c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
    const body = () => { c.beginPath(); c.arc(0, -36, 6, 0, TAU); c.moveTo(-9, -28); c.lineTo(9, -28); c.lineTo(7, -10); c.lineTo(9, 0); c.lineTo(3, 0); c.lineTo(0, -10); c.lineTo(-3, 0); c.lineTo(-9, 0); c.lineTo(-7, -10); c.closePath(); };
    body(); c.globalAlpha = Math.min(1, a * 0.45); c.fillStyle = col; c.fill(); c.globalAlpha = Math.min(1, a); c.lineWidth = 2.4 / s; c.strokeStyle = CH.ink; c.stroke(); c.lineWidth = 1 / s; c.strokeStyle = CH.pale; c.stroke();
    c.restore();
  }
  // a brass cog turning (n teeth)
  function chCog(c, x, y, r, rot, a) {
    c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a; c.lineJoin = 'round';
    c.beginPath(); for (let i = 0; i < 16; i++) { const q = i * TAU / 16, rr = i % 2 ? r * 0.78 : r; c.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); } c.closePath(); c.fillStyle = CH.brass; c.fill(); c.lineWidth = 2; c.strokeStyle = CH.ink; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.32, 0, TAU); c.fillStyle = CH.ink; c.fill(); c.strokeStyle = CH.brassL; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r * 0.55, 0.4, 2.2); c.stroke(); c.restore();
  }
  // glass shards thrown off a point
  const chShards = (x, y, n, o = {}) => { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(80, 240) * (o.sp ?? 1); put({ x, y, z: o.z ?? 16, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(50, 160), g: 420, drag: 0.04, life: rand(0.35, 0.6), size: rand(7, 11) * (o.s ?? 1), color: i % 3 ? CH.vioL : (o.col || CH.pale), kind: 'shard', add: false, vr: rand(-12, 12), fadePow: 2.4 }); } };
  // sand rising off a point and hanging there a moment (time slowed)
  const chSandUp = (x, y, n, o = {}) => { for (let i = 0; i < n; i++) put({ x: x + rand(-(o.r ?? 12), o.r ?? 12), y: y + rand(-6, 6), z: rand(4, 24), vx: rand(-6, 6), vz: rand(40, 90) * (o.rise ?? 1), drag: 0.05, life: rand(0.9, 1.5), size: rand(4.5, 6.5), size1: 1.5, color: CH.sand, kind: 'star', add: false, vr: rand(-3, 3), fadePow: 1.8, sway: rand(6, 14), swayW: rand(3, 5) }, sandG); };
  // the stance guess kept on each hero (ability-vfx.js chronoStanceFlip): not sent with the cast, flipped by each Shift, set by Paradox / Lag / Time Reversal
  function stanceFlip(ent) { let h = !ent._chronoHaste; if (FX.now - (ent._chronoSlowAt ?? -9) < 0.6) h = false; ent._chronoHaste = h; return h; }
  // Haste held: a faint amber ring at the feet and speed streaks now and then, until the guess says Slow (30s at most)
  function hasteAura(ent) {
    const id = (ent._chronoAura = (ent._chronoAura || 0) + 1);
    V.fx({ dur: 30, layer: 'ground', draw: (c, p, t, e) => {
      if (ent._chronoAura !== id || !ent._chronoHaste) { e.dur = 0; return; }
      const k = e.a * cl(t / 0.3) * cl((30 - t) / 1) * 0.55;
      c.save(); c.translate(ent.x, ent.y); c.scale(1, 0.55); c.lineCap = 'round'; c.globalAlpha = k; c.strokeStyle = CH.ink; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 32, 0, TAU); c.stroke(); c.strokeStyle = CH.haste; c.lineWidth = 2.4; c.stroke();
      c.rotate(t * 3); c.lineWidth = 2.4; for (let i = 0; i < 4; i++) { const a = i * TAU / 4; c.beginPath(); c.moveTo(Math.cos(a) * 25, Math.sin(a) * 25); c.lineTo(Math.cos(a) * 41, Math.sin(a) * 41); c.stroke(); } c.restore();
    }, tick: () => { if (ent._chronoAura === id && ent._chronoHaste && Math.random() < 0.05) put({ x: ent.x + rand(-20, 20), y: ent.y + rand(-6, 6), z: 4, vz: rand(90, 140), life: 0.45, size: 7, color: CH.haste, stretch: 4 }); } });
  }
  // the stance taken: a brass ring under the chronomancer with a hand on it (violet and slow for Slow, amber and quick for Haste), and over the
  // head the stance's glyph for a moment (an hourglass losing its sand, or two chevrons), with grains hanging (Slow) or streaking up (Haste)
  function stanceTaken(ent, haste) {
    const col = haste ? CH.haste : CH.vio, colL = haste ? CH.hasteL : CH.vioL, gx = ent.x, gy = ent.y;
    chDial(0, 0, { r: 50, dur: 1.3, spin: haste ? 8 : -1.5, a: 0.9, numerals: false, col: haste ? CH.haste : CH.brass, follow: ent, form: 0.25 });
    V.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * cl(p / 0.15) * cl((1 - p) / 0.4), x = ent.x, y = ent.y - 82 - (haste ? 14 : 3) * p;
      c.save(); c.translate(x, y); c.scale(1.2, 1.2); c.globalAlpha = k;
      if (haste) for (const dy of [3, -6]) { c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = CH.ink; c.lineWidth = 7; c.beginPath(); c.moveTo(-9, dy + 6); c.lineTo(0, dy - 3); c.lineTo(9, dy + 6); c.stroke(); c.strokeStyle = dy > 0 ? col : colL; c.lineWidth = 3.4; c.stroke(); }
      else chHourglass(c, 26, 1 - cl(p * 1.3), cl(p * 1.3) * 0.9, 1);
      c.restore();
    } });
    if (haste) for (let i = 0; i < 8; i++) put({ x: ent.x + rand(-26, 26), y: ent.y + rand(-8, 8), z: rand(4, 34), vx: rand(-30, 30), vz: rand(200, 280), life: 0.42, size: 10, color: i % 2 ? CH.haste : CH.hasteL, stretch: 5 });
    else { chSandUp(ent.x, ent.y, 7, { r: 30, rise: 0.5 }); V.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => { chGhost(c, gx - 12, gy, 1.3, CH.vio, e.a * (1 - p) * 0.9); chGhost(c, gx - 26, gy, 1.3, CH.blue, e.a * (1 - p) * 0.5); } }); }
  }

  const CHRONO = {};
  // ---- the cast: a small brass clock forms at the staff's hand with its hand sweeping, sand drawn in, and a brass ring closes round the feet, a tick
  // appearing for each twelfth of the cast
  if (typeof CAST_VFX !== 'undefined' && CAST_VFX.recipes) CAST_VFX.recipes.chronomancer = { col: CH.vio, z: 32,
    tick(s, q) { if (Math.random() < 0.25 + 0.3 * q) { const a = Math.random() * TAU, life = 0.45, r = 34 - 8 * q;
        put({ x: s.h.x, y: s.h.y, z: s.h.z + rand(-6, 6), life, size: rand(4.5, 6.5), size1: 2, color: CH.sand, kind: 'star', add: false, vr: 4, orbit: { follow: s.h, x: s.h.x, y: s.h.y, a, r, w: (Math.random() < 0.5 ? 1 : -1) * rand(5, 8), dr: -r / life * 0.95, flat: 0.6 } }, sandG); } },
    draw(c, s, q, k, t) { const { x, y } = s.p, e = s.e, R0 = 30, n = Math.floor(12 * Math.min(1, q * 1.1));
      c.save(); c.globalAlpha = k; c.lineJoin = 'round'; c.lineCap = 'round';
      // the floor ring
      c.save(); c.translate(e.x, e.y + 2); c.scale(1, 0.5); c.strokeStyle = CH.ink; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, R0, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.03, q)); c.stroke(); c.strokeStyle = CH.brass; c.lineWidth = 2.6; c.stroke();
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * TAU / 12; c.strokeStyle = CH.ink; c.lineWidth = 3.4; c.beginPath(); c.moveTo(Math.cos(a) * R0 * 0.74, Math.sin(a) * R0 * 0.74); c.lineTo(Math.cos(a) * R0 * 0.92, Math.sin(a) * R0 * 0.92); c.stroke(); c.strokeStyle = CH.brassL; c.lineWidth = 1.5; c.stroke(); } c.restore();
      // the little clock at the hand
      const r = 5 + 6 * q; c.translate(x, y); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = 'rgba(236,228,255,0.85)'; c.fill(); c.lineWidth = 3.4; c.strokeStyle = CH.ink; c.stroke(); c.lineWidth = 1.8; c.strokeStyle = CH.brass; c.stroke();
      const a = -Math.PI / 2 + q * TAU; c.strokeStyle = CH.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); c.stroke(); c.strokeStyle = CH.vio; c.lineWidth = 1.4; c.stroke();
      c.restore(); } };

  // ---- Temporal Bolt: a dart of glass with afterimages and sand dripping off it, landing as a clock tick. In Slow a thread of sand then runs from the
  // boss to the linked ally and ticks over them; in Haste the dart is amber with three afterimages and a ring of sand runs out to the party
  function chDart(sx, sy, tx, ty, o = {}) {
    const d = Math.hypot(tx - sx, ty - sy), dur = Math.max(0.08, d / (o.speed || 1000)), ang = Math.atan2(ty - sy, tx - sx), haste = !!o.haste, col = haste ? CH.haste : CH.vio, colL = haste ? CH.hasteL : CH.vioL, n = haste ? 3 : 2;
    const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p - 20 - Math.sin(p * Math.PI) * 5 });
    V.fx({ dur, layer: 'air', tick: p => { const q = pos(p); if (Math.random() < 0.6) put({ x: q.x, y: q.y + 20, z: 20, vx: rand(-14, 14), vy: rand(-8, 8), vz: rand(-10, 20), g: 240, life: rand(0.35, 0.55), size: rand(4.5, 6.5), size1: 2, color: CH.sand, kind: 'star', add: false, vr: 3 }, sandG); },
      draw: (c, p, t, e) => {
        const dart = (q, a) => { c.save(); c.translate(q.x, q.y); c.rotate(ang); c.scale(1.6, 1.6); c.globalAlpha = a; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(14, 0); c.lineTo(-2, -5.4); c.lineTo(-13, 0); c.lineTo(-2, 5.4); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.6; c.strokeStyle = CH.ink; c.stroke();
          c.fillStyle = colL; c.beginPath(); c.moveTo(12, 0); c.lineTo(-2, -2.8); c.lineTo(-2, 0); c.closePath(); c.fill(); c.restore(); };
        for (let i = n; i >= 1; i--) dart(pos(Math.max(0, p - i * 0.05)), e.a * (0.55 - i * 0.12));
        dart(pos(p), e.a); const q = pos(p); V.glowAt(c, q.x, q.y, 9, '#ffffff', 0.5 * e.a);
      }, done: () => { if (o.onHit) o.onHit(tx, ty); } });
    return dur;
  }
  CHRONO.bolt = c => {
    const ent = c.ent, haste = !!ent._chronoHaste, hand = handAt(c, 16), link = ent._chronoLink && ent._chronoLink !== ent ? ent._chronoLink : null;
    V.glint(hand.x, hand.y, { color: haste ? CH.hasteL : CH.pale, size: 18, z: 30 });
    const land = (x, y) => {
      chTick(x, y, { r: 24, col: haste ? CH.haste : CH.brass, hand: haste ? CH.haste : CH.vio, dir: haste ? 1 : -1 });
      chShards(x, y, 6, { col: haste ? CH.hasteL : CH.pale, s: 0.9 }); chSandUp(x, y, 4, { r: 14 }); V.flash(x, y - 18, 34, haste ? CH.hasteL : CH.pale, 0.14); shake(1.5);
      if (haste) {
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; put({ x: ent.x, y: ent.y, z: 8, vx: Math.cos(a) * 150, vy: Math.sin(a) * 90, vz: 30, drag: 0.04, life: 0.55, size: 5.5, size1: 2, color: CH.sand, kind: 'star', add: false, vr: 3, fadePow: 2.6 }, sandG); }
        for (const w of party()) if (w !== ent) c.later(Math.min(0.35, Math.hypot(w.x - ent.x, w.y - ent.y) / 520), () => chSandUp(w.x, w.y, 3, { r: 10 }));
      } else if (link) { chGrains(x, y, link.x, link.y, { n: 8, dur: 0.38, z1: 30 }, c.later); c.later(0.4, () => { chTick(link.x, link.y, { r: 15, z: 34, col: CH.brass }); chSandUp(link.x, link.y, 4, { r: 10 }); }); }
    };
    chDart(hand.x, hand.y, c.tx, c.ty, { speed: TRV('chronomancer', 'bolt'), haste, onHit: land });
  };

  // ---- Rewind: a moment run backwards. A thread of sand runs to the ally; a brass clock turns backwards under them with its hand racing; three
  // afterimages of where they stood slide back into them one after another; as they merge a pale ring, a tick and a rise of sand
  CHRONO.rewind = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, follow = c.tent || null;
    if (c.tent) c.ent._chronoLink = c.tent;   // (Rewind's target becomes the link: the Slow Bolt's thread runs to them)
    const hand = handAt(c, 14); V.glint(hand.x, hand.y, { color: CH.pale, size: 18, z: 30 });
    if (Math.hypot(w.x - c.x, w.y - c.y) > 40) chGrains(hand.x, hand.y, w.x, w.y, { n: 8, dur: 0.34, z1: 34, z2: 28 }, c.later);
    chDial(w.x, w.y, { r: 56, dur: 1.2, spin: -9, a: 0.95, numerals: false, follow, form: 0.2 });
    const fa = (w.angle || 0) + Math.PI, bend = rand(-0.5, 0.5);
    for (let i = 0; i < 3; i++) { const d = 78 - i * 22, a = fa + bend * (3 - i) * 0.3;
      V.fx({ dur: 0.5, layer: 'air', delay: 0.04 + i * 0.1, draw: (cc, p, t, e) => { const q = 1 - easeOut(p), k = e.a * cl(p / 0.12) * (0.4 + 0.6 * p * 0 + 0.6 * (1 - p));
        chGhost(cc, w.x + Math.cos(a) * d * q, w.y + Math.sin(a) * d * 0.6 * q, 1.3, i % 2 ? CH.vio : CH.blue, k); }, done: () => { if (i === 2) V.flash(w.x, w.y - 22, 36, CH.pale, 0.16); } }); }
    c.later(0.5, () => { V.shock(w.x, w.y, { r: 70, color: CH.vio, dur: 0.38, w: 3.4, layer: 'ground' }); chTick(w.x, w.y, { r: 20, z: 52, col: CH.brass, dir: -1 }); chSandUp(w.x, w.y, 9, { r: 18, rise: 1.2 }); chShards(w.x, w.y, 4, { s: 0.7 }); });
  };

  // ---- Shift: the stance ring and glyph; Haste's faint ring kept while it lasts
  CHRONO.shift = c => { const haste = stanceFlip(c.ent); stanceTaken(c.ent, haste); if (haste) hasteAura(c.ent); };

  // ---- Accelerando: a brass dial turns forwards under the chronomancer with cogs spinning round it; amber chevrons and a streak of sand rise at
  // every ally as the wave reaches them; the ally it was aimed at wears Quickened (two ink-rimmed chevrons rising over them)
  function chQuickMark(w) {
    V.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * cl(p / 0.12) * cl((1 - p) / 0.4), x = w.x, y = w.y - 84 - 18 * easeOut(p);
      c.save(); c.translate(x, y); c.scale(1.3, 1.3); c.globalAlpha = k; c.lineCap = 'round'; c.lineJoin = 'round';
      for (const dy of [4, -5]) { c.strokeStyle = CH.ink; c.lineWidth = 6.4; c.beginPath(); c.moveTo(-8, dy + 5); c.lineTo(0, dy - 3); c.lineTo(8, dy + 5); c.stroke(); c.strokeStyle = dy > 0 ? CH.haste : CH.hasteL; c.lineWidth = 3; c.stroke(); }
      c.restore();
    } });
    for (let i = 0; i < 5; i++) put({ x: w.x + rand(-16, 16), y: w.y + rand(-6, 6), z: rand(4, 30), vz: rand(220, 290), life: 0.4, size: 10, color: i % 2 ? CH.haste : CH.hasteL, stretch: 5 });
  }
  CHRONO.accel = c => {
    const ent = c.ent;
    V.glint(c.x, c.y - 40, { color: CH.hasteL, size: 28, z: 30 });
    chDial(c.x, c.y, { r: 120, dur: 1.1, spin: 7, a: 0.7, numerals: false, col: CH.haste, follow: ent, form: 0.3, fadeOut: 0.5 });
    const cogs = Array.from({ length: 5 }, (_, i) => ({ a: i * TAU / 5, r: rand(11, 16), sp: rand(2, 4) * (i % 2 ? -1 : 1) }));
    V.fx({ dur: 1.0, layer: 'air', draw: (cc, p, t, e) => { const k = e.a * cl(t / 0.12) * cl((1 - p) / 0.3), R = 82 * easeOut(cl(t / 0.25));
      for (const g of cogs) { const a = g.a + t * 1.6; chCog(cc, ent.x + Math.cos(a) * R, ent.y + Math.sin(a) * R * 0.55 - 10, g.r, t * g.sp, k); } } });
    V.shock(c.x, c.y, { r: 190, r0: 40, color: CH.haste, dur: 0.5, w: 3, layer: 'ground', delay: 0.1 });
    for (const w of party()) { const d = Math.hypot(w.x - c.x, w.y - c.y);
      c.later(0.1 + Math.min(0.4, d / 480), () => { for (let i = 0; i < 4; i++) put({ x: w.x + rand(-14, 14), y: w.y + rand(-6, 6), z: rand(4, 24), vz: rand(220, 300), life: 0.4, size: 10, color: i % 2 ? CH.haste : CH.hasteL, stretch: 5 }); chTick(w.x, w.y, { r: 13, z: 46, col: CH.haste, hand: CH.haste, dir: 1, dur: 0.35 }); }); }
    const w = c.tent; if (w && w !== ent) c.later(0.15, () => chQuickMark(w)); else chQuickMark(ent);
  };

  // ---- Stasis: the press is a glint and a small hourglass spinning at the hand. Holding is a glass sphere of slowed time round the chronomancer, a
  // brass band orbiting it, grains hanging in the air inside it; the release bursts it into shards, every grain falls at once, and an hourglass
  // seal is left on the floor for a moment
  CHRONO.stasis = c => { const hand = handAt(c, 14); V.glint(hand.x, hand.y, { color: CH.pale, size: 22, z: 30 });
    V.fx({ dur: 0.5, layer: 'air', draw: (cc, p, t, e) => { const k = e.a * cl(p / 0.15) * cl((1 - p) / 0.3); cc.save(); cc.translate(hand.x, hand.y - 38 - 8 * p); cc.rotate(p * Math.PI); cc.scale(0.9, 0.9); chHourglass(cc, 26, 1 - p, p, k); cc.restore(); } }); };
  function chShell(ent, dur) {
    const id = (ent._chronoShell = (ent._chronoShell || 0) + 1), grains = Array.from({ length: 9 }, () => ({ a: rand(0, TAU), d: rand(0.3, 0.92), h: rand(-0.7, 0.7), ph: rand(0, 6) }));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      if (ent._chronoShell !== id) { e.dur = 0; return; }
      const k = e.a * cl(t / 0.25) * (t < 0.7 ? 1 : 0.75) * cl((dur - t) / 0.3), x = ent.x, y = ent.y - 30, R = 66 * (0.7 + 0.3 * easeOut(cl(t / 0.3)));
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha = k;
      const g = c.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R); g.addColorStop(0, 'rgba(236,228,255,0.34)'); g.addColorStop(0.7, 'rgba(160,140,240,0.16)'); g.addColorStop(1, 'rgba(120,100,220,0.26)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
      c.lineWidth = 4.4; c.strokeStyle = CH.ink; c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke(); c.lineWidth = 1.8; c.strokeStyle = CH.vioL; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.2; c.beginPath(); c.arc(x, y, R * 0.86, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
      // the brass band orbiting it, a node riding it
      c.save(); c.translate(x, y); c.rotate(-0.35); c.scale(1, 0.3); c.strokeStyle = CH.ink; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, R * 1.14, 0, TAU); c.stroke(); c.strokeStyle = CH.brass; c.lineWidth = 4; c.stroke(); c.restore();
      const th = t * 1.3, nx = Math.cos(th) * R * 1.14, ny = Math.sin(th) * R * 0.34, cs = Math.cos(-0.35), sn = Math.sin(-0.35), px = x + nx * cs - ny * sn, py = y + nx * sn + ny * cs;
      c.beginPath(); c.arc(px, py, 4.4, 0, TAU); c.fillStyle = CH.brassL; c.fill(); c.lineWidth = 2; c.strokeStyle = CH.ink; c.stroke();
      // grains hanging in it, barely drifting: time stopped
      for (const q of grains) { const gx = x + Math.cos(q.a) * R * q.d * 0.8, gy = y + q.h * R * 0.7 + Math.sin(t * 0.8 + q.ph) * 1.5; c.beginPath(); c.arc(gx, gy, 2.4, 0, TAU); c.fillStyle = CH.sand; c.fill(); c.lineWidth = 1.2; c.strokeStyle = CH.ink; c.stroke(); }
      c.restore();
    } });
  }
  KIT_VFX['stasis-hold'] = e => { chShell(e, 8); V.shock(e.x, e.y, { r: 80, color: CH.vio, dur: 0.4, w: 3, layer: 'ground' }); chSandUp(e.x, e.y - 20, 8, { r: 34, rise: 0.4 }); };
  function chSeal(x, y, o = {}) {
    const r = o.r ?? 100, dur = o.dur ?? 1.9;
    chDial(x, y, { r, dur, spin: 0.4, a: 0.55, numerals: false, hands: false, form: 0.3, fadeOut: 0.6 });
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * 0.8 * cl(t / 0.15) * cl((dur - t) / 0.6); c.save(); c.translate(x, y); c.scale(1, 0.62); chHourglass(c, r * 0.9, 0.5, 0.5, k); c.restore(); } });
  }
  KIT_VFX['stasis-release'] = e => {
    e._chronoShell = (e._chronoShell || 0) + 1;   // (ends the sphere)
    V.flash(e.x, e.y - 28, 54, CH.pale, 0.18);
    V.climax(e.x, e.y, { shape: 'ring', r: 94, color: CH.vio, core: '#f2ecff', ink: CH.ink, dur: 0.6, hold: 0.1, z: 28, after: { embers: 0.4 } });
    chShards(e.x, e.y - 24, 14, { z: 40, sp: 1.3, s: 1.2 });
    for (let i = 0; i < 26; i++) { const a = rand(0, TAU), d = rand(10, 66); put({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.5, z: rand(20, 70), vz: rand(-20, 10), g: 340, life: rand(0.5, 0.8), size: rand(5, 7), size1: 3, color: CH.sand, kind: 'star', add: false, vr: 3, fadePow: 3 }, sandG); }
    V.shock(e.x, e.y, { r: 180, color: CH.vio, w: 4, dur: 0.55, layer: 'ground' });
    chSeal(e.x, e.y, { r: 112, dur: 1.9 });
  };

  // ---- Recall: time runs back on the ally. A brass hourglass hangs over them, turns over, and its sand runs; it shatters and the sand pours down
  // over them with a tick. On a fallen ally it is the raise: a great clock opens under the body and its hands wind back, an afterimage of the
  // ally stands up out of the body and is taken in, a tall hourglass pours, and a fountain of sand and glass opens
  function chGlassHour(w, o = {}) {
    const dur = o.dur ?? 1.1, s = o.s ?? 34, h0 = o.h ?? 62;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * cl(t / 0.1) * cl((dur - t) / 0.12), flip = easeOut(cl((t - 0.12) / 0.32)), run = cl((t - 0.45) / 0.5);
      c.save(); c.translate(w.x, w.y - h0 + Math.sin(t * 3) * 1.2); c.rotate(Math.PI * flip); chHourglass(c, s, 1 - run, run * 0.9, k); c.restore();
    }, done: () => { chShards(w.x, w.y - h0, 8, { z: 4, sp: 0.8 }); for (let i = 0; i < 14; i++) { const a = rand(0, TAU), d = rand(0, 16); put({ x: w.x + Math.cos(a) * d, y: w.y + Math.sin(a) * d * 0.5, z: h0 + rand(-8, 8), vz: rand(-10, 10), g: 300, life: rand(0.35, 0.5), size: rand(5, 7), size1: 3, color: CH.sand, kind: 'star', add: false, vr: 3 }, sandG); } } });
  }
  CHRONO.recall = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, follow = c.tent || null, hand = handAt(c, 14);
    V.glint(hand.x, hand.y, { color: CH.pale, size: 20, z: 30 });
    if (H.raised(c)) {
      chDial(w.x, w.y, { r: 84, dur: 1.9, spin: -16, a: 1, follow, form: 0.45, fadeOut: 0.6 });
      chGlassHour(w, { dur: 1.2, s: 52, h: 76 });
      V.fx({ dur: 1.5, layer: 'air', delay: 0.3, draw: (cc, p, t, e) => { const up = easeOut(cl(t / 0.7)), back = easeOut(cl((t - 0.7) / 0.7)), k = e.a * cl(t / 0.12) * cl((1.5 - t) / 0.2);
        chGhost(cc, w.x, w.y - 40 * up * (1 - back) - 2, 1.5, CH.pale, k * (1 - back * 0.5)); } });
      c.later(1.35, () => { V.flash(w.x, w.y - 24, 46, CH.pale, 0.2); chTick(w.x, w.y, { r: 32, z: 54, col: CH.brass, dir: -1, dur: 0.7 });
        chShards(w.x, w.y, 12, { z: 24, sp: 1.3, s: 1.1 }); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; put({ x: w.x, y: w.y, z: 10, vx: Math.cos(a) * rand(40, 100), vy: Math.sin(a) * rand(24, 60), vz: rand(120, 220), g: 280, life: rand(0.7, 1), size: rand(5, 7), size1: 3, color: CH.sand, kind: 'star', add: false, vr: 3, fadePow: 2.4 }, sandG); }
        V.shock(w.x, w.y, { r: 120, color: CH.brass, dur: 0.5, w: 4, layer: 'ground' }); });
      return;
    }
    chDial(w.x, w.y, { r: 58, dur: 1.2, spin: -8, a: 0.9, numerals: false, follow, form: 0.2 });
    chGlassHour(w, { dur: 1.1 });
    c.later(0.9, () => { chTick(w.x, w.y, { r: 20, z: 40, col: CH.brass, dir: -1 }); V.shock(w.x, w.y, { r: 76, color: CH.brass, dur: 0.45, w: 3.4, layer: 'ground' }); chSandUp(w.x, w.y, 8, { r: 16 }); });
  };

  // ---- Paradox (the shift back to Slow): four afterimages on a diamond close in on the boss, it bursts; two orbits are left on the floor
  KIT_VFX.paradox = Object.assign((e, target, d) => {
    const t = target || e, big = Math.min(1.5, 0.7 + ((d && d.n) || 0) / 120);
    e._chronoHaste = false; e._chronoSlowAt = FX.now;
    const corners = [[-1, 0], [0, -1], [1, 0], [0, 1]].map(([dx, dy], i) => ({ x: t.x + dx * 150 * big, y: t.y + dy * 88 * big, col: i % 2 ? CH.blue : CH.vio }));
    V.shock(e.x, e.y, { r: 85, color: CH.pale, w: 3, dur: 0.35, layer: 'ground' });
    V.fx({ dur: 0.3, layer: 'air', draw: (c, p, tt, ef) => {
      const q = easeOut(p) * 0.85, k = ef.a * cl(p / 0.2), at = g => ({ x: g.x + (t.x - g.x) * q, y: g.y + (t.y - g.y) * q });
      c.save(); c.lineJoin = 'round'; c.setLineDash([7, 6]); c.globalAlpha = k * 0.8; c.strokeStyle = CH.ink; c.lineWidth = 3; c.beginPath(); corners.forEach((g, i) => { const P = at(g); i ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); }); c.closePath(); c.stroke(); c.restore();
      for (const g of corners) { const P = at(g); chGhost(c, P.x, P.y, 1.35, g.col, k * (1 - p * 0.4)); }
    }, done: () => {
      V.climax(t.x, t.y, { shape: 'burst', r: Math.max(84, 112 * big), n: 14, color: CH.vio, core: '#ffffff', ink: CH.ink, dur: 0.6, hold: 0.1, z: 14, after: { embers: 0.5 } });
      chTick(t.x, t.y, { r: 34, z: 30, col: CH.brass, dir: -1, dur: 0.5 }); chShards(t.x, t.y, 12, { sp: 1.4, s: 1.2 }); chSandUp(t.x, t.y, 8, { r: 30 });
      chDial(t.x, t.y, { r: 130 * big, dur: 1.7, spin: -3, a: 0.5, numerals: false, hands: true, form: 0.25, fadeOut: 0.6 });
      V.debris(t.x, t.y, { n: 4, color: '#2e2a4a' }); shake(3);
    } });
  }, { atTarget: true });
  const lag0 = KIT_VFX.lag; KIT_VFX.lag = e => { e._chronoHaste = false; if (lag0) lag0(e); };

  // ---- Time Reversal: a great brass dial forms round the party with its hands racing backwards and three arrowheads chasing round its rim; at
  // the impact everything is pulled in and flung back out as glass and sand; the dial stays on the floor, faint, for the 6s it reached back through.
  // Each ally's moment comes back: a small clock over them, and two afterimages slide back into them
  function chArrows(x, y, o = {}) {
    const R = o.r ?? 150, dur = o.dur ?? 0.5, n = o.n ?? 3, dir = o.dir ?? -1, follow = o.follow, inward = o.inward;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => { const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * cl(t / 0.1) * cl((1 - p) / 0.3), RR = R * (inward ? 1 - 0.6 * easeOut(p) : 0.9 + 0.1 * easeOut(cl(t / 0.3)));
      c.save(); c.translate(cx, cy - 6); c.scale(1, 0.55); c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha = k;
      for (let i = 0; i < n; i++) { const a = i * TAU / n + dir * t * 6, span = 1.1;
        const arc = () => { c.beginPath(); c.arc(0, 0, RR, a - dir * span, a, dir < 0); };
        c.strokeStyle = CH.ink; c.lineWidth = 12; arc(); c.stroke(); c.strokeStyle = [CH.brassL, CH.vioL, CH.blue][i % 3]; c.lineWidth = 6.4; arc(); c.stroke();
        const hx = Math.cos(a) * RR, hy = Math.sin(a) * RR, tg = a + dir * Math.PI / 2; c.beginPath(); c.moveTo(hx + Math.cos(tg) * 16, hy + Math.sin(tg) * 16); c.lineTo(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12); c.lineTo(hx - Math.cos(a) * 12, hy - Math.sin(a) * 12); c.closePath(); c.fillStyle = [CH.brassL, CH.vioL, CH.blue][i % 3]; c.fill(); c.lineWidth = 2.6; c.strokeStyle = CH.ink; c.stroke(); }
      c.restore(); } });
  }
  CHRONO.timereversal = c => {
    const at = { x: c.x, y: c.y }, S = 1.15;
    chDial(at.x, at.y, { r: 170 * S, dur: LAND + 0.3, spin: -9, a: 0.95, fadeOut: 0.25, form: LAND * 0.85 });
    chArrows(at.x, at.y, { r: 150 * S, n: 3, dur: LAND + 0.15, dir: -1, follow: c.ent });
    chSandUp(at.x, at.y, 8, { r: 90, rise: 0.8 });
    c.later(LAND, () => {
      impact(c.cam, '#e0d4ff', 0.2, 0.1); shake(6);
      // the pull in, then the flung-out glass and sand
      for (let i = 0; i < 20; i++) { const a = rand(0, TAU), d = 170 * S * rand(0.6, 1), T = 0.28; put({ x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.6, z: rand(10, 50), vx: -Math.cos(a) * d / T, vy: -Math.sin(a) * d * 0.6 / T, life: T, size: rand(9, 14), color: i % 3 ? CH.vioL : CH.brassL, kind: 'shard', add: false, vr: rand(-10, 10), fadeIn: 0.3 }); }
      chArrows(at.x, at.y, { r: 130 * S, n: 3, dur: 0.6, dir: -1, inward: true });
      V.fx({ dur: 0.3, layer: 'air', done: () => {
        V.flash(at.x, at.y - 30, 90, '#fff2c8', 0.22); chShards(at.x, at.y, 14, { z: 30, sp: 2, s: 1.6 }); chShards(at.x, at.y, 10, { z: 40, sp: 1.2, s: 1.3, col: CH.brassL });
        for (let i = 0; i < 22; i++) { const a = rand(0, TAU), s = rand(160, 340); put({ x: at.x, y: at.y, z: 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(60, 200), g: 460, drag: 0.03, life: rand(0.5, 0.9), size: rand(5, 8), size1: 3, color: CH.sand, kind: 'star', add: false, vr: 4, fadePow: 2.4 }, sandG); }
        chTick(at.x, at.y, { r: 46, z: 40, col: CH.brass, hand: CH.vio, dir: -1, dur: 0.7 });
        V.shock(at.x, at.y, { r: 150 * S, color: CH.vio, dur: 0.55, w: 5, layer: 'ground' }); }, draw() {} });
      chDial(at.x, at.y, { r: 175 * S, dur: 6, spin: -0.5, a: 0.34, fadeIn: 0.4, fadeOut: 1.2 });
      V.decal(at.x, at.y, { style: 'crack', r: 70 * S, dur: 3, a: 0.3, seed: Math.random() * 6 });
      c.ent._chronoHaste = true; hasteAura(c.ent);   // (it slips the chronomancer into Haste)
      ultParty(c.ent).forEach((w, i) => { if (!w || !Number.isFinite(w.x)) return;
        const d0 = 0.05 + i * 0.06, a = rand(0, TAU), L = rand(46, 64), ox = Math.cos(a) * L, oy = Math.sin(a) * L * 0.6;
        c.later(d0, () => { chTick(w.x, w.y, { r: 20, z: 64, col: CH.brass, dir: -1, dur: 0.75 });
          V.fx({ dur: 0.6, layer: 'air', draw: (cx, p) => { const q = 1 - easeOut(p), k = Math.min(1, p / 0.15 + 0.2); chGhost(cx, w.x + ox * 1.7 * q, w.y + oy * 1.7 * q, 1.3, CH.blue, k * q); chGhost(cx, w.x + ox * q, w.y + oy * q, 1.3, CH.vio, k * (0.7 + 0.6 * q)); },
            done: () => { V.flash(w.x, w.y - 24, 30, CH.pale, 0.16); V.shock(w.x, w.y, { r: 44, color: CH.vio, dur: 0.4, w: 3, layer: 'ground' }); chSandUp(w.x, w.y, 4, { r: 10 }); } }); }); });
    });
  };
  // the boss stutters: a small clock spinning back on it, glass and a tick
  KIT_VFX['chrono-undo'] = Object.assign((e, target) => {
    const t = target || e;
    chDial(t.x, t.y, { r: 130, dur: 1.3, spin: -8, a: 0.8, numerals: false, form: 0.25 });
    chArrows(t.x, t.y, { r: 110, n: 3, dur: 0.8, dir: -1, inward: true });
    V.climax(t.x, t.y, { shape: 'burst', r: 90, n: 12, color: CH.vio, core: '#ffffff', ink: CH.ink, dur: 0.5, hold: 0.08, z: 10 });
    chShards(t.x, t.y, 10, { sp: 1.4, s: 1.2 }); chTick(t.x, t.y, { r: 34, z: 36, col: CH.brass, dir: -1, dur: 0.6 }); shake(4);
  }, { atTarget: true });

  // ---- the auto: a glass dart with one afterimage, a tick where it lands
  if (typeof SPARK !== 'undefined') SPARK.chronomancer = c => { const hand = { x: c.ent.x + Math.cos(c.ang) * 12, y: c.ent.y + Math.sin(c.ang) * 8 };
    chDart(hand.x, hand.y, c.tx, c.ty, { speed: 1000, onHit: (x, y) => { chTick(x, y, { r: 13, z: 18, dur: 0.3 }); chShards(x, y, 3, { s: 0.6, sp: 0.7 }); } }); };

  Object.assign(ABILITY_VFX.chronomancer, CHRONO);
  Object.assign(HLX, { chTick, chShards, chSandUp });
})();

// =====================================================================================================================
// ALEMBIST: glass flasks that arc and shatter, coloured draughts with fumes and bubbles; each potion its own colour and behaviour.
// =====================================================================================================================
(() => {
  const H = HLX, V = VFX, TAU = Math.PI * 2, { put, idrop, igrain, ibub, inkOf, party, shake, cl, rand, handAt } = H;
  const AL = { glass: '#dff4ff', brass: '#c8893a', cork: '#9a6a3a', ink: '#1a1622', salt: '#f4ecd2', blue: '#4fa8ff' };
  const still = e => ({ x: e.x - Math.cos(e.angle || 0) * 16, y: e.y - Math.sin(e.angle || 0) * 16 });
  const RC = { E: '#ff7a2a', D: '#4fc8ff', S: '#efe6cf', Q: '#c9d4e6' };
  const info = r => { try { return alemInfo(r); } catch (e) { return { color: '#4fe0c0', kind: 'heal', name: '' }; } };
  const FLIGHT = (typeof ALEMBIC !== 'undefined' && ALEMBIC.FLIGHT) || 0.4;
  // a flask in local space: a glass belly with the liquid in its lower half, a neck and a cork, all rimmed in ink, a glint on the glass
  function flask(c, col, s, col2) {
    c.save(); c.scale(s, s); c.lineJoin = 'round';
    c.beginPath(); c.ellipse(0, 2, 6.4, 6.8, 0, 0, TAU); c.fillStyle = 'rgba(223,244,255,0.6)'; c.fill();
    c.save(); c.beginPath(); c.ellipse(0, 2, 6, 6.4, 0, 0, TAU); c.clip(); c.fillStyle = col; c.fillRect(-8, 2, 16, 9); if (col2) { c.fillStyle = col2; c.fillRect(0, 2, 8, 9); } c.restore();
    c.lineWidth = 2; c.strokeStyle = AL.ink; c.beginPath(); c.ellipse(0, 2, 6.4, 6.8, 0, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(223,244,255,0.75)'; c.fillRect(-2.3, -8, 4.6, 5); c.strokeRect(-2.3, -8, 4.6, 5);
    c.fillStyle = AL.cork; c.fillRect(-2.9, -11, 5.8, 3.6); c.lineWidth = 1.5; c.strokeRect(-2.9, -11, 5.8, 3.6);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(-3.2, 0.5, 1.1, 2.6, 0, 0, TAU); c.fill();
    c.restore();
  }
  // a splash: droplets of the colour thrown up and out that fall back (opaque, inked), n of them
  const splash = (x, y, col, n, o = {}) => { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(50, 170) * (o.sp ?? 1);
    put({ x, y, z: o.z ?? 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(110, 230) * (o.up ?? 1), g: 560, life: rand(0.5, 0.8), size: rand(11, 16) * (o.s ?? 1), color: col, kind: 'drop', add: false, vr: 0, fadePow: 3 }, idrop(col)); } };
  const bubbles = (x, y, col, n, o = {}) => { for (let i = 0; i < n; i++) put({ x: x + rand(-(o.r ?? 12), o.r ?? 12), y: y + rand(-5, 5), z: rand(2, 14), vx: rand(-6, 6), vz: rand(30, 70), drag: 0.02, life: rand(0.8, 1.4), size: rand(7, 12) * (o.s ?? 1), size1: (o.s ?? 1) * 12, color: col, kind: 'star', add: false, vr: 0, fadePow: 2.4, sway: rand(8, 16), swayW: rand(3, 6) }, ibub(col)); };
  const puffs = (x, y, col, n, o = {}) => { for (let i = 0; i < n; i++) put({ x: x + rand(-(o.r ?? 8), o.r ?? 8), y: y + rand(-4, 4), z: o.z ?? rand(4, 14), vx: rand(-12, 12), vy: rand(-5, 5), vz: rand(20, 46), drag: 0.03, life: rand(0.9, 1.5), size: rand(14, 22) * (o.s ?? 1), size1: rand(30, 46) * (o.s ?? 1), color: col, kind: 'smoke', add: false, a: o.a ?? 0.55, fadeIn: 0.12, fadePow: 2 }); };
  // a pool of the draught on the floor: an ink rim, the colour, a lit crescent, bubbles breaking on it; it spreads in 0.15s, holds, and dries up
  function pool(x, y, col, R, dur, o = {}) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => { const g = easeOut(cl(t / 0.15)), k = e.a * cl((dur - t) / (dur * 0.5)) * (o.a ?? 1), r = R * g * (1 - 0.2 * cl((t - dur * 0.5) / (dur * 0.5)));
      if (k < 0.02) return; c.save(); c.translate(x, y); c.scale(1, 0.58); c.globalAlpha = k;
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 3.4; c.strokeStyle = AL.ink; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 0.8, Math.PI * 1.05, Math.PI * 1.5); c.stroke();
      c.globalAlpha = 0.5 * k; c.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.6; c.beginPath(); c.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, 3 + Math.sin(t * 4 + i) * 1, 0, TAU); c.fill(); }
      c.restore(); }, tick: () => { if (o.bubbles !== false && Math.random() < 0.12) bubbles(x, y, col, 1, { r: R * 0.6, s: 0.7 }); } });
  }
  // the crown of liquid that leaps up round whoever the potion broke on and falls back over them
  const crown = (w, col, s = 1) => { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rand(-0.2, 0.2), d = 18 * s; put({ x: w.x + Math.cos(a) * d, y: w.y + Math.sin(a) * d * 0.55, z: 8, vx: Math.cos(a) * 36, vy: Math.sin(a) * 20, vz: rand(150, 230), g: 520, life: rand(0.5, 0.7), size: rand(9, 12) * s, color: col, kind: 'drop', add: false, fadePow: 3 }, idrop(col)); } };
  // little ink-rimmed pluses rising (a cure)
  const pluses = (x, y, col, n) => { const img = H.spr('pl' + col, 32, (c, s) => { c.translate(s / 2, s / 2); c.fillStyle = col; c.strokeStyle = inkOf(col); c.lineWidth = 2.4; c.beginPath(); const a = s * 0.13, b = s * 0.4; c.moveTo(-a, -b); c.lineTo(a, -b); c.lineTo(a, -a); c.lineTo(b, -a); c.lineTo(b, a); c.lineTo(a, a); c.lineTo(a, b); c.lineTo(-a, b); c.lineTo(-a, a); c.lineTo(-b, a); c.lineTo(-b, -a); c.lineTo(-a, -a); c.closePath(); c.stroke(); c.fill(); });
    for (let i = 0; i < n; i++) put({ x: x + rand(-18, 18), y: y + rand(-6, 6), z: rand(6, 22), vz: rand(50, 90), drag: 0.03, life: rand(0.9, 1.3), size: rand(13, 17), size1: 9, color: col, kind: 'star', add: false, vr: 0, fadePow: 2.4, sway: 8, swayW: 4 }, img); };

  const ALEM = {};
  // ---- the cast pose is already a throw (kits: anim 'cast'); the gather is the still itself (below)
  // ---- the reagents: each its own little beat at the copper still, all quick (about 0.4s)
  //   Ember: a bead of fire drops in and the still spits: sparks, a lick of flame, grey fume
  //   Dew:   a clear drop falls and rings the liquid, bubbles rise and burst
  //   Salt:  a pinch of grains tumbles in, glinting
  function drip(e, col, c) { const s = still(e); put({ x: s.x, y: s.y, z: 82, vz: -40, g: 700, life: 0.16, size: 11, color: col, kind: 'drop', add: false, fadePow: 6 }, idrop(col)); return s; }
  ALEM.ember = c => { const e = c.ent; drip(e, RC.E); c.later(0.14, () => { const s = still(e);
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + rand(-0.7, 0.7); put({ x: s.x, y: s.y, z: 32, vx: Math.cos(a) * rand(40, 90), vy: rand(-12, 12), vz: rand(120, 200), g: 520, life: rand(0.3, 0.5), size: rand(3, 5), size1: 1, color: Math.random() < 0.5 ? '#ffd070' : '#ff8a2a', kind: 'star', add: false, vr: 4 }, igrain(Math.random() < 0.5 ? '#ffb040' : '#ff7a2a')); }
    for (let i = 0; i < 2; i++) put({ x: s.x + rand(-3, 3), y: s.y, z: 32, vz: rand(46, 80), drag: 0.04, life: rand(0.35, 0.5), size: rand(32, 44), size1: 12, color: i ? '#ff8a22' : '#ff4a14', kind: 'flame', add: false, rot: 0, fadePow: 1.3 });
    puffs(s.x, s.y, '#6a605c', 2, { z: 34, s: 0.6, a: 0.4 }); V.flash(s.x, s.y - 30, 26, '#ffb050', 0.14); }); };
  ALEM.dew = c => { const e = c.ent; drip(e, RC.D); c.later(0.14, () => { const s = still(e);
    V.fx({ dur: 0.4, layer: 'air', draw: (cc, p, t, f) => { const k = f.a * cl((1 - p) / 0.5); cc.save(); cc.translate(s.x, s.y - 30); cc.scale(1, 0.4); cc.lineWidth = 4.4; cc.strokeStyle = AL.ink; cc.globalAlpha = k;
      for (let i = 0; i < 2; i++) { const r = 5 + 15 * easeOut(cl(p - i * 0.18)); cc.beginPath(); cc.arc(0, 0, r, 0, TAU); cc.strokeStyle = AL.ink; cc.lineWidth = 4.4; cc.stroke(); cc.strokeStyle = RC.D; cc.lineWidth = 2; cc.stroke(); } cc.restore(); } });
    splash(s.x, s.y, RC.D, 5, { z: 30, up: 0.7, sp: 0.4, s: 0.7 }); bubbles(s.x, s.y, RC.D, 4, { r: 6, s: 0.8 }); }); };
  ALEM.salt = c => { const e = c.ent, s0 = still(e), img = igrain('#f4ecd2');
    for (let i = 0; i < 8; i++) c.later(i * 0.012, () => put({ x: s0.x + rand(-5, 5), y: s0.y + rand(-3, 3), z: 80 + rand(0, 10), vx: rand(-8, 8), vz: -30, g: 640, life: 0.17, size: rand(4.5, 6.5), color: '#f4ecd2', kind: 'star', add: false, vr: rand(-12, 12), fadePow: 8 }, img));
    c.later(0.15, () => { const s = still(e); for (let i = 0; i < 6; i++) put({ x: s.x, y: s.y, z: 32, vx: rand(-34, 34), vy: rand(-12, 12), vz: rand(60, 120), g: 420, life: rand(0.3, 0.45), size: rand(4, 6), color: '#ffffff', kind: 'star', add: false, vr: 6 }, img);
      V.glint(s.x, s.y, { color: '#ffffff', size: 24, z: 34, life: 0.25 }); V.glint(s.x + 7, s.y, { color: '#cfe4ff', size: 15, z: 44, life: 0.22 }); }); };

  // ---- Distill: the still boils over: bubbles come up, a jet of white vapour climbs the chimney, and a bright condensed drop falls back in
  ALEM.distill = c => { const e = c.ent, s = still(e);
    bubbles(s.x, s.y, '#bff6ff', 6, { r: 8, s: 0.9 }); puffs(s.x, s.y, '#eef6f6', 3, { z: 34, s: 0.8, a: 0.6 });
    for (let i = 0; i < 4; i++) c.later(i * 0.05, () => puffs(still(e).x, still(e).y, '#f6fbfb', 1, { z: 40 + i * 14, s: 0.7 + i * 0.1, a: 0.6 }));
    c.later(0.34, () => { const t = still(e); put({ x: t.x, y: t.y, z: 88, vz: -30, g: 600, life: 0.2, size: 12, color: '#bff6ff', kind: 'drop', add: false }, idrop('#bff6ff')); c.later(0.18, () => { splash(t.x, t.y, '#bff6ff', 5, { z: 30, up: 0.6, sp: 0.4, s: 0.7 }); V.glint(t.x, t.y, { color: '#ffffff', size: 22, z: 32 }); }); }); };
  // ---- Grand Batch: four flasks (ember, dew, salt, gold) rise out of the still, circle the alembist a moment, and drop back in
  ALEM.batch = c => { const e = c.ent, cols = [[RC.E], [RC.D], [RC.S], ['#ffd27a']];
    V.fx({ dur: 1.0, layer: 'air', draw: (cc, p, t, f) => { const s = still(e), k = f.a * cl(t / 0.1) * cl((1 - p) / 0.15), up = easeOut(cl(t / 0.3)) * (1 - easeOut(cl((t - 0.72) / 0.28)));
      for (let i = 0; i < 4; i++) { const a = t * 3.4 + i * TAU / 4, x = s.x + (e.x - s.x) * up + Math.cos(a) * 34 * up, y = s.y + (e.y - s.y) * up + Math.sin(a) * 19 * up - 30 - 24 * up - Math.sin(t * 6 + i) * 2;
        cc.save(); cc.translate(x, y); cc.rotate(Math.sin(t * 5 + i) * 0.25); cc.globalAlpha = k; flask(cc, cols[i][0], 1.15); cc.restore(); } } });
    for (let i = 0; i < 4; i++) c.later(0.1 + i * 0.12, () => { const s = still(e); bubbles(s.x, s.y, cols[i][0], 2, { r: 6, s: 0.8 }); puffs(s.x, s.y, cols[i][0], 1, { z: 34, s: 0.6, a: 0.5 }); });
    c.later(0.85, () => { const s = still(e); V.glint(s.x, s.y, { color: '#ffd27a', size: 30, z: 34 }); V.climax(e.x, e.y, { shape: 'ring', r: 80, color: '#ffbe4a', core: '#fff2c4', ink: '#3a2408', dur: 0.5, hold: 0.08, z: 8, after: { embers: 0.4 } }); }); };

  // ---- the vial in the air: a ringed glass flask, spinning, dripping its colour as it goes, a glint at the top of its arc
  function lob(sx, sy, tx, ty, cols, onHit, o = {}) {
    const d = Math.hypot(tx - sx, ty - sy), dur = o.dur ?? FLIGHT, arc = (36 + d * 0.18) * (o.arc ?? 1), s = o.size ?? 1.7, dimg = idrop(cols[0]);
    const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p, z: 22 + Math.sin(p * Math.PI) * arc - p * 14 });
    let last = 0, apex = false;
    V.fx({ dur, layer: 'air', tick: () => { const q = pos(last); if (Math.random() < 0.5) put({ x: q.x, y: q.y, z: q.z, vx: rand(-14, 14), vy: rand(-8, 8), vz: -30, g: 380, life: rand(0.3, 0.45), size: rand(6, 9), color: cols[0], kind: 'drop', add: false, fadePow: 3 }, dimg);
      if (!apex && last >= 0.5) { apex = true; V.glint(q.x, q.y, { color: '#ffffff', size: 20, z: q.z, life: 0.18 }); } },
    draw: (c, p, t, e) => { const q = pos(p), y = q.y - q.z; last = p;
      for (let i = 3; i >= 1; i--) { const b = pos(Math.max(0, p - i * 0.06)); c.globalAlpha = e.a * (0.4 - i * 0.1); c.fillStyle = cols[0]; c.beginPath(); c.arc(b.x, b.y - b.z, 4 - i * 0.7, 0, TAU); c.fill(); }
      c.save(); c.globalAlpha = e.a; c.translate(q.x, y); c.rotate(t * 16); flask(c, cols[0], s, cols[1]); c.restore(); },
    done: () => onHit(tx, ty) });
  }
  // salt crystals: pale prisms with an ink rim that rise out of the floor in a ring and stand for as long as the ward holds, then crumble
  function crystals(x, y, R, dur, col) {
    const cs = Array.from({ length: 8 }, (_, i) => ({ a: i * TAU / 8 + rand(-0.15, 0.15), h: rand(34, 48), w: rand(6.5, 9), at: i * 0.025, ph: rand(0, 6) })).sort((a, b) => Math.sin(a.a) - Math.sin(b.a));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => { c.lineJoin = 'round'; const end = dur - t;
      for (const q of cs) { const g = easeOut(cl((t - q.at) / 0.14)) * cl(end / 0.7), px = x + Math.cos(q.a) * R, py = y + Math.sin(q.a) * R * 0.6, hh = q.h * g, w = q.w * (0.4 + 0.6 * g), k = e.a * (0.55 + 0.45 * Math.max(0, 1 - t / 1.2)); if (g < 0.03) continue;
        c.globalAlpha = k; c.beginPath(); c.moveTo(px - w, py); c.lineTo(px - w * 0.8, py - hh * 0.72); c.lineTo(px, py - hh); c.lineTo(px + w * 0.8, py - hh * 0.72); c.lineTo(px + w, py); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.2; c.strokeStyle = AL.ink; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.moveTo(px - w * 0.55, py - 2); c.lineTo(px - w * 0.45, py - hh * 0.6); c.lineTo(px - w * 0.1, py - hh * 0.78); c.lineTo(px - w * 0.1, py - 2); c.closePath(); c.fill();
        if (Math.sin(t * 3 + q.ph) > 0.92) { c.fillStyle = '#fff'; c.beginPath(); c.arc(px + w * 0.3, py - hh * 0.6, 2, 0, TAU); c.fill(); } }
      c.globalAlpha = 1; }, done: () => { for (let i = 0; i < 8; i++) { const a = i * TAU / 8; put({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R * 0.6, z: 18, vx: rand(-10, 10), vz: rand(10, 40), g: 280, life: 0.6, size: 5, color: '#f4ecd2', kind: 'star', add: false, vr: 4 }, igrain('#f4ecd2')); } } });
  }
  // a clear ink-rimmed bubble of shield round an ally that pops into droplets at its end
  function bubbleOn(w, col, dur) {
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => { const k = e.a * cl(t / 0.1) * cl((dur - t) / 0.2), r = 40 * (0.8 + 0.2 * easeOut(cl(t / 0.2))), x = w.x, y = w.y - 14; c.save(); c.globalAlpha = k;
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(0.75, rgba(col, 0.14)); g.addColorStop(1, rgba(col, 0.3)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.lineWidth = 3.4; c.strokeStyle = AL.ink; c.stroke(); c.lineWidth = 1.5; c.strokeStyle = col; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * 0.8, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); c.restore(); },
      done: () => splash(w.x, w.y - 10, col, 6, { z: 20, sp: 0.6, s: 0.8 }) });
  }
  // a lingering cloud: soft white puffs that billow and drift for its whole life, thinning at its end (steam)
  function cloud(x, y, R, dur, col, follow) {
    V.fx({ dur, layer: 'air', tick: p => { const cx = follow ? follow.x : x, cy = follow ? follow.y : y, T = p * dur; if (Math.random() < 0.4 * cl((dur - T) / 1.4)) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * R * 0.8;
        put({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.6, z: rand(0, 14), vx: rand(-12, 12), vz: rand(10, 24), drag: 0.03, life: rand(1.2, 1.8), size: rand(24, 36), size1: 54, color: col, kind: 'smoke', add: false, a: 0.34, fadeIn: 0.25, fadePow: 2 }); }
      if (Math.random() < 0.06) bubbles(cx + rand(-R, R) * 0.5, cy + rand(-R, R) * 0.3, '#bfe8ec', 1, { s: 0.7 }); }, draw: () => {} });
  }
  // two colours meeting: a rune circle in both, an opaque ring with ink
  function rune(x, y, R, a, b, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * cl(t / 0.15) * cl((dur - t) / 0.6) * (0.35 + 0.65 * Math.max(0, 1 - t / 0.7)), RR = R * (0.7 + 0.3 * easeOut(cl(t / 0.2)));
      c.save(); c.translate(x, y); c.scale(1, 0.6); c.rotate(t * 0.5); c.lineCap = 'round'; c.globalAlpha = k;
      for (let i = 0; i < 6; i++) { const a0 = i * TAU / 6 + 0.06, a1 = a0 + TAU / 6 - 0.12; c.strokeStyle = AL.ink; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, RR, a0, a1); c.stroke(); c.strokeStyle = i % 2 ? b : a; c.lineWidth = 3.4; c.stroke(); }
      for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + 0.5; c.beginPath(); c.arc(Math.cos(q) * RR * 0.62, Math.sin(q) * RR * 0.62, 4, 0, TAU); c.fillStyle = i % 2 ? a : b; c.fill(); c.lineWidth = 1.6; c.strokeStyle = AL.ink; c.stroke(); }
      c.restore(); } });
  }
  // a ring of the draught running out over the floor from a splash: an ink rim and the colour (opaque, so it reads on the pale floor), gone in 0.4s
  function ringWave(x, y, col, R, dur = 0.4) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => { const r = R * easeOut(p), k = e.a * Math.pow(1 - p, 1.2); c.save(); c.translate(x, y); c.scale(1, 0.6); c.globalAlpha = k; c.lineCap = 'round';
      c.strokeStyle = AL.ink; c.lineWidth = 9 * (1 - p * 0.5); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.strokeStyle = col; c.lineWidth = 5 * (1 - p * 0.5); c.stroke(); c.restore(); } });
  }
  // where one recipe broke
  function burst(r, x, y, m, tent, fol) {
    const inf = info(r), col = inf.color, kind = inf.kind, big = r.length === 3, w = tent || { x, y };
    if (r === 'DES') {   // Philosopher's Draught: a lilac burst that rings out across the room
      V.climax(x, y, { shape: 'burst', r: 100, n: 14, color: col, core: '#ffffff', ink: '#2a1840', dur: 0.55, hold: 0.1, after: { embers: 0.4 } }); splash(x, y, col, 14, { s: 1.2 }); pluses(x, y, '#e6c8ff', 6);
      for (let i = 0; i < 3; i++) V.shock(x, y, { r: 260 + i * 90, color: col, dur: 0.8, w: 4 - i, delay: i * 0.12, layer: 'ground' }); return; }
    switch (kind) {
      case 'heal': {
        const R = big ? 150 : 110;
        if (r === 'DE') {   // steam: a white cloud billows up and drifts for its life
          const dur = 9 * m, f = fol ? tent : null; puffs(x, y, '#eef6f6', 8, { r: 30, s: 1.6, a: 0.6 }); splash(x, y, '#dff4f4', 6, { s: 0.9 }); cloud(x, y, 120, dur, '#d8f2f2', f); pluses(x, y, '#9affd8', 3); break; }
        // a cure: a crown of green leaps round the ally, a pool spreads at their feet, bubbles rise out of it, small pluses climb
        crown(w, col, big ? 1.5 : 1.25); splash(x, y, col, big ? 18 : 12, { s: 1.3, sp: 1.3 }); pool(x, y, col, big ? 74 : 60, big ? 2 : 1.5); bubbles(x, y, col, 6, { r: 26 });
        pluses(x, y, shade(col, 0.2), big ? 6 : 4); ringWave(x, y, col, R); V.flash(x, y - 14, 36, '#ffffff', 0.12);
        if (r === 'DDD') cloud(x, y, 150, 6, '#d8f2f2', fol ? tent : null);
        break; }
      case 'bomb': {
        const s = (big ? 1.5 : 1) * 1.25;   // a flask of fire: the glass flies, the draught catches, a fireball, a scorch, smoke
        splash(x, y, '#ff7a2a', 8, { s: 1.1 }); HFX.fireBloom(x, y, { s: 1.8 * s }); HFX.scorch(x, y, 34 * s, 2.4, 0.5); ringWave(x, y, '#ff7a2a', 90 * s, 0.4);
        V.debris(x, y, { n: big ? 7 : 5, hot: true, color: '#5a3a2a' }); if (r === 'EQ') V.lightning(x - 30, y - 10, x + 30, y + 6, { color: '#fff4c0', jag: 10 });
        if (r === 'EES') V.burst(x, y, { color: '#fff070', n: 12, speed: 260, kind: 'star', flash: false });
        shake(big ? 5 : 3); break; }
      case 'ward': {   // salt crystals stand in a circle for the ward's life
        const R = r === 'SSS' ? 160 : 120, dur = (r === 'SSS' ? 8 : 6) * m, ccol = r === 'QQ' ? '#dfe6f2' : '#f4ecd2';
        splash(x, y, ccol, 8, { s: 0.9 }); pool(x, y, ccol, 40, 1.2, { bubbles: false }); crystals(x, y, R * 0.62, dur, ccol); ringWave(x, y, ccol, R, 0.5); ringWave(x, y, AL.blue, R * 0.7, 0.4);
        for (let i = 0; i < 3; i++) V.glint(x + rand(-50, 50), y + rand(-24, 24), { color: '#ffffff', size: 22, z: rand(10, 40), life: 0.3 }); break; }
      case 'salve': {
        crown(w, col, 0.95); splash(x, y, col, 8, { s: 1 }); pool(x, y, col, 54, 1.3); bubbleOn(w, '#7ff0a8', 1.4); bubbles(x, y, col, 4, { r: 20 }); ringWave(x, y, col, 100, 0.45); break; }
      case 'quick': {   // a puff of yellow powder, sparks leaping off it
        puffs(x, y, '#ffd84a', 6, { r: 18, s: 1.3, a: 0.7 }); splash(x, y, '#ffd23a', 6, { s: 0.9 });
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rand(-0.4, 0.4); V.lightning(x, y, x + Math.cos(a) * 90, y + Math.sin(a) * 60, { color: '#fff0a0', jag: 12, dur: 0.22 }); }
        V.burst(x, y, { color: '#ffd23a', color2: '#ffffff', n: 12, speed: 280, kind: 'star', flash: false }); V.shock(x, y, { r: 120, color: '#ffd23a', dur: 0.4, w: 3.4, layer: 'ground' }); break; }
      default: splash(x, y, col, 10, {}); pool(x, y, col, 40, 1.4);
    }
  }
  const glassBurst = (x, y) => { V.flash(x, y - 10, 30, '#ffffff', 0.12); for (let i = 0; i < 8; i++) { const a = rand(0, TAU), s = rand(80, 210); put({ x, y, z: 12, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(60, 190), g: 600, bounce: true, life: rand(0.5, 0.9), size: rand(7, 10), color: '#e8f6ff', kind: 'shard', add: false, vr: rand(-14, 14), fadePow: 3 }); } };
  // Magnum Opus's flask hangs over the party and Kiln bombs go off like a fire bomb with more behind it
  function kilnBlast(x, y) { V.flash(x, y - 14, 90, '#ff7a1a', 0.16); HFX.blast(x, y, { s: 2.1 }); HFX.scorch(x, y, 70, 3.4, 0.55); splash(x, y, '#ff7a1a', 12, { s: 1.3, sp: 1.4 }); V.debris(x, y, { n: 10, hot: true, color: '#5a3a2a' }); V.shock(x, y, { r: 150, color: '#ff9a3a', dur: 0.5, w: 5, layer: 'ground' }); shake(5); }

  Object.assign(KIT_VFX, {
    // a vial thrown (data: { r, p (a Blend's parts), to, en, self, m, fol, kiln }): it arcs to its target and shatters there; a reaction (two reagents)
    // flies as two vials that meet; self: it burst in the bandolier, so it breaks right on the hero
    vial: (e, target, d) => {
      if (!d) return;
      const parts = d.p || [d.r], cols = parts.map(r => info(r).color), m = d.m || 1, rk = typeof d.r === 'string' ? d.r : '';
      const react = parts.length > 1 || !!(typeof ALEMBIC !== 'undefined' && ALEMBIC.reactions && ALEMBIC.reactions[rk]);
      let pair = null;
      if (react) { const ls = [...new Set(rk.split(''))].map(L => RC[L]).filter(Boolean); pair = parts.length > 1 ? [cols[0], cols[1]] : ls.length > 1 ? [ls[0], ls[1]] : [cols[0], shade(cols[0], -0.3)]; }
      const kiln = !!d.kiln;
      const go = (x, y) => {
        glassBurst(x, y);
        if (kiln) { kilnBlast(x, y); return; }
        if (pair) { V.climax(x, y, { shape: 'burst', r: 100, n: 13, color: pair[0], core: '#ffffff', ink: '#1a1020', dur: 0.55, hold: 0.1, after: { embers: 0.4 } }); splash(x, y, pair[1], 8, { s: 1.1 }); rune(x, y, 100, pair[0], pair[1], 1.8); }
        for (const r of (pair ? [...new Set(parts)] : parts)) burst(r, x, y, m, target && target !== e ? target : null, d.fol);
      };
      if (d.self) { splash(e.x, e.y, '#ffb040', 6, {}); go(e.x, e.y); return; }
      const ca = Math.cos(e.angle || 0), sa = Math.sin(e.angle || 0), hx = e.x + ca * 12, hy = e.y + sa * 12, t = target || { x: e.x + ca * 140, y: e.y + sa * 140 };
      if (e.st) e.st.action = { type: 'cast', t0: FX.now, dur: 0.4 };
      // the wind-up of a lob: the still's lid lifts a puff of the colour, a bead on the neck
      { const s = still(e), fc = kiln ? '#ff7a1a' : cols[0]; puffs(s.x, s.y, fc, 1, { z: 34, s: 0.6, a: 0.5 }); if (kiln) { for (let i = 0; i < 5; i++) put({ x: s.x + rand(-6, 6), y: s.y, z: 14, vx: rand(-20, 20), vz: rand(60, 140), g: 120, life: rand(0.3, 0.6), size: rand(3, 5), color: '#ffb040', kind: 'star', add: false }, igrain('#ffb040')); } }
      const land = (x, y) => go(target ? target.x : x, target ? target.y : y);
      if (kiln) { lob(hx, hy, t.x, t.y, ['#ff7a1a', '#ffd08a'], land, { arc: 1.2 }); return; }
      if (pair) { lob(hx - sa * 10, hy + ca * 10, t.x, t.y, [pair[0]], land, { arc: 1.35 }); lob(hx + sa * 10, hy - ca * 10, t.x, t.y, [pair[1]], () => {}, { arc: 0.6 }); return; }
      lob(hx, hy, t.x, t.y, cols, land);
    },
    // a vial finished brewing: the still pops, a ring and a jet of coloured steam out of the chimney
    brew: (e, target, d) => { const col = d ? info(d.r).color : '#ffffff', s = still(e); puffs(s.x, s.y, col, 3, { z: 34, s: 0.8, a: 0.6 }); bubbles(s.x, s.y, col, 4, { r: 8, s: 0.9 }); splash(s.x, s.y, col, 4, { z: 30, up: 0.7, sp: 0.4, s: 0.7 }); V.glint(s.x, s.y, { color: '#ffffff', size: 20, z: 34, life: 0.2 }); },
  });
  // the Ricochet and Leap talent moments keep their look (ability-vfx.js)

  // ---- the auto: a small vial lobbed over, bursting into coloured fizz
  if (typeof SPARK !== 'undefined') SPARK.alembist = c => { const liq = ['#5ff08a', '#ff6a4a', '#4fa8ff'][(Math.random() * 3) | 0], hand = { x: c.ent.x + Math.cos(c.ang) * 12, y: c.ent.y + Math.sin(c.ang) * 8 };
    lob(hand.x, hand.y, c.tx, c.ty, [liq], (x, y) => { glassBurst(x, y); splash(x, y, liq, 5, { s: 0.8, sp: 0.7 }); bubbles(x, y, liq, 2, { r: 8, s: 0.7 }); }, { dur: Math.max(0.2, Math.hypot(c.tx - hand.x, c.ty - hand.y) / 620), size: 1.3, arc: 0.8 }); };

  Object.assign(ABILITY_VFX.alembist, ALEM);
})();

// =====================================================================================================================
// CLERIC leftovers (the pilot did Smite, Mend, Benediction, Intervention's curtain): Prayer Circle, Dawn Petal, the raise and Dawn Breaks, in the
// pilot's material: warm light that falls, soft blooms, motes, a halo that descends; now with opaque, ink-rimmed bodies so the floor does not wash it out
// =====================================================================================================================
(() => {
  const H = HLX, V = VFX, TAU = Math.PI * 2, { put, ipetal, igrain, inkOf, party, shake, cl, rand, handAt, leaf } = H;
  const CG = { gold: '#ffd65a', goldL: '#fff0b0', pale: '#fff8dc', ink: '#3a2a08', pink: '#ffc4da', pinkL: '#ffe4ee', bell: '#f0c040' };
  const LAND = 0.4;
  const impact = (cam, col, a = 0.2, stop = 0.08) => { if (cam) { cam.stop(stop); cam.punch(0.06, 0.5); cam.flash(col, a, 0.32); } };
  const ifeather = col => H.spr('ifea' + col, 40, (x, s) => { x.translate(s / 2, s / 2); x.rotate(-0.5); x.beginPath(); x.moveTo(0, -s * 0.44); x.quadraticCurveTo(s * 0.22, -s * 0.1, s * 0.05, s * 0.36); x.lineTo(-s * 0.04, s * 0.36); x.quadraticCurveTo(-s * 0.22, -s * 0.1, 0, -s * 0.44); x.closePath();
    x.fillStyle = col; x.fill(); x.lineWidth = 2; x.strokeStyle = CG.ink; x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -s * 0.36); x.lineTo(0, s * 0.3); x.stroke(); });
  const motes = (x, y, n, o = {}) => { const g = igrain(CG.goldL); for (let i = 0; i < n; i++) put({ x: x + rand(-(o.r ?? 16), o.r ?? 16), y: y + rand(-6, 6), z: rand(2, 18), vx: rand(-6, 6), vz: rand(36, 80) * (o.rise ?? 1), drag: 0.02, life: rand(1, 1.6), size: rand(4.5, 7), size1: 1.5, color: CG.goldL, kind: 'star', add: false, vr: rand(-2, 2), fadePow: 1.6, sway: rand(8, 16), swayW: rand(3, 6) }, g); };
  // a gold halo: an ink-rimmed ring that forms in the air over a point and sinks down through it (opaque, so it reads over a pale floor)
  function halo(w, o = {}) {
    const dur = o.dur ?? 0.7, R = o.r ?? 26, z0 = o.z0 ?? 110, z1 = o.z1 ?? 6;
    V.fx({ dur, layer: 'air', delay: o.delay, draw: (c, p, t, e) => { const form = easeOut(cl(t / 0.2)), drop = easeOut(cl((t - 0.12) / (dur - 0.12))), z = z0 + (z1 - z0) * drop, rx = R * (0.55 + 0.45 * form) * (1 + 0.25 * drop), k = e.a * cl((dur - t) / 0.2) * cl(t / 0.06), y = w.y - z;
      c.save(); c.translate(w.x, y); c.scale(1, 0.38); c.globalAlpha = k; c.lineCap = 'round'; c.strokeStyle = CG.ink; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.stroke(); c.strokeStyle = CG.gold; c.lineWidth = 3.8; c.stroke(); c.strokeStyle = CG.pale; c.lineWidth = 1.4; c.stroke(); c.restore(); } });
  }
  // a gold bell hanging over the cleric, swinging and tolling; each toll sends a ring out over the party
  function bell(ent, o = {}) {
    const dur = o.dur ?? 1.3, S = o.s ?? 30, tolls = o.tolls || [0.15, 0.6];
    const body = c => { c.beginPath(); c.moveTo(-S * 0.35, S * 0.25); c.quadraticCurveTo(-S * 0.45, 0, 0, 0); c.quadraticCurveTo(S * 0.45, 0, S * 0.35, S * 0.25); c.quadraticCurveTo(S * 0.5, S * 1.05, S * 0.85, S * 1.25); c.lineTo(-S * 0.85, S * 1.25); c.quadraticCurveTo(-S * 0.5, S * 1.05, -S * 0.35, S * 0.25); c.closePath(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => { const k = e.a * cl(t / 0.12) * cl((dur - t) / 0.35), bx = ent.x, by = ent.y - 128 + 6 * (1 - cl(t / 0.2));
      let sw = 0; for (const tt of tolls) if (t >= tt - 0.1) { const d = t - (tt - 0.1); sw += Math.sin(d * 14) * Math.exp(-d * 4) * 0.35; }
      c.save(); c.translate(bx, by); c.rotate(sw); c.globalAlpha = k; c.lineJoin = 'round'; body(c); c.fillStyle = CG.bell; c.fill(); c.strokeStyle = CG.ink; c.lineWidth = 2.6; c.stroke();
      c.strokeStyle = CG.pale; c.lineWidth = 2; c.beginPath(); c.moveTo(-S * 0.18, S * 0.3); c.quadraticCurveTo(-S * 0.3, S * 0.8, -S * 0.55, S * 1.1); c.stroke();
      c.fillStyle = CG.ink; c.beginPath(); c.arc(-sw * S * 0.8, S * 1.38, 3.6, 0, TAU); c.fill(); c.restore(); } });
    for (const tt of tolls) (o.later || ((d, f) => f()))(tt, () => { V.flash(ent.x, ent.y - 128 + S, 36, CG.goldL, 0.16); V.shock(ent.x, ent.y, { r: 180, r0: 30, color: CG.gold, dur: 0.6, w: 3.4, layer: 'ground' }); });
  }
  // a quiet guard on an ally for as long as it works: a thin gold ring at their feet that follows them, a mote lifting off it now and then; at its end it
  // closes in and lets go a handful of motes
  function guard(w, dur) {
    V.fx({ dur, layer: 'ground', tick: () => { if (Math.random() < 0.05) motes(w.x, w.y, 1, { r: 22, rise: 0.8 }); },
      draw: (c, p, t, e) => { const end = dur - t, k = e.a * cl(t / 0.25) * cl(end / 0.7) * (0.55 + 0.45 * Math.max(0, 1 - t / 1.2)), r = 29 * (end < 0.7 ? 0.7 + 0.3 * end / 0.7 : 1);
        c.save(); c.translate(w.x, w.y + 2); c.scale(1, 0.55); c.lineCap = 'round'; c.globalAlpha = k; c.strokeStyle = CG.ink; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.strokeStyle = CG.gold; c.lineWidth = 2.6; c.stroke();
        c.rotate(t * 0.5); c.fillStyle = CG.gold; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 3, 0, TAU); c.fill(); c.lineWidth = 1.4; c.strokeStyle = CG.ink; c.stroke(); } c.restore(); },
      done: () => motes(w.x, w.y, 5, { r: 20 }) });
  }
  // three petals circling low round an ally for the mend's length, brightening at each tick, falling away at the end
  function petalRing(w, dur, ticks) {
    let n = 0, pulse = -9;
    V.fx({ dur, layer: 'air', tick: (p) => { const T = p * dur; if (n < ticks.length && T >= ticks[n]) { n++; pulse = T; motes(w.x, w.y, 3, { r: 14 }); } },
      draw: (c, p, t, e) => { const end = dur - t, k = e.a * cl(t / 0.3) * cl(end / 0.5), fall = end < 0.5 ? (1 - end / 0.5) * 10 : 0, fl = Math.max(0, 1 - (t - pulse) / 0.45);
        c.lineJoin = 'round'; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const a = t * 1.8 + i * TAU / 3, x = w.x + Math.cos(a) * 24, y = w.y + Math.sin(a) * 24 * 0.55 - 8 - fl * 6 + fall;
          c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); c.globalAlpha = k; c.beginPath(); c.ellipse(0, 0, 8.5, 4, 0, 0, TAU); c.fillStyle = i % 2 ? CG.pink : CG.pinkL; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#7a3050'; c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-2, -1, 3, 1.2, 0, 0, TAU); c.fill(); c.restore(); }
        c.globalAlpha = 1; } });
  }

  const CLER = {};
  // ---- Prayer Circle: the bell tolls twice over the party, a bold gold ring rolls out on the first toll; then a curtain of rays falls softly on each ally and
  // leaves a thin gold guard ring at their feet for the 15s (strong at first, then low), closing at its end
  CLER.prayer = c => { const x = c.x, y = c.y;
    bell(c.ent, { dur: 1.3, tolls: [0.15, 0.6], later: c.later });
    c.later(0.2, () => V.climax(x, y, { shape: 'ring', r: 100, color: CG.gold, core: CG.pale, ink: CG.ink, layer: 'ground', flat: 0.7, dur: 0.6, after: { embers: 0.3 } }));
    for (const w of party()) { const d = Math.hypot(w.x - x, w.y - y);
      c.later(0.24 + Math.min(0.4, d / 600), () => { HFX.curtain(w.x, w.y, { n: 4, w: 34, h: 170, dur: 0.6, rw: 5, color: '#ffe680' }); halo(w, { dur: 0.6, r: 20, z0: 90, z1: 4 }); guard(w, 15); }); }
  };
  // ---- Dawn Petal: a pink petal-orb arcs from the staff and lands as a stamped blossom; a thin curtain falls on the ally, pollen of light lifts, and three
  // petals circle low round them for the 15s of mending, brightening at each tick
  let orbN = 0;
  CLER.petal = c => { const w = c.tent || { x: c.tx, y: c.ty }, far = Math.hypot(c.tx - c.x, c.ty - c.y) > 40, hand = handAt(c, 14);
    V.glint(hand.x, hand.y, { color: CG.goldL, size: 20, z: 32 });
    const land = () => {
      // the stamped blossom: six ink-rimmed petals popping open under them
      V.fx({ dur: 0.55, layer: 'ground', draw: (cc, p, t, e) => { const g = easeOut(cl(t / 0.14)) * (1 + 0.14 * Math.sin(cl(t / 0.14) * Math.PI)), k = e.a * cl((1 - p) / 0.4), R = 34 * g; cc.save(); cc.translate(w.x, w.y + 2); cc.scale(1, 0.62); cc.rotate(p * 0.7); cc.lineJoin = 'round';
        for (let i = 0; i < 6; i++) { cc.save(); cc.rotate(i * TAU / 6); cc.beginPath(); cc.moveTo(0, 0); cc.quadraticCurveTo(R * 0.55, -R * 0.5, R, 0); cc.quadraticCurveTo(R * 0.55, R * 0.5, 0, 0); cc.globalAlpha = k; cc.fillStyle = i % 2 ? CG.pink : CG.pinkL; cc.fill(); cc.lineWidth = 1.8; cc.strokeStyle = '#7a3050'; cc.stroke(); cc.restore(); }
        cc.beginPath(); cc.arc(0, 0, R * 0.22, 0, TAU); cc.globalAlpha = k; cc.fillStyle = CG.gold; cc.fill(); cc.lineWidth = 1.6; cc.strokeStyle = CG.ink; cc.stroke(); cc.restore(); } });
      HFX.curtain(w.x, w.y, { n: 3, w: 26, h: 130, dur: 0.5, rw: 5, color: '#ffe9a8' }); halo(w, { dur: 0.5, r: 16, z0: 70, z1: 8 }); motes(w.x, w.y, 6, { r: 16 });
      for (let i = 0; i < 8; i++) put({ x: w.x, y: w.y, z: 8 + i * 4, vx: rand(-40, 40), vy: rand(-20, 20), vz: rand(60, 120), g: 150, life: rand(0.9, 1.3), size: rand(10, 13), color: i % 2 ? CG.pink : CG.pinkL, kind: 'petal', add: false, vr: 5, flutter: 6, fadePow: 2 }, ipetal(i % 2 ? CG.pink : CG.pinkL));
      petalRing(w, 15, [3, 6, 9, 12, 15]);
      if (c.ent.spec === 'aegis' && c.tent) c.later(0.3, () => V.shield(c.tent, { color: '#ffe9a8', dur: 1.4, r: 38 }));
    };
    if (far) { // the orb: a pink sphere with an ink rim and two trailing petals
      const d = Math.hypot(c.tx - hand.x, c.ty - hand.y), dur = Math.max(0.08, d / 1300), sx = hand.x, sy = hand.y, ang = Math.atan2(c.ty - sy, c.tx - sx), pos = p => ({ x: sx + (c.tx - sx) * p, y: sy + (c.ty - sy) * p, z: 22 + Math.sin(p * Math.PI) * 18 });
      V.fx({ dur, layer: 'air', tick: p => { const q = pos(p); if (Math.random() < 0.6) put({ x: q.x, y: q.y, z: q.z, vx: rand(-14, 14), vz: rand(-10, 20), g: 60, life: 0.5, size: rand(9, 12), color: Math.random() < 0.5 ? CG.pink : CG.pinkL, kind: 'petal', add: false, vr: 6, flutter: 6, fadePow: 2 }, ipetal(Math.random() < 0.5 ? CG.pink : CG.pinkL)); },
        draw: (cc, p, t, e) => { const q = pos(p); cc.save(); cc.translate(q.x, q.y - q.z); cc.globalAlpha = e.a; cc.beginPath(); cc.arc(0, 0, 7.5, 0, TAU); cc.fillStyle = CG.pink; cc.fill(); cc.lineWidth = 2.6; cc.strokeStyle = '#7a3050'; cc.stroke(); cc.fillStyle = '#fff'; cc.beginPath(); cc.arc(-2.4, -2.6, 2.2, 0, TAU); cc.fill(); cc.restore(); }, done: land });
    } else land();
  };
  // ---- Intervention: a curtain of rays falls on the ally, a gold halo comes down through them. On a fallen ally it is the raise: six feathers rise in a spiral,
  // the halo sinks into the body, and a bold gold ring and a cross open as they stand; a ring of light motes settles
  CLER.intervene = c => { const w = c.tent || { x: c.tx, y: c.ty }, up = H.raised(c);
    HFX.curtain(w.x, w.y, { n: up ? 11 : 9, w: up ? 96 : 76, h: 330, dur: up ? 1.3 : 1.0, rw: 6, color: '#ffe9a0' });
    halo(w, { dur: up ? 1.0 : 0.7, r: up ? 34 : 26, z0: up ? 150 : 120, z1: 4 });
    const fe = ifeather(CG.goldL);
    for (let i = 0; i < (up ? 10 : 6); i++) c.later(i * 0.05, () => put({ x: w.x, y: w.y, z: 6, life: up ? 1.4 : 1.0, size: rand(14, 18), color: CG.goldL, kind: 'feather', add: false, vr: rand(-3, 3), flutter: 4, vz: rand(60, 110), drag: 0.03, fadePow: 2,
      orbit: { x: w.x, y: w.y, a: i * TAU / 10, r: 36, w: 3.2, dr: -10, flat: 0.55, follow: c.tent || undefined } }, fe));
    c.later(up ? 0.55 : 0.3, () => { V.flash(w.x, w.y - 24, 46, CG.goldL, 0.2); V.shock(w.x, w.y, { r: up ? 110 : 70, color: CG.gold, dur: 0.5, w: 3.4, layer: 'ground' }); motes(w.x, w.y, up ? 14 : 8, { r: 26 }); V.plus(w.x, w.y, { color: '#ffe680', n: up ? 6 : 3 });
      if (up) { V.climax(w.x, w.y, { shape: 'cross', r: 84, color: CG.gold, core: '#ffffff', ink: CG.ink, z: 20, flat: 0.7, dur: 0.65, after: { embers: 0.4 } }); } });
  };
  // ---- Dawn Breaks: a sun of gold with an ink rim and a ring of pointed rays climbs over the cleric (the wind-up); at the impact a pillar of dawn falls on the party
  // (curtains of rays, a gold ring rolling out), every ally gets a halo coming down and three petals circling, and a gold ring with a five-point star stays low for the
  // 12s of regen. The smite on the boss is KIT_VFX['cleric-dawn']
  function sun(x, y, o = {}) {
    const dur = o.dur ?? 1.1, Hh = o.h ?? 150;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => { const rise = 1 - Math.pow(1 - Math.min(1, p / 0.38), 3), k = e.a * cl((1 - p) / 0.4), sy = y - 40 - Hh * rise, R = 20 + 14 * rise;
      c.save(); c.translate(x, sy); c.rotate(t * 0.7); c.globalAlpha = k; c.lineJoin = 'round';
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12, L = R * (i % 2 ? 1.7 : 2.4); c.beginPath(); c.moveTo(Math.cos(a - 0.14) * R * 1.05, Math.sin(a - 0.14) * R * 1.05); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + 0.14) * R * 1.05, Math.sin(a + 0.14) * R * 1.05); c.closePath(); c.fillStyle = i % 2 ? CG.gold : CG.goldL; c.fill(); c.lineWidth = 2; c.strokeStyle = CG.ink; c.stroke(); }
      c.rotate(-t * 0.7); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = CG.goldL; c.fill(); c.lineWidth = 3; c.strokeStyle = CG.ink; c.stroke(); c.beginPath(); c.arc(-R * 0.2, -R * 0.2, R * 0.5, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); c.restore(); } });
  }
  function dawnRing(x, y, R, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * cl(t / 0.3) * cl((dur - t) / 0.8) * (0.3 + 0.7 * Math.max(0, 1 - t / 1.2)), RR = R * (0.8 + 0.2 * easeOut(cl(t / 0.4)));
      c.save(); c.translate(x, y); c.scale(1, 0.6); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = k; c.strokeStyle = CG.ink; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, RR, 0, TAU); c.stroke(); c.strokeStyle = CG.gold; c.lineWidth = 3; c.stroke();
      c.rotate(t * 0.2); c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU * 2 / 5; i ? c.lineTo(Math.cos(a) * RR * 0.9, Math.sin(a) * RR * 0.9) : c.moveTo(Math.cos(a) * RR * 0.9, Math.sin(a) * RR * 0.9); } c.closePath(); c.strokeStyle = CG.ink; c.lineWidth = 4; c.stroke(); c.strokeStyle = CG.gold; c.lineWidth = 1.8; c.stroke(); c.restore(); } });
  }
  CLER.dawnbreaks = c => {
    const at = { x: c.x, y: c.y };
    V.charge(c.x, c.y, { color: CG.goldL, r: 80, n: 10, dur: LAND, follow: c.ent });
    sun(c.x, c.y, { dur: 1.2 }); V.glint(c.x, c.y - 50, { color: '#ffffff', size: 30, z: 40 });
    c.later(LAND, () => {
      impact(c.cam, '#fff2c8', 0.24); shake(6);
      HFX.curtain(at.x, at.y, { n: 13, w: 200, h: 420, dur: 1.2, rw: 7, color: CG.goldL });
      for (let i = 0; i < 3; i++) V.shock(at.x, at.y, { r: 170 + i * 50, color: i ? CG.goldL : '#ffffff', dur: 0.6 + i * 0.1, w: 5 - i, delay: i * 0.08, layer: 'ground' });
      V.climax(at.x, at.y, { shape: 'cross', r: 120, tilt: 0, color: CG.gold, core: '#ffffff', ink: CG.ink, z: 24, flat: 0.7, dur: 0.65, after: { embers: 0.4 } });
      dawnRing(at.x, at.y, 170, 12);
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, s = rand(160, 300); put({ x: at.x, y: at.y, z: 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(80, 200), g: 150, drag: 0.04, life: rand(1.2, 1.8), size: rand(12, 16), color: i % 3 ? CG.pinkL : CG.goldL, kind: 'petal', add: false, vr: rand(-6, 6), flutter: 6, fadePow: 2.2 }, ipetal(i % 3 ? CG.pinkL : CG.goldL)); }
      const list = party(); (list.length ? list : [c.ent]).forEach((w, i) => c.later(0.12 + i * 0.07, () => { if (!w || !Number.isFinite(w.x)) return;
        HFX.curtain(w.x, w.y, { n: 5, w: 40, h: 260, dur: 0.85, rw: 6, color: CG.goldL }); halo(w, { dur: 0.8, r: 24, z0: 130, z1: 4 }); V.shock(w.x, w.y, { r: 44, color: CG.gold, dur: 0.45, w: 3, layer: 'ground' }); petalRing(w, 12, [3, 6, 9, 12]); motes(w.x, w.y, 4, { r: 16 }); }));
    });
  };
  // the smite on the boss: a broad beam from the sky (slimmer than before), a ring of gold spikes round its feet, a seal; a Dawnstar that rose with it (d.s) lands as a second, whiter star
  KIT_VFX['cleric-dawn'] = Object.assign((e, target, d) => {
    const t = target || e, star = d && d.s;
    V.beam(t.x, t.y - 360, t.x, t.y, { color: CG.goldL, w: star ? 12 : 9, dur: 0.45 });
    V.spikeburst(t.x, t.y, { r: star ? 130 : 110, n: 18, color: CG.gold, core: '#fffbe0', ink: CG.ink, dur: 0.45, layer: 'ground', z: 0, flat: 0.6 });
    V.shock(t.x, t.y, { r: 180, color: CG.goldL, dur: 0.55, w: 6, layer: 'ground' });
    V.decal(t.x, t.y, { style: 'crack', r: 56, dur: 3, a: 0.5, seed: Math.random() * 6 });
    if (star) V.burst(t.x, t.y - 30, { color: '#ffffff', color2: CG.goldL, n: 16, speed: 280, kind: 'star', flash: false });
    shake(star ? 6 : 4);
    for (let i = 0; i < 3; i++) put({ x: e.x, y: e.y, z: 26, life: 1.1, size: 13, color: i % 2 ? CG.pinkL : CG.goldL, kind: 'petal', add: false, vr: 4, flutter: 4, orbit: { x: e.x, y: e.y, a: i * TAU / 3, r: 34, w: 3, dr: -10, flat: 0.55, follow: e } }, ipetal(i % 2 ? CG.pinkL : CG.goldL));
  }, { atTarget: true });

  Object.assign(ABILITY_VFX.cleric, CLER);
  Object.assign(HLX, { clHalo: halo, clMotes: motes });
})();

// =====================================================================================================================
// How big a hit or a heal was, in each class's own material. HFX.crit (main.js onMyDamage: your own crit or a hit well above your usual) draws a mark over
// the boss; HFX.healCrit (main.js showHeal: your own critical heal) draws one on the ally. Like the numbers, they are yours alone; both are small and gone in
// about half a second.
// =====================================================================================================================
(() => {
  const H = HLX, V = VFX, TAU = Math.PI * 2, { put, ipetal, igrain, idrop, ibub, leaf, inked, cl, rand } = H;
  const G = { leaf: '#74d84c', leafL: '#c4f27a', ink: '#0d2008', gold: '#ffd66a', cream: '#fff6c8', pink: '#ffb4d0' };
  const sandG = igrain('#f2cf7a');
  // Grovekeeper: two leaves unfurl from a gold bud on a short stem, a bigger one throws petals (tier 2) and rings the floor
  function groveMark(x, y, tier, heal) {
    const s = [0, 1, 1.35, 1.7][tier];
    V.fx({ dur: 0.55, layer: 'air', draw: (c, p, t, e) => { const g = easeOut(cl(t / 0.16)), k = e.a * cl((1 - p) / 0.35), hh = 22 * s * g, cx = x, cy = y - 30;
      c.save(); c.translate(cx, cy); c.globalAlpha = k; c.lineJoin = 'round'; c.lineCap = 'round';
      inked(c, G.ink, G.leaf, 3 * s, () => { c.moveTo(0, 8 * s); c.lineTo(0, -hh * 0.5); });
      for (const sd of [-1, 1]) { c.save(); c.translate(0, -hh * 0.3); c.rotate(sd < 0 ? Math.PI + 0.7 : -0.7); leaf(c, 20 * s * g, 6.5 * s * g, G.leaf, G.ink, G.leafL); c.restore(); }
      c.beginPath(); c.arc(0, -hh * 0.6, 5 * s * g, 0, TAU); c.fillStyle = G.gold; c.fill(); c.lineWidth = 2; c.strokeStyle = '#6a4a10'; c.stroke(); c.restore(); } });
    if (tier >= 2) { V.shock(x, y, { r: 52 * s, color: G.gold, dur: 0.36, w: 3 + tier, layer: 'ground' }); for (let i = 0; i < 4 + tier * 2; i++) { const a = i / (4 + tier * 2) * TAU, sp = rand(70, 130); put({ x, y, z: 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 120), g: 160, life: 0.9, size: rand(10, 13), color: i % 2 ? G.pink : G.gold, kind: 'petal', add: false, vr: 5, flutter: 6, fadePow: 2 }, ipetal(i % 2 ? G.pink : G.gold)); } }
  }
  // Chronomancer: a brass clock face stamped over the target whose hand jumps; a bigger one throws glass and sand
  function chronoMark(x, y, tier) {
    HLX.chTick(x, y, { r: 20 + tier * 5, z: 36, col: '#d9a441', hand: '#8a62e8', dir: -1, dur: 0.55 });
    if (tier >= 2) { V.shock(x, y, { r: 52 * (tier === 2 ? 1 : 1.6), color: '#8a62e8', dur: 0.36, w: 3 + tier, layer: 'ground' }); HLX.chShards(x, y, 4 + tier * 2, { s: 0.8 }); }
    if (tier >= 3) HLX.chSandUp(x, y, 10, { r: 24, rise: 1.4 });
  }
  // Alembist: a flask's worth of draught splashes up over the target in the colour of a random reagent, bubbles rising off it
  function alemMark(x, y, tier) {
    const col = ['#4fe0c0', '#ff7a2a', '#4fa8ff'][(Math.random() * 3) | 0], n = [0, 6, 10, 15][tier];
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(40, 130) * (0.8 + 0.2 * tier); put({ x, y, z: 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 200), g: 520, life: rand(0.45, 0.7), size: rand(9, 13), color: col, kind: 'drop', add: false, fadePow: 3 }, idrop(col)); }
    for (let i = 0; i < 2 + tier; i++) put({ x: x + rand(-14, 14), y: y + rand(-5, 5), z: rand(24, 44), vz: rand(30, 60), drag: 0.02, life: rand(0.7, 1.1), size: rand(8, 12), size1: 13, color: col, kind: 'star', add: false, fadePow: 2.2, sway: 10, swayW: 4 }, ibub(col));
    V.glint(x, y, { color: '#ffffff', size: 24 + tier * 8, z: 34, life: 0.3 });
    if (tier >= 2) V.shock(x, y, { r: 50 * tier, color: col, dur: 0.36, w: 3, layer: 'ground' });
  }
  const crit0 = HFX.crit;
  HFX.crit = function (x, y, cls, o = {}) {
    const id = cls && cls.id, tier = o.tier ?? 1;
    if (id !== 'grovekeeper' && id !== 'chronomancer' && id !== 'alembist') return crit0.apply(this, arguments);
    if (typeof FX !== 'undefined' && FX.muted) return;
    if (id === 'grovekeeper') groveMark(x, y, tier); else if (id === 'chronomancer') chronoMark(x, y, tier); else alemMark(x, y, tier);
  };
  // a critical heal, over the ally it landed on: a Grovekeeper's bloom opens at their feet, a Chronomancer's clock ticks over them, an Alembist's draught
  // bubbles up round them, a Cleric's halo flares and sinks (small: these come often; the number is the headline)
  HFX.healCrit = function (ent, cls, amount) {
    const id = cls && cls.id; if (!ent || typeof FX !== 'undefined' && FX.muted) return;
    const big = amount >= 900, x = ent.x, y = ent.y - (ent.lift || 0);
    if (id === 'grovekeeper') { groveMark(x, y, big ? 2 : 1, true); H.put({ x, y, z: 14, life: 0.7, size: 12, color: G.gold, kind: 'petal', add: false, vz: 70, g: 90, vr: 4, flutter: 5 }, ipetal(G.gold)); }
    else if (id === 'chronomancer') { HLX.chTick(x, y, { r: 17, z: 60, col: '#d9a441', hand: '#8a62e8', dir: -1, dur: 0.5 }); HLX.chSandUp(x, y, big ? 8 : 4, { r: 12 }); }
    else if (id === 'alembist') alemMark(x, y, big ? 2 : 1);
    else if (id === 'cleric') { HLX.clHalo(ent, { dur: 0.55, r: 20, z0: 86, z1: 10 }); HLX.clMotes(x, y, big ? 8 : 5, { r: 14 }); }
  };
})();
