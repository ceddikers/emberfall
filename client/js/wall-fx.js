// Walls: the moment a boss is sealed at an HP gate (fight.js raiseWall), how the seal looks while it holds, and the moment it breaks.
// Presentation only: main.js watches the host's wall label (fb 'wl') and calls up() when it appears and broke() when it clears while the fight is
// live; nothing here touches a timing, a shape or a number.
//
// A wall is never told in words (no title, no caption): it is felt. Each boss plays its own moment (client/js/walls/<boss>.js registers it with
// WallFx.moment), built from the stage below: the camera leaning in, the music held under and let go, a held sound, the boss's body changing, and
// a payoff when it breaks. A boss with no moment of its own gets the plain one at the bottom of this file.
//
//   WallFx.moment(bossId, label | null, m)   m: { up(S), broke(S), floor(c, S, t, age), body(c, S, t, age), quiet(S) } (all optional)
//                                             label null: every wall of that boss without a moment of its own
//   up(bd, label, sc, env) / broke(...)      main.js wallEdge; env { bossId, hard, sound }
//   hold(bd, label, sc, env)                 a wall already up when we arrive (a rejoin, a hidden tab): its look, no moment
//   floor(c, bd, t, age) / body(...)         while it holds: floor() under the telegraphs, body() over the boss
//   reset()                                  the run is left or the fight ends: held sounds stop, the music opens, timers drop
//
// The stage S a moment is handed (one per wall, kept until it breaks):
//   S.bd S.sc S.label S.bossId S.hard S.st (the moment's own state)   S.pt(fwd, side) a point on his body (his facing, the art's scale)
//   S.ring(x, y, o) S.shake(n) S.cam(k, ...a) S.lean(a, rise, hold, fall)   (cam: flash dim punch stop; FX.cam in main.js, soft-capped there)
//   S.play(name, o) S.loop(name, o) (stopped with S.stopLoops(fade) or at the break)   S.muffle(hz, secs) S.swell(a, secs) S.duck(a, secs)
//   S.later(secs, fn) (dropped by reset)   S.shatter(o) the shell flying apart in shards   S.since() seconds since up
//   S.present() 0-1, how much of him is drawn (out of reach he fades to a ghost): anything drawn on his body fades with it
// Rules every moment keeps: nothing covers a telegraph (floor() draws under them; body() stays on his body; anything in the air is thin and brief),
// no floor wash in red or blue (those are the telegraphs' colours), flashes go through S.cam('flash') (capped), the camera's lean is small and short,
// and the music is never held under for long (a dance needs its beat).
// Spawned effects go through VFX.fx / VFX.spawn, which drop them while the tab is hidden (VFX.mute); main.js skips up() and broke() then too (FX.muted).

