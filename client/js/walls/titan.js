// Hrimgar's wall (wall-fx.js): the moment, never told in words.
//   The Plateau Tips (10%): his fist comes down and the whole glacier groans as it tips under the fight. Cold runs out across the ice, an
//     aurora-green ring after a white one, a column of green light climbs off the floor, and crystals jump up round his feet. Rime then grows
//     over him spike by spike (shoulders and mantle first, the crown last): hoarfrost over his fur, a crystal crown, his eyes burning white,
//     breath hanging in front of him, a faint aurora curling off his head. While he is sealed the plateau has a wind, a thin singing in the ice
//     and now and then a tick of it; a web of frost lies faint on the floor where he stood and a pale ring round his feet. When the last lane has
//     passed the rime bursts: the shell comes apart in shards, the spikes fly off him and fall, a white ring and a green one run out, the music
//     opens, and snow comes down over the whole plateau as the aurora climbs out of the broken ice.
// Everything here is drawn on his body (body), thin and faint under the telegraphs (floor, pale and green, never red or blue), or brief in the air.

(() => {
  if (typeof WallFx === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const K = 1.5;   // (bosses.js titan: in his own arena the art is drawn half as large again)
  const INK = '#041022';
  const LIT = '#f2fbff', MID = '#86c4f2', DARK = '#2a62aa';

  // ---- the rime: crystals standing on his body, in his own units (facing +x). x, y: the base; a: the way it points; len, w; d: when it starts to grow
  function rimeSpikes() {
    const out = [];
    const add = (x, y, a, len, w, d) => out.push({ x, y, a, len, w, d, ph: Math.random() * TAU });
    for (const sy of [-1, 1]) for (let i = 0; i < 4; i++) add(4 + i * 8, sy * (28 + (i === 1 || i === 2 ? 5 : 0)), sy * Math.PI / 2 + (i - 1.5) * 0.3, rand(13, 21), rand(2.6, 3.4), rand(0.02, 0.45));   // the pauldrons
    for (let i = 0; i < 9; i++) add(-32 - (i % 2) * 6, -29 + i * 7, Math.PI + (i - 4) * 0.13, rand(16, 25), rand(2.8, 3.6), rand(0.08, 0.55));   // the mantle
    for (let k = 0; k < 7; k += 2) { const a = -1.1 + k * 0.37; add(18 + Math.cos(a) * 12, Math.sin(a) * 12, a, rand(11, 16), rand(2, 2.5), rand(0.55, 0.95)); }   // the crown
    for (let i = 0; i < 3; i++) add(-2 + (i % 2) * 5, -12 + i * 12, (i - 1) * 0.5, rand(7, 10), rand(2, 2.5), rand(0.3, 0.75));   // the chest
    return out;
  }
  // a frost web on the floor round where he stood: long jagged lines in world units
  function webCracks() {
    return Array.from({ length: 10 }, (_, i) => {
      const a0 = i * TAU / 10 + rand(-0.22, 0.22), len = rand(130, 240), n = 6, pts = [[0, 0]]; let a = a0, x = 0, y = 0;
      for (let j = 1; j <= n; j++) { a += rand(-0.3, 0.3); x += Math.cos(a) * len / n; y += Math.sin(a) * len / n * 0.8; pts.push([x, y]); }
      return { pts, w: rand(1.1, 2) };
    });
  }
  function path(c, pts, g, map) {
    const n = pts.length - 1, upto = g * n;
    c.beginPath();
    for (let j = 0; j <= n && j <= upto + 1; j++) {
      let [x, y] = pts[j];
      if (j > upto) { const [px, py] = pts[j - 1], q = upto - (j - 1); x = px + (x - px) * q; y = py + (y - py) * q; }
      const p = map(x, y); j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y);
    }
  }
  // one crystal: base (x, y), tip (tx, ty): lit facet, shaded side, ink edge (like titan-art.js)
  function crystal(c, x, y, tx, ty, w, lw) {
    const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w;
    const tri = (pts, fill, stroke) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); } };
    tri([x + nx, y + ny, tx, ty, x - nx, y - ny], MID, INK);
    tri([x + nx, y + ny, tx, ty, x + nx * 0.1, y + ny * 0.1], DARK);
    tri([x - nx, y - ny, tx, ty, x + nx * 0.1, y + ny * 0.1], LIT);
  }
  const glowAt = (c, x, y, r, rgb, a) => {
    if (a <= 0.003) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };

  // snow coming down over the plateau (pale flakes turning in the air, a few green motes of the aurora among them)
  const snow = (n) => {
    const R = typeof ARENA !== 'undefined' && ARENA.inner ? ARENA.inner : 520;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), d = Math.sqrt(Math.random()) * R, aur = Math.random() < 0.1;
      VFX.spawn({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, z: rand(120, 320), vx: rand(-16, 16), vy: rand(-6, 10), vz: -rand(34, 68), drag: 0,
        life: rand(3.5, 6), size: rand(2, 4), size1: rand(1, 2), color: aur ? '#7affc8' : '#eef8ff', add: aur, a: aur ? 0.8 : 0.7, flutter: rand(2, 5) });
    }
  };
  // crystals jumping up out of the ice round his feet as the seal rises (brief; the telegraphs of the first lane are seconds away)
  function eruption(S) {
    const x0 = S.bd.x, y0 = S.bd.y, sc = S.sc;
    const cs = Array.from({ length: 11 }, (_, i) => { const a = i * TAU / 11 + rand(-0.2, 0.2), d = rand(95, 150) * sc; return { x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d * 0.75, h: rand(46, 84), w: rand(7, 11), lean: rand(-0.18, 0.18), d: rand(0, 0.2) }; });
    VFX.fx({ dur: 1.5, layer: 'ground', draw: (c, p, t, e) => {
      const tt = p * 1.5;
      for (const k of cs) {
        const up = easeOut(clamp01((tt - k.d) / 0.16)), out = 1 - clamp01((tt - 0.75) / 0.7), h = k.h * up * (0.5 + 0.5 * out);
        if (h < 1) continue;
        c.save(); c.globalAlpha = Math.min(1, out * 1.4) * e.a;
        crystal(c, k.x, k.y, k.x + k.lean * h, k.y - h, k.w, 1.4);
        c.restore();
      }
    } });
  }

  WallFx.moment('titan', 'The Plateau Tips', {
    up(S) {
      const bd = S.bd, st = S.st;
      st.rime = rimeSpikes(); st.web = webCracks(); st.fx = bd.x; st.fy = bd.y;
      S.play('wall-titan-up');
      S.muffle(300, 0.2);
      S.later(1.9, () => S.muffle(2200, 3));   // (the music comes back up, cold and a little far, for the dance)
      S.later(0.9, () => S.loop('wall-titan-wind', { vol: 0.8, fade: 1.4 }));
      S.cam('stop', 0.1); S.cam('flash', '#e6f6ff', 0.32, 0.6); S.cam('dim', 0.3, 1.0);
      S.lean(0.05, 0.9, 0.9, 1.6);   // (a slow lean in, as if the ground tipped)
      S.shake(12);
      S.ring(bd.x, bd.y, { r: 520, color: '#e8f6ff', w: 11, dur: 1.1 });
      S.ring(bd.x, bd.y, { r: 330, color: '#6dffc4', w: 5, dur: 0.85, delay: 0.1 });
      VFX.flash(bd.x, bd.y - 30, 200, '#e6f6ff', 0.3);
      VFX.pillar(bd.x, bd.y, { r: 46 * S.sc, h: 420, color: '#9affd2', dur: 1.4 });
      VFX.sparks(bd.x, bd.y - 20, { color: '#e6f6ff', n: 32, speed: 540, up: 240 });
      VFX.debris(bd.x, bd.y, { color: '#cfeaff', n: 8, speed: 1.2 });
      VFX.smoke(bd.x, bd.y, { color: '#dff0ff', n: 6, size: 36, a: 0.4, speed: 100 });
      eruption(S);
    },
    quiet(S) { const st = S.st; st.rime = rimeSpikes(); st.web = webCracks(); st.fx = S.bd.x; st.fy = S.bd.y; S.loop('wall-titan-wind', { vol: 0.8, fade: 1 }); S.muffle(2200, 1); },
    floor(c, S, t, age) {
      const st = S.st; if (!st.web) return;
      const g = easeOut(clamp01(age / 1.0)), k = clamp01(age / 0.2) * (0.6 + 0.12 * Math.sin(t * 0.9)) * (1 - 0.35 * clamp01((age - 3) / 4));
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      const map = (x, y) => ({ x: st.fx + x, y: st.fy + y });
      for (const cr of st.web) {
        path(c, cr.pts, g, map);
        c.strokeStyle = `rgba(110,255,200,${0.09 * k})`; c.lineWidth = cr.w * 4.5; c.stroke();
        c.strokeStyle = `rgba(236,248,255,${0.26 * k})`; c.lineWidth = cr.w * 0.9; c.stroke();
      }
      c.restore();
      WallFx.runeRing(c, S.bd.x, S.bd.y, t, S.sc * 1.5, age, '150,255,214', '236,255,246');
    },
    body(c, S, t, age) {
      const st = S.st; if (!st.rime) return;
      const pr = S.present(); if (pr <= 0.01) return;
      const bd = S.bd, k = easeOut(clamp01(age / 1.1)) * pr, lw = 1.3 / (S.sc * K);
      c.save(); c.translate(bd.x, bd.y); c.rotate(bd.f || 0); c.scale(S.sc * K, S.sc * K);
      // hoarfrost over the fur: the torso and the mantle go white at the edge
      const g = c.createRadialGradient(0, 0, 8, 0, 0, 40);
      g.addColorStop(0, 'rgba(214,239,255,0)'); g.addColorStop(0.7, `rgba(214,239,255,${0.16 * k})`); g.addColorStop(1, `rgba(246,252,255,${0.4 * k})`);
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 27, 39, 0, 0, TAU); c.fill();
      c.beginPath(); [[-12, -34], [-40, -26], [-52, -6], [-46, 10], [-52, 24], [-34, 34], [-10, 32]].forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      c.fillStyle = `rgba(236,247,255,${0.2 * k})`; c.fill(); c.strokeStyle = `rgba(246,252,255,${0.5 * k})`; c.lineWidth = lw; c.stroke();
      c.save(); c.beginPath(); c.ellipse(0, 0, 27, 39, 0, 0, TAU); c.clip();   // (a sheen drifting over it)
      const sx = ((t * 0.2) % 1.7 - 0.85) * 60, sg = c.createLinearGradient(sx - 16, -40, sx + 16, 40);
      sg.addColorStop(0, 'rgba(246,252,255,0)'); sg.addColorStop(0.5, `rgba(246,252,255,${0.2 * k})`); sg.addColorStop(1, 'rgba(246,252,255,0)');
      c.fillStyle = sg; c.fillRect(-30, -40, 60, 80);
      c.restore();
      c.strokeStyle = `rgba(246,252,255,${0.5 * k})`; c.lineWidth = lw; c.beginPath(); c.ellipse(0, 0, 27, 39, 0, 0, TAU); c.stroke();
      // the crystals
      for (const s of st.rime) {
        const q = easeOut(clamp01((age - s.d) / 0.45)); if (q <= 0.01) continue;
        const L = s.len * q;
        c.save(); c.globalAlpha = pr;
        crystal(c, s.x, s.y, s.x + Math.cos(s.a) * L, s.y + Math.sin(s.a) * L, s.w * (0.6 + 0.4 * q), lw);
        const tw = Math.pow(Math.max(0, Math.sin(t * 1.7 + s.ph)), 14) * q;   // (a glint on the tip now and then)
        if (tw > 0.02) { const tx = s.x + Math.cos(s.a) * L, ty = s.y + Math.sin(s.a) * L; glowAt(c, tx, ty, 6 + 3 * tw, '255,255,255', 0.85 * tw * pr); }
        c.restore();
      }
      // his eyes burn white as the ice takes him, then hold a cold, slow glow
      const flare = Math.max(0, 1 - age / 0.9), e = (0.55 + 0.25 * Math.sin(t * 1.6) + 0.9 * flare) * pr;
      c.globalCompositeOperation = 'lighter';
      for (const sy of [-1, 1]) { glowAt(c, 26, 4.4 * sy, 4.5 + 6 * flare, '230,250,255', 0.5 * e); }
      glowAt(c, 25, 0, 11 + 8 * flare, '190,240,255', 0.14 * e);
      c.globalCompositeOperation = 'source-over';
      for (const sy of [-1, 1]) { c.fillStyle = `rgba(255,255,255,${Math.min(1, 0.85 * e)})`; c.beginPath(); c.arc(26, 4.4 * sy, 2.2, 0, TAU); c.fill(); }
      // breath hanging in front of him
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.45 + i / 4) % 1, mx = 31 + q * 36, my = Math.sin(i * 2.3 + t * 0.8) * 4 * q;
        glowAt(c, mx, my, 5 + q * 10, '236,248,255', 0.3 * (1 - q) * k);
      }
      c.restore();
      // a faint aurora curling off his head: two thin ribbons, green and violet, swaying
      const h = S.pt(18 * K, 0);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      [['110,255,200', -1, 0], ['170,130,255', 1, 1.7]].forEach(([rgb, dir, ph]) => {
        c.beginPath();
        for (let j = 0; j <= 12; j++) { const q = j / 12, x = h.x + dir * (8 + q * 14) + Math.sin(t * 0.9 + ph + q * 3.2) * 10 * q, y = h.y - 40 - q * 78; j ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.strokeStyle = `rgba(${rgb},${0.13 * k})`; c.lineWidth = 7; c.stroke();
        c.strokeStyle = `rgba(236,255,246,${0.2 * k})`; c.lineWidth = 1.4; c.stroke();
      });
      c.restore();
    },
    broke(S) {
      const bd = S.bd, st = S.st, x = bd.x, y = bd.y;
      S.play('wall-titan-break');
      // the rime bursts: the shell in curved shards, and the crystals themselves thrown off him
      S.shatter({ color: '#bfe4ff', edge: '#f6fcff', n: 12, rx: 62, ry: 72, cy: -12, push: 1.1, bits: 34 });
      if (st.rime) {
        const f = bd.f || 0, cf = Math.cos(f), sf = Math.sin(f), sp = S.sc * K;
        const fl = st.rime.map(s => {
          const wx = x + (s.x * cf - s.y * sf) * sp, wy = y + (s.x * sf + s.y * cf) * sp, a = s.a + f, sh = rand(0.8, 1.3);
          return { x: wx, y: wy, a, len: s.len * sp, w: s.w * sp, vx: Math.cos(a) * rand(120, 260) * sh, vy: Math.sin(a) * rand(120, 260) * sh * 0.55, vz: rand(90, 230), spin: rand(-6, 6) };
        });
        VFX.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
          const tt = p * 1.1, fade = Math.min(1, (1 - p) * 2.2) * e.a;
          for (const s of fl) {
            const z = Math.max(0, s.vz * tt - 520 * tt * tt / 2), px = s.x + s.vx * tt * (1 - p * 0.3), py = s.y + s.vy * tt - z;
            c.save(); c.globalAlpha = fade; c.translate(px, py); c.rotate(s.spin * tt);
            crystal(c, 0, 0, Math.cos(s.a) * s.len, Math.sin(s.a) * s.len, s.w * 0.8, 1.3);
            c.restore();
          }
        } });
      }
      S.cam('stop', 0.1); S.cam('flash', '#f4fdff', 0.3, 0.45); S.cam('punch', 0.035, 0.5);
      S.shake(14);
      S.ring(x, y, { r: 580, color: '#f1faff', w: 12, dur: 0.9 });
      S.ring(x, y, { r: 360, color: '#6dffc4', w: 6, dur: 0.7, delay: 0.07 });
      VFX.flash(x, y - 50, 210, '#ffffff', 0.25);
      VFX.sparks(x, y - 40, { color: '#e6f6ff', n: 34, speed: 560, up: 260 });
      VFX.smoke(x, y - 20, { color: '#e2f2ff', n: 8, size: 40, a: 0.45, speed: 120 });
      VFX.pillar(x, y, { r: 52 * S.sc, h: 520, color: '#9affd2', dur: 1.7 });   // (the aurora climbing out of the broken ice)
      S.muffle(0, 0.2); S.swell(0.3, 2.2);
      for (let k = 0; k < 6; k++) S.later(0.3 + k * 0.45, () => snow(15));
    },
  });
})();
