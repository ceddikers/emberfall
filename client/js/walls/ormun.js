// Ormun's moments (wall-fx.js' stage, and the room events of arena/bosses/ormun.js, its MOMENTS contract): never told in words, only felt.
// He is a mountain of drowned stone and he never hurries, so every moment is slow and heavy: a build-up the player can feel coming, one held beat in
// which the sound is thinned almost to nothing and the sea goes flat (the script holds it: nothing else is on the floor), then the release, big and short.
// Silver, black water, frost blue; the one warm thing in the whole fight is the small light of the town far below, which the Tide blots out as it
// passes over it and which stays lit alone at the end.
//
//   THE TIDE (the wall, Spring Tide). A serpent of black water the length of the room, drawn under the pans (ArenaView.scalesLife is wrapped: it is
//     drawn before the pans, so the pans hang over it, and again faintly over them, as a long dark shape seen through the silver): in the build-up a darkness creeps in along the bottom of the sea from the far side and the
//     music is drawn thin and low; in the held beat it halts and the sea goes flat as slate; at the release it comes up: a pale back and a line of foam
//     light along its whole length in one stroke, a bell on the chain, the pans heave, the clock stops for a few frames. It then slides under the first
//     pan (the pan rises toward the eye, the sea surges round its rim, light runs up the chains, they groan), over the town's spark (blotted out as it
//     passes, back after) and under the other, a bell on the heavy pan's chain tolling each count (its sound is the sound lane's bm-ormun-m-bell). At the third correct count it does not leave on a
//     timer: the count is read (the beam stops dead), the bell tolls clean, the serpent comes up out of the water under the bridge, goes rigid for a
//     beat, and is thrown away along the sea in one stroke (the pans lurch, the sea settles, the town's light comes back), the music coming back in.
//   THE BRIDGE BREAKS. A span that groans (dust, hairlines of light in the stone), a held beat, then it goes (the room's own fall of slabs), the pans swing
//     free and the sea throws up a column where each slab lands; the pans keep a loose swing for good. THE FIRST TIP: the beam creaks, a held beat, both
//     pans swing hard and the water answers under them.
//   A VERDICT (ormread): the beam stops dead and the room holds its breath for half a second (the music and the sea's bed thinned, the sea gone still,
//     a tiny lock sound that is never the same twice); the strike is the fx lane's.
//   THE ENTRANCE: he rises out of the water: the sea heaves in great slow rings out from his pier, the pans settle swinging, the chains groan.
//   THE ENRAGE (The Scale Falls): the sea climbs the pans' rims while the beam shakes harder, one tone climbing; at the land the beam falls, the sea breaks
//     inward over both pans and the room goes out.
//   THE KILL: the water stops everywhere at once, the music stops, the beam comes level for the first time, a long low bell, and the one light below
//     is left burning alone on black water.
// Sound split: the casts' builds and the small moves are the sound lane's (bm-ormun-*, bm-ormun-m-*); the staged beats and every release's hit are this
// file's (bm-ormun-w-*, sfx-synth.js @@WALL-ormun), and the room's bed (amb) is thinned in each held beat (Sound.duckBus).
// Everything is drawn from the room events' times (room.ev[k].start), so a rejoin replay (ArenaView.roomEvent with FX.muted) sees the room as it is by now
// and hears nothing: sounds, the camera, the music and the spawned particles only come from a live event.