const WallFx = (() => {
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const shake = n => { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); else if (typeof FX !== 'undefined') FX.shake = Math.max(FX.shake || 0, n); };
  // (the screen moments are your own camera's and soft-capped there: FX.cam in main.js)
  const cam = (k, ...a) => { try { if (typeof FX !== 'undefined' && FX.cam && FX.cam[k]) FX.cam[k](...a); } catch (e) { /* cosmetic */ } };
  const mus = (k, ...a) => { try { if (typeof Sound !== 'undefined' && Sound.music && Sound.music[k]) Sound.music[k](...a); } catch (e) { /* (the music is only a mood) */ } };
  // a floor ring: one that would reach a wall of the room stops at it
  const ring = (x, y, o) => {
    const clip = typeof ARENA !== 'undefined' && ARENA.sd && ARENA.sd(x, y) + (o.r || 80) > -4;
    return VFX.shock(x, y, Object.assign({ flat: 1 }, clip ? { clip: 1 } : null, o));
  };
  const clock = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000);

  // ---- the moments
  const MOMENTS = new Map();   // bossId -> Map(label | '*' -> m)
  function moment(bossId, label, m) {
    if (!MOMENTS.has(bossId)) MOMENTS.set(bossId, new Map());
    MOMENTS.get(bossId).set(label || '*', m || {});
  }
  const find = (bossId, label) => { const b = MOMENTS.get(bossId); return (b && (b.get(label) || b.get('*'))) || PLAIN; };

  // ---- the stage: one per wall
  let live = null;   // the wall that holds now: its stage
  const timers = new Set();
  function stage(bd, label, sc, env) {
    const e = env || {};
    const S = {
      bd, sc: sc || 1.3, label, bossId: e.bossId || '', hard: !!e.hard, sound: !!e.sound, st: {}, t0: clock(), loops: [],
      since: () => clock() - S.t0,
      // how much of him is there to see (0 while he is out of reach and drawn as a ghost, or not drawn at all): a moment's body() fades with it
      present() { const bd = S.bd || {}; return clamp01(((bd.fade ?? 1) - 0.55) / 0.45) * (typeof BOSS_VFX !== 'undefined' && BOSS_VFX.presence ? BOSS_VFX.presence(bd) : 1); },
      // a point on his body: fwd along his facing, side across it (the art's units, scaled as he is drawn)
      pt(fwd = 0, side = 0) { const b = S.bd, f = b.f || 0, c = Math.cos(f), s = Math.sin(f); return { x: b.x + (fwd * c - side * s) * S.sc, y: b.y + (fwd * s + side * c) * S.sc }; },
      ring, shake, cam,
      lean: (a, rise, hold, fall) => cam('lean', a, rise, hold, fall),
      play(name, o) { if (!S.sound || typeof SoundHooks === 'undefined') return false; try { return SoundHooks.play(name, Object.assign({ vol: 1, key: 'wall:' + name, minGap: 0.3 }, o)); } catch (err) { return false; } },
      loop(name, o) {
        if (!S.sound || typeof Sound === 'undefined' || !Sound.loop) return null;
        try { const h = Sound.loop(name, Object.assign({ vol: 0.8, fade: 0.6 }, o)); if (h) S.loops.push(h); return h; } catch (err) { return null; }
      },
      stopLoops(fade = 0.4) { for (const h of S.loops) { try { h.stop(fade); } catch (err) { /* (gone already) */ } } S.loops.length = 0; },
      muffle: (hz, secs) => { if (S.sound) mus('muffle', hz, secs); },
      swell: (a, secs) => { if (S.sound) mus('swell', a, secs); },
      duck: (a, secs) => { if (S.sound) mus('duck', a, secs); },
      later(secs, fn) {
        const id = setTimeout(() => { timers.delete(id); if (typeof FX !== 'undefined' && FX.muted) return; try { fn(); } catch (err) { /* cosmetic */ } }, Math.max(0, secs) * 1000);
        timers.add(id); return id;
      },
      shatter: o => shatter(S, o),
    };
    return S;
  }
  const call = (m, k, ...a) => { if (m && typeof m[k] === 'function') { try { return m[k](...a); } catch (err) { if (typeof console !== 'undefined') console.warn('[wall] ' + k + ': ' + err.message); } } };

  // ---- the bar: it locks as the seal goes up and lets go as it breaks (a look, not words)
  let barTimer = null;
  function bar(cls, ms) {
    const el = typeof document !== 'undefined' ? document.getElementById('boss-bar') : null;
    if (!el) return;
    el.classList.remove('sealing', 'unsealed');
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(barTimer);
    barTimer = setTimeout(() => el.classList.remove(cls), ms);
  }
  function end(fade) {
    if (!live) return;
    live.stopLoops(fade);
    live = null;
  }
  // the run is left, the fight ends, or a new one begins: nothing carries over
  function reset() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    end(0.6);
    clearTimeout(barTimer);
    const el = typeof document !== 'undefined' ? document.getElementById('boss-bar') : null;
    if (el) el.classList.remove('sealing', 'unsealed');
    mus('muffle', 0, 0.8);
  }

  // the seal goes up: the boss's own moment
  function up(bd, label, sc = 1.3, env) {
    if (live) end(0.3);
    const S = live = stage(bd, label, sc, env), m = S.m = find(S.bossId, label);
    bar('sealing', 1300);
    if (bd) call(m, 'up', S);
  }
  // a wall that was up before we could see it go up: only its look and its held sound
  function hold(bd, label, sc = 1.3, env) {
    if (live && live.label === label) return;
    if (live) end(0.3);
    const S = live = stage(bd, label, sc, env), m = S.m = find(S.bossId, label);
    S.t0 -= 9;   // (settled: no growing in)
    call(m, 'quiet', S);
  }
  // the seal breaks: its payoff (the stage of the wall that held, so a moment can finish what it began)
  function broke(bd, label, sc = 1.3, env) {
    let S = live && live.label === label ? live : null;
    if (!S) { S = stage(bd, label, sc, env); S.m = find(S.bossId, label); }
    if (bd) S.bd = bd;
    bar('unsealed', 1300);
    if (live === S) live = null;
    if (bd) call(S.m, 'broke', S);
    S.stopLoops(0.5);
  }

  // ---- while it holds. age: seconds since it went up (it settles in over the first half second)
  function floor(c, bd, t, age = 9) {
    if (!live) return;
    live.bd = bd;
    call(live.m, 'floor', c, live, t, age);
  }
  function body(c, bd, t, age = 9) {
    if (!live) return;
    live.bd = bd;
    call(live.m, 'body', c, live, t, age);
  }

  // ---- shared pieces a moment may use
  // the shell round his body comes apart: curved shards fly out and fall, glass rains. o: { color, edge, n, rx, ry, cy, push }
  function shatter(S, o = {}) {
    const sc = S.sc, x = S.bd.x, y = S.bd.y, rx = (o.rx || 62) * sc, ry = (o.ry || 80) * sc, cy = (o.cy ?? -16) * sc, N = o.n || 11;
    const fill = o.color || '#ffe29a', edge = o.edge || '#fff6d6';
    const frags = Array.from({ length: N }, (_, i) => ({ a0: i * TAU / N, a1: (i + 1) * TAU / N - 0.03, spin: rand(-1.2, 1.2), push: rand(0.8, 1.25) * (o.push || 1) }));
    VFX.fx({ dur: 1.0, layer: 'air', draw: (c, p, t, e) => {
      const fade = Math.pow(1 - p, 1.4) * e.a, d = easeOut(Math.min(1, p / 0.7));
      c.save(); c.translate(x, y + cy);
      for (const f of frags) {
        const am = (f.a0 + f.a1) / 2, ox = Math.cos(am) * rx * 0.92, oy = Math.sin(am) * ry * 0.92;
        const pt = (a, k) => [Math.cos(a) * rx * k - ox, Math.sin(a) * ry * k - oy];
        c.save();
        c.translate(ox + Math.cos(am) * 70 * sc * d * f.push, oy + Math.sin(am) * 85 * sc * d * f.push + p * p * 60 * sc);
        c.rotate(f.spin * p);
        c.beginPath();
        for (let s = 0; s <= 3; s++) { const [px, py] = pt(f.a0 + (f.a1 - f.a0) * s / 3, 1); s ? c.lineTo(px, py) : c.moveTo(px, py); }
        for (let s = 3; s >= 0; s--) { const [px, py] = pt(f.a0 + (f.a1 - f.a0) * s / 3, 0.84); c.lineTo(px, py); }
        c.closePath();
        c.globalAlpha = Math.min(1, fade * 0.32); c.fillStyle = fill; c.fill();
        c.globalAlpha = Math.min(1, fade * 0.9); c.strokeStyle = edge; c.lineWidth = 1.8; c.lineJoin = 'round'; c.stroke();
        c.restore();
      }
      c.restore();
      c.globalAlpha = 1;
    } });
    for (let i = 0; i < (o.bits ?? 28); i++) {
      const a = rand(0, TAU), sp = rand(130, 330);
      VFX.spawn({ x: x + Math.cos(a) * rx * 0.9, y: y + 4 + Math.sin(a) * 18, z: rand(12, 130), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.45, vz: rand(40, 240), g: 520, drag: 0.03,
        life: rand(0.7, 1.1), size: rand(9, 16), color: i % 3 ? fill : '#ffffff', kind: 'shard', add: false, vr: rand(-12, 12) });
    }
  }

  // ---- the plain moment (a boss with none of its own): the gold seal slammed home, a glass skin while it holds, the skin bursting
  const PLAIN = {
    up(S) {
      const x = S.bd.x, y = S.bd.y, sc = S.sc;
      ring(x, y, { r: 360, color: '#ffd27a', w: 11, dur: 0.85 });
      ring(x, y, { r: 210, color: '#fff3c8', w: 6, dur: 0.5, delay: 0.07 });
      VFX.flash(x, y - 50, 170, '#ffe6a8', 0.3);
      VFX.pillar(x, y, { r: 62 * sc, h: 380, color: '#ffd27a', dur: 1.0 });
      VFX.motes(x, y, { color: '#ffe9a0', n: 18, r: 70 * sc, rise: 1, life: 1.5 });
      cam('flash', '#ffe0a0', 0.3, 0.5); cam('dim', 0.3, 0.9); cam('stop', 0.08);
      S.lean(0.04, 0.4, 0.7, 1.2);
      shake(9);
      S.play('wall-up'); S.muffle(700, 0.3); S.later(2.2, () => S.muffle(0, 4));
    },
    broke(S) {
      const x = S.bd.x, y = S.bd.y;
      S.shatter();
      ring(x, y, { r: 330, color: '#ffe9b0', w: 10, dur: 0.7 });
      VFX.flash(x, y - 50, 170, '#fff4d0', 0.22);
      VFX.sparks(x, y - 40, { color: '#fff2c0', n: 22, speed: 520, up: 200 });
      cam('flash', '#fff1c8', 0.22, 0.35); cam('punch', 0.03, 0.45); cam('stop', 0.07);
      shake(11);
      S.play('wall-break'); S.muffle(0, 0.2); S.swell(0.2, 1.4);
    },
    floor(c, S, t, age) { runeRing(c, S.bd.x, S.bd.y, t, S.sc, age, '255,214,120', '255,236,170'); },
    body(c, S, t, age) { glassShell(c, S.bd.x, S.bd.y, t, S.sc, age, '255,214,120', '255,240,190'); },
  };

  // a rune ring on the floor round his feet (faint, under the telegraphs). col / hi: 'r,g,b'
  function runeRing(c, x, y, t, sc = 1.3, age = 9, col = '255,214,120', hi = '255,236,170') {
    const k = easeOut(clamp01(age / 0.5)), R = 82 * sc * (1 + (1 - k) * 0.7), pulse = 0.85 + 0.15 * Math.sin(t * 3);
    c.save(); c.translate(x, y + 8); c.scale(1, 0.4);
    const g = c.createRadialGradient(0, 0, R * 0.3, 0, 0, R);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.75, `rgba(${col},${0.07 * pulse * k})`); g.addColorStop(1, `rgba(${hi},${0.16 * pulse * k})`);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.lineWidth = 2.4; c.strokeStyle = `rgba(${hi},${0.5 * pulse * k})`; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
    c.lineWidth = 1.6; c.strokeStyle = `rgba(${col},${0.34 * k})`; c.setLineDash([16, 11]); c.lineDashOffset = -t * 14;
    c.beginPath(); c.arc(0, 0, R * 0.8, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = `rgba(${hi},${0.5 * k})`;
    for (let i = 0; i < 6; i++) {   // (six facets stand on the rim, turning slowly)
      const a = t * 0.35 + i * TAU / 6, cx = Math.cos(a) * R, cy = Math.sin(a) * R;
      c.save(); c.translate(cx, cy); c.rotate(a + Math.PI / 2);
      c.beginPath(); c.moveTo(0, -9); c.lineTo(5, 3); c.lineTo(-5, 3); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
  }
  // a thin skin of glass over his body, rim and sheen only (the inside is nearly clear, the telegraphs under him still read)
  function glassShell(c, x, y, t, sc = 1.3, age = 9, col = '255,214,120', hi = '255,240,190') {
    const rx0 = 62 * sc, ry0 = 80 * sc, cy = -16 * sc, k = easeOut(clamp01(age / 0.5)), g0 = 1 + (1 - k) * 0.4, pulse = 0.85 + 0.15 * Math.sin(t * 3);
    const rx = rx0 * g0, ry = ry0 * g0;
    c.save(); c.translate(x, y + cy);
    c.save(); c.scale(rx / ry, 1);
    const g = c.createRadialGradient(0, 0, ry * 0.55, 0, 0, ry);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.8, `rgba(${col},${0.07 * pulse * k})`); g.addColorStop(1, `rgba(${hi},${0.26 * pulse * k})`);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, ry, 0, TAU); c.fill();
    c.restore();
    c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.clip();
    const sx = ((t * 0.28) % 1.6 - 0.8) * rx * 2.2, sg = c.createLinearGradient(sx - rx * 0.4, -ry, sx + rx * 0.4, ry);
    sg.addColorStop(0, `rgba(${hi},0)`); sg.addColorStop(0.5, `rgba(${hi},${0.12 * k})`); sg.addColorStop(1, `rgba(${hi},0)`);
    c.fillStyle = sg; c.fillRect(-rx, -ry, rx * 2, ry * 2);
    c.restore();
    c.lineWidth = 2; c.strokeStyle = `rgba(${hi},${0.55 * pulse * k})`;
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.stroke();
    c.lineWidth = 3; c.lineCap = 'round'; c.strokeStyle = `rgba(${hi},${0.7 * k})`;
    for (let i = 0; i < 3; i++) {   // (three bright facets travel round the rim)
      const a = t * 0.45 + i * TAU / 3;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, a, a + 0.55); c.stroke();
    }
    c.restore();
  }

  return { moment, up, hold, broke, floor, body, reset, runeRing, glassShell, PLAIN, get live() { return live; } };
})();
