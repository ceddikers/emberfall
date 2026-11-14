// Maelis Orne's moments (wall-fx.js' stage, and the room events of arena/bosses/maelis.js, its MOMENTS contract): never told in words, only felt.
// She is very tall and very still, so every moment is built the same quiet way: a build-up the player can feel coming, one held beat in which the sound is
// thinned almost to nothing and the floor is bare (the script holds it), then the release, big and short. Silver, black, frost blue; the one warm colour in the
// whole set is the small cluster of lit windows on the world's night side, which every dark leaves lit alone, and the one place a warm dark red is allowed is the eclipse.
//
//   NEW MOON (the wall). The crown goes out (light drawn up out of the floor into it, the music thinned) and then the room: a slow dark that closes over the dust
//     and the sky, until the world and its one warm light are the brightest thing left in it (the dust barely there, every telegraph, hero, mark and silver line as bright as
//     ever: the dark lies under all of them). Each dash of the sword dance is a streak of light across the dark, a little longer, brighter and higher in note than the last.
//     The last light gathered (the party's own doing: mlpoolmet) is drawn up from the pool into her crown; the room holds its breath (the held beat); the Full Moon cast
//     draws the light in from every side; and the light comes back all at once (the room's dark thrown off, a front of light sweeping the floor from the world's side, one
//     flash, the clock stopped a few frames, the music surging back), and she breathes out.
//   THE HOUND'S RETURN. His howl first, long and cold, from nowhere (the room holds still for it, the camera draws back so the rim is in view); the freshest trail lit; a
//     held beat with nothing on the floor; then Garrow comes up out of the dark at the rim along that trail, through the lit steps, at his own speed; at the end of it he
//     crouches and the room holds again (the script's hang before the pounce); he lands (a ring, the floor shaken); she turns her head to him and vaults onto his back, and the
//     second form is the release: the clock stops, the crown and the pair flare once, the music changes, the bar is hers and his.
//   THE ECLIPSE BEGINS. The sky reddening from one edge while the crown dims (build-up, slow), the held beat, then the red takes its first edge, the world's lit rim goes copper,
//     and it stays: the one dark red in the set, never bright. No flash, no stop: dread, not a start.
//   TOTALITY. The red closes over the whole sky in the cast's eight seconds, the music drawn thin and low with one tone climbing; the held beat; at the land the room goes out.
//   THE KILL. She falls: the music stops, the clock stops, the dark closes in to a pool round her (the Hunt's wind ends with it), the crown goes out like a lamp, and the
//     small warm light of the town is the last thing lit. Both forms.
//   THE ENTRANCE. A column of pale light, the crown first; she lowers out of it; a ring runs out across the dust where she lands.
// Sound split: her casts and the smaller moves are the sound lane's (bm-maelis-*, bm-maelis-m-*); the staged beats and every release's hit and the howl are this file's (bm-maelis-w-*,
// sfx-synth.js @@WALL-maelis), and the room's bed (amb) is thinned in each held beat (Sound.duckBus, audio.js).
// Everything is drawn from the room events' times (room.ev[k].start), so a rejoin replay (ArenaView.roomEvent with FX.muted) sees the room as it is by now and hears nothing:
// sounds, the camera, the music and the spawned particles only come from a live event.
// The camera: main.js baseCamera asks ML_MOM.view(room, now) (below) for a zoom factor and a pull toward a point (kept short, and the player is always left in frame).

