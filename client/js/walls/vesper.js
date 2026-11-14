// Vesper's moments (wall-fx.js' stage, and the room events of arena/bosses/vesper.js): never told in words, only felt.
// The fight is cool and still, so every moment is built the same quiet way: a build-up the player can feel coming, one held beat in which the sound is
// thinned almost to nothing and the floor is bare (the script holds it), then the release, big and short. Silver, frost blue, black water; the only
// warm colour in the whole fight is the one small light of the town far below, which the kill leaves lit alone in the dark.
//
//   THE WALL, Through the Glass (the seam, the turn). The hall is stitched to its glass: each soak the party meets lights the seam a little more and
//     answers with light (the sound lane's bm-vesper-m-soak-met is its note; the rings run out from where the heroes stand and a thread of light crosses the mirror
//     to the same place in the glass). The last soak met is the latch: both rooms' soaks flash, a thread of light is drawn across the seam at each,
//     the seam goes white and taut, and everything else goes away: the music all but stops, the room closes in a little, the camera leans in
//     (the held beat). Then the glass strains (the room's own shiver) and a riser climbs; at the peak the north glass shatters outward in pieces,
//     a pane of light sweeps the hall from the north wall to the east wall as the east glass flies together out of its own shards, the hall's
//     sound comes back in a surge, and the clock stops for a few frames on the instant.
//   THE LINE. The glass is dying (the room's own fade) and a dark closes in from the walls toward her while she walks to the middle; the held beat is a
//     pool of light round her and nothing else; at the plant the clock stops, the dark is thrown back out in a ring of light, cracks run out of the blade
//     across the floor, and the line stands where the tank was.
//   THE EVENFALL DANCE. Each landing is a note a step higher than the last; the breath before the sixth is held; the sixth is the knights' two blades
//     meeting in one crack of light that runs between them and out across the hall.
//   THE ENRAGE. A long dark that closes slowly while one tone climbs; at the land, the floor cracks across and the room goes out.
//   THE KILL. She falls: the music stops, the clock stops, the glass lets go of the light from its far edge, and in the dark a single small warm
//     light far down in the black water stays lit.
// Sound split: the cast builds and the climbing notes of the cuts are the sound lane's (bm-vesper-m-*); the releases, the latch, the held beat's thin tone and the kill are this
// file's (bm-vesper-w-*, sfx-synth.js @@WALL-vesper), and the hall's bed (amb-vesper-hall) is thinned in each held beat (Sound.duckBus, audio.js).
// Everything is drawn from the room events' times (room.ev[k].start), so a rejoin replay (ArenaView.roomEvent with FX.muted) sees the room as it is
// by now and hears nothing: sounds, the camera, the music and the spawned particles only come from a live event.

