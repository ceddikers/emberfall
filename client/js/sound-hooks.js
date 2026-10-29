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
  // a Reaper's moments (class id thresher; ability-vfx.js KIT_VFX handlers call this): a string's swing (a thin blue edge that climbs for each of the four), the four finishers, the quake ring,
  // a rune laid (a glassy chime, a different note for each kind and deeper when empowered), a mark popped by the Snap (a different pop for each kind, a doubled echo on a Harvest Moon),
  // a Full Harvest, a Harvest Moon, the Void Star opening and collapsing, a string timing out, Dusk Veil, Insane Reaper, the Blink and the slashes that come with it, Danse Macabre and the Gate
  // (a strike climbing for each empowered mark, Gatebreaker, the fifth swing's release, the close). The casts themselves sound from the ability (sfx-map.js). Yours full, anyone else's soft and placed
  function thresher(ev, d, mine, at, who) {
    if (!has()) return;
    safe(() => {
      const o = (key, vol, extra) => Object.assign(mine ? { vol, key, minGap: 0.05 } : { vol: vol * 0.45, remote: true, at, key: key + ':' + (who || ''), minGap: 0.12 }, extra);
      const n = Math.max(0, Math.min(4, (d && d.n) | 0)), id = d && d.id != null ? ':' + d.id : '';
      const kd = d && /^(drain|bind|death|thread|phantom)$/.test(d.kind) ? d.kind : 'drain', emp = !!(d && d.emp);
      if (ev === 'swing') play('reaper-swing', o('rp-swing', 0.45, { rate: 1 + n * 0.12 }));
      else if (ev === 'finish') play('reaper-finish' + Math.max(1, Math.min(4, n || 1)), o('rp-finish', 0.8, { minGap: 0.2 }));
      else if (ev === 'quake') play('reaper-quake', o('rp-quake', 0.7, { minGap: 0.3 }));
      else if (ev === 'rune') play(emp ? 'reaper-rune-emp' : 'reaper-rune', o('rp-rune-' + kd + id, emp ? 0.5 : 0.4, { rate: { drain: 1, bind: 0.89, death: 0.75, thread: 1.33, phantom: 1.19 }[kd] * (emp ? 0.84 : 1) }));
      else if (ev === 'snap-pop') {
        const nm = 'reaper-pop-' + (kd === 'phantom' ? 'thread' : kd), op = o('rp-pop-' + kd + id, emp ? 0.8 : 0.65, { rate: emp ? 0.88 : 1 });
        play(nm, op);
        if (d && d.twice) setTimeout(() => safe(() => play(nm, Object.assign({}, op, { vol: op.vol * 0.6, rate: (op.rate || 1) * 0.95, key: op.key + 'b' }))), 130);
      }
      else if (ev === 'full-harvest') play('reaper-harvest', o('rp-harvest' + id, 0.75, { minGap: 0.1 }));
      else if (ev === 'harvest-moon') play('reaper-moon', o('rp-moon', 0.7, { minGap: 0.3 }));
      else if (ev === 'star-open') play('reaper-star-open', o('rp-star', 0.7, { minGap: 0.3 }));
      else if (ev === 'star-collapse') play('reaper-star-collapse', o('rp-collapse', 0.85, { minGap: 0.3 }));
      else if (ev === 'string-end') { if (d && d.ok === false) play('reaper-slack', o('rp-slack', 0.5, { minGap: 0.3 })); }
      else if (ev === 'veil') play('reaper-veil', o('rp-veil', 0.6, { minGap: 0.3 }));
      else if (ev === 'frenzy') play('reaper-frenzy', o('rp-frenzy', 0.55, { minGap: 0.3 }));
      else if (ev === 'blink') play('reaper-blink', o('rp-blink', 0.5, { minGap: 0.1 }));
      else if (ev === 'blink-slash') play('reaper-slash', o('rp-slash', 0.6, { minGap: 0.1 }));
      else if (ev === 'phantom-slash') play('reaper-slash', o('rp-pslash', 0.45, { rate: 0.82, minGap: 0.1 }));
      else if (ev === 'afterimage-hit') play('reaper-slash', o('rp-ahit', 0.4, { rate: 1.3, minGap: 0.1 }));
      else if (ev === 'danse') play('reaper-danse', o('rp-danse' + id, 0.5, { minGap: 0.1 }));
      else if (ev === 'gate-open') play('reaper-gate-open', o('rp-gate-open', 0.5, { minGap: 0.3 }));
      else if (ev === 'gate-strike') play('reaper-gate-tone', o('rp-gate', 0.7, { rate: 1 + n * 0.13, minGap: 0.1 }));
      else if (ev === 'gatebreaker') play('reaper-gatebreaker', o('rp-gb', 0.6, { minGap: 0.3 }));
      else if (ev === 'gate-release') play('reaper-gate-bloom', o('rp-gate-rel', 0.9, { minGap: 0.2 }));
      else if (ev === 'gate-close') play('reaper-gate-close', o('rp-gate-close', 0.5, { minGap: 0.3 }));
    });
  }
  // a Tidecaller's moments (class id tidecaller; ability-vfx.js KIT_VFX handlers call this): the crest (a pearl note and a wash of foam), slack water, a Riptide Mark
  // popping, the wave of a Surge (its pitch follows how high the water was), the Drowned Bell, the flood's gulls and the Leviathan's crash. Yours full, anyone else's soft and placed
  function tidecaller(ev, d, mine, at, who) {
    if (!has()) return;
    safe(() => {
      const o = (key, vol, extra) => Object.assign(mine ? { vol, key, minGap: 0.1 } : { vol: vol * 0.45, remote: true, at, key: key + ':' + (who || ''), minGap: 0.2 }, extra);
      if (ev === 'crest') play('tide-crest', o('tc-crest', 0.5));
      else if (ev === 'slack') { if (mine) play('tide-slack', o('tc-slack', 0.3)); }
      else if (ev === 'pop') play('tide-pop', o('tc-pop', 0.7));
      else if (ev === 'surge') { const f = (d && d.f) || 0; play('tide-wave', o('tc-wave', 0.5 + 0.4 * f, { rate: 0.85 + 0.4 * f })); }
      else if (ev === 'bell') play('tide-bell', o('tc-bell', 0.8));
      else if (ev === 'flood') setTimeout(() => safe(() => play('tide-gull', o('tc-gull', 0.35))), 800);
      else if (ev === 'leviathan') play('tide-crash', o('tc-crash', 0.9));
    });
  }
  // a Lanternkeeper's moments (class id lanternkeeper; ability-vfx.js KIT_VFX handlers call this): an Ember gained, a lantern snuffed, a small light dropped by the
  // Stride, the Lighthouse going dark, the Eternal Lamp lit, Trailing Sparks, a Pillar of Flame and Pilgrim's Pace. The casts themselves sound from the ability
  // (sfx-map.js). Yours full, anyone else's soft and placed; the drops of a Stride are very quiet and rate-limited
  function lanternkeeper(ev, d, mine, at, who) {
    if (!has()) return;
    safe(() => {
      const o = (key, vol, extra) => Object.assign(mine ? { vol, key, minGap: 0.1 } : { vol: vol * 0.45, remote: true, at, key: key + ':' + (who || ''), minGap: 0.25 }, extra);
      if (ev === 'ember') { if (mine) play('lamp-ember', o('lk-ember', 0.5)); }
      else if (ev === 'snuff') play('lamp-snuff', o('lk-snuff', 0.5));
      else if (ev === 'drop') play('lamp-drop', o('lk-drop', 0.35, { minGap: 0.3 }));
      else if (ev === 'end') { if (mine) play('lamp-end', o('lk-end', 0.5)); }
      else if (ev === 'eternal') play('lamp-eternal', o('lk-eternal', 0.7));
      else if (ev === 'sparks') play('lamp-sparks', o('lk-sparks', 0.55));
      else if (ev === 'pillar') play('lamp-pillar', o('lk-pillar', 0.6, { minGap: 0.5 }));
      else if (ev === 'pilgrim') { if (mine) play('lamp-pilgrim', o('lk-pilgrim', 0.5)); }
    });
  }
  // a Kenseier's moments (class id kenseier; ability-vfx.js KIT_VFX handlers call this): a Perfect (a high clean clang, lower on a tankbuster), a Good (a duller clank),
  // a deflect with nothing to meet, a step through a blow, a Break's glass crack, the stagger of going Off-balance, the Deathblow's drawn-out whoosh and thump, a Pommel,
  // a Redirect, Blazing Mantle catching and Iai's counter-cut. The casts themselves sound from the ability (sfx-map.js). Yours full, anyone else's soft and placed
  function kenseier(ev, d, mine, at, who) {
    if (!has()) return;
    safe(() => {
      const o = (key, vol, extra) => Object.assign(mine ? { vol, key, minGap: 0.05 } : { vol: vol * 0.45, remote: true, at, key: key + ':' + (who || ''), minGap: 0.15 }, extra);
      if (ev === 'perfect') play('ken-perfect', o('ken-perfect', 0.85, d && d.b ? { rate: 0.82 } : null));
      else if (ev === 'good') play('ken-good', o('ken-good', 0.7, d && d.b ? { rate: 0.85 } : null));
      else if (ev === 'miss') { if (mine) play('ken-miss', o('ken-miss', 0.5)); }
      else if (ev === 'pass') play('ken-pass', o('ken-pass', 0.6));
      else if (ev === 'break') play('ken-break', o('ken-break', 0.8, { minGap: 0.3 }));
      else if (ev === 'off') { if (mine) play('ken-off', o('ken-off', 0.6, { minGap: 0.3 })); }
      else if (ev === 'deathblow') play('ken-deathblow', o('ken-deathblow', d && d.u ? 0.95 : 0.8, { minGap: 0.3 }));
      else if (ev === 'pommel') play('ken-pommel', o('ken-pommel', 0.6));
      else if (ev === 'redirect') play('ken-redirect', o('ken-redirect', 0.7, d && d.b ? { rate: 0.9 } : null));
      else if (ev === 'blaze') play('ken-blaze', o('ken-blaze', 0.7, { minGap: 0.3 }));
      else if (ev === 'iai') play('ken-iai', o('ken-iai', 0.7));
    });
  }
  // a Houndmaster's moments (class id houndmaster; ability-vfx.js KIT_VFX handlers call this): Hold's and Pounce's whistles (Flank's and Call Off's are the moves themselves), a bark for each hound (Rust lower,
  // Ash quicker, Greyfang deep, the Wild Hunt ghosts far off), a bite and a big one, the pair finishers, the pounce landing, Call Off arriving, Relay, a hound downed and back up, the Quarry marked,
  // the horn of Wild Hunt, Mount, Ride Down, Howl and the Long Chase. Yours full, anyone else's soft and placed
  function houndmaster(ev, d, mine, at, who) {
    if (!has()) return;
    safe(() => {
      const o = (key, vol, extra) => Object.assign(mine ? { vol, key, minGap: 0.05 } : { vol: vol * 0.45, remote: true, at, key: key + ':' + (who || ''), minGap: 0.15 }, extra);
      const hid = d && typeof d.hound === 'string' ? d.hound : '';
      if (ev === 'whistle') { if (d && d.kind === 'hold') play('hm-whistle-hold', o('hm-wh', 0.7, { minGap: 0.3 })); else if (d && d.kind === 'pounce') play('hm-whistle-pounce', o('hm-wp', 0.75, { minGap: 0.3 })); }
      else if (ev === 'bark') play(hid === 'ash' ? 'hm-bark-ash' : hid === 'greyfang' ? 'hm-bark-greyfang' : /^sp/.test(hid) ? 'hm-bark-ghost' : 'hm-bark-rust', o('hm-bark-' + hid, 0.6, { minGap: 0.2 }));
      else if (ev === 'bite') play(d && d.big ? 'hm-bite-big' : 'hm-bite', o('hm-bite-' + hid, d && d.big ? 0.75 : 0.45, { minGap: d && d.big ? 0.12 : 0.08 }));
      else if (ev === 'finisher') {
        const p = d && d.pair;
        play(p === 'rend' ? 'hm-rend' : p === 'hamstring' ? 'hm-hamstring' : p === 'bringdown' ? 'hm-bringdown' : 'hm-snap', o('hm-fin', 0.85, { minGap: 0.2 }));
      }
      else if (ev === 'pounce') play('hm-pounce', o('hm-pounce', 0.7, { minGap: 0.3 }));
      else if (ev === 'calloff') play('hm-calloff', o('hm-calloff', 0.6, { minGap: 0.3 }));
      else if (ev === 'relay') play('hm-relay', o('hm-relay', 0.6, { minGap: 0.3 }));
      else if (ev === 'houndDown') { if (mine || (d && d.hound)) play('hm-down', o('hm-down-' + hid, 0.65, { minGap: 0.3 })); }
      else if (ev === 'houndUp') play('hm-up', o('hm-up-' + hid, 0.55, { minGap: 0.3 }));
      else if (ev === 'quarry') play('hm-quarry', o('hm-quarry', 0.6, { minGap: 0.3 }));
      else if (ev === 'wildhunt') play('hm-horn', o('hm-horn', 0.8, { minGap: 0.5 }));
      else if (ev === 'mount') play('hm-mount', o('hm-mount', 0.65, { minGap: 0.3 }));
      else if (ev === 'ridedown') play('hm-ridedown', o('hm-ridedown', 0.8, { minGap: 0.3 }));
      else if (ev === 'howl') play('hm-howl', o('hm-howl', 0.75, { minGap: 0.5 }));
      else if (ev === 'longchase') play('hm-longchase', o('hm-longchase', 0.7, { minGap: 0.5 }));
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

  // ---------------------------------------------------------------- the Ultimate (boss id sovereign; the contract is docs/plans/2026-10-ultimate-build.md)
  // The Sovereign's own casts sound from bossCast (SfxMap: Kindling, Brand, Ashen Sweep, the call's names ...). What a cast cannot say is read off the
  // room's events and the set pieces: main.js hands each 'roomev' to sovereignRoom(msg) and each 'setpiece' to sovereignSetPiece(id) while the raid is the
  // Ultimate, and the Brand's burn tick on you to sovereignBurn().
  //   svecho:<n> with who   an echo called: its sting at once, the cinder-assembly when the flame lands (fly s later), the crumble when it ends or its time is up
  //   svecho:<n> without who  the answer landed: the echo crumbles now
  //   svechoact:<n> { anim: 'bell' }  the Hollow King's bell
  //   svflambe:<n>   Flambe Service: a lid per plate (at[i]), a flambe line behind each plate but the last, the Mince after the last plate
  //   svfuse:<n>   a knot breaks and its flame runs out along the thread;  svshadow:<n>   her shadow drops on every whole thread
  //   svlantern:<n>   the Hollow King's lantern flame in flight, then the lantern set down;  telegraph tags (the host's 'tg' message, read by svWire below): svSurge and
  //   svReplay sound as they land, the Ember and Ash drift (the 'svdrift' message) is a quiet magnetic hum while it lasts
  //   svglass:<n>   Glass Floor's wave: one shatter for every ring of sheets as the crack reaches it;  svsheets   the water of a sheet that has sunk
  //   svhead:<k>   a head rising;  svbite:<n>   its bite, from the head;  svcut:<k>   a head cut;  svdive:<n>   Cinder Dive: the line lit, the fall and the landing, the
  //   water coming to the boil, the steam bursting (the casts Glass Floor, Heads of Flame, Cinder Dive and Aftershock sound from bossCast)
  //   svtwin:<n>   Twin Brands' wall lighting in its element (fire, frost, bolt, void: sv-twin-<el>, placed at the wall), the shift (sv-twin-shift, then the new wall) and the
  //   resolving (meet at the wall circle, or the bloom: it lands 'at' s after the message, and a shifted cast's first wall never bursts, so its timer is dropped)
  //   svanvilt:<m>   The Anvil Count: a tower rising on its sheet (sv-anvil-rise) and, when it can be soaked, struck (sv-anvil-strike); the cast itself sounds from bossCast
  //   svheart   the wall: a heartbeat loop under the room (ducking the music as the burnback does), then the held breath after the last pillar;  svpillar:<n>   a pillar
  //   erupting (a little higher for each in the cut order);  svseal   the glass seal shattering;  svrebirth   the set piece's beats: the fire drawn into the blade, the dark
  //   (the music gone), the halo opening, the sky splitting, the choir, and the raidwide (its tag is hidden, so it is timed from here)
  //   svechoact:<n> { anim: crane | comet | parting }   Corvane's stance (the cast Crossed Blades has its own sound);  svcrescent:<n>, svlance:<n>, svpyre:<n>   the unleashing's landings, the
  //   Sovereign's blade and Corvane's together (a fan, a dash, a cut each beat: a fifth apart for his, so the two ring in harmony);  svdance:<n>   Caelum's afterimages as glass notes up a scale,
  //   then a struck blade for each cut and a deeper second blade on the beats where Caelum cuts alongside;  svwheel:<n>   the Sunwheel of Embers: the throw, a hum while it rolls, a clang at
  //   each bounce, fire roaring up along each leg, and svwallout:<n> (a catch: the catch, then the walls snuffed); an uncaught wheel's fire burns itself out
  //   svseed:<n>   Seeds of Ash laid: each seed beats on its carrier (a throb that quickens and rises toward the burst, full for your own, faint for the rest);  svhole:<n>   a seed has
  //   burst: the floor burns through (sv-seed-burst), and a moment later the town's sound faintly up through it (a far bell, wind);  svsapling:<n>   a sapling climbs out and walks toward the
  //   Sovereign, creaking as it goes (placed along its walk), until svsapdie:<n> (felled) or svsaparr:<n> (it arrived);  svrecall:<n>   its arrival relights a sigil: a flame catching on the halo,
  //   then that boss's own call sting again, softer (the echo's sting, if a new one rises, is brought down to match);  svecho of the Hollow King with dur -1   rising uncalled from the portal
  //   ring (the climb, no call sting);  the 'sveveryname' set piece   the crater peeling, the camera pulling back, a low swell (music ducked as in the burnback)
  //   svlie   the kill: a soft bell as each echo lies down (sv-lie-bell, falling a step each), the music sinking a step with each, and the Hollow King's lantern set down on the stones (sv-lantern-down);
  //   svgutter   the fire draining (sv-gutter, a long exhale);  svact 'night'   the room cools and mus-ult-end begins (see the music block below);  svemberfall   the town igniting from below
  //   (sv-emberfall-below sits under the cast's own sky of embers, bm-sovereign-emberfall: no second roar);  svwipe   the halo relighting in full, one bright cruel chord (sv-wipe-chord)
  const SV_WHO = new Set(['grubnak', 'skitterra', 'volkar', 'hollowking', 'wyrm', 'titan', 'archmage', 'hydra', 'corvane', 'brannoc', 'morrowoak', 'caelum']);
  const SV_SET = { svdescent: ['sv-descent', 0.9], svburnback: ['sv-burnback', 0.95], sveveryname: ['sv-everyname', 0.9] };   // (the kill's set piece has no sound of its own: svlie, svgutter and the night play it, below)
  // ---- the Ultimate's music (docs/plans/2026-10-ultimate-raid.md "Music"; what each track is: docs/art/music-now.md). Six tracks carry one theme through the fight, each handed over
  // at a moment the room's events already name, never mid-phrase. The tracks are generated later, so every slot is a fallback chain (audio.js music.set takes one: the first track
  // in the manifest plays, none is silence, nothing errors) and the fight plays today on the older tracks; a file that appears is used from the next load.
  //   slot     track             BPM  fallbacks                                   when
  //   Act I    mus-ult-1         84   mus-hollowking                              the pull (bossTrack, below), or the act the room is in
  //   Act II   mus-ult-2         96   mus-hydra                                   the burnback (svact 2): Act I ends on its next bar line, the set piece's silence, and Act II comes in on the
  //                                                                               fourth struck bell (7.4 s into the set piece)
  //   the wall mus-ult-heart     60   mus-pull                                    svheart, on the Act II track's next bar line; the seal's shatter (svseal) ends it and Rebirth's dark is silent
  //   Act III  mus-ult-3         88   mus-caelum, mus-archmage-hard               Rebirth's halo opening (the choir hit), full weight, no intro
  //   Act IV   mus-ult-4         92   mus-caelum-hard, mus-caelum, mus-wyrm-hard  Every Name (svact 4): Act III ends on its next bar line and the town's dulcimer enters at 6.5 s, after the second line's bell
  //   the kill mus-ult-end       -    mus-victory, mus-town (the town tune)       the room turning to night (svact 'night'), once; main.js skips the generic victory music for the Sovereign
  // (the last fallback of Acts III and IV, and mus-town for the kill, are stand-ins so the last fight is never silent: mus-caelum and mus-victory do not exist yet either.)
  const SV_MUS = {
    1: { ids: ['mus-ult-1', 'mus-hollowking'] }, 2: { ids: ['mus-ult-2', 'mus-hydra'] }, heart: { ids: ['mus-ult-heart', 'mus-pull'] },
    3: { ids: ['mus-ult-3', 'mus-caelum', 'mus-archmage-hard'] }, 4: { ids: ['mus-ult-4', 'mus-caelum-hard', 'mus-caelum', 'mus-wyrm-hard'] },
    end: { ids: ['mus-ult-end', 'mus-victory', 'mus-town'], loop: false },
  };
  const SV_BPM = { 'mus-ult-1': 84, 'mus-ult-2': 96, 'mus-ult-heart': 60, 'mus-ult-3': 88, 'mus-ult-4': 92 };   // (a bar line is known only for the real tracks; a fallback is changed at once)
  let svAct = 1;          // the act the room last named (1 to 4)
  let svMusOn = false;    // the fight's music is the Ultimate's (set by bossTrack at the pull, ended by a wipe)
  let svSlot = 0;         // the slot playing or promised: 1 to 4, 'heart', 'seal' (the silence after the wall) or 'end'
  const svMusT = [], svFxT = [];   // the timers of a pending music change, and of the kill's beats
  const svClear = list => { while (list.length) clearTimeout(list.pop()); };
  const svAfter = (list, sec, fn) => { list.push(setTimeout(() => safe(fn), Math.max(0, sec) * 1000)); };
  const svBpm = () => (has() && Sound.music ? SV_BPM[Sound.music.current()] || 0 : 0);
  function svPlayMusic(slot, o) {
    const d = SV_MUS[slot];
    if (!d || !has()) return;
    svSlot = slot;
    safe(() => Sound.music.set(d.ids, { fade: o && o.fade != null ? o.fade : 0.8, loop: d.loop !== false, bar: o && o.bar }));
  }
  function svSilence(fade, bar) { if (has()) safe(() => Sound.music.set(null, { fade, bar })); }
  function svMusicReset() { svClear(svMusT); svClear(svFxT); svMusOn = false; svSlot = 0; svAct = 1; }
  function svActMusic(act) {
    if (act === 'night') {   // the room cools into the real square: the town's tune on one whistle
      svClear(svMusT); svAct = 1;
      if (svMusOn) svPlayMusic('end', { fade: 1.5 });
      return;
    }
    const a = +act;
    if (!(a >= 1 && a <= 4)) return;
    svAct = a;
    if (!svMusOn || svSlot === a) return;
    const was = svSlot;
    svClear(svMusT);
    if (was === 1 && a === 2) {   // the burnback: Act I ends on a bar, four bells, and Act II comes in on the fourth (7.4 s)
      svSlot = 2; svSilence(1.2, svBpm());
      svAfter(svMusT, 7.4, () => { if (svMusOn && svSlot === 2) svPlayMusic(2, { fade: 0.4 }); });
    } else if (was === 3 && a === 4) {   // Every Name: Act III ends on a bar, the peel and the second line's bell, then the town's dulcimer
      svSlot = 4; svSilence(1.6, svBpm());
      svAfter(svMusT, 6.5, () => { if (svMusOn && svSlot === 4) svPlayMusic(4, { fade: 0.8 }); });
    } else svPlayMusic(a, { fade: 0.6, bar: svBpm() });
  }
  const svEchoes = new Map();   // n -> { x, y, t } while the echo stands (the crumble's place, and its timer)
  const svLater = (sec, fn) => { if (!(sec > 0)) safe(fn); else setTimeout(() => safe(fn), sec * 1000); };
  const svSpot = e => (e && e.x != null ? { x: e.x, y: e.y } : null);
  let svSunk = 0;   // how many sheets of the forge floor stand sunk (a new one is heard)
  const svTwinT = new Map();   // n -> the timer of Twin Brands' burst (dropped when a shifted cast changes the wall)
  let svHeart = null;          // the wall's heartbeat: { loop, timers }
  const svWheels = new Map();  // n -> { c: [x, y], out: timer of the fire's natural end } for the Sunwheel in flight
  const SV_SCALE = [0, 2, 4, 7, 9, 12, 14, 16];   // the afterimages climb a pentatonic scale
  const svSaps = new Map();    // n -> { go, end, timer } for a sapling on its walk (its creaks are placed along the way)
  let svRecall = null;         // { who, t, said }: a relight just heard (the sting of a new echo for that name plays softer)
  const svPt = (x, y) => (x == null ? null : { x, y });
  function svHeartStop(fade) {
    if (!svHeart) return;
    const h = svHeart; svHeart = null;
    h.timers.forEach(clearTimeout);
    if (h.loop) h.loop.stop(fade == null ? 0.3 : fade);
  }
  // Two messages are not room events: the host's 'tg' (the tags svSurge and svReplay have a landing a cast cannot say) and 'svdrift' (Ember and Ash's pull). main.js owns
  // those handlers (Net keeps one per type), so they are wrapped once, the first time the Ultimate's room speaks, and the original is always called first.
  let svWired = false, svHum = null, svHumT = 0;
  function svWire() {
    if (svWired || typeof Net === 'undefined' || !Net.handlers) return;
    svWired = true;
    const wrap = (type, fn) => { const old = Net.handlers[type]; Net.handlers[type] = msg => { try { if (old) old(msg); } finally { safe(() => fn(msg)); } }; };
    wrap('tg', msg => {
      if (!has() || !msg || typeof msg.tag !== 'string') return;
      const d = +msg.dur || 0;
      if (msg.tag === 'svSurge') svLater(d - 0.85, () => play('bm-sovereign-surge', { vol: 0.9, key: 'svsurge', minGap: 1 }));       // (the recipe's strike is 0.85 s in)
      else if (msg.tag === 'svReplay') svLater(d - 0.85, () => play('bm-sovereign-knights-sweep', { vol: 0.9, key: 'svreplay', minGap: 1 }));
    });
    wrap('svdrift', msg => {
      if (!has() || !msg || !Array.isArray(msg.v) || !msg.v.length) return;
      if (!svHum) svHum = Sound.loop('sv-drift-loop', { vol: 0.5, fade: 0.8 });
      clearTimeout(svHumT);
      svHumT = setTimeout(() => { if (svHum) { svHum.stop(1.0); svHum = null; } }, 900);   // (the host sends it every 0.2 s while a charge exists)
    });
  }
  function svSapStop(n) { const r = svSaps.get(n); if (r) { clearInterval(r.timer); svSaps.delete(n); } }
  function svSapAll() { for (const n of [...svSaps.keys()]) svSapStop(n); }
  function sovereignRoom(msg) {
    if (!has() || !msg || typeof msg.k !== 'string') return;
    safe(() => {
      svWire();
      const k = msg.k;
      let m = /^svecho:(\d+)$/.exec(k);
      if (m) {
        const n = +m[1];
        if (msg.who) {
          if (!SV_WHO.has(msg.who)) return;
          const at = svSpot(msg), rec = { x: msg.x, y: msg.y, t: null };
          if (msg.who === 'hollowking' && msg.dur === -1) {   // (the Hollow King rising uncalled at Every Name: no call, no flame; the stones and his lantern instead)
            play('sv-hk-climb', { vol: 0.9, at, key: 'svhkclimb', minGap: 1 });
            svEchoes.set(n, rec);
            return;
          }
          const again = svRecall && svRecall.who === msg.who && Date.now() - svRecall.t < 1500;   // (the sting of a name called again is the softer one)
          if (again) svRecall.said = true;
          play('sv-call-' + msg.who, { vol: again ? 0.42 : 0.9, at, key: 'svcall:' + n, minGap: 0.3 });
          svLater(+msg.fly || 0, () => play('sv-assemble', { vol: 0.75, at, key: 'svasm:' + n, minGap: 0.3 }));
          if (msg.dur > 0) rec.t = setTimeout(() => { if (svEchoes.get(n) === rec) { svEchoes.delete(n); safe(() => play('sv-crumble', { vol: 0.8, at, key: 'svcr:' + n, minGap: 0.3 })); } }, Math.max(0, msg.dur - 2.6) * 1000);
          const old = svEchoes.get(n); if (old && old.t) clearTimeout(old.t);
          svEchoes.set(n, rec);
        } else {
          const rec = svEchoes.get(n);
          if (rec) { if (rec.t) clearTimeout(rec.t); svEchoes.delete(n); play('sv-crumble', { vol: 0.8, at: svSpot(rec), key: 'svcr:' + n, minGap: 0.3 }); }
        }
        return;
      }
      if (/^svsignal:/.test(k)) {   // the First Signal: the pass's first sigil flares as its echo stands
        svLater(+msg.at || 0, () => play('sv-signal', { vol: 0.8, at: svSpot(msg), key: 'svsignal', minGap: 1 }));
        return;
      }
      m = /^svechoact:(\d+)$/.exec(k);
      if (m) {
        if (msg.anim === 'bell' || msg.anim === 'knell') play('bm-sovereign-hollow-kings-bell', { vol: 0.9, key: 'svbell', minGap: 0.5 });
        else if (msg.anim === 'crane' || msg.anim === 'comet' || msg.anim === 'parting') play('sv-stance-' + msg.anim, { vol: 0.9, at: svSpot(svEchoes.get(+m[1])), key: 'svstance', minGap: 1 });   // (Corvane's stance)
        return;
      }
      if (/^svproc:/.test(k) && Array.isArray(msg.at)) {   // Halo Procession: each hero's ring closing and bursting (the recipe's pop is 1.0 s in; the cast's own sound carries the arcs lighting)
        msg.at.forEach((s, i) => svLater(s - 1.0, () => play('sv-proc-burst', { vol: 0.8, key: 'svproc:' + i, minGap: 0.5 })));
        return;
      }
      m = /^svcrescent:/.exec(k);
      if (m) {   // two fans, each from the Sovereign and, a quarter round, from Corvane: the sweep builds for 0.9 s and the blades ring together as it lands
        const at = Array.isArray(msg.at) ? msg.at : [], p = svPt(msg.x, msg.y);
        at.forEach((s, i) => {
          svLater(s - 0.9, () => play('sv-crescent-fan', { vol: 0.9, at: p, rate: 1 + i * 0.08, key: 'svfan:' + i, minGap: 0.3 }));
          svLater(s - 0.05, () => play('sv-cross-ring', { vol: 0.75, key: 'svxring:' + i, minGap: 0.3 }));
        });
        return;
      }
      if (/^svlance:/.test(k) && Array.isArray(msg.l)) {   // the Sovereign's dash, then Corvane's a fifth above: two blades, one chord
        msg.l.forEach((q, i) => svLater((+q[4] || 0) - 0.4, () => play('sv-lance-dash', { vol: i ? 0.8 : 0.9, at: svPt(q[0], q[1]), rate: i ? 1.498 : 1, key: 'svdash:' + i, minGap: 0.3 })));
        return;
      }
      if (/^svpyre:/.test(k)) {   // each beat: a cut from each end of the order, a step higher every beat, Corvane's a fifth over the Sovereign's
        const cut = (list, who, fifth) => (Array.isArray(list) ? list : []).forEach((q, i) => svLater((+q[4] || 0) - 0.18, () => play('sv-pyre-cut', { vol: 0.8, at: svPt(q[2], q[3]), rate: Math.pow(1.0595, Math.min(i, 9)) * (fifth ? 1.498 : 1), key: 'svpyre:' + who + i, minGap: 0.1 })));
        cut(msg.s, 's', false); cut(msg.c, 'c', true);
        return;
      }
      if (/^svfore:/.test(k) && Array.isArray(msg.g)) {   // Foretold: each ghost forms as a glass note a step up the scale, then the three fans land together
        msg.g.forEach((q, i) => svLater(0.25 + i * 0.22, () => play('sv-fore-ghost', { vol: 0.7, at: svPt(q[1], q[2]), rate: Math.pow(2, SV_SCALE[Math.min(i, SV_SCALE.length - 1)] / 12), key: 'svforeg:' + i, minGap: 0.1 })));
        svLater((+msg.fan || 6.8) - 0.22, () => play('sv-fore-blades', { vol: 0.85, at: svPt(msg.ox, msg.oy), key: 'svforeb', minGap: 1 }));
        return;
      }
      if (/^svdance:/.test(k) && Array.isArray(msg.l)) {
        const lead = +msg.lead || 3.4, step = +msg.step || 0.65;
        msg.l.forEach((q, i) => {   // the afterimages appear one after another as glass notes climbing a scale (the cuts then run the same order)
          svLater(0.25 + i * 0.28, () => play('sv-dance-image', { vol: 0.75, at: svPt(q[0], q[1]), rate: Math.pow(2, SV_SCALE[Math.min(i, SV_SCALE.length - 1)] / 12), key: 'svimg:' + i, minGap: 0.1 }));
          svLater(lead + (i + 1) * step - 0.22, () => play('sv-dance-cut', { vol: 0.85, at: svPt(q[0], q[1]), rate: 1 + i * 0.03, key: 'svdcut:' + i, minGap: 0.1 }));
        });
        (Array.isArray(msg.c) ? msg.c : []).forEach(q => svLater(lead + (+q[4] || 1) * step - 0.22, () => play('sv-dance-cut2', { vol: 0.85, at: svPt((q[0] + q[2]) / 2, (q[1] + q[3]) / 2), key: 'svdcut2:' + q[4], minGap: 0.1 })));   // (Caelum, alongside, on the last beats)
        return;
      }
      if (/^svwheel:/.test(k) && Array.isArray(msg.l) && msg.l.length > 1) {
        const n = k.slice(8), pts = msg.l, sp = +msg.sp || 950, at = +msg.at || 4.6, last = pts.length - 1, along = [0];
        for (let i = 1; i <= last; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const tEnd = along[last] / sp, old = svWheels.get(n); if (old && old.out) clearTimeout(old.out);
        const rec = { c: Array.isArray(msg.c) && msg.c[0] ? msg.c[0] : pts[last], out: null };
        svWheels.set(n, rec);
        svLater(at - 0.2, () => play('sv-wheel-throw', { vol: 0.9, at: svPt(pts[0][0], pts[0][1]), key: 'svwthrow', minGap: 1 }));   // (the recipe lets go 0.2 s in)
        svLater(at, () => { const h = Sound.loop('sv-wheel-loop', { vol: 0.7, fade: 0.15 }); setTimeout(() => safe(() => h && h.stop(0.25)), Math.max(0.3, tEnd) * 1000); });
        for (let i = 1; i < last; i++) svLater(at + along[i] / sp, () => play('sv-wheel-clang', { vol: 0.9, at: svPt(pts[i][0], pts[i][1]), key: 'svwclang:' + i, minGap: 0.1 }));   // (a bounce)
        const fire = Array.isArray(msg.fire) ? msg.fire : [];
        fire.forEach((q, i) => svLater((+q[4] || 0) - 0.5, () => play('sv-wall-fire', { vol: 0.8, at: svPt((q[0] + q[2]) / 2, (q[1] + q[3]) / 2), key: 'svwfire:' + i, minGap: 0.1 })));   // (the fire takes 0.5 s in)
        const burnOut = fire.reduce((a, q) => Math.max(a, +q[4] || 0), 0) + (+msg.life || 7);
        rec.out = setTimeout(() => { rec.out = null; svWheels.delete(n); safe(() => play('sv-wall-out', { vol: 0.45, key: 'svwout', minGap: 1 })); }, burnOut * 1000);   // (an uncaught wheel: the walls only burn down, quietly)
        return;
      }
      if (/^svwallout:/.test(k)) {   // a catch: the wheel stopped dead, and every wall put out at once
        const n = k.slice(10), rec = svWheels.get(n);
        if (rec && rec.out) clearTimeout(rec.out);
        svWheels.delete(n);
        play('sv-wheel-catch', { vol: 0.95, at: rec ? svPt(rec.c[0], rec.c[1]) : null, key: 'svwcatch', minGap: 1 });
        svLater(0.15, () => play('sv-wall-out', { vol: 0.9, key: 'svwout', minGap: 0.5 }));
        return;
      }
      if (/^svflambe:/.test(k) && Array.isArray(msg.at) && msg.at.length) {
        const at = msg.at, last = at.length - 1, pos = Array.isArray(msg.plates) ? msg.plates : [];
        at.forEach((s, i) => {
          const p = pos[i] ? { x: pos[i][0], y: pos[i][1] } : null;
          svLater(s, () => play('bm-sovereign-cloche', { vol: 0.8, at: p, key: 'svcloche:' + i, minGap: 0.2 }));
          if (i < last) svLater(s + 0.75, () => play('bm-sovereign-flambe', { vol: 0.85, at: p, key: 'svflambe:' + i, minGap: 0.2 }));   // (the whoosh builds and lands 1.7 s after the plate)
        });
        svLater(at[last] + 1.65, () => play('bm-sovereign-mince', { vol: 0.95, key: 'svmince', minGap: 0.5 }));   // (the chops land 2.6 s after the last plate)
        return;
      }
      if (k === 'svact') { svSunk = 0; svHeartStop(0.3); svSapAll(); svActMusic(msg.act); return; }
      if (k === 'svlie') {   // the kill: each echo lies down to a soft bell falling down the minor scale, the music losing a layer with each; the Hollow King last, setting his lantern down
        svClear(svFxT);
        const ord = Array.isArray(msg.order) && msg.order.length ? msg.order : [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 3], n = ord.length, last = n - 1;
        const start = +msg.start || 1.8, step = +msg.step || 0.62, hk = +msg.hk || 1.3, night = +msg.night || 10.4, pos = Array.isArray(msg.pos) ? msg.pos : [];
        const SEMI = [12, 10, 8, 7, 5, 3, 2, 0, -2, -3, -5, -7];   // (D, C, B flat, A, G, F, E, D, C, B flat, G: down to the lantern)
        for (let i = 0; i < n; i++) {
          const t = i < last ? start + i * step : start + (last - 1) * step + hk, p = pos[i] ? { x: pos[i][0], y: pos[i][1] } : null;
          svAfter(svFxT, t, () => {
            const amt = i < last ? Math.min(0.9, 0.1 + 0.075 * (i + 1)) : 0.94;
            if (svMusOn) Sound.music.duck(amt, Math.max(0.5, night - t));   // (each echo takes a layer: the music sinks a step lower, to the silence before the night)
            if (i < last) play('sv-lie-bell', { vol: 0.8, at: p, rate: Math.pow(2, SEMI[Math.min(i, SEMI.length - 1)] / 12), key: 'svlie:' + i, minGap: 0.1 });
            else { play('sv-lantern-down', { vol: 0.9, at: p, key: 'svlantern-down', minGap: 1 }); play('sv-lie-bell', { vol: 0.7, at: p, rate: 0.5, key: 'svlie:hk', minGap: 0.1 }); }
          });
        }
        return;
      }
      if (k === 'svgutter') { play('sv-gutter', { vol: 0.85, key: 'svgutter', minGap: 1 }); return; }   // (the fire draining out of the square: a long exhale)
      if (k === 'svemberfall') {   // the enrage's set piece: the town igniting from below (the cast's own sound carries the sky of embers above it)
        play('sv-emberfall-below', { vol: 0.85, key: 'svemberfall', minGap: 1 });
        if (has()) Sound.music.duck(0.45, +msg.dur || 8);
        return;
      }
      if (k === 'svwipe') {   // a wipe: the halo relights in full and the fire flares; the generic wipe sting is skipped (main.js) and the wipe card comes 2.8 s on
        svMusicReset(); svHeartStop(0.2);
        play('sv-wipe-chord', { vol: msg.enrage ? 1 : 0.9, key: 'svwipe', minGap: 1 });
        return;
      }
      m = /^svtwin:(\d+)$/.exec(k);
      if (m) {
        const n = +m[1], el = String(msg.el || ''), p = msg.x != null ? { x: msg.x, y: msg.y } : null, burst = +msg.at || 0, meet = msg.rule === 'pair';
        if (svTwinT.has(n)) { clearTimeout(svTwinT.get(n)); svTwinT.delete(n); }   // (a shifted cast: the first wall's burst never comes)
        if (msg.shift) play('sv-twin-shift', { vol: 0.8, at: p, key: 'svtwinshift', minGap: 0.5 });
        if (/^(fire|frost|bolt|void)$/.test(el)) svLater(msg.shift ? 0.4 : 0, () => play('sv-twin-' + el, { vol: 0.9, at: p, key: 'svtwin:' + el, minGap: 0.5 }));
        const lead = meet ? 0.55 : 0.6;   // (the recipes land 0.55 and 0.6 s in)
        svTwinT.set(n, setTimeout(() => { svTwinT.delete(n); safe(() => play(meet ? 'sv-twin-meet' : 'sv-twin-bloom', { vol: 0.95, at: p, key: 'svtwinburst', minGap: 1 })); }, Math.max(0, burst - lead) * 1000));
        return;
      }
      if (k === 'svheart') {
        svHeartStop(0.2);
        const ps = Array.isArray(msg.pillars) ? msg.pillars : [], sweep = +msg.sweep || 0, end = +msg.end || +msg.dur || 0;
        const lastAt = ps.reduce((a, q) => Math.max(a, +q[2] || 0), 0), breath = lastAt + 0.25, hold = Math.max(0.5, sweep - breath);
        const realHeart = Sound.music.has('mus-ult-heart'), h = svHeart = { loop: Sound.loop('sv-heart-loop', { vol: realHeart ? 0.45 : 0.9, fade: 1.2 }), timers: [] };   // (the track's own heartbeat carries it when it exists)
        const later = (sec, fn) => h.timers.push(setTimeout(() => safe(fn), Math.max(0, sec) * 1000));
        if (svMusOn && svSlot !== 'heart') { svClear(svMusT); svPlayMusic('heart', { fade: 0.5, bar: svBpm() }); }   // (the music becomes a heartbeat and a drone, on the next bar line)
        if (!realHeart) Sound.music.duck(0.5, breath);   // (with no heart track the music only drops under the heart, as in the burnback)
        later(breath, () => {   // after the last pillar: the heart stops dead and the room holds its breath until the blade sweeps
          if (h.loop) { h.loop.stop(0.1); h.loop = null; }
          play('sv-heart-breath', { vol: 0.85, key: 'svbreath', minGap: 1 });
          Sound.music.duck(0.93, hold);   // (the held breath: the track stops with it)
        });
        later(end + 0.5, () => svHeartStop(0.3));   // (a wipe leaves nothing running longer than the wall would have)
        return;
      }
      m = /^svpillar:(\d+)$/.exec(k);
      if (m) {   // (a little higher for each in the cut order; the recipe's blow is 0.9 s in)
        const rate = 1 + (Math.max(1, +msg.order || 1) - 1) * 0.12;
        svLater((+msg.at || 2.2) - 0.9, () => play('sv-pillar', { vol: 0.95, at: svSpot(msg), rate, key: 'svpil:' + m[1], minGap: 0.3 }));
        return;
      }
      if (k === 'svseal') { svHeartStop(0.1); if (svMusOn) { svClear(svMusT); svSlot = 'seal'; svSilence(0.4); } play('sv-seal-shatter', { vol: 1, key: 'svseal', minGap: 1 }); return; }
      if (k === 'svrebirth') {
        svHeartStop(0.2);
        const dark = Array.isArray(msg.dark) ? msg.dark : [2.5, 4.0], halo = +msg.halo || 4, crater = +msg.crater || 5, choir = +msg.choir || 6, dur = +msg.dur || 12;
        play('sv-rebirth-draw', { vol: 0.9, key: 'svrbdraw', minGap: 1 });
        Sound.music.duck(0.6, dark[0]);
        svLater(dark[0], () => Sound.music.duck(0.97, Math.max(0.2, halo - dark[0] - 0.15)));   // (the dark: the music is gone until the choir; the duck lifts just before it)
        if (svMusOn) { svClear(svMusT); svAfter(svMusT, halo - 0.1, () => { if (svMusOn) svPlayMusic(3, { fade: 0.15 }); }); }   // (Act III's track opens on the halo, full weight)
        svLater(halo - 0.4, () => play('sv-rebirth-halo', { vol: 0.9, key: 'svrbhalo', minGap: 1 }));   // (the recipe's halo opens 0.4 s in)
        svLater(crater - 0.5, () => play('sv-rebirth-sky', { vol: 0.95, key: 'svrbsky', minGap: 1 }));   // (the recipe's sky splits 0.5 s in)
        svLater(halo, () => play('sv-rebirth-choir', { vol: 0.95, key: 'svsp:svrebirth', minGap: 1 }));   // (the recipe's hit is at 0)
        svLater(dur + 0.05, () => play('sv-rebirth-blast', { vol: 1, key: 'svrbblast', minGap: 1 }));   // (the raidwide is hidden, so no telegraph cue plays for it)
        return;
      }
      if (/^svlantern:/.test(k)) {
        const p = msg.x != null ? { x: msg.x, y: msg.y } : null, fly = +msg.fly || 1.1;
        play('sv-lantern-fly', { vol: 0.7, key: 'svlfly', minGap: 0.5 });
        svLater(fly, () => play('bm-sovereign-lantern', { vol: 0.75, at: p, key: 'svlantern', minGap: 0.5 }));
        return;
      }
      if (/^svanvilt:/.test(k)) {   // The Anvil Count: a tower rises on its sheet, and is struck when it can be soaked (the recipe's blow lands 0.1 s in)
        const p = svSpot(msg), at = +msg.at || 5;
        play('sv-anvil-rise', { vol: 0.7, at: p, key: 'svanvilrise', minGap: 0.5 });
        svLater(Math.max(0, at - 0.1), () => play('sv-anvil-strike', { vol: 0.95, at: p, key: 'svanvilstrike', minGap: 0.5 }));
        return;
      }
      if (k === 'svsheets') {   // (the water of the sunk sheets: it hisses as one more goes under)
        const n = Array.isArray(msg.sunk) ? msg.sunk.length : 0;
        if (n > svSunk) play('sv-water-hiss', { vol: 0.5, key: 'svhiss', minGap: 0.6 });
        svSunk = n;
        return;
      }
      if (/^svglass:/.test(k) && Array.isArray(msg.s) && msg.s.length) {   // (the sheets of one ring break together: one shatter for each, louder the more of them)
        const rings = new Map();
        for (const [cx, cy, at] of msg.s) { const key = Math.round(at * 10), g = rings.get(key) || { at, n: 0, cx, cy }; g.n++; rings.set(key, g); }
        let i = 0;
        for (const g of rings.values()) {
          const j = i++;
          svLater(g.at, () => play('sv-glass-shatter', { vol: 0.55 + Math.min(0.35, g.n * 0.05), at: { x: g.cx, y: g.cy }, rate: 1 + j * 0.025, key: 'svglass:' + j, minGap: 0.2 }));
        }
        return;
      }
      m = /^svhead:(\d+)$/.exec(k);
      if (m) { svLater((+msg.rise || 1.6) - 1.6, () => play('sv-head-rise', { vol: 0.85, at: svSpot(msg), key: 'svhead:' + m[1], minGap: 0.3 })); return; }   // (the recipe's head clears the floor 1.6 s in)
      if (/^svbite:/.test(k)) { svLater(Math.max(0, (+msg.dur || 2.8) - 0.8 - 1.97), () => play('sv-bite', { vol: 0.6, at: svSpot(msg), key: 'svbite', minGap: 0.5 })); return; }   // (the bite lands 1.97 s in)
      m = /^svcut:(\d+)$/.exec(k);
      if (m) { play('sv-cut', { vol: 0.9, at: svSpot(msg), rate: 1 - ((+msg.order || 1) - 1) * 0.1, key: 'svcut:' + m[1], minGap: 0.3 }); return; }
      if (/^svdive:/.test(k)) {
        const d = +msg.at || 5.4, fly = +msg.fly || 1.4, boil = Array.isArray(msg.boil) ? msg.boil : [];
        svLater(1.3, () => play('sv-dive-line', { vol: 0.8, key: 'svdline', minGap: 1 }));   // (the line is laid 1.3 s after the spot)
        svLater(d - fly, () => play('sv-dive-fall', { vol: 1, key: 'svdfall', minGap: 1 }));   // (the recipe lands 1.4 s in)
        if (boil.length) {
          svLater(d + 1.0, () => play('sv-boil', { vol: 0.65, at: { x: boil[0][2], y: boil[0][3] }, key: 'svboil', minGap: 1 }));   // (the steam is laid then, and bursts 3.6 s after)
          boil.forEach(([, , x, y], j) => svLater(d + 4.63 + j * 0.05, () => play('sv-steam-burst', { vol: 0.75, at: { x, y }, key: 'svsteam:' + j, minGap: 0.1 })));
        }
        return;
      }
      if (/^svfuse:/.test(k)) {
        const p = msg.kx != null ? { x: msg.kx, y: msg.ky } : null;
        play('bm-sovereign-knot', { vol: 0.85, at: p, key: 'svknot:' + k, minGap: 0.1 });
        play('bm-sovereign-fuse', { vol: 0.7, at: p, key: 'svfuse:' + k, minGap: 0.1 });
        return;
      }
      if (/^svshadow:/.test(k)) { const s = +msg.at || 0; svLater(s - 1.0, () => play('bm-sovereign-shadow', { vol: 0.9, key: 'svshadow', minGap: 0.5 })); return; }   // (the recipe's strike lands 1 s in)
      m = /^svseed:(\d+)$/.exec(k);
      if (m) {   // each seed beats on its carrier, quicker and higher toward the burst (placed nowhere: the carriers move); loud for yours, faint for the others
        const at = +msg.at || 6, mine = typeof Net !== 'undefined' && Array.isArray(msg.ids) && msg.ids.includes(Net.id);
        let t = 0.5, gap = 1.1;
        while (t < at - 0.2) {
          const rate = 0.9 + 0.45 * Math.min(1, t / at);
          svLater(t, () => play('sv-seed-pulse', { vol: mine ? 0.8 : 0.3, rate, key: 'svseedp:' + (mine ? 'me' : 'o'), minGap: 0.12 }));
          t += gap; gap = Math.max(0.3, gap * 0.82);
        }
        return;
      }
      m = /^svhole:(\d+)$/.exec(k);
      if (m) {   // the floor burns through; then the town, faint, from below
        const p = svPt(msg.x, msg.y);
        play('sv-seed-burst', { vol: 0.95, at: p, key: 'svburst', minGap: 0.3 });
        svLater(0.8, () => play('sv-hole-town', { vol: 0.5, at: p, key: 'svtown', minGap: 0.5 }));
        return;
      }
      m = /^svsapling:(\d+)$/.exec(k);
      if (m) {   // a creak every step or two, placed where the sapling is by now (it waits 1.5 s, then walks straight at the Sovereign)
        const n = +m[1], sp = +msg.speed || 24, x0 = +msg.x || 0, y0 = +msg.y || 0, tx = 0, ty = -60, D = Math.hypot(tx - x0, ty - y0) || 1;
        svSapStop(n);
        const rec = { go: Date.now() + 1500, end: Date.now() + (+msg.dur || 45) * 1000, timer: 0 };
        const where = () => { const s = Math.max(0, Math.min(D - 90, sp * (Date.now() - rec.go) / 1000)); return { x: x0 + (tx - x0) / D * s, y: y0 + (ty - y0) / D * s }; };
        rec.timer = setInterval(() => { if (Date.now() > rec.end) { svSapStop(n); return; } safe(() => play('sv-sapling-creak', { vol: 0.7, at: where(), key: 'svcreak', minGap: 0.45 })); }, 1600);
        svSaps.set(n, rec);
        svLater(0.3, () => play('sv-sapling-creak', { vol: 0.8, at: { x: x0, y: y0 }, rate: 0.8, key: 'svcreak', minGap: 0.45 }));   // (climbing out of the hole)
        return;
      }
      m = /^svsapdie:(\d+)$/.exec(k);
      if (m) { svSapStop(+m[1]); play('sv-sapling-die', { vol: 0.9, at: svPt(msg.x, msg.y), key: 'svsapdie', minGap: 0.2 }); return; }
      m = /^svsaparr:(\d+)$/.exec(k);
      if (m) { svSapStop(+m[1]); play('sv-sapling-arrive', { vol: 0.85, at: svPt(msg.x, msg.y), key: 'svsaparr', minGap: 0.3 }); return; }
      if (/^svrecall:/.test(k)) {   // its flame takes on the halo, and that name's own sting sounds again, softer (a new echo's sting is lowered to match in svecho; a standing echo's is played here)
        const who = String(msg.who || '');
        play('sv-relight', { vol: 0.9, key: 'svrelight', minGap: 0.5 });
        const rc = svRecall = { who, t: Date.now(), said: false };
        if (SV_WHO.has(who)) setTimeout(() => safe(() => { if (!rc.said) play('sv-call-' + who, { vol: 0.42, key: 'svrecallsting', minGap: 0.5 }); }), 600);
        return;
      }
    });
  }
  // a set piece begins (the host's 'setpiece' message: id): the descent, the burnback, Rebirth's choir, the kill's twelve bells
  function sovereignSetPiece(id) {
    const s = SV_SET[id];
    if (!s || !has()) return;
    safe(() => { play(s[0], { vol: s[1], key: 'svsp:' + id, minGap: 1 }); if (id === 'svburnback') Sound.music.duck(0.5, 4); else if (id === 'sveveryname') Sound.music.duck(0.55, 6); });   // (the peel and the pull-back: Act IV's track enters at 6.5 s, unducked)
  }
  // the Brand's burn ticking on you (pdmg kind svBurn): a short sear, very quiet
  function sovereignBurn() { play('bm-sovereign-brand-sear', { vol: 0.6, key: 'svsear', minGap: 1 }); }

  // ---------------------------------------------------------------- music
  const music = (id, o) => { if (has()) safe(() => Sound.music.set(id, o)); };
  // the phase (course) where Normal crossfades into the boss's Hard track, late in the fight
  const LAYER_AT = { grubnak: 3, skitterra: 3, volkar: 3, hollowking: 5, wyrm: 4, titan: 3, archmage: 4, hydra: 4, corvane: 3, brannoc: 3, morrowoak: 3, caelum: 3 };
  // a boss whose second track is its second form's music, not a harder take of the first: both difficulties start on the
  // first track and turn at the form change
  const TURN = new Set(['brannoc', 'morrowoak', 'caelum']);
  function phase(bossId, n) {
    // (on Hard that track plays the whole fight: it is not layered over)
    if (has() && LAYER_AT[bossId] && n >= LAYER_AT[bossId] && !/-hard$/.test(String(Sound.music.current() || ''))) safe(() => Sound.music.layer('mus-' + bossId));
  }
  // the fight's track: 'mus-<boss>-hard' on Hard if that track exists, else 'mus-<boss>'
  function bossTrack(bossId, mode) {
    if (bossId === 'sovereign') { svClear(svMusT); svClear(svFxT); svMusOn = true; svSlot = svAct; return (SV_MUS[svAct] || SV_MUS[1]).ids; }   // (the act the room is in: Act I on a normal pull; the chain, see SV_MUS)
    const hard = 'mus-' + bossId + '-hard';
    return mode === 'hard' && !TURN.has(bossId) && has() && Sound.music.has && Sound.music.has(hard) ? hard : 'mus-' + bossId;
  }

  // ---------------------------------------------------------------- the scene's beds, once a frame
  let amb = null, hum = null, heart = null, wasLow = false, musicScene = null, lastStep = 0;
  const STEP = { grass: 'step-grass', stone: 'step-stone', wood: 'step-wood' }, STEP_O = { vol: 0.2 };   // (made once: nothing new per frame)
  const inRect = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  function ground(x, y) {
    if (typeof TOWN === 'undefined') return 'grass';
    if (TOWN.deck && inRect(x, y, TOWN.deck)) return 'wood';
    if (TOWN.plaza && Math.hypot(x - TOWN.plaza.x, y - TOWN.plaza.y) < TOWN.plaza.r) return 'stone';
    if (TOWN.hall && inRect(x, y, TOWN.hall)) return 'stone';
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
      const PS = typeof TOWN !== 'undefined' ? TOWN.portals : null;   // (the nearest of the four sets the pitch)
      let pd = Infinity; if (town && PS) for (const P of PS) pd = Math.min(pd, Math.hypot(x - P.x, y - P.y));
      const pv = town && PS ? Math.max(0, 1 - pd / 650) : 0, pvol = pv * pv * 0.8;
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
  function stopBeds() { for (const h of [amb, hum, heart]) if (h) h.stop(0.3); amb = hum = heart = null; svHeartStop(0.3); svMusicReset(); castEnd(0.1); }

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

  return { sovereignRoom, sovereignSetPiece, sovereignBurn, play, vo, ability, auto, hollow, thresher, tidecaller, lanternkeeper, kenseier, houndmaster, castStart, castEnd, stacks, telegraph, bossCast, impact, music, phase, bossTrack, tick, stopBeds, ground, TG };
})();

if (typeof module !== 'undefined') module.exports = { SoundHooks };
