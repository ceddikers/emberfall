// The Founding, on every tab: the scene (camera, input, interpolation, drawing) and the host harness. The HUD and panels are in
// founding/ui.js (FoundingUI). Needs, loaded before this file: draw-util.js, status-icons.js, interp.js, data.js (CLASSES, ROLES),
// ui-tip.js, heroes.js, founding/data.js, map-data.js, map-art.js, sim.js, ui.js. All files LF.
//
// API for main.js
//   Founding.init(deps)           once at load. deps = { canvas, ctx, DPR(), W(), H(), Net, Save, Sound() (may return null), toast(text),
//                                 myName(), onLeave(result) }. DPR, W, H and Sound are getter functions. Registers Net.on for fds, fdp,
//                                 fdx and fdend (NOT fdgo: main.js owns it and calls enter(msg)).
//   Founding.enterAsHost(players) host only. players = [{ id, name }], host first. Builds the art, creates the FoundingSim, ticks it at
//                                 20 Hz, routes Net.onHost('fdi'), broadcasts { t: 'fdgo', seed, players }.
//   Founding.enter(msg)           every tab on fdgo (idempotent while active): shows the camp (hero pick) and then the run.
//   Founding.leave()              adds the gold from fdend (once), stops the host tick, removes the DOM, calls deps.onLeave(result).
//   Founding.active()             true while the scene is up.
//   Founding.frame(rawDt)         the whole update + render + HUD for one frame (main.js's frame calls only this while active).
//   Founding.playerLeft(id)       host only: a joined player left (calls sim.removePlayer).
//   Founding.practice             set true before enterAsHost for a run that pays no gold (not used by default).
// Input: the module adds capture-phase listeners on window (mouse on the canvas, keys everywhere) and acts only while active.
// Keys: right-click move/attack, Q W E R cast, Shift+Q/W/E/R rank up (and the Learn-the-passive key, D, for the passive), Tab cycle target, left-click target/confirm aim, Esc cancel
// aim/close a panel, T supply tent (near it), F forge (near it), B recall, Alt+click ping, 1-6 items, V flask, G pick up / dig, X put down,
// Space dash toward the cursor (the hotbar's Dash key), C centre camera (all of them the player's own keys: keybinds.js).