(() => {
  if (typeof WallFx === 'undefined' || typeof ArenaView === 'undefined' || typeof VS_VIEW === 'undefined') return;
  const TAU = Math.PI * 2, HW = 480, HH = 260;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const smooth = q => { q = clamp01(q); return q * q * (3 - 2 * q); };
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const lerp = (a, b, q) => a + (b - a) * q;
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const SILVER = '223,233,245', FROST = '159,216,255', WATER = '3,6,14';

  const muted = () => typeof FX !== 'undefined' && !!FX.muted;
  const cam = (k, ...a) => { try { if (typeof FX !== 'undefined' && FX.cam && FX.cam[k]) FX.cam[k](...a); } catch (e) { /* cosmetic */ } };
  const bus = (...a) => { try { if (typeof Sound !== 'undefined' && Sound.duckBus) Sound.duckBus('amb', ...a); } catch (e) { /* cosmetic */ } };
  const mus = (k, ...a) => { try { if (typeof Sound !== 'undefined' && Sound.music && Sound.music[k]) Sound.music[k](...a); } catch (e) { /* (the music is only a mood) */ } };
  const play = (name, o) => { try { return typeof SoundHooks !== 'undefined' ? SoundHooks.play(name, Object.assign({ vol: 1, key: 'vsw:' + name, minGap: 0.15 }, o)) : false; } catch (e) { return false; } };
  const loops = [];
  const loop = (name, o) => { try { if (typeof Sound === 'undefined' || !Sound.loop) return null; const h = Sound.loop(name, Object.assign({ vol: 0.8, fade: 0.6 }, o)); if (h) loops.push(h); return h; } catch (e) { return null; } };
  const stopLoops = fade => { for (const h of loops) { try { h.stop(fade); } catch (e) { /* (gone) */ } } loops.length = 0; };

  // ---- the room's own state for the moments (one per raid: room objects are made fresh for each)
  const state = room => room.vsw || (room.vsw = { lit: 0, pulseAt: -99, wall: false, soaks: [], soakAt: -99, answer: null, rounds: 0, queue: [], held: null, shards: null, cracks: {}, pane: null, last: -99 });
  const evAge = (ev, t) => (ev ? t - ev.start : 1e9);
  // the game clock's timers (drawRoomUnder runs them): a Practice Hall slow-down or a stopped tab moves them with the picture; a late one is dropped, never piled up
  const later = (W, now, secs, fn) => { W.queue.push({ at: now + secs, fn }); };
  function runQueue(W, t) {
    if (!W.queue.length) return;
    const due = [], keep = [];
    for (const q of W.queue) (q.at <= t ? due : keep).push(q);
    W.queue = keep;
    for (const q of due) if (t - q.at < 0.6 && !muted()) { try { q.fn(); } catch (e) { /* cosmetic */ } }
  }

  const mirrorOf = room => VS_VIEW.S(room).mirror;
  const ambOf = () => (ArenaView.amb && ArenaView.amb.kind === 'argent' ? ArenaView.amb : null);
  const glassPt = (room, x, y) => VS_VIEW.twinPt(mirrorOf(room), x, y);
  const bossOf = v => (v && v.boss) || null;

  // ---- the live end: what a room event sets off (sounds, camera, music, particles); a replayed event only leaves its state
  const NOTES = [1, 1.4983, 1.9999];   // (the ladder of the wall: a root, its fifth, its octave)
  function onEvent(room, msg, now) {
    const k = msg.k;
    if (typeof k !== 'string' || k.charCodeAt(0) !== 118 || k.charCodeAt(1) !== 115) return;   // 'vs'
    const W = state(room), on = !muted();
    switch (k) {
      // ---------------------------------------------------------------- the wall
      case 'vswallup': W.wall = true; W.lit = 0; W.rounds = 0; W.last = -99; if (on) mus('muffle', 3200, 2.5); break;
      case 'vsround': W.round = { n: msg.n, last: !!msg.last }; break;
      case 'vsroundmet': {
        if (!msg.ok) { W.answer = null; break; }
        const last = !!(W.round && W.round.last);
        W.rounds++; if (!last) W.lit = Math.min(2, W.lit + 1); else W.lit = 3;
        W.pulseAt = now; W.answer = { t0: now, last, n: W.rounds, pts: W.soaks.map(s => ({ x: s.x, y: s.y })) };
        if (on) {
          if (!last) mus('muffle', 2800 - 500 * W.rounds, 0.6);   // (the round's own note is the sound lane's: bm-vesper-m-soak-met)
          else {
            // THE LATCH: the last soak met. The sound all but goes; the held beat follows from the script (vshold) at once
            play('bm-vesper-w-latch', { vol: 1, key: 'vsw:latch' }); W.latchAt = now;
            cam('stop', 0.1); cam('flash', '#e8f2ff', 0.12, 0.35);
            VFX && W.answer.pts.forEach(p => { VFX.flash(p.x, p.y, 120, '#e6f2ff', 0.3); const g = glassPt(room, p.x, p.y); VFX.flash(g[0], g[1], 90, '#b8d8ff', 0.3); VFX.motes(p.x, p.y, { color: '#e6f2ff', n: 6, r: 40, rise: 0.8, life: 1.1 }); });
          }
        }
        break;
      }
      case 'vshold': {
        W.held = { t0: now, dur: msg.dur || 1.6 };
        if (on) {
          // (a held beat the script calls after two missed rounds has no latch of its own: it still begins with one, quieter, so the stillness has an edge to start from)
          if (!(W.latchAt > now - 0.4)) { play('bm-vesper-w-latch', { vol: 0.55, key: 'vsw:latch2' }); cam('flash', '#e8f2ff', 0.08, 0.3); }
          mus('muffle', 420, 0.2); mus('duck', 0.93, (msg.dur || 1.6) + 0.1); bus(0.85, (msg.dur || 1.6));
          later(W, now, 0.35, () => play('bm-vesper-w-hold', { vol: 0.3, key: 'vsw:hold' }));
          cam('lean', 0.04, 1.3, 0.25, 0.9);
        }
        break;
      }
      case 'vsturn': {
        if (on) {
          mus('duck', 0.5, 3.5);   // (the cast's own build is the sound lane's; the music sits under it and comes back at the peak, on the surge)
          later(W, now, 2.6, () => { const bd = W.bd; if (bd) glintAt(W, bd, 0.5); });
        }
        break;
      }
      case 'vsturnpeak': {
        W.wallPeak = now; W.shards = null; W.pane = null;
        if (on) {
          play('bm-vesper-w-turn', { vol: 1, key: 'vsw:turn' });
          cam('stop', 0.12); cam('flash', '#dfeaff', 0.16, 0.5); cam('punch', 0.03, 0.65);
          mus('muffle', 0, 0.3); later(W, now, 0.1, () => mus('swell', 0.32, 1.8));
          const m = ambOf();
          if (m) for (let i = 0; i < 26; i++) VFX.spawn({ x: rand(-HW, HW), y: -HH + rand(-30, 20), z: rand(10, 90), vx: rand(-30, 30), vy: rand(-170, -30), vz: rand(30, 170), g: 260, drag: 0.04, life: rand(0.8, 1.5), size: rand(6, 13), color: i % 3 ? '#cfe2ff' : '#ffffff', kind: 'shard', add: false, vr: rand(-10, 10) });
        }
        break;
      }
      // Hard: the glass lets go of one hero and takes the one left behind. A small beat of its own at the moment it happens: the seam pulses, rings close on the heroes taken and open on the ones let go
      case 'vswall2': {
        const at = +msg.at || 3;
        W.trade = { t0: now + at, out: (msg.out || []).slice(), ids: (msg.ids || []).slice() };
        if (on) later(W, now, at, () => { play('bm-vesper-w-trade', { vol: 0.8, key: 'vsw:trade' }); mus('duck', 0.4, 0.7); W.pulseAt = W.trade.t0; });
        break;
      }
      case 'vswalldown': W.wall = false; if (on) { later(W, now, 0.2, () => play('bm-vesper-w-breath', { vol: 0.7, key: 'vsw:breath' })); } break;

      // ---------------------------------------------------------------- the line
      case 'vsline0': {
        W.lineT = now; W.lineDone = false;
        if (on) { play('bm-vesper-w-dark', { vol: 0.6, key: 'vsw:dark' }); mus('muffle', 1500, 1.4); }
        break;
      }
      case 'vslinehold': {
        if (on) { mus('muffle', 420, 0.2); mus('duck', 0.92, (msg.dur || 1.6) + 0.1); bus(0.85, (msg.dur || 1.6)); cam('lean', 0.04, 1.2, 0.3, 0.8); later(W, now, 0.3, () => play('bm-vesper-w-hold', { vol: 0.3, key: 'vsw:hold' })); }
        break;
      }
      case 'vsline': {
        W.plant = { t0: now, nx: msg.nx, ny: msg.ny, px: msg.px, py: msg.py, cracks: null }; W.lineDone = true;
        if (on) {
          play('bm-vesper-w-plant', { vol: 1, key: 'vsw:plant' });
          cam('stop', 0.14); cam('flash', '#e8f2ff', 0.14, 0.4); cam('punch', 0.035, 0.6);
          mus('muffle', 0, 0.25); later(W, now, 0.1, () => mus('swell', 0.3, 1.6));
          const bd = W.bd, p = plantPt(bd, msg);
          VFX.flash(p.x, p.y - 10, 150, '#e6f2ff', 0.3);
          for (let i = 0; i < 18; i++) VFX.spawn({ x: p.x + rand(-30, 30), y: p.y + rand(-8, 8), z: rand(4, 40), vx: rand(-220, 220), vy: rand(-80, 60), vz: rand(60, 220), g: 380, drag: 0.04, life: rand(0.7, 1.2), size: rand(5, 11), color: i % 3 ? '#cfe2ff' : '#ffffff', kind: 'shard', add: false, vr: rand(-10, 10) });
        }
        break;
      }
      case 'vsgkstep': if (on) { play('bm-vesper-w-step', { vol: 0.8, key: 'vsw:step' }); W.gk = { t0: now }; } break;
      case 'vslineend': if (on) { mus('swell', 0.22, 1.2); } break;

      // ---------------------------------------------------------------- the dance
      case 'vsdance': {
        W.dance = { t0: now, lands: (msg.lands || []).slice() };
        // (the climbing scale of the cuts is the sound lane's: bm-vesper-m-cut-draw / -cut)
        break;
      }
      case 'vscut': {
        // the breath before the sixth: the music all but goes from the fifth landing to the last
        if (on && msg.n === 5 && W.dance) later(W, now, (msg.at || 1.7) + 0.05, () => { mus('muffle', 600, 0.15); mus('duck', 0.9, 1.4); bus(0.8, 1.4); play('bm-vesper-w-hold', { vol: 0.25, key: 'vsw:hold2' }); });
        break;
      }
      case 'vsdancepeak': {
        W.peak = { t0: now };
        if (on) {
          play('bm-vesper-w-peak', { vol: 0.8, key: 'vsw:peak' });
          cam('stop', 0.15); cam('flash', '#e8f2ff', 0.14, 0.4); cam('punch', 0.04, 0.6);
          mus('muffle', 0, 0.25); later(W, now, 0.1, () => mus('swell', 0.3, 1.6));
        }
        break;
      }

      // ---------------------------------------------------------------- the enrage
      case 'vsenrage': {
        W.enrage = { t0: now, dur: msg.dur || 8 };
        if (on) { mus('muffle', 600, (msg.dur || 8) * 0.9); mus('duck', 0.35, (msg.dur || 8)); }   // (the cast's own build is the sound lane's)
        break;
      }
      case 'vsenrageland': {
        W.land = { t0: now };
        if (on) {
          play('bm-vesper-w-enrage-land', { vol: 1, key: 'vsw:land' });
          cam('stop', 0.2); cam('flash', '#e8f2ff', 0.18, 0.4); cam('punch', 0.045, 0.7);
          mus('muffle', 0, 0.2); mus('duck', 0.95, 3); bus(0.8, 3);
        }
        break;
      }

      // ---------------------------------------------------------------- the kill
      case 'vsfall': {
        W.fall = { t0: now };
        if (on) {
          stopLoops(0.3);
          play('bm-vesper-w-fall', { vol: 1, key: 'vsw:fall' });
          mus('muffle', 500, 0.3); mus('duck', 0.97, 4.5); bus(0.9, 4.5);
          cam('stop', 0.18); cam('lean', 0.05, 0.7, 1.2, 1.6);
          const bd = W.bd;
          if (bd) for (let i = 0; i < 22; i++) VFX.spawn({ x: bd.x + rand(-26, 26), y: bd.y + rand(-10, 10), z: rand(20, 150), vx: rand(-60, 60), vy: rand(-30, 20), vz: rand(10, 110), g: 120, drag: 0.05, life: rand(1.3, 2.4), size: rand(5, 12), color: i % 3 ? '#cfe2ff' : '#ffffff', kind: 'shard', add: false, vr: rand(-8, 8) });
        }
        break;
      }
    }
  }

  // where her blade goes into the floor at the plant (a little in front of her, along her facing)
  function plantPt(bd, msg) {
    if (!bd) return { x: msg && msg.px || 0, y: msg && msg.py || 0 };
    const f = bd.f || 0; return { x: bd.x + Math.cos(f) * 62, y: bd.y + Math.sin(f) * 62 + 14 };
  }
  // a hard small glint on her visor (the head's place on her body)
  function headPt(bd) { return { x: bd.x + 4, y: bd.y - 140 }; }
  function glintAt(W, bd, a) { if (!bd || muted()) return; const h = headPt(bd); VFX.flash(h.x, h.y, 46, '#ffffff', 0.35); VFX.sparks(h.x, h.y, { color: '#e6f2ff', n: 5, speed: 140, up: 40 }); }

  // ================================================================== drawing
  const additive = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
  const vignette = (ctx, k, cx, cy, rIn, rOut, col = WATER) => {
    if (k <= 0.004) return;
    ctx.save(); ctx.beginPath(); ctx.rect(-HW - 60, -HH - 60, 2 * HW + 120, 2 * HH + 120); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy, Math.max(1, rIn), cx, cy, Math.max(rIn + 1, rOut));
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${Math.min(1, k)})`);
    ctx.fillStyle = g; ctx.fillRect(-HW - 60, -HH - 60, 2 * HW + 120, 2 * HH + 120); ctx.restore();
  };
  // a jagged hairline from (x0, y0) toward angle a, n segments of length len, wandering
  function jag(x0, y0, a, n, len, wob, seed) {
    const pts = [[x0, y0]]; let x = x0, y = y0, ang = a;
    for (let i = 0; i < n; i++) { ang += (hash(i + seed * 17, seed) - 0.5) * wob; x += Math.cos(ang) * len * (0.7 + 0.6 * hash(i, seed + 3)); y += Math.sin(ang) * len * (0.7 + 0.6 * hash(i + 5, seed + 1)); pts.push([x, y]); }
    return pts;
  }
  function crackSet(x0, y0, n, len, segs, seed, spread = TAU) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (spread === TAU ? i * TAU / n : (i / (n - 1) - 0.5) * spread) + (hash(i, seed) - 0.5) * 0.35, L = len * (0.7 + 0.5 * hash(i, seed + 9));
      out.push({ pts: jag(x0, y0, a, segs, L / segs, 0.7, seed + i), w: 0.7 + hash(i, seed + 2) * 0.9 });
      if (hash(i, seed + 4) < 0.6) { const b = out[out.length - 1].pts, m = b[Math.floor(segs / 2)], fa = a + (hash(i, seed + 5) < 0.5 ? 0.8 : -0.8); out.push({ pts: jag(m[0], m[1], fa, Math.ceil(segs * 0.45), L / segs * 0.8, 0.8, seed + i + 40), w: 0.55 }); }
    }
    return out;
  }
  // a set of cracks drawn grown to g (0-1) of its length, glow then core; k: how lit
  function drawCracks(ctx, set, g, k, glowCol = FROST) {
    if (k <= 0.01 || g <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const c of set) {
      const n = c.pts.length - 1, upto = g * n;
      ctx.beginPath();
      for (let j = 0; j <= n && j <= upto + 1; j++) {
        let [x, y] = c.pts[j];
        if (j > upto) { const [px, py] = c.pts[j - 1], q = upto - (j - 1); x = px + (x - px) * q; y = py + (y - py) * q; }
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(${glowCol},${0.32 * k})`; ctx.lineWidth = c.w * 4.5; ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * k})`; ctx.lineWidth = c.w * 1.3; ctx.stroke();
    }
    ctx.restore();
  }

  // ---- the wall: the seam, the answers, the held beat
  function seamLine(ctx, t, level, taut) {
    if (level <= 0.01) return;
    additive(ctx, () => {
      const a = level, sh = taut ? 0.7 + 0.3 * Math.sin(t * 61) * Math.sin(t * 13) : 1;
      let g = ctx.createLinearGradient(0, -HH - 22, 0, -HH + 22); g.addColorStop(0, `rgba(${FROST},0)`); g.addColorStop(0.5, `rgba(${SILVER},${0.34 * a * sh})`); g.addColorStop(1, `rgba(${FROST},0)`);
      ctx.fillStyle = g; ctx.fillRect(-HW, -HH - 22, 2 * HW, 44);
      ctx.fillStyle = `rgba(255,255,255,${0.9 * a * sh})`; ctx.fillRect(-HW, -HH - (taut ? 0.8 : 1.3), 2 * HW, taut ? 1.6 : 2.6);
      glow(ctx, -HW, -HH, 40, '#ffffff', 0.5 * a); glow(ctx, HW, -HH, 40, '#ffffff', 0.5 * a);
    });
  }
  function answerDraw(ctx, room, t, A) {
    const age = t - A.t0, last = A.last;
    if (age > (last ? 1.8 : 1.2)) return;
    const m = mirrorOf(room);
    additive(ctx, () => {
      for (const p of A.pts) {
        const g = VS_VIEW.twinPt(m, p.x, p.y);
        for (const [dly, R, w, a0, x, y] of [[0, last ? 230 : 150, 3.2, 0.85, p.x, p.y], [0.12, last ? 150 : 90, 2, 0.6, p.x, p.y], [0.05, last ? 210 : 130, 2.4, 0.5, g[0], g[1]]]) {
          const q = (age - dly) / (last ? 0.85 : 0.65); if (q <= 0 || q >= 1) continue;
          const r = 30 + (R - 30) * easeOut(q), al = Math.pow(1 - q, 1.6) * a0;
          ctx.lineWidth = w; ctx.strokeStyle = `rgba(${SILVER},${al})`; ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, TAU); ctx.stroke();
          ctx.lineWidth = w * 3; ctx.strokeStyle = `rgba(${FROST},${al * 0.25})`; ctx.stroke();
        }
        // the thread across the mirror, from the soak in the hall to its place in the glass
        const ta = last ? (1 - smooth((age - 0.5) / 1.2)) : (1 - smooth(age / 0.7));
        const ramp = smooth(age / 0.12);
        if (ta > 0.01) {
          const x0 = p.x, y0 = p.y, x1 = g[0], y1 = g[1], tipQ = smooth(age / 0.16);
          const gx = x0 + (x1 - x0) * tipQ, gy = y0 + (y1 - y0) * tipQ;
          ctx.lineCap = 'round';
          ctx.strokeStyle = `rgba(${FROST},${0.3 * ta * ramp})`; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(gx, gy); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.95 * ta * ramp})`; ctx.lineWidth = 1.8; ctx.stroke();
        }
        if (age < 0.5) { glow(ctx, p.x, p.y, 90, '#e6f2ff', 0.5 * (1 - age / 0.5)); glow(ctx, g[0], g[1], 70, '#b8d8ff', 0.4 * (1 - age / 0.5)); }
      }
    });
  }

  // ---- the turn: the north glass shatters outward, the east glass comes together, a pane of light sweeps the hall
  function triGrid(g, cols, rows, seed) {
    const P = [];
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
      const edge = r === 0 || r === rows || c === 0 || c === cols;
      P.push([g.x0 + g.w * (c / cols) + (edge ? 0 : (hash(r * 31 + c, seed) - 0.5) * g.w / cols * 0.7), g.y0 + g.h * (r / rows) + (edge ? 0 : (hash(r * 17 + c, seed + 1) - 0.5) * g.h / rows * 0.7)]);
    }
    const T = [], at = (r, c) => P[r * (cols + 1) + c];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const a = at(r, c), b = at(r, c + 1), d = at(r + 1, c), e = at(r + 1, c + 1);
      if (hash(r * 7 + c, seed + 2) < 0.5) { T.push([a, b, e]); T.push([a, e, d]); } else { T.push([a, b, d]); T.push([b, e, d]); }
    }
    return T.map((tri, i) => {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      return { tri, cx, cy, i, vr: (hash(i, seed + 6) - 0.5) * 2.2, sp: 0.6 + hash(i, seed + 7), off: hash(i, seed + 8) };
    });
  }
  function drawShard(ctx, g, s, dx, dy, rot, sc, a) {
    if (a <= 0.01) return;
    const xs = s.tri.map(p => p[0]), ys = s.tri.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys), sx = g.cv.width / g.w, sy = g.cv.height / g.h;
    ctx.save(); ctx.translate(s.cx + dx, s.cy + dy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = a;
    ctx.beginPath(); s.tri.forEach(([x, y], j) => { j ? ctx.lineTo(x - s.cx, y - s.cy) : ctx.moveTo(x - s.cx, y - s.cy); }); ctx.closePath();
    ctx.save(); ctx.clip();
    ctx.drawImage(g.cv, (x0 - g.x0) * sx, (y0 - g.y0) * sy, (x1 - x0) * sx, (y1 - y0) * sy, x0 - s.cx, y0 - s.cy, x1 - x0, y1 - y0);
    ctx.restore();
    ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(230,242,255,${0.7 * a})`; ctx.stroke();
    ctx.restore();
  }
  function turnDraw(ctx, room, t, W) {
    const age = t - W.wallPeak; if (age < 0 || age > 2.4) return;
    const am = ambOf(); if (!am) return;
    if (!W.shards) W.shards = { n: triGrid(am.north, 9, 5, 3), e: triGrid(am.east, 9, 5, 8) };
    // the old glass: gone in pieces, west end first, outward and up
    const gn = am.north;
    for (const s of W.shards.n) {
      const dly = 0.04 + (s.cx + 540) / 1080 * 0.32, q = (age - dly) / 1.0; if (q <= 0) continue; if (q >= 1) continue;
      const e = easeOut(q), dist = Math.hypot(s.cx, s.cy + HH) + 1, ux = s.cx / dist, uy = (s.cy + HH) / dist;
      drawShard(ctx, gn, s, ux * 150 * s.sp * e, uy * 120 * s.sp * e - 60 * e * e, s.vr * q * 1.3, 1 + 0.18 * q, Math.pow(1 - q, 1.4) * 0.95);
    }
    // the new glass: its pieces fly in from the far side and fit
    const ge = am.east;
    for (const s of W.shards.e) {
      const dly = 0.3 + (s.cx - HW) / 960 * 0.5, q = (age - dly) / 0.95; if (q <= 0 || q >= 1) continue;
      const e = easeOut(q), inv = 1 - e;
      drawShard(ctx, ge, s, 300 * s.sp * inv, (hash(s.i, 4) - 0.5) * 200 * inv, s.vr * inv * 2.4, 1 + 0.25 * inv, Math.sin(Math.min(1, q * 1.2) * Math.PI * 0.5) * (1 - 0.5 * q) * 0.9);
    }
    // the pane of light: swings from the north wall across the hall to the east wall about the north-east corner
    const u = smooth(age / 0.95);
    if (age < 1.25) {
      const px = HW, py = -HH, phi = Math.PI - (Math.PI / 2) * u, R = 1150, fade = age < 0.95 ? 1 : 1 - (age - 0.95) / 0.3;
      ctx.save(); ctx.beginPath(); ctx.rect(-HW, -HH, 2 * HW, 2 * HH); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const span = 0.55 + 0.35 * Math.sin(u * Math.PI), N = 22;
      for (let i = 0; i < N; i++) {
        const a0 = phi + (i / N) * span, a1 = phi + ((i + 1) / N) * span, al = Math.pow(1 - i / N, 2.2) * 0.13 * fade;
        ctx.fillStyle = `rgba(${SILVER},${al})`; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a0) * R, py + Math.sin(a0) * R); ctx.lineTo(px + Math.cos(a1) * R, py + Math.sin(a1) * R); ctx.closePath(); ctx.fill();
      }
      ctx.lineCap = 'round';
      const ex = px + Math.cos(phi) * R, ey = py + Math.sin(phi) * R;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(${FROST},${0.22 * fade})`; ctx.lineWidth = 22; ctx.stroke();
      ctx.strokeStyle = `rgba(${SILVER},${0.6 * fade})`; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.98 * fade})`; ctx.lineWidth = 2.2; ctx.stroke();
      // glints running along the edge, and the hinge
      for (let i = 0; i < 7; i++) { const d = ((age * 1.6 + i / 7 + hash(i, 2) * 0.1) % 1) * 1000, gx = px + Math.cos(phi) * d, gy = py + Math.sin(phi) * d; glow(ctx, gx, gy, 20, '#ffffff', 0.55 * fade); }
      glow(ctx, px, py, 90, '#ffffff', 0.55 * fade);
      ctx.restore();
    }
  }

  // ---- the line
  function lineDraw(ctx, room, t, ev, W, bd) {
    const L0 = ev.vsline0, H = ev.vslinehold, P = W.plant;
    let k = 0;
    if (L0 && W.lineT === L0.start) k = smooth((t - L0.start) / 1.7);
    if (P && t >= P.t0) k *= 1 - smooth((t - P.t0) / 0.8);
    if (k > 0.004) {
      const cx = bd ? bd.x : 0, cy = bd ? bd.y - 30 : 0, R0 = 520 - 360 * k;   // (the dark closes from the walls toward her)
      vignette(ctx, 0.58 * k, cx, cy, R0 * 0.55, R0 + 160);
    }
    if (P) {
      const age = t - P.t0; if (age < 0 || age > 2.6) return;
      const p = plantPt(bd, P);
      if (!P.cracks) P.cracks = crackSet(p.x, p.y, 8, 400, 7, 5 + ((P.t0 * 10) | 0) % 7);
      // the dark thrown back: a ring of light runs out across the floor
      const q = age / 0.9;
      if (q < 1) additive(ctx, () => { const r = 40 + 760 * easeOut(q), al = Math.pow(1 - q, 1.5); ctx.lineWidth = 5; ctx.strokeStyle = `rgba(${SILVER},${0.5 * al})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.62, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 14; ctx.strokeStyle = `rgba(${FROST},${0.2 * al})`; ctx.stroke(); glow(ctx, p.x, p.y, 150 * (1 - q * 0.5), '#ffffff', 0.6 * (1 - q)); });
      drawCracks(ctx, P.cracks, easeOut(clamp01(age / 0.4)), (1 - smooth((age - 0.3) / 1.2)) * 0.6);
    }
  }

  // ---- the dance's peak: one crack of light between her two blades, and out across the hall
  function peakDraw(ctx, room, t, W, bd) {
    const A = W.peak; if (!A || !bd) return;
    const age = t - A.t0; if (age < 0 || age > 2.0) return;
    const s = VS_VIEW.S(room), m = s.mirror, off = s.off || { x: 0, y: 0 };
    const g = VS_VIEW.twinPt(m, bd.x + off.x, bd.y + off.y);
    if (!A.crack || A.crack.k !== bd.x + ':' + g[0]) {
      const dx = g[0] - bd.x, dy = g[1] - bd.y, L = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx), mx = (bd.x + g[0]) / 2, my = (bd.y + g[1]) / 2;
      A.crack = { k: bd.x + ':' + g[0], set: [{ pts: jag(mx, my, a, 12, (L / 2 + 420) / 12, 0.5, 11), w: 1.5 }, { pts: jag(mx, my, a + Math.PI, 12, (L / 2 + 420) / 12, 0.5, 12), w: 1.5 }, ...crackSet(mx, my, 6, 240, 6, 13).map(c => Object.assign(c, { w: c.w * 0.7 }))] };
    }
    drawCracks(ctx, A.crack.set, easeOut(clamp01(age / 0.22)), (1 - smooth((age - 0.25) / 1.7)) * 0.95);
    const q = age / 0.7;
    if (q < 1) additive(ctx, () => {
      for (const [x, y] of [[bd.x, bd.y], [g[0], g[1]]]) { const r = 20 + 150 * easeOut(q), al = Math.pow(1 - q, 1.6); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${SILVER},${0.7 * al})`; ctx.beginPath(); ctx.ellipse(x, y + 6, r, r * 0.7, 0, 0, TAU); ctx.stroke(); glow(ctx, x, y - 30, 110, '#ffffff', 0.4 * (1 - q)); }
    });
  }

  // ---- the enrage: a long dark, one climbing tone; at the land the floor cracks across and the room goes out
  function enrageDraw(ctx, room, t, W, bd) {
    const E = W.enrage, L = W.land;
    if (!E || t < E.t0) return;
    const build = E.t0 + E.dur;
    let k = smooth((t - E.t0) / E.dur) * 0.42;
    if (L && t >= L.t0) {
      const age = t - L.t0;
      k = Math.min(0.92, 0.42 + 0.5 * smooth(age / 1.1));
      if (age < 2.6 && bd) {
        if (!L.cracks) L.cracks = crackSet(bd.x, bd.y + 12, 14, 780, 9, 21);
        drawCracks(ctx, L.cracks, easeOut(clamp01(age / 0.45)), (1 - smooth((age - 0.6) / 1.9)) * 0.95);
        const q = age / 0.8; if (q < 1) additive(ctx, () => { const r = 40 + 900 * easeOut(q), al = Math.pow(1 - q, 1.4); ctx.lineWidth = 6; ctx.strokeStyle = `rgba(${SILVER},${0.85 * al})`; ctx.beginPath(); ctx.ellipse(bd.x, bd.y + 12, r, r * 0.6, 0, 0, TAU); ctx.stroke(); glow(ctx, bd.x, bd.y - 60, 220, '#ffffff', 0.45 * (1 - q)); });
      }
    } else if (t > build + 0.3) return;
    const cx = bd ? bd.x : 0, cy = bd ? bd.y - 30 : 0;
    vignette(ctx, k, cx, cy, 260 - 90 * (k / 0.5), 720);
  }

  // ---- the kill: the glass lets go of its light from the far edge; one warm light stays
  function fallDraw(ctx, room, t, W, bd) {
    const F = W.fall; if (!F) return;
    const age = t - F.t0; if (age < 0) return;
    const k = smooth((age - 0.15) / 1.7), cx = bd ? bd.x : 0, cy = bd ? bd.y - 24 : 0;
    // the dark closes in from the edges to a pool of light where she fell
    ctx.save(); ctx.beginPath(); ctx.rect(-HW - 80, -HH - 150, 2 * HW + 160, 2 * HH + 230);
    const s = VS_VIEW.S(room), m = s.mirror;
    if (m.kind === 'n') ctx.rect(-HW - 80, -3 * HH - 150, 2 * HW + 160, 2 * HH + 20); else if (m.kind === 'e') ctx.rect(HW, -HH - 150, 2 * HW + 80, 2 * HH + 230);
    ctx.clip();
    const R1 = lerp(1200, 190, easeOut(k)), g = ctx.createRadialGradient(cx, cy, Math.max(1, R1 * 0.35), cx, cy, R1 + 60);
    g.addColorStop(0, `rgba(${WATER},0)`); g.addColorStop(1, `rgba(${WATER},${0.9 * k})`);
    ctx.fillStyle = g; ctx.fillRect(-HW - 100, -3 * HH - 180, 2 * HW + 1300, 4 * HH + 400);
    ctx.restore();
    // the glass goes out from its far edge to the seam, and the one warm light is a window of the glass; with no glass standing it is the first window of the hall
    const am = ambOf(), glass = am && (m.kind === 'n' || m.kind === 'e') && !(room.ev && room.ev.vsact && room.ev.vsact.n >= 5), wk = smooth((age - 0.9) / 1.4);
    let wx = -HW + 60, wy = -HH - 30;
    if (!glass && bd) { wx = bd.x - 190; wy = bd.y - 105; }   // (no glass standing: the light is in the dark beside her, where the camera is, not out at the hall's corner)
    if (glass) {
      const gq = smooth((age - 0.1) / 1.6), ws = (m.kind === 'n' ? am.north : am.east).wins, wn = ws[m.kind === 'n' ? 0 : 6];   // (a window clear of the boss plate: the far left of the north glass, the far right of the east)
      ctx.save();
      if (m.kind === 'n') {
        const y0 = -3 * HH - 150, fy = lerp(y0, -HH + 30, gq), g = ctx.createLinearGradient(0, fy + 70, 0, fy - 110);
        g.addColorStop(0, `rgba(${WATER},0)`); g.addColorStop(0.5, `rgba(${WATER},0.9)`); g.addColorStop(1, `rgba(${WATER},0.97)`);
        ctx.fillStyle = g; ctx.fillRect(-HW - 80, y0 - 20, 2 * HW + 160, fy + 70 - (y0 - 20));
      } else {
        const x1 = 3 * HW + 150, fx = lerp(x1, HW - 30, gq), g = ctx.createLinearGradient(fx - 70, 0, fx + 110, 0);
        g.addColorStop(0, `rgba(${WATER},0)`); g.addColorStop(0.5, `rgba(${WATER},0.9)`); g.addColorStop(1, `rgba(${WATER},0.97)`);
        ctx.fillStyle = g; ctx.fillRect(fx - 70, -HH - 160, x1 + 40 - (fx - 70), 2 * HH + 260);
      }
      ctx.restore();
      if (m.kind === 'n') { wx = -HW - 85; wy = -2 * HH + 40; }   // (the north glass's windows stand under the boss plate: its one light is out in the water beside the glass, as the town's would be)
      else if (wn) { wx = wn.x; wy = wn.y + 8; }
    }
    if (wk > 0.01) additive(ctx, () => {
      const tw = 0.86 + 0.1 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 5.1);
      glow(ctx, wx, wy, 44, '#ffb865', 0.34 * wk * tw); glow(ctx, wx, wy, 16, '#ffd9a0', 0.85 * wk * tw);
            ctx.fillStyle = `rgba(255,236,196,${0.97 * wk * tw})`; ctx.fillRect(wx - 2.2, wy - 2.2, 4.4, 4.4);
    });
  }

  // ================================================================== the hooks
  function underDraw(ctx, room, t, v) {
    const W = state(room), ev = room.ev || {}, bd = bossOf(v);
    if (bd) W.bd = bd;
    runQueue(W, t);
    // the wall: the seam lit by each soak met, taut in the held beat and the build of the turn
    const m = VS_VIEW.S(room).mirror;
    if (W.wall && m.kind === 'n') {
      const lit = [0, 0.2, 0.4, 0.62][W.lit] || 0, pulse = t >= W.pulseAt ? Math.exp(-(t - W.pulseAt) / 0.5) * 0.7 : 0, H = W.held, T = ev.vsturn;
      const hold = H && t >= H.t0 && t < H.t0 + H.dur + 0.3, turning = T && t >= T.start && T.start >= (H ? H.t0 : 0);
      let a = lit + pulse; if (hold) a = Math.max(a, 0.78); if (turning) a = Math.max(a, 0.78 + 0.22 * smooth((t - T.start) / (T.peak || 3.6)));
      seamLine(ctx, t, Math.min(1, a), hold || turning);
    }
    if (W.answer) answerDraw(ctx, room, t, W.answer);
    // the held beat: the room closes in a little, and opens again as the turn begins
    if (W.held) { const H = W.held, T = ev.vsturn, k = smooth((t - H.t0) / 0.35) * (T && T.start >= H.t0 ? 1 - smooth((t - T.start) / 0.9) : 1); vignette(ctx, 0.36 * k, 0, 0, 170, 600); if (k <= 0.004 && t > H.t0 + H.dur + 1) W.held = null; }
    if (W.wallPeak != null) turnDraw(ctx, room, t, W);
    lineDraw(ctx, room, t, ev, W, bd);
    enrageDraw(ctx, room, t, W, bd);
    fallDraw(ctx, room, t, W, bd);
  }
  function overDraw(ctx, room, t, env) {
    const W = state(room), bd = env && env.boss;
    if (bd) W.bd = bd;
    if (env && env.tgs) { const s = []; for (const tg of env.tgs.values()) if (tg.tag === 'vbSoak' && tg.live) s.push({ x: tg.live.x, y: tg.live.y }); if (s.length) { W.soaks = s; W.soakAt = t; } }
    peakDraw(ctx, room, t, W, bd);
    tradeDraw(ctx, t, W, env);
  }
  // the pairs trading places (Hard): rings close on the heroes the glass takes and open on those it lets go (where they are drawn)
  function tradeDraw(ctx, t, W, env) {
    const T = W.trade; if (!T || !env || !env.entById) return;
    const age = t - T.t0; if (age < 0 || age > 0.9) return;
    additive(ctx, () => {
      for (const [list, into] of [[T.ids, true], [T.out, false]]) for (const id of list) {
        const e = env.entById(id); if (!e) continue;
        const q = age / 0.8, r = into ? 100 * (1 - easeOut(Math.min(1, q))) + 14 : 14 + 100 * easeOut(Math.min(1, q)), al = (into ? Math.min(1, q * 2.2) * (1 - 0.4 * q) : 1 - q) * (q > 1 ? 0 : 1);
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${SILVER},${0.9 * al})`; ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, r, r * 0.7, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 8; ctx.strokeStyle = `rgba(${FROST},${0.2 * al})`; ctx.stroke();
        glow(ctx, e.x, e.y - 20, 50, '#e6f2ff', 0.28 * al);
      }
    });
  }

  const roomEvent0 = ArenaView.roomEvent;
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = roomEvent0.call(this, room, msg, now, ...rest);
    try { if (room && room.ev && msg && typeof msg.k === 'string' && msg.k.charCodeAt(0) === 118) onEvent(room, msg, now); } catch (e) { /* cosmetic */ }
    return r;
  };
  const under0 = ArenaView.drawRoomUnder;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    under0.call(this, ctx, room, t, v);
    if (room && room.vs && this.amb && this.amb.kind === 'argent') { try { ctx.save(); underDraw(ctx, room, t, v); ctx.restore(); } catch (e) { ctx.restore(); if (!underDraw.warned) { underDraw.warned = true; console.warn('[vesper moments]', e); } } }
  };
  const over0 = ArenaView.drawRoomOver;
  ArenaView.drawRoomOver = function (ctx, room, t, env) {
    over0.call(this, ctx, room, t, env);
    if (room && room.vs && env && env.bossId === 'vesper') { try { ctx.save(); overDraw(ctx, room, t, env); ctx.restore(); } catch (e) { ctx.restore(); if (!overDraw.warned) { overDraw.warned = true; console.warn('[vesper moments]', e); } } }
  };

  // the kill is quiet: no confetti (BOSS_VFX.victory is shared; main.js calls it on every clear): the one warm light is the last thing lit
  if (typeof BOSS_VFX !== 'undefined' && BOSS_VFX.victory) {
    const victory0 = BOSS_VFX.victory;
    BOSS_VFX.victory = function () {
      try { const room = ArenaView.liveRoom; if (room && room.ev && room.ev.vsfall && ArenaView.amb && ArenaView.amb.kind === 'argent') return undefined; } catch (e) { /* cosmetic */ }
      return victory0.apply(this, arguments);
    };
  }

  // the run ends or is left: nothing held carries over
  const reset0 = WallFx.reset;
  WallFx.reset = function (...a) { stopLoops(0.5); return reset0.apply(this, a); };

  // the seal of the wall (fb 'wl'): the fight's own moments above carry it, so this one adds nothing of the plain gold seal
  WallFx.moment('vesper', null, {
    up() { },
    broke(S) { S.muffle(0, 0.5); },
  });
})();
