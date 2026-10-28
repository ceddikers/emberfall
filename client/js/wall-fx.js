// Walls: the moment a boss is sealed at an HP gate (fight.js raiseWall), how the seal looks while it holds, and the moment it breaks.
// Presentation only: main.js watches the host's wall label (fb 'wl') and calls up() when it appears and broke() when it clears while the fight is
// live; nothing here touches a timing, a shape or a number.
//   up(bd, label, sc)      a title with the wall's name, a shockwave and column of light on the boss, the bar locking, a shake and a soft flash
//   broke(bd, label, sc)   the shell bursting into shards, a flash on the bar, a "broken" beat on the title
//   floor / shell          the seal while it holds: floor() is a faint rune ring on the ground (drawn UNDER the telegraphs), shell() a thin glass
//                          skin round the boss's body (rim and sheen only: nothing in it is opaque enough to hide a telegraph)
// Spawned effects go through VFX.fx / VFX.spawn, which drop them while the tab is hidden (VFX.mute); the title and the bar's classes are skipped by the
// caller then too (FX.muted).

const WallFx = (() => {
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const shake = n => { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); else if (typeof FX !== 'undefined') FX.shake = Math.max(FX.shake || 0, n); };
  // (the screen moments are your own camera's and soft-capped there: FX.cam in main.js)
  const cam = (k, ...a) => { try { if (typeof FX !== 'undefined' && FX.cam && FX.cam[k]) FX.cam[k](...a); } catch (e) { /* cosmetic */ } };
  // a floor ring: one that would reach a wall of the room stops at it
  const ring = (x, y, o) => {
    const clip = typeof ARENA !== 'undefined' && ARENA.sd && ARENA.sd(x, y) + (o.r || 80) > -4;
    return VFX.shock(x, y, Object.assign({ flat: 1 }, clip ? { clip: 1 } : null, o));
  };

  // ---- the title and the bar
  let bannerEl = null, bannerTimer = null, barTimer = null;
  function banner(kind, label) {
    if (typeof document === 'undefined' || !document.body) return;
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'wall-banner'; bannerEl.className = 'hidden';
      bannerEl.innerHTML = '<small></small><b></b><i></i>';
      document.body.appendChild(bannerEl);
    }
    bannerEl.querySelector('small').textContent = kind === 'up' ? 'Sealed' : 'Seal broken';
    bannerEl.querySelector('b').textContent = label || '';
    clearTimeout(bannerTimer);
    bannerEl.className = '';
    void bannerEl.offsetWidth;   // (restarts the animation when a second wall follows the first)
    bannerEl.className = kind;
    bannerTimer = setTimeout(() => { bannerEl.classList.add('out'); bannerTimer = setTimeout(() => { bannerEl.className = 'hidden'; }, 800); }, kind === 'up' ? 2600 : 1500);
  }
  function bar(cls, ms) {
    const el = typeof document !== 'undefined' ? document.getElementById('boss-bar') : null;
    if (!el) return;
    el.classList.remove('sealing', 'unsealed');
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(barTimer);
    barTimer = setTimeout(() => el.classList.remove(cls), ms);
  }
  // the run is left (or a new one begins): no title or bar flash carries over
  function reset() {
    clearTimeout(bannerTimer); clearTimeout(barTimer);
    if (bannerEl) bannerEl.className = 'hidden';
    const el = typeof document !== 'undefined' ? document.getElementById('boss-bar') : null;
    if (el) el.classList.remove('sealing', 'unsealed');
  }

  // ---- the shell's size on his body (the art's own scale: RAID_BOSS_SCALE, 1.3 at the time of writing)
  const dims = sc => ({ rx: 62 * sc, ry: 80 * sc, cy: -16 * sc, fr: 80 * sc });

  // the seal goes up: a slam of light from the boss out to the walls, a column rising through him, the screen brought up short
  function up(bd, label, sc = 1.3) {
    banner('up', label);
    bar('sealing', 1300);
    if (!bd) return;
    const x = bd.x, y = bd.y;
    ring(x, y, { r: 360, color: '#ffd27a', w: 11, dur: 0.85 });
    ring(x, y, { r: 210, color: '#fff3c8', w: 6, dur: 0.5, delay: 0.07 });
    ring(x, y, { r: 110, color: '#ffffff', w: 4, dur: 0.32, delay: 0.14 });
    VFX.flash(x, y - 50, 230, '#ffe6a8', 0.4);
    VFX.pillar(x, y, { r: 62 * sc, h: 380, color: '#ffd27a', dur: 1.0 });
    VFX.motes(x, y, { color: '#ffe9a0', n: 18, r: 70 * sc, rise: 1, life: 1.5 });
    VFX.sparks(x, y - 30, { color: '#fff2c0', n: 14, speed: 360, up: 160 });
    cam('flash', '#ffe0a0', 0.3, 0.5);
    cam('dim', 0.3, 0.9);
    cam('punch', 0.025, 0.5);
    shake(9);
  }

  // the seal breaks: the shell comes apart in curved shards that fly out and fall, glass rains, a ring and a white flash
  function broke(bd, label, sc = 1.3) {
    banner('broke', label);
    bar('unsealed', 1300);
    if (!bd) return;
    const x = bd.x, y = bd.y, D = dims(sc), N = 11;
    const frags = Array.from({ length: N }, (_, i) => ({ a0: i * TAU / N, a1: (i + 1) * TAU / N - 0.03, spin: rand(-1.2, 1.2), push: rand(0.8, 1.25) }));
    VFX.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, e) => {
      const fade = Math.pow(1 - p, 1.4) * e.a, d = easeOut(Math.min(1, p / 0.7));
      c.save(); c.translate(x, y + D.cy);
      for (const f of frags) {
        const am = (f.a0 + f.a1) / 2, ox = Math.cos(am) * D.rx * 0.92, oy = Math.sin(am) * D.ry * 0.92;
        const pt = (a, k) => [Math.cos(a) * D.rx * k - ox, Math.sin(a) * D.ry * k - oy];
        c.save();
        c.translate(ox + Math.cos(am) * 70 * sc * d * f.push, oy + Math.sin(am) * 85 * sc * d * f.push + p * p * 60 * sc);
        c.rotate(f.spin * p);
        c.beginPath();
        for (let s = 0; s <= 3; s++) { const [px, py] = pt(f.a0 + (f.a1 - f.a0) * s / 3, 1); s ? c.lineTo(px, py) : c.moveTo(px, py); }
        for (let s = 3; s >= 0; s--) { const [px, py] = pt(f.a0 + (f.a1 - f.a0) * s / 3, 0.84); c.lineTo(px, py); }
        c.closePath();
        c.globalAlpha = Math.min(1, fade * 0.32); c.fillStyle = '#ffe29a'; c.fill();
        c.globalAlpha = Math.min(1, fade * 0.9); c.strokeStyle = '#fff6d6'; c.lineWidth = 1.8; c.lineJoin = 'round'; c.stroke();
        c.restore();
      }
      c.restore();
      c.globalAlpha = 1;
    } });
    for (let i = 0; i < 28; i++) {
      const a = rand(0, TAU), sp = rand(130, 330);
      VFX.spawn({ x: x + Math.cos(a) * D.rx * 0.9, y: y + 4 + Math.sin(a) * 18, z: rand(12, 130), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.45, vz: rand(40, 240), g: 520, drag: 0.03,
        life: rand(0.7, 1.1), size: rand(9, 16), color: i % 3 ? '#ffeab0' : '#ffffff', kind: 'shard', add: false, vr: rand(-12, 12) });
    }
    ring(x, y, { r: 330, color: '#ffe9b0', w: 10, dur: 0.7 });
    ring(x, y, { r: 150, color: '#ffffff', w: 5, dur: 0.38 });
    VFX.flash(x, y - 50, 250, '#fff4d0', 0.32);
    VFX.sparks(x, y - 40, { color: '#fff2c0', n: 22, speed: 520, up: 200 });
    cam('flash', '#fff1c8', 0.4, 0.45);
    cam('punch', 0.03, 0.45);
    cam('stop', 0.07);
    shake(11);
  }

  // ---- the seal while it holds. age: seconds since it went up (it settles in over the first half second)
  // under the telegraphs: a rune ring on the floor round his feet (faint, drawn before the telegraphs' fills so it never sits over a mechanic)
  function floor(c, x, y, t, sc = 1.3, age = 9) {
    const k = easeOut(clamp01(age / 0.5)), R = 82 * sc * (1 + (1 - k) * 0.7), pulse = 0.85 + 0.15 * Math.sin(t * 3);
    c.save(); c.translate(x, y + 8); c.scale(1, 0.4);
    const g = c.createRadialGradient(0, 0, R * 0.3, 0, 0, R);
    g.addColorStop(0, 'rgba(255,214,120,0)'); g.addColorStop(0.75, `rgba(255,214,120,${0.07 * pulse * k})`); g.addColorStop(1, `rgba(255,236,170,${0.16 * pulse * k})`);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.lineWidth = 2.4; c.strokeStyle = `rgba(255,232,160,${0.5 * pulse * k})`; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
    c.lineWidth = 1.6; c.strokeStyle = `rgba(255,214,120,${0.34 * k})`; c.setLineDash([16, 11]); c.lineDashOffset = -t * 14;
    c.beginPath(); c.arc(0, 0, R * 0.8, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = `rgba(255,236,170,${0.5 * k})`;
    for (let i = 0; i < 6; i++) {   // (six facets stand on the rim, turning slowly)
      const a = t * 0.35 + i * TAU / 6, cx = Math.cos(a) * R, cy = Math.sin(a) * R;
      c.save(); c.translate(cx, cy); c.rotate(a + Math.PI / 2);
      c.beginPath(); c.moveTo(0, -9); c.lineTo(5, 3); c.lineTo(-5, 3); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
  }
  // over his body: a thin skin of glass, rim and sheen only (the inside is nearly clear, the telegraphs under him still read)
  function shell(c, x, y, t, sc = 1.3, age = 9) {
    const D = dims(sc), k = easeOut(clamp01(age / 0.5)), g0 = 1 + (1 - k) * 0.4, pulse = 0.85 + 0.15 * Math.sin(t * 3);
    const rx = D.rx * g0, ry = D.ry * g0;
    c.save(); c.translate(x, y + D.cy);
    // the skin: clear in the middle, a little warmer toward the edge
    c.save(); c.scale(rx / ry, 1);
    const g = c.createRadialGradient(0, 0, ry * 0.55, 0, 0, ry);
    g.addColorStop(0, 'rgba(255,214,120,0)'); g.addColorStop(0.8, `rgba(255,214,120,${0.07 * pulse * k})`); g.addColorStop(1, `rgba(255,240,190,${0.26 * pulse * k})`);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, ry, 0, TAU); c.fill();
    c.restore();
    // the sheen: a slow diagonal band crossing the glass, kept inside the rim
    c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.clip();
    const sx = ((t * 0.28) % 1.6 - 0.8) * rx * 2.2, sg = c.createLinearGradient(sx - rx * 0.4, -ry, sx + rx * 0.4, ry);
    sg.addColorStop(0, 'rgba(255,248,220,0)'); sg.addColorStop(0.5, `rgba(255,248,220,${0.12 * k})`); sg.addColorStop(1, 'rgba(255,248,220,0)');
    c.fillStyle = sg; c.fillRect(-rx, -ry, rx * 2, ry * 2);
    c.restore();
    c.lineWidth = 2; c.strokeStyle = `rgba(255,236,170,${0.55 * pulse * k})`;
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.stroke();
    c.lineWidth = 3; c.lineCap = 'round'; c.strokeStyle = `rgba(255,246,210,${0.7 * k})`;
    for (let i = 0; i < 3; i++) {   // (three bright facets travel round the rim)
      const a = t * 0.45 + i * TAU / 3;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, a, a + 0.55); c.stroke();
    }
    c.restore();
  }

  return { up, broke, floor, shell, reset };
})();