const Founding = (() => {
  'use strict';
  const D = FOUNDING_DATA, M = FoundingMap;
  const FLAG = FoundingSim.FLAG, ZONE = FoundingSim.ZONE;
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const eo = t => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  const ei = t => { t = clamp(t, 0, 1); return t * t * t; };
  const eb = t => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  const rk = D.rk;
  const Fx = FoundingFx;   // the skill effects (fx.js)
  const HS = 1.25;   // hero draw scale at zoom 1
  const OUT = '#0b0806';
  const SKILL_ICON = {
    bastion: { p: 'bulwark', q: 'bash', w: 'banner', e: 'brace', r: 'lastbastion' },
    cleric: { p: 'petal', q: 'mend', w: 'smite', e: 'dawnsanctum', r: 'dawnbreaks' },
    pyromancer: { p: 'combust', q: 'fireball', w: 'circle', e: 'firestep', r: 'meteor' },
    ranger: { p: 'aimed', q: 'pierce', w: 'explosive', e: 'mark', r: 'starfall' },
  };
  const SHAPE_COL = { bastion: '255,220,120', cleric: '255,235,160', pyromancer: '255,140,50', ranger: '255,230,140' };

  let dep = null, active = false, S = null, sim = null, stopTick = null, lastResult = null, goldPaid = false, inited = false;
  const handlers = {};

  // ================================================================ small helpers
  const W = () => dep.W(), H = () => dep.H(), DPR = () => dep.DPR();
  // Sound by vicinity. A world sound is given the place it happened ({ at: { x, y } }, or sndAt) and is heard by how far that is
  // from the listener (your hero; the camera's centre while you are down): full inside SND_NEAR, gone by SND_FAR, a spot in the
  // fog almost silent, a gentle pan by the side it is on. A sound given no place (UI, your own hero, announcements) plays as it
  // always did. 'reach' stretches the distances for big sounds (a boss's blow, the palisade giving way).
  const SND_NEAR = 350, SND_FAR = 1100, SND_FOG = 0.1, SND_MIN = 0.03, SND_CAP = 3, SND_WIN = 120;
  const sndClock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const sndRecent = {};
  function sndListener() { const m = S && S.units.get('h' + S.myId); if (m && !(m.f & FLAG.DEAD)) return m; return S && S.cam ? S.cam : null; }
  // how loud (0..1) a sound at (x, y) is, and its pan; { g: 1, pan: 0 } when there is nobody to measure from
  function sndAtten(x, y, reach) {
    const L = sndListener(); if (!L || !(x === x) || !(y === y)) return { g: 1, pan: 0, d: 0 };
    const dx = x - L.x, dy = y - L.y, d = Math.sqrt(dx * dx + dy * dy), r = reach > 0 ? reach : 1;
    const k = clamp((d / r - SND_NEAR) / (SND_FAR - SND_NEAR), 0, 1);
    let g = 1 - k * k * (3 - 2 * k);
    if (g > 0 && S.fogOn && S.fog && !visAt(x, y, 30)) g *= SND_FOG;
    return { g, pan: clamp(dx / (1800 * r), -0.5, 0.5), d };
  }
  // no more than SND_CAP copies of one sound in SND_WIN ms, so a big fight beside you does not turn to noise
  function sndRoom(name) {
    const now = sndClock(), a = sndRecent[name] || (sndRecent[name] = []);
    while (a.length && now - a[0] > SND_WIN) a.shift();
    if (a.length >= SND_CAP) return false;
    a.push(now); return true;
  }
  // would a sound at this place be heard at all
  const sndHeard = o => !o || !o.at || sndAtten(o.at.x, o.at.y, o.reach).g >= SND_MIN;
  const snd = (name, o) => { try {
    const s = dep.Sound && dep.Sound(); if (!s || !s.play) return;
    const p = Object.assign({ bus: (name.indexOf('ui-') === 0 || name === 'fd-buy' || name === 'fd-boon' || name === 'fd-page') ? 'ui' : 'sfx', key: name, minGap: 0.08 }, o || {});
    if (p.at) {
      const a = sndAtten(p.at.x, p.at.y, p.reach); if (a.g < SND_MIN || !sndRoom(name)) return;
      p.vol = (p.vol == null ? 1 : p.vol) * a.g; p.pan = (p.pan || 0) + a.pan; if (a.d / (p.reach || 1) > 760) p.remote = true;   // (far off: muffled)
      if (!o.key && o.minGap == null) p.minGap = 0.03;
      delete p.at; delete p.reach;
    }
    s.play(name, p);
  } catch (e) { /* sound is optional */ } };
  const sndAt = (name, x, y, o) => snd(name, Object.assign({ at: { x, y } }, o || {}));
  // a sound from a hero or a thing: your own hero's, or one whose place is not known, plays at its own volume; the rest by distance
  const sndFor = (pid, name, x, y, o) => (pid === S.myId || x == null || y == null ? snd(name, o) : sndAt(name, x, y, o));
  // a noisy sound (hits, autos): at most once per gap seconds, however many events arrive in a frame (a far one that cannot be heard leaves the gap alone)
  const sndGap = (name, gap, o) => { if (!S) return; if (!sndHeard(o)) return; const last = S.lastSnd[name]; if (last !== undefined && S.T - last < gap) return; S.lastSnd[name] = S.T; snd(name, o); };
  // a noisy sound (hits, autos): at most once per gap seconds, however many events arrive in a frame

  const clsOf = hero => CLASSES.find(c => c.id === hero) || CLASSES[0];
  const roleColor = hero => ROLES[clsOf(hero).role].color;
  const heroIdx = hero => D.HERO_IDS.indexOf(hero);
  const U = key => S.units.get(key);
  const me = () => (S ? S.units.get('h' + S.myId) : null);
  const say = txt => { if (S) { S.msg = { txt, t: 2.2 }; } };

  function freshState(msg) {
    return {
      myId: dep.Net.id, isHost: !!sim, seed: msg ? msg.seed : 0,
      T: 0, clock: new SendClock(), snapN: 0, phase: 'camp', st: 'camp', tm: 0,
      players: ((msg && msg.players) || []).map(p => [p.id, p.name, null, 0]),
      wave: 0, next: -1, nextAt: 0, camp: [1, 1], q: [], props: {}, propsSeen: false, nightK: 0,
      units: new Map(), gone: new Map(), zones: new Map(), tele: new Map(), evq: [],
      fx: [], parts: [], texts: [], corpses: [], projs: [], volley: [], marker: null, campFlash: 0, hearthPulse: 0,
      sheet: null, sheetT: 0, prevSheet: null,
      cam: { x: M.P.hearth[0], y: M.P.hearth[1] - 60, zoom: 0.9, tz: 0.9, free: false },
      mouse: { sx: 0, sy: 0, wx: 0, wy: 0, in: false }, rDown: false, rT: 0, pan: null,
      aim: null, tgt: null, tgtAlly: null, openOnArrive: null,
      msg: { txt: '', t: 0 }, shk: 0, shkT: 0, shkD: 0.25,
      boss: null, ended: false, carryShown: false, aimT: 0,
      part: 0, bs: [], bsBy: {}, bcast: null, shim: null, hauls: {}, counts: new Map(), end: null, endCam: null, flash: null, lastSnd: {},
      nightWas: 0, carvedWas: 0, capWas: 0, lights: [], nl: 0, tipTxt: null, tipSx: 0, tipSy: 0, flares: [], bossId: null, aSeen: 0,
      rc: new Map(), pings: [], alerts: [], fog: null, fogOn: false, stepInfo: null, tierShown: -1, partShown: -1, lastPing: -9, tier: 0,
    };
  }

  // ================================================================ network in
  handlers.fds = m => { if (active && S) onSnap(m); };
  handlers.fdp = m => { if (active && S) onSheet(m); };
  handlers.fdx = m => { if (active && S) { const at = S.T + 0.12; for (const ev of m.ev) S.evq.push({ t: at, ev }); } };
  handlers.fdend = m => { if (active && S) onEnd(m); };

  function onSnap(m) {
    const t = S.clock.map(m.tm, S.T);
    if (LAYERS.length) lay('snap', m);
    S.snapN++;
    if (m.st !== S.st) {
      if (m.st === 'live' && S.st === 'camp') { S.clock = new SendClock(); for (const u of S.units.values()) u.tr.settle(); }
      S.st = m.st;
    }
    if (m.st !== 'camp' && S.phase === 'camp') { S.phase = 'live'; if (FoundingUI) FoundingUI.onStart(); }
    S.tm = m.tm; S.wave = m.wave; S.next = m.next; S.nextAt = S.T + m.next; S.camp = m.camp; S.q = m.q || [];
    if (m.pl) { S.players = m.pl; }
    if (m.dm) meterIn(m.dm, m.tm);
    S.part = m.part | 0; S.tier = m.tier | 0; S.bs = m.bs || []; S.bsBy = {}; for (const r of S.bs) S.bsBy[r[0]] = r;
    if (m.props) { const prev = S.props; S.props = m.props; S.propsSeen = true; propsChanged(prev, m.props); }
    const seen = new Set();
    for (const r of m.h) {
      const key = 'h' + r[0]; seen.add(key);
      let u = S.units.get(key);
      if (!u) { u = newUnit(key, 'h', r[0], r[1], r[2], r[3]); S.units.set(key, u); u.hero = D.HERO_IDS[r[10]] || 'bastion'; u.cls = clsOf(u.hero); }
      u.tr.push(t, r[1], r[2], r[3]);
      u.q.push({ t, hp: r[4], max: r[5], f: r[6], cs: r[7], cp: r[8], lv: r[9], rd: r[12] | 0 }); if (u.q.length > 14) u.q.shift();
      u.hero = D.HERO_IDS[r[10]] || u.hero; u.name = (S.players.find(p => p[0] === r[0]) || [0, 'Hero'])[1]; u.carry = r[11] | 0;
    }
    S.bossU = null;
    for (const r of m.e) {
      const key = 'e' + r[0]; seen.add(key);
      let u = S.units.get(key);
      if (!u) { u = newUnit(key, 'e', r[0], r[2], r[3], r[4]); S.units.set(key, u); u.type = r[1]; u.eid = D.ENEMY_IDS[r[1]]; u.def = D.ENEMIES[u.eid]; u.ph = rnd(0, 6); u.fogT = fogSeesNew(r[2], r[3], u.def ? u.def.r : 12); u.vis = u.fogT; }
      u.tr.push(t, r[2], r[3], r[4]);
      u.q.push({ t, pct: r[5], f: r[6] }); if (u.q.length > 14) u.q.shift(); u.tier = r[7] | 0;
    }
    for (const [key, u] of S.units) if (!seen.has(key)) { u.goneAt = S.T; S.gone.set(key, u); S.units.delete(key); }
    // zones
    const zs = new Set();
    for (const z of m.z || []) { zs.add(z[0]); let o = S.zones.get(z[0]); if (!o) { o = { id: z[0], seen: S.T, tMax: z[6] }; S.zones.set(z[0], o); } o.kind = z[1]; o.x = z[2]; o.y = z[3]; o.a = z[4]; o.b = z[5]; o.tLeft = z[6]; o.c = z[7]; o.at = S.T; if (z[6] > o.tMax) o.tMax = z[6]; }
    for (const [id, z] of S.zones) if (!zs.has(id)) { if (z.kind === ZONE.WALL && z.seen <= S.T) Fx.wallEnd(z); S.zones.delete(id); }
  }

  // the world's state changed: the night coming and going, the Words and the capstone being worked
  function propsChanged(prev, P) {
    const n = +P.night || 0;
    if (n > 0.3 && S.nightWas <= 0.3) snd('fd-night');
    if (n < 0.5 && S.nightWas >= 0.5) snd('fd-dawn-breaks');
    S.nightWas = n;
    const cv = +P.carved || 0, cp = +P.capstone || 0;
    if (cv > S.carvedWas + 0.045 && cv < 1) { snd('fd-carve'); S.carvedWas = cv; } else if (cv < S.carvedWas) S.carvedWas = cv;
    if (cp > S.capWas + 0.045 && cp < 1) { snd('fd-cover'); S.capWas = cp; } else if (cp < S.capWas) S.capWas = cp;
  }

  function newUnit(key, kind, id, x, y, face) {
    return { key, kind, id, tr: new Track(x, y, face), q: [], x, y, face, an: { t: 0, moving: false, action: null }, mv: 0, spd: 0, f: 0, pf: 0, flash: 0, sq: 0, lunge: 0, born: S.T, hp: 1, max: 1, pct: 100, ph: 0, wp: 0, trail: [], vis: 1, carry: 0, fedv: 0, hd: 0, gl: 0, pinned: false, fogT: 1, tier: 0 };
  }

  function onSheet(m) {
    S.prevSheet = S.sheet; S.sheet = m; S.sheetT = S.T;
    if (FoundingUI) FoundingUI.onSheet(S.prevSheet, m);
  }

  // host: Founding gold owed to players who dropped during a run's ending beat (sim.finish `owed`, by lower-cased name), paid when they are back
  const owedGold = Object.create(null);
  function payOwed(id, name) {
    const k = String(name || '').trim().toLowerCase(), g = owedGold[k];
    if (!g || !dep || !dep.Net || !dep.Net.isHost) return false;
    delete owedGold[k]; dep.Net.sendTo(id, { t: 'fdpay', g });
    return true;
  }
  function onEnd(m) {
    if (S.ended) return;
    if (sim && m.owed) for (const k in m.owed) if (m.owed[k] > 0) owedGold[k] = (owedGold[k] || 0) + m.owed[k];
    S.ended = true; lastResult = m; S.endAt = S.T + (S.end ? 0.2 : 1.2);   // let the final fight frame play out a moment
    if (!m.won) snd('fd-defeat');
    if (!goldPaid) {
      goldPaid = true;
      const g = m.gold && m.gold[S.myId];
      if (g > 0 && dep.Save) { try { dep.Save.addGold(g); } catch (e) { console.error(e); } }
    }
  }

  // ================================================================ intents out
  function send(m) {
    if (!active) return;
    if (sim) sim.intent(S.myId, m);
    else dep.Net.send(Object.assign({ t: 'fdi' }, m));
  }

  // ================================================================ host harness
  function enterAsHost(players) {
    if (!inited) return;
    FoundingArt.build();
    stopHost();
    const Net = dep.Net, seed = (Math.random() * 1e9) | 0, myId = Net.id;
    const emit = m => Net.broadcastAll(m);
    const emitTo = (id, m) => { if (id === myId) { const f = handlers[m.t]; if (f) f(m); } else Net.sendTo(id, m); };
    sim = new FoundingSim({ players, emit, emitTo, seed, practice: !!Founding.practice });
    Net.onHost('fdi', (pid, m) => { if (sim && m) sim.intent(pid, m); });
    let last = performance.now(), acc = 0;
    stopTick = Net.steadyInterval(() => {
      if (!sim) return;
      const t = performance.now();
      if (sim.isPaused()) { last = t; acc = 0; return; }   // (the solo pause: nothing ticks, and the time spent held is not caught up)
      acc = Math.min(0.25, acc + (t - last) / 1000); last = t;
      while (acc >= 0.05) { sim.tick(0.05); acc -= 0.05; }
    }, 33);
    Net.broadcastAll({ t: 'fdgo', seed, players: players.map(p => ({ id: p.id, name: p.name })) });
  }
  function stopHost() {
    paused = false;
    if (stopTick) { stopTick(); stopTick = null; }
    if (sim && dep && dep.Net && dep.Net.onHost) dep.Net.onHost('fdi', () => {});
    sim = null;
  }
  function playerLeft(id) { if (sim) sim.removePlayer(id); }

  // ================================================================ the solo pause
  // Only the host's tab can hold the sim, and only with one human in the run (a second player's tab has nothing to hold). Esc pauses and resumes; the sim then ticks
  // nothing, so every clock in it (the wave timer, the quest-givers' calls, respawns, set pieces, the chain's gaps) stands still, and this tab stops its own frame update too.
  let paused = false;
  const canPause = () => !!(sim && S && !S.ended && !S.end && S.phase === 'live' && S.st === 'live' && !(S.__intro && S.__intro.on) && sim.players.length === 1);
  function setPause(on) {
    if (!S) return false;
    on = !!on;
    if (on === paused) return paused;
    if (on && !canPause()) return false;
    paused = on; if (sim) sim.setPaused(on);
    S.rDown = false; S.pan = null; S.keys = null;
    if (FoundingUI) FoundingUI.showPause(on);
    snd('ui-open');
    return paused;
  }

  // ================================================================ the live damage meter (the data; ui.js draws it)
  // The host sends each hero's run total of damage and healing about once a second (fds.dm = [[id, damage, healing]]); a rate is the gain over the last 30 seconds of those.
  function meterIn(rows, tm) {
    const Mt = S.meter || (S.meter = { hist: [], rows: [], tm: 0 });
    Mt.rows = rows; Mt.tm = tm; Mt.hist.push({ tm, rows }); while (Mt.hist.length > 2 && tm - Mt.hist[0].tm > 32) Mt.hist.shift();
  }
  function meterRows() {
    const Mt = S && S.meter; if (!Mt || !Mt.rows.length) return [];
    const old = Mt.hist[0], span = Math.max(1, Mt.tm - old.tm), by = {}; for (const r of old.rows) by[r[0]] = r;
    return Mt.rows.map(r => { const o = by[r[0]] || r; return { id: r[0], dmg: r[1], heal: r[2], dps: Math.max(0, r[1] - o[1]) / span, hps: Math.max(0, r[2] - o[2]) / span }; });
  }

  // ================================================================ music
  // The tracks come later (docs/art/music-prompts.md, The Founding): FoundingMusic slots opening, day, dusk, night, boss, siege, victory, defeat map to mus-fd-<slot> in
  // sound-hooks.js, which does nothing until that file is in the audio manifest, so what plays now (the town's tune) goes on. A slot is chosen from what the run shows.
  const MAIN_BOSS = new Set(Object.keys(D.BOSS_WAVES).map(w => D.BOSS_WAVES[w][0]));
  function mus(slot, o) { try { const sh = dep.Sound && dep.Sound(); return !!(sh && sh.foundingMusic && sh.foundingMusic(slot, o)); } catch (e) { return false; } }
  function musicUpdate(dt) {
    const Mu = S.mus || (S.mus = { slot: '', want: '', wantT: 0, chkT: 0, n: 0, rising: false });
    let want;
    if (S.ended && lastResult && !lastResult.won) want = 'defeat';
    else if (S.end && S.end.step >= 2) want = 'victory';
    else if (S.phase !== 'live' || S.end) return;   // (the camp keeps the town's tune; the gate shutting keeps the siege's until the town is named)
    else if (S.__intro && S.__intro.on) want = 'opening';
    else {
      Mu.chkT -= dt;
      if (Mu.chkT <= 0) { Mu.chkT = 1; const n = +(S.props && S.props.night) || 0; if (n > Mu.n + 0.01) Mu.rising = true; else if (n < Mu.n - 0.01) Mu.rising = false; Mu.n = n; }
      if (S.wave >= D.LAST_WAVE) want = 'siege';
      else if (S.boss && MAIN_BOSS.has(S.boss.eid)) want = 'boss';
      else if (Mu.n >= 0.5) want = 'night';
      else if (Mu.n > 0.06 && Mu.rising) want = 'dusk';
      else want = 'day';
    }
    if (want === Mu.slot) { Mu.want = ''; return; }
    const instant = want === 'defeat' || want === 'victory' || want === 'opening' || want === 'siege' || want === 'boss';
    if (!instant) { if (Mu.want !== want) { Mu.want = want; Mu.wantT = 0; } Mu.wantT += dt; if (Mu.wantT < 2) return; }   // (day, dusk and night must hold two seconds: a flicker changes nothing)
    Mu.slot = want; Mu.want = '';
    mus(want, { fade: want === 'victory' || want === 'defeat' ? 0.8 : instant ? 1.2 : 3 });
  }
  // host: someone joined the town while a run is on. A hero kept under their name goes straight back in; anyone else is told quietly.
  function guestJoined(id, name) {
    if (!sim || !active || !S || S.phase !== 'live' || !dep) return 0;
    let ok = false;
    try { ok = typeof sim.rejoin === 'function' && !!sim.rejoin(id, name); } catch (e) { console.error(e); }
    if (!ok) { dep.Net.sendTo(id, { t: 'fdbusy' }); return 2; }
    const snap = sim.snapshot(true), h = sim.hmap && sim.hmap[id];
    dep.Net.sendTo(id, { t: 'fdgo', seed: S.seed, rejoin: 1, players: (snap.pl || []).map(p => ({ id: p[0], name: p[1] })) });
    dep.Net.sendTo(id, snap);
    if (h && typeof sim.sendSheet === 'function') sim.sendSheet(h);
    return 1;
  }

  // ================================================================ enter / leave
  function enter(msg) {
    if (!inited || active) return;
    paused = false;
    FoundingArt.build();
    S = freshState(msg); goldPaid = false; lastResult = null;
    if (LAYERS.length && !(msg && msg.rejoin)) lay('reset');   // (each layer clears what it keeps between runs)
    active = true;
    document.body.classList.add('in-founding');
    FoundingUI.mount(api);
    FoundingUI.showLobby();
    bindInput();
    S.cam.zoom = S.cam.tz = 0.9;
    if (msg && msg.rejoin) { S.phase = 'live'; S.st = 'live'; FoundingUI.onStart(); }   // (a kept hero coming back goes straight in)
  }
  function leave() {
    if (!active) return;
    const res = lastResult;
    // gold from the end screen is added once when fdend arrived; a run left early pays nothing
    active = false;
    paused = false;
    unbindInput();
    stopHost();
    FoundingUI.unmount();
    document.body.classList.remove('in-founding');
    S = null;
    try { dep.onLeave && dep.onLeave(res); } catch (e) { console.error(e); }
  }

  function init(deps) {
    dep = deps; inited = true; Fx.init(kit());
    for (const t of ['fds', 'fdp', 'fdx', 'fdend']) dep.Net.on(t, handlers[t]);
    dep.Net.on('fdbusy', () => { try { dep.toast('A run of The Founding is underway. You can join when it ends.'); } catch (e) { /* no toast */ } });
  }

  // ================================================================ effects toolkit (the showcase's look)
  const glowCache = {};
  function glowSpr(rgb) {
    if (glowCache[rgb]) return glowCache[rgb];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},.4)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (glowCache[rgb] = c);
  }
  function glowAt(c, x, y, r, rgb, a = 1, add = true) { c.save(); c.globalAlpha = clamp(a, 0, 1); if (add) c.globalCompositeOperation = 'lighter'; c.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2); c.restore(); }
  function ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.5; c.stroke(); }
  }
  const circ = (c, x, y, r, fill, stroke, lw) => ell(c, x, y, r, r, 0, fill, stroke, lw);
  function ftxt(x, y, txt, color, size = 12, life = 0.9) { if (S.texts.length > 70) S.texts.shift(); S.texts.push({ x: x + rnd(-4, 4), y, txt, color, size, t: 0, life }); }
  // (Options > Interface > Screen shake and Reduce flashes apply here too: FX.shakeK, FX.flashK)
  function shake(m, d = 0.25) { if (typeof FX !== 'undefined' && FX.shakeK < 1) m *= FX.shakeK; if (m > 0.05 && (m >= S.shk || S.shkT <= 0)) { S.shk = m; S.shkT = d; S.shkD = d; } }
  function fxAdd(o) { if (S.fx.length > 160) S.fx.shift(); S.fx.push(Object.assign({ t: 0, layer: 1 }, o)); }
  function fxRing(x, y, r0, r1, dur, rgb, lw, layer) { fxAdd({ dur, layer, draw(c) { const k = eo(this.t / dur), r = lerp(r0, r1, k); ell(c, x, y, r, r * 0.92, 0, null, `rgba(${rgb},${(1 - k) * 0.9})`, lw * (1 - k * 0.6) + 0.5); } }); }
  function fxBlast(x, y, R, rgb, scorch) {
    fxAdd({ dur: 0.5, draw(c) { const k = this.t / 0.5, e = eo(k); glowAt(c, x, y, R * (0.6 + 0.6 * e), rgb, (1 - k) * 0.9); ell(c, x, y, R * e, R * e, 0, `rgba(${rgb},${(1 - k) * 0.25})`, `rgba(255,230,170,${1 - k})`, 3 * (1 - k) + 1); } });
    if (scorch) fxAdd({ dur: 12, layer: 0, draw(c) { const a = this.t < 9 ? 0.3 : 0.3 * (1 - (this.t - 9) / 3); ell(c, x, y, R * 0.55, R * 0.5, 0, `rgba(20,8,4,${a})`); } });
    burst(x, y, 14, { color: '#ffb048', spd: 200, dur: 0.6, size: 2.5, kind: 'spark' }); burst(x, y, 5, { color: '#7a4a30', spd: 120, dur: 0.8, size: 3.2, kind: 'dust' });
  }
  function fxPillar(x, y, w, dur, rgb, h) {
    fxAdd({ dur, draw(c) {
      const k = this.t / dur, up = eo(Math.min(1, k * 3)), f = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5, hh = h * up;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const a = (0.16 - i * 0.025) * f, ww = w * (1 - i * 0.16); c.fillStyle = `rgba(${rgb},${a})`; c.fillRect(x - ww * 0.5 * (1 - 0.15 * k), y - hh * (1 - i * 0.12), ww * (1 - 0.15 * k), hh * (1 - i * 0.12)); }
      c.restore(); glowAt(c, x, y, w * 1.6, rgb, 0.6 * f); ell(c, x, y, w * 0.9 * (1 - k * 0.3), w * 0.45, 0, `rgba(${rgb},${0.4 * f})`);
    } });
  }
  function flame(c, x, y, r, t, a) {
    const f = 0.75 + 0.25 * Math.sin(t * 14 + x), h = r * (1.2 + 0.5 * Math.sin(t * 9 + y * 0.3));
    c.save(); c.globalAlpha = a; glowAt(c, x, y, r * 1.4, '255,110,30', 0.55 * f);
    c.fillStyle = '#ff7a22'; c.beginPath(); c.moveTo(x - r * 0.5, y + 2); c.quadraticCurveTo(x - r * 0.2 * f, y - h * 0.7, x + Math.sin(t * 10) * 2, y - h); c.quadraticCurveTo(x + r * 0.2 * f, y - h * 0.6, x + r * 0.5, y + 2); c.fill();
    c.fillStyle = '#ffd25a'; c.beginPath(); c.moveTo(x - r * 0.25, y + 1); c.quadraticCurveTo(x, y - h * 0.5, x + Math.sin(t * 12) * 1.5, y - h * 0.55); c.quadraticCurveTo(x + r * 0.1, y - h * 0.3, x + r * 0.25, y + 1); c.fill(); c.restore();
  }
  function burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      if (S.parts.length > 360) S.parts.shift();
      const a = o.ang !== undefined ? o.ang + rnd(-(o.spread || 0.5), (o.spread || 0.5)) : rnd(0, TAU), s = (o.spd || 100) * rnd(0.4, 1);
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (o.vy || 0), g: o.g || 0, t: 0, dur: (o.dur || 0.5) * rnd(0.7, 1.2), size: (o.size || 2) * rnd(0.7, 1.3), color: o.color || '#fff', kind: o.kind || 'dot', rot: rnd(0, TAU), vr: rnd(-8, 8) });
    }
  }
  const petalBurst = (x, y, n) => { for (let i = 0; i < n; i++) burst(x, y, 1, { color: Math.random() < 0.5 ? '#ffd9a0' : '#bff2c4', spd: 40, dur: 1.1, size: 3, kind: 'petal', vy: -35, g: -12 }); };
  const sparkleHeal = (x, y) => burst(x, y + 6, 3, { color: '#9dffb0', spd: 30, dur: 0.7, size: 2, kind: 'dot', vy: -40, g: -30 });

  const SLOT_POSE = { bastion: ['bash', 'big', 'brace', 'big'], cleric: ['cast', 'cast', 'cast', 'big'], pyromancer: ['cast', 'cast', 'dash', 'big'], ranger: ['attack', 'big', 'cast', 'big'] };
  function setPose(u, type, wind, after = 0.25) {
    const an = u.an, now = S.T; const a = { type, t0: now, dur: ANIM_DUR[type] || 0.5 };
    if (type === 'cast' && wind > 0.3) { a.channel = true; a.dur = wind; }
    else if (type === 'brace') a.dur = 0.8;
    else if (type === 'attack' || type === 'bash') { a.dur = Math.max(0.3, wind + after + 0.08); if (wind > 0) a.t0 = now - 0.04; }
    else if (type === 'big') a.dur = Math.max(0.6, wind + after);
    if (type === 'attack' && u.hero === 'bastion') a.alt = (u.altSwing = !u.altSwing);
    if (type === 'dash') { an.dashT = now; return; }
    an.action = a;
  }
  const faceTo = (u, x, y, dur) => { u.fo = { a: Math.atan2(y - u.y, x - u.x), until: S.T + dur }; };

  // ================================================================ events from the host (run a moment late, in step with the picture)
  // ================================================================ feature layers (client-*.js): Founding.addLayer({ ... })
  // hooks: event(ev) -> true if handled, snap(m), update(dt), ground(c, inV) world under units, units(L, inV) push [y, 9, {draw(c)}],
  // top(c) world over the fog, screen(ctx), mini(g, kx, ky), key(act, ev) -> true, click(wx, wy, button) -> true, vis(add(x, y, r)), lights(add(x, y, r, k)),
  // reset() when a new run starts. key and click stop at the first layer that takes them (a layer made with `first: true` is asked before the rest).
  const LAYERS = [];
  function addLayer(o) { if (o.first) LAYERS.unshift(o); else LAYERS.push(o); if (o.init) o.init(kit()); return o; }
  const TAKES = { key: 1, click: 1 };
  function lay(name, a, b, c) { let r; for (const L of LAYERS) if (L[name]) { try { const v = L[name](a, b, c); if (v) { r = v; if (TAKES[name]) return r; } } catch (err) { if (!L._err) { L._err = 1; console.error('Founding layer', name, err); } } } return r; }
  function kit() { return { get S() { return S; }, D, M, FLAG, ZONE, send, snd, sndAt, sndFor, ell, glowAt, burst, fxRing, fxAdd, fxBlast, ftxt, shake, say: (t) => say(t), visAt, U: (k) => U(k), qfocus: () => S.qf || [], qhover: () => S.qhover || null, me: () => me(), W, H, dep, mus: (slot, o) => mus(slot, o), toast: (t) => dep.toast && dep.toast(t), clamp, lerp, eo, TAU, PI }; }
  function doEv(ev) {
    const tag = ev[0];
    if (LAYERS.length && lay('event', ev)) return;
    switch (tag) {
      case 'lobby': case 'start': S.players = ev[1]; if (tag === 'start' && S.phase === 'camp') { S.phase = 'live'; FoundingUI.onStart(); } else FoundingUI.onLobby(); break;
      case 'w': S.partNow = ev[4] | 0; if (FoundingUI) FoundingUI.waveBanner(ev[1], ev[2], ev[3], ev[4]); snd('fd-wave'); break;
      case 'c': evCast(ev); break;
      case 'r': evRelease(ev); break;
      case 'im': evImpact(ev); break;
      case 'a': evAuto(ev); break;
      case 'h': evHit(ev); break;
      case 'd': evDeath(ev); break;
      case 'hd': { sndFor(ev[1], 'fd-hero-down', ev[2], ev[3]); if (ev[1] === S.myId) S.openOnArrive = null; const u = U('h' + ev[1]); if (u) { ftxt(ev[2], ev[3] - 30, 'Down', '#ff7a68', 13); burst(ev[2], ev[3], 8, { color: '#ff6a5a', spd: 80, dur: 0.4, size: 2, kind: 'dot' }); if (ev[1] === S.myId) { S.aim = null; shake(3, 0.2); } } break; }
      case 'hu': { sndFor(ev[1], 'fd-hero-rise', ev[2], ev[3]); ftxt(ev[2], ev[3] - 34, 'Raised', '#fff1b8', 13, 1.3); Fx.raise(ev[2], ev[3]); break; }
      case 'pb': evPerfectBlock(ev); break;
      case 'dsh': { const u = U('h' + ev[1]); if (u) { u.an.dashT = S.T; faceTo(u, ev[4], ev[5], 0.3); } burst(ev[2], ev[3] + 8, 7, { ang: Math.atan2(ev[3] - ev[5], ev[2] - ev[4]), spread: 0.9, color: '#b9a585', spd: 70, dur: 0.45, size: 2.4, kind: 'dot' }); sndFor(ev[1], 'dash', ev[2], ev[3]); break; }
      case 't': S.tele.set(ev[1], { id: ev[1], shape: ev[2], x: ev[3], y: ev[4], a: ev[5], b: ev[6], w: ev[7], warn: Math.max(0.3, ev[8]), col: ev[9], t0: S.T, res: 0, boss: S.boss ? S.boss.eid : null }); teleStart(S.tele.get(ev[1])); break;
      case 'i': { const t = S.tele.get(ev[1]); if (t) { t.res = S.T; teleResolve(t); fxRing(ev[2], ev[3], 8, Math.max(40, t.a * 0.9), 0.3, t.col ? '140,190,255' : '255,120,90', 2, 0); if (t.shape === 0 && t.a > 60) { shake(2.5, 0.2); burst(ev[2], ev[3], 8, { color: '#6a5a48', spd: 90, dur: 0.5, size: 3, kind: 'dust' }); } } break; }
      case 'qa': { const Q = D.QUESTS[ev[1]]; if (Q) { say(Q.giver + ' has work for you.'); snd('fd-quest-offer', { vol: 0.55 }); } break; }   // a giver calls: a ! over them, and on the minimap once seen
      case 'q': if (FoundingUI) FoundingUI.questEvent(ev[1], ev[2]); snd(ev[2] === 0 ? 'fd-quest-offer' : ev[2] === 2 ? 'fd-quest-done' : 'fd-quest-missed'); if (ev[2] === 2) { fxRing(M.P.hearth[0], M.P.hearth[1], 40, 160, 0.9, '255,230,160', 3, 0); } break;
      case 'cart': { const c = ev.length > 4 ? [ev[1], ev[3], ev[4]] : (S.props.ct || []).find(x => x[0] === ev[1]); if (c) ftxt(c[1], c[2] - 30, ev[2] ? 'Delivered' : 'Lost', ev[2] ? '#9ed7a6' : '#ff7a68', 12, 1.3); snd(ev[2] ? 'fd-deliver' : 'fd-gate-break', ev[2] ? undefined : { vol: 0.6 }); break; }
      case 'pal': { const g = FoundingArt.GATE; if (ev[1] === 1) { burst(g.x, g.y, 14, { color: '#9a9282', spd: 90, dur: 0.9, size: 3.5, kind: 'dust', vy: -30 }); ftxt(g.x, g.y - 40, 'The Stone Gate stands', '#e6c98a', 12, 1.6); break; } burst(g.x, g.y, 24, { color: '#7a5a38', spd: 160, dur: 0.8, size: 3.5, kind: 'chunk', g: 300 }); burst(g.x, g.y, 8, { color: '#5a4a38', spd: 80, dur: 1, size: 4, kind: 'dust' }); shake(4, 0.3); ftxt(g.x, g.y - 40, 'The palisade breaks', '#ffb36b', 12, 1.5); sndAt('fd-gate-break', g.x, g.y, { reach: 1.8 }); break; }
      case 'up': { const u = U('h' + ev[1]); const up = D.UPGRADES[ev[2]]; if (u) { ftxt(u.x, u.y - 40, up ? up.name : 'Upgrade', '#e6c98a', 12, 1.3); fxRing(u.x, u.y, 8, 44, 0.5, '255,230,160', 2, 0); } if (ev[1] === S.myId) snd('fd-buy'); break; }
      case 'fg': sndFor(ev[1], ev[3] ? 'fd-hyperforge' : 'fd-forge', M.P.forge[0], M.P.forge[1], { reach: ev[3] ? 1.6 : 1 }); forgeFlash(!!ev[3]); if (ev[1] === S.myId) FoundingUI.forgeResult(ev[2], ev[3]); else { const u = U('h' + ev[1]); const it = D.ITEM[ev[2]]; if (u && it) ftxt(u.x, u.y - 40, it.name, D.RARITY_COLORS[it.rar], 12, 1.5); } break;
      case 'dr': { const u = U('h' + ev[1]); const it = D.ITEM[ev[2]]; if (u && it) { ftxt(u.x, u.y - 40, it.name, D.RARITY_COLORS[it.rar], 12, 1.6); burst(u.x, u.y, 8, { color: D.RARITY_COLORS[it.rar], spd: 70, dur: 0.8, size: 2.4, kind: 'dot', vy: -50, g: -30 }); } if (ev[1] === S.myId) { say('Found: ' + (it ? it.name : 'an item')); snd('ui-gold'); } break; }
      case 'lv': { const u = U('h' + ev[1]); if (u) { ftxt(u.x, u.y - 40, 'Level ' + ev[2], '#e6c98a', 13, 1.3); fxRing(u.x, u.y, 8, 48, 0.5, '255,230,160', 2, 0); burst(u.x, u.y + 4, 10, { color: '#ffe9a8', spd: 40, dur: 0.9, size: 2.2, kind: 'dot', vy: -60, g: -30 }); u.glow = 0.9; } sndFor(ev[1], 'fd-levelup', u && u.x, u && u.y, { minGap: 0, key: 'fd-levelup' + ev[1] }); break; }
      case 'pg': if (ev[1] === S.myId) { say('A page of the founders\' book is yours.'); snd('fd-page'); } break;
      case 'boss': S.bossId = ev[1]; S.bcast = null; if (FoundingUI) FoundingUI.bossAppears(ev[2]); snd('fd-boss-arrive'); shake(5, 0.4); break;
      case 'bossdown': { snd('fd-boss-down'); S.bcast = null; const u = U('e' + ev[1]) || S.gone.get('e' + ev[1]); if (u) { burst(u.x, u.y, 30, { color: '#ffb048', spd: 240, dur: 0.9, size: 3, kind: 'spark' }); burst(u.x, u.y, 14, { color: '#5a4034', spd: 120, dur: 1, size: 5, kind: 'dust' }); fxRing(u.x, u.y, 10, 200, 0.8, '255,200,120', 4, 0); } shake(8, 0.6); S.bossId = null; break; }
      case 'bd': { const u = U('e' + ev[1]); sndFor(null, 'fd-tunnel-burrow', u && u.x, u && u.y, { reach: 1.5 }); if (u) { u.diveT0 = S.T; burst(u.x, u.y, 14, { color: '#6a5238', spd: 140, dur: 0.8, size: 4, kind: 'dust' }); shake(3, 0.3); } break; }
      case 'bu': { const u = U('e' + ev[1]); if (u) { if (ev[2] === 0 || ev[2] === undefined) { /* handled below */ } } break; }
      case 'bw': { shake(5, 0.3); S.campFlash = 1; const u = U('e' + ev[1]); sndGap('fd-camp-hit', 0.25, { at: u ? { x: u.x, y: u.y } : { x: M.P.hearth[0], y: M.P.hearth[1] } }); break; }
      case 'pk': { const u = U('h' + ev[1]); if (u) burst(u.x, u.y - 8, 5, { color: '#e6c98a', spd: 50, dur: 0.45, size: 2, kind: 'dot', vy: -30, g: -20 }); sndFor(ev[1], 'fd-pickup', u && u.x, u && u.y); break; }
      case 'dp': { burst(ev[3], ev[4], 5, { color: '#a89878', spd: 60, dur: 0.4, size: 2.6, kind: 'dust' }); sndFor(ev[1], 'fd-setdown', ev[3], ev[4]); break; }
      case 'dl': { const x = ev[4], y = ev[5]; S.hauls[ev[1]] = { got: ev[2], need: ev[3] }; ftxt(x, y - 36, ev[2] + ' / ' + ev[3], '#f3dfa4', 13, 1.5); fxRing(x, y, 10, 70, 0.6, '255,230,160', 3, 0); burst(x, y, 8, { color: '#ffe9a8', spd: 70, dur: 0.7, size: 2.2, kind: 'dot', vy: -40, g: -25 }); snd('fd-deliver'); break; }
      case 'dgone': { burst(ev[2], ev[3], 8, { color: '#6a5a48', spd: 90, dur: 0.5, size: 3, kind: 'chunk', g: 260 }); ftxt(ev[2], ev[3] - 18, 'Lost', '#ff9a8a', 11, 1.1); break; }
      case 'pp': { const ps = FoundingArt.POST_SLOTS[ev[2]]; if (ps) postFlare(ps, 0); sndFor(ev[1], 'fd-post-plant', ps && ps[0], ps && ps[1]); break; }
      case 'rl': { const ps = FoundingArt.POST_SLOTS[ev[2]]; if (ps) postFlare(ps, 1); sndFor(ev[1], 'fd-relight', ps && ps[0], ps && ps[1]); break; }
      case 'wk': { const ps = ev[2] >= 0 ? FoundingArt.POST_SLOTS[ev[2]] : null; if (ps) postFlare(ps, 2); const eu = ps ? null : U('e' + ev[1]); sndFor(null, S.bossId === ev[1] ? 'fd-wick-eat' : 'fd-post-out', ps ? ps[0] : eu && eu.x, ps ? ps[1] : eu && eu.y); break; }
      case 'br': { const u = U('h' + ev[1]); if (u) { glowAt2(u.x, u.y - 8, 0.8); burst(u.x, u.y - 12, 8, { color: '#ffb048', spd: 70, dur: 0.6, size: 2.2, kind: 'spark', vy: -40, g: -30 }); } sndFor(ev[1], 'fd-brand', u && u.x, u && u.y); break; }
      case 'sg': ftxt(FoundingArt.GATE.x, FoundingArt.GATE.y + 60, 'The Words', '#f3dfa4', 14, 2); snd('fd-quest-offer'); break;
      case 'cv': { const q = (S.props.qd || []).find(d => d[0] === 6); if (q) { ftxt(q[1], q[2] - 40, 'Lost your place', '#ff9a8a', 12, 1.4); burst(q[1], q[2], 8, { color: '#a89878', spd: 70, dur: 0.5, size: 2.4, kind: 'dust' }); } break; }
      case 'bl': { const u = U('h' + ev[1]); if (u) { ftxt(u.x, u.y - 44, 'The meadow raises you', '#cfd6ff', 12, 1.8); petalBurst(u.x, u.y, 8); } break; }
      case 'bb': { for (let i = 0; i < 10; i++) burst(ev[2], ev[3], 1, { color: Math.random() < 0.5 ? '#8a93d6' : '#a3a9e6', spd: 90, dur: 1.2, size: 3, kind: 'petal', vy: -30, g: -10 }); fxRing(ev[2], ev[3], 10, 120, 0.8, '150,165,235', 3, 0); break; }
      case 'ls': { const u = U('h' + ev[1]); if (u) { glowAt2(u.x, u.y, 1); ftxt(u.x, u.y - 44, 'Last stand', '#ffe9a8', 12, 1.3); } break; }
      case 'wg': { const u = U('e' + ev[1]); if (u) { u.gl0 = S.T; u.glDur = ev[2] || 1.2; } S.bcast = { txt: 'The lunge', t0: S.T, dur: ev[2] || 1.2 }; sndFor(null, 'fd-wick-glow', u && u.x, u && u.y, { reach: 1.5 }); break; }
      case 'wb': { const u = U('e' + ev[1]); if (u) { u.br0 = S.T; u.brDur = ev[2] || 1.6; } S.bcast = { txt: 'Wick Breath', t0: S.T, dur: ev[2] || 1.6 }; S.cold = { t0: S.T, dur: ev[2] || 1.6 }; sndFor(null, 'fd-wick-breath', u && u.x, u && u.y, { reach: 1.5 }); break; }
      case 'pin': { const u = U('e' + ev[1]); if (u) { u.pinned = !!ev[2]; if (ev[2]) { fxRing(u.x, u.y, 20, 110, 0.7, '200,225,255', 3, 0); burst(u.x, u.y, 12, { color: '#cfe0ff', spd: 120, dur: 0.6, size: 2, kind: 'spark' }); } } break; }
      case 'ws': { const u = U('e' + ev[1]); if (u) { burst(u.x, u.y, 22, { color: '#2a2540', spd: 200, dur: 0.9, size: 5, kind: 'dust' }); fxRing(u.x, u.y, 20, 150, 0.7, '120,110,190', 3, 0); shake(4, 0.3); } break; }
      case 'ms': { const l = U('e' + ev[2]); if (l) { fxRing(l.x, l.y, 20, 60, 0.7, '150,205,255', 3, 0); burst(l.x, l.y, 10, { color: '#bfe0ff', spd: 80, dur: 0.6, size: 2, kind: 'spark' }); } break; }
      case 'ml': { const l = U('e' + ev[1]) || S.gone.get('e' + ev[1]); if (l) { burst(l.x, l.y, 24, { color: '#7a5a38', spd: 200, dur: 0.9, size: 4, kind: 'chunk', g: 320 }); burst(l.x, l.y, 12, { color: '#cfeaf0', spd: 150, dur: 0.8, size: 3.4, kind: 'dust' }); fxRing(l.x, l.y, 20, 140, 0.7, '190,230,240', 4, 0); } shake(6, 0.35); sndFor(null, 'fd-log-break', l && l.x, l && l.y); break; }
      case 'md': { const u = U('e' + ev[1]); if (u) { for (let i = 0; i < 4; i++) fxRing(u.x, u.y, 20 + i * 8, 190 + i * 30, 0.9 + i * 0.15, '170,215,235', 4, 0); } shake(8, 0.8); sndFor(null, 'fd-mire-drown', u && u.x, u && u.y, { reach: 1.5 }); break; }
      case 'sh': S.shim = { x: ev[2], y: ev[3], tx: ev[4], ty: ev[5], k: ev[6], t0: S.T }; sndAt('fd-gnaw-sniff', ev[2], ev[3], { reach: 1.5 }); break;
      case 'gp': { S.bcast = null; shake(7, 0.5); if (S.boss) burst(S.boss.x, S.boss.y, 18, { color: '#6a5a4c', spd: 180, dur: 0.9, size: 5, kind: 'dust' }); if (FoundingUI) FoundingUI.partBanner(ev[2]); snd('fd-gnaw-stamp', { vol: 0.8 }); break; }
      case 'gw': { const u = U('e' + ev[1]); if (u) burst(u.x, u.y, 16, { color: '#8a7a6a', spd: 150, dur: 0.7, size: 3.4, kind: 'dust' }); sndFor(null, 'fd-whelps', u && u.x, u && u.y, { reach: 1.3 }); break; }
      case 'step': tierStep(ev); break;
      case 'rc': evRecall(ev); break;
      case 'pi': evPing(ev); break;
      case 'al': evAlert(ev); break;
      case 'sl': evSell(ev); break;
      case 'end': endBeat(ev[1]); break;
      case 'count': { S.counts.set(ev[1], { n: ev[2], N: ev[3], t0: S.T }); snd('fd-count', { minGap: 0, key: 'fd-count' + ev[1], rate: 1 + 0.07 * (ev[2] - 1) }); const u = U('h' + ev[1]); if (u) { fxRing(u.x, u.y, 8, 56, 0.6, '255,230,160', 2, 0); glowAt2(u.x, u.y, 0.7); } if (ev[2] === 1) endCamFit(); if (ev[2] === ev[3]) say('Every one of them is counted in.'); break; }
    }
  }
  function glowAt2(x, y, a) { fxAdd({ dur: 0.7, draw(c) { glowAt(c, x, y, 44 * (1 - this.t / 0.7 * 0.3), '255,240,190', a * (1 - this.t / 0.7)); } }); }

  // ================================================================ pass 2: tier steps, recall, pings, lane alerts, sales
  const laneIdx = l => (typeof l === 'number' ? l : Math.max(0, M.LANES.findIndex(L => L.id === l)));
  const laneName = l => { const L = M.LANES[laneIdx(l)]; return L ? L.name : 'A lane'; };
  const STEP_KIND = ['a new one joins the line', 'wears plates now', 'comes quicker', 'brings an elite'];
  function tierStep(ev) {
    const tier = ev[1] | 0;
    if (!S.stepInfo || S.stepInfo.tier !== tier) S.stepInfo = { tier, lanes: [], at: S.T + 0.3, done: false };
    S.stepInfo.lanes.push([ev[2], ev[3] | 0]);
  }
  // one small banner per step, once both lanes' events are in
  function stepUpdate() {
    const si = S.stepInfo; if (!si || si.done || S.T < si.at) return; si.done = true;
    if (si.tier <= S.tierShown) return; S.tierShown = si.tier;
    snd('fd-step', { vol: 0.8 });
    if (FoundingUI.stepBanner) FoundingUI.stepBanner(si.tier, si.lanes.map(([l, k]) => laneName(l) + ' ' + (STEP_KIND[k] || 'grows stronger')));
  }
  function evRecall(ev) {
    const pid = ev[1], code = ev[2], u = U('h' + pid), mine = pid === S.myId, vol = mine ? 1 : 0.4;
    if (code === 1) { S.rc.set(pid, { t0: S.T, dur: 4, m: 0 }); sndFor(pid, 'fd-recall', u && u.x, u && u.y, { vol, key: 'fd-recall' + pid, minGap: 0 }); }
    else if (code === 0) {
      S.rc.delete(pid);
      if (u) { burst(u.x, u.y, 6, { color: '#cfe6ff', spd: 50, dur: 0.4, size: 2, kind: 'dot' }); if (mine) ftxt(u.x, u.y - 44, 'Recall broken', '#c9d6e8', 11, 1.1); }
    } else if (code === 2) {
      S.rc.delete(pid);
      if (u) recallFlare(u.x, u.y, true);
      if (ev[3] !== undefined) recallFlare(ev[3], ev[4], false);
      sndFor(pid, 'fd-recall-done', ev[3] !== undefined ? ev[3] : u && u.x, ev[3] !== undefined ? ev[4] : u && u.y, { vol, key: 'fd-recalldone' + pid, minGap: 0 });
    }
  }
  function recallFlare(x, y, out) { fxRing(x, y, out ? 40 : 8, out ? 6 : 52, 0.7, '200,230,255', 3, 0); glowAt2(x, y, 0.9); burst(x, y, 12, { color: '#d8ecff', spd: 60, dur: 0.8, size: 2.2, kind: 'dot', vy: -70, g: -30 }); }
  function recallUpdate(dt) {
    if (!S.rc.size) return;
    for (const [pid, r] of S.rc) {
      if (S.T - r.t0 > r.dur + 0.8) { S.rc.delete(pid); continue; }   // (no word came: stop the show)
      const u = U('h' + pid); if (!u) continue;
      r.m -= dt; if (r.m <= 0) { r.m = 0.07; const a = rnd(0, TAU), d = rnd(14, 30); burst(u.x + Math.cos(a) * d, u.y + 8 + Math.sin(a) * d * 0.6, 1, { color: '#cfe6ff', spd: 8, dur: 0.9, size: 2, kind: 'dot', vy: -55, g: -25 }); }
    }
  }
  const rcLeft = () => { const sh = S && S.sheet; return sh && sh.rc > 0 ? Math.max(0, sh.rc - (S.T - S.sheetT)) : 0; };
  function tryRecall() {
    const m = me(); if (!S || S.phase !== 'live' || !m || (m.f & FLAG.DEAD) || S.ended || S.end || S.rc.has(S.myId)) return;
    const l = rcLeft(); if (l > 0) { say('Recall again in ' + Math.ceil(l) + ' s'); return; }
    S.openOnArrive = null; send({ k: 'recall' });
  }
  // the dash: toward the cursor, on its own cooldown (the host decides how far; the sheet's ds is the seconds left)
  const dsLeft = () => { const sh = S && S.sheet; return sh && sh.ds > 0 ? Math.max(0, sh.ds - (S.T - S.sheetT)) : 0; };
  function tryDash() {
    const m = me(); if (!S || S.phase !== 'live' || !m || (m.f & FLAG.DEAD) || S.ended || S.end) return;
    if (dsLeft() > 0) return;
    send({ k: 'dash', x: Math.round(S.mouse.wx), y: Math.round(S.mouse.wy) });
  }
  function sendPing(x, y) {
    if (!S || S.phase !== 'live' || S.ended || S.end || S.T - S.lastPing < 2) return;
    S.lastPing = S.T; send({ k: 'ping', x: Math.round(x), y: Math.round(y) });
  }
  function evPing(ev) {
    const u = U('h' + ev[1]); S.pings.push({ x: ev[2], y: ev[3], t0: S.T, col: u ? roleColor(u.hero) : '#e6c98a', name: u ? u.name : '' });
    if (S.pings.length > 8) S.pings.shift();
    snd('fd-ping', { vol: ev[1] === S.myId ? 0.8 : 0.65, key: 'fd-ping' + ev[1], minGap: 0.3 });
  }
  // a lane is truly breaking: a soft horn and a pulse at the minimap's edge (drawMiniAlerts), nothing else
  function evAlert(ev) {
    const i = laneIdx(ev[1]); S.alerts = S.alerts.filter(a => a.lane !== i); S.alerts.push({ lane: i, t0: S.T });
    sndGap('fd-alert', 4, { vol: 0.75 });
  }
  function evSell(ev) {
    const u = U('h' + ev[1]);
    if (u) { ftxt(u.x, u.y - 40, '+' + ev[3] + ' gold', '#f0cf72', 12, 1.2); burst(u.x, u.y - 6, 4, { color: '#f0cf72', spd: 50, dur: 0.5, size: 2, kind: 'dot', vy: -45, g: -20 }); }
    if (ev[1] === S.myId) snd('fd-sell');
  }
  function drawRecall(c) {
    for (const [pid, r] of S.rc) {
      const u = U('h' + pid); if (!u || (u.f & FLAG.DEAD)) continue; const k = clamp((S.T - r.t0) / r.dur, 0, 1), t = S.T;
      glowAt(c, u.x, u.y - 6, 26 + 22 * k, '190,225,255', 0.16 + 0.3 * k);
      c.save(); c.setLineDash([5, 7]); c.lineDashOffset = -t * 18; ell(c, u.x, u.y + 9, 30 - 8 * k, (30 - 8 * k) * 0.55, 0, null, `rgba(200,230,255,${0.35 + 0.45 * k})`, 1.8); c.restore();
      const w = 34, y = u.y - 54; c.fillStyle = '#000a'; c.fillRect(u.x - w / 2 - 1, y - 1, w + 2, 6); c.fillStyle = '#bfe0ff'; c.fillRect(u.x - w / 2, y, w * k, 4);
      if (pid === S.myId) { c.fillStyle = '#dbe9fa'; c.font = '10px system-ui'; c.textAlign = 'center'; c.fillText('Recall', u.x, y - 4); }
    }
  }
  function drawPings(c) {
    for (const p of S.pings) {
      const a = S.T - p.t0, life = 4, f = a < life - 0.8 ? 1 : clamp((life - a) / 0.8, 0, 1);
      c.save();
      for (let i = 0; i < 2; i++) { const k = (a - i * 0.3) / 1.1; if (k <= 0 || k >= 1) continue; c.globalAlpha = (1 - k) * 0.8 * f; const R = 6 + 54 * eo(k); ell(c, p.x, p.y, R, R * 0.72, 0, null, p.col, 2.2); }
      c.globalAlpha = 0.9 * f; const by = p.y - 14 - Math.abs(Math.sin(a * 3)) * 5 * (a < 2 ? 1 : 0.3);
      c.fillStyle = p.col; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p.x - 6, by - 10); c.lineTo(p.x + 6, by - 10); c.lineTo(p.x, by); c.closePath(); c.fill(); c.stroke();
      ell(c, p.x, p.y, 3.2, 2.3, 0, p.col);
      if (p.name && a < 2.6) { c.font = '10px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(240,232,214,.9)'; c.fillText(p.name, p.x, by - 14); }
      c.restore();
    }
  }
  // brighter and plated by the lane's tier (the tier rides in each enemy's row)
  function tierLook(c, u, sz, alpha) {
    const k = u.tier, r = u.def.r;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, 0.08 * k) * alpha; c.drawImage(sprOf(u.eid, false), -sz / 2, -sz / 2, sz, sz); c.globalCompositeOperation = 'source-over'; c.globalAlpha = alpha < 1 ? alpha : 1;
    const n = k < 2 ? 0 : k < 4 ? 1 : k < 6 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const ang = (i - (n - 1) / 2) * 0.7, px = Math.cos(ang) * r * 0.82, py = Math.sin(ang) * r * 0.82;
      c.save(); c.translate(px, py); c.rotate(ang);
      c.fillStyle = k >= 6 ? '#b49a82' : '#8d939c'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, Math.max(3, r * 0.26), Math.max(5, r * 0.4), 0, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.ellipse(-0.5, 0, Math.max(2, r * 0.17), Math.max(3.5, r * 0.3), 0, -1.9, -0.3); c.stroke();
      c.restore();
    }
    if (k >= 5) glowAt(c, 0, 0, r * 1.35, '255,120,50', 0.1 + 0.025 * k);
  }

  // ================================================================ fog of war
  // The whole party shares one sight. Sources that cast rays (so woods and cliffs can block them, FoundingMap.losClear): every hero, the
  // camp, lit posts, the beacon. Plain circles: every light the art knows (fires, the Sanctum, a brand) and props.vis if the sim sends it
  // ([[x, y, r]], for towers and soldiers later). Drawn into small blurred canvases (one texel = FOGK world px): `seen` is what is in
  // sight now, `exp` what ever was, `fog` the dark over the world. Enemies outside sight are not drawn and not on the minimap;
  // telegraphs are drawn regardless (drawTop runs after the fog).
  const FOGK = 16, NRAY = 56;
  const SIGHT = () => { const s = M.SIGHT || {}; return { hero: s.hero || 520, night: s.nightHero || 340, camp: s.camp || 600 }; };
  const mkCv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function fogInit() {
    const w = Math.ceil(M.W / FOGK), h = Math.ceil(M.H / FOGK), F = { w, h, seen: mkCv(w, h), exp: mkCv(w, h), fog: mkCv(w, h), base: mkCv(w, h), src: [], circ: [], cache: new Map(), gen: 0, t: 0, acc: 9 };
    // the dark is a painted mist, not a flat blob: a dark blue-grey wash with soft mottling and a few paler wisps. The texture is made on a
    // canvas twice the world's width so fogPaint can drift it sideways and wrap without a seam.
    F.base = mkCv(w * 2, h); F.drift = 0;
    const g = F.base.getContext('2d'); g.fillStyle = 'rgba(21,28,40,0.86)'; g.fillRect(0, 0, w * 2, h);
    let s = (S.seed | 0) * 7919 + 13; const rr = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const tones = ['rgba(12,16,26,.55)', 'rgba(34,44,62,.42)', 'rgba(26,34,38,.5)', 'rgba(16,20,34,.55)'];
    const blob = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    for (let i = 0; i < 420; i++) blob(rr() * w, rr() * h, 4 + rr() * 12, tones[i & 3]);
    for (let i = 0; i < 70; i++) blob(rr() * w, rr() * h, 6 + rr() * 14, 'rgba(92,108,134,.2)');
    g.drawImage(F.base, 0, 0, w, h, w, 0, w, h);   // the second half repeats the first, so the drift wraps
    return F;
  }
  function castRays(F, s) {
    const d = s.d || (s.d = new Float32Array(NRAY)), los = typeof M.losClear === 'function';
    for (let i = 0; i < NRAY; i++) {
      if (!los) { d[i] = s.r; continue; }
      const a = -PI + i * TAU / NRAY, ca = Math.cos(a), sa = Math.sin(a);
      if (M.losClear(s.x, s.y, s.x + ca * s.r, s.y + sa * s.r)) { d[i] = s.r; continue; }
      let lo = 0, hi = s.r;
      for (let k = 0; k < 5; k++) { const mid = (lo + hi) / 2; if (M.losClear(s.x, s.y, s.x + ca * mid, s.y + sa * mid)) lo = mid; else hi = mid; }
      d[i] = Math.max(lo, 36);
    }
    s.cx = s.x; s.cy = s.y; s.cr = s.r;
  }
  function fogRay(F, key, x, y, r) {
    let s = F.cache.get(key); if (!s) { s = { key, x, y, r, d: null, cx: 1e9, cy: 1e9, cr: 0, live: 0 }; F.cache.set(key, s); }
    s.x = x; s.y = y; s.r = r; s.live = F.gen; F.src.push(s);
    if (!s.d || Math.abs(x - s.cx) + Math.abs(y - s.cy) > 20 || Math.abs(r - s.cr) > 14) castRays(F, s);
  }
  function fogCollect(F) {
    F.gen++; F.src.length = 0; F.circ.length = 0;
    const P = S.props || {}, sg = SIGHT(), nk = clamp(+P.night || 0, 0, 1), rh = lerp(sg.hero, sg.night, nk), sight = S.sheet ? myStat('sight') : 0;
    for (const u of S.units.values()) if (u.kind === 'h') {
      const dead = u.f & FLAG.DEAD, mine = u.id === S.myId;
      fogRay(F, u.key, u.x, u.y, dead ? 120 : rh * (mine ? 1 + 0.5 * sight : 1));
    }
    fogRay(F, 'camp', M.P.hearth[0], M.P.hearth[1], sg.camp);
    const slots = FoundingArt.POST_SLOTS, posts = P.posts, off = P.postsOff || [];
    if (Array.isArray(posts) && slots) for (const i of posts) { const ps = slots[i]; if (ps && off.indexOf(i) < 0) fogRay(F, 'p' + i, ps[0], ps[1], 270); }
    if (P.beacon === true || P.beacon === 'lit' || P.beacon === 1) fogRay(F, 'beacon', M.P.beacon[0], M.P.beacon[1], 460);
    for (const [k, s] of F.cache) if (s.live !== F.gen) F.cache.delete(k);
    for (let i = 0; i < S.nl; i++) { const l = S.lights[i]; if (l.r > 70) F.circ.push({ x: l.x, y: l.y, r: l.r * 0.9 }); }
    if (Array.isArray(P.vis)) for (const v of P.vis) F.circ.push({ x: v[0], y: v[1], r: v[2] });
  }
  // is a point (with a body of radius pad) in the party's sight right now
  function visAt(x, y, pad) {
    const F = S.fog; if (!S.fogOn || !F) return true;
    for (const s of F.src) {
      const dx = x - s.x, dy = y - s.y, lim = s.r + pad; if (dx * dx + dy * dy > lim * lim) continue;
      const d = Math.sqrt(dx * dx + dy * dy); if (d < 50) return true;
      const f = (Math.atan2(dy, dx) + PI) / TAU * NRAY, i = Math.floor(f) % NRAY, t = f - Math.floor(f), a = s.d[i], b = s.d[(i + 1) % NRAY], dd = a + (b - a) * t;
      if (d - pad <= (dd >= s.r - 1 ? dd * 0.88 : dd)) return true;
    }
    for (const s of F.circ) { const dx = x - s.x, dy = y - s.y, lim = s.r * 0.88 + pad; if (dx * dx + dy * dy <= lim * lim) return true; }
    return false;
  }
  const fogSeesNew = (x, y, r) => (S.fogOn && S.fog ? (visAt(x, y, r) ? 1 : 0) : 1);
  function fogPaint(F) {
    const g = F.seen.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, F.w, F.h);
    const lit = (x, y, r, d) => {
      x /= FOGK; y /= FOGK; r /= FOGK; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,1)'); gr.addColorStop(0.82, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath();
      if (d) { for (let i = 0; i <= NRAY; i++) { const a = -PI + i * TAU / NRAY, dd = Math.min(d[i % NRAY] / FOGK, r); if (i) g.lineTo(x + Math.cos(a) * dd, y + Math.sin(a) * dd); else g.moveTo(x + Math.cos(a) * dd, y + Math.sin(a) * dd); } g.closePath(); }
      else g.arc(x, y, r, 0, TAU);
      g.fill();
    };
    for (const s of F.src) lit(s.x, s.y, s.r, s.d);
    for (const s of F.circ) lit(s.x, s.y, s.r, null);
    F.exp.getContext('2d').drawImage(F.seen, 0, 0);
    const f = F.fog.getContext('2d'); f.setTransform(1, 0, 0, 1, 0, 0); f.globalAlpha = 1; f.globalCompositeOperation = 'copy'; F.drift = (F.drift + 0.03) % F.w; f.drawImage(F.base, -F.drift, 0);
    f.globalCompositeOperation = 'destination-out'; try { f.filter = 'blur(2.4px)'; } catch (e) { /* no blur: harder edges */ }
    f.globalAlpha = 0.6; f.drawImage(F.exp, 0, 0); f.globalAlpha = 1; f.drawImage(F.seen, 0, 0);
    f.filter = 'none'; f.globalCompositeOperation = 'source-over';
  }
  function fogUpdate(dt) {
    S.fogOn = S.phase === 'live' && !S.end && !S.ended && !S.noFog;
    if (!S.fogOn) { for (const u of S.units.values()) if (u.kind === 'e') u.fogT = 1; return; }
    const F = S.fog || (S.fog = fogInit());
    F.acc += dt; if (F.acc < 0.066) return; F.acc = 0;
    fogCollect(F); fogPaint(F);
    for (const u of S.units.values()) if (u.kind === 'e') u.fogT = visAt(u.x, u.y, u.def ? u.def.r : 12) ? 1 : 0;
    if (S.tgt != null) { const t = S.units.get('e' + S.tgt); if (t && t.fogT === 0) S.tgt = null; }
  }
  function drawFog(ctx, vc) {
    const F = S.fog; if (!S.fogOn || !F) return;
    ctx.save(); wt(ctx, vc); ctx.imageSmoothingEnabled = true; try { ctx.imageSmoothingQuality = 'high'; } catch (e) { /* default */ }
    ctx.drawImage(F.fog, 0, 0, M.W, M.H); ctx.restore();
  }
  function drawMiniAlerts(g, w, h, kx, ky) {
    for (const p of S.pings) { const a = S.T - p.t0; if (a > 3.5) continue; const R = 3 + 9 * eo((a % 1.2) / 1.2); g.strokeStyle = p.col; g.globalAlpha = (1 - a / 3.5) * 0.9; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x * kx, p.y * ky, R, 0, TAU); g.stroke(); g.fillStyle = p.col; g.beginPath(); g.arc(p.x * kx, p.y * ky, 1.6, 0, TAU); g.fill(); g.globalAlpha = 1; }
    for (const al of S.alerts) {
      const age = S.T - al.t0; if (age > 6) continue; const L = M.LANES[al.lane]; if (!L) continue;
      const pulse = (0.5 - 0.5 * Math.cos(age * TAU / 1.8)) * clamp(1 - age / 6, 0, 1), p0 = L.path[0], ex = clamp(p0[0] * kx, 0, w), ey = clamp(p0[1] * ky, 0, h);
      const gr = g.createRadialGradient(ex, ey, 0, ex, ey, 26); gr.addColorStop(0, `rgba(255,176,96,${0.7 * pulse})`); gr.addColorStop(1, 'rgba(255,176,96,0)'); g.fillStyle = gr; g.fillRect(ex - 26, ey - 26, 52, 52);
      g.strokeStyle = `rgba(255,190,120,${0.35 * pulse})`; g.lineWidth = 2; g.beginPath(); L.path.forEach((q, i) => { if (i % 2 === 0 || i === L.path.length - 1) { if (i) g.lineTo(q[0] * kx, q[1] * ky); else g.moveTo(q[0] * kx, q[1] * ky); } }); g.stroke();
    }
  }

  function evCast(ev) {
    const [, pid, slot, wind, tx, ty] = ev, u = U('h' + pid); if (!u) return;
    const type = SLOT_POSE[u.hero][slot];
    if (type === 'dash') { u.an.dashT = S.T; }
    else setPose(u, type, wind, 0.3);
    if (!(slot === 2 && (u.hero === 'bastion'))) faceTo(u, tx, ty, Math.max(0.5, wind + 0.3));
    if (u.hero === 'bastion' && slot === 2) { u.braceVis = S.T + 0.45; }
    if (u.hero === 'cleric' && slot === 0) petalBurst(u.x, u.y, 2);
    if (u.hero === 'pyromancer' && slot === 0 && wind <= 0.01) { burst(u.x, u.y, 8, { color: '#ffb048', spd: 120, dur: 0.35, size: 2.2, kind: 'spark' }); }
    Fx.cast(u, slot, wind, tx, ty, pid === S.myId);
  }

  function evRelease(ev) {
    const [, pid, slot, x, y, cx, cy, rank] = ev, u = U('h' + pid); if (!u) return;
    const hero = u.hero;
    releaseSound(hero, slot, rank, pid, x, y);
    if (hero === 'bastion' && slot === 0 && rank === 9) ftxt(x, y - 24, 'Ricochet', '#ffe9a8', 11);
    if (hero === 'pyromancer' && slot === 0) launchFireball(pid, x, y, cx, cy, rank);
    Fx.release(u, slot, x, y, cx, cy, rank);   // (before a Firestep moves the unit: it draws from where you stood)
    if (hero === 'pyromancer' && slot === 2) { u.tr.settle(); u.x = x; u.y = y; u.an.dashT = S.T; }
  }

  function launchFireball(pid, x, y, ex, ey, rank) {
    const d = Math.hypot(ex - x, ey - y) || 1, hot = rank === 9, sub = rank === 8;
    if (S.projs.length > 40) S.projs.shift();
    S.projs.push({ fb: true, pid, x, y, dx: (ex - x) / d, dy: (ey - y) / d, speed: sub ? 376 : 470, maxD: d, dist: 0, trail: [], sz: sub ? 6 : hot ? 15 : 11, ex, ey });
    burst(x, y, 6, { ang: Math.atan2(ey - y, ex - x), spread: 0.6, color: '#ffb048', spd: 120, dur: 0.35, size: 2.2, kind: 'spark' });
  }

  function evImpact(ev) {
    const [, pid, slot, x, y, rad] = ev, u = U('h' + pid), hero = u ? u.hero : null;
    if (hero === 'pyromancer') sndFor(pid, slot === 0 ? 'fd-fireball-hit' : slot === 1 ? 'fd-erupt' : slot === 3 ? 'fd-meteor-hit' : 'fd-firestep', x, y, { vol: slot === 2 ? 0.5 : 1 });
    else if (hero === 'ranger' && slot === 1) sndFor(pid, 'fd-trap-burst', x, y);
    if (hero === 'pyromancer' && slot === 0) {
      // the fireball that matches this burst ends here
      let best = null, bd = 1e9; for (const p of S.projs) if (p.fb && p.pid === pid && !p.end) { const dd = Math.hypot(p.ex - x, p.ey - y); if (dd < bd) { bd = dd; best = p; } }
      if (best) best.end = true;
    }
    if (hero) Fx.impact(hero, slot, x, y, rad, pid === S.myId);
    if (hero === 'cleric' && slot !== 1) sparkleHeal(x, y);
  }

  function evAuto(ev) {
    const [, pid, eid] = ev, u = U('h' + pid); if (!u) return;
    const t = U('e' + eid) || S.gone.get('e' + eid); if (!t) return;
    faceTo(u, t.x, t.y, 0.4);
    const hero = u.hero, mine = pid === S.myId, au = mine ? undefined : { at: { x: u.x, y: u.y } }, ta = mine ? undefined : { at: { x: t.x, y: t.y } };   // (your own hero's sounds are never thinned by distance)
    if (hero === 'bastion') {
      sndGap('fd-auto-melee', 0.12, au); sndGap('fd-auto-hit-melee', 0.12, ta);
      setPose(u, 'attack', 0, 0.24);
      const ang = Math.atan2(t.y - u.y, t.x - u.x);
      Fx.autoSlash(u, t, ang);
      burst(t.x, t.y, 3, { color: '#e8eef8', spd: 90, dur: 0.2, size: 1.8, kind: 'spark' });
    } else {
      setPose(u, hero === 'ranger' ? 'attack' : 'cast', 0, 0.26);
      let pierce = false;
      if (hero === 'ranger') { if (u.alast !== eid) { u.alast = eid; u.acount = 0; } u.acount = (u.acount | 0) + 1; pierce = u.acount % 4 === 0; }
      if (pierce) { sndGap('fd-pierce', 0.1, au); pierceShot(u, t); return; }
      sndGap(hero === 'ranger' ? 'fd-auto-shot' : hero === 'cleric' ? 'fd-auto-holy' : 'fd-auto-ember', 0.1, au);
      const sp = hero === 'cleric' ? 430 : hero === 'pyromancer' ? 380 : 760, col = hero === 'cleric' ? '255,235,170' : hero === 'pyromancer' ? '255,140,50' : '240,230,200';
      const ang = Math.atan2(t.y - u.y, t.x - u.x);
      S.projs.push({ homing: true, own: mine, x: u.x + Math.cos(ang) * 14, y: u.y + Math.sin(ang) * 14, tgt: t, lx: t.x, ly: t.y, speed: sp, d0: Math.hypot(t.x - u.x, t.y - u.y) || 1, trail: [], arc: hero === 'ranger', col, hero });
    }
  }

  function evHit(ev) {
    const [, kind, id, amt, sub, x, y] = ev;
    if (kind === 0) {
      const u = U('e' + id); if (u) { u.flash = 0.12; u.sq = 1; }
      sndGap('fd-enemy-hit', 0.045, { at: { x, y } });
      dmgText('e' + id, x, y - ((u && u.def) ? u.def.r : 14) - 8, amt, sub === 1);
    } else if (kind === 1) {
      const u = U('h' + id);
      if (sub === 2) { ftxt(x, y - 24, '+' + amt, '#8fe6a2', 11); sparkleHeal(x, y); }
      else {
        ftxt(x, y - 24, '-' + amt, '#ff7a68', 12);
        burst(x, y, 3, { color: '#ff6a5a', spd: 70, dur: 0.3, size: 2, kind: 'dot' });
        if (u) { let ax = 0, ay = 1, bd = 1e9; for (const e of S.units.values()) if (e.kind === 'e') { const d = Math.hypot(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; ax = u.x - e.x; ay = u.y - e.y; } } const l = Math.hypot(ax, ay) || 1; u.an.hurt = { t0: S.T, k: clamp(amt / ((u.max || 100) * 0.2), 0.3, 1), ax: ax / l, ay: ay / l }; }
        if (id === S.myId) { shake(2, 0.12); S.hurtFlash = 0.35; }
      }
    } else if (kind === 2) {
      S.campFlash = 1; ftxt(x, y - 30, '-' + amt, '#ff9a5a', 12); sndGap('fd-camp-hit', 0.2, { at: { x, y } });
      burst(x, y, 4, { color: '#ffb36b', spd: 80, dur: 0.4, size: 2, kind: 'spark' });
    } else if (kind === 3) {
      ftxt(x, y - 24, '-' + amt, '#e6b070', 11); sndGap('fd-gate-hit', 0.2, { at: { x, y } }); burst(x, y, 3, { color: '#7a5a38', spd: 80, dur: 0.4, size: 2.5, kind: 'chunk', g: 200 });
    }
  }

  function evDeath(ev) {
    const [, id, x, y, face, vx, vy, elite] = ev;
    const u = U('e' + id) || S.gone.get('e' + id);
    if (u && u.def && (u.def.boss || u.def.inert)) { if (S.tgt === id) S.tgt = null; return; }
    if (elite) sndGap('fd-elite-die', 0.1, { at: { x, y } }); else sndGap('fd-enemy-die', 0.05, { at: { x, y } });
    const c = { x, y, r: u && u.def ? u.def.r : 14, eid: u ? u.eid : 'ashling', elite: !!elite, face, rot: face, vx, vy, vr: rnd(-2, 2), t: 0, life: rnd(2.2, 2.8), flung: 0 };
    S.corpses.push(c); if (S.corpses.length > 60) S.corpses.shift();
    burst(x, y, elite ? 14 : 7, { color: '#ff9a3a', spd: 90, dur: 0.6, size: 2.2, kind: 'spark', vy: -20 }); burst(x, y, elite ? 7 : 3, { color: '#5a4034', spd: 60, dur: 0.7, size: 3.5, kind: 'dust' });
    if (elite) shake(3, 0.25);
    if (S.tgt === id) S.tgt = null;
  }

  function evPerfectBlock(ev) {
    const [, pid, x, y, ang, prank] = ev, u = U('h' + pid);
    const PB = D.KITS.bastion.passive.pb[Math.max(0, Math.min(2, prank | 0))], reach = PB.reach, half = PB.half, rays = half > 1.5 ? 16 : 4;
    if (u) { u.gleam = 1; setPose(u, 'brace', 0, 0.4); u.fo = { a: ang, until: S.T + 0.5 }; }
    ftxt(x, y - 30, 'PERFECT BLOCK', '#ffe9a8', 13, 1.1);
    fxAdd({ dur: 0.5, draw(c) {
      const k = this.t / 0.5, e = eo(k * 1.5), f = 1 - ei(k); c.save(); c.translate(x, y); c.rotate(ang); c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(255,240,190,${0.5 * f})`; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, reach * e, -half, half); c.closePath(); c.fill();
      c.fillStyle = `rgba(255,255,255,${0.45 * f})`; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, reach * e * 0.55, -half * 0.8, half * 0.8); c.closePath(); c.fill();
      c.strokeStyle = `rgba(255,250,220,${0.9 * f})`; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, reach * e, -half, half); c.stroke();
      c.lineWidth = 1.6; for (let i = -rays; i <= rays; i++) { const a = i * half / (rays + 0.4); c.beginPath(); c.moveTo(18, Math.sin(a) * 18); c.lineTo(Math.cos(a) * reach * e * 1.08, Math.sin(a) * reach * e * 1.08); c.stroke(); }
      c.restore(); glowAt(c, x + Math.cos(ang) * 18, y + Math.sin(ang) * 18, 50 * (1 - k * 0.4), '255,240,190', 0.8 * f);
    } });
    shake(5, 0.28); sndFor(pid, 'fd-perfect', x, y);
    for (const cp of S.corpses) {
      const d = Math.hypot(cp.x - x, cp.y - y); if (d > reach + cp.r) continue;
      if (Math.abs(angDiff(ang, Math.atan2(cp.y - y, cp.x - x))) > half + 0.12 && d > cp.r + 14) continue;
      const a = Math.atan2(cp.y - y, cp.x - x) * 0.4 + ang * 0.6;
      cp.vx = Math.cos(a) * 620; cp.vy = Math.sin(a) * 620; cp.vr = (Math.random() < 0.5 ? -1 : 1) * rnd(11, 17); cp.flung = 1; cp.t = Math.min(cp.t, cp.life - 1.4);
      burst(cp.x, cp.y, 5, { color: '#d9c8a0', spd: 80, dur: 0.5, size: 3, kind: 'dust' });
    }
    burst(x + Math.cos(ang) * 30, y + Math.sin(ang) * 30, 18, { ang, spread: 0.8, color: '#fff4c8', spd: 260, dur: 0.5, size: 2, kind: 'spark' });
  }

  // ================================================================ sounds and small moments of the later run
  function releaseSound(hero, slot, rank, pid, x, y) {
    const N = { bastion: ['fd-bash', 'fd-banner', 'fd-brace', 'fd-wall'], cleric: ['fd-mend', 'fd-smite', 'fd-sanctum', 'fd-dawn'],
      pyromancer: ['fd-fireball-cast', 'fd-flamecircle', 'fd-firestep', 'fd-meteor-fall'], ranger: ['fd-arrow', 'fd-trap-arm', 'fd-mark', 'fd-starfall'] }[hero];
    if (N && N[slot]) sndFor(pid, N[slot], x, y, slot === 0 && rank === 8 ? { vol: 0.5 } : undefined);
  }
  // a hungry thing that struck: the heavy ones thud, the spitter spits, the stalker is only a shimmer in the dark
  function strikeSound(u) {
    const id = u.eid, at = { at: { x: u.x, y: u.y } };
    if (id === 'brute' || id === 'husk') sndGap('fd-brute-slam', 0.15, at);
    else if (id === 'spitter') sndGap('fd-spit', 0.12, at);
    else if (id === 'ashling' || id === 'whelp') sndGap('fd-strike-claw', 0.12, at);
    else if (id === 'streak') sndGap('fd-strike-dart', 0.12, at);
    else if (id === 'slagback') sndGap('fd-strike-slag', 0.15, at);
    else if (id === 'cartburner') sndGap('fd-strike-torch', 0.12, at);
    else if (id === 'wickshade') sndGap('fd-strike-shade', 0.2, at);
    else if (id === 'stalker') {
      sndGap('fd-stalker', 0.12, at);
      if (u.f & FLAG.HIDDEN) shimmerFx(u.x, u.y);
    }
  }
  function shimmerFx(x, y) { fxAdd({ dur: 0.45, layer: 1, draw(c) { const k = this.t / 0.45; ell(c, x, y, 8 + 26 * k, (8 + 26 * k) * 0.8, 0, null, `rgba(190,200,255,${0.3 * (1 - k)})`, 2); } }); }
  // which sound a boss's red or blue shape makes, by who is on the field
  function teleStart(t) {
    if (t.boss === 'mirebull' && t.shape === 1) sndAt('fd-mire-charge', t.x, t.y, { reach: 1.5 });
  }
  function teleResolve(t) {
    const b = t.boss; if (!b) return;
    const sa = n => sndAt(n, t.x, t.y, { reach: 1.5 });   // (a boss's blow carries further than a soldier's)
    if (b === 'tunnelmaw') sa(t.shape === 2 ? 'fd-tail-sweep' : 'fd-quake');
    else if (b === 'wickeater') sa('fd-wick-lunge');
    else if (b === 'mirebull') { if (t.shape === 0 && t.col) { sa('fd-flood-rise'); shake(3, 0.4); } else if (t.shape !== 1) sa('fd-mire-stamp'); }
    else if (b === 'oldgnaw') sa(t.shape === 1 ? 'fd-gnaw-lunge' : t.shape === 2 ? 'fd-gnaw-breath' : 'fd-gnaw-stamp');
  }
  // lantern posts: planted (0), relit (1), put out (2)
  function postFlare(ps, kind) {
    const x = ps[0] + 8 * ps[2], y = ps[1] - 8;
    if (kind === 2) {
      burst(x, y, 7, { color: '#4a4540', spd: 30, dur: 1.2, size: 4, kind: 'dust', vy: -26, g: -10 });
      fxAdd({ dur: 0.5, layer: 1, draw(c) { const k = this.t / 0.5; ell(c, x, y, 6 + 14 * k, 5 + 10 * k, 0, null, `rgba(150,170,220,${0.5 * (1 - k)})`, 1.6); } });
    } else {
      const rgb = kind ? '255,225,150' : '255,190,90';
      fxRing(x, y + 6, 6, kind ? 70 : 40, kind ? 0.7 : 0.5, rgb, kind ? 3 : 2, 1);
      glowAt2(x, y, kind ? 1 : 0.7);
      burst(x, y, kind ? 12 : 7, { color: kind ? '#fff0b8' : '#ffb048', spd: kind ? 110 : 70, dur: 0.7, size: 2, kind: 'spark', vy: -50, g: -20 });
    }
  }
  // the forge reveal: a short anvil flash, bigger for a hyper-forge
  function forgeFlash(hyper) {
    const fx = M.P.forge[0], fy = M.P.forge[1];
    fxRing(fx, fy, 10, hyper ? 190 : 110, hyper ? 0.9 : 0.6, hyper ? '255,230,150' : '255,190,100', hyper ? 5 : 3, 1);
    glowAt2(fx, fy, hyper ? 1.4 : 1);
    burst(fx, fy - 10, hyper ? 40 : 18, { color: hyper ? '#fff0b8' : '#ffb048', spd: hyper ? 260 : 170, dur: 0.8, size: 2.4, kind: 'spark', vy: -50, g: 200 });
    if (hyper) fxPillar(fx, fy, 46, 1.1, '255,230,160', 340);
    if (S.sheet && me() && Math.hypot(me().x - fx, me().y - fy) < 600) S.flash = { t: 0, dur: hyper ? 0.7 : 0.35, a: hyper ? 0.5 : 0.28, c: '255,236,190' };
  }
  // the Ranger's every-fourth arrow: a long gold line through everything in its path
  function pierceShot(u, t) {
    const ang = Math.atan2(t.y - u.y, t.x - u.x), L = D.KITS.ranger.range + 90;
    Fx.beam(u.x + Math.cos(ang) * 16, u.y + Math.sin(ang) * 16, u.x + Math.cos(ang) * L, u.y + Math.sin(ang) * L, 6, 1, '255,214,120');
    burst(t.x, t.y, 6, { color: '#fff4c8', spd: 130, dur: 0.35, size: 2, kind: 'spark' });
  }
  // floating numbers: hits on one target inside a moment add up; a crowd shows only the big ones
  function dmgText(key, x, y, amt, crit) {
    const T = S.texts;
    for (let i = T.length - 1; i >= 0 && i > T.length - 16; i--) {
      const q = T[i];
      if (q.key === key && q.t < 0.45) { q.amt += amt; q.crit = q.crit || crit; q.txt = q.amt + (q.crit ? '!' : ''); q.t = Math.min(q.t, 0.14); q.y = y; q.size = q.crit ? 14 : Math.min(15, q.size + 0.35); if (q.crit) q.color = '#ffcf5a'; return; }
    }
    if (T.length > 44 && !crit && amt < 20) return;
    ftxt(x, y, String(amt) + (crit ? '!' : ''), crit ? '#ffcf5a' : '#f4efe4', crit ? 14 : 11);
    const q = T[T.length - 1]; q.key = key; q.amt = amt; q.crit = crit;
  }
  // the end beat
  const GATE_PT = () => FoundingArt.GATE;
  function endBeat(step) {
    if (step === 0) {
      S.end = { step: 0, t0: S.T, panAt: 0 }; S.aim = null; S.rDown = false; const g = GATE_PT();
      S.endCam = { x: g.x, y: g.y + 50, z: 0.85, k: 1.5 };
      if (FoundingUI) FoundingUI.banner('THE SIEGE IS BROKEN', '', 'wave', 3.2);
    } else if (step === 1) {
      if (!S.end) S.end = { step: 1, t0: S.T };
      S.end.step = 1; S.end.panAt = S.T + 1.6; const g = GATE_PT();
      shake(12, 0.9); S.flash = { t: 0, dur: 0.9, a: 0.42, c: '255,240,210' };
      burst(g.x, g.y + 20, 30, { color: '#8a7a64', spd: 220, dur: 1.2, size: 6, kind: 'dust' }); burst(g.x, g.y + 20, 14, { color: '#6a5a48', spd: 160, dur: 0.9, size: 4, kind: 'chunk', g: 300 });
      fxRing(g.x, g.y + 20, 20, 260, 1, '255,225,160', 5, 0);
      snd('fd-gate-shut');
      if (FoundingUI) FoundingUI.banner('THE GATE IS SHUT', '', 'wave', 3);
    } else if (step === 2) {
      if (!S.end) S.end = { step: 2, t0: S.T };
      S.end.step = 2; S.endCam = { x: M.P.hearth[0], y: M.P.hearth[1] - 30, z: 0.78, k: 0.9 };
      snd('fd-victory');
      if (FoundingUI) FoundingUI.titleCard('Emberfall', 'The Steward names the town.');
    }
  }
  function endCamFit() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    for (const u of S.units.values()) if (u.kind === 'h') { n++; if (u.x < x0) x0 = u.x; if (u.x > x1) x1 = u.x; if (u.y < y0) y0 = u.y; if (u.y > y1) y1 = u.y; }
    if (!n) return;
    S.endCam = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 20, z: clamp(Math.min(W() / (x1 - x0 + 560), H() / (y1 - y0 + 440)), 0.6, 1.05), k: 1.3 };
  }
  // per-frame look of a boss: its own numbers from the snapshot's boss row
  function bossUnit(u, dt) {
    const row = S.bsBy[u.id], t = S.T;
    if (u.eid === 'wickeater') {
      if (row) { u.fedv += ((row[4] || 0) - u.fedv) * Math.min(1, dt * 2); u.pinned = !!row[6]; }
      const g = u.gl0 ? t - u.gl0 : 99, d = u.glDur || 1.2; u.glowK = g < d ? clamp(g / d, 0, 1) : clamp(1 - (g - d) / 0.4, 0, 1);
      const b = u.br0 ? t - u.br0 : 99, bd = u.brDur || 1.6; u.bK = b < bd ? clamp(b / bd, 0, 1) : clamp(1 - (b - bd) / 0.5, 0, 1);
    } else if (u.eid === 'oldgnaw' && row) {
      const ta = Math.atan2(row[3] - u.y, row[2] - u.x), rel = clamp(angDiff(u.face, ta), -1, 1); u.hd += (rel - u.hd) * Math.min(1, dt * 3);
    }
  }

  // ================================================================ per-frame update
  function refreshUnit(u, dt, rt) {
    const p = u.tr.at(S.T), px = u.x, py = u.y; u.x = p.x; u.y = p.y; u.face = p.a;
    const v = dt > 0 ? Math.hypot(u.x - px, u.y - py) / dt : 0; u.spd += (Math.min(v, 900) - u.spd) * Math.min(1, dt * 10);
    let s = u.q[0]; for (const q of u.q) { if (q.t <= rt) s = q; else break; }
    u.pf = u.f;
    if (s) { u.f = s.f; if (u.kind === 'h') { u.hp = s.hp; u.max = s.max; u.lv = s.lv; u.cs = s.cs; u.cp = s.cp; u.rd = s.rd | 0; } else u.pct = s.pct; }
    const F = u.f, P = u.pf;
    if (u.kind === 'e') {
      u.vis += ((((F & FLAG.HIDDEN) || u.fogT === 0) ? 0 : 1) - u.vis) * Math.min(1, dt * 7);
      if ((F & FLAG.WIND) && !(P & FLAG.WIND)) u.windT0 = S.T;
      if (!(F & FLAG.WIND) && (P & FLAG.WIND)) { u.lunge = 1; strikeSound(u); }
      if (u.def.boss) bossUnit(u, dt);
      if ((F & FLAG.UNDER) && !(P & FLAG.UNDER)) { u.underT0 = S.T; }
      if (!(F & FLAG.UNDER) && (P & FLAG.UNDER)) {
        u.riseT0 = S.T; burst(u.x, u.y, 26, { color: '#6a5238', spd: 240, dur: 0.9, size: 4.5, kind: 'dust' }); burst(u.x, u.y, 14, { color: '#8a7050', spd: 200, dur: 0.7, size: 3.5, kind: 'chunk', g: 400 });
        fxRing(u.x, u.y, 20, 160, 0.5, '200,170,120', 4, 0); shake(7, 0.4);
      }
      if ((F & FLAG.UNDER)) {
        u.trail.push({ x: u.x, y: u.y, t: S.T }); if (u.trail.length > 14) u.trail.shift();
        if (u.spd > 20 && Math.random() < dt * 14) burst(u.x, u.y, 1, { color: '#7a6244', spd: 50, dur: 0.7, size: 4, kind: 'dust' });
      } else if (u.trail.length) u.trail.length = 0;
    } else {
      if ((F & FLAG.DEAD) && !(P & FLAG.DEAD)) { u.deadT0 = S.T; u.downImg = null; }
      if (!(F & FLAG.DEAD) && (P & FLAG.DEAD)) { u.riseT0 = S.T; }
    }
    u.flash = Math.max(0, u.flash - dt); u.sq = Math.max(0, u.sq - dt * 6); u.lunge = Math.max(0, u.lunge - dt * 5); if (u.glow) u.glow = Math.max(0, u.glow - dt * 1.2); if (u.gleam) u.gleam = Math.max(0, u.gleam - dt * 2.2);
    const mv = u.spd > 22 ? 1 : 0; u.mv += (mv - u.mv) * Math.min(1, dt * 10); if (mv) u.wp += dt * u.spd / 12;
    if (u.kind === 'h') { u.an.t = S.T; u.an.moving = u.mv > 0.5; }
  }

  function update(dt) {
    S.T += dt;
    if (LAYERS.length) lay('update', dt);   // (feature layers' own per-frame work: wild corpses fading, ...)
    while (S.evq.length && S.evq[0].t <= S.T) { const e = S.evq.shift(); try { doEv(e.ev); } catch (er) { console.error(er); } }
    const rt = S.T - TRACK.DELAY;
    for (const u of S.units.values()) refreshUnit(u, dt, rt);
    for (const [k, u] of S.gone) if (S.T - u.goneAt > 3) S.gone.delete(k);
    // boss
    let boss = null; for (const u of S.units.values()) if (u.kind === 'e' && (u.f & FLAG.BOSS)) boss = u; S.boss = boss;
    const my = me();
    fogUpdate(dt); stepUpdate(); recallUpdate(dt); musicUpdate(dt);
    // camera
    const cam = S.cam, z = cam.zoom;
    cam.zoom += (cam.tz - cam.zoom) * Math.min(1, dt * (S.endCam ? 1.6 : 10));
    if (S.endCam) { const e = S.endCam, k = 1 - Math.exp(-dt * e.k); cam.free = true; cam.x += (e.x - cam.x) * k; cam.y += (e.y - cam.y) * k; cam.tz = e.z; if (S.end && S.end.panAt && S.T >= S.end.panAt) { S.end.panAt = 0; endCamFit(); } }
    else if (!cam.free && my) { const k = 1 - Math.exp(-dt * 7); cam.x += (my.x - cam.x) * k; cam.y += (my.y - cam.y) * k; }
    if (S.pan) {}
    const keys = S.keys; if (keys) { const sp = 700 / cam.zoom * dt; let dx = 0, dy = 0; if (keys.ArrowLeft) dx -= sp; if (keys.ArrowRight) dx += sp; if (keys.ArrowUp) dy -= sp; if (keys.ArrowDown) dy += sp; if (dx || dy) { cam.free = true; cam.x += dx; cam.y += dy; } }
    const vw = W() / 2 / cam.zoom, vh = H() / 2 / cam.zoom;
    cam.x = vw * 2 >= M.W ? M.W / 2 : clamp(cam.x, vw, M.W - vw); cam.y = vh * 2 >= M.H ? M.H / 2 : clamp(cam.y, vh, M.H - vh);
    // mouse in world
    const m = S.mouse; m.wx = cam.x + (m.sx - W() / 2) / cam.zoom; m.wy = cam.y + (m.sy - H() / 2) / cam.zoom;
    // held right mouse keeps walking toward the cursor
    if (S.rDown && !S.aim && !FoundingUI.blocking()) { S.rT -= dt; if (S.rT <= 0) { S.rT = 0.14; if (!S.rEnemy) send({ k: 'move', x: Math.round(m.wx), y: Math.round(m.wy) }); } }
    // Guided Stars follows the cursor
    if (S.sheet && S.sheet.up && S.sheet.up.indexOf('guidedstars') >= 0) { S.aimT -= dt; if (S.aimT <= 0) { S.aimT = 0.15; send({ k: 'aim', x: Math.round(m.wx), y: Math.round(m.wy) }); } }
    // a walk to the supply tent opens it on arrival
    if (S.openOnArrive && my) { const P = M.P[S.openOnArrive === 'forge' ? 'forge' : 'shop'], d = Math.hypot(my.x - P[0], my.y - P[1]); if (d < 190) { const w = S.openOnArrive; S.openOnArrive = null; if (w === 'forge') FoundingUI.openForge(); else FoundingUI.openTent(); } }
    // marker, shake, camp flash
    if (S.marker) { S.marker.t += dt; if (S.marker.t > 0.45) S.marker = null; }
    S.campFlash = Math.max(0, S.campFlash - dt * 3); if (S.hurtFlash) S.hurtFlash = Math.max(0, S.hurtFlash - dt * 2.5);
    if (S.shkT > 0) { S.shkT -= dt; if (S.shkT <= 0) S.shk = 0; }
    if (S.msg.t > 0) S.msg.t -= dt;
    // volleys rain
    for (const zn of S.zones.values()) if (zn.kind === ZONE.VOLLEY) {
      zn.acc = (zn.acc || 0) + dt; const left = zn.tLeft - (S.T - zn.at);
      while (zn.acc >= 0.075) { zn.acc -= 0.075; if (left > 0.6 && S.volley.length < 120) { const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * zn.a; S.volley.push({ x: zn.x + Math.cos(a) * d, y: zn.y + Math.sin(a) * d, t: 0, done: false }); } }
    }
    for (const v of S.volley) { v.t += dt; if (!v.done && v.t >= 0.4) v.done = true; }
    S.volley = S.volley.filter(v => v.t < 0.7);
    // burning ground and trails give off a few sparks
    // projectiles
    for (const p of S.projs) {
      if (p.homing) {
        const t = p.tgt; if (t && !t.goneAt && S.units.has(t.key)) { p.lx = t.x; p.ly = t.y; }
        const dx = p.lx - p.x, dy = p.ly - p.y, d = Math.hypot(dx, dy), st = p.speed * dt; p.ang = Math.atan2(dy, dx);
        p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 8) p.trail.shift();
        if (d <= st + 6) { p.dead = true; if (p.hero) sndGap(p.hero === 'cleric' ? 'fd-auto-hit-holy' : p.hero === 'pyromancer' ? 'fd-auto-hit-ember' : 'fd-auto-hit-arrow', 0.08, p.own ? undefined : { at: { x: p.lx, y: p.ly } }); burst(p.lx, p.ly, 4, { color: p.hero === 'cleric' ? '#fff1b8' : p.hero === 'pyromancer' ? '#ffb048' : '#e8e0c8', spd: 80, dur: 0.3, size: 2, kind: 'spark' }); if (p.hero === 'ranger') Fx.arrowHit(p.lx, p.ly, p.ang || 0); else Fx.flareAt(p.lx, p.ly, p.hero === 'cleric' ? 34 : 28, p.hero === 'cleric' ? '255,240,190' : '255,150,60', 0.2); continue; }
        p.x += dx / d * st; p.y += dy / d * st; p.prog = 1 - d / p.d0;
      } else if (p.fb) {
        if (p.end) { p.dead = true; continue; }
        const st = p.speed * dt; p.x += p.dx * st; p.y += p.dy * st; p.dist += st;
        p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 14) p.trail.shift();
        if (Math.random() < 0.6) burst(p.x, p.y, 1, { color: Math.random() < 0.5 ? '#ffb048' : '#ffd27a', spd: 30, dur: 0.4, size: 2, kind: Math.random() < 0.5 ? 'spark' : 'dot' }); if (Math.random() < 0.18) burst(p.x, p.y, 1, { color: '#3a2a24', spd: 14, dur: 0.7, size: 3, kind: 'dust' });
        if (p.dist > p.maxD + 40) p.dead = true;
      }
    }
    S.projs = S.projs.filter(p => !p.dead);
    for (const f of S.fx) { f.t += dt; if (f.update) f.update(dt); }
    for (const f of S.fx) if (f.t >= f.dur && f.end && !f.ended) { f.ended = true; f.end(); }
    S.fx = S.fx.filter(f => f.t < f.dur);
    for (const c of S.corpses) {
      c.t += dt;
      if (Math.abs(c.vx) + Math.abs(c.vy) > 2) { c.x += c.vx * dt; c.y += c.vy * dt; const k = Math.exp(-dt * (c.flung ? 3.6 : 6)); c.vx *= k; c.vy *= k; c.vr *= Math.exp(-dt * 3); c.rot += c.vr * dt; if (c.flung && Math.hypot(c.vx, c.vy) > 120 && Math.random() < 0.5) burst(c.x, c.y, 1, { color: '#b39a78', spd: 30, dur: 0.5, size: 3, kind: 'dust' }); }
    }
    S.corpses = S.corpses.filter(c => c.t < c.life);
    for (const p of S.parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - Math.min(1, dt * (p.kind === 'dust' ? 3 : 1.5)); p.rot += p.vr * dt; }
    S.parts = S.parts.filter(p => p.t < p.dur);
    for (const t of S.texts) t.t += dt; S.texts = S.texts.filter(t => t.t < t.life);
    for (const [id, t] of S.tele) { const age = S.T - t.t0; if ((t.res && S.T - t.res > 0.25) || age > t.warn + 1.2) S.tele.delete(id); }
    for (const z of S.zones.values()) if (z.kind === ZONE.FLOOD) { if (z.vr === undefined) z.vr = z.a * 0.35; z.vr += (z.a - z.vr) * Math.min(1, dt * 2.2); }
    for (const [id, ct] of S.counts) if (S.T - ct.t0 > 2.4) S.counts.delete(id);
    if (S.pings.length) S.pings = S.pings.filter(p => S.T - p.t0 < 4.2);
    if (S.alerts.length) S.alerts = S.alerts.filter(a => S.T - a.t0 < 7);
    if (S.bcast && S.T - S.bcast.t0 > S.bcast.dur + 0.25) S.bcast = null;
    if (S.cold && S.T - S.cold.t0 > S.cold.dur + 1.2) S.cold = null;
    if (S.flash) { S.flash.t += dt; if (S.flash.t >= S.flash.dur) S.flash = null; }
    if (S.ended && S.T >= S.endAt && !S.endShown) { S.endShown = true; FoundingUI.showEnd(lastResult); }
  }

  // ================================================================ creatures (drawn in code, facing +x; wh gives the hit-flash version)
  function drawAshling(g, wh) {
    const F = c => (wh ? '#fff' : c);
    circ(g, -5, 0, 8, F('#4a2f22'), wh ? null : '#150b07', 1.5);
    ell(g, 0, 0, 11, 10.5, 0, F('#5e3b2a'), wh ? null : '#150b07', 1.6);
    if (!wh) { g.strokeStyle = '#ff8a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-8, -3); g.lineTo(-3, -1); g.lineTo(-6, 3); g.moveTo(-2, 5); g.lineTo(2, 3); g.stroke(); }
    g.fillStyle = F('#d2c3a0'); g.beginPath(); g.moveTo(6, -8); g.lineTo(13, -12); g.lineTo(10, -5); g.fill(); g.beginPath(); g.moveTo(6, 8); g.lineTo(13, 12); g.lineTo(10, 5); g.fill();
    if (!wh) { circ(g, 8, -3.2, 1.9, '#ffb040'); circ(g, 8, 3.2, 1.9, '#ffb040'); }
  }
  function drawStreak(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#150b07';
    if (!wh) { g.fillStyle = 'rgba(255,140,40,.5)'; g.beginPath(); g.moveTo(-7, -4); g.lineTo(-24, 0); g.lineTo(-7, 4); g.fill(); g.fillStyle = 'rgba(255,225,130,.7)'; g.beginPath(); g.moveTo(-7, -2); g.lineTo(-16, 0); g.lineTo(-7, 2); g.fill(); }
    for (const s of [-1, 1]) { ell(g, 3, s * 7.5, 4.5, 2, s * 0.5, F('#4a2a1c'), ol, 1.2); ell(g, -5, s * 7, 4, 2, -s * 0.5, F('#4a2a1c'), ol, 1.2); }
    ell(g, 0, 0, 12.5, 6.5, 0, F('#6a3a24'), ol, 1.6);
    g.fillStyle = F('#c9b894'); for (let i = -1; i <= 2; i++) { g.beginPath(); g.moveTo(-4 + i * 4, -5); g.lineTo(-2 + i * 4, -9); g.lineTo(0 + i * 4, -5); g.fill(); }
    ell(g, 9, 0, 6, 4.8, 0, F('#7a4630'), ol, 1.4);
    if (!wh) { g.strokeStyle = '#ff9a3a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-8, 0); g.lineTo(4, 0); g.stroke(); circ(g, 11.5, -2.4, 1.5, '#ffd060'); circ(g, 11.5, 2.4, 1.5, '#ffd060'); }
  }
  function drawSlag(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#0c0606';
    for (const s of [-1, 1]) ell(g, 4, s * 17, 6, 4, 0, F('#2c2420'), ol, 1.5);
    circ(g, -8, 0, 15, F('#2a2220'), ol, 2);
    ell(g, 0, 0, 19, 17, 0, F('#3a2e2a'), ol, 2.2);
    if (!wh) { g.strokeStyle = '#ff7a22'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(-17, -6); g.lineTo(-9, -1); g.lineTo(-14, 6); g.lineTo(-6, 9); g.moveTo(-5, -12); g.lineTo(1, -6); g.stroke(); }
    ell(g, 6, 0, 9, 8, 0, F('#4a3a34'), ol, 1.6);
    if (!wh) { circ(g, 10, -3, 1.8, '#ffb040'); circ(g, 10, 3, 1.8, '#ffb040'); }
    // the plate it carries before it: thick iron, seamed with slag
    g.lineCap = 'round';
    g.strokeStyle = wh ? '#fff' : '#0c0a0a'; g.lineWidth = 9.5; g.beginPath(); g.arc(-2, 0, 21, -1.15, 1.15); g.stroke();
    g.strokeStyle = F('#5d5a62'); g.lineWidth = 7; g.beginPath(); g.arc(-2, 0, 21, -1.15, 1.15); g.stroke();
    g.strokeStyle = F('#7a7882'); g.lineWidth = 2; g.beginPath(); g.arc(-2, 0, 23, -1, 1); g.stroke();
    if (!wh) { g.strokeStyle = '#ff8a2a'; g.lineWidth = 1.3; for (const a of [-0.7, -0.25, 0.25, 0.7]) { g.beginPath(); g.moveTo(-2 + Math.cos(a) * 18, Math.sin(a) * 18); g.lineTo(-2 + Math.cos(a) * 24, Math.sin(a) * 24); g.stroke(); } }
  }
  function drawSpitter(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#150b07';
    for (const s of [-1, 1]) { ell(g, -2, s * 9, 4, 2.2, s * 0.6, F('#3a2a22'), ol, 1.2); ell(g, 5, s * 8, 3.5, 2, -s * 0.4, F('#3a2a22'), ol, 1.2); }
    ell(g, -2, 0, 11, 9.5, 0, F('#4a3228'), ol, 1.7);
    if (!wh) { g.strokeStyle = '#ff8a2a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-9, -3); g.lineTo(-4, 0); g.lineTo(-8, 4); g.stroke(); }
    ell(g, 8, 0, 7, 6.5, 0, F('#5a3a2a'), ol, 1.5);
    // the maw: a cone with coals in it
    g.fillStyle = F('#1a0c08'); g.beginPath(); g.moveTo(10, -5); g.lineTo(19, -3); g.lineTo(19, 3); g.lineTo(10, 5); g.closePath(); g.fill();
    if (!wh) { circ(g, 15, 0, 2.6, '#ff7a22'); circ(g, 15.5, -0.6, 1.3, '#ffe08a'); circ(g, 7, -3, 1.4, '#ffb040'); circ(g, 7, 3, 1.4, '#ffb040'); }
    g.fillStyle = F('#d2c3a0'); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(13, s * 4.4); g.lineTo(17, s * 2.4); g.lineTo(11, s * 2.4); g.fill(); }
  }
  function drawBrute(g, wh) {
    const F = c => (wh ? '#fff' : c);
    circ(g, -9, 0, 15, F('#2f2020'), wh ? null : '#0c0606', 2);
    ell(g, 0, 0, 22, 20, 0, F('#3d2a2a'), wh ? null : '#0c0606', 2.2);
    g.fillStyle = F('#6b5646'); for (const a of [-1.1, -0.4, 0.4, 1.1]) { g.save(); g.rotate(a); g.beginPath(); g.moveTo(8, -4); g.lineTo(19, -3); g.lineTo(19, 3); g.lineTo(8, 4); g.fill(); g.restore(); }
    if (!wh) { g.strokeStyle = '#ff7a22'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-18, -6); g.lineTo(-9, -2); g.lineTo(-14, 5); g.lineTo(-6, 8); g.moveTo(-4, -11); g.lineTo(2, -6); g.stroke(); }
    g.fillStyle = F('#d8cba8'); g.beginPath(); g.moveTo(10, -14); g.lineTo(26, -23); g.lineTo(19, -8); g.fill(); g.beginPath(); g.moveTo(10, 14); g.lineTo(26, 23); g.lineTo(19, 8); g.fill();
    if (!wh) { circ(g, 17, -5, 3, '#ffb040'); circ(g, 17, 5, 3, '#ffb040'); }
  }
  function drawMaw(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#0a0505';
    // the long body behind
    circ(g, -62, 0, 22, F('#2c2220'), ol, 2.4); circ(g, -38, 0, 29, F('#33262a'), ol, 2.6);
    g.fillStyle = F('#5a463c'); for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4; g.beginPath(); g.moveTo(-38 + Math.cos(a) * 27, Math.sin(a) * 27); g.lineTo(-38 + Math.cos(a + 0.2) * 38, Math.sin(a + 0.2) * 38); g.lineTo(-38 + Math.cos(a + 0.4) * 27, Math.sin(a + 0.4) * 27); g.fill(); }
    // the head: a plated skull round a ring of teeth
    ell(g, 2, 0, 46, 42, 0, F('#3a2e2a'), ol, 3);
    g.fillStyle = F('#5d4a3e');
    for (let i = 0; i < 7; i++) { const a = -1.5 + i * 0.5; g.save(); g.rotate(a); g.beginPath(); g.moveTo(14, -7); g.lineTo(40, -9); g.lineTo(46, 0); g.lineTo(40, 9); g.lineTo(14, 7); g.closePath(); g.fill(); g.strokeStyle = wh ? '#fff' : '#1a100c'; g.lineWidth = 1.4; g.stroke(); g.restore(); }
    if (!wh) { g.strokeStyle = '#ff7a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(-22, -14); g.lineTo(-12, -6); g.lineTo(-20, 4); g.lineTo(-10, 14); g.moveTo(-6, -30); g.lineTo(2, -22); g.lineTo(-4, -16); g.stroke(); }
    circ(g, 18, 0, 25, F('#1a0b07'), ol, 2);
    g.fillStyle = F('#e6d9b4'); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(18 + Math.cos(a - 0.12) * 24, Math.sin(a - 0.12) * 24); g.lineTo(18 + Math.cos(a) * 12, Math.sin(a) * 12); g.lineTo(18 + Math.cos(a + 0.12) * 24, Math.sin(a + 0.12) * 24); g.fill(); }
    if (!wh) { const gr = g.createRadialGradient(18, 0, 1, 18, 0, 11); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.5, '#ff8a2a'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(18, 0, 11, 0, TAU); g.fill(); circ(g, 5, -21, 3, '#ffb040'); circ(g, 5, 21, 3, '#ffb040'); }
  }
  // ---- the later enemies (founding originals; each faces +x, wh gives the hit-flash version)
  function drawStalker(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#0a0a12';
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of [-1, 1]) {
      g.strokeStyle = wh ? '#fff' : '#101018'; g.lineWidth = 4.4; g.beginPath(); g.moveTo(-5, s * 4); g.lineTo(-11, s * 12); g.lineTo(-18, s * 9); g.moveTo(6, s * 3.5); g.lineTo(12, s * 11.5); g.lineTo(19.5, s * 8.5); g.stroke();
      g.strokeStyle = F('#3c3c56'); g.lineWidth = 2.2; g.beginPath(); g.moveTo(-5, s * 4); g.lineTo(-11, s * 12); g.lineTo(-18, s * 9); g.moveTo(6, s * 3.5); g.lineTo(12, s * 11.5); g.lineTo(19.5, s * 8.5); g.stroke();
    }
    ell(g, -1, 0, 13.5, 5.6, 0, F('#30304a'), ol, 1.5);
    if (!wh) { g.fillStyle = '#5c5c80'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-9 + i * 4, -4.6); g.lineTo(-7 + i * 4, -9); g.lineTo(-5 + i * 4, -4.6); g.fill(); } }
    ell(g, 12.5, 0, 6.2, 4.5, 0, F('#41415e'), ol, 1.4);
    if (!wh) { circ(g, 15.5, -2.1, 1.5, '#e2eaff'); circ(g, 15.5, 2.1, 1.5, '#e2eaff'); }
  }
  function drawCartburner(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#120805';
    g.lineCap = 'round';
    g.strokeStyle = wh ? '#fff' : '#1e120a'; g.lineWidth = 5; g.beginPath(); g.moveTo(2, 6.5); g.lineTo(15, 8); g.stroke();
    g.strokeStyle = F('#6a4a2a'); g.lineWidth = 2.6; g.beginPath(); g.moveTo(2, 6.5); g.lineTo(15, 8); g.stroke();
    circ(g, 17, 8, 3.2, F('#3a2418'), ol, 1.2);
    if (!wh) { g.fillStyle = '#ff8a22'; g.beginPath(); g.moveTo(14.5, 8); g.quadraticCurveTo(15, 1, 21, -4); g.quadraticCurveTo(22.5, 3, 19.5, 9); g.closePath(); g.fill(); g.fillStyle = '#ffd25a'; g.beginPath(); g.moveTo(16.5, 8); g.quadraticCurveTo(17, 3, 20, -0.5); g.quadraticCurveTo(21, 4, 19, 8); g.closePath(); g.fill(); }
    ell(g, -3, 0, 9.8, 8.8, 0, F('#5a2a22'), ol, 1.6);
    ell(g, -5, -1, 6, 5, 0, F('#6c3428'));
    circ(g, 5.5, -1.8, 5, F('#7a4234'), ol, 1.4);
    if (!wh) { circ(g, 8.6, -3.6, 1.2, '#ffcc66'); circ(g, 8.6, 0.2, 1.2, '#ffcc66'); }
  }
  function drawHusk(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#0c0b0b';
    circ(g, -8, 0, 14.5, F('#4a4742'), ol, 2);
    ell(g, 0, 0, 19, 17, 0, F('#6b6761'), ol, 2.2);
    if (!wh) {
      g.strokeStyle = '#3a3733'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-14, -9); g.lineTo(-4, -3); g.moveTo(-14, 9); g.lineTo(-4, 3); g.moveTo(-2, -15); g.lineTo(3, -8); g.stroke();
      g.strokeStyle = '#d8651e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-17, -4); g.lineTo(-10, 0); g.lineTo(-15, 5); g.lineTo(-8, 9); g.moveTo(-5, 12); g.lineTo(0, 7); g.stroke();
    }
    ell(g, 6, 0, 9, 8.2, 0, F('#7b766e'), ol, 1.6);
    if (!wh) { circ(g, 10, -3, 1.8, '#ff9a3a'); circ(g, 10, 3, 1.8, '#ff9a3a'); }
    g.lineCap = 'round';
    g.strokeStyle = wh ? '#fff' : '#0c0b0b'; g.lineWidth = 10.5; g.beginPath(); g.arc(-1, 0, 20, -1.1, 1.1); g.stroke();
    g.strokeStyle = F('#8d887c'); g.lineWidth = 7.5; g.beginPath(); g.arc(-1, 0, 20, -1.1, 1.1); g.stroke();
    g.strokeStyle = F('#b6b09f'); g.lineWidth = 2; g.beginPath(); g.arc(-1, 0, 22.8, -1, 1); g.stroke();
    if (!wh) { g.strokeStyle = '#4a463f'; g.lineWidth = 1.2; for (const a of [-0.65, -0.2, 0.2, 0.65]) { g.beginPath(); g.moveTo(-1 + Math.cos(a) * 16.5, Math.sin(a) * 16.5); g.lineTo(-1 + Math.cos(a) * 23, Math.sin(a) * 23); g.stroke(); } }
  }
  function drawWhelp(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#120a07';
    g.lineCap = 'round'; g.strokeStyle = F('#4a3a34'); g.lineWidth = 2.6; g.beginPath(); g.moveTo(-7, 0); g.quadraticCurveTo(-13, -4, -14.5, 2); g.stroke();
    ell(g, -1, 0, 7.6, 5.6, 0, F('#5a4638'), ol, 1.3);
    ell(g, 6, 0, 4.7, 4.1, 0, F('#664f40'), ol, 1.2);
    g.fillStyle = F('#d2c3a0'); g.beginPath(); g.moveTo(5, -3.4); g.lineTo(8.5, -7.5); g.lineTo(8, -2.8); g.fill(); g.beginPath(); g.moveTo(5, 3.4); g.lineTo(8.5, 7.5); g.lineTo(8, 2.8); g.fill();
    if (!wh) { circ(g, 8.6, -1.6, 1, '#ffb040'); circ(g, 8.6, 1.6, 1, '#ffb040'); g.strokeStyle = '#ff8a2a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-6, -2); g.lineTo(-2, 0); g.lineTo(-5, 3); g.stroke(); }
  }
  function drawShade(g, wh) {
    const F = c => (wh ? '#fff' : c), ol = wh ? null : '#07060c';
    g.fillStyle = F('#1a1828'); g.beginPath(); g.moveTo(8, -9.5); g.quadraticCurveTo(-8, -15, -22, -7); g.lineTo(-16, -1.5); g.lineTo(-25, 3); g.lineTo(-14, 5.5); g.lineTo(-20, 11); g.quadraticCurveTo(-6, 13.5, 8, 9.5); g.closePath(); g.fill();
    if (!wh) { g.strokeStyle = ol; g.lineWidth = 1.4; g.stroke(); }
    ell(g, 2, 0, 11.5, 9.5, 0, F('#272540'), ol, 1.6);
    ell(g, 9.5, 0, 6.2, 5.6, 0, F('#34305c'), ol, 1.3);
    if (!wh) {
      circ(g, 13, -2.1, 1.8, '#d9e6ff'); circ(g, 13, 2.1, 1.8, '#d9e6ff');
      g.strokeStyle = '#9aa6d6'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(8, -9); g.lineTo(21, -13); g.moveTo(8, 9); g.lineTo(21, 13); g.stroke();
      g.strokeStyle = 'rgba(160,180,255,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-6, -3); g.lineTo(-16, -1); g.moveTo(-6, 3); g.lineTo(-17, 5); g.stroke();
    }
  }

  // the dam logs of the ford: heavy, drawn directly (no turning), pale-blue bubble when shielded
  function drawDamLog(c, u) {
    const r = u.def.r, t = S.T, inv = !!(u.f & FLAG.INVULN);
    ell(c, u.x + 3, u.y + 9, r * 1.25, r * 0.58, 0, 'rgba(0,0,0,.28)');
    for (let i = 0; i < 2; i++) { const k = (t * 0.6 + i / 2 + u.ph) % 1; ell(c, u.x, u.y + 7, r * (1.05 + k * 0.7), r * (0.6 + k * 0.35), 0, null, `rgba(190,230,235,${0.38 * (1 - k)})`, 1.6); }
    c.save(); c.translate(u.x, u.y); const sq = 1 + 0.15 * u.sq; c.scale(sq, 1 / sq);
    ell(c, 0, 0, r * 1.08, r * 0.64, 0, '#46321f', OUT, 2.4);
    ell(c, -2, -4, r * 0.98, r * 0.42, 0, '#5d4429');
    c.strokeStyle = 'rgba(20,12,6,.55)'; c.lineWidth = 1.4; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * r * 0.28 - 4, -r * 0.5); c.quadraticCurveTo(i * r * 0.28, 0, i * r * 0.28 - 3, r * 0.5); c.stroke(); }
    ell(c, r * 1.0, 0, r * 0.26, r * 0.56, 0, '#b79869', '#3a2a1a', 1.6);
    c.strokeStyle = 'rgba(90,64,34,.7)'; c.lineWidth = 0.9; for (const k of [0.45, 0.8]) { c.beginPath(); c.ellipse(r * 1.0, 0, r * 0.26 * k, r * 0.56 * k, 0, 0, TAU); c.stroke(); }
    c.strokeStyle = 'rgba(214,194,130,.75)'; c.lineWidth = 2.4; for (const bx of [-r * 0.45, r * 0.35]) { c.beginPath(); c.moveTo(bx, -r * 0.6); c.lineTo(bx + 2, r * 0.6); c.stroke(); }
    ell(c, -r * 0.55, r * 0.24, 7, 3.4, 0, '#4d7a3e'); ell(c, r * 0.1, -r * 0.3, 6, 3, 0, '#4d7a3e');
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.5; ell(c, 0, 0, r * 1.08, r * 0.64, 0, '#fff'); c.globalAlpha = 1; }
    if (inv) {
      const p = 0.5 + 0.5 * Math.sin(t * 5);
      ell(c, 0, -2, r * 1.3, r * 0.95, 0, `rgba(150,205,255,${0.1 + 0.06 * p})`, `rgba(180,220,255,${0.7 + 0.25 * p})`, 2.6);
      c.strokeStyle = `rgba(200,230,255,${0.5})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, -2, r * 1.0, r * 0.7, 0, 0.3, 1.9); c.stroke();
    }
    c.restore();
  }

  // ---- the Wick-Eater: thin, long-limbed, a throat that glows before it lunges, grows with every light it eats
  function drawWickEater(c, u) {
    const t = S.T, fed = u.fedv, sc = 1 + 0.045 * fed, gk = u.glowK || 0, pin = u.pinned, bk = u.bK || 0;
    glowAt(c, u.x, u.y, 78 * sc, '8,6,18', 0.38, false);
    ell(c, u.x + 3, u.y + 15, 40 * sc, 17 * sc, 0, 'rgba(0,0,0,.34)');
    c.save(); c.translate(u.x + (pin ? Math.sin(t * 43) * 1.1 : 0), u.y); c.rotate(u.face); c.scale(sc * (pin ? 1.06 : 1), sc * (pin ? 0.86 : 1));
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const s = i < 2 ? -1 : 1, front = i % 2, bx = front ? 14 : -10, ph = u.wp * 0.3 + i * 1.7, sw = pin ? 0 : Math.sin(ph) * (u.mv > 0.3 ? 11 : 2);
      const kx = bx + sw * 0.5 + (front ? 8 : -8), ky = s * 30, fx = bx + sw + (front ? 15 : -15), fy = s * (46 - (Math.cos(ph) > 0.7 && u.mv > 0.3 ? 5 : 0));
      c.strokeStyle = OUT; c.lineWidth = 6.4; c.beginPath(); c.moveTo(bx, s * 6); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
      c.strokeStyle = '#2b2632'; c.lineWidth = 3.6; c.beginPath(); c.moveTo(bx, s * 6); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
      circ(c, kx, ky, 2.7, '#d9d0b8', OUT, 0.8);
      c.strokeStyle = '#d9d0b8'; c.lineWidth = 1.4; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + (front ? 7 : -7), fy + s * 3 + k * 4); c.stroke(); }
    }
    // the wick: a long pale tail with an ember at its tip that swells as it feeds
    const wag = Math.sin(t * 2.2 + u.ph) * 9, tipX = -64, tipY = wag;
    c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(-46, -wag * 0.6, tipX, tipY); c.stroke();
    c.strokeStyle = '#d9d0b8'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(-46, -wag * 0.6, tipX, tipY); c.stroke();
    glowAt(c, tipX, tipY, 6 + fed * 2.2, '255,150,60', 0.35 + fed * 0.08); circ(c, tipX, tipY, 1.8 + fed * 0.35, '#ffd9a0');
    ell(c, -6, 0, 25, 9.8, 0, '#1d1a25', OUT, 2.6);
    c.strokeStyle = 'rgba(217,208,184,.32)'; c.lineWidth = 1.4; for (let i = 0; i < 5; i++) { const x = -22 + i * 7; c.beginPath(); c.moveTo(x, -7.5); c.quadraticCurveTo(x - 2, 0, x, 7.5); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 12.5; c.beginPath(); c.moveTo(14, 0); c.quadraticCurveTo(26, -3 * Math.sin(t * 1.5), 36, 0); c.stroke();
    c.strokeStyle = '#27222f'; c.lineWidth = 8.4; c.beginPath(); c.moveTo(14, 0); c.quadraticCurveTo(26, -3 * Math.sin(t * 1.5), 36, 0); c.stroke();
    if (gk > 0.02) glowAt(c, 25, 0, 9 + 26 * gk, '255,176,76', 0.3 + 0.7 * gk);
    ell(c, 43, 0, 13.5, 7.8, 0, '#2d2835', OUT, 2.3);
    ell(c, 50, 0, 7.2, 4.8, 0, '#09070c');
    if (gk > 0.02) { glowAt(c, 48, 0, 8 + 20 * gk, '255,196,100', 0.2 + 0.8 * gk); circ(c, 48, 0, 2 + 3 * gk, `rgba(255,236,170,${0.4 + 0.6 * gk})`); }
    if (bk > 0.02) glowAt(c, 52, 0, 16 + 70 * bk, '170,205,255', 0.55 * bk);
    circ(c, 40, -3.7, 1.5, '#e8e0cc'); circ(c, 40, 3.7, 1.5, '#e8e0cc');
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.45; ell(c, -4, 0, 30, 11, 0, '#fff'); ell(c, 43, 0, 14, 8, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
    if (pin) {   // held between two lights it cannot cross: a cold, white shiver round it
      const p = 0.5 + 0.5 * Math.sin(t * 9);
      ell(c, u.x, u.y, 56 * sc, 46 * sc, 0, `rgba(190,215,255,${0.06 + 0.05 * p})`, `rgba(215,232,255,${0.5 + 0.3 * p})`, 2.2);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 1.5; glowAt(c, u.x + Math.cos(a) * 52 * sc, u.y + Math.sin(a) * 42 * sc, 7, '210,230,255', 0.8); }
    }
  }

  // ---- the Mirebull: a huge drowned ox, weed and reed hanging off a sodden hide; the front hooves rise to stamp
  function drawMirebull(c, u) {
    const t = S.T, wind = !!(u.f & FLAG.WIND), lift = wind ? eo(clamp((t - (u.windT0 || t)) / 1.2, 0, 1)) : 0;
    ell(c, u.x + 4, u.y + 24, 92, 46, 0, 'rgba(0,0,0,.3)');
    for (let i = 0; i < 3; i++) { const k = (t * 0.45 + i / 3) % 1; ell(c, u.x, u.y + 18, 78 + k * 40, 38 + k * 20, 0, null, `rgba(190,230,235,${0.3 * (1 - k)})`, 2); }
    c.save(); c.translate(u.x, u.y); c.rotate(u.face + Math.sin(u.wp * 0.5 + u.ph) * 0.015); c.scale(1 + 0.03 * lift, 1 + 0.03 * lift); c.lineCap = 'round';
    for (const [lx, ly, fr] of [[-36, -34, 0], [-36, 34, 0], [34, -37, 1], [34, 37, 1]]) {
      const up = fr ? lift * 15 : 0; ell(c, lx + up, ly, 15 + up * 0.12, 11, 0, fr && lift > 0.4 ? '#34464a' : '#222f32', OUT, 2);
    }
    ell(c, -8, 0, 72, 47, 0, '#2f3e41', OUT, 3.2);
    ell(c, -16, -7, 56, 30, 0, '#3b4c4f');
    ell(c, 30, 0, 30, 36, 0, '#44575a');   // the heavy hump of the shoulders
    for (const [px, py, pr] of [[-40, -14, 11], [-26, 18, 9], [-52, 10, 8], [-8, -22, 8], [8, 20, 10]]) ell(c, px, py, pr * 1.3, pr, 0.4, 'rgba(10,20,22,.38)');
    c.strokeStyle = 'rgba(206,210,184,.2)'; c.lineWidth = 2.2; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-40 + i * 12, s * 30); c.quadraticCurveTo(-38 + i * 12, s * 38, -46 + i * 12, s * 43); c.stroke(); }
    c.strokeStyle = '#20302c'; c.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = -0.8 + i * 0.27; c.beginPath(); c.moveTo(34 + Math.cos(a) * 20, Math.sin(a) * 30); c.lineTo(34 + Math.cos(a) * 30, Math.sin(a) * 40); c.stroke(); }
    for (let i = 0; i < 11; i++) {
      const a = 0.9 + i * 0.5, ex = -8 + Math.cos(a) * 66, ey = Math.sin(a) * 43, sw = Math.sin(t * 1.6 + i * 1.3) * 6, ln = 14 + (i % 3) * 5;
      c.strokeStyle = i % 2 ? '#3d5a2e' : '#4f6e3a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo(ex + Math.cos(a) * ln * 0.5 + sw, ey + Math.sin(a) * ln * 0.5, ex + Math.cos(a) * ln + sw * 1.4, ey + Math.sin(a) * ln + 5); c.stroke();
    }
    ell(c, 62, 0, 26, 22, 0, '#48595c', OUT, 2.6);
    ell(c, 80, 0, 12, 14, 0, '#556b6f', OUT, 2);
    circ(c, 86, -5.5, 2.4, '#0f191b'); circ(c, 86, 5.5, 2.4, '#0f191b');
    for (const s of [-1, 1]) {
      c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.moveTo(56, s * 15); c.quadraticCurveTo(66, s * 46, 98, s * 40); c.stroke();
      c.strokeStyle = '#d6cfb2'; c.lineWidth = 6; c.beginPath(); c.moveTo(56, s * 15); c.quadraticCurveTo(66, s * 46, 98, s * 40); c.stroke();
      glowAt(c, 68, s * 10, 9, '150,235,200', 0.5 + 0.2 * Math.sin(t * 2 + s)); circ(c, 68, s * 10, 3, '#b6f0d6');
    }
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.42; ell(c, -4, 0, 76, 48, 0, '#fff'); ell(c, 64, 0, 26, 22, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }

  // ---- Old Gnaw: vast, blind, ash and old bone; its head turns to the warmest thing before every move
  const gnawNose = (u, o) => { const k = 0.85, hx = 86 * k, nx = hx + Math.cos(u.hd) * 92 * k, ny = Math.sin(u.hd) * 92 * k, ca = Math.cos(u.face), sa = Math.sin(u.face); o.x = u.x + nx * ca - ny * sa; o.y = u.y + nx * sa + ny * ca; return o; };
  const NOSE = { x: 0, y: 0 };
  function drawGnaw(c, u) {
    const t = S.T, row = S.bsBy[u.id], part = row ? row[5] : 1, wind = !!(u.f & FLAG.WIND), wk = wind ? eo(clamp((t - (u.windT0 || t)) / 1.4, 0, 1)) : 0, cold = part === 3;
    const bodyC = cold ? '#454a50' : '#3b3530', furC = cold ? '#80878e' : '#6a5e52', emb = cold ? '168,196,220' : '255,122,34', bone = cold ? '#c9d2d8' : '#c4b998';
    ell(c, u.x + 8, u.y + 40, 118, 56, 0, 'rgba(0,0,0,.32)');
    c.save(); c.translate(u.x, u.y); c.rotate(u.face); c.scale(0.85, 0.85); c.translate(9 * wk, 0); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [lx, ly, ph] of [[-64, -62, 0], [-64, 62, PI], [42, -64, PI], [42, 64, 0]]) {
      const sw = Math.sin(u.wp * 0.18 + ph) * (u.mv > 0.3 ? 13 : 1.5); ell(c, lx + sw, ly, 25, 17, 0, '#1d1917', OUT, 2.4);
      c.fillStyle = bone; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(lx + sw + 21, ly + k * 7 - 2); c.lineTo(lx + sw + 31, ly + k * 7); c.lineTo(lx + sw + 21, ly + k * 7 + 2); c.fill(); }
    }
    ell(c, -18, 0, 106, 69, 0, bodyC, OUT, 3.4);
    c.fillStyle = furC;
    for (let i = 0; i < 28; i++) {
      const a = i * TAU / 28, ln = 12 + 6 * Math.sin(i * 3.1 + t * 1.1), bx = -18 + Math.cos(a) * 104, by = Math.sin(a) * 67, a0 = a - 0.06, a1 = a + 0.06;
      c.beginPath(); c.moveTo(-18 + Math.cos(a0) * 100, Math.sin(a0) * 64); c.lineTo(bx + Math.cos(a) * ln, by + Math.sin(a) * ln); c.lineTo(-18 + Math.cos(a1) * 100, Math.sin(a1) * 64); c.fill();
    }
    c.strokeStyle = 'rgba(214,203,170,.5)'; c.lineWidth = 3.4;
    for (let i = 0; i < 8; i++) { const x = -92 + i * 17, h = 56 - Math.abs(i - 3.5) * 5; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x, s * 5); c.quadraticCurveTo(x - 4, s * h * 0.6, x - 11, s * h); c.stroke(); } }
    for (let i = 0; i < 8; i++) ell(c, -92 + i * 17, 0, 7.5, 5.2, 0, bone, OUT, 1.4);
    c.strokeStyle = `rgba(${emb},${cold ? 0.55 : 0.55 + 0.25 * Math.sin(t * 3)})`; c.lineWidth = cold ? 1.3 : 2; c.beginPath();
    c.moveTo(-70, -30); c.lineTo(-52, -20); c.lineTo(-62, -8); c.lineTo(-40, 4); c.moveTo(-30, 30); c.lineTo(-14, 20); c.lineTo(-22, 8); c.moveTo(-8, -40); c.lineTo(8, -28); c.lineTo(0, -16); c.stroke();
    c.save(); c.translate(86, 0); c.rotate(u.hd); c.scale(1.18, 1.18);
    ell(c, -10, 0, 32, 27, 0, bodyC, OUT, 3);
    ell(c, 20, 0, 45, 33, 0, '#b3a88a', OUT, 3.2); ell(c, 14, -4, 34, 22, 0, '#c4b998');
    for (const s of [-1, 1]) { ell(c, 14, s * 17, 8.5, 6.4, 0, '#0a0808', OUT, 1.2); c.strokeStyle = 'rgba(40,30,20,.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(18, s * 12); c.lineTo(30, s * 6); c.stroke(); }
    ell(c, 56, 0, 25, 18, 0, '#a89d82', OUT, 2.8);
    for (const s of [-1, 1]) { ell(c, 71, s * 7.5, 5.4, 3.4, 0, '#0b0807'); if (!cold) glowAt(c, 71, s * 7.5, 10 + 4 * Math.sin(t * 5 + s), '255,140,50', 0.35 + 0.25 * Math.sin(t * 5)); }
    c.fillStyle = '#e6dcc0'; for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { const x = 36 + i * 5.2, y = s * (17 - i * 0.8); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2.6, y + s * 5.4); c.lineTo(x + 5.2, y); c.fill(); }
    if (part >= 2) { c.strokeStyle = OUT; c.lineWidth = 9; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(6, s * 30); c.quadraticCurveTo(14, s * 54, 40, s * 58); c.stroke(); } c.strokeStyle = bone; c.lineWidth = 5.4; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(6, s * 30); c.quadraticCurveTo(14, s * 54, 40, s * 58); c.stroke(); } }
    if (wk > 0.05) glowAt(c, 66, 0, 24 + 40 * wk, cold ? '170,205,235' : '255,150,70', 0.5 * wk);
    c.restore();
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.3; ell(c, -18, 0, 106, 69, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }
  // the shimmer from its nose to the warmest thing it can smell (not a telegraph: a hint, drawn faint over the dark)
  function drawShimmer(c) {
    const b = S.boss; if (!b || b.eid !== 'oldgnaw') return; const row = S.bsBy[b.id]; if (!row) return;
    const nose = gnawNose(b, NOSE), tx = row[2], ty = row[3], dx = tx - nose.x, dy = ty - nose.y, L = Math.hypot(dx, dy); if (L < 40) return;
    const t = S.T, fresh = S.shim && t - S.shim.t0 < 2.6 ? 1 - (t - S.shim.t0) / 2.6 : 0, a = 0.14 + 0.2 * fresh, n = Math.min(40, Math.ceil(L / 16)), nx = -dy / L, ny = dx / L;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let w = 0; w < 3; w++) {
      c.strokeStyle = `rgba(255,${214 - w * 18},${160 - w * 16},${a / (1 + w * 0.7)})`; c.lineWidth = 3.2 - w * 0.8; c.beginPath();
      for (let i = 0; i <= n; i++) { const s = i / n, env = Math.min(1, s * 5, (1 - s) * 5), off = Math.sin(s * 22 - t * 5 + w * 2.1) * (6 + 3 * w) * env, px = nose.x + dx * s + nx * off, py = nose.y + dy * s + ny * off; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
      c.stroke();
    }
    const p = 0.5 + 0.5 * Math.sin(t * 4); ell(c, tx, ty, 26 + 4 * p, 22 + 3 * p, 0, `rgba(255,190,110,${0.04 + 0.05 * fresh})`, `rgba(255,205,140,${0.28 + 0.3 * fresh})`, 1.8);
    c.restore();
  }
  const BOSSDRAW = { wickeater: drawWickEater, mirebull: drawMirebull, oldgnaw: drawGnaw };

  // ---- things people carry and the places they carry them to
  // code: 1 warm stone, 2 oil jar, 3 a fallen founder on a bier, 4 dressed stone, 5 timber, 8 a flame (the camp fire)
  function drawItem(c, code, x, y, s, rot) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s, s); c.lineCap = 'round';
    switch (code) {
      case 1: glowAt(c, 0, 0, 16, '255,150,70', 0.8); circ(c, 0, 0, 4.2, '#e0884a', OUT, 1); circ(c, -1, -1, 1.5, '#ffd9a0'); break;
      case 2: circ(c, 0, 1, 6.6, '#a0623a', OUT, 1.4); circ(c, 0, 1, 4.4, '#7b4526'); ell(c, 0, -5.4, 3, 1.7, 0, '#d9b56a', OUT, 1); circ(c, -2, -1.5, 1.6, 'rgba(255,220,180,.6)'); break;
      case 3:
        c.strokeStyle = OUT; c.lineWidth = 4.4; c.beginPath(); c.moveTo(-15, -5.5); c.lineTo(15, -5.5); c.moveTo(-15, 5.5); c.lineTo(15, 5.5); c.stroke();
        c.strokeStyle = '#7a5a36'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-15, -5.5); c.lineTo(15, -5.5); c.moveTo(-15, 5.5); c.lineTo(15, 5.5); c.stroke();
        ell(c, 0, 0, 12, 6.4, 0, '#d6d0c0', OUT, 1.3); c.strokeStyle = 'rgba(90,80,60,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -5); c.lineTo(-4, 5); c.moveTo(4, -5); c.lineTo(6, 5); c.stroke(); break;
      case 4: c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-6, -3.5, 14, 11); c.fillStyle = '#a29b8d'; c.fillRect(-7.5, -5.5, 15, 11); c.strokeStyle = OUT; c.lineWidth = 1.3; c.strokeRect(-7.5, -5.5, 15, 11); c.fillStyle = 'rgba(255,250,235,.25)'; c.fillRect(-6.5, -4.5, 13, 3); break;
      case 5: ell(c, 0, 0, 14.5, 4.8, 0, '#7a5a38', OUT, 1.3); ell(c, 13.5, 0, 2.7, 4.5, 0, '#c6a374', OUT, 1); c.strokeStyle = 'rgba(40,26,14,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-10, -1.5); c.lineTo(9, -1.5); c.moveTo(-8, 2); c.lineTo(10, 2); c.stroke(); break;
      case 8: flame(c, 0, 5, 6, S.T, 1); break;
    }
    c.restore();
  }
  function drawBrand(c, u) {
    const t = S.T, sg = Math.cos(u.face) >= 0 ? 1 : -1, bx = u.x + sg * 15, by = u.y - 2;
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 4.6; c.beginPath(); c.moveTo(bx, by + 8); c.lineTo(bx, by - 12); c.stroke();
    c.strokeStyle = '#7a5530'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(bx, by + 8); c.lineTo(bx, by - 12); c.stroke();
    flame(c, bx, by - 11, 6.4, t + u.id, 1); glowAt(c, bx, by - 15, 32 + 3 * Math.sin(t * 9 + u.id), '255,170,70', 0.42);
  }

  // the places and the things waiting at them, over the dark, each with a small tooltip
  const keyLbl = id => { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null; return (KB && KB.label && KB.keyFor ? KB.label(KB.keyFor(id)) : null) || ({ fdUse: 'G', fdDrop: 'X' })[id] || '?'; };
  function markerTip(code, dest) {
    const G = keyLbl('fdUse'), X = keyLbl('fdDrop');
    if (dest) switch (code) {
      case 2: return ['The beacon hill', 'Carry the oil up and walk into the ring.'];
      case 3: return ['The meadow', 'Carry a fallen founder into the ring and stand still a moment to plant the bluebells.'];
      case 4: return ['The Stone Gate', 'Bring the dressed stone into the ring.'];
      case 5: return ['The hall site', 'Bring the timber into the ring.'];
      case 6: return ['The Words', 'Stand in the ring and press ' + G + ' to carve. A blow makes you lose your place.'];
      case 7: return ['The Covering', 'Stand in the ring and press ' + G + ' to help lay the capstone. More hands, less time.'];
    }
    switch (code) {
      case 2: return ['Lamp oil', 'Right-click it, or press ' + G + ' beside it, to take a jar. It slows you. ' + X + ' sets it down so you can fight.'];
      case 3: return ['A fallen founder', 'Right-click, or press ' + G + ' beside it, to lift the bier. ' + X + ' sets it down.'];
      case 4: return ['Dressed stone', 'Right-click, or press ' + G + ' beside it, to shoulder it. ' + X + ' sets it down.'];
      case 5: return ['Timber', 'Right-click, or press ' + G + ' beside it, to shoulder it. ' + X + ' sets it down.'];
      case 8: return ['The camp fire', 'Press ' + G + ' beside it to light a brand. A brand relights a post that has gone dark.'];
    }
    return null;
  }
  // ---- quest markers, kept quiet (2026-10-30): each active quest marks only its current step, one marker per quest. The step is the nearest
  // pick-up, or the place to bring it once you are carrying; the other quests' places are not painted. A marker is a small soft ring with a
  // little pin; its name and count appear only when a hero is near (~300 px), the cursor is near, or its row in the tracker is hovered.
  // Edge arrows point only at what the hero is carrying for, or at the quest whose tracker row is hovered. Layers add their quests' steps
  // through the `qfocus(out, hero)` hook (see client-quests.js).
  const HAUL_CODE = { beacon: 2, graves: 3, stonegate: 4, roof: 5 };
  function nearestOf(arr, x, y, ok) { let best = null, bd = 1e12; for (const a of arr) { if (ok && !ok(a)) continue; const d = (a[1] - x) * (a[1] - x) + (a[2] - y) * (a[2] - y); if (d < bd) { bd = d; best = a; } } return best; }
  function qFocus() {
    const out = S.qf || (S.qf = []); out.length = 0;
    if (!S.q || S.phase !== 'live') return out;
    const P = S.props || {}, my = me(), hx = my ? my.x : M.P.hearth[0], hy = my ? my.y : M.P.hearth[1], qo = P.qo || [], qd = P.qd || [];
    const add = (id, step, x, y, R, code, carry, title, tip, sub) => out.push({ id, step, x, y, R: R || 0, code: code || 0, carry: !!carry, title, tip, sub: sub || '' });
    for (const row of S.q) {
      if (row[1] !== 1) continue; const id = row[0], code = HAUL_CODE[id];
      if (code) {
        const dc = id === 'stonegate' && qd.some(d => d[0] === 6) ? 6 : code, carrying = !!my && my.carry === code && dc === code;
        const pk = carrying || dc !== code ? null : nearestOf(qo, hx, hy, o => o[0] === code);
        if (pk) { const t = markerTip(code, false); add(id, 'pick', pk[1], pk[2], 0, code, false, t[0], t[1], pk[3] > 1 ? pk[3] + ' left' : ''); }
        else { const d = qd.find(d => d[0] === dc); if (d) { const t = markerTip(dc, true); add(id, 'dest', d[1], d[2], d[3], dc, carrying, t[0], t[1], ''); } }
      } else if (id === 'cover') { const d = qd.find(d => d[0] === 7); if (d) { const t = markerTip(7, true); add(id, 'dest', d[1], d[2], d[3], 7, false, t[0], t[1], ''); } }
      else if (id === 'spring') add(id, 'site', M.P.spring[0], M.P.spring[1], 0, 0, false, 'The dig', 'Keep the dig clear and stand near it.', (+P.dg || 0) + '%');
      else if (id === 'fire') add(id, 'site', P.sm ? P.sm[0] : M.P.forge[0], P.sm ? P.sm[1] : M.P.forge[1], 0, 0, false, 'The Smith', 'Guard the Smith while the forge catches.', (+P.fp || 0) + '%');
      else if (id === 'gate') { const ct = nearestOf(P.ct || [], hx, hy, o => !o[5]); if (ct) add(id, 'site', ct[1], ct[2], 0, 0, false, 'A supply cart', 'Walk beside the carts as they climb the road.', ''); else { const g = FoundingArt.GATE; add(id, 'site', g.x, g.y, 0, 0, false, 'The gate', 'The carts are bound for the gate.', ''); } }
      else if (id === 'road') {
        const planted = Array.isArray(P.posts) ? P.posts : []; let best = null, bd = 1e12;
        FoundingArt.POST_SLOTS.forEach((s, i) => { if (planted.includes(i)) return; const d = (s[0] - hx) * (s[0] - hx) + (s[1] - hy) * (s[1] - hy); if (d < bd) { bd = d; best = s; } });
        if (best) add(id, 'site', best[0], best[1], 0, 0, false, 'A lantern post', 'Stand at the marked place to set a post.', planted.length + ' set');
      }
    }
    if (LAYERS.length) lay('qfocus', out, my);
    return out;
  }
  function drawFocusMark(c, f, full, hov) {
    const z = clamp(1 / S.cam.zoom, 0.85, 1.4), x = f.x, y = f.y, pick = f.step === 'pick';
    c.save();
    if (f.step === 'dest' && f.R > 0 && full) {   // the ring to bring it into: still, only drawn when near
      const my = me(), inside = !!my && Math.hypot(my.x - x, my.y - y) < f.R;
      c.setLineDash([10, 9]); ell(c, x, y, f.R, f.R * 0.9, 0, `rgba(240,214,140,${inside ? 0.09 : 0.03})`, `rgba(240,214,140,${inside ? 0.7 : 0.4})`, 1.6); c.setLineDash([]);
    }
    const rr = (pick ? 15 : 12) * z;
    ell(c, x, y + 4, rr * 1.3, rr * 0.6, 0, null, 'rgba(0,0,0,.4)', 3.2 * z);
    ell(c, x, y + 4, rr * 1.3, rr * 0.6, 0, 'rgba(240,214,140,.05)', `rgba(240,214,140,${hov ? 0.95 : full ? 0.75 : 0.55})`, 1.4 * z);
    const py = y - (pick ? 30 : 22) * z, s = (hov ? 5.6 : 4.6) * z;
    c.beginPath(); c.moveTo(x, py - s * 1.2); c.lineTo(x + s, py); c.lineTo(x, py + s * 1.2); c.lineTo(x - s, py); c.closePath();
    c.fillStyle = hov ? '#f6e3a8' : 'rgba(236,208,140,.92)'; c.fill(); c.strokeStyle = 'rgba(10,8,6,.85)'; c.lineWidth = 1.2; c.stroke();
    if (full) {
      c.textAlign = 'left'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,.85)'; c.lineWidth = 3.2; const fs = 11.5 * z;
      c.font = `bold ${fs}px system-ui`; c.strokeText(f.title, x + 11 * z, py + 4 * z); c.fillStyle = '#f3dfa4'; c.fillText(f.title, x + 11 * z, py + 4 * z);
      if (f.sub) { c.font = `${fs * 0.95}px system-ui`; c.strokeText(f.sub, x + 11 * z, py + 4 * z + fs * 1.15); c.fillStyle = '#d6ccb7'; c.fillText(f.sub, x + 11 * z, py + 4 * z + fs * 1.15); }
    }
    c.restore();
  }
  function drawQuestMarkers(c) {
    const P = S.props || {}, my = me(), t = S.T, m = S.mouse; let best = 1e9;
    S.tipTxt = null;
    const qd = P.qd, qo = P.qo, F = S.qf || [];
    // the things themselves, plain: the delivery places' own pieces (the Words' block, the capstone) when near, and the loose goods
    if (qd) for (let i = 0; i < qd.length; i++) {
      const d = qd[i], code = d[0], x = d[1], y = d[2], R = d[3];
      if (code !== 6 && code !== 7) continue;
      const hov = F.some(f => f.id === S.qhover && f.code === code);
      if (!hov && !(my && Math.hypot(my.x - x, my.y - y) < R + 360)) continue;
      const pr = code === 6 ? +P.carved || 0 : +P.capstone || 0;
      if (code === 6) { c.fillStyle = '#9a9488'; c.strokeStyle = OUT; c.lineWidth = 1.5; c.fillRect(x - 11, y - 12, 22, 24); c.strokeRect(x - 11, y - 12, 22, 24); c.strokeStyle = 'rgba(40,36,30,.7)'; c.lineWidth = 1.3; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - 7, y - 7 + k * 5.5); c.lineTo(x + 7 - (k === 3 ? 6 : 0), y - 7 + k * 5.5); c.stroke(); } }
      else { ell(c, x, y, 17, 13, 0, '#a39e90', OUT, 2); ell(c, x - 2, y - 2, 11, 7.5, 0, '#bcb6a6'); circ(c, x + 1, y, 3, '#4a463f'); }
      if (pr > 0 && pr < 1) {
        ell(c, x, y, R * 0.62, R * 0.56, 0, null, 'rgba(0,0,0,.5)', 6); c.strokeStyle = '#e6c98a'; c.lineWidth = 4.5; c.beginPath(); c.ellipse(x, y, R * 0.62, R * 0.56, 0, -PI / 2, -PI / 2 + TAU * clamp(pr, 0, 1)); c.stroke();
        c.fillStyle = '#f3dfa4'; c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.fillText(Math.round(pr * 100) + '%', x, y + R * 0.62 + 18);
      }
    }
    if (qo) for (let i = 0; i < qo.length; i++) {
      const q = qo[i], code = q[0], x = q[1], y = q[2];
      if (code === 8) {   // a camp fire to take a brand from: only while the Watch-Fires are the work, and close by
        const wf = S.q.find(r => r[0] === 'watchfires');
        if (!wf || wf[1] !== 1 || !my || (my.f & FLAG.BRAND) || Math.hypot(my.x - x, my.y - y) > 320) continue;
        c.save(); c.globalAlpha = 0.85; circ(c, x, y - 64, 11, 'rgba(20,16,10,.7)', '#8a6a34', 1.2); c.restore();
        c.save(); c.translate(x, y - 64); c.scale(0.7, 0.7); c.lineCap = 'round'; c.strokeStyle = '#7a5530'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 7); c.lineTo(0, -4); c.stroke(); flame(c, 0, -3, 4.6, t, 1); c.restore();
        const dd = Math.hypot(m.wx - x, m.wy - (y - 64)); if (dd < 16 && dd < best) { best = dd; S.tipTxt = markerTip(8, false); }
        continue;
      }
      drawItem(c, code, x, y - 4, 1.4, 0);
    }
    // the markers: one per active quest
    for (const f of F) {
      const dh = my ? Math.hypot(my.x - f.x, my.y - f.y) : 1e9, dm = Math.hypot(m.wx - f.x, m.wy - f.y), hov = S.qhover === f.id;
      const full = hov || dh < 300 || dm < 190;
      drawFocusMark(c, f, full, hov);
      const reach = f.step === 'dest' && f.R > 0 ? f.R : 30;
      if (f.tip && dm < reach && dm < best) { best = dm; S.tipTxt = [f.title, f.tip]; }
    }
    drawGivers(c);
  }
  // ---- quest-givers (2026-10-31): quests keep their own pace. A founder with work waiting wears a ! overhead; right-click them, or press
  // the use key beside them, to take it. The minimap shows the ! once the party has laid eyes on that spot.
  function waitingGivers() { const out = []; for (const w of (S.props && S.props.qw) || []) { const g = D.GIVER_AT[w[1]]; if (g && D.QUESTS[w[0]]) out.push({ id: w[0], key: w[1], x: g[0], y: g[1] }); } return out; }
  // a quest load or a pile of them under the cursor (props.qo rows [code, x, y, left]; not the camp fires, which a walk past should not light a brand at)
  function hoverQuestThing() { const m = S.mouse, qo = (S.props && S.props.qo) || []; let best = null, bd = 40; for (const o of qo) { if (o[0] === 8) continue; const d = Math.hypot(m.wx - o[1], m.wy - (o[2] - 12)); if (d < bd) { bd = d; best = o; } } return best; }
  // the use key over whatever it would act on, while your hero stands close to it (the host decides: sheet.ua [x, y]); a secret shows it too, but only up close
  function drawUse(c) {
    const ua = S.sheet && S.sheet.ua, m = me(); if (!ua || !m || (m.f & FLAG.DEAD)) { S.useK = null; return; }
    const k = ua[0] + ',' + ua[1]; if (S.useK !== k) { S.useK = k; S.useT0 = S.T; }
    const a = eo((S.T - S.useT0) / 0.25), z = clamp(1 / S.cam.zoom, 0.85, 1.4), lab = keyLbl('fdUse');
    c.save(); c.globalAlpha = a; c.translate(ua[0], ua[1] - 58 + Math.sin(S.T * 3) * 2.5 - 6 * (1 - a)); c.scale(z, z);
    c.font = 'bold 13px system-ui'; const w = Math.max(24, c.measureText(lab).width + 14), hh = 24;
    c.beginPath(); c.moveTo(-6, hh / 2 - 1); c.lineTo(0, hh / 2 + 6); c.lineTo(6, hh / 2 - 1); c.closePath(); c.fillStyle = '#c9a45c'; c.fill();
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.roundRect(-w / 2 + 1, -hh / 2 + 3, w, hh, 5); c.fill();
    c.fillStyle = '#1d1812'; c.strokeStyle = '#c9a45c'; c.lineWidth = 1.6; c.beginPath(); c.roundRect(-w / 2, -hh / 2, w, hh, 5); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,240,200,.14)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-w / 2 + 4, -hh / 2 + 2.5); c.lineTo(w / 2 - 4, -hh / 2 + 2.5); c.stroke();
    c.fillStyle = '#f0dca0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lab, 0, 1); c.textBaseline = 'alphabetic';
    c.restore();
  }
  function hoverGiver() { const m = S.mouse; let best = null, bd = 44; for (const g of waitingGivers()) { const d = Math.hypot(m.wx - g.x, m.wy - (g.y - 26)); if (d < bd) { bd = d; best = g; } } return best; }
  function drawGivers(c) {
    const W0 = waitingGivers(); if (!W0.length) return;
    const seen = S.gSeen || (S.gSeen = {}), hv = hoverGiver(), z = clamp(1 / S.cam.zoom, 0.85, 1.4);
    for (const g of W0) {
      if (visAt(g.x, g.y, 30)) seen[g.key] = true;
      const on = !!hv && hv.id === g.id, y = g.y - 56 * z + Math.sin(S.T * 3) * 2.5;
      c.save(); c.translate(g.x, y); c.scale(z, z);
      glowAt(c, 0, 2, 26, '255,214,120', on ? 0.5 : 0.32);
      c.font = 'bold 30px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(14,10,6,.92)'; c.lineWidth = 5; c.strokeText('!', 0, 0); c.fillStyle = on ? '#fff1b8' : '#f0c850'; c.fillText('!', 0, 0);
      c.restore();
      if (on) S.tipTxt = [D.QUESTS[g.id].giver, D.QUESTS[g.id].name + '. Right-click to hear them out, or press ' + keyLbl('fdUse') + ' beside them.'];
    }
  }
  function drawMiniGivers(g, kx, ky) {
    const seen = S.gSeen || {};
    for (const w of waitingGivers()) {
      if (!seen[w.key]) continue; const x = w.x * kx, y = w.y * ky, r = Math.max(5.5, g.canvas.width / 34);   // a filled badge, so it stands apart from the rings
      g.beginPath(); g.arc(x, y, r + 1.6, 0, TAU); g.fillStyle = 'rgba(0,0,0,.7)'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#f0c850'; g.fill();
      g.font = `bold ${Math.round(r * 1.6)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2b1a0a'; g.fillText('!', x, y + 0.5);
    }
  }
  function drawCounts(c) {
    for (const [id, ct] of S.counts) {
      const u = S.units.get('h' + id); if (!u) continue; const age = S.T - ct.t0, k = eo(Math.min(1, age * 5)), a = age > 1.7 ? clamp(1 - (age - 1.7) / 0.7, 0, 1) : 1;
      c.save(); c.globalAlpha = a; c.translate(u.x, u.y - 72 - age * 8); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
      circ(c, 0, 0, 20, 'rgba(20,16,10,.82)', '#e6c98a', 2); c.fillStyle = '#f3dfa4'; c.font = 'bold 24px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(ct.n), 0, 1);
      c.restore();
    }
  }
  // screen-space: the flash of a heavy beat, the cold of Wick Breath, and a marker's tooltip
  function drawScreenFx(ctx) {
    if (!S.flash && !S.cold && !S.tipTxt) return;
    const k = ctx.canvas.width / W(); ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
    if (S.flash) { const f = S.flash; ctx.fillStyle = `rgba(${f.c},${f.a * (typeof FX !== 'undefined' ? FX.flashK : 1) * (1 - f.t / f.dur)})`; ctx.fillRect(0, 0, W(), H()); }
    if (S.cold) {
      const cd = S.cold, p = (S.T - cd.t0) / cd.dur, a = p < 1 ? 0.32 * p * p : 0.5 * Math.max(0, 1 - (p - 1) * cd.dur / 1.2);
      if (a > 0.01) { const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * 0.3, W() / 2, H() / 2, H() * 0.85); g.addColorStop(0, 'rgba(150,200,255,0)'); g.addColorStop(1, `rgba(170,215,255,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H()); }
    }
    if (S.tipTxt && S.mouse.in !== false) {
      const [ti, bo] = S.tipTxt, mx = S.mouse.sx, my2 = S.mouse.sy, maxW = 236; ctx.font = '12px system-ui';
      const words = bo.split(' '), lines = []; let cur = '';
      for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (ctx.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; }
      lines.push(cur);
      const w = maxW + 20, h = 30 + lines.length * 16; let x = mx + 16, y = my2 + 20; if (x + w > W() - 8) x = mx - w - 12; if (y + h > H() - 8) y = my2 - h - 14;
      ctx.fillStyle = 'rgba(21,18,15,.96)'; ctx.strokeStyle = '#6b5634'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = '#e6c98a'; ctx.font = 'bold 12.5px system-ui'; ctx.fillText(ti, x + 10, y + 18);
      ctx.fillStyle = '#d6ccb7'; ctx.font = '12px system-ui'; lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 36 + i * 16));
    }
    ctx.restore();
  }
  function addLight(x, y, r, k, cool) { const o = S.lights[S.nl] || (S.lights[S.nl] = { x: 0, y: 0, r: 0, k: 0, cool: false }); o.x = x; o.y = y; o.r = r; o.k = k; o.cool = !!cool; S.nl++; }

  const EART = {
    ashling: { sz: 56, draw: drawAshling, arms: [5.2, '#6a4631'] }, streak: { sz: 60, draw: drawStreak }, slagback: { sz: 76, draw: drawSlag },
    spitter: { sz: 60, draw: drawSpitter }, brute: { sz: 100, draw: drawBrute, arms: [8, '#4a3636'] }, tunnelmaw: { sz: 190, draw: drawMaw },
    stalker: { sz: 56, draw: drawStalker }, cartburner: { sz: 56, draw: drawCartburner }, husk: { sz: 80, draw: drawHusk, arms: [6.5, '#5a5650'] }, whelp: { sz: 36, draw: drawWhelp }, wickshade: { sz: 56, draw: drawShade },
  };
  const SPR = {};
  function sprOf(eid, wh) {
    const k = eid + (wh ? 'W' : ''); if (SPR[k]) return SPR[k];
    const A = EART[eid] || EART.ashling, c = document.createElement('canvas'); c.width = c.height = A.sz * 2; const g = c.getContext('2d'); g.scale(2, 2); g.translate(A.sz / 2, A.sz / 2); A.draw(g, wh);
    return (SPR[k] = c);
  }

  function drawMound(c, u) {
    const r = u.def.r, t = S.T;
    // the trail of loosened earth it leaves
    for (let i = 0; i < u.trail.length; i++) { const p = u.trail[i], k = i / u.trail.length; ell(c, p.x, p.y, r * 0.5 * k, r * 0.3 * k, 0, `rgba(70,54,38,${0.5 * k})`); }
    ell(c, u.x + 3, u.y + 5, r * 1.15, r * 0.62, 0, 'rgba(0,0,0,.3)');
    for (let i = 0; i < 3; i++) { const k = ((t * 0.9 + i / 3) % 1); ell(c, u.x, u.y + 4, r * (0.8 + k * 1.1), r * (0.45 + k * 0.6), 0, null, `rgba(190,160,110,${0.5 * (1 - k)})`, 2); }
    ell(c, u.x, u.y + 2, r * 1.0, r * 0.56, 0, '#4b3b2a', '#20170e', 2);
    ell(c, u.x - 3, u.y - 2, r * 0.7, r * 0.38, 0, '#6a5438');
    c.strokeStyle = 'rgba(25,16,8,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(u.x - r * 0.6, u.y + 2); c.lineTo(u.x - r * 0.2, u.y - 3); c.lineTo(u.x + r * 0.1, u.y + 4); c.lineTo(u.x + r * 0.6, u.y - 1); c.stroke();
    glowAt(c, u.x, u.y, r * 1.1, '255,120,40', 0.12 + 0.05 * Math.sin(t * 5));
  }

  function drawEnemy(c, u) {
    const def = u.def, t = S.T, F = u.f, r = def.r, A = EART[u.eid] || EART.ashling;
    if (F & FLAG.UNDER) { drawMound(c, u); return; }
    if (u.vis < 0.04) { if ((F & FLAG.WIND) && u.fogT !== 0) drawHiddenStrike(c, u); return; }
    if (LAYERS.length && lay('drawEnemy', c, u)) { drawStatuses(c, u); return; }   // a feature layer draws its own kinds
    if (BOSSDRAW[u.eid]) { BOSSDRAW[u.eid](c, u); drawStatuses(c, u); return; }
    if (u.eid === 'damlog') { drawDamLog(c, u); drawStatuses(c, u); return; }
    const wind = !!(F & FLAG.WIND), atkP = wind ? clamp((t - (u.windT0 || t)) / Math.max(0.2, def.atk.wind), 0, 1) : 0;
    let alpha = u.vis, sink = 0, pop = 1;
    if (u.diveT0 && t - u.diveT0 < 1) { sink = clamp((t - u.diveT0) / 0.9, 0, 1); alpha = 1 - 0.5 * sink; }
    if (u.riseT0 && t - u.riseT0 < 0.6) { const k = (t - u.riseT0) / 0.6; pop = 0.75 + 0.25 * eb(k); }
    ell(c, u.x + 2, u.y + r * 0.7, r * 1.05, r * 0.6, 0, `rgba(0,0,0,${0.32 * alpha})`);
    c.save(); c.translate(u.x, u.y + sink * r * 0.5); c.rotate(u.face + Math.sin(u.wp * 1.2 + u.ph) * 0.08 * (wind ? 0 : 1));
    const lean = -4 * eo(Math.min(1, atkP * 1.3)) * (def.elite ? 1.4 : 1) + u.lunge * (def.elite ? 10 : 8);
    c.translate(lean, 0); c.scale((1 + 0.22 * u.sq) * pop, (1 - 0.2 * u.sq) * pop * (1 - 0.35 * sink));
    const bs = 1 + Math.sin(u.wp * 2 + u.ph) * 0.035 + (wind ? 0.08 * eo(atkP) : 0); c.scale(bs, 1 / bs);
    if (alpha < 1) c.globalAlpha = alpha;
    if (A.arms) {
      const armX = r * 0.75 + (wind ? -6 * eo(atkP) * (def.elite ? 1.6 : 1) : 0) + u.lunge * 7, armY = r * 0.8 + (wind ? 3 * eo(atkP) : 0);
      circ(c, armX, -armY, A.arms[0], A.arms[1], OUT, 1.3); circ(c, armX, armY, A.arms[0], A.arms[1], OUT, 1.3);
    }
    const sz = A.sz; c.drawImage(sprOf(u.eid, false), -sz / 2, -sz / 2, sz, sz);
    if (u.tier > 0) tierLook(c, u, sz, alpha);
    if (u.flash > 0) { c.globalAlpha = u.flash / 0.12 * 0.9; c.drawImage(sprOf(u.eid, true), -sz / 2, -sz / 2, sz, sz); c.globalAlpha = 1; }
    if (wind) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = eo(atkP) * 0.5; c.drawImage(sprOf(u.eid, true), -sz / 2, -sz / 2, sz, sz); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    c.restore();
    if (u.eid === 'cartburner') glowAt(c, u.x + Math.cos(u.face) * 17 - Math.sin(u.face) * 8, u.y + Math.sin(u.face) * 17 + Math.cos(u.face) * 8, 26 + 4 * Math.sin(t * 13 + u.ph), '255,150,60', 0.4 * alpha);
    if (u.vis > 0.5) drawStatuses(c, u);
  }
  // a hidden thing that is striking: only a faint shimmer in the air, never a body
  function drawHiddenStrike(c, u) { const k = clamp((S.T - (u.windT0 || S.T)) / 0.5, 0, 1), r = u.def.r; ell(c, u.x, u.y, r * (1.2 + 0.5 * k), r * (1 + 0.4 * k), 0, `rgba(190,200,255,${0.04 + 0.08 * k})`, `rgba(200,210,255,${0.1 + 0.2 * k})`, 1.4); }
  function drawStatuses(c, u) {
    const def = u.def, t = S.T, F = u.f, r = def.r;
    if (def.elite && !def.boss) ell(c, u.x, u.y + 2, r + 5, (r + 5) * 0.8, 0, null, 'rgba(255,120,60,.35)', 2);
    // statuses
    if (F & FLAG.SLOW) ell(c, u.x, u.y + r * 0.5, r + 5, r * 0.55, 0, null, 'rgba(120,190,255,.8)', 2);
    if (F & FLAG.ROOT) { c.strokeStyle = 'rgba(120,90,50,.9)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; c.beginPath(); c.moveTo(u.x + Math.cos(a) * r * 0.6, u.y + r * 0.5 + Math.sin(a) * r * 0.3); c.lineTo(u.x + Math.cos(a) * (r + 6), u.y + r * 0.5 + Math.sin(a) * (r * 0.5 + 3)); c.stroke(); } }
    if (F & FLAG.TAUNT) { c.fillStyle = '#ffe08a'; c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.fillText('!', u.x, u.y - r - 12 + Math.sin(t * 10) * 1.5); }
    if (F & FLAG.MARK) {
      const k = eb((t - (u.markT0 || (u.markT0 = t))) * 3); c.save(); c.translate(u.x, u.y - r - 14 - Math.sin(t * 5) * 1.5); c.scale(k, k); c.fillStyle = '#ffcf6a'; c.strokeStyle = '#000'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-6, -4); c.lineTo(0, 3); c.lineTo(6, -4); c.lineTo(0, 8); c.closePath(); c.fill(); c.stroke(); c.restore(); Fx.markReticle(c, u, t);
    } else u.markT0 = 0;
    if (F & FLAG.VULN) ell(c, u.x, u.y, r + 4, (r + 4) * 0.9, 0, null, `rgba(255,70,60,${0.5 + 0.3 * Math.sin(t * 8)})`, 2);
    if (F & FLAG.BURN) { for (let i = 0; i < 2; i++) flame(c, u.x + Math.sin(t * 7 + i * 3) * r * 0.5, u.y - r * 0.2 + i * 3, 5 + r * 0.12, t + i, 0.9); }
    if (F & FLAG.BLIND) { c.fillStyle = '#d8d0b8'; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('z', u.x + 6, u.y - r - 8 - Math.sin(t * 3) * 2); }
    if (F & FLAG.STUN) for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * TAU / 3, sx = u.x + Math.cos(a) * (r * 0.8), sy = u.y - r - 8 + Math.sin(a) * 4;
      c.save(); c.translate(sx, sy); c.rotate(a); c.fillStyle = '#ffe08a'; c.beginPath(); for (let k = 0; k < 5; k++) { const aa = k * TAU / 5 - PI / 2; c.lineTo(Math.cos(aa) * 3.6, Math.sin(aa) * 3.6); c.lineTo(Math.cos(aa + PI / 5) * 1.5, Math.sin(aa + PI / 5) * 1.5); } c.fill(); c.restore();
    }
  }

  function drawCorpse(c, k) {
    const A = EART[k.eid] || EART.ashling, sz = A.sz, col = clamp(k.t / 0.35, 0, 1), fade = k.t > k.life - 0.7 ? clamp((k.life - k.t) / 0.7, 0, 1) : 1;
    const sp = Math.hypot(k.vx, k.vy), air = k.flung ? clamp(sp / 500, 0, 1) : 0;
    ell(c, k.x + 3, k.y + 4, k.r * (1.1 - 0.2 * air), k.r * 0.55, 0, `rgba(0,0,0,${0.3 * fade})`);
    c.save(); c.translate(k.x, k.y - air * 12); c.rotate(k.rot); const cs = eo(col); c.scale(1 + 0.18 * cs + (air ? Math.sin(k.t * 30) * 0.08 : 0), 1 - 0.52 * cs); c.globalAlpha = fade * (1 - 0.28 * cs);
    c.drawImage(sprOf(k.eid, false), -sz / 2, -sz / 2, sz, sz); c.globalAlpha = fade * 0.45 * cs; c.fillStyle = '#120a06'; c.beginPath(); c.ellipse(0, 0, k.r * 1.1, k.r, 0, 0, TAU); c.fill(); c.restore();
  }

  // ================================================================ heroes
  function drawHeroUnit(c, u) {
    const F = u.f, cls = u.cls, t = S.T, col = roleColor(u.hero);
    const dead = !!(F & FLAG.DEAD), rising = !dead && u.riseT0 && t - u.riseT0 < 0.9;
    let face = u.fo && t < u.fo.until ? u.fo.a : u.face;
    if (dead || rising) {
      if (!u.downImg) u.downImg = heroDownSprite(c, cls, face, {});
      const k = dead ? eo((t - (u.deadT0 || t)) / 0.5) : 1 - eb((t - u.riseT0) / 0.9);
      drawHeroDown(c, cls, u.x, u.y, face, HS, k, u.downImg, col);
      if (rising) glowAt(c, u.x, u.y, 44 * (1 - (t - u.riseT0) / 0.9 * 0.3), '255,240,190', 0.8 * (1 - (t - u.riseT0) / 0.9));
      return;
    }
    u.downImg = null;
    if (u.glow > 0) glowAt(c, u.x, u.y, 38 + 22 * (1 - u.glow), '255,230,160', u.glow * 0.9);
    if (F & FLAG.INVULN) glowAt(c, u.x, u.y, 40, '255,255,255', 0.35 + 0.15 * Math.sin(t * 12));
    if (F & FLAG.HASTE) { c.strokeStyle = 'rgba(190,240,255,.55)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = u.face + PI + (i - 1) * 0.5; c.beginPath(); c.moveTo(u.x + Math.cos(a) * 16, u.y + Math.sin(a) * 14); c.lineTo(u.x + Math.cos(a) * 28, u.y + Math.sin(a) * 24); c.stroke(); } }
    drawHero(c, cls, u.x, u.y, face, u.an, HS, { ringColor: col });
    const braced = (F & FLAG.WIND) && u.hero === 'bastion' || (u.braceVis && t < u.braceVis);
    if (braced) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,235,170,.8)'; c.lineWidth = 2.5; c.beginPath(); c.arc(u.x, u.y, 30, face - 1, face + 1); c.stroke(); c.restore(); }
    if (u.gleam > 0) glowAt(c, u.x + Math.cos(face) * 20, u.y + Math.sin(face) * 20, 26 * u.gleam + 10, '255,240,190', u.gleam * 0.7);
    if (u.hero === 'cleric') { const n = (F >> 10) & 3; for (let i = 0; i < n; i++) { const a = t * 1.6 + i * TAU / 3, px = u.x + Math.cos(a) * 27, py = u.y + Math.sin(a) * 20 - 4; ell(c, px, py, 3.8, 2.2, a, '#ffd9b0', OUT, 0.8); } }
    if (u.hero === 'pyromancer') {
      if (u.key === 'h' + S.myId && S.sheet && S.sheet.ps) for (let i = 0; i < S.sheet.ps[0] && i < 2; i++) { const a = t * 3 + i * PI; glowAt(c, u.x + Math.cos(a) * 27, u.y + Math.sin(a) * 19 - 8, 8, '255,140,40', 0.9); circ(c, u.x + Math.cos(a) * 27, u.y + Math.sin(a) * 19 - 8, 2.4, '#ffcf5a'); }
      if (F & FLAG.HOT) glowAt(c, u.x, u.y, 36, '255,120,30', 0.4 + 0.2 * Math.sin(t * 9));
    }
    if (F & FLAG.SHIELD) { c.strokeStyle = 'rgba(200,225,255,.7)'; c.lineWidth = 2; ell(c, u.x, u.y - 2, 22, 20, 0, 'rgba(180,210,255,.10)', 'rgba(200,225,255,.7)', 2); }
    if (F & FLAG.SLOW) ell(c, u.x, u.y + 8, 20, 11, 0, null, 'rgba(120,190,255,.8)', 2);
    if (F & FLAG.ROOT) ell(c, u.x, u.y + 8, 20, 11, 0, null, 'rgba(150,110,60,.9)', 2.5);
    if (u.carry) drawItem(c, u.carry, u.x + Math.cos(face) * 13, u.y + Math.sin(face) * 9 - 7 - Math.abs(Math.sin(u.wp * 0.35)) * 1.5 * u.mv, 1, (u.carry === 3 || u.carry === 5) ? Math.sin(face) * 0.5 : 0);
    if (F & FLAG.BRAND) drawBrand(c, u);
    if (F & FLAG.STUN) for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; circ(c, u.x + Math.cos(a) * 12, u.y - 28 + Math.sin(a) * 3, 2.4, '#ffe08a'); }
  }

  // ================================================================ zones
  const zleft = z => Math.max(0, z.tLeft - (S.T - z.at));
  function drawZoneGround(c, z) {
    if (S.T < z.seen) return;
    const t = S.T, left = zleft(z), age = t - z.seen;
    switch (z.kind) {
      case ZONE.SANCT: Fx.zone.sanct(c, z); break;
      case ZONE.BANNER: {
        const R = z.a, f = left < 0.5 ? left / 0.5 : 1, e = eo(Math.min(1, age / 0.4));
        c.save(); c.globalAlpha = f; ell(c, z.x, z.y, R * e, R * 0.9 * e, 0, 'rgba(255,220,120,.08)', 'rgba(255,220,120,.7)', 2);
        c.save(); c.translate(z.x, z.y); c.rotate(t * 0.4); c.strokeStyle = 'rgba(255,220,120,.35)'; c.lineWidth = 1.5; for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(R * 0.78, 0); c.lineTo(R * 0.95, 0); c.stroke(); } c.restore(); c.restore(); Fx.zone.bannerGround(c, z, f, e); break;
      }
      case ZONE.BURN: case ZONE.CRATER: {
        const R = z.a, f = left < 0.8 ? left / 0.8 : 1, crater = R > 60;
        if (crater) Fx.zone.craterZone(c, z, f); else Fx.zone.burnBase(c, z, f);
        const n = crater ? 7 : clamp(Math.round(R / 14), 2, 6);
        for (let i = 0; i < n; i++) { const a = i * 2.4 + z.id, d = Math.sqrt((i + 0.5) / n) * R * 0.8; flame(c, z.x + Math.cos(a) * d, z.y + Math.sin(a) * d * 0.85, 9, t + i, f); }
        break;
      }
      case ZONE.FUSE: Fx.zone.fuse(c, z); break;
      case ZONE.METEOR: Fx.zone.meteorGround(c, z); break;
      case ZONE.TRAP: {
        const armed = z.b > 0, pop = eb(Math.min(1, age / 0.8));
        c.save(); c.translate(z.x, z.y); ell(c, 1, 3, 9, 5, 0, 'rgba(0,0,0,.4)');
        circ(c, 0, 0, 7, '#4e4538', OUT, 1.5); c.fillStyle = '#9a8a66';
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + (armed ? 0 : t * 4); c.save(); c.rotate(a); c.beginPath(); c.moveTo(4, -1.5); c.lineTo(4 + 6 * pop, 0); c.lineTo(4, 1.5); c.fill(); c.restore(); }
        if (armed) { const bl = 0.5 + 0.5 * Math.sin(t * 7); circ(c, 0, 0, 2.4, '#ff6a3a'); glowAt(c, 0, 0, 10 + bl * 5, '255,100,50', 0.7 * bl + 0.2); ell(c, 0, 0, z.a, z.a * 0.9, 0, null, 'rgba(255,200,90,.12)', 1); } else circ(c, 0, 0, 2.4, '#9a8a66');
        c.restore(); break;
      }
      case ZONE.TRAIL: {
        const x2 = z.a, y2 = z.b, f = left < 0.6 ? left / 0.6 : 1, n = Math.max(2, Math.floor(Math.hypot(x2 - z.x, y2 - z.y) / 16));
        Fx.zone.trailBase(c, z, f);
        for (let i = 0; i <= n; i++) { const k = i / n; flame(c, lerp(z.x, x2, k), lerp(z.y, y2, k), 10, t + i * 0.7, f); }
        break;
      }
      case ZONE.FLOOD: {
        const R = z.vr === undefined ? z.a : z.vr, lv = z.b | 0, k = Math.min(1, age / 0.6);
        glowAt(c, z.x, z.y, R * 1.12, '56,128,166', (0.3 + 0.07 * lv) * k, false);
        ell(c, z.x, z.y, R, R * 0.9, 0, `rgba(48,118,156,${(0.16 + 0.05 * lv) * k})`, `rgba(150,215,235,${0.5 * k})`, 3);
        for (let i = 0; i < 3; i++) { const q = (t * 0.28 + i / 3) % 1; ell(c, z.x, z.y, R * (0.35 + q * 0.65), R * 0.9 * (0.35 + q * 0.65), 0, null, `rgba(200,238,245,${0.3 * (1 - q) * k})`, 1.6); }
        c.strokeStyle = 'rgba(210,240,246,.35)'; c.lineWidth = 1.4; c.lineCap = 'round';
        for (let i = 0; i < 16; i++) { const a = i * 2.399 + z.id, d = Math.sqrt((i + 0.5) / 16) * R * 0.88, wx = z.x + Math.cos(a) * d, wy = z.y + Math.sin(a) * d * 0.9 + Math.sin(t * 1.4 + i) * 2; c.beginPath(); c.moveTo(wx - 7, wy); c.quadraticCurveTo(wx, wy - 2.5, wx + 7, wy); c.stroke(); }
        break;
      }
      case ZONE.VOLLEY: Fx.zone.volleyZone(c, z); break;
    }
  }
  // pieces that stand up and are sorted with the units
  function drawWall(c, z) {
    if (S.T < z.seen) return;
    const age = S.T - z.seen, k = eb(age / 0.45), left = zleft(z), f = left < 0.6 ? left / 0.6 : 1, h = 24 * k, len = z.a, ang = z.b;
    const ux = Math.cos(ang), uy = Math.sin(ang), x1 = z.x - ux * len / 2, y1 = z.y - uy * len / 2, n = 9, bw = len / n;
    c.save(); c.globalAlpha = f; c.lineCap = 'round'; c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 12; c.beginPath(); c.moveTo(x1, y1 + 8); c.lineTo(z.x + ux * len / 2, z.y + uy * len / 2 + 8); c.stroke();
    const sh = (z.c < 100 ? (Math.random() - 0.5) * 1.5 : 0);
    for (let i = 0; i < n; i++) {
      const ax = x1 + ux * bw * i + sh, ay = y1 + uy * bw * i, bx = ax + ux * (bw - 1.5), by = ay + uy * (bw - 1.5);
      c.fillStyle = i % 2 ? '#5f7aa6' : '#6d87b3'; c.strokeStyle = OUT; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx, by - h); c.lineTo(ax, ay - h); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#c9a45c'; c.beginPath(); c.moveTo(ax, ay - h); c.lineTo(bx, by - h); c.lineTo(bx, by - h + 3.5); c.lineTo(ax, ay - h + 3.5); c.closePath(); c.fill();
    }
    glowAt(c, z.x, z.y - 8, len * 0.55, '255,225,140', 0.14 * k);
    Fx.zone.wallStand(c, z, k, 1, h, x1, y1, ux, uy);
    c.fillStyle = '#000a'; c.fillRect(z.x - 26, z.y + 12, 52, 4); c.fillStyle = '#8fb0e8'; c.fillRect(z.x - 25, z.y + 13, 50 * clamp(z.c / 100, 0, 1), 2); c.restore();
  }
  function drawBannerPole(c, z) {
    if (S.T < z.seen) return;
    const age = S.T - z.seen, k = eb(Math.min(1, age / 0.35)), f = zleft(z) < 0.5 ? zleft(z) / 0.5 : 1;
    c.save(); c.globalAlpha = f; c.translate(z.x, z.y); ell(c, 2, 3, 8, 4, 0, 'rgba(0,0,0,.4)'); const ph = -34 * k;
    c.strokeStyle = '#6b4e2c'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, ph - 14); c.stroke();
    const wv = Math.sin(S.T * 5) * 3; c.fillStyle = '#3f5f93'; c.strokeStyle = '#c9a45c'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(0, ph - 14); c.quadraticCurveTo(12, ph - 18 + wv, 24 + wv, ph - 12); c.lineTo(20 + wv, ph - 4); c.quadraticCurveTo(10, ph - 8 + wv, 0, ph - 2); c.closePath(); c.fill(); c.stroke();
    circ(c, 0, ph - 15, 2.6, '#e6c98a'); c.restore(); Fx.zone.banPole(c, z, ph, f);
  }
  function drawMeteorBody(c, z) { if (S.T < z.seen) return; Fx.zone.meteorBody(c, z); }
  function drawVolleyArrows(c) { Fx.zone.volleyArrows(c, S.volley); }

  function drawProj(c, p) {
    if (p.homing) { if (p.hero === 'ranger') Fx.arrow(c, p); else if (p.hero === 'cleric') Fx.holyBolt(c, p); else Fx.emberBolt(c, p); return; }
    Fx.fireball(c, p);
  }
  function drawPart(c, p) {
    const k = p.t / p.dur, a = 1 - ei(k); c.save(); c.globalAlpha = clamp(a, 0, 1);
    switch (p.kind) {
      case 'spark': c.strokeStyle = p.color; c.lineWidth = p.size * 0.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); c.stroke(); break;
      case 'dust': { const r = p.size * (1 + k * 2.4); c.fillStyle = p.color; c.globalAlpha = a * 0.4; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); break; }
      case 'chunk': c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size * 0.8); break;
      case 'petal': c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.beginPath(); c.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU); c.fill(); break;
      default: c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, TAU); c.fill();
    }
    c.restore();
  }

  // ================================================================ skills (the player's side of them)
  const SLOTK = ['q', 'w', 'e', 'r'];
  function myStat(k) { let s = 0; const sh = S.sheet; if (sh) for (const it of sh.it) if (it) s += (D.ITEM[it[1]].stats[k] || 0); return s; }
  const hasUp = id => !!(S.sheet && S.sheet.up.indexOf(id) >= 0);
  function skillOf(slot) { return D.KITS[S.sheet.hero].skills[slot]; }
  function rankOfSlot(slot) { return Math.max(1, S.sheet.rk[SLOTK.indexOf(slot)]); }
  function rangeOf(slot) {
    const sk = skillOf(slot), hero = S.sheet.hero; let r = Array.isArray(sk.range) ? rk(sk.range, rankOfSlot(slot)) : (sk.range || 0);
    if (hero === 'bastion' && slot === 'q') r = hasUp('shieldcharge') ? 260 : 42;
    if (hero === 'pyromancer' && slot === 'e' && hasUp('longstride')) r *= 2;
    return r * (1 + myStat('range'));
  }
  function radOf(slot) {
    const sk = skillOf(slot); let r = sk.rad ? rk(sk.rad, rankOfSlot(slot)) : 0; r *= 1 + myStat('area');
    if (S.sheet.hero === 'pyromancer' && slot === 'w' && hasUp('wildfire')) r *= 1.35;
    return r;
  }
  const cdLeft = i => { const sh = S.sheet; return sh ? Math.max(0, sh.cd[i] - (S.T - S.sheetT)) : 0; };
  const charges = i => { const sh = S.sheet; if (!sh) return 0; let c = sh.ch[i]; if (c < sh.cx[i] && sh.cd[i] > 0 && cdLeft(i) <= 0) c = Math.min(sh.cx[i], c + 1); return c; };

  function hoverEnemy() {
    let best = null, bd = 1e9; const m = S.mouse;
    for (const u of S.units.values()) { if (u.kind !== 'e' || u.fogT === 0 || (u.f & (FLAG.UNDER | FLAG.HIDDEN))) continue; const d = Math.hypot(u.x - m.wx, u.y - m.wy), pad = u.def.r < 16 ? 12 : 8; if (d < u.def.r + pad && d < bd) { bd = d; best = u; } }
    return best;
  }
  function hoverHero() {
    let best = null, bd = 1e9; const m = S.mouse;
    for (const u of S.units.values()) { if (u.kind !== 'h') continue; const d = Math.hypot(u.x - m.wx, u.y - m.wy); if (d < 26 && d < bd) { bd = d; best = u; } }
    return best;
  }
  function nearestEnemy(range) {
    const m = me(); if (!m) return null; let best = null, bd = range;
    for (const u of S.units.values()) { if (u.kind !== 'e' || u.fogT === 0 || (u.f & (FLAG.UNDER | FLAG.HIDDEN))) continue; const d = Math.hypot(u.x - m.x, u.y - m.y) - u.def.r; if (d < bd) { bd = d; best = u; } }
    return best;
  }
  function pressSkill(slot) {
    const sh = S.sheet, m = me(); if (!sh || !m || S.phase !== 'live' || (m.f & FLAG.DEAD)) return;
    const i = SLOTK.indexOf(slot), sk = skillOf(slot);
    if (sh.rk[i] < 1) { say(slot === 'r' && sh.lv < D.LEVELS.rLevel ? sk.name + ' opens at level ' + D.LEVELS.rLevel : canLearn(slot) ? 'Spend a skill point first: Shift+' + keyLabel(slot) : 'No skill point to spend yet'); return; }
    if (S.aim && S.aim.slot === slot) { castAt(slot, S.mouse.wx, S.mouse.wy); S.aim = null; return; }
    if (charges(i) < 1) { say(sk.name + ' is on cooldown'); return; }
    S.aim = null;
    if (sk.type === 'self') { send({ k: 'cast', s: slot, x: Math.round(S.mouse.wx), y: Math.round(S.mouse.wy) }); return; }
    if (sk.type === 'unit') {
      if (sk.tgt === 'enemy') {
        let t = hoverEnemy(); if (!t && S.tgt != null) t = S.units.get('e' + S.tgt); if (!t) t = nearestEnemy(rangeOf(slot) + 60);
        if (!t) { say('No target. Tab or click an enemy'); return; }
        S.tgt = t.id; send({ k: 'cast', s: slot, id: t.id });
      } else {
        let t = hoverHero(); if (!t && S.tgtAlly != null) t = S.units.get('h' + S.tgtAlly); if (!t || (t.f & FLAG.DEAD)) t = m;
        send({ k: 'cast', s: slot, id: t.id });
      }
      return;
    }
    S.aim = { slot };
  }
  function castAt(slot, x, y) {
    const i = SLOTK.indexOf(slot); if (!S.sheet || charges(i) < 1) { if (S.sheet) say(skillOf(slot).name + ' is on cooldown'); return; }
    send({ k: 'cast', s: slot, x: Math.round(x), y: Math.round(y) });
    const m = me(); if (m) { m.fo = { a: Math.atan2(y - m.y, x - m.x), until: S.T + 0.5 }; }
    S.marker = { x, y, t: 0, c: '255,230,160' };
  }
  // a point goes where a rank is open: the skill is below its top rank, the hero is at the level that rank opens at, and there is a point to spend
  const rankIdx = slot => (slot === 'p' ? 4 : SLOTK.indexOf(slot));
  function canLearn(slot) {
    const sh = S.sheet; if (!sh || sh.pts < 1) return false;
    const sk = D.KITS[sh.hero].skills[slot], r = sh.rk[rankIdx(slot)] | 0;
    return !!sk && r < sk.maxRank && sh.lv >= D.LEVELS.gate(slot, r + 1);
  }
  function keyLabel(slot) { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null, id = { q: 's0', w: 's1', e: 's2', r: 's3', p: 'fdPassive' }[slot]; return KB && id ? KB.label(KB.keyFor(id)) || slot.toUpperCase() : slot.toUpperCase(); }
  function learn(slot) {
    if (!S.sheet) return; if (canLearn(slot)) { send({ k: 'learn', s: slot }); return; }
    const sh = S.sheet, sk = D.KITS[sh.hero].skills[slot], r = sh.rk[rankIdx(slot)] | 0;
    if (r >= sk.maxRank) say(sk.name + ' is at its highest rank'); else if (sh.lv < D.LEVELS.gate(slot, r + 1)) say(sk.name + ', rank ' + (r + 1) + ', opens at level ' + D.LEVELS.gate(slot, r + 1)); else say('No skill points to spend');
  }
  function cycleTarget(dir) {
    const m = me(); if (!m) return; const list = [];
    for (const u of S.units.values()) if (u.kind === 'e' && u.fogT !== 0 && !(u.f & (FLAG.UNDER | FLAG.HIDDEN))) { const d = Math.hypot(u.x - m.x, u.y - m.y); if (d < 700) list.push([d, u]); }
    list.sort((a, b) => a[0] - b[0]); if (!list.length) { S.tgt = null; say('No enemies near'); return; }
    const i = list.findIndex(x => x[1].id === S.tgt); S.tgt = list[i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length][1].id;
  }
  const nearPoint = (P, r) => { const m = me(); return !!m && Math.hypot(m.x - P[0], m.y - P[1]) <= r; };
  function tryShop() {
    if (nearPoint(M.P.shop, 250)) FoundingUI.openTent(); else { const m = me(); if (m) { send({ k: 'move', x: Math.round(M.P.shop[0] - 30), y: Math.round(M.P.shop[1] - 90) }); S.openOnArrive = 'tent'; say('Walking to the supply tent'); } }
  }
  function tryForge() {
    if ((S.props.fg | 0) !== 2) { say('The forge is cold'); return; }
    if (nearPoint(M.P.forge, 230)) FoundingUI.openForge(); else { send({ k: 'move', x: Math.round(M.P.forge[0] - 90), y: Math.round(M.P.forge[1] + 40) }); S.openOnArrive = 'forge'; say('Walking to the forge'); }
  }

  // ================================================================ telegraphs, aim previews, labels (drawn last, over the dark)
  function drawTele(c, t) {
    const age = S.T - t.t0, k = clamp(age / t.warn, 0, 1), lock = age >= t.warn || t.res, blue = !!t.col;
    const fill = blue ? '70,140,255' : '214,50,40', edge = blue ? '120,175,255' : '255,80,60', core = blue ? '60,120,235' : '235,60,45';
    let fade = 1; if (t.res) fade = clamp(1 - (S.T - t.res) / 0.25, 0, 1); else if (age > t.warn + 0.2) fade = clamp(1 - (age - t.warn - 0.2) / 0.3, 0, 1);
    c.save(); c.globalAlpha = fade;
    if (t.shape === 2) {
      c.translate(t.x, t.y); c.rotate(t.a); const reach = t.b, half = t.w;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, reach, -half, half); c.closePath(); c.fillStyle = `rgba(${fill},${0.10 + 0.22 * k})`; c.fill(); c.strokeStyle = `rgba(${edge},${0.55 + 0.4 * k})`; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, reach * eo(k), -half, half); c.closePath(); c.fillStyle = `rgba(${core},${0.18 + 0.25 * k})`; c.fill();
      if (lock) { c.strokeStyle = 'rgba(255,230,200,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, reach, -half, half); c.stroke(); }
    } else if (t.shape === 1) {
      const hw = t.w || 20, len = t.b;
      c.translate(t.x, t.y); c.rotate(t.a); c.fillStyle = `rgba(${fill},${0.10 + 0.22 * k})`; c.fillRect(0, -hw, len, hw * 2);
      c.fillStyle = `rgba(${core},${0.18 + 0.25 * k})`; c.fillRect(0, -hw, len * eo(k), hw * 2);
      c.strokeStyle = `rgba(${edge},${0.55 + 0.4 * k})`; c.lineWidth = 2; c.strokeRect(0, -hw, len, hw * 2);
      if (lock) { c.strokeStyle = 'rgba(255,230,200,.9)'; c.strokeRect(0, -hw, len, hw * 2); }
    } else {
      const R = t.a; ell(c, t.x, t.y, R, R, 0, `rgba(${fill},${0.10 + 0.22 * k})`, `rgba(${edge},${0.55 + 0.4 * k})`, 2);
      ell(c, t.x, t.y, R * eo(k), R * eo(k), 0, `rgba(${core},${0.18 + 0.25 * k})`);
      if (k > 0.7 || lock) ell(c, t.x, t.y, R, R, 0, null, `rgba(255,230,200,${Math.min(1, (k - 0.7) * 3)})`, 2);
    }
    c.restore();
  }
  function drawWindCircles(c) {
    for (const u of S.units.values()) {
      if (u.kind !== 'e' || !(u.f & FLAG.WIND) || (u.f & FLAG.UNDER)) continue; const a = u.def.atk; if (a.tele) continue;
      const k = clamp((S.T - (u.windT0 || S.T)) / Math.max(0.2, a.wind), 0, 1), cx = u.x + Math.cos(u.face) * (a.off || 0), cy = u.y + Math.sin(u.face) * (a.off || 0);
      ell(c, cx, cy, a.hitR, a.hitR, 0, `rgba(214,50,40,${0.10 + 0.22 * k})`, `rgba(255,80,60,${0.55 + 0.4 * k})`, 2);
      ell(c, cx, cy, a.hitR * eo(k), a.hitR * eo(k), 0, `rgba(235,60,45,${0.18 + 0.25 * k})`);
      if (k > 0.7) ell(c, cx, cy, a.hitR, a.hitR, 0, null, `rgba(255,230,200,${(k - 0.7) * 2})`, 2);
    }
  }
  function drawAim(c) {
    const m = me(); if (!S.aim || !m || !S.sheet) return;
    const slot = S.aim.slot, sk = skillOf(slot), hero = S.sheet.hero, col = SHAPE_COL[hero], rng = rangeOf(slot), M2 = S.mouse, shape = sk.shape;
    c.save();
    if (rng && shape !== 'ball' && shape !== 'line') { c.setLineDash([6, 6]); ell(c, m.x, m.y, rng, rng * 0.9, 0, null, 'rgba(255,255,255,.28)', 1.5); c.setLineDash([]); }
    if (shape === 'circle') { const R = radOf(slot), d = Math.hypot(M2.wx - m.x, M2.wy - m.y), far = d > rng; ell(c, M2.wx, M2.wy, R, R, 0, `rgba(${col},${far ? 0.07 : 0.16})`, `rgba(${col},${far ? 0.5 : 0.95})`, 2); ell(c, M2.wx, M2.wy, 3, 3, 0, `rgba(${col},1)`); }
    else if (shape === 'wall') {
      const L = rk(sk.len, rankOfSlot(slot)) * (hasUp('longwall') ? 1.5 : 1), dir = Math.atan2(M2.wy - m.y, M2.wx - m.x);
      c.save(); c.translate(M2.wx, M2.wy); c.rotate(dir + PI / 2); c.fillStyle = `rgba(${col},.2)`; c.strokeStyle = `rgba(${col},.95)`; c.lineWidth = 2; c.fillRect(-L / 2, -8, L, 16); c.strokeRect(-L / 2, -8, L, 16); c.restore();
    } else if (shape === 'ball' || shape === 'line') {
      const ang = Math.atan2(M2.wy - m.y, M2.wx - m.x), L = shape === 'ball' ? rng : sk.len ? rk(sk.len, rankOfSlot(slot)) * (1 + myStat('range')) : rng, w = shape === 'ball' ? 10 : sk.wid;
      let hitL = L;
      if (shape === 'ball') for (const u of S.units.values()) { if (u.kind !== 'e' || (u.f & FLAG.UNDER)) continue; const dx = u.x - m.x, dy = u.y - m.y, al = dx * Math.cos(ang) + dy * Math.sin(ang), pp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang)); if (al > 0 && al < L + u.def.r && pp < u.def.r + 8 && al < hitL) hitL = al; }
      c.save(); c.translate(m.x, m.y); c.rotate(ang); c.fillStyle = `rgba(${col},.16)`; c.strokeStyle = `rgba(${col},.8)`; c.lineWidth = 1.5; c.fillRect(14, -w / 2, Math.max(0, hitL - 14), w); c.strokeRect(14, -w / 2, Math.max(0, hitL - 14), w); c.restore();
      if (shape === 'ball') { const R = radOf(slot) * (S.units.get('h' + S.myId) && (me().f & FLAG.HOT) ? 1.5 : 1); ell(c, m.x + Math.cos(ang) * hitL, m.y + Math.sin(ang) * hitL, R, R, 0, `rgba(${col},.1)`, `rgba(${col},.7)`, 2); }
    } else if (shape === 'blink') {
      const Dd = rangeOf(slot), dx = M2.wx - m.x, dy = M2.wy - m.y, d = Math.hypot(dx, dy) || 1, mm = Math.min(Dd, d), nx = m.x + dx / d * mm, ny = m.y + dy / d * mm;
      c.strokeStyle = `rgba(${col},.7)`; c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(nx, ny); c.stroke(); c.setLineDash([]); ell(c, nx, ny, 16, 14, 0, `rgba(${col},.2)`, `rgba(${col},.95)`, 2);
    }
    c.restore();
  }
  function bar(c, x, y, w, f, col) { c.fillStyle = '#000a'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); c.fillStyle = col; c.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 3); }

  // quest objects the art does not draw: progress, strength, the child, the faint finds
  function drawQuestWorld(c) {
    const P = S.props, t = S.T, my = me();
    const qs = {}; for (const q of S.q) qs[q[0]] = q;
    if (qs.spring && qs.spring[1] === 1) {
      const sp = M.P.spring, pc = (P.dg || 0) / 100; let near = false, foe = false;
      for (const u of S.units.values()) { if (u.kind === 'h' && !(u.f & FLAG.DEAD) && Math.hypot(u.x - sp[0], u.y - sp[1]) < 260) near = true; if (u.kind === 'e' && !(u.f & FLAG.UNDER) && Math.hypot(u.x - sp[0], u.y - sp[1]) < 220) foe = true; }
      const ok = near && !foe;
      c.save(); c.setLineDash([5, 7]); ell(c, sp[0], sp[1], 260, 230, 0, null, `rgba(230,200,120,${ok ? 0.28 : 0.12})`, 1.5); c.setLineDash([]);
      ell(c, sp[0], sp[1], 54, 46, 0, null, 'rgba(0,0,0,.5)', 5); c.strokeStyle = ok ? '#e6c98a' : '#c4513f'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.ellipse(sp[0], sp[1], 54, 46, 0, -PI / 2, -PI / 2 + TAU * pc); c.stroke();
      c.fillStyle = ok ? '#e6c98a' : '#e08a7a'; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText(ok ? 'Digging ' + Math.round(pc * 100) + '%' : foe ? 'Clear the leakers' : 'Stand by the dig', sp[0], sp[1] + 68); c.restore();
    }
    for (const ct of P.ct || []) {
      const [id, x, y, hp, mx, arr] = ct; c.save();
      if (!arr) { ell(c, x, y, 100, 100, 0, null, 'rgba(230,200,120,.22)', 1.5); bar(c, x, y + 26, 38, hp / mx, '#d9a05a'); }
      c.restore();
    }
    if (P.pal) { const g = FoundingArt.GATE; bar(c, g.x, g.y + 56, 70, P.pal[0] / P.pal[1], '#c98a3a'); }
    if (P.sm) {
      const [x, y, hp, mx] = P.sm, pc = (P.fp || 0) / 100; c.save();
      ell(c, x, y, 34, 30, 0, null, 'rgba(0,0,0,.5)', 5); c.strokeStyle = '#ffb048'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.ellipse(x, y, 34, 30, 0, -PI / 2, -PI / 2 + TAU * pc); c.stroke();
      bar(c, x, y + 30, 40, hp / mx, '#d9a05a'); c.restore();
    }
    // the child
    if (P.ch && P.ch[2] >= 1 && P.ch[2] <= 3) {
      const [x, y, st] = P.ch, bob = Math.abs(Math.sin(t * 7)) * (st === 2 ? 1.5 : 0.3);
      ell(c, x + 1, y + 4, 6, 3, 0, 'rgba(0,0,0,.3)'); circ(c, x, y - 3 - bob, 5.2, '#8a6a9a', OUT, 1.2); circ(c, x, y - 10 - bob, 3.6, '#e3c2a0', OUT, 1); c.fillStyle = '#c4513f'; c.fillRect(x - 3, y - 7 - bob, 6, 2);
    }
    // faint finds: a glimmer only noticed close by (never named)
    if (my) for (const s of P.sec || []) {
      if (s[3]) continue; const d = Math.hypot(my.x - s[1], my.y - s[2]); if (d > 420 || s[1] < 0) continue;
      const a = 0.05 + 0.07 * Math.sin(t * 2.2 + s[0]) * Math.sin(t * 2.2 + s[0]); glowAt(c, s[1], s[2], 16, s[0] === 8 ? '255,150,70' : '255,235,190', a * clamp(1.4 - d / 300, 0.2, 1));
    }
  }

  function drawMarks(c, state) {
    const marks = FoundingArt.marks(state), my = me(), cam = S.cam, t = S.T;
    c.font = '10px system-ui'; c.textAlign = 'center';
    for (const mk of marks) {
      const d = my ? Math.hypot(my.x - mk.x, my.y - mk.y) : 1e9;
      const show = ((mk.id === 'shop') && d < 700) || (mk.id === 'forge' && d < 700 && (S.props.fg | 0) === 2);
      if (!show) continue;
      let label = mk.label; if (mk.id === 'shop') label = 'Supplies  [' + keyLbl('fdTent') + ']'; else if (mk.id === 'forge') label = 'The Forge  [' + keyLbl('fdForge') + ']';
      const w = c.measureText(label).width + 14, y = mk.y - 70 - (mk.active ? Math.sin(t * 3) * 3 : 0);
      c.fillStyle = mk.active ? 'rgba(40,30,12,.85)' : 'rgba(15,12,10,.72)'; c.strokeStyle = mk.active ? '#e6c98a' : '#6b5634'; c.lineWidth = 1;
      c.beginPath(); c.rect(mk.x - w / 2, y - 9, w, 17); c.fill(); c.stroke();
      c.fillStyle = mk.active ? '#f3dfa4' : '#cfc5ae'; c.fillText(label, mk.x, y + 3);
      if (mk.active) { c.fillStyle = '#e6c98a'; c.beginPath(); c.moveTo(mk.x - 5, y + 10); c.lineTo(mk.x + 5, y + 10); c.lineTo(mk.x, y + 17); c.fill(); }
    }
  }
  function drawEdgeArrows(ctx, state) {
    const cam = S.cam, w = W(), h = H(), k = ctx.canvas.width / w;
    ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
    for (const f of S.qf || []) {
      if (!(f.carry || f.id === S.qhover)) continue;   // only what you are carrying for, or the quest you are pointing at in the tracker
      const sx = w / 2 + (f.x - cam.x) * cam.zoom, sy = h / 2 + (f.y - cam.y) * cam.zoom;
      if (sx > 30 && sx < w - 30 && sy > 70 && sy < h - 130) continue;
      const ang = Math.atan2(sy - h / 2, sx - w / 2), ex = clamp(w / 2 + Math.cos(ang) * 4000, 40, w - 40), ey = clamp(h / 2 + Math.sin(ang) * 4000, 90, h - 150);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.fillStyle = 'rgba(236,208,140,.85)'; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  function drawTop(c, state) {
    for (const t of S.tele.values()) drawTele(c, t);
    drawWindCircles(c);
    // selection
    if (S.tgt != null) { const e = S.units.get('e' + S.tgt); if (e && !(e.f & FLAG.UNDER)) { const pu = 1 + Math.sin(S.T * 6) * 0.06; ell(c, e.x, e.y + 2, (e.def.r + 7) * pu, (e.def.r + 7) * 0.8 * pu, 0, null, 'rgba(255,90,70,.95)', 2.2); } else if (!e) S.tgt = null; }
    if (S.tgtAlly != null) { const a = S.units.get('h' + S.tgtAlly); if (a && a.id !== S.myId) ell(c, a.x, a.y + 2, 24, 20, 0, null, 'rgba(140,235,170,.8)', 1.8); }
    const he = hoverEnemy(); if (he && he.id !== S.tgt && !S.aim) ell(c, he.x, he.y + 2, he.def.r + 6, (he.def.r + 6) * 0.8, 0, null, 'rgba(255,255,255,.55)', 1.5);
    if (S.marker) { const k = S.marker.t / 0.45; ell(c, S.marker.x, S.marker.y, 16 * (1 - eo(k) * 0.8), 16 * (1 - eo(k) * 0.8) * 0.7, 0, null, `rgba(${S.marker.c || '140,240,160'},${1 - k})`, 2); }
    drawAim(c);
    // bars, names, cast bars
    c.font = '10px system-ui'; c.textAlign = 'center';
    for (const u of S.units.values()) {
      if (u.kind === 'e') {
        if ((u.f & FLAG.UNDER) || u.vis < 0.5 || (u.pct >= 100 && !u.def.elite && !u.def.inert)) continue;
        bar(c, u.x, u.y - u.def.r - ((u.f & FLAG.MARK) ? 26 : 11), u.def.boss ? Math.max(70, u.def.r * 1.7) : u.def.elite ? 44 : 26, u.pct / 100, u.def.elite ? '#d9533f' : '#c4513f');
      } else {
        const dead = u.f & FLAG.DEAD, mine = u.id === S.myId;
        if (!dead && (u.hp < u.max || mine)) bar(c, u.x, u.y - 30, 30, u.hp / u.max, mine ? '#5ba86a' : '#6aa0d0');
        if (!mine) { c.fillStyle = 'rgba(235,225,200,.85)'; c.fillText(u.name, u.x, u.y - (dead ? 24 : 38)); }
        if (!dead && u.cs >= 0 && u.cs < 4 && u.cp > 0 && u.cp < 1 && (SLOT_WIND(u))) { c.fillStyle = '#000a'; c.fillRect(u.x - 16, u.y - 44, 32, 4); c.fillStyle = '#ffb048'; c.fillRect(u.x - 15, u.y - 43, 30 * u.cp, 2); }
        if (dead && mine && S.sheet && S.sheet.st > 0) { c.fillStyle = 'rgba(255,230,160,.9)'; c.fillText('Fallen (' + Math.max(0, Math.ceil(S.sheet.st - (S.T - S.sheetT))) + ')', u.x, u.y - 30); }
      }
    }
    drawQuestWorld(c);
    drawQuestMarkers(c);
    drawShimmer(c);
    drawCounts(c);
    drawRecall(c); drawPings(c);
    if (LAYERS.length) lay('top', c);
    drawUse(c);
    drawMarks(c, state);
    // floating numbers, small and steady on screen
    const sc = clamp(1 / S.cam.zoom, 0.85, 1.35);
    for (const t of S.texts) {
      const k = t.t / t.life, rise = eo(Math.min(1, k * 1.6)) * 22, pop = 1 + 0.35 * (1 - eo(Math.min(1, t.t * 8))), a = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
      c.save(); c.globalAlpha = a; c.translate(t.x, t.y - rise); c.scale(pop * sc, pop * sc); c.font = `bold ${t.size}px system-ui`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(t.txt, 0, 0); c.fillStyle = t.color; c.fillText(t.txt, 0, 0); c.restore();
    }
  }
  const SLOT_WIND = u => { const k = D.KITS[u.hero]; return k && k.skills[SLOTK[u.cs]] && k.skills[SLOTK[u.cs]].wind > 0.3; };

  // ================================================================ render
  const wt = (ctx, cam) => { const k = ctx.canvas.width / W(), z = cam.zoom; ctx.setTransform(k * z, 0, 0, k * z, k * (W() / 2 - cam.x * z), k * (H() / 2 - cam.y * z)); };
  // what the map art reads: the live units (reused, no allocations), the quests, and the extra lights of the night
  const AS = { props: null, units: [], quests: null, lights: null, nLights: 0 };
  function artState() {
    const au = AS.units; let n = 0; S.nl = 0;
    for (const u of S.units.values()) {
      if (u.f & FLAG.DEAD) continue;
      const o = au[n] || (au[n] = { x: 0, y: 0, hero: false }); o.x = u.x; o.y = u.y; o.hero = u.kind === 'h'; n++;
      if (u.kind === 'h' && (u.f & FLAG.BRAND)) addLight(u.x, u.y, 300, 0.9);
    }
    for (const u of S.units.values()) if (u.kind === 'e' && u.def.boss && !(u.f & FLAG.UNDER)) { const d = u.def.r * 0.85; for (let i = 0; i < 4; i++) { const o = au[n] || (au[n] = { x: 0, y: 0, hero: false }); o.x = u.x + (i < 2 ? (i ? d : -d) : 0); o.y = u.y + (i >= 2 ? (i === 3 ? d : -d) : 0); o.hero = false; n++; } }
    au.length = n;
    for (const z of S.zones.values()) {
      if (z.kind === ZONE.SANCT) addLight(z.x, z.y, z.a * 1.3, 0.6);
      else if (z.kind === ZONE.BURN || z.kind === ZONE.CRATER) addLight(z.x, z.y, Math.max(100, z.a * 1.5), 0.55);
      else if (z.kind === ZONE.TRAIL) { addLight(z.x, z.y, 100, 0.5); addLight(z.a, z.b, 100, 0.5); }
    }
    for (const p of S.projs) if (p.fb) addLight(p.x, p.y, 110, 0.7);
    if (LAYERS.length) lay('lights', addLight);
    AS.props = S.props; AS.quests = S.q; AS.lights = S.lights; AS.nLights = S.nl;
    return AS;
  }
  function render() {
    const ctx = dep.ctx, cam = S.cam;
    let sx = 0, sy = 0; if (S.shkT > 0) { const k = eo(S.shkT / (S.shkD || 0.25)) * S.shk; sx = (Math.random() - 0.5) * 2 * k; sy = (Math.random() - 0.5) * 2 * k; }
    const vc = { x: cam.x + sx / cam.zoom, y: cam.y + sy / cam.zoom, zoom: cam.zoom, w: W(), h: H() };
    const state = artState(); qFocus();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    FoundingArt.drawGround(ctx, vc, state, S.T);
    ctx.save(); wt(ctx, vc);
    const c = ctx, x0 = vc.x - W() / 2 / vc.zoom - 80, x1 = vc.x + W() / 2 / vc.zoom + 80, y0 = vc.y - H() / 2 / vc.zoom - 120, y1 = vc.y + H() / 2 / vc.zoom + 120;
    const inV = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
    // the camp's edge, faint: on the fence and its flags, the line the enemies strike the camp from
    c.setLineDash([10, 12]); ell(c, M.P.hearth[0], M.P.hearth[1], M.CAMP_R, M.CAMP_R, 0, null, `rgba(${S.campFlash > 0 ? '255,120,80' : '230,201,138'},${0.16 + 0.5 * S.campFlash})`, 1.5 + 2 * S.campFlash); c.setLineDash([]);
    for (const z of S.zones.values()) if ((inV(z.x, z.y) || z.kind === ZONE.FLOOD) && z.kind !== ZONE.WALL) drawZoneGround(c, z);
    for (const k of S.corpses) if (inV(k.x, k.y) && visAt(k.x, k.y, k.r)) drawCorpse(c, k);
    for (const f of S.fx) if (f.layer === 0) f.draw(c);
    if (LAYERS.length) lay('ground', c, inV);
    const L = [];
    if (LAYERS.length) lay('units', L, inV);
    for (const u of S.units.values()) if (inV(u.x, u.y)) L.push([u.y, u.kind === 'e' ? 0 : 1, u]);
    for (const z of S.zones.values()) { if (z.kind === ZONE.WALL && inV(z.x, z.y)) L.push([z.y, 2, z]); else if (z.kind === ZONE.BANNER && inV(z.x, z.y)) L.push([z.y, 3, z]); }
    // in the camp, the heroes already chosen stand round the Hearth
    if (S.phase === 'camp') S.players.forEach((p, i) => { if (!p[2]) return; const n = S.players.length, a = -PI / 2 + (i - (n - 1) / 2) * 0.55, hx = M.P.hearth[0] + Math.cos(a) * 110, hy = M.P.hearth[1] + 80 + Math.sin(a) * 40; L.push([hy, 4, { hero: p[2], x: hx, y: hy, name: p[1], i }]); });
    L.sort((a, b) => a[0] - b[0]);
    for (const [, k, o] of L) {
      if (k === 9) o.draw(c); else if (k === 0) drawEnemy(c, o); else if (k === 1) drawHeroUnit(c, o); else if (k === 2) drawWall(c, o); else if (k === 3) drawBannerPole(c, o);
      else { o.an = o.an || { t: 0, moving: false, action: null }; o.an.t = S.T; drawHero(c, clsOf(o.hero), o.x, o.y, PI / 2 + (o.i - 1.5) * 0.15, o.an, HS, { ringColor: roleColor(o.hero) }); c.font = '10px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(235,225,200,.85)'; c.fillText(o.name, o.x, o.y - 30); }
    }
    for (const z of S.zones.values()) if (z.kind === ZONE.METEOR && inV(z.x, z.y)) drawMeteorBody(c, z);
    for (const p of S.projs) drawProj(c, p);
    for (const f of S.fx) if (f.layer === 1) f.draw(c);
    drawVolleyArrows(c);
    for (const p of S.parts) drawPart(c, p);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    FoundingArt.drawOver(ctx, vc, state, S.T);
    FoundingArt.drawLight(ctx, vc, state, S.T);
    drawFog(ctx, vc);
    ctx.save(); wt(ctx, vc); drawTop(ctx, state); ctx.restore();
    drawEdgeArrows(ctx, state);
    if (LAYERS.length) lay('screen', ctx);
    drawScreenFx(ctx);
    if (S.hurtFlash > 0) { const k = ctx.canvas.width / W(); ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0); const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * 0.35, W() / 2, H() / 2, H() * 0.85); g.addColorStop(0, 'rgba(140,0,0,0)'); g.addColorStop(1, `rgba(150,10,10,${0.35 * S.hurtFlash})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H()); ctx.restore(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    dep.canvas.style.cursor = S.aim ? 'crosshair' : (hoverEnemy() || hoverGiver() ? 'pointer' : 'default');
  }

  // ================================================================ minimap (FoundingUI owns the canvas)
  function drawMini(cv) {
    if (!S) return; const g = cv.getContext('2d'), w = cv.width, h = cv.height, kx = w / M.W, ky = h / M.H;
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(FoundingArt.minimap(w, h), 0, 0);
    if (S.fogOn && S.fog) g.drawImage(S.fog.fog, 0, 0, w, h);
    const state = { props: S.props, units: [], quests: S.q };
    if (LAYERS.length) lay('mini', g, kx, ky);
    for (const f of S.qf || []) {   // one small mark per active quest: its current step
      const x = f.x * kx, y = f.y * ky, hv = S.qhover === f.id, r = hv ? 4.6 : 3.4; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
      g.lineWidth = 1.4; g.strokeStyle = hv ? '#fff1b8' : '#f0d68c'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.fillStyle = '#f0d68c'; g.beginPath(); g.arc(x, y, 1.2, 0, TAU); g.fill();
    }
    for (const u of S.units.values()) {
      const x = u.x * kx, y = u.y * ky;
      if (u.kind === 'e') { if ((u.f & FLAG.HIDDEN) || u.fogT === 0) continue; if (u.def.inert) { g.fillStyle = '#7ab8d8'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); continue; } if (u.f & FLAG.UNDER) { g.strokeStyle = '#d9a05a'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.stroke(); continue; } g.fillStyle = (u.f & FLAG.BOSS) ? '#ff8a2a' : (u.f & FLAG.ELITE) ? '#ff5a3a' : '#d84a3a'; const r = (u.f & FLAG.BOSS) ? 4.5 : (u.f & FLAG.ELITE) ? 3 : 1.7; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    }
    drawMiniGivers(g, kx, ky);
    for (const u of S.units.values()) if (u.kind === 'h') { const x = u.x * kx, y = u.y * ky, mine = u.id === S.myId; g.fillStyle = (u.f & FLAG.DEAD) ? '#777' : roleColor(u.hero); g.strokeStyle = mine ? '#fff' : '#000'; g.lineWidth = mine ? 1.8 : 1; g.beginPath(); g.arc(x, y, mine ? 4 : 3.2, 0, TAU); g.fill(); g.stroke(); }
    const cam = S.cam, vw = W() / cam.zoom * kx, vh = H() / cam.zoom * ky; g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.strokeRect(cam.x * kx - vw / 2, cam.y * ky - vh / 2, vw, vh);
    drawMiniAlerts(g, w, h, kx, ky);
  }
  function miniTo(fx, fy, move, ping) {
    if (!S) return; const x = fx * M.W, y = fy * M.H;
    if (ping) { sendPing(x, y); return; }
    if (move) { S.openOnArrive = null; send({ k: 'move', x: Math.round(x), y: Math.round(y) }); S.marker = { x, y, t: 0 }; }
    else { S.cam.free = true; S.cam.x = x; S.cam.y = y; }
  }

  // ================================================================ input
  let bound = false;
  const inField = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  function mouseXY(ev) { const r = dep.canvas.getBoundingClientRect(); S.mouse.sx = ev.clientX - r.left; S.mouse.sy = ev.clientY - r.top; S.mouse.wx = S.cam.x + (S.mouse.sx - W() / 2) / S.cam.zoom; S.mouse.wy = S.cam.y + (S.mouse.sy - H() / 2) / S.cam.zoom; }
  function onMouseDown(ev) {
    if (!active || !S || ev.target !== dep.canvas) return;
    ev.preventDefault(); ev.stopImmediatePropagation(); mouseXY(ev);
    if (paused || S.phase !== 'live' || S.ended || S.end) return;
    if (LAYERS.length && !ev.altKey && lay('click', S.mouse.wx, S.mouse.wy, ev.button)) return;
    if (ev.button === 0) { if (ev.altKey) sendPing(S.mouse.wx, S.mouse.wy); else leftClick(); } else if (ev.button === 2) rightClick(); else if (ev.button === 1) S.pan = { x: ev.clientX, y: ev.clientY };
    else if (typeof Keybinds !== 'undefined' && Keybinds.modeAction) { const act = Keybinds.modeAction('mouse' + ev.button, 'founding'); if (act) doAct(act, '', ev); }   // (a side button bound in Options)
  }
  function leftClick() {
    if (S.aim) { const slot = S.aim.slot; S.aim = null; castAt(slot, S.mouse.wx, S.mouse.wy); return; }
    const e = hoverEnemy(); if (e) { S.tgt = e.id; return; }
    const h = hoverHero(); if (h) { S.tgtAlly = h.id; return; }
    const m = S.mouse, sp = M.P.shop, fg = M.P.forge;
    if (Math.hypot(m.wx - sp[0], m.wy - sp[1]) < 70) { tryShop(); return; }
    if (Math.hypot(m.wx - fg[0], m.wy - fg[1]) < 60) { tryForge(); return; }
  }
  function rightClick() {
    if (S.aim) { S.aim = null; return; }
    const m = me(); if (!m || (m.f & FLAG.DEAD)) return;
    const e = hoverEnemy(); S.openOnArrive = null;
    const gv = e ? null : hoverGiver();
    const qo = e || gv ? null : hoverQuestThing();
    if (qo) { S.rEnemy = false; S.rDown = false; send({ k: 'fetch', x: qo[1], y: qo[2] }); S.marker = { x: qo[1], y: qo[2], t: 0 }; return; }   // (walks over and does what the Use key would)
    if (gv) { S.rEnemy = false; S.rDown = false; send({ k: 'talk', id: gv.id }); S.marker = { x: gv.x, y: gv.y + 50, t: 0 }; return; }   // (no held-button walking after: it would call the hero off the talk)
    if (e) { S.tgt = e.id; S.rEnemy = true; send({ k: 'attack', id: e.id }); S.marker = { x: e.x, y: e.y, t: 0, c: '255,110,90' }; }
    else { S.rEnemy = false; send({ k: 'move', x: Math.round(S.mouse.wx), y: Math.round(S.mouse.wy) }); S.marker = { x: S.mouse.wx, y: S.mouse.wy, t: 0 }; }
    S.rDown = true; S.rT = 0.2;
  }
  function onMouseUp(ev) { if (!active || !S) return; if (ev.button === 2) S.rDown = false; if (ev.button === 1) S.pan = null; if (ev.button > 2) ev.preventDefault(); }   // (a side button never steps the browser back mid-run)
  function onMouseMove(ev) {
    if (!active || !S) return;
    S.mouse.in = ev.target === dep.canvas;   // (the canvas tooltips show only while the pointer is over the field, not over a panel)
    if (ev.target === dep.canvas || S.pan) mouseXY(ev);
    if (S.pan) { S.cam.free = true; S.cam.x -= (ev.clientX - S.pan.x) / S.cam.zoom; S.cam.y -= (ev.clientY - S.pan.y) / S.cam.zoom; S.pan = { x: ev.clientX, y: ev.clientY }; }
  }
  function onWheel(ev) {
    if (!active || !S || ev.target !== dep.canvas) return; ev.preventDefault(); ev.stopImmediatePropagation();
    S.cam.tz = clamp(S.cam.tz * (ev.deltaY < 0 ? 1.1 : 1 / 1.1), 0.55, 1.7);
  }
  function onCtx(ev) { if (active) { ev.preventDefault(); if (ev.target === dep.canvas) ev.stopImmediatePropagation(); } }
  function onKeyDown(ev) {
    if (!active || !S || inField(ev.target)) return;
    if (ev.key === 'Alt') { ev.preventDefault(); return; }   // (Alt + click pings: a bare Alt must not pull focus to the browser's menu)
    const k = ev.code; let used = true;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (paused) {   // held: only Esc does anything (it resumes); the rest of the keys are eaten so nothing reaches the town behind
      if (k === 'Escape') { if (!ev.repeat) setPause(false); }
      if (/^F\d+$/.test(ev.key || '')) return;
      ev.preventDefault(); ev.stopImmediatePropagation(); return;
    }
    // the keys are the player's own (keybinds.js: the hotbar's first four, Next enemy, and The Founding's section)
    const KB = typeof Keybinds !== 'undefined' && Keybinds.modeAction ? Keybinds : null;
    const act = KB ? KB.modeAction(KB.keyOf(ev), 'founding') : ({ KeyQ: 's0', KeyW: 's1', KeyE: 's2', KeyR: 's3', Tab: 'cycle', KeyT: 'fdTent', KeyB: 'fdRecall', KeyF: 'fdForge', KeyV: 'fdFlask', KeyG: 'fdUse', KeyX: 'fdDrop', Space: 's6', KeyC: 'fdCenter', KeyD: 'fdPassive' })[k] || (/^Digit[1-6]$/.test(k) ? 'fdItem' + k.slice(5) : null);
    if (S.phase !== 'live') { if (k === 'Escape') used = FoundingUI.closeTop(); else used = false; }
    else if (S.ended || S.end) { used = k === 'Escape' && FoundingUI.closeTop(); }   // (the end beat: Esc still closes a panel left open)
    else if (k === 'Escape') { if (FoundingUI.closeTop()) { /* closed a panel */ } else if (S.aim) S.aim = null; else if (canPause()) { if (!ev.repeat) setPause(true); } else used = false; }
    else used = doAct(act, k, ev);
    if (used) { ev.preventDefault(); ev.stopImmediatePropagation(); }
  }
  // one action from the player's own keys (a keyboard key, or a mouse's side button): true if it was used
  function doAct(act, k, ev) {
    const slotMap = { s0: 'q', s1: 'w', s2: 'e', s3: 'r' };
    let used = true;
    if (LAYERS.length && lay('key', act, ev)) { /* a feature layer took it */ }
    else if (slotMap[act]) { if (!ev.repeat) { if (ev.shiftKey) learn(slotMap[act]); else pressSkill(slotMap[act]); } }
    else if (act === 'cycle') cycleTarget(ev.shiftKey ? -1 : 1);
    else if (act === 'fdTent') { if (!ev.repeat) { if (FoundingUI.isOpen('tent')) FoundingUI.closeTop(); else tryShop(); } }
    else if (act === 'fdRecall') { if (!ev.repeat) tryRecall(); }
    else if (act === 'fdForge') { if (!ev.repeat) { if (FoundingUI.isOpen('forge')) FoundingUI.closeTop(); else tryForge(); } }
    else if (act && act.startsWith('fdItem')) { if (!ev.repeat) send({ k: 'use', slot: +act.slice(6) - 1 }); }
    else if (act === 'fdFlask') { if (!ev.repeat) send({ k: 'use', slot: 'f' }); }
    else if (act === 'fdUse') { if (!ev.repeat) send({ k: 'carry' }); }
    else if (act === 'fdDrop') { if (!ev.repeat) send({ k: 'drop' }); }
    else if (act === 'fdPassive') { if (!ev.repeat) learn('p'); }
    else if (act === 'fdMeter') { if (!ev.repeat) FoundingUI.toggleMeter(); }
    else if (act === 's6') { if (!ev.repeat) tryDash(); }
    else if (act === 'fdCenter') { S.cam.free = false; const m = me(); if (m) { S.cam.x = m.x; S.cam.y = m.y; } }
    else if (k && k.startsWith('Arrow')) { (S.keys || (S.keys = {}))[k] = true; }
    else used = false;
    return used;
  }
  function onKeyUp(ev) { if (S && S.keys && S.keys[ev.code]) { S.keys[ev.code] = false; } }
  function onBlur() { if (S) { S.rDown = false; S.pan = null; S.keys = null; S.mouse.in = false; } }
  function bindInput() {
    if (bound) return; bound = true;
    window.addEventListener('mousedown', onMouseDown, true); window.addEventListener('mouseup', onMouseUp, true); window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false }); window.addEventListener('contextmenu', onCtx, true);
    window.addEventListener('keydown', onKeyDown, true); window.addEventListener('keyup', onKeyUp, true); window.addEventListener('blur', onBlur);
  }
  function unbindInput() {
    if (!bound) return; bound = false;
    window.removeEventListener('mousedown', onMouseDown, true); window.removeEventListener('mouseup', onMouseUp, true); window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('wheel', onWheel, { capture: true }); window.removeEventListener('contextmenu', onCtx, true);
    window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('blur', onBlur);
  }

  // ================================================================ the frame
  function frame(rawDt) {
    if (!active || !S) return;
    if (rawDt > 0.4) for (const u of S.units.values()) u.tr.settle();
    const dt = clamp(rawDt, 0, 0.1);
    if (paused && !(sim && sim.isPaused())) setPause(false);   // (a second player came back in: the hold is over)
    if (!paused) try { update(dt); } catch (e) { frameErr(e); }
    try { render(); } catch (e) { frameErr(e); const c = dep.ctx; if (c) { if (c.reset) c.reset(); else c.setTransform(1, 0, 0, 1, 0, 0); } }   // (a throw mid-draw leaves saves unbalanced: start the canvas clean)
    if (!paused) try { FoundingUI.update(dt); } catch (e) { frameErr(e); }
  }

  const errSeen = new Set();
  function frameErr(e) { const k = String(e && e.message); if (errSeen.size < 50 && !errSeen.has(k)) { errSeen.add(k); console.error(e); } }

  // what ui.js may read and call
  const api = {
    D, M, FLAG, SKILL_ICON, state: () => S, me, send, say, snd, clsOf, roleColor, heroIdx, leave, drawMini, miniTo, pressSkill, learn, canLearn, keyLabel, cdLeft, charges, hasUp, myStat, tryRecall, rcLeft, tryDash, dsLeft, pingAt: sendPing, isRecalling: () => !!S && S.rc.has(S.myId), hoverQuest: id => { if (S) S.qhover = id || null; },
    get dep() { return dep; }, get sim() { return sim; }, pause: setPause, canPause, isPaused: () => paused, meterRows, result: () => lastResult, isActive: () => active, tryShop, tryForge,
  };

  return {
    init, enterAsHost, enter, leave, active: () => active, frame, playerLeft, __pause: setPause, __paused: () => paused, guestJoined, payOwed, practice: false, api, addLayer,
    // for tests and the browser pane, where the frame loop is unreliable
    __step(dt, n) { n = n || 1; for (let i = 0; i < n; i++) { if (sim) { sim.tick(0.05); } frame(dt); } },
    __fog(on) { if (S) S.noFog = !on; }, get __state() { return S; }, get __sim() { return sim; },
  };
})();