(() => {
  if (typeof WallFx === 'undefined' || typeof ArenaView === 'undefined' || typeof ML_VIEW === 'undefined' || typeof MN_ROOM === 'undefined') return;
  const TAU = Math.PI * 2, R = 560;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const smooth = q => { q = clamp01(q); return q * q * (3 - 2 * q); };
  const easeOut = q => 1 - (1 - q) * (1 - q);
  const lerp = (a, b, q) => a + (b - a) * q;
  const hash = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const SILVER = '223,233,245', FROST = '159,216,255', NIGHT = '2,4,10', WARM = '#ffb865', WARMH = '#ffe3ae', BLOOD = '90,10,18';
  const WORLD = MN_ROOM.WORLD, TOWN = MN_ROOM.TOWN, TPT = { x: WORLD.x + TOWN.cx, y: WORLD.y + TOWN.cy };

  const muted = () => typeof FX !== 'undefined' && !!FX.muted;
  const cam = (k, ...a) => { try { if (typeof FX !== 'undefined' && FX.cam && FX.cam[k]) FX.cam[k](...a); } catch (e) { /* cosmetic */ } };
  const bus = (...a) => { try { if (typeof Sound !== 'undefined' && Sound.duckBus) Sound.duckBus('amb', ...a); } catch (e) { /* cosmetic */ } };
  const mus = (k, ...a) => { try { if (typeof Sound !== 'undefined' && Sound.music && Sound.music[k]) Sound.music[k](...a); } catch (e) { /* (the music is only a mood) */ } };
  const play = (name, o) => { try { return typeof SoundHooks !== 'undefined' ? SoundHooks.play(name, Object.assign({ vol: 1, key: 'mlw:' + name, minGap: 0.15 }, o)) : false; } catch (e) { return false; } };
  const shake = n => { try { if (typeof vfxShake === 'function') vfxShake(n, 'boss'); else if (typeof FX !== 'undefined') FX.shake = Math.max(FX.shake || 0, n); } catch (e) { /* cosmetic */ } };
  const shock = (x, y, o) => { try { return VFX.shock(x, y, Object.assign({ flat: 1, layer: 'ground' }, o)); } catch (e) { return null; } };

  // ---- the room's own state for the moments (one per raid: room objects are made fresh for each)
  const state = room => room.mlw || (room.mlw = { queue: [], bd: null, dashes: [], wolf: { t: 0, props: {}, action: null, moving: false }, wang: null, lastPool: null, met: null, hold: null, rel: null, introAsk: false, intro: null, vault: null, land: null, crownPt: null });
  const later = (W, now, secs, fn) => { W.queue.push({ at: now + secs, fn }); };
  function runQueue(W, t) {
    if (!W.queue.length) return;
    const due = [], keep = [];
    for (const q of W.queue) (q.at <= t ? due : keep).push(q);
    W.queue = keep;
    for (const q of due) if (t - q.at < 0.6 && !muted()) { try { q.fn(); } catch (e) { /* cosmetic */ } }
  }
  const evOf = (room, k) => (room && room.ev ? room.ev[k] : null);
  const ambOf = () => (ArenaView.amb && ArenaView.amb.kind === 'moon' ? ArenaView.amb : null);
  const form2Of = room => { const f = evOf(room, 'mlform'); return !!(f && f.n === 2); };
  // where her crown is (the art's crown, CROWN_Y -178 at the scale she is drawn; a rider sits higher)
  const crownPt = (bd, room) => ({ x: bd.x, y: bd.y - (form2Of(room) ? 262 : 226) });

  // ================================================================== the live end: what a room event sets off
  const HOLD = 1.5;
  function onEvent(room, msg, now) {
    const k = msg.k, W = state(room), on = !muted();
    switch (k) {
      // ---------------------------------------------------------------- NEW MOON
      case 'mlwallup':
        W.dashes.length = 0; W.met = null; W.rel = null; W.hold = null;
        if (on) {
          play('bm-maelis-w-wane', { vol: 0.55, key: 'mlw:wane' });   // (under the cast's own build)
          mus('muffle', 1700, 2.8); mus('duck', 0.4, 3.4); bus(0.4, 3.6);
          cam('lean', 0.03, 2.4, 0.4, 1.4);
        }
        break;
      case 'mlnight':
        if (msg.on) {
          if (on) { play('bm-maelis-w-dark', { vol: 0.85, key: 'mlw:dark' }); mus('muffle', 1500, 1.4); mus('duck', 0.2, 1.6); }
        } else {
          W.rel = { t0: now };
          if (on) {
            // THE RELEASE: the light comes back all at once
            play('bm-maelis-w-light', { vol: 1, key: 'mlw:light' });
            cam('stop', 0.12); cam('flash', '#eaf4ff', 0.16, 0.45); cam('punch', 0.03, 0.65);
            mus('muffle', 0, 0.35); later(W, now, 0.1, () => mus('swell', 0.32, 2.0)); shake(10);
            const bd = W.bd, cp = bd ? crownPt(bd, room) : { x: 0, y: -280 };
            if (bd) {
              VFX.flash(cp.x, cp.y, 150, '#e8f2ff', 0.26);
              for (let i = 0; i < 34; i++) VFX.spawn({ x: rand(-R * 0.9, R * 0.9), y: rand(-R * 0.7, R * 0.7), z: rand(0, 20), vx: rand(-14, 14), vy: rand(-10, 10), vz: rand(50, 150), g: -20, drag: 0.02, life: rand(1.3, 2.4), size: rand(4, 9), size1: 0, color: i % 3 ? '#dfeaff' : '#ffffff', kind: 'star' });
            }
          }
        }
        break;
      case 'mlstepl': {
        const D = { i: msg.i | 0, x1: msg.x1, y1: msg.y1, x2: msg.x2, y2: msg.y2, land: now + (msg.at || 0), w: msg.w || 90, cx: msg.cx, cy: msg.cy, r: msg.r };
        W.dashes.push(D); while (W.dashes.length > 8) W.dashes.shift();
        if (on) {
          later(W, now, Math.max(0, (msg.at || 0) - 0.06), () => {
            const q = clamp01(D.i / 5);
            play('bm-maelis-w-streak', { vol: 0.55 + 0.35 * q, rate: 1 + 0.075 * D.i, key: 'mlw:streak' + D.i, minGap: 0.1 });
            shake(2 + 3 * q); if (D.i >= 3) cam('punch', 0.004 + 0.003 * (D.i - 3), 0.3);
            VFX.flash(D.x2 - (D.x2 - D.x1) * 0.1, D.y2 - (D.y2 - D.y1) * 0.1, 70 + 12 * D.i, '#e8f2ff', 0.16);
            VFX.sparks(D.x2, D.y2, { color: '#e8f2ff', n: 4 + D.i, speed: 260 + 40 * D.i, up: 60, life: 0.8 });
          });
        }
        break;
      }
      case 'mlpool': if (msg.last) W.lastPool = { x: msg.x, y: msg.y, r: msg.r, t0: now }; break;
      case 'mlpoolmet':
        if (msg.ok) {
          W.met = { t0: now };
          if (on) {
            // the party gathered the last light: it is drawn up out of the pool into her crown (the cause; the held beat is its answer)
            play('bm-maelis-w-answer', { vol: 0.9, key: 'mlw:answer' });
            const p = W.lastPool;
            if (p) { VFX.motes(p.x, p.y, { color: '#e6f2ff', n: 14, r: p.r * 0.7, rise: 1.6, life: 1.3 }); shock(p.x, p.y, { r: p.r * 1.5, color: '#e6f2ff', w: 5, dur: 0.7 }); }
          }
        }
        break;
      case 'mlnmhold':
        W.hold = { t0: now, dur: msg.dur || HOLD };
        if (on) {
          mus('muffle', 380, 0.2); mus('duck', 0.95, (msg.dur || HOLD) + 0.1); bus(0.9, (msg.dur || HOLD) + 0.2);
          later(W, now, 0.3, () => play('bm-maelis-w-hold', { vol: 0.3, key: 'mlw:hold' }));
          cam('lean', 0.04, 1.3, 0.25, 0.9);
        }
        break;
      case 'mlnmfull':
        W.full = { t0: now, at: msg.at || 3.6 };
        if (on) {
          play('bm-maelis-w-gather', { vol: 0.9, key: 'mlw:gather' });
          mus('muffle', 700, 0.3); later(W, now, 1.0, () => mus('muffle', 2400, 2.4));
        }
        break;
      case 'mlnmdown': if (on) later(W, now, 0.1, () => play('bm-maelis-w-breath', { vol: 0.7, key: 'mlw:breath' })); break;

      // ---------------------------------------------------------------- THE HOUND'S RETURN
      case 'mlhowl':
        W.howl = { t0: now, dur: msg.dur || 3.6 }; W.road = null; W.returnAt = null; W.pounce = null; W.land = null; W.vault = null; W.wang = null;
        if (on) {
          play('bm-maelis-w-howl', { vol: 1, key: 'mlw:howl' });
          mus('muffle', 700, 0.8); mus('duck', 0.7, (msg.dur || 3.6) + 0.5); bus(0.6, (msg.dur || 3.6) + 0.3);
          cam('lean', 0.02, 2.0, 0.6, 1.4);
        }
        break;
      case 'mlreturnhold':
        W.rhold = { t0: now, dur: msg.dur || 1.3 };
        if (on) {
          mus('muffle', 380, 0.25); mus('duck', 0.95, (msg.dur || 1.3) + 0.1); bus(0.9, (msg.dur || 1.3) + 0.2);
          later(W, now, 0.25, () => play('bm-maelis-w-hold', { vol: 0.28, rate: 0.84, key: 'mlw:rhold' }));
        }
        break;
      case 'mlreturn': W.returnAt = now; break;
      case 'mlpounce':
        if (!msg.kd && W.returnAt != null && now - W.returnAt < 0.3) {
          W.pounce = { x: msg.x, y: msg.y, r: msg.r, t0: now, land: now + (msg.at || 1) };
          const road = W.road && room.ev[W.road];
          if (on && road) {
            const L = pathLen(road), arrive = road.start + (road.at || 0) + L / (road.sp || 820), hang = Math.max(0.3, W.pounce.land - arrive);
            // the held beat of his arrival: he is at the end of the trail, crouched; the room holds still until he lands
            later(W, now, Math.max(0, arrive - now - 0.05), () => { mus('muffle', 420, 0.2); mus('duck', 0.9, hang + 0.1); bus(0.85, hang + 0.2); });
            later(W, now, Math.max(0, W.pounce.land - now - 0.02), () => {
              const e = W.pounce;
              // (the landing's sound is the sound lane's: bm-maelis-m-pounce, from the pounce's own tag; this is only the picture)
              cam('stop', 0.1); cam('punch', 0.022, 0.6); shake(12);
              shock(e.x, e.y + 6, { r: Math.max(260, e.r * 1.6), color: '#e6f2ff', w: 9, dur: 0.8 }); shock(e.x, e.y + 6, { r: Math.max(150, e.r), color: '#d8e6fa', w: 5, dur: 0.5, delay: 0.05 });
              VFX.flash(e.x, e.y - 40, 160, '#cfe0f6', 0.15);   // (cool and low: the no-white-out rule)
              for (let i = 0; i < 26; i++) { const a = rand(0, TAU), sp = rand(120, 380); VFX.spawn({ x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 24, z: rand(4, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: rand(80, 240), g: 420, drag: 0.03, life: rand(0.8, 1.5), size: rand(14, 26), size1: 46, color: '#dfe9f8', kind: 'smoke', add: false, a: 0.4 }); }
            });
          }
        }
        break;
      case 'mlmount':
        W.vault = { t0: now, x: msg.x, y: msg.y, fx: msg.fx, fy: msg.fy };
        if (on) { play('bm-maelis-w-vault', { vol: 0.8, key: 'mlw:vault' }); mus('duck', 0.85, 1.2); }
        break;
      case 'mlform':
        if (msg.n === 2) {
          W.form2 = now;
          if (on && W.vault && now - W.vault.t0 < 5) {
            // THE RELEASE of the Return: she is on his back. The second form: the clock stops, the pair flares once, the music changes
            play('bm-maelis-w-hunt', { vol: 1, key: 'mlw:hunt' });
            cam('stop', 0.14); cam('flash', '#e2f2ff', 0.14, 0.5); cam('punch', 0.032, 0.7); shake(12);
            mus('muffle', 0, 0.3); mus('duck', 0.9, 0.4); later(W, now, 0.4, () => { mus('layer', 'mus-maelis'); mus('swell', 0.34, 2.2); });
            const x = msg.x != null ? msg.x : W.vault.x, y = msg.y != null ? msg.y : W.vault.y;
            VFX.flash(x, y - 120, 170, '#cfe0f6', 0.15);
            for (let i = 0; i < 30; i++) VFX.spawn({ x: x + rand(-60, 60), y: y + rand(-20, 20), z: rand(10, 90), vx: rand(-60, 60), vy: rand(-30, 30), vz: rand(60, 220), g: 30, drag: 0.03, life: rand(1.1, 2.0), size: rand(5, 10), size1: 0, color: i % 3 ? '#dfeaff' : '#ffffff', kind: 'star' });
          }
          else if (!on) mus('layer', 'mus-maelis');   // (a rejoin's replay, or a tab in the background: the mount is not staged, and the harder music is state, so it is set now; sound-hooks.js LAYER_LATE does the same for a start from Hunter's Moon)
        } else { W.form2 = null; }
        break;

      // ---------------------------------------------------------------- THE ECLIPSE BEGINS
      case 'mleclipse0':
        if (on) {
          play('bm-maelis-w-dusk', { vol: 0.5, key: 'mlw:dusk' });   // (under the cast's own build)
          mus('muffle', 1600, (msg.at || 5.4) * 0.8); mus('duck', 0.35, msg.at || 5.4); bus(0.4, (msg.at || 5.4) * 0.8);
          cam('lean', 0.024, 2.4, 0.8, 1.6);
        }
        break;
      case 'mleclipsehold':
        if (on) { mus('muffle', 380, 0.25); mus('duck', 0.95, (msg.dur || 1.7) + 0.1); bus(0.9, (msg.dur || 1.7) + 0.2); later(W, now, 0.25, () => play('bm-maelis-w-hold', { vol: 0.28, rate: 0.72, key: 'mlw:ehold' })); }
        break;
      case 'mleclipse':
        // the release: the red takes its first edge, the world's rim goes copper. No flash and no stop: a slow low swell, and the music coming back dark
        if (on) {
          play('bm-maelis-w-eclipse', { vol: 1, key: 'mlw:eclipse' });
          mus('muffle', 0, 1.6); later(W, now, 0.2, () => mus('swell', 0.18, 3.0)); cam('lean', 0.028, 1.2, 1.2, 2.4); shake(5);
        }
        break;

      // ---------------------------------------------------------------- TOTALITY
      case 'mltotality':
        if (on) { later(W, now, 1.0, () => play('bm-maelis-w-total-build', { vol: 0.9, key: 'mlw:totb' })); mus('muffle', 700, (msg.dur || 8) * 0.9); mus('duck', 0.4, msg.dur || 8); bus(0.5, msg.dur || 8); }
        break;
      case 'mltotalityhold':
        if (on) { mus('muffle', 380, 0.25); mus('duck', 0.95, (msg.dur || 1.6) + 0.1); bus(0.9, (msg.dur || 1.6) + 0.2); later(W, now, 0.25, () => play('bm-maelis-w-hold', { vol: 0.3, rate: 0.6, key: 'mlw:thold' })); }
        break;
      case 'mltotalityland':
        if (on) {
          play('bm-maelis-w-total', { vol: 1, key: 'mlw:total' });
          cam('stop', 0.2); cam('punch', 0.04, 0.8); cam('dim', 0.5, 1.0); shake(14);
          mus('muffle', 0, 0.2); mus('duck', 0.96, 3); bus(0.85, 3);
          const bd = W.bd;
          if (bd) { shock(bd.x, bd.y + 6, { r: 1000, color: '#e6d0d4', w: 9, dur: 1.0, clip: 1 }); }
        }
        break;

      // ---------------------------------------------------------------- THE KILL
      case 'mlfall':
        W.fall = { t0: now, form2: form2Of(room) };
        if (on) {
          play(W.fall.form2 ? 'bm-maelis-w-fall2' : 'bm-maelis-w-fall', { vol: 1, key: 'mlw:fall' });
          mus('muffle', 500, 0.3); mus('duck', 0.97, 6); bus(0.92, 6);
          cam('stop', 0.18); cam('lean', 0.05, 0.7, 1.2, 1.6);
          const bd = W.bd, cp = bd ? crownPt(bd, room) : null;
          if (cp) for (let i = 0; i < 22; i++) VFX.spawn({ x: cp.x + rand(-30, 30), y: bd.y + rand(-14, 14), z: rand(80, 220), vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(10, 80), g: 40, drag: 0.04, life: rand(1.6, 2.8), size: rand(5, 10), size1: 0, color: i % 3 ? '#dfeaff' : '#ffffff', kind: 'star' });
        }
        break;
    }
    if (k.startsWith('mlpath:') && msg.kd === 'return') W.road = k;
  }
  // the length of a road event's line, and the point and heading at a distance along it
  function pathLen(e) { if (e._mlL != null) return e._mlL; const l = e.l || []; let L = 0; const cum = [0]; for (let i = 1; i < l.length; i++) { L += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); cum.push(L); } e._mlCum = cum; return (e._mlL = L); }
  function pathAt(e, d) {
    pathLen(e); const l = e.l, cum = e._mlCum; d = clamp(d, 0, e._mlL);
    let i = 1; while (i < l.length - 1 && cum[i] < d) i++;
    const a = l[i - 1], b = l[i], seg = (cum[i] - cum[i - 1]) || 1, u = (d - cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }

  // ================================================================== the camera (main.js baseCamera): a zoom factor and a pull toward a point, from the events alone
  function viewOf(room, t) {
    const out = { z: 1, c: 0, fx: 0, fy: -60 };
    if (!room || !room.ev) return out;
    const ev = room.ev, add = (k, z, c, fx, fy) => { if (k <= 0.004) return; out.z = Math.min(out.z, 1 - (1 - z) * k); if (c * k > out.c) { out.c = c * k; out.fx = fx; out.fy = fy; } };
    const N = ev.mlnight;
    if (N) add(N.on ? smooth((t - N.start) / 2.4) : 1 - smooth((t - N.start) / 1.6), 0.8, 0.85, 110, -20);
    const H = ev.mlhowl, F = ev.mlform;
    if (H && t >= H.start) {
      const done = F && F.n === 2 && F.start >= H.start ? F.start : H.start + 24;
      add(smooth((t - H.start) / 1.6) * (1 - smooth((t - done - 0.8) / 2.4)), 0.84, 0.9, 0, -30);
    }
    const E = ev.mleclipse0, ER = ev.mleclipse;
    if (E && t >= E.start) add(smooth((t - E.start) / (E.at || 5.4)) * (ER && ER.start >= E.start ? 1 - smooth((t - ER.start - 3) / 4) * 0.5 : 1), 0.82, 0.9, 130, -60);
    const T = ev.mltotality;
    if (T && t >= T.start) add(smooth((t - T.start) / ((T.dur || 8) * 0.8)), 0.82, 0.9, 130, -60);
    const K = ev.mlfall;
    if (K && t >= K.start) add(smooth((t - K.start) / 2), 0.8, 0.85, 100, -60);
    return out;
  }
  window.ML_MOM = {
    view: (room, t) => { try { return viewOf(room, t); } catch (e) { return { z: 1, c: 0, fx: 0, fy: 0 }; } },
    // the camera's target (the top-left corner tx, ty of a view vw by vh at zoom z) pulled toward the point the moment is about, the player always left in frame
    pull(v, tx, ty, vw, vh, z, px, py) {
      if (!v || v.c <= 0.004) return { x: tx, y: ty };
      let cx = tx + vw / 2, cy = ty + vh / 2;
      cx += (v.fx - cx) * v.c; cy += (v.fy - cy) * v.c;
      const mx = 150 / z, mt = 190 / z, mb = 210 / z;   // (screen margins in world px: the party frame, the boss plate and the ability bar)
      cx = clamp(cx, px - vw / 2 + mx, px + vw / 2 - mx); cy = clamp(cy, py - vh / 2 + mt, py + vh / 2 - mb);
      return { x: cx - vw / 2, y: cy - vh / 2 };
    },
  };

  // ================================================================== the ambient pass (under everything: prints, silver lines, corridors, telegraphs, heroes all lie over it)
  // The room's own eclipse level and sky edge, from the events alone
  function eclipseOf(room, t) {
    const ev = room.ev, E = ev.mleclipse0, EH = ev.mleclipsehold, ER = ev.mleclipse, T = ev.mltotality, cr = ev.mlcrown;
    const crown = cr && cr.red != null ? +cr.red : 0;
    let edge = 0, L = crown;
    if (E && t >= E.start) {
      const d = E.at || 5.4, build = smooth((t - E.start) / (d * 0.78));
      edge = 0.36 * build; L = Math.max(L, 0.1 * build);
      if (ER && ER.start >= E.start && t >= ER.start) { const r = smooth((t - ER.start) / 4); edge = 0.36 + 0.4 * r; L = Math.max(crown, lerp(0.1, 0.42, r)); }
      else if (!ER && t > E.start + d + 6) { edge = 0.76; L = Math.max(crown, 0.42); }   // (a rejoiner who missed the release: where it stands now)
    }
    if (T && t >= T.start) { const q = smooth((t - T.start) / (T.dur || 8)); edge = Math.max(edge, lerp(0.76, 1.4, q)); L = lerp(Math.max(0.42, Math.min(L, 0.5)), 1, q); }
    return { edge, L: clamp01(L), hold: EH && ER == null && t >= EH.start };
  }
  // a patch of the world drawn again on top of a dark: the sprite and the lights of the town
  function worldAgain(ctx, a, t, k, red, cop) {
    if (k <= 0.004 || !a.world) return;
    const w = cop || red > 0.5 ? a.world.cop : a.world.frost, half = w.half, sz = half * 2;
    ctx.save(); ctx.globalAlpha = clamp01(k);
    ctx.drawImage(w.cv, WORLD.x - half, WORLD.y - half, sz, sz);
    ctx.restore();
  }
  function townLights(ctx, t, k, big) {
    if (k <= 0.004) return;
    ctx.save(); ctx.translate(WORLD.x, WORLD.y); ctx.globalCompositeOperation = 'lighter';
    TOWN.w.forEach((p, i) => {
      const tw = 0.88 + 0.08 * Math.sin(t * (0.7 + (i % 4) * 0.23) + p.ph) + 0.04 * Math.sin(t * 2.9 + i), v = tw * k;
      glow(ctx, p.x, p.y, (p.big ? 13 : 7) * big, WARM, 0.34 * v); ctx.fillStyle = rgba(p.big ? WARMH : WARM, Math.min(1, v)); const s = (p.big ? 3.4 : 2.4) * Math.sqrt(big); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    });
    glow(ctx, TOWN.cx, TOWN.cy, 46 * big, WARM, 0.08 * k);
    ctx.restore();
  }
  const skyRing = (ctx, a, fn) => { const r2 = Math.min(a.bx, a.by) + 120; ctx.save(); ctx.beginPath(); ctx.rect(-a.bx, -a.by, a.bx * 2, a.by * 2); ctx.arc(0, 0, R + 4, 0, TAU, true); ctx.clip('evenodd'); fn(r2); ctx.restore(); };

  // how deep the wall's dark is (0..1 of its own, over what the room's own dark already does): it closes slowly, deepens in the held beat, is thrown off at the release
  function nightOf(room, t) {
    const N = evOf(room, 'mlnight'); if (!N) return 0;
    if (N.on) { const H = evOf(room, 'mlnmhold'); let k = smooth((t - N.start) / 1.7); if (H && H.start >= N.start && t >= H.start) k = Math.max(k, 1) + 0.0; return k; }
    return Math.max(0, 1 - (t - N.start) / 0.12);
  }
  function ambientDraw(ctx, a, t, room) {
    const W = state(room), ev = room.ev, bd = W.bd;
    runQueue(W, t);
    // ---- NEW MOON: the deep dark. The room's own dark (maelis-room.js, 0.64 over the dust) is under this; this closes the dust to near nothing and lifts the world and its one warm light out of it.
    const nk = nightOf(room, t);
    if (nk > 0.004) {
      const H = ev.mlnmhold, hk = H && H.start >= (ev.mlnight ? ev.mlnight.start : 0) && t >= H.start ? smooth((t - H.start) / 0.3) : 0, F = ev.mlnmfull, fk = F && t >= F.start ? smooth((t - F.start) / F.at) : 0;
      const dust = 0.3 * nk + 0.08 * hk;
      ctx.save(); ctx.fillStyle = rgba('#02040a', dust); ctx.beginPath(); ctx.arc(0, 0, R + 0.5, 0, TAU); ctx.fill();
      skyRing(ctx, a, () => { ctx.fillStyle = rgba('#02040a', 0.34 * nk); ctx.fillRect(-a.bx, -a.by, a.bx * 2, a.by * 2); });
      // the lip of the floor stays readable: a thin cold line, and a little cold light along it that breathes
      ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, TAU); ctx.strokeStyle = rgba('#b4cdf0', (0.2 + 0.06 * Math.sin(t * 0.9)) * nk); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      // the world, brightest of all: the sprite back over the dark, its haze, and the windows of the town bigger and warmer
      const hold = clamp01(hk + fk * 0.6);
      worldAgain(ctx, a, t, 0.78 * nk, a.cur ? a.cur.red : 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, WORLD.x - 40, WORLD.y + 30, WORLD.r * 1.5, '#8fbdf0', (0.1 + 0.07 * hold) * nk);
      ctx.restore();
      townLights(ctx, t, nk * (1 + 0.25 * hold), 1.25 + 0.2 * hold);
      // the stars stand out: a few more of the twinkling ones, drawn again brighter over the dark sky
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const s of a.tw) { const q = 0.5 + 0.5 * Math.sin(t * s.k + s.ph); glow(ctx, s.x, s.y, s.big ? 12 : 7, '#cfe0ff', 0.2 * nk * (0.4 + 0.6 * q)); ctx.fillStyle = rgba('#ffffff', 0.55 * nk * (0.4 + 0.6 * q)); ctx.fillRect(s.x - 0.9, s.y - 0.9, 1.8, 1.8); }
      ctx.restore();
      // the held beat and the build of Full Moon: the dark closes in a little more, toward her, and then light is drawn in round her crown
      if (bd && (hk > 0.004 || fk > 0.004)) {
        const cp = crownPt(bd, room);
        const g = ctx.createRadialGradient(bd.x, bd.y - 80, 160, bd.x, bd.y - 80, 760); g.addColorStop(0, rgba('#02040a', 0)); g.addColorStop(1, rgba('#02040a', 0.36 * Math.max(hk, fk)));
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R + 0.5, 0, TAU); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
        void cp;
      }
    }
    // ---- the Hound's howl: the lip of the floor takes a thin pale light for as long as the room holds still for it (and the held beat after), and lets go as the road is laid
    const HW = ev.mlhowl;
    if (HW && t >= HW.start) {
      const RH = ev.mlreturnhold, endT = RH && RH.start >= HW.start ? RH.start + RH.dur : HW.start + (HW.dur || 3.6) + 1.6, k = smooth((t - HW.start) / 0.9) * (1 - smooth((t - endT) / 0.7));
      if (k > 0.004) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, TAU); ctx.strokeStyle = rgba('#b4cdf0', 0.3 * k * (0.8 + 0.2 * Math.sin(t * 1.3))); ctx.lineWidth = 3.5; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R - 9, 0, TAU); ctx.strokeStyle = rgba('#dfeaff', 0.1 * k); ctx.lineWidth = 12; ctx.stroke(); ctx.restore(); }
    }
    // ---- the eclipse: the sky reddens from the left edge in, the world's rim goes copper (the room's own red level is set in the wrapped life below), never bright
    const EC = eclipseOf(room, t);
    if (EC.edge > 0.004) {
      skyRing(ctx, a, r2 => {
        const e = EC.edge, x0 = -a.bx, w = a.bx * 2, front = x0 + w * clamp(e, 0, 1.05);
        const g = ctx.createLinearGradient(x0, 0, front + 160, 0);
        g.addColorStop(0, rgba('#4a0710', 0.62)); g.addColorStop(clamp(e * 0.75, 0.02, 0.98), rgba('#34050c', 0.46)); g.addColorStop(1, rgba('#2a0409', 0));
        ctx.fillStyle = g; ctx.fillRect(x0, -a.by, w, a.by * 2);
      });
    }
    // the world's lit rim, copper, over the red of the sky (the sky's own reddening would otherwise bury it)
    if (EC.L > 0.08) worldAgain(ctx, a, t, 0.8 * clamp01((EC.L - 0.08) / 0.3), 1, true);
    // ---- totality's land: the room goes out
    const LD = ev.mltotalityland;
    if (LD && t >= LD.start) {
      const k = smooth((t - LD.start) / 0.9);
      ctx.save(); ctx.fillStyle = rgba('#080104', 0.8 * k); ctx.beginPath(); ctx.arc(0, 0, R + 0.5, 0, TAU); ctx.fill();
      skyRing(ctx, a, () => { ctx.fillStyle = rgba('#080104', 0.8 * k); ctx.fillRect(-a.bx, -a.by, a.bx * 2, a.by * 2); });
      ctx.restore();
      townLights(ctx, t, 0.7 * k, 1.2);
    }
    // ---- the kill: the dark closes in to a pool round her; the crown goes out like a lamp; the town's light is the last thing lit
    const FL = ev.mlfall;
    if (FL && t >= FL.start) {
      const age = t - FL.start, k = smooth((age - 0.1) / 2.3), out = smooth((age - 3.0) / 1.6), cx = bd ? bd.x : 0, cy = bd ? bd.y - 120 : 0;
      ctx.save();
      const R1 = lerp(1500, 220, easeOut(k)) * (1 - 0.7 * out), g = ctx.createRadialGradient(cx, cy, Math.max(1, R1 * 0.3), cx, cy, R1 + 60);
      g.addColorStop(0, rgba('#02040a', 0)); g.addColorStop(1, rgba('#02040a', 0.94 * k));
      ctx.fillStyle = g; ctx.fillRect(-a.bx, -a.by, a.bx * 2, a.by * 2);
      ctx.fillStyle = rgba('#02040a', 0.9 * out); ctx.fillRect(-a.bx, -a.by, a.bx * 2, a.by * 2);
      ctx.restore();
      // the one warm light, steady, over the dark
      const wk = smooth((age - 0.6) / 1.6);
      townLights(ctx, t, wk * (0.85 + 0.25 * out), 1.3 + 0.4 * out);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, TPT.x, TPT.y, 90, WARM, 0.06 * wk * out); ctx.restore();
    }
  }

  // ================================================================== under the units and the telegraphs
  function underDraw(ctx, room, t, v) {
    const W = state(room), ev = room.ev, bd = v && v.boss; if (bd) W.bd = bd;
    if (!bd) return;
    const cp = crownPt(bd, room);
    runQueue(W, t);
    if (W.introAsk) { W.introAsk = false; W.intro = { t0: t }; if (!muted()) introLive(W, bd, t); }
    introDraw(ctx, W, bd, t);
    crownOut(ctx, room, W, bd, cp, t);
    dashDraw(ctx, W, t, false);
    answerDraw(ctx, room, W, bd, cp, t);
    gatherDraw(ctx, room, W, bd, cp, t);
    releaseDraw(ctx, room, W, bd, cp, t);
    houndDraw(ctx, room, W, t);
    vaultDraw(ctx, room, W, t);
    formDraw(ctx, room, W, bd, t);
    fallDraw(ctx, room, W, bd, cp, t);
  }
  const additive = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };

  // ---- the entrance: a column of pale light, the crown first, a ring where she lands
  function introLive(W, bd, t) {
    play('bm-maelis-w-enter', { vol: 0.9, key: 'mlw:enter' });
    cam('lean', 0.03, 2.2, 0.6, 1.6);
    later(W, t, 2.5, () => { const b = W.bd; if (!b) return; shock(b.x, b.y + 8, { r: 520, color: '#e6f2ff', w: 8, dur: 0.9, clip: 1 }); shock(b.x, b.y + 8, { r: 260, color: '#ffffff', w: 4, dur: 0.6, delay: 0.08 }); shake(5); VFX.motes(b.x, b.y, { color: '#e6f2ff', n: 14, r: 70, rise: 1.2, life: 1.6 }); });
  }
  function introDraw(ctx, W, bd, t) {
    const I = W.intro; if (!I) return;
    const age = t - I.t0; if (age < 0 || age > 5.2) return;
    const k = smooth(age / 0.8) * (1 - smooth((age - 3.2) / 1.6));
    additive(ctx, () => {
      const g = ctx.createLinearGradient(0, bd.y - 700, 0, bd.y + 10); g.addColorStop(0, rgba('#dfeaff', 0)); g.addColorStop(0.55, rgba('#dfeaff', 0.1 * k)); g.addColorStop(1, rgba('#f4f9ff', 0.22 * k));
      ctx.fillStyle = g;
      for (const w of [1, 0.7, 0.4]) { ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(bd.x - 28 * w, bd.y - 700); ctx.lineTo(bd.x + 28 * w, bd.y - 700); ctx.lineTo(bd.x + 84 * w, bd.y + 10); ctx.lineTo(bd.x - 84 * w, bd.y + 10); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(bd.x, bd.y + 8); ctx.scale(1, 0.4); glow(ctx, 0, 0, 150, '#e6f2ff', 0.34 * k); ctx.restore();
    });
  }

  // ---- the crown goes out (New Moon's build-up): light is drawn up out of the floor into the crown and the crown darkens
  function crownOut(ctx, room, W, bd, cp, t) {
    const U = evOf(room, 'mlwallup'); if (!U) return;
    const age = t - U.start; if (age < 0 || age > 4.6) return;
    const k = smooth(age / 0.5) * (1 - smooth((age - 2.8) / 1.6));
    additive(ctx, () => {
      // rings of light draw in on the crown from round it and go out
      for (let n = 0; n < 4; n++) {
        const q = clamp01((age - n * 0.42) / 1.8); if (q <= 0 || q >= 1) continue;
        const r = 200 * (1 - easeOut(q)) + 14;
        ctx.lineWidth = 2.2 * (1 - q) + 0.8; ctx.strokeStyle = rgba('#dfeaff', 0.7 * Math.sin(q * Math.PI) * k); ctx.beginPath(); ctx.arc(cp.x, cp.y, r, 0, TAU); ctx.stroke();
      }
      // the light of the dust drawn up in a few slow threads
      for (let i = 0; i < 9; i++) {
        const a0 = hash(i, 3) * TAU, d = 120 + 330 * hash(i, 5), q = clamp01((age * 0.5 + hash(i, 7)) % 1), x0 = bd.x + Math.cos(a0) * d, y0 = bd.y + 16 + Math.sin(a0) * d * 0.5;
        const x = lerp(x0, cp.x, easeOut(q)), y = lerp(y0, cp.y, easeOut(q)) - 40 * Math.sin(q * Math.PI);
        glow(ctx, x, y, 12, '#dfeaff', 0.4 * Math.sin(q * Math.PI) * k);
      }
    });
  }

  // ---- each dash of the sword dance: a streak across the dark, longer, brighter and quicker than the last
  function dashDraw(ctx, W, t, over) {
    for (const D of W.dashes) {
      const q = clamp01(D.i / 5), dur = lerp(0.34, 0.12, q), t0 = D.land - dur, age = t - t0;
      if (age < -0.02 || age > dur + 0.65) continue;
      const head = smooth(age / dur), tail = smooth((age - dur * lerp(0.35, 0.9, q)) / (dur * lerp(1.2, 1.8, q)));   // (the streak is all there by the end, and its tail stays longer each time)
      const x1 = D.x1, y1 = D.y1, ex = D.x2, ey = D.y2, hx = lerp(x1, ex, head), hy = lerp(y1, ey, head), tx = lerp(x1, ex, tail * head), ty = lerp(y1, ey, tail * head);
      const fade = age < dur ? 1 : 1 - smooth((age - dur) / 0.6);
      additive(ctx, () => {
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy);
        if (!over) {   // (under the telegraphs: the soft body of the streak and the light at its head)
          ctx.strokeStyle = rgba('#9fd0ff', (0.16 + 0.1 * q) * fade); ctx.lineWidth = D.w * 0.34; ctx.stroke();
          ctx.strokeStyle = rgba('#e6f2ff', (0.4 + 0.25 * q) * fade); ctx.lineWidth = 6 + D.i; ctx.stroke();
          glow(ctx, hx, hy, 52 + 8 * D.i, '#e8f2ff', 0.5 * fade * (age < dur + 0.1 ? 1 : 0.3));
        } else {   // (over them: only a thin bright line, so the red under it is still all there)
          ctx.strokeStyle = rgba('#ffffff', 0.96 * fade); ctx.lineWidth = 2.2 + 0.3 * D.i; ctx.stroke();
        }
      });
    }
  }

  // ---- the last light gathered: drawn up from the pool into her crown (cause and effect)
  function answerDraw(ctx, room, W, bd, cp, t) {
    const M = W.met, P = W.lastPool; if (!M || !P) return;
    const age = t - M.t0; if (age < 0 || age > 3.2) return;
    additive(ctx, () => {
      // the pool answers: rings out of it
      for (const [dly, rr, w, a0] of [[0, 1.5, 3.4, 0.85], [0.14, 1.1, 2.2, 0.6]]) {
        const q = (age - dly) / 0.7; if (q <= 0 || q >= 1) continue;
        const r = P.r * (0.55 + (rr - 0.55) * easeOut(q)); ctx.lineWidth = w; ctx.strokeStyle = rgba('#e6f2ff', Math.pow(1 - q, 1.4) * a0); ctx.beginPath(); ctx.ellipse(P.x, P.y, r, r * 0.74, 0, 0, TAU); ctx.stroke();
      }
      glow(ctx, P.x, P.y, P.r * 0.9, '#cfe6ff', 0.22 * (1 - smooth(age / 0.9)));
      // a thread of light from the pool to the crown, its head running out first, then the whole line drawn up
      const run = smooth(age / 0.55), fadeT = 1 - smooth((age - 1.0) / 1.0);
      if (fadeT > 0.01) {
        const hx = lerp(P.x, cp.x, run), hy = lerp(P.y, cp.y, run), n = 22;
        ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(P.x, P.y);
        for (let i = 1; i <= n; i++) { const u = i / n * run, x = lerp(P.x, cp.x, u), y = lerp(P.y, cp.y, u) - Math.sin(u * Math.PI) * 120; ctx.lineTo(x, y); }
        ctx.strokeStyle = rgba('#9fd0ff', 0.28 * fadeT); ctx.lineWidth = 12; ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', 0.95 * fadeT); ctx.lineWidth = 2.4; ctx.stroke();
        glow(ctx, hx, hy - Math.sin(run * Math.PI) * 120, 30, '#ffffff', 0.7 * fadeT);
      }
      // it arrives: the crown takes it
      if (age > 0.5) glow(ctx, cp.x, cp.y, 110, '#e6f2ff', 0.3 * smooth((age - 0.5) / 0.3) * (1 - smooth((age - 1.1) / 1.6)));
    });
  }

  // ---- the build of Full Moon: light is drawn in on her crown from every side, and the dust under her brightens
  function gatherDraw(ctx, room, W, bd, cp, t) {
    const F = evOf(room, 'mlnmfull'); if (!F) return;
    const age = t - F.start, N = evOf(room, 'mlnight'); if (age < 0 || (N && !N.on && N.start >= F.start && t >= N.start)) return;
    const k = smooth(age / F.at);
    additive(ctx, () => {
      ctx.save(); ctx.translate(bd.x, bd.y + 10); ctx.scale(1, 0.42); glow(ctx, 0, 0, 90 + 230 * k, '#cfe6ff', 0.06 + 0.22 * k); ctx.restore();
      glow(ctx, cp.x, cp.y, 60 + 120 * k, '#dfeaff', 0.1 + 0.32 * k);
      for (let n = 0; n < 5; n++) {
        const q = ((age * (0.55 + 0.5 * k)) + n / 5) % 1, r = 760 * (1 - easeOut(q)) + 30;
        ctx.lineWidth = 1.6 + 1.6 * k; ctx.strokeStyle = rgba('#dfeaff', (0.1 + 0.3 * k) * Math.sin(q * Math.PI)); ctx.beginPath(); ctx.ellipse(bd.x, bd.y + 10, r, r * 0.5, 0, 0, TAU); ctx.stroke();
      }
    });
  }

  // ---- the release of the wall: the dark is thrown off (the room's own, and this file's: nightOf), the crown flares, and the dust catches the returning light in a scatter of glints that runs out from the world's side
  function releaseDraw(ctx, room, W, bd, cp, t) {
    const N = evOf(room, 'mlnight'); if (!N || N.on) return;
    const age = t - N.start; if (age < 0 || age > 3.4) return;
    const a = ambOf();
    additive(ctx, () => {
      glow(ctx, cp.x, cp.y, 210, '#eaf4ff', 0.32 * (1 - smooth(age / 1.0)));
      // the glints: a hundred grains catch the light one after another, the near side of the world first
      for (let i = 0; i < 44; i++) {
        const ang = hash(i, 11) * TAU, d = Math.sqrt(hash(i, 12)) * (R - 30), x = Math.cos(ang) * d, y = Math.sin(ang) * d;
        const dly = 0.08 + 0.9 * clamp01(((R + (x * 0.86 - y * 0.5)) / (2 * R))) + hash(i, 13) * 0.25, q = (age - dly) / 0.55;
        if (q <= 0 || q >= 1) continue;
        const al = Math.sin(q * Math.PI), L = 3 + 6 * al;
        glow(ctx, x, y, 9, '#ffffff', 0.5 * al); ctx.strokeStyle = rgba('#ffffff', 0.85 * al); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
      }
    });
    void a;
  }

  // ---- the Hound: Garrow comes up out of the dark along the trail (drawn with his own art), crouches at its end, lands, and stands until she is on his back
  function houndDraw(ctx, room, W, t) {
    const roadEv = W.road && room.ev[W.road]; if (!roadEv || !roadEv.l || roadEv.l.length < 2 || typeof GA_ART === 'undefined') return;
    const F2 = evOf(room, 'mlform');
    if (F2 && F2.n === 2 && F2.start >= roadEv.start) { if (t >= F2.start) return; }
    const L = pathLen(roadEv), sp = roadEv.sp || 820, begin = roadEv.start + (roadEv.at || 0), head = (t - begin) * sp;
    if (head < -4) return;
    const P = W.pounce, landT = P ? P.land : begin + L / sp + 1, hd = clamp(head, 0, L), q = pathAt(roadEv, hd);
    // his heading, eased (the line turns at the corners of the trail)
    const tgt = q.a; if (W.wang == null) W.wang = tgt; let da = tgt - W.wang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; W.wang += da * 0.35;
    const alpha = smooth(hd / 150) * (1 - smooth((t - landT - 4.6) / 1.2));
    const w = W.wolf; w.t = t; w.moving = head < L; w.action = null;
    const crouchT = Math.max(begin + L / sp, landT - 0.9), run = head < L, pounceOn = t >= landT - 0.6;
    w.props = pounceOn ? { gaPounce: true } : run ? { gaRun: true } : { gaScent: true };
    // (he stands where the trail ends, then pounces there: the ring that lands is the script's pounce)
    const x = q.x, y = q.y;
    ctx.save(); ctx.translate(x, y); ctx.scale(1.3, 1.3); ctx.rotate(W.wang); ctx.globalAlpha = clamp01(alpha);
    GA_ART.body(ctx, w, W.wang);
    ctx.restore(); void crouchT;
    // the light of his run: a ribbon of pale dust and light behind his head along the line (the corridor's own head is under him)
    if (run && alpha > 0.05) additive(ctx, () => { glow(ctx, x, y - 30, 120, '#9fd0ff', 0.12 * alpha); });
  }

  // ---- she goes to him: a comet of pale light along her flight, the dust lifting
  function vaultDraw(ctx, room, W, t) {
    const V = W.vault; if (!V) return;
    const dist = Math.hypot(V.x - V.fx, V.y - V.fy), dur = Math.max(0.25, dist / 1500), age = t - V.t0; if (age < 0 || age > dur + 0.7) return;
    const u = smooth(age / dur);
    additive(ctx, () => {
      ctx.lineCap = 'round'; const hx = lerp(V.fx, V.x, u), hy = lerp(V.fy, V.y, u) - Math.sin(u * Math.PI) * 60, tu = smooth((age - 0.05) / dur), tx = lerp(V.fx, V.x, tu), ty = lerp(V.fy, V.y, tu) - Math.sin(tu * Math.PI) * 60;
      const fade = age < dur ? 1 : 1 - smooth((age - dur) / 0.6);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.strokeStyle = rgba('#9fd0ff', 0.2 * fade); ctx.lineWidth = 36; ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 0.85 * fade); ctx.lineWidth = 3; ctx.stroke();
      glow(ctx, hx, hy - 40, 80, '#e8f2ff', 0.34 * fade);
    });
  }
  // ---- the second form arrives: the pair flares once, then the glow settles to a faint ring that stays under the hunt
  function formDraw(ctx, room, W, bd, t) {
    const F = evOf(room, 'mlform'); if (!F || F.n !== 2 || W.form2 == null) return;
    const age = t - F.start; if (age < 0 || age > 2.6) return;
    additive(ctx, () => {
      glow(ctx, bd.x, bd.y - 110, 220 * (0.7 + 0.5 * easeOut(clamp01(age / 0.6))), '#e6f2ff', 0.34 * (1 - smooth(age / 1.6)));
    });
  }

  // ---- the kill: the crown goes out like a lamp (a last bright breath, then nothing); the dark itself is in the ambient pass
  function fallDraw(ctx, room, W, bd, cp, t) {
    const FL = evOf(room, 'mlfall'); if (!FL) return;
    const age = t - FL.start; if (age < 0 || age > 7) return;
    const lamp = age > 2.6 && age < 3.6 ? Math.sin(smooth((age - 2.6) / 1.0) * Math.PI) : 0;
    additive(ctx, () => { if (lamp > 0.01) glow(ctx, cp.x, cp.y + 30, 150, '#e6f2ff', 0.5 * lamp); });
  }

  // ================================================================== the hooks
  // the ambient pass: the room's own life (maelis-room.js moonLife), with the red held where the eclipse says, then this file's dark and sky over it
  const life0 = ArenaView.moonLife;
  ArenaView.moonLife = function (ctx, a, t) {
    const room = ArenaView.liveRoom;
    let swapped = null;
    try {
      if (room && room.ev) {
        const EC = eclipseOf(room, t);
        room.moon = Object.assign(room.moon || {}, { red: EC.L });
        // the kill ends the Hunt's wind: the room goes back to a single body at the fall
        const FL = room.ev.mlfall, FM = room.ev.mlform;
        if (FL && t >= FL.start && FM && FM.n === 2) { swapped = FM; room.ev.mlform = Object.assign({}, FM, { n: 1 }); }
      }
    } catch (e) { /* cosmetic */ }
    try { life0.call(this, ctx, a, t); } finally { if (swapped) room.ev.mlform = swapped; }
    if (room && room.ev && a) { try { ctx.save(); ambientDraw(ctx, a, t, room); ctx.restore(); } catch (e) { ctx.restore(); if (!ambientDraw.warned) { ambientDraw.warned = true; console.warn('[maelis moments]', e); } } }
  };
  const under0 = ArenaView.drawRoomUnder;
  ArenaView.drawRoomUnder = function (ctx, room, t, v) {
    under0.call(this, ctx, room, t, v);
    if (room && room.ev && this.amb && this.amb.kind === 'moon') { try { ctx.save(); underDraw(ctx, room, t, v); ctx.restore(); } catch (e) { ctx.restore(); if (!underDraw.warned) { underDraw.warned = true; console.warn('[maelis moments]', e); } } }
  };
  const over0 = ArenaView.drawRoomOver;
  ArenaView.drawRoomOver = function (ctx, room, t, env) {
    over0.call(this, ctx, room, t, env);
    if (room && room.mlw && env && env.bossId === 'maelis') { try { ctx.save(); dashDraw(ctx, room.mlw, t, true); ctx.restore(); } catch (e) { ctx.restore(); } }
  };
  const roomEvent0 = ArenaView.roomEvent;
  ArenaView.roomEvent = function (room, msg, now, ...rest) {
    const r = roomEvent0.call(this, room, msg, now, ...rest);
    try { if (room && room.ev && msg && typeof msg.k === 'string' && msg.k.charCodeAt(0) === 109 && msg.k.charCodeAt(1) === 108) onEvent(room, msg, now); } catch (e) { /* cosmetic */ }   // 'ml'
    return r;
  };

  // ---- the entrance: BOSS_VFX.intro is wrapped: the room's own part (the column of light, the ring, the sound) starts on the next draw
  if (typeof BOSS_VFX !== 'undefined' && BOSS_VFX.intro) {
    const intro0 = BOSS_VFX.intro;
    BOSS_VFX.intro = function (kind, b) {
      const r = intro0.apply(this, arguments);
      if (kind === 'maelis') { try { const room = ArenaView.liveRoom; if (room) state(room).introAsk = true; } catch (e) { /* cosmetic */ } }
      return r;
    };
  }
  // ---- the kill is quiet: no confetti and no gold tint for her (BOSS_VFX.victory is shared; main.js calls it on every clear)
  if (typeof BOSS_VFX !== 'undefined' && BOSS_VFX.victory) {
    const victory0 = BOSS_VFX.victory;
    BOSS_VFX.victory = function () {
      try { const room = ArenaView.liveRoom; if (room && room.ev && room.ev.mlfall && ArenaView.amb && ArenaView.amb.kind === 'moon') return undefined; } catch (e) { /* cosmetic */ }
      return victory0.apply(this, arguments);
    };
  }

  // ---- the wall-fx stage: nothing of the plain gold seal, the fight's own moments above carry it
  WallFx.moment('maelis', null, {
    up() { },
    broke(S) { S.muffle(0, 0.5); },
  });
})();
