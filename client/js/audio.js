// The sound engine: one AudioContext (made on the first key or click, as browsers require), six buses into a gentle
// limiter, and three ways to make a sound, tried in order: a file from client/sounds/ (listed in
// client/sounds/manifest.json), a synthesized recipe (Sound.define, sfx-synth.js), or silence. Nothing here may ever
// throw into the game: every entry point is wrapped, and with no files and no recipes the game runs exactly as before.
//
//   Sound.play(name, { vol, pan, rate, remote, at: {x, y}, bus, variant, key, minGap })  -> true if it started
//   Sound.loop(name, { vol, bus, at })     -> { stop(fade), setVol(v, fade) }   (a file '<name>.ogg' loops, else a
//                                             Sound.defineLoop recipe; started once audio unlocks if asked for earlier)
//   Sound.define(name, fn(ctx, out, t0, p) -> secs) / defineLoop(name, fn(ctx, out, p) -> stopFn) / has(name)
//   Sound.music.set(id | null, { fade }) / layer(id) / duck(amount, secs) / bpm
//   Sound.say(lineId, { speaker, text, chance, cooldownKey, cooldown, duck, caption, voiceHint, boss })
//   Sound.set(key, v) / get(key)  (master sfx ui voice music amb 0-1, mute, captions, speech: saved with the game)
//   Sound.setListener(x, y), stopAll(), suspend(), resume(), stats(), test(), noise()  (window.__sound for tests)
//
// The manifest is a JSON array of file ids without the extension: 'ui-click', 'dash-1', 'dash-2' (variants),
// 'music/mus-town', 'voice/grubnak-intro-1'. An id may carry its own extension ('ui-click.mp3'); otherwise .ogg.