(() => {
  if (typeof WallFx === 'undefined' || typeof ArenaView === 'undefined' || typeof OR_ROOM === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const smooth = q => { q = clamp01(q); return q * q * (3 - 2 * q); };
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const lerp = (a, b, q) => a + (b - a) * q;
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const SILVER = '223,233,245', FROST = '159,216,255', WATER = '2,5,12';
  const PANX = [-380, 380], PAN_R = 300, SPARK = OR_ROOM.SPARK || { x: 0, y: 232 };

  const muted = () => typeof FX !== 'undefined' && !!FX.muted;
  const cam = (k, ...a) => { try { if (typeof FX !== 'undefined' && FX.cam && FX.cam[k]) FX.cam[k](...a); } catch (e) { /* cosmetic */ } };
  const bus = (...a) => { try { if (typeof Sound !== 'undefined' && Sound.duckBus) Sound.duckBus('amb', ...a); } catch (e) { /* cosmetic */ } };
  const mus = (k, ...a) => { try { if (typeof Sound !== 'undefined' && Sound.music && Sound.music[k]) Sound.music[k](...a); } catch (e) { /* (the music is only a mood) */ } };
  const play = (name, o) => { try { return typeof SoundHooks !== 'undefined' ? SoundHooks.play(name, Object.assign({ vol: 1, key: 'orw:' + name, minGap: 0.15 }, o)) : false; } catch (e) { return false; } };
  const shake = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); else if (typeof FX !== 'undefined') FX.shake = Math.max(FX.shake || 0, n); } catch (e) { /* cosmetic */ } };
  const shock = (x, y, o) => { try { return VFX.shock(x, y, Object.assign({ flat: 1 }, o)); } catch (e) { return null; } };

  // ---- the room's own state for the moments (one per raid: room objects are made fresh for each)
  const state = room => room.orw || (room.orw = {
    queue: [], t0: -1, tc: -1, dt: 0,
    sp: { init: false, cx: 1620, v: 0, surf: 0, vis: 0, hx: 1500, mode: '', pan: null },   // the Tide: where its raised back is, how far up, how much of it is there
    swings: [], bells: [], read: null, cleans: 0, tiltFrozen: null, bd: null, intro: null, introAsk: false, bridgeSeen: false,
  });
  const evAge = (ev, t) => (ev ? t - ev.start : 1e9);
  const inEv = (ev, t, pad = 0) => !!ev && t >= ev.start && t < ev.end + pad;
  // the game clock's timers (the room's draw runs them): a Practice Hall slow-down or a stopped tab moves them with the picture; a late one is dropped, never piled up
  const later = (W, now, secs, fn) => { W.queue.push({ at: now + secs, fn }); };
  function runQueue(W, t) {
    if (!W.queue.length) return;
    const due = [], keep = [];
    for (const q of W.queue) (q.at <= t ? due : keep).push(q);
    W.queue = keep;
    for (const q of due) if (t - q.at < 0.6 && !muted()) { try { q.fn(); } catch (e) { /* cosmetic */ } }
  }
  const ambOf = () => (ArenaView.amb && ArenaView.amb.kind === 'scales' ? ArenaView.amb : null);
  const swing = (W, t0, o) => { W.swings.push(Object.assign({ t0, ax: [0, 0], ay: [0, 0], ak: [0, 0], f: 0.5, d: 1.5 }, o)); if (W.swings.length > 16) W.swings.shift(); };

  // ================================================================== the live end: what a room event sets off
  const HOLD = 1.8;
  function onEvent(room, msg, now) {
    const k = msg.k, W = state(room), on = !muted();
    { const kf = room.ev && room.ev['orm-kill-fall']; if (kf && k !== 'orm-kill-fall' && k !== 'orm-kill-end' && now - kf.start < 9 && /^orm-(bridge|tip|springtide|enrage|perfect)/.test(k)) return; }   // (the script's next act can begin while he goes under: its beats are not staged over his fall)
    switch (k) {
      // ---------------------------------------------------------------- THE TIDE
      case 'orm-springtide-buildup':
        W.tide = { t0: now, build: msg.dur || 3.6, cleans: 0, broke: false }; W.cleans = 0;
        if (on) {
          play('bm-ormun-w-gather', { vol: 0.9, key: 'orw:gather' });
          mus('muffle', 1100, (msg.dur || 3.6) * 0.9); mus('duck', 0.35, (msg.dur || 3.6)); bus(0.45, (msg.dur || 3.6) + 0.3);
          cam('lean', 0.03, (msg.dur || 3.6) * 0.8, 1.2, 1.6);
        }
        break;
      case 'orm-springtide-hold':
        if (on) {
          mus('muffle', 380, 0.25); mus('duck', 0.93, (msg.dur || HOLD) + 0.1); bus(0.88, (msg.dur || HOLD) + 0.2);
          later(W, now, 0.3, () => play('bm-ormun-w-hold', { vol: 0.32, key: 'orw:hold' }));
        }
        break;
      case 'orm-springtide-release': {
        swing(W, now, { ax: [16, 16], ay: [-5, -5], ak: [0.03, 0.03], at: 0.34, f: 0.45, d: 2.2 });
        W.rel = { t0: now };
        if (on) {
          play('bm-ormun-w-release', { vol: 1, key: 'orw:release' });
          cam('stop', 0.14); cam('flash', '#e4f1ff', 0.1, 0.45); cam('punch', 0.012, 0.8); shake(13);
          mus('muffle', 0, 0.4); later(W, now, 0.12, () => mus('swell', 0.3, 1.9));
          // it rears out of the sea beside the right pan: a column of spray, the water thrown off it, and (when it comes down, 2.6 s on) the great splash
          VFX.splash(NECK[0], NECK[1], { n: 14, speed: 1.6, size: 1.6, color: '#d8ecff' });
          for (let i = 0; i < 34; i++) VFX.spawn({ x: NECK[0] + rand(-150, 150), y: NECK[1] + rand(-40, 30), z: rand(4, 30), vx: rand(-70, 70), vy: rand(-30, 20), vz: rand(220, 520), g: 520, drag: 0.02, life: rand(0.9, 1.6), size: rand(6, 13), color: i % 3 ? '#d8ecff' : '#ffffff', kind: 'drop', add: false });
          later(W, now, 2.6, () => { shake(10); cam('stop', 0.08); VFX.splash(DOWN[0], DOWN[1], { n: 16, speed: 1.7, size: 1.7, color: '#d8ecff' }); for (let i = 0; i < 30; i++) VFX.spawn({ x: DOWN[0] + rand(-170, 170), y: DOWN[1] + rand(-40, 30), z: rand(4, 24), vx: rand(-80, 80), vy: rand(-40, 20), vz: rand(220, 480), g: 540, drag: 0.02, life: rand(0.8, 1.4), size: rand(6, 12), color: i % 3 ? '#d8ecff' : '#ffffff', kind: 'drop', add: false }); });
        }
        break;
      }
      case 'ormtide': {
        W.tideEv = { a: msg.a, pan: msg.pan || null, t0: now };
        if (msg.a === 'under' && on) { play('bm-ormun-w-pass', { vol: 0.9, key: 'orw:pass', pan: msg.pan === 'L' ? -0.35 : 0.35, rate: msg.pan === 'L' ? 1 : 1.12 }); mus('duck', 0.3, 1.8); }
        if (msg.a === 'under') swing(W, now + 0.9, { ax: [msg.pan === 'L' ? 8 : -8, msg.pan === 'L' ? 8 : -8], ay: [0, 0], ak: [0, 0], f: 0.38, d: 1.8 });
        if (msg.a === 'leave' && on && W.tide && !W.tide.broke) { later(W, now, 0.2, () => play('bm-ormun-w-ebb', { vol: 0.7, key: 'orw:ebb' })); }
        break;
      }
      case 'ormbell': {
        const n = clamp(Math.round(msg.n || 0), 0, 6), pan = msg.pan === 'L' ? 'L' : msg.pan === 'R' ? 'R' : null;
        W.bells.push({ t0: now, n, pan });
        if (W.bells.length > 6) W.bells.shift();
        // (the bell's sound is the sound lane's, bm-ormun-m-bell, wired in sound-hooks.js: its strokes are 0.9 s apart, from the event; this is the bell itself)
        break;
      }
      case 'ormread': {
        // THE VERDICT: the count is read, the beam stops dead, and the room holds its breath for the half second before the strike
        W.read = { t0: now, dur: (msg.strikeIn || 0.5) + 0.35, pans: Array.isArray(msg.pans) ? msg.pans.slice() : [], level: msg.level ? 1 : 0 };
        W.tiltFrozen = null;
        if (on) {
          const wall = W.tide && !W.tide.broke && now < (W.tide.t0 + 200);
          // (the lock and the strike are the sound lane's, bm-ormun-m-read and -fall, and it drops the sea's bed itself: this is the music held under, the sea gone still and the breath of the camera)
          mus('muffle', 900, 0.12); mus('duck', 0.45, (msg.strikeIn || 0.5) + 0.2);
          cam('lean', 0.012, 0.18, 0.35, 0.5);
          void wall;
        }
        // the count: nobody under the strike is a clean one (the script's third such count is what breaks the wall)
        if (W.tide && !W.tide.broke) {
          const env = W.env;
          if (env && !heroesUnder(env, W.read.pans)) W.cleans++;
        }
        break;
      }
      case 'orm-perfect-swing':
        swing(W, now, { ax: [10, -10], ay: [-2, -2], ak: [0.02, 0.02], f: 0.7, d: 1.4 });
        break;
      case 'orm-springtide-break': {
        W.tide = W.tide || { t0: now, build: 3.6, cleans: 0 };
        W.tide.broke = true; W.brk = { t0: now, uc0: W.sp.uc };
        swing(W, now, { ax: [-12, -12], ay: [-4, -4], ak: [0.025, 0.025], f: 0.36, d: 2.4 });
        if (on) {
          play('bm-ormun-w-break', { vol: 1, key: 'orw:break' });
          cam('stop', 0.14); cam('flash', '#e4f1ff', 0.1, 0.5); cam('punch', 0.014, 0.9); cam('lean', 0.02, 0.5, 0.8, 1.6);
          mus('muffle', 0, 0.3); later(W, now, 0.15, () => mus('swell', 0.34, 2.6)); mus('duck', 0.0, 0.1);
          
        }
        break;
      }
      case 'orm-springtide-end':
        W.tide = null; W.tideEnd = { t0: now };
        break;
      // ---------------------------------------------------------------- THE BRIDGE
      case 'orm-bridge-buildup':
        W.bridge = { t0: now, build: msg.dur || 2.7, cracks: null };
        if (on) {
          play('bm-ormun-w-span-groan', { vol: 0.85, key: 'orw:span' });
          mus('muffle', 1400, (msg.dur || 2.7)); mus('duck', 0.3, (msg.dur || 2.7)); bus(0.3, (msg.dur || 2.7));
          cam('lean', 0.026, (msg.dur || 2.7) * 0.8, 0.8, 1.4);
        }
        break;
      case 'orm-bridge-hold':
        if (W.bridge) W.bridge.hold = now;
        if (on) { mus('muffle', 380, 0.2); mus('duck', 0.93, (msg.dur || 1.3) + 0.1); bus(0.88, (msg.dur || 1.3) + 0.2); later(W, now, 0.2, () => play('bm-ormun-w-hold', { vol: 0.3, key: 'orw:hold', rate: 0.84 })); }
        break;
      case 'orm-bridge-release':
        if (W.bridge) W.bridge.rel = now;
        swing(W, now, { ax: [0, 0], ay: [-4, -4], ak: [0.016, 0.016], f: 0.9, d: 1.1 });
        swing(W, now, { ax: [12, -12], ay: [0, 0], ak: [0, 0], f: 0.31, d: 3.4 });
        if (on) {
          play('bm-ormun-w-span-fall', { vol: 1, key: 'orw:spanfall' });
          cam('stop', 0.13); cam('flash', '#e4f1ff', 0.09, 0.4); cam('punch', 0.014, 0.8);
          mus('muffle', 0, 0.3); later(W, now, 0.1, () => mus('swell', 0.3, 2.0));
          for (let i = 0; i < 4; i++) { const x = -78 + i * 52; later(W, now, 0.12 + Math.abs(x) / 160 * 0.35, () => { VFX.splash(x, 140, { n: 9, speed: 1.2, size: 1.3, color: '#d8ecff' }); for (let j = 0; j < 8; j++) VFX.spawn({ x: x + rand(-18, 18), y: 140 + rand(-10, 10), z: rand(0, 10), vx: rand(-30, 30), vy: rand(-10, 30), vz: rand(260, 520), g: 700, drag: 0.02, life: rand(0.9, 1.4), size: rand(6, 11), color: j % 2 ? '#d8ecff' : '#ffffff', kind: 'drop', add: false }); }); }
          for (let i = 0; i < 24; i++) VFX.spawn({ x: rand(-110, 110), y: rand(20, 120), z: rand(0, 20), vx: rand(-40, 40), vy: rand(10, 60), vz: rand(160, 340), g: 600, drag: 0.03, life: rand(0.8, 1.3), size: rand(5, 11), color: i % 3 ? '#d8ecff' : '#ffffff', kind: 'drop', add: false });
        }
        break;
      case 'orm-bridge-end':
        W.bridgeEnd = now;
        break;
      // ---------------------------------------------------------------- THE FIRST TIP
      case 'orm-tip-buildup':
        W.tip = { t0: now, build: msg.dur || 3.3 };
        if (on) { play('bm-ormun-w-beam-groan', { vol: 0.85, key: 'orw:beam' }); mus('muffle', 1300, (msg.dur || 3.3)); mus('duck', 0.3, (msg.dur || 3.3)); bus(0.3, (msg.dur || 3.3)); cam('lean', 0.026, (msg.dur || 3.3) * 0.8, 0.8, 1.4); }
        break;
      case 'orm-tip-hold':
        if (W.tip) W.tip.hold = now;
        if (on) { mus('muffle', 380, 0.2); mus('duck', 0.93, (msg.dur || 1.2) + 0.1); bus(0.88, (msg.dur || 1.2) + 0.2); later(W, now, 0.2, () => play('bm-ormun-w-hold', { vol: 0.3, key: 'orw:hold', rate: 0.92 })); }
        break;
      case 'orm-tip-release':
        W.tipRel = { t0: now, first: !!W.tip };
        swing(W, now, { ax: [-16, 16], ay: [-6, -6], ak: [0.03, 0.03], f: 0.5, d: 1.7 });
        if (on) {
          play('bm-ormun-w-tip', { vol: W.tip ? 1 : 0.7, key: 'orw:tip' });
          if (W.tip) { cam('stop', 0.12); cam('flash', '#e4f1ff', 0.09, 0.4); cam('punch', 0.012, 0.7); mus('muffle', 0, 0.3); later(W, now, 0.1, () => mus('swell', 0.28, 1.8)); }
          for (const x of PANX) { VFX.splash(x, 380, { n: 6, speed: 1.1, size: 1.2, color: '#d8ecff' }); }
        }
        W.tip = null;
        break;
      // ---------------------------------------------------------------- THE ENTRANCE (BOSS_VFX.intro is wrapped below)
      case 'orm-intro': W.intro = { t0: now }; break;
      // ---------------------------------------------------------------- THE ENRAGE
      case 'orm-enrage-start':
        W.enrage = { t0: now, dur: msg.dur || 8 };
        if (on) { play('bm-ormun-w-enrage-build', { vol: 0.85, key: 'orw:enrb' }); mus('muffle', 700, (msg.dur || 8) * 0.9); mus('duck', 0.4, (msg.dur || 8)); bus(0.5, (msg.dur || 8)); }
        break;
      case 'orm-enrage-land':
        W.land = { t0: now };
        swing(W, now, { ax: [0, 0], ay: [-8, -8], ak: [0.04, 0.04], f: 0.6, d: 1.6 });
        if (on) {
          play('bm-ormun-w-enrage-land', { vol: 1, key: 'orw:enrl' });
          cam('stop', 0.18); cam('flash', '#e4f1ff', 0.1, 0.4); cam('punch', 0.016, 0.8);
          mus('muffle', 0, 0.2); mus('duck', 0.95, 3); bus(0.8, 3);
        }
        break;
      // ---------------------------------------------------------------- THE KILL
      case 'orm-kill-fall':
        W.fall = { t0: now };
        // his hand lets go of the beam: it swings free and comes level by itself; then the great slow ring from where he stood lifts each pan as it passes under it
        swing(W, now + 0.15, { ax: [0, 0], ay: [0, 0], ak: [0, 0], at: 0.55, f: 0.4, d: 1.7 });
        swing(W, now + 1.75, { ax: [0, 0], ay: [-16, -16], ak: [0.09, 0.09], f: 0.3, d: 1.5 });
        if (on) {
          play('bm-ormun-w-fall', { vol: 1, key: 'orw:fall' });
          cam('stop', 0.16); cam('lean', 0.04, 1.0, 1.6, 2.0);
          mus('muffle', 480, 0.3); mus('duck', 0.97, 5); bus(0.92, 5);
          later(W, now, 1.7, () => { shake(3); VFX.splash(-380, 340, { n: 6, speed: 0.9, size: 1.1, color: '#d8ecff' }); VFX.splash(380, 340, { n: 6, speed: 0.9, size: 1.1, color: '#d8ecff' }); });
        }
        break;
      case 'orm-kill-end': W.killEnd = now; break;
    }
  }
  // ================================================================== the Tide itself (a body of dark water in the open sea, longer than the room)
  // It swims along the bottom of the sea from the far left to the far right, under the pans' lower rims and through the gap below the bridge (up over the town's light), its head
  // leading: it halts beyond the right pan, rears out of the water there at the release, and goes under again. Its length is a window slid along that guide; the raised back (the hump:
  // pale, wide, the pan over it lifts) is a swell running through it. It is only ever drawn in open water: where it passes under a pan the pan shows it (lift, rim, chains).
  const GUIDE = (() => {
    const C = [[-1900, 40], [-1650, 300], [-1300, 450], [-900, 515], [-450, 515], [-120, 505], [0, 505], [120, 505], [450, 515], [850, 490], [1150, 380], [1400, 200], [1700, 0], [1900, -300]];
    const cr = (p0, p1, p2, p3, q) => { const q2 = q * q, q3 = q2 * q; return [0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * q + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * q2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * q3)); };
    const dense = [];
    for (let i = 0; i < C.length - 1; i++) for (let s = 0; s < 24; s++) dense.push(cr(C[Math.max(0, i - 1)], C[i], C[i + 1], C[Math.min(C.length - 1, i + 2)], s / 24));
    dense.push(C[C.length - 1]);
    const out = [], STEP = 16; let acc = 0, want = 0;
    out.push({ x: dense[0][0], y: dense[0][1], u: 0 });
    for (let i = 1; i < dense.length; i++) {
      const dx = dense[i][0] - dense[i - 1][0], dy = dense[i][1] - dense[i - 1][1], d = Math.hypot(dx, dy);
      while (acc + d >= want + STEP) { want += STEP; const q = (want - acc) / d; out.push({ x: dense[i - 1][0] + dx * q, y: dense[i - 1][1] + dy * q, u: want }); }
      acc += d;
    }
    for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; out[i].nx = -dy / L; out[i].ny = dx / L; }
    const near = (x, y) => { let b = 0, bd = 1e9; out.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = i; } }); return out[b].u; };
    return { pts: out, STEP, len: out[out.length - 1].u, uS: near(-1650, 300), uK: near(-450, 515), uE: near(450, 515), uH: near(0, 505), uN: near(850, 490) };
  })();
  const pathAt = u => { const P = GUIDE.pts, i = clamp(Math.round(u / GUIDE.STEP), 0, P.length - 1); return P[i]; };
  const TRU = 520;                   // (how far behind the Tide's head its raised back rides while it creeps in)
  const SIGU = 300, BODY = 3300;
  const bump = q => Math.exp(-q * q);
  const humpAt = (S, u) => S.surf * bump((u - S.uc) / SIGU);
  const PANU = [GUIDE.uK, GUIDE.uE];   // (where the back sits to lift the left pan, the right pan)
  const NECK = [860, 540], DOWN = [1120, 570];             // (where it rears: the sea beside the right pan)

  // where the Tide is, stepped once a frame: its head (uh), its raised back (uc), how far up it is (surf), how much of it is there at all (vis)
  function tideStep(W, room, t) {
    const ev = room.ev, S = W.sp, dt = W.dt;
    let B = ev['orm-springtide-buildup'], R = ev['orm-springtide-release'];
    const BR = ev['orm-springtide-break'], E0 = ev.ormtide;
    // (a rejoiner is sent only the messages that still stand: the build-up and the release are long over, but the Tide's own message (ormtide, 10 s a round) stands, and says where it is)
    if (!B && E0) { B = { start: E0.start - 9, dur: 3.6 }; if (!R) R = { start: E0.start - 4 }; }
    const broke = BR && B && BR.start >= B.start ? BR : null;
    if (!B || t < B.start || (broke && t > broke.start + 5.4)) { S.vis = 0; S.mode = ''; S.init = false; return false; }
    const E = ev.ormtide && ev.ormtide.start >= B.start ? ev.ormtide : null;
    const tauB = t - B.start, stop = B.dur + 0.1;
    let ucT = null, surfT, visT = 1, mode;
    if (!R || t < R.start) {
      // the approach: its head comes along the bottom of the sea from the far left, slowing to a halt as the held beat begins
      mode = 'approach';
      const u = easeOut(clamp01(tauB / stop));
      S.uh = lerp(GUIDE.uS - 300, GUIDE.uN, u); S.uc = S.uh - TRU; surfT = 0.34 + 0.12 * smooth(tauB / stop); visT = smooth(tauB / 0.9);
      S.hold = tauB >= stop; S.v = 0;
    } else {
      mode = 'under'; S.hold = false;
      const lp = E ? (E.a === 'under' ? E.pan : E.a === 'leave' ? 'leave' : 'L') : 'L';
      S.pan = lp; ucT = lp === 'L' ? GUIDE.uK : lp === 'R' ? GUIDE.uE : GUIDE.uH; surfT = lp === 'leave' ? 0.22 : 0.86;
      if (lp === 'leave') mode = 'leave';
      const tr = t - R.start;
      S.uh = GUIDE.uN;
      if (tr < 2.6 && W.rel && W.rel.t0 === R.start) { S.uc = lerp(GUIDE.uN - TRU, GUIDE.uK, smooth(tr / 2.6)); S.v = 0; }   // (the surfacing runs back along the body to the first pan)
      else { if (!S.init || S.mode === 'approach') S.uc = ucT; const w = 1.5, ac = w * w * (ucT - S.uc) - 2 * w * S.v; S.v += ac * dt; S.uc += S.v * dt; }
    }
    if (broke) {
      // up out of the water under the bridge, rigid for a beat, then thrown away along the sea: the whole length drawn through
      mode = 'break';
      const tb = t - broke.start, B0 = W.brk && W.brk.t0 === broke.start ? W.brk : null, uc0 = B0 ? B0.uc0 : S.uc;
      const go = Math.pow(smooth((tb - 0.9) / 3.4), 1.4);
      S.uh = GUIDE.uN + go * (BODY + GUIDE.len - GUIDE.uN + 400);
      S.uc = lerp(uc0, S.uh - TRU, smooth(tb / 0.9)); S.v = 0; surfT = 1; visT = 1;
      if (tb < 0.9) S.uc = lerp(uc0, GUIDE.uH, smooth(tb / 0.7));   // (up under the bridge)
    }
    if (!S.init) { S.surf = surfT; S.vis = visT; if (ucT != null) S.uc = ucT; S.init = true; }
    S.surf = lerp(S.surf, surfT, 1 - Math.exp(-(mode === 'break' ? 7 : 2.2) * dt));
    if (R && t >= R.start && t - R.start < 3 && mode !== 'break') S.surf = Math.max(S.surf, lerp(surfT, 1, Math.exp(-(t - R.start) / 0.9)));
    S.vis = lerp(S.vis, visT, 1 - Math.exp(-4 * dt)); S.mode = mode;
    return S.vis > 0.01;
  }
  // how lifted a pan is by the Tide: the raised back under it (0..1)
  const liftOf = (S, i) => (S.vis > 0.02 ? clamp01(S.surf * bump((PANU[i] - S.uc) / SIGU) * 1.08) * Math.min(1, S.vis * 1.3) : 0);

  function tideDraw(ctx, a, t, W) {
    const S = W.sp; if (S.vis < 0.02) return;
    const vis = S.vis, P = GUIDE.pts, R = W.ev && W.ev['orm-springtide-release'];
    const i0 = clamp(Math.floor((S.uh - BODY) / GUIDE.STEP), 0, P.length - 1), i1 = clamp(Math.ceil(S.uh / GUIDE.STEP), 0, P.length - 1);
    if (i1 - i0 < 3) return;
    // the surfacing at the release runs down the whole length from the head in one stroke
    const rt = R ? t - R.start : -1, front = rt >= 0 && rt < 1.8 ? rt / 0.9 * (BODY + 300) : -1e9, rfade = rt >= 0 ? clamp01(1 - (rt - 1.0) / 0.9) : 0;
    const allUp = S.mode === 'break' && W.brk ? 0.85 * smooth((t - W.brk.t0 - 0.5) / 0.6) : 0;   // (thrown away: the whole length is up and white)
    const pts = [];
    for (let i = i0; i <= i1; i++) {
      const g = P[i], hm = humpAt(S, g.u), wedge = bump(g.x / 270), fromHead = S.uh - g.u;
      const wv = 26 * Math.sin(g.u * 0.009 - t * 0.8) * (1 - 0.5 * hm);
      const x = g.x + g.nx * wv, y = g.y + g.ny * wv - 220 * hm * wedge - 70 * hm;
      const burst = front > -1e8 ? 0.95 * bump((fromHead - front) / 220) * rfade : 0;
      const taperH = 0.25 + 0.75 * smooth(fromHead / 260), taperT = 0.15 + 0.85 * smooth((g.u - (S.uh - BODY)) / 700);
      const w = (110 + 160 * hm + 60 * burst + 10 * Math.sin(g.u * 0.03 + t)) * taperH * taperT;
      pts.push({ x, y, w, hm, br: Math.min(1, Math.max(hm + burst, allUp)), u: g.u });
    }
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)], dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
      pts[i].nx = -dy / L; pts[i].ny = dx / L;
    }
    const strip = k => {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) { const p = pts[i]; ctx[i ? 'lineTo' : 'moveTo'](p.x + p.nx * p.w * k * 0.5, p.y + p.ny * p.w * k * 0.5); }
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; ctx.lineTo(p.x - p.nx * p.w * k * 0.5, p.y - p.ny * p.w * k * 0.5); }
      ctx.closePath();
    };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const hp = pathAt(S.uc), hy = hp.y - 220 * S.surf * bump(hp.x / 270) - 70 * S.surf;
    // the water lit cold round the whole length, so the dark of it stands out against the sea; a lit mound where the back is raised
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.translate(hp.x, hy); ctx.scale(1, 0.55); glow(ctx, 0, 0, 640, '#5b9fd6', 0.5 * S.surf * vis); ctx.restore();
    for (const [k, al] of [[3.2, 0.04], [2.4, 0.06], [1.8, 0.08]]) { strip(k); ctx.fillStyle = `rgba(80,140,200,${al * vis * (0.7 + 0.3 * S.surf)})`; ctx.fill(); }
    ctx.restore();
    strip(1.0); ctx.fillStyle = `rgba(0,1,4,${0.92 * vis})`; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // the pale back: a lit band down it where it comes up, soft at its edges
    for (const [k0, k1, al] of [[0.5, -0.5, 0.12], [0.34, -0.34, 0.2]]) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) { const p = pts[i]; ctx[i ? 'lineTo' : 'moveTo'](p.x + p.nx * p.w * k0 * (0.2 + 0.8 * p.br), p.y + p.ny * p.w * k0 * (0.2 + 0.8 * p.br)); }
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; ctx.lineTo(p.x + p.nx * p.w * k1 * (0.2 + 0.8 * p.br), p.y + p.ny * p.w * k1 * (0.2 + 0.8 * p.br)); }
      ctx.closePath(); ctx.fillStyle = `rgba(170,214,244,${al * vis * (0.2 + 0.8 * S.surf)})`; ctx.fill();
    }
    // plates across the back, only where it is up
    for (let i = 2; i < pts.length - 2; i += 2) {
      const p = pts[i], k = clamp01(p.br * 1.4 - 0.2) * vis;
      if (k < 0.05) continue;
      const sh = 0.55 + 0.45 * Math.sin(p.u * 0.05 - t * 1.6), L = p.w * 0.34, ax = -p.ny, ay = p.nx;
      ctx.beginPath(); ctx.moveTo(p.x + p.nx * L - ax * 7, p.y + p.ny * L - ay * 7); ctx.lineTo(p.x + ax * 5, p.y + ay * 5); ctx.lineTo(p.x - p.nx * L - ax * 7, p.y - p.ny * L - ay * 7);
      ctx.strokeStyle = `rgba(${SILVER},${0.62 * k * sh})`; ctx.lineWidth = 2.4; ctx.stroke();
    }
    // the spine: one line of light, broken where it is low
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], k = (0.1 + 0.85 * clamp01(p.br * 1.3)) * vis * (0.55 + 0.45 * Math.sin(p.u * 0.21 + t * 1.3));
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = `rgba(236,247,255,${0.62 * k})`; ctx.lineWidth = 3; ctx.stroke();
    }
    // the foam along each flank: flecks that come and go, never a clean line
    for (const side of [1, -1]) {
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const nz = clamp01(0.6 + 0.5 * Math.sin(p.u * 0.13 + side * 3 + t * 1.7) + 0.35 * Math.sin(p.u * 0.37 - t * 2.3));
        const al = vis * (0.16 + 0.7 * clamp01(p.br * 1.2)) * nz;
        if (al < 0.02) continue;
        const ox = side * 0.54, jx = Math.sin(p.u * 0.09 + side + t * 1.2) * 3;
        ctx.beginPath(); ctx.moveTo(p.x + p.nx * (p.w * ox + jx), p.y + p.ny * (p.w * ox + jx)); ctx.lineTo(q.x + q.nx * (q.w * ox + jx), q.y + q.ny * (q.w * ox + jx));
        ctx.strokeStyle = `rgba(228,242,255,${al})`; ctx.lineWidth = 2 + 4 * nz * clamp01(p.br + 0.2); ctx.stroke();
      }
    }
    // the wake: two long lines of white water running out from the raised back to the edges of the sea, and the swell spreading in broken rings
    for (const side of [-1, 1]) {
      const wl = 900 * (0.4 + 0.6 * S.surf);
      ctx.beginPath(); ctx.moveTo(hp.x, hy + 40);
      ctx.bezierCurveTo(hp.x + side * 260, hy + 70, hp.x + side * 520, hy + 70 + 20 * Math.sin(t * 0.7 + side), hp.x + side * wl, hy + 110);
      const wg = ctx.createLinearGradient(hp.x, 0, hp.x + side * wl, 0); wg.addColorStop(0, `rgba(228,242,255,${0.5 * S.surf * vis})`); wg.addColorStop(1, 'rgba(228,242,255,0)');
      ctx.strokeStyle = wg; ctx.lineWidth = 5; ctx.setLineDash([36, 14, 10, 18]); ctx.lineDashOffset = -t * 90 * side; ctx.stroke(); ctx.setLineDash([]);
    }
    for (let n = 0; n < 3; n++) { const q = (t * 0.28 + n / 3) % 1, r = 120 + q * 900; brokenRing(ctx, hp.x, hy + 30, r, r * 0.34, 0.5 * S.surf * vis * (1 - q), 3.6 * (1 - q) + 1.2, n * 13 + 5, t); }
    ctx.restore();
    ctx.restore();
  }

  // the Tide rearing out of the sea beside the right pan at the release: neck and head higher than the pan, water sheeting off, then down again with a great splash
  function neckDraw(ctx, t, W) {
    const R = W.ev && W.ev['orm-springtide-release']; if (!R) return;
    const rt = t - R.start; if (rt < 0 || rt > 4.2) return;
    const rise = easeOut(clamp01(rt / 0.9)), pl = smooth((rt - 2.0) / 0.72), alive = 1 - smooth((rt - 2.66) / 0.34);
    const sway = Math.sin(rt * 1.7) * 22 * (1 - pl);
    const hx = lerp(880 + sway, DOWN[0], pl), hyy = lerp(NECK[1] - 690 * rise, DOWN[1] - 10, pl);
    if (alive > 0.01) {
      const c1 = [lerp(1000, 900, pl), NECK[1] - 260 * rise], c2 = [lerp(780 + sway * 0.5, 1020, pl), lerp(NECK[1] - 620 * rise, 330, pl)];
      const N = 30, Q = [];
      for (let i = 0; i <= N; i++) {
        const s = i / N, m = 1 - s;
        const x = m * m * m * NECK[0] + 3 * m * m * s * c1[0] + 3 * m * s * s * c2[0] + s * s * s * hx, y = m * m * m * NECK[1] + 3 * m * m * s * c1[1] + 3 * m * s * s * c2[1] + s * s * s * hyy;
        Q.push({ x, y, s });
      }
      for (let i = 0; i <= N; i++) { const a0 = Q[Math.max(0, i - 1)], b0 = Q[Math.min(N, i + 1)], dx = b0.x - a0.x, dy = b0.y - a0.y, L = Math.hypot(dx, dy) || 1; Q[i].nx = -dy / L; Q[i].ny = dx / L; Q[i].w = lerp(200, 84, Math.pow(Q[i].s, 0.7)) * (1 + 0.15 * rise * Q[i].s) * alive; }
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = alive;
      // the foam where it comes up, and the cold light the water round it throws back (so the dark of it stands out)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, NECK[0], NECK[1], 380, '#7fb4ea', 0.4 * clamp01(rt * 2));
      { const mid = Q[Math.round(N * 0.55)]; glow(ctx, mid.x, mid.y, 520 * rise, '#6fa8d8', 0.4 * alive); glow(ctx, hx, hyy, 320 * rise, '#9fcdf0', 0.3 * alive); }
      for (let n = 0; n < 3; n++) { const q = clamp01((rt - n * 0.22) / 1.5); if (q > 0 && q < 1) brokenRing(ctx, NECK[0], NECK[1] + 10, 110 + 540 * easeOut(q), (110 + 540 * easeOut(q)) * 0.4, 0.85 * (1 - q), 6 * (1 - q) + 1.4, n * 9 + 2, t); }
      ctx.restore();
      // the body of it: dark wet scale, lit down the near edge, plates across it
      ctx.beginPath();
      for (let i = 0; i <= N; i++) ctx[i ? 'lineTo' : 'moveTo'](Q[i].x + Q[i].nx * Q[i].w * 0.5, Q[i].y + Q[i].ny * Q[i].w * 0.5);
      for (let i = N; i >= 0; i--) ctx.lineTo(Q[i].x - Q[i].nx * Q[i].w * 0.5, Q[i].y - Q[i].ny * Q[i].w * 0.5);
      ctx.closePath();
      const ng = ctx.createLinearGradient(NECK[0] - 120, 0, NECK[0] + 120, 0); ng.addColorStop(0, '#2a3b4d'); ng.addColorStop(0.4, '#0f1a26'); ng.addColorStop(1, '#03070c');
      ctx.fillStyle = ng; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#02060c'; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); for (let i = 0; i <= N; i++) ctx[i ? 'lineTo' : 'moveTo'](Q[i].x - Q[i].nx * Q[i].w * 0.46, Q[i].y - Q[i].ny * Q[i].w * 0.46);
      ctx.strokeStyle = `rgba(200,230,252,${0.8 * alive})`; ctx.lineWidth = 6; ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= N; i++) ctx[i ? 'lineTo' : 'moveTo'](Q[i].x + Q[i].nx * Q[i].w * 0.48, Q[i].y + Q[i].ny * Q[i].w * 0.48);
      ctx.strokeStyle = `rgba(150,200,236,${0.5 * alive})`; ctx.lineWidth = 4; ctx.stroke();
      for (let i = 1; i < N; i += 1) { const q = Q[i], ax = -q.ny, ay = q.nx; ctx.beginPath(); ctx.moveTo(q.x + q.nx * q.w * 0.4, q.y + q.ny * q.w * 0.4 - ax * 8); ctx.lineTo(q.x - ax * 4, q.y - ay * 4 + 0); ctx.lineTo(q.x - q.nx * q.w * 0.4, q.y - q.ny * q.w * 0.4 - ax * 8); ctx.strokeStyle = `rgba(${SILVER},${0.22 * alive * (0.6 + 0.4 * Math.sin(i * 1.3 + t * 2))})`; ctx.lineWidth = 2; ctx.stroke(); }
      // water sheeting off it: streaks running down the neck and the head
      for (let n = 0; n < 34; n++) {
        const q = Q[1 + (hash(n, 3) * (N - 1) | 0)], ph = (t * (0.9 + 0.6 * hash(n, 5)) + hash(n, 7)) % 1, off = (hash(n, 9) - 0.5) * q.w * 0.8;
        const x = q.x + q.nx * off + sway * 0.2, y = q.y + q.ny * off + ph * 130;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 34 + 40 * hash(n, 11)); ctx.strokeStyle = `rgba(228,242,255,${0.7 * (1 - ph) * alive * rise})`; ctx.lineWidth = 2 + 2 * hash(n, 13); ctx.stroke();
      }
      ctx.restore();
      // the head: a long blunt wedge with a crest of pale fins and two cold lights
      const E = Q[N], Pn = Q[N - 2], ang = Math.atan2(E.y - Pn.y, E.x - Pn.x) + lerp(0.45, 0.9, pl);
      ctx.save(); ctx.translate(E.x, E.y); ctx.rotate(ang); ctx.scale(1.15 + 0.2 * rise, 1.15 + 0.2 * rise);
      ctx.beginPath(); ctx.moveTo(-30, -62); ctx.quadraticCurveTo(70, -66, 170, -22); ctx.quadraticCurveTo(196, 0, 170, 22); ctx.quadraticCurveTo(70, 66, -30, 62); ctx.closePath();
      const hg = ctx.createLinearGradient(0, -62, 0, 62); hg.addColorStop(0, '#1d2d3d'); hg.addColorStop(0.5, '#091019'); hg.addColorStop(1, '#02050a'); ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = '#02060c'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const fx = -10 + i * 26; ctx.beginPath(); ctx.moveTo(fx, -56 + i * 5); ctx.lineTo(fx + 30, -92 + i * 7); ctx.lineTo(fx + 46, -54 + i * 6); ctx.strokeStyle = `rgba(${SILVER},0.5)`; ctx.lineWidth = 2.4; ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-26, -58); ctx.quadraticCurveTo(70, -62, 164, -20); ctx.strokeStyle = 'rgba(210,235,255,0.65)'; ctx.lineWidth = 3; ctx.stroke();
      glow(ctx, 112, -20, 20, '#e6f4ff', 0.9); glow(ctx, 112, 20, 20, '#e6f4ff', 0.9); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(112, -20, 2.6, 0, TAU); ctx.arc(112, 20, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.restore();
      ctx.restore();
    }
    // where it comes down: a ring of white water spreading across the sea
    if (rt > 2.55) { const q = clamp01((rt - 2.55) / 1.7); ctx.save(); ctx.globalCompositeOperation = 'lighter'; brokenRing(ctx, DOWN[0], DOWN[1], 40 + 620 * easeOut(q), (40 + 620 * easeOut(q)) * 0.38, 0.9 * (1 - q), 7 * (1 - q) + 1.4, 77, t); brokenRing(ctx, DOWN[0], DOWN[1], 20 + 420 * easeOut(clamp01(q * 1.2)), (20 + 420 * easeOut(clamp01(q * 1.2))) * 0.38, 0.7 * (1 - q), 5 * (1 - q) + 1, 78, t); ctx.restore(); }
  }

  // the foam and swell round the rim of a pan the Tide is under (drawn before the pan: only what is past the rim shows)
  function rimSurge(ctx, a, i, lift, t, S) {
    if (lift < 0.04) return;
    const p = OR_ROOM.panPose(a, i, t), R = PAN_R * p.k, cx = p.cx, cy = p.cy;
    const dir = Math.PI / 2;   // (the lower rim: it is the part of the pan the viewer sees the sea past)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, R - 4, cx, cy, R + 120);
    g.addColorStop(0, `rgba(120,185,240,${0.3 * lift})`); g.addColorStop(0.35, `rgba(90,150,210,${0.12 * lift})`); g.addColorStop(1, 'rgba(60,110,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 120, 0, TAU); ctx.fill();
    ctx.lineCap = 'round';
    for (let n = 0; n < 3; n++) {
      const q = (t * 0.32 + n / 3) % 1, rr = R + 8 + q * 78;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.strokeStyle = `rgba(${SILVER},${0.2 * lift * (1 - q)})`; ctx.lineWidth = 3.4 * (1 - q) + 0.8; ctx.stroke();
    }
    ctx.setLineDash([]);
    // water pouring off the far side of the rim (the side away from the middle of the room), in sheets that fall
    const outA = i === 0 ? Math.PI : 0;
    for (let n = 0; n < 30; n++) {
      const ph = (t * 0.95 + n * 0.37) % 1, th = outA + (hash(n, i + 4) - 0.5) * 1.7, rx = cx + Math.cos(th) * R, ry = cy + Math.sin(th) * R;
      ctx.beginPath(); ctx.moveTo(rx, ry + ph * 14); ctx.lineTo(rx - 1, ry + 36 + ph * 110 * (0.6 + hash(n, 6))); ctx.strokeStyle = `rgba(${SILVER},${0.75 * lift * (1 - ph)})`; ctx.lineWidth = 2 + 2.4 * hash(n, 8); ctx.stroke();
    }
    // spray flung off the rim where the sea climbs it
    for (let n = 0; n < 22; n++) {
      const q = (t * 0.6 + n * 0.381) % 1, ang = dir + (hash(n, i) - 0.5) * 2.6, rr = R + 3 + q * 26;
      ctx.beginPath(); ctx.arc(cx, cy, rr, ang - 0.04, ang + 0.04); ctx.strokeStyle = `rgba(${SILVER},${0.6 * (1 - q) * Math.min(1, lift * 1.4)})`; ctx.lineWidth = 2.6 - q; ctx.stroke();
    }
    ctx.restore();
  }

  // light running up the chains of a pan the Tide lifts, and a flash at each lug: they groan
  const LUG = [Math.PI, Math.PI * 125 / 180, Math.PI * 235 / 180];
  function chainGlints(ctx, a, t, i, lift) {
    if (lift < 0.05) return;
    const p = OR_ROOM.panPose(a, i, t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let li = 0; li < 3; li++) {
      let ang = LUG[li]; if (i) ang = Math.PI - ang;
      const lx = p.cx + Math.cos(ang) * (PAN_R + 14) * p.k, ly = p.cy + Math.sin(ang) * (PAN_R + 14) * p.k, dx = lx, dy = ly - 60, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      glow(ctx, lx, ly, 34, '#cfe6ff', 0.5 * lift * (0.7 + 0.3 * Math.sin(t * 9 + li)));
      for (let n = 0; n < 4; n++) {
        const ph = (t * 0.55 + li * 0.31 + n / 4) % 1, s = 0.04 + ph * 0.46, x = dx * (1 + s) , y = 60 + dy * (1 + s);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * 15, y + uy * 15);
        ctx.strokeStyle = `rgba(${SILVER},${1.0 * lift * Math.sin(ph * Math.PI)})`; ctx.lineWidth = 3.4; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // a bell hung on the outer chain of each pan: it tolls the count
  function bellsDraw(ctx, a, t, W) {
    for (const b of W.bells) {
      const age = t - b.t0, strokes = Math.max(1, b.n), tail = 0.6 + strokes * 0.9 + 0.9;
      if (age < 0 || age > tail) continue;
      const fade = smooth(age / 0.15) * (1 - smooth((age - (strokes * 0.9 + 0.3)) / 0.9));
      for (let i = 0; i < 2; i++) {
        const heavy = b.pan ? (b.pan === 'L') === (i === 0) : true, p = OR_ROOM.panPose(a, i, t);
        if (b.pan && !heavy) continue;   // (the bell of the heavy pan; when they are level both toll)
        const lx = p.cx + (i ? 1 : -1) * (PAN_R + 14) * p.k, kk = 1.2, x = lx * kk, y = 60 + (p.cy - 60) * kk;
        // the stroke in time: each n strokes 0.5 s apart from 0.1 s
        let ring = 0;
        for (let s = 0; s < strokes; s++) { const q = age - 0.05 - s * 0.9; if (q >= 0) ring = Math.max(ring, Math.exp(-q / 0.35) * Math.cos(q * 26)); }
        const sw = ring * 0.5;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y - 2); ctx.rotate(sw * (i ? -1 : 1));
        // hanger and the bell: a small silver bell on the chain, dark-edged
        ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(3, -6); ctx.fillStyle = '#7d8b9d'; ctx.fill();
        const bg = ctx.createLinearGradient(-15, 0, 15, 0); bg.addColorStop(0, '#6c7a8d'); bg.addColorStop(0.35, '#eaf2fa'); bg.addColorStop(0.7, '#aab8c8'); bg.addColorStop(1, '#566476');
        ctx.beginPath(); ctx.moveTo(-5, -9); ctx.quadraticCurveTo(-8, 3, -15, 14); ctx.lineTo(15, 14); ctx.quadraticCurveTo(8, 3, 5, -9); ctx.closePath();
        ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0a1019'; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 14, 15, 3.4, 0, 0, TAU); ctx.fillStyle = '#1b2533'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 17 + ring * 2, 3, 0, TAU); ctx.fillStyle = '#cfdcea'; ctx.fill();
        ctx.restore();
        if (ring > 0.04) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y + 6, 54, '#cfe6ff', 0.45 * ring * fade); ctx.restore(); }
      }
    }
  }

  // ================================================================== drawing helpers
  const additive = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
  const vignette = (ctx, k, cx, cy, rIn, rOut, col = WATER) => {
    if (k <= 0.004) return;
    ctx.save(); ctx.beginPath(); ctx.rect(-1500, -1000, 3000, 2000); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy, Math.max(1, rIn), cx, cy, Math.max(rIn + 1, rOut));
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${Math.min(1, k)})`);
    ctx.fillStyle = g; ctx.fillRect(-1500, -1000, 3000, 2000); ctx.restore();
  };
  // a ring of water that is never a clean line: broken into flecks that come and go round it (an ellipse rx by ry about cx, cy)
  function brokenRing(ctx, cx, cy, rx, ry, al, lw, seed, t) {
    const N = Math.max(24, Math.min(90, Math.round(rx / 7)));
    ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      const a0 = i / N * TAU, a1 = (i + 0.7) / N * TAU, nz = clamp01(0.25 + 0.9 * hash(i, seed) + 0.25 * Math.sin(t * 1.3 + i * 1.7) - 0.2);
      if (nz < 0.25) continue;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a1); ctx.strokeStyle = `rgba(${SILVER},${al * nz})`; ctx.lineWidth = lw * (0.5 + 0.7 * nz); ctx.stroke();
    }
  }
  function jag(x0, y0, ang, n, len, wob, seed) {
    const pts = [[x0, y0]]; let x = x0, y = y0, an = ang;
    for (let i = 0; i < n; i++) { an += (hash(i + seed * 17, seed) - 0.5) * wob; x += Math.cos(an) * len * (0.7 + 0.6 * hash(i, seed + 3)); y += Math.sin(an) * len * (0.7 + 0.6 * hash(i + 5, seed + 1)); pts.push([x, y]); }
    return pts;
  }
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
      ctx.strokeStyle = `rgba(${glowCol},${0.3 * k})`; ctx.lineWidth = c.w * 4.2; ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * k})`; ctx.lineWidth = c.w * 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  // ================================================================== the room's hooks
  // the beam and the pans take an extra swing and a lift on top of what the script says (ormun-room.js: amb.heave; amb.tilt is wrapped so the beam can be stopped dead)
  function hookTilt(a) {
    if (a.__orw) return a.__orw;
    const H = a.__orw = { raw: a.tilt || 0, fresh: false, add: 0, frozen: false, force: null, dt: 0.016 };
    Object.defineProperty(a, 'tilt', {
      configurable: true, enumerable: true,
      get() { return H.fresh ? H.raw + H.add : H.raw; },
      set(v) {
        if (H.frozen) { H.fresh = true; return; }
        if (H.force != null) v = H.raw + (H.force - H.raw) * (1 - Math.exp(-2.4 * H.dt));
        H.raw = v; H.fresh = true;
      },
    });
    return H;
  }

  // the sea's own motion (the swell bands, the crest lines, the glints): taken down by k (0 untouched .. 1 flat) for the length of one draw
  function calmSea(a, k) {
    if (k <= 0.004) return false;
    const f = 1 - k;
    for (const m of a.sw) { if (m._a0 == null) m._a0 = m.a; m.a = m._a0 * f; }
    for (const m of a.cr) { if (m._a0 == null) m._a0 = m.a; m.a = m._a0 * f; }
    for (const m of a.gl) { if (m._s0 == null) m._s0 = m.s; m.s = m._s0 * f; }
    return true;
  }
  function openSea(a) {
    for (const m of a.sw) if (m._a0 != null) m.a = m._a0;
    for (const m of a.cr) if (m._a0 != null) m.a = m._a0;
    for (const m of a.gl) if (m._s0 != null) m.s = m._s0;
  }

  // how far the camera is asked to draw back (0..1): out over the Tide's whole wall, back in as it ends
  function wideTarget(room, t) {
    const ev = room.ev, E0 = ev.ormtide;
    let B = ev['orm-springtide-buildup'];
    if (!B && E0) B = { start: E0.start - 9 };
    if (!B || t < B.start) return 0;
    const BR = ev['orm-springtide-break'];
    if (BR && BR.start >= B.start) return 1 - smooth((t - BR.start - 3.2) / 2.0);
    return smooth((t - B.start) / 1.4);
  }

  // how still the sea is held just now (0..1), from the events alone
  function calmAt(W, ev, t) {
    let k = 0;
    const B = ev['orm-springtide-buildup'], Hd = ev['orm-springtide-hold'], R = ev['orm-springtide-release'], BR = ev['orm-springtide-break'];
    if (B && t >= B.start && (!R || t < R.start)) {
      k = Math.max(k, 0.55 * smooth((t - B.start) / (B.dur || 3.6)));
      if (Hd && t >= Hd.start) k = Math.max(k, 0.96 * smooth((t - Hd.start) / 0.3));
    }
    if (R && t >= R.start && t < R.start + 2.0) k = Math.max(k, 0.5 * (1 - smooth((t - R.start) / 2.0)) * (B && t - B.start < 80 ? 1 : 0));
    const bh = ev['orm-bridge-hold'], bb = ev['orm-bridge-buildup'], br = ev['orm-bridge-release'];
    if (bb && t >= bb.start && (!br || br.start < bb.start || t < br.start)) { k = Math.max(k, 0.5 * smooth((t - bb.start) / (bb.dur || 2.7))); if (bh && bh.start >= bb.start && t >= bh.start) k = Math.max(k, 0.95); }
    const tb = ev['orm-tip-buildup'], th = ev['orm-tip-hold'], tr = ev['orm-tip-release'];
    if (tb && t >= tb.start && (!tr || tr.start < tb.start || t < tr.start)) { k = Math.max(k, 0.5 * smooth((t - tb.start) / (tb.dur || 3.3))); if (th && th.start >= tb.start && t >= th.start) k = Math.max(k, 0.95); }
    if (W.read && t >= W.read.t0 && t < W.read.t0 + W.read.dur + 0.3) k = Math.max(k, 0.5 * smooth((t - W.read.t0) / 0.12) * (1 - smooth((t - W.read.t0 - W.read.dur) / 0.3)));
    if (BR && R && BR.start >= R.start && t >= BR.start - 0.5 && t < BR.start + 1.0) k = Math.max(k, 0.8 * smooth(1 - Math.abs(t - BR.start) / 1.0));
    const F = W.fall; if (F && t >= F.t0) k = Math.max(k, 0.98 * smooth((t - F.t0) / 1.8));
    const E = W.enrage; if (E && t >= E.t0 && !W.land) k = Math.max(k, 0.3 * smooth((t - E.t0) / E.dur));
    if (W.land && t >= W.land.t0) k = Math.max(k, 0.8);
    return clamp01(k);
  }

  // the tilt freeze: the beam stops dead as the count is read
  function frozenAt(W, t) {
    const r = W.read; return !!r && t >= r.t0 && t < r.t0 + (r.dur - 0.2);
  }

  function heaveAt(W, t, S) {
    const out = [{ k: 0, x: 0, y: 0 }, { k: 0, x: 0, y: 0 }];
    for (let i = 0; i < 2; i++) {
      const lift = liftOf(S, i), other = liftOf(S, 1 - i);
      out[i].k += 0.1 * lift - 0.03 * other; out[i].y += -15 * lift + 7 * other;
    }
    for (const sw of W.swings) {
      const age = t - sw.t0; if (age < 0 || age > sw.d * 7) continue;
      const env = Math.exp(-age / sw.d), ph = Math.sin(TAU * sw.f * age);
      for (let i = 0; i < 2; i++) { out[i].x += sw.ax[i] * env * ph; out[i].y += sw.ay[i] * env * ph; out[i].k += sw.ak[i] * env * ph; }
    }
    // the pans hang loose on their chains once the bridge is gone: a small slow swing for good
    const a = ambOf();
    if (a && a.bridge === 0) { const q = smooth((t - (a.brkAt || 0)) / 6); for (let i = 0; i < 2; i++) { out[i].x += q * 2.6 * Math.sin(t * 0.5 + i * 2.4); out[i].y += q * 1.2 * Math.sin(t * 0.7 + i); } }
    return out;
  }

  // ---- the frame's own clock, and the room's wrapped draw: drawn before the pans (the sea, the Tide, the rims), the pans themselves (the room), after them (the cracks, the glints, the bells)
  function frameClock(W, t) {
    if (W.tc === t) return false;
    W.dt = W.t0 < 0 ? 0 : clamp(t - W.t0, 0, 0.1); W.t0 = t; W.tc = t;
    return true;
  }

  const baseLife = ArenaView.scalesLife;
  ArenaView.scalesLife = function (ctx, a, t) {
    const room = ArenaView.liveRoom;
    if (!room || !room.ev) return baseLife.call(this, ctx, a, t);
    const W = state(room), ev = room.ev;
    let calmed = false;
    try {
      W.ev = ev; frameClock(W, t); runQueue(W, t);
      const H = hookTilt(a); H.dt = W.dt; H.fresh = false;
      const tideOn = tideStep(W, room, t);
      const S = W.sp;
      // the beam: extra swing (stopped dead while the count is read), forced level at the kill
      const fz = frozenAt(W, t);
      if (fz && !H.frozen) { H.frozen = true; }
      else if (!fz && H.frozen) { H.frozen = false; }
      if (!H.frozen) {
        let add = 0; for (const sw of W.swings) { const age = t - sw.t0; if (age > 0 && age < sw.d * 7) add += (0.5 * (sw.ax[0] - sw.ax[1]) / 20 + (sw.at || 0)) * Math.exp(-age / sw.d) * Math.sin(TAU * sw.f * age); }
        H.add = add;
      }
      H.force = W.fall && t >= W.fall.t0 + 0.6 ? 0 : null;
      if (!H.frozen) { const er = enrageRamp(W, t); if (er > 0) H.add += er * er * 0.09 * Math.sin(t * 17) * Math.sin(t * 5.3 + 1); }
      a.heave = heaveAt(W, t, S);
      calmed = calmSea(a, calmAt(W, ev, t));
      // the sea under the pans
      if (tideOn) { tideDraw(ctx, a, t, W); neckDraw(ctx, t, W); }
      if (typeof OR_VIEW !== 'undefined' && OR_VIEW.setWide) OR_VIEW.setWide(wideTarget(room, t));
      const er = enrageRamp(W, t);
      for (let i = 0; i < 2; i++) rimSurge(ctx, a, i, Math.max(liftOf(S, i), er * 0.85), t, S);
    } catch (e) { if (!baseLife.warned) { baseLife.warned = true; console.warn('[ormun moments]', e); } }
    try { baseLife.call(this, ctx, a, t); } finally { if (calmed) openSea(a); }
    try { overPans(ctx, a, t, W, ev); } catch (e) { if (!overPans.warned) { overPans.warned = true; console.warn('[ormun moments]', e); } }
  };

  // what is drawn over the pans, the bridge and the beam (and still under every telegraph and hero)
  function overPans(ctx, a, t, W, ev) {
    const S = W.sp;
    ctx.save();
    const er = enrageRamp(W, t);
    for (let i = 0; i < 2; i++) chainGlints(ctx, a, t, i, Math.max(liftOf(S, i), er * 0.9));
    bellsDraw(ctx, a, t, W);
    // the town's light: blotted out by the Tide as it passes over it (the spark is drawn by the room before this)
    if (S.vis > 0.02) {
      const hm = humpAt(S, GUIDE.uH), y = 505 - 290 * hm, w = (110 + 160 * hm) / 2;
      const cover = clamp01(1.3 - Math.abs(y - SPARK.y) / (w + 20)) * Math.min(1, S.vis * 1.4) * clamp01(0.15 + hm * 2);
      if (cover > 0.01) {
        const g = ctx.createRadialGradient(SPARK.x, SPARK.y, 4, SPARK.x, SPARK.y, 110);
        g.addColorStop(0, `rgba(0,1,4,${0.96 * cover})`); g.addColorStop(0.5, `rgba(0,1,4,${0.9 * cover})`); g.addColorStop(1, 'rgba(0,1,4,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(SPARK.x, SPARK.y, 110, 0, TAU); ctx.fill();
      }
    }
    if (W.fall && t >= W.fall.t0 + 1.0) { const k = smooth((t - W.fall.t0 - 1.0) / 2.5), fl = 0.9 + 0.08 * Math.sin(t * 1.3); glow(ctx, SPARK.x, SPARK.y, 52, '#ffb865', 0.14 * k * fl); glow(ctx, SPARK.x, SPARK.y, 18, '#ffd9a0', 0.4 * k * fl); }
    passLight(ctx, a, t, W);
    bridgeDraw(ctx, a, t, W, ev);
    ctx.restore();
  }
  // the light of the swell passing under the pans: a cold glow on the silver where the back is raised under it (soft, additive, under every telegraph and hero)
  function passLight(ctx, a, t, W) {
    const S = W.sp; if (S.vis < 0.03) return;
    if (S.surf < 0.05) return;
    const hp = pathAt(S.uc), hy = hp.y - 290 * S.surf * bump(hp.x / 270) * 0.6, br = S.surf * S.vis;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const p = OR_ROOM.panPose(a, i, t), lift = liftOf(S, i);
      ctx.save(); ctx.beginPath(); ctx.arc(p.cx, p.cy, PAN_R * p.k - 2, 0, TAU); ctx.clip();
      const g = ctx.createRadialGradient(hp.x, hy, 20, hp.x, hy, 520);
      g.addColorStop(0, `rgba(150,205,245,${0.16 * br})`); g.addColorStop(1, 'rgba(120,180,235,0)');
      ctx.fillStyle = g; ctx.fillRect(p.cx - 320, p.cy - 320, 640, 640);
      // the pan it lifts: its whole floor breathes a little brighter, brightest at the rim nearest the back
      if (lift > 0.05) { const g2 = ctx.createRadialGradient(p.cx, p.cy, PAN_R * 0.4, p.cx, p.cy, PAN_R); g2.addColorStop(0, 'rgba(160,210,248,0)'); g2.addColorStop(1, `rgba(160,210,248,${0.11 * lift})`); ctx.fillStyle = g2; ctx.fillRect(p.cx - 320, p.cy - 320, 640, 640); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- the bridge: hairlines of light in the stone as it groans, white across it at the break
  const BR_ = { x0: -110, x1: 110, y0: 10, y1: 110 };
  function bridgeDraw(ctx, a, t, W, ev) {
    const B = W.bridge; if (!B) return;
    if (!B.cracks) {
      const set = [];
      for (let i = 0; i < 7; i++) { const x = BR_.x0 + 20 + (i + hash(i, 4)) * (BR_.x1 - BR_.x0 - 40) / 7, y = hash(i, 9) < 0.5 ? BR_.y0 : BR_.y1; set.push({ pts: jag(x, y, y === BR_.y0 ? Math.PI / 2 : -Math.PI / 2, 6, 17, 1.2, 40 + i), w: 0.7 + hash(i, 2) * 0.5 }); }
      set.push({ pts: jag(BR_.x0 + 6, 60, 0, 12, 19, 0.9, 77), w: 1.1 });
      B.cracks = set;
    }
    const age = t - B.t0;
    const rel = B.rel != null ? t - B.rel : -1;
    if (rel > 2.4 || (a.bridge === 0 && rel < 0)) return;
    // grow through the build-up, flare across the held beat, lit white at the release
    const grow = clamp01(age / (B.build * 0.85)), hold = B.hold != null && t >= B.hold ? 1 : 0;
    let k = 0.32 * grow + 0.4 * hold; if (rel >= 0) k = Math.max(0, 1 - rel / 0.7) * 1.4;
    drawCracks(ctx, B.cracks, rel >= 0 ? 1 : easeOut(grow), k, FROST);
    if (rel >= 0 && rel < 0.6) additive(ctx, () => glow(ctx, 0, 60, 180, '#e6f2ff', 0.5 * (1 - rel / 0.6)));
  }

  // ---- the dark that closes in and the rings that run out, under the units and the warnings
  const underBase = ArenaView.drawRoomUnder;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    underBase.call(this, ctx, room, t, v);
    if (room && this.amb && this.amb.kind === 'scales') { try { ctx.save(); underDraw(ctx, room, t, v); ctx.restore(); } catch (e) { ctx.restore(); if (!underDraw.warned) { underDraw.warned = true; console.warn('[ormun moments]', e); } } }
  };
  const overBase = ArenaView.drawRoomOver;
  ArenaView.drawRoomOver = function (ctx, room, t, env) {
    overBase.call(this, ctx, room, t, env);
    if (room && env && env.bossId === 'ormun') { const W = state(room); W.env = env; if (env.boss) W.bd = env.boss; }
  };

  function underDraw(ctx, room, t, v) {
    const W = state(room), ev = room.ev;
    runQueue(W, t);
    const bd = v && v.boss; if (bd) W.bd = bd;
    if (W.introAsk) {
      W.introAsk = false; W.intro = { t0: t };
      if (!muted()) {
        play('bm-ormun-w-rise', { vol: 0.9, key: 'orw:rise' });
        // he takes the beam in his hand: the pans dip under the weight and settle
        swing(W, t + 1.6, { ax: [0, 0], ay: [11, 11], ak: [-0.04, -0.04], at: -0.3, f: 0.3, d: 2.2 });
        cam('lean', 0.03, 2.4, 0.6, 2.0);
        for (let n = 0; n < 3; n++) later(W, t, 0.9 + n * 0.8, () => { VFX.splash(rand(-120, 120), -60, { n: 5, speed: 0.8, size: 1, color: '#d8ecff' }); });
      }
    }
    // the edges of the sea go dark: slowly through a build-up, a little more in a held beat, thrown off at the release
    let k = 0;
    const B = ev['orm-springtide-buildup'], R = ev['orm-springtide-release'], Hd = ev['orm-springtide-hold'];
    if (B && t >= B.start && (!R || t < R.start)) { k = 0.4 * smooth((t - B.start) / (B.dur || 3.6)); if (Hd && t >= Hd.start) k = 0.58; }
    else if (R && t >= R.start && t < R.start + 1.6) k = lerp(0.58, 0, smooth((t - R.start) / 1.0)) ;
    const bb = ev['orm-bridge-buildup'], br = ev['orm-bridge-release'], bh = ev['orm-bridge-hold'];
    if (bb && t >= bb.start && (!br || br.start < bb.start || t < br.start)) { k = Math.max(k, 0.26 * smooth((t - bb.start) / (bb.dur || 2.7))); if (bh && bh.start >= bb.start && t >= bh.start) k = Math.max(k, 0.4); }
    const tb = ev['orm-tip-buildup'], tr = ev['orm-tip-release'], th = ev['orm-tip-hold'];
    if (tb && t >= tb.start && (!tr || tr.start < tb.start || t < tr.start)) { k = Math.max(k, 0.26 * smooth((t - tb.start) / (tb.dur || 3.3))); if (th && th.start >= tb.start && t >= th.start) k = Math.max(k, 0.4); }
    { const kf = ev['orm-kill-fall']; if (kf && t >= kf.start) k = 0; }   // (his fall is the only thing in the room)
    if (k > 0.004) vignette(ctx, k, 0, 40, 380, 1050);
    introDraw(ctx, room, t, W);
    enrageDraw(ctx, room, t, W);
    fallDraw(ctx, room, t, W);
  }

  // ---- the entrance: great slow rings out from his pier through the sea (under the pans: they hang over it)
  function introDraw(ctx, room, t, W) {
    const I = W.intro; if (!I) return;
    const age = t - I.t0; if (age < 0 || age > 6.5) return;
    // the water sheeting off him as he rises: streaks falling round the dais, thinning as he stands clear
    if (age < 4.2) {
      const k = Math.min(1, age / 0.6) * (1 - smooth((age - 2.4) / 1.8));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let n = 0; n < 70; n++) {
        const th = hash(n, 21) * TAU, rr = 90 + 100 * hash(n, 22), ph = (age * (0.8 + 0.5 * hash(n, 23)) + hash(n, 24)) % 1;
        const x = Math.cos(th) * rr, y = -170 + Math.sin(th) * rr * 0.9 - 40 + ph * 150;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.5, y + 30 + 40 * hash(n, 25)); ctx.strokeStyle = `rgba(${SILVER},${0.55 * (1 - ph) * k})`; ctx.lineWidth = 2 + 2.4 * hash(n, 26); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let n = 0; n < 4; n++) {
      const q = (age - n * 0.85) / 3.2; if (q <= 0 || q >= 1) continue;
      const r = 190 + 1000 * easeOut(q), al = Math.pow(1 - q, 1.5) * 0.34;
      brokenRing(ctx, 0, -170, r, r * 0.9, al * 1.5, 4 * (1 - q) + 1.4, n * 7 + 3, t);
    }
    ctx.restore();
  }

  // ---- the enrage: a dark that closes slowly; at the land the sea breaks inward over both pans and the room goes out
  // how far the enrage's build has got (0..1): the sea climbing both rims, the beam shaking harder
  function enrageRamp(W, t) { const E = W.enrage; if (!E || t < E.t0) return 0; return W.land && t >= W.land.t0 ? 0 : smooth((t - E.t0) / E.dur); }
  function enrageDraw(ctx, room, t, W) {
    const E = W.enrage, L = W.land; if (!E || t < E.t0) return;
    let k = smooth((t - E.t0) / E.dur) * 0.4;
    if (L && t >= L.t0) {
      const age = t - L.t0; k = Math.min(0.92, 0.4 + 0.52 * smooth(age / 1.0));
    } else if (t > E.t0 + E.dur + 0.4) return;
    const lk = L && t >= L.t0 ? smooth((t - L.t0) / 1.2) : 0;
    vignette(ctx, k, 0, 40, 330 - 120 * (k / 0.5) - 60 * lk, 900 - 260 * lk);
    // the land: the sea breaks in over both pans in a ring of foam from each rim to its middle
    if (L && t >= L.t0 && t - L.t0 < 1.5) {
      const age = t - L.t0, a = ambOf(); if (!a) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const p = OR_ROOM.panPose(a, i, t);
        for (let n = 0; n < 3; n++) { const q = clamp01((age - n * 0.09) / 0.9); if (q <= 0 || q >= 1) continue; const r = PAN_R * p.k * (1 - easeOut(q)); brokenRing(ctx, p.cx, p.cy, Math.max(4, r), Math.max(4, r), 0.9 * (1 - q * 0.5) * (1 - n * 0.25), 6 * (1 - q) + 1.5, i * 11 + n, t); }
      }
      ctx.restore();
    }
  }

  // ---- the kill: the water stops, the dark closes to the pans, one light left
  function fallDraw(ctx, room, t, W) {
    const F = W.fall; if (!F) return;
    const age = t - F.t0; if (age < 0) return;
    const k = smooth((age - 0.2) / 2.6);
    vignette(ctx, 0.74 * k, 0, 40, 520 - 130 * k, 1100);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    // the sea closing over him while he goes under (he is gone by about 2.7 s): two solid rings drawing in on the place he stood
    for (let n = 0; n < 2; n++) {
      const q = clamp01((age - 0.15 - n * 0.55) / 1.7); if (q <= 0 || q >= 1) continue;
      const r = 260 * (1 - easeOut(q)) + 30, al = 0.7 * Math.sin(q * Math.PI);
      ctx.beginPath(); ctx.ellipse(0, -170, r, r * 0.9, 0, 0, TAU); ctx.strokeStyle = `rgba(${FROST},${al * 0.3})`; ctx.lineWidth = 15 * (1 - q * 0.5); ctx.stroke();
      ctx.strokeStyle = `rgba(${SILVER},${al})`; ctx.lineWidth = 3.4 * (1 - q * 0.5) + 1; ctx.stroke();
    }
    // then one solid, slow swell: a broad band of lifted water out from the pier through the whole sea, lifting each pan as it passes under it
    const gq = clamp01((age - 0.5) / 3.2);
    if (gq > 0 && gq < 1) {
      const r = 150 + 1450 * smooth(gq), al = Math.sin(Math.min(1, gq * 1.15) * Math.PI * 0.5) * (1 - smooth((gq - 0.55) / 0.45));
      ctx.beginPath(); ctx.ellipse(0, -170, r, r * 0.9, 0, 0, TAU); ctx.strokeStyle = `rgba(${FROST},${al * 0.16})`; ctx.lineWidth = 120 * (1 - gq * 0.4); ctx.stroke();
      ctx.strokeStyle = `rgba(${SILVER},${al * 0.4})`; ctx.lineWidth = 34 * (1 - gq * 0.4); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${al * 0.8})`; ctx.lineWidth = 6 * (1 - gq * 0.5) + 1.5; ctx.stroke();
    }
    ctx.restore();
  }

  // ---- the entrance: BOSS_VFX.intro is wrapped: the room's own part (the rings, the groan, the lean) starts on the next draw
  if (typeof BOSS_VFX !== 'undefined' && BOSS_VFX.intro) {
    const intro0 = BOSS_VFX.intro;
    BOSS_VFX.intro = function (kind, b) {
      const r = intro0.apply(this, arguments);
      if (kind === 'ormun') { try { const room = ArenaView.liveRoom; if (room) { const W = state(room); W.introAsk = true; } } catch (e) { /* cosmetic */ } }
      return r;
    };
  }

  // ---- the kill is quiet: no confetti and no gold tint for him (BOSS_VFX.victory is shared; main.js calls it on every clear)
  if (typeof BOSS_VFX !== 'undefined' && BOSS_VFX.victory) {
    const victory0 = BOSS_VFX.victory;
    BOSS_VFX.victory = function () {
      try { const room = ArenaView.liveRoom; if (room && room.ev && room.ev['orm-kill-fall'] && ArenaView.amb && ArenaView.amb.kind === 'scales') return undefined; } catch (e) { /* cosmetic */ }
      return victory0.apply(this, arguments);
    };
  }

  // ---- the wall-fx stage: nothing of the plain gold seal, the fight's own moments above carry it
  WallFx.moment('ormun', null, {
    up() { },
    broke(S) { S.muffle(0, 0.5); },
  });

  // the run ends or is left: nothing held carries over (nothing here holds a sound or a timer of its own; the room's state goes with the room)
  const reset0 = WallFx.reset;
  WallFx.reset = function (...a) { const r = reset0.apply(this, a); try { const room = ArenaView.liveRoom; if (room && room.orw) room.orw.queue.length = 0; } catch (e) { /* cosmetic */ } return r; };

  const roomEvent0 = ArenaView.roomEvent;
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = roomEvent0.call(this, room, msg, now, ...rest);
    try { if (room && room.ev && msg && typeof msg.k === 'string' && msg.k.charCodeAt(0) === 111 && msg.k.charCodeAt(1) === 114) onEvent(room, msg, now); } catch (e) { /* cosmetic */ }   // 'or'
    return r;
  };
})();
