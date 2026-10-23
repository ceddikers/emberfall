// The game's side of the sound (audio.js is the engine): which sound each moment makes, the beds that follow the
// scene (town ambience, the portal's hum, the low-health heartbeat, title and town music), and the interface's clicks
// and panel sounds. main.js and the other game files call these through one guarded line each; every function here
// is a no-op when Sound (or SfxMap / VoiceLines) is missing, and never throws.
//
// Mix (vol before the buses): boss telegraph cues 1.0 and "about to die" cues ~0.9 sit on top; your own abilities
// 0.7; other heroes and bots go through Sound's remote path (half volume, a little low-pass); town beds well under.

const SoundHooks = (() => {
  const has = () => typeof Sound !== 'undefined';
  const play = (n, o) => (has() ? Sound.play(n, o) : false);
  const vo = (ev, data) => { try { if (typeof VoiceLines !== 'undefined' && VoiceLines.onEvent) VoiceLines.onEvent(ev, data || {}); } catch (e) { /* the voice data's own problem */ } };
  const safe = fn => { try { return fn(); } catch (e) { return undefined; } };

  // ---------------------------------------------------------------- abilities
  // SfxMap (sfx-map.js) names the sound(s) for a move; without it, 'ab-<kind>' from the move's own anim / auto kind
  // (the fallback: a move's anim or an auto's kind, read as the nearest sound family in docs/art/sounds.md)
  const KIND = { attack: 'ab-slash', axe: 'ab-heavy', bash: 'ab-heavy', big: 'ab-heavy', uppercut: 'ab-punch', flurry: 'ab-punch', brace: 'shield-up', guard: 'shield-up',
    dash: 'dash', spark: 'ab-fire', cast: 'ab-cast' };
  function abilityNames(classId, abId, kind) {
    const r = safe(() => (typeof SfxMap !== 'undefined' && SfxMap.forAbility ? SfxMap.forAbility(classId, abId, kind) : undefined));
    if (r === undefined) return kind ? [KIND[kind] || 'ab-' + kind] : [];
    return Array.isArray(r) ? r : r ? [r] : [];
  }
  // voice-limiting for other heroes' sounds: in a busy 4-player raid at most a few of their ability sounds start inside
  // a short window (your own, telegraph and boss cues are never limited and outrank them in the engine's voice cap).
  // Autos give way first (at 2 within the window), abilities next (at 3); a crowded moment also thins what plays.
  const remoteAt = [];
  function remoteSlot(isAuto) {
    const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
    while (remoteAt.length && t - remoteAt[0] > 300) remoteAt.shift();
    if (remoteAt.length >= (isAuto ? 2 : 3)) return 0;
    remoteAt.push(t);
    return remoteAt.length > 1 ? 0.75 : 1;
  }
  // a move pressed: yours (mine) at full presence, anyone else's quieter and placed where they stand
  function ability(classId, ab, mine, at, who) {
    if (!has() || !ab) return;
    safe(() => {
      const k = mine ? 1 : remoteSlot(false);
      if (k) for (const n of abilityNames(classId, ab.id, ab.anim)) play(n, mine ? { vol: 1 } : { vol: 0.45 * k, remote: true, at, key: 'ab:' + who + ':' + n, minGap: 0.06 });
      if (ab.ult) play('ult-fire', mine ? { vol: 0.95 } : { vol: 0.9, remote: true, at });
    });
  }
  function auto(classId, kind, mine, at, who) {
    if (!has()) return;
    // (autos land every ~2 s and share the ability loudness target, so they sit about 3 dB under the ability level)
    safe(() => { const k = mine ? 1 : remoteSlot(true); if (k) for (const n of abilityNames(classId, 'auto', kind)) play(n, { vol: (mine ? 0.22 : 0.2) * k, remote: !mine, at: mine ? null : at, key: 'auto:' + who, minGap: 0.2 }); });
  }
  // a Gloomsworn's Hollow (the host's 'hollow' moment, ability-vfx.js CLASS_FEV.hollow): the knight goes hollow, is sealed
  // (ok) or breaks. Full for your own hero, soft and placed for anyone else's
  function hollow(msg, mine, at) {
    if (!has() || !msg) return;
    safe(() => {
      const n = msg.on ? 'gloom-hollow-on' : msg.ok ? 'gloom-hollow-off' : 'gloom-hollow-break';
      play(n, mine ? { vol: 0.9, key: 'gloom-hollow', minGap: 0.3 } : { vol: 0.4, remote: true, at, key: 'gloom-hollow:' + (msg.id || ''), minGap: 0.5 });
    });
  }
  // a Reaper's moments (class id thresher; ability-vfx.js KIT_VFX handlers call this): an affliction coming due (a soft far toll, your own hero only), a
  // payout's ping, cracked thud or faint puff (the pings climb for each one in a Reap), a Gate strike (a note that rises with each of the five) and its bloom
  let popAt = -9, popN = 0;
  function thresher(ev, d, mine, at, who) {
    if (!has()) return;
    safe(() => {
      const rem = (key, vol) => ({ vol: vol * 0.45, remote: true, at, key: key + ':' + (who || ''), minGap: 0.1 });
      if (ev === 'ripe') { if (mine) play('gold-ripe', { vol: 0.4, key: 'gold-ripe', minGap: 0.2 }); return; }
      if (ev === 'pop') {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
        popN = now - popAt < 0.9 ? popN + 1 : 0; popAt = now;
        const s = (d && d.s) || 2, o = mine ? { key: 'th-pop', minGap: 0.05, rate: 1 + Math.min(popN, 4) * 0.09 } : rem('th-pop', 0.6);
        if (s === 2) play('gold-pop', Object.assign({ vol: 0.7 }, o)); else if (s === 3) play('thresher-rot', Object.assign({ vol: 0.7 }, o)); else play('thresher-pop', Object.assign({ vol: 0.6 }, o));
        return;
      }
      if (ev === 'gate-strike') { const n = (d && d.n) | 0; play('thresher-gate-tone', mine ? { vol: 0.7, rate: 1 + n * 0.13, key: 'th-gate', minGap: 0.1 } : Object.assign(rem('th-gate', 0.7), { rate: 1 + n * 0.13 })); return; }
      if (ev === 'gate-release') play('thresher-gate-bloom', mine ? { vol: 0.9, key: 'th-gate', minGap: 0.1 } : rem('th-gate', 0.9));
    });
  }
  // your own cast bar's quiet hum
  let castHum = null;
  // (a cast gets a soft, higher 'gathering' blip of its own sound at the press, a very quiet hum under the bar, and the full
  // sound at release: the bar used to be only the hum, which read as the sound of the ability)
  function castStart(classId, ab) {
    if (!has()) return;
    castEnd(0.05);
    if (ab) safe(() => { const n = abilityNames(classId, ab.id, ab.anim)[0]; if (n) play(n, { vol: 0.3, rate: 1.3, key: 'castbegin', minGap: 0.1 }); });
    castHum = Sound.loop('ab-cast-loop', { vol: 0.12, fade: 0.25 });
  }
  function castEnd(fade = 0.18) { if (castHum) { castHum.stop(fade); castHum = null; } }

  // ---------------------------------------------------------------- the boss
  // a telegraph's mechanic type (fight.js mech.type) -> its cue. These carry information: the loudest layer.
  const TG = {
    raidwide: 'tg-raidwide', buster: 'tg-buster', aoe: 'tg-aoe', proximity: 'tg-aoe', drop: 'tg-aoe', own: 'tg-aoe', polarity: 'tg-aoe',
    rodstrike: 'tg-aoe', stack: 'tg-stack', spread: 'tg-spread', chain: 'tg-spread', tower: 'tg-tower', gaze: 'tg-gaze', dark: 'tg-gaze',
    audience: 'tg-gaze', gale: 'tg-knockback', knockback: 'tg-knockback', hook: 'tg-charge', lunge: 'tg-charge', charge: 'tg-charge',
  };
  let lastCast = { at: 0, names: null };
  // a telegraph appearing: its type cue (once per type per moment; a cast that laid five circles plays one)
  function telegraph(type, hidden) {
    const n = TG[type];
    if (!n || hidden) return;
    if (play(n, { vol: 1, key: 'tg:' + n, minGap: 0.5 }) && (type === 'raidwide' || type === 'buster') && has()) Sound.music.duck(0.3, 1.2);
  }
  // a cast starting: the move's own cue (SfxMap.forBossMove), heard from the first moment of the bar
  function bossCast(bossId, name, anim) {
    if (!has()) return;
    safe(() => {
      const r = typeof SfxMap !== 'undefined' && SfxMap.forBossMove ? SfxMap.forBossMove(bossId, name, anim) : null;
      const names = Array.isArray(r) ? r : r ? [r] : [];
      for (const n of names) play(n, { vol: 0.95, key: 'bmove:' + n, minGap: 0.3 });
      if (anim === 'enrage') { play('enrage', { vol: 1 }); Sound.music.duck(0.4, 3); }
    });
  }
  // a telegraph landing
  function impact(type, hitMe) {
    const heavy = hitMe || type === 'raidwide' || type === 'buster' || type === 'tower' || type === 'stack';
    play(heavy ? 'boss-impact-heavy' : 'boss-impact-light', { vol: heavy ? 0.9 : 0.7, key: 'bimp', minGap: 0.12 });
  }

  // ---------------------------------------------------------------- music
  const music = (id, o) => { if (has()) safe(() => Sound.music.set(id, o)); };
  // the phase (course) where Normal crossfades into the boss's Hard track, late in the fight
  const LAYER_AT = { grubnak: 3, skitterra: 3, volkar: 3, hollowking: 5, wyrm: 4, titan: 3, archmage: 4, hydra: 4 };
  function phase(bossId, n) {
    // (on Hard that track plays the whole fight: it is not layered over)
    if (has() && LAYER_AT[bossId] && n >= LAYER_AT[bossId] && !/-hard$/.test(String(Sound.music.current() || ''))) safe(() => Sound.music.layer('mus-' + bossId));
  }
  // the fight's track: 'mus-<boss>-hard' on Hard if that track exists, else 'mus-<boss>'
  function bossTrack(bossId, mode) {
    const hard = 'mus-' + bossId + '-hard';
    return mode === 'hard' && has() && Sound.music.has && Sound.music.has(hard) ? hard : 'mus-' + bossId;
  }

  // ---------------------------------------------------------------- the scene's beds, once a frame
  let amb = null, hum = null, heart = null, wasLow = false, musicScene = null, lastStep = 0;
  const STEP = { grass: 'step-grass', stone: 'step-stone', wood: 'step-wood' }, STEP_O = { vol: 0.2 };   // (made once: nothing new per frame)
  const inRect = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  function ground(x, y) {
    if (typeof TOWN === 'undefined') return 'grass';
    if (TOWN.deck && inRect(x, y, TOWN.deck)) return 'wood';
    if (TOWN.plaza && Math.hypot(x - TOWN.plaza.x, y - TOWN.plaza.y) < TOWN.plaza.r) return 'stone';
    if (TOWN.portal && Math.hypot(x - TOWN.portal.x, y - TOWN.portal.y) < 165) return 'stone';
    if (TOWN.terrace && inRect(x, y, TOWN.terrace)) return 'stone';
    return 'grass';
  }
  // scene: 'title' | 'town' | 'arena'; x, y: the local hero; moving: walking; hpFrac / alive: in the arena
  function tick(scene, x, y, moving, hpFrac, alive) {
    if (!has()) return;
    try {
      Sound.setListener(x, y);
      const town = scene === 'town';
      if (town && !amb) amb = Sound.loop('amb-town', { bus: 'amb', vol: 0.5, fade: 2 });
      else if (!town && amb) { amb.stop(1.2); amb = null; }
      // the portal hums louder the nearer you are (a bed, on the ambience bus)
      const P = typeof TOWN !== 'undefined' ? TOWN.portal : null;
      const pv = town && P ? Math.max(0, 1 - Math.hypot(x - P.x, y - P.y) / 650) : 0, pvol = pv * pv * 0.8;
      if (pvol > 0.01) { if (!hum) hum = Sound.loop('portal-hum', { bus: 'amb', vol: pvol, fade: 1 }); else hum.setVol(pvol, 0.3); }
      else if (hum) { hum.stop(0.8); hum = null; }
      if (town && moving) { const t = performance.now(); if (t - lastStep > 360) { lastStep = t; play(STEP[ground(x, y)], STEP_O); } }
      // below a quarter of your health, alive, in a fight: the heartbeat
      const low = scene === 'arena' && alive && hpFrac > 0 && hpFrac < 0.25;
      if (low && !heart) heart = Sound.loop('low-hp', { vol: 0.85, fade: 0.2 });
      else if (!low && heart) { heart.stop(0.6); heart = null; }
      if (low && !wasLow) vo('hero-low', {});
      wasLow = low;
      // title and town music follow the scene (the arena's is set by the fight: pull, clear, wipe)
      if (scene !== musicScene) {
        musicScene = scene;
        if (scene === 'title') music('mus-title');
        else if (scene === 'town') music('mus-town', { fade: 2.5 });
      }
    } catch (e) { /* never into the game loop */ }
  }
  // counted stacks filling (a class's whole-number gauge, Pyromancer's two sparks): a rising tick on each gain, a fuller one when full
  let stackKit = null, stackWas = {};
  function stacks(kit) {
    if (!has() || !kit) return;
    try {
      if (kit !== stackKit) { stackKit = kit; stackWas = null; }
      const g = kit.def && kit.def.gauge, cur = {};
      if (g && g.key === 'heat') cur.sparks = kit.has('hotstreak') ? 2 : kit.has('heating') ? 1 : 0;
      else if (g && g.max < 20 && typeof kit.g[g.key] === 'number') cur.pips = Math.floor(kit.g[g.key]);
      if (stackWas) {
        if (cur.sparks > (stackWas.sparks || 0)) play(cur.sparks >= 2 ? 'stack-2' : 'stack-1', { vol: 0.9 });
        else if (cur.pips > (stackWas.pips || 0)) play('pip-up', { vol: 0.7, rate: Math.min(1.6, 0.9 + 0.1 * cur.pips) });
      }
      stackWas = cur;
    } catch (e) { /* never into the game loop */ }
  }
  function stopBeds() { for (const h of [amb, hum, heart]) if (h) h.stop(0.3); amb = hum = heart = null; castEnd(0.1); }

  // ---------------------------------------------------------------- the interface
  // every button, slot and menu entry clicks; panels make a paper sound opening and closing
  const PANELS = ['overlay', 'boss-panel', 'select', 'inventory', 'journal', 'options', 'loot', 'practice', 'talents', 'tutorial', 'callouts', 'results', 'dialogue', 'join',
    'pt-book', 'pt-bounties', 'pt-fish'];
  function wireUI() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', e => {
      const t = e.target && e.target.closest && e.target.closest('button, .btn2, .cta, .slot, [role="menuitem"], .menu-entry, .kb-key, .pr-ph');
      if (t && !t.disabled && t.getAttribute('aria-disabled') !== 'true') play('ui-click', { bus: 'ui', vol: 0.8, key: 'ui-click', minGap: 0.04 });
    }, true);
    const watched = new Map();   // element -> was open
    const isOpen = el => !el.classList.contains('hidden') && el.isConnected;
    const obs = typeof MutationObserver !== 'undefined' ? new MutationObserver(recs => {
      for (const r of recs) {
        const el = r.target, was = watched.get(el), open = isOpen(el);
        if (was === open) continue;
        watched.set(el, open);
        play(open ? 'ui-open' : 'ui-close', { bus: 'ui', vol: 0.7, key: 'ui-panel', minGap: 0.1 });
      }
    }) : null;
    // panels are made as they're first opened: look for new ones every second (a handful of lookups, not per frame)
    const scan = () => {
      if (!obs) return;
      for (const id of PANELS) {
        const el = document.getElementById(id);
        if (el && !watched.has(el)) { watched.set(el, isOpen(el)); obs.observe(el, { attributes: true, attributeFilter: ['class'] }); }
      }
    };
    scan();
    setInterval(scan, 1000);
    // the mute chip beside the Options cog (index.html #snd-btn), kept in step with the Options panel's Mute box
    const chip = document.getElementById('snd-btn');
    if (chip && has()) {
      const sync = () => chip.classList.toggle('muted', !!Sound.get('mute'));
      sync();
      chip.addEventListener('click', () => { Sound.set('mute', !Sound.get('mute')); });
      window.addEventListener('emberfall-audio', sync);
    }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireUI); else wireUI();
  }

  return { play, vo, ability, auto, hollow, thresher, castStart, castEnd, stacks, telegraph, bossCast, impact, music, phase, bossTrack, tick, stopBeds, ground, TG };
})();

if (typeof module !== 'undefined') module.exports = { SoundHooks };