const Sound = (() => {
  const HAS_WIN = typeof window !== 'undefined';
  const AC = HAS_WIN ? (window.AudioContext || window.webkitAudioContext) : null;
  const DEFAULTS = { master: 0.7, sfx: 0.8, ui: 0.6, voice: 0.9, music: 0.5, amb: 0.5, mute: false, captions: true, speech: false };
  const BUSES = ['sfx', 'ui', 'voice', 'music', 'amb'];
  const MAX_VOICES = 28;
  const BASE = 'sounds/';
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

  // ---------------------------------------------------------------- settings (Save.settings.audio)
  let cfg = Object.assign({}, DEFAULTS);
  safe(() => {
    const s = typeof Save !== 'undefined' ? (Save.audio ? Save.audio() : Save.setting('audio', null)) : null;
    if (s && typeof s === 'object') for (const k of Object.keys(DEFAULTS)) if (typeof s[k] === typeof DEFAULTS[k]) cfg[k] = s[k];
  });
  function persist() { safe(() => { if (typeof Save !== 'undefined') Save.setSetting('audio', Object.assign({}, cfg)); }); }

  // ---------------------------------------------------------------- the graph
  let ctx = null, master = null, limiter = null, musicDuck = null, noiseBuf = null;
  const bus = {};
  let unlocked = false, suspended = false;
  const S = {
    ready: false,
    get enabled() { return !cfg.mute && cfg.master > 0; },
  };

  function busLevel(b) { return b === 'master' ? (cfg.mute ? 0 : cfg.master) : cfg[b]; }
  function applyBus(b, fade = 0.08) {
    if (!ctx) return;
    const node = b === 'master' ? master : bus[b];
    if (node) node.gain.setTargetAtTime(busLevel(b), ctx.currentTime, fade);
  }

  function build() {
    ctx = new AC();
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 6; limiter.attack.value = 0.004; limiter.release.value = 0.22;
    master = ctx.createGain(); master.gain.value = busLevel('master');
    master.connect(limiter); limiter.connect(ctx.destination);
    for (const b of BUSES) { bus[b] = ctx.createGain(); bus[b].gain.value = busLevel(b); }
    musicDuck = ctx.createGain(); musicDuck.gain.value = 1;
    bus.music.connect(musicDuck); musicDuck.connect(master);
    for (const b of BUSES) if (b !== 'music') bus[b].connect(master);
    // one shared 2 s white-noise buffer for every recipe that needs noise
    const n = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  function unlock() {
    if (!AC) return;
    safe(() => {
      if (!ctx) build();
      if (ctx.state === 'suspended' && !suspended) ctx.resume();
      if (!unlocked) {
        unlocked = true; S.ready = true;
        for (const h of pendingLoops) startLoop(h);
        pendingLoops.length = 0;
        if (musicWant !== undefined) applyMusic(musicWant, 0.8);
        preloadAll();
      }
    });
  }
  if (HAS_WIN) for (const ev of ['keydown', 'mousedown', 'touchstart', 'pointerdown']) window.addEventListener(ev, unlock, { capture: true, passive: true });

  // ---------------------------------------------------------------- files: manifest, fetch, decode
  let manifest = new Set(), manifestLoaded = false;
  const variants = new Map();   // name -> [ids]  ('dash' -> ['dash-1', 'dash-2'] or ['dash'])
  const buffers = new Map();    // id -> AudioBuffer | 'loading' | 'failed'
  const lastPick = new Map();
  const urlOf = id => BASE + (/\.(ogg|mp3|wav|m4a)$/.test(id) ? id : id + '.ogg');
  const bare = id => id.replace(/\.(ogg|mp3|wav|m4a)$/, '');
  function indexManifest(list) {
    manifest = new Set();
    variants.clear();
    for (const raw of list) {
      if (typeof raw !== 'string' || !raw) continue;
      const id = bare(raw);
      manifest.add(id);
      fileOf.set(id, raw);
      const m = /^(.*)-(\d+)$/.exec(id);
      for (const name of m ? [m[1], id] : [id]) { if (!variants.has(name)) variants.set(name, []); variants.get(name).push(id); }
    }
    // a plain '<name>' file beats numbered variants of the same name only when no variants exist
    for (const [name, ids] of variants) if (ids.length > 1 && ids.includes(name)) variants.set(name, ids.filter(i => i !== name));
  }
  const fileOf = new Map();   // id -> manifest entry (with its extension, if it had one)
  if (HAS_WIN && typeof fetch !== 'undefined') {
    safe(() => fetch(BASE + 'manifest.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : []))
      .then(list => { if (Array.isArray(list)) indexManifest(list); manifestLoaded = true; if (unlocked) preloadAll(); })
      .catch(() => { manifestLoaded = true; }));
  }
  function load(id) {
    const b = buffers.get(id);
    if (b) return b instanceof Promise ? b : Promise.resolve(b === 'failed' ? null : b);
    if (!ctx) return Promise.resolve(null);
    const p = fetch(urlOf(fileOf.get(id) || id))
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
      .then(ab => new Promise((res, rej) => { const q = ctx.decodeAudioData(ab, res, rej); if (q && q.catch) q.catch(rej); }))
      .then(buf => { buffers.set(id, buf); return buf; })
      .catch(() => { buffers.set(id, 'failed'); return null; });
    buffers.set(id, p);
    return p;
  }
  const ready = id => { const b = buffers.get(id); return b && !(b instanceof Promise) && b !== 'failed' ? b : null; };
  // after unlock, decode every effect file in the background (music streams; voice lines decode on first use)
  let preloaded = false;
  function preloadAll() {
    if (preloaded || !manifestLoaded || !ctx) return;
    preloaded = true;
    const ids = [...manifest].filter(id => !id.startsWith('music/') && !id.startsWith('voice/'));
    let i = 0;
    const next = () => { if (i >= ids.length) return; load(ids[i++]).then(next, next); };
    for (let k = 0; k < 3; k++) next();
  }
  // a random file for this name, never the same one twice running
  function pickFile(name, variant) {
    const ids = variants.get(name);
    if (!ids || !ids.length) return null;
    if (Number.isInteger(variant) && ids[variant % ids.length]) return ids[variant % ids.length];
    if (ids.length === 1) return ids[0];
    const last = lastPick.get(name);
    let id;
    do id = ids[Math.floor(Math.random() * ids.length)]; while (id === last);
    lastPick.set(name, id);
    return id;
  }

  // ---------------------------------------------------------------- recipes
  const recipes = new Map(), loopRecipes = new Map();
  S.define = (name, fn) => { if (typeof name === 'string' && typeof fn === 'function') recipes.set(name, fn); };
  S.defineLoop = (name, fn) => { if (typeof name === 'string' && typeof fn === 'function') loopRecipes.set(name, fn); };
  S.has = name => recipes.has(name) || loopRecipes.has(name) || variants.has(name);
  S.noise = () => noiseBuf;

  // ---------------------------------------------------------------- one-shots
  const active = [];   // { out, vol, t0, end, src }
  const lastKey = new Map();
  let lx = null, ly = null;
  S.setListener = (x, y) => { lx = x; ly = y; };
  // distance: full volume close by, fading out past ~400 units; panned by how far left or right
  function spatial(at, o) {
    if (!at || lx == null || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return o;
    const dx = at.x - lx, dy = at.y - ly, d = Math.hypot(dx, dy);
    o.vol *= 1 / (1 + Math.pow(d / 520, 2));
    o.pan = clamp(o.pan + dx / 650, -0.85, 0.85);
    return o;
  }
  function retire(v) {
    const i = active.indexOf(v);
    if (i >= 0) active.splice(i, 1);
    safe(() => v.chain.disconnect());
  }
  function kill(v, fade = 0.04) {
    safe(() => {
      v.out.gain.cancelScheduledValues(ctx.currentTime);
      v.out.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
      if (v.src) v.src.stop(ctx.currentTime + fade + 0.02);
    });
    const i = active.indexOf(v);
    if (i >= 0) active.splice(i, 1);
    setTimeout(() => safe(() => v.chain.disconnect()), (fade + 0.08) * 1000);
  }
  // the chain every sound goes through: out (its level) -> [low-pass if remote] -> panner -> bus
  function chainFor(o) {
    const out = ctx.createGain();
    out.gain.value = o.vol;
    let tail = out;
    const nodes = [out];
    if (o.remote) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.4; tail.connect(lp); tail = lp; nodes.push(lp); }
    if (o.pan && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = clamp(o.pan, -1, 1); tail.connect(pn); tail = pn; nodes.push(pn); }
    tail.connect(bus[o.bus] || bus.sfx);
    return { out, chain: { disconnect() { for (const n of nodes) safe(() => n.disconnect()); } } };
  }
  function makeRoom(vol) {
    if (active.length < MAX_VOICES) return true;
    // the quietest (oldest among equals) goes; a new sound quieter than everything playing is dropped instead
    let worst = null;
    for (const v of active) if (!worst || v.vol < worst.vol - 1e-4 || (Math.abs(v.vol - worst.vol) <= 1e-4 && v.t0 < worst.t0)) worst = v;
    if (worst && worst.vol > vol) return false;
    if (worst) kill(worst, 0.03);
    return true;
  }

  S.play = (name, opts) => safe(() => {
    if (!unlocked || !ctx || suspended || cfg.mute || cfg.master <= 0 || typeof name !== 'string') return false;
    const o = opts || {};
    const busName = BUSES.includes(o.bus) ? o.bus : 'sfx';
    if (cfg[busName] <= 0) return false;
    const t = nowMs() / 1000;
    if (o.key != null) {
      const last = lastKey.get(o.key);
      if (last != null && t - last < (o.minGap || 0)) return false;
    }
    const p = spatial(o.at, { vol: o.vol == null ? 1 : +o.vol, pan: +o.pan || 0, rate: o.rate == null ? 1 : +o.rate, remote: !!o.remote, bus: busName });
    if (p.remote) p.vol *= 0.5;
    // a little life in every repeat: +-3% pitch, +-1 dB
    if (o.jitter !== false) { p.rate *= 1 + (Math.random() - 0.5) * 0.06; p.vol *= Math.pow(10, (Math.random() * 2 - 1) / 20); }
    if (!(p.vol > 0.004)) return false;
    const file = pickFile(name, o.variant);
    const buf = file && ready(file);
    if (file && !buf) load(file);   // (decoding: the recipe, if any, covers this once)
    const recipe = recipes.get(name);
    if (!buf && !recipe) return false;
    if (!makeRoom(p.vol)) return false;
    if (o.key != null) lastKey.set(o.key, t);
    const { out, chain } = chainFor(p);
    const t0 = ctx.currentTime + 0.005;
    const v = { name, out, chain, vol: p.vol, t0, src: null };
    let dur = 0.5;
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.playbackRate.value = clamp(p.rate, 0.25, 4);
      src.connect(out); src.start(t0);
      v.src = src;
      dur = buf.duration / src.playbackRate.value;
    } else {
      try {
        const d = recipe(ctx, out, t0, { vol: p.vol, rate: p.rate, pan: p.pan, seed: Math.random(), remote: p.remote, variant: o.variant == null ? Math.floor(Math.random() * 3) : o.variant });
        if (Number.isFinite(d) && d > 0) dur = Math.min(d, 30);
      } catch (e) { chain.disconnect(); return false; }
    }
    active.push(v);
    setTimeout(() => retire(v), (dur + 0.15) * 1000);
    return true;
  }, false);

  // ---------------------------------------------------------------- loops
  const pendingLoops = [], loops = new Set();
  function startLoop(h) {
    if (h.dead || h.live || !ctx) return;
    const busName = BUSES.includes(h.bus) ? h.bus : 'sfx';
    const { out, chain } = chainFor({ vol: 0, bus: busName, remote: !!h.remote, pan: h.pan || 0 });
    h.out = out; h.chain = chain; h.live = true;
    const file = pickFile(h.name);
    const fade = h.fadeIn == null ? 0.6 : h.fadeIn;
    const begin = buf => {
      if (h.dead) return;
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true; src.connect(out); src.start();
        h.stopFn = () => safe(() => src.stop());
      } else {
        const fn = loopRecipes.get(h.name);
        if (!fn) return;
        try { const st = fn(ctx, out, { vol: h.vol, seed: Math.random(), remote: !!h.remote }); h.stopFn = typeof st === 'function' ? st : null; } catch (e) { return; }
      }
      out.gain.setTargetAtTime(h.vol, ctx.currentTime, fade / 3);
    };
    if (file) load(file).then(buf => begin(buf), () => begin(null)); else begin(null);
  }
  S.loop = (name, opts) => {
    const o = opts || {};
    const h = {
      name, vol: o.vol == null ? 1 : +o.vol, bus: o.bus || 'sfx', remote: !!o.remote, pan: o.pan || 0, fadeIn: o.fade, live: false, dead: false, out: null, chain: null, stopFn: null,
      stop(fade = 0.4) {
        safe(() => {
          if (h.dead) return;
          h.dead = true;
          loops.delete(h);
          const i = pendingLoops.indexOf(h); if (i >= 0) pendingLoops.splice(i, 1);
          if (!h.live || !ctx) return;
          h.out.gain.cancelScheduledValues(ctx.currentTime);
          h.out.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fade) / 3);
          setTimeout(() => { safe(() => h.stopFn && h.stopFn()); safe(() => h.chain.disconnect()); }, (Math.max(0.01, fade) + 0.15) * 1000);
        });
      },
      setVol(v, fade = 0.25) {
        safe(() => {
          v = Math.max(0, +v || 0);
          if (Math.abs(v - h.vol) < 0.01 || h.dead) return;
          h.vol = v;
          if (h.live && ctx) h.out.gain.setTargetAtTime(v, ctx.currentTime, Math.max(0.01, fade) / 3);
        });
      },
    };
    safe(() => {
      if (typeof name !== 'string') { h.dead = true; return; }
      loops.add(h);
      if (unlocked && ctx) startLoop(h); else pendingLoops.push(h);
    });
    return h;
  };

  // ---------------------------------------------------------------- music (streamed <audio>, crossfaded)
  // Each track is an <audio> element looping through a MediaElementSource and its own gain into the music bus.
  // A track that isn't in the manifest is silence: the one playing fades out, nothing errors.
  const tracks = new Map();   // id -> { el, gain }
  let musicCur = null, musicWant;   // (undefined: never asked)
  const music = { bpm: null, current: () => musicCur };
  function trackNode(id) {
    if (tracks.has(id)) return tracks.get(id);
    const el = new Audio();
    el.src = urlOf(fileOf.get(id) || id); el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
    const src = ctx.createMediaElementSource(el), gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain); gain.connect(bus.music);
    const t = { el, gain };
    el.addEventListener('error', () => { tracks.delete(id); safe(() => { gain.disconnect(); src.disconnect(); }); });
    tracks.set(id, t);
    return t;
  }
  function fadeTrack(id, to, fade) {
    const t = tracks.get(id);
    if (!t) return;
    t.gain.gain.cancelScheduledValues(ctx.currentTime);
    t.gain.gain.setTargetAtTime(to, ctx.currentTime, Math.max(0.02, fade) / 3);
    if (to === 0) {
      clearTimeout(t.pauseT);
      t.pauseT = setTimeout(() => { if (musicCur !== id) safe(() => t.el.pause()); }, fade * 1000 + 300);
    } else {
      clearTimeout(t.pauseT);
      const p = t.el.play(); if (p && p.catch) p.catch(() => {});
    }
  }
  const hasTrack = id => !!id && manifest.has('music/' + id);
  let musicLoop = true;
  function applyMusic(id, fade) {
    if (!ctx || !unlocked) return;
    const target = hasTrack(id) ? id : null;
    if (target === musicCur) return;
    if (musicCur) fadeTrack('music/' + musicCur, 0, fade);
    musicCur = target;
    if (layerTimer) { clearTimeout(layerTimer); layerTimer = null; }
    if (target) {
      const t = trackNode('music/' + target);
      t.el.loop = musicLoop;   // (a sting like mus-victory plays once)
      t.el.currentTime = 0;
      fadeTrack('music/' + target, 1, fade);
    }
  }
  // opts: { fade = 1.5, loop = true }
  music.set = (id, opts) => safe(() => {
    const fade = opts && Number.isFinite(opts.fade) ? opts.fade : 1.5;
    musicWant = id || null;
    musicLoop = !(opts && opts.loop === false);
    if (!manifestLoaded) { setTimeout(() => { if (musicWant === (id || null)) music.set(id, opts); }, 400); return; }
    applyMusic(musicWant, fade);
  });
  // the harder variant: '<id>' -> '<id>-b', on the next bar when the tempo is known, else now with a 2 s fade
  let layerTimer = null;
  music.layer = id => safe(() => {
    const b = id + '-b';
    if (!hasTrack(b) || musicCur === b) return;
    musicWant = b;
    if (!ctx || !unlocked) return;
    const cur = musicCur && tracks.get('music/' + musicCur);
    let wait = 0;
    if (music.bpm > 0 && cur && musicCur === id) { const bar = 240 / music.bpm; wait = bar - (cur.el.currentTime % bar); }
    clearTimeout(layerTimer);
    const go = () => {
      layerTimer = null;
      if (musicWant !== b) return;
      const from = musicCur;
      const nt = trackNode('music/' + b);
      if (from && cur) nt.el.currentTime = cur.el.currentTime % (nt.el.duration || Infinity) || 0;
      if (from) fadeTrack('music/' + from, 0, music.bpm > 0 ? 0.6 : 2);
      musicCur = b;
      fadeTrack('music/' + b, 1, music.bpm > 0 ? 0.6 : 2);
    };
    if (wait > 0.02) layerTimer = setTimeout(go, wait * 1000); else go();
  });
  // lower the music for a moment (a big warning, a voice line)
  let duckUntil = 0;
  music.duck = (amount = 0.35, secs = 1.5) => safe(() => {
    if (!ctx || !musicDuck) return;
    const t = ctx.currentTime, g = musicDuck.gain;
    duckUntil = Math.max(duckUntil, t + secs);
    g.cancelScheduledValues(t);
    g.setTargetAtTime(clamp(1 - amount, 0, 1), t, 0.06);
    g.setTargetAtTime(1, duckUntil, 0.35);
  });
  music.has = id => hasTrack(id);   // is this track in the manifest (a boss's '-hard' music is used only if it is)
  S.music = music;

  // ---------------------------------------------------------------- voice lines
  const sayCool = new Map();
  const speaking = new Map();   // speaker -> { until, boss, stop() }
  const lastLine = new Map();
  let speechVoice;
  function pickSpeechVoice() {
    if (speechVoice !== undefined) return speechVoice;
    const vs = safe(() => speechSynthesis.getVoices(), []) || [];
    if (!vs.length) return null;
    const en = vs.filter(v => /^en/i.test(v.lang));
    speechVoice = en.find(v => /male|daniel|david|george|arthur|guy|ryan/i.test(v.name) && !/female/i.test(v.name)) || en[0] || vs[0] || null;
    return speechVoice;
  }
  const isBoss = (sp, o) => !!o.boss || safe(() => typeof BOSSES !== 'undefined' && BOSSES.some(b => b.id === sp || b.name === sp), false);
  S.say = (lineId, opts) => safe(() => {
    const o = opts || {};
    const speaker = o.speaker || 'narrator', text = typeof o.text === 'string' ? o.text : '';
    const tms = nowMs();
    if (o.chance != null && Math.random() >= o.chance) return false;
    const ck = o.cooldownKey || null;
    if (ck && sayCool.has(ck) && tms < sayCool.get(ck)) return false;
    const boss = isBoss(speaker, o);
    // a boss line cuts a hero's bark; a bark never cuts a boss line; one speaker never talks over itself
    for (const [sp, s] of speaking) if (s.until < tms) speaking.delete(sp);
    const anyBoss = [...speaking.values()].some(s => s.boss);
    if (!boss && anyBoss) return false;
    if (speaking.has(speaker) && !(boss && !speaking.get(speaker).boss)) return false;
    if (boss) for (const [sp, s] of speaking) if (!s.boss) { safe(() => s.stop()); speaking.delete(sp); }
    if (ck && o.cooldown > 0) sayCool.set(ck, tms + o.cooldown * 1000);

    let played = false, stop = () => {};
    let dur = Number.isFinite(o.seconds) && o.seconds > 0 ? o.seconds : text ? clamp(0.9 + text.split(/\s+/).length / 2.6, 1.2, 9) : 1.5;
    // the file: opts.file ('voice/<lineId>-<n>', when the caller picked the variant), else a random '<lineId>-<n>'
    const ids = typeof o.file === 'string' && manifest.has(o.file) ? [o.file] : (variants.get('voice/' + lineId) || []).filter(id => /-\d+$/.test(id));
    const canPlay = unlocked && ctx && !suspended && !cfg.mute && cfg.master > 0 && cfg.voice > 0;
    if (ids.length && canPlay) {
      let id;
      if (ids.length === 1) id = ids[0]; else { do id = ids[Math.floor(Math.random() * ids.length)]; while (id === lastLine.get(lineId)); }
      lastLine.set(lineId, id);
      const buf = ready(id);
      const start = b => {
        if (!b || !ctx) return null;
        const { out, chain } = chainFor({ vol: o.vol == null ? 1 : o.vol, bus: 'voice' });
        const src = ctx.createBufferSource(); src.buffer = b; src.connect(out); src.start();
        const v = { name: id, out, chain, vol: 1.5, t0: ctx.currentTime, src };   // (voices outrank effects in the cap)
        active.push(v);
        setTimeout(() => retire(v), (b.duration + 0.2) * 1000);
        return () => kill(v, 0.08);
      };
      if (buf) { stop = start(buf) || stop; dur = buf.duration; played = true; }
      else {
        // not decoded yet: it plays when it is, if that's soon enough to still belong to the moment
        const asked = nowMs();
        let cancelled = false;
        stop = () => { cancelled = true; };
        load(id).then(b => { if (!cancelled && b && nowMs() - asked < 900) { const st = start(b); if (st) stop = st; } });
        played = true;
      }
    } else if (text && cfg.speech && canPlay && HAS_WIN && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      const h = o.voiceHint || {};
      u.pitch = clamp(Number.isFinite(h.pitch) ? h.pitch : boss ? 0.6 : 0.9, 0, 2);
      u.rate = clamp(Number.isFinite(h.rate) ? h.rate : boss ? 0.85 : 1, 0.5, 2);
      u.volume = clamp(cfg.master * cfg.voice, 0, 1);
      const v = pickSpeechVoice(); if (v) u.voice = v;
      if (boss) speechSynthesis.cancel();
      speechSynthesis.speak(u);
      dur = dur / u.rate;
      stop = () => safe(() => speechSynthesis.cancel());
      played = true;
    }
    if (played) speaking.set(speaker, { until: tms + dur * 1000, boss, stop });
    if (played && o.duck !== false) music.duck(0.35, dur);
    let captioned = false;
    if (text && o.caption !== false && cfg.captions && typeof Captions !== 'undefined' && Captions.show) {
      safe(() => Captions.show(speaker, text, dur));
      captioned = true;
      if (!played) speaking.set(speaker, { until: tms + dur * 1000, boss, stop });
    }
    return played || captioned;
  }, false);

  // ---------------------------------------------------------------- settings, control, debug
  S.get = k => (k in cfg ? cfg[k] : undefined);
  S.set = (k, v) => safe(() => {
    if (!(k in DEFAULTS)) return;
    cfg[k] = typeof DEFAULTS[k] === 'boolean' ? !!v : clamp(Number(v) || 0, 0, 1);
    persist();
    if (k === 'mute' || k === 'master') applyBus('master');
    else if (BUSES.includes(k)) applyBus(k);
    if (k === 'speech' && !cfg.speech && HAS_WIN && 'speechSynthesis' in window) safe(() => speechSynthesis.cancel());
    if (HAS_WIN) safe(() => window.dispatchEvent(new CustomEvent('emberfall-audio', { detail: { key: k, value: cfg[k] } })));
  });
  S.defaults = () => Object.assign({}, DEFAULTS);
  S.stopAll = () => safe(() => {
    for (const v of active.slice()) kill(v, 0.05);
    for (const h of [...loops]) h.stop(0.1);
    for (const s of speaking.values()) safe(() => s.stop());
    speaking.clear();
  });
  S.suspend = () => safe(() => { suspended = true; if (ctx && ctx.state === 'running') ctx.suspend(); if (HAS_WIN && 'speechSynthesis' in window) speechSynthesis.cancel(); });
  S.resume = () => safe(() => { suspended = false; if (ctx && unlocked && ctx.state === 'suspended') ctx.resume(); });
  if (HAS_WIN && typeof document !== 'undefined') document.addEventListener('visibilitychange', () => (document.hidden ? S.suspend() : S.resume()));
  S.stats = () => safe(() => ({
    ready: S.ready, state: ctx ? ctx.state : 'none', voices: active.length, loops: loops.size, recipes: recipes.size, loopRecipes: loopRecipes.size,
    files: manifest.size, decoded: [...buffers.values()].filter(b => b && typeof b === 'object' && !(b instanceof Promise)).length,
    music: musicCur, buses: { master: busLevel('master'), sfx: cfg.sfx, ui: cfg.ui, voice: cfg.voice, music: cfg.music, amb: cfg.amb }, mute: cfg.mute,
  }), {});
  // __sound.test(): a short run through what's defined (call after a click on the page)
  S.test = (names) => safe(() => {
    const list = Array.isArray(names) && names.length ? names : ['ui-click', 'ui-open', 'pull-count', 'pull-go', 'tg-raidwide', 'hit-heavy', 'heal-land', 'clear'];
    const had = list.filter(n => S.has(n));
    if (!unlocked) unlock();
    had.forEach((n, i) => setTimeout(() => S.play(n, { bus: n.startsWith('ui-') ? 'ui' : 'sfx' }), i * 650));
    return { playing: had, missing: list.filter(n => !S.has(n)), stats: S.stats() };
  });
  S._unlock = unlock;
  return S;
})();

if (typeof window !== 'undefined') window.__sound = Sound;
if (typeof module !== 'undefined') module.exports = { Sound };
